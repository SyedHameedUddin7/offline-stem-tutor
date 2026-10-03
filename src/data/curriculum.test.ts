import { describe, expect, it } from "vitest";
import { SUBJECTS, localizedSubjects, resolveLocalizedChapter, systemPromptFor } from "./subjects";
import { CHAPTER_FR, SUBJECT_FR } from "./subjects.fr";
import { REASONING_BANK } from "./reasoningBank";
import { REFERENCE_NOTES } from "./referenceNotes";
import { LESSON_VIDEOS } from "./videos";

const ALL_CHAPTER_IDS = new Set(SUBJECTS.flatMap((s) => s.chapters.map((c) => c.id)));

/**
 * These were one-off scripts I ran by hand while building the curriculum.
 * Kept as tests because the failures they catch are silent: a chapter with no
 * French translation does not crash, it just quietly shows English to a French
 * student, and nobody notices until a pod reports it.
 */
describe("curriculum structure", () => {
  it("has four subjects of seven chapters each", () => {
    expect(SUBJECTS).toHaveLength(4);
    for (const s of SUBJECTS) {
      expect(s.chapters, `${s.id} chapter count`).toHaveLength(7);
    }
  });

  it("has globally unique chapter ids", () => {
    const ids = SUBJECTS.flatMap((s) => s.chapters.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every chapter a focus and starter problems", () => {
    for (const s of SUBJECTS) {
      for (const c of s.chapters) {
        expect(c.focus.length, `${c.id} focus`).toBeGreaterThan(40);
        expect(c.sampleProblems.length, `${c.id} samples`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("has exactly one retrieval-grounded subject", () => {
    const grounded = SUBJECTS.filter((s) => s.mode === "retrieval-grounded");
    expect(grounded.map((s) => s.id)).toEqual(["mental-ability"]);
  });
});

describe("French localisation", () => {
  it("translates every subject", () => {
    for (const s of SUBJECTS) {
      expect(SUBJECT_FR[s.id], `${s.id} missing`).toBeDefined();
    }
  });

  it("translates every chapter, with the same number of starter problems", () => {
    for (const s of SUBJECTS) {
      for (const c of s.chapters) {
        const fr = CHAPTER_FR[c.id];
        expect(fr, `${c.id} missing`).toBeDefined();
        expect(fr.name.length, `${c.id} name`).toBeGreaterThan(0);
        expect(fr.blurb.length, `${c.id} blurb`).toBeGreaterThan(0);
        expect(fr.focus.length, `${c.id} focus`).toBeGreaterThan(40);
        expect(fr.sampleProblems, `${c.id} samples`).toHaveLength(c.sampleProblems.length);
      }
    }
  });

  it("has no orphan French keys left by a rename", () => {
    for (const id of Object.keys(CHAPTER_FR)) {
      expect(ALL_CHAPTER_IDS.has(id), `orphan: ${id}`).toBe(true);
    }
  });

  it("actually returns French when French is asked for", () => {
    const [maths] = localizedSubjects("fr");
    expect(maths.name).toBe("Mathématiques");
    expect(resolveLocalizedChapter("phys-light", "fr")!.chapter.name).toContain("Lumière");
  });

  /**
   * The prompt is how the model learns which language to answer in. A
   * translated interface that prompts in English produces a French app that
   * replies in English — worse than not translating at all.
   */
  it("builds prompts in the student's language", () => {
    expect(systemPromptFor("math-linear-equations", "en")).toContain("Current chapter");
    const fr = systemPromptFor("math-linear-equations", "fr");
    expect(fr).toContain("Chapitre en cours");
    expect(fr).toContain("français");
  });
});

describe("content references real chapters", () => {
  it("anchors every reasoning item to a Mental Ability chapter", () => {
    const maChapters = new Set(
      SUBJECTS.find((s) => s.id === "mental-ability")!.chapters.map((c) => c.id)
    );
    for (const item of REASONING_BANK) {
      expect(maChapters.has(item.chapterId), `${item.id} -> ${item.chapterId}`).toBe(true);
    }
  });

  it("anchors every reference note to a generative chapter", () => {
    const generative = new Set(
      SUBJECTS.filter((s) => s.mode === "generative").flatMap((s) => s.chapters.map((c) => c.id))
    );
    for (const note of REFERENCE_NOTES) {
      expect(generative.has(note.chapterId), `${note.id} -> ${note.chapterId}`).toBe(true);
    }
  });

  it("anchors every lesson video to a real chapter", () => {
    for (const v of LESSON_VIDEOS) {
      expect(ALL_CHAPTER_IDS.has(v.chapterId), `${v.id} -> ${v.chapterId}`).toBe(true);
    }
  });

  it("has unique ids across all content", () => {
    for (const [label, ids] of [
      ["reasoning", REASONING_BANK.map((i) => i.id)],
      ["notes", REFERENCE_NOTES.map((n) => n.id)],
      ["videos", LESSON_VIDEOS.map((v) => v.id)],
    ] as const) {
      expect(new Set(ids).size, `${label} has duplicate ids`).toBe(ids.length);
    }
  });

  it("covers every Mental Ability chapter with at least four exemplars", () => {
    const counts = new Map<string, number>();
    for (const i of REASONING_BANK) counts.set(i.chapterId, (counts.get(i.chapterId) ?? 0) + 1);
    for (const c of SUBJECTS.find((s) => s.id === "mental-ability")!.chapters) {
      expect(counts.get(c.id) ?? 0, `${c.id} exemplars`).toBeGreaterThanOrEqual(4);
    }
  });

  /**
   * The gap that caused a real wrong answer: with no constant-difference
   * exemplar, "2, 4, 6, 8, ?" retrieved the Fibonacci item at 0.67 and the
   * model answered 20. The simplest series type in existence was missing.
   */
  it("covers the basic series techniques", () => {
    const patterns = REASONING_BANK.filter((i) => i.chapterId === "ma-number-series")
      .map((i) => i.pattern)
      .join(" | ");
    for (const technique of ["constant difference", "constant ratio", "constant second difference", "squares", "cubes", "prime"]) {
      expect(patterns, `no exemplar for: ${technique}`).toContain(technique);
    }
  });
});
