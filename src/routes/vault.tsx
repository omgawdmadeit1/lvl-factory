import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Wallet } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { VisualHero } from "@/components/brand/visual-hero";
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
  VAULT_CATALOG,
  useVaultStore,
  type VaultAsset,
} from "@/lib/markets/vault";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "LVL Vault — IP rights | vault.lvlltd.com" },
      {
        name: "description",
        content:
          "Hold skills, licenses, design rights, and music kits. Accrue royalties, claim USDC in the LVL vault.",
      },
    ],
  }),
  component: VaultPage,
});

function AssetCard({ asset }: { asset: VaultAsset }) {
  const holding = useVaultStore((s) => s.holdings[asset.id]);
  const mint = useVaultStore((s) => s.mint);
  const claim = useVaultStore((s) => s.claimRoyalties);
  const wallet = useVaultStore((s) => s.walletUsdc);
  const qty = holding?.qty ?? 0;
  const accrued = holding?.accruedUsdc ?? 0;

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{asset.symbol}</Badge>
          <Badge variant="default">{asset.class.replace("_", " ")}</Badge>
        </div>
        <CardTitle className="text-base tracking-tight">{asset.title}</CardTitle>
        <CardDescription>{asset.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Value
            </p>
            <p className="font-semibold tabular text-fg">${asset.valueUsdc}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Royalty
            </p>
            <p className="font-semibold tabular text-fg">
              {(asset.royaltyBps / 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Held
            </p>
            <p className="font-semibold tabular text-fg">{qty}</p>
          </div>
        </div>
        {qty > 0 ? (
          <p className="text-xs text-muted">
            Accrued{" "}
            <span className="tabular text-fg">${accrued.toFixed(3)}</span> USDC ·
            claimed{" "}
            <span className="tabular">
              ${(holding?.claimedUsdc ?? 0).toFixed(2)}
            </span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              const ok = mint(asset.id);
              toast[ok ? "success" : "error"](
                ok
                  ? `Minted ${asset.symbol}`
                  : wallet < asset.valueUsdc
                    ? "Insufficient wallet"
                    : "Mint failed",
              );
            }}
          >
            Mint · ${asset.valueUsdc}
          </Button>
          {qty > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const amt = claim(asset.id);
                toast[amt > 0 ? "success" : "message"](
                  amt > 0 ? `Claimed $${amt.toFixed(2)}` : "Nothing to claim",
                );
              }}
            >
              Claim royalties
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" asChild>
            <Link to="/exchange">Trade</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VaultPage() {
  const tick = useVaultStore((s) => s.tickAccrue);
  const wallet = useVaultStore((s) => s.walletUsdc);
  const portfolio = useVaultStore((s) => s.portfolioValue());
  const unclaimed = useVaultStore((s) => s.unclaimed());
  const holdings = useVaultStore((s) => s.holdings);
  const seats = Object.values(holdings).reduce((n, h) => n + h.qty, 0);

  useEffect(() => {
    const t = window.setInterval(() => tick(), 2500);
    return () => window.clearInterval(t);
  }, [tick]);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.collectionArt}
        eyebrow="vault.lvlltd.com · IP vault"
        title="Hold rights. Accrue royalties."
        description={
          <>
            Skills, agent licenses, design rights, and music kits live in your
            vault — mint seats, earn secondary royalties, claim USDC, or trade on
            Exchange.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/exchange">
                <Lock className="size-4" />
                Open Exchange
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs demos</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Wallet", value: `$${wallet.toFixed(2)}` },
          { label: "Portfolio", value: `$${portfolio.toFixed(2)}` },
          { label: "Unclaimed", value: `$${unclaimed.toFixed(3)}` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft"
          >
            <p className="text-[11px] uppercase tracking-wider text-subtle">
              {s.label}
            </p>
            <p className="text-xl font-semibold tabular tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        <Wallet className="mr-1 inline size-3.5" />
        {seats} seat{seats === 1 ? "" : "s"} in vault · royalties drip while you
        browse
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Catalog</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {VAULT_CATALOG.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
