import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  getLockoutStatus,
  hasFacilitatorPin,
  setFacilitatorPin,
  validatePinFormat,
  verifyFacilitatorPin,
} from "../lib/facilitator";
import { useLang } from "../i18n/LanguageContext";

type Phase = "checking" | "setup" | "locked" | "unlocked";

/**
 * Gates the review queue behind a facilitator PIN.
 *
 * Two deliberate choices:
 *
 * The unlock is held in component state, not persisted. Reloading or closing
 * the tab re-locks. On a device that changes hands several times an hour, a
 * facilitator session that survives a reload is a facilitator session a
 * student inherits.
 *
 * There is no "forgot my PIN" reset. With no server, a reset reachable from
 * inside the app is just a second unlocked door. The UI says so, and says
 * what the actual recovery is, including what it costs.
 */
export function FacilitatorGate({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>("checking");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hasFacilitatorPin()
      .then(async (exists) => {
        setPhase(exists ? "locked" : "setup");
        if (exists) {
          const status = await getLockoutStatus();
          setCooldownMs(status.remainingMs);
        }
      })
      .catch((err) => {
        console.error("Could not read the facilitator credential", err);
        setPhase("setup");
      });
  }, []);

  // Tick the cooldown down so the facilitator can see it clear, rather than
  // retrying blindly into a wall.
  useEffect(() => {
    if (cooldownMs <= 0) return;
    const timer = setInterval(() => {
      setCooldownMs((ms) => Math.max(0, ms - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownMs]);

  useEffect(() => {
    if (phase === "locked" || phase === "setup") inputRef.current?.focus();
  }, [phase]);

  const describeProblem = useCallback(
    (problem: string) => {
      switch (problem) {
        case "digits-only":
          return t.pinDigitsOnly;
        case "length":
          return t.pinLength(PIN_MIN_LENGTH, PIN_MAX_LENGTH);
        case "repeated":
          return t.pinRepeated;
        case "sequential":
          return t.pinSequential;
        default:
          return t.pinInvalid;
      }
    },
    [t]
  );

  async function submitSetup(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const problem = validatePinFormat(pin);
    if (problem) return setError(describeProblem(problem));
    if (pin !== confirm) return setError(t.pinMismatch);

    setBusy(true);
    setError(null);
    try {
      await setFacilitatorPin(pin);
      setPin("");
      setConfirm("");
      setPhase("unlocked");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (busy || cooldownMs > 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await verifyFacilitatorPin(pin);
      if (result.success) {
        setPin("");
        setAttemptsLeft(null);
        setPhase("unlocked");
        return;
      }
      setPin("");
      if (result.lockedOut) {
        setCooldownMs(result.remainingMs ?? 0);
        setError(null);
      } else {
        setAttemptsLeft(result.attemptsLeft ?? null);
        setError(t.pinWrong);
      }
    } finally {
      setBusy(false);
    }
  }

  if (phase === "checking") return <div aria-busy="true" className="min-h-[12rem]" />;

  if (phase === "unlocked") {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between gap-2 rounded-card border border-signal/20 bg-signal/5 px-3 py-2">
          <span className="font-mono text-[0.7rem] uppercase tracking-wide text-signal">
            {t.facilitatorUnlocked}
          </span>
          <button
            onClick={() => setPhase("locked")}
            className="font-mono text-[0.65rem] uppercase tracking-wide text-muted underline decoration-dotted underline-offset-2 hover:text-paper"
          >
            {t.lockAgain}
          </button>
        </div>
        {children}
      </div>
    );
  }

  const isSetup = phase === "setup";

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-card border border-white/10 bg-night-surface p-5">
        <h2 className="font-display text-lg font-semibold text-paper">
          {isSetup ? t.setPinTitle : t.enterPinTitle}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {isSetup ? t.setPinBlurb : t.enterPinBlurb}
        </p>

        <form onSubmit={isSetup ? submitSetup : submitUnlock} className="mt-4 space-y-2.5">
          <input
            ref={inputRef}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH))}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder={isSetup ? t.pinPlaceholderNew : t.pinPlaceholder}
            disabled={busy || cooldownMs > 0}
            className="w-full rounded-card border border-white/10 bg-night px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-paper placeholder:tracking-normal placeholder:font-body placeholder:text-sm placeholder:text-muted focus:border-signal/50 disabled:opacity-40"
          />

          {isSetup && (
            <input
              value={confirm}
              onChange={(e) =>
                setConfirm(e.target.value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH))
              }
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t.pinPlaceholderConfirm}
              className="w-full rounded-card border border-white/10 bg-night px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-paper placeholder:tracking-normal placeholder:font-body placeholder:text-sm placeholder:text-muted focus:border-signal/50"
            />
          )}

          <button
            type="submit"
            disabled={busy || cooldownMs > 0 || pin.length < PIN_MIN_LENGTH}
            className="w-full rounded-card bg-solar px-4 py-2.5 text-sm font-medium text-night disabled:opacity-40"
          >
            {busy ? t.pinChecking : isSetup ? t.setPinAction : t.unlockAction}
          </button>
        </form>

        {cooldownMs > 0 && (
          <p className="mt-3 rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {t.pinLockedOut(Math.ceil(cooldownMs / 1000))}
          </p>
        )}

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}

        {attemptsLeft !== null && attemptsLeft > 0 && !error && (
          <p className="mt-2 text-xs text-muted">{t.pinAttemptsLeft(attemptsLeft)}</p>
        )}

        {/* Said plainly, in the place where someone would look for a reset
            link, because there isn't one and pretending otherwise wastes
            their time. */}
        <p className="mt-4 border-t border-white/5 pt-3 text-[0.7rem] leading-relaxed text-muted/80">
          {isSetup ? t.pinSetupNote : t.pinForgotNote}
        </p>
      </div>
    </div>
  );
}
