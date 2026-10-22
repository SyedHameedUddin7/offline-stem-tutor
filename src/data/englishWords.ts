import type { EnglishTopic, EnglishWord, WordPicture } from "../types";

/**
 * Beginner English vocabulary for the picture-match game.
 *
 * Pitched at a French-speaking learner starting from zero, and ordered so the
 * later topics (shapes, nature, science) carry the words the STEM chapters
 * use. Topics unlock in this order, so the order is the syllabus.
 *
 * Emoji are restricted to ones an Android 7 phone can draw: a missing glyph
 * renders as an empty box, and a picture question with an empty box for a
 * picture is unanswerable.
 *
 * Adding a word means adding a line here. Ids are stored against learner
 * progress, so never re-use or rename one.
 */

const emoji = (value: string): WordPicture => ({ kind: "emoji", value });
const swatch = (color: string): WordPicture => ({ kind: "swatch", color });
const count = (n: number): WordPicture => ({ kind: "count", n });

function words(topic: string, rows: Array<[string, string, WordPicture]>): EnglishWord[] {
  return rows.map(([en, fr, picture]) => ({
    id: `${topic}:${en.replace(/\s+/g, "-")}`,
    en,
    fr,
    picture,
  }));
}

export const ENGLISH_TOPICS: EnglishTopic[] = [
  {
    id: "numbers",
    name: "Numbers",
    nameFr: "Les nombres",
    icon: "🔢",
    words: words("numbers", [
      ["one", "un", count(1)],
      ["two", "deux", count(2)],
      ["three", "trois", count(3)],
      ["four", "quatre", count(4)],
      ["five", "cinq", count(5)],
      ["six", "six", count(6)],
      ["seven", "sept", count(7)],
      ["eight", "huit", count(8)],
    ]),
  },
  {
    id: "colours",
    name: "Colours",
    nameFr: "Les couleurs",
    icon: "🎨",
    words: words("colours", [
      ["red", "rouge", swatch("#E0453A")],
      ["blue", "bleu", swatch("#3A7BE0")],
      ["green", "vert", swatch("#3AAE5C")],
      ["yellow", "jaune", swatch("#F2D43B")],
      ["black", "noir", swatch("#111111")],
      ["white", "blanc", swatch("#FFFFFF")],
      ["orange", "orange", swatch("#F28C28")],
      ["brown", "marron", swatch("#8B5A2B")],
    ]),
  },
  {
    id: "people",
    name: "Family",
    nameFr: "La famille",
    icon: "👪",
    words: words("people", [
      ["man", "homme", emoji("👨")],
      ["woman", "femme", emoji("👩")],
      ["boy", "garçon", emoji("👦")],
      ["girl", "fille", emoji("👧")],
      ["baby", "bébé", emoji("👶")],
      ["grandfather", "grand-père", emoji("👴")],
      ["grandmother", "grand-mère", emoji("👵")],
      ["family", "famille", emoji("👪")],
    ]),
  },
  {
    id: "body",
    name: "My body",
    nameFr: "Le corps",
    icon: "✋",
    words: words("body", [
      ["eye", "œil", emoji("👁️")],
      ["ear", "oreille", emoji("👂")],
      ["nose", "nez", emoji("👃")],
      ["mouth", "bouche", emoji("👄")],
      ["hand", "main", emoji("✋")],
      ["arm", "bras", emoji("💪")],
      ["heart", "cœur", emoji("❤️")],
      ["tongue", "langue", emoji("👅")],
    ]),
  },
  {
    id: "food",
    name: "Food",
    nameFr: "La nourriture",
    icon: "🍎",
    words: words("food", [
      ["apple", "pomme", emoji("🍎")],
      ["banana", "banane", emoji("🍌")],
      ["bread", "pain", emoji("🍞")],
      ["egg", "œuf", emoji("🥚")],
      ["fish", "poisson", emoji("🐟")],
      ["rice", "riz", emoji("🍚")],
      ["milk", "lait", emoji("🥛")],
      ["water", "eau", emoji("💧")],
    ]),
  },
  {
    id: "animals",
    name: "Animals",
    nameFr: "Les animaux",
    icon: "🐐",
    words: words("animals", [
      ["cow", "vache", emoji("🐄")],
      ["goat", "chèvre", emoji("🐐")],
      ["chicken", "poule", emoji("🐔")],
      ["dog", "chien", emoji("🐕")],
      ["cat", "chat", emoji("🐈")],
      ["horse", "cheval", emoji("🐎")],
      ["elephant", "éléphant", emoji("🐘")],
      ["lion", "lion", emoji("🦁")],
    ]),
  },
  {
    id: "school",
    name: "School",
    nameFr: "L'école",
    icon: "🎒",
    words: words("school", [
      ["book", "livre", emoji("📖")],
      ["pencil", "crayon", emoji("✏️")],
      ["pen", "stylo", emoji("🖊️")],
      ["bag", "sac", emoji("🎒")],
      ["school", "école", emoji("🏫")],
      ["computer", "ordinateur", emoji("💻")],
      ["paper", "papier", emoji("📄")],
      ["scissors", "ciseaux", emoji("✂️")],
    ]),
  },
  {
    id: "shapes",
    name: "Shapes",
    nameFr: "Les formes",
    icon: "🔺",
    words: words("shapes", [
      ["circle", "cercle", { kind: "shape", shape: "circle" }],
      ["square", "carré", { kind: "shape", shape: "square" }],
      ["triangle", "triangle", { kind: "shape", shape: "triangle" }],
      ["rectangle", "rectangle", { kind: "shape", shape: "rectangle" }],
      ["star", "étoile", { kind: "shape", shape: "star" }],
      ["line", "ligne", { kind: "shape", shape: "line" }],
    ]),
  },
  {
    id: "nature",
    name: "Nature",
    nameFr: "La nature",
    icon: "🌳",
    words: words("nature", [
      ["sun", "soleil", emoji("☀️")],
      ["moon", "lune", emoji("🌙")],
      ["cloud", "nuage", emoji("☁️")],
      ["rain", "pluie", emoji("🌧️")],
      ["tree", "arbre", emoji("🌳")],
      ["flower", "fleur", emoji("🌸")],
      ["plant", "plante", emoji("🌿")],
      ["fire", "feu", emoji("🔥")],
    ]),
  },
  {
    id: "science",
    name: "Science tools",
    nameFr: "Les outils de science",
    icon: "🔬",
    words: words("science", [
      ["clock", "horloge", emoji("⏰")],
      ["thermometer", "thermomètre", emoji("🌡️")],
      ["ruler", "règle", emoji("📏")],
      ["light bulb", "ampoule", emoji("💡")],
      ["battery", "pile", emoji("🔋")],
      ["microscope", "microscope", emoji("🔬")],
      ["scale", "balance", emoji("⚖️")],
      ["magnifying glass", "loupe", emoji("🔍")],
    ]),
  },
];
