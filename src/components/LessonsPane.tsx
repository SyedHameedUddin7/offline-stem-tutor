import { useCallback, useEffect, useRef, useState } from "react";
import { videosForChapter } from "../data/videos";
import { resolveLocalizedChapter } from "../data/subjects";
import { useLang } from "../i18n/LanguageContext";

/**
 * App-owned cache, written to explicitly by the code below.
 *
 * Deliberately NOT a Workbox runtime-caching route. A runtime route would
 * cache a video as a side effect of playing it, which is exactly the wrong
 * behaviour on a metered connection: the student finds out what it cost
 * afterwards. Here the download is an explicit, visible, cancellable act with
 * a byte count attached to it.
 */
const VIDEO_CACHE_NAME = "lesson-videos-v1";

interface Props {
  chapterId: string;
}

export function LessonsPane({ chapterId }: Props) {
  const { lang, t } = useLang();
  const videos = videosForChapter(chapterId);
  const chapter = resolveLocalizedChapter(chapterId, lang)?.chapter;

  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Object URLs must be revoked or a long session on a low-memory phone
  // slowly leaks whole videos.
  const objectUrlRef = useRef<string | null>(null);

  const refreshCachedState = useCallback(async () => {
    if (!("caches" in window)) return;
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const entries: Record<string, boolean> = {};
    for (const v of videos) {
      entries[v.id] = Boolean(await cache.match(v.url));
    }
    setDownloaded(entries);
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Leaving a chapter tears down the player so we never keep a decoded
    // video alive behind a pane the student can no longer see.
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingUrl(null);
    setPlayingId(null);
    refreshCachedState();
  }, [chapterId, refreshCachedState]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  /**
   * Streamed download with real progress.
   *
   * `cache.add()` would be one line, but it reports nothing until it finishes.
   * On a 2G link a 20MB file is several silent minutes, and a student with no
   * feedback assumes it has failed and taps again. Reading the body chunk by
   * chunk costs a dozen lines and turns that into a progress bar.
   */
  async function downloadVideo(id: string, url: string, fallbackBytes: number) {
    if (!("caches" in window)) return;
    setProgress((p) => ({ ...p, [id]: 0 }));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const declared = Number(response.headers.get("content-length"));
      const total = Number.isFinite(declared) && declared > 0 ? declared : fallbackBytes;
      const reader = response.body?.getReader();

      let blob: Blob;
      if (!reader) {
        blob = await response.blob();
      } else {
        const chunks: Uint8Array[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          setProgress((p) => ({ ...p, [id]: Math.min(received / total, 1) }));
        }
        blob = new Blob(chunks as BlobPart[], {
          type: response.headers.get("content-type") ?? "video/mp4",
        });
      }

      const cache = await caches.open(VIDEO_CACHE_NAME);
      await cache.put(
        url,
        new Response(blob, {
          headers: {
            "content-type": blob.type,
            "content-length": String(blob.size),
          },
        })
      );
      setDownloaded((d) => ({ ...d, [id]: true }));
    } catch (err) {
      console.error("Download failed — likely no network, or file missing at", url, err);
    } finally {
      setProgress((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  /**
   * Play from the cache as a blob URL rather than pointing <video> at the
   * original path. A cached Response has no Range support, so seeking a
   * network-sourced URL breaks offline; a blob is fully seekable.
   */
  async function play(id: string, url: string) {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const hit = await cache.match(url);
    if (!hit) {
      await refreshCachedState();
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(await hit.blob());
    objectUrlRef.current = objectUrl;
    setPlayingUrl(objectUrl);
    setPlayingId(id);
  }

  async function removeDownload(id: string, url: string) {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    await cache.delete(url);
    if (playingId === id) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      setPlayingUrl(null);
      setPlayingId(null);
    }
    setDownloaded((d) => ({ ...d, [id]: false }));
  }

  return (
    <div className="flex h-full flex-col rounded-card border border-white/5 bg-night-surface">
      <div className="border-b border-white/5 px-4 py-3">
        <span className="font-display text-sm font-semibold text-paper">{t.lessonVideos}</span>
        <span className="mono-label ml-2">{videos.length}</span>
      </div>

      {playingUrl && (
        <div className="border-b border-white/5 bg-night p-2">
          <video src={playingUrl} controls autoPlay className="w-full rounded-card" />
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {videos.length === 0 && (
          <p className="p-2 text-xs leading-relaxed text-muted">
{t.noVideos(chapter?.name ?? "")}
          </p>
        )}

        {videos.map((video) => {
          const isDownloaded = downloaded[video.id];
          const pct = progress[video.id];
          const isDownloading = pct !== undefined;
          return (
            <div key={video.id} className="rounded-card border border-white/5 bg-night px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm leading-snug text-paper">{video.title}</p>
                  <p className="mono-label mt-0.5">
                    {video.durationLabel} · {video.sizeMB}MB
                  </p>
                </div>

                {isDownloaded ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-[0.6rem] uppercase tracking-wide text-signal">
                      {t.availableOffline}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => play(video.id, video.url)}
                        className="text-xs text-solar underline underline-offset-2"
                      >
                        {t.play}
                      </button>
                      <button
                        onClick={() => removeDownload(video.id, video.url)}
                        className="text-xs text-muted underline underline-offset-2 hover:text-danger"
                      >
                        {t.remove}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => downloadVideo(video.id, video.url, video.sizeMB * 1024 * 1024)}
                    disabled={isDownloading}
                    className="shrink-0 whitespace-nowrap rounded-card border border-solar/40 px-3 py-1.5 text-xs font-medium text-solar disabled:opacity-40"
                  >
                    {isDownloading ? `${Math.round(pct * 100)}%` : t.download(video.sizeMB)}
                  </button>
                )}
              </div>

              {isDownloading && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-solar transition-[width] duration-150"
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
