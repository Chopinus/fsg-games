// Kristallduell: Sammlung, Packs, Decks, Funken, Tagesaufgaben und Bot-Leiter (gespeichert im Hub-Konto unter acc.kd)
const K = require('./duell_karten.js');
const { C, DECKS, RAR, PACK, F, LADDER } = K;
const day = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
const POOL = {}; // Thema -> Seltenheit -> Karten
for (const [id, c] of Object.entries(C)) { if (c.tok || c.t === 'l') continue; ((POOL[c.f] = POOL[c.f] || {})[c.r] = POOL[c.f][c.r] || []).push(id); }
const QUESTS = [
  { k: 'win', g: 2, t: 'Gewinne 2 Duelle' },
  { k: 'play', g: 3, t: 'Spiele 3 Duelle' },
  { k: 'spell', g: 6, t: 'Wirke 6 Zauber' },
  { k: 'summon', g: 10, t: 'Beschwöre 10 Kreaturen' },
  { k: 'kill', g: 8, t: 'Zerstöre 8 gegnerische Kreaturen' },
  { k: 'bon', g: 1, t: 'Gewinne mit aktivem Themen-Bonus' },
  { k: 'pvp', g: 1, t: 'Spiele ein Duell gegen einen echten Gegner' },
];
const Q_REWARD = 60, FIRST_WIN = 60;

// Start: jeder besitzt das Abenteuer-Startdeck (40 Karten, Grundländer gehören ohnehin allen) und den Abenteuer-Helden.
const START_DECK = DECKS.abent, START_NAME = 'Abenteuer-Startdeck';
const fresh = () => ({ v: 9, tr: 0, trMax: 0, road: 0, fp: {}, heroes: { abent: 1 }, c: Object.fromEntries(Object.entries(START_DECK).filter(([id]) => C[id].t !== 'l')), welcome: 0, f: 300, st: 0, pe: 0, pl: 0, free: 0,
  decks: [{ n: START_NAME, cards: { ...START_DECK }, hero: 'abent' }], lad: 0, packs: 0, d: '', dq: [], dbw: 0, dpw: 0, dfw: false });
