import type { LessonVideo } from "../types";

/**
 * Lesson videos are attached to CHAPTERS, not subjects — a pod teacher
 * downloads what this week's chapter needs, not a whole syllabus, because
 * the download is happening on a metered connection that may vanish.
 *
 * Kept deliberately small. The thing being proven here is the
 * download-once-play-forever-offline mechanism and its honest data cost,
 * not a content library. Swap in real files at these paths when you have them.
 */
export const LESSON_VIDEOS: LessonVideo[] = [
  {
    id: "vid-linear-equations-01",
    chapterId: "math-linear-equations",
    title: "Balancing both sides of an equation",
    url: "/videos/math-linear-equations-01.mp4",
    durationLabel: "4:12",
    sizeMB: 18,
  },
  {
    id: "vid-linear-equations-02",
    chapterId: "math-linear-equations",
    title: "Word problems, without the panic",
    url: "/videos/math-linear-equations-02.mp4",
    durationLabel: "5:30",
    sizeMB: 24,
  },
  {
    id: "vid-mensuration-01",
    chapterId: "math-mensuration",
    title: "Why area formulas look the way they do",
    url: "/videos/math-mensuration-01.mp4",
    durationLabel: "3:48",
    sizeMB: 16,
  },
  {
    id: "vid-motion-01",
    chapterId: "phys-motion",
    title: "Reading a distance-time graph",
    url: "/videos/phys-motion-01.mp4",
    durationLabel: "4:05",
    sizeMB: 17,
  },
  {
    id: "vid-force-laws-01",
    chapterId: "phys-force-laws",
    title: "Newton's laws with a bicycle",
    url: "/videos/phys-force-laws-01.mp4",
    durationLabel: "5:02",
    sizeMB: 22,
  },
  {
    id: "vid-cell-01",
    chapterId: "bio-cell",
    title: "A tour of the cell",
    url: "/videos/bio-cell-01.mp4",
    durationLabel: "4:40",
    sizeMB: 20,
  },
  {
    id: "vid-photosynthesis-01",
    chapterId: "bio-photosynthesis",
    title: "Photosynthesis, start to finish",
    url: "/videos/bio-photosynthesis-01.mp4",
    durationLabel: "5:15",
    sizeMB: 23,
  },
  {
    id: "vid-number-series-01",
    chapterId: "ma-number-series",
    title: "Finding the rule before the number",
    url: "/videos/ma-number-series-01.mp4",
    durationLabel: "3:20",
    sizeMB: 14,
  },
];

export function videosForChapter(chapterId: string): LessonVideo[] {
  return LESSON_VIDEOS.filter((v) => v.chapterId === chapterId);
}
