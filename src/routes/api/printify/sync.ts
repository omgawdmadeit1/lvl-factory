import { createFileRoute } from "@tanstack/react-router";
import { enforceWebhookWaf } from "@/lib/merch/webhook-waf.server";
import {
  getSyncDashboard,
  listMirroredProducts,
  listSyncRuns,
  runFullPrintifySync,
  syncProductsFromApi,
  syncRemoteSubscriptions,
} from "@/lib/merch/printify-sync.server";
import { printifyCredentialsStatus } from "@/lib/merch/printify-api.server";

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

/**
 * Printify sync control plane.
 * GET  — dashboard + mirrored products + recent runs
 * POST — { action: "full" | "products" | "subscriptions" }
 */
export const Route = createFileRoute("/api/printify/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const waf = await enforceWebhookWaf(request, { path: "sync" });
        if (!waf.ok) return waf.response;

        try {
          const url = new URL(request.url);
          const limit = Math.min(
            100,
            Math.max(1, Number(url.searchParams.get("limit") || 40) || 40),
          );
          const [dashboard, products, runs] = await Promise.all([
            getSyncDashboard(),
            listMirroredProducts(limit),
            listSyncRuns(15),
          ]);
          return json({
            ok: true,
            status: printifyCredentialsStatus(),
            dashboard,
            products,
            runs,
          });
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            500,
          );
        }
      },

      POST: async ({ request }) => {
        const waf = await enforceWebhookWaf(request, { path: "sync" });
        if (!waf.ok) return waf.response;

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }

        const action = String(body.action || "full");

        try {
          if (action === "subscriptions") {
            const summary = await syncRemoteSubscriptions();
            return json({ ok: summary.ok, action, summary });
          }
          if (action === "products") {
            const summary = await syncProductsFromApi();
            return json({ ok: summary.ok, action, summary });
          }
          if (action === "full" || action === "sync") {
            const out = await runFullPrintifySync();
            return json({
              ok: out.combined.ok,
              action: "full",
              ...out,
            });
          }
          return json(
            {
              ok: false,
              error: "Unknown action. Use full | products | subscriptions",
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
