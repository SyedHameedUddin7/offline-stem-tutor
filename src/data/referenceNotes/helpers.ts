import type { ReferenceNote } from "../../types";

/**
 * Build notes for one chapter with generated ids.
 *
 * Ids are positional, like the reasoning bank's, and carry the same hazard:
 * inserting a note at the front re-points every id after it. Seeding handles
 * that with a version bump (see NOTES_VERSION in ./index.ts) rather than
 * trusting nobody will ever edit the middle of a list.
 */
export function notes(
  chapterId: string,
  items: Array<Omit<ReferenceNote, "id" | "chapterId">>
): ReferenceNote[] {
  return items.map((item, i) => ({
    ...item,
    id: `${chapterId}-n${String(i + 1).padStart(2, "0")}`,
    chapterId,
  }));
}

/**
 * Text used to embed a note.
 *
 * Title plus body, prefixed with the chapter name for the same reason the
 * reasoning bank does it: it pulls notes toward questions about that chapter
 * and away from questions that merely share vocabulary.
 */
export function noteEmbeddingText(note: ReferenceNote, chapterName?: string): string {
  return [chapterName, note.title, note.body].filter(Boolean).join("\n");
}
