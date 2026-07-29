/**
 * Printify webhook verification + persistence + side effects (server-only).
 */
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import {
  getWebhookSecret,
  getWebhookSecrets,
  getPrintifyShopId,
} from "./printify-api.server";
import type {
  PrintifyWebhookPayload,
  StoredWebhookEvent,
} from "./webhook-topics";
import {
  verifyPrintifySignature,
  shouldAcceptSignedWebhook,
  signPrintifyBody,
  verifyPrintifyRequest,
  getPrintifySignatureFromRequest,
  publicHmacView,
  checkEventFreshness,
  readRawWebhookBody,
  generateWebhookSecret,
  type HmacVerifyResult,
} from "./printify-hmac.server";

export {
  verifyPrintifySignature,
  shouldAcceptSignedWebhook,
  signPrintifyBody,
  verifyPrintifyRequest,
  getPrintifySignatureFromRequest,
  publicHmacView,
  checkEventFreshness,
  readRawWebhookBody,
  generateWebhookSecret,
  getWebhookSecrets,
};
export type { HmacVerifyResult };

async function ensureWebhookSchema(): Promise<void> {
  const sql = await getSql();
  // Defensive: apply tables even if migration glob missed a cold start
  await sql.query(`
    create table if not exists printify_webhook_events (
      id text primary key,
      topic text not null,
      resource_type text,
      resource_id text,
      shop_id text,
      payload jsonb not null,
      signature_valid boolean not null default false,
      processed boolean not null default false,
      process_notes text,
      received_at timestamptz not null default now()
    )`);
  await sql.query(`
    create table if not exists printify_webhook_subscriptions (
      id text primary key,
      shop_id text not null,
      topic text not null,
      url text not null,
      secret_set boolean not null default false,
      status text not null default 'active',
      raw jsonb,
      updated_at timestamptz not null default now()
    )`);
  await sql.query(`
    create table if not exists printify_orders_mirror (
      id text primary key,
      shop_id text,
      status text,
      last_topic text,
      payload jsonb not null,
      updated_at timestamptz not null default now()
    )`);
  await sql.query(`
    create table if not exists printify_webhook_rejects (
      id text primary key,
      code text not null,
      reason text,
      ip text,
      ray text,
      body_sha256 text,
      body_bytes int,
      topic text,
      received_at timestamptz not null default now()
    )`);
}


/** Persist failed HMAC / WAF rejects for operator audit (no secrets, truncated). */
export async function recordRejectedWebhook(opts: {
  code: string;
  reason: string;
  ip?: string | null;
  ray?: string | null;
  rawBody?: string;
  topic?: string | null;
}): Promise<void> {
  try {
    await ensureWebhookSchema();
    const sql = await getSql();
    const { createHash } = await import("node:crypto");
    const bodySha = opts.rawBody
      ? createHash("sha256").update(opts.rawBody, "utf8").digest("hex")
      : null;
    await sql.query(
      `insert into printify_webhook_rejects
        (id, code, reason, ip, ray, body_sha256, body_bytes, topic, received_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,now())`,
      [
        `rej_${randomUUID()}`,
        opts.code,
        opts.reason.slice(0, 400),
        opts.ip ?? null,
        opts.ray ?? null,
        bodySha,
        opts.rawBody ? Buffer.byteLength(opts.rawBody, "utf8") : null,
        opts.topic ?? null,
      ],
    );
  } catch (e) {
    console.warn("[webhook reject audit]", e);
  }
}

export async function listRejectedWebhooks(limit = 30) {
  await ensureWebhookSchema();
  const sql = await getSql();
  return sql.query(
    `select id, code, reason, ip, ray, body_sha256, body_bytes, topic, received_at
     from printify_webhook_rejects
     order by received_at desc
     limit $1`,
    [limit],
  );
}

/** @deprecated use shouldAcceptSignedWebhook from printify-hmac.server */
export function requireSignatureInProduction(
  signatureValid: boolean,
  hasSecret: boolean,
): boolean {
  const check: HmacVerifyResult = signatureValid
    ? { valid: true, code: "ok", reason: "ok", algorithm: "sha256" }
    : {
        valid: false,
        code: hasSecret ? "mismatch" : "no_secret",
        reason: hasSecret ? "invalid" : "no secret",
        algorithm: "sha256",
      };
  return shouldAcceptSignedWebhook(check).accept;
}


function extractShopId(payload: PrintifyWebhookPayload): string | null {
  const data = payload.resource?.data;
  if (data && typeof data.shop_id !== "undefined") {
    return String(data.shop_id);
  }
  return getPrintifyShopId() ?? null;
}

