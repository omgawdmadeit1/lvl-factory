import { CLOUDFLARE_MAP, LVL_NETWORK, PRINTIFY_STORE } from "./printify";
import { productImageSrc } from "@/lib/store/images";
import type { AgentMerchListing, MerchProduct } from "./types";

/**
 * Machine-readable catalog for shopping agents.
 * Humans use /shop; agents fetch this document, /api/store/catalog, or /agent/merch UI.
 */
export function buildAgentCatalog(
  products: MerchProduct[],
  opts?: { origin?: string; generatedAt?: string },
): AgentMerchListing {
  const origin = opts?.origin ?? CLOUDFLARE_MAP.factory;

  const shopable = products.filter(
    (p) => p.agentShopable && p.status === "published",
  );

  return {
    protocol: "lvl-merch-v1",
    domain: "lvlltd.com",
    shop: {
      human: `${origin}/shop`,
      printify: PRINTIFY_STORE.storefrontUrl,
      agentCatalog: `${origin}/agent/merch`,
      pay: `${origin}/pay`,
    },
    cloudflare: {
      apex: CLOUDFLARE_MAP.apex,
      factory: CLOUDFLARE_MAP.factory,
      note: CLOUDFLARE_MAP.note,
    },
    payment: {
      multi_rail: true,
      default_rail: "base-usdc",
      mainnets_only: true,
      stripe: true,
    },
    products: shopable.map((p) => ({
      sku: p.sku,
      title: p.title,
      price_usd: p.priceUsd,
      kind: p.kind,
      mockup: productImageSrc({ slug: p.slug, mockupUrl: p.mockupUrl }),
      printify_url: p.printifyUrl,
      agent_buy: `${origin}/pay?sku=${encodeURIComponent(p.sku)}&amount=${p.priceUsd}`,
      settlement: p.settlement,
      tags: p.tags,
    })),
    generated_at: opts?.generatedAt ?? "factory.lvlltd.com",
  };
}

export function agentBuyInstructions(product: MerchProduct): string[] {
  return [
    `SKU ${product.sku} — ${product.title}`,
    `Face price: ${product.priceUsd.toFixed(2)} USD (multi-rail crypto or Stripe)`,
    `Human store: ${CLOUDFLARE_MAP.shop}/${product.slug}`,
    `Human checkout: /shop or Printify ${product.printifyUrl ?? PRINTIFY_STORE.storefrontUrl}`,
    `Agent crypto: open /pay?sku=${product.sku}&amount=${product.priceUsd} and settle mainnet rails (Base USDC default)`,
    `Catalog API: GET /api/store/catalog`,
    `Default payTo EVM: ${product.settlement.payTo}`,
    `Protocol: x402 multi-rail — no testnets`,
    product.printifyUrl
      ? `POD fulfillment: Printify product page (ship to end customer)`
      : `POD draft — publish via /pipeline before fulfillment`,
  ];
}

export const AGENT_PROTOCOL_README = `# LVL Merch Agent Protocol (lvl-merch-v1)

Domain family: ${LVL_NETWORK.brand} · lvlltd.com (Cloudflare) · factory.lvlltd.com · Printify: lvlxltd.printify.me

## Discover
GET /shop                    → human storefront (Shopify-style)
GET /api/store/catalog       → machine catalog + collections + agent block
GET /agent/merch             → human-readable + JSON export

## Buy (crypto / multi-rail)
1. Pick SKU from catalog
2. Navigate /pay?sku=SKU&amount=PRICE
3. Choose mainnet + asset (or Stripe card)
4. Settle to treasury; no testnets

## Fulfillment
Physical goods fulfill via Printify POD storefront links.
Digital proof / agent receipts stay under factory.lvlltd.com.

## Edge / WAF
Traffic to factory.lvlltd.com is proxied via Cloudflare (unmetered DDoS + WAF packs).
Rate limits apply to /api/store/* and /pay; agents should backoff on 429.

## Pipeline (operators / agents with write intent)
1. brief → 2. grok_imagine → 3. mockup → 4. printify_draft → 5. review → 6. published
UI: /pipeline
` as const;
