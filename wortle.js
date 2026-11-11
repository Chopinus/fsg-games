// Wörtle (Spieler-Idee): jeden Tag ein neues Wort mit 5 Buchstaben, 6 Versuche, Rangliste des Tages.
// Das Lösungswort kennt nur der Server – der Browser bekommt nur die Farben zu seinen Versuchen.
// Gespeichert wird beim Konto (acc.wd), damit man auf jedem Gerät weiterraten kann und die Rangliste einen Neustart übersteht.
const { SOL, OK } = require('./woerter.js');
const ALLOWED = new Set([...SOL, ...OK]);
const START = Date.UTC(2026, 10, 11); // Wörtle Nr. 1
const dayNo = (t = Date.now()) => Math.floor((t + 3600e3 - START) / 864e5); // Tageswechsel nach deutscher Zeit (wie im Casino)
const dayStr = (t = Date.now()) => new Date(t + 3600e3).toISOString().slice(0, 10);
const wordOf = n => SOL[((n % SOL.length) + SOL.length) % SOL.length];
const MAX = 6;

// Farben: 2 = richtiger Platz, 1 = kommt vor (anderer Platz), 0 = kommt nicht (mehr) vor
function score(g, w) {
  const r = [0, 0, 0, 0, 0], left = {};
  for (let i = 0; i < 5; i++) { if (g[i] === w[i]) r[i] = 2; else left[w[i]] = (left[w[i]] || 0) + 1; }
  for (let i = 0; i < 5; i++) if (r[i] !== 2 && left[g[i]] > 0) { r[i] = 1; left[g[i]]--; }
  return r.join('');
}

function stateOf(acc) {
  const d = dayStr();
  if (!acc.wd || typeof acc.wd !== 'object') acc.wd = {};
  if (acc.wd.d !== d) { // neuer Tag: Serie bleibt, Versuche zurücksetzen
    const W = acc.wd;
    acc.wd = { d, g: [], r: [], st: W.st || 0, last: W.last || '', best: W.best || 0, wins: W.wins || 0, plays: W.plays || 0 };
  }
  return acc.wd;
}
const yesterday = () => dayStr(Date.now() - 864e5);
const liveStreak = W => (W && (W.last === dayStr() || W.last === yesterday()) ? W.st || 0 : 0);

let topCache = null, topAt = 0;
function top(accounts, isTester) {
  if (topCache && Date.now() - topAt < 5000) return topCache;
  const d = dayStr(), list = [], streaks = [];
  let played = 0;
  for (const [k, a] of Object.entries(accounts)) {
    const W = a && a.wd; if (!W || isTester(k)) continue;
    if (W.d === d && W.g && W.g.length) played++;
    if (W.d === d && W.win) list.push({ name: a.name, n: W.g.length, ms: W.ms || 0 });
    const st = liveStreak(W); if (st >= 2) streaks.push({ name: a.name, st });
  }
  list.sort((a, b) => a.n - b.n || a.ms - b.ms);
  streaks.sort((a, b) => b.st - a.st);
  topCache = { today: list.slice(0, 25), streaks: streaks.slice(0, 10), played, solved: list.length };
  topAt = Date.now();
  return topCache;
}

function view(acc, accounts, isTester) {
  const W = stateOf(acc), done = !!(W.win || W.g.length >= MAX);
  return { nr: dayNo() + 1, g: W.g, r: W.r, done, win: !!W.win, ms: W.ms || 0, word: done ? wordOf(dayNo()) : null,
    st: liveStreak(W), best: W.best || 0, wins: W.wins || 0, plays: W.plays || 0, top: top(accounts, isTester) };
}

function action(act, key, acc, body, accounts, markDirty, isTester) {
  if (act === 'wd_state') return [200, view(acc, accounts, isTester)];
  if (act === 'wd_guess') {
    const W = stateOf(acc);
    if (W.win || W.g.length >= MAX) return [400, { error: 'Das heutige Wörtle ist schon fertig. Morgen gibt es ein neues Wort!' }];
    const g = String(body.w || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').trim();
    if (!/^[a-z]{5}$/.test(g)) return [400, { error: 'Bitte genau 5 Buchstaben (A–Z) eingeben.' }];
    if (!ALLOWED.has(g)) return [400, { error: 'Dieses Wort kennt Wörtle nicht.', unknown: true }];
    if (W.g.includes(g)) return [400, { error: 'Dieses Wort hast du heute schon versucht.' }];
    const w = wordOf(dayNo()), r = score(g, w);
    if (!W.g.length) { W.t0 = Date.now(); W.plays = (W.plays || 0) + 1; }
    W.g.push(g); W.r.push(r);
    if (r === '22222') {
      W.win = 1; W.ms = Date.now() - (W.t0 || Date.now()); W.wins = (W.wins || 0) + 1;
      W.st = W.last === yesterday() ? (W.st || 0) + 1 : 1; W.last = W.d; W.best = Math.max(W.best || 0, W.st);
    } else if (W.g.length >= MAX) W.st = 0;
    topCache = null; markDirty();
    return [200, view(acc, accounts, isTester)];
  }
  return [404, { error: 'Unbekannt' }];
}

module.exports = { action, score };
