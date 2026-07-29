/**
 * Multi-rail payments for lvlltd.com
 * - Crypto: buyer picks any supported MAINNET + asset (no testnets)
 *   EVM: Ethereum, Base, Arbitrum, Optimism, Polygon
 *   Solana mainnet: USDC / USDT / SOL
 * - Card: Stripe Payment Links (live)
 * - Default recommended rail remains Base USDC for agents / x402
 */

export const TREASURY_EVM = "0xa00876513bAA433ce2B58A5341Fd06d2b6f9A6ED" as const;

/** Solana mainnet treasury — set VITE_TREASURY_SOL (base58) */
const DEFAULT_TREASURY_SOL = "8sjT1G2YWpscXbJmwv2UK1rHZmQFLaczU5KXiiS8gvDy";

function readTreasurySol(): string {
  try {
    const v = import.meta.env.VITE_TREASURY_SOL as string | undefined;
    if (v && v.trim().length >= 32) return v.trim();
  } catch {
    /* ignore */
  }
  if (typeof process !== "undefined" && process.env?.VITE_TREASURY_SOL) {
    const v = process.env.VITE_TREASURY_SOL.trim();
    if (v.length >= 32) return v;
  }
  return DEFAULT_TREASURY_SOL;
}

export const TREASURY_SOL = readTreasurySol();

export function isValidSolanaAddress(addr: string): boolean {
  // base58, 32–44 chars typical
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

/** Mainnets only — never sepolia / holesky / amoy / etc. */
export type MainnetId =
  | "base"
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "polygon"
  | "solana";

export type AssetSymbol = "USDC" | "USDT" | "ETH" | "MATIC" | "SOL";
export type SolanaAssetSymbol = "USDC" | "USDT" | "SOL";

export interface NetworkRail {
  id: MainnetId;
  name: string;
  chainId: number;
  networkCaip2: string;
  nativeSymbol: string;
  explorerTx: string;
  explorerAddress: string;
  rpcHint: string;
  isTestnet: false;
  family: "evm" | "solana";
  assets: AssetOption[];
}

export interface AssetOption {
  symbol: AssetSymbol;
  name: string;
  /** ERC-20 / SPL mint, or null for native */
  contract: string | null;
  decimals: number;
  preferred?: boolean;
  isGas?: boolean;
}

export const NETWORKS: NetworkRail[] = [
  {
    id: "base",
    name: "Base",
    chainId: 8453,
    networkCaip2: "eip155:8453",
    nativeSymbol: "ETH",
    explorerTx: "https://basescan.org/tx/",
    explorerAddress: "https://basescan.org/address/",
    rpcHint: "https://mainnet.base.org",
    isTestnet: false,
    family: "evm",
    assets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        preferred: true,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        contract: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        decimals: 6,
      },
      {
        symbol: "ETH",
        name: "Ether (Base native)",
        contract: null,
        decimals: 18,
        isGas: true,
      },
    ],
  },
  {
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    networkCaip2: "eip155:1",
    nativeSymbol: "ETH",
    explorerTx: "https://etherscan.io/tx/",
    explorerAddress: "https://etherscan.io/address/",
    rpcHint: "https://ethereum.publicnode.com",
    isTestnet: false,
    family: "evm",
    assets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
        preferred: true,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
      },
      {
        symbol: "ETH",
        name: "Ether",
        contract: null,
        decimals: 18,
        isGas: true,
      },
    ],
  },
  {
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    networkCaip2: "eip155:42161",
    nativeSymbol: "ETH",
    explorerTx: "https://arbiscan.io/tx/",
    explorerAddress: "https://arbiscan.io/address/",
    rpcHint: "https://arb1.arbitrum.io/rpc",
    isTestnet: false,
    family: "evm",
    assets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        contract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        decimals: 6,
        preferred: true,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        contract: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        decimals: 6,
      },
      {
        symbol: "ETH",
        name: "Ether (Arbitrum)",
        contract: null,
        decimals: 18,
        isGas: true,
      },
    ],
  },
  {
    id: "optimism",
    name: "Optimism",
    chainId: 10,
    networkCaip2: "eip155:10",
    nativeSymbol: "ETH",
    explorerTx: "https://optimistic.etherscan.io/tx/",
    explorerAddress: "https://optimistic.etherscan.io/address/",
    rpcHint: "https://mainnet.optimism.io",
    isTestnet: false,
    family: "evm",
    assets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        contract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        decimals: 6,
        preferred: true,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        contract: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
        decimals: 6,
      },
      {
        symbol: "ETH",
        name: "Ether (OP)",
        contract: null,
        decimals: 18,
        isGas: true,
      },
    ],
  },
  {
    id: "polygon",
    name: "Polygon",
    chainId: 137,
    networkCaip2: "eip155:137",
    nativeSymbol: "MATIC",
    explorerTx: "https://polygonscan.com/tx/",
    explorerAddress: "https://polygonscan.com/address/",
    rpcHint: "https://polygon-rpc.com",
    isTestnet: false,
    family: "evm",
    assets: [
      {
        symbol: "USDC",
        name: "USD Coin",
        contract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        decimals: 6,
        preferred: true,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        contract: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
      },
      {
        symbol: "MATIC",
        name: "POL / MATIC (native)",
        contract: null,
        decimals: 18,
        isGas: true,
      },
    ],
  },
  {
    id: "solana",
    name: "Solana",
    /** 101 = mainnet-beta cluster id (non-EVM) */
    chainId: 101,
    networkCaip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    nativeSymbol: "SOL",
    explorerTx: "https://solscan.io/tx/",
    explorerAddress: "https://solscan.io/account/",
    rpcHint: "https://api.mainnet-beta.solana.com",
    isTestnet: false,
    family: "solana",
    assets: [
      {
        symbol: "USDC",
        name: "USD Coin (SPL)",
        contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimals: 6,
        preferred: true,
      },
      {
        symbol: "USDT",
        name: "Tether USD (SPL)",
        contract: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        decimals: 6,
      },
      {
        symbol: "SOL",
        name: "Solana (native)",
        contract: null,
        decimals: 9,
        isGas: true,
      },
    ],
  },
];

