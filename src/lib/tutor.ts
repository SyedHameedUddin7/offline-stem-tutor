import { resolveLocalizedChapter, systemPromptFor } from "../data/subjects";
import { retrieve } from "./retrieval";
import { generate, isLlmReady } from "./llm";
import { solveNumberSeries } from "./solvers/numberSeries";
import { formatNotes, retrieveNotes, type RetrievedNote } from "./reference";
import { verifyAnswer } from "./verify";
import { solveMaths, MATH_PROBLEM_TYPES } from "./solvers/maths";
import { solvePhysics } from "./solvers/physics/engine";
import type { SolverResult } from "./solvers/types";
import { searchSubject, strongMatch, teacherMatch, type SearchDoc } from "./curriculum";
import { sameQuestion } from "./lexical";
import { REASONING_BANK } from "../data/reasoningBank";
import { currentLang } from "../i18n/LanguageContext";
import { STRINGS, type Lang } from "../i18n/strings";
import type { Confidence, EngineTier, Grounding, RetrievedItem, SubjectId } from "../types";

export interface TutorAnswer {
  content: string;
  confidence: Confidence;
  tier: EngineTier;
  /** ReasoningItem ids this answer was grounded on. */
  citations: string[];
  /** Top similarity score, surfaced so thresholds stay calibratable. */
  topScore?: number;
  /** Deterministic post-generation checks; see lib/verify. */
  verification?: "passed" | "failed" | "unverifiable";
  verificationNotes?: string[];
  /**
   * Whether this goes to the facilitator queue. Defaults to "low confidence
   * or a failed check". Set explicitly where that rule is wrong: a solver
   * asking for a missing value is not a question a teacher needs to see.
   */
  flag?: boolean;
}

export interface TutorRequest {
  chapterId: string;
  question: string;
  /** Called with the growing answer as the model streams it. */
  onToken?: (partial: string) => void;
}

/**
 * The single seam between the UI and whatever is answering.
 *
 * Everything above this line — persistence, flagging, the teacher panel, the
 * chat UI — never learns which engine replied. It reads `tier` off the result
 * and reports it honestly. Everything below is the ladder:
 *
 *   solver       exact arithmetic. No model, no download, no doubt.
 *   webgpu-llm   on-device model, free reasoning (STEM) or grounded (aptitude)
 *   answer-bank  no model — retrieval over verified exemplars, WASM-only
 *   unavailable  none of the above is usable on this device
 *
 * Language is read here rather than passed in from a component, because the
 * same pipeline is reached from several places and there is exactly one
 * correct answer to "which language is this student reading in".
 */
export async function askTutor({
  chapterId,
  question,
  onToken,
}: TutorRequest): Promise<TutorAnswer> {
  const lang = currentLang();
  const t = STRINGS[lang];
  const resolved = resolveLocalizedChapter(chapterId, lang);

  if (!resolved) {
    return { content: t.tutorChapterGone, confidence: "low", tier: "unavailable", citations: [] };
  }

  return resolved.subject.mode === "retrieval-grounded"
    ? answerGrounded(chapterId, question, lang, onToken)
    : answerGenerative(chapterId, resolved.subject.id, resolved.subject.name, question, lang, onToken);
}

/* ------------------------------------------------------------------ *
 * The no-model rungs, shared by every subject
 * ------------------------------------------------------------------ */

function solverAnswer(r: SolverResult, lang: Lang): TutorAnswer {
  const t = STRINGS[lang];
  const steps = r.steps.map((s, i) => (/^\d+\./.test(s) ? s : `${i + 1}. ${s}`)).join("\n");
  return {
    content: `${r.title}\n\n${steps}\n\n${t.tutorAnswer}: ${r.answer}\n\n${t.tutorCheckLabel}: ${r.check.detail}\n\n${t.tutorIdea}: ${r.concept}`,
    confidence: "high",
    tier: "solver",
    citations: [],
    verification: "passed",
  };
}

