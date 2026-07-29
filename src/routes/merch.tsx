import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/**
 * Legacy /merch → Shopify-style LVL Store at /shop
 */
export const Route = createFileRoute("/merch")({
  validateSearch: (s: Record<string, unknown>) => ({
    channel: typeof s.channel === "string" ? s.channel : undefined,
    sku: typeof s.sku === "string" ? s.sku : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.channel === "art") {
      throw redirect({
        to: "/shop/collections/$handle",
        params: { handle: "art" },
      });
    }
    if (search.channel === "tee" || search.channel === "tees") {
      throw redirect({
        to: "/shop/collections/$handle",
        params: { handle: "tees" },
      });
    }
    throw redirect({ to: "/shop" });
  },
  component: MerchRedirectFallback,
});

function MerchRedirectFallback() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <p className="text-sm text-muted">Redirecting to the LVL Store…</p>
      <Button asChild>
        <Link to="/shop">Open shop</Link>
      </Button>
    </div>
  );
}
