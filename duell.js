// Kristallduell: Sammelkarten-Duell für 2 (oder gegen den Bot). Eigene Karten, siehe duell_karten.js.
// Ablauf eines Zuges: Kristalle auffüllen (+1 Maximum, höchstens 10), 1 Karte ziehen, Karten ausspielen,
// einmal angreifen (der Gegner wählt Blocker), danach weiter ausspielen, Zug beenden. Wer auf 0 Leben fällt, verliert.
const { C, DECKS, F } = require('./duell_karten.js');
const SPEED = Number(process.env.FSG_SPEED) || 1;
const BOT = 'bot', LIFE = 20, HAND_MAX = 10, BOARD_MAX = 6, TURN_MS = 90e3, BLOCK_MS = 30e3;
const has = (cr, k) => cr.kw.includes(k);
const nameOf = (r, id) => (id === BOT ? 'Kristall-Bot' : (r.players.find(p => p.id === id) || {}).name || 'Jemand');
const foeOf = (s, pid) => (s.p[0] === pid ? s.p[1] : s.p[0]);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function schedule(r, ms, fn) { if (r.timer) clearTimeout(r.timer); r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } sync(r); r.push(); }, ms / SPEED); }
function sync(r) { if (r.state && r.state.phase === 'end' && r.status === 'playing') { r.status = 'ended'; if (r.timer) { clearTimeout(r.timer); r.timer = null; } } }
function log(s, t) { s.log.push(t); if (s.log.length > 8) s.log.shift(); }
function fx(s, e) { e.q = ++s.seq; s.fx.push(e); if (s.fx.length > 40) s.fx.shift(); }
function mkCre(s, id, owner) { const c = C[id]; return { u: ++s.uc, id, o: owner, a: c.a, h: c.h, d: 0, kw: (c.kw || []).slice(), sick: !(c.kw || []).includes('eile'), tap: false, frz: false, shield: (c.kw || []).includes('schild') }; }
function findCre(s, u) { for (const pid of s.p) { const c = s.pl[pid].board.find(x => x.u === u); if (c) return c; } return null; }
const hpLeft = c => c.h - c.d;
const crVal = c => c.a + hpLeft(c) + c.kw.length * 1.2 + (c.shield ? 1 : 0);

