// Minispiel-Party – zufällige kurze Minispiele hintereinander, Punkte nach Platzierung
const PLACE_POINTS = [10, 7, 5, 4, 3, 2, 1];
const SPEED = Number(process.env.FSG_SPEED) || 1; // nur für Tests
const COLORS = ['r', 'g', 'b', 'y'];
const COLORWORD = { r: 'ROT', g: 'GRÜN', b: 'BLAU', y: 'GELB' };
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';

const ESTIMATES = [
  ['Wie hoch ist der Eiffelturm in Metern (mit Antenne)?', 330],
  ['In welchem Jahr fiel die Berliner Mauer?', 1989],
  ['Wie viele Knochen hat ein erwachsener Mensch?', 206],
  ['Wie hoch ist die Zugspitze in Metern?', 2962],
  ['Wie viele Tasten hat ein Klavier?', 88],
  ['In welchem Jahr landeten die ersten Menschen auf dem Mond?', 1969],
  ['Wie viele Herzen hat ein Oktopus?', 3],
  ['Wie viele Kilometer ist der Mond im Schnitt von der Erde entfernt?', 384400],
  ['Wie viele Zähne hat ein Erwachsener mit Weisheitszähnen?', 32],
  ['Wie hoch ist der Mount Everest in Metern?', 8849],
  ['Wie viele Sekunden hat ein Tag?', 86400],
  ['In welchem Jahr wurde die Bundesrepublik Deutschland gegründet?', 1949],
  ['Wie viele Meter legt Schall in der Luft pro Sekunde zurück (bei 20 °C)?', 343],
  ['Wie viele Länder gibt es in Afrika?', 54],
  ['Wie viele Stockwerke hat der Burj Khalifa?', 163],
  ['In welchem Jahr wurde Google gegründet?', 1998],
  ['In welchem Jahr kam das erste iPhone heraus?', 2007],
  ['Wie viele Monde hat der Mars?', 2],
  ['Wie viele Kilometer ist der Rhein lang?', 1233],
  ['Wie viele Einwohner hat Deutschland ungefähr (in Millionen)?', 84],
  ['Wie alt wurde Johann Wolfgang von Goethe?', 82],
  ['Wie viele Grad Fahrenheit sind 100 °C?', 212],
  ['Wie viele Felder hat ein Schachbrett?', 64],
  ['Wie viele Minuten braucht das Licht der Sonne bis zur Erde (gerundet)?', 8],
  ['Wie viele Bundesländer hat Deutschland?', 16],
  ['In welchem Jahr begann der Erste Weltkrieg?', 1914],
  ['Wie viele Meter ist ein olympisches Schwimmbecken lang?', 50],
  ['Wie viele Kilogramm wiegt ein ausgewachsener Afrikanischer Elefantenbulle ungefähr?', 6000],
  ['Wie viele Planeten hat unser Sonnensystem?', 8],
  ['Wie viele Knochen hat eine menschliche Hand (ohne Handgelenk-Unterarm)?', 27],
  ['In welchem Jahr wurde Albert Einstein geboren?', 1879],
  ['Wie viele Liter Blut hat ein Erwachsener ungefähr?', 5],
  ['Wie viele Bundesliga-Vereine gibt es in der 1. Liga?', 18],
  ['Wie viele Kilometer ist ein Marathon lang (gerundet)?', 42],
  ['Wie viele Ecken hat ein Würfel?', 8],
];

// Hilfsfunktion: Rangliste mit 3/2/1 Punkten für die Besten nach `key` (aufsteigend)
function podium(list, key) {
  list.sort((a, b) => a[key] - b[key]);
  let place = 0, prev = null;
  return list.map((x, i) => { if (x[key] !== prev) { place = i; prev = x[key]; } return { ...x, pts: Math.max(0, 3 - place) }; });
}

