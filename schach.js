// Schach – vollständige Zugregeln inkl. Rochade, en passant, Umwandlung, Matt und Patt
// Feld-Index: 0 = a8 (oben links aus Weiß-Sicht), 63 = h1
const START = [
  'bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR',
  'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP',
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP',
  'wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR',
];
const rc = i => [i >> 3, i & 7];
const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const at = (r, c) => r * 8 + c;
const other = col => (col === 'w' ? 'b' : 'w');
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function attacked(b, sq, by) {
  const [r, c] = rc(sq);
  const pr = by === 'w' ? r + 1 : r - 1; // Bauer von `by` steht eine Reihe "hinter" dem Feld
  for (const dc of [-1, 1]) if (on(pr, c + dc) && b[at(pr, c + dc)] === by + 'P') return true;
  for (const [dr, dc] of KN) if (on(r + dr, c + dc) && b[at(r + dr, c + dc)] === by + 'N') return true;
  for (const [dr, dc] of KG) if (on(r + dr, c + dc) && b[at(r + dr, c + dc)] === by + 'K') return true;
  for (const [dirs, kinds] of [[DIAG, 'BQ'], [ORTH, 'RQ']]) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (on(rr, cc)) {
        const p = b[at(rr, cc)];
        if (p) { if (p[0] === by && kinds.includes(p[1])) return true; break; }
        rr += dr; cc += dc;
      }
    }
  }
  return false;
}

function pseudo(s, col) {
  const b = s.board, out = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p || p[0] !== col) continue;
    const [r, c] = rc(sq), t = p[1];
    const add = (to, extra = {}) => out.push({ f: sq, t: to, ...extra });
    if (t === 'P') {
      const d = col === 'w' ? -1 : 1, startR = col === 'w' ? 6 : 1, lastR = col === 'w' ? 0 : 7;
      if (on(r + d, c) && !b[at(r + d, c)]) {
        add(at(r + d, c), r + d === lastR ? { promo: true } : {});
        if (r === startR && !b[at(r + 2 * d, c)]) add(at(r + 2 * d, c), { double: true });
      }
      for (const dc of [-1, 1]) {
        if (!on(r + d, c + dc)) continue;
        const to = at(r + d, c + dc), q = b[to];
        if (q && q[0] !== col) add(to, r + d === lastR ? { promo: true } : {});
        else if (to === s.ep) add(to, { ep: true });
      }
    } else if (t === 'N' || t === 'K') {
      for (const [dr, dc] of t === 'N' ? KN : KG) {
        if (!on(r + dr, c + dc)) continue;
        const to = at(r + dr, c + dc), q = b[to];
        if (!q || q[0] !== col) add(to);
      }
      if (t === 'K') {
        const home = col === 'w' ? 7 : 0, opp = other(col);
        if (sq === at(home, 4) && !attacked(b, sq, opp)) {
          if (s.castle[col + 'K'] && b[at(home, 7)] === col + 'R' && !b[at(home, 5)] && !b[at(home, 6)]
            && !attacked(b, at(home, 5), opp) && !attacked(b, at(home, 6), opp)) add(at(home, 6), { castle: 'K' });
          if (s.castle[col + 'Q'] && b[at(home, 0)] === col + 'R' && !b[at(home, 1)] && !b[at(home, 2)] && !b[at(home, 3)]
            && !attacked(b, at(home, 3), opp) && !attacked(b, at(home, 2), opp)) add(at(home, 2), { castle: 'Q' });
        }
      }
    } else {
      const dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : [...DIAG, ...ORTH];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (on(rr, cc)) {
          const to = at(rr, cc), q = b[to];
          if (q) { if (q[0] !== col) add(to); break; }
          add(to); rr += dr; cc += dc;
        }
      }
    }
  }
  return out;
}

function apply(s, m, promo = 'Q') {
  const b = s.board.slice(), p = b[m.f], col = p[0];
  const captured = m.ep ? b[m.t + (col === 'w' ? 8 : -8)] : b[m.t];
  b[m.t] = m.promo ? col + promo : p; b[m.f] = null;
  if (m.ep) b[m.t + (col === 'w' ? 8 : -8)] = null;
  if (m.castle) {
    const home = col === 'w' ? 7 : 0;
    if (m.castle === 'K') { b[at(home, 5)] = b[at(home, 7)]; b[at(home, 7)] = null; }
    else { b[at(home, 3)] = b[at(home, 0)]; b[at(home, 0)] = null; }
  }
  const castle = { ...s.castle };
  if (p[1] === 'K') { castle[col + 'K'] = false; castle[col + 'Q'] = false; }
  for (const [sq, key] of [[63, 'wK'], [56, 'wQ'], [7, 'bK'], [0, 'bQ']]) if (m.f === sq || m.t === sq) castle[key] = false;
  return { board: b, castle, ep: m.double ? (m.f + m.t) / 2 : null, turn: other(col), captured };
}

