import { db } from "./db";
import { listPacks } from "./contentPacks";
import { buildIndex, sameQuestion, tokens, type LexicalHit } from "./lexical";
import { safeParseAll } from "./safeRead";
import { reasoningItemSchema } from "../schemas";
import { REFERENCE_NOTES } from "../data/referenceNotes";
import { REASONING_BANK } from "../data/reasoningBank";
import { BUNDLED_FLASHCARDS, BUNDLED_QUESTIONS } from "../data/curriculum";
import { getSubject, resolveChapter } from "../data/subjects";
import { MATH_PROBLEM_TYPES } from "./solvers/maths";
import { FORMULAS } from "./solvers/physics/formulas";
import { generatedTypesFor } from "./practice";
import type { ContentLang, Flashcard, PracticeQuestion, ReasoningItem, ReferenceNote, SubjectId } from "../types";

/**
 * One place that answers "what can a student do in this chapter, offline,
 * on this device" — for the Learn and Practice tabs, the coverage strip, and
 * the tutor's no-model fallback.
 */

export interface Lesson {
  id: string;
  chapterId: string;
  kind: ReferenceNote["kind"];
  title: string;
  body: string;
  lang: ContentLang;
  /** "bundled", or the title of the teacher pack it came from. */
  source: string;
}

export interface ChapterMaterial {
  lessons: Lesson[];
  flashcards: Flashcard[];
  /** Authored, pack and (Mental Ability) answer-bank questions. Generated ones are separate. */
  questions: PracticeQuestion[];
  teacherAnswers: ReasoningItem[];
}

const bundledLessons = (chapterId: string): Lesson[] =>
  REFERENCE_NOTES.filter((n) => n.chapterId === chapterId).map((n) => ({
    id: n.id, chapterId, kind: n.kind, title: n.title, body: n.body, lang: "en", source: "bundled",
  }));

/** Mental Ability exemplars double as practice: question, answer, worked method. */
function bankQuestions(chapterId: string): PracticeQuestion[] {
  return REASONING_BANK.filter((i) => i.chapterId === chapterId).map((i) => ({
    id: i.id,
    chapterId,
    format: /^-?\d+(\.\d+)?$/.test(i.answer.trim()) ? "numeric" : "short",
    prompt: i.question,
    answer: i.answer.replace(/\.$/, ""),
    explanation: `${i.pattern}\n\n${i.reasoning}`,
    lang: "en",
    source: "bank",
  }));
}

export async function teacherAnswers(chapterIds: string[]): Promise<ReasoningItem[]> {
  const rows = await db.reasoningItems.where("chapterId").anyOf(chapterIds).toArray();
  return safeParseAll(reasoningItemSchema, rows, "reasoning item").valid.filter((r) => r.source === "teacher") as ReasoningItem[];
}

