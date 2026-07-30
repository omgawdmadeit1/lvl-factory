import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Pin } from "lucide-react";
import { useEffect } from "react";
import { useVisibleInterval } from "@/lib/ops/use-visible-interval";
import { toast } from "sonner";
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
import { Progress } from "@/components/ui/progress";
import {
  ORACLE_FORECASTS,
  useOracleStore,
  type Forecast,
} from "@/lib/markets/oracle";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/oracle")({
  head: () => ({
    meta: [
      { title: "LVL Oracle — demand forecasts | oracle.lvlltd.com" },
      {
        name: "description",
        content:
          "Demand forecasts from radar, drops, arena, and signal — pin SKUs and act on restock / launch advice.",
      },
    ],
  }),
  component: OraclePage,
});

function ForecastCard({ f }: { f: Forecast }) {
  const heat = useOracleStore((s) => s.liveHeat[f.id] ?? f.heat);
  const pinned = useOracleStore((s) => s.pinned.includes(f.id));
  const toggle = useOracleStore((s) => s.togglePin);

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{f.horizon}</Badge>
          <Badge variant="warning">heat {heat}</Badge>
          {pinned ? <Badge variant="success">pinned</Badge> : null}
        </div>
        <CardTitle className="text-base tracking-tight">{f.title}</CardTitle>
        <CardDescription>
          SKU <span className="font-mono text-fg">{f.sku}</span> · {f.source}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Demand
            </p>
            <p className="text-lg font-semibold tabular">{f.demandUnits}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Confidence
            </p>
            <p className="text-lg font-semibold tabular">{f.confidence}%</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] text-subtle">Live heat</p>
          <Progress value={heat} />
        </div>
        <p className="text-xs text-muted">
          Action: <span className="text-fg">{f.action}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={pinned ? "secondary" : "default"}
            onClick={() => {
              toggle(f.id);
              toast.message(pinned ? "Unpinned" : "Pinned forecast");
            }}
          >
            <Pin className="size-3.5" />
            {pinned ? "Unpin" : "Pin"}
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/radar">Radar</Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/signal">Signal</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OraclePage() {
  const horizon = useOracleStore((s) => s.horizon);
  const setHorizon = useOracleStore((s) => s.setHorizon);
  const tick = useOracleStore((s) => s.tickHeat);
  const pinned = useOracleStore((s) => s.pinned);

  useVisibleInterval(() => tick(), 2800);
  useEffect(() => {
    tick();
  }, [tick]);

  const list =
    horizon === "all"
      ? ORACLE_FORECASTS
      : ORACLE_FORECASTS.filter((f) => f.horizon === horizon);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroNetwork}
        eyebrow="oracle.lvlltd.com · demand oracle"
        title="See demand before it sells out."
        description={
          <>
            Forecasts fused from Radar, Drops, Arena, Signal, and shop search —
            pin SKUs and act on restock or Launch moves.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/radar">
                <Eye className="size-4" />
                Restock radar
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/signal">Signal market</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "7d", "14d", "30d"] as const).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              horizon === h
                ? "border-fg/30 bg-surface-2 text-fg"
                : "border-border text-muted hover:bg-surface",
            )}
          >
            {h === "all" ? "All horizons" : h}
          </button>
        ))}
        <span className="text-xs text-muted">
          {pinned.length} pinned
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((f) => (
          <ForecastCard key={f.id} f={f} />
        ))}
      </div>
    </div>
  );
}
