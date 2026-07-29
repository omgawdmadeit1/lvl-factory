import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Heart,
  LayoutDashboard,
  Search,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import { useState } from "react";
import { CartDrawer } from "@/components/store/cart-drawer";
import { WishlistHydrate } from "@/components/store/wishlist-hydrate";
import { ShopSearch } from "@/components/store/shop-search";
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
];

export function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openDrawer = useCartStore((s) => s.openDrawer);
  const count = useCartStore((s) => s.count());
  const wishCount = useWishlistStore((s) => s.count());
  const wishHydrated = useWishlistStore((s) => s.hydrated);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="border-b border-border bg-surface-2 px-4 py-2 text-center text-xs text-muted">
        LVL marketplace · multi-rail + Printify POD ·{" "}
        <span className="text-fg">shop.lvlltd.com</span>
        {" · "}
        <Link to="/marketplace" className="text-fg underline-offset-2 hover:underline">
          hub
        </Link>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/shop" className="flex min-w-0 items-center gap-2">
            <Store className="size-5 shrink-0 text-fg" />
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
                  : pathname.startsWith(href);
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
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold">LVL Store</p>
            <p className="text-xs text-muted">
              Marketplace merch & art · Printify POD · multi-rail agent pay on
              the lvlltd.com network.
            </p>
          </div>
          <div className="space-y-2 text-xs text-muted">
            <p className="font-medium text-fg">Shop</p>
            <ul className="space-y-1">
              <li>
                <Link to="/shop/collections/$handle" params={{ handle: "tees" }}>
                  Tees
                </Link>
              </li>
              <li>
                <Link to="/shop/collections/$handle" params={{ handle: "art" }}>
                  Art
                </Link>
              </li>
              <li>
                <Link to="/checkout">Checkout</Link>
              </li>
              <li>
                <Link to="/account">Account</Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2 text-xs text-muted">
            <p className="font-medium text-fg">Network</p>
            <ul className="space-y-1">
              <li>Store · shop.lvlltd.com</li>
              <li>Pay · pay.lvlltd.com</li>
              <li>Hub · lvlltd.com/marketplace</li>
              <li>POD · lvlxltd.printify.me</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-[11px] text-subtle">
          © {new Date().getFullYear()} LVL X, Inc. · lvlltd.com marketplace
        </div>
      </footer>
    </div>
  );
}
