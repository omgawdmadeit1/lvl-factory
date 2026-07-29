#!/usr/bin/env node
/**
 * Vercel CLI authentication for non-interactive agents / CI.
 *
 * Usage:
 *   node scripts/vercel-auth.mjs              # status
 *   node scripts/vercel-auth.mjs status
 *   VERCEL_TOKEN=… node scripts/vercel-auth.mjs login
 *   node scripts/vercel-auth.mjs login --token <token>
 *   node scripts/vercel-auth.mjs logout
 *   node scripts/vercel-auth.mjs whoami
 *   node scripts/vercel-auth.mjs project
 *
 * Token: https://vercel.com/account/tokens  (scope team tesla-trek)
 * Prefer Full Account or Deployments + Projects + Environment Variables.
 *
 * Also accepts token from (first match):
 *   1) --token CLI arg
 *   2) VERCEL_TOKEN env
 *   3) .env.vercel  (gitignored) key VERCEL_TOKEN=
 *   4) .env         key VERCEL_TOKEN=
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  chmodSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import {
  requireTokenValue,
  failMissingToken,
  failInvalidToken,
  validateToken,
  handleAuthHttpError,
  printTokenInventory,
  EXIT_MISSING,
} from "./lib/token-errors.mjs";

const require = createRequire(import.meta.url);

const ORG_ID = process.env.VERCEL_ORG_ID || "team_EbvXskCGZVZiHauixSNsUAKv";
const PROJECT_ID =
  process.env.VERCEL_PROJECT_ID || "prj_0m75OJchmM0HOizAy7hTqdKghyPR";
const PROJECT_NAME = "lvl-factory";
const TEAM_SLUG = "tesla-trek";
const TOKEN_URL = "https://vercel.com/account/tokens";
const ROOT = resolve(import.meta.dirname, "..");

const cmd = (process.argv[2] || "status").toLowerCase();

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
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

function resolveToken() {
  return (
    resolveTokenFromArgs() ||
    process.env.VERCEL_TOKEN?.trim() ||
    loadDotEnv(join(ROOT, ".env.vercel")).VERCEL_TOKEN?.trim() ||
    loadDotEnv(join(ROOT, ".env")).VERCEL_TOKEN?.trim() ||
    ""
  );
}

function getCliConfig() {
  try {
    return require("/usr/lib/node_modules/vercel/node_modules/@vercel/cli-config");
  } catch {
    try {
      return require("@vercel/cli-config");
    } catch {
      return null;
    }
  }
}

function getAuthPaths() {
  const cli = getCliConfig();
  if (cli) {
    const dir = cli.getGlobalPathConfig();
    return {
      dir,
      authPath: cli.getAuthConfigFilePath(dir),
      configPath: cli.getConfigFilePath(dir),
      cli,
    };
  }
  const dir = join(homedir(), ".local/share/com.vercel.cli");
  return {
    dir,
    authPath: join(dir, "auth.json"),
    configPath: join(dir, "config.json"),
    cli: null,
  };
}

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function maskToken(token) {
  if (!token || token.length < 12) return "(none)";
  return `${token.slice(0, 6)}…${token.slice(-4)} (${token.length} chars)`;
}

async function apiGet(path, token) {
  const url = path.startsWith("http")
    ? path
    : `https://api.vercel.com${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "lvl-factory-vercel-auth",
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* plain */
  }
  return { ok: res.ok, status: res.status, json, text };
}

function ensureFileCredStorage(paths) {
  mkdirSync(paths.dir, { recursive: true });
  const existing = readJsonSafe(paths.configPath) || {
    "// Note":
      "This is your Vercel config file. For more information see the global configuration documentation.",
    "// Docs":
      "https://vercel.com/docs/projects/project-configuration/global-configuration#config.json",
  };
  existing.credStorage = "file";
  existing.telemetry = existing.telemetry || { enabled: true };
  writeFileSync(paths.configPath, JSON.stringify(existing, null, 2) + "\n", {
    mode: 0o600,
  });
}

function writeAuthFile(paths, token) {
  mkdirSync(paths.dir, { recursive: true });
  ensureFileCredStorage(paths);

  const body = {
    "// Note": "This is your Vercel credentials file. DO NOT SHARE!",
    "// Docs":
      "https://vercel.com/docs/projects/project-configuration/global-configuration#auth.json",
    token,
  };

  if (paths.cli) {
    paths.cli.writeAuthConfigFile(paths.authPath, body);
  } else {
    writeFileSync(paths.authPath, JSON.stringify(body, null, 2) + "\n", {
      mode: 0o600,
    });
  }
  try {
    chmodSync(paths.authPath, 0o600);
  } catch {
    /* ignore */
  }
}

function clearAuthFile(paths) {
  try {
    if (paths.cli) {
      paths.cli.deleteAuthConfigFile(paths.authPath);
    } else if (existsSync(paths.authPath)) {
      unlinkSync(paths.authPath);
    }
  } catch {
    /* ignore */
  }
}

