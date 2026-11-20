// Kugel-Arena (.io-Spiel): Sammle Lichtpunkte, werde größer und schnapp dir kleinere Kugeln.
// Der Server rechnet 20 Schritte pro Sekunde und schickt 10-mal pro Sekunde die Positionen (r.cast).
const SPEED = Number(process.env.FSG_SPEED) || 1;
const WORLD = 1800, FOOD = 260, TICK = 50, GAME_MS = 180000, START_M = 20, RESPAWN_MS = 2500, FILL = 10;
const COLORS = ['#22e3ff', '#ff3fa4', '#ffd23f', '#3dff8a', '#a46bff', '#ff8a3d', '#ff4d6d', '#4dd2ff', '#c6ff3d', '#ff9de2', '#7cffcb', '#ffb347', '#b08cff', '#5cf2ff', '#ff6b3d', '#e2e2e2'];
const BOTN = ['Blubb', 'Kugelblitz', 'Mampf', 'Dotti', 'Wobbel', 'Orbit', 'Krümel', 'Planetchen', 'Nugget', 'Bällchen'];
const rad = m => 6 + Math.sqrt(m) * 3.2;
const rnd = n => Math.random() * n;
const stopT = r => { if (r.timer) { clearTimeout(r.timer); r.timer = null; } };
function spawn(s, e) { // freie Stelle suchen, weg von großen Kugeln
  for (let t = 0; t < 30; t++) { const x = 80 + rnd(WORLD - 160), y = 80 + rnd(WORLD - 160); if (s.ents.every(o => !o.alive || o === e || Math.hypot(o.x - x, o.y - y) > rad(o.m) + 160)) { e.x = x; e.y = y; break; } e.x = 80 + rnd(WORLD - 160); e.y = 80 + rnd(WORLD - 160); }
  e.m = START_M; e.alive = true; e.vx = 0; e.vy = 0; e.tx = e.x; e.ty = e.y; e.boost = 0;
}
function addEnt(r, id, name) {
  const s = r.state; const e = { id, name, col: COLORS[s.ents.length % COLORS.length], kills: 0, best: START_M, deaths: 0 };
  s.ents.push(e); spawn(s, e); return e;
}
function botThink(s, e) {
  const R = rad(e.m); let tx = null, ty = null, best = 1e9;
  for (const o of s.ents) { if (o === e || !o.alive) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); const ro = rad(o.m);
    if (ro > R * 1.12 && d < ro + 220) { tx = e.x - (o.x - e.x); ty = e.y - (o.y - e.y); best = -1; break; } // fliehen
    if (R > ro * 1.15 && d < 380 && d < best) { best = d; tx = o.x; ty = o.y; } }
  if (best === 1e9) for (let i = 0; i < s.food.length; i += 2) { const d = Math.hypot(s.food[i] - e.x, s.food[i + 1] - e.y); if (d < best) { best = d; tx = s.food[i]; ty = s.food[i + 1]; } }
  if (tx != null) { e.tx = tx + (Math.random() - 0.5) * 30; e.ty = ty + (Math.random() - 0.5) * 30; }
}
function tick(r) {
  const s = r.state; if (s.phase !== 'run') return;
  const now = Date.now(); s.t++;
  if (s.t % 4 === 0) for (const e of s.ents) if (e.id.startsWith('bot') && e.alive) botThink(s, e);
  for (const e of s.ents) {
    if (!e.alive) { if (now > e.back) spawn(s, e); continue; }
    const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
    let sp = 6.2 * Math.pow(START_M / e.m, 0.28); if (e.boost > now) sp *= 2.1;
    if (d > 2) { e.x += (dx / d) * Math.min(sp, d); e.y += (dy / d) * Math.min(sp, d); }
    const R = rad(e.m); e.x = Math.max(R * 0.4, Math.min(WORLD - R * 0.4, e.x)); e.y = Math.max(R * 0.4, Math.min(WORLD - R * 0.4, e.y));
    if (e.m > 150) e.m *= 0.9993; // große Kugeln schrumpfen langsam
  }
  const fe = [];
  for (const e of s.ents) { if (!e.alive) continue; const R = rad(e.m);
    for (let i = 0; i < s.food.length; i += 2) if (Math.abs(s.food[i] - e.x) < R && Math.abs(s.food[i + 1] - e.y) < R && Math.hypot(s.food[i] - e.x, s.food[i + 1] - e.y) < R) {
      e.m += 1.2; s.food[i] = 20 + rnd(WORLD - 40); s.food[i + 1] = 20 + rnd(WORLD - 40); fe.push(i / 2, Math.round(s.food[i]), Math.round(s.food[i + 1])); } }
  const ev = [];
  for (const a of s.ents) for (const b of s.ents) {
    if (a === b || !a.alive || !b.alive) continue; const ra = rad(a.m), rb = rad(b.m);
    if (ra > rb * 1.15 && Math.hypot(a.x - b.x, a.y - b.y) < ra - rb * 0.35) {
      a.m += b.m * 0.85; a.kills++; b.alive = false; b.deaths++; b.back = now + RESPAWN_MS / SPEED; ev.push([s.ents.indexOf(a), s.ents.indexOf(b)]);
    }
  }
  for (const e of s.ents) e.best = Math.max(e.best, e.m);
  if (s.t % 2 === 0 || ev.length) r.cast({ g: 'arena', t: s.t, p: s.ents.map(e => [Math.round(e.x), Math.round(e.y), Math.round(e.m), e.alive ? (e.boost > now ? 2 : 1) : 0]), fe: fe.length ? fe : undefined, ev: ev.length ? ev : undefined, left: Math.max(0, s.end - now) });
  else if (fe.length) r.cast({ g: 'arena', t: s.t, fe });
  if (now >= s.end) { stopT(r); s.phase = 'end'; r.status = 'ended'; r.push(); }
}

