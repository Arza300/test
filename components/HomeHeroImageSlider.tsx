"use client";

import { useEffect, useMemo, useState } from "react";

export function HomeHeroImageSlider({
  images,
  intervalMs = 5000,
}: {
  images: string[];
  intervalMs?: number;
}) {
  const safeImages = useMemo(
    () => images.map((s) => String(s).trim()).filter(Boolean),
    [images],
  );
  const [active, setActive] = useState(0);
  const canSlide = safeImages.length > 1;
  const safeInterval = Number.isFinite(intervalMs) && intervalMs >= 1500 && intervalMs <= 20000
    ? Math.round(intervalMs)
    : 5000;

  useEffect(() => {
    if (!canSlide) return;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % safeImages.length);
    }, safeInterval);
    return () => window.clearInterval(timer);
  }, [canSlide, safeImages.length, safeInterval]);

  if (safeImages.length === 0) {
    return (
      <div className="relative w-full">
        <div className="flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center border-y border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-muted)]">
          لا توجد صور مضافة للقالب الثاني حتى الآن.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative w-full overflow-hidden border-y border-[var(--color-border)] bg-black/10 shadow-[var(--shadow-card)]">
        <div className="relative h-[calc(100vh-3.5rem)] w-full">
          {safeImages.map((image, idx) => (
            <img
              key={image + idx}
              src={image}
              alt={`صورة الهيرو ${idx + 1}`}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                idx === active ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={idx !== active}
            />
          ))}
        </div>

        {canSlide ? (
          <>
            <button
              type="button"
              aria-label="الصورة السابقة"
              onClick={() => setActive((prev) => (prev - 1 + safeImages.length) % safeImages.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 px-3 py-2 text-white transition hover:bg-black/55"
            >
              &#10095;
            </button>
            <button
              type="button"
              aria-label="الصورة التالية"
              onClick={() => setActive((prev) => (prev + 1) % safeImages.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 px-3 py-2 text-white transition hover:bg-black/55"
            >
              &#10094;
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
