import type { Chapter, Subject, SubjectId } from "../types";
import type { Lang } from "../i18n/strings";
import { CHAPTER_FR, SUBJECT_FR } from "./subjects.fr";

/**
 * The curriculum.
 *
 * Four subjects, each broken into chapters, pitched at lower-secondary level
 * (roughly grades 8-10) and kept deliberately syllabus-neutral so a pod in
 * Bamako and a pod in Brooklyn can both recognise the chapter list.
 *
 * The three STEM subjects are `generative` — the on-device model explains.
 * Mental Ability is `retrieval-grounded`, and that distinction is the whole
 * argument of this file: an aptitude puzzle has one defensible answer reached
 * by one specific technique. A 1.5B model asked "2, 6, 12, 20, 30, ?" will
 * often produce a fluent, confident, wrong method. So for that subject the
 * model does not get to reason from scratch — it retrieves solved exemplars
 * from a local vetted bank and explains using those, or it says it doesn't
 * know and hands the question to a teacher.
 *
 * Adding a subject or a chapter means editing this file and nothing else.
 */

const mathematicsChapters: Chapter[] = [
  {
    id: "math-number-systems",
    name: "Number Systems & Operations",
    blurb: "Integers, fractions, decimals, factors and multiples.",
    focus:
      "Focus on number systems: integers and their operations, fractions and decimals, HCF and LCM, prime factorisation, and order of operations. Work in small concrete steps and use familiar quantities (money, distance, portions of food) rather than abstract examples.",
    sampleProblems: [
      "Find the HCF and LCM of 24 and 36.",
      "Why is dividing by a fraction the same as multiplying by its reciprocal?",
      "Simplify: 7 + 3 x (8 - 5) ÷ 3",
    ],
  },
  {
    id: "math-algebraic-expressions",
    name: "Algebraic Expressions & Identities",
    blurb: "Terms, like terms, expansion and the standard identities.",
    focus:
      "Focus on algebraic expressions: variables, coefficients, like and unlike terms, adding and multiplying expressions, and the standard identities such as (a+b)^2 and a^2 - b^2. Always show the expansion term by term before simplifying.",
    sampleProblems: [
      "Expand (x + 5)(x - 3) step by step.",
      "What is the difference between an expression and an equation?",
      "Use an identity to find 98 x 102 without long multiplication.",
    ],
  },
  {
    id: "math-linear-equations",
    name: "Linear Equations",
    blurb: "Solving for one unknown, and turning words into equations.",
    focus:
      "Focus on linear equations in one variable: isolating the unknown, doing the same operation to both sides, checking the answer by substitution, and translating word problems into equations. Name the unknown explicitly before writing the equation.",
    sampleProblems: [
      "Solve for x: 3x + 7 = 22",
      "A rectangle's length is twice its width and its perimeter is 30 cm. Find the width.",
      "Solve: (2x - 1)/3 = (x + 4)/2",
    ],
  },
  {
    id: "math-ratio-percentage",
    name: "Ratio, Proportion & Percentage",
    blurb: "Comparing quantities, scaling, profit, loss and interest.",
    focus:
      "Focus on ratio, proportion, percentage, and their everyday uses: unitary method, direct and inverse proportion, percentage increase and decrease, profit and loss, and simple interest. Use market and household examples a student will recognise.",
    sampleProblems: [
      "If 5 pens cost 120 francs, what do 8 pens cost?",
      "A shirt costing 800 is sold for 920. What is the profit percentage?",
      "Share 3500 between two people in the ratio 3:4.",
    ],
  },
  {
    id: "math-geometry-triangles",
    name: "Geometry: Lines, Angles & Triangles",
    blurb: "Angle rules, triangle properties and Pythagoras.",
    focus:
      "Focus on plane geometry: types of angles, angles on a straight line and around a point, parallel lines with a transversal, the angle sum of a triangle, congruence conditions, and the Pythagoras theorem. Describe the figure in words first, since the student may not be able to see a diagram.",
    sampleProblems: [
      "Two angles of a triangle are 48° and 67°. Find the third.",
      "A ladder 5 m long leans with its foot 3 m from a wall. How high does it reach?",
      "What does it mean for two triangles to be congruent?",
    ],
  },
  {
    id: "math-mensuration",
    name: "Mensuration: Area, Surface Area & Volume",
    blurb: "Perimeter, area, and the volume of everyday solids.",
    focus:
      "Focus on mensuration: perimeter and area of rectangles, triangles, parallelograms and circles; surface area and volume of cubes, cuboids and cylinders. Always state the formula, substitute with units, then compute — and keep units visible at every step.",
    sampleProblems: [
      "Find the area of a circle with radius 7 cm (use 22/7).",
      "A water tank is 2 m x 1.5 m x 1 m. How many litres does it hold?",
      "Why is the area of a triangle half that of a rectangle with the same base and height?",
    ],
  },
  {
    id: "math-data-probability",
    name: "Data Handling & Probability",
    blurb: "Mean, median, mode, and the chance of an event.",
    focus:
      "Focus on data handling: organising data, mean, median and mode, reading bar graphs and pie charts, and basic probability of single events. Explain when the mean is misleading and the median is the fairer summary.",
    sampleProblems: [
      "Find the mean, median and mode of: 4, 7, 7, 9, 13",
      "A bag has 3 red and 5 blue marbles. What is the probability of drawing red?",
      "When is the median a better summary than the mean?",
    ],
  },
];

