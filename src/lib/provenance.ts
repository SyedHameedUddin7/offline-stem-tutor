import type { ChatMessage, EngineTier } from "../types";

/**
 * How an answer should describe its own origin to a student.
 *
 * Replaces showing `confidence: medium · match 0.67` in the chat. A cosine
 * similarity is the right thing for ME to see while calibrating thresholds
 * and the wrong thing to put in front of a fourteen-year-old: it reads as
 * precision the system does not have, and it is not actionable by the person
 * reading it. What a student needs is whether anyone checked this.
 *
 * The underlying numbers are still stored on every message and still shown —
 * behind a diagnostics toggle, for whoever is calibrating.
 */

export type ProvenanceKind =
  /** Exact, re-derived from the question on this device. */
  | "verified"
  /** Came from an exemplar a teacher wrote or approved. */
  | "teacher-verified"
  /** Came from a vetted exemplar that shipped with the app. */
  | "from-example"
  /** Model answer with chapter reference material in front of it. */
  | "grounded-unchecked"
  /** Model answer with nothing behind it. */
  | "unchecked"
  /** No engine could answer; the question went to a facilitator. */
  | "no-answer";

export function provenanceOf(
  message: Pick<ChatMessage, "tier" | "citations" | "flagged">,
  /** True when the grounding exemplar was teacher-authored. */
  teacherSourced = false
): ProvenanceKind {
  const tier: EngineTier = message.tier ?? "unavailable";
  switch (tier) {
    case "solver":
      return "verified";
    case "answer-bank":
      return teacherSourced ? "teacher-verified" : "from-example";
    case "webgpu-llm":
      // Citations mean reference notes or retrieved exemplars were in the
      // prompt. That constrains the facts it reached for; it does not mean
      // anyone checked the reasoning built on top of them.
      return message.citations && message.citations.length > 0
        ? "grounded-unchecked"
        : "unchecked";
    default:
      return "no-answer";
  }
}

/**
 * Whether this provenance should read as reassuring, neutral or cautionary.
 *
 * Only `verified` earns the affirmative tone, because only the solver checks
 * its own output against the question it was given.
 */
export function provenanceTone(kind: ProvenanceKind): "good" | "neutral" | "caution" {
  switch (kind) {
    case "verified":
    case "teacher-verified":
      return "good";
    case "from-example":
      return "neutral";
    default:
      return "caution";
  }
}
