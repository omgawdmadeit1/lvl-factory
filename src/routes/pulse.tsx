import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { VisualHero } from "@/components/brand/visual-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { kindLabel, usePulseStore, type PulseKind } from "@/lib/edge/pulse";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pulse")({
  head: () => ({
    meta: [
      { title: "Network pulse — LVL | lvlltd.com" },
      {
        name: "description",
        content:
          "Live activity across shop, drops, agents, pay, and seller surfaces on the LVL domain network.",
      },
    ],
  }),
  component: PulsePage,
});

const FILTERS: Array<PulseKind | "all"> = [
  "all",
  "purchase",
  "drop_claim",
  "agent_buy",
  "settle",
  "publish",
  "studio",
  "referral",
];

function relative(iso: string, now: number): string {
  const d = now - Date.parse(iso);
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

function PulsePage() {
  const events = usePulseStore((s) => s.events);
  const [filter, setFilter] = useState<PulseKind | "all">("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  // Ambient drip — inject a soft seed-like event occasionally for demo life
  useEffect(() => {
    const t = window.setInterval(() => {
      if (Math.random() > 0.45) return;
      usePulseStore.getState().push({
        kind: (["purchase", "agent_buy", "settle", "drop_claim"] as const)[
          Math.floor(Math.random() * 4)
        ],
        host: ["shop.lvlltd.com", "agents.lvlltd.com", "pay.lvlltd.com", "drops.lvlltd.com"][
          Math.floor(Math.random() * 4)
        ]!,
        message: [
          "Cart settled on Base USDC",
          "Agent intent handed off to /pay",
          "Drop unit reserved",
          "Wishlist → cart conversion",
        ][Math.floor(Math.random() * 4)]!,
        meta: "ambient",
      });
    }, 22_000);
    return () => window.clearInterval(t);
  }, []);

  const feed = useMemo(() => {
    const list = [...events].sort(
      (a, b) => Date.parse(b.at) - Date.parse(a.at),
    );
    if (filter === "all") return list;
    return list.filter((e) => e.kind === filter);
  }, [events, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    for (const e of events) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <div className="space-y-8">
      <VisualHero
        image={BRAND_ART.heroFactory}
        compact
        eyebrow="pulse.lvlltd.com · live network"
        title="Domain pulse"
        description="Cross-surface activity: human shop, agent relay, drops, and multi-rail settle — one stream."
        actions={
          <>
            <Button asChild>
              <Link to="/drops">
                <Radio className="size-4" />
                Live drops
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/relay">Agent relay</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              filter === f
                ? "border-border-strong bg-surface-2 text-fg"
                : "border-border text-muted hover:bg-surface",
            )}
          >
            {f === "all" ? "All" : kindLabel(f)}{" "}
            <span className="tabular text-subtle">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Activity className="size-4 text-muted" />
          <p className="text-sm font-medium">Live feed</p>
          <Badge variant="success" className="ml-auto">
            streaming
          </Badge>
        </div>
        <ul className="divide-y divide-border">
          {feed.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{kindLabel(e.kind)}</Badge>
                  <span className="font-mono text-[11px] text-subtle">
                    {e.host}
                  </span>
                </div>
                <p className="text-sm text-fg">{e.message}</p>
                {e.meta ? (
                  <p className="text-xs text-subtle">{e.meta}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-xs tabular text-subtle">
                {relative(e.at, now)}
              </p>
            </li>
          ))}
          {!feed.length ? (
            <li className="px-4 py-10 text-center text-sm text-muted">
              No events in this filter
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
