import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  Copy,
  Download,
  Loader2,
  Play,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AGENT_PROTOCOL_README,
  buildAgentCatalog,
} from "@/lib/merch/agent-commerce";
import { useMerchStore } from "@/lib/merch/store";
import { formatUsd } from "@/lib/utils";

export const Route = createFileRoute("/agent/merch")({
  component: AgentMerchPage,
});

type StatusResp = {
  ok: boolean;
  printify?: { credentials_ready?: boolean; fulfill_mode?: string };
  catalog?: { published_skus?: number };
  endpoints?: Record<string, string>;
};

function AgentMerchPage() {
  const products = useMerchStore((s) => s.products);
  const exportAgentCatalog = useMerchStore((s) => s.exportAgentCatalog);
  const catalog = useMemo(() => buildAgentCatalog(products), [products]);
  const [showRaw, setShowRaw] = useState(false);
  const json = useMemo(() => JSON.stringify(catalog, null, 2), [catalog]);

  const [status, setStatus] = useState<StatusResp | null>(null);
  const [sku, setSku] = useState(
    catalog.products[0]?.sku ?? "LVL-TEE-MAIN-CHARACTER",
  );
  const [size, setSize] = useState("L");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [lastOrder, setLastOrder] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/agent/status")
      .then((r) => r.json())
      .then((d: StatusResp) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      toast.success("Agent catalog copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  function pushLog(line: string) {
    setLog((prev) => [...prev.slice(-40), line]);
  }

  async function runLiveLoop() {
    setBusy(true);
    setLog([]);
    setLastOrder(null);
    try {
      pushLog(`→ POST /api/agent/quote ${sku}`);
      const qRes = await fetch("/api/agent/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku, quantity: 1, size, country: "US" }),
      });
      const q = (await qRes.json()) as {
        ok?: boolean;
        quote?: { total_usd?: number; agent_fee_usd?: number };
        error?: string;
      };
      if (!q.ok) throw new Error(q.error || "quote failed");
      pushLog(
        `✓ quote total $${q.quote?.total_usd} (fee $${q.quote?.agent_fee_usd})`,
      );

      pushLog("→ POST /api/agent/orders");
      const oRes = await fetch("/api/agent/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku,
          quantity: 1,
          size,
          buyer_ref: "agent-merch-console",
          ship_to: {
            first_name: "Agent",
            last_name: "Console",
            email: "agent-console@lvlltd.com",
            phone: "4045550100",
            country: "US",
            region: "GA",
            address1: "100 Peachtree St NE",
            city: "Atlanta",
            zip: "30303",
          },
        }),
      });
      const o = (await oRes.json()) as {
        ok?: boolean;
        order?: Record<string, unknown>;
        error?: string;
      };
      if (!o.ok || !o.order) throw new Error(o.error || "order failed");
      pushLog(`✓ order ${o.order.id} · ${o.order.status}`);

      const token = String(o.order.token || "");
      pushLog("→ POST .../pay { method: demo, token }");
      const pRes = await fetch(`/api/agent/orders/${o.order.id}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method: "demo",
          confirm: true,
          token,
        }),
      });
      const p = (await pRes.json()) as {
        ok?: boolean;
        order?: Record<string, unknown>;
        error?: string;
      };
      if (!p.ok || !p.order) throw new Error(p.error || "pay failed");
      pushLog(
        `✓ ${p.order.status} · fulfill=${p.order.fulfill_mode} · pfy=${p.order.printify_order_id}`,
      );
      setLastOrder(p.order);
      toast.success("Agent shopping loop complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pushLog(`✗ ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function runDesignBrief() {
    setBusy(true);
    try {
      const res = await fetch("/api/agent/design", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Agent Drop",
          concept: `Custom ${sku} graphic requested via agent console`,
          kind: "tee",
          blank_sku: sku,
        }),
      });
      const d = (await res.json()) as {
        ok?: boolean;
        design?: { id?: string; imagine_prompt?: string };
        error?: string;
      };
      if (!d.ok) throw new Error(d.error || "design failed");
      pushLog(`✓ design ${d.design?.id}`);
      pushLog(`  prompt: ${d.design?.imagine_prompt?.slice(0, 120)}…`);
      toast.success("Design brief sealed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "design failed");
    } finally {
      setBusy(false);
    }
  }

  const ready = status?.printify?.credentials_ready;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">lvl-agent-order-v1</Badge>
          <Badge variant="success">agents</Badge>
          <Badge variant={ready ? "success" : "default"}>
            {ready ? "printify live" : "printify simulated"}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Agent shopping console
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Any LLM can discover LVL, quote merch, create an order, and fulfill via
          Printify POD — cheaper than spinning up POD + design compute from
          scratch. Face price + $0.50 agent fee.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border bg-surface">
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase tracking-wide text-subtle">
              SKUs
            </p>
            <p className="text-2xl font-semibold tabular">
              {status?.catalog?.published_skus ?? catalog.products.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-surface">
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase tracking-wide text-subtle">
              Fulfill
            </p>
            <p className="text-sm font-medium">
              {status?.printify?.fulfill_mode ?? "…"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-surface">
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase tracking-wide text-subtle">
              Discovery
            </p>
            <p className="font-mono text-[11px] text-muted break-all">
              /llms.txt · /api/openapi.json
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="size-4" />
            Live loop (quote → order → pay)
          </CardTitle>
          <CardDescription>
            Runs against this origin with sandbox demo settlement. Include{" "}
            <code className="text-[11px]">order.token</code> on multi-instance
            hosts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-muted">
              SKU
              <select
                className="rounded-md border border-border bg-bg px-2 py-2 text-sm text-fg"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              >
                {catalog.products.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} · {formatUsd(p.price_usd)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-24 flex-col gap-1 text-xs text-muted">
              Size
              <select
                className="rounded-md border border-border bg-bg px-2 py-2 text-sm text-fg"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                {["S", "M", "L", "XL", "2XL"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runLiveLoop} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Run agent buy
            </Button>
            <Button
              variant="secondary"
              onClick={runDesignBrief}
              disabled={busy}
            >
              <Sparkles className="size-4" />
              Design brief
            </Button>
            <Button asChild variant="secondary">
              <Link to="/shop">Human shop</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/pipeline">Pipeline</Link>
            </Button>
          </div>
          {log.length ? (
            <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted whitespace-pre-wrap">
              {log.join("\n")}
            </pre>
          ) : null}
          {lastOrder ? (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
              <p className="font-medium">
                {String(lastOrder.status)} ·{" "}
                <span className="font-mono text-xs">
                  {String(lastOrder.printify_order_id)}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Total {formatUsd(Number(lastOrder.total_usd))} · mode{" "}
                {String(lastOrder.fulfill_mode)}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={copyJson}>
          <Copy className="size-4" />
          Copy catalog JSON
        </Button>
        <Button variant="secondary" onClick={() => exportAgentCatalog()}>
          <Download className="size-4" />
          Download catalog
        </Button>
        <Button asChild variant="secondary">
          <a href="/api/openapi.json" target="_blank" rel="noreferrer">
            OpenAPI
          </a>
        </Button>
        <Button asChild variant="secondary">
          <a href="/llms.txt" target="_blank" rel="noreferrer">
            llms.txt
          </a>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4" />
              Shopable SKUs ({catalog.products.length})
            </CardTitle>
            <CardDescription>
              Published products with settlement blocks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {catalog.products.map((p) => (
                <li
                  key={p.sku}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="font-mono text-[11px] text-subtle break-all">
                        {p.sku}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm tabular">
                      {formatUsd(p.price_usd)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 text-left font-mono text-[10px] text-accent break-all hover:underline"
                    onClick={() => setSku(p.sku)}
                  >
                    Use in console →
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4" />
              Protocol
            </CardTitle>
            <CardDescription>lvl-merch-v1 + lvl-agent-order-v1</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[28rem] overflow-auto rounded-lg border border-border bg-bg p-3 text-[11px] leading-relaxed text-muted whitespace-pre-wrap">
              {AGENT_PROTOCOL_README}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Raw catalog JSON</CardTitle>
            <CardDescription>
              {catalog.generated_at} · protocol {catalog.protocol}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowRaw((v) => !v)}
          >
            {showRaw ? "Hide" : "Show"}
          </Button>
        </CardHeader>
        {showRaw ? (
          <CardContent>
            <pre className="max-h-[32rem] overflow-auto rounded-lg border border-border bg-bg p-3 font-mono text-[10px] leading-relaxed text-muted break-all whitespace-pre-wrap">
              {json}
            </pre>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
