/**
 * Cart price holds — lock a cart subtotal for a short window (FOMO / drop UX).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const HOLD_MS = 15 * 60 * 1000;

export type PriceHold = {
  id: string;
  createdAt: string;
  expiresAt: string;
  subtotalUsd: number;
  lineKeys: string[];
  note: string;
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

function hid() {
  return `hold_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

interface HoldsState {
  hold: PriceHold | null;
  hydrated: boolean;
  createHold: (input: {
    subtotalUsd: number;
    lineKeys: string[];
    note?: string;
  }) => PriceHold | null;
  clear: () => void;
  active: (now?: number) => PriceHold | null;
  remainingMs: (now?: number) => number;
}

export const useHoldsStore = create<HoldsState>()(
  persist(
    (set, get) => ({
      hold: null,
      hydrated: false,
      createHold: ({ subtotalUsd, lineKeys, note }) => {
        if (subtotalUsd <= 0 || !lineKeys.length) return null;
        const now = Date.now();
        const hold: PriceHold = {
          id: hid(),
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + HOLD_MS).toISOString(),
          subtotalUsd: Math.round(subtotalUsd * 100) / 100,
          lineKeys: [...lineKeys],
          note: note ?? "Cart price lock",
        };
        set({ hold });
        return hold;
      },
      clear: () => set({ hold: null }),
      active: (now = Date.now()) => {
        const h = get().hold;
        if (!h) return null;
        if (Date.parse(h.expiresAt) <= now) {
          set({ hold: null });
          return null;
        }
        return h;
      },
      remainingMs: (now = Date.now()) => {
        const h = get().active(now);
        if (!h) return 0;
        return Math.max(0, Date.parse(h.expiresAt) - now);
      },
    }),
    {
      name: "lvl-holds-v1",
      storage: storage(),
      partialize: (s) => ({ hold: s.hold }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function formatHoldCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
