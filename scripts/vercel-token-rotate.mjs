#!/usr/bin/env node
/**
 * Automate Vercel personal-access-token rotation for LVL Factory.
 *
 * Vercel exposes create/list/delete on /v2/user/tokens. This script:
 *   1) Creates a new token via API
 *   2) Validates project access (tesla-trek / lvl-factory)
 *   3) Writes gitignored .env.vercel (+ optional CLI auth.json)
 *   4) Optionally updates GitHub secret VERCEL_TOKEN
 *   5) Revokes the previous token (matched by suffix)
 *
 * Usage:
 *   node scripts/vercel-token-rotate.mjs list
 *   node scripts/vercel-token-rotate.mjs status
 *   node scripts/vercel-token-rotate.mjs rotate
 *   node scripts/vercel-token-rotate.mjs rotate --keep-old
 *   node scripts/vercel-token-rotate.mjs rotate --no-gh
 *   node scripts/vercel-token-rotate.mjs rotate --name lvl-ops
 *   node scripts/vercel-token-rotate.mjs install --token vcp_…
 *   node scripts/vercel-token-rotate.mjs revoke --id <tokenId>
 *   node scripts/vercel-token-rotate.mjs create --print   # create only, print once
 *
 * Token sources (current / old): VERCEL_TOKEN env · .env.vercel · CLI auth.json
 * Never commits secrets. Never prints full token values unless --print on create-only.
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  requireTokenValue,
  validateToken,
  handleAuthHttpError,
  EXIT_MISSING,
  EXIT_INVALID,
} from "./lib/token-errors.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const ORG_ID = process.env.VERCEL_ORG_ID || "team_EbvXskCGZVZiHauixSNsUAKv";
const PROJECT_ID =
  process.env.VERCEL_PROJECT_ID || "prj_0m75OJchmM0HOizAy7hTqdKghyPR";
const PROJECT_NAME = "lvl-factory";
const TEAM_SLUG = "tesla-trek";
const GH_REPO =
  process.env.GITHUB_REPO || "omgawdmadeit1/lvl-factory";
const ENV_FILE = join(ROOT, ".env.vercel");
const API = "https://api.vercel.com";

const args = process.argv.slice(2);
const cmd = (args[0] || "status").toLowerCase();

function flag(name) {
  return args.includes(name);
}
function opt(name, fallback = "") {
  const i = args.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i < 0) return fallback;
  if (args[i].includes("=")) return args[i].split("=").slice(1).join("=");
  return args[i + 1] || fallback;
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

function mask(token) {
  if (!token || token.length < 12) return "(short)";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

function resolveCurrentToken() {
  return (
    opt("--token") ||
    process.env.VERCEL_TOKEN?.trim() ||
    loadDotEnv(ENV_FILE).VERCEL_TOKEN?.trim() ||
    readCliAuthToken() ||
    ""
  );
}

function readCliAuthToken() {
  const candidates = [
    join(homedir(), ".local/share/com.vercel.cli/auth.json"),
    join(homedir(), "Library/Application Support/com.vercel.cli/auth.json"),
    join(homedir(), ".config/com.vercel.cli/auth.json"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, "utf8"));
      const t = j.token || j.authToken;
      if (typeof t === "string" && t.length > 20) return t;
    } catch {
      /* ignore */
    }
  }
  return "";
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "LVL-Factory-Token-Rotate/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json };
}

async function listTokens(token) {
  const r = await api("GET", "/v2/user/tokens", token);
  if (!r.ok) {
    handleAuthHttpError("VERCEL_TOKEN", r.status, r.text, "token:list");
    process.exit(EXIT_INVALID);
  }
  return r.json?.tokens || [];
}

async function createToken(token, name) {
  const body = { name };
  // omit expiresAt → no expiry (API rejects null)
  const r = await api("POST", "/v2/user/tokens", token, body);
  if (!r.ok) {
    console.error(`Create failed HTTP ${r.status}: ${r.text.slice(0, 300)}`);
    process.exit(1);
  }
  const t = r.json?.token || r.json;
  if (!t?.token || !t?.id) {
    console.error("Create response missing token/id", r.text.slice(0, 200));
    process.exit(1);
  }
  return { id: t.id, name: t.name, token: t.token, suffix: t.suffix };
}

