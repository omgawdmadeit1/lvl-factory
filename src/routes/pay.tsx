import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  QrCode,
  Shield,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  STRIPE_LINKS,
  TREASURY_EVM,
  TREASURY_SOL,
  type AssetSymbol,
  type MainnetId,
  type SolanaAssetSymbol,
  buildCryptoChoice,
  buildStripeChoice,
  formatFaceUsd,
  getAsset,
  getNetwork,
} from "@/lib/factory/payment";
import { CANARY } from "@/lib/factory/catalog";
import {
  type ConnectedSession,
  type DiscoveredWallet,
  checkoutPageUrl,
  connectInjected,
  connectWalletConnect,
  disconnectWallet,
  discoverInjectedWallets,
  isMobileUa,
  isWalletConnectConfigured,
  mobileWalletLinks,
  networksForUi,
  sendPayment,
  shortAddr,
  walletConnectStatusLabel,
  WALLETCONNECT_SETUP,
  WALLETCONNECT_VERSION,
} from "@/lib/factory/wallet";
import {
  type DiscoveredSolanaWallet,
  type SolanaSession,
  connectSolanaWallet,
  disconnectSolana,
  discoverSolanaWallets,
  sendSolanaPayment,
  shortSolAddr,
  solanaMobileLinks,
  solanaTreasuryReady,
} from "@/lib/factory/solana-wallet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PaySearch = {
  skill: string;
  amount: number;
  canceled: boolean;
  sku?: string;
};

export const Route = createFileRoute("/pay")({
  component: PayPage,
  validateSearch: (s: Record<string, unknown>): PaySearch => {
    const out: PaySearch = {
      skill: typeof s.skill === "string" ? s.skill : CANARY.skillId,
      amount:
        typeof s.amount === "string"
          ? Number(s.amount)
          : typeof s.amount === "number"
            ? s.amount
            : 0.05,
      canceled: s.canceled === "1" || s.canceled === true ? true : false,
    };
    if (typeof s.sku === "string" && s.sku.trim()) out.sku = s.sku.trim();
    return out;
  },
});

type Method = "crypto" | "stripe";

