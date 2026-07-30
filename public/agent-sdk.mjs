/**
 * LVL Agent Shopping SDK (browser / Node 18+)
 *
 *   import { LvlAgent } from "https://factory.lvlltd.com/agent-sdk.mjs";
 *   const agent = new LvlAgent({ base: "https://factory.lvlltd.com" });
 *   const { quote } = await agent.quote({ sku: "LVL-TEE-MAIN-CHARACTER", size: "L" });
 *   const { order } = await agent.createOrder({ sku, ship_to, external_ref: "my-id-1" });
 *   await agent.pay(order.id, { method: "demo", confirm: true, token: order.token });
 *
 * Protocol: lvl-agent-order-v1 · fee $0.50 · Printify POD
 */
export class LvlAgent {
  /**
   * @param {{ base?: string, userAgent?: string, fetch?: typeof fetch }} [opts]
   */
  constructor(opts = {}) {
    this.base = (opts.base || "https://factory.lvlltd.com").replace(/\/$/, "");
    this.userAgent = opts.userAgent || "LVL-Agent-SDK/1.0";
    this.fetch = opts.fetch || globalThis.fetch.bind(globalThis);
  }

  /** @param {string} path @param {RequestInit} [init] */
  async request(path, init = {}) {
    const headers = {
      accept: "application/json",
      "user-agent": this.userAgent,
      ...(init.headers || {}),
    };
    if (init.body && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    const res = await this.fetch(`${this.base}${path}`, { ...init, headers });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const err = new Error(
        data?.error || data?.message || `HTTP ${res.status}`,
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  status() {
    return this.request("/api/agent/status");
  }

  catalog() {
    return this.request("/api/store/catalog");
  }

  card() {
    return this.request("/api/agent/card");
  }

  /**
   * Single or batch quote.
   * @param {{ sku?: string, quantity?: number, size?: string, country?: string, items?: object[] }} body
   */
  quote(body) {
    return this.request("/api/agent/quote", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * @param {{ sku: string, quantity?: number, size?: string, ship_to: object, external_ref?: string, buyer_ref?: string, rail?: string }} body
   */
  createOrder(body) {
    return this.request("/api/agent/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** @param {{ external_ref?: string, buyer_ref?: string, limit?: number }} [q] */
  listOrders(q = {}) {
    const params = new URLSearchParams();
    if (q.external_ref) params.set("external_ref", q.external_ref);
    if (q.buyer_ref) params.set("buyer_ref", q.buyer_ref);
    if (q.limit) params.set("limit", String(q.limit));
    const qs = params.toString();
    return this.request(`/api/agent/orders${qs ? `?${qs}` : ""}`);
  }

  /** @param {string} id @param {string} [token] */
  getOrder(id, token) {
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    return this.request(`/api/agent/orders/${id}${qs}`);
  }

  /**
   * @param {string} id
   * @param {{ method?: string, confirm?: boolean, tx_hash?: string, rail?: string, token?: string, stripe_session_id?: string }} pay
   */
  pay(id, pay) {
    return this.request(`/api/agent/orders/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(pay),
    });
  }

  /** Design brief ticket */
  design(body) {
    return this.request("/api/agent/design", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Full demo loop: quote → order → demo pay.
   * @param {{ sku: string, size?: string, ship_to: object, external_ref?: string }} input
   */
  async buyDemo(input) {
    const q = await this.quote({
      sku: input.sku,
      size: input.size || "M",
      quantity: 1,
    });
    const created = await this.createOrder({
      sku: input.sku,
      size: input.size || "M",
      ship_to: input.ship_to,
      external_ref: input.external_ref,
      buyer_ref: "agent-sdk-demo",
    });
    const paid = await this.pay(created.order.id, {
      method: "demo",
      confirm: true,
      token: created.order.token,
    });
    return { quote: q.quote, order: paid.order };
  }
}

export default LvlAgent;
