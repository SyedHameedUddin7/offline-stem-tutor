import type { Flashcard, PracticeQuestion } from "../../types";
import { BIOLOGY_FLASHCARDS, BIOLOGY_QUESTIONS } from "./biology";
import { MATHS_QUESTIONS, PHYSICS_MATHS_FLASHCARDS, PHYSICS_QUESTIONS } from "./physicsMaths";

/**
 * The offline curriculum that ships with the app.
 *
 * Bundled rather than downloaded: it is small (tens of kilobytes of text),
 * and a pod that never had signal after the first visit still needs it.
 * Teacher packs (lib/contentPacks.ts) add to it; they never replace it.
 *
 * Which syllabus? None specifically. The chapter list in data/subjects.ts is
 * deliberately syllabus-neutral lower-secondary (roughly grades 8-10), and
 * this content follows it. No claim of alignment with, or approval by, any
 * national curriculum body is made.
 */
export const CURRICULUM_ID = "syllabus-neutral, lower secondary (grades 8-10)";
export const CURRICULUM_VERSION = 1;

export const BUNDLED_QUESTIONS: PracticeQuestion[] = [...MATHS_QUESTIONS, ...PHYSICS_QUESTIONS, ...BIOLOGY_QUESTIONS];
export const BUNDLED_FLASHCARDS: Flashcard[] = [...PHYSICS_MATHS_FLASHCARDS, ...BIOLOGY_FLASHCARDS];
