import { formatNumber } from "../../math/fraction";
import { UNRECOGNISED, invalid, solved, type Say, type SolveOutcome } from "../types";

/**
 * Areas, perimeters, volumes and surface areas.
 *
 * `measure` is the engine, used directly by the structured form; `solveMensuration`
 * reads a typed question into the same call. Each result is checked against
 * a second formula for the same quantity (a circle's area from its diameter,
 * a cuboid's surface as six separate faces), so a mistyped formula cannot
 * pass its own check.
 */

export type Shape =
  | "square" | "rectangle" | "triangle" | "circle" | "parallelogram" | "trapezium"
  | "cube" | "cuboid" | "cylinder" | "cone" | "sphere" | "hemisphere";
export type Quantity = "area" | "perimeter" | "volume" | "surface" | "curved-surface";

/** Which measurements each shape needs, for the form and for validation. */
export const SHAPE_DIMENSIONS: Record<Shape, string[][]> = {
  square: [["a"]],
  rectangle: [["l", "w"]],
  triangle: [["b", "h"], ["a", "b2", "c"]],
  circle: [["r"], ["d"]],
  parallelogram: [["b", "h"]],
  trapezium: [["a", "b", "h"]],
  cube: [["a"]],
  cuboid: [["l", "w", "h"]],
  cylinder: [["r", "h"]],
  cone: [["r", "h"], ["r", "s"]],
  sphere: [["r"], ["d"]],
  hemisphere: [["r"], ["d"]],
};

export const SHAPE_QUANTITIES: Record<Shape, Quantity[]> = {
  square: ["area", "perimeter"],
  rectangle: ["area", "perimeter"],
  triangle: ["area", "perimeter"],
  circle: ["area", "perimeter"],
  parallelogram: ["area"],
  trapezium: ["area"],
  cube: ["volume", "surface"],
  cuboid: ["volume", "surface"],
  cylinder: ["volume", "surface", "curved-surface"],
  cone: ["volume", "surface", "curved-surface"],
  sphere: ["volume", "surface"],
  hemisphere: ["volume", "surface", "curved-surface"],
};

export function shapeName(shape: Shape, say: Say): string {
  const names: Record<Shape, [string, string]> = {
    square: ["square", "carré"], rectangle: ["rectangle", "rectangle"], triangle: ["triangle", "triangle"],
    circle: ["circle", "cercle"], parallelogram: ["parallelogram", "parallélogramme"], trapezium: ["trapezium", "trapèze"],
    cube: ["cube", "cube"], cuboid: ["cuboid", "pavé droit"], cylinder: ["cylinder", "cylindre"],
    cone: ["cone", "cône"], sphere: ["sphere", "sphère"], hemisphere: ["hemisphere", "hémisphère"],
  };
  return say(...names[shape]);
}

export function quantityName(q: Quantity, shape: Shape, say: Say): string {
  if (q === "perimeter") return shape === "circle" ? say("circumference", "circonférence") : say("perimeter", "périmètre");
  const names: Record<Quantity, [string, string]> = {
    area: ["area", "aire"], perimeter: ["perimeter", "périmètre"], volume: ["volume", "volume"],
    surface: ["total surface area", "aire totale"], "curved-surface": ["curved surface area", "aire latérale"],
  };
  return say(...names[q]);
}

export const DIMENSION_NAMES: Record<string, [string, string]> = {
  a: ["side", "côté"], l: ["length", "longueur"], w: ["width", "largeur"], h: ["height", "hauteur"],
  b: ["base", "base"], b2: ["second side", "deuxième côté"], c: ["third side", "troisième côté"],
  r: ["radius", "rayon"], d: ["diameter", "diamètre"], s: ["slant height", "génératrice"],
};

interface Calc {
  formula: string;
  /** Substituted form, for the worked step. */
  working: string;
  /** Coefficient of π when the result is a multiple of π, else null. */
  piCoefficient: number | null;
  value: number;
  /** The same quantity by a different formula. */
  alternative: number;
  alternativeLabel: [string, string];
}

const PI = Math.PI;
const f = (x: number) => formatNumber(x, 4);

