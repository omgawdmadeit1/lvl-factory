import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  NAV_GROUPS,
  isNavActive,
  type NavLink,
} from "@/lib/marketplace/nav";
import { cn } from "@/lib/utils";

/**
 * Full-mesh menu button — opens an overlay with every content surface.
 * Use on buyer, store, and operator chrome so no page is a dead end.
 */
export function NetworkMenu({
  className,
  label = "Menu",
  variant = "default",
}: {
  className?: string;
  label?: string;
  variant?: "default" | "icon" | "pill";
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const titleId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1.5 text-sm transition-colors",
          variant === "icon" &&
            "size-11 rounded-lg text-muted hover:bg-surface hover:text-fg",
          variant === "pill" &&
            "rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg hover:bg-surface-3",
          variant === "default" &&
            "rounded-lg border border-border bg-surface px-3 py-2 text-muted hover:bg-surface-2 hover:text-fg",
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open network menu"
      >
        <Menu className="size-4 shrink-0" />
        {variant !== "icon" ? (
          <span className="max-w-[4.5rem] truncate">{label}</span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex justify-end overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "relative flex h-full min-h-0 w-full min-w-0 flex-col",
              "max-w-full border-l border-border bg-surface shadow-soft",
              "sm:max-w-sm",
              "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p
                  id={titleId}
                  className="truncate text-sm font-semibold tracking-tight"
                >
                  LVL network
                </p>
                <p className="truncate text-[11px] text-subtle">
                  All surfaces · lvlltd.com
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
              <div className="space-y-5">
                {NAV_GROUPS.map((group) => (
                  <section key={group.id} className="min-w-0">
                    <h3 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-subtle">
                      {group.label}
                    </h3>
                    {/* Single column on narrow phones — avoids label wrap overflow */}
                    <ul className="grid grid-cols-1 gap-1 min-[380px]:grid-cols-2 min-[380px]:gap-1.5">
                      {group.links.map((link) => (
                        <li key={link.to} className="min-w-0">
                          <MenuLink link={link} pathname={pathname} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 text-[11px] text-subtle">
              Tip: press{" "}
              <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-fg">
                ⌘K
              </kbd>{" "}
              for command palette
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MenuLink({
  link,
  pathname,
}: {
  link: NavLink;
  pathname: string;
}) {
  const active = isNavActive(pathname, link.to);
  return (
    <Link
      to={link.to}
      className={cn(
        "flex min-h-11 min-w-0 items-center rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-surface-3 font-medium text-fg"
          : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      <span className="truncate">{link.label}</span>
    </Link>
  );
}

/** Horizontal chip row — contained scroll, no page-level overflow */
export function NavChipRow({
  links,
  className,
}: {
  links: NavLink[];
  className?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className={cn("relative min-w-0 max-w-full", className)}>
      <nav
        className={cn(
          "flex max-w-full gap-1 overflow-x-auto overscroll-x-contain",
          "px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
        )}
        aria-label="Secondary navigation"
      >
        {links.map((item) => {
          const active = isNavActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors",
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
      {/* edge fade so scroll doesn't feel like page overflow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg to-transparent"
      />
    </div>
  );
}
