import { createFileRoute } from "@tanstack/react-router";
import { Boxes, FileCode2 } from "lucide-react";
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
import { useFactoryStore } from "@/lib/factory/store";
import { formatUsdc, cn } from "@/lib/utils";

export const Route = createFileRoute("/skills")({
  component: SkillFactoryPage,
});

function SkillFactoryPage() {
  const composeSkill = useFactoryStore((s) => s.composeSkill);
  const packages = useFactoryStore((s) => s.packages);
  const selectedId = useFactoryStore((s) => s.selectedId);
  const select = useFactoryStore((s) => s.select);
  const processingId = useFactoryStore((s) => s.processingId);

  const skillPacks = packages.filter((p) => p.kind === "skill");
  const selected =
    skillPacks.find((p) => p.id === selectedId) ?? skillPacks[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Boxes className="size-4" />
          Skill Factory · lvlltd.com
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Sealed x402 skill packs
        </h1>
        <p className="max-w-3xl text-sm text-muted">
          Compose first-party skill listings compatible with the live LVL
          market: free outline, sample.md, sealed file tree, and Base USDC
          price. Export JSON ready for catalog upload.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-3 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>
                LVL-native skills for music, marketplace, and real-world bridge
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
                      <p className="font-mono text-[11px] text-subtle">
                        {tpl.id}
                      </p>
                    </div>
                    <Badge variant="default">{formatUsdc(tpl.priceUsdc)}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted">
                    {tpl.summary}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Badge variant="info" className="capitalize">
                      {tpl.category}
                    </Badge>
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
        </div>

        <div className="space-y-3 xl:col-span-3">
          {selected ? (
            <PackDetail pack={selected} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <FileCode2 className="size-6 text-subtle" />
                <p className="text-sm font-medium">No skill pack selected</p>
                <p className="max-w-sm text-sm text-muted">
                  Compose from a template to generate outline, sample, and
                  sealed manifest for the lvlltd.com market.
                </p>
              </CardContent>
            </Card>
          )}

          {skillPacks.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill packs</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {skillPacks.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-ring",
                      selected?.id === p.id
                        ? "border-border-strong bg-surface-2"
                        : "border-border bg-surface hover:bg-surface-2",
                    )}
                  >
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-subtle">{p.skillId}</div>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