/** A teacher's answer to this same question, found by words alone. */
async function teacherAnswer(chapterId: string, question: string, lang: Lang): Promise<TutorAnswer | null> {
  const item = await teacherMatch(chapterId, question).catch(() => null);
  if (!item) return null;
  const t = STRINGS[lang];
  return {
    content: `${t.tutorMatchedExample(item.question)}\n\n${item.answer}\n\n${t.tutorTeacherVerified}`,
    confidence: "high",
    tier: "answer-bank",
    citations: [item.id],
  };
}

function lessonAnswer(doc: SearchDoc, also: SearchDoc | undefined, lang: Lang): TutorAnswer {
  const t = STRINGS[lang];
  const body =
    doc.type === "question"
      ? `${doc.title}\n${t.tutorAnswer}: ${doc.body}`
      : doc.type === "flashcard"
        ? `${doc.title}: ${doc.body}`
        : `${doc.title}\n\n${doc.body}`;
  return {
    content:
      `${t.tutorFromNotes}\n\n${body}` +
      (also ? `\n\n${t.tutorAlsoSee}: ${also.title}` : "") +
      (lang === "fr" ? `\n\n${t.contentEnglishOnly}` : ""),
    confidence: "medium",
    tier: "curriculum",
    citations: [doc.id, ...(also ? [also.id] : [])],
    flag: false,
  };
}

/** Problem formats the solver reads in this chapter, for "try one of these". */
function examplesFor(chapterId: string, lang: Lang): string[] {
  const i = lang === "fr" ? 1 : 0;
  return MATH_PROBLEM_TYPES.filter((p) => p.chapterId === chapterId).slice(0, 2).map((p) => p.example[i]);
}

/* ------------------------------------------------------------------ *
 * Generative: Mathematics, Physics, Biology
 * ------------------------------------------------------------------ */

