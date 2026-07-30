/**
 * LVL Arena — competitive drop claim leaderboard + heat races.
 * Gamified commerce: claim points, streak, live heat meters.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ArenaRace = {
  id: string;
  title: string;
  blurb: string;
  productSlug: string;
  /** Points per successful claim */
  points: number;
  heat: number;
  badge: string;
  /** Max claims in race window */
  maxClaims: number;
};

export type ArenaPlayer = {
  id: string;
  name: string;
  score: number;
  claims: number;
  streak: number;
  you?: boolean;
};

export const ARENA_RACES: ArenaRace[] = [
  {
    id: "ar-midnight",
    title: "Midnight plate sprint",
    blurb: "MAIN CHARACTER flash — first claims score big.",
    productSlug: "main-character",
    points: 120,
    heat: 91,
    badge: "Flash",
    maxClaims: 48,
  },
  {
    id: "ar-soft-era",
    title: "Soft Era gallery dash",
    blurb: "Art drop velocity race. Streaks multiply points.",
    productSlug: "soft-era",
    points: 100,
    heat: 78,
    badge: "Art",
    maxClaims: 36,
  },
  {
    id: "ar-boston",
    title: "City mark circuit",
    blurb: "Boston Native restock — regional heat.",
    productSlug: "boston-native-logo-t-shirt",
    points: 90,
    heat: 72,
    badge: "City",
    maxClaims: 72,
  },
  {
    id: "ar-serotonin",
    title: "Serotonin pulse heat",
    blurb: "Weekend-only energy. Combo claims for bonus.",
    productSlug: "serotonin-dealer",
    points: 110,
    heat: 85,
    badge: "Weekend",
    maxClaims: 40,
  },
];

function seedBoard(): ArenaPlayer[] {
  const names = [
    "fleet-bot",
    "drop-hawk",
    "cart-ninja",
    "pulse-runner",
    "agent-zero",
    "night-ops",
    "stack-king",
  ];
  return names.map((name, i) => ({
    id: `bot-${i}`,
    name,
    score: 800 - i * 90 + ((i * 17) % 40),
    claims: 12 - i,
    streak: Math.max(0, 5 - i),
  }));
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

interface ArenaState {
  board: ArenaPlayer[];
  youScore: number;
  youClaims: number;
  youStreak: number;
  raceClaims: Record<string, number>;
  claim: (raceId: string) => { ok: boolean; points: number; message: string };
  tickBots: () => void;
  leaderboard: () => ArenaPlayer[];
}

export const useArenaStore = create<ArenaState>()(
  persist(
    (set, get) => ({
      board: seedBoard(),
      youScore: 0,
      youClaims: 0,
      youStreak: 0,
      raceClaims: {},
      claim: (raceId) => {
        const race = ARENA_RACES.find((r) => r.id === raceId);
        if (!race) return { ok: false, points: 0, message: "Unknown race" };
        const used = get().raceClaims[raceId] ?? 0;
        if (used >= race.maxClaims) {
          return { ok: false, points: 0, message: "Race sold out" };
        }
        const streak = get().youStreak + 1;
        const mult = Math.min(2, 1 + streak * 0.08);
        const points = Math.round(race.points * mult);
        set((s) => ({
          youScore: s.youScore + points,
          youClaims: s.youClaims + 1,
          youStreak: streak,
          raceClaims: { ...s.raceClaims, [raceId]: used + 1 },
        }));
        return {
          ok: true,
          points,
          message: `+${points} pts · streak ${streak}`,
        };
      },
      tickBots: () => {
        set((s) => ({
          board: s.board.map((p, i) => {
            // deterministic-ish drip without Math.random for hydration safety on board seed;
            // bots can use random on client-only tick
            const bump = (i + (Date.now() % 7)) % 5 === 0 ? 15 + (i % 10) : 0;
            if (!bump) return p;
            return {
              ...p,
              score: p.score + bump,
              claims: p.claims + 1,
              streak: p.streak + 1,
            };
          }),
        }));
      },
      leaderboard: () => {
        const you: ArenaPlayer = {
          id: "you",
          name: "you",
          score: get().youScore,
          claims: get().youClaims,
          streak: get().youStreak,
          you: true,
        };
        return [...get().board, you].sort((a, b) => b.score - a.score);
      },
    }),
    {
      name: "lvl-arena-v1",
      storage: storage(),
      partialize: (s) => ({
        board: s.board,
        youScore: s.youScore,
        youClaims: s.youClaims,
        youStreak: s.youStreak,
        raceClaims: s.raceClaims,
      }),
    },
  ),
);
