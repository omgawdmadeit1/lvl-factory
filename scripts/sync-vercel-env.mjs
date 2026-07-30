#!/usr/bin/env node
/**
 * Vercel project environment variable manager for `lvl-factory`.
 *
 * Each variable has an explicit **scope** (Vercel target environments):
 *   ALL          → production + preview + development
 *   DEPLOYED     → production + preview  (runtime on Vercel, not local pull)
 *   PRODUCTION   → production only       (strict / live secrets)
 *   PREVIEW      → preview only
 *   DEVELOPMENT  → development only      (vercel pull / local)
 *   NONE         → never push to Vercel   (local ops scripts only)
 *
 * Usage:
 *   node scripts/sync-vercel-env.mjs status|scopes|dry|list|sync|diff
 *   npm run vercel:env
 *   npm run vercel:env:scopes
 *   npm run vercel:env:dry
 *   npm run vercel:env:sync
 *
 * Token: VERCEL_TOKEN · .env.vercel · CLI auth.json · --token
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  requireTokenValue,
  handleAuthHttpError,
  validateToken,
  printTokenInventory,
  EXIT_MISSING,
} from "./lib/token-errors.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const ORG = process.env.VERCEL_ORG_ID || "team_EbvXskCGZVZiHauixSNsUAKv";
const PROJECT =
  process.env.VERCEL_PROJECT_ID || "prj_0m75OJchmM0HOizAy7hTqdKghyPR";
const PROJECT_NAME = "lvl-factory";
const TEAM_SLUG = "tesla-trek";
const DASHBOARD = `https://vercel.com/${TEAM_SLUG}/${PROJECT_NAME}/settings/environment-variables`;

/** @typedef {'production'|'preview'|'development'} VercelTarget */
/** @typedef {'ALL'|'DEPLOYED'|'PRODUCTION'|'PREVIEW'|'DEVELOPMENT'|'NONE'} ScopeName */

/** @type {Record<ScopeName, VercelTarget[]>} */
const SCOPES = {
  ALL: ["production", "preview", "development"],
  DEPLOYED: ["production", "preview"],
  PRODUCTION: ["production"],
  PREVIEW: ["preview"],
  DEVELOPMENT: ["development"],
  NONE: [],
};

const SCOPE_LABELS = {
  ALL: "prod + preview + development",
  DEPLOYED: "prod + preview",
  PRODUCTION: "production only",
  PREVIEW: "preview only",
  DEVELOPMENT: "development only",
  NONE: "local only (never push)",
};

const cmdArg = (process.argv[2] || "").toLowerCase();
const CMD =
  cmdArg ||
  (process.env.DRY_RUN === "1" ? "dry" : "status");
const DRY =
  process.env.DRY_RUN === "1" || CMD === "dry" || process.argv.includes("--dry");

// ---------------------------------------------------------------------------
// Token + dotenv
// ---------------------------------------------------------------------------

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

function resolveTokenFromArgs() {
  const args = process.argv.slice(2);
  const idx = args.findIndex((a) => a === "--token" || a === "-t");
  if (idx >= 0 && args[idx + 1]) return args[idx + 1].trim();
  const eq = args.find((a) => a.startsWith("--token="));
  if (eq) return eq.slice("--token=".length).trim();
  return "";
}

function readAuthJsonToken() {
  const path = join(homedir(), ".local/share/com.vercel.cli/auth.json");
  if (!existsSync(path)) return "";
  try {
    return (JSON.parse(readFileSync(path, "utf8")).token || "").trim();
  } catch {
    return "";
  }
}

function resolveToken() {
  return (
    resolveTokenFromArgs() ||
    process.env.VERCEL_TOKEN?.trim() ||
    loadDotEnv(join(ROOT, ".env.vercel")).VERCEL_TOKEN?.trim() ||
    loadDotEnv(join(ROOT, ".env")).VERCEL_TOKEN?.trim() ||
    readAuthJsonToken() ||
    ""
  );
}

function requireToken(command = "vercel:env") {
  return requireTokenValue("VERCEL_TOKEN", resolveToken(), { command });
}

const fromFiles = {
  ...loadDotEnv(join(ROOT, ".env.production")),
  ...loadDotEnv(join(ROOT, ".env")),
  ...loadDotEnv(join(ROOT, ".env.vercel")),
};