const MINIS = {
  reaktion: {
    title: 'Blitzreaktion', howto: 'Warte, bis das Feld grün wird – dann so schnell wie möglich tippen. Wer zu früh tippt, geht leer aus.',
    rounds: 6,
    begin(r, m, ctl) {
      m.q = { kind: 'reaction', go: false };
      ctl.later(rnd(1800, 4500), () => { m.q = { kind: 'reaction', go: true }; m.goAt = Date.now(); ctl.deadline(3500); });
      return null;
    },
    answer(m, pid, v) {
      if (!m.q.go) { m.answers[pid] = { early: true }; return true; }
      const ms = Math.round(Number(v && v.ms));
      m.answers[pid] = { ms: ms >= 80 && ms <= 4000 ? ms : 4000 };
      return true;
    },
    ready: m => m.q.go,
    score(r, m) {
      const valid = Object.entries(m.answers).filter(([, a]) => !a.early).map(([id, a]) => ({ id, ms: a.ms }));
      const rows = podium(valid, 'ms').map(x => ({ id: x.id, label: `${x.ms} ms`, pts: x.pts }));
      for (const [id, a] of Object.entries(m.answers)) if (a.early) rows.push({ id, label: 'Frühstart', pts: 0 });
      return { text: 'Reaktionszeiten', rows };
    },
  },
  rechnen: {
    title: 'Kopfrechnen', howto: 'Rechne die Aufgabe aus und tippe das Ergebnis ein. Die schnellsten richtigen Antworten bekommen die meisten Punkte.',
    rounds: 8,
    begin(r, m) {
      const t = rnd(0, 3); let a, b, text, ans;
      if (t === 0) { a = rnd(12, 89); b = rnd(12, 89); text = `${a} + ${b}`; ans = a + b; }
      else if (t === 1) { a = rnd(40, 150); b = rnd(11, a - 5); text = `${a} − ${b}`; ans = a - b; }
      else if (t === 2) { a = rnd(3, 12); b = rnd(4, 15); text = `${a} × ${b}`; ans = a * b; }
      else { b = rnd(3, 12); ans = rnd(3, 14); a = b * ans; text = `${a} ÷ ${b}`; }
      m.q = { kind: 'number', text }; m.secret = ans;
      return 15000;
    },
    answer(m, pid, v) { if (m.answers[pid]) return false; m.answers[pid] = { v: Number(v), at: Date.now() }; return true; },
    score(r, m) {
      const right = Object.entries(m.answers).filter(([, a]) => a.v === m.secret).sort((a, b) => a[1].at - b[1].at);
      const rows = right.map(([id], i) => ({ id, label: 'richtig', pts: i < 3 ? 3 - i : 1 }));
      for (const [id, a] of Object.entries(m.answers)) if (a.v !== m.secret) rows.push({ id, label: `${a.v} – falsch`, pts: 0 });
      return { text: `${m.q.text} = ${m.secret}`, rows };
    },
  },
  schaetzen: {
    title: 'Schätzfrage', howto: 'Schätze die Zahl so genau wie möglich. Wer am nächsten dran ist, gewinnt die Runde.',
    rounds: 5,
    begin(r, m) {
      const used = r.state.usedQ;
      let options = ESTIMATES.map((_, i) => i).filter(i => !used.includes(i));
      if (!options.length) { used.length = 0; options = ESTIMATES.map((_, i) => i); }
      const i = pick(options); used.push(i);
      m.q = { kind: 'number', text: ESTIMATES[i][0], estimate: true }; m.secret = ESTIMATES[i][1];
      return 25000;
    },
    answer(m, pid, v) { const n = Number(v); if (!Number.isFinite(n)) return false; m.answers[pid] = { v: n, d: Math.abs(n - m.secret) }; return true; },
    score(r, m) {
      const list = Object.entries(m.answers).map(([id, a]) => ({ id, v: a.v, d: a.d }));
      const rows = podium(list, 'd').map(x => ({ id: x.id, label: String(x.v).replace('.', ','), pts: x.pts }));
      return { text: `Richtig: ${m.secret.toLocaleString('de-DE')}`, rows };
    },
  },
  farbfalle: {
    title: 'Farbfalle', howto: 'Tippe die FARBE, in der das Wort geschrieben ist – nicht das, was da steht. Schnell sein lohnt sich!',
    rounds: 12,
    begin(r, m) {
      const word = pick(COLORS); let ink = pick(COLORS);
      if (Math.random() < 0.8) while (ink === word) ink = pick(COLORS);
      m.q = { kind: 'stroop', word: COLORWORD[word], ink }; m.secret = ink;
      return 4000;
    },
    answer(m, pid, v) { if (m.answers[pid]) return false; m.answers[pid] = { v: String(v), at: Date.now() }; return true; },
    score(r, m) {
      const right = Object.entries(m.answers).filter(([, a]) => a.v === m.secret).sort((a, b) => a[1].at - b[1].at);
      const rows = right.map(([id], i) => ({ id, label: 'richtig', pts: i < 3 ? 3 - i : 1 }));
      for (const [id, a] of Object.entries(m.answers)) if (a.v !== m.secret) rows.push({ id, label: 'falsch', pts: 0 });
      return { text: `Die Farbe war ${COLORWORD[m.secret]}`, rows };
    },
  },
  merken: {
    title: 'Merkfolge', howto: 'Schau dir die Farbfolge genau an und tippe sie danach nach. Jede Stufe wird länger. Ein Fehler und du bist raus.',
    rounds: 12,
    start(r, m) { m.alive = r.players.map(p => p.id); m.seq = []; },
    begin(r, m) {
      while (m.seq.length < m.round + 2) m.seq.push(pick(COLORS));
      const showMs = m.seq.length * 650 + 600;
      m.q = { kind: 'sequence', seq: m.seq.slice(), showMs, level: m.round };
      return showMs + 5000 + m.seq.length * 700;
    },
    answer(m, pid, v) {
      if (!m.alive.includes(pid) || m.answers[pid] || !Array.isArray(v)) return false;
      m.answers[pid] = { ok: v.length === m.seq.length && v.every((x, i) => x === m.seq[i]) };
      return true;
    },
    waitFor: m => m.alive,
    score(r, m) {
      const rows = [];
      for (const id of m.alive.slice()) {
        if (m.answers[id] && m.answers[id].ok) rows.push({ id, label: 'geschafft', pts: 1 });
        else { rows.push({ id, label: 'raus', pts: 0 }); m.alive = m.alive.filter(x => x !== id); }
      }
      return { text: `Stufe ${m.round}: ${m.seq.length} Farben`, rows };
    },
    done: m => m.round > 1 && m.alive.length === 0,
  },
  tippen: {
    title: 'Tipp-Rausch', howto: 'Tippe so oft du kannst auf das große Feld, bis die Zeit um ist. Drei Durchgänge, alle Tipps zählen.',
    rounds: 3,
    begin(r, m) { m.q = { kind: 'tap', ms: 8000 }; return 8000 + 2500; },
    answer(m, pid, v) { if (m.answers[pid]) return false; const n = Math.round(Number(v)); m.answers[pid] = { n: n >= 0 ? Math.min(n, 200) : 0 }; return true; },
    score(r, m) {
      const rows = Object.entries(m.answers).map(([id, a]) => ({ id, label: `${a.n} Tipps`, pts: a.n })).sort((a, b) => b.pts - a.pts);
      return { text: `Durchgang ${m.round}`, rows };
    },
  },
};
const KEYS = Object.keys(MINIS);

