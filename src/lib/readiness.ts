import { db } from "./db";
import { EMBEDDING_MODEL_ID } from "./embeddings";
import { MODELS, isModelCached } from "./llm";
import { LESSON_VIDEOS } from "../data/videos";
import { REASONING_BANK } from "../data/reasoningBank";
import { REFERENCE_NOTES } from "../data/referenceNotes";

/**
 * Is this device actually ready to go somewhere with no signal?
 *
 * The question a facilitator has to answer before putting ten phones in a bag
 * and driving out of coverage — and one the app could not answer before this
 * module. An online/offline pill tells you the state you are in; it says
 * nothing about whether the thing will still work in an hour.
 *
 * Every check here is a real measurement against storage, never an
 * assumption. "Probably cached" is the answer that gets a pod to a village
 * and leaves them with a blank screen.
 */

export type ReadinessLevel = "ready" | "partial" | "missing" | "unknown";

export interface ReadinessCheck {
  id:
    | "service-worker"
    | "persistent-storage"
    | "answer-bank"
    | "reference-notes"
    | "search-model"
    | "language-model"
    | "lesson-videos"
    | "storage-space";
  level: ReadinessLevel;
  /**
   * Required checks must pass for the app to work offline at all. The rest
   * improve it. Keeping the distinction means a facilitator is not told a
   * device is broken because it lacks a 1.6GB optional download.
   */
  required: boolean;
  /** Numbers for the UI to render; no prose here, so this stays localisable. */
  have?: number;
  need?: number;
  bytes?: number;
}

export interface ReadinessReport {
  checks: ReadinessCheck[];
  /** True when every REQUIRED check is ready. */
  readyForOffline: boolean;
}

/** Cache names are versioned/hashed, so match on a substring. */
async function cacheMatching(substring: string): Promise<Cache | null> {
  if (!("caches" in globalThis)) return null;
  const names = await caches.keys();
  const name = names.find((n) => n.includes(substring));
  return name ? caches.open(name) : null;
}

async function cacheHasUrlContaining(cacheSubstring: string, needle: string): Promise<boolean> {
  const cache = await cacheMatching(cacheSubstring);
  if (!cache) return false;
  const keys = await cache.keys();
  return keys.some((req) => req.url.includes(needle));
}

async function checkServiceWorker(): Promise<ReadinessCheck> {
  // Two separate facts, and both matter: a registration exists AND the
  // precache actually holds the shell. A registered worker with an empty
  // cache boots to nothing.
  if (!("serviceWorker" in navigator)) {
    return { id: "service-worker", level: "missing", required: true };
  }
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) {
    return { id: "service-worker", level: "missing", required: true };
  }
  const precache = await cacheMatching("workbox-precache");
  const entries = precache ? (await precache.keys()).length : 0;
  return {
    id: "service-worker",
    level: entries > 0 ? "ready" : "partial",
    required: true,
    have: entries,
  };
}

/**
 * Ask the browser not to evict this origin's data.
 *
 * The check nobody thinks of, and the one most likely to ruin a trip. Without
 * persistence granted, a browser under storage pressure may evict IndexedDB
 * and the Cache API — taking the model weights, the indexed answer bank and
 * every stored conversation with them. On a shared phone that is close to
 * full, that is not a hypothetical.
 */
async function checkPersistentStorage(): Promise<ReadinessCheck> {
  if (!navigator.storage?.persisted) {
    return { id: "persistent-storage", level: "unknown", required: false };
  }
  try {
    const granted = await navigator.storage.persisted();
    return {
      id: "persistent-storage",
      level: granted ? "ready" : "missing",
      required: false,
    };
  } catch {
    return { id: "persistent-storage", level: "unknown", required: false };
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Indexed means embedded WITH THE CURRENT MODEL.
 *
 * A row carrying a vector from a previous embedder is worse than one carrying
 * none: both models output 384 dimensions, so the stale vector compares
 * without erroring and returns nonsense. Counting it as ready would be the
 * exact failure this check exists to prevent.
 */
async function checkIndexed(
  id: "answer-bank" | "reference-notes",
  table: typeof db.reasoningItems | typeof db.referenceNotes,
  expected: number
): Promise<ReadinessCheck> {
  const indexed = await table
    .filter((row) => row.embeddingModel === EMBEDDING_MODEL_ID)
    .count();
  return {
    id,
    level: indexed === 0 ? "missing" : indexed >= expected ? "ready" : "partial",
    required: id === "answer-bank",
    have: indexed,
    need: expected,
  };
}

async function checkSearchModel(): Promise<ReadinessCheck> {
  // transformers.js keeps weights in its own Cache API store.
  const modelName = EMBEDDING_MODEL_ID.split("/").pop() ?? EMBEDDING_MODEL_ID;
  const cached =
    (await cacheHasUrlContaining("transformers", modelName)) ||
    (await cacheHasUrlContaining("transformers", EMBEDDING_MODEL_ID));
  return {
    id: "search-model",
    level: cached ? "ready" : "missing",
    // Required: without it the answer bank cannot be searched or re-indexed,
    // which takes Mental Ability down to the solver alone.
    required: true,
  };
}

async function checkLanguageModel(): Promise<ReadinessCheck> {
  const results = await Promise.all(MODELS.map((m) => isModelCached(m.id)));
  const cached = results.filter(Boolean).length;
  return {
    id: "language-model",
    level: cached > 0 ? "ready" : "missing",
    // Optional on purpose. Without it the solver and the answer bank still
    // work, which is the whole argument for having a ladder.
    required: false,
    have: cached,
    need: 1,
  };
}

async function checkVideos(): Promise<ReadinessCheck> {
  const cache = await cacheMatching("lesson-videos");
  if (!cache) {
    return { id: "lesson-videos", level: "missing", required: false, have: 0, need: LESSON_VIDEOS.length };
  }
  const keys = await cache.keys();
  const have = LESSON_VIDEOS.filter((v) => keys.some((k) => k.url.endsWith(v.url))).length;
  return {
    id: "lesson-videos",
    level: have === 0 ? "missing" : have >= LESSON_VIDEOS.length ? "ready" : "partial",
    required: false,
    have,
    need: LESSON_VIDEOS.length,
  };
}

async function checkStorageSpace(): Promise<ReadinessCheck> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate?.quota) return { id: "storage-space", level: "unknown", required: false };
    const free = (estimate.quota ?? 0) - (estimate.usage ?? 0);
    // Enough headroom for the larger model plus working space. Below that a
    // download will fail partway, which is worse than not offering it.
    const needed = 2_000 * 1024 * 1024;
    return {
      id: "storage-space",
      level: free >= needed ? "ready" : free > 0 ? "partial" : "missing",
      required: false,
      bytes: free,
    };
  } catch {
    return { id: "storage-space", level: "unknown", required: false };
  }
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const checks = await Promise.all([
    checkServiceWorker(),
    checkIndexed("answer-bank", db.reasoningItems, REASONING_BANK.length),
    checkSearchModel(),
    checkIndexed("reference-notes", db.referenceNotes, REFERENCE_NOTES.length),
    checkLanguageModel(),
    checkVideos(),
    checkPersistentStorage(),
    checkStorageSpace(),
  ]);

  return {
    checks,
    readyForOffline: checks.every((c) => !c.required || c.level === "ready"),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
