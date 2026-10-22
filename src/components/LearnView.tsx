import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { chapterMaterial, searchSubject, type Lesson, type SearchDoc } from "../lib/curriculum";
import type { LexicalHit } from "../lib/lexical";
import { useLang } from "../i18n/LanguageContext";
import type { Flashcard, SubjectId } from "../types";

/**
 * Lessons, flashcards and teacher answers for one chapter, and a search over
 * the whole subject — all from this device, with no model.
 */
export function LearnView({ subjectId, chapterId }: { subjectId: SubjectId; chapterId: string }) {
  const { t } = useLang();
  const material = useLiveQuery(() => chapterMaterial(chapterId), [chapterId]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Array<LexicalHit<SearchDoc>> | null>(null);

  // Debounced: searching on every keystroke would rebuild the index per letter.
  useEffect(() => {
    if (query.trim().length < 3) {
      setHits(null);
      return;
    }
    const id = setTimeout(() => {
      searchSubject(subjectId, query, 8).then(setHits).catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query, subjectId]);

  if (!material) return <div className="min-h-[12rem]" aria-busy="true" />;

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.learnSearch}
        className="w-full rounded-card border border-white/10 bg-night px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-signal/50 focus:outline-none"
      />
      {hits && (
        <div className="space-y-2">
          {hits.length === 0 ? (
            <p className="text-xs text-muted">{t.learnNoResults}</p>
          ) : (
            hits.filter((h) => h.coverage >= 0.3).map((h) => (
              <div key={`${h.doc.type}:${h.doc.id}`} className="rounded-card border border-white/5 bg-night px-3 py-2">
                <p className="text-sm font-medium text-paper">{h.doc.title}</p>
                <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-paper/65">{h.doc.body}</p>
              </div>
            ))
          )}
        </div>
      )}

      {material.teacherAnswers.length > 0 && (
        <section>
          <h3 className="mono-label mb-2">{t.teacherAnswersHeading}</h3>
          <div className="space-y-2">
            {material.teacherAnswers.map((a) => (
              <div key={a.id} className="rounded-card border border-signal/25 bg-signal/5 px-3 py-2">
                <p className="text-sm font-medium text-paper">{a.question}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-paper/80">{a.answer}</p>
                <p className="mt-1 text-[0.65rem] text-signal">{t.provTeacherVerified}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mono-label mb-2">{t.lessonsHeading}</h3>
        <div className="space-y-2">
          {material.lessons.map((l) => <LessonCard key={l.id} lesson={l} />)}
        </div>
      </section>

      {material.flashcards.length > 0 && (
        <section>
          <h3 className="mono-label mb-2">{t.flashcardsHeading}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {material.flashcards.map((f) => <FlashcardView key={f.id} card={f} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const { t, lang } = useLang();
  const kind = { definition: t.kindDefinition, formula: t.kindFormula, "worked-example": t.kindWorked, misconception: t.kindMisconception }[lesson.kind];
  return (
    <details className="group rounded-card border border-white/5 bg-night px-3 py-2">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
        <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wide ${lesson.kind === "misconception" ? "border-solar/40 text-solar" : "border-white/15 text-muted"}`}>{kind}</span>
        <span className="text-sm font-medium text-paper">{lesson.title}</span>
        {lang !== lesson.lang && <span className="font-mono text-[0.55rem] uppercase text-muted">{lesson.lang === "en" ? t.englishOnlyBadge : lesson.lang}</span>}
        {lesson.source !== "bundled" && <span className="text-[0.6rem] text-signal">{t.fromPack(lesson.source)}</span>}
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-[0.8rem] leading-relaxed text-paper/80" lang={lesson.lang}>{lesson.body}</p>
    </details>
  );
}

function FlashcardView({ card }: { card: Flashcard }) {
  const { t, lang } = useLang();
  const [back, setBack] = useState(false);
  return (
    <button
      onClick={() => setBack((b) => !b)}
      aria-pressed={back}
      lang={card.lang}
      className={`flex min-h-[4.5rem] flex-col justify-center rounded-card border px-3 py-2 text-left transition-colors ${back ? "border-signal/30 bg-signal/5" : "border-white/10 bg-night hover:border-white/25"}`}
    >
      <span className={back ? "text-xs leading-snug text-paper/85" : "font-display text-sm font-semibold text-paper"}>{back ? card.back : card.front}</span>
      {!back && (
        <span className="mt-1 font-mono text-[0.55rem] uppercase text-muted">
          {t.flipCard}{lang !== card.lang ? ` · ${t.englishOnlyBadge}` : ""}
        </span>
      )}
    </button>
  );
}
