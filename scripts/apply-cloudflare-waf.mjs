#!/usr/bin/env node
/**
 * Apply Cloudflare WAF custom rules + rate limiting for Printify webhooks.
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN  — Zone WAF / Account rights
 *   CLOUDFLARE_ZONE_ID    — zone id for lvlltd.com
 *
 * Optional:
 *   CLOUDFLARE_ZONE_NAME  — default lvlltd.com (used if ZONE_ID missing + list zones)
 *   ENABLE_SIGNATURE_RULE=1 — enable "require X-Pfy-Signature" custom rule
 *   DRY_RUN=1
 *
 * Usage:
 *   node scripts/apply-cloudflare-waf.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(__dirname, "../cloudflare/waf/printify-webhooks-rules.json");
const dry = process.env.DRY_RUN === "1";
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
let zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
const zoneName = process.env.CLOUDFLARE_ZONE_NAME?.trim() || "lvlltd.com";

if (!token) {
  console.error("CLOUDFLARE_API_TOKEN is required");
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(rulesPath, "utf8"));

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const err = body.errors || body;
    throw new Error(`${init.method || "GET"} ${path} → ${res.status}: ${JSON.stringify(err)}`);
  }
  return body;
}

async function resolveZone() {
  if (zoneId) return zoneId;
  const list = await cf(`/zones?name=${encodeURIComponent(zoneName)}`);
  const z = list.result?.[0];
  if (!z) throw new Error(`Zone not found: ${zoneName}`);
  zoneId = z.id;
  console.log("Resolved zone", zoneName, zoneId);
  return zoneId;
}

async function applyCustomRules(zid) {
  // Entrypoint for custom rules: http_request_firewall_custom
  const entry = await cf(
    `/zones/${zid}/rulesets/phases/http_request_firewall_custom/entrypoint`,
  ).catch(async (e) => {
    // Create empty if missing
    if (String(e.message).includes("10003") || String(e.message).includes("404")) {
      return { result: { rules: [] } };
    }
    throw e;
  });

  const existing = entry.result?.rules || [];
  const wanted = cfg.rules.map((r) => {
    const enabled =
      r.id === "lvl-pfy-require-signature-header"
        ? process.env.ENABLE_SIGNATURE_RULE === "1" || r.enabled
        : r.enabled;
    return {
      action: r.action,
      expression: r.expression,
      description: `[${r.id}] ${r.description}`,
      enabled: Boolean(enabled),
      ...(r.action === "skip" && r.action_parameters
        ? { action_parameters: r.action_parameters }
        : {}),
    };
  });

  // Merge: replace rules with our description prefix [lvl-pfy-
  const kept = existing.filter(
    (r) => !String(r.description || "").includes("[lvl-pfy-"),
  );
  const rules = [...kept, ...wanted];

  console.log(
    dry ? "DRY_RUN would put" : "Putting",
    rules.length,
    "custom rules (",
    wanted.length,
    "LVL)",
  );

  if (dry) {
    console.log(JSON.stringify(wanted, null, 2));
    return;
  }

  // Prefer ruleset id from entrypoint
  const rulesetId = entry.result?.id;
  if (rulesetId) {
    await cf(`/zones/${zid}/rulesets/${rulesetId}`, {
      method: "PUT",
      body: JSON.stringify({ rules }),
    });
  } else {
    await cf(`/zones/${zid}/rulesets`, {
      method: "POST",
      body: JSON.stringify({
        name: "LVL Factory Printify WAF",
        kind: "zone",
        phase: "http_request_firewall_custom",
        rules,
      }),
    });
  }
  console.log("Custom WAF rules applied");
}

async function applyRateLimits(zid) {
  // Rate limiting rules API (v2)
  for (const rl of cfg.rate_limiting_rules || []) {
    const body = {
      description: `[${rl.id}] ${rl.description}`,
      expression: rl.expression,
      characteristics: rl.characteristics || ["ip.src"],
      period: rl.period,
      requests_per_period: rl.requests_per_period,
      mitigation_timeout: rl.mitigation_timeout ?? 60,
      action: { mode: rl.action || "block" },
      enabled: rl.enabled !== false,
      match: {
        request: {
          methods: undefined,
        },
      },
    };

    // List existing rate limit rules (zone)
    // Cloudflare Rate Limiting Rules (new) live under rulesets phase http_ratelimit
    console.log(dry ? "DRY_RUN rate limit" : "Upsert rate limit", rl.id);

    if (dry) {
      console.log(JSON.stringify(body, null, 2));
      continue;
    }

    try {
      const phase = await cf(
        `/zones/${zid}/rulesets/phases/http_ratelimit/entrypoint`,
      );
      const existing = phase.result?.rules || [];
      const kept = existing.filter(
        (r) => !String(r.description || "").includes(`[${rl.id}]`),
      );
      const rule = {
        action: "block",
        expression: rl.expression,
        description: `[${rl.id}] ${rl.description}`,
        enabled: rl.enabled !== false,
        ratelimit: {
          characteristics: rl.characteristics || ["ip.src"],
          period: rl.period,
          requests_per_period: rl.requests_per_period,
          mitigation_timeout: rl.mitigation_timeout ?? 60,
        },
      };
      const rules = [...kept, rule];
      if (phase.result?.id) {
        await cf(`/zones/${zid}/rulesets/${phase.result.id}`, {
          method: "PUT",
          body: JSON.stringify({ rules }),
        });
      } else {
        await cf(`/zones/${zid}/rulesets`, {
          method: "POST",
          body: JSON.stringify({
            name: "LVL rate limits",
            kind: "zone",
            phase: "http_ratelimit",
            rules,
          }),
        });
      }
      console.log("Rate limit OK", rl.id);
    } catch (e) {
      console.warn(
        "Rate limit API note (plan may use classic rate limiting):",
        e.message,
      );
      // Fallback: classic rate_limits endpoint
      try {
        await cf(`/zones/${zid}/rate_limits`, {
          method: "POST",
          body: JSON.stringify({
            match: {
              request: {
                url_pattern: `*factory.lvlltd.com/api/printify/*`,
              },
            },
            threshold: rl.requests_per_period,
            period: rl.period,
            action: {
              mode: "ban",
              timeout: rl.mitigation_timeout ?? 60,
              response: {
                content_type: "application/json",
                body: JSON.stringify({ ok: false, error: "rate_limited", waf: "cloudflare" }),
              },
            },
            disabled: rl.enabled === false,
            description: `[${rl.id}] ${rl.description}`,
          }),
        });
        console.log("Classic rate_limit created", rl.id);
      } catch (e2) {
        console.warn("Classic rate_limit failed:", e2.message);
      }
    }
  }
}

async function main() {
  const zid = await resolveZone();
  console.log("Zone", zid);
  await applyCustomRules(zid);
  await applyRateLimits(zid);
  console.log("Done. Deploy worker WAF: wrangler deploy -c cloudflare/workers/lvl-factory-proxy/wrangler.toml");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
