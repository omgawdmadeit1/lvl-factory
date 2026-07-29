import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { ShopSearch } from "@/components/store/shop-search";
import { TrustStrip } from "@/components/store/trust-strip";
import { Button } from "@/components/ui/button";
import { useMerchStore } from "@/lib/merch/store";
import { STORE_COLLECTIONS } from "@/lib/store/collections";
import { prefetchProductImages } from "@/lib/store/images";
import { useRecentStore } from "@/lib/store/recent";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/")({
  component: ShopHomePage,
});

const FAQ = [
  {
    q: "How does fulfillment work?",
    a: "Physical goods ship print-on-demand through Printify. You can also buy on the Printify Pop-Up storefront.",
  },
  {
    q: "Can agents buy?",
    a: "Yes. Use GET /api/store/catalog (lvl-merch-v1) and settle multi-rail at /pay with the SKU face price.",
  },
  {
    q: "Which chains are supported?",
    a: "Mainnets only: Ethereum, Base (default rail), Solana, Arbitrum, Optimism, Polygon — plus Stripe card.",
  },
  {
    q: "Where is the store hosted?",
    a: "factory.lvlltd.com behind Cloudflare (DDoS + WAF). Origin is the LVL Factory app.",
  },
] as const;

function ShopHomePage() {
  const products = useMerchStore((s) => s.products);
  const recentSlugs = useRecentStore((s) => s.slugs);
  const published = useMemo(
    () => products.filter((p) => p.status === "published"),
    [products],
  );
  const featured = published.slice(0, 4);
  const recent = useMemo(
    () =>
      recentSlugs
        .map((slug) => published.find((p) => p.slug === slug))
        .filter(Boolean)
        .slice(0, 4) as typeof published,
    [recentSlugs, published],
  );
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    prefetchProductImages(
      published.map((p) => ({ slug: p.slug, mockupUrl: p.mockupUrl })),
    );
  }, [published]);

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">
            LVL Store · Printify POD
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl lg:leading-[1.1]">
            Merch & art built for humans and agents
          </h1>
          <p className="max-w-lg text-base text-muted">
            Live drops on factory.lvlltd.com — Printify fulfillment, multi-rail
            checkout, and an agent-readable catalog.
          </p>
          <ShopSearch className="max-w-md" />
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
              <Truck className="size-3.5" /> POD ships worldwide
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
                <ProductImage
                  slug={p.slug}
                  mockupUrl={p.mockupUrl}
                  alt={p.title}
                  priority
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <TrustStrip />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Collections</h2>
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
                <p className="mt-1 line-clamp-2 text-xs text-muted">
                  {c.description}
                </p>
                <p className="mt-3 text-xs text-subtle tabular">{n} products</p>
              </Link>
            );
          })}
        </div>
      </section>

      {recent.length ? (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Recently viewed
          </h2>
          <ProductGrid products={recent} />
        </section>
      ) : null}

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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">FAQ</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium hover:bg-surface-2"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                >
                  {item.q}
                  <span className="text-subtle tabular">{open ? "−" : "+"}</span>
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-muted">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
