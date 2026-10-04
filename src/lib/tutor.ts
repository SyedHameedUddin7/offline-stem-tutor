import { resolveLocalizedChapter, systemPromptFor } from "../data/subjects";
import { retrieve } from "./retrieval";
import { generate, isLlmReady } from "./llm";
import { solveNumberSeries } from "./solvers/numberSeries";
import { formatNotes, retrieveNotes, type RetrievedNote } from "./reference";
import { verifyAnswer } from "./verify";
import { currentLang } from "../i18n/LanguageContext";
import { STRINGS, type Lang } from "../i18n/strings";
import type { Confidence, EngineTier, Grounding, RetrievedItem } from "../types";

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
    : answerGenerative(chapterId, resolved.subject.name, question, lang, onToken);
}

/* ------------------------------------------------------------------ *
 * Generative: Mathematics, Physics, Biology
 * ------------------------------------------------------------------ */

async function answerGenerative(
  chapterId: string,
  subjectName: string,
  question: string,
  lang: Lang,
  onToken?: (partial: string) => void
): Promise<TutorAnswer> {
  const t = STRINGS[lang];

  if (!isLlmReady()) {
    return {
      content: t.tutorModelNotLoaded(subjectName),
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

  // 2. Grounding, independent of whether a model exists.
  let grounding: Grounding;
  try {
    grounding = await retrieve(chapterId, question);
  } catch (err) {
    console.error("Retrieval failed", err);
    // Include the reason. "It didn't work" is unactionable for a teacher in a
    // pod with no devtools, and it was unactionable for me too when this
    // message first appeared during testing with nothing to go on.
    const reason = err instanceof Error ? err.message : String(err);
    return {
      content: t.tutorSearchFailed(reason),
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
    return {
      content: t.tutorBankNotReady(0, grounding.bankSize ?? 0),
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
