/**
 * Server-only Printify REST helpers (token never exposed to browser).
 */
import { PRINTIFY_WEBHOOK_TOPICS, type PrintifyWebhookTopic } from "./webhook-topics";

const API = "https://api.printify.com/v1";
const UA = "LVL-Factory-Merch-Agent/1.1";

function env(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[key]?.trim();
  return v || undefined;
}

export function getPrintifyToken(): string | undefined {
  return env("PRINTIFY_API_TOKEN");
}

export function getPrintifyShopId(): string | undefined {
  return env("PRINTIFY_SHOP_ID");
}

export function getWebhookSecret(): string | undefined {
  return env("PRINTIFY_WEBHOOK_SECRET");
}

/** Public URL Printify should POST to */
export function getWebhookPublicUrl(): string {
  const override = env("PRINTIFY_WEBHOOK_URL");
  if (override) return override.replace(/\/$/, "");
  const base =
    env("BETTER_AUTH_URL") ||
    env("VITE_APP_URL") ||
    "https://factory.lvlltd.com";
  return `${base.replace(/\/$/, "")}/api/printify/webhooks`;
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json;charset=utf-8",
    "User-Agent": UA,
  };
}

async function pfy<T>(
  path: string,
  init: RequestInit & { token: string },
): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: { ...headers(token), ...(rest.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Printify ${res.status} ${path}: ${body.slice(0, 400)}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export interface PrintifyWebhookRemote {
  id: string;
  topic: string;
  url: string;
  shop_id?: string | number;
}

export async function listRemoteWebhooks(
  shopId: string,
  token: string,
): Promise<PrintifyWebhookRemote[]> {
  const data = await pfy<PrintifyWebhookRemote[] | { data?: PrintifyWebhookRemote[] }>(
    `/shops/${shopId}/webhooks.json`,
    { method: "GET", token },
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function createRemoteWebhook(
  shopId: string,
  token: string,
  body: { topic: PrintifyWebhookTopic | string; url: string; secret?: string },
): Promise<PrintifyWebhookRemote> {
  return pfy(`/shops/${shopId}/webhooks.json`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function deleteRemoteWebhook(
  shopId: string,
  token: string,
  webhookId: string,
): Promise<void> {
  await pfy(`/shops/${shopId}/webhooks/${webhookId}.json`, {
    method: "DELETE",
    token,
  });
}

export async function updateRemoteWebhook(
  shopId: string,
  token: string,
  webhookId: string,
  body: { topic?: string; url?: string; secret?: string },
): Promise<PrintifyWebhookRemote> {
  return pfy(`/shops/${shopId}/webhooks/${webhookId}.json`, {
    method: "PUT",
    token,
    body: JSON.stringify(body),
  });
}

export async function simulateRemoteWebhook(
  shopId: string,
  token: string,
  webhookId: string,
  payload: Record<string, unknown> = { source: "lvl-factory-simulate" },
): Promise<unknown> {
  return pfy(`/shops/${shopId}/webhooks/${webhookId}/simulate`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

/** Install one webhook URL for every Printify topic (idempotent-ish). */
export async function installAllTopicWebhooks(opts: {
  shopId: string;
  token: string;
  url: string;
  secret?: string;
}): Promise<{ created: PrintifyWebhookRemote[]; skipped: string[]; errors: string[] }> {
  const existing = await listRemoteWebhooks(opts.shopId, opts.token);
  const created: PrintifyWebhookRemote[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const topic of PRINTIFY_WEBHOOK_TOPICS) {
    const already = existing.find(
      (w) => w.topic === topic && w.url === opts.url,
    );
    if (already) {
      skipped.push(topic);
      continue;
    }
    try {
      const wh = await createRemoteWebhook(opts.shopId, opts.token, {
        topic,
        url: opts.url,
        ...(opts.secret ? { secret: opts.secret } : {}),
      });
      created.push(wh);
    } catch (e) {
      errors.push(`${topic}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { created, skipped, errors };
}

export function printifyCredentialsStatus() {
  return {
    hasToken: Boolean(getPrintifyToken()),
    hasShopId: Boolean(getPrintifyShopId()),
    hasWebhookSecret: Boolean(getWebhookSecret()),
    webhookUrl: getWebhookPublicUrl(),
    topics: [...PRINTIFY_WEBHOOK_TOPICS],
  };
}
