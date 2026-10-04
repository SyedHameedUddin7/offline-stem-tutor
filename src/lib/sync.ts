import { db } from "./db";
import {
  bankItemPayloadSchema,
  flagCreatedPayloadSchema,
  flagResolvedPayloadSchema,
  learnerUpsertedPayloadSchema,
  syncBundleSchema,
} from "../schemas";
import { safeParseOne } from "./safeRead";
import type {
  FlaggedItem,
  Learner,
  MergeReport,
  ReasoningItem,
  SyncBundle,
  SyncEvent,
  SyncEventType,
} from "../types";

/**
 * Pod-to-pod synchronisation.
 *
 * The shape of the problem, which determines the shape of the solution: two
 * phones in a pod may both have been offline for a week. Both have moved on.
 * There is no "current state" for them to agree on — only two sets of things
 * that happened. So the unit of transfer is an append-only LOG of facts, not
 * a snapshot of tables.
 *
 * What is deliberately NOT here: a network transport. The hard part of sync
 * is the merge, and the merge is transport-agnostic — see `importBundle`.
 * What exists today is a file bundle a facilitator can carry between devices,
 * which needs no server, no signalling and no connectivity at all. A cloud
 * endpoint or a WebRTC channel would be another caller of the same two
 * functions; see the note at the bottom of this file.
 *
 * Three properties the merge is built to guarantee, each with a test:
 *
 *  1. IDEMPOTENT. Importing the same bundle twice changes nothing. Event ids
 *     are `deviceId:seq`, so a duplicate is detectable without comparing
 *     payloads.
 *
 *  2. CONVERGENT. Two devices that exchange logs in either order end up
 *     agreeing, because every conflict is resolved by a rule that does not
 *     depend on arrival order.
 *
 *  3. NON-DESTRUCTIVE. A merge never deletes local work. The worst case is
 *     that an incoming opinion is recorded but not adopted.
 */

const DEVICE_ID_KEY = "sync:deviceId";
const SEQ_KEY = "sync:seq";

/* ------------------------------------------------------------------ *
 * Device identity
 * ------------------------------------------------------------------ */

/**
 * A stable id for this device.
 *
 * Random, not derived from anything about the hardware or the user: it only
 * needs to be unique and stable, and a fingerprint would be both weaker and a
 * privacy problem.
 *
 * Deliberately NOT memoised in a module variable, which is how I first wrote
 * it. A cached id can outlive the row it came from — a facilitator clearing
 * the app's site data with the page still open leaves the memo holding an
 * identity that is no longer recorded anywhere, and every event logged
 * afterwards gets attributed to a device that, as far as storage is
 * concerned, does not exist. The read is a primary-key lookup on a table
 * with a handful of rows, next to the two writes that every `record` already
 * does; the saving was never worth the inconsistency.
 */
export async function getDeviceId(): Promise<string> {
  const row = await db.appSettings.get(DEVICE_ID_KEY);
  if (row) return row.value as string;

  const id = crypto.randomUUID();
  await db.appSettings.put({ key: DEVICE_ID_KEY, value: id });
  return id;
}

/** Short form for the UI — a facilitator needs to tell two phones apart. */
export function shortDeviceId(deviceId: string): string {
  return deviceId.slice(0, 8);
}

async function nextSeq(): Promise<number> {
  const row = await db.appSettings.get(SEQ_KEY);
  const next = ((row?.value as number) ?? 0) + 1;
  await db.appSettings.put({ key: SEQ_KEY, value: next });
  return next;
}

/* ------------------------------------------------------------------ *
 * Recording
 * ------------------------------------------------------------------ */

async function record(
  type: SyncEventType,
  entityId: string,
  payload: unknown
): Promise<SyncEvent> {
  const deviceId = await getDeviceId();
  const seq = await nextSeq();
  const event: SyncEvent = {
    id: `${deviceId}:${seq}`,
    deviceId,
    seq,
    type,
    entityId,
    payload,
    createdAt: Date.now(),
  };
  await db.syncEvents.put(event);
  return event;
}

/**
 * Only the name travels, not the conversation history.
 *
 * A flag arriving on the facilitator's phone needs a name on it or the review
 * is useless for following up. The student's chat log is not needed for that
 * and so is not sent — the least that makes the feature work.
 */
export async function logLearner(learner: Learner): Promise<void> {
  await record("learner.upserted", learner.id, {
    id: learner.id,
    name: learner.name,
    colorIndex: learner.colorIndex,
    createdAt: learner.createdAt,
  });
}

export async function logFlagCreated(flag: FlaggedItem): Promise<void> {
  await record("flag.created", flag.id, flag);
}

export async function logFlagResolved(flag: FlaggedItem): Promise<void> {
  await record("flag.resolved", flag.id, {
    id: flag.id,
    teacherStatus: flag.teacherStatus,
    correction: flag.correction,
    promotedItemId: flag.promotedItemId,
  });
}