function PayPage() {
  const { skill, amount, canceled, sku } = Route.useSearch();
  const amountUsd = Number.isFinite(amount) && amount > 0 ? amount : 0.05;
  const merchSku = sku?.trim() || null;

  const [method, setMethod] = useState<Method>("crypto");
  const [networkId, setNetworkId] = useState<MainnetId>("ethereum");
  const [asset, setAsset] = useState<AssetSymbol>("USDC");
  const [copied, setCopied] = useState<string | null>(null);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [solWallets, setSolWallets] = useState<DiscoveredSolanaWallet[]>([]);
  const [session, setSession] = useState<ConnectedSession | null>(null);
  const [solSession, setSolSession] = useState<SolanaSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  const network = getNetwork(networkId);
  const isSolana = network.family === "solana";
  const assets = network.assets;
  const networks = useMemo(() => networksForUi(), []);

  const safeAsset: AssetSymbol = assets.some((a) => a.symbol === asset)
    ? asset
    : (assets.find((a) => a.preferred)?.symbol ?? assets[0].symbol);

  const crypto = useMemo(
    () => buildCryptoChoice(networkId, safeAsset, amountUsd),
    [networkId, safeAsset, amountUsd],
  );
  const stripe = useMemo(
    () => buildStripeChoice(amountUsd, skill),
    [amountUsd, skill],
  );

  useEffect(() => {
    setMobile(isMobileUa());
    setWallets(discoverInjectedWallets());
    setSolWallets(discoverSolanaWallets());
    const t = window.setTimeout(() => {
      setWallets(discoverInjectedWallets());
      setSolWallets(discoverSolanaWallets());
    }, 400);
    return () => window.clearTimeout(t);
  }, []);

  // Clear opposite session when switching family
  useEffect(() => {
    if (isSolana) {
      setSession(null);
    } else {
      setSolSession(null);
    }
    setTxHash(null);
  }, [isSolana, networkId]);

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  }

  async function onConnectInjected(w: DiscoveredWallet) {
    if (isSolana) return;
    setBusy(`connect-${w.id}`);
    try {
      const s = await connectInjected(w, networkId);
      setSession(s);
      setSolSession(null);
      toast.success(`Connected ${w.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wallet connect failed");
    } finally {
      setBusy(null);
    }
  }

  async function onWalletConnect() {
    if (isSolana) {
      toast.error("WalletConnect EVM is for Ethereum chains. Use Phantom / Solflare for Solana.");
      return;
    }
    setBusy("wc");
    try {
      const s = await connectWalletConnect(networkId);
      setSession(s);
      setSolSession(null);
      toast.success("WalletConnect v2 linked");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "WalletConnect failed — try MetaMask / Coinbase / deep link",
      );
    } finally {
      setBusy(null);
    }
  }

  async function onConnectSolana(w: DiscoveredSolanaWallet) {
    setBusy(`sol-${w.id}`);
    try {
      const s = await connectSolanaWallet(w);
      setSolSession(s);
      setSession(null);
      toast.success(`Connected ${w.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Solana connect failed");
    } finally {
      setBusy(null);
    }
  }

  async function onPay() {
    setBusy("pay");
    setTxHash(null);
    try {
      if (isSolana) {
        if (!solSession) {
          toast.error("Connect a Solana wallet first");
          setBusy(null);
          return;
        }
        if (safeAsset !== "USDC" && safeAsset !== "USDT") {
          toast.error("Pick USDC or USDT for exact face on Solana");
          setBusy(null);
          return;
        }
        const sig = await sendSolanaPayment({
          session: solSession,
          asset: safeAsset as SolanaAssetSymbol,
          amountUsd,
        });
        setTxHash(sig);
        toast.success("Solana transaction submitted");
      } else {
        if (!session) {
          toast.error("Connect a wallet first");
          setBusy(null);
          return;
        }
        const a = getAsset(networkId, safeAsset);
        if (!a.contract) {
          toast.error(
            "Pick USDC or USDT for exact face amount. Native gas tokens need a manual send.",
          );
          setBusy(null);
          return;
        }
        const hash = await sendPayment({
          session,
          networkId,
          tokenContract: a.contract,
          decimals: a.decimals,
          amount: amountUsd,
        });
        setTxHash(hash);
        toast.success("Transaction submitted");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(null);
    }
  }

  async function onDisconnect() {
    if (solSession) await disconnectSolana(solSession);
    if (session) await disconnectWallet(session);
    setSession(null);
    setSolSession(null);
    setTxHash(null);
  }

  const connected = isSolana ? solSession : session;
  const payToDisplay =
    crypto.payTo || (isSolana ? TREASURY_SOL || "Set VITE_TREASURY_SOL" : TREASURY_EVM);

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">Buyer checkout</Badge>
          <Badge variant="default">EVM + Solana</Badge>
          <Badge variant="success">
            WalletConnect v{WALLETCONNECT_VERSION}
          </Badge>
          <Badge variant="success">Phantom / Solflare</Badge>
          <Badge variant="success">Stripe live</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose how to pay
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Skill{" "}
          <span className="font-mono text-fg">{skill}</span>
          {merchSku ? (
            <>
              {" "}
              · merch SKU <span className="font-mono text-fg">{merchSku}</span>
            </>
          ) : null}{" "}
          · face <span className="text-fg">{formatFaceUsd(amountUsd)}</span>.{" "}
          Ethereum + L2s via MetaMask / WalletConnect, or{" "}
          <strong className="text-fg">Solana mainnet</strong> via Phantom /
          Solflare / Backpack. Card via Stripe anytime.
        </p>
        {canceled ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            Stripe checkout canceled — pick another rail or try card again.
          </p>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMethod("crypto")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            method === "crypto"
              ? "border-fg/40 bg-surface-2"
              : "border-border bg-surface hover:bg-surface-2/60",
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            <Wallet className="size-4" />
            Crypto · any wallet
          </div>
          <p className="mt-1 text-xs text-muted">
            Ethereum · Base · Solana · Arbitrum · Optimism · Polygon
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMethod("stripe")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            method === "stripe"
              ? "border-fg/40 bg-surface-2"
              : "border-border bg-surface hover:bg-surface-2/60",
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            <CreditCard className="size-4" />
            Card (Stripe)
          </div>
          <p className="mt-1 text-xs text-muted">
            Visa / Mastercard / Apple Pay / Google Pay · no gas
          </p>
        </button>
      </div>

      {method === "crypto" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-4" />
                Connect {isSolana ? "Solana" : "EVM"} wallet
              </CardTitle>
              <CardDescription>
                {isSolana
                  ? "Phantom, Solflare, Backpack, Glow — Solana mainnet only"
                  : "Injected EVM wallets + WalletConnect v2 QR / mobile"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connected ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {isSolana && solSession
                        ? `${solSession.walletName} · ${shortSolAddr(solSession.account)}`
                        : session
                          ? `${session.walletName} · ${shortAddr(session.account)}`
                          : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {isSolana
                        ? "Solana mainnet-beta"
                        : session
                          ? `Chain ${session.chainId} · via ${session.via}`
                          : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => void onDisconnect()}>
                    Disconnect
                  </Button>
                </div>
              ) : isSolana ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {solWallets.length === 0 ? (
                      <p className="text-sm text-muted sm:col-span-2">
                        No Solana wallet detected. Install Phantom or Solflare,
                        or open this page inside the wallet app.
                      </p>
                    ) : (
                      solWallets.map((w) => (
                        <Button
                          key={w.id}
                          variant="secondary"
                          className="h-auto justify-start py-3"
                          disabled={busy !== null}
                          onClick={() => void onConnectSolana(w)}
                        >
                          {busy === `sol-${w.id}` ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Wallet className="size-4" />
                          )}
                          {w.name}
                        </Button>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-xs font-medium text-muted">
                      <Smartphone className="size-3.5" />
                      Open checkout in a Solana mobile wallet
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {solanaMobileLinks().map((m) => (
                        <Button
                          key={m.id}
                          size="sm"
                          variant="ghost"
                          className="border border-border"
                          onClick={() => m.open(checkoutPageUrl())}
                        >
                          {m.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {!solanaTreasuryReady() ? (
                    <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                      Solana payTo not set yet — set{" "}
                      <span className="font-mono">VITE_TREASURY_SOL</span>{" "}
                      (your base58 treasury) to enable one-click SPL pay.
                      Connect still works for testing.
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {wallets.length === 0 ? (
                      <p className="text-sm text-muted sm:col-span-2">
                        No browser wallet detected. Use WalletConnect or open
                        this page inside your wallet app.
                      </p>
                    ) : (
                      wallets.map((w) => (
                        <Button
                          key={w.id}
                          variant="secondary"
                          className="h-auto justify-start py-3"
                          disabled={busy !== null}
                          onClick={() => void onConnectInjected(w)}
                        >
                          {busy === `connect-${w.id}` ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Wallet className="size-4" />
                          )}
                          {w.name}
                        </Button>
                      ))
                    )}
                    <Button
                      className="h-auto w-full justify-start whitespace-normal py-3 text-left sm:col-span-2"
                      disabled={busy !== null || !isWalletConnectConfigured()}
                      onClick={() => void onWalletConnect()}
                    >
                      {busy === "wc" ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                      ) : (
                        <QrCode className="size-4 shrink-0" />
                      )}
                      <span className="min-w-0">
                        WalletConnect v2 — any EVM wallet (QR / deep link)
                      </span>
                    </Button>
                    <p className="text-xs text-subtle sm:col-span-2">
                      {isWalletConnectConfigured() ? (
                        <>
                          {walletConnectStatusLabel()} ·{" "}
                          {WALLETCONNECT_SETUP.cloudUrl.replace("https://", "")}
                        </>
                      ) : (
                        <>Missing {WALLETCONNECT_SETUP.envKey}</>
                      )}
                    </p>
                  </div>
                  {(mobile || true) && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-xs font-medium text-muted">
                        <Smartphone className="size-3.5" />
                        Open this checkout inside a mobile EVM wallet
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {mobileWalletLinks().map((m) => (
                          <Button
                            key={m.id}
                            size="sm"
                            variant="ghost"
                            className="border border-border"
                            onClick={() => m.open(checkoutPageUrl())}
                          >
                            {m.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>1. Network</CardTitle>
                <CardDescription>
                  EVM mainnets + Solana · no testnets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {networks.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setNetworkId(n.id);
                      const pref =
                        n.assets.find((a) => a.preferred)?.symbol ??
                        n.assets[0].symbol;
                      setAsset(pref);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm",
                      networkId === n.id
                        ? "border-fg/40 bg-surface-2"
                        : "border-border hover:bg-surface-2/50",
                    )}
                  >
                    <span className="font-medium">
                      {n.name}
                      {n.id === "ethereum" ? " · mainnet" : ""}
                      {n.id === "solana" ? " · SPL" : ""}
                    </span>
                    <span className="font-mono text-xs text-subtle">
                      {n.family === "solana" ? "SOL" : n.chainId}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>2. Asset on {network.name}</CardTitle>
                <CardDescription>
                  Preferred: USDC (exact face). Fees in {network.nativeSymbol}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {assets.map((a) => (
                    <button
                      key={a.symbol}
                      type="button"
                      onClick={() => setAsset(a.symbol)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm",
                        safeAsset === a.symbol
                          ? "border-fg/40 bg-surface-2 font-medium"
                          : "border-border text-muted hover:bg-surface-2/50",
                      )}
                    >
                      {a.symbol}
                      {a.preferred ? " · recommended" : ""}
                      {a.isGas ? " · gas token" : ""}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 overflow-hidden rounded-xl border border-border bg-surface-2/40 p-4 text-sm">
                  <Row label="Send" value={crypto.amountLabel} mono={false} />
                  <Row
                    label="Network"
                    value={
                      isSolana
                        ? "Solana mainnet-beta"
                        : `${crypto.networkName} (chain ${crypto.chainId})`
                    }
                  />
                  <Row
                    label="payTo"
                    value={payToDisplay}
                    mono
                    copy
                    onCopy={() => copy(payToDisplay, "payTo")}
                    copied={copied === "payTo"}
                  />
                  {crypto.contract ? (
                    <Row
                      label={isSolana ? "Mint" : "Token contract"}
                      value={crypto.contract}
                      mono
                      copy
                      onCopy={() => copy(crypto.contract!, "contract")}
                      copied={copied === "contract"}
                    />
                  ) : (
                    <Row label="Token" value={`Native ${safeAsset}`} />
                  )}
                  <p className="text-xs text-muted">{crypto.note}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!connected || busy !== null}
                    onClick={() => void onPay()}
                  >
                    {busy === "pay" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {connected
                      ? `Pay ${crypto.amountLabel} from wallet`
                      : "Connect wallet to pay"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      copy(
                        JSON.stringify(
                          {
                            skill,
                            ...crypto,
                            payTo: payToDisplay,
                          },
                          null,
                          2,
                        ),
                        "json",
                      )
                    }
                  >
                    <Copy className="size-3.5" />
                    {copied === "json" ? "Copied" : "Copy instructions"}
                  </Button>
                  <Button asChild variant="ghost">
                    <a
                      href={`${network.explorerAddress}${payToDisplay}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Treasury on explorer
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>

                {txHash ? (
                  <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
                    <p className="font-medium text-fg">Submitted</p>
                    <a
                      href={`${network.explorerTx}${txHash}`}
                      className="break-all font-mono text-xs text-info hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {txHash}
                    </a>
                    <p className="mt-2 text-xs text-muted">
                      After confirm, check{" "}
                      <a
                        href={CANARY.proofUrl}
                        className="text-info hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        /api/proof
                      </a>
                      .
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4" />
              Pay with card
            </CardTitle>
            <CardDescription>
              Stripe Checkout · lvl X, Inc. · works on mobile browsers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                <p className="text-xs text-subtle">Card canary</p>
                <p className="text-2xl font-semibold">$0.50</p>
                <Button asChild className="mt-3 w-full">
                  <a
                    href={STRIPE_LINKS.canary50c.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Pay $0.50 with card
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                <p className="text-xs text-subtle">Starter unlock</p>
                <p className="text-2xl font-semibold">$0.99</p>
                <Button asChild variant="secondary" className="mt-3 w-full">
                  <a
                    href={STRIPE_LINKS.unlock99c.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Pay $0.99 with card
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted">{stripe.note}</p>
            <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-xs text-muted">
              <Shield className="mt-0.5 size-4 shrink-0 text-success" />
              Card path works without crypto wallets on any device.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <Check className="size-4 text-success" />
            EVM + Solana · WalletConnect v2 · Phantom / Solflare
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/canary">Canary guide</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a
                href="https://lvlltd.com/hub/marketplace/?buy=agent-x402-first-buy"
                target="_blank"
                rel="noreferrer"
              >
                Live marketplace
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  copy: canCopy,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copy?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-subtle">{label}</span>
      <div className="flex min-w-0 max-w-[70%] items-center gap-2">
        <span
          className={
            mono
              ? "break-all font-mono text-xs text-fg"
              : "text-right text-sm text-fg"
          }
          title={value}
        >
          {value}
        </span>
        {canCopy && onCopy ? (
          <Button size="sm" variant="ghost" onClick={onCopy}>
            <Copy className="size-3" />
            {copied ? "OK" : ""}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
