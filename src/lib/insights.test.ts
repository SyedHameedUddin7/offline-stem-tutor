import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  getChaptersNeedingAttention,
  getLearnerSummaries,
  getPodSummary,
} from "./insights";
import type { ChatMessage, EngineTier, FlaggedItem, Learner } from "../types";

const NOW = new Date("2026-03-10T14:00:00").getTime();
const YESTERDAY = new Date("2026-03-09T14:00:00").getTime();

beforeEach(async () => {
  await db.delete();
  await db.open();
});

function learner(id: string, name: string): Learner {
  return { id, name, colorIndex: 0, createdAt: 1, lastActiveAt: 1 };
}

let seq = 0;
function question(learnerId: string, chapterId: string, at = NOW): ChatMessage {
  return {
    id: `q${seq++}`,
    learnerId,
    subjectId: "mathematics",
    chapterId,
    role: "student",
    content: "a question",
    timestamp: at,
    flagged: false,
    synced: false,
  };
}

function answer(
  learnerId: string,
  chapterId: string,
  tier: EngineTier,
  flagged = false,
  at = NOW
): ChatMessage {
  return {
    id: `a${seq++}`,
    learnerId,
    subjectId: "mathematics",
    chapterId,
    role: "tutor",
    content: "an answer",
    timestamp: at,
    tier,
    confidence: tier === "solver" ? "high" : "medium",
    flagged,
    synced: false,
  };
}

function flag(learnerId: string, chapterId: string, status: FlaggedItem["teacherStatus"]): FlaggedItem {
  return {
    id: `f${seq++}`,
    messageId: "m",
    learnerId,
    subjectId: "mathematics",
    chapterId,
    question: "q",
    aiAnswer: "a",
    teacherStatus: status,
    timestamp: NOW,
    synced: false,
  };
}

describe("getPodSummary", () => {
  it("reports honest zeros on a fresh device", async () => {
    const summary = await getPodSummary(NOW);
    expect(summary.learnerCount).toBe(0);
    expect(summary.questionsAllTime).toBe(0);
    expect(summary.unverifiedAnswers).toBe(0);
    expect(summary.provenance).toEqual({
      solver: 0,
      "webgpu-llm": 0,
      "answer-bank": 0,
      unavailable: 0,
    });
  });

  it("separates today's questions from the running total", async () => {
    await db.learners.add(learner("l1", "Awa"));
    await db.messages.bulkAdd([
      question("l1", "math-linear-equations", NOW),
      question("l1", "math-linear-equations", NOW),
      question("l1", "math-linear-equations", YESTERDAY),
    ]);

    const summary = await getPodSummary(NOW);
    expect(summary.questionsToday).toBe(2);
    expect(summary.questionsAllTime).toBe(3);
  });

  /** The capability ladder, as a number a facilitator can read. */
  it("counts which rung answered", async () => {
    await db.messages.bulkAdd([
      answer("l1", "ma-number-series", "solver"),
      answer("l1", "ma-number-series", "solver"),
      answer("l1", "ma-number-series", "answer-bank"),
      answer("l1", "math-linear-equations", "webgpu-llm"),
      answer("l1", "math-linear-equations", "unavailable"),
    ]);

    const { provenance } = await getPodSummary(NOW);
    expect(provenance.solver).toBe(2);
    expect(provenance["answer-bank"]).toBe(1);
    expect(provenance["webgpu-llm"]).toBe(1);
    expect(provenance.unavailable).toBe(1);
  });

  /**
   * "Unverified" is the honest substitute for a mastery score: a model answer
   * nobody has checked. Solver answers are verified by construction and
   * answer-bank answers came from a vetted exemplar, so neither counts.
   */
  it("counts only unchecked model answers as unverified", async () => {
    await db.messages.bulkAdd([
      answer("l1", "math-linear-equations", "webgpu-llm"), // counts
      answer("l1", "math-linear-equations", "webgpu-llm", true), // flagged, seen
      answer("l1", "ma-number-series", "solver"), // verified by construction
      answer("l1", "ma-number-series", "answer-bank"), // vetted exemplar
    ]);

    expect((await getPodSummary(NOW)).unverifiedAnswers).toBe(1);
  });

  it("reports the review queue by outcome", async () => {
    await db.flaggedItems.bulkAdd([
      flag("l1", "math-linear-equations", "pending"),
      flag("l1", "math-linear-equations", "pending"),
      flag("l1", "math-linear-equations", "approved"),
      flag("l1", "math-linear-equations", "corrected"),
    ]);

    const summary = await getPodSummary(NOW);
    expect(summary.pendingReview).toBe(2);
    expect(summary.approved).toBe(1);
    expect(summary.corrected).toBe(1);
  });

  it("counts teacher-authored exemplars, not seed ones", async () => {
    await db.reasoningItems.bulkAdd([
      {
        id: "seed-1",
        chapterId: "ma-number-series",
        question: "q",
        answer: "a",
        reasoning: "r",
        pattern: "p",
        source: "seed",
      },
      {
        id: "teacher-1",
        chapterId: "ma-number-series",
        question: "q",
        answer: "a",
        reasoning: "r",
        pattern: "teacher-authored correction",
        source: "teacher",
      },
    ]);

    expect((await getPodSummary(NOW)).teacherExemplars).toBe(1);
  });
});

