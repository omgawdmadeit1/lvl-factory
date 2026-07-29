import { Bot, Package, Shield, Truck } from "lucide-react";

const ITEMS = [
  {
    icon: Truck,
    title: "Print-on-demand",
    body: "Ships via Printify partners worldwide",
  },
  {
    icon: Bot,
    title: "Agent shopable",
    body: "lvl-merch-v1 catalog + multi-rail settle",
  },
  {
    icon: Shield,
    title: "Edge protected",
    body: "Cloudflare DDoS + WAF on factory.lvlltd.com",
  },
  {
    icon: Package,
    title: "Live drops",
    body: "Synced from lvlxltd.printify.me inventory",
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
            className="flex gap-3 rounded-xl border border-border bg-surface p-4"
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
