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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 text-sm transition-colors",
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
        {variant !== "icon" ? <span>{label}</span> : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex justify-end"
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
          <div className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-soft">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p
                  id={titleId}
                  className="text-sm font-semibold tracking-tight"
                >
                  LVL network
                </p>
                <p className="text-[11px] text-subtle">
                  All surfaces · lvlltd.com
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="space-y-6">
                {NAV_GROUPS.map((group) => (
                  <section key={group.id}>
                    <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
                      {group.label}
                    </h3>
                    <ul className="grid grid-cols-2 gap-1.5">
                      {group.links.map((link) => (
                        <li key={link.to}>
                          <MenuLink link={link} pathname={pathname} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>

            <div className="border-t border-border px-4 py-3 text-[11px] text-subtle">
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
        "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-surface-3 font-medium text-fg"
          : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      {link.label}
    </Link>
  );
}

/** Horizontal chip row for secondary destinations */
export function NavChipRow({
  links,
  className,
}: {
  links: NavLink[];
  className?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto overscroll-x-contain px-2 py-2",
        className,
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
  );
}
