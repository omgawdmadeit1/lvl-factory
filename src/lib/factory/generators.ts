import { slugify } from "@/lib/utils";
import { CANARY, SKILL_TEMPLATES } from "./catalog";
import {
  assertBaseUsdc,
  formatUsdcOnBase,
  LVL_PAYMENT,
  NETWORKS,
  STRIPE_LINKS,
  settlementBlock,
} from "./payment";
import type {
  Genre,
  MusicPackage,
  MusicTrack,
  SkillPackage,
  SkillTemplate,
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
          "Prefer Bandcamp + music.lvlltd.com multi-rail download over flagged distributors",
        ]
      : track.flagRisk === "medium"
        ? [
            "Mild spectral reshape + alternate loudness target",
            "Fresh artwork + metadata to avoid duplicate fingerprints",
          ]
        : ["Light polish only — keep character of original master"];

  const titleSlug = slugify(track.title);
  const downloadUsdc = 0.05;
  assertBaseUsdc({ network: "base", chainId: 8453, asset: "USDC" });

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
      description: `${track.title} — ${style}. Free stream on music.lvlltd.com; optional ${formatUsdcOnBase(downloadUsdc)} download via multi-rail crypto or Stripe (default agent rail Base USDC x402).`,
      tags: [
        track.genre,
        "joseph-taylor",
        "omgawdmadeit",
        "lvl-ltd",
        "rural",
        "multi-rail",
        "stripe",
        "base-usdc-default",
        "tier1",
      ],
      platforms: [
        "music.lvlltd.com",
        "YouTube",
        "Bandcamp",
        "multi-rail crypto download",
        "Stripe card checkout",
      ],
      downloadPriceUsdc: downloadUsdc,
      paymentRails: "both",
      settlement: settlementBlock(downloadUsdc),
    },
    alternativeMaster: {
      loudnessLufs: track.flagRisk === "high" ? -12.5 : -11.0,
      stereoWidth: track.flagRisk === "high" ? 0.82 : 0.9,
      flagMitigation: riskNotes,
      fileName: `${titleSlug}-alt-master.wav`,
    },
    visualPackage: {
      coverPrompt: `Album cover for "${track.title}" — ${style}, cinematic rural night, no logos`,
      videoPrompt: `Vertical lyric / mood film for "${track.title}", ${style}`,
      waveformStyle: "minimal monochrome waveform bar under title",
      aspectRatios: ["1:1", "9:16", "16:9"],
    },
    releaseKit: {
      youtubeTitle: `${track.title} | Joseph Taylor`,
      youtubeDescription: [
        track.title,
        "",
        style,
        "",
        `Stream free · optional ${formatUsdcOnBase(downloadUsdc)} download on music.lvlltd.com`,
        "Pay with any mainnet crypto or card (Stripe).",
      ].join("\n"),
      captions: [
        `${track.title} — free stream`,
        `Download unlock ${formatUsdcOnBase(downloadUsdc)} · multi-rail + Stripe`,
      ],
      bandcampBlurb: `Solo-built cut from the LVL catalog. ${style}. Tip-style ${formatUsdcOnBase(downloadUsdc)} unlock (crypto or card).`,
      checklist: [
        "Upload alt master",
        "Publish free stream on music.lvlltd.com",
        `Confirm download price ${formatUsdcOnBase(downloadUsdc)} multi-rail`,
        "Link Stripe or crypto payTo in listing",
      ],
    },
    progress: 100,
    notes: "",
  };
}

function findTemplate(templateId: string): SkillTemplate {
  return (
    SKILL_TEMPLATES.find((t) => t.id === templateId) ?? SKILL_TEMPLATES[0]
  );
}

