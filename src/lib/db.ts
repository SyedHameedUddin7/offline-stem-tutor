import Dexie, { type EntityTable } from "dexie";
import type {
  AppSetting,
  ChatMessage,
  FlaggedItem,
  Learner,
  ReasoningItem,
  ReferenceNote,
  SyncEvent,
} from "../types";
import { BANK_VERSION, REASONING_BANK } from "../data/reasoningBank";
import { NOTES_VERSION, REFERENCE_NOTES } from "../data/referenceNotes";

/**
 * Local-first persistence. This is the actual proof of "offline-first" as an
 * architecture rather than a feature: nothing in the app reads or writes
 * through a network call in order to function. Sync is a strictly optional,
 * additive step that runs only when connectivity returns.
 *
 * Three tables:
 *  - messages      chat history, per chapter
 *  - flaggedItems  answers awaiting a teacher
 *  - reasoningItems the answer bank — seed exemplars plus, crucially,
 *                  teacher-authored ones promoted from corrections. This is
 *                  the table that makes the correction loop a flywheel.
 */
class TutorDB extends Dexie {
  messages!: EntityTable<ChatMessage, "id">;
  flaggedItems!: EntityTable<FlaggedItem, "id">;
  reasoningItems!: EntityTable<ReasoningItem, "id">;
  referenceNotes!: EntityTable<ReferenceNote, "id">;
  learners!: EntityTable<Learner, "id">;
  appSettings!: EntityTable<AppSetting, "key">;
  syncEvents!: EntityTable<SyncEvent, "id">;

  constructor() {
    super("stem-offline-tutor");

    this.version(1).stores({
      messages: "id, subjectId, timestamp, synced",
      flaggedItems: "id, subjectId, teacherStatus, synced",
    });

    // v2: curriculum gained a chapter level, and the answer bank arrived.
    // The v1 rows predate chapterId and would render as orphans, so they are
    // dropped rather than migrated — there is no real user data to preserve.
    this.version(2)
      .stores({
        messages: "id, subjectId, chapterId, timestamp, synced",
        flaggedItems: "id, subjectId, chapterId, teacherStatus, synced",
        reasoningItems: "id, chapterId, source",
      })
      .upgrade(async (tx) => {
        await tx.table("messages").clear();
        await tx.table("flaggedItems").clear();
      });

    // v3: `timestamp` was never indexed on flaggedItems, but the teacher
    // panel orders by it. Dexie throws on orderBy against an unindexed key
    // path, which took the whole view down with it. Schema-only change —
    // Dexie rebuilds the index, no data migration needed.
    this.version(3).stores({
      messages: "id, subjectId, chapterId, timestamp, synced",
      flaggedItems: "id, subjectId, chapterId, teacherStatus, timestamp, synced",
      reasoningItems: "id, chapterId, source",
    });

    // v4: reference notes for the generative subjects. A separate table from
    // reasoningItems on purpose — the two differ in AUTHORITY, not in shape,
    // and keeping them apart makes it impossible to accidentally let a
    // physics note authorise an aptitude answer.
    this.version(4).stores({
      messages: "id, subjectId, chapterId, timestamp, synced",
      flaggedItems: "id, subjectId, chapterId, teacherStatus, timestamp, synced",
      reasoningItems: "id, chapterId, source",
      referenceNotes: "id, chapterId, kind",
    });

    // v5: learners, because the device is shared.
    //
    // The compound [learnerId+chapterId] index is the one that matters: it
    // makes the scoped read a single index lookup rather than fetching a
    // chapter's whole history and filtering in JS. On a phone with a term's
    // worth of conversations that difference is felt.
    this.version(5)
      .stores({
        learners: "id, name, lastActiveAt",
        messages:
          "id, learnerId, subjectId, chapterId, timestamp, synced, [learnerId+chapterId]",
        flaggedItems:
          "id, learnerId, subjectId, chapterId, teacherStatus, timestamp, synced",
        reasoningItems: "id, chapterId, source",
        referenceNotes: "id, chapterId, kind",
      })
      .upgrade(async (tx) => {
        // Existing rows predate profiles and have no owner. Adopting them
        // into one clearly-labelled learner rather than deleting them: this
        // is a student's work, and silently discarding it to simplify a
        // migration is not a trade I get to make on their behalf.
        const messages = tx.table<ChatMessage>("messages");
        const flagged = tx.table<FlaggedItem>("flaggedItems");
        const orphans = await messages.filter((m) => !m.learnerId).count();
        const orphanFlags = await flagged.filter((f) => !f.learnerId).count();
        if (orphans === 0 && orphanFlags === 0) return;

        const now = Date.now();
        const legacy: Learner = {
          id: LEGACY_LEARNER_ID,
          name: "Earlier sessions",
          colorIndex: 0,
          createdAt: now,
          lastActiveAt: now,
        };
        await tx.table<Learner>("learners").put(legacy);
        await messages.filter((m) => !m.learnerId).modify({ learnerId: LEGACY_LEARNER_ID });
        await flagged.filter((f) => !f.learnerId).modify({ learnerId: LEGACY_LEARNER_ID });
      });

    // v6: a small key-value store for device-level settings.
    //
    // The facilitator PIN lives here rather than in localStorage because the
    // lockout counter has to live with it: a counter a student can clear by
    // opening one devtools tab and calling localStorage.clear() is not a
    // counter. IndexedDB is not immune either, but it raises the effort, and
    // keeping both values in one transaction means they cannot drift apart.
    this.version(6).stores({
      learners: "id, name, lastActiveAt",
      messages:
        "id, learnerId, subjectId, chapterId, timestamp, synced, [learnerId+chapterId]",
      flaggedItems:
        "id, learnerId, subjectId, chapterId, teacherStatus, timestamp, synced",
      reasoningItems: "id, chapterId, source",
      referenceNotes: "id, chapterId, kind",
      appSettings: "key",
    });

    // v7: the sync log.
    //
    // `[deviceId+seq]` is the index that makes "what has this device not sent
    // yet" and "what is the next sequence number" single lookups. `exportedAt`
    // is indexed because the common query is "everything not yet exported".
    this.version(7).stores({
      learners: "id, name, lastActiveAt",
      messages:
        "id, learnerId, subjectId, chapterId, timestamp, synced, [learnerId+chapterId]",
      flaggedItems:
        "id, learnerId, subjectId, chapterId, teacherStatus, timestamp, synced",
      reasoningItems: "id, chapterId, source",
      referenceNotes: "id, chapterId, kind",
      appSettings: "key",
      syncEvents: "id, deviceId, type, entityId, createdAt, exportedAt, [deviceId+seq]",
    });
  }
}

