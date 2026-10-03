import { db } from "./db";
import { resolveChapter } from "../data/subjects";
import type { ChatMessage, EngineTier, Learner, SubjectId } from "../types";

/**
 * Aggregations for the facilitator view.
 *
 * Everything here is derived from data the app actually has. That constraint
 * is the design: it would be easy to show a "mastery: 68%" bar, and it would
 * be a fabrication, because nothing in this system knows whether a student's
 * answer was right. We know what they asked, which engine answered, and
 * whether a human has checked it. So those are what the dashboard reports.
 *
 * The useful substitute for mastery is UNVERIFIED COVERAGE: how many answers
 * a student received from the language model that no human has looked at.
 * That is a real number, it is actionable — it tells a facilitator where to
 * spend their next ten minutes — and it does not pretend to measure learning.
 */

/** Local midnight. "Today" means the pod's today, not UTC's. */
function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * An answer the model produced that nobody has checked.
 *
 * Solver answers are verified by construction and answer-bank answers came
 * from a vetted exemplar, so neither counts. A flagged model answer is
 * already in the queue and counts as seen.
 */
function isUnverified(m: ChatMessage): boolean {
  return m.role === "tutor" && m.tier === "webgpu-llm" && !m.flagged;
}

export interface PodSummary {
  learnerCount: number;
  questionsToday: number;
  questionsAllTime: number;
  pendingReview: number;
  approved: number;
  corrected: number;
  /** Teacher-authored exemplars in the bank — the flywheel, as a number. */
  teacherExemplars: number;
  /** Which rung of the ladder answered. The project's thesis, measured. */
  provenance: Record<EngineTier, number>;
  unverifiedAnswers: number;
}

export async function getPodSummary(now = Date.now()): Promise<PodSummary> {
  const midnight = startOfToday(now);

  const [learnerCount, messages, flags, teacherExemplars] = await Promise.all([
    db.learners.count(),
    db.messages.toArray(),
    db.flaggedItems.toArray(),
    db.reasoningItems.where("source").equals("teacher").count(),
  ]);

  const provenance: Record<EngineTier, number> = {
    solver: 0,
    "webgpu-llm": 0,
    "answer-bank": 0,
    unavailable: 0,
  };

  let questionsToday = 0;
  let questionsAllTime = 0;
  let unverifiedAnswers = 0;

  for (const m of messages) {
    if (m.role === "student") {
      questionsAllTime++;
      if (m.timestamp >= midnight) questionsToday++;
      continue;
    }
    if (m.tier) provenance[m.tier]++;
    if (isUnverified(m)) unverifiedAnswers++;
  }

  return {
    learnerCount,
    questionsToday,
    questionsAllTime,
    pendingReview: flags.filter((f) => f.teacherStatus === "pending").length,
    approved: flags.filter((f) => f.teacherStatus === "approved").length,
    corrected: flags.filter((f) => f.teacherStatus === "corrected").length,
    teacherExemplars,
    provenance,
    unverifiedAnswers,
  };
}

export interface LearnerSummary {
  learner: Learner;
  questions: number;
  pending: number;
  unverified: number;
  chaptersTouched: number;
  /** Last time this learner asked anything, not when they opened the app. */
  lastQuestionAt: number | null;
}

export async function getLearnerSummaries(): Promise<LearnerSummary[]> {
  const [learners, messages, flags] = await Promise.all([
    db.learners.toArray(),
    db.messages.toArray(),
    db.flaggedItems.toArray(),
  ]);

  const byLearner = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const list = byLearner.get(m.learnerId);
    if (list) list.push(m);
    else byLearner.set(m.learnerId, [m]);
  }

  return learners
    .map((learner) => {
      const own = byLearner.get(learner.id) ?? [];
      const questions = own.filter((m) => m.role === "student");
      return {
        learner,
        questions: questions.length,
        pending: flags.filter((f) => f.learnerId === learner.id && f.teacherStatus === "pending")
          .length,
        unverified: own.filter(isUnverified).length,
        chaptersTouched: new Set(own.map((m) => m.chapterId)).size,
        lastQuestionAt: questions.length
          ? Math.max(...questions.map((m) => m.timestamp))
          : null,
      };
    })
    // Most pending review first: the facilitator's next ten minutes should go
    // to whoever is most stuck, not to whoever is alphabetically first.
    .sort((a, b) => b.pending - a.pending || b.unverified - a.unverified);
}

export interface ChapterAttention {
  chapterId: string;
  chapterName: string;
  subjectId: SubjectId;
  pending: number;
  unverified: number;
  questions: number;
}

/**
 * Where the pod is struggling, by chapter.
 *
 * Ranked by pending review then unverified answers. A chapter nobody has
 * asked about does not appear at all — an empty row is not a signal, and
 * padding the list to look substantial would bury the chapters that matter.
 */
export async function getChaptersNeedingAttention(limit = 6): Promise<ChapterAttention[]> {
  const [messages, flags] = await Promise.all([
    db.messages.toArray(),
    db.flaggedItems.toArray(),
  ]);

  const stats = new Map<string, ChapterAttention>();

  const ensure = (chapterId: string, subjectId: SubjectId) => {
    let row = stats.get(chapterId);
    if (!row) {
      row = {
        chapterId,
        chapterName: resolveChapter(chapterId)?.chapter.name ?? chapterId,
        subjectId,
        pending: 0,
        unverified: 0,
        questions: 0,
      };
      stats.set(chapterId, row);
    }
    return row;
  };

  for (const m of messages) {
    const row = ensure(m.chapterId, m.subjectId);
    if (m.role === "student") row.questions++;
    if (isUnverified(m)) row.unverified++;
  }
  for (const f of flags) {
    if (f.teacherStatus === "pending") ensure(f.chapterId, f.subjectId).pending++;
  }

  return [...stats.values()]
    .filter((row) => row.pending > 0 || row.unverified > 0)
    .sort((a, b) => b.pending - a.pending || b.unverified - a.unverified)
    .slice(0, limit);
}
