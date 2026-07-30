import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Radio } from "lucide-react";
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
  SIGNAL_CATALOG,
  useSignalStore,
  type SignalListing,
} from "@/lib/markets/signal";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/signal")({
  head: () => ({
    meta: [
      { title: "LVL Signal — demand market | signal.lvlltd.com" },
      {
        name: "description",
        content:
          "Buy demand and attention signals from drops, radar, shop search, agent traffic, and launch waitlists.",
      },
    ],
  }),
  component: SignalPage,
});

function SignalCard({ listing }: { listing: SignalListing }) {
  const remainingOf = useSignalStore((s) => s.remainingOf);
  const buy = useSignalStore((s) => s.buy);
  const left = remainingOf(listing);
  const pct = Math.round((left / listing.supply) * 100);

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{listing.badge}</Badge>
          <Badge variant="default">{listing.kind.replace(/_/g, " ")}</Badge>
        </div>
        <CardTitle className="text-base tracking-tight">
          {listing.title}
        </CardTitle>
        <CardDescription>{listing.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Per pack (100 events)
            </p>
            <p className="text-xl font-semibold tabular tracking-tight">
              ${listing.priceUsdc}
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            Heat {listing.heat}
            <span className="mt-0.5 block font-mono text-[11px] text-subtle">
              {listing.source}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-subtle">
            <span>
              Supply{" "}
              <span className="tabular text-fg">
                {left}/{listing.supply}
              </span>
            </span>
            <span className="tabular">{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={left < 1}
          onClick={() => {
            const ok = buy(listing.id, 1);
            toast[ok ? "success" : "error"](
              ok ? `Bought 1 pack · $${listing.priceUsdc}` : "Buy failed",
            );
          }}
        >
          <Activity className="size-3.5" />
          Buy signal pack
        </Button>
      </CardContent>
    </Card>
  );
}

function SignalPage() {
  const budget = useSignalStore((s) => s.budgetUsdc);
  const spent = useSignalStore((s) => s.spent());
  const purchases = useSignalStore((s) => s.purchases);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroNetwork}
        eyebrow="signal.lvlltd.com · demand market"
        title="Buy intent. Sell attention."
        description={
          <>
            Packs of restock intent, drop heat, agent traffic, and waitlist
            surge — sourced live from the LVL domain mesh.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/radar">
                <Radio className="size-4" />
                Restock radar
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/pulse">Network pulse</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Budget", value: `$${budget.toFixed(0)}` },
          { label: "Spent", value: `$${spent.toFixed(0)}` },
          { label: "Packs bought", value: String(purchases.length) },
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
        <h2 className="text-lg font-semibold tracking-tight">Signal board</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {SIGNAL_CATALOG.map((l) => (
            <SignalCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {purchases.length > 0 ? (
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Recent purchases</CardTitle>
            <CardDescription>Demo ledger · this browser</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {purchases.slice(0, 8).map((p) => {
              const l = SIGNAL_CATALOG.find((x) => x.id === p.listingId);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                >
                  <span className="text-fg">{l?.title ?? p.listingId}</span>
                  <span className="tabular text-muted">
                    {p.packs} pk · ${p.paidUsdc}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