async function answerGenerative(
  chapterId: string,
  subjectId: SubjectId,
  subjectName: string,
  question: string,
  lang: Lang,
  onToken?: (partial: string) => void
): Promise<TutorAnswer> {
  const t = STRINGS[lang];

  // 1. An exact solver, where the question is a calculation it reads. It
  //    outranks the model for the same reason it does in Mental Ability: it
  //    checks its own answer against the question.
  const outcome =
    subjectId === "mathematics" ? solveMaths(question, lang) : subjectId === "physics" ? solvePhysics(question, lang, chapterId) : null;
  if (outcome?.kind === "solved" && outcome.result.check.passed) return solverAnswer(outcome.result, lang);

  // 2. A teacher's answer to this same question.
  const teacher = await teacherAnswer(chapterId, question, lang);
  if (teacher) return teacher;

  // 3. A stored lesson that clearly covers the question.
  let hits: Awaited<ReturnType<typeof searchSubject>> = [];
  try {
    hits = await searchSubject(subjectId, question, 5);
  } catch (err) {
    console.warn("Local search failed", err);
  }
  // Not for a calculation the solver recognised but could not finish: a
  // lesson that shares its words ("acceleration", "car") is not an answer to
  // it, and showing one would bury the solver's "this value is missing".
  const strong = outcome?.kind === "invalid" ? null : strongMatch(hits, question);
  if (strong) {
    const also = hits.find((h) => h !== strong && h.doc.type === "lesson" && h.coverage >= 0.5)?.doc;
    return lessonAnswer(strong.doc, also, lang);
  }

  // 4. The model, if it is on this device. Otherwise say plainly what the
  //    device can do instead — never "load the model" as the only option.
  if (!isLlmReady()) {
    // The solver recognised the problem but something is missing or invalid:
    // say exactly what, and do not send it to a teacher.
    if (outcome?.kind === "invalid") {
      return {
        content: `${outcome.reason}\n\n${t.tutorUseSolveTab}`,
        confidence: "low",
        tier: "unavailable",
        citations: [],
        flag: false,
      };
    }
    const related = hits.filter((h) => h.coverage >= 0.3 && h.doc.type !== "teacher").slice(0, 3).map((h) => `• ${h.doc.title}`);
    const examples = examplesFor(chapterId, lang).map((e) => `• ${e}`);
    return {
      content: [
        t.tutorOfflineCannot(subjectName),
        related.length ? `${t.tutorRelated}\n${related.join("\n")}` : "",
        examples.length ? `${t.tutorTryFormat}\n${examples.join("\n")}` : "",
        t.tutorSentToTeacher,
      ].filter(Boolean).join("\n\n"),
      confidence: "low",
      tier: "unavailable",
      citations: [],
    };
  }

  // Pull in chapter reference material, if any of it is relevant.
  //
  // This is augmentation, not authorisation: a miss means "answer without
  // extra context", never "refuse". The question is legitimate whether or not
  // 84 hand-written notes happen to cover it.
  //
  // Failing to retrieve is also not a reason to fail the answer — the model
  // was answering these unaided until now, and an embedder that will not load
  // should degrade the answer, not block it.
  let retrieved: RetrievedNote[] = [];
  try {
    retrieved = await retrieveNotes(chapterId, question);
  } catch (err) {
    console.warn("Reference lookup failed; answering unaided", err);
  }

  const reference = formatNotes(retrieved, lang);
  const userPrompt = reference ? `${reference}\n\n---\n\n${question}` : question;

  try {
    const content = await generate({
      systemPrompt: systemPromptFor(chapterId, lang),
      userPrompt,
      onToken,
    });

    // Deterministic post-generation checks. Cheap, and they catch the
    // specific thing a language model gets wrong without noticing:
    // arithmetic that contradicts itself, and units that cannot be what
    // the question asked for.
    const check = verifyAnswer(chapterId, question, content);
    const verification = check.passed ? "passed" : check.unverifiable ? "unverifiable" : "failed";

    return {
      content,
      // Grounded answers earn "medium"; unaided ones stay "low". A failed
      // check drops to "low" regardless and auto-flags for a facilitator,
      // because a detectably wrong answer must not sit in front of a
      // student looking as confident as a sound one.
      //
      // Still never "high", even when every check passes: "nothing
      // detectably wrong" is a weaker claim than "correct". Only the
      // solver earns high confidence, because only the solver derived the
      // result itself.
      confidence: verification === "failed" ? "low" : retrieved.length > 0 ? "medium" : "low",
      tier: "webgpu-llm",
      citations: retrieved.map((r) => r.note.id),
      topScore: retrieved[0]?.score,
      verification,
      verificationNotes: check.notes,
    };
  } catch (err) {
    console.error("Generation failed", err);
    return {
      content: t.tutorGenerationFailed,
      confidence: "low",
      tier: "unavailable",
      citations: [],
    };
  }
}

/* ------------------------------------------------------------------ *
 * Retrieval-grounded: Mental Ability
 * ------------------------------------------------------------------ */

/**
 * Three gates, in this order: solve it, then ground it, then let the model
 * phrase it. The order is the argument.
 */
