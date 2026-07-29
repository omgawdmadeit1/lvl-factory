import { createFileRoute } from "@tanstack/react-router";
import { LIVE_PRINTIFY_PRODUCTS } from "@/lib/merch/catalog";
import { buildAgentCatalog } from "@/lib/merch/agent-commerce";
import { STORE_COLLECTIONS } from "@/lib/store/collections";
import { CLOUDFLARE_MAP } from "@/lib/merch/printify";

export const Route = createFileRoute("/api/store/catalog")({
  server: {
    handlers: {
      GET: async () => {
        const published = LIVE_PRINTIFY_PRODUCTS.filter(
          (p) => p.status === "published",
        );
        const origin = CLOUDFLARE_MAP.factory;
        return Response.json({
          ok: true,
          store: {
            name: "LVL Store",
            brand: "LVL Ltd",
            domain: "lvlltd.com",
            storefront: `${origin}/shop`,
            printify: "https://lvlxltd.printify.me",
            agent: `${origin}/agent/merch`,
            pay: `${origin}/pay`,
          },
          collections: STORE_COLLECTIONS.map((c) => ({
            handle: c.handle,
            title: c.title,
            description: c.description,
            url: `${origin}/shop/collections/${c.handle}`,
            count: published.filter(c.match).length,
          })),
          products: published.map((p) => ({
            id: p.id,
            sku: p.sku,
            slug: p.slug,
            title: p.title,
            description: p.description,
            kind: p.kind,
            price_usd: p.priceUsd,
            url: `${origin}/shop/${p.slug}`,
            mockup_url: p.mockupUrl,
            printify_url: p.printifyUrl,
            agent_shopable: p.agentShopable,
            tags: p.tags,
          })),
          agent_catalog: buildAgentCatalog(published, { origin }),
        });
      },
    },
  },
});