/**
 * A teacher-authored exemplar crossing to another device. The flywheel.
 *
 * The embedding is stripped deliberately. It would be ~3KB of floats per
 * item, and worse, it would be a vector from THIS device's embedder — which
 * the receiving device may not be running. Sending the text and re-embedding
 * on arrival is smaller and cannot produce the silent mismatch where two
 * models' vectors compare without erroring and return nonsense.
 */
export async function logBankItem(item: ReasoningItem): Promise<void> {
  const { embedding: _embedding, embeddingModel: _embeddingModel, ...portable } = item;
  await record("bank.item", item.id, portable);
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

export async function pendingEventCount(): Promise<number> {
  return db.syncEvents.filter((e) => !e.exportedAt).count();
}

/**
 * Package events for transfer.
 *
 * `all` exports the whole log rather than only unsent events — the right
 * default when seeding a brand-new device, or recovering one that was wiped.
 */
export async function exportBundle(all = false): Promise<SyncBundle> {
  const deviceId = await getDeviceId();
  const events = all
    ? await db.syncEvents.orderBy("createdAt").toArray()
    : await db.syncEvents.filter((e) => !e.exportedAt).toArray();

  const now = Date.now();
  // Marked after collection, so a failed transfer does not lose events: the
  // flag means "has been packaged", and `all` can always re-send anyway.
  await db.transaction("rw", db.syncEvents, async () => {
    await Promise.all(events.map((e) => db.syncEvents.update(e.id, { exportedAt: now })));
  });

  return { formatVersion: 1, deviceId, createdAt: now, events };
}

export function bundleFilename(bundle: SyncBundle): string {
  const date = new Date(bundle.createdAt).toISOString().slice(0, 10);
  return `pod-sync-${shortDeviceId(bundle.deviceId)}-${date}.json`;
}

/* ------------------------------------------------------------------ *
 * Merge
 * ------------------------------------------------------------------ */

/** Semantic ranking of review outcomes. Higher wins a conflict. */
const STATUS_RANK = { pending: 0, approved: 1, corrected: 2 } as const;

/**
 * Decide between two opinions about the same flag.
 *
 * Domain-aware rather than purely last-write-wins, because wall clocks on
 * offline pod devices are not trustworthy enough to arbitrate on their own.
 *
 * A correction outranks an approval regardless of timestamps: it carries
 * strictly more information — someone wrote out the right answer — and a
 * facilitator who corrects an item after another approved it has not made a
 * concurrent edit, they have done more work.
 *
 * Equal rank falls back to wall clock, and then to a lexicographic device-id
 * comparison. That last tiebreak looks arbitrary because it is; its purpose is
 * that it is the SAME arbitrary answer on every device, so two phones that
 * exchange logs in opposite orders still converge.
 */
export function resolveFlagConflict(
  local: { teacherStatus: keyof typeof STATUS_RANK; timestamp: number; deviceId?: string },
  incoming: { teacherStatus: keyof typeof STATUS_RANK; timestamp: number; deviceId?: string }
): "local" | "incoming" {
  const localRank = STATUS_RANK[local.teacherStatus] ?? 0;
  const incomingRank = STATUS_RANK[incoming.teacherStatus] ?? 0;
  if (incomingRank !== localRank) return incomingRank > localRank ? "incoming" : "local";
  if (incoming.timestamp !== local.timestamp) {
    return incoming.timestamp > local.timestamp ? "incoming" : "local";
  }
  return (incoming.deviceId ?? "") > (local.deviceId ?? "") ? "incoming" : "local";
}

/**
 * Apply a bundle from another device.
 *
 * Transport-agnostic on purpose: this takes a parsed bundle, so a file, an
 * HTTP response and a WebRTC data channel are all the same thing from here.
 */
export async function importBundle(input: unknown): Promise<MergeReport> {
  // The one genuinely foreign input in the app: a file from another device,
  // possibly another version, possibly hand-edited. Validated as a whole
  // before anything is written, so a malformed bundle is refused with a
  // readable message rather than half-applied.
  const parsed = syncBundleSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.join(".") || "bundle";
    throw new Error(`This file is not a valid sync bundle (${where}: ${issue.message})`);
  }
  const bundle = parsed.data;

  const myDeviceId = await getDeviceId();
  const report: MergeReport = {
    received: bundle.events.length,
    duplicates: 0,
    applied: 0,
    superseded: 0,
    needsIndexing: 0,
  };

  // Deterministic order, so two devices applying the same set converge even
  // if the bundles arrived in a different order.
  const ordered = [...bundle.events].sort((a, b) =>
    a.createdAt !== b.createdAt
      ? a.createdAt - b.createdAt
      : a.deviceId !== b.deviceId
        ? a.deviceId.localeCompare(b.deviceId)
        : a.seq - b.seq
  );

  // Zod marks any key whose type includes `undefined` as optional, and
  // `unknown` does — so the inferred bundle type has `payload?: unknown`
  // while SyncEvent requires it. The data has been validated; this is an
  // inference quirk, not a missing check.
  for (const event of ordered as SyncEvent[]) {
    // Our own events coming back to us: already applied by definition.
    if (event.deviceId === myDeviceId) {
      report.duplicates++;
      continue;
    }
    if (await db.syncEvents.get(event.id)) {
      report.duplicates++;
      continue;
    }

    // The log is recorded even when the payload loses a conflict, so a later
    // merge cannot resurrect it and so the history stays auditable.
    await db.syncEvents.put({ ...event, exportedAt: Date.now() });

    const outcome = await applyEvent(event);
    if (outcome === "applied") report.applied++;
    else if (outcome === "superseded") report.superseded++;
    if (outcome === "applied" && event.type === "bank.item") report.needsIndexing++;
  }

  return report;
}

