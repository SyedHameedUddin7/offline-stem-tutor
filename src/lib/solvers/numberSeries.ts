import type { Lang } from "../../i18n/strings";

/**
 * A deterministic number-series solver.
 *
 * Why this exists, concretely: asked "2, 4, 6, 8, ?" the on-device model
 * retrieved the Fibonacci exemplar, wrote "2 + 4 = 6, 4 + 6 = 10, 6 + 8 = 14"
 * and answered 20. Its own second step contradicts the question — the series
 * says the term after 6 is 8, not 10 — and the model did not notice, because
 * nothing in a language model checks a rule against the data it came from.
 *
 * Retrieval did not prevent that, and cannot: retrieval finds the nearest
 * *technique*, and the nearest technique can still be the wrong one. The
 * similarity score was 0.67, comfortably "grounded".
 *
 * So for the one chapter where correctness is decidable, we decide it. Every
 * candidate rule below is tested against every term the student actually
 * gave. A rule that cannot reproduce the question is rejected outright, which
 * is the exact check the model skipped. No model runs, nothing is downloaded,
 * and the answer is either right or absent.
 *
 * Output is localised because it is read by a student, not logged.
 */

export interface SeriesSolution {
  pattern: string;
  reasoning: string;
  next: number;
  terms: number[];
}

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

/** "2, 4, 6, 8, ?" — an explicit blank at the end. */
const EXPLICIT = /(-?\d+(?:\s*,\s*-?\d+){2,})\s*,\s*(?:\?|_+)/;

/** "What comes next: 2, 4, 6, 8" — a blank implied by the wording. */
const IMPLIED = /(-?\d+(?:\s*,\s*-?\d+){3,})/;
const IMPLIES_CONTINUATION =
  /\b(next|missing|follow|continue|comes after|suivant|suivante|manquant|manquante|continue|complète|suite)\b/i;

/**
 * Pull the series out of a question, or return null.
 *
 * Deliberately conservative. "In a row of 40 students, Rahul is 12th from the
 * left" contains numbers and must not be treated as a series, so a bare list
 * is only accepted when the wording asks for a continuation.
 */
export function parseSeries(question: string): number[] | null {
  const explicit = question.match(EXPLICIT);
  if (explicit) return toNumbers(explicit[1]);

  if (IMPLIES_CONTINUATION.test(question)) {
    const implied = question.match(IMPLIED);
    if (implied) return toNumbers(implied[1]);
  }
  return null;
}

function toNumbers(list: string): number[] | null {
  const terms = list.split(",").map((t) => Number(t.trim()));
  return terms.length >= 3 && terms.every(Number.isFinite) ? terms : null;
}

/* ------------------------------------------------------------------ *
 * Localised phrasing
 * ------------------------------------------------------------------ */

interface Phrases {
  patternArithmetic: string;
  patternArithmeticDown: string;
  patternGeometric: string;
  patternSecondDiff: string;
  patternSquares: string;
  patternCubes: string;
  patternPrimes: string;
  patternFibonacci: string;
  patternMultiplyAdd: (m: number) => string;
  patternAlternating: string;

  diffsAre: (list: string) => string;
  everyDiffIs: (d: number) => string;
  ratiosAre: (list: string) => string;
  ratioIs: (r: number) => string;
  diffsChangeBy: (dd: number) => string;
  soNextDiff: (last: number, dd: number, next: number) => string;
  eachIsPower: (label: string, list: string) => string;
  nextIsPower: (base: number, exp: number, next: number) => string;
  consecutivePrimes: (list: string) => string;
  nextPrimeAfter: (last: number, next: number) => string;
  soNextTermSum: (a: number, b: number, next: number) => string;
  tryMultiplyAdd: (m: number, list: string) => string;
  addedGrowsBy: (step: number, next: number) => string;
  readEveryOther: string;
  oddPositions: (list: string, d: number) => string;
  evenPositions: (list: string, d: number) => string;
  nextContinues: (next: number) => string;
  arithmeticStep: (last: number, d: number, next: number) => string;
  geometricStep: (last: number, r: number, next: number) => string;
  plusStep: (last: number, d: number, next: number) => string;
  multiplyAddStep: (last: number, m: number, c: number, next: number) => string;
  squareLabel: string;
  cubeLabel: string;
}

