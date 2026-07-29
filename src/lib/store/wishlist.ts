import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { MerchProduct } from "@/lib/merch/types";

const STORAGE_KEY = "lvl-store-wishlist-v2";
const COOKIE_KEY = "lvl_wishlist_v2";
const MAX_ITEMS = 48;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export interface WishlistItem {
  id: string;
  slug: string;
  title: string;
  priceUsd: number;
  mockupUrl: string;
  kind: MerchProduct["kind"];
  sku: string;
  savedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  /** True after localStorage/cookie rehydrate on the client */
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  toggle: (product: MerchProduct) => void;
  add: (product: MerchProduct) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
  count: () => number;
  ids: () => string[];
  /** Merge remote/catalog product if still published */
  resolve: (catalog: MerchProduct[]) => MerchProduct[];
}

function productToItem(product: MerchProduct): WishlistItem {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    priceUsd: product.priceUsd,
    mockupUrl: product.mockupUrl,
    kind: product.kind,
    sku: product.sku,
    savedAt: new Date().toISOString(),
  };
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split("=").slice(1).join("="));
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/** localStorage primary + cookie backup */
const dualStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    try {
      const ls = window.localStorage.getItem(name);
      if (ls != null) return ls;
    } catch {
      /* private mode */
    }
    const cookie = readCookie(COOKIE_KEY);
    if (cookie) return cookie;
    try {
      const legacy = window.localStorage.getItem("lvl-store-wishlist-v1");
      if (legacy) {
        const parsed = JSON.parse(legacy) as {
          state?: { ids?: string[] };
          ids?: string[];
        };
        const ids = parsed.state?.ids ?? parsed.ids ?? [];
        if (Array.isArray(ids) && ids.length) {
          return JSON.stringify({
            state: {
              items: ids.map((id) => ({
                id,
                slug: id,
                title: id,
                priceUsd: 0,
                mockupUrl: "",
                kind: "tee",
                sku: id,
                savedAt: new Date().toISOString(),
              })),
            },
            version: 2,
          });
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* quota / private */
    }
    try {
      const clipped = value.length > 3500 ? value.slice(0, 3500) : value;
      writeCookie(COOKIE_KEY, clipped);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
      window.localStorage.removeItem("lvl-store-wishlist-v1");
    } catch {
      /* ignore */
    }
    clearCookie(COOKIE_KEY);
  },
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      toggle: (product) => {
        if (get().has(product.id)) get().remove(product.id);
        else get().add(product);
      },
      add: (product) => {
        const items = get().items.filter((i) => i.id !== product.id);
        const next = [productToItem(product), ...items].slice(0, MAX_ITEMS);
        set({ items: next });
      },
      remove: (productId) => {
        set({ items: get().items.filter((i) => i.id !== productId) });
      },
      has: (productId) => get().items.some((i) => i.id === productId),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
      ids: () => get().items.map((i) => i.id),
      resolve: (catalog) => {
        const byId = new Map(catalog.map((p) => [p.id, p]));
        const bySlug = new Map(catalog.map((p) => [p.slug, p]));
        return get()
          .items.map((item) => byId.get(item.id) ?? bySlug.get(item.slug))
          .filter(
            (p): p is MerchProduct => Boolean(p && p.status === "published"),
          );
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => dualStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export function ensureWishlistHydrated() {
  if (typeof window === "undefined") return;
  const st = useWishlistStore.getState();
  if (st.hydrated) return;
  const result = useWishlistStore.persist.rehydrate();
  void Promise.resolve(result).finally(() => {
    useWishlistStore.getState().setHydrated(true);
  });
}
