/**
 * Physics quantities, units and formulas, all in SI internally.
 *
 * Each formula lists its rearrangements explicitly rather than relying on a
 * symbolic algebra engine: a dozen hand-checked closed forms are smaller,
 * auditable, and cannot produce a surprising rearrangement. The `sides`
 * function is the formula as written, and the solver's check substitutes
 * every value into it — so a wrong rearrangement fails its own check.
 */

export type QuantityId =
  | "distance" | "time" | "speed" | "acceleration" | "mass" | "force" | "momentum"
  | "energy" | "power" | "density" | "volume" | "area" | "pressure" | "voltage"
  | "current" | "resistance" | "charge" | "specificHeat" | "temperatureChange"
  | "celsius" | "kelvin" | "fahrenheit" | "angle" | "ratio";

export interface Unit {
  symbol: string;
  quantity: QuantityId;
  /** Multiply by this to get SI. */
  factor: number;
  /** How it may be written in a question, longest forms first. */
  aliases: string[];
}

/** SI unit shown in answers. */
export const SI_UNIT: Record<QuantityId, string> = {
  distance: "m", time: "s", speed: "m/s", acceleration: "m/s²", mass: "kg", force: "N",
  momentum: "kg·m/s", energy: "J", power: "W", density: "kg/m³", volume: "m³", area: "m²",
  pressure: "Pa", voltage: "V", current: "A", resistance: "Ω", charge: "C",
  specificHeat: "J/(kg·°C)", temperatureChange: "°C", celsius: "°C", kelvin: "K", fahrenheit: "°F",
  angle: "°", ratio: "",
};

