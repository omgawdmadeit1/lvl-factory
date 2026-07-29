#!/usr/bin/env node
/**
 * Apply Cloudflare WAF custom rules + rate limiting for LVL Factory.
 *
 * Packs (RULE_PACK):
 *   printify  — Printify webhooks (default)
 *   shop-pay  — /shop, /api/store/*, /pay, /agent/*
 *   all       — both packs merged
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN  — Zone WAF / Account rights
 *   CLOUDFLARE_ZONE_ID    — zone id for lvlltd.com (or resolve by name)
 *
 * Optional:
 *   CLOUDFLARE_ZONE_NAME  — default lvlltd.com
 *   RULE_PACK=printify|shop-pay|all
 *   ENABLE_SIGNATURE_RULE=1 — enable Printify require X-Pfy-Signature
 *   DRY_RUN=1
 *
 * Usage:
 *   node scripts/apply-cloudflare-waf.mjs
 *   RULE_PACK=shop-pay node scripts/apply-cloudflare-waf.mjs
 *   RULE_PACK=all DRY_RUN=1 node scripts/apply-cloudflare-waf.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wafDir = join(__dirname, "../cloudflare/waf");
const packName = (process.env.RULE_PACK || "printify").toLowerCase();
const dry = process.env.DRY_RUN === "1";
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
let zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
const zoneName = process.env.CLOUDFLARE_ZONE_NAME?.trim() || "lvlltd.com";

const PACK_FILES = {
  printify: "printify-webhooks-rules.json",
  "shop-pay": "shop-pay-rules.json",
  shop: "shop-pay-rules.json",
  pay: "shop-pay-rules.json",
};

/** Description prefixes owned by LVL packs — preserved across applies */
const LVL_PREFIXES = ["[lvl-pfy-", "[lvl-shop-", "[lvl-store-", "[lvl-pay-", "[lvl-agent-"];

function isLvlRule(description) {
  const d = String(description || "");
  return LVL_PREFIXES.some((p) => d.includes(p));
}

function loadPacks() {
  const names =
    packName === "all"
      ? ["printify", "shop-pay"]
      : PACK_FILES[packName]
        ? [packName === "shop" || packName === "pay" ? "shop-pay" : packName]
        : null;
  if (!names) {
    console.error(
      `Unknown RULE_PACK=${packName}. Use: printify | shop-pay | all`,
    );
    process.exit(1);
  }
  const packs = [];
  for (const n of names) {
    const file = PACK_FILES[n];
    const path = join(wafDir, file);
    if (!existsSync(path)) throw new Error(`Missing pack file: ${path}`);
    packs.push({ name: n, cfg: JSON.parse(readFileSync(path, "utf8")) });
  }
  return packs;
}

if (!token) {
  console.error("CLOUDFLARE_API_TOKEN is required");
  process.exit(1);
}

const packs = loadPacks();

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
    throw new Error(
      `${init.method || "GET"} ${path} → ${res.status}: ${JSON.stringify(err)}`,
    );
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

function mapCustomRule(r) {
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
}

async function applyCustomRules(zid) {
  const entry = await cf(
    `/zones/${zid}/rulesets/phases/http_request_firewall_custom/entrypoint`,
  ).catch(async (e) => {
    if (String(e.message).includes("10003") || String(e.message).includes("404")) {
      return { result: { rules: [] } };
    }
    throw e;
  });

  const existing = entry.result?.rules || [];
  const wanted = packs.flatMap((p) => p.cfg.rules.map(mapCustomRule));

  // Drop previous LVL rules; keep non-LVL; append wanted
  const kept = existing.filter((r) => !isLvlRule(r.description));
  const rules = [...kept, ...wanted];

  console.log(
    dry ? "DRY_RUN would put" : "Putting",
    rules.length,
    "custom rules (",
    wanted.length,
    "LVL from packs:",
    packs.map((p) => p.name).join("+"),
    ")",
  );

  if (dry) {
    console.log(JSON.stringify(wanted, null, 2));
    return;
  }

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
        name: "LVL Factory WAF",
        kind: "zone",
        phase: "http_request_firewall_custom",
        rules,
      }),
    });
  }
  console.log("Custom WAF rules applied");
}

async function applyRateLimits(zid) {
  const allRl = packs.flatMap((p) => p.cfg.rate_limiting_rules || []);
  if (!allRl.length) return;

  // Build full desired set and put once (avoids last-write-wins bugs)
  const desired = allRl.map((rl) => ({
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
  }));

  console.log(
    dry ? "DRY_RUN rate limits" : "Upsert rate limits",
    desired.length,
  );

  if (dry) {
    console.log(JSON.stringify(desired, null, 2));
    return;
  }

  try {
    const phase = await cf(
      `/zones/${zid}/rulesets/phases/http_ratelimit/entrypoint`,
    );
    const existing = phase.result?.rules || [];
    const kept = existing.filter((r) => !isLvlRule(r.description));
    const rules = [...kept, ...desired];
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
    console.log("Rate limit ruleset OK", desired.length, "rules");
  } catch (e) {
    console.warn(
      "Rate limit ruleset API note (plan may use classic rate limiting):",
      e.message,
    );
    for (const rl of allRl) {
      try {
        // Derive path pattern from expression when possible
        let urlPattern = `*factory.lvlltd.com/*`;
        if (rl.expression.includes("/api/printify/")) {
          urlPattern = `*factory.lvlltd.com/api/printify/*`;
        } else if (rl.expression.includes("/api/store/")) {
          urlPattern = `*factory.lvlltd.com/api/store/*`;
        } else if (rl.expression.includes("/shop")) {
          urlPattern = `*factory.lvlltd.com/shop*`;
        } else if (rl.expression.includes("/pay")) {
          urlPattern = `*factory.lvlltd.com/pay*`;
        } else if (rl.expression.includes("/agent/")) {
          urlPattern = `*factory.lvlltd.com/agent/*`;
        }
        await cf(`/zones/${zid}/rate_limits`, {
          method: "POST",
          body: JSON.stringify({
            match: {
              request: {
                url_pattern: urlPattern,
              },
            },
            threshold: rl.requests_per_period,
            period: rl.period,
            action: {
              mode: "ban",
              timeout: rl.mitigation_timeout ?? 60,
              response: {
                content_type: "application/json",
                body: JSON.stringify({
                  ok: false,
                  error: "rate_limited",
                  waf: "cloudflare",
                  rule: rl.id,
                }),
              },
            },
            disabled: rl.enabled === false,
            description: `[${rl.id}] ${rl.description}`,
          }),
        });
        console.log("Classic rate_limit created", rl.id);
      } catch (e2) {
        console.warn("Classic rate_limit failed:", rl.id, e2.message);
      }
    }
  }
}

async function main() {
  const zid = await resolveZone();
  console.log("Zone", zid, "pack", packName);
  await applyCustomRules(zid);
  await applyRateLimits(zid);
  console.log(
    "Done. Packs:",
    packs.map((p) => p.name).join(", "),
  );
  console.log(
    "Worker WAF (Printify): wrangler deploy -c cloudflare/workers/lvl-factory-proxy/wrangler.toml",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