function init(acc) {
  if (!acc.kd) acc.kd = fresh();
  if ((acc.kd.v || 0) < 8) { // Umbau auf Länder und 40-Karten-Decks: alle starten neu. 
    acc.kd = fresh();
  }
  if ((acc.kd.v || 0) < 9) { // Helden-Auswahl zurückgenommen: frei gewählte Helden wieder entfernen
    const k = acc.kd; k.v = 9;
    if (!k.heroPick && (k.packs || 0) <= 15) for (const h of Object.keys(k.heroes || {})) if (h !== 'abent') delete k.heroes[h];
    delete k.heroPick;
    for (const d of k.decks || []) if (d.hero && !k.heroes[d.hero]) d.hero = 'abent';
  }
  const k = acc.kd, d = day();
  if (k.d !== d) { // neuer Tag: neue Aufgaben
    let h = 0; for (const ch of d + (acc.name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = QUESTS.slice(), pick = [];
    while (pick.length < 3) { h = (h * 1103515245 + 12345) >>> 0; pick.push(pool.splice(h % pool.length, 1)[0]); }
    k.d = d; k.dq = pick.map(q => ({ k: q.k, g: q.g, t: q.t, n: 0, done: false })); k.dbw = 0; k.dpw = 0; k.dfw = false;
  }
  return k;
}
const levels = acc => { const k = init(acc), out = {}; for (const [id, n] of Object.entries(k.c)) out[id] = K.levelOf(id, n); return out; };
const deckList = acc => init(acc).decks.map(d => ({ n: d.n, cards: d.cards, hero: d.hero && (acc.kd.heroes || {})[d.hero] ? d.hero : null, err: K.checkDeck(d.cards, acc.kd.c) }));
function state(acc) {
  const k = init(acc);
  return { c: k.c, heroPick: 0, heroes: k.heroes || {}, welcome: k.welcome || 0, f: k.f, st: k.st, pe: k.pe, pl: k.pl, free: k.free, fp: k.fp || {}, tr: k.tr || 0, trMax: k.trMax || 0, ar: K.arenaOf(k.trMax || 0), lad: k.lad, packs: k.packs, decks: deckList(acc), dq: k.dq, dfw: k.dfw };
}
function rollRarity(o) { o = o || PACK.odds; t = o.g + o.s + o.e + o.l; let x = Math.random() * t; for (const r of ['l', 'e', 's', 'g']) { if (x < o[r]) return r; x -= o[r]; } return 'g'; }
function pickCard(th, r, own, taken, cre) {
  const themes = th === 'mix' || th === 'start' ? Object.keys(F) : [th];
  let list = themes.flatMap(f => (POOL[f] && POOL[f][r]) || []);
  if (cre) list = list.filter(id => C[id].t === 'k');
  const fresh = list.filter(id => !taken.has(id)); if (fresh.length) list = fresh; // keine doppelte Karte im selben Pack
  const unseen = list.filter(id => !own[id]); if (unseen.length && Math.random() < 0.5) list = unseen; // fehlende Karten etwas bevorzugen
  return list[Math.floor(Math.random() * list.length)];
}
function addCards(k, th, rs, creSlots) {
  const taken = new Set();
  return rs.map((r, i) => {
    const id = pickCard(th, r, k.c, taken, i < creSlots); taken.add(id); const before = k.c[id] || 0, cap = RAR[r].lv[4];
    let dust = 0;
    if (before >= cap) { dust = RAR[r].dust; k.st += dust; } else k.c[id] = before + 1;
    const n = k.c[id] || 0;
    return { id, r, isNew: before === 0, n, lv: K.levelOf(id, n), up: K.levelOf(id, n) > K.levelOf(id, before), dust };
  });
}
function welcomePack(acc, k) { // 4 gewöhnliche + 1 seltene/epische, davon mindestens 3 Kreaturen
  if (!(k.welcome > 0)) return [400, { error: 'Du hast alle Willkommens-Packs schon geöffnet.' }];
  k.welcome--;
  const rs = ['g', 'g', 'g', 'g', Math.random() < 0.2 ? 'e' : 's'];
  const cards = addCards(k, 'start', rs, 3);
  const order = { g: 0, s: 1, e: 2, l: 3 }; cards.sort((a, b) => order[a.r] - order[b.r]);
  return [200, { cards, pity: null, free: true, welcome: true, state: state(acc) }];
}
function openPack(acc, th, type) {
  const k = init(acc);
  if (th === 'start') return welcomePack(acc, k);
  if (th !== 'mix' && !F[th]) return [400, { error: 'Unbekanntes Pack.' }];
  const T = K.PACKS[type] ? type : 'klein', P = K.PACKS[T], ai = K.arenaOf(k.trMax || 0), A = K.ARENAS[ai];
  if (ai < P.min) return [400, { error: `${P.n} gibt es ab dem Kampfgebiet ${K.ARENAS[P.min].e} ${K.ARENAS[P.min].n}.` }];
  k.fp = k.fp || {};
  const free = T === 'klein' ? k.free > 0 : (k.fp[T] || 0) > 0;
  if (!free && k.f < P.cost) return [400, { error: `Dafür brauchst du ${P.cost} Funken.` }];
  if (free) { if (T === 'klein') k.free--; else k.fp[T]--; } else k.f -= P.cost;
  const rs = Array.from({ length: P.size }, () => rollRarity(A.odds)); // Chancen steigen mit dem Kampfgebiet
  const rank = { g: 0, s: 1, e: 2, l: 3 }, need = rank[P.sure];
  if (!rs.some(r => rank[r] >= need)) rs[P.size - 1] = P.sure;
  if (P.sure2 && rs.filter(r => rank[r] >= need).length < 2) rs[P.size - 2] = P.sure;
  const forceL = k.pl + 1 >= PACK.pityL && !rs.includes('l'), forceE = k.pe + 1 >= PACK.pityE && !rs.some(r => r === 'e' || r === 'l');
  if (forceL) rs[0] = 'l'; else if (forceE) rs[0] = Math.random() < 0.2 ? 'l' : 'e';
  k.pe = rs.some(r => r === 'e' || r === 'l') ? 0 : k.pe + 1;
  k.pl = rs.includes('l') ? 0 : k.pl + 1;
  rs.sort((a, b) => rank[a] - rank[b]); // die besten zum Schluss aufdecken
  const cards = addCards(k, th, rs, 0);
  k.packs++;
  // Held: Chance steigt mit dem Kampfgebiet (Königspack ×2, Legendenpack ×3). Themenpack: Held des Themas, Kristallpack: zufällig.
  let hero = null;
  const hp = (A.hero / 100) * (T === 'koenig' ? 2 : T === 'legende' ? 3 : 1);
  if (Math.random() < hp) {
    const hid = th === 'mix' ? Object.keys(K.HEROES)[Math.floor(Math.random() * Object.keys(K.HEROES).length)] : th;
    if (K.HEROES[hid]) { k.heroes = k.heroes || {}; const dup = !!k.heroes[hid]; if (dup) k.st += 500; else k.heroes[hid] = 1; hero = { id: hid, dup, dust: dup ? 500 : 0 }; }
  }
  return [200, { cards, hero, type: T, pity: forceL ? 'l' : forceE ? 'e' : null, free, state: state(acc) }];
}
function craft(acc, id) {
  const k = init(acc), c = C[id]; if (!c || c.tok) return [400, { error: 'Unbekannte Karte.' }];
  const R = RAR[c.r], n = k.c[id] || 0;
  if (n >= R.lv[4]) return [400, { error: 'Diese Karte ist schon auf der höchsten Stufe.' }];
  if (k.st < R.craft) return [400, { error: `Dafür brauchst du ${R.craft} Sternenstaub.` }];
  k.st -= R.craft; k.c[id] = n + 1;
  return [200, { id, n: n + 1, lv: K.levelOf(id, n + 1), up: K.levelOf(id, n + 1) > K.levelOf(id, n), state: state(acc) }];
}
function saveDeck(acc, body) {
  const k = init(acc);
  const name = String(body.n || '').replace(/[<>]/g, '').trim().slice(0, 24) || 'Mein Deck';
  const cards = {};
  for (const [id, n] of Object.entries(body.cards || {})) { const c = C[id]; const m = Math.max(0, Math.min(c && c.t === 'l' ? 40 : K.MAX_COPIES, Number(n) | 0)); if (c && !c.tok && m) cards[id] = m; }
  const i = Number(body.i);
  const hero = body.hero && K.HEROES[body.hero] && (k.heroes || {})[body.hero] ? String(body.hero) : null;
  if (Number.isInteger(i) && i >= 0 && i < k.decks.length) k.decks[i] = { n: name, cards, hero };
  else { if (k.decks.length >= 8) return [400, { error: 'Mehr als 8 Decks gehen nicht – lösche zuerst eines.' }]; k.decks.push({ n: name, cards, hero }); }
  return [200, { state: state(acc), i: Number.isInteger(i) && i >= 0 && i < k.decks.length ? i : k.decks.length - 1 }];
}
function delDeck(acc, i) { const k = init(acc); if (!(i >= 0 && i < k.decks.length)) return [400, { error: 'Dieses Deck gibt es nicht.' }]; k.decks.splice(i, 1); return [200, { state: state(acc) }]; }

// Nach einem Duell (vom Spiel-Server aufgerufen)
function reward(acc, info) {
  const k = init(acc), lines = []; let f = 0;
  if ((info.turns || 0) < 4) return { f: 0, lines: ['Das Duell war zu kurz für eine Belohnung.'] };
  if (info.pvp) {
    if (info.win) { k.dpw++; const v = k.dpw <= 15 ? 50 : 10; f += v; lines.push(`Sieg gegen einen echten Gegner: +${v}`); }
    else if (info.draw) { f += 25; lines.push('Unentschieden: +25'); }
    else if (!info.left) { f += 15; lines.push('Duell gespielt: +15'); }
  } else if (info.arena == null) {
    if (info.win) { k.dbw++; const v = k.dbw <= 12 ? 20 + 3 * (info.lvl || 0) : 5; f += v; lines.push(`Sieg gegen den Bot: +${v}`); }
    else { f += 5; lines.push('Duell gespielt: +5'); }
  } else if (info.win) { const v = K.winCoins(info.arena); f += v; lines.push(`Sieg im Trophäenkampf: +${v}`); }
  if (info.win && !k.dfw) { k.dfw = true; f += FIRST_WIN; lines.push(`Erster Sieg des Tages: +${FIRST_WIN}`); }
  // Trophäen: Trophäenkämpfe gegen Bots und alle Duelle gegen echte Spieler
  let trd = 0, newArena = null;
  if (info.arena != null || info.pvp) {
    const before = k.tr || 0, ai = K.arenaOf(before), floor = K.ARENAS[ai].t;
    if (info.win) trd = 28 + Math.floor(Math.random() * 5);
    else if (!info.draw) trd = -Math.min(20, before - floor); // nie unter den Anfang des Kampfgebiets
    k.tr = before + trd;
    if (k.tr > (k.trMax || 0)) {
      const oldMax = k.trMax || 0; k.trMax = k.tr;
      if (K.arenaOf(k.trMax) > K.arenaOf(oldMax)) newArena = K.arenaOf(k.trMax);
      // Trophäenweg: Belohnung alle 100 Trophäen (nur beim ersten Erreichen)
      while ((k.road || 0) < Math.floor(k.trMax / 100)) {
        k.road = (k.road || 0) + 1; const m = k.road * 100, gate = K.ARENAS.findIndex(a => a.t > m - 100 && a.t <= m);
        if (gate > 0) { const t = gate <= 4 ? 'gross' : gate <= 8 ? 'koenig' : 'legende'; k.fp = k.fp || {}; k.fp[t] = (k.fp[t] || 0) + 1; lines.push(`🏟️ Neues Kampfgebiet ${K.ARENAS[gate].e} ${K.ARENAS[gate].n}: Gratis-${K.PACKS[t].n}!`); }
        else if (k.road % 5 === 0) { k.free++; k.st += 100; lines.push(`🛤️ Trophäenweg ${m}: Gratis-Pack und +100 ✨`); }
        else { const v = 40 + 10 * K.arenaOf(m); f += v; lines.push(`🛤️ Trophäenweg ${m}: +${v} 🪙`); }
      }
    }
    if (trd) lines.unshift(`${trd > 0 ? '+' : ''}${trd} 🏆 Trophäen (jetzt ${k.tr})`);
    else if (!info.win && !info.draw) lines.unshift(`🛡️ Keine Trophäen verloren – Gebietsgrenze (${k.tr} 🏆)`);
  }
  if (info.arena != null && info.win) { k.dbw++; const v = k.dbw <= 12 ? 25 + 3 * info.arena : 5; f += v; lines.push(`Trophäenkampf gewonnen: +${v} 🪙`); }
  else if (info.arena != null) { f += 5; lines.push('Duell gespielt: +5 🪙'); }
  let lad = null;
  if (!info.pvp && info.win && info.lvl && info.lvl === k.lad + 1) {
    k.lad = info.lvl; const v = 100 + info.lvl * 30, packs = info.lvl === LADDER.length ? 3 : 1; f += v; k.free += packs;
    lad = info.lvl; lines.push(`Bot-Leiter Stufe ${info.lvl} geschafft: +${v} und ${packs} Gratis-Pack${packs > 1 ? 's' : ''}!`);
  }
  const st = info.st || {}, done = [];
  for (const q of k.dq) {
    if (q.done) continue;
    const add = { win: info.win ? 1 : 0, play: 1, spell: st.spell || 0, summon: st.summon || 0, kill: st.kill || 0, bon: info.win && (info.bon || []).length ? 1 : 0, pvp: info.pvp ? 1 : 0 }[q.k] || 0;
    q.n = Math.min(q.g, q.n + add);
    if (q.n >= q.g) { q.done = true; f += Q_REWARD; done.push(q.t); lines.push(`Aufgabe „${q.t}“ erledigt: +${Q_REWARD}`); }
  }
  k.f += f;
  return { f, lines, lad, total: k.f, tr: k.tr || 0, trd, newArena };
}

function action(action, acc, body) {
  if (action === 'kd_state') return [200, state(acc)];
  if (action === 'kd_pack') return openPack(acc, String(body.th || 'mix'), String(body.type || 'klein'));
  if (action === 'kd_craft') return craft(acc, String(body.id || ''));
  if (action === 'kd_deck_save') return saveDeck(acc, body);
  if (action === 'kd_deck_del') return delDeck(acc, Number(body.i));
  return [404, { error: 'Unbekannt' }];
}
module.exports = { action, reward, levels, deckList, init, ACTIONS: ['kd_state', 'kd_pack', 'kd_craft', 'kd_deck_save', 'kd_deck_del'] };
