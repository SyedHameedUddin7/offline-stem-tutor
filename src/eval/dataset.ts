/**
 * Evaluation dataset, v1.
 *
 * Scoped to what this application actually teaches. There is no chemistry
 * here because there is no chemistry curriculum here — padding the set with
 * domains the app does not support would inflate the case count and measure
 * nothing.
 *
 * Every case is checkable WITHOUT a language model. That constraint is what
 * makes the suite runnable in CI on a machine with no GPU and no 1.6GB
 * download, and it is why the metrics it reports are reproducible rather
 * than a snapshot of one model run.
 */

export const DATASET_VERSION = "v1";

export type EvalDomain =
  | "number-series"
  | "aptitude"
  | "arithmetic-check"
  | "dimension-check"
  | "substitution-check"
  | "out-of-domain";

export type ExpectedBehaviour =
  /** The deterministic solver should produce exactly `expected`. */
  | "solve"
  /** Retrieval should ground the question against the verified bank. */
  | "ground"
  /** The system should refuse rather than answer. */
  | "refuse"
  /** Verification should pass on the given answer text. */
  | "verify-pass"
  /** Verification should fail on the given answer text. */
  | "verify-fail";

export interface EvalCase {
  id: string;
  domain: EvalDomain;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  behaviour: ExpectedBehaviour;
  /** Exact expected value, for `solve`. */
  expected?: number;
  /** Chapter context the question is asked in. */
  chapterId?: string;
  /** Candidate answer text, for the verify-* behaviours. */
  answer?: string;
  /** Expected unit, where the case is about units. */
  unit?: string;
  notes?: string;
}

