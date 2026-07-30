/**
 * LVL Launch — product launchpad with waitlists, live pledges, and demo pitches.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type LaunchPhase = "tease" | "waitlist" | "live" | "closed";

export type LaunchPad = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  blurb: string;
  category: "merch" | "digital" | "agent" | "music";
  /** Launch price USDC */
  priceUsd: number;
  waitlistGoal: number;
  /** Deterministic seed waitlist count */
  seedWaitlist: number;
  badge: string;
  /** Demo phase offset hours from epoch */
  phase: LaunchPhase;
  path: string;
};

export type LaunchUserState = {
  waitlisted: string[];
  pledged: Record<string, number>;
  /** Local overrides for waitlist counts after join */
  extras: Record<string, number>;
};

export const LAUNCH_PADS: LaunchPad[] = [
  {
    id: "ln-night-ops",
    slug: "night-ops-tee",
    title: "NIGHT OPS",
    tagline: "Operator black · reflective mark",
    blurb: "Limited tee for fleet operators. Waitlist unlocks first 100 units.",
    category: "merch",
    priceUsd: 34,
    waitlistGoal: 200,
    seedWaitlist: 142,
    badge: "Merch",
    phase: "waitlist",
    path: "/shop",
  },
  {
    id: "ln-relay-pro",
    slug: "relay-pro",
    title: "Relay Pro",
    tagline: "A2A intent desk · multi-rail",
    blurb: "Pro agent relay seat with priority queue and signed intents.",
    category: "agent",
    priceUsd: 89,
    waitlistGoal: 80,
    seedWaitlist: 61,
    badge: "Agent",
    phase: "live",
    path: "/relay",
  },
  {
    id: "ln-wave-ep",
    slug: "wave-ep-kit",
    title: "Wave EP Kit",
    tagline: "Stems · cover · listing pack",
    blurb: "Music release kit for music.lvlltd.com. Live mint when waitlist clears.",
    category: "music",
    priceUsd: 42,
    waitlistGoal: 150,
    seedWaitlist: 150,
    badge: "Music",
    phase: "live",
    path: "/music",
  },
  {
    id: "ln-skill-forge",
    slug: "skill-forge",
    title: "Skill Forge",
    tagline: "Compose · export · settle",
    blurb: "Next-gen skill factory pack. Tease phase — join early access.",
    category: "digital",
    priceUsd: 56,
    waitlistGoal: 300,
    seedWaitlist: 88,
    badge: "Skill",
    phase: "tease",
    path: "/skills",
  },
  {
    id: "ln-soft-era-drop",
    slug: "soft-era-drop-2",
    title: "SOFT ERA II",
    tagline: "Gallery plate · signed edition",
    blurb: "Second Soft Era drop. Waitlist first, then timed live window.",
    category: "merch",
    priceUsd: 38,
    waitlistGoal: 120,
    seedWaitlist: 97,
    badge: "Art",
    phase: "waitlist",
    path: "/drops",
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

interface LaunchState extends LaunchUserState {
  joinWaitlist: (id: string) => boolean;
  pledge: (id: string, amount?: number) => boolean;
  waitlistCount: (pad: LaunchPad) => number;
  progress: (pad: LaunchPad) => number;
}

export const useLaunchStore = create<LaunchState>()(
  persist(
    (set, get) => ({
      waitlisted: [],
      pledged: {},
      extras: {},
      joinWaitlist: (id) => {
        if (get().waitlisted.includes(id)) return false;
        set((s) => ({
          waitlisted: [...s.waitlisted, id],
          extras: { ...s.extras, [id]: (s.extras[id] ?? 0) + 1 },
        }));
        return true;
      },
      pledge: (id, amount = 1) => {
        const pad = LAUNCH_PADS.find((p) => p.id === id);
        if (!pad || pad.phase === "closed" || pad.phase === "tease") return false;
        set((s) => ({
          pledged: {
            ...s.pledged,
            [id]: (s.pledged[id] ?? 0) + amount,
          },
          waitlisted: s.waitlisted.includes(id)
            ? s.waitlisted
            : [...s.waitlisted, id],
          extras: { ...s.extras, [id]: (s.extras[id] ?? 0) + (s.waitlisted.includes(id) ? 0 : 1) },
        }));
        return true;
      },
      waitlistCount: (pad) => pad.seedWaitlist + (get().extras[pad.id] ?? 0),
      progress: (pad) => {
        const n = get().waitlistCount(pad);
        return Math.min(100, Math.round((n / pad.waitlistGoal) * 100));
      },
    }),
    {
      name: "lvl-launch-v1",
      storage: storage(),
      partialize: (s) => ({
        waitlisted: s.waitlisted,
        pledged: s.pledged,
        extras: s.extras,
      }),
    },
  ),
);
