import { createFileRoute } from "@tanstack/react-router";
import {
  corsPreflight,
  createAgentOrder,
  jsonErr,
  jsonOk,
  listAgentOrders,
  requestOrigin,
} from "@/lib/merch/agent-orders.server";
import { enforceStoreEdgeWaf } from "@/lib/store/edge-waf.server";

export const Route = createFileRoute("/api/agent/orders")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        try {
          const denied = enforceStoreEdgeWaf(request, "store");
          if (denied) return denied;
          const url = new URL(request.url);
          const external_ref =
            url.searchParams.get("external_ref") || undefined;
          const buyer_ref = url.searchParams.get("buyer_ref") || undefined;
          const limit = Number(url.searchParams.get("limit") || "20");
          const orders = await listAgentOrders({
            external_ref,
            buyer_ref,
            limit,
            origin: requestOrigin(request),
          });
          return jsonOk({
            ok: true,
            count: orders.length,
            orders,
            note:
              "Serverless memory is per-instance; prefer external_ref + order.token for multi-hop agents.",
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return jsonErr("order_list_failed", 500, { detail: msg });
        }
      },
      POST: async ({ request }) => {
        try {
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
          return jsonOk(
            {
              ok: true,
              order: result.order,
              idempotent: result.idempotent === true,
            },
            result.idempotent ? 200 : 201,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return jsonErr("order_create_failed", 500, { detail: msg });
        }
      },
    },
  },
});
