/**
 * Origin-side rate limit / method WAF for store + pay surfaces.
 * Complements Cloudflare zone rules + Worker edge WAF.
 */
const WINDOW_MS = 60_000;

type Bucket = { count: number; reset: number };

const g = globalThis as typeof globalThis & {
  __lvlStoreRl__?: Map<string, Bucket>;
};

function buckets(): Map<string, Bucket> {
  g.__lvlStoreRl__ ??= new Map();
  return g.__lvlStoreRl__;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-lvl-client-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimit(
  key: string,
  limit: number,
): { ok: boolean; remaining: number } {
  const map = buckets();
  const now = Date.now();
  let b = map.get(key);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + WINDOW_MS };
    map.set(key, b);
  }
  b.count += 1;
  if (map.size > 8000) {
    for (const [k, v] of map) {
      if (now > v.reset) map.delete(k);
    }
  }
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count) };
}

function deny(
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Response {
  return Response.json(
    { ok: false, error: code, waf: "lvl-origin-store", ...extra },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-lvl-waf": code,
        ...headers,
      },
    },
  );
}

export type StoreSurface = "catalog" | "image" | "store" | "pay";

const LIMITS: Record<StoreSurface, { get: number; post: number }> = {
  catalog: { get: 150, post: 30 },
  image: { get: 300, post: 0 },
  store: { get: 80, post: 40 },
  pay: { get: 80, post: 40 },
};

/**
 * Enforce origin WAF for store/pay API handlers.
 * Returns null if allowed, Response if denied.
 */
export function enforceStoreEdgeWaf(
  request: Request,
  surface: StoreSurface,
): Response | null {
  const method = request.method.toUpperCase();
  const ip = clientIp(request);

  if (surface === "image") {
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      return deny(405, "method_not_allowed", { method, surface });
    }
  } else if (surface === "catalog") {
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      return deny(405, "method_not_allowed", { method, surface });
    }
  } else if (surface === "pay") {
    if (!["GET", "HEAD", "POST", "OPTIONS"].includes(method)) {
      return deny(405, "method_not_allowed", { method, surface });
    }
  }

  if (method === "OPTIONS" || method === "HEAD") return null;

  const limits = LIMITS[surface];
  const limit = method === "POST" ? limits.post : limits.get;
  if (limit <= 0 && method === "POST") {
    return deny(405, "method_not_allowed", { method, surface });
  }

  const rl = rateLimit(`${surface}:${method}:${ip}`, limit);
  if (!rl.ok) {
    return deny(
      429,
      "rate_limited",
      { surface, ip: ip.slice(0, 32) },
      { "retry-after": "60" },
    );
  }

  return null;
}
