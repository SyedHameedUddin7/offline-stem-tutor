import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { askTutor } from "../lib/tutor";
import { logFlagCreated, logLearner } from "../lib/sync";
import { provenanceOf, provenanceTone, type ProvenanceKind } from "../lib/provenance";
import { safeParseAll } from "../lib/safeRead";
import { chatMessageSchema } from "../schemas";
import { resolveLocalizedChapter } from "../data/subjects";
import { useLang } from "../i18n/LanguageContext";
import { useLearner } from "../learner/LearnerContext";
import type { ChatMessage, EngineTier, FlaggedItem } from "../types";

interface Props {
  chapterId: string;
}

function newId() {
  return crypto.randomUUID();
}

export function ChatPane({ chapterId }: Props) {
  const { lang, t } = useLang();
  const { learner } = useLearner();
  const resolved = resolveLocalizedChapter(chapterId, lang)!;
  const { subject, chapter } = resolved;

  /** Engine names, shown only in the diagnostics row. */
  const tierLabel: Record<EngineTier, string> = {
    solver: t.tierSolver,
    "webgpu-llm": t.tierLlm,
    "answer-bank": t.tierBank,
    unavailable: t.tierNone,
  };

  /** What a student reads instead of a similarity score. */
  const provenanceLabel: Record<ProvenanceKind, string> = {
    verified: t.provVerified,
    "teacher-verified": t.provTeacherVerified,
    "from-example": t.provFromExample,
    "checks-passed": t.provChecksPassed,
    "checks-failed": t.provChecksFailed,
    "grounded-unchecked": t.provGroundedUnchecked,
    unchecked: t.provUnchecked,
    "no-answer": t.provNoAnswer,
  };

  const toneClass = { good: "text-signal", neutral: "text-paper/70", caution: "text-solar" };

  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  /** Live token stream. Held in state, not written to IndexedDB per token —
   *  a disk write per token would be pointless churn on a phone's flash. */
  const [streaming, setStreaming] = useState<string | null>(null);
  /** Surfaced in the pane rather than only logged — see send(). */
  const [failure, setFailure] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(() => {
    try {
      return localStorage.getItem("stem-tutor:diagnostics") === "1";
    } catch {
      return false;
    }
  });

  function toggleDiagnostics() {
    const next = !showDiagnostics;
    setShowDiagnostics(next);
    try {
      localStorage.setItem("stem-tutor:diagnostics", next ? "1" : "0");
    } catch {
      /* preference simply will not persist */
    }
  }
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scoped to the learner through the compound [learnerId+chapterId] index.
  // This is the read that used to leak: keyed on chapter alone, the next
  // student to pick up the phone saw the previous one's conversation.
  const messages = useLiveQuery(
    async () => {
      if (!learner) return [] as ChatMessage[];
      const rows = await db.messages
        .where("[learnerId+chapterId]")
        .equals([learner.id, chapterId])
        .sortBy("timestamp");
      // One unreadable row — an interrupted write, or a shape from an older
      // build — costs that row, not the whole conversation.
      return safeParseAll(chatMessageSchema, rows, "message").valid as ChatMessage[];
    },
    [learner?.id, chapterId],
    [] as ChatMessage[]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    setFailure(null);
    setStreaming(null);
  }, [chapterId]);

  /**
   * Ask a question and persist both sides of the exchange.
   *
   * Wrapped in try/finally because `setIsThinking(true)` happens before any
   * await. Without the finally, anything that threw in between — a quota
   * error from IndexedDB on a nearly-full phone, a localStorage read blocked
   * in a private window, a chapter id that no longer resolves — left the
   * input disabled and the pane reading "tutor is thinking…" forever, with
   * the only recovery being a reload. That is the worst possible failure on
   * a shared device, because the student has no reason to suspect the app
   * rather than themselves.
   */
  async function send(question: string) {
    if (!question.trim() || isThinking || !learner) return;
    setDraft("");
    setIsThinking(true);
    setStreaming(null);

    try {
      await exchange(question);
    } catch (err) {
      console.error("Failed to complete the exchange", err);
      setFailure(err instanceof Error ? err.message : String(err));
    } finally {
      setIsThinking(false);
      setStreaming(null);
    }
  }

  /** Called only from send(), which has already guarded on `learner`. */
  async function exchange(question: string) {
    const studentMsg: ChatMessage = {
      id: newId(),
      learnerId: learner!.id,
      subjectId: subject.id,
      chapterId,
      role: "student",
      content: question,
      timestamp: Date.now(),
      flagged: false,
      synced: false,
    };
    await db.messages.add(studentMsg);

    const reply = await askTutor({ chapterId, question, onToken: setStreaming });

    const tutorMsg: ChatMessage = {
      id: newId(),
      learnerId: learner!.id,
      subjectId: subject.id,
      chapterId,
      role: "tutor",
      content: reply.content,
      timestamp: Date.now(),
      confidence: reply.confidence,
      tier: reply.tier,
      citations: reply.citations,
      topScore: reply.topScore,
      verification: reply.verification,
      verificationNotes: reply.verificationNotes,
      // Low confidence auto-flags. For Mental Ability this is a real signal
      // — retrieval found nothing close enough to stand on. A failed
      // deterministic check also flags: an answer we can show is wrong
      // must reach a facilitator, not just carry a quieter label.
      flagged: reply.confidence === "low" || reply.verification === "failed",
      synced: false,
    };
    await db.messages.add(tutorMsg);

    if (tutorMsg.flagged) {
      const flag: FlaggedItem = {
        id: newId(),
        messageId: tutorMsg.id,
        learnerId: learner!.id,
        subjectId: subject.id,
        chapterId,
        question,
        aiAnswer: tutorMsg.content,
        teacherStatus: "pending",
        timestamp: Date.now(),
        synced: false,
      };
      await db.flaggedItems.add(flag);
      // Log it for transfer. The learner goes too, because a flag arriving on
      // the facilitator's phone with no name on it cannot be followed up.
      await logLearner(learner!);
      await logFlagCreated(flag);
    }
  }

  async function toggleFlag(msg: ChatMessage) {
    const nextFlagged = !msg.flagged;
    await db.messages.update(msg.id, { flagged: nextFlagged });

    if (!nextFlagged) {
      await db.flaggedItems.where("messageId").equals(msg.id).delete();
      return;
    }

    const existing = await db.flaggedItems.where("messageId").equals(msg.id).first();
    if (existing) return;

    // The question is the most recent student message before this answer.
    const priorMessages = await db.messages
      .where("[learnerId+chapterId]")
      .equals([msg.learnerId, chapterId])
      .sortBy("timestamp");
    const question =
      priorMessages
        .filter((m) => m.timestamp <= msg.timestamp && m.role === "student")
        .at(-1)?.content ?? "(question not found)";

    const manualFlag: FlaggedItem = {
      id: newId(),
      messageId: msg.id,
      learnerId: msg.learnerId,
      subjectId: subject.id,
      chapterId,
      question,
      aiAnswer: msg.content,
      teacherStatus: "pending",
      timestamp: Date.now(),
      synced: false,
    };
    await db.flaggedItems.add(manualFlag);
    if (learner) await logLearner(learner);
    await logFlagCreated(manualFlag);
  }

  return (
    <div className="flex h-full flex-col rounded-card border border-white/5 bg-night-surface">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div className="min-w-0">
          <span className="block truncate font-display text-sm font-semibold text-paper">
            {chapter.name}
          </span>
          <span className="mono-label">{subject.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="mono-label">{t.messages(messages.length)}</span>
          <button
            onClick={toggleDiagnostics}
            aria-pressed={showDiagnostics}
            className={`font-mono text-[0.6rem] uppercase tracking-wide underline decoration-dotted underline-offset-2 ${
              showDiagnostics ? "text-signal" : "text-muted hover:text-paper"
            }`}
          >
            {showDiagnostics ? t.provHideDetails : t.provShowDetails}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-start justify-center gap-2">
            <p className="text-sm text-muted">{t.noQuestionsYet}</p>
            <div className="flex flex-wrap gap-2">
              {chapter.sampleProblems.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-card border border-white/10 px-3 py-2 text-left text-xs text-paper/80 transition-colors hover:border-signal/50 hover:text-signal"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-card px-3.5 py-2.5 text-sm ${
                msg.role === "student"
                  ? "bg-solar/15 text-paper"
                  : "border border-white/5 bg-night text-paper/90"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "tutor" && (
                <div className="mt-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {/* Provenance in words, always visible. A student needs to
                        know whether anyone checked this — not a cosine score,
                        which reads as precision the system does not have. */}
                    {(() => {
                      const kind = provenanceOf(msg);
                      return (
                        <span className={`text-[0.7rem] ${toneClass[provenanceTone(kind)]}`}>
                          {provenanceLabel[kind]}
                        </span>
                      );
                    })()}
                    <button
                      onClick={() => toggleFlag(msg)}
                      className={`font-mono text-[0.6rem] uppercase tracking-wide underline decoration-dotted underline-offset-2 ${
                        msg.flagged ? "text-danger" : "text-muted hover:text-paper"
                      }`}
                    >
                      {msg.flagged ? t.flaggedForReview : t.flagForReview}
                    </button>
                  </div>

                  {/* The numbers are still here, for whoever is calibrating
                      thresholds. Off by default because the audience for a
                      similarity score is me, not the student. */}
                  {showDiagnostics && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-muted">
                      <span>{tierLabel[msg.tier ?? "unavailable"]}</span>
                      <span>
                        {t.confidence}: {msg.confidence ?? "n/a"}
                      </span>
                      {msg.topScore !== undefined && (
                        <span>
                          {t.match} {msg.topScore.toFixed(2)}
                        </span>
                      )}
                      {msg.citations && msg.citations.length > 0 && (
                        <span>{msg.citations.length} cited</span>
                      )}
                      {msg.verificationNotes?.map((note) => (
                        <span key={note} className="text-danger">{note}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* The answer as it arrives. A 1.5B model on integrated graphics runs
            at maybe 15 tokens/sec — in silence that reads as a hang. */}
        {streaming !== null && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-card border border-white/5 bg-night px-3.5 py-2.5 text-sm text-paper/90">
              <p className="whitespace-pre-wrap">
                {streaming}
                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-signal align-text-bottom" />
              </p>
            </div>
          </div>
        )}

        {isThinking && streaming === null && (
          <p className="font-mono text-xs text-muted">{t.thinking}</p>
        )}

        {failure && (
          <div className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2">
            <p className="text-xs text-danger">{t.tutorExchangeFailed}</p>
            <p className="mt-1 break-words font-mono text-[0.65rem] text-muted">{failure}</p>
            <button
              onClick={() => setFailure(null)}
              className="mt-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted underline decoration-dotted underline-offset-2 hover:text-paper"
            >
              {t.tryAgain}
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 border-t border-white/5 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.askAbout(chapter.name)}
          className="min-w-0 flex-1 rounded-card border border-white/10 bg-night px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-signal/50"
        />
        <button
          type="submit"
          disabled={isThinking || !draft.trim()}
          className="shrink-0 rounded-card bg-solar px-4 py-2 text-sm font-medium text-night disabled:opacity-40"
        >
          {t.ask}
        </button>
      </form>
    </div>
  );
}
