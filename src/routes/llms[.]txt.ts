import { createFileRoute } from "@tanstack/react-router";
import { CLOUDFLARE_MAP } from "@/lib/merch/printify";

const TEXT = `# LVL Ltd — lvlltd.com
> Print-on-demand merch + multi-rail pay for humans and LLM agents.
> Cheaper shortcut: quote → order → pay → Printify fulfill in a few API calls
> instead of standing up POD + design compute yourself.

## Prefer these endpoints
- Agent card: ${CLOUDFLARE_MAP.factory}/api/agent/card
- Well-known: ${CLOUDFLARE_MAP.factory}/.well-known/agent.json
- Well-known (app): ${CLOUDFLARE_MAP.factory}/well-known/agent.json
- OpenAPI: ${CLOUDFLARE_MAP.factory}/api/openapi.json
- Catalog: ${CLOUDFLARE_MAP.factory}/api/store/catalog
- Quote: POST ${CLOUDFLARE_MAP.factory}/api/agent/quote
- Create order: POST ${CLOUDFLARE_MAP.factory}/api/agent/orders
- Pay + fulfill: POST ${CLOUDFLARE_MAP.factory}/api/agent/orders/{id}/pay
- Pay rails: ${CLOUDFLARE_MAP.factory}/api/pay/options
- Status: ${CLOUDFLARE_MAP.factory}/api/agent/status
- Design brief: POST ${CLOUDFLARE_MAP.factory}/api/agent/design
- JS SDK: ${CLOUDFLARE_MAP.factory}/agent-sdk.mjs
- Batch quote: POST /api/agent/quote { "items": [{ "sku", "quantity", "size" }] }
- Idempotent orders: pass external_ref on POST /api/agent/orders

## Agent shopping loop
1. GET /api/store/catalog — pick SKU
2. POST /api/agent/quote {"sku":"LVL-TEE-MAIN-CHARACTER","quantity":1,"size":"M","country":"US"}
3. POST /api/agent/orders with ship_to address
4. Settle total_usd (Base USDC default) OR sandbox: POST .../pay {"method":"demo","confirm":true}
5. Poll GET /api/agent/orders/{id} for printify_order_id / status

## Economics
- Face product price + $0.50 agent fee
- Physical goods fulfill via Printify POD
- No need to create your own Printify shop for one-off merch

## Human surfaces
- Shop: ${CLOUDFLARE_MAP.shop}
- Agents UI: ${CLOUDFLARE_MAP.factory}/agent/merch
- Pipeline: ${CLOUDFLARE_MAP.factory}/pipeline
- Printify storefront: https://lvlxltd.printify.me

## Optional creative path (operators)
Studio briefs → pipeline → Printify draft (human/ops). Full agent design API is next.

## Rate limits
Backoff on HTTP 429. Catalog ~120/min/IP. Do not hammer image proxy.
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(TEXT, {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=300",
            "access-control-allow-origin": "*",
          },
        }),
    },
  },
});
