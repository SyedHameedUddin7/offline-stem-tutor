/**
 * Dimensional analysis for the physics chapters this app actually teaches.
 *
 * Scope is deliberately small. This is not a units library and does not try
 * to solve physics — it catches the specific error a language model makes
 * constantly and a student rarely questions: giving an answer in units that
 * cannot be right for the quantity asked about. "The force is 12 m/s" is
 * wrong before you check a single number, and checking it costs nothing.
 *
 * Dimensions are tracked as exponents of mass, length and time. That is
 * enough for every quantity in the Physics curriculum here (motion, forces,
 * gravitation, work/energy/power, momentum) and stops well short of a
 * general SI implementation, which would be a lot of code for no extra
 * coverage.
 */

/** [mass, length, time] exponents. */
export type Dimension = readonly [number, number, number];

export const DIMENSIONLESS: Dimension = [0, 0, 0];

export const QUANTITY: Record<string, Dimension> = {
  mass: [1, 0, 0],
  distance: [0, 1, 0],
  time: [0, 0, 1],
  area: [0, 2, 0],
  volume: [0, 3, 0],
  velocity: [0, 1, -1],
  acceleration: [0, 1, -2],
  force: [1, 1, -2],
  energy: [1, 2, -2],
  work: [1, 2, -2],
  power: [1, 2, -3],
  momentum: [1, 1, -1],
  density: [1, -3, 0],
  pressure: [1, -1, -2],
  frequency: [0, 0, -1],
};

/** Unit strings a student or a model would actually write. */
const UNIT_DIMENSION: Array<[RegExp, Dimension, string]> = [
  [/^(kg|kilograms?|g|grams?)$/i, QUANTITY.mass, "mass"],
  [/^(m|metres?|meters?|km|cm|mm)$/i, QUANTITY.distance, "distance"],
  [/^(s|sec|seconds?|min|minutes?|h|hours?)$/i, QUANTITY.time, "time"],
  [/^(m\/s|ms\^-1|m s-1|km\/h|kmh)$/i, QUANTITY.velocity, "velocity"],
  [/^(m\/s\^?2|m\/s²|ms\^-2|m s-2)$/i, QUANTITY.acceleration, "acceleration"],
  [/^(n|newtons?)$/i, QUANTITY.force, "force"],
  [/^(j|joules?|kj)$/i, QUANTITY.energy, "energy"],
  [/^(w|watts?|kw)$/i, QUANTITY.power, "power"],
  [/^(kg\s?m\/s|kgms-1)$/i, QUANTITY.momentum, "momentum"],
  [/^(pa|pascals?)$/i, QUANTITY.pressure, "pressure"],
  [/^(hz|hertz)$/i, QUANTITY.frequency, "frequency"],
  [/^(m\^?2|m²)$/i, QUANTITY.area, "area"],
  [/^(m\^?3|m³|litres?|liters?|l)$/i, QUANTITY.volume, "volume"],
];

export function dimensionOfUnit(unit: string): { dimension: Dimension; quantity: string } | null {
  const cleaned = unit.trim().replace(/\s+/g, "");
  for (const [re, dimension, quantity] of UNIT_DIMENSION) {
    if (re.test(cleaned)) return { dimension, quantity };
  }
  return null;
}

export function sameDimension(a: Dimension, b: Dimension): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function formatDimension(d: Dimension): string {
  const parts: string[] = [];
  const names = ["M", "L", "T"];
  d.forEach((exp, i) => {
    if (exp !== 0) parts.push(exp === 1 ? names[i] : `${names[i]}^${exp}`);
  });
  return parts.length ? parts.join("·") : "dimensionless";
}

/**
 * Which quantity a question is asking for.
 *
 * Keyword matching, not comprehension. It is checked against BOTH languages
 * because the tutor answers in whichever the student is using, and a
 * verifier that only works in English would silently stop verifying for
 * half the intended users.
 */
const ASKS_FOR: Array<[RegExp, string]> = [
  [/\b(accelerat|accélérat)/i, "acceleration"],
  [/\b(velocit|speed|vitesse)/i, "velocity"],
  [/\b(force|poids|weight)\b/i, "force"],
  [/\b(kinetic|potential|energy|énergie|travail|work done)/i, "energy"],
  [/\b(power|puissance)\b/i, "power"],
  [/\b(momentum|quantité de mouvement)/i, "momentum"],
  [/\b(mass|masse)\b/i, "mass"],
  [/\b(distance|height|hauteur|displacement)/i, "distance"],
  [/\b(time|temps|how long|combien de temps)/i, "time"],
];

export function expectedQuantity(question: string): string | null {
  for (const [re, quantity] of ASKS_FOR) {
    if (re.test(question)) return quantity;
  }
  return null;
}

/** A numeric value with its unit, as written in an answer. */
const VALUE_WITH_UNIT =
  /(-?\d+(?:\.\d+)?)\s*(m\/s\^?2|m\/s²|m\/s|kg\s?m\/s|km\/h|m\^?[23]|m²|m³|kg|km|cm|mm|N|J|kJ|W|kW|Pa|Hz|g|m|s|h)\b/g;

export interface DimensionReport {
  checked: boolean;
  consistent: boolean;
  expected: string | null;
  found: Array<{ value: number; unit: string; quantity: string }>;
  detail: string;
}

/**
 * Compare the units in an answer against what the question asked for.
 *
 * Only the FINAL value is judged. Intermediate steps legitimately carry
 * other units — computing a force involves a mass and an acceleration —
 * so flagging every unit that is not the target would fire on every
 * correct multi-step answer.
 */
export function checkDimensions(question: string, answer: string): DimensionReport {
  const expected = expectedQuantity(question);
  const found: DimensionReport["found"] = [];

  for (const match of answer.matchAll(VALUE_WITH_UNIT)) {
    const resolved = dimensionOfUnit(match[2]);
    if (resolved) {
      found.push({ value: Number(match[1]), unit: match[2], quantity: resolved.quantity });
    }
  }

  if (!expected || found.length === 0) {
    return {
      checked: false,
      consistent: true,
      expected,
      found,
      detail: !expected ? "no target quantity identified" : "no units found in the answer",
    };
  }

  const last = found[found.length - 1];
  const consistent = last.quantity === expected;

  return {
    checked: true,
    consistent,
    expected,
    found,
    detail: consistent
      ? `final value in ${last.unit} matches the expected ${expected}`
      : `question asks for ${expected} but the final value is ${last.value} ${last.unit}, which is ${last.quantity}`,
  };
}
