import { useConnectivity } from "../hooks/useConnectivity";
import { useLang } from "../i18n/LanguageContext";

/**
 * This is the signature element the design brief called for: not a generic
 * green/red dot, but a radio-wave readout — because "signal" is literally
 * the subject of this project. It should be the first thing anyone notices,
 * and the thing you toggle live in a demo (airplane mode) to make the point.
 */
export function ConnectivityIndicator() {
  const status = useConnectivity();
  const { t } = useLang();
  const isOnline = status === "online";

  return (
    <div
      className="flex items-center gap-2.5 rounded-card border border-white/5 bg-night-surface/80 px-3 py-1.5 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
        {/* Three arcs — a radio signal glyph. Dims to a single flat bar offline. */}
        {isOnline ? (
          <>
            <path
              d="M2 12.5C2 12.5 4 9 10 9C16 9 18 12.5 18 12.5"
              stroke="#4FD1C5"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path
              d="M4.5 12.5C4.5 12.5 6 10.5 10 10.5C14 10.5 15.5 12.5 15.5 12.5"
              stroke="#4FD1C5"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.75"
            />
            <circle cx="10" cy="13" r="1.4" fill="#4FD1C5" />
          </>
        ) : (
          <>
            <line x1="2" y1="13" x2="18" y2="13" stroke="#6B7394" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="10" cy="13" r="1.4" fill="#6B7394" />
          </>
        )}
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`font-mono text-[0.7rem] font-medium ${
            isOnline ? "text-signal" : "text-muted"
          }`}
        >
          {isOnline ? t.signalDetected : t.noSignal}
        </span>
        <span className="mt-0.5 text-[0.625rem] text-muted/80">
          {isOnline ? t.syncingAvailable : t.runsOnDevice}
        </span>
      </div>
    </div>
  );
}
