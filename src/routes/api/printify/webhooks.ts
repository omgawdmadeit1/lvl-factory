import { createFileRoute } from "@tanstack/react-router";
import {
  getWebhookPublicUrl,
  getWebhookSecret,
  printifyCredentialsStatus,
} from "@/lib/merch/printify-api.server";
import {
  listMirroredOrders,
  listWebhookEvents,
  processWebhookEvent,
  signPrintifyBody,
  verifyPrintifyRequest,
} from "@/lib/merch/webhooks.server";
import {
  enforceWebhookWaf,
  wafStatusPublic,
} from "@/lib/merch/webhook-waf.server";
import type { PrintifyWebhookPayload } from "@/lib/merch/webhook-topics";

export const Route = createFileRoute("/api/printify/webhooks")({
  server: {
    handlers: {
      /** Health + recent events + HMAC status */
      GET: async ({ request }) => {
        const waf = await enforceWebhookWaf(request, { path: "webhooks" });
        if (!waf.ok) return waf.response;

        const url = new URL(request.url);
        const limit = Math.min(
          100,
          Math.max(1, Number(url.searchParams.get("limit") || 40) || 40),
        );

        // Optional self-check: GET ?hmac_self_test=1 signs & verifies a sample body
        if (url.searchParams.get("hmac_self_test") === "1") {
          const secret = getWebhookSecret() || "local-self-test-secret";
          const sample = JSON.stringify({
            id: "self_test",
            type: "order:created",
            resource: { id: "0", type: "order", data: {} },
          });
          const header = signPrintifyBody(sample, secret);
          const { check, decision } = verifyPrintifyRequest(
            sample,
            new Request("http://local/test", {
              method: "POST",
              headers: { "x-pfy-signature": header },
              body: sample,
            }),
            secret,
            "strict",
          );
          return Response.json({
            ok: check.valid && decision.accept,
            hmac_self_test: {
              algorithm: "sha256",
              header_format: "sha256=<hex>",
              signed: true,
              check,
              decision,
              using_configured_secret: Boolean(getWebhookSecret()),
            },
          });
        }

        try {
          const [events, orders, status] = await Promise.all([
            listWebhookEvents(limit),
            listMirroredOrders(20),
            Promise.resolve(printifyCredentialsStatus()),
          ]);
          const secret = getWebhookSecret();
          return Response.json({
            ok: true,
            endpoint: getWebhookPublicUrl(),
            path: "/api/printify/webhooks",
            status,
            hmac: {
              algorithm: "HMAC-SHA256",
              header: "X-Pfy-Signature: sha256=<hex>",
              secret_configured: Boolean(secret),
              policy:
                process.env.PRINTIFY_WEBHOOK_LOOSE === "1"
                  ? "loose"
                  : secret
                    ? "strict"
                    : "loose (no secret)",
              self_test: "GET ?hmac_self_test=1",
            },
            waf: wafStatusPublic(),
            edge: {
              ip: waf.ip,
              ray: waf.ray,
              country: waf.country,
              edge: waf.edge,
            },
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
       * Verifies HMAC-SHA256 over raw body using PRINTIFY_WEBHOOK_SECRET.
       * Header: X-Pfy-Signature: sha256=<hex>
       */
      POST: async ({ request }) => {
        const waf = await enforceWebhookWaf(request, { path: "webhooks" });
        if (!waf.ok) return waf.response;

        // Raw body must be used for HMAC — never re-JSON.stringify
        const rawBody = await request.text();
        if (rawBody.length > 512 * 1024) {
          return Response.json(
            { ok: false, error: "payload_too_large", waf: "lvl-origin" },
            { status: 413 },
          );
        }

        const secret = getWebhookSecret();
        const { check, decision } = verifyPrintifyRequest(
          rawBody,
          request,
          secret,
        );

        if (!decision.accept) {
          return Response.json(
            {
              ok: false,
              error: decision.reason,
              code: check.code,
              hmac: {
                valid: check.valid,
                policy: decision.policy,
              },
            },
            { status: 403 },
          );
        }

        let payload: PrintifyWebhookPayload;
        try {
          payload = rawBody
            ? (JSON.parse(rawBody) as PrintifyWebhookPayload)
            : {};
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
            hmac: {
              valid: check.valid,
              code: check.code,
              policy: decision.policy,
              reason: decision.reason,
            },
            edge: { ip: waf.ip, ray: waf.ray, country: waf.country },
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
