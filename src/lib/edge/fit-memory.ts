/**
 * Persist fit assistant prefs so PDP + checkout reuse size heuristics.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FitPrefs = {
  height: string;
  fit: "slim" | "regular" | "relaxed";
  weightBand: "light" | "mid" | "solid";
  lastSize: string | null;
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

interface FitMemoryState extends FitPrefs {
  hydrated: boolean;
  setPrefs: (p: Partial<FitPrefs>) => void;
  rememberSize: (size: string) => void;
}

export const useFitMemoryStore = create<FitMemoryState>()(
  persist(
    (set) => ({
      height: "5'10\"",
      fit: "regular",
      weightBand: "mid",
      lastSize: null,
      hydrated: false,
      setPrefs: (p) => set((s) => ({ ...s, ...p })),
      rememberSize: (size) => set({ lastSize: size }),
    }),
    {
      name: "lvl-fit-memory-v1",
      storage: storage(),
      partialize: (s) => ({
        height: s.height,
        fit: s.fit,
        weightBand: s.weightBand,
        lastSize: s.lastSize,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
