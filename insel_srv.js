// Inselreich – gemeinsame Welt für alle (Prototyp).
// Die Landschaft entsteht in jedem Gerät aus demselben Startwert, der Server kennt nur die Spieler und die Bauplätze.
// Jeder bekommt 5× pro Sekunde nur die Spieler in seiner Nähe (spart Datenvolumen).
// Bauplätze (eigene Basen) werden dauerhaft gespeichert: im privaten GitHub-Projekt (GITHUB_TOKEN, SAVE_REPO) wie die Ritterlauf-Spielstände,
// sonst in einer lokalen Datei.
'use strict';
const fs = require('fs');
const path = require('path');
const TICK = 200, NEAR = 48, CHAT_NEAR = 1e9, PLOTS = 15, PLOT_W = 10;
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const KEY = /^[a-z_]{2,20}$/;

const TOKEN = process.env.GITHUB_TOKEN || '', REPO = process.env.SAVE_REPO || '';
const FILE = 'inselreich-basen.json', LOCAL = path.join(__dirname, 'inselreich-basen.local.json');
const durable = !!(TOKEN && REPO);
const gh = (method, body) => fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
  method, headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'fsg-spiele', 'X-GitHub-Api-Version': '2022-11-28' }, body: body ? JSON.stringify(body) : undefined,
});