export async function chapterMaterial(chapterId: string): Promise<ChapterMaterial> {
  const packs = await listPacks().catch(() => []);
  const fromPacks = <T extends { chapterId: string }>(pick: (p: (typeof packs)[number]) => T[]) =>
    packs.flatMap((p) => pick(p).filter((x) => x.chapterId === chapterId).map((x) => ({ ...x, _pack: p.title })));

  return {
    lessons: [
      ...bundledLessons(chapterId),
      ...fromPacks((p) => p.lessons).map(({ _pack, ...l }) => ({ ...l, source: _pack })),
    ],
    flashcards: [...BUNDLED_FLASHCARDS.filter((f) => f.chapterId === chapterId), ...fromPacks((p) => p.flashcards).map(({ _pack: _, ...f }) => f)],
    questions: [
      ...BUNDLED_QUESTIONS.filter((q) => q.chapterId === chapterId),
      ...bankQuestions(chapterId),
      ...fromPacks((p) => p.questions).map(({ _pack: _, ...q }) => q),
    ],
    teacherAnswers: await teacherAnswers([chapterId]).catch(() => []),
  };
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

export interface SearchDoc {
  id: string;
  text: string;
  chapterId: string;
  type: "lesson" | "flashcard" | "question" | "teacher";
  title: string;
  body: string;
}

/** Everything searchable in a subject: lessons, flashcards, question explanations, teacher answers. */
export async function subjectDocs(subjectId: SubjectId): Promise<SearchDoc[]> {
  const chapterIds = getSubject(subjectId)?.chapters.map((c) => c.id) ?? [];
  const materials = await Promise.all(chapterIds.map(chapterMaterial));
  return materials.flatMap((m) => [
    ...m.lessons.map((l) => ({ id: l.id, chapterId: l.chapterId, type: "lesson" as const, title: l.title, body: l.body, text: `${l.title} ${l.title} ${l.body}` })),
    ...m.flashcards.map((f) => ({ id: f.id, chapterId: f.chapterId, type: "flashcard" as const, title: f.front, body: f.back, text: `${f.front} ${f.front} ${f.back}` })),
    ...m.questions
      .filter((q) => q.source !== "bank")
      .map((q) => ({ id: q.id, chapterId: q.chapterId, type: "question" as const, title: q.prompt, body: `${q.answer}. ${q.explanation}`, text: `${q.prompt} ${q.answer} ${q.explanation}` })),
    ...m.teacherAnswers.map((t) => ({ id: t.id, chapterId: t.chapterId, type: "teacher" as const, title: t.question, body: t.answer, text: `${t.question} ${t.answer}` })),
  ]);
}

export async function searchSubject(subjectId: SubjectId, query: string, limit = 8): Promise<Array<LexicalHit<SearchDoc>>> {
  return buildIndex(await subjectDocs(subjectId)).search(query, limit);
}

/**
 * The lesson that answers a question well enough to show as the reply, or
 * null. "Well enough" is deliberately strict — most of the question's words,
 * and at least two of them unless the question has only one content word —
 * because this reply carries no model and no check, only relevance.
 */
export function strongMatch(hits: Array<LexicalHit<SearchDoc>>, query: string): LexicalHit<SearchDoc> | null {
  // Teacher answers are served by teacherMatch, under their own badge.
  const top = hits.find((h) => h.doc.type !== "teacher");
  if (!top) return null;
  const words = new Set(tokens(query)).size;
  return top.coverage >= 0.6 && (top.matched >= 2 || words === 1) ? top : null;
}

/** A teacher answer to the same question, found without the embedder. */
export async function teacherMatch(chapterId: string, question: string): Promise<ReasoningItem | null> {
  const subjectId = resolveChapter(chapterId)?.subject.id;
  const chapterIds = subjectId ? (getSubject(subjectId)?.chapters.map((c) => c.id) ?? [chapterId]) : [chapterId];
  const items = await teacherAnswers(chapterIds).catch(() => []);
  // Same chapter first: a teacher's answer there is the strongest signal.
  const ordered = [...items].sort((a, b) => Number(b.chapterId === chapterId) - Number(a.chapterId === chapterId));
  return ordered.find((i) => sameQuestion(i.question, question)) ?? null;
}

/* ------------------------------------------------------------------ *
 * Coverage
 * ------------------------------------------------------------------ */

export interface Coverage {
  lessons: number;
  flashcards: number;
  questions: number;
  /** Generated numerical question types (never run out). */
  generated: number;
  /** Problem types the deterministic solver handles in this chapter. */
  solverTypes: Array<[string, string]>;
  teacherAnswers: number;
  /** Items available in French, out of the chapter's authored items. */
  french: number;
}

export function solverTypesFor(chapterId: string): Array<[string, string]> {
  if (chapterId === "ma-number-series") return [["Number series (exact solver)", "Suites de nombres (solveur exact)"]];
  const maths = MATH_PROBLEM_TYPES.filter((p) => p.chapterId === chapterId).map((p) => p.name);
  const physics = FORMULAS.filter((f) => f.chapterId === chapterId).map((f) => [`${f.name[0]}: ${f.equation}`, `${f.name[1]} : ${f.equation}`] as [string, string]);
  if (chapterId === "phys-electricity") physics.push(["Resistors in series and parallel", "Résistances en série et en dérivation"]);
  return [...maths, ...physics];
}

export async function chapterCoverage(chapterId: string): Promise<Coverage> {
  const m = await chapterMaterial(chapterId);
  const all = [...m.lessons, ...m.flashcards, ...m.questions];
  return {
    lessons: m.lessons.length,
    flashcards: m.flashcards.length,
    questions: m.questions.length,
    generated: generatedTypesFor(chapterId),
    solverTypes: solverTypesFor(chapterId),
    teacherAnswers: m.teacherAnswers.length,
    french: all.filter((x) => x.lang === "fr").length,
  };
}
