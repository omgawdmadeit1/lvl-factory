/**
 * LVL Monitor — real-time performance samples (Web Vitals + route + FPS).
 * Client-collected; SSR-safe empty defaults.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type VitalName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
export type VitalRating = "good" | "needs-improvement" | "poor" | "unknown";

export type VitalSample = {
  name: VitalName;
  value: number;
  rating: VitalRating;
  at: number;
  path: string;
};

export type RouteSample = {
  id: string;
  path: string;
  durationMs: number;
  at: number;
  resourceCount: number;
  transferKb: number;
};

export type LongTaskSample = {
  at: number;
  durationMs: number;
  path: string;
};

export type HealthScore = {
  score: number;
  label: "excellent" | "stable" | "degraded" | "critical" | "warming";
};

const MAX_VITALS = 80;
const MAX_ROUTES = 60;
const MAX_LONG = 40;
const MAX_FPS = 90;

export function rateVital(name: VitalName, value: number): VitalRating {
  if (!Number.isFinite(value)) return "unknown";
  switch (name) {
    case "LCP":
      if (value <= 2500) return "good";
      if (value <= 4000) return "needs-improvement";
      return "poor";
    case "FCP":
      if (value <= 1800) return "good";
      if (value <= 3000) return "needs-improvement";
      return "poor";
    case "TTFB":
      if (value <= 800) return "good";
      if (value <= 1800) return "needs-improvement";
      return "poor";
    case "CLS":
      if (value <= 0.1) return "good";
      if (value <= 0.25) return "needs-improvement";
      return "poor";
    case "INP":
      if (value <= 200) return "good";
      if (value <= 500) return "needs-improvement";
      return "poor";
    default:
      return "unknown";
  }
}

export function formatVital(name: VitalName, value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (name === "CLS") return value.toFixed(3);
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

function noopStorage() {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

function storage() {
  if (typeof window === "undefined") return createJSONStorage(noopStorage);
  return createJSONStorage(() => localStorage);
}

interface MonitorState {
  enabled: boolean;
  path: string;
  vitals: VitalSample[];
  routes: RouteSample[];
  longTasks: LongTaskSample[];
  fpsSeries: { at: number; fps: number }[];
  latest: Partial<Record<VitalName, VitalSample>>;
  probeStartedAt: number | null;
  setEnabled: (on: boolean) => void;
  setPath: (path: string) => void;
  pushVital: (name: VitalName, value: number, path?: string) => void;
  pushRoute: (sample: Omit<RouteSample, "id">) => void;
  pushLongTask: (durationMs: number, path?: string) => void;
  pushFps: (fps: number) => void;
  markProbeStart: () => void;
  health: () => HealthScore;
  avgFps: () => number;
  clear: () => void;
}

function scoreFromLatest(
  latest: Partial<Record<VitalName, VitalSample>>,
  avgFps: number,
  longCount: number,
): HealthScore {
  const keys: VitalName[] = ["LCP", "CLS", "INP", "FCP", "TTFB"];
  const present = keys.filter((k) => latest[k]);
  if (present.length === 0 && avgFps === 0) {
    return { score: 0, label: "warming" };
  }
  let pts = 0;
  let max = 0;
  for (const k of present) {
    max += 20;
    const r = latest[k]!.rating;
    if (r === "good") pts += 20;
    else if (r === "needs-improvement") pts += 12;
    else if (r === "poor") pts += 4;
    else pts += 10;
  }
  if (avgFps > 0) {
    max += 20;
    if (avgFps >= 55) pts += 20;
    else if (avgFps >= 40) pts += 12;
    else pts += 4;
  }
  if (longCount > 0) {
    max += 10;
    if (longCount <= 2) pts += 10;
    else if (longCount <= 6) pts += 6;
    else pts += 2;
  }
  const score = max === 0 ? 0 : Math.round((pts / max) * 100);
  let label: HealthScore["label"] = "warming";
  if (score >= 90) label = "excellent";
  else if (score >= 72) label = "stable";
  else if (score >= 50) label = "degraded";
  else if (score > 0) label = "critical";
  return { score, label };
}

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set, get) => ({
      enabled: true,
      path: "/",
      vitals: [],
      routes: [],
      longTasks: [],
      fpsSeries: [],
      latest: {},
      probeStartedAt: null,
      setEnabled: (on) => set({ enabled: on }),
      setPath: (path) => set({ path }),
      markProbeStart: () =>
        set((s) =>
          s.probeStartedAt ? s : { probeStartedAt: Date.now() },
        ),
      pushVital: (name, value, path) => {
        if (!get().enabled) return;
        const sample: VitalSample = {
          name,
          value,
          rating: rateVital(name, value),
          at: Date.now(),
          path: path ?? get().path,
        };
        set((s) => ({
          vitals: [sample, ...s.vitals].slice(0, MAX_VITALS),
          latest: { ...s.latest, [name]: sample },
        }));
      },
      pushRoute: (sample) => {
        if (!get().enabled) return;
        const full: RouteSample = {
          ...sample,
          id: `rt-${sample.at.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        };
        set((s) => ({
          routes: [full, ...s.routes].slice(0, MAX_ROUTES),
        }));
      },
      pushLongTask: (durationMs, path) => {
        if (!get().enabled) return;
        set((s) => ({
          longTasks: [
            {
              at: Date.now(),
              durationMs,
              path: path ?? s.path,
            },
            ...s.longTasks,
          ].slice(0, MAX_LONG),
        }));
      },
      pushFps: (fps) => {
        if (!get().enabled) return;
        set((s) => ({
          fpsSeries: [
            ...s.fpsSeries,
            { at: Date.now(), fps: Math.round(fps) },
          ].slice(-MAX_FPS),
        }));
      },
      avgFps: () => {
        const series = get().fpsSeries;
        if (!series.length) return 0;
        const last = series.slice(-20);
        return (
          Math.round(
            (last.reduce((a, b) => a + b.fps, 0) / last.length) * 10,
          ) / 10
        );
      },
      health: () => {
        const s = get();
        const recentLong = s.longTasks.filter(
          (t) => Date.now() - t.at < 60_000,
        ).length;
        return scoreFromLatest(s.latest, s.avgFps(), recentLong);
      },
      clear: () =>
        set({
          vitals: [],
          routes: [],
          longTasks: [],
          fpsSeries: [],
          latest: {},
        }),
    }),
    {
      name: "lvl-monitor-v1",
      storage: storage(),
      partialize: (s) => ({
        enabled: s.enabled,
        vitals: s.vitals.slice(0, 30),
        routes: s.routes.slice(0, 20),
        latest: s.latest,
      }),
    },
  ),
);
