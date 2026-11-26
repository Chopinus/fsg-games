// Schiffe versenken: 10×10, Flotte 5-4-3-3-2. Treffer = nochmal schießen. Zu zweit oder gegen den Computer.
const SPEED = Number(process.env.FSG_SPEED) || 1;
const N = 10, FLEET = [5, 4, 3, 3, 2], BOT = 'bot';
const nameOf = (r, id) => (id === BOT ? 'Admiral Bot' : (r.players.find(p => p.id === id) || {}).name || 'Jemand');
function fleet() {
  for (;;) {
    const g = Array(N * N).fill(-1), ships = []; let ok = true;
    for (let si = 0; si < FLEET.length && ok; si++) {
      const L = FLEET[si]; let placed = false;
      for (let t = 0; t < 200 && !placed; t++) {
        const h = Math.random() < 0.5, x = Math.floor(Math.random() * (h ? N - L + 1 : N)), y = Math.floor(Math.random() * (h ? N : N - L + 1));
        const cells = []; for (let k = 0; k < L; k++) cells.push((y + (h ? 0 : k)) * N + x + (h ? k : 0));
        // Schiffe dürfen sich nicht berühren (auch nicht diagonal)
        if (cells.every(c => { const cx = c % N, cy = (c / N) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && g[ny * N + nx] >= 0) return false; } return true; })) {
          cells.forEach(c => (g[c] = si)); ships.push({ cells, h, L }); placed = true;
        }
      }
      if (!placed) ok = false;
    }
    if (ok) return { g, ships, shots: Array(N * N).fill(0) }; // shots: 0 = offen, 1 = Wasser, 2 = Treffer
  }
}
// Spieler-Idee (v65): Schiffe selbst platzieren. Prüft, ob Schiff si mit Anfang c und Ausrichtung h passt (ohne Berührung anderer Schiffe).
function shipCells(L, c, h) { const x = c % N, y = (c / N) | 0; if (h ? x + L > N : y + L > N) return null; const out = []; for (let k = 0; k < L; k++) out.push((y + (h ? 0 : k)) * N + x + (h ? k : 0)); return out; }
function place(b, si, c, h) {
  const sh = b.ships[si]; if (!sh) return 'quiet';
  const cells = shipCells(sh.L, c, h); if (!cells) return 'Das Schiff passt dort nicht aufs Feld.';
  for (const cc of cells) { const cx = cc % N, cy = (cc / N) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const o = b.g[ny * N + nx]; if (o >= 0 && o !== si) return 'Schiffe dürfen sich nicht berühren – auch nicht schräg.'; } }
  for (const cc of sh.cells) b.g[cc] = -1;
  sh.cells = cells; sh.h = h; for (const cc of cells) b.g[cc] = si;
}
const sunk = (b, si) => b.ships[si].cells.length > 0 && b.ships[si].cells.every(c => b.shots[c] === 2);
const allSunk = b => b.ships.every((_, i) => sunk(b, i));
function schedule(r, ms, fn) { if (r.timer) clearTimeout(r.timer); r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } r.push(); }, ms / SPEED); }
function fire(r, pid, c) {
  const s = r.state, foe = s.p[0] === pid ? s.p[1] : s.p[0], b = s.b[foe];
  if (b.shots[c]) return 'Da hast du schon hingeschossen.';
  const si = b.g[c]; b.shots[c] = si >= 0 ? 2 : 1; s.last = { by: pid, c, hit: si >= 0, sunk: si >= 0 && sunk(b, si) ? si : null };
  s.stats[pid].shots++; if (si >= 0) s.stats[pid].hits++;
  if (si >= 0 && sunk(b, si)) { // Felder rund um ein versenktes Schiff als Wasser markieren
    for (const cc of b.ships[si].cells) { const x = cc % N, y = (cc / N) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !b.shots[ny * N + nx]) b.shots[ny * N + nx] = 1; } }
  }
  if (allSunk(b)) { s.winner = pid; s.score[pid] = (s.score[pid] || 0) + 1; r.status = 'ended'; s.phase = 'end'; s.log = `${nameOf(r, pid)} hat die ganze Flotte versenkt!`; return; }
  if (si < 0) s.turn = foe;
  s.log = si < 0 ? `${nameOf(r, pid)}: Wasser.` : sunk(b, si) ? `${nameOf(r, pid)}: Treffer – versenkt! Nochmal.` : `${nameOf(r, pid)}: Treffer! Nochmal.`;
  if (s.turn === BOT && r.status === 'playing') schedule(r, 900 + Math.random() * 500, () => botMove(r));
}
function botMove(r) {
  const s = r.state; if (r.status !== 'playing' || s.turn !== BOT) return;
  const b = s.b[s.p[0] === BOT ? s.p[1] : s.p[0]], open = [];
  // Treffer auf noch nicht versenkten Schiffen weiterverfolgen
  const hits = []; for (let c = 0; c < N * N; c++) if (b.shots[c] === 2 && !sunk(b, b.g[c])) hits.push(c);
  if (hits.length) {
    const cand = new Set();
    const line = hits.length < 2 ? null : hits.every(h => ((h / N) | 0) === ((hits[0] / N) | 0)) ? 'h' : hits.every(h => h % N === hits[0] % N) ? 'v' : null;
    for (const h of hits) { const x = h % N, y = (h / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (line === 'h' && dy) continue; if (line === 'v' && dx) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !b.shots[ny * N + nx]) cand.add(ny * N + nx); } }
    open.push(...cand);
  }
  if (!open.length) for (let c = 0; c < N * N; c++) if (!b.shots[c] && ((c % N) + ((c / N) | 0)) % 2 === s.parity) open.push(c);
  if (!open.length) for (let c = 0; c < N * N; c++) if (!b.shots[c]) open.push(c);
  fire(r, BOT, open[Math.floor(Math.random() * open.length)]);
}

