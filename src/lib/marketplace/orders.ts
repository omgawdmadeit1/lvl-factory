/**
 * Buyer order ledger (client-persisted).
 * Populated from checkout completion + optional Printify handoff metadata.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartLine } from "@/lib/store/cart";

export type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "fulfillment"
  | "shipped"
  | "complete"
  | "canceled";

export type OrderRail = "printify" | "crypto" | "card" | "agent";

export type MarketplaceOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  rail: OrderRail;
  currency: "USD";
  subtotalUsd: number;
  lines: CartLine[];
  note?: string;
  payPath?: string;
  printifyUrl?: string | null;
  trackingHint?: string;
};

interface OrdersState {
  orders: MarketplaceOrder[];
  hydrated: boolean;
  placeFromCart: (input: {
    lines: CartLine[];
    rail: OrderRail;
    payPath?: string;
    printifyUrl?: string | null;
    note?: string;
  }) => MarketplaceOrder;
  setStatus: (id: string, status: OrderStatus) => void;
  getById: (id: string) => MarketplaceOrder | undefined;
  clearAll: () => void;
}

function newId() {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      hydrated: false,
      placeFromCart: ({ lines, rail, payPath, printifyUrl, note }) => {
        const subtotalUsd = lines.reduce(
          (s, l) => s + l.priceUsd * l.qty,
          0,
        );
        const order: MarketplaceOrder = {
          id: newId(),
          createdAt: new Date().toISOString(),
          status:
            rail === "printify" ? "fulfillment" : "awaiting_payment",
          rail,
          currency: "USD",
          subtotalUsd,
          lines: lines.map((l) => ({ ...l })),
          note,
          payPath,
          printifyUrl: printifyUrl ?? null,
          trackingHint:
            rail === "printify"
              ? "Track via Printify / email after POD ships"
              : "Confirm settlement on-chain or card receipt",
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        return order;
      },
      setStatus: (id, status) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status } : o,
          ),
        })),
      getById: (id) => get().orders.find((o) => o.id === id),
      clearAll: () => set({ orders: [] }),
    }),
    {
      name: "lvl-marketplace-orders-v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: (s) => ({ orders: s.orders }),
    },
  ),
);
