import { LEARNER_COLORS } from "../lib/learners";
import { useLearner } from "../learner/LearnerContext";
import { useLang } from "../i18n/LanguageContext";

const accentText: Record<string, string> = {
  solar: "text-solar",
  signal: "text-signal",
  paper: "text-paper",
  danger: "text-danger",
};

/**
 * Who is signed in, and a one-tap way to hand the device back.
 *
 * Always visible rather than tucked into a menu. On a shared phone the most
 * common mistake is a student starting to type into somebody else's session,
 * and the fix for that is making whose session it is impossible to miss.
 */
export function LearnerBadge() {
  const { t } = useLang();
  const { learner, signOut } = useLearner();
  if (!learner) return null;

  const accent = LEARNER_COLORS[learner.colorIndex % LEARNER_COLORS.length];

  return (
    <div className="flex items-center gap-2 rounded-card border border-white/5 bg-night-surface px-2.5 py-1.5">
      <span className={`font-display text-xs font-semibold ${accentText[accent]}`}>
        {learner.name}
      </span>
      <button
        onClick={signOut}
        className="font-mono text-[0.65rem] uppercase tracking-wide text-muted underline decoration-dotted underline-offset-2 hover:text-paper"
        title={t.switchLearnerTitle}
      >
        {t.switchLearner}
      </button>
    </div>
  );
}
