import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Gauge, Radio, Timer, Trash2 } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { IdlePrefetch } from "@/components/ops/idle-prefetch";
import { VisualHero } from "@/components/brand/visual-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  analyzeLongTasks,
  vitalContext,
} from "@/lib/ops/long-task-impact";
import {
  formatVital,
  useMonitorStore,
  type VitalName,
  type VitalRating,
} from "@/lib/ops/monitor";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monitor")({
  head: () => ({
    meta: [
      {
        title: "LVL Monitor — real-time performance | monitor.lvlltd.com",
      },
      {
        name: "description",
        content:
          "Live Web Vitals, route timings, FPS, and long-task monitoring for the LVL mesh.",
      },
    ],
  }),
  component: MonitorPage,
});

const VITAL_ORDER: VitalName[] = ["LCP", "CLS", "INP", "FCP", "TTFB"];

const FpsChart = lazy(() =>
  import("@/components/ops/monitor-charts").then((m) => ({
    default: m.FpsChart,
  })),
);
const RouteTimingChart = lazy(() =>
  import("@/components/ops/monitor-charts").then((m) => ({
    default: m.RouteTimingChart,
  })),
);

function ChartFallback() {
  return (
    <p className="text-sm text-muted">Loading charts…</p>
  );
}

function ratingVariant(
  r: VitalRating,
): "success" | "warning" | "danger" | "default" {
  if (r === "good") return "success";
  if (r === "needs-improvement") return "warning";
  if (r === "poor") return "danger";
  return "default";
}

function healthVariant(
  label: string,
): "success" | "warning" | "danger" | "info" | "default" {
  if (label === "excellent" || label === "stable") return "success";
  if (label === "degraded") return "warning";
  if (label === "critical") return "danger";
  if (label === "warming") return "info";
  return "default";
}