export function measure(
  shape: Shape,
  quantity: Quantity,
  dims: Record<string, number>,
  unit: string,
  say: Say
): SolveOutcome {
  const type = `math.mensuration.${shape}`;
  if (!SHAPE_QUANTITIES[shape].includes(quantity)) {
    return invalid(type, say(`A ${shapeName(shape, say)} has no ${quantityName(quantity, shape, say)} here.`, `Pas de ${quantityName(quantity, shape, say)} pour un ${shapeName(shape, say)} ici.`));
  }
  const d = { ...dims };
  if (d.d !== undefined && d.r === undefined) d.r = d.d / 2;
  const set = SHAPE_DIMENSIONS[shape].find((names) => names.every((n) => d[n] !== undefined || (n === "r" && d.d !== undefined)));
  if (!set) {
    const need = SHAPE_DIMENSIONS[shape].map((names) => names.map((n) => say(...DIMENSION_NAMES[n])).join(" + ")).join(say(" or ", " ou "));
    return invalid(type, say(`To find this I need the ${need}.`, `Pour le calculer, il me faut : ${need}.`));
  }
  const bad = Object.entries(d).find(([, v]) => !(v > 0) || !Number.isFinite(v));
  if (bad) return invalid(type, say("Every measurement must be a positive number.", "Chaque mesure doit être un nombre positif."));

  const calc = compute(shape, quantity, d, say);
  if (typeof calc === "string") return invalid(type, calc);

  const power = quantity === "volume" ? "³" : quantity === "perimeter" ? "" : "²";
  const units = unit ? ` ${unit}${power}` : quantity === "volume" ? say(" cubic units", " unités³") : power ? say(" square units", " unités²") : say(" units", " unités");
  const exactPi = calc.piCoefficient !== null ? `${f(calc.piCoefficient)}π = ` : "";
  const steps = [
    `${quantityName(quantity, shape, say)} = ${calc.formula}`,
    `= ${calc.working} = ${exactPi}${f(calc.value)}${units}`,
  ];
  if (calc.piCoefficient !== null) {
    steps.push(
      say(
        `If your class uses π = 22/7: ${f(calc.piCoefficient * (22 / 7))}; with π = 3.14: ${f(calc.piCoefficient * 3.14)}`,
        `Si ta classe utilise π = 22/7 : ${f(calc.piCoefficient * (22 / 7))} ; avec π = 3,14 : ${f(calc.piCoefficient * 3.14)}`
      )
    );
  }
  const passed = Math.abs(calc.value - calc.alternative) <= 1e-9 * (1 + Math.abs(calc.value));
  return solved({
    problemType: type,
    title: `${say("Mensuration", "Mesures")}: ${quantityName(quantity, shape, say)} — ${shapeName(shape, say)}`,
    steps,
    answer: `${exactPi}${f(calc.value)}${units}`,
    value: calc.value,
    check: {
      passed,
      detail: `${say(...calc.alternativeLabel)} = ${f(calc.alternative)}${passed ? " ✓" : " ✗"}`,
    },
    concept: conceptFor(quantity, say),
  });
}

