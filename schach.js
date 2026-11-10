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


/* ================= Schachbot (Spieler-Idee) ================= */
// Kleine Schach-KI: Alpha-Beta-Suche mit Ruhesuche. Die Stufe bestimmt Suchtiefe und wie oft der Bot „patzt“.
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const BOT_LV = [null,
  { name: 'Anfänger', depth: 1, noise: 220, rnd: 0.35 },
  { name: 'Leicht', depth: 1, noise: 60, rnd: 0 },
  { name: 'Mittel', depth: 2, noise: 20, rnd: 0 },
  { name: 'Schwer', depth: 3, noise: 0, rnd: 0 },
  { name: 'Meister', depth: 4, noise: 0, rnd: 0 },
];
function evalW(b) { // Bewertung aus Sicht von Weiß (Hundertstel-Bauern)
  let sc = 0, mat = 0;
  for (let sq = 0; sq < 64; sq++) { const p = b[sq]; if (p && p[1] !== 'K' && p[1] !== 'P') mat += VAL[p[1]]; }
  const end = mat <= 2600;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; if (!p) continue;
    const r = sq >> 3, c = sq & 7, t = p[1], w = p[0] === 'w', cen = Math.abs(3.5 - r) + Math.abs(3.5 - c);
    let v = VAL[t];
    if (t === 'P') { const adv = w ? 6 - r : r - 1; v += adv * (end ? 18 : 7) + (c >= 2 && c <= 5 ? 6 : 0) + (adv >= 2 && (c === 3 || c === 4) ? 12 : 0); }
    else if (t === 'N') v += 24 - cen * 7;
    else if (t === 'B') v += 14 - cen * 3;
    else if (t === 'R') v += (w ? r === 1 : r === 6) ? 18 : 0;
    else if (t === 'Q') v += 6 - cen;
    else if (t === 'K') v += end ? 20 - cen * 6 : ((w ? r === 7 : r === 0) && (c <= 2 || c >= 6) ? 22 : 0) - ((w ? 7 - r : r) * 10);
    sc += w ? v : -v;
  }
  return sc;
}
const evalS = s => (s.turn === 'w' ? 1 : -1) * evalW(s.board);
// alle legalen Züge inkl. Umwandlungsfigur
function allMoves(s) { const out = []; for (const m of legal(s)) { if (m.promo) for (const pr of 'QNRB') out.push({ ...m, pr }); else out.push(m); } return out; }
const isCap = (s, m) => !!(s.board[m.t] || m.ep);
const ordKey = (s, m) => (m.pr === 'Q' ? 800 : 0) + (isCap(s, m) ? 10 * VAL[(s.board[m.t] || 'xP')[1]] - VAL[s.board[m.f][1]] / 10 + 1000 : 0);
const MATE = 100000;
function search(s, depth, alpha, beta, ply, ctx) {
  if (++ctx.nodes > ctx.max || Date.now() > ctx.until) throw ctx;
  const ms = allMoves(s);
  if (!ms.length) return inCheck(s, s.turn) ? -MATE + ply : 0;
  if (depth <= 0) return quies(s, alpha, beta, 0, ctx);
  ms.sort((a, b) => ordKey(s, b) - ordKey(s, a));
  for (const m of ms) {
    const v = -search(apply(s, m, m.pr), depth - 1, -beta, -alpha, ply + 1, ctx);
    if (v >= beta) return v; if (v > alpha) alpha = v;
  }
  return alpha;
}
function quies(s, alpha, beta, qd, ctx) {
  if (++ctx.nodes > ctx.max || Date.now() > ctx.until) throw ctx;
  const stand = evalS(s); if (stand >= beta) return stand; if (stand > alpha) alpha = stand;
  if (qd >= 4) return alpha;
  const caps = legal(s).filter(m => isCap(s, m) || m.promo).sort((a, b) => ordKey(s, b) - ordKey(s, a));
  for (const m of caps) { const v = -quies(apply(s, m, 'Q'), -beta, -alpha, qd + 1, ctx); if (v >= beta) return v; if (v > alpha) alpha = v; }
  return alpha;
}
// bester Zug für die Seite am Zug; Stufe 1–5
function botMove(s, lv) {
  const L = BOT_LV[lv] || BOT_LV[3], ms = allMoves(s).filter(m => !m.pr || m.pr === 'Q' || m.pr === 'N');
  if (!ms.length) return null;
  if (L.rnd && Math.random() < L.rnd) return ms[Math.floor(Math.random() * ms.length)];
  const ctx = { nodes: 0, max: 400000, until: Date.now() + (lv >= 5 ? 2500 : 1500) };
  let scored = ms.map(m => ({ m, v: 0 }));
  for (let d = 1; d <= L.depth; d++) {
    try {
      const res = []; let alpha = -MATE * 2;
      const order = scored.slice().sort((a, b) => b.v - a.v);
      for (const { m } of order) { const v = -search(apply(s, m, m.pr), d - 1, -MATE * 2, -alpha + (L.noise ? L.noise : 0) + 1, 1, ctx); res.push({ m, v }); if (v > alpha) alpha = v; }
      scored = res;
    } catch (e) { if (e !== ctx) throw e; break; } // Zeit um: Ergebnis der letzten fertigen Tiefe nehmen
  }
  let best = null, bv = -Infinity;
  for (const x of scored) { const v = x.v + (L.noise ? (Math.random() * 2 - 1) * L.noise : 0); if (v > bv) { bv = v; best = x.m; } }
  return best;
}
// Matt in n erzwingbar? Liefert die Züge, die das schaffen (any = beim ersten Treffer aufhören)
function mateMoves(s, n, any) {
  const out = [];
  for (const m of allMoves(s)) {
    const ns = apply(s, m, m.pr);
    if (n <= 1) { if (inCheck(ns, ns.turn) && !legal(ns).length) out.push(m); }
    else {
      const rep = allMoves(ns);
      if (!rep.length) { if (inCheck(ns, ns.turn)) out.push(m); }
      else if (rep.every(r => mateMoves(apply(ns, r, r.pr), n - 1, true).length)) out.push(m);
    }
    if (any && out.length) return out;
  }
  return out;
}
/* ---------- FEN (für die Rätsel) ---------- */
const FEN_P = { p: 'bP', n: 'bN', b: 'bB', r: 'bR', q: 'bQ', k: 'bK', P: 'wP', N: 'wN', B: 'wB', R: 'wR', Q: 'wQ', K: 'wK' };
function fromFen(f) {
  const [pos, turn, cas, ep] = f.split(' '), board = [];
  for (const ch of pos.replace(/\//g, '')) { if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) board.push(null); else board.push(FEN_P[ch]); }
  const epSq = ep && ep !== '-' ? FILES.indexOf(ep[0]) + (8 - +ep[1]) * 8 : null;
  return { board, turn, castle: { wK: cas.includes('K'), wQ: cas.includes('Q'), bK: cas.includes('k'), bQ: cas.includes('q') }, ep: epSq };
}
function toFen(s) {
  let out = '';
  for (let r = 0; r < 8; r++) { let e = 0; for (let c = 0; c < 8; c++) { const p = s.board[r * 8 + c]; if (!p) { e++; continue; } if (e) { out += e; e = 0; } const ch = p[1]; out += p[0] === 'w' ? ch : ch.toLowerCase(); } if (e) out += e; if (r < 7) out += '/'; }
  const cas = (s.castle.wK ? 'K' : '') + (s.castle.wQ ? 'Q' : '') + (s.castle.bK ? 'k' : '') + (s.castle.bQ ? 'q' : '') || '-';
  return `${out} ${s.turn} ${cas} ${s.ep != null ? sqName(s.ep) : '-'}`;
}

// Rätsel des Tages: [FEN, Matt in n]. Automatisch aus Bot-Partien erzeugt und mit mateMoves geprüft (genau ein Schlüsselzug).
const PUZZLES = [
  ["3k1b2/8/6P1/1pq4p/P2r3P/2p5/2P2P2/1K3Q1R b - -", 2],
  ["r1b1kb2/1p3p1r/7p/p1p2Pp1/P3n1P1/1P2P1q1/2PP2BR/R1BQ2K1 b q -", 2],
  ["rnbqkbr1/3pp3/2p2p2/pp4P1/3P1P1p/1PN5/P1P4P/R1BQKB1R w KQq -", 2],
  ["3k4/6R1/8/1rp1r3/4p3/8/R5K1/8 w - -", 2],
  ["k7/1p3P2/1P6/P7/8/5K2/4r2P/1q5R w - -", 2],
  ["3k4/3P3R/8/1p1qP3/1P1P4/8/3B2r1/4QK2 b - -", 2],
  ["r2q1rk1/1pp4p/4R3/pP1p1p2/P3nPb1/2P5/3BP3/RN1QK3 b Q -", 2],
  ["5K2/r7/2P2k2/pN1R1p2/4p2p/1B5n/5P1P/8 b - -", 2],
  ["8/7k/1pR5/p2p4/PP1p4/3n4/7r/3KR3 w - -", 2],
  ["rnbq1bn1/2pk2p1/1p1pp3/p3PQp1/P1PP4/2K4B/1P3P1P/2R3NR w - -", 2],
  ["4kr2/1p2p1p1/1qp2p2/p2p1P1p/Pn3r1P/RPN1B3/4P1P1/3Q1BKR b - -", 2],
  ["4r1k1/p7/P1R1b1p1/1r1pb1Pp/Q3P2P/2PP1p2/5P2/6KR b - -", 2],
  ["2b1kb1r/4p1p1/n1p1P3/pp4Nn/1P2p3/2P5/P2P1p1P/RNB1R2K b - -", 2],
  ["r1bqk1Br/p1pp3p/1pn5/4p1p1/4N3/4b3/PPP2PPP/R2Q1KNR w kq -", 2],
  ["r1b1kb1r/pp3pp1/3q1n2/2pp3P/Pn6/3Pp2P/2PB4/RN1QKBNR b Qkq -", 2],
  ["r2q1bn1/Np1bn1r1/4p3/2QpNp1p/1P1P1k1P/5P2/P1P1K1P1/1R3B1R w - -", 2],
  ["q5r1/r1pnkpp1/2P5/n3p2Q/7P/2P1B3/P3BPP1/2KR3R w - -", 2],
  ["r1b1k2r/ppp2p1p/6pb/4p3/1KPn3q/P2PnP2/RP2P1PP/2BQ1BNR b kq -", 2],
  ["1rk1r3/5R1R/2n5/2p1p2P/2P2p2/P1P2P2/1B6/2K5 w - -", 2],
  ["5r2/3r1kp1/3p4/p1pN3p/2P1Qp2/bP3N2/3P1P2/6K1 w - -", 2],
  ["1r1qkb1r/1ppb1ppp/8/p3p3/4nP2/P1P4P/1P2P1P1/R1BQKBNR b KQk -", 2],
  ["r1b2br1/ppq1p1pp/n1p1k3/3nN2P/1P1P1p2/PQ6/3NPPP1/R1B1KB1R w KQ -", 2],
  ["4k3/2p1P1R1/2P2pK1/p4P2/1r2B3/8/8/8 w - -", 2],
  ["4r3/8/1k5N/p2P4/6N1/1q3P2/1P1R4/2K5 b - -", 2],
  ["r1bqkbr1/1ppnp3/p6p/3N3p/1B2P3/8/PPP1BPPP/R3K1NR w KQq -", 2],
  ["2kr3r/p1p2ppp/b4n2/3p1q2/Nb5P/1P1QP3/P3K1P1/R4BNR b - -", 2],
  ["8/6P1/8/3b2P1/5k2/2B4K/4r3/8 b - -", 2],
  ["1n3b2/8/7r/1P4pp/4P1kP/7R/2K1N3/2B5 w - -", 2],
  ["8/2B5/8/8/4k3/4qb1Q/7K/8 b - -", 2],
  ["3qk3/7r/2R2p2/1p2p1p1/4P1QP/P5P1/1r6/4K1R1 b - -", 2],
  ["5r2/3R4/1k4pp/p2QPp2/1p5P/5P2/PKP5/5q2 w - f6", 2],
  ["1Q5r/2rkbpp1/B2p1n2/3Pp1Bp/P1n1P2P/5N2/q4PP1/2R2RK1 w - -", 2],
  ["3Q4/1qp2k1p/7b/pP1N1p2/2r5/6P1/1RP4P/6K1 w - -", 2],
  ["3qkbnr/p4ppp/8/1rPR4/1P2p1P1/4Pn2/2P2PKP/1NBQ1R2 w k -", 2],
  ["1r3k2/p3ppb1/4b1p1/1Q1B4/8/4P3/3K1p1r/2R5 w - -", 2],
  ["r3k2r/p4p1p/1qp1p3/3pP1p1/P5P1/1PpnPQ1P/N4P2/1K1R2NR b kq -", 2],
  ["2b4r/6p1/4pnBk/5P1p/P1r5/4b1pP/3BK1P1/R4R2 w - -", 2],
  ["8/r7/p2R3P/P1p1k3/2P2p1r/8/3RK3/8 w - -", 2],
  ["r1b1kb1r/4p2p/p3P3/Pp1p1pN1/nq1P4/8/2QN1PPP/R1B1K2R w KQkq b6", 2],
  ["r4br1/pp1qpkp1/4p2p/BP1p4/1P1P4/3Q1N2/2P2PPP/R3K2R w KQ -", 2],
  ["4r1k1/1p1Q1p2/7p/pPp3p1/P2pnqP1/1P2p2P/6K1/R4BR1 b - -", 2],
  ["rn1k1br1/2N2Qpp/p3p3/1pP5/P4P1P/6P1/4N3/n2K4 w - -", 2],
  ["3Q3q/5krn/3p2p1/1B3pP1/5P1p/2N1p2P/2P5/2K4R w - -", 2],
  ["4kn2/1P3p1p/5Bp1/2P5/1p4rP/3B1pPb/5q2/2K4Q w - -", 2],
  ["r1bq1bnr/3np1p1/pp6/2PN2kp/8/3QP2p/PPP1NP2/R1B1KB1R w Q -", 2],
  ["7r/k4pp1/1R6/6p1/r4P2/8/3P2K1/2Q5 w - -", 2],
  ["6k1/1P2R3/q7/8/5K2/8/5N2/8 w - -", 2],
  ["8/3Qk3/8/4p1p1/4p1P1/4P3/2p4r/4K3 b - -", 2],
  ["2b1kbnr/5p2/1p2p1p1/1q2p1Pp/4P3/7P/P2R4/1RBQK3 w k -", 2],
];
const puzDay = () => Math.floor((Date.now() + 3600e3) / 864e5); // Tageswechsel nach deutscher Zeit (grob)

// Einen Zug ausführen (Mensch oder Bot) und prüfen, ob die Partie vorbei ist
function doMove(r, col, m, promo, who) {
  const s = r.state, moved = s.board[m.f];
  const n = apply(s, m, promo);
  s.board = n.board; s.castle = n.castle; s.ep = n.ep; s.turn = n.turn;
  if (n.captured) s.taken[col].push(n.captured);
  s.quiet = n.captured || moved[1] === 'P' ? 0 : s.quiet + 1;
  s.last = [m.f, m.t];
  let msg = m.castle ? `${who} rochiert` : `${who}: ${PIECE[moved[1]]} ${sqName(m.f)}–${sqName(m.t)}`;
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
}
// Ist der Bot dran, zieht er nach kurzer Denkpause
function botSoon(r) {
  const s = r.state; if (!s || !s.bot || r.status !== 'playing' || s.turn !== s.bot.col) return;
  const gen = s.gen;
  setTimeout(() => {
    const t = r.state; if (t !== s || t.gen !== gen || r.status !== 'playing' || t.turn !== t.bot.col) return;
    try {
      const mv = botMove(t, t.bot.lv); if (!mv) return;
      doMove(r, t.bot.col, mv, mv.pr || 'Q', t.puz ? 'Rätsel-Bot' : 'Schachbot');
      if (r.status === 'ended' && t.puz) t.puz.fail = true;
    } catch (e) { console.error(e); }
    if (r.push) r.push();
  }, s.puz ? 700 : 450 + Math.floor(Math.random() * 500));
}

module.exports = {
  title: 'Schach', min: 2, seats: 2,
  // Gegen den Bot oder das Rätsel des Tages reicht ein Spieler
  solo: (r, m) => !!(m && (m.bot || m.puz)),
  start(r, m) {
    m = m || {};
    const old = r.state, ids = r.players.map(p => p.id), gen = ((old && old.gen) || 0) + 1;
    const base = { board: START.slice(), castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: null, turn: 'w', last: null, result: null, taken: { w: [], b: [] }, quiet: 0, gen, bot: null, puz: null };
    if (m.puz && PUZZLES.length) { // Rätsel des Tages: der Gastgeber spielt die Seite am Zug, der Bot verteidigt
      const day = puzDay(), k = day % PUZZLES.length, [fen, n] = PUZZLES[k], f = fromFen(fen), me = f.turn, bc = other(me);
      r.state = { ...base, ...f, w: me === 'w' ? r.host : 'bot', b: me === 'b' ? r.host : 'bot', bot: { col: bc, lv: 4 }, puz: { day, nr: k + 1, n, left: n } };
      r.state.log = `Rätsel des Tages Nr. ${k + 1}: ${me === 'w' ? 'Weiß' : 'Schwarz'} am Zug setzt in ${n} Zügen matt.`;
      r.status = 'playing'; return;
    }
    if (m.bot) { // gegen den Schachbot
      const lv = Math.max(1, Math.min(5, Math.floor(Number(m.bot)) || 3));
      const hc = old && old.bot && !old.puz && (old.w === r.host || old.b === r.host) ? (old.w === r.host ? 'b' : 'w') : Math.random() < 0.5 ? 'w' : 'b';
      r.state = { ...base, w: hc === 'w' ? r.host : 'bot', b: hc === 'b' ? r.host : 'bot', bot: { col: other(hc), lv } };
      r.state.log = `${nameOf(r, r.host)} spielt ${hc === 'w' ? 'Weiß und beginnt' : 'Schwarz'} gegen den Schachbot (${BOT_LV[lv].name}).`;
      r.status = 'playing'; botSoon(r); return;
    }
    let w, b;
    if (old && !old.bot && ids.includes(old.w) && ids.includes(old.b)) { w = old.b; b = old.w; } // Farben tauschen
    else { const two = ids.slice(0, 2).sort(() => Math.random() - 0.5); [w, b] = two; }
    r.state = { ...base, w, b, log: `${nameOf(r, w)} spielt Weiß und beginnt.` };
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
      s.result = { winner: other(col), reason: s.puz ? 'Rätsel aufgegeben' : `${nameOf(r, pid)} hat aufgegeben` };
      r.status = 'ended'; return;
    }
    if (a.type !== 'move') return;
    if (s.turn !== col) return 'Du bist gerade nicht dran.';
    const m = legal(s).find(m => m.f === a.f && m.t === a.t);
    if (!m) return 'Dieser Zug ist nicht erlaubt.';
    const promo = 'QRBN'.includes(a.promo) && a.promo ? a.promo : 'Q';
    doMove(r, col, m, promo, nameOf(r, pid));
    if (r.status === 'playing' && s.puz) { // Rätsel: führt der Zug noch zum Matt in den übrigen Zügen?
      s.puz.left--;
      const ok = s.puz.left > 0 && allMoves(s).every(x => mateMoves(apply(s, x, x.pr), s.puz.left, true).length);
      if (!ok) { r.status = 'ended'; s.puz.fail = true; s.result = { winner: other(col), reason: 'Das war leider nicht der richtige Zug – versuch es nochmal!' }; return; }
    }
    if (r.status === 'ended' && s.puz && s.result && s.result.winner === col) { s.puz.solved = true; s.result.reason = 'Schachmatt – Rätsel gelöst! 🎉'; }
    botSoon(r);
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const mine = pid === s.w ? 'w' : pid === s.b ? 'b' : null;
    const moves = r.status === 'playing' && mine === s.turn ? legal(s).map(m => [m.f, m.t, m.promo ? 1 : 0]) : [];
    const nm = id => (id === 'bot' ? (s.puz ? 'Rätsel-Bot' : `Schachbot · ${BOT_LV[s.bot.lv].name}`) : nameOf(r, id));
    return {
      board: s.board, turn: s.turn, mine, w: s.w, b: s.b, moves, last: s.last, log: s.log, names: { w: nm(s.w), b: nm(s.b) },
      check: r.status === 'playing' && inCheck(s, s.turn), result: s.result, taken: s.taken,
      bot: s.bot ? { col: s.bot.col, lv: s.bot.lv } : null, puz: s.puz ? { ...s.puz } : null, think: !!(s.bot && r.status === 'playing' && s.turn === s.bot.col),
    };
  },
  _test: { legal, apply, START, inCheck, botMove, mateMoves, fromFen, toFen, allMoves, evalW, PUZZLES },
};
