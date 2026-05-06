import { useMemo, useState } from "react";
import { type State, SET_LENGTH } from "../types";
import { decodeState, extractCode } from "../lib/encode";
import { loadHistory } from "../lib/playerHistory";
import { type ArchivedSet, loadArchive, removeArchive } from "../lib/history";
import { totalScores } from "../lib/score";

const SEAT_LABELS = ["I", "II", "III", "IV", "V"] as const;
const HISTORY_LIST_ID = "napo-player-history";

interface Props {
  state: State;
  onPlayerChange: (i: number, name: string) => void;
  onStart: () => void;
  onRestore: (state: State) => void;
  onLoadArchived: (entry: ArchivedSet) => void;
  showToast: (msg: string) => void;
}

export function Setup({ state, onPlayerChange, onStart, onRestore, onLoadArchived, showToast }: Props) {
  const [restoreInput, setRestoreInput] = useState("");
  const [archived, setArchived] = useState(loadArchive);
  const history = useMemo(loadHistory, []);
  const canStart = state.players.every((n) => n.trim() !== "");

  const tryRestore = () => {
    const decoded = decodeState(extractCode(restoreInput));
    if (!decoded) {
      showToast("コードが正しくありません");
      return;
    }
    onRestore(decoded);
  };

  const deleteEntry = (id: string) => {
    removeArchive(id);
    setArchived(loadArchive());
  };

  return (
    <div className="fade-in">
      <div className="sec-head">
        <span className="label">参加者 · Players</span>
        <span className="meta">5名</span>
      </div>
      <div className="card">
        <div className="players-setup">
          {state.players.map((name, i) => (
            <div key={i} className="player-input">
              <span className="seat">{SEAT_LABELS[i]}</span>
              <input
                type="text"
                name={`player-${i + 1}`}
                value={name}
                placeholder={`Player ${i + 1}`}
                maxLength={12}
                autoComplete="off"
                list={HISTORY_LIST_ID}
                onChange={(e) => onPlayerChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>
        {history.length > 0 && (
          <datalist id={HISTORY_LIST_ID}>
            {history.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        )}
      </div>

      <div className="sec-head">
        <span className="label">記録の復元 · Restore</span>
      </div>
      <div className="card">
        <input
          type="text"
          value={restoreInput}
          onChange={(e) => setRestoreInput(e.target.value)}
          placeholder="#data=… を貼り付け"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
        />
        <div className="helper">
          URL のハッシュ (#data=…) または共有コードを貼り付けて復元できます。
        </div>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={onStart} disabled={!canStart}>
          はじめる →
        </button>
        <button className="btn ghost" onClick={tryRestore}>
          復元
        </button>
      </div>

      {archived.length > 0 && (
        <>
          <div className="sec-head">
            <span className="label">過去のセット</span>
            <span className="meta">{archived.length}件</span>
          </div>
          <div className="card">
            <ul className="archive-list">
              {archived.map((entry) => (
                <ArchiveRow
                  key={entry.id}
                  entry={entry}
                  onOpen={() => onLoadArchived(entry)}
                  onDelete={() => deleteEntry(entry.id)}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function ArchiveRow({
  entry,
  onOpen,
  onDelete,
}: {
  entry: ArchivedSet;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const totals = totalScores(entry.state);
  let topIdx = 0;
  for (let i = 1; i < 5; i++) if (totals[i] > totals[topIdx]) topIdx = i;
  const topName = entry.state.players[topIdx];
  const topScore = totals[topIdx];
  const sign = topScore > 0 ? "+" : "";
  const games = entry.state.games.length;
  const isComplete = games >= SET_LENGTH;

  return (
    <li className="archive-row">
      <button className="archive-open" onClick={onOpen}>
        <span className="archive-when">{formatDate(entry.archivedAt)}</span>
        <span className="archive-summary">
          {topName} {sign}
          {topScore} · {games}ゲーム{isComplete ? "" : "（途中）"}
        </span>
      </button>
      <button
        className="archive-del"
        onClick={onDelete}
        aria-label="削除"
        title="削除"
      >
        ×
      </button>
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}
