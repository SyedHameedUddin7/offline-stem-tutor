import type { Lang } from "../i18n/strings";
import type { PracticeQuestion } from "../types";
import { formatPoly, parse, toPoly } from "./math/expr";
import { formatNumber } from "./math/fraction";
import { tokens } from "./lexical";
import { solveMaths } from "./solvers/maths";
import { solveFormula, type Known } from "./solvers/physics/engine";
import { FORMULAS, SI_UNIT, type QuantityId } from "./solvers/physics/formulas";
import { sayIn, type Say, type SolveOutcome } from "./solvers/types";

/**
 * Practice: checking a student's answer, and generating numerical questions.
 *
 * Generated questions are the reason Maths and Physics practice never runs
 * out offline. Each one's answer is computed when the question is made, and
 * its explanation is the solver's own worked solution — so a student who gets
 * it wrong sees the method, not just the number.
 */

/* ------------------------------------------------------------------ *
 * Checking answers
 * ------------------------------------------------------------------ */

export type Verdict = { kind: "correct" } | { kind: "wrong" } | { kind: "self-mark" } | { kind: "unreadable" };

/** "3/8", "0,375", "x = 5", "12 cm²", "-2.5" → a number, or null. */
export function readNumber(input: string): number | null {
  const s = input.replace(/^[^=]*=/, "").replace(/\s+/g, "").replace(/,(?=\d)/g, ".").replace(/[−–]/g, "-");
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2]);
  const num = s.match(/^-?\d+(?:\.\d+)?(?:e-?\d+)?/i);
  return num ? Number(num[0]) : null;
}

const ARTICLES = new Set(["the", "a", "an", "le", "la", "les", "un", "une", "des", "l"]);
function normaliseText(s: string): string {
  return tokens(s).filter((w) => !ARTICLES.has(w)).join(" ");
}

export function checkAnswer(q: PracticeQuestion, input: string): Verdict {
  const given = input.trim();
  if (!given) return { kind: "unreadable" };
  switch (q.format) {
    case "mcq":
      return given === q.answer ? { kind: "correct" } : { kind: "wrong" };
    case "numeric": {
      const x = readNumber(given);
      if (x === null) return { kind: "unreadable" };
      const expected = Number(q.answer);
      // Integers must match exactly; other answers allow rounding to the
      // precision a student would reasonably write (and π as 22/7 or 3.14).
      const tolerance = q.tolerance ?? (Number.isInteger(expected) ? 1e-9 : 0.005);
      return Math.abs(x - expected) <= tolerance * Math.max(1, Math.abs(expected)) ? { kind: "correct" } : { kind: "wrong" };
    }
    case "expression": {
      try {
        const clean = (s: string) => s.replace(/^[^=]*=/, "");
        return formatPoly(toPoly(parse(clean(given)))) === formatPoly(toPoly(parse(clean(q.answer)))) ? { kind: "correct" } : { kind: "wrong" };
      } catch {
        return { kind: "unreadable" };
      }
    }
    case "short": {
      // A sentence-long answer cannot be compared fairly by machine: show it
      // and let the student mark themselves rather than mark them wrong.
      if (q.answer.split(/\s+/).length > 3 && !q.accepted?.length) return { kind: "self-mark" };
      const g = normaliseText(given);
      const ok = [q.answer, ...(q.accepted ?? [])].some((a) => normaliseText(a) === g);
      return ok ? { kind: "correct" } : { kind: "wrong" };
    }
  }
}

/* ------------------------------------------------------------------ *
 * Generated questions
 * ------------------------------------------------------------------ */

