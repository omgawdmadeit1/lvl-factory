import type { MerchProduct } from "@/lib/merch/types";

export type SortKey = "featured" | "price_asc" | "price_desc" | "title";

export function filterProducts(
  products: MerchProduct[],
  query: string,
): MerchProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => {
    const hay = [
      p.title,
      p.description,
      p.sku,
      p.slug,
      p.kind,
      ...p.tags,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function sortProducts(
  products: MerchProduct[],
  sort: SortKey,
): MerchProduct[] {
  const list = [...products];
  switch (sort) {
    case "price_asc":
      return list.sort((a, b) => a.priceUsd - b.priceUsd);
    case "price_desc":
      return list.sort((a, b) => b.priceUsd - a.priceUsd);
    case "title":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list;
  }
}
