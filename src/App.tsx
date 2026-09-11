import { useState } from "react";
import { SubjectPicker } from "./components/SubjectPicker";
import { ChatPane } from "./components/ChatPane";
import { LessonsPane } from "./components/LessonsPane";
import { TeacherPanel } from "./components/TeacherPanel";
import { ConnectivityIndicator } from "./components/ConnectivityIndicator";
import type { SubjectId } from "./types";

type View = "tutor" | "teacher";

export default function App() {
  const [subjectId, setSubjectId] = useState<SubjectId>("algebra");
  const [view, setView] = useState<View>("tutor");

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mono-label">offline stem tutor</p>
          <h1 className="font-display text-2xl font-semibold text-paper">
            Built for the pod, not the office.
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
              Tutor
            </button>
            <button
              onClick={() => setView("teacher")}
              className={`rounded-card px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "teacher" ? "bg-night-raised text-paper" : "text-muted"
              }`}
            >
              Teacher review
            </button>
          </nav>
          <ConnectivityIndicator />
        </div>
      </header>

      {view === "tutor" ? (
        <main className="space-y-4">
          <SubjectPicker activeId={subjectId} onSelect={setSubjectId} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="h-[60vh] min-h-[420px]">
              <ChatPane subjectId={subjectId} />
            </div>
            <div className="h-[60vh] min-h-[420px]">
              <LessonsPane subjectId={subjectId} />
            </div>
          </div>
        </main>
      ) : (
        <main>
          <TeacherPanel />
        </main>
      )}

      <footer className="mt-8 text-center">
        <p className="mono-label">
          try it: toggle airplane mode, then keep asking questions and playing downloaded videos
        </p>
      </footer>
    </div>
  );
}
