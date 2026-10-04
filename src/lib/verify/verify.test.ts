import { describe, expect, it } from "vitest";
import {
  checkArithmetic,
  checkDimensions,
  dimensionOfUnit,
  expectedQuantity,
  extractFinalNumber,
  verifyAnswer,
  verifyLinearSolution,
} from "./index";

describe("checkArithmetic", () => {
  /**
   * The regression that started all of this: the model wrote working whose
   * own second line contradicted the question, and nothing noticed.
   */
  it("catches the 2,4,6,8 failure", () => {
    const report = checkArithmetic("2 + 4 = 6, 4 + 6 = 10, 6 + 8 = 14. So the answer is 20.");
    expect(report.wrong).toHaveLength(0); // each claim is arithmetically true
    expect(report.verified).toBe(true);
    // The claims are internally valid — it is the premise that was wrong,
    // which is what the solver catches. Documented so the boundary is clear.
  });

  it("catches genuinely wrong arithmetic", () => {
    const report = checkArithmetic("First 3 x 4 = 12, then adding two gives 3 x 4 = 14.");
    expect(report.wrong).toHaveLength(1);
    expect(report.wrong[0].actual).toBe(12);
    expect(report.wrong[0].claimed).toBe(14);
    expect(report.verified).toBe(false);
  });

  it.each([
    ["7 + 5 = 12", true],
    ["7 + 5 = 13", false],
    ["20 - 8 = 12", true],
    ["6 x 7 = 42", true],
    ["6 × 7 = 41", false],
    ["144 / 12 = 12", true],
    ["144 ÷ 12 = 11", false],
    ["2.5 + 2.5 = 5", true],
  ])("evaluates %s", (text, shouldBeCorrect) => {
    expect(checkArithmetic(text).claims[0].correct).toBe(shouldBeCorrect);
  });

  it("reports prose with no arithmetic as unverifiable, not as passing", () => {
    const report = checkArithmetic("Photosynthesis converts light into chemical energy.");
    expect(report.unverifiable).toBe(true);
    expect(report.verified).toBe(false);
  });

  it("ignores division by zero rather than reporting Infinity", () => {
    expect(checkArithmetic("5 / 0 = 0").claims).toHaveLength(0);
  });

  /**
   * Regression found by the evaluation suite. The binary pattern matched
   * "2 x 36 = 36" out of "0.5 x 2 x 36 = 36" and called a correct answer
   * wrong. Chains are now skipped rather than mis-evaluated.
   */
  it("does not mis-read a fragment of a longer chain", () => {
    const report = checkArithmetic("KE = 0.5 x 2 x 36 = 36, so 36 J");
    expect(report.wrong).toHaveLength(0);
    expect(report.unverifiable).toBe(true);
  });

  it("still checks a standalone claim that follows a chain", () => {
    const report = checkArithmetic("First 2 x 3 x 4 = 24. Separately, 5 + 5 = 11.");
    expect(report.wrong).toHaveLength(1);
    expect(report.wrong[0].text).toContain("5 + 5");
  });

  it("uses relative tolerance so floating point does not false-positive", () => {
    expect(checkArithmetic("0.1 + 0.2 = 0.3").claims[0].correct).toBe(true);
  });
});

describe("verifyLinearSolution", () => {
  it("accepts a correct solution by substitution", () => {
    const r = verifyLinearSolution("Solve for x: 3x + 7 = 22", 5);
    expect(r.checked).toBe(true);
    expect(r.correct).toBe(true);
  });

  it("rejects a wrong solution", () => {
    const r = verifyLinearSolution("Solve for x: 3x + 7 = 22", 6);
    expect(r.checked).toBe(true);
    expect(r.correct).toBe(false);
  });

  it("handles a negative constant and an implicit coefficient", () => {
    expect(verifyLinearSolution("Solve: 5x - 3 = 17", 4).correct).toBe(true);
    expect(verifyLinearSolution("Solve: x + 9 = 11", 2).correct).toBe(true);
  });

  it("reports unchecked rather than guessing on a shape it cannot parse", () => {
    expect(verifyLinearSolution("Find the area of a circle of radius 7", 154).checked).toBe(false);
  });
});