type Outcome = "applied" | "superseded" | "ignored";

async function applyEvent(event: SyncEvent): Promise<Outcome> {
  switch (event.type) {
    case "learner.upserted": {
      const incoming = safeParseOne(learnerUpsertedPayloadSchema, event.payload, "learner");
      if (!incoming) return "ignored";
      const existing = await db.learners.get(incoming.id);
      if (existing) return "superseded";
      // lastActiveAt is deliberately local: "when was this person last on
      // THIS phone" is not a fact another device can report.
      await db.learners.put({ ...incoming, lastActiveAt: 0 } as Learner);
      return "applied";
    }

    case "flag.created": {
      const incoming = safeParseOne(flagCreatedPayloadSchema, event.payload, "flag");
      if (!incoming) return "ignored";
      const existing = await db.flaggedItems.get(incoming.id);
      if (existing) return "superseded";
      await db.flaggedItems.put({ ...incoming, synced: true });
      return "applied";
    }

    case "flag.resolved": {
      const incoming = safeParseOne(flagResolvedPayloadSchema, event.payload, "resolution");
      if (!incoming) return "ignored";
      const existing = await db.flaggedItems.get(incoming.id);
      // A resolution for a flag this device has never seen: keep the event so
      // it applies if the flag itself arrives in a later bundle, but there is
      // nothing to update yet.
      if (!existing) return "ignored";

      const winner = resolveFlagConflict(
        { teacherStatus: existing.teacherStatus, timestamp: existing.timestamp },
        {
          teacherStatus: incoming.teacherStatus,
          timestamp: event.createdAt,
          deviceId: event.deviceId,
        }
      );
      if (winner === "local") return "superseded";

      await db.flaggedItems.update(incoming.id, {
        teacherStatus: incoming.teacherStatus,
        correction: incoming.correction,
        promotedItemId: incoming.promotedItemId,
        synced: true,
      });
      return "applied";
    }

    case "bank.item": {
      const incoming = safeParseOne(bankItemPayloadSchema, event.payload, "bank item");
      if (!incoming) return "ignored";
      const existing = await db.reasoningItems.get(incoming.id);
      if (existing) return "superseded";
      // No embedding and no model stamp, so indexAnswerBank() picks it up and
      // embeds it with whatever model THIS device runs.
      await db.reasoningItems.put({
        ...incoming,
        embedding: undefined,
        embeddingModel: undefined,
      });
      return "applied";
    }

    default:
      return "ignored";
  }
}

/**
 * Replay unresolved resolutions.
 *
 * Bundles can arrive out of order: a `flag.resolved` may land before the
 * `flag.created` it refers to. Rather than buffering, the resolution event is
 * stored and this pass re-applies any whose target now exists. Cheap, because
 * applying twice is idempotent.
 */
export async function replayOrphanedEvents(): Promise<number> {
  const myDeviceId = await getDeviceId();
  const resolutions = await db.syncEvents.where("type").equals("flag.resolved").toArray();
  let applied = 0;
  for (const event of resolutions) {
    if (event.deviceId === myDeviceId) continue;
    if ((await applyEvent(event)) === "applied") applied++;
  }
  return applied;
}

/*
 * Transports, present and absent.
 *
 * TODAY — file bundle. `exportBundle` produces JSON a facilitator saves and
 * carries to another phone; `importBundle` consumes it. No server, no
 * signalling, no connectivity. For a pod that loses signal for days this is
 * not a fallback, it is the primary path.
 *
 * NOT BUILT, and both would be callers of the same two functions:
 *
 *  - Local network, facilitator phone as hub. WebRTC needs signalling, which
 *    normally needs a server; on a shared Wi-Fi with no internet the usual
 *    answer is a manual SDP exchange over QR codes. Buildable, fiddly, and
 *    the merge above is the part it would depend on.
 *
 *  - Cloud endpoint, when a pod does get signal. The smallest honest version
 *    is a POST of unsent events and a GET of events since a cursor. Easy, and
 *    deliberately not the first transport built, because designing around it
 *    would have hidden the fact that the merge has to work without it.
 */