function legal(s, col = s.turn) {
  return pseudo(s, col).filter(m => {
    const n = apply(s, m);
    const k = n.board.indexOf(col + 'K');
    return !attacked(n.board, k, other(col));
  });
}
function inCheck(s, col) { return attacked(s.board, s.board.indexOf(col + 'K'), other(col)); }
function insufficient(b) {
  const pcs = b.filter(Boolean).filter(p => p[1] !== 'K');
  return pcs.length === 0 || (pcs.length === 1 && 'BN'.includes(pcs[0][1]));
}
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
const FILES = 'abcdefgh';
const sqName = i => FILES[i & 7] + (8 - (i >> 3));
const PIECE = { K: 'König', Q: 'Dame', R: 'Turm', B: 'Läufer', N: 'Springer', P: 'Bauer' };

module.exports = {
  title: 'Schach', min: 2, seats: 2,
  start(r) {
    const old = r.state;
    let w, b;
    const ids = r.players.map(p => p.id);
    if (old && ids.includes(old.w) && ids.includes(old.b)) { w = old.b; b = old.w; } // Farben tauschen
    else { const two = ids.slice(0, 2).sort(() => Math.random() - 0.5); [w, b] = two; }
    r.state = { w, b, board: START.slice(), castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: null, turn: 'w',
      last: null, result: null, taken: { w: [], b: [] }, log: `${nameOf(r, w)} spielt Weiß und beginnt.`, quiet: 0 };
    r.status = 'playing';
  },
  onLeave(r, pid, name) {
    const s = r.state;
    if (!s || r.status !== 'playing' || (pid !== s.w && pid !== s.b)) return;
    const winner = pid === s.w ? 'b' : 'w';
    s.result = { winner, reason: `${name} hat das Spiel verlassen` };
    r.status = 'ended';
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return 'Das Spiel läuft gerade nicht.';
    const col = pid === s.w ? 'w' : pid === s.b ? 'b' : null;
    if (!col) return 'Du schaust bei dieser Partie zu.';
    if (a.type === 'resign') {
      s.result = { winner: other(col), reason: `${nameOf(r, pid)} hat aufgegeben` };
      r.status = 'ended'; return;
    }
    if (a.type !== 'move') return;
    if (s.turn !== col) return 'Du bist gerade nicht dran.';
    const m = legal(s).find(m => m.f === a.f && m.t === a.t);
    if (!m) return 'Dieser Zug ist nicht erlaubt.';
    const promo = 'QRBN'.includes(a.promo) && a.promo ? a.promo : 'Q';
    const moved = s.board[m.f];
    const n = apply(s, m, promo);
    s.board = n.board; s.castle = n.castle; s.ep = n.ep; s.turn = n.turn;
    if (n.captured) s.taken[col].push(n.captured);
    s.quiet = n.captured || moved[1] === 'P' ? 0 : s.quiet + 1;
    s.last = [m.f, m.t];
    let msg = m.castle ? `${nameOf(r, pid)} rochiert` : `${nameOf(r, pid)}: ${PIECE[moved[1]]} ${sqName(m.f)}–${sqName(m.t)}`;
    if (n.captured) msg += ` schlägt ${PIECE[n.captured[1]]}`;
    if (m.promo) msg += `, wird ${PIECE[promo]}`;
    const opp = s.turn, check = inCheck(s, opp), replies = legal(s, opp);
    if (!replies.length) {
      r.status = 'ended';
      s.result = check ? { winner: col, reason: 'Schachmatt' } : { winner: null, reason: 'Patt – unentschieden' };
    } else if (insufficient(s.board)) {
      r.status = 'ended'; s.result = { winner: null, reason: 'Zu wenig Material – unentschieden' };
    } else if (s.quiet >= 100) {
      r.status = 'ended'; s.result = { winner: null, reason: '50 Züge ohne Schlagen – unentschieden' };
    } else if (check) msg += ' – Schach!';
    s.log = msg;
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const mine = pid === s.w ? 'w' : pid === s.b ? 'b' : null;
    const moves = r.status === 'playing' && mine === s.turn ? legal(s).map(m => [m.f, m.t, m.promo ? 1 : 0]) : [];
    return {
      board: s.board, turn: s.turn, mine, w: s.w, b: s.b, moves, last: s.last, log: s.log,
      check: r.status === 'playing' && inCheck(s, s.turn), result: s.result, taken: s.taken,
    };
  },
  _test: { legal, apply, START, inCheck },
};
