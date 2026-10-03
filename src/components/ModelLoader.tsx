import { useEffect, useState } from "react";
import {
  DEFAULT_MODEL_ID,
  MODELS,
  getLlmStatus,
  initLlm,
  isModelCached,
  onLlmStatus,
  suggestModel,
  unloadLlm,
  type LlmStatus,
} from "../lib/llm";
import { useLang } from "../i18n/LanguageContext";
import { useCapability } from "../hooks/useCapability";
import { estimateMinutes } from "../lib/capability";

/**
 * The model download, made an explicit decision instead of a surprise.
 *
 * An app that quietly pulls 1.6GB the first time a student opens it has
 * misunderstood who it is for. The size is stated before the tap, the
 * progress is visible during, and the fact that it only ever happens once is
 * said out loud — because on a metered connection that is the single most
 * important property of the whole design.
 */
export function ModelLoader() {
  const { t } = useLang();
  const { capability, lowBandwidth } = useCapability();
  const [status, setStatus] = useState<LlmStatus>(getLlmStatus());
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [cached, setCached] = useState<Record<string, boolean>>({});

  useEffect(() => onLlmStatus(setStatus), []);

  useEffect(() => {
    suggestModel()
      .then((choice) => setModelId(choice.id))
      .catch(() => setModelId(DEFAULT_MODEL_ID));
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all(MODELS.map(async (m) => [m.id, await isModelCached(m.id)] as const))
      .then((pairs) => live && setCached(Object.fromEntries(pairs)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [status.state]);

  if (status.state === "ready") {
    const active = MODELS.find((m) => m.id === status.modelId);
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-signal/25 bg-signal/5 px-3 py-2">
        <span className="font-mono text-[0.7rem] uppercase tracking-wide text-signal">
          {t.modelReady} · {active?.label ?? status.modelId}
        </span>
        <button
          onClick={() => unloadLlm()}
          className="font-mono text-[0.65rem] uppercase tracking-wide text-muted underline decoration-dotted underline-offset-2 hover:text-paper"
          // Freeing ~1.6GB of VRAM matters on a phone that is also running
          // three other apps.
          title={t.unloadTitle}
        >
          {t.unload}
        </button>
      </div>
    );
  }

  if (status.state === "loading") {
    const pct = Math.round(status.progress * 100);
    return (
      <div className="rounded-card border border-solar/25 bg-solar/5 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[0.7rem] uppercase tracking-wide text-solar">
            {t.modelLoading} · {pct}%
          </span>
          <span className="truncate font-mono text-[0.625rem] text-muted">{status.note}</span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-solar transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (status.state === "unsupported") {
    return (
      <div className="rounded-card border border-white/10 bg-night-surface px-3 py-2.5">
        <p className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">
          {t.noWebgpu}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-paper/70">
{status.reason} {t.noWebgpuBody}
        </p>
      </div>
    );
  }

  const selected = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
  const alreadyHave = cached[selected.id];

  return (
    <div className="rounded-card border border-white/10 bg-night-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[0.7rem] uppercase tracking-wide text-paper/80">
            {t.modelNotLoaded}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {alreadyHave ? t.alreadyDownloaded : t.oneDownload(selected.downloadMB)}
          </p>
          {/* On a slow or metered link, say what the download will actually
              cost in time before the tap rather than after. */}
          {!alreadyHave && lowBandwidth && (() => {
            const mins = estimateMinutes(selected.downloadMB, capability?.effectiveType ?? null);
            return (
              <p className="mt-0.5 font-mono text-[0.7rem] text-solar">
                {mins === null
                  ? t.costPlain(selected.downloadMB)
                  : t.costEstimate(selected.downloadMB, mins)}
              </p>
            );
          })()}
        </div>
        <button
          onClick={() => initLlm(selected.id).catch(() => undefined)}
          className="shrink-0 rounded-card bg-solar px-3 py-2 text-xs font-medium text-night"
        >
          {alreadyHave ? t.loadModel : t.downloadMb(selected.downloadMB)}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 border-t border-white/5 pt-2">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModelId(m.id)}
            aria-pressed={m.id === modelId}
            className={`rounded-card border px-2.5 py-1 text-left text-[0.65rem] transition-colors ${
              m.id === modelId
                ? "border-solar/50 bg-solar/10 text-solar"
                : "border-white/10 text-muted hover:border-white/25 hover:text-paper"
            }`}
          >
            <span className="font-medium">{m.label}</span>{" "}
            <span className="opacity-70">
              {m.downloadMB}MB{cached[m.id] ? ` · ${t.onDevice}` : ""}
            </span>
          </button>
        ))}
      </div>

      {status.state === "failed" && (
        <p className="mt-2 break-words font-mono text-[0.65rem] text-danger">{status.error}</p>
      )}
    </div>
  );
}
