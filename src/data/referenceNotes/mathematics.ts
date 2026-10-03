import { notes } from "./helpers";

/**
 * Mathematics reference notes.
 *
 * Every `misconception` note is here because it is the error a secondary
 * student actually makes, and because a 1.5B model will often make the same
 * one. Naming it explicitly in the prompt is cheap and stops a whole class of
 * wrong answer — more cheaply than a larger model would.
 */
export const MATHEMATICS_NOTES = [
  ...notes("math-number-systems", [
    {
      kind: "definition",
      title: "HCF and LCM",
      body:
        "HCF (highest common factor) is the largest number that divides all the given numbers. " +
        "LCM (lowest common multiple) is the smallest number they all divide into. " +
        "Find both by prime factorisation: HCF takes the lowest power of each shared prime; LCM takes the highest power of every prime appearing.",
    },
    {
      kind: "worked-example",
      title: "HCF and LCM of 24 and 36",
      body:
        "24 = 2^3 x 3. 36 = 2^2 x 3^2.\n" +
        "HCF: lowest power of each shared prime = 2^2 x 3 = 12.\n" +
        "LCM: highest power of every prime = 2^3 x 3^2 = 72.\n" +
        "Check: HCF x LCM = 12 x 72 = 864 = 24 x 36.",
    },
    {
      kind: "formula",
      title: "Order of operations",
      body:
        "Brackets, then powers, then multiplication and division left to right, then addition and subtraction left to right. " +
        "Multiplication does not automatically come before division — work left to right between them.",
    },
    {
      kind: "misconception",
      title: "Dividing by a fraction",
      body:
        "Students expect dividing to make a number smaller, so a ÷ (1/2) looks like it should shrink. " +
        "It does not: dividing by 1/2 asks 'how many halves fit in this?', so 6 ÷ (1/2) = 12. " +
        "Dividing by a fraction less than 1 always gives a larger result.",
    },
  ]),

  ...notes("math-algebraic-expressions", [
    {
      kind: "formula",
      title: "The standard identities",
      body:
        "(a + b)^2 = a^2 + 2ab + b^2\n" +
        "(a - b)^2 = a^2 - 2ab + b^2\n" +
        "(a + b)(a - b) = a^2 - b^2\n" +
        "The middle term 2ab is the one most often lost.",
    },
    {
      kind: "worked-example",
      title: "Using a^2 - b^2 for 98 x 102",
      body:
        "98 x 102 = (100 - 2)(100 + 2), which matches (a - b)(a + b) with a = 100, b = 2.\n" +
        "So it equals 100^2 - 2^2 = 10000 - 4 = 9996.",
    },
    {
      kind: "definition",
      title: "Like terms",
      body:
        "Like terms have exactly the same variables raised to the same powers; only their coefficients differ. " +
        "3x and 7x are like terms. 3x and 3x^2 are not. 3xy and 3yx are (order does not matter). " +
        "Only like terms can be added or subtracted.",
    },
    {
      kind: "misconception",
      title: "(a + b)^2 is not a^2 + b^2",
      body:
        "This is the most common algebra error at this level. (a + b)^2 means (a + b)(a + b), " +
        "which expands to a^2 + 2ab + b^2. Test it with numbers: (3 + 4)^2 = 49, but 3^2 + 4^2 = 25. " +
        "The same applies to square roots: sqrt(a + b) is not sqrt(a) + sqrt(b).",
    },
  ]),

  ...notes("math-linear-equations", [
    {
      kind: "definition",
      title: "The balance principle",
      body:
        "An equation is a balance. Whatever you do to one side you must do to the other: add, subtract, " +
        "multiply or divide both sides by the same thing. Dividing both sides by zero is never allowed.",
    },
    {
      kind: "worked-example",
      title: "Solve 3x + 7 = 22",
      body:
        "1. Subtract 7 from both sides: 3x = 15.\n" +
        "2. Divide both sides by 3: x = 5.\n" +
        "3. Check by substituting back: 3(5) + 7 = 22. Correct.",
    },
    {
      kind: "worked-example",
      title: "Turning words into an equation",
      body:
        "'A rectangle's length is twice its width and its perimeter is 30 cm. Find the width.'\n" +
        "1. Name the unknown: let the width be w.\n" +
        "2. Express everything else in terms of it: length = 2w.\n" +
        "3. Use the formula: perimeter = 2(length + width) = 2(2w + w) = 6w.\n" +
        "4. Solve: 6w = 30, so w = 5 cm.\n" +
        "Always name the unknown before writing the equation.",
    },
    {
      kind: "misconception",
      title: "Moving a term changes its sign",
      body:
        "When a term crosses the equals sign its sign flips: from 3x + 7 = 22 you get 3x = 22 - 7, not 22 + 7. " +
        "Substituting the answer back into the ORIGINAL equation catches this error every time, which is why the check is worth the extra line.",
    },
  ]),

  ...notes("math-ratio-percentage", [
    {
      kind: "formula",
      title: "Percentage change, profit and loss",
      body:
        "Percentage change = (change ÷ original) x 100.\n" +
        "Profit % = (profit ÷ cost price) x 100.\n" +
        "Loss % = (loss ÷ cost price) x 100.\n" +
        "Simple interest = (principal x rate x time) ÷ 100.\n" +
        "Profit and loss percentages are always taken on the COST price unless stated otherwise.",
    },
    {
      kind: "worked-example",
      title: "Unitary method",
      body:
        "'If 5 pens cost 120 francs, what do 8 pens cost?'\n" +
        "1. Find the cost of one: 120 ÷ 5 = 24 francs.\n" +
        "2. Multiply by the number wanted: 24 x 8 = 192 francs.",
    },
    {
      kind: "worked-example",
      title: "Sharing in a ratio",
      body:
        "'Share 3500 between two people in the ratio 3:4.'\n" +
        "1. Total parts = 3 + 4 = 7.\n" +
        "2. One part = 3500 ÷ 7 = 500.\n" +
        "3. Shares = 3 x 500 = 1500 and 4 x 500 = 2000. They sum to 3500, as they must.",
    },
    {
      kind: "misconception",
      title: "A 20% rise then a 20% fall does not return to the start",
      body:
        "The two percentages are taken on different bases. 100 rises by 20% to 120; 120 falls by 20% (of 120, not of 100) to 96. " +
        "Always ask 'percentage of what?' before calculating.",
    },
  ]),

  ...notes("math-geometry-triangles", [
    {
      kind: "formula",
      title: "Core angle facts",
      body:
        "Angles on a straight line add to 180°. Angles around a point add to 360°.\n" +
        "The three angles of a triangle add to 180°; of a quadrilateral, 360°.\n" +
        "With parallel lines cut by a transversal: corresponding angles are equal, alternate angles are equal, and co-interior angles add to 180°.",
    },
    {
      kind: "formula",
      title: "Pythagoras theorem",
      body:
        "In a RIGHT-ANGLED triangle only, hypotenuse^2 = side1^2 + side2^2. " +
        "The hypotenuse is the longest side, opposite the right angle. " +
        "Common whole-number triples: 3-4-5, 5-12-13, 8-15-17.",
    },
    {
      kind: "worked-example",
      title: "Ladder against a wall",
      body:
        "A 5 m ladder has its foot 3 m from the wall. How high does it reach?\n" +
        "The wall, ground and ladder form a right-angled triangle with the ladder as hypotenuse.\n" +
        "height^2 = 5^2 - 3^2 = 25 - 9 = 16, so height = 4 m.",
    },
    {
      kind: "misconception",
      title: "Congruent is not the same as similar",
      body:
        "Congruent triangles are identical in both shape and size (conditions: SSS, SAS, ASA, RHS). " +
        "Similar triangles have the same shape but may differ in size — equal angles, sides in proportion. " +
        "Also: Pythagoras applies ONLY to right-angled triangles, not to every triangle.",
    },
  ]),

  ...notes("math-mensuration", [
    {
      kind: "formula",
      title: "Area and perimeter",
      body:
        "Rectangle: area = length x width, perimeter = 2(length + width).\n" +
        "Triangle: area = (1/2) x base x height, where the height is perpendicular to that base.\n" +
        "Parallelogram: area = base x perpendicular height.\n" +
        "Circle: area = pi r^2, circumference = 2 pi r. Use pi = 22/7 when the radius is a multiple of 7.",
    },
    {
      kind: "formula",
      title: "Surface area and volume",
      body:
        "Cube of side a: volume = a^3, surface area = 6a^2.\n" +
        "Cuboid: volume = l x w x h, surface area = 2(lw + wh + hl).\n" +
        "Cylinder: volume = pi r^2 h, curved surface = 2 pi r h, total surface = 2 pi r (r + h).\n" +
        "1 m^3 = 1000 litres, and 1000 cm^3 = 1 litre.",
    },
    {
      kind: "worked-example",
      title: "Litres in a tank",
      body:
        "A tank is 2 m x 1.5 m x 1 m.\n" +
        "Volume = 2 x 1.5 x 1 = 3 m^3.\n" +
        "3 m^3 x 1000 = 3000 litres.",
    },
    {
      kind: "misconception",
      title: "Units go up with the dimension",
      body:
        "Length is in cm, area in cm^2, volume in cm^3. Converting is not a matter of moving one decimal point: " +
        "1 m = 100 cm, but 1 m^2 = 10 000 cm^2 and 1 m^3 = 1 000 000 cm^3. " +
        "Also, the 'height' in a triangle or parallelogram area is the perpendicular height, not a slanted side.",
    },
  ]),

  ...notes("math-data-probability", [
    {
      kind: "definition",
      title: "Mean, median and mode",
      body:
        "Mean = sum of values ÷ number of values.\n" +
        "Median = the middle value once the data is sorted (the average of the two middle values if there is an even count).\n" +
        "Mode = the value occurring most often; there can be more than one, or none.",
    },
    {
      kind: "formula",
      title: "Probability of a single event",
      body:
        "P(event) = (number of favourable outcomes) ÷ (total number of equally likely outcomes).\n" +
        "Every probability lies between 0 and 1. P(not A) = 1 - P(A). " +
        "The probabilities of all possible outcomes sum to 1.",
    },
    {
      kind: "worked-example",
      title: "Mean, median, mode of 4, 7, 7, 9, 13",
      body:
        "Mean = (4 + 7 + 7 + 9 + 13) ÷ 5 = 40 ÷ 5 = 8.\n" +
        "Sorted, the middle of five values is the third: median = 7.\n" +
        "7 appears twice, every other value once: mode = 7.",
    },
    {
      kind: "misconception",
      title: "The mean is dragged by outliers",
      body:
        "One extreme value moves the mean a long way and the median barely at all. " +
        "For incomes in a village where one person earns far more than everyone else, the median describes a typical person and the mean does not. " +
        "Separately: past results do not change a fair coin's next toss.",
    },
  ]),
];
