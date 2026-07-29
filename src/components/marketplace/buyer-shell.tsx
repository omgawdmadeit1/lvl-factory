import { Link, useRouterState } from "@tanstack/react-router";
import {
  CreditCard,
  LayoutGrid,
  Package,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/marketplace" as const, label: "Hub", icon: LayoutGrid },
  { to: "/shop" as const, label: "Shop", icon: Store },
  { to: "/checkout" as const, label: "Checkout", icon: ShoppingBag },
  { to: "/pay" as const, label: "Pay", icon: CreditCard },
  { to: "/orders" as const, label: "Orders", icon: Package },
  { to: "/account" as const, label: "Account", icon: User },
];

export function BuyerShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useCartStore((s) => s.count());

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="border-b border-border bg-surface-2 px-4 py-2 text-center text-xs text-muted">
        LVL marketplace · multi-rail + Printify POD ·{" "}
        <span className="text-fg">lvlltd.com</span>
      </div>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/marketplace" className="flex items-center gap-2">
            <LayoutGrid className="size-5" />
            <div>
              <p className="text-sm font-semibold tracking-tight">LVL Market</p>
              <p className="text-[11px] text-subtle">lvlltd.com network</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.to === "/marketplace"
                  ? pathname === "/marketplace"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                  {item.to === "/checkout" && count > 0 ? (
                    <span className="rounded-full bg-surface-3 px-1.5 text-[10px] tabular">
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <Link
            to="/checkout"
            className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg md:hidden"
          >
            Cart {count > 0 ? `(${count})` : ""}
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 md:hidden">
          {NAV.map((item) => {
            const active =
              pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs",
                  active
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:bg-surface",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
