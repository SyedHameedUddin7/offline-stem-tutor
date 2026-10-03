import { useEffect, useState } from "react";
import {
  getChaptersNeedingAttention,
  getLearnerSummaries,
  getPodSummary,
  type ChapterAttention,
  type LearnerSummary,
  type PodSummary,
} from "../lib/insights";
import { getSubject, localizedSubject, resolveLocalizedChapter } from "../data/subjects";
import { useLang } from "../i18n/LanguageContext";

/**
 * What a facilitator needs before their next ten minutes.
 *
 * Every number here is derived from data the app actually holds. There is no
 * mastery score and no XP, because nothing in this system knows whether a
 * student's answer was right — inventing a percentage would make the
 * dashboard look more complete and be a fabrication.
 *
 * The honest substitute is UNVERIFIED COVERAGE: how many answers came from
 * the language model with no human or solver behind them. Real, actionable,
 * and it does not pretend to measure learning.
 */

/** Sentence-case label, value in the body sans — not the display face. */
function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border border-white/5 bg-night p-3">
      <p className="mono-label">{label}</p>
      {/* Proportional figures, not tabular: tabular-nums gives every digit the
          width of a zero, which reads loose at display sizes. Tabular is for
          the columns further down. */}
      <p className="mt-1 font-body text-xl font-semibold text-paper">{value}</p>
    </div>
  );
}

/**
 * One ratio against its total.
 *
 * A meter rather than a four-slice breakdown of provenance. Four segments of
 * one hue in a single bar measured ΔE 6.9 between adjacent steps — below the
 * threshold where full-colour vision can tell them apart — and four distinct
 * hues failed the lightness band against this surface. The breakdown still
 * exists, as a table below, where every class carries its own label.
 *
 * The fill carries severity and the track is a dim step of the same hue, so
 * the state reads across the whole bar rather than only the filled part.
 */
function CoverageMeter({
  verified,
  total,
  label,
  caption,
}: {
  verified: number;
  total: number;
  label: string;
  caption: string;
}) {
  const ratio = total === 0 ? 0 : verified / total;
  const pct = Math.round(ratio * 100);

  // Low coverage is the bad state here, so severity runs the other way.
  const hue =
    ratio >= 0.7
      ? { fill: "bg-signal/80", track: "bg-signal/15" }
      : ratio >= 0.4
        ? { fill: "bg-solar/80", track: "bg-solar/15" }
        : { fill: "bg-danger/80", track: "bg-danger/15" };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="mono-label">{label}</p>
        <p className="font-body text-sm text-paper">
          {total === 0 ? "—" : `${verified} / ${total} · ${pct}%`}
        </p>
      </div>
      <div
        className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${hue.track}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full ${hue.fill} transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{caption}</p>
    </div>
  );
}

