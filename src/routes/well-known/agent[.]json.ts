import { createFileRoute } from "@tanstack/react-router";
import { RELAY_PROTOCOL } from "@/lib/edge/relay";
import { LVL_PAYMENT, TREASURY_EVM } from "@/lib/factory/payment";
import { MARKETPLACE_URLS } from "@/lib/marketplace/hosts";
import { AGENT_FEE_USD } from "@/lib/merch/agent-orders.server";
import { CLOUDFLARE_MAP } from "@/lib/merch/printify";

/**
 * Well-known agent discovery (app route).
 * Static mirror also at public/.well-known/agent.json for /.well-known/agent.json.
 */
export const Route = createFileRoute("/well-known/agent.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let origin: string = String(CLOUDFLARE_MAP.factory);
        try {
          const u = new URL(request.url);
          if (u.hostname === "127.0.0.1" || u.hostname === "localhost") {
            origin = u.origin;
          }
        } catch {
          /* ignore */
        }

        const body = {
          schema_version: "1.0",
          name: "LVL Agent Commerce",
          description:
            "Buy LVL merch and fulfill print-on-demand via Printify. Quote → order → pay → fulfill. Cheaper than building POD yourself.",
          website: "https://lvlltd.com",
          documentation: `${origin}/llms.txt`,
          openapi: `${origin}/api/openapi.json`,
          protocol: "lvl-agent-order-v1",
          relay: RELAY_PROTOCOL.name,
          endpoints: {
            card: `${origin}/api/agent/card`,
            catalog: `${origin}/api/store/catalog`,
            quote: `${origin}/api/agent/quote`,
            orders: `${origin}/api/agent/orders`,
            pay_options: `${origin}/api/pay/options`,
            human_shop: `${origin}/shop`,
            agent_ui: `${origin}/agent/merch`,
          },
          pricing: {
            agent_fee_usd: AGENT_FEE_USD,
            currency: "USD",
            default_rail: "base-usdc",
            treasury_evm: TREASURY_EVM,
            chain_id: LVL_PAYMENT.chainId,
          },
          capabilities: [
            "merch-catalog",
            "agent-quote",
            "agent-order",
            "payment-verify",
            "printify-pod-fulfill",
            "multi-rail-pay",
            "demo-sandbox-settle",
          ],
          preferred_hosts: [
            MARKETPLACE_URLS.factory,
            "https://api.lvlltd.com",
            MARKETPLACE_URLS.agents,
          ],
          contact: "https://lvlltd.com",
          updated_at: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=120",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