module.exports = function (send) {
  const P = new Map(); // Verbindung -> Spieler
  let tick = 0;
  // ---------- Bauplätze ----------
  // id -> { o: Spieler-id, n: Name, it: { "x,y": [Boden, Gegenstand] }, c: { Rohstoff: Anzahl }, g: { "x,y": [Samen, gepflanzt] }, a: { "x,y": zuletzt geerntet }, t }
  let plots = {}, sha = null, dirty = false, timer = null, loaded = false;
  (async () => {
    try {
      if (durable) {
        const r = await gh('GET');
        if (r.status === 200) { const j = await r.json(); sha = j.sha; plots = JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8') || '{}'); }
      } else if (fs.existsSync(LOCAL)) plots = JSON.parse(fs.readFileSync(LOCAL, 'utf8'));
    } catch (e) { console.error('Inselreich-Basen laden:', e); }
    // verlassene Bauplätze nach 45 Tagen freigeben
    for (const [id, p] of Object.entries(plots)) if (Date.now() - (p.t || 0) > 45 * 864e5) delete plots[id];
    loaded = true;
    console.log(`Inselreich: ${Object.keys(plots).length} Basen geladen (${durable ? 'GitHub' : 'lokal'})`);
  })();
  async function flush() {
    if (!dirty) return; dirty = false;
    const text = JSON.stringify(plots);
    try {
      if (durable) {
        for (let i = 0; i < 2; i++) {
          const r = await gh('PUT', { message: 'Inselreich-Basen', content: Buffer.from(text).toString('base64'), ...(sha ? { sha } : {}) });
          if (r.ok) { sha = (await r.json()).content.sha; return; }
          if (r.status === 409 || r.status === 422) { const g = await gh('GET'); if (g.ok) sha = (await g.json()).sha; continue; }
          console.error('Inselreich-Basen speichern:', r.status); break;
        }
        dirty = true;
      } else fs.writeFileSync(LOCAL, text);
    } catch (e) { dirty = true; console.error('Inselreich-Basen speichern:', e); }
  }
  function mark(id) {
    if (plots[id]) plots[id].t = Date.now();
    dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 20000);
    const msg = { t: 'i_plot', id, p: plots[id] || null };
    for (const c of P.keys()) send(c, msg);
  }
  const onExit = () => { if (dirty) flush().finally(() => process.exit(0)); else process.exit(0); };
  process.once('SIGTERM', onExit); process.once('SIGINT', onExit);
  const tileKey = (x, y) => { x = Math.floor(num(x, -1)); y = Math.floor(num(y, -1)); return x >= 0 && y >= 0 && x < PLOT_W && y < PLOT_W ? x + ',' + y : null; };
  const own = (c, id) => { const p = plots[id]; return p && p.o === c.pid ? p : null; };

  // Aussehen: Hut, Titel, Haustier, Bootsfarbe
  const meta = m => (m && typeof m === 'object' ? { hat: clean(m.hat, 12), title: clean(m.title, 20), pet: clean(m.pet, 12), bc: clean(m.bc, 10) } : null);
  function state(s) {
    // [x, y, Richtung, Bewegung, im Boot, Boot x, Boot y, Kurs, Segel, Angriff, Stufe]
    if (!Array.isArray(s)) return null;
    const v = s.slice(0, 11).map(x => Math.round(num(x) * 100) / 100);
    if (Math.abs(v[0]) > 1e6 || Math.abs(v[1]) > 1e6) return null;
    return v;
  }
  function handle(c, m) {
    if (m.t === 'i_join') {
      const s = state(m.s); if (!s) return;
      P.set(c, { id: c.pid, name: clean(m.name, 16) || 'Gast', col: Math.floor(num(m.col)) % 8, s, last: Date.now(), meta: meta(m.m) });
      send(c, { t: 'i_hi', id: c.pid, n: P.size });
      send(c, { t: 'i_plots', plots, ready: loaded });
      return;
    }
    const me = P.get(c); if (!me) return;
    if (m.t === 'i_s') { const s = state(m.s); if (s) { me.s = s; me.last = Date.now(); } return; }
    if (m.t === 'i_chat') {
      const text = clean(m.m, 120); if (!text) return;
      for (const [o, q] of P) if (Math.hypot(q.s[0] - me.s[0], q.s[1] - me.s[1]) < CHAT_NEAR) send(o, { t: 'i_chat', n: me.name, m: text });
      return;
    }
    if (m.t === 'i_leave') { P.delete(c); return; }
    if (m.t === 'i_meta') { me.meta = meta(m.m); return; }
    // ---------- Basen ----------
    const id = Math.floor(num(m.id, -1));
    if (m.t === 'i_claim') {
      if (id < 0 || id >= PLOTS || plots[id] || Object.values(plots).some(p => p.o === c.pid)) return;
      plots[id] = { o: c.pid, n: me.name, it: {}, c: {}, g: {}, a: {}, t: Date.now() }; mark(id); return;
    }
    const p = own(c, id); if (!p) return;
    p.n = me.name;
    if (m.t === 'i_unclaim') { delete plots[id]; mark(id); return; }
    const k = tileKey(m.x, m.y);
    if (m.t === 'i_put') { // Bauteil setzen: Ebene 0 Boden, 1 Gegenstand
      if (!k || !KEY.test(String(m.k)) || Object.keys(p.it).length > 120) return;
      const L = m.l ? 1 : 0, cur = p.it[k] || [null, null]; cur[L] = m.k; p.it[k] = cur; mark(id); return;
    }
    if (m.t === 'i_del') {
      if (!k || !p.it[k]) return;
      const L = m.l ? 1 : 0; p.it[k][L] = null; if (!p.it[k][0] && !p.it[k][1]) delete p.it[k];
      delete p.g[k]; delete p.a[k]; mark(id); return;
    }
    if (m.t === 'i_chest') { // n > 0 einlagern, n < 0 herausnehmen
      const r = String(m.k), n = Math.floor(num(m.n)); if (!KEY.test(r) || !n) return;
      const have = p.c[r] || 0; if (n < 0 && have < -n) return;
      p.c[r] = have + n; if (!p.c[r]) delete p.c[r]; mark(id); return;
    }
    if (m.t === 'i_plant') { if (!k || !KEY.test(String(m.k))) return; p.g[k] = [m.k, Date.now()]; mark(id); return; }
    if (m.t === 'i_crop') { if (!k) return; delete p.g[k]; mark(id); return; }
    if (m.t === 'i_collect') { if (!k) return; p.a[k] = Date.now(); mark(id); return; }
  }
  function drop(c) { P.delete(c); }
  setInterval(() => {
    tick++;
    const all = [...P.entries()];
    for (const [c, me] of all) {
      if (Date.now() - me.last > 5 * 60e3) { P.delete(c); continue; }
      const near = [];
      for (const [o, q] of all) { if (o === c) continue; const bx = q.s[4] ? q.s[0] : q.s[5], by = q.s[4] ? q.s[1] : q.s[6]; if (Math.hypot(q.s[0] - me.s[0], q.s[1] - me.s[1]) < NEAR || Math.hypot(bx - me.s[0], by - me.s[1]) < NEAR) near.push([q.id, q.name, q.col, ...q.s, q.meta || 0]); }
      const key = JSON.stringify(near);
      if (key !== me.sent || tick % 10 === 0) { me.sent = key; send(c, { t: 'i_w', p: near, n: P.size }); }
    }
  }, TICK);
  return { handle, drop, flush };
};
