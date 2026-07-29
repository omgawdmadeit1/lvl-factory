import { createFileRoute } from "@tanstack/react-router";
import { Filter, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackDetail } from "@/components/factory/pack-detail";
import { StatusBadge } from "@/components/factory/status-badge";
import { useFactoryStore } from "@/lib/factory/store";
import type { PackKind, PackStatus } from "@/lib/factory/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  component: QueuePage,
});

function QueuePage() {
  const packages = useFactoryStore((s) => s.packages);
  const selectedId = useFactoryStore((s) => s.selectedId);
  const select = useFactoryStore((s) => s.select);
  const [kind, setKind] = useState<"all" | PackKind>("all");
  const [status, setStatus] = useState<"all" | PackStatus>("all");

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      if (kind !== "all" && p.kind !== kind) return false;
      if (status !== "all" && p.status !== status) return false;
      return true;
    });
  }, [packages, kind, status]);

  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <ListChecks className="size-4" />
          Review queue
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Approve before publish
        </h1>
        <p className="max-w-3xl text-sm text-muted">
          Human-in-the-loop gate for every pack. Export downloads JSON / text
          ready for lvlltd.com and music.lvlltd.com — you stay the final
          approval authority.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="size-4" />
              Filters
            </CardTitle>
            <CardDescription>
              {filtered.length} pack{filtered.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as "all" | PackKind)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="skill">Skill</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "all" | PackStatus)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKind("all");
                setStatus("all");
              }}
            >
              Reset
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
                <p className="text-sm font-medium">Queue is empty</p>
                <p className="mt-1 text-sm text-muted">
                  Compose music or skill packs to populate review.
                </p>
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors focus-ring",
                    selected?.id === p.id
                      ? "border-border-strong bg-surface-2"
                      : "border-border bg-surface hover:bg-surface-2/60",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.kind === "music" ? p.title : p.title}
                    </p>
                    <p className="text-xs text-subtle">
                      {p.kind} · {new Date(p.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {selected ? (
            <PackDetail pack={selected} />
          ) : (
            <Card>
              <CardContent className="px-6 py-16 text-center text-sm text-muted">
                Select a pack to review, approve, publish, or export.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
