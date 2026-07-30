import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Beaker,
  Bot,
  ChartCandlestick,
  Package,
  Shield,
  Store,
  Truck,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import { BrandMark, VisualHero } from "@/components/brand/visual-hero";
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
  MARKETPLACE_HOSTS,
  MARKETPLACE_TOOLS,
  MARKETPLACE_URLS,
} from "@/lib/marketplace/hosts";
import { LVL_PAYMENT } from "@/lib/factory/payment";
import { PRINTIFY_STORE } from "@/lib/merch/printify";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      {
        title: "LVL Marketplace — shop, pay, agents | lvlltd.com",
      },
      {
        name: "description",
        content:
          "LVL marketplace hub: Exchange, Labs demos, merch store, multi-rail checkout, agent fleets, seller tools on the lvlltd.com domain family.",
      },
    ],
  }),
  component: MarketplaceHubPage,
});

function MarketplaceHubPage() {
  const buyerTools = MARKETPLACE_TOOLS.filter((t) => t.audience === "buyer");
  const opsTools = MARKETPLACE_TOOLS.filter(
    (t) => t.audience === "operator" || t.audience === "agent",
  );
  const publicHosts = MARKETPLACE_HOSTS.filter(
    (h) => h.surface !== "printify_external",
  );

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroNetwork}
        eyebrow="lvlltd.com · marketplace hub"
        title="Shop, settle, trade — one LVL network"
        description={
          <>
            Live demos for every surface, secondary Exchange for digital goods,
            agent fleets, Printify POD, multi-rail pay — wired across{" "}
            <span className="text-fg">lvlltd.com</span> subdomains.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/labs">
                <Beaker className="size-4" />
                Open Labs demos
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/exchange">
                <ChartCandlestick className="size-4" />
                Exchange
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/fleet">
                <Users className="size-4" />
                Fleet
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/shop">
                <Store className="size-4" />
                Store
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">lvlltd.com</Badge>
        <Badge variant="default">{LVL_PAYMENT.label}</Badge>
        <Badge variant="warning">marketplace hub</Badge>
        <Badge variant="success">live demos</Badge>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Beaker,
            title: "Labs",
            body: "Interactive demos for every product on the mesh",
            img: BRAND_ART.heroNetwork,
            to: "/labs" as const,
          },
          {
            icon: ChartCandlestick,
            title: "Exchange",
            body: "Secondary market for skills, licenses & design rights",
            img: BRAND_ART.heroFactory,
            to: "/exchange" as const,
          },
          {
            icon: Users,
            title: "Fleet",
            body: "Hire agent crews for drops, restock, support, MM",
            img: BRAND_ART.collectionAgent,
            to: "/fleet" as const,
          },
        ].map((f) => (
          <Link key={f.title} to={f.to} className="block">
            <Card className="h-full overflow-hidden border-border bg-surface shadow-soft transition-colors hover:bg-surface-2">
              <div className="relative h-24 overflow-hidden bg-surface-2">
                <img
                  src={f.img}
                  alt=""
                  className="size-full object-cover opacity-80"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
              </div>
              <CardHeader className="pb-2 pt-3">
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2">
                  <f.icon className="size-4" />
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Store,
            title: "Catalog",
            body: "LVL Store collections, search, wishlist, agent SKUs",
            img: BRAND_ART.collectionTees,
          },
          {
            icon: Wallet,
            title: "Settlement",
            body: `${LVL_PAYMENT.label} · multi-chain USDC/USDT · Stripe card`,
            img: BRAND_ART.heroFactory,
          },
          {
            icon: Truck,
            title: "Fulfillment",
            body: `${PRINTIFY_STORE.brand} POD · webhooks on factory`,
            img: BRAND_ART.collectionArt,
          },
        ].map((f) => (
          <Card
            key={f.title}
            className="overflow-hidden border-border bg-surface shadow-soft"
          >
            <div className="relative h-24 overflow-hidden bg-surface-2">
              <img
                src={f.img}
                alt=""
                className="size-full object-cover opacity-80"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
            </div>
            <CardHeader className="pb-2 pt-3">
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2">
                <f.icon className="size-4" />
              </div>
              <CardTitle className="text-base">{f.title}</CardTitle>
              <CardDescription>{f.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Buy · demo</h2>
          <Link to="/labs" className="text-xs text-muted hover:text-fg">
            All demos <ArrowRight className="inline size-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {buyerTools.map((t) => (
            <Link
              key={t.id}
              to={t.path}
              className="group rounded-xl border border-border bg-surface p-4 shadow-soft transition-colors hover:bg-surface-2"
            >
              <div className="mb-3 flex items-center gap-2">
                <BrandMark size="sm" />
                <p className="text-sm font-semibold tracking-tight">{t.title}</p>
              </div>
              <p className="text-xs text-muted">{t.blurb}</p>
              <p className="mt-3 font-mono text-[11px] text-subtle">{t.host}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Sell · agents · ops
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {opsTools.map((t) => (
            <Link
              key={t.id}
              to={t.path}
              className="rounded-xl border border-border bg-surface p-4 shadow-soft transition-colors hover:bg-surface-2"
            >
              <p className="text-sm font-semibold tracking-tight">{t.title}</p>
              <p className="mt-1 text-xs text-muted">{t.blurb}</p>
              <p className="mt-3 font-mono text-[11px] text-subtle">{t.host}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted" />
          <h2 className="text-lg font-semibold tracking-tight">
            Domain matrix
          </h2>
        </div>
        <Card className="border-border bg-surface shadow-soft">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[36rem] text-left text-xs">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Host</th>
                  <th className="px-4 py-3 font-medium">Surface</th>
                  <th className="px-4 py-3 font-medium">Home</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {publicHosts.map((h) => (
                  <tr
                    key={h.host}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-mono text-fg">{h.host}</td>
                    <td className="px-4 py-2.5 text-muted">{h.surface}</td>
                    <td className="px-4 py-2.5 font-mono text-subtle">
                      {h.homePath}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{h.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="text-xs text-subtle">
          Point DNS CNAMEs at the factory origin (Cloudflare → Vercel). Host
          rewrite sends <code className="text-muted">/</code> to each surface.
          Full stack also lives on{" "}
          <a
            className="text-fg underline-offset-2 hover:underline"
            href={MARKETPLACE_URLS.factory}
          >
            factory.lvlltd.com
          </a>
          .
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Card className="overflow-hidden border-border bg-surface shadow-soft">
          <div className="relative h-28">
            <img
              src={BRAND_ART.collectionAgent}
              alt=""
              className="size-full object-cover opacity-70"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
          </div>
          <CardHeader className="-mt-6 relative z-[1]">
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="size-4" />
              Seller loop
            </CardTitle>
            <CardDescription>
              Imagine → mockup → Printify draft → review → publish · webhooks
              mirror orders back to the factory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" size="sm">
              <Link to="/seller">Open seller portal</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border bg-surface shadow-soft">
          <div className="relative h-28">
            <img
              src={BRAND_ART.heroFactory}
              alt=""
              className="size-full object-cover opacity-70"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
          </div>
          <CardHeader className="-mt-6 relative z-[1]">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4" />
              Your orders
            </CardTitle>
            <CardDescription>
              Checkout writes a local order ledger; Printify + pay rails
              deep-link from each line.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" size="sm">
              <Link to="/orders">View orders</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
