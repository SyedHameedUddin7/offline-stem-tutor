import { formatNumber } from "../../math/fraction";
import type { Lang } from "../../../i18n/strings";
import { UNRECOGNISED, invalid, sayIn, solved, type Say, type SolveOutcome } from "../types";
import { FORMULAS, SI_UNIT, UNITS, type Formula, type QuantityId, type Unit } from "./formulas";

/**
 * The formula engine, and the reader that turns a typed question into a
 * call to it.
 *
 * What this does NOT claim: it answers numerical problems that one formula
 * from the curriculum solves, with the values given in the question. A
 * question needing two formulas in sequence, or one about why something
 * happens, is not a calculation it can do, and it says so rather than
 * picking the nearest formula and producing a number.
 */

/** Display forms for variable symbols that are not printable as typed. */
const DISPLAY: Record<string, string> = { m1: "m₁", m2: "m₂", rho: "ρ", dT: "ΔT" };
const show = (sym: string) => DISPLAY[sym] ?? sym;
const fmt = (x: number) => formatNumber(x, 4);

export interface Known {
  value: number; // SI
  quantity: QuantityId;
  raw: string; // as written, e.g. "72 km/h"
  unit: Unit | null;
  note?: string;
  index: number; // position in the question
}

/* ------------------------------------------------------------------ *
 * The engine: one formula, one unknown
 * ------------------------------------------------------------------ */

