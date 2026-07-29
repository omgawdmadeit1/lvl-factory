import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  LayoutDashboard,
  ShoppingBag,
  Store,
} from "lucide-react";
import { CartDrawer } from "@/components/store/cart-drawer";
import { useCartStore } from "@/lib/store/cart";
import { STORE_COLLECTIONS } from "@/lib/store/collections";
import { cn } from "@/lib/utils";

const TOP_NAV = [
  { to: "/shop", label: "Shop", end: true },
  { to: "/shop/collections/$handle", params: { handle: "tees" }, label: "Tees" },
  { to: "/shop/collections/$handle", params: { handle: "art" }, label: "Art" },
  {
    to: "/shop/collections/$handle",
    params: { handle: "agent" },
    label: "Agents",
  },
] as const;

export function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openDrawer = useCartStore((s) => s.openDrawer);
  const count = useCartStore((s) => s.count());

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      {/* Announcement */}
      <div className="border-b border-border bg-surface-2 px-4 py-2 text-center text-xs text-muted">
        LVL Ltd · Printify POD · Multi-rail agent checkout on{" "}
        <span className="text-fg">factory.lvlltd.com</span>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/shop" className="flex min-w-0 items-center gap-2">
            <Store className="size-5 shrink-0 text-fg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">LVL Store</p>
              <p className="truncate text-[11px] text-subtle">
                lvlltd.com · factory
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
                  ? pathname === "/shop"
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

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/agent/merch"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-surface hover:text-fg sm:flex"
            >
              <Bot className="size-3.5" />
              Agent JSON
            </Link>
            <Link
              to="/network"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-surface hover:text-fg lg:flex"
            >
              Network
            </Link>
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-surface hover:text-fg sm:flex"
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

        {/* Mobile collections strip */}
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

      <main className="mx-auto min-h-[60dvh] max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-tight">LVL Ltd</p>
            <p className="mt-2 text-sm text-muted">
              Merch and art for humans and agents. Fulfillment by Printify.
              Settlement multi-rail on factory.lvlltd.com.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">
              Shop
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>
                <Link to="/shop" className="hover:text-fg">
                  All products
                </Link>
              </li>
              <li>
                <Link
                  to="/shop/collections/$handle"
                  params={{ handle: "tees" }}
                  className="hover:text-fg"
                >
                  Tees
                </Link>
              </li>
              <li>
                <Link
                  to="/shop/collections/$handle"
                  params={{ handle: "art" }}
                  className="hover:text-fg"
                >
                  Art
                </Link>
              </li>
              <li>
                <Link to="/shop/cart" className="hover:text-fg">
                  Cart
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">
              Domain map
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>Store · factory.lvlltd.com/shop</li>
              <li>Agents · /agent/merch</li>
              <li>Pay · /pay multi-rail</li>
              <li>Printify · lvlxltd.printify.me</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border px-4 py-4 text-center text-xs text-subtle">
          © {new Date().getFullYear()} LVL X, Inc. · lvlltd.com
        </div>
      </footer>

      <CartDrawer />
    </div>
  );
}
