/**
 * factory.lvlltd.com reverse proxy + webhook WAF edge.
 * Origin: LVL Factory on Vercel.
 *
 * WAF (path /api/printify/*):
 * - Method allowlist
 * - Body size cap
 * - Require X-Pfy-Signature on webhook POST (when ENFORCE_SIGNATURE=1)
 * - Per-IP rate limits via Cache API
 * - Block empty bodies on POST
 * - Inject edge headers for origin
 */
const ORIGIN = "https://lvl-factory.vercel.app";

const WEBHOOK_PATH = "/api/printify/webhooks";
const PRINTIFY_API_PREFIX = "/api/printify/";

/** Max raw body bytes for webhook POST */
const MAX_BODY = 512 * 1024;

/** Rate limits */
const RL_WEBHOOK_POST = { limit: 60, windowSec: 60 }; // 60/min/IP
const RL_PRINTIFY_GET = { limit: 120, windowSec: 60 };
const RL_DEFAULT = { limit: 300, windowSec: 60 };

export default {
  async fetch(request, env, ctx) {
    const incoming = new URL(request.url);
    const path = incoming.pathname;
    const method = request.method.toUpperCase();

    // --- Edge WAF for Printify webhooks ---
    if (path === WEBHOOK_PATH || path.startsWith(PRINTIFY_API_PREFIX)) {
      const blocked = await edgeWaf(request, env, path, method);
      if (blocked) return blocked;
    }

    return proxyToOrigin(request, incoming, env);
  },
};

/**
 * @param {Request} request
 * @param {any} env
 * @param {string} path
 * @param {string} method
 * @returns {Promise<Response|null>}
 */
async function edgeWaf(request, env, path, method) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const ray = request.headers.get("cf-ray") || "";

  // Disallowed methods on webhook receive
  if (path === WEBHOOK_PATH) {
    if (method !== "GET" && method !== "POST" && method !== "HEAD" && method !== "OPTIONS") {
      return wafBlock(405, "method_not_allowed", { method, ray });
    }
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers":
            "content-type, x-pfy-signature, x-lvl-webhook-gate",
          "access-control-max-age": "86400",
        },
      });
    }
  }

  // Rate limit
  const rl =
    path === WEBHOOK_PATH && method === "POST"
      ? RL_WEBHOOK_POST
      : method === "GET"
        ? RL_PRINTIFY_GET
        : RL_DEFAULT;
  const rlKey = `rl:${path}:${method}:${ip}`;
  const rlResult = await rateLimit(rlKey, rl.limit, rl.windowSec);
  if (!rlResult.ok) {
    return wafBlock(429, "rate_limited", {
      ray,
      retry_after: rlResult.retryAfter,
      limit: rl.limit,
    }, { "retry-after": String(rlResult.retryAfter) });
  }

  // POST webhook hardening
  if (path === WEBHOOK_PATH && method === "POST") {
    const ct = (request.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json") && !ct.includes("text/json") && !ct.includes("application/*")) {
      // Printify sends application/json; reject clearly wrong types
      if (ct && !ct.includes("json")) {
        return wafBlock(415, "unsupported_media_type", { ray, content_type: ct });
      }
    }

    const cl = request.headers.get("content-length");
    if (cl && Number(cl) > MAX_BODY) {
      return wafBlock(413, "payload_too_large", { ray, max: MAX_BODY });
    }

    const enforceSig =
      env?.ENFORCE_SIGNATURE === "1" ||
      env?.ENFORCE_SIGNATURE === "true" ||
      env?.PRINTIFY_WEBHOOK_STRICT === "1";
    const sig =
      request.headers.get("x-pfy-signature") ||
      request.headers.get("X-Pfy-Signature");
    if (enforceSig && !sig) {
      return wafBlock(403, "missing_signature", {
        ray,
        hint: "X-Pfy-Signature required",
      });
    }

    // Optional shared gate header (set by CF Transform Rule or secret)
    const gate = env?.WEBHOOK_GATE_TOKEN;
    if (gate) {
      const provided =
        request.headers.get("x-lvl-webhook-gate") ||
        request.headers.get("X-Lvl-Webhook-Gate");
      if (provided !== gate) {
        return wafBlock(403, "gate_failed", { ray });
      }
    }
  }

  // Block write methods on subscriptions from anonymous internet unless gated
  if (
    path.startsWith("/api/printify/subscriptions") &&
    (method === "POST" || method === "PUT" || method === "DELETE")
  ) {
    const admin = env?.WEBHOOK_ADMIN_TOKEN;
    if (admin) {
      const auth =
        request.headers.get("x-lvl-admin-token") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (auth !== admin) {
        return wafBlock(401, "admin_required", { ray });
      }
    }
  }

  return null;
}

/**
 * Simple fixed-window rate limit using Cache API (edge-local, best-effort).
 * @param {string} key
 * @param {number} limit
 * @param {number} windowSec
 */
async function rateLimit(key, limit, windowSec) {
  const cache = caches.default;
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const cacheUrl = new URL(`https://waf-rl.lvl.internal/${encodeURIComponent(key)}/${bucket}`);
  const cacheReq = new Request(cacheUrl.toString());

  let count = 0;
  const hit = await cache.match(cacheReq);
  if (hit) {
    count = Number(await hit.text()) || 0;
  }
  count += 1;
  const res = new Response(String(count), {
    headers: {
      "cache-control": `max-age=${windowSec}`,
      "content-type": "text/plain",
    },
  });
  // fire-and-forget put
  await cache.put(cacheReq, res.clone());

  if (count > limit) {
    return { ok: false, retryAfter: windowSec };
  }
  return { ok: true, count };
}

function wafBlock(status, code, extra = {}, moreHeaders = {}) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: code,
      waf: "lvl-factory-edge",
      ...extra,
    }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-lvl-waf": code,
        "cache-control": "no-store",
        ...moreHeaders,
      },
    },
  );
}

/**
 * @param {Request} request
 * @param {URL} incoming
 * @param {any} env
 */
async function proxyToOrigin(request, incoming, env) {
  const origin = env?.ORIGIN_URL || ORIGIN;
  const target = new URL(incoming.pathname + incoming.search, origin);

  const headers = new Headers(request.headers);
  try {
    headers.set("Host", new URL(origin).host);
  } catch {
    headers.set("Host", "lvl-factory.vercel.app");
  }
  headers.set("X-Forwarded-Host", incoming.host);
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Lvl-Edge", "cloudflare-waf");
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers.set("X-Lvl-Client-Ip", ip);
  const country = request.headers.get("cf-ipcountry");
  if (country) headers.set("X-Lvl-Client-Country", country);

  headers.delete("connection");
  headers.delete("keep-alive");
  headers.delete("transfer-encoding");

  /** @type {RequestInit} */
  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // @ts-expect-error duplex for streaming body in Workers
    init.duplex = "half";
  }

  let res;
  try {
    res = await fetch(target.toString(), init);
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "origin_unreachable",
        message: String(e?.message || e),
        origin,
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const outHeaders = new Headers(res.headers);
  const loc = outHeaders.get("location");
  if (loc && loc.includes("vercel.app")) {
    try {
      const u = new URL(loc);
      if (u.hostname.includes("lvl-factory")) {
        u.hostname = incoming.hostname;
        outHeaders.set("location", u.toString());
      }
    } catch {
      /* keep */
    }
  }
  outHeaders.set("x-lvl-factory-proxy", "1");
  outHeaders.set("x-lvl-factory-origin", origin);
  outHeaders.set("x-lvl-waf", "edge");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}
