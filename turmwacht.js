// Turmwacht – Tower Defense im Hub. Läuft komplett im Browser; die beste Welle geht an die Rangliste (td_submit).
(() => {
  const q = s => document.querySelector(s);
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const konto = () => { try { const k = JSON.parse(localStorage.getItem('fsg.konto') || 'null'); return k && k.name && k.token ? k : null; } catch { return null; } };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  async function call(a, body) { const k = konto(); try { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(k ? { name: k.name, token: k.token } : {}), ...(body || {}) }) }); return await r.json(); } catch { return { error: 'Keine Verbindung zum Server.' }; } }
  const css = `
  #turmwacht{max-width:1100px;margin:0 auto;padding:max(12px,env(safe-area-inset-top)) 12px 30px;display:flex;flex-direction:column;gap:10px}
  .tw-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tw-top h2{flex:1;margin:0}
  .tw-hud{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .tw-hud span{background:var(--surface);border:1px solid var(--line);border-radius:99px;padding:6px 12px;font-weight:800}
  .tw-cv{position:relative;border-radius:16px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.45);touch-action:manipulation}
  .tw-cv canvas{display:block;width:100%;height:auto}
  .tw-shop{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .tw-shop button{border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:14px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;font:700 13px var(--body);cursor:pointer;transition:transform .12s}
  .tw-shop button .i{font-size:26px} .tw-shop button.on{border-color:var(--accent);background:#3a2f1a;transform:translateY(-2px)} .tw-shop button:disabled{opacity:.45}
  .tw-shop small{color:var(--muted);font-weight:600;font-size:11px;text-align:center}
  .tw-sel{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px}
  .tw-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(10,8,20,.7);backdrop-filter:blur(3px);color:#fff;text-align:center;padding:20px;animation:twin .4s both}
  @keyframes twin{from{opacity:0}to{opacity:1}}
  .tw-ov h2{font-size:clamp(26px,6vw,44px);margin:0}
  .tw-wave{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font:400 clamp(30px,8vw,64px) var(--display);color:#ffd23f;text-shadow:0 0 20px rgba(255,180,0,.7),0 4px 0 #6a3d00;pointer-events:none;animation:twwave 1.6s ease-out forwards}
  @keyframes twwave{0%{opacity:0;transform:translate(-50%,-50%) scale(2)}20%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%)}}
  .tw-top10 p{margin:2px 0;display:flex;justify-content:space-between;gap:16px}
  `;
  const COLS = 18, ROWS = 11;
  const MAPS = [ // Wegpunkte (Zellen), der Weg verläuft gerade zwischen ihnen
    [[-1, 2], [4, 2], [4, 8], [9, 8], [9, 2], [14, 2], [14, 8], [18, 8]],
    [[-1, 5], [3, 5], [3, 1], [8, 1], [8, 9], [12, 9], [12, 3], [15, 3], [15, 7], [18, 7]],
    [[2, -1], [2, 4], [7, 4], [7, 1], [11, 1], [11, 6], [5, 6], [5, 9], [15, 9], [15, 4], [18, 4]],
  ];
  const TW = {
    bogen: { n: 'Bogenturm', i: '🏹', c: 50, r: 2.6, rate: 0.45, dmg: 9, col: '#c9a26b', d: 'Schnell, ein Ziel' },
    kanone: { n: 'Kanone', i: '💣', c: 90, r: 2.3, rate: 1.4, dmg: 26, splash: 1.1, col: '#7a7f8c', d: 'Flächenschaden' },
    frost: { n: 'Frostturm', i: '❄️', c: 75, r: 2.2, rate: 0.9, dmg: 4, slow: 0.5, col: '#7fd4ff', d: 'Verlangsamt' },
    blitz: { n: 'Blitzturm', i: '⚡', c: 140, r: 2.8, rate: 1.1, dmg: 18, chain: 3, col: '#c18bff', d: 'Springt über' },
  };
  const EN = {
    schleim: { hp: 30, sp: 1.0, gold: 6, col: '#5fd35f', r: 0.28 },
    flitzer: { hp: 18, sp: 1.9, gold: 6, col: '#ffd23f', r: 0.22 },
    panzer: { hp: 90, sp: 0.62, gold: 14, col: '#9aa0ad', r: 0.34, armor: 4 },
    geist: { hp: 40, sp: 1.25, gold: 9, col: '#e8e8ff', r: 0.27, ghost: 1 },
    boss: { hp: 650, sp: 0.5, gold: 120, col: '#ff4d6d', r: 0.48, armor: 6 },
  };
  let page = null, cv, ctx, G = null, raf = null, sel = 'bogen', pick = null, cell = 40, last = 0;
  function newGame() {
    const m = MAPS[Math.floor(Math.random() * MAPS.length)], path = [];
    for (let i = 0; i < m.length - 1; i++) { const [x1, y1] = m[i], [x2, y2] = m[i + 1]; const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)); for (let k = 0; k < n; k++) path.push([x1 + Math.sign(x2 - x1) * k, y1 + Math.sign(y2 - y1) * k]); }
    path.push(m[m.length - 1]);
    const onPath = new Set(path.map(([x, y]) => x + ',' + y));
    const deco = []; for (let i = 0; i < 26; i++) { const x = (Math.random() * COLS) | 0, y = (Math.random() * ROWS) | 0; if (!onPath.has(x + ',' + y)) deco.push([x, y, Math.random() < 0.6 ? 'tree' : 'rock']); }
    G = { path, onPath, deco, towers: [], en: [], shots: [], fx: [], txt: [], gold: 160, lives: 20, wave: 0, spawn: [], spawnT: 0, speed: 1, over: false, run: false, score: 0, kills: 0, bannerT: 0 };
  }
  const pathLen = () => G.path.length - 1;
  function posAt(d) { const i = Math.min(G.path.length - 2, Math.max(0, Math.floor(d))), f = Math.min(1, d - i), a = G.path[i], b = G.path[i + 1]; return [a[0] + (b[0] - a[0]) * f + 0.5, a[1] + (b[1] - a[1]) * f + 0.5]; }
  function startWave() {
    if (G.run || G.over) return;
    G.wave++; G.run = true; const w = G.wave, list = [];
    const n = 8 + Math.floor(w * 1.6);
    for (let i = 0; i < n; i++) { let t = 'schleim'; if (w >= 3 && i % 4 === 1) t = 'flitzer'; if (w >= 5 && i % 5 === 2) t = 'panzer'; if (w >= 7 && i % 6 === 3) t = 'geist'; list.push(t); }
    if (w % 10 === 0) list.push('boss'); if (w % 5 === 0 && w % 10) list.push('panzer', 'panzer');
    G.spawn = list; G.spawnT = 0; G.bannerT = 1;
    const b = page.querySelector('.tw-cv'); const el = document.createElement('div'); el.className = 'tw-wave'; el.textContent = w % 10 === 0 ? `Welle ${w} – BOSS!` : `Welle ${w}`; b.appendChild(el); setTimeout(() => el.remove(), 1700);
    hud();
  }
  function spawnOne(t) { const E = EN[t], k = 1 + (G.wave - 1) * 0.18 + Math.pow(Math.max(0, G.wave - 10), 1.35) * 0.05; G.en.push({ t, d: 0, hp: E.hp * k, max: E.hp * k, sp: E.sp, slowT: 0, col: E.col, r: E.r, armor: (E.armor || 0) * (1 + G.wave / 25), gold: Math.round(E.gold * (1 + G.wave / 30)), ghost: E.ghost, wob: Math.random() * 6 }); }
  function dmgTo(e, d, kind) {
    const real = Math.max(1, d - (kind === 'blitz' ? 0 : e.armor)); e.hp -= real;
    G.txt.push({ x: posAt(e.d)[0], y: posAt(e.d)[1] - 0.4, t: 1, s: Math.round(real), c: kind === 'frost' ? '#9fe3ff' : '#fff' });
    if (e.hp <= 0 && !e.dead) { e.dead = true; G.gold += e.gold; G.score += e.gold * 10; G.kills++; const [x, y] = posAt(e.d); for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, s = 0.02 + Math.random() * 0.06; G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1, c: e.col }); } G.txt.push({ x, y: y - 0.8, t: 1.3, s: '+' + e.gold, c: '#ffd23f', gold: 1 }); }
  }
  function step(dt) {
    if (G.over) return;
    if (G.run && G.spawn.length) { G.spawnT -= dt; if (G.spawnT <= 0) { spawnOne(G.spawn.shift()); G.spawnT = Math.max(0.35, 0.95 - G.wave * 0.02); } }
    for (const e of G.en) { const s = e.slowT > 0 ? e.sp * 0.5 : e.sp; e.slowT -= dt; e.d += s * dt * 1.6; if (e.d >= pathLen()) { e.dead = true; e.leak = true; G.lives -= e.t === 'boss' ? 5 : 1; shake = 10; if (navigator.vibrate) navigator.vibrate(60); } }
    for (const t of G.towers) {
      const T = TW[t.k]; t.cd -= dt; const rng = T.r * (1 + t.lv * 0.12);
      let target = null, best = -1; for (const e of G.en) { if (e.dead) continue; const [x, y] = posAt(e.d); const dd = Math.hypot(x - t.x - 0.5, y - t.y - 0.5); if (dd <= rng && e.d > best) { best = e.d; target = e; } }
      if (target) { const [x, y] = posAt(target.d); t.ang = Math.atan2(y - t.y - 0.5, x - t.x - 0.5); }
      if (target && t.cd <= 0) {
        t.cd = T.rate / (1 + t.lv * 0.18); t.kick = 1; const dmg = T.dmg * (1 + t.lv * 0.6);
        if (t.k === 'blitz') { let cur = target, hit = new Set(), pts = [[t.x + 0.5, t.y + 0.5]]; for (let c = 0; c < T.chain + t.lv && cur; c++) { hit.add(cur); pts.push(posAt(cur.d)); dmgTo(cur, dmg * (1 - c * 0.15), 'blitz'); const [cx, cy] = posAt(cur.d); let nx = null, nd = 1.8; for (const e of G.en) { if (e.dead || hit.has(e)) continue; const [ex, ey] = posAt(e.d); const dd = Math.hypot(ex - cx, ey - cy); if (dd < nd) { nd = dd; nx = e; } } cur = nx; } G.fx.push({ bolt: pts, l: 1 }); }
        else G.shots.push({ x: t.x + 0.5, y: t.y + 0.5, tg: target, k: t.k, dmg, sp: t.k === 'kanone' ? 6 : 11, lv: t.lv, tr: [] });
      }
      t.kick = Math.max(0, (t.kick || 0) - dt * 5);
    }
    for (const s of G.shots) {
      const [tx, ty] = s.tg.dead ? [s.lx, s.ly] : posAt(s.tg.d); s.lx = tx; s.ly = ty;
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy), mv = s.sp * dt;
      s.tr.push([s.x, s.y]); if (s.tr.length > 6) s.tr.shift();
      if (d <= mv) { s.done = true;
        if (s.k === 'kanone') { const R = TW.kanone.splash * (1 + s.lv * 0.15); for (const e of G.en) { if (e.dead) continue; const [ex, ey] = posAt(e.d); if (Math.hypot(ex - tx, ey - ty) <= R) dmgTo(e, s.dmg, 'kanone'); } G.fx.push({ ring: [tx, ty], R, l: 1 }); for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28; G.fx.push({ x: tx, y: ty, vx: Math.cos(a) * 0.05, vy: Math.sin(a) * 0.05, l: 0.8, c: '#ffb347' }); } shake = Math.max(shake, 3); }
        else if (!s.tg.dead) { dmgTo(s.tg, s.dmg, s.k); if (s.k === 'frost') s.tg.slowT = 1.6 + s.lv * 0.4; }
      } else { s.x += (dx / d) * mv; s.y += (dy / d) * mv; }
    }
    G.shots = G.shots.filter(s => !s.done); G.en = G.en.filter(e => !e.dead);
    if (G.run && !G.spawn.length && !G.en.length) { G.run = false; const bonus = 20 + G.wave * 4; G.gold += bonus; G.score += G.wave * 100; G.txt.push({ x: COLS / 2, y: ROWS / 2, t: 2, s: `Welle geschafft! +${bonus} 🪙`, c: '#3dff8a', big: 1 }); if (auto) setTimeout(() => { if (G && !G.run && !G.over && auto) startWave(); }, 1200); hud(); }
    if (G.lives <= 0 && !G.over) { G.lives = 0; G.over = true; gameOver(); }
  }
  let shake = 0, auto = false;
  function draw(t) {
    const W = cv.width, H = cv.height, k = cell * DPR;
    ctx.setTransform(1, 0, 0, 1, 0, 0); if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.85; }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? '#3f8f3a' : '#459a3f'; ctx.fillRect(x * k, y * k, k + 1, k + 1); }
    // Weg
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pth = () => { ctx.beginPath(); G.path.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, (x + 0.5) * k, (y + 0.5) * k)); };
    pth(); ctx.strokeStyle = '#7a5a33'; ctx.lineWidth = k * 0.92; ctx.stroke(); pth(); ctx.strokeStyle = '#c99a5c'; ctx.lineWidth = k * 0.78; ctx.stroke();
    pth(); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([k * 0.15, k * 0.35]); ctx.lineDashOffset = -t / 40; ctx.lineWidth = k * 0.08; ctx.stroke(); ctx.setLineDash([]);
    const end = G.path[G.path.length - 2]; ctx.font = `${k * 0.8}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏰', (end[0] + 0.5) * k, (end[1] + 0.5) * k);
    for (const [x, y, d] of G.deco) { if (G.towers.some(tw => tw.x === x && tw.y === y)) continue; ctx.font = `${k * 0.62}px serif`; ctx.fillText(d === 'tree' ? '🌳' : '🪨', (x + 0.5) * k, (y + 0.55) * k); }
    // Platzierungs-Vorschau
    if (hover && !G.over) { const [hx, hy] = hover; const free = canBuild(hx, hy); const T = TW[sel]; ctx.fillStyle = free ? 'rgba(255,255,255,.18)' : 'rgba(255,60,60,.25)'; ctx.fillRect(hx * k, hy * k, k, k); if (free && !pick) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc((hx + 0.5) * k, (hy + 0.5) * k, T.r * k, 0, 6.283); ctx.stroke(); } }
    // Türme
    for (const tw of G.towers) {
      const T = TW[tw.k], cx = (tw.x + 0.5) * k, cy = (tw.y + 0.5) * k;
      if (pick === tw) { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(cx, cy, T.r * (1 + tw.lv * 0.12) * k, 0, 6.283); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, cy + k * 0.3, k * 0.36, k * 0.13, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#5b5568'; ctx.beginPath(); ctx.arc(cx, cy, k * 0.38, 0, 6.283); ctx.fill();
      ctx.fillStyle = T.col; ctx.beginPath(); ctx.arc(cx, cy, k * 0.3, 0, 6.283); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tw.ang || 0); const kick = (tw.kick || 0) * k * 0.08;
      ctx.fillStyle = tw.k === 'frost' ? '#d8f4ff' : tw.k === 'blitz' ? '#f0e0ff' : '#2b2735'; ctx.fillRect(-kick, -k * 0.07, k * 0.42, k * 0.14); ctx.restore();
      if (tw.k === 'blitz') { ctx.fillStyle = `rgba(200,150,255,${0.4 + Math.sin(t / 150 + tw.x) * 0.3})`; ctx.beginPath(); ctx.arc(cx, cy, k * 0.12, 0, 6.283); ctx.fill(); }
      for (let i = 0; i < tw.lv; i++) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx - k * 0.2 + i * k * 0.2, cy - k * 0.42, k * 0.07, 0, 6.283); ctx.fill(); }
    }
    // Gegner
    for (const e of G.en) {
      const [x, y] = posAt(e.d), cx = x * k, cy = y * k + Math.sin(t / 120 + e.wob) * k * 0.04, R = e.r * k;
      ctx.globalAlpha = e.ghost ? 0.65 + Math.sin(t / 200 + e.wob) * 0.2 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, y * k + R * 0.9, R * 0.9, R * 0.3, 0, 0, 6.283); ctx.fill();
      const gr = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, e.col); gr.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = gr;
      if (e.t === 'panzer' || e.t === 'boss') { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - R, cy - R * 0.8, R * 2, R * 1.6, R * 0.35) : ctx.rect(cx - R, cy - R * 0.8, R * 2, R * 1.6); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx - R * 0.3, cy - R * 0.15, R * 0.14, 0, 6.283); ctx.arc(cx + R * 0.3, cy - R * 0.15, R * 0.14, 0, 6.283); ctx.fill();
      if (e.t === 'boss') { ctx.font = `${R}px serif`; ctx.fillText('👑', cx, cy - R * 1.1); }
      if (e.slowT > 0) { ctx.strokeStyle = '#9fe3ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, 6.283); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (e.hp < e.max) { ctx.fillStyle = '#300'; ctx.fillRect(cx - R, cy - R - 8, R * 2, 4); ctx.fillStyle = e.hp / e.max > 0.4 ? '#3dff8a' : '#ff4d4d'; ctx.fillRect(cx - R, cy - R - 8, R * 2 * Math.max(0, e.hp / e.max), 4); }
    }
    // Geschosse
    for (const s of G.shots) {
      const col = s.k === 'frost' ? '#bfeaff' : s.k === 'kanone' ? '#222' : '#ffe8b0';
      ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = k * 0.06; ctx.beginPath(); s.tr.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x * k, y * k)); ctx.lineTo(s.x * k, s.y * k); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s.x * k, s.y * k, k * (s.k === 'kanone' ? 0.12 : 0.07), 0, 6.283); ctx.fill();
    }
    // Effekte
    for (const f of G.fx) {
      f.l -= 0.03;
      if (f.bolt) { ctx.strokeStyle = `rgba(210,170,255,${f.l})`; ctx.lineWidth = 3 * DPR; ctx.shadowColor = '#c18bff'; ctx.shadowBlur = 14; ctx.beginPath(); f.bolt.forEach(([x, y], i) => { const jx = i && i < f.bolt.length ? (Math.random() - 0.5) * 0.2 : 0; (i ? ctx.lineTo : ctx.moveTo).call(ctx, (x + jx) * k, (y + jx) * k); }); ctx.stroke(); ctx.shadowBlur = 0; }
      else if (f.ring) { ctx.strokeStyle = `rgba(255,170,60,${f.l})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.ring[0] * k, f.ring[1] * k, f.R * k * (1.1 - f.l * 0.6), 0, 6.283); ctx.stroke(); }
      else { f.x += f.vx; f.y += f.vy; ctx.globalAlpha = Math.max(0, f.l); ctx.fillStyle = f.c; ctx.fillRect(f.x * k - 2, f.y * k - 2, 4 * DPR, 4 * DPR); ctx.globalAlpha = 1; }
    }
    G.fx = G.fx.filter(f => f.l > 0);
    for (const x of G.txt) { x.t -= 0.02; x.y -= 0.012; ctx.globalAlpha = Math.max(0, Math.min(1, x.t)); ctx.fillStyle = x.c; ctx.font = `800 ${x.big ? k * 0.7 : x.gold ? k * 0.38 : k * 0.3}px Figtree, sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(x.s, x.x * k, x.y * k); ctx.fillText(x.s, x.x * k, x.y * k); ctx.globalAlpha = 1; }
    G.txt = G.txt.filter(x => x.t > 0);
  }
  let DPR = 1, hover = null;
  function size() { if (!cv) return; DPR = Math.min(2, window.devicePixelRatio || 1); const w = cv.parentElement.clientWidth; cell = w / COLS; cv.width = Math.round(w * DPR); cv.height = Math.round(cell * ROWS * DPR); cv.style.height = cell * ROWS + 'px'; }
  const canBuild = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !G.onPath.has(x + ',' + y) && !G.towers.some(t => t.x === x && t.y === y);
  const upCost = t => Math.round(TW[t.k].c * (0.8 + t.lv * 0.7));
  const value = t => Math.round(t.spent * 0.7);
  function hud() {
    if (!page) return; const e = page.querySelector('[data-twhud]'); if (!e) return;
    e.innerHTML = `<span>❤️ ${G.lives}</span><span>🪙 ${G.gold}</span><span>🌊 Welle ${G.wave}</span><span>⭐ ${G.score}</span>`;
    page.querySelectorAll('[data-twb]').forEach(b => { b.classList.toggle('on', b.dataset.twb === sel && !pick); b.disabled = G.gold < TW[b.dataset.twb].c; });
    const s = page.querySelector('[data-twsel]');
    s.innerHTML = pick ? `<b>${TW[pick.k].i} ${TW[pick.k].n} · Stufe ${pick.lv + 1}</b><span class="note">${TW[pick.k].d}</span><span style="flex:1"></span>${pick.lv < 3 ? `<button class="btn small" data-tw="up" ${G.gold < upCost(pick) ? 'disabled' : ''}>⬆ Verbessern (${upCost(pick)} 🪙)</button>` : '<span class="note">Maximal</span>'}<button class="btn ghost small" data-tw="sell">Verkaufen (+${value(pick)})</button><button class="btn ghost small" data-tw="desel">✕</button>`
      : `<button class="btn small" data-tw="wave" ${G.run || G.over ? 'disabled' : ''}>▶ ${G.wave ? 'Nächste Welle' : 'Erste Welle starten'}</button><button class="btn ghost small" data-tw="speed">⏩ ${G.speed}×</button><button class="btn ghost small ${auto ? '' : ''}" data-tw="auto">${auto ? '🔁 Auto an' : '🔁 Auto aus'}</button><span class="note">Turm wählen, dann aufs Gras tippen.</span>`;
  }
  async function gameOver() {
    hud(); const box = page.querySelector('.tw-cv');
    const ov = document.createElement('div'); ov.className = 'tw-ov'; ov.innerHTML = `<h2>🏰 Die Burg ist gefallen!</h2><p>Du hast <b>Welle ${G.wave}</b> erreicht · ${G.kills} Gegner besiegt · ⭐ ${G.score}</p><div data-twtop class="tw-top10">Rangliste wird geladen …</div><button class="btn" data-tw="new">Nochmal spielen</button>`;
    box.appendChild(ov);
    const r = konto() ? await call('td_submit', { wave: G.wave, score: G.score }) : await call('td_top', {});
    const el = ov.querySelector('[data-twtop]'); if (!el) return;
    const L = r.top || []; el.innerHTML = `<b>🏆 Beste Wellen</b>${L.slice(0, 8).map((x, i) => `<p><span>${i + 1}. ${h(x.name)}</span><b>Welle ${x.w}</b></p>`).join('') || '<p>Noch keine Einträge.</p>'}${konto() ? '' : '<p class="note">Melde dich im Hub an, um in die Rangliste zu kommen.</p>'}`;
  }
  function frame(t) {
    if (!page || page.hidden) { raf = null; return; }
    const dt = Math.min(0.05, (t - (last || t)) / 1000) * G.speed; last = t;
    if (!G.over) step(dt);
    draw(t); if ((frame.n = (frame.n || 0) + 1) % 10 === 0) hud();
    raf = requestAnimationFrame(frame);
  }
  function open() {
    if (!page) {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      page = document.createElement('main'); page.id = 'turmwacht'; page.hidden = true; document.body.insertBefore(page, q('#picker'));
      page.innerHTML = `<div class="tw-top"><button class="btn ghost small" data-tw="back">‹ Spiele</button><h2>🏰 Turmwacht</h2><div class="tw-hud" data-twhud></div></div>
        <div class="tw-cv"><canvas></canvas></div>
        <div class="tw-shop">${Object.entries(TW).map(([k, T]) => `<button data-twb="${k}"><span class="i">${T.i}</span>${T.n}<small>${T.c} 🪙 · ${T.d}</small></button>`).join('')}</div>
        <div class="tw-sel" data-twsel></div>`;
      cv = page.querySelector('canvas'); ctx = cv.getContext('2d');
      const cell0 = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * COLS), Math.floor((e.clientY - r.top) / r.height * ROWS)]; };
      cv.addEventListener('pointermove', e => { hover = cell0(e); });
      cv.addEventListener('pointerleave', () => { hover = null; });
      cv.addEventListener('click', e => {
        if (G.over) return; const [x, y] = cell0(e); const tw = G.towers.find(t => t.x === x && t.y === y);
        if (tw) { pick = pick === tw ? null : tw; hud(); return; }
        if (pick) { pick = null; hud(); return; }
        if (!canBuild(x, y)) return; const T = TW[sel]; if (G.gold < T.c) { say('Nicht genug Gold.'); return; }
        G.gold -= T.c; G.towers.push({ k: sel, x, y, lv: 0, cd: 0, ang: -Math.PI / 2, spent: T.c }); G.deco = G.deco.filter(d => d[0] !== x || d[1] !== y);
        for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28; G.fx.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * 0.04, vy: Math.sin(a) * 0.04, l: 0.8, c: '#fff6c8' }); }
        hud();
      });
      page.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.twb) { sel = b.dataset.twb; pick = null; hud(); return; }
        const a = b.dataset.tw;
        if (a === 'back') close(); else if (a === 'wave') startWave(); else if (a === 'speed') { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; hud(); } else if (a === 'auto') { auto = !auto; hud(); if (auto && !G.run) startWave(); }
        else if (a === 'up' && pick && pick.lv < 3 && G.gold >= upCost(pick)) { G.gold -= upCost(pick); pick.spent += upCost(pick); pick.lv++; hud(); }
        else if (a === 'sell' && pick) { G.gold += value(pick); G.towers = G.towers.filter(t => t !== pick); pick = null; hud(); }
        else if (a === 'desel') { pick = null; hud(); }
        else if (a === 'new') { page.querySelectorAll('.tw-ov').forEach(x => x.remove()); newGame(); pick = null; auto = false; hud(); }
      });
      addEventListener('resize', size);
      addEventListener('keydown', e => { if (!page || page.hidden || e.target.closest('input,textarea')) return; if (e.key === ' ') { e.preventDefault(); startWave(); } const i = Number(e.key) - 1; const ks = Object.keys(TW); if (ks[i]) { sel = ks[i]; pick = null; hud(); } });
      newGame();
    }
    const hub = q('#hub'); if (hub) hub.hidden = true;
    page.hidden = false; scrollTo(0, 0); size(); hud(); last = 0; if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() { if (page) page.hidden = true; const hub = q('#hub'); if (hub) hub.hidden = false; }
  document.addEventListener('click', e => { if (e.target.closest('[data-tw-open]')) open(); });
  window.Turmwacht = { open, isOpen: () => !!(page && !page.hidden) };
})();
