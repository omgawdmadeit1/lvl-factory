import { Link, useRouterState } from "@tanstack/react-router";
import {
  Beaker,
  Bot,
  Boxes,
  ChartCandlestick,
  Crosshair,
  Trophy,
  Flame,
  Activity,
  Lock,
  CreditCard,
  Disc3,
  FlaskConical,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  Package,
  Radio,
  Radar,
  Rocket,
  ShoppingBag,
  Sparkles,
  Store,
  Globe,
  Timer,
  Users,
  UsersRound,
  Wand2,
  Webhook,
  Workflow,
  User,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/brand/visual-hero";
import { BuyerShell } from "@/components/marketplace/buyer-shell";
import { NetworkMenu } from "@/components/marketplace/network-menu";
import { isBuyerPath } from "@/lib/marketplace/hosts";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplace", label: "Marketplace hub", icon: LayoutGrid },
  { to: "/labs", label: "Labs demos", icon: Beaker },
  { to: "/exchange", label: "Exchange", icon: ChartCandlestick },
  { to: "/syndicate", label: "Syndicate", icon: UsersRound },
  { to: "/launch", label: "Launch pad", icon: Rocket },
  { to: "/bounty", label: "Bounty board", icon: Crosshair },
  { to: "/vault", label: "IP Vault", icon: Lock },
  { to: "/signal", label: "Signal market", icon: Activity },
  { to: "/arena", label: "Arena races", icon: Flame },
  { to: "/fleet", label: "Agent fleet", icon: Users },
  { to: "/shop", label: "LVL Store", icon: Store },
  { to: "/drops", label: "Live drops", icon: Timer },
  { to: "/bundles", label: "Stack packs", icon: Layers },
  { to: "/radar", label: "Restock radar", icon: Radar },
  { to: "/pulse", label: "Network pulse", icon: Radio },
  { to: "/studio", label: "Design studio", icon: Wand2 },
  { to: "/relay", label: "Agent relay", icon: Zap },
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

  if (pathname === "/shop" || pathname.startsWith("/shop/")) {
    return <>{children}</>;
  }

  if (isBuyerPath(pathname)) {
    return <BuyerShell>{children}</BuyerShell>;
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-border md:flex md:flex-col">
          <div className="border-b border-border px-4 py-5">
            <div className="mb-3 flex items-center gap-2.5">
              <BrandMark size="sm" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                  LVL Marketplace
                </p>
                <p className="text-sm font-semibold tracking-tight">
                  Factory + store
                </p>
              </div>
            </div>
            <p className="text-xs text-muted">lvlltd.com operator</p>
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
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-soft">
              <img
                src="/brand/hero-factory.jpg"
                alt=""
                className="absolute inset-0 size-full object-cover opacity-25"
              />
              <div className="relative z-[1]">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
                  <Package className="size-3.5" />
                  Edge hosts
                </div>
                <ul className="space-y-1.5 text-xs text-subtle">
                  <li>vault · signal · arena</li>
                  <li>syndicate · launch · bounty</li>
                  <li>drops · pulse · studio</li>
                  <li className="font-medium text-fg">factory.lvlltd.com</li>
                </ul>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
            <div className="flex items-center gap-2.5 md:hidden">
              <BrandMark size="sm" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                  Operator console
                </p>
                <p className="text-sm text-muted">Markets · packs · rails</p>
              </div>
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                Operator console
              </p>
              <p className="text-sm text-muted">Markets · packs · rails</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/labs"
                className="hidden rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted hover:text-fg sm:inline"
              >
                Labs
              </Link>
              <Link
                to="/shop"
                className="hidden rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted hover:text-fg sm:inline"
              >
                Store
              </Link>
              <NetworkMenu variant="pill" label="Menu" />
              <span className="hidden rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success sm:inline">
                Live
              </span>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
            {NAV.map((item) => {
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
