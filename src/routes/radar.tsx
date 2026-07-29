import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, Radar } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { VisualHero } from "@/components/brand/visual-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDropsStore, materializeDrops } from "@/lib/edge/drops";
import { usePulseStore } from "@/lib/edge/pulse";
import { useRadarStore } from "@/lib/edge/radar";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Restock radar — LVL | lvlltd.com" },
      {
        name: "description",
        content:
          "Watch sold-out drops and SKUs. Local restock radar on the LVL domain network.",
      },
    ],
  }),
  component: RadarPage,
});

function RadarPage() {
  const watches = useRadarStore((s) => s.watches);
  const unwatch = useRadarStore((s) => s.unwatch);
  const markNotified = useRadarStore((s) => s.markNotified);
  const clear = useRadarStore((s) => s.clear);
  const epochMs = useDropsStore((s) => s.epochMs);
  const ensureEpoch = useDropsStore((s) => s.ensureEpoch);
  const remainingOf = useDropsStore((s) => s.remainingOf);
  const statusOf = useDropsStore((s) => s.statusOf);
  const push = usePulseStore((s) => s.push);

  useEffect(() => {
    ensureEpoch();
  }, [ensureEpoch]);

  useEffect(() => {
    if (!epochMs) return;
    const drops = materializeDrops(epochMs);
    for (const w of watches) {
      if (w.notified) continue;
      const drop = drops.find((d) => d.productSlug === w.productSlug);
      if (!drop) continue;
      const st = statusOf(drop);
      const left = remainingOf(drop.id, drop.supply);
      if (st === "live" && left > 0) {
        markNotified(w.id);
        push({
          kind: "drop_claim",
          host: "radar.lvlltd.com",
          message: `Radar hit · ${w.title} is live again`,
          meta: `${left} left`,
        });
        toast.success(`${w.title} is live — open drops`);
      }
    }
  }, [
    epochMs,
    watches,
    statusOf,
    remainingOf,
    markNotified,
    push,
  ]);

  return (
    <div className="space-y-8">
      <VisualHero
        image={BRAND_ART.heroNetwork}
        eyebrow="radar.lvlltd.com · restock watch"
        title="Restock radar"
        description="Pin drops and SKUs you missed. When a watched flash window goes live again, pulse + toast fire on this device."
        actions={
          <>
            <Button asChild>
              <Link to="/drops">Open drops</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/shop">Shop catalog</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">local alerts</Badge>
          <Badge variant="default">{watches.length} watching</Badge>
        </div>
        {watches.length ? (
          <Button type="button" variant="secondary" size="sm" onClick={clear}>
            Clear all
          </Button>
        ) : null}
      </div>

      {watches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <Radar className="mx-auto size-8 text-muted" />
          <p className="mt-3 text-sm font-medium">No watches yet</p>
          <p className="mt-1 text-xs text-muted">
            From a drop or product page, hit &ldquo;Watch restock&rdquo; to pin
            it here.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/drops">Browse drops</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {watches.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{w.title}</p>
                <p className="text-xs text-muted">
                  {w.productSlug} · {w.source}
                  {w.notified ? " · notified" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to="/shop/$slug" params={{ slug: w.productSlug }}>
                    View
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    unwatch(w.id);
                    toast.message("Removed from radar");
                  }}
                  aria-label="Stop watching"
                >
                  <BellOff className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 text-xs text-muted">
        <Bell className="mt-0.5 size-3.5 shrink-0" />
        Alerts are device-local (no push server). Revisit radar while drops are
        open to catch re-opens.
      </p>
    </div>
  );
}
