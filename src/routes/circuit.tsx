import { createFileRoute, Link } from "@tanstack/react-router";
import { GitBranch, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useVisibleInterval } from "@/lib/ops/use-visible-interval";
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
  CIRCUIT_TEMPLATES,
  nodeKindLabel,
  useCircuitStore,
  type CircuitTemplate,
} from "@/lib/markets/circuit";
import { pingQuest } from "@/lib/markets/quest";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/circuit")({
  head: () => ({
    meta: [
      { title: "LVL Circuit — agent workflows | circuit.lvlltd.com" },
      {
        name: "description",
        content:
          "Build and run agent commerce workflows — drop claim, restock, bounty escrow, guild splits.",
      },
    ],
  }),
  component: CircuitPage,
});

function TemplatePick({ tpl }: { tpl: CircuitTemplate }) {
  const activeId = useCircuitStore((s) => s.activeId);
  const setActive = useCircuitStore((s) => s.setActive);
  const active = activeId === tpl.id;

  return (
    <button
      type="button"
      onClick={() => setActive(tpl.id)}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
        active
          ? "border-fg/30 bg-surface-2"
          : "border-border bg-surface hover:bg-surface-2",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge variant={active ? "info" : "default"}>{tpl.badge}</Badge>
        <span className="text-sm font-semibold text-fg">{tpl.name}</span>
      </div>
      <p className="text-xs text-muted">{tpl.blurb}</p>
    </button>
  );
}

function CircuitPage() {
  const activeId = useCircuitStore((s) => s.activeId);
  const step = useCircuitStore((s) => s.step);
  const running = useCircuitStore((s) => s.running);
  const start = useCircuitStore((s) => s.start);
  const tick = useCircuitStore((s) => s.tick);
  const reset = useCircuitStore((s) => s.reset);
  const runs = useCircuitStore((s) => s.runs);
  const doneCount = runs.filter((r) => r.status === "done").length;
  const recent = runs.slice(0, 5);
  const toasted = useRef(false);

  const tpl =
    CIRCUIT_TEMPLATES.find((t) => t.id === activeId) ?? CIRCUIT_TEMPLATES[0]!;
  const pct = Math.round((step / Math.max(1, tpl.nodes.length)) * 100);

  useEffect(() => {
    if (running) toasted.current = false;
  }, [running]);
  useVisibleInterval(() => tick(), 900, running);

  useEffect(() => {
    if (
      !running &&
      step >= tpl.nodes.length &&
      step > 0 &&
      !toasted.current
    ) {
      toasted.current = true;
      pingQuest("q-circuit");
      toast.success(`Circuit complete · ${tpl.name}`);
    }
  }, [running, step, tpl.name, tpl.nodes.length]);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroFactory}
        eyebrow="circuit.lvlltd.com · agent workflows"
        title="Wire the mesh. Run the flow."
        description={
          <>
            Visual A2A pipelines for drops, restock, bounty escrow, and guild
            splits — step through live demos without leaving the factory.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/relay">
                <GitBranch className="size-4" />
                Agent relay
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/fleet">Fleet</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Active template", value: tpl.badge },
          {
            label: "Step",
            value: `${Math.min(step, tpl.nodes.length)}/${tpl.nodes.length}`,
          },
          { label: "Runs done", value: String(doneCount) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft"
          >
            <p className="text-[11px] uppercase tracking-wider text-subtle">
              {s.label}
            </p>
            <p className="truncate text-xl font-semibold tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold tracking-tight">Templates</h2>
          <div className="space-y-2">
            {CIRCUIT_TEMPLATES.map((t) => (
              <TemplatePick key={t.id} tpl={t} />
            ))}
          </div>
        </section>

        <section className="space-y-3 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {tpl.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={running}
                onClick={() => {
                  reset();
                  const ok = start();
                  toast[ok ? "success" : "error"](
                    ok ? "Circuit running" : "Start failed",
                  );
                }}
              >
                <Play className="size-3.5" />
                Run
              </Button>
              <Button size="sm" variant="secondary" onClick={() => reset()}>
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            </div>
          </div>
          <Progress value={pct} />
          <div className="space-y-2">
            {tpl.nodes.map((n, i) => {
              const state =
                i < step ? "done" : i === step && running ? "active" : "idle";
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3",
                    state === "active" && "border-success/40 bg-success/10",
                    state === "done" && "border-border bg-surface-2",
                    state === "idle" && "border-border bg-surface",
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-xs font-mono tabular text-muted">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">{nodeKindLabel(n.kind)}</Badge>
                      <span className="text-sm font-medium text-fg">
                        {n.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{n.blurb}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {recent.length > 0 ? (
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Recent runs</CardTitle>
            <CardDescription>Completed circuits · this browser</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((r) => {
              const name =
                CIRCUIT_TEMPLATES.find((t) => t.id === r.templateId)?.name ??
                r.templateId;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                >
                  <span className="truncate text-fg">{name}</span>
                  <Badge variant="success">{r.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