export function buildSkillPackage(templateId: string): SkillPackage {
  const tpl = findTemplate(templateId);
  assertBaseUsdc({ network: "base", chainId: 8453, asset: "USDC" });
  const settle = settlementBlock(tpl.priceUsdc);

  const sampleMd = [
    `# ${tpl.title}`,
    "",
    `> Free sample — full sealed pack unlocks after verified payment of **${formatUsdcOnBase(tpl.priceUsdc)}** (multi-rail crypto or Stripe).`,
    "",
    "## Settlement (multi-rail)",
    `- default network: **${LVL_PAYMENT.network}** (chain ${LVL_PAYMENT.chainId})`,
    `- default asset: **${LVL_PAYMENT.asset}**`,
    `- payTo: \`${LVL_PAYMENT.payTo}\``,
    `- accepted: ${NETWORKS.map((n) => n.name).join(", ")} · USDC / USDT / native`,
    `- Stripe: live (min $${STRIPE_LINKS.minUsd.toFixed(2)})`,
    `- forbidden: testnets only`,
    "",
    "## What this skill does",
    tpl.summary,
    "",
    "## What you get after pay",
    ...tpl.afterPay.map((a) => `- ${a}`),
    "",
    tpl.uniqueSample.trim(),
    "",
    "## Capabilities",
    ...tpl.capabilities.map((c) => `- ${c}`),
    "",
    "## Quick start",
    "```",
    `GET https://lvlltd.com/skills/${tpl.id}/outline.json`,
    `GET https://lvlltd.com/api/pay?skill=${tpl.id}`,
    "# OR open factory /pay — pick mainnet + asset, or Stripe card",
    "# crypto: send face amount to payTo on chosen mainnet → POST txHash",
    "# card: Stripe Checkout → proof match / webhook unlock",
    "```",
    "",
    "## Buyer proof",
    tpl.buyerProof,
    "",
    "## Notes",
    "- One-time unlock, re-download with same payment",
    "- Compatible with MetaMask humans and HTTP agents",
    "- First-party LVL LTD catalog format",
    "- Price is USDC face; settlement is multi-rail (mainnets + Stripe)",
  ]
    .filter(Boolean)
    .join("\n");

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
    flagship: tpl.flagship,
    canary: tpl.canary,
    paymentRails: tpl.paymentRails,
    afterPay: [...tpl.afterPay],
    outline: {
      summary: tpl.summary,
      capabilities: [...tpl.capabilities],
      inputs: [...tpl.inputs],
      outputs: [...tpl.outputs],
      constraints: [...tpl.constraints],
    },
    sampleMd,
    sealedManifest: {
      files: [
        {
          path: "outline.json",
          description: "Machine-readable free evaluation outline",
        },
        { path: "sample.md", description: "Human-readable free sample (unique)" },
        ...tpl.afterPay.map((a) => {
          const path = a.split(" — ")[0] ?? a;
          return {
            path: path.startsWith("sealed/") ? path : `sealed/${path}`,
            description: a.includes(" — ")
              ? a.split(" — ").slice(1).join(" — ")
              : "Paid artifact",
          };
        }),
      ],
      version: "1.3.0-multi-rail",
      runtime: "agent-agnostic / HTTP + JSON",
    },
    marketplace: {
      freeOutline: true,
      x402Path: `/api/pay?skill=${tpl.id}`,
      fiatPath: `/api/fiat/session?skill=${tpl.id}`,
      tags: [
        "multi-rail",
        "stripe",
        "base-usdc-default",
        "tier1",
        tpl.category,
        "agent-skill",
        ...(tpl.flagship ? ["flagship"] : []),
        ...(tpl.canary ? ["canary"] : []),
      ],
      buyerProof: tpl.buyerProof,
      settlement: settle,
    },
    progress: 100,
    notes: "",
  };
}

export function toMarketplaceListing(pack: SkillPackage) {
  const settle = settlementBlock(pack.priceUsdc);
  assertBaseUsdc({
    network: settle.network,
    chainId: settle.chain_id,
    asset: settle.asset,
  });

  return {
    id: pack.skillId,
    title: pack.title,
    category: pack.category,
    priceUsdc: pack.priceUsdc,
    price_usd: pack.priceUsdc,
    price_label: formatUsdcOnBase(pack.priceUsdc),
    flagship: pack.flagship,
    canary: pack.canary,
    freeOutline: true,
    paymentRails: pack.paymentRails,
    afterPay: pack.afterPay,
    outline: pack.outline,
    sample: pack.sampleMd,
    sealed: pack.sealedManifest,
    marketplace: pack.marketplace,
    // Default agent/x402 rail stays Base USDC; full multi-rail in settlement
    x402: {
      protocol: LVL_PAYMENT.protocol,
      network: LVL_PAYMENT.network,
      network_caip2: LVL_PAYMENT.networkCaip2,
      chain_id: LVL_PAYMENT.chainId,
      asset: LVL_PAYMENT.asset,
      assetContract: LVL_PAYMENT.assetContract,
      decimals: LVL_PAYMENT.decimals,
      payTo: LVL_PAYMENT.payTo,
      maxAmountRequired: settle.maxAmountRequired,
      amount_atomic: settle.amount_atomic,
    },
    settlement: settle,
    stripe: settle.stripe,
    status: pack.status,
    domain: "lvlltd.com",
    quality: {
      boiler_skill_md: false,
      unique_sample: true,
      tier1: true,
      multi_rail: true,
      stripe_enabled: true,
      testnets_forbidden: true,
    },
    updatedAt: pack.updatedAt,
  };
}

