import type { ReasoningItem } from "../types";

/**
 * The seed answer bank.
 *
 * Every item here is a *verified* worked solution. That word is doing real
 * work: this corpus is what the Mental Ability tutor is allowed to reason
 * from, so an error in this file becomes an error the model states with
 * complete confidence. Treat it like test fixtures, not like content.
 *
 * Why retrieval at all for this subject? Because a 1.5B model handed
 * "120, 99, 80, 63, 48, ?" will usually produce a fluent explanation of a rule
 * it did not actually verify, and arrive at a wrong number with no visible
 * hesitation. Retrieval changes the job from "invent a method" to "recognise
 * which known method applies" — which is the thing small models are genuinely
 * good at, and which a teacher can audit.
 *
 * The bank grows: when a teacher corrects a flagged answer, the correction is
 * promoted into this same shape with `source: "teacher"` and becomes
 * retrievable for the next student — offline, pod to pod, no server.
 */

/**
 * Bump this whenever the seed content changes.
 *
 * Seed ids are positional (`ma-number-series-03`), so inserting an item at
 * the front silently re-points every id after it: a device that already
 * seeded would keep the OLD text under the NEW id and never notice. The
 * version forces a clean re-seed of `source: "seed"` rows. Teacher-authored
 * items are never touched — those are the only irreplaceable rows here.
 */
export const BANK_VERSION = 2;

function seed(
  chapterId: string,
  items: Array<Omit<ReasoningItem, "id" | "chapterId" | "source">>
): ReasoningItem[] {
  return items.map((item, i) => ({
    ...item,
    id: `${chapterId}-${String(i + 1).padStart(2, "0")}`,
    chapterId,
    source: "seed" as const,
  }));
}

const numberSeries = seed("ma-number-series", [
  // The three below were missing, and their absence caused a real failure:
  // asked "2, 4, 6, 8, ?" the tutor had no constant-difference exemplar to
  // retrieve, matched the Fibonacci item at 0.67 instead, and answered 20.
  // The simplest series type in existence was the one gap in the corpus.
  {
    question: "2, 4, 6, 8, ?",
    answer: "10",
    pattern: "constant difference (arithmetic series)",
    reasoning:
      "Differences between consecutive terms: 4-2=2, 6-4=2, 8-6=2.\n" +
      "Every difference is the same, so the rule is simply 'add 2'.\n" +
      "8 + 2 = 10.",
  },
  {
    question: "7, 14, 21, 28, ?",
    answer: "35",
    pattern: "constant difference (arithmetic series)",
    reasoning:
      "Differences: 14-7=7, 21-14=7, 28-21=7.\n" +
      "The difference is constant at 7, so the rule is 'add 7'.\n" +
      "28 + 7 = 35.",
  },
  {
    question: "100, 93, 86, 79, ?",
    answer: "72",
    pattern: "constant difference (arithmetic series), decreasing",
    reasoning:
      "Differences: 93-100=-7, 86-93=-7, 79-86=-7.\n" +
      "The difference is constant at -7, so the rule is 'subtract 7'.\n" +
      "79 - 7 = 72.",
  },
  {
    question: "3, 9, 27, 81, ?",
    answer: "243",
    pattern: "constant ratio (geometric)",
    reasoning:
      "Each term divided by the one before it gives 3: 9/3=3, 27/9=3, 81/27=3.\n" +
      "So the rule is multiply by 3.\n" +
      "81 x 3 = 243.",
  },
  {
    question: "2, 6, 12, 20, 30, ?",
    answer: "42",
    pattern: "constant second difference",
    reasoning:
      "Differences between consecutive terms: 6-2=4, 12-6=6, 20-12=8, 30-20=10.\n" +
      "The differences rise by 2 each time, so the next difference is 12.\n" +
      "30 + 12 = 42.",
  },
  {
    question: "120, 99, 80, 63, 48, ?",
    answer: "35",
    pattern: "constant second difference, decreasing series",
    reasoning:
      "Differences: 99-120=-21, 80-99=-19, 63-80=-17, 48-63=-15.\n" +
      "The differences increase by 2 each step, so the next is -13.\n" +
      "48 - 13 = 35.",
  },
  {
    question: "3, 6, 11, 18, 27, ?",
    answer: "38",
    pattern: "constant second difference",
    reasoning:
      "Differences: 3, 5, 7, 9 — consecutive odd numbers.\n" +
      "The next difference is 11.\n" +
      "27 + 11 = 38.",
  },
  {
    question: "5, 10, 20, 40, ?",
    answer: "80",
    pattern: "constant ratio (geometric)",
    reasoning:
      "Each term divided by the one before it gives 2: 10/5=2, 20/10=2, 40/20=2.\n" +
      "So the rule is multiply by 2.\n" +
      "40 x 2 = 80.",
  },
  {
    question: "1, 4, 9, 16, 25, ?",
    answer: "36",
    pattern: "perfect squares",
    reasoning:
      "Each term is a square: 1², 2², 3², 4², 5².\n" + "The next term is 6² = 36.",
  },
  {
    question: "1, 8, 27, 64, ?",
    answer: "125",
    pattern: "perfect cubes",
    reasoning:
      "Each term is a cube: 1³, 2³, 3³, 4³.\n" + "The next term is 5³ = 125.",
  },
  {
    question: "2, 3, 5, 7, 11, 13, ?",
    answer: "17",
    pattern: "prime sequence",
    reasoning:
      "The terms are the prime numbers in order: 2, 3, 5, 7, 11, 13.\n" +
      "The next prime after 13 is 17 (15 is divisible by 3 and 5, 16 by 2).",
  },
  {
    question: "4, 9, 20, 43, ?",
    answer: "90",
    pattern: "multiply by 2 then add an increasing constant",
    reasoning:
      "Check 'x2 then add something': 4x2+1=9, 9x2+2=20, 20x2+3=43.\n" +
      "The number added increases by 1 each step, so next is +4.\n" +
      "43 x 2 + 4 = 90.",
  },
  {
    question: "1, 3, 4, 7, 11, 18, ?",
    answer: "29",
    pattern: "each term is the sum of the two before it",
    reasoning:
      "1+3=4, 3+4=7, 4+7=11, 7+11=18.\n" + "So the next term is 11 + 18 = 29.",
  },
]);

