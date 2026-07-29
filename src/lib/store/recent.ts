import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MAX = 12;

interface RecentState {
  slugs: string[];
  push: (slug: string) => void;
  clear: () => void;
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set, get) => ({
      slugs: [],
      push: (slug) => {
        if (!slug) return;
        const next = [slug, ...get().slugs.filter((s) => s !== slug)].slice(
          0,
          MAX,
        );
        set({ slugs: next });
      },
      clear: () => set({ slugs: [] }),
    }),
    {
      name: "lvl-store-recent-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
