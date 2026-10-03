import { LanguageToggle } from "./LanguageToggle";
import { LowBandwidthNotice } from "./LowBandwidthNotice";
import { useLang } from "../i18n/LanguageContext";

/**
 * The first ten seconds.
 *
 * Someone opening this link cold — a recruiter, a facilitator evaluating it —
 * needs to know what it is and why it is built this way before they are asked
 * to pick a name. One screen, one button, no technical detail: the
 * architecture belongs in the README, not in a student's way.
 *
 * Shown once per device. After a learner has been created the app opens on
 * the picker, because by then the pitch has been made and a student in a pod
 * should not have to walk past a marketing page every morning.
 */
export function Landing({ onStart }: { onStart: () => void }) {
  const { t } = useLang();

  const features = [
    { title: t.landingF1, body: t.landingF1Body },
    { title: t.landingF2, body: t.landingF2Body },
    { title: t.landingF3, body: t.landingF3Body },
    { title: t.landingF4, body: t.landingF4Body },
    { title: t.landingF5, body: t.landingF5Body },
    { title: t.landingF6, body: t.landingF6Body },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-8 flex justify-end">
        <LanguageToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="mono-label">{t.appKicker}</p>
        <h1 className="mt-2 max-w-xl font-display text-3xl font-semibold leading-tight text-paper sm:text-4xl">
          {t.landingTagline}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.landingBody}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onStart}
            className="rounded-card bg-solar px-5 py-3 text-sm font-semibold text-night"
          >
            {t.landingStart}
          </button>
          {/* The single most important thing to say to someone who has just
              been told there is a 1.6GB model somewhere in here. */}
          <span className="font-mono text-[0.7rem] uppercase tracking-wide text-signal">
            {t.landingNoDownload}
          </span>
        </div>

        <div className="mt-4">
          <LowBandwidthNotice />
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f.title} className="rounded-card border border-white/5 bg-night-surface p-3.5">
              <p className="font-display text-sm font-semibold text-paper">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
