import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  Disc3,
  PackageCheck,
  Sparkles,
  Wallet,
  ArrowRight,
  FlaskConical,
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">lvlltd.com factory</Badge>
            <Badge variant="default">{LVL_PAYMENT.label}</Badge>
            <Badge variant="warning">chain {LVL_PAYMENT.chainId}</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Skill + Music Pack Factory
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Compose flagship skills and music release kits, approve, export
            listings that always settle in {LVL_PAYMENT.label}. Ethereum
            mainnet is forbidden on every export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => seedTier1()} disabled={processingId !== null}>
            Seed Tier 1 packs
          </Button>
          <Button asChild variant="secondary">
            <Link to="/merch" search={{}}>
              Merch shop
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/canary">
              Canary {formatUsdc(CANARY.amountUsdc)}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {lastMessage ? (
        <p className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
          {lastMessage}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Disc3}
          label="Catalog tracks (demo)"
          value={String(MUSIC_CATALOG.length)}
          hint="Seeded from music library shape"
        />
        <StatCard
          icon={Boxes}
          label="Flagship templates"
          value={String(SKILL_TEMPLATES.filter((t) => t.flagship).length)}
          hint="Unique samples · after-pay ready"
        />
        <StatCard
          icon={PackageCheck}
          label="Ready / approved"
          value={String(packsReady)}
          hint="In local review queue"
        />
        <StatCard
          icon={Wallet}
          label="Published USDC face"
          value={formatUsdc(estimatedUsdc)}
          hint={`${packsPublished} published · multi-rail`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Pipeline throughput</CardTitle>
            <CardDescription>
              Illustrative weekly compose volume for the operator view
            </CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <defs>
                  <linearGradient id="packFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e4e4e7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#e4e4e7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="packs"
                  stroke="#e4e4e7"
                  fill="url(#packFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              Operator constraints
            </CardTitle>
            <CardDescription>Hard-coded for this factory</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted">
              <li className="rounded-lg border border-border bg-surface-2/40 p-3">
                All tools stay under{" "}
                <span className="text-fg">lvlltd.com</span> /{" "}
                <span className="text-fg">music.lvlltd.com</span> /{" "}
                <span className="text-fg">factory.lvlltd.com</span>.
              </li>
              <li className="rounded-lg border border-border bg-surface-2/40 p-3">
                No phone-call workflows. Compose → review → export only.
              </li>
              <li className="rounded-lg border border-success/30 bg-success/10 p-3 text-fg">
                All purchases settle in{" "}
                <span className="font-medium">{LVL_PAYMENT.label}</span> ·{" "}
                <span className="font-mono">chain {LVL_PAYMENT.chainId}</span>.
                Ethereum mainnet forbidden.
              </li>
              <li className="rounded-lg border border-border bg-surface-2/40 p-3">
                Flagship templates ship unique samples — boiler outlines demoted.
              </li>
              <li className="rounded-lg border border-border bg-surface-2/40 p-3">
                <Link
                  to="/canary"
                  className="inline-flex items-center gap-1 text-info hover:underline"
                >
                  <FlaskConical className="size-3.5" />
                  Run canary ({formatUsdcOnBase(CANARY.amountUsdc)})
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2">
          <Icon className="size-4 text-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-subtle">{label}</p>
          <p className="text-xl font-semibold tabular tracking-tight">{value}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
