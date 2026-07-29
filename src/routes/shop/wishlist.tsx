import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { useMerchStore } from "@/lib/merch/store";
import { useWishlistStore } from "@/lib/store/wishlist";

export const Route = createFileRoute("/shop/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const ids = useWishlistStore((s) => s.ids);
  const clear = useWishlistStore((s) => s.clear);
  const products = useMerchStore((s) => s.products);
  const saved = useMemo(
    () =>
      ids
        .map((id) => products.find((p) => p.id === id && p.status === "published"))
        .filter(Boolean) as typeof products,
    [ids, products],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">
            Saved
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
          <p className="mt-1 text-sm text-muted">
            Local to this browser · {saved.length} item
            {saved.length === 1 ? "" : "s"}
          </p>
        </div>
        {saved.length ? (
          <button
            type="button"
            className="text-xs text-subtle underline-offset-2 hover:underline"
            onClick={() => clear()}
          >
            Clear wishlist
          </button>
        ) : null}
      </header>

      {saved.length ? (
        <ProductGrid products={saved} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-medium">No saved products yet</p>
          <p className="mt-1 text-sm text-muted">
            Tap the heart on a product to save it here.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/shop">Browse shop</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
