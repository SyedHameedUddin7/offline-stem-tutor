import { db } from "./db";
import { safeParseAll } from "./safeRead";
import { wordProgressSchema } from "../schemas";
import { ENGLISH_TOPICS } from "../data/englishWords";
import type { EnglishMode, EnglishTopic, EnglishWord, WordProgress } from "../types";

/**
 * English practice: picture match and word builder.
 *
 * Exists for the day a pod has no signal and the student has already worked
 * through everything downloaded. Every question here is generated on the
 * device from a word list in the bundle, so there is no last lesson: the game
 * keeps recombining what is there, and keeps bringing back the words this
 * particular student gets wrong.
 *
 * Deterministic on purpose. A picture-match answer or a spelling is either
 * right or it is not, so nothing here needs a model, and nothing here can be
 * wrong in the way a model can.
 */

export const ROUND_LENGTH = 8;
export const CHOICES = 4;
/** Highest Leitner box. Correct answers past it keep the word here. */
export const MAX_BOX = 4;
/** Three correct answers in a row, with no miss in between. */
export const MASTERED_BOX = 3;
/** Share of a topic's words answered right since their last miss. */
const UNLOCK_SHARE = 0.5;

export type Direction = "picture-to-word" | "word-to-picture";

/** One letter tile. `id` is what keeps two identical letters apart. */
export interface Tile {
  id: number;
  letter: string;
}

export type Question =
  | {
      mode: "match";
      word: EnglishWord;
      direction: Direction;
      /** Includes `word`, in display order. */
      choices: EnglishWord[];
    }
  | {
      mode: "spell";
      word: EnglishWord;
      /** The word's letters, spaces removed, scrambled. */
      tiles: Tile[];
    };

type Rand = () => number;

function shuffle<T>(items: T[], rand: Rand): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const TOPIC_OF_WORD = new Map(
  ENGLISH_TOPICS.flatMap((topic) => topic.words.map((w) => [w.id, topic] as const))
);

export type ProgressMap = Map<string, WordProgress>;

export function boxOf(progress: ProgressMap, wordId: string): number {
  return progress.get(wordId)?.box ?? 0;
}

/**
 * Pick which words a round asks about: least-known first, and among equally
 * known words the one seen longest ago. The shuffle before the sort only
 * breaks ties, so a fresh topic does not always open on "one".
 */
export function pickWords(pool: EnglishWord[], progress: ProgressMap, rand: Rand = Math.random) {
  return shuffle(pool, rand)
    .sort((a, b) => {
      const pa = progress.get(a.id);
      const pb = progress.get(b.id);
      return (pa?.box ?? 0) - (pb?.box ?? 0) || (pa?.lastSeenAt ?? 0) - (pb?.lastSeenAt ?? 0);
    })
    .slice(0, ROUND_LENGTH);
}

/**
 * Scramble a word's letters into tiles.
 *
 * Re-shuffled until the order differs from the answer, because a scramble
 * that happens to spell the word gives the question away. Words whose letters
 * are all the same cannot be scrambled, and the attempt cap stops that being
 * a hang.
 */
export function spellingTiles(word: EnglishWord, rand: Rand = Math.random): Tile[] {
  const tiles = [...word.en.replace(/\s+/g, "")].map((letter, id) => ({ id, letter }));
  let out = tiles;
  for (let attempt = 0; attempt < 10; attempt++) {
    out = shuffle(tiles, rand);
    if (out.some((t, i) => t.letter !== tiles[i].letter)) break;
  }
  return out;
}

/** Letters the student placed, compared with spaces and case ignored. */
export function isSpelledCorrectly(word: EnglishWord, letters: string[]): boolean {
  return letters.join("").toLowerCase() === word.en.replace(/\s+/g, "").toLowerCase();
}

/**
 * Turn chosen words into questions.
 *
 * Picture-match distractors always come from the target's own topic. That is
 * what keeps a question honest: mixing a colour swatch in among animal
 * pictures would let a student answer by elimination without knowing either
 * word.
 */
