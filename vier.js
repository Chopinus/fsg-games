// Vier gewinnt – 7 Spalten, 6 Reihen
const W = 7, H = 6;
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';

function winLine(b, i) {
  const p = b[i], r0 = Math.floor(i / W), c0 = i % W;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [i];
    for (const sgn of [1, -1]) {
      let r = r0 + dr * sgn, c = c0 + dc * sgn;
      while (r >= 0 && r < H && c >= 0 && c < W && b[r * W + c] === p) { line.push(r * W + c); r += dr * sgn; c += dc * sgn; }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

module.exports = {
  title: 'Vier gewinnt', min: 2, seats: 2,
  start(r) {
    const old = r.state, ids = r.players.map(p => p.id);
    let a, b;
    if (old && ids.includes(old.p[0]) && ids.includes(old.p[1])) [a, b] = [old.p[1], old.p[0]];
    else [a, b] = ids.slice(0, 2).sort(() => Math.random() - 0.5);
    r.state = { p: [a, b], board: Array(W * H).fill(0), turn: 0, win: null, winner: null, last: null,
      score: old && old.score && old.p.includes(a) && old.p.includes(b) ? old.score : { [a]: 0, [b]: 0 },
      log: `${nameOf(r, a)} beginnt mit Rot.` };
    r.status = 'playing';
  },
  onLeave(r, pid, name) {
    const s = r.state;
    if (!s || r.status !== 'playing' || !s.p.includes(pid)) return;
    s.winner = s.p.find(x => x !== pid); s.log = `${name} hat das Spiel verlassen.`; r.status = 'ended';
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return 'Das Spiel läuft gerade nicht.';
    const me = s.p.indexOf(pid);
    if (me < 0) return 'Du schaust bei dieser Partie zu.';
    if (me !== s.turn) return 'Du bist gerade nicht dran.';
    const col = Number(a.col);
    if (!(col >= 0 && col < W)) return;
    let row = -1;
    for (let rr = H - 1; rr >= 0; rr--) if (!s.board[rr * W + col]) { row = rr; break; }
    if (row < 0) return 'Diese Spalte ist voll.';
    const i = row * W + col;
    s.board[i] = me + 1; s.last = i;
    const line = winLine(s.board, i);
    if (line) { s.win = line; s.winner = pid; s.score[pid] = (s.score[pid] || 0) + 1; s.log = `${nameOf(r, pid)} hat vier in einer Reihe!`; r.status = 'ended'; return; }
    if (s.board.every(Boolean)) { s.log = 'Das Brett ist voll – unentschieden.'; r.status = 'ended'; return; }
    s.turn = 1 - s.turn; s.log = `${nameOf(r, s.p[s.turn])} ist dran.`;
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    return { p: s.p, board: s.board, turn: s.p[s.turn], mine: s.p.indexOf(pid), win: s.win, winner: s.winner, last: s.last, log: s.log, score: s.score };
  },
};