function readStoredToken(paths) {
  if (paths.cli) {
    try {
      const cfg = paths.cli.tryReadAuthConfig(paths.authPath);
      if (cfg?.token) return cfg.token;
    } catch {
      /* fall through */
    }
  }
  const file = readJsonSafe(paths.authPath);
  return file?.token || "";
}

function runVercel(args, env = {}) {
  return spawnSync("vercel", args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
    cwd: ROOT,
  });
}

function ensureProjectLink() {
  const vercelDir = join(ROOT, ".vercel");
  const projectJson = join(vercelDir, "project.json");
  mkdirSync(vercelDir, { recursive: true });
  const desired = {
    projectId: PROJECT_ID,
    orgId: ORG_ID,
    projectName: PROJECT_NAME,
  };
  const existing = readJsonSafe(projectJson);
  if (
    existing?.projectId === PROJECT_ID &&
    existing?.orgId === ORG_ID
  ) {
    return { path: projectJson, ...desired, wrote: false };
  }
  writeFileSync(projectJson, JSON.stringify(desired, null, 2) + "\n");
  return { path: projectJson, ...desired, wrote: true };
}

function printHeader() {
  console.log("Vercel CLI auth — LVL Factory");
  console.log(`  Project: ${PROJECT_NAME} (${PROJECT_ID})`);
  console.log(`  Team:    ${TEAM_SLUG} (${ORG_ID})`);
  console.log(`  Token:   ${TOKEN_URL}`);
  console.log("");
}

async function cmdStatus() {
  printHeader();
  const paths = getAuthPaths();
  const envToken = process.env.VERCEL_TOKEN?.trim() || "";
  const fileToken = readStoredToken(paths);
  const link = ensureProjectLink();

  console.log("Paths");
  console.log(`  auth.json:   ${paths.authPath}`);
  console.log(`  config.json: ${paths.configPath}`);
  console.log(`  project:     ${link.path}`);
  console.log("");
  console.log("Credentials");
  console.log(`  VERCEL_TOKEN env: ${envToken ? maskToken(envToken) : "(unset)"}`);
  console.log(
    `  auth.json file:  ${fileToken ? maskToken(fileToken) : "(missing)"}`,
  );
  console.log(
    `  .env.vercel:     ${existsSync(join(ROOT, ".env.vercel")) ? "present" : "absent"}`,
  );
  console.log("");

  const token = envToken || fileToken;
  if (!token) {
    console.log("Status: NOT AUTHENTICATED");
    printTokenInventory({
      VERCEL_TOKEN: envToken || fileToken || undefined,
    });
    failMissingToken("VERCEL_TOKEN", {
      detail: "No Vercel credentials in env, .env.vercel, or auth.json",
      command: "vercel:auth status",
      reason: "missing",
    });
  }
  // Validate shape before API calls
  const shape = validateToken("VERCEL_TOKEN", token);
  if (!shape.ok) {
    failMissingToken("VERCEL_TOKEN", {
      detail: shape.detail,
      reason: shape.reason,
      command: "vercel:auth status",
    });
  }

  const user = await apiGet("/v2/user", token);
  if (!user.ok) {
    console.log(`Status: TOKEN REJECTED (HTTP ${user.status})`);
    handleAuthHttpError(
      "VERCEL_TOKEN",
      user.status,
      user.text,
      "vercel:auth status",
    );
    process.exitCode = 1;
    return;
  }

  const u = user.json?.user || user.json;
  console.log("Status: AUTHENTICATED");
  console.log(`  User:  ${u?.username || u?.email || u?.id || "(ok)"}`);
  if (u?.email) console.log(`  Email: ${u.email}`);

  const proj = await apiGet(
    `/v9/projects/${PROJECT_ID}?teamId=${ORG_ID}`,
    token,
  );
  if (proj.ok) {
    console.log(
      `  Project access: ${proj.json?.name || PROJECT_NAME} ✓`,
    );
  } else {
    console.log(
      `  Project access: FAILED (HTTP ${proj.status}) — check team scope on token`,
    );
    process.exitCode = 1;
  }

  const who = runVercel(["whoami"], envToken ? { VERCEL_TOKEN: envToken } : {});
  if (who.status === 0) {
    console.log(`  CLI whoami: ${who.stdout.trim()}`);
  } else {
    console.log(
      `  CLI whoami: ${ (who.stderr || who.stdout || "").trim().slice(0, 160)}`,
    );
  }
}

