import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Beaker,
  Bot,
  Layers,
  Timer,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { materializeDrops, useDropsStore } from "@/lib/edge/drops";
import { LVL_PAYMENT } from "@/lib/factory/payment";
import {
  EXCHANGE_LISTINGS,
  useExchangeStore,
} from "@/lib/markets/exchange";
import { FLEET_AGENTS, useFleetStore } from "@/lib/markets/fleet";
import { SYNDICATE_DEALS, useSyndicateStore } from "@/lib/markets/syndicate";
import { LAUNCH_PADS, useLaunchStore } from "@/lib/markets/launch";
import { BOUNTY_CATALOG, useBountyStore } from "@/lib/markets/bounty";
import {
  LAB_DEMOS,
  MARKET_THESES,
  type LabDemo,
} from "@/lib/markets/labs";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/labs")({
  head: () => ({
    meta: [
      { title: "LVL Labs — live demos | labs.lvlltd.com" },
      {
        name: "description",
        content:
          "Play every LVL product live: Exchange, Fleet, drops, pay rails, agent relay, stacks — the demo showroom for lvlltd.com.",
      },
    ],
  }),
  component: LabsPage,
});

function DropClaimWidget() {
  const ensureEpoch = useDropsStore((s) => s.ensureEpoch);
  const epochMs = useDropsStore((s) => s.epochMs);
  const claim = useDropsStore((s) => s.claim);
  const remainingOf = useDropsStore((s) => s.remainingOf);
  const statusOf = useDropsStore((s) => s.statusOf);

  useEffect(() => {
    ensureEpoch();
  }, [ensureEpoch]);

  const drops = useMemo(
    () => (epochMs ? materializeDrops(epochMs) : []),
    [epochMs],
  );
  const drop = drops[0];
  if (!drop) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-4 text-xs text-muted">
        Loading drop demo…
      </div>
    );
  }
  const left = remainingOf(drop.id, drop.supply);
  const status = statusOf(drop);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{drop.title}</p>
        <Badge variant={status === "live" ? "success" : "warning"}>
          {status}
        </Badge>
      </div>
      <p className="text-xs text-muted">
        {left}/{drop.supply} left · ${drop.priceUsd}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full bg-info transition-all"
          style={{ width: `${(left / drop.supply) * 100}%` }}
        />
      </div>
      <Button
        size="sm"
        className="w-full"
        disabled={status !== "live" || left < 1}
        onClick={() => {
          const ok = claim(drop.id, drop.supply, 1);
          toast[ok ? "success" : "error"](
            ok ? "Demo claim · unit reserved" : "Sold out in demo",
          );
        }}
      >
        <Timer className="size-3.5" />
        Claim unit (live demo)
      </Button>
    </div>
  );
}

function PayRailWidget() {
  const [rail, setRail] = useState("base-usdc");
  const rails = [
    { id: "base-usdc", label: "Base USDC", note: LVL_PAYMENT.label },
    { id: "eth-usdt", label: "Ethereum USDT", note: "Mainnet" },
    { id: "sol-usdc", label: "Solana USDC", note: "SPL" },
    { id: "stripe", label: "Card (Stripe)", note: "Canary $0.50+" },
  ];
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">Pick a settlement rail</p>
      <div className="grid gap-2">
        {rails.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRail(r.id)}
            className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors",
              rail === r.id
                ? "border-fg/30 bg-surface-3 text-fg"
                : "border-border bg-surface text-muted hover:text-fg",
            )}
          >
            <span className="font-medium">{r.label}</span>
            <span className="text-subtle">{r.note}</span>
          </button>
        ))}
      </div>
      <Button size="sm" className="w-full" asChild>
        <Link
          to="/pay"
          search={{ skill: "labs-demo", amount: 0.05, canceled: false }}
        >
          <Wallet className="size-3.5" />
          Open pay with {rails.find((r) => r.id === rail)?.label}
        </Link>
      </Button>
    </div>
  );
}