const physicsChapters: Chapter[] = [
  {
    id: "phys-motion",
    name: "Motion: Distance, Speed & Velocity",
    blurb: "Describing how things move, and reading motion graphs.",
    focus:
      "Focus on motion: distance versus displacement, speed versus velocity, acceleration, the equations of uniformly accelerated motion, and distance-time and velocity-time graphs. Build the intuition in plain language before introducing any formula.",
    sampleProblems: [
      "What is the difference between speed and velocity?",
      "A car goes from 0 to 20 m/s in 5 s. Find its acceleration.",
      "What does a horizontal line on a distance-time graph mean?",
    ],
  },
  {
    id: "phys-force-laws",
    name: "Force, Friction & Newton's Laws",
    blurb: "Why things start, stop, and resist being pushed.",
    focus:
      "Focus on forces: balanced and unbalanced forces, inertia, Newton's three laws, friction and its useful and wasteful effects, and momentum. Use bicycles, carts, doorways and walking on sand as examples rather than laboratory apparatus.",
    sampleProblems: [
      "Why do you fall forward when a bus stops suddenly?",
      "A force of 12 N acts on a 3 kg box. Find the acceleration.",
      "Is friction always a nuisance? Give an example where it helps.",
    ],
  },
  {
    id: "phys-gravitation",
    name: "Gravitation & Free Fall",
    blurb: "Weight, mass, falling bodies and why the moon stays up.",
    focus:
      "Focus on gravitation: the difference between mass and weight, acceleration due to gravity, free fall, and why orbiting bodies do not fall down. Use g = 10 m/s^2 unless the student specifies otherwise, and say so when you do.",
    sampleProblems: [
      "Why does a heavier object not fall faster than a lighter one?",
      "A ball is thrown straight up at 20 m/s. How long until it comes back down?",
      "What is the difference between mass and weight?",
    ],
  },
  {
    id: "phys-work-energy",
    name: "Work, Energy & Power",
    blurb: "What work means in physics, and where energy goes.",
    focus:
      "Focus on work, energy and power: the scientific definition of work, kinetic and potential energy, conservation of energy, energy transformations, and power as the rate of doing work. Point out where everyday language and physics language disagree.",
    sampleProblems: [
      "Why is no work done when you hold a heavy bag still?",
      "Find the kinetic energy of a 2 kg ball moving at 6 m/s.",
      "Trace the energy changes when a stone is dropped from a roof.",
    ],
  },
  {
    id: "phys-heat",
    name: "Heat & Temperature",
    blurb: "Conduction, convection, radiation and changes of state.",
    focus:
      "Focus on thermal physics: the difference between heat and temperature, conduction, convection and radiation, expansion on heating, and changes of state including latent heat. Use cooking pots, roofing sheets and drying clothes as examples.",
    sampleProblems: [
      "What is the difference between heat and temperature?",
      "Why does a metal spoon feel colder than a wooden one at the same temperature?",
      "Why does water stay at 100°C while it is boiling?",
    ],
  },
  {
    id: "phys-light",
    name: "Light: Reflection & Refraction",
    blurb: "Mirrors, lenses, bending rays and how the eye works.",
    focus:
      "Focus on light: rectilinear propagation, laws of reflection, plane and curved mirrors, refraction and why it happens, lenses and image formation, and dispersion. Describe ray paths in words carefully, since the student may have no diagram.",
    sampleProblems: [
      "Why does a straw look bent in a glass of water?",
      "State the laws of reflection.",
      "What kind of image does a plane mirror form?",
    ],
  },
  {
    id: "phys-electricity",
    name: "Electricity & Simple Circuits",
    blurb: "Current, voltage, resistance and Ohm's law.",
    focus:
      "Focus on current electricity: charge and current, potential difference, resistance, Ohm's law, series and parallel circuits, and electrical power and safety. Relate everything to a torch, a phone charger or a household bulb.",
    sampleProblems: [
      "State Ohm's law and explain what each symbol means.",
      "A 6 V battery drives 0.5 A through a bulb. Find its resistance.",
      "Why are house lights wired in parallel and not in series?",
    ],
  },
];

