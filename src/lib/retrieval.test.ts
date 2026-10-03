import { beforeEach, describe, expect, it, vi } from "vitest";
import { FAKE_MODEL_ID, dot, fakeEmbed, fakeEmbedOne } from "../test/fakeEmbedder";

// Must be mocked before the modules under test are imported.
vi.mock("./embeddings", () => ({
  EMBEDDING_MODEL_ID: FAKE_MODEL_ID,
  EMBEDDING_DIM: 96,
  embed: vi.fn(async (texts: string[]) => fakeEmbed(texts)),
  embedOne: vi.fn(async (text: string) => fakeEmbedOne(text)),
  cosineSimilarity: dot,
}));

const { db, seedReasoningBank } = await import("./db");
const { indexAnswerBank, promoteCorrectionToBank, retrieve } = await import("./retrieval");
const { REASONING_BANK } = await import("../data/reasoningBank");

async function reset() {
  await db.delete();
  await db.open();
  localStorage.clear();
  await seedReasoningBank();
}

describe("answer bank indexing", () => {
  beforeEach(reset);

  it("seeds the whole bank", async () => {
    expect(await db.reasoningItems.count()).toBe(REASONING_BANK.length);
  });

  it("embeds every row and stamps the model that produced it", async () => {
    await indexAnswerBank();
    const rows = await db.reasoningItems.toArray();
    expect(rows.every((r) => Array.isArray(r.embedding))).toBe(true);
    expect(rows.every((r) => r.embeddingModel === FAKE_MODEL_ID)).toBe(true);
  });

  /**
   * The bug this guards against is silent rather than loud: both embedders
   * output the same number of dimensions, so a vector from the old model
   * compares against a new one without throwing — it just returns
   * meaningless similarities.
   */
  it("re-indexes rows embedded by a different model", async () => {
    await indexAnswerBank();
    const victim = (await db.reasoningItems.toCollection().first())!;
    await db.reasoningItems.update(victim.id, {
      embedding: new Array(96).fill(0.1),
      embeddingModel: "some/older-model",
    });

    await indexAnswerBank();

    const refreshed = (await db.reasoningItems.get(victim.id))!;
    expect(refreshed.embeddingModel).toBe(FAKE_MODEL_ID);
    expect(refreshed.embedding).not.toEqual(new Array(96).fill(0.1));
  });

  it("leaves already-current embeddings alone", async () => {
    await indexAnswerBank();
    const before = (await db.reasoningItems.toCollection().first())!.embedding;
    await indexAnswerBank();
    const after = (await db.reasoningItems.toCollection().first())!.embedding;
    expect(after).toEqual(before);
  });
});

