import type { Lang } from "../../i18n/strings";

/**
 * What every deterministic solver returns.
 *
 * `check` is the part that earns the "Verified" label: a second, independent
 * route back to the question — substituting the answer into the original
 * equation, recomputing an area with a different formula — not a re-read of
 * the same arithmetic. A solver whose check fails does not get to answer.
 */
export interface SolverResult {
  /** Stable id of the problem type, e.g. "math.linear-equation". */
  problemType: string;
  /** Localised name of the method, shown as a heading. */
  title: string;
  steps: string[];
  /** The final answer as a student would write it, units included. */
  answer: string;
  /** The answer as a number, when it is one — used by practice and eval. */
  value?: number;
  check: { passed: boolean; detail: string };
  /** One or two sentences on the idea behind the method. */
  concept: string;
}

/** A solver either answers, explains why it cannot, or does not recognise the question. */
export type SolveOutcome =
  | { kind: "solved"; result: SolverResult }
  /** Recognised the problem type, but the input is invalid or insufficient. */
  | { kind: "invalid"; problemType: string; reason: string }
  | { kind: "unrecognised" };

export const UNRECOGNISED: SolveOutcome = { kind: "unrecognised" };

/** Bilingual string picker, so a solver's wording sits next to its logic. */
export type Say = (en: string, fr: string) => string;
export const sayIn =
  (lang: Lang): Say =>
  (en, fr) =>
    lang === "fr" ? fr : en;

export function solved(result: SolverResult): SolveOutcome {
  return { kind: "solved", result };
}

export function invalid(problemType: string, reason: string): SolveOutcome {
  return { kind: "invalid", problemType, reason };
}

/** All numbers in a piece of text, accepting a French decimal comma. */
export function numbersIn(text: string): number[] {
  return (text.match(/-?\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(",", ".")));
}
