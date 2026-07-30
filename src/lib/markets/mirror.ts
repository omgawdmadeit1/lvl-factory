/**
 * LVL Mirror — clone-a-fit: recreate someone's merch stack in one tap.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type MirrorItem = {
  slug: string;
  title: string;
  priceUsdc: number;
  kind: "tee" | "art" | "hoodie" | "pack";
};

export type MirrorFit = {
  id: string;
  handle: string;
  title: string;
  blurb: string;
  vibe: string;
  clones: number;
  heat: number;
  badge: string;
  items: MirrorItem[];
};

export const MIRROR_FITS: MirrorFit[] = [
  {
    id: "mf-night-ops",
    handle: "@nightops",
    title: "Night Ops stack",
    blurb: "Reflective operator mark + city tee + agent pack.",
    vibe: "Ops",
    clones: 842,
    heat: 91,
    badge: "Trending",
    items: [
      {
        slug: "main-character",
        title: "MAIN CHARACTER tee",
        priceUsdc: 36,
        kind: "tee",
      },
      {
        slug: "boston-native-logo-t-shirt",
        title: "Boston Native mark",
        priceUsdc: 32,
        kind: "tee",
      },
      {
        slug: "agent-rail-pack",
        title: "Agent rail sticker pack",
        priceUsdc: 14,
        kind: "pack",
      },
    ],
  },
  {
    id: "mf-soft-era",
    handle: "@softera",
    title: "Soft Era gallery set",
    blurb: "Plate art + soft tee — atelier energy.",
    vibe: "Art",
    clones: 512,
    heat: 84,
    badge: "Gallery",
    items: [
      {
        slug: "soft-era",
        title: "Soft Era plate",
        priceUsdc: 48,
        kind: "art",
      },
      {
        slug: "serotonin-dealer",
        title: "Serotonin tee",
        priceUsdc: 34,
        kind: "tee",
      },
    ],
  },
  {
    id: "mf-city-league",
    handle: "@citymark",
    title: "City Mark weekend",
    blurb: "Regional identity drop for the weekend circuit.",
    vibe: "City",
    clones: 390,
    heat: 76,
    badge: "City",
    items: [
      {
        slug: "boston-native-logo-t-shirt",
        title: "Boston Native",
        priceUsdc: 32,
        kind: "tee",
      },
      {
        slug: "main-character-2",
        title: "Main Character alt",
        priceUsdc: 36,
        kind: "tee",
      },
      {
        slug: "soft-era",
        title: "Soft Era mini print",
        priceUsdc: 28,
        kind: "art",
      },
    ],
  },
  {
    id: "mf-agent-zero",
    handle: "@agentzero",
    title: "Agent Zero loadout",
    blurb: "Protocol merch + skill-adjacent pack for A2A demos.",
    vibe: "Agent",
    clones: 621,
    heat: 88,
    badge: "Agent",
    items: [
      {
        slug: "main-character",
        title: "MAIN CHARACTER",
        priceUsdc: 36,
        kind: "tee",
      },
      {
        slug: "agent-pro-kit",
        title: "Agent Pro starter kit",
        priceUsdc: 42,
        kind: "pack",
      },
    ],
  },
];

export function fitTotal(fit: MirrorFit): number {
  return fit.items.reduce((s, i) => s + i.priceUsdc, 0);
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

export type ClonedFit = {
  fitId: string;
  at: number;
  totalUsdc: number;
  itemCount: number;
};

interface MirrorState {
  cloned: ClonedFit[];
  closet: string[]; // slugs in virtual closet
  clone: (fitId: string) => ClonedFit | null;
  closetCount: () => number;
  cloneCount: () => number;
}

export const useMirrorStore = create<MirrorState>()(
  persist(
    (set, get) => ({
      cloned: [],
      closet: [],
      clone: (fitId) => {
        const fit = MIRROR_FITS.find((f) => f.id === fitId);
        if (!fit) return null;
        const entry: ClonedFit = {
          fitId,
          at: Date.now(),
          totalUsdc: fitTotal(fit),
          itemCount: fit.items.length,
        };
        set((s) => {
          const slugs = new Set(s.closet);
          for (const it of fit.items) slugs.add(it.slug);
          return {
            cloned: [entry, ...s.cloned].slice(0, 40),
            closet: Array.from(slugs),
          };
        });
        return entry;
      },
      closetCount: () => get().closet.length,
      cloneCount: () => get().cloned.length,
    }),
    {
      name: "lvl-mirror-v1",
      storage: storage(),
      partialize: (s) => ({ cloned: s.cloned, closet: s.closet }),
    },
  ),
);
