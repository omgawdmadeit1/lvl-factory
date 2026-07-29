import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  ExternalLink,
  Filter,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { agentBuyInstructions } from "@/lib/merch/agent-commerce";
import { CLOUDFLARE_MAP, PRINTIFY_STORE } from "@/lib/merch/printify";
import { useMerchStore } from "@/lib/merch/store";
import type { MerchProduct } from "@/lib/merch/types";
import { formatUsd, cn } from "@/lib/utils";

export type MerchSearch = {
  channel?: string;
  sku?: string;
};

export const Route = createFileRoute("/merch")({
  component: MerchShopPage,
  validateSearch: (s: Record<string, unknown>): MerchSearch => {
    const out: MerchSearch = {};
    if (typeof s.channel === "string") out.channel = s.channel;
    if (typeof s.sku === "string") out.sku = s.sku;
    return out;
  },
});

type FilterKey = "all" | "art" | "tee" | "agent";

function MerchShopPage() {
  const search = Route.useSearch();
  const products = useMerchStore((s) => s.products);
  const published = useMemo(
    () => products.filter((p) => p.status === "published"),
    [products],
  );
  const [filter, setFilter] = useState<FilterKey>(
    search.channel === "art" ? "art" : "all",
  );
  const [selected, setSelected] = useState<MerchProduct | null>(null);

  const filtered = useMemo(() => {
    return published.filter((p) => {
      if (filter === "art")
        return p.kind === "poster" || p.kind === "canvas" || p.tags.includes("art");
      if (filter === "tee") return p.kind === "tee" || p.kind === "hoodie";
      if (filter === "agent") return p.agentShopable;
      return true;
    });
  }, [published, filter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">merch · art</Badge>
            <Badge variant="success">agent shopable</Badge>
            <Badge variant="default">Printify POD</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Merch & art shop
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Live drops from{" "}
            <a
              href={PRINTIFY_STORE.storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="text-fg underline-offset-2 hover:underline"
            >
              {PRINTIFY_STORE.slug}.printify.me
            </a>
            , plus pipeline designs routed through Grok Imagine → Printify.
            Humans checkout on Printify; agents settle multi-rail via{" "}
            <Link
              to="/pay"
              search={{ skill: "merch", amount: 0.05, canceled: false }}
              className="text-fg underline-offset-2 hover:underline"
            >
              /pay
            </Link>
            . Served on factory.lvlltd.com (Cloudflare).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/pipeline">
              <Sparkles className="size-4" />
              Design pipeline
            </Link>
          </Button>
          <Button asChild>
            <Link to="/agent/merch">
              <Bot className="size-4" />
              Agent catalog
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <a href={PRINTIFY_STORE.storefrontUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open Printify store
            </a>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-4 text-muted" />
        {(
          [
            ["all", "All"],
            ["tee", "Apparel"],
            ["art", "Art"],
            ["agent", "Agent SKUs"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              filter === key
                ? "border-border-strong bg-surface-2 text-fg"
                : "border-border text-muted hover:bg-surface hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-subtle tabular">
          {filtered.length} published
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Card
            key={p.id}
            className={cn(
              "overflow-hidden border-border bg-surface transition-colors",
              selected?.id === p.id && "border-border-strong",
            )}
          >
            <div className="relative aspect-square bg-surface-2">
              <img
                src={p.mockupUrl}
                alt={p.title}
                className="size-full object-cover"
                loading="lazy"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.3";
                }}
              />
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                {p.source === "printify_live" ? (
                  <Badge variant="success">Live POD</Badge>
                ) : (
                  <Badge variant="info">Pipeline</Badge>
                )}
                {p.agentShopable ? (
                  <Badge variant="default">Agent</Badge>
                ) : null}
              </div>
            </div>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-base leading-snug">{p.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-xs">
                {p.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-lg font-semibold tabular">
                  {formatUsd(p.priceUsd)}
                </p>
                <p className="text-xs text-subtle font-mono">{p.sku}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.printifyUrl ? (
                  <Button asChild size="sm" className="flex-1 min-w-[7rem]">
                    <a href={p.printifyUrl} target="_blank" rel="noreferrer">
                      <ShoppingBag className="size-3.5" />
                      Buy POD
                    </a>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="secondary" className="flex-1 min-w-[7rem]">
                  <Link
                    to="/pay"
                    search={{
                      skill: "merch",
                      sku: p.sku,
                      amount: p.priceUsd,
                      canceled: false,
                    }}
                  >
                    <Wallet className="size-3.5" />
                    Agent pay
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelected(p)}
                >
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No products in this filter. Run the pipeline or open Printify.
        </p>
      ) : null}

      {selected ? (
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-lg">{selected.title}</CardTitle>
            <CardDescription>
              Agent settlement · multi-rail · {CLOUDFLARE_MAP.factory}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5 text-sm text-muted">
              {agentBuyInstructions(selected).map((line) => (
                <li key={line} className="break-all font-mono text-xs">
                  {line}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link
                  to="/pay"
                  search={{
                    skill: "merch",
                    sku: selected.sku,
                    amount: selected.priceUsd,
                    canceled: false,
                  }}
                >
                  Open multi-rail pay
                </Link>
              </Button>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
