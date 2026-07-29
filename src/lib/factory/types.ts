export type PackStatus =
  | "draft"
  | "processing"
  | "ready"
  | "approved"
  | "published"
  | "rejected";

export type PackKind = "music" | "skill";

export type Genre =
  | "country-trap"
  | "hip-hop"
  | "pop"
  | "r&b"
  | "edm"
  | "fusion"
  | "sessions";

export type PaymentRail = "x402" | "fiat" | "both" | "multi";

/** Multi-rail settlement — default Base USDC, buyer may pick mainnet + asset or Stripe */
export interface SettlementBlock {
  priceUsdc: number;
  price_usd: number;
  price_label: string;
  amount_atomic: string;
  maxAmountRequired: string;
  network: "base";
  chain_id: 8453;
  network_caip2: "eip155:8453";
  asset: "USDC";
  assetContract: string;
  decimals: 6;
  payTo: string;
  protocol: "x402";
  settlement: "multi-rail" | "base-usdc";
  default_rail?: string;
  accepted_networks?: { id: string; chainId: number; assets: string[] }[];
  stripe?: {
    enabled: boolean;
    min_usd: number;
    canary_url: string;
    unlock_99_url: string;
  };
  forbidden: {
    testnets?: boolean;
    ethereum_mainnet?: boolean;
    eth_as_payment?: boolean;
    note: string;
  };
}

export interface MusicTrack {
  id: string;
  title: string;
  genre: Genre;
  duration: string;
  bpm: number;
  key: string;
  flagRisk: "low" | "medium" | "high";
  plays: number;
  artworkHint: string;
}

export interface MusicPackage {
  id: string;
  kind: "music";
  status: PackStatus;
  createdAt: string;
  updatedAt: string;
  sourceTrackId: string;
  title: string;
  genre: Genre;
  bpm: number;
  key: string;
  style: string;
  metadata: {
    description: string;
    tags: string[];
    platforms: string[];
    downloadPriceUsdc: number;
    paymentRails: PaymentRail;
    settlement?: SettlementBlock;
  };
  alternativeMaster: {
    loudnessLufs: number;
    stereoWidth: number;
    flagMitigation: string[];
    fileName: string;
  };
  visualPackage: {
    coverPrompt: string;
    videoPrompt: string;
    waveformStyle: string;
    aspectRatios: string[];
  };
  releaseKit: {
    youtubeTitle: string;
    youtubeDescription: string;
    bandcampBlurb: string;
    captions: string[];
    checklist: string[];
  };
  progress: number;
  notes: string;
}

export interface SkillTemplate {
  id: string;
  title: string;
  category: string;
  priceUsdc: number;
  summary: string;
  capabilities: string[];
  flagship: boolean;
  canary: boolean;
  paymentRails: PaymentRail;
  afterPay: string[];
  uniqueSample: string;
  inputs: string[];
  outputs: string[];
  constraints: string[];
  buyerProof: string;
}

export interface SkillPackage {
  id: string;
  kind: "skill";
  status: PackStatus;
  createdAt: string;
  updatedAt: string;
  skillId: string;
  title: string;
  category: string;
  priceUsdc: number;
  flagship: boolean;
  canary: boolean;
  paymentRails: PaymentRail;
  afterPay: string[];
  outline: {
    summary: string;
    capabilities: string[];
    inputs: string[];
    outputs: string[];
    constraints: string[];
  };
  sampleMd: string;
  sealedManifest: {
    files: { path: string; description: string }[];
    version: string;
    runtime: string;
  };
  marketplace: {
    freeOutline: boolean;
    x402Path: string;
    fiatPath: string;
    tags: string[];
    buyerProof: string;
    settlement?: SettlementBlock;
  };
  progress: number;
  notes: string;
}

export type FactoryPackage = MusicPackage | SkillPackage;

export interface FactoryStats {
  musicCatalogSize: number;
  skillsInCatalog: number;
  packsReady: number;
  packsPublished: number;
  estimatedUsdc: number;
  flagshipsReady: number;
  canaryReady: boolean;
}

export interface Tier1ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  detail: string;
}