const codingDecoding = seed("ma-coding-decoding", [
  {
    question: "If CAT is coded as DBU, how is DOG coded?",
    answer: "EPH",
    pattern: "fixed forward letter shift (+1)",
    reasoning:
      "Compare letter by letter: C→D is +1, A→B is +1, T→U is +1. The shift is +1.\n" +
      "Apply to DOG: D→E, O→P, G→H.\n" +
      "DOG is coded EPH.",
  },
  {
    question: "If MANGO is written as OCPIQ, how is APPLE written?",
    answer: "CRRNG",
    pattern: "fixed forward letter shift (+2)",
    reasoning:
      "M→O is +2, A→C is +2, N→P is +2, G→I is +2, O→Q is +2. The shift is +2.\n" +
      "Apply to APPLE: A→C, P→R, P→R, L→N, E→G.\n" +
      "APPLE is written CRRNG.",
  },
  {
    question: "If FRIEND is coded as HTKGPF, how is CANDLE coded?",
    answer: "ECPFNG",
    pattern: "fixed forward letter shift (+2)",
    reasoning:
      "F→H, R→T, I→K, E→G, N→P, D→F — every letter moves forward 2 places.\n" +
      "Apply to CANDLE: C→E, A→C, N→P, D→F, L→N, E→G.\n" +
      "CANDLE is coded ECPFNG.",
  },
  {
    question: "If LIGHT is written as MJHIU, how is DARK written?",
    answer: "EBSL",
    pattern: "fixed forward letter shift (+1)",
    reasoning:
      "L→M, I→J, G→H, H→I, T→U — each letter moves forward 1 place.\n" +
      "Apply to DARK: D→E, A→B, R→S, K→L.\n" +
      "DARK is written EBSL.",
  },
  {
    question: "If TEACHER is written as REHCAET, how is STUDENT written?",
    answer: "TNEDUTS",
    pattern: "whole-word reversal",
    reasoning:
      "REHCAET read backwards is TEACHER, so the code simply reverses the word.\n" +
      "Reverse STUDENT: T, N, E, D, U, T, S.\n" +
      "STUDENT is written TNEDUTS.",
  },
  {
    question: "If CAB = 6, then DAD = ?",
    answer: "9",
    pattern: "sum of alphabet positions",
    reasoning:
      "Give each letter its position in the alphabet: C=3, A=1, B=2. Their sum is 3+1+2 = 6, which matches.\n" +
      "Apply to DAD: D=4, A=1, D=4.\n" +
      "4 + 1 + 4 = 9.",
  },
  {
    question: "In a code where A=Z, B=Y, C=X and so on, how is CAT written?",
    answer: "XZG",
    pattern: "reverse alphabet substitution (27 − position)",
    reasoning:
      "Each letter maps to the one at the mirrored position: new position = 27 − old position.\n" +
      "C is 3 → 27−3 = 24 → X. A is 1 → 26 → Z. T is 20 → 7 → G.\n" +
      "CAT is written XZG.",
  },
]);

