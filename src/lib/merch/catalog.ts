import { settlementBlock } from "@/lib/factory/payment";
import { productStoreUrl, mockupCdnUrl } from "./printify";
import type { ImagineBrief, MerchProduct } from "./types";

function brief(
  partial: Omit<ImagineBrief, "id"> & { id?: string },
): ImagineBrief {
  return {
    id: partial.id ?? `brief-${partial.title.toLowerCase().replace(/\s+/g, "-")}`,
    ...partial,
  };
}

/** Live products scraped from lvlxltd.printify.me (prices in store cents → USD) */
export const LIVE_PRINTIFY_PRODUCTS: MerchProduct[] = [
  {
    id: "pfy-30465259",
    sku: "LVL-TEE-BOSTON-NATIVE",
    slug: "boston-native-logo-t-shirt",
    title: "Boston Native Logo T-Shirt",
    description:
      "LVL X Boston Native mark on a heavy unisex tee. Street-ready, print-on-demand via Printify.",
    kind: "tee",
    priceUsd: 25.99,
    status: "published",
    channel: "both",
    printifyUrl: productStoreUrl("30465259", "boston-native-logo-t-shirt"),
    printifyProductId: "6a6a3fb4b321eb70a0045515",
    mockupUrl: mockupCdnUrl(
      "6a6a3fb4b321eb70a0045515",
      "73207/98445",
      "boston-native-logo-t-shirt",
      "1785348102318",
    ),
    designUrl: null,
    brief: brief({
      title: "Boston Native Logo",
      concept: "City-native wordmark for LVL Boston energy — bold, high contrast, tee-safe.",
      imaginePrompt:
        "Bold black and white Boston Native logo wordmark for streetwear t-shirt print, clean vector emblem, high contrast, centered composition, transparent background feel, print-ready apparel graphic, no photoreal faces, sharp edges, LVL brand energy",
      negativePrompt: "blurry, watermark, low-res, busy background, photoreal person",
      style: "vector streetwear emblem",
      palette: ["#0a0a0b", "#f4f4f5", "#a1a1aa"],
      aspectRatio: "1:1",
      printSafeNotes: "Keep solid blacks; 300dpi equivalent; 0.25in safe margin from seams.",
      tags: ["boston", "logo", "tee", "lvl"],
    }),
    tags: ["tee", "logo", "boston", "live"],
    agentShopable: true,
    settlement: settlementBlock(25.99),
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    progress: 100,
    notes: "Live on Printify storefront",
    source: "printify_live",
  },
  {
    id: "pfy-30465298",
    sku: "LVL-TEE-BOSTON-NATIVE-ALT",
    slug: "copy-of-boston-native-logo-t-shirt",
    title: "Boston Native Logo T-Shirt (Alt)",
    description: "Alternate Boston Native logo placement — same mark, second colorway/mock path.",
    kind: "tee",
    priceUsd: 25.99,
    status: "published",
    channel: "both",
    printifyUrl: productStoreUrl(
      "30465298",
      "copy-of-boston-native-logo-t-shirt",
    ),
    printifyProductId: "6a6a4017f22eef59540f9ae2",
    mockupUrl: mockupCdnUrl(
      "6a6a4017f22eef59540f9ae2",
      "73207/98445",
      "copy-of-boston-native-logo-t-shirt",
      "1785349894495",
    ),
    designUrl: null,
    brief: brief({
      title: "Boston Native Logo Alt",
      concept: "Secondary print placement for Boston Native logo drop.",
      imaginePrompt:
        "Alternate Boston Native logo tee graphic, inverted contrast option, clean apparel print, high contrast monochrome",
      negativePrompt: "blurry, watermark",
      style: "vector streetwear",
      palette: ["#0a0a0b", "#e4e4e7"],
      aspectRatio: "1:1",
      printSafeNotes: "Center chest placement.",
      tags: ["boston", "logo", "alt"],
    }),
    tags: ["tee", "logo", "boston", "live"],
    agentShopable: true,
    settlement: settlementBlock(25.99),
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    progress: 100,
    notes: "Live on Printify",
    source: "printify_live",
  },
  {
    id: "pfy-28713892",
    sku: "LVL-TEE-MAIN-CHARACTER",
    slug: "main-character",
    title: "MAIN CHARACTER",
    description:
      "Main character energy — statement tee for agents and humans who ship in public.",
    kind: "tee",
    priceUsd: 29.99,
    status: "published",
    channel: "both",
    printifyUrl: productStoreUrl("28713892", "main-character"),
    printifyProductId: "69a230baf7fc1928080dd1cd",
    mockupUrl: mockupCdnUrl(
      "69a230baf7fc1928080dd1cd",
      "12124/92570",
      "main-character",
      "1779087736987",
    ),
    designUrl: null,
    brief: brief({
      title: "Main Character",
      concept: "Bold typographic MAIN CHARACTER drop — soft irony, hard presence.",
      imaginePrompt:
        "Typography-first streetwear design reading MAIN CHARACTER, bold condensed sans, centered chest print, high contrast black on light garment mock, editorial poster type treatment, print-ready",
      negativePrompt: "clutter, emoji, neon purple, low contrast",
      style: "editorial typography tee",
      palette: ["#09090b", "#fafafa", "#71717a"],
      aspectRatio: "1:1",
      printSafeNotes: "Max type width ~10in on adult tee.",
      tags: ["main-character", "typography", "tee"],
    }),
    tags: ["tee", "statement", "live"],
    agentShopable: true,
    settlement: settlementBlock(29.99),
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    progress: 100,
    notes: "Live on Printify",
    source: "printify_live",
  },
  {
    id: "pfy-28713891",
    sku: "LVL-TEE-MAIN-CHARACTER-2",
    slug: "main-character-2",
    title: "MAIN CHARACTER (Variant)",
    description: "Second MAIN CHARACTER mockup / colorway from the live store.",
    kind: "tee",
    priceUsd: 29.99,
    status: "published",
    channel: "both",
    printifyUrl: productStoreUrl("28713891", "main-character"),
    printifyProductId: "69a230d87fc2996b8d0a4091",
    mockupUrl: mockupCdnUrl(
      "69a230d87fc2996b8d0a4091",
      "12124/92570",
      "main-character",
      "1779087737347",
    ),
    designUrl: null,
    brief: brief({
      title: "Main Character Variant",
      concept: "Colorway variant of MAIN CHARACTER tee.",
      imaginePrompt:
        "MAIN CHARACTER tee graphic alternate colorway, bold type, print-ready apparel design",
      negativePrompt: "blurry",
      style: "typography tee",
      palette: ["#121214", "#f4f4f5"],
      aspectRatio: "1:1",
      printSafeNotes: "Same plate as primary.",
      tags: ["main-character", "variant"],
    }),
    tags: ["tee", "statement", "live"],
    agentShopable: true,
    settlement: settlementBlock(29.99),
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    progress: 100,
    notes: "Live on Printify",
    source: "printify_live",
  },
  {
    id: "pfy-28713890",
    sku: "LVL-TEE-SEROTONIN",
    slug: "serotonin-dealer",
    title: "SEROTONIN DEALER",
    description: "Soft threat, hard drip. Serotonin Dealer statement tee.",
    kind: "tee",
    priceUsd: 29.99,
    status: "published",
    channel: "both",
    printifyUrl: productStoreUrl("28713890", "serotonin-dealer"),
    printifyProductId: "69a2887e1ec5ca402c03157c",
    mockupUrl: mockupCdnUrl(
      "69a2887e1ec5ca402c03157c",
      "12124/92570",
      "serotonin-dealer",
      "1779087737553",
    ),
    designUrl: null,
    brief: brief({
      title: "Serotonin Dealer",
      concept: "Tongue-in-cheek chemistry of good vibes as contraband branding.",
      imaginePrompt:
        "SEROTONIN DEALER bold streetwear text graphic, pharmaceutical-adjacent minimal icon optional, high contrast monochrome apparel print, centered, print-ready",
      negativePrompt: "drug paraphernalia realistic, gore, low-res",
      style: "statement typography",
      palette: ["#0a0a0b", "#e4e4e7", "#a1a1aa"],
      aspectRatio: "1:1",
      printSafeNotes: "Keep type large; avoid fine serifs under 6pt equivalent.",
      tags: ["serotonin", "statement"],
    }),
    tags: ["tee", "statement", "live"],
    agentShopable: true,
    settlement: settlementBlock(29.99),
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    progress: 100,
    notes: "Live on Printify",
    source: "printify_live",
  },
  {
    id: "pfy-28713888",
    sku: "LVL-ART-SOFT-ERA",
    slug: "soft-era",
    title: "SOFT ERA",
    description:
      "Soft Era art drop — poster/apparel energy for the calmer chapter. Higher retail face.",
    kind: "poster",
    priceUsd: 32.99,
    status: "published",
    channel: "both",
    printifyUrl: productStoreUrl("28713888", "soft-era"),
    printifyProductId: "69a288b146730b56700a03de",
    mockupUrl: mockupCdnUrl(
      "69a288b146730b56700a03de",
      "45150/1530",
      "soft-era",
      "1779087737469",
    ),
    designUrl: null,
    brief: brief({
      title: "Soft Era",
      concept: "Muted editorial art piece — soft era as a visual mood, not a slogan dump.",
      imaginePrompt:
        "SOFT ERA editorial art print, muted near-monochrome palette, quiet luxury street poster, large type with breathing space, gallery poster composition, print-ready 4:5",
      negativePrompt: "neon, clutter, purple gradient, emoji",
      style: "editorial art poster",
      palette: ["#121214", "#a1a1aa", "#f4f4f5"],
      aspectRatio: "4:5",
      printSafeNotes: "Poster bleed 0.125in; keep type out of trim.",
      tags: ["soft-era", "art", "poster"],
    }),
    tags: ["art", "poster", "live"],
    agentShopable: true,
    settlement: settlementBlock(32.99),
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    progress: 100,
    notes: "Live on Printify",
    source: "printify_live",
  },
];

