/**
 * Storefront image helpers.
 * Printify images-api returns empty body to many clients; we route through
 * /api/store/image which resolves x-automaton-object-url → S3 JPEG.
 */

/** Known stable S3 seeds (refreshed periodically; proxy is the durable path). */
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

/** Build proxy URL for any Printify images-api mockup URL */
export function proxyStoreImage(sourceUrl: string): string {
  if (!sourceUrl) return "";
  // Already S3 — use directly (fast path)
  if (
    sourceUrl.includes("amazonaws.com") &&
    sourceUrl.includes("/mockup/")
  ) {
    return sourceUrl;
  }
  // Already our proxy
  if (sourceUrl.startsWith("/api/store/image")) return sourceUrl;
  return `/api/store/image?u=${encodeURIComponent(sourceUrl)}`;
}

/** Prefer resolved S3 by slug, else proxy original mockupUrl */
export function productImageSrc(opts: {
  slug: string;
  mockupUrl: string;
}): string {
  const resolved = RESOLVED_MOCKUPS[opts.slug];
  if (resolved) return resolved;
  return proxyStoreImage(opts.mockupUrl);
}