export function solveFormula(
  formula: Formula,
  target: string,
  knowns: Record<string, Known>,
  say: Say
): SolveOutcome {
  const type = `physics.${formula.id}`;
  const rearranged = formula.solve[target];
  if (!rearranged) return invalid(type, say("This formula cannot be rearranged for that quantity here.", "Cette formule ne peut pas être réarrangée pour cette grandeur ici."));

  const values: Record<string, number> = {};
  for (const variable of formula.vars) {
    if (variable.sym === target) continue;
    const k = knowns[variable.sym];
    if (!k) {
      const need = formula.vars.filter((x) => x.sym !== target && !knowns[x.sym]).map((x) => say(...x.name));
      return invalid(type, say(`To find this I also need: ${need.join(", ")}.`, `Pour le calculer, il me faut aussi : ${need.join(", ")}.`));
    }
    values[variable.sym] = k.value;
  }

  // Physical sense before arithmetic: a mass, time or resistance cannot be
  // zero or negative, and saying so beats a division by zero.
  const positive: QuantityId[] = ["mass", "time", "resistance", "density", "volume", "area", "specificHeat"];
  for (const variable of formula.vars) {
    if (variable.sym === target) continue;
    if (positive.includes(variable.quantity) && !(values[variable.sym] > 0)) {
      return invalid(type, say(`The ${say(...variable.name)} must be greater than zero.`, `La grandeur « ${say(...variable.name)} » doit être strictement positive.`));
    }
  }

  const result = rearranged[1](values);
  if (!Number.isFinite(result)) {
    return invalid(
      type,
      Number.isNaN(result)
        ? say("These values have no real answer (a square root of a negative number, or an impossible angle). Check the numbers.", "Ces valeurs n'ont pas de solution réelle (racine d'un nombre négatif, ou angle impossible). Vérifie les nombres.")
        : say("This would mean dividing by zero. Check that no value that divides is 0.", "Cela reviendrait à diviser par zéro. Vérifie qu'aucune valeur au dénominateur n'est nulle.")
    );
  }
  const targetVar = formula.vars.find((x) => x.sym === target)!;
  if (positive.includes(targetVar.quantity) && result <= 0) {
    return invalid(type, say(`That gives a ${say(...targetVar.name)} of ${fmt(result)}, which is impossible. Check the values and their order.`, `Cela donne ${fmt(result)} pour « ${say(...targetVar.name)} », ce qui est impossible. Vérifie les valeurs et leur ordre.`));
  }

  const unit = SI_UNIT[targetVar.quantity];
  const knownLines = formula.vars
    .filter((x) => x.sym !== target)
    .map((x) => {
      const k = knowns[x.sym];
      const si = `${fmt(k.value)}${SI_UNIT[x.quantity] ? ` ${SI_UNIT[x.quantity]}` : ""}`;
      const converted = k.unit && k.unit.factor !== 1 ? `${k.raw} = ${si}` : si;
      return `${show(x.sym)} = ${converted}${k.note ? ` (${k.note})` : ""}`;
    });
  const substituted = substitute(rearranged[0], values);
  const all = { ...values, [target]: result };
  const [lhs, rhs] = formula.sides(all);
  const passed = Math.abs(lhs - rhs) <= 1e-9 * (1 + Math.abs(lhs) + Math.abs(rhs));

  // Also give the answer in the unit the question used for that quantity, if not SI.
  // A speed from kilometres and hours is wanted in km/h too.
  const kmh = UNITS.find((u) => u.symbol === "km/h")!;
  const fromKmAndHours =
    targetVar.quantity === "speed" &&
    Object.values(knowns).some((k) => k.unit?.symbol === "km") &&
    Object.values(knowns).some((k) => k.unit?.symbol === "h");
  const asked = Object.values(knowns).find((k) => k.quantity === targetVar.quantity && k.unit && k.unit.factor !== 1)?.unit ?? (fromKmAndHours ? kmh : undefined);
  const extra = asked ? ` = ${fmt(result / asked.factor)} ${asked.symbol}` : "";

  return solved({
    problemType: type,
    title: say(...formula.name),
    steps: [
      `${say("Known", "Données")}: ${knownLines.join(";  ")}`,
      `${say("Formula", "Formule")}: ${formula.equation}`,
      ...(rearranged[0] !== formula.equation ? [`${say(`Rearranged for ${show(target)}`, `Exprimée en fonction de ${show(target)}`)}: ${rearranged[0]}`] : []),
      `${say("Substitute", "On remplace")}: ${substituted} = ${fmt(result)}${unit ? ` ${unit}` : ""}`,
    ],
    answer: `${show(target)} = ${fmt(result)}${unit ? ` ${unit}` : ""}${extra}`,
    value: result,
    check: {
      passed,
      detail: say(
        `All values in ${formula.equation}: left side = ${fmt(lhs)}, right side = ${fmt(rhs)}${passed ? " ✓" : " ✗"}`,
        `Toutes les valeurs dans ${formula.equation} : membre de gauche = ${fmt(lhs)}, membre de droite = ${fmt(rhs)}${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(...formula.concept),
  });
}

/** Put numbers into the right-hand side of a rearranged formula, for the worked step. */
function substitute(display: string, values: Record<string, number>): string {
  const [, rhs = display] = display.split(/\s=\s(.*)/s);
  let out = rhs;
  const syms = Object.keys(values).sort((a, b) => show(b).length - show(a).length);
  for (const sym of syms) {
    const d = show(sym).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const value = values[sym];
    const text = value < 0 ? `(${fmt(value)})` : fmt(value);
    out = out.replace(new RegExp(`(?<![A-Za-zα-ωΑ-Ω₀-₉])${d}(?![A-Za-z₀-₉])`, "g"), text);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Reading the question
 * ------------------------------------------------------------------ */

const ALIASES = UNITS.flatMap((u) => u.aliases.map((a) => ({ alias: a, unit: u }))).sort((a, b) => b.alias.length - a.alias.length);
const UNIT_RE = new RegExp(
  `(?<![\\w.])(-?\\d+(?:[.,]\\d+)?(?:\\s*(?:×|x|\\*)\\s*10\\^?\\s*-?\\d+|e-?\\d+)?)\\s*(${ALIASES.map((a) => a.alias.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})(?![a-z0-9²³^])`,
  "gi"
);

function parseNumber(s: string): number {
  const m = s.replace(",", ".").match(/^(-?\d+(?:\.\d+)?)(?:\s*(?:×|x|\*)\s*10\^?\s*(-?\d+)|e(-?\d+))?$/i);
  if (!m) return Number.NaN;
  return Number(m[1]) * 10 ** Number(m[2] ?? m[3] ?? 0);
}

export function extractQuantities(text: string): Known[] {
  const out: Known[] = [];
  for (const m of text.toLowerCase().matchAll(UNIT_RE)) {
    const unit = ALIASES.find((a) => a.alias === m[2].toLowerCase())!.unit;
    const value = parseNumber(m[1]);
    if (!Number.isFinite(value)) continue;
    out.push({ value: value * unit.factor, quantity: unit.quantity, raw: `${m[1]} ${unit.symbol}`, unit, index: m.index ?? 0 });
  }
  return out;
}

/** What the question asks for. Earliest mention after the "find" wins; longer phrases beat shorter ones. */
const TARGETS: Array<[RegExp, QuantityId, string?]> = [
  [/kinetic energy|[ée]nergie cin[ée]tique/, "energy", "KE"],
  [/potential energy|[ée]nergie potentielle/, "energy", "PE"],
  [/specific heat|capacit[ée] thermique/, "specificHeat"],
  [/work done|\bwork\b|\btravail\b/, "energy", "W"],
  [/\bheat\b|chaleur|thermal energy|[ée]nergie thermique/, "energy", "Q"],
  [/temperature (?:rise|change|increase)|rise in temperature|[ée]l[ée]vation de (?:la )?temp[ée]rature|variation de (?:la )?temp/, "temperatureChange"],
  [/in kelvin|en kelvin|\bkelvin\b/, "kelvin"],
  [/fahrenheit/, "fahrenheit"],
  [/in (?:degrees )?celsius|en (?:degr[ée]s )?celsius/, "celsius"],
  [/refractive index|indice de r[ée]fraction|\bindice\b/, "ratio", "n"],
  [/angle of refraction|angle de r[ée]fraction/, "angle", "r"],
  [/angle of incidence|angle d'incidence/, "angle", "i"],
  [/acceleration|acc[ée]l[ée]ration|deceleration|retardation/, "acceleration"],
  [/initial (?:speed|velocity)|vitesse initiale/, "speed", "u"],
  [/final (?:speed|velocity)|vitesse finale/, "speed", "v"],
  [/speed of light (?:in|inside|dans)/, "speed", "v"],
  [/\bspeed\b|\bvelocity\b|\bvitesse\b|how fast/, "speed"],
  [/momentum|quantit[ée] de mouvement/, "momentum"],
  [/\bweight\b|\bpoids\b/, "force", "W"],
  [/\bforce\b|\bthrust\b|pouss[ée]e/, "force"],
  [/pressure|pression/, "pressure"],
  [/density|masse volumique|densit[ée]/, "density"],
  [/\bcurrent\b|courant|intensit[ée]/, "current"],
  [/voltage|potential difference|\bp\.?d\.?\b|\btension\b/, "voltage"],
  [/resistance|r[ée]sistance/, "resistance"],
  [/\bcharge\b/, "charge"],
  [/\bpower\b|puissance/, "power"],
  [/energy|[ée]nergie/, "energy"],
  [/height|hauteur|how high/, "distance", "h"],
  [/distance|displacement|how far|d[ée]placement/, "distance"],
  [/\btime\b|how long|dur[ée]e|\btemps\b/, "time"],
  [/\bmass\b|\bmasse\b/, "mass"],
  [/\bvolume\b/, "volume"],
];

const ASK = /(find|calculate|what is|what's|what was|what will|determine|how (?:long|far|fast|much|high)|work out|compute|trouve|calcule|quel(?:le)?s? (?:est|sont|sera)|combien|d[ée]termine)/g;

export function findTarget(text: string): { quantity: QuantityId; hint?: string } | null {
  const t = text.toLowerCase();
  const asks = [...t.matchAll(ASK)];
  const askText = asks.length ? t.slice(asks[asks.length - 1].index) : t.slice(Math.max(0, t.lastIndexOf(".", t.length - 2)));
  let best: { index: number; length: number; quantity: QuantityId; hint?: string } | null = null;
  for (const [re, quantity, hint] of TARGETS) {
    const m = askText.match(re);
    if (!m || m.index === undefined) continue;
    if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length)) {
      best = { index: m.index, length: m[0].length, quantity, hint };
    }
  }
  return best && { quantity: best.quantity, hint: best.hint };
}

interface Candidate {
  formula: Formula;
  target: string;
  knowns: Record<string, Known>;
  score: number;
  leftover: number;
}

/**
 * Assign the values found to a formula's variables, by quantity. Two values
 * of the same quantity (initial and final speed, two masses) go in the order
 * they appear, after any explicit "from rest" / "comes to rest".
 */
function assign(formula: Formula, target: string, found: Known[], text: string, say: Say): Candidate | null {
  const t = text.toLowerCase();
  // Copies: candidates are tried one after another over the same values, and
  // the temperature handling below rewrites them.
  const pool = found.map((k) => ({ ...k }));
  const knowns: Record<string, Known> = {};
  const restStart = /from rest|at rest initially|starts? (?:from|at) rest|initially at rest|au repos|sans vitesse initiale|départ arrêté/.test(t);
  const restEnd = /comes? to (?:a )?(?:rest|stop)|brought to (?:rest|a stop)|stops|s'arr[êe]te|à l'arr[êe]t/.test(t);

  const others = formula.vars.filter((x) => x.sym !== target);
  if (restStart && others.some((x) => x.sym === "u")) knowns.u = { value: 0, quantity: "speed", raw: "0 m/s", unit: null, note: say("starts from rest", "part du repos"), index: -1 };
  if (restEnd && others.some((x) => x.sym === "v") && formula.vars.some((x) => x.sym === "u")) knowns.v = { value: 0, quantity: "speed", raw: "0 m/s", unit: null, note: say("comes to rest", "s'arrête"), index: -1 };

  // Two temperatures "from 20 °C to 80 °C" are one change of 60 °C.
  const temps = pool.filter((k) => k.quantity === "temperatureChange");
  if (temps.length === 2 && others.some((x) => x.quantity === "temperatureChange") && /from|de\b|initial|to\b|à|jusqu/.test(t)) {
    const [a, b] = temps;
    pool.splice(pool.indexOf(a), 1);
    pool.splice(pool.indexOf(b), 1);
    pool.push({ value: Math.abs(b.value - a.value), quantity: "temperatureChange", raw: `${fmt(Math.abs(b.value - a.value))} °C`, unit: null, note: say(`from ${a.raw} to ${b.raw}`, `de ${a.raw} à ${b.raw}`), index: a.index });
  }
  // A Celsius/Kelvin/Fahrenheit conversion reads a temperature value, not a change.
  if (others.some((x) => ["celsius", "kelvin", "fahrenheit"].includes(x.quantity))) {
    for (const k of pool) {
      if (k.quantity === "temperatureChange") k.quantity = k.unit?.symbol === "K" ? "kelvin" : "celsius";
    }
  }

  let defaults = 0;
  for (const variable of others) {
    if (knowns[variable.sym]) continue;
    let i = pool.findIndex((k) => k.quantity === variable.quantity);
    // Angles: match "incidence" / "refraction" by the nearest preceding word.
    if (variable.quantity === "angle") {
      const word = variable.sym === "i" ? /incidence/ : /r[ée]fraction/;
      const j = pool.findIndex((k) => k.quantity === "angle" && word.test(t.slice(Math.max(0, k.index - 40), k.index)));
      if (j >= 0) i = j;
    }
    if (i >= 0) {
      knowns[variable.sym] = pool[i];
      pool.splice(i, 1);
      continue;
    }
    if (variable.contextDefault && variable.contextDefault.when.test(t)) {
      knowns[variable.sym] = { value: variable.contextDefault.value, quantity: variable.quantity, raw: "", unit: null, note: say(...variable.contextDefault.note), index: -1 };
      defaults++;
      continue;
    }
    if (variable.default) {
      knowns[variable.sym] = { value: variable.default.value, quantity: variable.quantity, raw: "", unit: null, note: say(...variable.default.note), index: -1 };
      defaults++;
      continue;
    }
    return null;
  }
  const cue = formula.cues?.test(t) ? 3 : 0;
  return { formula, target, knowns, leftover: pool.length, score: cue - 2 * pool.length - 0.5 * defaults };
}

export function solvePhysics(question: string, lang: Lang, chapterId?: string): SolveOutcome {
  const say = sayIn(lang);
  const resistors = solveResistors(question, say);
  if (resistors.kind !== "unrecognised") return resistors;

  const found = extractQuantities(question);
  if (found.length === 0) return UNRECOGNISED;
  const target = findTarget(question);
  if (!target) return UNRECOGNISED;

  const candidates: Candidate[] = [];
  for (const formula of FORMULAS) {
    for (const variable of formula.vars) {
      if (variable.quantity !== target.quantity) continue;
      if (target.hint && variable.sym !== target.hint && formula.vars.some((x) => x.sym === target.hint)) continue;
      if (variable.default && !target.hint) continue; // never "solve for g" unless asked
      const c = assign(formula, variable.sym, found, question, say);
      if (c) {
        if (chapterId && formula.chapterId === chapterId) c.score += 2;
        if (target.hint && variable.sym === target.hint) c.score += 2;
        candidates.push(c);
      }
    }
  }

  if (candidates.length === 0) {
    const options = FORMULAS.filter((f) => f.vars.some((x) => x.quantity === target.quantity && !x.default)).map((f) => f.equation);
    return invalid(
      "physics.insufficient",
      say(
        `I found ${found.map((k) => k.raw).join(", ")}, but no single formula gets the answer from just these values. Formulas for this quantity: ${options.join("; ")}. Try the formula solver, or check a value is not missing.`,
        `J'ai trouvé ${found.map((k) => k.raw).join(", ")}, mais aucune formule ne donne la réponse avec ces seules valeurs. Formules possibles : ${options.join(" ; ")}. Essaie le solveur de formules, ou vérifie qu'il ne manque pas une valeur.`
      )
    );
  }

  candidates.sort((a, b) => b.score - a.score);
  const [best, second] = candidates;
  if (second && second.score === best.score) {
    const a = solveFormula(best.formula, best.target, best.knowns, say);
    const b = solveFormula(second.formula, second.target, second.knowns, say);
    const differ = a.kind !== "solved" || b.kind !== "solved" || Math.abs(a.result.value! - b.result.value!) > 1e-9 * (1 + Math.abs(a.result.value!));
    if (differ) {
      return invalid(
        "physics.ambiguous",
        say(
          `This could be ${best.formula.equation} or ${second.formula.equation}, and they give different answers. Say which values are initial and final, or use the formula solver.`,
          `Cela peut être ${best.formula.equation} ou ${second.formula.equation}, qui donnent des réponses différentes. Précise les valeurs initiales et finales, ou utilise le solveur de formules.`
        )
      );
    }
  }
  return solveFormula(best.formula, best.target, best.knowns, say);
}

/* ------------------------------------------------------------------ *
 * Resistors in series and parallel
 * ------------------------------------------------------------------ */

export function solveResistors(text: string, say: Say): SolveOutcome {
  const t = text.toLowerCase();
  const series = /\bseries\b|\bs[ée]rie\b/.test(t);
  const parallel = /parallel|parall[èe]le|d[ée]rivation/.test(t);
  if (series === parallel) return UNRECOGNISED;
  const rs = extractQuantities(text).filter((k) => k.quantity === "resistance").map((k) => k.value);
  if (rs.length < 2) return UNRECOGNISED;
  if (rs.some((r) => r <= 0)) return invalid("physics.resistors", say("Every resistance must be positive.", "Chaque résistance doit être positive."));

  const total = series ? rs.reduce((a, b) => a + b, 0) : 1 / rs.reduce((a, r) => a + 1 / r, 0);
  const steps = series
    ? [`R = ${rs.map(fmt).join(" + ")} = ${fmt(total)} Ω`]
    : [`1/R = ${rs.map((r) => `1/${fmt(r)}`).join(" + ")} = ${fmt(1 / total)}`, `R = 1 / ${fmt(1 / total)} = ${fmt(total)} Ω`];
  // Independent: in parallel the total is below the smallest resistor, and for
  // two resistors it equals product over sum; in series it is above the largest.
  const passed = series
    ? total >= Math.max(...rs)
    : total < Math.min(...rs) && (rs.length !== 2 || Math.abs(total - (rs[0] * rs[1]) / (rs[0] + rs[1])) < 1e-9 * total);
  return solved({
    problemType: series ? "physics.series" : "physics.parallel",
    title: series ? say("Resistors in series", "Résistances en série") : say("Resistors in parallel", "Résistances en dérivation"),
    steps,
    answer: `R = ${fmt(total)} Ω`,
    value: total,
    check: {
      passed,
      detail: series
        ? say(`The total is larger than every single resistor${passed ? " ✓" : " ✗"}`, `Le total est plus grand que chaque résistance${passed ? " ✓" : " ✗"}`)
        : say(`The total is smaller than the smallest resistor${rs.length === 2 ? `, and equals R₁R₂/(R₁ + R₂) = ${fmt((rs[0] * rs[1]) / (rs[0] + rs[1]))}` : ""}${passed ? " ✓" : " ✗"}`, `Le total est plus petit que la plus petite résistance${rs.length === 2 ? `, et vaut R₁R₂/(R₁ + R₂) = ${fmt((rs[0] * rs[1]) / (rs[0] + rs[1]))}` : ""}${passed ? " ✓" : " ✗"}`),
    },
    concept: series
      ? say("In series the same current flows through each resistor, and resistances add.", "En série, le même courant traverse chaque résistance, et les résistances s'additionnent.")
      : say("In parallel each resistor gives the current another path, so the total resistance is less than any single one.", "En dérivation, chaque résistance ouvre un chemin de plus au courant : la résistance totale est plus petite que chacune."),
  });
}
