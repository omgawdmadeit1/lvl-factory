/**
 * Network pulse — live-feeling activity stream for the LVL domain.
 * Mixes seeded demo events with real local actions (cart, drops, orders).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type PulseKind =
  | "purchase"
  | "drop_claim"
  | "agent_buy"
  | "publish"
  | "referral"
  | "studio"
  | "settle";

export type PulseEvent = {
  id: string;
  at: string;
  kind: PulseKind;
  host: string;
  message: string;
  meta?: string;
};

const SEED: Omit<PulseEvent, "id" | "at">[] = [
  {
    kind: "agent_buy",
    host: "agents.lvlltd.com",
    message: "Agent claimed SEROTONIN DEALER · Base USDC",
    meta: "0.03s settle intent",
  },
  {
    kind: "purchase",
    host: "shop.lvlltd.com",
    message: "Boston Native tee headed to Printify POD",
    meta: "checkout.lvlltd.com",
  },
  {
    kind: "drop_claim",
    host: "drops.lvlltd.com",
    message: "MAIN CHARACTER Midnight — 3 units left",
    meta: "flash window",
  },
  {
    kind: "settle",
    host: "pay.lvlltd.com",
    message: "Multi-rail settle on Base · skill canary",
    meta: "8453",
  },
  {
    kind: "publish",
    host: "seller.lvlltd.com",
    message: "Pipeline published Soft Era art plate",
    meta: "Imagine → Printify",
  },
  {
    kind: "studio",
    host: "studio.lvlltd.com",
    message: "New design brief queued for edge node poster",
    meta: "studio",
  },
  {
    kind: "referral",
    host: "account.lvlltd.com",
    message: "LVLWAVE referral unlocked 25 credits",
    meta: "loyalty",
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

function pid() {
  return `px_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function seedEvents(): PulseEvent[] {
  const now = Date.now();
  return SEED.map((s, i) => ({
    ...s,
    id: `seed_${i}`,
    at: new Date(now - (i + 1) * 7 * 60 * 1000).toISOString(),
  }));
}

interface PulseState {
  events: PulseEvent[];
  hydrated: boolean;
  push: (input: Omit<PulseEvent, "id" | "at"> & { at?: string }) => void;
  feed: () => PulseEvent[];
}

export const usePulseStore = create<PulseState>()(
  persist(
    (set, get) => ({
      events: seedEvents(),
      hydrated: false,
      push: (input) => {
        const ev: PulseEvent = {
          id: pid(),
          at: input.at ?? new Date().toISOString(),
          kind: input.kind,
          host: input.host,
          message: input.message,
          meta: input.meta,
        };
        set((s) => ({ events: [ev, ...s.events].slice(0, 80) }));
      },
      feed: () => get().events,
    }),
    {
      name: "lvl-pulse-v1",
      storage: storage(),
      partialize: (s) => ({ events: s.events.slice(0, 80) }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          if (!state.events.length) state.events = seedEvents();
        }
      },
    },
  ),
);

export function kindLabel(kind: PulseKind): string {
  switch (kind) {
    case "purchase":
      return "Buy";
    case "drop_claim":
      return "Drop";
    case "agent_buy":
      return "Agent";
    case "publish":
      return "Publish";
    case "referral":
      return "Referral";
    case "studio":
      return "Studio";
    case "settle":
      return "Settle";
    default:
      return "Pulse";
  }
}
