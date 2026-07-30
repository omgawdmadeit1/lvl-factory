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
  | "printify_external"
  | "drops"
  | "pulse"
  | "studio"
  | "relay"
  | "bundles"
  | "radar"
  | "labs"
  | "exchange"
  | "fleet"
  | "syndicate"
  | "launch"
  | "bounty"
  | "vault"
  | "signal"
  | "arena";

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
    description: "Buyer account, loyalty, wishlist, orders",
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
    host: "labs.lvlltd.com",
    surface: "labs",
    homePath: "/labs",
    role: "live_demos",
    description: "Interactive demos for every LVL product surface",
    audience: "buyer",
    publicUrl: "https://labs.lvlltd.com",
  },
  {
    host: "exchange.lvlltd.com",
    surface: "exchange",
    homePath: "/exchange",
    role: "secondary_market",
    description: "Secondary digital goods order book (skills, licenses, rights)",
    audience: "buyer",
    publicUrl: "https://exchange.lvlltd.com",
  },
  {
    host: "fleet.lvlltd.com",
    surface: "fleet",
    homePath: "/fleet",
    role: "agent_labor",
    description: "Hire autonomous agent fleets for commerce ops",
    audience: "operator",
    publicUrl: "https://fleet.lvlltd.com",
  },
  {
    host: "drops.lvlltd.com",
    surface: "drops",
    homePath: "/drops",
    role: "live_drops",
    description: "Timed flash drops + limited inventory",
    audience: "buyer",
    publicUrl: "https://drops.lvlltd.com",
  },
  {
    host: "pulse.lvlltd.com",
    surface: "pulse",
    homePath: "/pulse",
    role: "network_pulse",
    description: "Live domain activity stream",
    audience: "buyer",
    publicUrl: "https://pulse.lvlltd.com",
  },
  {
    host: "studio.lvlltd.com",
    surface: "studio",
    homePath: "/studio",
    role: "design_studio",
    description: "Imagine design briefs for merch pipeline",
    audience: "buyer",
    publicUrl: "https://studio.lvlltd.com",
  },
  {
    host: "relay.lvlltd.com",
    surface: "relay",
    homePath: "/relay",
    role: "agent_relay",
    description: "A2A commerce intents → multi-rail pay",
    audience: "agent",
    publicUrl: "https://relay.lvlltd.com",
  },
  {
    host: "bundles.lvlltd.com",
    surface: "bundles",
    homePath: "/bundles",
    role: "stack_packs",
    description: "Curated multi-SKU bundles with stack discounts",
    audience: "buyer",
    publicUrl: "https://bundles.lvlltd.com",
  },
  {
    host: "radar.lvlltd.com",
    surface: "radar",
    homePath: "/radar",
    role: "restock_radar",
    description: "Restock watches for drops & SKUs",
    audience: "buyer",
    publicUrl: "https://radar.lvlltd.com",
  },

  {
    host: "syndicate.lvlltd.com",
    surface: "syndicate",
    homePath: "/syndicate",
    role: "group_buys",
    description: "Social co-purchase pools · stack unlocks",
    audience: "buyer",
    publicUrl: "https://syndicate.lvlltd.com",
  },
  {
    host: "launch.lvlltd.com",
    surface: "launch",
    homePath: "/launch",
    role: "product_launchpad",
    description: "Waitlists · pledges · product launches",
    audience: "buyer",
    publicUrl: "https://launch.lvlltd.com",
  },
  {
    host: "bounty.lvlltd.com",
    surface: "bounty",
    homePath: "/bounty",
    role: "task_escrow",
    description: "Commerce task bounties · agent + human escrow",
    audience: "agent",
    publicUrl: "https://bounty.lvlltd.com",
  },

  {
    host: "vault.lvlltd.com",
    surface: "vault",
    homePath: "/vault",
    role: "ip_vault",
    description: "Digital IP vault · royalties · seats",
    audience: "buyer",
    publicUrl: "https://vault.lvlltd.com",
  },
  {
    host: "signal.lvlltd.com",
    surface: "signal",
    homePath: "/signal",
    role: "demand_signals",
    description: "Attention / intent packs for brands",
    audience: "buyer",
    publicUrl: "https://signal.lvlltd.com",
  },
  {
    host: "arena.lvlltd.com",
    surface: "arena",
    homePath: "/arena",
    role: "drop_races",
    description: "Competitive drop claim races + leaderboard",
    audience: "buyer",
    publicUrl: "https://arena.lvlltd.com",
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
  "/drops",
  "/pulse",
  "/studio",
  "/relay",
  "/bundles",
  "/radar",
  "/labs",
  "/exchange",
  "/fleet",
  "/syndicate",
  "/launch",
  "/bounty",
  "/vault",
  "/signal",
  "/arena",
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
  labs: "https://labs.lvlltd.com",
  exchange: "https://exchange.lvlltd.com",
  fleet: "https://fleet.lvlltd.com",
  syndicate: "https://syndicate.lvlltd.com",
  launch: "https://launch.lvlltd.com",
  bounty: "https://bounty.lvlltd.com",
  vault: "https://vault.lvlltd.com",
  signal: "https://signal.lvlltd.com",
  arena: "https://arena.lvlltd.com",
  drops: "https://drops.lvlltd.com",
  pulse: "https://pulse.lvlltd.com",
  studio: "https://studio.lvlltd.com",
  relay: "https://relay.lvlltd.com",
  bundles: "https://bundles.lvlltd.com",
  radar: "https://radar.lvlltd.com",
  music: "https://music.lvlltd.com",
  factory: "https://factory.lvlltd.com",
  catalogApi: "https://api.lvlltd.com/api/store/catalog",
  agentCard: "https://api.lvlltd.com/api/agent/card",
  printify: "https://lvlxltd.printify.me",
  hubMarketplaceLegacy: "https://lvlltd.com/hub/marketplace/",
} as const;