const bloodRelations = seed("ma-blood-relations", [
  {
    question: "A is B's sister. C is B's mother. D is C's father. How is A related to D?",
    answer: "A is D's granddaughter.",
    pattern: "build the tree one statement at a time",
    reasoning:
      "A is B's sister, so A and B have the same parents.\n" +
      "C is B's mother, therefore C is also A's mother.\n" +
      "D is C's father, so D is one generation above C and two above A.\n" +
      "A is female, so A is D's granddaughter.",
  },
  {
    question:
      "Pointing to a photograph, a man said, 'I have no brother or sister, but that man's father is my father's son.' Who is in the photograph?",
    answer: "His son.",
    pattern: "resolve self-referential phrases first",
    reasoning:
      "Start with 'my father's son'. The speaker has no brothers, so his father's only son is the speaker himself.\n" +
      "The statement becomes: 'that man's father is me.'\n" +
      "If the speaker is the man's father, the man in the photograph is the speaker's son.",
  },
  {
    question: "P is the father of Q. Q is the sister of R. R is the son of S. How is S related to P?",
    answer: "S is P's wife.",
    pattern: "siblings share parents",
    reasoning:
      "Q is the sister of R, so Q and R have the same parents.\n" +
      "P is the father of Q, so P is also the father of R.\n" +
      "S is a parent of R and is not P, so S is R's mother.\n" +
      "R's mother and R's father are married, so S is P's wife.",
  },
  {
    question:
      "Introducing a woman, a man said, 'Her mother is the only daughter of my mother.' How is the man related to the woman?",
    answer: "He is her maternal uncle.",
    pattern: "resolve self-referential phrases first",
    reasoning:
      "'The only daughter of my mother' is the speaker's sister (the speaker is male, so it is not himself).\n" +
      "So the woman's mother is the speaker's sister.\n" +
      "The brother of someone's mother is her maternal uncle.",
  },
  {
    question: "X is the brother of the son of Y's son. How is X related to Y?",
    answer: "X is Y's grandson.",
    pattern: "work outward from the innermost relation",
    reasoning:
      "Innermost: 'Y's son' — call him S.\n" +
      "'The son of Y's son' is S's son, who is Y's grandson.\n" +
      "X is that person's brother, so X is also a son of S.\n" +
      "A son of Y's son is Y's grandson.",
  },
  {
    question:
      "If A + B means A is the father of B, and A − B means A is the wife of B, then in P + Q − R, how is P related to R?",
    answer: "P is R's father-in-law.",
    pattern: "translate symbols into plain relations, then combine",
    reasoning:
      "P + Q means P is the father of Q.\n" +
      "Q − R means Q is the wife of R.\n" +
      "So R is married to P's daughter, which makes P the father of R's wife.\n" +
      "The father of a man's wife is his father-in-law.",
  },
  {
    question: "Ram's mother is the sister of Shyam's father. How is Shyam related to Ram?",
    answer: "Shyam is Ram's cousin.",
    pattern: "identify the shared grandparents",
    reasoning:
      "Ram's mother and Shyam's father are siblings, so they share the same parents.\n" +
      "That means Ram and Shyam share the same grandparents but have different parents.\n" +
      "Children of two siblings are cousins.",
  },
]);

