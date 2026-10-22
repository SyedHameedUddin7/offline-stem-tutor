import { lazy, Suspense, useState } from "react";
import { ChatPane } from "./ChatPane";
import { ModelLoader } from "./ModelLoader";
import { CoverageStrip } from "./CoverageStrip";
import { ErrorBoundary } from "./ErrorBoundary";
import { useLang } from "../i18n/LanguageContext";
import type { SubjectId } from "../types";

// Split out of the first-render chunk. Still precached by the service worker,
// so they open offline; they just are not parsed until a student taps the tab.
const LearnView = lazy(() => import("./LearnView").then((m) => ({ default: m.LearnView })));
const PracticeView = lazy(() => import("./PracticeView").then((m) => ({ default: m.PracticeView })));
const SolveView = lazy(() => import("./SolveView").then((m) => ({ default: m.SolveView })));

type Tab = "ask" | "learn" | "practice" | "solve";

/**
 * One chapter, four ways in. Ask is the tutor; Learn, Practice and Solve need
 * no model at all, which is the point: the optional AI improves the Ask tab
 * and nothing else depends on it.
 */
export function ChapterWorkspace({ subjectId, chapterId }: { subjectId: SubjectId; chapterId: string }) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("ask");
  const hasSolver = subjectId === "mathematics" || subjectId === "physics";
  const tabs: Array<[Tab, string]> = [
    ["ask", t.tabAsk],
    ["learn", t.tabLearn],
    ["practice", t.tabPractice],
    ...(hasSolver ? ([["solve", t.tabSolve]] as Array<[Tab, string]>) : []),
  ];
  const active = tab === "solve" && !hasSolver ? "ask" : tab;

  return (
    <div className="space-y-3">
      <CoverageStrip subjectId={subjectId} chapterId={chapterId} />
      <nav className="flex gap-1 rounded-card border border-white/5 bg-night-surface p-1" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-card px-3 py-2 text-xs font-medium transition-colors ${active === id ? "bg-night-raised text-paper" : "text-muted hover:text-paper"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {active === "ask" ? (
        <>
          <ModelLoader />
          <div className="h-[58vh] min-h-[420px]">
            <ErrorBoundary label={t.tabTutor}>
              <ChatPane chapterId={chapterId} />
            </ErrorBoundary>
          </div>
        </>
      ) : (
        <div className="rounded-card border border-white/5 bg-night-surface p-3 sm:p-4">
          <ErrorBoundary label={active}>
            <Suspense fallback={<div className="min-h-[12rem]" aria-busy="true" />}>
              {active === "learn" && <LearnView subjectId={subjectId} chapterId={chapterId} />}
              {active === "practice" && <PracticeView chapterId={chapterId} />}
              {active === "solve" && <SolveView subjectId={subjectId} chapterId={chapterId} />}
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
