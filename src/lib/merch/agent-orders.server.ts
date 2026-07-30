/**
 * Agent quote + order + pay-verify + Printify fulfill spine.
 */
import { getSql } from "@/lib/db";
import { LVL_PAYMENT, TREASURY_EVM, TREASURY_SOL } from "@/lib/factory/payment";
import { LIVE_PRINTIFY_PRODUCTS } from "@/lib/merch/catalog";
import { CLOUDFLARE_MAP } from "@/lib/merch/printify";
import {
  createPrintifyShopOrder,
  fetchPrintifyProduct,
  pickVariantId,
  printifyOrderCredentials,
  type ShipTo,
} from "@/lib/merch/printify-orders.server";
import { listSyncedCatalogItems } from "@/lib/merch/printify-sync.server";

export const AGENT_FEE_USD = 0.5;
export const SHIPPING_ESTIMATE_US_USD = 4.99;
export const SHIPPING_ESTIMATE_INTL_USD = 12.99;

export type AgentOrderStatus =
  | "quoted"
  | "awaiting_payment"
  | "paid"
  | "fulfilling"
  | "submitted_to_printify"
  | "simulated_fulfillment"
  | "failed"
  | "cancelled";

export type CatalogHit = {
  sku: string;
  title: string;
  price_usd: number;
  printify_product_id: string | null;
  printify_url: string | null;
  slug: string;
  source: string;
};

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function resolveCatalogSku(sku: string): Promise<CatalogHit | null> {
  const key = sku.trim().toUpperCase();
  const live = LIVE_PRINTIFY_PRODUCTS.find(
    (p) =>
      p.sku.toUpperCase() === key ||
      p.id.toUpperCase() === key ||
      p.slug.toLowerCase() === sku.trim().toLowerCase(),
  );
  if (live && live.status === "published") {
    return {
      sku: live.sku,
      title: live.title,
      price_usd: live.priceUsd,
      printify_product_id: live.printifyProductId ?? null,
      printify_url: live.printifyUrl ?? null,
      slug: live.slug,
      source: live.source ?? "printify_live",
    };
  }
  try {
    const synced = await listSyncedCatalogItems(200);
    const hit = synced.find(
      (s) =>
        s.sku.toUpperCase() === key ||
        s.printify_product_id === sku.trim() ||
        s.slug.toUpperCase() === key,
    );
    if (hit && hit.price_usd != null) {
      return {
        sku: hit.sku,
        title: hit.title,
        price_usd: hit.price_usd,
        printify_product_id: hit.printify_product_id,
        printify_url: hit.printify_url,
        slug: hit.slug,
        source: hit.source,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function shippingEstimate(country?: string): number {
  const c = (country || "US").toUpperCase();
  if (c === "US" || c === "USA" || c === "UNITED STATES") {
    return SHIPPING_ESTIMATE_US_USD;
  }
  return SHIPPING_ESTIMATE_INTL_USD;
}

export function buildQuote(opts: {
  product: CatalogHit;
  quantity: number;
  country?: string;
  size?: string;
  origin?: string;
}) {
  const qty = Math.max(1, Math.min(50, Math.floor(opts.quantity || 1)));
  const face = Math.round(opts.product.price_usd * qty * 100) / 100;
  const agent_fee_usd = AGENT_FEE_USD;
  const shipping_estimate_usd = shippingEstimate(opts.country);
  const total_usd = Math.round((face + agent_fee_usd) * 100) / 100;
  const origin = opts.origin ?? String(CLOUDFLARE_MAP.factory);

  return {
    protocol: "lvl-agent-order-v1",
    sku: opts.product.sku,
    title: opts.product.title,
    size: opts.size ?? "M",
    quantity: qty,
    currency: "USD",
    face_usd: face,
    unit_price_usd: opts.product.price_usd,
    agent_fee_usd,
    shipping_estimate_usd,
    shipping_note:
      "Shipping estimate for planning only. Printify calculates final shipping on production order.",
    total_usd,
    total_due_now_usd: total_usd,
    cheaper_than_diy: {
      thesis:
        "3 API calls + face merch + $0.50 agent fee vs spinning up Printify, design tools, and custom compute.",
      agent_fee_usd,
      calls: [
        "GET /api/store/catalog",
        "POST /api/agent/quote",
        "POST /api/agent/orders",
        "POST /api/agent/orders/:id/pay",
      ],
    },
    settlement: {
      default_rail: "base-usdc",
      treasury_evm: TREASURY_EVM,
      treasury_sol: TREASURY_SOL,
      chain_id: LVL_PAYMENT.chainId,
      pay_url: `${origin}/pay?sku=${encodeURIComponent(opts.product.sku)}&amount=${total_usd}`,
      pay_options_api: `${origin}/api/pay/options?sku=${encodeURIComponent(opts.product.sku)}&amount=${total_usd}`,
    },
    printify: {
      product_id: opts.product.printify_product_id,
      storefront_url: opts.product.printify_url,
      credentials_ready: printifyOrderCredentials().ready,
    },
    product: opts.product,
  };
}

function validateShipTo(
  raw: unknown,
): { ok: true; value: ShipTo } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "ship_to object required" };
  }
  const s = raw as Record<string, unknown>;
  const req = [
    "first_name",
    "last_name",
    "email",
    "country",
    "region",
    "address1",
    "city",
    "zip",
  ] as const;
  for (const k of req) {
    if (typeof s[k] !== "string" || !(s[k] as string).trim()) {
      return { ok: false, error: `ship_to.${k} required` };
    }
  }
  const email = String(s.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "ship_to.email invalid" };
  }
  return {
    ok: true,
    value: {
      first_name: String(s.first_name).trim().slice(0, 80),
      last_name: String(s.last_name).trim().slice(0, 80),
      email: email.slice(0, 160),
      phone: s.phone != null ? String(s.phone).trim().slice(0, 40) : undefined,
      country: String(s.country).trim().toUpperCase().slice(0, 2),
      region: String(s.region).trim().slice(0, 80),
      address1: String(s.address1).trim().slice(0, 160),
      address2:
        s.address2 != null ? String(s.address2).trim().slice(0, 160) : undefined,
      city: String(s.city).trim().slice(0, 80),
      zip: String(s.zip).trim().slice(0, 24),
    },
  };
}

