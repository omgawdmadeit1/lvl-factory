# Live domain

| Host | Role |
|------|------|
| **https://factory.lvlltd.com** | Production custom domain (Cloudflare Worker proxy) |
| https://lvl-factory.vercel.app | Vercel origin |
| https://lvl-factory-proxy.josephlamartaylor.workers.dev | Worker direct |

## Payment settlement (multi-rail)

**Buyers choose any supported mainnet crypto, or pay by card via Stripe.** Testnets are forbidden.

### Crypto (buyer chooses)

| Network | Chain ID | Assets |
|---------|----------|--------|
| **Ethereum mainnet** | `1` | USDC, USDT, ETH |
| Base | `8453` | USDC, USDT, ETH |
| **Solana mainnet** | `101` (cluster) | USDC (SPL), USDT (SPL), SOL |
| Arbitrum One | `42161` | USDC, USDT, ETH |
| Optimism | `10` | USDC, USDT, ETH |
| Polygon | `137` | USDC, USDT, MATIC |

Wallets:
- **EVM:** MetaMask, Coinbase, Trust, Rainbow, Rabby, Brave, WalletConnect v2
- **Solana:** Phantom, Solflare, Backpack, Glow + mobile deep links

### Solana treasury

| Item | Value |
|------|--------|
| Env key | `VITE_TREASURY_SOL` |
| Format | base58 public key |
| Active treasury | `8sjT1G2YWpscXbJmwv2UK1rHZmQFLaczU5KXiiS8gvDy` |
| USDC mint | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| CAIP-2 | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| Module | `src/lib/factory/solana-wallet.ts` |


### WalletConnect v2

| Item | Value |
|------|--------|
| Protocol | **WalletConnect v2** (Sign API) — not v1 |
| Package | `@walletconnect/ethereum-provider` → Reown AppKit QR modal |
| Relay | `wss://relay.walletconnect.com` |
| Env key | `VITE_WALLETCONNECT_PROJECT_ID` |
| Project ID | `7e30c6e6441bbc7523e87195868a572a` |
| Dashboard | https://dashboard.reown.com |
| Config | `src/lib/factory/wallet-config.ts` → `buildWalletConnectV2Options()` |
| Connect | `src/lib/factory/wallet.ts` → `connectWalletConnect()` |
| Chains | Ethereum `1`, Base `8453`, Arbitrum `42161`, Optimism `10`, Polygon `137` |
| Methods | `eth_sendTransaction`, `personal_sign`, `wallet_switchEthereumChain`, … |
| Production | Same env key on Vercel, then redeploy |




| Field | Value |
|-------|--------|
| payTo (EVM treasury) | `0xa00876513bAA433ce2B58A5341Fd06d2b6f9A6ED` |
| Default rail | Base USDC (x402 agents) |
| Protocol (default) | x402 on Base |
| Forbidden | Testnets only |

### Stripe (card)

| Link | Face | URL |
|------|------|-----|
| Card canary | $0.50 (Stripe min) | https://buy.stripe.com/4gM28r6Ap4QSb1126dgUM00 |
| Starter unlock | $0.99 | https://buy.stripe.com/3cI5kDf6Vbfg2uv4elgUM01 |
| Account | lvl X, Inc. | `acct_1TVJoWE6xjYB5uvs` |

Crypto canary face stays **$0.05**. Card minimum is **$0.50**.

Source of truth: `src/lib/factory/payment.ts` (`NETWORKS`, `STRIPE_LINKS`, `settlementBlock()`).

Factory checkout UI: **/pay** (network + asset chooser, or Stripe). Canary guide: **/canary**.

## Architecture

```
browser → factory.lvlltd.com (Cloudflare)
        → Worker `lvl-factory-proxy`
        → https://lvl-factory.vercel.app (Nitro SSR)
```

## Tier 1 operator loop (in this app)

