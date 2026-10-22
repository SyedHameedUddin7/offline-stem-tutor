import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The tutor on a device with no AI at all: no language model, no search
 * model, no network. The embedder fails the way it does offline before it was
 * ever downloaded. Every subject must still do something useful, and nothing
 * may be invented.
 */
vi.mock("./embeddings", () => ({
  EMBEDDING_MODEL_ID: "none",
  EMBEDDING_DIM: 384,
  embed: vi.fn(async () => {
    throw new Error("Failed to fetch");
  }),
  embedOne: vi.fn(async () => {
    throw new Error("Failed to fetch");
  }),
  cosineSimilarity: () => 0,
}));

const { db, seedReasoningBank } = await import("./db");
const { askTutor } = await import("./tutor");
const { isLlmReady } = await import("./llm");

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
  await seedReasoningBank();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

const ask = (chapterId: string, question: string) => askTutor({ chapterId, question });

describe("no model on the device", () => {
  it("really has no model", () => {
    expect(isLlmReady()).toBe(false);
  });

  it("Maths: solves and explains a supported problem", async () => {
    const r = await ask("math-linear-equations", "Solve for x: 3x + 7 = 22");
    expect(r).toMatchObject({ tier: "solver", confidence: "high", verification: "passed" });
    expect(r.content).toContain("x = 5");
    expect(r.content).toContain("Check:");
  });

  it("Physics: solves a numerical problem with units", async () => {
    const r = await ask("phys-motion", "A car starts from rest and reaches 20 m/s in 10 s. Find its acceleration.");
    expect(r.tier).toBe("solver");
    expect(r.content).toContain("a = 2 m/s²");
  });

  it("Physics: explains what is missing instead of guessing, and does not flag it", async () => {
    const r = await ask("phys-motion", "A car accelerates for 10 s. Find its acceleration.");
    expect(r).toMatchObject({ tier: "unavailable", flag: false });
    expect(r.content).toContain("Solve tab");
  });

  it("Biology: answers from a stored lesson, labelled as such", async () => {
    const r = await ask("bio-health-disease", "How does a mosquito spread malaria?");
    expect(r).toMatchObject({ tier: "curriculum", flag: false });
    expect(r.content).toContain("Plasmodium");
    expect(r.content).toContain("not checked against your exact question");
  });

  it("an unsupported question gets an honest reply, related material, and goes to the teacher", async () => {
    const r = await ask("bio-cell", "What is DNA replication?");
    expect(r).toMatchObject({ tier: "unavailable", confidence: "low" });
    expect(r.flag).toBeUndefined(); // default rule: low confidence is flagged
    expect(r.content).toContain("can't reliably answer");
    expect(r.content).toContain("sent to your teacher");
  });

  it("an unsupported maths question suggests formats the solver reads", async () => {
    const r = await ask("math-algebraic-expressions", "Prove that the square of an odd number is odd.");
    expect(r.tier).toBe("unavailable");
    expect(r.content).toContain("Expand (x + 5)(x - 3)");
  });

  it("a teacher's correction is served without the embedder, in any subject", async () => {
    await db.reasoningItems.put({ id: "teacher-flag-1", chapterId: "bio-cell", question: "Do red blood cells have a nucleus?", answer: "Not in mammals: they lose it as they mature, leaving room for haemoglobin.", reasoning: "", pattern: "teacher", source: "teacher" });
    const r = await ask("bio-cell", "do red blood cells have a nucleus");
    expect(r).toMatchObject({ tier: "answer-bank", citations: ["teacher-flag-1"] });
    expect(r.content).toContain("Verified by a teacher");
  });

  it("Mental Ability: the exact solver still works", async () => {
    const r = await ask("ma-number-series", "2, 4, 6, 8, ?");
    expect(r).toMatchObject({ tier: "solver", confidence: "high" });
    expect(r.content).toContain("10");
  });

  it("Mental Ability: a bundled exemplar asked word for word is served without the search model", async () => {
    const r = await ask("ma-analogies", "Doctor : Hospital :: Teacher : ?");
    expect(r.tier).toBe("answer-bank");
    expect(r.content).toContain("School");
  });

  it("Mental Ability: anything else says search is unavailable and points to practice", async () => {
    const r = await ask("ma-blood-relations", "Pointing to a photo, a woman says something complicated about her uncle.");
    expect(r.tier).toBe("unavailable");
    expect(r.content).toContain("Practice tab");
  });

  it("replies in French when the student reads French", async () => {
    localStorage.setItem("stem-tutor:lang", "fr");
    const r = await ask("math-linear-equations", "Résous : 3x + 7 = 22");
    expect(r.content).toContain("Équation du premier degré");
    const lesson = await ask("bio-health-disease", "How does a mosquito spread malaria?");
    expect(lesson.content).toContain("n'existe qu'en anglais");
  });
});