async function deleteToken(authToken, id) {
  const r = await api("DELETE", `/v2/user/tokens/${id}`, authToken);
  return r;
}

async function validateAccess(token) {
  const user = await api("GET", "/v2/user", token);
  if (!user.ok) {
    return { ok: false, reason: `user ${user.status}` };
  }
  const proj = await api(
    "GET",
    `/v9/projects/${PROJECT_ID}?teamId=${ORG_ID}`,
    token,
  );
  if (!proj.ok) {
    return { ok: false, reason: `project ${proj.status}` };
  }
  const u = user.json?.user || user.json;
  return {
    ok: true,
    username: u?.username || u?.email || u?.id,
    project: proj.json?.name || PROJECT_NAME,
  };
}

function matchTokenBySuffix(tokens, rawToken) {
  if (!rawToken) return null;
  return (
    tokens.find(
      (t) =>
        t.suffix &&
        typeof t.suffix === "string" &&
        rawToken.endsWith(t.suffix),
    ) || null
  );
}

function upsertEnvVercel(newToken, previousToken) {
  const existing = existsSync(ENV_FILE) ? loadDotEnv(ENV_FILE) : {};
  const lines = [
    "# Vercel ops credentials — gitignored (.env.vercel)",
    "# Rotated by: npm run vercel:token:rotate",
    `VERCEL_TOKEN=${newToken}`,
  ];
  if (previousToken && previousToken !== newToken) {
    lines.push(`VERCEL_TOKEN_PREVIOUS=${previousToken}`);
  } else if (existing.VERCEL_TOKEN_PREVIOUS) {
    lines.push(`VERCEL_TOKEN_PREVIOUS=${existing.VERCEL_TOKEN_PREVIOUS}`);
  }
  // preserve other keys (PRINTIFY etc. should live in .env, but keep if present)
  for (const [k, v] of Object.entries(existing)) {
    if (k === "VERCEL_TOKEN" || k === "VERCEL_TOKEN_PREVIOUS") continue;
    if (v != null && String(v).length) lines.push(`${k}=${v}`);
  }
  writeFileSync(ENV_FILE, lines.join("\n") + "\n", { mode: 0o600 });
  try {
    chmodSync(ENV_FILE, 0o600);
  } catch {
    /* ignore */
  }
  return ENV_FILE;
}

function writeCliAuth(token) {
  const dir = join(homedir(), ".local/share/com.vercel.cli");
  mkdirSync(dir, { recursive: true });
  const authPath = join(dir, "auth.json");
  writeFileSync(
    authPath,
    JSON.stringify({ token, "//": "LVL factory rotated token" }, null, 2) +
      "\n",
    { mode: 0o600 },
  );
  try {
    chmodSync(authPath, 0o600);
  } catch {
    /* ignore */
  }
  return authPath;
}

function tryGhSecretSet(token) {
  if (flag("--no-gh")) {
    return { skipped: true, reason: "--no-gh" };
  }
  const gh = spawnSync(
    "gh",
    ["secret", "set", "VERCEL_TOKEN", "--repo", GH_REPO, "--body", token],
    { encoding: "utf8" },
  );
  if (gh.status === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    stderr: (gh.stderr || gh.stdout || "").trim().slice(0, 240),
  };
}

function defaultName() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return opt("--name", `lvl-factory-${y}${m}${day}`);
}

async function cmdList() {
  const token = requireTokenValue("VERCEL_TOKEN", resolveCurrentToken(), {
    command: "vercel:token:list",
  });
  const tokens = await listTokens(token);
  const current = matchTokenBySuffix(tokens, token);
  console.log(`Vercel tokens (${tokens.length}) — team ops for ${PROJECT_NAME}`);
  console.log("");
  for (const t of tokens) {
    const mark = current && t.id === current.id ? " ← current" : "";
    const created =
      t.createdAt || t.created
        ? new Date(t.createdAt || t.created).toISOString().slice(0, 10)
        : "?";
    console.log(
      `  ${t.id.slice(0, 10)}…  ${(t.name || "").padEnd(40).slice(0, 40)}  …${t.suffix || "????"}  ${created}${mark}`,
    );
  }
  if (current) {
    console.log("");
    console.log(`Current shell token matches: ${current.name} (…${current.suffix})`);
  }
}

