import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PackDetail } from "@/components/factory/pack-detail";
import { SKILL_TEMPLATES } from "@/lib/factory/catalog";
import { LVL_PAYMENT } from "@/lib/factory/payment";
import { useFactoryStore } from "@/lib/factory/store";
import { formatUsdc, cn } from "@/lib/utils";

export const Route = createFileRoute("/skills")({
  component: SkillsPage,
});

function SkillsPage() {
  const packages = useFactoryStore((s) => s.packages);
  const selectedId = useFactoryStore((s) => s.selectedId);
  const select = useFactoryStore((s) => s.select);
  const composeSkill = useFactoryStore((s) => s.composeSkill);
  const processingId = useFactoryStore((s) => s.processingId);

  const skillPacks = packages.filter((p) => p.kind === "skill");
  const selected = skillPacks.find((p) => p.id === selectedId) ?? skillPacks[0];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Boxes className="size-4" />
          Skill packs · {LVL_PAYMENT.label}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Compose skill packages
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Every listing export locks settlement to USDC on Base (chain{" "}
          {LVL_PAYMENT.chainId}). Prices are USDC face amounts — never ETH,
          never Ethereum mainnet.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Flagship + canary · priced in USDC on Base
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SKILL_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl border border-border bg-surface-2/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{tpl.title}</p>
                    <p className="font-mono text-[11px] text-subtle">{tpl.id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="default">{formatUsdc(tpl.priceUsdc)}</Badge>
                    <span className="text-[10px] text-subtle">Base</span>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted">
                  {tpl.summary}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="info" className="capitalize">
                      {tpl.category}
                    </Badge>
                    {tpl.canary ? (
                      <Badge variant="warning">Canary</Badge>
                    ) : null}
                    <Badge variant="default">
                      {tpl.paymentRails === "both" ? "x402+fiat" : "x402"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => composeSkill(tpl.id)}
                    disabled={processingId !== null}
                  >
                    Compose
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Queue</CardTitle>
              <CardDescription>
                {skillPacks.length} skill packs in factory
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {skillPacks.length === 0 ? (
                <p className="text-sm text-muted">
                  Compose a template to start a pack.
                </p>
              ) : (
                skillPacks.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                      selected?.id === p.id
                        ? "border-fg/40 bg-surface-2"
                        : "border-border bg-surface hover:bg-surface-2",
                    )}
                  >
                    <p className="font-medium">{p.title}</p>
                    <p className="text-subtle">
                      {p.status} · {formatUsdc(p.priceUsdc)} · Base
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
          {selected ? <PackDetail pack={selected} /> : null}
        </div>
      </div>
    </div>
  );
}