async function answerGrounded(
  chapterId: string,
  question: string,
  lang: Lang,
  onToken?: (partial: string) => void
): Promise<TutorAnswer> {
  const t = STRINGS[lang];

  // 1. Exact solver, above everything.
  //
  // Where a question is decidable, deciding it beats retrieving a technique
  // and beats asking a model. This is the fix for the "2, 4, 6, 8, ?" case:
  // retrieval matched the Fibonacci exemplar at 0.67 — a strong score — and
  // the model applied that rule without checking it against the terms it was
  // given, answering 20. The solver tests every candidate rule against every
  // term the student typed, so a rule that cannot reproduce the question is
  // rejected before it can become an answer.
  const exact = solveNumberSeries(question, lang);
  if (exact) {
    return {
      content:
        `${t.tutorMethod} — ${exact.pattern}\n\n${exact.reasoning}\n\n` +
        `${t.tutorAnswer}: ${exact.next}\n\n${t.tutorCheckedLocally}`,
      confidence: "high",
      tier: "solver",
      citations: [],
    };
  }

  // 1b. A teacher's answer to this same question — found by words alone, so
  //     it works on a device that never downloaded the search model.
  const teacher = await teacherAnswer(chapterId, question, lang);
  if (teacher) return teacher;

  // 2. Grounding, independent of whether a model exists.
  let grounding: Grounding;
  try {
    grounding = await retrieve(chapterId, question);
  } catch (err) {
    console.error("Retrieval failed", err);
    const exact = exactBankMatch(chapterId, question);
    if (exact) return exemplarAnswer({ item: exact, score: 1 }, "grounded", false, [exact.id], lang, 1);
    // Include the reason. "It didn't work" is unactionable for a teacher in a
    // pod with no devtools, and it was unactionable for me too when this
    // message first appeared during testing with nothing to go on.
    const reason = err instanceof Error ? err.message : String(err);
    return {
      content: `${t.tutorSearchFailed(reason)}\n\n${t.tutorPracticeHint}`,
      confidence: "low",
      tier: "unavailable",
      citations: [],
    };
  }

  const top = grounding.matches[0];
  const topScore = top?.score;
  const citations = grounding.matches.map((m) => m.item.id);

  // "Cannot search" and "searched, found nothing" are different failures and
  // now say different things. Conflating them was telling students the corpus
  // had no method for their question when the corpus had not been consulted.
  if (grounding.status === "unindexed") {
    const exact = exactBankMatch(chapterId, question);
    if (exact) return exemplarAnswer({ item: exact, score: 1 }, "grounded", false, [exact.id], lang, 1);
    return {
      content: `${t.tutorBankNotReady(0, grounding.bankSize ?? 0)}\n\n${t.tutorPracticeHint}`,
      confidence: "low",
      tier: "unavailable",
      citations: [],
    };
  }

  if (grounding.status === "none" || !top) {
    return {
      content: t.tutorNoVerifiedMethod,
      confidence: "low",
      tier: "answer-bank",
      citations: [],
      topScore,
    };
  }

  // A strong score from a DIFFERENT chapter is the failure retrieval cannot
  // see: "Odd one out: 8, 27, 64, 100" matches the cubes item in Number
  // Series at 0.53 — above the grounded line, wrong technique. We can't
  // detect that from the score, so we refuse to sound certain.
  const crossChapter = !grounding.inContext;

  // 3. Only now may the model speak, and only to restate a verified method.
  if (isLlmReady()) {
    try {
      const content = await generate({
        systemPrompt: systemPromptFor(chapterId, lang),
        userPrompt: groundedPrompt(grounding.matches, question, lang),
        onToken,
        // Even lower than the generative path. The model is transcribing a
        // known method onto new numbers; there is nothing to be creative about.
        temperature: 0.15,
      });

      const attribution = crossChapter
        ? t.tutorMethodFromIn(chapterNameOf(top.item.chapterId, lang), top.item.question)
        : t.tutorMethodFrom(top.item.question);

      return {
        content: `${content}\n\n${attribution}`,
        confidence: grounding.status === "weak" || crossChapter ? "low" : "medium",
        tier: "webgpu-llm",
        citations,
        topScore,
      };
    } catch (err) {
      // Fall through to serving the exemplar directly. A working lower rung
      // is the whole point of having a ladder.
      console.error("Grounded generation failed, serving exemplar directly", err);
    }
  }

  return exemplarAnswer(top, grounding.status, crossChapter, citations, lang, topScore);
}

/**
 * The prompt that keeps the model on rails.
 *
 * The examples come first and the refusal instruction comes last, because the
 * final instruction is the one a small model weights most heavily. Step 2 is
 * the one that matters: it is the check the model skipped when it answered 20.
 */