export const EVAL_CASES: EvalCase[] = [
  /* ---------------- Deterministic solver ---------------- */
  { id: "ns-001", domain: "number-series", difficulty: "easy", behaviour: "solve",
    question: "2, 4, 6, 8, ?", expected: 10,
    notes: "The original regression: the model answered 20 from a Fibonacci match." },
  { id: "ns-002", domain: "number-series", difficulty: "easy", behaviour: "solve",
    question: "10, 20, 30, 40, ?", expected: 50,
    notes: "Retrieval mis-matches this as geometric; the solver must win." },
  { id: "ns-003", domain: "number-series", difficulty: "easy", behaviour: "solve",
    question: "5, 10, 20, 40, ?", expected: 80 },
  { id: "ns-004", domain: "number-series", difficulty: "medium", behaviour: "solve",
    question: "2, 6, 12, 20, 30, ?", expected: 42 },
  { id: "ns-005", domain: "number-series", difficulty: "medium", behaviour: "solve",
    question: "120, 99, 80, 63, 48, ?", expected: 35 },
  { id: "ns-006", domain: "number-series", difficulty: "medium", behaviour: "solve",
    question: "1, 4, 9, 16, 25, ?", expected: 36 },
  { id: "ns-007", domain: "number-series", difficulty: "medium", behaviour: "solve",
    question: "1, 8, 27, 64, ?", expected: 125 },
  { id: "ns-008", domain: "number-series", difficulty: "medium", behaviour: "solve",
    question: "2, 3, 5, 7, 11, 13, ?", expected: 17 },
  { id: "ns-009", domain: "number-series", difficulty: "hard", behaviour: "solve",
    question: "4, 9, 20, 43, ?", expected: 90 },
  { id: "ns-010", domain: "number-series", difficulty: "hard", behaviour: "solve",
    question: "1, 3, 4, 7, 11, 18, ?", expected: 29 },
  { id: "ns-011", domain: "number-series", difficulty: "hard", behaviour: "solve",
    question: "1, 10, 3, 12, 5, 14, ?", expected: 7 },
  { id: "ns-012", domain: "number-series", difficulty: "easy", behaviour: "solve",
    question: "Quel est le nombre suivant : 7, 14, 21, 28, ?", expected: 35,
    notes: "French phrasing must reach the same solver." },

  /* --------- Solver must REFUSE rather than guess --------- */
  { id: "ns-r01", domain: "number-series", difficulty: "hard", behaviour: "refuse",
    question: "3, 17, 4, 98, 22, ?", notes: "No rule fits; guessing is the failure mode." },
  { id: "ns-r02", domain: "number-series", difficulty: "medium", behaviour: "refuse",
    question: "9, 1, 2, 3, 5, ?", notes: "Fibonacci-shaped only at the tail." },
  { id: "ns-r03", domain: "number-series", difficulty: "easy", behaviour: "refuse",
    question: "In a row of 40 students, Rahul is 12th from the left. What is his position from the right?",
    notes: "Contains numbers but is not a series." },
  { id: "ns-r04", domain: "number-series", difficulty: "easy", behaviour: "refuse",
    question: "Odd one out: 3, 5, 11, 14, 17" },

  /* ---------------- Retrieval grounding ---------------- */
  { id: "ap-001", domain: "aptitude", difficulty: "easy", behaviour: "ground",
    chapterId: "ma-analogies", question: "Doctor : Hospital :: Teacher : ?" },
  { id: "ap-002", domain: "aptitude", difficulty: "medium", behaviour: "ground",
    chapterId: "ma-blood-relations",
    question: "A is B's sister. C is B's mother. D is C's father. How is A related to D?" },
  { id: "ap-003", domain: "aptitude", difficulty: "medium", behaviour: "ground",
    chapterId: "ma-direction-sense",
    question: "A walks 4 km east, then 3 km north. How far is he from the starting point?" },
  { id: "ap-004", domain: "aptitude", difficulty: "medium", behaviour: "ground",
    chapterId: "ma-coding-decoding", question: "If CAT is coded as DBU, how is DOG coded?" },
  { id: "ap-005", domain: "aptitude", difficulty: "hard", behaviour: "ground",
    chapterId: "ma-syllogisms",
    question: "All cats are animals. All animals need food. Does 'all cats need food' follow?" },
  { id: "ap-006", domain: "aptitude", difficulty: "medium", behaviour: "ground",
    chapterId: "ma-arrangements",
    question: "In a row of 40 students, Rahul is 12th from the left. What is his position from the right?" },

  /* ------- Out of domain: must be refused, not answered ------- */
  { id: "od-001", domain: "out-of-domain", difficulty: "easy", behaviour: "refuse",
    chapterId: "ma-number-series", question: "What is photosynthesis?" },
  { id: "od-002", domain: "out-of-domain", difficulty: "medium", behaviour: "refuse",
    chapterId: "ma-number-series", question: "Solve for x: 5x - 3 = 17",
    notes: "Hallucination trap: scores 0.44 against the aptitude bank." },
  { id: "od-003", domain: "out-of-domain", difficulty: "hard", behaviour: "refuse",
    chapterId: "ma-number-series", question: "Resous : 5x - 3 = 17",
    notes: "French algebra; previously the highest-scoring false positive at 0.577." },
  { id: "od-004", domain: "out-of-domain", difficulty: "easy", behaviour: "refuse",
    chapterId: "ma-number-series", question: "Why is the sky blue?" },
  { id: "od-005", domain: "out-of-domain", difficulty: "easy", behaviour: "refuse",
    chapterId: "ma-number-series", question: "Pourquoi le ciel est-il bleu ?" },
  { id: "od-006", domain: "out-of-domain", difficulty: "easy", behaviour: "refuse",
    chapterId: "ma-number-series", question: "Find the area of a circle with radius 7 cm" },
  { id: "od-007", domain: "out-of-domain", difficulty: "medium", behaviour: "refuse",
    chapterId: "ma-number-series", question: "Quelle est la difference entre la vitesse et la velocite ?" },
  { id: "od-008", domain: "out-of-domain", difficulty: "medium", behaviour: "refuse",
    chapterId: "ma-number-series", question: "Why does a heavier object not fall faster?" },

  /* ---------------- Arithmetic verification ---------------- */
  { id: "ar-001", domain: "arithmetic-check", difficulty: "easy", behaviour: "verify-pass",
    chapterId: "math-number-systems", question: "What is 7 plus 5?", answer: "7 + 5 = 12" },
  { id: "ar-002", domain: "arithmetic-check", difficulty: "easy", behaviour: "verify-fail",
    chapterId: "math-number-systems", question: "What is 7 plus 5?", answer: "7 + 5 = 13",
    notes: "Hallucination trap: fluent and wrong." },
  { id: "ar-003", domain: "arithmetic-check", difficulty: "medium", behaviour: "verify-fail",
    chapterId: "math-algebraic-expressions", question: "Expand and evaluate",
    answer: "First 3 x 4 = 12, so therefore 3 x 4 = 14 and the total is 14.",
    notes: "Self-contradiction within one answer." },
  { id: "ar-004", domain: "arithmetic-check", difficulty: "medium", behaviour: "verify-pass",
    chapterId: "math-mensuration", question: "Volume of a 2 x 1.5 x 1 m tank in litres?",
    answer: "2 x 1.5 = 3, and 3 x 1 = 3 cubic metres, so 3000 litres." },
  { id: "ar-005", domain: "arithmetic-check", difficulty: "hard", behaviour: "verify-fail",
    chapterId: "math-ratio-percentage", question: "Share 3500 in the ratio 3:4",
    answer: "Total parts 3 + 4 = 8, so one part is 500.",
    notes: "3 + 4 = 7; a wrong intermediate that changes the result." },

  /* ---------------- Substitution verification ---------------- */
  { id: "sb-001", domain: "substitution-check", difficulty: "easy", behaviour: "verify-pass",
    chapterId: "math-linear-equations", question: "Solve for x: 3x + 7 = 22",
    answer: "Subtract 7 to get 3x = 15, divide by 3. ANSWER: 5" },
  { id: "sb-002", domain: "substitution-check", difficulty: "easy", behaviour: "verify-fail",
    chapterId: "math-linear-equations", question: "Solve for x: 3x + 7 = 22",
    answer: "Subtract 7 and divide. ANSWER: 6", notes: "Fails substitution." },
  { id: "sb-003", domain: "substitution-check", difficulty: "medium", behaviour: "verify-pass",
    chapterId: "math-linear-equations", question: "Solve: 5x - 3 = 17", answer: "ANSWER: 4" },
  { id: "sb-004", domain: "substitution-check", difficulty: "medium", behaviour: "verify-fail",
    chapterId: "math-linear-equations", question: "Solve: 5x - 3 = 17", answer: "ANSWER: 5" },

  /* ---------------- Dimensional verification ---------------- */
  { id: "dm-001", domain: "dimension-check", difficulty: "easy", behaviour: "verify-pass",
    chapterId: "phys-force-laws", question: "A force of 12 N acts on a 3 kg box. Find the acceleration.",
    answer: "a = F/m = 12 / 3 = 4, so a = 4 m/s^2", unit: "m/s^2" },
  { id: "dm-002", domain: "dimension-check", difficulty: "easy", behaviour: "verify-fail",
    chapterId: "phys-force-laws", question: "A force of 12 N acts on a 3 kg box. Find the acceleration.",
    answer: "The acceleration is 4 N", unit: "m/s^2",
    notes: "Right number, impossible unit — the classic model error." },
  { id: "dm-003", domain: "dimension-check", difficulty: "medium", behaviour: "verify-fail",
    chapterId: "phys-motion", question: "Find the velocity of the car.",
    answer: "The velocity is 20 m/s^2", unit: "m/s" },
  { id: "dm-004", domain: "dimension-check", difficulty: "medium", behaviour: "verify-pass",
    chapterId: "phys-work-energy", question: "Find the kinetic energy of a 2 kg ball at 6 m/s.",
    answer: "KE = 0.5 x 2 x 36 = 36, so 36 J", unit: "J" },
  { id: "dm-005", domain: "dimension-check", difficulty: "hard", behaviour: "verify-pass",
    chapterId: "phys-force-laws", question: "A force of 12 N acts on a 3 kg box. Find the acceleration.",
    answer: "The force is 12 N and the mass is 3 kg, so a = 4 m/s^2", unit: "m/s^2",
    notes: "Intermediate units must not trigger a false positive." },
  { id: "dm-006", domain: "dimension-check", difficulty: "medium", behaviour: "verify-fail",
    chapterId: "phys-work-energy", question: "Find the power of the motor.",
    answer: "The power is 500 J", unit: "W" },
];
