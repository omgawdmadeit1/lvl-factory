import { createFileRoute } from "@tanstack/react-router";
import { RELAY_PROTOCOL } from "@/lib/edge/relay";
import { LVL_PAYMENT, TREASURY_EVM } from "@/lib/factory/payment";
import { MARKETPLACE_HOSTS, MARKETPLACE_URLS } from "@/lib/marketplace/hosts";
import { AGENT_FEE_USD } from "@/lib/merch/agent-orders.server";
import { printifyOrderCredentials } from "@/lib/merch/printify-orders.server";

/**
 * Machine-readable agent capability card for the LVL network.
 */
export const Route = createFileRoute("/api/agent/card")({
  server: {
    handlers: {
      GET: async () => {
        const creds = printifyOrderCredentials();
        const body = {
          protocol: RELAY_PROTOCOL.name,
          order_protocol: "lvl-agent-order-v1",
          design_protocol: "lvl-agent-design-v1",
          version: RELAY_PROTOCOL.version,
          brand: "LVL",
          domain: "lvlltd.com",
          description:
            "LVL multi-rail merch + agent shopping. Quote SKUs, create orders, verify payment, fulfill Printify POD — cheaper than building from scratch.",
          discovery: {
            llms_txt: "https://factory.lvlltd.com/llms.txt",
            robots_txt: "https://factory.lvlltd.com/robots.txt",
            well_known: "https://factory.lvlltd.com/.well-known/agent.json",
            well_known_app: "https://factory.lvlltd.com/well-known/agent.json",
            openapi: "https://factory.lvlltd.com/api/openapi.json",
            status: "https://factory.lvlltd.com/api/agent/status",
          },
          endpoints: {
            catalog: "/api/store/catalog",
            catalogAbsolute: MARKETPLACE_URLS.catalogApi,
            quote: "/api/agent/quote",
            orders: "/api/agent/orders",
            orderById: "/api/agent/orders/{id}",
            payAndFulfill: "/api/agent/orders/{id}/pay",
            design: "/api/agent/design",
            status: "/api/agent/status",
            payOptions: "/api/pay/options",
            imageProxy: "/api/store/image",
            card: "/api/agent/card",
            cardAbsolute: MARKETPLACE_URLS.agentCard,
            openapi: "/api/openapi.json",
            humanShop: "/shop",
            agentConsole: "/agent/merch",
            drops: "/drops",
            studio: "/studio",
            settle: "/pay",
            checkout: "/checkout",
          },
          pricing: {
            agent_fee_usd: AGENT_FEE_USD,
            thesis:
              "Face merch + $0.50 agent fee vs Printify setup + design compute + eng time",
          },
          printify: {
            credentials_ready: creds.ready,
            fulfill_mode: creds.ready ? "printify" : "simulated_until_env_set",
          },
          settlement: {
            label: LVL_PAYMENT.label,
            defaultChainId: LVL_PAYMENT.chainId,
            defaultAsset: "USDC",
            treasury_evm: TREASURY_EVM,
            rails: [
              "base",
              "ethereum",
              "solana",
              "arbitrum",
              "optimism",
              "polygon",
              "stripe",
              "demo",
            ],
          },
          hosts: MARKETPLACE_HOSTS.filter(
            (h) => h.surface !== "printify_external",
          ).map((h) => ({
            host: h.host,
            surface: h.surface,
            homePath: h.homePath,
            audience: h.audience,
            publicUrl: h.publicUrl,
          })),
          capabilities: [
            "lvl-merch-v1-catalog",
            "lvl-agent-order-v1",
            "lvl-agent-design-v1",
            "sealed-order-token",
            "multi-rail-settle",
            "printify-pod",
            "agent-quote",
            "agent-order",
            "payment-verify",
            "printify-fulfill",
            "design-brief",
          ],
          agent_shopping_steps: [
            "GET /api/agent/status",
            "GET /api/store/catalog",
            "POST /api/agent/quote",
            "POST /api/agent/orders  (save order.token)",
            "POST /api/agent/orders/{id}/pay  { method, token }",
          ],
          steps: RELAY_PROTOCOL.steps,
          updatedAt: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=30",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
