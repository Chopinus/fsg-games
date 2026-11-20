// Lichtrad: Jeder zieht eine Lichtspur hinter sich her. Wer in eine Spur oder die Wand fährt, ist raus.
// Der Server rechnet alles (10 Schritte pro Sekunde) und schickt pro Schritt nur die Köpfe (r.cast).
const SPEED = Number(process.env.FSG_SPEED) || 1;
const W = 64, H = 44, STEP = 95, COUNT_MS = 3000, PAUSE_MS = 3500, ROUNDS = 5;
const COLORS = ['#22e3ff', '#ff3fa4', '#ffd23f', '#3dff8a', '#a46bff', '#ff8a3d', '#ffffff', '#ff4d4d'];
const D = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // rechts, unten, links, oben
const BOTN = ['Byte', 'Pixel', 'Neon', 'Volt'];
const nameOf = (r, id) => (id.startsWith('bot') ? '🤖 ' + BOTN[Number(id.slice(3)) % BOTN.length] : (r.players.find(p => p.id === id) || {}).name || 'Jemand');
const stopT = r => { if (r.timer) { clearTimeout(r.timer); r.timer = null; } };

function round(r) {
  const s = r.state; stopT(r);
  s.grid = new Uint8Array(W * H); s.trails = {}; s.out = []; s.round++;
  const n = s.part.length;
  s.part.forEach((id, i) => { // im Kreis aufstellen, Blick zur Mitte
    const a = (i / n) * Math.PI * 2, x = Math.round(W / 2 + Math.cos(a) * (W / 2 - 8)), y = Math.round(H / 2 + Math.sin(a) * (H / 2 - 7));
    const dx = W / 2 - x, dy = H / 2 - y, d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
    s.b[id] = { x, y, d, nd: d, alive: true, col: i };
    s.grid[y * W + x] = i + 1; s.trails[id] = [[x, y]];
  });
  s.phase = 'count'; s.deadline = Date.now() + COUNT_MS;
  r.timer = setTimeout(() => { s.phase = 'run'; s.deadline = null; s.t = 0; r.timer = setInterval(() => tick(r), STEP / SPEED); r.push(); }, COUNT_MS / SPEED);
}
function free(s, x, y) { return x >= 0 && y >= 0 && x < W && y < H && !s.grid[y * W + x]; }
function botThink(s, id) {
  const b = s.b[id]; const opts = [b.d, (b.d + 1) % 4, (b.d + 3) % 4];
  const score = d => { // wie viel Platz liegt in diese Richtung? (kleine Flutfüllung)
    const sx = b.x + D[d][0], sy = b.y + D[d][1]; if (!free(s, sx, sy)) return -1;
    const seen = new Set([sy * W + sx]), q = [[sx, sy]]; let n = 0;
    while (q.length && n < 120) { const [x, y] = q.shift(); n++; for (const [dx, dy] of D) { const nx = x + dx, ny = y + dy, k = ny * W + nx; if (free(s, nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } } }
    return n + (d === b.d ? 3 : 0) + Math.random() * 4;
  };
  let best = b.d, bs = -2; for (const d of opts) { const v = score(d); if (v > bs) { bs = v; best = d; } }
  if (Math.random() < 0.04) { const alt = opts[1 + ((Math.random() * 2) | 0)]; if (score(alt) > 40) best = alt; }
  b.nd = best;
}
function tick(r) {
  const s = r.state; if (s.phase !== 'run') return;
  s.t++;
  const live = s.part.filter(id => s.b[id].alive);
  for (const id of live) if (id.startsWith('bot')) botThink(s, id);
  const next = {};
  for (const id of live) { const b = s.b[id]; if ((b.nd + 2) % 4 !== b.d) b.d = b.nd; next[id] = [b.x + D[b.d][0], b.y + D[b.d][1]]; }
  const crash = new Set();
  for (const id of live) { const [x, y] = next[id]; if (!free(s, x, y)) crash.add(id); for (const o of live) if (o !== id && next[o][0] === x && next[o][1] === y) crash.add(id); }
  for (const id of live) {
    const b = s.b[id];
    if (crash.has(id)) { b.alive = false; s.out.push(id); continue; }
    [b.x, b.y] = next[id]; s.grid[b.y * W + b.x] = b.col + 1; s.trails[id].push([b.x, b.y]);
  }
  r.cast({ g: 'tron', t: s.t, h: s.part.map(id => { const b = s.b[id]; return [b.x, b.y, b.alive ? 1 : 0]; }), out: [...crash] });
  const still = s.part.filter(id => s.b[id].alive);
  if (still.length <= 1 || (s.part.length === 1 && !still.length)) {
    stopT(r);
    // Punkte: Letzter Überlebender 3, Zweiter 1 (bei mehr als 2 Spielern)
    const order = [...still, ...s.out.slice().reverse()];
    s.lastWin = still[0] || null;
    if (still[0]) s.score[still[0]] = (s.score[still[0]] || 0) + 3;
    if (s.part.length > 2 && order[1]) s.score[order[1]] = (s.score[order[1]] || 0) + 1;
    s.phase = 'pause'; s.deadline = Date.now() + PAUSE_MS;
    if (s.round >= ROUNDS) { s.phase = 'end'; s.deadline = null; r.status = 'ended'; r.push(); return; }
    r.push();
    r.timer = setTimeout(() => { round(r); r.push(); }, PAUSE_MS / SPEED);
  }
}

module.exports = {
  title: 'Lichtrad', min: 2, seats: 8, W, H, COLORS,
  solo: (r, m) => !!(m && m.bots),
  start(r, m = {}) {
    stopT(r);
    const humans = r.players.slice(0, 8).map(p => p.id), part = [...humans];
    const bots = m.bots ? Math.max(1, Math.min(4, Number(m.bots) || 2)) : 0;
    for (let i = 0; i < bots && part.length < 8; i++) part.push('bot' + i);
    r.state = { part, b: {}, score: Object.fromEntries(part.map(id => [id, 0])), round: 0, phase: 'count', names: Object.fromEntries(part.map(id => [id, nameOf(r, id)])), bots };
    r.status = 'playing';
    round(r);
  },
  onLeave(r, pid) {
    const s = r.state; if (!s || r.status !== 'playing' || !s.b[pid]) return;
    s.b[pid].alive = false;
    if (!r.players.some(p => s.part.includes(p.id))) { stopT(r); r.status = 'ended'; s.phase = 'end'; }
  },
  act(r, pid, a) {
    const s = r.state; if (!s || r.status !== 'playing') return 'quiet';
    const b = s.b[pid]; if (!b || !b.alive || a.type !== 'dir') return 'quiet';
    const d = Number(a.d); if (d >= 0 && d < 4 && (d + 2) % 4 !== b.d) b.nd = d;
    return 'quiet';
  },
  winners(r) { const s = r.state; if (!s) return []; const max = Math.max(...s.part.map(id => s.score[id] || 0)); return max > 0 ? s.part.filter(id => !id.startsWith('bot') && s.score[id] === max) : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    return { phase: s.phase, round: s.round, rounds: ROUNDS, W, H, part: s.part, names: s.names, cols: s.part.map((_, i) => COLORS[i]), score: s.score, me: s.part.indexOf(pid),
      trails: s.part.map(id => s.trails ? s.trails[id] : []), alive: s.part.map(id => (s.b[id] ? s.b[id].alive : true)), dirs: s.part.map(id => (s.b[id] ? s.b[id].d : 0)),
      left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null, lastWin: s.lastWin || null, t: s.t || 0 };
  },
};