1. Open **Tier 1 Plan** → **Seed Tier 1 packs** (1 music + 3 skills).
2. **Approve + publish ready**.
3. **Export Tier 1 bundle** (flagship shelf + canary guide + listings JSON).
4. Upload listings into lvlltd.com catalog deploy path (multi-rail settlement fields).
5. Complete one live canary unlock via **/pay** (any mainnet crypto) or Stripe $0.50.
6. Wire Stripe webhooks on lvlltd.com for automatic sealed unlock after card pay.

## Ops

Re-provision / redeploy proxy (marketplace repo secrets):

```bash
gh workflow run "Provision Factory DNS" -R omgawdmadeit1/lvlltd-agent-marketplace -f subdomain=factory
```

Source: `workers/lvl-factory-proxy` in `lvlltd-agent-marketplace`.

## Merch + art (agent pipeline)

| Item | Value |
|------|--------|
| Human shop | `/merch` on factory.lvlltd.com |
| Operator pipeline | `/pipeline` — Grok Imagine brief → mockup → Printify draft → publish |
| Agent catalog | `/agent/merch` — protocol `lvl-merch-v1` JSON |
| Printify store | https://lvlxltd.printify.me |
| Cloudflare | factory.lvlltd.com → Vercel; merch UI on factory |
| Fulfillment | Printify POD (physical) |
| Agent pay | `/pay?sku=SKU&amount=PRICE` multi-rail |
| API token (optional) | `PRINTIFY_API_TOKEN` server-only — never `VITE_*` |
| Shop id (optional) | `PRINTIFY_SHOP_ID` |

Modules: `src/lib/merch/*` · Live products seeded from Printify storefront mockups.

Pipeline stages: `brief` → `imagine` → `mockup` → `printify_draft` → `review` → `published`

## Printify webhooks

| Item | Value |
|------|--------|
| Receive URL | `POST https://factory.lvlltd.com/api/printify/webhooks` |
| Status / event log | `GET /api/printify/webhooks` |
| Manage subscriptions | `GET/POST /api/printify/subscriptions` |
| Operator UI | `/webhooks` |
| Topics | shop:disconnected, product:*, order:*, order:shipment:* |
| Signature header | `X-Pfy-Signature: sha256=<hmac>` |
| Secret env | `PRINTIFY_WEBHOOK_SECRET` |
| Token / shop | `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID` |
| Storage | `printify_webhook_events`, `printify_orders_mirror` (PGLite/Neon) |

Install all topics from `/webhooks` → **Install all topics** (requires token + shop id).
Local QA without Printify: **Local simulate** on the same page.

## Cloudflare WAF (Printify webhooks)

| Layer | Location |
|-------|----------|
| Edge worker | `cloudflare/workers/lvl-factory-proxy` (factory.lvlltd.com proxy) |
| Zone custom rules | `cloudflare/waf/printify-webhooks-rules.json` |
| Apply script | `node scripts/apply-cloudflare-waf.mjs` |
| Origin WAF | `src/lib/merch/webhook-waf.server.ts` on `/api/printify/*` |

### Protections
- Rate limit webhook POST 60/min/IP (edge + origin)
- Rate limit Printify API GET 120/min/IP
- Block body > 512KB
- Method allowlist on `/api/printify/webhooks`
- Optional require `X-Pfy-Signature` (`ENFORCE_SIGNATURE=1` on worker / `PRINTIFY_WEBHOOK_STRICT=1` origin)
- Optional `WEBHOOK_GATE_TOKEN` → header `x-lvl-webhook-gate`
- Optional `WEBHOOK_ADMIN_TOKEN` for subscription management POST
- Skip bot challenge on legitimate webhook POST (zone rule)

### Deploy
```bash
# Zone WAF rules (needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID)
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ZONE_ID=...
node scripts/apply-cloudflare-waf.mjs

# Edge worker (from factory repo or marketplace workers/lvl-factory-proxy)
npx wrangler deploy -c cloudflare/workers/lvl-factory-proxy/wrangler.toml
# set worker secrets/vars: ENFORCE_SIGNATURE, WEBHOOK_GATE_TOKEN, WEBHOOK_ADMIN_TOKEN
```