export const SOLANA_MAINNET = NETWORKS.find((n) => n.id === "solana")!;

export function getSolanaAsset(symbol: SolanaAssetSymbol): {
  symbol: SolanaAssetSymbol;
  mint: string | null;
  decimals: number;
} {
  const a = SOLANA_MAINNET.assets.find((x) => x.symbol === symbol);
  if (!a) throw new Error(`${symbol} not on Solana mainnet`);
  return {
    symbol,
    mint: a.contract,
    decimals: a.decimals,
  };
}

/** Live Stripe Payment Links (lvl X, Inc. — created 2026-07-29) */
export const STRIPE_LINKS = {
  canary50c: {
    url: "https://buy.stripe.com/4gM28r6Ap4QSb1126dgUM00",
    priceUsd: 0.5,
    priceId: "price_1TyaNTE6xjYB5uvsQ14RMx4y",
    productId: "prod_UyXSBjqYuZiLLh",
    skillId: "agent-x402-first-buy",
  },
  unlock99c: {
    url: "https://buy.stripe.com/3cI5kDf6Vbfg2uv4elgUM01",
    priceUsd: 0.99,
    priceId: "price_1TyaNUE6xjYB5uvsfyqWJvSX",
    productId: "prod_UyXSuY7SG6bD5j",
  },
  account: "acct_1TVJoWE6xjYB5uvs",
  minUsd: 0.5,
} as const;

export const DEFAULT_RAIL = {
  networkId: "base" as MainnetId,
  asset: "USDC" as AssetSymbol,
  payTo: TREASURY_EVM,
};

export const LVL_PAYMENT = {
  network: "base" as const,
  chainId: 8453 as const,
  networkCaip2: "eip155:8453" as const,
  asset: "USDC" as const,
  assetContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
  payTo: TREASURY_EVM,
  decimals: 6 as const,
  protocol: "x402" as const,
  explorerTx: "https://basescan.org/tx/" as const,
  label: "Multi-rail · EVM + Solana · Stripe" as const,
  multiRail: true as const,
  stripeEnabled: true as const,
  solanaEnabled: true as const,
} as const;

