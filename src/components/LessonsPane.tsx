import { useEffect, useState } from "react";
import { LESSON_VIDEOS } from "../data/videos";
import type { SubjectId } from "../types";

const VIDEO_CACHE_NAME = "lesson-video-cache";

interface Props {
  subjectId: SubjectId;
}

/**
 * Uses the Cache API directly (not IndexedDB — IndexedDB isn't built for
 * large binary blobs). This is the same cache the service worker's
 * runtimeCaching rule (see vite.config.ts) reads from, so a video downloaded
 * here is available even after a full offline cold start, not just within
 * this session.
 */
export function LessonsPane({ subjectId }: Props) {
  const videos = LESSON_VIDEOS.filter((v) => v.subjectId === subjectId);
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function checkCached() {
      if (!("caches" in window)) return;
      const cache = await caches.open(VIDEO_CACHE_NAME);
      const entries: Record<string, boolean> = {};
      for (const v of videos) {
        entries[v.id] = Boolean(await cache.match(v.url));
      }
      setDownloaded(entries);
    }
    checkCached();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  async function downloadVideo(id: string, url: string) {
    if (!("caches" in window)) return;
    setDownloading((d) => ({ ...d, [id]: true }));
    try {
      const cache = await caches.open(VIDEO_CACHE_NAME);
      await cache.add(url); // fetches once, stores the response for offline playback
      setDownloaded((d) => ({ ...d, [id]: true }));
    } catch (err) {
      console.error("Download failed — likely no network, or file missing at", url, err);
    } finally {
      setDownloading((d) => ({ ...d, [id]: false }));
    }
  }

  return (
    <div className="flex h-full flex-col rounded-card border border-white/5 bg-night-surface">
      <div className="border-b border-white/5 px-4 py-3">
        <span className="font-display text-sm font-semibold text-paper">Lesson videos</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {videos.map((video) => {
          const isDownloaded = downloaded[video.id];
          const isDownloading = downloading[video.id];
          return (
            <div
              key={video.id}
              className="flex items-center justify-between rounded-card border border-white/5 bg-night px-3 py-2.5"
            >
              <div>
                <p className="text-sm text-paper">{video.title}</p>
                <p className="mono-label mt-0.5">
                  {video.durationLabel} · {video.sizeMB}MB
                </p>
              </div>
              {isDownloaded ? (
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-[0.65rem] uppercase tracking-wide text-signal">
                    ✓ available offline
                  </span>
                  <a
                    href={video.url}
                    className="text-xs text-solar underline underline-offset-2"
                  >
                    play
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => downloadVideo(video.id, video.url)}
                  disabled={isDownloading}
                  className="whitespace-nowrap rounded-card border border-solar/40 px-3 py-1.5 text-xs font-medium text-solar disabled:opacity-40"
                >
                  {isDownloading ? "downloading…" : "download"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
