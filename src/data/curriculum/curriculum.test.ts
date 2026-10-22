import { describe, expect, it } from "vitest";
import { BUNDLED_FLASHCARDS, BUNDLED_QUESTIONS } from "./index";
import { flashcardSchema, practiceQuestionSchema } from "../../schemas";
import { SUBJECTS } from "../subjects";

const CHAPTERS = new Set(SUBJECTS.flatMap((s) => s.chapters.map((c) => c.id)));

describe("bundled curriculum", () => {
  it("passes the same validation an imported pack must pass", () => {
    for (const q of BUNDLED_QUESTIONS) expect(practiceQuestionSchema.safeParse(q).success, q.id).toBe(true);
    for (const f of BUNDLED_FLASHCARDS) expect(flashcardSchema.safeParse(f).success, f.id).toBe(true);
  });

  it("has unique ids and points only at real chapters", () => {
    const ids = [...BUNDLED_QUESTIONS.map((q) => q.id), ...BUNDLED_FLASHCARDS.map((f) => f.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of [...BUNDLED_QUESTIONS, ...BUNDLED_FLASHCARDS]) expect(CHAPTERS.has(item.chapterId), item.id).toBe(true);
  });

  it("gives every Biology chapter flashcards and at least five questions", () => {
    for (const c of SUBJECTS.find((s) => s.id === "biology")!.chapters) {
      expect(BUNDLED_FLASHCARDS.filter((f) => f.chapterId === c.id).length, c.id).toBeGreaterThanOrEqual(8);
      expect(BUNDLED_QUESTIONS.filter((q) => q.chapterId === c.id).length, c.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("never offers the same choice twice, and the answer is always a choice", () => {
    for (const q of BUNDLED_QUESTIONS.filter((x) => x.format === "mcq")) {
      expect(new Set(q.choices).size, q.id).toBe(q.choices!.length);
      expect(q.choices, q.id).toContain(q.answer);
    }
  });
});