function draw(s, pid, n = 1) {
  const P = s.pl[pid];
  for (let i = 0; i < n; i++) {
    if (!P.deck.length) { P.fat++; P.life -= P.fat; fx(s, { k: 'fat', p: pid, n: P.fat }); log(s, `${s.nm[pid]} hat keine Karten mehr und verliert ${P.fat} Leben.`); continue; }
    const id = P.deck.pop();
    if (P.hand.length >= HAND_MAX) { P.grave.push(id); fx(s, { k: 'burn', p: pid, id }); log(s, `${s.nm[pid]}s Hand ist voll – ${C[id].n} verbrennt.`); continue; }
    P.hand.push({ id, h: ++s.uc });
  }
}
function hitFace(s, pid, n, src) { if (n <= 0) return 0; s.pl[pid].life -= n; fx(s, { k: 'dmg', t: 'f:' + pid, n, src }); return n; }
function heal(s, pid, n) { if (n <= 0) return; const P = s.pl[pid]; const was = P.life; P.life = Math.min(LIFE + 10, P.life + n); if (P.life > was) fx(s, { k: 'heal', t: 'f:' + pid, n: P.life - was }); }
function hitCre(s, cr, n, src) { // src: angreifende Kreatur (für Gift/Lebensentzug) oder null
  if (n <= 0) return 0;
  if (cr.shield) { cr.shield = false; fx(s, { k: 'shield', t: 'u:' + cr.u }); return 0; }
  cr.d += n; fx(s, { k: 'dmg', t: 'u:' + cr.u, n });
  if (src && has(src, 'gift')) cr.dead = true;
  return n;
}
function cleanup(s) {
  for (const pid of s.p) {
    const P = s.pl[pid];
    P.board = P.board.filter(c => { if (c.d >= c.h || c.dead) { if (!C[c.id].tok) P.grave.push(c.id); P.lastDead = C[c.id].tok ? P.lastDead : c.id; fx(s, { k: 'die', t: 'u:' + c.u, id: c.id }); return false; } return true; });
  }
  const dead = s.p.filter(pid => s.pl[pid].life <= 0);
  if (dead.length && s.phase !== 'end') {
    s.winner = dead.length === 2 ? null : foeOf(s, dead[0]); s.draw = dead.length === 2; s.phase = 'end'; s.dl = 0;
    if (s.winner) s.score[s.winner] = (s.score[s.winner] || 0) + 1;
    log(s, s.draw ? 'Beide fallen gleichzeitig – unentschieden!' : `${s.nm[s.winner]} gewinnt das Duell!`);
    fx(s, { k: 'end' });
    return true;
  }
  return false;
}
// Ziel prüfen. tg: any | cre | ecre | own. t: 'f:<pid>' oder 'u:<uid>'
function validTarget(s, pid, tg, t) {
  if (typeof t !== 'string') return null;
  if (t.startsWith('f:')) { const who = t.slice(2); return tg === 'any' && s.p.includes(who) ? { face: who } : null; }
  const cr = findCre(s, Number(t.slice(2))); if (!cr) return null;
  if (tg === 'any' || tg === 'cre') return { cr };
  if (tg === 'ecre' && cr.o !== pid) return { cr };
  if (tg === 'own' && cr.o === pid) return { cr };
  return null;
}
function anyTarget(s, pid, tg) { if (tg === 'any') return true; return s.p.some(x => s.pl[x].board.some(c => (tg === 'cre') || (tg === 'ecre' && c.o !== pid) || (tg === 'own' && c.o === pid))); }

function applyEffect(s, pid, e, T, srcName) {
  const foe = foeOf(s, pid), P = s.pl[pid];
  switch (e.k) {
    case 'dmg': if (T.face) hitFace(s, T.face, e.n); else hitCre(s, T.cr, e.n, null); break;
    case 'face': hitFace(s, foe, e.n); break;
    case 'drain': hitFace(s, foe, e.n); heal(s, pid, e.n); break;
    case 'heal': heal(s, pid, e.n); break;
    case 'draw': if (e.self) { P.life -= e.self; fx(s, { k: 'dmg', t: 'f:' + pid, n: e.self }); } draw(s, pid, e.n); break;
    case 'kill': T.cr.dead = true; fx(s, { k: 'kill', t: 'u:' + T.cr.u }); break;
    case 'bounce': { const O = s.pl[T.cr.o]; O.board = O.board.filter(c => c !== T.cr); fx(s, { k: 'bounce', t: 'u:' + T.cr.u, id: T.cr.id });
      if (!C[T.cr.id].tok) { if (O.hand.length < HAND_MAX) O.hand.push({ id: T.cr.id, h: ++s.uc }); else O.grave.push(T.cr.id); } break; }
    case 'freeze': T.cr.tap = true; T.cr.frz = true; fx(s, { k: 'freeze', t: 'u:' + T.cr.u }); break;
    case 'freezeAll': for (const c of s.pl[foe].board) { c.tap = true; c.frz = true; fx(s, { k: 'freeze', t: 'u:' + c.u }); } break;
    case 'buff': T.cr.a += e.a; T.cr.h += e.h; if (e.shield) T.cr.shield = true; fx(s, { k: 'buff', t: 'u:' + T.cr.u, a: e.a, h: e.h }); break;
    case 'buffAll': for (const c of P.board) { c.a += e.a; c.h += e.h; fx(s, { k: 'buff', t: 'u:' + c.u, a: e.a, h: e.h }); } break;
    case 'dmgAll': for (const x of e.side === 'all' ? s.p : [foe]) for (const c of s.pl[x].board.slice()) hitCre(s, c, e.n, null); break;
    case 'token': for (let i = 0; i < e.n && P.board.length < BOARD_MAX; i++) { const c = mkCre(s, e.id, pid); P.board.push(c); fx(s, { k: 'summon', t: 'u:' + c.u }); } break;
    case 'ramp': P.mx = Math.min(10, P.mx + 1); P.cr = Math.min(10, P.cr + 1); fx(s, { k: 'ramp', p: pid }); break;
    case 'revive': {
      if (P.lastDead && P.board.length < BOARD_MAX) { const gi = P.grave.lastIndexOf(P.lastDead); if (gi >= 0) P.grave.splice(gi, 1); const c = mkCre(s, P.lastDead, pid); P.board.push(c); fx(s, { k: 'summon', t: 'u:' + c.u, rev: 1 }); log(s, `${C[c.id].n} kehrt zurück!`); P.lastDead = null; }
      else draw(s, pid, 1);
      break;
    }
  }
  if (e.draw && e.k !== 'draw') draw(s, pid, e.draw);
}

