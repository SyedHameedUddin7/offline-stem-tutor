import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  clearActiveLearner,
  createLearner,
  deleteLearner,
  getActiveLearnerId,
  listLearners,
  resolveActiveLearner,
  setActiveLearnerId,
  touchLearner,
} from "./learners";
import type { ChatMessage, FlaggedItem } from "../types";

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
});

function message(learnerId: string, id: string): ChatMessage {
  return {
    id,
    learnerId,
    subjectId: "mathematics",
    chapterId: "math-linear-equations",
    role: "student",
    content: `question ${id}`,
    timestamp: Date.now(),
    flagged: false,
    synced: false,
  };
}

function flag(learnerId: string, id: string): FlaggedItem {
  return {
    id,
    messageId: `m-${id}`,
    learnerId,
    subjectId: "mathematics",
    chapterId: "math-linear-equations",
    question: "q",
    aiAnswer: "a",
    teacherStatus: "pending",
    timestamp: Date.now(),
    synced: false,
  };
}

describe("createLearner", () => {
  it("creates a learner with a trimmed name", async () => {
    const learner = await createLearner("  Awa  ");
    expect(learner.name).toBe("Awa");
    expect(await db.learners.count()).toBe(1);
  });

  it("rejects an empty name", async () => {
    await expect(createLearner("   ")).rejects.toThrow();
    expect(await db.learners.count()).toBe(0);
  });

  it("assigns rotating colours so profiles stay distinguishable", async () => {
    const names = ["Awa", "Mariam", "Ibrahim", "Fatou"];
    const made = [];
    for (const n of names) made.push(await createLearner(n));
    expect(new Set(made.slice(0, 4).map((l) => l.colorIndex)).size).toBe(4);
  });

  it("caps absurdly long names rather than storing them", async () => {
    const learner = await createLearner("x".repeat(200));
    expect(learner.name.length).toBe(40);
  });
});

describe("listLearners", () => {
  it("orders by most recently active", async () => {
    const a = await createLearner("Awa");
    await createLearner("Mariam");
    // Awa comes back to the device.
    await new Promise((r) => setTimeout(r, 2));
    await touchLearner(a.id);

    const listed = await listLearners();
    expect(listed[0].name).toBe("Awa");
  });
});

/**
 * The privacy property this whole feature exists for. Before profiles,
 * messages were keyed on chapter alone, so the next student to pick up the
 * phone saw the previous student's conversation.
 */
describe("learner isolation", () => {
  it("keeps each learner's messages separate on the same chapter", async () => {
    const awa = await createLearner("Awa");
    const ibrahim = await createLearner("Ibrahim");

    await db.messages.bulkAdd([
      message(awa.id, "a1"),
      message(awa.id, "a2"),
      message(ibrahim.id, "i1"),
    ]);

    const awaMessages = await db.messages
      .where("[learnerId+chapterId]")
      .equals([awa.id, "math-linear-equations"])
      .toArray();
    const ibrahimMessages = await db.messages
      .where("[learnerId+chapterId]")
      .equals([ibrahim.id, "math-linear-equations"])
      .toArray();

    expect(awaMessages.map((m) => m.id).sort()).toEqual(["a1", "a2"]);
    expect(ibrahimMessages.map((m) => m.id)).toEqual(["i1"]);
  });
});

describe("deleteLearner", () => {
  it("removes the learner and all of their work, leaving others untouched", async () => {
    const awa = await createLearner("Awa");
    const ibrahim = await createLearner("Ibrahim");

    await db.messages.bulkAdd([message(awa.id, "a1"), message(ibrahim.id, "i1")]);
    await db.flaggedItems.bulkAdd([flag(awa.id, "fa"), flag(ibrahim.id, "fi")]);

    await deleteLearner(awa.id);

    expect(await db.learners.get(awa.id)).toBeUndefined();
    expect(await db.messages.where("learnerId").equals(awa.id).count()).toBe(0);
    expect(await db.flaggedItems.where("learnerId").equals(awa.id).count()).toBe(0);

    // A student leaving the pod must not take anyone else's work with them.
    expect(await db.learners.get(ibrahim.id)).toBeDefined();
    expect(await db.messages.where("learnerId").equals(ibrahim.id).count()).toBe(1);
    expect(await db.flaggedItems.where("learnerId").equals(ibrahim.id).count()).toBe(1);
  });

  it("signs out if the deleted learner was the active one", async () => {
    const awa = await createLearner("Awa");
    setActiveLearnerId(awa.id);
    await deleteLearner(awa.id);
    expect(getActiveLearnerId()).toBeNull();
  });

  it("leaves the active learner alone when a different one is deleted", async () => {
    const awa = await createLearner("Awa");
    const other = await createLearner("Mariam");
    setActiveLearnerId(awa.id);
    await deleteLearner(other.id);
    expect(getActiveLearnerId()).toBe(awa.id);
  });
});

describe("resolveActiveLearner", () => {
  it("returns null when nobody has been chosen", async () => {
    expect(await resolveActiveLearner()).toBeNull();
  });

  it("returns the remembered learner", async () => {
    const awa = await createLearner("Awa");
    setActiveLearnerId(awa.id);
    expect((await resolveActiveLearner())?.id).toBe(awa.id);
  });

  /**
   * Falling through to the picker is the only safe behaviour here. Silently
   * adopting whichever profile happens to exist would hand one student
   * another's history.
   */
  it("clears a stale id and falls back to the picker", async () => {
    setActiveLearnerId("deleted-on-another-day");
    expect(await resolveActiveLearner()).toBeNull();
    expect(getActiveLearnerId()).toBeNull();
  });

  it("signing out does not delete anything", async () => {
    const awa = await createLearner("Awa");
    setActiveLearnerId(awa.id);
    await db.messages.add(message(awa.id, "a1"));

    clearActiveLearner();

    expect(getActiveLearnerId()).toBeNull();
    expect(await db.learners.get(awa.id)).toBeDefined();
    expect(await db.messages.where("learnerId").equals(awa.id).count()).toBe(1);
  });
});