function resolveValue(key, fallback) {
  const v = process.env[key] ?? fromFiles[key] ?? fallback;
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

// ---------------------------------------------------------------------------
// Catalog with explicit scopes
// ---------------------------------------------------------------------------

/**
 * @typedef {object} EnvDef
 * @property {string} key
 * @property {'plain'|'sensitive'} type
 * @property {ScopeName} scope
 * @property {boolean} required  always push when true (uses default if unset)
 * @property {string} [defaultValue]
 * @property {string} comment
 * @property {boolean} [opsOnly]  local scripts only — never Vercel runtime
 */

/** @type {EnvDef[]} */
const CATALOG = [
  // —— Client (public, baked into browser) — all environments ——
  {
    key: "VITE_WALLETCONNECT_PROJECT_ID",
    type: "plain",
    scope: "ALL",
    required: true,
    defaultValue: "7e30c6e6441bbc7523e87195868a572a",
    comment: "Reown / WalletConnect Cloud project id (client)",
  },
  {
    key: "VITE_TREASURY_SOL",
    type: "plain",
    scope: "ALL",
    required: true,
    defaultValue: "8sjT1G2YWpscXbJmwv2UK1rHZmQFLaczU5KXiiS8gvDy",
    comment: "Solana mainnet treasury pubkey (client)",
  },
  {
    key: "VITE_STUN_URLS",
    type: "plain",
    scope: "ALL",
    required: false,
    comment: "Optional comma-separated STUN URLs (client)",
  },
  {
    key: "VITE_AUTH_ENABLED",
    type: "plain",
    scope: "ALL",
    required: false,
    comment: "Set false to force dev user; omit = auth on",
  },

  // —— Server secrets on every Vercel deploy (prod + preview) ——
  {
    key: "PRINTIFY_API_TOKEN",
    type: "sensitive",
    scope: "DEPLOYED",
    required: false,
    comment: "Printify API token",
  },
  {
    key: "PRINTIFY_SHOP_ID",
    type: "sensitive",
    scope: "DEPLOYED",
    required: false,
    comment: "Printify shop id",
  },
  {
    key: "PRINTIFY_WEBHOOK_SECRET",
    type: "sensitive",
    scope: "DEPLOYED",
    required: false,
    comment: "HMAC primary secret",
  },
  {
    key: "PRINTIFY_WEBHOOK_SECRET_PREVIOUS",
    type: "sensitive",
    scope: "DEPLOYED",
    required: false,
    comment: "HMAC rotation previous secret",
  },
  {
    key: "WEBHOOK_GATE_TOKEN",
    type: "sensitive",
    scope: "DEPLOYED",
    required: false,
    comment: "Edge / worker gate token",
  },
  {
    key: "WEBHOOK_ADMIN_TOKEN",
    type: "sensitive",
    scope: "DEPLOYED",
    required: false,
    comment: "Admin webhook ops token",
  },
  {
    key: "DATABASE_URL",
    type: "sensitive",
    scope: "DEPLOYED",
    required: false,
    comment: "Postgres/Neon URL (else PGLite)",
  },
  {
    key: "AGENT_ORDER_SECRET",
    type: "sensitive",
    scope: "DEPLOYED",
    required: false,
    comment: "HMAC secret for sealed agent order tokens (stable across deploys)",
  },
  // —— AWS via Vercel OIDC (production; role trust is prod-only) ——
  {
    key: "AWS_ACCOUNT_ID",
    type: "plain",
    scope: "PRODUCTION",
    required: false,
    comment: "12-digit AWS account id (docs / role ARN prefix)",
  },
  {
    key: "AWS_ROLE_ARN",
    type: "sensitive",
    scope: "PRODUCTION",
    required: false,
    comment: "IAM role assumed via Vercel OIDC (lvl-factory-runtime-prod)",
  },
  {
    key: "AWS_REGION",
    type: "plain",
    scope: "PRODUCTION",
    required: false,
    comment: "AWS region for S3 client (e.g. us-east-1)",
  },
  {
    key: "AWS_S3_BUCKET",
    type: "plain",
    scope: "PRODUCTION",
    required: false,
    comment: "S3 bucket for factory assets (OIDC role scoped)",
  },
  {
    key: "AWS_S3_PREFIX",
    type: "plain",
    scope: "PRODUCTION",
    required: false,
    comment: "Key prefix inside bucket (default factory/)",
  },
  {
    key: "AWS_OIDC_AUDIENCE",
    type: "plain",
    scope: "PRODUCTION",
    required: false,
    comment: "Optional custom OIDC aud for STS (only if IAM requires it)",
  },
  {
    key: "PRINTIFY_WEBHOOK_URL",
    type: "plain",
    scope: "DEPLOYED",
    required: false,
    comment: "Public webhook URL override",
  },
  {
    key: "PRINTIFY_WEBHOOK_MAX_AGE_SEC",
    type: "plain",
    scope: "DEPLOYED",
    required: false,
    comment: "Reject old webhook events (0 = off)",
  },

  // —— Production-only hardening ——
  {
    key: "PRINTIFY_WEBHOOK_STRICT",
    type: "plain",
    scope: "PRODUCTION",
    required: false,
    comment: "Force 403 on bad HMAC in production",
  },
  {
    key: "ENFORCE_SIGNATURE",
    type: "plain",
    scope: "PRODUCTION",
    required: false,
    comment: "Alias strict HMAC enforce (production)",
  },

  // —— Development-only diagnostics (vercel pull / local) ——
  {
    key: "PRINTIFY_WEBHOOK_LOOSE",
    type: "plain",
    scope: "DEVELOPMENT",
    required: false,
    comment: "Allow loose webhook verify in development",
  },
  {
    key: "PRINTIFY_HMAC_DIAG",
    type: "plain",
    scope: "DEVELOPMENT",
    required: false,
    comment: "HMAC diagnostics (never enable in prod logs)",
  },

  // —— Local ops only (WAF scripts) — do NOT push to Vercel runtime ——
  {
    key: "CLOUDFLARE_API_TOKEN",
    type: "sensitive",
    scope: "NONE",
    required: false,
    opsOnly: true,
    comment: "CF API for waf:* scripts only",
  },
  {
    key: "CLOUDFLARE_ZONE_ID",
    type: "sensitive",
    scope: "NONE",
    required: false,
    opsOnly: true,
    comment: "CF zone id for waf:* scripts only",
  },
  {
    key: "CLOUDFLARE_ZONE_NAME",
    type: "plain",
    scope: "NONE",
    required: false,
    opsOnly: true,
    comment: "CF zone name for waf:* scripts only",
  },
];

/**
 * @returns {{ key: string, value: string, type: 'plain'|'sensitive', target: VercelTarget[], comment: string, scope: ScopeName }[]}
 */
function buildPushList() {
  const vars = [];
  for (const def of CATALOG) {
    const targets = SCOPES[def.scope];
    if (!targets.length) continue; // NONE — never push

    let value = resolveValue(def.key, def.defaultValue);
    if (!value) {
      if (!def.required) continue;
      value = def.defaultValue || "";
    }
    if (!value) continue;

    vars.push({
      key: def.key,
      value,
      type: def.type,
      target: targets,
      comment: def.comment,
      scope: def.scope,
    });
  }
  return vars;
}

function catalogRows() {
  return CATALOG.map((def) => {
    const localRaw = resolveValue(def.key, def.required ? def.defaultValue : "");
    const has =
      def.required && def.defaultValue
        ? Boolean(localRaw)
        : Boolean(resolveValue(def.key, ""));
    return {
      key: def.key,
      kind: def.opsOnly
        ? "ops/local"
        : def.type === "sensitive"
          ? "server/sensitive"
          : def.key.startsWith("VITE_")
            ? "client/plain"
            : "config/plain",
      scope: def.scope,
      scopeLabel: SCOPE_LABELS[def.scope],
      required: def.required,
      local: has
        ? def.scope === "NONE"
          ? "set (local only)"
          : "set"
        : def.required
          ? "missing"
          : "unset",
      note: def.comment,
    };
  });
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function api(path, { method = "GET", token, body } = {}) {
  const url = path.startsWith("http")
    ? path
    : `https://api.vercel.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "lvl-factory-env-sync",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function listRemote(token) {
  const path = `/v9/projects/${PROJECT}/env?teamId=${ORG}&decrypt=false`;
  const { ok, status, json, text } = await api(path, { token });
  if (!ok) {
    handleAuthHttpError("VERCEL_TOKEN", status, text, "vercel:env:list");
    console.error(`List failed HTTP ${status}`, text.slice(0, 300));
    process.exit(1);
  }
  return Array.isArray(json) ? json : json?.envs || [];
}

async function upsertOne(token, ev) {
  const url = `/v10/projects/${PROJECT}/env?upsert=true&teamId=${ORG}`;
  const body = {
    key: ev.key,
    value: ev.value,
    type: ev.type,
    target: ev.target,
    comment: ev.comment || undefined,
  };
  if (DRY) {
    console.log(
      `[dry-run] ${ev.key} (${ev.type}) scope=${ev.scope} → [${ev.target.join(",")}] len=${ev.value.length}`,
    );
    return { ok: true, dry: true };
  }
  const { ok, status, json } = await api(url, {
    method: "POST",
    token,
    body,
  });
  if (!ok) {
    handleAuthHttpError(
      "VERCEL_TOKEN",
      status,
      typeof json === "object" ? JSON.stringify(json) : String(json),
      "vercel:env:sync",
    );
    console.error(`FAIL ${ev.key}: ${status}`, json);
    return { ok: false, status, json };
  }
  console.log(
    `OK  ${ev.key} (${ev.type}) → [${ev.target.join(",")}]`,
  );
  return { ok: true, json };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function printScopeLegend() {
  console.log("Scopes (Vercel targets):");
  for (const [name, targets] of Object.entries(SCOPES)) {
    const t = targets.length ? targets.join(", ") : "(not pushed)";
    console.log(`  ${name.padEnd(12)} ${t.padEnd(36)} ${SCOPE_LABELS[name]}`);
  }
}

function cmdScopes() {
  console.log(`Environment variable scopes — ${PROJECT_NAME}`);
  console.log(`  ${DASHBOARD}`);
  console.log("");
  printScopeLegend();
  console.log("");
  const wKey = Math.max(...CATALOG.map((d) => d.key.length), 3);
  console.log(
    `${"KEY".padEnd(wKey)}  ${"SCOPE".padEnd(12)}  ${"TYPE".padEnd(10)}  TARGETS`,
  );
  console.log(
    `${"-".repeat(wKey)}  ${"-".repeat(12)}  ${"-".repeat(10)}  -------`,
  );
  for (const def of CATALOG) {
    const targets = SCOPES[def.scope];
    console.log(
      `${def.key.padEnd(wKey)}  ${def.scope.padEnd(12)}  ${def.type.padEnd(10)}  ${targets.length ? targets.join(",") : "—"}`,
    );
  }
  console.log("");
  console.log("Policy:");
  console.log("  • Client VITE_*          → ALL (same wallet/treasury everywhere)");
  console.log("  • Printify / webhooks / DB → DEPLOYED (prod + preview)");
  console.log("  • Strict HMAC flags      → PRODUCTION only");
  console.log("  • Diag / loose verify    → DEVELOPMENT only");
  console.log("  • Cloudflare WAF tokens  → NONE (local scripts, not runtime)");
}

function cmdStatus() {
  console.log(`Vercel env catalog — ${PROJECT_NAME}`);
  console.log(`  Project: ${PROJECT}`);
  console.log(`  Team:    ${TEAM_SLUG} (${ORG})`);
  console.log(`  Dashboard: ${DASHBOARD}`);
  console.log("");
  printScopeLegend();
  console.log("");
  console.log(
    "Sources: .env.production (client) · .env.vercel (secrets) · shell",
  );
  console.log("");

  const rows = catalogRows();
  const wKey = Math.max(...rows.map((r) => r.key.length), 3);
  console.log(
    `${"KEY".padEnd(wKey)}  ${"SCOPE".padEnd(12)}  ${"KIND".padEnd(16)}  LOCAL              NOTE`,
  );
  console.log(
    `${"-".repeat(wKey)}  ${"-".repeat(12)}  ${"-".repeat(16)}  ${"-".repeat(16)}  ----`,
  );
  for (const r of rows) {
    console.log(
      `${r.key.padEnd(wKey)}  ${r.scope.padEnd(12)}  ${r.kind.padEnd(16)}  ${r.local.padEnd(16)}  ${r.note}`,
    );
  }

  const push = buildPushList();
  console.log("");
  console.log(`Sync would push ${push.length} var(s):`);
  for (const v of push) {
    console.log(`  ${v.key} → [${v.target.join(",")}] (${v.type})`);
  }

  const unsetSecrets = CATALOG.filter(
    (d) =>
      d.type === "sensitive" &&
      d.scope !== "NONE" &&
      !resolveValue(d.key, ""),
  );
  if (unsetSecrets.length) {
    console.log("");
    console.log(
      "Optional secrets not local (set in dashboard or .env.vercel before sync):",
    );
    for (const d of unsetSecrets) {
      console.log(`  - ${d.key}  [${d.scope}]`);
    }
  }
  console.log("");
  printTokenInventory({
    VERCEL_TOKEN: resolveToken() || undefined,
    PRINTIFY_API_TOKEN: resolveValue("PRINTIFY_API_TOKEN", "") || undefined,
    PRINTIFY_WEBHOOK_SECRET:
      resolveValue("PRINTIFY_WEBHOOK_SECRET", "") || undefined,
    WEBHOOK_GATE_TOKEN: resolveValue("WEBHOOK_GATE_TOKEN", "") || undefined,
    CLOUDFLARE_API_TOKEN: resolveValue("CLOUDFLARE_API_TOKEN", "") || undefined,
  });
  const vt = validateToken("VERCEL_TOKEN", resolveToken() || undefined);
  if (!vt.ok) {
    console.log("");
    console.log(
      `Note: remote commands need a valid VERCEL_TOKEN (exit ${EXIT_MISSING} if missing).`,
    );
  }
  console.log("");
  console.log("Commands: vercel:env:scopes | vercel:env:dry | vercel:env:list | vercel:env:sync");
}

function cmdDry() {
  const vars = buildPushList();
  console.log(`Dry-run push → ${PROJECT_NAME} (${PROJECT})`);
  console.log("");
  for (const ev of vars) {
    const preview =
      ev.type === "sensitive"
        ? `(sensitive, ${ev.value.length} chars)`
        : ev.value.length > 48
          ? `${ev.value.slice(0, 24)}…${ev.value.slice(-8)}`
          : ev.value;
    console.log(
      `  ${ev.key.padEnd(36)} ${ev.type.padEnd(10)} ${ev.scope.padEnd(12)} [${ev.target.join(",")}]  ${preview}`,
    );
  }
  console.log("");
  // group by scope
  /** @type {Map<string, number>} */
  const byScope = new Map();
  for (const v of vars) {
    byScope.set(v.scope, (byScope.get(v.scope) || 0) + 1);
  }
  console.log("By scope:");
  for (const [s, n] of byScope) {
    console.log(`  ${s}: ${n}  (${SCOPE_LABELS[s]})`);
  }
  console.log("");
  console.log(`${vars.length} variable(s). Run: npm run vercel:env:sync`);
  const tokCheck = validateToken("VERCEL_TOKEN", resolveToken() || undefined);
  if (!tokCheck.ok) {
    console.log(
      `(VERCEL_TOKEN ${tokCheck.reason}: list/sync will exit ${EXIT_MISSING} — run npm run vercel:auth:login)`,
    );
  }
}

async function cmdList() {
  const token = requireToken();
  const envs = await listRemote(token);
  console.log(`Remote env — ${PROJECT_NAME} (${envs.length} entries)`);
  console.log(`  ${DASHBOARD}`);
  console.log("");
  if (!envs.length) {
    console.log("(none configured on project yet)");
    return;
  }

  /** @type {Map<string, any[]>} */
  const byKey = new Map();
  for (const e of envs) {
    const k = e.key || e.id;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(e);
  }

  const catalogByKey = new Map(CATALOG.map((d) => [d.key, d]));

  console.log(
    `${"KEY".padEnd(36)} ${"TYPE".padEnd(12)} ${"REMOTE TARGETS".padEnd(32)} EXPECTED SCOPE`,
  );
  console.log(
    `${"-".repeat(36)} ${"-".repeat(12)} ${"-".repeat(32)} --------------`,
  );
  for (const [key, entries] of [...byKey.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const types = [...new Set(entries.map((e) => e.type || "?"))].join(",");
    const targets = [
      ...new Set(entries.flatMap((e) => e.target || e.targets || [])),
    ]
      .sort()
      .join(",");
    const def = catalogByKey.get(key);
    const expected = def
      ? `${def.scope} [${SCOPES[def.scope].join(",") || "—"}]`
      : "extra";
    // scope mismatch hint
    let flag = "";
    if (def && def.scope !== "NONE") {
      const want = new Set(SCOPES[def.scope]);
      const have = new Set(
        entries.flatMap((e) => e.target || e.targets || []),
      );
      const same =
        want.size === have.size && [...want].every((t) => have.has(t));
      if (!same) flag = " ⚠ scope mismatch";
    } else if (def?.scope === "NONE") {
      flag = " ⚠ should not be on Vercel";
    }
    console.log(
      `${key.padEnd(36)} ${types.padEnd(12)} ${targets.padEnd(32)} ${expected}${flag}`,
    );
  }

  const remoteKeys = new Set(byKey.keys());
  const missingRequired = CATALOG.filter(
    (d) => d.required && d.scope !== "NONE" && !remoteKeys.has(d.key),
  );
  if (missingRequired.length) {
    console.log("");
    console.log("Missing required on Vercel:");
    for (const d of missingRequired) {
      console.log(`  - ${d.key}  scope=${d.scope}  → npm run vercel:env:sync`);
    }
  }
}

async function cmdSync() {
  const token = DRY ? resolveToken() : requireToken();
  const vars = buildPushList();
  console.log(
    `Syncing ${vars.length} env var(s) → ${PROJECT}${DRY ? " [DRY_RUN]" : ""}`,
  );

  if (DRY && !token) {
    for (const ev of vars) {
      console.log(
        `[dry-run] ${ev.key} (${ev.type}) scope=${ev.scope} → [${ev.target.join(",")}] len=${ev.value.length}`,
      );
    }
    console.log("Done (dry, no API calls).");
    return;
  }

  let failed = 0;
  for (const ev of vars) {
    const r = await upsertOne(token, ev);
    if (!r.ok) failed += 1;
  }
  if (failed) {
    console.error(`${failed} variable(s) failed`);
    process.exit(1);
  }
  console.log("Done.");
  console.log(`Dashboard: ${DASHBOARD}`);
  if (!DRY) {
    console.log("Redeploy production so VITE_* bake into the client bundle.");
  }
}

async function cmdDiff() {
  const token = requireToken();
  const remote = await listRemote(token);
  const push = buildPushList();

  /** @type {Map<string, Set<string>>} */
  const remoteTargets = new Map();
  for (const e of remote) {
    const k = e.key;
    if (!remoteTargets.has(k)) remoteTargets.set(k, new Set());
    for (const t of e.target || e.targets || []) {
      remoteTargets.get(k).add(t);
    }
  }

  console.log(`Diff local scopes → remote — ${PROJECT_NAME}`);
  console.log("");
  for (const v of push) {
    const have = remoteTargets.get(v.key);
    if (!have) {
      console.log(`  create   ${v.key}  → [${v.target.join(",")}]`);
      continue;
    }
    const want = new Set(v.target);
    const same =
      want.size === have.size && [...want].every((t) => have.has(t));
    if (same) {
      console.log(`  ok       ${v.key}  [${v.target.join(",")}]`);
    } else {
      console.log(
        `  rescope  ${v.key}  remote=[${[...have].sort().join(",")}]  want=[${v.target.join(",")}]`,
      );
    }
  }

  const pushKeys = new Set(push.map((v) => v.key));
  const noneKeys = new Set(
    CATALOG.filter((d) => d.scope === "NONE").map((d) => d.key),
  );
  for (const key of [...remoteTargets.keys()].sort()) {
    if (pushKeys.has(key)) continue;
    if (noneKeys.has(key)) {
      console.log(`  remove?  ${key}  (catalog scope=NONE — local ops only)`);
    } else {
      console.log(`  keep     ${key}  (not in sync payload)`);
    }
  }
}

async function cmdHelp() {
  console.log(`Usage: node scripts/sync-vercel-env.mjs <status|scopes|dry|list|sync|diff>
  status   Catalog + local values + scopes
  scopes   Scope matrix only
  dry      Push payload with per-var targets
  list     Remote keys + scope mismatch (token)
  sync     Upsert with correct targets (token)
  diff     Create / rescope / keep (token)`);
}

const map = {
  status: cmdStatus,
  scopes: cmdScopes,
  scope: cmdScopes,
  dry: cmdDry,
  list: cmdList,
  ls: cmdList,
  sync: cmdSync,
  push: cmdSync,
  diff: cmdDiff,
  help: cmdHelp,
};

const run = map[CMD] || map.help;
await run();
