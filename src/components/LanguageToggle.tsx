import { LANGUAGES } from "../i18n/strings";
import { useLang } from "../i18n/LanguageContext";

/**
 * A two-state switch, always visible, never behind a settings menu.
 *
 * On a shared phone the next student to pick it up did not choose the
 * previous one's language, so switching has to be a one-tap action in reach
 * — not something you navigate to. It is also the control an interviewer will
 * press first, which is a fair enough reason to keep it in the header.
 */
export function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <div
      className="flex rounded-card border border-white/5 bg-night-surface p-1"
      role="group"
      aria-label="Language / Langue"
    >
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          lang={code}
          className={`rounded-card px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide transition-colors ${
            lang === code ? "bg-night-raised text-paper" : "text-muted hover:text-paper"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
