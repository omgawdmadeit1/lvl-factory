import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Shirt } from "lucide-react";
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
  MIRROR_FITS,
  fitTotal,
  useMirrorStore,
  type MirrorFit,
} from "@/lib/markets/mirror";
import { BRAND_ART, LOCAL_MOCKUPS } from "@/lib/store/images";

export const Route = createFileRoute("/mirror")({
  head: () => ({
    meta: [
      { title: "LVL Mirror — clone a fit | mirror.lvlltd.com" },
      {
        name: "description",
        content:
          "Clone curated merch stacks in one tap — social fits, heat, and a virtual closet on the LVL mesh.",
      },
    ],
  }),
  component: MirrorPage,
});

function FitCard({ fit }: { fit: MirrorFit }) {
  const clone = useMirrorStore((s) => s.clone);
  const total = fitTotal(fit);
  const img =
    LOCAL_MOCKUPS[fit.items[0]?.slug ?? ""] ?? BRAND_ART.collectionTees;

  return (
    <Card className="overflow-hidden border-border bg-surface shadow-soft">
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-surface-2">
        <img
          src={img}
          alt=""
          className="size-full object-cover opacity-90"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant="warning">{fit.badge}</Badge>
          <Badge variant="info">heat {fit.heat}</Badge>
        </div>
      </div>
      <CardHeader className="pb-2">
        <p className="text-[11px] font-mono text-subtle">{fit.handle}</p>
        <CardTitle className="text-base tracking-tight">{fit.title}</CardTitle>
        <CardDescription>{fit.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5 text-xs text-muted">
          {fit.items.map((it) => (
            <li
              key={it.slug}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5"
            >
              <span className="min-w-0 truncate text-fg">{it.title}</span>
              <span className="shrink-0 tabular">${it.priceUsdc}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            <span className="tabular text-fg">{fit.clones}</span> clones
          </span>
          <span className="text-base font-semibold tabular text-fg">
            ${total}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => {
              const c = clone(fit.id);
              toast[c ? "success" : "error"](
                c
                  ? `Cloned · ${c.itemCount} items · $${c.totalUsdc}`
                  : "Clone failed",
              );
            }}
          >
            <Copy className="size-3.5" />
            Clone fit
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/shop">Shop</Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/checkout">Checkout</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MirrorPage() {
  const closetLen = useMirrorStore((s) => s.closet.length);
  const clonesLen = useMirrorStore((s) => s.cloned.length);
  const cloned = useMirrorStore((s) => s.cloned);
  const recent = cloned.slice(0, 5);

  return (
    <div className="space-y-10">
      <VisualHero
        image={BRAND_ART.collectionTees}
        eyebrow="mirror.lvlltd.com · clone-a-fit"
        title="See a stack. Clone it."
        description={
          <>
            Social merch fits from the mesh — one tap clones the whole look into
            your closet, then push to Shop or Checkout.
          </>
        }
        actions={
          <>
            <Button asChild>
              <Link to="/shop">
                <Shirt className="size-4" />
                Open store
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/bundles">Stacks</Link>
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
            Fits cloned
          </p>
          <p className="text-xl font-semibold tabular">{clonesLen}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
          <p className="text-[11px] uppercase tracking-wider text-subtle">
            Closet SKUs
          </p>
          <p className="text-xl font-semibold tabular">{closetLen}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {MIRROR_FITS.map((f) => (
          <FitCard key={f.id} fit={f} />
        ))}
      </div>

      {recent.length > 0 ? (
        <Card className="border-border bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Recent clones</CardTitle>
            <CardDescription>This browser · demo closet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((c, i) => {
              const fit = MIRROR_FITS.find((f) => f.id === c.fitId);
              return (
                <div
                  key={`${c.fitId}-${c.at}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                >
                  <span className="truncate text-fg">
                    {fit?.title ?? c.fitId}
                  </span>
                  <span className="tabular text-muted">
                    {c.itemCount} · ${c.totalUsdc}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
