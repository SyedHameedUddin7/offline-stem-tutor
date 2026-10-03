import { useEffect, useRef, useState } from "react";
import {
  bundleFilename,
  exportBundle,
  getDeviceId,
  importBundle,
  pendingEventCount,
  replayOrphanedEvents,
  shortDeviceId,
} from "../lib/sync";
import { indexAnswerBank } from "../lib/retrieval";
import { useLang } from "../i18n/LanguageContext";
import type { MergeReport, SyncBundle } from "../types";

/**
 * Carry the pod's work between phones, with no network at all.
 *
 * A file rather than a cloud button, because the deployment this targets can
 * lose signal for days: a facilitator exports from a student's phone, carries
 * the file, imports on their own. The same two functions would sit behind a
 * WebRTC channel or an HTTP endpoint — the transport is the easy half.
 */
export function SyncPanel() {
  const { t } = useLang();
  const [deviceId, setDeviceId] = useState("");
  const [pending, setPending] = useState(0);
  const [report, setReport] = useState<MergeReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setPending(await pendingEventCount());
  }

  useEffect(() => {
    getDeviceId().then(setDeviceId).catch(() => undefined);
    refresh().catch(() => undefined);
  }, []);

  async function doExport(all: boolean) {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const bundle = await exportBundle(all);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = bundleFilename(bundle);
      link.click();
      // Revoked on the next tick rather than immediately: Safari aborts the
      // download if the blob is released before it has started reading.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function doImport(file: File) {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const parsed = JSON.parse(await file.text()) as SyncBundle;
      const merged = await importBundle(parsed);
      // A resolution can arrive before the flag it refers to; this picks those
      // up now that their targets may exist.
      await replayOrphanedEvents();
      // Anything new from another device arrives without a vector, by design.
      if (merged.needsIndexing > 0) {
        await indexAnswerBank().catch((err) =>
          console.warn("Imported items will be indexed on next use", err)
        );
      }
      setReport(merged);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-card border border-white/10 bg-night-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-paper">{t.syncTitle}</h3>
        <span className="mono-label">
          {t.syncThisDevice}: {deviceId ? shortDeviceId(deviceId) : "…"}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{t.syncBlurb}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => doExport(false)}
          disabled={busy || pending === 0}
          className="rounded-card bg-solar px-3 py-2 text-xs font-medium text-night disabled:opacity-40"
        >
          {pending > 0 ? t.syncExportPending(pending) : t.syncNothingPending}
        </button>
        <button
          onClick={() => doExport(true)}
          disabled={busy}
          className="rounded-card border border-white/15 px-3 py-2 text-xs text-paper disabled:opacity-40"
        >
          {t.syncExportAll}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-card border border-signal/40 px-3 py-2 text-xs font-medium text-signal disabled:opacity-40"
        >
          {t.syncImport}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) doImport(file);
          }}
        />
      </div>

      {report && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-card border border-signal/20 bg-signal/5 p-3 text-xs sm:grid-cols-4">
          {(
            [
              [t.syncReceived, report.received],
              [t.syncApplied, report.applied],
              [t.syncDuplicates, report.duplicates],
              [t.syncSuperseded, report.superseded],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="mono-label">{label}</dt>
              <dd className="font-display text-base text-paper">{value}</dd>
            </div>
          ))}
          {report.needsIndexing > 0 && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-[0.7rem] text-signal">
                {t.syncNewExemplars(report.needsIndexing)}
              </p>
            </div>
          )}
        </dl>
      )}

      {error && <p className="mt-3 break-words font-mono text-[0.7rem] text-danger">{error}</p>}

      <p className="mt-3 border-t border-white/5 pt-2.5 text-[0.7rem] leading-relaxed text-muted/80">
        {t.syncNote}
      </p>
    </div>
  );
}
