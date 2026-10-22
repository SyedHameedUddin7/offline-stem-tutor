/**
 * Check the arithmetic a model wrote, without trusting it.
 *
 * The failure this exists for is the one that started the whole
 * verification thread in this project: asked "2, 4, 6, 8, ?" the model
 * wrote "4 + 6 = 10" and never noticed that its own line contradicted the
 * question. Language models produce arithmetic that reads correctly and is
 * wrong, and no amount of prompting reliably fixes it — but every claim of
 * the form `a OP b = c` is checkable in microseconds.
 *
 * Deliberately NOT a symbolic maths engine. It finds explicit binary
 * arithmetic claims in prose and evaluates them. Anything it cannot parse
 * is reported as unverifiable rather than guessed at, because a checker
 * that silently passes what it did not understand is worse than none.
 */

export interface ArithmeticClaim {
  /** The literal text found, e.g. "4 + 6 = 10". */
  text: string;
  left: number;
  operator: "+" | "-" | "x" | "*" | "/" | "÷";
  right: number;
  /** What the text asserted the result to be. */
  claimed: number;
  /** What it actually is. */
  actual: number;
  correct: boolean;
}

export interface ArithmeticReport {
  claims: ArithmeticClaim[];
  wrong: ArithmeticClaim[];
  /** True when at least one checkable claim was found and all were right. */
  verified: boolean;
  /** True when nothing checkable was found — not a pass and not a failure. */
  unverifiable: boolean;
}

/**
 * One number as a model writes it: `1,250` or `1 250` with thousands
 * separators, `2.5`, or the French decimal comma `2,5`.
 *
 * Without this, `1,000 + 250 = 1,250` was read from the middle as
 * `000 + 250 = 1` and a correct answer was flagged to a teacher. A comma
 * followed by exactly three digits is taken as a thousands separator, so a
 * French `1,250` meaning 1.25 is read as 1250 — rare in a lower-secondary
 * answer, and the cost is a missed check rather than a false alarm.
 */
const NUMBER = String.raw`-?(?:\d{1,3}(?:[,\u00A0\u202F]\d{3})+(?!\d)|\d+(?:[.,]\d+)?)`;

/** `a OP b = c`, tolerating the various multiplication and division glyphs.
 *  The lookbehind stops a match starting inside a longer number. */
const CLAIM = new RegExp(
  String.raw`(?<![\d.,])(${NUMBER})\s*([+\-x*×/÷])\s*(${NUMBER})\s*=\s*(${NUMBER})`,
  "g"
);

function parseNumber(token: string): number {
  return /^-?\d{1,3}(?:[,\u00A0\u202F]\d{3})+$/.test(token)
    ? Number(token.replace(/[,\u00A0\u202F]/g, ""))
    : Number(token.replace(",", "."));
}

/** Decimal places the model chose to write, so `3.14` can be accepted for 22 ÷ 7. */
function decimalsOf(token: string): number {
  if (/^-?\d{1,3}(?:[,\u00A0\u202F]\d{3})+$/.test(token)) return 0;
  return token.match(/[.,](\d+)$/)?.[1].length ?? 0;
}

/**
 * Floating point needs a tolerance, but a fixed epsilon is wrong across
 * scales: 1e-9 is far too strict for 1e12 and far too loose for 1e-15.
 * Relative tolerance, with an absolute floor for values near zero.
 */
function closeEnough(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  if (diff < 1e-9) return true;
  return diff / Math.max(Math.abs(a), Math.abs(b)) < 1e-6;
}

function apply(left: number, op: string, right: number): number | null {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "x":
    case "*":
    case "×":
      return left * right;
    case "/":
    case "÷":
      return right === 0 ? null : left / right;
    default:
      return null;
  }
}

/**
 * Is this match a fragment of a longer chain?
 *
 * Found by the evaluation suite: "KE = 0.5 x 2 x 36 = 36" is correct, but
 * the binary pattern matches "2 x 36 = 36" out of the middle of it and
 * calls it wrong. A checker that flags correct answers is worse than no
 * checker — it trains people to ignore it, and it sends sound work to a
 * facilitator's queue.
 *
 * Chains are skipped rather than evaluated. Doing them properly means
 * operator precedence, and a half-correct precedence implementation would
 * reintroduce exactly this class of bug. Reporting "I could not check
 * this" is the honest result.
 */
