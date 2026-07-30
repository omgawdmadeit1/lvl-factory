/**
 * LVL Labs — catalog of every live product surface + interactive demo IDs.
 * Powers labs.lvlltd.com / /labs and the marketplace "try live" matrix.
 */

export type DemoKind =
  | "store"
  | "drops"
  | "pay"
  | "agent"
  | "exchange"
  | "fleet"
  | "studio"
  | "pulse"
  | "bundles"
  | "relay"
  | "music"
  | "skills"
  | "checkout"
  | "radar"
  | "syndicate"
  | "launch"
  | "bounty"
  | "vault"
  | "signal"
  | "arena";

export type LabDemo = {
  id: string;
  kind: DemoKind;
  title: string;
  blurb: string;
  path: string;
  host: string;
  market: string;
  /** Live interactive widget id rendered on Labs */
  widget:
    | "drop_claim"
    | "pay_rail"
    | "trade_tape"
    | "fleet_hire"
    | "intent_sign"
    | "stack_build"
    | "syndicate_join"
    | "launch_pledge"
    | "bounty_claim"
    | "vault_mint"
    | "signal_buy"
    | "arena_claim"
    | "none";
  badge: string;
  live: boolean;
  audience: "buyer" | "agent" | "operator" | "creator";
};

export const LAB_DEMOS: LabDemo[] = [
  {
    id: "lab-vault",
    kind: "vault",
    title: "IP Vault",
    blurb: "Mint seats, accrue royalties, claim USDC for skills & rights.",
    path: "/vault",
    host: "vault.lvlltd.com",
    market: "Digital IP ownership",
    widget: "vault_mint",
    badge: "Vault",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-signal",
    kind: "signal",
    title: "Signal market",
    blurb: "Buy restock intent, drop heat, agent traffic packs.",
    path: "/signal",
    host: "signal.lvlltd.com",
    market: "Attention economy",
    widget: "signal_buy",
    badge: "Signal",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-arena",
    kind: "arena",
    title: "Arena races",
    blurb: "Competitive drop claims with streaks and leaderboard.",
    path: "/arena",
    host: "arena.lvlltd.com",
    market: "Gamified commerce",
    widget: "arena_claim",
    badge: "Arena",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-syndicate",
    kind: "syndicate",
    title: "Syndicate",
    blurb: "Group buys — fill the crew, unlock stack prices on drops & packs.",
    path: "/syndicate",
    host: "syndicate.lvlltd.com",
    market: "Social commerce",
    widget: "syndicate_join",
    badge: "Crew",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-launch",
    kind: "launch",
    title: "Launch pad",
    blurb: "Waitlists and live pledges for the next LVL products.",
    path: "/launch",
    host: "launch.lvlltd.com",
    market: "GTM / launch",
    widget: "launch_pledge",
    badge: "Launch",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-bounty",
    kind: "bounty",
    title: "Bounty board",
    blurb: "Task escrow for agents & humans — claim, submit, settle USDC.",
    path: "/bounty",
    host: "bounty.lvlltd.com",
    market: "Task marketplace",
    widget: "bounty_claim",
    badge: "Escrow",
    live: true,
    audience: "agent",
  },
  {
    id: "lab-exchange",
    kind: "exchange",
    title: "LVL Exchange",
    blurb: "Secondary market for skills, music packs, agent licenses & design rights. Live order book.",
    path: "/exchange",
    host: "exchange.lvlltd.com",
    market: "Digital goods secondary market",
    widget: "trade_tape",
    badge: "Next market",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-fleet",
    kind: "fleet",
    title: "Agent Fleet",
    blurb: "Hire autonomous agent crews for drops, restock, support, and design ops.",
    path: "/fleet",
    host: "fleet.lvlltd.com",
    market: "Agent labor exchange",
    widget: "fleet_hire",
    badge: "Labor",
    live: true,
    audience: "operator",
  },
  {
    id: "lab-drops",
    kind: "drops",
    title: "Live drops",
    blurb: "Timed flash inventory — claim units into cart while the window is open.",
    path: "/drops",
    host: "drops.lvlltd.com",
    market: "Scarcity commerce",
    widget: "drop_claim",
    badge: "Flash",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-shop",
    kind: "store",
    title: "LVL Store",
    blurb: "Printify POD merch, art, agent drops — full storefront with cart.",
    path: "/shop",
    host: "shop.lvlltd.com",
    market: "Physical POD",
    widget: "none",
    badge: "Store",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-pay",
    kind: "pay",
    title: "Multi-rail pay",
    blurb: "USDC/USDT + native on Base/ETH/Solana · Stripe card canary.",
    path: "/pay",
    host: "pay.lvlltd.com",
    market: "Settlement",
    widget: "pay_rail",
    badge: "Rails",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-relay",
    kind: "relay",
    title: "Agent relay",
    blurb: "A2A commerce intents — sign and hand off to multi-rail pay.",
    path: "/relay",
    host: "relay.lvlltd.com",
    market: "Agent commerce",
    widget: "intent_sign",
    badge: "A2A",
    live: true,
    audience: "agent",
  },
  {
    id: "lab-bundles",
    kind: "bundles",
    title: "Stack packs",
    blurb: "Multi-SKU bundles with stack discounts — build a pack live.",
    path: "/bundles",
    host: "bundles.lvlltd.com",
    market: "Bundled commerce",
    widget: "stack_build",
    badge: "Stacks",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-studio",
    kind: "studio",
    title: "Design studio",
    blurb: "Imagine briefs → merch pipeline drafts.",
    path: "/studio",
    host: "studio.lvlltd.com",
    market: "Creator tools",
    widget: "none",
    badge: "Create",
    live: true,
    audience: "creator",
  },
  {
    id: "lab-pulse",
    kind: "pulse",
    title: "Network pulse",
    blurb: "Live activity stream across the domain mesh.",
    path: "/pulse",
    host: "pulse.lvlltd.com",
    market: "Network intel",
    widget: "none",
    badge: "Live",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-radar",
    kind: "radar",
    title: "Restock radar",
    blurb: "Watch sold-out drops and SKUs for re-opens.",
    path: "/radar",
    host: "radar.lvlltd.com",
    market: "Demand signal",
    widget: "none",
    badge: "Watch",
    live: true,
    audience: "buyer",
  },
  {
    id: "lab-agents",
    kind: "agent",
    title: "Agent shop",
    blurb: "lvl-merch-v1 protocol + machine-readable catalog.",
    path: "/agent/merch",
    host: "agents.lvlltd.com",
    market: "Machine commerce",
    widget: "none",
    badge: "Protocol",
    live: true,
    audience: "agent",
  },
  {
    id: "lab-music",
    kind: "music",
    title: "Music packs",
    blurb: "Release kits for music.lvlltd.com — factory listings.",
    path: "/music",
    host: "music.lvlltd.com",
    market: "Music IP",
    widget: "none",
    badge: "Music",
    live: true,
    audience: "operator",
  },
  {
    id: "lab-skills",
    kind: "skills",
    title: "Skill packs",
    blurb: "Composable skill products that settle on multi-rail pay.",
    path: "/skills",
    host: "factory.lvlltd.com",
    market: "Skill IP",
    widget: "none",
    badge: "Skills",
    live: true,
    audience: "operator",
  },
  {
    id: "lab-checkout",
    kind: "checkout",
    title: "Unified checkout",
    blurb: "Gift mode · loyalty credits · POD or multi-rail settle.",
    path: "/checkout",
    host: "checkout.lvlltd.com",
    market: "Conversion",
    widget: "none",
    badge: "Checkout",
    live: true,
    audience: "buyer",
  },
];

