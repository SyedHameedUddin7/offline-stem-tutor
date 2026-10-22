import { Fraction, formatNumber } from "../../math/fraction";
import { UNRECOGNISED, invalid, numbersIn, solved, type Say, type SolveOutcome } from "../types";

/**
 * Right triangles, angle sums, and coordinate geometry between two points.
 */

/** √n as an exact surd where possible: 25 → "5", 50 → "5√2 ≈ 7.071". */
export function surd(n: number): { exact: string; value: number } {
  const value = Math.sqrt(n);
  if (Number.isInteger(value)) return { exact: String(value), value };
  if (!Number.isInteger(n)) return { exact: `√${formatNumber(n)}`, value };
  for (let f = Math.floor(value); f > 1; f--) {
    if (n % (f * f) === 0) return { exact: `${f}√${n / (f * f)}`, value };
  }
  return { exact: `√${n}`, value };
}

const show = (s: { exact: string; value: number }) =>
  Number.isInteger(s.value) ? s.exact : `${s.exact} ≈ ${formatNumber(s.value, 3)}`;

export function solvePythagoras(text: string, say: Say): SolveOutcome {
  const t = text.toLowerCase();
  if (!/hypot[ée]nuse|pythag|right[- ]angled|right triangle|triangle rectangle/.test(t)) return UNRECOGNISED;
  const nums = numbersIn(t).filter((x) => x !== 90);
  if (nums.length !== 2 || nums.some((x) => x <= 0)) {
    return invalid("math.pythagoras", say("Give exactly two side lengths of the right triangle.", "Donne exactement deux longueurs de côtés du triangle rectangle."));
  }
  const unit = t.match(/\d\s*(mm|cm|km|m)\b/)?.[1] ?? "";
  const u = unit ? ` ${unit}` : "";
  const concept = say(
    "In a right triangle, the square on the hypotenuse (the side opposite the right angle) equals the sum of the squares on the other two sides: c² = a² + b².",
    "Dans un triangle rectangle, le carré de l'hypoténuse (le côté opposé à l'angle droit) est égal à la somme des carrés des deux autres côtés : c² = a² + b²."
  );

  // "hypotenuse is 13", "hypotenuse of 13 cm", "hypotenuse = 13": the hypotenuse is given.
  const given = t.match(/hypot[ée]nuse\s*(?:is|of|=|mesure|vaut|de)?\s*(\d+(?:[.,]\d+)?)/);
  if (given) {
    const c = Number(given[1].replace(",", "."));
    const a = nums.find((x) => x !== c) ?? nums[0];
    if (a >= c) return invalid("math.pythagoras", say("The hypotenuse must be the longest side.", "L'hypoténuse doit être le plus long côté."));
    const b = surd(c * c - a * a);
    const passed = Math.abs(a * a + b.value ** 2 - c * c) <= 1e-9 * c * c;
    return solved({
      problemType: "math.pythagoras",
      title: say("Pythagoras' theorem", "Théorème de Pythagore"),
      steps: [`c² = a² + b²  →  b² = c² - a² = ${c}² - ${a}² = ${c * c - a * a}`, `b = √${c * c - a * a} = ${show(b)}`],
      answer: `${show(b)}${u}`,
      value: b.value,
      check: { passed, detail: `${a}² + ${formatNumber(b.value, 6)}² = ${formatNumber(a * a + b.value ** 2, 6)} = ${c}²${passed ? " ✓" : " ✗"}` },
      concept,
    });
  }

  const [a, b] = nums;
  const c = surd(a * a + b * b);
  const passed = Math.abs(c.value ** 2 - a * a - b * b) <= 1e-9 * (a * a + b * b) && c.value > Math.max(a, b);
  return solved({
    problemType: "math.pythagoras",
    title: say("Pythagoras' theorem", "Théorème de Pythagore"),
    steps: [`c² = a² + b² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}`, `c = √${a * a + b * b} = ${show(c)}`],
    answer: `${show(c)}${u}`,
    value: c.value,
    check: { passed, detail: say(`${formatNumber(c.value, 6)}² = ${formatNumber(c.value ** 2, 6)} = ${a}² + ${b}², and it is longer than both sides`, `${formatNumber(c.value, 6)}² = ${formatNumber(c.value ** 2, 6)} = ${a}² + ${b}², et il est plus long que les deux côtés`) + (passed ? " ✓" : " ✗") },
    concept,
  });
}

