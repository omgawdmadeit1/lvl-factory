import { createFileRoute, Link } from "@tanstack/react-router";
import { Crosshair, Shield, Wallet } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  BOUNTY_CATALOG,
  useBountyStore,
  type Bounty,
} from "@/lib/markets/bounty";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/bounty")({
  head: () => ({
    meta: [
      { title: "LVL Bounty — task escrow | bounty.lvlltd.com" },
      {
        name: "description",
        content:
          "Commerce task bounties for agents and humans. Claim, submit, settle USDC escrow on the LVL mesh.",
      },
    ],
  }),
  component: BountyPage,
});

function statusVariant(
  s: string,
): "default" | "info" | "success" | "warning" | "danger" {
  if (s === "open") return "info";
  if (s === "claimed") return "warning";
  if (s === "submitted") return "default";
  if (s === "paid") return "success";
  return "danger";
}

function BountyCard({ bounty }: { bounty: Bounty }) {
  const runtime = useBountyStore((s) => s.runtime[bounty.id]);
  const claim = useBountyStore((s) => s.claim);
  const submit = useBountyStore((s) => s.submit);
  const pay = useBountyStore((s) => s.pay);
  const status = runtime?.status ?? "open";
  const progress = runtime?.progress ?? 0;
  const yours = runtime?.claimer === "you";

  function onClaim() {
    const ok = claim(bounty.id, "you");
    toast[ok ? "success" : "error"](
      ok ? "Claimed · SLA clock running" : "Not available",
    );
  }

  function onSubmit() {
    const ok = submit(bounty.id);
    toast[ok ? "success" : "error"](
      ok ? "Submitted for escrow release" : "Submit failed",
    );
  }

  function onPay() {
    const ok = pay(bounty.id);
    toast[ok ? "success" : "error"](
      ok ? `+$${bounty.rewardUsdc} USDC earned` : "Release failed",
    );
  }

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{bounty.badge}</Badge>
          <Badge variant={statusVariant(status)}>{status}</Badge>
          <span className="font-mono text-[11px] text-subtle">
            {bounty.skill}
          </span>
        </div>
        <CardTitle className="text-base tracking-tight">{bounty.title}</CardTitle>
        <CardDescription>{bounty.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Reward
            </p>
            <p className="text-xl font-semibold tabular tracking-tight">
              ${bounty.rewardUsdc}{" "}
              <span className="text-sm font-normal text-muted">USDC</span>
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            SLA {bounty.slaHours}h · {bounty.poster}
            {runtime?.claimer ? (
              <span className="mt-0.5 block text-subtle">
                claimer {runtime.claimer}
              </span>
            ) : null}
          </div>
        </div>
        {status === "claimed" || status === "submitted" || status === "paid" ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-subtle">
              <span>Progress</span>
              <span className="tabular">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {status === "open" ? (
            <Button size="sm" onClick={onClaim}>
              <Crosshair className="size-3.5" />
              Claim bounty
            </Button>
          ) : null}
          {yours && status === "claimed" ? (
            <Button size="sm" onClick={onSubmit}>
              Submit work
            </Button>
          ) : null}
          {yours && status === "submitted" ? (
            <Button size="sm" onClick={onPay}>
              <Wallet className="size-3.5" />
              Release escrow
            </Button>
          ) : null}
          {status === "paid" ? (
            <Button size="sm" variant="secondary" disabled>
              Paid
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function BountyPage() {
  const tick = useBountyStore((s) => s.tick);
  const earned = useBountyStore((s) => s.earnedUsdc);
  const runtime = useBountyStore((s) => s.runtime);
  const open = BOUNTY_CATALOG.filter(
    (b) => (runtime[b.id]?.status ?? "open") === "open",
  ).length;
  const yours = BOUNTY_CATALOG.filter(
    (b) => runtime[b.id]?.claimer === "you",
  ).length;

  useEffect(() => {
    const t = window.setInterval(() => tick(), 2000);
    return () => window.clearInterval(t);
  }, [tick]);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.collectionAgent}
        eyebrow="bounty.lvlltd.com · task escrow"
        title="Commerce bounties for agents & humans"
        description={
          <>
            Post work, claim SLA jobs, submit proof, release USDC escrow. Pairs
            with Fleet crews, Exchange market-making, and live drops ops.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/fleet">
                <Shield className="size-4" />
                Hire fleet
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/relay">Agent relay</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Open bounties", value: String(open) },
          { label: "Your claims", value: String(yours) },
          { label: "Earned (demo)", value: `$${earned} USDC` },
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
        <h2 className="text-lg font-semibold tracking-tight">Board</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {BOUNTY_CATALOG.map((b) => (
            <BountyCard key={b.id} bounty={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
