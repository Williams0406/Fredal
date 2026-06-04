"use client";

import { useEffect, useRef } from "react";

export function useAutoRefresh(callback, intervalMs = 5000, enabled = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      callbackRef.current?.();
    };

    const intervalId = window.setInterval(tick, intervalMs);

    const handleVisibilityChange = () => {
      if (!document.hidden) tick();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
