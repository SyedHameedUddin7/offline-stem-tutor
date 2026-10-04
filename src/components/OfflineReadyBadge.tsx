import { useEffect, useState } from "react";
import { applyUpdate, getSwState, onSwState, type SwState } from "../lib/serviceWorker";
import { useLang } from "../i18n/LanguageContext";

/**
 * Says, out loud, whether this device can be disconnected yet.
 *
 * The question this answers — "is it safe to go offline now?" — previously
 * had no answer anywhere in the interface. The service worker installs in
 * the background, takes a moment to cache the shell, and says nothing. A
 * facilitator who closes the laptop too early finds out in the field.
 */
export function OfflineReadyBadge() {
  const { t } = useLang();
  const [state, setState] = useState<SwState>(getSwState());

  useEffect(() => onSwState(setState), []);

  if (state === "update-available") {
    return (
      <button
        onClick={() => applyUpdate()}
        className="flex items-center gap-1.5 rounded-card border border-solar/40 bg-solar/10 px-2.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-solar"
      >
        {t.swUpdate}
      </button>
    );
  }

  const tone =
    state === "offline-ready"
      ? "border-signal/30 bg-signal/5 text-signal"
      : state === "unavailable"
        ? "border-danger/30 bg-danger/5 text-danger"
        : "border-white/10 bg-night-surface text-muted";

  const label =
    state === "offline-ready"
      ? t.swOfflineReady
      : state === "unavailable"
        ? t.swUnavailable
        : t.swCaching;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-card border px-2.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-wide ${tone}`}
      role="status"
      aria-live="polite"
      title={state === "offline-ready" ? t.swOfflineReadyHint : t.swCachingHint}
    >
      {state === "offline-ready" ? "✓" : state === "unavailable" ? "×" : "…"} {label}
    </div>
  );
}