const directionSense = seed("ma-direction-sense", [
  {
    question:
      "A man walks 5 km north, turns right and walks 3 km, then turns right and walks 5 km. How far is he from the start and in which direction?",
    answer: "3 km, to the east of his starting point.",
    pattern: "track facing direction, then net north-south and east-west totals",
    reasoning:
      "Leg 1: 5 km north. Facing north.\n" +
      "Turn right from north → facing east. Leg 2: 3 km east.\n" +
      "Turn right from east → facing south. Leg 3: 5 km south.\n" +
      "North total: 5 − 5 = 0. East total: 3.\n" +
      "He is 3 km due east of the start.",
  },
  {
    question: "A walks 4 km east, then 3 km north. How far is he from the starting point?",
    answer: "5 km, to the north-east.",
    pattern: "Pythagoras on the net displacements",
    reasoning:
      "East total: 4 km. North total: 3 km. These are at right angles.\n" +
      "Straight-line distance = √(4² + 3²) = √(16 + 9) = √25 = 5 km.\n" +
      "Since he ended up both north and east of the start, the direction is north-east.",
  },
  {
    question: "If you are facing east and turn 135° clockwise, which direction are you facing?",
    answer: "South-west.",
    pattern: "convert to compass bearings and add",
    reasoning:
      "As a bearing, east is 90°.\n" +
      "Turning clockwise adds to the bearing: 90° + 135° = 225°.\n" +
      "A bearing of 225° is south-west (180° is south, 270° is west, 225° is midway).",
  },
  {
    question:
      "Ravi walks 10 m south, turns left and walks 5 m, then turns left and walks 10 m. Where is he now?",
    answer: "5 m to the east of his starting point.",
    pattern: "track facing direction, then net north-south and east-west totals",
    reasoning:
      "Leg 1: 10 m south. Facing south.\n" +
      "Turn left from south → facing east. Leg 2: 5 m east.\n" +
      "Turn left from east → facing north. Leg 3: 10 m north.\n" +
      "South total: 10 − 10 = 0. East total: 5.\n" +
      "He is 5 m due east of the start.",
  },
  {
    question:
      "A man walks 3 km north, then 4 km west, then 3 km south. How far is he from the start and in which direction?",
    answer: "4 km, to the west.",
    pattern: "net north-south and east-west totals",
    reasoning:
      "North total: 3 − 3 = 0 (the 3 km north and 3 km south cancel).\n" +
      "West total: 4 km.\n" +
      "He is 4 km due west of the start.",
  },
  {
    question: "In the early morning a boy's shadow falls to his right. Which direction is he facing?",
    answer: "North.",
    pattern: "the sun rises in the east, so morning shadows point west",
    reasoning:
      "In the early morning the sun is in the east, so every shadow points west.\n" +
      "The boy's shadow is on his right, so west is on his right.\n" +
      "If west is on your right, you are facing north.",
  },
  {
    question:
      "A woman walks 2 km north, turns right and walks 2 km, turns right and walks 4 km, then turns left and walks 2 km. Where is she relative to the start?",
    answer: "2 km south and 4 km east — about 4.47 km to the south-east.",
    pattern: "track facing direction, then net north-south and east-west totals",
    reasoning:
      "Leg 1: 2 km north, facing north.\n" +
      "Right from north → east. Leg 2: 2 km east.\n" +
      "Right from east → south. Leg 3: 4 km south.\n" +
      "Left from south → east. Leg 4: 2 km east.\n" +
      "North-south: 2 north − 4 south = 2 km south. East-west: 2 + 2 = 4 km east.\n" +
      "Distance = √(2² + 4²) = √20 ≈ 4.47 km, to the south-east.",
  },
]);

const analogies = seed("ma-analogies", [
  {
    question: "Doctor : Hospital :: Teacher : ?",
    answer: "School",
    pattern: "state the relationship in words, then apply it",
    reasoning:
      "The relationship is 'person : the place where that person works'.\n" +
      "A doctor works in a hospital.\n" +
      "A teacher works in a school.",
  },
  {
    question: "Pen : Write :: Knife : ?",
    answer: "Cut",
    pattern: "tool : its primary function",
    reasoning:
      "The relationship is 'tool : the action it is used for'.\n" +
      "A pen is used to write.\n" +
      "A knife is used to cut.",
  },
  {
    question: "Ocean : Water :: Glacier : ?",
    answer: "Ice",
    pattern: "large body : the substance it is made of",
    reasoning:
      "The relationship is 'large natural mass : the material it consists of'.\n" +
      "An ocean is a mass of water.\n" +
      "A glacier is a mass of ice.",
  },
  {
    question: "Bird : Nest :: Bee : ?",
    answer: "Hive",
    pattern: "animal : its dwelling",
    reasoning:
      "The relationship is 'animal : the home it builds and lives in'.\n" +
      "A bird lives in a nest.\n" +
      "A bee lives in a hive.",
  },
  {
    question: "Odd one out: Triangle, Square, Circle, Rectangle",
    answer: "Circle",
    pattern: "name the property the majority share, then find the exception",
    reasoning:
      "Triangle, square and rectangle are all made of straight line segments and have corners.\n" +
      "A circle has no straight sides and no corners.\n" +
      "So the circle is the odd one out.",
  },
  {
    question: "Odd one out: 3, 5, 11, 14, 17",
    answer: "14",
    pattern: "name the property the majority share, then find the exception",
    reasoning:
      "3, 5, 11 and 17 are prime numbers — divisible only by 1 and themselves.\n" +
      "14 = 2 x 7, so it is composite (and it is the only even number here).\n" +
      "14 is the odd one out.",
  },
  {
    question: "Odd one out: 16, 25, 36, 40, 49",
    answer: "40",
    pattern: "name the property the majority share, then find the exception",
    reasoning:
      "16 = 4², 25 = 5², 36 = 6², 49 = 7² — all perfect squares.\n" +
      "40 is not a perfect square (6² = 36 and 7² = 49).\n" +
      "40 is the odd one out.",
  },
  {
    question: "Odd one out: Cow, Dog, Tiger, Goat",
    answer: "Tiger",
    pattern: "name the property the majority share, then find the exception",
    reasoning:
      "Cow, dog and goat are domestic animals kept by people.\n" +
      "A tiger is a wild animal.\n" +
      "The tiger is the odd one out.",
  },
]);

