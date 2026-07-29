/**
 * Restock radar — watch drops / SKUs for return windows (client alerts).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type RadarWatch = {
  id: string;
  productSlug: string;
  title: string;
  createdAt: string;
  source: "drop" | "pdp" | "manual";
  notified: boolean;
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

function wid() {
  return `rad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

interface RadarState {
  watches: RadarWatch[];
  hydrated: boolean;
  watch: (input: {
    productSlug: string;
    title: string;
    source?: RadarWatch["source"];
  }) => RadarWatch;
  unwatch: (id: string) => void;
  has: (productSlug: string) => boolean;
  markNotified: (id: string) => void;
  clear: () => void;
}

export const useRadarStore = create<RadarState>()(
  persist(
    (set, get) => ({
      watches: [],
      hydrated: false,
      watch: ({ productSlug, title, source = "manual" }) => {
        const existing = get().watches.find(
          (w) => w.productSlug === productSlug,
        );
        if (existing) return existing;
        const w: RadarWatch = {
          id: wid(),
          productSlug,
          title,
          createdAt: new Date().toISOString(),
          source,
          notified: false,
        };
        set((s) => ({ watches: [w, ...s.watches].slice(0, 40) }));
        return w;
      },
      unwatch: (id) =>
        set((s) => ({ watches: s.watches.filter((w) => w.id !== id) })),
      has: (productSlug) =>
        get().watches.some((w) => w.productSlug === productSlug),
      markNotified: (id) =>
        set((s) => ({
          watches: s.watches.map((w) =>
            w.id === id ? { ...w, notified: true } : w,
          ),
        })),
      clear: () => set({ watches: [] }),
    }),
    {
      name: "lvl-radar-v1",
      storage: storage(),
      partialize: (s) => ({ watches: s.watches }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