function play(s, pid, hi, tgt) {
  const P = s.pl[pid], card = P.hand[hi]; if (!card) return 'Diese Karte gibt es nicht.';
  const c = C[card.id];
  if (c.c > P.cr) return `Dafür brauchst du ${c.c} Kristalle.`;
  if (c.t === 'k' && P.board.length >= BOARD_MAX) return `Mehr als ${BOARD_MAX} Kreaturen passen nicht aufs Feld.`;
  let T = null;
  if (c.e && c.e.tg) {
    if (anyTarget(s, pid, c.e.tg)) { T = validTarget(s, pid, c.e.tg, tgt); if (!T) return 'Wähle ein gültiges Ziel.'; }
    else if (c.t === 'z') return 'Dafür gibt es gerade kein Ziel.';
  }
  P.cr -= c.c; P.hand.splice(hi, 1);
  fx(s, { k: 'play', p: pid, id: card.id, tgt: tgt || null });
  if (c.t === 'k') { const cr = mkCre(s, card.id, pid); P.board.push(cr); fx(s, { k: 'summon', t: 'u:' + cr.u }); log(s, `${s.nm[pid]} beschwört ${c.n}.`); }
  else { P.grave.push(card.id); log(s, `${s.nm[pid]} wirkt ${c.n}.`); }
  if (c.e && (!c.e.tg || T)) applyEffect(s, pid, c.e, T || {}, c.n);
  cleanup(s);
}
const canAttack = (c) => !c.tap && !c.sick && !has(c, 'mauer') && c.a > 0;
const canBlock = (b, a) => !b.tap && (!has(a, 'flug') || has(b, 'flug') || has(b, 'reich'));

