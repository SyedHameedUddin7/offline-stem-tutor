import type { LessonVideo } from "../types";

/**
 * Kept deliberately small: 3 clips, one subject (Algebra), placeholder
 * self-recorded style content is fine for a demo. The point being proven
 * here is the DOWNLOAD-AND-PLAY-OFFLINE MECHANISM, not a content library.
 * Swap in real files at these paths/URLs when you have them.
 */
export const LESSON_VIDEOS: LessonVideo[] = [
  {
    id: "algebra-01",
    subjectId: "algebra",
    title: "What is a variable?",
    url: "/videos/algebra-01.mp4",
    durationLabel: "3:40",
    sizeMB: 18,
  },
  {
    id: "algebra-02",
    subjectId: "algebra",
    title: "Solving one-step equations",
    url: "/videos/algebra-02.mp4",
    durationLabel: "4:55",
    sizeMB: 24,
  },
  {
    id: "algebra-03",
    subjectId: "algebra",
    title: "Word problems, without the panic",
    url: "/videos/algebra-03.mp4",
    durationLabel: "5:12",
    sizeMB: 26,
  },
];
