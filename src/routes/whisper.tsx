import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Lock } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { pingQuest } from "@/lib/markets/quest";
import {
  WHISPER_DOORS,
  useWhisperStore,
  type WhisperDoor,
} from "@/lib/markets/whisper";
import { BRAND_ART } from "@/lib/store/images";

export const Route = createFileRoute("/whisper")({
  head: () => ({
    meta: [
      { title: "LVL Whisper — private doors | whisper.lvlltd.com" },
      {
        name: "description",
        content:
          "Invite codes unlock private drops, agent seats, and atelier inventory on the LVL mesh.",
      },
    ],
  }),
  component: WhisperPage,
});

function DoorCard({ door }: { door: WhisperDoor }) {
  const open = useWhisperStore((s) => s.isOpen(door.id));
  const pct = Math.round((door.taken / door.seats) * 100);

  return (
    <Card className="border-border bg-surface shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="warning">{door.badge}</Badge>
          <Badge variant={open ? "success" : "default"}>
            {open ? "unlocked" : "locked"}
          </Badge>
        </div>
        <CardTitle className="text-base tracking-tight">{door.title}</CardTitle>
        <CardDescription>{door.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted">
          Unlocks: <span className="text-fg">{door.unlocks}</span>
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-subtle">
            <span>
              Seats {door.taken}/{door.seats}
            </span>
            <span>heat {door.heat}</span>
          </div>
          <Progress value={pct} />
        </div>
        {open ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/drops">Claim drop</Link>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link to="/arena">Arena boost</Link>
            </Button>
          </div>
        ) : (
          <p className="text-[11px] font-mono text-subtle">
            Hint code shape: {door.code.slice(0, 3)}****
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function WhisperPage() {
  const unlock = useWhisperStore((s) => s.unlock);
  const unlocked = useWhisperStore((s) => s.unlocked);
  const attempts = useWhisperStore((s) => s.attempts);
  const [code, setCode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = unlock(code);
    if (r.ok && r.message.startsWith("Unlocked")) {
      pingQuest("q-whisper");
    }
    toast[r.ok ? "success" : "error"](r.message);
    if (r.ok) setCode("");
  }

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.heroNetwork}
        eyebrow="whisper.lvlltd.com · private doors"
        title="Codes open rooms money can't."
        description={
          <>
            Whisper doors gate flash colorways, atelier prints, and agent
            backstage seats. Enter a code — or try demo hints on each card.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/drops">
                <Lock className="size-4" />
                Live drops
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/launch">Launch</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/labs">Labs</Link>
            </Button>
          </>
        }
      />

      <Card className="border-border bg-surface shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Enter whisper code</CardTitle>
          <CardDescription>
            Demo codes: MIDNIGHT · SOFTERA · A2ARAIL · NIGHTOPS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm tracking-widest text-fg outline-none focus:border-fg/30"
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="submit">
              <KeyRound className="size-4" />
              Unlock
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted">
            Unlocked {unlocked.length} · attempts {attempts}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {WHISPER_DOORS.map((d) => (
          <DoorCard key={d.id} door={d} />
        ))}
      </div>
    </div>
  );
}
