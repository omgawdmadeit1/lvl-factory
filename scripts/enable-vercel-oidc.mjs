#!/usr/bin/env node
/**
 * Enable Vercel OIDC federation on project lvl-factory (team issuer mode).
 *
 *   VERCEL_TOKEN=… npm run vercel:oidc:enable
 *   npm run vercel:oidc:status
 *
 * Dashboard equivalent:
 *   https://vercel.com/tesla-trek/lvl-factory/settings/security
 *   → Secure backend access with OIDC federation → On (Team)
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  requireTokenValue,
  handleAuthHttpError,
} from "./lib/token-errors.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const ORG = process.env.VERCEL_ORG_ID || "team_EbvXskCGZVZiHauixSNsUAKv";
const PROJECT =
  process.env.VERCEL_PROJECT_ID || "prj_0m75OJchmM0HOizAy7hTqdKghyPR";
const TEAM_SLUG = "tesla-trek";
const PROJECT_NAME = "lvl-factory";
const SECURITY_URL = `https://vercel.com/${TEAM_SLUG}/${PROJECT_NAME}/settings/security`;

const cmd = (process.argv[2] || "status").toLowerCase();

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

function resolveToken() {
  const args = process.argv.slice(2);
  const idx = args.findIndex((a) => a === "--token" || a === "-t");
  if (idx >= 0 && args[idx + 1]) return args[idx + 1].trim();
  const authPath = join(homedir(), ".local/share/com.vercel.cli/auth.json");
  let fileTok = "";
  if (existsSync(authPath)) {
    try {
      fileTok = JSON.parse(readFileSync(authPath, "utf8")).token || "";
    } catch {
      /* ignore */
    }
  }
  return (
    process.env.VERCEL_TOKEN?.trim() ||
    loadDotEnv(join(ROOT, ".env.vercel")).VERCEL_TOKEN?.trim() ||
    loadDotEnv(join(ROOT, ".env")).VERCEL_TOKEN?.trim() ||
    fileTok ||
    ""
  );
}

async function api(method, path, token, body) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "lvl-factory-oidc-enable",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function getProject(token) {
  const { ok, status, json, text } = await api(
    "GET",
    `/v9/projects/${PROJECT}?teamId=${ORG}`,
    token,
  );
  if (!ok) {
    handleAuthHttpError("VERCEL_TOKEN", status, text, "vercel:oidc:status");
    console.error(`GET project failed HTTP ${status}`, text.slice(0, 300));
    process.exit(1);
  }
  return json;
}

function printOidc(project) {
  const cfg = project.oidcTokenConfig || project.oidcTokenConfigs || null;
  console.log(`Project: ${project.name} (${project.id})`);
  console.log(`Team:    ${TEAM_SLUG} (${ORG})`);
  console.log(`Dashboard: ${SECURITY_URL}`);
  console.log("");
  if (!cfg) {
    console.log("OIDC federation: not present in API payload (may be off or plan-gated)");
    console.log("  Enable via dashboard or: npm run vercel:oidc:enable");
    return { enabled: false, issuerMode: null };
  }
  const enabled = Boolean(cfg.enabled);
  const mode = cfg.issuerMode || "team";
  console.log(`OIDC federation: ${enabled ? "ENABLED" : "DISABLED"}`);
  console.log(`Issuer mode:     ${mode}`);
  if (enabled && mode === "team") {
    console.log(`Issuer URL:      https://oidc.vercel.com/${TEAM_SLUG}`);
    console.log(`Audience:        https://vercel.com/${TEAM_SLUG}`);
    console.log(
      `Production sub:  owner:${TEAM_SLUG}:project:${PROJECT_NAME}:environment:production`,
    );
  }
  return { enabled, issuerMode: mode };
}

async function cmdStatus() {
  const token = requireTokenValue("VERCEL_TOKEN", resolveToken(), {
    command: "vercel:oidc:status",
  });
  const project = await getProject(token);
  const { enabled } = printOidc(project);
  process.exitCode = enabled ? 0 : 2;
}

async function cmdEnable() {
  const token = requireTokenValue("VERCEL_TOKEN", resolveToken(), {
    command: "vercel:oidc:enable",
  });

  console.log("Enabling OIDC federation (team issuer)…");
  const body = {
    oidcTokenConfig: {
      enabled: true,
      issuerMode: "team",
    },
  };

  const { ok, status, json, text } = await api(
    "PATCH",
    `/v9/projects/${PROJECT}?teamId=${ORG}`,
    token,
    body,
  );

  if (!ok) {
    handleAuthHttpError("VERCEL_TOKEN", status, text, "vercel:oidc:enable");
    console.error(`PATCH failed HTTP ${status}`);
    console.error(text.slice(0, 500));
    console.error("");
    console.error("Fallback: enable manually at");
    console.error(`  ${SECURITY_URL}`);
    console.error(
      '  → "Secure backend access with OIDC federation" → On → Team issuer',
    );
    process.exit(1);
  }

  console.log("API accepted PATCH.");
  printOidc(json);
  console.log("");
  console.log("Next:");
  console.log(
    "  1. Apply IAM stack: see infra/aws/lvl-factory-oidc.yaml (or npm run aws:oidc:print)",
  );
  console.log(
    "  2. Put RoleArn + region + bucket in .env.vercel → npm run vercel:env:sync",
  );
  console.log("  3. Redeploy production so OIDC tokens are issued at runtime");
}

async function cmdDisable() {
  const token = requireTokenValue("VERCEL_TOKEN", resolveToken(), {
    command: "vercel:oidc:disable",
  });
  const { ok, status, text } = await api(
    "PATCH",
    `/v9/projects/${PROJECT}?teamId=${ORG}`,
    token,
    { oidcTokenConfig: { enabled: false, issuerMode: "team" } },
  );
  if (!ok) {
    handleAuthHttpError("VERCEL_TOKEN", status, text, "vercel:oidc:disable");
    console.error(`Disable failed HTTP ${status}`, text.slice(0, 300));
    process.exit(1);
  }
  console.log("OIDC federation disabled.");
}

const map = {
  status: cmdStatus,
  enable: cmdEnable,
  on: cmdEnable,
  disable: cmdDisable,
  off: cmdDisable,
  help: async () => {
    console.log(`Usage: node scripts/enable-vercel-oidc.mjs <status|enable|disable>
  status   Read oidcTokenConfig from project API
  enable   Turn on OIDC federation (issuerMode: team)
  disable  Turn off`);
  },
};

await (map[cmd] || map.help)();
