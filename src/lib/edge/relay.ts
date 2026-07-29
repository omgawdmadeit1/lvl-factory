/**
 * Agent Relay — A2A commerce intent + handshake demo (client-side protocol).
 * Agents discover SKUs, sign intent payloads, hand off to multi-rail /pay.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type RelayIntent = {
  id: string;
  createdAt: string;
  agentId: string;
  sku: string;
  productSlug: string;
  amountUsd: number;
  chainHint: "base" | "solana" | "ethereum" | "any";
  status: "draft" | "signed" | "handed_off" | "expired";
  /** Demo signature (not cryptographic) */
  sig: string | null;
  payPath: string | null;
};

function noopStorage() {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

function storage() {
  if (typeof window === "undefined") return createJSONStorage(noopStorage);
  return createJSONStorage(() => localStorage);
}

function rid() {
  return `intent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function demoSig(payload: string): string {
  // Non-crypto demo fingerprint for UI
  let h = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `lvl1_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

interface RelayState {
  intents: RelayIntent[];
  agentId: string;
  hydrated: boolean;
  setAgentId: (id: string) => void;
  createIntent: (input: {
    sku: string;
    productSlug: string;
    amountUsd: number;
    chainHint?: RelayIntent["chainHint"];
  }) => RelayIntent;
  sign: (id: string) => RelayIntent | null;
  handoff: (id: string) => RelayIntent | null;
  clear: () => void;
}

export const useRelayStore = create<RelayState>()(
  persist(
    (set, get) => ({
      intents: [],
      agentId: "agent.lvl.local",
      hydrated: false,
      setAgentId: (id) => set({ agentId: id.trim() || "agent.lvl.local" }),
      createIntent: ({ sku, productSlug, amountUsd, chainHint = "base" }) => {
        const intent: RelayIntent = {
          id: rid(),
          createdAt: new Date().toISOString(),
          agentId: get().agentId,
          sku,
          productSlug,
          amountUsd,
          chainHint,
          status: "draft",
          sig: null,
          payPath: null,
        };
        set((s) => ({ intents: [intent, ...s.intents].slice(0, 40) }));
        return intent;
      },
      sign: (id) => {
        const cur = get().intents.find((i) => i.id === id);
        if (!cur || cur.status === "handed_off") return null;
        const payload = JSON.stringify({
          id: cur.id,
          agentId: cur.agentId,
          sku: cur.sku,
          amountUsd: cur.amountUsd,
          chainHint: cur.chainHint,
        });
        const signed: RelayIntent = {
          ...cur,
          status: "signed",
          sig: demoSig(payload),
        };
        set((s) => ({
          intents: s.intents.map((i) => (i.id === id ? signed : i)),
        }));
        return signed;
      },
      handoff: (id) => {
        const cur = get().intents.find((i) => i.id === id);
        if (!cur || cur.status === "draft") return null;
        const payPath = `/pay?skill=${encodeURIComponent(cur.sku)}&amount=${cur.amountUsd}&canceled=false`;
        const next: RelayIntent = {
          ...cur,
          status: "handed_off",
          payPath,
        };
        set((s) => ({
          intents: s.intents.map((i) => (i.id === id ? next : i)),
        }));
        return next;
      },
      clear: () => set({ intents: [] }),
    }),
    {
      name: "lvl-relay-v1",
      storage: storage(),
      partialize: (s) => ({
        intents: s.intents,
        agentId: s.agentId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const RELAY_PROTOCOL = {
  name: "lvl-relay-v1",
  version: "1.0.0",
  discovery: "/api/agent/card",
  catalog: "/api/store/catalog",
  settle: "/pay",
  steps: [
    "GET /api/agent/card — discover capabilities",
    "GET /api/store/catalog — list agent-shopable SKUs",
    "Create intent (sku, amount, chainHint)",
    "Sign intent (agent wallet / key)",
    "Handoff → /pay?skill=&amount= multi-rail",
    "Optional: POST Printify fulfillment after settle",
  ],
} as const;
