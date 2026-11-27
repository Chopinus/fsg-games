// Kristallduell: Sammelkarten-Duell für 2 (oder gegen den Bot), Regeln nah an klassischen Sammelkartenspielen.
// Zug: Enttappen, Ziehen, Hauptphase (1 Land + Karten), Angriff (Gegner blockt, Kampftricks), zweite Hauptphase, Ende.
// Länder erzeugen farbiges Mana und tappen sich beim Bezahlen automatisch. 20 Lebenspunkte, 40-Karten-Decks, Starthand 7.
const K = require('./duell_karten.js');
const { C, DECKS, F } = K;
const SPEED = Number(process.env.FSG_SPEED) || 1;
const BOT = 'bot', LIFE = 20, HAND_MAX = 10, BOARD_MAX = 7, TURN_MS = 120e3, BLOCK_MS = 30e3;
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
function payout(r) { // Belohnungen (Funken, Aufgaben, Trophäen) für Spieler mit Konto
  const s = r.state; if (s.paid) return; s.paid = true; s.rew = {};
  if (!API) return;
  for (const pid of s.p) {
    if (pid === BOT) continue; const acc = API.accOf(pid); if (!acc) continue;
    try { s.rew[pid] = API.reward(acc, { win: s.winner === pid, draw: !!s.draw, pvp: !s.bot, lvl: s.lvl || 0, arena: s.arena, turns: s.n, st: s.st[pid], bon: s.pl[pid].bon, left: !!s.left }); } catch (e) { console.error(e); }
  }
}
function log(s, t) { s.log.push(t); if (s.log.length > 8) s.log.shift(); }
function fx(s, e) { e.q = ++s.seq; s.fx.push(e); if (s.fx.length > 40) s.fx.shift(); }
function mkCre(s, id, owner) {
  const c = C[id], cr = { u: ++s.uc, id, o: owner, a: c.a, h: c.h, d: 0, kw: (c.kw || []).slice(), sick: !(c.kw || []).includes('eile'), tap: false, frz: false, shield: (c.kw || []).includes('schild'), auras: [] };
  if (bon(s, owner, 'wild')) cr.h += 1; // Urkraft
  if (bon(s, owner, 'abent')) cr.a += 1; // Kameradschaft
  return cr;
}
function findCre(s, u) { for (const pid of s.p) { const c = s.pl[pid].board.find(x => x.u === u); if (c) return c; } return null; }
const hpLeft = c => c.h - c.d;
const crVal = c => c.a + hpLeft(c) + c.kw.length * 1.2 + (c.shield ? 1 : 0);
const dmgN = (s, pid, n) => n + (bon(s, pid, 'glut') ? 1 : 0); // Flammenseele
const alive = c => c && c.d < c.h && !c.dead;

/* ---------- Mana ---------- */
const untapped = P => P.lands.filter(l => !l.tap);
function demand(P) { const d = {}; for (const h of P.hand) { const o = K.parseCost(C[h.id].m); for (const [k, n] of Object.entries(o)) if (k !== 'gen') d[k] = (d[k] || 0) + n; } return d; }
function plan(P, m) { // welche Länder bezahlen diese Kosten? null = geht nicht
  if (!m) return [];
  const o = K.parseCost(m), free = untapped(P).slice(), use = [];
  for (const [col, n] of Object.entries(o)) {
    if (col === 'gen') continue;
    for (let i = 0; i < n; i++) { const j = free.findIndex(l => l.col === col); if (j < 0) return null; use.push(free.splice(j, 1)[0]); }
  }
  if (free.length < o.gen) return null;
  const d = demand(P); free.sort((a, b) => (d[a.col] || 0) - (d[b.col] || 0)); // am wenigsten gebrauchte Farben zuerst
  return use.concat(free.slice(0, o.gen));
}
const canPay = (P, m) => !!plan(P, m);
function pay(s, pid, m) { const P = s.pl[pid], ls = plan(P, m); if (!ls) return false; for (const l of ls) l.tap = true; if (ls.length) fx(s, { k: 'tapL', p: pid, us: ls.map(l => l.u) }); return true; }

