import { SUBJECTS } from "../data/subjects";
import type { Subject, SubjectId } from "../types";

const accentClasses: Record<Subject["accent"], { border: string; text: string; glow: string }> = {
  solar: { border: "border-solar/30 hover:border-solar/70", text: "text-solar", glow: "hover:shadow-[0_0_0_1px_theme(colors.solar.DEFAULT/40%)]" },
  signal: { border: "border-signal/30 hover:border-signal/70", text: "text-signal", glow: "hover:shadow-[0_0_0_1px_theme(colors.signal.DEFAULT/40%)]" },
  paper: { border: "border-paper/20 hover:border-paper/50", text: "text-paper", glow: "hover:shadow-[0_0_0_1px_theme(colors.paper/30%)]" },
};

interface Props {
  activeId: SubjectId;
  onSelect: (id: SubjectId) => void;
}

export function SubjectPicker({ activeId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {SUBJECTS.map((subject) => {
        const isActive = subject.id === activeId;
        const styles = accentClasses[subject.accent];
        return (
          <button
            key={subject.id}
            onClick={() => onSelect(subject.id)}
            aria-pressed={isActive}
            className={`group relative flex flex-col rounded-card border bg-night-surface p-4 text-left transition-all ${styles.border} ${styles.glow} ${
              isActive ? "bg-night-raised" : ""
            }`}
          >
            <span className="mono-label">{isActive ? "active" : "select"}</span>
            <span className={`mt-2 font-display text-lg font-semibold ${styles.text}`}>
              {subject.name}
            </span>
            <span className="mt-1 text-sm text-paper/70">{subject.tagline}</span>
          </button>
        );
      })}
    </div>
  );
}
