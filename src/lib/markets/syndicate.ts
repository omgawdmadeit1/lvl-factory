/**
 * LVL Syndicate — group buys / social co-purchase for flash merch & digital packs.
 * Join a pool; when threshold hits, deal unlocks at stack price.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SyndicateStatus = "open" | "funded" | "locked" | "shipped";

export type SyndicateDeal = {
  id: string;
  title: string;
  blurb: string;
  productSlug: string;
  /** Retail unit price */
  retailUsd: number;
  /** Syndicate stack price when funded */
  stackUsd: number;
  /** Units needed to unlock */
  threshold: number;
  /** Max pool size */
  cap: number;
  /** Hours remaining (demo clock) */
  hoursLeft: number;
  badge: string;
  kind: "merch" | "music" | "skill" | "blueprint";
};

export type PoolState = {
  joined: number;
  youIn: boolean;
  yourQty: number;
  status: SyndicateStatus;
};

export const SYNDICATE_DEALS: SyndicateDeal[] = [
  {
    id: "syn-main-character",
    title: "MAIN CHARACTER · Squad cut",
    blurb: "48-unit black plate. Unlock −18% when the crew fills.",
    productSlug: "main-character",
    retailUsd: 29.99,
    stackUsd: 24.5,
    threshold: 12,
    cap: 48,
    hoursLeft: 18,
    badge: "Flash crew",
    kind: "merch",
  },
  {
    id: "syn-soft-era",
    title: "SOFT ERA · Gallery pack",
    blurb: "Editorial print + digital right. Stack price at 8 pledges.",
    productSlug: "soft-era",
    retailUsd: 32.99,
    stackUsd: 26.0,
    threshold: 8,
    cap: 36,
    hoursLeft: 36,
    badge: "Art",
    kind: "merch",
  },
  {
    id: "syn-skill-tier1",
    title: "Tier 1 Skill · co-mint",
    blurb: "Factory skill license — group mint unlocks transfer seat.",
    productSlug: "skill-tier1",
    retailUsd: 48,
    stackUsd: 39,
    threshold: 10,
    cap: 50,
    hoursLeft: 72,
    badge: "Skill",
    kind: "skill",
  },
  {
    id: "syn-wave-music",
    title: "Wave release kit · booth",
    blurb: "Stems + cover + listing pack. Bandmates fill the booth.",
    productSlug: "music-wave",
    retailUsd: 32,
    stackUsd: 24,
    threshold: 6,
    cap: 24,
    hoursLeft: 48,
    badge: "Music",
    kind: "music",
  },
  {
    id: "syn-agent-pro",
    title: "Agent Pro · desk seat",
    blurb: "Commercial A2A seat. Syndicate unlocks bulk desk discount.",
    productSlug: "agent-pro",
    retailUsd: 120,
    stackUsd: 96,
    threshold: 5,
    cap: 20,
    hoursLeft: 96,
    badge: "License",
    kind: "blueprint",
  },
];

/** Deterministic seed so SSR matches first paint */
function seedJoined(id: string, threshold: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return Math.max(1, Math.min(threshold - 1, (h % Math.max(2, threshold - 1)) + 1));
}

function defaultPools(): Record<string, PoolState> {
  const out: Record<string, PoolState> = {};
  for (const d of SYNDICATE_DEALS) {
    out[d.id] = {
      joined: seedJoined(d.id, d.threshold),
      youIn: false,
      yourQty: 0,
      status: "open",
    };
  }
  return out;
}

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

interface SyndicateState {
  pools: Record<string, PoolState>;
  join: (id: string, qty?: number) => boolean;
  leave: (id: string) => void;
  progress: (id: string) => number;
  savings: (deal: SyndicateDeal) => number;
}

export const useSyndicateStore = create<SyndicateState>()(
  persist(
    (set, get) => ({
      pools: defaultPools(),
      join: (id, qty = 1) => {
        const deal = SYNDICATE_DEALS.find((d) => d.id === id);
        if (!deal) return false;
        const pool = get().pools[id] ?? defaultPools()[id];
        if (pool.status === "locked" || pool.status === "shipped") return false;
        if (pool.joined + qty > deal.cap) return false;
        const joined = pool.joined + qty;
        const funded = joined >= deal.threshold;
        set((s) => ({
          pools: {
            ...s.pools,
            [id]: {
              joined,
              youIn: true,
              yourQty: pool.yourQty + qty,
              status: funded ? "funded" : "open",
            },
          },
        }));
        return true;
      },
      leave: (id) => {
        const deal = SYNDICATE_DEALS.find((d) => d.id === id);
        if (!deal) return;
        const pool = get().pools[id];
        if (!pool?.youIn) return;
        const joined = Math.max(0, pool.joined - pool.yourQty);
        set((s) => ({
          pools: {
            ...s.pools,
            [id]: {
              joined,
              youIn: false,
              yourQty: 0,
              status: joined >= deal.threshold ? "funded" : "open",
            },
          },
        }));
      },
      progress: (id) => {
        const deal = SYNDICATE_DEALS.find((d) => d.id === id);
        const pool = get().pools[id];
        if (!deal || !pool) return 0;
        return Math.min(100, Math.round((pool.joined / deal.threshold) * 100));
      },
      savings: (deal) => Math.max(0, deal.retailUsd - deal.stackUsd),
    }),
    {
      name: "lvl-syndicate-v1",
      storage: storage(),
      partialize: (s) => ({ pools: s.pools }),
    },
  ),
);