function MonitorPage() {
  const enabled = useMonitorStore((s) => s.enabled);
  const setEnabled = useMonitorStore((s) => s.setEnabled);
  const latest = useMonitorStore((s) => s.latest);
  const vitals = useMonitorStore((s) => s.vitals);
  const routes = useMonitorStore((s) => s.routes);
  const longTasks = useMonitorStore((s) => s.longTasks);
  const fpsSeries = useMonitorStore((s) => s.fpsSeries);
  const path = useMonitorStore((s) => s.path);
  const clear = useMonitorStore((s) => s.clear);
  const probeStartedAt = useMonitorStore((s) => s.probeStartedAt);

  const avgFps = useMemo(() => {
    if (!fpsSeries.length) return 0;
    const last = fpsSeries.slice(-20);
    return (
      Math.round((last.reduce((a, b) => a + b.fps, 0) / last.length) * 10) / 10
    );
  }, [fpsSeries]);

  const health = useMemo(() => {
    // recompute without calling store methods that break getServerSnapshot
    const keys: VitalName[] = ["LCP", "CLS", "INP", "FCP", "TTFB"];
    const present = keys.filter((k) => latest[k]);
    if (present.length === 0 && avgFps === 0) {
      return { score: 0, label: "warming" as const };
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
    const recentLong = longTasks.filter((t) => Date.now() - t.at < 60_000)
      .length;
    if (recentLong > 0 || longTasks.length > 0) {
      max += 10;
      if (recentLong <= 2) pts += 10;
      else if (recentLong <= 6) pts += 6;
      else pts += 2;
    }
    const score = max === 0 ? 0 : Math.round((pts / max) * 100);
    let label: "excellent" | "stable" | "degraded" | "critical" | "warming" =
      "warming";
    if (score >= 90) label = "excellent";
    else if (score >= 72) label = "stable";
    else if (score >= 50) label = "degraded";
    else if (score > 0) label = "critical";
    return { score, label };
  }, [latest, avgFps, longTasks]);

  const fpsChart = useMemo(
    () =>
      fpsSeries.slice(-40).map((p, i) => ({
        i,
        fps: p.fps,
        t: new Date(p.at).toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        }),
      })),
    [fpsSeries],
  );

  const routeChart = useMemo(
    () =>
      [...routes]
        .slice(0, 12)
        .reverse()
        .map((r, i) => ({
          i,
          ms: r.durationMs,
          path: r.path.length > 14 ? r.path.slice(0, 12) + "…" : r.path,
        })),
    [routes],
  );

  const impact = useMemo(
    () => analyzeLongTasks(longTasks, { windowMs: 5 * 60_000 }),
    [longTasks],
  );
  const impactNote = useMemo(
    () => vitalContext(impact, latest.INP),
    [impact, latest.INP],
  );

  const uptimeSec = probeStartedAt
    ? Math.max(0, Math.round((Date.now() - probeStartedAt) / 1000))
    : 0;

  return (
    <div className="space-y-10">
      <IdlePrefetch
        paths={["/labs", "/marketplace", "/exchange", "/vault"]}
      />
      <VisualHero
        image={BRAND_ART.heroFactory}
        eyebrow="monitor.lvlltd.com · real-time performance"
        title="See the mesh breathe."
        description={
          <>
            Live Web Vitals, soft-navigation timings, FPS, and long tasks —
            sampled in this browser across every LVL surface.
          </>
        }
        actions={
          <>
            <Button
              onClick={() => {
                setEnabled(!enabled);
                toast.message(enabled ? "Probe paused" : "Probe live");
              }}
            >
              <Radio className="size-4" />
              {enabled ? "Pause probe" : "Resume probe"}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/pulse">Network pulse</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
          <p className="text-[11px] uppercase tracking-wider text-subtle">
            Health score
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-semibold tabular tracking-tight">
              {health.score}
            </p>
            <Badge variant={healthVariant(health.label)}>{health.label}</Badge>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
          <p className="text-[11px] uppercase tracking-wider text-subtle">
            Avg FPS
          </p>
          <p className="text-2xl font-semibold tabular tracking-tight">
            {avgFps || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
          <p className="text-[11px] uppercase tracking-wider text-subtle">
            Active path
          </p>
          <p className="truncate font-mono text-sm font-semibold tracking-tight">
            {path}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
          <p className="text-[11px] uppercase tracking-wider text-subtle">
            Probe
          </p>
          <p className="text-sm font-semibold tracking-tight">
            {enabled ? (
              <span className="text-success">live · {uptimeSec}s</span>
            ) : (
              <span className="text-warning">paused</span>
            )}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Gauge className="size-4 text-muted" />
            Web Vitals
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              clear();
              toast.message("Samples cleared");
            }}
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {VITAL_ORDER.map((name) => {
            const sample = latest[name];
            return (
              <Card
                key={name}
                className="border-border bg-surface shadow-soft"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium tracking-wide">
                      {name}
                    </CardTitle>
                    <Badge
                      variant={ratingVariant(sample?.rating ?? "unknown")}
                    >
                      {sample?.rating ?? "—"}
                    </Badge>
                  </div>
                  <CardDescription className="font-mono text-[11px]">
                    {sample?.path ?? "waiting"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular tracking-tight">
                    {sample
                      ? formatVital(name, sample.value)
                      : "—"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">FPS stream</CardTitle>
            <CardDescription>
              requestAnimationFrame · ~1s buckets · recharts lazy-loaded
            </CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <Suspense fallback={<ChartFallback />}>
              <FpsChart data={fpsChart} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Route timings</CardTitle>
            <CardDescription>
              Soft navigations · ms between path changes
            </CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <Suspense fallback={<ChartFallback />}>
              <RouteTimingChart data={routeChart} />
            </Suspense>
          </CardContent>
        </Card>
      </div>


      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Timer className="size-4 text-muted" />
          Long task impact
        </h2>
        <p className="max-w-3xl text-sm text-muted">{impactNote}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Impact score", value: String(impact.impactScore), hint: "0 good · 100 bad" },
            { label: "Total blocking (TBT)", value: `${impact.tbtMs}ms`, hint: `${impact.count} tasks · 5m window` },
            { label: "Frames dropped", value: String(impact.framesDropped), hint: "@ 60fps budget" },
            { label: "INP risk", value: impact.inpRisk, hint: `p95 ${impact.p95Ms}ms · max ${impact.maxMs}ms` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft"
            >
              <p className="text-[11px] uppercase tracking-wider text-subtle">
                {s.label}
              </p>
              <p className="text-xl font-semibold tabular tracking-tight capitalize">
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px] text-subtle">{s.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border bg-surface shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Severity buckets</CardTitle>
              <CardDescription>
                mild 50–100 · moderate 100–200 · heavy 200–500 · severe 500+
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["mild", impact.buckets.mild, "success"],
                  ["moderate", impact.buckets.moderate, "info"],
                  ["heavy", impact.buckets.heavy, "warning"],
                  ["severe", impact.buckets.severe, "danger"],
                ] as const
              ).map(([label, n, variant]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-center"
                >
                  <Badge variant={variant}>{label}</Badge>
                  <p className="mt-1 text-lg font-semibold tabular">{n}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border bg-surface shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Path heat (by TBT)</CardTitle>
              <CardDescription>
                Share of blocking time · collision risk{" "}
                {Math.round(impact.collisionRisk * 100)}%
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-48 space-y-2 overflow-y-auto">
              {impact.byPath.length === 0 ? (
                <p className="text-sm text-muted">
                  No path heat yet — navigate the mesh with the probe live.
                </p>
              ) : (
                impact.byPath.slice(0, 8).map((row) => (
                  <div key={row.path} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-mono text-fg">
                        {row.path}
                      </span>
                      <span className="shrink-0 tabular text-muted">
                        TBT {row.tbtMs}ms · max {row.maxMs}ms
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-warning/80"
                        style={{
                          width: `${Math.min(100, Math.max(4, row.sharePct))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-surface shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Analyst notes</CardTitle>
            <CardDescription>
              Duty cycle {(impact.dutyCycle * 100).toFixed(1)}% of observed span
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted">
              {impact.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="text-subtle">·</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Long tasks
            </CardTitle>
            <CardDescription>Main-thread blocks ≥50ms</CardDescription>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-y-auto">
            {longTasks.length === 0 ? (
              <p className="text-sm text-muted">None yet — good signal.</p>
            ) : (
              longTasks.slice(0, 12).map((t, i) => (
                <div
                  key={`${t.at}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                >
                  <span className="min-w-0 truncate font-mono text-fg">
                    {t.path}
                  </span>
                  <span
                    className={cn(
                      "tabular font-semibold",
                      t.durationMs > 100 ? "text-warning" : "text-muted",
                    )}
                  >
                    {Math.round(t.durationMs)}ms
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Vital tape</CardTitle>
            <CardDescription>Newest samples first</CardDescription>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-y-auto">
            {vitals.length === 0 ? (
              <p className="text-sm text-muted">
                Probe is listening — interact to emit LCP / CLS / INP.
              </p>
            ) : (
              vitals.slice(0, 16).map((v, i) => (
                <div
                  key={`${v.name}-${v.at}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant={ratingVariant(v.rating)}>{v.name}</Badge>
                    <span className="truncate font-mono text-subtle">
                      {v.path}
                    </span>
                  </div>
                  <span className="shrink-0 tabular font-semibold text-fg">
                    {formatVital(v.name, v.value)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-surface shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Recent routes</CardTitle>
          <CardDescription>
            Duration · resources · transfer (this session)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {routes.length === 0 ? (
            <p className="text-sm text-muted">No soft navigations yet.</p>
          ) : (
            routes.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-mono text-fg">{r.path}</span>
                <span className="tabular text-muted">
                  {r.durationMs}ms · {r.resourceCount} res · {r.transferKb} KB
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
