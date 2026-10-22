import { Fraction, formatNumber, gcd } from "../../math/fraction";
import {
  ParseError,
  addPoly,
  coeff,
  degreeOf,
  denominatorLcm,
  evaluate,
  evaluateFloat,
  formatNode,
  formatPoly,
  hasVariables,
  monoOf,
  mulPoly,
  parse,
  scalePoly,
  toPoly,
  variablesOf,
  type Node,
  type Poly,
} from "../../math/expr";
import { UNRECOGNISED, invalid, solved, type Say, type SolveOutcome } from "../types";

/**
 * Equations, systems, expansion, factorising and order of operations.
 *
 * Every answer is checked by a route that does not share the solver's
 * algebra: an equation's solution is substituted into the ORIGINAL equation
 * as typed (brackets and fractions included) and both sides evaluated; an
 * expansion is compared with the unexpanded expression at several values.
 */

/* ------------------------------------------------------------------ *
 * Reading the question
 * ------------------------------------------------------------------ */

/**
 * Strip the words around an equation: "Solve for x: 3x + 7 = 22." becomes
 * "3x + 7 = 22". Runs of two or more letters are words; single letters are
 * variables and stay.
 */
export function mathOnly(text: string): string {
  return text
    // "solve for x", "find y", "pour x": the letter names the unknown, it is
    // not part of the equation. Kept, it would multiply into it.
    .replace(/\b(?:for|find|pour|trouve[rz]?|in terms of|en fonction de)\s+[a-z]\b/gi, " ")
    .replace(/[A-Za-zÀ-ÿ']{2,}/g, " ")
    .replace(/[?!:;]/g, " ")
    .replace(/\.(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Each "left = right" in the text, parsed. Clauses split on , ; "and" "et" and newlines. */
export function findEquations(text: string): Array<{ L: Node; R: Node; text: string }> {
  const out: Array<{ L: Node; R: Node; text: string }> = [];
  // Sentence ends split too: in "x - y = 2. What is x?" the second x is the
  // question, not part of the equation. A decimal point has no space after it.
  for (const segment of text.split(/[,;\n?]|\.(?=\s|$)|\band\b|\bet\b/i)) {
    if ((segment.match(/=/g) ?? []).length !== 1) continue;
    const [left, right] = mathOnly(segment).split("=");
    if (!left?.trim() || !right?.trim()) continue;
    try {
      out.push({ L: parse(left), R: parse(right), text: `${left.trim()} = ${right.trim()}` });
    } catch {
      // Not every clause with "=" is an equation we can read; skip it.
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * One equation: linear or quadratic
 * ------------------------------------------------------------------ */

export function solveEquation(text: string, say: Say): SolveOutcome {
  const eqs = findEquations(text);
  if (eqs.length === 2) return solveSystem(eqs, say);
  if (eqs.length !== 1) return UNRECOGNISED;
  const { L, R } = eqs[0];

  let lp: Poly;
  let rp: Poly;
  try {
    lp = toPoly(L);
    rp = toPoly(R);
  } catch (err) {
    return invalid("math.equation", err instanceof Error ? err.message : String(err));
  }
  const diff = addPoly(lp, rp, -1);
  const vars = [...new Set([...variablesOf(lp), ...variablesOf(rp)])];
  if (vars.length === 0) return UNRECOGNISED;
  if (vars.length > 1) {
    return invalid(
      "math.equation",
      say(
        `This equation has ${vars.length} unknowns (${vars.join(", ")}). Give a second equation to solve for two unknowns.`,
        `Cette équation a ${vars.length} inconnues (${vars.join(", ")}). Donne une deuxième équation pour trouver deux inconnues.`
      )
    );
  }
  const v = vars[0];
  const degree = degreeOf(diff, v);
  if (degree === 0) {
    const holds = diff.size === 0;
    return invalid(
      "math.linear-equation",
      holds
        ? say(
            `Both sides are always equal, so every value of ${v} is a solution.`,
            `Les deux membres sont toujours égaux : toute valeur de ${v} est solution.`
          )
        : say(
            `The ${v} terms cancel and leave a false statement, so there is no solution.`,
            `Les termes en ${v} s'annulent et il reste une égalité fausse : il n'y a pas de solution.`
          )
    );
  }
  if (degree === 1) return linear(L, R, lp, rp, v, say);
  if (degree === 2) return quadratic(L, R, diff, v, say);
  return invalid(
    "math.equation",
    say(
      `This is a degree-${degree} equation. The offline solver handles linear and quadratic equations.`,
      `C'est une équation de degré ${degree}. Le solveur hors ligne traite les équations du premier et du second degré.`
    )
  );
}

function linear(L: Node, R: Node, lp: Poly, rp: Poly, v: string, say: Say): SolveOutcome {
  const steps: string[] = [`${say("Equation", "Équation")}: ${formatNode(L)} = ${formatNode(R)}`];

  const simplified = `${formatPoly(lp)} = ${formatPoly(rp)}`;
  if (simplified !== `${formatNode(L)} = ${formatNode(R)}`) {
    steps.push(`${say("Expand the brackets and simplify each side", "Développe et réduis chaque membre")}: ${simplified}`);
  }

  const lcd = lcmInt(denominatorLcm(lp), denominatorLcm(rp));
  if (lcd > 1) {
    lp = scalePoly(lp, new Fraction(lcd));
    rp = scalePoly(rp, new Fraction(lcd));
    steps.push(
      `${say(`Multiply both sides by ${lcd} to clear the fractions`, `Multiplie les deux membres par ${lcd} pour supprimer les fractions`)}: ${formatPoly(lp)} = ${formatPoly(rp)}`
    );
  }

  const a1 = coeff(lp, v);
  const b1 = coeff(lp, "");
  const a2 = coeff(rp, v);
  const b2 = coeff(rp, "");
  const a = a1.sub(a2);
  const c = b2.sub(b1);

  if (!a2.isZero() || !b1.isZero()) {
    steps.push(
      `${say(`Move the ${v} terms to the left and the numbers to the right`, `Regroupe les termes en ${v} à gauche et les nombres à droite`)}: ` +
        `${formatPoly(new Map([[v, a]]))} = ${c}`
    );
  }
  const x = c.div(a);
  if (!a.equals(new Fraction(1))) {
    steps.push(`${say(`Divide both sides by ${a}`, `Divise les deux membres par ${a}`)}: ${v} = ${x}`);
  }

  const left = evaluate(L, { [v]: x });
  const right = evaluate(R, { [v]: x });
  const passed = left.equals(right);
  return solved({
    problemType: "math.linear-equation",
    title: say("Linear equation", "Équation du premier degré"),
    steps,
    answer: `${v} = ${x.pretty()}`,
    value: x.value(),
    check: {
      passed,
      detail: say(
        `Substitute ${v} = ${x} into the original equation: left side = ${left}, right side = ${right}${passed ? " ✓" : " ✗"}`,
        `On remplace ${v} par ${x} dans l'équation de départ : membre de gauche = ${left}, membre de droite = ${right}${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "An equation stays true when you do the same thing to both sides. Collect the unknown on one side, the numbers on the other, then divide by the unknown's coefficient.",
      "Une équation reste vraie si l'on fait la même opération sur les deux membres. On regroupe l'inconnue d'un côté, les nombres de l'autre, puis on divise par le coefficient de l'inconnue."
    ),
  });
}

function quadratic(L: Node, R: Node, diff: Poly, v: string, say: Say): SolveOutcome {
  const steps: string[] = [`${say("Equation", "Équation")}: ${formatNode(L)} = ${formatNode(R)}`];
  let p = scalePoly(diff, new Fraction(denominatorLcm(diff)));
  if (coeff(p, `${v}^2`).n < 0) p = scalePoly(p, new Fraction(-1));
  steps.push(`${say("Rearrange into the form ax² + bx + c = 0", "Écris-la sous la forme ax² + bx + c = 0")}: ${formatPoly(p)} = 0`);

  const a = coeff(p, `${v}^2`).value();
  const b = coeff(p, v).value();
  const c = coeff(p, "").value();
  steps.push(`a = ${a}, b = ${b}, c = ${c}`);
  const D = b * b - 4 * a * c;
  steps.push(`${say("Discriminant", "Discriminant")}: D = b² - 4ac = (${b})² - 4 × ${a} × (${c}) = ${D}`);

  const check = (root: number) => {
    const l = evaluateFloat(L, { [v]: root });
    const r = evaluateFloat(R, { [v]: root });
    return Math.abs(l - r) <= 1e-9 * (1 + Math.abs(l) + Math.abs(r));
  };

  if (D < 0) {
    steps.push(say("D is negative, so there is no real square root of D.", "D est négatif : D n'a pas de racine carrée réelle."));
    // Independent of D: the parabola's turning point c - b²/4a has the same
    // sign as a, so the curve never reaches zero.
    const vertex = c - (b * b) / (4 * a);
    const passed = Math.sign(vertex) === Math.sign(a) && vertex !== 0;
    return solved({
      problemType: "math.quadratic-equation",
      title: say("Quadratic equation", "Équation du second degré"),
      steps,
      answer: say("No real solutions", "Pas de solution réelle"),
      check: {
        passed,
        detail: say(
          `The lowest point of ${formatPoly(p)} is ${formatNumber(vertex, 3)}, above zero, so it never equals 0${passed ? " ✓" : " ✗"}`,
          `Le minimum de ${formatPoly(p)} vaut ${formatNumber(vertex, 3)}, au-dessus de zéro : il ne s'annule jamais${passed ? " ✓" : " ✗"}`
        ),
      },
      concept: say(
        "For ax² + bx + c = 0, the discriminant D = b² - 4ac decides how many real solutions there are: two if D > 0, one if D = 0, none if D < 0.",
        "Pour ax² + bx + c = 0, le discriminant D = b² - 4ac indique le nombre de solutions réelles : deux si D > 0, une si D = 0, aucune si D < 0."
      ),
    });
  }

  const root = Math.sqrt(D);
  let answer: string;
  let roots: number[];
  if (Number.isInteger(root)) {
    const r1 = new Fraction(-b + root, 2 * a);
    const r2 = new Fraction(-b - root, 2 * a);
    roots = [r1.value(), r2.value()];
    if (D === 0) {
      steps.push(`${say("D = 0, so there is one repeated solution", "D = 0 : il y a une solution double")}: ${v} = -b / 2a = ${r1}`);
      answer = `${v} = ${r1.pretty()}`;
    } else {
      steps.push(`√D = ${root}`);
      steps.push(`${v} = (-b ± √D) / 2a = (${-b} ± ${root}) / ${2 * a}`);
      answer = `${v} = ${r1.pretty()} ${say("or", "ou")} ${v} = ${r2.pretty()}`;
    }
  } else {
    // Simplify √D to k√m.
    let k = 1;
    let m = D;
    for (let f = Math.floor(Math.sqrt(D)); f > 1; f--) {
      if (D % (f * f) === 0) {
        k = f;
        m = D / (f * f);
        break;
      }
    }
    const g = gcd(gcd(Math.abs(b), k), Math.abs(2 * a));
    const surd = `${k / g === 1 ? "" : k / g}√${m}`;
    const top = -b / g === 0 ? `±${surd}` : `${-b / g} ± ${surd}`;
    const exact = 2 * a / g === 1 ? top : `(${top}) / ${(2 * a) / g}`;
    roots = [(-b + root) / (2 * a), (-b - root) / (2 * a)];
    steps.push(`√D = √${D}${k > 1 ? ` = ${k}√${m}` : ""}`);
    steps.push(`${v} = (-b ± √D) / 2a = ${exact}`);
    answer = `${v} = ${exact} ≈ ${formatNumber(roots[0], 3)} ${say("or", "ou")} ${formatNumber(roots[1], 3)}`;
  }

  const passed = roots.every(check);
  return solved({
    problemType: "math.quadratic-equation",
    title: say("Quadratic equation", "Équation du second degré"),
    steps,
    answer,
    value: roots[0],
    check: {
      passed,
      detail: say(
        `Each solution substituted into the original equation makes both sides equal${passed ? " ✓" : " ✗"}`,
        `Chaque solution, remplacée dans l'équation de départ, rend les deux membres égaux${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "For ax² + bx + c = 0, the discriminant D = b² - 4ac decides how many real solutions there are: two if D > 0, one if D = 0, none if D < 0. The solutions are x = (-b ± √D) / 2a.",
      "Pour ax² + bx + c = 0, le discriminant D = b² - 4ac indique le nombre de solutions réelles : deux si D > 0, une si D = 0, aucune si D < 0. Les solutions sont x = (-b ± √D) / 2a."
    ),
  });
}

/* ------------------------------------------------------------------ *
 * Two equations, two unknowns
 * ------------------------------------------------------------------ */

function solveSystem(eqs: Array<{ L: Node; R: Node }>, say: Say): SolveOutcome {
  let rows: Array<{ a: Fraction; b: Fraction; c: Fraction }>;
  let vars: string[];
  try {
    const diffs = eqs.map(({ L, R }) => addPoly(toPoly(L), toPoly(R), -1));
    vars = [...new Set(diffs.flatMap(variablesOf))].sort();
    if (vars.length !== 2 || diffs.some((d) => degreeOf(d) !== 1)) {
      return invalid(
        "math.linear-system",
        say(
          "The offline solver handles two linear equations in two unknowns.",
          "Le solveur hors ligne traite deux équations du premier degré à deux inconnues."
        )
      );
    }
    rows = diffs.map((d) => {
      const s = scalePoly(d, new Fraction(denominatorLcm(d)));
      return { a: coeff(s, vars[0]), b: coeff(s, vars[1]), c: coeff(s, "").neg() };
    });
  } catch (err) {
    return invalid("math.linear-system", err instanceof Error ? err.message : String(err));
  }

  const [x, y] = vars;
  const [r1, r2] = rows;
  const show = (r: { a: Fraction; b: Fraction; c: Fraction }) =>
    `${formatPoly(new Map([[x, r.a], [y, r.b]]))} = ${r.c}`;
  const steps = [
    `${say("Write both equations as ax + by = c", "Écris les deux équations sous la forme ax + by = c")}: (1) ${show(r1)}   (2) ${show(r2)}`,
  ];

  const det = r1.a.mul(r2.b).sub(r2.a.mul(r1.b));
  if (det.isZero()) {
    const consistent = r1.a.mul(r2.c).sub(r2.a.mul(r1.c)).isZero() && r1.b.mul(r2.c).sub(r2.b.mul(r1.c)).isZero();
    return invalid(
      "math.linear-system",
      `${steps[0]}\n${
        consistent
          ? say(
              "The two equations describe the same line, so there are infinitely many solutions.",
              "Les deux équations décrivent la même droite : il y a une infinité de solutions."
            )
          : say(
              "The two lines are parallel, so there is no solution.",
              "Les deux droites sont parallèles : il n'y a pas de solution."
            )
      }`
    );
  }

  // Eliminate y: scale each equation so the y coefficients match, then subtract.
  const xv = r1.c.mul(r2.b).sub(r2.c.mul(r1.b)).div(det);
  if (!r1.b.isZero() && !r2.b.isZero()) {
    const s1 = r2.b;
    const s2 = r1.b;
    const scaled = (r: typeof r1, s: Fraction) => ({ a: r.a.mul(s), b: r.b.mul(s), c: r.c.mul(s) });
    steps.push(
      `${say(`Multiply (1) by ${s1} and (2) by ${s2} so the ${y} terms match`, `Multiplie (1) par ${s1} et (2) par ${s2} pour égaliser les termes en ${y}`)}: ` +
        `${show(scaled(r1, s1))}   ${show(scaled(r2, s2))}`
    );
    steps.push(
      `${say(`Subtract to eliminate ${y}`, `Soustrais pour éliminer ${y}`)}: ${formatPoly(new Map([[x, det]]))} = ${r1.c.mul(s1).sub(r2.c.mul(s2))}, ${say("so", "donc")} ${x} = ${xv}`
    );
  } else {
    const row = r1.b.isZero() ? r1 : r2;
    steps.push(`${say(`Equation ${row === r1 ? 1 : 2} has no ${y} term`, `L'équation ${row === r1 ? 1 : 2} n'a pas de terme en ${y}`)}: ${x} = ${xv}`);
  }

  const sub = r1.b.isZero() ? r2 : r1;
  const yv = sub.c.sub(sub.a.mul(xv)).div(sub.b);
  steps.push(
    `${say(`Substitute ${x} = ${xv} into (${sub === r1 ? 1 : 2})`, `Remplace ${x} par ${xv} dans (${sub === r1 ? 1 : 2})`)}: ` +
      `${formatPoly(new Map([[y, sub.b]]))} = ${sub.c} - (${sub.a.mul(xv)}), ${say("so", "donc")} ${y} = ${yv}`
  );

  const env = { [x]: xv, [y]: yv };
  const passed = eqs.every(({ L, R }) => evaluate(L, env).equals(evaluate(R, env)));
  return solved({
    problemType: "math.linear-system",
    title: say("Two equations, two unknowns", "Système de deux équations"),
    steps,
    answer: `${x} = ${xv.pretty()}, ${y} = ${yv.pretty()}`,
    value: xv.value(),
    check: {
      passed,
      detail: say(
        `${x} = ${xv}, ${y} = ${yv} make both original equations true${passed ? " ✓" : " ✗"}`,
        `${x} = ${xv}, ${y} = ${yv} vérifient les deux équations de départ${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "Elimination: scale the equations so one unknown has the same coefficient in both, subtract to remove it, solve for the other, then substitute back.",
      "Méthode par combinaison : on multiplie les équations pour qu'une inconnue ait le même coefficient, on soustrait pour l'éliminer, on trouve l'autre, puis on remplace."
    ),
  });
}

/* ------------------------------------------------------------------ *
 * Expand and simplify
 * ------------------------------------------------------------------ */

const EXPAND = /\b(expand|simplify|multiply out|d[ée]velopp|r[ée]dui|simplifi)/i;

export function solveExpand(text: string, say: Say): SolveOutcome {
  if (!EXPAND.test(text) || text.includes("=")) return UNRECOGNISED;
  const exprText = mathOnly(text.replace(EXPAND, " "));
  let tree: Node;
  try {
    tree = parse(exprText);
  } catch {
    return UNRECOGNISED;
  }
  if (!hasVariables(tree)) return UNRECOGNISED;

  let poly: Poly;
  try {
    poly = toPoly(tree);
  } catch (err) {
    return invalid("math.expand", err instanceof Error ? err.message : String(err));
  }

  const steps = [`${say("Expression", "Expression")}: ${formatNode(tree)}`];
  const product = asProduct(tree);
  if (product) {
    const [pa, pb] = product.map(toPoly);
    const parts: string[] = [];
    for (const [ka, va] of pa) {
      for (const [kb, vb] of pb) {
        const one = new Map([[ka, va]]);
        const two = new Map([[kb, vb]]);
        parts.push(`${bracket(formatPoly(one))} × ${bracket(formatPoly(two))} = ${formatPoly(mulPoly(one, two))}`);
      }
    }
    if (product.square) steps.push(`${formatNode(tree)} = ${bracket(formatNode(product[0]))}${bracket(formatNode(product[1]))}`);
    steps.push(`${say("Multiply every term in the first bracket by every term in the second", "Multiplie chaque terme de la première parenthèse par chaque terme de la seconde")}: ${parts.join(";  ")}`);
    steps.push(`${say("Add the results and combine like terms", "Additionne les résultats et réduis les termes semblables")}: ${formatPoly(poly)}`);
  } else {
    steps.push(`${say("Expand every bracket and combine like terms", "Développe chaque parenthèse et réduis les termes semblables")}: ${formatPoly(poly)}`);
  }

  const passed = agreesEverywhere(tree, poly);
  return solved({
    problemType: "math.expand",
    title: say("Expanding and simplifying", "Développer et réduire"),
    steps,
    answer: formatPoly(poly),
    check: {
      passed,
      detail: say(
        `The original expression and the answer give the same value for several test values of the letters${passed ? " ✓" : " ✗"}`,
        `L'expression de départ et le résultat donnent la même valeur pour plusieurs valeurs test des lettres${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "Expanding multiplies every term in one bracket by every term in the other. Like terms (same letters, same powers) are then added. Identities such as (a + b)² = a² + 2ab + b² are shortcuts for the same process.",
      "Développer, c'est multiplier chaque terme d'une parenthèse par chaque terme de l'autre, puis réduire les termes semblables. Les identités comme (a + b)² = a² + 2ab + b² sont des raccourcis du même calcul."
    ),
  });
}

function bracket(s: string): string {
  return /[+\- ]/.test(s.slice(1)) || s.startsWith("-") ? `(${s})` : s;
}

/** (p)(q) or (p)² at the top of the tree, for the term-by-term table. */
function asProduct(n: Node): (Node[] & { square?: boolean }) | null {
  if (n.k === "bin" && n.op === "*") return [n.a, n.b];
  if (n.k === "pow" && n.e === 2) return Object.assign([n.a, n.a], { square: true });
  return null;
}

/** Evaluate the tree and the polynomial independently at several points. */
function agreesEverywhere(tree: Node, poly: Poly): boolean {
  const vars = [...new Set([...collectVars(tree), ...variablesOf(poly)])];
  const samples = [
    [2, 3, 5],
    [-1, 4, 7],
    [0.5, -3, 11],
  ];
  return samples.every((vals) => {
    const env = Object.fromEntries(vars.map((v, i) => [v, vals[i % vals.length] + i]));
    const a = evaluateFloat(tree, env);
    let b = 0;
    for (const [k, c] of poly) {
      let term = c.value();
      for (const [v, e] of Object.entries(monoOf(k))) term *= env[v] ** e;
      b += term;
    }
    return Math.abs(a - b) <= 1e-9 * (1 + Math.abs(a));
  });
}

function collectVars(n: Node, out = new Set<string>()): Set<string> {
  if (n.k === "var") out.add(n.name);
  if (n.k === "neg" || n.k === "pow") collectVars(n.a, out);
  if (n.k === "bin") {
    collectVars(n.a, out);
    collectVars(n.b, out);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Factorise
 * ------------------------------------------------------------------ */

const FACTORISE = /\b(factori[sz]e|factor|factoris)/i;

export function solveFactorise(text: string, say: Say): SolveOutcome {
  if (!FACTORISE.test(text) || text.includes("=")) return UNRECOGNISED;
  // "Factorise 360" is prime factorisation, handled elsewhere.
  const exprText = mathOnly(text.replace(FACTORISE, " "));
  let poly: Poly;
  let tree: Node;
  try {
    tree = parse(exprText);
    if (!hasVariables(tree)) return UNRECOGNISED;
    poly = toPoly(tree);
  } catch {
    return UNRECOGNISED;
  }
  const vars = variablesOf(poly);
  const steps = [`${say("Expression", "Expression")}: ${formatPoly(poly)}`];

  // Common factor first: the largest number and the lowest power of each letter in every term.
  const ints = [...poly.values()].every((c) => c.isInteger());
  let g = ints ? [...poly.values()].reduce((acc, c) => gcd(acc, Math.abs(c.n)), 0) : 1;
  if ([...poly.values()].every((c) => c.n < 0)) g = -g;
  const minPow: Record<string, number> = {};
  for (const v of vars) minPow[v] = Math.min(...[...poly.keys()].map((k) => monoOf(k)[v] ?? 0));
  const commonKey = Object.entries(minPow)
    .filter(([, e]) => e > 0)
    .map(([v, e]) => (e === 1 ? v : `${v}^${e}`))
    .join("*");
  const common: Poly = new Map([[commonKey, new Fraction(g || 1)]]);
  let rest = divideByMonomial(poly, commonKey, new Fraction(g || 1));
  const factors: Poly[] = [];
  if (formatPoly(common) !== "1") {
    factors.push(common);
    steps.push(`${say("Take out the common factor", "Mets en facteur le facteur commun")} ${formatPoly(common)}: ${formatPoly(common)}(${formatPoly(rest)})`);
  }

  // Then a quadratic in one letter with rational roots.
  if (vars.length >= 1) {
    const restVars = variablesOf(rest);
    if (restVars.length === 1 && degreeOf(rest, restVars[0]) === 2) {
      const v = restVars[0];
      const a = coeff(rest, `${v}^2`);
      const b = coeff(rest, v);
      const c = coeff(rest, "");
      const D = b.mul(b).sub(new Fraction(4).mul(a).mul(c));
      const sq = D.n >= 0 ? rationalSqrt(D) : null;
      if (sq) {
        const r1 = b.neg().add(sq).div(a.mul(new Fraction(2)));
        const r2 = b.neg().sub(sq).div(a.mul(new Fraction(2)));
        // Root p/q gives the factor (qx - p).
        const f1: Poly = addPoly(new Map([[v, new Fraction(r1.d)]]), constPolyOf(new Fraction(-r1.n)));
        const f2: Poly = addPoly(new Map([[v, new Fraction(r2.d)]]), constPolyOf(new Fraction(-r2.n)));
        const k = a.div(new Fraction(r1.d * r2.d));
        steps.push(
          `${say(`Find two numbers for ${formatPoly(rest)}: its roots are`, `Cherche les racines de ${formatPoly(rest)} :`)} ${v} = ${r1} ${say("and", "et")} ${v} = ${r2}`
        );
        if (!k.equals(new Fraction(1))) factors.push(constPolyOf(k));
        factors.push(f1, f2);
        rest = new Map([["", new Fraction(1)]]);
      }
    }
  }
  if (formatPoly(rest) !== "1") factors.push(rest);
  if (factors.length < 2) {
    return invalid(
      "math.factorise",
      say(
        "This expression has no common factor and is not a quadratic with whole-number or fraction roots, so the offline solver cannot factorise it.",
        "Cette expression n'a pas de facteur commun et n'est pas un trinôme à racines rationnelles : le solveur hors ligne ne peut pas la factoriser."
      )
    );
  }

  const answer = factors.map((f) => (f.size > 1 ? `(${formatPoly(f)})` : formatPoly(f))).join("");
  const product = factors.reduce((acc, f) => mulPoly(acc, f), new Map([["", new Fraction(1)]]) as Poly);
  const passed = formatPoly(product) === formatPoly(poly);
  return solved({
    problemType: "math.factorise",
    title: say("Factorising", "Factoriser"),
    steps,
    answer,
    check: {
      passed,
      detail: say(
        `Expanding ${answer} gives back ${formatPoly(product)}${passed ? " ✓" : " ✗"}`,
        `En développant ${answer} on retrouve ${formatPoly(product)}${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "Factorising is expanding in reverse: write the expression as a product. Take out any common factor first; a quadratic with roots r and s factorises as a(x - r)(x - s).",
      "Factoriser, c'est développer à l'envers : écrire l'expression comme un produit. On met d'abord en facteur le facteur commun ; un trinôme de racines r et s s'écrit a(x - r)(x - s)."
    ),
  });
}

function constPolyOf(f: Fraction): Poly {
  return f.isZero() ? new Map() : new Map([["", f]]);
}

function divideByMonomial(p: Poly, key: string, k: Fraction): Poly {
  const sub = monoOf(key);
  const out: Poly = new Map();
  for (const [mk, c] of p) {
    const m = monoOf(mk);
    for (const [v, e] of Object.entries(sub)) m[v] -= e;
    const nk = Object.keys(m)
      .filter((v) => m[v] > 0)
      .sort()
      .map((v) => (m[v] === 1 ? v : `${v}^${m[v]}`))
      .join("*");
    out.set(nk, c.div(k));
  }
  return out;
}

function rationalSqrt(f: Fraction): Fraction | null {
  const n = Math.round(Math.sqrt(f.n));
  const d = Math.round(Math.sqrt(f.d));
  return n * n === f.n && d * d === f.d ? new Fraction(n, d) : null;
}

/* ------------------------------------------------------------------ *
 * Arithmetic: order of operations, fractions, powers
 * ------------------------------------------------------------------ */

const ARITH_WORDS =
  /\b(simplify|evaluate|calculate|compute|work out|what is|find the value of|value of|calcule[rz]?|simplifie[rz]?|combien font|combien fait|effectue[rz]?)\b/gi;

export function solveArithmetic(text: string, say: Say): SolveOutcome {
  if (text.includes("=") && !/=\s*\?*\s*$/.test(text)) return UNRECOGNISED;
  const cleaned = text.replace(ARITH_WORDS, " ").replace(/=\s*\?*\s*$/, "").replace(/[?:]/g, " ").trim();
  if (/[a-wyzA-WYZ]{1}/.test(cleaned.replace(/x/gi, ""))) return UNRECOGNISED;
  if (!/\d\s*[+\-*/^×÷x·−]\s*[\d(]|\^|²|³/.test(cleaned)) return UNRECOGNISED;

  let tree: Node;
  try {
    tree = parse(cleaned.replace(/\.$/, ""), { algebra: false });
  } catch {
    return UNRECOGNISED;
  }
  const log: string[] = [];
  let exact: Fraction;
  try {
    exact = evaluate(tree, {}, log);
  } catch (err) {
    return invalid("math.arithmetic", err instanceof RangeError && err.message === "division by zero"
      ? say("The expression divides by zero, which has no value.", "L'expression divise par zéro, ce qui n'a pas de valeur.")
      : err instanceof Error ? err.message : String(err));
  }
  const float = evaluateFloat(tree);
  const passed = Math.abs(float - exact.value()) <= 1e-9 * (1 + Math.abs(float));
  return solved({
    problemType: "math.arithmetic",
    title: say("Order of operations", "Priorités opératoires"),
    steps: [
      `${say("Expression", "Expression")}: ${formatNode(tree)}`,
      ...log.map((l, i) => `${i + 1}. ${l}`),
    ],
    answer: exact.pretty(),
    value: exact.value(),
    check: {
      passed,
      detail: say(
        `Recomputed independently in decimals: ${formatNumber(float, 6)}${passed ? " ✓" : " ✗"}`,
        `Recalculé indépendamment en décimales : ${formatNumber(float, 6)}${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "Brackets first, then powers, then multiplication and division from left to right, then addition and subtraction from left to right (BODMAS / PEMDAS).",
      "D'abord les parenthèses, puis les puissances, puis multiplications et divisions de gauche à droite, enfin additions et soustractions de gauche à droite."
    ),
  });
}

function lcmInt(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

export { ParseError };