const syllogisms = seed("ma-syllogisms", [
  {
    question:
      "Statements: All roses are flowers. Some flowers fade quickly. Conclusion: Some roses fade quickly. Does it follow?",
    answer: "No, it does not follow.",
    pattern: "look for a counter-example where the statements hold but the conclusion fails",
    reasoning:
      "All roses sit inside the set of flowers, but 'some flowers fade quickly' does not say which flowers.\n" +
      "Imagine the only quick-fading flowers are lilies. Both statements are still true, yet no rose fades quickly.\n" +
      "Because a counter-example exists, the conclusion does not necessarily follow.",
  },
  {
    question:
      "Statements: All cats are animals. All animals need food. Conclusion: All cats need food. Does it follow?",
    answer: "Yes, it follows.",
    pattern: "chain two universal statements",
    reasoning:
      "Every cat is inside the set of animals.\n" +
      "Every animal is inside the set of things that need food.\n" +
      "So every cat is inside the set of things that need food. The chain is unbroken, so it follows.",
  },
  {
    question:
      "Statements: Some books are pens. All pens are red. Conclusion: Some books are red. Does it follow?",
    answer: "Yes, it follows.",
    pattern: "a particular statement chained into a universal one",
    reasoning:
      "'Some books are pens' means at least one thing is both a book and a pen.\n" +
      "'All pens are red' means that thing, being a pen, is red.\n" +
      "So at least one book is red — 'some books are red' follows.",
  },
  {
    question:
      "Statements: No student is lazy. Some lazy people are rich. Conclusion: Some rich people are not students. Does it follow?",
    answer: "Yes, it follows.",
    pattern: "combine a negative universal with a particular statement",
    reasoning:
      "'Some lazy people are rich' means at least one person is both lazy and rich.\n" +
      "'No student is lazy' means that lazy person cannot be a student.\n" +
      "So at least one rich person is not a student — the conclusion follows.",
  },
  {
    question:
      "Statements: All mangoes are fruits. No fruit is a vegetable. Conclusion: No mango is a vegetable. Does it follow?",
    answer: "Yes, it follows.",
    pattern: "chain a universal statement into a negative universal",
    reasoning:
      "Every mango is a fruit.\n" +
      "No fruit is a vegetable, so nothing that is a fruit can be a vegetable.\n" +
      "Since every mango is a fruit, no mango can be a vegetable. It follows.",
  },
  {
    question:
      "Statements: Some doctors are teachers. All teachers are graduates. Conclusion: Some doctors are graduates. Does it follow?",
    answer: "Yes, it follows.",
    pattern: "a particular statement chained into a universal one",
    reasoning:
      "At least one person is both a doctor and a teacher.\n" +
      "All teachers are graduates, so that person is a graduate.\n" +
      "Therefore at least one doctor is a graduate — it follows.",
  },
  {
    question:
      "Statements: All pens are books. Some books are red. Conclusion: Some pens are red. Does it follow?",
    answer: "No, it does not follow.",
    pattern: "look for a counter-example where the statements hold but the conclusion fails",
    reasoning:
      "Pens are a subset of books, but 'some books are red' need not refer to the pens.\n" +
      "Imagine every pen is blue and only non-pen books are red. Both statements hold and no pen is red.\n" +
      "A counter-example exists, so the conclusion does not follow.",
  },
]);

