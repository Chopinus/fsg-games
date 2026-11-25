'use strict';
// Game Hub – Echtzeit-Spiele: Lichtrad und Kugel-Arena (Canvas, Live-Daten über r.cast)
(function () {
  const css = `
  .rt{width:min(100%,980px);margin:0 auto;display:flex;flex-direction:column;gap:10px;align-items:stretch}
  .rt-cv{position:relative;border-radius:18px;overflow:hidden;background:#05060f;box-shadow:0 0 0 1px #2a2f55,0 20px 60px rgba(0,0,0,.5);touch-action:none;user-select:none;-webkit-user-select:none}
  .rt-cv canvas{display:block;width:100%;height:auto}
  .rt-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;text-align:center;color:#fff;gap:8px}
  .rt-ov .big{font:400 clamp(60px,18vw,150px) var(--display);text-shadow:0 0 30px currentColor;animation:rtpop .9s ease-out both}
  @keyframes rtpop{0%{transform:scale(2.4);opacity:0}40%{opacity:1}100%{transform:scale(1);opacity:.95}}
  .rt-ov .msg{font:400 clamp(22px,5vw,38px) var(--display);text-shadow:0 0 18px currentColor;animation:rtpop .6s both}
  .rt-sc{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
  .rt-sc span{padding:4px 12px;border-radius:99px;background:rgba(255,255,255,.06);border:1px solid var(--c);color:var(--c);font-weight:800;font-size:14px;text-shadow:0 0 8px var(--c)}
  .rt-sc span.out{opacity:.4;text-decoration:line-through}
  .rt-pad{display:none;grid-template-columns:repeat(3,66px);grid-template-areas:". u ." "l d r";justify-content:center;gap:8px;margin-top:4px}
  .rt-pad [data-trd="3"]{grid-area:u}.rt-pad [data-trd="2"]{grid-area:l}.rt-pad [data-trd="1"]{grid-area:d}.rt-pad [data-trd="0"]{grid-area:r}
  .rt-pad button{width:66px;height:58px;border-radius:14px;border:1px solid #2a2f55;background:#11142a;color:#9fe9ff;font-size:24px}
  .rt-pad button:active{background:#22e3ff;color:#05060f}
  @media (pointer:coarse){.rt-pad{display:grid}}
  .rt-hud{position:absolute;pointer-events:none;color:#fff;font:700 13px var(--body);text-shadow:0 1px 3px #000}
  .rt-lb{right:10px;top:10px;background:rgba(5,6,15,.6);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:8px 10px;min-width:150px}
  .rt-lb p{margin:2px 0;display:flex;justify-content:space-between;gap:10px} .rt-lb p.me{color:#ffd23f}
  .rt-tm{left:50%;top:10px;transform:translateX(-50%);font:400 22px var(--display);color:#9fe9ff}
  .rt-boost{position:absolute;right:14px;bottom:14px;width:74px;height:74px;border-radius:50%;border:2px solid #ff3fa4;background:rgba(255,63,164,.18);color:#fff;font-weight:900;pointer-events:auto;box-shadow:0 0 20px rgba(255,63,164,.5)}
  .rt-boost:active{background:#ff3fa4}
  .ar-cv{aspect-ratio:16/10}@media (max-width:640px){.ar-cv{aspect-ratio:4/5}.rt-lb{font-size:11px;min-width:110px;padding:6px 8px}.rt-boost{width:64px;height:64px}}
  .rt-lobby{margin-top:14px;padding:14px;border-radius:14px;background:var(--surface);border:1px solid var(--line);display:flex;flex-direction:column;gap:8px;align-items:center}
  `;
  const stl = document.createElement('style'); stl.textContent = css; document.head.appendChild(stl);
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  let raf = null, active = null; // aktuelles Spiel ('lichtrad' | 'arena')
  function loop(fn) { cancelAnimationFrame(raf); const go = t => { if (!room || room.game !== active) { raf = null; return; } fn(t); raf = requestAnimationFrame(go); }; raf = requestAnimationFrame(go); }

  /* ================= Lichtrad ================= */
  const TR = { id: null, trails: [], alive: [], parts: [], cv: null, ctx: null, cell: 10, v: null, lastDir: -1, shake: 0 };
  function trBuild(stage, v) {
    stage.dataset.mode = 'tron';
    stage.innerHTML = `<div class="rt"><div class="rt-sc" data-trsc></div><div class="rt-cv"><canvas></canvas><div class="rt-ov" data-trov></div></div>
      <div class="rt-pad"><button data-trd="2">◀</button><button data-trd="3">▲</button><button data-trd="1">▼</button><button data-trd="0">▶</button></div>
      <p class="note" style="text-align:center">Steuern: Pfeiltasten / WASD oder übers Spielfeld wischen. Nicht in Spuren oder die Wand fahren!</p><div data-tragain></div></div>`;
    TR.cv = stage.querySelector('canvas'); TR.ctx = TR.cv.getContext('2d');
    const box = stage.querySelector('.rt-cv'); let sx = 0, sy = 0;
    box.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    box.addEventListener('pointermove', e => { if (e.buttons !== 1 && e.pointerType === 'mouse') return; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.hypot(dx, dy) < 24) return; trDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3)); sx = e.clientX; sy = e.clientY; });
    trSize();
  }
  function trSize() { if (!TR.cv || !TR.v) return; const w = TR.cv.parentElement.clientWidth, c = w / TR.v.W; TR.cell = c; TR.cv.width = Math.round(w * dpr()); TR.cv.height = Math.round(c * TR.v.H * dpr()); TR.cv.style.height = c * TR.v.H + 'px'; }
  function trDir(d) { if (!room || room.game !== 'lichtrad' || !TR.v || TR.v.me < 0) return; if (d === TR.lastDir) return; TR.lastDir = d; act({ type: 'dir', d }); setTimeout(() => { TR.lastDir = -1; }, 120); }
  function boom(x, y, col, n = 40) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 5; TR.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col }); } }
  function lichtrad(stage, v) {
    active = 'lichtrad';
    const fresh = stage.dataset.mode !== 'tron' || TR.id !== room.id;
    TR.v = v;
    if (fresh) { TR.id = room.id; trBuild(stage, v); }
    if (fresh || v.phase === 'count' || v.t !== TR.t || !TR.trails.length) { TR.trails = v.trails.map(t => t.slice()); TR.alive = v.alive.slice(); TR.t = v.t; }
    trSize();
    const ov = stage.querySelector('[data-trov]'), sc = stage.querySelector('[data-trsc]');
    sc.innerHTML = v.part.map((id, i) => `<span style="--c:${v.cols[i]}" class="${TR.alive[i] ? '' : 'out'}">${esc(v.names[id])}${i === v.me ? ' (du)' : ''} · ${v.score[id] || 0}</span>`).join('');
    const key = v.phase + v.round;
    if (ov.dataset.k !== key) {
      ov.dataset.k = key;
      if (v.phase === 'count') { const myc = v.cols[v.me] || '#fff'; ov.innerHTML = `<div class="msg" style="color:${myc}">Runde ${v.round} / ${v.rounds}</div><div class="big" style="color:${myc}" data-trcd>3</div>${v.me >= 0 ? `<div class="msg" style="color:${myc};font-size:18px">Du bist ${['Türkis', 'Pink', 'Gelb', 'Grün', 'Lila', 'Orange', 'Weiß', 'Rot'][v.me]}</div>` : ''}`; }
      else if (v.phase === 'pause') { const w = v.lastWin, i = v.part.indexOf(w); ov.innerHTML = w ? `<div class="msg" style="color:${v.cols[i]}">${esc(v.names[w])} gewinnt die Runde!</div>` : '<div class="msg" style="color:#fff">Alle gecrasht!</div>'; }
      else if (v.phase === 'end') { const order = v.part.slice().sort((a, b) => (v.score[b] || 0) - (v.score[a] || 0)); const i = v.part.indexOf(order[0]); ov.innerHTML = `<div class="big" style="color:${v.cols[i]};font-size:70px">🏆</div><div class="msg" style="color:${v.cols[i]}">${esc(v.names[order[0]])} siegt!</div>`; if (order[0] === room.me && window.g3confetti) g3confetti(); }
      else ov.innerHTML = '';
    }
    const ag = stage.querySelector('[data-tragain]');
    ag.innerHTML = v.phase === 'end' ? `<div style="text-align:center">${isHost() ? `<button class="btn" data-room="start">Neues Match</button>` : ''}</div>` : '';
    loop(trDraw);
  }
  function trDraw() {
    const v = TR.v, c = TR.ctx; if (!c || !v) return;
    const k = TR.cell * dpr(), W = TR.cv.width, H = TR.cv.height, t = performance.now();
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (TR.shake > 0) { c.translate((Math.random() - 0.5) * TR.shake, (Math.random() - 0.5) * TR.shake); TR.shake *= 0.88; }
    c.fillStyle = '#05060f'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(80,110,255,.10)'; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x <= v.W; x += 2) { c.moveTo(x * k, 0); c.lineTo(x * k, H); } for (let y = 0; y <= v.H; y += 2) { c.moveTo(0, y * k); c.lineTo(W, y * k); } c.stroke();
    c.strokeStyle = 'rgba(120,160,255,.5)'; c.lineWidth = 2 * dpr(); c.strokeRect(1, 1, W - 2, H - 2);
    c.lineCap = 'round'; c.lineJoin = 'round';
    TR.trails.forEach((tr, i) => {
      if (!tr || !tr.length) return; const col = v.cols[i];
      c.shadowColor = col; c.shadowBlur = 14 * dpr(); c.strokeStyle = col; c.globalAlpha = TR.alive[i] ? 1 : 0.35; c.lineWidth = k * 0.55;
      c.beginPath(); c.moveTo((tr[0][0] + 0.5) * k, (tr[0][1] + 0.5) * k); for (let j = 1; j < tr.length; j++) c.lineTo((tr[j][0] + 0.5) * k, (tr[j][1] + 0.5) * k); c.stroke();
      if (TR.alive[i]) { const h = tr[tr.length - 1], pulse = 0.75 + Math.sin(t / 120) * 0.15; c.fillStyle = '#fff'; c.shadowBlur = 24 * dpr(); c.beginPath(); c.arc((h[0] + 0.5) * k, (h[1] + 0.5) * k, k * pulse * (i === v.me ? 0.85 : 0.65), 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    });
    c.shadowBlur = 0;
    TR.parts = TR.parts.filter(p => (p.life -= 0.025) > 0);
    for (const p of TR.parts) { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; c.globalAlpha = p.life; c.fillStyle = p.col; c.fillRect(p.x * dpr(), p.y * dpr(), 3 * dpr(), 3 * dpr()); }
    c.globalAlpha = 1;
    if (v.phase === 'count') { const el = document.querySelector('[data-trcd]'); if (el) { const s = Math.max(1, Math.ceil(((typeof deadline !== 'undefined' && deadline) ? deadline - Date.now() : 0) / 1000)); if (el.textContent !== String(s)) { el.textContent = s; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; } } }
  }
  function trCast(d) {
    if (!TR.v || !room || room.game !== 'lichtrad') return;
    if (TR.v.phase !== 'run') TR.v.phase = 'run';
    const ov = document.querySelector('[data-trov]'); if (ov && ov.dataset.k && ov.dataset.k.startsWith('count')) { ov.innerHTML = '<div class="big" style="color:#3dff8a;font-size:80px">LOS!</div>'; ov.dataset.k = 'run'; setTimeout(() => { if (ov.dataset.k === 'run') ov.innerHTML = ''; }, 700); }
    TR.t = d.t;
    d.h.forEach(([x, y, a], i) => { if (!TR.trails[i]) TR.trails[i] = []; const tr = TR.trails[i], last = tr[tr.length - 1]; if (a && (!last || last[0] !== x || last[1] !== y)) tr.push([x, y]);
      if (!a && TR.alive[i]) { TR.alive[i] = false; const col = TR.v.cols[i]; boom((x + 0.5) * TR.cell, (y + 0.5) * TR.cell, col, i === TR.v.me ? 70 : 40); TR.shake = i === TR.v.me ? 18 : 8; if (i === TR.v.me && navigator.vibrate) navigator.vibrate(120); } });
    const sc = document.querySelector('[data-trsc]'); if (sc) [...sc.children].forEach((el, i) => el.classList.toggle('out', !TR.alive[i]));
  }
  document.addEventListener('keydown', e => {
    if (!room || e.target.closest('input,textarea')) return;
    const m = { ArrowRight: 0, d: 0, D: 0, ArrowDown: 1, s: 1, S: 1, ArrowLeft: 2, a: 2, A: 2, ArrowUp: 3, w: 3, W: 3 }[e.key];
    if (room.game === 'lichtrad' && m != null) { e.preventDefault(); trDir(m); }
    if (room.game === 'arena' && e.key === ' ') { e.preventDefault(); act({ type: 'boost' }); }
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-trd]'); if (b) trDir(Number(b.dataset.trd)); });
  document.addEventListener('pointerdown', e => { const b = e.target.closest('[data-trd]'); if (b) { e.preventDefault(); trDir(Number(b.dataset.trd)); } });
  window.addEventListener('resize', () => { trSize(); arSize(); });

  /* ================= Kugel-Arena ================= */
  const AR = { id: null, v: null, cv: null, ctx: null, prev: null, next: null, tNext: 0, food: [], fx: [], cam: { x: 900, y: 900, z: 1 }, mouse: null, sendT: 0, pops: [] };
  const rad = m => 6 + Math.sqrt(m) * 3.2;
  function arBuild(stage) {
    stage.dataset.mode = 'arena';
    stage.innerHTML = `<div class="rt"><div class="rt-cv ar-cv"><canvas></canvas>
      <div class="rt-hud rt-tm" data-artm></div><div class="rt-hud rt-lb" data-arlb></div><div class="rt-ov" data-arov></div>
      <button class="rt-boost" data-arboost>BOOST</button></div>
      <p class="note" style="text-align:center">Zeige mit Maus oder Finger, wohin deine Kugel rollt. Leertaste oder BOOST = Sprint (kostet etwas Masse). Kugeln, die 15 % kleiner sind, kannst du fressen!</p><div data-aragain></div></div>`;
    AR.cv = stage.querySelector('canvas'); AR.ctx = AR.cv.getContext('2d');
    const box = stage.querySelector('.rt-cv');
    const mv = e => { const r = box.getBoundingClientRect(); AR.mouse = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    box.addEventListener('pointermove', mv); box.addEventListener('pointerdown', e => { if (!e.target.closest('[data-arboost]')) mv(e); });
    arSize();
  }
  function arSize() { if (!AR.cv) return; const w = AR.cv.parentElement.clientWidth, h = AR.cv.parentElement.clientHeight || w * 0.625; AR.cv.width = Math.round(w * dpr()); AR.cv.height = Math.round(h * dpr()); }
  function arena(stage, v) {
    active = 'arena';
    const fresh = stage.dataset.mode !== 'arena' || AR.id !== room.id;
    AR.v = v;
    if (fresh) { AR.id = room.id; arBuild(stage); }
    AR.food = v.food.slice(); const P = v.ents.map(e => [e.x, e.y, e.m, e.a]); AR.prev = P; AR.next = P; AR.tNext = performance.now();
    const ov = stage.querySelector('[data-arov]');
    ov.innerHTML = v.phase === 'end' ? (() => { const r = v.ents.map((e, i) => ({ ...e, i })).sort((a, b) => b.b - a.b); if (r[0] && r[0].i === v.me && window.g3confetti) g3confetti();
      return `<div class="msg" style="color:#ffd23f">🏁 Runde vorbei!</div><div style="background:rgba(5,6,15,.75);border-radius:14px;padding:12px 18px;pointer-events:auto">${r.slice(0, 8).map((e, k) => `<p style="margin:3px 0;color:${e.c}">${k + 1}. ${esc(e.n)} – ${e.b} Masse · ${e.k} 🍽️</p>`).join('')}</div>`; })() : '';
    stage.querySelector('[data-aragain]').innerHTML = v.phase === 'end' && isHost() ? '<div style="text-align:center"><button class="btn" data-room="start">Neue Runde</button></div>' : '';
    loop(arDraw);
  }
  function arCast(d) {
    if (!AR.v || !room || room.game !== 'arena') return;
    if (d.fe) for (let i = 0; i < d.fe.length; i += 3) { const k = d.fe[i]; const ox = AR.food[k * 2], oy = AR.food[k * 2 + 1]; AR.pops.push({ x: ox, y: oy, t: 1 }); AR.food[k * 2] = d.fe[i + 1]; AR.food[k * 2 + 1] = d.fe[i + 2]; }
    if (d.p) { AR.prev = arPos(performance.now()); AR.next = d.p; AR.tNext = performance.now(); if (d.p.length > AR.v.ents.length) { /* neue Kugel: kommt mit dem nächsten Raum-Update */ } }
    if (d.ev) for (const [a, b] of d.ev) { const B = AR.next[b] || AR.prev[b]; if (B) for (let i = 0; i < 26; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 6; AR.fx.push({ x: B[0], y: B[1], vx: Math.cos(an) * s, vy: Math.sin(an) * s, l: 1, c: (AR.v.ents[b] || {}).c || '#fff' }); }
      if (b === AR.v.me && navigator.vibrate) navigator.vibrate([80, 50, 120]); if (a === AR.v.me && navigator.vibrate) navigator.vibrate(40); }
    if (d.left != null) AR.left = d.left;
  }
  function arPos(now) { // weich zwischen zwei Live-Paketen überblenden (100 ms)
    const k = Math.min(1, (now - AR.tNext) / 100), P = AR.prev, N = AR.next; if (!N) return [];
    return N.map((n, i) => { const p = P && P[i]; if (!p || !n[3] || !p[3]) return n; return [p[0] + (n[0] - p[0]) * k, p[1] + (n[1] - p[1]) * k, p[2] + (n[2] - p[2]) * k, n[3]]; });
  }
  function arDraw(t) {
    const v = AR.v, c = AR.ctx; if (!c || !v) return;
    const W = AR.cv.width, H = AR.cv.height, now = performance.now(), pos = arPos(now), mine = pos[v.me];
    if (mine && mine[3]) { const z = Math.max(0.45, Math.min(1.2, 1.15 - Math.sqrt(mine[2]) / 40)) * (W / 1100); AR.cam.x += (mine[0] - AR.cam.x) * 0.15; AR.cam.y += (mine[1] - AR.cam.y) * 0.15; AR.cam.z += (z - AR.cam.z) * 0.05; }
    const z = AR.cam.z, sx = x => (x - AR.cam.x) * z + W / 2, sy = y => (y - AR.cam.y) * z + H / 2;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8); g.addColorStop(0, '#0d1030'); g.addColorStop(1, '#04050c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(90,120,255,.13)'; c.lineWidth = 1; c.beginPath();
    const step = 60; for (let x = Math.floor((AR.cam.x - W / 2 / z) / step) * step; x < AR.cam.x + W / 2 / z; x += step) { if (x < 0 || x > v.WORLD) continue; c.moveTo(sx(x), Math.max(0, sy(0))); c.lineTo(sx(x), Math.min(H, sy(v.WORLD))); }
    for (let y = Math.floor((AR.cam.y - H / 2 / z) / step) * step; y < AR.cam.y + H / 2 / z; y += step) { if (y < 0 || y > v.WORLD) continue; c.moveTo(Math.max(0, sx(0)), sy(y)); c.lineTo(Math.min(W, sx(v.WORLD)), sy(y)); } c.stroke();
    c.strokeStyle = '#ff3fa4'; c.lineWidth = 3; c.shadowColor = '#ff3fa4'; c.shadowBlur = 16; c.strokeRect(sx(0), sy(0), v.WORLD * z, v.WORLD * z); c.shadowBlur = 0;
    const FC = ['#22e3ff', '#ff3fa4', '#ffd23f', '#3dff8a', '#a46bff', '#ff8a3d'];
    for (let i = 0; i < AR.food.length; i += 2) { const x = sx(AR.food[i]), y = sy(AR.food[i + 1]); if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue; const r = (3.2 + Math.sin(t / 300 + i) * 0.8) * z * 1.4; c.fillStyle = FC[(i / 2) % 6]; c.shadowColor = c.fillStyle; c.shadowBlur = 8; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); }
    c.shadowBlur = 0;
    AR.pops = AR.pops.filter(p => (p.t -= 0.08) > 0); for (const p of AR.pops) { c.strokeStyle = `rgba(255,255,255,${p.t})`; c.beginPath(); c.arc(sx(p.x), sy(p.y), (1 - p.t) * 14 * z, 0, 6.283); c.stroke(); }
    const order = pos.map((p, i) => i).filter(i => pos[i] && pos[i][3]).sort((a, b) => pos[a][2] - pos[b][2]);
    for (const i of order) {
      const [x, y, m, st] = pos[i], e = v.ents[i] || { c: '#fff', n: '?' }, R = rad(m) * z, X = sx(x), Y = sy(y);
      if (X < -R - 50 || Y < -R - 50 || X > W + R + 50 || Y > H + R + 50) continue;
      if (st === 2) { for (let k = 1; k <= 4; k++) { c.globalAlpha = 0.12 * (5 - k); c.fillStyle = e.c; c.beginPath(); c.arc(X - (k * 6), Y, R, 0, 6.283); c.fill(); } c.globalAlpha = 1; }
      const wob = 1 + Math.sin(t / 200 + i) * 0.025;
      const gg = c.createRadialGradient(X - R * 0.35, Y - R * 0.35, R * 0.1, X, Y, R * wob); gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.25, e.c); gg.addColorStop(1, shade(e.c));
      c.shadowColor = e.c; c.shadowBlur = 22; c.fillStyle = gg; c.beginPath(); c.arc(X, Y, R * wob, 0, 6.283); c.fill(); c.shadowBlur = 0;
      if (i === v.me) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.stroke(); }
      if (R > 14) { c.fillStyle = '#fff'; c.font = `800 ${Math.max(11, Math.min(26, R * 0.42))}px Figtree, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(e.n, X, Y); c.fillText(e.n, X, Y); }
    }
    AR.fx = AR.fx.filter(p => (p.l -= 0.03) > 0); for (const p of AR.fx) { p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; c.globalAlpha = p.l; c.fillStyle = p.c; c.beginPath(); c.arc(sx(p.x), sy(p.y), 4 * z * 1.5, 0, 6.283); c.fill(); } c.globalAlpha = 1;
    // Minikarte
    const mm = Math.min(W, H) * 0.22, mx = 12, my = H - mm - 12; c.fillStyle = 'rgba(5,6,15,.6)'; c.fillRect(mx, my, mm, mm); c.strokeStyle = 'rgba(255,255,255,.2)'; c.strokeRect(mx, my, mm, mm);
    for (const i of order) { const p = pos[i]; c.fillStyle = i === v.me ? '#fff' : (v.ents[i] || {}).c || '#888'; c.beginPath(); c.arc(mx + (p[0] / v.WORLD) * mm, my + (p[1] / v.WORLD) * mm, Math.max(2, rad(p[2]) / v.WORLD * mm), 0, 6.283); c.fill(); }
    // Eingabe senden (höchstens 10× pro Sekunde)
    if (AR.mouse && mine && mine[3] && now - AR.sendT > 100 && v.phase === 'run') { AR.sendT = now; act({ type: 'to', x: Math.round(AR.cam.x + (AR.mouse[0] * W - W / 2) / z), y: Math.round(AR.cam.y + (AR.mouse[1] * H - H / 2) / z) }); }
    // Anzeigen
    const lb = document.querySelector('[data-arlb]'); if (lb && (!AR.lbT || now - AR.lbT > 400)) { AR.lbT = now; const r = pos.map((p, i) => ({ i, m: p ? p[2] : 0 })).sort((a, b) => b.m - a.m).slice(0, 6); lb.innerHTML = '<b>Rangliste</b>' + r.map((x, k) => `<p class="${x.i === v.me ? 'me' : ''}"><span>${k + 1}. ${esc((v.ents[x.i] || {}).n || '')}</span><span>${Math.round(x.m)}</span></p>`).join('') + (r.some(x => x.i === v.me) || v.me < 0 ? '' : `<p class="me"><span>Du</span><span>${Math.round((pos[v.me] || [0, 0, 0])[2])}</span></p>`); }
    const tm = document.querySelector('[data-artm]'); if (tm) { const l = AR.left != null ? AR.left : v.left; const s = Math.max(0, Math.ceil(l / 1000)); tm.textContent = v.phase === 'end' ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
    const ov = document.querySelector('[data-arov]'); if (ov && v.phase === 'run') { const dead = v.me >= 0 && mine && !mine[3]; if (dead && !ov.dataset.dead) { ov.dataset.dead = 1; ov.innerHTML = '<div class="msg" style="color:#ff4d6d">Gefressen! 😵</div><div style="color:#fff">Gleich geht’s weiter …</div>'; } else if (!dead && ov.dataset.dead) { delete ov.dataset.dead; ov.innerHTML = ''; } }
  }
  function shade(hex) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * 0.45, g = ((n >> 8) & 255) * 0.45, b = (n & 255) * 0.45; return `rgb(${r | 0},${g | 0},${b | 0})`; }
  document.addEventListener('pointerdown', e => { if (e.target.closest('[data-arboost]')) { e.preventDefault(); act({ type: 'boost' }); } });

  /* ================= Anmelden ================= */
  const botsLobby = () => (isHost() ? `<div class="rt-lobby"><b>Mit Bots spielen</b><div class="row" style="justify-content:center;gap:6px">${[1, 2, 3].map(n => `<button class="btn ghost small" data-trbots="${n}">+${n} Bot${n > 1 ? 's' : ''}</button>`).join('')}</div><small class="note">Mit Bots kannst du auch allein starten.</small></div>` : '');
  document.addEventListener('click', e => { const b = e.target.closest('[data-trbots]'); if (b && isHost()) send({ t: 'start', bots: Number(b.dataset.trbots) }); });
  window.LobbyExtra = Object.assign(window.LobbyExtra || {}, { lichtrad: botsLobby, arena: () => '<p class="note" style="margin-top:12px">Du kannst auch allein starten – Bots füllen die Arena auf. Wer später kommt, steigt direkt ein.</p>' });
  const S2 = window.Spiele2 || (window.Spiele2 = { cast() {} });
  const oldCast = S2.cast.bind(S2);
  Object.assign(S2, { lichtrad, arena, cast(d) { if (d && d.g === 'tron') trCast(d); else if (d && d.g === 'arena') arCast(d); else oldCast(d); } });
})();
