/**
 * LVL Ledger — multi-rail settlement proofs (demo explorer).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type PayRail =
  | "usdc"
  | "card"
  | "apple_pay"
  | "agent_credit"
  | "printify";

export type LedgerEntry = {
  id: string;
  rail: PayRail;
  label: string;
  amountUsdc: number;
  status: "settled" | "pending" | "failed";
  ref: string;
  at: number;
  surface: string;
};

const RAILS: PayRail[] = [
  "usdc",
  "card",
  "apple_pay",
  "agent_credit",
  "printify",
];

const SURFACES = [
  "shop",
  "drops",
  "exchange",
  "bounty",
  "vault",
  "signal",
  "syndicate",
];

function seedEntries(): LedgerEntry[] {
  // Deterministic seed for SSR safety
  const out: LedgerEntry[] = [];
  for (let i = 0; i < 12; i++) {
    const rail = RAILS[i % RAILS.length]!;
    const surface = SURFACES[i % SURFACES.length]!;
    const amount = 12 + ((i * 17) % 90) + (i % 3) * 0.25;
    out.push({
      id: `ld-seed-${i}`,
      rail,
      label: `${surface} · ${rail.replace("_", " ")}`,
      amountUsdc: Math.round(amount * 100) / 100,
      status: i % 7 === 0 ? "pending" : i % 11 === 0 ? "failed" : "settled",
      ref: `0xLVL${(0x1000 + i * 97).toString(16).toUpperCase()}`,
      at: 1_700_000_000_000 + i * 86_400_000,
      surface,
    });
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

interface LedgerState {
  entries: LedgerEntry[];
  filter: PayRail | "all";
  setFilter: (f: PayRail | "all") => void;
  record: (partial: {
    rail: PayRail;
    label: string;
    amountUsdc: number;
    surface: string;
  }) => LedgerEntry;
  settledTotal: () => number;
  pendingCount: () => number;
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set, get) => ({
      entries: seedEntries(),
      filter: "all",
      setFilter: (f) => set({ filter: f }),
      record: ({ rail, label, amountUsdc, surface }) => {
        const entry: LedgerEntry = {
          id: `ld-${Date.now().toString(36)}`,
          rail,
          label,
          amountUsdc,
          status: "settled",
          ref: `0xLVL${Date.now().toString(16).toUpperCase().slice(-8)}`,
          at: Date.now(),
          surface,
        };
        set((s) => ({ entries: [entry, ...s.entries].slice(0, 60) }));
        return entry;
      },
      settledTotal: () =>
        Math.round(
          get()
            .entries.filter((e) => e.status === "settled")
            .reduce((s, e) => s + e.amountUsdc, 0) * 100,
        ) / 100,
      pendingCount: () =>
        get().entries.filter((e) => e.status === "pending").length,
    }),
    {
      name: "lvl-ledger-v1",
      storage: storage(),
      partialize: (s) => ({ entries: s.entries }),
    },
  ),
);

export const LEDGER_RAILS: { id: PayRail | "all"; label: string }[] = [
  { id: "all", label: "All rails" },
  { id: "usdc", label: "USDC" },
  { id: "card", label: "Card" },
  { id: "apple_pay", label: "Apple Pay" },
  { id: "agent_credit", label: "Agent credit" },
  { id: "printify", label: "Printify POD" },
];
