import { createFileRoute } from "@tanstack/react-router";
import {
  corsPreflight,
  createAgentOrder,
  jsonErr,
  jsonOk,
  requestOrigin,
} from "@/lib/merch/agent-orders.server";
import { enforceStoreEdgeWaf } from "@/lib/store/edge-waf.server";

export const Route = createFileRoute("/api/agent/orders")({
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
        if (!body.ship_to) return jsonErr("ship_to_required", 400);

        const result = await createAgentOrder({
          sku,
          quantity:
            typeof body.quantity === "number"
              ? body.quantity
              : Number(body.quantity) || 1,
          size: typeof body.size === "string" ? body.size : undefined,
          variant_id:
            body.variant_id != null
              ? (body.variant_id as string | number)
              : undefined,
          ship_to: body.ship_to,
          buyer_ref:
            typeof body.buyer_ref === "string" ? body.buyer_ref : undefined,
          external_ref:
            typeof body.external_ref === "string"
              ? body.external_ref
              : undefined,
          rail: typeof body.rail === "string" ? body.rail : undefined,
          origin: requestOrigin(request),
        });

        if (!result.ok) {
          return jsonErr(result.error, result.status ?? 400);
        }
        return jsonOk({ ok: true, order: result.order }, 201);
      },
    },
  },
});
