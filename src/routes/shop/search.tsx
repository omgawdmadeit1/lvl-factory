import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { ShopSearch } from "@/components/store/shop-search";
import { useMerchStore } from "@/lib/merch/store";
import { filterProducts, sortProducts } from "@/lib/store/search";

export type SearchParams = { q?: string };

export const Route = createFileRoute("/shop/search")({
  component: ShopSearchPage,
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function ShopSearchPage() {
  const { q } = Route.useSearch();
  const products = useMerchStore((s) => s.products);
  const results = useMemo(() => {
    const published = products.filter((p) => p.status === "published");
    return sortProducts(filterProducts(published, q ?? ""), "featured");
  }, [products, q]);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-subtle">
          Search
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {q ? (
            <>
              Results for &ldquo;{q}&rdquo;
            </>
          ) : (
            "Search the store"
          )}
        </h1>
        <ShopSearch defaultQuery={q ?? ""} className="max-w-xl" />
        <p className="text-xs text-subtle tabular">
          {results.length} product{results.length === 1 ? "" : "s"}
          {q ? (
            <>
              {" · "}
              <Link to="/shop" className="underline-offset-2 hover:underline">
                Clear
              </Link>
            </>
          ) : null}
        </p>
      </header>
      <ProductGrid products={results} />
    </div>
  );
}
