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
      <Link
        to="/marketplace"
        className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2">
            <LayoutGrid className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              LVL Marketplace hub
            </p>
            <p className="text-xs text-muted">
              Shop · checkout · pay · account · seller · agents — lvlltd.com
              subdomains
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-fg">
          Open hub <ArrowRight className="size-3.5" />
        </span>
      </Link>

      <Link
        to="/shop"
        className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2">
            <Store className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">LVL Store</p>
            <p className="text-xs text-muted">
              Merch & art · shop.lvlltd.com · Printify + multi-rail
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-fg">
          Open storefront <ArrowRight className="size-3.5" />
        </span>
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">lvlltd.com marketplace</Badge>
            <Badge variant="default">{LVL_PAYMENT.label}</Badge>
            <Badge variant="warning">chain {LVL_PAYMENT.chainId}</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Skill + Music Pack Factory
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Compose flagship skills and music release kits, approve, export
            listings that always settle in {LVL_PAYMENT.label}. Wired into the
            same marketplace hosts as merch and agent commerce.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </header>

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
          <Card key={s.label} className="border-border bg-surface">
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
        <Card className="border-border bg-surface">
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
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Published estimate</CardTitle>
            <CardDescription>
              {formatUsdc(estimatedUsdc)} · {formatUsdcOnBase(estimatedUsdc)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>
              Canary skill <span className="font-mono text-fg">{CANARY.skillId}</span>{" "}
              · {CANARY.priceUsdc} USDC
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
