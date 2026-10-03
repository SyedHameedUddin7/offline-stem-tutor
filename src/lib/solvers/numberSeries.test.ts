import { describe, expect, it } from "vitest";
import { parseSeries, solveNumberSeries } from "./numberSeries";

/**
 * The solver is the only part of the app allowed to claim high confidence, so
 * it is the part that most needs to stay correct. These cases include the
 * exact regression that prompted it being written: "2, 4, 6, 8, ?" was
 * answered 20 by the model, having retrieved a Fibonacci exemplar and never
 * checked the rule against the given terms.
 */
describe("solveNumberSeries", () => {
  const CASES: Array<[string, number, string]> = [
    ["2,4,6,8,?", 10, "constant difference — the original regression"],
    ["10, 20, 30, 40, ?", 50, "arithmetic that retrieval mis-matches as geometric"],
    ["7, 14, 21, 28, ?", 35, "arithmetic"],
    ["100, 93, 86, 79, ?", 72, "decreasing arithmetic"],
    ["5, 10, 20, 40, ?", 80, "geometric"],
    ["3, 9, 27, 81, ?", 243, "geometric x3"],
    ["2, 6, 18, 54, ?", 162, "geometric x3 from a different start"],
    ["2, 6, 12, 20, 30, ?", 42, "constant second difference"],
    ["120, 99, 80, 63, 48, ?", 35, "decreasing second difference"],
    ["3, 6, 11, 18, 27, ?", 38, "second difference, odd first diffs"],
    ["1, 4, 9, 16, 25, ?", 36, "perfect squares"],
    ["1, 8, 27, 64, ?", 125, "perfect cubes"],
    ["2, 3, 5, 7, 11, 13, ?", 17, "consecutive primes"],
    ["4, 9, 20, 43, ?", 90, "multiply by 2 then add an increasing constant"],
    ["1, 3, 4, 7, 11, 18, ?", 29, "sum of the two before it"],
    ["1, 10, 3, 12, 5, 14, ?", 7, "two alternating series"],
  ];

  it.each(CASES)("solves %s to %i (%s)", (question, expected) => {
    expect(solveNumberSeries(question)?.next).toBe(expected);
  });

  it("solves identically in French", () => {
    for (const [question, expected] of CASES) {
      expect(solveNumberSeries(question, "fr")?.next).toBe(expected);
    }
  });

  it("explains in the requested language", () => {
    expect(solveNumberSeries("2,4,6,8,?", "en")!.reasoning).toContain("Differences");
    expect(solveNumberSeries("2,4,6,8,?", "fr")!.reasoning).toContain("Différences");
  });

  it("verifies the rule against every given term, not just the last two", () => {
    // Fibonacci-shaped only at the tail. A solver that checked just the final
    // step would wrongly accept it; checking all terms rejects it.
    expect(solveNumberSeries("9, 1, 2, 3, 5, ?")).toBeNull();
  });

  describe("refuses rather than guessing", () => {
    const NOT_SERIES = [
      "In a row of 40 students, Rahul is 12th from the left. What is his position from the right?",
      "Dans une rangée de 40 élèves, Rahul est 12e depuis la gauche.",
      "Odd one out: 3, 5, 11, 14, 17",
      "If CAT is coded as DBU, how is DOG coded?",
      "A walks 4 km east, then 3 km north. How far is he from the start?",
      "3, 17, 4, 98, 22, ?",
      "2, 4",
    ];

    it.each(NOT_SERIES)("returns null for %s", (question) => {
      expect(solveNumberSeries(question)).toBeNull();
    });
  });
});

describe("parseSeries", () => {
  it("accepts an explicit blank", () => {
    expect(parseSeries("2, 4, 6, 8, ?")).toEqual([2, 4, 6, 8]);
  });

  it("accepts a blank implied by the wording, in both languages", () => {
    expect(parseSeries("What comes next in 2, 4, 8, 16")).toEqual([2, 4, 8, 16]);
    expect(parseSeries("Quel est le nombre suivant : 4, 12, 24, 40")).toEqual([4, 12, 24, 40]);
  });

  it("ignores a bare list with no continuation cue", () => {
    // Otherwise "a row of 40 students, 12th from the left" parses as a series.
    expect(parseSeries("The marks were 12, 15, 18, 21 for the group")).toBeNull();
  });

  it("handles negative terms", () => {
    expect(parseSeries("-5, -2, 1, 4, ?")).toEqual([-5, -2, 1, 4]);
  });
});
