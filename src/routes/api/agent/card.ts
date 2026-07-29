import { createFileRoute } from "@tanstack/react-router";
import { RELAY_PROTOCOL } from "@/lib/edge/relay";
import { LVL_PAYMENT } from "@/lib/factory/payment";
import { MARKETPLACE_HOSTS, MARKETPLACE_URLS } from "@/lib/marketplace/hosts";

/**
 * Machine-readable agent capability card for the LVL network.
 * Agents discover rails, catalog, and settlement entrypoints.
 */
export const Route = createFileRoute("/api/agent/card")({
  server: {
    handlers: {
      GET: async () => {
        const body = {
          protocol: RELAY_PROTOCOL.name,
          version: RELAY_PROTOCOL.version,
          brand: "LVL",
          domain: "lvlltd.com",
          description:
            "LVL multi-rail merch + skill commerce. Humans and agents share catalog, drops, stacks, and settlement.",
          endpoints: {
            catalog: "/api/store/catalog",
            catalogAbsolute: MARKETPLACE_URLS.catalogApi,
            payOptions: "/api/pay/options",
            imageProxy: "/api/store/image",
            card: "/api/agent/card",
            cardAbsolute: MARKETPLACE_URLS.agentCard,
            humanShop: "/shop",
            drops: "/drops",
            bundles: "/bundles",
            radar: "/radar",
            relay: "/relay",
            pulse: "/pulse",
            studio: "/studio",
            settle: "/pay",
            checkout: "/checkout",
            loyalty: "/account",
          },
          settlement: {
            label: LVL_PAYMENT.label,
            defaultChainId: LVL_PAYMENT.chainId,
            defaultAsset: "USDC",
            rails: [
              "base",
              "ethereum",
              "solana",
              "arbitrum",
              "optimism",
              "polygon",
              "stripe",
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
            "lvl-relay-v1-intent",
            "multi-rail-settle",
            "printify-pod",
            "live-drops",
            "stack-bundles",
            "restock-radar",
            "loyalty-credits",
            "gift-checkout",
            "price-holds",
            "fit-assistant",
            "imagine-studio-briefs",
            "network-pulse",
            "command-palette",
          ],
          steps: RELAY_PROTOCOL.steps,
          updatedAt: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=60",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
