import { localizedSubjects } from "../data/subjects";
import { useLang } from "../i18n/LanguageContext";
import type { Accent, SubjectId } from "../types";

const accentClasses: Record<Accent, { border: string; text: string; activeRing: string }> = {
  solar: {
    border: "border-solar/25 hover:border-solar/60",
    text: "text-solar",
    activeRing: "ring-1 ring-solar/60",
  },
  signal: {
    border: "border-signal/25 hover:border-signal/60",
    text: "text-signal",
    activeRing: "ring-1 ring-signal/60",
  },
  paper: {
    border: "border-paper/20 hover:border-paper/45",
    text: "text-paper",
    activeRing: "ring-1 ring-paper/45",
  },
  danger: {
    border: "border-danger/25 hover:border-danger/60",
    text: "text-danger",
    activeRing: "ring-1 ring-danger/60",
  },
};

interface Props {
  activeId: SubjectId;
  onSelect: (id: SubjectId) => void;
}

export function SubjectPicker({ activeId, onSelect }: Props) {
  const { lang, t } = useLang();
  const subjects = localizedSubjects(lang);

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {subjects.map((subject) => {
        const isActive = subject.id === activeId;
        const styles = accentClasses[subject.accent];
        return (
          <button
            key={subject.id}
            onClick={() => onSelect(subject.id)}
            aria-pressed={isActive}
            className={`flex min-h-[5.5rem] flex-col rounded-card border bg-night-surface p-3.5 text-left transition-all ${styles.border} ${
              isActive ? `bg-night-raised ${styles.activeRing}` : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="mono-label">
                {t.chapters(subject.chapters.length)}
              </span>
              {/* Mental Ability is the one subject the model may not free-wheel
                  in. Saying so on the card sets the expectation before the
                  student asks anything. */}
              {subject.mode === "retrieval-grounded" && (
                <span className="rounded-sm border border-danger/40 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wide text-danger">
                  {t.grounded}
                </span>
              )}
            </div>
            <span className={`mt-1.5 font-display text-base font-semibold leading-tight ${styles.text}`}>
              {subject.name}
            </span>
            <span className="mt-1 text-xs leading-snug text-paper/60">{subject.tagline}</span>
          </button>
        );
      })}
    </div>
  );
}