describe("extractFinalNumber", () => {
  it.each([
    ["ANSWER: 42", 42],
    ["RÉPONSE : 10", 10],
    ["so the answer is 5", 5],
    ["x = 7", 7],
  ])("reads %s", (text, expected) => {
    expect(extractFinalNumber(text)).toBe(expected);
  });

  it("returns null when there is no stated result", () => {
    expect(extractFinalNumber("Consider the forces acting on the block.")).toBeNull();
  });
});

describe("dimensions", () => {
  it.each([
    ["m/s", "velocity"],
    ["m/s^2", "acceleration"],
    ["N", "force"],
    ["J", "energy"],
    ["W", "power"],
    ["kg", "mass"],
  ])("maps %s to %s", (unit, quantity) => {
    expect(dimensionOfUnit(unit)?.quantity).toBe(quantity);
  });

  it("identifies the quantity a question asks for, in both languages", () => {
    expect(expectedQuantity("Find the acceleration of the car")).toBe("acceleration");
    expect(expectedQuantity("Calcule l'accélération de la voiture")).toBe("acceleration");
    expect(expectedQuantity("What is the kinetic energy?")).toBe("energy");
  });

  /** The error a model makes constantly and a student rarely questions. */
  it("flags an answer whose units cannot be what was asked for", () => {
    const r = checkDimensions("A force of 12 N acts on a 3 kg box. Find the acceleration.", "The acceleration is 4 N");
    expect(r.checked).toBe(true);
    expect(r.consistent).toBe(false);
    expect(r.detail).toContain("force");
  });

  it("accepts a correct final unit", () => {
    const r = checkDimensions("Find the acceleration.", "a = F/m = 12/3 = 4 m/s^2");
    expect(r.consistent).toBe(true);
  });

  /** Intermediate steps legitimately carry other units. */
  it("judges only the final value, not every unit in the working", () => {
    const r = checkDimensions(
      "A force of 12 N acts on a 3 kg box. Find the acceleration.",
      "The force is 12 N and the mass is 3 kg, so a = 4 m/s^2"
    );
    expect(r.consistent).toBe(true);
  });

  it("reports unchecked when no quantity can be identified", () => {
    expect(checkDimensions("Explain what happens.", "It moves.").checked).toBe(false);
  });
});

describe("verifyAnswer", () => {
  it("passes a sound physics answer", () => {
    const r = verifyAnswer("phys-force-laws", "A force of 12 N acts on a 3 kg box. Find the acceleration.", "a = F/m = 12 / 3 = 4, so a = 4 m/s^2");
    expect(r.passed).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("flags wrong units in physics", () => {
    const r = verifyAnswer("phys-force-laws", "Find the acceleration.", "The acceleration is 4 N");
    expect(r.issues).toContain("dimension");
    expect(r.passed).toBe(false);
  });

  it("flags internally contradictory arithmetic in any subject", () => {
    const r = verifyAnswer("bio-cell", "How many chromosomes?", "There are 23 pairs, and 23 x 2 = 48.");
    expect(r.issues).toContain("contradiction");
  });

  it("flags a linear solution that fails substitution", () => {
    const r = verifyAnswer("math-linear-equations", "Solve for x: 3x + 7 = 22", "Subtract 7, divide by 3. ANSWER: 6");
    expect(r.issues).toContain("mismatch");
  });

  it("passes a linear solution that survives substitution", () => {
    const r = verifyAnswer("math-linear-equations", "Solve for x: 3x + 7 = 22", "3x = 15, so ANSWER: 5");
    expect(r.passed).toBe(true);
  });

  /**
   * The honest state. "Nothing checkable here" must not be reported as a
   * pass, or the badge becomes meaningless on exactly the conceptual
   * answers where a reader most wants to know.
   */
  it("reports unverifiable for a purely conceptual answer", () => {
    const r = verifyAnswer("bio-photosynthesis", "Why are leaves broad?", "To capture more light for photosynthesis.");
    expect(r.unverifiable).toBe(true);
    expect(r.passed).toBe(false);
    expect(r.issues).toEqual([]);
  });

  it("does not apply unit checks outside physics", () => {
    // "12 m" in a mensuration answer is not a physics claim.
    const r = verifyAnswer("math-mensuration", "Find the acceleration of the area", "The area is 12 m");
    expect(r.issues).not.toContain("dimension");
  });
});
