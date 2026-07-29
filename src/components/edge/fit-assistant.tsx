import { useEffect, useMemo, useState } from "react";
import { Ruler } from "lucide-react";
import { useFitMemoryStore } from "@/lib/edge/fit-memory";
import { cn } from "@/lib/utils";

const HEIGHTS = ["5'2\"", "5'4\"", "5'6\"", "5'8\"", "5'10\"", "6'0\"", "6'2\""];
const FITS = [
  { id: "slim", label: "Slim" },
  { id: "regular", label: "Regular" },
  { id: "relaxed", label: "Relaxed" },
] as const;

/** Lightweight size recommender for apparel PDPs */
export function FitAssistant({
  onRecommend,
}: {
  onRecommend?: (size: string) => void;
}) {
  const memHeight = useFitMemoryStore((s) => s.height);
  const memFit = useFitMemoryStore((s) => s.fit);
  const memBand = useFitMemoryStore((s) => s.weightBand);
  const setPrefs = useFitMemoryStore((s) => s.setPrefs);
  const rememberSize = useFitMemoryStore((s) => s.rememberSize);

  const [height, setHeight] = useState(memHeight);
  const [fit, setFit] = useState<(typeof FITS)[number]["id"]>(memFit);
  const [weightBand, setWeightBand] = useState<"light" | "mid" | "solid">(
    memBand,
  );

  useEffect(() => {
    setHeight(memHeight);
    setFit(memFit);
    setWeightBand(memBand);
  }, [memHeight, memFit, memBand]);

  const size = useMemo(() => {
    const hIdx = HEIGHTS.indexOf(height);
    let base = 2; // M
    if (hIdx <= 1) base = 0; // S
    else if (hIdx <= 3) base = 1; // M-ish → S/M
    else if (hIdx <= 4) base = 2;
    else if (hIdx <= 5) base = 3;
    else base = 4;

    if (fit === "slim") base = Math.max(0, base - 1);
    if (fit === "relaxed") base = Math.min(4, base + 1);
    if (weightBand === "solid") base = Math.min(4, base + 1);

    return (["S", "M", "L", "XL", "XXL"] as const)[base];
  }, [height, fit, weightBand]);

  function persist(
    next: Partial<{
      height: string;
      fit: (typeof FITS)[number]["id"];
      weightBand: "light" | "mid" | "solid";
    }>,
  ) {
    setPrefs(next);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface-2">
          <Ruler className="size-3.5 text-muted" />
        </div>
        <div>
          <p className="text-sm font-medium">Fit assistant</p>
          <p className="text-xs text-muted">
            Saved on this device · not medical sizing
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">Height</span>
          <select
            value={height}
            onChange={(e) => {
              setHeight(e.target.value);
              persist({ height: e.target.value });
            }}
            className="flex h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg"
          >
            {HEIGHTS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1.5">
          <span className="text-xs text-muted">Preferred fit</span>
          <div className="flex flex-wrap gap-2">
            {FITS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFit(f.id);
                  persist({ fit: f.id });
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  fit === f.id
                    ? "border-border-strong bg-surface-2 text-fg"
                    : "border-border text-muted hover:bg-surface-2",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-muted">Build</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["light", "Light"],
                ["mid", "Mid"],
                ["solid", "Solid"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setWeightBand(id);
                  persist({ weightBand: id });
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  weightBand === id
                    ? "border-border-strong bg-surface-2 text-fg"
                    : "border-border text-muted hover:bg-surface-2",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-3">
        <div>
          <p className="text-xs text-muted">Suggested size</p>
          <p className="text-lg font-semibold tabular tracking-tight">{size}</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-surface-3"
          onClick={() => {
            rememberSize(size);
            onRecommend?.(size);
          }}
        >
          Use {size}
        </button>
      </div>
    </div>
  );
}
