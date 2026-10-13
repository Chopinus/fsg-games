// Minispiel-Party – zufällige Action-Minispiele hintereinander, Punkte nach Platzierung.
// Jedes Gerät spielt sein Minispiel selbst (mini.js) und meldet laufend seinen Punktestand.
const PLACE_POINTS = [10, 7, 5, 4, 3, 2, 1];
const SPEED = Number(process.env.FSG_SPEED) || 1; // nur für Tests
const pick = a => a[Math.floor(Math.random() * a.length)];

const MINIS = {
  ballon: { title: 'Ballon-Pumpe', ms: 40000, howto: 'Tippe genau dann, wenn der Ring auf den Kreis trifft. Im Takt pumpst du viel Luft, daneben entweicht sie. Wer die meisten Ballons füllt, gewinnt.' },
  rennen: { title: 'Turbo-Rennen', ms: 35000, howto: 'Tippe schnell auf GAS. Wenn die Drehzahl im grünen Bereich ist, tippe auf SCHALTEN. Zu spät geschaltet würgt den Motor ab. Wer zuerst 800 m schafft, gewinnt.' },
  pong: { title: 'Pong-Mauer', ms: 45000, howto: 'Zieh den Schläger mit dem Finger und halte den Ball im Spiel. Jeder Stein bringt Punkte, Serien geben Bonus. Ein verpasster Ball kostet deine Serie.' },
  rakete: { title: 'Raketenflug', ms: 45000, howto: 'Tippe, um Schub zu geben, und flieg durch die Lücken. Bei einem Crash startest du neu – dein weitester Flug zählt.' },
  turm: { title: 'Stapelturm', ms: 45000, howto: 'Tippe, um den Block fallen zu lassen. Was übersteht, wird abgeschnitten. Genaue Treffer halten die Breite. Dein höchster Turm zählt.' },
};
const KEYS = Object.keys(MINIS);

function schedule(r, ms, fn) {
  if (r.timer) clearTimeout(r.timer);
  r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } r.push(); }, ms / SPEED);
}
function startMini(r) {
  const s = r.state;
  const options = KEYS.filter(k => !s.recent.includes(k));
  const key = pick(options.length ? options : KEYS.filter(k => k !== s.lastKey));
  s.recent = [...s.recent, key].slice(-3); s.lastKey = key;
  s.mini = { key, title: MINIS[key].title, howto: MINIS[key].howto, ms: MINIS[key].ms, seed: Math.floor(Math.random() * 1e9), live: {}, final: {} };
  s.phase = 'intro'; s.results = null; s.deadline = Date.now() + 7000;
  schedule(r, 7000, () => startPlay(r));
}
function startPlay(r) {
  const s = r.state;
  s.phase = 'play'; s.deadline = Date.now() + s.mini.ms;
  schedule(r, s.mini.ms + 2500, () => finishMini(r)); // 2,5 s Puffer für die letzten Ergebnisse
}
function finishMini(r) {
  const s = r.state, m = s.mini;
  if (s.phase !== 'play') return;
  const list = r.players.map(p => {
    const f = m.final[p.id] || m.live[p.id] || { v: 0, label: '–' };
    return { id: p.id, score: f.v, label: f.label };
  }).sort((a, b) => b.score - a.score);
  let place = 0, prev = null;
  s.results = list.map((x, i) => {
    if (x.score !== prev) { place = i; prev = x.score; }
    const pts = PLACE_POINTS[place] ?? 1;
    s.total[x.id] = (s.total[x.id] || 0) + pts;
    return { ...x, place: place + 1, pts };
  });
  s.played++; s.phase = 'results'; s.deadline = Date.now() + 10000;
  schedule(r, 10000, () => startMini(r));
}
const cleanEntry = v => {
  const n = Number(v && v.v);
  return { v: Number.isFinite(n) ? Math.max(-1e9, Math.min(1e9, n)) : 0, label: String((v && v.label) || '').slice(0, 24) };
};

module.exports = {
  title: 'Minispiel-Party', min: 2, seats: 12,
  start(r) {
    if (r.timer) clearTimeout(r.timer);
    r.state = { total: {}, played: 0, phase: 'intro', mini: null, results: null, deadline: null, lastKey: null, recent: [] };
    r.players.forEach(p => (r.state.total[p.id] = 0));
    r.status = 'playing';
    startMini(r);
  },
  onJoin(r, pid) {
    const s = r.state;
    if (s && r.status === 'playing') s.total[pid] = s.total[pid] || 0;
  },
  onLeave(r, pid) {
    const s = r.state;
    if (!s) return;
    delete s.total[pid];
    if (r.status === 'playing' && r.players.length < 2) { if (r.timer) clearTimeout(r.timer); r.timer = null; r.status = 'ended'; }
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    if (a.type === 'stop') { if (r.host !== pid) return; if (r.timer) clearTimeout(r.timer); r.timer = null; r.status = 'ended'; return; }
    if (a.type === 'skip') { if (r.host !== pid) return; startMini(r); return; }
    if (s.phase !== 'play') return 'quiet';
    const m = s.mini;
    if (a.type === 'live') { m.live[pid] = cleanEntry(a); return 'soon'; }
    if (a.type === 'final') {
      m.final[pid] = cleanEntry(a); m.live[pid] = m.final[pid];
      if (r.players.every(p => m.final[p.id])) finishMini(r);
      return;
    }
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const m = s.mini;
    return {
      phase: s.phase, played: s.played, left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null,
      total: Object.entries(s.total).map(([id, pts]) => ({ id, pts })).sort((a, b) => b.pts - a.pts),
      results: s.results,
      mini: m && { key: m.key, title: m.title, howto: m.howto, ms: m.ms, seed: m.seed, live: m.live, done: !!m.final[pid] },
    };
  },
};
