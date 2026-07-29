import { createFileRoute } from "@tanstack/react-router";
import { Disc3, Play, ShieldAlert, ShieldCheck } from "lucide-react";
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
import { useFactoryStore } from "@/lib/factory/store";
import type { MusicTrack } from "@/lib/factory/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/music")({
  component: MusicFactoryPage,
});

function MusicFactoryPage() {
  const catalog = useFactoryStore((s) => s.catalog());
  const composeMusic = useFactoryStore((s) => s.composeMusic);
  const packages = useFactoryStore((s) => s.packages);
  const selectedId = useFactoryStore((s) => s.selectedId);
  const select = useFactoryStore((s) => s.select);
  const processingId = useFactoryStore((s) => s.processingId);

  const musicPacks = packages.filter((p) => p.kind === "music");
  const selected =
    musicPacks.find((p) => p.id === selectedId) ?? musicPacks[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Disc3 className="size-4" />
          Music Factory · music.lvlltd.com
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Catalog recovery + release kits
        </h1>
        <p className="max-w-3xl text-sm text-muted">
          Pick a track from the seeded catalog, run the local pipeline for
          alternative master profiles, visual packages, and platform release
          kits. Output stays on LVL rails — free stream + optional $0.05 USDC
          download.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-3 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Catalog</CardTitle>
              <CardDescription>
                Demo subset shaped like the live library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {catalog.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  busy={processingId !== null}
                  onCompose={() => {
                    composeMusic(track.id);
                  }}
                />
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
                <Play className="size-6 text-subtle" />
                <p className="text-sm font-medium">No music pack selected</p>
                <p className="max-w-sm text-sm text-muted">
                  Compose a release kit from any catalog track. The factory
                  will process stages locally and land a reviewable pack here.
                </p>
              </CardContent>
            </Card>
          )}

          {musicPacks.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Music packs</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {musicPacks.map((p) => (
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
                    <div className="text-xs text-subtle">{p.status}</div>
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

function TrackRow({
  track,
  onCompose,
  busy,
}: {
  track: MusicTrack;
  onCompose: () => void;
  busy: boolean;
}) {
  const RiskIcon = track.flagRisk === "low" ? ShieldCheck : ShieldAlert;
  const riskVariant =
    track.flagRisk === "low"
      ? "success"
      : track.flagRisk === "medium"
        ? "warning"
        : "danger";

  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{track.title}</p>
          <p className="text-xs text-subtle">
            {track.genre} · {track.duration} · {track.bpm} BPM · {track.key}
          </p>
        </div>
        <Badge variant={riskVariant} className="shrink-0 gap-1 capitalize">
          <RiskIcon className="size-3" />
          {track.flagRisk}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="line-clamp-1 text-xs text-muted">{track.artworkHint}</p>
        <Button size="sm" onClick={onCompose} disabled={busy}>
          Compose
        </Button>
      </div>
    </div>
  );
}
