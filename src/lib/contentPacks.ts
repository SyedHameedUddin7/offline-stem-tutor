import { db } from "./db";
import { safeParseAll } from "./safeRead";
import { contentPackSchema } from "../schemas";
import { SUBJECTS } from "../data/subjects";
import { BUNDLED_FLASHCARDS, BUNDLED_QUESTIONS } from "../data/curriculum";
import { REFERENCE_NOTES } from "../data/referenceNotes";
import type { ContentPack } from "../types";

/**
 * Curriculum packs: extra lessons, questions and flashcards a teacher hands
 * to a device as a file. Same courier model as sync — no server.
 *
 * All-or-nothing. A pack is validated in full before anything is written, and
 * stored as one row, so a malformed or half-copied file can never leave a
 * device with part of a pack, or damage the bundled curriculum.
 */

const CHAPTER_IDS = new Set(SUBJECTS.flatMap((s) => s.chapters.map((c) => c.id)));
const BUNDLED_IDS = new Set([
  ...REFERENCE_NOTES.map((n) => n.id),
  ...BUNDLED_QUESTIONS.map((q) => q.id),
  ...BUNDLED_FLASHCARDS.map((f) => f.id),
]);

export type ImportResult =
  | { ok: true; pack: ContentPack; replaced: boolean; counts: { lessons: number; questions: number; flashcards: number } }
  | { ok: false; errors: string[] };

export async function importPack(text: string): Promise<ImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["The file is not valid JSON."] };
  }
  const parsed = contentPackSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(file)"}: ${i.message}`),
    };
  }
  const pack = parsed.data as ContentPack;

  // Checks the schema cannot make: every item must point at a real chapter,
  // ids must be unique, and no id may shadow bundled content.
  const errors: string[] = [];
  const items = [...pack.lessons, ...pack.questions, ...pack.flashcards];
  const seen = new Set<string>();
  for (const item of items) {
    if (!CHAPTER_IDS.has(item.chapterId)) errors.push(`${item.id}: unknown chapter "${item.chapterId}"`);
    if (seen.has(item.id)) errors.push(`${item.id}: id used twice in this pack`);
    if (BUNDLED_IDS.has(item.id)) errors.push(`${item.id}: id already used by the built-in curriculum`);
    seen.add(item.id);
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 8) };

  // Packs are labelled as packs wherever their items appear.
  const stored: ContentPack = {
    ...pack,
    questions: pack.questions.map((q) => ({ ...q, source: "pack" })),
    importedAt: Date.now(),
  };
  const replaced = (await db.contentPacks.get(pack.id)) !== undefined;
  await db.contentPacks.put(stored);
  return {
    ok: true,
    pack: stored,
    replaced,
    counts: { lessons: pack.lessons.length, questions: pack.questions.length, flashcards: pack.flashcards.length },
  };
}

export async function listPacks(): Promise<ContentPack[]> {
  const rows = await db.contentPacks.toArray();
  return safeParseAll(contentPackSchema, rows, "content pack").valid as ContentPack[];
}

export async function removePack(id: string): Promise<void> {
  await db.contentPacks.delete(id);
}
