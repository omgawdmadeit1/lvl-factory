import type { MusicTrack } from "./types";

/** Seed catalog inspired by music.lvlltd.com structure (demo data for the factory). */
export const MUSIC_CATALOG: MusicTrack[] = [
  {
    id: "trk-2m-8ball",
    title: "2 Million and an 8 Ball",
    genre: "pop",
    duration: "3:42",
    bpm: 96,
    key: "G minor",
    flagRisk: "medium",
    plays: 12,
    artworkHint: "lone creator ridge dawn worn jacket notebook",
  },
  {
    id: "trk-19xx",
    title: "19xx",
    genre: "pop",
    duration: "3:14",
    bpm: 102,
    key: "A major",
    flagRisk: "low",
    plays: 8,
    artworkHint: "uplifting skyline nostalgia grain film",
  },
  {
    id: "trk-iloveme2",
    title: "I Love Me Too 2",
    genre: "r&b",
    duration: "2:17",
    bpm: 88,
    key: "D minor",
    flagRisk: "low",
    plays: 6,
    artworkHint: "romantic soft light city night",
  },
  {
    id: "trk-backroad-afterparty",
    title: "Backroad Afterparty",
    genre: "country-trap",
    duration: "2:40",
    bpm: 138,
    key: "E minor",
    flagRisk: "high",
    plays: 4,
    artworkHint: "dirt road lifted truck headlights fog",
  },
  {
    id: "trk-backroad-believer",
    title: "Backroad Believer",
    genre: "country-trap",
    duration: "3:19",
    bpm: 132,
    key: "C minor",
    flagRisk: "medium",
    plays: 5,
    artworkHint: "small town church gravel faith",
  },
  {
    id: "trk-dirt-road-kings",
    title: "Dirt Road Kings",
    genre: "country-trap",
    duration: "3:08",
    bpm: 138,
    key: "F# minor",
    flagRisk: "high",
    plays: 9,
    artworkHint: "cinematic rural pride convoy dusk",
  },
  {
    id: "trk-bonfire-heart",
    title: "Bonfire Heart",
    genre: "r&b",
    duration: "4:00",
    bpm: 74,
    key: "Bb major",
    flagRisk: "low",
    plays: 3,
    artworkHint: "firelight faces soft glow woods",
  },
  {
    id: "trk-2drunk",
    title: "2 Drunk 2 Drive Home",
    genre: "pop",
    duration: "2:45",
    bpm: 110,
    key: "E major",
    flagRisk: "medium",
    plays: 7,
    artworkHint: "late night porch keys in hand",
  },
];

export const SKILL_TEMPLATES = [
  {
    id: "agent-x402-first-buy",
    title: "Agent x402 First Buy",
    category: "payments",
    priceUsdc: 0.05,
    summary:
      "Canary skill that proves the x402 unlock path on Base USDC with a sealed sample pack.",
    capabilities: [
      "HTTP 402 challenge generation",
      "USDC settlement verification on Base",
      "Sealed pack unlock after tx proof",
    ],
  },
  {
    id: "music-release-kit-composer",
    title: "Music Release Kit Composer",
    category: "music",
    priceUsdc: 4.99,
    summary:
      "Composes platform-ready release kits (metadata, captions, checklists) for country-trap and rural catalogs.",
    capabilities: [
      "Title/description generation",
      "Platform checklist assembly",
      "Tag and genre normalization",
    ],
  },
  {
    id: "catalog-flag-mitigator",
    title: "Catalog Flag Mitigator",
    category: "music",
    priceUsdc: 9.99,
    summary:
      "Analyzes generative-AI flag risk and proposes alternative master parameters and safer distribution paths.",
    capabilities: [
      "Risk scoring heuristics",
      "Mastering parameter suggestions",
      "Platform routing recommendations",
    ],
  },
  {
    id: "sealed-skill-packager",
    title: "Sealed Skill Packager",
    category: "marketplace",
    priceUsdc: 2.99,
    summary:
      "Builds lvlltd.com-compatible outline, sample, and sealed file manifests for x402 skill listings.",
    capabilities: [
      "outline.json + sample.md generation",
      "Sealed file tree construction",
      "Marketplace metadata validation",
    ],
  },
  {
    id: "tesla-trek-bridge",
    title: "Tesla Trek Skill Bridge",
    category: "real-world",
    priceUsdc: 14.99,
    summary:
      "Bridge pack that packages Tesla Trek quest hooks and location-oracle demo payloads for agents.",
    capabilities: [
      "Quest payload templates",
      "XYO-style location proof stubs",
      "Demo narrative scaffolding",
    ],
  },
  {
    id: "rural-cover-prompt-lab",
    title: "Rural Cover Prompt Lab",
    category: "creative",
    priceUsdc: 3.99,
    summary:
      "Generates consistent dirt-road cinematic cover and video prompts matched to BPM/mood.",
    capabilities: [
      "Cover prompt packs",
      "Video scene boards",
      "Style consistency constraints",
    ],
  },
] as const;
