import { createFileRoute } from "@tanstack/react-router";
import {
  AGENT_FEE_USD,
  corsPreflight,
  jsonOk,
  requestOrigin,
} from "@/lib/merch/agent-orders.server";
import { printifyOrderCredentials } from "@/lib/merch/printify-orders.server";
import { LIVE_PRINTIFY_PRODUCTS } from "@/lib/merch/catalog";

/**
 * Lightweight health + capability probe for agents / ops.
 * No secrets returned.
 */
export const Route = createFileRoute("/api/agent/status")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        const origin = requestOrigin(request);
        const creds = printifyOrderCredentials();
        const published = LIVE_PRINTIFY_PRODUCTS.filter(
          (p) => p.status === "published" && p.agentShopable,
        );
        return jsonOk({
          ok: true,
          protocol: "lvl-agent-order-v1",
          merch_protocol: "lvl-merch-v1",
          brand: "LVL",
          domain: "lvlltd.com",
          origin,
          agent_fee_usd: AGENT_FEE_USD,
          catalog: {
            published_skus: published.length,
            sample: published.slice(0, 3).map((p) => ({
              sku: p.sku,
              title: p.title,
              price_usd: p.priceUsd,
              printify_product_id: p.printifyProductId,
            })),
          },
          printify: {
            credentials_ready: creds.ready,
            shop_id_set: Boolean(creds.shopId),
            has_token: creds.hasToken,
            fulfill_mode: creds.ready ? "printify" : "simulated_until_env_set",
            note: creds.ready
              ? "Pay→fulfill creates real Printify orders"
              : "Set PRINTIFY_API_TOKEN + PRINTIFY_SHOP_ID on the host for live POD",
          },
          endpoints: {
            llms_txt: `${origin}/llms.txt`,
            well_known: `${origin}/.well-known/agent.json`,
            openapi: `${origin}/api/openapi.json`,
            card: `${origin}/api/agent/card`,
            catalog: `${origin}/api/store/catalog`,
            quote: `${origin}/api/agent/quote`,
            orders: `${origin}/api/agent/orders`,
            design: `${origin}/api/agent/design`,
            status: `${origin}/api/agent/status`,
          },
          shopping_loop: [
            "GET /api/agent/status",
            "GET /api/store/catalog",
            "POST /api/agent/quote",
            "POST /api/agent/orders  → keep order.token",
            "POST /api/agent/orders/{id}/pay  { method, token }",
          ],
          updated_at: new Date().toISOString(),
        });
      },
    },
  },
});
