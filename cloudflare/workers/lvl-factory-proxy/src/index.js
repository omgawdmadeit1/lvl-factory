/**
 * factory.lvlltd.com reverse proxy + edge WAF.
 * Origin: LVL Factory on Vercel (Nitro SSR).
 *
 * Surfaces:
 * - /api/printify/*  — webhooks + operator API
 * - /api/store/*     — catalog + image proxy
 * - /shop*           — LVL Store
 * - /pay*            — multi-rail checkout
 * - /agent/*         — agent merch UI
 *
 * Complements zone rules in cloudflare/waf/*.json
 */
const ORIGIN = "https://lvl-factory.vercel.app";

const WEBHOOK_PATH = "/api/printify/webhooks";
const PRINTIFY_API_PREFIX = "/api/printify/";
const STORE_API_PREFIX = "/api/store/";
const SHOP_PREFIX = "/shop";
const PAY_PREFIX = "/pay";
const AGENT_PREFIX = "/agent/";

const MAX_WEBHOOK_BODY = 512 * 1024;
const MAX_STORE_POST = 64 * 1024;
const MAX_PAY_POST = 256 * 1024;

/** Rate limits: { limit, windowSec } */
const RL = {
  webhook_post: { limit: 60, windowSec: 60 },
  printify_get: { limit: 120, windowSec: 60 },
  shop_get: { limit: 300, windowSec: 60 },
  catalog_get: { limit: 120, windowSec: 60 },
  image_get: { limit: 240, windowSec: 60 },
  store_other: { limit: 60, windowSec: 60 },
  pay_get: { limit: 60, windowSec: 60 },
  pay_post: { limit: 30, windowSec: 60 },
  agent_get: { limit: 90, windowSec: 60 },
  default: { limit: 300, windowSec: 60 },
};