const PHRASES: Record<Lang, Phrases> = {
  en: {
    patternArithmetic: "constant difference (arithmetic series)",
    patternArithmeticDown: "constant difference (arithmetic series), decreasing",
    patternGeometric: "constant ratio (geometric series)",
    patternSecondDiff: "constant second difference",
    patternSquares: "perfect squares",
    patternCubes: "perfect cubes",
    patternPrimes: "prime sequence",
    patternFibonacci: "each term is the sum of the two before it",
    patternMultiplyAdd: (m) => `multiply by ${m} then add an increasing constant`,
    patternAlternating: "two alternating series",

    diffsAre: (list) => `Differences between consecutive terms: ${list}.`,
    everyDiffIs: (d) => `Every difference is ${d}, so the rule is "add ${d}".`,
    ratiosAre: (list) => `Each term divided by the one before it: ${list}.`,
    ratioIs: (r) => `The ratio is constant at ${r}, so the rule is "multiply by ${r}".`,
    diffsChangeBy: (dd) => `Those differences themselves change by a constant ${dd} each step.`,
    soNextDiff: (last, dd, next) => `So the next difference is ${last} + ${dd} = ${next}.`,
    eachIsPower: (label, list) => `Each term is a ${label}: ${list}.`,
    nextIsPower: (base, exp, next) => `The next term is ${base}^${exp} = ${next}.`,
    consecutivePrimes: (list) => `The terms are consecutive prime numbers: ${list}.`,
    nextPrimeAfter: (last, next) => `The next prime after ${last} is ${next}.`,
    soNextTermSum: (a, b, next) => `So the next term is ${a} + ${b} = ${next}.`,
    tryMultiplyAdd: (m, list) => `Try "multiply by ${m}, then add something": ${list}.`,
    addedGrowsBy: (step, next) => `The number added grows by ${step} each step, so next is ${next}.`,
    readEveryOther: "Read every other term as its own series.",
    oddPositions: (list, d) => `Positions 1, 3, 5…: ${list} — adding ${d} each time.`,
    evenPositions: (list, d) => `Positions 2, 4, 6…: ${list} — adding ${d} each time.`,
    nextContinues: (next) => `The next term continues the first of those: ${next}.`,
    arithmeticStep: (last, d, next) => `${last} + ${d} = ${next}.`,
    geometricStep: (last, r, next) => `${last} x ${r} = ${next}.`,
    plusStep: (last, d, next) => `${last} + ${d} = ${next}.`,
    multiplyAddStep: (last, m, c, next) => `${last} x ${m} + ${c} = ${next}.`,
    squareLabel: "square",
    cubeLabel: "cube",
  },

  fr: {
    patternArithmetic: "différence constante (suite arithmétique)",
    patternArithmeticDown: "différence constante (suite arithmétique), décroissante",
    patternGeometric: "rapport constant (suite géométrique)",
    patternSecondDiff: "différence seconde constante",
    patternSquares: "carrés parfaits",
    patternCubes: "cubes parfaits",
    patternPrimes: "suite de nombres premiers",
    patternFibonacci: "chaque terme est la somme des deux précédents",
    patternMultiplyAdd: (m) => `multiplier par ${m} puis ajouter une constante croissante`,
    patternAlternating: "deux suites alternées",

    diffsAre: (list) => `Différences entre termes consécutifs : ${list}.`,
    everyDiffIs: (d) =>
      `Toutes les différences valent ${d}, donc la règle est « ajouter ${d} ».`,
    ratiosAre: (list) => `Chaque terme divisé par le précédent : ${list}.`,
    ratioIs: (r) =>
      `Le rapport est constant et vaut ${r}, donc la règle est « multiplier par ${r} ».`,
    diffsChangeBy: (dd) =>
      `Ces différences changent elles-mêmes d'une constante ${dd} à chaque étape.`,
    soNextDiff: (last, dd, next) =>
      `Donc la différence suivante est ${last} + ${dd} = ${next}.`,
    eachIsPower: (label, list) => `Chaque terme est un ${label} : ${list}.`,
    nextIsPower: (base, exp, next) => `Le terme suivant est ${base}^${exp} = ${next}.`,
    consecutivePrimes: (list) => `Les termes sont des nombres premiers consécutifs : ${list}.`,
    nextPrimeAfter: (last, next) => `Le nombre premier suivant après ${last} est ${next}.`,
    soNextTermSum: (a, b, next) => `Donc le terme suivant est ${a} + ${b} = ${next}.`,
    tryMultiplyAdd: (m, list) =>
      `Essayons « multiplier par ${m}, puis ajouter quelque chose » : ${list}.`,
    addedGrowsBy: (step, next) =>
      `Le nombre ajouté augmente de ${step} à chaque étape, donc le suivant est ${next}.`,
    readEveryOther: "Lis un terme sur deux comme sa propre suite.",
    oddPositions: (list, d) => `Positions 1, 3, 5… : ${list} — on ajoute ${d} à chaque fois.`,
    evenPositions: (list, d) => `Positions 2, 4, 6… : ${list} — on ajoute ${d} à chaque fois.`,
    nextContinues: (next) => `Le terme suivant poursuit la première de ces suites : ${next}.`,
    arithmeticStep: (last, d, next) => `${last} + ${d} = ${next}.`,
    geometricStep: (last, r, next) => `${last} x ${r} = ${next}.`,
    plusStep: (last, d, next) => `${last} + ${d} = ${next}.`,
    multiplyAddStep: (last, m, c, next) => `${last} x ${m} + ${c} = ${next}.`,
    squareLabel: "carré",
    cubeLabel: "cube",
  },
};

