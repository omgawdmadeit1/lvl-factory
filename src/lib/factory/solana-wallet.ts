/**
 * Solana mainnet wallet support for LVL checkout.
 * Injected: Phantom, Solflare, Backpack, Glow, window.solana
 * Mobile deep links for Phantom / Solflare / Backpack.
 * Assets: USDC (SPL) preferred, USDT (SPL).
 */

import {
  SOLANA_MAINNET,
  TREASURY_SOL,
  type SolanaAssetSymbol,
  getSolanaAsset,
  isValidSolanaAddress,
} from "./payment";

export type SolanaProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  isGlow?: boolean;
  publicKey?: { toString: () => string };
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{
    publicKey: { toString: () => string };
  }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: any,
    opts?: { skipPreflight?: boolean },
  ) => Promise<string | { signature: string }>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type DiscoveredSolanaWallet = {
  id: string;
  name: string;
  provider: SolanaProvider;
};

export type SolanaSession = {
  account: string;
  walletName: string;
  provider: SolanaProvider;
  cluster: "mainnet-beta";
};

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    backpack?: { solana?: SolanaProvider };
    glowSolana?: SolanaProvider;
  }
}

export function discoverSolanaWallets(): DiscoveredSolanaWallet[] {
  if (typeof window === "undefined") return [];
  const found: DiscoveredSolanaWallet[] = [];
  const seen = new WeakSet<object>();

  const add = (
    provider: SolanaProvider | undefined,
    name: string,
    id: string,
  ) => {
    if (!provider || typeof provider.connect !== "function") return;
    if (seen.has(provider)) return;
    seen.add(provider);
    found.push({ id, name, provider });
  };

  add(window.phantom?.solana, "Phantom", "phantom");
  add(window.solflare, "Solflare", "solflare");
  add(window.backpack?.solana, "Backpack", "backpack");
  add(window.glowSolana, "Glow", "glow");

  if (window.solana && !found.some((w) => w.provider === window.solana)) {
    const name = window.solana.isPhantom
      ? "Phantom"
      : window.solana.isSolflare
        ? "Solflare"
        : window.solana.isBackpack
          ? "Backpack"
          : window.solana.isGlow
            ? "Glow"
            : "Solana wallet";
    add(window.solana, name, "solana-injected");
  }

  return found;
}

export type SolanaMobileLink = {
  id: string;
  name: string;
  open: (pageUrl: string) => void;
};

export function solanaMobileLinks(): SolanaMobileLink[] {
  return [
    {
      id: "phantom",
      name: "Phantom",
      open: (pageUrl) => {
        const u = encodeURIComponent(pageUrl);
        window.location.href = `https://phantom.app/ul/browse/${u}?ref=${u}`;
      },
    },
    {
      id: "solflare",
      name: "Solflare",
      open: (pageUrl) => {
        const u = encodeURIComponent(pageUrl);
        window.location.href = `https://solflare.com/ul/v1/browse/${u}?ref=${u}`;
      },
    },
    {
      id: "backpack",
      name: "Backpack",
      open: (pageUrl) => {
        window.location.href = `https://backpack.app/ul/v1/browse/${encodeURIComponent(pageUrl)}`;
      },
    },
  ];
}

export async function connectSolanaWallet(
  wallet: DiscoveredSolanaWallet,
): Promise<SolanaSession> {
  const res = await wallet.provider.connect();
  const account =
    res?.publicKey?.toString() ||
    wallet.provider.publicKey?.toString() ||
    "";
  if (!account) throw new Error("Solana wallet returned no public key");
  return {
    account,
    walletName: wallet.name,
    provider: wallet.provider,
    cluster: "mainnet-beta",
  };
}

export async function disconnectSolana(session: SolanaSession | null) {
  if (!session?.provider?.disconnect) return;
  try {
    await session.provider.disconnect();
  } catch {
    /* ignore */
  }
}

function toBase58Signature(
  result: string | { signature: string } | undefined,
): string {
  if (!result) throw new Error("No signature from wallet");
  if (typeof result === "string") return result;
  if (typeof result === "object" && "signature" in result) {
    return result.signature;
  }
  throw new Error("Unexpected signAndSendTransaction result");
}

/** Send USDC/USDT (SPL) on Solana mainnet. */
export async function sendSolanaPayment(opts: {
  session: SolanaSession;
  asset: SolanaAssetSymbol;
  amountUsd: number;
  to?: string;
}): Promise<string> {
  const to = opts.to || TREASURY_SOL;
  if (!isValidSolanaAddress(to)) {
    throw new Error(
      "Solana treasury address missing or invalid. Set VITE_TREASURY_SOL in .env",
    );
  }

  if (opts.asset === "SOL") {
    throw new Error(
      "Pick USDC for exact face amount on Solana. Native SOL market convert is not enabled.",
    );
  }

  const { Connection, PublicKey, Transaction } = await import("@solana/web3.js");
  const {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAccount,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  } = await import("@solana/spl-token");

  const connection = new Connection(SOLANA_MAINNET.rpcHint, "confirmed");
  const fromPubkey = new PublicKey(opts.session.account);
  const toPubkey = new PublicKey(to);
  const asset = getSolanaAsset(opts.asset);
  if (!asset.mint) throw new Error("Missing SPL mint");

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    feePayer: fromPubkey,
    blockhash,
    lastValidBlockHeight,
  });

  const mint = new PublicKey(asset.mint);
  const fromAta = await getAssociatedTokenAddress(
    mint,
    fromPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const toAta = await getAssociatedTokenAddress(
    mint,
    toPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  try {
    await getAccount(connection, toAta, "confirmed", TOKEN_PROGRAM_ID);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        toAta,
        toPubkey,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  const rawAmount = BigInt(Math.round(opts.amountUsd * 10 ** asset.decimals));
  tx.add(
    createTransferInstruction(
      fromAta,
      toAta,
      fromPubkey,
      rawAmount,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const result = await opts.session.provider.signAndSendTransaction(tx, {
    skipPreflight: false,
  });
  const sig = toBase58Signature(result);

  try {
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );
  } catch {
    /* submitted */
  }

  return sig;
}

export function shortSolAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function solanaTreasuryReady(): boolean {
  return isValidSolanaAddress(TREASURY_SOL);
}
