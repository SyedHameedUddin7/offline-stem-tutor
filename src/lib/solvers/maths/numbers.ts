import { Fraction, formatNumber, gcd, lcm } from "../../math/fraction";
import { UNRECOGNISED, invalid, numbersIn, solved, type Say, type SolveOutcome } from "../types";

/**
 * Number work: HCF and LCM, prime factorisation, percentages, interest and
 * sharing in a ratio.
 */

/* ------------------------------------------------------------------ *
 * Prime factorisation, HCF, LCM
 * ------------------------------------------------------------------ */

export function primeFactors(n: number): Map<number, number> {
  const out = new Map<number, number>();
  let rest = n;
  for (let p = 2; p * p <= rest; p++) {
    while (rest % p === 0) {
      out.set(p, (out.get(p) ?? 0) + 1);
      rest /= p;
    }
  }
  if (rest > 1) out.set(rest, (out.get(rest) ?? 0) + 1);
  return out;
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => (n === 1 ? "" : String(n).split("").map((d) => SUP[Number(d)]).join(""));
export const formatFactors = (f: Map<number, number>) =>
  [...f.entries()].sort(([a], [b]) => a - b).map(([p, e]) => `${p}${sup(e)}`).join(" × ") || "1";

function isPrime(p: number): boolean {
  if (p < 2) return false;
  for (let d = 2; d * d <= p; d++) if (p % d === 0) return false;
  return true;
}

const PRIME = /prime factori[sz]ation|prime factors?|d[ée]compos\w* en (?:produit de )?facteurs premiers|facteurs premiers/i;
const FACTORISE_NUMBER = /\bfactori[sz]e\s+(\d+)\s*$/i;

export function solvePrimeFactors(text: string, say: Say): SolveOutcome {
  const plain = text.replace(/[?.!]/g, "").trim();
  if (!PRIME.test(text) && !FACTORISE_NUMBER.test(plain)) return UNRECOGNISED;
  const nums = numbersIn(text).filter((n) => Number.isInteger(n));
  if (nums.length !== 1) return UNRECOGNISED;
  const n = nums[0];
  if (n < 2 || n > 1e12) {
    return invalid("math.prime-factorisation", say("Give a whole number from 2 up to 10¹².", "Donne un nombre entier entre 2 et 10¹²."));
  }

  const steps: string[] = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p++) {
    while (rest % p === 0) {
      steps.push(`${rest} ÷ ${p} = ${rest / p}`);
      rest /= p;
    }
  }
  if (rest > 1 && rest !== n) steps.push(say(`${rest} is prime`, `${rest} est premier`));
  const factors = primeFactors(n);
  const product = [...factors].reduce((acc, [p, e]) => acc * p ** e, 1);
  const passed = product === n && [...factors.keys()].every(isPrime);
  return solved({
    problemType: "math.prime-factorisation",
    title: say("Prime factorisation", "Décomposition en facteurs premiers"),
    steps: rest === n ? [say(`${n} has no divisor other than 1 and itself`, `${n} n'a pas d'autre diviseur que 1 et lui-même`)] : steps,
    answer: factors.size === 1 && [...factors.values()][0] === 1 ? say(`${n} is prime`, `${n} est premier`) : `${n} = ${formatFactors(factors)}`,
    value: n,
    check: {
      passed,
      detail: say(
        `Multiplying the factors back gives ${product}, and each factor is prime${passed ? " ✓" : " ✗"}`,
        `Le produit des facteurs redonne ${product}, et chaque facteur est premier${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "Every whole number above 1 is a product of primes in exactly one way. Divide by the smallest prime that goes in, and repeat until you reach 1.",
      "Tout entier supérieur à 1 s'écrit de façon unique comme produit de nombres premiers. On divise par le plus petit nombre premier possible, et on recommence jusqu'à 1."
    ),
  });
}

const HCF = /\b(hcf|gcd|gcf|highest common factor|greatest common (?:factor|divisor)|pgcd|plus grand commun diviseur)\b/i;
const LCM = /\b(lcm|lowest common multiple|least common multiple|ppcm|plus petit commun multiple)\b/i;

export function solveHcfLcm(text: string, say: Say): SolveOutcome {
  const wantH = HCF.test(text);
  const wantL = LCM.test(text);
  if (!wantH && !wantL) return UNRECOGNISED;
  const nums = numbersIn(text);
  if (nums.length < 2 || nums.length > 5 || nums.some((n) => !Number.isInteger(n) || n < 1 || n > 1e9)) {
    return invalid("math.hcf-lcm", say("Give two to five whole numbers, each at least 1.", "Donne de deux à cinq nombres entiers, chacun au moins égal à 1."));
  }

  const facts = nums.map(primeFactors);
  const primes = [...new Set(facts.flatMap((f) => [...f.keys()]))].sort((a, b) => a - b);
  const hcfF = new Map<number, number>();
  const lcmF = new Map<number, number>();
  for (const p of primes) {
    const powers = facts.map((f) => f.get(p) ?? 0);
    if (Math.min(...powers) > 0) hcfF.set(p, Math.min(...powers));
    lcmF.set(p, Math.max(...powers));
  }
  const H = nums.reduce(gcd);
  const L = nums.reduce(lcm);

  const steps = nums.map((n, i) => `${n} = ${formatFactors(facts[i])}`);
  if (wantH) steps.push(`${say("HCF: common primes, lowest powers", "PGCD : facteurs communs, plus petits exposants")} = ${formatFactors(hcfF)} = ${H}`);
  if (wantL) steps.push(`${say("LCM: every prime, highest powers", "PPCM : tous les facteurs, plus grands exposants")} = ${formatFactors(lcmF)} = ${L}`);

  // Independent of the factorisations: Euclid's gcd, divisibility, and for
  // two numbers HCF × LCM = a × b.
  const passed =
    nums.every((n) => n % H === 0 && L % n === 0) && (nums.length !== 2 || H * L === nums[0] * nums[1]);
  const answer = [wantH && `${say("HCF", "PGCD")} = ${H}`, wantL && `${say("LCM", "PPCM")} = ${L}`].filter(Boolean).join(", ");
  return solved({
    problemType: "math.hcf-lcm",
    title: say("HCF and LCM", "PGCD et PPCM"),
    steps,
    answer,
    value: wantH ? H : L,
    check: {
      passed,
      detail: say(
        `${H} divides every number and every number divides ${L}${nums.length === 2 ? `; ${H} × ${L} = ${H * L} = ${nums[0]} × ${nums[1]}` : ""}${passed ? " ✓" : " ✗"}`,
        `${H} divise chaque nombre et chaque nombre divise ${L}${nums.length === 2 ? ` ; ${H} × ${L} = ${H * L} = ${nums[0]} × ${nums[1]}` : ""}${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "The HCF is the largest number that divides all of them; the LCM is the smallest number all of them divide. From prime factorisations: HCF takes common primes at their lowest power, LCM takes every prime at its highest.",
      "Le PGCD est le plus grand nombre qui les divise tous ; le PPCM est le plus petit nombre divisible par tous. Avec les décompositions : le PGCD prend les facteurs communs au plus petit exposant, le PPCM tous les facteurs au plus grand."
    ),
  });
}

/* ------------------------------------------------------------------ *
 * Percentages
 * ------------------------------------------------------------------ */

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const n = (s: string) => Number(s.replace(",", "."));

export function solvePercent(text: string, say: Say): SolveOutcome {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const title = say("Percentages", "Pourcentages");
  const concept = say(
    "Per cent means 'out of 100': x% is x/100. To find x% of an amount, multiply by x/100; to express a as a percentage of b, compute a/b × 100.",
    "Pour cent signifie « sur 100 » : x % vaut x/100. Pour prendre x % d'une quantité, on multiplie par x/100 ; pour exprimer a en pourcentage de b, on calcule a/b × 100."
  );

  // Increase or decrease an amount BY a percentage: "increase 200 by 15%".
  let m = t.match(new RegExp(`(increase|decrease|reduce|augmente\\w*|diminue\\w*|r[ée]dui\\w*)\\s+${NUM}\\s+(?:by|de)\\s+${NUM}\\s*%`));
  if (m) {
    const up = /increase|augment/.test(m[1]);
    const base = n(m[2]);
    const p = n(m[3]);
    const factor = up ? 1 + p / 100 : 1 - p / 100;
    const out = base * factor;
    const change = (base * p) / 100;
    const passed = close(up ? out - base : base - out, change);
    return solved({
      problemType: "math.percent-change-by",
      title,
      steps: [
        `${p}% ${say("of", "de")} ${base} = ${p}/100 × ${base} = ${fmt(change)}`,
        `${base} ${up ? "+" : "-"} ${fmt(change)} = ${fmt(out)}`,
      ],
      answer: fmt(out),
      value: out,
      check: { passed, detail: `${fmt(base)} × ${fmt(factor)} = ${fmt(out)}${passed ? " ✓" : " ✗"}` },
      concept,
    });
  }

  // Change FROM a TO b: "percentage increase from 50 to 65".
  m = t.match(new RegExp(`(?:from|de)\\s+${NUM}\\s+(?:to|à|a)\\s+${NUM}`));
  if (m && /percent|%|pourcentage|increase|decrease|change|rise|fall|augmentation|diminution|baisse|hausse/.test(t)) {
    const a = n(m[1]);
    const b = n(m[2]);
    if (a === 0) return invalid("math.percent-change", say("A change from 0 has no percentage.", "Une variation à partir de 0 n'a pas de pourcentage."));
    const pct = ((b - a) / a) * 100;
    const passed = close(a * (1 + pct / 100), b);
    const word = pct >= 0 ? say("increase", "augmentation") : say("decrease", "diminution");
    return solved({
      problemType: "math.percent-change",
      title,
      steps: [
        `${say("Change", "Variation")} = ${b} - ${a} = ${fmt(b - a)}`,
        `${say("Percentage change", "Variation en pourcentage")} = ${fmt(b - a)} / ${a} × 100 = ${fmt(pct)}%`,
      ],
      answer: `${fmt(Math.abs(pct))}% ${word}`,
      value: pct,
      check: { passed, detail: `${a} × (1 ${pct >= 0 ? "+" : "-"} ${fmt(Math.abs(pct))}/100) = ${fmt(b)}${passed ? " ✓" : " ✗"}` },
      concept,
    });
  }

  // "x% of y".
  m = t.match(new RegExp(`${NUM}\\s*%\\s*(?:of|de|d')\\s*${NUM}`));
  if (m) {
    const p = n(m[1]);
    const base = n(m[2]);
    const out = (p / 100) * base;
    const passed = base === 0 || close((out / base) * 100, p);
    return solved({
      problemType: "math.percent-of",
      title,
      steps: [`${p}% ${say("of", "de")} ${base} = ${p}/100 × ${base} = ${fmt(out)}`],
      answer: fmt(out),
      value: out,
      check: { passed, detail: `${fmt(out)} / ${base} × 100 = ${p}%${passed ? " ✓" : " ✗"}` },
      concept,
    });
  }

  // a as a percentage of b: "what percent of 80 is 20", "20 as a percentage of 80", "20 out of 80".
  m =
    t.match(new RegExp(`what (?:percent|percentage) of ${NUM} is ${NUM}`)) ??
    t.match(new RegExp(`${NUM} (?:as a percentage of|as a percent of|out of|en pourcentage de|sur) ${NUM}`));
  if (m) {
    const swapped = /what (?:percent|percentage) of/.test(t);
    const a = n(swapped ? m[2] : m[1]);
    const b = n(swapped ? m[1] : m[2]);
    if (b === 0) return invalid("math.percent-of-total", say("A percentage of 0 is undefined.", "Un pourcentage de 0 n'est pas défini."));
    if (!swapped && /out of|sur/.test(m[0]) && !/percent|%|pourcentage/.test(t)) return UNRECOGNISED;
    const pct = (a / b) * 100;
    const passed = close((pct / 100) * b, a);
    return solved({
      problemType: "math.percent-of-total",
      title,
      steps: [`${a} / ${b} × 100 = ${fmt(pct)}%`],
      answer: `${fmt(pct)}%`,
      value: pct,
      check: { passed, detail: `${fmt(pct)}% ${say("of", "de")} ${b} = ${fmt((pct / 100) * b)}${passed ? " ✓" : " ✗"}` },
      concept,
    });
  }
  return UNRECOGNISED;
}

/* ------------------------------------------------------------------ *
 * Simple and compound interest
 * ------------------------------------------------------------------ */

export function solveInterest(text: string, say: Say): SolveOutcome {
  const t = text.toLowerCase();
  const simple = /simple interest|int[ée]r[êe]ts? simples?/.test(t);
  const compound = /compound interest|int[ée]r[êe]ts? compos[ée]s?|compounded/.test(t);
  if (!simple && !compound) return UNRECOGNISED;

  const rateM = t.match(new RegExp(`${NUM}\\s*%`));
  const timeM = t.match(new RegExp(`${NUM}\\s*(?:years?|yrs?|ans?|ann[ée]es?)`));
  if (!rateM || !timeM) {
    return invalid("math.interest", say("Give the principal, the rate (with %) and the time in years.", "Donne le capital, le taux (avec %) et la durée en années."));
  }
  const R = n(rateM[1]);
  const T = n(timeM[1]);
  const others = numbersIn(t.replace(rateM[0], " ").replace(timeM[0], " "));
  if (others.length !== 1) {
    return invalid("math.interest", say("Give exactly one principal amount.", "Donne un seul capital de départ."));
  }
  const P = others[0];
  if (P <= 0 || R < 0 || T <= 0) return invalid("math.interest", say("Principal and time must be positive.", "Le capital et la durée doivent être positifs."));

  if (simple) {
    const I = (P * R * T) / 100;
    const passed = close(I / T, (P * R) / 100);
    return solved({
      problemType: "math.simple-interest",
      title: say("Simple interest", "Intérêts simples"),
      steps: [
        `P = ${P}, R = ${R}%, T = ${T}`,
        `${say("Interest", "Intérêts")} = P × R × T / 100 = ${P} × ${R} × ${T} / 100 = ${fmt(I)}`,
        `${say("Amount", "Montant")} = P + I = ${P} + ${fmt(I)} = ${fmt(P + I)}`,
      ],
      answer: `${say("Interest", "Intérêts")} = ${fmt(I)}, ${say("amount", "montant")} = ${fmt(P + I)}`,
      value: I,
      check: { passed, detail: say(`One year's interest is ${R}% of ${P} = ${fmt((P * R) / 100)}; × ${T} years = ${fmt(I)}`, `Un an d'intérêts = ${R} % de ${P} = ${fmt((P * R) / 100)} ; × ${T} ans = ${fmt(I)}`) + (passed ? " ✓" : " ✗") },
      concept: say(
        "Simple interest is paid on the original amount only, so it is the same every year: I = P × R × T / 100.",
        "Les intérêts simples portent seulement sur le capital de départ, donc ils sont les mêmes chaque année : I = C × t × n / 100."
      ),
    });
  }

  if (!Number.isInteger(T)) return invalid("math.compound-interest", say("Compound interest here needs a whole number of years.", "Les intérêts composés demandent ici un nombre entier d'années."));
  const half = /half[- ]?year|semi[- ]?annual|semestri/.test(t);
  const periods = half ? T * 2 : T;
  const r = half ? R / 2 : R;
  const A = P * (1 + r / 100) ** periods;
  // Independent route: grow the balance one period at a time.
  let balance = P;
  const rows: string[] = [];
  for (let k = 1; k <= periods; k++) {
    balance += (balance * r) / 100;
    if (periods <= 6) rows.push(`${say(half ? "Half-year" : "Year", half ? "Semestre" : "Année")} ${k}: ${fmt(balance)}`);
  }
  const passed = close(balance, A);
  return solved({
    problemType: "math.compound-interest",
    title: say("Compound interest", "Intérêts composés"),
    steps: [
      `P = ${P}, R = ${R}%${half ? say(" a year, compounded half-yearly", " par an, composés par semestre") : say(", compounded yearly", ", composés chaque année")}, T = ${T}`,
      `A = P(1 + R/100)^n = ${P} × (1 + ${r}/100)^${periods} = ${fmt(A, 2)}`,
      `${say("Interest", "Intérêts")} = A - P = ${fmt(A - P, 2)}`,
    ],
    answer: `${say("Amount", "Montant")} = ${fmt(A, 2)}, ${say("interest", "intérêts")} = ${fmt(A - P, 2)}`,
    value: A - P,
    check: { passed, detail: `${say("Period by period", "Période par période")}: ${rows.join("; ")}${passed ? " ✓" : " ✗"}` },
    concept: say(
      "Compound interest is paid on the growing balance, so each period's interest is larger than the last: A = P(1 + R/100)ⁿ.",
      "Les intérêts composés portent sur le capital augmenté des intérêts précédents : A = C(1 + t/100)ⁿ."
    ),
  });
}

/* ------------------------------------------------------------------ *
 * Sharing in a ratio
 * ------------------------------------------------------------------ */

export function solveRatioShare(text: string, say: Say): SolveOutcome {
  const t = text.toLowerCase();
  if (!/\b(share|divide|split|partag\w*|r[ée]parti\w*|divise\w*)\b/.test(t)) return UNRECOGNISED;
  const ratioM = t.match(/(\d+(?:\s*:\s*\d+)+)/);
  if (!ratioM || !/ratio|rapport|proportion/.test(t)) return UNRECOGNISED;
  const parts = ratioM[1].split(":").map((p) => Number(p.trim()));
  const amountM = numbersIn(t.replace(ratioM[1], " "));
  if (amountM.length !== 1) return invalid("math.ratio-share", say("Give one amount to share and a ratio such as 3:4.", "Donne une quantité à partager et un rapport comme 3:4."));
  const total = amountM[0];
  if (parts.some((p) => p <= 0)) return invalid("math.ratio-share", say("Every part of the ratio must be positive.", "Chaque terme du rapport doit être positif."));

  const sum = parts.reduce((a, b) => a + b, 0);
  const one = new Fraction(1).mul(Fraction.of(total)).div(new Fraction(sum));
  const shares = parts.map((p) => one.mul(new Fraction(p)));
  const back = shares.reduce((a, b) => a.add(b), new Fraction(0));
  const passed = back.equals(Fraction.of(total)) && shares.every((s, i) => s.mul(new Fraction(parts[0])).equals(shares[0].mul(new Fraction(parts[i]))));
  return solved({
    problemType: "math.ratio-share",
    title: say("Sharing in a ratio", "Partage proportionnel"),
    steps: [
      `${say("Total parts", "Nombre total de parts")} = ${parts.join(" + ")} = ${sum}`,
      `${say("One part", "Une part")} = ${total} / ${sum} = ${one.pretty()}`,
      ...parts.map((p, i) => `${p} × ${fmtF(one)} = ${fmtF(shares[i])}`),
    ],
    answer: shares.map(fmtF).join(" : "),
    value: shares[0].value(),
    check: {
      passed,
      detail: say(
        `The shares add up to ${fmtF(back)} and are in the ratio ${parts.join(":")}${passed ? " ✓" : " ✗"}`,
        `Les parts ont pour somme ${fmtF(back)} et sont dans le rapport ${parts.join(":")}${passed ? " ✓" : " ✗"}`
      ),
    },
    concept: say(
      "Add the ratio's numbers to get the total number of parts, find the size of one part, then multiply by each number in the ratio.",
      "On additionne les termes du rapport pour obtenir le nombre de parts, on calcule une part, puis on la multiplie par chaque terme."
    ),
  });
}

function fmtF(f: Fraction): string {
  return f.isInteger() ? String(f.n) : formatNumber(f.value(), 2);
}

function fmt(x: number, digits = 4): string {
  return formatNumber(x, digits);
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * (1 + Math.abs(a) + Math.abs(b));
}
