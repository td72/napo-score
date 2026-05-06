import { type PendingEntry, type SuitCode, SUITS } from "../types";
import { WheelPicker } from "./WheelPicker";

const DECL_RANGE = Array.from({ length: 8 }, (_, i) => 13 + i);
const TAKEN_RANGE = Array.from({ length: 21 }, (_, i) => i);
const MULTIPLIERS: readonly (1 | 2 | 4)[] = [1, 2, 4];

interface Props {
  value: PendingEntry;
  players: readonly string[];
  isFinal: boolean;
  onChange: (next: PendingEntry) => void;
}

export function EntryForm({ value, players, isFinal, onChange }: Props) {
  const set = <K extends keyof PendingEntry>(k: K, v: PendingEntry[K]) =>
    onChange({ ...value, [k]: v });

  const isUnspecified = value.aide === -1;
  const isSolo = !isUnspecified && value.aide === value.napoleon;
  const napName = players[value.napoleon] || `Player ${value.napoleon + 1}`;
  const eff = value.multiplier * (isFinal ? 2 : 1);
  const base = Math.max(1, value.declared - 12) * eff;
  const allTakenLoss = value.taken >= 20 && value.declared < 20;
  const won = value.taken >= value.declared && !allTakenLoss;
  const verdict = won ? "勝ち" : "負け";
  const sideLabel = isSolo ? "連合4人 各" : "連合3人 各";
  const napAmount = base * (isSolo ? 4 : 2);
  const aideLine = isUnspecified
    ? "副官: 未指定"
    : isSolo
      ? "（独り立ち）"
      : `副官: ${players[value.aide] || ""}`;

  return (
    <>
      <div className="row r-2">
        <div>
          <span className="field">Napoleon · ナポ</span>
          <select
            value={value.napoleon}
            onChange={(e) => set("napoleon", parseInt(e.target.value, 10))}
          >
            {players.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="field">Aide · 副官</span>
          <select value={value.aide} onChange={(e) => set("aide", parseInt(e.target.value, 10))}>
            <option value={-1} disabled hidden>
              — 未指定
            </option>
            {players.map((n, i) => (
              <option key={i} value={i}>
                {n}
                {i === value.napoleon ? "（独り立ち）" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="field">Suit · 切札</span>
          <select value={value.suit} onChange={(e) => set("suit", e.target.value as SuitCode)}>
            {SUITS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.sym} {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row r-2">
        <div>
          <div className="picker-cap">
            <span className="field">宣言 · Declared</span>
            <span className="hint-mini">13–20</span>
          </div>
          <WheelPicker items={DECL_RANGE} value={value.declared} onChange={(v) => set("declared", v)} />
        </div>
        <div>
          <div className="picker-cap">
            <span className="field">獲得 · Taken</span>
            <span className="hint-mini">0–20</span>
          </div>
          <WheelPicker items={TAKEN_RANGE} value={value.taken} onChange={(v) => set("taken", v)} />
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <div className="picker-cap">
            <span className="field">Multiplier · 倍率</span>
            <span className="hint-mini">{isFinal ? "最終ゲーム自動 ×2" : "チョンボ後は ↑"}</span>
          </div>
          <div className="seg">
            {MULTIPLIERS.map((v) => (
              <button
                key={v}
                className={value.multiplier === v ? "on" : ""}
                onClick={() => set("multiplier", v)}
              >
                ×{v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="helper">
        基本点 = (宣言 {value.declared} − 12) × {eff} = <b>{base}</b>
        <br />
        宣言 <b>{value.declared}</b> · 獲得 <b>{value.taken}</b> · {aideLine}
        <br />
        {isUnspecified ? (
          <span className="accent">⚠ 副官を選択してください</span>
        ) : (
          <>
            <span className="accent">{verdict}</span>:{" "}
            {won ? (
              <>
                {napName}側 +{napAmount}
                {!isSolo && <>, 副官 +{base}</>}, {sideLabel} −{base}
              </>
            ) : (
              <>
                {napName}側 −{napAmount}
                {!isSolo && <>, 副官 −{base}</>}, {sideLabel} +{base}
              </>
            )}
          </>
        )}
        {allTakenLoss && (
          <>
            <br />
            <span className="accent">⚠ 全取り</span>: 宣言{value.declared}で20枚獲得 → 自動的に負け
          </>
        )}
      </div>
    </>
  );
}
