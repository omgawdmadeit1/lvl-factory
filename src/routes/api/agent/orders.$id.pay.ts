import { createFileRoute } from "@tanstack/react-router";
import {
  corsPreflight,
  jsonErr,
  jsonOk,
  payAndFulfillAgentOrder,
  requestOrigin,
  type PayInput,
} from "@/lib/merch/agent-orders.server";
import { enforceStoreEdgeWaf } from "@/lib/store/edge-waf.server";

export const Route = createFileRoute("/api/agent/orders/$id/pay")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request, params }) => {
        const denied = enforceStoreEdgeWaf(request, "pay");
        if (denied) return denied;
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
        const pay: PayInput = {
          method:
            body.method === "demo" ||
            body.method === "stripe" ||
            body.method === "crypto"
              ? body.method
              : undefined,
          tx_hash: typeof body.tx_hash === "string" ? body.tx_hash : undefined,
          rail: typeof body.rail === "string" ? body.rail : undefined,
          confirm: body.confirm === true,
          stripe_session_id:
            typeof body.stripe_session_id === "string"
              ? body.stripe_session_id
              : undefined,
          force_simulate_printify: body.force_simulate_printify === true,
          token: typeof body.token === "string" ? body.token : undefined,
        };
        const result = await payAndFulfillAgentOrder(
          params.id,
          pay,
          requestOrigin(request),
        );
        if (!result.ok) {
          return jsonErr(result.error, result.status ?? 400, {
            order: result.order ?? null,
          });
        }
        return jsonOk({ ok: true, order: result.order });
      },
    },
  },
});
