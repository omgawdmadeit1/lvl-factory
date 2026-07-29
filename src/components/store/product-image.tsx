import { useEffect, useState } from "react";
import {
  BRAND_ART,
  productImageSrc,
  proxyStoreImage,
  RESOLVED_MOCKUPS,
} from "@/lib/store/images";
import { cn } from "@/lib/utils";

export function ProductImage({
  slug,
  mockupUrl,
  alt,
  className,
  priority,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px",
}: {
  slug: string;
  mockupUrl: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const primary = productImageSrc({ slug, mockupUrl });
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setSrc(productImageSrc({ slug, mockupUrl }));
    setFailed(false);
    setStep(0);
  }, [slug, mockupUrl]);

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden bg-surface-2",
        className,
      )}
    >
      {!failed ? (
        <img
          src={src}
          alt={alt}
          width={800}
          height={1000}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="size-full object-cover"
          onError={() => {
            // Cascade: local/primary → S3 seed → proxy stream → fail
            const seed = RESOLVED_MOCKUPS[slug];
            if (step === 0 && seed && src !== seed) {
              setStep(1);
              setSrc(seed);
              return;
            }
            if (step <= 1 && mockupUrl) {
              setStep(2);
              setSrc(proxyStoreImage(mockupUrl, "stream"));
              return;
            }
            if (step === 2 && seed) {
              setStep(3);
              setSrc(proxyStoreImage(seed, "stream"));
              return;
            }
            setFailed(true);
          }}
        />
      ) : (
        <div className="relative flex size-full items-center justify-center overflow-hidden bg-surface-2">
          <img
            src={BRAND_ART.blankTeeBlack}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-40"
            aria-hidden
          />
          <div className="relative z-[1] px-4 text-center">
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
