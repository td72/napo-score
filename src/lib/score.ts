import { type Game, type PendingEntry, type State, SET_LENGTH } from "../types";

export function effectiveMultiplier(g: Pick<PendingEntry, "multiplier">, gameIndex: number): number {
  const userMult = g.multiplier || 1;
  const finalBonus = gameIndex === SET_LENGTH - 1 ? 2 : 1;
  return userMult * finalBonus;
}

/**
 * 全取り: declaring less than 20 but taking all 20 tricks → automatic loss.
 */
export function isAllTakenLoss(g: Pick<PendingEntry, "declared" | "taken">): boolean {
  return g.taken >= 20 && g.declared < 20;
}

export function calcScores(g: PendingEntry, gameIndex: number): Game["scores"] {
  const scores: Game["scores"] = [0, 0, 0, 0, 0];
  const mult = effectiveMultiplier(g, gameIndex);
  const base = Math.max(1, g.declared - 12) * mult;
  const won = g.taken >= g.declared && !isAllTakenLoss(g);
  const sign = won ? 1 : -1;
  const napIdx = g.napoleon;
  const aideIdx = g.aide === napIdx ? -1 : g.aide;
  if (aideIdx === -1) {
    scores[napIdx] = sign * base * 4;
    for (let i = 0; i < 5; i++) if (i !== napIdx) scores[i] = -sign * base;
  } else {
    scores[napIdx] = sign * base * 2;
    scores[aideIdx] = sign * base;
    for (let i = 0; i < 5; i++) if (i !== napIdx && i !== aideIdx) scores[i] = -sign * base;
  }
  return scores;
}

export function totalScores(state: State): [number, number, number, number, number] {
  const t: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  state.games.forEach((g) =>
    g.scores.forEach((s, i) => {
      t[i] += s;
    }),
  );
  return t;
}

/** Recompute every game's scores in place — needed after edits/deletes shift the final-bonus index. */
export function recomputeAll(games: Game[]): Game[] {
  return games.map((g, i) => ({ ...g, scores: calcScores(g, i) }));
}
