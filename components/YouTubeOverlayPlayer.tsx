"use client";

import { useRef, useEffect, useState } from "react";
import { getYouTubeVideoId } from "@/lib/youtube";

declare global {
  interface Window {
    YT?: { Player: new (el: string | HTMLElement, opts: { videoId: string; events?: { onReady?: (e: { target: { playVideo: () => void } }) => void } }) => { playVideo: () => void } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type Props = { videoUrl: string; title: string };

/**
 * مشغل فيديو يوتيوب مع طبقة علوية تمنع الوصول إلى واجهة يوتيوب.
 * زر التشغيل يتحكم بالفيديو عبر YouTube IFrame API.
 */
export function YouTubeOverlayPlayer({ videoUrl, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ playVideo: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const videoId = getYouTubeVideoId(videoUrl);

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
          onReady(ev: { target: { playVideo: () => void } }) {
            playerRef.current = ev.target;
            setReady(true);
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
      playerRef.current = null;
      setReady(false);
      if (playerDiv?.parentNode) playerDiv.parentNode.removeChild(playerDiv);
    };
  }, [videoId]);

  const handlePlay = () => {
    if (playerRef.current) playerRef.current.playVideo();
  };

  if (!videoId) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-black">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {/* طبقة علوية تمنع أي نقر على مشغل يوتيوب — تبقى دائماً حتى لا يصل المستخدم لليوتيوب */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
        <button
            type="button"
            onClick={handlePlay}
            disabled={!ready}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition hover:scale-110 hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            aria-label="تشغيل الفيديو"
        >
          <svg className="mr-1 h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
