import { db } from "./db";
import type { Learner } from "../types";

/**
 * Learner profiles for a shared device.
 *
 * No account, no email, no server. A name and a colour, created in two taps,
 * stored on this device and nowhere else — because the student this is for
 * may not have an email address, and the pod may not have a connection on
 * the day they first pick up the phone.
 */

const ACTIVE_KEY = "stem-tutor:active-learner";

/** Accents for the picker. Identity without an image download. */
export const LEARNER_COLORS = [
  "solar",
  "signal",
  "paper",
  "danger",
  "solar",
  "signal",
] as const;

export async function listLearners(): Promise<Learner[]> {
  // Most recently active first: on a shared phone the person who used it last
  // is the likeliest next user, and that saves a scan of the whole list.
  return db.learners.orderBy("lastActiveAt").reverse().toArray();
}

export async function createLearner(name: string): Promise<Learner> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("A learner needs a name");

  const existingCount = await db.learners.count();
  const now = Date.now();
  const learner: Learner = {
    id: crypto.randomUUID(),
    name: trimmed.slice(0, 40),
    colorIndex: existingCount % LEARNER_COLORS.length,
    createdAt: now,
    lastActiveAt: now,
  };
  await db.learners.add(learner);
  return learner;
}

export async function touchLearner(id: string): Promise<void> {
  await db.learners.update(id, { lastActiveAt: Date.now() });
}

/**
 * Remove a learner and everything belonging to them.
 *
 * A real action on a shared device: a student leaves the pod, and their
 * conversations should leave with them. Their flagged questions go too —
 * a facilitator reviewing an answer for a student who is gone is reviewing
 * nothing. Teacher corrections already promoted into the answer bank stay,
 * because those are no longer about one student.
 */
export async function deleteLearner(id: string): Promise<void> {
  await db.transaction("rw", db.learners, db.messages, db.flaggedItems, async () => {
    await db.messages.where("learnerId").equals(id).delete();
    await db.flaggedItems.where("learnerId").equals(id).delete();
    await db.learners.delete(id);
  });
  if (getActiveLearnerId() === id) clearActiveLearner();
}

/* ------------------------------------------------------------------ *
 * Active learner
 * ------------------------------------------------------------------ */

export function getActiveLearnerId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    // Private mode or blocked site data. Not fatal: the app falls back to
    // asking who is learning, which is the safe default on a shared device.
    return null;
  }
}

export function setActiveLearnerId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore — the session still works, it just will not be remembered */
  }
}

export function clearActiveLearner(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve the remembered learner, or null.
 *
 * Returns null when the stored id no longer exists — a profile deleted on
 * this device, or site data cleared. Falling through to the picker is correct
 * there; silently adopting someone else's profile would not be.
 */
export async function resolveActiveLearner(): Promise<Learner | null> {
  const id = getActiveLearnerId();
  if (!id) return null;
  const learner = await db.learners.get(id);
  if (!learner) {
    clearActiveLearner();
    return null;
  }
  return learner;
}
