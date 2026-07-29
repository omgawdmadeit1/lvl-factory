import type { MerchProduct, MerchProductKind } from "@/lib/merch/types";

export interface StoreCollection {
  handle: string;
  title: string;
  description: string;
  /** Filter predicate */
  match: (p: MerchProduct) => boolean;
}

export const STORE_COLLECTIONS: StoreCollection[] = [
  {
    handle: "all",
    title: "All products",
    description: "Full LVL drop — tees, art, and agent-ready merch.",
    match: () => true,
  },
  {
    handle: "tees",
    title: "Tees",
    description: "Statement and logo tees. Print-on-demand, ships via Printify.",
    match: (p) => p.kind === "tee",
  },
  {
    handle: "art",
    title: "Art & prints",
    description: "Editorial posters and wall drops for factory energy.",
    match: (p) =>
      p.kind === "poster" || p.kind === "canvas" || p.tags.includes("art"),
  },
  {
    handle: "statement",
    title: "Statement",
    description: "Typography drops that read across a room.",
    match: (p) => p.tags.includes("statement") || p.tags.includes("main-character"),
  },
  {
    handle: "agent",
    title: "Agent shopable",
    description: "SKUs with multi-rail settlement for autonomous buyers.",
    match: (p) => p.agentShopable,
  },
  {
    handle: "boston",
    title: "Boston Native",
    description: "City mark drop — Boston energy, LVL finish.",
    match: (p) => p.tags.includes("boston") || p.sku.includes("BOSTON"),
  },
];

export function collectionByHandle(handle: string): StoreCollection | undefined {
  return STORE_COLLECTIONS.find((c) => c.handle === handle);
}

export function kindLabel(kind: MerchProductKind): string {
  switch (kind) {
    case "tee":
      return "T-Shirt";
    case "hoodie":
      return "Hoodie";
    case "poster":
      return "Poster";
    case "canvas":
      return "Canvas";
    case "sticker":
      return "Sticker";
    case "mug":
      return "Mug";
    default:
      return "Product";
  }
}

/** Shopify-style money format for storefront */
export function storeMoney(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usd);
}