function TradeTapeWidget() {
  const tape = useExchangeStore((s) => s.tape);
  const tickBots = useExchangeStore((s) => s.tickBots);
  const place = useExchangeStore((s) => s.place);
  const cash = useExchangeStore((s) => s.cashUsdc);

  useEffect(() => {
    const t = window.setInterval(() => tickBots(), 2800);
    return () => window.clearInterval(t);
  }, [tickBots]);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Exchange tape</p>
        <span className="font-mono text-[11px] text-subtle">
          {cash.toFixed(2)} USDC
        </span>
      </div>
      <ul className="max-h-36 space-y-1 overflow-y-auto font-mono text-[11px]">
        {tape.slice(0, 8).map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-2 border-b border-border/50 py-1 last:border-0"
          >
            <span
              className={cn(
                t.side === "buy" ? "text-success" : "text-danger",
              )}
            >
              {t.side.toUpperCase()}
            </span>
            <span className="text-muted">{t.symbol}</span>
            <span className="tabular text-fg">{t.price.toFixed(2)}</span>
            <span className="text-subtle">×{t.size}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => {
            const r = place("buy", 1);
            toast[r.ok ? "success" : "error"](r.message);
          }}
        >
          Buy 1
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => {
            const r = place("sell", 1);
            toast[r.ok ? "success" : "error"](r.message);
          }}
        >
          Sell 1
        </Button>
      </div>
      <p className="text-[11px] text-subtle">
        {EXCHANGE_LISTINGS.length} listings · secondary digital goods
      </p>
    </div>
  );
}

function FleetHireWidget() {
  const hire = useFleetStore((s) => s.hire);
  const budget = useFleetStore((s) => s.budgetUsdc);
  const agent = FLEET_AGENTS[0];
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{agent.name}</p>
        <Badge variant="info">{agent.rateUsdc} USDC/h</Badge>
      </div>
      <p className="text-xs text-muted">{agent.blurb}</p>
      <p className="font-mono text-[11px] text-subtle">
        Budget {budget.toFixed(2)} USDC
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const r = hire(agent.id, 2);
          toast[r.ok ? "success" : "error"](r.message);
        }}
      >
        <Bot className="size-3.5" />
        Hire 2h crew
      </Button>
    </div>
  );
}

function IntentSignWidget() {
  const [signed, setSigned] = useState(false);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">A2A purchase intent</p>
      <pre className="overflow-x-auto rounded-lg bg-bg p-3 font-mono text-[10px] text-muted">
        {`{
  "protocol": "lvl-merch-v1",
  "sku": "main-character",
  "amount": 29.99,
  "rail": "base-usdc"
}`}
      </pre>
      <Button
        size="sm"
        className="w-full"
        variant={signed ? "secondary" : "default"}
        onClick={() => {
          setSigned(true);
          toast.success("Intent signed · handoff to pay");
        }}
      >
        <Zap className="size-3.5" />
        {signed ? "Signed — open relay" : "Sign intent (demo)"}
      </Button>
      {signed ? (
        <Button size="sm" variant="secondary" className="w-full" asChild>
          <Link to="/relay">Continue to relay</Link>
        </Button>
      ) : null}
    </div>
  );
}

function StackBuildWidget() {
  const [n, setN] = useState(2);
  const discount = n >= 4 ? 18 : n >= 3 ? 12 : n >= 2 ? 8 : 0;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">Build a stack</p>
      <p className="text-xs text-muted">
        {n} SKUs · {discount}% stack discount
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setN((v) => Math.max(1, v - 1))}
        >
          −
        </Button>
        <span className="min-w-8 text-center font-mono text-sm tabular">{n}</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setN((v) => Math.min(6, v + 1))}
        >
          +
        </Button>
      </div>
      <Button size="sm" className="w-full" asChild>
        <Link to="/bundles">
          <Layers className="size-3.5" />
          Open stack packs
        </Link>
      </Button>
    </div>
  );
}


function SyndicateJoinWidget() {
  const deal = SYNDICATE_DEALS[0];
  const join = useSyndicateStore((s) => s.join);
  const progress = useSyndicateStore((s) => s.progress(deal.id));
  const pool = useSyndicateStore((s) => s.pools[deal.id]);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{deal.title}</p>
        <Badge variant="info">${deal.stackUsd}</Badge>
      </div>
      <p className="text-xs text-muted">
        {pool?.joined ?? 0}/{deal.threshold} crew · {progress}%
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full bg-fg transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const ok = join(deal.id, 1);
          toast[ok ? "success" : "error"](ok ? "Joined syndicate" : "Pool locked");
        }}
      >
        Join crew seat
      </Button>
    </div>
  );
}