export function getNetwork(id: MainnetId): NetworkRail {
  const n = NETWORKS.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown network ${id}`);
  if (n.isTestnet) throw new Error("Testnets are not allowed");
  return n;
}

export function getAsset(networkId: MainnetId, symbol: AssetSymbol): AssetOption {
  const n = getNetwork(networkId);
  const a = n.assets.find((x) => x.symbol === symbol);
  if (!a) throw new Error(`${symbol} not available on ${networkId}`);
  return a;
}

export function usdcToAtomic(amountUsdc: number, decimals = 6): string {
  return String(Math.round(amountUsdc * 10 ** decimals));
}

export function formatFaceUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function formatAssetAmount(amountUsd: number, symbol: AssetSymbol): string {
  if (symbol === "USDC" || symbol === "USDT") {
    return `${amountUsd.toFixed(2)} ${symbol}`;
  }
  return `~$${amountUsd.toFixed(2)} in ${symbol} (market rate)`;
}

export function formatUsdcOnBase(amountUsdc: number): string {
  return `${amountUsdc.toFixed(2)} USDC on Base`;
}

export function formatUsdcFace(amountUsdc: number): string {
  return `${amountUsdc.toFixed(2)} USDC`;
}

export function assertBaseUsdc(_opts?: {
  network?: string;
  chainId?: number;
  asset?: string;
}): void {
  const testnetIds = [11155111, 84532, 421614, 11155420, 80002];
  if (_opts?.chainId && testnetIds.includes(_opts.chainId)) {
    throw new Error("Testnets are not allowed for LVL purchases.");
  }
}

export interface ChosenRail {
  method: "crypto" | "stripe";
  networkId?: MainnetId;
  chainId?: number;
  networkName?: string;
  asset?: AssetSymbol;
  contract?: string | null;
  decimals?: number;
  payTo?: string;
  amountUsd: number;
  amountLabel: string;
  explorerTx?: string;
  stripeUrl?: string;
  family?: "evm" | "solana";
  note: string;
}

export function buildCryptoChoice(
  networkId: MainnetId,
  asset: AssetSymbol,
  amountUsd: number,
): ChosenRail {
  const n = getNetwork(networkId);
  const a = getAsset(networkId, asset);
  const payTo = n.family === "solana" ? TREASURY_SOL || "(set VITE_TREASURY_SOL)" : TREASURY_EVM;
  return {
    method: "crypto",
    networkId,
    chainId: n.chainId,
    networkName: n.name,
    asset,
    contract: a.contract,
    decimals: a.decimals,
    payTo,
    amountUsd,
    amountLabel: formatAssetAmount(amountUsd, asset),
    explorerTx: n.explorerTx,
    family: n.family,
    note:
      n.family === "solana"
        ? asset === "USDC" || asset === "USDT"
          ? `Send exactly ${amountUsd.toFixed(2)} ${asset} (SPL) on Solana mainnet to payTo. Keep a little SOL for fees.`
          : `Send SOL worth ~$${amountUsd.toFixed(2)} on Solana mainnet. Prefer USDC for exact face.`
        : asset === "USDC" || asset === "USDT"
          ? `Send exactly ${amountUsd.toFixed(2)} ${asset} on ${n.name} (mainnet) to payTo. Gas is paid in ${n.nativeSymbol}.`
          : `Send ${n.nativeSymbol} worth ~$${amountUsd.toFixed(2)} on ${n.name} mainnet to payTo. Prefer USDC for exact face amount.`,
  };
}

export function buildStripeChoice(amountUsd: number, skillId?: string): ChosenRail {
  const useCanary =
    skillId === "agent-x402-first-buy" || amountUsd <= 0.5;
  const link = useCanary ? STRIPE_LINKS.canary50c : STRIPE_LINKS.unlock99c;
  return {
    method: "stripe",
    amountUsd: link.priceUsd,
    amountLabel: formatFaceUsd(link.priceUsd),
    stripeUrl: link.url,
    note: `Card / Apple Pay / Google Pay via Stripe (min $${STRIPE_LINKS.minUsd.toFixed(2)}). Crypto canary stays $0.05 if you prefer wallet.`,
  };
}

export function settlementBlock(amountUsdc: number) {
  return {
    priceUsdc: amountUsdc,
    price_usd: amountUsdc,
    price_label: `${amountUsdc.toFixed(2)} USD face`,
    amount_atomic: usdcToAtomic(amountUsdc),
    maxAmountRequired: usdcToAtomic(amountUsdc),
    network: "base" as const,
    chain_id: 8453 as const,
    network_caip2: "eip155:8453" as const,
    asset: "USDC" as const,
    assetContract: LVL_PAYMENT.assetContract,
    decimals: 6 as const,
    payTo: TREASURY_EVM,
    protocol: "x402" as const,
    settlement: "multi-rail" as const,
    default_rail: "base-usdc",
    accepted_networks: NETWORKS.map((n) => ({
      id: n.id,
      chainId: n.chainId,
      family: n.family,
      assets: n.assets.map((a) => a.symbol),
    })),
    solana: {
      enabled: true,
      network_caip2: SOLANA_MAINNET.networkCaip2,
      usdc_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      payTo: TREASURY_SOL || null,
    },
    stripe: {
      enabled: true,
      min_usd: STRIPE_LINKS.minUsd,
      canary_url: STRIPE_LINKS.canary50c.url,
      unlock_99_url: STRIPE_LINKS.unlock99c.url,
    },
    forbidden: {
      testnets: true,
      note: "Mainnets only: EVM chains + Solana. Buyer chooses network + asset, or pays by card via Stripe.",
    },
  };
}

export function assertMainnet(chainId: number): void {
  const ok = NETWORKS.some((n) => n.chainId === chainId && !n.isTestnet);
  if (!ok) {
    throw new Error(
      `Chain ${chainId} not allowed. Mainnets only: ${NETWORKS.map((n) => n.name).join(", ")}`,
    );
  }
}

export function canarySettlement(amountUsdc = 0.05) {
  return {
    skillId: "agent-x402-first-buy",
    amountUsdc,
    ...settlementBlock(amountUsdc),
    usdcContract: LVL_PAYMENT.assetContract,
    payUrl: "https://lvlltd.com/api/pay?skill=agent-x402-first-buy",
    outlineUrl: "https://lvlltd.com/skills/agent-x402-first-buy/outline.json",
    proofUrl: "https://lvlltd.com/api/proof",
    shopUrl: "https://lvlltd.com/api/shop",
    musicUrl: "https://music.lvlltd.com",
    marketUrl: "https://lvlltd.com",
    stripeUrl: STRIPE_LINKS.canary50c.url,
    multiRail: true,
  };
}