function isChainFragment(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 24), index);
  return /[\d.)]\s*[+\-x*×/÷]\s*$/.test(before);
}

export function checkArithmetic(text: string): ArithmeticReport {
  const claims: ArithmeticClaim[] = [];

  for (const match of text.matchAll(CLAIM)) {
    const [whole, l, op, r, c] = match;
    if (match.index !== undefined && isChainFragment(text, match.index)) continue;
    const left = parseNumber(l);
    const right = parseNumber(r);
    const claimed = parseNumber(c);
    const actual = apply(left, op, right);
    if (actual === null || !Number.isFinite(actual)) continue;

    claims.push({
      text: whole.trim(),
      left,
      operator: op as ArithmeticClaim["operator"],
      right,
      claimed,
      actual,
      // A rounded result is still correct: 22 ÷ 7 = 3.14 is what a teacher
      // writes. Accepted only to the precision the model chose to write, so
      // 12.5 ÷ 5 = 2.4 still fails.
      correct:
        closeEnough(actual, claimed) ||
        (decimalsOf(c) > 0 && Math.abs(actual - claimed) <= 0.5 * 10 ** -decimalsOf(c) + 1e-12),
    });
  }

  const wrong = claims.filter((c) => !c.correct);
  return {
    claims,
    wrong,
    verified: claims.length > 0 && wrong.length === 0,
    unverifiable: claims.length === 0,
  };
}

/**
 * Check a linear equation solution by substitution.
 *
 * Substitution is the whole trick: it needs no solver, works for any
 * equation the parser recognises, and is exactly the check a teacher tells
 * a student to do. Supports the `ax + b = c` shape the Linear Equations
 * chapter actually teaches.
 */
export interface SubstitutionResult {
  checked: boolean;
  correct: boolean;
  detail: string;
}

// The lookbehind refuses to start mid-expression: in `10 - 3x + 2 = 4` the
// fragment `3x + 2 = 4` is not the equation, and checking against it would
// flag a correct answer.
const LINEAR =
  /(?<![\d.)]\s*[+\-*/×÷]\s*|[\d.])(-?\d*\.?\d*)\s*\*?\s*([a-z])\s*([+-])\s*(\d+\.?\d*)\s*=\s*(-?\d+\.?\d*)(?![\d.]|\s*[+\-*/×÷])/i;

export function verifyLinearSolution(question: string, claimedValue: number): SubstitutionResult {
  const m = question.match(LINEAR);
  if (!m) return { checked: false, correct: false, detail: "no linear equation found" };

  const [, rawA, variable, sign, rawB, rawC] = m;
  const a = rawA === "" || rawA === "-" ? Number(`${rawA}1`) : Number(rawA);
  const b = Number(rawB) * (sign === "-" ? -1 : 1);
  const c = Number(rawC);
  if (!Number.isFinite(a) || a === 0) {
    return { checked: false, correct: false, detail: "unsupported equation shape" };
  }

  const lhs = a * claimedValue + b;
  const correct = closeEnough(lhs, c);
  return {
    checked: true,
    correct,
    detail: `${a}(${variable}=${claimedValue}) ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${lhs}, expected ${c}`,
  };
}

/** Pull the number a worked answer presents as its result. */
export function extractFinalNumber(text: string): number | null {
  // Most specific first: an explicit ANSWER line beats a number in prose.
  const patterns = [
    /(?:ANSWER|RÉPONSE|REPONSE)\s*:?\s*(-?\d+(?:\.\d+)?)/i,
    /(?:answer is|equals|result is|réponse est)\s*:?\s*(-?\d+(?:\.\d+)?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  // Otherwise the last `x = 5` in the answer. The prompt does not ask for an
  // ANSWER line, so this is the form real answers take — and it used to
  // require the number to end its line, which `x = 5.` never does. An
  // assignment that continues (`x = 5 + 2`) is working, not a result.
  const assignments = [
    ...text.matchAll(/\b[a-z]\s*=\s*(-?\d+(?:\.\d+)?)(?![\d]|\.\d|\s*(?:[+\-*×/÷^]|x\s*\d))/gi),
  ];
  const last = assignments.at(-1);
  return last ? Number(last[1]) : null;
}
