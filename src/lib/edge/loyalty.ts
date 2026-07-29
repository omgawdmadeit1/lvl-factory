/**
 * LVL Credits + referral loyalty — client ledger.
 * Earn on order placement; redeem as demo credit on checkout note.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type LoyaltyTier = "spark" | "signal" | "orbit" | "apex";

export const TIER_THRESHOLDS: { tier: LoyaltyTier; min: number; label: string }[] =
  [
    { tier: "spark", min: 0, label: "Spark" },
    { tier: "signal", min: 50, label: "Signal" },
    { tier: "orbit", min: 200, label: "Orbit" },
    { tier: "apex", min: 500, label: "Apex" },
  ];

export function tierFor(pointsLifetime: number): (typeof TIER_THRESHOLDS)[number] {
  let current = TIER_THRESHOLDS[0];
  for (const t of TIER_THRESHOLDS) {
    if (pointsLifetime >= t.min) current = t;
  }
  return current;
}

/** Earn rate: 1 credit per $1 spent (face USD) */
export function creditsForSpend(usd: number): number {
  return Math.max(0, Math.floor(usd));
}

export const REFERRAL_CODES: Record<
  string,
  { bonus: number; label: string }
> = {
  LVLWAVE: { bonus: 25, label: "Wave invite" },
  AGENTX: { bonus: 40, label: "Agent builder" },
  BOSTON: { bonus: 20, label: "Boston Native" },
  SOFTERA: { bonus: 30, label: "Soft Era" },
};

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

export type LoyaltyEvent = {
  id: string;
  at: string;
  kind: "earn" | "redeem" | "referral" | "drop_bonus";
  amount: number;
  note: string;
};

interface LoyaltyState {
  balance: number;
  lifetime: number;
  referralCode: string | null;
  events: LoyaltyEvent[];
  hydrated: boolean;
  earn: (amount: number, note: string, kind?: LoyaltyEvent["kind"]) => void;
  redeem: (amount: number, note: string) => boolean;
  applyReferral: (code: string) => { ok: boolean; message: string };
  tier: () => ReturnType<typeof tierFor>;
}

function eid() {
  return `ly_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const useLoyaltyStore = create<LoyaltyState>()(
  persist(
    (set, get) => ({
      balance: 0,
      lifetime: 0,
      referralCode: null,
      events: [],
      hydrated: false,
      earn: (amount, note, kind = "earn") => {
        if (amount <= 0) return;
        const ev: LoyaltyEvent = {
          id: eid(),
          at: new Date().toISOString(),
          kind,
          amount,
          note,
        };
        set((s) => ({
          balance: s.balance + amount,
          lifetime: s.lifetime + amount,
          events: [ev, ...s.events].slice(0, 40),
        }));
      },
      redeem: (amount, note) => {
        const bal = get().balance;
        if (amount <= 0 || amount > bal) return false;
        const ev: LoyaltyEvent = {
          id: eid(),
          at: new Date().toISOString(),
          kind: "redeem",
          amount: -amount,
          note,
        };
        set((s) => ({
          balance: s.balance - amount,
          events: [ev, ...s.events].slice(0, 40),
        }));
        return true;
      },
      applyReferral: (code) => {
        const normalized = code.trim().toUpperCase();
        if (get().referralCode) {
          return { ok: false, message: "Referral already applied on this device" };
        }
        const hit = REFERRAL_CODES[normalized];
        if (!hit) return { ok: false, message: "Unknown code" };
        get().earn(hit.bonus, `${hit.label} (${normalized})`, "referral");
        set({ referralCode: normalized });
        return { ok: true, message: `+${hit.bonus} credits · ${hit.label}` };
      },
      tier: () => tierFor(get().lifetime),
    }),
    {
      name: "lvl-loyalty-v1",
      storage: storage(),
      partialize: (s) => ({
        balance: s.balance,
        lifetime: s.lifetime,
        referralCode: s.referralCode,
        events: s.events,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