/** Grok Imagine design seeds ready for the agent pipeline */
export const IMAGINE_SEED_BRIEFS: ImagineBrief[] = [
  brief({
    id: "brief-agent-protocol",
    title: "Agent Protocol Mark",
    concept:
      "Minimal LVL agent commerce glyph — x402-ready brand mark for tees and stickers agents can resell.",
    imaginePrompt:
      "Minimal monochrome agent protocol emblem for streetwear, abstract geometric node network forming letter L, high contrast black ink on pure white field, vector-clean edges, no text, print-ready apparel graphic, centered, professional brand mark",
    negativePrompt:
      "photoreal, neon purple, gradient mesh, blurry, watermark, cluttered, emoji, 3d chrome",
    style: "geometric brand mark",
    palette: ["#09090b", "#fafafa", "#71717a"],
    aspectRatio: "1:1",
    printSafeNotes: "Works at 2in sticker and 10in chest print. Single color plate preferred.",
    tags: ["agent", "protocol", "mark", "lvl"],
  }),
  brief({
    id: "brief-cloudflare-edge",
    title: "Edge Node Poster",
    concept:
      "Cloudflare-edge inspired abstract art for factory.lvlltd.com merch — network lattice without corporate logos.",
    imaginePrompt:
      "Abstract edge-network art poster, dark charcoal field, sparse silver lattice nodes, quiet atmospheric depth, editorial tech art, no logos, no text, gallery print 4:5, refined monochrome",
    negativePrompt: "corporate logo, Cloudflare logo, neon cyberpunk overload, purple, low-res",
    style: "editorial tech art",
    palette: ["#09090b", "#1a1a1e", "#c8ccd4"],
    aspectRatio: "4:5",
    printSafeNotes: "Poster 18x24; keep focal mass in center 70%.",
    tags: ["edge", "art", "poster", "cloudflare-mood"],
  }),
  brief({
    id: "brief-lvl-void",
    title: "LVL Void Hoodie",
    concept: "Heavy void hoodie front mark — quiet luxury black-on-black energy for agents.",
    imaginePrompt:
      "Subtle tonal LVL wordmark for black hoodie, near-black on black emboss feel, minimal tracking, luxury streetwear placement, no flashy colors, print-ready soft contrast graphic",
    negativePrompt: "bright colors, neon, busy pattern, cartoon",
    style: "tonal luxury streetwear",
    palette: ["#0a0a0b", "#222228", "#a1a1aa"],
    aspectRatio: "1:1",
    printSafeNotes: "Use puff or soft plastisol; mock as tonal.",
    tags: ["hoodie", "lvl", "tonal"],
  }),
];

export function defaultBlueprintForKind(
  kind: MerchProduct["kind"],
): { label: string; priceUsd: number } {
  switch (kind) {
    case "hoodie":
      return { label: "Pullover hoodie", priceUsd: 42 };
    case "poster":
      return { label: "Matte poster", priceUsd: 24 };
    case "sticker":
      return { label: "Sticker pack", priceUsd: 8 };
    case "canvas":
      return { label: "Gallery canvas", priceUsd: 48 };
    case "mug":
      return { label: "Ceramic mug", priceUsd: 18 };
    default:
      return { label: "Unisex tee", priceUsd: 26 };
  }
}
