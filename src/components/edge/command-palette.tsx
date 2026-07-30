import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  Beaker,
  Bot,
  ChartCandlestick,
  Crosshair,
  Flame,
  Activity,
  Lock,
  CreditCard,
  FlaskConical,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Radio,
  Radar,
  Rocket,
  Sparkles,
  Store,
  Timer,
  Users,
  UsersRound,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";

const LINKS: Array<{
  to: string;
  label: string;
  group: string;
  icon: typeof Store;
  keywords?: string;
}> = [
  { to: "/", label: "Factory dashboard", group: "Operator", icon: LayoutDashboard },
  { to: "/marketplace", label: "Marketplace hub", group: "Buy", icon: LayoutGrid },
  { to: "/labs", label: "Labs live demos", group: "Markets", icon: Beaker, keywords: "demo try" },
  { to: "/exchange", label: "LVL Exchange", group: "Markets", icon: ChartCandlestick, keywords: "trade secondary" },
  { to: "/syndicate", label: "Syndicate group buys", group: "Markets", icon: UsersRound, keywords: "crew stack co-purchase" },
  { to: "/launch", label: "Launch pad", group: "Markets", icon: Rocket, keywords: "waitlist pledge gtm" },
  { to: "/bounty", label: "Bounty board", group: "Markets", icon: Crosshair, keywords: "escrow task claim" },
  { to: "/vault", label: "IP Vault", group: "Markets", icon: Lock, keywords: "royalty rights license" },
  { to: "/signal", label: "Signal market", group: "Markets", icon: Activity, keywords: "demand attention heat" },
  { to: "/arena", label: "Arena races", group: "Markets", icon: Flame, keywords: "leaderboard drop claim" },
  { to: "/fleet", label: "Agent fleet", group: "Markets", icon: Users, keywords: "hire labor" },
  { to: "/shop", label: "LVL Store", group: "Buy", icon: Store, keywords: "merch" },
  { to: "/drops", label: "Live drops", group: "Buy", icon: Timer, keywords: "flash limited" },
  { to: "/bundles", label: "Stack packs", group: "Buy", icon: Layers, keywords: "bundle discount" },
  { to: "/radar", label: "Restock radar", group: "Buy", icon: Radar, keywords: "watch alert" },
  { to: "/pulse", label: "Network pulse", group: "Network", icon: Radio, keywords: "live feed" },
  { to: "/studio", label: "Design studio", group: "Create", icon: Wand2, keywords: "imagine" },
  { to: "/relay", label: "Agent relay", group: "Agents", icon: Zap, keywords: "a2a intent" },
  { to: "/agent/merch", label: "Agent catalog", group: "Agents", icon: Bot },
  { to: "/checkout", label: "Checkout", group: "Buy", icon: Package },
  { to: "/pay", label: "Multi-rail pay", group: "Buy", icon: CreditCard },
  { to: "/account", label: "Account & loyalty", group: "Buy", icon: Sparkles },
  { to: "/orders", label: "Orders", group: "Buy", icon: Package },
  { to: "/pipeline", label: "Merch pipeline", group: "Operator", icon: Workflow },
  { to: "/seller", label: "Seller portal", group: "Operator", icon: Workflow },
  { to: "/network", label: "Domain network", group: "Network", icon: LayoutGrid },
  { to: "/canary", label: "Canary pay", group: "Operator", icon: FlaskConical },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 hidden items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-2 text-xs text-muted shadow-lift backdrop-blur-sm hover:text-fg sm:inline-flex"
        aria-label="Open command palette"
      >
        <span className="font-medium text-fg">Command</span>
        <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-bg/70 p-4 pt-[12vh] backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <Command
        className="relative z-[1] w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-lift"
        label="LVL command palette"
      >
        <div className="border-b border-border px-3">
          <Command.Input
            placeholder="Jump to labs, syndicate, launch, bounty, exchange…"
            className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
            autoFocus
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
            No matches
          </Command.Empty>
          {["Buy", "Markets", "Create", "Agents", "Network", "Operator"].map(
            (group) => {
              const items = LINKS.filter((l) => l.group === group);
              if (!items.length) return null;
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-subtle"
                >
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.to}
                        value={`${item.label} ${item.keywords ?? ""} ${item.to}`}
                        onSelect={() => {
                          setOpen(false);
                          navigate({ to: item.to });
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted aria-selected:bg-surface-2 aria-selected:text-fg"
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            },
          )}
        </Command.List>
      </Command>
    </div>
  );
}
