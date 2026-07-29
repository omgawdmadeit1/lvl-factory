import type { SettlementBlock } from "@/lib/factory/types";

/** Pipeline stage for Imagine → Printify merch */
export type MerchPipelineStage =
  | "brief"
  | "imagine"
  | "mockup"
  | "printify_draft"
  | "review"
  | "published"
  | "failed";

export type MerchProductKind =
  | "tee"
  | "hoodie"
  | "poster"
  | "sticker"
  | "canvas"
  | "mug"
  | "other";

export type MerchChannel = "printify" | "agent" | "both";

export interface ImagineBrief {
  id: string;
  title: string;
  concept: string;
  /** Grok Imagine / image_gen prompt — production-ready */
  imaginePrompt: string;
  negativePrompt: string;
  style: string;
  palette: string[];
  aspectRatio: "1:1" | "3:4" | "4:5" | "16:9";
  printSafeNotes: string;
  tags: string[];
}

export interface MerchProduct {
  id: string;
  sku: string;
  slug: string;
  title: string;
  description: string;
  kind: MerchProductKind;
  /** USD retail face (agents pay multi-rail at this face) */
  priceUsd: number;
  status: MerchPipelineStage;
  channel: MerchChannel;
  /** Live Printify Pop-up storefront URL */
  printifyUrl: string | null;
  printifyProductId: string | null;
  mockupUrl: string;
  /** Design art URL (Imagine output or uploaded) */
  designUrl: string | null;
  brief: ImagineBrief;
  tags: string[];
  agentShopable: boolean;
  settlement: SettlementBlock;
  createdAt: string;
  updatedAt: string;
  progress: number;
  notes: string;
  source: "printify_live" | "pipeline" | "seed";
}

export interface MerchJob {
  id: string;
  productId: string;
  stage: MerchPipelineStage;
  startedAt: string;
  finishedAt: string | null;
  logs: string[];
  error: string | null;
}

export interface AgentMerchListing {
  protocol: "lvl-merch-v1";
  domain: string;
  shop: {
    human: string;
    printify: string;
    agentCatalog: string;
    pay: string;
  };
  cloudflare: {
    apex: string;
    factory: string;
    note: string;
  };
  payment: {
    multi_rail: true;
    default_rail: "base-usdc";
    mainnets_only: true;
    stripe: boolean;
  };
  products: Array<{
    sku: string;
    title: string;
    price_usd: number;
    kind: MerchProductKind;
    mockup: string;
    printify_url: string | null;
    agent_buy: string;
    settlement: SettlementBlock;
    tags: string[];
  }>;
  generated_at: string;
}

export interface PrintifyConfig {
  shopSlug: string;
  storefrontUrl: string;
  apiBase: string;
  /** Server-side only — never expose to browser in prod without proxy */
  hasToken: boolean;
  domainTargets: {
    merch: string;
    art: string;
    factory: string;
    apex: string;
  };
}

export const MERCH_BLUEPRINTS = [
  {
    id: "tee-unisex",
    kind: "tee" as const,
    label: "Unisex heavy cotton tee",
    blueprintHint: 6,
    defaultPriceUsd: 25.99,
  },
  {
    id: "hoodie",
    kind: "hoodie" as const,
    label: "Pullover hoodie",
    blueprintHint: 77,
    defaultPriceUsd: 42.0,
  },
  {
    id: "poster-18x24",
    kind: "poster" as const,
    label: "Matte poster 18×24",
    blueprintHint: 5,
    defaultPriceUsd: 24.0,
  },
  {
    id: "sticker-sheet",
    kind: "sticker" as const,
    label: "Die-cut sticker pack",
    blueprintHint: 421,
    defaultPriceUsd: 8.0,
  },
  {
    id: "canvas",
    kind: "canvas" as const,
    label: "Gallery canvas",
    blueprintHint: 1159,
    defaultPriceUsd: 48.0,
  },
] as const;
