import { beforeEach, describe, expect, it, vi } from "vitest";
import { FAKE_MODEL_ID, dot, fakeEmbed, fakeEmbedOne } from "../test/fakeEmbedder";

vi.mock("./embeddings", () => ({
  EMBEDDING_MODEL_ID: FAKE_MODEL_ID,
  EMBEDDING_DIM: 96,
  embed: vi.fn(async (texts: string[]) => fakeEmbed(texts)),
  embedOne: vi.fn(async (text: string) => fakeEmbedOne(text)),
  cosineSimilarity: dot,
}));

const { db, seedReferenceNotes } = await import("./db");
const { formatNotes, indexReferenceNotes, retrieveNotes } = await import("./reference");

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
  await seedReferenceNotes();
  await indexReferenceNotes();
});

/**
 * The defining property of this module, as opposed to lib/retrieval.ts: it
 * INFORMS an answer rather than AUTHORISING one. A miss must degrade the
 * answer, never block it.
 */
describe("retrieveNotes", () => {
  it("finds the relevant note for a chapter question", async () => {
    const hits = await retrieveNotes(
      "phys-gravitation",
      "Why does a heavier object not fall faster than a lighter one?"
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].note.chapterId).toBe("phys-gravitation");
  });

  it("returns an empty list rather than throwing when nothing is relevant", async () => {
    const hits = await retrieveNotes("phys-gravitation", "zzzz qqqq wwww vvvv");
    expect(hits).toEqual([]);
  });

  it("never returns notes from another chapter", async () => {
    // Unlike the aptitude bank, a chapter here is a genuine topic boundary:
    // pulling electricity notes into a heat question makes the answer worse.
    const hits = await retrieveNotes("phys-heat", "What is the difference between heat and temperature?");
    expect(hits.every((h) => h.note.chapterId === "phys-heat")).toBe(true);
  });

  it("caps how much context it spends", async () => {
    const hits = await retrieveNotes("bio-cell", "What does the nucleus cytoplasm membrane mitochondria do?");
    expect(hits.length).toBeLessThanOrEqual(4);
  });

  it("stamps the embedding model so a swap re-indexes", async () => {
    const rows = await db.referenceNotes.toArray();
    expect(rows.every((r) => r.embeddingModel === FAKE_MODEL_ID)).toBe(true);
  });
});

describe("formatNotes", () => {
  it("is empty for no hits, so the prompt is unchanged", () => {
    expect(formatNotes([], "en")).toBe("");
  });

  it("puts misconceptions last, where a small model weights them most", async () => {
    const hits = await retrieveNotes("phys-work-energy", "Why is no work done holding a heavy bag still?");
    const formatted = formatNotes(hits, "en");
    const misconceptionAt = formatted.indexOf("COMMON MISTAKE TO AVOID");
    if (misconceptionAt === -1) return; // nothing to assert about ordering
    const others = ["DEFINITION", "FORMULA", "WORKED EXAMPLE"]
      .map((label) => formatted.indexOf(label))
      .filter((i) => i !== -1);
    for (const i of others) expect(i).toBeLessThan(misconceptionAt);
  });

  it("labels the material in the student's language", async () => {
    const hits = await retrieveNotes("phys-heat", "What is the difference between heat and temperature?");
    expect(formatNotes(hits, "en")).toContain("VERIFIED REFERENCE MATERIAL");
    expect(formatNotes(hits, "fr")).toContain("MATÉRIEL DE RÉFÉRENCE VÉRIFIÉ");
  });
});
