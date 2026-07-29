import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/brand/visual-hero";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { ShopSearch } from "@/components/store/shop-search";
import { TrustStrip } from "@/components/store/trust-strip";
import { Button } from "@/components/ui/button";
import { useMerchStore } from "@/lib/merch/store";
import { STORE_COLLECTIONS } from "@/lib/store/collections";
import {
  BRAND_ART,
  COLLECTION_COVERS,
  prefetchProductImages,
} from "@/lib/store/images";
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
      <section className="grid items-stretch gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-soft">
          <img
            src={BRAND_ART.heroNetwork}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="hero-scrim absolute inset-0" />
          <div className="hero-scrim-bottom absolute inset-x-0 bottom-0 h-3/4" />
          <div className="relative z-[1] flex min-h-[280px] flex-col justify-end gap-4 p-6 sm:min-h-[320px] sm:p-8">
            <div className="flex items-center gap-2">
              <BrandMark size="sm" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                LVL Store · Printify POD
              </p>
            </div>
            <h1 className="max-w-md text-3xl font-semibold tracking-tight text-fg sm:text-4xl lg:leading-[1.1]">
              Merch & art built for humans and agents
            </h1>
            <p className="max-w-md text-sm text-muted sm:text-base">
              Live drops on factory.lvlltd.com — Imagine-designed apparel,
              Printify fulfillment, multi-rail checkout.
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
            <ul className="flex flex-wrap gap-4 pt-1 text-xs text-subtle">
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          {featured.map((p, i) => (
            <Link
              key={p.id}
              to="/shop/$slug"
              params={{ slug: p.slug }}
              className={cn(
                "group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-[transform,box-shadow] duration-200 hover:shadow-lift",
                i === 0 && "row-span-2",
              )}
            >
              <div
                className={cn(
                  "overflow-hidden bg-surface-2",
                  i === 0 ? "aspect-[4/5] h-full min-h-[200px]" : "aspect-square",
                )}
              >
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
            const cover =
              COLLECTION_COVERS[c.handle] ?? BRAND_ART.collectionTees;
            return (
              <Link
                key={c.handle}
                to="/shop/collections/$handle"
                params={{ handle: c.handle }}
                className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-[transform,box-shadow] duration-200 hover:shadow-lift"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
                  <img
                    src={cover}
                    alt=""
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/40 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-sm font-medium text-fg">{c.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {c.description}
                  </p>
                  <p className="mt-2 text-xs text-subtle tabular">
                    {n} products
                  </p>
                </div>
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
              Imagine-rendered mockups · Printify inventory mirrored for
              checkout.
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

      <section className="relative overflow-hidden rounded-2xl border border-border">
        <img
          src={BRAND_ART.softEraArt}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-35"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-bg/75" />
        <div className="relative z-[1] grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">
              Editorial
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              Soft Era & statement drops
            </h2>
            <p className="text-sm text-muted">
              Gallery-ready prints and typography tees designed in Grok Imagine,
              pushed through the merch pipeline to Printify.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:justify-end">
            <Button asChild>
              <Link to="/shop/collections/$handle" params={{ handle: "art" }}>
                Shop art
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link
                to="/shop/collections/$handle"
                params={{ handle: "statement" }}
              >
                Statement tees
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">FAQ</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-surface shadow-soft">
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
