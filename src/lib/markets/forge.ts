/**
 * LVL Forge — prompt → product drafts (style, channel, SKU seed).
 * Demo factory for merch concepts before Printify / Launch.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ForgeChannel = "tee" | "hoodie" | "art" | "sticker" | "music_kit";
export type ForgeStyle =
  | "night_ops"
  | "soft_era"
  | "city_mark"
  | "agent_grid"
  | "serotonin";

export type ForgeDraft = {
  id: string;
  prompt: string;
  title: string;
  channel: ForgeChannel;
  style: ForgeStyle;
  priceUsdc: number;
  tags: string[];
  score: number;
  at: number;
};

export const FORGE_STYLES: {
  id: ForgeStyle;
  label: string;
  blurb: string;
}[] = [
  { id: "night_ops", label: "Night Ops", blurb: "Reflective operator marks" },
  { id: "soft_era", label: "Soft Era", blurb: "Gallery plate pastels" },
  { id: "city_mark", label: "City Mark", blurb: "Regional identity drops" },
  { id: "agent_grid", label: "Agent Grid", blurb: "A2A protocol motifs" },
  { id: "serotonin", label: "Serotonin", blurb: "Weekend energy graphics" },
];

export const FORGE_CHANNELS: { id: ForgeChannel; label: string; base: number }[] =
  [
    { id: "tee", label: "Tee", base: 32 },
    { id: "hoodie", label: "Hoodie", base: 58 },
    { id: "art", label: "Art print", base: 45 },
    { id: "sticker", label: "Sticker pack", base: 12 },
    { id: "music_kit", label: "Music kit", base: 28 },
  ];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function titleFromPrompt(prompt: string, style: ForgeStyle): string {
  const words = prompt
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  const head = words.length
    ? words.map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase()).join(" ")
    : "Untitled Drop";
  const suffix: Record<ForgeStyle, string> = {
    night_ops: "Ops",
    soft_era: "Era",
    city_mark: "Mark",
    agent_grid: "Protocol",
    serotonin: "Pulse",
  };
  return `${head} ${suffix[style]}`;
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

interface ForgeState {
  drafts: ForgeDraft[];
  forge: (
    prompt: string,
    channel: ForgeChannel,
    style: ForgeStyle,
  ) => ForgeDraft | null;
  remove: (id: string) => void;
  promoteCount: () => number;
}

export const useForgeStore = create<ForgeState>()(
  persist(
    (set, get) => ({
      drafts: [],
      forge: (prompt, channel, style) => {
        const clean = prompt.trim().slice(0, 160);
        if (clean.length < 3) return null;
        const seed = hashSeed(`${clean}|${channel}|${style}`);
        const ch = FORGE_CHANNELS.find((c) => c.id === channel)!;
        const priceUsdc = ch.base + (seed % 17);
        const score = 55 + (seed % 40);
        const tags = [
          style.replace("_", "-"),
          channel,
          score > 80 ? "hot" : "draft",
        ];
        const draft: ForgeDraft = {
          id: `fg-${seed.toString(16)}`,
          prompt: clean,
          title: titleFromPrompt(clean, style),
          channel,
          style,
          priceUsdc,
          tags,
          score,
          at: Date.now(),
        };
        set((s) => ({
          drafts: [draft, ...s.drafts.filter((d) => d.id !== draft.id)].slice(
            0,
            24,
          ),
        }));
        return draft;
      },
      remove: (id) =>
        set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
      promoteCount: () => get().drafts.filter((d) => d.score >= 80).length,
    }),
    {
      name: "lvl-forge-v1",
      storage: storage(),
      partialize: (s) => ({ drafts: s.drafts }),
    },
  ),
);