async function cmdStatus() {
  const token = resolveCurrentToken();
  console.log("Vercel token rotation — status");
  console.log(`  Project: ${PROJECT_NAME} (${PROJECT_ID})`);
  console.log(`  Team:    ${TEAM_SLUG}`);
  console.log(`  .env.vercel: ${existsSync(ENV_FILE) ? "present" : "absent"}`);
  if (!token) {
    console.log("  Current token: missing");
    process.exit(EXIT_MISSING);
  }
  const shape = validateToken("VERCEL_TOKEN", token);
  if (!shape.ok) {
    console.log(`  Current token: invalid (${shape.detail})`);
    process.exit(EXIT_INVALID);
  }
  console.log(`  Current token: ${mask(token)}`);
  const access = await validateAccess(token);
  if (!access.ok) {
    console.log(`  Access: FAIL (${access.reason})`);
    process.exit(EXIT_INVALID);
  }
  console.log(`  User: ${access.username}`);
  console.log(`  Project access: ${access.project} ✓`);
  const tokens = await listTokens(token);
  const cur = matchTokenBySuffix(tokens, token);
  console.log(`  Registry entries: ${tokens.length}`);
  if (cur) {
    console.log(`  Matched id: ${cur.id.slice(0, 12)}… name=${cur.name}`);
  } else {
    console.log(
      "  Matched id: (suffix not found — token may predate suffix field or be OAuth)",
    );
  }
  const prev = loadDotEnv(ENV_FILE).VERCEL_TOKEN_PREVIOUS;
  if (prev) console.log(`  Previous backup: ${mask(prev)}`);
  console.log("");
  console.log("Rotate: npm run vercel:token:rotate");
}

async function cmdCreate() {
  const token = requireTokenValue("VERCEL_TOKEN", resolveCurrentToken(), {
    command: "vercel:token:create",
  });
  const name = defaultName();
  console.log(`Creating token "${name}" …`);
  const created = await createToken(token, name);
  const access = await validateAccess(created.token);
  if (!access.ok) {
    console.error("New token failed validation — revoking");
    await deleteToken(token, created.id);
    process.exit(1);
  }
  console.log(`  id:     ${created.id}`);
  console.log(`  suffix: …${created.suffix}`);
  console.log(`  access: ${access.username} / ${access.project} ✓`);
  if (flag("--print")) {
    console.log("");
    console.log("ONE-TIME secret (store now):");
    console.log(created.token);
  } else {
    console.log("  (secret not printed — pass --print to show once)");
  }
  if (flag("--install")) {
    upsertEnvVercel(created.token, token);
    writeCliAuth(created.token);
    console.log(`  installed → ${ENV_FILE}`);
  }
}

async function cmdInstall() {
  const newTok = requireTokenValue(
    "VERCEL_TOKEN",
    opt("--token") || process.env.VERCEL_TOKEN_NEW?.trim() || "",
    { command: "vercel:token:install" },
  );
  const access = await validateAccess(newTok);
  if (!access.ok) {
    console.error(`Token rejected: ${access.reason}`);
    process.exit(EXIT_INVALID);
  }
  const old = resolveCurrentToken();
  upsertEnvVercel(newTok, old);
  writeCliAuth(newTok);
  console.log(`Installed ${mask(newTok)} for ${access.username}`);
  console.log(`  ${ENV_FILE}`);
  const gh = tryGhSecretSet(newTok);
  if (gh.ok) console.log(`  GitHub secret VERCEL_TOKEN updated (${GH_REPO})`);
  else if (gh.skipped) console.log("  GitHub secret: skipped");
  else console.log(`  GitHub secret: not updated (${gh.stderr || "no access"})`);
}

