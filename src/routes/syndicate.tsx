import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, Zap } from "lucide-react";
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
  SYNDICATE_DEALS,
  useSyndicateStore,
  type SyndicateDeal,
} from "@/lib/markets/syndicate";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/syndicate")({
  head: () => ({
    meta: [
      { title: "LVL Syndicate — group buys | syndicate.lvlltd.com" },
      {
        name: "description",
        content:
          "Social co-purchase pools for LVL drops, skills, and music. Fill the crew, unlock stack prices.",
      },
    ],
  }),
  component: SyndicatePage,
});

function DealCard({ deal }: { deal: SyndicateDeal }) {
  const pool = useSyndicateStore((s) => s.pools[deal.id]);
  const join = useSyndicateStore((s) => s.join);
  const leave = useSyndicateStore((s) => s.leave);
  const progress = useSyndicateStore((s) => s.progress(deal.id));
  const savings = useSyndicateStore((s) => s.savings(deal));
  const joined = pool?.joined ?? 0;
  const youIn = pool?.youIn ?? false;
  const status = pool?.status ?? "open";
  const remaining = Math.max(0, deal.threshold - joined);

  function onJoin() {
    const ok = join(deal.id, 1);
    if (!ok) {
      toast.error("Pool full or locked");
      return;
    }
    toast.success(
      remaining <= 1
        ? `Funded · stack price $${deal.stackUsd.toFixed(2)}`
        : `Joined · ${Math.max(0, remaining - 1)} to unlock`,
    );
  }

  return (
    <Card className="overflow-hidden border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{deal.badge}</Badge>
          <Badge
            variant={
              status === "funded"
                ? "success"
                : status === "open"
                  ? "default"
                  : "warning"
            }
          >
            {status}
          </Badge>
          <span className="text-[11px] text-subtle">{deal.hoursLeft}h left</span>
        </div>
        <CardTitle className="text-base tracking-tight">{deal.title}</CardTitle>
        <CardDescription>{deal.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Retail
            </p>
            <p className="text-sm font-semibold tabular line-through text-muted">
              ${deal.retailUsd.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/10 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-success">
              Stack
            </p>
            <p className="text-sm font-semibold tabular text-fg">
              ${deal.stackUsd.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Save
            </p>
            <p className="text-sm font-semibold tabular text-fg">
              ${savings.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              <span className="tabular text-fg">{joined}</span> / {deal.threshold}{" "}
              to unlock
            </span>
            <span className="tabular text-subtle">{progress}%</span>
          </div>
          <Progress value={progress} />
          <p className="text-[11px] text-subtle">
            Cap {deal.cap} · {remaining > 0 ? `${remaining} more seats` : "Funded"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {youIn ? (
            <>
              <Button size="sm" variant="secondary" disabled>
                You're in · qty {pool?.yourQty ?? 1}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => leave(deal.id)}>
                Leave
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onJoin} disabled={status === "locked"}>
              <Users className="size-3.5" />
              Join syndicate
            </Button>
          )}
          {status === "funded" ? (
            <Button size="sm" variant="secondary" asChild>
              <Link to="/checkout">
                Settle stack
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SyndicatePage() {
  const pools = useSyndicateStore((s) => s.pools);
  const yourDeals = SYNDICATE_DEALS.filter((d) => pools[d.id]?.youIn).length;
  const funded = SYNDICATE_DEALS.filter(
    (d) => pools[d.id]?.status === "funded",
  ).length;

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroNetwork}
        eyebrow="syndicate.lvlltd.com · group buys"
        title="Fill the crew. Unlock the stack."
        description={
          <>
            Social co-purchase for drops, skills, and music kits. When the pool
            hits threshold, everyone settles at the syndicate price — multi-rail
            ready.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/drops">
                <Zap className="size-4" />
                Open drops
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs demos</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/exchange">Exchange</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Open pools", value: String(SYNDICATE_DEALS.length) },
          { label: "Your seats", value: String(yourDeals) },
          { label: "Funded", value: String(funded) },
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Live syndicates</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {SYNDICATE_DEALS.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </div>
      </section>

      <Card className="border-border bg-surface shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
          <CardDescription>
            Demo pools persist in this browser — join, fund, settle.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-xs text-muted">
          {[
            {
              t: "1 · Join",
              b: "Reserve a seat with qty. Progress is public.",
            },
            {
              t: "2 · Fund",
              b: "Hit threshold → stack price unlocks for the crew.",
            },
            {
              t: "3 · Settle",
              b: "Checkout or multi-rail pay. POD ships via Printify.",
            },
          ].map((s) => (
            <div
              key={s.t}
              className={cn("rounded-lg border border-border bg-surface-2 p-3")}
            >
              <p className="font-medium text-fg">{s.t}</p>
              <p className="mt-1">{s.b}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
