import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  ExternalLink,
  Gift,
  Lock,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  creditsForSpend,
  useLoyaltyStore,
} from "@/lib/edge/loyalty";
import {
  formatHoldCountdown,
  useHoldsStore,
} from "@/lib/edge/holds";
import { usePulseStore } from "@/lib/edge/pulse";
import { useCartStore } from "@/lib/store/cart";
import { useOrdersStore } from "@/lib/marketplace/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — LVL Marketplace | checkout.lvlltd.com" },
      {
        name: "description",
        content:
          "Unified LVL checkout: gift mode, loyalty credits, Printify POD or multi-rail pay.",
      },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const clear = useCartStore((s) => s.clear);
  const placeFromCart = useOrdersStore((s) => s.placeFromCart);
  const balance = useLoyaltyStore((s) => s.balance);
  const earn = useLoyaltyStore((s) => s.earn);
  const redeem = useLoyaltyStore((s) => s.redeem);
  const push = usePulseStore((s) => s.push);
  const createHold = useHoldsStore((s) => s.createHold);
  const clearHold = useHoldsStore((s) => s.clear);
  const remainingMs = useHoldsStore((s) => s.remainingMs);
  const activeHold = useHoldsStore((s) => s.active());

  const [giftMode, setGiftMode] = useState(false);
  const [giftTo, setGiftTo] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [redeemCredits, setRedeemCredits] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const agentLines = lines.filter((l) => l.agentShopable);
  const printifyLines = lines.filter((l) => l.printifyUrl);
  const firstPrintify = printifyLines[0]?.printifyUrl;

  const holdLeft = remainingMs(Date.now());
  const lockedSubtotal =
    activeHold && holdLeft > 0 ? activeHold.subtotalUsd : subtotal;
  const creditCap = Math.min(balance, Math.floor(lockedSubtotal * 100));
  const redeemAmt = Math.min(redeemCredits, creditCap);
  const creditUsd = redeemAmt / 100;
  const due = Math.max(0.05, Number((lockedSubtotal - creditUsd).toFixed(2)));
  const earnPreview = creditsForSpend(due);

  void tick; // re-render countdown

  function place(rail: "printify" | "crypto" | "card" | "agent") {
    if (lines.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (redeemAmt > 0) {
      const ok = redeem(redeemAmt, `Checkout redeem · ${rail}`);
      if (!ok) {
        toast.error("Could not redeem credits");
        return;
      }
    }

    const amount = due;
    const sku = lines[0]?.sku;
    const payPath =
      rail === "printify"
        ? undefined
        : `/pay?sku=${encodeURIComponent(sku || "cart")}&amount=${amount}`;

    const giftBits =
      giftMode && giftTo.trim()
        ? ` · gift→${giftTo.trim()}${giftNote ? ` “${giftNote.slice(0, 80)}”` : ""}`
        : "";

    const order = placeFromCart({
      lines,
      rail,
      payPath,
      printifyUrl: firstPrintify,
      note: `${lines.length} line(s) via ${rail}${giftBits} · credits −${redeemAmt}`,
    });

    const earned = creditsForSpend(amount);
    if (earned > 0) {
      earn(earned, `Order ${order.id.slice(0, 12)} · ${rail}`);
    }

    push({
      kind: "purchase",
      host: "checkout.lvlltd.com",
      message: giftMode
        ? `Gift checkout · ${giftTo || "someone"} · $${amount.toFixed(2)}`
        : `Checkout settled intent · $${amount.toFixed(2)} via ${rail}`,
      meta: order.id,
    });

    clearHold();

    if (rail === "printify" && firstPrintify) {
      clear();
      toast.success(
        earned
          ? `Order started · +${earned} credits · opening Printify`
          : "Order started — opening Printify",
      );
      window.open(firstPrintify, "_blank", "noopener,noreferrer");
      void navigate({ to: "/orders/$id", params: { id: order.id } });
      return;
    }

    clear();
    toast.success(
      earned
        ? `Order created · +${earned} credits · continue payment`
        : "Order created — continue payment",
    );
    void navigate({
      to: "/pay",
      search: {
        skill: sku || "cart",
        amount,
        canceled: false,
      },
    });
  }

  function lockPrice() {
    if (!lines.length) {
      toast.error("Cart is empty");
      return;
    }
    const hold = createHold({
      subtotalUsd: subtotal,
      lineKeys: lines.map((l) => l.key),
      note: "Checkout price lock 15m",
    });
    if (hold) {
      toast.success("Price locked for 15 minutes");
      push({
        kind: "settle",
        host: "checkout.lvlltd.com",
        message: `Price hold $${hold.subtotalUsd.toFixed(2)} · 15m`,
        meta: hold.id,
      });
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">checkout.lvlltd.com</Badge>
          <Badge variant="default">unified</Badge>
          {giftMode ? <Badge variant="warning">gift</Badge> : null}
          {activeHold && holdLeft > 0 ? (
            <Badge variant="success">
              hold {formatHoldCountdown(holdLeft)}
            </Badge>
          ) : null}
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShoppingBag className="size-6" />
          Checkout
        </h1>
        <p className="max-w-xl text-sm text-muted">
          Review cart, lock price, redeem credits, gift a stack — then Printify
          POD or multi-rail pay.
        </p>
      </header>

      {lines.length === 0 ? (
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Cart is empty</CardTitle>
            <CardDescription>
              Add products from the LVL Store, drops, or stacks first.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/shop">Browse store</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/drops">Live drops</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/bundles">Stack packs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="text-base">Cart</CardTitle>
              <CardDescription>
                {lines.length} line{lines.length === 1 ? "" : "s"} · face $
                {subtotal.toFixed(2)} USD
                {activeHold && holdLeft > 0
                  ? ` · locked $${lockedSubtotal.toFixed(2)}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {lines.map((l) => (
                <div
                  key={l.key}
                  className="flex justify-between gap-2 border-b border-border/50 py-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium">{l.title}</p>
                    <p className="text-xs text-muted">
                      {l.size} × {l.qty}
                      {l.agentShopable ? " · agent" : ""}
                    </p>
                  </div>
                  <p className="tabular">${(l.priceUsd * l.qty).toFixed(2)}</p>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={lockPrice}
                  disabled={!!(activeHold && holdLeft > 0)}
                >
                  <Lock className="size-3.5" />
                  {activeHold && holdLeft > 0
                    ? `Locked ${formatHoldCountdown(holdLeft)}`
                    : "Lock price 15m"}
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/shop/cart">Edit cart</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gift className="size-4" />
                  Gift mode
                </CardTitle>
                <CardDescription>
                  Tag the order for someone else — note rides on the ledger.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  type="button"
                  onClick={() => setGiftMode((v) => !v)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                    giftMode
                      ? "border-border-strong bg-surface-2"
                      : "border-border hover:bg-surface-2",
                  )}
                >
                  <span>Send as gift</span>
                  <span className="text-xs text-muted">
                    {giftMode ? "On" : "Off"}
                  </span>
                </button>
                {giftMode ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="gift-to">Recipient</Label>
                      <Input
                        id="gift-to"
                        value={giftTo}
                        onChange={(e) => setGiftTo(e.target.value)}
                        placeholder="Name or @handle"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gift-note">Note</Label>
                      <Input
                        id="gift-note"
                        value={giftNote}
                        onChange={(e) => setGiftNote(e.target.value)}
                        placeholder="Stay orbit-side"
                      />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4" />
                  Loyalty credits
                </CardTitle>
                <CardDescription>
                  Balance {balance} · max redeem {creditCap} on this cart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={creditCap}
                    value={redeemCredits}
                    onChange={(e) =>
                      setRedeemCredits(
                        Math.max(
                          0,
                          Math.min(creditCap, Number(e.target.value) || 0),
                        ),
                      )
                    }
                    className="h-10"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setRedeemCredits(creditCap)}
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted">
                  −${creditUsd.toFixed(2)} · due{" "}
                  <span className="font-medium text-fg tabular">
                    ${due.toFixed(2)}
                  </span>{" "}
                  · earn ~{earnPreview} on settle
                </p>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/account">Manage loyalty</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ExternalLink className="size-4" />
                  Printify POD
                </CardTitle>
                <CardDescription>
                  Physical fulfillment ·{" "}
                  {printifyLines.length
                    ? `${printifyLines.length} line(s) with Printify URL`
                    : "no Printify URL on cart lines"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  disabled={!firstPrintify}
                  onClick={() => place("printify")}
                  className="w-full sm:w-auto"
                >
                  Checkout on Printify · ${due.toFixed(2)}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4" />
                  Multi-rail pay
                </CardTitle>
                <CardDescription>
                  Crypto + card on pay.lvlltd.com ·{" "}
                  {agentLines.length} agent-shopable line
                  {agentLines.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => place("crypto")}>
                  <CreditCard className="size-4" />
                  Pay ${due.toFixed(2)}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