module.exports = {
  title: 'Schiffe versenken', min: 2, seats: 2,
  solo: (r, m) => !!(m && m.bot),
  start(r, m = {}) {
    if (r.timer) clearTimeout(r.timer);
    const old = r.state, ids = r.players.map(p => p.id);
    const p = m.bot ? [ids[0], BOT] : (old && old.p && old.p.every(x => ids.includes(x)) ? [old.p[1], old.p[0]] : ids.slice(0, 2));
    r.state = { p, b: { [p[0]]: fleet(), [p[1]]: fleet() }, ready: { [BOT]: true }, phase: 'place', turn: p[0], winner: null, last: null, log: 'Stellt eure Flotte auf.', score: old && old.score && !m.bot === !old.bot ? old.score : {}, bot: !!m.bot, parity: Math.random() < 0.5 ? 0 : 1, stats: { [p[0]]: { shots: 0, hits: 0 }, [p[1]]: { shots: 0, hits: 0 } } };
    r.status = 'playing';
  },
  onLeave(r, pid, name) { const s = r.state; if (!s || r.status !== 'playing' || !s.p.includes(pid)) return; if (r.timer) clearTimeout(r.timer); s.winner = s.p.find(x => x !== pid); s.phase = 'end'; s.log = `${name} hat das Spiel verlassen.`; r.status = 'ended'; },
  act(r, pid, a) {
    const s = r.state; if (!s || r.status !== 'playing') return 'quiet';
    if (!s.p.includes(pid)) return 'Du schaust bei dieser Partie zu.';
    if (s.phase === 'place') {
      if (a.type === 'shuffle' && !s.ready[pid]) { s.b[pid] = fleet(); return; }
      if (a.type === 'clear' && !s.ready[pid]) { const b = s.b[pid]; b.g.fill(-1); b.ships.forEach(sh => { sh.cells = []; }); return; }
      if (a.type === 'place' && !s.ready[pid]) { const c = Number(a.c), si = Number(a.si); if (!(c >= 0 && c < N * N) || !(si >= 0 && si < FLEET.length)) return 'quiet'; return place(s.b[pid], si, c, !!a.h); }
      if (a.type === 'ready' && s.b[pid].ships.some(sh => sh.cells.length !== sh.L)) return 'Stell zuerst alle Schiffe auf.';
      if (a.type === 'ready') { s.ready[pid] = true; if (s.p.every(x => s.ready[x])) { s.phase = 'play'; s.log = `${nameOf(r, s.turn)} schießt zuerst.`; if (s.turn === BOT) schedule(r, 1200, () => botMove(r)); } return; }
      return 'quiet';
    }
    if (a.type !== 'fire' || s.phase !== 'play') return 'quiet';
    if (s.turn !== pid) return 'Du bist gerade nicht dran.';
    const c = Number(a.c); if (!(c >= 0 && c < N * N)) return 'quiet';
    return fire(r, pid, c);
  },
  winners(r) { const s = r.state; return s && s.winner && s.winner !== BOT ? [s.winner] : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    const me = s.p.includes(pid) ? pid : s.p[0], foe = s.p[0] === me ? s.p[1] : s.p[0], end = s.phase === 'end';
    const pub = b => ({ shots: b.shots, sunk: b.ships.map((sh, i) => (sunk(b, i) ? sh.cells : null)).filter(Boolean), left: b.ships.map((sh, i) => (sunk(b, i) ? 0 : sh.L)) });
    return { phase: s.phase, p: s.p, names: { [s.p[0]]: nameOf(r, s.p[0]), [s.p[1]]: nameOf(r, s.p[1]) }, mine: s.p.includes(pid), me, foe, turn: s.turn, ready: s.ready, winner: s.winner, last: s.last, log: s.log, score: s.score, bot: s.bot, stats: s.stats,
      own: { ...pub(s.b[me]), g: s.b[me].g, ships: s.b[me].ships.map(x => ({ cells: x.cells, h: x.h, L: x.L })) },
      enemy: { ...pub(s.b[foe]), ships: end ? s.b[foe].ships.map(x => ({ cells: x.cells, h: x.h })) : null } };
  },
};
