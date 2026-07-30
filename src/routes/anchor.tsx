import { createFileRoute, Link } from "@tanstack/react-router";
import { Anchor, Pause, Play } from "lucide-react";
import { useEffect } from "react";
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
import {
  ANCHOR_PLANS,
  useAnchorStore,
  type AnchorPlan,
} from "@/lib/markets/anchor";
import { pingQuest } from "@/lib/markets/quest";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/anchor")({
  head: () => ({
    meta: [
      { title: "LVL Anchor — subscriptions | anchor.lvlltd.com" },
      {
        name: "description",
        content:
          "Recurring merch and agent boxes — tee club, night ops, art plates, restock anchors.",
      },
    ],
  }),
  component: AnchorPage,
});

function PlanCard({ plan }: { plan: AnchorPlan }) {
  const sub = useAnchorStore((s) => s.subs[plan.id]);
  const subscribe = useAnchorStore((s) => s.subscribe);
  const pause = useAnchorStore((s) => s.pause);
  const resume = useAnchorStore((s) => s.resume);
  const cancel = useAnchorStore((s) => s.cancel);
  const wallet = useAnchorStore((s) => s.walletUsdc);
  const active = sub?.status === "active";
  const paused = sub?.status === "paused";

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{plan.badge}</Badge>
          <Badge variant="default">{plan.cadence}</Badge>
          {active ? <Badge variant="success">active</Badge> : null}
          {paused ? <Badge variant="warning">paused</Badge> : null}
        </div>
        <CardTitle className="text-base tracking-tight">{plan.name}</CardTitle>
        <CardDescription>{plan.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Per cycle
            </p>
            <p className="text-xl font-semibold tabular">${plan.priceUsdc}</p>
          </div>
          <p className="text-xs text-muted">heat {plan.heat}</p>
        </div>
        <ul className="space-y-1 text-xs text-muted">
          {plan.perks.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="text-subtle">·</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        {sub ? (
          <p className="text-xs text-muted">
            Cycles <span className="tabular text-fg">{sub.cycles}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!sub ? (
            <Button
              size="sm"
              onClick={() => {
                const ok = subscribe(plan.id);
                if (ok) pingQuest("q-anchor");
                toast[ok ? "success" : "error"](
                  ok
                    ? `Subscribed · $${plan.priceUsdc}`
                    : wallet < plan.priceUsdc
                      ? "Insufficient wallet"
                      : "Subscribe failed",
                );
              }}
            >
              <Anchor className="size-3.5" />
              Subscribe
            </Button>
          ) : null}
          {active ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                pause(plan.id);
                toast.message("Paused");
              }}
            >
              <Pause className="size-3.5" />
              Pause
            </Button>
          ) : null}
          {paused ? (
            <Button
              size="sm"
              onClick={() => {
                resume(plan.id);
                toast.success("Resumed");
              }}
            >
              <Play className="size-3.5" />
              Resume
            </Button>
          ) : null}
          {sub ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                cancel(plan.id);
                toast.message("Cancelled");
              }}
            >
              Cancel
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" asChild>
            <Link to="/radar">Radar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnchorPage() {
  const wallet = useAnchorStore((s) => s.walletUsdc);
  const subs = useAnchorStore((s) => s.subs);
  const tick = useAnchorStore((s) => s.tickShip);
  const active = Object.values(subs).filter((s) => s.status === "active")
    .length;
  let mrr = 0;
  for (const sub of Object.values(subs)) {
    if (sub.status !== "active") continue;
    const plan = ANCHOR_PLANS.find((p) => p.id === sub.planId);
    if (!plan) continue;
    if (plan.cadence === "weekly") mrr += plan.priceUsdc * 4;
    else if (plan.cadence === "biweekly") mrr += plan.priceUsdc * 2;
    else mrr += plan.priceUsdc;
  }
  mrr = Math.round(mrr * 100) / 100;

  useEffect(() => {
    const t = window.setInterval(() => tick(), 4000);
    return () => window.clearInterval(t);
  }, [tick]);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.collectionArt}
        eyebrow="anchor.lvlltd.com · subscriptions"
        title="Recurring commerce. Anchored."
        description={
          <>
            Tee clubs, ops boxes, art plates, agent feeds, and restock anchors —
            subscribe once, ship on cadence with Whisper and Radar perks.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/shop">
                <Anchor className="size-4" />
                Store
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/drops">Drops</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Wallet", value: `$${wallet.toFixed(0)}` },
          { label: "Active", value: String(active) },
          { label: "Est. MRR", value: `$${mrr.toFixed(0)}` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft"
          >
            <p className="text-[11px] uppercase tracking-wider text-subtle">
              {s.label}
            </p>
            <p className="text-xl font-semibold tabular tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ANCHOR_PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}
