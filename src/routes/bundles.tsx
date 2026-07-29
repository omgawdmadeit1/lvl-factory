import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, Package } from "lucide-react";
import { toast } from "sonner";
import { VisualHero } from "@/components/brand/visual-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BUNDLE_CATALOG,
  bundleFaceTotal,
  type MerchBundle,
} from "@/lib/edge/bundles";
import { creditsForSpend, useLoyaltyStore } from "@/lib/edge/loyalty";
import { usePulseStore } from "@/lib/edge/pulse";
import { useMerchStore } from "@/lib/merch/store";
import { useCartStore } from "@/lib/store/cart";
import { BRAND_ART, LOCAL_MOCKUPS } from "@/lib/store/images";
import { storeMoney } from "@/lib/store/collections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bundles")({
  head: () => ({
    meta: [
      { title: "Bundles — LVL stack packs | lvlltd.com" },
      {
        name: "description",
        content:
          "Curated multi-SKU merch bundles with stack discounts on the LVL network.",
      },
    ],
  }),
  component: BundlesPage,
});

function BundleCard({ bundle }: { bundle: MerchBundle }) {
  const products = useMerchStore((s) => s.products);
  const add = useCartStore((s) => s.add);
  const earn = useLoyaltyStore((s) => s.earn);
  const push = usePulseStore((s) => s.push);

  const prices: Record<string, number> = {};
  for (const p of products) {
    if (p.status === "published") prices[p.slug] = p.priceUsd;
  }
  const { face, pay, save } = bundleFaceTotal(prices, bundle);
  const heroSlug = bundle.items[0]?.productSlug;
  const img =
    (heroSlug && LOCAL_MOCKUPS[heroSlug]) || BRAND_ART.collectionTees;

  function addBundle() {
    let added = 0;
    for (const item of bundle.items) {
      const product = products.find(
        (p) => p.slug === item.productSlug && p.status === "published",
      );
      if (!product) continue;
      add(product, { qty: item.qty });
      added += item.qty;
    }
    if (!added) {
      toast.error("Bundle items unavailable");
      return;
    }
    const bonus = Math.max(8, Math.floor(creditsForSpend(pay) * 0.15));
    earn(bonus, `Bundle · ${bundle.title}`, "earn");
    push({
      kind: "purchase",
      host: "shop.lvlltd.com",
      message: `Stacked ${bundle.title} · save ${storeMoney(save)}`,
      meta: "bundle",
    });
    toast.success(`${bundle.title} added · ${storeMoney(save)} saved on face`);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <img
          src={img}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/20 to-transparent" />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          <Badge
            variant={
              bundle.accent === "warning"
                ? "warning"
                : bundle.accent === "success"
                  ? "success"
                  : "info"
            }
          >
            {bundle.badge}
          </Badge>
          <Badge variant="default">−{bundle.discountPct}%</Badge>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{bundle.title}</h2>
          <p className="mt-1 text-sm text-muted">{bundle.blurb}</p>
        </div>
        <ul className="space-y-1.5 text-xs text-muted">
          {bundle.items.map((it) => (
            <li key={it.productSlug} className="flex items-center gap-2">
              <Package className="size-3.5 shrink-0" />
              <span>
                {it.qty}× {it.label}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-xs text-subtle line-through tabular">
              {storeMoney(face)}
            </p>
            <p className="text-xl font-semibold tabular tracking-tight">
              {storeMoney(pay)}
            </p>
            <p className="text-xs text-success">Save {storeMoney(save)}</p>
          </div>
          <Button type="button" onClick={addBundle}>
            <Layers className="size-4" />
            Add stack
          </Button>
        </div>
      </div>
    </article>
  );
}

function BundlesPage() {
  return (
    <div className="space-y-8">
      <VisualHero
        image={BRAND_ART.collectionAgent}
        eyebrow="bundles.lvlltd.com · stack discounts"
        title="Curated LVL stacks"
        description="Multi-SKU packs with built-in face discounts — human cart or agent settle after checkout."
        actions={
          <>
            <Button asChild>
              <Link to="/shop">Browse singles</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/drops">Live drops</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUNDLE_CATALOG.map((b) => (
          <BundleCard key={b.id} bundle={b} />
        ))}
      </div>

      <p
        className={cn(
          "rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted",
        )}
      >
        Stack discount is demo-applied as loyalty bonus + face comparison; cart
        lines keep unit prices for multi-rail settle honesty.
      </p>
    </div>
  );
}
