/**
 * Printify product fetch + order create for agent fulfillment.
 */
import {
  getPrintifyShopId,
  getPrintifyToken,
} from "./printify-api.server";

const API = "https://api.printify.com/v1";
const UA = "LVL-Factory-Agent-Orders/1.0";

export type PrintifyVariant = {
  id: number;
  title?: string;
  sku?: string;
  price?: number;
  is_enabled?: boolean;
  options?: Record<string, unknown>;
};

export type PrintifyProductDetail = {
  id: string;
  title?: string;
  variants?: PrintifyVariant[];
  visible?: boolean;
};

export type ShipTo = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
};

async function pfy<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": UA,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Printify ${res.status} ${path}: ${text.slice(0, 500)}`);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function printifyOrderCredentials(): {
  ready: boolean;
  shopId: string | null;
  hasToken: boolean;
} {
  const token = getPrintifyToken();
  const shopId = getPrintifyShopId() ?? null;
  return {
    ready: Boolean(token && shopId),
    shopId,
    hasToken: Boolean(token),
  };
}

export async function fetchPrintifyProduct(
  productId: string,
): Promise<PrintifyProductDetail | null> {
  const token = getPrintifyToken();
  const shopId = getPrintifyShopId();
  if (!token || !shopId) return null;
  try {
    return await pfy<PrintifyProductDetail>(
      `/shops/${shopId}/products/${productId}.json`,
      token,
      { method: "GET" },
    );
  } catch {
    return null;
  }
}

/** Pick an enabled variant; prefer title/sku matching size token. */
export function pickVariantId(
  product: PrintifyProductDetail | null,
  size?: string | null,
  explicitVariantId?: number | string | null,
): number | null {
  if (explicitVariantId != null && String(explicitVariantId).length) {
    const n = Number(explicitVariantId);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const variants = (product?.variants ?? []).filter(
    (v) => v.is_enabled !== false && typeof v.id === "number",
  );
  if (!variants.length) return null;
  if (size) {
    const s = size.toLowerCase();
    const hit = variants.find((v) => {
      const title = (v.title || "").toLowerCase();
      const sku = (v.sku || "").toLowerCase();
      return (
        title.includes(s) ||
        sku.includes(s) ||
        title.split("/").some((p) => p.trim() === s) ||
        title.split("-").some((p) => p.trim() === s)
      );
    });
    if (hit) return hit.id;
  }
  return variants[0]!.id;
}

export type CreatePrintifyOrderInput = {
  externalId: string;
  productId: string;
  variantId: number;
  quantity: number;
  shipTo: ShipTo;
  shippingMethod?: number;
  sendShippingNotification?: boolean;
};

export type CreatePrintifyOrderResult =
  | {
      ok: true;
      mode: "printify";
      printifyOrderId: string;
      status: string;
      raw: unknown;
    }
  | {
      ok: true;
      mode: "simulated";
      printifyOrderId: string;
      status: string;
      reason: string;
      raw: unknown;
    }
  | {
      ok: false;
      mode: "error";
      error: string;
    };

/**
 * Create a production order on Printify, or simulate when credentials missing
 * / forceSimulated is set (sandbox & agent demos).
 */
export async function createPrintifyShopOrder(
  input: CreatePrintifyOrderInput,
  opts?: { forceSimulated?: boolean },
): Promise<CreatePrintifyOrderResult> {
  const token = getPrintifyToken();
  const shopId = getPrintifyShopId();

  if (opts?.forceSimulated || !token || !shopId) {
    const simId = `sim-pfy-${input.externalId.slice(0, 12)}`;
    return {
      ok: true,
      mode: "simulated",
      printifyOrderId: simId,
      status: "on-hold-simulated",
      reason: !token || !shopId
        ? "PRINTIFY_API_TOKEN / PRINTIFY_SHOP_ID not configured — simulated fulfillment"
        : "forceSimulated",
      raw: {
        external_id: input.externalId,
        line_items: [
          {
            product_id: input.productId,
            variant_id: input.variantId,
            quantity: input.quantity,
          },
        ],
        address_to: input.shipTo,
      },
    };
  }

  const body = {
    external_id: input.externalId,
    line_items: [
      {
        product_id: input.productId,
        variant_id: input.variantId,
        quantity: input.quantity,
      },
    ],
    shipping_method: input.shippingMethod ?? 1,
    is_printify_express: false,
    send_shipping_notification: input.sendShippingNotification ?? true,
    address_to: {
      first_name: input.shipTo.first_name,
      last_name: input.shipTo.last_name,
      email: input.shipTo.email,
      phone: input.shipTo.phone || "0000000000",
      country: input.shipTo.country,
      region: input.shipTo.region,
      address1: input.shipTo.address1,
      address2: input.shipTo.address2 || "",
      city: input.shipTo.city,
      zip: input.shipTo.zip,
    },
  };

  try {
    const raw = await pfy<Record<string, unknown>>(
      `/shops/${shopId}/orders.json`,
      token,
      { method: "POST", body: JSON.stringify(body) },
    );
    const id =
      raw && (raw.id != null || raw.order_id != null)
        ? String(raw.id ?? raw.order_id)
        : `pfy-${input.externalId}`;
    const status =
      raw && raw.status != null ? String(raw.status) : "pending";
    return {
      ok: true,
      mode: "printify",
      printifyOrderId: id,
      status,
      raw,
    };
  } catch (e) {
    return {
      ok: false,
      mode: "error",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
