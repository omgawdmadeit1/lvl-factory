/**
 * LVL Vault — hold digital IP: licenses, design rights, music kits, blueprints.
 * Claim royalty streams (demo USDC) and transfer seats.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type VaultAssetClass =
  | "skill"
  | "music"
  | "agent_license"
  | "design_right"
  | "blueprint";

export type VaultAsset = {
  id: string;
  symbol: string;
  title: string;
  class: VaultAssetClass;
  blurb: string;
  /** Floor / mid USDC */
  valueUsdc: number;
  /** Accruing royalty rate % of secondary */
  royaltyBps: number;
  /** Seed accrued royalties */
  seedAccrued: number;
};

export type VaultHolding = {
  assetId: string;
  qty: number;
  accruedUsdc: number;
  claimedUsdc: number;
};

export const VAULT_CATALOG: VaultAsset[] = [
  {
    id: "va-skl-t1",
    symbol: "SKL-T1",
    title: "Tier 1 Skill Pack",
    class: "skill",
    blurb: "Transferable skill export license · secondary on Exchange.",
    valueUsdc: 48,
    royaltyBps: 250,
    seedAccrued: 3.2,
  },
  {
    id: "va-agt-pro",
    symbol: "AGT-PRO",
    title: "Agent Pro License",
    class: "agent_license",
    blurb: "Commercial A2A seat · multi-rail settle rights.",
    valueUsdc: 120,
    royaltyBps: 400,
    seedAccrued: 11.5,
  },
  {
    id: "va-dsn-se",
    symbol: "DSN-SE",
    title: "Soft Era Design Right",
    class: "design_right",
    blurb: "Print-ready exclusive · POD royalty share.",
    valueUsdc: 75,
    royaltyBps: 500,
    seedAccrued: 6.8,
  },
  {
    id: "va-msc-wv",
    symbol: "MSC-WV",
    title: "Wave Music Release Kit",
    class: "music",
    blurb: "Stems + cover + listing pack rights.",
    valueUsdc: 32,
    royaltyBps: 300,
    seedAccrued: 1.4,
  },
  {
    id: "va-bp-night",
    symbol: "BP-NOPS",
    title: "Night Ops Blueprint",
    class: "blueprint",
    blurb: "Merch blueprint for reflective operator mark.",
    valueUsdc: 55,
    royaltyBps: 350,
    seedAccrued: 2.1,
  },
];

function seedHoldings(): Record<string, VaultHolding> {
  // Start with one free demo seat so vault is never empty
  return {
    "va-skl-t1": {
      assetId: "va-skl-t1",
      qty: 1,
      accruedUsdc: 3.2,
      claimedUsdc: 0,
    },
  };
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

interface VaultState {
  holdings: Record<string, VaultHolding>;
  walletUsdc: number;
  mint: (assetId: string) => boolean;
  claimRoyalties: (assetId: string) => number;
  tickAccrue: () => void;
  portfolioValue: () => number;
  unclaimed: () => number;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      holdings: seedHoldings(),
      walletUsdc: 200,
      mint: (assetId) => {
        const asset = VAULT_CATALOG.find((a) => a.id === assetId);
        if (!asset) return false;
        if (get().walletUsdc < asset.valueUsdc) return false;
        set((s) => {
          const h = s.holdings[assetId];
          return {
            walletUsdc: s.walletUsdc - asset.valueUsdc,
            holdings: {
              ...s.holdings,
              [assetId]: {
                assetId,
                qty: (h?.qty ?? 0) + 1,
                accruedUsdc: h?.accruedUsdc ?? asset.seedAccrued * 0.1,
                claimedUsdc: h?.claimedUsdc ?? 0,
              },
            },
          };
        });
        return true;
      },
      claimRoyalties: (assetId) => {
        const h = get().holdings[assetId];
        if (!h || h.accruedUsdc <= 0) return 0;
        const amt = Math.round(h.accruedUsdc * 100) / 100;
        set((s) => ({
          walletUsdc: s.walletUsdc + amt,
          holdings: {
            ...s.holdings,
            [assetId]: {
              ...h,
              accruedUsdc: 0,
              claimedUsdc: h.claimedUsdc + amt,
            },
          },
        }));
        return amt;
      },
      tickAccrue: () => {
        set((s) => {
          const next = { ...s.holdings };
          for (const [id, h] of Object.entries(next)) {
            const asset = VAULT_CATALOG.find((a) => a.id === id);
            if (!asset || h.qty <= 0) continue;
            const drip =
              (asset.valueUsdc * asset.royaltyBps) / 10_000 / 120; // slow drip
            next[id] = {
              ...h,
              accruedUsdc: Math.round((h.accruedUsdc + drip * h.qty) * 1000) / 1000,
            };
          }
          return { holdings: next };
        });
      },
      portfolioValue: () => {
        let v = 0;
        for (const h of Object.values(get().holdings)) {
          const a = VAULT_CATALOG.find((x) => x.id === h.assetId);
          if (a) v += a.valueUsdc * h.qty + h.accruedUsdc;
        }
        return Math.round(v * 100) / 100;
      },
      unclaimed: () =>
        Math.round(
          Object.values(get().holdings).reduce((s, h) => s + h.accruedUsdc, 0) *
            100,
        ) / 100,
    }),
    {
      name: "lvl-vault-v1",
      storage: storage(),
      partialize: (s) => ({
        holdings: s.holdings,
        walletUsdc: s.walletUsdc,
      }),
    },
  ),
);