export async function processWebhookEvent(
  payload: PrintifyWebhookPayload,
  opts: { signatureValid: boolean; rawTopic?: string },
): Promise<{ eventId: string; notes: string }> {
  await ensureWebhookSchema();
  const sql = await getSql();
  const topic =
    opts.rawTopic ||
    (typeof payload.type === "string" ? payload.type : "unknown");
  const eventId =
    (typeof payload.id === "string" && payload.id) ||
    `evt_${randomUUID()}`;
  const resourceType =
    typeof payload.resource?.type === "string" ? payload.resource.type : null;
  const resourceId =
    payload.resource?.id != null ? String(payload.resource.id) : null;
  const shopId = extractShopId(payload);

  let notes = `Received ${topic}`;

  // Side effects by topic family
  if (topic.startsWith("order:")) {
    if (resourceId) {
      await sql.query(
        `insert into printify_orders_mirror (id, shop_id, status, last_topic, payload, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, now())
         on conflict (id) do update set
           shop_id = excluded.shop_id,
           status = excluded.status,
           last_topic = excluded.last_topic,
           payload = excluded.payload,
           updated_at = now()`,
        [
          resourceId,
          shopId,
          topic.replace("order:", ""),
          topic,
          JSON.stringify(payload),
        ],
      );
      notes = `Order ${resourceId} mirrored (${topic})`;
    }
  } else if (topic.startsWith("product:")) {
    notes = resourceId
      ? `Product ${resourceId} event ${topic} — refresh merch catalog`
      : `Product event ${topic}`;
  } else if (topic === "shop:disconnected") {
    notes = "ALERT: Printify shop disconnected";
  }

  await sql.query(
    `insert into printify_webhook_events
      (id, topic, resource_type, resource_id, shop_id, payload, signature_valid, processed, process_notes, received_at)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7,true,$8,now())
     on conflict (id) do update set
       process_notes = excluded.process_notes,
       processed = true,
       payload = excluded.payload`,
    [
      eventId,
      topic,
      resourceType,
      resourceId,
      shopId,
      JSON.stringify(payload),
      opts.signatureValid,
      notes,
    ],
  );

  return { eventId, notes };
}

export async function listWebhookEvents(limit = 50): Promise<StoredWebhookEvent[]> {
  await ensureWebhookSchema();
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    topic: string;
    resource_type: string | null;
    resource_id: string | null;
    shop_id: string | null;
    payload: unknown;
    signature_valid: boolean;
    processed: boolean;
    process_notes: string | null;
    received_at: string | Date;
  }>(
    `select id, topic, resource_type, resource_id, shop_id, payload,
            signature_valid, processed, process_notes, received_at
     from printify_webhook_events
     order by received_at desc
     limit $1`,
    [limit],
  );

  return rows.map((r) => ({
    id: r.id,
    topic: r.topic,
    resource_type: r.resource_type,
    resource_id: r.resource_id,
    shop_id: r.shop_id,
    payload:
      typeof r.payload === "string"
        ? (JSON.parse(r.payload) as PrintifyWebhookPayload)
        : (r.payload as PrintifyWebhookPayload),
    signature_valid: Boolean(r.signature_valid),
    processed: Boolean(r.processed),
    process_notes: r.process_notes,
    received_at:
      r.received_at instanceof Date
        ? r.received_at.toISOString()
        : String(r.received_at),
  }));
}

export async function listMirroredOrders(limit = 30) {
  await ensureWebhookSchema();
  const sql = await getSql();
  return sql.query(
    `select id, shop_id, status, last_topic, payload, updated_at
     from printify_orders_mirror
     order by updated_at desc
     limit $1`,
    [limit],
  );
}

export async function upsertSubscriptionMirror(row: {
  id: string;
  shop_id: string;
  topic: string;
  url: string;
  secret_set: boolean;
  raw?: unknown;
}) {
  await ensureWebhookSchema();
  const sql = await getSql();
  await sql.query(
    `insert into printify_webhook_subscriptions
      (id, shop_id, topic, url, secret_set, status, raw, updated_at)
     values ($1,$2,$3,$4,$5,'active',$6::jsonb,now())
     on conflict (id) do update set
       topic = excluded.topic,
       url = excluded.url,
       secret_set = excluded.secret_set,
       status = 'active',
       raw = excluded.raw,
       updated_at = now()`,
    [
      row.id,
      row.shop_id,
      row.topic,
      row.url,
      row.secret_set,
      JSON.stringify(row.raw ?? {}),
    ],
  );
}

export function getWebhookSecretOrUndefined() {
  return getWebhookSecret();
}
