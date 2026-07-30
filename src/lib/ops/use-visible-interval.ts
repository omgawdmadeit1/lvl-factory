/**
 * setInterval that pauses while the document is hidden (tab backgrounded).
 * Cuts main-thread tick cost when users aren't looking.
 */
import { useEffect, useRef } from "react";

export function useVisibleInterval(
  callback: () => void,
  ms: number,
  enabled = true,
) {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (ms <= 0) return;

    let id: number | null = null;

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      cb.current();
    };

    const start = () => {
      if (id != null) return;
      id = window.setInterval(tick, ms);
    };

    const stop = () => {
      if (id == null) return;
      window.clearInterval(id);
      id = null;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        // catch up once when returning
        tick();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ms, enabled]);
}
