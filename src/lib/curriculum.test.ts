import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { chapterCoverage, chapterMaterial, searchSubject, strongMatch, teacherMatch } from "./curriculum";
import { importPack, listPacks, removePack } from "./contentPacks";
import type { SubjectId } from "../types";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function strong(subject: SubjectId, q: string) {
  return strongMatch(await searchSubject(subject, q, 5), q);
}

/**
 * The no-model reply policy, pinned. These are the cases the thresholds were
 * calibrated on; a change that flips one of them is a change in what a
 * student is shown with no model and no check behind it.
 */
describe("lesson matching without a model", () => {
  it.each([
    ["biology", "How does a mosquito spread malaria?", "How a mosquito spreads malaria"],
    ["biology", "what is osmosis", "Osmosis"],
    ["biology", "What is the difference between a virus and a bacterium?", "Virus vs bacterium"],
    ["biology", "What is the function of mitochondria?", "Mitochondria"],
    ["biology", "Why is the mitochondrion called the powerhouse of the cell?", "Why the mitochondrion is called the powerhouse"],
    ["physics", "Why does a heavier object not fall faster?", "Heavier does not mean faster"],
    ["physics", "Why does a straw look bent in a glass of water?", "Why a straw looks bent in water"],
    ["mathematics", "what is the quadratic formula", "Quadratic formula"],
  ] as const)("%s: %s → %s", async (subject, q, title) => {
    expect((await strong(subject, q))?.doc.title).toBe(title);
  });

  it.each([
    ["biology", "how do I bake bread"],
    ["biology", "what is DNA replication"],
    ["physics", "how does a rainbow form"],
    ["biology", "What is a virus made of?"],
  ] as const)("does not claim an answer: %s: %s", async (subject, q) => {
    expect(await strong(subject, q)).toBeNull();
  });
});

describe("teacher answers without the embedder", () => {
  it("finds a correction for the same question, and only that question", async () => {
    await db.reasoningItems.put({ id: "teacher-f1", chapterId: "bio-cell", question: "What is the function of the nucleus?", answer: "It controls the cell.", reasoning: "", pattern: "teacher", source: "teacher" });
    expect((await teacherMatch("bio-cell", "what's the function of a nucleus"))?.id).toBe("teacher-f1");
    expect(await teacherMatch("bio-cell", "What is the function of the mitochondria?")).toBeNull();
    // Found from another chapter of the same subject too.
    expect((await teacherMatch("bio-tissues-systems", "What is the function of the nucleus?"))?.id).toBe("teacher-f1");
  });
});

describe("chapter material and coverage", () => {
  it("gives every subject something to do in every chapter, with no model", async () => {
    for (const chapterId of ["math-linear-equations", "phys-motion", "bio-cell", "ma-direction-sense"]) {
      const c = await chapterCoverage(chapterId);
      expect(c.lessons + c.questions + c.flashcards + c.generated, chapterId).toBeGreaterThan(0);
    }
    const ma = await chapterMaterial("ma-direction-sense");
    expect(ma.questions.length).toBeGreaterThanOrEqual(4); // answer-bank exemplars as practice
  });

  it("reports French honestly: bundled curriculum text is English", async () => {
    expect((await chapterCoverage("bio-cell")).french).toBe(0);
  });
});

describe("content packs", () => {
  const pack = {
    formatVersion: 1, id: "pod-extra", title: "Pod extras", curriculum: "syllabus-neutral", version: 1, provenance: "Ms Traoré",
    lessons: [{ id: "pod-extra-l1", chapterId: "bio-cell", kind: "definition", title: "Diffusion in the lungs", body: "Oxygen diffuses from the alveoli into the blood.", lang: "fr" }],
    questions: [{ id: "pod-extra-q1", chapterId: "bio-cell", format: "mcq", prompt: "Q?", choices: ["A", "B"], answer: "A", explanation: "Because.", lang: "en", source: "authored" }],
    flashcards: [],
  };

  it("imports a valid pack and its items appear in the chapter, labelled", async () => {
    const r = await importPack(JSON.stringify(pack));
    expect(r.ok).toBe(true);
    const m = await chapterMaterial("bio-cell");
    expect(m.lessons.find((l) => l.id === "pod-extra-l1")?.source).toBe("Pod extras");
    expect(m.questions.find((q) => q.id === "pod-extra-q1")?.source).toBe("pack");
    expect((await chapterCoverage("bio-cell")).french).toBe(1);
  });

  it.each([
    ["not JSON", "{oops"],
    ["wrong format version", JSON.stringify({ ...pack, formatVersion: 2 })],
    ["unknown chapter", JSON.stringify({ ...pack, lessons: [{ ...pack.lessons[0], chapterId: "chem-atoms" }] })],
    ["shadows a built-in id", JSON.stringify({ ...pack, lessons: [{ ...pack.lessons[0], id: "bio-cell-n01" }] })],
    ["mcq answer not a choice", JSON.stringify({ ...pack, questions: [{ ...pack.questions[0], answer: "C" }] })],
    ["oversized text", JSON.stringify({ ...pack, lessons: [{ ...pack.lessons[0], body: "x".repeat(7000) }] })],
  ])("rejects a pack with %s, and stores nothing", async (_label, text) => {
    const r = await importPack(text);
    expect(r.ok).toBe(false);
    expect(await listPacks()).toEqual([]);
  });

  it("replaces a pack with the same id and removes it cleanly", async () => {
    await importPack(JSON.stringify(pack));
    const again = await importPack(JSON.stringify({ ...pack, version: 2 }));
    expect(again.ok && again.replaced).toBe(true);
    expect((await listPacks()).map((p) => p.version)).toEqual([2]);
    await removePack("pod-extra");
    expect((await chapterMaterial("bio-cell")).lessons.some((l) => l.id === "pod-extra-l1")).toBe(false);
  });
});
