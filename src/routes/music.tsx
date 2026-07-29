import { createFileRoute } from "@tanstack/react-router";
import { Disc3 } from "lucide-react";
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
import { MUSIC_CATALOG } from "@/lib/factory/catalog";
import { LVL_PAYMENT } from "@/lib/factory/payment";
import { useFactoryStore } from "@/lib/factory/store";
import { formatUsdc, cn } from "@/lib/utils";

export const Route = createFileRoute("/music")({
  component: MusicPage,
});

function MusicPage() {
  const packages = useFactoryStore((s) => s.packages);
  const selectedId = useFactoryStore((s) => s.selectedId);
  const select = useFactoryStore((s) => s.select);
  const composeMusic = useFactoryStore((s) => s.composeMusic);
  const processingId = useFactoryStore((s) => s.processingId);

  const musicPacks = packages.filter((p) => p.kind === "music");
  const selected = musicPacks.find((p) => p.id === selectedId) ?? musicPacks[0];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Disc3 className="size-4" />
          Music packs · music.lvlltd.com
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Compose music release kits
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Free stream stays on music.lvlltd.com. Optional download is{" "}
          <span className="text-fg">0.05 USDC face</span> via multi-rail crypto
          (buyer picks mainnet) or Stripe card. Default agent rail remains Base
          USDC x402 under the lvlltd.com domain family.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Source tracks</CardTitle>
            <CardDescription>
              Download price locked · {LVL_PAYMENT.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {MUSIC_CATALOG.map((track) => (
              <div
                key={track.id}
                className="rounded-xl border border-border bg-surface-2/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{track.title}</p>
                    <p className="text-xs text-muted">
                      {track.genre} · {track.bpm} BPM · {track.key}
                    </p>
                  </div>
                  <Badge variant="default">0.05 USDC</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      track.flagRisk === "high"
                        ? "danger"
                        : track.flagRisk === "medium"
                          ? "warning"
                          : "info"
                    }
                  >
                    flag {track.flagRisk}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => composeMusic(track.id)}
                    disabled={processingId !== null}
                  >
                    Compose kit
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
                {musicPacks.length} music packs · multi-rail + Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {musicPacks.length === 0 ? (
                <p className="text-sm text-muted">Compose a track kit to start.</p>
              ) : (
                musicPacks.map((p) => (
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
                      {p.status} ·{" "}
                      {formatUsdc(p.metadata.downloadPriceUsdc)} · Base
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
