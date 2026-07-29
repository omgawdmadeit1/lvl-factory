import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Gift,
  Heart,
  Package,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import { useState } from "react";
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
import {
  REFERRAL_CODES,
  TIER_THRESHOLDS,
  useLoyaltyStore,
} from "@/lib/edge/loyalty";
import { usePulseStore } from "@/lib/edge/pulse";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { useOrdersStore } from "@/lib/marketplace/orders";
import { MARKETPLACE_URLS } from "@/lib/marketplace/hosts";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — LVL Marketplace | account.lvlltd.com" },
      {
        name: "description",
        content:
          "LVL buyer account: loyalty credits, referrals, cart, wishlist, orders.",
      },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const cartCount = useCartStore((s) => s.count());
  const subtotal = useCartStore((s) => s.subtotal());
  const wishCount = useWishlistStore((s) => s.count());
  const orders = useOrdersStore((s) => s.orders);
  const balance = useLoyaltyStore((s) => s.balance);
  const lifetime = useLoyaltyStore((s) => s.lifetime);
  const referralCode = useLoyaltyStore((s) => s.referralCode);
  const events = useLoyaltyStore((s) => s.events);
  const applyReferral = useLoyaltyStore((s) => s.applyReferral);
  const tier = useLoyaltyStore((s) => s.tier());
  const push = usePulseStore((s) => s.push);
  const [code, setCode] = useState("");

  const nextTier = [...TIER_THRESHOLDS].find((t) => t.min > lifetime);
  const progress = nextTier
    ? Math.min(100, Math.round((lifetime / nextTier.min) * 100))
    : 100;

  function onReferral() {
    const res = applyReferral(code);
    if (res.ok) {
      toast.success(res.message);
      push({
        kind: "referral",
        host: "account.lvlltd.com",
        message: res.message,
        meta: code.trim().toUpperCase(),
      });
      setCode("");
    } else {
      toast.error(res.message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">account.lvlltd.com</Badge>
          <Badge variant="default">buyer</Badge>
          <Badge variant="success">{tier.label}</Badge>
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <User className="size-6" />
          Your account
        </h1>
        <p className="max-w-xl text-sm text-muted">
          Session-local loyalty, cart, wishlist, and orders. Earn credits on
          drops, stacks, and checkout — redeem at checkout.
        </p>
      </header>

      <Card className="overflow-hidden border-border bg-surface shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            LVL Credits · {tier.label}
          </CardTitle>
          <CardDescription>
            1 credit per $1 spent face · tiers unlock bragging rights on pulse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted">Balance</p>
              <p className="text-3xl font-semibold tabular tracking-tight">
                {balance}
              </p>
              <p className="text-xs text-subtle">
                Lifetime {lifetime} · 1 credit ≈ $0.01 off at checkout
              </p>
            </div>
            <div className="min-w-[12rem] flex-1">
              <div className="mb-1 flex justify-between text-[11px] text-muted">
                <span>{tier.label}</span>
                <span>
                  {nextTier
                    ? `${nextTier.min - lifetime} to ${nextTier.label}`
                    : "Apex"}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
              <p className="text-xs font-medium text-fg">Apply referral</p>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="LVLWAVE"
                  disabled={!!referralCode}
                  className="h-10"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!!referralCode || !code.trim()}
                  onClick={onReferral}
                >
                  Apply
                </Button>
              </div>
              {referralCode ? (
                <p className="text-xs text-success">Code {referralCode} applied</p>
              ) : (
                <p className="text-xs text-muted">
                  Try{" "}
                  {Object.keys(REFERRAL_CODES)
                    .slice(0, 3)
                    .join(" · ")}
                </p>
              )}
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-fg">
                <Gift className="size-3.5" />
                Share your vibe
              </p>
              <p className="text-xs text-muted">
                Friends redeem LVLWAVE / AGENTX / BOSTON / SOFTERA for starter
                credits on their device.
              </p>
              <Button asChild size="sm" variant="secondary">
                <Link to="/checkout">Redeem at checkout</Link>
              </Button>
            </div>
          </div>

          {events.length ? (
            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted">Recent ledger</p>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                {events.slice(0, 8).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex justify-between gap-2 text-muted"
                  >
                    <span className="truncate">{ev.note}</span>
                    <span
                      className={cn(
                        "shrink-0 tabular",
                        ev.amount > 0 ? "text-success" : "text-fg",
                      )}
                    >
                      {ev.amount > 0 ? "+" : ""}
                      {ev.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShoppingBag className="size-4" />
              Cart
            </CardTitle>
            <CardDescription>
              {cartCount} item{cartCount === 1 ? "" : "s"} · $
              {subtotal.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="secondary">
              <Link to="/checkout">Checkout</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Heart className="size-4" />
              Wishlist
            </CardTitle>
            <CardDescription>
              {wishCount} saved · syncs on shop
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="secondary">
              <Link to="/shop/wishlist">Open wishlist</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="size-4" />
              Orders
            </CardTitle>
            <CardDescription>{orders.length} on this device</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="secondary">
              <Link to="/orders">Order history</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base">Edge shortcuts</CardTitle>
          <CardDescription>
            Drops, stacks, pulse, studio — same app, dedicated hosts when DNS is
            live.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to="/drops">Drops</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/bundles">Stacks</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/radar">Radar</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/pulse">Pulse</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/studio">Studio</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/relay">Relay</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <a href={MARKETPLACE_URLS.printify} rel="noreferrer" target="_blank">
              Printify POD
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
