import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Anchor,
  Beaker,
  Bot,
  Boxes,
  ChartCandlestick,
  Copy,
  CreditCard,
  Crosshair,
  Disc3,
  Eye,
  Flame,
  FlaskConical,
  Gauge,
  GitBranch,
  Globe,
  Hammer,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  Lock,
  Package,
  Radar,
  Radio,
  Rocket,
  ScrollText,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Timer,
  Trophy,
  User,
  Users,
  UsersRound,
  Wand2,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/brand/visual-hero";
import { BuyerShell } from "@/components/marketplace/buyer-shell";
import {
  NavChipRow,
  NetworkMenu,
} from "@/components/marketplace/network-menu";
import { isBuyerPath } from "@/lib/marketplace/hosts";
import { OPERATOR_MOBILE_NAV } from "@/lib/marketplace/nav";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplace", label: "Hub", icon: LayoutGrid },
  { to: "/labs", label: "Labs", icon: Beaker },
  { to: "/exchange", label: "Exchange", icon: ChartCandlestick },
  { to: "/syndicate", label: "Syndicate", icon: UsersRound },
  { to: "/launch", label: "Launch", icon: Rocket },
  { to: "/bounty", label: "Bounty", icon: Crosshair },
  { to: "/vault", label: "Vault", icon: Lock },
  { to: "/signal", label: "Signal", icon: Activity },
  { to: "/arena", label: "Arena", icon: Flame },
  { to: "/forge", label: "Forge", icon: Hammer },
  { to: "/guild", label: "Guild", icon: UsersRound },
  { to: "/whisper", label: "Whisper", icon: KeyRound },
  { to: "/quest", label: "Quest", icon: Trophy },
  { to: "/ledger", label: "Ledger", icon: ScrollText },
  { to: "/oracle", label: "Oracle", icon: Eye },
  { to: "/mirror", label: "Mirror", icon: Copy },
  { to: "/circuit", label: "Circuit", icon: GitBranch },
  { to: "/anchor", label: "Anchor", icon: Anchor },
  { to: "/monitor", label: "Monitor", icon: Gauge },
  { to: "/fleet", label: "Fleet", icon: Users },
  { to: "/shop", label: "Store", icon: Store },
  { to: "/drops", label: "Drops", icon: Timer },
  { to: "/bundles", label: "Stacks", icon: Layers },
  { to: "/radar", label: "Radar", icon: Radar },
  { to: "/pulse", label: "Pulse", icon: Radio },
  { to: "/studio", label: "Studio", icon: Wand2 },
  { to: "/relay", label: "Relay", icon: Zap },
  { to: "/checkout", label: "Checkout", icon: ShoppingCart },
  { to: "/account", label: "Account", icon: User },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/seller", label: "Seller", icon: Workflow },
  { to: "/network", label: "Network", icon: Globe },
  { to: "/pipeline", label: "Pipeline", icon: Workflow },
  { to: "/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/agent/merch", label: "Agents", icon: Bot },
  { to: "/pay", label: "Pay", icon: CreditCard },
  { to: "/tier1", label: "Tier 1", icon: Sparkles },
  { to: "/music", label: "Music", icon: Disc3 },
  { to: "/skills", label: "Skills", icon: Boxes },
  { to: "/queue", label: "Queue", icon: ListOrdered },
  { to: "/canary", label: "Canary", icon: FlaskConical },
  { to: "/merch", label: "Merch", icon: ShoppingBag },
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
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                  LVL Marketplace
                </p>
                <p className="truncate text-sm font-semibold tracking-tight">
                  Factory + store
                </p>
              </div>
            </div>
            <p className="text-xs text-muted">lvlltd.com operator</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3">
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
                    "flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
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
          <header className="flex min-w-0 items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2.5 md:hidden">
              <BrandMark size="sm" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wider text-subtle">
                  Operator
                </p>
                <p className="truncate text-sm text-muted">Markets · rails</p>
              </div>
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                Operator console
              </p>
              <p className="text-sm text-muted">Markets · packs · rails</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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

          {/* Compact chips only — full map is in Menu (no 33-item overflow row) */}
          <div className="min-w-0 border-b border-border md:hidden">
            <NavChipRow links={OPERATOR_MOBILE_NAV} />
          </div>

          <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
