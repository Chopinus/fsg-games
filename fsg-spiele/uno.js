// Letzte Karte – Ablegespiel nach Uno-Regeln
const COLORNAME = { r: 'Rot', y: 'Gelb', g: 'Grün', b: 'Blau' };
const SEATS = 8;
const cc = s => s[0], cv = s => s[1];

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function newDeck() {
  const d = []; let n = 0;
  for (const c of 'rygb') { d.push(c + '0' + n++); for (const v of '123456789SRD') { d.push(c + v + n++); d.push(c + v + n++); } }
  for (let i = 0; i < 4; i++) { d.push('wW' + n++); d.push('wF' + n++); }
  return shuffle(d);
}
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
const idx = (s, i) => { const n = s.seated.length; return ((i % n) + n) % n; };
const top = s => s.discard[s.discard.length - 1];
const canPlay = (s, card) => cc(card) === 'w' || cc(card) === s.color || cv(card) === cv(top(s));
function drawOne(s) {
  if (!s.deck.length && s.discard.length > 1) { const t = s.discard.pop(); s.deck = shuffle(s.discard); s.discard = [t]; }
  return s.deck.pop() || null;
}
function give(s, id, k) { for (let i = 0; i < k; i++) { const c = drawOne(s); if (c) s.hands[id].push(c); } }
function describe(card, color) {
  const v = cv(card);
  if (v === 'W') return `Farbwechsel → ${COLORNAME[color]}`;
  if (v === 'F') return `+4 → ${COLORNAME[color]}`;
  const nm = COLORNAME[cc(card)];
  return v === 'S' ? `${nm} Aussetzen` : v === 'R' ? `${nm} Richtungswechsel` : v === 'D' ? `${nm} +2` : `${nm} ${v}`;
}
function nextTurn(s) { s.turn = idx(s, s.turn + s.dir); s.drew = false; s.drawnId = null; }

module.exports = {
  title: 'Letzte Karte', min: 2, seats: SEATS,
  start(r) {
    const old = r.state;
    const s = {
      seated: r.players.slice(0, SEATS).map(p => p.id), round: (old?.round || 0) + 1,
      deck: newDeck(), discard: [], hands: {}, dir: 1, drew: false, drawnId: null, winner: null, flash: null,
    };
    s.seated.forEach(id => (s.hands[id] = []));
    for (let i = 0; i < 7; i++) s.seated.forEach(id => give(s, id, 1));
    let t; for (;;) { t = s.deck.pop(); if (/[0-9]/.test(cv(t))) break; s.deck.unshift(t); }
    s.discard = [t]; s.color = cc(t); s.turn = (s.round - 1) % s.seated.length;
    s.log = `Runde ${s.round} – ${nameOf(r, s.seated[s.turn])} fängt an.`;
    r.state = s; r.status = 'playing';
  },
  onJoin(r, pid, name) {
    const s = r.state;
    if (r.status !== 'playing' || s.seated.length >= SEATS) return;
    s.seated.push(pid); s.hands[pid] = []; give(s, pid, 7);
    s.log = `${name} steigt mit 7 Karten ein.`;
  },
  onLeave(r, pid, name) {
    const s = r.state;
    if (!s) return;
    const i = s.seated.indexOf(pid);
    if (i < 0) return;
    s.seated.splice(i, 1);
    s.deck = [...(s.hands[pid] || []), ...s.deck]; delete s.hands[pid];
    if (r.status !== 'playing') return;
    if (i < s.turn) s.turn--;
    else if (i === s.turn) { s.drew = false; s.drawnId = null; if (s.dir < 0) s.turn--; }
    if (s.seated.length) s.turn = idx(s, s.turn);
    s.log = `${name} hat die Runde verlassen.`;
    if (s.seated.length < 2) { r.status = 'ended'; s.winner = s.seated[0] || null; }
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return 'Das Spiel läuft gerade nicht.';
    const curId = s.seated[s.turn];
    if (a.type === 'skip') {
      if (r.host !== pid || curId === pid) return;
      s.log = `${nameOf(r, curId)} wurde übersprungen.`; nextTurn(s); return;
    }
    if (curId !== pid) return 'Du bist gerade nicht dran.';
    const me = nameOf(r, pid);
    if (a.type === 'draw') {
      if (s.drew) return;
      const c = drawOne(s);
      if (!c) { s.log = `${me} kann nicht ziehen und setzt aus.`; nextTurn(s); return; }
      s.hands[pid].push(c);
      if (canPlay(s, c)) { s.drew = true; s.drawnId = c; s.log = `${me} zieht eine Karte.`; }
      else { s.log = `${me} zieht eine Karte und passt.`; nextTurn(s); }
      return;
    }
    if (a.type === 'pass') { if (!s.drew) return; s.log = `${me} behält die Karte.`; nextTurn(s); return; }
    if (a.type === 'play') {
      const card = String(a.card || ''), hand = s.hands[pid];
      if (!hand.includes(card)) return;
      if (s.drew && card !== s.drawnId) return 'Du darfst nur die gezogene Karte legen.';
      if (!canPlay(s, card)) return 'Diese Karte passt nicht.';
      if (cc(card) === 'w' && !COLORNAME[a.color]) return 'Wähle eine Farbe.';
      hand.splice(hand.indexOf(card), 1); s.discard.push(card);
      s.color = cc(card) === 'w' ? a.color : cc(card);
      let msg = `${me} legt ${describe(card, s.color)}`;
      if (!hand.length) { r.status = 'ended'; s.winner = pid; s.drew = false; s.log = `${me} hat gewonnen!`; return; }
      if (hand.length === 1) s.flash = { id: pid, at: Date.now() };
      const n = s.seated.length, v = cv(card);
      let skip = false, pen = 0;
      if (v === 'R') { s.dir *= -1; if (n === 2) skip = true; }
      if (v === 'S') skip = true;
      if (v === 'D') { skip = true; pen = 2; }
      if (v === 'F') { skip = true; pen = 4; }
      const nxt = idx(s, s.turn + s.dir), nxtName = nameOf(r, s.seated[nxt]);
      if (pen) { give(s, s.seated[nxt], pen); msg += ` – ${nxtName} zieht ${pen}`; }
      else if (skip) msg += ` – ${nxtName} setzt aus`;
      s.turn = skip ? idx(s, nxt + s.dir) : nxt; s.drew = false; s.drawnId = null;
      s.log = msg + '.';
    }
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const curId = s.seated[s.turn];
    const myTurn = r.status === 'playing' && curId === pid;
    const order = { r: 0, y: 1, g: 2, b: 3, w: 4 };
    const hand = (s.hands[pid] || []).slice().sort((a, b) => order[cc(a)] - order[cc(b)] || (cv(a) < cv(b) ? -1 : 1));
    return {
      seated: s.seated.map(id => ({ id, count: (s.hands[id] || []).length })),
      hand, playable: myTurn ? hand.filter(c => canPlay(s, c) && (!s.drew || c === s.drawnId)) : [],
      top: top(s), color: s.color, dir: s.dir, turn: curId, deck: s.deck.length,
      drew: myTurn && s.drew, log: s.log, winner: s.winner, flash: s.flash, round: s.round,
    };
  },
  _test: { newDeck, canPlay },
};
