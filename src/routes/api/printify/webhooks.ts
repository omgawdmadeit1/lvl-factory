import { createFileRoute } from "@tanstack/react-router";
import {
  getWebhookPublicUrl,
  getWebhookSecrets,
  printifyCredentialsStatus,
} from "@/lib/merch/printify-api.server";
import {
  listMirroredOrders,
  listWebhookEvents,
  listRejectedWebhooks,
  processWebhookEvent,
  recordRejectedWebhook,
  signPrintifyBody,
  verifyPrintifyRequest,
  publicHmacView,
  checkEventFreshness,
  readRawWebhookBody,
} from "@/lib/merch/webhooks.server";
import {
  enforceWebhookWaf,
  wafStatusPublic,
} from "@/lib/merch/webhook-waf.server";
import type { PrintifyWebhookPayload } from "@/lib/merch/webhook-topics";
import {
  getSyncDashboard,
  listMirroredProducts,
} from "@/lib/merch/printify-sync.server";

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

        if (url.searchParams.get("hmac_self_test") === "1") {
          const secrets = getWebhookSecrets();
          const secret = secrets.primary || "local-self-test-secret";
          const sample = JSON.stringify({
            id: "self_test",
            type: "order:created",
            created_at: new Date().toISOString(),
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
            secrets.primary ? secrets : secret,
            "strict",
          );

          let rotation: unknown = null;
          if (secrets.previous) {
            const prevHeader = signPrintifyBody(sample, secrets.previous);
            const prev = verifyPrintifyRequest(
              sample,
              new Request("http://local/test", {
                method: "POST",
                headers: { "x-pfy-signature": prevHeader },
              }),
              secrets,
              "strict",
            );
            rotation = {
              previous_accepted: prev.decision.accept,
              matched_slot: prev.check.matchedSlot,
            };
          }

          return Response.json({
            ok: check.valid && decision.accept,
            hmac_self_test: {
              algorithm: "sha256",
              header_format: "sha256=<hex>",
              signed: true,
              check: publicHmacView(check),
              decision,
              rotation,
              using_configured_secret: Boolean(secrets.primary),
              previous_configured: Boolean(secrets.previous),
            },
          });
        }

        try {
          const [events, orders, rejects, status, products, sync] =
            await Promise.all([
              listWebhookEvents(limit),
              listMirroredOrders(20),
              listRejectedWebhooks(15),
              Promise.resolve(printifyCredentialsStatus()),
              listMirroredProducts(30),
              getSyncDashboard(),
            ]);
          const secrets = getWebhookSecrets();
          return Response.json({
            ok: true,
            endpoint: getWebhookPublicUrl(),
            path: "/api/printify/webhooks",
            status,
            hmac: {
              algorithm: "HMAC-SHA256",
              header: "X-Pfy-Signature: sha256=<hex>",
              secret_configured: Boolean(secrets.primary),
              previous_configured: Boolean(secrets.previous),
              policy:
                process.env.PRINTIFY_WEBHOOK_LOOSE === "1"
                  ? "loose"
                  : secrets.primary || secrets.previous
                    ? "strict"
                    : "loose (no secret)",
              compare: "timingSafeEqual(digest bytes) + full header parity",
              max_age_sec:
                Number(process.env.PRINTIFY_WEBHOOK_MAX_AGE_SEC) || 0,
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
            rejects,
            products,
            sync,
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
       * Verifies HMAC-SHA256 over raw body (UTF-8) with primary/previous secrets.
       * Header: X-Pfy-Signature: sha256=<hex>
       */
      POST: async ({ request }) => {
        const waf = await enforceWebhookWaf(request, { path: "webhooks" });
        if (!waf.ok) return waf.response;

        const bodyRead = await readRawWebhookBody(request, 512 * 1024);
        if (!bodyRead.ok) {
          await recordRejectedWebhook({
            code: bodyRead.code,
            reason: bodyRead.reason,
            ip: waf.ip,
            ray: waf.ray,
          });
          return Response.json(
            { ok: false, error: bodyRead.reason, code: bodyRead.code },
            { status: 413 },
          );
        }
        const { raw: rawBody, bytes } = bodyRead;

        const secrets = getWebhookSecrets();
        const { check, decision } = verifyPrintifyRequest(
          bytes,
          request,
          secrets,
        );

        if (!decision.accept) {
          await recordRejectedWebhook({
            code: check.code,
            reason: decision.reason,
            ip: waf.ip,
            ray: waf.ray,
            rawBody,
          });
          return Response.json(
            {
              ok: false,
              error: decision.reason,
              code: check.code,
              hmac: {
                ...publicHmacView(check),
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
          await recordRejectedWebhook({
            code: "invalid_json",
            reason: "Invalid JSON body",
            ip: waf.ip,
            ray: waf.ray,
            rawBody,
          });
          return Response.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400 },
          );
        }

        const fresh = checkEventFreshness(payload);
        if (!fresh.ok) {
          await recordRejectedWebhook({
            code: fresh.code,
            reason: fresh.reason,
            ip: waf.ip,
            ray: waf.ray,
            rawBody,
            topic: typeof payload.type === "string" ? payload.type : null,
          });
          return Response.json(
            {
              ok: false,
              error: fresh.reason,
              code: fresh.code,
              age_sec: fresh.ageSec,
            },
            { status: 403 },
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
              ...publicHmacView(check),
              policy: decision.policy,
              accept_reason: decision.reason,
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
