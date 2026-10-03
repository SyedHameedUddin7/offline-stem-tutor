import { beforeEach, describe, expect, it, vi } from "vitest";
import { FAKE_MODEL_ID, dot, fakeEmbed, fakeEmbedOne } from "../test/fakeEmbedder";

vi.mock("./embeddings", () => ({
  EMBEDDING_MODEL_ID: FAKE_MODEL_ID,
  EMBEDDING_DIM: 96,
  embed: vi.fn(async (texts: string[]) => fakeEmbed(texts)),
  embedOne: vi.fn(async (text: string) => fakeEmbedOne(text)),
  cosineSimilarity: dot,
}));

const { db, seedReasoningBank } = await import("./db");
const sync = await import("./sync");
const { indexAnswerBank, retrieve } = await import("./retrieval");
const { resolveFlagConflict } = sync;

import type { FlaggedItem, Learner, ReasoningItem, SyncBundle } from "../types";

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
});

function learner(id: string, name: string): Learner {
  return { id, name, colorIndex: 0, createdAt: 1000, lastActiveAt: 5000 };
}

function flag(id: string, overrides: Partial<FlaggedItem> = {}): FlaggedItem {
  return {
    id,
    messageId: `m-${id}`,
    learnerId: "learner-1",
    subjectId: "mental-ability",
    chapterId: "ma-number-series",
    question: "A clock shows 3:15. What is the angle between the hands?",
    aiAnswer: "(a wrong answer)",
    teacherStatus: "pending",
    timestamp: 2000,
    synced: false,
    ...overrides,
  };
}

/** A bundle as it would arrive from another phone in the pod. */
function bundleFrom(deviceId: string, events: Array<Partial<SyncBundle["events"][0]>>): SyncBundle {
  return {
    formatVersion: 1,
    deviceId,
    createdAt: 9000,
    events: events.map((e, i) => ({
      id: `${deviceId}:${i + 1}`,
      deviceId,
      seq: i + 1,
      type: "flag.created",
      entityId: "x",
      payload: {},
      createdAt: 3000 + i,
      ...e,
    })) as SyncBundle["events"],
  };
}

describe("device identity", () => {
  it("is stable across calls", async () => {
    const first = await sync.getDeviceId();
    expect(await sync.getDeviceId()).toBe(first);
  });

  /**
   * Asserting the stored row rather than re-importing the module: what
   * matters is that the identity lives in the database and survives a
   * restart, not how the module happens to memoise it.
   */
  it("is persisted to the database, not held only in memory", async () => {
    const id = await sync.getDeviceId();
    db.close();
    await db.open();
    expect((await db.appSettings.get("sync:deviceId"))!.value).toBe(id);
  });
});

describe("recording", () => {
  it("gives every event a monotonically increasing sequence", async () => {
    await sync.logFlagCreated(flag("f1"));
    await sync.logFlagCreated(flag("f2"));
    await sync.logFlagCreated(flag("f3"));

    // Ordered by createdAt, which is the indexed key path the app itself
    // uses — `seq` is only indexed as part of [deviceId+seq].
    const events = await db.syncEvents.orderBy("createdAt").toArray();
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(new Set(events.map((e) => e.id)).size).toBe(3);
  });

  it("sends only a learner's name, never their conversation", async () => {
    await db.messages.add({
      id: "msg-private",
      learnerId: "learner-1",
      subjectId: "mathematics",
      chapterId: "math-linear-equations",
      role: "student",
      content: "something the student would not want shared",
      timestamp: 1,
      flagged: false,
      synced: false,
    });
    await sync.logLearner(learner("learner-1", "Awa"));

    const dumped = JSON.stringify(await db.syncEvents.toArray());
    expect(dumped).toContain("Awa");
    expect(dumped).not.toContain("something the student would not want shared");
  });

  /**
   * Vectors are ~3KB per item AND model-specific. Shipping one would risk the
   * silent failure where two embedders' output compares without erroring and
   * returns nonsense. Text travels; the receiving device embeds it itself.
   */
  it("strips embeddings from bank items", async () => {
    const item: ReasoningItem = {
      id: "teacher-1",
      chapterId: "ma-arrangements",
      question: "q",
      answer: "a",
      reasoning: "r",
      pattern: "teacher-authored correction",
      source: "teacher",
      embedding: new Array(96).fill(0.2),
      embeddingModel: FAKE_MODEL_ID,
    };
    await sync.logBankItem(item);

    const [event] = await db.syncEvents.toArray();
    const payload = event.payload as Record<string, unknown>;
    expect(payload.embedding).toBeUndefined();
    expect(payload.embeddingModel).toBeUndefined();
    expect(payload.reasoning).toBe("r");
  });
});