function schedule(r, ms, fn) {
  if (r.timer) clearTimeout(r.timer);
  r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } r.push(); }, ms / SPEED);
}
function ctlFor(r) {
  return {
    later: (ms, fn) => schedule(r, ms, fn),
    deadline: ms => { r.state.deadline = Date.now() + ms; schedule(r, ms, () => endRound(r)); },
  };
}
function startMini(r) {
  const s = r.state;
  const options = KEYS.filter(k => k !== s.lastKey && !(s.recent || []).includes(k));
  const key = pick(options.length ? options : KEYS.filter(k => k !== s.lastKey));
  s.recent = [...(s.recent || []), key].slice(-3); s.lastKey = key;
  const def = MINIS[key];
  const m = { key, title: def.title, howto: def.howto, rounds: def.rounds, round: 0, scores: {}, answers: {}, q: null, reveal: null };
  r.players.forEach(p => (m.scores[p.id] = 0));
  def.start?.(r, m);
  s.mini = m; s.phase = 'intro'; s.deadline = Date.now() + 7000; s.results = null;
  schedule(r, 7000, () => nextRound(r));
}
function nextRound(r) {
  const s = r.state, m = s.mini, def = MINIS[m.key];
  m.round++;
  if (m.round > m.rounds || def.done?.(m)) { finishMini(r); return; }
  m.answers = {}; m.reveal = null; m.secret = undefined;
  s.phase = 'round';
  const ms = def.begin(r, m, ctlFor(r));
  if (ms) { s.deadline = Date.now() + ms; schedule(r, ms, () => endRound(r)); } else s.deadline = null;
}
function endRound(r) {
  const s = r.state, m = s.mini, def = MINIS[m.key];
  if (s.phase !== 'round') return;
  const rev = def.score(r, m);
  for (const row of rev.rows) m.scores[row.id] = (m.scores[row.id] || 0) + row.pts;
  m.reveal = rev; m.q = { ...m.q, over: true };
  s.phase = 'reveal'; s.deadline = Date.now() + 4000;
  schedule(r, 4000, () => nextRound(r));
}
function finishMini(r) {
  const s = r.state, m = s.mini;
  const ids = r.players.map(p => p.id);
  const list = ids.map(id => ({ id, score: m.scores[id] || 0 })).sort((a, b) => b.score - a.score);
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

module.exports = {
  title: 'Minispiel-Party', min: 2, seats: 12,
  start(r) {
    if (r.timer) clearTimeout(r.timer);
    r.state = { total: {}, played: 0, phase: 'intro', mini: null, results: null, deadline: null, lastKey: null, usedQ: [], recent: [] };
    r.players.forEach(p => (r.state.total[p.id] = 0));
    r.status = 'playing';
    startMini(r);
  },
  onJoin(r, pid) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    s.total[pid] = s.total[pid] || 0;
    if (s.mini) s.mini.scores[pid] = s.mini.scores[pid] || 0;
  },
  onLeave(r, pid) {
    const s = r.state;
    if (!s) return;
    delete s.total[pid];
    if (s.mini?.alive) s.mini.alive = s.mini.alive.filter(x => x !== pid);
    if (r.status === 'playing' && r.players.length < 2) { if (r.timer) clearTimeout(r.timer); r.timer = null; r.status = 'ended'; }
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    if (a.type === 'stop') { if (r.host !== pid) return; if (r.timer) clearTimeout(r.timer); r.timer = null; r.status = 'ended'; return; }
    if (a.type === 'skip') { if (r.host !== pid) return; startMini(r); return; }
    if (a.type !== 'answer' || s.phase !== 'round') return;
    const m = s.mini, def = MINIS[m.key];
    if (!def.answer(m, pid, a.v)) return;
    const waitFor = def.waitFor ? def.waitFor(m) : r.players.map(p => p.id);
    if ((!def.ready || def.ready(m)) && waitFor.every(id => m.answers[id])) endRound(r);
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const m = s.mini;
    return {
      phase: s.phase, played: s.played, left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null,
      total: Object.entries(s.total).map(([id, pts]) => ({ id, pts })).sort((a, b) => b.pts - a.pts),
      results: s.results,
      mini: m && {
        key: m.key, title: m.title, howto: m.howto, round: m.round, rounds: m.rounds, q: m.q, reveal: m.reveal,
        answered: !!m.answers[pid], scores: m.scores, alive: m.alive || null,
      },
    };
  },
  _test: { MINIS },
};
