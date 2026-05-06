import { useEffect, useRef, useState } from "react";
import { type Game, type PendingEntry, SET_LENGTH } from "../types";
import { EntryForm } from "./EntryForm";

interface Props {
  index: number;
  game: Game;
  players: readonly string[];
  onSave: (entry: PendingEntry) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function EditModal({ index, game, players, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<PendingEntry>({
    napoleon: game.napoleon,
    aide: game.aide,
    suit: game.suit,
    declared: game.declared,
    taken: game.taken,
    multiplier: game.multiplier,
  });
  const [opened, setOpened] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  // animate-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setOpened(true));
  }, []);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpened(false);
    setTimeout(onClose, 220);
  };

  const isFinal = index === SET_LENGTH - 1;
  const canSave =
    draft.aide !== -1 &&
    draft.declared >= 13 &&
    draft.declared <= 20 &&
    draft.taken >= 0 &&
    draft.taken <= 20;

  const handleSave = () => {
    if (!canSave) return;
    onSave(draft);
  };

  return (
    <div
      ref={backdropRef}
      className={`modal-bd${opened ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === backdropRef.current) close();
      }}
    >
      <div className="modal-sheet">
        <div className="modal-head">
          <div className="modal-title">
            <span className="modal-num">{String(index + 1).padStart(2, "0")}</span>
            <span className="modal-of">記録を編集</span>
          </div>
          <button className="modal-x" onClick={close} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="modal-body">
          <EntryForm value={draft} players={players} isFinal={isFinal} onChange={setDraft} />
        </div>

        <div className="modal-foot">
          <button
            className="btn danger"
            onClick={() => {
              if (!confirm(`Game ${index + 1} を削除しますか?\n以降の最終ゲーム判定は維持されます。`)) return;
              onDelete();
            }}
          >
            削除
          </button>
          <button className="btn" onClick={handleSave} disabled={!canSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