describe("retrieve", () => {
  beforeEach(async () => {
    await reset();
    await indexAnswerBank();
  });

  it("grounds a question that matches a verified exemplar", async () => {
    const g = await retrieve(
      "ma-blood-relations",
      "A is B's sister. C is B's mother. D is C's father. How is A related to D?"
    );
    expect(g.status).toBe("grounded");
    expect(g.matches[0].item.chapterId).toBe("ma-blood-relations");
    expect(g.inContext).toBe(true);
  });

  /**
   * The negative anchors are built from the other subjects' sample problems,
   * so a question lifted straight out of Mathematics must be refused even
   * though it is being asked inside Mental Ability.
   */
  it("refuses a question that belongs to another subject", async () => {
    const g = await retrieve(
      "ma-number-series",
      "Find the area of a circle with radius 7 cm (use 22/7)."
    );
    expect(g.status).toBe("none");
    expect(g.margin).toBeLessThan(0);
  });

  it("reports when the best match came from another chapter", async () => {
    // Asked while sitting in Number Series, but it is a seating puzzle.
    const g = await retrieve(
      "ma-number-series",
      "In a row of 40 students, Rahul is 12th from the left. What is his position from the right?"
    );
    expect(g.matches[0].item.chapterId).toBe("ma-arrangements");
    expect(g.inContext).toBe(false);
  });

  it("searches the whole subject, not only the open chapter", async () => {
    const g = await retrieve("ma-analogies", "Doctor : Hospital :: Teacher : ?");
    expect(g.matches.length).toBeGreaterThan(0);
    expect(g.status).toBe("grounded");
  });

  it("ranks matches by descending score", async () => {
    const g = await retrieve("ma-syllogisms", "All cats are animals. All animals need food.");
    const scores = g.matches.map((m) => m.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  /**
   * Seeding runs once on mount and only logs on failure, which used to leave
   * every later question unanswerable with no recovery short of clearing site
   * data. Retrieval needs the rows, so retrieval makes sure they exist.
   */
  it("re-seeds and re-indexes an empty table instead of failing", async () => {
    await db.reasoningItems.clear();
    expect(await db.reasoningItems.count()).toBe(0);

    const g = await retrieve(
      "ma-blood-relations",
      "A is B's sister. C is B's mother. D is C's father. How is A related to D?"
    );

    expect(await db.reasoningItems.count()).toBe(REASONING_BANK.length);
    expect(g.status).toBe("grounded");
  });

  it("reports unindexed, not none, when nothing is searchable", async () => {
    // Rows present but no vectors: the corpus cannot be searched, which is a
    // different failure from searching and finding nothing. Conflating the
    // two told students "no verified method" when the truth was "no index".
    await db.reasoningItems.toCollection().modify({
      embedding: undefined,
      embeddingModel: undefined,
    });
    vi.spyOn(db.reasoningItems, "filter").mockReturnValueOnce({
      toArray: async () => [],
    } as never);

    const g = await retrieve("ma-number-series", "2, 6, 12, 20, 30, ?");
    expect(g.status).toBe("unindexed");
    expect(g.bankSize).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });
});

/**
 * The flywheel, end to end: a teacher's correction becomes a retrievable
 * exemplar for the next student, with no server involved.
 */
describe("teacher correction flywheel", () => {
  beforeEach(async () => {
    await reset();
    await indexAnswerBank();
  });

  it("makes a correction retrievable for a later, similar question", async () => {
    const question = "A clock shows 3:15. What is the angle between the hands?";

    // Nothing in the seed bank covers clock angles.
    const before = await retrieve("ma-arrangements", question);
    expect(before.status).toBe("none");

    const flagged = {
      id: "flag-1",
      messageId: "msg-1",
      learnerId: "l-1",
      subjectId: "mental-ability" as const,
      chapterId: "ma-arrangements",
      question,
      aiAnswer: "(a wrong answer)",
      teacherStatus: "pending" as const,
      timestamp: Date.now(),
      synced: false,
    };
    await db.flaggedItems.add(flagged);

    const correction =
      "The hour hand moves 0.5 degrees per minute. At 3:15 it is at 97.5 degrees " +
      "and the minute hand is at 90 degrees, so the angle between the hands is 7.5 degrees.";
    const promoted = await promoteCorrectionToBank(flagged, correction);

    expect(promoted.source).toBe("teacher");
    expect(promoted.embeddingModel).toBe(FAKE_MODEL_ID);

    // The flag now records that the loop closed.
    expect((await db.flaggedItems.get("flag-1"))!.promotedItemId).toBe(promoted.id);

    // And the next student asking the same thing gets the teacher's answer.
    const after = await retrieve("ma-arrangements", question);
    expect(after.status).toBe("grounded");
    expect(after.matches[0].item.id).toBe(promoted.id);
    expect(after.matches[0].item.answer).toBe(correction);
  });

  it("keeps teacher items when the seed bank is re-versioned", async () => {
    const flagged = {
      id: "flag-2",
      messageId: "msg-2",
      learnerId: "l-1",
      subjectId: "mental-ability" as const,
      chapterId: "ma-analogies",
      question: "Hammer : Nail :: Screwdriver : ?",
      aiAnswer: "(wrong)",
      teacherStatus: "pending" as const,
      timestamp: Date.now(),
      synced: false,
    };
    await db.flaggedItems.add(flagged);
    const promoted = await promoteCorrectionToBank(flagged, "Screw.");

    // Simulate a content update shipping a new bank version.
    localStorage.setItem("stem-tutor:bank-version", "-1");
    await seedReasoningBank();

    // Seeds replaced; the teacher's work survives, because it is the only
    // thing in this table that cannot be regenerated from the bundle.
    expect(await db.reasoningItems.get(promoted.id)).toBeDefined();
    expect(await db.reasoningItems.where("source").equals("seed").count()).toBe(
      REASONING_BANK.length
    );
  });
});
