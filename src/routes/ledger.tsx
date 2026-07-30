import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
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
  LEDGER_RAILS,
  useLedgerStore,
  type PayRail,
} from "@/lib/markets/ledger";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "LVL Ledger — settlement proofs | ledger.lvlltd.com" },
      {
        name: "description",
        content:
          "Multi-rail settlement explorer — USDC, card, Apple Pay, agent credit, Printify POD proofs.",
      },
    ],
  }),
  component: LedgerPage,
});

function statusVariant(
  s: string,
): "success" | "warning" | "danger" | "default" {
  if (s === "settled") return "success";
  if (s === "pending") return "warning";
  if (s === "failed") return "danger";
  return "default";
}

function LedgerPage() {
  const filter = useLedgerStore((s) => s.filter);
  const setFilter = useLedgerStore((s) => s.setFilter);
  const entries = useLedgerStore((s) => s.entries);
  const record = useLedgerStore((s) => s.record);
  const settled = useLedgerStore((s) => s.settledTotal());
  const pending = useLedgerStore((s) => s.pendingCount());

  const shown =
    filter === "all" ? entries : entries.filter((e) => e.rail === filter);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroFactory}
        eyebrow="ledger.lvlltd.com · settlement proofs"
        title="Every rail. One proof trail."
        description={
          <>
            Explore multi-rail settlements across shop, drops, exchange, bounty,
            and vault — demo ledger for agents and operators.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link
                to="/pay"
                search={{ skill: "merch", amount: 0.05, canceled: false }}
              >
                <ScrollText className="size-4" />
                Pay rails
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/orders">Orders</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Settled volume", value: `$${settled.toFixed(2)}` },
          { label: "Pending", value: String(pending) },
          { label: "Entries", value: String(entries.length) },
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

      <div className="flex flex-wrap gap-2">
        {LEDGER_RAILS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setFilter(r.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              filter === r.id
                ? "border-fg/30 bg-surface-2 text-fg"
                : "border-border text-muted hover:bg-surface",
            )}
          >
            {r.label}
          </button>
        ))}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const rails: PayRail[] = [
              "usdc",
              "card",
              "apple_pay",
              "agent_credit",
            ];
            const rail = rails[Date.now() % rails.length]!;
            const e = record({
              rail,
              label: `demo · ${rail}`,
              amountUsdc: 18 + (Date.now() % 40),
              surface: "ledger",
            });
            toast.success(`Recorded ${e.ref}`);
          }}
        >
          Simulate settle
        </Button>
      </div>

      <Card className="border-border bg-surface shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Proof tape</CardTitle>
          <CardDescription>Newest first · filter by rail</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-3 sm:p-4">
          {shown.map((e) => (
            <div
              key={e.id}
              className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                  <span className="font-medium text-fg">{e.label}</span>
                </div>
                <p className="truncate font-mono text-[11px] text-subtle">
                  {e.ref} · {e.surface}
                </p>
              </div>
              <p className="shrink-0 tabular text-sm font-semibold text-fg">
                ${e.amountUsdc.toFixed(2)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