/** Tools every marketplace surface should expose (nav + hub cards) */
export const MARKETPLACE_TOOLS = [
  {
    id: "labs",
    title: "Labs · live demos",
    path: "/labs",
    host: "labs.lvlltd.com",
    blurb: "Play every product — interactive demos",
    audience: "buyer" as const,
  },
  {
    id: "exchange",
    title: "LVL Exchange",
    path: "/exchange",
    host: "exchange.lvlltd.com",
    blurb: "Secondary market · skills · licenses · rights",
    audience: "buyer" as const,
  },
  {
    id: "fleet",
    title: "Agent Fleet",
    path: "/fleet",
    host: "fleet.lvlltd.com",
    blurb: "Hire autonomous crews for commerce ops",
    audience: "operator" as const,
  },
  {
    id: "syndicate",
    title: "Syndicate",
    path: "/syndicate",
    host: "syndicate.lvlltd.com",
    blurb: "Group buys · fill crew · stack price",
    audience: "buyer" as const,
  },
  {
    id: "launch",
    title: "Launch pad",
    path: "/launch",
    host: "launch.lvlltd.com",
    blurb: "Waitlists · pledges · go-to-market",
    audience: "buyer" as const,
  },
  {
    id: "bounty",
    title: "Bounty board",
    path: "/bounty",
    host: "bounty.lvlltd.com",
    blurb: "Task escrow for agents & humans",
    audience: "agent" as const,
  },
  {
    id: "vault",
    title: "IP Vault",
    path: "/vault",
    host: "vault.lvlltd.com",
    blurb: "Hold rights · accrue royalties · claim USDC",
    audience: "buyer" as const,
  },
  {
    id: "signal",
    title: "Signal market",
    path: "/signal",
    host: "signal.lvlltd.com",
    blurb: "Buy demand & attention packs",
    audience: "buyer" as const,
  },
  {
    id: "arena",
    title: "Arena races",
    path: "/arena",
    host: "arena.lvlltd.com",
    blurb: "Competitive drop claims · leaderboard",
    audience: "buyer" as const,
  },

  {
    id: "shop",
    title: "LVL Store",
    path: "/shop",
    host: "shop.lvlltd.com",
    blurb: "Merch, art, agent drops — Printify POD",
    audience: "buyer" as const,
  },
  {
    id: "drops",
    title: "Live drops",
    path: "/drops",
    host: "drops.lvlltd.com",
    blurb: "Timed flash inventory · claim → cart",
    audience: "buyer" as const,
  },
  {
    id: "bundles",
    title: "Stack packs",
    path: "/bundles",
    host: "bundles.lvlltd.com",
    blurb: "Multi-SKU bundles with stack discounts",
    audience: "buyer" as const,
  },
  {
    id: "checkout",
    title: "Checkout",
    path: "/checkout",
    host: "checkout.lvlltd.com",
    blurb: "Gift mode · credits · POD or multi-rail",
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
    title: "Account & loyalty",
    path: "/account",
    host: "account.lvlltd.com",
    blurb: "Credits, tiers, referrals, wishlist",
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
    id: "radar",
    title: "Restock radar",
    path: "/radar",
    host: "radar.lvlltd.com",
    blurb: "Watch sold-out drops for re-opens",
    audience: "buyer" as const,
  },
  {
    id: "pulse",
    title: "Network pulse",
    path: "/pulse",
    host: "pulse.lvlltd.com",
    blurb: "Live activity across the domain net",
    audience: "buyer" as const,
  },
  {
    id: "studio",
    title: "Design studio",
    path: "/studio",
    host: "studio.lvlltd.com",
    blurb: "Imagine briefs → merch pipeline",
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
    id: "relay",
    title: "Agent relay",
    path: "/relay",
    host: "relay.lvlltd.com",
    blurb: "A2A intents · sign · handoff to pay",
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
