/**
 * Shared missing / invalid token error handling for ops scripts.
 *
 * Exit codes:
 *   2 — required token missing
 *   3 — token present but rejected (401/403) or malformed
 *   1 — generic failure (callers)
 */

export const EXIT_MISSING = 2;
export const EXIT_INVALID = 3;

/** @typedef {'VERCEL_TOKEN'|'CLOUDFLARE_API_TOKEN'|'PRINTIFY_API_TOKEN'|'WEBHOOK_GATE_TOKEN'|'WEBHOOK_ADMIN_TOKEN'|'PRINTIFY_WEBHOOK_SECRET'} TokenName */

/** @type {Record<string, { label: string, how: string[], minLen?: number, prefix?: RegExp }>} */
const REGISTRY = {
  VERCEL_TOKEN: {
    label: "Vercel API / CLI token",
    how: [
      "Create: https://vercel.com/account/tokens (scope team tesla-trek)",
      "export VERCEL_TOKEN=vcp_…",
      "  or: echo 'VERCEL_TOKEN=vcp_…' >> .env.vercel",
      "  or: npm run vercel:auth:login",
      "GitHub Actions: gh secret set VERCEL_TOKEN --repo omgawdmadeit1/lvl-factory",
    ],
    minLen: 20,
    prefix: /^(vcp_|vercel_)/i,
  },
  CLOUDFLARE_API_TOKEN: {
    label: "Cloudflare API token",
    how: [
      "Create: https://dash.cloudflare.com/profile/api-tokens",
      "Permissions: Zone → WAF Edit + Zone Read (zone lvlltd.com)",
      "export CLOUDFLARE_API_TOKEN=…",
      "  or put in .env / .env.vercel (gitignored)",
    ],
    minLen: 20,
  },
  PRINTIFY_API_TOKEN: {
    label: "Printify API token",
    how: [
      "Printify → Profile → Connections → API tokens",
      "export PRINTIFY_API_TOKEN=…  (server-only, never VITE_*)",
      "  or: .env.vercel + npm run vercel:env:sync",
    ],
    minLen: 8,
  },
  PRINTIFY_WEBHOOK_SECRET: {
    label: "Printify webhook HMAC secret",
    how: [
      "Set the same secret used when creating the Printify webhook",
      "export PRINTIFY_WEBHOOK_SECRET=…",
      "  or dashboard Project Env (DEPLOYED scope)",
    ],
    minLen: 8,
  },
  WEBHOOK_GATE_TOKEN: {
    label: "Webhook edge gate token",
    how: [
      "Generate a random secret for Cloudflare Worker / gate header",
      "export WEBHOOK_GATE_TOKEN=…",
    ],
    minLen: 8,
  },
  WEBHOOK_ADMIN_TOKEN: {
    label: "Webhook admin token",
    how: [
      "Generate a random secret for admin webhook ops",
      "export WEBHOOK_ADMIN_TOKEN=…",
    ],
    minLen: 8,
  },
};

/**
 * @param {string} name
 * @param {string|undefined|null} value
 * @returns {{ ok: true, value: string } | { ok: false, reason: 'missing'|'empty'|'too_short'|'bad_prefix', detail: string }}
 */
export function validateToken(name, value) {
  const meta = REGISTRY[name] || {
    label: name,
    how: [`Set ${name} in the environment or .env.vercel`],
    minLen: 8,
  };
  if (value === undefined || value === null) {
    return { ok: false, reason: "missing", detail: `${meta.label} is not set` };
  }
  const v = String(value).trim();
  if (!v) {
    return { ok: false, reason: "empty", detail: `${meta.label} is empty` };
  }
  // Common placeholder mistakes
  if (
    /^(your_?token|changeme|xxx+|TODO|placeholder|<.*?>|\.\.\.)$/i.test(v) ||
    v.includes("…")
  ) {
    return {
      ok: false,
      reason: "empty",
      detail: `${meta.label} looks like a placeholder, not a real token`,
    };
  }
  if (/\s/.test(v)) {
    return {
      ok: false,
      reason: "bad_prefix",
      detail: `${meta.label} contains whitespace — check for copy/paste errors`,
    };
  }
  const min = meta.minLen ?? 8;
  if (v.length < min) {
    return {
      ok: false,
      reason: "too_short",
      detail: `${meta.label} is too short (${v.length} < ${min})`,
    };
  }
  return { ok: true, value: v };
}

