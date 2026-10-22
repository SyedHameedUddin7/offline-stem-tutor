import { DATASET_VERSION, EVAL_CASES, type EvalCase } from "./dataset";
import { solveNumberSeries } from "../lib/solvers/numberSeries";
import { verifyAnswer } from "../lib/verify";
import { solveMaths } from "../lib/solvers/maths";
import { solvePhysics } from "../lib/solvers/physics/engine";
import { searchSubject, strongMatch } from "../lib/curriculum";
import { resolveChapter } from "../data/subjects";

/**
 * The evaluation runner.
 *
 * Every metric below is COMPUTED from running the cases. Nothing here is a
 * literal. That is the point: the README quotes these numbers, and a number
 * in a README that nobody can reproduce is a claim, not a measurement.
 *
 * Retrieval cases need embeddings, so the caller supplies a grounding
 * function. Passing none skips those cases and reports them as skipped
 * rather than silently counting them as passes — which lets the suite run
 * in CI with no model download while staying honest about what it covered.
 */

export interface CaseResult {
  id: string;
  domain: EvalCase["domain"];
  behaviour: EvalCase["behaviour"];
  outcome: "pass" | "fail" | "skipped";
  detail: string;
}

export interface EvalMetrics {
  datasetVersion: string;
  total: number;
  evaluated: number;
  skipped: number;
  passed: number;
  failed: number;
  /** Share of evaluated cases that behaved as specified. */
  overallAccuracy: number;
  byDomain: Record<string, { evaluated: number; passed: number; accuracy: number }>;
  /** Solver produced exactly the expected value. */
  solverAgreement: number;
  /** Out-of-scope questions correctly refused. */
  refusalAccuracy: number;
  /** Contradictory answers correctly detected. */
  contradictionDetection: number;
  /** Unit errors correctly detected. */
  unitCorrectness: number;
  /** How many evaluated cases each headline metric above rests on. Printed
   *  beside it, because "100%" of 4 cases and of 40 are different claims —
   *  and the refusal rate, offline, covers only the solver's refusals. */
  counts: Record<
    "solver" | "refusal" | "contradiction" | "units" | "maths" | "physics" | "declines" | "lessons",
    { passed: number; evaluated: number }
  >;
  failures: CaseResult[];
}

export type GroundingProbe = (
  chapterId: string,
  question: string
) => Promise<{ grounded: boolean }>;

function ratio(passed: number, total: number): number {
  return total === 0 ? 0 : passed / total;
}

async function runCase(c: EvalCase, probe?: GroundingProbe): Promise<CaseResult> {
  const base = { id: c.id, domain: c.domain, behaviour: c.behaviour };

  switch (c.behaviour) {
    case "solve": {
      if (c.domain === "math-solver" || c.domain === "physics-solver") {
        const o = c.domain === "math-solver" ? solveMaths(c.question, c.lang ?? "en") : solvePhysics(c.question, c.lang ?? "en", c.chapterId);
        if (o.kind !== "solved") return { ...base, outcome: "fail", detail: o.kind === "invalid" ? `declined: ${o.reason}` : "not recognised" };
        if (!o.result.check.passed) return { ...base, outcome: "fail", detail: `own check failed: ${o.result.check.detail}` };
        const got = o.result.value ?? Number.NaN;
        return Math.abs(got - c.expected!) <= 1e-6 * Math.max(1, Math.abs(c.expected!))
          ? { ...base, outcome: "pass", detail: o.result.answer }
          : { ...base, outcome: "fail", detail: `got ${got}, expected ${c.expected}` };
      }
      const solved = solveNumberSeries(c.question);
      if (!solved) return { ...base, outcome: "fail", detail: "solver returned no answer" };
      return solved.next === c.expected
        ? { ...base, outcome: "pass", detail: `${solved.next} via ${solved.pattern}` }
        : { ...base, outcome: "fail", detail: `got ${solved.next}, expected ${c.expected}` };
    }

    case "refuse": {
      // Two distinct refusals: the solver declining a non-series, and
      // retrieval declining an out-of-domain question. Which one applies
      // depends on the case.
      if (c.domain === "number-series") {
        const solved = solveNumberSeries(c.question);
        return solved === null
          ? { ...base, outcome: "pass", detail: "solver correctly declined" }
          : { ...base, outcome: "fail", detail: `guessed ${solved.next} (${solved.pattern})` };
      }
      if (!probe) return { ...base, outcome: "skipped", detail: "needs embeddings" };
      const { grounded } = await probe(c.chapterId ?? "ma-number-series", c.question);
      return grounded
        ? { ...base, outcome: "fail", detail: "wrongly grounded an out-of-domain question" }
        : { ...base, outcome: "pass", detail: "correctly refused" };
    }

    case "ground": {
      if (!probe) return { ...base, outcome: "skipped", detail: "needs embeddings" };
      const { grounded } = await probe(c.chapterId!, c.question);
      return grounded
        ? { ...base, outcome: "pass", detail: "grounded" }
        : { ...base, outcome: "fail", detail: "failed to ground a supported question" };
    }

    case "decline": {
      const subject = resolveChapter(c.chapterId ?? "")?.subject.id;
      const o = subject === "physics" ? solvePhysics(c.question, "en", c.chapterId) : solveMaths(c.question, "en");
      return o.kind === "solved"
        ? { ...base, outcome: "fail", detail: `answered anyway: ${o.result.answer}` }
        : { ...base, outcome: "pass", detail: o.kind === "invalid" ? `asked for: ${o.reason.slice(0, 60)}` : "left unclaimed" };
    }

    case "lesson":
    case "no-lesson": {
      const subject = resolveChapter(c.chapterId ?? "")?.subject.id;
      if (!subject) return { ...base, outcome: "fail", detail: "unknown chapter" };
      const match = strongMatch(await searchSubject(subject, c.question, 5), c.question);
      if (c.behaviour === "no-lesson") {
        return match ? { ...base, outcome: "fail", detail: `presented "${match.doc.title}" as an answer` } : { ...base, outcome: "pass", detail: "no lesson claimed" };
      }
      return match && match.doc.title === c.expectedTitle
        ? { ...base, outcome: "pass", detail: match.doc.title }
        : { ...base, outcome: "fail", detail: match ? `chose "${match.doc.title}"` : "no lesson matched" };
    }

    case "verify-pass":
    case "verify-fail": {
      const report = verifyAnswer(c.chapterId!, c.question, c.answer!);
      const shouldFail = c.behaviour === "verify-fail";
      const didFail = report.issues.length > 0;
      if (shouldFail === didFail) {
        return { ...base, outcome: "pass", detail: didFail ? report.notes.join("; ") : "no issues" };
      }
      return {
        ...base,
        outcome: "fail",
        detail: shouldFail
          ? `missed the error (${report.unverifiable ? "unverifiable" : "reported clean"})`
          : `false positive: ${report.notes.join("; ")}`,
      };
    }
  }
}