export const UNITS: Unit[] = [
  { symbol: "m/s²", quantity: "acceleration", factor: 1, aliases: ["m/s²", "m/s^2", "m/s2", "m s-2", "ms-2", "m·s⁻²"] },
  { symbol: "km/h", quantity: "speed", factor: 1 / 3.6, aliases: ["km/h", "km/hr", "kmph", "km h-1", "kph"] },
  { symbol: "m/s", quantity: "speed", factor: 1, aliases: ["m/s", "m s-1", "ms-1", "m·s⁻¹"] },
  { symbol: "cm/s", quantity: "speed", factor: 0.01, aliases: ["cm/s"] },
  { symbol: "kg·m/s", quantity: "momentum", factor: 1, aliases: ["kg m/s", "kg·m/s", "kgm/s", "kg m s-1"] },
  { symbol: "kg/m³", quantity: "density", factor: 1, aliases: ["kg/m³", "kg/m^3", "kg/m3", "kg m-3"] },
  { symbol: "g/cm³", quantity: "density", factor: 1000, aliases: ["g/cm³", "g/cm^3", "g/cm3"] },
  { symbol: "J/(kg·°C)", quantity: "specificHeat", factor: 1, aliases: ["j/(kg·°c)", "j/(kg °c)", "j/kg°c", "j/kg °c", "j/(kg·k)", "j/kg k", "j/kgk", "j/(kg k)", "j kg-1 k-1", "j/kg/°c", "j/kg/k"] },
  { symbol: "m³", quantity: "volume", factor: 1, aliases: ["m³", "m^3", "m3"] },
  { symbol: "cm³", quantity: "volume", factor: 1e-6, aliases: ["cm³", "cm^3", "cm3", "cc"] },
  { symbol: "m²", quantity: "area", factor: 1, aliases: ["m²", "m^2", "m2"] },
  { symbol: "cm²", quantity: "area", factor: 1e-4, aliases: ["cm²", "cm^2", "cm2"] },
  { symbol: "km", quantity: "distance", factor: 1000, aliases: ["km", "kilometres", "kilometers", "kilomètres"] },
  { symbol: "cm", quantity: "distance", factor: 0.01, aliases: ["cm", "centimetres", "centimeters"] },
  { symbol: "mm", quantity: "distance", factor: 0.001, aliases: ["mm"] },
  { symbol: "m", quantity: "distance", factor: 1, aliases: ["metres", "meters", "mètres", "m"] },
  { symbol: "ms", quantity: "time", factor: 0.001, aliases: ["ms"] },
  { symbol: "min", quantity: "time", factor: 60, aliases: ["minutes", "minute", "mins", "min"] },
  { symbol: "h", quantity: "time", factor: 3600, aliases: ["hours", "hour", "heures", "heure", "hrs", "hr", "h"] },
  { symbol: "s", quantity: "time", factor: 1, aliases: ["seconds", "second", "secondes", "seconde", "secs", "sec", "s"] },
  { symbol: "kg", quantity: "mass", factor: 1, aliases: ["kg", "kilograms", "kilogrammes", "kilogram"] },
  { symbol: "g", quantity: "mass", factor: 0.001, aliases: ["grams", "grammes", "g"] },
  { symbol: "tonne", quantity: "mass", factor: 1000, aliases: ["tonnes", "tonne"] },
  { symbol: "kN", quantity: "force", factor: 1000, aliases: ["kn"] },
  { symbol: "N", quantity: "force", factor: 1, aliases: ["newtons", "newton", "n"] },
  { symbol: "kWh", quantity: "energy", factor: 3.6e6, aliases: ["kwh", "kw h", "units of electricity"] },
  { symbol: "MJ", quantity: "energy", factor: 1e6, aliases: ["mj"] },
  { symbol: "kJ", quantity: "energy", factor: 1000, aliases: ["kj"] },
  { symbol: "J", quantity: "energy", factor: 1, aliases: ["joules", "joule", "j"] },
  { symbol: "kW", quantity: "power", factor: 1000, aliases: ["kw"] },
  { symbol: "MW", quantity: "power", factor: 1e6, aliases: ["mw"] },
  { symbol: "W", quantity: "power", factor: 1, aliases: ["watts", "watt", "w"] },
  { symbol: "kPa", quantity: "pressure", factor: 1000, aliases: ["kpa"] },
  { symbol: "Pa", quantity: "pressure", factor: 1, aliases: ["pascals", "pascal", "pa", "n/m²", "n/m^2", "n/m2"] },
  { symbol: "kV", quantity: "voltage", factor: 1000, aliases: ["kv"] },
  { symbol: "mV", quantity: "voltage", factor: 0.001, aliases: ["mv"] },
  { symbol: "V", quantity: "voltage", factor: 1, aliases: ["volts", "volt", "v"] },
  { symbol: "mA", quantity: "current", factor: 0.001, aliases: ["ma", "milliamps"] },
  { symbol: "A", quantity: "current", factor: 1, aliases: ["amperes", "ampères", "amps", "amp", "a"] },
  { symbol: "kΩ", quantity: "resistance", factor: 1000, aliases: ["kω", "kohm", "kilohms", "kilohm"] },
  { symbol: "Ω", quantity: "resistance", factor: 1, aliases: ["ω", "ohms", "ohm"] },
  { symbol: "C", quantity: "charge", factor: 1, aliases: ["coulombs", "coulomb", "c"] },
  { symbol: "°C", quantity: "temperatureChange", factor: 1, aliases: ["°c", "degrees celsius", "degrés celsius", "celsius", "ºc"] },
  { symbol: "K", quantity: "temperatureChange", factor: 1, aliases: ["kelvin", "k"] },
  { symbol: "°F", quantity: "fahrenheit", factor: 1, aliases: ["°f", "fahrenheit"] },
  { symbol: "°", quantity: "angle", factor: 1, aliases: ["degrees", "degrés", "°", "º"] },
];

/** Units offered in the structured form, per quantity, SI first. */
export function unitsFor(q: QuantityId): Unit[] {
  const list = UNITS.filter((u) => u.quantity === q || (q === "celsius" && u.symbol === "°C") || (q === "kelvin" && u.symbol === "K"));
  if (list.length === 0) return [{ symbol: SI_UNIT[q], quantity: q, factor: 1, aliases: [] }];
  return [...list].sort((a, b) => (a.factor === 1 ? -1 : 0) - (b.factor === 1 ? -1 : 0));
}

type Vals = Record<string, number>;

export interface Variable {
  sym: string;
  quantity: QuantityId;
  name: [string, string];
  /** Filled in when the question does not give it — always stated in the steps. */
  default?: { value: number; note: [string, string] };
  /** A default that only applies when the question mentions something specific. */
  contextDefault?: { when: RegExp; value: number; note: [string, string] };
}

