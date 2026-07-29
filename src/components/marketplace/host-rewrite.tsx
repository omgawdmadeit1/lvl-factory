import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { hostHomeRewrite } from "@/lib/marketplace/hosts";

/**
 * On dedicated subdomains (shop., pay., account., …), map `/` → surface home.
 * Safe no-op on localhost / factory / unknown hosts.
 */
export function HostRewrite() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = hostHomeRewrite(window.location.hostname, pathname);
    if (target && target !== pathname) {
      void navigate({ to: target, replace: true });
    }
  }, [pathname, navigate]);

  return null;
}
