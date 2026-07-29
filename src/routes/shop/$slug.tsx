import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, ExternalLink, ShoppingBag, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { useMerchStore } from "@/lib/merch/store";
import { useCartStore, type CartSize } from "@/lib/store/cart";
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

  const isApparel = product
    ? product.kind === "tee" || product.kind === "hoodie"
    : false;
  const [size, setSize] = useState<CartSize>("M");
  const [qty, setQty] = useState(1);

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
        <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
          <div className="aspect-[4/5]">
            <ProductImage
              slug={product.slug}
              mockupUrl={product.mockupUrl}
              alt={product.title}
              priority
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
          <p className="mt-3 tabular text-xl text-fg">
            {storeMoney(product.priceUsd)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {product.description}
          </p>

          {isApparel ? (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {APPAREL_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={cn(
                      "min-h-11 min-w-11 rounded-lg border px-3 text-sm font-medium transition-colors",
                      size === s
                        ? "border-fg bg-fg text-bg"
                        : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">
              Quantity
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-lg border border-border text-muted hover:text-fg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="tabular w-10 text-center text-sm">{qty}</span>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-lg border border-border text-muted hover:text-fg"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="min-h-12 flex-1"
              onClick={() =>
                add(product, {
                  size: isApparel ? size : "OS",
                  qty,
                })
              }
            >
              <ShoppingBag className="size-4" />
              Add to cart
            </Button>
            {product.printifyUrl ? (
              <Button variant="secondary" className="min-h-12 flex-1" asChild>
                <a
                  href={product.printifyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Buy on Printify
                </a>
              </Button>
            ) : null}
          </div>

          {product.agentShopable ? (
            <div className="mt-6 rounded-xl border border-border bg-surface p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Bot className="size-4" /> Agent checkout
              </p>
              <p className="mt-1 text-xs text-muted">
                Settle multi-rail at face price via /pay. Catalog protocol
                lvl-merch-v1.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" asChild>
                  <Link
                    to="/pay"
                    search={{
                      skill: product.sku,
                      amount: product.priceUsd,
                      canceled: false,
                    }}
                  >
                    <Wallet className="size-3.5" />
                    Pay {storeMoney(product.priceUsd)}
                  </Link>
                </Button>
                <Button size="sm" variant="secondary" asChild>
                  <Link to="/agent/merch">Agent JSON</Link>
                </Button>
              </div>
            </div>
          ) : null}

          <dl className="mt-8 grid gap-3 border-t border-border pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Fulfillment</dt>
              <dd className="text-muted">Printify POD</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Channel</dt>
              <dd className="text-muted">{product.channel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-subtle">Domain</dt>
              <dd className="text-muted">factory.lvlltd.com/shop</dd>
            </div>
          </dl>
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
