import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CreditCard,
  ExternalLink,
  FlaskConical,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CANARY } from "@/lib/factory/catalog";
import { STRIPE_LINKS, LVL_PAYMENT } from "@/lib/factory/payment";
import { useFactoryStore } from "@/lib/factory/store";
import { formatUsdc } from "@/lib/utils";

export const Route = createFileRoute("/canary")({
  component: CanaryPage,
});

function CanaryPage() {
  const composeSkill = useFactoryStore((s) => s.composeSkill);
  const packages = useFactoryStore((s) => s.packages);
  const canaryPack = packages.find(
    (p) => p.kind === "skill" && p.skillId === CANARY.skillId,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <FlaskConical className="size-4" />
          First unlock · multi-rail
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Canary unlock — pick your rail
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Escrow + Base-only gas was blocking you. Checkout is open:{" "}
          <strong className="text-fg">any mainnet crypto you choose</strong>, or{" "}
          <strong className="text-fg">Stripe card</strong>. Agents can still use
          Base USDC x402.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-subtle">Crypto canary</p>
            <p className="text-2xl font-semibold">
              {formatUsdc(CANARY.amountUsdc)}
            </p>
            <p className="text-xs text-muted">Any supported mainnet</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-subtle">Card canary</p>
            <p className="text-2xl font-semibold">$0.50</p>
            <p className="text-xs text-muted">Stripe min · live link</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs text-subtle">Factory pack</p>
            <p className="text-sm font-medium">
              {canaryPack ? canaryPack.status : "not composed"}
            </p>
            <Button
              size="sm"
              className="mt-2"
              variant="secondary"
              onClick={() => composeSkill(CANARY.skillId)}
            >
              Compose canary pack
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4" />
              Crypto — you choose network
            </CardTitle>
            <CardDescription>
              Ethereum mainnet + Base + L2s · USDC / USDT / native · all wallets
              + WalletConnect
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>
              Open the checkout page, pick the chain where you already have
              gas + tokens, send the face amount to treasury. No forced Base
              escrow for this path.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">Mainnets only</Badge>
              <Badge variant="default">Default: Base USDC</Badge>
            </div>
            <Button asChild>
              <Link
                to="/pay"
                search={{ skill: CANARY.skillId, amount: 0.05, canceled: false }}
              >
                Open multi-rail checkout
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4" />
              Card — Stripe (live)
            </CardTitle>
            <CardDescription>
              Skip MetaMask entirely · lvl X, Inc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>
              Best fix when gas / escrow simulation fails. Stripe minimum is
              $0.50 for card (crypto canary stays $0.05).
            </p>
            <Button asChild>
              <a
                href={STRIPE_LINKS.canary50c.url}
                target="_blank"
                rel="noreferrer"
              >
                Pay $0.50 with card
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a
                href={STRIPE_LINKS.unlock99c.url}
                target="_blank"
                rel="noreferrer"
              >
                Pay $0.99 starter
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4 text-xs text-muted">
          <p>
            Skill: <span className="font-mono text-fg">{CANARY.skillId}</span>
          </p>
          <p>
            Treasury:{" "}
            <span className="font-mono text-fg">{LVL_PAYMENT.payTo}</span>
          </p>
          <p>
            After pay, check{" "}
            <a
              href={CANARY.proofUrl}
              className="text-info hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              /api/proof
            </a>
            . Card path may need manual proof match until lvlltd.com webhooks
            land.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