describe("export", () => {
  it("exports only unsent events by default, then nothing", async () => {
    await sync.logFlagCreated(flag("f1"));
    expect(await sync.pendingEventCount()).toBe(1);

    const first = await sync.exportBundle();
    expect(first.events).toHaveLength(1);
    expect(await sync.pendingEventCount()).toBe(0);

    const second = await sync.exportBundle();
    expect(second.events).toHaveLength(0);
  });

  it("can re-export everything, for seeding or recovering a device", async () => {
    await sync.logFlagCreated(flag("f1"));
    await sync.exportBundle();
    const full = await sync.exportBundle(true);
    expect(full.events).toHaveLength(1);
  });

  it("names the file after the device and date", async () => {
    const bundle = await sync.exportBundle();
    expect(sync.bundleFilename(bundle)).toMatch(/^pod-sync-[0-9a-f]{8}-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe("resolveFlagConflict", () => {
  /**
   * A correction outranks an approval regardless of clocks: it carries
   * strictly more information. A facilitator who corrects an item another
   * approved has not made a concurrent edit, they have done more work.
   */
  it("prefers a correction over an approval, even if older", () => {
    expect(
      resolveFlagConflict(
        { teacherStatus: "approved", timestamp: 9999 },
        { teacherStatus: "corrected", timestamp: 1 }
      )
    ).toBe("incoming");
  });

  it("prefers any resolution over pending", () => {
    expect(
      resolveFlagConflict(
        { teacherStatus: "pending", timestamp: 9999 },
        { teacherStatus: "approved", timestamp: 1 }
      )
    ).toBe("incoming");
  });

  it("falls back to the clock at equal rank", () => {
    expect(
      resolveFlagConflict(
        { teacherStatus: "approved", timestamp: 100 },
        { teacherStatus: "approved", timestamp: 200 }
      )
    ).toBe("incoming");
  });

  /**
   * The point of the device-id tiebreak is not that it picks the right
   * answer — it is that it picks the SAME answer on every device, so two
   * phones exchanging logs in opposite orders still converge.
   */
  it("breaks an exact tie deterministically, not by arrival order", () => {
    const a = { teacherStatus: "approved" as const, timestamp: 100, deviceId: "aaa" };
    const b = { teacherStatus: "approved" as const, timestamp: 100, deviceId: "bbb" };
    expect(resolveFlagConflict(a, b)).toBe("incoming");
    expect(resolveFlagConflict(b, a)).toBe("local");
  });
});

describe("importBundle", () => {
  it("applies a flag and its learner from another device", async () => {
    const incoming = bundleFrom("device-B", [
      { type: "learner.upserted", entityId: "learner-1", payload: learner("learner-1", "Awa") },
      { type: "flag.created", entityId: "f1", payload: flag("f1") },
    ]);

    const report = await sync.importBundle(incoming);
    expect(report.applied).toBe(2);
    expect((await db.learners.get("learner-1"))!.name).toBe("Awa");
    expect((await db.flaggedItems.get("f1"))!.question).toContain("3:15");
  });

  /** Property 1: importing the same bundle twice changes nothing. */
  it("is idempotent", async () => {
    const incoming = bundleFrom("device-B", [
      { type: "flag.created", entityId: "f1", payload: flag("f1") },
    ]);

    await sync.importBundle(incoming);
    const second = await sync.importBundle(incoming);

    expect(second.applied).toBe(0);
    expect(second.duplicates).toBe(1);
    expect(await db.flaggedItems.count()).toBe(1);
  });

  it("ignores its own events echoed back", async () => {
    await sync.logFlagCreated(flag("f1"));
    const mine = await sync.exportBundle(true);

    const report = await sync.importBundle(mine);
    expect(report.duplicates).toBe(mine.events.length);
    expect(report.applied).toBe(0);
  });

  it("rejects an unknown bundle format rather than guessing", async () => {
    await expect(
      sync.importBundle({ ...bundleFrom("device-B", []), formatVersion: 99 as never })
    ).rejects.toThrow(/format/i);
  });

  /** Property 3: a merge never destroys local work. */
  it("keeps the local resolution when the incoming one is weaker", async () => {
    await db.flaggedItems.put(flag("f1", { teacherStatus: "corrected", correction: "mine" }));

    await sync.importBundle(
      bundleFrom("device-B", [
        {
          type: "flag.resolved",
          entityId: "f1",
          payload: { id: "f1", teacherStatus: "approved" },
        },
      ])
    );

    const after = (await db.flaggedItems.get("f1"))!;
    expect(after.teacherStatus).toBe("corrected");
    expect(after.correction).toBe("mine");
  });

  it("adopts the incoming resolution when it carries more information", async () => {
    await db.flaggedItems.put(flag("f1", { teacherStatus: "approved" }));

    await sync.importBundle(
      bundleFrom("device-B", [
        {
          type: "flag.resolved",
          entityId: "f1",
          payload: { id: "f1", teacherStatus: "corrected", correction: "theirs" },
        },
      ])
    );

    const after = (await db.flaggedItems.get("f1"))!;
    expect(after.teacherStatus).toBe("corrected");
    expect(after.correction).toBe("theirs");
  });

  /**
   * Property 2: order independence. Bundles genuinely do arrive out of order
   * when a facilitator collects from three phones in whatever sequence.
   */
  it("converges when a resolution arrives before the flag it resolves", async () => {
    await sync.importBundle(
      bundleFrom("device-B", [
        {
          type: "flag.resolved",
          entityId: "f1",
          seq: 2,
          createdAt: 4000,
          payload: { id: "f1", teacherStatus: "corrected", correction: "theirs" },
        },
      ])
    );
    expect(await db.flaggedItems.get("f1")).toBeUndefined();

    await sync.importBundle(
      bundleFrom("device-C", [
        { type: "flag.created", entityId: "f1", payload: flag("f1") },
      ])
    );

    // The stored resolution is replayed now that its target exists.
    const replayed = await sync.replayOrphanedEvents();
    expect(replayed).toBe(1);
    expect((await db.flaggedItems.get("f1"))!.teacherStatus).toBe("corrected");
  });
});

/**
 * The whole point of the feature: a correction made on one phone becomes a
 * verified answer on another, with no server anywhere in the loop.
 */
describe("the flywheel across devices", () => {
  it("makes another device's correction retrievable here", async () => {
    await seedReasoningBank();
    await indexAnswerBank();

    const question = "A clock shows 3:15. What is the angle between the hands?";
    const before = await retrieve("ma-arrangements", question);
    expect(before.status).toBe("none");

    // A facilitator on another phone corrected this and exported.
    const correction =
      "The hour hand moves 0.5 degrees per minute. At 3:15 it is at 97.5 degrees " +
      "and the minute hand is at 90 degrees, so the angle between the hands is 7.5 degrees.";
    const report = await sync.importBundle(
      bundleFrom("device-B", [
        {
          type: "bank.item",
          entityId: "teacher-remote-1",
          payload: {
            id: "teacher-remote-1",
            chapterId: "ma-arrangements",
            question,
            answer: correction,
            reasoning: correction,
            pattern: "teacher-authored correction",
            source: "teacher",
          },
        },
      ])
    );

    expect(report.needsIndexing).toBe(1);

    // It arrives without a vector and is embedded by THIS device's model.
    const arrived = (await db.reasoningItems.get("teacher-remote-1"))!;
    expect(arrived.embedding).toBeUndefined();
    await indexAnswerBank();
    expect((await db.reasoningItems.get("teacher-remote-1"))!.embeddingModel).toBe(FAKE_MODEL_ID);

    const after = await retrieve("ma-arrangements", question);
    expect(after.status).toBe("grounded");
    expect(after.matches[0].item.id).toBe("teacher-remote-1");
    expect(after.matches[0].item.source).toBe("teacher");
  });
});
