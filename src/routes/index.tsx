import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  Disc3,
  PackageCheck,
  Sparkles,
  Wallet,
  ArrowRight,
  FlaskConical,
  Store,
  LayoutGrid,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrandMark } from "@/components/brand/visual-hero";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MUSIC_CATALOG, SKILL_TEMPLATES, CANARY } from "@/lib/factory/catalog";
import { LVL_PAYMENT } from "@/lib/factory/payment";
import { useFactoryStore } from "@/lib/factory/store";
import { BRAND_ART } from "@/lib/store/images";
import { formatUsdc, formatUsdcOnBase } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

const activity = [
  { day: "Mon", packs: 2 },
  { day: "Tue", packs: 4 },
  { day: "Wed", packs: 3 },
  { day: "Thu", packs: 6 },
  { day: "Fri", packs: 5 },
  { day: "Sat", packs: 2 },
  { day: "Sun", packs: 1 },
];

function DashboardPage() {
  const packages = useFactoryStore((s) => s.packages);
  const seedTier1 = useFactoryStore((s) => s.seedTier1);
  const lastMessage = useFactoryStore((s) => s.lastMessage);
  const processingId = useFactoryStore((s) => s.processingId);

  const packsReady = packages.filter(
    (p) => p.status === "ready" || p.status === "approved",
  ).length;
  const packsPublished = packages.filter((p) => p.status === "published").length;
  const estimatedUsdc = packages
    .filter((p) => p.status === "published")
    .reduce((sum, p) => {
      if (p.kind === "skill") return sum + p.priceUsdc;
      return sum + p.metadata.downloadPriceUsdc;
    }, 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border shadow-soft">
        <img
          src={BRAND_ART.heroFactory}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="hero-scrim absolute inset-0" />
        <div className="hero-scrim-bottom absolute inset-x-0 bottom-0 h-3/4" />
        <div className="relative z-[1] flex min-h-[200px] flex-col justify-end gap-3 p-5 sm:min-h-[220px] sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <BrandMark size="sm" />
            <Badge variant="info">lvlltd.com marketplace</Badge>
            <Badge variant="default">{LVL_PAYMENT.label}</Badge>
            <Badge variant="warning">chain {LVL_PAYMENT.chainId}</Badge>
          </div>
          <h1 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Skill + Music Pack Factory
          </h1>
          <p className="max-w-xl text-sm text-muted">
            Compose flagship skills and music release kits, approve, export
            listings that always settle in {LVL_PAYMENT.label}. Wired into the
            same marketplace hosts as merch and agent commerce.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={() => seedTier1()} disabled={processingId !== null}>
              Seed Tier 1 packs
            </Button>
            <Button asChild variant="secondary">
              <Link to="/marketplace">Marketplace</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/shop">Open store</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link
                to="/pay"
                search={{
                  skill: CANARY.skillId,
                  amount: CANARY.priceUsdc,
                  canceled: false,
                }}
              >
                <Wallet className="size-4" />
                Canary pay
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/marketplace"
          className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-colors hover:bg-surface-2"
        >
          <div className="absolute inset-y-0 right-0 w-1/3 opacity-50">
            <img
              src={BRAND_ART.heroNetwork}
              alt=""
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-surface to-transparent" />
          </div>
          <div className="relative flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2">
                <LayoutGrid className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  LVL Marketplace hub
                </p>
                <p className="text-xs text-muted">
                  Shop · checkout · pay · account · seller · agents
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-fg">
              Open hub <ArrowRight className="size-3.5" />
            </span>
          </div>
        </Link>

        <Link
          to="/shop"
          className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-colors hover:bg-surface-2"
        >
          <div className="absolute inset-y-0 right-0 w-1/3 opacity-50">
            <img
              src={BRAND_ART.collectionTees}
              alt=""
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-surface to-transparent" />
          </div>
          <div className="relative flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2">
                <Store className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">LVL Store</p>
                <p className="text-xs text-muted">
                  Merch & art · Imagine mockups · Printify + multi-rail
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-fg">
              Open storefront <ArrowRight className="size-3.5" />
            </span>
          </div>
        </Link>
      </div>

      {lastMessage ? (
        <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
          {lastMessage}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Ready packs",
            value: packsReady,
            icon: PackageCheck,
          },
          {
            label: "Published",
            value: packsPublished,
            icon: Sparkles,
          },
          {
            label: "Music templates",
            value: MUSIC_CATALOG.length,
            icon: Disc3,
          },
          {
            label: "Skill templates",
            value: SKILL_TEMPLATES.length,
            icon: Boxes,
          },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-surface shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{s.label}</CardDescription>
              <s.icon className="size-4 text-muted" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Publish activity</CardTitle>
            <CardDescription>Local demo series</CardDescription>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--color-subtle)" fontSize={11} />
                <YAxis stroke="var(--color-subtle)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="packs"
                  stroke="var(--color-chart-4)"
                  fill="var(--color-chart-4)"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border bg-surface shadow-soft">
          <div className="relative h-20">
            <img
              src={BRAND_ART.markAgent}
              alt=""
              className="size-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
          </div>
          <CardHeader className="pt-2">
            <CardTitle className="text-base">Published estimate</CardTitle>
            <CardDescription>
              {formatUsdc(estimatedUsdc)} · {formatUsdcOnBase(estimatedUsdc)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>
              Canary skill{" "}
              <span className="font-mono text-fg">{CANARY.skillId}</span> ·{" "}
              {CANARY.priceUsdc} USDC
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link to="/canary">
                <FlaskConical className="size-4" />
                Open canary
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