export function buildQuestions(chosen: EnglishWord[], mode: EnglishMode, rand: Rand = Math.random): Question[] {
  return chosen.map((word): Question => {
    if (mode === "spell") return { mode, word, tiles: spellingTiles(word, rand) };
    const siblings = (TOPIC_OF_WORD.get(word.id)?.words ?? []).filter((w) => w.id !== word.id);
    const distractors = shuffle(siblings, rand).slice(0, CHOICES - 1);
    return {
      mode,
      word,
      direction: rand() < 0.5 ? "picture-to-word" : "word-to-picture",
      choices: shuffle([word, ...distractors], rand),
    };
  });
}

export function topicRound(
  topic: EnglishTopic,
  mode: EnglishMode,
  progress: ProgressMap,
  rand: Rand = Math.random
) {
  return buildQuestions(pickWords(topic.words, progress, rand), mode, rand);
}

/** Words from the open topics that the learner has already met in this mode. */
function reviewPool(open: EnglishTopic[], progress: ProgressMap): EnglishWord[] {
  return open.flatMap((t) => t.words).filter((w) => progress.has(w.id));
}

/**
 * A mixed round across every open topic, drawn from words the student has
 * already met. This is the mode for the student who has "finished": it never
 * runs out, and it is weighted towards whatever they are forgetting.
 */
export function reviewRound(
  open: EnglishTopic[],
  mode: EnglishMode,
  progress: ProgressMap,
  rand: Rand = Math.random
) {
  return buildQuestions(pickWords(reviewPool(open, progress), progress, rand), mode, rand);
}

export function canReview(open: EnglishTopic[], progress: ProgressMap): boolean {
  return reviewPool(open, progress).length >= CHOICES;
}

/** 0–3 stars from the share of the topic's words that are mastered. */
export function starsFor(topic: EnglishTopic, progress: ProgressMap): number {
  const mastered = topic.words.filter((w) => boxOf(progress, w.id) >= MASTERED_BOX).length;
  const share = mastered / topic.words.length;
  if (share >= 1) return 3;
  if (share >= 2 / 3) return 2;
  if (share >= 1 / 3) return 1;
  return 0;
}

function isLearned(topic: EnglishTopic, progress: ProgressMap): boolean {
  const learned = topic.words.filter((w) => boxOf(progress, w.id) >= 1).length;
  return learned / topic.words.length >= UNLOCK_SHARE;
}

/**
 * Topics open in order: the next one unlocks once half of the current one's
 * words have been answered correctly in picture match. Both modes follow the
 * same unlocks, because a student should recognise a word before being asked
 * to spell it. Derived from word progress rather than stored, so there is no
 * second record that could disagree with the first.
 */
export function isUnlocked(index: number, matchProgress: ProgressMap): boolean {
  return index === 0 || isLearned(ENGLISH_TOPICS[index - 1], matchProgress);
}

export function unlockedTopics(matchProgress: ProgressMap): EnglishTopic[] {
  return ENGLISH_TOPICS.filter((_, i) => isUnlocked(i, matchProgress));
}

/** The Leitner step, kept pure so it can be tested without a database. */
export function nextProgress(
  prev: WordProgress | undefined,
  key: { learnerId: string; mode: EnglishMode; wordId: string },
  correct: boolean,
  now: number
): WordProgress {
  const box = prev?.box ?? 0;
  return {
    ...key,
    box: correct ? Math.min(box + 1, MAX_BOX) : 0,
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    lastSeenAt: now,
  };
}

export async function recordAnswer(
  learnerId: string,
  mode: EnglishMode,
  wordId: string,
  correct: boolean
): Promise<void> {
  await db.transaction("rw", db.wordProgress, async () => {
    const prev = await db.wordProgress.get([learnerId, mode, wordId]);
    await db.wordProgress.put(nextProgress(prev, { learnerId, mode, wordId }, correct, Date.now()));
  });
}

/** Both modes' progress in one read, since the topic screen needs both. */
export async function loadProgress(learnerId: string): Promise<Record<EnglishMode, ProgressMap>> {
  const rows = await db.wordProgress.where("learnerId").equals(learnerId).toArray();
  const valid = safeParseAll(wordProgressSchema, rows, "word progress").valid;
  const byMode: Record<EnglishMode, ProgressMap> = { match: new Map(), spell: new Map() };
  for (const p of valid) byMode[p.mode].set(p.wordId, p);
  return byMode;
}
