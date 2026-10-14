// FSG Spielehub – Server
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
const konten = require('./konten.js');
const ROOM_CAP = 12;           // Personen pro Raum (inkl. Zuschauer)
const IDLE_MS = 30 * 60 * 1000; // Räume ohne verbundene Spieler verschwinden nach 30 Min.

const STATIC = {
  '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css',
  '/mini.js': 'mini.js', '/ritter.js': 'ritter.js', '/spiele2.js': 'spiele2.js',
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/health') { res.end('ok'); return; }
  if (url.startsWith('/api/')) { api(req, res, url.slice(5)); return; }
  const file = STATIC[url];
  if (!file) { res.writeHead(302, { Location: '/' }); res.end(); return; }
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) { res.writeHead(500); res.end('Fehler'); return; }
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
server.listen(PORT, () => console.log(`FSG Spielehub läuft auf Port ${PORT}`));
