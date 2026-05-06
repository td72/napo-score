import { useState } from "react";
import { type State } from "../types";
import { decodeState, extractCode } from "../lib/encode";

const SEAT_LABELS = ["I", "II", "III", "IV", "V"] as const;

interface Props {
  state: State;
  onPlayerChange: (i: number, name: string) => void;
  onStart: () => void;
  onRestore: (state: State) => void;
  showToast: (msg: string) => void;
}

export function Setup({ state, onPlayerChange, onStart, onRestore, showToast }: Props) {
  const [restoreInput, setRestoreInput] = useState("");

  const tryRestore = () => {
    const decoded = decodeState(extractCode(restoreInput));
    if (!decoded) {
      showToast("コードが正しくありません");
      return;
    }
    onRestore(decoded);
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
                value={name}
                placeholder={`Player ${i + 1}`}
                maxLength={12}
                onChange={(e) => onPlayerChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>
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
        <button className="btn" onClick={onStart}>
          はじめる →
        </button>
        <button className="btn ghost" onClick={tryRestore}>
          復元
        </button>
      </div>
    </div>
  );
}
