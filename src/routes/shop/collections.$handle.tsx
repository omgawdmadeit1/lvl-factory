import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMerchStore } from "@/lib/merch/store";
import {
  collectionByHandle,
  STORE_COLLECTIONS,
} from "@/lib/store/collections";
import { BRAND_ART, COLLECTION_COVERS } from "@/lib/store/images";
import {
  filterProducts,
  sortProducts,
  type SortKey,
} from "@/lib/store/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/collections/$handle")({
  component: CollectionPage,
});

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "featured", label: "Featured" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "title", label: "Title" },
];

function CollectionPage() {
  const { handle } = Route.useParams();
  const collection = collectionByHandle(handle);

  const products = useMerchStore((s) => s.products);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");

  const filtered = useMemo(() => {
    if (!collection) return [];
    const base = products.filter(
      (p) => p.status === "published" && collection.match(p),
    );
    return sortProducts(filterProducts(base, query), sort);
  }, [products, collection, query, sort]);

  if (!collection) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Collection not found
        </h1>
        <p className="text-sm text-muted">
          No collection named &ldquo;{handle}&rdquo;.
        </p>
        <Button asChild>
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const cover = COLLECTION_COVERS[handle] ?? BRAND_ART.collectionTees;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-border shadow-soft">
        <img
          src={cover}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="eager"
        />
        <div className="hero-scrim absolute inset-0" />
        <div className="hero-scrim-bottom absolute inset-x-0 bottom-0 h-3/4" />
        <div className="relative z-[1] flex min-h-[180px] flex-col justify-end gap-2 p-6 sm:min-h-[220px] sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Collection
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {collection.title}
          </h1>
          <p className="max-w-xl text-sm text-muted">{collection.description}</p>
          <p className="text-xs text-subtle tabular">
            {filtered.length} product{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
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
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                sort === s.key
                  ? "border-border-strong bg-surface-2 text-fg"
                  : "border-border text-muted hover:bg-surface",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
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
                ? "border-border-strong bg-surface-2 text-fg"
                : "border-border text-muted hover:bg-surface",
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
