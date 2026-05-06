import { type Game, type State, type SuitCode } from "../types";
import { calcScores } from "./score";

/**
 * Encode the full set state into a URL-safe Base64 string.
 * Format (compact, ~100 chars for a full 10-game set):
 *   <player1>|<player2>|...|<player5>~<g1>;<g2>;...
 *   where each game = napoleon,aide(or X),suit,declared,taken,multiplier
 */
export function encodeState(state: State): string {
  const players = state.players.join("|");
  const games = state.games
    .map((g) => {
      const aide = g.aide === -1 ? "X" : g.aide;
      const m = g.multiplier || 1;
      return `${g.napoleon},${aide},${g.suit},${g.declared},${g.taken},${m}`;
    })
    .join(";");
  const raw = `${players}~${games}`;
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeState(hash: string): State | null {
  try {
    let b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const raw = decodeURIComponent(escape(atob(b64)));
    const [pp, gg] = raw.split("~");
    const players = pp.split("|");
    if (players.length !== 5) throw new Error("player count");
    const games: Game[] = (gg || "")
      .split(";")
      .filter(Boolean)
      .map((s, idx) => {
        const [n, a, suit, d, t, m] = s.split(",");
        const base = {
          napoleon: parseInt(n, 10),
          aide: a === "X" ? -1 : parseInt(a, 10),
          suit: suit as SuitCode,
          declared: parseInt(d, 10),
          taken: parseInt(t, 10),
          multiplier: (m ? parseInt(m, 10) : 1) as 1 | 2 | 4,
        };
        return { ...base, scores: calcScores(base, idx) };
      });
    return {
      players: players as [string, string, string, string, string],
      games,
      started: true,
    };
  } catch {
    return null;
  }
}

export function extractCode(input: string): string {
  let code = input.trim();
  if (code.includes("#")) code = code.split("#").pop() ?? "";
  if (code.startsWith("data=")) code = code.slice(5);
  return code;
}
