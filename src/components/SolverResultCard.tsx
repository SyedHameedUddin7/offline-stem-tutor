import type { SolveOutcome } from "../lib/solvers/types";
import { useLang } from "../i18n/LanguageContext";

/** A solver's worked answer: steps, the answer, the independent check, the idea behind it. */
export function SolverResultCard({ outcome }: { outcome: SolveOutcome }) {
  const { t } = useLang();
  if (outcome.kind === "unrecognised") {
    return <p className="rounded-card border border-white/10 bg-night px-3 py-2 text-xs text-paper/70">{t.solveNotRecognised}</p>;
  }
  if (outcome.kind === "invalid") {
    return <p className="whitespace-pre-wrap rounded-card border border-solar/30 bg-solar/5 px-3 py-2 text-xs text-paper/80">{outcome.reason}</p>;
  }
  const r = outcome.result;
  return (
    <div className="rounded-card border border-signal/25 bg-night px-3 py-2.5 text-sm text-paper">
      <p className="font-display font-semibold text-signal">{r.title}</p>
      <ol className="mt-2 space-y-1 text-[0.8rem] leading-relaxed text-paper/85">
        {r.steps.map((s, i) => (
          <li key={i} className="whitespace-pre-wrap">{/^\d+\./.test(s) ? s : `${i + 1}. ${s}`}</li>
        ))}
      </ol>
      <p className="mt-2 font-display text-base font-semibold">
        {t.tutorAnswer}: {r.answer}
      </p>
      <p className={`mt-1 text-xs ${r.check.passed ? "text-signal" : "text-danger"}`}>
        {t.tutorCheckLabel}: {r.check.detail}
      </p>
      <p className="mt-2 border-t border-white/5 pt-2 text-xs leading-relaxed text-paper/60">
        {t.tutorIdea}: {r.concept}
      </p>
    </div>
  );
}
