import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  ExternalLink,
  Globe,
  LayoutGrid,
  ShoppingBag,
  Workflow,
  Wallet,
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
import { CLOUDFLARE_MAP, LVL_NETWORK, PRINTIFY_STORE } from "@/lib/merch/printify";
import { MARKETPLACE_TOOLS } from "@/lib/marketplace/hosts";

export const Route = createFileRoute("/network")({
  component: NetworkPage,
  head: () => ({
    meta: [
      { title: "LVL Network — marketplace domains | lvlltd.com" },
      {
        name: "description",
        content:
          "Domain map for LVL marketplace: shop, pay, account, seller, agents, factory, Printify.",
      },
    ],
  }),
});

function NetworkPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">lvlltd.com</Badge>
          <Badge variant="default">marketplace</Badge>
          <Badge variant="success">multi-rail</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          LVL marketplace network
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          How {LVL_NETWORK.brand} surfaces connect: brand hub, shop, checkout,
          pay rails, seller tools, agent catalog, and Printify fulfillment.
        </p>
        <Button asChild size="sm" variant="secondary">
          <Link to="/marketplace">
            <LayoutGrid className="size-4" />
            Open marketplace hub
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LVL_NETWORK.domains.map((d) => (
          <Card key={d.host} className="border-border bg-surface">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="size-4 text-muted" />
                {d.host}
              </CardTitle>
              <CardDescription>{d.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-subtle">
              <p className="font-mono text-muted">{d.role}</p>
              {"surface" in d && d.surface ? (
                <p>
                  surface <span className="text-fg">{d.surface}</span> · home{" "}
                  <span className="font-mono text-fg">{d.homePath}</span>
                </p>
              ) : null}
              {"paths" in d && d.paths
                ? Object.entries(d.paths).map(([k, v]) => (
                    <p key={k}>
                      <span className="text-subtle">{k}</span>{" "}
                      <span className="font-mono text-fg">{v}</span>
                    </p>
                  ))
                : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base">Marketplace tools</CardTitle>
          <CardDescription>
            Path on factory · dedicated subdomain when DNS is live
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {MARKETPLACE_TOOLS.map((t) => (
            <Link
              key={t.id}
              to={t.path}
              className="rounded-lg border border-border px-3 py-2 text-xs transition-colors hover:bg-surface-2"
            >
              <span className="font-medium text-fg">{t.title}</span>
              <span className="mt-0.5 block font-mono text-subtle">{t.host}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
          <CardDescription>Live paths on this origin</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/shop">
              <ShoppingBag className="size-4" />
              Store
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/checkout">Checkout</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/agent/merch">
              <Bot className="size-4" />
              Agent catalog
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link
              to="/pay"
              search={{ skill: "merch", amount: 0.05, canceled: false }}
            >
              <Wallet className="size-4" />
              Multi-rail pay
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/pipeline">
              <Workflow className="size-4" />
              Pipeline
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <a href={CLOUDFLARE_MAP.printify} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              {PRINTIFY_STORE.slug}
            </a>
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-subtle">{CLOUDFLARE_MAP.note}</p>
    </div>
  );
}
