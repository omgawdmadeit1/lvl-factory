import { createFileRoute } from "@tanstack/react-router";
import {
  buildQuote,
  buildQuotes,
  corsPreflight,
  jsonErr,
  jsonOk,
  requestOrigin,
  resolveCatalogSku,
} from "@/lib/merch/agent-orders.server";
import { enforceStoreEdgeWaf } from "@/lib/store/edge-waf.server";

export const Route = createFileRoute("/api/agent/quote")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const denied = enforceStoreEdgeWaf(request, "store");
        if (denied) return denied;
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return jsonErr("invalid_json", 400);
        }

        const origin = requestOrigin(request);

        // Batch: { items: [{ sku, quantity?, size?, country? }, ...] }
        if (Array.isArray(body.items)) {
          const items = body.items.map((raw) => {
            const it = (raw || {}) as Record<string, unknown>;
            return {
              sku: typeof it.sku === "string" ? it.sku : "",
              quantity:
                typeof it.quantity === "number"
                  ? it.quantity
                  : Number(it.quantity) || 1,
              size: typeof it.size === "string" ? it.size : undefined,
              country:
                typeof it.country === "string"
                  ? it.country
                  : typeof body.country === "string"
                    ? body.country
                    : "US",
            };
          });
          const batch = await buildQuotes({ items, origin });
          if (!batch.ok) {
            return jsonErr(batch.error, batch.status ?? 400);
          }
          return jsonOk({
            ok: true,
            batch: true,
            quotes: batch.quotes,
            total_usd: batch.total_usd,
            count: batch.quotes.length,
          });
        }

        const sku = typeof body.sku === "string" ? body.sku : "";
        if (!sku) return jsonErr("sku_required_or_items", 400);
        const product = await resolveCatalogSku(sku);
        if (!product) return jsonErr("sku_not_found", 404);
        const quantity =
          typeof body.quantity === "number"
            ? body.quantity
            : Number(body.quantity) || 1;
        const size = typeof body.size === "string" ? body.size : "M";
        const country =
          typeof body.country === "string" ? body.country : "US";
        const quote = buildQuote({
          product,
          quantity,
          size,
          country,
          origin,
        });
        return jsonOk({ ok: true, quote });
      },
    },
  },
});