/**
 * Owner assigned to conversations that predate profiles. Named rather than
 * anonymous so a facilitator seeing it in the queue understands why.
 */
export const LEGACY_LEARNER_ID = "learner-legacy";

export const db = new TutorDB();

const BANK_VERSION_KEY = "stem-tutor:bank-version";

/**
 * Copy the seed bank into IndexedDB.
 *
 * Two modes, and the distinction matters:
 *
 *  - Same version: purely additive. Only missing ids are inserted, so we
 *    never discard a cached embedding — recomputing the whole corpus is
 *    genuinely slow on a low-end phone.
 *
 *  - Version bumped: seed rows are replaced wholesale, because seed ids are
 *    positional and an edit upstream can re-point them. Teacher-authored
 *    rows (`source: "teacher"`) survive either way. They are the only rows
 *    in this table that cannot be regenerated from the bundle.
 */
export async function seedReasoningBank(): Promise<void> {
  const stored = Number(localStorage.getItem(BANK_VERSION_KEY));
  const stale = stored !== BANK_VERSION;

  if (stale) {
    await db.reasoningItems.where("source").equals("seed").delete();
    await db.reasoningItems.bulkPut(REASONING_BANK);
    localStorage.setItem(BANK_VERSION_KEY, String(BANK_VERSION));
    return;
  }

  const existingIds = new Set(await db.reasoningItems.toCollection().primaryKeys());
  const missing = REASONING_BANK.filter((item) => !existingIds.has(item.id));
  if (missing.length > 0) {
    await db.reasoningItems.bulkAdd(missing);
  }
}

const NOTES_VERSION_KEY = "stem-tutor:notes-version";

/**
 * Copy the reference notes into IndexedDB.
 *
 * Simpler than the reasoning bank's seeding because there is nothing
 * irreplaceable here: every note comes from the bundle, so a version bump can
 * replace the lot. Embeddings are the only thing worth preserving, which is
 * why the same-version path stays additive.
 */
export async function seedReferenceNotes(): Promise<void> {
  const stored = Number(localStorage.getItem(NOTES_VERSION_KEY));

  if (stored !== NOTES_VERSION) {
    await db.referenceNotes.clear();
    await db.referenceNotes.bulkPut(REFERENCE_NOTES);
    localStorage.setItem(NOTES_VERSION_KEY, String(NOTES_VERSION));
    return;
  }

  const existingIds = new Set(await db.referenceNotes.toCollection().primaryKeys());
  const missing = REFERENCE_NOTES.filter((n) => !existingIds.has(n.id));
  if (missing.length > 0) await db.referenceNotes.bulkAdd(missing);
}
