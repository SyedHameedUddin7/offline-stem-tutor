import { db, seedReasoningBank } from "./db";
import { EMBEDDING_MODEL_ID, cosineSimilarity, embed, embedOne } from "./embeddings";
import { embeddingTextFor } from "../data/reasoningBank";
import { SUBJECTS, getChapter, getSubject, resolveChapter } from "../data/subjects";
import type { FlaggedItem, Grounding, ReasoningItem, RetrievedItem } from "../types";

/**
 * Retrieval over the local answer bank.
 *
 * This exists because of one specific failure mode. Ask a small model
 * "120, 99, 80, 63, 48, ?" and it will very often produce a confident,
 * well-written explanation of a rule it never checked, and land on a wrong
 * number. There is no hedging in the output for a heuristic to catch — the
 * prose is just as fluent when it is wrong.
 *
 * So for Mental Ability the model does not get to invent a method. We find
 * the nearest verified solved examples first, and the similarity score
 * becomes an honest confidence signal: a real number, computed before the
 * model speaks, that decides whether the student gets an answer or a teacher
 * gets a question.
 */

/**
 * Thresholds — measured against this corpus with the multilingual embedder.
 *
 * Switching to paraphrase-multilingual-MiniLM-L12-v2 bought French, and cost
 * separability. Across 21 held-out questions in both languages:
 *
 *   in-scope, lowest score      0.401
 *   out-of-scope, highest       0.577   ("Résous : 5x - 3 = 17")
 *
 * Those bands OVERLAP. With the English-only model there was clear air
 * between 0.325 and 0.437 and a single threshold worked. There is no such
 * threshold here — the multilingual model reads more semantically, and an
 * algebra question genuinely does look like a pattern question to it.
 *
 * So absolute similarity alone is no longer a safe gate. See
 * DOMAIN_MARGIN below for what replaced it.
 */
export const GROUNDED_THRESHOLD = 0.4;
export const WEAK_THRESHOLD = 0.3;

/**
 * The out-of-domain gate, and the more important number of the two.
 *
 * Every query is scored against two sets: the aptitude bank (positives) and
 * a set of negative anchors built from the Mathematics, Physics and Biology
 * sample problems. A question is only treated as aptitude if it is closer to
 * the bank than to the anchors, by at least this margin.
 *
 * Set to 0.15, which is tighter than the 0.10 measured earlier, because
 * STRONG_MATCH_OVERRIDE below now carries the high-scoring in-scope
 * questions and the gate no longer has to be lenient for them. At 0.10,
 * "Pourquoi le ciel est-il bleu ?" leaked through at 0.104.
 *
 * Honest about what this costs: two in-scope questions sit below 0.15 —
 * "120, 99, 80, 63, 48, ?" (margin 0.110) and "5, 10, 20, 40, ?" (0.137).
 * Both are number series, so the deterministic solver answers them before
 * retrieval is ever consulted. That is a real dependency between two layers
 * and it is written down here rather than left to be discovered.
 *
 * The underlying truth is that short, vague questions do not separate
 * cleanly in this corpus, in either language. Where it stays ambiguous the
 * design errs toward refusing, because the costs are asymmetric: a false
 * refusal produces one item in a teacher's review queue, while a false
 * accept produces a confident wrong answer in front of a student.
 *
 * The anchors cost nothing to maintain: they are the sample problems already
 * written for the other three subjects, which is exactly the set of things a
 * student might type into the wrong tab.
 */
export const DOMAIN_MARGIN = 0.15;

/**
 * Absolute score that overrides the domain gate.
 *
 * The margin rule has one measured false reject: "Odd one out: Triangle,
 * Square, Circle, Rectangle" scores 0.675 against the bank but 0.626 against
 * a geometry anchor ("Two angles of a triangle measure 48° and 67°"), leaving
 * a margin of 0.049 — so a perfectly ordinary aptitude question got refused.
 *
 * The anchor is not wrong to be close; the question genuinely mentions
 * triangles. But an absolute 0.675 is well clear of every out-of-scope
 * question measured, the highest of which was 0.577 ("Résous : 5x - 3 = 17").
 * So a strong enough direct match is trusted on its own.
 *
 * 0.62 sits between those two numbers with room either side. Lowering
 * DOMAIN_MARGIN instead would have re-admitted "Pourquoi le ciel est-il
 * bleu ?" at 0.090, which is exactly what the gate exists to stop.
 */
export const STRONG_MATCH_OVERRIDE = 0.62;

const TOP_K = 3;

/**
 * Embed any bank items that lack a usable vector, and persist them.
 *
 * "Usable" includes the model check: an embedding produced by a different
 * model is worse than no embedding, because it silently returns plausible
 * numbers. Swapping embedders therefore re-indexes automatically, with no
 * migration step for anyone to forget.
 */
