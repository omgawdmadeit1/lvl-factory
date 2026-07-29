import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart";
import { kindLabel, storeMoney } from "@/lib/store/collections";
import { useWishlistStore } from "@/lib/store/wishlist";
import type { MerchProduct } from "@/lib/merch/types";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  priority,
}: {
  product: MerchProduct;
  priority?: boolean;
}) {
  const add = useCartStore((s) => s.add);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) => s.has(product.id));
  const hydrated = useWishlistStore((s) => s.hydrated);

  return (
    <article className="group flex flex-col">
      <div className="relative">
        <Link
          to="/shop/$slug"
          params={{ slug: product.slug }}
          className="relative block overflow-hidden rounded-xl border border-border bg-surface focus-ring"
        >
          <div className="aspect-[4/5] overflow-hidden">
            <ProductImage
              slug={product.slug}
              mockupUrl={product.mockupUrl}
              alt={product.title}
              priority={priority}
              className="transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
          </div>
          {product.agentShopable ? (
            <span className="absolute left-3 top-3 rounded-full border border-border bg-bg/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted backdrop-blur-sm">
              Agent
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => toggleWish(product)}
          className={cn(
            "absolute right-3 top-3 flex size-10 items-center justify-center rounded-full border border-border bg-bg/90 backdrop-blur-sm transition-colors",
            hydrated && wished ? "text-fg" : "text-muted hover:text-fg",
          )}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={hydrated && wished}
        >
          <Heart className={cn("size-4", hydrated && wished && "fill-current")} />
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
          {kindLabel(product.kind)}
        </p>
        <Link
          to="/shop/$slug"
          params={{ slug: product.slug }}
          className="text-sm font-medium tracking-tight text-fg hover:text-muted"
        >
          {product.title}
        </Link>
        <p className="tabular text-sm text-muted">{storeMoney(product.priceUsd)}</p>
        <div className="mt-auto flex gap-2 pt-3">
          <Button
            size="sm"
            className="min-h-11 flex-1"
            onClick={() => add(product)}
          >
            <ShoppingBag className="size-3.5" />
            Add
          </Button>
          <Button size="sm" variant="secondary" className="min-h-11" asChild>
            <Link to="/shop/$slug" params={{ slug: product.slug }}>
              View
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  className,
}: {
  products: MerchProduct[];
  className?: string;
}) {
  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <p className="text-sm font-medium text-fg">No products in this view</p>
        <p className="mt-1 text-sm text-muted">
          Try another collection or check back after the next drop.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
