import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { resolveLocalizedChapter } from "../data/subjects";
import { useLang } from "../i18n/LanguageContext";
import { promoteCorrectionToBank } from "../lib/retrieval";
import { logBankItem, logFlagResolved } from "../lib/sync";
import { SyncPanel } from "./SyncPanel";
import { FacilitatorDashboard } from "./FacilitatorDashboard";
import { OfflineReadiness } from "./OfflineReadiness";
import type { Learner } from "../types";
import type { FlaggedItem } from "../types";

export function TeacherPanel() {
  const items = useLiveQuery(
    () => db.flaggedItems.orderBy("timestamp").reverse().toArray(),
    [],
    [] as FlaggedItem[]
  );
  const { lang, t } = useLang();

  // The queue is deliberately cross-learner — a facilitator needs to see
  // everyone — but an item without a name attached is useless for following
  // up with the student who asked it.
  const learners = useLiveQuery(() => db.learners.toArray(), [], [] as Learner[]);
  const learnerName = (id: string) =>
    learners.find((l) => l.id === id)?.name ?? t.learnerUnknown;
  const [correctionDraft, setCorrectionDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  async function approve(item: FlaggedItem) {
    await db.flaggedItems.update(item.id, { teacherStatus: "approved" });
    await logFlagResolved({ ...item, teacherStatus: "approved" });
  }

  /**
   * Saving a correction does two things, and the second one is the point.
   *
   * It resolves this flag — and it promotes the teacher's answer into the
   * local answer bank, embedded and searchable, so the next student who asks
   * something similar gets this teacher's answer instead of a guess. The
   * review queue stops being a logbook and starts being the way the tutor
   * learns, with no server anywhere in the loop.
   */
  async function correct(item: FlaggedItem) {
    const correction = correctionDraft[item.id]?.trim();
    if (!correction || saving[item.id]) return;
    setSaving((s) => ({ ...s, [item.id]: true }));
    try {
      await db.flaggedItems.update(item.id, { teacherStatus: "corrected", correction });
      const promoted = await promoteCorrectionToBank({ ...item, correction }, correction);
      // Both halves of the flywheel enter the log: the resolution, and the
      // exemplar itself so another device gains the verified answer.
      await logFlagResolved({
        ...item,
        teacherStatus: "corrected",
        correction,
        promotedItemId: promoted.id,
      });
      await logBankItem(promoted);
    } catch (err) {
      // The correction itself is already saved; only the indexing failed.
      // Worth knowing about, not worth losing the teacher's work over.
      console.error("Correction saved, but could not be added to the answer bank", err);
    } finally {
      setSaving((s) => ({ ...s, [item.id]: false }));
    }
  }

  const pending = items.filter((i) => i.teacherStatus === "pending");
  const resolved = items.filter((i) => i.teacherStatus !== "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-paper">{t.teacherReview}</h2>
        <p className="mt-1 text-sm text-muted">
{t.teacherReviewBlurb}
        </p>
      </div>

      <FacilitatorDashboard />

      <OfflineReadiness />

      <SyncPanel />

      {pending.length === 0 && (
        <p className="rounded-card border border-white/5 bg-night-surface p-4 text-sm text-muted">
          {t.nothingPending}
        </p>
      )}

      <div className="space-y-3">
        {pending.map((item) => (
          <div key={item.id} className="rounded-card border border-danger/30 bg-night-surface p-4">
            <p className="mono-label">
              <span className="text-paper/80">{learnerName(item.learnerId)}</span>
              {" · "}
              {resolveLocalizedChapter(item.chapterId, lang)?.chapter.name ?? item.subjectId}
              {" · "}
              {t.flaggedAt} {new Date(item.timestamp).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-paper/90">
              <span className="text-muted">Q:</span> {item.question}
            </p>
            <p className="mt-1 text-sm text-paper/70">
              <span className="text-muted">A:</span> {item.aiAnswer}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={correctionDraft[item.id] ?? ""}
                onChange={(e) =>
                  setCorrectionDraft((d) => ({ ...d, [item.id]: e.target.value }))
                }
                placeholder={t.writeCorrection}
                className="flex-1 rounded-card border border-white/10 bg-night px-3 py-2 text-sm text-paper placeholder:text-muted"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => approve(item)}
                  className="rounded-card border border-signal/40 px-3 py-2 text-xs font-medium text-signal"
                >
                  {t.approveAsIs}
                </button>
                <button
                  onClick={() => correct(item)}
                  disabled={saving[item.id]}
                  className="whitespace-nowrap rounded-card bg-solar px-3 py-2 text-xs font-medium text-night disabled:opacity-40"
                >
                  {saving[item.id] ? t.saving : t.saveAndTeach}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <p className="mono-label mb-2">{t.resolved}</p>
          <div className="space-y-2">
            {resolved.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-card border border-white/5 bg-night px-3 py-2 text-xs"
              >
                <span className="truncate text-paper/70">
                  <span className="text-muted">{learnerName(item.learnerId)}</span>
                  {" — "}
                  {item.question}
                </span>
                <span
                  className={`shrink-0 pl-3 ${
                    item.teacherStatus === "approved" ? "text-signal" : "text-solar"
                  }`}
                >
                  {item.teacherStatus}
                  {/* Proof the loop actually closed, not just that a status
                      field changed. */}
                  {item.promotedItemId && ` · ${t.inAnswerBank}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
