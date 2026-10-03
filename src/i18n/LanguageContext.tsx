import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { STRINGS, type Lang, type Strings } from "./strings";

const STORAGE_KEY = "stem-tutor:lang";

interface LanguageValue {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: Strings;
}

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * Choose the starting language from the device, then remember the override.
 *
 * A phone in Bamako is very likely already set to French, so defaulting to
 * the browser locale means the student never has to find a language switch —
 * which matters more than it sounds on a shared device where the next person
 * to pick it up did not set it.
 */
function initialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "fr") return stored;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  // Keep the document in sync so screen readers announce the right language
  // and the browser hyphenates correctly.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: STRINGS[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLang must be used inside LanguageProvider");
  return value;
}

/**
 * Read the current language outside React.
 *
 * The tutor pipeline (prompts, solver output, refusal messages) is plain
 * async code with no component tree above it, but its output is read by a
 * student and must be in their language. Reading from the same localStorage
 * key keeps one source of truth rather than threading a `lang` argument
 * through every call.
 */
export function currentLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "fr") return stored;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
}
