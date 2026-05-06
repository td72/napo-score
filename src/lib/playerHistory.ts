const KEY = "napo-player-history";
const CAP = 30;

export function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

/** Push the given names to the front of the history (most-recent-first), deduped case-insensitively. */
export function addToHistory(names: readonly string[]): void {
  try {
    const fresh = names.map((n) => n.trim()).filter(Boolean);
    if (fresh.length === 0) return;
    const current = loadHistory();
    const seen = new Set<string>();
    const out: string[] = [];
    for (const n of [...fresh, ...current]) {
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
      if (out.length >= CAP) break;
    }
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    /* quota / private mode — ignore */
  }
}