async function ensureAgentTables(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql.query(`
    create table if not exists agent_orders (
      id text primary key,
      external_ref text,
      status text not null default 'quoted',
      sku text not null,
      product_id text,
      printify_product_id text,
      variant_id text,
      size text,
      quantity int not null default 1,
      face_usd numeric(12, 2) not null,
      agent_fee_usd numeric(12, 2) not null default 0.50,
      shipping_estimate_usd numeric(12, 2) not null default 0,
      total_usd numeric(12, 2) not null,
      currency text not null default 'USD',
      ship_to jsonb not null default '{}'::jsonb,
      buyer_email text,
      buyer_ref text,
      rail text,
      tx_hash text,
      payment_proof jsonb not null default '{}'::jsonb,
      paid_at timestamptz,
      printify_order_id text,
      printify_status text,
      fulfill_mode text,
      fulfill_error text,
      fulfill_payload jsonb not null default '{}'::jsonb,
      quote jsonb not null default '{}'::jsonb,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await sql.query(`
    create table if not exists agent_order_events (
      id text primary key,
      order_id text not null,
      kind text not null,
      detail jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
}

async function logEvent(
  sql: Awaited<ReturnType<typeof getSql>>,
  orderId: string,
  kind: string,
  detail: Record<string, unknown> = {},
) {
  await sql.query(
    `insert into agent_order_events (id, order_id, kind, detail) values ($1, $2, $3, $4::jsonb)`,
    [id("aev"), orderId, kind, JSON.stringify(detail)],
  );
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const ship_to =
    typeof row.ship_to === "string" ? safeJson(row.ship_to) : row.ship_to;
  const quote =
    typeof row.quote === "string" ? safeJson(row.quote) : row.quote;
  const payment_proof =
    typeof row.payment_proof === "string"
      ? safeJson(row.payment_proof)
      : row.payment_proof;
  return { ...row, ship_to, quote, payment_proof };
}

function paymentNextSteps(
  row: Record<string, unknown>,
  origin: string,
): string[] {
  if (row.status === "awaiting_payment") {
    return [
      `Settle ${num(row.total_usd)} USD via Base USDC (or other rail) to treasury ${TREASURY_EVM}`,
      `POST ${origin}/api/agent/orders/${row.id}/pay with { "rail": "base-usdc", "tx_hash": "0x..." }`,
      `Sandbox: POST .../pay with { "method": "demo", "confirm": true } to simulate settle + fulfill`,
    ];
  }
  if (
    row.status === "submitted_to_printify" ||
    row.status === "simulated_fulfillment"
  ) {
    return [
      "Fulfillment submitted. Poll this order or watch Printify webhooks for production/shipping updates.",
    ];
  }
  return [];
}

function publicOrder(
  row: Record<string, unknown>,
  origin?: string,
): Record<string, unknown> {
  const base = origin ?? String(CLOUDFLARE_MAP.factory);
  const id_ = String(row.id);
  return {
    id: id_,
    status: row.status,
    sku: row.sku,
    size: row.size,
    quantity: row.quantity,
    face_usd: num(row.face_usd),
    agent_fee_usd: num(row.agent_fee_usd),
    shipping_estimate_usd: num(row.shipping_estimate_usd),
    total_usd: num(row.total_usd),
    currency: row.currency ?? "USD",
    ship_to: row.ship_to,
    buyer_ref: row.buyer_ref,
    rail: row.rail,
    tx_hash: row.tx_hash,
    paid_at: row.paid_at,
    printify_order_id: row.printify_order_id,
    printify_status: row.printify_status,
    fulfill_mode: row.fulfill_mode,
    fulfill_error: row.fulfill_error,
    quote: row.quote,
    links: {
      self: `${base}/api/agent/orders/${id_}`,
      pay: `${base}/api/agent/orders/${id_}/pay`,
      human_pay: `${base}/pay?sku=${encodeURIComponent(String(row.sku))}&amount=${num(row.total_usd)}`,
      openapi: `${base}/api/openapi.json`,
    },
    next_steps: paymentNextSteps(row, base),
  };
}

export async function createAgentOrder(input: {
  sku: string;
  quantity?: number;
  size?: string;
  variant_id?: number | string;
  ship_to: unknown;
  buyer_ref?: string;
  external_ref?: string;
  rail?: string;
  origin?: string;
}): Promise<
  | { ok: true; order: Record<string, unknown> }
  | { ok: false; error: string; status?: number }
> {
  const product = await resolveCatalogSku(input.sku);
  if (!product) {
    return { ok: false, error: "sku_not_found", status: 404 };
  }
  const ship = validateShipTo(input.ship_to);
  if (!ship.ok) return { ok: false, error: ship.error, status: 400 };

  const quote = buildQuote({
    product,
    quantity: input.quantity ?? 1,
    country: ship.value.country,
    size: input.size,
    origin: input.origin,
  });

  let variantId: string | null =
    input.variant_id != null ? String(input.variant_id) : null;
  if (product.printify_product_id) {
    const pfyProduct = await fetchPrintifyProduct(product.printify_product_id);
    const picked = pickVariantId(
      pfyProduct,
      input.size ?? quote.size,
      input.variant_id,
    );
    if (picked != null) variantId = String(picked);
  }
  if (!variantId) variantId = "demo-1";

  const orderId = id("aord");
  const origin = input.origin ?? String(CLOUDFLARE_MAP.factory);
  const sql = await getSql();
  await ensureAgentTables(sql);

  await sql.query(
    `insert into agent_orders (
      id, external_ref, status, sku, product_id, printify_product_id, variant_id,
      size, quantity, face_usd, agent_fee_usd, shipping_estimate_usd, total_usd,
      ship_to, buyer_email, buyer_ref, rail, quote
    ) values (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,$11,$12,$13,
      $14::jsonb,$15,$16,$17,$18::jsonb
    )`,
    [
      orderId,
      input.external_ref ?? null,
      "awaiting_payment",
      product.sku,
      product.sku,
      product.printify_product_id,
      variantId,
      input.size ?? quote.size,
      quote.quantity,
      quote.face_usd,
      quote.agent_fee_usd,
      quote.shipping_estimate_usd,
      quote.total_usd,
      JSON.stringify(ship.value),
      ship.value.email,
      input.buyer_ref ?? null,
      input.rail ?? "base-usdc",
      JSON.stringify(quote),
    ],
  );
  await logEvent(sql, orderId, "created", {
    sku: product.sku,
    total_usd: quote.total_usd,
  });

  const order = await getAgentOrder(orderId, origin);
  return { ok: true, order: order! };
}

export async function getAgentOrder(
  orderId: string,
  origin?: string,
): Promise<Record<string, unknown> | null> {
  const sql = await getSql();
  await ensureAgentTables(sql);
  const rows = await sql.query<Record<string, unknown>>(
    `select * from agent_orders where id = $1 limit 1`,
    [orderId],
  );
  if (!rows[0]) return null;
  return publicOrder(normalizeRow(rows[0]), origin);
}

export type PayInput = {
  rail?: string;
  tx_hash?: string;
  method?: "crypto" | "demo" | "stripe";
  confirm?: boolean;
  stripe_session_id?: string;
  force_simulate_printify?: boolean;
};

export async function payAndFulfillAgentOrder(
  orderId: string,
  pay: PayInput,
  origin?: string,
): Promise<
  | { ok: true; order: Record<string, unknown> }
  | {
      ok: false;
      error: string;
      status?: number;
      order?: Record<string, unknown>;
    }
> {
  const sql = await getSql();
  await ensureAgentTables(sql);
  const rows = await sql.query<Record<string, unknown>>(
    `select * from agent_orders where id = $1 limit 1`,
    [orderId],
  );
  const raw = rows[0];
  if (!raw) return { ok: false, error: "order_not_found", status: 404 };
  const row = normalizeRow(raw);

  const terminal = [
    "submitted_to_printify",
    "simulated_fulfillment",
    "cancelled",
  ];
  if (terminal.includes(String(row.status))) {
    return { ok: true, order: publicOrder(row, origin) };
  }

  const method =
    pay.method ??
    (pay.tx_hash ? "crypto" : pay.confirm ? "demo" : "crypto");
  let proof: Record<string, unknown> = {
    method,
    at: new Date().toISOString(),
  };

  if (method === "demo") {
    if (pay.confirm !== true) {
      return { ok: false, error: "demo_requires_confirm_true", status: 400 };
    }
    proof = { ...proof, demo: true, note: "Sandbox settlement accepted" };
  } else if (method === "stripe") {
    if (!pay.stripe_session_id || pay.stripe_session_id.length < 8) {
      return { ok: false, error: "stripe_session_id_required", status: 400 };
    }
    proof = {
      ...proof,
      stripe_session_id: pay.stripe_session_id,
      note: "Stripe session recorded — verify via Stripe webhook in production",
    };
  } else {
    const tx = (pay.tx_hash || "").trim();
    if (
      !/^0x[a-fA-F0-9]{64}$/.test(tx) &&
      !/^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(tx)
    ) {
      return { ok: false, error: "tx_hash_invalid", status: 400 };
    }
    proof = {
      ...proof,
      tx_hash: tx,
      rail: pay.rail || row.rail || "base-usdc",
      treasury_evm: TREASURY_EVM,
      note: "Tx hash accepted. Full on-chain confirmation can be layered later.",
    };
  }

  const rail = pay.rail || (row.rail as string) || "base-usdc";
  const txHash =
    method === "crypto"
      ? pay.tx_hash || null
      : method === "demo"
        ? `demo:${orderId}`
        : null;

  await sql.query(
    `update agent_orders set
      status = 'paid',
      rail = $2,
      tx_hash = $3,
      payment_proof = $4::jsonb,
      paid_at = now(),
      updated_at = now()
     where id = $1`,
    [orderId, rail, txHash, JSON.stringify(proof)],
  );
  await logEvent(sql, orderId, "paid", proof);

  await sql.query(
    `update agent_orders set status = 'fulfilling', updated_at = now() where id = $1`,
    [orderId],
  );

  const shipTo = row.ship_to as ShipTo;
  const productId = String(row.printify_product_id || "unknown");
  let variantNum = Number(row.variant_id);
  if (!Number.isFinite(variantNum) || variantNum <= 0) {
    const pfyProduct = await fetchPrintifyProduct(productId);
    variantNum = pickVariantId(pfyProduct, String(row.size || "M")) ?? 1;
  }

  const forceSim =
    pay.force_simulate_printify === true ||
    method === "demo" ||
    !printifyOrderCredentials().ready ||
    !row.printify_product_id ||
    String(row.variant_id).startsWith("demo");

  const fulfill = await createPrintifyShopOrder(
    {
      externalId: orderId,
      productId,
      variantId: variantNum,
      quantity: Number(row.quantity) || 1,
      shipTo,
    },
    { forceSimulated: forceSim },
  );

  if (!fulfill.ok) {
    await sql.query(
      `update agent_orders set
        status = 'failed',
        fulfill_mode = 'error',
        fulfill_error = $2,
        updated_at = now()
       where id = $1`,
      [orderId, fulfill.error],
    );
    await logEvent(sql, orderId, "fulfill_failed", { error: fulfill.error });
    const failed = await getAgentOrder(orderId, origin);
    return {
      ok: false,
      error: fulfill.error,
      status: 502,
      order: failed ?? undefined,
    };
  }

  const status: AgentOrderStatus =
    fulfill.mode === "printify"
      ? "submitted_to_printify"
      : "simulated_fulfillment";

  await sql.query(
    `update agent_orders set
      status = $2,
      printify_order_id = $3,
      printify_status = $4,
      fulfill_mode = $5,
      fulfill_payload = $6::jsonb,
      fulfill_error = null,
      updated_at = now()
     where id = $1`,
    [
      orderId,
      status,
      fulfill.printifyOrderId,
      fulfill.status,
      fulfill.mode,
      JSON.stringify(fulfill),
    ],
  );
  await logEvent(sql, orderId, "fulfilled", {
    mode: fulfill.mode,
    printify_order_id: fulfill.printifyOrderId,
  });

  const order = await getAgentOrder(orderId, origin);
  return { ok: true, order: order! };
}

export function agentOpenApiSpec(origin?: string) {
  const base = origin ?? String(CLOUDFLARE_MAP.factory);
  return {
    openapi: "3.1.0",
    info: {
      title: "LVL Agent Commerce API",
      version: "1.0.0",
      description:
        "Discover catalog, quote merch, create agent orders, verify payment, and fulfill via Printify POD. Cheaper shortcut than building POD from scratch.",
      contact: { url: base },
    },
    servers: [{ url: base }],
    paths: {
      "/api/agent/card": {
        get: {
          summary: "Agent capability card",
          operationId: "getAgentCard",
          responses: { "200": { description: "Capability card JSON" } },
        },
      },
      "/api/store/catalog": {
        get: {
          summary: "Merch catalog + agent block",
          operationId: "getCatalog",
          responses: { "200": { description: "Catalog" } },
        },
      },
      "/api/agent/quote": {
        post: {
          summary: "Quote a SKU (face + $0.50 agent fee)",
          operationId: "createQuote",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["sku"],
                  properties: {
                    sku: { type: "string" },
                    quantity: { type: "integer", default: 1 },
                    size: { type: "string", default: "M" },
                    country: { type: "string", default: "US" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Quote" } },
        },
      },
      "/api/agent/orders": {
        post: {
          summary: "Create agent order (awaiting payment)",
          operationId: "createOrder",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["sku", "ship_to"],
                  properties: {
                    sku: { type: "string" },
                    quantity: { type: "integer" },
                    size: { type: "string" },
                    variant_id: { type: "integer" },
                    buyer_ref: { type: "string" },
                    external_ref: { type: "string" },
                    rail: { type: "string" },
                    ship_to: {
                      type: "object",
                      required: [
                        "first_name",
                        "last_name",
                        "email",
                        "country",
                        "region",
                        "address1",
                        "city",
                        "zip",
                      ],
                      properties: {
                        first_name: { type: "string" },
                        last_name: { type: "string" },
                        email: { type: "string" },
                        phone: { type: "string" },
                        country: { type: "string" },
                        region: { type: "string" },
                        address1: { type: "string" },
                        address2: { type: "string" },
                        city: { type: "string" },
                        zip: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Order created" },
            "404": { description: "SKU not found" },
          },
        },
      },
      "/api/agent/orders/{id}": {
        get: {
          summary: "Get order status",
          operationId: "getOrder",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Order" } },
        },
      },
      "/api/agent/orders/{id}/pay": {
        post: {
          summary: "Verify payment and submit Printify fulfillment",
          operationId: "payAndFulfill",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    method: {
                      type: "string",
                      enum: ["crypto", "demo", "stripe"],
                    },
                    tx_hash: { type: "string" },
                    rail: { type: "string" },
                    confirm: { type: "boolean" },
                    stripe_session_id: { type: "string" },
                    force_simulate_printify: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Paid + fulfillment result" } },
        },
      },
      "/api/pay/options": {
        get: {
          summary: "Multi-rail settlement options",
          operationId: "payOptions",
          responses: { "200": { description: "Rails" } },
        },
      },
      "/llms.txt": {
        get: {
          summary: "LLM discovery document",
          operationId: "llmsTxt",
          responses: { "200": { description: "text/plain" } },
        },
      },
      "/well-known/agent.json": {
        get: {
          summary: "Well-known agent card (app route)",
          operationId: "wellKnownAgentApp",
          responses: { "200": { description: "JSON" } },
        },
      },
      "/.well-known/agent.json": {
        get: {
          summary: "Well-known agent card",
          operationId: "wellKnownAgent",
          responses: { "200": { description: "JSON" } },
        },
      },
    },
  };
}

export const CORS_JSON = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "cache-control": "no-store",
} as const;

export function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...CORS_JSON },
  });
}

export function jsonErr(
  error: string,
  status = 400,
  extra: Record<string, unknown> = {},
) {
  return new Response(
    JSON.stringify({ ok: false, error, ...extra }, null, 2),
    {
      status,
      headers: { ...CORS_JSON },
    },
  );
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-max-age": "86400",
    },
  });
}

export function requestOrigin(request: Request): string {
  try {
    const u = new URL(request.url);
    if (u.hostname === "127.0.0.1" || u.hostname === "localhost") {
      return u.origin;
    }
  } catch {
    /* ignore */
  }
  return String(CLOUDFLARE_MAP.factory);
}
