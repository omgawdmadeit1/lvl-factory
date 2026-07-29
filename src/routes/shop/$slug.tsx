import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Bot,
  ExternalLink,
  Heart,
  Link2,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FitAssistant } from "@/components/edge/fit-assistant";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { useFitMemoryStore } from "@/lib/edge/fit-memory";
import { useRadarStore } from "@/lib/edge/radar";
import { useMerchStore } from "@/lib/merch/store";
import { useCartStore, type CartSize } from "@/lib/store/cart";
import { useRecentStore } from "@/lib/store/recent";
import { useWishlistStore } from "@/lib/store/wishlist";
import { kindLabel, storeMoney } from "@/lib/store/collections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/$slug")({
  component: ProductDetailPage,
});

const APPAREL_SIZES: CartSize[] = ["S", "M", "L", "XL", "XXL"];

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const products = useMerchStore((s) => s.products);
  const product = products.find(
    (p) => p.slug === slug && p.status === "published",
  );
  const add = useCartStore((s) => s.add);
  const pushRecent = useRecentStore((s) => s.push);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) =>
    product ? s.has(product.id) : false,
  );
  const lastSize = useFitMemoryStore((s) => s.lastSize);
  const watch = useRadarStore((s) => s.watch);
  const watching = useRadarStore((s) =>
    product ? s.has(product.slug) : false,
  );

  useEffect(() => {
    if (product) pushRecent(product.slug);
  }, [product, pushRecent]);

  const isApparel = product
    ? product.kind === "tee" || product.kind === "hoodie"
    : false;
  const [size, setSize] = useState<CartSize>("M");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (
      lastSize &&
      APPAREL_SIZES.includes(lastSize as CartSize)
    ) {
      setSize(lastSize as CartSize);
    }
  }, [lastSize]);

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (p) =>
          p.status === "published" &&
          p.id !== product.id &&
          (p.kind === product.kind ||
            p.tags.some((t) => product.tags.includes(t))),
      )
      .slice(0, 4);
  }, [products, product]);

  if (!product) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Product not found
        </h1>
        <p className="text-sm text-muted">
          No published product for &ldquo;{slug}&rdquo;.
        </p>
        <Button asChild>
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-14">
      <nav className="text-xs text-subtle">
        <Link to="/shop" className="hover:text-fg">
          Shop
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-muted">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-lift">
          <div className="aspect-[4/5]">
            <ProductImage
              slug={product.slug}
              mockupUrl={product.mockupUrl}
              alt={product.title}
              priority
              sizes="(max-width: 1024px) 100vw, 520px"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">
            {kindLabel(product.kind)} · {product.sku}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {product.title}
          </h1>
          <p className="mt-3 text-xl tabular text-fg">
            {storeMoney(product.priceUsd)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {product.description}
          </p>

          {product.agentShopable ? (
            <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
              <Bot className="size-3" /> Agent shopable
            </p>
          ) : null}

          {isApparel ? (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium text-muted">Size</p>
              <div className="flex flex-wrap gap-2">
                {APPAREL_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={cn(
                      "min-h-11 min-w-11 rounded-lg border px-3 text-sm transition-colors",
                      size === s
                        ? "border-border-strong bg-surface-2 text-fg"
                        : "border-border text-muted hover:bg-surface",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-muted">Quantity</p>
            <div className="inline-flex items-center rounded-lg border border-border">
              <button
                type="button"
                className="flex size-11 items-center justify-center text-muted hover:text-fg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center text-sm tabular">{qty}</span>
              <button
                type="button"
                className="flex size-11 items-center justify-center text-muted hover:text-fg"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Button
              className="min-h-11 flex-1 sm:flex-none"
              onClick={() => {
                add(product, { size: isApparel ? size : undefined, qty });
                toast.success("Added to cart");
              }}
            >
              <ShoppingBag className="size-4" />
              Add to cart
            </Button>
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => toggleWish(product)}
              aria-pressed={wished}
            >
              <Heart className={cn("size-4", wished && "fill-current")} />
              {wished ? "Saved" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={watching}
              onClick={() => {
                watch({
                  productSlug: product.slug,
                  title: product.title,
                  source: "pdp",
                });
                toast.success("On restock radar");
              }}
            >
              <Bell className="size-4" />
              {watching ? "Watching" : "Watch"}
            </Button>
          </div>

          {isApparel ? (
            <div className="mt-8">
              <FitAssistant
                onRecommend={(s) => {
                  if (APPAREL_SIZES.includes(s as CartSize)) {
                    setSize(s as CartSize);
                    toast.success(`Size set to ${s}`);
                  }
                }}
              />
            </div>
          ) : null}

          <div className="mt-8 space-y-2 border-t border-border pt-6 text-xs text-muted">
            <p className="font-medium text-fg">Settlement & fulfillment</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <Wallet className="size-3.5 shrink-0" />
                Multi-rail pay at face {storeMoney(product.priceUsd)}
              </li>
              <li className="flex items-center gap-2">
                <Bot className="size-3.5 shrink-0" />
                Agent catalog · lvl-merch-v1
              </li>
              {product.printifyUrl ? (
                <li>
                  <a
                    href={product.printifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-fg underline-offset-2 hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    Printify storefront
                  </a>
                </li>
              ) : null}
              <li>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-fg underline-offset-2 hover:underline"
                  onClick={async () => {
                    const url = `${window.location.origin}/shop/${product.slug}`;
                    await navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  }}
                >
                  <Link2 className="size-3.5" />
                  Copy product link
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold tracking-tight">
            You may also like
          </h2>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  );
}
