import { ProductImage } from "@/components/store/product-image";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Minus, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart";
import { storeMoney } from "@/lib/store/collections";

export const Route = createFileRoute("/shop/cart")({
  component: CartPage,
});

function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.subtotal());

  const primaryPrintify = lines.find((l) => l.printifyUrl)?.printifyUrl;
  const agentTotal = lines
    .filter((l) => l.agentShopable)
    .reduce((n, l) => n + l.priceUsd * l.qty, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <p className="mt-1 text-sm text-muted">
          Shopify-style bag · Printify fulfillment · multi-rail agent pay
        </p>
      </header>

      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-medium">Your cart is empty</p>
          <Button className="mt-4" asChild>
            <Link to="/shop">Browse the shop</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-4 p-4">
                <Link
                  to="/shop/$slug"
                  params={{ slug: line.slug }}
                  className="size-24 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2"
                >
                  <ProductImage
                    slug={line.slug}
                    mockupUrl={line.mockupUrl}
                    alt=""
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        to="/shop/$slug"
                        params={{ slug: line.slug }}
                        className="text-sm font-medium hover:text-muted"
                      >
                        {line.title}
                      </Link>
                      <p className="text-xs text-subtle">
                        Size {line.size} · {line.sku}
                      </p>
                    </div>
                    <p className="tabular text-sm font-medium">
                      {storeMoney(line.priceUsd * line.qty)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center"
                        onClick={() => setQty(line.key, line.qty - 1)}
                        aria-label="Decrease"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="tabular w-8 text-center text-sm">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center"
                        onClick={() => setQty(line.key, line.qty + 1)}
                        aria-label="Increase"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-subtle underline-offset-2 hover:underline"
                      onClick={() => remove(line.key)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="tabular font-semibold">
                {storeMoney(subtotal)}
              </span>
            </div>
            <p className="text-xs text-subtle">
              Taxes and shipping are calculated on the fulfillment channel.
              Agents settle face amount multi-rail; physical goods ship via
              Printify.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {primaryPrintify ? (
                <Button className="min-h-11" asChild>
                  <a href={primaryPrintify} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                    Checkout on Printify
                  </a>
                </Button>
              ) : (
                <Button className="min-h-11" disabled>
                  Printify link unavailable
                </Button>
              )}
              <Button variant="secondary" className="min-h-11" asChild>
                <Link
                  to="/pay"
                  search={{
                    skill: lines[0]?.sku ?? "merch",
                    amount: agentTotal || subtotal,
                    canceled: false,
                  }}
                >
                  <Wallet className="size-4" />
                  Multi-rail pay
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button variant="secondary" size="sm" asChild>
                <Link to="/shop">Continue shopping</Link>
              </Button>
              <button
                type="button"
                className="text-xs text-subtle underline-offset-2 hover:underline"
                onClick={() => clear()}
              >
                Clear cart
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
