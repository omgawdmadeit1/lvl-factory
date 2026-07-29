import { ProductImage } from "@/components/store/product-image";
import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart";
import { storeMoney } from "@/lib/store/collections";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const open = useCartStore((s) => s.drawerOpen);
  const close = useCartStore((s) => s.closeDrawer);
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore((s) => s.subtotal());

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-bg/60 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={close}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
        aria-label="Cart"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-muted" />
            <h2 className="text-sm font-semibold tracking-tight">Your cart</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Close cart"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted">Your cart is empty</p>
              <Button variant="secondary" onClick={close} asChild>
                <Link to="/shop">Continue shopping</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-3">
                  <Link
                    to="/shop/$slug"
                    params={{ slug: line.slug }}
                    onClick={close}
                    className="size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2"
                  >
                    <ProductImage
                      slug={line.slug}
                      mockupUrl={line.mockupUrl}
                      alt=""
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.title}</p>
                    <p className="text-xs text-subtle">
                      Size {line.size} · {line.sku}
                    </p>
                    <p className="mt-1 tabular text-sm text-muted">
                      {storeMoney(line.priceUsd)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center text-muted hover:text-fg"
                          onClick={() => setQty(line.key, line.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="tabular w-8 text-center text-sm">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center text-muted hover:text-fg"
                          onClick={() => setQty(line.key, line.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-subtle underline-offset-2 hover:text-fg hover:underline"
                        onClick={() => remove(line.key)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="tabular font-medium">{storeMoney(subtotal)}</span>
            </div>
            <p className="text-xs text-subtle">
              Shipping calculated at Printify or agent settlement. Multi-rail
              crypto + card on checkout.
            </p>
            <Button className="min-h-11 w-full" asChild onClick={close}>
              <Link to="/shop/cart">Checkout</Link>
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 w-full"
              onClick={close}
              asChild
            >
              <Link to="/shop">Keep shopping</Link>
            </Button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