/* ------------------------------------------------------------------ *
 * Rule families
 * ------------------------------------------------------------------ */

type RuleFn = (t: number[], p: Phrases) => SeriesSolution | null;

const EPSILON = 1e-9;
const close = (a: number, b: number) => Math.abs(a - b) < EPSILON;
const diffs = (t: number[]) => t.slice(1).map((v, i) => v - t[i]);
const last = (t: number[]) => t[t.length - 1];

/** a(n) = a(n-1) + d */
const arithmetic: RuleFn = (t, p) => {
  const d = diffs(t);
  if (!d.every((x) => close(x, d[0]))) return null;
  const next = last(t) + d[0];
  return {
    pattern: d[0] < 0 ? p.patternArithmeticDown : p.patternArithmetic,
    next,
    terms: t,
    reasoning: [
      p.diffsAre(d.join(", ")),
      p.everyDiffIs(d[0]),
      p.arithmeticStep(last(t), d[0], next),
    ].join("\n"),
  };
};

/** a(n) = a(n-1) x r */
const geometric: RuleFn = (t, p) => {
  if (t.some((x) => x === 0)) return null;
  const r = t[1] / t[0];
  if (!t.slice(1).every((v, i) => close(v, t[i] * r))) return null;
  const next = last(t) * r;
  return {
    pattern: p.patternGeometric,
    next,
    terms: t,
    reasoning: [
      p.ratiosAre(t.slice(1).map((v, i) => `${v}/${t[i]}=${r}`).join(", ")),
      p.ratioIs(r),
      p.geometricStep(last(t), r, next),
    ].join("\n"),
  };
};

/** Differences rise or fall by a fixed amount. Catches 2, 6, 12, 20, 30… */
const secondDifference: RuleFn = (t, p) => {
  if (t.length < 4) return null;
  const d = diffs(t);
  const dd = diffs(d);
  if (!dd.every((x) => close(x, dd[0])) || close(dd[0], 0)) return null;
  const nextDiff = d[d.length - 1] + dd[0];
  const next = last(t) + nextDiff;
  return {
    pattern: p.patternSecondDiff,
    next,
    terms: t,
    reasoning: [
      p.diffsAre(d.join(", ")),
      p.diffsChangeBy(dd[0]),
      p.soNextDiff(d[d.length - 1], dd[0], nextDiff),
      p.plusStep(last(t), nextDiff, next),
    ].join("\n"),
  };
};

/** Consecutive powers: squares, cubes. */
function powerRule(exponent: 2 | 3): RuleFn {
  return (t, p) => {
    const base = Math.round(Math.pow(t[0], 1 / exponent));
    if (base < 1) return null;
    if (!t.every((v, i) => close(v, Math.pow(base + i, exponent)))) return null;
    const nextBase = base + t.length;
    const next = Math.pow(nextBase, exponent);
    return {
      pattern: exponent === 2 ? p.patternSquares : p.patternCubes,
      next,
      terms: t,
      reasoning: [
        p.eachIsPower(
          exponent === 2 ? p.squareLabel : p.cubeLabel,
          t.map((v, i) => `${base + i}^${exponent}=${v}`).join(", ")
        ),
        p.nextIsPower(nextBase, exponent, next),
      ].join("\n"),
    };
  };
}