export interface Formula {
  id: string;
  chapterId: string;
  name: [string, string];
  equation: string;
  vars: Variable[];
  /** target → [display of the rearranged formula, computation]. */
  solve: Record<string, [string, (v: Vals) => number]>;
  /** The formula as written: [left side, right side]. */
  sides: (v: Vals) => [number, number];
  /** Words that point at this formula rather than another with the same target. */
  cues?: RegExp;
  /** A sentence on the physics, shown with every answer. */
  concept: [string, string];
}

const G = 6.674e-11;
const C_LIGHT = 3e8;
const g = { value: 9.8, note: ["taking g = 9.8 m/s² (some classes use 10)", "en prenant g = 9,8 m/s² (certaines classes utilisent 10)"] as [string, string] };
const sqrt = (x: number) => (x < 0 ? Number.NaN : Math.sqrt(x));
const deg = Math.PI / 180;

const v = (sym: string, quantity: QuantityId, en: string, fr: string, extra: Partial<Variable> = {}): Variable => ({
  sym, quantity, name: [en, fr], ...extra,
});

export const FORMULAS: Formula[] = [
  /* -------------------------------- Motion -------------------------------- */
  {
    id: "speed", chapterId: "phys-motion", name: ["Speed", "Vitesse"], equation: "v = d / t",
    vars: [v("v", "speed", "speed", "vitesse"), v("d", "distance", "distance", "distance"), v("t", "time", "time", "durée")],
    solve: { v: ["v = d / t", (x) => x.d / x.t], d: ["d = v × t", (x) => x.v * x.t], t: ["t = d / v", (x) => x.d / x.v] },
    sides: (x) => [x.v, x.d / x.t],
    concept: ["Average speed is the distance covered divided by the time taken.", "La vitesse moyenne est la distance parcourue divisée par la durée."],
  },
  {
    id: "acceleration", chapterId: "phys-motion", name: ["Acceleration (v = u + at)", "Accélération (v = u + at)"], equation: "v = u + a × t",
    vars: [v("v", "speed", "final velocity", "vitesse finale"), v("u", "speed", "initial velocity", "vitesse initiale"), v("a", "acceleration", "acceleration", "accélération"), v("t", "time", "time", "durée")],
    solve: {
      a: ["a = (v - u) / t", (x) => (x.v - x.u) / x.t], v: ["v = u + a × t", (x) => x.u + x.a * x.t],
      u: ["u = v - a × t", (x) => x.v - x.a * x.t], t: ["t = (v - u) / a", (x) => (x.v - x.u) / x.a],
    },
    sides: (x) => [x.v, x.u + x.a * x.t],
    concept: ["Acceleration is the change in velocity per second: a = (v - u) / t. Negative acceleration means slowing down.", "L'accélération est la variation de vitesse par seconde : a = (v - u) / t. Négative, elle indique un ralentissement."],
  },
  {
    id: "displacement", chapterId: "phys-motion", name: ["Distance with constant acceleration (s = ut + ½at²)", "Distance à accélération constante (s = ut + ½at²)"], equation: "s = u × t + ½ × a × t²",
    vars: [v("s", "distance", "distance", "distance"), v("u", "speed", "initial velocity", "vitesse initiale"), v("a", "acceleration", "acceleration", "accélération"), v("t", "time", "time", "durée")],
    solve: {
      s: ["s = u × t + ½ × a × t²", (x) => x.u * x.t + 0.5 * x.a * x.t ** 2],
      u: ["u = (s - ½ × a × t²) / t", (x) => (x.s - 0.5 * x.a * x.t ** 2) / x.t],
      a: ["a = 2(s - u × t) / t²", (x) => (2 * (x.s - x.u * x.t)) / x.t ** 2],
      t: ["t = (-u + √(u² + 2as)) / a", (x) => (x.a === 0 ? x.s / x.u : (-x.u + sqrt(x.u ** 2 + 2 * x.a * x.s)) / x.a)],
    },
    sides: (x) => [x.s, x.u * x.t + 0.5 * x.a * x.t ** 2],
    cues: /\bdistance\b.*\b(accelerat|from rest)|\btravel\w*\b.*\baccelerat/,
    concept: ["With constant acceleration, distance grows with the square of time: s = ut + ½at².", "À accélération constante, la distance croît comme le carré du temps : s = ut + ½at²."],
  },
  {
    id: "v-squared", chapterId: "phys-motion", name: ["v² = u² + 2as", "v² = u² + 2as"], equation: "v² = u² + 2 × a × s",
    vars: [v("v", "speed", "final velocity", "vitesse finale"), v("u", "speed", "initial velocity", "vitesse initiale"), v("a", "acceleration", "acceleration", "accélération"), v("s", "distance", "distance", "distance")],
    solve: {
      v: ["v = √(u² + 2as)", (x) => sqrt(x.u ** 2 + 2 * x.a * x.s)],
      u: ["u = √(v² - 2as)", (x) => sqrt(x.v ** 2 - 2 * x.a * x.s)],
      a: ["a = (v² - u²) / 2s", (x) => (x.v ** 2 - x.u ** 2) / (2 * x.s)],
      s: ["s = (v² - u²) / 2a", (x) => (x.v ** 2 - x.u ** 2) / (2 * x.a)],
    },
    sides: (x) => [x.v ** 2, x.u ** 2 + 2 * x.a * x.s],
    concept: ["v² = u² + 2as links speeds and distance when the time is not given.", "v² = u² + 2as relie vitesses et distance quand la durée n'est pas donnée."],
  },

  /* ----------------------------- Force & laws ----------------------------- */
  {
    id: "newton2", chapterId: "phys-force-laws", name: ["Newton's second law", "Deuxième loi de Newton"], equation: "F = m × a",
    vars: [v("F", "force", "force", "force"), v("m", "mass", "mass", "masse"), v("a", "acceleration", "acceleration", "accélération")],
    solve: { F: ["F = m × a", (x) => x.m * x.a], m: ["m = F / a", (x) => x.F / x.a], a: ["a = F / m", (x) => x.F / x.m] },
    sides: (x) => [x.F, x.m * x.a],
    concept: ["The resultant force on an object equals its mass times its acceleration. 1 N is the force that gives 1 kg an acceleration of 1 m/s².", "La force résultante est égale à la masse fois l'accélération. 1 N donne à 1 kg une accélération de 1 m/s²."],
  },
  {
    id: "momentum", chapterId: "phys-force-laws", name: ["Momentum", "Quantité de mouvement"], equation: "p = m × v",
    vars: [v("p", "momentum", "momentum", "quantité de mouvement"), v("m", "mass", "mass", "masse"), v("v", "speed", "velocity", "vitesse")],
    solve: { p: ["p = m × v", (x) => x.m * x.v], m: ["m = p / v", (x) => x.p / x.v], v: ["v = p / m", (x) => x.p / x.m] },
    sides: (x) => [x.p, x.m * x.v],
    concept: ["Momentum is mass times velocity. In a collision with no outside force, total momentum is conserved.", "La quantité de mouvement est la masse fois la vitesse ; elle se conserve lors d'un choc sans force extérieure."],
  },
  {
    id: "pressure", chapterId: "phys-force-laws", name: ["Pressure", "Pression"], equation: "P = F / A",
    vars: [v("P", "pressure", "pressure", "pression"), v("F", "force", "force", "force"), v("A", "area", "area", "surface")],
    solve: { P: ["P = F / A", (x) => x.F / x.A], F: ["F = P × A", (x) => x.P * x.A], A: ["A = F / P", (x) => x.F / x.P] },
    sides: (x) => [x.P, x.F / x.A],
    concept: ["Pressure is force spread over an area: the same force on a smaller area gives a larger pressure.", "La pression est une force répartie sur une surface : la même force sur une surface plus petite donne une pression plus grande."],
  },
  {
    id: "density", chapterId: "phys-force-laws", name: ["Density", "Masse volumique"], equation: "ρ = m / V",
    vars: [v("rho", "density", "density", "masse volumique"), v("m", "mass", "mass", "masse"), v("V", "volume", "volume", "volume")],
    solve: { rho: ["ρ = m / V", (x) => x.m / x.V], m: ["m = ρ × V", (x) => x.rho * x.V], V: ["V = m / ρ", (x) => x.m / x.rho] },
    sides: (x) => [x.rho, x.m / x.V],
    concept: ["Density is mass per unit volume. An object less dense than water floats in it.", "La masse volumique est la masse par unité de volume. Un objet moins dense que l'eau flotte."],
  },

  /* ------------------------------ Gravitation ----------------------------- */
  {
    id: "weight", chapterId: "phys-gravitation", name: ["Weight", "Poids"], equation: "W = m × g",
    vars: [v("W", "force", "weight", "poids"), v("m", "mass", "mass", "masse"), v("g", "acceleration", "gravitational field strength", "intensité de la pesanteur", { default: g })],
    solve: { W: ["W = m × g", (x) => x.m * x.g], m: ["m = W / g", (x) => x.W / x.g], g: ["g = W / m", (x) => x.W / x.m] },
    sides: (x) => [x.W, x.m * x.g],
    cues: /\bweigh|\bpoids\b/,
    concept: ["Weight is the force of gravity on a mass, W = mg. Mass stays the same everywhere; weight changes with g (about 1.6 m/s² on the Moon).", "Le poids est la force de pesanteur, P = mg. La masse est la même partout ; le poids varie avec g (environ 1,6 m/s² sur la Lune)."],
  },
  {
    id: "free-fall", chapterId: "phys-gravitation", name: ["Free fall from rest", "Chute libre sans vitesse initiale"], equation: "h = ½ × g × t²",
    vars: [v("h", "distance", "height fallen", "hauteur de chute"), v("t", "time", "time", "durée"), v("g", "acceleration", "g", "g", { default: g })],
    solve: { h: ["h = ½ × g × t²", (x) => 0.5 * x.g * x.t ** 2], t: ["t = √(2h / g)", (x) => sqrt((2 * x.h) / x.g)], g: ["g = 2h / t²", (x) => (2 * x.h) / x.t ** 2] },
    sides: (x) => [x.h, 0.5 * x.g * x.t ** 2],
    cues: /\b(fall|drop|chute|tombe|l[âa]ch)/,
    concept: ["Ignoring air resistance, every object falls with the same acceleration g, whatever its mass.", "Sans frottements, tous les objets tombent avec la même accélération g, quelle que soit leur masse."],
  },
  {
    id: "fall-speed", chapterId: "phys-gravitation", name: ["Speed after falling from rest", "Vitesse après une chute"], equation: "v = g × t",
    vars: [v("v", "speed", "speed", "vitesse"), v("t", "time", "time", "durée"), v("g", "acceleration", "g", "g", { default: g })],
    solve: { v: ["v = g × t", (x) => x.g * x.t], t: ["t = v / g", (x) => x.v / x.g], g: ["g = v / t", (x) => x.v / x.t] },
    sides: (x) => [x.v, x.g * x.t],
    cues: /\b(fall|drop|chute|tombe|l[âa]ch)/,
    concept: ["Falling from rest, speed increases by about 9.8 m/s every second.", "En chute libre, la vitesse augmente d'environ 9,8 m/s chaque seconde."],
  },
  {
    id: "gravitation", chapterId: "phys-gravitation", name: ["Universal gravitation", "Gravitation universelle"], equation: "F = G × m₁ × m₂ / r²",
    vars: [v("F", "force", "gravitational force", "force gravitationnelle"), v("m1", "mass", "first mass", "première masse"), v("m2", "mass", "second mass", "deuxième masse"), v("r", "distance", "distance between centres", "distance entre les centres")],
    solve: {
      F: ["F = G × m₁ × m₂ / r²", (x) => (G * x.m1 * x.m2) / x.r ** 2],
      r: ["r = √(G × m₁ × m₂ / F)", (x) => sqrt((G * x.m1 * x.m2) / x.F)],
      m1: ["m₁ = F × r² / (G × m₂)", (x) => (x.F * x.r ** 2) / (G * x.m2)],
      m2: ["m₂ = F × r² / (G × m₁)", (x) => (x.F * x.r ** 2) / (G * x.m1)],
    },
    sides: (x) => [x.F, (G * x.m1 * x.m2) / x.r ** 2],
    cues: /gravitational force|force of (?:gravitational )?attraction|attraction gravitationnelle|between (?:two|the)/,
    concept: ["Every two masses attract with F = Gm₁m₂/r², G = 6.674 × 10⁻¹¹ N·m²/kg². Doubling the distance quarters the force.", "Deux masses s'attirent avec F = Gm₁m₂/r², G = 6,674 × 10⁻¹¹ N·m²/kg². Doubler la distance divise la force par quatre."],
  },

  /* -------------------------- Work, energy, power -------------------------- */
  {
    id: "work", chapterId: "phys-work-energy", name: ["Work done", "Travail d'une force"], equation: "W = F × d",
    vars: [v("W", "energy", "work done", "travail"), v("F", "force", "force", "force"), v("d", "distance", "distance moved", "déplacement")],
    solve: { W: ["W = F × d", (x) => x.F * x.d], F: ["F = W / d", (x) => x.W / x.d], d: ["d = W / F", (x) => x.W / x.F] },
    sides: (x) => [x.W, x.F * x.d],
    cues: /\bwork\b|\btravail\b/,
    concept: ["Work is done when a force moves something in the direction of the force: W = Fd, in joules.", "Une force travaille quand elle déplace un objet dans sa direction : W = F × d, en joules."],
  },
  {
    id: "kinetic", chapterId: "phys-work-energy", name: ["Kinetic energy", "Énergie cinétique"], equation: "KE = ½ × m × v²",
    vars: [v("KE", "energy", "kinetic energy", "énergie cinétique"), v("m", "mass", "mass", "masse"), v("v", "speed", "speed", "vitesse")],
    solve: { KE: ["KE = ½ × m × v²", (x) => 0.5 * x.m * x.v ** 2], m: ["m = 2KE / v²", (x) => (2 * x.KE) / x.v ** 2], v: ["v = √(2KE / m)", (x) => sqrt((2 * x.KE) / x.m)] },
    sides: (x) => [x.KE, 0.5 * x.m * x.v ** 2],
    cues: /kinetic|cin[ée]tique/,
    concept: ["Kinetic energy depends on the square of speed: doubling the speed quadruples the energy.", "L'énergie cinétique dépend du carré de la vitesse : doubler la vitesse multiplie l'énergie par quatre."],
  },
  {
    id: "potential", chapterId: "phys-work-energy", name: ["Gravitational potential energy", "Énergie potentielle de pesanteur"], equation: "PE = m × g × h",
    vars: [v("PE", "energy", "potential energy", "énergie potentielle"), v("m", "mass", "mass", "masse"), v("h", "distance", "height", "hauteur"), v("g", "acceleration", "g", "g", { default: g })],
    solve: { PE: ["PE = m × g × h", (x) => x.m * x.g * x.h], m: ["m = PE / (g × h)", (x) => x.PE / (x.g * x.h)], h: ["h = PE / (m × g)", (x) => x.PE / (x.m * x.g)], g: ["g = PE / (m × h)", (x) => x.PE / (x.m * x.h)] },
    sides: (x) => [x.PE, x.m * x.g * x.h],
    cues: /potential|potentielle|\bheight\b|\bhauteur\b/,
    concept: ["Lifting a mass m through a height h stores energy mgh, released again if it falls.", "Soulever une masse m d'une hauteur h stocke l'énergie mgh, restituée si elle retombe."],
  },
  {
    id: "power", chapterId: "phys-work-energy", name: ["Power", "Puissance"], equation: "P = W / t",
    vars: [v("P", "power", "power", "puissance"), v("W", "energy", "work or energy", "travail ou énergie"), v("t", "time", "time", "durée")],
    solve: { P: ["P = W / t", (x) => x.W / x.t], W: ["W = P × t", (x) => x.P * x.t], t: ["t = W / P", (x) => x.W / x.P] },
    sides: (x) => [x.P, x.W / x.t],
    concept: ["Power is how fast energy is transferred: 1 watt is 1 joule per second.", "La puissance est la vitesse de transfert d'énergie : 1 watt = 1 joule par seconde."],
  },

  /* --------------------------------- Heat --------------------------------- */
  {
    id: "heat", chapterId: "phys-heat", name: ["Heat energy", "Énergie thermique"], equation: "Q = m × c × ΔT",
    vars: [v("Q", "energy", "heat energy", "énergie thermique"), v("m", "mass", "mass", "masse"), v("c", "specificHeat", "specific heat capacity", "capacité thermique massique", { contextDefault: { when: /\bwater\b|\beau\b/, value: 4200, note: ["water: c ≈ 4200 J/(kg·°C)", "eau : c ≈ 4200 J/(kg·°C)"] } }), v("dT", "temperatureChange", "temperature change", "variation de température")],
    solve: { Q: ["Q = m × c × ΔT", (x) => x.m * x.c * x.dT], m: ["m = Q / (c × ΔT)", (x) => x.Q / (x.c * x.dT)], c: ["c = Q / (m × ΔT)", (x) => x.Q / (x.m * x.dT)], dT: ["ΔT = Q / (m × c)", (x) => x.Q / (x.m * x.c)] },
    sides: (x) => [x.Q, x.m * x.c * x.dT],
    cues: /heat|chaleur|warm|thermique|specific heat/,
    concept: ["The heat needed to warm something is its mass × specific heat capacity × temperature rise. Water's specific heat capacity is about 4200 J/(kg·°C).", "La chaleur nécessaire = masse × capacité thermique massique × élévation de température. Pour l'eau, environ 4200 J/(kg·°C)."],
  },
  {
    id: "celsius-kelvin", chapterId: "phys-heat", name: ["Celsius ↔ kelvin", "Celsius ↔ kelvin"], equation: "T(K) = T(°C) + 273.15",
    vars: [v("K", "kelvin", "temperature in kelvin", "température en kelvin"), v("C", "celsius", "temperature in °C", "température en °C")],
    solve: { K: ["T(K) = T(°C) + 273.15", (x) => x.C + 273.15], C: ["T(°C) = T(K) - 273.15", (x) => x.K - 273.15] },
    sides: (x) => [x.K, x.C + 273.15],
    concept: ["Kelvin starts at absolute zero (-273.15 °C); a change of 1 K equals a change of 1 °C.", "L'échelle kelvin part du zéro absolu (-273,15 °C) ; une variation de 1 K vaut une variation de 1 °C."],
  },
  {
    id: "celsius-fahrenheit", chapterId: "phys-heat", name: ["Celsius ↔ Fahrenheit", "Celsius ↔ Fahrenheit"], equation: "F = 9/5 × C + 32",
    vars: [v("F", "fahrenheit", "temperature in °F", "température en °F"), v("C", "celsius", "temperature in °C", "température en °C")],
    solve: { F: ["F = 9/5 × C + 32", (x) => (9 / 5) * x.C + 32], C: ["C = 5/9 × (F - 32)", (x) => (5 / 9) * (x.F - 32)] },
    sides: (x) => [x.F, (9 / 5) * x.C + 32],
    concept: ["Water freezes at 0 °C = 32 °F and boils at 100 °C = 212 °F.", "L'eau gèle à 0 °C = 32 °F et bout à 100 °C = 212 °F."],
  },

  /* --------------------------------- Light -------------------------------- */
  {
    id: "refractive-index", chapterId: "phys-light", name: ["Refractive index from speeds", "Indice de réfraction et vitesse"], equation: "n = c / v",
    vars: [v("n", "ratio", "refractive index", "indice de réfraction"), v("v", "speed", "speed of light in the material", "vitesse de la lumière dans le milieu")],
    solve: { n: ["n = c / v", (x) => C_LIGHT / x.v], v: ["v = c / n", (x) => C_LIGHT / x.n] },
    sides: (x) => [x.n, C_LIGHT / x.v],
    cues: /refractive|r[ée]fraction|speed of light|vitesse de la lumi/,
    concept: ["Light is slower in glass or water than in a vacuum (c = 3 × 10⁸ m/s); the refractive index n = c/v says how much slower.", "La lumière est plus lente dans le verre ou l'eau que dans le vide (c = 3 × 10⁸ m/s) ; l'indice n = c/v mesure ce ralentissement."],
  },
  {
    id: "snell", chapterId: "phys-light", name: ["Snell's law (from air)", "Loi de Snell-Descartes (depuis l'air)"], equation: "n = sin i / sin r",
    vars: [v("n", "ratio", "refractive index", "indice de réfraction"), v("i", "angle", "angle of incidence", "angle d'incidence"), v("r", "angle", "angle of refraction", "angle de réfraction")],
    solve: {
      n: ["n = sin i / sin r", (x) => Math.sin(x.i * deg) / Math.sin(x.r * deg)],
      i: ["i = sin⁻¹(n × sin r)", (x) => (Math.abs(x.n * Math.sin(x.r * deg)) > 1 ? Number.NaN : Math.asin(x.n * Math.sin(x.r * deg)) / deg)],
      r: ["r = sin⁻¹(sin i / n)", (x) => (Math.abs(Math.sin(x.i * deg) / x.n) > 1 ? Number.NaN : Math.asin(Math.sin(x.i * deg) / x.n) / deg)],
    },
    sides: (x) => [x.n, Math.sin(x.i * deg) / Math.sin(x.r * deg)],
    cues: /incidence|refraction|r[ée]fraction|snell/,
    concept: ["Entering a denser material, light bends towards the normal. Angles are measured from the normal, not the surface.", "En entrant dans un milieu plus réfringent, la lumière se rapproche de la normale. Les angles se mesurent par rapport à la normale."],
  },

  /* ------------------------------ Electricity ----------------------------- */
  {
    id: "ohm", chapterId: "phys-electricity", name: ["Ohm's law", "Loi d'Ohm"], equation: "V = I × R",
    vars: [v("V", "voltage", "voltage", "tension"), v("I", "current", "current", "intensité"), v("R", "resistance", "resistance", "résistance")],
    solve: { V: ["V = I × R", (x) => x.I * x.R], I: ["I = V / R", (x) => x.V / x.R], R: ["R = V / I", (x) => x.V / x.I] },
    sides: (x) => [x.V, x.I * x.R],
    concept: ["For a resistor at constant temperature, current is proportional to voltage: V = IR.", "Pour un conducteur ohmique, l'intensité est proportionnelle à la tension : U = R × I."],
  },
  {
    id: "electric-power", chapterId: "phys-electricity", name: ["Electrical power", "Puissance électrique"], equation: "P = V × I",
    vars: [v("P", "power", "power", "puissance"), v("V", "voltage", "voltage", "tension"), v("I", "current", "current", "intensité")],
    solve: { P: ["P = V × I", (x) => x.V * x.I], V: ["V = P / I", (x) => x.P / x.I], I: ["I = P / V", (x) => x.P / x.V] },
    sides: (x) => [x.P, x.V * x.I],
    concept: ["Electrical power is voltage times current. A 60 W bulb on 230 V draws about 0.26 A.", "La puissance électrique est la tension fois l'intensité. Une lampe de 60 W sous 230 V consomme environ 0,26 A."],
  },
  {
    id: "power-resistance", chapterId: "phys-electricity", name: ["Power in a resistor", "Puissance dissipée"], equation: "P = I² × R",
    vars: [v("P", "power", "power", "puissance"), v("I", "current", "current", "intensité"), v("R", "resistance", "resistance", "résistance")],
    solve: { P: ["P = I² × R", (x) => x.I ** 2 * x.R], I: ["I = √(P / R)", (x) => sqrt(x.P / x.R)], R: ["R = P / I²", (x) => x.P / x.I ** 2] },
    sides: (x) => [x.P, x.I ** 2 * x.R],
    concept: ["Heating in a resistor grows with the square of the current, which is why high-current wires get hot.", "L'échauffement d'un conducteur croît avec le carré de l'intensité."],
  },
  {
    id: "electric-energy", chapterId: "phys-electricity", name: ["Electrical energy", "Énergie électrique"], equation: "E = P × t",
    vars: [v("E", "energy", "energy", "énergie"), v("P", "power", "power", "puissance"), v("t", "time", "time", "durée")],
    solve: { E: ["E = P × t", (x) => x.P * x.t], P: ["P = E / t", (x) => x.E / x.t], t: ["t = E / P", (x) => x.E / x.P] },
    sides: (x) => [x.E, x.P * x.t],
    concept: ["Energy used is power × time. Electricity bills count kilowatt-hours: 1 kWh = 3.6 million joules.", "L'énergie consommée est la puissance fois la durée. Les factures comptent en kWh : 1 kWh = 3,6 millions de joules."],
  },
  {
    id: "charge", chapterId: "phys-electricity", name: ["Charge", "Charge électrique"], equation: "Q = I × t",
    vars: [v("Q", "charge", "charge", "charge"), v("I", "current", "current", "intensité"), v("t", "time", "time", "durée")],
    solve: { Q: ["Q = I × t", (x) => x.I * x.t], I: ["I = Q / t", (x) => x.Q / x.t], t: ["t = Q / I", (x) => x.Q / x.I] },
    sides: (x) => [x.Q, x.I * x.t],
    concept: ["Current is the rate of flow of charge: 1 ampere is 1 coulomb per second.", "L'intensité est le débit de charge : 1 ampère = 1 coulomb par seconde."],
  },
];

export const formulaById = (id: string) => FORMULAS.find((f) => f.id === id);
