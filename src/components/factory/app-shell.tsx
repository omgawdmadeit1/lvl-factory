import { Link, useRouterState } from "@tanstack/react-router";
import {
  Boxes,
  Disc3,
  Factory,
  LayoutDashboard,
  ListChecks,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFactoryStore } from "@/lib/factory/store";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/music", label: "Music Factory", icon: Disc3 },
  { to: "/skills", label: "Skill Factory", icon: Boxes },
  { to: "/queue", label: "Review Queue", icon: ListChecks },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const message = useFactoryStore((s) => s.lastMessage);
  const clearMessage = useFactoryStore((s) => s.clearMessage);
  const packages = useFactoryStore((s) => s.packages);
  const queueCount = packages.filter((p) =>
    ["ready", "processing", "approved"].includes(p.status),
  ).length;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-border md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex items-center gap-3 px-4 py-4 md:px-5 md:py-6">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2">
              <Factory className="size-4 text-fg" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">
                LVL Factory
              </div>
              <div className="truncate text-xs text-subtle">lvlltd.com rails</div>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-3 md:pb-6">
            {nav.map((item) => {
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
                    "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring",
                    active
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:bg-surface-2/70 hover:text-fg",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.to === "/queue" && queueCount > 0 ? (
                    <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[11px] tabular text-muted">
                      {queueCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="hidden border-t border-border p-4 md:block">
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
                <Package className="size-3.5" />
                Domain family
              </div>
              <ul className="space-y-1.5 text-xs text-subtle">
                <li>lvlltd.com — skill market</li>
                <li>music.lvlltd.com — catalog</li>
                <li>x402 · Base · USDC</li>
              </ul>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                Operator console
              </p>
              <p className="text-sm text-muted">
                Local pack factory for music + agent skills
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted">
                No phone path
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted">
                Digital only
              </span>
            </div>
          </header>

          {message ? (
            <div className="border-b border-border bg-surface-2/60 px-4 py-2.5 md:px-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-fg">{message}</p>
                <button
                  type="button"
                  onClick={clearMessage}
                  className="shrink-0 text-xs text-muted hover:text-fg focus-ring rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
