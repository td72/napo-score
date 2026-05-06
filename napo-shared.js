// Shared logic for all Napoleon scoresheet variants.
// Score math, encode/decode, and a tiny render-helper. UI is variant-specific.

window.NAPO = (function () {
  const SET_LENGTH = 10;
  const SUITS = [
    { v: 'S', label: 'スペード', sym: '♠', cls: 'suit-spade' },
    { v: 'H', label: 'ハート', sym: '♥', cls: 'suit-heart' },
    { v: 'D', label: 'ダイヤ', sym: '♦', cls: 'suit-diamond' },
    { v: 'C', label: 'クラブ', sym: '♣', cls: 'suit-club' },
    { v: 'N', label: 'ノートランプ', sym: '∅', cls: 'suit-no' },
  ];

  function effectiveMultiplier(g, gameIndex) {
    const userMult = g.multiplier || 1;
    const finalBonus = (gameIndex === SET_LENGTH - 1) ? 2 : 1;
    return userMult * finalBonus;
  }

  // Returns true if this entry is the "20取り負け" rule:
  // declaring less than 20 but taking all 20 tricks → automatic loss.
  function isAllTakenLoss(g) {
    return g.taken >= 20 && g.declared < 20;
  }

  function calcScores(g, gameIndex) {
    const scores = [0, 0, 0, 0, 0];
    const mult = effectiveMultiplier(g, gameIndex);
    const base = Math.max(1, g.declared - 12) * mult;
    const won = g.taken >= g.declared && !isAllTakenLoss(g);
    const sign = won ? 1 : -1;
    const napIdx = g.napoleon;
    const aideIdx = (g.aide === '' || g.aide === null || g.aide === undefined || g.aide === napIdx) ? -1 : g.aide;
    if (aideIdx === -1) {
      scores[napIdx] = sign * base * 4;
      for (let i = 0; i < 5; i++) if (i !== napIdx) scores[i] = -sign * base;
    } else {
      scores[napIdx] = sign * base * 2;
      scores[aideIdx] = sign * base;
      for (let i = 0; i < 5; i++) if (i !== napIdx && i !== aideIdx) scores[i] = -sign * base;
    }
    return scores;
  }

  function totalScores(state) {
    const t = [0, 0, 0, 0, 0];
    state.games.forEach(g => g.scores.forEach((s, i) => t[i] += s));
    return t;
  }

  function encodeState(state) {
    const players = state.players.join('|');
    const games = state.games.map(g => {
      const aide = g.aide === -1 ? 'X' : g.aide;
      const m = g.multiplier || 1;
      return `${g.napoleon},${aide},${g.suit},${g.declared},${g.taken},${m}`;
    }).join(';');
    const raw = `${players}~${games}`;
    return btoa(unescape(encodeURIComponent(raw)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeState(hash) {
    try {
      let b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const raw = decodeURIComponent(escape(atob(b64)));
      const [pp, gg] = raw.split('~');
      const players = pp.split('|');
      if (players.length !== 5) throw new Error('player count');
      const games = (gg || '').split(';').filter(Boolean).map((s, idx) => {
        const [n, a, suit, d, t, m] = s.split(',');
        const g = {
          napoleon: parseInt(n, 10),
          aide: a === 'X' ? -1 : parseInt(a, 10),
          suit,
          declared: parseInt(d, 10),
          taken: parseInt(t, 10),
          multiplier: m ? parseInt(m, 10) : 1,
        };
        g.scores = calcScores(g, idx);
        return g;
      });
      return { players, games, started: true };
    } catch (e) { return null; }
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // Sample state factory — gives the variants something to render at first paint.
  function sampleState() {
    const players = ['ユウキ', 'ナオ', 'ミサキ', 'タカ', 'ジン'];
    const raw = [
      { napoleon: 0, aide: 2, suit: 'S', declared: 13, taken: 14, multiplier: 1 },
      { napoleon: 1, aide: -1, suit: 'H', declared: 14, taken: 12, multiplier: 1 },
      { napoleon: 3, aide: 0, suit: 'D', declared: 15, taken: 15, multiplier: 2 },
      { napoleon: 2, aide: 4, suit: 'N', declared: 16, taken: 17, multiplier: 1 },
    ];
    const games = raw.map((g, i) => Object.assign({}, g, { scores: calcScores(g, i) }));
    return { players, games, started: true };
  }

  // Pending entry the entry form binds to. Variant-local copies are fine; we expose
  // the default so each variant can clone it.
  function freshPending() {
    return { napoleon: 0, aide: -1, suit: 'S', declared: 13, taken: 13, multiplier: 1 };
  }

  return {
    SET_LENGTH, SUITS,
    effectiveMultiplier, calcScores, totalScores, isAllTakenLoss,
    encodeState, decodeState,
    clamp, sampleState, freshPending,
  };
})();
