/**
 * LVL Exchange — secondary market for digital goods (skills, music, licenses, rights).
 * Client-side demo order book with live tape; persists positions in localStorage.
 * Book/tape seeds are deterministic so SSR + first client paint match.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AssetClass =
  | "skill"
  | "music"
  | "agent_license"
  | "design_right"
  | "blueprint";

export type ExchangeListing = {
  id: string;
  symbol: string;
  title: string;
  class: AssetClass;
  blurb: string;
  /** Mid reference price in USDC */
  mid: number;
  /** 24h volume USDC */
  volume24h: number;
  change24h: number;
  supply: number;
  freeFloat: number;
};

export type OrderSide = "buy" | "sell";

export type BookLevel = { price: number; size: number };

export type TapeTrade = {
  id: string;
  listingId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  size: number;
  at: number;
  maker: "you" | "book" | "bot";
};

export type UserFill = {
  id: string;
  listingId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  size: number;
  at: number;
};

export const EXCHANGE_LISTINGS: ExchangeListing[] = [
  {
    id: "xl-skill-tier1",
    symbol: "SKL-T1",
    title: "Tier 1 Skill Pack",
    class: "skill",
    blurb: "Flagship skill export license — transferable after primary mint.",
    mid: 48,
    volume24h: 18420,
    change24h: 4.2,
    supply: 500,
    freeFloat: 186,
  },
  {
    id: "xl-music-wave",
    symbol: "MSC-WV",
    title: "Wave Music Release Kit",
    class: "music",
    blurb: "Stems + cover art + listing pack for music.lvlltd.com.",
    mid: 32,
    volume24h: 9210,
    change24h: -1.4,
    supply: 1000,
    freeFloat: 410,
  },
  {
    id: "xl-agent-pro",
    symbol: "AGT-PRO",
    title: "Agent Pro License",
    class: "agent_license",
    blurb: "lvl-merch-v1 commercial seat · multi-rail settle rights.",
    mid: 120,
    volume24h: 42100,
    change24h: 8.6,
    supply: 250,
    freeFloat: 72,
  },
  {
    id: "xl-design-soft",
    symbol: "DSN-SE",
    title: "Soft Era Design Right",
    class: "design_right",
    blurb: "Print-ready exclusive for Soft Era plate · POD royalty share.",
    mid: 75,
    volume24h: 15600,
    change24h: 2.1,
    supply: 100,
    freeFloat: 28,
  },
  {
    id: "xl-bp-main",
    symbol: "BP-MC",
    title: "MAIN CHARACTER Blueprint",
    class: "blueprint",
    blurb: "Merch pipeline blueprint · imagine → Printify draft recipe.",
    mid: 55,
    volume24h: 11240,
    change24h: -0.8,
    supply: 200,
    freeFloat: 91,
  },
  {
    id: "xl-skill-radar",
    symbol: "SKL-RD",
    title: "Restock Radar Skill",
    class: "skill",
    blurb: "Composable radar skill — watch + notify + auto-claim hooks.",
    mid: 28,
    volume24h: 6400,
    change24h: 6.0,
    supply: 800,
    freeFloat: 320,
  },
];

/** Deterministic 0..1 from string + salt (SSR-safe) */
function unit(seed: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function seedBook(mid: number, id: string): { bids: BookLevel[]; asks: BookLevel[] } {
  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];
  for (let i = 1; i <= 6; i++) {
    const step = mid * 0.008 * i;
    const bSize = Math.max(1, Math.round(4 + unit(id, i) * 18 - i));
    const aSize = Math.max(1, Math.round(3 + unit(id, i + 20) * 16 - i * 0.5));
    bids.push({
      price: Math.round((mid - step) * 100) / 100,
      size: bSize,
    });
    asks.push({
      price: Math.round((mid + step) * 100) / 100,
      size: aSize,
    });
  }
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);
  return { bids, asks };
}

/** Fixed epoch so tape timestamps match SSR/client on first paint */
const TAPE_EPOCH = 1_752_000_000_000;

function seedTape(listings: ExchangeListing[]): TapeTrade[] {
  const out: TapeTrade[] = [];
  for (let i = 0; i < 24; i++) {
    const L = listings[i % listings.length];
    const side: OrderSide = unit(L.id, i) > 0.48 ? "buy" : "sell";
    const slip = (unit(L.id, i + 50) - 0.5) * L.mid * 0.02;
    out.push({
      id: `tape-${i}-${L.id}`,
      listingId: L.id,
      symbol: L.symbol,
      side,
      price: Math.round((L.mid + slip) * 100) / 100,
      size: Math.max(1, Math.round(unit(L.id, i + 90) * 6)),
      at: TAPE_EPOCH - i * 18_000 - Math.round(unit(L.id, i + 120) * 8_000),
      maker: "bot",
    });
  }
  return out.sort((a, b) => b.at - a.at);
}

type ExchangeState = {
  selectedId: string;
  books: Record<string, { bids: BookLevel[]; asks: BookLevel[] }>;
  tape: TapeTrade[];
  fills: UserFill[];
  positions: Record<string, number>;
  cashUsdc: number;
  lastMessage: string | null;
  botSeq: number;
  select: (id: string) => void;
  place: (side: OrderSide, size: number) => { ok: boolean; message: string };
  tickBots: () => void;
};

