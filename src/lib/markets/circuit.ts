/**
 * LVL Circuit — visual agent workflow builder (A2A commerce pipelines).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CircuitNodeKind =
  | "trigger"
  | "agent"
  | "pay"
  | "printify"
  | "notify"
  | "branch";

export type CircuitNode = {
  id: string;
  kind: CircuitNodeKind;
  label: string;
  blurb: string;
};

export type CircuitTemplate = {
  id: string;
  name: string;
  blurb: string;
  badge: string;
  nodes: CircuitNode[];
};

export const CIRCUIT_TEMPLATES: CircuitTemplate[] = [
  {
    id: "ct-drop-claim",
    name: "Drop claim → POD",
    blurb: "Flash claim triggers Printify draft + USDC settle.",
    badge: "Drops",
    nodes: [
      {
        id: "n1",
        kind: "trigger",
        label: "Drop claim",
        blurb: "When buyer claims flash unit",
      },
      {
        id: "n2",
        kind: "agent",
        label: "Merch agent",
        blurb: "lvl-merch-v1 sizes + SKU map",
      },
      {
        id: "n3",
        kind: "pay",
        label: "Multi-rail pay",
        blurb: "USDC / card / agent credit",
      },
      {
        id: "n4",
        kind: "printify",
        label: "Printify draft",
        blurb: "Push POD order payload",
      },
      {
        id: "n5",
        kind: "notify",
        label: "Pulse notify",
        blurb: "Post to network pulse",
      },
    ],
  },
  {
    id: "ct-restock",
    name: "Radar restock loop",
    blurb: "Watch heat → Signal pack → restock action.",
    badge: "Radar",
    nodes: [
      {
        id: "n1",
        kind: "trigger",
        label: "Radar heat",
        blurb: "SKU crosses heat threshold",
      },
      {
        id: "n2",
        kind: "agent",
        label: "Oracle agent",
        blurb: "Forecast demand units",
      },
      {
        id: "n3",
        kind: "branch",
        label: "If confidence ≥ 75",
        blurb: "Branch on forecast quality",
      },
      {
        id: "n4",
        kind: "notify",
        label: "Seller alert",
        blurb: "Restock M/L recommendation",
      },
    ],
  },
  {
    id: "ct-bounty",
    name: "Bounty escrow rail",
    blurb: "Task claim → SLA tick → escrow release.",
    badge: "Bounty",
    nodes: [
      {
        id: "n1",
        kind: "trigger",
        label: "Bounty claim",
        blurb: "Agent or human claims task",
      },
      {
        id: "n2",
        kind: "agent",
        label: "Fleet worker",
        blurb: "Assign capacity seat",
      },
      {
        id: "n3",
        kind: "pay",
        label: "Escrow hold",
        blurb: "USDC locked until submit",
      },
      {
        id: "n4",
        kind: "pay",
        label: "Release",
        blurb: "Settle reward on proof",
      },
    ],
  },
  {
    id: "ct-guild",
    name: "Guild split settle",
    blurb: "Drop sale → vault royalty → guild pool split.",
    badge: "Guild",
    nodes: [
      {
        id: "n1",
        kind: "trigger",
        label: "Secondary sale",
        blurb: "Exchange fill on design right",
      },
      {
        id: "n2",
        kind: "pay",
        label: "Royalty drip",
        blurb: "Credit vault holders",
      },
      {
        id: "n3",
        kind: "agent",
        label: "Guild ledger",
        blurb: "Split by share bps",
      },
      {
        id: "n4",
        kind: "notify",
        label: "Crew pulse",
        blurb: "Announce pool yield",
      },
    ],
  },
];

export type CircuitRun = {
  id: string;
  templateId: string;
  step: number;
  status: "idle" | "running" | "done" | "error";
  at: number;
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

interface CircuitState {
  activeId: string;
  runs: CircuitRun[];
  step: number;
  running: boolean;
  setActive: (id: string) => void;
  start: () => boolean;
  tick: () => void;
  reset: () => void;
  completedRuns: () => number;
}

export const useCircuitStore = create<CircuitState>()(
  persist(
    (set, get) => ({
      activeId: CIRCUIT_TEMPLATES[0]!.id,
      runs: [],
      step: 0,
      running: false,
      setActive: (id) => set({ activeId: id, step: 0, running: false }),
      start: () => {
        const tpl = CIRCUIT_TEMPLATES.find((t) => t.id === get().activeId);
        if (!tpl) return false;
        set({
          running: true,
          step: 0,
        });
        return true;
      },
      tick: () => {
        const s = get();
        if (!s.running) return;
        const tpl = CIRCUIT_TEMPLATES.find((t) => t.id === s.activeId);
        if (!tpl) return;
        const next = s.step + 1;
        if (next >= tpl.nodes.length) {
          const run: CircuitRun = {
            id: `cr-${Date.now().toString(36)}`,
            templateId: s.activeId,
            step: next,
            status: "done",
            at: Date.now(),
          };
          set({
            running: false,
            step: next,
            runs: [run, ...s.runs].slice(0, 30),
          });
          return;
        }
        set({ step: next });
      },
      reset: () => set({ step: 0, running: false }),
      completedRuns: () =>
        get().runs.filter((r) => r.status === "done").length,
    }),
    {
      name: "lvl-circuit-v1",
      storage: storage(),
      partialize: (s) => ({
        activeId: s.activeId,
        runs: s.runs,
      }),
    },
  ),
);

export function nodeKindLabel(k: CircuitNodeKind): string {
  const map: Record<CircuitNodeKind, string> = {
    trigger: "Trigger",
    agent: "Agent",
    pay: "Pay",
    printify: "POD",
    notify: "Notify",
    branch: "Branch",
  };
  return map[k];
}