export function FacilitatorDashboard() {
  const { lang, t } = useLang();
  const [summary, setSummary] = useState<PodSummary | null>(null);
  const [learners, setLearners] = useState<LearnerSummary[]>([]);
  const [chapters, setChapters] = useState<ChapterAttention[]>([]);

  useEffect(() => {
    Promise.all([getPodSummary(), getLearnerSummaries(), getChaptersNeedingAttention()])
      .then(([s, l, c]) => {
        setSummary(s);
        setLearners(l);
        setChapters(c);
      })
      .catch((err) => console.error("Could not build the facilitator summary", err));
  }, []);

  if (!summary) return <div aria-busy="true" className="min-h-[8rem]" />;

  const answers =
    summary.provenance.solver +
    summary.provenance["answer-bank"] +
    summary.provenance["webgpu-llm"] +
    summary.provenance.unavailable;
  const verified = summary.provenance.solver + summary.provenance["answer-bank"];

  const provenanceRows = [
    { label: t.tierSolver, value: summary.provenance.solver },
    { label: t.tierBank, value: summary.provenance["answer-bank"] },
    { label: t.tierLlm, value: summary.provenance["webgpu-llm"] },
    { label: t.tierNone, value: summary.provenance.unavailable },
  ];

  const relativeDay = (at: number | null) => {
    if (at === null) return t.dashNeverAsked;
    const days = Math.floor((Date.now() - at) / 86_400_000);
    if (days <= 0) return t.dashToday;
    if (days === 1) return t.dashYesterday;
    return t.dashDaysAgo(days);
  };

  return (
    <section className="space-y-5 rounded-card border border-white/10 bg-night-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-paper">{t.dashTitle}</h3>
        {/* Said once, prominently: these are this phone's numbers until a
            sync bundle is imported. A dashboard that silently reports a
            fraction of the pod is worse than one that reports nothing. */}
        <span className="mono-label">{t.dashThisDeviceOnly}</span>
      </div>

      {/* Exactly one hero figure, and it is the actionable one. */}
      <div className="rounded-card border border-white/5 bg-night p-4">
        <p className="font-body text-5xl font-semibold leading-none text-paper">
          {summary.pendingReview}
        </p>
        <p className="mt-1.5 text-sm text-muted">{t.dashAwaitingReview}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile label={t.dashLearners} value={summary.learnerCount} />
        <StatTile label={t.dashQuestionsToday} value={summary.questionsToday} />
        <StatTile label={t.dashQuestionsTotal} value={summary.questionsAllTime} />
        {/* The flywheel, as a number. */}
        <StatTile label={t.dashTeacherExemplars} value={summary.teacherExemplars} />
      </div>

      <CoverageMeter
        verified={verified}
        total={answers}
        label={t.dashVerifiedCoverage}
        caption={t.dashVerifiedCaption}
      />

      {answers > 0 && (
        <div>
          <p className="mono-label mb-2">{t.dashWhereAnswersCame}</p>
          <table className="w-full text-xs">
            <tbody>
              {provenanceRows.map((row) => (
                <tr key={row.label} className="border-t border-white/5">
                  <td className="py-1.5 text-paper/80">{row.label}</td>
                  {/* Tabular figures here: these are columns that must align. */}
                  <td className="py-1.5 text-right font-body tabular-nums text-paper">
                    {row.value}
                  </td>
                  <td className="w-14 py-1.5 text-right text-muted">
                    {Math.round((row.value / answers) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chapters.length > 0 && (
        <div>
          <p className="mono-label mb-2">{t.dashNeedsAttention}</p>
          <ul className="space-y-1.5">
            {chapters.map((row) => (
              <li
                key={row.chapterId}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-card border border-white/5 bg-night px-3 py-2"
              >
                <span className="text-sm text-paper">
                  {/* Localised here rather than in the aggregation: the
                      insights layer has no business knowing the UI language,
                      and it is read by tests too. */}
                  {resolveLocalizedChapter(row.chapterId, lang)?.chapter.name ?? row.chapterName}
                  <span className="text-muted">
                    {" · "}
                    {(() => {
                      const subject = getSubject(row.subjectId);
                      return subject ? localizedSubject(subject, lang).name : row.subjectId;
                    })()}
                  </span>
                </span>
                <span className="font-mono text-[0.7rem] tabular-nums">
                  {row.pending > 0 && (
                    <span className="text-solar">{t.dashPendingN(row.pending)}</span>
                  )}
                  {row.pending > 0 && row.unverified > 0 && (
                    <span className="text-muted"> · </span>
                  )}
                  {row.unverified > 0 && (
                    <span className="text-muted">{t.dashUncheckedN(row.unverified)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {learners.length > 0 && (
        <div>
          <p className="mono-label mb-2">{t.dashLearnerTable}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[26rem] text-xs">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-1.5 font-normal">{t.dashColLearner}</th>
                  <th className="pb-1.5 text-right font-normal">{t.dashColQuestions}</th>
                  <th className="pb-1.5 text-right font-normal">{t.dashColPending}</th>
                  <th className="pb-1.5 text-right font-normal">{t.dashColUnchecked}</th>
                  <th className="pb-1.5 text-right font-normal">{t.dashColLastAsked}</th>
                </tr>
              </thead>
              <tbody>
                {learners.map(({ learner, questions, pending, unverified, lastQuestionAt }) => (
                  <tr key={learner.id} className="border-t border-white/5">
                    <td className="py-1.5 text-paper">{learner.name}</td>
                    <td className="py-1.5 text-right tabular-nums text-paper/80">{questions}</td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        pending > 0 ? "text-solar" : "text-muted"
                      }`}
                    >
                      {pending}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-paper/80">{unverified}</td>
                    <td className="py-1.5 text-right text-muted">
                      {relativeDay(lastQuestionAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary.questionsAllTime === 0 && (
        <p className="text-xs leading-relaxed text-muted">{t.dashEmpty}</p>
      )}
    </section>
  );
}
