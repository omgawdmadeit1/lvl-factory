/**
 * Long-task impact analysis — TBT, frame budget, INP risk, path heat.
 * Pure functions over monitor samples (SSR-safe).
 */
import type { LongTaskSample, VitalSample } from "@/lib/ops/monitor";

export type InpRisk = "none" | "low" | "medium" | "high" | "critical";

export type PathImpact = {
  path: string;
  count: number;
  totalMs: number;
  /** Total Blocking Time ≈ sum(max(0, duration - 50)) */
  tbtMs: number;
  maxMs: number;
  avgMs: number;
  /** ~frames skipped at 60fps */
  framesDropped: number;
  sharePct: number;
};

export type LongTaskImpact = {
  count: number;
  totalMs: number;
  tbtMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  framesDropped: number;
  /** Main-thread duty cycle over the observation window (0–1) */
  dutyCycle: number;
  /** Estimated chance a random click lands inside a long task (0–1) */
  collisionRisk: number;
  inpRisk: InpRisk;
  inpRiskLabel: string;
  /** 0–100 composite (higher = worse impact) */
  impactScore: number;
  buckets: {
    mild: number; // 50–100
    moderate: number; // 100–200
    heavy: number; // 200–500
    severe: number; // 500+
  };
  byPath: PathImpact[];
  windowMs: number;
  notes: string[];
};

const FRAME_MS = 1000 / 60;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[i]!;
}

export function blockingMs(duration: number): number {
  return Math.max(0, duration - 50);
}

export function framesDroppedFor(duration: number): number {
  return Math.floor(duration / FRAME_MS);
}

export function rateInpRisk(tbtMs: number, maxMs: number, count: number): InpRisk {
  if (count === 0) return "none";
  if (maxMs >= 500 || tbtMs >= 800) return "critical";
  if (maxMs >= 250 || tbtMs >= 400) return "high";
  if (maxMs >= 120 || tbtMs >= 150) return "medium";
  return "low";
}

export function inpRiskLabel(r: InpRisk): string {
  switch (r) {
    case "none":
      return "No long tasks — INP headroom is open";
    case "low":
      return "Minor jank risk — most taps stay under 200ms";
    case "medium":
      return "Noticeable risk — some interactions may feel sticky";
    case "high":
      return "Elevated INP risk — main thread often blocked >50ms";
    case "critical":
      return "Critical — multi-frame freezes likely on interaction";
  }
}

