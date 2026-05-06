import { type State, emptyState } from "../types";

const STATE_KEY = "napo-score-state";

export function save(state: State): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function load(): State {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<State>;
    return { ...emptyState(), ...parsed } as State;
  } catch {
    return emptyState();
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}
