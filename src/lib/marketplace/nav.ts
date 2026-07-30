/**
 * Single source of truth for cross-surface navigation.
 * Used by BuyerShell, StoreShell, AppShell, and NetworkMenu.
 */

export type NavLink = {
  to: string;
  label: string;
  /** Optional keywords for menu search */
  keywords?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  links: NavLink[];
};

/** Full mesh map — every content route that should be reachable from menus */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "hub",
    label: "Hub",
    links: [
      { to: "/marketplace", label: "Marketplace hub" },
      { to: "/labs", label: "Labs demos" },
      { to: "/network", label: "Network map" },
      { to: "/shop", label: "LVL Store" },
    ],
  },
  {
    id: "markets",
    label: "Markets",
    links: [
      { to: "/exchange", label: "Exchange" },
      { to: "/vault", label: "IP Vault" },
      { to: "/signal", label: "Signal" },
      { to: "/arena", label: "Arena" },
      { to: "/syndicate", label: "Syndicate" },
      { to: "/launch", label: "Launch pad" },
      { to: "/bounty", label: "Bounty" },
      { to: "/fleet", label: "Agent fleet" },
    ],
  },
  {
    id: "edge",
    label: "Edge",
    links: [
      { to: "/drops", label: "Live drops" },
      { to: "/bundles", label: "Stack packs" },
      { to: "/radar", label: "Restock radar" },
      { to: "/pulse", label: "Network pulse" },
      { to: "/studio", label: "Design studio" },
      { to: "/relay", label: "Agent relay" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    links: [
      { to: "/checkout", label: "Checkout" },
      { to: "/pay", label: "Pay rails" },
      { to: "/orders", label: "Orders" },
      { to: "/account", label: "Account" },
      { to: "/seller", label: "Seller portal" },
      { to: "/agent/merch", label: "Agent shop" },
    ],
  },
  {
    id: "factory",
    label: "Factory",
    links: [
      { to: "/", label: "Dashboard" },
      { to: "/merch", label: "Merch (legacy)" },
      { to: "/pipeline", label: "Merch pipeline" },
      { to: "/webhooks", label: "Printify hooks" },
      { to: "/music", label: "Music packs" },
      { to: "/skills", label: "Skill packs" },
      { to: "/queue", label: "Queue" },
      { to: "/tier1", label: "Tier 1 plan" },
      { to: "/canary", label: "Canary" },
    ],
  },
];

/** Primary buyer bar — compact, high-traffic */
export const BUYER_PRIMARY_NAV: NavLink[] = [
  { to: "/marketplace", label: "Hub" },
  { to: "/labs", label: "Labs" },
  { to: "/shop", label: "Shop" },
  { to: "/exchange", label: "Exchange" },
  { to: "/vault", label: "Vault" },
  { to: "/arena", label: "Arena" },
  { to: "/drops", label: "Drops" },
  { to: "/checkout", label: "Checkout" },
  { to: "/account", label: "Account" },
];

/** Secondary chips under buyer header (scroll row) */
export const BUYER_SECONDARY_NAV: NavLink[] = [
  { to: "/signal", label: "Signal" },
  { to: "/syndicate", label: "Syndicate" },
  { to: "/launch", label: "Launch" },
  { to: "/bounty", label: "Bounty" },
  { to: "/fleet", label: "Fleet" },
  { to: "/bundles", label: "Stacks" },
  { to: "/radar", label: "Radar" },
  { to: "/pulse", label: "Pulse" },
  { to: "/studio", label: "Studio" },
  { to: "/relay", label: "Relay" },
  { to: "/pay", label: "Pay" },
  { to: "/orders", label: "Orders" },
  { to: "/network", label: "Network" },
  { to: "/music", label: "Music" },
  { to: "/agent/merch", label: "Agents" },
  { to: "/seller", label: "Seller" },
];

/** Store top strip extras beyond collections */
export const STORE_NETWORK_NAV: NavLink[] = [
  { to: "/marketplace", label: "Hub" },
  { to: "/labs", label: "Labs" },
  { to: "/drops", label: "Drops" },
  { to: "/bundles", label: "Stacks" },
  { to: "/vault", label: "Vault" },
  { to: "/arena", label: "Arena" },
  { to: "/exchange", label: "Exchange" },
  { to: "/pay", label: "Pay" },
  { to: "/account", label: "Account" },
];

export function isNavActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (to === "/marketplace") return pathname === "/marketplace";
  if (to === "/shop") {
    return pathname === "/shop" || pathname.startsWith("/shop/");
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Flat list of every link (deduped by path) */
export function allNavLinks(): NavLink[] {
  const seen = new Set<string>();
  const out: NavLink[] = [];
  for (const g of NAV_GROUPS) {
    for (const l of g.links) {
      if (seen.has(l.to)) continue;
      seen.add(l.to);
      out.push(l);
    }
  }
  return out;
}