function isPrime(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

const primes: RuleFn = (t, p) => {
  if (!t.every(isPrime)) return null;
  // Must be *consecutive* primes, or 2, 3, 7, 13 would qualify as a "prime
  // sequence" and produce a confidently wrong next term.
  for (let i = 1; i < t.length; i++) {
    let candidate = t[i - 1] + 1;
    while (!isPrime(candidate)) candidate++;
    if (candidate !== t[i]) return null;
  }
  let next = last(t) + 1;
  while (!isPrime(next)) next++;
  return {
    pattern: p.patternPrimes,
    next,
    terms: t,
    reasoning: [p.consecutivePrimes(t.join(", ")), p.nextPrimeAfter(last(t), next)].join("\n"),
  };
};

/** a(n) = a(n-1) + a(n-2) */
const fibonacciLike: RuleFn = (t, p) => {
  if (t.length < 4) return null;
  for (let i = 2; i < t.length; i++) {
    if (!close(t[i], t[i - 1] + t[i - 2])) return null;
  }
  const next = last(t) + t[t.length - 2];
  return {
    pattern: p.patternFibonacci,
    next,
    terms: t,
    reasoning: [
      t.slice(2).map((v, i) => `${t[i]} + ${t[i + 1]} = ${v}`).join(", ") + ".",
      p.soNextTermSum(t[t.length - 2], last(t), next),
    ].join("\n"),
  };
};

/** a(n) = a(n-1) x m + c, where c increases by a fixed step. Catches 4, 9, 20, 43… */
const multiplyAddIncreasing: RuleFn = (t, p) => {
  if (t.length < 4) return null;
  for (let m = 2; m <= 5; m++) {
    const c = t.slice(1).map((v, i) => v - m * t[i]);
    const cd = diffs(c);
    if (c.length < 3 || !cd.every((x) => close(x, cd[0]))) continue;
    const nextC = c[c.length - 1] + cd[0];
    const next = last(t) * m + nextC;
    return {
      pattern: p.patternMultiplyAdd(m),
      next,
      terms: t,
      reasoning: [
        p.tryMultiplyAdd(
          m,
          t.slice(1).map((v, i) => `${t[i]} x ${m} + ${c[i]} = ${v}`).join(", ")
        ),
        p.addedGrowsBy(cd[0], nextC),
        p.multiplyAddStep(last(t), m, nextC, next),
      ].join("\n"),
    };
  }
  return null;
};

/** Two interleaved series. Catches 1, 10, 3, 12, 5, 14… */
const alternating: RuleFn = (t, p) => {
  if (t.length < 6) return null;
  const odd = t.filter((_, i) => i % 2 === 0);
  const even = t.filter((_, i) => i % 2 === 1);
  const oddRule = arithmetic(odd, p);
  const evenRule = arithmetic(even, p);
  if (!oddRule || !evenRule) return null;
  const next = t.length % 2 === 0 ? oddRule.next : evenRule.next;
  return {
    pattern: p.patternAlternating,
    next,
    terms: t,
    reasoning: [
      p.readEveryOther,
      p.oddPositions(odd.join(", "), odd[1] - odd[0]),
      p.evenPositions(even.join(", "), even[1] - even[0]),
      p.nextContinues(next),
    ].join("\n"),
  };
};

/**
 * Order matters.
 *
 * Simplest rule first, so 1, 4, 9, 16 is reported as "perfect squares" rather
 * than "constant second difference" — both fit and both give 25, but one is
 * the explanation a student can reuse.
 */
const RULES: RuleFn[] = [
  arithmetic,
  geometric,
  powerRule(2),
  powerRule(3),
  primes,
  fibonacciLike,
  secondDifference,
  multiplyAddIncreasing,
  alternating,
];

/**
 * Solve a number-series question exactly, or return null.
 *
 * Null is a real answer here, and an important one: it means no known rule
 * reproduces the given terms, which is precisely when the tutor should stop
 * and hand the question to a teacher instead of letting a model improvise.
 */
export function solveNumberSeries(question: string, lang: Lang = "en"): SeriesSolution | null {
  const terms = parseSeries(question);
  if (!terms) return null;
  const phrases = PHRASES[lang];
  for (const rule of RULES) {
    const solution = rule(terms, phrases);
    if (solution && Number.isFinite(solution.next)) return solution;
  }
  return null;
}

/*
 * Not yet implemented, and decidable in the same way:
 *
 *  - Direction Sense: walking legs and turns is a tiny state machine over
 *    (facing, x, y). Exactly solvable.
 *  - Row positions: "12th from the left in a row of 40" is arithmetic.
 *  - Coding-decoding with a fixed letter shift: verifiable by re-applying the
 *    derived shift to the source word and comparing.
 *
 * Each of those is a chapter where the model currently gets the last word and
 * should not.
 */
