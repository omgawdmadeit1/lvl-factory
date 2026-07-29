import { useState } from "react";
import { productImageSrc, proxyStoreImage } from "@/lib/store/images";
import { cn } from "@/lib/utils";

export function ProductImage({
  slug,
  mockupUrl,
  alt,
  className,
  priority,
}: {
  slug: string;
  mockupUrl: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const primary = productImageSrc({ slug, mockupUrl });
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn("relative size-full bg-surface-2", className)}>
      {!failed ? (
        <img
          src={src}
          alt={alt}
          width={800}
          height={1000}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="size-full object-cover"
          onError={() => {
            // Fallback: try proxy of original printify URL
            const fallback = proxyStoreImage(mockupUrl);
            if (src !== fallback && mockupUrl) {
              setSrc(fallback);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-surface-2 p-4 text-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">
              LVL
            </p>
            <p className="mt-1 text-sm text-muted line-clamp-2">{alt}</p>
          </div>
        </div>
      )}
    </div>
  );
}
