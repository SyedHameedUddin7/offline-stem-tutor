import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import type { FlaggedItem } from "../types";

export function TeacherPanel() {
  const items = useLiveQuery(
    () => db.flaggedItems.orderBy("timestamp").reverse().toArray(),
    [],
    [] as FlaggedItem[]
  );
  const [correctionDraft, setCorrectionDraft] = useState<Record<string, string>>({});

  async function approve(item: FlaggedItem) {
    await db.flaggedItems.update(item.id, { teacherStatus: "approved" });
  }

  async function correct(item: FlaggedItem) {
    const correction = correctionDraft[item.id]?.trim();
    if (!correction) return;
    await db.flaggedItems.update(item.id, { teacherStatus: "corrected", correction });
  }

  const pending = items.filter((i) => i.teacherStatus === "pending");
  const resolved = items.filter((i) => i.teacherStatus !== "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-paper">Teacher review</h2>
        <p className="mt-1 text-sm text-muted">
          Low-confidence answers the tutor flagged itself, waiting for a human to approve or correct —
          works fully offline, syncs when the pod is back online.
        </p>
      </div>

      {pending.length === 0 && (
        <p className="rounded-card border border-white/5 bg-night-surface p-4 text-sm text-muted">
          Nothing pending review right now.
        </p>
      )}

      <div className="space-y-3">
        {pending.map((item) => (
          <div key={item.id} className="rounded-card border border-danger/30 bg-night-surface p-4">
            <p className="mono-label">flagged · {new Date(item.timestamp).toLocaleString()}</p>
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
                placeholder="Write a correction (optional)…"
                className="flex-1 rounded-card border border-white/10 bg-night px-3 py-2 text-sm text-paper placeholder:text-muted"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => approve(item)}
                  className="rounded-card border border-signal/40 px-3 py-2 text-xs font-medium text-signal"
                >
                  Approve as-is
                </button>
                <button
                  onClick={() => correct(item)}
                  className="rounded-card bg-solar px-3 py-2 text-xs font-medium text-night"
                >
                  Save correction
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <p className="mono-label mb-2">resolved</p>
          <div className="space-y-2">
            {resolved.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-card border border-white/5 bg-night px-3 py-2 text-xs"
              >
                <span className="text-paper/70">{item.question}</span>
                <span
                  className={
                    item.teacherStatus === "approved" ? "text-signal" : "text-solar"
                  }
                >
                  {item.teacherStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
