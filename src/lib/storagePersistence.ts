/**
 * Ask the browser not to delete this origin's data.
 *
 * Why this is not optional, learned the hard way: a tester created two
 * learners, closed the tab, came back, and both were gone along with the
 * service worker. Nothing in the app deleted them. Without persistence
 * granted, browser storage is "best effort" — a browser is free to evict
 * IndexedDB and the Cache API under storage pressure, and some are
 * configured to clear site data on exit. A private window discards
 * everything unconditionally.
 *
 * For an app whose entire claim is "your work survives offline", leaving
 * that to chance is a bug. It was previously requested only from the
 * facilitator panel, behind a PIN that a student never opens.
 *
 * Chrome decides by heuristic rather than prompting — site engagement,
 * bookmarking, and notably whether the app is INSTALLED. Firefox prompts.
 * Safari grants on interaction. So this can legitimately be refused, which
 * is why the result is surfaced rather than assumed.
 */

export type PersistenceState = "unknown" | "granted" | "denied" | "unsupported";

let current: PersistenceState = "unknown";
const listeners = new Set<(s: PersistenceState) => void>();

function set(next: PersistenceState) {
  if (next === current) return;
  current = next;
  listeners.forEach((fn) => fn(next));
}

export function getPersistenceState(): PersistenceState {
  return current;
}

export function onPersistenceState(fn: (s: PersistenceState) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

/** Read the current grant without asking for one. */
export async function refreshPersistenceState(): Promise<PersistenceState> {
  if (!navigator.storage?.persisted) {
    set("unsupported");
    return "unsupported";
  }
  try {
    set((await navigator.storage.persisted()) ? "granted" : "denied");
  } catch {
    set("unsupported");
  }
  return current;
}

/**
 * Request persistence, at most once per session, and only if not already held.
 *
 * Called from real user gestures — creating or choosing a learner — because
 * that is both the moment data worth keeping first exists and the context in
 * which browsers are most willing to grant.
 */
let asked = false;
export async function ensurePersisted(): Promise<PersistenceState> {
  if (!navigator.storage?.persist) {
    set("unsupported");
    return "unsupported";
  }
  if ((await refreshPersistenceState()) === "granted") return "granted";
  if (asked) return current;
  asked = true;

  try {
    set((await navigator.storage.persist()) ? "granted" : "denied");
  } catch {
    set("denied");
  }
  return current;
}