/**
 * Print a structured missing-token error and exit.
 * @param {string} name
 * @param {{ reason?: string, detail?: string, command?: string, exitCode?: number }} [opts]
 */
export function failMissingToken(name, opts = {}) {
  const meta = REGISTRY[name] || {
    label: name,
    how: [`Set ${name} in the environment`],
  };
  const code = opts.exitCode ?? EXIT_MISSING;
  const detail = opts.detail || `${meta.label} is required`;

  console.error("");
  console.error(`ERROR [${code}]: missing token — ${name}`);
  console.error(`  ${detail}`);
  if (opts.reason) console.error(`  reason: ${opts.reason}`);
  if (opts.command) console.error(`  command: ${opts.command}`);
  console.error("");
  console.error("How to fix:");
  for (const line of meta.how) {
    console.error(`  • ${line}`);
  }
  console.error("");
  console.error("Docs: DOMAIN.md § Vercel CLI authentication / environment variables");
  process.exit(code);
}

/**
 * Token was sent but API rejected it.
 * @param {string} name
 * @param {{ status?: number, body?: string, command?: string }} [opts]
 */
export function failInvalidToken(name, opts = {}) {
  const meta = REGISTRY[name] || { label: name, how: [] };
  const status = opts.status ?? 401;
  console.error("");
  console.error(`ERROR [${EXIT_INVALID}]: invalid token — ${name}`);
  console.error(`  ${meta.label} was rejected by the API (HTTP ${status})`);
  if (opts.body) {
    const snippet = String(opts.body).replace(/\s+/g, " ").slice(0, 200);
    console.error(`  response: ${snippet}`);
  }
  if (opts.command) console.error(`  command: ${opts.command}`);
  console.error("");
  console.error("How to fix:");
  console.error("  • Token may be revoked, expired, or wrong team scope");
  for (const line of meta.how) {
    console.error(`  • ${line}`);
  }
  if (name === "VERCEL_TOKEN") {
    console.error(
      "  • Ensure the token can access team tesla-trek / project lvl-factory",
    );
    console.error("  • Re-login: npm run vercel:auth:logout && npm run vercel:auth:login");
  }
  console.error("");
  process.exit(EXIT_INVALID);
}

/**
 * Resolve and validate a required token, or exit with a clear error.
 * @param {string} name
 * @param {string|undefined|null} value
 * @param {{ command?: string }} [opts]
 * @returns {string}
 */
export function requireTokenValue(name, value, opts = {}) {
  const result = validateToken(name, value);
  if (!result.ok) {
    failMissingToken(name, {
      reason: result.reason,
      detail: result.detail,
      command: opts.command,
    });
  }
  return result.value;
}

/**
 * Map HTTP status from token-authenticated APIs to a hard fail when appropriate.
 * @param {string} name
 * @param {number} status
 * @param {string} [body]
 * @param {string} [command]
 * @returns {boolean} true if handled (always exits on 401/403)
 */
export function handleAuthHttpError(name, status, body, command) {
  if (status === 401 || status === 403) {
    failInvalidToken(name, { status, body, command });
    return true;
  }
  return false;
}

/**
 * Human-readable inventory of which known tokens are present (values masked).
 * @param {Record<string, string|undefined>} bag
 */
export function printTokenInventory(bag) {
  console.log("Token inventory:");
  for (const [name, raw] of Object.entries(bag)) {
    const r = validateToken(name, raw);
    if (r.ok) {
      const v = r.value;
      const mask =
        v.length > 12 ? `${v.slice(0, 4)}…${v.slice(-4)}` : "(set)";
      console.log(`  ${name.padEnd(28)} OK  ${mask}`);
    } else {
      console.log(`  ${name.padEnd(28)} —   ${r.reason}`);
    }
  }
}