export async function indexAnswerBank(): Promise<void> {
  const pending = await db.reasoningItems
    .filter((item) => !item.embedding || item.embeddingModel !== EMBEDDING_MODEL_ID)
    .toArray();
  if (pending.length === 0) return;

  // Batched so a low-end phone gets to breathe between chunks rather than
  // locking the main thread for the whole corpus at once.
  const BATCH = 16;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const vectors = await embed(
      batch.map((item) => embeddingTextFor(item, getChapter(item.chapterId)?.name))
    );
    await db.transaction("rw", db.reasoningItems, async () => {
      await Promise.all(
        batch.map((item, j) =>
          db.reasoningItems.update(item.id, {
            embedding: vectors[j],
            embeddingModel: EMBEDDING_MODEL_ID,
          })
        )
      );
    });
  }
}

/**
 * Negative anchors: what an out-of-domain question looks like.
 *
 * Reuses the sample problems already written for the generative subjects.
 * No new content to maintain, and they are precisely the questions a student
 * lands on Mental Ability and types by mistake.
 */
let negativeVectors: number[][] | null = null;

async function getNegativeAnchors(): Promise<number[][]> {
  if (negativeVectors) return negativeVectors;
  const texts = SUBJECTS.filter((s) => s.mode === "generative").flatMap((s) =>
    s.chapters.flatMap((c) => c.sampleProblems.map((p) => `${c.name}\n${p}`))
  );
  negativeVectors = await embed(texts);
  return negativeVectors;
}

/** All chapter ids belonging to the same subject as `chapterId`. */
function siblingChapterIds(chapterId: string): string[] {
  const subjectId = resolveChapter(chapterId)?.subject.id;
  if (!subjectId) return [chapterId];
  return getSubject(subjectId)!.chapters.map((c) => c.id);
}

/**
 * Find the closest verified exemplars to a question.
 *
 * Searches the whole subject rather than only the open chapter: a student
 * looking at Number Series who types a direction-sense puzzle should still be
 * matched correctly. The chapter is where they are, not what they asked.
 */
export async function retrieve(chapterId: string, question: string): Promise<Grounding> {
  await indexAnswerBank();

  const chapterIds = siblingChapterIds(chapterId);
  let candidates = await db.reasoningItems.where("chapterId").anyOf(chapterIds).toArray();

  // Self-heal an empty table.
  //
  // Seeding runs once on mount and only logs if it fails, so a failure there
  // used to leave every later question unanswerable with no way to recover
  // short of clearing site data. Retrieval is the thing that needs the rows,
  // so retrieval makes sure they exist.
  if (candidates.length === 0) {
    await seedReasoningBank();
    await indexAnswerBank();
    candidates = await db.reasoningItems.where("chapterId").anyOf(chapterIds).toArray();
  }

  const usable = candidates.filter((c): c is ReasoningItem & { embedding: number[] } =>
    Array.isArray(c.embedding)
  );

  if (usable.length === 0) {
    // Distinct from "none" on purpose. "none" means the corpus was searched
    // and nothing matched; this means the corpus could not be searched.
    return {
      status: "unindexed",
      matches: [],
      inContext: false,
      margin: 0,
      bankSize: candidates.length,
    };
  }

  const queryVector = await embedOne(question);

  const matches: RetrievedItem[] = usable
    .map((item) => ({ item, score: cosineSimilarity(queryVector, item.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  const top = matches[0];
  const best = top?.score ?? 0;

  // Domain gate first. A question closer to "find the area of a circle" than
  // to anything in the aptitude bank is not an aptitude question, however
  // high its absolute similarity happens to be.
  const anchors = await getNegativeAnchors();
  const nearestAnchor = anchors.reduce(
    (max, v) => Math.max(max, cosineSimilarity(queryVector, v)),
    0
  );
  const margin = best - nearestAnchor;

  // A strong direct match is trusted on its own; otherwise the domain gate
  // has to be cleared first.
  const passesDomainGate = margin >= DOMAIN_MARGIN || best >= STRONG_MATCH_OVERRIDE;

  const status: Grounding["status"] = !passesDomainGate
    ? "none"
    : best >= GROUNDED_THRESHOLD
      ? "grounded"
      : best >= WEAK_THRESHOLD
        ? "weak"
        : "none";

  return {
    status,
    matches,
    inContext: top?.item.chapterId === chapterId,
    margin,
    bankSize: usable.length,
  };
}

/**
 * Promote a teacher's correction into the answer bank.
 *
 * This is the flywheel, and it is the reason the bank lives in IndexedDB
 * rather than in the bundle. A teacher fixes one wrong answer offline; that
 * fix is embedded on the spot and becomes retrievable for the next student
 * who asks something similar — on the same shared phone, or on another phone
 * in the pod once the two devices sync with each other. No server is involved
 * at any point in that loop.
 */
export async function promoteCorrectionToBank(
  flagged: FlaggedItem,
  correction: string
): Promise<ReasoningItem> {
  const item: ReasoningItem = {
    id: `teacher-${flagged.id}`,
    chapterId: flagged.chapterId,
    question: flagged.question,
    answer: correction,
    reasoning: correction,
    pattern: "teacher-authored correction",
    source: "teacher",
  };

  item.embedding = await embedOne(embeddingTextFor(item, getChapter(item.chapterId)?.name));
  item.embeddingModel = EMBEDDING_MODEL_ID;
  await db.reasoningItems.put(item);
  await db.flaggedItems.update(flagged.id, { promotedItemId: item.id });
  return item;
}
