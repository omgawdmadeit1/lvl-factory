#!/usr/bin/env node
/**
 * Upsert environment variables on Vercel project `lvl-factory`.
 *
 * Usage:
 *   VERCEL_TOKEN=… node scripts/sync-vercel-env.mjs
 *   VERCEL_TOKEN=… DRY_RUN=1 node scripts/sync-vercel-env.mjs
 *
 * Optional: set PRINTIFY_* / WEBHOOK_* / DATABASE_URL in the shell or a
 * local `.env.vercel` (gitignored) and they will be pushed as sensitive.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ORG = process.env.VERCEL_ORG_ID || "team_EbvXskCGZVZiHauixSNsUAKv";
const PROJECT =
  process.env.VERCEL_PROJECT_ID || "prj_0m75OJchmM0HOizAy7hTqdKghyPR";
const TOKEN = process.env.VERCEL_TOKEN?.trim();
const DRY = process.env.DRY_RUN === "1";
const TARGETS = ["production", "preview", "development"];

if (!TOKEN) {
  console.error(
    "Missing VERCEL_TOKEN.\n" +
      "Create one at https://vercel.com/account/tokens (team tesla-trek),\n" +
      "then: VERCEL_TOKEN=… npm run vercel:env:sync",
  );
  process.exit(1);
}

function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const fromFiles = {
  ...loadDotEnv(resolve(".env.production")),
  ...loadDotEnv(resolve(".env.vercel")),
};

/** @type {{ key: string, value: string, type: 'plain'|'sensitive', comment?: string }[]} */
const vars = [
  {
    key: "VITE_WALLETCONNECT_PROJECT_ID",
    value:
      process.env.VITE_WALLETCONNECT_PROJECT_ID ||
      fromFiles.VITE_WALLETCONNECT_PROJECT_ID ||
      "7e30c6e6441bbc7523e87195868a572a",
    type: "plain",
    comment: "Reown / WalletConnect Cloud project id (client)",
  },
  {
    key: "VITE_TREASURY_SOL",
    value:
      process.env.VITE_TREASURY_SOL ||
      fromFiles.VITE_TREASURY_SOL ||
      "8sjT1G2YWpscXbJmwv2UK1rHZmQFLaczU5KXiiS8gvDy",
    type: "plain",
    comment: "Solana mainnet treasury pubkey (client)",
  },
];

// Optional server secrets — only pushed if present in env or .env.vercel
const optionalSensitive = [
  "PRINTIFY_API_TOKEN",
  "PRINTIFY_SHOP_ID",
  "PRINTIFY_WEBHOOK_SECRET",
  "PRINTIFY_WEBHOOK_SECRET_PREVIOUS",
  "WEBHOOK_GATE_TOKEN",
  "WEBHOOK_ADMIN_TOKEN",
  "DATABASE_URL",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ZONE_ID",
];

for (const key of optionalSensitive) {
  const value = process.env[key] || fromFiles[key];
  if (value && String(value).trim()) {
    vars.push({
      key,
      value: String(value).trim(),
      type: "sensitive",
      comment: `Server secret — ${key}`,
    });
  }
}

// Plain optional toggles
const optionalPlain = [
  "PRINTIFY_WEBHOOK_MAX_AGE_SEC",
  "PRINTIFY_WEBHOOK_STRICT",
  "PRINTIFY_HMAC_DIAG",
  "ENFORCE_SIGNATURE",
];
for (const key of optionalPlain) {
  const value = process.env[key] || fromFiles[key];
  if (value !== undefined && value !== "") {
    vars.push({
      key,
      value: String(value),
      type: "plain",
      comment: `Config — ${key}`,
    });
  }
}

const url = `https://api.vercel.com/v10/projects/${PROJECT}/env?upsert=true&teamId=${ORG}`;

async function upsert(ev) {
  const body = {
    key: ev.key,
    value: ev.value,
    type: ev.type,
    target: TARGETS,
    comment: ev.comment || undefined,
  };
  if (DRY) {
    console.log(
      `[dry-run] ${ev.key} (${ev.type}) → ${TARGETS.join(",")} len=${ev.value.length}`,
    );
    return { ok: true, dry: true };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    console.error(`FAIL ${ev.key}: ${res.status}`, json);
    return { ok: false, status: res.status, json };
  }
  console.log(`OK  ${ev.key} (${ev.type})`);
  return { ok: true, json };
}

console.log(
  `Syncing ${vars.length} env var(s) → project ${PROJECT} team ${ORG}${DRY ? " [DRY_RUN]" : ""}`,
);
let failed = 0;
for (const ev of vars) {
  const r = await upsert(ev);
  if (!r.ok) failed += 1;
}
if (failed) {
  console.error(`${failed} variable(s) failed`);
  process.exit(1);
}
console.log("Done.");
console.log(
  "Dashboard: https://vercel.com/tesla-trek/lvl-factory/settings/environment-variables",
);
console.log("Redeploy for runtime/build to pick up new values.");
