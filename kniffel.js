// Kniffel – 5 Würfel, bis zu 3 Würfe pro Zug, 13 Felder auf dem Block.
const CATS = [
  ['1', 'Einser'], ['2', 'Zweier'], ['3', 'Dreier'], ['4', 'Vierer'], ['5', 'Fünfer'], ['6', 'Sechser'],
  ['p3', 'Dreierpasch'], ['p4', 'Viererpasch'], ['fh', 'Full House'], ['ks', 'Kleine Straße'], ['gs', 'Große Straße'], ['kn', 'Kniffel'], ['ch', 'Chance'],
];
const IDS = CATS.map(c => c[0]);
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const d6 = () => 1 + Math.floor(Math.random() * 6);

function points(cat, dice) {
  const cnt = [0, 0, 0, 0, 0, 0, 0]; dice.forEach(d => cnt[d]++);
  const sum = dice.reduce((a, b) => a + b, 0), max = Math.max(...cnt);
  const has = s => s.every(n => cnt[n]);
  switch (cat) {
    case 'p3': return max >= 3 ? sum : 0;
    case 'p4': return max >= 4 ? sum : 0;
    case 'fh': return cnt.includes(3) && cnt.includes(2) ? 25 : 0;
    case 'ks': return has([1, 2, 3, 4]) || has([2, 3, 4, 5]) || has([3, 4, 5, 6]) ? 30 : 0;
    case 'gs': return has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6]) ? 40 : 0;
    case 'kn': return max === 5 ? 50 : 0;
    case 'ch': return sum;
    default: { const n = Number(cat); return cnt[n] * n; }
  }
}
function totals(sheet) {
  const up = ['1', '2', '3', '4', '5', '6'].reduce((a, k) => a + (sheet[k] || 0), 0);
  const bonus = up >= 63 ? 35 : 0;
  const low = ['p3', 'p4', 'fh', 'ks', 'gs', 'kn', 'ch'].reduce((a, k) => a + (sheet[k] || 0), 0);
  return { up, bonus, low, total: up + bonus + low };
}
function nextTurn(r) {
  const s = r.state;
  s.dice = [0, 0, 0, 0, 0]; s.held = [false, false, false, false, false]; s.rolls = 0;
  if (s.order.every(id => IDS.every(k => s.sheet[id][k] != null))) {
    r.status = 'ended';
    const ranked = s.order.map(id => ({ id, t: totals(s.sheet[id]).total })).sort((a, b) => b.t - a.t);
    s.winner = ranked.length && (ranked.length < 2 || ranked[0].t > ranked[1].t) ? ranked[0].id : null;
    s.log = s.winner ? `${nameOf(r, s.winner)} gewinnt mit ${ranked[0].t} Punkten!` : 'Unentschieden!';
    return;
  }
  s.turn = (s.turn + 1) % s.order.length;
}

module.exports = {
  title: 'Kniffel', min: 1, seats: 6,
  start(r) {
    const order = shuffle(r.players.map(p => p.id)).slice(0, 6);
    r.state = { order, turn: 0, dice: [0, 0, 0, 0, 0], held: [false, false, false, false, false], rolls: 0, rollId: 0,
      sheet: Object.fromEntries(order.map(id => [id, {}])), log: `${nameOf(r, order[0])} beginnt.`, winner: null, last: null };
    r.status = 'playing';
  },
  onLeave(r, pid, name) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    const i = s.order.indexOf(pid); if (i < 0) return;
    const cur = i === s.turn;
    s.order.splice(i, 1);
    s.log = `${name} hat das Spiel verlassen.`;
    if (!s.order.length) { r.status = 'ended'; return; }
    if (i < s.turn) s.turn--;
    if (cur) { s.turn = (s.turn - 1 + s.order.length) % s.order.length; nextTurn(r); }
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    if (a.type === 'end') { if (r.host !== pid) return; r.status = 'ended'; s.log = 'Spiel beendet.'; return; }
    if (!s.order.includes(pid)) return 'Du schaust bei diesem Spiel zu.';
    if (s.order[s.turn] !== pid) return 'Du bist gerade nicht dran.';
    if (a.type === 'roll') {
      if (s.rolls >= 3) return 'Du hast schon dreimal gewürfelt. Trag jetzt etwas ein.';
      if (s.rolls === 0) s.held = [false, false, false, false, false];
      if (s.held.every(Boolean)) return 'Du hältst alle Würfel fest.';
      s.dice = s.dice.map((d, i) => (s.held[i] ? d : d6()));
      s.rolls++; s.rollId++;
      return;
    }
    if (a.type === 'hold') {
      const i = Number(a.i);
      if (!(i >= 0 && i < 5) || s.rolls === 0 || s.rolls >= 3) return 'quiet';
      s.held[i] = !s.held[i];
      return;
    }
    if (a.type === 'score') {
      const k = String(a.cat);
      if (!IDS.includes(k) || s.rolls === 0) return 'quiet';
      if (s.sheet[pid][k] != null) return 'Dieses Feld ist schon ausgefüllt.';
      const p = points(k, s.dice);
      s.sheet[pid][k] = p; s.last = { id: pid, cat: k };
      s.log = `${nameOf(r, pid)}: ${CATS.find(c => c[0] === k)[1]} · ${p} Punkte${k === 'kn' && p ? ' – KNIFFEL!' : ''}`;
      nextTurn(r);
      return;
    }
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const cur = s.order[s.turn];
    return {
      cats: CATS, order: s.order, turn: r.status === 'playing' ? cur : null, dice: s.dice, held: s.held, rolls: s.rolls, rollId: s.rollId,
      sheet: s.sheet, sums: Object.fromEntries(s.order.map(id => [id, totals(s.sheet[id])])),
      preview: r.status === 'playing' && cur === pid && s.rolls > 0 ? Object.fromEntries(IDS.filter(k => s.sheet[pid][k] == null).map(k => [k, points(k, s.dice)])) : null,
      mine: s.order.includes(pid), log: s.log, winner: s.winner, last: s.last,
    };
  },
  _test: { points, totals },
};
