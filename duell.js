// Kristallduell: Sammelkarten-Duell für 2 (oder gegen den Bot). Eigene Karten, siehe duell_karten.js.
// Ablauf eines Zuges: Kristalle auffüllen (+1 Maximum, höchstens 10), 1 Karte ziehen, Karten ausspielen,
// einmal angreifen (der Gegner wählt Blocker), danach weiter ausspielen, Zug beenden. Wer auf 0 Leben fällt, verliert.
// Decks: jeder hat die 5 Grunddecks; mit Konto zusätzlich selbst gebaute Decks aus der Sammlung (kd_konto.js).
const K = require('./duell_karten.js');
const { C, DECKS, F, LADDER, RAR } = K;
const SPEED = Number(process.env.FSG_SPEED) || 1;
const BOT = 'bot', LIFE = 20, HAND_MAX = 10, BOARD_MAX = 6, TURN_MS = 90e3, BLOCK_MS = 30e3;
let API = null; // vom Server: { accOf(pid), decks(acc), levels(acc), reward(acc, info) }
const has = (cr, k) => cr.kw.includes(k);
const nameOf = (r, id) => (id === BOT ? 'Kristall-Bot' : (r.players.find(p => p.id === id) || {}).name || 'Jemand');
const foeOf = (s, pid) => (s.p[0] === pid ? s.p[1] : s.p[0]);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bon = (s, pid, f) => s.pl[pid].bon.includes(f);

