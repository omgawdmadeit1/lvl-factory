import { createFileRoute, Link } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";
import { useEffect } from "react";
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
  GUILD_CATALOG,
  useGuildStore,
  type GuildCrew,
} from "@/lib/markets/guild";
import { pingQuest } from "@/lib/markets/quest";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/guild")({
  head: () => ({
    meta: [
      { title: "LVL Guild — creator collectives | guild.lvlltd.com" },
      {
        name: "description",
        content:
          "Join creator guilds with shared revenue pools — art, ops, agents, music, city marks.",
      },
    ],
  }),
  component: GuildPage,
});

function GuildCard({ crew }: { crew: GuildCrew }) {
  const joined = useGuildStore((s) => !!s.joined[crew.id]);
  const earned = useGuildStore((s) => s.earnedUsdc[crew.id] ?? 0);
  const join = useGuildStore((s) => s.join);
  const leave = useGuildStore((s) => s.leave);
  const fill = Math.round((crew.members / crew.maxMembers) * 100);

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{crew.badge}</Badge>
          <Badge variant="default">{crew.focus}</Badge>
        </div>
        <CardTitle className="text-base tracking-tight">{crew.name}</CardTitle>
        <CardDescription>{crew.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Pool
            </p>
            <p className="font-semibold tabular">${crew.poolUsdc}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Your share
            </p>
            <p className="font-semibold tabular">
              {(crew.joinShareBps / 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Seats
            </p>
            <p className="font-semibold tabular">
              {crew.members}/{crew.maxMembers}
            </p>
          </div>
        </div>
        <Progress value={fill} />
        {joined ? (
          <p className="text-xs text-muted">
            Accruing{" "}
            <span className="tabular text-fg">${earned.toFixed(3)}</span> from
            pool
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {joined ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                leave(crew.id);
                toast.message("Left guild");
              }}
            >
              Leave
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                const ok = join(crew.id);
                if (ok) pingQuest("q-join-guild");
                toast[ok ? "success" : "error"](
                  ok ? `Joined ${crew.name}` : "Cannot join",
                );
              }}
            >
              <UsersRound className="size-3.5" />
              Join guild
            </Button>
          )}
          <Button size="sm" variant="secondary" asChild>
            <Link to="/vault">Vault rights</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GuildPage() {
  const tick = useGuildStore((s) => s.tickYield);
  const crews = useGuildStore((s) => s.crewCount());
  const earned = useGuildStore((s) => s.totalEarned());

  useEffect(() => {
    const t = window.setInterval(() => tick(), 2500);
    return () => window.clearInterval(t);
  }, [tick]);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.collectionArt}
        eyebrow="guild.lvlltd.com · collectives"
        title="Create together. Split the pool."
        description={
          <>
            Guilds pool royalties and drop revenue across designers, agents, and
            music circles — join a crew and watch your share accrue.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/vault">IP Vault</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/syndicate">Syndicate</Link>
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
            Guilds joined
          </p>
          <p className="text-xl font-semibold tabular">{crews}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
          <p className="text-[11px] uppercase tracking-wider text-subtle">
            Accrued (demo)
          </p>
          <p className="text-xl font-semibold tabular">${earned.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {GUILD_CATALOG.map((g) => (
          <GuildCard key={g.id} crew={g} />
        ))}
      </div>
    </div>
  );
}