export default {
  async fetch(request, env, ctx) {
    const incoming = new URL(request.url);
    const path = incoming.pathname;
    const method = request.method.toUpperCase();

    const blocked = await edgeWaf(request, env, path, method);
    if (blocked) return blocked;

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

  // ---------- Printify webhooks ----------
  if (path === WEBHOOK_PATH || path.startsWith(PRINTIFY_API_PREFIX)) {
    if (path === WEBHOOK_PATH) {
      if (!["GET", "POST", "HEAD", "OPTIONS"].includes(method)) {
        return wafBlock(405, "method_not_allowed", { method, ray, surface: "printify" });
      }
      if (method === "OPTIONS") {
        return corsPreflight("GET, POST, OPTIONS", "content-type, x-pfy-signature, x-lvl-webhook-gate");
      }
    }

    const rl =
      path === WEBHOOK_PATH && method === "POST"
        ? RL.webhook_post
        : method === "GET"
          ? RL.printify_get
          : RL.default;
    const rlHit = await rateLimit(`rl:pfy:${path}:${method}:${ip}`, rl.limit, rl.windowSec);
    if (!rlHit.ok) {
      return wafBlock(429, "rate_limited", {
        ray,
        surface: "printify",
        retry_after: rlHit.retryAfter,
        limit: rl.limit,
      }, { "retry-after": String(rlHit.retryAfter) });
    }

    if (path === WEBHOOK_PATH && method === "POST") {
      const ct = (request.headers.get("content-type") || "").toLowerCase();
      if (ct && !ct.includes("json") && !ct.includes("application/*")) {
        return wafBlock(415, "unsupported_media_type", { ray, content_type: ct });
      }
      const cl = request.headers.get("content-length");
      if (cl && Number(cl) > MAX_WEBHOOK_BODY) {
        return wafBlock(413, "payload_too_large", { ray, max: MAX_WEBHOOK_BODY });
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

  // ---------- Store API ----------
  if (path.startsWith(STORE_API_PREFIX)) {
    if (path === "/api/store/image") {
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        return wafBlock(405, "method_not_allowed", { method, ray, surface: "store_image" });
      }
      if (method === "OPTIONS") {
        return corsPreflight("GET, HEAD, OPTIONS", "accept");
      }
      const rl = RL.image_get;
      const rlHit = await rateLimit(`rl:img:${ip}`, rl.limit, rl.windowSec);
      if (!rlHit.ok) {
        return wafBlock(429, "rate_limited", {
          ray,
          surface: "store_image",
          retry_after: rlHit.retryAfter,
        }, { "retry-after": String(rlHit.retryAfter) });
      }
      return null;
    }

    if (!["GET", "HEAD", "OPTIONS", "POST"].includes(method)) {
      return wafBlock(405, "method_not_allowed", { method, ray, surface: "store" });
    }
    if (method === "OPTIONS") {
      return corsPreflight("GET, HEAD, POST, OPTIONS", "content-type");
    }
    if (method === "POST") {
      const cl = request.headers.get("content-length");
      if (cl && Number(cl) > MAX_STORE_POST) {
        return wafBlock(413, "payload_too_large", { ray, max: MAX_STORE_POST });
      }
    }

    const rl =
      path === "/api/store/catalog" && method === "GET"
        ? RL.catalog_get
        : RL.store_other;
    const rlHit = await rateLimit(`rl:store:${path}:${method}:${ip}`, rl.limit, rl.windowSec);
    if (!rlHit.ok) {
      return wafBlock(429, "rate_limited", {
        ray,
        surface: "store",
        retry_after: rlHit.retryAfter,
      }, { "retry-after": String(rlHit.retryAfter) });
    }
    return null;
  }

  // ---------- Shop storefront ----------
  if (path === SHOP_PREFIX || path.startsWith(SHOP_PREFIX + "/")) {
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      return wafBlock(405, "method_not_allowed", { method, ray, surface: "shop" });
    }
    if (method === "GET" || method === "HEAD") {
      const rl = RL.shop_get;
      const rlHit = await rateLimit(`rl:shop:${ip}`, rl.limit, rl.windowSec);
      if (!rlHit.ok) {
        return wafBlock(429, "rate_limited", {
          ray,
          surface: "shop",
          retry_after: rlHit.retryAfter,
        }, { "retry-after": String(rlHit.retryAfter) });
      }
    }
    return null;
  }

  // ---------- Pay ----------
  if (path === PAY_PREFIX || path.startsWith(PAY_PREFIX + "/")) {
    if (!["GET", "HEAD", "POST", "OPTIONS"].includes(method)) {
      return wafBlock(405, "method_not_allowed", { method, ray, surface: "pay" });
    }
    if (method === "OPTIONS") {
      return corsPreflight("GET, HEAD, POST, OPTIONS", "content-type");
    }
    if (method === "POST") {
      const cl = request.headers.get("content-length");
      if (cl && Number(cl) > MAX_PAY_POST) {
        return wafBlock(413, "payload_too_large", { ray, max: MAX_PAY_POST });
      }
    }
    const rl = method === "POST" ? RL.pay_post : RL.pay_get;
    const rlHit = await rateLimit(`rl:pay:${method}:${ip}`, rl.limit, rl.windowSec);
    if (!rlHit.ok) {
      return wafBlock(429, "rate_limited", {
        ray,
        surface: "pay",
        retry_after: rlHit.retryAfter,
      }, { "retry-after": String(rlHit.retryAfter) });
    }
    return null;
  }

  // ---------- Agent ----------
  if (path.startsWith(AGENT_PREFIX)) {
    if (method === "GET" || method === "HEAD") {
      const rl = RL.agent_get;
      const rlHit = await rateLimit(`rl:agent:${ip}`, rl.limit, rl.windowSec);
      if (!rlHit.ok) {
        return wafBlock(429, "rate_limited", {
          ray,
          surface: "agent",
          retry_after: rlHit.retryAfter,
        }, { "retry-after": String(rlHit.retryAfter) });
      }
    }
    return null;
  }

  return null;
}

function corsPreflight(methods, headers) {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-methods": methods,
      "access-control-allow-headers": headers,
      "access-control-max-age": "86400",
    },
  });
}

/**
 * Fixed-window rate limit via Cache API (edge-local, best-effort).
 */
async function rateLimit(key, limit, windowSec) {
  const cache = caches.default;
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const cacheUrl = new URL(
    `https://waf-rl.lvl.internal/${encodeURIComponent(key)}/${bucket}`,
  );
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
  headers.set("X-Lvl-Edge-Version", "2");
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers.set("X-Lvl-Client-Ip", ip);
  const country = request.headers.get("cf-ipcountry");
  if (country) headers.set("X-Lvl-Client-Country", country);
  const ray = request.headers.get("cf-ray");
  if (ray) headers.set("X-Lvl-Cf-Ray", ray);

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
  outHeaders.set("x-lvl-edge-version", "2");

  // Security headers (do not override if origin already set stronger)
  if (!outHeaders.has("x-content-type-options")) {
    outHeaders.set("x-content-type-options", "nosniff");
  }
  if (!outHeaders.has("referrer-policy")) {
    outHeaders.set("referrer-policy", "strict-origin-when-cross-origin");
  }

  // Cache hint: shop HTML short; APIs no-store unless origin says otherwise
  const p = incoming.pathname;
  if (
    (p.startsWith("/shop") || p === "/") &&
    request.method === "GET" &&
    !outHeaders.has("cache-control")
  ) {
    outHeaders.set("cache-control", "public, max-age=0, must-revalidate");
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}
