import { createFileRoute } from "@tanstack/react-router";
import {
  buildPrintifyMockupUrl,
  imageProxyStats,
  redirectToResolved,
  resolveImageUrl,
  streamResolvedImage,
  warmImageResolutions,
} from "@/lib/store/image-proxy.server";
import { RESOLVED_MOCKUPS } from "@/lib/store/images";
import { enforceStoreEdgeWaf } from "@/lib/store/edge-waf.server";

/**
 * Optimized Printify → S3 image proxy.
 *
 * GET /api/store/image?u=<encoded url>
 * GET /api/store/image?id=&path=&slug=&rev=
 * GET /api/store/image?mode=stream&u=...   → proxy bytes (same-origin, long cache)
 * GET /api/store/image?mode=redirect&u=... → 302 to S3 (default, cheapest)
 * GET /api/store/image?stats=1            → cache stats
 * POST /api/store/image { warm: string[] } → warm resolve cache
 */
export const Route = createFileRoute("/api/store/image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = enforceStoreEdgeWaf(request, "image");
        if (denied) return denied;
        const q = new URL(request.url).searchParams;

        if (q.get("stats") === "1") {
          return Response.json({ ok: true, ...imageProxyStats() });
        }

        let target = q.get("u");
        if (!target) {
          const id = q.get("id");
          const path = q.get("path");
          const slug = q.get("slug");
          if (id && path && slug) {
            const seed = RESOLVED_MOCKUPS[slug];
            if (seed && q.get("mode") !== "resolve_only") {
              target = seed;
            } else {
              target = buildPrintifyMockupUrl({
                id,
                path,
                slug,
                rev: q.get("rev"),
                camera: q.get("camera"),
              });
            }
          }
        }

        if (!target) {
          return Response.json(
            {
              ok: false,
              error: "missing u or id/path/slug",
              usage: {
                redirect: "/api/store/image?u=<url>",
                stream: "/api/store/image?mode=stream&u=<url>",
                parts: "/api/store/image?id=&path=&slug=&rev=",
              },
            },
            { status: 400 },
          );
        }

        if (target.length > 2048) {
          return Response.json(
            { ok: false, error: "url_too_long" },
            { status: 400 },
          );
        }

        const resolved = await resolveImageUrl(target);
        if (!resolved) {
          return Response.json(
            { ok: false, error: "unable to resolve image" },
            {
              status: 404,
              headers: {
                "Cache-Control": "public, max-age=60",
                "X-Lvl-Image-Proxy": "miss",
              },
            },
          );
        }

        const mode = (q.get("mode") || "redirect").toLowerCase();

        if (mode === "json" || mode === "resolve_only") {
          return Response.json(
            {
              ok: true,
              resolved: resolved.url,
              source: resolved.source,
              cached: resolved.cached,
            },
            {
              headers: {
                "Cache-Control":
                  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
              },
            },
          );
        }

        if (mode === "stream" || mode === "proxy") {
          return streamResolvedImage(resolved.url, request);
        }

        return redirectToResolved(resolved);
      },

      POST: async ({ request }) => {
        let body: { warm?: string[] };
        try {
          body = (await request.json()) as { warm?: string[] };
        } catch {
          return Response.json(
            { ok: false, error: "invalid_json" },
            { status: 400 },
          );
        }
        const urls = Array.isArray(body.warm)
          ? body.warm.filter((u) => typeof u === "string").slice(0, 50)
          : [];
        const usingSeeds = urls.length === 0;
        const list = usingSeeds ? Object.values(RESOLVED_MOCKUPS) : urls;
        const result = await warmImageResolutions(list);
        return Response.json({
          ok: true,
          used_seeds: usingSeeds,
          ...result,
          stats: imageProxyStats(),
        });
      },
    },
  },
});
