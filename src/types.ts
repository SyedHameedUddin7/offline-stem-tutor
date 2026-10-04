/**
 * Data model
 * ----------
 * Two rules this file exists to enforce:
 *
 * 1. Curriculum is CONFIG, not code. A subject is an object; a chapter is an
 *    object inside it. Adding Chemistry, or a 8th Biology chapter, should mean
 *    editing src/data/ — never a component, never a branch.
 *
 * 2. An answer must always carry its provenance. Which engine produced it,
 *    what it was grounded on, how confident we are. On a shared phone in a pod
 *    with no signal, "where did this answer come from" is not a debug detail —
 *    it's the difference between a tutor and a rumour.
 */

export type SubjectId = "mathematics" | "physics" | "biology" | "mental-ability";

/**
 * One student on a shared device.
 *
 * This exists because of a fact about the deployment, not a feature request:
 * pod phones are shared, and before profiles existed every conversation was
 * keyed only by chapter. The next student to pick up the device saw the
 * previous student's questions — including the ones they got wrong and asked
 * a tutor about privately.
 *
 * Deliberately no password. Profiles here provide SEPARATION, not security:
 * anyone holding the device can select any profile. Claiming otherwise would
 * be worse than the current state, because a facilitator might then trust it
 * with something that deserves real protection. What it does fix is the
 * accidental case, which is the one that actually happens in a pod.
 *
 * No email, no server account, no sign-up. A name and a colour, created in
 * two taps, stored on the device and nowhere else.
 */
export interface Learner {
  id: string;
  name: string;
  /** Index into the picker's accent palette — identity without an image
   *  download, and legible on a cracked low-end screen. */
  colorIndex: number;
  createdAt: number;
  lastActiveAt: number;
}

/**
 * How a subject produces answers.
 *
 * - `generative`: the on-device LLM reasons freely inside a chapter's scope.
 *   Correct for Maths/Physics/Biology, where the student's question is
 *   open-ended and the model's job is to explain.
 *
 * - `retrieval-grounded`: the model may only answer using solved exemplars
 *   retrieved from a local, vetted bank. Correct for Mental Ability, where
 *   a puzzle has one defensible answer reached by one specific technique,
 *   and a small model confabulating a plausible-sounding wrong method is
 *   worse than no answer at all.
 */
export type SubjectMode = "generative" | "retrieval-grounded";

export type Accent = "solar" | "signal" | "paper" | "danger";

export interface Chapter {
  /** Globally unique across all subjects — used as a foreign key everywhere. */
  id: string;
  name: string;
  /** One line shown under the chapter name in the picker. */
  blurb: string;
  /** Appended to the subject system prompt to narrow the tutor to this chapter. */
  focus: string;
  /** Tappable starter questions. Also doubles as the offline demo script. */
  sampleProblems: string[];
}

export interface Subject {
  id: SubjectId;
  name: string;
  tagline: string;
  accent: Accent;
  mode: SubjectMode;
  /** The stable part of the system prompt — chapter `focus` is appended to it. */
  systemPrompt: string;
  chapters: Chapter[];
}

export interface LessonVideo {
  id: string;
  /** Videos hang off a chapter, so a teacher downloads a week's worth of
   *  content rather than a syllabus. Downloads happen on metered links. */
  chapterId: string;
  title: string;
  /** Where the source file lives when online. */
  url: string;
  durationLabel: string; // e.g. "4:12" — a display string, not computed
  sizeMB: number;
}

/* ------------------------------------------------------------------ *
 * Retrieval (Mental Ability, and the teacher-authored answer bank)
 * ------------------------------------------------------------------ */

/**
 * One solved exemplar. This is the unit of grounded truth in the app.
 *
 * `source` is the important field. Seed items ship with the build; `teacher`
 * items are created when a teacher corrects a flagged answer. Both are
 * retrievable, which is what makes the correction loop a flywheel rather than
 * a logbook: a teacher's fix in one pod becomes the next student's answer,
 * with no server in between.
 */
export interface ReasoningItem {
  id: string;
  chapterId: string;
  question: string;
  /** The final answer, kept short and checkable. */
  answer: string;
  /** The worked method — what the model is expected to imitate, not invent. */
  reasoning: string;
  /** Name of the reusable technique, e.g. "constant second difference". */
  pattern: string;
  source: "seed" | "teacher";
  /** Cosine-searchable embedding, computed on-device and cached in IndexedDB. */
  embedding?: number[];
  /** Which model produced `embedding`.
   *
   *  Not optional bookkeeping. Both embedders output 384 dimensions, so a
   *  vector from the old English-only model compares against a new
   *  multilingual one without erroring — it just returns meaningless
   *  similarities. Stamping the model id makes a stale cache detectable
   *  instead of silently wrong. */
  embeddingModel?: string;
}

