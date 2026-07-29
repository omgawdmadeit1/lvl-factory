import { Bot, Layers, Package, Timer } from "lucide-react";

const ITEMS = [
  {
    icon: Timer,
    title: "Live drops",
    body: "Timed flash inventory · claim → cart",
  },
  {
    icon: Layers,
    title: "Stack packs",
    body: "Curated multi-SKU bundles with discounts",
  },
  {
    icon: Bot,
    title: "Agent shopable",
    body: "lvl-merch-v1 · relay intents · multi-rail",
  },
  {
    icon: Package,
    title: "Credits + gift",
    body: "Loyalty ledger · gift checkout · price holds",
  },
] as const;

export function TrustStrip() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="flex gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2">
              <Icon className="size-4 text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted">{item.body}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
