import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const order = useOrdersStore((s) => s.getById(id));
  const setStatus = useOrdersStore((s) => s.setStatus);

  if (!order) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Order not found</h1>
        <p className="text-sm text-muted">
          No local order <span className="font-mono">{id}</span>.
        </p>
        <Button asChild variant="secondary">
          <Link to="/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const amount = Math.max(0.05, Number(order.subtotalUsd.toFixed(2)));
  const sku = order.lines[0]?.sku || "order";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Badge variant="info">orders.lvlltd.com</Badge>
        <h1 className="font-mono text-xl font-semibold tracking-tight">
          {order.id}
        </h1>
        <p className="text-sm text-muted">
          {new Date(order.createdAt).toLocaleString()} · rail {order.rail}
        </p>
        <Badge>{order.status}</Badge>
      </header>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base">Lines</CardTitle>
          <CardDescription>
            Subtotal ${order.subtotalUsd.toFixed(2)} {order.currency}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.lines.map((l) => (
            <div
              key={l.key}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0"
            >
              <div>
                <Link
                  to="/shop/$slug"
                  params={{ slug: l.slug }}
                  className="font-medium hover:underline"
                >
                  {l.title}
                </Link>
                <p className="text-xs text-muted">
                  SKU {l.sku} · {l.size} × {l.qty}
                </p>
              </div>
              <p className="tabular">${(l.priceUsd * l.qty).toFixed(2)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {order.rail !== "printify" ? (
          <Button asChild>
            <Link
              to="/pay"
              search={{ skill: sku, amount, canceled: false }}
            >
              Multi-rail pay
            </Link>
          </Button>
        ) : null}
        {order.printifyUrl ? (
          <Button asChild variant="secondary">
            <a href={order.printifyUrl} target="_blank" rel="noreferrer">
              Printify checkout
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStatus(order.id, "complete")}
        >
          Mark complete
        </Button>
        <Button asChild variant="secondary">
          <Link to="/orders">All orders</Link>
        </Button>
      </div>
    </div>
  );
}