function compute(shape: Shape, q: Quantity, d: Record<string, number>, say: Say): Calc | string {
  const { a = 0, l = 0, w = 0, h = 0, b = 0, r = 0, s = 0 } = d;
  switch (shape) {
    case "square":
      return q === "area"
        ? { formula: "a²", working: `${a}²`, piCoefficient: null, value: a * a, alternative: (4 * a / 4) ** 2, alternativeLabel: ["(perimeter ÷ 4)²", "(périmètre ÷ 4)²"] }
        : { formula: "4a", working: `4 × ${a}`, piCoefficient: null, value: 4 * a, alternative: a + a + a + a, alternativeLabel: ["a + a + a + a", "a + a + a + a"] };
    case "rectangle":
      return q === "area"
        ? { formula: "l × w", working: `${l} × ${w}`, piCoefficient: null, value: l * w, alternative: ((2 * (l + w)) / 2 - w) * w, alternativeLabel: ["(half-perimeter - w) × w", "(demi-périmètre - l) × l"] }
        : { formula: "2(l + w)", working: `2 × (${l} + ${w})`, piCoefficient: null, value: 2 * (l + w), alternative: l + w + l + w, alternativeLabel: ["l + w + l + w", "L + l + L + l"] };
    case "triangle": {
      if (d.c !== undefined) {
        const [x, y, z] = [d.a, d.b2, d.c];
        if (x + y <= z || x + z <= y || y + z <= x) return say("These three lengths cannot make a triangle: each side must be shorter than the other two together.", "Ces trois longueurs ne forment pas un triangle : chaque côté doit être plus court que la somme des deux autres.");
        if (q === "perimeter") return { formula: "a + b + c", working: `${x} + ${y} + ${z}`, piCoefficient: null, value: x + y + z, alternative: z + y + x, alternativeLabel: ["c + b + a", "c + b + a"] };
        const p = (x + y + z) / 2;
        const area = Math.sqrt(p * (p - x) * (p - y) * (p - z));
        // ½ab·sin C, with C from the cosine rule.
        const cosC = (x * x + y * y - z * z) / (2 * x * y);
        const alt = 0.5 * x * y * Math.sqrt(1 - cosC * cosC);
        return { formula: "√(s(s - a)(s - b)(s - c)), s = (a + b + c)/2", working: `s = ${f(p)}, √(${f(p)} × ${f(p - x)} × ${f(p - y)} × ${f(p - z)})`, piCoefficient: null, value: area, alternative: alt, alternativeLabel: ["½ab·sin C (cosine rule)", "½ab·sin C (loi des cosinus)"] };
      }
      if (q === "perimeter") return say("For a perimeter I need all three sides.", "Pour le périmètre, il me faut les trois côtés.");
      return { formula: "½ × b × h", working: `½ × ${b} × ${h}`, piCoefficient: null, value: 0.5 * b * h, alternative: (b * h) / 2, alternativeLabel: ["half of the b × h rectangle", "moitié du rectangle b × h"] };
    }
    case "circle":
      return q === "area"
        ? { formula: "πr²", working: `π × ${r}²`, piCoefficient: r * r, value: PI * r * r, alternative: (PI * (2 * r) ** 2) / 4, alternativeLabel: ["πd²/4", "πd²/4"] }
        : { formula: "2πr", working: `2 × π × ${r}`, piCoefficient: 2 * r, value: 2 * PI * r, alternative: PI * 2 * r, alternativeLabel: ["πd", "πd"] };
    case "parallelogram":
      return { formula: "b × h", working: `${b} × ${h}`, piCoefficient: null, value: b * h, alternative: 2 * (0.5 * b * h), alternativeLabel: ["two triangles of ½bh", "deux triangles de ½bh"] };
    case "trapezium": {
      const B = d.b;
      return { formula: "½(a + b) × h", working: `½ × (${a} + ${B}) × ${h}`, piCoefficient: null, value: 0.5 * (a + B) * h, alternative: Math.min(a, B) * h + 0.5 * Math.abs(a - B) * h, alternativeLabel: ["rectangle + triangle", "rectangle + triangle"] };
    }
    case "cube":
      return q === "volume"
        ? { formula: "a³", working: `${a}³`, piCoefficient: null, value: a ** 3, alternative: a * a * a, alternativeLabel: ["a × a × a", "a × a × a"] }
        : { formula: "6a²", working: `6 × ${a}²`, piCoefficient: null, value: 6 * a * a, alternative: 2 * (a * a + a * a + a * a), alternativeLabel: ["six square faces", "six faces carrées"] };
    case "cuboid":
      return q === "volume"
        ? { formula: "l × w × h", working: `${l} × ${w} × ${h}`, piCoefficient: null, value: l * w * h, alternative: (l * w) * h, alternativeLabel: ["base area × height", "aire de base × hauteur"] }
        : { formula: "2(lw + wh + hl)", working: `2 × (${l}×${w} + ${w}×${h} + ${h}×${l})`, piCoefficient: null, value: 2 * (l * w + w * h + h * l), alternative: l * w + l * w + w * h + w * h + h * l + h * l, alternativeLabel: ["six faces added", "somme des six faces"] };
    case "cylinder":
      if (q === "volume") return { formula: "πr²h", working: `π × ${r}² × ${h}`, piCoefficient: r * r * h, value: PI * r * r * h, alternative: (PI * r * r) * h, alternativeLabel: ["base area × height", "aire de base × hauteur"] };
      if (q === "curved-surface") return { formula: "2πrh", working: `2 × π × ${r} × ${h}`, piCoefficient: 2 * r * h, value: 2 * PI * r * h, alternative: (PI * 2 * r) * h, alternativeLabel: ["circumference × height", "circonférence × hauteur"] };
      return { formula: "2πr(r + h)", working: `2 × π × ${r} × (${r} + ${h})`, piCoefficient: 2 * r * (r + h), value: 2 * PI * r * (r + h), alternative: 2 * PI * r * h + 2 * PI * r * r, alternativeLabel: ["curved surface + two circles", "aire latérale + deux disques"] };
    case "cone": {
      const slant = s || Math.sqrt(r * r + h * h);
      const height = h || Math.sqrt(Math.max(slant * slant - r * r, 0));
      if (s && s <= r) return say("The slant height must be longer than the radius.", "La génératrice doit être plus longue que le rayon.");
      if (q === "volume") {
        const cylinder = PI * r ** 2 * height;
        return { formula: "⅓πr²h", working: `⅓ × π × ${r}² × ${f(height)}`, piCoefficient: (r * r * height) / 3, value: (PI * r * r * height) / 3, alternative: cylinder / 3, alternativeLabel: ["one third of the matching cylinder", "un tiers du cylindre correspondant"] };
      }
      if (q === "curved-surface") return { formula: "πrl, l = √(r² + h²)", working: `π × ${r} × ${f(slant)}`, piCoefficient: r * slant, value: PI * r * slant, alternative: 0.5 * (2 * PI * r) * slant, alternativeLabel: ["½ × circumference × slant", "½ × circonférence × génératrice"] };
      return { formula: "πr(l + r), l = √(r² + h²)", working: `π × ${r} × (${f(slant)} + ${r})`, piCoefficient: r * (slant + r), value: PI * r * (slant + r), alternative: PI * r * slant + PI * r * r, alternativeLabel: ["curved surface + base", "aire latérale + base"] };
    }
    case "sphere":
      return q === "volume"
        ? { formula: "⁴⁄₃πr³", working: `⁴⁄₃ × π × ${r}³`, piCoefficient: (4 * r ** 3) / 3, value: (4 / 3) * PI * r ** 3, alternative: (PI * (2 * r) ** 3) / 6, alternativeLabel: ["πd³/6", "πd³/6"] }
        : { formula: "4πr²", working: `4 × π × ${r}²`, piCoefficient: 4 * r * r, value: 4 * PI * r * r, alternative: PI * (2 * r) ** 2, alternativeLabel: ["πd²", "πd²"] };
    case "hemisphere":
      if (q === "volume") return { formula: "⅔πr³", working: `⅔ × π × ${r}³`, piCoefficient: (2 * r ** 3) / 3, value: (2 / 3) * PI * r ** 3, alternative: ((PI * (2 * r) ** 3) / 6) / 2, alternativeLabel: ["half a sphere", "moitié d'une sphère"] };
      if (q === "curved-surface") return { formula: "2πr²", working: `2 × π × ${r}²`, piCoefficient: 2 * r * r, value: 2 * PI * r * r, alternative: (4 * PI * r * r) / 2, alternativeLabel: ["half a sphere's surface", "moitié de la surface d'une sphère"] };
      return { formula: "3πr²", working: `3 × π × ${r}²`, piCoefficient: 3 * r * r, value: 3 * PI * r * r, alternative: 2 * PI * r * r + PI * r * r, alternativeLabel: ["curved surface + flat circle", "aire courbe + disque"] };
  }
}

