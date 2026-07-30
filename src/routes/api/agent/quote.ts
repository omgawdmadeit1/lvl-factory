import { createFileRoute } from "@tanstack/react-router";
import {
  buildQuote,
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
        const sku = typeof body.sku === "string" ? body.sku : "";
        if (!sku) return jsonErr("sku_required", 400);
        const product = await resolveCatalogSku(sku);
        if (!product) return jsonErr("sku_not_found", 404);
        const quantity =
          typeof body.quantity === "number" ? body.quantity : Number(body.quantity) || 1;
        const size = typeof body.size === "string" ? body.size : "M";
        const country =
          typeof body.country === "string" ? body.country : "US";
        const quote = buildQuote({
          product,
          quantity,
          size,
          country,
          origin: requestOrigin(request),
        });
        return jsonOk({ ok: true, quote });
      },
    },
  },
});
