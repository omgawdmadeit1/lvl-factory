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
    tags: string[];
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
}
