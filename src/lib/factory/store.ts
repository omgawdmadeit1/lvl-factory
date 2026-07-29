import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MUSIC_CATALOG, SKILL_TEMPLATES, TIER1_SEED } from "./catalog";
import {
  buildMusicPackage,
  buildSkillPackage,
  toCanaryGuideExport,
  toFlagshipShelfExport,
  toMarketplaceListing,
  toMusicReleaseExport,
} from "./generators";
import type {
  FactoryPackage,
  FactoryStats,
  MusicTrack,
  PackStatus,
  Tier1ChecklistItem,
} from "./types";
import { downloadJson, downloadText } from "@/lib/utils";

interface FactoryState {
  packages: FactoryPackage[];
  selectedId: string | null;
  processingId: string | null;
  lastMessage: string | null;
  hydrated: boolean;
  tier1SeededAt: string | null;
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
  seedTier1: () => void;
  approveAndPublishAllReady: () => void;
  exportTier1Bundle: () => void;
  getTier1Checklist: () => Tier1ChecklistItem[];
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
      tier1SeededAt: null,

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
            { progress: 65, note: "Generating unique sample.md…" },
            { progress: 88, note: "Sealing after-pay artifacts…" },
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
                      ? "Staged for music.lvlltd.com + x402/fiat download path."
                      : "Staged for lvlltd.com skill catalog + x402/fiat unlock.",
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

      seedTier1: () => {
        if (typeof window === "undefined") return;
        if (get().processingId) {
          set({ lastMessage: "Wait for processing to finish before seeding." });
          return;
        }

        const track = MUSIC_CATALOG.find(
          (t) => t.id === TIER1_SEED.musicTrackId,
        );
        if (!track) {
          set({ lastMessage: "Tier 1 music track missing from catalog." });
          return;
        }

        const music = buildMusicPackage(track);
        music.notes = "Tier 1 seed — music release kit (Dirt Road Kings).";
        music.status = "ready";
        music.progress = 100;

        const skills = TIER1_SEED.skillIds.map((sid) => {
          const p = buildSkillPackage(sid);
          p.notes = "Tier 1 seed — flagship / canary pack.";
          p.status = "ready";
          p.progress = 100;
          return p;
        });

        const seeded = [music, ...skills];
        set({
          packages: [...seeded, ...get().packages],
          selectedId: seeded[0]?.id ?? null,
          tier1SeededAt: new Date().toISOString(),
          lastMessage:
            "Tier 1 seeded: 1 music kit + canary + wallet onboarding + music release skill. Review → approve → publish → export.",
        });
      },

      approveAndPublishAllReady: () => {
        const ready = get().packages.filter((p) =>
          ["ready", "approved"].includes(p.status),
        );
        if (ready.length === 0) {
          set({ lastMessage: "No ready packs to approve/publish." });
          return;
        }
        set((state) => ({
          packages: state.packages.map((p) =>
            ["ready", "approved"].includes(p.status)
              ? touch(p, {
                  status: "published",
                  notes:
                    p.kind === "music"
                      ? "Tier 1 batch publish → music.lvlltd.com rails."
                      : "Tier 1 batch publish → lvlltd.com catalog rails.",
                })
              : p,
          ),
          lastMessage: `Published ${ready.length} pack(s). Export the Tier 1 bundle next.`,
        }));
      },

      exportTier1Bundle: () => {
        if (typeof window === "undefined") return;
        const published = get().packages.filter((p) => p.status === "published");
        const readyish = get().packages.filter((p) =>
          ["ready", "approved", "published"].includes(p.status),
        );

        downloadJson("tier1-flagship-shelf.json", toFlagshipShelfExport());
        downloadJson("tier1-canary-guide.json", toCanaryGuideExport());
        downloadJson("tier1-queue-export.json", {
          exportedAt: new Date().toISOString(),
          domain: "lvlltd.com",
          musicDomain: "music.lvlltd.com",
          packages: readyish.map((p) =>
            p.kind === "music"
              ? toMusicReleaseExport(p)
              : toMarketplaceListing(p),
          ),
          publishedCount: published.length,
        });

        const listings = readyish
          .filter((p): p is Extract<FactoryPackage, { kind: "skill" }> => p.kind === "skill")
          .map((p) => toMarketplaceListing(p));
        if (listings.length) {
          downloadJson("tier1-skill-listings.json", { skills: listings });
        }

        set({
          lastMessage:
            "Tier 1 bundle downloaded (flagship shelf + canary guide + queue exports). Upload listings to lvlltd.com catalog.",
        });
      },

      getTier1Checklist: () => {
        const packages = get().packages;
        const hasMusic = packages.some(
          (p) =>
            p.kind === "music" &&
            p.sourceTrackId === TIER1_SEED.musicTrackId &&
            ["ready", "approved", "published"].includes(p.status),
        );
        const hasCanary = packages.some(
          (p) =>
            p.kind === "skill" &&
            p.skillId === "agent-x402-first-buy" &&
            ["ready", "approved", "published"].includes(p.status),
        );
        const hasWallet = packages.some(
          (p) =>
            p.kind === "skill" &&
            p.skillId === "wallet-onboarding-noncrypto-buyers" &&
            ["ready", "approved", "published"].includes(p.status),
        );
        const published = packages.filter((p) => p.status === "published").length;
        const flagships = SKILL_TEMPLATES.filter((t) => t.flagship).length;

        return [
          {
            id: "flagships",
            label: "Flagship skill rewrites ready",
            done: flagships >= 5,
            detail: `${flagships} unique non-boiler templates in factory shelf`,
          },
          {
            id: "seed-music",
            label: "Music release kit composed (Dirt Road Kings)",
            done: hasMusic,
            detail: hasMusic
              ? "Music pack in queue"
              : "Run Seed Tier 1 or compose from Music Factory",
          },
          {
            id: "seed-canary",
            label: "Canary skill pack composed ($0.05)",
            done: hasCanary,
            detail: hasCanary
              ? "Canary pack in queue"
              : "Seed Tier 1 includes agent-x402-first-buy",
          },
          {
            id: "seed-wallet",
            label: "Wallet onboarding skill composed",
            done: hasWallet,
            detail: hasWallet
              ? "Onboarding pack in queue"
              : "Seed Tier 1 includes wallet onboarding",
          },
          {
            id: "published",
            label: "At least 3 packs published",
            done: published >= 3,
            detail: `${published} published — approve + publish or use batch publish`,
          },
          {
            id: "export",
            label: "Tier 1 export bundle available",
            done: get().tier1SeededAt !== null || published > 0,
            detail: "Use Export Tier 1 Bundle on dashboard or Tier 1 page",
          },
          {
            id: "canary-page",
            label: "Human canary path documented",
            done: true,
            detail: "Open /canary for MetaMask + fiat dual path",
          },
          {
            id: "fiat",
            label: "Fiat fallback staged for humans",
            done: true,
            detail: "Dual rails marked on flagship templates; Stripe session path staged",
          },
        ];
      },

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
          flagshipsReady: SKILL_TEMPLATES.filter((t) => t.flagship).length,
          canaryReady: packages.some(
            (p) =>
              p.kind === "skill" &&
              p.canary &&
              ["ready", "approved", "published"].includes(p.status),
          ),
        };
      },

      catalog: () => MUSIC_CATALOG,
    }),
    {
      name: "lvl-factory-v2-tier1",
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
        tier1SeededAt: s.tier1SeededAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
