import { createFileRoute, Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrdersStore } from "@/lib/marketplace/orders";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — LVL Marketplace | orders.lvlltd.com" },
      {
        name: "description",
        content: "LVL buyer order history from checkout and multi-rail pay.",
      },
    ],
  }),
  component: OrdersPage,
});

function statusVariant(
  s: string,
): "default" | "info" | "warning" | "success" | "danger" {
  if (s === "complete" || s === "shipped" || s === "paid") return "success";
  if (s === "canceled") return "danger";
  if (s === "awaiting_payment" || s === "pending") return "warning";
  return "info";
}

function OrdersPage() {
  const orders = useOrdersStore((s) => s.orders);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">orders.lvlltd.com</Badge>
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Package className="size-6" />
          Orders
        </h1>
        <p className="text-sm text-muted">
          Created at checkout. Physical POD continues on Printify; crypto/card
          rails open multi-rail pay.
        </p>
      </header>

      {orders.length === 0 ? (
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base">No orders yet</CardTitle>
            <CardDescription>
              Add merch in the store and complete checkout to seed this ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/shop">Shop</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/checkout">Checkout</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const amount = Math.max(0.05, Number(o.subtotalUsd.toFixed(2)));
            const sku = o.lines[0]?.sku || "order";
            return (
              <li key={o.id}>
                <Card className="border-border bg-surface">
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                    <div>
                      <CardTitle className="font-mono text-sm">{o.id}</CardTitle>
                      <CardDescription>
                        {new Date(o.createdAt).toLocaleString()} · {o.rail} ·{" "}
                        {o.lines.length} line
                        {o.lines.length === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                    <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1 text-xs text-muted">
                      {o.lines.map((l) => (
                        <li key={l.key} className="flex justify-between gap-2">
                          <span>
                            {l.title} · {l.size} × {l.qty}
                          </span>
                          <span className="tabular text-fg">
                            ${(l.priceUsd * l.qty).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <p className="text-sm font-medium tabular">
                        ${o.subtotalUsd.toFixed(2)} USD
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {o.rail !== "printify" ? (
                          <Button asChild size="sm" variant="secondary">
                            <Link
                              to="/pay"
                              search={{
                                skill: sku,
                                amount,
                                canceled: false,
                              }}
                            >
                              Continue pay
                            </Link>
                          </Button>
                        ) : null}
                        {o.printifyUrl ? (
                          <Button asChild size="sm" variant="secondary">
                            <a
                              href={o.printifyUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Printify
                            </a>
                          </Button>
                        ) : null}
                        <Button asChild size="sm">
                          <Link to="/orders/$id" params={{ id: o.id }}>
                            Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                    {o.trackingHint ? (
                      <p className="text-[11px] text-subtle">{o.trackingHint}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
