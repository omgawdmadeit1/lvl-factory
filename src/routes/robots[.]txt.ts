import { createFileRoute } from "@tanstack/react-router";
import { CLOUDFLARE_MAP } from "@/lib/merch/printify";

const TEXT = `User-agent: *
Allow: /

# LLM / agent discovery
Allow: /llms.txt
Allow: /.well-known/agent.json
Allow: /api/openapi.json
Allow: /api/agent/
Allow: /api/store/catalog
Allow: /shop
Allow: /agent/merch

Sitemap: ${CLOUDFLARE_MAP.factory}/api/store/catalog
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(TEXT, {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        }),
    },
  },
});
