import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { VisualHero } from "@/components/brand/visual-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePulseStore } from "@/lib/edge/pulse";
import {
  STUDIO_PRESETS,
  useStudioStore,
} from "@/lib/edge/studio";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Design studio — LVL Imagine | lvlltd.com" },
      {
        name: "description",
        content:
          "Compose Grok Imagine briefs for merch, queue to pipeline, export print-safe JSON.",
      },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const drafts = useStudioStore((s) => s.drafts);
  const save = useStudioStore((s) => s.save);
  const queue = useStudioStore((s) => s.queue);
  const remove = useStudioStore((s) => s.remove);
  const exportJson = useStudioStore((s) => s.exportJson);
  const push = usePulseStore((s) => s.push);

  const [title, setTitle] = useState("Orbit Mark");
  const [concept, setConcept] = useState(
    "LVL orbit glyph for agent commerce stickers and chest prints.",
  );
  const [prompt, setPrompt] = useState(STUDIO_PRESETS[0]!.imaginePrompt);
  const [negative, setNegative] = useState(STUDIO_PRESETS[0]!.negativePrompt);
  const [style, setStyle] = useState(STUDIO_PRESETS[0]!.style);
  const [aspect, setAspect] = useState(STUDIO_PRESETS[0]!.aspectRatio);

  const preview = useMemo(
    () => ({
      title,
      concept,
      imaginePrompt: prompt,
      negativePrompt: negative,
      style,
      palette: ["#09090b", "#fafafa", "#71717a"],
      aspectRatio: aspect,
      printSafeNotes: "Center plate; 0.25in seam margin.",
      tags: ["studio", "imagine", "lvl"],
    }),
    [title, concept, prompt, negative, style, aspect],
  );

  function applyPreset(i: number) {
    const p = STUDIO_PRESETS[i];
    if (!p) return;
    setTitle(p.title);
    setConcept(p.concept);
    setPrompt(p.imaginePrompt);
    setNegative(p.negativePrompt);
    setStyle(p.style);
    setAspect(p.aspectRatio);
  }

  function onSave(andQueue: boolean) {
    const d = save(preview);
    if (andQueue) {
      queue(d.id);
      push({
        kind: "studio",
        host: "studio.lvlltd.com",
        message: `Queued Imagine brief · ${d.title}`,
        meta: d.id,
      });
      toast.success("Brief saved & queued for pipeline");
    } else {
      toast.success("Draft saved");
    }
  }

  async function onExport(id: string) {
    const json = exportJson(id);
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      toast.success("Brief JSON copied");
    } catch {
      toast.message("Export ready — clipboard blocked");
    }
  }

  return (
    <div className="space-y-8">
      <VisualHero
        image={BRAND_ART.softEraArt}
        compact
        eyebrow="studio.lvlltd.com · Imagine briefs"
        title="Design studio"
        description="Compose print-safe Imagine prompts, queue for the merch pipeline, export agent-readable JSON."
        actions={
          <>
            <Button asChild>
              <Link to="/pipeline">
                <Wand2 className="size-4" />
                Open pipeline
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/drops">Live drops</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STUDIO_PRESETS.map((p, i) => (
          <button
            key={p.title}
            type="button"
            onClick={() => applyPreset(i)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface hover:text-fg"
          >
            Preset · {p.title}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted" />
            <h2 className="text-sm font-semibold">Compose brief</h2>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Title</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Concept</span>
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              rows={2}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Imagine prompt</span>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Negative</span>
            <Input
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs text-muted">Style</span>
              <Input value={style} onChange={(e) => setStyle(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs text-muted">Aspect</span>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as "1:1" | "3:4" | "4:5" | "16:9")}
                className="flex h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm"
              >
                {["1:1", "4:5", "3:4", "16:9"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onSave(false)}>Save draft</Button>
            <Button variant="secondary" onClick={() => onSave(true)}>
              Save & queue
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">Your briefs</h2>
          {!drafts.length ? (
            <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
              No drafts yet — save a preset to start.
            </p>
          ) : (
            <ul className="space-y-3">
              {drafts.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-border bg-surface p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {d.concept}
                      </p>
                    </div>
                    <Badge
                      variant={
                        d.status === "queued"
                          ? "warning"
                          : d.status === "exported"
                            ? "success"
                            : "default"
                      }
                    >
                      {d.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        queue(d.id);
                        toast.success("Queued");
                      }}
                    >
                      Queue
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onExport(d.id)}
                    >
                      <Download className="size-3.5" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(d.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
