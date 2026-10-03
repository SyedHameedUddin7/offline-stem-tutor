import { describe, expect, it } from "vitest";
import { provenanceOf, provenanceTone } from "./provenance";

describe("provenanceOf", () => {
  it("calls a solver answer verified", () => {
    expect(provenanceOf({ tier: "solver", flagged: false })).toBe("verified");
  });

  it("distinguishes a teacher-authored exemplar from a shipped one", () => {
    expect(provenanceOf({ tier: "answer-bank", flagged: false }, true)).toBe("teacher-verified");
    expect(provenanceOf({ tier: "answer-bank", flagged: false }, false)).toBe("from-example");
  });

  /**
   * Citations mean reference notes or exemplars were in the prompt. That
   * constrains the facts the model reached for; it says nothing about whether
   * anyone checked the reasoning built on top of them. So both model cases
   * read as unchecked, with the grounded one merely better informed.
   */
  it("separates a grounded model answer from a bare one, but neither is verified", () => {
    expect(provenanceOf({ tier: "webgpu-llm", citations: ["a", "b"], flagged: false })).toBe(
      "grounded-unchecked"
    );
    expect(provenanceOf({ tier: "webgpu-llm", citations: [], flagged: false })).toBe("unchecked");
    expect(provenanceOf({ tier: "webgpu-llm", flagged: false })).toBe("unchecked");
  });

  it("reports a refusal as no answer", () => {
    expect(provenanceOf({ tier: "unavailable", flagged: true })).toBe("no-answer");
    expect(provenanceOf({ flagged: false })).toBe("no-answer");
  });
});

describe("provenanceTone", () => {
  /**
   * The point of the whole module: only the solver checks its own output
   * against the question it was given, so only it — and a human — earn the
   * affirmative tone. A model answer never does, however well grounded.
   */
  it("reserves the reassuring tone for things a human or a solver stands behind", () => {
    expect(provenanceTone("verified")).toBe("good");
    expect(provenanceTone("teacher-verified")).toBe("good");
    expect(provenanceTone("from-example")).toBe("neutral");
    expect(provenanceTone("grounded-unchecked")).toBe("caution");
    expect(provenanceTone("unchecked")).toBe("caution");
    expect(provenanceTone("no-answer")).toBe("caution");
  });
});
