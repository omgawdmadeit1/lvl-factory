import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell, Timer, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { VisualHero } from "@/components/brand/visual-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatCountdown,
  materializeDrops,
  useDropsStore,
  type LiveDrop,
} from "@/lib/edge/drops";
import { creditsForSpend, useLoyaltyStore } from "@/lib/edge/loyalty";
import { usePulseStore } from "@/lib/edge/pulse";
import { useRadarStore } from "@/lib/edge/radar";
import { useMerchStore } from "@/lib/merch/store";
import { useCartStore } from "@/lib/store/cart";
import { BRAND_ART, LOCAL_MOCKUPS } from "@/lib/store/images";
import { storeMoney } from "@/lib/store/collections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drops")({
  head: () => ({
    meta: [
      { title: "Live drops — LVL | lvlltd.com" },
      {
        name: "description",
        content:
          "Timed limited merch drops on the LVL network. Flash inventory, multi-rail settle, Printify POD.",
      },
    ],
  }),
  component: DropsPage,
});

function DropCard({ drop }: { drop: LiveDrop }) {
  const remainingOf = useDropsStore((s) => s.remainingOf);
  const claim = useDropsStore((s) => s.claim);
  const statusOf = useDropsStore((s) => s.statusOf);
  const products = useMerchStore((s) => s.products);
  const add = useCartStore((s) => s.add);
  const earn = useLoyaltyStore((s) => s.earn);
  const push = usePulseStore((s) => s.push);
  const watch = useRadarStore((s) => s.watch);
  const watching = useRadarStore((s) => s.has(drop.productSlug));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const status = statusOf(drop);
  const left = remainingOf(drop.id, drop.supply);
  const product = products.find((p) => p.slug === drop.productSlug);
  const img =
    LOCAL_MOCKUPS[drop.productSlug] ?? BRAND_ART.collectionTees;
  const target =
    status === "upcoming"
      ? drop.startsAt
      : status === "live"
        ? drop.endsAt
        : drop.endsAt;
  const pct = Math.round((left / drop.supply) * 100);

  function onClaim() {
    if (status !== "live") {
      toast.message(status === "upcoming" ? "Drop not live yet" : "Drop closed");
      return;
    }
    const ok = claim(drop.id, drop.supply, 1);
    if (!ok) {
      toast.error("Sold out");
      return;
    }
    if (product) add(product, { qty: 1 });
    const bonus = Math.max(5, Math.floor(creditsForSpend(drop.priceUsd) * 0.25));
    earn(bonus, `Drop bonus · ${drop.title}`, "drop_bonus");
    push({
      kind: "drop_claim",
      host: "drops.lvlltd.com",
      message: `Claimed ${drop.title} · ${left - 1} left`,
      meta: drop.slug,
    });
    toast.success(`Claimed · +${bonus} credits · added to cart`);
  }

  function onWatch() {
    watch({
      productSlug: drop.productSlug,
      title: drop.title,
      source: "drop",
    });
    toast.success("On restock radar");
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <img src={img} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/30 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge variant={drop.accent}>{drop.badge}</Badge>
          <Badge
            variant={
              status === "live"
                ? "success"
                : status === "upcoming"
                  ? "info"
                  : "default"
            }
          >
            {status === "sold_out" ? "Sold out" : status}
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold tracking-tight text-fg">
              {drop.title}
            </p>
            <p className="mt-0.5 text-xs text-muted">{storeMoney(drop.priceUsd)}</p>
          </div>
          <div className="rounded-lg border border-border bg-bg/80 px-2.5 py-1.5 text-right backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              {status === "upcoming" ? "Starts" : "Ends"}
            </p>
            <p className="font-mono text-sm tabular text-fg">
              {formatCountdown(target, now)}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs text-muted">{drop.blurb}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-subtle">
            <span>
              {left} / {drop.supply} left
            </span>
            <span className="tabular">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                status === "live" ? "bg-fg" : "bg-subtle",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11 flex-1"
            disabled={status !== "live" || left <= 0}
            onClick={onClaim}
          >
            <Zap className="size-4" />
            Claim drop
          </Button>
          <Button variant="secondary" className="min-h-11" asChild>
            <Link to="/shop/$slug" params={{ slug: drop.productSlug }}>
              PDP
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={watching}
            onClick={onWatch}
            aria-label="Watch restock"
          >
            <Bell className="size-4" />
            {watching ? "Watching" : "Radar"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function DropsPage() {
  const epochMs = useDropsStore((s) => s.epochMs);
  const ensureEpoch = useDropsStore((s) => s.ensureEpoch);
  const hydrated = useDropsStore((s) => s.hydrated);

  useEffect(() => {
    ensureEpoch();
  }, [ensureEpoch]);

  const drops = useMemo(
    () => materializeDrops(epochMs || Date.now() - 4 * 60 * 60 * 1000),
    [epochMs],
  );

  return (
    <div className="space-y-8">
      <VisualHero
        image={BRAND_ART.heroNetwork}
        eyebrow="drops.lvlltd.com · flash inventory"
        title="Live drops on the LVL network"
        description="Timed windows, finite units, drop bonuses in LVL Credits. Claim into cart → multi-rail or Printify."
        actions={
          <>
            <Button asChild>
              <Link to="/shop">
                <Timer className="size-4" />
                Full store
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/bundles">Stacks</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/radar">Radar</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/pulse">Pulse</Link>
            </Button>
          </>
        }
      />

      {!hydrated && !epochMs ? (
        <p className="text-sm text-muted">Loading drop windows…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {drops.map((d) => (
            <DropCard key={d.id} drop={d} />
          ))}
        </div>
      )}
    </div>
  );
}
