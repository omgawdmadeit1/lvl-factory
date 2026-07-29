import { slugify } from "@/lib/utils";
import { SKILL_TEMPLATES } from "./catalog";
import type {
  Genre,
  MusicPackage,
  MusicTrack,
  SkillPackage,
} from "./types";

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const STYLE_BY_GENRE: Record<Genre, string> = {
  "country-trap": "dirt-road cinematic, trap drums, rural pride, outlaw energy",
  "hip-hop": "southern grit, stacked doubles, ambition narrative",
  pop: "radio-ready hook, clean modern polish",
  "r&b": "warm pads, intimate vocal, late-night glow",
  edm: "festival drop energy, widescreen synths",
  fusion: "genre-blend hybrid, experimental polish",
  sessions: "archive cut, raw demo energy",
};

export function buildMusicPackage(
  track: MusicTrack,
  options?: { styleOverride?: string },
): MusicPackage {
  const style = options?.styleOverride || STYLE_BY_GENRE[track.genre];
  const riskNotes =
    track.flagRisk === "high"
      ? [
          "Rebuild master with different limiter chain",
          "Export stems and re-render through alternate loudness path",
          "Prefer Bandcamp + music.lvlltd.com x402 over flagged distributors",
        ]
      : track.flagRisk === "medium"
        ? [
            "Mild spectral reshape + alternate loudness target",
            "Fresh artwork + metadata to avoid duplicate fingerprints",
          ]
        : ["Light polish only — keep character of original master"];

  const titleSlug = slugify(track.title);

  return {
    id: id("music"),
    kind: "music",
    status: "ready",
    createdAt: now(),
    updatedAt: now(),
    sourceTrackId: track.id,
    title: track.title,
    genre: track.genre,
    bpm: track.bpm,
    key: track.key,
    style,
    metadata: {
      description: `${track.title} — ${style}. Built for free stream on music.lvlltd.com with optional $0.05 USDC download via x402.`,
      tags: [
        track.genre,
        "joseph-taylor",
        "omgawdmadeit",
        "lvl-ltd",
        "rural",
        "base-usdc",
      ],
      platforms: ["music.lvlltd.com", "YouTube", "Bandcamp", "x402 download"],
      downloadPriceUsdc: 0.05,
    },
    alternativeMaster: {
      loudnessLufs: track.flagRisk === "high" ? -12.5 : -11.0,
      stereoWidth: track.flagRisk === "high" ? 0.82 : 0.9,
      flagMitigation: riskNotes,
      fileName: `${titleSlug}-alt-master.wav`,
    },
    visualPackage: {
      coverPrompt: `Cinematic single cover, ${track.artworkHint}, country-hip-hop mood, premium dark palette, bold title "${track.title}", no logos, photoreal, 1:1`,
      videoPrompt: `Music video atmosphere for "${track.title}", ${style}, slow push-in, grain, dusk light, 16:9, no text`,
      waveformStyle: "minimal monochrome waveform bar under title",
      aspectRatios: ["1:1", "16:9", "9:16"],
    },
    releaseKit: {
      youtubeTitle: `${track.title} | Joseph Taylor`,
      youtubeDescription: [
        `${track.title}`,
        "",
        `Genre: ${track.genre} · ${track.bpm} BPM · ${track.key}`,
        "Stream free · optional USDC download on music.lvlltd.com",
        "",
        "LVL LTD · music.lvlltd.com · lvlltd.com",
      ].join("\n"),
      bandcampBlurb: `Solo-built cut from the LVL catalog. ${style}. Tip-style $0.05 USDC unlocks on Base via the sister rails.`,
      captions: [
        `${track.title} — free stream, optional download.`,
        `New from the dirt-road stack. ${track.bpm} BPM.`,
        `Listen free on music.lvlltd.com`,
      ],
      checklist: [
        "Upload alt master + artwork to music.lvlltd.com asset folder",
        "Confirm x402 download price $0.05 USDC",
        "Publish free stream metadata",
        "Post 9:16 clip with waveform overlay",
        "Log unlock on public proof ledger when first sale hits",
      ],
    },
    progress: 100,
    notes: "",
  };
}

export function buildSkillPackage(templateId: string): SkillPackage {
  const tpl =
    SKILL_TEMPLATES.find((t) => t.id === templateId) ?? SKILL_TEMPLATES[0];

  const sampleMd = [
    `# ${tpl.title}`,
    "",
    `> Free sample — full sealed pack unlocks after x402 USDC payment on Base.`,
    "",
    "## What this skill does",
    tpl.summary,
    "",
    "## Capabilities",
    ...tpl.capabilities.map((c) => `- ${c}`),
    "",
    "## Quick start",
    "```",
    `GET https://lvlltd.com/skills/${tpl.id}/outline.json`,
    `GET https://lvlltd.com/api/pay?skill=${tpl.id}`,
    "# settle USDC on Base → POST txHash → sealed pack",
    "```",
    "",
    "## Notes",
    "- One-time unlock, re-download with same payment",
    "- Compatible with MetaMask humans and HTTP agents",
    "- First-party LVL LTD catalog format",
  ].join("\n");

  return {
    id: id("skill"),
    kind: "skill",
    status: "ready",
    createdAt: now(),
    updatedAt: now(),
    skillId: tpl.id,
    title: tpl.title,
    category: tpl.category,
    priceUsdc: tpl.priceUsdc,
    outline: {
      summary: tpl.summary,
      capabilities: [...tpl.capabilities],
      inputs: ["skill id", "optional agent context JSON"],
      outputs: ["outline.json", "sample.md", "sealed_pack.files"],
      constraints: [
        "No phone / human sales path required",
        "x402 on Base USDC only for unlock",
        "Sealed files only after verified tx",
      ],
    },
    sampleMd,
    sealedManifest: {
      files: [
        {
          path: "outline.json",
          description: "Machine-readable free evaluation outline",
        },
        { path: "sample.md", description: "Human-readable free sample" },
        {
          path: "sealed/implementation.md",
          description: "Full implementation guide (paid)",
        },
        {
          path: "sealed/prompts.json",
          description: "Production prompt pack (paid)",
        },
        {
          path: "sealed/checklist.md",
          description: "Operator checklist (paid)",
        },
      ],
      version: "1.0.0",
      runtime: "agent-agnostic / HTTP + JSON",
    },
    marketplace: {
      freeOutline: true,
      x402Path: `/api/pay?skill=${tpl.id}`,
      tags: ["lvl-ltd", "x402", "base", tpl.category, "agent-skill"],
    },
    progress: 100,
    notes: "",
  };
}

export function toMarketplaceListing(pack: SkillPackage) {
  return {
    id: pack.skillId,
    title: pack.title,
    category: pack.category,
    priceUsdc: pack.priceUsdc,
    freeOutline: true,
    outline: pack.outline,
    sample: pack.sampleMd,
    sealed: pack.sealedManifest,
    marketplace: pack.marketplace,
    status: pack.status,
    domain: "lvlltd.com",
    updatedAt: pack.updatedAt,
  };
}

export function toMusicReleaseExport(pack: MusicPackage) {
  return {
    domain: "music.lvlltd.com",
    operator: "lvlltd.com",
    track: {
      title: pack.title,
      genre: pack.genre,
      bpm: pack.bpm,
      key: pack.key,
      sourceTrackId: pack.sourceTrackId,
    },
    metadata: pack.metadata,
    alternativeMaster: pack.alternativeMaster,
    visualPackage: pack.visualPackage,
    releaseKit: pack.releaseKit,
    status: pack.status,
    updatedAt: pack.updatedAt,
  };
}