type Rand = () => number;
const int = (rand: Rand, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T,>(rand: Rand, xs: T[]) => xs[Math.floor(rand() * xs.length)];

interface Generated {
  type: string;
  prompt: string;
  answer: number | string;
  format: "numeric" | "expression";
  tolerance?: number;
}

type MathGen = (rand: Rand, say: Say) => Generated;

/** Each generator builds numbers whose answer is known by construction. */
const MATH_GENERATORS: Record<string, MathGen[]> = {
  "math-number-systems": [
    (r, say) => {
      const g = int(r, 2, 12);
      const [m, n] = pick(r, [[2, 3], [3, 4], [4, 5], [5, 7], [2, 5], [3, 7]]);
      return { type: "math.hcf-lcm", prompt: say(`Find the HCF of ${g * m} and ${g * n}.`, `Trouve le PGCD de ${g * m} et ${g * n}.`), answer: g, format: "numeric" };
    },
    (r, say) => {
      const [a, b, c] = [int(r, 2, 9), int(r, 2, 6), int(r, 2, 9)];
      const d = int(r, 1, c - 1 || 1);
      return { type: "math.arithmetic", prompt: say(`Simplify: ${a} + ${b} × (${c} - ${d})`, `Calcule : ${a} + ${b} × (${c} - ${d})`), answer: a + b * (c - d), format: "numeric" };
    },
  ],
  "math-algebraic-expressions": [
    (r, say) => {
      const a = int(r, 1, 9) * pick(r, [1, -1]);
      const b = int(r, 1, 9) * pick(r, [1, -1]);
      const s = (k: number) => (k < 0 ? `- ${-k}` : `+ ${k}`);
      return { type: "math.expand", prompt: say(`Expand (x ${s(a)})(x ${s(b)})`, `Développe (x ${s(a)})(x ${s(b)})`), answer: `x^2 + ${a + b}x + ${a * b}`, format: "expression" };
    },
  ],
  "math-linear-equations": [
    (r, say) => {
      const x = int(r, -9, 12);
      const a = int(r, 2, 9);
      const b = int(r, -20, 20);
      const rhs = a * x + b;
      const s = b < 0 ? `- ${-b}` : `+ ${b}`;
      return { type: "math.linear-equation", prompt: say(`Solve for x: ${a}x ${s} = ${rhs}`, `Résous : ${a}x ${s} = ${rhs}`), answer: x, format: "numeric" };
    },
    (r, say) => {
      const [x, y] = [int(r, 1, 9), int(r, 1, 9)];
      return { type: "math.linear-system", prompt: say(`Solve x + y = ${x + y} and x - y = ${x - y}. What is x?`, `Résous x + y = ${x + y} et x - y = ${x - y}. Que vaut x ?`), answer: x, format: "numeric" };
    },
  ],
  "math-ratio-percentage": [
    (r, say) => {
      const p = pick(r, [5, 10, 12, 15, 20, 25, 30, 40, 75]);
      const base = int(r, 2, 40) * 20;
      return { type: "math.percent-of", prompt: say(`What is ${p}% of ${base}?`, `Calcule ${p} % de ${base}`), answer: (p * base) / 100, format: "numeric" };
    },
    (r, say) => {
      const [m, n] = pick(r, [[2, 3], [3, 4], [1, 4], [3, 5], [2, 7]]);
      const unit = int(r, 5, 60) * 10;
      return { type: "math.ratio-share", prompt: say(`Share ${unit * (m + n)} in the ratio ${m}:${n}. What is the larger share?`, `Partage ${unit * (m + n)} dans le rapport ${m}:${n}. Quelle est la plus grande part ?`), answer: unit * Math.max(m, n), format: "numeric" };
    },
    (r, say) => {
      const P = int(r, 2, 20) * 500;
      const R = pick(r, [4, 5, 6, 8, 10]);
      const T = int(r, 2, 5);
      return { type: "math.simple-interest", prompt: say(`Find the simple interest on ${P} at ${R}% for ${T} years.`, `Calcule les intérêts simples sur ${P} à ${R} % pendant ${T} ans.`), answer: (P * R * T) / 100, format: "numeric" };
    },
  ],
  "math-geometry-triangles": [
    (r, say) => {
      const [a, b, c] = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [7, 24, 25]]);
      const k = int(r, 1, 3);
      return { type: "math.pythagoras", prompt: say(`A right triangle has legs ${a * k} cm and ${b * k} cm. Find the hypotenuse.`, `Un triangle rectangle a des côtés de ${a * k} cm et ${b * k} cm. Calcule l'hypoténuse.`), answer: c * k, format: "numeric" };
    },
    (r, say) => {
      const a = int(r, 20, 90);
      const b = int(r, 20, 160 - a);
      return { type: "math.triangle-angle", prompt: say(`Two angles of a triangle are ${a}° and ${b}°. Find the third angle.`, `Deux angles d'un triangle mesurent ${a}° et ${b}°. Trouve le troisième angle du triangle.`), answer: 180 - a - b, format: "numeric" };
    },
  ],
  "math-mensuration": [
    (r, say) => {
      const [l, w] = [int(r, 2, 30), int(r, 2, 20)];
      return { type: "math.mensuration", prompt: say(`Find the area of a rectangle ${l} cm by ${w} cm.`, `Calcule l'aire d'un rectangle de ${l} cm par ${w} cm.`), answer: l * w, format: "numeric" };
    },
    (r, say) => {
      const rad = int(r, 1, 14);
      // Tolerance admits π, 22/7 and 3.14, whichever the class uses.
      return { type: "math.mensuration", prompt: say(`Find the area of a circle with radius ${rad} cm.`, `Calcule l'aire d'un disque de rayon ${rad} cm.`), answer: Math.PI * rad * rad, format: "numeric", tolerance: 0.006 };
    },
    (r, say) => {
      const [rad, h] = [int(r, 1, 10), int(r, 2, 20)];
      return { type: "math.mensuration", prompt: say(`Find the volume of a cylinder with radius ${rad} cm and height ${h} cm.`, `Calcule le volume d'un cylindre de rayon ${rad} cm et de hauteur ${h} cm.`), answer: Math.PI * rad * rad * h, format: "numeric", tolerance: 0.006 };
    },
  ],
  "math-data-probability": [
    (r, say) => {
      const mean = int(r, 5, 30);
      const offsets = pick(r, [[-3, -1, 0, 1, 3], [-4, -2, 0, 2, 4], [-5, 0, 1, 2, 2], [-6, -1, 1, 2, 4]]);
      const data = offsets.map((o) => mean + o).sort(() => r() - 0.5);
      return { type: "math.averages", prompt: say(`Find the mean of ${data.join(", ")}.`, `Calcule la moyenne de ${data.join(", ")}.`), answer: mean, format: "numeric" };
    },
    (r, say) => {
      const [red, blue] = [int(r, 1, 9), int(r, 1, 9)];
      return { type: "math.probability", prompt: say(`A bag has ${red} red and ${blue} blue balls. What is the probability of picking a red ball?`, `Un sac contient ${red} boules rouges et ${blue} boules bleues. Quelle est la probabilité de tirer une boule rouge ?`), answer: red / (red + blue), format: "numeric", tolerance: 0.01 };
    },
  ],
};

