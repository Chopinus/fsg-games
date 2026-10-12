// Mensch ärgere dich nicht – 2 bis 4 Spieler
// Figur-Position: -1 = Haus, 0..39 = Schritte auf der Laufbahn ab eigenem Startfeld, 40..43 = Ziel
const COLORS = ['rot', 'blau', 'gruen', 'gelb'];
const COLORNAME = { rot: 'Rot', blau: 'Blau', gruen: 'Grün', gelb: 'Gelb' };
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';

function targetOf(s, seat, piece, d) {
  const pos = s.pieces[seat][piece], own = s.pieces[seat];
  if (pos === -1) return d === 6 && !own.includes(0) ? 0 : null;
  const t = pos + d;
  if (t > 43) return null;
  if (t >= 40) {
    for (let g = Math.max(pos + 1, 40); g <= t; g++) if (own.includes(g)) return null; // im Ziel nicht überspringen
    return t;
  }
  return own.includes(t) ? null : t;
}
function movable(s, seat, d) {
  const out = [];
  for (let i = 0; i < 4; i++) if (targetOf(s, seat, i, d) !== null) out.push(i);
  return out;
}
// Drei Würfe, wenn keine Figur auf der Laufbahn steht und alle Zielfiguren nicht mehr ziehen können
function threeTries(s, seat) {
  const pcs = s.pieces[seat];
  if (pcs.some(p => p >= 0 && p <= 39)) return false;
  const goal = pcs.filter(p => p >= 40).sort((a, b) => b - a);
  return goal.every((p, i) => p === 43 - i);
}
function nextSeat(s) {
  s.turn = (s.turn + 1) % s.seats.length; s.die = null; s.tries = 0;
}

module.exports = {
  title: 'Mensch ärgere dich nicht', min: 2, seats: 4,
  start(r) {
    const seats = r.players.slice(0, 4).map(p => p.id);
    // Farben gleichmäßig verteilen: bei 2 Spielern gegenüber
    const colorIdx = seats.length === 2 ? [0, 2] : seats.length === 3 ? [0, 1, 2] : [0, 1, 2, 3];
    r.state = {
      seats, colors: colorIdx.map(i => COLORS[i]), board: colorIdx,
      pieces: seats.map(() => [-1, -1, -1, -1]), turn: 0, die: null, tries: 0, winner: null,
      log: `${nameOf(r, seats[0])} beginnt. Würfle eine 6, um rauszukommen.`, rolledAt: 0,
    };
    r.status = 'playing';
  },
  onLeave(r, pid, name) {
    const s = r.state;
    if (!s) return;
    const i = s.seats.indexOf(pid);
    if (i < 0) return;
    s.seats.splice(i, 1); s.colors.splice(i, 1); s.board.splice(i, 1); s.pieces.splice(i, 1);
    if (r.status !== 'playing') return;
    if (i < s.turn) s.turn--;
    else if (i === s.turn) { s.die = null; s.tries = 0; }
    if (s.seats.length) s.turn %= s.seats.length;
    s.log = `${name} hat das Spiel verlassen.`;
    if (s.seats.length < 2) { r.status = 'ended'; s.winner = s.seats[0] || null; }
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return 'Das Spiel läuft gerade nicht.';
    const seat = s.seats.indexOf(pid);
    if (seat < 0) return 'Du schaust bei diesem Spiel zu.';
    if (seat !== s.turn) return 'Du bist gerade nicht dran.';
    const me = nameOf(r, pid);
    if (a.type === 'roll') {
      if (s.die !== null) return 'Du hast schon gewürfelt.';
      const d = 1 + Math.floor(Math.random() * 6);
      s.die = d; s.rolledAt = Date.now();
      const opts = movable(s, seat, d);
      if (opts.length) { s.log = `${me} würfelt eine ${d}.`; return; }
      if (threeTries(s, seat)) {
        s.tries++;
        if (s.tries < 3) { s.log = `${me} würfelt eine ${d} – noch ${3 - s.tries}× versuchen.`; s.lastDie = d; s.die = null; return; }
        s.log = `${me} würfelt eine ${d} – leider nichts. Nächster.`;
      } else s.log = `${me} würfelt eine ${d} und kann nicht ziehen.`;
      s.lastDie = d;
      nextSeat(s);
      return;
    }
    if (a.type === 'move') {
      if (s.die === null) return 'Erst würfeln.';
      const piece = Number(a.piece);
      const t = targetOf(s, seat, piece, s.die);
      if (t === null) return 'Mit dieser Figur geht das nicht.';
      s.pieces[seat][piece] = t;
      let msg = `${me} zieht ${s.die}`;
      if (t <= 39) {
        const abs = (s.board[seat] * 10 + t) % 40;
        s.pieces.forEach((pcs, o) => {
          if (o === seat) return;
          pcs.forEach((p, k) => {
            if (p >= 0 && p <= 39 && (s.board[o] * 10 + p) % 40 === abs) { pcs[k] = -1; msg += ` und wirft ${nameOf(r, s.seats[o])} raus`; }
          });
        });
      }
      s.lastDie = s.die;
      if (s.pieces[seat].every(p => p >= 40)) { s.winner = pid; r.status = 'ended'; s.log = `${me} hat alle Figuren im Ziel und gewinnt!`; return; }
      if (s.die === 6) { s.die = null; s.tries = 0; s.log = msg + ' – noch mal würfeln!'; return; }
      s.log = msg + '.';
      nextSeat(s);
    }
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const seat = s.seats.indexOf(pid);
    return {
      seats: s.seats, colors: s.colors, board: s.board, pieces: s.pieces, turn: s.seats[s.turn],
      die: s.die, lastDie: s.lastDie ?? null, tries: s.tries, winner: s.winner, log: s.log, mine: seat,
      movable: seat === s.turn && s.die !== null && r.status === 'playing' ? movable(s, seat, s.die) : [],
      targets: seat === s.turn && s.die !== null ? [0, 1, 2, 3].map(i => targetOf(s, seat, i, s.die)) : [],
    };
  },
  _test: { movable, targetOf },
};