export interface RetrievedItem {
  item: ReasoningItem;
  /** Cosine similarity, 0..1. */
  score: number;
}

/**
 * Whether we found solid ground to stand on before answering.
 * `weak` and `none` are not failures — they are the honest states that
 * trigger a teacher flag instead of a confident guess.
 */
export type GroundingStatus =
  | "grounded"
  | "weak"
  | "none"
  /**
   * The bank has no searchable rows on this device — not seeded, or not yet
   * embedded.
   *
   * Collapsing this into "none" was a real defect: it told the student
   * "I have no verified method for this question" when the truth was
   * "I cannot search at all". Those have different causes and different
   * fixes, and a student in a pod cannot open devtools to tell them apart.
   */
  | "unindexed";

export interface Grounding {
  status: GroundingStatus;
  matches: RetrievedItem[];
  /**
   * False when the best match came from a different chapter than the one the
   * student has open. Similarity alone cannot catch a related-but-wrong
   * technique — a cubes question can out-score the odd-one-out items it
   * should have matched — so this travels alongside the score as a second,
   * cheap signal that caps how confident the answer is allowed to sound.
   */
  inContext: boolean;
  /** best positive score − best negative-anchor score. The out-of-domain
   *  signal; see DOMAIN_MARGIN in lib/retrieval.ts for why it exists. */
  margin: number;
  /** How many searchable rows the bank actually had. Surfaced so a refusal
   *  can say "0 items indexed" instead of leaving the student guessing. */
  bankSize?: number;
}

/**
 * A retrievable piece of chapter reference material for the generative
 * subjects: a definition, a formula, a worked example, or a common
 * misconception.
 *
 * The distinction from ReasoningItem is the important part, and it is a
 * distinction of AUTHORITY, not of shape.
 *
 * A ReasoningItem AUTHORISES an answer. In Mental Ability, if retrieval finds
 * nothing close enough, the tutor refuses — the bank decides whether we are
 * allowed to answer at all.
 *
 * A ReferenceNote only INFORMS one. "Why does a heavier object not fall
 * faster?" is a legitimate question whether or not the corpus happens to
 * cover it, and refusing it because a lookup missed would be absurd. So notes
 * are injected when they are relevant and silently skipped when they are not.
 * The model still answers either way; it just answers better with the right
 * formula and the right known misconception in front of it.
 */
export interface ReferenceNote {
  id: string;
  chapterId: string;
  kind: "definition" | "formula" | "worked-example" | "misconception";
  title: string;
  body: string;
  embedding?: number[];
  embeddingModel?: string;
}

/* ------------------------------------------------------------------ *
 * The capability ladder
 * ------------------------------------------------------------------ */

/**
 * Which engine actually answered. Declared here rather than inside the engine
 * module because it belongs on every stored message: six months later, a
 * teacher looking at a flagged answer needs to know whether it came from a 3B
 * model or from the answer bank.
 *
 * Ordered best-first. The app detects the highest tier a device can run and
 * says so out loud — a $50 Android without WebGPU is the common case in a pod,
 * not an edge case.
 */
export type EngineTier =
  | "solver" // exact, deterministic answer. No model, no download, no doubt.
  //            Narrow — only covers questions that are actually decidable —
  //            but where it applies it outranks everything below it.
  | "webgpu-llm" // on-device LLM via WebLLM; requires WebGPU
  | "answer-bank" // no LLM: retrieval only, over seed + teacher-authored items.
  //                 Runs on plain WASM, so it reaches phones the rung above cannot.
  | "unavailable";
// A CPU/WASM language-model rung belongs between these two — llama.cpp
// compiled to WASM would reach devices WebGPU cannot, at a few tokens per
// second. It is not implemented, and is listed here as a known gap rather
// than as an enum member nothing ever produces.

export type MessageRole = "student" | "tutor";

export type Confidence = "high" | "medium" | "low";

