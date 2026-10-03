import { useEffect, useState } from "react";
import { SubjectPicker } from "./components/SubjectPicker";
import { ChapterPicker } from "./components/ChapterPicker";
import { ChatPane } from "./components/ChatPane";
import { LessonsPane } from "./components/LessonsPane";
import { TeacherPanel } from "./components/TeacherPanel";
import { ConnectivityIndicator } from "./components/ConnectivityIndicator";
import { EngineStatus } from "./components/EngineStatus";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ModelLoader } from "./components/ModelLoader";
import { LanguageToggle } from "./components/LanguageToggle";
import { useLang } from "./i18n/LanguageContext";
import { useLearner } from "./learner/LearnerContext";
import { LearnerPicker } from "./components/LearnerPicker";
import { Landing } from "./components/Landing";
import { LowBandwidthNotice } from "./components/LowBandwidthNotice";
import { LearnerBadge } from "./components/LearnerBadge";
import { FacilitatorGate } from "./components/FacilitatorGate";
import { firstChapterOf } from "./data/subjects";
import { seedReasoningBank, seedReferenceNotes } from "./lib/db";
import type { SubjectId } from "./types";

type View = "tutor" | "teacher";

export default function App() {
  const [subjectId, setSubjectId] = useState<SubjectId>("mathematics");
  const [chapterId, setChapterId] = useState<string>(() => firstChapterOf("mathematics").id);
  const [view, setView] = useState<View>("tutor");
  const { t } = useLang();
  const { learner, loading: learnerLoading } = useLearner();

  // The landing pitch is shown until someone starts. Dismissal is remembered
  // so a pod device opens straight on the picker every morning after the
  // first — a student should not walk past an explainer to do their homework.
  const [introDone, setIntroDone] = useState(() => {
    try {
      return localStorage.getItem("stem-tutor:intro-seen") === "1";
    } catch {
      return false;
    }
  });

  function startFromLanding() {
    try {
      localStorage.setItem("stem-tutor:intro-seen", "1");
    } catch {
      /* the intro will simply show again next time */
    }
    setIntroDone(true);
  }

  // Copy the seed answer bank into IndexedDB once. Everything downstream of
  // this — retrieval, the teacher flywheel, the no-model fallback tier —
  // reads from the local table, never from the bundled array.
  useEffect(() => {
    Promise.all([seedReasoningBank(), seedReferenceNotes()]).catch((err) =>
      console.error("Failed to seed local content", err)
    );
  }, []);

  function selectSubject(next: SubjectId) {
    setSubjectId(next);
    setChapterId(firstChapterOf(next).id);
  }

  // Nobody is signed in: ask before showing anyone's work.
  //
  // Gated on the whole tutor view rather than just the chat pane, because
  // chapter choice and lesson downloads are also part of a student's session.
  // While the lookup is in flight we render nothing rather than flashing the
  // picker at a student who is already signed in.
  if (learnerLoading) {
    return <div className="min-h-screen" aria-busy="true" />;
  }

  if (!learner && !introDone) {
    return <Landing onStart={startFromLanding} />;
  }

  if (!learner) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex justify-end">
          <LanguageToggle />
        </div>
        <ErrorBoundary label={t.tabTutor}>
          <LearnerPicker />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mono-label">{t.appKicker}</p>
          <h1 className="font-display text-2xl font-semibold text-paper">
            {t.appTitle}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex rounded-card border border-white/5 bg-night-surface p-1">
            <button
              onClick={() => setView("tutor")}
              className={`rounded-card px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "tutor" ? "bg-night-raised text-paper" : "text-muted"
              }`}
            >
              {t.tabTutor}
            </button>
            <button
              onClick={() => setView("teacher")}
              className={`rounded-card px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "teacher" ? "bg-night-raised text-paper" : "text-muted"
              }`}
            >
              {t.tabTeacher}
            </button>
          </nav>
          <LearnerBadge />
          <LanguageToggle />
          <EngineStatus />
          <ConnectivityIndicator />
        </div>
      </header>

      {view === "tutor" ? (
        <main className="space-y-3">
          <SubjectPicker activeId={subjectId} onSelect={selectSubject} />
          <ChapterPicker
            subjectId={subjectId}
            activeChapterId={chapterId}
            onSelect={setChapterId}
          />
          <LowBandwidthNotice />
          <ModelLoader />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
            <div className="h-[58vh] min-h-[420px]">
              <ErrorBoundary label={t.tabTutor}>
                <ChatPane chapterId={chapterId} />
              </ErrorBoundary>
            </div>
            <div className="h-[58vh] min-h-[420px]">
              <ErrorBoundary label={t.lessonVideos}>
                <LessonsPane chapterId={chapterId} />
              </ErrorBoundary>
            </div>
          </div>
        </main>
      ) : (
        <main>
          <ErrorBoundary label={t.teacherReview}>
            <FacilitatorGate>
              <TeacherPanel />
            </FacilitatorGate>
          </ErrorBoundary>
        </main>
      )}

      <footer className="mt-8 text-center">
        <p className="mono-label">
          {t.footerHint}
        </p>
      </footer>
    </div>
  );
}
