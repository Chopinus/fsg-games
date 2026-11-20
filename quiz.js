// Klassen-Quiz: alle bekommen dieselbe Frage, wer schneller richtig antwortet, bekommt mehr Punkte.
const SPEED = Number(process.env.FSG_SPEED) || 1; // nur für Tests
const Q_MS = 15000, REV_MS = 5500, INTRO_MS = 3000;
const { CATS } = require('./quizfragen.js');
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
function schedule(r, ms, fn) {
  if (r.timer) clearTimeout(r.timer);
  r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } r.push(); }, ms / SPEED);
}
// Eigene Fragen: eine pro Zeile „Frage | richtig | falsch | falsch | falsch“ (mind. 1 falsche Antwort)
function parseCustom(txt) {
  return String(txt || '').split('\n').slice(0, 40).map(l => l.split('|').map(x => clean(x, 90))).filter(a => a.length >= 3 && a.every(Boolean)).slice(0, 30)
    .map(([q, ...a]) => ({ q, a: a.slice(0, 4), cat: 'Eigene Fragen' }));
}
function ask(r) {
  const s = r.state, Q = s.qs[s.qi];
  s.phase = 'q'; s.ans = {}; s.deadline = Date.now() + Q_MS; s.t0 = Date.now();
  const order = shuffle(Q.a.map((_, i) => i)); s.opts = order.map(i => Q.a[i]); s.ok = order.indexOf(0);
  schedule(r, Q_MS, () => reveal(r));
}
function reveal(r) {
  const s = r.state; if (s.phase !== 'q') return;
  if (r.timer) clearTimeout(r.timer); r.timer = null;
  s.phase = 'rev'; s.deadline = Date.now() + REV_MS; s.gain = {};
  for (const id of s.part) {
    const a = s.ans[id];
    if (a && a.i === s.ok) {
      s.streak[id] = (s.streak[id] || 0) + 1;
      const g = Math.round(500 + 500 * Math.max(0, 1 - a.t / Q_MS)) + Math.min(5, s.streak[id] - 1) * 50;
      s.gain[id] = g; s.score[id] = (s.score[id] || 0) + g;
    } else { s.streak[id] = 0; s.gain[id] = 0; }
  }
  schedule(r, REV_MS, () => { s.qi++; if (s.qi >= s.qs.length) { s.phase = 'end'; s.deadline = null; r.status = 'ended'; } else ask(r); });
}

module.exports = {
  title: 'Quiz-Duell', min: 1, seats: 12,
  cats: Object.keys(CATS),
  start(r, m = {}) {
    if (r.timer) clearTimeout(r.timer);
    const n = [5, 10, 15, 20].includes(Number(m.n)) ? Number(m.n) : 10;
    const custom = parseCustom(m.custom);
    let pool;
    if (m.cat === 'Eigene' && custom.length) pool = custom;
    else if (CATS[m.cat]) pool = CATS[m.cat];
    else pool = Object.values(CATS).flat();
    const used = new Set((r.state && r.state.used) || []);
    let fresh = pool.filter(q => !used.has(q.q)); if (fresh.length < n) fresh = pool;
    const qs = m.cat === 'Eigene' && custom.length ? custom.slice(0, n) : shuffle(fresh).slice(0, n);
    r.state = { phase: 'intro', qs, qi: 0, part: r.players.map(p => p.id), score: {}, streak: {}, ans: {}, gain: {}, cat: CATS[m.cat] ? m.cat : m.cat === 'Eigene' && custom.length ? 'Eigene Fragen' : 'Alle Kategorien',
      used: [...used, ...qs.map(q => q.q)].slice(-120), deadline: Date.now() + INTRO_MS };
    r.state.part.forEach(id => (r.state.score[id] = 0));
    r.status = 'playing';
    schedule(r, INTRO_MS, () => ask(r));
  },
  onJoin(r, pid) { const s = r.state; if (s && r.status === 'playing' && !s.part.includes(pid)) { s.part.push(pid); s.score[pid] = 0; } },
  onLeave(r, pid) { const s = r.state; if (!s) return; s.part = s.part.filter(x => x !== pid); if (r.status === 'playing' && !s.part.length) { if (r.timer) clearTimeout(r.timer); r.status = 'ended'; s.phase = 'end'; } },
  act(r, pid, a) {
    const s = r.state; if (!s || r.status !== 'playing' || s.phase !== 'q') return 'quiet';
    if (!s.part.includes(pid) || s.ans[pid]) return 'quiet';
    const i = Number(a.i); if (!(i >= 0 && i < s.opts.length)) return 'quiet';
    s.ans[pid] = { i, t: Date.now() - s.t0 };
    if (s.part.every(id => s.ans[id])) { reveal(r); }
  },
  winners(r) { const s = r.state; if (!s) return []; const max = Math.max(...s.part.map(id => s.score[id] || 0)); return max > 0 ? s.part.filter(id => s.score[id] === max) : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    const Q = s.qs[s.qi] || {};
    const board = s.part.map(id => ({ id, pts: s.score[id] || 0, st: s.streak[id] || 0, g: s.gain[id] || 0, done: !!s.ans[id] })).sort((a, b) => b.pts - a.pts);
    const v = { phase: s.phase, qi: s.qi, total: s.qs.length, cat: s.cat, qcat: Q.cat, board, left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null, dur: s.phase === 'q' ? Q_MS : s.phase === 'rev' ? REV_MS : INTRO_MS, inGame: s.part.includes(pid) };
    if (s.phase === 'q' || s.phase === 'rev') { v.q = Q.q; v.opts = s.opts; v.mine = s.ans[pid] ? s.ans[pid].i : null; v.n = Object.keys(s.ans).length; }
    if (s.phase === 'rev') { v.ok = s.ok; v.cnt = s.opts.map((_, i) => Object.values(s.ans).filter(a => a.i === i).length); v.gain = s.gain[pid] || 0; }
    return v;
  },
};
