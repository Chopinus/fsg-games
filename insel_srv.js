// Inselreich – gemeinsame Welt für alle (Prototyp).
// Die Landschaft entsteht in jedem Gerät aus demselben Startwert, der Server kennt nur die Spieler.
// Jeder bekommt 5× pro Sekunde nur die Spieler in seiner Nähe (spart Datenvolumen).
'use strict';
const TICK = 200, NEAR = 48, CHAT_NEAR = 1e9;
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

module.exports = function (send) {
  const P = new Map(); // Verbindung -> Spieler
  let tick = 0;
  function state(s) {
    // [x, y, Richtung, Bewegung, im Boot, Boot x, Boot y, Kurs, Segel, Angriff]
    if (!Array.isArray(s)) return null;
    const v = s.slice(0, 10).map(x => Math.round(num(x) * 100) / 100);
    if (Math.abs(v[0]) > 1e6 || Math.abs(v[1]) > 1e6) return null;
    return v;
  }
  function handle(c, m) {
    if (m.t === 'i_join') {
      const s = state(m.s); if (!s) return;
      P.set(c, { id: c.pid, name: clean(m.name, 16) || 'Gast', col: Math.floor(num(m.col)) % 8, s, dirty: true, last: Date.now() });
      send(c, { t: 'i_hi', id: c.pid, n: P.size });
      return;
    }
    const me = P.get(c); if (!me) return;
    if (m.t === 'i_s') { const s = state(m.s); if (s) { me.s = s; me.dirty = true; me.last = Date.now(); } return; }
    if (m.t === 'i_chat') {
      const text = clean(m.m, 120); if (!text) return;
      for (const [o, q] of P) if (Math.hypot(q.s[0] - me.s[0], q.s[1] - me.s[1]) < CHAT_NEAR) send(o, { t: 'i_chat', n: me.name, m: text });
      return;
    }
    if (m.t === 'i_leave') { P.delete(c); return; }
  }
  function drop(c) { P.delete(c); }
  setInterval(() => {
    tick++;
    const all = [...P.entries()];
    for (const [c, me] of all) {
      if (Date.now() - me.last > 5 * 60e3) { P.delete(c); continue; }
      const near = [];
      for (const [o, q] of all) { if (o === c) continue; const bx = q.s[4] ? q.s[0] : q.s[5], by = q.s[4] ? q.s[1] : q.s[6]; if (Math.hypot(q.s[0] - me.s[0], q.s[1] - me.s[1]) < NEAR || Math.hypot(bx - me.s[0], by - me.s[1]) < NEAR) near.push([q.id, q.name, q.col, ...q.s]); }
      const key = JSON.stringify(near);
      if (key !== me.sent || tick % 10 === 0) { me.sent = key; send(c, { t: 'i_w', p: near, n: P.size }); }
    }
  }, TICK);
  return { handle, drop };
};
