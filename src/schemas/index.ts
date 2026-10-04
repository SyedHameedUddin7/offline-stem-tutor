import { z } from "zod";

/**
 * Runtime schemas for data that crosses a trust boundary.
 *
 * Deliberately NOT a parallel copy of every TypeScript interface. A type is
 * a compile-time claim about data this code produced; a schema is a runtime
 * check on data it did not. The two are only worth coupling where something
 * outside the current build could have written the value:
 *
 *   - a sync bundle from another device (genuinely external input)
 *   - IndexedDB rows written by an older version of this app
 *   - localStorage values a user or extension could have edited
 *
 * Everything else — arguments between functions in the same module graph —
 * is left to the compiler, because validating it would add cost and catch
 * nothing the type system does not already catch.
 */

export const subjectIdSchema = z.enum([
  "mathematics",
  "physics",
  "biology",
  "mental-ability",
]);

export const engineTierSchema = z.enum([
  "solver",
  "webgpu-llm",
  "answer-bank",
  "unavailable",
]);

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const teacherStatusSchema = z.enum(["pending", "approved", "corrected"]);

export const learnerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  colorIndex: z.number().int().nonnegative(),
  createdAt: z.number().finite(),
  lastActiveAt: z.number().finite(),
});

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  subjectId: subjectIdSchema,
  chapterId: z.string().min(1),
  role: z.enum(["student", "tutor"]),
  content: z.string(),
  timestamp: z.number().finite(),
  confidence: confidenceSchema.optional(),
  tier: engineTierSchema.optional(),
  citations: z.array(z.string()).optional(),
  verification: z.enum(["passed", "failed", "unverifiable"]).optional(),
  verificationNotes: z.array(z.string()).optional(),
  topScore: z.number().finite().optional(),
  flagged: z.boolean(),
  synced: z.boolean(),
});

export const flaggedItemSchema = z.object({
  id: z.string().min(1),
  messageId: z.string().min(1),
  learnerId: z.string().min(1),
  subjectId: subjectIdSchema,
  chapterId: z.string().min(1),
  question: z.string(),
  aiAnswer: z.string(),
  teacherStatus: teacherStatusSchema,
  correction: z.string().optional(),
  timestamp: z.number().finite(),
  synced: z.boolean(),
  promotedItemId: z.string().optional(),
});

export const reasoningItemSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  question: z.string().min(1),
  answer: z.string(),
  reasoning: z.string(),
  pattern: z.string(),
  source: z.enum(["seed", "teacher"]),
  // Vectors are bounded: a malformed row claiming a million floats should be
  // rejected rather than loaded into memory and scored against.
  embedding: z.array(z.number().finite()).max(4096).optional(),
  embeddingModel: z.string().optional(),
});

export const syncEventSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  seq: z.number().int().nonnegative(),
  type: z.enum(["learner.upserted", "flag.created", "flag.resolved", "bank.item"]),
  entityId: z.string().min(1),
  // Required, but of any shape. Two subtleties, both caught by tests:
  // z.unknown() infers an OPTIONAL property, and a z.custom validator that
  // always returns true still accepts a missing key — so the predicate has
  // to reject `undefined` explicitly. The per-type payload schemas below do
  // the real checking once the event type is known.
  payload: z.custom<unknown>((value) => value !== undefined, {
    message: "payload is required",
  }),
  createdAt: z.number().finite(),
  exportedAt: z.number().finite().optional(),
});

/**
 * The one piece of genuinely foreign input in the app: a file produced by
 * another device, possibly another version, possibly hand-edited.
 *
 * Events are capped. A bundle is a file a human chose to import, and an
 * accidental multi-gigabyte JSON should be refused with a message rather
 * than locking the tab while it merges.
 */
export const syncBundleSchema = z.object({
  formatVersion: z.literal(1),
  deviceId: z.string().min(1),
  createdAt: z.number().finite(),
  events: z.array(syncEventSchema).max(50_000),
});

/** Payload schemas, applied per event type when an event is applied. */
export const learnerUpsertedPayloadSchema = learnerSchema.partial({ lastActiveAt: true });
export const flagCreatedPayloadSchema = flaggedItemSchema;
export const flagResolvedPayloadSchema = z.object({
  id: z.string().min(1),
  teacherStatus: teacherStatusSchema,
  correction: z.string().optional(),
  promotedItemId: z.string().optional(),
});
export const bankItemPayloadSchema = reasoningItemSchema;

export type SyncBundleInput = z.infer<typeof syncBundleSchema>;
