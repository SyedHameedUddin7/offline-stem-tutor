import type { Flashcard, PracticeQuestion } from "../../types";

/**
 * Builders for authored content. Ids are positional per chapter
 * (`bio-cell-q03`), like the notes and the answer bank, and the same rule
 * applies: append, never insert, or bump CURRICULUM_VERSION.
 *
 * Everything built here is `lang: "en"` and `source: "authored"`: written
 * for this app, not translated, and not reviewed by an external educator.
 * The UI says so rather than presenting it as more than it is.
 */

type Mcq = { q: string; choices: string[]; answer: string; why: string };
type Short = { q: string; answer: string; accept?: string[]; why: string };

export function mcqs(chapterId: string, items: Mcq[], offset = 0): PracticeQuestion[] {
  return items.map((it, i) => ({
    id: `${chapterId}-q${String(offset + i + 1).padStart(2, "0")}`,
    chapterId,
    format: "mcq",
    prompt: it.q,
    choices: it.choices,
    answer: it.answer,
    explanation: it.why,
    lang: "en",
    source: "authored",
  }));
}

export function shorts(chapterId: string, items: Short[], offset: number): PracticeQuestion[] {
  return items.map((it, i) => ({
    id: `${chapterId}-q${String(offset + i + 1).padStart(2, "0")}`,
    chapterId,
    format: "short",
    prompt: it.q,
    answer: it.answer,
    accepted: it.accept,
    explanation: it.why,
    lang: "en",
    source: "authored",
  }));
}

export function cards(chapterId: string, items: Array<[string, string]>): Flashcard[] {
  return items.map(([front, back], i) => ({
    id: `${chapterId}-f${String(i + 1).padStart(2, "0")}`,
    chapterId,
    front,
    back,
    lang: "en",
  }));
}
