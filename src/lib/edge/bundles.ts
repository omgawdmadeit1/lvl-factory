/**
 * Curated multi-SKU bundles with demo stack discounts.
 */
export type BundleItem = {
  productSlug: string;
  qty: number;
  label: string;
};

export type MerchBundle = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  items: BundleItem[];
  /** Stack discount percent (face sum * (1 - discount/100)) */
  discountPct: number;
  badge: string;
  accent: "info" | "warning" | "success";
};

export const BUNDLE_CATALOG: MerchBundle[] = [
  {
    id: "bundle-starter-signal",
    slug: "starter-signal",
    title: "Starter Signal Pack",
    blurb: "Main Character dual plate — entry stack for the network.",
    items: [
      { productSlug: "main-character", qty: 1, label: "MAIN CHARACTER" },
      { productSlug: "main-character-2", qty: 1, label: "MAIN CHARACTER 2" },
    ],
    discountPct: 12,
    badge: "Starter",
    accent: "info",
  },
  {
    id: "bundle-city-orbit",
    slug: "city-orbit",
    title: "City Orbit Duo",
    blurb: "Boston Native mark + Soft Era art plate for dual-channel flex.",
    items: [
      {
        productSlug: "boston-native-logo-t-shirt",
        qty: 1,
        label: "Boston Native tee",
      },
      { productSlug: "soft-era", qty: 1, label: "SOFT ERA print" },
    ],
    discountPct: 15,
    badge: "City",
    accent: "success",
  },
  {
    id: "bundle-agent-core",
    slug: "agent-core",
    title: "Agent Core Kit",
    blurb: "Agent-shopable statement drops for human + bot dual checkout.",
    items: [
      { productSlug: "serotonin-dealer", qty: 1, label: "SEROTONIN DEALER" },
      { productSlug: "main-character", qty: 1, label: "MAIN CHARACTER" },
      {
        productSlug: "copy-of-boston-native-logo-t-shirt",
        qty: 1,
        label: "Boston Native alt",
      },
    ],
    discountPct: 18,
    badge: "Agent",
    accent: "warning",
  },
];

export function bundleFaceTotal(
  prices: Record<string, number>,
  bundle: MerchBundle,
): { face: number; pay: number; save: number } {
  let face = 0;
  for (const item of bundle.items) {
    const unit = prices[item.productSlug] ?? 0;
    face += unit * item.qty;
  }
  const pay = Math.round(face * (1 - bundle.discountPct / 100) * 100) / 100;
  const save = Math.round((face - pay) * 100) / 100;
  return { face, pay, save };
}
