import { db } from "./db";
import { EMBEDDING_MODEL_ID, cosineSimilarity, embed, embedOne } from "./embeddings";
import { noteEmbeddingText } from "../data/referenceNotes";
import { getChapter } from "../data/subjects";
import type { ReferenceNote } from "../types";

/**
 * Retrieval for the generative subjects — augmentation, not authorisation.
 *
 * This is the same machinery as lib/retrieval.ts and deliberately NOT the
 * same policy, which is the whole reason it is a separate module.
 *
 * In Mental Ability, retrieval decides whether the tutor is allowed to answer
 * at all: no match, no answer. Applying that rule here would be wrong. "Why
 * does a heavier object not fall faster?" deserves an answer whether or not
 * 84 hand-written notes happen to cover it, so a miss here means "answer
 * without extra context", never "refuse".
 *
 * What the notes buy is accuracy on the things a 1.5B model reliably gets
 * wrong: the sign of a term, which quantity is conserved, whether bile is an
 * enzyme. Putting the right formula and the known misconception in front of
 * it is far cheaper than a bigger model, and it works on the same hardware.
 */

/**
 * Minimum similarity for a note to be worth the context window.
 *
 * Lower than the aptitude thresholds on purpose. The cost of a marginally
 * relevant note is a few wasted tokens; the cost of dropping a relevant one
 * is the wrong formula in a worked answer. The asymmetry justifies being
 * generous — but not unbounded, because an unrelated note actively misleads
 * a small model, which will dutifully try to use whatever it is given.
 */
export const NOTE_RELEVANCE_THRESHOLD = 0.3;

const MAX_NOTES = 4;

/** Embed any notes missing a vector for the current model, and persist them. */
export async function indexReferenceNotes(): Promise<void> {
  const pending = await db.referenceNotes
    .filter((n) => !n.embedding || n.embeddingModel !== EMBEDDING_MODEL_ID)
    .toArray();
  if (pending.length === 0) return;

  const BATCH = 16;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const vectors = await embed(
      batch.map((n) => noteEmbeddingText(n, getChapter(n.chapterId)?.name))
    );
    await db.transaction("rw", db.referenceNotes, async () => {
      await Promise.all(
        batch.map((n, j) =>
          db.referenceNotes.update(n.id, {
            embedding: vectors[j],
            embeddingModel: EMBEDDING_MODEL_ID,
          })
        )
      );
    });
  }
}

export interface RetrievedNote {
  note: ReferenceNote;
  score: number;
}

/**
 * Find the notes most relevant to a question.
 *
 * Scoped to the chapter the student has open, not the whole subject. Unlike
 * the aptitude bank — where a student on Number Series might legitimately
 * type a direction puzzle and should still be matched — a chapter here is a
 * genuine topic boundary. Pulling electricity notes into a question about
 * heat would make the answer worse, not broader.
 */
export async function retrieveNotes(
  chapterId: string,
  question: string
): Promise<RetrievedNote[]> {
  await indexReferenceNotes();

  const candidates = await db.referenceNotes.where("chapterId").equals(chapterId).toArray();
  const usable = candidates.filter((n): n is ReferenceNote & { embedding: number[] } =>
    Array.isArray(n.embedding)
  );
  if (usable.length === 0) return [];

  const queryVector = await embedOne(question);

  return usable
    .map((note) => ({ note, score: cosineSimilarity(queryVector, note.embedding) }))
    .filter((r) => r.score >= NOTE_RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_NOTES);
}

/**
 * Format retrieved notes for the prompt.
 *
 * Misconception notes go LAST, because the final lines of a prompt carry the
 * most weight with a small model and "here is the mistake students make here"
 * is the single most useful thing it can be holding when it starts writing.
 */
export function formatNotes(retrieved: RetrievedNote[], lang: "en" | "fr"): string {
  if (retrieved.length === 0) return "";

  const ordered = [...retrieved].sort(
    (a, b) =>
      Number(a.note.kind === "misconception") - Number(b.note.kind === "misconception")
  );

  const header =
    lang === "fr"
      ? "MATÉRIEL DE RÉFÉRENCE VÉRIFIÉ POUR CE CHAPITRE (rédigé par un enseignant — fais-y confiance plutôt qu'à ta mémoire) :"
      : "VERIFIED REFERENCE MATERIAL FOR THIS CHAPTER (teacher-written — trust this over your own recall):";

  const labels =
    lang === "fr"
      ? {
          definition: "DÉFINITION",
          formula: "FORMULE",
          "worked-example": "EXEMPLE RÉSOLU",
          misconception: "ERREUR COURANTE À ÉVITER",
        }
      : {
          definition: "DEFINITION",
          formula: "FORMULA",
          "worked-example": "WORKED EXAMPLE",
          misconception: "COMMON MISTAKE TO AVOID",
        };

  const body = ordered
    .map((r) => `[${labels[r.note.kind]}] ${r.note.title}\n${r.note.body}`)
    .join("\n\n");

  return `${header}\n\n${body}`;
}