module.exports = {
  title: 'Kugel-Arena', min: 1, seats: 12, WORLD,
  start(r) {
    stopT(r);
    r.state = { ents: [], food: [], phase: 'run', t: 0, end: Date.now() + GAME_MS / SPEED };
    const s = r.state;
    for (let i = 0; i < FOOD; i++) s.food.push(20 + rnd(WORLD - 40), 20 + rnd(WORLD - 40));
    for (const p of r.players) addEnt(r, p.id, p.name);
    for (let i = 0; s.ents.length < FILL; i++) addEnt(r, 'bot' + i, '🤖 ' + BOTN[i % BOTN.length]);
    r.status = 'playing';
    r.timer = setInterval(() => tick(r), TICK / SPEED);
  },
  onJoin(r, pid, name) {
    const s = r.state; if (!s || r.status !== 'playing' || s.ents.some(e => e.id === pid)) return;
    const bot = s.ents.find(e => e.id.startsWith('bot') && !e.taken);
    if (bot && s.ents.length >= FILL) { bot.id = pid; bot.name = name; bot.taken = true; spawn(s, bot); bot.kills = 0; bot.best = START_M; bot.deaths = 0; } // Bot macht Platz
    else addEnt(r, pid, name);
  },
  onLeave(r, pid) {
    const s = r.state; if (!s) return; const e = s.ents.find(x => x.id === pid); if (!e) return;
    e.id = 'bot' + s.ents.indexOf(e) + 'x'; e.name = '🤖 ' + BOTN[s.ents.indexOf(e) % BOTN.length]; e.taken = false;
    if (!r.players.length) stopT(r);
  },
  act(r, pid, a) {
    const s = r.state; if (!s || s.phase !== 'run') return 'quiet';
    const e = s.ents.find(x => x.id === pid); if (!e || !e.alive) return 'quiet';
    if (a.type === 'to') { const x = Number(a.x), y = Number(a.y); if (Number.isFinite(x) && Number.isFinite(y)) { e.tx = Math.max(0, Math.min(WORLD, x)); e.ty = Math.max(0, Math.min(WORLD, y)); } }
    else if (a.type === 'boost' && e.m > START_M + 6 && !(e.boost > Date.now())) { e.boost = Date.now() + 600; e.m = Math.max(START_M, e.m * 0.9); }
    return 'quiet';
  },
  winners(r) { const s = r.state; if (!s) return []; const hum = s.ents.filter(e => !e.id.startsWith('bot')); if (!hum.length) return []; const top = [...s.ents].sort((a, b) => b.best - a.best)[0]; return top && !top.id.startsWith('bot') ? [top.id] : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    return { phase: s.phase, WORLD, me: s.ents.findIndex(e => e.id === pid), ents: s.ents.map(e => ({ n: e.name, c: e.col, x: Math.round(e.x), y: Math.round(e.y), m: Math.round(e.m), a: e.alive ? 1 : 0, k: e.kills, b: Math.round(e.best), bot: e.id.startsWith('bot') })), food: s.food.map(Math.round), left: Math.max(0, s.end - Date.now()) };
  },
};
