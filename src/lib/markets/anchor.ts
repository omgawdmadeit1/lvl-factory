/**
 * LVL Anchor — subscription restock boxes / recurring commerce.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AnchorPlan = {
  id: string;
  name: string;
  blurb: string;
  cadence: "weekly" | "biweekly" | "monthly";
  priceUsdc: number;
  perks: string[];
  badge: string;
  heat: number;
};

export const ANCHOR_PLANS: AnchorPlan[] = [
  {
    id: "an-tee-club",
    name: "Tee Club",
    blurb: "One statement tee every month — city + flash mix.",
    cadence: "monthly",
    priceUsdc: 38,
    perks: ["Size lock", "Early drop codes", "Free swaps 1×"],
    badge: "Core",
    heat: 82,
  },
  {
    id: "an-ops-box",
    name: "Night Ops box",
    blurb: "Biweekly operator pack — stickers, tee, or art.",
    cadence: "biweekly",
    priceUsdc: 52,
    perks: ["Whisper priority", "Arena streak boost", "Guild sample"],
    badge: "Ops",
    heat: 90,
  },
  {
    id: "an-art-plate",
    name: "Soft Era plates",
    blurb: "Monthly gallery print from Soft Era atelier.",
    cadence: "monthly",
    priceUsdc: 44,
    perks: ["Numbered editions", "Vault royalty share", "Studio credits"],
    badge: "Art",
    heat: 76,
  },
  {
    id: "an-agent-rail",
    name: "Agent rail feed",
    blurb: "Weekly skill/agent micro-pack for builders.",
    cadence: "weekly",
    priceUsdc: 18,
    perks: ["Skill seeds", "Fleet discount", "Relay intents"],
    badge: "Agent",
    heat: 85,
  },
  {
    id: "an-restock",
    name: "Restock anchor",
    blurb: "Auto-claim when radar hits your watched SKUs.",
    cadence: "monthly",
    priceUsdc: 12,
    perks: ["Radar watches ×5", "Oracle pins ×3", "Signal 1 pack/mo"],
    badge: "Utility",
    heat: 71,
  },
];

export type AnchorSub = {
  planId: string;
  since: number;
  cycles: number;
  status: "active" | "paused";
  nextShipAt: number;
};

function cadenceMs(c: AnchorPlan["cadence"]): number {
  if (c === "weekly") return 7 * 86_400_000;
  if (c === "biweekly") return 14 * 86_400_000;
  return 30 * 86_400_000;
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

interface AnchorState {
  subs: Record<string, AnchorSub>;
  walletUsdc: number;
  subscribe: (planId: string) => boolean;
  pause: (planId: string) => void;
  resume: (planId: string) => void;
  cancel: (planId: string) => void;
  tickShip: () => void;
  activeCount: () => number;
  mrr: () => number;
}

export const useAnchorStore = create<AnchorState>()(
  persist(
    (set, get) => ({
      subs: {},
      walletUsdc: 400,
      subscribe: (planId) => {
        const plan = ANCHOR_PLANS.find((p) => p.id === planId);
        if (!plan) return false;
        if (get().subs[planId]?.status === "active") return false;
        if (get().walletUsdc < plan.priceUsdc) return false;
        const now = Date.now();
        set((s) => ({
          walletUsdc: s.walletUsdc - plan.priceUsdc,
          subs: {
            ...s.subs,
            [planId]: {
              planId,
              since: now,
              cycles: 1,
              status: "active",
              nextShipAt: now + cadenceMs(plan.cadence),
            },
          },
        }));
        return true;
      },
      pause: (planId) =>
        set((s) => {
          const sub = s.subs[planId];
          if (!sub) return s;
          return {
            subs: {
              ...s.subs,
              [planId]: { ...sub, status: "paused" },
            },
          };
        }),
      resume: (planId) =>
        set((s) => {
          const sub = s.subs[planId];
          if (!sub) return s;
          const plan = ANCHOR_PLANS.find((p) => p.id === planId);
          if (!plan) return s;
          return {
            subs: {
              ...s.subs,
              [planId]: {
                ...sub,
                status: "active",
                nextShipAt: Date.now() + cadenceMs(plan.cadence),
              },
            },
          };
        }),
      cancel: (planId) =>
        set((s) => {
          const next = { ...s.subs };
          delete next[planId];
          return { subs: next };
        }),
      tickShip: () => {
        const now = Date.now();
        set((s) => {
          const next = { ...s.subs };
          let wallet = s.walletUsdc;
          for (const [id, sub] of Object.entries(next)) {
            if (sub.status !== "active") continue;
            if (now < sub.nextShipAt) continue;
            const plan = ANCHOR_PLANS.find((p) => p.id === id);
            if (!plan) continue;
            if (wallet < plan.priceUsdc) {
              next[id] = { ...sub, status: "paused" };
              continue;
            }
            wallet -= plan.priceUsdc;
            next[id] = {
              ...sub,
              cycles: sub.cycles + 1,
              nextShipAt: now + cadenceMs(plan.cadence),
            };
          }
          return { subs: next, walletUsdc: wallet };
        });
      },
      activeCount: () =>
        Object.values(get().subs).filter((s) => s.status === "active").length,
      mrr: () => {
        let m = 0;
        for (const sub of Object.values(get().subs)) {
          if (sub.status !== "active") continue;
          const plan = ANCHOR_PLANS.find((p) => p.id === sub.planId);
          if (!plan) continue;
          if (plan.cadence === "weekly") m += plan.priceUsdc * 4;
          else if (plan.cadence === "biweekly") m += plan.priceUsdc * 2;
          else m += plan.priceUsdc;
        }
        return Math.round(m * 100) / 100;
      },
    }),
    {
      name: "lvl-anchor-v1",
      storage: storage(),
      partialize: (s) => ({
        subs: s.subs,
        walletUsdc: s.walletUsdc,
      }),
    },
  ),
);