function LaunchPledgeWidget() {
  const pad = LAUNCH_PADS.find((p) => p.phase === "live") ?? LAUNCH_PADS[0];
  const pledge = useLaunchStore((s) => s.pledge);
  const joinWaitlist = useLaunchStore((s) => s.joinWaitlist);
  const count = useLaunchStore((s) => s.waitlistCount(pad));
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{pad.title}</p>
        <Badge variant="success">{pad.phase}</Badge>
      </div>
      <p className="text-xs text-muted">
        {count}/{pad.waitlistGoal} waitlist · ${pad.priceUsd}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => {
            joinWaitlist(pad.id);
            toast.success("Waitlisted");
          }}
        >
          Waitlist
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => {
            const ok = pledge(pad.id, 1);
            toast[ok ? "success" : "message"](ok ? "Pledged" : "Tease only");
          }}
        >
          Pledge
        </Button>
      </div>
    </div>
  );
}

function BountyClaimWidget() {
  const b = BOUNTY_CATALOG[0];
  const claim = useBountyStore((s) => s.claim);
  const runtime = useBountyStore((s) => s.runtime[b.id]);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold line-clamp-1">{b.title}</p>
        <Badge variant="info">${b.rewardUsdc}</Badge>
      </div>
      <p className="text-xs text-muted">{b.blurb}</p>
      <p className="font-mono text-[11px] text-subtle">
        status {runtime?.status ?? "open"}
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const ok = claim(b.id, "you");
          toast[ok ? "success" : "error"](ok ? "Bounty claimed" : "Not open");
        }}
      >
        Claim bounty
      </Button>
    </div>
  );
}

function widgetFor(id: LabDemo["widget"]) {
  switch (id) {
    case "drop_claim":
      return <DropClaimWidget />;
    case "pay_rail":
      return <PayRailWidget />;
    case "trade_tape":
      return <TradeTapeWidget />;
    case "fleet_hire":
      return <FleetHireWidget />;
    case "intent_sign":
      return <IntentSignWidget />;
    case "stack_build":
      return <StackBuildWidget />;
    case "syndicate_join":
      return <SyndicateJoinWidget />;
    case "launch_pledge":
      return <LaunchPledgeWidget />;
    case "bounty_claim":
      return <BountyClaimWidget />;
    default:
      return null;
  }
}

function LabsPage() {
  const withWidgets = LAB_DEMOS.filter((d) => d.widget !== "none");
  const rest = LAB_DEMOS.filter((d) => d.widget === "none");

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroNetwork}
        eyebrow="labs.lvlltd.com · live demos"
        title="Try every LVL product — live"
        description={
          <>
            No decks. Interactive demos for Syndicate, Launch, Bounty, Exchange,
            Fleet, drops, and the full{" "}
            <span className="text-fg">lvlltd.com</span> domain mesh.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/syndicate">
                <Beaker className="size-4" />
                Syndicate
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/launch">Launch pad</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/bounty">Bounties</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/marketplace">Marketplace hub</Link>
            </Button>
          </>
        }
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Next big markets
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {MARKET_THESES.map((t) => (
            <Link
              key={t.id}
              to={t.path}
              className="group rounded-xl border border-border bg-surface p-4 shadow-soft transition-colors hover:bg-surface-2"
            >
              <Badge variant="info" className="mb-2">
                {t.host}
              </Badge>
              <p className="text-sm font-semibold tracking-tight">{t.title}</p>
              <p className="mt-1 text-xs text-muted">{t.thesis}</p>
              <p className="mt-3 text-[11px] text-subtle">{t.why}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-fg">
                Launch demo <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Interactive demos
          </h2>
          <span className="text-xs text-subtle">
            {withWidgets.length} live widgets
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {withWidgets.map((d) => (
            <Card
              key={d.id}
              className="border-border bg-surface shadow-soft"
            >
              <CardHeader className="pb-2">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant="default">{d.badge}</Badge>
                  <span className="font-mono text-[11px] text-subtle">
                    {d.host}
                  </span>
                </div>
                <CardTitle className="text-base">{d.title}</CardTitle>
                <CardDescription>{d.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {widgetFor(d.widget)}
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link to={d.path}>
                    Open full surface
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Full product matrix
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((d) => (
            <Link
              key={d.id}
              to={d.path}
              className="rounded-xl border border-border bg-surface p-4 shadow-soft transition-colors hover:bg-surface-2"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="warning">{d.badge}</Badge>
                {d.live ? (
                  <span className="text-[10px] uppercase tracking-wider text-success">
                    Live
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-semibold">{d.title}</p>
              <p className="mt-1 text-xs text-muted">{d.blurb}</p>
              <p className="mt-2 font-mono text-[11px] text-subtle">{d.host}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