function conceptFor(q: Quantity, say: Say): string {
  if (q === "volume") return say("Volume is the space inside a solid, in cubic units. For a prism or cylinder it is base area × height; a cone or pyramid is one third of that.", "Le volume est l'espace occupé par un solide, en unités cubes. Pour un prisme ou un cylindre : aire de base × hauteur ; pour un cône ou une pyramide, le tiers.");
  if (q === "perimeter") return say("Perimeter is the distance around a shape, in plain units; for a circle it is called the circumference.", "Le périmètre est la longueur du contour, en unités simples ; pour un cercle on l'appelle la circonférence.");
  return say("Area measures the surface covered, in square units. A solid's surface area is the total area of all its faces.", "L'aire mesure la surface couverte, en unités carrées. L'aire d'un solide est la somme des aires de toutes ses faces.");
}

/* ------------------------------------------------------------------ *
 * Reading a typed question
 * ------------------------------------------------------------------ */

const SHAPES: Array<[RegExp, Shape]> = [
  [/hemisphere|h[ée]misph[èe]re/, "hemisphere"],
  [/sphere|sph[èe]re|\bball\b|boule/, "sphere"],
  [/cylinder|cylindre/, "cylinder"],
  [/\bcone\b|c[ôo]ne/, "cone"],
  [/cuboid|rectangular box|rectangular prism|pav[ée]/, "cuboid"],
  [/\bcube\b/, "cube"],
  [/circle|cercle|disque|disc\b/, "circle"],
  [/parallelogram|parall[ée]logramme/, "parallelogram"],
  [/trapezi|trapezoid|trap[èe]ze/, "trapezium"],
  [/rectangle/, "rectangle"],
  [/square|carr[ée]/, "square"],
  [/triangle/, "triangle"],
];