export function solveAngles(text: string, say: Say): SolveOutcome {
  const t = text.toLowerCase();

  const comp = t.match(/(complement|suppl[ée]ment)\w*\s+(?:of|de|d')\s*(?:an angle of\s*|un angle de\s*)?(\d+(?:[.,]\d+)?)/);
  if (comp) {
    const total = /compl/.test(comp[1]) ? 90 : 180;
    const x = Number(comp[2].replace(",", "."));
    if (x <= 0 || x >= total) return invalid("math.angles", say(`The angle must be between 0° and ${total}°.`, `L'angle doit être entre 0° et ${total}°.`));
    const out = total - x;
    return solved({
      problemType: "math.angles",
      title: total === 90 ? say("Complementary angles", "Angles complémentaires") : say("Supplementary angles", "Angles supplémentaires"),
      steps: [`${total}° - ${x}° = ${formatNumber(out)}°`],
      answer: `${formatNumber(out)}°`,
      value: out,
      check: { passed: x + out === total, detail: `${x}° + ${formatNumber(out)}° = ${total}° ✓` },
      concept: say("Complementary angles add up to 90°; supplementary angles add up to 180°.", "Deux angles complémentaires ont pour somme 90° ; deux angles supplémentaires, 180°."),
    });
  }

  if (/triangle/.test(t) && /angle/.test(t) && !/hypot|pythag|area|aire|perimeter|p[ée]rim/.test(t)) {
    const nums = numbersIn(t);
    if (nums.length !== 2) return UNRECOGNISED;
    const [a, b] = nums;
    if (a <= 0 || b <= 0 || a + b >= 180) {
      return invalid("math.angles", say("Two angles of a triangle must be positive and add up to less than 180°.", "Deux angles d'un triangle doivent être positifs et de somme inférieure à 180°."));
    }
    const c = 180 - a - b;
    return solved({
      problemType: "math.triangle-angle",
      title: say("Angles in a triangle", "Angles d'un triangle"),
      steps: [`${say("The angles of a triangle add up to 180°", "La somme des angles d'un triangle vaut 180°")}: 180° - ${a}° - ${b}° = ${formatNumber(c)}°`],
      answer: `${formatNumber(c)}°`,
      value: c,
      check: { passed: Math.abs(a + b + c - 180) < 1e-9, detail: `${a}° + ${b}° + ${formatNumber(c)}° = 180° ✓` },
      concept: say("The three interior angles of any triangle add up to 180°.", "Les trois angles d'un triangle ont toujours pour somme 180°."),
    });
  }
  return UNRECOGNISED;
}

export function solveCoordinates(text: string, say: Say): SolveOutcome {
  const pts = [...text.matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  if (pts.length !== 2) return UNRECOGNISED;
  const t = text.toLowerCase();
  const [[x1, y1], [x2, y2]] = pts;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (/distance|length|longueur/.test(t)) {
    const d = surd(dx * dx + dy * dy);
    const passed = Math.abs(d.value ** 2 - (dx * dx + dy * dy)) < 1e-9 * (1 + d.value ** 2);
    return solved({
      problemType: "math.coordinate-distance",
      title: say("Distance between two points", "Distance entre deux points"),
      steps: [
        `d = √((x₂ - x₁)² + (y₂ - y₁)²) = √((${x2} - ${x1})² + (${y2} - ${y1})²) = √(${dx * dx} + ${dy * dy}) = √${dx * dx + dy * dy}`,
        `d = ${show(d)}`,
      ],
      answer: show(d),
      value: d.value,
      check: { passed, detail: say(`Pythagoras on the horizontal and vertical gaps, ${Math.abs(dx)} and ${Math.abs(dy)}, gives the same length`, `Pythagore sur les écarts horizontal et vertical, ${Math.abs(dx)} et ${Math.abs(dy)}, donne la même longueur`) + (passed ? " ✓" : " ✗") },
      concept: say("The distance formula is Pythagoras' theorem applied to the horizontal and vertical gaps between the points.", "La formule de la distance est le théorème de Pythagore appliqué aux écarts horizontal et vertical."),
    });
  }

  if (/mid-?point|milieu/.test(t)) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const d1 = Math.hypot(mx - x1, my - y1);
    const d2 = Math.hypot(x2 - mx, y2 - my);
    const passed = Math.abs(d1 - d2) < 1e-9;
    return solved({
      problemType: "math.coordinate-midpoint",
      title: say("Midpoint", "Milieu d'un segment"),
      steps: [`M = ((x₁ + x₂)/2, (y₁ + y₂)/2) = ((${x1} + ${x2})/2, (${y1} + ${y2})/2)`],
      answer: `(${formatNumber(mx)}, ${formatNumber(my)})`,
      value: mx,
      check: { passed, detail: say(`The midpoint is the same distance (${formatNumber(d1, 3)}) from both points`, `Le milieu est à la même distance (${formatNumber(d1, 3)}) des deux points`) + (passed ? " ✓" : " ✗") },
      concept: say("The midpoint's coordinates are the averages of the two points' coordinates.", "Les coordonnées du milieu sont les moyennes des coordonnées des deux points."),
    });
  }

  if (/slope|gradient|pente|coefficient directeur/.test(t)) {
    if (dx === 0) return invalid("math.coordinate-slope", say("The line is vertical, so its gradient is undefined.", "La droite est verticale : son coefficient directeur n'est pas défini."));
    const m = new Fraction(Math.round(dy * 1e6), Math.round(dx * 1e6));
    const passed = Math.abs(y1 + m.value() * dx - y2) < 1e-9;
    return solved({
      problemType: "math.coordinate-slope",
      title: say("Gradient of a line", "Coefficient directeur"),
      steps: [`m = (y₂ - y₁) / (x₂ - x₁) = (${y2} - ${y1}) / (${x2} - ${x1}) = ${formatNumber(dy)} / ${formatNumber(dx)}`],
      answer: `m = ${m.pretty()}`,
      value: m.value(),
      check: { passed, detail: say(`From (${x1}, ${y1}), moving ${formatNumber(dx)} across at this gradient rises ${formatNumber(m.value() * dx)} to reach y = ${y2}`, `Depuis (${x1}, ${y1}), avancer de ${formatNumber(dx)} avec cette pente fait monter de ${formatNumber(m.value() * dx)} jusqu'à y = ${y2}`) + (passed ? " ✓" : " ✗") },
      concept: say("The gradient is rise over run: how much y changes for each unit increase in x.", "Le coefficient directeur est la variation de y divisée par la variation de x."),
    });
  }
  return UNRECOGNISED;
}
