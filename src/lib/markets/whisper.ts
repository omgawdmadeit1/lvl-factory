/**
 * LVL Whisper — private invite codes for exclusive inventory / drops.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WhisperDoor = {
  id: string;
  code: string;
  title: string;
  blurb: string;
  unlocks: string;
  seats: number;
  taken: number;
  heat: number;
  badge: string;
};

/** Public demo codes — players can try these */
export const WHISPER_DOORS: WhisperDoor[] = [
  {
    id: "w-midnight",
    code: "MIDNIGHT",
    title: "Midnight plate vault",
    blurb: "Flash-only MAIN CHARACTER colorway.",
    unlocks: "Exclusive drop claim + Arena bonus",
    seats: 48,
    taken: 31,
    heat: 92,
    badge: "Flash",
  },
  {
    id: "w-soft",
    code: "SOFTERA",
    title: "Soft Era atelier",
    blurb: "Gallery print before public Launch.",
    unlocks: "Early art SKU + Guild invite",
    seats: 24,
    taken: 18,
    heat: 78,
    badge: "Art",
  },
  {
    id: "w-agent",
    code: "A2ARAIL",
    title: "Agent rail backstage",
    blurb: "Pro agent seat trial + skill export.",
    unlocks: "Agent Pro demo license",
    seats: 16,
    taken: 9,
    heat: 85,
    badge: "Agent",
  },
  {
    id: "w-ops",
    code: "NIGHTOPS",
    title: "Night Ops locker",
    blurb: "Reflective mark sample pack.",
    unlocks: "Blueprint mint discount",
    seats: 32,
    taken: 12,
    heat: 70,
    badge: "Ops",
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

interface WhisperState {
  unlocked: string[];
  attempts: number;
  lastError: string | null;
  unlock: (code: string) => { ok: boolean; door?: WhisperDoor; message: string };
  isOpen: (id: string) => boolean;
}

export const useWhisperStore = create<WhisperState>()(
  persist(
    (set, get) => ({
      unlocked: [],
      attempts: 0,
      lastError: null,
      isOpen: (id) => get().unlocked.includes(id),
      unlock: (raw) => {
        const code = raw.trim().toUpperCase().replace(/\s+/g, "");
        set((s) => ({ attempts: s.attempts + 1 }));
        const door = WHISPER_DOORS.find((d) => d.code === code);
        if (!door) {
          set({ lastError: "Unknown code" });
          return { ok: false, message: "Unknown whisper code" };
        }
        if (get().unlocked.includes(door.id)) {
          return { ok: true, door, message: "Already unlocked" };
        }
        if (door.taken >= door.seats) {
          set({ lastError: "Door full" });
          return { ok: false, door, message: "No seats left" };
        }
        set((s) => ({
          unlocked: [...s.unlocked, door.id],
          lastError: null,
        }));
        return {
          ok: true,
          door,
          message: `Unlocked · ${door.title}`,
        };
      },
    }),
    {
      name: "lvl-whisper-v1",
      storage: storage(),
      partialize: (s) => ({
        unlocked: s.unlocked,
        attempts: s.attempts,
      }),
    },
  ),
);
