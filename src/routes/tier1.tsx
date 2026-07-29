import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  Download,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SKILL_TEMPLATES } from "@/lib/factory/catalog";
import { useFactoryStore } from "@/lib/factory/store";
import { formatUsdc, cn } from "@/lib/utils";

export const Route = createFileRoute("/tier1")({
  component: Tier1Page,
});

function Tier1Page() {
  const seedTier1 = useFactoryStore((s) => s.seedTier1);
  const approveAndPublishAllReady = useFactoryStore(
    (s) => s.approveAndPublishAllReady,
  );
  const exportTier1Bundle = useFactoryStore((s) => s.exportTier1Bundle);
  const getTier1Checklist = useFactoryStore((s) => s.getTier1Checklist);
  const packages = useFactoryStore((s) => s.packages);
  const processingId = useFactoryStore((s) => s.processingId);
  const tier1SeededAt = useFactoryStore((s) => s.tier1SeededAt);

  const checklist = getTier1Checklist();
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const flagships = SKILL_TEMPLATES.filter((t) => t.flagship);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Target className="size-4" />
          Tier 1 — first 10–50 real unlocks
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Execute the conversion loop
        </h1>
        <p className="max-w-3xl text-sm text-muted">
          Flagship rewrites, factory → rails packs, human canary, and fiat
          staging — all under lvlltd.com. No phone calls.
        </p>
      </header>

      <Card className="border-border-strong">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                {doneCount} of {checklist.length} complete
                {tier1SeededAt
                  ? ` · seeded ${new Date(tier1SeededAt).toLocaleString()}`
                  : ""}
              </CardDescription>
            </div>
            <Badge variant={pct === 100 ? "success" : "info"}>{pct}%</Badge>
          </div>
          <Progress value={pct} />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => seedTier1()} disabled={processingId !== null}>
            <Sparkles className="size-4" />
            Seed Tier 1 packs
          </Button>
          <Button
            variant="success"
            onClick={() => approveAndPublishAllReady()}
            disabled={packages.every(
              (p) => !["ready", "approved"].includes(p.status),
            )}
          >
            <Rocket className="size-4" />
            Approve + publish ready
          </Button>
          <Button variant="secondary" onClick={() => exportTier1Bundle()}>
            <Download className="size-4" />
            Export Tier 1 bundle
          </Button>
          <Button asChild variant="ghost">
            <Link to="/canary">Open canary path</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/queue">Review queue</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <CardDescription>Income-ranked execution order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex gap-3 rounded-lg border p-3",
                  item.done
                    ? "border-border bg-surface-2/50"
                    : "border-border bg-surface",
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-subtle" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted">{item.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flagship shelf ({flagships.length})</CardTitle>
            <CardDescription>
              Unique samples · after-pay artifacts · no boiler outlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {flagships.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl border border-border bg-surface-2/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{tpl.title}</p>
                    <p className="font-mono text-[11px] text-subtle">{tpl.id}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="default">{formatUsdc(tpl.priceUsdc)}</Badge>
                    {tpl.canary ? (
                      <Badge variant="warning">Canary</Badge>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted">
                  {tpl.summary}
                </p>
                <p className="mt-2 text-[11px] text-subtle">
                  After pay: {tpl.afterPay[0]}
                  {tpl.afterPay.length > 1
                    ? ` +${tpl.afterPay.length - 1} more`
                    : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What still needs production keys</CardTitle>
          <CardDescription>Honest limits — factory cannot invent them</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 text-sm text-muted">
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <p className="font-medium text-fg">Live catalog push</p>
            <p className="mt-1">
              Exports are ready. Upload{" "}
              <span className="font-mono text-xs">tier1-skill-listings.json</span>{" "}
              into the lvlltd.com catalog deploy path to demote boiler shelf
              items.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <p className="font-medium text-fg">Fiat rails</p>
            <p className="mt-1">
              Stripe is live in factory checkout (/pay + /canary): $0.50 card
              canary and $0.99 starter. Wire webhooks on lvlltd.com for auto
              sealed unlock after card pay.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <p className="font-medium text-fg">Real canary payment</p>
            <p className="mt-1">
              Complete one unlock via /pay — any mainnet crypto you already hold,
              or Stripe $0.50 if wallet gas is tight. Factory documents the path.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <p className="font-medium text-fg">Homepage CTA</p>
            <p className="mt-1">
              Paste canary CTA blocks from the wallet-onboarding sealed pack
              onto lvlltd.com homepage once listings ship.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
