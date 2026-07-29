import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WishlistState {
  ids: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) => {
        const ids = get().ids;
        set({
          ids: ids.includes(productId)
            ? ids.filter((id) => id !== productId)
            : [...ids, productId],
        });
      },
      has: (productId) => get().ids.includes(productId),
      clear: () => set({ ids: [] }),
      count: () => get().ids.length,
    }),
    {
      name: "lvl-store-wishlist-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