function attack(r, pid, list) {
  const s = r.state, P = s.pl[pid];
  if (s.attacked) return 'Du hast in diesem Zug schon angegriffen.';
  const att = [...new Set(list.map(Number))].map(u => P.board.find(c => c.u === u)).filter(Boolean);
  if (!att.length) return 'Wähle zuerst Angreifer.';
  if (att.some(c => !canAttack(c))) return 'Eine dieser Kreaturen kann gerade nicht angreifen.';
  s.attacked = true; s.atk = att.map(c => c.u); s.blocks = {};
  for (const c of att) if (!has(c, 'wach')) c.tap = true;
  fx(s, { k: 'attack', us: s.atk.slice() });
  log(s, `${s.nm[pid]} greift mit ${att.length} Kreatur${att.length > 1 ? 'en' : ''} an!`);
  const foe = foeOf(s, pid);
  if (!s.pl[foe].board.some(b => att.some(a => canBlock(b, a)))) { resolve(r); return; }
  s.phase = 'block';
  if (foe === BOT) schedule(r, 1100, () => { botBlock(s); resolve(r); afterResolve(r); });
  else if (!s.bot) setTimer(r, BLOCK_MS, () => { resolve(r); afterResolve(r); });
}
function resolve(r) {
  const s = r.state, pid = s.turn, foe = foeOf(s, pid), F2 = s.pl[foe];
  const byAtt = {}; for (const [b, a] of Object.entries(s.blocks || {})) byAtt[a] = Number(b);
  for (const u of s.atk) {
    const A = findCre(s, u); if (!A || A.o !== pid) continue;
    const B = byAtt[u] != null ? F2.board.find(c => c.u === byAtt[u]) : null;
    if (B) {
      const room = hpLeft(B), hadShield = B.shield, aDmg = A.a, bDmg = B.a;
      fx(s, { k: 'hit', from: A.u, to: 'u:' + B.u });
      const dealt = hitCre(s, B, aDmg, A), back = hitCre(s, A, bDmg, B);
      if (has(A, 'durch') && !hadShield && aDmg > room) hitFace(s, foe, aDmg - room, A.u);
      if (has(A, 'saug')) heal(s, pid, dealt + (has(A, 'durch') && !hadShield ? Math.max(0, aDmg - room) : 0));
      if (has(B, 'saug')) heal(s, foe, back);
    } else {
      fx(s, { k: 'hit', from: A.u, to: 'f:' + foe });
      const n = hitFace(s, foe, A.a, A.u); if (has(A, 'saug')) heal(s, pid, n);
    }
  }
  s.atk = []; s.blocks = {};
  if (s.phase !== 'end') s.phase = 'main';
  cleanup(s);
}
function afterResolve(r) { const s = r.state; if (s.phase !== 'main') return; if (s.turn === BOT) schedule(r, 1000, () => botStep(r)); else if (!s.bot) setTimer(r, Math.max(15e3, s.turnEnd - Date.now()), () => endTurn(r)); }
function setTimer(r, ms, fn) { const s = r.state; s.dl = Date.now() + ms; schedule(r, ms, () => { s.dl = 0; fn(); }); }

function startTurn(r, pid) {
  const s = r.state, P = s.pl[pid];
  s.turn = pid; s.phase = 'main'; s.attacked = false; s.atk = []; s.blocks = {}; s.n++;
  P.mx = Math.min(10, P.mx + 1); P.cr = P.mx;
  for (const c of P.board) { c.sick = false; if (c.frz) c.frz = false; else c.tap = false; }
  if (!(s.n === 1)) draw(s, pid, 1);
  fx(s, { k: 'turn', p: pid });
  if (cleanup(s)) return;
  if (pid === BOT) schedule(r, 1300, () => botStep(r));
  else if (!s.bot) { s.turnEnd = Date.now() + TURN_MS; setTimer(r, TURN_MS, () => endTurn(r)); }
  else { s.dl = 0; if (r.timer) { clearTimeout(r.timer); r.timer = null; } }
}
function endTurn(r) {
  const s = r.state; if (s.phase === 'end') return;
  if (s.phase === 'block') resolve(r);
  if (s.phase === 'end') return;
  for (const pid of s.p) for (const c of s.pl[pid].board) c.d = 0; // Schaden heilt am Zugende
  startTurn(r, foeOf(s, s.turn));
}

