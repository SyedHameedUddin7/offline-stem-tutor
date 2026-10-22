import type { Lang } from "../../../i18n/strings";
import { sayIn, type SolveOutcome } from "../types";
import { solveArithmetic, solveEquation, solveExpand, solveFactorise } from "./algebra";
import { solveHcfLcm, solveInterest, solvePercent, solvePrimeFactors, solveRatioShare } from "./numbers";
import { solveAverages, solveProbability } from "./statistics";
import { solveAngles, solveCoordinates, solvePythagoras } from "./geometry";
import { solveMensuration } from "./mensuration";

/**
 * Every Maths problem type the offline solver handles, by chapter, with one
 * example in the exact form it reads. This list is the contract: the
 * coverage view shows it, the "try a supported format" hint quotes it, and a
 * test runs every example through the solver.
 */
export interface ProblemType {
  id: string;
  chapterId: string;
  name: [string, string];
  example: [string, string];
}

export const MATH_PROBLEM_TYPES: ProblemType[] = [
  { id: "math.arithmetic", chapterId: "math-number-systems", name: ["Order of operations, fractions, powers", "Priorités opératoires, fractions, puissances"], example: ["Simplify: 7 + 3 x (8 - 5) ÷ 3", "Calcule 3/4 + 2/5"] },
  { id: "math.hcf-lcm", chapterId: "math-number-systems", name: ["HCF and LCM", "PGCD et PPCM"], example: ["Find the HCF and LCM of 24 and 36", "Trouve le PGCD et le PPCM de 24 et 36"] },
  { id: "math.prime-factorisation", chapterId: "math-number-systems", name: ["Prime factorisation", "Décomposition en facteurs premiers"], example: ["Prime factorisation of 360", "Décompose 360 en facteurs premiers"] },
  { id: "math.expand", chapterId: "math-algebraic-expressions", name: ["Expand and simplify", "Développer et réduire"], example: ["Expand (x + 5)(x - 3)", "Développe (x + 5)(x - 3)"] },
  { id: "math.factorise", chapterId: "math-algebraic-expressions", name: ["Factorise (common factor, quadratics)", "Factoriser (facteur commun, trinômes)"], example: ["Factorise x^2 - 5x + 6", "Factorise x^2 - 5x + 6"] },
  { id: "math.linear-equation", chapterId: "math-linear-equations", name: ["Linear equations in one unknown", "Équations du premier degré"], example: ["Solve for x: 3x + 7 = 22", "Résous : 3x + 7 = 22"] },
  { id: "math.linear-system", chapterId: "math-linear-equations", name: ["Two equations in two unknowns", "Systèmes de deux équations"], example: ["Solve x + y = 10 and x - y = 2", "Résous x + y = 10 et x - y = 2"] },
  { id: "math.quadratic-equation", chapterId: "math-linear-equations", name: ["Quadratic equations", "Équations du second degré"], example: ["Solve x^2 - 5x + 6 = 0", "Résous x^2 - 5x + 6 = 0"] },
  { id: "math.percent-of", chapterId: "math-ratio-percentage", name: ["Percentages and percentage change", "Pourcentages et variations"], example: ["What is 15% of 80?", "Calcule 15 % de 80"] },
  { id: "math.simple-interest", chapterId: "math-ratio-percentage", name: ["Simple and compound interest", "Intérêts simples et composés"], example: ["Simple interest on 5000 at 8% for 3 years", "Intérêts simples sur 5000 à 8 % pendant 3 ans"] },
  { id: "math.ratio-share", chapterId: "math-ratio-percentage", name: ["Sharing in a ratio", "Partage proportionnel"], example: ["Share 3500 in the ratio 3:4", "Partage 3500 dans le rapport 3:4"] },
  { id: "math.pythagoras", chapterId: "math-geometry-triangles", name: ["Pythagoras' theorem", "Théorème de Pythagore"], example: ["Right triangle with legs 3 cm and 4 cm, find the hypotenuse", "Triangle rectangle de côtés 3 cm et 4 cm : calcule l'hypoténuse"] },
  { id: "math.triangle-angle", chapterId: "math-geometry-triangles", name: ["Angles: triangle, complement, supplement", "Angles : triangle, complémentaire, supplémentaire"], example: ["Two angles of a triangle are 50° and 60°. Find the third.", "Deux angles d'un triangle mesurent 50° et 60°. Trouve le troisième angle du triangle."] },
  { id: "math.coordinate-distance", chapterId: "math-geometry-triangles", name: ["Distance, midpoint, gradient", "Distance, milieu, coefficient directeur"], example: ["Distance between (1, 2) and (4, 6)", "Distance entre (1, 2) et (4, 6)"] },
  { id: "math.mensuration", chapterId: "math-mensuration", name: ["Area, perimeter, volume, surface area of 12 shapes", "Aire, périmètre, volume de 12 formes"], example: ["Find the area of a circle with radius 7 cm", "Aire d'un disque de rayon 7 cm"] },
  { id: "math.averages", chapterId: "math-data-probability", name: ["Mean, median, mode, range", "Moyenne, médiane, mode, étendue"], example: ["Find the mean, median and mode of 4, 8, 15, 16, 23, 42", "Moyenne et médiane de 4, 8, 15, 16, 23, 42"] },
  { id: "math.probability", chapterId: "math-data-probability", name: ["Probability: one die, a bag of colours", "Probabilité : un dé, un sac de couleurs"], example: ["A bag has 3 red and 5 blue balls. Probability of picking a red ball?", "Un sac contient 3 boules rouges et 5 bleues. Probabilité de tirer une rouge ?"] },
];

/**
 * Order matters where two solvers could claim a question: prime
 * factorisation before algebraic factorising ("Factorise 84"), interest and
 * ratio before plain percentages, shapes before the equation reader.
 */
const SOLVERS = [
  solveHcfLcm,
  solvePrimeFactors,
  solveInterest,
  solveRatioShare,
  solvePercent,
  solveProbability,
  solveAverages,
  solveCoordinates,
  solvePythagoras,
  solveMensuration,
  solveAngles,
  solveFactorise,
  solveExpand,
  solveEquation,
  solveArithmetic,
];

export function solveMaths(question: string, lang: Lang): SolveOutcome {
  const say = sayIn(lang);
  for (const solve of SOLVERS) {
    let outcome: SolveOutcome;
    try {
      outcome = solve(question, say);
    } catch (err) {
      // A solver bug must cost one question, not the whole pipeline.
      console.warn("Maths solver threw; treating as unrecognised", err);
      continue;
    }
    if (outcome.kind !== "unrecognised") return outcome;
  }
  return { kind: "unrecognised" };
}
