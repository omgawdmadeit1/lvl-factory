import type { MusicTrack, SkillTemplate } from "./types";
import { canarySettlement, LVL_PAYMENT } from "./payment";

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

/**
 * Flagship + canary skill templates.
 * Prices are USDC face; settlement is multi-rail (mainnets + Stripe).
 */
export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: "agent-x402-first-buy",
    title: "Agent x402 First Buy",
    category: "Commerce",
    priceUsdc: 0.05,
    summary:
      "Canary skill that proves the full unlock path: free outline → 0.05 USDC face (any mainnet crypto or Stripe card) → sealed sample. Works for MetaMask humans, multi-rail wallets, and HTTP agents.",
    capabilities: [
      "HTTP 402 challenge with fixed 0.05 USDC face maxAmountRequired",
      "Multi-rail settlement: Base/Eth/Arb/OP/Polygon + USDC/USDT/native",
      "Stripe card path (live $0.50 min) when wallet gas is tight",
      "Idempotent sealed re-download with same payment",
      "Public proof ledger entry after unlock",
    ],
    flagship: true,
    canary: true,
    paymentRails: "both",
    afterPay: [
      "sealed/canary-checklist.md — exact human + agent steps",
      "sealed/sample-payload.json — proof that pay unlocked real bytes",
      "sealed/human-checklist.md — multi-rail wallet + Stripe path",
    ],
    uniqueSample: `## Free sample — First Buy Canary

This is the cheapest honest proof that LVL rails work.

**What you prove with 0.05 USDC face**
1. Your wallet can send on any supported mainnet to the LVL payTo address — or you pay by card.
2. The pay endpoint returns a real HTTP 402 challenge (not a fake cart).
3. After POST of txHash (or Stripe match), sealed bytes unlock and /api/proof moves.

**Free outline only**
- Challenge shape (maxAmountRequired, payTo, default Base USDC)
- Multi-rail chooser: pick network where you already have gas
- Stripe $0.50 card canary when MetaMask fails

**Human path**
1. Open /pay → pick network + asset, or Stripe
2. Crypto: send face amount to payTo on that mainnet
3. Card: complete Stripe Checkout
4. Unlock sealed pack → check /api/proof
`,
    inputs: ["wallet on any mainnet OR card", "tiny balance"],
    outputs: ["sealed canary pack", "proof ledger entry"],
    constraints: [
      "Fixed 0.05 USDC crypto canary — do not auto-raise",
      "Mainnets only — reject testnets",
      "Stripe min $0.50 for card path",
    ],
    buyerProof:
      "After unlock, /api/proof should show skill=agent-x402-first-buy with amount 0.05 USDC face (any accepted rail).",
  },
  {
    id: "wallet-onboarding-noncrypto-buyers",
    title: "Wallet Onboarding for Non-Crypto Buyers",
    category: "Onboarding",
    priceUsdc: 3.99,
    summary:
      "Exact human path that gets a non-crypto buyer to MetaMask + Base USDC without cart abandonment — screens, copy, failure recovery.",
    capabilities: [
      "Step map from zero wallet → first successful Base USDC send",
      "Wrong-network recovery (Ethereum → Base switch script)",
      "Insufficient funds + gas education without jargon",
      "Fiat onramp handoff pattern (Coinbase / card → Base USDC)",
    ],
    flagship: true,
    canary: false,
    paymentRails: "both",
    afterPay: [
      "sealed/onboarding-flow.md — full branch tree",
      "sealed/error-matrix.json — wrong network, insufficient funds, rejected",
      "sealed/copy-deck.md — MetaMask screenshots captions",
    ],
    uniqueSample: `## Free sample — Non-crypto buyer onboarding

Most humans die at "what is a network?"

**Dead ends you must cover**
- Buyer hits 0.05 USDC canary (good)
- Buyer has no Base USDC and no idea what Base is (death)
- Buyer is still on Ethereum mainnet (wrong chain death)
- Buyer confuses ETH gas with USDC payment

**Free outline**
1. Detect: has wallet? has Base? has USDC?
2. Branch: install · switch network · fund · pay · verify
3. Never ask them to pay on Ethereum
`,
    inputs: ["buyer persona", "current friction screenshots"],
    outputs: ["flow map", "error matrix", "copy deck"],
    constraints: [
      "Prefer canary 0.05 USDC before larger unlocks",
      "Mainnets only — testnets rejected; Stripe available as fallback",
    ],
    buyerProof:
      "A first-time buyer can complete canary via multi-rail crypto or Stripe without support chat.",
  },
  {
    id: "lvl-agent-revenue-os-pack",
    title: "LVL Agent Revenue OS Pack",
    category: "Launch",
    priceUsdc: 49,
    summary:
      "Ship one live payment service and one paid product on x402 rails with hour-1 checklist, unit economics, and proof-ledger discipline.",
    capabilities: [
      "Hour-1 live rails checklist",
      "Unit economics sheet for USDC on Base",
      "Proof ledger discipline (no fake GMV)",
      "Canary → flagship ladder design",
    ],
    flagship: true,
    canary: false,
    paymentRails: "both",
    afterPay: [
      "sealed/hour1-checklist.md",
      "sealed/unit-economics.xlsx.md",
      "sealed/proof-ledger-policy.md",
      "sealed/launch-copy.md",
    ],
    uniqueSample: `## Free sample — Revenue OS

You cannot fake a proof ledger.

**Free outline**
- x402 on Base USDC exists
- Free outline → canary → flagship is the only honest ladder
- Why price_label must say "USDC on Base" not bare ETH fantasy
`,
    inputs: ["current product inventory", "treasury payTo", "catalog size"],
    outputs: ["launch checklist", "economics", "ledger policy"],
    constraints: ["Base USDC only", "No fake unlocks", "One-time unlock model"],
    buyerProof:
      "Operator ships one paid skill with live Base USDC settlement and public proof.",
  },
  {
    id: "x402-merchant-operating-system",
    title: "x402 Merchant Operating System",
    category: "Commerce",
    priceUsdc: 39,
    summary:
      "End-to-end OS for running an x402 skill market: catalog, pay path, proof, disputes, and growth without fake volume.",
    capabilities: [
      "Catalog schema with network=base + asset=USDC required fields",
      "Pay challenge generator (HTTP 402)",
      "Dispute + idempotency patterns",
      "Growth without fake GMV",
    ],
    flagship: true,
    canary: false,
    paymentRails: "x402",
    afterPay: [
      "sealed/merchant-os.md",
      "sealed/catalog-schema.json",
      "sealed/dispute-playbook.md",
    ],
    uniqueSample: `## Free sample — Merchant OS

Every listing must declare:
- network: base
- chain_id: 8453
- asset: USDC
- assetContract: ${LVL_PAYMENT.assetContract}

Ethereum mainnet is a hard reject.
`,
    inputs: ["merchant domain", "payTo", "catalog policy preferences"],
    outputs: ["OS doc", "schema", "dispute playbook"],
    constraints: ["Base USDC first", "No fake GMV", "Human override on disputes"],
    buyerProof:
      "Merchant can list a skill whose pay challenge returns network=base only.",
  },
  {
    id: "music-release-kit-composer",
    title: "Music Release Kit Composer",
    category: "Music",
    priceUsdc: 4.99,
    summary:
      "Turn one track into a full release kit for music.lvlltd.com — metadata, alt master notes, visuals, captions, and 0.05 USDC on Base download rails.",
    capabilities: [
      "x402 0.05 USDC download metadata for music.lvlltd.com",
      "Alt-master + flag mitigation notes",
      "Cover/video prompts + caption stack",
      "Bandcamp + YouTube kit",
    ],
    flagship: true,
    canary: false,
    paymentRails: "both",
    afterPay: [
      "sealed/release-kit.json",
      "sealed/metadata.md",
      "sealed/visual-prompts.md",
    ],
    uniqueSample: `## Free sample — Music kit

music.lvlltd.com stays free stream.
Optional download = 0.05 USDC on Base (never Ethereum).

**Free outline**
- Required metadata fields for free stream + 0.05 USDC download
- Why price is USDC face on Base, not ETH
`,
    inputs: ["track title", "genre", "bpm", "flag risk"],
    outputs: ["release kit", "metadata", "visual prompts"],
    constraints: ["Base USDC download only", "lvlltd.com domain family"],
    buyerProof:
      "One track exports with downloadPriceUsdc=0.05 and network=base.",
  },
  {
    id: "catalog-flag-mitigator",
    title: "Catalog Flag Mitigator",
    category: "Music",
    priceUsdc: 9.99,
    summary:
      "Playbook for tracks blocked by generative-AI distributor flags — alternate masters, metadata, and Base USDC direct rails.",
    capabilities: [
      "Flag risk scoring",
      "Alt master + loudness path",
      "Direct Base USDC monetization path when DSPs block",
    ],
    flagship: true,
    canary: false,
    paymentRails: "both",
    afterPay: [
      "sealed/flag-playbook.md",
      "sealed/alt-master-notes.md",
      "sealed/direct-rails.md",
    ],
    uniqueSample: `## Free sample — Flag mitigator

When SoundCloud/DSP flags block distribution:
1. Keep free stream on music.lvlltd.com
2. Sell download for USDC face (multi-rail crypto or Stripe)
3. Never depend on a single chain when the buyer has gas elsewhere
`,
    inputs: ["flagged track list", "current masters"],
    outputs: ["mitigation plan", "alt master notes", "direct rails"],
    constraints: ["Multi-rail + Stripe direct rails", "No fake DSP claims"],
    buyerProof:
      "Flagged track has a live multi-rail download path documented.",
  },
  {
    id: "x402-retry-idempotency-kit",
    title: "x402 Retry Idempotency Kit",
    category: "Commerce",
    priceUsdc: 0.99,
    summary:
      "Never double-charge or double-seal. Retry matrix + idempotency for Base USDC unlocks.",
    capabilities: [
      "Retry matrix for network flakes",
      "Idempotent unlock by txHash",
      "Same payment re-downloads forever",
    ],
    flagship: true,
    canary: false,
    paymentRails: "x402",
    afterPay: [
      "sealed/idempotency-spec.md",
      "sealed/retry-matrix.json",
      "sealed/recovery-notes.md",
    ],
    uniqueSample: `## Free sample — Retry / Idempotency

The first real unlock will flake. If you double-charge or double-seal, trust dies.

**Free outline**
- Challenge → settle → unlock as three durable states
- What "same payment re-downloads forever" means in code terms
- Settlement always verified on Base (8453), never chain 1
`,
    inputs: ["tx hash", "skill id", "prior attempt id"],
    outputs: ["idempotency spec", "retry matrix", "recovery notes"],
    constraints: [
      "Never invent settled status",
      "Prefer on-chain verification on Base",
    ],
    buyerProof:
      "Simulated double POST with same tx returns same sealed pack once.",
  },
];

export const TIER1_SEED = {
  musicTrackId: "trk-dirt-road-kings",
  skillIds: [
    "agent-x402-first-buy",
    "wallet-onboarding-noncrypto-buyers",
    "music-release-kit-composer",
  ] as const,
  flagshipShelfIds: [
    "agent-x402-first-buy",
    "wallet-onboarding-noncrypto-buyers",
    "lvl-agent-revenue-os-pack",
    "x402-merchant-operating-system",
    "music-release-kit-composer",
    "catalog-flag-mitigator",
    "x402-retry-idempotency-kit",
  ] as const,
};

/** Production canary — always Base USDC. */
export const CANARY = {
  ...canarySettlement(0.05),
  network: LVL_PAYMENT.network,
  chainId: LVL_PAYMENT.chainId,
  asset: LVL_PAYMENT.asset,
  payTo: LVL_PAYMENT.payTo,
  usdcContract: LVL_PAYMENT.assetContract,
};
