import { type State } from "../types";

const KEY = "napo-score-history";
const CAP = 20;

export interface ArchivedSet {
  /** ISO timestamp, also used as identity. */
  id: string;
  archivedAt: string;
  state: State;
}

function isArchivedSet(e: unknown): e is ArchivedSet {
  if (typeof e !== "object" || e === null) return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.archivedAt === "string" &&
    typeof o.state === "object" &&
    o.state !== null
  );
}

export function loadArchive(): ArchivedSet[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isArchivedSet);
  } catch {
    return [];
  }
}

/** Push the given state to the archive. No-op when state is empty (no games). */
export function archive(state: State): void {
  if (!state.started || state.games.length === 0) return;
  try {
    const id = new Date().toISOString();
    const entry: ArchivedSet = { id, archivedAt: id, state };
    const next = [entry, ...loadArchive()].slice(0, CAP);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function removeArchive(id: string): void {
  try {
    const next = loadArchive().filter((e) => e.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearArchive(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
