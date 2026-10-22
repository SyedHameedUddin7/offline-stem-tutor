import { describe, expect, it } from "vitest";
import { solveHcfLcm, solveInterest, solvePercent, solvePrimeFactors, solveRatioShare } from "./numbers";
import { solveAverages, solveProbability } from "./statistics";
import { solveAngles, solveCoordinates, solvePythagoras } from "./geometry";
import { measure, solveMensuration } from "./mensuration";
import { sayIn, type SolveOutcome } from "../types";

const en = sayIn("en");
const fr = sayIn("fr");

function answer(o: SolveOutcome) {
  if (o.kind !== "solved") throw new Error(`expected solved, got ${o.kind}${o.kind === "invalid" ? `: ${o.reason}` : ""}`);
  expect(o.result.check.passed).toBe(true);
  return o.result;
}

/** Every expected value below was worked out by hand. */
describe("HCF, LCM and primes", () => {
  it.each([
    ["Find the HCF and LCM of 24 and 36.", "HCF = 12, LCM = 72"],
    ["LCM of 4, 6 and 10", "LCM = 60"],
    ["Trouve le PGCD de 84 et 120", "PGCD = 12"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveHcfLcm(q, q.startsWith("Trouve") ? fr : en)).answer).toBe(expected);
  });

  it.each([
    ["Prime factorisation of 360", "360 = 2³ × 3² × 5"],
    ["Factorise 84", "84 = 2² × 3 × 7"],
    ["prime factors of 97", "97 is prime"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solvePrimeFactors(q, en)).answer).toBe(expected);
  });

  it("rejects non-integers", () => {
    expect(solveHcfLcm("HCF of 2.5 and 5", en)).toMatchObject({ kind: "invalid" });
  });
});

describe("percentages, interest, ratio", () => {
  it.each([
    ["What is 15% of 80?", "12"],
    ["What percent of 80 is 20?", "25%"],
    ["20 as a percentage of 80", "25%"],
    ["Percentage increase from 50 to 65", "30% increase"],
    ["Price falls from 200 to 150, percentage change?", "25% decrease"],
    ["Increase 200 by 15%", "230"],
    ["Calcule 20 % de 50", "10"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solvePercent(q, en)).answer).toBe(expected);
  });

  it("simple interest: 5000 at 8% for 3 years is 1200", () => {
    expect(answer(solveInterest("Simple interest on 5000 at 8% for 3 years", en)).answer).toBe("Interest = 1200, amount = 6200");
  });

  it("compound interest: 10000 at 5% for 2 years is 1025", () => {
    expect(answer(solveInterest("Compound interest on 10000 at 5% for 2 years", en)).answer).toBe("Amount = 11025, interest = 1025");
  });

  it("asks for the missing rate", () => {
    expect(solveInterest("Simple interest on 5000 for 3 years", en)).toMatchObject({ kind: "invalid" });
  });

  it("shares 3500 in the ratio 3:4 as 1500 and 2000", () => {
    expect(answer(solveRatioShare("Share 3500 in the ratio 3:4", en)).answer).toBe("1500 : 2000");
  });
});

describe("statistics and probability", () => {
  it("mean, median, mode and range of 4, 8, 15, 16, 23, 42", () => {
    // sum 108, n 6, mean 18; median (15+16)/2 = 15.5; no mode; range 38
    expect(answer(solveAverages("Find the mean, median, mode and range of 4, 8, 15, 16, 23, 42", en)).answer).toBe(
      "mean = 18, median = 15.5, mode = none, range = 38"
    );
  });

  it("mode of 2, 3, 3, 5, 3, 2", () => {
    expect(answer(solveAverages("mode of 2, 3, 3, 5, 3, 2", en)).answer).toBe("mode = 3");
  });

  it.each([
    ["A bag has 3 red and 5 blue balls. Probability of picking a red ball?", "P = 3/8 = 0.375"],
    ["Probability of getting an even number on a fair die", "P = 1/2 = 0.5"],
    ["Probability of rolling a number greater than 4 on a die", "P = 1/3 ≈ 0.333"],
    ["Un sac contient 2 boules rouges et 6 boules vertes. Probabilité de tirer une boule verte ?", "P = 3/4 = 0.75"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveProbability(q, en)).answer).toBe(expected);
  });
});

describe("geometry", () => {
  it.each([
    ["Right triangle with legs 3 cm and 4 cm, find the hypotenuse", "5 cm"],
    ["The hypotenuse is 13 and one side is 5. Find the other side (Pythagoras)", "12"],
    ["right-angled triangle sides 1 and 1, hypotenuse?", "√2 ≈ 1.414"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solvePythagoras(q, en)).answer).toBe(expected);
  });

  it("rejects a 'hypotenuse' shorter than a side", () => {
    expect(solvePythagoras("hypotenuse is 4 and one side is 5", en)).toMatchObject({ kind: "invalid" });
  });

  it.each([
    ["Two angles of a triangle are 50° and 60°. Find the third.", "70°"],
    ["Complement of 35°", "55°"],
    ["supplement of 110", "70°"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveAngles(q, en)).answer).toBe(expected);
  });

  it.each([
    ["Distance between (1, 2) and (4, 6)", "5"],
    ["Midpoint of (2, 3) and (6, 9)", "(4, 6)"],
    ["Gradient of the line through (1, 1) and (3, 7)", "m = 3"],
    ["distance between (0, 0) and (1, 1)", "√2 ≈ 1.414"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveCoordinates(q, en)).answer).toBe(expected);
  });
});

describe("mensuration", () => {
  it.each([
    // 49π = 153.938..., 22/7 version 154
    ["Find the area of a circle with radius 7 cm", "49π = 153.938 cm²"],
    ["circumference of a circle of diameter 10 cm", "10π = 31.4159 cm"],
    ["Area of a rectangle 5 m by 3 m", "15 m²"],
    ["perimeter of a square of side 4 cm", "16 cm"],
    ["Area of a triangle with base 6 cm and height 4 cm", "12 cm²"],
    ["Area of a triangle with sides 3, 4 and 5", "6 square units"],
    ["Volume of a cylinder with radius 3 cm and height 10 cm", "90π = 282.7433 cm³"],
    ["Volume of a cuboid 5 x 4 x 3 cm", "60 cm³"],
    ["Total surface area of a cube with side 3 cm", "54 cm²"],
    ["Volume of a sphere of radius 3 m", "36π = 113.0973 m³"],
    ["Volume of a cone with radius 3 cm and height 4 cm", "12π = 37.6991 cm³"],
    ["Curved surface area of a cone with radius 3 cm and height 4 cm", "15π = 47.1239 cm²"],
    ["Area of a trapezium with parallel sides 6 and 8 cm and height 5 cm", "35 cm²"],
    ["Aire d'un disque de rayon 2 cm", "4π = 12.5664 cm²"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveMensuration(q, en)).answer).toBe(expected);
  });

  it("shows the π = 22/7 and 3.14 versions a textbook might expect", () => {
    const r = answer(solveMensuration("Find the area of a circle with radius 7 cm", en));
    expect(r.steps.join("\n")).toContain("π = 22/7: 154");
  });

  it("asks for what is missing, and rejects impossible triangles", () => {
    const missing = measure("cylinder", "volume", { r: 3 }, "cm", en);
    expect(missing.kind === "invalid" && missing.reason).toContain("radius + height");
    expect(measure("triangle", "area", { a: 1, b2: 2, c: 10 }, "", en)).toMatchObject({ kind: "invalid" });
    expect(measure("square", "area", { a: -2 }, "", en)).toMatchObject({ kind: "invalid" });
  });
});
