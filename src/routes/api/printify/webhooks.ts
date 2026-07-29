import { createFileRoute } from "@tanstack/react-router";
import {
  getWebhookPublicUrl,
  printifyCredentialsStatus,
} from "@/lib/merch/printify-api.server";
import {
  listMirroredOrders,
  listWebhookEvents,
  processWebhookEvent,
  requireSignatureInProduction,
  verifyPrintifySignature,
  getWebhookSecretOrUndefined,
} from "@/lib/merch/webhooks.server";
import type { PrintifyWebhookPayload } from "@/lib/merch/webhook-topics";

export const Route = createFileRoute("/api/printify/webhooks")({
  server: {
    handlers: {
      /** Health + recent events (operator / agents) */
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(
          100,
          Math.max(1, Number(url.searchParams.get("limit") || 40) || 40),
        );
        try {
          const [events, orders, status] = await Promise.all([
            listWebhookEvents(limit),
            listMirroredOrders(20),
            Promise.resolve(printifyCredentialsStatus()),
          ]);
          return Response.json({
            ok: true,
            endpoint: getWebhookPublicUrl(),
            path: "/api/printify/webhooks",
            status,
            events,
            orders,
          });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
              endpoint: getWebhookPublicUrl(),
            },
            { status: 500 },
          );
        }
      },

      /**
       * Inbound Printify webhook delivery.
       * Header: X-Pfy-Signature: sha256=<hmac>
       * Body: JSON event envelope
       */
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const secret = getWebhookSecretOrUndefined();
        const sig =
          request.headers.get("x-pfy-signature") ||
          request.headers.get("X-Pfy-Signature");

        const check = verifyPrintifySignature(rawBody, sig, secret);
        const accept = requireSignatureInProduction(
          check.valid,
          Boolean(secret),
        );

        if (!accept) {
          return Response.json(
            { ok: false, error: check.reason },
            { status: 403 },
          );
        }

        let payload: PrintifyWebhookPayload;
        try {
          payload = rawBody ? (JSON.parse(rawBody) as PrintifyWebhookPayload) : {};
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400 },
          );
        }

        try {
          const result = await processWebhookEvent(payload, {
            signatureValid: check.valid,
            rawTopic:
              typeof payload.type === "string" ? payload.type : undefined,
          });
          return Response.json({
            ok: true,
            id: result.eventId,
            notes: result.notes,
            signature: check.reason,
          });
        } catch (err) {
          console.error("[printify webhook]", err);
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
