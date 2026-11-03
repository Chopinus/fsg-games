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
  // gespeichert wird { plots, crews, top } (ältere Dateien enthalten nur die Bauplätze)
  let plots = {}, crews = {}, top = [], sha = null, dirty = false, timer = null, loaded = false;
  const unpack = j => { if (j && j.plots) { plots = j.plots || {}; crews = j.crews || {}; top = j.top || []; } else plots = j || {}; };
  (async () => {
    try {
      if (durable) {
        const r = await gh('GET');
        if (r.status === 200) { const j = await r.json(); sha = j.sha; unpack(JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8') || '{}')); }
      } else if (fs.existsSync(LOCAL)) unpack(JSON.parse(fs.readFileSync(LOCAL, 'utf8')));
    } catch (e) { console.error('Inselreich-Basen laden:', e); }
    // verlassene Bauplätze nach 45 Tagen freigeben
    for (const [id, p] of Object.entries(plots)) if (Date.now() - (p.t || 0) > 45 * 864e5) delete plots[id];
    loaded = true;
    console.log(`Inselreich: ${Object.keys(plots).length} Basen geladen (${durable ? 'GitHub' : 'lokal'})`);
  })();
  async function flush() {
    if (!dirty) return; dirty = false;
    const text = JSON.stringify({ plots, crews, top });
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
  function touch() { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 20000); }
  function mark(id) {
    if (plots[id]) plots[id].t = Date.now();
    dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 20000);
    const msg = { t: 'i_plot', id, p: plots[id] || null };
    for (const c of P.keys()) send(c, msg);
  }
  const onExit = () => { if (dirty) flush().finally(() => process.exit(0)); else process.exit(0); };
  process.once('SIGTERM', onExit); process.once('SIGINT', onExit);
  const connOf = pid => { for (const [c, q] of P) if (q.id === pid) return c; return null; };
  const near = (me, r) => [...P.entries()].filter(([, q]) => q !== me && Math.hypot(q.s[0] - me.s[0], q.s[1] - me.s[1]) < r).map(([c]) => c);
  const crewOf = pid => Object.entries(crews).find(([, cr]) => cr.m.includes(pid));
  function crewState(c) { const cc = crewOf(c.pid); send(c, { t: 'i_crew', code: cc ? cc[0] : null, n: cc ? cc[1].n : null, names: cc ? cc[1].m.map(pid => cc[1].names[pid] || '?') : [] }); }
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
      crewState(c); send(c, { t: 'i_top', top });
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
    // gemeinsame Gegner: der Gastgeber einer Insel schickt ihre Lage, die anderen melden Treffer
    if (m.t === 'i_fx') { if (!Array.isArray(m.e) || m.e.length > 12) return; const msg = { t: 'i_fx', from: c.pid, z: clean(m.z, 40), e: m.e.map(e => (Array.isArray(e) ? e.slice(0, 8).map(v => (typeof v === 'string' ? clean(v, 16) : Math.round(num(v) * 100) / 100)) : null)).filter(Boolean) }; for (const o of near(me, NEAR)) send(o, msg); return; }
    if (m.t === 'i_hit' || m.t === 'i_kill') { const o = connOf(clean(m.to, 20)); if (o) send(o, { t: m.t, from: c.pid, id: Math.floor(num(m.id)), dmg: Math.min(20, num(m.dmg, 1)), nx: num(m.nx), ny: num(m.ny), k: clean(m.k, 16), x: num(m.x), y: num(m.y) }); return; }
    if (m.t === 'i_gift') { const o = connOf(clean(m.to, 20)), n = Math.max(1, Math.min(99, Math.floor(num(m.n, 1)))), k = String(m.k); if (o && KEY.test(k) && Math.hypot(P.get(o).s[0] - me.s[0], P.get(o).s[1] - me.s[1]) < 8) send(o, { t: 'i_gift', from: me.name, k, n }); return; }
    // Crews: Freunde-Gruppen mit Code, sehen sich auf der Karte überall
    if (m.t === 'i_crew_new') { const old = crewOf(c.pid); if (old) return; let code; do { code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join(''); } while (crews[code]); crews[code] = { n: clean(m.n, 20) || me.name + 's Crew', m: [c.pid], names: { [c.pid]: me.name } }; touch(); crewState(c); return; }
    if (m.t === 'i_crew_join') { const code = clean(m.code, 4).toUpperCase(), cr = crews[code]; if (!cr || crewOf(c.pid) || cr.m.length >= 8) { send(c, { t: 'i_crew', err: cr ? 'Diese Crew ist voll.' : 'Diesen Crew-Code gibt es nicht.' }); return; } cr.m.push(c.pid); cr.names[c.pid] = me.name; touch(); for (const pid of cr.m) { const o = connOf(pid); if (o) crewState(o); } return; }
    if (m.t === 'i_crew_leave') { const cc = crewOf(c.pid); if (!cc) return; const [code, cr] = cc; cr.m = cr.m.filter(x => x !== c.pid); delete cr.names[c.pid]; if (!cr.m.length) delete crews[code]; touch(); crewState(c); for (const pid of cr.m) { const o = connOf(pid); if (o) crewState(o); } return; }
    // Regatta-Bestenliste
    if (m.t === 'i_race') { const ms = Math.floor(num(m.ms)); if (ms < 20000 || ms > 30 * 60e3) return; const i = top.findIndex(e => e.n === me.name); if (i >= 0 && top[i].ms <= ms) { send(c, { t: 'i_top', top }); return; } if (i >= 0) top.splice(i, 1); top.push({ n: me.name, ms, t: Date.now() }); top.sort((a, b) => a.ms - b.ms); top = top.slice(0, 10); touch(); for (const o of P.keys()) send(o, { t: 'i_top', top }); return; }
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
    if (tick % 10 === 0) for (const cr of Object.values(crews)) {
      const on = cr.m.map(pid => [pid, connOf(pid)]).filter(([, c]) => c), list = on.map(([pid, c]) => { const q = P.get(c); return [pid, q.name, Math.round(q.s[0]), Math.round(q.s[1])]; });
      for (const [, c] of on) send(c, { t: 'i_crewpos', m: list });
    }
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
