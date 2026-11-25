// Kristallduell: Sammlung, Packs, Decks, Funken, Tagesaufgaben und Bot-Leiter (gespeichert im Hub-Konto unter acc.kd)
const K = require('./duell_karten.js');
const { C, DECKS, RAR, PACK, F, LADDER } = K;
const day = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
const POOL = {}; // Thema -> Seltenheit -> Karten
for (const [id, c] of Object.entries(C)) { if (c.tok) continue; ((POOL[c.f] = POOL[c.f] || {})[c.r] = POOL[c.f][c.r] || []).push(id); }
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

// Startsammlung: je 1× jede gewöhnliche Karte aus den Grunddecks (35 Karten) – der Rest kommt aus Packs
const STARTER = {}; for (const d of Object.values(DECKS)) for (const id of Object.keys(d)) if (C[id].r === 'g') STARTER[id] = 1;
const OLD_STARTER = {}; for (const d of Object.values(DECKS)) for (const [id, n] of Object.entries(d)) OLD_STARTER[id] = (OLD_STARTER[id] || 0) + n;
function init(acc) {
  if (!acc.kd) acc.kd = { v: 2, c: { ...STARTER }, f: 300, st: 0, pe: 0, pl: 0, free: 0, decks: [], lad: 0, packs: 0, d: '', dq: [], dbw: 0, dpw: 0, dfw: false };
  if (acc.kd.v !== 2) { // alte, zu große Startsammlung verkleinern – gezogene Karten bleiben
    const c = {}; for (const [id, n] of Object.entries(acc.kd.c)) { const k = Math.max(0, n - (OLD_STARTER[id] || 0)); if (k) c[id] = k; }
    for (const id of Object.keys(STARTER)) c[id] = (c[id] || 0) + 1;
    acc.kd.c = c; acc.kd.v = 2;
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
const deckList = acc => init(acc).decks.map(d => ({ n: d.n, cards: d.cards, err: K.checkDeck(d.cards, acc.kd.c) }));
function state(acc) {
  const k = init(acc);
  return { c: k.c, f: k.f, st: k.st, pe: k.pe, pl: k.pl, free: k.free, lad: k.lad, packs: k.packs, decks: deckList(acc), dq: k.dq, dfw: k.dfw };
}
function rollRarity() { const o = PACK.odds, t = o.g + o.s + o.e + o.l; let x = Math.random() * t; for (const r of ['l', 'e', 's', 'g']) { if (x < o[r]) return r; x -= o[r]; } return 'g'; }
function pickCard(th, r, own, taken) {
  const themes = th === 'mix' ? Object.keys(F) : [th];
  let list = themes.flatMap(f => (POOL[f] && POOL[f][r]) || []);
  const fresh = list.filter(id => !taken.has(id)); if (fresh.length) list = fresh; // keine doppelte Karte im selben Pack
  const unseen = list.filter(id => !own[id]); if (unseen.length && Math.random() < 0.5) list = unseen; // fehlende Karten etwas bevorzugen
  return list[Math.floor(Math.random() * list.length)];
}
function openPack(acc, th) {
  const k = init(acc);
  if (th !== 'mix' && !F[th]) return [400, { error: 'Unbekanntes Pack.' }];
  const free = k.free > 0;
  if (!free && k.f < PACK.cost) return [400, { error: `Dafür brauchst du ${PACK.cost} Funken.` }];
  if (free) k.free--; else k.f -= PACK.cost;
  const rs = Array.from({ length: PACK.size }, rollRarity);
  if (!rs.some(r => r !== 'g')) rs[PACK.size - 1] = 's'; // mindestens eine seltene
  const forceL = k.pl + 1 >= PACK.pityL && !rs.includes('l'), forceE = k.pe + 1 >= PACK.pityE && !rs.some(r => r === 'e' || r === 'l');
  if (forceL) rs[PACK.size - 1] = 'l'; else if (forceE) rs[PACK.size - 1] = Math.random() < 0.2 ? 'l' : 'e';
  k.pe = rs.some(r => r === 'e' || r === 'l') ? 0 : k.pe + 1;
  k.pl = rs.includes('l') ? 0 : k.pl + 1;
  const order = { g: 0, s: 1, e: 2, l: 3 };
  rs.sort((a, b) => order[a] - order[b]); // die besten zum Schluss aufdecken
  const taken = new Set();
  const cards = rs.map(r => {
    const id = pickCard(th, r, k.c, taken); taken.add(id); const before = k.c[id] || 0, cap = RAR[r].lv[4];
    let dust = 0;
    if (before >= cap) { dust = RAR[r].dust; k.st += dust; } else k.c[id] = before + 1;
    const n = k.c[id] || 0;
    return { id, r, isNew: before === 0, n, lv: K.levelOf(id, n), up: K.levelOf(id, n) > K.levelOf(id, before), dust };
  });
  k.packs++;
  return [200, { cards, pity: forceL ? 'l' : forceE ? 'e' : null, free, state: state(acc) }];
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
  for (const [id, n] of Object.entries(body.cards || {})) { const c = C[id]; const m = Math.max(0, Math.min(3, Number(n) | 0)); if (c && !c.tok && m) cards[id] = m; }
  const i = Number(body.i);
  if (Number.isInteger(i) && i >= 0 && i < k.decks.length) k.decks[i] = { n: name, cards };
  else { if (k.decks.length >= 8) return [400, { error: 'Mehr als 8 Decks gehen nicht – lösche zuerst eines.' }]; k.decks.push({ n: name, cards }); }
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
  } else {
    if (info.win) { k.dbw++; const v = k.dbw <= 12 ? 20 + 3 * (info.lvl || 0) : 5; f += v; lines.push(`Sieg gegen den Bot: +${v}`); }
    else { f += 5; lines.push('Duell gespielt: +5'); }
  }
  if (info.win && !k.dfw) { k.dfw = true; f += FIRST_WIN; lines.push(`Erster Sieg des Tages: +${FIRST_WIN}`); }
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
  return { f, lines, lad, total: k.f };
}

function action(action, acc, body) {
  if (action === 'kd_state') return [200, state(acc)];
  if (action === 'kd_pack') return openPack(acc, String(body.th || 'mix'));
  if (action === 'kd_craft') return craft(acc, String(body.id || ''));
  if (action === 'kd_deck_save') return saveDeck(acc, body);
  if (action === 'kd_deck_del') return delDeck(acc, Number(body.i));
  return [404, { error: 'Unbekannt' }];
}
module.exports = { action, reward, levels, deckList, init, ACTIONS: ['kd_state', 'kd_pack', 'kd_craft', 'kd_deck_save', 'kd_deck_del'] };
