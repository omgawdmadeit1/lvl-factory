import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Disc3,
  PackageCheck,
  Sparkles,
  Wallet,
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
import { useFactoryStore } from "@/lib/factory/store";
import { formatUsdc } from "@/lib/utils";
import { StatusBadge } from "@/components/factory/status-badge";
import { MUSIC_CATALOG } from "@/lib/factory/catalog";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

const pipeline = [
  { step: "1", name: "Ingest", detail: "Catalog track or skill template" },
  { step: "2", name: "Compose", detail: "Local factory builds sealed pack" },
  { step: "3", name: "Review", detail: "You approve — zero phone calls" },
  { step: "4", name: "Publish", detail: "Export to lvlltd.com rails" },
];

const activity = [
  { day: "Mon", packs: 1 },
  { day: "Tue", packs: 2 },
  { day: "Wed", packs: 1 },
  { day: "Thu", packs: 3 },
  { day: "Fri", packs: 2 },
  { day: "Sat", packs: 4 },
  { day: "Sun", packs: 3 },
];

function DashboardPage() {
  const packages = useFactoryStore((s) => s.packages);
  const packsReady = packages.filter((p) =>
    ["ready", "approved"].includes(p.status),
  ).length;
  const packsPublished = packages.filter((p) => p.status === "published").length;
  const estimatedUsdc = packages
    .filter((p) => p.status === "published")
    .reduce((sum, p) => {
      if (p.kind === "skill") return sum + p.priceUsdc;
      return sum + p.metadata.downloadPriceUsdc;
    }, 0);
  const recent = packages.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Skill + Music Pack Factory
          </h1>
          <p className="max-w-2xl text-sm text-muted md:text-base">
            Private production backend for{" "}
            <span className="text-fg">lvlltd.com</span> and{" "}
            <span className="text-fg">music.lvlltd.com</span>. Compose sealed
            agent skills and music release kits, approve locally, export to your
            live x402 rails — no phone path required.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/music">
              <Disc3 className="size-4" />
              Compose music
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/skills">
              <Boxes className="size-4" />
              Compose skill
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Disc3}
          label="Catalog tracks (demo)"
          value={String(MUSIC_CATALOG.length)}
          hint="Seeded from music library shape"
        />
        <StatCard
          icon={Boxes}
          label="Live skill shelf"
          value="236"
          hint="lvlltd.com catalog size"
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
          hint={`${packsPublished} published packs`}
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
                <XAxis
                  dataKey="day"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#121214",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    color: "#f4f4f5",
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
            <CardTitle>How it ships</CardTitle>
            <CardDescription>All under the LVL domain family</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipeline.map((p) => (
              <div
                key={p.step}
                className="flex gap-3 rounded-lg border border-border bg-surface-2/50 p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-xs font-semibold tabular">
                  {p.step}
                </div>
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted">{p.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent packs</CardTitle>
              <CardDescription>Latest factory output</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/queue">
                Queue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <Empty
                title="No packs yet"
                body="Compose a music release kit or sealed skill pack to fill the queue."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-subtle">
                        {p.kind === "music" ? "Music" : "Skill"} ·{" "}
                        {new Date(p.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
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
                All tools and products stay under{" "}
                <span className="text-fg">lvlltd.com</span> /{" "}
                <span className="text-fg">music.lvlltd.com</span>.
              </li>
              <li className="rounded-lg border border-border bg-surface-2/40 p-3">
                No phone-call workflows. Digital compose → review → export only.
              </li>
              <li className="rounded-lg border border-border bg-surface-2/40 p-3">
                Payments stay on existing x402 Base USDC rails — factory only
                produces sealed inventory.
              </li>
              <li className="rounded-lg border border-border bg-surface-2/40 p-3">
                Low-physical: approve and export from this console; no wrenches,
                no meetings.
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
          <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular">
            {value}
          </p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
