import { describe, expect, it } from "vitest";
import { solveArithmetic, solveEquation, solveExpand, solveFactorise } from "./algebra";
import { sayIn, type SolveOutcome } from "../types";

const en = sayIn("en");
const fr = sayIn("fr");

function answer(o: SolveOutcome) {
  if (o.kind !== "solved") throw new Error(`expected solved, got ${o.kind}${o.kind === "invalid" ? `: ${o.reason}` : ""}`);
  expect(o.result.check.passed).toBe(true);
  return o.result;
}

/** Expected values are worked by hand, not taken from the solver. */
describe("linear equations", () => {
  it.each([
    ["Solve for x: 3x + 7 = 22", "x = 5"],
    ["Solve 5x - 3 = 17", "x = 4"],
    ["2(x - 1) = x + 4", "x = 6"],
    ["Solve: (2x - 1)/3 = (x + 4)/2", "x = 14"],
    ["7 - 2y = 3y + 22", "y = -3"],
    ["3x + 1/3 = 2", "x = 5/9 ≈ 0.556"],
    ["0.5x + 1.5 = 4", "x = 5"],
    ["Résous : 4(x + 2) = 2x + 20", "x = 6"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveEquation(q, en)).answer).toBe(expected);
  });

  it("shows the steps a teacher would write", () => {
    const r = answer(solveEquation("Solve: (2x - 1)/3 = (x + 4)/2", en));
    expect(r.steps.some((s) => s.startsWith("Multiply both sides by 6"))).toBe(true);
    expect(r.check.detail).toContain("left side = 9, right side = 9");
  });

  it("explains an equation with no solution or every solution", () => {
    const none = solveEquation("x + 1 = x + 2", en);
    expect(none).toMatchObject({ kind: "invalid" });
    const all = solveEquation("2(x + 1) = 2x + 2", en);
    expect(all.kind === "invalid" && all.reason).toContain("every value");
  });

  it("asks for a second equation when there are two unknowns", () => {
    const o = solveEquation("x + y = 10", en);
    expect(o.kind === "invalid" && o.reason).toContain("second equation");
  });

  it("speaks French", () => {
    const r = answer(solveEquation("Résous : 3x + 7 = 22", fr));
    expect(r.title).toBe("Équation du premier degré");
    expect(r.check.detail).toContain("membre de gauche");
  });
});

describe("quadratic equations", () => {
  it.each([
    ["Solve x^2 - 5x + 6 = 0", "x = 3 or x = 2"],
    ["x² + 2x + 1 = 0", "x = -1"],
    ["2x^2 = 8", "x = 2 or x = -2"],
    ["x^2 - 3x = 0", "x = 3 or x = 0"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveEquation(q, en)).answer).toBe(expected);
  });

  it("gives an exact surd and decimals when the roots are irrational", () => {
    // x² - 2x - 1 = 0 → x = 1 ± √2 ≈ 2.414, -0.414
    const r = answer(solveEquation("x^2 - 2x - 1 = 0", en));
    expect(r.answer).toBe("x = 1 ± √2 ≈ 2.414 or -0.414");
  });

  it("says when there are no real solutions", () => {
    expect(answer(solveEquation("x^2 + x + 1 = 0", en)).answer).toBe("No real solutions");
  });
});

describe("systems of two equations", () => {
  it.each([
    ["Solve x + y = 10 and x - y = 2", "x = 6, y = 4"],
    ["2x + 3y = 12; x - y = 1", "x = 3, y = 2"],
    ["3a + 2b = 7, a = 1", "a = 1, b = 2"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveEquation(q, en)).answer).toBe(expected);
  });

  it("recognises parallel lines", () => {
    const o = solveEquation("x + y = 2 and 2x + 2y = 5", en);
    expect(o.kind === "invalid" && o.reason).toContain("parallel");
  });
});

describe("expand", () => {
  it.each([
    ["Expand (x + 5)(x - 3)", "x² + 2x - 15"],
    ["Expand (a + b)^2", "a² + 2ab + b²"],
    ["Expand (2x - 1)(x + 4)", "2x² + 7x - 4"],
    ["Simplify 3x + 2x - 4 + 7", "5x + 3"],
    ["Expand (a - b)(a + b)", "a² - b²"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveExpand(q, en)).answer).toBe(expected);
  });
});

describe("factorise", () => {
  it.each([
    ["Factorise x^2 - 5x + 6", "(x - 3)(x - 2)"],
    ["Factorise 6x + 9", "3(2x + 3)"],
    ["Factorise x^2 + 3x", "x(x + 3)"],
    ["Factorise 2x^2 + 7x - 4", "(2x - 1)(x + 4)"],
  ])("%s → %s", (q, expected) => {
    expect(answer(solveFactorise(q, en)).answer).toBe(expected);
  });

  it("says when it cannot factorise", () => {
    expect(solveFactorise("Factorise x^2 + x + 1", en)).toMatchObject({ kind: "invalid" });
  });
});

describe("arithmetic", () => {
  it.each([
    ["Simplify: 7 + 3 x (8 - 5) ÷ 3", "10"],
    ["What is 3/4 + 2/5?", "23/20 = 1.15"],
    ["Calculate 2^10", "1024"],
    ["(12 - 4) × 3 - 5", "19"],
    ["1/3 + 1/6", "1/2 = 0.5"],
    ["2/3 of", null],
  ])("%s → %s", (q, expected) => {
    const o = solveArithmetic(q, en);
    if (expected === null) expect(o.kind).toBe("unrecognised");
    else expect(answer(o).answer).toBe(expected);
  });

  it("lists each operation in the order it is done", () => {
    const r = answer(solveArithmetic("Simplify: 7 + 3 x (8 - 5) ÷ 3", en));
    expect(r.steps.slice(1)).toEqual(["1. 8 - 5 = 3", "2. 3 × 3 = 9", "3. 9 ÷ 3 = 3", "4. 7 + 3 = 10"]);
  });

  it("refuses division by zero", () => {
    expect(solveArithmetic("5 / (3 - 3)", en)).toMatchObject({ kind: "invalid" });
  });

  it("leaves questions with words alone", () => {
    expect(solveArithmetic("What is the area of a circle with radius 7?", en).kind).toBe("unrecognised");
  });
});
