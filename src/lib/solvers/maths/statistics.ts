import { Fraction, formatNumber } from "../../math/fraction";
import { UNRECOGNISED, invalid, numbersIn, solved, type Say, type SolveOutcome } from "../types";

/**
 * Averages of a list, and the probability of a simple event: a bag of
 * coloured objects, or one fair die.
 */

const WANTS = {
  mean: /\b(mean|average|moyenne)\b/i,
  median: /\b(median|m[ée]diane)\b/i,
  mode: /\b(mode)\b/i,
  range: /\b(range|[ée]tendue)\b/i,
};

export function solveAverages(text: string, say: Say): SolveOutcome {
  const wanted = (Object.keys(WANTS) as Array<keyof typeof WANTS>).filter((k) => WANTS[k].test(text));
  if (wanted.length === 0) return UNRECOGNISED;
  // The data is the list after the keyword: "mean of 4, 8, 15" — not the "3"
  // in "find the 3 averages".
  const afterKeyword = text.slice(Math.min(...wanted.map((k) => text.search(WANTS[k]))));
  const data = numbersIn(afterKeyword.replace(/\b(mean|average|median|mode|range|moyenne|médiane|mediane|étendue|etendue)\b/gi, " "));
  if (data.length < 2) {
    return invalid("math.averages", say("Give the data as a list of at least two numbers, e.g. 4, 8, 15, 16.", "Donne les données sous forme de liste d'au moins deux nombres, par ex. 4, 8, 15, 16."));
  }

  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((a, b) => a + b, 0);
  const steps: string[] = [`${say("Data in order", "Données rangées")}: ${sorted.join(", ")} (n = ${data.length})`];
  const parts: string[] = [];
  let value: number | undefined;

  const mean = sum / data.length;
  if (wanted.includes("mean")) {
    steps.push(`${say("Mean", "Moyenne")} = ${say("sum", "somme")} / n = ${fmt(sum)} / ${data.length} = ${fmt(mean)}`);
    parts.push(`${say("mean", "moyenne")} = ${fmt(mean)}`);
    value ??= mean;
  }
  if (wanted.includes("median")) {
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    steps.push(
      sorted.length % 2
        ? `${say("Median: the middle value", "Médiane : la valeur du milieu")} = ${fmt(median)}`
        : `${say("Median: halfway between the two middle values", "Médiane : la moyenne des deux valeurs du milieu")} = (${sorted[mid - 1]} + ${sorted[mid]}) / 2 = ${fmt(median)}`
    );
    parts.push(`${say("median", "médiane")} = ${fmt(median)}`);
    value ??= median;
  }
  if (wanted.includes("mode")) {
    const counts = new Map<number, number>();
    for (const x of data) counts.set(x, (counts.get(x) ?? 0) + 1);
    const top = Math.max(...counts.values());
    const modes = [...counts].filter(([, c]) => c === top).map(([x]) => x).sort((a, b) => a - b);
    const none = top === 1;
    steps.push(
      none
        ? say("Mode: every value appears once, so there is no mode", "Mode : chaque valeur apparaît une fois, il n'y a pas de mode")
        : `${say("Mode: the most frequent value", "Mode : la valeur la plus fréquente")} (${top}×) = ${modes.join(", ")}`
    );
    parts.push(`${say("mode", "mode")} = ${none ? say("none", "aucun") : modes.join(", ")}`);
    if (!none) value ??= modes[0];
  }
  if (wanted.includes("range")) {
    const range = sorted[sorted.length - 1] - sorted[0];
    steps.push(`${say("Range", "Étendue")} = ${sorted[sorted.length - 1]} - ${sorted[0]} = ${fmt(range)}`);
    parts.push(`${say("range", "étendue")} = ${fmt(range)}`);
    value ??= range;
  }

  // Independent: the deviations from the mean must sum to zero.
  const deviations = data.reduce((a, x) => a + (x - mean), 0);
  const passed = Math.abs(deviations) <= 1e-9 * (1 + Math.abs(sum));
  return solved({
    problemType: "math.averages",
    title: say("Averages", "Paramètres statistiques"),
    steps,
    answer: parts.join(", "),
    value,
    check: {
      passed,
      detail: say(
        `The data was read as ${data.length} values summing to ${fmt(sum)}; their distances from the mean add up to 0${passed ? " ✓" : " ✗"}`,
        `${data.length} valeurs lues, de somme ${fmt(sum)} ; leurs écarts à la moyenne ont une somme nulle${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "The mean shares the total equally; the median is the middle of the ordered list; the mode is the most common value; the range measures the spread.",
      "La moyenne répartit le total à parts égales ; la médiane est au milieu de la liste rangée ; le mode est la valeur la plus fréquente ; l'étendue mesure la dispersion."
    ),
  });
}

/* ------------------------------------------------------------------ *
 * Probability
 * ------------------------------------------------------------------ */

const COLOURS: Record<string, string> = {
  red: "red", rouge: "red", rouges: "red",
  blue: "blue", bleu: "blue", bleue: "blue", bleus: "blue", bleues: "blue",
  green: "green", vert: "green", verte: "green", verts: "green", vertes: "green",
  yellow: "yellow", jaune: "yellow", jaunes: "yellow",
  white: "white", blanc: "white", blanche: "white", blancs: "white", blanches: "white",
  black: "black", noir: "black", noire: "black", noirs: "black", noires: "black",
};

export function solveProbability(text: string, say: Say): SolveOutcome {
  const t = text.toLowerCase();
  if (!/probabilit/.test(t)) return UNRECOGNISED;
  const title = say("Probability", "Probabilité");
  const concept = say(
    "When every outcome is equally likely, P(event) = number of favourable outcomes / total number of outcomes. It is always between 0 and 1.",
    "Quand toutes les issues sont équiprobables, P(événement) = nombre d'issues favorables / nombre total d'issues. Elle est toujours entre 0 et 1."
  );

  // One fair die.
  // "dé" needs the accent: \b does not work after é, and the plain French
  // word "de" must not count as a die.
  if (/\b(die|dice)\b/.test(t) || /(?:^|\s)dés?(?=[\s,.?!]|$)/.test(t)) {
    const outcomes = [1, 2, 3, 4, 5, 6];
    let label: string | null = null;
    let fav: number[] = [];
    const gt = t.match(/(?:greater than|more than|plus grand que|sup[ée]rieur [àa])\s*(\d)/);
    const lt = t.match(/(?:less than|smaller than|plus petit que|inf[ée]rieur [àa])\s*(\d)/);
    const mult = t.match(/multiple (?:of|de)\s*(\d)/);
    const exact = t.match(/(?:getting|rolling|obtenir|un|a|an)\s+(\d)\b/);
    if (/\beven\b|\bpair\b/.test(t)) [label, fav] = [say("an even number", "un nombre pair"), outcomes.filter((x) => x % 2 === 0)];
    else if (/\bodd\b|\bimpair\b/.test(t)) [label, fav] = [say("an odd number", "un nombre impair"), outcomes.filter((x) => x % 2 === 1)];
    else if (/\bprime\b|\bpremier\b/.test(t)) [label, fav] = [say("a prime number", "un nombre premier"), [2, 3, 5]];
    else if (gt) [label, fav] = [say(`a number greater than ${gt[1]}`, `un nombre supérieur à ${gt[1]}`), outcomes.filter((x) => x > Number(gt[1]))];
    else if (lt) [label, fav] = [say(`a number less than ${lt[1]}`, `un nombre inférieur à ${lt[1]}`), outcomes.filter((x) => x < Number(lt[1]))];
    else if (mult) [label, fav] = [say(`a multiple of ${mult[1]}`, `un multiple de ${mult[1]}`), outcomes.filter((x) => x % Number(mult[1]) === 0)];
    else if (exact) [label, fav] = [say(`a ${exact[1]}`, `un ${exact[1]}`), outcomes.filter((x) => x === Number(exact[1]))];
    if (!label) return invalid("math.probability", say("Say which outcome: e.g. an even number, a number greater than 4, a 6.", "Précise l'issue : par ex. un nombre pair, un nombre supérieur à 4, un 6."));
    return probabilityResult(fav.length, 6, [
      `${say("Outcomes of one fair die", "Issues d'un dé équilibré")}: 1, 2, 3, 4, 5, 6 (6)`,
      `${say("Favourable", "Favorables")} (${label}): ${fav.join(", ") || say("none", "aucune")} (${fav.length})`,
    ], fav.length + outcomes.filter((x) => !fav.includes(x)).length === 6, title, concept, say);
  }

  // A bag of coloured objects: "3 red and 5 blue balls ... probability of a red".
  const counts = new Map<string, number>();
  for (const m of t.matchAll(/(\d+)\s+([a-zéè]+)(?:\s+([a-zéè]+))?/g)) {
    // "3 red balls" or, in French, "3 boules rouges".
    const colour = COLOURS[m[2]] ?? (m[3] ? COLOURS[m[3]] : undefined);
    if (colour) counts.set(colour, (counts.get(colour) ?? 0) + Number(m[1]));
  }
  if (counts.size >= 2) {
    const asked = t.slice(t.lastIndexOf("probabilit")).match(/\b([a-zéè]+)\b/g)?.map((w) => COLOURS[w]).find(Boolean);
    const not = /\bnot\b|\bpas\b|\bne\b/.test(t.slice(t.lastIndexOf("probabilit")));
    if (!asked) return invalid("math.probability", say("Say which colour the question asks about.", "Précise la couleur demandée."));
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const fav = not ? total - (counts.get(asked) ?? 0) : counts.get(asked) ?? 0;
    const listing = [...counts].map(([c, k]) => `${k} ${c}`).join(", ");
    return probabilityResult(fav, total, [
      `${say("Total", "Total")}: ${listing} → ${total}`,
      `${say("Favourable", "Favorables")} (${not ? say("not ", "pas ") : ""}${asked}): ${fav}`,
    ], [...counts.values()].reduce((a, b) => a + b, 0) === total, title, concept, say);
  }
  return UNRECOGNISED;
}

function probabilityResult(fav: number, total: number, steps: string[], counted: boolean, title: string, concept: string, say: Say): SolveOutcome {
  const p = new Fraction(fav, total);
  const passed = counted && p.value() >= 0 && p.value() <= 1;
  return solved({
    problemType: "math.probability",
    title,
    steps: [...steps, `P = ${fav}/${total} = ${p}`],
    answer: `P = ${p.pretty()}`,
    value: p.value(),
    check: {
      passed,
      detail: say(
        `Favourable and unfavourable outcomes add up to ${total}, and ${p} is between 0 and 1${passed ? " ✓" : " ✗"}`,
        `Issues favorables et défavorables totalisent ${total}, et ${p} est entre 0 et 1${passed ? " ✓" : " ✗"}`
      ),
    },
    concept,
  });
}

function fmt(x: number): string {
  return formatNumber(x, 4);
}
