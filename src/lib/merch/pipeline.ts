import { settlementBlock } from "@/lib/factory/payment";
import { slugify } from "@/lib/utils";
import {
  buildPrintifyDraftPayload,
  PRINTIFY_STORE,
  productStoreUrl,
} from "./printify";
import { defaultBlueprintForKind } from "./catalog";
import type {
  ImagineBrief,
  MerchJob,
  MerchProduct,
  MerchProductKind,
  MerchPipelineStage,
} from "./types";

export const PIPELINE_STAGES: {
  stage: MerchPipelineStage;
  progress: number;
  note: string;
  ms: number;
}[] = [
  {
    stage: "brief",
    progress: 12,
    note: "Locked design brief + print-safe constraints",
    ms: 400,
  },
  {
    stage: "imagine",
    progress: 38,
    note: "Grok Imagine prompt compiled — design plate ready for render",
    ms: 1100,
  },
  {
    stage: "mockup",
    progress: 58,
    note: "Placed art on product mockup (tee / poster / hoodie template)",
    ms: 1800,
  },
  {
    stage: "printify_draft",
    progress: 78,
    note: "Printify product draft assembled (upload + variants + print areas)",
    ms: 2400,
  },
  {
    stage: "review",
    progress: 100,
    note: "Ready for operator review → publish to shop + agent catalog",
    ms: 2900,
  },
];

export function inventSku(title: string, kind: MerchProductKind): string {
  const base = slugify(title).toUpperCase().replace(/-/g, "").slice(0, 12);
  const k = kind.toUpperCase().slice(0, 4);
  const n = Math.floor(Math.random() * 900 + 100);
  return `LVL-${k}-${base || "DROP"}-${n}`;
}

export function briefToProduct(
  brief: ImagineBrief,
  kind: MerchProductKind = "tee",
): MerchProduct {
  const bp = defaultBlueprintForKind(kind);
  const now = new Date().toISOString();
  const slug = slugify(brief.title);
  const priceUsd = bp.priceUsd;
  return {
    id: `pipe-${brief.id}-${Date.now().toString(36)}`,
    sku: inventSku(brief.title, kind),
    slug,
    title: brief.title,
    description: `${brief.concept} · Generated via Grok Imagine pipeline for ${PRINTIFY_STORE.brand}. Fulfillment: Printify POD.`,
    kind,
    priceUsd,
    status: "brief",
    channel: "both",
    printifyUrl: null,
    printifyProductId: null,
    /** Placeholder mock uses live Printify CDN style until art is uploaded */
    mockupUrl: `https://images-api.printify.com/mockup/69a230baf7fc1928080dd1cd/12124/92570/main-character.jpg?camera_label=front&revision=1779087736987`,
    designUrl: null,
    brief,
    tags: [...brief.tags, "pipeline", "imagine"],
    agentShopable: true,
    settlement: settlementBlock(priceUsd),
    createdAt: now,
    updatedAt: now,
    progress: 0,
    notes: "Queued for agent merchandising pipeline",
    source: "pipeline",
  };
}

export function compileImagineJob(brief: ImagineBrief): {
  tool: "grok_imagine";
  prompt: string;
  negative: string;
  aspect_ratio: string;
  print_notes: string;
  output_targets: string[];
} {
  return {
    tool: "grok_imagine",
    prompt: brief.imaginePrompt,
    negative: brief.negativePrompt,
    aspect_ratio: brief.aspectRatio,
    print_notes: brief.printSafeNotes,
    output_targets: [
      "design_png_transparent",
      "printify_upload",
      "factory_merch_grid",
      "agent_catalog",
    ],
  };
}

export function buildDraftForProduct(product: MerchProduct) {
  return buildPrintifyDraftPayload({
    title: product.title,
    description: product.description,
    tags: product.tags,
    priceCents: Math.round(product.priceUsd * 100),
    designImageUrl: product.designUrl ?? undefined,
    kind: product.kind,
  });
}

export function publishProduct(product: MerchProduct): MerchProduct {
  const now = new Date().toISOString();
  const fakeId =
    product.printifyProductId ??
    String(28_000_000 + Math.floor(Math.random() * 1_000_000));
  return {
    ...product,
    status: "published",
    progress: 100,
    printifyProductId: fakeId,
    printifyUrl: product.printifyUrl ?? productStoreUrl(fakeId, product.slug),
    channel: "both",
    agentShopable: true,
    updatedAt: now,
    notes: `Published to merch shelf + agent catalog. Printify storefront: ${PRINTIFY_STORE.storefrontUrl}`,
  };
}

export function newJob(productId: string): MerchJob {
  return {
    id: `job-${Date.now().toString(36)}`,
    productId,
    stage: "brief",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    logs: ["Pipeline accepted job"],
    error: null,
  };
}
