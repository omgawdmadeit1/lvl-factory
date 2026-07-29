import { useEffect } from "react";
import {
  ensureWishlistHydrated,
  useWishlistStore,
} from "@/lib/store/wishlist";

/** Mount in StoreShell — rehydrates wishlist from localStorage + cookie. */
export function WishlistHydrate() {
  useEffect(() => {
    ensureWishlistHydrated();
    // listen for multi-tab updates
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lvl-store-wishlist-v2" || e.key === "lvl-store-wishlist-v1") {
        void useWishlistStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
