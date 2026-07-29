/**
 * LVL marketplace host map — apex + subdomains → surfaces.
 * All hosts can point at the same Vercel project; host rewrite maps `/` to the right surface.
 */

export type MarketplaceSurface =
  | "hub"
  | "shop"
  | "pay"
  | "checkout"
  | "account"
  | "orders"
  | "seller"
  | "admin"
  | "agent"
  | "music"
  | "factory"
  | "api"
  | "printify_external";

export type HostEntry = {
  host: string;
  surface: MarketplaceSurface;
  /** Path to land on when request is GET / on this host */
  homePath: string;
  role: string;
  description: string;
  /** Buyer-facing (store shell) vs operator */
  audience: "buyer" | "operator" | "agent" | "brand" | "external";
  publicUrl: string;
};

export const APEX = "lvlltd.com";

/** Canonical public marketplace hosts (DNS → this app unless noted) */
export const MARKETPLACE_HOSTS: HostEntry[] = [
  {
    host: "lvlltd.com",
    surface: "hub",
    homePath: "/marketplace",
    role: "apex_brand",
    description: "Brand apex + marketplace hub",
    audience: "brand",
    publicUrl: "https://lvlltd.com",
  },
  {
    host: "www.lvlltd.com",
    surface: "hub",
    homePath: "/marketplace",
    role: "www",
    description: "WWW → marketplace hub",
    audience: "brand",
    publicUrl: "https://www.lvlltd.com",
  },
  {
    host: "factory.lvlltd.com",
    surface: "factory",
    homePath: "/",
    role: "commerce_factory",
    description: "Full stack: store, pay, agents, operator, webhooks",
    audience: "operator",
    publicUrl: "https://factory.lvlltd.com",
  },
  {
    host: "shop.lvlltd.com",
    surface: "shop",
    homePath: "/shop",
    role: "storefront",
    description: "Buyer merch storefront (LVL Store)",
    audience: "buyer",
    publicUrl: "https://shop.lvlltd.com",
  },
  {
    host: "pay.lvlltd.com",
    surface: "pay",
    homePath: "/pay",
    role: "checkout_rails",
    description: "Multi-rail settlement (crypto + card)",
    audience: "buyer",
    publicUrl: "https://pay.lvlltd.com",
  },
  {
    host: "checkout.lvlltd.com",
    surface: "checkout",
    homePath: "/checkout",
    role: "unified_checkout",
    description: "Cart review → Printify or multi-rail pay",
    audience: "buyer",
    publicUrl: "https://checkout.lvlltd.com",
  },
  {
    host: "account.lvlltd.com",
    surface: "account",
    homePath: "/account",
    role: "buyer_account",
    description: "Buyer account, wishlist, orders",
    audience: "buyer",
    publicUrl: "https://account.lvlltd.com",
  },
  {
    host: "orders.lvlltd.com",
    surface: "orders",
    homePath: "/orders",
    role: "order_history",
    description: "Buyer order history & tracking",
    audience: "buyer",
    publicUrl: "https://orders.lvlltd.com",
  },
  {
    host: "seller.lvlltd.com",
    surface: "seller",
    homePath: "/seller",
    role: "seller_portal",
    description: "Seller portal → pipeline, catalog, Printify",
    audience: "operator",
    publicUrl: "https://seller.lvlltd.com",
  },
  {
    host: "admin.lvlltd.com",
    surface: "admin",
    homePath: "/",
    role: "operator_admin",
    description: "Operator console (factory tools)",
    audience: "operator",
    publicUrl: "https://admin.lvlltd.com",
  },
  {
    host: "agents.lvlltd.com",
    surface: "agent",
    homePath: "/agent/merch",
    role: "agent_commerce",
    description: "Agent protocol + catalog discovery",
    audience: "agent",
    publicUrl: "https://agents.lvlltd.com",
  },
  {
    host: "music.lvlltd.com",
    surface: "music",
    homePath: "/music",
    role: "music_packs",
    description: "Music pack factory / listings",
    audience: "operator",
    publicUrl: "https://music.lvlltd.com",
  },
  {
    host: "api.lvlltd.com",
    surface: "api",
    homePath: "/api/store/catalog",
    role: "public_api",
    description: "Public catalog & pay options API",
    audience: "agent",
    publicUrl: "https://api.lvlltd.com",
  },
  {
    host: "lvlxltd.printify.me",
    surface: "printify_external",
    homePath: "/",
    role: "printify_pop_up",
    description: "Printify POD (external) — physical checkout",
    audience: "external",
    publicUrl: "https://lvlxltd.printify.me",
  },
];