const arrangements = seed("ma-arrangements", [
  {
    question: "In a row of 40 students, Rahul is 12th from the left. What is his position from the right?",
    answer: "29th from the right.",
    pattern: "position from right = total − position from left + 1",
    reasoning:
      "There are 40 students in total and Rahul is 12th from the left.\n" +
      "Position from right = 40 − 12 + 1 = 29.\n" +
      "The +1 is because Rahul himself must be counted.",
  },
  {
    question: "In a row, Sita is 11th from the left and 15th from the right. How many students are in the row?",
    answer: "25 students.",
    pattern: "total = left position + right position − 1",
    reasoning:
      "Adding the two positions counts Sita twice: 11 + 15 = 26.\n" +
      "Subtract 1 to remove the double count: 26 − 1 = 25.\n" +
      "There are 25 students in the row.",
  },
  {
    question: "In a row of 20 people, A is 7th from the left and B is 9th from the right. How many people are between them?",
    answer: "4 people.",
    pattern: "convert both to positions from the same end, then subtract",
    reasoning:
      "A is at position 7 from the left.\n" +
      "B is 9th from the right, so from the left B is at 20 − 9 + 1 = 12.\n" +
      "People strictly between positions 7 and 12: 12 − 7 − 1 = 4.",
  },
  {
    question: "In a class of 35, Amina's rank is 13th from the top. What is her rank from the bottom?",
    answer: "23rd from the bottom.",
    pattern: "position from one end = total − position from other end + 1",
    reasoning:
      "Total = 35, rank from the top = 13.\n" + "Rank from the bottom = 35 − 13 + 1 = 23.",
  },
  {
    question:
      "Five friends A, B, C, D and E sit in a row. A is to the left of B but to the right of C. D is to the right of B. E is at the extreme right. Who is in the middle?",
    answer: "B is in the middle.",
    pattern: "fix the most constrained clue first, then place the rest",
    reasoning:
      "E is at the extreme right — that is the only fixed position, so place it at seat 5.\n" +
      "C is left of A and A is left of B, giving the order C, A, B.\n" +
      "D is right of B, so the order is C, A, B, D and then E: C A B D E.\n" +
      "The middle seat is the 3rd, which is B.",
  },
  {
    question:
      "Five boys sit in a row. J is to the left of K but to the right of L. M is to the right of K. N is to the left of L. Who is in the middle?",
    answer: "J is in the middle.",
    pattern: "chain the left-right clues into a single order",
    reasoning:
      "L is left of J and J is left of K, giving L, J, K.\n" +
      "M is right of K: L, J, K, M.\n" +
      "N is left of L: N, L, J, K, M.\n" +
      "The 3rd of five positions is J.",
  },
  {
    question:
      "P, Q, R and S sit around a square table facing the centre. P is opposite R and Q is to the immediate left of P. Where does S sit?",
    answer: "To the immediate right of P.",
    pattern: "in a group of four facing the centre, the two unnamed seats are the pair opposite each other",
    reasoning:
      "Four people at a square table means two pairs of opposite seats.\n" +
      "P and R are one opposite pair, so Q and S must be the other opposite pair.\n" +
      "Q is to the immediate left of P, so the only remaining seat — the immediate right of P — belongs to S.",
  },
]);

export const REASONING_BANK: ReasoningItem[] = [
  ...numberSeries,
  ...codingDecoding,
  ...bloodRelations,
  ...directionSense,
  ...analogies,
  ...syllogisms,
  ...arrangements,
];

/**
 * Text used to build an item's embedding.
 *
 * Chapter name, then question, then pattern — deliberately excluding the
 * answer, because we want to match on "what kind of problem is this", not on
 * the digits in the solution.
 *
 * The chapter name is in there for a measured reason. Without it,
 * "Which one does not belong: 9, 16, 24, 36?" retrieved the Number Series
 * item "1, 4, 9, 16, 25, ?" — same digits, wrong technique. Prefixing the
 * chapter name pulls the odd-one-out items closer to odd-one-out questions
 * and fixed that case. It costs a small amount of raw similarity across the
 * board (~0.02) in exchange for better separation between techniques.
 */
export function embeddingTextFor(item: ReasoningItem, chapterName?: string): string {
  return [chapterName, item.question, item.pattern].filter(Boolean).join("\n");
}