export function analyzeLongTasks(
  tasks: LongTaskSample[],
  opts?: { now?: number; windowMs?: number },
): LongTaskImpact {
  const now = opts?.now ?? Date.now();
  const windowMs = opts?.windowMs ?? 5 * 60_000;
  const recent = tasks.filter((t) => now - t.at <= windowMs);
  const durs = recent.map((t) => t.durationMs).sort((a, b) => a - b);
  const totalMs = recent.reduce((s, t) => s + t.durationMs, 0);
  const tbtMs = recent.reduce((s, t) => s + blockingMs(t.durationMs), 0);
  const maxMs = durs.length ? durs[durs.length - 1]! : 0;
  const framesDropped = recent.reduce(
    (s, t) => s + framesDroppedFor(t.durationMs),
    0,
  );

  // Observation span from first to last sample (or full window if empty)
  let span = windowMs;
  if (recent.length >= 2) {
    const times = recent.map((t) => t.at);
    span = Math.max(1000, Math.max(...times) - Math.min(...times));
  } else if (recent.length === 1) {
    span = Math.max(1000, Math.min(windowMs, 30_000));
  }

  const dutyCycle = Math.min(1, totalMs / span);
  // Rough collision model: probability a 100ms interaction window overlaps a block
  const collisionRisk = Math.min(1, dutyCycle * 1.4 + (maxMs > 200 ? 0.1 : 0));

  const buckets = { mild: 0, moderate: 0, heavy: 0, severe: 0 };
  for (const d of durs) {
    if (d < 100) buckets.mild++;
    else if (d < 200) buckets.moderate++;
    else if (d < 500) buckets.heavy++;
    else buckets.severe++;
  }

  const byPathMap = new Map<
    string,
    { count: number; totalMs: number; tbtMs: number; maxMs: number }
  >();
  for (const t of recent) {
    const cur = byPathMap.get(t.path) ?? {
      count: 0,
      totalMs: 0,
      tbtMs: 0,
      maxMs: 0,
    };
    cur.count += 1;
    cur.totalMs += t.durationMs;
    cur.tbtMs += blockingMs(t.durationMs);
    cur.maxMs = Math.max(cur.maxMs, t.durationMs);
    byPathMap.set(t.path, cur);
  }
  const byPath: PathImpact[] = [...byPathMap.entries()]
    .map(([path, v]) => ({
      path,
      count: v.count,
      totalMs: Math.round(v.totalMs),
      tbtMs: Math.round(v.tbtMs),
      maxMs: Math.round(v.maxMs),
      avgMs: Math.round(v.totalMs / v.count),
      framesDropped: Math.floor(v.totalMs / FRAME_MS),
      sharePct:
        tbtMs > 0 ? Math.round((v.tbtMs / tbtMs) * 100) : v.count ? 100 : 0,
    }))
    .sort((a, b) => b.tbtMs - a.tbtMs || b.maxMs - a.maxMs);

  const inpRisk = rateInpRisk(tbtMs, maxMs, recent.length);
  // Impact score: weighted TBT + max + count + severe bucket
  let impactScore = 0;
  if (recent.length) {
    impactScore += Math.min(40, tbtMs / 10);
    impactScore += Math.min(25, maxMs / 20);
    impactScore += Math.min(15, recent.length * 2);
    impactScore += buckets.severe * 8 + buckets.heavy * 3;
    impactScore = Math.min(100, Math.round(impactScore));
  }

  const notes: string[] = [];
  if (recent.length === 0) {
    notes.push(
      "No long tasks in the window — main thread stayed under the 50ms LoAF threshold.",
    );
    notes.push(
      "Keep sampling while opening Labs, Exchange ticks, and Monitor charts; those are the usual emitters.",
    );
  } else {
    notes.push(
      `Total Blocking Time ${Math.round(tbtMs)}ms across ${recent.length} task(s) — this is the best single proxy for interaction lag.`,
    );
    notes.push(
      `~${framesDropped} frames dropped at 60fps (each task burns floor(duration/16.7) frames).`,
    );
    if (byPath[0]) {
      notes.push(
        `Hottest path: ${byPath[0].path} (${byPath[0].sharePct}% of TBT, max ${byPath[0].maxMs}ms).`,
      );
    }
    if (buckets.severe > 0) {
      notes.push(
        `${buckets.severe} severe task(s) ≥500ms — users will perceive freezes.`,
      );
    } else if (buckets.heavy > 0) {
      notes.push(
        `${buckets.heavy} heavy task(s) 200–500ms — scroll/tap may hitch.`,
      );
    }
    if (collisionRisk >= 0.2) {
      notes.push(
        `Estimated interaction collision risk ~${Math.round(collisionRisk * 100)}% under current duty cycle.`,
      );
    }
  }

  return {
    count: recent.length,
    totalMs: Math.round(totalMs),
    tbtMs: Math.round(tbtMs),
    maxMs: Math.round(maxMs),
    p50Ms: Math.round(percentile(durs, 0.5)),
    p95Ms: Math.round(percentile(durs, 0.95)),
    framesDropped,
    dutyCycle: Math.round(dutyCycle * 1000) / 1000,
    collisionRisk: Math.round(collisionRisk * 1000) / 1000,
    inpRisk,
    inpRiskLabel: inpRiskLabel(inpRisk),
    impactScore,
    buckets,
    byPath,
    windowMs,
    notes,
  };
}

/** Optional: relate long-task heat to latest INP sample */
export function vitalContext(
  impact: LongTaskImpact,
  latestInp?: VitalSample,
): string {
  if (!latestInp) {
    return impact.inpRiskLabel;
  }
  const inp = Math.round(latestInp.value);
  if (impact.tbtMs === 0 && latestInp.rating === "good") {
    return `INP ${inp}ms is good and no long tasks are inflating it.`;
  }
  if (impact.tbtMs > 0 && latestInp.rating !== "good") {
    return `INP ${inp}ms (${latestInp.rating}) aligns with ${impact.tbtMs}ms TBT from long tasks.`;
  }
  if (impact.tbtMs > 0 && latestInp.rating === "good") {
    return `INP ${inp}ms still good, but ${impact.count} long task(s) are eating frame budget in the background.`;
  }
  return impact.inpRiskLabel;
}
