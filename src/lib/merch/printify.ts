/**
 * Printify + Cloudflare domain config for LVL merch & marketplace.
 * Live POD: https://lvlxltd.printify.me
 * Commerce: factory.lvlltd.com + shop/pay/account/… subdomains
 */

import type { PrintifyConfig } from "./types";
import { MARKETPLACE_HOSTS, MARKETPLACE_URLS } from "@/lib/marketplace/hosts";

export const PRINTIFY_STORE = {
  slug: "lvlxltd",
  storefrontUrl: "https://lvlxltd.printify.me",
  brand: "LVL X / LVL Ltd",
  domain: "lvlltd.com",
} as const;

export const CLOUDFLARE_MAP = {
  apex: "https://lvlltd.com",
  www: "https://www.lvlltd.com",
  hub: MARKETPLACE_URLS.hub,
  factory: "https://factory.lvlltd.com",
  /** Dedicated storefront host (also path on factory) */
  shop: MARKETPLACE_URLS.shop,
  shopPath: "https://factory.lvlltd.com/shop",
  merch: "https://factory.lvlltd.com/shop",
  art: "https://factory.lvlltd.com/shop/collections/art",
  tees: "https://factory.lvlltd.com/shop/collections/tees",
  checkout: MARKETPLACE_URLS.checkout,
  account: MARKETPLACE_URLS.account,
  orders: MARKETPLACE_URLS.orders,
  seller: MARKETPLACE_URLS.seller,
  admin: MARKETPLACE_URLS.admin,
  agents: MARKETPLACE_URLS.agents,
  labs: MARKETPLACE_URLS.labs,
  exchange: MARKETPLACE_URLS.exchange,
  fleet: MARKETPLACE_URLS.fleet,
  music: MARKETPLACE_URLS.music,
  pipeline: "https://factory.lvlltd.com/pipeline",
  agentCatalog: "https://factory.lvlltd.com/agent/merch",
  agentApi: MARKETPLACE_URLS.catalogApi,
  pay: MARKETPLACE_URLS.pay,
  webhooks: "https://factory.lvlltd.com/webhooks",
  printify: PRINTIFY_STORE.storefrontUrl,
  note:
    "Cloudflare: lvlltd.com hub + marketplace subdomains (shop, pay, checkout, account, orders, seller, admin, agents, labs, exchange, fleet, music, api) → same Vercel origin as factory.lvlltd.com. POD = Printify.",
} as const;

/** Subdomain / path roles for docs and agent discovery */
export const LVL_NETWORK = {
  brand: "LVL Ltd",
  legal: "LVL X, Inc.",
  domains: MARKETPLACE_HOSTS.map((h) => ({
    host: h.host,
    role: h.role,
    description: h.description,
    surface: h.surface,
    homePath: h.homePath,
    audience: h.audience,
    ...(h.host === "factory.lvlltd.com"
      ? {
          paths: {
            shop: "/shop",
            cart: "/shop/cart",
            checkout: "/checkout",
            account: "/account",
            orders: "/orders",
            marketplace: "/marketplace",
            labs: "/labs",
            exchange: "/exchange",
            fleet: "/fleet",
            syndicate: "/syndicate",
            launch: "/launch",
            bounty: "/bounty",
            vault: "/vault",
            signal: "/signal",
            arena: "/arena",
            forge: "/forge",
            guild: "/guild",
            whisper: "/whisper",
            quest: "/quest",
            ledger: "/ledger",
            oracle: "/oracle",
            drops: "/drops",
            bundles: "/bundles",
            radar: "/radar",
            pulse: "/pulse",
            studio: "/studio",
            relay: "/relay",
            seller: "/seller",
            agent: "/agent/merch",
            pay: "/pay",
            pipeline: "/pipeline",
            webhooks: "/api/printify/webhooks",
            catalog_api: "/api/store/catalog",
            agent_card: "/api/agent/card",
          },
        }
      : {}),
  })),
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
      merch: CLOUDFLARE_MAP.shopPath,
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
