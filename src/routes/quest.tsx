import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  QUEST_CATALOG,
  useQuestStore,
  type QuestDef,
} from "@/lib/markets/quest";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/quest")({
  head: () => ({
    meta: [
      { title: "LVL Quest — mesh XP | quest.lvlltd.com" },
      {
        name: "description",
        content:
          "Commerce quests across drops, vault, signal, guild, forge, whisper, and arena — claim XP.",
      },
    ],
  }),
  component: QuestPage,
});

function QuestCard({ q }: { q: QuestDef }) {
  const progress = useQuestStore((s) => s.progress[q.id] ?? 0);
  const claimed = useQuestStore((s) => !!s.claimed[q.id]);
  const claim = useQuestStore((s) => s.claim);
  const advance = useQuestStore((s) => s.advance);
  const pct = Math.round((progress / q.target) * 100);
  const done = progress >= q.target;

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{q.badge}</Badge>
          <Badge variant={claimed ? "success" : done ? "warning" : "default"}>
            {claimed ? "claimed" : done ? "ready" : "open"}
          </Badge>
        </div>
        <CardTitle className="text-base tracking-tight">{q.title}</CardTitle>
        <CardDescription>{q.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-xs text-muted">
          <span>
            Progress{" "}
            <span className="tabular text-fg">
              {progress}/{q.target}
            </span>
          </span>
          <span className="tabular">+{q.xp} XP</span>
        </div>
        <Progress value={pct} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild>
            <a href={q.path}>Go</a>
          </Button>
          {!done && !claimed ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                advance(q.id, 1);
                toast.message("Progress +1 (demo check-in)");
              }}
            >
              Check in
            </Button>
          ) : null}
          {done && !claimed ? (
            <Button
              size="sm"
              onClick={() => {
                const xp = claim(q.id);
                toast[xp ? "success" : "error"](
                  xp ? `+${xp} XP claimed` : "Already claimed",
                );
              }}
            >
              <Trophy className="size-3.5" />
              Claim XP
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function QuestPage() {
  const xp = useQuestStore((s) => s.xp);
  const done = useQuestStore((s) => s.completedCount());

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.collectionTees}
        eyebrow="quest.lvlltd.com · mesh XP"
        title="Play the network. Bank the XP."
        description={
          <>
            Quests stitch Drops, Vault, Signal, Guild, Forge, Whisper, Arena,
            and Syndicate into one progress layer — claim XP when you finish.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/arena">Arena</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
          <p className="text-[11px] uppercase tracking-wider text-subtle">
            Total XP
          </p>
          <p className="text-xl font-semibold tabular">{xp}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
          <p className="text-[11px] uppercase tracking-wider text-subtle">
            Quests claimed
          </p>
          <p className="text-xl font-semibold tabular">
            {done}/{QUEST_CATALOG.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {QUEST_CATALOG.map((q) => (
          <QuestCard key={q.id} q={q} />
        ))}
      </div>
    </div>
  );
}
