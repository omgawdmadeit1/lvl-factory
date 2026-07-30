import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartCandlestick,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { Input } from "@/components/ui/input";
import {
  classLabel,
  EXCHANGE_LISTINGS,
  listingById,
  useExchangeStore,
} from "@/lib/markets/exchange";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exchange")({
  head: () => ({
    meta: [
      {
        title: "LVL Exchange — secondary digital market | exchange.lvlltd.com",
      },
      {
        name: "description",
        content:
          "Trade skill packs, music kits, agent licenses, and design rights on LVL Exchange. Live order book demo on lvlltd.com.",
      },
    ],
  }),
  component: ExchangePage,
});

function ExchangePage() {
  const selectedId = useExchangeStore((s) => s.selectedId);
  const select = useExchangeStore((s) => s.select);
  const books = useExchangeStore((s) => s.books);
  const tape = useExchangeStore((s) => s.tape);
  const place = useExchangeStore((s) => s.place);
  const tickBots = useExchangeStore((s) => s.tickBots);
  const cashUsdc = useExchangeStore((s) => s.cashUsdc);
  const positions = useExchangeStore((s) => s.positions);
  const fills = useExchangeStore((s) => s.fills);
  const [qty, setQty] = useState(1);

  const listing = listingById(selectedId) ?? EXCHANGE_LISTINGS[0];
  const book = books[listing.id];
  const pos = positions[listing.id] ?? 0;

  useEffect(() => {
    const t = window.setInterval(() => tickBots(), 2200);
    return () => window.clearInterval(t);
  }, [tickBots]);

  const spark = useMemo(() => {
    const series = tape
      .filter((t) => t.listingId === listing.id)
      .slice(0, 20)
      .reverse()
      .map((t, i) => ({ i, p: t.price }));
    if (series.length < 2) {
      return Array.from({ length: 12 }, (_, i) => ({
        i,
        p: listing.mid * (1 + (i - 6) * 0.004),
      }));
    }
    return series;
  }, [tape, listing]);

  function onTrade(side: "buy" | "sell") {
    const r = place(side, qty);
    toast[r.ok ? "success" : "error"](r.message);
  }

  return (
    <div className="space-y-8">
      <VisualHero
        image={BRAND_ART.heroFactory}
        eyebrow="exchange.lvlltd.com · next big market"
        title="LVL Exchange — secondary digital goods"
        description={
          <>
            Skills, music packs, agent licenses, design rights, and merch
            blueprints trade after mint. Live order book, demo USDC balance,
            real fills on this origin.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/labs">All live demos</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/fleet">Hire market makers</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link
                to="/pay"
                search={{ skill: "exchange", amount: 5, canceled: false }}
              >
                <Wallet className="size-4" />
                Top up rails
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">Secondary market</Badge>
        <Badge variant="success">Live book</Badge>
        <Badge variant="default">
          Demo cash {cashUsdc.toFixed(2)} USDC
        </Badge>
        <Badge variant="warning">{EXCHANGE_LISTINGS.length} listings</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {EXCHANGE_LISTINGS.map((L) => {
              const active = L.id === listing.id;
              const up = L.change24h >= 0;
              return (
                <button
                  key={L.id}
                  type="button"
                  onClick={() => select(L.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-fg/25 bg-surface-2 shadow-soft"
                      : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-subtle">{L.symbol}</p>
                      <p className="text-sm font-semibold tracking-tight">
                        {L.title}
                      </p>
                    </div>
                    {up ? (
                      <ArrowUpRight className="size-4 text-success" />
                    ) : (
                      <ArrowDownRight className="size-4 text-danger" />
                    )}
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="font-mono text-base tabular text-fg">
                      {L.mid.toFixed(2)}
                    </span>
                    <span
                      className={cn(
                        "text-xs tabular",
                        up ? "text-success" : "text-danger",
                      )}
                    >
                      {up ? "+" : ""}
                      {L.change24h.toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-subtle">
                    {classLabel(L.class)} · vol{" "}
                    {(L.volume24h / 1000).toFixed(1)}k
                  </p>
                </button>
              );
            })}
          </div>

          <Card className="border-border bg-surface shadow-soft">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <ChartCandlestick className="size-4 text-muted" />
                <CardTitle className="text-base">
                  {listing.symbol} · {listing.title}
                </CardTitle>
                <Badge variant="default">{classLabel(listing.class)}</Badge>
              </div>
              <CardDescription>{listing.blurb}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spark}>
                    <defs>
                      <linearGradient id="xlFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--color-info)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-info)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="i" hide />
                    <YAxis domain={["auto", "auto"]} hide />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={() => listing.symbol}
                      formatter={(v: number) => [
                        `${Number(v).toFixed(2)} USDC`,
                        "Price",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="p"
                      stroke="var(--color-info)"
                      fill="url(#xlFill)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">
                    Bids
                  </p>
                  <ul className="space-y-1 font-mono text-xs">
                    {(book?.bids ?? []).slice(0, 6).map((l) => (
                      <li
                        key={`b-${l.price}`}
                        className="flex justify-between rounded bg-success/5 px-2 py-1"
                      >
                        <span className="text-success">{l.price.toFixed(2)}</span>
                        <span className="text-muted">×{l.size}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">
                    Asks
                  </p>
                  <ul className="space-y-1 font-mono text-xs">
                    {(book?.asks ?? []).slice(0, 6).map((l) => (
                      <li
                        key={`a-${l.price}`}
                        className="flex justify-between rounded bg-danger/5 px-2 py-1"
                      >
                        <span className="text-danger">{l.price.toFixed(2)}</span>
                        <span className="text-muted">×{l.size}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-subtle" htmlFor="xl-qty">
                    Size
                  </label>
                  <Input
                    id="xl-qty"
                    type="number"
                    min={1}
                    max={20}
                    value={qty}
                    onChange={(e) =>
                      setQty(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-24"
                  />
                </div>
                <Button onClick={() => onTrade("buy")}>Buy market</Button>
                <Button variant="secondary" onClick={() => onTrade("sell")}>
                  Sell market
                </Button>
                <p className="text-xs text-muted">
                  Position{" "}
                  <span className="font-mono text-fg tabular">{pos}</span> ·
                  float {listing.freeFloat}/{listing.supply}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border bg-surface shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trade tape</CardTitle>
              <CardDescription>Live fills across the book</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="max-h-80 space-y-1 overflow-y-auto font-mono text-[11px]">
                {tape.slice(0, 28).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5 last:border-0"
                  >
                    <span
                      className={cn(
                        "w-8",
                        t.side === "buy" ? "text-success" : "text-danger",
                      )}
                    >
                      {t.side === "buy" ? "B" : "S"}
                    </span>
                    <span className="text-muted">{t.symbol}</span>
                    <span className="tabular text-fg">{t.price.toFixed(2)}</span>
                    <span className="text-subtle">×{t.size}</span>
                    <span className="w-8 text-right text-subtle">
                      {t.maker === "you" ? "you" : "mm"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-surface shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your fills</CardTitle>
              <CardDescription>Session ledger (local)</CardDescription>
            </CardHeader>
            <CardContent>
              {fills.length === 0 ? (
                <p className="text-xs text-muted">
                  No fills yet — hit Buy market to demo a trade.
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {fills.slice(0, 10).map((f) => (
                    <li
                      key={f.id}
                      className="flex justify-between gap-2 border-b border-border/40 pb-2 last:border-0"
                    >
                      <span>
                        <span
                          className={
                            f.side === "buy" ? "text-success" : "text-danger"
                          }
                        >
                          {f.side}
                        </span>{" "}
                        {f.symbol}
                      </span>
                      <span className="font-mono tabular">
                        {f.size}@{f.price.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
