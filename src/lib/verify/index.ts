import { checkArithmetic, extractFinalNumber, verifyLinearSolution } from "./arithmetic";
import { checkDimensions } from "./dimensions";
import { resolveChapter } from "../../data/subjects";

export * from "./arithmetic";
export * from "./dimensions";

/**
 * Post-generation verification.
 *
 * Runs only deterministic checks. A second model call to grade the first
 * would cost another several seconds on a phone and inherit the same
 * failure mode — a model that got the arithmetic wrong is not the right
 * judge of whether the arithmetic is wrong.
 *
 * Three findings, in descending severity:
 *
 *   contradiction  the answer's own stated working is internally wrong
 *                  ("4 + 6 = 10" inside a question whose terms say 8)
 *   dimension      the final value's units cannot be what was asked for
 *   mismatch       the stated answer disagrees with a deterministic check
 *
 * What this does NOT do is decide the answer is right. Passing every check
 * means "nothing detectably wrong", which is a weaker and more honest claim
 * than "verified" — only the solver earns that, because only the solver
 * derived the result itself.
 */

export type VerificationIssue = "contradiction" | "dimension" | "mismatch";

export interface VerificationReport {
  /** True only if at least one check ran AND found nothing wrong. */
  passed: boolean;
  /** True when no check could be applied — neither pass nor fail. */
  unverifiable: boolean;
  issues: VerificationIssue[];
  /** Human-readable, shown to a facilitator and logged. Never a stack trace. */
  notes: string[];
}

export function verifyAnswer(
  chapterId: string,
  question: string,
  answer: string
): VerificationReport {
  const subjectId = resolveChapter(chapterId)?.subject.id;
  const issues: VerificationIssue[] = [];
  const notes: string[] = [];
  let ranAnyCheck = false;

  // 1. Internal arithmetic. Applies to any subject — a biology answer that
  //    says "12 / 4 = 2" is still wrong.
  const arithmetic = checkArithmetic(answer);
  if (!arithmetic.unverifiable) {
    ranAnyCheck = true;
    for (const claim of arithmetic.wrong) {
      issues.push("contradiction");
      notes.push(`"${claim.text}" is wrong — ${claim.left} ${claim.operator} ${claim.right} = ${claim.actual}`);
    }
  }

  // 2. Units, for physics only. Running this on a maths answer would
  //    produce noise: "12 m" in a mensuration answer is not a physics claim.
  if (subjectId === "physics") {
    const dimensions = checkDimensions(question, answer);
    if (dimensions.checked) {
      ranAnyCheck = true;
      if (!dimensions.consistent) {
        issues.push("dimension");
        notes.push(dimensions.detail);
      }
    }
  }

  // 3. Substitution, for linear equations. The check a teacher asks for.
  if (chapterId === "math-linear-equations") {
    const claimed = extractFinalNumber(answer);
    if (claimed !== null) {
      const substitution = verifyLinearSolution(question, claimed);
      if (substitution.checked) {
        ranAnyCheck = true;
        if (!substitution.correct) {
          issues.push("mismatch");
          notes.push(`substituting back fails: ${substitution.detail}`);
        }
      }
    }
  }

  return {
    passed: ranAnyCheck && issues.length === 0,
    unverifiable: !ranAnyCheck,
    issues: [...new Set(issues)],
    notes,
  };
}
