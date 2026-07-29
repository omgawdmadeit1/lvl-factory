/**
 * Optimized Printify → S3 image resolution (server-only).
 *
 * images-api.printify.com often returns Content-Length: 0 + header
 * x-automaton-object-url pointing at pfy-prod-automaton-cache S3.
 *
 * Optimizations:
 * - TTL memory cache for resolved URLs
 * - In-flight request coalescing (one upstream per key)
 * - HEAD-first (no body download) with short timeout
 * - Optional stream mode for same-origin bytes + long cache
 * - Seeded from RESOLVED_MOCKUPS
 */
import { createHash } from "node:crypto";
import { RESOLVED_MOCKUPS } from "./images";

const UA = "LVL-Store-Image-Proxy/2.0";
const RESOLVE_TTL_MS = 6 * 60 * 60 * 1000; // 6h (S3 mockups rotate ~weekly)
const NEGATIVE_TTL_MS = 60 * 1000; // 1m for failures
const UPSTREAM_MS = 4_000;

const ALLOWED_HOSTS = new Set([
  "images-api.printify.com",
  "pfy-prod-automaton-cache.s3.us-east-2.amazonaws.com",
  "printify-mockup.s3.amazonaws.com",
  "images.printify.com",
]);

export type ResolveHit = {
  url: string;
  source: "cache" | "seed" | "s3-direct" | "head" | "get" | "passthrough";
  cached: boolean;
};

type CacheEntry = {
  url: string | null;
  exp: number;
  source: ResolveHit["source"];
};

const resolveCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ResolveHit | null>>();

/** Seed cache from known S3 mockups (slug → S3). */
function seedCache(): void {
  for (const s3 of Object.values(RESOLVED_MOCKUPS)) {
    if (!s3) continue;
    const key = cacheKey(s3);
    resolveCache.set(key, {
      url: s3,
      exp: Date.now() + RESOLVE_TTL_MS * 4,
      source: "seed",
    });
  }
}
seedCache();

export function cacheKey(target: string): string {
  return createHash("sha256").update(target).digest("hex").slice(0, 32);
}

export function isAllowedImageUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (ALLOWED_HOSTS.has(url.hostname)) return true;
  if (url.hostname.endsWith(".printify.com")) return true;
  if (
    url.hostname.endsWith(".amazonaws.com") &&
    (url.hostname.includes("printify") || url.pathname.includes("/mockup/"))
  ) {
    return true;
  }
  return false;
}

function isS3Object(url: URL): boolean {
  return (
    url.hostname.includes("amazonaws.com") && url.pathname.includes("/mockup/")
  );
}

function cacheGet(key: string): CacheEntry | null {
  const e = resolveCache.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) {
    resolveCache.delete(key);
    return null;
  }
  return e;
}

