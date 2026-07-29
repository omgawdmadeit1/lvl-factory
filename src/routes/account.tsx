import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Package, ShoppingBag, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { useOrdersStore } from "@/lib/marketplace/orders";
import { MARKETPLACE_URLS } from "@/lib/marketplace/hosts";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — LVL Marketplace | account.lvlltd.com" },
      {
        name: "description",
        content: "LVL buyer account: cart, wishlist, orders, multi-rail pay.",
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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">account.lvlltd.com</Badge>
          <Badge variant="default">buyer</Badge>
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <User className="size-6" />
          Your account
        </h1>
        <p className="max-w-xl text-sm text-muted">
          Session-local store state (cart, wishlist, orders). Auth sessions plug
          in via Better Auth when enabled — same marketplace tools either way.
        </p>
      </header>

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
          <CardTitle className="text-base">Quick links</CardTitle>
          <CardDescription>
            Same surfaces available on factory paths and dedicated subdomains.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to="/shop">Shop</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link
              to="/pay"
              search={{ skill: "account", amount: 0.05, canceled: false }}
            >
              Pay
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/agent/merch">Agent shop</Link>
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
