import { useCapability } from "../hooks/useCapability";
import { useLang } from "../i18n/LanguageContext";

/**
 * Shown only when the connection is slow or the user has asked the OS to
 * save data. Informational, never blocking — see isLowBandwidth().
 */
export function LowBandwidthNotice() {
  const { t } = useLang();
  const { lowBandwidth } = useCapability();
  if (!lowBandwidth) return null;

  return (
    <div className="rounded-card border border-solar/25 bg-solar/5 px-3 py-2">
      <p className="font-mono text-[0.7rem] uppercase tracking-wide text-solar">
        {t.lowBandwidth}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.lowBandwidthBlurb}</p>
    </div>
  );
}
