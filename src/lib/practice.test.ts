import { describe, expect, it } from "vitest";
import { checkAnswer, generatePractice, readNumber } from "./practice";
import { solveMaths } from "./solvers/maths";
import { SUBJECTS } from "../data/subjects";
import type { PracticeQuestion } from "../types";

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const q = (over: Partial<PracticeQuestion>): PracticeQuestion => ({
  id: "t", chapterId: "c", format: "numeric", prompt: "", answer: "5", explanation: "", lang: "en", source: "authored", ...over,
});

describe("checking answers", () => {
  it("reads numbers the ways students write them", () => {
    expect(readNumber("3/8")).toBe(0.375);
    expect(readNumber("0,375")).toBe(0.375);
    expect(readNumber("x = 5")).toBe(5);
    expect(readNumber("12 cm²")).toBe(12);
    expect(readNumber("−2.5")).toBe(-2.5);
    expect(readNumber("five")).toBeNull();
  });

  it("is exact for whole numbers and allows rounding otherwise", () => {
    expect(checkAnswer(q({ answer: "5" }), "5").kind).toBe("correct");
    expect(checkAnswer(q({ answer: "5" }), "5.1").kind).toBe("wrong");
    expect(checkAnswer(q({ answer: "153.93804", tolerance: 0.006 }), "154").kind).toBe("correct"); // π = 22/7
    expect(checkAnswer(q({ answer: "153.93804", tolerance: 0.006 }), "153.86").kind).toBe("correct"); // π = 3.14
    expect(checkAnswer(q({ answer: "153.93804", tolerance: 0.006 }), "150").kind).toBe("wrong");
  });

  it("compares algebraic answers by value, not by spelling", () => {
    const e = q({ format: "expression", answer: "x^2 + 2x + -15" });
    expect(checkAnswer(e, "x² + 2x - 15").kind).toBe("correct");
    expect(checkAnswer(e, "2x - 15 + x^2").kind).toBe("correct");
    expect(checkAnswer(e, "x² - 2x - 15").kind).toBe("wrong");
  });

  it("accepts variants and ignores case, articles and plurals for short answers", () => {
    const s = q({ format: "short", answer: "chloroplasts", accepted: ["chloroplast"] });
    expect(checkAnswer(s, "The Chloroplast").kind).toBe("correct");
    expect(checkAnswer(s, "mitochondria").kind).toBe("wrong");
    expect(checkAnswer(q({ format: "short", answer: "He is her maternal uncle." }), "uncle").kind).toBe("self-mark");
  });
});

describe("generated practice", () => {
  const chapters = SUBJECTS.filter((s) => s.id === "mathematics" || s.id === "physics").flatMap((s) => s.chapters.map((c) => c.id));

  it.each(chapters)("%s: 200 questions, every answer self-consistent and explained", (chapterId) => {
    const qs = generatePractice(chapterId, "en", 200, seeded(chapterId.length * 7919));
    expect(qs.length).toBe(200);
    for (const item of qs) {
      expect(checkAnswer(item, item.answer).kind, `${item.prompt} → ${item.answer}`).toBe("correct");
      expect(item.explanation, item.prompt).toContain("✓");
      expect(Number.isFinite(Number(item.answer)) || item.format === "expression", item.prompt).toBe(true);
    }
  });

  it("the maths solver independently reaches every constructed answer", () => {
    for (const chapterId of chapters.filter((c) => c.startsWith("math-"))) {
      for (const item of generatePractice(chapterId, "en", 60, seeded(99))) {
        const o = solveMaths(item.prompt, "en");
        expect(o.kind, item.prompt).toBe("solved");
        if (o.kind !== "solved") continue;
        if (item.format === "expression") expect(checkAnswer(item, o.result.answer).kind, item.prompt).toBe("correct");
        // Ratio sharing answers every share ("540 : 1890"); the question asks for one of them.
        else if (o.result.problemType === "math.ratio-share") expect(o.result.answer.split(" : "), item.prompt).toContain(item.answer);
        else expect(o.result.value!, item.prompt).toBeCloseTo(Number(item.answer), 6);
      }
    }
  });

  it("writes French prompts in French", () => {
    const [item] = generatePractice("math-linear-equations", "fr", 1, seeded(3));
    expect(item.prompt.startsWith("Résous")).toBe(true);
    expect(item.lang).toBe("fr");
  });

  it("has nothing to generate for Biology", () => {
    expect(generatePractice("bio-cell", "en", 5)).toEqual([]);
  });
});

describe("practice progress", async () => {
  const { db } = await import("./db");
  const { createLearner, deleteLearner } = await import("./learners");
  const { chapterRecord, recordPractice } = await import("./practiceProgress");

  it("keeps each learner's record separate and removes it with the learner", async () => {
    await db.delete();
    await db.open();
    const a = await createLearner("Awa");
    const b = await createLearner("Bakary");
    const [g1, g2] = generatePractice("math-linear-equations", "en", 2, seeded(5));
    await recordPractice(a.id, g1, true);
    await recordPractice(a.id, g2, false);
    await recordPractice(b.id, g1, true);
    expect(await chapterRecord(a.id, "math-linear-equations")).toEqual({ attempts: 2, correct: 1 });
    expect(await chapterRecord(b.id, "math-linear-equations")).toEqual({ attempts: 1, correct: 1 });
    await deleteLearner(a.id);
    expect(await chapterRecord(a.id, "math-linear-equations")).toEqual({ attempts: 0, correct: 0 });
    expect(await chapterRecord(b.id, "math-linear-equations")).toEqual({ attempts: 1, correct: 1 });
  });
});