function initialBooks() {
  const books: ExchangeState["books"] = {};
  for (const L of EXCHANGE_LISTINGS) {
    books[L.id] = seedBook(L.mid, L.id);
  }
  return books;
}

export const useExchangeStore = create<ExchangeState>()(
  persist(
    (set, get) => ({
      selectedId: EXCHANGE_LISTINGS[0].id,
      books: initialBooks(),
      tape: seedTape(EXCHANGE_LISTINGS),
      fills: [],
      positions: {},
      cashUsdc: 500,
      lastMessage: null,
      botSeq: 0,
      select: (id) => set({ selectedId: id }),
      place: (side, size) => {
        const qty = Math.max(1, Math.floor(size));
        const { selectedId, books, cashUsdc, positions } = get();
        const listing = EXCHANGE_LISTINGS.find((l) => l.id === selectedId);
        if (!listing) return { ok: false, message: "Unknown listing" };
        const book = books[selectedId] ?? seedBook(listing.mid, listing.id);
        const level = side === "buy" ? book.asks[0] : book.bids[0];
        if (!level || level.size < 1) {
          return { ok: false, message: "No liquidity" };
        }
        const fillSize = Math.min(qty, level.size);
        const cost = level.price * fillSize;
        if (side === "buy" && cashUsdc < cost) {
          return { ok: false, message: "Insufficient USDC demo balance" };
        }
        if (side === "sell" && (positions[selectedId] ?? 0) < fillSize) {
          return { ok: false, message: "No inventory to sell — buy first" };
        }

        const newAsks = [...book.asks];
        const newBids = [...book.bids];
        if (side === "buy") {
          newAsks[0] = { ...newAsks[0], size: newAsks[0].size - fillSize };
          if (newAsks[0].size <= 0) newAsks.shift();
        } else {
          newBids[0] = { ...newBids[0], size: newBids[0].size - fillSize };
          if (newBids[0].size <= 0) newBids.shift();
        }

        const trade: TapeTrade = {
          id: `you-${Date.now()}`,
          listingId: selectedId,
          symbol: listing.symbol,
          side,
          price: level.price,
          size: fillSize,
          at: Date.now(),
          maker: "you",
        };
        const fill: UserFill = {
          id: trade.id,
          listingId: selectedId,
          symbol: listing.symbol,
          side,
          price: level.price,
          size: fillSize,
          at: trade.at,
        };

        set({
          books: {
            ...books,
            [selectedId]: { bids: newBids, asks: newAsks },
          },
          cashUsdc: side === "buy" ? cashUsdc - cost : cashUsdc + cost,
          positions: {
            ...positions,
            [selectedId]:
              (positions[selectedId] ?? 0) +
              (side === "buy" ? fillSize : -fillSize),
          },
          tape: [trade, ...get().tape].slice(0, 80),
          fills: [fill, ...get().fills].slice(0, 40),
          lastMessage: `${side.toUpperCase()} ${fillSize} ${listing.symbol} @ ${level.price.toFixed(2)} USDC`,
        });
        return { ok: true, message: get().lastMessage ?? "Filled" };
      },
      tickBots: () => {
        const { books, tape, selectedId, botSeq } = get();
        const listing =
          EXCHANGE_LISTINGS.find((l) => l.id === selectedId) ??
          EXCHANGE_LISTINGS[0];
        const book = books[listing.id] ?? seedBook(listing.mid, listing.id);
        const seq = botSeq + 1;
        const side: OrderSide = unit(listing.id, seq) > 0.5 ? "buy" : "sell";
        const ref =
          side === "buy"
            ? (book.asks[0]?.price ?? listing.mid)
            : (book.bids[0]?.price ?? listing.mid);
        const trade: TapeTrade = {
          id: `bot-${seq}-${listing.id}`,
          listingId: listing.id,
          symbol: listing.symbol,
          side,
          price: Math.round(ref * 100) / 100,
          size: Math.max(1, Math.round(unit(listing.id, seq + 7) * 4)),
          at: Date.now(),
          maker: "bot",
        };
        const nudge = 1 + (unit(listing.id, seq + 11) - 0.5) * 0.01;
        const next = seedBook(listing.mid * nudge, `${listing.id}-t${seq}`);
        set({
          botSeq: seq,
          books: { ...books, [listing.id]: next },
          tape: [trade, ...tape].slice(0, 80),
        });
      },
    }),
    {
      name: "lvl-exchange-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        selectedId: s.selectedId,
        cashUsdc: s.cashUsdc,
        positions: s.positions,
        fills: s.fills,
      }),
    },
  ),
);

export function listingById(id: string) {
  return EXCHANGE_LISTINGS.find((l) => l.id === id);
}

export function classLabel(c: AssetClass): string {
  switch (c) {
    case "skill":
      return "Skill pack";
    case "music":
      return "Music pack";
    case "agent_license":
      return "Agent license";
    case "design_right":
      return "Design right";
    case "blueprint":
      return "Blueprint";
  }
}
