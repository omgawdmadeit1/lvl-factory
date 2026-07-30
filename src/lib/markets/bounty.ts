/**
 * LVL Bounty — task escrow for agent + human commerce ops.
 * Post or claim bounties; demo escrow settles in USDC.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BountyStatus = "open" | "claimed" | "submitted" | "paid" | "expired";

export type BountySkill =
  | "drop_claim"
  | "restock"
  | "support"
  | "design"
  | "market_make"
  | "research";

export type Bounty = {
  id: string;
  title: string;
  blurb: string;
  skill: BountySkill;
  rewardUsdc: number;
  /** Hours to complete after claim */
  slaHours: number;
  poster: string;
  badge: string;
};

export type BountyRuntime = {
  status: BountyStatus;
  claimer: string | null;
  claimedAt: number | null;
  submittedAt: number | null;
  progress: number;
};

export const BOUNTY_CATALOG: Bounty[] = [
  {
    id: "bn-drop-midnight",
    title: "Claim Midnight drop · 3 units",
    blurb: "Watch drops.lvlltd.com and claim MAIN CHARACTER when live. Proof: cart screenshot hash.",
    skill: "drop_claim",
    rewardUsdc: 12,
    slaHours: 6,
    poster: "ops@lvl",
    badge: "Drops",
  },
  {
    id: "bn-restock-radar",
    title: "Restock watch · Soft Era",
    blurb: "Wire radar alert + first-claim bot for Soft Era gallery plate.",
    skill: "restock",
    rewardUsdc: 18,
    slaHours: 24,
    poster: "buyer-desk",
    badge: "Radar",
  },
  {
    id: "bn-support-queue",
    title: "Clear support queue · 20 tickets",
    blurb: "Agent or human — resolve order status tickets with template replies.",
    skill: "support",
    rewardUsdc: 25,
    slaHours: 12,
    poster: "cx@lvl",
    badge: "Support",
  },
  {
    id: "bn-design-brief",
    title: "Studio brief → mockup",
    blurb: "Run Imagine brief for NIGHT OPS reflective mark. Deliver mockup path.",
    skill: "design",
    rewardUsdc: 40,
    slaHours: 48,
    poster: "brand",
    badge: "Studio",
  },
  {
    id: "bn-mm-skl",
    title: "Market-make SKL-T1",
    blurb: "Provide 2-sided quotes on Exchange for Tier 1 Skill for 4 hours.",
    skill: "market_make",
    rewardUsdc: 55,
    slaHours: 4,
    poster: "exchange",
    badge: "Exchange",
  },
  {
    id: "bn-research-mesh",
    title: "Domain mesh competitive scan",
    blurb: "Research 5 rival agent commerce networks. 1-page memo.",
    skill: "research",
    rewardUsdc: 30,
    slaHours: 72,
    poster: "strategy",
    badge: "Research",
  },
];

function seedRuntime(id: string): BountyRuntime {
  // Mostly open; one pre-claimed for demo realism via hash
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  if (h % 7 === 0) {
    return {
      status: "claimed",
      claimer: "fleet-bot",
      claimedAt: Date.now() - 3_600_000,
      submittedAt: null,
      progress: 35,
    };
  }
  return {
    status: "open",
    claimer: null,
    claimedAt: null,
    submittedAt: null,
    progress: 0,
  };
}

function defaultRuntime(): Record<string, BountyRuntime> {
  const out: Record<string, BountyRuntime> = {};
  for (const b of BOUNTY_CATALOG) out[b.id] = seedRuntime(b.id);
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

interface BountyState {
  runtime: Record<string, BountyRuntime>;
  walletUsdc: number;
  earnedUsdc: number;
  claim: (id: string, as?: string) => boolean;
  submit: (id: string) => boolean;
  pay: (id: string) => boolean;
  tick: () => void;
}

export const useBountyStore = create<BountyState>()(
  persist(
    (set, get) => ({
      runtime: defaultRuntime(),
      walletUsdc: 250,
      earnedUsdc: 0,
      claim: (id, as = "you") => {
        const r = get().runtime[id] ?? seedRuntime(id);
        if (r.status !== "open") return false;
        set((s) => ({
          runtime: {
            ...s.runtime,
            [id]: {
              status: "claimed",
              claimer: as,
              claimedAt: Date.now(),
              submittedAt: null,
              progress: 8,
            },
          },
        }));
        return true;
      },
      submit: (id) => {
        const r = get().runtime[id];
        if (!r || r.status !== "claimed" || r.claimer !== "you") return false;
        set((s) => ({
          runtime: {
            ...s.runtime,
            [id]: {
              ...r,
              status: "submitted",
              submittedAt: Date.now(),
              progress: 100,
            },
          },
        }));
        return true;
      },
      pay: (id) => {
        const b = BOUNTY_CATALOG.find((x) => x.id === id);
        const r = get().runtime[id];
        if (!b || !r || r.status !== "submitted" || r.claimer !== "you") return false;
        if (get().walletUsdc < 0) return false;
        set((s) => ({
          runtime: {
            ...s.runtime,
            [id]: { ...r, status: "paid", progress: 100 },
          },
          earnedUsdc: s.earnedUsdc + b.rewardUsdc,
        }));
        return true;
      },
      tick: () => {
        set((s) => {
          const next = { ...s.runtime };
          for (const [id, r] of Object.entries(next)) {
            if (r.status === "claimed" && r.claimer) {
              next[id] = {
                ...r,
                progress: Math.min(95, r.progress + (r.claimer === "you" ? 4 : 6)),
              };
            }
          }
          return { runtime: next };
        });
      },
    }),
    {
      name: "lvl-bounty-v1",
      storage: storage(),
      partialize: (s) => ({
        runtime: s.runtime,
        earnedUsdc: s.earnedUsdc,
        walletUsdc: s.walletUsdc,
      }),
    },
  ),
);
