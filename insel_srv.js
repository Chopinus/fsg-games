// Inselreich – gemeinsame Welt für alle (Prototyp).
// Die Landschaft entsteht in jedem Gerät aus demselben Startwert, der Server kennt nur die Spieler und die Bauplätze.
// Jeder bekommt 5× pro Sekunde nur die Spieler in seiner Nähe (spart Datenvolumen).
// Bauplätze (eigene Basen) werden dauerhaft gespeichert: im privaten GitHub-Projekt (GITHUB_TOKEN, SAVE_REPO) wie die Ritterlauf-Spielstände,
// sonst in einer lokalen Datei.
'use strict';
const fs = require('fs');
const path = require('path');
const TICK = 200, NEAR = 48, CHAT_NEAR = 1e9;
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const KEY = /^[a-z_]{2,20}$/;

const TOKEN = process.env.GITHUB_TOKEN || '', REPO = process.env.SAVE_REPO || '';
const FILE = 'inselreich-basen.json', LOCAL = path.join(__dirname, 'inselreich-basen.local.json');
const durable = !!(TOKEN && REPO);
const gh = (method, body) => fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
  method, headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'fsg-spiele', 'X-GitHub-Api-Version': '2022-11-28' }, body: body ? JSON.stringify(body) : undefined,
});