async function cmdLogin() {
  printHeader();
  const token = requireTokenValue("VERCEL_TOKEN", resolveToken(), {
    command: "vercel:auth:login",
  });

  console.log(`Validating token ${maskToken(token)} …`);
  const user = await apiGet("/v2/user", token);
  if (!user.ok) {
    failInvalidToken("VERCEL_TOKEN", {
      status: user.status,
      body: user.text,
      command: "vercel:auth:login",
    });
  }
  const u = user.json?.user || user.json;
  console.log(`  User: ${u?.username || u?.email || u?.id}`);

  const proj = await apiGet(
    `/v9/projects/${PROJECT_ID}?teamId=${ORG_ID}`,
    token,
  );
  if (!proj.ok) {
    console.error(
      `Token cannot access ${PROJECT_NAME} on team ${TEAM_SLUG} (HTTP ${proj.status}).`,
    );
    console.error("Re-create the token with team scope: tesla-trek");
    process.exit(1);
  }
  console.log(`  Project: ${proj.json?.name} ✓`);

  const paths = getAuthPaths();
  writeAuthFile(paths, token);
  const link = ensureProjectLink();

  console.log("");
  console.log("Wrote CLI credentials");
  console.log(`  ${paths.authPath} (mode 600, credStorage=file)`);
  console.log(
    `  ${link.path}${link.wrote ? " (updated)" : " (already linked)"}`,
  );

  // Prefer env for this process so whoami works even if file store lags
  const who = runVercel(["whoami"], { VERCEL_TOKEN: token });
  if (who.status === 0) {
    console.log(`  vercel whoami → ${who.stdout.trim()}`);
  } else {
    // Retry without env (file-based only)
    const who2 = runVercel(["whoami"]);
    if (who2.status === 0) {
      console.log(`  vercel whoami → ${who2.stdout.trim()}`);
    } else {
      console.warn(
        "  Note: vercel whoami still needs VERCEL_TOKEN in env for this shell.",
      );
      console.warn(
        "  File auth written; open a new shell or: export VERCEL_TOKEN=…",
      );
      console.warn((who.stderr || who.stdout || "").trim().slice(0, 200));
    }
  }

  console.log("");
  console.log("Ready. Useful next steps:");
  console.log("  npm run vercel:whoami");
  console.log("  npm run vercel:env:dry");
  console.log("  vercel --token \"$VERCEL_TOKEN\" deploy --prod --yes");
  console.log(
    "  # GitHub Actions: gh secret set VERCEL_TOKEN --repo omgawdmadeit1/lvl-factory",
  );
}

async function cmdLogout() {
  const paths = getAuthPaths();
  clearAuthFile(paths);
  console.log(`Cleared ${paths.authPath}`);
  if (process.env.VERCEL_TOKEN) {
    console.log(
      "Note: VERCEL_TOKEN is still set in this shell — unset it if needed.",
    );
  }
}

async function cmdWhoami() {
  const token =
    process.env.VERCEL_TOKEN?.trim() ||
    readStoredToken(getAuthPaths()) ||
    resolveToken();
  if (!token) {
    failMissingToken("VERCEL_TOKEN", {
      command: "vercel:whoami",
      detail: "Not authenticated — no token for whoami",
    });
  }
  const whoShape = validateToken("VERCEL_TOKEN", token);
  if (!whoShape.ok) {
    failMissingToken("VERCEL_TOKEN", {
      command: "vercel:whoami",
      detail: whoShape.detail,
      reason: whoShape.reason,
    });
  }
  const user = await apiGet("/v2/user", token);
  if (!user.ok) {
    handleAuthHttpError(
      "VERCEL_TOKEN",
      user.status,
      user.text,
      "vercel:whoami",
    );
    console.error(`Auth failed (HTTP ${user.status})`);
    process.exit(1);
  }
  const u = user.json?.user || user.json;
  console.log(u?.username || u?.email || u?.id || JSON.stringify(u));
  const who = runVercel(["whoami"], { VERCEL_TOKEN: token });
  if (who.status === 0 && who.stdout.trim()) {
    // already printed via API; CLI confirmation
  } else if (who.status !== 0) {
    // API worked; CLI may need file — non-fatal
  }
}

async function cmdProject() {
  const token =
    process.env.VERCEL_TOKEN?.trim() ||
    readStoredToken(getAuthPaths()) ||
    resolveToken();
  ensureProjectLink();
  if (!token) {
    console.log(JSON.stringify(ensureProjectLink(), null, 2));
    console.error("(not authenticated — project link only)");
    process.exit(1);
  }
  const proj = await apiGet(
    `/v9/projects/${PROJECT_ID}?teamId=${ORG_ID}`,
    token,
  );
  if (!proj.ok) {
    console.error(`HTTP ${proj.status}`, proj.text.slice(0, 200));
    process.exit(1);
  }
  const p = proj.json;
  console.log(
    JSON.stringify(
      {
        id: p.id,
        name: p.name,
        framework: p.framework,
        nodeVersion: p.nodeVersion,
        domains: p.targets?.production?.alias || p.alias || [],
        latestReady:
          p.latestDeployments?.[0]?.url ||
          p.targets?.production?.id ||
          null,
      },
      null,
      2,
    ),
  );
}

const handlers = {
  status: cmdStatus,
  login: cmdLogin,
  logout: cmdLogout,
  whoami: cmdWhoami,
  project: cmdProject,
  help: async () => {
    console.log(`Usage: node scripts/vercel-auth.mjs <status|login|logout|whoami|project>
  login   VERCEL_TOKEN=… or --token … or .env.vercel
  status  show auth + project link (default)`);
  },
};

const run = handlers[cmd] || handlers.help;
await run();
