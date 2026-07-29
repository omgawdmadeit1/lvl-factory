import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { Input } from "@/components/ui/input";
import { useMerchStore } from "@/lib/merch/store";
import {
  collectionByHandle,
  STORE_COLLECTIONS,
} from "@/lib/store/collections";
import {
  filterProducts,
  sortProducts,
  type SortKey,
} from "@/lib/store/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/collections/$handle")({
  component: CollectionPage,
});

function CollectionPage() {
  const { handle } = Route.useParams();
  const collection = collectionByHandle(handle);
  if (!collection) throw notFound();

  const products = useMerchStore((s) => s.products);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");

  const filtered = useMemo(() => {
    const base = products.filter(
      (p) => p.status === "published" && collection.match(p),
    );
    return sortProducts(filterProducts(base, query), sort);
  }, [products, collection, query, sort]);

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-subtle">
          Collection
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {collection.title}
        </h1>
        <p className="text-sm text-muted">{collection.description}</p>
        <p className="text-xs text-subtle tabular">
          {filtered.length} product{filtered.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this collection"
            className="min-h-11 pl-10"
            aria-label="Search products"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
          >
            <option value="featured">Featured</option>
            <option value="price_asc">Price · low to high</option>
            <option value="price_desc">Price · high to low</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {STORE_COLLECTIONS.map((c) => (
          <Link
            key={c.handle}
            to="/shop/collections/$handle"
            params={{ handle: c.handle }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              c.handle === handle
                ? "border-fg bg-fg text-bg"
                : "border-border text-muted hover:border-border-strong hover:text-fg",
            )}
          >
            {c.title}
          </Link>
        ))}
      </div>

      <ProductGrid products={filtered} />
    </div>
  );
}