export async function runEvaluation(probe?: GroundingProbe): Promise<EvalMetrics> {
  const results: CaseResult[] = [];
  for (const c of EVAL_CASES) results.push(await runCase(c, probe));

  const evaluated = results.filter((r) => r.outcome !== "skipped");
  const passed = evaluated.filter((r) => r.outcome === "pass");

  const byDomain: EvalMetrics["byDomain"] = {};
  for (const r of evaluated) {
    const d = (byDomain[r.domain] ??= { evaluated: 0, passed: 0, accuracy: 0 });
    d.evaluated++;
    if (r.outcome === "pass") d.passed++;
  }
  for (const d of Object.values(byDomain)) d.accuracy = ratio(d.passed, d.evaluated);

  const count = (pred: (r: CaseResult) => boolean) => {
    const rows = evaluated.filter(pred);
    return { passed: rows.filter((r) => r.outcome === "pass").length, evaluated: rows.length };
  };
  const counts: EvalMetrics["counts"] = {
    solver: count((r) => r.behaviour === "solve" && r.domain === "number-series"),
    maths: count((r) => r.domain === "math-solver"),
    physics: count((r) => r.domain === "physics-solver"),
    declines: count((r) => r.behaviour === "decline"),
    lessons: count((r) => r.behaviour === "lesson" || r.behaviour === "no-lesson"),
    refusal: count((r) => r.behaviour === "refuse"),
    contradiction: count((r) => r.domain === "arithmetic-check" || r.domain === "substitution-check"),
    units: count((r) => r.domain === "dimension-check"),
  };
  const share = (c: { passed: number; evaluated: number }) => ratio(c.passed, c.evaluated);

  return {
    datasetVersion: DATASET_VERSION,
    total: EVAL_CASES.length,
    evaluated: evaluated.length,
    skipped: results.length - evaluated.length,
    passed: passed.length,
    failed: evaluated.length - passed.length,
    overallAccuracy: ratio(passed.length, evaluated.length),
    byDomain,
    solverAgreement: share(counts.solver),
    refusalAccuracy: share(counts.refusal),
    contradictionDetection: share(counts.contradiction),
    unitCorrectness: share(counts.units),
    counts,
    failures: evaluated.filter((r) => r.outcome !== "pass"),
  };
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
/** A metric with no evaluated cases is "n/a", never a misleading 0.0%. */
const metric = (c: { passed: number; evaluated: number }) =>
  c.evaluated === 0 ? "n/a" : `${pct(c.passed / c.evaluated)}  (${c.passed}/${c.evaluated})`;

export function formatReport(m: EvalMetrics): string {
  const lines = [
    `Evaluation ${m.datasetVersion}`,
    `Cases: ${m.total}   evaluated: ${m.evaluated}   skipped: ${m.skipped}`,
    "",
    `Overall verified accuracy ...... ${pct(m.overallAccuracy)}  (${m.passed}/${m.evaluated})`,
    `Solver agreement ............... ${metric(m.counts.solver)}`,
    `Correct refusal rate ........... ${metric(m.counts.refusal)}`,
    `Contradiction detection ........ ${metric(m.counts.contradiction)}`,
    `Unit correctness ............... ${metric(m.counts.units)}`,
    `Maths solver (hand-worked) ..... ${metric(m.counts.maths)}`,
    `Physics solver (hand-worked) ... ${metric(m.counts.physics)}`,
    `Declines bad/conceptual input .. ${metric(m.counts.declines)}`,
    `Lesson matching policy ......... ${metric(m.counts.lessons)}`,
    "",
    "By domain:",
  ];
  for (const [domain, d] of Object.entries(m.byDomain).sort()) {
    lines.push(`  ${domain.padEnd(20)} ${pct(d.accuracy).padStart(6)}  (${d.passed}/${d.evaluated})`);
  }
  if (m.skipped > 0) {
    lines.push("", `${m.skipped} case(s) skipped — retrieval cases need the embedding model.`);
  }
  if (m.failures.length > 0) {
    lines.push("", "Failures:");
    for (const f of m.failures) lines.push(`  ${f.id}  ${f.detail}`);
  }
  return lines.join("\n");
}
