import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Heart,
  Layers,
  LayoutDashboard,
  Search,
  ShoppingBag,
  Timer,
  User,
} from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand/visual-hero";
import { CartDrawer } from "@/components/store/cart-drawer";
import { WishlistHydrate } from "@/components/store/wishlist-hydrate";
import { ShopSearch } from "@/components/store/shop-search";
import { useLoyaltyStore } from "@/lib/edge/loyalty";
import { useCartStore } from "@/lib/store/cart";
import { STORE_COLLECTIONS } from "@/lib/store/collections";
import { useWishlistStore } from "@/lib/store/wishlist";
import { cn } from "@/lib/utils";

const TOP_NAV = [
  { to: "/shop" as const, label: "Shop", end: true },
  {
    to: "/shop/collections/$handle" as const,
    params: { handle: "tees" },
    label: "Tees",
  },
  {
    to: "/shop/collections/$handle" as const,
    params: { handle: "art" },
    label: "Art",
  },
  {
    to: "/shop/collections/$handle" as const,
    params: { handle: "agent" },
    label: "Agents",
  },
  { to: "/drops" as const, label: "Drops", end: true },
  { to: "/bundles" as const, label: "Stacks", end: true },
];

export function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openDrawer = useCartStore((s) => s.openDrawer);
  const count = useCartStore((s) => s.count());
  const wishCount = useWishlistStore((s) => s.count());
  const wishHydrated = useWishlistStore((s) => s.hydrated);
  const credits = useLoyaltyStore((s) => s.balance);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="border-b border-border bg-surface-2 px-4 py-2 text-center text-xs text-muted">
        LVL marketplace · drops · stacks · multi-rail + Printify ·{" "}
        <span className="text-fg">shop.lvlltd.com</span>
        {" · "}
        <Link
          to="/marketplace"
          className="text-fg underline-offset-2 hover:underline"
        >
          hub
        </Link>
        {credits > 0 ? (
          <>
            {" · "}
            <Link to="/account" className="tabular text-fg">
              {credits} cr
            </Link>
          </>
        ) : null}
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/shop" className="flex min-w-0 items-center gap-2.5">
            <BrandMark size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">LVL Store</p>
              <p className="truncate text-[11px] text-subtle">
                lvlltd.com · marketplace
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {TOP_NAV.map((item) => {
              const href =
                "params" in item && item.params
                  ? `/shop/collections/${item.params.handle}`
                  : item.to;
              const active =
                item.to === "/shop"
                  ? pathname === "/shop" || pathname === "/shop/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`) ||
                    ("params" in item && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  to={item.to}
                  params={"params" in item ? item.params : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-fg md:hidden"
              onClick={() => setShowSearch((v) => !v)}
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>
            <div className="hidden w-44 lg:block xl:w-56">
              <ShopSearch compact />
            </div>
            <Link
              to="/drops"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-surface hover:text-fg sm:flex xl:hidden"
            >
              <Timer className="size-3.5" />
              Drops
            </Link>
            <Link
              to="/agent/merch"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-surface hover:text-fg sm:flex"
            >
              <Bot className="size-3.5" />
              Agents
            </Link>
            <Link
              to="/account"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-surface hover:text-fg sm:flex"
              aria-label="Account"
            >
              <User className="size-3.5" />
              Account
            </Link>
            <Link
              to="/shop/wishlist"
              className="relative flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-fg"
              aria-label={`Wishlist, ${wishCount} items`}
            >
              <Heart className="size-4" />
              {wishHydrated && wishCount > 0 ? (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-fg text-[10px] font-medium text-bg tabular">
                  {wishCount > 9 ? "9+" : wishCount}
                </span>
              ) : null}
            </Link>
            <Link
              to="/checkout"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-surface hover:text-fg lg:flex"
            >
              Checkout
            </Link>
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-surface hover:text-fg xl:flex"
              title="Operator factory"
            >
              <LayoutDashboard className="size-3.5" />
              Factory
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              className="relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm hover:bg-surface-2"
              aria-label={`Cart, ${count} items`}
            >
              <ShoppingBag className="size-4" />
              <span className="tabular text-xs font-medium">{count}</span>
            </button>
          </div>
        </div>

        {showSearch ? (
          <div className="border-t border-border px-4 py-2 md:hidden">
            <ShopSearch />
          </div>
        ) : null}

        <div className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 md:hidden">
          <Link
            to="/drops"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs",
              pathname.startsWith("/drops")
                ? "bg-surface-2 text-fg"
                : "text-muted hover:bg-surface",
            )}
          >
            <Timer className="size-3" />
            Drops
          </Link>
          <Link
            to="/bundles"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs",
              pathname.startsWith("/bundles")
                ? "bg-surface-2 text-fg"
                : "text-muted hover:bg-surface",
            )}
          >
            <Layers className="size-3" />
            Stacks
          </Link>
          {STORE_COLLECTIONS.filter((c) => c.handle !== "all").map((c) => {
            const href = `/shop/collections/${c.handle}`;
            const active = pathname === href;
            return (
              <Link
                key={c.handle}
                to="/shop/collections/$handle"
                params={{ handle: c.handle }}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs",
                  active
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:bg-surface",
                )}
              >
                {c.title}
              </Link>
            );
          })}
        </div>
      </header>

      <WishlistHydrate />
      <CartDrawer />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="relative overflow-hidden">
          <img
            src="/brand/hero-network.jpg"
            alt=""
            className="absolute inset-0 size-full object-cover opacity-20"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-bg/85" />
          <div className="relative z-[1] mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BrandMark size="sm" />
                <p className="text-sm font-semibold">LVL Store</p>
              </div>
              <p className="text-xs text-muted">
                Marketplace merch & art · live drops · stack packs · Imagine
                studio · multi-rail agent pay on lvlltd.com.
              </p>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <p className="font-medium text-fg">Shop</p>
              <ul className="space-y-1">
                <li>
                  <Link to="/drops">Live drops</Link>
                </li>
                <li>
                  <Link to="/bundles">Stack packs</Link>
                </li>
                <li>
                  <Link to="/checkout">Checkout</Link>
                </li>
                <li>
                  <Link to="/account">Account & loyalty</Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <p className="font-medium text-fg">Network</p>
              <ul className="space-y-1">
                <li>Store · shop.lvlltd.com</li>
                <li>Drops · drops.lvlltd.com</li>
                <li>Pulse · pulse.lvlltd.com</li>
                <li>Relay · relay.lvlltd.com</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-[11px] text-subtle">
          © {new Date().getFullYear()} LVL X, Inc. · lvlltd.com marketplace
        </div>
      </footer>
    </div>
  );
}
