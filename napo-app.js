/* napo-app.js — Napoleon scoresheet, A · Stationery refined.
   Connects shared logic to the new UI: setup/game screens, wheel pickers,
   swipe-to-delete, record animation, and PWA hooks. */
(function () {
  'use strict';
  const N = window.NAPO;
  const STATE_KEY = 'napoleon-ledger-v2';
  const root = document.getElementById('root');
  const toastEl = document.getElementById('toast');

  let state = { players: ['', '', '', '', ''], games: [], started: false };
  let pending = N.freshPending();
  let pickers = { decl: null, taken: null };
  let lastTotals = [0, 0, 0, 0, 0];
  let justAddedFlag = false;

  /* -------- persistence -------- */
  function save() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      const r = sessionStorage.getItem(STATE_KEY);
      if (r) state = Object.assign(state, JSON.parse(r));
    } catch (e) {}
  }

  /* -------- toast -------- */
  let toastT = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 1700);
  }

  /* -------- el helper -------- */
  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach(c => {
      if (c == null || c === false) return;
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    });
    return e;
  }

  /* -------- render -------- */
  function render() {
    save();
    root.innerHTML = '';
    root.appendChild(state.started ? renderGame() : renderSetup());
  }

  /* -------- Setup screen -------- */
  function renderSetup() {
    const wrap = el('div', { class: 'fade-in' });

    wrap.appendChild(el('div', { class: 'sec-head' }, [
      el('span', { class: 'label' }, '参加者 · Players'),
      el('span', { class: 'meta' }, '5名'),
    ]));

    const card = el('div', { class: 'card' });
    const grid = el('div', { class: 'players-setup' });
    state.players.forEach((name, i) => {
      const seat = ['I','II','III','IV','V'][i];
      grid.appendChild(el('div', { class: 'player-input' }, [
        el('span', { class: 'seat' }, seat),
        el('input', {
          type: 'text', value: name, placeholder: `Player ${i+1}`, maxlength: '12',
          oninput: (e) => { state.players[i] = e.target.value; save(); },
        }),
      ]));
    });
    card.appendChild(grid);
    wrap.appendChild(card);

    wrap.appendChild(el('div', { class: 'sec-head' }, [
      el('span', { class: 'label' }, '記録の復元 · Restore'),
    ]));
    const rcard = el('div', { class: 'card' });
    const rinput = el('input', {
      type: 'text', id: 'restoreInput',
      placeholder: '#data=… を貼り付け',
      style: 'font-family: JetBrains Mono, monospace; font-size: 12px;'
    });
    rcard.appendChild(rinput);
    rcard.appendChild(el('div', { class: 'helper' },
      'URL のハッシュ (#data=…) または共有コードを貼り付けて復元できます。'));
    wrap.appendChild(rcard);

    wrap.appendChild(el('div', { class: 'btn-row' }, [
      el('button', {
        class: 'btn',
        onclick: () => {
          state.players = state.players.map((n, i) => (n || '').trim() || `Player ${i+1}`);
          state.games = [];
          state.started = true;
          history.replaceState(null, '', location.pathname + location.search);
          render();
        }
      }, 'はじめる →'),
      el('button', {
        class: 'btn ghost',
        onclick: () => {
          let code = (rinput.value || '').trim();
          if (code.includes('#')) code = code.split('#').pop();
          if (code.startsWith('data=')) code = code.slice(5);
          const decoded = N.decodeState(code);
          if (!decoded) { toast('コードが正しくありません'); return; }
          state = decoded;
          render();
        }
      }, '復元'),
    ]));

    return wrap;
  }

  /* -------- Game screen -------- */
  function renderGame() {
    const container = el('div', { class: 'fade-in' });
    const totals = N.totalScores(state);
    const isComplete = state.games.length >= N.SET_LENGTH;

    /* Standings */
    container.appendChild(el('div', { class: 'sec-head' }, [
      el('span', { class: 'label' }, 'Standings'),
      el('span', { class: 'meta' }, `${state.games.length} / ${N.SET_LENGTH} ゲーム`),
    ]));
    container.appendChild(renderStandings(totals));

    /* Entry or final */
    if (!isComplete) {
      container.appendChild(el('div', { class: 'sec-head' }, [
        el('span', { class: 'label' }, `Game ${String(state.games.length+1).padStart(2,'0')} · 入力`),
        el('span', { class: 'meta' }, `あと ${N.SET_LENGTH - state.games.length} ゲーム`),
      ]));
      container.appendChild(renderEntry());
    } else {
      container.appendChild(el('div', { class: 'sec-head' }, [
        el('span', { class: 'label' }, '最終結果 · Final'),
      ]));
      container.appendChild(renderFinal(totals));
    }

    /* Ledger */
    container.appendChild(el('div', { class: 'sec-head' }, [
      el('span', { class: 'label' }, 'Ledger · 記録'),
      el('span', { class: 'meta' }, state.games.length > 0 ? `tap to edit · Σ = ${totals.reduce((a,b)=>a+b,0)}` : 'まだ無し'),
    ]));
    container.appendChild(renderLedger(totals));

    /* Share — only if there's something to share */
    if (state.games.length > 0) {
      container.appendChild(el('div', { class: 'sec-head' }, [
        el('span', { class: 'label' }, isComplete ? 'Share · 保存・共有' : 'Share · 途中経過'),
      ]));
      container.appendChild(renderShare(isComplete));
    }

    /* New set */
    container.appendChild(el('div', { class: 'btn-row', style: 'margin-top: 18px;' }, [
      el('button', {
        class: 'btn ghost',
        onclick: () => {
          if (!confirm('セットを破棄して最初の画面に戻りますか?')) return;
          state = { players: ['','','','',''], games: [], started: false };
          sessionStorage.removeItem(STATE_KEY);
          history.replaceState(null, '', location.pathname + location.search);
          render();
        }
      }, '新しいセット'),
    ]));

    lastTotals = totals.slice();
    return container;
  }

  /* -------- Standings strip -------- */
  function renderStandings(totals) {
    const ranked = state.players.map((n, i) => ({ score: totals[i], i }))
      .sort((a, b) => b.score - a.score);
    const leadIdx = (ranked[0].score > 0 || ranked[0].score === ranked[1].score) ? ranked[0].i : -1;

    const strip = el('div', { class: 'standings' });
    state.players.forEach((name, i) => {
      const s = totals[i];
      const cls = s > 0 ? 'pos' : (s < 0 ? 'neg' : 'zero');
      const lead = (i === leadIdx && s > 0) ? ' lead' : '';
      const sign = s > 0 ? '+' : '';
      const bump = (s !== lastTotals[i] && lastTotals[i] !== undefined) ? ' bumping' : '';
      strip.appendChild(el('div', { class: 'cell' + lead }, [
        el('div', { class: 'name' }, name),
        el('div', { class: 'pts ' + cls + bump }, sign + s),
      ]));
    });
    return strip;
  }

  /* -------- Entry form -------- */
  function renderEntry() {
    const card = el('div', { class: 'card' });
    const gameNo = state.games.length + 1;
    const isFinal = gameNo === N.SET_LENGTH;

    card.appendChild(el('div', { class: 'game-tag' }, [
      el('span', { class: 'num' }, String(gameNo).padStart(2, '0')),
      el('span', { class: 'of' }, `/ ${N.SET_LENGTH}`),
      isFinal ? el('span', { class: 'pill' }, 'FINAL ×2') : null,
    ]));

    /* napoleon, aide */
    card.appendChild(el('div', { class: 'row r-2' }, [
      el('div', {}, [
        el('span', { class: 'field' }, 'Napoleon · ナポ'),
        makeSelect('nap-sel', state.players.map((n, i) => ({ v: i, label: n })), pending.napoleon, (v) => { pending.napoleon = parseInt(v,10); }),
      ]),
      el('div', {}, [
        el('span', { class: 'field' }, 'Aide · 副官'),
        makeSelect('aide-sel',
          [{ v: -1, label: '— なし(自分1人)' }].concat(state.players.map((n,i) => ({ v: i, label: n }))),
          pending.aide, (v) => { pending.aide = parseInt(v,10); }),
      ]),
    ]));

    /* suit */
    card.appendChild(el('div', { class: 'row', style: 'grid-template-columns: 1fr;' }, [
      el('div', {}, [
        el('span', { class: 'field' }, 'Suit · 切札'),
        makeSelect('suit-sel', N.SUITS.map(s => ({ v: s.v, label: `${s.sym} ${s.label}` })), pending.suit, (v) => { pending.suit = v; }),
      ]),
    ]));

    /* declared / taken — wheel pickers */
    const declWrap = el('div', {});
    const takenWrap = el('div', {});

    card.appendChild(el('div', { class: 'row r-2' }, [
      el('div', {}, [
        el('div', { class: 'picker-cap' }, [
          el('span', { class: 'field' }, '宣言 · Declared'),
          el('span', { class: 'hint-mini' }, '13–20'),
        ]),
        declWrap,
      ]),
      el('div', {}, [
        el('div', { class: 'picker-cap' }, [
          el('span', { class: 'field' }, '獲得 · Taken'),
          el('span', { class: 'hint-mini' }, '0–20'),
        ]),
        takenWrap,
      ]),
    ]));

    /* multiplier */
    const multWrap = el('div', { class: 'seg' });
    [1, 2, 4].forEach(v => {
      multWrap.appendChild(el('button', {
        class: pending.multiplier === v ? 'on' : '',
        onclick: () => { pending.multiplier = v; renderEntryRefresh(); },
      }, '×' + v));
    });
    card.appendChild(el('div', { class: 'row', style: 'grid-template-columns: 1fr;' }, [
      el('div', {}, [
        el('div', { class: 'picker-cap' }, [
          el('span', { class: 'field' }, 'Multiplier · 倍率'),
          el('span', { class: 'hint-mini' }, isFinal ? '最終ゲーム自動 ×2' : 'チョンボ後は ↑'),
        ]),
        multWrap,
      ]),
    ]));

    /* helper */
    const helper = el('div', { class: 'helper', id: 'entry-helper' });
    card.appendChild(helper);

    /* record button */
    card.appendChild(el('button', {
      class: 'btn',
      onclick: () => commitEntry(card),
    }, 'この回を記録 →'));

    /* mount pickers after insertion */
    setTimeout(() => {
      const declItems = []; for (let i = 13; i <= 20; i++) declItems.push(i);
      const takenItems = []; for (let i = 0; i <= 20; i++) takenItems.push(i);
      pickers.decl = window.WheelPicker.create(declWrap, {
        items: declItems, value: pending.declared,
        onChange: (v) => { pending.declared = v; updateHelper(); },
      });
      pickers.taken = window.WheelPicker.create(takenWrap, {
        items: takenItems, value: pending.taken,
        onChange: (v) => { pending.taken = v; updateHelper(); },
      });
      updateHelper();
    }, 0);

    function updateHelper() {
      const eff = (pending.multiplier || 1) * (isFinal ? 2 : 1);
      const base = Math.max(1, pending.declared - 12) * eff;
      const allTakenLoss = pending.taken >= 20 && pending.declared < 20;
      const won = pending.taken >= pending.declared && !allTakenLoss;
      const napName = state.players[pending.napoleon] || `Player ${pending.napoleon+1}`;
      const verdict = won ? '勝ち' : '負け';
      const result = won
        ? `<span class="accent">${verdict}</span>: ${napName}側 +${base*(pending.aide===-1?4:2)}, 副官 +${base}, 連合 各 −${base}`
        : `<span class="accent">${verdict}</span>: ${napName}側 −${base*(pending.aide===-1?4:2)}, 副官 −${base}, 連合 各 +${base}`;
      const aideName = pending.aide === -1 ? '（副官なし）' : `副官: ${state.players[pending.aide] || ''}`;
      const ruleNote = allTakenLoss
        ? `<br><span class="accent">⚠ 20取り負け</span>: 宣言${pending.declared}で20枚獲得 → 自動的に負け`
        : '';
      helper.innerHTML = `
        基本点 = (宣言 ${pending.declared} − 12) × ${eff} = <b>${base}</b><br>
        宣言 <b>${pending.declared}</b> · 獲得 <b>${pending.taken}</b> · ${aideName}<br>
        ${result.replace('連合 各', pending.aide === -1 ? '連合4人 各' : '連合3人 各')}${ruleNote}
      `;
    }

    function renderEntryRefresh() {
      // re-render the multiplier segment
      [...multWrap.children].forEach((b, i) => {
        const v = [1,2,4][i];
        b.classList.toggle('on', pending.multiplier === v);
      });
      updateHelper();
    }

    return card;
  }

  function makeSelect(id, options, current, onChange) {
    const sel = el('select', { id, onchange: (e) => onChange(e.target.value) });
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.v;
      opt.textContent = o.label;
      if (String(o.v) === String(current)) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  function commitEntry(card) {
    const e = pending;
    if (e.declared < 13 || e.declared > 20) { toast('宣言数は 13〜20'); return; }
    if (e.taken < 0 || e.taken > 20) { toast('獲得数が異常です'); return; }
    if (e.aide === e.napoleon) { e.aide = -1; }
    const game = {
      napoleon: e.napoleon,
      aide: e.aide,
      suit: e.suit,
      declared: e.declared,
      taken: e.taken,
      multiplier: e.multiplier || 1,
    };
    const newIdx = state.games.length;
    game.scores = N.calcScores(game, newIdx);
    state.games.push(game);
    pending = N.freshPending();
    justAddedFlag = true;
    if (navigator.vibrate) try { navigator.vibrate([14, 30, 18]); } catch (e) {}
    toast(`Game ${state.games.length} 記録`);
    render();
    // scroll to new ledger row
    setTimeout(() => {
      const r = document.querySelector('.lswipe.just-added');
      if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  /* -------- Ledger -------- */
  function renderLedger(totals) {
    const card = el('div', { class: 'ledger' });

    // header row
    card.appendChild(el('div', { class: 'lhead' }, [
      el('span', {}, '#'),
      el('div', { class: 'pn-row' }, state.players.map(n => el('span', { class: 'pn' }, n))),
    ]));

    if (state.games.length === 0) {
      card.appendChild(el('div', { class: 'empty-row' }, 'まだゲームがありません'));
      return card;
    }

    state.games.forEach((g, i) => {
      const isLast = i === state.games.length - 1;
      const canDelete = isLast && state.games.length < N.SET_LENGTH;
      card.appendChild(buildSwipeRow(g, i, totals, canDelete));
    });

    // totals
    const tot = el('div', { class: 'ltot' }, [
      el('span', { class: 'lab' }, 'Σ'),
      el('div', { class: 'pn-scores' }, totals.map(s => {
        const cls = s > 0 ? 'pos' : (s < 0 ? 'neg' : 'zero');
        const sign = s > 0 ? '+' : '';
        return el('span', { class: 'sc ' + cls }, sign + s);
      })),
    ]);
    card.appendChild(tot);

    return card;
  }

  function buildSwipeRow(g, i, totals, canDelete) {
    const won = g.taken >= g.declared && !N.isAllTakenLoss(g);
    const allTakenLoss = N.isAllTakenLoss(g);
    const eff = N.effectiveMultiplier(g, i);
    const userMult = g.multiplier || 1;
    const isFinal = i === N.SET_LENGTH - 1;
    const suit = N.SUITS.find(s => s.v === g.suit);
    const napName = state.players[g.napoleon];
    const aideName = g.aide === -1 ? null : state.players[g.aide];

    const row = el('div', { class: 'lswipe' + (justAddedFlag && i === state.games.length - 1 ? ' just-added' : '') });
    if (justAddedFlag && i === state.games.length - 1) justAddedFlag = false;

    // bg layer
    if (canDelete) {
      row.appendChild(el('div', { class: 'lswipe-bg' }, [
        el('span', {}, '取り消し'),
        el('span', { class: 'ic' }, '×'),
      ]));
    }

    const fg = el('div', { class: 'lswipe-fg' });

    const flagHtml = userMult > 1
      ? `<span class="mult-flag">×${userMult}</span>`
      : (isFinal ? `<span class="mult-flag fin">FIN</span>` : '');
    const ruleFlag = allTakenLoss ? `<span class="mult-flag warn" title="20取り負け">20</span>` : '';

    const desc = el('div', { class: 'desc' }, []);
    desc.innerHTML = `
      <span class="suit ${suit.cls}">${suit.sym}</span>
      <span class="nap">${escapeHtml(napName)}</span>
      ${aideName ? `<span class="x">+</span><span class="aide">${escapeHtml(aideName)}</span>` : ''}
      <span class="res ${won?'win':'lose'}">${g.taken}/${g.declared}</span>
      ${ruleFlag ? ' ' + ruleFlag : ''}
      ${flagHtml ? ' ' + flagHtml : ''}
    `;

    const lrow = el('div', { class: 'lrow' + (justAddedFlag ? ' just-added' : ''), onclick: () => openEditModal(i) }, [
      el('span', { class: 'gn' }, String(i+1).padStart(2,'0')),
      el('div', { class: 'body' }, [
        desc,
        el('div', { class: 'pn-scores' }, g.scores.map(s => {
          const cls = s > 0 ? 'pos' : (s < 0 ? 'neg' : 'zero');
          const sign = s > 0 ? '+' : '';
          return el('span', { class: 'sc ' + cls }, sign + s);
        })),
      ]),
    ]);

    fg.appendChild(lrow);
    row.appendChild(fg);

    if (canDelete) {
      window.SwipeRow.bind(fg, {
        onDelete: () => {
          state.games.pop();
          render();
          toast(`Game ${i+1} 取り消し`);
        }
      });
    }

    return row;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  /* -------- Edit modal -------- */
  let editPickers = { decl: null, taken: null };
  function openEditModal(idx) {
    const orig = state.games[idx];
    // Local working copy of the entry
    const draft = {
      napoleon: orig.napoleon,
      aide: orig.aide,
      suit: orig.suit,
      declared: orig.declared,
      taken: orig.taken,
      multiplier: orig.multiplier || 1,
    };
    const isFinal = idx === N.SET_LENGTH - 1;

    // Backdrop + sheet
    const backdrop = el('div', { class: 'modal-bd', onclick: (e) => { if (e.target === backdrop) close(); } });
    const sheet = el('div', { class: 'modal-sheet' });

    // Header
    sheet.appendChild(el('div', { class: 'modal-head' }, [
      el('div', { class: 'modal-title' }, [
        el('span', { class: 'modal-num' }, String(idx+1).padStart(2,'0')),
        el('span', { class: 'modal-of' }, '記録を編集'),
      ]),
      el('button', { class: 'modal-x', onclick: close, 'aria-label': '閉じる' }, '×'),
    ]));

    // Body — same fields as entry form
    const body = el('div', { class: 'modal-body' });

    body.appendChild(el('div', { class: 'row r-2' }, [
      el('div', {}, [
        el('span', { class: 'field' }, 'Napoleon · ナポ'),
        makeSelect('e-nap', state.players.map((n, i) => ({ v: i, label: n })), draft.napoleon, (v) => { draft.napoleon = parseInt(v,10); }),
      ]),
      el('div', {}, [
        el('span', { class: 'field' }, 'Aide · 副官'),
        makeSelect('e-aide',
          [{ v: -1, label: '— なし(自分1人)' }].concat(state.players.map((n,i) => ({ v: i, label: n }))),
          draft.aide, (v) => { draft.aide = parseInt(v,10); }),
      ]),
    ]));

    body.appendChild(el('div', { class: 'row', style: 'grid-template-columns: 1fr;' }, [
      el('div', {}, [
        el('span', { class: 'field' }, 'Suit · 切札'),
        makeSelect('e-suit', N.SUITS.map(s => ({ v: s.v, label: `${s.sym} ${s.label}` })), draft.suit, (v) => { draft.suit = v; }),
      ]),
    ]));

    const declWrap = el('div', {});
    const takenWrap = el('div', {});
    body.appendChild(el('div', { class: 'row r-2' }, [
      el('div', {}, [
        el('div', { class: 'picker-cap' }, [
          el('span', { class: 'field' }, '宣言 · Declared'),
          el('span', { class: 'hint-mini' }, '13–20'),
        ]),
        declWrap,
      ]),
      el('div', {}, [
        el('div', { class: 'picker-cap' }, [
          el('span', { class: 'field' }, '獲得 · Taken'),
          el('span', { class: 'hint-mini' }, '0–20'),
        ]),
        takenWrap,
      ]),
    ]));

    const multWrap = el('div', { class: 'seg' });
    function renderMult() {
      multWrap.innerHTML = '';
      [1, 2, 4].forEach(v => {
        multWrap.appendChild(el('button', {
          class: draft.multiplier === v ? 'on' : '',
          onclick: () => { draft.multiplier = v; renderMult(); updateHelper(); },
        }, '×' + v));
      });
    }
    renderMult();

    body.appendChild(el('div', { class: 'row', style: 'grid-template-columns: 1fr;' }, [
      el('div', {}, [
        el('div', { class: 'picker-cap' }, [
          el('span', { class: 'field' }, 'Multiplier · 倍率'),
          el('span', { class: 'hint-mini' }, isFinal ? '最終ゲーム自動 ×2' : ''),
        ]),
        multWrap,
      ]),
    ]));

    const helper = el('div', { class: 'helper' });
    body.appendChild(helper);

    function updateHelper() {
      const eff = (draft.multiplier || 1) * (isFinal ? 2 : 1);
      const base = Math.max(1, draft.declared - 12) * eff;
      const allTakenLoss = draft.taken >= 20 && draft.declared < 20;
      const won = draft.taken >= draft.declared && !allTakenLoss;
      const napName = state.players[draft.napoleon] || '';
      const verdict = won ? '勝ち' : '負け';
      const aideName = draft.aide === -1 ? '（副官なし）' : `副官: ${state.players[draft.aide] || ''}`;
      const ruleNote = allTakenLoss
        ? `<br><span class="accent">⚠ 20取り負け</span>: 宣言${draft.declared}で20枚獲得 → 自動的に負け`
        : '';
      helper.innerHTML = `
        基本点 = (宣言 ${draft.declared} − 12) × ${eff} = <b>${base}</b><br>
        宣言 <b>${draft.declared}</b> · 獲得 <b>${draft.taken}</b> · ${aideName}<br>
        <span class="accent">${verdict}</span>${ruleNote}
      `;
    }

    sheet.appendChild(body);

    // Footer with actions
    sheet.appendChild(el('div', { class: 'modal-foot' }, [
      el('button', {
        class: 'btn danger',
        onclick: () => {
          if (!confirm(`Game ${idx+1} を削除しますか?\n以降の最終ゲーム判定は維持されます。`)) return;
          state.games.splice(idx, 1);
          // Recompute all subsequent scores (final-bonus index changes)
          state.games.forEach((g, i) => { g.scores = N.calcScores(g, i); });
          close();
          render();
          toast(`Game ${idx+1} 削除`);
        }
      }, '削除'),
      el('button', {
        class: 'btn',
        onclick: () => {
          if (draft.declared < 13 || draft.declared > 20) { toast('宣言数は 13〜20'); return; }
          if (draft.taken < 0 || draft.taken > 20) { toast('獲得数が異常'); return; }
          if (draft.aide === draft.napoleon) draft.aide = -1;
          state.games[idx] = {
            napoleon: draft.napoleon,
            aide: draft.aide,
            suit: draft.suit,
            declared: draft.declared,
            taken: draft.taken,
            multiplier: draft.multiplier || 1,
            scores: [], // calculated below
          };
          // Recompute every game's scores in case multiplier/index logic shifted
          state.games.forEach((g, i) => { g.scores = N.calcScores(g, i); });
          close();
          render();
          toast(`Game ${idx+1} 更新`);
        }
      }, '保存'),
    ]));

    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    // Mount pickers
    setTimeout(() => {
      const declItems = []; for (let i = 13; i <= 20; i++) declItems.push(i);
      const takenItems = []; for (let i = 0; i <= 20; i++) takenItems.push(i);
      editPickers.decl = window.WheelPicker.create(declWrap, {
        items: declItems, value: draft.declared,
        onChange: (v) => { draft.declared = v; updateHelper(); },
      });
      editPickers.taken = window.WheelPicker.create(takenWrap, {
        items: takenItems, value: draft.taken,
        onChange: (v) => { draft.taken = v; updateHelper(); },
      });
      updateHelper();
    }, 0);

    function close() {
      backdrop.classList.remove('open');
      setTimeout(() => {
        if (editPickers.decl) editPickers.decl.destroy();
        if (editPickers.taken) editPickers.taken.destroy();
        editPickers = { decl: null, taken: null };
        backdrop.remove();
      }, 220);
    }
  }

  /* -------- Final standings -------- */
  function renderFinal(totals) {
    const ranked = state.players.map((n, i) => ({ name: n, score: totals[i], i }))
      .sort((a, b) => b.score - a.score);
    const grid = el('div', { class: 'final' });
    ranked.forEach((p, rank) => {
      const cls = rank === 0 ? 'first' : '';
      const ptsCls = p.score > 0 ? 'pos' : (p.score < 0 ? 'neg' : 'zero');
      const sign = p.score > 0 ? '+' : '';
      const stand = el('div', { class: 'stand ' + cls }, [
        rank === 0 ? el('div', { class: 'crown' }, [crownSvg()]) : null,
        el('div', { class: 'rk' }, ['1st','2nd','3rd','4th','5th'][rank]),
        el('div', { class: 'nm' }, p.name),
        el('div', { class: 'pt ' + ptsCls }, sign + p.score),
      ]);
      grid.appendChild(stand);
    });
    return grid;
  }
  function crownSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 22 14');
    svg.setAttribute('width', '22'); svg.setAttribute('height', '14');
    svg.innerHTML = '<path d="M2 12 L4 4 L8 7 L11 2 L14 7 L18 4 L20 12 Z" fill="#b53a2b" stroke="#1f1d1a" stroke-width="0.8" stroke-linejoin="round"/>';
    return svg;
  }

  /* -------- Share -------- */
  function renderShare(isFinal) {
    const wrap = el('div', {});
    const code = N.encodeState(state);
    const url = location.origin + location.pathname + '#data=' + code;

    wrap.appendChild(el('div', { class: 'share-row' }, [
      el('button', {
        class: 'primary',
        onclick: async () => {
          try { await navigator.clipboard.writeText(url); toast('URLをコピーしました'); }
          catch (e) { toast('コピーに失敗'); }
        }
      }, 'URLをコピー'),
      el('button', {
        onclick: async () => {
          try { await navigator.clipboard.writeText(code); toast('コードをコピー'); }
          catch (e) { toast('コピーに失敗'); }
        }
      }, 'コードのみ'),
      isFinal ? el('button', {
        onclick: async () => {
          try { await navigator.clipboard.writeText(buildShareText()); toast('結果テキストをコピー'); }
          catch (e) { toast('コピーに失敗'); }
        }
      }, 'テキスト') : null,
    ].filter(Boolean)));

    wrap.appendChild(el('div', { class: 'code-box' }, '#data=' + code));
    return wrap;
  }
  function buildShareText() {
    const totals = N.totalScores(state);
    const ranked = state.players.map((n,i) => ({ n, s: totals[i] })).sort((a,b)=>b.s-a.s);
    let txt = '🃏 ナポレオン 最終結果\n';
    ranked.forEach((p, i) => {
      const pre = ['🥇','🥈','🥉','4.','5.'][i];
      const sc = p.s > 0 ? `+${p.s}` : String(p.s);
      txt += `${pre} ${p.n}  ${sc}\n`;
    });
    txt += `\n${state.games.length}ゲーム`;
    return txt;
  }

  /* -------- Boot -------- */
  function boot() {
    const hash = location.hash;
    if (hash && hash.length > 1) {
      const m = hash.match(/^#?(?:data=)?(.+)$/);
      if (m) {
        const decoded = N.decodeState(m[1]);
        if (decoded) {
          state = decoded;
          history.replaceState(null, '', location.pathname + location.search);
          render();
          return;
        }
      }
    }
    load();
    render();
  }

  // PWA: register service worker if available + supports
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  boot();
})();