/* ---------- Bot ---------- */
function botTargetFor(s, me, e) {
  const foe = foeOf(s, me), FB = s.pl[foe].board, MB = s.pl[me].board;
  const big = arr => arr.slice().sort((a, b) => crVal(b) - crVal(a))[0];
  switch (e.k) {
    case 'dmg': {
      const kill = FB.filter(c => !c.shield && hpLeft(c) <= e.n).sort((a, b) => crVal(b) - crVal(a))[0];
      if (e.tg === 'any' && s.pl[foe].life <= e.n) return 'f:' + foe;
      if (kill) return 'u:' + kill.u;
      if (e.tg === 'any' && (s.pl[foe].life <= 8 || !FB.length)) return 'f:' + foe;
      return e.tg === 'any' && e.n <= 2 ? 'f:' + foe : null;
    }
    case 'kill': { const b = big(FB); return b && crVal(b) >= 5 ? 'u:' + b.u : null; }
    case 'bounce': { const b = big(FB); return b && C[b.id].c >= 3 ? 'u:' + b.u : null; }
    case 'freeze': { const b = big(FB.filter(c => !c.frz)); return b ? 'u:' + b.u : null; }
    case 'buff': { const b = MB.slice().sort((a, b2) => (canAttack(b2) - canAttack(a)) || crVal(b2) - crVal(a))[0]; return b ? 'u:' + b.u : null; }
  }
  return null;
}
function botWants(s, me, c) { // ungezielte Karten: lohnt sich das gerade?
  const e = c.e, foe = foeOf(s, me), FB = s.pl[foe].board, MB = s.pl[me].board, P = s.pl[me];
  if (c.t === 'k') return MB.length < BOARD_MAX;
  if (!e) return false;
  if (e.k === 'heal') return P.life <= 14 || P.hand.length <= 2;
  if (e.k === 'draw') return P.hand.length <= 4 && (!e.self || P.life > 8);
  if (e.k === 'dmgAll') { const kills = FB.filter(x => !x.shield && hpLeft(x) <= e.n).length, mine = e.side === 'all' ? MB.filter(x => !x.shield && hpLeft(x) <= e.n).length : 0; return kills >= 2 && kills > mine; }
  if (e.k === 'freezeAll') return FB.filter(x => !x.tap).length >= 2;
  if (e.k === 'buffAll') return MB.length >= 2;
  if (e.k === 'revive') return !!P.lastDead;
  return true;
}
function botStep(r) {
  const s = r.state; if (s.phase !== 'main' || s.turn !== BOT) return;
  const me = BOT, foe = foeOf(s, me), P = s.pl[me];
  // 1. Karten ausspielen (teuerste zuerst)
  const order = P.hand.map((h, i) => ({ i, c: C[h.id] })).filter(x => x.c.c <= P.cr).sort((a, b) => b.c.c - a.c.c);
  for (const { i, c } of order) {
    let tgt;
    if (c.e && c.e.tg && anyTarget(s, me, c.e.tg)) { tgt = botTargetFor(s, me, c.e); if (!tgt) { if (c.t === 'z') continue; tgt = c.e.tg === 'own' ? 'u:' + (P.board[0] || {}).u : (s.pl[foe].board[0] ? 'u:' + s.pl[foe].board[0].u : 'f:' + foe); } }
    else if (c.e && c.e.tg && c.t === 'z') continue;
    else if (!botWants(s, me, c)) continue;
    if (play(s, me, i, tgt) === undefined) { if (s.phase === 'main') schedule(r, 1100, () => botStep(r)); return; }
  }
  // 2. Angreifen
  if (!s.attacked) {
    const mine = P.board.filter(canAttack), blockers = s.pl[foe].board.filter(b => !b.tap);
    const total = mine.reduce((n, c) => n + c.a, 0);
    const rest = mine.map(c => c.a).sort((x, y) => y - x).slice(blockers.length).reduce((n, x) => n + x, 0);
    const allIn = rest >= s.pl[foe].life; // selbst wenn jeder Blocker einen der Stärksten aufhält, reicht es
    const go = mine.filter(a => { const bl = blockers.filter(b => canBlock(b, a)); if (!bl.length) return true; if (allIn) return true;
      return !bl.some(b => (b.a >= hpLeft(a) || has(b, 'gift')) && !a.shield) || bl.every(b => crVal(b) >= crVal(a) && b.a >= hpLeft(a) && (a.a >= hpLeft(b) || has(a, 'gift'))); });
    if (go.length) { attack(r, me, go.map(c => c.u)); if (s.phase === 'main') schedule(r, 1300, () => botStep(r)); return; }
    s.attacked = true;
  }
  endTurn(r);
}
function botBlock(s) {
  const me = BOT, foe = foeOf(s, me), P = s.pl[me];
  const atts = s.atk.map(u => findCre(s, u)).filter(Boolean).sort((a, b) => b.a - a.a);
  const free = P.board.filter(b => !b.tap), used = new Set(), blocks = {};
  let incoming = atts.reduce((n, a) => n + a.a, 0);
  const kills = (x, y) => (x.a >= hpLeft(y) || (has(x, 'gift') && x.a > 0)) && !y.shield;
  for (const a of atts) { // gute Blocks: überleben und/oder lohnender Tausch
    const opts = free.filter(b => !used.has(b.u) && canBlock(b, a));
    const best = opts.find(b => kills(b, a) && !kills(a, b)) || opts.find(b => !kills(a, b)) || opts.find(b => kills(b, a) && crVal(a) >= crVal(b) + 1);
    if (best) { blocks[best.u] = a.u; used.add(best.u); incoming -= a.a; }
  }
  if (incoming >= P.life) for (const a of atts) { // Notfall: alles blocken, was geht
    if (Object.values(blocks).includes(a.u)) continue;
    const b = free.filter(x => !used.has(x.u) && canBlock(x, a)).sort((x, y) => crVal(x) - crVal(y))[0];
    if (b) { blocks[b.u] = a.u; used.add(b.u); incoming -= a.a; if (incoming < P.life) break; }
  }
  s.blocks = blocks;
  if (Object.keys(blocks).length) log(s, `Kristall-Bot blockt mit ${Object.keys(blocks).length} Kreatur${Object.keys(blocks).length > 1 ? 'en' : ''}.`);
}

