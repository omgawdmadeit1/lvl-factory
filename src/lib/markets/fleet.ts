/**
 * LVL Fleet — agent labor marketplace. Hire autonomous crews for commerce ops.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FleetRole =
  | "drop_claimer"
  | "restock_scout"
  | "support_desk"
  | "design_runner"
  | "price_maker"
  | "fulfill_watch";

export type FleetAgent = {
  id: string;
  name: string;
  role: FleetRole;
  blurb: string;
  /** USDC per hour demo rate */
  rateUsdc: number;
  capacity: number;
  reliability: number;
  specialty: string;
};

export type Deployment = {
  id: string;
  agentId: string;
  name: string;
  role: FleetRole;
  hours: number;
  spendUsdc: number;
  at: number;
  status: "running" | "complete";
  progress: number;
};

export const FLEET_AGENTS: FleetAgent[] = [
  {
    id: "flt-claim-alpha",
    name: "Claim Alpha",
    role: "drop_claimer",
    blurb: "Millisecond claim bots for flash drops — cart handoff ready.",
    rateUsdc: 4.5,
    capacity: 12,
    reliability: 0.97,
    specialty: "drops.lvlltd.com",
  },
  {
    id: "flt-radar-beta",
    name: "Radar Beta",
    role: "restock_scout",
    blurb: "Watches sold-out SKUs and pings restock windows.",
    rateUsdc: 2.25,
    capacity: 40,
    reliability: 0.99,
    specialty: "radar.lvlltd.com",
  },
  {
    id: "flt-support-gamma",
    name: "Support Gamma",
    role: "support_desk",
    blurb: "Buyer chat + order status for multi-rail + POD tickets.",
    rateUsdc: 3.1,
    capacity: 20,
    reliability: 0.94,
    specialty: "account · orders",
  },
  {
    id: "flt-design-delta",
    name: "Design Delta",
    role: "design_runner",
    blurb: "Imagine brief → mockup drafts into the merch pipeline.",
    rateUsdc: 6.0,
    capacity: 8,
    reliability: 0.91,
    specialty: "studio.lvlltd.com",
  },
  {
    id: "flt-mm-epsilon",
    name: "MM Epsilon",
    role: "price_maker",
    blurb: "Provides bid/ask depth on LVL Exchange listings.",
    rateUsdc: 8.5,
    capacity: 6,
    reliability: 0.96,
    specialty: "exchange.lvlltd.com",
  },
  {
    id: "flt-pod-zeta",
    name: "POD Zeta",
    role: "fulfill_watch",
    blurb: "Printify webhook mirror + delay alerts to seller portal.",
    rateUsdc: 2.8,
    capacity: 16,
    reliability: 0.98,
    specialty: "webhooks · seller",
  },
];

export function roleLabel(r: FleetRole): string {
  switch (r) {
    case "drop_claimer":
      return "Drop claimer";
    case "restock_scout":
      return "Restock scout";
    case "support_desk":
      return "Support desk";
    case "design_runner":
      return "Design runner";
    case "price_maker":
      return "Market maker";
    case "fulfill_watch":
      return "Fulfillment watch";
  }
}

type FleetState = {
  budgetUsdc: number;
  deployments: Deployment[];
  hire: (agentId: string, hours: number) => { ok: boolean; message: string };
  tick: () => void;
};

export const useFleetStore = create<FleetState>()(
  persist(
    (set, get) => ({
      budgetUsdc: 250,
      deployments: [],
      hire: (agentId, hours) => {
        const agent = FLEET_AGENTS.find((a) => a.id === agentId);
        if (!agent) return { ok: false, message: "Unknown agent" };
        const h = Math.max(1, Math.min(24, Math.floor(hours)));
        const spend = Math.round(agent.rateUsdc * h * 100) / 100;
        const { budgetUsdc, deployments } = get();
        if (budgetUsdc < spend) {
          return { ok: false, message: "Insufficient fleet budget (demo USDC)" };
        }
        const running = deployments.filter(
          (d) => d.agentId === agentId && d.status === "running",
        ).length;
        if (running >= agent.capacity) {
          return { ok: false, message: "Agent at capacity — try another" };
        }
        const dep: Deployment = {
          id: `dep-${Date.now()}`,
          agentId,
          name: agent.name,
          role: agent.role,
          hours: h,
          spendUsdc: spend,
          at: Date.now(),
          status: "running",
          progress: 0,
        };
        set({
          budgetUsdc: budgetUsdc - spend,
          deployments: [dep, ...deployments].slice(0, 40),
        });
        return {
          ok: true,
          message: `Hired ${agent.name} · ${h}h · ${spend.toFixed(2)} USDC`,
        };
      },
      tick: () => {
        const { deployments } = get();
        if (!deployments.some((d) => d.status === "running")) return;
        set({
          deployments: deployments.map((d) => {
            if (d.status !== "running") return d;
            const next = Math.min(100, d.progress + 4 + Math.random() * 8);
            return {
              ...d,
              progress: next,
              status: next >= 100 ? "complete" : "running",
            };
          }),
        });
      },
    }),
    {
      name: "lvl-fleet-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        budgetUsdc: s.budgetUsdc,
        deployments: s.deployments,
      }),
    },
  ),
);
