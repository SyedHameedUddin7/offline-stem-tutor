import type { ReferenceNote } from "../../types";
import { MATHEMATICS_NOTES } from "./mathematics";
import { PHYSICS_NOTES } from "./physics";
import { BIOLOGY_NOTES } from "./biology";

/**
 * Bump when the note content changes, for the same reason the reasoning bank
 * has a version: ids are positional and an insertion re-points the ones after
 * it, so a device that already seeded would otherwise keep stale text under a
 * reused id.
 */
export const NOTES_VERSION = 1;

export const REFERENCE_NOTES: ReferenceNote[] = [
  ...MATHEMATICS_NOTES,
  ...PHYSICS_NOTES,
  ...BIOLOGY_NOTES,
];

export { noteEmbeddingText } from "./helpers";
