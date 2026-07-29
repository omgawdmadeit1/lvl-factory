/**
 * Storefront image helpers (client + server safe).
 * Printify images-api often returns empty body; resolve via S3 or /api/store/image.
 */

/** Known S3 seeds (fast path; expire ~weekly — proxy refreshes). */
export const RESOLVED_MOCKUPS: Record<string, string> = {
  "boston-native-logo-t-shirt":
    "https://pfy-prod-automaton-cache.s3.us-east-2.amazonaws.com/mockup/706/6a6a3fb4b321eb70a0045515/73207/98445/11363530777891837245_1200.jpeg",
  "copy-of-boston-native-logo-t-shirt":
    "https://pfy-prod-automaton-cache.s3.us-east-2.amazonaws.com/mockup/706/6a6a4017f22eef59540f9ae2/73207/98445/11363530777891837245_1200.jpeg",
  "main-character":
    "https://pfy-prod-automaton-cache.s3.us-east-2.amazonaws.com/mockup/6/69a230baf7fc1928080dd1cd/12124/92570/1048518659001594065_1200.jpeg",
  "main-character-2":
    "https://pfy-prod-automaton-cache.s3.us-east-2.amazonaws.com/mockup/6/69a230d87fc2996b8d0a4091/12124/92570/12914183829226385099_1200.jpeg",
  "serotonin-dealer":
    "https://pfy-prod-automaton-cache.s3.us-east-2.amazonaws.com/mockup/6/69a2887e1ec5ca402c03157c/12124/92570/6355580491096944107_1200.jpeg",
  "soft-era":
    "https://pfy-prod-automaton-cache.s3.us-east-2.amazonaws.com/mockup/380/69a288b146730b56700a03de/45150/1530/8150530740031892652_1200.jpeg",
};

export type ProxyMode = "redirect" | "stream";

/**
 * Build optimized proxy URL.
 * - redirect (default): one resolve hop → 302 S3 (cheapest, browser caches S3)
 * - stream: same-origin bytes when S3/referrer is blocked
 */
export function proxyStoreImage(
  sourceUrl: string,
  mode: ProxyMode = "redirect",
): string {
  if (!sourceUrl) return "";
  if (sourceUrl.startsWith("/api/store/image")) return sourceUrl;
  // S3 direct is fastest when available
  if (
    mode === "redirect" &&
    sourceUrl.includes("amazonaws.com") &&
    sourceUrl.includes("/mockup/")
  ) {
    return sourceUrl;
  }
  const q = new URLSearchParams();
  q.set("u", sourceUrl);
  if (mode === "stream") q.set("mode", "stream");
  return `/api/store/image?${q.toString()}`;
}

/**
 * Best image URL for a product:
 * 1) seeded S3 (0 hop)
 * 2) proxy of Printify images-api (1 hop resolve + 302)
 */
export function productImageSrc(opts: {
  slug: string;
  mockupUrl: string;
  /** Force same-origin stream (rare) */
  stream?: boolean;
}): string {
  const mode: ProxyMode = opts.stream ? "stream" : "redirect";
  const resolved = RESOLVED_MOCKUPS[opts.slug];
  if (resolved) {
    if (mode === "stream") return proxyStoreImage(resolved, "stream");
    return resolved;
  }
  return proxyStoreImage(opts.mockupUrl, mode);
}

/** Prefetch / warm browser cache for visible product images */
export function prefetchProductImages(
  items: Array<{ slug: string; mockupUrl: string }>,
): void {
  if (typeof document === "undefined") return;
  for (const item of items.slice(0, 12)) {
    const href = productImageSrc(item);
    if (!href) continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    document.head.appendChild(link);
  }
}
