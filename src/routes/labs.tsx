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
import { VAULT_CATALOG, useVaultStore } from "@/lib/markets/vault";
import { SIGNAL_CATALOG, useSignalStore } from "@/lib/markets/signal";
import { ARENA_RACES, useArenaStore } from "@/lib/markets/arena";
import { useForgeStore } from "@/lib/markets/forge";
import { GUILD_CATALOG, useGuildStore } from "@/lib/markets/guild";
import { useWhisperStore } from "@/lib/markets/whisper";
import { QUEST_CATALOG, useQuestStore } from "@/lib/markets/quest";
import { useLedgerStore } from "@/lib/markets/ledger";
import { ORACLE_FORECASTS, useOracleStore } from "@/lib/markets/oracle";
import { MIRROR_FITS, useMirrorStore } from "@/lib/markets/mirror";
import { useCircuitStore } from "@/lib/markets/circuit";
import { ANCHOR_PLANS, useAnchorStore } from "@/lib/markets/anchor";
import { formatVital, useMonitorStore } from "@/lib/ops/monitor";

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


function VaultMintWidget() {
  const asset = VAULT_CATALOG[0];
  const mint = useVaultStore((s) => s.mint);
  const holding = useVaultStore((s) => s.holdings[asset.id]);
  const holdings = useVaultStore((s) => s.holdings);
  const unclaimed = Object.values(holdings).reduce((n, h) => n + h.accruedUsdc, 0);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{asset.symbol}</p>
        <Badge variant="info">${asset.valueUsdc}</Badge>
      </div>
      <p className="text-xs text-muted">
        Held {holding?.qty ?? 0} · unclaimed ${unclaimed.toFixed(3)}
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const ok = mint(asset.id);
          toast[ok ? "success" : "error"](ok ? "Minted to vault" : "Mint failed");
        }}
      >
        Mint seat
      </Button>
    </div>
  );
}

function SignalBuyWidget() {
  const listing = SIGNAL_CATALOG[0];
  const buy = useSignalStore((s) => s.buy);
  const left = useSignalStore((s) => s.remainingOf(listing));
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold line-clamp-1">{listing.title}</p>
        <Badge variant="warning">heat {listing.heat}</Badge>
      </div>
      <p className="text-xs text-muted">
        ${listing.priceUsdc}/pack · {left} left
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const ok = buy(listing.id, 1);
          toast[ok ? "success" : "error"](ok ? "Signal pack bought" : "Buy failed");
        }}
      >
        Buy pack
      </Button>
    </div>
  );
}

function ArenaClaimWidget() {
  const race = ARENA_RACES[0];
  const claim = useArenaStore((s) => s.claim);
  const score = useArenaStore((s) => s.youScore);
  const streak = useArenaStore((s) => s.youStreak);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{race.title}</p>
        <Badge variant="warning">+{race.points}</Badge>
      </div>
      <p className="text-xs text-muted">
        Score {score} · streak {streak}
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const r = claim(race.id);
          toast[r.ok ? "success" : "error"](r.message);
        }}
      >
        Claim race unit
      </Button>
    </div>
  );
}


function ForgeRunWidget() {
  const forge = useForgeStore((s) => s.forge);
  const n = useForgeStore((s) => s.drafts.length);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">Prompt forge</p>
      <p className="text-xs text-muted">{n} drafts in rack</p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const d = forge("midnight operator mesh", "tee", "night_ops");
          toast[d ? "success" : "error"](d ? `Forged ${d.title}` : "Forge failed");
        }}
      >
        Forge sample
      </Button>
    </div>
  );
}

function GuildJoinWidget() {
  const crew = GUILD_CATALOG[0];
  const join = useGuildStore((s) => s.join);
  const joined = useGuildStore((s) => !!s.joined[crew.id]);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold line-clamp-1">{crew.name}</p>
      <p className="text-xs text-muted">
        {(crew.joinShareBps / 100).toFixed(1)}% share · ${crew.poolUsdc} pool
      </p>
      <Button
        size="sm"
        className="w-full"
        disabled={joined}
        onClick={() => {
          const ok = join(crew.id);
          toast[ok ? "success" : "error"](ok ? "Joined guild" : "Already in");
        }}
      >
        {joined ? "Joined" : "Join guild"}
      </Button>
    </div>
  );
}

function WhisperUnlockWidget() {
  const unlock = useWhisperStore((s) => s.unlock);
  const n = useWhisperStore((s) => s.unlocked.length);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">Whisper code</p>
      <p className="text-xs text-muted">{n} doors open · try MIDNIGHT</p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const r = unlock("MIDNIGHT");
          toast[r.ok ? "success" : "error"](r.message);
        }}
      >
        Unlock MIDNIGHT
      </Button>
    </div>
  );
}

function QuestClaimWidget() {
  const q = QUEST_CATALOG[0];
  const advance = useQuestStore((s) => s.advance);
  const claim = useQuestStore((s) => s.claim);
  const xp = useQuestStore((s) => s.xp);
  const prog = useQuestStore((s) => s.progress[q.id] ?? 0);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">{q.title}</p>
      <p className="text-xs text-muted">
        {prog}/{q.target} · total XP {xp}
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          advance(q.id);
          const got = claim(q.id);
          toast[got ? "success" : "message"](
            got ? `+${got} XP` : "Progressed — claim when ready",
          );
        }}
      >
        Advance / claim
      </Button>
    </div>
  );
}