/**
 * Formulas worth generating practice for. Universal gravitation is left out:
 * with classroom-sized numbers it gives forces of 10⁻¹³ N, which teaches
 * nothing. Fahrenheit is left out as rarely examined.
 */
const GENERATABLE = (id: string) => id !== "gravitation" && id !== "celsius-fahrenheit";

/** Sensible ranges, in SI, for generated physics values. */
const RANGES: Partial<Record<QuantityId, [number, number, number]>> = {
  distance: [5, 500, 5], time: [2, 60, 1], speed: [2, 30, 1], acceleration: [1, 6, 1], mass: [1, 60, 1],
  force: [10, 600, 10], momentum: [5, 200, 5], energy: [100, 5000, 50], power: [20, 2000, 20],
  density: [500, 9000, 100], volume: [1, 10, 1], area: [1, 20, 1], pressure: [100, 5000, 100],
  voltage: [2, 24, 1], current: [1, 10, 1], resistance: [2, 50, 1], charge: [5, 200, 5],
  specificHeat: [400, 4200, 100], temperatureChange: [5, 80, 5], celsius: [0, 100, 5], angle: [20, 60, 5], ratio: [1.3, 1.6, 0.1],
};

function physicsQuestion(chapterId: string, rand: Rand, say: Say): Generated & { explain: () => SolveOutcome } {
  const pool = FORMULAS.filter((f) => f.chapterId === chapterId && GENERATABLE(f.id));
  const formula = pick(rand, pool);
  const values: Record<string, number> = {};
  for (const v of formula.vars.slice(1)) {
    if (v.default) {
      values[v.sym] = v.default.value;
      continue;
    }
    const [lo, hi, step] = RANGES[v.quantity] ?? [1, 10, 1];
    values[v.sym] = Number((lo + step * Math.floor(rand() * ((hi - lo) / step + 1))).toFixed(2));
  }
  // u below v keeps the motion sensible; light in glass or water is ~2 × 10⁸ m/s.
  if ("u" in values && "v" in values && values.u > values.v) [values.u, values.v] = [values.v, values.u];
  if (formula.id === "refractive-index") values.v = pick(rand, [1.95e8, 2e8, 2.25e8, 2.4e8]);
  values[formula.vars[0].sym] = formula.solve[formula.vars[0].sym][1](values);
  const askable = formula.vars.filter((v) => !v.default && formula.solve[v.sym]);
  const target = pick(rand, askable);
  // Round the shown values to 3 significant figures, then compute the answer
  // from exactly what is shown.
  const shown: Record<string, Known> = {};
  for (const v of formula.vars) {
    if (v.sym === target.sym) continue;
    const value = Number(values[v.sym].toPrecision(3));
    shown[v.sym] = { value, quantity: v.quantity, raw: `${formatNumber(value)} ${SI_UNIT[v.quantity]}`, unit: null, index: 0, note: v.default ? say(...v.default.note) : undefined };
  }
  const answer = formula.solve[target.sym][1](Object.fromEntries(Object.entries(shown).map(([k, s]) => [k, s.value])));
  const givens = formula.vars.filter((v) => v.sym !== target.sym && !v.default).map((v) => `${say(...v.name)} = ${shown[v.sym].raw}`);
  const unit = SI_UNIT[target.quantity];
  return {
    type: `physics.${formula.id}`,
    prompt: `${say("Using", "Avec")} ${formula.equation}: ${givens.join(", ")}. ${say("Find the", "Calcule")} ${say(...target.name)}${unit ? ` (${unit})` : ""}.`,
    answer,
    format: "numeric",
    tolerance: 0.01,
    explain: () => solveFormula(formula, target.sym, shown, say),
  };
}

