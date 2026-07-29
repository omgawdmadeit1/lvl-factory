import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { settlementBlock } from "@/lib/factory/payment";
import { downloadJson } from "@/lib/utils";
import { LIVE_PRINTIFY_PRODUCTS, IMAGINE_SEED_BRIEFS } from "./catalog";
import { buildAgentCatalog } from "./agent-commerce";
import {
  PIPELINE_STAGES,
  briefToProduct,
  buildDraftForProduct,
  compileImagineJob,
  newJob,
  publishProduct,
} from "./pipeline";
import type {
  ImagineBrief,
  MerchJob,
  MerchProduct,
  MerchProductKind,
  MerchPipelineStage,
} from "./types";

interface MerchState {
  products: MerchProduct[];
  jobs: MerchJob[];
  selectedId: string | null;
  runningJobId: string | null;
  lastMessage: string | null;
  hydrated: boolean;
  select: (id: string | null) => void;
  setHydrated: (v: boolean) => void;
  clearMessage: () => void;
  /** Queue a seed brief or custom brief through Imagine → Printify draft */
  runPipeline: (brief: ImagineBrief, kind?: MerchProductKind) => void;
  runSeedPipelines: () => void;
  approvePublish: (id: string) => void;
  reject: (id: string, reason: string) => void;
  remove: (id: string) => void;
  exportAgentCatalog: () => void;
  exportPrintifyDraft: (id: string) => void;
  exportImagineJob: (id: string) => void;
  published: () => MerchProduct[];
  drafts: () => MerchProduct[];
  agentCatalog: () => ReturnType<typeof buildAgentCatalog>;
  resetToLive: () => void;
}

function touch(p: MerchProduct, patch: Partial<MerchProduct>): MerchProduct {
  return {
    ...p,
    ...patch,
    updatedAt: new Date().toISOString(),
    settlement: patch.priceUsd
      ? settlementBlock(patch.priceUsd)
      : patch.settlement ?? p.settlement,
  };
}

function applyStage(
  productId: string,
  stage: MerchPipelineStage,
  progress: number,
  note: string,
  jobId: string,
) {
  useMerchStore.setState((state) => ({
    products: state.products.map((p) =>
      p.id === productId
        ? touch(p, { status: stage, progress, notes: note })
        : p,
    ),
    jobs: state.jobs.map((j) =>
      j.id === jobId
        ? {
            ...j,
            stage,
            logs: [...j.logs, note],
            finishedAt:
              stage === "review" || stage === "failed"
                ? new Date().toISOString()
                : null,
          }
        : j,
    ),
    runningJobId:
      stage === "review" || stage === "failed" ? null : state.runningJobId,
    lastMessage: note,
  }));
}

export const useMerchStore = create<MerchState>()(
  persist(
    (set, get) => ({
      products: LIVE_PRINTIFY_PRODUCTS,
      jobs: [],
      selectedId: null,
      runningJobId: null,
      lastMessage: null,
      hydrated: false,

      select: (id) => set({ selectedId: id }),
      setHydrated: (v) => set({ hydrated: v }),
      clearMessage: () => set({ lastMessage: null }),

      runPipeline: (brief, kind = "tee") => {
        if (get().runningJobId) {
          set({ lastMessage: "A pipeline job is already running" });
          return;
        }
        const product = briefToProduct(brief, kind);
        if (kind === "poster") {
          product.kind = "poster";
          product.priceUsd = 24;
          product.settlement = settlementBlock(24);
        } else if (kind === "hoodie") {
          product.kind = "hoodie";
          product.priceUsd = 42;
          product.settlement = settlementBlock(42);
        } else if (kind === "sticker") {
          product.kind = "sticker";
          product.priceUsd = 8;
          product.settlement = settlementBlock(8);
        }
        const job = newJob(product.id);
        set((s) => ({
          products: [product, ...s.products],
          jobs: [job, ...s.jobs],
          selectedId: product.id,
          runningJobId: job.id,
          lastMessage: `Pipeline started: ${product.title}`,
        }));

        PIPELINE_STAGES.forEach((step) => {
          window.setTimeout(() => {
            applyStage(
              product.id,
              step.stage,
              step.progress,
              step.note,
              job.id,
            );
          }, step.ms);
        });
      },

      runSeedPipelines: () => {
        const briefs = IMAGINE_SEED_BRIEFS;
        const kinds: MerchProductKind[] = ["tee", "poster", "hoodie"];
        briefs.forEach((b, i) => {
          window.setTimeout(() => {
            get().runPipeline(b, kinds[i % kinds.length]);
          }, i * 3200);
        });
        set({
          lastMessage: `Queued ${briefs.length} Imagine → Printify seed jobs`,
        });
      },

      approvePublish: (id) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? publishProduct(p) : p,
          ),
          lastMessage: "Published to merch shelf + agent catalog",
        }));
      },

      reject: (id, reason) => {
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id
              ? touch(p, {
                  status: "failed",
                  notes: reason,
                  progress: p.progress,
                })
              : p,
          ),
          lastMessage: `Rejected: ${reason}`,
        }));
      },

      remove: (id) => {
        set((s) => ({
          products: s.products.filter(
            (p) => p.id !== id || p.source === "printify_live",
          ),
          selectedId: s.selectedId === id ? null : s.selectedId,
          lastMessage:
            s.products.find((p) => p.id === id)?.source === "printify_live"
              ? "Live Printify products cannot be removed here"
              : "Removed pipeline product",
        }));
      },

      exportAgentCatalog: () => {
        const cat = buildAgentCatalog(get().products, {
          generatedAt: new Date().toISOString(),
        });
        downloadJson("lvl-merch-agent-catalog.json", cat);
        set({ lastMessage: "Exported agent catalog JSON" });
      },

      exportPrintifyDraft: (id) => {
        const p = get().products.find((x) => x.id === id);
        if (!p) return;
        downloadJson(`printify-draft-${p.sku}.json`, {
          product: p,
          printify_create_body: buildDraftForProduct(p),
          storefront: "https://lvlxltd.printify.me",
          note: "POST to Printify API with PRINTIFY_API_TOKEN + shop id when ready",
        });
        set({ lastMessage: `Exported Printify draft for ${p.sku}` });
      },

      exportImagineJob: (id) => {
        const p = get().products.find((x) => x.id === id);
        if (!p) return;
        downloadJson(`imagine-job-${p.sku}.json`, compileImagineJob(p.brief));
        set({ lastMessage: `Exported Grok Imagine job for ${p.sku}` });
      },

      published: () =>
        get().products.filter((p) => p.status === "published"),

      drafts: () =>
        get().products.filter((p) => p.status !== "published"),

      agentCatalog: () => buildAgentCatalog(get().products),

      resetToLive: () =>
        set({
          products: LIVE_PRINTIFY_PRODUCTS,
          jobs: [],
          selectedId: null,
          runningJobId: null,
          lastMessage: "Reset to live Printify catalog",
        }),
    }),
    {
      name: "lvl-merch-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        products: s.products,
        jobs: s.jobs.slice(0, 40),
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export { IMAGINE_SEED_BRIEFS };
