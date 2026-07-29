import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Sparkles, Truck } from "lucide-react";
import { useMemo } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { useMerchStore } from "@/lib/merch/store";
import { STORE_COLLECTIONS } from "@/lib/store/collections";

export const Route = createFileRoute("/shop/")({
  component: ShopHomePage,
});

function ShopHomePage() {
  const products = useMerchStore((s) => s.products);
  const published = useMemo(
    () => products.filter((p) => p.status === "published"),
    [products],
  );
  const featured = published.slice(0, 4);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">
            LVL Store · Printify POD
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl lg:leading-[1.1]">
            Merch & art built for humans and agents
          </h1>
          <p className="max-w-lg text-base text-muted">
            A clean storefront on factory.lvlltd.com — live drops from the
            Printify shop, multi-rail checkout, and agent-readable catalog for
            autonomous buyers.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button className="min-h-11" asChild>
              <Link to="/shop/collections/$handle" params={{ handle: "all" }}>
                Shop all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="secondary" className="min-h-11" asChild>
              <Link to="/agent/merch">
                <Bot className="size-4" />
                Agent catalog
              </Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-4 pt-2 text-xs text-subtle">
            <li className="flex items-center gap-1.5">
              <Truck className="size-3.5" /> Print-on-demand ships worldwide
            </li>
            <li className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Imagine → pipeline designs
            </li>
            <li className="flex items-center gap-1.5">
              <Bot className="size-3.5" /> Crypto + card multi-rail
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {featured.map((p) => (
            <Link
              key={p.id}
              to="/shop/$slug"
              params={{ slug: p.slug }}
              className="group overflow-hidden rounded-xl border border-border bg-surface"
            >
              <div className="aspect-square overflow-hidden bg-surface-2">
                <img
                  src={p.mockupUrl}
                  alt={p.title}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  crossOrigin="anonymous"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Collections */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Collections</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STORE_COLLECTIONS.filter((c) => c.handle !== "all").map((c) => {
            const n = published.filter(c.match).length;
            return (
              <Link
                key={c.handle}
                to="/shop/collections/$handle"
                params={{ handle: c.handle }}
                className="rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface-2"
              >
                <p className="text-sm font-medium">{c.title}</p>
                <p className="mt-1 text-xs text-muted line-clamp-2">
                  {c.description}
                </p>
                <p className="mt-3 text-xs text-subtle tabular">{n} products</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Catalog */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Latest drops
            </h2>
            <p className="mt-1 text-sm text-muted">
              Live Printify inventory mirrored for factory checkout.
            </p>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/shop/collections/$handle" params={{ handle: "all" }}>
              View all
            </Link>
          </Button>
        </div>
        <ProductGrid products={published} />
      </section>
    </div>
  );
}
