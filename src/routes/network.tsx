import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  ExternalLink,
  Globe,
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

export const Route = createFileRoute("/network")({
  component: NetworkPage,
  head: () => ({
    meta: [
      { title: "LVL Network — domains & rails | lvlltd.com" },
      {
        name: "description",
        content:
          "Domain map for LVL Ltd: apex, factory store, Printify, agent commerce, multi-rail pay.",
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
          <Badge variant="default">Cloudflare</Badge>
          <Badge variant="success">multi-rail</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          LVL network model
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          How {LVL_NETWORK.brand} surfaces connect: brand apex, factory
          commerce, Printify fulfillment, and agent settlement.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
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
          <CardTitle className="text-base">Quick links</CardTitle>
          <CardDescription>Live paths on this factory origin</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/shop">
              <ShoppingBag className="size-4" />
              Store
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/agent/merch">
              <Bot className="size-4" />
              Agent catalog
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/pay" search={{ skill: "merch", amount: 0.05, canceled: false }}>
              <Wallet className="size-4" />
              Multi-rail pay
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/pipeline">
              <Workflow className="size-4" />
              Imagine pipeline
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <a href={PRINTIFY_STORE.storefrontUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Printify
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base">Canonical URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(CLOUDFLARE_MAP)
              .filter(([, v]) => typeof v === "string" && v.startsWith("http"))
              .map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-lg border border-border bg-bg px-3 py-2"
                >
                  <dt className="text-xs uppercase tracking-wider text-subtle">
                    {k}
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs text-muted">
                    {v}
                  </dd>
                </div>
              ))}
          </dl>
          <p className="mt-4 text-xs text-subtle">{CLOUDFLARE_MAP.note}</p>
        </CardContent>
      </Card>
    </div>
  );
}
