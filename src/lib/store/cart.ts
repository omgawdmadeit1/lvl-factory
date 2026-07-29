import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MerchProduct } from "@/lib/merch/types";

export type CartSize = "S" | "M" | "L" | "XL" | "XXL" | "OS";

export interface CartLine {
  key: string;
  productId: string;
  sku: string;
  slug: string;
  title: string;
  priceUsd: number;
  mockupUrl: string;
  printifyUrl: string | null;
  size: CartSize;
  qty: number;
  agentShopable: boolean;
}

interface CartState {
  lines: CartLine[];
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  add: (
    product: MerchProduct,
    opts?: { size?: CartSize; qty?: number },
  ) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

function lineKey(productId: string, size: CartSize) {
  return `${productId}::${size}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      add: (product, opts) => {
        const size = opts?.size ?? (product.kind === "poster" || product.kind === "canvas" ? "OS" : "M");
        const qty = Math.max(1, opts?.qty ?? 1);
        const key = lineKey(product.id, size);
        set((state) => {
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, qty: l.qty + qty } : l,
              ),
              drawerOpen: true,
            };
          }
          const line: CartLine = {
            key,
            productId: product.id,
            sku: product.sku,
            slug: product.slug,
            title: product.title,
            priceUsd: product.priceUsd,
            mockupUrl: product.mockupUrl,
            printifyUrl: product.printifyUrl,
            size,
            qty,
            agentShopable: product.agentShopable,
          };
          return { lines: [...state.lines, line], drawerOpen: true };
        });
      },
      setQty: (key, qty) => {
        if (qty <= 0) {
          get().remove(key);
          return;
        }
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
        }));
      },
      remove: (key) =>
        set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      count: () => get().lines.reduce((n, l) => n + l.qty, 0),
      subtotal: () =>
        get().lines.reduce((n, l) => n + l.priceUsd * l.qty, 0),
    }),
    {
      name: "lvl-store-cart-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
);
