import { cn } from "@/lib/utils";

export function VisualHero({
  image,
  alt = "",
  eyebrow,
  title,
  description,
  actions,
  className,
  compact,
}: {
  image: string;
  alt?: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border shadow-soft",
        compact ? "min-h-[180px]" : "min-h-[240px] sm:min-h-[300px]",
        className,
      )}
    >
      <img
        src={image}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <div className="hero-scrim absolute inset-0" />
      <div className="hero-scrim-bottom absolute inset-x-0 bottom-0 h-2/3" />
      <div
        className={cn(
          "relative z-[1] flex h-full flex-col justify-end gap-3 p-5 sm:p-8",
          compact ? "max-w-xl" : "max-w-2xl",
        )}
      >
        {eyebrow ? (
          <p className="reveal text-xs font-medium uppercase tracking-wider text-muted">
            {eyebrow}
          </p>
        ) : null}
        <div className="reveal reveal-delay-1 space-y-2">
          <h1
            className={cn(
              "font-semibold tracking-tight text-fg",
              compact
                ? "text-xl sm:text-2xl"
                : "text-2xl sm:text-3xl lg:text-4xl lg:leading-[1.1]",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="max-w-lg text-sm text-muted sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="reveal reveal-delay-2 flex flex-wrap gap-2 pt-1">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2 shadow-soft",
        dim,
        className,
      )}
    >
      <img
        src="/brand/mark-agent.jpg"
        alt=""
        className="size-full object-cover"
        aria-hidden
      />
    </span>
  );
}
