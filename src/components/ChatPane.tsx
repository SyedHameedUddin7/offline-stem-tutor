import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { getSubject } from "../data/subjects";
import type { ChatMessage, FlaggedItem, SubjectId } from "../types";

interface Props {
  subjectId: SubjectId;
}

/**
 * PLACEHOLDER — replaced in Step 3 by a real WebLLM engine call.
 * Kept here (rather than inline) so the swap is a one-function change:
 * everything else in this component — persistence, flagging, UI — is real
 * and won't need to change when the model is wired in.
 */
async function getPlaceholderTutorReply(question: string): Promise<{ content: string; confidence: "high" | "low" }> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    content:
      `[on-device model not yet connected] I'd walk through "${question}" step by step here. ` +
      `Wiring in WebLLM next.`,
    confidence: "low",
  };
}

function newId() {
  return crypto.randomUUID();
}

export function ChatPane({ subjectId }: Props) {
  const subject = getSubject(subjectId)!;
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useLiveQuery(
    () => db.messages.where("subjectId").equals(subjectId).sortBy("timestamp"),
    [subjectId],
    [] as ChatMessage[]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || isThinking) return;
    setDraft("");
    setIsThinking(true);

    const studentMsg: ChatMessage = {
      id: newId(),
      subjectId,
      role: "student",
      content: question,
      timestamp: Date.now(),
      flagged: false,
      synced: false,
    };
    await db.messages.add(studentMsg);

    const reply = await getPlaceholderTutorReply(question);

    const tutorMsg: ChatMessage = {
      id: newId(),
      subjectId,
      role: "tutor",
      content: reply.content,
      timestamp: Date.now(),
      confidence: reply.confidence,
      flagged: reply.confidence === "low",
      synced: false,
    };
    await db.messages.add(tutorMsg);

    if (tutorMsg.flagged) {
      const flaggedItem: FlaggedItem = {
        id: newId(),
        messageId: tutorMsg.id,
        subjectId,
        question,
        aiAnswer: tutorMsg.content,
        teacherStatus: "pending",
        timestamp: Date.now(),
        synced: false,
      };
      await db.flaggedItems.add(flaggedItem);
    }

    setIsThinking(false);
  }

  async function toggleFlag(msg: ChatMessage) {
    const nextFlagged = !msg.flagged;
    await db.messages.update(msg.id, { flagged: nextFlagged });

    if (nextFlagged) {
      const existing = await db.flaggedItems.where("messageId").equals(msg.id).first();
      if (!existing) {
        const question =
          (await db.messages.where("subjectId").equals(subjectId).sortBy("timestamp"))
            .filter((m) => m.timestamp < msg.timestamp && m.role === "student")
            .at(-1)?.content ?? "(question not found)";
        await db.flaggedItems.add({
          id: newId(),
          messageId: msg.id,
          subjectId,
          question,
          aiAnswer: msg.content,
          teacherStatus: "pending",
          timestamp: Date.now(),
          synced: false,
        });
      }
    } else {
      await db.flaggedItems.where("messageId").equals(msg.id).delete();
    }
  }

  return (
    <div className="flex h-full flex-col rounded-card border border-white/5 bg-night-surface">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <span className="font-display text-sm font-semibold text-paper">{subject.name} tutor</span>
        <span className="mono-label">{messages.length} messages</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-start justify-center gap-2">
            <p className="text-sm text-muted">No questions yet. Try one:</p>
            <div className="flex flex-wrap gap-2">
              {subject.sampleProblems.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-card border border-white/10 px-3 py-1.5 text-left text-xs text-paper/80 transition-colors hover:border-signal/50 hover:text-signal"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-card px-3.5 py-2.5 text-sm ${
                msg.role === "student"
                  ? "bg-solar/15 text-paper"
                  : "border border-white/5 bg-night text-paper/90"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "tutor" && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`font-mono text-[0.6rem] uppercase tracking-wide ${
                      msg.confidence === "low" ? "text-danger" : "text-signal"
                    }`}
                  >
                    confidence: {msg.confidence ?? "n/a"}
                  </span>
                  <button
                    onClick={() => toggleFlag(msg)}
                    className={`font-mono text-[0.6rem] uppercase tracking-wide underline decoration-dotted underline-offset-2 ${
                      msg.flagged ? "text-danger" : "text-muted hover:text-paper"
                    }`}
                  >
                    {msg.flagged ? "flagged for teacher review" : "flag for review"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <p className="font-mono text-xs text-muted">tutor is thinking…</p>
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
          placeholder={`Ask a ${subject.name.toLowerCase()} question…`}
          className="flex-1 rounded-card border border-white/10 bg-night px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-signal/50"
        />
        <button
          type="submit"
          disabled={isThinking || !draft.trim()}
          className="rounded-card bg-solar px-4 py-2 text-sm font-medium text-night disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
