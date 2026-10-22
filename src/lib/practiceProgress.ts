import { db } from "./db";
import { safeParseAll } from "./safeRead";
import { practiceProgressSchema } from "../schemas";
import type { PracticeProgress, PracticeQuestion } from "../types";

/**
 * Practice results, per learner. Generated questions are tracked by problem
 * type (`gen:math.linear-equation`), since each one is asked once and never
 * again; authored questions by their own id.
 */

export function progressKey(q: PracticeQuestion): string {
  return q.source === "generated" ? q.id.split(":").slice(0, 2).join(":") : q.id;
}

export async function recordPractice(learnerId: string, q: PracticeQuestion, correct: boolean): Promise<void> {
  const itemId = progressKey(q);
  await db.transaction("rw", db.practiceProgress, async () => {
    const prev = await db.practiceProgress.get([learnerId, itemId]);
    await db.practiceProgress.put({
      learnerId,
      itemId,
      chapterId: q.chapterId,
      attempts: (prev?.attempts ?? 0) + 1,
      correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
      lastAnsweredAt: Date.now(),
    });
  });
}

export async function chapterRecord(learnerId: string, chapterId: string): Promise<{ attempts: number; correct: number }> {
  const rows = await db.practiceProgress.where("learnerId").equals(learnerId).toArray();
  const valid = safeParseAll(practiceProgressSchema, rows, "practice progress").valid as PracticeProgress[];
  return valid
    .filter((r) => r.chapterId === chapterId)
    .reduce((acc, r) => ({ attempts: acc.attempts + r.attempts, correct: acc.correct + r.correct }), { attempts: 0, correct: 0 });
}
