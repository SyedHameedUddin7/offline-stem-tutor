import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { LEARNER_COLORS } from "../lib/learners";
import { useLearner } from "../learner/LearnerContext";
import { useLang } from "../i18n/LanguageContext";
import { StorageWarning } from "./StorageWarning";
import { InstallPrompt } from "./InstallPrompt";
import type { Learner } from "../types";

const accentRing: Record<string, string> = {
  solar: "border-solar/40 hover:border-solar text-solar",
  signal: "border-signal/40 hover:border-signal text-signal",
  paper: "border-paper/30 hover:border-paper/70 text-paper",
  danger: "border-danger/40 hover:border-danger text-danger",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
}

/**
 * "Who's learning today?"
 *
 * The first screen on a shared device, and deliberately not a login. No
 * password, no email, no server round trip — a name and a colour. The whole
 * interaction is two taps because it happens every time the phone changes
 * hands, which in a pod is several times an hour.
 *
 * Large targets and high contrast throughout: the device is a cracked
 * low-end Android, possibly in bright sunlight.
 */
export function LearnerPicker() {
  const { t } = useLang();
  const { select, create, remove } = useLearner();
  const learners = useLiveQuery(
    () => db.learners.orderBy("lastActiveAt").reverse().toArray(),
    [],
    [] as Learner[]
  );

  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addLearner() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await create(name);
      setName("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const showForm = adding || learners.length === 0;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center py-8">
      <div className="mb-6">
        <p className="mono-label">{t.appKicker}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-paper">
          {t.whoIsLearning}
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">{t.learnerPickerBlurb}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {learners.map((learner) => {
          const accent = LEARNER_COLORS[learner.colorIndex % LEARNER_COLORS.length];
          const isConfirming = confirmDelete === learner.id;
          return (
            <div key={learner.id} className="relative">
              <button
                onClick={() => select(learner)}
                className={`flex min-h-[7rem] w-full flex-col items-center justify-center gap-2 rounded-card border bg-night-surface p-4 transition-colors ${accentRing[accent]}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-current font-display text-lg font-semibold">
                  {initials(learner.name)}
                </span>
                <span className="max-w-full truncate text-sm font-medium text-paper">
                  {learner.name}
                </span>
              </button>

              {/* Removing a learner is a real action on a shared device — a
                  student leaves the pod and their conversations go with them.
                  Two-step, because it deletes their work. */}
              {isConfirming ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-card border border-danger/50 bg-night p-3">
                  <p className="text-center text-[0.7rem] leading-snug text-paper/80">
                    {t.deleteLearnerConfirm(learner.name)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await remove(learner.id);
                        setConfirmDelete(null);
                      }}
                      className="rounded-card bg-danger px-2.5 py-1 text-[0.7rem] font-medium text-night"
                    >
                      {t.deleteLearnerYes}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-card border border-white/20 px-2.5 py-1 text-[0.7rem] text-paper"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(learner.id)}
                  aria-label={t.deleteLearnerAria(learner.name)}
                  className="absolute right-1.5 top-1.5 h-7 w-7 rounded-card text-sm text-muted/60 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {!showForm && (
          <button
            onClick={() => setAdding(true)}
            className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-white/20 p-4 text-muted transition-colors hover:border-white/40 hover:text-paper"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-current text-xl">
              +
            </span>
            <span className="text-sm font-medium">{t.newLearner}</span>
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addLearner();
          }}
          className="mt-4 rounded-card border border-white/10 bg-night-surface p-4"
        >
          <label htmlFor="learner-name" className="mono-label">
            {t.newLearner}
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="learner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.learnerNamePlaceholder}
              maxLength={40}
              autoFocus
              className="min-w-0 flex-1 rounded-card border border-white/10 bg-night px-3 py-2.5 text-sm text-paper placeholder:text-muted focus:border-signal/50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!name.trim() || busy}
                className="rounded-card bg-solar px-4 py-2.5 text-sm font-medium text-night disabled:opacity-40"
              >
                {t.startLearning}
              </button>
              {learners.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setName("");
                  }}
                  className="rounded-card border border-white/15 px-3 py-2.5 text-sm text-paper"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          </div>
          {error && <p className="mt-2 font-mono text-[0.7rem] text-danger">{error}</p>}
        </form>
      )}

      <div className="mt-5 space-y-2">
        <InstallPrompt />
        <StorageWarning />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted/80">{t.learnerPrivacyNote}</p>
    </div>
  );
}
