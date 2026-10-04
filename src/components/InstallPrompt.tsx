import { useEffect, useState } from "react";
import {
  getInstallState,
  onInstallState,
  promptInstall,
  type InstallState,
} from "../lib/install";
import { useLang } from "../i18n/LanguageContext";

/**
 * Tells a phone user the one thing that makes their work survive.
 *
 * Framed around durability rather than "add to home screen", because the
 * reason to do it here is not convenience — it is that an uninstalled
 * mobile browser may discard the learners, the answers and the downloaded
 * models when it closes.
 */
export function InstallPrompt() {
  const { t } = useLang();
  const [state, setState] = useState<InstallState>(getInstallState());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onInstallState(setState), []);

  if (dismissed || state === "installed" || state === "unavailable") return null;

  // An in-app browser is the serious case: nothing the page can do fixes it,
  // and the user has to leave. Said in red, with no dismiss-and-forget.
  if (state === "in-app-browser") {
    return (
      <div className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2.5">
        <p className="font-mono text-[0.7rem] uppercase tracking-wide text-danger">
          {t.installInAppTitle}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t.installInAppBody}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-signal/25 bg-signal/5 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[0.7rem] uppercase tracking-wide text-signal">
            {t.installTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {state === "manual-ios" ? t.installIosBody : t.installBody}
          </p>
        </div>
        {state === "available" && (
          <button
            onClick={() => promptInstall()}
            className="shrink-0 rounded-card bg-signal px-3 py-2 text-xs font-medium text-night"
          >
            {t.installAction}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          aria-label={t.cancel}
          className="shrink-0 px-1 text-muted hover:text-paper"
        >
          ×
        </button>
      </div>
    </div>
  );
}
