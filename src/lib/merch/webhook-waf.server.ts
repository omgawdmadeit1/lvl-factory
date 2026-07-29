/**
 * Origin-side WAF companion for Printify webhooks.
 * Complements Cloudflare edge (worker + zone rules):
 * - body size
 * - method
 * - rate limit by CF-Connecting-IP / X-Lvl-Client-Ip
 * - optional gate header
 * - signature enforcement flags
 */
import { getWebhookSecret } from "./printify-api.server";

const MAX_BODY = 512 * 1024;
const WINDOW_MS = 60_000;
const LIMIT_POST = 80;
const LIMIT_GET = 150;

type Bucket = { count: number; reset: number };

const globalRef = globalThis as typeof globalThis & {
  __lvlWebhookRl__?: Map<string, Bucket>;
};

function buckets(): Map<string, Bucket> {
  globalRef.__lvlWebhookRl__ ??= new Map();
  return globalRef.__lvlWebhookRl__;
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

function rateLimit(key: string, limit: number): { ok: boolean; remaining: number } {
  const map = buckets();
  const now = Date.now();
  let b = map.get(key);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + WINDOW_MS };
    map.set(key, b);
  }
  b.count += 1;
  // opportunistic prune
  if (map.size > 5000) {
    for (const [k, v] of map) {
      if (now > v.reset) map.delete(k);
    }
  }
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count) };
}

export interface WafResult {
  ok: true;
  ip: string;
  ray: string | null;
  country: string | null;
  edge: string | null;
}

export interface WafDeny {
  ok: false;
  response: Response;
}

function deny(
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): WafDeny {
  return {
    ok: false,
    response: Response.json(
      { ok: false, error: code, waf: "lvl-origin", ...extra },
      {
        status,
        headers: {
          "cache-control": "no-store",
          "x-lvl-waf": code,
          ...headers,
        },
      },
    ),
  };
}

/**
 * Run origin WAF before processing webhook GET/POST.
 */
export async function enforceWebhookWaf(
  request: Request,
  opts: { path: "webhooks" | "subscriptions" | "sync"; maxBody?: number } = {
    path: "webhooks",
  },
): Promise<WafResult | WafDeny> {
  const method = request.method.toUpperCase();
  const ip = clientIp(request);
  const ray =
    request.headers.get("cf-ray") || request.headers.get("x-lvl-cf-ray");
  const country =
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-lvl-client-country");
  const edge = request.headers.get("x-lvl-edge");

  if (opts.path === "webhooks") {
    if (!["GET", "POST", "HEAD", "OPTIONS"].includes(method)) {
      return deny(405, "method_not_allowed", { method });
    }
  }

  const limit = method === "POST" ? LIMIT_POST : LIMIT_GET;
  const rl = rateLimit(`${opts.path}:${method}:${ip}`, limit);
  if (!rl.ok) {
    return deny(
      429,
      "rate_limited",
      { ip, limit },
      { "retry-after": "60" },
    );
  }

  if (method === "POST" && opts.path === "webhooks") {
    const cl = request.headers.get("content-length");
    const max = opts.maxBody ?? MAX_BODY;
    if (cl && Number(cl) > max) {
      return deny(413, "payload_too_large", { max });
    }

    const gate = process.env.WEBHOOK_GATE_TOKEN?.trim();
    if (gate) {
      const provided =
        request.headers.get("x-lvl-webhook-gate") ||
        request.headers.get("X-Lvl-Webhook-Gate");
      if (provided !== gate) {
        return deny(403, "gate_failed");
      }
    }

    // Soft signal: if secret configured + strict, signature checked later by handler
    const secret = getWebhookSecret();
    const strict =
      process.env.PRINTIFY_WEBHOOK_STRICT === "1" ||
      process.env.NODE_ENV === "production";
    if (secret && strict) {
      const sig =
        request.headers.get("x-pfy-signature") ||
        request.headers.get("X-Pfy-Signature");
      if (!sig) {
        return deny(403, "missing_signature", {
          hint: "X-Pfy-Signature required",
        });
      }
    }
  }

  if ((opts.path === "subscriptions" || opts.path === "sync") && method === "POST") {
    const admin = process.env.WEBHOOK_ADMIN_TOKEN?.trim();
    if (admin) {
      const auth =
        request.headers.get("x-lvl-admin-token") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (auth !== admin) {
        return deny(401, "admin_required");
      }
    }
  }

  return {
    ok: true,
    ip,
    ray,
    country,
    edge,
  };
}

export function wafStatusPublic() {
  return {
    edge_worker: "cloudflare/workers/lvl-factory-proxy",
    zone_rules: "cloudflare/waf/printify-webhooks-rules.json",
    apply_script: "scripts/apply-cloudflare-waf.mjs",
    origin_enforcement: true,
    max_body_bytes: MAX_BODY,
    rate_limit_post_per_min: LIMIT_POST,
    rate_limit_get_per_min: LIMIT_GET,
    env: {
      ENFORCE_SIGNATURE: process.env.ENFORCE_SIGNATURE || null,
      PRINTIFY_WEBHOOK_STRICT: process.env.PRINTIFY_WEBHOOK_STRICT || null,
      WEBHOOK_GATE_TOKEN: process.env.WEBHOOK_GATE_TOKEN ? "set" : null,
      WEBHOOK_ADMIN_TOKEN: process.env.WEBHOOK_ADMIN_TOKEN ? "set" : null,
      CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID ? "set" : null,
    },
  };
}
