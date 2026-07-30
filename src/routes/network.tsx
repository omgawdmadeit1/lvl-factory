import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Globe,
  LayoutGrid,
  ShoppingBag,
  Wallet,
  Workflow,
} from "lucide-react";
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
} from "@/lib/marketplace/hosts";
import { LVL_NETWORK, PRINTIFY_STORE } from "@/lib/merch/printify";

export const Route = createFileRoute("/network")({
  component: NetworkPage,
  head: () => ({
    meta: [
      { title: "LVL Network — marketplace domains | lvlltd.com" },
      {
        name: "description",
        content:
          "Full domain map for LVL marketplace: shop, markets, agents, factory, Printify.",
      },
    ],
  }),
});

function NetworkPage() {
  const publicHosts = MARKETPLACE_HOSTS.filter(
    (h) => h.audience !== "external",
  );

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">lvlltd.com</Badge>
          <Badge variant="default">marketplace</Badge>
          <Badge variant="success">{publicHosts.length} hosts</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          LVL marketplace network
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Every surface on the mesh — markets, edge tools, commerce rails, and
          factory ops. Same app; host rewrite lands you on the right home path.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/marketplace">
              <LayoutGrid className="size-4" />
              Marketplace hub
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/labs">Labs demos</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/shop">
              <ShoppingBag className="size-4" />
              Store
            </Link>
          </Button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Live hosts</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {publicHosts.map((h) => (
            <Card key={h.host} className="border-border bg-surface shadow-soft">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="default">{h.audience}</Badge>
                  <Badge variant="info">{h.surface}</Badge>
                </div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="size-4 shrink-0 text-muted" />
                  <span className="min-w-0 truncate font-mono text-sm">
                    {h.host}
                  </span>
                </CardTitle>
                <CardDescription>{h.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-subtle">{h.homePath}</span>
                <Button size="sm" variant="secondary" asChild>
                  <a href={h.homePath}>Open path</a>
                </Button>
                <a
                  href={h.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-muted hover:text-fg"
                >
                  <ExternalLink className="size-3" />
                  host
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Tool matrix</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MARKETPLACE_TOOLS.map((t) => (
            <Card key={t.id} className="border-border bg-surface shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.title}</CardTitle>
                <CardDescription>{t.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-xs text-muted">
                <span className="font-mono">{t.host}</span>
                <Button size="sm" variant="secondary" asChild>
                  <a href={t.path}>Open</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Workflow className="size-4 text-muted" />
          Brand + Printify
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-border bg-surface shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">{LVL_NETWORK.brand}</CardTitle>
              <CardDescription>
                Apex domains and factory mesh reference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted">
              {LVL_NETWORK.domains.slice(0, 8).map((d) => (
                <p key={d.host} className="font-mono">
                  {d.host}
                </p>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border bg-surface shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4" />
                Printify POD
              </CardTitle>
              <CardDescription>External physical fulfillment</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted">
              <p className="font-mono text-fg">{PRINTIFY_STORE.storefrontUrl}</p>
              <p className="mt-2">
                Physical checkout runs on Printify Pop-Up; digital rails settle
                on factory pay.
              </p>
              <Button size="sm" variant="secondary" className="mt-3" asChild>
                <a
                  href={PRINTIFY_STORE.storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Printify
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