async function cmdRotate() {
  const oldToken = requireTokenValue("VERCEL_TOKEN", resolveCurrentToken(), {
    command: "vercel:token:rotate",
  });
  const name = defaultName();
  console.log("Vercel token rotation");
  console.log(`  Project: ${PROJECT_NAME} · team ${TEAM_SLUG}`);
  console.log(`  Current: ${mask(oldToken)}`);
  console.log(`  New name: ${name}`);
  console.log("");

  const before = await listTokens(oldToken);
  const oldMeta = matchTokenBySuffix(before, oldToken);
  if (oldMeta) {
    console.log(`  Matched old: ${oldMeta.name} (…${oldMeta.suffix})`);
  }

  console.log("  Creating replacement token …");
  const created = await createToken(oldToken, name);
  const access = await validateAccess(created.token);
  if (!access.ok) {
    console.error(`  New token invalid (${access.reason}) — revoking`);
    await deleteToken(oldToken, created.id);
    process.exit(1);
  }
  console.log(`  New token: ${mask(created.token)} · access ${access.username} ✓`);

  upsertEnvVercel(created.token, oldToken);
  const authPath = writeCliAuth(created.token);
  console.log(`  Wrote ${ENV_FILE}`);
  console.log(`  Wrote ${authPath}`);

  const gh = tryGhSecretSet(created.token);
  if (gh.ok) {
    console.log(`  GitHub secret VERCEL_TOKEN → ${GH_REPO}`);
  } else if (gh.skipped) {
    console.log("  GitHub secret: skipped (--no-gh)");
  } else {
    console.log(
      `  GitHub secret: skipped (${gh.stderr || "needs secrets:write"})`,
    );
  }

  // Revoke old after new is installed (use NEW token to delete old if old already dead)
  if (!flag("--keep-old") && oldMeta?.id) {
    console.log(`  Revoking old token ${oldMeta.id.slice(0, 10)}…`);
    let del = await deleteToken(created.token, oldMeta.id);
    if (!del.ok) {
      del = await deleteToken(oldToken, oldMeta.id);
    }
    if (del.ok) {
      console.log("  Old token revoked ✓");
    } else {
      console.warn(
        `  Could not revoke old token (HTTP ${del.status}). Revoke manually in dashboard.`,
      );
    }
  } else if (flag("--keep-old")) {
    console.log("  Keeping old token (--keep-old)");
  } else {
    console.log(
      "  Old token id unknown — revoke unused tokens at https://vercel.com/account/tokens",
    );
  }

  // Re-sync env with new token so Printify etc. stay in sync if needed
  if (flag("--env-sync")) {
    console.log("  Running vercel:env:sync with new token …");
    const sync = spawnSync("npm", ["run", "vercel:env:sync"], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, VERCEL_TOKEN: created.token },
    });
    console.log(sync.status === 0 ? "  env sync OK" : `  env sync exit ${sync.status}`);
  }

  console.log("");
  console.log("Rotation complete.");
  console.log("  export VERCEL_TOKEN from .env.vercel in new shells");
  console.log("  npm run vercel:token:status");
  console.log("  npm run vercel:env:sync   # if project envs need re-push");
}

async function cmdRevoke() {
  const token = requireTokenValue("VERCEL_TOKEN", resolveCurrentToken(), {
    command: "vercel:token:revoke",
  });
  const id = opt("--id");
  if (!id) {
    console.error("Usage: revoke --id <tokenId>");
    process.exit(1);
  }
  const r = await deleteToken(token, id);
  if (!r.ok) {
    console.error(`Revoke failed HTTP ${r.status}: ${r.text.slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`Revoked ${id}`);
}

async function cmdHelp() {
  console.log(`Vercel token rotation (LVL Factory)

Commands:
  status              Validate current token + match registry entry
  list                List account tokens (id prefix, name, suffix)
  rotate              Create new → install → revoke old (default safe path)
  create              Create only (add --print to show secret once, --install to write)
  install --token …   Install an existing token into .env.vercel + CLI
  revoke --id …       Delete a token by id

Flags:
  --name <label>      Name for new token (default lvl-factory-YYYYMMDD)
  --keep-old          Do not revoke previous token after rotate
  --no-gh             Skip GitHub secret update
  --env-sync          After rotate, run npm run vercel:env:sync
  --token <vcp_…>     Explicit current/new token
  --print             (create) print secret once to stdout

Examples:
  npm run vercel:token:status
  npm run vercel:token:rotate
  npm run vercel:token:rotate -- --keep-old --no-gh
  npm run vercel:token:list
`);
}

const handlers = {
  status: cmdStatus,
  list: cmdList,
  rotate: cmdRotate,
  create: cmdCreate,
  install: cmdInstall,
  revoke: cmdRevoke,
  help: cmdHelp,
  "-h": cmdHelp,
  "--help": cmdHelp,
};

const run = handlers[cmd] || cmdHelp;
await run();
