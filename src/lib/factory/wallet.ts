/**
 * Multi-wallet connect for LVL checkout.
 * - EIP-6963 injected wallets (MetaMask, Coinbase, Rabby, Brave, Trust, etc.)
 * - WalletConnect v2 (Sign API + QR modal via @walletconnect/ethereum-provider)
 * - Mobile deep links when no injected provider
 * Ethereum mainnet (chainId 1) is fully allowed.
 */

import type { MainnetId, NetworkRail } from "./payment";
import { NETWORKS, TREASURY_EVM, getNetwork } from "./payment";
import {
  WALLETCONNECT_SETUP,
  WALLETCONNECT_VERSION,
  buildWalletConnectV2Options,
  getWalletConnectProjectId,
  isWalletConnectConfigured,
  walletConnectStatusLabel,
} from "./wallet-config";

export type Eip1193Provider = {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
  isRabby?: boolean;
  isTrust?: boolean;
  isRainbow?: boolean;
  providers?: Eip1193Provider[];
};

export type DiscoveredWallet = {
  id: string;
  name: string;
  rdns?: string;
  icon?: string;
  provider: Eip1193Provider;
  kind: "injected" | "walletconnect";
};

export type ConnectedSession = {
  account: string;
  chainId: number;
  walletName: string;
  provider: Eip1193Provider;
  via: "injected" | "walletconnect";
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
    coinbaseWalletExtension?: Eip1193Provider;
    trustwallet?: Eip1193Provider;
  }
}

export {
  getWalletConnectProjectId,
  isWalletConnectConfigured,
  WALLETCONNECT_SETUP,
  WALLETCONNECT_VERSION,
  walletConnectStatusLabel,
};

/** WalletConnect v2 EthereumProvider singleton */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wcProvider: any = null;
let wcInitPromise: Promise<Eip1193Provider> | null = null;

export function isMobileUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(
    navigator.userAgent,
  );
}

export function isInWalletBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const eth = window.ethereum;
  if (!eth) return false;
  return isMobileUa() && !!eth.request;
}

/** EIP-6963 multi-wallet discovery + legacy window.ethereum */
export function discoverInjectedWallets(): DiscoveredWallet[] {
  if (typeof window === "undefined") return [];
  const found: DiscoveredWallet[] = [];
  const seen = new WeakSet<object>();

  const add = (
    provider: Eip1193Provider | undefined,
    name: string,
    id: string,
    rdns?: string,
  ) => {
    if (!provider || !provider.request || seen.has(provider)) return;
    seen.add(provider);
    found.push({
      id,
      name,
      rdns,
      provider,
      kind: "injected",
    });
  };

  const eip6963: DiscoveredWallet[] = [];
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent).detail as
      | {
          info?: { uuid?: string; name?: string; rdns?: string; icon?: string };
          provider?: Eip1193Provider;
        }
      | undefined;
    if (!detail?.provider) return;
    const info = detail.info || {};
    eip6963.push({
      id: info.uuid || info.rdns || `eip6963-${eip6963.length}`,
      name: info.name || "Browser wallet",
      rdns: info.rdns,
      icon: info.icon,
      provider: detail.provider,
      kind: "injected",
    });
  };
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {
    /* ignore */
  }
  window.removeEventListener("eip6963:announceProvider", onAnnounce);
  for (const w of eip6963) {
    if (!seen.has(w.provider)) {
      seen.add(w.provider);
      found.push(w);
    }
  }

  const eth = window.ethereum;
  if (eth) {
    if (Array.isArray(eth.providers)) {
      eth.providers.forEach((p, i) => {
        const name = p.isMetaMask
          ? "MetaMask"
          : p.isCoinbaseWallet
            ? "Coinbase Wallet"
            : p.isRabby
              ? "Rabby"
              : p.isBraveWallet
                ? "Brave Wallet"
                : p.isTrust
                  ? "Trust Wallet"
                  : p.isRainbow
                    ? "Rainbow"
                    : `Injected wallet ${i + 1}`;
        add(p, name, `injected-${i}-${name}`);
      });
    } else {
      const name = eth.isMetaMask
        ? "MetaMask"
        : eth.isCoinbaseWallet
          ? "Coinbase Wallet"
          : eth.isRabby
            ? "Rabby"
            : eth.isBraveWallet
              ? "Brave Wallet"
              : eth.isTrust
                ? "Trust Wallet"
                : "Browser wallet";
      add(eth, name, "injected-primary");
    }
  }

  add(window.coinbaseWalletExtension, "Coinbase Wallet", "cb-ext");
  add(window.trustwallet, "Trust Wallet", "trust-ext");

  return found;
}

