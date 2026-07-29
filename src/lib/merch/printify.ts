/**
 * Printify + Cloudflare domain config for LVL merch.
 * Live storefront: https://lvlxltd.printify.me
 * Factory origin: factory.lvlltd.com (Cloudflare proxy → Vercel)
 *
 * API token (optional): set PRINTIFY_API_TOKEN server-side only.
 * Without a token the pipeline runs in demo mode (drafts stay local + link out).
 */

import type { PrintifyConfig } from "./types";

export const PRINTIFY_STORE = {
  slug: "lvlxltd",
  storefrontUrl: "https://lvlxltd.printify.me",
  brand: "LVL X / LVL Ltd",
  domain: "lvlltd.com",
} as const;

export const CLOUDFLARE_MAP = {
  apex: "https://lvlltd.com",
  factory: "https://factory.lvlltd.com",
  merch: "https://factory.lvlltd.com/merch",
  art: "https://factory.lvlltd.com/merch?channel=art",
  pipeline: "https://factory.lvlltd.com/pipeline",
  agentCatalog: "https://factory.lvlltd.com/agent/merch",
  printify: PRINTIFY_STORE.storefrontUrl,
  note:
    "Cloudflare proxies factory.lvlltd.com → Vercel origin. Merch UI lives on factory; POD fulfillment is Printify.",
} as const;

export function getPrintifyConfig(): PrintifyConfig {
  let hasToken = false;
  try {
    if (typeof process !== "undefined" && process.env?.PRINTIFY_API_TOKEN) {
      hasToken = process.env.PRINTIFY_API_TOKEN.trim().length > 8;
    }
  } catch {
    /* browser */
  }
  return {
    shopSlug: PRINTIFY_STORE.slug,
    storefrontUrl: PRINTIFY_STORE.storefrontUrl,
    apiBase: "https://api.printify.com/v1",
    hasToken,
    domainTargets: {
      merch: CLOUDFLARE_MAP.merch,
      art: CLOUDFLARE_MAP.art,
      factory: CLOUDFLARE_MAP.factory,
      apex: CLOUDFLARE_MAP.apex,
    },
  };
}

export function productStoreUrl(productId: string, slug: string): string {
  return `${PRINTIFY_STORE.storefrontUrl}/product/${productId}/${slug}`;
}

export function mockupCdnUrl(
  mockupId: string,
  variantPath: string,
  slug: string,
  revision?: string,
): string {
  const base = `https://images-api.printify.com/mockup/${mockupId}/${variantPath}/${slug}.jpg?camera_label=front`;
  return revision ? `${base}&revision=${revision}` : base;
}

/** Client-safe Printify API shape — real calls need a server proxy + token */
export interface PrintifyProductDraft {
  title: string;
  description: string;
  blueprint_id: number;
  print_provider_id: number;
  variants: { id: number; price: number; is_enabled: boolean }[];
  print_areas: {
    variant_ids: number[];
    placeholders: {
      position: string;
      images: {
        src?: string;
        id?: string;
        x: number;
        y: number;
        scale: number;
        angle: number;
      }[];
    }[];
  }[];
  tags: string[];
}

export function buildPrintifyDraftPayload(opts: {
  title: string;
  description: string;
  tags: string[];
  priceCents: number;
  designImageUrl?: string;
  kind: "tee" | "hoodie" | "poster" | "sticker" | "canvas" | "mug" | "other";
}): PrintifyProductDraft {
  const blueprint =
    opts.kind === "hoodie"
      ? 77
      : opts.kind === "poster"
        ? 5
        : opts.kind === "sticker"
          ? 421
          : opts.kind === "canvas"
            ? 1159
            : 6;
  return {
    title: opts.title,
    description: opts.description,
    blueprint_id: blueprint,
    print_provider_id: 99,
    variants: [{ id: 1, price: opts.priceCents, is_enabled: true }],
    print_areas: [
      {
        variant_ids: [1],
        placeholders: [
          {
            position: "front",
            images: [
              {
                src: opts.designImageUrl,
                x: 0.5,
                y: 0.5,
                scale: 1,
                angle: 0,
              },
            ],
          },
        ],
      },
    ],
    tags: opts.tags,
  };
}

/**
 * Attempt live Printify list when server token present.
 * Browser always falls back — never put the token in VITE_*.
 */
export async function fetchPrintifyProducts(
  shopId: string,
  token: string,
): Promise<unknown> {
  const res = await fetch(
    `https://api.printify.com/v1/shops/${shopId}/products.json`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json;charset=utf-8",
        "User-Agent": "LVL-Factory-Merch-Agent/1.0",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Printify ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function createPrintifyProduct(
  shopId: string,
  token: string,
  body: PrintifyProductDraft,
): Promise<unknown> {
  const res = await fetch(
    `https://api.printify.com/v1/shops/${shopId}/products.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json;charset=utf-8",
        "User-Agent": "LVL-Factory-Merch-Agent/1.0",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`Printify create ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