/** Path prefixes that use buyer/marketplace chrome (no operator sidebar) */
export const BUYER_PATH_PREFIXES = [
  "/shop",
  "/marketplace",
  "/account",
  "/orders",
  "/checkout",
  "/pay",
] as const;

export function isBuyerPath(pathname: string): boolean {
  return BUYER_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function normalizeHost(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.split(":")[0].trim().toLowerCase();
}

export function resolveHostEntry(hostname: string): HostEntry | null {
  const h = normalizeHost(hostname);
  if (!h) return null;
  return MARKETPLACE_HOSTS.find((e) => e.host === h) ?? null;
}

/**
 * If host is a dedicated surface and path is `/`, rewrite to that surface home.
 * Returns null when no rewrite needed.
 */
export function hostHomeRewrite(
  hostname: string,
  pathname: string,
): string | null {
  const entry = resolveHostEntry(hostname);
  if (!entry) return null;
  if (pathname !== "/" && pathname !== "") return null;
  if (entry.homePath === "/") return null;
  return entry.homePath;
}

/** Absolute URL helpers (prefer dedicated subdomain when known) */
export const MARKETPLACE_URLS = {
  hub: "https://lvlltd.com/marketplace",
  shop: "https://shop.lvlltd.com",
  shopPath: "https://factory.lvlltd.com/shop",
  pay: "https://pay.lvlltd.com",
  checkout: "https://checkout.lvlltd.com",
  account: "https://account.lvlltd.com",
  orders: "https://orders.lvlltd.com",
  seller: "https://seller.lvlltd.com",
  admin: "https://admin.lvlltd.com",
  agents: "https://agents.lvlltd.com",
  music: "https://music.lvlltd.com",
  factory: "https://factory.lvlltd.com",
  catalogApi: "https://api.lvlltd.com/api/store/catalog",
  printify: "https://lvlxltd.printify.me",
  hubMarketplaceLegacy: "https://lvlltd.com/hub/marketplace/",
} as const;

/** Tools every marketplace surface should expose (nav + hub cards) */
export const MARKETPLACE_TOOLS = [
  {
    id: "shop",
    title: "LVL Store",
    path: "/shop",
    host: "shop.lvlltd.com",
    blurb: "Merch, art, agent drops — Printify POD",
    audience: "buyer" as const,
  },
  {
    id: "checkout",
    title: "Checkout",
    path: "/checkout",
    host: "checkout.lvlltd.com",
    blurb: "Cart review → POD or multi-rail pay",
    audience: "buyer" as const,
  },
  {
    id: "pay",
    title: "Multi-rail pay",
    path: "/pay",
    host: "pay.lvlltd.com",
    blurb: "USDC/USDT + card · Base default",
    audience: "buyer" as const,
  },
  {
    id: "account",
    title: "Account",
    path: "/account",
    host: "account.lvlltd.com",
    blurb: "Profile, wishlist, order shortcuts",
    audience: "buyer" as const,
  },
  {
    id: "orders",
    title: "Orders",
    path: "/orders",
    host: "orders.lvlltd.com",
    blurb: "Buyer order history & tracking",
    audience: "buyer" as const,
  },
  {
    id: "agents",
    title: "Agent shop",
    path: "/agent/merch",
    host: "agents.lvlltd.com",
    blurb: "lvl-merch-v1 protocol + catalog API",
    audience: "agent" as const,
  },
  {
    id: "seller",
    title: "Seller portal",
    path: "/seller",
    host: "seller.lvlltd.com",
    blurb: "Pipeline, Printify drafts, webhooks",
    audience: "operator" as const,
  },
  {
    id: "admin",
    title: "Operator admin",
    path: "/",
    host: "admin.lvlltd.com",
    blurb: "Factory console · packs · canary",
    audience: "operator" as const,
  },
  {
    id: "music",
    title: "Music packs",
    path: "/music",
    host: "music.lvlltd.com",
    blurb: "Release kits for music.lvlltd.com",
    audience: "operator" as const,
  },
  {
    id: "api",
    title: "Catalog API",
    path: "/api/store/catalog",
    host: "api.lvlltd.com",
    blurb: "JSON catalog for agents & integrations",
    audience: "agent" as const,
  },
] as const;
