import { useEffect, useRef, useState } from "react";
import { CHANGELOG } from "../lib/changelog";

interface Props {
  onClose: () => void;
}

export function ChangelogModal({ onClose }: Props) {
  const [opened, setOpened] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => setOpened(true));
  }, []);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpened(false);
    setTimeout(onClose, 220);
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
            <span className="modal-of">更新履歴</span>
          </div>
          <button className="modal-x" onClick={close} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="modal-body">
          <ul className="changelog">
            {CHANGELOG.map((entry) => (
              <li key={entry.date}>
                <div className="changelog-head">
                  <span className="changelog-date">{entry.date}</span>
                  {entry.title && <span className="changelog-title">{entry.title}</span>}
                </div>
                <ul>
                  {entry.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
