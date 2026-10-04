import { describe, expect, it, vi } from "vitest";
import { safeParseAll, safeParseOne } from "../lib/safeRead";
import {
  chatMessageSchema,
  flaggedItemSchema,
  learnerSchema,
  reasoningItemSchema,
  syncBundleSchema,
} from "./index";

const validLearner = {
  id: "l1",
  name: "Awa",
  colorIndex: 0,
  createdAt: 1,
  lastActiveAt: 2,
};

const validMessage = {
  id: "m1",
  learnerId: "l1",
  subjectId: "mathematics",
  chapterId: "math-linear-equations",
  role: "student",
  content: "Solve for x",
  timestamp: 100,
  flagged: false,
  synced: false,
};

describe("learnerSchema", () => {
  it("accepts a well-formed learner", () => {
    expect(learnerSchema.safeParse(validLearner).success).toBe(true);
  });

  it.each([
    ["missing id", { ...validLearner, id: undefined }],
    ["empty name", { ...validLearner, name: "" }],
    ["NaN timestamp", { ...validLearner, createdAt: NaN }],
    ["negative colour index", { ...validLearner, colorIndex: -1 }],
    ["not an object", "a string"],
    ["null", null],
  ])("rejects %s", (_label, input) => {
    expect(learnerSchema.safeParse(input).success).toBe(false);
  });
});

describe("chatMessageSchema", () => {
  it("accepts a well-formed message", () => {
    expect(chatMessageSchema.safeParse(validMessage).success).toBe(true);
  });

  it("rejects a message with no owner — the learner-isolation invariant", () => {
    const { learnerId: _omitted, ...orphan } = validMessage;
    expect(chatMessageSchema.safeParse(orphan).success).toBe(false);
  });

  it("rejects an unknown subject or role", () => {
    expect(chatMessageSchema.safeParse({ ...validMessage, subjectId: "chemistry" }).success).toBe(false);
    expect(chatMessageSchema.safeParse({ ...validMessage, role: "system" }).success).toBe(false);
  });

  it("accepts optional provenance fields but rejects wrong types", () => {
    expect(
      chatMessageSchema.safeParse({ ...validMessage, tier: "solver", confidence: "high", topScore: 0.8 })
        .success
    ).toBe(true);
    expect(chatMessageSchema.safeParse({ ...validMessage, tier: "magic" }).success).toBe(false);
  });
});

describe("reasoningItemSchema", () => {
  /**
   * A malformed row claiming an enormous vector should be refused rather
   * than loaded into memory and scored against on a low-end phone.
   */
  it("bounds the embedding length", () => {
    const base = {
      id: "r1",
      chapterId: "ma-number-series",
      question: "2, 4, 6, ?",
      answer: "8",
      reasoning: "add 2",
      pattern: "constant difference",
      source: "seed",
    };
    expect(reasoningItemSchema.safeParse({ ...base, embedding: new Array(384).fill(0) }).success).toBe(true);
    expect(reasoningItemSchema.safeParse({ ...base, embedding: new Array(99999).fill(0) }).success).toBe(false);
  });
});

describe("syncBundleSchema", () => {
  const event = {
    id: "dev:1",
    deviceId: "dev",
    seq: 1,
    type: "flag.created",
    entityId: "f1",
    payload: {},
    createdAt: 10,
  };

  it("accepts a well-formed bundle", () => {
    expect(
      syncBundleSchema.safeParse({ formatVersion: 1, deviceId: "dev", createdAt: 1, events: [event] })
        .success
    ).toBe(true);
  });

  it.each([
    ["an unknown format version", { formatVersion: 2, deviceId: "d", createdAt: 1, events: [] }],
    ["a missing device id", { formatVersion: 1, createdAt: 1, events: [] }],
    ["events that are not an array", { formatVersion: 1, deviceId: "d", createdAt: 1, events: {} }],
    ["an unknown event type", {
      formatVersion: 1, deviceId: "d", createdAt: 1,
      events: [{ ...event, type: "drop.everything" }],
    }],
    ["arbitrary JSON", { hello: "world" }],
    ["a string", "not a bundle"],
  ])("rejects %s", (_label, input) => {
    expect(syncBundleSchema.safeParse(input).success).toBe(false);
  });

  it("requires a payload key to be present", () => {
    const { payload: _omitted, ...noPayload } = event;
    expect(
      syncBundleSchema.safeParse({ formatVersion: 1, deviceId: "d", createdAt: 1, events: [noPayload] })
        .success
    ).toBe(false);
  });
});

/**
 * The property that matters most: a corrupt record costs that record, never
 * the whole query. Losing one message is recoverable; a blank chat history
 * or a crashed pane is not.
 */
describe("safeParseAll", () => {
  it("keeps the good rows and quarantines the bad ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = safeParseAll(
      chatMessageSchema,
      [validMessage, { ...validMessage, id: "m2", role: "nonsense" }, { ...validMessage, id: "m3" }],
      "message"
    );
    expect(result.valid.map((m) => m.id)).toEqual(["m1", "m3"]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].id).toBe("m2");
    expect(result.rejected[0].reason).toContain("role");
    warn.mockRestore();
  });

  it("survives rows that are not objects at all", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = safeParseAll(learnerSchema, [null, "x", 42, validLearner], "learner");
    expect(result.valid).toHaveLength(1);
    expect(result.rejected).toHaveLength(3);
    warn.mockRestore();
  });

  it("returns empty rather than throwing when everything is corrupt", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(safeParseAll(flaggedItemSchema, [{}, {}], "flag").valid).toEqual([]);
    warn.mockRestore();
  });

  it("logs once per read, not once per bad row", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    safeParseAll(learnerSchema, new Array(500).fill({}), "learner");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("safeParseOne", () => {
  it("returns the row when valid and null when not", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(safeParseOne(learnerSchema, validLearner, "learner")?.name).toBe("Awa");
    expect(safeParseOne(learnerSchema, { id: "x" }, "learner")).toBeNull();
    warn.mockRestore();
  });
});
