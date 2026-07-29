import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Check, Copy, Fingerprint, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { VisualHero } from "@/components/brand/visual-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePulseStore } from "@/lib/edge/pulse";
import { RELAY_PROTOCOL, useRelayStore } from "@/lib/edge/relay";
import { useMerchStore } from "@/lib/merch/store";
import { BRAND_ART } from "@/lib/store/images";
import { storeMoney } from "@/lib/store/collections";

export const Route = createFileRoute("/relay")({
  head: () => ({
    meta: [
      { title: "Agent relay — A2A commerce | lvlltd.com" },
      {
        name: "description",
        content:
          "Agent-to-agent commerce relay: discover SKUs, sign intents, hand off to multi-rail pay on the LVL network.",
      },
    ],
  }),
  component: RelayPage,
});

function RelayPage() {
  const products = useMerchStore((s) => s.products);
  const agentId = useRelayStore((s) => s.agentId);
  const setAgentId = useRelayStore((s) => s.setAgentId);
  const intents = useRelayStore((s) => s.intents);
  const createIntent = useRelayStore((s) => s.createIntent);
  const sign = useRelayStore((s) => s.sign);
  const handoff = useRelayStore((s) => s.handoff);
  const clear = useRelayStore((s) => s.clear);
  const push = usePulseStore((s) => s.push);

  const shopable = useMemo(
    () => products.filter((p) => p.status === "published" && p.agentShopable),
    [products],
  );
  const [sku, setSku] = useState(shopable[0]?.sku ?? "LVL-TEE-MAIN-CHARACTER");

  const selected = shopable.find((p) => p.sku === sku) ?? shopable[0];

  function onCreate() {
    if (!selected) {
      toast.error("No agent-shopable SKU");
      return;
    }
    const intent = createIntent({
      sku: selected.sku,
      productSlug: selected.slug,
      amountUsd: selected.priceUsd,
      chainHint: "base",
    });
    push({
      kind: "agent_buy",
      host: "agents.lvlltd.com",
      message: `Intent drafted · ${selected.sku}`,
      meta: intent.id,
    });
    toast.success("Intent created");
  }

  async function copyCard() {
    const body = JSON.stringify(
      {
        protocol: RELAY_PROTOCOL,
        agentId,
        catalog: "/api/store/catalog",
        card: "/api/agent/card",
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(body);
      toast.success("Agent card snippet copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  return (
    <div className="space-y-8">
      <VisualHero
        image={BRAND_ART.collectionAgent}
        compact
        eyebrow="relay · lvl-relay-v1"
        title="Agent commerce relay"
        description="Discover → intent → sign → multi-rail handoff. Demo signatures for the A2A loop; settle on Base by default."
        actions={
          <>
            <Button asChild>
              <Link to="/agent/merch">
                <Bot className="size-4" />
                Catalog UI
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <a href="/api/agent/card" target="_blank" rel="noreferrer">
                Agent card JSON
              </a>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-sm font-semibold">Create intent</h2>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Agent ID</span>
            <Input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="font-mono text-sm"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">SKU</span>
            <select
              value={selected?.sku ?? ""}
              onChange={(e) => setSku(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-surface-2 px-3 font-mono text-sm"
            >
              {shopable.map((p) => (
                <option key={p.id} value={p.sku}>
                  {p.sku} · {storeMoney(p.priceUsd)}
                </option>
              ))}
            </select>
          </label>
          {selected ? (
            <p className="text-xs text-muted">
              {selected.title} · chain hint Base · face{" "}
              {storeMoney(selected.priceUsd)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={onCreate}>
              <Zap className="size-4" />
              Draft intent
            </Button>
            <Button variant="secondary" onClick={copyCard}>
              <Copy className="size-4" />
              Copy protocol
            </Button>
          </div>

          <ol className="space-y-2 border-t border-border pt-4 text-xs text-muted">
            {RELAY_PROTOCOL.steps.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="font-mono text-subtle">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Intent ledger</h2>
            <Button size="sm" variant="ghost" onClick={() => clear()}>
              Clear
            </Button>
          </div>
          {!intents.length ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
              No intents yet
            </p>
          ) : (
            <ul className="space-y-3">
              {intents.map((intent) => (
                <li
                  key={intent.id}
                  className="rounded-xl border border-border bg-surface p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        intent.status === "handed_off"
                          ? "success"
                          : intent.status === "signed"
                            ? "info"
                            : "default"
                      }
                    >
                      {intent.status}
                    </Badge>
                    <span className="font-mono text-[11px] text-subtle">
                      {intent.id}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    {intent.sku} · {storeMoney(intent.amountUsd)} ·{" "}
                    {intent.chainHint}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    {intent.agentId}
                  </p>
                  {intent.sig ? (
                    <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-subtle">
                      <Fingerprint className="size-3" />
                      {intent.sig}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {intent.status === "draft" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          sign(intent.id);
                          toast.success("Intent signed (demo)");
                        }}
                      >
                        Sign
                      </Button>
                    ) : null}
                    {intent.status === "signed" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          const next = handoff(intent.id);
                          push({
                            kind: "agent_buy",
                            host: "pay.lvlltd.com",
                            message: `Handoff · ${intent.sku}`,
                            meta: intent.id,
                          });
                          toast.success("Handed off to multi-rail pay");
                          if (next?.payPath) {
                            // stay on page; user can click pay
                          }
                        }}
                      >
                        <Check className="size-3.5" />
                        Handoff to pay
                      </Button>
                    ) : null}
                    {intent.payPath ? (
                      <Button size="sm" variant="secondary" asChild>
                        <Link to={intent.payPath}>Open pay</Link>
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        to="/shop/$slug"
                        params={{ slug: intent.productSlug }}
                      >
                        PDP
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
