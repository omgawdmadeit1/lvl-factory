import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { useMerchStore } from "@/lib/merch/store";
import {
  collectionByHandle,
  STORE_COLLECTIONS,
} from "@/lib/store/collections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/collections/$handle")({
  component: CollectionPage,
});

function CollectionPage() {
  const { handle } = Route.useParams();
  const collection = collectionByHandle(handle);
  if (!collection) throw notFound();

  const products = useMerchStore((s) => s.products);
  const filtered = useMemo(
    () =>
      products.filter((p) => p.status === "published" && collection.match(p)),
    [products, collection],
  );

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
