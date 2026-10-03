import { useCallback, useEffect, useState } from "react";
import {
  formatBytes,
  getReadinessReport,
  requestPersistentStorage,
  type ReadinessCheck,
  type ReadinessReport,
} from "../lib/readiness";
import { indexAnswerBank } from "../lib/retrieval";
import { indexReferenceNotes } from "../lib/reference";
import { useLang } from "../i18n/LanguageContext";
import type { Strings } from "../i18n/strings";

/**
 * The screen a facilitator checks before driving out of coverage.
 *
 * Deliberately more than a status list: every row that can be fixed from here
 * offers the fix. A checklist that reports a problem and leaves you to work
 * out the remedy has moved the work rather than done it.
 */

const MARK: Record<ReadinessCheck["level"], { glyph: string; className: string }> = {
  ready: { glyph: "✓", className: "text-signal" },
  partial: { glyph: "!", className: "text-solar" },
  missing: { glyph: "×", className: "text-danger" },
  unknown: { glyph: "?", className: "text-muted" },
};

function label(check: ReadinessCheck, t: Strings): string {
  switch (check.id) {
    case "service-worker":
      return t.readySw;
    case "persistent-storage":
      return t.readyPersist;
    case "answer-bank":
      return t.readyBank;
    case "reference-notes":
      return t.readyNotes;
    case "search-model":
      return t.readySearchModel;
    case "language-model":
      return t.readyLanguageModel;
    case "lesson-videos":
      return t.readyVideos;
    case "storage-space":
      return t.readyStorage;
  }
}

function detail(check: ReadinessCheck, t: Strings): string {
  if (check.bytes !== undefined) return t.readyFreeSpace(formatBytes(check.bytes));
  if (check.have !== undefined && check.need !== undefined) {
    return `${check.have} / ${check.need}`;
  }
  if (check.id === "service-worker" && check.have !== undefined) {
    return t.readyCachedFiles(check.have);
  }
  return check.level === "ready" ? t.readyYes : t.readyNo;
}

export function OfflineReadiness() {
  const { t } = useLang();
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReport(await getReadinessReport());
  }, []);

  useEffect(() => {
    refresh().catch((err) => console.error("Could not assess offline readiness", err));
  }, [refresh]);

  async function runIndexing() {
    setBusy("index");
    try {
      await indexAnswerBank();
      await indexReferenceNotes();
      await refresh();
    } catch (err) {
      console.error("Indexing failed", err);
    } finally {
      setBusy(null);
    }
  }

  async function keepData() {
    setBusy("persist");
    try {
      await requestPersistentStorage();
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!report) return <div aria-busy="true" className="min-h-[8rem]" />;

  const blocking = report.checks.filter((c) => c.required && c.level !== "ready");
  const needsIndexing = report.checks.some(
    (c) => (c.id === "answer-bank" || c.id === "reference-notes") && c.level !== "ready"
  );
  const needsPersistence = report.checks.some(
    (c) => c.id === "persistent-storage" && c.level === "missing"
  );

  return (
    <section className="rounded-card border border-white/10 bg-night-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-paper">{t.readyTitle}</h3>
        <button
          onClick={() => refresh()}
          className="font-mono text-[0.65rem] uppercase tracking-wide text-muted underline decoration-dotted underline-offset-2 hover:text-paper"
        >
          {t.readyRecheck}
        </button>
      </div>

      <div
        className={`mt-3 rounded-card border px-3 py-2.5 ${
          report.readyForOffline
            ? "border-signal/30 bg-signal/5"
            : "border-danger/30 bg-danger/5"
        }`}
      >
        <p
          className={`font-display text-sm font-semibold ${
            report.readyForOffline ? "text-signal" : "text-danger"
          }`}
        >
          {report.readyForOffline ? t.readyVerdictYes : t.readyVerdictNo}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {report.readyForOffline
            ? t.readyVerdictYesBody
            : t.readyVerdictNoBody(blocking.map((c) => label(c, t)).join(", "))}
        </p>
      </div>

      <ul className="mt-3 space-y-1">
        {report.checks.map((check) => (
          <li
            key={check.id}
            className="flex items-baseline gap-2.5 border-t border-white/5 py-1.5 text-xs first:border-t-0"
          >
            <span
              aria-hidden="true"
              className={`w-3 shrink-0 text-center font-mono ${MARK[check.level].className}`}
            >
              {MARK[check.level].glyph}
            </span>
            <span className="flex-1 text-paper/85">
              {label(check, t)}
              {/* Optional rows say so, so a facilitator is not told the device
                  is broken because it lacks a 1.6GB download. */}
              {!check.required && <span className="text-muted"> · {t.readyOptional}</span>}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-muted">
              {detail(check, t)}
            </span>
          </li>
        ))}
      </ul>

      {(needsIndexing || needsPersistence) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
          {needsIndexing && (
            <button
              onClick={runIndexing}
              disabled={busy !== null}
              className="rounded-card bg-solar px-3 py-2 text-xs font-medium text-night disabled:opacity-40"
            >
              {busy === "index" ? t.readyIndexing : t.readyIndexNow}
            </button>
          )}
          {needsPersistence && (
            <button
              onClick={keepData}
              disabled={busy !== null}
              className="rounded-card border border-signal/40 px-3 py-2 text-xs font-medium text-signal disabled:opacity-40"
            >
              {busy === "persist" ? t.readyAsking : t.readyKeepData}
            </button>
          )}
        </div>
      )}

      <p className="mt-3 border-t border-white/5 pt-2.5 text-[0.7rem] leading-relaxed text-muted/80">
        {t.readyNote}
      </p>
    </section>
  );
}
