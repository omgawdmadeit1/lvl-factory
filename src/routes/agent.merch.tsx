import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Copy, Download, Terminal } from "lucide-react";
import { useMemo, useState } from "react";
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

function AgentMerchPage() {
  const products = useMerchStore((s) => s.products);
  const exportAgentCatalog = useMerchStore((s) => s.exportAgentCatalog);
  const catalog = useMemo(() => buildAgentCatalog(products), [products]);
  const [showRaw, setShowRaw] = useState(true);
  const json = useMemo(() => JSON.stringify(catalog, null, 2), [catalog]);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      toast.success("Agent catalog copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">lvl-merch-v1</Badge>
          <Badge variant="success">agents</Badge>
          <Badge variant="default">multi-rail</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Agent merch catalog
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Machine-readable SKUs for shopping agents. Discover products, settle
          via multi-rail crypto on /pay, fulfill physicals through Printify.
          Domain: lvlltd.com · Cloudflare → factory · POD: lvlxltd.printify.me
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button onClick={copyJson}>
          <Copy className="size-4" />
          Copy JSON
        </Button>
        <Button variant="secondary" onClick={() => exportAgentCatalog()}>
          <Download className="size-4" />
          Download catalog
        </Button>
        <Button asChild variant="secondary">
          <Link to="/merch" search={{}}>Human shop</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/pipeline">Pipeline</Link>
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
                  <p className="mt-1 font-mono text-[10px] text-muted break-all">
                    {p.agent_buy}
                  </p>
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
            <CardDescription>lvl-merch-v1 readme</CardDescription>
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