const biologyChapters: Chapter[] = [
  {
    id: "bio-cell",
    name: "The Cell: Structure & Function",
    blurb: "The smallest unit of life, and what its parts do.",
    focus:
      "Focus on cell biology: the cell as the basic unit of life, plant versus animal cells, the function of the nucleus, cytoplasm, cell membrane, cell wall, chloroplast, mitochondria and vacuole, and how cells divide. Use an analogy to a compound or a household for organelle roles.",
    sampleProblems: [
      "What is the difference between a plant cell and an animal cell?",
      "Why is the mitochondrion called the powerhouse of the cell?",
      "What does the cell membrane actually do?",
    ],
  },
  {
    id: "bio-tissues-systems",
    name: "Tissues, Organs & Organ Systems",
    blurb: "How cells organise into the body's working parts.",
    focus:
      "Focus on levels of organisation: types of plant and animal tissue, how tissues form organs and organs form systems, and the main human organ systems and their jobs. Emphasise the hierarchy: cell, tissue, organ, system, organism.",
    sampleProblems: [
      "Explain the levels of organisation from cell to organism.",
      "What is the job of xylem and phloem in a plant?",
      "Name four types of animal tissue and one job of each.",
    ],
  },
  {
    id: "bio-photosynthesis",
    name: "Plant Nutrition & Photosynthesis",
    blurb: "How plants make food, and what they need to do it.",
    focus:
      "Focus on plant nutrition: photosynthesis, its raw materials and products, the role of chlorophyll and sunlight, the structure of a leaf, stomata and gas exchange, and transpiration. Give the word equation before any chemical one.",
    sampleProblems: [
      "Write the word equation for photosynthesis and explain each part.",
      "Why are most leaves broad and flat?",
      "What happens to a plant kept in the dark for a week?",
    ],
  },
  {
    id: "bio-digestion",
    name: "Human Digestion & Nutrition",
    blurb: "Food groups, the digestive tract, and deficiency diseases.",
    focus:
      "Focus on human nutrition: carbohydrates, proteins, fats, vitamins, minerals, water and roughage; the path of food through the digestive system; the role of enzymes, bile and villi; and common deficiency diseases. Use locally available foods as examples.",
    sampleProblems: [
      "Trace the path of a piece of bread through the digestive system.",
      "Why is roughage important if it is not digested?",
      "What causes anaemia and how can diet prevent it?",
    ],
  },
  {
    id: "bio-respiration-circulation",
    name: "Respiration, Blood & Circulation",
    blurb: "Getting oxygen in, and moving it around the body.",
    focus:
      "Focus on respiration and transport: breathing versus cellular respiration, aerobic and anaerobic respiration, the structure of the heart, blood components, arteries and veins, and double circulation. Distinguish breathing from respiration explicitly — it is the most common confusion here.",
    sampleProblems: [
      "What is the difference between breathing and respiration?",
      "Why do your muscles ache after running very hard?",
      "Why do arteries have thicker walls than veins?",
    ],
  },
  {
    id: "bio-reproduction-heredity",
    name: "Reproduction & Heredity",
    blurb: "How life continues, and how traits are passed on.",
    focus:
      "Focus on reproduction and inheritance: asexual and sexual reproduction, reproduction in flowering plants, human reproductive systems at an age-appropriate level, chromosomes and genes, dominant and recessive traits, and simple Mendelian crosses. Keep the tone factual and respectful.",
    sampleProblems: [
      "What is the difference between asexual and sexual reproduction?",
      "Explain pollination and fertilisation in a flower.",
      "If both parents carry a recessive trait, can the child show it?",
    ],
  },
  {
    id: "bio-health-disease",
    name: "Health, Disease & Microorganisms",
    blurb: "Germs, immunity, vaccines and staying well.",
    focus:
      "Focus on health and microorganisms: useful and harmful microbes, communicable versus non-communicable disease, how infections spread, immunity and vaccination, and basic hygiene and prevention. Use malaria, cholera and tuberculosis as worked examples where relevant.",
    sampleProblems: [
      "How does a mosquito spread malaria?",
      "What is the difference between a virus and a bacterium?",
      "How does a vaccine protect you without making you ill?",
    ],
  },
];

