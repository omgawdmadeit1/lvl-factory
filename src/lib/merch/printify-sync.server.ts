/**
 * Printify webhook + API sync (server-only).
 * Keeps local mirrors of products, orders, and remote webhook subscriptions.
 */
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import {
  getPrintifyShopId,
  getPrintifyToken,
  getWebhookPublicUrl,
  getWebhookSecret,
  listRemoteWebhooks,
  type PrintifyWebhookRemote,
} from "./printify-api.server";
import { PRINTIFY_STORE, productStoreUrl } from "./printify";
import type { PrintifyWebhookPayload } from "./webhook-topics";
import { upsertSubscriptionMirror } from "./webhooks.server";

const API = "https://api.printify.com/v1";
const UA = "LVL-Factory-Merch-Agent/1.3-sync";

export type SyncKind =
  | "webhook_order"
  | "webhook_product"
  | "webhook_shop"
  | "pull_products"
  | "pull_subscriptions"
  | "full";

export type SyncSummary = {
  kind: SyncKind;
  ok: boolean;
  productsUpserted: number;
  productsDeleted: number;
  ordersUpserted: number;
  subscriptionsSynced: number;
  skipped: number;
  errors: string[];
  notes: string[];
};

async function ensureSyncSchema(): Promise<void> {
  const sql = await getSql();
  await sql.query(`
    create table if not exists printify_products_mirror (
      id text primary key,
      shop_id text,
      title text,
      status text,
      visible boolean not null default true,
      slug text,
      price_cents int,
      external jsonb not null default '{}'::jsonb,
      last_topic text,
      payload jsonb not null,
      deleted_at timestamptz,
      updated_at timestamptz not null default now()
    )`);
  await sql.query(`
    create table if not exists printify_sync_runs (
      id text primary key,
      kind text not null,
      ok boolean not null default true,
      summary jsonb not null default '{}'::jsonb,
      notes text,
      started_at timestamptz not null default now(),
      finished_at timestamptz
    )`);
  await sql.query(
    `alter table printify_orders_mirror add column if not exists total_cents int`,
  );
  await sql.query(
    `alter table printify_orders_mirror add column if not exists line_count int`,
  );
  await sql.query(
    `alter table printify_orders_mirror add column if not exists external_id text`,
  );
}

function emptySummary(kind: SyncKind): SyncSummary {
  return {
    kind,
    ok: true,
    productsUpserted: 0,
    productsDeleted: 0,
    ordersUpserted: 0,
    subscriptionsSynced: 0,
    skipped: 0,
    errors: [],
    notes: [],
  };
}

