/**
 * Design Studio — Imagine briefs composed in-browser, ready for merch pipeline.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ImagineBrief } from "@/lib/merch/types";

export type StudioDraft = ImagineBrief & {
  createdAt: string;
  status: "draft" | "queued" | "exported";
};

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

function bid(title: string) {
  return `studio-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}`;
}

interface StudioState {
  drafts: StudioDraft[];
  hydrated: boolean;
  save: (input: Omit<ImagineBrief, "id"> & { id?: string }) => StudioDraft;
  queue: (id: string) => void;
  remove: (id: string) => void;
  exportJson: (id: string) => string | null;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      drafts: [],
      hydrated: false,
      save: (input) => {
        const draft: StudioDraft = {
          id: input.id ?? bid(input.title),
          title: input.title,
          concept: input.concept,
          imaginePrompt: input.imaginePrompt,
          negativePrompt: input.negativePrompt,
          style: input.style,
          palette: input.palette,
          aspectRatio: input.aspectRatio,
          printSafeNotes: input.printSafeNotes,
          tags: input.tags,
          createdAt: new Date().toISOString(),
          status: "draft",
        };
        set((s) => ({
          drafts: [draft, ...s.drafts.filter((d) => d.id !== draft.id)].slice(
            0,
            30,
          ),
        }));
        return draft;
      },
      queue: (id) => {
        set((s) => ({
          drafts: s.drafts.map((d) =>
            d.id === id ? { ...d, status: "queued" as const } : d,
          ),
        }));
      },
      remove: (id) => {
        set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) }));
      },
      exportJson: (id) => {
        const d = get().drafts.find((x) => x.id === id);
        if (!d) return null;
        set((s) => ({
          drafts: s.drafts.map((x) =>
            x.id === id ? { ...x, status: "exported" as const } : x,
          ),
        }));
        const { status: _s, createdAt: _c, ...brief } = d;
        return JSON.stringify(brief, null, 2);
      },
    }),
    {
      name: "lvl-studio-v1",
      storage: storage(),
      partialize: (s) => ({ drafts: s.drafts }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const STUDIO_PRESETS: Array<Omit<ImagineBrief, "id">> = [
  {
    title: "Orbit Mark",
    concept: "LVL orbit glyph for agent commerce stickers and chest prints.",
    imaginePrompt:
      "Minimal monochrome orbit ring with single node accent, high contrast black ink on white, vector-clean, centered apparel graphic, no text",
    negativePrompt: "neon purple, photoreal, clutter, watermark",
    style: "geometric brand mark",
    palette: ["#09090b", "#fafafa", "#71717a"],
    aspectRatio: "1:1",
    printSafeNotes: "Single-color plate; works at 2in and 10in.",
    tags: ["studio", "mark", "agent"],
  },
  {
    title: "Signal Stripe",
    concept: "Abstract signal-stripe poster for Soft Era adjacent drops.",
    imaginePrompt:
      "Editorial monochrome poster with soft horizontal signal bands, charcoal and pearl, gallery composition 4:5, no text, quiet luxury",
    negativePrompt: "neon, logos, busy collage",
    style: "editorial poster",
    palette: ["#121214", "#a1a1aa", "#f4f4f5"],
    aspectRatio: "4:5",
    printSafeNotes: "Keep focal mass in center 70%.",
    tags: ["studio", "art", "poster"],
  },
  {
    title: "Void Wordmark",
    concept: "Tonal LVL wordmark for black-on-black hoodies.",
    imaginePrompt:
      "Subtle tonal LVL wordmark near-black on black, luxury streetwear placement, soft emboss feel, no bright colors",
    negativePrompt: "neon, cartoon, busy pattern",
    style: "tonal luxury streetwear",
    palette: ["#0a0a0b", "#222228", "#a1a1aa"],
    aspectRatio: "1:1",
    printSafeNotes: "Puff or soft plastisol mock.",
    tags: ["studio", "hoodie", "tonal"],
  },
];
