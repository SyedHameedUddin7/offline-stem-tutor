import { beforeEach, describe, expect, it } from "vitest";
import Dexie from "dexie";

const DB_NAME = "stem-offline-tutor";

beforeEach(async () => {
  await Dexie.delete(DB_NAME);
});

/**
 * The v5 upgrade adopts pre-profile conversations instead of deleting them.
 *
 * That choice is worth a test, because deleting would have been the easy
 * migration and the data belongs to a student. The v2 upgrade did clear
 * tables — defensible then, since the rows predated a chapter level and would
 * have rendered as orphans. Rows that only lack an owner are different: they
 * are complete, readable work, and discarding them to simplify a migration is
 * not a trade to make on someone else's behalf.
 */
describe("v5 learner migration", () => {
  async function openAtV4() {
    const legacy = new Dexie(DB_NAME);
    legacy.version(4).stores({
      messages: "id, subjectId, chapterId, timestamp, synced",
      flaggedItems: "id, subjectId, chapterId, teacherStatus, timestamp, synced",
      reasoningItems: "id, chapterId, source",
      referenceNotes: "id, chapterId, kind",
    });
    await legacy.open();
    return legacy;
  }

  it("adopts ownerless messages and flags into one labelled learner", async () => {
    const legacy = await openAtV4();
    await legacy.table("messages").add({
      id: "old-1",
      subjectId: "mathematics",
      chapterId: "math-linear-equations",
      role: "student",
      content: "Solve for x: 3x + 7 = 22",
      timestamp: 1000,
      flagged: false,
      synced: false,
    });
    await legacy.table("flaggedItems").add({
      id: "old-flag-1",
      messageId: "old-1",
      subjectId: "mathematics",
      chapterId: "math-linear-equations",
      question: "Solve for x: 3x + 7 = 22",
      aiAnswer: "(something wrong)",
      teacherStatus: "pending",
      timestamp: 1000,
      synced: false,
    });
    legacy.close();

    // Opening through the real schema runs the upgrade.
    const { db, LEGACY_LEARNER_ID } = await import("./db");
    await db.open();

    const message = await db.messages.get("old-1");
    expect(message, "the student's message survived").toBeDefined();
    expect(message!.learnerId).toBe(LEGACY_LEARNER_ID);
    expect(message!.content).toBe("Solve for x: 3x + 7 = 22");

    const flagged = await db.flaggedItems.get("old-flag-1");
    expect(flagged!.learnerId).toBe(LEGACY_LEARNER_ID);

    // The adopting profile exists and is named, so a facilitator seeing it in
    // the queue understands where it came from.
    const owner = await db.learners.get(LEGACY_LEARNER_ID);
    expect(owner).toBeDefined();
    expect(owner!.name).toBe("Earlier sessions");

    // And the adopted rows are reachable through the scoped read path.
    const scoped = await db.messages
      .where("[learnerId+chapterId]")
      .equals([LEGACY_LEARNER_ID, "math-linear-equations"])
      .toArray();
    expect(scoped).toHaveLength(1);

    db.close();
  });

  it("creates no placeholder learner when there is nothing to adopt", async () => {
    const legacy = await openAtV4();
    legacy.close();

    const { db } = await import("./db");
    await db.open();

    // A fresh install should not open onto a picker containing a profile
    // nobody created.
    expect(await db.learners.count()).toBe(0);
    db.close();
  });
});
