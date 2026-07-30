/**
 * LVL Oracle — demand forecast board (demo heat + projected units).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Forecast = {
  id: string;
  sku: string;
  title: string;
  horizon: "7d" | "14d" | "30d";
  demandUnits: number;
  confidence: number;
  heat: number;
  source: string;
  action: string;
};

export const ORACLE_FORECASTS: Forecast[] = [
  {
    id: "or-soft-era",
    sku: "soft-era",
    title: "Soft Era gallery plate",
    horizon: "14d",
    demandUnits: 186,
    confidence: 82,
    heat: 88,
    source: "radar + signal",
    action: "Restock M/L · push Launch waitlist",
  },
  {
    id: "or-main-char",
    sku: "main-character",
    title: "MAIN CHARACTER flash tee",
    horizon: "7d",
    demandUnits: 240,
    confidence: 91,
    heat: 96,
    source: "drops + arena",
    action: "Open Whisper door · raise price 8%",
  },
  {
    id: "or-boston",
    sku: "boston-native",
    title: "Boston Native mark",
    horizon: "30d",
    demandUnits: 320,
    confidence: 74,
    heat: 71,
    source: "shop search",
    action: "City Mark League co-drop",
  },
  {
    id: "or-agent-pro",
    sku: "agt-pro",
    title: "Agent Pro license",
    horizon: "14d",
    demandUnits: 64,
    confidence: 79,
    heat: 80,
    source: "agents + fleet",
    action: "Bundle with skill pack",
  },
  {
    id: "or-wave-kit",
    sku: "msc-wv",
    title: "Wave music release kit",
    horizon: "30d",
    demandUnits: 98,
    confidence: 68,
    heat: 62,
    source: "music + exchange",
    action: "Feature on Exchange tape",
  },
  {
    id: "or-night-ops",
    sku: "bp-nops",
    title: "Night Ops blueprint",
    horizon: "7d",
    demandUnits: 112,
    confidence: 85,
    heat: 84,
    source: "vault + syndicate",
    action: "Syndicate threshold push",
  },
];

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

interface OracleState {
  pinned: string[];
  horizon: "7d" | "14d" | "30d" | "all";
  setHorizon: (h: OracleState["horizon"]) => void;
  togglePin: (id: string) => void;
  tickHeat: () => void;
  liveHeat: Record<string, number>;
}

export const useOracleStore = create<OracleState>()(
  persist(
    (set, get) => ({
      pinned: [],
      horizon: "all",
      liveHeat: Object.fromEntries(
        ORACLE_FORECASTS.map((f) => [f.id, f.heat]),
      ),
      setHorizon: (h) => set({ horizon: h }),
      togglePin: (id) =>
        set((s) => ({
          pinned: s.pinned.includes(id)
            ? s.pinned.filter((x) => x !== id)
            : [...s.pinned, id],
        })),
      tickHeat: () => {
        set((s) => {
          const next = { ...s.liveHeat };
          for (const f of ORACLE_FORECASTS) {
            const base = f.heat;
            const wobble =
              ((Date.now() / 3000 + f.demandUnits) % 7) - 3;
            next[f.id] = Math.max(
              40,
              Math.min(99, Math.round(base + wobble)),
            );
          }
          return { liveHeat: next };
        });
      },
    }),
    {
      name: "lvl-oracle-v1",
      storage: storage(),
      partialize: (s) => ({ pinned: s.pinned, horizon: s.horizon }),
    },
  ),
);