function explanationOf(outcome: SolveOutcome, say: Say): string {
  if (outcome.kind !== "solved") return say("Worked solution unavailable for this question.", "Solution détaillée indisponible pour cette question.");
  const r = outcome.result;
  return `${r.steps.join("\n")}\n${say("Answer", "Réponse")}: ${r.answer}\n${r.check.detail}`;
}

/** Fresh numerical questions for a chapter; empty when the chapter has none. */
export function generatePractice(chapterId: string, lang: Lang, count: number, rand: Rand = Math.random): PracticeQuestion[] {
  const say = sayIn(lang);
  const mathGens = MATH_GENERATORS[chapterId];
  const isPhysics = FORMULAS.some((f) => f.chapterId === chapterId && GENERATABLE(f.id));
  if (!mathGens && !isPhysics) return [];
  const out: PracticeQuestion[] = [];
  for (let i = 0; i < count; i++) {
    let g: Generated;
    let explanation: string;
    if (mathGens) {
      g = mathGens[i % mathGens.length](rand, say);
      explanation = explanationOf(solveMaths(g.prompt, lang), say);
    } else {
      const p = physicsQuestion(chapterId, rand, say);
      g = p;
      explanation = explanationOf(p.explain(), say);
    }
    out.push({
      id: `gen:${g.type}:${i}`,
      chapterId,
      format: g.format,
      prompt: g.prompt,
      answer:
        typeof g.answer === "number"
          ? String(Number(g.answer.toPrecision(12)))
          : g.format === "expression"
            ? formatPoly(toPoly(parse(g.answer)))
            : g.answer,
      tolerance: g.tolerance,
      explanation,
      lang,
      source: "generated",
    });
  }
  return out;
}

/** Chapters with generated practice, for the coverage view. */
export function generatedTypesFor(chapterId: string): number {
  return MATH_GENERATORS[chapterId]?.length ?? FORMULAS.filter((f) => f.chapterId === chapterId && GENERATABLE(f.id)).length;
}
