import { createFileRoute } from "@tanstack/react-router";
import { listPaymentOptions } from "@/lib/factory/payment";

export const Route = createFileRoute("/api/pay/options")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const amountRaw = url.searchParams.get("amount");
        const amountUsd = amountRaw ? Number(amountRaw) : 0.05;
        const skill = url.searchParams.get("skill") ?? undefined;
        const sku = url.searchParams.get("sku") ?? undefined;
        const origin =
          request.headers.get("x-forwarded-host")
            ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("x-forwarded-host")}`
            : url.origin;

        const body = listPaymentOptions({
          amountUsd: Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0.05,
          skill,
          sku,
          origin: origin.includes("localhost") || origin.includes("127.0.0.1")
            ? "https://factory.lvlltd.com"
            : origin,
        });

        return Response.json(body, {
          headers: {
            "cache-control": "public, max-age=60",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
