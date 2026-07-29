import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy /merch → Shopify-style LVL Store at /shop
 */
export const Route = createFileRoute("/merch")({
  beforeLoad: ({ search }) => {
    const s = search as { channel?: string; sku?: string };
    if (s.channel === "art") {
      throw redirect({
        to: "/shop/collections/$handle",
        params: { handle: "art" },
      });
    }
    if (s.channel === "tee" || s.channel === "tees") {
      throw redirect({
        to: "/shop/collections/$handle",
        params: { handle: "tees" },
      });
    }
    throw redirect({ to: "/shop" });
  },
});
