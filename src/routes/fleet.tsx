import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Cpu, Rocket, Users } from "lucide-react";
import { useEffect, useState } from "react";
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
  FLEET_AGENTS,
  roleLabel,
  useFleetStore,
} from "@/lib/markets/fleet";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "LVL Fleet — agent labor | fleet.lvlltd.com" },
      {
        name: "description",
        content:
          "Hire autonomous agent crews for drops, restock, support, design, and exchange market-making on the LVL network.",
      },
    ],
  }),
  component: FleetPage,
});

function FleetPage() {
  const budget = useFleetStore((s) => s.budgetUsdc);
  const deployments = useFleetStore((s) => s.deployments);
  const hire = useFleetStore((s) => s.hire);
  const tick = useFleetStore((s) => s.tick);
  const [hours, setHours] = useState(2);

  useEffect(() => {
    const t = window.setInterval(() => tick(), 900);
    return () => window.clearInterval(t);
  }, [tick]);

  const running = deployments.filter((d) => d.status === "running").length;

  return (
    <div className="space-y-8">
      <VisualHero
        image={BRAND_ART.collectionAgent}
        eyebrow="fleet.lvlltd.com · agent labor market"
        title="Hire agent fleets for commerce ops"
        description={
          <>
            Autonomous crews for flash claims, restock scouts, support desks,
            design runners, and Exchange market makers — billed in demo USDC,
            wired into the{" "}
            <span className="text-fg">lvlltd.com</span> mesh.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/exchange">Trade on Exchange</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs demos</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/relay">Agent relay</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Fleet budget</CardDescription>
            <CardTitle className="font-mono text-2xl tabular">
              {budget.toFixed(2)}{" "}
              <span className="text-sm font-normal text-muted">USDC</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Active deployments</CardDescription>
            <CardTitle className="text-2xl tabular">{running}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader className="pb-2">
            <CardDescription>Hire duration</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setHours((h) => Math.max(1, h - 1))}
              >
                −
              </Button>
              <span className="font-mono tabular">{hours}h</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setHours((h) => Math.min(12, h + 1))}
              >
                +
              </Button>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted" />
          <h2 className="text-lg font-semibold tracking-tight">
            Available crews
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {FLEET_AGENTS.map((a) => {
            const cost = Math.round(a.rateUsdc * hours * 100) / 100;
            return (
              <Card
                key={a.id}
                className="border-border bg-surface shadow-soft"
              >
                <CardHeader className="pb-2">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="info">{roleLabel(a.role)}</Badge>
                    <span className="font-mono text-[11px] text-subtle">
                      {a.specialty}
                    </span>
                  </div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bot className="size-4" />
                    {a.name}
                  </CardTitle>
                  <CardDescription>{a.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs text-muted">
                    <span>
                      Rate{" "}
                      <span className="font-mono text-fg">
                        {a.rateUsdc} USDC/h
                      </span>
                    </span>
                    <span>
                      Capacity{" "}
                      <span className="font-mono text-fg">{a.capacity}</span>
                    </span>
                    <span>
                      Reliability{" "}
                      <span className="font-mono text-fg">
                        {(a.reliability * 100).toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      const r = hire(a.id, hours);
                      toast[r.ok ? "success" : "error"](r.message);
                    }}
                  >
                    <Rocket className="size-3.5" />
                    Deploy {hours}h · {cost.toFixed(2)} USDC
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-muted" />
          <h2 className="text-lg font-semibold tracking-tight">
            Deployment board
          </h2>
        </div>
        {deployments.length === 0 ? (
          <Card className="border-border bg-surface">
            <CardContent className="py-8 text-center text-sm text-muted">
              No fleets running — deploy a crew above to watch live progress.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {deployments.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-border bg-surface p-4 shadow-soft"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="text-xs text-muted">
                      {roleLabel(d.role)} · {d.hours}h · {d.spendUsdc.toFixed(2)}{" "}
                      USDC
                    </p>
                  </div>
                  <Badge
                    variant={d.status === "running" ? "info" : "success"}
                  >
                    {d.status}
                  </Badge>
                </div>
                <Progress value={d.progress} className="h-1.5" />
                <p
                  className={cn(
                    "mt-1 text-right font-mono text-[11px] tabular text-subtle",
                  )}
                >
                  {Math.round(d.progress)}%
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
