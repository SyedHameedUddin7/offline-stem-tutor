import { beforeAll, describe, expect, it, vi } from "vitest";
import { FAKE_MODEL_ID, dot, fakeEmbed, fakeEmbedOne } from "../test/fakeEmbedder";

vi.mock("../lib/embeddings", () => ({
  EMBEDDING_MODEL_ID: FAKE_MODEL_ID,
  EMBEDDING_DIM: 96,
  embed: vi.fn(async (texts: string[]) => fakeEmbed(texts)),
  embedOne: vi.fn(async (text: string) => fakeEmbedOne(text)),
  cosineSimilarity: dot,
}));

const { db, seedReasoningBank } = await import("../lib/db");
const { indexAnswerBank, retrieve } = await import("../lib/retrieval");
const { runEvaluation, formatReport } = await import("./runner");
const { EVAL_CASES, DATASET_VERSION } = await import("./dataset");

/**
 * The full evaluation, including the retrieval cases that `npm run eval`
 * has to skip because they need the 128MB embedder.
 *
 * The stand-in embedder means the grounding numbers here measure the
 * POLICY — thresholds, the domain gate, the chapter scoping — rather than
 * the real model's semantics. That distinction is stated in the README
 * rather than quietly blurred, because the two are different claims.
 */
describe(`evaluation dataset ${DATASET_VERSION}`, () => {
  beforeAll(async () => {
    await db.delete();
    await db.open();
    localStorage.clear();
    await seedReasoningBank();
    await indexAnswerBank();
  });

  it("has unique ids and internally consistent cases", () => {
    const ids = EVAL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of EVAL_CASES) {
      if (c.behaviour === "solve") expect(c.expected, `${c.id} needs an expected value`).toBeTypeOf("number");
      if (c.behaviour.startsWith("verify")) {
        expect(c.answer, `${c.id} needs an answer`).toBeTruthy();
        expect(c.chapterId, `${c.id} needs a chapter`).toBeTruthy();
      }
      if (c.behaviour === "ground") expect(c.chapterId, `${c.id} needs a chapter`).toBeTruthy();
    }
  });

  it("runs every case with retrieval enabled, and all pass", async () => {
    const metrics = await runEvaluation(async (chapterId, question) => {
      const g = await retrieve(chapterId, question);
      return { grounded: g.status === "grounded" };
    });

    // Printed so the numbers are visible in CI output, not just asserted.
    console.log("\n" + formatReport(metrics));

    expect(metrics.skipped).toBe(0);
    expect(metrics.evaluated).toBe(EVAL_CASES.length);
    expect(metrics.failures, formatReport(metrics)).toEqual([]);
    expect(metrics.overallAccuracy).toBe(1);
  });

  it("reports the metrics the README quotes", async () => {
    const metrics = await runEvaluation(async (chapterId, question) => {
      const g = await retrieve(chapterId, question);
      return { grounded: g.status === "grounded" };
    });
    expect(metrics.solverAgreement).toBe(1);
    expect(metrics.refusalAccuracy).toBe(1);
    expect(metrics.unitCorrectness).toBe(1);
    expect(metrics.contradictionDetection).toBe(1);
  });
});
