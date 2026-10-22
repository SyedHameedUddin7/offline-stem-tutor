import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { chapterMaterial } from "../lib/curriculum";
import { checkAnswer, generatePractice, type Verdict } from "../lib/practice";
import { chapterRecord, recordPractice } from "../lib/practiceProgress";
import { useLang } from "../i18n/LanguageContext";
import { useLearner } from "../learner/LearnerContext";
import type { PracticeQuestion } from "../types";

const GENERATED_PER_SET = 5;

/**
 * One question at a time, with the explanation after every attempt. A set is
 * a few freshly generated numerical questions (Maths, Physics) followed by
 * the chapter's written and answer-bank questions in a shuffled order.
 */
export function PracticeView({ chapterId }: { chapterId: string }) {
  const { t, lang } = useLang();
  const { learner } = useLearner();
  const material = useLiveQuery(() => chapterMaterial(chapterId), [chapterId]);
  const record = useLiveQuery(() => (learner ? chapterRecord(learner.id, chapterId) : undefined), [learner?.id, chapterId]);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState({ correct: 0, attempted: 0 });

  const queue = useMemo<PracticeQuestion[]>(() => {
    if (!material) return [];
    const written = [...material.questions].sort(() => Math.random() - 0.5);
    return [...generatePractice(chapterId, lang, GENERATED_PER_SET), ...written];
    // `round` is a dependency on purpose: "New set" regenerates.
  }, [material, chapterId, lang, round]);

  useEffect(() => {
    setIndex(0);
    setInput("");
    setVerdict(null);
  }, [chapterId, round]);

  if (!material) return <div className="min-h-[12rem]" aria-busy="true" />;
  if (queue.length === 0) return <p className="text-sm text-muted">{t.practiceNone}</p>;

  const q = queue[index % queue.length];
  const done = verdict && verdict.kind !== "unreadable";

  function finish(correct: boolean) {
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), attempted: s.attempted + 1 }));
    if (learner) void recordPractice(learner.id, q, correct).catch((err) => console.error("Could not save practice", err));
  }

  function submit(answer: string) {
    if (done) return;
    const v = checkAnswer(q, answer);
    setVerdict(v);
    if (v.kind === "correct" || v.kind === "wrong") finish(v.kind === "correct");
  }

  function next() {
    setIndex((i) => i + 1);
    setInput("");
    setVerdict(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-muted">
        <span>
          {t.practiceScore(score.correct, score.attempted)}
          {record && record.attempts > 0 ? ` · ${t.practiceRecord(record.correct, record.attempts)}` : ""}
        </span>
        <button onClick={() => setRound((r) => r + 1)} className="underline decoration-dotted underline-offset-2 hover:text-paper">
          {t.practiceNewSet}
        </button>
      </div>

      <div className="rounded-card border border-white/10 bg-night px-3 py-3">
        <p className="mb-1 font-mono text-[0.55rem] uppercase tracking-wide text-muted">
          {index % queue.length + 1} / {queue.length} · {t.practiceSource[q.source]}
          {q.source === "generated" ? ` · ${t.practiceGenerated}` : ""}
          {lang !== q.lang ? ` · ${t.englishOnlyBadge}` : ""}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper" lang={q.lang}>{q.prompt}</p>

        {q.format === "mcq" ? (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {q.choices!.map((c) => {
              const tone = !done ? "border-white/10 hover:border-signal/50" : c === q.answer ? "border-signal bg-signal/10" : c === input ? "border-danger bg-danger/10" : "border-white/5 opacity-60";
              return (
                <button key={c} disabled={!!done} onClick={() => { setInput(c); submit(c); }} className={`rounded-card border px-3 py-2 text-left text-sm text-paper transition-colors ${tone}`}>
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!done}
              placeholder={t.practiceYourAnswer}
              aria-label={t.practiceYourAnswer}
              inputMode={q.format === "numeric" ? "decimal" : "text"}
              className="min-w-0 flex-1 rounded-card border border-white/10 bg-night-surface px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-signal/50 focus:outline-none"
            />
            {!done && <button className="rounded-card bg-signal px-3 py-2 text-xs font-semibold text-night">{t.practiceCheck}</button>}
          </form>
        )}

        {verdict?.kind === "unreadable" && <p className="mt-2 text-xs text-solar">{t.practiceUnreadable}</p>}

        {done && (
          <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
            {verdict.kind === "correct" && <p className="font-display text-sm font-semibold text-signal">{t.practiceCorrect}</p>}
            {verdict.kind === "wrong" && <p className="font-display text-sm font-semibold text-danger">{t.practiceWrong(displayAnswer(q))}</p>}
            {verdict.kind === "self-mark" && (
              <>
                <p className="text-xs text-paper/80">{t.practiceSelfMark}</p>
                <p className="font-display text-sm font-semibold text-paper">{q.answer}</p>
              </>
            )}
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-paper/70" lang={q.lang}>
              <span className="text-muted">{t.practiceWhy}: </span>{q.explanation}
            </p>
            <div className="flex flex-wrap gap-2">
              {verdict.kind === "self-mark" ? (
                <>
                  <button onClick={() => { finish(true); next(); }} className="rounded-card bg-signal px-3 py-1.5 text-xs font-semibold text-night">{t.practiceGotIt}</button>
                  <button onClick={() => { finish(false); next(); }} className="rounded-card border border-white/15 px-3 py-1.5 text-xs text-paper">{t.practiceMissed}</button>
                </>
              ) : (
                <button onClick={next} className="rounded-card bg-signal px-3 py-1.5 text-xs font-semibold text-night">{t.practiceNext}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function displayAnswer(q: PracticeQuestion): string {
  if (q.format !== "numeric") return q.answer;
  const n = Number(q.answer);
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}
