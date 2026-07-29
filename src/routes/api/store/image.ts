import { createFileRoute } from "@tanstack/react-router";

/**
 * Printify images-api often returns empty body + x-automaton-object-url.
 * This proxy resolves to the real JPEG (S3) so storefront <img> tags work.
 *
 * GET /api/store/image?u=<encoded images-api or any https printify URL>
 * GET /api/store/image?id=&path=&slug=&rev=  (build printify mockup URL)
 */
const ALLOWED_HOSTS = new Set([
  "images-api.printify.com",
  "pfy-prod-automaton-cache.s3.us-east-2.amazonaws.com",
  "printify-mockup.s3.amazonaws.com",
  "images.printify.com",
]);

function isAllowed(url: URL): boolean {
  if (ALLOWED_HOSTS.has(url.hostname)) return true;
  if (url.hostname.endsWith(".printify.com")) return true;
  if (url.hostname.endsWith(".amazonaws.com") && url.hostname.includes("printify"))
    return true;
  if (
    url.hostname.endsWith(".amazonaws.com") &&
    url.pathname.includes("/mockup/")
  )
    return true;
  return false;
}

async function resolvePrintifyImage(target: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !isAllowed(url)) return null;

  // Already a direct S3 object with content — return as-is
  if (url.hostname.includes("amazonaws.com")) {
    return url.toString();
  }

  try {
    const head = await fetch(url.toString(), {
      method: "HEAD",
      redirect: "follow",
      headers: {
        Accept: "image/jpeg,image/*,*/*",
        "User-Agent": "LVL-Store-Image-Proxy/1.0",
      },
    });
    const objectUrl = head.headers.get("x-automaton-object-url");
    if (objectUrl && objectUrl.startsWith("https://")) {
      return objectUrl;
    }
    // Some CDNs return the image on GET with body
    if (
      head.ok &&
      Number(head.headers.get("content-length") || 0) > 1000
    ) {
      return url.toString();
    }
    // Fallback GET to read headers again
    const get = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "image/jpeg,image/*,*/*",
        "User-Agent": "LVL-Store-Image-Proxy/1.0",
      },
    });
    const objectUrl2 = get.headers.get("x-automaton-object-url");
    if (objectUrl2?.startsWith("https://")) return objectUrl2;
    if (get.ok && Number(get.headers.get("content-length") || 0) > 1000) {
      return url.toString();
    }
  } catch (e) {
    console.warn("[store image proxy]", e);
  }
  return null;
}

export const Route = createFileRoute("/api/store/image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams;
        let target = q.get("u");

        if (!target) {
          const id = q.get("id");
          const path = q.get("path");
          const slug = q.get("slug");
          const rev = q.get("rev");
          if (id && path && slug) {
            target = `https://images-api.printify.com/mockup/${id}/${path}/${slug}.jpg?camera_label=front${
              rev ? `&revision=${rev}` : ""
            }`;
          }
        }

        if (!target) {
          return Response.json(
            { ok: false, error: "missing u or id/path/slug" },
            { status: 400 },
          );
        }

        const resolved = await resolvePrintifyImage(target);
        if (!resolved) {
          return Response.json(
            { ok: false, error: "unable to resolve image" },
            { status: 404 },
          );
        }

        // 302 so CDN caches the destination; short cache on the hop
        return new Response(null, {
          status: 302,
          headers: {
            Location: resolved,
            "Cache-Control": "public, max-age=3600",
            "X-Lvl-Image-Proxy": "1",
          },
        });
      },
    },
  },
});
