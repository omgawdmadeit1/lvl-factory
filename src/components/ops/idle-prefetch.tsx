/**
 * Prefetch high-traffic route modules after browser idle on the hub.
 * Uses requestIdleCallback + dynamic import of route modules TanStack will need.
 */
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/** Paths that dominate first-hop traffic from the marketplace hub */
export const HUB_PREFETCH_PATHS = [
  "/labs",
  "/shop",
  "/vault",
  "/exchange",
  "/arena",
  "/drops",
  "/mirror",
  "/monitor",
  "/checkout",
  "/signal",
  "/forge",
  "/quest",
] as const;

function idle(cb: () => void, timeout = 2200) {
  if (typeof window === "undefined") return () => {};
  const ric = (
    window as Window & {
      requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }
  ).requestIdleCallback;
  if (typeof ric === "function") {
    const id = ric(cb, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(cb, Math.min(800, timeout));
  return () => window.clearTimeout(t);
}

export function IdlePrefetch({
  paths = HUB_PREFETCH_PATHS as unknown as string[],
  enabled = true,
}: {
  paths?: string[];
  enabled?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;
    let i = 0;

    const cancelIdle = idle(() => {
      const step = () => {
        if (cancelled || i >= paths.length) return;
        const to = paths[i++]!;
        // TanStack Router load: warms the route match + module graph
        void router
          .preloadRoute({ to })
          .catch(() => {
            /* ignore missing / optional routes */
          })
          .finally(() => {
            // stagger to avoid one long task
            if (!cancelled && i < paths.length) {
              window.setTimeout(step, 120);
            }
          });
      };
      step();
    }, 2500);

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [enabled, paths, router]);

  return null;
}
