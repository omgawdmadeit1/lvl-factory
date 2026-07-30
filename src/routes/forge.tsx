import { createFileRoute, Link } from "@tanstack/react-router";
import { Hammer, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { VisualHero } from "@/components/brand/visual-hero";
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
  FORGE_CHANNELS,
  FORGE_STYLES,
  useForgeStore,
  type ForgeChannel,
  type ForgeStyle,
} from "@/lib/markets/forge";
import { pingQuest } from "@/lib/markets/quest";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/forge")({
  head: () => ({
    meta: [
      { title: "LVL Forge — prompt to product | forge.lvlltd.com" },
      {
        name: "description",
        content:
          "Forge product drafts from a prompt — style, channel, score, ready for Launch or Printify.",
      },
    ],
  }),
  component: ForgePage,
});

function ForgePage() {
  const forge = useForgeStore((s) => s.forge);
  const drafts = useForgeStore((s) => s.drafts);
  const remove = useForgeStore((s) => s.remove);
  const hot = useForgeStore((s) => s.promoteCount());
  const [prompt, setPrompt] = useState("midnight city operator mark");
  const [channel, setChannel] = useState<ForgeChannel>("tee");
  const [style, setStyle] = useState<ForgeStyle>("night_ops");

  function onForge() {
    const d = forge(prompt, channel, style);
    if (!d) {
      toast.error("Prompt too short");
      return;
    }
    pingQuest("q-forge-draft");
    toast.success(`Forged · ${d.title} · score ${d.score}`);
  }

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroFactory}
        eyebrow="forge.lvlltd.com · product forge"
        title="Prompt it. Forge it. Ship it."
        description={
          <>
            Turn a one-line idea into a scored product draft — channel, style,
            price seed — then push to Launch, Studio, or Printify.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/launch">
                <Sparkles className="size-4" />
                Launch pad
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/studio">Studio</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Drafts", value: String(drafts.length) },
          { label: "Hot (≥80)", value: String(hot) },
          { label: "Channel", value: channel },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft"
          >
            <p className="text-[11px] uppercase tracking-wider text-subtle">
              {s.label}
            </p>
            <p className="truncate text-xl font-semibold tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <Card className="border-border bg-surface shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Forge console</CardTitle>
          <CardDescription>
            Demo generator · drafts stay in this browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider text-subtle">
              Prompt
            </span>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg outline-none focus:border-fg/30"
              placeholder="Describe the drop…"
              maxLength={160}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-subtle">
                Channel
              </span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ForgeChannel)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg"
              >
                {FORGE_CHANNELS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} · from ${c.base}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-subtle">
                Style
              </span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as ForgeStyle)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg"
              >
                {FORGE_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.blurb}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button onClick={onForge} className="w-full sm:w-auto">
            <Hammer className="size-4" />
            Forge draft
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Draft rack</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted">No drafts yet — forge one above.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {drafts.map((d) => (
              <Card key={d.id} className="border-border bg-surface shadow-soft">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{d.channel}</Badge>
                    <Badge variant="default">{d.style.replace("_", " ")}</Badge>
                    <Badge variant={d.score >= 80 ? "warning" : "default"}>
                      score {d.score}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {d.prompt}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm tabular text-fg">${d.priceUsdc}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/launch">Push Launch</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        remove(d.id);
                        toast.message("Draft removed");
                      }}
                    >
                      Discard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
