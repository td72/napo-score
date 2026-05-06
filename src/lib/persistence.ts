import { type State, emptyState } from "../types";

const STATE_KEY = "napoleon-ledger-v2";

export function save(state: State): void {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function load(): State {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<State>;
    return { ...emptyState(), ...parsed } as State;
  } catch {
    return emptyState();
  }
}

export function clear(): void {
  try {
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}
