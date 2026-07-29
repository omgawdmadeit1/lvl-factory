import { createFileRoute } from "@tanstack/react-router";
import {
  createRemoteWebhook,
  deleteRemoteWebhook,
  getPrintifyShopId,
  getPrintifyToken,
  getWebhookPublicUrl,
  getWebhookSecret,
  getWebhookSecrets,
  installAllTopicWebhooks,
  listRemoteWebhooks,
  printifyCredentialsStatus,
  simulateRemoteWebhook,
} from "@/lib/merch/printify-api.server";
import { upsertSubscriptionMirror } from "@/lib/merch/webhooks.server";
import {
  PRINTIFY_WEBHOOK_TOPICS,
  isPrintifyTopic,
} from "@/lib/merch/webhook-topics";
import {
  processWebhookEvent,
  signPrintifyBody,
  verifyPrintifySignature,
  publicHmacView,
} from "@/lib/merch/webhooks.server";
import { enforceWebhookWaf } from "@/lib/merch/webhook-waf.server";

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export const Route = createFileRoute("/api/printify/subscriptions")({
  server: {
    handlers: {
      /** List remote Printify webhooks + local credential status */
      GET: async ({ request }) => {
        const waf = await enforceWebhookWaf(request, { path: "subscriptions" });
        if (!waf.ok) return waf.response;
        const status = printifyCredentialsStatus();
        const token = getPrintifyToken();
        const shopId = getPrintifyShopId();
        if (!token || !shopId) {
          return json({
            ok: true,
            status,
            remote: [],
            note: "Set PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID to list/install webhooks",
          });
        }
        try {
          const remote = await listRemoteWebhooks(shopId, token);
          return json({ ok: true, status, remote });
        } catch (err) {
          return json(
            {
              ok: false,
              status,
              error: err instanceof Error ? err.message : String(err),
            },
            502,
          );
        }
      },

      /**
       * Manage subscriptions:
       * { action: "install_all" }
       * { action: "create", topic, url? }
       * { action: "delete", webhookId }
       * { action: "simulate", webhookId }
       * { action: "local_simulate", topic, resource? } — inject event without Printify
       */
      POST: async ({ request }) => {
        const waf = await enforceWebhookWaf(request, { path: "subscriptions" });
        if (!waf.ok) return waf.response;
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false, error: "Invalid JSON" }, 400);
        }

        const action = String(body.action || "");
        const status = printifyCredentialsStatus();
        const token = getPrintifyToken();
        const shopId = getPrintifyShopId();
        const secret = getWebhookSecret();
        const defaultUrl = getWebhookPublicUrl();

        // Local simulate works without Printify token (for preview QA)
        if (action === "local_simulate") {
          const topic =
            typeof body.topic === "string" && isPrintifyTopic(body.topic)
              ? body.topic
              : "order:created";
          const resourceId =
            typeof body.resourceId === "string"
              ? body.resourceId
              : `sim_${Date.now()}`;
          const payload = {
            id: `local_${Date.now()}`,
            type: topic,
            created_at: new Date().toISOString(),
            resource: {
              id: resourceId,
              type: topic.startsWith("order:")
                ? "order"
                : topic.startsWith("product:")
                  ? "product"
                  : "shop",
              data: {
                shop_id: shopId ? Number(shopId) || shopId : 0,
                source: "local_simulate",
              },
            },
          };
          const raw = JSON.stringify(payload);
          // When secret is set, sign like Printify would (HMAC-SHA256)
          let signatureHeader: string | null = null;
          let signatureValid = false;
          const secrets = getWebhookSecrets();
          if (secrets.primary || secrets.previous) {
            const signWith = secrets.primary || secrets.previous!;
            signatureHeader = signPrintifyBody(raw, signWith);
            const check = verifyPrintifySignature(
              raw,
              signatureHeader,
              secrets,
            );
            signatureValid = check.valid;
          }
          const result = await processWebhookEvent(payload, {
            signatureValid,
            rawTopic: topic,
          });
          return json({
            ok: true,
            action,
            result,
            payload,
            hmac: {
              signed: Boolean(signatureHeader),
              signature_valid: signatureValid,
              header_preview: signatureHeader
                ? `${signatureHeader.slice(0, 18)}…`
                : null,
              note: secret
                ? "Signed with PRINTIFY_WEBHOOK_SECRET (parity with Printify)"
                : "No secret — event stored with signature_valid=false",
            },
            note: "Local inject only — did not call Printify",
          });
        }

        /** Full path test: sign body and POST to local webhook handler logic */
        if (action === "hmac_roundtrip") {
          const sample = {
            id: `hmac_${Date.now()}`,
            type: "product:updated",
            created_at: new Date().toISOString(),
            resource: {
              id: "hmac-test",
              type: "product",
              data: { shop_id: shopId || 0, source: "hmac_roundtrip" },
            },
          };
          const raw = JSON.stringify(sample);
          const secrets = getWebhookSecrets();
          const testSecret = secrets.primary || "dev-hmac-roundtrip-secret";
          const header = signPrintifyBody(raw, testSecret);
          const good = verifyPrintifySignature(raw, header, secrets.primary ? secrets : testSecret);
          const bad = verifyPrintifySignature(raw + "x", header, testSecret);
          const missing = verifyPrintifySignature(raw, null, testSecret);
          // Printify Python parity: full-header compare
          const fullHeaderOk = verifyPrintifySignature(
            raw,
            header,
            testSecret,
          );
          // Rotation: previous secret still accepted
          let rotation: unknown = null;
          if (secrets.previous) {
            const prevHeader = signPrintifyBody(raw, secrets.previous);
            const prevCheck = verifyPrintifySignature(raw, prevHeader, secrets);
            rotation = publicHmacView(prevCheck);
          } else {
            const fakePrev = "previous-rotation-test-secret";
            const prevHeader = signPrintifyBody(raw, fakePrev);
            const prevCheck = verifyPrintifySignature(raw, prevHeader, {
              primary: testSecret,
              previous: fakePrev,
            });
            rotation = {
              simulated: true,
              ...publicHmacView(prevCheck),
            };
          }
          if (good.valid) {
            await processWebhookEvent(sample, {
              signatureValid: true,
              rawTopic: "product:updated",
            });
          }
          return json({
            ok: good.valid && !bad.valid && !missing.valid && fullHeaderOk.valid,
            action,
            tests: {
              valid_signature: publicHmacView(good),
              tampered_body: publicHmacView(bad),
              missing_header: publicHmacView(missing),
              full_header_parity: publicHmacView(fullHeaderOk),
              rotation,
            },
            used_configured_secret: Boolean(secrets.primary),
            previous_configured: Boolean(secrets.previous),
          });
        }

        if (!token || !shopId) {
          return json(
            {
              ok: false,
              status,
              error:
                "PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID required for remote actions",
            },
            400,
          );
        }

        try {
          if (action === "install_all") {
            const url =
              typeof body.url === "string" && body.url
                ? body.url
                : defaultUrl;
            const out = await installAllTopicWebhooks({
              shopId,
              token,
              url,
              secret,
            });
            for (const wh of out.created) {
              await upsertSubscriptionMirror({
                id: wh.id,
                shop_id: String(wh.shop_id ?? shopId),
                topic: wh.topic,
                url: wh.url,
                secret_set: Boolean(secret),
                raw: wh,
              });
            }
            return json({
              ok: true,
              action,
              url,
              topics: PRINTIFY_WEBHOOK_TOPICS,
              ...out,
            });
          }

          if (action === "create") {
            const topic = String(body.topic || "");
            if (!isPrintifyTopic(topic)) {
              return json(
                {
                  ok: false,
                  error: `Invalid topic. One of: ${PRINTIFY_WEBHOOK_TOPICS.join(", ")}`,
                },
                400,
              );
            }
            const url =
              typeof body.url === "string" && body.url
                ? body.url
                : defaultUrl;
            const wh = await createRemoteWebhook(shopId, token, {
              topic,
              url,
              ...(secret ? { secret } : {}),
            });
            await upsertSubscriptionMirror({
              id: wh.id,
              shop_id: String(wh.shop_id ?? shopId),
              topic: wh.topic,
              url: wh.url,
              secret_set: Boolean(secret),
              raw: wh,
            });
            return json({ ok: true, action, webhook: wh });
          }

          if (action === "delete") {
            const webhookId = String(body.webhookId || "");
            if (!webhookId) {
              return json({ ok: false, error: "webhookId required" }, 400);
            }
            await deleteRemoteWebhook(shopId, token, webhookId);
            return json({ ok: true, action, webhookId });
          }

          if (action === "simulate") {
            const webhookId = String(body.webhookId || "");
            if (!webhookId) {
              return json({ ok: false, error: "webhookId required" }, 400);
            }
            const sim = await simulateRemoteWebhook(shopId, token, webhookId, {
              source: "lvl-factory",
              at: new Date().toISOString(),
            });
            return json({ ok: true, action, webhookId, sim });
          }

          return json(
            {
              ok: false,
              error:
                "Unknown action. Use install_all | create | delete | simulate | local_simulate",
            },
            400,
          );
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            502,
          );
        }
      },
    },
  },
});
