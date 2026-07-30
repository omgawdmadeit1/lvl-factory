/**
 * Global real-time performance probe — mounts once in the root shell.
 * Collects Web Vitals, long tasks, FPS, and soft-navigation timings.
 */
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMonitorStore } from "@/lib/ops/monitor";

function readNavTiming(path: string) {
  try {
    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;
    const store = useMonitorStore.getState();
    if (nav.responseStart > 0) {
      store.pushVital("TTFB", nav.responseStart, path);
    }
    if (nav.domContentLoadedEventEnd > 0) {
      // FCP often via paint; fallback from DCL if paint missing
    }
    const paints = performance.getEntriesByType("paint");
    for (const p of paints) {
      if (p.name === "first-contentful-paint") {
        store.pushVital("FCP", p.startTime, path);
      }
    }
  } catch {
    /* ignore */
  }
}

function resourceSnapshot() {
  try {
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const count = resources.length;
    const transfer = resources.reduce(
      (s, r) => s + (r.transferSize || 0),
      0,
    );
    return { count, transferKb: Math.round(transfer / 1024) };
  } catch {
    return { count: 0, transferKb: 0 };
  }
}

export function PerformanceProbe() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const enabled = useMonitorStore((s) => s.enabled);
  const setPath = useMonitorStore((s) => s.setPath);
  const markProbeStart = useMonitorStore((s) => s.markProbeStart);
  const pushRoute = useMonitorStore((s) => s.pushRoute);
  const pushFps = useMonitorStore((s) => s.pushFps);
  const pushLongTask = useMonitorStore((s) => s.pushLongTask);
  const pushVital = useMonitorStore((s) => s.pushVital);

  const navStart = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : 0,
  );
  const prevPath = useRef(pathname);
  const firstNav = useRef(true);

  // Path changes → soft nav sample
  useEffect(() => {
    setPath(pathname);
    if (firstNav.current) {
      firstNav.current = false;
      prevPath.current = pathname;
      navStart.current = performance.now();
      readNavTiming(pathname);
      return;
    }
    if (prevPath.current === pathname) return;
    const durationMs = Math.round(performance.now() - navStart.current);
    const snap = resourceSnapshot();
    pushRoute({
      path: pathname,
      durationMs,
      at: Date.now(),
      resourceCount: snap.count,
      transferKb: snap.transferKb,
    });
    prevPath.current = pathname;
    navStart.current = performance.now();
  }, [pathname, setPath, pushRoute]);

  // Observers + FPS loop
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    markProbeStart();
    const path = () => useMonitorStore.getState().path;
    const observers: PerformanceObserver[] = [];

    const observe = (type: string, cb: (list: PerformanceObserverEntryList) => void) => {
      try {
        const po = new PerformanceObserver(cb);
        po.observe({ type, buffered: true } as PerformanceObserverInit);
        observers.push(po);
      } catch {
        /* unsupported */
      }
    };

    observe("largest-contentful-paint", (list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) pushVital("LCP", last.startTime, path());
    });

    observe("layout-shift", (list) => {
      let cls = useMonitorStore.getState().latest.CLS?.value ?? 0;
      for (const entry of list.getEntries()) {
        const ls = entry as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
        };
        if (!ls.hadRecentInput && typeof ls.value === "number") {
          cls += ls.value;
        }
      }
      pushVital("CLS", cls, path());
    });

    observe("event", (list) => {
      // Event Timing API → INP approximation (max interaction delay)
      let max = 0;
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & {
          duration?: number;
          interactionId?: number;
        };
        if (e.interactionId && typeof e.duration === "number") {
          max = Math.max(max, e.duration);
        }
      }
      if (max > 0) pushVital("INP", max, path());
    });

    observe("first-input", (list) => {
      const first = list.getEntries()[0] as
        | (PerformanceEntry & { processingStart?: number; startTime?: number })
        | undefined;
      if (first && first.processingStart != null && first.startTime != null) {
        pushVital("INP", first.processingStart - first.startTime, path());
      }
    });

    observe("paint", (list) => {
      for (const e of list.getEntries()) {
        if (e.name === "first-contentful-paint") {
          pushVital("FCP", e.startTime, path());
        }
      }
    });

    observe("navigation", (list) => {
      for (const e of list.getEntries()) {
        const n = e as PerformanceNavigationTiming;
        if (n.responseStart > 0) pushVital("TTFB", n.responseStart, path());
      }
    });

    observe("longtask", (list) => {
      for (const e of list.getEntries()) {
        pushLongTask(e.duration, path());
      }
    });

    // FPS via rAF bucket every ~1s
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        const fps = (frames * 1000) / (now - last);
        pushFps(fps);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Initial paint/nav snapshot
    readNavTiming(path());

    return () => {
      for (const o of observers) {
        try {
          o.disconnect();
        } catch {
          /* ignore */
        }
      }
      cancelAnimationFrame(raf);
    };
  }, [enabled, markProbeStart, pushFps, pushLongTask, pushVital]);

  return null;
}
