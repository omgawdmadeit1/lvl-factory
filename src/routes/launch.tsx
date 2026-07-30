import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Rocket, Sparkles } from "lucide-react";
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
  LAUNCH_PADS,
  useLaunchStore,
  type LaunchPad,
} from "@/lib/markets/launch";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/launch")({
  head: () => ({
    meta: [
      { title: "LVL Launch — product launchpad | launch.lvlltd.com" },
      {
        name: "description",
        content:
          "LVL product launchpad: waitlists, live pledges, and go-to-market for merch, agents, music, and skills.",
      },
    ],
  }),
  component: LaunchPage,
});

function phaseVariant(
  phase: LaunchPad["phase"],
): "default" | "info" | "success" | "warning" {
  if (phase === "live") return "success";
  if (phase === "waitlist") return "info";
  if (phase === "tease") return "warning";
  return "default";
}

function LaunchCard({ pad }: { pad: LaunchPad }) {
  const joinWaitlist = useLaunchStore((s) => s.joinWaitlist);
  const pledge = useLaunchStore((s) => s.pledge);
  const waitlisted = useLaunchStore((s) => s.waitlisted.includes(pad.id));
  const pledged = useLaunchStore((s) => s.pledged[pad.id] ?? 0);
  const count = useLaunchStore((s) => s.waitlistCount(pad));
  const progress = useLaunchStore((s) => s.progress(pad));

  function onWaitlist() {
    const ok = joinWaitlist(pad.id);
    toast.success(ok ? "On the waitlist" : "Already listed");
  }

  function onPledge() {
    const ok = pledge(pad.id, 1);
    if (!ok) {
      toast.message(
        pad.phase === "tease" ? "Still in tease — waitlist only" : "Unavailable",
      );
      return;
    }
    toast.success(`Pledged · $${pad.priceUsd} unit`);
  }

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{pad.badge}</Badge>
          <Badge variant={phaseVariant(pad.phase)}>{pad.phase}</Badge>
        </div>
        <CardTitle className="text-base tracking-tight">{pad.title}</CardTitle>
        <CardDescription>
          <span className="text-fg">{pad.tagline}</span>
          <span className="mt-1 block">{pad.blurb}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Launch price
            </p>
            <p className="text-xl font-semibold tabular tracking-tight">
              ${pad.priceUsd}
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            <span className="tabular text-fg">{count}</span> / {pad.waitlistGoal}{" "}
            waitlist
          </div>
        </div>
        <Progress value={progress} />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={waitlisted ? "secondary" : "default"}
            onClick={onWaitlist}
            disabled={waitlisted}
          >
            <Sparkles className="size-3.5" />
            {waitlisted ? "Waitlisted" : "Join waitlist"}
          </Button>
          {pad.phase === "live" || pad.phase === "waitlist" ? (
            <Button size="sm" variant="secondary" onClick={onPledge}>
              Pledge unit
              {pledged > 0 ? ` · ${pledged}` : ""}
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" asChild>
            <Link to={pad.path}>
              Open surface
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LaunchPage() {
  const waitlisted = useLaunchStore((s) => s.waitlisted.length);
  const pledgedUnits = useLaunchStore((s) =>
    Object.values(s.pledged).reduce((a, b) => a + b, 0),
  );
  const live = LAUNCH_PADS.filter((p) => p.phase === "live").length;

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroFactory}
        eyebrow="launch.lvlltd.com · launchpad"
        title="Ship the next LVL product live"
        description={
          <>
            Waitlists, pledges, and go-to-market for merch, agent seats, music
            kits, and skill packs — wired into the same domain mesh as shop and
            multi-rail pay.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/labs">
                <Rocket className="size-4" />
                Try in Labs
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/pipeline">Merch pipeline</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/studio">Design studio</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "On pad", value: String(LAUNCH_PADS.length) },
          { label: "Live now", value: String(live) },
          {
            label: "Your interest",
            value: `${waitlisted} list · ${pledgedUnits} pledge`,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft"
          >
            <p className="text-[11px] uppercase tracking-wider text-subtle">
              {s.label}
            </p>
            <p className="text-sm font-semibold tracking-tight sm:text-base">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Launch board</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {LAUNCH_PADS.map((p) => (
            <LaunchCard key={p.id} pad={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
