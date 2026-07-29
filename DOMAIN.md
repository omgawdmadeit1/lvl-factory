# LVL Ltd — domain, commerce, edge (live model)

> Source of truth for **lvlltd.com** factory commerce: store, agents, Printify, multi-rail pay, Cloudflare DDoS/WAF, image proxy.

## Hosts

| Host | Role |
|------|------|
| **https://lvlltd.com** | Brand apex (Cloudflare DNS) |
| **https://www.lvlltd.com** | WWW |
| **https://factory.lvlltd.com** | Commerce + operator factory (CF proxy → Vercel) |
| **https://factory.lvlltd.com/shop** | **LVL Store** (Shopify-style merch & art) |
| **https://factory.lvlltd.com/pay** | Multi-rail checkout (crypto + Stripe) |
| **https://factory.lvlltd.com/network** | In-app domain & rails map |
| **https://lvlxltd.printify.me** | Printify Pop-Up (physical POD) |
| https://lvl-factory.vercel.app | Vercel origin (do not publish / grey-cloud) |
| Worker | `cloudflare/workers/lvl-factory-proxy` |

In-app model: `LVL_NETWORK` + `CLOUDFLARE_MAP` in `src/lib/merch/printify.ts`.

---

## Architecture

```
Internet / agents / Printify
        │
        ▼
Cloudflare anycast (unmetered DDoS L3–L7)
  · Zone WAF packs: printify + shop-pay
  · Rate limiting rules
  · Worker lvl-factory-proxy (edge methods, RL, signature gate)
        │
        ▼
factory.lvlltd.com → Vercel Nitro SSR (origin WAF + HMAC + store RL)
        │
        ├─ /shop          LVL Store UI
        ├─ /pay           multi-rail settlement UI
        ├─ /api/store/*   catalog + optimized image proxy
        ├─ /api/printify/* webhooks + subscriptions
        ├─ /pipeline      Imagine → Printify drafts
        └─ /agent/merch   agent protocol UI
```

**Not used for this stack (by design):** AWS Shield Advanced, Global Accelerator, S3 Transfer Acceleration on Printify’s bucket (we don’t own it; mockups are small/cached).

---

## LVL Store

| Path | Purpose |
|------|---------|
| `/shop` | Home + latest drops |
| `/shop/collections/:handle` | tees, art, agent, boston, statement, all + search/sort |
| `/shop/:slug` | PDP (size, qty, cart, Printify + agent pay) |
| `/shop/cart` | Cart · Printify checkout · multi-rail pay |
| `/merch` | **Redirects** → `/shop` |

| Module | Path |
|--------|------|
| Cart | `src/lib/store/cart.ts` |
| Collections | `src/lib/store/collections.ts` |
| Images | `src/lib/store/images.ts` + `image-proxy.server.ts` |
| Origin store WAF | `src/lib/store/edge-waf.server.ts` |
| UI shell | `src/components/store/*` |

### Image proxy (Printify → S3)

Printify `images-api` often returns empty body + `x-automaton-object-url` (S3).

| Endpoint | Behavior |
|----------|----------|
| `GET /api/store/image?u=` | Resolve + **302** to S3 (default, cheapest) |
| `?mode=stream` | Proxy JPEG bytes (same-origin, long CDN cache) |
| `?mode=json` | `{ resolved, source, cached }` |
| `?stats=1` | Cache stats |
| `POST` `{ warm: [] }` | Warm resolve cache |

Optimizations: TTL memory cache, in-flight coalescing, HEAD-first, seed map `RESOLVED_MOCKUPS`, CDN `s-maxage`.

---

## Agent commerce

| Item | Value |
|------|--------|
| Protocol | `lvl-merch-v1` |
| UI | `/agent/merch` |
| API | `GET /api/store/catalog` |
| Pay | `/pay?sku=SKU&amount=PRICE` |
| Human store | `/shop` |
| Module | `src/lib/merch/agent-commerce.ts` |

---

## Printify

| Item | Value |
|------|--------|
| Store | https://lvlxltd.printify.me (`lvlxltd`) |
| Webhook receive | `POST /api/printify/webhooks` |
| Operator UI | `/webhooks` |
| HMAC | `X-Pfy-Signature: sha256=<hex>` · `printify-hmac.server.ts` |
| Secrets | `PRINTIFY_WEBHOOK_SECRET` (+ `_PREVIOUS`), `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID` |
| Pipeline UI | `/pipeline` · stages brief → imagine → mockup → draft → review → published |

```bash
npm run test:hmac
```