async function recordSyncRun(summary: SyncSummary): Promise<string> {
  await ensureSyncSchema();
  const sql = await getSql();
  const id = `sync_${randomUUID()}`;
  await sql.query(
    `insert into printify_sync_runs (id, kind, ok, summary, notes, started_at, finished_at)
     values ($1,$2,$3,$4::jsonb,$5,now(),now())`,
    [
      id,
      summary.kind,
      summary.ok,
      JSON.stringify(summary),
      summary.notes.join("; ").slice(0, 800) || null,
    ],
  );
  return id;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function extractResourceData(
  payload: PrintifyWebhookPayload,
): Record<string, unknown> {
  return asRecord(payload.resource?.data) ?? {};
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "product";
}

function firstVariantPriceCents(product: Record<string, unknown>): number | null {
  const variants = product.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  for (const v of variants) {
    const rec = asRecord(v);
    if (!rec) continue;
    const price = rec.price;
    if (typeof price === "number" && Number.isFinite(price)) return Math.round(price);
    if (typeof price === "string" && price.trim()) {
      const n = Number(price);
      if (Number.isFinite(n)) return Math.round(n);
    }
  }
  return null;
}

function productTitle(product: Record<string, unknown>, fallbackId: string): string {
  const t = product.title ?? product.name;
  return typeof t === "string" && t.trim() ? t.trim() : `Product ${fallbackId}`;
}

function productVisible(product: Record<string, unknown>): boolean {
  if (typeof product.visible === "boolean") return product.visible;
  if (typeof product.is_locked === "boolean" && product.is_locked) return false;
  return true;
}

function productStatus(product: Record<string, unknown>, topic?: string): string {
  if (typeof product.status === "string") return product.status;
  if (topic?.includes("deleted")) return "deleted";
  if (topic?.includes("publish")) return "publishing";
  return productVisible(product) ? "active" : "hidden";
}

/** Upsert a product snapshot into the mirror. */
export async function upsertProductMirror(opts: {
  id: string;
  shopId: string | null;
  product: Record<string, unknown>;
  topic?: string | null;
  rawPayload?: unknown;
}): Promise<void> {
  await ensureSyncSchema();
  const sql = await getSql();
  const title = productTitle(opts.product, opts.id);
  const slug =
    (typeof opts.product.slug === "string" && opts.product.slug) ||
    slugify(title);
  const priceCents = firstVariantPriceCents(opts.product);
  const status = productStatus(opts.product, opts.topic ?? undefined);
  const visible = productVisible(opts.product) && status !== "deleted";
  const external = {
    printifyUrl: productStoreUrl(opts.id, slug),
    store: PRINTIFY_STORE.slug,
  };

  await sql.query(
    `insert into printify_products_mirror
      (id, shop_id, title, status, visible, slug, price_cents, external, last_topic, payload, deleted_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,null,now())
     on conflict (id) do update set
       shop_id = excluded.shop_id,
       title = excluded.title,
       status = excluded.status,
       visible = excluded.visible,
       slug = excluded.slug,
       price_cents = excluded.price_cents,
       external = excluded.external,
       last_topic = excluded.last_topic,
       payload = excluded.payload,
       deleted_at = null,
       updated_at = now()`,
    [
      opts.id,
      opts.shopId,
      title,
      status,
      visible,
      slug,
      priceCents,
      JSON.stringify(external),
      opts.topic ?? null,
      JSON.stringify(opts.rawPayload ?? opts.product),
    ],
  );
}

export async function softDeleteProductMirror(
  id: string,
  topic?: string | null,
): Promise<void> {
  await ensureSyncSchema();
  const sql = await getSql();
  await sql.query(
    `update printify_products_mirror
     set visible = false,
         status = 'deleted',
         last_topic = coalesce($2, last_topic),
         deleted_at = now(),
         updated_at = now()
     where id = $1`,
    [id, topic ?? "product:deleted"],
  );
}

function orderTotals(data: Record<string, unknown>): {
  totalCents: number | null;
  lineCount: number | null;
  externalId: string | null;
  status: string | null;
} {
  const totalRaw =
    data.total_price ?? data.total_price_including_tax ?? data.total;
  let totalCents: number | null = null;
  if (typeof totalRaw === "number") totalCents = Math.round(totalRaw);
  else if (typeof totalRaw === "string") {
    const n = Number(totalRaw);
    if (Number.isFinite(n)) totalCents = Math.round(n);
  }

  const lineItems = data.line_items;
  const lineCount = Array.isArray(lineItems) ? lineItems.length : null;
  const externalId =
    data.external_id != null
      ? String(data.external_id)
      : data.metadata && typeof data.metadata === "object"
        ? String((data.metadata as { order_type?: string }).order_type ?? "") ||
          null
        : null;
  const status =
    typeof data.status === "string"
      ? data.status
      : typeof data.fulfillment_status === "string"
        ? data.fulfillment_status
        : null;

  return { totalCents, lineCount, externalId, status };
}

export async function upsertOrderMirrorFromWebhook(
  payload: PrintifyWebhookPayload,
  topic: string,
  shopId: string | null,
): Promise<{ orderId: string | null; notes: string }> {
  await ensureSyncSchema();
  const sql = await getSql();
  const resourceId =
    payload.resource?.id != null ? String(payload.resource.id) : null;
  if (!resourceId) {
    return { orderId: null, notes: `Order event ${topic} missing resource id` };
  }

  const data = extractResourceData(payload);
  const { totalCents, lineCount, externalId, status } = orderTotals(data);
  const statusOut = status || topic.replace(/^order:/, "");

  await sql.query(
    `insert into printify_orders_mirror
      (id, shop_id, status, last_topic, payload, total_cents, line_count, external_id, updated_at)
     values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,now())
     on conflict (id) do update set
       shop_id = excluded.shop_id,
       status = excluded.status,
       last_topic = excluded.last_topic,
       payload = excluded.payload,
       total_cents = coalesce(excluded.total_cents, printify_orders_mirror.total_cents),
       line_count = coalesce(excluded.line_count, printify_orders_mirror.line_count),
       external_id = coalesce(excluded.external_id, printify_orders_mirror.external_id),
       updated_at = now()`,
    [
      resourceId,
      shopId,
      statusOut,
      topic,
      JSON.stringify(payload),
      totalCents,
      lineCount,
      externalId,
    ],
  );

  return {
    orderId: resourceId,
    notes: `Order ${resourceId} synced (${topic}${lineCount != null ? `, ${lineCount} lines` : ""})`,
  };
}

async function fetchPrintifyJson(
  path: string,
  token: string,
): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": UA,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Printify ${res.status} ${path}: ${body.slice(0, 300)}`);
  }
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

