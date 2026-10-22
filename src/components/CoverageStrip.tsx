import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { chapterCoverage, type Coverage } from "../lib/curriculum";
import { getLlmStatus, onLlmStatus, type LlmStatus } from "../lib/llm";
import { useLang } from "../i18n/LanguageContext";
import { localizedSubjects } from "../data/subjects";
import type { SubjectId } from "../types";

/**
 * What this chapter offers on THIS device, right now — counted, not claimed.
 * The AI line says "not installed" when it is not, and says the rest works
 * without it, because that is the case for most phones in a pod.
 */
export function CoverageStrip({ subjectId, chapterId }: { subjectId: SubjectId; chapterId: string }) {
  const { t, lang } = useLang();
  const coverage = useLiveQuery(() => chapterCoverage(chapterId), [chapterId]);
  const [llm, setLlm] = useState<LlmStatus>(getLlmStatus());
  const [open, setOpen] = useState(false);
  useEffect(() => onLlmStatus(setLlm), []);

  if (!coverage) return <div className="h-9" aria-busy="true" />;
  const items = summarise(coverage, t);
  const ai = llm.state === "ready" ? t.covAiReady : llm.state === "unsupported" ? t.covAiUnsupported : t.covAiMissing;

  return (
    <div className="rounded-card border border-white/5 bg-night-surface/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-paper/70">
        <span className="mono-label">{t.coverageTitle}</span>
        {items.length ? items.map((x) => <span key={x}>{x}</span>) : <span className="text-solar">{t.covNeedsContent}</span>}
        <span className={llm.state === "ready" ? "text-signal" : "text-muted"}>{ai}</span>
        <button onClick={() => setOpen((o) => !o)} className="ml-auto text-muted underline decoration-dotted underline-offset-2 hover:text-paper" aria-expanded={open}>
          {t.coverageSubject}
        </button>
      </div>
      {coverage.solverTypes.length > 0 && (
        <p className="mt-1 text-[0.7rem] text-paper/50">
          {coverage.solverTypes.map((s) => (lang === "fr" ? s[1] : s[0])).join(" · ")}
        </p>
      )}
      {lang === "fr" && coverage.french === 0 && <p className="mt-1 text-[0.7rem] text-solar">{t.covEnglishOnly}</p>}
      {open && <SubjectOverview subjectId={subjectId} />}
    </div>
  );
}

function summarise(c: Coverage, t: ReturnType<typeof useLang>["t"]): string[] {
  return [
    c.lessons && t.covLessons(c.lessons),
    c.flashcards && t.covFlashcards(c.flashcards),
    c.questions && t.covQuestions(c.questions),
    c.generated && t.covGenerated,
    c.solverTypes.length && t.covSolver(c.solverTypes.length),
    c.teacherAnswers && t.covTeacher(c.teacherAnswers),
  ].filter(Boolean) as string[];
}

/** Every chapter of the subject, side by side, so gaps are visible. */
function SubjectOverview({ subjectId }: { subjectId: SubjectId }) {
  const { t, lang } = useLang();
  const subject = localizedSubjects(lang).find((s) => s.id === subjectId)!;
  const rows = useLiveQuery(
    () => Promise.all(subject.chapters.map(async (c) => [c, await chapterCoverage(c.id)] as const)),
    [subjectId, lang]
  );
  if (!rows) return null;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-[0.7rem] text-paper/75">
        <thead className="text-muted">
          <tr>
            <th className="py-1 pr-2 font-normal">{t.coverageChapter}</th>
            <th className="px-1 font-normal">{t.lessonsHeading}</th>
            <th className="px-1 font-normal">{t.flashcardsHeading}</th>
            <th className="px-1 font-normal">{t.practiceHeading}</th>
            <th className="px-1 font-normal">{t.tabSolve}</th>
            <th className="px-1 font-normal">{t.teacherAnswersHeading}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([c, cov]) => (
            <tr key={c.id} className="border-t border-white/5">
              <td className="py-1 pr-2 text-paper">{c.name}</td>
              <td className="px-1">{cov.lessons}</td>
              <td className="px-1">{cov.flashcards}</td>
              <td className="px-1">{cov.questions}{cov.generated ? " + ∞" : ""}</td>
              <td className="px-1">{cov.solverTypes.length || "—"}</td>
              <td className="px-1">{cov.teacherAnswers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
