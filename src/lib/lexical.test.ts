import { describe, expect, it } from "vitest";
import { buildIndex, sameQuestion, tokens } from "./lexical";

describe("tokens", () => {
  it("drops function words, accents and simple plurals, in both languages", () => {
    expect(tokens("What are the functions of the cells?")).toEqual(["function", "cell"]);
    expect(tokens("Qu'est-ce que la photosynthèse ?")).toEqual(["photosynthese"]);
  });

  it("does not merge different words", () => {
    expect(tokens("organ organism")).toEqual(["organ", "organism"]);
    expect(tokens("glass virus")).toEqual(["glass", "virus"]);
  });
});

describe("buildIndex", () => {
  const index = buildIndex([
    { id: "a", text: "Photosynthesis makes glucose from carbon dioxide and water using light." },
    { id: "b", text: "Respiration releases energy from glucose in the mitochondria." },
    { id: "c", text: "Glucose glucose glucose is a sugar." },
  ]);

  it("ranks the document that covers the whole question first", () => {
    const [top] = index.search("Where does respiration release energy?");
    expect(top.doc.id).toBe("b");
    expect(top.coverage).toBe(1);
  });

  it("prefers coverage over repeated words", () => {
    const [top] = index.search("glucose from light");
    expect(top.doc.id).toBe("a");
  });

  it("returns nothing for a question with no content words", () => {
    expect(index.search("what is the")).toEqual([]);
  });
});

describe("sameQuestion", () => {
  it("matches the same question worded slightly differently", () => {
    expect(sameQuestion("What is the function of the nucleus?", "what's the function of a nucleus")).toBe(true);
  });

  it("refuses a different question that shares most words", () => {
    expect(sameQuestion("Function of the nucleus", "Function of the mitochondria")).toBe(false);
  });

  it("refuses when the numbers differ", () => {
    expect(sameQuestion("Area of a circle of radius 7 cm", "Area of a circle of radius 5 cm")).toBe(false);
  });
});
