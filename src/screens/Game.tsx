import { useEffect, useRef, useState, type ReactNode } from "react";
import { type Game as GameEntry, type PendingEntry, type State, SET_LENGTH, SUITS, freshPending } from "../types";
import { calcScores, effectiveMultiplier, isAllTakenLoss, recomputeAll, totalScores } from "../lib/score";
import { encodeState } from "../lib/encode";
import { EntryForm } from "../components/EntryForm";
import { EditModal } from "../components/EditModal";
import { SwipeRow } from "../components/SwipeRow";

type Totals = ReturnType<typeof totalScores>;

interface Props {
  state: State;
  setState: (next: State) => void;
  onReset: () => void;
  showToast: (msg: string) => void;
}

export function Game({ state, setState, onReset, showToast }: Props) {
  const [pending, setPending] = useState<PendingEntry>(freshPending);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [justAddedIdx, setJustAddedIdx] = useState<number | null>(null);
  const totals = totalScores(state);
  const isComplete = state.games.length >= SET_LENGTH;

  /* Animate the standings cells when their total changes. */
  const prevTotals = useRef<Totals>(totals);
  const bumpFlags = totals.map((s, i) => s !== prevTotals.current[i]);
  useEffect(() => {
    prevTotals.current = totals;
  });

  /* When a row is just added, scroll it into view. */
  useEffect(() => {
    if (justAddedIdx == null) return;
    const t = setTimeout(() => {
      const el = document.querySelector(".lswipe.just-added");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setJustAddedIdx(null);
    }, 50);
    return () => clearTimeout(t);
  }, [justAddedIdx]);

  const commitEntry = () => {
    if (pending.declared < 13 || pending.declared > 20) {
      showToast("宣言数は 13〜20");
      return;
    }
    if (pending.taken < 0 || pending.taken > 20) {
      showToast("獲得数が異常です");
      return;
    }
    const safe: PendingEntry = {
      ...pending,
      aide: pending.aide === pending.napoleon ? -1 : pending.aide,
    };
    const newIdx = state.games.length;
    const game: GameEntry = { ...safe, scores: calcScores(safe, newIdx) };
    setState({ ...state, games: [...state.games, game] });
    setPending(freshPending());
    setJustAddedIdx(newIdx);
    if (navigator.vibrate) {
      try {
        navigator.vibrate([14, 30, 18]);
      } catch {
        /* ignore */
      }
    }
    showToast(`Game ${newIdx + 1} 記録`);
  };

  const popLast = () => {
    setState({ ...state, games: state.games.slice(0, -1) });
    showToast(`Game ${state.games.length} 取り消し`);
  };

  const handleEditSave = (entry: PendingEntry) => {
    if (editIdx == null) return;
    const games = state.games.slice();
    games[editIdx] = { ...entry, scores: [0, 0, 0, 0, 0] };
    setState({ ...state, games: recomputeAll(games) });
    setEditIdx(null);
    showToast(`Game ${editIdx + 1} 更新`);
  };

  const handleEditDelete = () => {
    if (editIdx == null) return;
    const games = state.games.slice();
    games.splice(editIdx, 1);
    setState({ ...state, games: recomputeAll(games) });
    showToast(`Game ${editIdx + 1} 削除`);
    setEditIdx(null);
  };

  const newSet = () => {
    if (!confirm("セットを破棄して最初の画面に戻りますか?")) return;
    onReset();
  };

  const sumAll = totals.reduce((a, b) => a + b, 0);
  const gameNo = state.games.length + 1;
  const isFinalGame = gameNo === SET_LENGTH;

  return (
    <div className="fade-in">
      <SectionHead label="Standings" meta={`${state.games.length} / ${SET_LENGTH} ゲーム`} />
      <Standings players={state.players} totals={totals} bumpFlags={bumpFlags} />

      {!isComplete ? (
        <>
          <SectionHead
            label={`Game ${String(gameNo).padStart(2, "0")} · 入力`}
            meta={`あと ${SET_LENGTH - state.games.length} ゲーム`}
          />
          <div className="card">
            <div className="game-tag">
              <span className="num">{String(gameNo).padStart(2, "0")}</span>
              <span className="of">/ {SET_LENGTH}</span>
              {isFinalGame && <span className="pill">FINAL ×2</span>}
            </div>
            <EntryForm value={pending} players={state.players} isFinal={isFinalGame} onChange={setPending} />
            <button className="btn" onClick={commitEntry}>
              この回を記録 →
            </button>
          </div>
        </>
      ) : (
        <>
          <SectionHead label="最終結果 · Final" />
          <FinalPodium players={state.players} totals={totals} />
        </>
      )}

      <SectionHead
        label="Ledger · 記録"
        meta={state.games.length > 0 ? `tap to edit · Σ = ${sumAll}` : "まだ無し"}
      />
      <Ledger
        state={state}
        totals={totals}
        justAddedIdx={justAddedIdx}
        onTapRow={setEditIdx}
        onSwipeDeleteLast={popLast}
      />

      {state.games.length > 0 && (
        <>
          <SectionHead label={isComplete ? "Share · 保存・共有" : "Share · 途中経過"} />
          <Share state={state} isFinal={isComplete} showToast={showToast} />
        </>
      )}

      <div className="btn-row" style={{ marginTop: 18 }}>
        <button className="btn ghost" onClick={newSet}>
          新しいセット
        </button>
      </div>

      {editIdx != null && (
        <EditModal
          index={editIdx}
          game={state.games[editIdx]!}
          players={state.players}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditIdx(null)}
        />
      )}
    </div>
  );
}

