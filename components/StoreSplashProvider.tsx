"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { StoreNetflixSplashOverlay } from "@/components/StoreNetflixSplashOverlay";

type StoreSplashContextValue = {
  startStoreSplashTransition: () => void;
  notifyStoreRoutePainted: () => void;
};

const StoreSplashContext = createContext<StoreSplashContextValue | null>(null);

export function useStoreSplash() {
  const ctx = useContext(StoreSplashContext);
  if (!ctx) {
    throw new Error("useStoreSplash يجب أن يُستدعى داخل StoreSplashProvider");
  }
  return ctx;
}

/** للصفحات التي لا تستخدم السياق (مثل الـ beacon) */
export function useStoreSplashOptional() {
  return useContext(StoreSplashContext);
}

export function StoreSplashProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const splashActiveRef = useRef(false);
  const animDoneRef = useRef(false);
  const storeReadyRef = useRef(false);
  const exitingRef = useRef(false);

  const tryBeginFadeOut = useCallback(() => {
    if (!splashActiveRef.current || exitingRef.current) return;
    if (!animDoneRef.current || !storeReadyRef.current) return;
    exitingRef.current = true;
    setExiting(true);
  }, []);

  const startStoreSplashTransition = useCallback(() => {
    void router.prefetch("/store");
    splashActiveRef.current = true;
    animDoneRef.current = false;
    storeReadyRef.current = false;
    exitingRef.current = false;
    setExiting(false);
    setOpen(true);
    router.push("/store");
  }, [router]);

  const notifyStoreRoutePainted = useCallback(() => {
    if (!splashActiveRef.current) return;
    storeReadyRef.current = true;
    tryBeginFadeOut();
  }, [tryBeginFadeOut]);

  const handleScaleAnimationComplete = useCallback(() => {
    if (!splashActiveRef.current) return;
    animDoneRef.current = true;
    tryBeginFadeOut();
  }, [tryBeginFadeOut]);

  const handleExitFadeComplete = useCallback(() => {
    splashActiveRef.current = false;
    exitingRef.current = false;
    animDoneRef.current = false;
    storeReadyRef.current = false;
    setExiting(false);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (!splashActiveRef.current) return;
      splashActiveRef.current = false;
      exitingRef.current = false;
      animDoneRef.current = false;
      storeReadyRef.current = false;
      setExiting(false);
      setOpen(false);
    }, 15_000);
    return () => window.clearTimeout(t);
  }, [open]);

  const value = useMemo(
    () => ({ startStoreSplashTransition, notifyStoreRoutePainted }),
    [startStoreSplashTransition, notifyStoreRoutePainted]
  );

  return (
    <StoreSplashContext.Provider value={value}>
      {children}
      <StoreNetflixSplashOverlay
        open={open}
        exiting={exiting}
        onScaleAnimationComplete={handleScaleAnimationComplete}
        onExitFadeComplete={handleExitFadeComplete}
      />
    </StoreSplashContext.Provider>
  );
}
