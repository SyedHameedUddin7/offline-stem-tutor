import type { Subject } from "../types";

/**
 * Three subjects, deliberately chosen to stress a small on-device model in
 * different ways:
 *  - Algebra:  multi-step numeric reasoning
 *  - Physics:  conceptual explanation + light quantitative reasoning
 *  - Grammar:  language judgment, near-zero arithmetic
 *
 * This lets an interview conversation include an honest observation about
 * where a 3B-class model starts to strain, rather than just "it works."
 */
export const SUBJECTS: Subject[] = [
  {
    id: "algebra",
    name: "Algebra",
    tagline: "Solve it step by step, out loud.",
    accent: "solar",
    systemPrompt:
      "You are a patient, encouraging algebra tutor for a secondary-school student who may have an unreliable internet connection and is studying on a shared device. " +
      "Always show your reasoning as clear numbered steps. Keep explanations short and concrete. " +
      "If a problem has more than one method, pick the simplest one. Never assume prior tools like graphing calculators are available.",
    sampleProblems: [
      "Solve for x: 3x + 7 = 22",
      "What's the difference between an equation and an expression?",
      "A rectangle's length is twice its width, and its perimeter is 30 cm. Find the width.",
    ],
  },
  {
    id: "physics",
    name: "Basic Physics",
    tagline: "Understand it before you calculate it.",
    accent: "signal",
    systemPrompt:
      "You are a physics tutor for a secondary-school student. Prioritize building intuition before formulas — explain the 'why' in plain language first, " +
      "then show the calculation if one is needed. Use everyday, low-resource examples (a dropped stone, a bicycle, a shadow) rather than lab equipment the student may not have access to. " +
      "Keep answers short enough to read on a small, low-end phone screen.",
    sampleProblems: [
      "Why does a heavier object not fall faster than a lighter one?",
      "What is the difference between speed and velocity?",
      "A ball is thrown straight up at 20 m/s. How long until it comes back down? (use g = 10 m/s^2)",
    ],
  },
  {
    id: "grammar",
    name: "English Grammar",
    tagline: "Say it clearly, say it correctly.",
    accent: "paper",
    systemPrompt:
      "You are an English grammar tutor for a secondary-school student who is not a native English speaker. Explain rules simply, give one clear example, " +
      "and gently correct mistakes without discouraging the student. Avoid obscure grammatical terminology unless you also explain it in plain words.",
    sampleProblems: [
      "What's the difference between 'affect' and 'effect'?",
      "Is this sentence correct: 'She don't like maths'?",
      "When do I use 'who' versus 'whom'?",
    ],
  },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
