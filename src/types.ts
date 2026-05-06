export type SuitCode = "S" | "H" | "D" | "C" | "N";

export interface SuitDef {
  v: SuitCode;
  label: string;
  sym: string;
  cls: string;
}

export interface PendingEntry {
  napoleon: number;
  /**
   * Aide player index (0–4).
   * - `aide === napoleon`: 独り立ち (solo, no aide).
   * - `-1`: 未指定 (only valid in pending state — committed games never carry -1).
   */
  aide: number;
  suit: SuitCode;
  declared: number;
  taken: number;
  multiplier: 1 | 2 | 4;
}

export interface Game extends PendingEntry {
  scores: [number, number, number, number, number];
}

export interface State {
  players: [string, string, string, string, string];
  games: Game[];
  started: boolean;
}

export const SET_LENGTH = 10;

export const SUITS: readonly SuitDef[] = [
  { v: "S", label: "スペード", sym: "♠", cls: "suit-spade" },
  { v: "H", label: "ハート", sym: "♥", cls: "suit-heart" },
  { v: "D", label: "ダイヤ", sym: "♦", cls: "suit-diamond" },
  { v: "C", label: "クラブ", sym: "♣", cls: "suit-club" },
  { v: "N", label: "ノートランプ", sym: "∅", cls: "suit-no" },
];

export function freshPending(): PendingEntry {
  return { napoleon: 0, aide: -1, suit: "S", declared: 13, taken: 13, multiplier: 1 };
}

export function emptyState(): State {
  return { players: ["", "", "", "", ""], games: [], started: false };
}
