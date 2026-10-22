import { db } from "./db";
import { safeParseAll } from "./safeRead";
import { wordProgressSchema } from "../schemas";
import { ENGLISH_TOPICS } from "../data/englishWords";
import type { EnglishTopic, EnglishWord, WordProgress } from "../types";

/**
 * English picture-match practice.
 *
 * Exists for the day a pod has no signal and the student has already worked
 * through everything downloaded. Every question here is generated on the
 * device from a word list in the bundle, so there is no last lesson: the game
 * keeps recombining what is there, and keeps bringing back the words this
 * particular student gets wrong.
 *
 * Deterministic on purpose. A picture-match answer is either the right word
 * or it is not, so nothing here needs a model, and nothing here can be wrong
 * in the way a model can.
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

export interface Question {
  word: EnglishWord;
  direction: Direction;
  /** Includes `word`, in display order. */
  choices: EnglishWord[];
}

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
 * Turn chosen words into questions.
 *
 * Distractors always come from the target's own topic. That is what keeps a
 * question honest: mixing a colour swatch in among animal pictures would let
 * a student answer by elimination without knowing either word.
 */
export function buildQuestions(chosen: EnglishWord[], rand: Rand = Math.random): Question[] {
  return chosen.map((word) => {
    const siblings = (TOPIC_OF_WORD.get(word.id)?.words ?? []).filter((w) => w.id !== word.id);
    const distractors = shuffle(siblings, rand).slice(0, CHOICES - 1);
    return {
      word,
      direction: rand() < 0.5 ? "picture-to-word" : "word-to-picture",
      choices: shuffle([word, ...distractors], rand),
    };
  });
}

export function topicRound(topic: EnglishTopic, progress: ProgressMap, rand: Rand = Math.random) {
  return buildQuestions(pickWords(topic.words, progress, rand), rand);
}

/**
 * A mixed round across every unlocked topic, drawn from words the student has
 * already met. This is the mode for the student who has "finished": it never
 * runs out, and it is weighted towards whatever they are forgetting.
 */
export function reviewRound(progress: ProgressMap, rand: Rand = Math.random) {
  const pool = unlockedTopics(progress)
    .flatMap((t) => t.words)
    .filter((w) => progress.has(w.id));
  return buildQuestions(pickWords(pool, progress, rand), rand);
}

export function canReview(progress: ProgressMap): boolean {
  return unlockedTopics(progress).flatMap((t) => t.words).filter((w) => progress.has(w.id)).length >= CHOICES;
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
 * words have been answered correctly. Derived from word progress rather than
 * stored, so there is no second record that could disagree with the first.
 */
export function isUnlocked(index: number, progress: ProgressMap): boolean {
  return index === 0 || isLearned(ENGLISH_TOPICS[index - 1], progress);
}

export function unlockedTopics(progress: ProgressMap): EnglishTopic[] {
  return ENGLISH_TOPICS.filter((_, i) => isUnlocked(i, progress));
}

/** The Leitner step, kept pure so it can be tested without a database. */
export function nextProgress(
  prev: WordProgress | undefined,
  learnerId: string,
  wordId: string,
  correct: boolean,
  now: number
): WordProgress {
  const box = prev?.box ?? 0;
  return {
    learnerId,
    wordId,
    box: correct ? Math.min(box + 1, MAX_BOX) : 0,
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    lastSeenAt: now,
  };
}

export async function recordAnswer(learnerId: string, wordId: string, correct: boolean): Promise<void> {
  await db.transaction("rw", db.wordProgress, async () => {
    const prev = await db.wordProgress.get([learnerId, wordId]);
    await db.wordProgress.put(nextProgress(prev, learnerId, wordId, correct, Date.now()));
  });
}

export async function loadProgress(learnerId: string): Promise<ProgressMap> {
  const rows = await db.wordProgress.where("learnerId").equals(learnerId).toArray();
  const valid = safeParseAll(wordProgressSchema, rows, "word progress").valid;
  return new Map(valid.map((p) => [p.wordId, p]));
}