export interface ChatMessage {
  id: string;
  /** Whose conversation this is. Every read path filters on it. */
  learnerId: string;
  subjectId: SubjectId;
  chapterId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** Tutor messages only. For retrieval-grounded subjects this is derived from
   *  the retrieval score — a real signal, not a guess about hedging language. */
  confidence?: Confidence;
  /** Tutor messages only: which rung of the ladder produced this. */
  tier?: EngineTier;
  /** Tutor messages only: ReasoningItem ids this answer was grounded on. */
  citations?: string[];
  /** Tutor messages only: outcome of deterministic post-generation checks.
   *  "passed" means nothing detectably wrong — a weaker and more honest
   *  claim than "correct", which only the solver can make. */
  verification?: "passed" | "failed" | "unverifiable";
  /** Tutor messages only: why verification failed, for the facilitator. */
  verificationNotes?: string[];
  /** Tutor messages only: top retrieval similarity. Stored rather than
   *  discarded so the grounding thresholds can be calibrated against real
   *  questions instead of guessed at. */
  topScore?: number;
  flagged: boolean;
  synced: boolean;
}

export type TeacherStatus = "pending" | "approved" | "corrected";

export interface FlaggedItem {
  id: string;
  messageId: string;
  /** Who asked. The facilitator queue is deliberately cross-learner — a
   *  facilitator needs to see everyone — but it must show whose question it
   *  is, or the review is useless for following up with the student. */
  learnerId: string;
  subjectId: SubjectId;
  chapterId: string;
  question: string;
  aiAnswer: string;
  teacherStatus: TeacherStatus;
  correction?: string;
  timestamp: number;
  synced: boolean;
  /** Set once a correction has been promoted into the answer bank as a
   *  teacher-sourced ReasoningItem — closing the loop. */
  promotedItemId?: string;
}

/* ------------------------------------------------------------------ *
 * Sync
 * ------------------------------------------------------------------ */

/**
 * What kind of change happened. Kept coarse on purpose — each one maps to a
 * thing a facilitator would recognise, not to a database row.
 */
export type SyncEventType =
  | "learner.upserted" // so a flag arriving on another device has a name on it
  | "flag.created" // a student's question went to the review queue
  | "flag.resolved" // a facilitator approved or corrected it
  | "bank.item"; // a correction became a verified exemplar — the flywheel

/**
 * One fact that happened on one device.
 *
 * Append-only and immutable. The log is the unit of transfer rather than the
 * current state of each table, because two devices that have both been
 * offline for a week have both moved on, and there is no "current state" to
 * agree on — only two sets of things that happened.
 *
 * `seq` is a per-device counter. Together with `deviceId` it gives every
 * event a stable total order within its origin device, which wall-clock time
 * cannot: a pod phone that has been offline for days may have a clock that is
 * minutes or months wrong.
 */
export interface SyncEvent {
  /** Deterministic: `${deviceId}:${seq}`. Re-importing cannot duplicate it. */
  id: string;
  deviceId: string;
  seq: number;
  type: SyncEventType;
  /** The learner, flag or bank item this is about. */
  entityId: string;
  payload: unknown;
  /** Wall clock on the origin device. Untrustworthy; see `seq`. */
  createdAt: number;
  /** Set once this event has been included in an export. */
  exportedAt?: number;
}

/** A transferable set of events, versioned so a format change is detectable. */
export interface SyncBundle {
  formatVersion: 1;
  deviceId: string;
  createdAt: number;
  events: SyncEvent[];
}

export interface MergeReport {
  received: number;
  /** Events already known — the idempotency path. */
  duplicates: number;
  applied: number;
  /** Events describing an entity this device has a newer opinion about. */
  superseded: number;
  /** Bank items that arrived and now need embedding on this device. */
  needsIndexing: number;
}

/**
 * A device-level setting. Deliberately untyped in the value so one table can
 * hold the facilitator credential, the lockout counter, and whatever comes
 * next, without a schema change for each.
 */
export interface AppSetting {
  key: string;
  value: unknown;
}

/**
 * A facilitator credential, stored on the device.
 *
 * Never the PIN itself: a random salt plus the PBKDF2 output, with the
 * iteration count recorded so the cost can be raised later without
 * invalidating existing PINs.
 */
export interface FacilitatorCredential {
  saltB64: string;
  hashB64: string;
  iterations: number;
  createdAt: number;
}

/** Tracks whether the browser currently believes it has a network connection.
 *  This is the single most important piece of state in the whole app —
 *  it drives the signal indicator that is the project's actual thesis. */
export type ConnectivityState = "online" | "offline";
