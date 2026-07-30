import { createFileRoute } from "@tanstack/react-router";
import {
  corsPreflight,
  getAgentOrder,
  jsonErr,
  jsonOk,
  requestOrigin,
} from "@/lib/merch/agent-orders.server";
import { enforceStoreEdgeWaf } from "@/lib/store/edge-waf.server";

export const Route = createFileRoute("/api/agent/orders/$id")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request, params }) => {
        const denied = enforceStoreEdgeWaf(request, "store");
        if (denied) return denied;
        const order = await getAgentOrder(params.id, requestOrigin(request));
        if (!order) return jsonErr("order_not_found", 404);
        return jsonOk({ ok: true, order });
      },
    },
  },
});
