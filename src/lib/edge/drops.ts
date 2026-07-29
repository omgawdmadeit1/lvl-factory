/**
 * Live flash drops — timed limited inventory for LVL Store.
 * Client-persisted remaining units; seed inventory is deterministic per drop.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type DropStatus = "upcoming" | "live" | "ended" | "sold_out";

export type LiveDrop = {
  id: string;
  slug: string;
  productSlug: string;
  title: string;
  blurb: string;
  /** ISO start */
  startsAt: string;
  /** ISO end */
  endsAt: string;
  /** Total units at seed */
  supply: number;
  priceUsd: number;
  badge: string;
  accent: "info" | "warning" | "success";
};

/** Rolling 48h window of demo drops (relative to first visit epoch stored) */
export const DROP_CATALOG: Omit<LiveDrop, never>[] = [
  {
    id: "drop-main-character-midnight",
    slug: "main-character-midnight",
    productSlug: "main-character",
    title: "MAIN CHARACTER · Midnight",
    blurb: "48-unit black plate. Statement chest print. Agent shopable.",
    startsAt: "", // filled at runtime from epoch
    endsAt: "",
    supply: 48,
    priceUsd: 29.99,
    badge: "Flash",
    accent: "warning",
  },
  {
    id: "drop-boston-native-wave",
    slug: "boston-native-wave",
    productSlug: "boston-native-logo-t-shirt",
    title: "Boston Native · Wave",
    blurb: "City mark restock. Limited 72 units while the window is open.",
    startsAt: "",
    endsAt: "",
    supply: 72,
    priceUsd: 25.99,
    badge: "City",
    accent: "info",
  },
  {
    id: "drop-soft-era-gallery",
    slug: "soft-era-gallery",
    productSlug: "soft-era",
    title: "SOFT ERA · Gallery",
    blurb: "Editorial print drop. 36 signed-edition-style units.",
    startsAt: "",
    endsAt: "",
    supply: 36,
    priceUsd: 32.99,
    badge: "Art",
    accent: "success",
  },
  {
    id: "drop-serotonin-pulse",
    slug: "serotonin-pulse",
    productSlug: "serotonin-dealer",
    title: "SEROTONIN DEALER · Pulse",
    blurb: "Weekend only. Soft threat, hard drip.",
    startsAt: "",
    endsAt: "",
    supply: 40,
    priceUsd: 29.99,
    badge: "Weekend",
    accent: "warning",
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

/** Build timed windows from a fixed epoch so SSR + client match after hydrate */
export function materializeDrops(epochMs: number): LiveDrop[] {
  const day = 24 * 60 * 60 * 1000;
  return DROP_CATALOG.map((d, i) => {
    const startOffset = (i - 1) * 18 * 60 * 60 * 1000; // staggered
    const duration = day + i * 6 * 60 * 60 * 1000;
    const startsAt = new Date(epochMs + startOffset).toISOString();
    const endsAt = new Date(epochMs + startOffset + duration).toISOString();
    return { ...d, startsAt, endsAt };
  });
}

export function dropStatus(drop: LiveDrop, now = Date.now()): DropStatus {
  const start = Date.parse(drop.startsAt);
  const end = Date.parse(drop.endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return "ended";
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "live";
}

export function formatCountdown(targetIso: string, now = Date.now()): string {
  const t = Date.parse(targetIso) - now;
  if (t <= 0) return "00:00:00";
  const s = Math.floor(t / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

interface DropsState {
  epochMs: number;
  remaining: Record<string, number>;
  claimed: string[];
  hydrated: boolean;
  ensureEpoch: () => void;
  remainingOf: (id: string, supply: number) => number;
  claim: (id: string, supply: number, qty?: number) => boolean;
  statusOf: (drop: LiveDrop) => DropStatus;
}

export const useDropsStore = create<DropsState>()(
  persist(
    (set, get) => ({
      epochMs: 0,
      remaining: {},
      claimed: [],
      hydrated: false,
      ensureEpoch: () => {
        if (get().epochMs) return;
        // Anchor near "now" so first drop is live, others staggered
        const epoch = Date.now() - 4 * 60 * 60 * 1000;
        set({ epochMs: epoch });
      },
      remainingOf: (id, supply) => {
        const r = get().remaining[id];
        return typeof r === "number" ? r : supply;
      },
      claim: (id, supply, qty = 1) => {
        const left = get().remainingOf(id, supply);
        if (left < qty) return false;
        set((s) => ({
          remaining: { ...s.remaining, [id]: left - qty },
          claimed: s.claimed.includes(id) ? s.claimed : [...s.claimed, id],
        }));
        return true;
      },
      statusOf: (drop) => {
        const left = get().remainingOf(drop.id, drop.supply);
        if (left <= 0) return "sold_out";
        return dropStatus(drop);
      },
    }),
    {
      name: "lvl-drops-v1",
      storage: storage(),
      partialize: (s) => ({
        epochMs: s.epochMs,
        remaining: s.remaining,
        claimed: s.claimed,
      }),
      onRehydrateStorage: () => (state) => {
        state?.ensureEpoch();
        if (state) state.hydrated = true;
      },
    },
  ),
);
