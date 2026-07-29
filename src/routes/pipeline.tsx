import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Download,
  ExternalLink,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  IMAGINE_SEED_BRIEFS,
  useMerchStore,
} from "@/lib/merch/store";
import { CLOUDFLARE_MAP, PRINTIFY_STORE, getPrintifyConfig } from "@/lib/merch/printify";
import type { ImagineBrief, MerchProductKind } from "@/lib/merch/types";
import { cn, formatUsd, slugify } from "@/lib/utils";

export const Route = createFileRoute("/pipeline")({
  component: PipelinePage,
});

const STAGES = [
  "brief",
  "imagine",
  "mockup",
  "printify_draft",
  "review",
  "published",
] as const;

function PipelinePage() {
  const products = useMerchStore((s) => s.products);
  const jobs = useMerchStore((s) => s.jobs);
  const runningJobId = useMerchStore((s) => s.runningJobId);
  const lastMessage = useMerchStore((s) => s.lastMessage);
  const selectedId = useMerchStore((s) => s.selectedId);
  const select = useMerchStore((s) => s.select);
  const runPipeline = useMerchStore((s) => s.runPipeline);
  const runSeedPipelines = useMerchStore((s) => s.runSeedPipelines);
  const approvePublish = useMerchStore((s) => s.approvePublish);
  const reject = useMerchStore((s) => s.reject);
  const exportPrintifyDraft = useMerchStore((s) => s.exportPrintifyDraft);
  const exportImagineJob = useMerchStore((s) => s.exportImagineJob);
  const exportAgentCatalog = useMerchStore((s) => s.exportAgentCatalog);
  const resetToLive = useMerchStore((s) => s.resetToLive);

  const cfg = getPrintifyConfig();
  const pipelineItems = useMemo(
    () => products.filter((p) => p.source === "pipeline"),
    [products],
  );
  const selected = products.find((p) => p.id === selectedId) ?? pipelineItems[0];

  const [kind, setKind] = useState<MerchProductKind>("tee");
  const [title, setTitle] = useState("LVL Night Shift");
  const [concept, setConcept] = useState(
    "Quiet night-ops mark for agents that ship after dark.",
  );
  const [prompt, setPrompt] = useState(
    "Minimal monochrome night-shift emblem for streetwear, crescent node over horizontal line, high contrast black ink, vector-clean, print-ready apparel graphic, no text, centered",
  );

  function runCustom() {
    const brief: ImagineBrief = {
      id: `brief-custom-${Date.now().toString(36)}`,
      title: title.trim() || "Untitled drop",
      concept: concept.trim(),
      imaginePrompt: prompt.trim(),
      negativePrompt:
        "blurry, watermark, neon purple, emoji, low-res, photoreal face",
      style: "agent merch graphic",
      palette: ["#09090b", "#f4f4f5", "#71717a"],
      aspectRatio: kind === "poster" ? "4:5" : "1:1",
      printSafeNotes: "300dpi equivalent; safe margin from seams/trim.",
      tags: ["custom", "pipeline", slugify(title).slice(0, 16)],
    };
    runPipeline(brief, kind);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">agent pipeline</Badge>
            <Badge variant="default">Grok Imagine → Printify</Badge>
            <Badge variant={cfg.hasToken ? "success" : "warning"}>
              {cfg.hasToken ? "API token set" : "demo mode (no API token)"}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Merch design pipeline
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Agents and operators turn Imagine briefs into Printify-ready product
            drafts, then publish onto the factory merch shelf (
            {CLOUDFLARE_MAP.merch}) and the agent catalog. Live POD store:{" "}
            <a
              className="text-fg underline-offset-2 hover:underline break-all"
              href={PRINTIFY_STORE.storefrontUrl}
              target="_blank"
              rel="noreferrer"
            >
              {PRINTIFY_STORE.storefrontUrl}
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => runSeedPipelines()}
            disabled={runningJobId !== null}
          >
            {runningJobId ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Run seed drops
          </Button>
          <Button variant="secondary" onClick={() => exportAgentCatalog()}>
            <Download className="size-4" />
            Export agent catalog
          </Button>
          <Button asChild variant="secondary">
            <Link to="/merch" search={{}}>Open shop</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/webhooks">Printify webhooks</Link>
          </Button>
        </div>
      </header>

      {lastMessage ? (
        <p className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
          {lastMessage}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-border bg-surface lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">New Imagine brief</CardTitle>
            <CardDescription>
              Compiles a Grok Imagine job + Printify create payload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Product kind</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as MerchProductKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tee">Tee</SelectItem>
                  <SelectItem value="hoodie">Hoodie</SelectItem>
                  <SelectItem value="poster">Poster / art</SelectItem>
                  <SelectItem value="sticker">Sticker</SelectItem>
                  <SelectItem value="canvas">Canvas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="concept">Concept</Label>
              <Textarea
                id="concept"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prompt">Grok Imagine prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="font-mono text-xs"
              />
            </div>
            <Button
              className="w-full"
              onClick={runCustom}
              disabled={runningJobId !== null}
            >
              <Sparkles className="size-4" />
              Run pipeline
            </Button>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted">Seed briefs</p>
              <ul className="space-y-2">
                {IMAGINE_SEED_BRIEFS.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-xs hover:border-border-strong"
                      onClick={() => {
                        setTitle(b.title);
                        setConcept(b.concept);
                        setPrompt(b.imaginePrompt);
                        setKind(
                          b.tags.includes("poster")
                            ? "poster"
                            : b.tags.includes("hoodie")
                              ? "hoodie"
                              : "tee",
                        );
                      }}
                    >
                      <span className="font-medium text-fg">{b.title}</span>
                      <span className="mt-0.5 block text-subtle line-clamp-2">
                        {b.concept}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card className="border-border bg-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stage map</CardTitle>
              <CardDescription>
                brief → imagine → mockup → printify_draft → review → published
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((stage) => {
                  const active = selected?.status === stage;
                  const done =
                    selected &&
                    STAGES.indexOf(selected.status as (typeof STAGES)[number]) >
                      STAGES.indexOf(stage);
                  return (
                    <span
                      key={stage}
                      className={cn(
                        "rounded-full border px-2.5 py-1 font-mono text-[11px]",
                        active
                          ? "border-info/40 bg-info/10 text-info"
                          : done
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-border text-subtle",
                      )}
                    >
                      {stage}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {pipelineItems.length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
                No pipeline products yet. Run a seed drop or custom brief.
              </p>
            ) : (
              pipelineItems.map((p) => (
                <Card
                  key={p.id}
                  className={cn(
                    "cursor-pointer border-border bg-surface transition-colors",
                    selected?.id === p.id && "border-border-strong",
                  )}
                  onClick={() => select(p.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm leading-snug">
                        {p.title}
                      </CardTitle>
                      <Badge
                        variant={
                          p.status === "published"
                            ? "success"
                            : p.status === "failed"
                              ? "danger"
                              : p.status === "review"
                                ? "warning"
                                : "info"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-[11px]">
                      {p.sku} · {p.kind} · {formatUsd(p.priceUsd)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={p.progress} className="h-1.5" />
                    <p className="text-xs text-muted line-clamp-2">{p.notes}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {selected && selected.source === "pipeline" ? (
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="text-base">{selected.title}</CardTitle>
                <CardDescription className="break-all font-mono text-xs">
                  {selected.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <p className="mb-1 text-xs font-medium text-muted">
                    Imagine prompt
                  </p>
                  <p className="text-xs leading-relaxed text-fg">
                    {selected.brief.imaginePrompt}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selected.status === "review" ||
                    selected.status === "printify_draft") && (
                    <Button onClick={() => approvePublish(selected.id)}>
                      <Check className="size-4" />
                      Publish to shop
                    </Button>
                  )}
                  {selected.status !== "published" &&
                    selected.status !== "failed" && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          reject(selected.id, "Rejected by operator")
                        }
                      >
                        <X className="size-4" />
                        Reject
                      </Button>
                    )}
                  <Button
                    variant="secondary"
                    onClick={() => exportImagineJob(selected.id)}
                  >
                    <Download className="size-4" />
                    Imagine job JSON
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => exportPrintifyDraft(selected.id)}
                  >
                    <Download className="size-4" />
                    Printify draft
                  </Button>
                  {selected.printifyUrl ? (
                    <Button asChild variant="secondary">
                      <a
                        href={selected.printifyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="size-4" />
                        Storefront
                      </a>
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-subtle">
                  With <code className="text-muted">PRINTIFY_API_TOKEN</code> +
                  shop id on the server, publish can POST drafts to Printify.
                  Demo mode keeps drafts local and links the live storefront for
                  fulfillment.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border bg-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                {jobs.slice(0, 12).map((j) => (
                  <li
                    key={j.id}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-mono text-muted">{j.id}</span>
                      <span className="text-subtle">{j.stage}</span>
                    </div>
                    <p className="mt-1 text-subtle line-clamp-1">
                      {j.logs[j.logs.length - 1]}
                    </p>
                  </li>
                ))}
                {jobs.length === 0 ? (
                  <li className="text-muted">No jobs yet</li>
                ) : null}
              </ul>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => resetToLive()}
              >
                <RotateCcw className="size-3.5" />
                Reset pipeline catalog
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