/**
 * Mental Ability chapters are reasoning *techniques*, not topics — which is
 * exactly why retrieval works here. Every question in a chapter is solved by
 * the same small family of patterns, so a bank of solved exemplars generalises
 * unusually well. See src/data/reasoningBank.ts for the corpus.
 */
const mentalAbilityChapters: Chapter[] = [
  {
    id: "ma-number-series",
    name: "Number Series",
    blurb: "Find the rule, then find the missing term.",
    focus:
      "Focus on number series: differences, second differences, ratios, squares and cubes, primes, and alternating series. Always state the rule you found before giving the missing number.",
    sampleProblems: [
      "2, 6, 12, 20, 30, ?",
      "120, 99, 80, 63, 48, ?",
      "5, 10, 20, 40, ?",
    ],
  },
  {
    id: "ma-coding-decoding",
    name: "Coding & Decoding",
    blurb: "Letter shifts, reversals and positional arithmetic.",
    focus:
      "Focus on coding-decoding: fixed letter shifts, reversal codes, letter-position arithmetic, and substitution. Show the letter-by-letter mapping in full rather than asserting the answer.",
    sampleProblems: [
      "If CAT is coded as DBU, how is DOG coded?",
      "If MANGO is written as OCPIQ, how is APPLE written?",
      "If TEACHER is written as REHCAET, how is STUDENT written?",
    ],
  },
  {
    id: "ma-blood-relations",
    name: "Blood Relations",
    blurb: "Untangle who is whose what.",
    focus:
      "Focus on blood relations: build the family tree one statement at a time, mark each person's generation, and only then read off the asked relation. Watch for self-referential phrasing such as 'my father's son'.",
    sampleProblems: [
      "A is B's sister. C is B's mother. D is C's father. How is A related to D?",
      "Pointing to a photo, a man said, 'I have no brother or sister, but that man's father is my father's son.' Who is in the photo?",
      "P is the father of Q. Q is the sister of R. R is the son of S. How is S related to P?",
    ],
  },
  {
    id: "ma-direction-sense",
    name: "Direction Sense",
    blurb: "Track turns and end up with distance and bearing.",
    focus:
      "Focus on direction sense: track the walker's facing direction after every turn, keep a running north-south and east-west total, and use Pythagoras for the final straight-line distance. State the facing direction after each leg.",
    sampleProblems: [
      "A man walks 5 km north, turns right and walks 3 km, turns right and walks 5 km. Where is he now?",
      "A walks 4 km east, then 3 km north. How far is he from the start?",
      "If you face east and turn 135° clockwise, which direction do you face?",
    ],
  },
  {
    id: "ma-analogies",
    name: "Analogies & Odd One Out",
    blurb: "Name the relationship, then apply or break it.",
    focus:
      "Focus on analogies and classification: state the relationship between the first pair in words before completing the second pair, and for odd-one-out, state the property shared by the majority before naming the exception.",
    sampleProblems: [
      "Doctor : Hospital :: Teacher : ?",
      "Odd one out: Triangle, Square, Circle, Rectangle",
      "Odd one out: 3, 5, 11, 14, 17",
    ],
  },
  {
    id: "ma-syllogisms",
    name: "Syllogisms & Logical Statements",
    blurb: "Decide what genuinely follows — and what only seems to.",
    focus:
      "Focus on syllogisms: treat the given statements as true even if factually odd, test each conclusion for whether it must follow in every case, and say 'does not follow' whenever a counter-example exists. Never rely on real-world plausibility.",
    sampleProblems: [
      "All roses are flowers. Some flowers fade quickly. Does 'some roses fade quickly' follow?",
      "Some books are pens. All pens are red. Does 'some books are red' follow?",
      "No student is lazy. Some lazy people are rich. Does 'some rich people are not students' follow?",
    ],
  },
  {
    id: "ma-arrangements",
    name: "Seating & Ordering Puzzles",
    blurb: "Place people in a row or a circle from partial clues.",
    focus:
      "Focus on arrangement puzzles: fix the most constrained clue first, write the positions as a numbered line or a labelled circle, and apply the remaining clues one at a time. For rows, remember that position-from-right = total − position-from-left + 1.",
    sampleProblems: [
      "In a row of 40 students, Rahul is 12th from the left. What is his position from the right?",
      "Five friends A, B, C, D, E sit in a row. A is left of B but right of C. D is right of B. E is at the extreme right. Who is in the middle?",
      "P, Q, R, S sit around a square table facing the centre. P is opposite R and Q is to the immediate left of P. Where is S?",
    ],
  },
];

