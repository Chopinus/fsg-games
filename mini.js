'use strict';
// Minispiele für die Party. Jedes Spiel läuft auf dem eigenen Gerät in einem Canvas
// und meldet seinen Punktestand an den Server.
(function () {
  const C = { bg: '#1b1726', panel: '#262035', line: '#3d3452', fg: '#f4ede1', muted: '#a99fbb', accent: '#ffb547', r: '#e5484d', y: '#f2be1a', g: '#27a06a', b: '#3b7ad6' };
  const FONT = '"Bungee","Arial Black",Impact,sans-serif';
  const BODY = '"Figtree",-apple-system,sans-serif';
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function txt(ctx, s, x, y, size, color, align = 'center', font = FONT) { ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // Gemeinsamer Rahmen: Canvas, Schleife, Eingabe, Zeitlimit, Live-Meldungen
  function harness(host, game, opts) {
    const W = game.W, H = game.H;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'display:block;margin:0 auto;border-radius:16px;touch-action:none;user-select:none;-webkit-user-select:none;max-width:100%';
    host.appendChild(cv);
    const ctx = cv.getContext('2d');
    let scale = 1;
    function size() {
      const maxH = Math.max(260, window.innerHeight - 400);
      const w = Math.min(host.clientWidth || 360, 680, maxH * W / H);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.style.width = w + 'px'; cv.style.height = (w * H / W) + 'px';
      cv.width = Math.round(w * dpr); cv.height = Math.round(w * H / W * dpr);
      scale = cv.width / W;
    }
    size();
    window.addEventListener('resize', size);
    const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
    let down = false;
    cv.addEventListener('pointerdown', e => { e.preventDefault(); down = true; try { cv.setPointerCapture(e.pointerId); } catch {} if (!over) game.down && game.down(...pos(e)); });
    cv.addEventListener('pointermove', e => { if (!over) game.move && game.move(...pos(e), down); });
    cv.addEventListener('pointerup', () => { down = false; game.up && game.up(); });
    const start = performance.now(), ms = opts.ms;
    let last = start, over = false, raf = 0, lastLive = '', liveT = 0, stopped = false;
    function frame(now) {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - start) / 1000;
      if (!over) {
        game.update(dt, t);
        if (now - start >= ms) {
          over = true;
          const f = game.score(); opts.onFinal(f);
        } else if (now - liveT > 400) {
          liveT = now; const s = game.score(); const k = s.v + '|' + s.label;
          if (k !== lastLive) { lastLive = k; opts.onLive(s); }
        }
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      game.draw(ctx, t);
      // Zeitbalken
      const left = Math.max(0, 1 - (now - start) / ms);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, 5);
      ctx.fillStyle = left < 0.15 ? C.r : C.accent; ctx.fillRect(0, 0, W * left, 5);
      if (over) {
        ctx.fillStyle = 'rgba(15,12,22,.7)'; ctx.fillRect(0, 0, W, H);
        txt(ctx, 'ZEIT!', W / 2, H / 2 - 18, 40, C.accent);
        txt(ctx, game.score().label, W / 2, H / 2 + 22, 20, C.fg, 'center', BODY);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', size); cv.remove(); };
  }

  /* ---------- Ballon-Pumpe ---------- */
  function ballon() {
    const W = 400, H = 300;
    let air = 0, balloons = 0, combo = 0, nextBeat = 1.2, prevBeat = -10, usedBeat = -1, beatIdx = 0, now = 0;
    let plunge = 0, msg = '', msgT = 0, msgC = C.fg, popT = -1, hue = 0;
    const interval = t => 60 / (92 + t * 1.1); // wird langsam schneller
    const parts = [];
    return {
      W, H,
      update(dt, t) {
        now = t;
        while (t >= nextBeat) { prevBeat = nextBeat; beatIdx++; nextBeat += interval(t); }
        air = Math.max(0, air - 2.2 * dt);
        plunge = Math.max(0, plunge - dt * 4);
        msgT -= dt; popT -= dt;
        parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.l -= dt; });
        while (parts.length && parts[0].l <= 0) parts.shift();
      },
      down() {
        const dPrev = now - prevBeat, dNext = nextBeat - now;
        const near = dPrev < dNext ? { d: dPrev, i: beatIdx } : { d: dNext, i: beatIdx + 1 };
        plunge = 1;
        if (near.i === usedBeat) { air = Math.max(0, air - 4); combo = 0; msg = 'Zu oft!'; msgC = C.r; msgT = .6; return; }
        usedBeat = near.i;
        if (near.d < 0.075) { combo++; air += 9 * (1 + Math.min(combo, 10) * 0.08); msg = combo > 2 ? `Perfekt ×${combo}` : 'Perfekt!'; msgC = C.accent; }
        else if (near.d < 0.15) { combo = 0; air += 5; msg = 'Gut'; msgC = C.g; }
        else { combo = 0; air = Math.max(0, air - 6); msg = 'Daneben'; msgC = C.r; }
        msgT = .6;
        if (air >= 100) {
          balloons++; air = 0; popT = .5; hue = (hue + 67) % 360;
          for (let i = 0; i < 24; i++) parts.push({ x: 200, y: 120, vx: (Math.random() - .5) * 400, vy: (Math.random() - .8) * 300, l: .8, c: `hsl(${hue + 120},80%,60%)` });
        }
      },
      score: () => ({ v: balloons * 100 + Math.floor(air), label: `${balloons} ${balloons === 1 ? 'Ballon' : 'Ballons'} + ${Math.floor(air)} %` }),
      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2140'); g.addColorStop(1, '#1b1726');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Pumpe
        const py = 150 + plunge * 40;
        ctx.fillStyle = '#5b4d73'; rrect(ctx, 40, 170, 50, 100, 8); ctx.fill();
        ctx.fillStyle = C.fg; ctx.fillRect(62, py - 50, 6, 60); rrect(ctx, 38, py - 58, 54, 12, 5); ctx.fill();
        ctx.strokeStyle = '#5b4d73'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(90, 250); ctx.quadraticCurveTo(150, 280, 200, 225); ctx.stroke();
        // Ballon
        const rad = 22 + air * 0.85, cx = 200, cy = 200 - rad;
        if (popT < 0.3) {
          ctx.fillStyle = `hsl(${hue},75%,58%)`;
          ctx.beginPath(); ctx.ellipse(cx, cy, rad * .88, rad, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(cx - rad * .35, cy - rad * .4, rad * .18, rad * .28, -.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `hsl(${hue},60%,45%)`; ctx.beginPath(); ctx.moveTo(cx - 6, 202); ctx.lineTo(cx + 6, 202); ctx.lineTo(cx, 194); ctx.fill();
        } else txt(ctx, 'PLOPP!', cx, 120, 34, C.accent);
        parts.forEach(p => { ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 5, 5); });
        // Füllstand
        ctx.fillStyle = 'rgba(255,255,255,.12)'; rrect(ctx, 250, 40, 14, 200, 7); ctx.fill();
        ctx.fillStyle = C.g; const fh = 200 * air / 100; rrect(ctx, 250, 240 - fh, 14, Math.max(fh, 0.1), 7); ctx.fill();
        // Taktkreis
        const tx = 335, ty = 150, span = nextBeat - prevBeat, frac = clamp((nextBeat - now) / Math.max(span, .1), 0, 1);
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(tx, ty, 26, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = frac < .18 ? C.accent : C.fg; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 26 + frac * 60, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = now - prevBeat < .1 ? C.accent : 'rgba(255,181,71,.35)'; ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2); ctx.fill();
        txt(ctx, 'TAKT', tx, ty + 52, 12, C.muted);
        txt(ctx, `${balloons}`, 30, 30, 26, C.fg, 'left'); txt(ctx, balloons === 1 ? 'Ballon' : 'Ballons', 30, 52, 12, C.muted, 'left', BODY);
        if (msgT > 0) txt(ctx, msg, 200, 30, 18, msgC);
      },
    };
  }

  /* ---------- Turbo-Rennen ---------- */
  function rennen(opts) {
    const W = 400, H = 300, GOAL = 800, GMAX = [0, 15, 27, 39, 51, 63];
    let rpm = 0.1, gear = 1, speed = 0, dist = 0, stall = 0, done = false, time = 0, msg = '', msgT = 0, msgC = C.fg, road = 0, gasFlash = 0;
    const btnGas = { x: 12, y: 220, w: 230, h: 68 }, btnShift = { x: 254, y: 220, w: 134, h: 68 };
    const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    return {
      W, H,
      update(dt, t) {
        if (done) return;
        time = t; msgT -= dt; gasFlash -= dt;
        if (stall > 0) { stall -= dt; rpm = Math.max(0.15, rpm - dt); }
        rpm = Math.max(0.08, rpm - 0.32 * dt);
        const target = GMAX[gear] * rpm;
        speed += (target > speed ? (target - speed) * 1.3 : (target - speed) * 0.4) * dt;
        dist += speed * dt; road = (road + speed * dt * 4) % 40;
        if (dist >= GOAL) { dist = GOAL; done = true; msg = 'ZIEL!'; msgC = C.accent; msgT = 99; }
      },
      down(x, y) {
        if (done) return;
        if (hit(btnShift, x, y)) {
          if (gear >= 5) { msg = 'Höchster Gang'; msgC = C.muted; msgT = .7; return; }
          if (rpm > 0.93) { stall = 0.9; rpm = 0.2; speed *= 0.85; msg = 'Abgewürgt!'; msgC = C.r; }
          else if (rpm >= 0.7) { gear++; rpm *= 0.58; msg = 'Perfekt geschaltet!'; msgC = C.g; }
          else { gear++; rpm *= 0.4; msg = 'Zu früh'; msgC = C.y; }
          msgT = .8;
        } else if (stall <= 0) { rpm = Math.min(1, rpm + 0.085); gasFlash = .08; if (rpm >= 1) { msg = 'Schalten!'; msgC = C.r; msgT = .4; } }
      },
      score: () => done ? { v: 100000 - Math.round(time * 1000), label: `${time.toFixed(2).replace('.', ',')} s` } : { v: Math.floor(dist), label: `${Math.floor(dist)} m` },
      draw(ctx) {
        ctx.fillStyle = '#3a6d3c'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#2c2a33'; ctx.fillRect(0, 60, W, 140);
        ctx.fillStyle = '#f4ede1';
        for (let x = -road; x < W; x += 40) { ctx.fillRect(x, 128, 22, 4); }
        ctx.fillStyle = '#e5484d'; for (let x = -road * 1.0; x < W; x += 20) ctx.fillRect(x, 58, 10, 4), ctx.fillRect(x + 10, 198, 10, 4);
        // eigenes Auto
        const cx = 150, cy = 150;
        ctx.fillStyle = C.r; rrect(ctx, cx - 40, cy - 16, 80, 30, 8); ctx.fill();
        ctx.fillStyle = '#9fd0ff'; rrect(ctx, cx - 6, cy - 12, 26, 22, 4); ctx.fill();
        ctx.fillStyle = '#111'; [[-26, -18], [22, -18], [-26, 14], [22, 14]].forEach(([dx, dy]) => ctx.fillRect(cx + dx, cy + dy, 14, 6));
        if (gasFlash > 0 || speed > 30) { ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(cx - 40, cy - 6); ctx.lineTo(cx - 52 - Math.random() * 10, cy); ctx.lineTo(cx - 40, cy + 6); ctx.fill(); }
        // Fortschritt mit Mitspielern
        ctx.fillStyle = 'rgba(0,0,0,.4)'; rrect(ctx, 10, 14, W - 20, 34, 8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(20, 30, W - 40, 3);
        const peers = (opts.peers && opts.peers()) || [];
        peers.forEach(p => { const d = p.v >= 100000 ? GOAL : clamp(p.v, 0, GOAL); const x = 20 + (W - 40) * d / GOAL; ctx.fillStyle = C.b; ctx.beginPath(); ctx.arc(x, 31, 6, 0, 7); ctx.fill(); txt(ctx, p.name.slice(0, 1).toUpperCase(), x, 31, 8, '#fff'); });
        const mx = 20 + (W - 40) * dist / GOAL; ctx.fillStyle = C.r; ctx.beginPath(); ctx.arc(mx, 31, 8, 0, 7); ctx.fill(); txt(ctx, 'DU', mx, 31, 7, '#fff');
        txt(ctx, '🏁', W - 18, 31, 14, '#fff', 'center', BODY);
        // Drehzahl und Tacho
        ctx.fillStyle = 'rgba(0,0,0,.55)'; rrect(ctx, 250, 66, 140, 62, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(260, 76, 120, 14);
        ctx.fillStyle = 'rgba(39,160,106,.6)'; ctx.fillRect(260 + 120 * .7, 76, 120 * .23, 14);
        ctx.fillStyle = 'rgba(229,72,77,.6)'; ctx.fillRect(260 + 120 * .93, 76, 120 * .07, 14);
        ctx.fillStyle = stall > 0 ? C.r : C.fg; ctx.fillRect(258 + 120 * rpm, 72, 4, 22);
        txt(ctx, `Gang ${gear}`, 262, 110, 14, C.fg, 'left'); txt(ctx, `${Math.round(speed * 3.6)} km/h`, 382, 110, 12, C.muted, 'right', BODY);
        txt(ctx, `${Math.floor(dist)} / ${GOAL} m`, 12, 214 - 120, 13, C.fg, 'left', BODY);
        // Knöpfe
        ctx.fillStyle = gasFlash > 0 ? '#ffcf85' : C.accent; rrect(ctx, btnGas.x, btnGas.y, btnGas.w, btnGas.h, 14); ctx.fill();
        txt(ctx, 'GAS', btnGas.x + btnGas.w / 2, btnGas.y + btnGas.h / 2, 26, '#2a1a00');
        const good = rpm >= 0.7 && rpm <= 0.93;
        ctx.fillStyle = good ? C.g : '#4b4060'; rrect(ctx, btnShift.x, btnShift.y, btnShift.w, btnShift.h, 14); ctx.fill();
        txt(ctx, 'SCHALTEN', btnShift.x + btnShift.w / 2, btnShift.y + btnShift.h / 2, 15, '#fff');
        if (msgT > 0) txt(ctx, msg, 150, 100 - 10, 18, msgC);
      },
    };
  }

  /* ---------- Pong-Mauer ---------- */
  function pong(opts) {
    const W = 300, H = 400, R = rng(opts.seed);
    let px = 150, bx = 150, by = 340, vx = 0, vy = 0, sp = 250, score = 0, combo = 0, wait = 1.2, level = 1, msg = '', msgT = 0;
    let bricks = [];
    function build() {
      bricks = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) if (R() < 0.85) bricks.push({ x: 10 + c * 40, y: 40 + r * 18, w: 38, h: 15, c: [C.r, C.y, C.g, C.b, '#b26ef0'][r], hp: r === 0 && level > 1 ? 2 : 1 });
    }
    build();
    function serve() { bx = px; by = 340; const a = -Math.PI / 2 + (R() - .5) * .8; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
    return {
      W, H,
      move(x) { px = clamp(x, 35, W - 35); },
      down(x) { px = clamp(x, 35, W - 35); },
      update(dt) {
        msgT -= dt;
        if (wait > 0) { wait -= dt; bx = px; by = 340; if (wait <= 0) serve(); return; }
        const steps = 3;
        for (let i = 0; i < steps; i++) {
          bx += vx * dt / steps; by += vy * dt / steps;
          if (bx < 6) { bx = 6; vx = Math.abs(vx); } if (bx > W - 6) { bx = W - 6; vx = -Math.abs(vx); }
          if (by < 14) { by = 14; vy = Math.abs(vy); }
          if (vy > 0 && by > 354 && by < 368 && Math.abs(bx - px) < 40) {
            const off = (bx - px) / 40; sp = Math.min(470, sp + 7);
            const a = -Math.PI / 2 + off * 1.0; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; score += 1;
          }
          for (const b of bricks) {
            if (b.hp > 0 && bx > b.x - 5 && bx < b.x + b.w + 5 && by > b.y - 5 && by < b.y + b.h + 5) {
              b.hp--; combo++; score += 10 + Math.min(combo, 20) * 2;
              const fromSide = Math.min(Math.abs(bx - b.x), Math.abs(bx - b.x - b.w)) < Math.min(Math.abs(by - b.y), Math.abs(by - b.y - b.h));
              if (fromSide) vx = -vx; else vy = -vy;
              break;
            }
          }
          if (by > H + 10) { wait = .9; combo = 0; score = Math.max(0, score - 25); msg = 'Verpasst! −25'; msgT = 1; break; }
        }
        bricks = bricks.filter(b => b.hp > 0);
        if (!bricks.length) { level++; score += 100; msg = 'Mauer geschafft! +100'; msgT = 1.4; build(); }
      },
      score: () => ({ v: score, label: `${score} Punkte` }),
      draw(ctx) {
        ctx.fillStyle = '#16121f'; ctx.fillRect(0, 0, W, H);
        bricks.forEach(b => { ctx.fillStyle = b.c; ctx.globalAlpha = b.hp > 1 ? 1 : .9; rrect(ctx, b.x, b.y, b.w, b.h, 4); ctx.fill(); if (b.hp > 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } });
        ctx.globalAlpha = 1;
        ctx.fillStyle = C.accent; rrect(ctx, px - 35, 358, 70, 10, 5); ctx.fill();
        ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(bx, by, 6, 0, 7); ctx.fill();
        txt(ctx, `${score}`, 10, 22, 16, C.fg, 'left');
        if (combo > 1) txt(ctx, `Serie ${combo}`, W - 10, 22, 12, C.accent, 'right');
        if (msgT > 0) txt(ctx, msg, W / 2, 220, 16, C.accent);
        if (wait > 0) txt(ctx, 'Finger auf den Schläger', W / 2, 300, 12, C.muted, 'center', BODY);
      },
    };
  }

  /* ---------- Raketenflug ---------- */
  function rakete(opts) {
    const W = 400, H = 300;
    const R = rng(opts.seed), gaps = [];
    for (let i = 0; i < 400; i++) gaps.push(60 + R() * 150);
    const stars = [...Array(60)].map(() => [Math.random() * W, Math.random() * H, Math.random() * 1.5 + .3]);
    let y = 150, vy = 0, x = 0, best = 0, dead = 0, alive = true, flame = 0, tries = 1, sp = 150;
    const GAP = 108, SPACING = 175, COLW = 46;
    const reset = () => { y = 150; vy = 0; x = 0; alive = true; sp = 150; tries++; };
    const dist = () => Math.floor(x / 10);
    return {
      W, H,
      down() { if (alive) { vy = -215; flame = .15; } },
      update(dt) {
        flame -= dt;
        if (!alive) { dead -= dt; if (dead <= 0) reset(); return; }
        vy += 560 * dt; y += vy * dt; sp = 150 + x / 120; x += sp * dt;
        best = Math.max(best, dist());
        if (y < 8 || y > H - 8) { alive = false; dead = 1; return; }
        const rx = x + 90;
        const i = Math.floor((rx - 300) / SPACING);
        for (const k of [i, i + 1]) {
          if (k < 0) continue;
          const cx = 300 + k * SPACING;
          if (rx + 12 > cx && rx - 12 < cx + COLW) { const gy = gaps[k % gaps.length]; if (y - 8 < gy || y + 8 > gy + GAP) { alive = false; dead = 1; } }
        }
      },
      score: () => ({ v: best, label: `${best} m` }),
      draw(ctx) {
        ctx.fillStyle = '#0d0b18'; ctx.fillRect(0, 0, W, H);
        stars.forEach(([sx, sy, s]) => { ctx.fillStyle = `rgba(255,255,255,${s / 2})`; ctx.fillRect(((sx - x * s * .2) % W + W) % W, sy, s, s); });
        const first = Math.max(0, Math.floor((x - 300) / SPACING) - 1);
        for (let k = first; k < first + 5; k++) {
          const cx = 300 + k * SPACING - x; if (cx > W + 10) break;
          const gy = gaps[k % gaps.length];
          ctx.fillStyle = '#6b5a7e';
          rrect(ctx, cx, -10, COLW, gy + 10, 10); ctx.fill(); rrect(ctx, cx, gy + GAP, COLW, H - gy - GAP + 10, 10); ctx.fill();
          ctx.fillStyle = '#857199'; ctx.beginPath(); ctx.arc(cx + 14, gy - 16, 5, 0, 7); ctx.arc(cx + 30, gy + GAP + 22, 6, 0, 7); ctx.fill();
        }
        ctx.save(); ctx.translate(90, y); ctx.rotate(clamp(vy / 600, -.6, .8));
        if (alive) {
          if (flame > 0) { ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-30 - Math.random() * 8, 0); ctx.lineTo(-14, 5); ctx.fill(); }
          ctx.fillStyle = C.fg; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, -9); ctx.lineTo(-14, 9); ctx.closePath(); ctx.fill();
          ctx.fillStyle = C.r; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-16, -14); ctx.lineTo(-14, -4); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-16, 14); ctx.lineTo(-14, 4); ctx.fill();
          ctx.fillStyle = '#9fd0ff'; ctx.beginPath(); ctx.arc(4, 0, 3.5, 0, 7); ctx.fill();
        } else { for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? C.accent : C.r; ctx.beginPath(); ctx.arc(Math.cos(i) * (1 - dead) * 30, Math.sin(i * 2) * (1 - dead) * 30, 4, 0, 7); ctx.fill(); } }
        ctx.restore();
        txt(ctx, `${dist()} m`, 12, 22, 16, C.fg, 'left');
        txt(ctx, `Rekord ${best} m`, W - 12, 22, 12, C.accent, 'right');
        if (!alive) txt(ctx, 'Crash! Neuer Versuch …', W / 2, H / 2, 16, C.fg);
        if (x < 40 && alive && tries === 1) txt(ctx, 'Tippen = Schub', W / 2, H - 30, 14, C.muted, 'center', BODY);
      },
    };
  }

  /* ---------- Stapelturm ---------- */
  function turm() {
    const W = 300, H = 400, BH = 22;
    let stack, cur, dir, best = 0, cam = 0, msg = '', msgT = 0, fall = null, combo = 0;
    function reset() { stack = [{ x: 70, w: 160 }]; spawn(); cam = 0; combo = 0; }
    function spawn() { const top = stack[stack.length - 1]; cur = { x: stack.length % 2 ? -top.w : W, w: top.w }; dir = stack.length % 2 ? 1 : -1; }
    reset();
    const height = () => stack.length - 1;
    return {
      W, H,
      down() {
        if (fall) return;
        const top = stack[stack.length - 1];
        const left = Math.max(cur.x, top.x), right = Math.min(cur.x + cur.w, top.x + top.w);
        if (right - left <= 0) { fall = { x: cur.x, w: cur.w, y: 0, t: 1.1 }; msg = 'Eingestürzt!'; msgT = 1.1; return; }
        if (Math.abs(cur.x - top.x) < 5) { stack.push({ x: top.x, w: top.w }); combo++; msg = combo > 1 ? `Perfekt ×${combo}` : 'Perfekt!'; msgT = .7; }
        else { stack.push({ x: left, w: right - left }); combo = 0; }
        best = Math.max(best, height());
        spawn();
      },
      update(dt) {
        msgT -= dt;
        if (fall) { fall.t -= dt; fall.y += 300 * dt; if (fall.t <= 0) { fall = null; reset(); } return; }
        const sp = 130 + height() * 9;
        cur.x += dir * sp * dt;
        if (cur.x > W - cur.w + 30) dir = -1; if (cur.x < -30) dir = 1;
        const target = Math.max(0, (stack.length - 10) * BH);
        cam += (target - cam) * Math.min(1, dt * 5);
      },
      score: () => ({ v: best, label: `${best} ${best === 1 ? 'Block' : 'Blöcke'}` }),
      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a2f55'); g.addColorStop(1, '#1b1726');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const yOf = i => H - 30 - (i + 1) * BH + cam;
        stack.forEach((b, i) => { ctx.fillStyle = `hsl(${(i * 17) % 360},65%,58%)`; ctx.fillRect(b.x, yOf(i), b.w, BH - 2); });
        if (!fall) { const i = stack.length; ctx.fillStyle = `hsl(${(i * 17) % 360},65%,62%)`; ctx.fillRect(cur.x, yOf(i), cur.w, BH - 2); }
        else { ctx.fillStyle = C.r; ctx.fillRect(fall.x, yOf(stack.length) + fall.y, fall.w, BH - 2); }
        ctx.fillStyle = '#2c2440'; ctx.fillRect(0, H - 30 + cam, W, 30);
        txt(ctx, `${height()}`, 12, 24, 22, C.fg, 'left');
        txt(ctx, `Rekord ${best}`, W - 12, 24, 12, C.accent, 'right');
        if (msgT > 0) txt(ctx, msg, W / 2, 70, 18, msg.startsWith('Ein') ? C.r : C.accent);
      },
    };
  }

  const GAMES = { ballon, rennen, pong, rakete, turm };
  window.MiniGames = {
    run(key, host, opts) { const g = GAMES[key]; if (!g) return () => {}; return harness(host, g(opts), opts); },
  };
})();
