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
      agent_quote: `${origin}/api/agent/quote`,
      agent_order: `${origin}/api/agent/orders`,
      settlement: p.settlement,
      tags: p.tags,
    })),
    generated_at: opts?.generatedAt ?? "factory.lvlltd.com",
  };
}

export function agentBuyInstructions(product: MerchProduct): string[] {
  return [
    `SKU ${product.sku} — ${product.title}`,
    `Face price: ${product.priceUsd.toFixed(2)} USD + $0.50 agent fee`,
    `1) POST /api/agent/quote {"sku":"${product.sku}","quantity":1,"size":"M"}`,
    `2) POST /api/agent/orders with ship_to`,
    `3) POST /api/agent/orders/{id}/pay with tx_hash OR {"method":"demo","confirm":true}`,
    `Human store: ${CLOUDFLARE_MAP.shop}/${product.slug}`,
    `OpenAPI: /api/openapi.json · Discovery: /llms.txt`,
    `Default payTo EVM: ${product.settlement.payTo}`,
    product.printifyUrl
      ? `POD: Printify product ${product.printifyUrl}`
      : `POD draft — publish via /pipeline before fulfillment`,
  ];
}

export const AGENT_PROTOCOL_README = `# LVL Merch Agent Protocol (lvl-merch-v1 + lvl-agent-order-v1)

Domain family: ${LVL_NETWORK.brand} · lvlltd.com (Cloudflare) · factory.lvlltd.com · Printify: lvlxltd.printify.me

## Discover
GET /llms.txt
GET /.well-known/agent.json
GET /api/openapi.json
GET /api/agent/card
GET /api/store/catalog
GET /agent/merch

## Buy (agent API — preferred)
1. POST /api/agent/quote  { "sku", "quantity", "size", "country" }
2. POST /api/agent/orders { "sku", "size", "quantity", "ship_to", "buyer_ref?" }
3. Settle total_usd (Base USDC default) OR sandbox demo pay
4. POST /api/agent/orders/{id}/pay
   - crypto: { "method":"crypto", "tx_hash":"0x...", "rail":"base-usdc" }
   - demo:   { "method":"demo", "confirm":true }
5. GET /api/agent/orders/{id} → printify_order_id / status

## Buy (human / legacy pay UI)
1. Pick SKU from catalog
2. Navigate /pay?sku=SKU&amount=PRICE
3. Choose mainnet + asset (or Stripe card)

## Economics
Face product price + $0.50 agent fee. Cheaper than standing up Printify + design compute.

## Fulfillment
Payment verification triggers Printify order create when credentials are configured;
otherwise simulated fulfillment for sandbox (status: simulated_fulfillment).
Webhooks mirror production status into the factory.

## Edge / WAF
Backoff on 429. Rate limits on /api/store/* and agent order endpoints.
` as const;