function SectionHead({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="sec-head">
      <span className="label">{label}</span>
      {meta && <span className="meta">{meta}</span>}
    </div>
  );
}

function signed(s: number) {
  return s > 0 ? `+${s}` : String(s);
}

function scoreClass(s: number) {
  return s > 0 ? "pos" : s < 0 ? "neg" : "zero";
}

function Standings({
  players,
  totals,
  bumpFlags,
}: {
  players: readonly string[];
  totals: Totals;
  bumpFlags: boolean[];
}) {
  const ranked = players.map((_, i) => ({ score: totals[i], i })).sort((a, b) => b.score - a.score);
  const leadIdx = ranked[0].score > 0 || ranked[0].score === ranked[1].score ? ranked[0].i : -1;
  return (
    <div className="standings">
      {players.map((name, i) => {
        const s = totals[i];
        const lead = i === leadIdx && s > 0 ? " lead" : "";
        const bump = bumpFlags[i] ? " bumping" : "";
        return (
          <div key={i} className={`cell${lead}`}>
            <div className="name">{name}</div>
            <div className={`pts ${scoreClass(s)}${bump}`}>{signed(s)}</div>
          </div>
        );
      })}
    </div>
  );
}

function FinalPodium({ players, totals }: { players: readonly string[]; totals: Totals }) {
  const ranks = ["1st", "2nd", "3rd", "4th", "5th"] as const;
  const ranked = players
    .map((name, i) => ({ name, score: totals[i], i }))
    .sort((a, b) => b.score - a.score);
  return (
    <div className="final">
      {ranked.map((p, rank) => (
        <div key={p.i} className={`stand ${rank === 0 ? "first" : ""}`}>
          {rank === 0 && (
            <div className="crown">
              <svg viewBox="0 0 22 14" width="22" height="14">
                <path
                  d="M2 12 L4 4 L8 7 L11 2 L14 7 L18 4 L20 12 Z"
                  fill="#b53a2b"
                  stroke="#1f1d1a"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
          <div className="rk">{ranks[rank]}</div>
          <div className="nm">{p.name}</div>
          <div className={`pt ${scoreClass(p.score)}`}>{signed(p.score)}</div>
        </div>
      ))}
    </div>
  );
}

function Ledger({
  state,
  totals,
  justAddedIdx,
  onTapRow,
  onSwipeDeleteLast,
}: {
  state: State;
  totals: Totals;
  justAddedIdx: number | null;
  onTapRow: (idx: number) => void;
  onSwipeDeleteLast: () => void;
}) {
  return (
    <div className="ledger">
      <div className="lhead">
        <span>#</span>
        <div className="pn-row">
          {state.players.map((n, i) => (
            <span key={i} className="pn">
              {n}
            </span>
          ))}
        </div>
      </div>

      {state.games.length === 0 ? (
        <div className="empty-row">まだゲームがありません</div>
      ) : (
        state.games.map((g, i) => {
          const isLast = i === state.games.length - 1;
          const canDelete = isLast && state.games.length < SET_LENGTH;
          const justAdded = i === justAddedIdx;
          return (
            <LedgerRow
              key={i}
              g={g}
              i={i}
              players={state.players}
              canDelete={canDelete}
              justAdded={justAdded}
              onTap={() => onTapRow(i)}
              onDelete={onSwipeDeleteLast}
            />
          );
        })
      )}

      <div className="ltot">
        <span className="lab">Σ</span>
        <div className="pn-scores">
          {totals.map((s, i) => (
            <span key={i} className={`sc ${scoreClass(s)}`}>
              {signed(s)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LedgerRow({
  g,
  i,
  players,
  canDelete,
  justAdded,
  onTap,
  onDelete,
}: {
  g: GameEntry;
  i: number;
  players: readonly string[];
  canDelete: boolean;
  justAdded: boolean;
  onTap: () => void;
  onDelete: () => void;
}) {
  const won = g.taken >= g.declared && !isAllTakenLoss(g);
  const allTakenLoss = isAllTakenLoss(g);
  const userMult = g.multiplier;
  const isFinal = i === SET_LENGTH - 1;
  const _eff = effectiveMultiplier(g, i);
  void _eff;
  const suit = SUITS.find((s) => s.v === g.suit)!;
  const napName = players[g.napoleon];
  const aideName = g.aide === -1 ? null : players[g.aide];

  const inner: ReactNode = (
    <div className={`lrow${justAdded ? " just-added" : ""}`} onClick={onTap}>
      <span className="gn">{String(i + 1).padStart(2, "0")}</span>
      <div className="body">
        <div className="desc">
          <span className={`suit ${suit.cls}`}>{suit.sym}</span>
          <span className="nap">{napName}</span>
          {aideName && (
            <>
              <span className="x">+</span>
              <span className="aide">{aideName}</span>
            </>
          )}
          <span className={`res ${won ? "win" : "lose"}`}>
            {g.taken}/{g.declared}
          </span>
          {allTakenLoss && (
            <>
              {" "}
              <span className="mult-flag warn" title="全取り">
                全
              </span>
            </>
          )}
          {userMult > 1 ? (
            <>
              {" "}
              <span className="mult-flag">×{userMult}</span>
            </>
          ) : isFinal ? (
            <>
              {" "}
              <span className="mult-flag fin">FIN</span>
            </>
          ) : null}
        </div>
        <div className="pn-scores">
          {g.scores.map((s, k) => (
            <span key={k} className={`sc ${scoreClass(s)}`}>
              {signed(s)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  if (canDelete) {
    return (
      <SwipeRow
        onDelete={onDelete}
        background={
          <>
            <span>取り消し</span>
            <span className="ic">×</span>
          </>
        }
      >
        {inner}
      </SwipeRow>
    );
  }
  return (
    <div className={`lswipe${justAdded ? " just-added" : ""}`}>
      <div className="lswipe-fg">{inner}</div>
    </div>
  );
}

function Share({
  state,
  isFinal,
  showToast,
}: {
  state: State;
  isFinal: boolean;
  showToast: (msg: string) => void;
}) {
  const code = encodeState(state);
  const url = location.origin + location.pathname + "#data=" + code;

  const copy = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(ok);
    } catch {
      showToast("コピーに失敗");
    }
  };

  const shareText = () => {
    const totals = totalScores(state);
    const ranked = state.players.map((n, i) => ({ n, s: totals[i] })).sort((a, b) => b.s - a.s);
    const lines = ["🃏 ナポレオン 最終結果"];
    const pre = ["🥇", "🥈", "🥉", "4.", "5."];
    ranked.forEach((p, i) => {
      lines.push(`${pre[i]} ${p.n}  ${p.s > 0 ? `+${p.s}` : p.s}`);
    });
    lines.push(`\n${state.games.length}ゲーム`);
    return lines.join("\n");
  };

  return (
    <div>
      <div className="share-row">
        <button className="primary" onClick={() => copy(url, "URLをコピーしました")}>
          URLをコピー
        </button>
        <button onClick={() => copy(code, "コードをコピー")}>コードのみ</button>
        {isFinal && <button onClick={() => copy(shareText(), "結果テキストをコピー")}>テキスト</button>}
      </div>
      <div className="code-box">#data={code}</div>
    </div>
  );
}