export async function fetchRemoteProduct(
  shopId: string,
  productId: string,
  token: string,
): Promise<Record<string, unknown> | null> {
  try {
    const data = await fetchPrintifyJson(
      `/shops/${shopId}/products/${productId}.json`,
      token,
    );
    return asRecord(data);
  } catch {
    return null;
  }
}

export async function listRemoteProducts(
  shopId: string,
  token: string,
  page = 1,
  limit = 50,
): Promise<{ items: Record<string, unknown>[]; lastPage: boolean }> {
  const data = await fetchPrintifyJson(
    `/shops/${shopId}/products.json?page=${page}&limit=${limit}`,
    token,
  );
  const rec = asRecord(data);
  let items: Record<string, unknown>[] = [];
  if (Array.isArray(data)) {
    items = data.map(asRecord).filter(Boolean) as Record<string, unknown>[];
  } else if (rec && Array.isArray(rec.data)) {
    items = rec.data.map(asRecord).filter(Boolean) as Record<string, unknown>[];
  }
  const current =
    typeof rec?.current_page === "number" ? rec.current_page : page;
  const last =
    typeof rec?.last_page === "number" ? rec.last_page : current;
  return { items, lastPage: current >= last || items.length < limit };
}

/**
 * Apply product/order side effects for an inbound webhook payload.
 * Called from processWebhookEvent.
 */
