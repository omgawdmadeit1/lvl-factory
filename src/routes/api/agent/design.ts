import { createFileRoute } from "@tanstack/react-router";
import {
  corsPreflight,
  jsonErr,
  jsonOk,
  requestOrigin,
  sealOrder,
} from "@/lib/merch/agent-orders.server";
import { enforceStoreEdgeWaf } from "@/lib/store/edge-waf.server";
import { LIVE_PRINTIFY_PRODUCTS } from "@/lib/merch/catalog";

/**
 * Agent creative workflow: brief → print-ready Imagine prompt package.
 */
export const Route = createFileRoute("/api/agent/design")({
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

        const title =
          typeof body.title === "string" && body.title.trim()
            ? body.title.trim().slice(0, 80)
            : "LVL custom drop";
        const concept =
          typeof body.concept === "string" && body.concept.trim()
            ? body.concept.trim().slice(0, 500)
            : title;
        const productKind =
          typeof body.kind === "string" ? body.kind.trim().toLowerCase() : "tee";
        const style =
          typeof body.style === "string"
            ? body.style.trim().slice(0, 80)
            : "streetwear graphic";
        const blankSku =
          typeof body.blank_sku === "string" ? body.blank_sku.trim() : null;

        const blank =
          (blankSku &&
            LIVE_PRINTIFY_PRODUCTS.find(
              (p) => p.sku.toUpperCase() === blankSku.toUpperCase(),
            )) ||
          LIVE_PRINTIFY_PRODUCTS.find(
            (p) => p.kind === productKind && p.status === "published",
          ) ||
          LIVE_PRINTIFY_PRODUCTS.find((p) => p.status === "published");

        const designId = `adesign_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const imaginePrompt = [
          `${title} — ${concept}`,
          `Apparel-safe ${productKind} print design, ${style}, high contrast, centered composition`,
          "print-ready graphic, clean edges, no photoreal faces, no watermark, transparent-background feel",
          "LVL brand energy, street-ready, 300dpi equivalent",
        ].join(". ");

        const design = {
          id: designId,
          protocol: "lvl-agent-design-v1",
          ticket_kind: "design_ticket" as const,
          title,
          concept,
          product_kind: productKind,
          style,
          imagine_prompt: imaginePrompt,
          negative_prompt:
            "blurry, watermark, low-res, busy background, photoreal person, neon purple gradient, emoji spam",
          aspect_ratio: productKind === "poster" ? "4:5" : "1:1",
          print_safe_notes:
            "Keep solid blacks; 0.25in safe margin from seams; max chest print ~10in on adult tee.",
          palette: ["#0a0a0b", "#f4f4f5", "#a1a1aa"],
          suggested_blank: blank
            ? {
                sku: blank.sku,
                title: blank.title,
                price_usd: blank.priceUsd,
                printify_product_id: blank.printifyProductId,
              }
            : null,
          created_at: new Date().toISOString(),
        };

        const token = sealOrder(design);

        const origin = requestOrigin(request);
        return jsonOk(
          {
            ok: true,
            design,
            token,
            next_steps: [
              "Render art with any image model using imagine_prompt (or open /studio)",
              blank
                ? `POST /api/agent/quote {"sku":"${blank.sku}","quantity":1,"size":"M"}`
                : "POST /api/agent/quote with a catalog SKU",
              "POST /api/agent/orders with ship_to, attach design.id in buyer_ref",
              "POST /api/agent/orders/{id}/pay with order.token",
              `Human pipeline: ${origin}/pipeline · Studio: ${origin}/studio`,
            ],
            cheaper_than_diy: {
              thesis:
                "Skip Printify onboarding + blank selection — reuse LVL live blanks + $0.50 agent fee.",
            },
          },
          201,
        );
      },
    },
  },
});
