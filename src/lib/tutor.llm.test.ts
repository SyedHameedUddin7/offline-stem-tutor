import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The optional model, present and working (mocked: CI has no GPU). It must
 * still answer what the offline rungs cannot, its arithmetic must still be
 * checked, and it must not displace a solver that can answer exactly.
 */
vi.mock("./llm", () => ({
  isLlmReady: () => true,
  generate: vi.fn(async ({ userPrompt }: { userPrompt: string }) =>
    userPrompt.includes("replication") ? "DNA unzips and each strand is copied, so 2 x 3 = 7 copies form." : "A model answer."
  ),
  initLlm: vi.fn(),
  getLlmStatus: () => ({ state: "ready", modelId: "mock" }),
  onLlmStatus: () => () => {},
}));
vi.mock("./embeddings", () => ({
  EMBEDDING_MODEL_ID: "none",
  EMBEDDING_DIM: 384,
  embed: vi.fn(async () => { throw new Error("Failed to fetch"); }),
  embedOne: vi.fn(async () => { throw new Error("Failed to fetch"); }),
  cosineSimilarity: () => 0,
}));

const { db, seedReasoningBank } = await import("./db");
const { askTutor } = await import("./tutor");

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
  await seedReasoningBank();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("with the optional model available", () => {
  it("answers an open question the offline rungs cannot, and checks its arithmetic", async () => {
    const r = await askTutor({ chapterId: "bio-cell", question: "What is DNA replication?" });
    expect(r.tier).toBe("webgpu-llm");
    expect(r.verification).toBe("failed"); // 2 x 3 = 7 is caught
  });

  it("still prefers the exact solver for a calculation", async () => {
    const r = await askTutor({ chapterId: "math-linear-equations", question: "Solve for x: 3x + 7 = 22" });
    expect(r.tier).toBe("solver");
  });
});
