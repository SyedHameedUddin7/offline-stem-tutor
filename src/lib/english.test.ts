import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { createLearner, deleteLearner } from "./learners";
import {
  CHOICES,
  MAX_BOX,
  ROUND_LENGTH,
  buildQuestions,
  canReview,
  isSpelledCorrectly,
  isUnlocked,
  loadProgress,
  nextProgress,
  pickWords,
  recordAnswer,
  reviewRound,
  spellingTiles,
  starsFor,
  topicRound,
  unlockedTopics,
  type ProgressMap,
} from "./english";
import { ENGLISH_TOPICS } from "../data/englishWords";
import type { WordProgress } from "../types";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

/** Deterministic stand-in for Math.random. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function progressWith(entries: Array<[string, number]>): ProgressMap {
  return new Map(
    entries.map(([wordId, box]): [string, WordProgress] => [
      wordId,
      { learnerId: "l", mode: "match", wordId, box, seen: 1, correct: box, lastSeenAt: 0 },
    ])
  );
}

const [numbers, colours] = ENGLISH_TOPICS;
const allWords = ENGLISH_TOPICS.flatMap((t) => t.words);
const key = { learnerId: "l", mode: "match" as const, wordId: "w" };

describe("word data", () => {
  it("has unique ids and enough words per topic for four choices", () => {
    const ids = allWords.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const topic of ENGLISH_TOPICS) {
      expect(topic.words.length).toBeGreaterThanOrEqual(CHOICES);
      // Two identical answers would make a question unanswerable.
      expect(new Set(topic.words.map((w) => w.en)).size).toBe(topic.words.length);
    }
  });

  it("spells every word with plain lowercase letters, so tiles can build it", () => {
    for (const w of allWords) expect(w.en, w.id).toMatch(/^[a-z]+( [a-z]+)*$/);
  });
});

describe("picture match", () => {
  it("offers the answer among same-topic choices, with no repeats", () => {
    for (const q of topicRound(colours, "match", new Map(), seeded(7))) {
      if (q.mode !== "match") throw new Error("expected a match question");
      expect(q.choices).toHaveLength(CHOICES);
      expect(q.choices).toContainEqual(q.word);
      expect(new Set(q.choices.map((c) => c.id)).size).toBe(CHOICES);
      expect(q.choices.every((c) => colours.words.includes(c))).toBe(true);
    }
  });

  it("asks about the least-known words first", () => {
    const known = numbers.words.slice(0, 4).map((w): [string, number] => [w.id, 3]);
    const picked = pickWords(numbers.words, progressWith(known), seeded(3)).slice(0, 4);
    expect(picked.map((w) => w.id).sort()).toEqual(numbers.words.slice(4).map((w) => w.id).sort());
  });

  it("caps a round at the round length", () => {
    expect(buildQuestions(pickWords(allWords, new Map(), seeded()), "match", seeded())).toHaveLength(
      ROUND_LENGTH
    );
  });
});

describe("word builder", () => {
  it("gives exactly the word's letters, scrambled, for every word", () => {
    const rand = seeded(11);
    for (const w of allWords) {
      const tiles = spellingTiles(w, rand);
      const letters = w.en.replace(/ /g, "");
      expect(tiles.map((t) => t.letter).sort()).toEqual([...letters].sort());
      expect(new Set(tiles.map((t) => t.id)).size).toBe(tiles.length);
      // Every word in the list has two different letters, so none may come
      // out already spelled.
      expect(tiles.map((t) => t.letter).join(""), w.id).not.toBe(letters);
    }
  });

  it("accepts the spelling with or without the space in two-word answers", () => {
    const bulb = allWords.find((w) => w.en === "light bulb")!;
    expect(isSpelledCorrectly(bulb, [..."lightbulb"])).toBe(true);
    expect(isSpelledCorrectly(bulb, [..."lightblub"])).toBe(false);
  });

  it("builds spell questions for a round", () => {
    const qs = topicRound(numbers, "spell", new Map(), seeded());
    expect(qs.every((q) => q.mode === "spell")).toBe(true);
  });
});

describe("Leitner progress", () => {
  it("moves up on a correct answer, resets on a miss, and caps at the top box", () => {
    let p = nextProgress(undefined, key, true, 1);
    expect(p).toMatchObject({ box: 1, seen: 1, correct: 1 });
    for (let i = 0; i < 10; i++) p = nextProgress(p, key, true, 2);
    expect(p.box).toBe(MAX_BOX);
    p = nextProgress(p, key, false, 3);
    expect(p).toMatchObject({ box: 0, seen: 12, correct: 11 });
  });
});

describe("unlocks and stars", () => {
  it("opens the first topic only, then the next once half is learned", () => {
    expect(isUnlocked(0, new Map())).toBe(true);
    expect(isUnlocked(1, new Map())).toBe(false);
    const half = numbers.words.slice(0, numbers.words.length / 2).map((w): [string, number] => [w.id, 1]);
    expect(isUnlocked(1, progressWith(half))).toBe(true);
    expect(isUnlocked(2, progressWith(half))).toBe(false);
  });

  it("awards stars for mastered words only", () => {
    expect(starsFor(numbers, progressWith(numbers.words.map((w) => [w.id, 2])))).toBe(0);
    expect(starsFor(numbers, progressWith(numbers.words.map((w) => [w.id, 3])))).toBe(3);
  });

  it("only reviews words the learner has already met", () => {
    const open = unlockedTopics(new Map());
    expect(canReview(open, new Map())).toBe(false);
    const met = progressWith(numbers.words.slice(0, 5).map((w) => [w.id, 0]));
    expect(canReview(open, met)).toBe(true);
    for (const q of reviewRound(open, "spell", met, seeded())) expect(met.has(q.word.id)).toBe(true);
  });
});

describe("storage", () => {
  it("keeps progress per learner and per mode, and removes it with the learner", async () => {
    const a = await createLearner("Awa");
    const b = await createLearner("Bakary");
    const word = numbers.words[0].id;

    await recordAnswer(a.id, "match", word, true);
    await recordAnswer(a.id, "match", word, true);
    await recordAnswer(a.id, "spell", word, false);
    await recordAnswer(b.id, "match", word, false);

    const awa = await loadProgress(a.id);
    // Recognising a word is not evidence of spelling it.
    expect(awa.match.get(word)?.box).toBe(2);
    expect(awa.spell.get(word)?.box).toBe(0);
    expect((await loadProgress(b.id)).match.get(word)?.box).toBe(0);

    await deleteLearner(a.id);
    const gone = await loadProgress(a.id);
    expect(gone.match.size + gone.spell.size).toBe(0);
    expect((await loadProgress(b.id)).match.size).toBe(1);
  });
});
