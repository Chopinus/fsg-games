// Turnier: K.-o.-Turnierbaum in Vier gewinnt. Alle Partien einer Runde laufen gleichzeitig,
// die Sieger kommen weiter, bis ein Champion feststeht. Unentschieden = neue Partie mit getauschten Farben.
const SPEED = Number(process.env.FSG_SPEED) || 1;
const W = 7, H = 6, NEXT_MS = 6000;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
function winLine(b, i) {
  const p = b[i], r0 = Math.floor(i / W), c0 = i % W;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [i];
    for (const sg of [1, -1]) { let rr = r0 + dr * sg, cc = c0 + dc * sg; while (rr >= 0 && rr < H && cc >= 0 && cc < W && b[rr * W + cc] === p) { line.push(rr * W + cc); rr += dr * sg; cc += dc * sg; } }
    if (line.length >= 4) return line;
  }
  return null;
}
const newMatch = (a, b) => ({ p: [a, b], board: Array(W * H).fill(0), turn: 0, win: null, winner: b == null ? a : null, last: null, games: 0 });
function makeRound(ids) { const ms = []; for (let i = 0; i < ids.length; i += 2) ms.push(newMatch(ids[i], ids[i + 1] ?? null)); return ms; }
function advance(r) {
  const s = r.state, cur = s.rounds[s.rounds.length - 1];
  if (!cur.every(m => m.winner)) return;
  const win = cur.map(m => m.winner);
  if (win.length === 1) { s.champ = win[0]; s.phase = 'end'; r.status = 'ended'; return; }
  s.phase = 'break'; s.deadline = Date.now() + NEXT_MS;
  if (r.timer) clearTimeout(r.timer);
  r.timer = setTimeout(() => { r.timer = null; s.rounds.push(makeRound(win)); s.phase = 'play'; s.deadline = null; r.push(); }, NEXT_MS / SPEED);
}
const ROUND_NAMES = n => (n === 1 ? 'Finale' : n === 2 ? 'Halbfinale' : n === 4 ? 'Viertelfinale' : n === 8 ? 'Achtelfinale' : `Runde mit ${n * 2}`);

module.exports = {
  title: 'Vier-gewinnt-Turnier', min: 3, seats: 12,
  start(r) {
    if (r.timer) clearTimeout(r.timer);
    const ids = shuffle(r.players.map(p => p.id));
    // Turnierbaum auf 2er-Potenz auffüllen (Freilose)
    let size = 2; while (size < ids.length) size *= 2;
    const seeded = []; const byes = size - ids.length;
    for (let i = 0, k = 0; i < size / 2; i++) { seeded.push(ids[k++]); seeded.push(i < byes ? null : ids[k++]); }
    r.state = { part: ids, rounds: [makeRound(seeded)], phase: 'play', champ: null, deadline: null };
    r.status = 'playing';
    advance(r);
  },
  onLeave(r, pid, name) {
    const s = r.state; if (!s || r.status !== 'playing') return;
    for (const m of s.rounds[s.rounds.length - 1]) if (!m.winner && m.p.includes(pid)) { m.winner = m.p.find(x => x !== pid) ?? null; m.left = name; }
    advance(r);
  },
  act(r, pid, a) {
    const s = r.state; if (!s || r.status !== 'playing' || s.phase !== 'play' || a.type !== 'drop') return 'quiet';
    const m = s.rounds[s.rounds.length - 1].find(x => !x.winner && x.p.includes(pid)); if (!m) return 'quiet';
    const me = m.p.indexOf(pid); if (me !== m.turn) return 'Du bist gerade nicht dran.';
    const col = Number(a.col); if (!(col >= 0 && col < W)) return 'quiet';
    let row = -1; for (let rr = H - 1; rr >= 0; rr--) if (!m.board[rr * W + col]) { row = rr; break; }
    if (row < 0) return 'Diese Spalte ist voll.';
    const i = row * W + col; m.board[i] = me + 1; m.last = i;
    const line = winLine(m.board, i);
    if (line) { m.win = line; m.winner = pid; advance(r); return; }
    if (m.board.every(Boolean)) { m.games++; m.board = Array(W * H).fill(0); m.p.reverse(); m.turn = 0; m.last = null; m.draw = true; return; }
    m.turn = 1 - m.turn; m.draw = false;
  },
  winners(r) { const s = r.state; return s && s.champ ? [s.champ] : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    return { phase: s.phase, champ: s.champ, left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null, me: pid,
      names: Object.fromEntries(s.part.map(id => [id, nameOf(r, id)])),
      rounds: s.rounds.map(ms => ({ title: ROUND_NAMES(ms.length), ms: ms.map(m => ({ p: m.p, board: m.board, turn: m.turn, win: m.win, winner: m.winner, last: m.last, draw: !!m.draw, left: m.left || null })) })) };
  },
};
