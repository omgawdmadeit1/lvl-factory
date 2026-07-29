import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MUSIC_CATALOG } from "./catalog";
import {
  buildMusicPackage,
  buildSkillPackage,
  toMarketplaceListing,
  toMusicReleaseExport,
} from "./generators";
import type {
  FactoryPackage,
  FactoryStats,
  MusicTrack,
  PackStatus,
} from "./types";
import { downloadJson, downloadText } from "@/lib/utils";

interface FactoryState {
  packages: FactoryPackage[];
  selectedId: string | null;
  processingId: string | null;
  lastMessage: string | null;
  hydrated: boolean;
  select: (id: string | null) => void;
  composeMusic: (trackId: string) => void;
  composeSkill: (templateId: string) => void;
  setStatus: (id: string, status: PackStatus, notes?: string) => void;
  approve: (id: string) => void;
  reject: (id: string, reason: string) => void;
  publish: (id: string) => void;
  remove: (id: string) => void;
  exportPack: (id: string) => void;
  clearMessage: () => void;
  getStats: () => FactoryStats;
  catalog: () => MusicTrack[];
  setHydrated: (v: boolean) => void;
}

function touch(pack: FactoryPackage, patch: Partial<FactoryPackage>): FactoryPackage {
  return {
    ...pack,
    ...patch,
    updatedAt: new Date().toISOString(),
  } as FactoryPackage;
}

function runStages(
  id: string,
  stages: { progress: number; note: string }[],
  delay: number,
) {
  if (typeof window === "undefined") return;
  stages.forEach((stage, i) => {
    window.setTimeout(() => {
      useFactoryStore.setState((state) => ({
        packages: state.packages.map((p) =>
          p.id === id
            ? touch(p, {
                progress: stage.progress,
                status: stage.progress === 100 ? "ready" : "processing",
                notes: stage.note,
              })
            : p,
        ),
        processingId: stage.progress === 100 ? null : state.processingId,
        lastMessage: stage.note,
      }));
    }, delay * (i + 1));
  });
}

export const useFactoryStore = create<FactoryState>()(
  persist(
    (set, get) => ({
      packages: [],
      selectedId: null,
      processingId: null,
      lastMessage: null,
      hydrated: false,

      setHydrated: (v) => set({ hydrated: v }),

      select: (id) => set({ selectedId: id }),

      composeMusic: (trackId) => {
        if (typeof window === "undefined") return;
        if (get().processingId) {
          set({ lastMessage: "Wait for the current pack to finish processing." });
          return;
        }
        const track = MUSIC_CATALOG.find((t) => t.id === trackId);
        if (!track) {
          set({ lastMessage: "Track not found in catalog." });
          return;
        }
        const draft = buildMusicPackage(track);
        draft.status = "processing";
        draft.progress = 12;
        set({
          packages: [draft, ...get().packages],
          selectedId: draft.id,
          processingId: draft.id,
          lastMessage: `Processing music pack for “${track.title}”…`,
        });
        runStages(
          draft.id,
          [
            { progress: 35, note: "Analyzing flag risk + loudness target…" },
            { progress: 58, note: "Building alternative master profile…" },
            { progress: 78, note: "Composing visual + release kit…" },
            { progress: 100, note: "Music pack ready for review." },
          ],
          450,
        );
      },

      composeSkill: (templateId) => {
        if (typeof window === "undefined") return;
        if (get().processingId) {
          set({ lastMessage: "Wait for the current pack to finish processing." });
          return;
        }
        const pack = buildSkillPackage(templateId);
        pack.status = "processing";
        pack.progress = 18;
        set({
          packages: [pack, ...get().packages],
          selectedId: pack.id,
          processingId: pack.id,
          lastMessage: `Composing skill pack “${pack.title}”…`,
        });
        runStages(
          pack.id,
          [
            { progress: 40, note: "Writing free outline.json…" },
            { progress: 65, note: "Generating sample.md…" },
            { progress: 88, note: "Sealing file manifest…" },
            { progress: 100, note: "Skill pack ready for review." },
          ],
          400,
        );
      },

      setStatus: (id, status, notes) =>
        set((state) => ({
          packages: state.packages.map((p) =>
            p.id === id ? touch(p, { status, notes: notes ?? p.notes }) : p,
          ),
        })),

      approve: (id) => {
        set((state) => ({
          packages: state.packages.map((p) =>
            p.id === id
              ? touch(p, {
                  status: "approved",
                  notes: "Approved for lvlltd.com domain publish.",
                })
              : p,
          ),
          lastMessage: "Pack approved. Ready to publish to LVL rails.",
        }));
      },

      reject: (id, reason) => {
        set((state) => ({
          packages: state.packages.map((p) =>
            p.id === id ? touch(p, { status: "rejected", notes: reason }) : p,
          ),
          lastMessage: "Pack rejected.",
        }));
      },

      publish: (id) => {
        const pack = get().packages.find((p) => p.id === id);
        if (!pack) return;
        if (pack.status !== "approved" && pack.status !== "ready") {
          set({
            lastMessage:
              "Only ready or approved packs can be published. Approve first.",
          });
          return;
        }
        set((state) => ({
          packages: state.packages.map((p) =>
            p.id === id
              ? touch(p, {
                  status: "published",
                  notes:
                    p.kind === "music"
                      ? "Staged for music.lvlltd.com + x402 download path."
                      : "Staged for lvlltd.com skill catalog + x402 unlock.",
                })
              : p,
          ),
          lastMessage:
            pack.kind === "music"
              ? "Music package published to music.lvlltd.com rails (export ready)."
              : "Skill package published to lvlltd.com catalog rails (export ready).",
        }));
      },

      remove: (id) =>
        set((state) => ({
          packages: state.packages.filter((p) => p.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
          lastMessage: "Pack removed from factory queue.",
        })),

      exportPack: (id) => {
        if (typeof window === "undefined") return;
        const pack = get().packages.find((p) => p.id === id);
        if (!pack) return;
        if (pack.kind === "music") {
          downloadJson(
            `${pack.title.replace(/\s+/g, "-").toLowerCase()}-release.json`,
            toMusicReleaseExport(pack),
          );
          downloadText(
            `${pack.title.replace(/\s+/g, "-").toLowerCase()}-youtube.txt`,
            `${pack.releaseKit.youtubeTitle}\n\n${pack.releaseKit.youtubeDescription}`,
          );
        } else {
          downloadJson(
            `${pack.skillId}-listing.json`,
            toMarketplaceListing(pack),
          );
          downloadText(`${pack.skillId}-sample.md`, pack.sampleMd);
        }
        set({
          lastMessage: "Export downloaded — ready for LVL domain upload.",
        });
      },

      clearMessage: () => set({ lastMessage: null }),

      getStats: () => {
        const packages = get().packages;
        return {
          musicCatalogSize: MUSIC_CATALOG.length,
          skillsInCatalog: 236,
          packsReady: packages.filter((p) =>
            ["ready", "approved"].includes(p.status),
          ).length,
          packsPublished: packages.filter((p) => p.status === "published")
            .length,
          estimatedUsdc: packages
            .filter((p) => p.status === "published")
            .reduce((sum, p) => {
              if (p.kind === "skill") return sum + p.priceUsdc;
              return sum + p.metadata.downloadPriceUsdc;
            }, 0),
        };
      },

      catalog: () => MUSIC_CATALOG,
    }),
    {
      name: "lvl-factory-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (s) => ({
        packages: s.packages,
        selectedId: s.selectedId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