export const MARKET_THESES = [
  {
    id: "ip-vault",
    title: "IP ownership vault",
    thesis:
      "Licenses and design rights should yield — Vault accrues royalties and pairs with Exchange liquidity.",
    host: "vault.lvlltd.com",
    path: "/vault",
    why: "Primary mint is not the endgame; ownership streams are.",
  },
  {
    id: "attention-market",
    title: "Demand signal market",
    thesis:
      "Brands buy intent packs from radar, drops, agents, and waitlists — Signal prices attention.",
    host: "signal.lvlltd.com",
    path: "/signal",
    why: "Every mesh surface emits demand; package and sell it.",
  },
  {
    id: "gamified-drops",
    title: "Competitive drop races",
    thesis:
      "Arena turns flash inventory into sport — streaks, heat, leaderboards drive claim velocity.",
    host: "arena.lvlltd.com",
    path: "/arena",
    why: "Commerce is more sticky when it feels like a game.",
  },
  {
    id: "social-group-buy",
    title: "Social group buys",
    thesis:
      "Crews unlock stack prices together — Syndicate turns drops into coordinated demand.",
    host: "syndicate.lvlltd.com",
    path: "/syndicate",
    why: "Solo flash sales leave money on the table; co-purchase is the conversion lever.",
  },
  {
    id: "launchpad-gtm",
    title: "Always-on launchpad",
    thesis:
      "Every product gets waitlist → pledge → live — Launch is GTM infrastructure for the mesh.",
    host: "launch.lvlltd.com",
    path: "/launch",
    why: "Shipping without distribution is noise; launchpad is the amplifier.",
  },
  {
    id: "task-escrow",
    title: "Task escrow marketplace",
    thesis:
      "Bounties price agent and human labor in USDC with claim → submit → pay.",
    host: "bounty.lvlltd.com",
    path: "/bounty",
    why: "Fleet hires capacity; Bounty prices discrete outcomes.",
  },
  {
    id: "secondary-digital",
    title: "Secondary digital goods",
    thesis:
      "Skills, music packs, agent licenses, and design rights trade after mint — LVL Exchange is the order book.",
    host: "exchange.lvlltd.com",
    path: "/exchange",
    why: "Primary sales already exist; liquidity is the unlock.",
  },
  {
    id: "agent-labor",
    title: "Agent labor exchange",
    thesis:
      "Autonomous fleets bid for commerce ops: claim drops, watch restocks, run support, ship design drafts.",
    host: "fleet.lvlltd.com",
    path: "/fleet",
    why: "Every brand needs 24/7 operators; agents are the new workforce.",
  },
  {
    id: "live-demo-distribution",
    title: "Live demo distribution",
    thesis:
      "Every surface ships with a playable demo — buyers and agents try before they settle.",
    host: "labs.lvlltd.com",
    path: "/labs",
    why: "Demos convert faster than decks. Labs is the showroom for the whole domain mesh.",
  },
] as const;