export const SUBJECTS: Subject[] = [
  {
    id: "mathematics",
    name: "Mathematics",
    tagline: "Work it through, step by visible step.",
    accent: "solar",
    mode: "generative",
    systemPrompt:
      "You are a patient, encouraging mathematics tutor for a secondary-school student who may have an unreliable internet connection and is studying on a shared, low-end phone. " +
      "Always show your reasoning as short numbered steps. Keep each step to one idea. Never skip to the answer. " +
      "Assume no calculator and no graphing tools. Keep the whole answer short enough to read on a small screen.",
    chapters: mathematicsChapters,
  },
  {
    id: "physics",
    name: "Physics",
    tagline: "Understand it before you calculate it.",
    accent: "signal",
    mode: "generative",
    systemPrompt:
      "You are a physics tutor for a secondary-school student. Build intuition before formulas — explain the 'why' in plain language first, then show the calculation if one is needed. " +
      "Use everyday, low-resource examples (a dropped stone, a bicycle, a cooking pot, a torch) rather than laboratory equipment the student may not have access to. " +
      "Keep answers short enough to read on a small, low-end phone screen.",
    chapters: physicsChapters,
  },
  {
    id: "biology",
    name: "Biology",
    tagline: "Living systems, explained in plain language.",
    accent: "paper",
    mode: "generative",
    systemPrompt:
      "You are a biology tutor for a secondary-school student. Explain processes as a sequence of causes and effects rather than as lists to memorise, and define every technical term the first time you use it. " +
      "Use locally available plants, foods and animals as examples. Keep answers short enough to read on a small, low-end phone screen.",
    chapters: biologyChapters,
  },
  {
    id: "mental-ability",
    name: "Mental Ability",
    tagline: "One defensible answer — retrieved, not invented.",
    accent: "danger",
    mode: "retrieval-grounded",
    systemPrompt:
      "You are a reasoning coach for a secondary-school student preparing for aptitude tests. " +
      "You have been given one or more SOLVED EXAMPLES retrieved from a teacher-verified bank. " +
      "You must solve the student's question by applying the method shown in those examples. " +
      "Do not invent a different technique, and do not guess. If the examples do not cover the student's question, " +
      "say plainly that you do not have a verified method for it and that a teacher should look at it. " +
      "Show the rule you are applying, then the steps, then the answer.",
    chapters: mentalAbilityChapters,
  },
];

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