export type MobileWalletLink = {
  id: string;
  name: string;
  open: (pageUrl: string) => void;
};

export function mobileWalletLinks(): MobileWalletLink[] {
  return [
    {
      id: "metamask",
      name: "MetaMask",
      open: (pageUrl) => {
        const u = pageUrl.replace(/^https?:\/\//, "");
        window.location.href = `https://metamask.app.link/dapp/${u}`;
      },
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      open: (pageUrl) => {
        window.location.href = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(pageUrl)}`;
      },
    },
    {
      id: "trust",
      name: "Trust Wallet",
      open: (pageUrl) => {
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(pageUrl)}`;
      },
    },
    {
      id: "rainbow",
      name: "Rainbow",
      open: (pageUrl) => {
        window.location.href = `https://rnbwapp.com/dapp?url=${encodeURIComponent(pageUrl)}`;
      },
    },
    {
      id: "zerion",
      name: "Zerion",
      open: (pageUrl) => {
        window.location.href = `https://app.zerion.io/browser?url=${encodeURIComponent(pageUrl)}`;
      },
    },
    {
      id: "imtoken",
      name: "imToken",
      open: (pageUrl) => {
        window.location.href = `imtokenv2://navigate/DappView?url=${encodeURIComponent(pageUrl)}`;
      },
    },
    {
      id: "tokenpocket",
      name: "TokenPocket",
      open: (pageUrl) => {
        window.location.href = `tpdapp://open?params=${encodeURIComponent(
          JSON.stringify({ url: pageUrl }),
        )}`;
      },
    },
  ];
}

function chainParams(network: NetworkRail) {
  return {
    chainId: `0x${network.chainId.toString(16)}`,
    chainName: network.name,
    nativeCurrency: {
      name: network.nativeSymbol,
      symbol: network.nativeSymbol,
      decimals: 18,
    },
    rpcUrls: [network.rpcHint],
    blockExplorerUrls: [
      network.explorerAddress.replace(/address\/?$/, "").replace(/\/$/, ""),
    ],
  };
}

export async function ensureChain(
  provider: Eip1193Provider,
  networkId: MainnetId,
): Promise<number> {
  const network = getNetwork(networkId);
  const want = `0x${network.chainId.toString(16)}`;
  const current = String(
    await provider.request({ method: "eth_chainId" }),
  ).toLowerCase();
  if (current === want.toLowerCase()) return network.chainId;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: want }],
    });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? Number((e as { code: number }).code)
        : 0;
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [chainParams(network)],
      });
    } else {
      throw e;
    }
  }
  return network.chainId;
}

export async function connectInjected(
  wallet: DiscoveredWallet,
  networkId: MainnetId,
): Promise<ConnectedSession> {
  const accounts = (await wallet.provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts?.[0]) throw new Error("No account returned from wallet");
  const chainId = await ensureChain(wallet.provider, networkId);
  return {
    account: accounts[0],
    chainId,
    walletName: wallet.name,
    provider: wallet.provider,
    via: "injected",
  };
}

/**
 * WalletConnect v2 — opens QR / mobile deep-link modal (Reown AppKit under the hood).
 * Supports all mainnets; session can switch chains after connect.
 */
