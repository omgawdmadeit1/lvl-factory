# Live domain

| Host | Role |
|------|------|
| **https://factory.lvlltd.com** | Production custom domain (Cloudflare Worker proxy) |
| https://lvl-factory.vercel.app | Vercel origin |
| https://lvl-factory-proxy.josephlamartaylor.workers.dev | Worker direct |

## Architecture

```
browser → factory.lvlltd.com (Cloudflare)
        → Worker `lvl-factory-proxy`
        → https://lvl-factory.vercel.app (Nitro SSR)
```

## Ops

Re-provision / redeploy proxy (marketplace repo secrets):

```bash
gh workflow run "Provision Factory DNS" -R omgawdmadeit1/lvlltd-agent-marketplace -f subdomain=factory
```

Source: `workers/lvl-factory-proxy` in `lvlltd-agent-marketplace`.
