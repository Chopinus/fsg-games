// Spiele-Hub – Server
// Liefert die Webseite aus und hält alle Spielrunden im Speicher.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const GAMES = {
  uno: require('./uno.js'),
  schach: require('./schach.js'),
  maedn: require('./maedn.js'),
  vier: require('./vier.js'),
  party: require('./party.js'),
  maler: require('./maler.js'),
  slf: require('./slf.js'),
  spion: require('./spion.js'),
  kniffel: require('./kniffel.js'),
};
// Umzug: Ist auf diesem Render-Dienst die Umgebungsvariable MOVED_TO gesetzt (z. B. https://onegame.onrender.com),
// zeigt jede Seite nur noch den Umzugs-Hinweis. Spielstände werden dann hier weder geladen noch gespeichert,
// damit dieser alte Dienst die Spielstand-Datei des neuen nicht überschreibt.
// (MOVE_TO ohne D wird auch akzeptiert; fehlt https://, wird es ergänzt)
const MOVED = (s => (s && !/^https?:\/\//i.test(s) ? 'https://' + s : s))(String(process.env.MOVED_TO || process.env.MOVE_TO || '').trim().replace(/\/+$/, ''));
const konten = MOVED ? null : require('./konten.js');
const MOVED_HOST = MOVED.replace(/^https?:\/\//i, '');
if (MOVED) console.log(`Umzugs-Modus: alle Seiten zeigen den Hinweis auf ${MOVED}`);
const MOVED_PAGE = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wir sind umgezogen</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#f4ecdf;
background:radial-gradient(ellipse at 50% 120%,#5a2c12 0%,#1c1424 45%,#0b0a14 100%)}
.card{max-width:520px;width:100%;text-align:center;padding:36px 28px;border-radius:20px;background:rgba(28,22,40,.85);border:1px solid rgba(255,190,110,.25);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.fire{font-size:54px;line-height:1;filter:drop-shadow(0 0 18px rgba(255,150,60,.7))}
h1{margin:14px 0 10px;font-size:clamp(26px,6vw,34px);color:#ffd27a}
p{margin:0 0 14px;font-size:17px;line-height:1.5;color:#e9dccb}
.url{display:inline-block;margin:6px 0 22px;padding:8px 14px;border-radius:10px;background:rgba(255,210,122,.1);border:1px dashed rgba(255,210,122,.45);font-weight:700;color:#ffd27a;word-break:break-all}
a.btn{display:inline-block;padding:14px 34px;border-radius:999px;background:#ffb547;color:#2a1608;font-weight:800;font-size:18px;text-decoration:none;box-shadow:0 8px 24px rgba(255,150,60,.35)}
a.btn:hover{background:#ffc66a}small{display:block;margin-top:20px;color:rgba(233,220,203,.6);font-size:14px}
</style></head><body><main class="card"><div class="fire">🔥</div><h1>Wir sind umgezogen!</h1>
<p>Die Spiele gibt es ab jetzt auf einer neuen Website. Bitte spiele ab sofort dort weiter:</p>
<div class="url">${MOVED_HOST}</div><br><a class="btn" href="${MOVED}/">Zur neuen Website</a>
<small>Dein Ritterlauf-Spielstand mit Name und Passwort ist dort weiterhin da. Melde dich einfach mit denselben Daten an.<br>Speichere dir am besten die neue Adresse als Lesezeichen.</small></main></body></html>`;
const ROOM_CAP = 12;           // Personen pro Raum (inkl. Zuschauer)
const IDLE_MS = 30 * 60 * 1000; // Räume ohne verbundene Spieler verschwinden nach 30 Min.

const STATIC = {
  '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css',
  '/mini.js': 'mini.js', '/ritter.js': 'ritter.js', '/spiele2.js': 'spiele2.js',
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// Sounddateien: gesucht im Ordner sounds/ (Groß-/Kleinschreibung egal), sonst neben server.js oder in ritter/
const SOUND_DIRS = (() => {
  const out = [];
  try { for (const d of fs.readdirSync(__dirname, { withFileTypes: true })) if (d.isDirectory() && /^(sounds?|audio|musik)$/i.test(d.name)) out.push(path.join(__dirname, d.name)); } catch {}
  try { for (const d of fs.readdirSync(__dirname, { withFileTypes: true })) if (d.isDirectory() && d.name.toLowerCase() === 'ritter') out.push(path.join(__dirname, d.name)); } catch {}
  out.push(__dirname);
  return out;
})();
function soundFile(name) {
  for (const d of SOUND_DIRS) {
    try { const hit = fs.readdirSync(d).find(f => f.toLowerCase() === name.toLowerCase()); if (hit) return path.join(d, hit); } catch {}
  }
  return path.join(SOUND_DIRS[0], name);
}
{
  const n = SOUND_DIRS.map(d => { try { return [path.relative(__dirname, d) || 'Hauptordner', fs.readdirSync(d).filter(f => /\.mp3$/i.test(f)).length]; } catch { return null; } }).filter(x => x && x[1]);
  console.log(n.length ? 'Sounds gefunden: ' + n.map(([d, c]) => `${c} mp3 in ${d}`).join(', ') : 'FEHLER Sounds: keine mp3-Dateien gefunden. Ordner "sounds" neben server.js anlegen. Ordner von server.js: ' + __dirname);
}

// Musik: Streaming mit Range-Anfragen (nötig für iPhone/Safari), lange Browser-Zwischenspeicherung
function sendSound(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end(); return; }
    const base = { 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=2592000', ETag: '"' + st.size + '-' + Math.floor(st.mtimeMs) + '"' };
    if (req.headers['if-none-match'] === base.ETag) { res.writeHead(304, base); res.end(); return; }
    let a = 0, b = st.size - 1, code = 200;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      if (m[1]) { a = Number(m[1]); if (m[2]) b = Math.min(b, Number(m[2])); } else { a = Math.max(0, st.size - Number(m[2])); }
      if (a > b || a >= st.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); res.end(); return; }
      code = 206; base['Content-Range'] = `bytes ${a}-${b}/${st.size}`;
    }
    base['Content-Length'] = b - a + 1;
    res.writeHead(code, base);
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file, { start: a, end: b }).on('error', () => res.destroy()).pipe(res);
  });
}

// Ritterlauf ist in Teile aufgeteilt. Der Server setzt sie in fester Reihenfolge zu /ritter.js zusammen.
// Gesucht wird im Ordner ritter/ (Groß-/Kleinschreibung egal) und direkt neben server.js.
// Fehlen Teile, wird wie früher die einzelne Datei ritter.js geliefert.
const RITTER_PARTS = ['1_spiel.js', '2_audio.js', '3_grafik.js', '4_oberflaeche.js'];
function ritterDir() {
  const dirs = [];
  try { for (const d of fs.readdirSync(__dirname, { withFileTypes: true })) if (d.isDirectory() && d.name.toLowerCase() === 'ritter') dirs.push(path.join(__dirname, d.name)); } catch {}
  dirs.push(__dirname);
  return dirs.find(d => RITTER_PARTS.every(p => fs.existsSync(path.join(d, p)))) || null;
}
{
  const d = ritterDir(), single = fs.existsSync(path.join(__dirname, 'ritter.js'));
  if (d) console.log('Ritterlauf: Teile gefunden in ' + (path.relative(__dirname, d) || 'Hauptordner'));
  else if (single) console.log('Ritterlauf: einzelne Datei ritter.js wird benutzt');
  else {
    const found = [];
    (function walk(dir, depth) { if (depth > 2) return; try { for (const x of fs.readdirSync(dir, { withFileTypes: true })) { if (x.name === 'node_modules' || x.name.startsWith('.')) continue; const p = path.join(dir, x.name); if (x.isDirectory()) walk(p, depth + 1); else if (RITTER_PARTS.includes(x.name)) found.push(path.relative(__dirname, p)); } } catch {} })(__dirname, 0);
    console.log('FEHLER Ritterlauf: weder Ordner ritter/ mit allen 4 Teilen noch ritter.js gefunden. Gefundene Teile: ' + (found.join(', ') || 'keine') + '. Ordner von server.js: ' + __dirname);
  }
}
function readStatic(file, cb) {
  const d = file === 'ritter.js' ? ritterDir() : null;
  if (!d) { fs.readFile(path.join(__dirname, file), cb); return; }
  Promise.all(RITTER_PARTS.map(p => fs.promises.readFile(path.join(d, p))))
    .then(parts => cb(null, Buffer.concat(parts)), err => cb(err));
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/health') { res.end('ok'); return; }
  if (MOVED) {
    if (url.startsWith('/api/')) { res.writeHead(410, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: `Die Spiele sind umgezogen auf ${MOVED_HOST}. Bitte spiele dort weiter.` })); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : MOVED_PAGE); return;
  }
  if (url.startsWith('/api/')) { api(req, res, url.slice(5)); return; }
  if (/^\/sounds\/[a-z0-9_-]+\.mp3$/.test(url)) { sendSound(req, res, soundFile(path.basename(url))); return; }
  const file = STATIC[url];
  if (!file) { res.writeHead(302, { Location: '/' }); res.end(); return; }
  readStatic(file, (err, data) => {
    if (err) { console.log('Datei fehlt: ' + file); res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(file === 'ritter.js' ? 'console.error("Ritterlauf fehlt auf dem Server: Ordner ritter/ mit 1_spiel.js, 2_audio.js, 3_grafik.js, 4_oberflaeche.js hochladen.")' : 'Fehler'); return; }
    // ETag: Fingerabdruck der Datei. Damit erkennen offene Spiele ein Update und Browser laden nur Geändertes neu.
    const etag = '"' + crypto.createHash('sha1').update(data).digest('hex').slice(0, 16) + '"';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' }); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)], 'Cache-Control': 'no-cache', ETag: etag });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

// Spielstände (Ritterlauf) mit Name und Passwort
function api(req, res, action) {
  const reply = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return reply(405, { error: 'Nur POST' });
  let body = '';
  req.on('data', ch => { body += ch; if (body.length > 65536) { reply(413, { error: 'Zu groß' }); req.destroy(); } });
  req.on('end', async () => {
    if (res.writableEnded) return;
    let data = {};
    try { data = JSON.parse(body || '{}'); } catch { return reply(400, { error: 'Ungültige Anfrage' }); }
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    try { const [code, obj] = await konten.handle(action, data, ip); reply(code, obj); }
    catch (e) { console.error(e); reply(500, { error: 'Da ist etwas schiefgelaufen.' }); }
  });
}

const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });
const clients = new Set();
const rooms = new Map();

const clean = (s, max = 16) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
const rid = () => crypto.randomBytes(4).toString('hex');
const send = (c, m) => { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(m)); };
const online = (r, pid) => [...clients].some(c => c.pid === pid && c.room === r.id);

function summary(r) {
  const G = GAMES[r.game];
  return {
    id: r.id, game: r.game, name: r.name, status: r.status,
    players: r.players.map(p => ({ name: p.name, host: p.id === r.host })),
    seats: G.seats, full: r.players.length >= ROOM_CAP,
  };
}
let roomsTimer = null;
function broadcastRooms() {
  if (roomsTimer) return;
  roomsTimer = setTimeout(() => {
    roomsTimer = null;
    // Nur Runden zeigen, in denen gerade jemand online ist
    const connected = new Set([...clients].map(c => c.pid));
    const list = [...rooms.values()].filter(r => r.players.some(p => connected.has(p.id)))
      .sort((a, b) => b.created - a.created).map(summary);
    for (const c of clients) send(c, { t: 'rooms', rooms: list });
  }, 80);
}
function pushRoom(r) {
  r.updated = Date.now();
  const G = GAMES[r.game];
  for (const c of clients) {
    if (c.room !== r.id) continue;
    let view = null;
    try { view = G.view(r, c.pid); } catch (e) { console.error(e); }
    send(c, {
      t: 'room',
      room: {
        id: r.id, game: r.game, name: r.name, host: r.host, status: r.status, me: c.pid,
        min: G.min, seats: G.seats,
        players: r.players.map(p => ({ id: p.id, name: p.name, online: online(r, p.id) })),
        view,
      },
    });
  }
  broadcastRooms();
}
function pushSoon(r) {
  if (r.soon) return;
  r.soon = setTimeout(() => { r.soon = null; if (rooms.has(r.id)) pushRoom(r); }, 250);
}
function deleteRoom(r) {
  if (r.timer) clearTimeout(r.timer);
  rooms.delete(r.id);
  for (const c of clients) if (c.room === r.id) { c.room = null; send(c, { t: 'closed' }); }
  broadcastRooms();
}
function leaveRoom(r, pid) {
  const i = r.players.findIndex(p => p.id === pid);
  if (i < 0) return;
  const name = r.players[i].name;
  r.players.splice(i, 1);
  if (!r.players.length) { deleteRoom(r); return; }
  if (r.host === pid) r.host = r.players[0].id;
  try { GAMES[r.game].onLeave?.(r, pid, name); } catch (e) { console.error(e); }
  pushRoom(r);
}

function handle(c, m) {
  if (m.t === 'hello') {
    const key = String(m.key || '');
    if (key.length < 8 || key.length > 64) return;
    c.pid = 'p' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
    c.name = clean(m.name);
    send(c, { t: 'hi', pid: c.pid });
    const r = rooms.get(m.room);
    if (r && r.players.some(p => p.id === c.pid)) { c.room = r.id; pushRoom(r); } else send(c, { t: 'closed' });
    broadcastRooms();
    return;
  }
  if (!c.pid) return;
  if (m.t === 'name') {
    c.name = clean(m.name);
    const r = rooms.get(c.room);
    const p = r && r.players.find(p => p.id === c.pid);
    if (p && c.name) { p.name = c.name; pushRoom(r); }
    return;
  }
  if (m.t === 'create') {
    const G = GAMES[m.game];
    if (!G) return;
    if (!c.name) return send(c, { t: 'err', msg: 'Gib zuerst deinen Namen ein.' });
    if (rooms.size > 200) return send(c, { t: 'err', msg: 'Gerade sind zu viele Räume offen. Versuch es gleich noch mal.' });
    const r = {
      id: rid(), game: m.game, name: clean(m.name, 30) || `${G.title} mit ${c.name}`,
      host: c.pid, players: [{ id: c.pid, name: c.name }], status: 'lobby', state: null,
      created: Date.now(), updated: Date.now(), timer: null,
    };
    r.push = () => pushRoom(r);
    r.cast = d => { const msg = JSON.stringify({ t: 'cast', d }); for (const x of clients) if (x.room === r.id && x.ws.readyState === 1) x.ws.send(msg); };
    G.init?.(r);
    rooms.set(r.id, r);
    c.room = r.id;
    pushRoom(r);
    return;
  }
  if (m.t === 'join') {
    const r = rooms.get(m.room);
    if (!r) return send(c, { t: 'err', msg: 'Diese Runde gibt es nicht mehr.' });
    if (!c.name) return send(c, { t: 'err', msg: 'Gib zuerst deinen Namen ein.' });
    if (!r.players.some(p => p.id === c.pid)) {
      if (r.players.length >= ROOM_CAP) return send(c, { t: 'err', msg: 'Diese Runde ist voll.' });
      r.players.push({ id: c.pid, name: c.name });
      try { GAMES[r.game].onJoin?.(r, c.pid, c.name); } catch (e) { console.error(e); }
    }
    c.room = r.id;
    pushRoom(r);
    return;
  }
  const r = rooms.get(c.room);
  if (m.t === 'hub') { c.room = null; send(c, { t: 'closed' }); if (r) pushRoom(r); return; }
  if (!r) return;
  const G = GAMES[r.game];
  if (m.t === 'leave') { c.room = null; send(c, { t: 'closed' }); leaveRoom(r, c.pid); return; }
  if (m.t === 'close') { if (r.host === c.pid) deleteRoom(r); return; }
  if (m.t === 'start') {
    if (r.host !== c.pid) return;
    if (r.players.length < G.min) return send(c, { t: 'err', msg: `Es braucht mindestens ${G.min} Spieler.` });
    G.start(r);
    pushRoom(r);
    return;
  }
  if (m.t === 'act') {
    if (!r.players.some(p => p.id === c.pid) || !m.a || typeof m.a !== 'object') return;
    const err = G.act(r, c.pid, m.a);
    if (err === 'quiet') return;
    if (err === 'soon') { pushSoon(r); return; } // häufige Live-Updates gebündelt senden
    if (typeof err === 'string') send(c, { t: 'err', msg: err });
    pushRoom(r);
  }
}

wss.on('connection', ws => {
  const c = { ws, pid: null, name: '', room: null, alive: true };
  clients.add(c);
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', buf => {
    let m;
    try { m = JSON.parse(buf); } catch { return; }
    if (!m || typeof m !== 'object') return;
    try { handle(c, m); } catch (e) { console.error(e); send(c, { t: 'err', msg: 'Da ist etwas schiefgelaufen.' }); }
  });
  ws.on('close', () => {
    clients.delete(c);
    const r = rooms.get(c.room);
    if (r) pushRoom(r);
  });
});

// Verbindungen lebendig halten und alte Räume aufräumen
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) { c.ws.terminate(); continue; }
    c.alive = false;
    try { c.ws.ping(); } catch {}
  }
  const now = Date.now();
  for (const r of rooms.values()) {
    const anyOnline = r.players.some(p => online(r, p.id));
    if (!anyOnline && now - r.updated > IDLE_MS) deleteRoom(r);
  }
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Spiele-Hub läuft auf Port ${PORT}`));