export function toMusicReleaseExport(pack: MusicPackage) {
  const price = pack.metadata.downloadPriceUsdc;
  const settle = settlementBlock(price);
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
    metadata: {
      ...pack.metadata,
      downloadPriceUsdc: price,
      price_label: formatUsdcOnBase(price),
      settlement: settle,
    },
    alternativeMaster: pack.alternativeMaster,
    visualPackage: pack.visualPackage,
    releaseKit: pack.releaseKit,
    x402: {
      protocol: LVL_PAYMENT.protocol,
      network: LVL_PAYMENT.network,
      network_caip2: LVL_PAYMENT.networkCaip2,
      chain_id: LVL_PAYMENT.chainId,
      asset: LVL_PAYMENT.asset,
      assetContract: LVL_PAYMENT.assetContract,
      payTo: LVL_PAYMENT.payTo,
      maxAmountRequired: settle.maxAmountRequired,
    },
    settlement: settle,
    stripe: settle.stripe,
    status: pack.status,
    tier1: true,
    updatedAt: pack.updatedAt,
  };
}

export function toCanaryGuideExport() {
  const settle = settlementBlock(CANARY.amountUsdc);
  return {
    skillId: CANARY.skillId,
    amountUsdc: CANARY.amountUsdc,
    price_label: formatUsdcOnBase(CANARY.amountUsdc),
    multiRail: true,
    defaultNetwork: LVL_PAYMENT.network,
    chainId: LVL_PAYMENT.chainId,
    network_caip2: LVL_PAYMENT.networkCaip2,
    asset: LVL_PAYMENT.asset,
    payTo: LVL_PAYMENT.payTo,
    usdcContract: LVL_PAYMENT.assetContract,
    settlement: settle,
    stripe: {
      canary50c: STRIPE_LINKS.canary50c.url,
      unlock99c: STRIPE_LINKS.unlock99c.url,
      minUsd: STRIPE_LINKS.minUsd,
    },
    acceptedNetworks: NETWORKS.map((n) => ({
      id: n.id,
      chainId: n.chainId,
      assets: n.assets.map((a) => a.symbol),
    })),
    urls: {
      pay: CANARY.payUrl,
      outline: CANARY.outlineUrl,
      proof: CANARY.proofUrl,
      shop: CANARY.shopUrl,
      explorer: LVL_PAYMENT.explorerTx,
      factoryCheckout: "/pay",
      stripeCanary: STRIPE_LINKS.canary50c.url,
    },
    humanSteps: [
      "Open free outline (no wallet required)",
      "Open multi-rail checkout (/pay) — pick any mainnet you already fund, or Stripe card",
      "Crypto path: switch wallet to chosen mainnet, send face amount to payTo",
      "Card path: Stripe Checkout $0.50 canary (min) — no gas required",
      "POST txHash (crypto) or match Stripe payment (card) to unlock sealed pack",
      "Confirm entry appears on /api/proof",
    ],
    fiat: {
      enabled: true,
      provider: "stripe",
      canaryUrl: STRIPE_LINKS.canary50c.url,
      unlock99Url: STRIPE_LINKS.unlock99c.url,
      path: `/api/fiat/session?skill=${CANARY.skillId}`,
      note: "Stripe live in factory. Webhooks on lvlltd.com still needed for auto sealed unlock.",
    },
    forbidden: {
      testnets: true,
      note: "Mainnets only. Buyer chooses network + asset, or pays by card.",
    },
    successMetric:
      "Proof ledger unlock count increases; canary completion < 3 minutes via any rail",
  };
}

export function toFlagshipShelfExport() {
  return {
    domain: "lvlltd.com",
    generatedAt: now(),
    paymentPolicy: {
      settlement: "multi-rail",
      default_rail: "base-usdc",
      asset: LVL_PAYMENT.asset,
      network: LVL_PAYMENT.network,
      chainId: LVL_PAYMENT.chainId,
      network_caip2: LVL_PAYMENT.networkCaip2,
      assetContract: LVL_PAYMENT.assetContract,
      payTo: LVL_PAYMENT.payTo,
      accepted_networks: NETWORKS.map((n) => n.id),
      stripe: {
        enabled: true,
        min_usd: STRIPE_LINKS.minUsd,
        canary_url: STRIPE_LINKS.canary50c.url,
        unlock_99_url: STRIPE_LINKS.unlock99c.url,
      },
      rule: "Buyer chooses any supported mainnet crypto or Stripe card. Testnets forbidden. Default agent rail: Base USDC x402.",
    },
    policy: {
      demoteBoiler: true,
      requireUniqueSample: true,
      requireAfterPay: true,
      defaultShelf: "flagship",
      multiRail: true,
      stripeEnabled: true,
      testnetsForbidden: true,
    },
    skills: SKILL_TEMPLATES.filter((t) => t.flagship).map((t) => ({
      id: t.id,
      title: t.title,
      priceUsdc: t.priceUsdc,
      price_label: formatUsdcOnBase(t.priceUsdc),
      category: t.category,
      canary: t.canary,
      paymentRails: t.paymentRails,
      summary: t.summary,
      afterPay: t.afterPay,
      sampleMd: buildSkillPackage(t.id).sampleMd,
      listing: toMarketplaceListing(buildSkillPackage(t.id)),
    })),
    canary: toCanaryGuideExport(),
  };
}
