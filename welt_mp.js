// Würfelwelt – Mehrspieler. Der Gastgeber öffnet seine Welt, Freunde treten bei.
// Der Server merkt sich Startwert, Modus und alle Blockänderungen und verteilt Positionen gebündelt (5× pro Sekunde),
// damit möglichst wenig Daten fließen. Wesen (Tiere, Monster) rechnet der Gastgeber und schickt sie mit.
'use strict';
const TICK = 200, MAX_EDITS = 400000;
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

function loop(r) {
  clearTimeout(r.timer);
  r.timer = setTimeout(() => {
    const s = r.state; if (!s || !r.players.length) return;
    const ps = {};
    for (const [id, p] of Object.entries(s.pos)) if (p.dirty) { ps[id] = p.v; p.dirty = false; }
    if (Object.keys(ps).length || s.mobsDirty) {
      const d = { g: 'welt', k: 'p', ps };
      if (s.mobsDirty) { d.m = s.mobs; d.t = s.time; s.mobsDirty = false; }
      r.cast(d);
    }
    loop(r);
  }, TICK);
}

module.exports = {
  title: 'Würfelwelt', min: 1, seats: 8,
  init(r, m) {
    const host = r.players[0];
    r.private = false;
    r.name = `Würfelwelt · Welt von ${host.name}`;
    r.state = { seed: Math.floor(num(m && m.seed, 1)) || 1, mode: m && m.mode === 'ueberleben' ? 'ueberleben' : 'kreativ', gen: num(m && m.gen, 2), hostId: host.id, edits: {}, n: 0, pos: {}, mobs: [], time: 0.3, ready: false, ended: false };
    r.status = 'playing';
    loop(r);
  },
  start(r) { r.status = 'playing'; },
  onJoin(r, pid, name) { if (r.state && !r.state.ended) r.cast({ g: 'welt', k: 'chat', n: '', m: `${name} betritt die Welt.` }); },
  onLeave(r, pid, name) {
    const s = r.state; if (!s) return;
    delete s.pos[pid];
    if (pid === s.hostId) { s.ended = true; r.status = 'ended'; r.cast({ g: 'welt', k: 'end' }); }
    else r.cast({ g: 'welt', k: 'gone', id: pid, m: `${name} hat die Welt verlassen.` });
  },
  act(r, pid, a) {
    const s = r.state; if (!s || s.ended) return 'quiet';
    const host = pid === s.hostId;
    switch (a.type) {
      case 'up': { // Gastgeber lädt seine bisherigen Änderungen in Teilen hoch: [chunkKey, index, block]
        if (!host || !Array.isArray(a.e)) return 'quiet';
        for (const t of a.e.slice(0, 2000)) { if (!Array.isArray(t) || s.n >= MAX_EDITS) break; const k = clean(t[0], 16), i = Math.floor(num(t[1], -1)), id = Math.floor(num(t[2], -1)); if (!/^-?\d+,-?\d+$/.test(k) || i < 0 || i > 30000 || id < 0 || id > 255) continue; const E = (s.edits[k] = s.edits[k] || {}); if (!(i in E)) s.n++; E[i] = id; }
        if (a.done) { s.ready = true; return; }
        return 'quiet';
      }
      case 'sync': return { reply: { g: 'welt', k: 'world', seed: s.seed, mode: s.mode, gen: s.gen, edits: s.edits, time: s.time, hostId: s.hostId, pos: Object.fromEntries(Object.entries(s.pos).map(([k, p]) => [k, p.v])) } };
      case 'b': { // ein Block wurde gesetzt oder abgebaut
        const x = Math.floor(num(a.x)), y = Math.floor(num(a.y)), z = Math.floor(num(a.z)), id = Math.floor(num(a.id, -1));
        if (y < 1 || y > 95 || id < 0 || id > 255 || Math.abs(x) > 3e7 || Math.abs(z) > 3e7) return 'quiet';
        const cx = Math.floor(x / 16), cz = Math.floor(z / 16), k = cx + ',' + cz, i = (y * 16 + (z - cz * 16)) * 16 + (x - cx * 16);
        if (s.n < MAX_EDITS || (s.edits[k] && i in s.edits[k])) { const E = (s.edits[k] = s.edits[k] || {}); if (!(i in E)) s.n++; E[i] = id; }
        r.cast({ g: 'welt', k: 'b', x, y, z, id, by: pid });
        return 'quiet';
      }
      case 'p': { // Position: [x, y, z, Blickrichtung, Neigung, Bewegung]
        if (!Array.isArray(a.v)) return 'quiet';
        const v = a.v.slice(0, 7).map(x => Math.round(num(x) * 100) / 100), name = (r.players.find(p => p.id === pid) || {}).name || 'Gast';
        s.pos[pid] = { v: [...v, name], dirty: true };
        if (host && Array.isArray(a.m)) { s.mobs = a.m.slice(0, 40).map(m => (Array.isArray(m) ? m.slice(0, 8).map(x => (typeof x === 'string' ? clean(x, 12) : Math.round(num(x) * 100) / 100)) : null)).filter(Boolean); s.time = num(a.t, s.time); s.mobsDirty = true; }
        return 'quiet';
      }
      case 'hit': { // Gast trifft ein Wesen: an den Gastgeber weiterreichen
        r.cast({ g: 'welt', k: 'hit', to: s.hostId, by: pid, id: Math.floor(num(a.id)), dmg: Math.min(20, num(a.dmg, 1)) });
        return 'quiet';
      }
      case 'hurt': case 'drop': { // Gastgeber: ein Wesen trifft einen Gast / Beute für einen Gast
        if (!host) return 'quiet';
        r.cast({ g: 'welt', k: a.type, to: clean(a.to, 20), n: Math.min(20, num(a.n, 1)), it: Array.isArray(a.it) ? a.it.slice(0, 4).map(x => clean(x, 12)) : null, kx: num(a.kx), kz: num(a.kz) });
        return 'quiet';
      }
      case 'chat': { const m = clean(a.m, 120); if (!m) return 'quiet'; r.cast({ g: 'welt', k: 'chat', n: (r.players.find(p => p.id === pid) || {}).name || 'Gast', m }); return 'quiet'; }
    }
    return 'quiet';
  },
  view(r) {
    const s = r.state; if (!s) return null;
    return { seed: s.seed, mode: s.mode, hostId: s.hostId, ready: s.ready, ended: s.ended, n: r.players.length };
  },
};
