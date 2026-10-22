/**
 * Evaluation dataset, v3.
 *
 * v3 adds the no-model curriculum: Maths and Physics problems the offline
 * solvers must answer (values worked by hand), inputs they must decline,
 * conceptual questions they must not claim, and the lesson-matching policy
 * in both directions — questions a stored lesson answers, and questions it
 * must not pretend to.
 *
 * v2 adds cases phrased the way the model actually writes: thousands
 * separators, French decimal commas, rounded results, `m/s²`, and a final
 * `x = 5.` in prose instead of an ANSWER line. v1's verification cases all
 * used the tidy form, so it reported 100% on checks that, on real output,
 * raised false alarms or never ran.
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

export const DATASET_VERSION = "v3";

export type EvalDomain =
  | "number-series"
  | "aptitude"
  | "arithmetic-check"
  | "dimension-check"
  | "substitution-check"
  | "out-of-domain"
  // v3: the no-model curriculum.
  | "math-solver"
  | "physics-solver"
  | "invalid-input"
  | "not-a-calculation"
  | "lesson-match"
  | "no-lesson-match";

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
  | "verify-fail"
  /** The solver must NOT answer: it should ask for data (invalid) or not claim the question. */
  | "decline"
  /** With no model, the reply should be the lesson titled `expectedTitle`. */
  | "lesson"
  /** With no model, no stored lesson should be presented as the answer. */
  | "no-lesson";

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
  /** For `lesson`: the title of the lesson or card a teacher would pick. */
  expectedTitle?: string;
  lang?: "en" | "fr";
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

  /* ---------------- v2: real-output phrasing ---------------- */
  { id: "ar-006", domain: "arithmetic-check", difficulty: "medium", behaviour: "verify-pass",
    chapterId: "math-ratio-percentage", question: "A farmer has 1,000 kg and buys 250 kg more. Total?",
    answer: "1,000 + 250 = 1,250 kg in total.", notes: "Thousands separator." },
  { id: "ar-007", domain: "arithmetic-check", difficulty: "medium", behaviour: "verify-pass",
    chapterId: "math-number-systems", question: "Combien font 2,5 plus 1 ?",
    answer: "2,5 + 1 = 3,5", notes: "French decimal comma." },
  { id: "ar-008", domain: "arithmetic-check", difficulty: "medium", behaviour: "verify-pass",
    chapterId: "math-mensuration", question: "Approximate 22 divided by 7.",
    answer: "22 ÷ 7 = 3.14 to two decimal places.", notes: "Rounded result." },
  { id: "ar-009", domain: "arithmetic-check", difficulty: "medium", behaviour: "verify-fail",
    chapterId: "math-number-systems", question: "Divide 12.5 by 5.",
    answer: "12.5 ÷ 5 = 2.4", notes: "Rounding tolerance must not excuse a wrong decimal." },
  { id: "dm-007", domain: "dimension-check", difficulty: "medium", behaviour: "verify-pass",
    chapterId: "phys-motion", question: "A car goes from 0 to 20 m/s in 4 s. Find its acceleration.",
    answer: "a = (20 - 0) / 4 = 5 m/s²", unit: "m/s²", notes: "Superscript unit." },
  { id: "sb-005", domain: "substitution-check", difficulty: "easy", behaviour: "verify-pass",
    chapterId: "math-linear-equations", question: "Solve for x: 3x + 7 = 22",
    answer: "Subtract 7 from both sides: 3x = 15. Divide by 3, so x = 5.", notes: "Prose, no ANSWER line." },
  { id: "sb-006", domain: "substitution-check", difficulty: "easy", behaviour: "verify-fail",
    chapterId: "math-linear-equations", question: "Solve for x: 3x + 7 = 22",
    answer: "Subtract 7 from both sides: 3x = 18. Divide by 3, so x = 6." },

  /* ---------------- v3: Maths solver (values worked by hand) ---------------- */
  ...([
    ["ms-01", "math-linear-equations", "Solve 4x - 7 = 2x + 9", 8],
    ["ms-02", "math-linear-equations", "Solve 5(x - 2) = 3x + 4", 7],
    ["ms-03", "math-linear-equations", "Résous : 2x + 5 = 17", 6, "fr"],
    ["ms-04", "math-linear-equations", "Solve x^2 - 7x + 12 = 0", 4],
    ["ms-05", "math-linear-equations", "Solve 2x + y = 11 and x - y = 1", 4],
    ["ms-06", "math-number-systems", "HCF of 48 and 180", 12],
    ["ms-07", "math-number-systems", "LCM of 12 and 18", 36],
    ["ms-08", "math-ratio-percentage", "What is 35% of 240?", 84],
    ["ms-09", "math-ratio-percentage", "Percentage increase from 80 to 100", 25],
    ["ms-10", "math-ratio-percentage", "Simple interest on 2000 at 5% for 4 years", 400],
    ["ms-11", "math-ratio-percentage", "Compound interest on 1000 at 10% for 2 years", 210],
    ["ms-12", "math-ratio-percentage", "Share 600 in the ratio 1:2", 200],
    ["ms-13", "math-geometry-triangles", "Hypotenuse of a right triangle with legs 6 cm and 8 cm", 10],
    ["ms-14", "math-geometry-triangles", "Two angles of a triangle are 35° and 75°. Find the third.", 70],
    ["ms-15", "math-geometry-triangles", "Distance between (-1, 2) and (2, 6)", 5],
    ["ms-16", "math-data-probability", "Mean of 3, 5, 7, 9, 11", 7],
    ["ms-17", "math-data-probability", "A bag has 4 red and 6 green balls. Probability of picking a green ball?", 0.6],
    ["ms-18", "math-mensuration", "Volume of a cube with side 4 cm", 64],
    ["ms-19", "math-mensuration", "Area of a circle with diameter 10 cm", 78.53981633974483],
    ["ms-20", "math-number-systems", "Simplify: (6 + 4) × 3 - 2^3", 22],
    ["ms-21", "math-number-systems", "Calcule 3/5 + 1/10", 0.7, "fr"],
  ] as const).map(([id, chapterId, question, expected, lang]): EvalCase => ({
    id, domain: "math-solver", difficulty: "medium", behaviour: "solve", chapterId, question, expected, lang: lang ?? "en",
  })),

  /* ---------------- v3: Physics solver (values worked by hand, SI) ---------------- */
  ...([
    ["ps-01", "phys-motion", "A cyclist covers 3 km in 10 min. Find the speed.", 5],
    ["ps-02", "phys-motion", "A car moving at 10 m/s accelerates at 2 m/s² for 5 s. Find the final velocity.", 20],
    ["ps-03", "phys-force-laws", "What force accelerates a 1500 kg car at 2 m/s²?", 3000],
    ["ps-04", "phys-gravitation", "Find the weight of a 2 kg bag.", 19.6],
    ["ps-05", "phys-work-energy", "Find the kinetic energy of a 1000 kg car moving at 20 m/s.", 200000],
    ["ps-06", "phys-electricity", "A 60 W bulb is on for 2 h. How much energy does it use?", 432000],
    ["ps-07", "phys-electricity", "Find the current when 230 V is applied across 46 Ω.", 5],
    ["ps-08", "phys-heat", "How much heat is needed to raise the temperature of 0.5 kg of water by 10 °C?", 21000],
    ["ps-09", "phys-work-energy", "A box of mass 5 kg is lifted to a height of 2 m. Find its potential energy.", 98],
    ["ps-10", "phys-electricity", "Resistors of 6 Ω and 3 Ω in parallel: find the total resistance.", 2],
    ["ps-11", "phys-force-laws", "Une force de 20 N agit sur une masse de 4 kg. Calcule l'accélération.", 5, "fr"],
  ] as const).map(([id, chapterId, question, expected, lang]): EvalCase => ({
    id, domain: "physics-solver", difficulty: "medium", behaviour: "solve", chapterId, question, expected, lang: lang ?? "en",
  })),

  /* ---------------- v3: inputs the solver must decline ---------------- */
  ...([
    ["iv-01", "math-mensuration", "Find the volume of a cylinder", "No measurements given."],
    ["iv-02", "phys-motion", "A car accelerates for 10 s. Find its acceleration.", "Velocities missing."],
    ["iv-03", "math-ratio-percentage", "Simple interest on 5000 for 3 years", "Rate missing."],
    ["iv-04", "math-geometry-triangles", "Pythagoras: the hypotenuse is 4 and one side is 5", "Impossible triangle."],
    ["iv-05", "phys-electricity", "Find the current through a 0 Ω resistor connected to 12 V.", "Zero resistance: division by zero."],
  ] as const).map(([id, chapterId, question, notes]): EvalCase => ({
    id, domain: "invalid-input", difficulty: "medium", behaviour: "decline", chapterId, question, notes,
  })),

  /* ---------------- v3: conceptual questions, not calculations ---------------- */
  ...([
    ["nc-01", "phys-light", "Why is the sky blue?"],
    ["nc-02", "math-number-systems", "What is a prime number?"],
    ["nc-03", "phys-force-laws", "Explain Newton's first law"],
    ["nc-04", "math-number-systems", "Why do we need a common denominator to add fractions?"],
  ] as const).map(([id, chapterId, question]): EvalCase => ({
    id, domain: "not-a-calculation", difficulty: "easy", behaviour: "decline", chapterId, question,
  })),

  /* ---------------- v3: lesson matching with no model ---------------- */
  ...([
    ["lm-01", "bio-digestion", "What does bile do?", "Bile"],
    ["lm-02", "bio-respiration-circulation", "Why do arteries have thick walls?", "Why arteries have thick walls, and why muscles ache"],
    ["lm-03", "bio-reproduction-heredity", "What is the difference between pollination and fertilisation?", "Pollination vs fertilisation"],
    ["lm-04", "bio-health-disease", "what is a vaccine", "Vaccine"],
    ["lm-05", "phys-light", "what is the law of reflection", "Law of reflection"],
    ["lm-06", "math-ratio-percentage", "what is the formula for compound interest", "Compound interest"],
    ["lm-07", "bio-photosynthesis", "Do plants respire at night?", "Do plants respire?"],
  ] as const).map(([id, chapterId, question, expectedTitle]): EvalCase => ({
    id, domain: "lesson-match", difficulty: "medium", behaviour: "lesson", chapterId, question, expectedTitle,
  })),
  ...([
    ["nl-01", "bio-cell", "How do volcanoes erupt?"],
    ["nl-02", "bio-health-disease", "What is the capital of Mali?"],
    ["nl-03", "phys-light", "Explain quantum entanglement"],
    ["nl-04", "math-number-systems", "Prove Fermat's last theorem"],
    ["nl-05", "bio-cell", "What is DNA replication?"],
  ] as const).map(([id, chapterId, question]): EvalCase => ({
    id, domain: "no-lesson-match", difficulty: "medium", behaviour: "no-lesson", chapterId, question,
  })),
];
