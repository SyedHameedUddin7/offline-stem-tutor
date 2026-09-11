/**
 * Data model
 * ----------
 * Subjects are CONFIG, not code branches. Adding a 4th subject should never
 * require touching a component — it should mean adding one object to
 * src/data/subjects.ts. That's what lets "multiple subjects, one model"
 * stay architecturally simple instead of turning into three parallel UIs.
 */

export type SubjectId = "algebra" | "physics" | "grammar";

export interface Subject {
  id: SubjectId;
  name: string;
  /** Short line shown on the subject card. */
  tagline: string;
  /** Injected as the system prompt when this subject is active. */
  systemPrompt: string;
  /** A few starter questions shown as tappable chips in the chat pane. */
  sampleProblems: string[];
  /** Accent used for this subject's card + chat header (drawn from the token set, not arbitrary). */
  accent: "solar" | "signal" | "paper";
}

export interface LessonVideo {
  id: string;
  subjectId: SubjectId;
  title: string;
  /** Where the source file lives when online (e.g. a static /videos/ path or CDN URL). */
  url: string;
  durationLabel: string; // e.g. "4:12" — kept as a display string, not computed
  sizeMB: number;
}

export type MessageRole = "student" | "tutor";

export interface ChatMessage {
  id: string;
  subjectId: SubjectId;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** Only set on tutor messages. A cheap, honest confidence heuristic — not a
   *  real ML score — good enough to drive the teacher-review flag. */
  confidence?: "high" | "low";
  flagged: boolean;
  /** Has this message been pushed to the mock backend yet? */
  synced: boolean;
}

export type TeacherStatus = "pending" | "approved" | "corrected";

export interface FlaggedItem {
  id: string;
  messageId: string;
  subjectId: SubjectId;
  question: string;
  aiAnswer: string;
  teacherStatus: TeacherStatus;
  correction?: string;
  timestamp: number;
  synced: boolean;
}

/** Tracks whether the browser currently believes it has a network connection.
 *  This is the single most important piece of state in the whole app —
 *  it drives the signal indicator that is the project's actual thesis. */
export type ConnectivityState = "online" | "offline";