function cacheSet(
  key: string,
  url: string | null,
  source: ResolveHit["source"],
  ttl = RESOLVE_TTL_MS,
): void {
  resolveCache.set(key, { url, exp: Date.now() + ttl, source });
  // soft cap
  if (resolveCache.size > 2_000) {
    const first = resolveCache.keys().next().value;
    if (first) resolveCache.delete(first);
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms = UPSTREAM_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Resolve Printify images-api URL (or S3) to a fetchable HTTPS image URL.
 */
export async function resolveImageUrl(
  target: string,
): Promise<ResolveHit | null> {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if (!isAllowedImageUrl(url)) return null;

  const key = cacheKey(url.toString());
  const hit = cacheGet(key);
  if (hit) {
    if (!hit.url) return null;
    return { url: hit.url, source: hit.source, cached: true };
  }

  // S3 direct — no upstream round-trip
  if (isS3Object(url)) {
    const out = {
      url: url.toString(),
      source: "s3-direct" as const,
      cached: false,
    };
    cacheSet(key, out.url, "s3-direct");
    return out;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const work = (async (): Promise<ResolveHit | null> => {
    try {
      // HEAD first — we only need x-automaton-object-url
      const head = await fetchWithTimeout(url.toString(), {
        method: "HEAD",
        headers: {
          Accept: "image/jpeg,image/webp,image/*,*/*",
          "User-Agent": UA,
        },
      });

      const objectUrl = head.headers.get("x-automaton-object-url");
      if (objectUrl?.startsWith("https://")) {
        try {
          const o = new URL(objectUrl);
          if (isAllowedImageUrl(o)) {
            cacheSet(key, objectUrl, "head");
            // also cache reverse for S3 hits
            cacheSet(cacheKey(objectUrl), objectUrl, "s3-direct");
            return { url: objectUrl, source: "head", cached: false };
          }
        } catch {
          /* ignore */
        }
      }

      const cl = Number(head.headers.get("content-length") || 0);
      if (head.ok && cl > 1000) {
        cacheSet(key, url.toString(), "passthrough");
        return { url: url.toString(), source: "passthrough", cached: false };
      }

      // Rare: GET only for header (abort after headers via stream cancel)
      const get = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: {
          Accept: "image/jpeg,image/webp,image/*,*/*",
          "User-Agent": UA,
          Range: "bytes=0-0",
        },
      });
      const objectUrl2 = get.headers.get("x-automaton-object-url");
      // cancel body if any
      try {
        await get.body?.cancel();
      } catch {
        /* ignore */
      }

      if (objectUrl2?.startsWith("https://")) {
        cacheSet(key, objectUrl2, "get");
        cacheSet(cacheKey(objectUrl2), objectUrl2, "s3-direct");
        return { url: objectUrl2, source: "get", cached: false };
      }

      const cl2 = Number(get.headers.get("content-length") || 0);
      if (get.ok && cl2 > 1000) {
        cacheSet(key, url.toString(), "passthrough");
        return { url: url.toString(), source: "passthrough", cached: false };
      }

      cacheSet(key, null, "head", NEGATIVE_TTL_MS);
      return null;
    } catch (e) {
      console.warn("[image-proxy resolve]", e);
      cacheSet(key, null, "head", NEGATIVE_TTL_MS);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, work);
  return work;
}

/** Build target URL from query pieces */
export function buildPrintifyMockupUrl(opts: {
  id: string;
  path: string;
  slug: string;
  rev?: string | null;
  camera?: string | null;
}): string {
  const cam = opts.camera || "front";
  const base = `https://images-api.printify.com/mockup/${opts.id}/${opts.path}/${opts.slug}.jpg?camera_label=${encodeURIComponent(cam)}`;
  return opts.rev ? `${base}&revision=${encodeURIComponent(opts.rev)}` : base;
}

/**
 * Stream image bytes from resolved URL (same-origin for <img>, long cache).
 * Supports conditional requests via If-None-Match / If-Modified-Since.
 */
export async function streamResolvedImage(
  resolvedUrl: string,
  request: Request,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "image/jpeg,image/webp,image/*,*/*",
    "User-Agent": UA,
  };
  const inm = request.headers.get("if-none-match");
  const ims = request.headers.get("if-modified-since");
  if (inm) headers["If-None-Match"] = inm;
  if (ims) headers["If-Modified-Since"] = ims;
  const range = request.headers.get("range");
  if (range) headers.Range = range;

  const upstream = await fetchWithTimeout(
    resolvedUrl,
    { method: "GET", headers },
    12_000,
  );

  if (upstream.status === 304) {
    return new Response(null, {
      status: 304,
      headers: cacheHeaders(upstream, true),
    });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return Response.json(
      { ok: false, error: "upstream_image_failed", status: upstream.status },
      { status: 502 },
    );
  }

  const outHeaders = cacheHeaders(upstream, false);
  const ct = upstream.headers.get("content-type");
  if (ct) outHeaders["Content-Type"] = ct;
  else outHeaders["Content-Type"] = "image/jpeg";

  const cl = upstream.headers.get("content-length");
  if (cl) outHeaders["Content-Length"] = cl;
  const cr = upstream.headers.get("content-range");
  if (cr) outHeaders["Content-Range"] = cr;
  const etag = upstream.headers.get("etag");
  if (etag) outHeaders.ETag = etag;
  const lm = upstream.headers.get("last-modified");
  if (lm) outHeaders["Last-Modified"] = lm;

  outHeaders["X-Lvl-Image-Proxy"] = "stream";
  outHeaders["X-Lvl-Image-Origin"] = new URL(resolvedUrl).hostname;

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

function cacheHeaders(upstream: Response, isNotModified: boolean): Record<string, string> {
  // Long browser + CDN cache; S3 objects are content-addressed-ish
  const cc =
    upstream.headers.get("cache-control") ||
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
  const h: Record<string, string> = {
    "Cache-Control": isNotModified
      ? "public, max-age=86400, s-maxage=604800"
      : cc.includes("max-age")
        ? cc
        : "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    "CDN-Cache-Control": "public, max-age=604800",
    "Vercel-CDN-Cache-Control": "public, max-age=604800",
    Vary: "Accept, Accept-Encoding",
    "Access-Control-Allow-Origin": "*",
    "Timing-Allow-Origin": "*",
  };
  return h;
}

export function redirectToResolved(
  resolved: ResolveHit,
): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: resolved.url,
      // Cache the redirect mapping aggressively at CDN
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "CDN-Cache-Control": "public, max-age=86400",
      "Vercel-CDN-Cache-Control": "public, max-age=86400",
      "X-Lvl-Image-Proxy": "redirect",
      "X-Lvl-Image-Source": resolved.source,
      "X-Lvl-Image-Cached": resolved.cached ? "1" : "0",
      Vary: "Accept",
    },
  });
}

export function imageProxyStats() {
  return {
    cache_size: resolveCache.size,
    inflight: inflight.size,
    resolve_ttl_ms: RESOLVE_TTL_MS,
    seeds: Object.keys(RESOLVED_MOCKUPS).length,
  };
}

/** Warm cache for a list of Printify/S3 URLs (best-effort). */
export async function warmImageResolutions(
  urls: string[],
): Promise<{ warmed: number; failed: number }> {
  let warmed = 0;
  let failed = 0;
  await Promise.all(
    urls.map(async (u) => {
      const r = await resolveImageUrl(u);
      if (r) warmed += 1;
      else failed += 1;
    }),
  );
  return { warmed, failed };
}
