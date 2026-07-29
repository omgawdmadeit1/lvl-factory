import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { settlementBlock } from "@/lib/factory/payment";
import { useMerchStore } from "@/lib/merch/store";
import { useWishlistStore, type WishlistItem } from "@/lib/store/wishlist";
import type { MerchProduct } from "@/lib/merch/types";

export const Route = createFileRoute("/shop/wishlist")({
  component: WishlistPage,
});

function snapshotToProduct(item: WishlistItem): MerchProduct {
  return {
    id: item.id,
    sku: item.sku,
    slug: item.slug,
    title: item.title,
    description: "Saved on this device",
    kind: item.kind,
    priceUsd: item.priceUsd,
    status: "published",
    channel: "both",
    printifyUrl: null,
    printifyProductId: null,
    mockupUrl: item.mockupUrl,
    designUrl: null,
    brief: {
      id: `wish-${item.id}`,
      title: item.title,
      concept: "",
      imaginePrompt: "",
      negativePrompt: "",
      style: "",
      palette: [],
      aspectRatio: "1:1",
      printSafeNotes: "",
      tags: ["wishlist"],
    },
    tags: ["wishlist"],
    agentShopable: true,
    settlement: settlementBlock(item.priceUsd || 0.05),
    createdAt: item.savedAt,
    updatedAt: item.savedAt,
    progress: 100,
    notes: "wishlist-snapshot",
    source: "seed",
  };
}

function WishlistPage() {
  const items = useWishlistStore((s) => s.items);
  const hydrated = useWishlistStore((s) => s.hydrated);
  const clear = useWishlistStore((s) => s.clear);
  const resolve = useWishlistStore((s) => s.resolve);
  const products = useMerchStore((s) => s.products);

  const saved = useMemo(() => {
    const live = resolve(products);
    if (live.length) return live;
    return items.map(snapshotToProduct);
  }, [items, products, resolve]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">
            Saved
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
          <p className="mt-1 text-sm text-muted">
            {hydrated
              ? "Persists on this device (localStorage + cookie backup)"
              : "Loading saved items…"}{" "}
            · {hydrated ? saved.length : "…"} item
            {saved.length === 1 ? "" : "s"}
          </p>
        </div>
        {hydrated && saved.length ? (
          <button
            type="button"
            className="text-xs text-subtle underline-offset-2 hover:underline"
            onClick={() => clear()}
          >
            Clear wishlist
          </button>
        ) : null}
      </header>

      {!hydrated ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          Restoring wishlist…
        </div>
      ) : saved.length ? (
        <ProductGrid products={saved} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-medium">No saved products yet</p>
          <p className="mt-1 text-sm text-muted">
            Tap the heart on a product — it will stay saved after refresh.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/shop">Browse shop</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
