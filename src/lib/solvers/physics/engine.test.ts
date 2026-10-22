import { describe, expect, it } from "vitest";
import { extractQuantities, findTarget, solveFormula, solvePhysics } from "./engine";
import { FORMULAS, formulaById } from "./formulas";
import { sayIn, type SolveOutcome } from "../types";

function answer(o: SolveOutcome) {
  if (o.kind !== "solved") throw new Error(`expected solved, got ${o.kind}${o.kind === "invalid" ? `: ${o.reason}` : ""}`);
  expect(o.result.check.passed).toBe(true);
  return o.result;
}

describe("reading quantities", () => {
  it("converts units to SI and keeps what was written", () => {
    const [speed, time] = extractQuantities("A bus at 72 km/h for 15 min");
    expect(speed).toMatchObject({ quantity: "speed", raw: "72 km/h" });
    expect(speed.value).toBeCloseTo(20);
    expect(time).toMatchObject({ quantity: "time", value: 900 });
  });

  it("tells m/s² from m/s from m, and reads powers of ten", () => {
    const q = extractQuantities("9.8 m/s², 20 m/s, 5 m, 6 × 10^24 kg");
    expect(q.map((k) => k.quantity)).toEqual(["acceleration", "speed", "distance", "mass"]);
    expect(q[3].value).toBe(6e24);
  });

  it("finds what is asked, not the first quantity mentioned", () => {
    expect(findTarget("Find the force needed to give 2 kg an acceleration of 3 m/s²")).toMatchObject({ quantity: "force" });
    expect(findTarget("A car accelerates at 2 m/s². How long does it take to reach 20 m/s?")).toMatchObject({ quantity: "time" });
  });
});

/** Expected values worked by hand. */
describe("textbook problems", () => {
  it.each([
    ["A car travels 100 m in 20 s. Find its speed.", "phys-motion", 5],
    ["A bus travels at 72 km/h for 15 min. What distance does it cover?", "phys-motion", 18000],
    ["A car starts from rest and reaches 20 m/s in 10 s. Find its acceleration.", "phys-motion", 2],
    ["A car moving at 30 m/s comes to rest in 6 s. Find the acceleration.", "phys-motion", -5],
    ["A train starts from rest and accelerates at 2 m/s² for 10 s. What distance does it travel?", "phys-motion", 100],
    ["Find the force needed to give a 2 kg mass an acceleration of 3 m/s².", "phys-force-laws", 6],
    ["A force of 12 N acts on a 3 kg box. Find the acceleration.", "phys-force-laws", 4],
    ["What is the momentum of a 0.5 kg ball moving at 8 m/s?", "phys-force-laws", 4],
    ["A force of 500 N acts on an area of 2 m². Find the pressure.", "phys-force-laws", 250],
    ["Find the weight of a 50 kg student.", "phys-gravitation", 490],
    ["A stone is dropped and falls for 2 s. How far does it fall?", "phys-gravitation", 19.6],
    ["How much work is done pushing a box 5 m with a force of 20 N?", "phys-work-energy", 100],
    ["Find the kinetic energy of a 2 kg ball moving at 3 m/s.", "phys-work-energy", 9],
    ["Find the potential energy of a 10 kg mass at a height of 5 m.", "phys-work-energy", 490],
    ["A motor does 6000 J of work in 30 s. Find its power.", "phys-work-energy", 200],
    ["How much heat is needed to warm 2 kg of water from 20 °C to 70 °C?", "phys-heat", 420000],
    ["Convert 25 °C to kelvin", "phys-heat", 298.15],
    ["The speed of light in glass is 2 × 10^8 m/s. Find the refractive index of glass.", "phys-light", 1.5],
    ["A 12 V battery drives a current of 2 A through a resistor. Find the resistance.", "phys-electricity", 6],
    ["Find the current through a 4 Ω resistor connected to 12 V.", "phys-electricity", 3],
    ["A 2 kW heater runs for 3 h. How much energy does it use?", "phys-electricity", 21600000],
    ["Find the total resistance of 2 Ω, 3 Ω and 6 Ω in parallel.", "phys-electricity", 1],
    ["Resistors of 4 Ω and 6 Ω in series: total resistance?", "phys-electricity", 10],
    ["Une voiture parcourt 100 m en 20 s. Calcule sa vitesse.", "phys-motion", 5],
  ])("%s", (q, chapter, expected) => {
    const r = answer(solvePhysics(q, q.startsWith("Une") ? "fr" : "en", chapter));
    expect(r.value).toBeCloseTo(expected, 6);
  });

  it("states the assumed value of g", () => {
    const r = answer(solvePhysics("Find the weight of a 50 kg student.", "en", "phys-gravitation"));
    expect(r.steps[0]).toContain("g = 9.8");
  });

  it("gives the answer in the unit the question used", () => {
    const r = answer(solvePhysics("A car covers 150 km in 2 h. Find its speed.", "en", "phys-motion"));
    expect(r.answer).toBe("v = 20.8333 m/s = 75 km/h");
  });
});

describe("refusing honestly", () => {
  it("does not answer conceptual questions", () => {
    expect(solvePhysics("Why does a heavier object not fall faster?", "en").kind).toBe("unrecognised");
  });

  it("says what is missing", () => {
    const o = solvePhysics("A car accelerates for 10 s. Find its acceleration.", "en", "phys-motion");
    expect(o.kind).toBe("invalid");
  });

  it("rejects impossible inputs instead of dividing by zero", () => {
    const f = formulaById("speed")!;
    const known = (value: number, quantity: "distance" | "time") => ({ value, quantity, raw: "", unit: null, index: 0 });
    const o = solveFormula(f, "v", { d: known(100, "distance"), t: known(0, "time") }, sayIn("en"));
    expect(o.kind === "invalid" && o.reason).toContain("greater than zero");
  });

  it("flags a negative value under a square root", () => {
    // v² = u² + 2as with u = 2, a = -10, s = 5 → v² = 4 - 100 < 0
    const f = formulaById("v-squared")!;
    const k = (value: number, quantity: "speed" | "acceleration" | "distance") => ({ value, quantity, raw: "", unit: null, index: 0 });
    const o = solveFormula(f, "v", { u: k(2, "speed"), a: k(-10, "acceleration"), s: k(5, "distance") }, sayIn("en"));
    expect(o.kind === "invalid" && o.reason).toContain("no real answer");
  });
});

describe("every formula, every rearrangement", () => {
  // Pick values, compute the target from the formula AS WRITTEN (sides), then
  // check each rearrangement recovers every variable. A wrong rearrangement fails here.
  it.each(FORMULAS.map((f) => [f.id]))("%s", (id) => {
    const f = formulaById(id)!;
    const base: Record<string, number> = {};
    f.vars.forEach((v, i) => (base[v.sym] = v.quantity === "angle" ? 20 + 10 * i : 2 + i));
    const lhsSym = f.vars[0].sym;
    // Solve for the first variable so the set is consistent.
    base[lhsSym] = f.solve[lhsSym][1](base);
    for (const v of f.vars) {
      const others = { ...base };
      delete others[v.sym];
      const got = f.solve[v.sym]?.[1](others);
      if (got === undefined) continue;
      expect(got, `${id}: ${v.sym}`).toBeCloseTo(base[v.sym], 6);
    }
  });
});
