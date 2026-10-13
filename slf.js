// Stadt-Land-Fluss – ein Buchstabe, alle schreiben gleichzeitig, danach wird gemeinsam geprüft.
const SPEED = Number(process.env.FSG_SPEED) || 1; // nur für Tests
const WRITE_MS = 180000, STOP_MS = 10000, ROUNDS = 5;
const BASE = ['Stadt', 'Land', 'Fluss', 'Name', 'Tier', 'Beruf'];
const EXTRA = ['Essen & Trinken', 'Marke', 'Sportart', 'Pflanze', 'Gegenstand', 'Film oder Serie', 'Promi', 'Hobby', 'Kleidung', 'Körperteil', 'Musikinstrument', 'Spiel', 'Süßigkeit', 'Fahrzeug', 'Farbe'];
const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split('');

const pick = a => a[Math.floor(Math.random() * a.length)];
const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
function schedule(r, ms, fn) {
  if (r.timer) clearTimeout(r.timer);
  r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } r.push(); }, ms / SPEED);
}
const autoOk = (s, text) => { const n = norm(text); return n.length >= 2 && n.startsWith(norm(s.letter)); };
const needFlags = s => Math.floor((s.part.length - 1) / 2) + 1;
const filled = (s, id) => (s.ans[id] || []).filter(x => x).length;

function newRound(r) {
  const s = r.state;
  s.round++;
  const free = LETTERS.filter(l => !s.usedLetters.includes(l));
  s.letter = pick(free.length ? free : LETTERS); s.usedLetters.push(s.letter);
  const extra = EXTRA.filter(c => !s.usedExtra.includes(c));
  const e = pick(extra.length ? extra : EXTRA); s.usedExtra.push(e);
  s.cats = [...BASE, e];
  s.part = r.players.map(p => p.id);
  s.part.forEach(id => (s.total[id] = s.total[id] || 0));
  s.ans = {}; s.flags = {}; s.ready = {}; s.stoppedBy = null; s.result = null;
  s.phase = 'write'; s.deadline = Date.now() + WRITE_MS;
  schedule(r, WRITE_MS, () => toReview(r));
}
function toReview(r) {
  const s = r.state;
  if (s.phase !== 'write' && s.phase !== 'stopping') return;
  s.phase = 'review'; s.deadline = null;
  if (r.timer) clearTimeout(r.timer); r.timer = null;
}
function isValid(s, id, ci) {
  const t = (s.ans[id] || [])[ci];
  if (!t || !autoOk(s, t)) return false;
  return (s.flags[id + ':' + ci] || []).length < needFlags(s);
}
function score(r) {
  const s = r.state;
  const pts = Object.fromEntries(s.part.map(id => [id, s.cats.map(() => 0)]));
  s.cats.forEach((_, ci) => {
    const valid = s.part.filter(id => isValid(s, id, ci));
    valid.forEach(id => {
      const n = norm(s.ans[id][ci]);
      const same = valid.filter(o => norm(s.ans[o][ci]) === n).length;
      pts[id][ci] = valid.length === 1 ? 20 : same > 1 ? 5 : 10;
    });
  });
  s.result = pts;
  for (const id of s.part) s.total[id] = (s.total[id] || 0) + pts[id].reduce((a, b) => a + b, 0);
  s.phase = 'score';
}

module.exports = {
  title: 'Stadt-Land-Fluss', min: 2, seats: 12,
  start(r) {
    if (r.timer) clearTimeout(r.timer);
    r.state = { round: 0, rounds: ROUNDS, total: {}, usedLetters: [], usedExtra: [], part: [], ans: {}, flags: {}, ready: {}, phase: 'write', deadline: null };
    r.status = 'playing';
    newRound(r);
  },
  onLeave(r, pid) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    s.part = s.part.filter(x => x !== pid); delete s.total[pid];
    if (!s.part.length) { if (r.timer) clearTimeout(r.timer); r.timer = null; r.status = 'ended'; s.phase = 'end'; return; }
    if (s.phase === 'review' && s.part.every(id => s.ready[id])) score(r);
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    const inRound = s.part.includes(pid);
    if (a.type === 'end') { if (r.host !== pid) return; if (r.timer) clearTimeout(r.timer); r.timer = null; s.phase = 'end'; r.status = 'ended'; return; }
    if (a.type === 'ans' || a.type === 'stop') {
      if (!inRound || (s.phase !== 'write' && s.phase !== 'stopping') || !Array.isArray(a.a)) return 'quiet';
      const before = filled(s, pid);
      s.ans[pid] = s.cats.map((_, i) => clean(a.a[i], 30));
      if (a.type === 'stop') {
        if (s.phase !== 'write') return 'quiet';
        if (filled(s, pid) < s.cats.length) return 'Füll zuerst alle Felder aus.';
        s.stoppedBy = pid; s.phase = 'stopping'; s.deadline = Date.now() + STOP_MS;
        schedule(r, STOP_MS, () => toReview(r));
        return;
      }
      return filled(s, pid) !== before ? 'soon' : 'quiet';
    }
    if (a.type === 'flag') {
      if (!inRound || s.phase !== 'review' || a.id === pid || !s.part.includes(a.id)) return 'quiet';
      const ci = Number(a.ci); if (!(ci >= 0 && ci < s.cats.length)) return 'quiet';
      const k = a.id + ':' + ci, list = s.flags[k] || (s.flags[k] = []);
      const i = list.indexOf(pid); if (i >= 0) list.splice(i, 1); else list.push(pid);
      for (const id in s.ready) s.ready[id] = false; // nach Änderungen neu bestätigen
      return;
    }
    if (a.type === 'ready') {
      if (!inRound || s.phase !== 'review') return 'quiet';
      s.ready[pid] = !s.ready[pid];
      if (s.part.every(id => s.ready[id])) score(r);
      return;
    }
    if (a.type === 'score') { if (r.host !== pid || s.phase !== 'review') return; score(r); return; }
    if (a.type === 'next') {
      if (r.host !== pid || s.phase !== 'score') return;
      if (s.round >= s.rounds) { s.phase = 'end'; r.status = 'ended'; return; }
      newRound(r); return;
    }
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const open = s.phase === 'review' || s.phase === 'score' || s.phase === 'end';
    return {
      phase: s.phase, round: s.round, rounds: s.rounds, letter: s.letter, cats: s.cats,
      left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null,
      inRound: s.part.includes(pid), stoppedBy: s.stoppedBy, part: s.part,
      mine: s.ans[pid] || null,
      progress: s.part.map(id => ({ id, n: filled(s, id) })),
      ready: s.part.filter(id => s.ready[id]), need: needFlags(s),
      table: open && s.cats.map((c, ci) => s.part.map(id => {
        const t = (s.ans[id] || [])[ci] || '';
        const fl = s.flags[id + ':' + ci] || [];
        return { id, t, auto: !!t && autoOk(s, t), flags: fl.length, me: fl.includes(pid), ok: isValid(s, id, ci), pts: s.result ? s.result[id][ci] : null };
      })),
      gain: s.result && Object.fromEntries(Object.entries(s.result).map(([id, a]) => [id, a.reduce((x, y) => x + y, 0)])),
      total: Object.entries(s.total).map(([id, pts]) => ({ id, pts })).sort((a, b) => b.pts - a.pts),
    };
  },
};
