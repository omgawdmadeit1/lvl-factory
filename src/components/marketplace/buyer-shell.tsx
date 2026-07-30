import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Beaker,
  ChartCandlestick,
  Crosshair,
  CreditCard,
  Flame,
  Layers,
  LayoutGrid,
  Lock,
  Package,
  Radio,
  Rocket,
  ShoppingBag,
  Store,
  Timer,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand/visual-hero";
import {
  NavChipRow,
  NetworkMenu,
} from "@/components/marketplace/network-menu";
import { useLoyaltyStore } from "@/lib/edge/loyalty";
import {
  BUYER_PRIMARY_NAV,
  BUYER_SECONDARY_NAV,
  isNavActive,
} from "@/lib/marketplace/nav";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

const PRIMARY_ICONS: Record<string, LucideIcon> = {
  "/marketplace": LayoutGrid,
  "/labs": Beaker,
  "/shop": Store,
  "/exchange": ChartCandlestick,
  "/vault": Lock,
  "/arena": Flame,
  "/drops": Timer,
  "/checkout": ShoppingBag,
  "/account": User,
  "/signal": Activity,
  "/syndicate": UsersRound,
  "/launch": Rocket,
  "/bounty": Crosshair,
  "/fleet": Users,
  "/bundles": Layers,
  "/pulse": Radio,
  "/pay": CreditCard,
  "/orders": Package,
};

export function BuyerShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useCartStore((s) => s.count());
  const credits = useLoyaltyStore((s) => s.balance);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="border-b border-border bg-surface-2 px-3 py-2 text-center text-xs text-muted sm:px-4">
        <span className="line-clamp-1">
          LVL · vault · signal · arena · markets ·{" "}
          <span className="text-fg">lvlltd.com</span>
          {credits > 0 ? (
            <>
              {" · "}
              <span className="tabular text-fg">{credits} cr</span>
            </>
          ) : null}
        </span>
      </div>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          <Link
            to="/marketplace"
            className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial sm:gap-2.5"
          >
            <BrandMark size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                LVL Market
              </p>
              <p className="truncate text-[11px] text-subtle">
                lvlltd.com network
              </p>
            </div>
          </Link>

          <nav
            className="hidden min-w-0 items-center gap-0.5 lg:flex"
            aria-label="Primary"
          >
            {BUYER_PRIMARY_NAV.map((item) => {
              const active = isNavActive(pathname, item.to);
              const Icon = PRIMARY_ICONS[item.to];
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
                  {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                  {item.label}
                  {item.to === "/checkout" && count > 0 ? (
                    <span className="rounded-full bg-surface-3 px-1.5 text-[10px] tabular">
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            <NetworkMenu className="ml-1" label="All" />
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
            <Link
              to="/checkout"
              className="max-w-[5.5rem] truncate rounded-full border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-fg"
            >
              Cart{count > 0 ? ` (${count})` : ""}
            </Link>
            <NetworkMenu variant="pill" label="Menu" />
          </div>
        </div>

        <div className="min-w-0 border-t border-border">
          <div className="mx-auto max-w-6xl min-w-0">
            <NavChipRow links={BUYER_SECONDARY_NAV} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
