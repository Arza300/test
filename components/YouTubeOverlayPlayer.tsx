"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { getYouTubeVideoId } from "@/lib/youtube";

/** حالات مشغل يوتيوب: -1 لم يبدأ، 0 انتهى، 1 يعمل، 2 متوقف، 3 يحمّل، 5 جاهز */
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_ENDED = 0;

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getPlayerState: () => number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = { videoUrl: string; title: string };

/**
 * مشغل فيديو يوتيوب مع طبقة علوية وزر تشغيل/إيقاف وشريط تقدم للتقديم والتأخير.
 */
export function YouTubeOverlayPlayer({ videoUrl, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const videoId = getYouTubeVideoId(videoUrl);

  const stopProgressPoll = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressPoll = useCallback(() => {
    stopProgressPoll();
    progressIntervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const state = p.getPlayerState();
      if (state !== YT_PLAYING) return;
      const t = p.getCurrentTime();
      const d = p.getDuration();
      setCurrentTime(t);
      if (Number.isFinite(d) && d > 0) setDuration(d);
    }, 250);
  }, [stopProgressPoll]);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    const container = containerRef.current;
    let playerDiv: HTMLDivElement | null = null;

    const initPlayer = () => {
      if (!window.YT || !containerRef.current) return;
      if (document.getElementById("yt-player-" + videoId)) return;
      playerDiv = document.createElement("div");
      playerDiv.id = "yt-player-" + videoId;
      playerDiv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
      container.appendChild(playerDiv);
      new window.YT!.Player(playerDiv, {
        videoId,
        events: {
          onReady(ev: { target: YTPlayer }) {
            playerRef.current = ev.target;
            const d = ev.target.getDuration();
            if (Number.isFinite(d) && d > 0) setDuration(d);
            setReady(true);
          },
          onStateChange(ev: { data: number }) {
            const state = ev.data;
            if (state === YT_PLAYING) {
              setIsPlaying(true);
              startProgressPoll();
            } else {
              setIsPlaying(false);
              stopProgressPoll();
              if (state === YT_PAUSED || state === YT_ENDED) {
                const p = playerRef.current;
                if (p) setCurrentTime(p.getCurrentTime());
              }
            }
          },
        },
      });
    };

    if (window.YT) {
      initPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.getElementsByTagName("script")[0]?.parentNode?.insertBefore(tag, document.getElementsByTagName("script")[0]);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
    }
    return () => {
      stopProgressPoll();
      playerRef.current = null;
      setReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      if (playerDiv?.parentNode) playerDiv.parentNode.removeChild(playerDiv);
    };
  }, [videoId, startProgressPoll, stopProgressPoll]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  };

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const value = parseFloat(e.target.value);
    const sec = value * duration;
    setIsSeeking(true);
    setCurrentTime(sec);
    p.seekTo(sec, true);
    setTimeout(() => setIsSeeking(false), 150);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const sec = percent * duration;
    setCurrentTime(sec);
    p.seekTo(sec, true);
  };

  if (!videoId) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-black">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {/* طبقة علوية للتحكم — لا تغطي شريط الأدوات */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end">
        {/* منطقة النقر للتشغيل في المنتصف */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={togglePlay}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter" ? (e.preventDefault(), togglePlay()) : null)}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
        >
          {!isPlaying && (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary)]/90 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[var(--color-primary)]">
              <svg className="mr-1 h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          {isPlaying && (
            <div className="rounded-full bg-black/40 p-3 transition-opacity duration-200 hover:bg-black/60">
              <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </div>
          )}
        </div>

        {/* شريط التحكم في الأسفل */}
        <div className="relative z-20 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8">
          {/* شريط التقديم والتأخير */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!ready}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 disabled:opacity-50"
              aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            >
              {isPlaying ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="min-w-[2.5rem] text-right text-xs text-white/90 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div
              className="relative h-2 flex-1 cursor-pointer rounded-full bg-white/30"
              onClick={handleProgressClick}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-75"
                style={{ width: `${progress * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={isSeeking ? progress : currentTime / (duration || 1)}
                onChange={handleSeek}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="تقديم أو تأخير المقطع"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
