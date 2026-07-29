import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  Package,
  Store,
  Webhook,
  Workflow,
  LayoutDashboard,
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
import { MARKETPLACE_URLS } from "@/lib/marketplace/hosts";
import { PRINTIFY_STORE } from "@/lib/merch/printify";

export const Route = createFileRoute("/seller")({
  head: () => ({
    meta: [
      { title: "Seller portal — LVL | seller.lvlltd.com" },
      {
        name: "description",
        content:
          "LVL seller portal: merch pipeline, Printify drafts, webhooks, agent catalog.",
      },
    ],
  }),
  component: SellerPage,
});

const LINKS = [
  {
    to: "/pipeline" as const,
    title: "Merch pipeline",
    body: "Imagine → mockup → Printify draft → publish",
    icon: Workflow,
  },
  {
    to: "/webhooks" as const,
    title: "Printify webhooks",
    body: "Order & product events mirrored into the factory",
    icon: Webhook,
  },
  {
    to: "/agent/merch" as const,
    title: "Agent catalog",
    body: "lvl-merch-v1 discovery for agent shoppers",
    icon: Bot,
  },
  {
    to: "/shop" as const,
    title: "Live storefront",
    body: "Buyer-facing LVL Store",
    icon: Store,
  },
  {
    to: "/queue" as const,
    title: "Publish queue",
    body: "Pack & merch publish readiness",
    icon: Package,
  },
  {
    to: "/" as const,
    title: "Operator dashboard",
    body: "Full factory console (admin.lvlltd.com)",
    icon: LayoutDashboard,
  },
];

function SellerPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">seller.lvlltd.com</Badge>
          <Badge variant="warning">operator</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Seller portal
        </h1>
        <p className="max-w-xl text-sm text-muted">
          Single-merchant LVL tools for listing merch, fulfilling via{" "}
          {PRINTIFY_STORE.brand}, and exposing agent-shopable SKUs. Multi-seller
          onboarding can layer on the same hosts later.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
            >
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2">
                <Icon className="size-4" />
              </div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted">{item.body}</p>
            </Link>
          );
        })}
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base">External POD</CardTitle>
          <CardDescription>
            Printify Pop-Up for physical checkout when buyers skip multi-rail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary" size="sm">
            <a
              href={MARKETPLACE_URLS.printify}
              target="_blank"
              rel="noreferrer"
            >
              {PRINTIFY_STORE.storefrontUrl}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