function LedgerSimWidget() {
  const record = useLedgerStore((s) => s.record);
  const total = useLedgerStore((s) => s.settledTotal());
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">Settlement tape</p>
      <p className="text-xs text-muted">Settled ${total.toFixed(0)}</p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const e = record({
            rail: "usdc",
            label: "labs demo",
            amountUsdc: 24,
            surface: "labs",
          });
          toast.success(`Proof ${e.ref}`);
        }}
      >
        Simulate settle
      </Button>
    </div>
  );
}

function OraclePinWidget() {
  const f = ORACLE_FORECASTS[0];
  const toggle = useOracleStore((s) => s.togglePin);
  const pinned = useOracleStore((s) => s.pinned.includes(f.id));
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold line-clamp-1">{f.title}</p>
      <p className="text-xs text-muted">
        {f.demandUnits} units · conf {f.confidence}%
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          toggle(f.id);
          toast.message(pinned ? "Unpinned" : "Pinned forecast");
        }}
      >
        {pinned ? "Unpin" : "Pin SKU"}
      </Button>
    </div>
  );
}


function MirrorCloneWidget() {
  const fit = MIRROR_FITS[0];
  const clone = useMirrorStore((s) => s.clone);
  const n = useMirrorStore((s) => s.cloned.length);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold line-clamp-1">{fit.title}</p>
      <p className="text-xs text-muted">{n} clones · {fit.items.length} items</p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const c = clone(fit.id);
          toast[c ? "success" : "error"](c ? `Cloned $${c.totalUsdc}` : "Failed");
        }}
      >
        Clone fit
      </Button>
    </div>
  );
}

function CircuitRunWidget() {
  const start = useCircuitStore((s) => s.start);
  const reset = useCircuitStore((s) => s.reset);
  const done = useCircuitStore((s) => s.runs.filter((r) => r.status === "done").length);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">Circuit run</p>
      <p className="text-xs text-muted">{done} completed runs</p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          reset();
          const ok = start();
          toast[ok ? "success" : "error"](ok ? "Circuit started" : "Failed");
        }}
      >
        Run template
      </Button>
    </div>
  );
}

function AnchorSubWidget() {
  const plan = ANCHOR_PLANS[0];
  const subscribe = useAnchorStore((s) => s.subscribe);
  const active = useAnchorStore((s) => Object.values(s.subs).filter((x) => x.status === "active").length);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">{plan.name}</p>
      <p className="text-xs text-muted">
        ${plan.priceUsdc}/{plan.cadence} · {active} active
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const ok = subscribe(plan.id);
          toast[ok ? "success" : "error"](ok ? "Subscribed" : "Already active / low wallet");
        }}
      >
        Subscribe
      </Button>
    </div>
  );
}


function MonitorLiveWidget() {
  const latest = useMonitorStore((s) => s.latest);
  const enabled = useMonitorStore((s) => s.enabled);
  const setEnabled = useMonitorStore((s) => s.setEnabled);
  const fps = useMonitorStore((s) => s.fpsSeries);
  const avg =
    fps.length === 0
      ? 0
      : Math.round(
          (fps.slice(-10).reduce((a, b) => a + b.fps, 0) /
            Math.min(10, fps.length)) *
            10,
        ) / 10;
  const lcp = latest.LCP;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">Live probe</p>
      <p className="text-xs text-muted">
        FPS {avg || "—"} · LCP{" "}
        {lcp ? formatVital("LCP", lcp.value) : "—"} ·{" "}
        {enabled ? "on" : "paused"}
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          setEnabled(!enabled);
          toast.message(enabled ? "Probe paused" : "Probe live");
        }}
      >
        {enabled ? "Pause probe" : "Resume probe"}
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
    case "vault_mint":
      return <VaultMintWidget />;
    case "signal_buy":
      return <SignalBuyWidget />;
    case "arena_claim":
      return <ArenaClaimWidget />;
    case "forge_run":
      return <ForgeRunWidget />;
    case "guild_join":
      return <GuildJoinWidget />;
    case "whisper_unlock":
      return <WhisperUnlockWidget />;
    case "quest_claim":
      return <QuestClaimWidget />;
    case "ledger_sim":
      return <LedgerSimWidget />;
    case "oracle_pin":
      return <OraclePinWidget />;
    case "mirror_clone":
      return <MirrorCloneWidget />;
    case "circuit_run":
      return <CircuitRunWidget />;
    case "anchor_sub":
      return <AnchorSubWidget />;
    case "monitor_live":
      return <MonitorLiveWidget />;
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
            No decks. Interactive demos for Vault, Signal, Arena, Syndicate, Launch,
            Bounty, Exchange, and the full{" "}
            <span className="text-fg">lvlltd.com</span> domain mesh.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/vault">
                <Beaker className="size-4" />
                Vault
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/signal">Signal</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/arena">Arena</Link>
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