const DIM_WORDS: Array<[RegExp, string]> = [
  [/slant height|g[ée]n[ée]ratrice/, "s"],
  [/radius|rayon|\br\s*=/, "r"],
  [/diameter|diam[èe]tre|\bd\s*=/, "d"],
  [/height|hauteur|\bh\s*=/, "h"],
  [/length|longueur|\bl\s*=/, "l"],
  [/width|breadth|largeur|\bw\s*=/, "w"],
  [/\bbase\b|\bb\s*=/, "b"],
  [/\bside\b|c[ôo]t[ée]|\bedge\b|ar[êe]te|\ba\s*=/, "a"],
];

export function solveMensuration(text: string, say: Say): SolveOutcome {
  const t = text.toLowerCase();
  const shape = SHAPES.find(([re]) => re.test(t))?.[1];
  if (!shape) return UNRECOGNISED;
  const solid = ["cube", "cuboid", "cylinder", "cone", "sphere", "hemisphere"].includes(shape);

  let quantity: Quantity | null = null;
  if (/curved|lateral|lat[ée]rale|courbe/.test(t)) quantity = "curved-surface";
  else if (/surface|total area|aire totale/.test(t)) quantity = solid ? "surface" : "area";
  else if (/volume|capacity|capacit[ée]/.test(t)) quantity = "volume";
  else if (/perimeter|p[ée]rim[èe]tre|circumference|circonf[ée]rence/.test(t)) quantity = "perimeter";
  else if (/\barea\b|\baire\b/.test(t)) quantity = solid ? "surface" : "area";
  if (!quantity) return UNRECOGNISED;
  if (shape === "triangle" && /\bangle/.test(t) && !/area|aire|perim/.test(t)) return UNRECOGNISED;

  const unit = t.match(/\d\s*(mm|cm|km|m)\b/)?.[1] ?? "";
  const dims: Record<string, number> = {};
  const NUM = /(\d+(?:[.,]\d+)?)/;
  for (const [re, name] of DIM_WORDS) {
    const m = t.match(new RegExp(`(?:${re.source})\\s*(?:of|is|=|:|de|est|mesure|vaut)?\\s*(?:a\\s+)?${NUM.source}`));
    if (m) dims[name] = Number(m[1].replace(",", "."));
  }
  // "5 m by 3 m", "5 x 3 x 2", "dimensions 5, 3 and 2".
  const by = t.match(/(\d+(?:[.,]\d+)?)\s*(?:mm|cm|km|m)?\s*(?:by|x|×|par)\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|km|m)?(?:\s*(?:by|x|×|par)\s*(\d+(?:[.,]\d+)?))?/);
  if (by && (shape === "rectangle" || shape === "cuboid")) {
    dims.l ??= Number(by[1].replace(",", "."));
    dims.w ??= Number(by[2].replace(",", "."));
    if (by[3]) dims.h ??= Number(by[3].replace(",", "."));
  }
  // A triangle given three sides: "sides 3, 4 and 5".
  const three = t.match(/sides?\s*(?:of\s*)?(\d+(?:[.,]\d+)?)\s*(?:cm|m|mm|km)?\s*,\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m|mm|km)?\s*(?:,|and|et)\s*(\d+(?:[.,]\d+)?)/);
  if (shape === "triangle" && three) {
    dims.a = Number(three[1].replace(",", "."));
    dims.b2 = Number(three[2].replace(",", "."));
    dims.c = Number(three[3].replace(",", "."));
    delete dims.b;
    delete dims.h;
  }
  // Parallel sides of a trapezium: "parallel sides 6 and 8".
  const par = t.match(/parallel sides?\s*(?:of\s*)?(\d+(?:[.,]\d+)?)\s*(?:cm|m|mm|km)?\s*(?:and|et|,)\s*(\d+(?:[.,]\d+)?)/);
  if (shape === "trapezium" && par) {
    dims.a = Number(par[1].replace(",", "."));
    dims.b = Number(par[2].replace(",", "."));
  }
  return measure(shape, quantity, dims, unit, say);
}