describe("getLearnerSummaries", () => {
  beforeEach(async () => {
    await db.learners.bulkAdd([learner("l1", "Awa"), learner("l2", "Ibrahim")]);
  });

  it("attributes work to the right learner", async () => {
    await db.messages.bulkAdd([
      question("l1", "math-linear-equations"),
      question("l1", "math-mensuration"),
      question("l2", "math-linear-equations"),
      answer("l1", "math-linear-equations", "webgpu-llm"),
    ]);
    await db.flaggedItems.add(flag("l2", "math-linear-equations", "pending"));

    const summaries = await getLearnerSummaries();
    const awa = summaries.find((s) => s.learner.id === "l1")!;
    const ibrahim = summaries.find((s) => s.learner.id === "l2")!;

    expect(awa.questions).toBe(2);
    expect(awa.chaptersTouched).toBe(2);
    expect(awa.unverified).toBe(1);
    expect(ibrahim.questions).toBe(1);
    expect(ibrahim.pending).toBe(1);
  });

  /** The facilitator's next ten minutes should go to whoever is most stuck. */
  it("ranks the most-stuck learner first", async () => {
    await db.flaggedItems.bulkAdd([
      flag("l2", "math-linear-equations", "pending"),
      flag("l2", "math-linear-equations", "pending"),
    ]);
    await db.messages.add(answer("l1", "math-linear-equations", "webgpu-llm"));

    const [first] = await getLearnerSummaries();
    expect(first.learner.name).toBe("Ibrahim");
  });

  it("lists a learner who has not asked anything yet, with nulls not zeros", async () => {
    const summaries = await getLearnerSummaries();
    expect(summaries).toHaveLength(2);
    expect(summaries[0].lastQuestionAt).toBeNull();
  });

  it("reports the last question time, not the last app open", async () => {
    await db.messages.bulkAdd([
      question("l1", "math-linear-equations", YESTERDAY),
      question("l1", "math-linear-equations", NOW),
    ]);
    const awa = (await getLearnerSummaries()).find((s) => s.learner.id === "l1")!;
    expect(awa.lastQuestionAt).toBe(NOW);
  });
});

describe("getChaptersNeedingAttention", () => {
  it("omits chapters with nothing to act on", async () => {
    await db.messages.bulkAdd([
      question("l1", "math-linear-equations"),
      answer("l1", "math-linear-equations", "solver"),
    ]);
    // Questions answered by the solver need no attention, so the chapter is
    // not listed. Padding the list would bury the chapters that matter.
    expect(await getChaptersNeedingAttention()).toEqual([]);
  });

  it("ranks by pending review, then unverified answers", async () => {
    await db.flaggedItems.bulkAdd([
      flag("l1", "math-mensuration", "pending"),
      flag("l1", "math-mensuration", "pending"),
      flag("l1", "math-linear-equations", "pending"),
    ]);
    await db.messages.bulkAdd([
      answer("l1", "math-data-probability", "webgpu-llm"),
      answer("l1", "math-data-probability", "webgpu-llm"),
      answer("l1", "math-data-probability", "webgpu-llm"),
    ]);

    const rows = await getChaptersNeedingAttention();
    expect(rows.map((r) => r.chapterId)).toEqual([
      "math-mensuration",
      "math-linear-equations",
      "math-data-probability",
    ]);
    expect(rows[2].unverified).toBe(3);
  });

  it("resolves a readable chapter name", async () => {
    await db.flaggedItems.add(flag("l1", "math-linear-equations", "pending"));
    const [row] = await getChaptersNeedingAttention();
    expect(row.chapterName).toBe("Linear Equations");
  });

  it("respects the limit", async () => {
    await db.flaggedItems.bulkAdd([
      flag("l1", "math-linear-equations", "pending"),
      flag("l1", "math-mensuration", "pending"),
      flag("l1", "math-geometry-triangles", "pending"),
    ]);
    expect(await getChaptersNeedingAttention(2)).toHaveLength(2);
  });
});