function draw(s, pid, n = 1) {
  const P = s.pl[pid];
  for (let i = 0; i < n; i++) {
    if (!P.deck.length) { P.fat++; P.life -= P.fat; fx(s, { k: 'fat', p: pid, n: P.fat }); log(s, `${s.nm[pid]} hat keine Karten mehr und verliert ${P.fat} Lebenspunkte.`); continue; }
    const id = P.deck.pop();
    if (P.hand.length >= HAND_MAX) { P.grave.push(id); fx(s, { k: 'burn', p: pid, id }); log(s, `${s.nm[pid]}s Hand ist voll – ${C[id].n} kommt in den Friedhof.`); continue; }
    P.hand.push({ id, h: ++s.uc });
  }
}
function hitFace(s, pid, n, src) { if (n <= 0) return 0; s.pl[pid].life -= n; fx(s, { k: 'dmg', t: 'f:' + pid, n, src }); return n; }
function heal(s, pid, n) { if (n <= 0) return; const P = s.pl[pid]; const was = P.life; P.life = Math.min(s.maxLife[pid] + 20, P.life + n); if (P.life > was) fx(s, { k: 'heal', t: 'f:' + pid, n: P.life - was }); }
function hitCre(s, cr, n, src) { // src: kämpfende Kreatur (für Todesberührung) oder null
  if (n <= 0) return 0;
  if (cr.shield) { cr.shield = false; fx(s, { k: 'shield', t: 'u:' + cr.u }); return 0; }
  cr.d += n; fx(s, { k: 'dmg', t: 'u:' + cr.u, n });
  if (src && has(src, 'gift')) cr.dead = true;
  return n;
}
function cleanup(s) {
  for (let loop = 0; loop < 8; loop++) { // „Wenn … stirbt“ kann weitere Kreaturen töten
    const trig = [];
    for (const pid of s.p) {
      const P = s.pl[pid];
      P.board = P.board.filter(c => {
        if (c.d < c.h && !c.dead) return true;
        const k = C[c.id], ow = s.pl[c.own || pid]; if (!k.tok) { ow.grave.push(c.id); ow.dead.push(c.id); }
        for (const a of c.auras || []) s.pl[a.o].grave.push(a.id); // Auren gehen mit
        fx(s, { k: 'die', t: 'u:' + c.u, id: c.id });
        const foe = foeOf(s, pid); s.st[foe] && (s.st[foe].kill++);
        if (bon(s, foe, 'nacht')) heal(s, foe, 1); // Seelenernte
        if (k.tod) trig.push([pid, k.tod, k.n]);
        return false;
      });
    }
    if (!trig.length) break;
    for (const [pid, e, n] of trig) { log(s, `${n} stirbt: Fähigkeit wird ausgelöst.`); applyEffect(s, pid, e, {}, null); }
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
// Ziele. e.tg: any | cre | ecre | own. t: 'f:<pid>' oder 'u:<uid>'. Fluchsicher: nicht für Gegner anvisierbar.
const fits = (s, pid, e, cr) => (e.tg === 'any' || e.tg === 'cre' || (e.tg === 'ecre' && cr.o !== pid) || (e.tg === 'own' && cr.o === pid)) && !(e.k === 'steal' && cr.a > e.max) && !(has(cr, 'fluch') && cr.o !== pid);
function validTarget(s, pid, e, t) {
  if (typeof t !== 'string') return null;
  if (t.startsWith('f:')) { const who = t.slice(2); return e.tg === 'any' && s.p.includes(who) ? { face: who } : null; }
  const cr = findCre(s, Number(t.slice(2))); if (!cr) return null;
  return fits(s, pid, e, cr) ? { cr } : null;
}
function anyTarget(s, pid, e) { if (e.tg === 'any') return true; return s.p.some(x => s.pl[x].board.some(c => fits(s, pid, e, c))); }

function applyEffect(s, pid, e, T, srcU, auraId) {
  const foe = foeOf(s, pid), P = s.pl[pid];
  switch (e.k) {
    case 'dmg': if (T.face) hitFace(s, T.face, dmgN(s, pid, e.n)); else hitCre(s, T.cr, dmgN(s, pid, e.n), null); break;
    case 'face': hitFace(s, foe, dmgN(s, pid, e.n)); break;
    case 'drain': { const n = dmgN(s, pid, e.n); hitFace(s, foe, n); heal(s, pid, n); break; }
    case 'heal': heal(s, pid, e.n); break;
    case 'draw': if (e.self) { P.life -= e.self; fx(s, { k: 'dmg', t: 'f:' + pid, n: e.self }); } draw(s, pid, e.n); break;
    case 'kill': T.cr.dead = true; fx(s, { k: 'kill', t: 'u:' + T.cr.u }); break;
    case 'bounce': { const O = s.pl[T.cr.o]; O.board = O.board.filter(c => c !== T.cr); fx(s, { k: 'bounce', t: 'u:' + T.cr.u, id: T.cr.id });
      for (const a of T.cr.auras || []) s.pl[a.o].grave.push(a.id);
      const ow = s.pl[T.cr.own || T.cr.o]; if (!C[T.cr.id].tok) { if (ow.hand.length < HAND_MAX) ow.hand.push({ id: T.cr.id, h: ++s.uc }); else ow.grave.push(T.cr.id); } break; }
    case 'freeze': T.cr.tap = true; T.cr.frz = true; fx(s, { k: 'freeze', t: 'u:' + T.cr.u }); break;
    case 'freezeAll': for (const c of s.pl[foe].board) { c.tap = true; c.frz = true; fx(s, { k: 'freeze', t: 'u:' + c.u }); } break;
    case 'buff': T.cr.a += e.a; T.cr.h += e.h; if (e.shield) T.cr.shield = true; for (const k of e.kw || []) if (!T.cr.kw.includes(k)) T.cr.kw.push(k);
      if (auraId) T.cr.auras.push({ id: auraId, o: pid }); fx(s, { k: 'buff', t: 'u:' + T.cr.u, a: e.a, h: e.h, kw: e.kw || null }); break;
    case 'buffAll': case 'buffOthers': for (const c of P.board) { if (c.u === srcU) continue; c.a += e.a; c.h += e.h; if (e.shield) c.shield = true; fx(s, { k: 'buff', t: 'u:' + c.u, a: e.a, h: e.h }); } break;
    case 'shieldAll': for (const c of P.board) { c.shield = true; fx(s, { k: 'buff', t: 'u:' + c.u, a: 0, h: 0, sh: 1 }); } break;
    case 'weaken': T.cr.a = Math.max(0, T.cr.a - e.a); T.cr.h -= e.h; if (auraId) T.cr.auras.push({ id: auraId, o: pid }); fx(s, { k: 'weak', t: 'u:' + T.cr.u, a: e.a, h: e.h }); break;
    case 'steal': if (P.board.length < BOARD_MAX) { const O = s.pl[T.cr.o]; O.board = O.board.filter(c => c !== T.cr); T.cr.own = T.cr.own || T.cr.o; T.cr.o = pid; T.cr.sick = true; T.cr.tap = false; T.cr.frz = false; P.board.push(T.cr); fx(s, { k: 'steal', t: 'u:' + T.cr.u }); log(s, `${s.nm[pid]} übernimmt ${C[T.cr.id].n}!`); } break;
    case 'dmgAll': for (const x of e.side === 'all' ? s.p : [foe]) for (const c of s.pl[x].board.slice()) hitCre(s, c, dmgN(s, pid, e.n), null); break;
    case 'token': for (let i = 0; i < e.n && P.board.length < BOARD_MAX; i++) { const c = mkCre(s, e.id, pid); P.board.push(c); fx(s, { k: 'summon', t: 'u:' + c.u }); } break;
    case 'ramp': { const i = P.deck.findIndex(id => C[id].t === 'l'); if (i >= 0) { const id = P.deck.splice(i, 1)[0]; P.lands.push({ u: ++s.uc, id, col: C[id].col, tap: true }); shuffle(P.deck); fx(s, { k: 'ramp', p: pid }); } break; }
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

/* ---------- Karten spielen ---------- */
const instWindow = (s, pid) => (s.phase === 'block' && s.turn !== pid) || (s.phase === 'trick' && s.turn === pid);
const fast = c => !!(c.inst || (c.kw || []).includes('blitz'));
function playLand(s, pid, hi) {
  const P = s.pl[pid], card = P.hand[hi];
  if (s.turn !== pid || s.phase !== 'main') return 'Länder spielst du in deiner Hauptphase.';
  if (P.landPlayed) return 'Du hast in diesem Zug schon ein Land gespielt.';
  P.hand.splice(hi, 1); P.landPlayed = true;
  const l = { u: ++s.uc, id: card.id, col: C[card.id].col, tap: false }; P.lands.push(l);
  fx(s, { k: 'land', p: pid, u: l.u, id: card.id }); log(s, `${s.nm[pid]} spielt ${C[card.id].n}.`);
}
function play(s, pid, hi, tgt) {
  const P = s.pl[pid], card = P.hand[hi]; if (!card) return 'Diese Karte gibt es nicht.';
  const c = C[card.id];
  if (c.t === 'l') return playLand(s, pid, hi);
  const own = s.turn === pid && s.phase === 'main';
  if (!own && !(fast(c) && instWindow(s, pid))) return fast(c) ? 'Gerade ist der Gegner dran.' : 'Das geht nur in deiner Hauptphase – jetzt nur Spontanzauber und Aufblitzen.';
  if (c.t === 'k' && P.board.length >= BOARD_MAX) return `Mehr als ${BOARD_MAX} Kreaturen passen nicht aufs Feld.`;
  if (!canPay(P, c.m)) return 'Dafür hast du nicht genug passendes Mana.';
  let T = null;
  if (c.e && c.e.tg) {
    if (anyTarget(s, pid, c.e)) { T = validTarget(s, pid, c.e, tgt); if (!T) return c.e.k === 'steal' ? `Wähle eine gegnerische Kreatur mit höchstens ${c.e.max} Stärke.` : 'Wähle ein gültiges Ziel.'; }
    else if (c.t !== 'k') return 'Dafür gibt es gerade kein Ziel.';
  }
  pay(s, pid, c.m); P.hand.splice(hi, 1);
  fx(s, { k: 'play', p: pid, id: card.id, tgt: tgt || null });
  let src = null;
  if (c.t === 'k') { src = mkCre(s, card.id, pid); P.board.push(src); fx(s, { k: 'summon', t: 'u:' + src.u }); log(s, `${s.nm[pid]} wirkt ${c.n}.`); s.st[pid].summon++; }
  else { if (c.t !== 'a') P.grave.push(card.id); log(s, `${s.nm[pid]} wirkt ${c.n}.`); s.st[pid].spell++; }
  if (c.e && (!c.e.tg || T)) applyEffect(s, pid, c.e, T || {}, src && src.u, c.t === 'a' ? card.id : null);
  else if (c.t === 'a') P.grave.push(card.id);
  cleanup(s);
}
function ability(s, pid, u, tgt) { // ⟳-Fähigkeit einer Kreatur
  const P = s.pl[pid], cr = P.board.find(c => c.u === Number(u)); if (!cr) return 'Diese Kreatur gibt es nicht.';
  const A = C[cr.id].act; if (!A) return 'Diese Kreatur hat keine Fähigkeit.';
  if (!(s.turn === pid && s.phase === 'main') && !instWindow(s, pid)) return 'Gerade ist der Gegner dran.';
  if (A.tap && (cr.tap || (cr.sick && !has(cr, 'eile')))) return cr.tap ? 'Die Kreatur ist schon getappt.' : 'Die Kreatur ist gerade erst ins Spiel gekommen.';
  if (A.m && !canPay(P, A.m)) return 'Dafür hast du nicht genug Mana.';
  let T = {};
  if (A.e.tg) { if (!anyTarget(s, pid, A.e)) return 'Dafür gibt es gerade kein Ziel.'; T = validTarget(s, pid, A.e, tgt); if (!T) return 'Wähle ein gültiges Ziel.'; }
  if (A.m) pay(s, pid, A.m); if (A.tap) cr.tap = true;
  fx(s, { k: 'ability', p: pid, t: 'u:' + cr.u, tgt: tgt || null }); log(s, `${C[cr.id].n} nutzt ihre Fähigkeit.`);
  applyEffect(s, pid, A.e, T, cr.u); cleanup(s);
}
function useHero(s, pid, tgt) { // Heldenkraft einsetzen
  const P = s.pl[pid], h = P.hero; if (!h) return 'Dieses Deck hat keinen Helden.';
  if (s.turn !== pid || s.phase !== 'main') return 'Die Heldenkraft setzt du in deiner Hauptphase ein.';
  if (h.cd > 0) return `Die Heldenkraft ist erst in ${h.cd} Zug${h.cd > 1 ? 'en' : ''} bereit.`;
  const H = K.HEROES[h.id], e = H.e; let T = {};
  if (e.tg) { if (!anyTarget(s, pid, e)) return 'Dafür gibt es gerade kein Ziel.'; T = validTarget(s, pid, e, tgt); if (!T) return 'Wähle ein gültiges Ziel.'; }
  h.cd = H.cd; fx(s, { k: 'heropow', p: pid, id: h.id, tgt: tgt || null });
  log(s, `${H.art} ${H.n} setzt ${H.pow} ein!`);
  applyEffect(s, pid, e, T, null); cleanup(s);
}

/* ---------- Kampf ---------- */
const canAttack = c => !c.tap && !c.sick && !has(c, 'mauer') && !has(c, 'bann') && c.a > 0;
const canBlock = (b, a) => !b.tap && !has(b, 'bann') && (!has(a, 'flug') || has(b, 'flug') || has(b, 'reich'));
const fastOk = (s, pid) => s.pl[pid].hand.some(h => fast(C[h.id]) && canPay(s.pl[pid], C[h.id].m)) || s.pl[pid].board.some(c => C[c.id].act && !c.tap && !c.sick && canPay(s.pl[pid], C[c.id].act.m));
function attack(r, pid, list) {
  const s = r.state, P = s.pl[pid];
  if (s.attacked) return 'Du hast in diesem Zug schon angegriffen.';
  const att = [...new Set(list.map(Number))].map(u => P.board.find(c => c.u === u)).filter(Boolean);
  if (!att.length) return 'Wähle zuerst Angreifer.';
  if (att.some(c => !canAttack(c))) return 'Eine dieser Kreaturen kann gerade nicht angreifen.';
  s.attacked = true; s.atk = att.map(c => c.u); s.bl = [];
  for (const c of att) if (!has(c, 'wach')) c.tap = true;
  fx(s, { k: 'attack', us: s.atk.slice() });
  log(s, `${s.nm[pid]} greift mit ${att.length} Kreatur${att.length > 1 ? 'en' : ''} an!`);
  const foe = foeOf(s, pid);
  if (!s.pl[foe].board.some(b => att.some(a => canBlock(b, a))) && !fastOk(s, foe)) { toTrick(r); return; }
  s.phase = 'block';
  if (foe === BOT) schedule(r, 1100, () => { botBlock(s); if (s.smart) botInstant(s, BOT, 'block'); toTrick(r); });
  else if (!s.bot) setTimer(r, BLOCK_MS, () => toTrick(r));
}
function toTrick(r) { // nach den Blocks: Angreifer darf noch Kampftricks spielen
  const s = r.state; if (s.phase === 'end') return;
  const pid = s.turn;
  if (!s.atk.some(u => findCre(s, u)) || !fastOk(s, pid)) { resolve(r); afterResolve(r); return; }
  s.phase = 'trick';
  if (pid === BOT) schedule(r, 900, () => { if (s.smart) botInstant(s, BOT, 'trick'); resolve(r); afterResolve(r); });
  else if (!s.bot) setTimer(r, 20e3, () => { resolve(r); afterResolve(r); });
}
function setBlocks(s, pid, pairs) { // pairs: [[blocker, angreifer], …]
  const P = s.pl[pid], cnt = {}, out = [];
  for (const [bu, au] of (pairs || []).slice(0, 14)) {
    const B = P.board.find(c => c.u === Number(bu)), A = s.atk.includes(Number(au)) ? findCre(s, Number(au)) : null;
    if (!B || !A || !canBlock(B, A)) return 'Dieser Block geht nicht.';
    cnt[B.u] = (cnt[B.u] || 0) + 1; if (cnt[B.u] > (has(B, 'wache') ? 2 : 1)) return 'Nur Kreaturen mit Wache dürfen zwei Angreifer blocken.';
    if (out.some(([b, a]) => b === B.u && a === A.u)) continue;
    out.push([B.u, A.u]);
  }
  for (const u of s.atk) { const A = findCre(s, u); const n = out.filter(([, a]) => a === u).length; if (A && has(A, 'bedroh') && n === 1) return `${C[A.id].n} ist bedrohlich – blocke sie mit mindestens zwei Kreaturen oder gar nicht.`; }
  s.bl = out; return null;
}
function resolve(r) {
  const s = r.state, pid = s.turn, foe = foeOf(s, pid), F2 = s.pl[foe];
  const done = new Set(); // Blocker mit zwei Blocks teilen nur einmal Schaden aus
  for (const u of s.atk) {
    const A = findCre(s, u); if (!A || A.o !== pid || A.frz) continue; // eingefrorene Angreifer fallen aus
    const Bs = s.bl.filter(([, a]) => a === u).map(([b]) => F2.board.find(c => c.u === b)).filter(Boolean);
    if (!Bs.length) {
      if (!alive(A)) continue;
      fx(s, { k: 'hit', from: A.u, to: 'f:' + foe });
      const n = hitFace(s, foe, A.a, A.u); if (has(A, 'saug')) heal(s, pid, n);
      continue;
    }
    fx(s, { k: 'hit', from: A.u, to: 'u:' + Bs[0].u });
    const aStrike = () => { // Angreifer verteilt Schaden der Reihe nach, Rest bei Trampelschaden an den Spieler
      let left = A.a, dealt = 0;
      const live = Bs.filter(alive);
      for (const B of live) { if (left <= 0) continue; const need = B.shield ? 1 : has(A, 'gift') ? 1 : Math.max(1, hpLeft(B)), give = B === live[live.length - 1] && !has(A, 'durch') ? left : Math.min(left, need); left -= give; dealt += hitCre(s, B, give, A); }
      if (has(A, 'durch') && left > 0) dealt += hitFace(s, foe, left, A.u);
      if (has(A, 'saug')) heal(s, pid, dealt);
    };
    const bStrike = B => { if (done.has(B.u)) return; done.add(B.u); const n = hitCre(s, A, B.a, B); if (has(B, 'saug')) heal(s, foe, n); };
    // 1. Erstschlag-Schritt
    if (has(A, 'erst') && alive(A)) aStrike();
    for (const B of Bs) if (has(B, 'erst') && alive(B)) bStrike(B);
    // 2. normaler Schaden: alle, die jetzt noch leben, teilen GLEICHZEITIG aus
    const aGo = !has(A, 'erst') && alive(A), bGo = Bs.filter(B => !has(B, 'erst') && alive(B));
    if (aGo) aStrike();
    for (const B of bGo) bStrike(B);
  }
  s.atk = []; s.bl = [];
  if (s.phase !== 'end') s.phase = 'main';
  cleanup(s);
}
function afterResolve(r) { const s = r.state; if (s.phase !== 'main') return; if (s.turn === BOT) schedule(r, 1000, () => botStep(r)); else if (!s.bot) setTimer(r, Math.max(15e3, s.turnEnd - Date.now()), () => endTurn(r)); }
function setTimer(r, ms, fn) { const s = r.state; s.dl = Date.now() + ms; schedule(r, ms, () => { s.dl = 0; fn(); }); }

function startTurn(r, pid) {
  const s = r.state, P = s.pl[pid];
  s.turn = pid; s.phase = 'main'; s.attacked = false; s.atk = []; s.bl = []; s.n++;
  P.landPlayed = false;
  for (const l of P.lands) l.tap = false; // Enttappen
  for (const c of P.board) {
    c.sick = false; if (c.frz) c.frz = false; else c.tap = false;
    const w = C[c.id].wachs; if (w) { c.a += w[0]; c.h += w[1]; fx(s, { k: 'buff', t: 'u:' + c.u, a: w[0], h: w[1] }); }
  }
  if (P.hero && P.hero.cd > 0) P.hero.cd--; // Heldenkraft lädt auf
  if (bon(s, pid, 'licht')) heal(s, pid, 1); // Morgenröte
  if (!(s.n === 1)) draw(s, pid, 1); // wer beginnt, zieht im ersten Zug nicht
  fx(s, { k: 'turn', p: pid });
  if (cleanup(s)) return;
  if (pid === BOT) schedule(r, 1300, () => botStep(r));
  else if (!s.bot) { s.turnEnd = Date.now() + TURN_MS; setTimer(r, TURN_MS, () => endTurn(r)); }
  else { s.dl = 0; if (r.timer) { clearTimeout(r.timer); r.timer = null; } }
}
function endTurn(r) {
  const s = r.state; if (s.phase === 'end' || s.phase === 'mull' || s.phase === 'pick') return;
  if (s.phase === 'block' || s.phase === 'trick') resolve(r);
  if (s.phase === 'end') return;
  for (const pid of s.p) for (const c of s.pl[pid].board) c.d = 0; // Schaden heilt am Zugende
  startTurn(r, foeOf(s, s.turn));
}

/* ---------- Bot ---------- */
function botTargetFor(s, me, e) {
  const foe = foeOf(s, me), FB = s.pl[foe].board.filter(c => fits(s, me, e, c)), MB = s.pl[me].board;
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
    case 'freeze': { const b = big(FB.filter(c => !c.frz && !c.tap)); return b ? 'u:' + b.u : null; }
    case 'buff': {
      if ((e.kw || []).includes('bann')) { const b = big(FB.filter(c => !has(c, 'bann'))); return b && crVal(b) >= 4 ? 'u:' + b.u : null; }
      const b = MB.filter(c => !has(c, 'bann')).sort((a, b2) => (canAttack(b2) - canAttack(a)) || crVal(b2) - crVal(a))[0]; return b ? 'u:' + b.u : null;
    }
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
function botLand(s, me) { // passendes Land ausspielen
  const P = s.pl[me]; if (P.landPlayed) return false;
  const lands = P.hand.map((h, i) => ({ i, c: C[h.id] })).filter(x => x.c.t === 'l'); if (!lands.length) return false;
  const have = {}; for (const l of P.lands) have[l.col] = (have[l.col] || 0) + 1;
  const need = demand(P); const pick = lands.sort((a, b) => ((need[b.c.col] || 0) - (have[b.c.col] || 0)) - ((need[a.c.col] || 0) - (have[a.c.col] || 0)))[0];
  return playLand(s, me, pick.i) === undefined;
}
function botPlay(r, me) { // eine Aktion pro Schritt. true = es wurde etwas gemacht
  const s = r.state, foe = foeOf(s, me), P = s.pl[me];
  if (botLand(s, me)) return true;
  if (P.hero && P.hero.cd === 0) {
    const e = K.HEROES[P.hero.id].e; let t, ok = true;
    if (e.tg) { t = botTargetFor(s, me, e); if (!t && e.tg === 'any') t = 'f:' + foe; ok = !!t; }
    else if (e.k === 'shieldAll') ok = P.board.length >= 1 || P.life < s.maxLife[me];
    if (ok && useHero(s, me, t) === undefined) return true;
  }
  const order = P.hand.map((h, i) => ({ i, c: C[h.id] })).filter(x => x.c.t !== 'l' && canPay(P, x.c.m)).sort((a, b) => b.c.c - a.c.c);
  for (const { i, c } of order) {
    if (s.smart && c.inst && c.e && (c.e.k === 'buff' || c.e.k === 'dmg') && P.board.length && Math.random() < 0.6) continue; // für den gegnerischen Zug aufheben
    let tgt;
    if (c.e && c.e.tg && anyTarget(s, me, c.e)) {
      tgt = botTargetFor(s, me, c.e);
      if (!tgt) { if (c.t !== 'k') continue; const any = s.p.flatMap(x => s.pl[x].board).find(x => fits(s, me, c.e, x)); tgt = c.e.tg === 'any' ? 'f:' + foe : any ? 'u:' + any.u : undefined; }
    }
    else if (c.e && c.e.tg && c.t !== 'k') continue;
    else if (!botWants(s, me, c)) continue;
    if (play(s, me, i, tgt) === undefined) return true;
  }
  return false;
}
function botAbilities(s, me) { // ⟳-Fähigkeiten nicht-angreifender Kreaturen nutzen
  const P = s.pl[me];
  for (const c of P.board) {
    const A = C[c.id].act; if (!A || c.tap || (c.sick && !has(c, 'eile')) || (A.m && !canPay(P, A.m))) continue;
    let t; if (A.e.tg) { t = botTargetFor(s, me, A.e); if (!t) continue; }
    else if (A.e.k === 'heal' && P.life >= s.maxLife[me]) continue;
    if (ability(s, me, c.u, t) === undefined) return true;
  }
  return false;
}
function botStep(r) {
  const s = r.state; if (s.phase !== 'main' || s.turn !== BOT) return;
  const me = BOT, foe = foeOf(s, me), P = s.pl[me];
  if (botPlay(r, me)) { if (s.phase === 'main') schedule(r, 1000, () => botStep(r)); return; }
  if (!s.attacked) {
    const mine = P.board.filter(canAttack).filter(c => !(C[c.id].act && C[c.id].act.tap && c.a <= 1)), blockers = s.pl[foe].board.filter(b => !b.tap && !has(b, 'bann'));
    const rest = mine.map(c => c.a).sort((x, y) => y - x).slice(blockers.length).reduce((n, x) => n + x, 0);
    const allIn = rest >= s.pl[foe].life;
    const go = mine.filter(a => { const bl = blockers.filter(b => canBlock(b, a)); if (!bl.length) return true; if (allIn) return true; if (has(a, 'bedroh') && bl.length < 2) return true;
      return !bl.some(b => (b.a >= hpLeft(a) || has(b, 'gift')) && !a.shield && !(has(a, 'erst') && a.a >= hpLeft(b))) || bl.every(b => crVal(b) >= crVal(a) && b.a >= hpLeft(a) && (a.a >= hpLeft(b) || has(a, 'gift'))); });
    if (s.dumb && Math.random() < s.dumb) go.splice(0, Math.ceil(go.length / 2));
    if (go.length) { attack(r, me, go.map(c => c.u)); if (s.phase === 'main') schedule(r, 1300, () => botStep(r)); return; }
    s.attacked = true;
  }
  if (botAbilities(s, me)) { if (s.phase === 'main') schedule(r, 900, () => botStep(r)); return; }
  endTurn(r);
}
function botBlock(s) {
  const me = BOT, P = s.pl[me];
  const atts = s.atk.map(u => findCre(s, u)).filter(Boolean).sort((a, b) => b.a - a.a);
  const free = P.board.filter(b => !b.tap && !has(b, 'bann')), uses = {}, pairs = [];
  const capN = b => (has(b, 'wache') ? 2 : 1), canUse = b => (uses[b.u] || 0) < capN(b);
  const use = (b, a) => { uses[b.u] = (uses[b.u] || 0) + 1; pairs.push([b.u, a.u]); };
  let incoming = atts.reduce((n, a) => n + a.a, 0);
  const kills = (x, y) => (x.a >= hpLeft(y) || (has(x, 'gift') && x.a > 0)) && !y.shield;
  for (const a of atts) {
    const opts = free.filter(b => canUse(b) && canBlock(b, a));
    if (has(a, 'bedroh')) { // braucht zwei Blocker
      const two = opts.filter(b => !uses[b.u]).sort((x, y) => y.a - x.a).slice(0, 2);
      if (two.length === 2 && two[0].a + two[1].a >= hpLeft(a) && (s.smart || incoming >= P.life)) { use(two[0], a); use(two[1], a); incoming -= a.a; }
      continue;
    }
    const byVal = opts.slice().sort((x, y) => crVal(x) - crVal(y));
    const best = byVal.find(b => kills(b, a) && !kills(a, b)) || byVal.find(b => !kills(a, b)) || byVal.find(b => kills(b, a) && crVal(a) >= crVal(b)); // guter Block, sonst fairer Tausch
    if (best) { use(best, a); incoming -= a.a; continue; }
    if (s.smart) {
      const two = opts.filter(b => !uses[b.u]).sort((x, y) => y.a - x.a).slice(0, 2);
      if (two.length === 2 && two[0].a + two[1].a >= hpLeft(a) && !a.shield && crVal(a) >= Math.min(crVal(two[0]), crVal(two[1])) + 2) { use(two[0], a); use(two[1], a); incoming -= a.a; }
    }
  }
  const must = new Set(); // Blocks, die das Überleben sichern – die lässt auch ein schwacher Bot nicht weg
  const danger = () => incoming >= P.life || P.life - incoming <= 5 || incoming >= Math.ceil(P.life * 0.6);
  for (const a of atts) { // viel Schaden oder tödlich: auch Kreaturen opfern, die größten Angreifer zuerst
    if (!danger()) break;
    if (pairs.some(([, x]) => x === a.u) || has(a, 'bedroh') || a.a <= 0) continue;
    const lethal = incoming >= P.life;
    const b = free.filter(x => canUse(x) && canBlock(x, a) && (lethal || kills(x, a) || crVal(x) <= crVal(a) + 1 || x.a === 0)).sort((x, y) => crVal(x) - crVal(y))[0];
    if (b) { use(b, a); if (lethal || s.smart) must.add(b.u + ':' + a.u); incoming -= a.a; }
  }
  for (const [b, a] of pairs) if (incoming >= P.life) must.add(b + ':' + a);
  let bl = s.dumb ? pairs.filter(([b, a]) => must.has(b + ':' + a) || Math.random() >= s.dumb) : pairs;
  for (const u of s.atk) { const A = findCre(s, u); if (A && has(A, 'bedroh') && bl.filter(([, a]) => a === u).length === 1) bl = bl.filter(([, a]) => a !== u); }
  s.bl = bl;
  if (s.bl.length) log(s, `${s.nm[BOT]} blockt${s.bl.length > 1 ? ` (${s.bl.length} Blocks)` : ''}.`);
}
function botInstant(s, me, when) { // schlaue Bots: Spontanzauber im Kampf
  const P = s.pl[me];
  for (let i = 0; i < P.hand.length; i++) {
    const c = C[P.hand[i].id]; if (!c.inst || !canPay(P, c.m) || !c.e) continue;
    const e = c.e; let t = null;
    if (e.k === 'buff' && e.tg === 'own') {
      for (const [b, a] of s.bl) { const M = findCre(s, when === 'block' ? b : a), O = findCre(s, when === 'block' ? a : b); if (!M || !O) continue;
        if (O.a >= hpLeft(M) && O.a < hpLeft(M) + e.h) { t = 'u:' + M.u; break; } }
    } else if (e.k === 'dmg') {
      const n = dmgN(s, me, e.n), pool = when === 'block' ? s.atk.map(u => findCre(s, u)) : s.bl.map(([b]) => findCre(s, b));
      const x = pool.filter(Boolean).filter(c => !c.shield && hpLeft(c) <= n && fits(s, me, e, c)).sort((a, b) => crVal(b) - crVal(a))[0];
      if (x && crVal(x) >= 4) t = 'u:' + x.u;
    } else if (e.k === 'freeze' && when === 'block') { const x = s.atk.map(u => findCre(s, u)).filter(Boolean).filter(c => fits(s, me, e, c)).sort((a, b) => b.a - a.a)[0]; if (x && x.a >= 4) t = 'u:' + x.u; }
    if (t && play(s, me, i, t) === undefined) { log(s, `⚡ Spontanzauber: ${c.n}!`); return true; }
  }
  return false;
}
function botMull(P) { const lands = P.hand.filter(h => C[h.id].t === 'l').length; return lands < 2 || lands > 5; }

/* ---------- Decks ---------- */
function deckOptions(r, pid) {
  // Keine Leihdecks: nur eigene Decks. Ohne Konto (oder ohne Deck) gibt es nur das Abenteuer-Startdeck.
  const out = [], acc = API && API.accOf(pid);
  if (acc) (API.decks(acc) || []).forEach((d, i) => out.push({ id: 'my:' + i, n: d.n, hero: d.hero || null, th: K.mainTheme(d.cards), bon: K.bonusesOf(d.cards), ok: !d.err, err: d.err || null, mine: 1 }));
  if (!out.some(o => o.ok)) out.push({ id: 'base:abent', n: 'Abenteuer-Startdeck', th: 'abent', bon: K.bonusesOf(DECKS.abent), hero: 'abent', mine: 1 });
  return out;
}
function setDeck(r, pid, id) {
  const s = r.state, P = s.pl[pid];
  let cards = null, name = '', hero = null;
  if (id === 'zufall') id = pid === BOT ? 'base:' + (k => k[Math.floor(Math.random() * k.length)])(Object.keys(DECKS)) : ((s.opts[pid] || []).find(o => o.ok !== false) || { id: 'base:abent' }).id;
  if (pid !== BOT && id.startsWith('base:') && !(s.opts[pid] || []).some(o => o.id === id)) return 'Leihdecks gibt es nicht mehr – spiel mit deinem eigenen Deck.';
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
function begin(r) { // Decks mischen, Starthand 7, dann Mulligan-Entscheidung
  const s = r.state;
  for (const pid of s.p) { const P = s.pl[pid]; const deck = []; for (const [id, n] of Object.entries(P.cards)) for (let i = 0; i < n; i++) deck.push(id); P.deck = shuffle(deck); draw(s, pid, 7 + (bon(s, pid, 'flut') ? 1 : 0)); }
  s.first = s.p[Math.random() < 0.5 ? 0 : 1];
  s.phase = 'mull'; s.mull = {};
  log(s, `${s.nm[s.first]} beginnt. Behaltet eure Starthand oder nehmt einen Mulligan.`);
  if (s.p.includes(BOT)) { const P = s.pl[BOT]; if (botMull(P)) mulligan(s, BOT); s.mull[BOT] = 1; }
  if (!s.bot) setTimer(r, 40e3, () => { for (const pid of s.p) s.mull[pid] = 1; afterMull(r); });
}
function mulligan(s, pid) { const P = s.pl[pid]; const n = P.hand.length - 1; P.deck.push(...P.hand.map(h => h.id)); P.hand = []; shuffle(P.deck); draw(s, pid, n); s.mulled = s.mulled || {}; s.mulled[pid] = 1; log(s, `${s.nm[pid]} nimmt einen Mulligan (${n} Karten).`); }
function afterMull(r) { const s = r.state; if (s.phase !== 'mull' || !s.p.every(p => s.mull[p])) return; s.n = 0; startTurn(r, s.first); }

module.exports = {
  title: 'Kristallduell', min: 2, seats: 2,
  setApi(a) { API = a; },
  solo: (r, m) => !!(m && m.bot),
  start(r, m = {}) {
    if (r.timer) clearTimeout(r.timer);
    const old = r.state, ids = r.players.map(p => p.id);
    const arena = m.bot && m.arena != null && K.ARENAS[Number(m.arena)] ? Number(m.arena) : null; // Trophäenkampf
    const p = m.bot ? [ids[0], BOT] : (old && old.p && old.p.every(x => ids.includes(x)) && !old.bot ? [old.p[1], old.p[0]] : ids.slice(0, 2));
    const pl = {}; for (const id of p) pl[id] = { life: LIFE, deck: [], hand: [], board: [], lands: [], landPlayed: false, grave: [], dead: [], fat: 0, fac: null, bon: [], lv: {}, cards: null, deckName: '' };
    const nm = { [p[0]]: nameOf(r, p[0]), [p[1]]: nameOf(r, p[1]) };
    const maxLife = { [p[0]]: LIFE, [p[1]]: LIFE };
    r.state = { p, pl, nm, maxLife, phase: 'pick', turn: null, n: 0, attacked: false, atk: [], winner: null, draw: false, log: ['Wählt euer Deck.'], fx: [], seq: 0, uc: 0, dl: 0, turnEnd: 0,
      score: old && old.score && !old.bot === !m.bot && old.arena === arena ? old.score : {}, bot: !!m.bot, lvl: 0, arena, mode: 'klassisch', bl: [], smart: arena != null ? K.ARENAS[arena].smart : false,
      lastDeck: (old && old.lastDeck) || {}, st: {}, rew: null, paid: false, opts: {}, mull: {}, dumb: !m.bot ? 0 : arena != null ? K.ARENAS[arena].bot : 0.2 };
    const s = r.state;
    for (const id of p) s.st[id] = { spell: 0, summon: 0, kill: 0 };
    for (const id of p) if (id !== BOT) s.opts[id] = deckOptions(r, id);
    if (m.bot && arena != null) { // Trophäenkampf: zufälliges Bot-Deck aus dem Kampfgebiet
      const A = K.ARENAS[arena], list = K.BOTDECKS[arena], d = list[Math.floor(Math.random() * list.length)], P = pl[BOT];
      const NAMES = ['Bruno', 'Greta', 'Kalle', 'Mira', 'Ole', 'Frieda', 'Hugo', 'Lotta', 'Bernd', 'Ida', 'Theo', 'Wanda', 'Rudi', 'Elsa'];
      P.cards = d.cards; P.deckName = d.n; P.fac = K.mainTheme(d.cards); P.bon = K.bonusesOf(d.cards); P.lv = {}; for (const k of Object.keys(C)) P.lv[k] = A.lv;
      P.hero = arena >= 1 && K.HEROES[P.fac] ? { id: P.fac, cd: K.HEROES[P.fac].cd } : null; nm[BOT] = NAMES[Math.floor(Math.random() * NAMES.length)]; P.art = A.e;
    } else if (m.bot) setDeck(r, BOT, 'zufall');
    r.status = 'playing';
    if (!m.bot) setTimer(r, 60e3, () => { for (const id of s.p) if (!s.pl[id].cards) setDeck(r, id, s.lastDeck[id] && !setDeckCheck(r, id, s.lastDeck[id]) ? s.lastDeck[id] : 'zufall'); begin(r); });
  },
  onLeave(r, pid, name) {
    const s = r.state; if (!s || r.status !== 'playing' || !s.p.includes(pid)) return;
    if (r.timer) clearTimeout(r.timer); r.timer = null;
    const started = s.phase !== 'pick' && s.phase !== 'mull';
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
    if (s.phase === 'mull') {
      if (s.mull[pid]) return 'quiet';
      if (a.type === 'mull') { if ((s.mulled || {})[pid]) return 'Nur ein Mulligan pro Duell.'; mulligan(s, pid); return; }
      if (a.type === 'keep') { s.mull[pid] = 1; afterMull(r); return; }
      return 'quiet';
    }
    if (s.phase === 'end') return 'quiet';
    if (a.type === 'block') {
      if (s.phase !== 'block' || s.turn === pid) return 'quiet';
      const pairs = Array.isArray(a.b) ? a.b : Object.entries(a.b || {}).map(([b, x]) => [b, x]);
      const e = setBlocks(s, pid, pairs); if (e) return e;
      if (s.bl.length) log(s, `${s.nm[pid]} blockt${s.bl.length > 1 ? ` (${s.bl.length} Blocks)` : ''}.`);
      toTrick(r); return;
    }
    if (a.type === 'play') return play(s, pid, Number(a.i), a.t);
    if (a.type === 'ability') return ability(s, pid, a.u, a.t);
    if (a.type === 'go') { if (s.phase !== 'trick' || s.turn !== pid) return 'quiet'; resolve(r); afterResolve(r); return; }
    if (s.turn !== pid) return 'Du bist gerade nicht dran.';
    if (s.phase !== 'main') return 'quiet';
    if (a.type === 'hero') return useHero(s, pid, a.t);
    if (a.type === 'attack') return attack(r, pid, Array.isArray(a.us) ? a.us.slice(0, BOARD_MAX) : []);
    if (a.type === 'end') { endTurn(r); return; }
    return 'quiet';
  },
  winners(r) { const s = r.state; return s && s.winner && s.winner !== BOT ? [s.winner] : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    const mine = s.p.includes(pid), me = mine ? pid : s.p[0], foe = foeOf(s, me), pick = s.phase === 'pick';
    const pub = id => { const P = s.pl[id]; return { hero: P.hero && !(pick && id !== pid) ? { id: P.hero.id, cd: P.hero.cd } : null, life: P.life, max: s.maxLife[id], deck: P.deck.length, hand: P.hand.length,
      board: P.board.map(c => ({ u: c.u, id: c.id, a: c.a, h: c.h, d: c.d, kw: c.kw, sick: c.sick, tap: c.tap, frz: c.frz, shield: c.shield, auras: (c.auras || []).map(x => x.id) })),
      lands: P.lands.map(l => ({ u: l.u, col: l.col, tap: l.tap })), landPlayed: P.landPlayed, grave: P.grave.length, graveTop: P.grave.slice(-12),
      fac: pick && id !== pid ? (P.cards ? '?' : null) : P.fac, bon: pick && id !== pid ? [] : P.bon, dn: pick && id !== pid ? '' : P.deckName, art: P.art || null, lv: pick ? {} : P.lv, fat: P.fat }; };
    return { phase: s.phase, p: s.p, me, foe, mine, nm: s.nm, turn: s.turn, n: s.n, attacked: s.attacked, atk: s.atk, bl: s.bl, mode: 'klassisch', arena: s.arena, first: s.first,
      mull: s.mull, mulled: s.mulled || {}, winner: s.winner, draw: s.draw, log: s.log, fx: s.fx, seq: s.seq, score: s.score, bot: s.bot, lvl: s.lvl,
      left: s.dl ? Math.max(0, s.dl - Date.now()) : null, lastDeck: s.lastDeck[pid] || null, opts: pick && mine ? s.opts[pid] || [] : null, rew: s.rew && s.rew[pid] || null,
      P: { [me]: pub(me), [foe]: pub(foe) }, hand: mine ? s.pl[me].hand : [] };
  },
};
function setDeckCheck(r, pid, id) { if (!id.startsWith('my:')) return null; const acc = API && API.accOf(pid), d = acc && (API.decks(acc) || [])[Number(id.slice(3))]; return !d || d.err ? 'x' : null; }
