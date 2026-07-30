/**
 * LVL Signal — demand / attention marketplace.
 * Brands buy intent signals (restock interest, drop heat, agent traffic).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SignalKind =
  | "restock_intent"
  | "drop_heat"
  | "agent_traffic"
  | "search_demand"
  | "waitlist_surge";

export type SignalListing = {
  id: string;
  title: string;
  kind: SignalKind;
  blurb: string;
  /** Price per pack of 100 events */
  priceUsdc: number;
  /** Available units (packs) */
  supply: number;
  heat: number; // 0-100
  source: string;
  badge: string;
};

export type SignalPurchase = {
  id: string;
  listingId: string;
  packs: number;
  paidUsdc: number;
  at: number;
};

export const SIGNAL_CATALOG: SignalListing[] = [
  {
    id: "sg-soft-era-restock",
    title: "Soft Era restock intent",
    kind: "restock_intent",
    blurb: "Radar watches + sold-out PDP pings for Soft Era gallery plate.",
    priceUsdc: 8,
    supply: 40,
    heat: 82,
    source: "radar.lvlltd.com",
    badge: "Radar",
  },
  {
    id: "sg-midnight-drop",
    title: "Midnight drop heat",
    kind: "drop_heat",
    blurb: "Live claim velocity + countdown dwell on MAIN CHARACTER flash.",
    priceUsdc: 14,
    supply: 25,
    heat: 94,
    source: "drops.lvlltd.com",
    badge: "Drops",
  },
  {
    id: "sg-agent-catalog",
    title: "Agent catalog traffic",
    kind: "agent_traffic",
    blurb: "lvl-merch-v1 discovery hits + A2A intent starts.",
    priceUsdc: 11,
    supply: 60,
    heat: 71,
    source: "agents.lvlltd.com",
    badge: "Agents",
  },
  {
    id: "sg-search-tees",
    title: "Tee search demand",
    kind: "search_demand",
    blurb: "Shop search queries: tees, statement, city marks.",
    priceUsdc: 6,
    supply: 80,
    heat: 58,
    source: "shop.lvlltd.com",
    badge: "Shop",
  },
  {
    id: "sg-launch-waitlist",
    title: "Launch waitlist surge",
    kind: "waitlist_surge",
    blurb: "NIGHT OPS + Relay Pro waitlist velocity packs.",
    priceUsdc: 10,
    supply: 30,
    heat: 76,
    source: "launch.lvlltd.com",
    badge: "Launch",
  },
  {
    id: "sg-syndicate-crew",
    title: "Syndicate crew intent",
    kind: "drop_heat",
    blurb: "Pool joins near threshold — high conversion buyers.",
    priceUsdc: 12,
    supply: 20,
    heat: 88,
    source: "syndicate.lvlltd.com",
    badge: "Syndicate",
  },
];

function noopStorage() {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

function storage() {
  if (typeof window === "undefined") return createJSONStorage(noopStorage);
  return createJSONStorage(() => localStorage);
}

interface SignalState {
  remaining: Record<string, number>;
  purchases: SignalPurchase[];
  budgetUsdc: number;
  buy: (listingId: string, packs?: number) => boolean;
  remainingOf: (listing: SignalListing) => number;
  spent: () => number;
}

export const useSignalStore = create<SignalState>()(
  persist(
    (set, get) => ({
      remaining: {},
      purchases: [],
      budgetUsdc: 500,
      remainingOf: (listing) => {
        const r = get().remaining[listing.id];
        return typeof r === "number" ? r : listing.supply;
      },
      buy: (listingId, packs = 1) => {
        const listing = SIGNAL_CATALOG.find((l) => l.id === listingId);
        if (!listing) return false;
        const left = get().remainingOf(listing);
        if (left < packs) return false;
        const cost = listing.priceUsdc * packs;
        if (get().budgetUsdc < cost) return false;
        set((s) => ({
          budgetUsdc: s.budgetUsdc - cost,
          remaining: {
            ...s.remaining,
            [listingId]: left - packs,
          },
          purchases: [
            {
              id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              listingId,
              packs,
              paidUsdc: cost,
              at: Date.now(),
            },
            ...s.purchases,
          ].slice(0, 40),
        }));
        return true;
      },
      spent: () =>
        get().purchases.reduce((s, p) => s + p.paidUsdc, 0),
    }),
    {
      name: "lvl-signal-v1",
      storage: storage(),
      partialize: (s) => ({
        remaining: s.remaining,
        purchases: s.purchases,
        budgetUsdc: s.budgetUsdc,
      }),
    },
  ),
);
