import { Link, useRouterState } from "@tanstack/react-router";
import {
  Beaker,
  ChartCandlestick,
  Crosshair,
  CreditCard,
  Layers,
  LayoutGrid,
  Package,
  Radio,
  Rocket,
  ShoppingBag,
  Store,
  Timer,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand/visual-hero";
import { useLoyaltyStore } from "@/lib/edge/loyalty";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/marketplace" as const, label: "Hub", icon: LayoutGrid },
  { to: "/labs" as const, label: "Labs", icon: Beaker },
  { to: "/exchange" as const, label: "Exchange", icon: ChartCandlestick },
  { to: "/syndicate" as const, label: "Syndicate", icon: UsersRound },
  { to: "/launch" as const, label: "Launch", icon: Rocket },
  { to: "/bounty" as const, label: "Bounty", icon: Crosshair },
  { to: "/fleet" as const, label: "Fleet", icon: Users },
  { to: "/shop" as const, label: "Shop", icon: Store },
  { to: "/drops" as const, label: "Drops", icon: Timer },
  { to: "/bundles" as const, label: "Stacks", icon: Layers },
  { to: "/pulse" as const, label: "Pulse", icon: Radio },
  { to: "/checkout" as const, label: "Checkout", icon: ShoppingBag },
  { to: "/pay" as const, label: "Pay", icon: CreditCard },
  { to: "/orders" as const, label: "Orders", icon: Package },
  { to: "/account" as const, label: "Account", icon: User },
];

export function BuyerShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useCartStore((s) => s.count());
  const credits = useLoyaltyStore((s) => s.balance);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="border-b border-border bg-surface-2 px-4 py-2 text-center text-xs text-muted">
        LVL · labs · exchange · syndicate · launch · bounty · fleet ·{" "}
        <span className="text-fg">lvlltd.com</span>
        {credits > 0 ? (
          <>
            {" · "}
            <span className="tabular text-fg">{credits} cr</span>
          </>
        ) : null}
      </div>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/marketplace" className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <div>
              <p className="text-sm font-semibold tracking-tight">LVL Market</p>
              <p className="text-[11px] text-subtle">lvlltd.com network</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
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
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
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
            className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg xl:hidden"
          >
            Cart {count > 0 ? `(${count})` : ""}
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 xl:hidden">
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
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
