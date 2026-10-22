import { describe, expect, it } from "vitest";
import { MATH_PROBLEM_TYPES, solveMaths } from "./index";

describe("maths router", () => {
  it.each(MATH_PROBLEM_TYPES.flatMap((p) => [[p.id, p.example[0], "en"], [p.id, p.example[1], "fr"]] as const))(
    "%s example solves and checks out (%s, %s)",
    (id, question, lang) => {
      const o = solveMaths(question, lang);
      expect(o.kind, question).toBe("solved");
      if (o.kind !== "solved") return;
      expect(o.result.problemType.startsWith(id.replace(/\.(simple-interest|percent-of|triangle-angle|coordinate-distance)$/, ""))).toBe(true);
      expect(o.result.check.passed).toBe(true);
    }
  );

  it("routes 'Factorise 84' to prime factorisation, not algebra", () => {
    const o = solveMaths("Factorise 84", "en");
    expect(o.kind === "solved" && o.result.problemType).toBe("math.prime-factorisation");
  });

  it("does not claim conceptual questions", () => {
    for (const q of ["Why is dividing by a fraction the same as multiplying by its reciprocal?", "What is the difference between an expression and an equation?", "What is a prime number?"]) {
      expect(solveMaths(q, "en").kind, q).toBe("unrecognised");
    }
  });
});