const SUBJECT_BY_ID = new Map<string, Subject>(SUBJECTS.map((s) => [s.id, s]));

const CHAPTER_INDEX = new Map<string, { subject: Subject; chapter: Chapter }>(
  SUBJECTS.flatMap((subject) =>
    subject.chapters.map((chapter) => [chapter.id, { subject, chapter }] as const)
  )
);

export function getSubject(id: string): Subject | undefined {
  return SUBJECT_BY_ID.get(id);
}

export function getChapter(id: string): Chapter | undefined {
  return CHAPTER_INDEX.get(id)?.chapter;
}

/** Resolve a chapter id to both halves of its identity in one lookup. */
export function resolveChapter(id: string) {
  return CHAPTER_INDEX.get(id);
}

export function firstChapterOf(subjectId: SubjectId): Chapter {
  return SUBJECT_BY_ID.get(subjectId)!.chapters[0];
}

/* ------------------------------------------------------------------ *
 * Localisation
 * ------------------------------------------------------------------ */

/**
 * A subject's display strings in the active language.
 *
 * Falls back to English per-field rather than per-subject, so a half-finished
 * translation degrades to a mixed-language label instead of silently dropping
 * the whole subject out of a French student's picker.
 */
export function localizedSubject(subject: Subject, lang: Lang) {
  if (lang === "en") return subject;
  const fr = SUBJECT_FR[subject.id];
  if (!fr) return subject;
  return {
    ...subject,
    name: fr.name ?? subject.name,
    tagline: fr.tagline ?? subject.tagline,
    systemPrompt: fr.systemPrompt ?? subject.systemPrompt,
  };
}

export function localizedChapter(chapter: Chapter, lang: Lang): Chapter {
  if (lang === "en") return chapter;
  const fr = CHAPTER_FR[chapter.id];
  if (!fr) return chapter;
  return {
    ...chapter,
    name: fr.name ?? chapter.name,
    blurb: fr.blurb ?? chapter.blurb,
    focus: fr.focus ?? chapter.focus,
    sampleProblems: fr.sampleProblems ?? chapter.sampleProblems,
  };
}

/** Subjects with their chapters localised, ready for the pickers. */
export function localizedSubjects(lang: Lang): Subject[] {
  return SUBJECTS.map((subject) => ({
    ...localizedSubject(subject, lang),
    chapters: subject.chapters.map((c) => localizedChapter(c, lang)),
  }));
}

export function resolveLocalizedChapter(chapterId: string, lang: Lang) {
  const resolved = CHAPTER_INDEX.get(chapterId);
  if (!resolved) return undefined;
  return {
    subject: localizedSubject(resolved.subject, lang),
    chapter: localizedChapter(resolved.chapter, lang),
  };
}

/**
 * The full prompt for a turn: the subject's stable instructions plus the
 * chapter's focus, both in the student's language.
 *
 * Composed here so no component ever builds a prompt — and localised here
 * because the prompt is how the model learns which language to answer in.
 * Translating the interface but prompting in English would produce a French
 * app that replies in English, which is worse than not translating at all.
 */
export function systemPromptFor(chapterId: string, lang: Lang = "en"): string {
  const resolved = resolveLocalizedChapter(chapterId, lang);
  if (!resolved) return "";
  const label = lang === "fr" ? "Chapitre en cours" : "Current chapter";
  return `${resolved.subject.systemPrompt}\n\n${label}: ${resolved.chapter.name}. ${resolved.chapter.focus}`;
}