export async function applyWebhookSync(
  payload: PrintifyWebhookPayload,
  topic: string,
  shopId: string | null,
): Promise<string> {
  await ensureSyncSchema();
  const summary = emptySummary(
    topic.startsWith("order:")
      ? "webhook_order"
      : topic.startsWith("product:")
        ? "webhook_product"
        : "webhook_shop",
  );

  if (topic.startsWith("order:")) {
    const out = await upsertOrderMirrorFromWebhook(payload, topic, shopId);
    if (out.orderId) summary.ordersUpserted = 1;
    summary.notes.push(out.notes);
    await recordSyncRun(summary);
    return out.notes;
  }

  if (topic.startsWith("product:")) {
    const resourceId =
      payload.resource?.id != null ? String(payload.resource.id) : null;
    if (!resourceId) {
      summary.skipped = 1;
      summary.notes.push(`Product event ${topic} missing id`);
      await recordSyncRun(summary);
      return summary.notes[0]!;
    }

    if (topic === "product:deleted") {
      await softDeleteProductMirror(resourceId, topic);
      summary.productsDeleted = 1;
      summary.notes.push(`Product ${resourceId} soft-deleted`);
      await recordSyncRun(summary);
      return summary.notes[0]!;
    }

    const data = extractResourceData(payload);
    const token = getPrintifyToken();
    const sid = shopId || getPrintifyShopId() || null;
    let product = data;
    // Enrich from API when token available and payload is thin
    if (token && sid && (!data.title || !data.variants)) {
      const full = await fetchRemoteProduct(sid, resourceId, token);
      if (full) {
        product = { ...full, ...data };
        summary.notes.push(`Enriched product ${resourceId} from Printify API`);
      }
    }

    await upsertProductMirror({
      id: resourceId,
      shopId: sid,
      product: Object.keys(product).length ? product : { id: resourceId },
      topic,
      rawPayload: payload,
    });
    summary.productsUpserted = 1;
    summary.notes.push(`Product ${resourceId} synced (${topic})`);
    await recordSyncRun(summary);
    return summary.notes[summary.notes.length - 1]!;
  }

  if (topic === "shop:disconnected") {
    summary.notes.push("ALERT: Printify shop disconnected — halt new publishes");
    summary.ok = true;
    await recordSyncRun(summary);
    return summary.notes[0]!;
  }

  summary.skipped = 1;
  summary.notes.push(`No sync handler for ${topic}`);
  return summary.notes[0]!;
}

/** Pull all remote webhook subscriptions into local mirror. */
export async function syncRemoteSubscriptions(): Promise<SyncSummary> {
  const summary = emptySummary("pull_subscriptions");
  const token = getPrintifyToken();
  const shopId = getPrintifyShopId();
  if (!token || !shopId) {
    summary.ok = false;
    summary.errors.push("PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID required");
    await recordSyncRun(summary);
    return summary;
  }

  try {
    const remote = await listRemoteWebhooks(shopId, token);
    const secretSet = Boolean(getWebhookSecret());
    for (const wh of remote) {
      await upsertSubscriptionMirror({
        id: wh.id,
        shop_id: String(wh.shop_id ?? shopId),
        topic: wh.topic,
        url: wh.url,
        secret_set: secretSet,
        raw: wh,
      });
      summary.subscriptionsSynced += 1;
    }
    summary.notes.push(
      `Synced ${remote.length} remote webhook(s) → local mirror`,
    );
    const expectedUrl = getWebhookPublicUrl();
    const pointing = remote.filter((w) => w.url === expectedUrl).length;
    summary.notes.push(
      `${pointing}/${remote.length} point at ${expectedUrl}`,
    );
  } catch (e) {
    summary.ok = false;
    summary.errors.push(e instanceof Error ? e.message : String(e));
  }

  await recordSyncRun(summary);
  return summary;
}

/** Full product catalog pull from Printify API → product mirror. */
export async function syncProductsFromApi(maxPages = 20): Promise<SyncSummary> {
  const summary = emptySummary("pull_products");
  const token = getPrintifyToken();
  const shopId = getPrintifyShopId();
  if (!token || !shopId) {
    summary.ok = false;
    summary.errors.push("PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID required");
    await recordSyncRun(summary);
    return summary;
  }

  try {
    let page = 1;
    while (page <= maxPages) {
      const { items, lastPage } = await listRemoteProducts(
        shopId,
        token,
        page,
        50,
      );
      for (const product of items) {
        const id =
          product.id != null
            ? String(product.id)
            : product._id != null
              ? String(product._id)
              : null;
        if (!id) {
          summary.skipped += 1;
          continue;
        }
        await upsertProductMirror({
          id,
          shopId,
          product,
          topic: "pull_products",
          rawPayload: product,
        });
        summary.productsUpserted += 1;
      }
      if (lastPage || items.length === 0) break;
      page += 1;
    }
    summary.notes.push(
      `Pulled ${summary.productsUpserted} product(s) from Printify shop ${shopId}`,
    );
  } catch (e) {
    summary.ok = false;
    summary.errors.push(e instanceof Error ? e.message : String(e));
  }

  await recordSyncRun(summary);
  return summary;
}

