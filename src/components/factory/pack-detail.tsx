import {
  Check,
  Download,
  Rocket,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/factory/status-badge";
import type { FactoryPackage } from "@/lib/factory/types";
import { useFactoryStore } from "@/lib/factory/store";
import { formatUsdc } from "@/lib/utils";

export function PackDetail({ pack }: { pack: FactoryPackage }) {
  const approve = useFactoryStore((s) => s.approve);
  const reject = useFactoryStore((s) => s.reject);
  const publish = useFactoryStore((s) => s.publish);
  const exportPack = useFactoryStore((s) => s.exportPack);
  const remove = useFactoryStore((s) => s.remove);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={pack.status} />
              <span className="text-xs uppercase tracking-wider text-subtle">
                {pack.kind === "music" ? "Music package" : "Skill package"}
              </span>
            </div>
            <CardTitle className="text-xl tracking-tight">
              {pack.kind === "music" ? pack.title : pack.title}
            </CardTitle>
            <CardDescription>
              {pack.kind === "music"
                ? `${pack.genre} · ${pack.bpm} BPM · ${pack.key}`
                : `${pack.category} · ${formatUsdc(pack.priceUsdc)} unlock`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportPack(pack.id)}
              disabled={pack.status === "processing"}
            >
              <Download className="size-4" />
              Export
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={() => approve(pack.id)}
              disabled={
                pack.status === "processing" ||
                pack.status === "published" ||
                pack.status === "rejected"
              }
            >
              <Check className="size-4" />
              Approve
            </Button>
            <Button
              size="sm"
              onClick={() => publish(pack.id)}
              disabled={
                pack.status === "processing" ||
                pack.status === "rejected" ||
                pack.status === "draft"
              }
            >
              <Rocket className="size-4" />
              Publish
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() =>
                reject(pack.id, "Rejected by operator — revise and recompose.")
              }
              disabled={pack.status === "processing"}
            >
              <X className="size-4" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove(pack.id)}
              aria-label="Remove pack"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        {pack.status === "processing" || pack.progress < 100 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>{pack.notes || "Working…"}</span>
              <span className="tabular">{pack.progress}%</span>
            </div>
            <Progress value={pack.progress} />
          </div>
        ) : pack.notes ? (
          <p className="text-sm text-muted">{pack.notes}</p>
        ) : null}
      </CardHeader>

      <Separator />

      <CardContent className="space-y-6 pt-5">
        {pack.kind === "music" ? <MusicBody pack={pack} /> : <SkillBody pack={pack} />}
      </CardContent>
    </Card>
  );
}

function MusicBody({ pack }: { pack: Extract<FactoryPackage, { kind: "music" }> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Alternative master">
        <KV label="File" value={pack.alternativeMaster.fileName} mono />
        <KV label="Loudness" value={`${pack.alternativeMaster.loudnessLufs} LUFS`} />
        <KV label="Stereo width" value={String(pack.alternativeMaster.stereoWidth)} />
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {pack.alternativeMaster.flagMitigation.map((n) => (
            <li key={n} className="flex gap-2">
              <span className="text-subtle">•</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Visual package">
        <p className="text-sm text-muted">{pack.visualPackage.coverPrompt}</p>
        <p className="mt-2 text-sm text-subtle">{pack.visualPackage.videoPrompt}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pack.visualPackage.aspectRatios.map((r) => (
            <span
              key={r}
              className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted"
            >
              {r}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Release kit" className="lg:col-span-2">
        <KV label="YouTube title" value={pack.releaseKit.youtubeTitle} />
        <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
          <p className="mb-1 text-xs font-medium text-subtle">YouTube description</p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-muted">
            {pack.releaseKit.youtubeDescription}
          </pre>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-subtle">Captions</p>
            <ul className="space-y-1 text-sm text-muted">
              {pack.releaseKit.captions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-subtle">Checklist</p>
            <ul className="space-y-1 text-sm text-muted">
              {pack.releaseKit.checklist.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="text-subtle">☐</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </div>
  );
}

function SkillBody({ pack }: { pack: Extract<FactoryPackage, { kind: "skill" }> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Outline">
        <p className="text-sm text-muted">{pack.outline.summary}</p>
        <p className="mt-3 text-xs font-medium text-subtle">Capabilities</p>
        <ul className="mt-1 space-y-1 text-sm text-muted">
          {pack.outline.capabilities.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-medium text-subtle">Constraints</p>
        <ul className="mt-1 space-y-1 text-sm text-muted">
          {pack.outline.constraints.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      </Section>

      <Section title="Marketplace">
        <KV label="Skill ID" value={pack.skillId} mono />
        <KV label="Price" value={formatUsdc(pack.priceUsdc)} />
        <KV label="x402 path" value={pack.marketplace.x402Path} mono />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pack.marketplace.tags.map((t) => (
            <span
              key={t}
              className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-subtle">Sealed files</p>
        <ul className="mt-1 space-y-1 font-mono text-xs text-muted">
          {pack.sealedManifest.files.map((f) => (
            <li key={f.path}>{f.path}</li>
          ))}
        </ul>
      </Section>

      <Section title="Free sample (sample.md)" className="lg:col-span-2">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs text-muted">
          {pack.sampleMd}
        </pre>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h4 className="mb-2 text-sm font-semibold tracking-tight">{title}</h4>
      {children}
    </div>
  );
}

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-1">
      <span className="text-xs text-subtle">{label}</span>
      <span className={mono ? "font-mono text-xs text-fg" : "text-sm text-fg"}>
        {value}
      </span>
    </div>
  );
}