module.exports = function (send, konten) {
  const P = new Map(); // Verbindung -> Spieler
  let tick = 0;
  // ---------- Bauten: frei auf der Heimatinsel, Werkbänke überall, Absteckpfähle schützen ein Gebiet ----------
  // w: { "x,y": [Boden, Gegenstand, Besitzer-id, Name] } in Weltfeldern, g: Felder { "x,y": [Samen, gepflanzt] }, a: Ställe { "x,y": zuletzt geerntet }
  // st: Truhen-Inhalt je Spieler, ap: Konto -> Spieler-id (Bauten ziehen mit aufs neue Gerät), seen: Spieler-id -> zuletzt da
  // gespeichert wird { v: 3, w, g, a, st, ap, seen, crews, top } – ältere Dateien (v < 3) werden nicht übernommen (Neustart 04.11.2026)
  let W = {}, G = {}, A = {}, ST = {}, AP = {}, SEEN = {}, crews = {}, top = [], sha = null, dirty = false, timer = null, loaded = false;
  const CR = 6, CMAX = 3, PER = 900, TOTAL = 40000;
  const PROTECT = new Set(['werkbank', 'amboss', 'kochtopf', 'werftbank', 'tischlerbank', 'pfahl', 'truhe', 'bett']);
  const unpack = j => {
    if (!j || typeof j !== 'object') return;
    crews = j.crews || {}; top = j.top || [];
    if (j.v === 3) { W = j.w || {}; G = j.g || {}; A = j.a || {}; ST = j.st || {}; AP = j.ap || {}; SEEN = j.seen || {}; }
  };
  (async () => {
    try {
      if (durable) {
        const r = await gh('GET');
        if (r.status === 200) {
          const j = await r.json(); sha = j.sha; let text = j.content ? Buffer.from(j.content, 'base64').toString('utf8') : '';
          if (!text && j.size > 0) { const raw = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.raw', 'User-Agent': 'fsg-spiele', 'X-GitHub-Api-Version': '2022-11-28' } }); if (raw.ok) text = await raw.text(); }
          unpack(JSON.parse(text || '{}'));
        }
      } else if (fs.existsSync(LOCAL)) unpack(JSON.parse(fs.readFileSync(LOCAL, 'utf8')));
    } catch (e) { console.error('Inselreich-Bauten laden:', e); }
    // Bauten von Spielern, die 60 Tage nicht da waren, verschwinden wieder
    const old = Date.now() - 60 * 864e5;
    for (const [k, v] of Object.entries(W)) if (SEEN[v[2]] && SEEN[v[2]] < old) { delete W[k]; delete G[k]; delete A[k]; }
    loaded = true;
    console.log(`Inselreich: ${Object.keys(W).length} gebaute Felder geladen (${durable ? 'GitHub' : 'lokal'})`);
  })();
  async function flush() {
    if (!dirty) return; dirty = false;
    const text = JSON.stringify({ v: 3, w: W, g: G, a: A, st: ST, ap: AP, seen: SEEN, crews, top });
    try {
      if (durable) {
        for (let i = 0; i < 2; i++) {
          const r = await gh('PUT', { message: 'Inselreich-Bauten', content: Buffer.from(text).toString('base64'), ...(sha ? { sha } : {}) });
          if (r.ok) { sha = (await r.json()).content.sha; return; }
          if (r.status === 409 || r.status === 422) { const g = await gh('GET'); if (g.ok) sha = (await g.json()).sha; continue; }
          console.error('Inselreich-Bauten speichern:', r.status); break;
        }
        dirty = true;
      } else fs.writeFileSync(LOCAL, text);
    } catch (e) { dirty = true; console.error('Inselreich-Bauten speichern:', e); }
  }
  function touch() { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 20000); }
  let CL = null;
  const claimsL = () => CL || (CL = Object.entries(W).filter(([, v]) => v[1] === 'pfahl').map(([k, v]) => { const [x, y] = k.split(',').map(Number); return { x, y, o: v[2] }; }));
  const mates = (a, b) => { if (a === b) return true; const cc = Object.values(crews).find(cr => cr.m.includes(a)); return !!cc && cc.m.includes(b); };
  const claimBlock = (pid, x, y) => claimsL().find(q => !mates(q.o, pid) && Math.abs(x - q.x) <= CR && Math.abs(y - q.y) <= CR);
  const bcast = msg => { for (const c of P.keys()) send(c, msg); };
  function bset(k, v) { if (v) W[k] = v; else { delete W[k]; delete G[k]; delete A[k]; } CL = null; touch(); bcast({ t: 'i_b', k, v: W[k] || null, g: G[k] || null, a: A[k] || null }); }
  const tileXY = m => { const x = Math.floor(num(m.x, NaN)), y = Math.floor(num(m.y, NaN)); return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) < 1e5 && Math.abs(y) < 1e5 ? [x, y, x + ',' + y] : null; };
  const worldMsg = c => ({ t: 'i_world', w: W, g: G, a: A, s: ST[c.pid] || {}, ready: loaded });
  const onExit = () => { if (dirty) flush().finally(() => process.exit(0)); else process.exit(0); };
  process.once('SIGTERM', onExit); process.once('SIGINT', onExit);
  const connOf = pid => { for (const [c, q] of P) if (q.id === pid) return c; return null; };
  const near = (me, r) => [...P.entries()].filter(([, q]) => q !== me && Math.hypot(q.s[0] - me.s[0], q.s[1] - me.s[1]) < r).map(([c]) => c);
  const crewOf = pid => Object.entries(crews).find(([, cr]) => cr.m.includes(pid));
  function crewState(c) { const cc = crewOf(c.pid); send(c, { t: 'i_crew', code: cc ? cc[0] : null, n: cc ? cc[1].n : null, names: cc ? cc[1].m.map(pid => cc[1].names[pid] || '?') : [] }); }

  // Aussehen: Hut, Titel, Haustier, Bootsfarbe
  const meta = m => (m && typeof m === 'object' ? { hat: clean(m.hat, 12), title: clean(m.title, 20), pet: clean(m.pet, 12), bc: clean(m.bc, 10), bs: clean(m.bs, 10), ab: clean(m.ab, 12) } : null);
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
      // Angemeldet (gleiches Konto wie im Ritterlauf)? Dann gehören die Bauten dem Konto und ziehen mit aufs neue Gerät um.
      c.acc = null; SEEN[c.pid] = Date.now(); touch();
      let moved = false;
      if (konten && konten.tokenKey && m.acc && typeof m.acc === 'object') {
        const k = konten.tokenKey(clean(m.acc.n, 20), String(m.acc.tk || '').slice(0, 64));
        if (k) {
          c.acc = k; const old = AP[k];
          if (old && old !== c.pid) {
            for (const v of Object.values(W)) if (v[2] === old) v[2] = c.pid;
            if (ST[old]) { const t = ST[c.pid] || {}; for (const [r, n] of Object.entries(ST[old])) t[r] = (t[r] || 0) + n; ST[c.pid] = t; delete ST[old]; }
            for (const cr of Object.values(crews)) { const i = cr.m.indexOf(old); if (i >= 0 && !cr.m.includes(c.pid)) { cr.m[i] = c.pid; cr.names[c.pid] = cr.names[old]; } if (i >= 0) delete cr.names[old]; cr.m = cr.m.filter(x => x !== old); }
            CL = null; moved = true;
          }
          AP[k] = c.pid; touch();
          const me0 = P.get(c); if (me0) me0.adm = !!(konten.isAdmin && konten.isAdmin(k)); // Admin-Schild über dem Kopf
        }
      }
      send(c, { t: 'i_hi', id: c.pid, n: P.size });
      if (moved) { for (const o of P.keys()) if (o !== c) send(o, worldMsg(o)); }
      send(c, worldMsg(c));
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
    if (m.t === 'i_fx') { if (!Array.isArray(m.e) || m.e.length > 30) return; const msg = { t: 'i_fx', from: c.pid, z: clean(m.z, 40), e: m.e.map(e => (Array.isArray(e) ? e.slice(0, 12).map(v => (typeof v === 'string' ? clean(v, 16) : Math.round(num(v) * 100) / 100)) : null)).filter(Boolean) }; for (const o of near(me, NEAR)) send(o, msg); return; }
    if (m.t === 'i_cast') { const msg = { t: 'i_cast', from: c.pid, a: clean(m.a, 16), x: num(m.x), y: num(m.y), ax: num(m.ax), ay: num(m.ay), c: Math.floor(num(m.c, -1)) }; if (m.tx !== undefined) { msg.tx = num(m.tx); msg.ty = num(m.ty); } if (Array.isArray(m.b)) msg.b = m.b.slice(0, 6).map(q => (Array.isArray(q) ? q.slice(0, 4).map(v => num(v)) : [0, 0, 0, 0])); for (const o of near(me, NEAR)) send(o, msg); return; }
    if (m.t === 'i_hit' || m.t === 'i_kill') { const o = connOf(clean(m.to, 20)); if (o) send(o, { t: m.t, from: c.pid, id: Math.floor(num(m.id)), dmg: Math.min(60, num(m.dmg, 1)), nx: num(m.nx), ny: num(m.ny), k: clean(m.k, 16), x: num(m.x), y: num(m.y), fz: Math.min(5, Math.max(0, num(m.fz))) }); return; }
    if (m.t === 'i_gift') { const o = connOf(clean(m.to, 20)), n = Math.max(1, Math.min(99, Math.floor(num(m.n, 1)))), k = String(m.k); if (o && KEY.test(k) && Math.hypot(P.get(o).s[0] - me.s[0], P.get(o).s[1] - me.s[1]) < 8) send(o, { t: 'i_gift', from: me.name, k, n }); return; }
    // Crews: Freunde-Gruppen mit Code, sehen sich auf der Karte überall
    if (m.t === 'i_crew_new') { const old = crewOf(c.pid); if (old) return; let code; do { code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join(''); } while (crews[code]); crews[code] = { n: clean(m.n, 20) || me.name + 's Crew', m: [c.pid], names: { [c.pid]: me.name } }; touch(); crewState(c); return; }
    if (m.t === 'i_crew_join') { const code = clean(m.code, 4).toUpperCase(), cr = crews[code]; if (!cr || crewOf(c.pid) || cr.m.length >= 8) { send(c, { t: 'i_crew', err: cr ? 'Diese Crew ist voll.' : 'Diesen Crew-Code gibt es nicht.' }); return; } cr.m.push(c.pid); cr.names[c.pid] = me.name; touch(); for (const pid of cr.m) { const o = connOf(pid); if (o) crewState(o); } return; }
    if (m.t === 'i_crew_leave') { const cc = crewOf(c.pid); if (!cc) return; const [code, cr] = cc; cr.m = cr.m.filter(x => x !== c.pid); delete cr.names[c.pid]; if (!cr.m.length) delete crews[code]; touch(); crewState(c); for (const pid of cr.m) { const o = connOf(pid); if (o) crewState(o); } return; }
    // Regatta-Bestenliste
    if (m.t === 'i_race') { const ms = Math.floor(num(m.ms)); if (ms < 20000 || ms > 30 * 60e3) return; const i = top.findIndex(e => e.n === me.name); if (i >= 0 && top[i].ms <= ms) { send(c, { t: 'i_top', top }); return; } if (i >= 0) top.splice(i, 1); top.push({ n: me.name, ms, t: Date.now() }); top.sort((a, b) => a.ms - b.ms); top = top.slice(0, 10); touch(); for (const o of P.keys()) send(o, { t: 'i_top', top }); return; }
    // ---------- Bauten ----------
    if (!loaded) { if (m.t === 'i_put') send(c, { t: 'i_no', m: 'Der Server lädt die Bauten noch – versuch es gleich noch mal', put: String(m.k) }); return; }
    const T = tileXY(m);
    if (m.t === 'i_chest') { // n > 0 einlagern, n < 0 herausnehmen – jeder hat seinen eigenen Truhen-Inhalt
      const r = String(m.k), n = Math.floor(num(m.n)); if (!KEY.test(r) || !n || Math.abs(n) > 9999) return;
      const box = ST[c.pid] = ST[c.pid] || {}, have = box[r] || 0; if (n < 0 && have < -n) return;
      box[r] = have + n; if (!box[r]) delete box[r]; touch(); send(c, { t: 'i_stash', s: box }); return;
    }
    if (!T) return;
    const [x, y, key] = T, cur = W[key];
    if (m.t === 'i_put') { // Bauteil setzen: Ebene 0 Boden, 1 Gegenstand
      const k = String(m.k), L = m.l ? 1 : 0; if (!KEY.test(k)) return;
      const no = msg => send(c, { t: 'i_no', m: msg, put: k, k: key, v: cur || null });
      if (cur && cur[L]) return no('Hier steht schon etwas');
      if (claimBlock(c.pid, x, y)) return no('Dieses Gebiet hat jemand anderes abgesteckt');
      if (k === 'pfahl') {
        if (claimsL().filter(q => q.o === c.pid).length >= CMAX) return no(`Du hast schon ${CMAX} Absteckpfähle`);
        if (claimsL().some(q => !mates(q.o, c.pid) && Math.abs(q.x - x) <= 2 * CR && Math.abs(q.y - y) <= 2 * CR)) return no('Zu nah an einem fremden Gebiet');
      }
      if (!cur) { const all = Object.values(W); if (all.length >= TOTAL) return no('Die Welt ist voll gebaut – reiß erst etwas ab'); if (all.filter(v => v[2] === c.pid).length >= PER) return no(`Du hast schon ${PER} Felder bebaut – reiß erst etwas ab`); }
      const v = cur ? cur.slice() : [null, null, c.pid, me.name]; v[L] = k; v[2] = c.pid; v[3] = me.name;
      if (L === 1 && (k === 'huehner' || k === 'schafe')) A[key] = Date.now();
      bset(key, v); return;
    }
    if (m.t === 'i_del') {
      if (!cur) return; const L = m.l ? 1 : 0, k = cur[L]; if (!k) return;
      if (cur[2] !== c.pid && !mates(cur[2], c.pid) && (claimBlock(c.pid, x, y) || PROTECT.has(k))) { send(c, { t: 'i_no', m: 'Das gehört ' + cur[3], k: key, v: cur, del: k }); return; }
      const v = cur.slice(); v[L] = null; if (L === 1) { delete G[key]; delete A[key]; }
      bset(key, v[0] || v[1] ? v : null); return;
    }
    if (!cur || cur[1] !== (m.t === 'i_plant' || m.t === 'i_crop' ? 'feld' : cur[1]) || !mates(cur[2], c.pid)) return;
    if (m.t === 'i_plant') { if (!KEY.test(String(m.k))) return; G[key] = [String(m.k), Date.now()]; bset(key, cur); return; }
    if (m.t === 'i_crop') { delete G[key]; bset(key, cur); return; }
    if (m.t === 'i_collect') { A[key] = Date.now(); bset(key, cur); return; }
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
      for (const [o, q] of all) { if (o === c) continue; const bx = q.s[4] ? q.s[0] : q.s[5], by = q.s[4] ? q.s[1] : q.s[6]; if (Math.hypot(q.s[0] - me.s[0], q.s[1] - me.s[1]) < NEAR || Math.hypot(bx - me.s[0], by - me.s[1]) < NEAR) near.push([q.id, q.name, q.col, ...q.s, q.meta || 0, q.adm ? 1 : 0]); }
      const key = JSON.stringify(near);
      if (key !== me.sent || tick % 10 === 0) { me.sent = key; send(c, { t: 'i_w', p: near, n: P.size }); }
    }
  }, TICK);
  return { handle, drop, flush };
};
