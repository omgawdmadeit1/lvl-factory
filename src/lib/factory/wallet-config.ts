/**
 * WalletConnect v2 / Reown Cloud configuration for LVL checkout.
 *
 * Protocol: WalletConnect v2 (Sign API via @walletconnect/ethereum-provider)
 * Dashboard: https://dashboard.reown.com
 * Env override: VITE_WALLETCONNECT_PROJECT_ID
 */

import { NETWORKS } from "./payment";

/** LVL Reown project — https://dashboard.reown.com */
export const REOWN_PROJECT_ID = "7e30c6e6441bbc7523e87195868a572a";

/** WalletConnect v2 protocol version (not v1) */
export const WALLETCONNECT_VERSION = 2 as const;

/** Official WC v2 relay */
export const WALLETCONNECT_RELAY_URL = "wss://relay.walletconnect.com";

const PLACEHOLDER_IDS = new Set([
  "",
  "your_project_id_here",
  "YOUR_WALLETCONNECT_PROJECT_ID",
]);

function readEnvProjectId(): string {
  const viteId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
    | string
    | undefined;
  if (viteId && !PLACEHOLDER_IDS.has(String(viteId).trim())) {
    return String(viteId).trim();
  }

  if (typeof process !== "undefined" && process.env) {
    const fromNode =
      process.env.VITE_WALLETCONNECT_PROJECT_ID ||
      process.env.WALLETCONNECT_PROJECT_ID ||
      process.env.REOWN_PROJECT_ID;
    if (fromNode && !PLACEHOLDER_IDS.has(fromNode.trim())) {
      return fromNode.trim();
    }
  }

  return REOWN_PROJECT_ID;
}

export function getWalletConnectProjectId(): string {
  return readEnvProjectId();
}

export function isWalletConnectConfigured(): boolean {
  const id = getWalletConnectProjectId();
  return id.length >= 32 && /^[a-f0-9]+$/i.test(id);
}

export const WALLETCONNECT_CLOUD_URL = "https://dashboard.reown.com" as const;

export const WALLETCONNECT_SETUP = {
  envKey: "VITE_WALLETCONNECT_PROJECT_ID",
  cloudUrl: WALLETCONNECT_CLOUD_URL,
  version: WALLETCONNECT_VERSION,
  steps: [
    "Open https://dashboard.reown.com",
    "Copy the Project ID",
    "Set VITE_WALLETCONNECT_PROJECT_ID in .env (local) or Vercel env (production)",
    "Restart the app so Vite reloads env",
  ],
} as const;

/** Required EIP-1193 / WC methods for checkout + chain switching */
export const WC_V2_METHODS = [
  "eth_sendTransaction",
  "eth_signTransaction",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v4",
  "eth_accounts",
  "eth_requestAccounts",
  "eth_call",
  "eth_getBalance",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
  "wallet_watchAsset",
  "wallet_getPermissions",
  "wallet_requestPermissions",
] as const;

export const WC_V2_OPTIONAL_METHODS = [
  "eth_sendRawTransaction",
  "wallet_scanQRCode",
  "wallet_sendCalls",
  "wallet_getCapabilities",
  "wallet_getCallsStatus",
  "wallet_showCallsStatus",
] as const;

export const WC_V2_EVENTS = [
  "chainChanged",
  "accountsChanged",
  "connect",
  "disconnect",
  "message",
] as const;

export function getWalletConnectMetadata() {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://factory.lvlltd.com";

  return {
    name: "LVL Factory Checkout",
    description:
      "Multi-rail skill unlock on lvlltd.com — Ethereum + Base + L2s · USDC",
    url: origin,
    icons: [
      "https://lvlltd.com/favicon.ico",
      "https://lvlltd.com/apple-touch-icon.png",
    ],
  };
}

/** All mainnet chain IDs (numeric) for WC v2 optionalChains */
export function getAllMainnetChainIds(): number[] {
  return NETWORKS.filter((n) => n.family === "evm").map((n) => n.chainId);
}

/** rpcMap for ethereum-provider: { [chainId]: rpcUrl } */
export function getWalletConnectRpcMap(): Record<number, string> {
  return Object.fromEntries(
    NETWORKS.filter((n) => n.family === "evm").map((n) => [n.chainId, n.rpcHint]),
  ) as Record<number, string>;
}

/**
 * Full WalletConnect v2 init options for @walletconnect/ethereum-provider.
 * `activeChainId` is the buyer's selected mainnet (required chains[0]).
 */
export function buildWalletConnectV2Options(activeChainId: number) {
  const projectId = getWalletConnectProjectId();
  const all = getAllMainnetChainIds();
  const optional = all.filter((id) => id !== activeChainId);

  return {
    projectId,
    // WC v2 Sign Client — primary chain required, rest optional
    chains: [activeChainId] as [number, ...number[]],
    optionalChains: (optional.length
      ? optional
      : [activeChainId]) as [number, ...number[]],
    methods: [...WC_V2_METHODS],
    optionalMethods: [...WC_V2_OPTIONAL_METHODS],
    events: [...WC_V2_EVENTS],
    rpcMap: getWalletConnectRpcMap(),
    metadata: getWalletConnectMetadata(),
    showQrModal: true,
    relayUrl: WALLETCONNECT_RELAY_URL,
    disableProviderPing: false,
    qrModalOptions: {
      themeMode: "dark" as const,
      themeVariables: {
        "--wcm-z-index": "99999",
      },
      enableExplorer: true,
      explorerRecommendedWalletIds: [
        // MetaMask, Coinbase, Rainbow, Trust, Rabby (explorer ids)
        "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
        "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa",
        "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",
        "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0",
      ],
      privacyPolicyUrl: "https://lvlltd.com/privacy",
      termsOfServiceUrl: "https://lvlltd.com/terms",
    },
  };
}

export function walletConnectStatusLabel(): string {
  if (!isWalletConnectConfigured()) return "WalletConnect v2 · not configured";
  const id = getWalletConnectProjectId();
  return `WalletConnect v2 · ${id.slice(0, 8)}…`;
}
