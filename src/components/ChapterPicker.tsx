import { getSubject, localizedChapter } from "../data/subjects";
import { useLang } from "../i18n/LanguageContext";
import { videosForChapter } from "../data/videos";
import type { Accent, SubjectId } from "../types";

const accentText: Record<Accent, string> = {
  solar: "text-solar",
  signal: "text-signal",
  paper: "text-paper",
  danger: "text-danger",
};

const accentActive: Record<Accent, string> = {
  solar: "border-solar/60 bg-solar/10 text-solar",
  signal: "border-signal/60 bg-signal/10 text-signal",
  paper: "border-paper/45 bg-paper/10 text-paper",
  danger: "border-danger/60 bg-danger/10 text-danger",
};

interface Props {
  subjectId: SubjectId;
  activeChapterId: string;
  onSelect: (chapterId: string) => void;
}

/**
 * Chapters as wrapped chips rather than a dropdown.
 *
 * A dropdown hides the syllabus behind a tap and needs a precise one on a
 * cracked screen. Chips show the whole chapter list at once and give every
 * option a large target — the same reason the subject picker uses cards.
 */
export function ChapterPicker({ subjectId, activeChapterId, onSelect }: Props) {
  const { lang, t } = useLang();
  const subject = getSubject(subjectId)!;
  const chapters = subject.chapters.map((c) => localizedChapter(c, lang));
  const active = chapters.find((c) => c.id === activeChapterId);

  return (
    <div className="rounded-card border border-white/5 bg-night-surface/60 p-3">
      <div className="flex flex-wrap gap-2">
        {chapters.map((chapter) => {
          const isActive = chapter.id === activeChapterId;
          const hasVideo = videosForChapter(chapter.id).length > 0;
          return (
            <button
              key={chapter.id}
              onClick={() => onSelect(chapter.id)}
              aria-pressed={isActive}
              className={`flex min-h-[2.25rem] items-center gap-1.5 rounded-card border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? accentActive[subject.accent]
                  : "border-white/10 text-paper/65 hover:border-white/25 hover:text-paper"
              }`}
            >
              {chapter.name}
              {/* A quiet mark that this chapter has a downloadable lesson —
                  useful to a teacher deciding what to pull while there's signal. */}
              {hasVideo && (
                <span
                  className={`h-1 w-1 rounded-full ${isActive ? "bg-current" : "bg-muted"}`}
                  aria-label={t.hasVideo}
                />
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <p className="mt-2.5 border-t border-white/5 pt-2.5 text-xs text-muted">
          <span className={`font-medium ${accentText[subject.accent]}`}>{active.name}</span>
          {" — "}
          {active.blurb}
        </p>
      )}
    </div>
  );
}