/** Subscriptions + products full sync. */
export async function runFullPrintifySync(): Promise<{
  subscriptions: SyncSummary;
  products: SyncSummary;
  combined: SyncSummary;
}> {
  const subscriptions = await syncRemoteSubscriptions();
  const products = await syncProductsFromApi();
  const combined = emptySummary("full");
  combined.ok = subscriptions.ok && products.ok;
  combined.productsUpserted = products.productsUpserted;
  combined.subscriptionsSynced = subscriptions.subscriptionsSynced;
  combined.errors = [...subscriptions.errors, ...products.errors];
  combined.notes = [...subscriptions.notes, ...products.notes];
  combined.skipped = subscriptions.skipped + products.skipped;
  await recordSyncRun(combined);
  return { subscriptions, products, combined };
}

export async function listMirroredProducts(limit = 50) {
  await ensureSyncSchema();
  const sql = await getSql();
  return sql.query(
    `select id, shop_id, title, status, visible, slug, price_cents, external,
            last_topic, deleted_at, updated_at
     from printify_products_mirror
     where deleted_at is null
     order by updated_at desc
     limit $1`,
    [limit],
  );
}

export async function listSyncRuns(limit = 20) {
  await ensureSyncSchema();
  const sql = await getSql();
  return sql.query(
    `select id, kind, ok, summary, notes, started_at, finished_at
     from printify_sync_runs
     order by started_at desc
     limit $1`,
    [limit],
  );
}

export async function getSyncDashboard() {
  await ensureSyncSchema();
  const sql = await getSql();
  const [products, orders, subs, runs] = await Promise.all([
    sql.query<{ c: string }>(
      `select count(*)::text as c from printify_products_mirror where deleted_at is null`,
    ),
    sql.query<{ c: string }>(
      `select count(*)::text as c from printify_orders_mirror`,
    ),
    sql.query<{ c: string }>(
      `select count(*)::text as c from printify_webhook_subscriptions where status = 'active'`,
    ),
    listSyncRuns(8),
  ]);
  return {
    products: Number(products[0]?.c || 0),
    orders: Number(orders[0]?.c || 0),
    subscriptions: Number(subs[0]?.c || 0),
    recent_runs: runs,
    webhook_url: getWebhookPublicUrl(),
    credentials: {
      token: Boolean(getPrintifyToken()),
      shopId: getPrintifyShopId() ?? null,
    },
  };
}

/** Public catalog slice from product mirror (for /api/store/catalog). */
export async function listSyncedCatalogItems(limit = 100) {
  await ensureSyncSchema();
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    title: string | null;
    status: string | null;
    slug: string | null;
    price_cents: number | null;
    external: unknown;
    updated_at: string | Date;
  }>(
    `select id, title, status, slug, price_cents, external, updated_at
     from printify_products_mirror
     where deleted_at is null and visible = true
     order by updated_at desc
     limit $1`,
    [limit],
  );

  return rows.map((r) => {
    const ext =
      typeof r.external === "string"
        ? (JSON.parse(r.external) as Record<string, unknown>)
        : (asRecord(r.external) ?? {});
    const slug = r.slug || slugify(r.title || r.id);
    const priceUsd =
      r.price_cents != null && Number.isFinite(r.price_cents)
        ? r.price_cents / 100
        : null;
    return {
      id: `pfy-sync-${r.id}`,
      printify_product_id: r.id,
      sku: `PFY-${r.id}`,
      slug,
      title: r.title || `Product ${r.id}`,
      price_usd: priceUsd,
      status: r.status || "active",
      printify_url:
        typeof ext.printifyUrl === "string"
          ? ext.printifyUrl
          : productStoreUrl(r.id, slug),
      source: "printify_webhook_sync" as const,
      updated_at:
        r.updated_at instanceof Date
          ? r.updated_at.toISOString()
          : String(r.updated_at),
    };
  });
}

export type { PrintifyWebhookRemote };
