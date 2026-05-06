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

  const handleSave = () => {
    if (draft.declared < 13 || draft.declared > 20) return;
    if (draft.taken < 0 || draft.taken > 20) return;
    const safe: PendingEntry = {
      ...draft,
      aide: draft.aide === draft.napoleon ? -1 : draft.aide,
    };
    onSave(safe);
  };

  const isFinal = index === SET_LENGTH - 1;

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
          <button className="btn" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
