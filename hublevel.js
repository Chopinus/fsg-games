// Hub-Level und Wochen-Aufgaben: Jedes Spiel gibt Erfahrung (EP) fürs Hub-Konto.
// Gespeichert beim Konto in acc.hub = { xp, wk, q: {aufgabe: fortschritt}, done: [aufgaben], nc: namensfarbe, day, dxp }.
const WEEK0 = Date.UTC(2026, 10, 16) - 3600e3; // Montag 16.11.2026, 0 Uhr deutscher Zeit
const weekNo = (t = Date.now()) => Math.floor((t - WEEK0) / (7 * 864e5));
const dayStr = (t = Date.now()) => new Date(t + 3600e3).toISOString().slice(0, 10);
const DAY_CAP = 1500; // höchstens so viele EP pro Tag aus Runden-Spielen (gegen Farmen)
// Erfahrung pro Ereignis
const XP = { play: 25, win: 40, wortle: 60, raetsel: 50, td: 40, insel: 0 };
// Stufen: Level l braucht 120 + 40·(l-1) EP für den nächsten Aufstieg
const need = l => 120 + 40 * (l - 1);
function lvOf(xp) { let l = 1, x = xp; while (x >= need(l) && l < 99) { x -= need(l); l++; } return { lv: l, into: x, need: need(l) }; }
// Namensfarben, freigeschaltet über das Level
const COLORS = [
  { id: 'std', lv: 1, n: 'Standard', css: '' },
  { id: 'mint', lv: 3, n: 'Minze', css: '#7cffcb' },
  { id: 'himmel', lv: 5, n: 'Himmelblau', css: '#6cc8ff' },
  { id: 'rose', lv: 7, n: 'Rosé', css: '#ff8fd0' },
  { id: 'lila', lv: 10, n: 'Lavendel', css: '#b99cff' },
  { id: 'gold', lv: 15, n: 'Gold', css: 'gold' },
  { id: 'feuer', lv: 20, n: 'Feuer', css: 'fire' },
  { id: 'regen', lv: 25, n: 'Regenbogen', css: 'rainbow' },
  { id: 'galax', lv: 35, n: 'Galaxie', css: 'galaxy' },
];
const TITLES = [[1, 'Neuling'], [3, 'Mitspieler'], [5, 'Stammgast'], [8, 'Spielefuchs'], [12, 'Taktiker'], [16, 'Profi'], [20, 'Meister'], [25, 'Großmeister'], [30, 'Legende'], [40, 'Hub-Mythos']];
const titleOf = lv => TITLES.filter(t => lv >= t[0]).pop()[1];
// Aufgaben-Vorrat; jede Woche werden 5 davon ausgewählt (für alle gleich)
const POOL = [
  { id: 'play5', ev: 'play', n: 5, xp: 200, t: 'Spiele 5 Runden im Hub' },
  { id: 'play12', ev: 'play', n: 12, xp: 400, t: 'Spiele 12 Runden im Hub' },
  { id: 'win3', ev: 'win', n: 3, xp: 250, t: 'Gewinne 3 Runden' },
  { id: 'win8', ev: 'win', n: 8, xp: 450, t: 'Gewinne 8 Runden' },
  { id: 'wortle3', ev: 'wortle', n: 3, xp: 250, t: 'Löse 3-mal das Wörtle' },
  { id: 'rx4', ev: 'raetsel', n: 4, xp: 300, t: 'Löse 4 Tagesrätsel' },
  { id: 'sudoku2', ev: 'raetsel:sudoku', n: 2, xp: 200, t: 'Löse 2 Tages-Sudokus' },
  { id: 'nono2', ev: 'raetsel:nono', n: 2, xp: 200, t: 'Löse 2 Nonogramme' },
  { id: 'verb3', ev: 'raetsel:verb', n: 3, xp: 220, t: 'Löse 3-mal „Verbindungen“' },
  { id: 'mathe3', ev: 'raetsel:mathe', n: 3, xp: 200, t: 'Spiele 3-mal Mathe-Blitz' },
  { id: 'quiz3', ev: 'play:quiz', n: 3, xp: 220, t: 'Spiele 3 Runden Quiz-Duell' },
  { id: 'werwolf2', ev: 'play:werwolf', n: 2, xp: 250, t: 'Spiele 2 Runden Werwolf' },
  { id: 'agenten2', ev: 'play:agenten', n: 2, xp: 220, t: 'Spiele 2 Runden Wortagenten' },
  { id: 'schiffe2', ev: 'win:schiffe', n: 2, xp: 220, t: 'Gewinne 2-mal Schiffe versenken' },
  { id: 'tron3', ev: 'play:lichtrad', n: 3, xp: 200, t: 'Fahre 3 Lichtrad-Matches' },
  { id: 'arena2', ev: 'play:arena', n: 2, xp: 200, t: 'Spiele 2 Runden Kugel-Arena' },
  { id: 'vier3', ev: 'win:vier', n: 3, xp: 200, t: 'Gewinne 3 Partien Vier gewinnt' },
  { id: 'schach1', ev: 'win:schach', n: 1, xp: 220, t: 'Gewinne eine Partie Schach' },
  { id: 'uno3', ev: 'play:uno', n: 3, xp: 180, t: 'Spiele 3 Runden Letzte Karte' },
  { id: 'td20', ev: 'tdwave', n: 20, max: true, xp: 300, t: 'Erreiche Welle 20 in Turmwacht' },
  { id: 'td3', ev: 'td', n: 3, xp: 200, t: 'Spiele 3 Partien Turmwacht' },
  { id: 'turnier1', ev: 'play:turnier', n: 1, xp: 300, t: 'Nimm an einem Turnier teil' },
  { id: 'kniffel2', ev: 'play:kniffel', n: 2, xp: 180, t: 'Spiele 2 Runden Kniffel' },
  { id: 'party2', ev: 'play:party', n: 2, xp: 200, t: 'Spiele 2 Minispiel-Partys' },
];
function weekQuests(w = weekNo()) {
  // feste Auswahl pro Woche: immer eine „Spiele“- und eine „Gewinne“-Aufgabe, dazu 3 weitere
  let a = (w * 2654435761) >>> 0; const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const base = [POOL[w % 2 ? 1 : 0], POOL[w % 2 ? 2 : 3]];
  const rest = POOL.filter(q => !base.includes(q) && q.ev !== 'play' && q.ev !== 'win');
  while (base.length < 5) { const q = rest.splice(Math.floor(rnd() * rest.length), 1)[0]; if (!base.some(b => b.ev === q.ev)) base.push(q); }
  return base;
}
function hubOf(acc) {
  if (!acc.hub || typeof acc.hub !== 'object') acc.hub = { xp: 0 };
  const H = acc.hub, w = weekNo();
  if (H.wk !== w) { H.wk = w; H.q = {}; H.done = []; }
  if (H.day !== dayStr()) { H.day = dayStr(); H.dxp = 0; }
  return H;
}
// Ereignis verbuchen: gibt die gewonnenen EP zurück (inkl. erledigter Aufgaben)
function event(acc, ev, n = 1, markDirty) {
  if (!acc) return 0;
  const H = hubOf(acc); let gain = 0;
  const base = ev.split(':')[0];
  if (XP[base] && ev === base) {
    let g = XP[base] * (base === 'td' ? 1 : n);
    if (base === 'play' || base === 'win') { g = Math.min(g, Math.max(0, DAY_CAP - (H.dxp || 0))); H.dxp = (H.dxp || 0) + g; }
    gain += g;
  }
  const done = [];
  for (const q of weekQuests()) {
    if (q.ev !== ev || H.done.includes(q.id)) continue;
    H.q[q.id] = q.max ? Math.max(H.q[q.id] || 0, n) : (H.q[q.id] || 0) + n;
    if (H.q[q.id] >= q.n) { H.done.push(q.id); gain += q.xp; done.push(q); }
  }
  const before = lvOf(H.xp || 0).lv;
  H.xp = (H.xp || 0) + gain;
  const after = lvOf(H.xp).lv;
  if (gain && markDirty) markDirty();
  if (after > before || done.length) H.news = { lv: after > before ? after : null, q: done.map(q => q.t), t: Date.now() };
  return gain;
}
function colorOf(acc) { const H = acc && acc.hub; if (!H || !H.nc) return ''; const c = COLORS.find(x => x.id === H.nc); return c && lvOf(H.xp || 0).lv >= c.lv ? c.css : ''; }
function state(acc) {
  const H = hubOf(acc), L = lvOf(H.xp || 0), news = H.news && Date.now() - H.news.t < 864e5 ? H.news : null; H.news = null;
  const wEnd = WEEK0 + (weekNo() + 1) * 7 * 864e5;
  return { xp: H.xp || 0, ...L, title: titleOf(L.lv), nc: H.nc || 'std', colors: COLORS, quests: weekQuests().map(q => ({ id: q.id, t: q.t, n: q.n, xp: q.xp, p: Math.min(q.n, H.q[q.id] || 0), done: H.done.includes(q.id) })), weekLeft: wEnd - Date.now(), news, titles: TITLES };
}
function setColor(acc, id) { const H = hubOf(acc), c = COLORS.find(x => x.id === id); if (!c) return 'Diese Farbe gibt es nicht.'; if (lvOf(H.xp || 0).lv < c.lv) return `Diese Farbe gibt es ab Level ${c.lv}.`; H.nc = id; return null; }
module.exports = { event, state, setColor, lvOf, colorOf, titleOf, weekQuests, COLORS };
