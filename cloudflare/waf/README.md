# Cloudflare WAF — Printify webhooks

Protects `https://factory.lvlltd.com/api/printify/webhooks`.

## Layers

1. **Zone WAF** (`printify-webhooks-rules.json`) — custom rules + rate limiting via API
2. **Worker** (`../workers/lvl-factory-proxy`) — in-proxy rate limit, body/method checks, signature gate
3. **Origin** (`src/lib/merch/webhook-waf.server.ts`) — defense in depth on Vercel

## Apply zone rules

```bash
export CLOUDFLARE_API_TOKEN=...   # Zone.Firewall + Zone.Rate Limits
export CLOUDFLARE_ZONE_ID=...     # lvlltd.com
node scripts/apply-cloudflare-waf.mjs

# After Printify secret is live:
ENABLE_SIGNATURE_RULE=1 node scripts/apply-cloudflare-waf.mjs
```

## Deploy worker

```bash
npx wrangler deploy -c cloudflare/workers/lvl-factory-proxy/wrangler.toml
npx wrangler secret put WEBHOOK_GATE_TOKEN -c cloudflare/workers/lvl-factory-proxy/wrangler.toml
```

Do **not** enable bot managed challenge on webhook **POST** — Printify cannot solve challenges.
