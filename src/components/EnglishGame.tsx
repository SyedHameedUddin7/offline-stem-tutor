import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ENGLISH_TOPICS } from "../data/englishWords";
import {
  MASTERED_BOX,
  boxOf,
  canReview,
  isSpelledCorrectly,
  isUnlocked,
  loadProgress,
  recordAnswer,
  reviewRound,
  starsFor,
  topicRound,
  unlockedTopics,
  type ProgressMap,
  type Question,
  type Tile,
} from "../lib/english";
import { useLang } from "../i18n/LanguageContext";
import { useLearner } from "../learner/LearnerContext";
import type { EnglishMode, EnglishTopic, WordPicture } from "../types";

type Screen =
  | { kind: "topics" }
  | {
      kind: "play";
      topic: EnglishTopic | null;
      questions: Question[];
      index: number;
      score: number;
      /** null until the current question is answered. */
      result: boolean | null;
    }
  | { kind: "done"; topic: EnglishTopic | null; score: number; total: number };

const NO_PROGRESS: Record<EnglishMode, ProgressMap> = { match: new Map(), spell: new Map() };

export function EnglishGame() {
  const { lang, t } = useLang();
  const { learner } = useLearner();
  const learnerId = learner?.id ?? "";
  const progress = useLiveQuery(() => loadProgress(learnerId), [learnerId], NO_PROGRESS);
  const [mode, setMode] = useState<EnglishMode>("match");
  const [screen, setScreen] = useState<Screen>({ kind: "topics" });
  const speak = useEnglishVoice();

  const modeProgress = progress[mode];
  const open = unlockedTopics(progress.match);
  const topicName = (topic: EnglishTopic | null) =>
    topic ? (lang === "fr" ? topic.nameFr : topic.name) : t.englishReview;

  function start(topic: EnglishTopic | null) {
    const questions = topic
      ? topicRound(topic, mode, modeProgress)
      : reviewRound(open, mode, modeProgress);
    setScreen({ kind: "play", topic, questions, index: 0, score: 0, result: null });
  }

  if (screen.kind === "topics") {
    return (
      <section className="rounded-card border border-white/5 bg-night-surface p-4">
        <p className="mono-label">{t.englishKicker}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-paper">{t.englishTile}</h2>
          <div className="flex rounded-card border border-white/5 bg-night p-1">
            {(["match", "spell"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-card px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === m ? "bg-night-raised text-paper" : "text-muted"
                }`}
              >
                {m === "match" ? t.englishModeMatch : t.englishModeSpell}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm leading-snug text-paper/60">
          {mode === "match" ? t.englishBlurb : t.englishSpellBlurb}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {ENGLISH_TOPICS.map((topic, i) => {
            const unlocked = isUnlocked(i, progress.match);
            const stars = starsFor(topic, modeProgress);
            const known = topic.words.filter((w) => boxOf(modeProgress, w.id) >= MASTERED_BOX).length;
            return (
              <button
                key={topic.id}
                onClick={() => start(topic)}
                disabled={!unlocked}
                title={unlocked ? t.englishKnown(known, topic.words.length) : t.englishLocked}
                className="flex min-h-[6.5rem] flex-col items-start rounded-card border border-signal/25 bg-night-raised p-3 text-left transition-all hover:border-signal/60 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-night-surface disabled:opacity-50"
              >
                <span className="text-3xl leading-none" aria-hidden>
                  {unlocked ? topic.icon : "🔒"}
                </span>
                <span className="mt-2 font-display text-sm font-semibold leading-tight text-paper">
                  {topicName(topic)}
                </span>
                <span className="mt-auto pt-1 text-sm text-solar" aria-label={t.englishStars(stars)}>
                  {"★".repeat(stars)}
                  <span className="text-paper/20">{"★".repeat(3 - stars)}</span>
                </span>
              </button>
            );
          })}
        </div>

        {canReview(open, modeProgress) && (
          <button
            onClick={() => start(null)}
            className="mt-3 w-full rounded-card border border-solar/30 bg-night-raised p-3 text-left transition-colors hover:border-solar/60"
          >
            <span className="font-display text-sm font-semibold text-solar">🔁 {t.englishReview}</span>
            <span className="mt-0.5 block text-xs text-paper/60">{t.englishReviewBlurb}</span>
          </button>
        )}
      </section>
    );
  }

  if (screen.kind === "done") {
    const great = screen.score >= Math.ceil(screen.total * 0.75);
    return (
      <section className="rounded-card border border-white/5 bg-night-surface p-6 text-center">
        <p className="mono-label">{topicName(screen.topic)}</p>
        <p className="mt-3 text-5xl" aria-hidden>
          {great ? "🎉" : "💪"}
        </p>
        <p className="mt-3 font-display text-2xl font-semibold text-paper">
          {t.englishScore(screen.score, screen.total)}
        </p>
        <p className="mt-1 text-sm text-paper/60">{great ? t.englishDoneGreat : t.englishDoneKeep}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => start(screen.topic)}
            className="rounded-card bg-signal px-4 py-2 text-sm font-semibold text-night"
          >
            {t.englishPlayAgain}
          </button>
          <button
            onClick={() => setScreen({ kind: "topics" })}
            className="rounded-card border border-white/10 px-4 py-2 text-sm text-paper"
          >
            {t.englishBack}
          </button>
        </div>
      </section>
    );
  }

  const { questions, index, result } = screen;
  const q = questions[index];
  const answered = result !== null;
  const last = index === questions.length - 1;

  function answer(correct: boolean) {
    if (screen.kind !== "play" || screen.result !== null) return;
    void recordAnswer(learnerId, q.mode, q.word.id, correct).catch((err) =>
      console.error("Could not save English progress", err)
    );
    setScreen({ ...screen, result: correct, score: screen.score + (correct ? 1 : 0) });
  }

  function next() {
    if (screen.kind !== "play") return;
    if (last) {
      setScreen({ kind: "done", topic: screen.topic, score: screen.score, total: questions.length });
    } else {
      setScreen({ ...screen, index: index + 1, result: null });
    }
  }

  return (
    <section className="rounded-card border border-white/5 bg-night-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setScreen({ kind: "topics" })} className="text-xs text-muted hover:text-paper">
          ← {t.englishBack}
        </button>
        <span className="mono-label">
          {topicName(screen.topic)} · {t.englishProgress(index + 1, questions.length)}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full bg-signal transition-all"
          style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Keyed on the index so each question starts with fresh local state. */}
      {q.mode === "match" ? (
        <MatchQuestion key={index} q={q} answered={answered} onAnswer={answer} speak={speak} />
      ) : (
        <SpellQuestion key={index} q={q} result={result} onAnswer={answer} />
      )}

      {answered && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card bg-night-raised p-3">
          <div>
            <p className={`font-display text-base font-semibold ${result ? "text-signal" : "text-danger"}`}>
              {result ? t.englishCorrect : t.englishWrong(q.word.en)}
            </p>
            <p className="text-xs text-paper/60">{t.englishInFrench(q.word.fr)}</p>
          </div>
          <div className="flex gap-2">
            {speak && (
              <button
                onClick={() => speak(q.word.en)}
                className="rounded-card border border-white/10 px-3 py-2 text-sm text-paper/80"
                aria-label={t.englishListen}
              >
                🔊
              </button>
            )}
            <button onClick={next} className="rounded-card bg-signal px-4 py-2 text-sm font-semibold text-night">
              {last ? t.englishFinish : t.englishNext}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function MatchQuestion({
  q,
  answered,
  onAnswer,
  speak,
}: {
  q: Extract<Question, { mode: "match" }>;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
  speak: ((text: string) => void) | null;
}) {
  const { t } = useLang();
  const [chosen, setChosen] = useState<string | null>(null);

  function choose(id: string) {
    if (answered) return;
    setChosen(id);
    onAnswer(id === q.word.id);
  }

  const choiceState = (id: string) =>
    !answered
      ? "border-white/10 hover:border-signal/60"
      : id === q.word.id
        ? "border-signal bg-signal/10"
        : id === chosen
          ? "border-danger bg-danger/10"
          : "border-white/5 opacity-50";

  if (q.direction === "picture-to-word") {
    return (
      <>
        <p className="mt-4 text-center text-sm text-paper/70">{t.englishWhichWord}</p>
        <div className="mt-3 flex h-32 items-center justify-center">
          <PictureView picture={q.word.picture} large />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {q.choices.map((c) => (
            <button
              key={c.id}
              onClick={() => choose(c.id)}
              disabled={answered}
              className={`min-h-[3.25rem] rounded-card border bg-night-raised px-3 py-2 font-display text-lg font-semibold text-paper transition-colors ${choiceState(c.id)}`}
            >
              {c.en}
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <p className="mt-4 text-center text-sm text-paper/70">{t.englishWhichPicture(q.word.en)}</p>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="font-display text-3xl font-semibold text-paper">{q.word.en}</span>
        {speak && (
          <button
            onClick={() => speak(q.word.en)}
            className="rounded-card border border-white/10 px-2 py-1 text-xs text-paper/80"
            aria-label={t.englishListen}
          >
            🔊 {t.englishListen}
          </button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {q.choices.map((c) => (
          <button
            key={c.id}
            onClick={() => choose(c.id)}
            disabled={answered}
            aria-label={answered ? c.en : undefined}
            className={`flex h-28 flex-col items-center justify-center gap-1 rounded-card border bg-night-raised transition-colors ${choiceState(c.id)}`}
          >
            <PictureView picture={c.picture} />
            {answered && <span className="text-xs text-paper/70">{c.en}</span>}
          </button>
        ))}
      </div>
    </>
  );
}

/**
 * Tap letters into slots. Checked once every slot is full rather than letter
 * by letter: a beginner sees the whole attempt next to the right spelling,
 * which teaches more than a buzz on the third letter.
 */
function SpellQuestion({
  q,
  result,
  onAnswer,
}: {
  q: Extract<Question, { mode: "spell" }>;
  result: boolean | null;
  onAnswer: (correct: boolean) => void;
}) {
  const { t } = useLang();
  const [placed, setPlaced] = useState<Tile[]>([]);
  const answered = result !== null;
  const placedIds = new Set(placed.map((p) => p.id));

  function place(tile: Tile) {
    if (answered) return;
    const next = [...placed, tile];
    setPlaced(next);
    if (next.length === q.tiles.length) {
      onAnswer(isSpelledCorrectly(q.word, next.map((p) => p.letter)));
    }
  }

  function unplace(i: number) {
    if (answered) return;
    setPlaced(placed.filter((_, j) => j !== i));
  }

  // Slots follow the word's shape, so "light bulb" shows its gap and the
  // student is never asked to type a space.
  let slot = 0;
  const slots = [...q.word.en].map((ch, i) =>
    ch === " " ? { kind: "gap" as const, key: `g${i}` } : { kind: "slot" as const, key: `s${i}`, n: slot++ }
  );

  const slotTone = answered
    ? result
      ? "border-signal bg-signal/10 text-signal"
      : "border-danger bg-danger/10 text-danger"
    : "border-white/15 text-paper";

  return (
    <>
      <p className="mt-4 text-center text-sm text-paper/70">{t.englishSpellPrompt}</p>
      <div className="mt-3 flex h-28 items-center justify-center">
        <PictureView picture={q.word.picture} large />
      </div>
      <p className="text-center text-xs text-paper/50">{t.englishInFrench(q.word.fr)}</p>

      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {slots.map((s) =>
          s.kind === "gap" ? (
            <span key={s.key} className="w-3" aria-hidden />
          ) : (
            <button
              key={s.key}
              onClick={() => unplace(s.n)}
              disabled={answered || !placed[s.n]}
              aria-label={placed[s.n] ? t.englishRemoveLetter(placed[s.n].letter) : undefined}
              className={`flex h-11 w-9 items-center justify-center rounded-card border-2 bg-night font-display text-xl font-semibold transition-colors ${
                placed[s.n] ? slotTone : "border-dashed border-white/15"
              }`}
            >
              {placed[s.n]?.letter ?? ""}
            </button>
          )
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {q.tiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => place(tile)}
            disabled={answered || placedIds.has(tile.id)}
            className="flex h-12 w-11 items-center justify-center rounded-card border border-white/10 bg-night-raised font-display text-xl font-semibold text-paper transition-colors hover:border-signal/60 disabled:opacity-20"
          >
            {tile.letter}
          </button>
        ))}
      </div>

      {!answered && placed.length > 0 && (
        <div className="mt-3 text-center">
          <button onClick={() => setPlaced([])} className="text-xs text-muted underline hover:text-paper">
            {t.englishClear}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Draw a word's picture with no image download: an emoji from the phone's
 * own font, or a swatch, shape or dot-count drawn in place.
 */
function PictureView({ picture, large = false }: { picture: WordPicture; large?: boolean }) {
  const box = large ? "h-28 w-28" : "h-16 w-16";
  switch (picture.kind) {
    case "emoji":
      return (
        <span className={`${large ? "text-7xl" : "text-5xl"} leading-none`} aria-hidden>
          {picture.value}
        </span>
      );
    case "swatch":
      return (
        <span
          className={`${box} rounded-full border-2 border-white/30`}
          style={{ backgroundColor: picture.color }}
          aria-hidden
        />
      );
    case "count":
      return (
        <span className={`${box} flex flex-wrap content-center items-center justify-center gap-1.5`} aria-hidden>
          {Array.from({ length: picture.n }, (_, i) => (
            <span key={i} className={`${large ? "h-5 w-5" : "h-3 w-3"} rounded-full bg-solar`} />
          ))}
        </span>
      );
    case "shape":
      return (
        <svg viewBox="0 0 64 64" className={`${box} text-solar`} aria-hidden>
          {picture.shape === "circle" && <circle cx="32" cy="32" r="24" fill="currentColor" />}
          {picture.shape === "square" && <rect x="10" y="10" width="44" height="44" fill="currentColor" />}
          {picture.shape === "rectangle" && <rect x="4" y="18" width="56" height="28" fill="currentColor" />}
          {picture.shape === "triangle" && <polygon points="32,8 58,54 6,54" fill="currentColor" />}
          {picture.shape === "star" && (
            <polygon
              points="32,4 39,24 60,24 43,37 49,58 32,45 15,58 21,37 4,24 25,24"
              fill="currentColor"
            />
          )}
          {picture.shape === "line" && (
            <line x1="6" y1="32" x2="58" y2="32" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          )}
        </svg>
      );
  }
}

/**
 * Pronunciation through the phone's own text-to-speech, if it has an English
 * voice that runs on the device.
 *
 * Only `localService` voices count: a network voice would fail exactly when
 * this game is meant to be used, and a button that silently does nothing is
 * worse than no button. Returns null when there is no such voice.
 */
function useEnglishVoice(): ((text: string) => void) | null {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const pick = () =>
      setVoice(
        speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("en") && v.localService) ??
          null
      );
    pick();
    // Voices load asynchronously on Chrome; the first call is often empty.
    speechSynthesis.addEventListener("voiceschanged", pick);
    return () => speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);

  if (!voice) return null;
  return (text: string) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  };
}
