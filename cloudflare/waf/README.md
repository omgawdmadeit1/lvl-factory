# Cloudflare WAF — LVL Factory

Protects `factory.lvlltd.com` at the edge (DDoS companion + L7 rules).

## Packs

| Pack | File | Paths |
|------|------|--------|
| **printify** | [`printify-webhooks-rules.json`](./printify-webhooks-rules.json) | `/api/printify/*` webhooks |
| **shop-pay** | [`shop-pay-rules.json`](./shop-pay-rules.json) | `/shop`, `/api/store/*`, `/pay`, `/agent/*` |
| **all** | both | Full commerce surface |

## Layers

1. **Zone WAF** (JSON packs) — custom rules + rate limiting via API  
2. **Worker** (`../workers/lvl-factory-proxy`) — Printify in-proxy checks  
3. **Origin** (`src/lib/merch/webhook-waf.server.ts`, HMAC) — defense in depth  

## Apply zone rules

```bash
export CLOUDFLARE_API_TOKEN=...   # Zone.Firewall + Zone.Rate Limits
export CLOUDFLARE_ZONE_ID=...     # lvlltd.com

# Printify only (default)
node scripts/apply-cloudflare-waf.mjs

# Shop + pay + store API + agent
RULE_PACK=shop-pay node scripts/apply-cloudflare-waf.mjs

# Everything
RULE_PACK=all node scripts/apply-cloudflare-waf.mjs

# Preview without writing
RULE_PACK=all DRY_RUN=1 node scripts/apply-cloudflare-waf.mjs

# After Printify secret is live:
ENABLE_SIGNATURE_RULE=1 RULE_PACK=all node scripts/apply-cloudflare-waf.mjs
```

## Shop + pay pack summary

| Area | Custom rules | Rate limits (per IP / min) |
|------|----------------|----------------------------|
| `/shop` | Safe methods only; challenge high threat / bad UA | GET 300 |
| `/api/store/catalog` | Easier for agents; still limited | GET 120 |
| `/api/store/image` | GET/HEAD only | GET 240 |
| Other `/api/store/*` | Method + body size; challenge scanners | 60 |
| `/pay` | GET challenge high threat; **skip bot fight on POST** | GET 60 · POST 30 |
| `/agent/*` | Soft challenge (score > 50) | GET 90 |

### Do not

- Managed-challenge **Printify webhook POST** or blindly enable **Under Attack Mode** without path exceptions  
- Skip **rate limits** on `/pay` POST (only skip Bot Fight products)  
- Grey-cloud `factory.lvlltd.com` or publish the Vercel origin hostname  

## Deploy worker (Printify path)

```bash
npx wrangler deploy -c cloudflare/workers/lvl-factory-proxy/wrangler.toml
npx wrangler secret put WEBHOOK_GATE_TOKEN -c cloudflare/workers/lvl-factory-proxy/wrangler.toml
```

## Dashboard checklist (shop-pay)

See `dashboard_checklist` inside [`shop-pay-rules.json`](./shop-pay-rules.json).
