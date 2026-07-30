/**
 * LVL Guild — creator collectives with shared revenue splits.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type GuildCrew = {
  id: string;
  name: string;
  blurb: string;
  focus: string;
  members: number;
  maxMembers: number;
  /** Your share if you join (bps of pool) */
  joinShareBps: number;
  poolUsdc: number;
  badge: string;
};

export const GUILD_CATALOG: GuildCrew[] = [
  {
    id: "g-soft-era",
    name: "Soft Era Atelier",
    blurb: "Gallery plate designers · POD royalty pool.",
    focus: "Art / design rights",
    members: 6,
    maxMembers: 12,
    joinShareBps: 800,
    poolUsdc: 4200,
    badge: "Art",
  },
  {
    id: "g-night-ops",
    name: "Night Ops Collective",
    blurb: "Operator marks + reflective drops.",
    focus: "Merch / drops",
    members: 9,
    maxMembers: 16,
    joinShareBps: 600,
    poolUsdc: 6800,
    badge: "Ops",
  },
  {
    id: "g-agent-rail",
    name: "Agent Rail Guild",
    blurb: "A2A merch agents sharing skill export fees.",
    focus: "Agents / skills",
    members: 4,
    maxMembers: 10,
    joinShareBps: 1000,
    poolUsdc: 3100,
    badge: "Agents",
  },
  {
    id: "g-wave",
    name: "Wave Music Circle",
    blurb: "Stems + cover packs · release kit splits.",
    focus: "Music",
    members: 5,
    maxMembers: 8,
    joinShareBps: 1200,
    poolUsdc: 1900,
    badge: "Music",
  },
  {
    id: "g-city",
    name: "City Mark League",
    blurb: "Regional identity drops across metros.",
    focus: "City merch",
    members: 11,
    maxMembers: 20,
    joinShareBps: 500,
    poolUsdc: 5400,
    badge: "City",
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

interface GuildState {
  joined: Record<string, boolean>;
  earnedUsdc: Record<string, number>;
  join: (id: string) => boolean;
  leave: (id: string) => void;
  tickYield: () => void;
  totalEarned: () => number;
  crewCount: () => number;
}

export const useGuildStore = create<GuildState>()(
  persist(
    (set, get) => ({
      joined: {},
      earnedUsdc: {},
      join: (id) => {
        const g = GUILD_CATALOG.find((x) => x.id === id);
        if (!g) return false;
        if (get().joined[id]) return false;
        if (g.members >= g.maxMembers) return false;
        set((s) => ({
          joined: { ...s.joined, [id]: true },
          earnedUsdc: { ...s.earnedUsdc, [id]: s.earnedUsdc[id] ?? 0 },
        }));
        return true;
      },
      leave: (id) =>
        set((s) => {
          const next = { ...s.joined };
          delete next[id];
          return { joined: next };
        }),
      tickYield: () => {
        set((s) => {
          const earned = { ...s.earnedUsdc };
          for (const id of Object.keys(s.joined)) {
            if (!s.joined[id]) continue;
            const g = GUILD_CATALOG.find((x) => x.id === id);
            if (!g) continue;
            const drip = (g.poolUsdc * g.joinShareBps) / 10_000 / 200;
            earned[id] = Math.round(((earned[id] ?? 0) + drip) * 1000) / 1000;
          }
          return { earnedUsdc: earned };
        });
      },
      totalEarned: () =>
        Math.round(
          Object.values(get().earnedUsdc).reduce((a, b) => a + b, 0) * 100,
        ) / 100,
      crewCount: () => Object.values(get().joined).filter(Boolean).length,
    }),
    {
      name: "lvl-guild-v1",
      storage: storage(),
      partialize: (s) => ({ joined: s.joined, earnedUsdc: s.earnedUsdc }),
    },
  ),
);