function groundedPrompt(matches: RetrievedItem[], question: string, lang: Lang): string {
  const fr = lang === "fr";

  const examples = matches
    .map((m, i) =>
      fr
        ? `EXEMPLE ${i + 1}\nQuestion : ${m.item.question}\nTechnique : ${m.item.pattern}\n` +
          `Solution détaillée :\n${m.item.reasoning}\nRéponse : ${m.item.answer}`
        : `EXAMPLE ${i + 1}\nQuestion: ${m.item.question}\nTechnique: ${m.item.pattern}\n` +
          `Worked solution:\n${m.item.reasoning}\nAnswer: ${m.item.answer}`
    )
    .join("\n\n");

  if (fr) {
    return (
      `${examples}\n\n` +
      `QUESTION DE L'ÉLÈVE : ${question}\n\n` +
      `Étape 1. Choisis, parmi les exemples ci-dessus, la technique qui pourrait s'appliquer.\n` +
      `Étape 2. TESTE-LA. Applique cette technique aux valeurs que l'élève a réellement données ` +
      `et vérifie qu'elle les reproduit toutes. Écris cette vérification.\n` +
      `Étape 3. Si la vérification échoue sur ne serait-ce qu'une valeur, la technique est fausse : ` +
      `dis que tu n'as pas de méthode vérifiée pour cette question, et arrête-toi. Ne réponds pas quand même.\n` +
      `Étape 4. Seulement si la vérification réussit, poursuis la technique pour obtenir la réponse.\n\n` +
      `Une réponse fausse qui a l'air sûre est pire que pas de réponse.`
    );
  }

  return (
    `${examples}\n\n` +
    `STUDENT'S QUESTION: ${question}\n\n` +
    `Step 1. Pick the technique from the examples above that might apply.\n` +
    `Step 2. TEST IT. Apply that technique to the values the student actually gave and ` +
    `check it reproduces every one of them. Write out the check.\n` +
    `Step 3. If the check fails on even one value, the technique is wrong: say you do not ` +
    `have a verified method for this question, and stop. Do not answer anyway.\n` +
    `Step 4. Only if the check passes, continue the technique to get the answer.\n\n` +
    `A wrong answer that looks confident is worse than no answer.`
  );
}

/**
 * Serve the retrieved exemplar as-is — the no-model rung.
 *
 * Note the honest limitation: the bank is authored in English, and cross-
 * lingual retrieval finds the right item for a French question but cannot
 * translate it. With a model present this never shows (the model restates the
 * method in French). Without one, a French student gets the correct method in
 * English. That is better than a wrong answer in French, and worse than it
 * should be.
 */
function exemplarAnswer(
  top: RetrievedItem,
  status: Grounding["status"],
  crossChapter: boolean,
  citations: string[],
  lang: Lang,
  topScore?: number
): TutorAnswer {
  const t = STRINGS[lang];
  const { item } = top;

  // Plain text, no markdown. The renderer is a low-end phone screen and the
  // reader may be working in a second language — line breaks and capitals do
  // the job bold would, without a parser in the bundle.
  const body =
    `${t.tutorMethod} — ${item.pattern}\n\n${item.reasoning}\n\n` +
    `${t.tutorAnswer}: ${item.answer}`;

  if (status === "weak") {
    return {
      content: `${t.tutorClosestExample(item.question)}\n\n${body}\n\n${t.tutorMayNotMatch}`,
      confidence: "low",
      tier: "answer-bank",
      citations,
      topScore,
    };
  }

  return {
    content:
      `${t.tutorMatchedExample(item.question)}\n\n${body}` +
      (item.source === "teacher" ? `\n\n${t.tutorTeacherVerified}` : "") +
      (crossChapter ? `\n\n${t.tutorCrossChapter(chapterNameOf(item.chapterId, lang))}` : ""),
    confidence: crossChapter ? "medium" : top.score >= 0.6 ? "high" : "medium",
    tier: "answer-bank",
    citations,
    topScore,
  };
}

function chapterNameOf(chapterId: string, lang: Lang): string {
  return resolveLocalizedChapter(chapterId, lang)?.chapter.name ?? "";
}

/**
 * A bundled exemplar asked in (nearly) the same words — the one Mental
 * Ability answer that is safe to serve without semantic search. Anything
 * looser would be the failure this subject exists to avoid: a plausible
 * technique applied to the wrong puzzle.
 */
function exactBankMatch(chapterId: string, question: string) {
  return REASONING_BANK.find((i) => i.chapterId === chapterId && sameQuestion(i.question, question, 0.85)) ?? null;
}