export async function connectWalletConnect(
  networkId: MainnetId,
): Promise<ConnectedSession> {
  if (typeof window === "undefined") {
    throw new Error("WalletConnect only runs in the browser");
  }

  if (!isWalletConnectConfigured()) {
    throw new Error(
      `WalletConnect v2 Project ID missing. Set ${WALLETCONNECT_SETUP.envKey} (get one free at ${WALLETCONNECT_SETUP.cloudUrl})`,
    );
  }

  const network = getNetwork(networkId);
  const provider = await getOrInitWalletConnectV2(network.chainId);

  // Prefer provider.connect() for WC v2 (enable is legacy alias)
  const p = provider as unknown as {
    connect?: () => Promise<void>;
    enable?: () => Promise<string[]>;
  };
  if (typeof p.connect === "function") {
    await p.connect();
  } else if (typeof p.enable === "function") {
    await p.enable();
  }

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts?.[0]) throw new Error("WalletConnect v2 returned no account");

  let chainId = network.chainId;
  try {
    chainId = await ensureChain(provider, networkId);
  } catch {
    // Some mobile wallets approve chain later — still return session
    try {
      chainId = parseInt(
        String(await provider.request({ method: "eth_chainId" })),
        16,
      );
    } catch {
      chainId = network.chainId;
    }
  }

  return {
    account: accounts[0],
    chainId,
    walletName: "WalletConnect v2",
    provider,
    via: "walletconnect",
  };
}

async function getOrInitWalletConnectV2(
  activeChainId: number,
): Promise<Eip1193Provider> {
  if (wcProvider) {
    return wcProvider as Eip1193Provider;
  }
  if (wcInitPromise) return wcInitPromise;

  wcInitPromise = (async () => {
    const { default: EthereumProvider } = await import(
      "@walletconnect/ethereum-provider"
    );

    const opts = buildWalletConnectV2Options(activeChainId);
    const provider = await EthereumProvider.init(opts);

    // Session lifecycle
    provider.on("disconnect", () => {
      wcProvider = null;
      wcInitPromise = null;
    });
    provider.on("session_delete", () => {
      wcProvider = null;
      wcInitPromise = null;
    });

    wcProvider = provider;
    return provider as unknown as Eip1193Provider;
  })();

  try {
    return await wcInitPromise;
  } catch (e) {
    wcInitPromise = null;
    wcProvider = null;
    throw e;
  }
}

export async function disconnectWallet(session: ConnectedSession | null) {
  if (!session) return;
  if (session.via === "walletconnect" && wcProvider) {
    try {
      if (typeof wcProvider.disconnect === "function") {
        await wcProvider.disconnect();
      }
    } catch {
      /* ignore */
    }
    wcProvider = null;
    wcInitPromise = null;
  }
}

function pad32(hex: string): string {
  return hex.replace(/^0x/i, "").padStart(64, "0");
}

function encodeErc20Transfer(to: string, amountAtomic: bigint): string {
  const selector = "a9059cbb";
  const addr = pad32(to.toLowerCase());
  const amt = pad32(amountAtomic.toString(16));
  return `0x${selector}${addr}${amt}`;
}

export async function sendPayment(opts: {
  session: ConnectedSession;
  networkId: MainnetId;
  tokenContract: string | null;
  decimals: number;
  amount: number;
  to?: string;
}): Promise<string> {
  const { session, networkId, tokenContract, decimals, amount } = opts;
  const to = opts.to || TREASURY_EVM;
  await ensureChain(session.provider, networkId);

  const atomic = BigInt(Math.round(amount * 10 ** decimals));

  if (!tokenContract) {
    const valueHex = `0x${atomic.toString(16)}`;
    const hash = (await session.provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: session.account,
          to,
          value: valueHex,
          data: "0x",
        },
      ],
    })) as string;
    return hash;
  }

  const data = encodeErc20Transfer(to, atomic);
  const hash = (await session.provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: session.account,
        to: tokenContract,
        value: "0x0",
        data,
      },
    ],
  })) as string;
  return hash;
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function checkoutPageUrl(): string {
  if (typeof window === "undefined") return "https://factory.lvlltd.com/pay";
  return window.location.href.split("#")[0];
}

export const ETHEREUM_MAINNET: MainnetId = "ethereum";

export function networksForUi(): NetworkRail[] {
  const order: MainnetId[] = [
    "ethereum",
    "base",
    "solana",
    "arbitrum",
    "optimism",
    "polygon",
  ];
  return order
    .map((id) => NETWORKS.find((n) => n.id === id))
    .filter((n): n is NetworkRail => !!n);
}
