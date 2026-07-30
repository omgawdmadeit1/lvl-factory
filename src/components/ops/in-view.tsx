/**
 * Mount children only after the shell enters the viewport.
 * Keeps off-screen Labs widgets from hydrating stores / intervals early.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InView({
  children,
  className,
  rootMargin = "120px 0px",
  minHeight = 140,
  placeholder,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
  minHeight?: number;
  placeholder?: ReactNode;
  /** Stay mounted after first reveal (default true) */
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            if (once) io.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { root: null, rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin]);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={!visible ? { minHeight } : undefined}
    >
      {visible
        ? children
        : (placeholder ?? (
            <div className="flex h-full min-h-[8.5rem] items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/60 px-3 py-6 text-center text-xs text-subtle">
              Demo loads when scrolled into view
            </div>
          ))}
    </div>
  );
}
