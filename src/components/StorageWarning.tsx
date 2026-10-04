import { useEffect, useState } from "react";
import {
  ensurePersisted,
  getPersistenceState,
  onPersistenceState,
  type PersistenceState,
} from "../lib/storagePersistence";
import { useLang } from "../i18n/LanguageContext";

/**
 * Warns when the browser has not promised to keep this device's data.
 *
 * Shown to everyone, not hidden behind the facilitator PIN, because the
 * person who loses a term of work is the student. Silence here is what
 * turned "the browser cleared my storage" into "the app lost my data".
 */
export function StorageWarning() {
  const { t } = useLang();
  const [state, setState] = useState<PersistenceState>(getPersistenceState());
  const [busy, setBusy] = useState(false);

  useEffect(() => onPersistenceState(setState), []);

  // "unknown" means we have not checked yet; "unsupported" means the browser
  // offers no such guarantee and there is nothing useful to tell the user.
  if (state !== "denied") return null;

  return (
    <div className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2.5">
      <p className="font-mono text-[0.7rem] uppercase tracking-wide text-danger">
        {t.storageAtRisk}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t.storageAtRiskBody}</p>
      <button
        onClick={async () => {
          setBusy(true);
          try {
            await ensurePersisted();
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="mt-2 rounded-card border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger disabled:opacity-40"
      >
        {busy ? t.readyAsking : t.storageAtRiskAction}
      </button>
    </div>
  );
}
