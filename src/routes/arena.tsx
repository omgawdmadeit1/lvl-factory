import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useVisibleInterval } from "@/lib/ops/use-visible-interval";
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
  ARENA_RACES,
  useArenaStore,
  type ArenaRace,
} from "@/lib/markets/arena";
import { BRAND_ART } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/arena")({
  head: () => ({
    meta: [
      { title: "LVL Arena — drop races | arena.lvlltd.com" },
      {
        name: "description",
        content:
          "Competitive drop claim races with live leaderboards, streaks, and heat meters on the LVL network.",
      },
    ],
  }),
  component: ArenaPage,
});

function RaceCard({ race }: { race: ArenaRace }) {
  const claim = useArenaStore((s) => s.claim);
  const used = useArenaStore((s) => s.raceClaims[race.id] ?? 0);
  const pct = Math.round((used / race.maxClaims) * 100);

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">{race.badge}</Badge>
          <Badge variant="info">heat {race.heat}</Badge>
        </div>
        <CardTitle className="text-base tracking-tight">{race.title}</CardTitle>
        <CardDescription>{race.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-subtle">
              Points / claim
            </p>
            <p className="text-xl font-semibold tabular">{race.points}</p>
          </div>
          <p className="text-muted">
            <span className="tabular text-fg">{used}</span> / {race.maxClaims}{" "}
            claimed
          </p>
        </div>
        <Progress value={pct} />
        <Button
          size="sm"
          className="w-full"
          disabled={used >= race.maxClaims}
          onClick={() => {
            const r = claim(race.id);
            toast[r.ok ? "success" : "error"](r.message);
          }}
        >
          <Flame className="size-3.5" />
          Claim race unit
        </Button>
        <Button size="sm" variant="secondary" className="w-full" asChild>
          <Link to="/drops">Open live drops</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ArenaPage() {
  const tickBots = useArenaStore((s) => s.tickBots);
  const leaderboard = useArenaStore((s) => s.leaderboard);
  const youScore = useArenaStore((s) => s.youScore);
  const youStreak = useArenaStore((s) => s.youStreak);
  const youClaims = useArenaStore((s) => s.youClaims);
  const [board, setBoard] = useState(() => leaderboard());

  useVisibleInterval(() => {
    tickBots();
    setBoard(leaderboard());
  }, 3000);
  useEffect(() => {
    setBoard(leaderboard());
  }, [leaderboard]);

  // refresh board after your score changes
  useEffect(() => {
    setBoard(leaderboard());
  }, [youScore, youClaims, youStreak, leaderboard]);

  const rank = board.findIndex((p) => p.you) + 1;

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.collectionTees}
        eyebrow="arena.lvlltd.com · drop races"
        title="Claim. Streak. Climb the board."
        description={
          <>
            Competitive drop races with heat meters and streak multipliers.
            Gamified commerce for the LVL mesh — pairs with live drops and
            Syndicate crews.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/drops">
                <Flame className="size-4" />
                Live drops
              </Link>
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

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Your score", value: String(youScore) },
          { label: "Streak", value: String(youStreak) },
          { label: "Rank", value: rank > 0 ? `#${rank}` : "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft"
          >
            <p className="text-[11px] uppercase tracking-wider text-subtle">
              {s.label}
            </p>
            <p className="text-xl font-semibold tabular tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-3">
          <h2 className="text-lg font-semibold tracking-tight">Active races</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ARENA_RACES.map((r) => (
              <RaceCard key={r.id} race={r} />
            ))}
          </div>
        </section>

        <section className="space-y-3 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Trophy className="size-4 text-warning" />
            Leaderboard
          </h2>
          <Card className="border-border bg-surface shadow-soft">
            <CardContent className="space-y-1 p-3">
              {board.slice(0, 10).map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs",
                    p.you
                      ? "border border-success/30 bg-success/10 text-fg"
                      : "bg-surface-2 text-muted",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 font-mono tabular text-subtle">
                      {i + 1}
                    </span>
                    <span className={p.you ? "font-semibold" : ""}>
                      {p.name}
                    </span>
                  </span>
                  <span className="tabular text-fg">{p.score}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border bg-surface shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">How scoring works</CardTitle>
              <CardDescription className="text-xs">
                Base race points × streak multiplier (up to 2×). Bots compete
                live.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </div>
    </div>
  );
}
