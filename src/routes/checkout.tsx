import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CreditCard, ExternalLink, ShoppingBag, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCartStore } from "@/lib/store/cart";
import { useOrdersStore } from "@/lib/marketplace/orders";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — LVL Marketplace | checkout.lvlltd.com" },
      {
        name: "description",
        content:
          "Unified LVL checkout: Printify POD or multi-rail crypto/card settlement.",
      },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const clear = useCartStore((s) => s.clear);
  const placeFromCart = useOrdersStore((s) => s.placeFromCart);

  const agentLines = lines.filter((l) => l.agentShopable);
  const printifyLines = lines.filter((l) => l.printifyUrl);
  const firstPrintify = printifyLines[0]?.printifyUrl;

  function place(rail: "printify" | "crypto" | "card" | "agent") {
    if (lines.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    const amount = Math.max(0.05, Number(subtotal.toFixed(2)));
    const sku = lines[0]?.sku;
    const payPath =
      rail === "printify"
        ? undefined
        : `/pay?sku=${encodeURIComponent(sku || "cart")}&amount=${amount}`;

    const order = placeFromCart({
      lines,
      rail,
      payPath,
      printifyUrl: firstPrintify,
      note: `${lines.length} line(s) via ${rail}`,
    });

    if (rail === "printify" && firstPrintify) {
      clear();
      toast.success("Order started — opening Printify");
      window.open(firstPrintify, "_blank", "noopener,noreferrer");
      void navigate({ to: "/orders/$id", params: { id: order.id } });
      return;
    }

    clear();
    toast.success("Order created — continue payment");
    void navigate({
      to: "/pay",
      search: {
        skill: sku || "cart",
        amount,
        canceled: false,
      },
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">checkout.lvlltd.com</Badge>
          <Badge variant="default">unified</Badge>
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShoppingBag className="size-6" />
          Checkout
        </h1>
        <p className="max-w-xl text-sm text-muted">
          Review cart, then settle with Printify (physical POD) or multi-rail pay
          (agents + digital/merch rails).
        </p>
      </header>

      {lines.length === 0 ? (
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Cart is empty</CardTitle>
            <CardDescription>
              Add products from the LVL Store first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/shop">Browse store</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="text-base">Cart</CardTitle>
              <CardDescription>
                {lines.length} line{lines.length === 1 ? "" : "s"} · $
                {subtotal.toFixed(2)} USD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {lines.map((l) => (
                <div
                  key={l.key}
                  className="flex justify-between gap-2 border-b border-border/50 py-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium">{l.title}</p>
                    <p className="text-xs text-muted">
                      {l.size} × {l.qty}
                      {l.agentShopable ? " · agent" : ""}
                    </p>
                  </div>
                  <p className="tabular">${(l.priceUsd * l.qty).toFixed(2)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ExternalLink className="size-4" />
                  Printify POD
                </CardTitle>
                <CardDescription>
                  Physical fulfillment ·{" "}
                  {printifyLines.length
                    ? `${printifyLines.length} line(s) with Printify URL`
                    : "no Printify URL on cart lines"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  disabled={!firstPrintify}
                  onClick={() => place("printify")}
                  className="w-full sm:w-auto"
                >
                  Checkout on Printify
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4" />
                  Multi-rail pay
                </CardTitle>
                <CardDescription>
                  Crypto + card on pay.lvlltd.com ·{" "}
                  {agentLines.length} agent-shopable line
                  {agentLines.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => place("crypto")}>
                  <CreditCard className="size-4" />
                  Pay ${subtotal.toFixed(2)}
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/shop/cart">Edit cart</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
