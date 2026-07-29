import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Boxes,
  CreditCard,
  Disc3,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  Globe,
  Webhook,
  Workflow,
  User,
  ShoppingCart,
} from "lucide-react";
import { BuyerShell } from "@/components/marketplace/buyer-shell";
import { isBuyerPath } from "@/lib/marketplace/hosts";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplace", label: "Marketplace hub", icon: LayoutGrid },
  { to: "/shop", label: "LVL Store", icon: Store },
  { to: "/checkout", label: "Checkout", icon: ShoppingCart },
  { to: "/account", label: "Account", icon: User },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/seller", label: "Seller portal", icon: Workflow },
  { to: "/network", label: "Network map", icon: Globe },
  { to: "/merch", label: "Merch (legacy)", icon: ShoppingBag },
  { to: "/pipeline", label: "Merch pipeline", icon: Workflow },
  { to: "/webhooks", label: "Printify hooks", icon: Webhook },
  { to: "/agent/merch", label: "Agent shop", icon: Bot },
  { to: "/pay", label: "Pay", icon: CreditCard },
  { to: "/tier1", label: "Tier 1 Plan", icon: Sparkles },
  { to: "/music", label: "Music packs", icon: Disc3 },
  { to: "/skills", label: "Skill packs", icon: Boxes },
  { to: "/queue", label: "Queue", icon: ListOrdered },
  { to: "/canary", label: "Canary", icon: FlaskConical },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Storefront keeps its own Shopify-style shell
  if (pathname === "/shop" || pathname.startsWith("/shop/")) {
    return <>{children}</>;
  }

  // Buyer marketplace surfaces share Market chrome
  if (isBuyerPath(pathname) && pathname !== "/pay") {
    // /pay has dense multi-rail UI — still use buyer chrome for consistency
  }
  if (isBuyerPath(pathname)) {
    return <BuyerShell>{children}</BuyerShell>;
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-border md:flex md:flex-col">
          <div className="border-b border-border px-4 py-5">
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">
              LVL Marketplace
            </p>
            <p className="text-sm font-semibold tracking-tight">
              Factory + store
            </p>
            <p className="mt-1 text-xs text-muted">lvlltd.com operator</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-3 border-t border-border p-3">
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
                <Package className="size-3.5" />
                Hosts
              </div>
              <ul className="space-y-1.5 text-xs text-subtle">
                <li>shop.lvlltd.com</li>
                <li>pay · checkout · account</li>
                <li>seller · agents · admin</li>
                <li className="font-medium text-fg">factory.lvlltd.com</li>
              </ul>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                Operator console
              </p>
              <p className="text-sm text-muted">Marketplace · packs · rails</p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/marketplace"
                className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted hover:text-fg"
              >
                Hub
              </Link>
              <Link
                to="/shop"
                className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted hover:text-fg"
              >
                Store
              </Link>
              <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success">
                Live
              </span>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
            {NAV.slice(0, 10).map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
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

          <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