function begin(r) {
  const s = r.state;
  for (const pid of s.p) { const P = s.pl[pid]; const deck = []; for (const [id, n] of Object.entries(DECKS[P.fac])) for (let i = 0; i < n; i++) deck.push(id); P.deck = shuffle(deck); }
  const first = s.p[Math.random() < 0.5 ? 0 : 1];
  draw(s, first, 4); draw(s, foeOf(s, first), 5);
  log(s, `${s.nm[first]} beginnt. ${s.nm[foeOf(s, first)]} bekommt dafür eine Karte mehr.`);
  s.n = 0; startTurn(r, first);
}

module.exports = {
  title: 'Kristallduell', min: 2, seats: 2,
  solo: (r, m) => !!(m && m.bot),
  start(r, m = {}) {
    if (r.timer) clearTimeout(r.timer);
    const old = r.state, ids = r.players.map(p => p.id);
    const p = m.bot ? [ids[0], BOT] : (old && old.p && old.p.every(x => ids.includes(x)) && !old.bot ? [old.p[1], old.p[0]] : ids.slice(0, 2));
    const pl = {}; for (const id of p) pl[id] = { life: LIFE, mx: 0, cr: 0, deck: [], hand: [], board: [], grave: [], fat: 0, fac: null, lastDead: null };
    const facs = Object.keys(F);
    if (m.bot) pl[BOT].fac = facs[Math.floor(Math.random() * facs.length)];
    r.state = { p, pl, nm: { [p[0]]: nameOf(r, p[0]), [p[1]]: nameOf(r, p[1]) }, phase: 'pick', turn: null, n: 0, attacked: false, atk: [], blocks: {}, winner: null, draw: false, log: ['Wählt euer Deck.'], fx: [], seq: 0, uc: 0, dl: 0, turnEnd: 0,
      score: old && old.score && !old.bot === !m.bot ? old.score : {}, bot: !!m.bot, lastFac: old && old.pl ? Object.fromEntries(Object.entries(old.pl).map(([k, v]) => [k, v.fac])) : {} };
    r.status = 'playing';
    if (!m.bot) setTimer(r, 60e3, () => { for (const id of r.state.p) if (!r.state.pl[id].fac) r.state.pl[id].fac = facs[Math.floor(Math.random() * facs.length)]; begin(r); });
  },
  onLeave(r, pid, name) {
    const s = r.state; if (!s || r.status !== 'playing' || !s.p.includes(pid)) return;
    if (r.timer) clearTimeout(r.timer); r.timer = null;
    s.winner = foeOf(s, pid); s.phase = 'end'; s.dl = 0; log(s, `${name} hat das Duell verlassen.`); r.status = 'ended';
  },
  act(r, pid, a) { const res = module.exports._act(r, pid, a); sync(r); return res; },
  _act(r, pid, a) {
    const s = r.state; if (!s || r.status !== 'playing') return 'quiet';
    if (!s.p.includes(pid)) return 'Du schaust bei diesem Duell zu.';
    if (s.phase === 'pick') {
      if (a.type !== 'deck' || s.pl[pid].fac) return 'quiet';
      const f = a.f === 'zufall' ? Object.keys(F)[Math.floor(Math.random() * 4)] : a.f; if (!F[f]) return 'quiet';
      s.pl[pid].fac = f;
      if (s.p.every(x => s.pl[x].fac)) begin(r);
      return;
    }
    if (s.phase === 'end') return 'quiet';
    if (a.type === 'block') {
      if (s.phase !== 'block' || s.turn === pid) return 'quiet';
      const blocks = {}, used = new Set(), P = s.pl[pid];
      for (const [bu, au] of Object.entries(a.b || {}).slice(0, BOARD_MAX)) {
        const B = P.board.find(c => c.u === Number(bu)), A = s.atk.includes(Number(au)) ? findCre(s, Number(au)) : null;
        if (!B || !A || used.has(A.u) || !canBlock(B, A)) return 'Dieser Block geht nicht.';
        used.add(A.u); blocks[B.u] = A.u;
      }
      s.blocks = blocks; resolve(r); afterResolve(r); return;
    }
    if (s.turn !== pid) return 'Du bist gerade nicht dran.';
    if (s.phase !== 'main') return 'quiet';
    if (a.type === 'play') { const e = play(s, pid, Number(a.i), a.t); return e; }
    if (a.type === 'attack') { const e = attack(r, pid, Array.isArray(a.us) ? a.us.slice(0, BOARD_MAX) : []); return e; }
    if (a.type === 'end') { endTurn(r); return; }
    return 'quiet';
  },
  winners(r) { const s = r.state; return s && s.winner && s.winner !== BOT ? [s.winner] : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    const mine = s.p.includes(pid), me = mine ? pid : s.p[0], foe = foeOf(s, me);
    const pub = id => { const P = s.pl[id]; return { life: P.life, mx: P.mx, cr: P.cr, deck: P.deck.length, hand: P.hand.length, board: P.board.map(c => ({ u: c.u, id: c.id, a: c.a, h: c.h, d: c.d, kw: c.kw, sick: c.sick, tap: c.tap, frz: c.frz, shield: c.shield })), grave: P.grave.length, fac: s.phase === 'pick' && id !== pid ? (P.fac ? '?' : null) : P.fac, fat: P.fat }; };
    return { phase: s.phase, p: s.p, me, foe, mine, nm: s.nm, turn: s.turn, n: s.n, attacked: s.attacked, atk: s.atk, blocks: s.blocks, winner: s.winner, draw: s.draw, log: s.log, fx: s.fx, seq: s.seq, score: s.score, bot: s.bot,
      left: s.dl ? Math.max(0, s.dl - Date.now()) : null, lastFac: s.lastFac[pid] || null,
      P: { [me]: pub(me), [foe]: pub(foe) }, hand: mine ? s.pl[me].hand : [] };
  },
};
