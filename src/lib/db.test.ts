import { beforeEach, describe, expect, it } from "vitest";
import { db, seedReasoningBank, seedReferenceNotes } from "./db";
import { REASONING_BANK } from "../data/reasoningBank";
import { REFERENCE_NOTES } from "../data/referenceNotes";

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
});

describe("schema", () => {
  /**
   * Regression. `timestamp` was missing from the flaggedItems index list while
   * the teacher panel ordered by it. Dexie throws a SchemaError on orderBy
   * against an unindexed key path, React had no error boundary at the time,
   * and the entire Teacher Review view rendered as a blank white page.
   */
  it("allows flaggedItems to be ordered by timestamp", async () => {
    await db.flaggedItems.bulkAdd([
      {
        id: "a",
        messageId: "m-a",
        learnerId: "l-1",
        subjectId: "mental-ability",
        chapterId: "ma-number-series",
        question: "older",
        aiAnswer: "x",
        teacherStatus: "pending",
        timestamp: 1000,
        synced: false,
      },
      {
        id: "b",
        messageId: "m-b",
        learnerId: "l-1",
        subjectId: "mental-ability",
        chapterId: "ma-number-series",
        question: "newer",
        aiAnswer: "y",
        teacherStatus: "pending",
        timestamp: 2000,
        synced: false,
      },
    ]);

    const rows = await db.flaggedItems.orderBy("timestamp").reverse().toArray();
    expect(rows.map((r) => r.question)).toEqual(["newer", "older"]);
  });

  it("indexes every key path the app actually queries", async () => {
    // Each of these throws if the key path is not indexed, which is the whole
    // failure mode above — so asserting they resolve is the real check.
    await expect(db.messages.where("chapterId").equals("x").toArray()).resolves.toEqual([]);
    await expect(db.messages.orderBy("timestamp").toArray()).resolves.toEqual([]);
    await expect(db.flaggedItems.where("teacherStatus").equals("pending").toArray()).resolves.toEqual([]);
    await expect(db.reasoningItems.where("source").equals("seed").toArray()).resolves.toEqual([]);
    await expect(db.reasoningItems.where("chapterId").anyOf(["a", "b"]).toArray()).resolves.toEqual([]);
    await expect(db.referenceNotes.where("chapterId").equals("x").toArray()).resolves.toEqual([]);
  });
});

describe("seedReasoningBank", () => {
  it("is idempotent across repeated calls", async () => {
    await seedReasoningBank();
    await seedReasoningBank();
    await seedReasoningBank();
    expect(await db.reasoningItems.count()).toBe(REASONING_BANK.length);
  });

  it("preserves cached embeddings when the version is unchanged", async () => {
    await seedReasoningBank();
    const id = REASONING_BANK[0].id;
    await db.reasoningItems.update(id, { embedding: [0.5], embeddingModel: "m" });

    await seedReasoningBank();

    // Recomputing the whole corpus is genuinely slow on a low-end phone, so
    // the same-version path must stay additive.
    expect((await db.reasoningItems.get(id))!.embedding).toEqual([0.5]);
  });

  it("replaces seed rows when the version changes", async () => {
    await seedReasoningBank();
    const id = REASONING_BANK[0].id;
    await db.reasoningItems.update(id, { question: "stale text from an older build" });

    localStorage.setItem("stem-tutor:bank-version", "-1");
    await seedReasoningBank();

    // Seed ids are positional, so an upstream insertion re-points them. The
    // version bump is what stops a device keeping old text under a reused id.
    expect((await db.reasoningItems.get(id))!.question).toBe(REASONING_BANK[0].question);
  });
});

describe("seedReferenceNotes", () => {
  it("seeds every note and stays idempotent", async () => {
    await seedReferenceNotes();
    await seedReferenceNotes();
    expect(await db.referenceNotes.count()).toBe(REFERENCE_NOTES.length);
  });

  it("covers all 21 generative chapters", async () => {
    await seedReferenceNotes();
    const chapters = new Set((await db.referenceNotes.toArray()).map((n) => n.chapterId));
    expect(chapters.size).toBe(21);
  });

  it("gives every chapter at least one misconception note", async () => {
    await seedReferenceNotes();
    const notes = await db.referenceNotes.toArray();
    const byChapter = new Map<string, Set<string>>();
    for (const n of notes) {
      if (!byChapter.has(n.chapterId)) byChapter.set(n.chapterId, new Set());
      byChapter.get(n.chapterId)!.add(n.kind);
    }
    // The misconception notes are the ones that actually move a small model's
    // accuracy, so a chapter missing one is a content gap worth failing on.
    for (const [chapterId, kinds] of byChapter) {
      expect(kinds.has("misconception"), `${chapterId} has no misconception note`).toBe(true);
    }
  });
});
