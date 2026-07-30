/**
 * LVL Quest — commerce quests + XP across the mesh.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type QuestId =
  | "q-claim-drop"
  | "q-mint-vault"
  | "q-buy-signal"
  | "q-join-guild"
  | "q-forge-draft"
  | "q-whisper"
  | "q-arena"
  | "q-syndicate"
  | "q-mirror"
  | "q-circuit"
  | "q-anchor";

export type QuestDef = {
  id: QuestId;
  title: string;
  blurb: string;
  xp: number;
  target: number;
  path: string;
  badge: string;
};

export const QUEST_CATALOG: QuestDef[] = [
  {
    id: "q-claim-drop",
    title: "First flash claim",
    blurb: "Claim any unit on Live Drops or Arena.",
    xp: 120,
    target: 1,
    path: "/drops",
    badge: "Drops",
  },
  {
    id: "q-mint-vault",
    title: "Mint a vault seat",
    blurb: "Hold IP and start a royalty stream.",
    xp: 150,
    target: 1,
    path: "/vault",
    badge: "Vault",
  },
  {
    id: "q-buy-signal",
    title: "Buy a signal pack",
    blurb: "Purchase demand intent on Signal.",
    xp: 100,
    target: 1,
    path: "/signal",
    badge: "Signal",
  },
  {
    id: "q-join-guild",
    title: "Join a guild",
    blurb: "Enter a creator collective split.",
    xp: 130,
    target: 1,
    path: "/guild",
    badge: "Guild",
  },
  {
    id: "q-forge-draft",
    title: "Forge a draft",
    blurb: "Generate a product concept in Forge.",
    xp: 110,
    target: 1,
    path: "/forge",
    badge: "Forge",
  },
  {
    id: "q-whisper",
    title: "Whisper unlock",
    blurb: "Open a private door with a code.",
    xp: 140,
    target: 1,
    path: "/whisper",
    badge: "Whisper",
  },
  {
    id: "q-arena",
    title: "Arena streak",
    blurb: "Score 3 race claims in Arena.",
    xp: 160,
    target: 3,
    path: "/arena",
    badge: "Arena",
  },
  {
    id: "q-syndicate",
    title: "Crew up",
    blurb: "Join a Syndicate group buy.",
    xp: 100,
    target: 1,
    path: "/syndicate",
    badge: "Crew",
  },
  {
    id: "q-mirror",
    title: "Clone a fit",
    blurb: "Mirror any social stack into your closet.",
    xp: 110,
    target: 1,
    path: "/mirror",
    badge: "Mirror",
  },
  {
    id: "q-circuit",
    title: "Run a circuit",
    blurb: "Complete one agent workflow template.",
    xp: 140,
    target: 1,
    path: "/circuit",
    badge: "Circuit",
  },
  {
    id: "q-anchor",
    title: "Anchor a box",
    blurb: "Subscribe to any recurring plan.",
    xp: 130,
    target: 1,
    path: "/anchor",
    badge: "Anchor",
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

interface QuestState {
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
  xp: number;
  advance: (id: QuestId, by?: number) => void;
  claim: (id: QuestId) => number;
  completedCount: () => number;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      progress: {},
      claimed: {},
      xp: 0,
      advance: (id, by = 1) => {
        const def = QUEST_CATALOG.find((q) => q.id === id);
        if (!def) return;
        set((s) => {
          const cur = s.progress[id] ?? 0;
          const next = Math.min(def.target, cur + by);
          return { progress: { ...s.progress, [id]: next } };
        });
      },
      claim: (id) => {
        const def = QUEST_CATALOG.find((q) => q.id === id);
        if (!def) return 0;
        const prog = get().progress[id] ?? 0;
        if (prog < def.target) return 0;
        if (get().claimed[id]) return 0;
        set((s) => ({
          claimed: { ...s.claimed, [id]: true },
          xp: s.xp + def.xp,
        }));
        return def.xp;
      },
      completedCount: () =>
        Object.values(get().claimed).filter(Boolean).length,
    }),
    {
      name: "lvl-quest-v1",
      storage: storage(),
      partialize: (s) => ({
        progress: s.progress,
        claimed: s.claimed,
        xp: s.xp,
      }),
    },
  ),
);

/** Helper for other surfaces to ping quests without circular imports at module init */
export function pingQuest(id: QuestId, by = 1) {
  try {
    useQuestStore.getState().advance(id, by);
  } catch {
    /* ignore */
  }
}