---

## Multi-rail payment

**Mainnets only.** Buyers choose crypto or Stripe card.

| Network | Chain ID | Assets |
|---------|----------|--------|
| Ethereum | `1` | USDC, USDT, ETH |
| Base | `8453` | USDC, USDT, ETH (default x402 rail) |
| Solana | `101` | USDC SPL, USDT SPL, SOL |
| Arbitrum / Optimism / Polygon | … | USDC, USDT, native |

| Field | Value |
|-------|--------|
| EVM treasury | `0xa00876513bAA433ce2B58A5341Fd06d2b6f9A6ED` |
| Sol treasury env | `VITE_TREASURY_SOL` |
| WC project | `VITE_WALLETCONNECT_PROJECT_ID` |
| Source | `src/lib/factory/payment.ts` |
| UI | `/pay` · canary `/canary` |

Stripe account `acct_1TVJoWE6xjYB5uvs` — card canary $0.50 min; crypto canary $0.05.

---

## Cloudflare DDoS + WAF

### Automatic
- **Unmetered DDoS** (L3–L7) on orange-clouded hostnames
- Keep `factory.lvlltd.com` **proxied**; never publish Vercel origin

### Zone packs (`cloudflare/waf/`)

| Pack | File | Surfaces |
|------|------|----------|
| printify | `printify-webhooks-rules.json` | `/api/printify/*` |
| shop-pay | `shop-pay-rules.json` | `/shop`, `/api/store/*`, `/pay`, `/agent/*` |

| Path | Highlights |
|------|------------|
| `/shop` | Methods GET/HEAD; threat challenge; **300**/min |
| `/api/store/catalog` | Agent-friendly; **120**/min |
| `/api/store/image` | GET only; **240**/min |
| `/pay` | Challenge GET; **skip Bot Fight on POST**; **30** POST/min |
| Webhooks | **60** POST/min; signature rule optional; **no** challenge on POST |

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ZONE_ID=...

npm run waf:all:dry          # preview
npm run waf:all              # printify + shop-pay
npm run waf:shop             # shop-pay only
ENABLE_SIGNATURE_RULE=1 npm run waf:all
```

### Worker edge (`cloudflare/workers/lvl-factory-proxy`)

v2 enforces method allowlists + Cache-API rate limits for **printify, store, shop, pay, agent** before proxying to Vercel. Security headers + edge version `x-lvl-edge-version: 2`.

```bash
npx wrangler deploy -c cloudflare/workers/lvl-factory-proxy/wrangler.toml
# vars/secrets: ORIGIN_URL, ENFORCE_SIGNATURE, WEBHOOK_GATE_TOKEN, WEBHOOK_ADMIN_TOKEN
```

### Origin

| Layer | Module |
|-------|--------|
| Webhooks | `webhook-waf.server.ts` + HMAC |
| Store/image | `edge-waf.server.ts` on catalog + image handlers |

### Under Attack Mode
If enabled zone-wide, exclude or carefully test **webhook POST** and **pay POST** (providers cannot solve challenges). Prefer path rules over global UAM.

### AWS note
**Shield Advanced / Global Accelerator** only matter if you later put a public **AWS** edge (CloudFront/ALB/AGA). Current edge is Cloudflare — do not buy Shield for Vercel.

---

## Tier 1 operator loop

1. **Tier 1 Plan** → Seed packs  
2. Approve + publish  
3. Export bundle  
4. Canary unlock via `/pay`  
5. Stripe webhooks on apex for sealed unlock (marketplace path)

---

## Ops

```bash
# Redeploy factory DNS proxy (marketplace repo)
gh workflow run "Provision Factory DNS" -R omgawdmadeit1/lvlltd-agent-marketplace -f subdomain=factory

# This repo
npm run typecheck
npm run build
npm run waf:all
```

Env (server): `PRINTIFY_*`, `DATABASE_URL` / PGLite, payment `VITE_*` for client rails.

---

## Quick links (production)

| Surface | URL |
|---------|-----|
| Store | https://factory.lvlltd.com/shop |
| Cart | https://factory.lvlltd.com/shop/cart |
| Pay | https://factory.lvlltd.com/pay |
| Agents | https://factory.lvlltd.com/agent/merch |
| Catalog API | https://factory.lvlltd.com/api/store/catalog |
| Network map | https://factory.lvlltd.com/network |
| Webhooks ops | https://factory.lvlltd.com/webhooks |
| Pipeline | https://factory.lvlltd.com/pipeline |
| Printify | https://lvlxltd.printify.me |
