import { createFileRoute } from "@tanstack/react-router";
import { LIVE_PRINTIFY_PRODUCTS } from "@/lib/merch/catalog";
import { buildAgentCatalog } from "@/lib/merch/agent-commerce";
import { STORE_COLLECTIONS } from "@/lib/store/collections";
import { CLOUDFLARE_MAP, LVL_NETWORK } from "@/lib/merch/printify";
import { enforceStoreEdgeWaf } from "@/lib/store/edge-waf.server";
import { productImageSrc } from "@/lib/store/images";
import { listSyncedCatalogItems } from "@/lib/merch/printify-sync.server";

export const Route = createFileRoute("/api/store/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = enforceStoreEdgeWaf(request, "catalog");
        if (denied) return denied;
        const published = LIVE_PRINTIFY_PRODUCTS.filter(
          (p) => p.status === "published",
        );
        const origin = CLOUDFLARE_MAP.factory;

        let synced: Awaited<ReturnType<typeof listSyncedCatalogItems>> = [];
        try {
          synced = await listSyncedCatalogItems(100);
        } catch {
          synced = [];
        }

        // Deduplicate by printify product id — live seed wins title/url quality
        const liveIds = new Set(
          published
            .map((p) => p.printifyProductId)
            .filter(Boolean) as string[],
        );
        const syncedOnly = synced.filter(
          (s) => !liveIds.has(s.printify_product_id),
        );

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
          products: [
            ...published.map((p) => ({
              id: p.id,
              sku: p.sku,
              slug: p.slug,
              title: p.title,
              description: p.description,
              kind: p.kind,
              price_usd: p.priceUsd,
              url: `${origin}/shop/${p.slug}`,
              mockup_url: productImageSrc({
                slug: p.slug,
                mockupUrl: p.mockupUrl,
              }),
              mockup_source: p.mockupUrl,
              printify_url: p.printifyUrl,
              agent_shopable: p.agentShopable,
              tags: p.tags,
              source: p.source ?? "printify_live",
            })),
            ...syncedOnly.map((s) => ({
              id: s.id,
              sku: s.sku,
              slug: s.slug,
              title: s.title,
              description: `Synced from Printify (${s.printify_product_id})`,
              kind: "other" as const,
              price_usd: s.price_usd,
              url: s.printify_url,
              mockup_url: null as string | null,
              mockup_source: null as string | null,
              printify_url: s.printify_url,
              agent_shopable: true,
              tags: ["printify", "synced"],
              source: s.source,
            })),
          ],
          agent_catalog: buildAgentCatalog(published, { origin }),
          sync: {
            mirrored_products: synced.length,
            extra_from_webhooks: syncedOnly.length,
            endpoint: `${origin}/api/printify/sync`,
          },
          network: LVL_NETWORK,
          security: {
            edge: "cloudflare",
            ddos: "cloudflare_unmetered",
            waf_packs: ["printify", "shop-pay"],
            image_proxy: `${origin}/api/store/image`,
            rate_limits: {
              catalog_get_per_ip_min: 120,
              image_get_per_ip_min: 240,
              pay_post_per_ip_min: 30,
            },
            note: "Backoff on HTTP 429. Do not hammer /api/store/image — use mockup_url from this catalog (often direct S3).",
          },
        });
      },
    },
  },
});
