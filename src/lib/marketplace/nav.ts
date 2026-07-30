/**
 * Single source of truth for cross-surface navigation.
 * Used by BuyerShell, StoreShell, AppShell, and NetworkMenu.
 * Labels stay short so mobile menus don't overflow cells.
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
      { to: "/marketplace", label: "Hub" },
      { to: "/labs", label: "Labs" },
      { to: "/network", label: "Network" },
      { to: "/shop", label: "Store" },
    ],
  },
  {
    id: "markets",
    label: "Markets",
    links: [
      { to: "/exchange", label: "Exchange" },
      { to: "/vault", label: "Vault" },
      { to: "/signal", label: "Signal" },
      { to: "/arena", label: "Arena" },
      { to: "/syndicate", label: "Syndicate" },
      { to: "/launch", label: "Launch" },
      { to: "/bounty", label: "Bounty" },
      { to: "/fleet", label: "Fleet" },
      { to: "/forge", label: "Forge" },
      { to: "/guild", label: "Guild" },
      { to: "/whisper", label: "Whisper" },
      { to: "/quest", label: "Quest" },
      { to: "/ledger", label: "Ledger" },
      { to: "/oracle", label: "Oracle" },
    ],
  },
  {
    id: "edge",
    label: "Edge",
    links: [
      { to: "/drops", label: "Drops" },
      { to: "/bundles", label: "Stacks" },
      { to: "/radar", label: "Radar" },
      { to: "/pulse", label: "Pulse" },
      { to: "/studio", label: "Studio" },
      { to: "/relay", label: "Relay" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    links: [
      { to: "/checkout", label: "Checkout" },
      { to: "/pay", label: "Pay" },
      { to: "/orders", label: "Orders" },
      { to: "/account", label: "Account" },
      { to: "/seller", label: "Seller" },
      { to: "/agent/merch", label: "Agents" },
    ],
  },
  {
    id: "factory",
    label: "Factory",
    links: [
      { to: "/", label: "Dashboard" },
      { to: "/pipeline", label: "Pipeline" },
      { to: "/webhooks", label: "Webhooks" },
      { to: "/music", label: "Music" },
      { to: "/skills", label: "Skills" },
      { to: "/queue", label: "Queue" },
      { to: "/tier1", label: "Tier 1" },
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
  { to: "/forge", label: "Forge" },
  { to: "/quest", label: "Quest" },
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
  { to: "/forge", label: "Forge" },
  { to: "/guild", label: "Guild" },
  { to: "/whisper", label: "Whisper" },
  { to: "/quest", label: "Quest" },
  { to: "/ledger", label: "Ledger" },
  { to: "/oracle", label: "Oracle" },
];

/** Compact operator mobile strip (full list lives in NetworkMenu) */
export const OPERATOR_MOBILE_NAV: NavLink[] = [
  { to: "/", label: "Home" },
  { to: "/marketplace", label: "Hub" },
  { to: "/labs", label: "Labs" },
  { to: "/shop", label: "Shop" },
  { to: "/vault", label: "Vault" },
  { to: "/exchange", label: "Exchange" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/pay", label: "Pay" },
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
  { to: "/forge", label: "Forge" },
  { to: "/quest", label: "Quest" },
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