function schedule(r, ms, fn) { if (r.timer) clearTimeout(r.timer); r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } sync(r); r.push(); }, ms / SPEED); }
function sync(r) {
  const s = r.state; if (!s || s.phase !== 'end' || r.status !== 'playing') return;
  r.status = 'ended'; if (r.timer) { clearTimeout(r.timer); r.timer = null; }
  payout(r);
}
function payout(r) { // Belohnungen (Funken, Aufgaben, Bot-Leiter) für Spieler mit Konto
  const s = r.state; if (s.paid) return; s.paid = true; s.rew = {};
  if (!API) return;
  for (const pid of s.p) {
    if (pid === BOT) continue; const acc = API.accOf(pid); if (!acc) continue;
    try { s.rew[pid] = API.reward(acc, { win: s.winner === pid, draw: !!s.draw, pvp: !s.bot, lvl: s.lvl || 0, turns: s.n, st: s.st[pid], bon: s.pl[pid].bon, left: !!s.left }); } catch (e) { console.error(e); }
  }
}
function log(s, t) { s.log.push(t); if (s.log.length > 8) s.log.shift(); }
function fx(s, e) { e.q = ++s.seq; s.fx.push(e); if (s.fx.length > 40) s.fx.shift(); }
function mkCre(s, id, owner) {
  const c = C[id], cr = { u: ++s.uc, id, o: owner, a: c.a, h: c.h, d: 0, kw: (c.kw || []).slice(), sick: !(c.kw || []).includes('eile'), tap: false, frz: false, shield: (c.kw || []).includes('schild') };
  if (bon(s, owner, 'wild')) cr.h += 1; // Urkraft
  if (bon(s, owner, 'abent')) cr.a += 1; // Kameradschaft
  return cr;
}
function findCre(s, u) { for (const pid of s.p) { const c = s.pl[pid].board.find(x => x.u === u); if (c) return c; } return null; }
const hpLeft = c => c.h - c.d;
const crVal = c => c.a + hpLeft(c) + c.kw.length * 1.2 + (c.shield ? 1 : 0);
const dmgN = (s, pid, n) => n + (bon(s, pid, 'glut') ? 1 : 0); // Flammenseele

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
function heal(s, pid, n) { if (n <= 0) return; const P = s.pl[pid]; const was = P.life; P.life = Math.min(s.maxLife[pid] + 10, P.life + n); if (P.life > was) fx(s, { k: 'heal', t: 'f:' + pid, n: P.life - was }); }
function hitCre(s, cr, n, src) { // src: angreifende Kreatur (für Gift/Lebensentzug) oder null
  if (n <= 0) return 0;
  if (cr.shield) { cr.shield = false; fx(s, { k: 'shield', t: 'u:' + cr.u }); return 0; }
  cr.d += n; fx(s, { k: 'dmg', t: 'u:' + cr.u, n });
  if (src && has(src, 'gift')) cr.dead = true;
  return n;
}
function cleanup(s) {
  for (let loop = 0; loop < 8; loop++) { // Nachhall kann weitere Kreaturen töten
    const trig = [];
    for (const pid of s.p) {
      const P = s.pl[pid];
      P.board = P.board.filter(c => {
        if (c.d < c.h && !c.dead) return true;
        const k = C[c.id]; if (!k.tok) { P.grave.push(c.id); P.dead.push(c.id); }
        fx(s, { k: 'die', t: 'u:' + c.u, id: c.id });
        const foe = foeOf(s, pid); s.st[foe] && (s.st[foe].kill++);
        if (bon(s, foe, 'nacht')) heal(s, foe, 1); // Seelenernte
        if (k.tod) trig.push([pid, k.tod, k.n]);
        return false;
      });
    }
    if (!trig.length) break;
    for (const [pid, e, n] of trig) { log(s, `Nachhall: ${n}`); applyEffect(s, pid, e, {}, null); }
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
// Ziel prüfen. e.tg: any | cre | ecre | own. t: 'f:<pid>' oder 'u:<uid>'
const fits = (s, pid, e, cr) => (e.tg === 'any' || e.tg === 'cre' || (e.tg === 'ecre' && cr.o !== pid) || (e.tg === 'own' && cr.o === pid)) && !(e.k === 'steal' && cr.a > e.max);
function validTarget(s, pid, e, t) {
  if (typeof t !== 'string') return null;
  if (t.startsWith('f:')) { const who = t.slice(2); return e.tg === 'any' && s.p.includes(who) ? { face: who } : null; }
  const cr = findCre(s, Number(t.slice(2))); if (!cr) return null;
  return fits(s, pid, e, cr) ? { cr } : null;
}
function anyTarget(s, pid, e) { if (e.tg === 'any') return true; return s.p.some(x => s.pl[x].board.some(c => fits(s, pid, e, c))); }

function applyEffect(s, pid, e, T, srcU) {
  const foe = foeOf(s, pid), P = s.pl[pid];
  switch (e.k) {
    case 'dmg': if (T.face) hitFace(s, T.face, dmgN(s, pid, e.n)); else hitCre(s, T.cr, dmgN(s, pid, e.n), null); break;
    case 'face': hitFace(s, foe, dmgN(s, pid, e.n)); break;
    case 'drain': { const n = dmgN(s, pid, e.n); hitFace(s, foe, n); heal(s, pid, n); break; }
    case 'heal': heal(s, pid, e.n); break;
    case 'draw': if (e.self) { P.life -= e.self; fx(s, { k: 'dmg', t: 'f:' + pid, n: e.self }); } draw(s, pid, e.n); break;
    case 'kill': T.cr.dead = true; fx(s, { k: 'kill', t: 'u:' + T.cr.u }); break;
    case 'bounce': { const O = s.pl[T.cr.o]; O.board = O.board.filter(c => c !== T.cr); fx(s, { k: 'bounce', t: 'u:' + T.cr.u, id: T.cr.id });
      if (!C[T.cr.id].tok) { if (O.hand.length < HAND_MAX) O.hand.push({ id: T.cr.id, h: ++s.uc }); else O.grave.push(T.cr.id); } break; }
    case 'freeze': T.cr.tap = true; T.cr.frz = true; fx(s, { k: 'freeze', t: 'u:' + T.cr.u }); break;
    case 'freezeAll': for (const c of s.pl[foe].board) { c.tap = true; c.frz = true; fx(s, { k: 'freeze', t: 'u:' + c.u }); } break;
    case 'buff': T.cr.a += e.a; T.cr.h += e.h; if (e.shield) T.cr.shield = true; fx(s, { k: 'buff', t: 'u:' + T.cr.u, a: e.a, h: e.h }); break;
    case 'buffAll': case 'buffOthers': for (const c of P.board) { if (c.u === srcU) continue; c.a += e.a; c.h += e.h; if (e.shield) c.shield = true; fx(s, { k: 'buff', t: 'u:' + c.u, a: e.a, h: e.h }); } break;
    case 'shieldAll': for (const c of P.board) { c.shield = true; fx(s, { k: 'buff', t: 'u:' + c.u, a: 0, h: 0, sh: 1 }); } break;
    case 'weaken': T.cr.a = Math.max(0, T.cr.a - e.a); T.cr.h -= e.h; fx(s, { k: 'weak', t: 'u:' + T.cr.u, a: e.a, h: e.h }); break;
    case 'steal': if (P.board.length < BOARD_MAX) { const O = s.pl[T.cr.o]; O.board = O.board.filter(c => c !== T.cr); T.cr.o = pid; T.cr.sick = true; T.cr.tap = false; T.cr.frz = false; P.board.push(T.cr); fx(s, { k: 'steal', t: 'u:' + T.cr.u }); log(s, `${s.nm[pid]} übernimmt ${C[T.cr.id].n}!`); } break;
    case 'dmgAll': for (const x of e.side === 'all' ? s.p : [foe]) for (const c of s.pl[x].board.slice()) hitCre(s, c, dmgN(s, pid, e.n), null); break;
    case 'token': for (let i = 0; i < e.n && P.board.length < BOARD_MAX; i++) { const c = mkCre(s, e.id, pid); P.board.push(c); fx(s, { k: 'summon', t: 'u:' + c.u }); } break;
    case 'ramp': P.mx = Math.min(10, P.mx + 1); P.cr = Math.min(10, P.cr + 1); fx(s, { k: 'ramp', p: pid }); break;
    case 'revive': {
      let got = 0;
      for (let i = 0; i < (e.n || 1) && P.dead.length && P.board.length < BOARD_MAX; i++) {
        const id = P.dead.pop(); const gi = P.grave.lastIndexOf(id); if (gi >= 0) P.grave.splice(gi, 1);
        const c = mkCre(s, id, pid); P.board.push(c); fx(s, { k: 'summon', t: 'u:' + c.u, rev: 1 }); log(s, `${C[id].n} kehrt zurück!`); got++;
      }
      if (!got) draw(s, pid, 1);
      break;
    }
  }
  if (e.heal && e.k !== 'heal') heal(s, pid, e.heal);
  if (e.face) hitFace(s, foe, dmgN(s, pid, e.face));
  if (e.draw && e.k !== 'draw') draw(s, pid, e.draw);
}

function play(s, pid, hi, tgt) {
  const P = s.pl[pid], card = P.hand[hi]; if (!card) return 'Diese Karte gibt es nicht.';
  const c = C[card.id];
  if (c.c > P.cr) return `Dafür brauchst du ${c.c} Kristalle.`;
  if (c.t === 'k' && P.board.length >= BOARD_MAX) return `Mehr als ${BOARD_MAX} Kreaturen passen nicht aufs Feld.`;
  let T = null;
  if (c.e && c.e.tg) {
    if (anyTarget(s, pid, c.e)) { T = validTarget(s, pid, c.e, tgt); if (!T) return c.e.k === 'steal' ? 'Wähle eine gegnerische Kreatur mit höchstens 3 Angriff.' : 'Wähle ein gültiges Ziel.'; }
    else if (c.t === 'z') return 'Dafür gibt es gerade kein Ziel.';
  }
  P.cr -= c.c; P.hand.splice(hi, 1);
  fx(s, { k: 'play', p: pid, id: card.id, tgt: tgt || null });
  let src = null;
  if (c.t === 'k') { src = mkCre(s, card.id, pid); P.board.push(src); fx(s, { k: 'summon', t: 'u:' + src.u }); log(s, `${s.nm[pid]} beschwört ${c.n}.`); s.st[pid].summon++; }
  else { P.grave.push(card.id); log(s, `${s.nm[pid]} wirkt ${c.n}.`); s.st[pid].spell++; }
  if (c.e && (!c.e.tg || T)) applyEffect(s, pid, c.e, T || {}, src && src.u);
  cleanup(s);
}
function useHero(s, pid, tgt) { // Heldenkraft einsetzen
  const P = s.pl[pid], h = P.hero; if (!h) return 'Dieses Deck hat keinen Helden.';
  if (h.cd > 0) return `Die Heldenkraft ist erst in ${h.cd} Zug${h.cd > 1 ? 'en' : ''} bereit.`;
  const H = K.HEROES[h.id], e = H.e; let T = {};
  if (e.tg) { if (!anyTarget(s, pid, e)) return 'Dafür gibt es gerade kein Ziel.'; T = validTarget(s, pid, e, tgt); if (!T) return 'Wähle ein gültiges Ziel.'; }
  h.cd = H.cd; fx(s, { k: 'heropow', p: pid, id: h.id, tgt: tgt || null });
  log(s, `${H.art} ${H.n} setzt ${H.pow} ein!`);
  applyEffect(s, pid, e, T, null); cleanup(s);
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
  for (const c of P.board) {
    c.sick = false; if (c.frz) c.frz = false; else c.tap = false;
    const w = C[c.id].wachs; if (w) { c.a += w[0]; c.h += w[1]; fx(s, { k: 'buff', t: 'u:' + c.u, a: w[0], h: w[1] }); }
  }
  if (P.hero && P.hero.cd > 0) P.hero.cd--; // Heldenkraft lädt auf
  if (bon(s, pid, 'licht')) heal(s, pid, 1); // Morgenröte
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
      const n = dmgN(s, me, e.n);
      const kill = FB.filter(c => !c.shield && hpLeft(c) <= n).sort((a, b) => crVal(b) - crVal(a))[0];
      if (e.tg === 'any' && s.pl[foe].life <= n) return 'f:' + foe;
      if (kill) return 'u:' + kill.u;
      if (e.tg === 'any' && (s.pl[foe].life <= 8 || !FB.length)) return 'f:' + foe;
      return e.tg === 'any' && n <= 2 ? 'f:' + foe : null;
    }
    case 'weaken': { const kill = FB.filter(c => hpLeft(c) <= e.h).sort((a, b) => crVal(b) - crVal(a))[0] || big(FB); return kill ? 'u:' + kill.u : null; }
    case 'kill': { const b = big(FB); return b && crVal(b) >= 5 ? 'u:' + b.u : null; }
    case 'steal': { const b = big(FB.filter(c => c.a <= e.max)); return b ? 'u:' + b.u : null; }
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
  if (e.k === 'heal') return P.life <= s.maxLife[me] - 6 || P.hand.length <= 2;
  if (e.k === 'draw') return P.hand.length <= 4 && (!e.self || P.life > 8);
  if (e.k === 'dmgAll') { const n = dmgN(s, me, e.n), kills = FB.filter(x => !x.shield && hpLeft(x) <= n).length, mine = e.side === 'all' ? MB.filter(x => !x.shield && hpLeft(x) <= n).length : 0; return kills >= 2 && kills > mine; }
  if (e.k === 'freezeAll') return FB.filter(x => !x.tap).length >= 2;
  if (e.k === 'buffAll' || e.k === 'shieldAll') return MB.length >= 2;
  if (e.k === 'token') return MB.length < BOARD_MAX - 1;
  if (e.k === 'revive') return P.dead.length > 0;
  return true;
}
function botStep(r) {
  const s = r.state; if (s.phase !== 'main' || s.turn !== BOT) return;
  const me = BOT, foe = foeOf(s, me), P = s.pl[me];
  // 0. Heldenkraft, wenn bereit und sinnvoll
  if (P.hero && P.hero.cd === 0) {
    const e = K.HEROES[P.hero.id].e; let t, ok = true;
    if (e.tg) { t = botTargetFor(s, me, e); if (!t && e.tg === 'any') t = 'f:' + foe; ok = !!t; }
    else if (e.k === 'shieldAll') ok = P.board.length >= 1 || P.life < s.maxLife[me];
    if (ok && useHero(s, me, t) === undefined) { if (s.phase === 'main') schedule(r, 1200, () => botStep(r)); return; }
  }
  // 1. Karten ausspielen (teuerste zuerst)
  const order = P.hand.map((h, i) => ({ i, c: C[h.id] })).filter(x => x.c.c <= P.cr).sort((a, b) => b.c.c - a.c.c);
  for (const { i, c } of order) {
    let tgt;
    if (c.e && c.e.tg && anyTarget(s, me, c.e)) {
      tgt = botTargetFor(s, me, c.e);
      if (!tgt) { if (c.t === 'z') continue; const any = s.p.flatMap(x => s.pl[x].board).find(x => fits(s, me, c.e, x)); tgt = c.e.tg === 'any' ? 'f:' + foe : any ? 'u:' + any.u : undefined; }
    }
    else if (c.e && c.e.tg && c.t === 'z') continue;
    else if (!botWants(s, me, c)) continue;
    if (play(s, me, i, tgt) === undefined) { if (s.phase === 'main') schedule(r, 1100, () => botStep(r)); return; }
  }
  // 2. Angreifen
  if (!s.attacked) {
    const mine = P.board.filter(canAttack), blockers = s.pl[foe].board.filter(b => !b.tap);
    const rest = mine.map(c => c.a).sort((x, y) => y - x).slice(blockers.length).reduce((n, x) => n + x, 0);
    const allIn = rest >= s.pl[foe].life; // selbst wenn jeder Blocker einen der Stärksten aufhält, reicht es
    const go = mine.filter(a => { const bl = blockers.filter(b => canBlock(b, a)); if (!bl.length) return true; if (allIn) return true;
      return !bl.some(b => (b.a >= hpLeft(a) || has(b, 'gift')) && !a.shield) || bl.every(b => crVal(b) >= crVal(a) && b.a >= hpLeft(a) && (a.a >= hpLeft(b) || has(a, 'gift'))); });
    if (s.dumb && Math.random() < s.dumb) go.splice(0, Math.ceil(go.length / 2)); // leichtere Gegner greifen zögerlicher an
    if (go.length) { attack(r, me, go.map(c => c.u)); if (s.phase === 'main') schedule(r, 1300, () => botStep(r)); return; }
    s.attacked = true;
  }
  endTurn(r);
}
function botBlock(s) {
  const me = BOT, P = s.pl[me];
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
  if (s.dumb) for (const b of Object.keys(blocks)) if (Math.random() < s.dumb) delete blocks[b];
  s.blocks = blocks;
  if (Object.keys(blocks).length) log(s, `${s.nm[BOT]} blockt mit ${Object.keys(blocks).length} Kreatur${Object.keys(blocks).length > 1 ? 'en' : ''}.`);
}

/* ---------- Decks ---------- */
function ladderDeck(L) { // feste Decks der Bot-Leiter (gleich bei jedem Versuch)
  const meta = LADDER[L - 1]; let seed = L * 9973 + 17;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pool = Object.entries(C).filter(([, c]) => !c.tok && meta.th.includes(c.f) && meta.r.includes(c.r)).map(([id]) => id).sort();
  const cards = {}; let n = 0, cre = 0;
  const add = (id) => { const mx = RAR[C[id].r].max, k = Math.min(mx - (cards[id] || 0), 30 - n); if (k <= 0) return; cards[id] = (cards[id] || 0) + k; n += k; if (C[id].t === 'k') cre += k; };
  const cres = pool.filter(id => C[id].t === 'k');
  // seltene Karten zuerst, damit stärkere Gegner sie auch wirklich haben
  const rare = pool.filter(id => C[id].r === 'l' || C[id].r === 'e').sort(() => rnd() - 0.5);
  for (const id of rare) if (n < Math.min(14, L * 1.5)) add(id);
  for (let i = 0; i < 400 && cre < 16 && n < 30; i++) add(cres[Math.floor(rnd() * cres.length)]);
  for (let i = 0; i < 400 && n < 30; i++) add(pool[Math.floor(rnd() * pool.length)]);
  for (let i = 0; i < 400 && n < 30; i++) { const id = pool[Math.floor(rnd() * pool.length)]; if ((cards[id] || 0) < 4) { cards[id] = (cards[id] || 0) + 1; n++; } } // kleine Gegner: notfalls 4 Kopien
  return cards;
}
function deckOptions(r, pid) { // was dieser Spieler wählen kann
  const out = Object.keys(DECKS).map(f => ({ id: 'base:' + f, n: 'Grunddeck ' + F[f].n, th: f, bon: K.bonusesOf(DECKS[f]), hero: f === 'abent' ? 'abent' : null }));
  const acc = API && API.accOf(pid);
  if (acc) (API.decks(acc) || []).forEach((d, i) => out.push({ id: 'my:' + i, n: d.n, hero: d.hero || null, th: K.mainTheme(d.cards), bon: K.bonusesOf(d.cards), ok: !d.err, err: d.err || null, mine: 1 }));
  return out;
}
function setDeck(r, pid, id) {
  const s = r.state, P = s.pl[pid];
  let cards = null, name = '', hero = null;
  if (id === 'zufall') id = 'base:' + (k => k[Math.floor(Math.random() * k.length)])(Object.keys(DECKS));
  if (id.startsWith('base:') && DECKS[id.slice(5)]) { cards = DECKS[id.slice(5)]; name = 'Grunddeck ' + F[id.slice(5)].n; if (id === 'base:abent') hero = 'abent'; }
  else if (id.startsWith('my:') && API) {
    const acc = API.accOf(pid), d = acc && (API.decks(acc) || [])[Number(id.slice(3))];
    if (!d) return 'Dieses Deck gibt es nicht.'; if (d.err) return 'Dieses Deck ist nicht fertig: ' + d.err;
    cards = d.cards; name = d.n; hero = d.hero || null;
  }
  if (!cards) return 'Unbekanntes Deck.';
  P.cards = cards; P.deckName = name; P.fac = K.mainTheme(cards); P.bon = K.bonusesOf(cards);
  P.hero = hero && K.HEROES[hero] ? { id: hero, cd: K.HEROES[hero].cd } : null;
  const acc = API && pid !== BOT && API.accOf(pid);
  const all = acc ? API.levels(acc) : {}; P.lv = {}; for (const k of Object.keys(cards)) P.lv[k] = Math.max(1, all[k] || 1);
  for (const k of Object.keys(C)) if (C[k].tok) P.lv[k] = 1;
  s.lastDeck[pid] = id;
}
function begin(r) {
  const s = r.state;
  for (const pid of s.p) { const P = s.pl[pid]; const deck = []; for (const [id, n] of Object.entries(P.cards)) for (let i = 0; i < n; i++) deck.push(id); P.deck = shuffle(deck); }
  const first = s.p[Math.random() < 0.5 ? 0 : 1], second = foeOf(s, first);
  draw(s, first, 4 + (bon(s, first, 'flut') ? 1 : 0)); draw(s, second, 5 + (bon(s, second, 'flut') ? 1 : 0));
  for (const pid of s.p) if (s.pl[pid].bon.length) log(s, `${s.nm[pid]}: Themen-Bonus ${s.pl[pid].bon.map(f => K.B[f][0]).join(', ')}.`);
  log(s, `${s.nm[first]} beginnt. ${s.nm[second]} bekommt dafür eine Karte mehr.`);
  s.n = 0; startTurn(r, first);
}

module.exports = {
  title: 'Kristallduell', min: 2, seats: 2,
  setApi(a) { API = a; },
  ladderDeck,
  solo: (r, m) => !!(m && m.bot),
  start(r, m = {}) {
    if (r.timer) clearTimeout(r.timer);
    const old = r.state, ids = r.players.map(p => p.id);
    const lvl = m.bot ? Math.max(0, Math.min(LADDER.length, Number(m.lvl) | 0)) : 0;
    const p = m.bot ? [ids[0], BOT] : (old && old.p && old.p.every(x => ids.includes(x)) && !old.bot ? [old.p[1], old.p[0]] : ids.slice(0, 2));
    const pl = {}; for (const id of p) pl[id] = { life: LIFE, mx: 0, cr: 0, deck: [], hand: [], board: [], grave: [], dead: [], fat: 0, fac: null, bon: [], lv: {}, cards: null, deckName: '' };
    const nm = { [p[0]]: nameOf(r, p[0]), [p[1]]: nameOf(r, p[1]) };
    const maxLife = { [p[0]]: LIFE, [p[1]]: LIFE };
    r.state = { p, pl, nm, maxLife, phase: 'pick', turn: null, n: 0, attacked: false, atk: [], blocks: {}, winner: null, draw: false, log: ['Wählt euer Deck.'], fx: [], seq: 0, uc: 0, dl: 0, turnEnd: 0,
      score: old && old.score && !old.bot === !m.bot && (old.lvl || 0) === lvl ? old.score : {}, bot: !!m.bot, lvl, lastDeck: (old && old.lastDeck) || {}, st: {}, rew: null, paid: false, opts: {}, dumb: !m.bot ? 0 : lvl === 0 ? 0.2 : lvl <= 3 ? 0.35 : lvl <= 5 ? 0.15 : 0 };
    const s = r.state;
    for (const id of p) s.st[id] = { spell: 0, summon: 0, kill: 0 };
    for (const id of p) if (id !== BOT) s.opts[id] = deckOptions(r, id);
    if (m.bot) {
      if (lvl) { const L = LADDER[lvl - 1]; const cards = ladderDeck(lvl); const P = pl[BOT]; P.cards = cards; P.deckName = L.n; P.fac = K.mainTheme(cards); P.bon = K.bonusesOf(cards); P.lv = {}; for (const k of Object.keys(C)) P.lv[k] = Math.min(5, Math.ceil(lvl / 2)); P.life = maxLife[BOT] = L.life; nm[BOT] = L.n; P.art = L.art; if (lvl >= 3) P.hero = { id: L.th[0], cd: K.HEROES[L.th[0]].cd }; }
      else setDeck(r, BOT, 'zufall');
    }
    r.status = 'playing';
    if (!m.bot) setTimer(r, 60e3, () => { for (const id of s.p) if (!s.pl[id].cards) setDeck(r, id, s.lastDeck[id] && !setDeckCheck(r, id, s.lastDeck[id]) ? s.lastDeck[id] : 'zufall'); begin(r); });
  },
  onLeave(r, pid, name) {
    const s = r.state; if (!s || r.status !== 'playing' || !s.p.includes(pid)) return;
    if (r.timer) clearTimeout(r.timer); r.timer = null;
    const started = s.phase !== 'pick';
    s.winner = foeOf(s, pid); s.phase = 'end'; s.dl = 0; s.left = true; log(s, `${name} hat das Duell verlassen.`); r.status = 'ended';
    if (started) payout(r); else s.paid = true;
  },
  act(r, pid, a) { const res = module.exports._act(r, pid, a); sync(r); return res; },
  _act(r, pid, a) {
    const s = r.state; if (!s || r.status !== 'playing') return 'quiet';
    if (!s.p.includes(pid)) return 'Du schaust bei diesem Duell zu.';
    if (s.phase === 'pick') {
      if (a.type !== 'deck' || s.pl[pid].cards) return 'quiet';
      const e = setDeck(r, pid, String(a.d || a.f || '')); if (e) return e;
      if (s.p.every(x => s.pl[x].cards)) begin(r);
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
    if (a.type === 'play') return play(s, pid, Number(a.i), a.t);
    if (a.type === 'hero') return useHero(s, pid, a.t);
    if (a.type === 'attack') return attack(r, pid, Array.isArray(a.us) ? a.us.slice(0, BOARD_MAX) : []);
    if (a.type === 'end') { endTurn(r); return; }
    return 'quiet';
  },
  winners(r) { const s = r.state; return s && s.winner && s.winner !== BOT ? [s.winner] : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    const mine = s.p.includes(pid), me = mine ? pid : s.p[0], foe = foeOf(s, me), pick = s.phase === 'pick';
    const pub = id => { const P = s.pl[id]; return { hero: P.hero && !(pick && id !== pid) ? { id: P.hero.id, cd: P.hero.cd } : null, life: P.life, max: s.maxLife[id], mx: P.mx, cr: P.cr, deck: P.deck.length, hand: P.hand.length, board: P.board.map(c => ({ u: c.u, id: c.id, a: c.a, h: c.h, d: c.d, kw: c.kw, sick: c.sick, tap: c.tap, frz: c.frz, shield: c.shield })), grave: P.grave.length,
      fac: pick && id !== pid ? (P.cards ? '?' : null) : P.fac, bon: pick && id !== pid ? [] : P.bon, dn: pick && id !== pid ? '' : P.deckName, art: P.art || null, lv: pick ? {} : P.lv, fat: P.fat }; };
    return { phase: s.phase, p: s.p, me, foe, mine, nm: s.nm, turn: s.turn, n: s.n, attacked: s.attacked, atk: s.atk, blocks: s.blocks, winner: s.winner, draw: s.draw, log: s.log, fx: s.fx, seq: s.seq, score: s.score, bot: s.bot, lvl: s.lvl,
      left: s.dl ? Math.max(0, s.dl - Date.now()) : null, lastDeck: s.lastDeck[pid] || null, opts: pick && mine ? s.opts[pid] || [] : null, rew: s.rew && s.rew[pid] || null,
      P: { [me]: pub(me), [foe]: pub(foe) }, hand: mine ? s.pl[me].hand : [] };
  },
};
function setDeckCheck(r, pid, id) { if (!id.startsWith('my:')) return null; const acc = API && API.accOf(pid), d = acc && (API.decks(acc) || [])[Number(id.slice(3))]; return !d || d.err ? 'x' : null; }
