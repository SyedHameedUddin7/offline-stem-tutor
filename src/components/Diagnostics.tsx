import { useEffect, useState } from "react";
import { detectCapability, isLowBandwidth, type DeviceCapability } from "../lib/capability";
import { getReadinessReport, formatBytes, type ReadinessReport } from "../lib/readiness";
import { getSwState, type SwState } from "../lib/serviceWorker";
import { getInstallState, type InstallState } from "../lib/install";
import { getPersistenceState, type PersistenceState } from "../lib/storagePersistence";
import { getLlmStatus, type LlmStatus } from "../lib/llm";
import { getEmbedderStatus, type EmbedderStatus } from "../lib/embeddings";
import { db } from "../lib/db";
import { useLang } from "../i18n/LanguageContext";

/**
 * Everything needed to diagnose a device, on one copyable screen.
 *
 * Built for the case this project is actually for: a facilitator reports
 * that a phone "doesn't work" from somewhere with no connectivity and no
 * way to open devtools. A copyable block they can send is the difference
 * between fixing it and guessing.
 *
 * Contains no learner names, no questions and no answers — only capability
 * facts. Device diagnostics should never become a route for student data
 * to leave the device.
 */
interface Snapshot {
  capability: DeviceCapability | null;
  readiness: ReadinessReport | null;
  sw: SwState;
  install: InstallState;
  persistence: PersistenceState;
  llm: LlmStatus;
  embedder: EmbedderStatus;
  counts: { learners: number; messages: number; bankItems: number; notes: number };
}

export function Diagnostics() {
  const { t } = useLang();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [capability, readiness, learners, messages, bankItems, notes] = await Promise.all([
        detectCapability().catch(() => null),
        getReadinessReport().catch(() => null),
        db.learners.count().catch(() => -1),
        db.messages.count().catch(() => -1),
        db.reasoningItems.count().catch(() => -1),
        db.referenceNotes.count().catch(() => -1),
      ]);
      setSnap({
        capability,
        readiness,
        sw: getSwState(),
        install: getInstallState(),
        persistence: getPersistenceState(),
        llm: getLlmStatus(),
        embedder: getEmbedderStatus(),
        counts: { learners, messages, bankItems, notes },
      });
    })();
  }, []);

  if (!snap) return <div aria-busy="true" className="min-h-[8rem]" />;

  const { capability: cap, counts } = snap;
  const rows: Array<[string, string]> = [
    ["user agent", navigator.userAgent],
    ["language", navigator.language],
    ["online", String(navigator.onLine)],
    ["display mode", snap.install === "installed" ? "installed (standalone)" : "browser tab"],
    ["install state", snap.install],
    ["service worker", snap.sw],
    ["storage persisted", snap.persistence],
    ["WebGPU", cap ? String(cap.webgpu) : "unknown"],
    ["WASM", String(typeof WebAssembly !== "undefined")],
    ["IndexedDB", String(typeof indexedDB !== "undefined")],
    ["Cache API", String("caches" in window)],
    ["connection", cap?.effectiveType ?? "unknown"],
    ["save-data", cap ? String(cap.saveData) : "unknown"],
    ["low bandwidth", cap ? String(isLowBandwidth(cap)) : "unknown"],
    ["free storage", cap?.storageEstimateBytes != null ? formatBytes(cap.storageEstimateBytes) : "unknown"],
    ["embedder", snap.embedder.state],
    ["language model", snap.llm.state],
    ["offline ready", snap.readiness ? String(snap.readiness.readyForOffline) : "unknown"],
    ["learners", String(counts.learners)],
    ["messages", String(counts.messages)],
    ["bank items", String(counts.bankItems)],
    ["reference notes", String(counts.notes)],
    ["app version", __APP_VERSION__],
  ];

  const asText = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

  return (
    <section className="rounded-card border border-white/10 bg-night-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-paper">{t.diagTitle}</h3>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(asText);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
          className="font-mono text-[0.65rem] uppercase tracking-wide text-muted underline decoration-dotted underline-offset-2 hover:text-paper"
        >
          {copied ? t.diagCopied : t.diagCopy}
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t.diagBlurb}</p>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 text-xs sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-t border-white/5 py-1">
            <dt className="shrink-0 text-muted">{k}</dt>
            <dd className="truncate text-right font-mono text-paper/85" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
