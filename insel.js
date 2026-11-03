// Inselreich – Prototyp einer offenen 2D-Pixelwelt aus Inseln.
// Die Welt entsteht aus einem festen Startwert und ist deshalb auf jedem Gerät gleich,
// über das Netz gehen nur die Positionen der Spieler (wenige Bytes, 5× pro Sekunde).
(() => {
  'use strict';
  const SEED = 7331, CELL = 140, CH = 32, TP = 16; // Zellgröße für Inseln, Stückgröße, Pixel pro Feld
  const W_DEEP = 0, W_SEA = 1, W_SHALLOW = 2, SAND = 3, GRASS = 4, FOREST = 5, HILL = 6, ROCK = 7;
  const SHIRTS = ['#d8443a', '#3b7ad6', '#3fa34d', '#e3a92b', '#8e4fc9', '#e06aa8', '#2fb3b0', '#f07d2a'];
  const T_NAMES = { 0: 'Tiefsee', 1: 'Offenes Meer', 2: 'Flachwasser' };

  /* ---------- Zufall und Rauschen ---------- */
  function h2(x, y, s) {
    let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653);
    n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  const sm = t => t * t * (3 - 2 * t);
  function vn(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
    const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const fbm = (x, y, s) => vn(x, y, s) * 0.55 + vn(x * 2.1, y * 2.1, s + 1) * 0.3 + vn(x * 4.3, y * 4.3, s + 2) * 0.15;

  /* ---------- Inseln ---------- */
  const SYL = ['Ka', 'Lo', 'Mi', 'Ra', 'Te', 'Nu', 'Sa', 'Vel', 'Or', 'Bri', 'Ma', 'Ho', 'Ze', 'Fa', 'Lu', 'Is', 'Ko', 'Ta'];
  const END = ['nar', 'lo', 'ka', 'dia', 'mos', 'tun', 'ra', 'wen', 'sel', 'rin', 'bo', 'ter'];
  const KIND = ['Insel', 'Eiland', 'Inseln', 'Atoll'];
  const islCache = new Map();
  function island(cx, cy) {
    const k = cx + ',' + cy;
    if (islCache.has(k)) return islCache.get(k);
    let v = null;
    const home = cx === 0 && cy === 0;
    if (home || h2(cx, cy, SEED) < 0.62) {
      const x = home ? CELL / 2 : cx * CELL + 25 + h2(cx, cy, SEED + 1) * 90;
      const y = home ? CELL / 2 : cy * CELL + 25 + h2(cx, cy, SEED + 2) * 90;
      const r = home ? 30 : 12 + h2(cx, cy, SEED + 3) * 30;
      const k = home ? 0.66 : h2(cx, cy, SEED + 8) < 0.3 ? 1.2 : 0.62; // manche Inseln haben Berge
      const lobes = [[x, y, r, k]];
      const nl = home ? 2 : Math.floor(h2(cx, cy, SEED + 4) * 3);
      for (let i = 0; i < nl; i++) {
        const a = h2(cx, cy, SEED + 10 + i) * Math.PI * 2, d = r * (0.6 + h2(cx, cy, SEED + 20 + i) * 0.6);
        lobes.push([x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.4 + h2(cx, cy, SEED + 30 + i) * 0.45), k * 0.85]);
      }
      const nm = SYL[Math.floor(h2(cx, cy, SEED + 5) * SYL.length)] + END[Math.floor(h2(cx, cy, SEED + 6) * END.length)];
      const kind = KIND[Math.floor(h2(cx, cy, SEED + 7) * (r < 18 ? 4 : 2))];
      v = { x, y, r, lobes, name: home ? 'Heimatinsel' : (kind === 'Inseln' ? nm + '-Inseln' : kind + ' ' + nm) };
    }
    islCache.set(k, v);
    return v;
  }
  function elev(x, y) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    let best = -3;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const isl = island(cx + i, cy + j); if (!isl) continue;
      for (const [lx, ly, lr, lk] of isl.lobes) {
        const dx = x - lx, dy = y - ly; let v = 1 - (dx * dx + dy * dy) / (lr * lr);
        if (v > 0) v *= lk;
        if (v > best) best = v;
      }
    }
    if (best < -2.5) return best;
    return best + (fbm(x / 22, y / 22, SEED + 50) - 0.5) * 1.05 + (vn(x / 5, y / 5, SEED + 51) - 0.5) * 0.16;
  }
  const cls = e => (e < -0.9 ? W_DEEP : e < -0.25 ? W_SEA : e < 0 ? W_SHALLOW : e < 0.1 ? SAND : e < 0.6 ? GRASS : e < 0.82 ? HILL : ROCK);
  function tileAt(tx, ty) {
    const c = cls(elev(tx + 0.5, ty + 0.5));
    if (c === GRASS && fbm(tx / 14, ty / 14, SEED + 60) > 0.6) return FOREST;
    return c;
  }
  // Gegenstände auf einem Feld: 1 Baum, 2 Palme, 3 Felsbrocken, 4 Blumen, 5 Grasbüschel
  function objAt(tx, ty, t) {
    const r = h2(tx, ty, SEED + 70);
    if (Math.abs(tx - 70) < 3 && Math.abs(ty - 70) < 3) return 0; // Startplatz frei
    if (t === FOREST) return r < 0.3 ? 1 : r < 0.36 ? 5 : 0;
    if (t === GRASS) return r < 0.03 ? 1 : r < 0.09 ? 4 : r < 0.16 ? 5 : 0;
    if (t === SAND) return r < 0.03 ? 2 : 0;
    if (t === HILL) return r < 0.05 ? 3 : r < 0.08 ? 1 : 0;
    if (t === ROCK) return r < 0.06 ? 3 : 0;
    return 0;
  }
  const solid = o => o === 1 || o === 2 || o === 3;
  function walkable(x, y) {
    const e = elev(x, y); if (e < 0 && cls(e) !== W_SHALLOW) return false;
    const tx = Math.floor(x), ty = Math.floor(y), o = objAt(tx, ty, tileAt(tx, ty));
    if (solid(o)) { const dx = x - (tx + 0.5), dy = y - (ty + 0.75); if (dx * dx + dy * dy < 0.16) return false; }
    return true;
  }
  const sailable = (x, y) => elev(x, y) < -0.02;
  function nearestIsland(x, y) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    let best = null, bd = 1e9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const isl = island(cx + i, cy + j); if (!isl) continue;
      const d = Math.hypot(x - isl.x, y - isl.y) / (isl.r * 1.6);
      if (d < bd) { bd = d; best = isl; }
    }
    return bd < 1 ? best : null;
  }

  /* ---------- Farben ---------- */
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PAL = {
    [W_DEEP]: hex('#1b4a84'), [W_SEA]: hex('#2768aa'), [W_SHALLOW]: hex('#3f9bcb'), [SAND]: hex('#e6d098'),
    [GRASS]: hex('#68b64b'), [FOREST]: hex('#4c9a3a'), [HILL]: hex('#8aab58'), [ROCK]: hex('#8d8a84'),
  };
  const FOAM = hex('#d9f1fb'), WETSAND = hex('#cbb57c');

  /* ---------- Stücke der Karte vorberechnen ---------- */
  const chunks = new Map();
  function bakeChunk(kx, ky) {
    const N = CH * TP, x0 = kx * CH, y0 = ky * CH;
    // Höhe an den Feldecken, dazwischen weich verlaufen lassen
    const G = CH + 3, eg = new Float32Array(G * G);
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) eg[j * G + i] = elev(x0 + i - 1, y0 + j - 1);
    const ground = document.createElement('canvas'); ground.width = N; ground.height = N;
    const g = ground.getContext('2d'), img = g.createImageData(N, N), d = img.data;
    const fg = new Float32Array(G * G);
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) fg[j * G + i] = fbm((x0 + i - 1) / 14, (y0 + j - 1) / 14, SEED + 60);
    for (let py = 0; py < N; py++) {
      const fy = py / TP + 1, iy = Math.floor(fy), ry = fy - iy;
      for (let px = 0; px < N; px++) {
        const fx = px / TP + 1, ix = Math.floor(fx), rx = fx - ix;
        const a = eg[iy * G + ix], b = eg[iy * G + ix + 1], c = eg[(iy + 1) * G + ix], e4 = eg[(iy + 1) * G + ix + 1];
        const top = a + (b - a) * rx, bot = c + (e4 - c) * rx;
        let e = top + (bot - top) * ry;
        const wx = x0 * TP + px, wy = y0 * TP + py, nz = h2(wx, wy, SEED + 80);
        e += (nz - 0.5) * 0.025;
        let t = cls(e);
        if (t === GRASS) {
          const fa = fg[iy * G + ix], fb = fg[iy * G + ix + 1], fc = fg[(iy + 1) * G + ix], fd = fg[(iy + 1) * G + ix + 1];
          const ft = fa + (fb - fa) * rx, fbt = fc + (fd - fc) * rx;
          if (ft + (fbt - ft) * ry + (nz - 0.5) * 0.02 > 0.6) t = FOREST;
        }
        let col = PAL[t], k = 1 + (nz - 0.5) * 0.08;
        if (t === W_SHALLOW && e > -0.035) col = FOAM;
        else if (t === SAND && e < 0.018) col = WETSAND;
        // Hangschatten: Licht kommt von links oben
        const sl = ((b - a) + (e4 - c)) * 0.5 + ((c - a) + (e4 - b)) * 0.5;
        if (t >= GRASS) k *= 1 - Math.max(-0.12, Math.min(0.12, sl * 0.55));
        if (t <= W_SHALLOW) k *= 0.96 + vn(wx / 40, wy / 40, SEED + 81) * 0.08;
        const o = (py * N + px) * 4;
        d[o] = Math.min(255, col[0] * k); d[o + 1] = Math.min(255, col[1] * k); d[o + 2] = Math.min(255, col[2] * k); d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // Gegenstände: Bodenteil hier, Baumkronen auf eigene Ebene (die Figur kann dahinter gehen)
    const top = document.createElement('canvas'); top.width = N; top.height = N + TP;
    const tc = top.getContext('2d');
    const solids = [];
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const wx = x0 + tx, wy = y0 + ty, t = tileAt(wx, wy), o = objAt(wx, wy, t);
      if (!o) continue;
      const px = tx * TP, py = ty * TP, r = h2(wx, wy, SEED + 90), ox = Math.round((r - 0.5) * 4);
      if (o === 1) drawTree(g, tc, px + ox, py, t === FOREST ? (r < 0.5 ? 1 : 2) : 0, r);
      else if (o === 2) drawPalm(g, tc, px + ox, py, r);
      else if (o === 3) drawRock(g, px + ox, py, r);
      else if (o === 4) drawFlowers(g, px, py, wx, wy);
      else if (o === 5) drawTuft(g, px, py, wx, wy, t);
      if (solid(o)) solids.push(o);
    }
    return { ground, top };
  }
  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function drawTree(g, tc, x, y, kind, r) {
    // Schatten und Stamm am Boden
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + 8, y + 13, 7, 3, 0, 0, Math.PI * 2); g.fill();
    px(g, x + 7, y + 7, 3, 7, '#6b4426'); px(g, x + 7, y + 7, 1, 7, '#8a5a34');
    // Krone darüber (ein Feld nach oben)
    const C = kind === 0 ? ['#2f7d2c', '#3f9a37', '#63c14f'] : kind === 1 ? ['#245f27', '#2f7a2f', '#4e9e3d'] : ['#2b6b3a', '#38834a', '#5aa868'];
    const cx = x + 8, cy = y + TP - 2 + 2; // TP Versatz der Kronen-Ebene
    if (kind === 2) { // Tanne
      for (let i = 0; i < 4; i++) { const w = 3 + i * 2; px(tc, cx - w, cy - 14 + i * 4, w * 2, 4, i % 2 ? C[0] : C[1]); px(tc, cx - w + 1, cy - 14 + i * 4, 2, 2, C[2]); }
      px(tc, cx - 1, cy - 17, 2, 3, C[1]);
      return;
    }
    tc.fillStyle = C[0]; tc.beginPath(); tc.arc(cx, cy - 6, 8 + r * 1.5, 0, Math.PI * 2); tc.fill();
    tc.fillStyle = C[1]; tc.beginPath(); tc.arc(cx - 1, cy - 7, 6.5 + r, 0, Math.PI * 2); tc.fill();
    tc.fillStyle = C[2]; tc.beginPath(); tc.arc(cx - 3, cy - 10, 3, 0, Math.PI * 2); tc.fill();
    if (r > 0.7 && kind === 0) { px(tc, cx + 2, cy - 4, 2, 2, '#d8443a'); px(tc, cx - 4, cy - 2, 2, 2, '#d8443a'); }
  }
  function drawPalm(g, tc, x, y, r) {
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x + 9, y + 13, 6, 2.5, 0, 0, Math.PI * 2); g.fill();
    const lean = r < 0.5 ? -1 : 1;
    for (let i = 0; i < 9; i++) px(g, x + 7 + Math.round(lean * i * i / 30), y + 14 - i, 2, 1, i % 3 ? '#9a6a3a' : '#7a5028');
    const cx = x + 8 + lean * 3, cy = y + TP + 3 - 9;
    tc.strokeStyle = '#3f8f3a'; tc.lineWidth = 2; tc.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + r;
      tc.beginPath(); tc.moveTo(cx, cy); tc.quadraticCurveTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 3 - 3, cx + Math.cos(a) * 8, cy + Math.sin(a) * 4 + 1); tc.stroke();
    }
    px(tc, cx - 1, cy - 1, 3, 3, '#6b4426');
  }
  function drawRock(g, x, y, r) {
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 8, y + 13, 6, 2.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6f6c68'; g.beginPath(); g.ellipse(x + 8, y + 10, 6 + r * 1.5, 4.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9b9892'; g.beginPath(); g.ellipse(x + 7, y + 8.5, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
    px(g, x + 5, y + 7, 2, 1, '#c2bfb8');
  }
  function drawFlowers(g, x, y, wx, wy) {
    const cols = ['#f4e04d', '#ffffff', '#e86a8a', '#b77de0'];
    for (let i = 0; i < 4; i++) { const a = h2(wx, wy, SEED + 100 + i), b = h2(wx, wy, SEED + 110 + i); px(g, x + 2 + Math.floor(a * 12), y + 2 + Math.floor(b * 12), 2, 2, cols[Math.floor(h2(wx, wy, SEED + 120) * 4)]); }
  }
  function drawTuft(g, x, y, wx, wy, t) {
    const c = t === FOREST ? '#3a7d2c' : '#4f9a3c';
    for (let i = 0; i < 3; i++) { const a = Math.floor(h2(wx, wy, SEED + 130 + i) * 12) + 2, b = Math.floor(h2(wx, wy, SEED + 140 + i) * 10) + 3; px(g, x + a, y + b, 1, 3, c); px(g, x + a - 1, y + b + 1, 1, 2, c); px(g, x + a + 1, y + b + 1, 1, 2, c); }
  }
  function chunk(kx, ky) {
    const k = kx + ',' + ky;
    let c = chunks.get(k);
    if (c) { chunks.delete(k); chunks.set(k, c); return c; } // zuletzt benutzt nach hinten
    c = bakeChunk(kx, ky); chunks.set(k, c);
    if (chunks.size > 48) chunks.delete(chunks.keys().next().value);
    return c;
  }

  /* ---------- Figuren ---------- */
  const spriteCache = new Map();
  function sprite(col, dir, frame) {
    const k = col + '|' + dir + '|' + frame;
    if (spriteCache.has(k)) return spriteCache.get(k);
    const c = document.createElement('canvas'); c.width = 16; c.height = 20; const g = c.getContext('2d');
    const shirt = SHIRTS[col % 8], skin = '#f1c39a', hair = ['#3a2614', '#7a4a20', '#d9b25a', '#1f1f24'][col % 4];
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(8, 18.5, 5, 1.6, 0, 0, Math.PI * 2); g.fill();
    const step = frame ? 1 : 0;
    // Beine
    px(g, 5, 14, 2, 4 - (dir < 3 && step ? 1 : 0), '#3a3f5c'); px(g, 9, 14, 2, 4 - (dir < 3 && !step && frame !== 0 ? 1 : 0), '#3a3f5c');
    if (frame) { px(g, 5, 17 - step, 2, 1, '#2a2a2a'); px(g, 9, 17, 2, 1, '#2a2a2a'); } else { px(g, 5, 17, 2, 1, '#2a2a2a'); px(g, 9, 17, 2, 1, '#2a2a2a'); }
    // Körper
    px(g, 4, 8, 8, 7, shirt); px(g, 4, 8, 8, 1, 'rgba(255,255,255,.25)');
    const arm = frame ? 1 : 0;
    if (dir === 1 || dir === 2) px(g, dir === 1 ? 6 : 8, 9 + arm, 2, 5, skin);
    else { px(g, 2, 9 + arm, 2, 5, shirt); px(g, 12, 9 + (1 - arm), 2, 5, shirt); px(g, 2, 13 + arm, 2, 1, skin); px(g, 12, 14 - arm, 2, 1, skin); }
    // Kopf
    px(g, 4, 1, 8, 7, skin);
    px(g, 4, 0, 8, 3, hair);
    if (dir === 3) px(g, 4, 1, 8, 6, hair);
    else if (dir === 0) { px(g, 3, 1, 1, 4, hair); px(g, 12, 1, 1, 4, hair); px(g, 6, 4, 1, 2, '#222'); px(g, 9, 4, 1, 2, '#222'); }
    else if (dir === 1) { px(g, 9, 1, 4, 5, hair); px(g, 5, 4, 1, 2, '#222'); }
    else { px(g, 3, 1, 4, 5, hair); px(g, 10, 4, 1, 2, '#222'); }
    spriteCache.set(k, c);
    return c;
  }

  /* ---------- Wind ---------- */
  function wind(t) {
    t = t ?? Date.now() / 1000;
    const a = 0.8 + Math.sin(t / 97) * 1.1 + Math.sin(t / 31 + 1) * 0.35; // Richtung, in die der Wind weht
    const s = 0.72 + 0.28 * Math.sin(t / 53 + 2);
    return { a, s };
  }
  const POLAR = [[0, 0.6], [0.9, 0.85], [1.6, 1], [2.2, 0.72], [2.55, 0.14], [Math.PI, 0.05]];
  function polar(rel) {
    rel = Math.abs(rel);
    for (let i = 1; i < POLAR.length; i++) if (rel <= POLAR[i][0]) { const [a0, v0] = POLAR[i - 1], [a1, v1] = POLAR[i]; return v0 + (v1 - v0) * (rel - a0) / (a1 - a0); }
    return 0.05;
  }
  const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const DIRN = ['Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten', 'Norden', 'Nordosten'];
  const dirName = a => DIRN[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];

  /* ---------- Spielzustand ---------- */
  const me = { x: 70.5, y: 70.5, dir: 0, moving: 0, frame: 0, ft: 0, inBoat: 0, col: 0, name: 'Gast' };
  const boat = { x: 0, y: 0, h: 0, v: 0, sail: 0 };
  const others = new Map(); // id -> Spieler
  const bubbles = new Map(); // Name -> {m, t}
  const wake = [];
  let myId = null, online = 1, lastSent = '', sendT = 0, saveT = 0, open = false, raf = 0, lastT = 0;
  let cv, ctx, root, hud = {}, S = 3, W = 0, H = 0, DPR = 1;
  const keys = new Set();
  const joy = { on: false, id: null, x0: 0, y0: 0, dx: 0, dy: 0 };
  let chatOpen = false, bigMap = false, mapDirty = true, mapAt = [1e9, 1e9], lastIsle = '';
  const log = [];
  let found = new Set();
  try { found = new Set(JSON.parse(localStorage.getItem('insel.found') || '[]')); } catch {}
  function discover(isl) { if (found.has(isl.name)) return false; found.add(isl.name); try { localStorage.setItem('insel.found', JSON.stringify([...found])); } catch {} return true; }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem('insel.save') || 'null');
      if (s && Number.isFinite(s.x)) { Object.assign(me, { x: s.x, y: s.y, inBoat: s.inBoat ? 1 : 0, col: s.col | 0 }); Object.assign(boat, s.boat || {}); boat.v = 0; return true; }
    } catch {}
    me.col = Math.floor(Math.random() * 8);
    return false;
  }
  function save() { try { localStorage.setItem('insel.save', JSON.stringify({ x: me.x, y: me.y, inBoat: me.inBoat, col: me.col, boat: { x: boat.x, y: boat.y, h: boat.h, sail: boat.sail } })); } catch {} }
  function spawn() {
    // Start in der Mitte der Heimatinsel, Boot ans nächste Wasser
    const isl = island(0, 0);
    me.x = isl.x + 0.5; me.y = isl.y + 0.5;
    for (let r = 0; r < 20 && !walkable(me.x, me.y); r++) me.y += 1;
    let found = null;
    for (let r = 1; r < 80 && !found; r++) for (let i = 0; i < 32; i++) {
      const a = i / 32 * Math.PI * 2 + Math.PI / 2, x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r;
      if (sailable(x, y) && sailable(x + 1, y) && sailable(x - 1, y) && sailable(x, y + 1)) { found = [x, y, a]; break; }
    }
    if (found) { boat.x = found[0]; boat.y = found[1]; boat.h = found[2]; }
    boat.sail = 0; boat.v = 0; me.inBoat = 0;
  }
  const stateArr = () => [me.x, me.y, me.dir, me.moving, me.inBoat, boat.x, boat.y, boat.h, boat.sail];

  /* ---------- Oberfläche ---------- */
  const CSS = `
#isl{position:fixed;inset:0;z-index:9000;background:#1b4a84;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
#isl canvas.is-main{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
#isl .is-top{position:absolute;left:10px;top:10px;display:flex;gap:8px;align-items:center;z-index:2}
#isl .is-btn{border:0;border-radius:12px;background:rgba(14,22,40,.72);color:#fff;font:600 15px system-ui;padding:9px 13px;cursor:pointer;backdrop-filter:blur(4px);box-shadow:0 2px 8px rgba(0,0,0,.3)}
#isl .is-btn:hover{background:rgba(30,44,74,.85)}
#isl .is-place{background:rgba(14,22,40,.6);padding:7px 12px;border-radius:12px;font-weight:700;font-size:15px;max-width:46vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#isl .is-place small{display:block;font-weight:500;opacity:.75;font-size:12px}
#isl .is-mapwrap{position:absolute;right:10px;top:10px;z-index:2;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
#isl canvas.is-map{width:132px;height:132px;border-radius:50%;border:3px solid rgba(255,255,255,.75);box-shadow:0 3px 12px rgba(0,0,0,.4);cursor:pointer;image-rendering:pixelated;background:#1b4a84}
#isl .is-wind{background:rgba(14,22,40,.6);border-radius:12px;padding:6px 10px;font-size:12.5px;display:flex;gap:8px;align-items:center;line-height:1.25}
#isl .is-wind i{display:inline-block;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.12);position:relative;flex:none}
#isl .is-wind i::after{content:"➤";position:absolute;inset:0;display:grid;place-items:center;font-style:normal;font-size:15px;color:#9fe0ff;transform:rotate(var(--a))}
#isl .is-big{position:absolute;inset:0;z-index:5;background:rgba(6,14,30,.82);display:grid;place-items:center}
#isl .is-big canvas{width:min(92vw,92vh,640px);height:min(92vw,92vh,640px);border-radius:16px;border:3px solid rgba(255,255,255,.7);image-rendering:pixelated}
#isl .is-big b{position:absolute;top:14px;left:0;right:0;text-align:center;font-size:16px}
#isl .is-log{position:absolute;left:10px;bottom:10px;z-index:2;max-width:min(420px,60vw);display:flex;flex-direction:column;gap:3px;pointer-events:none}
#isl .is-log div{background:rgba(14,22,40,.62);padding:4px 9px;border-radius:9px;font-size:13.5px;line-height:1.3;width:fit-content;max-width:100%;overflow-wrap:anywhere;transition:opacity 1s}
#isl .is-log div b{color:#ffd27a}
#isl .is-chat{position:absolute;left:10px;right:10px;bottom:10px;z-index:4;display:none;gap:6px;max-width:520px}
#isl .is-chat input{flex:1;min-width:0;border:0;border-radius:12px;padding:11px 13px;font-size:16px;background:rgba(255,255,255,.95);color:#111}
#isl .is-acts{position:absolute;right:12px;bottom:14px;z-index:2;display:flex;gap:10px;align-items:flex-end}
#isl .is-act{width:58px;height:58px;border-radius:50%;border:0;background:rgba(14,22,40,.72);color:#fff;font-size:24px;display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.35);cursor:pointer;position:relative}
#isl .is-act span{position:absolute;bottom:-17px;left:50%;transform:translateX(-50%);font-size:11px;white-space:nowrap;text-shadow:0 1px 2px #000;font-weight:600}
#isl .is-act.on{background:#e3a92b;color:#2a1608}
#isl .is-act[hidden]{display:none}
#isl .is-hint{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;z-index:1;background:rgba(14,22,40,.55);padding:6px 12px;border-radius:10px;font-size:12.5px;white-space:nowrap;pointer-events:none}
#isl .is-joy{position:absolute;z-index:3;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35);pointer-events:none;display:none}
#isl .is-joy i{position:absolute;left:50%;top:50%;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;background:rgba(255,255,255,.55)}
#isl .is-say{position:absolute;left:50%;top:22%;transform:translateX(-50%);z-index:3;background:rgba(14,22,40,.78);padding:10px 16px;border-radius:14px;font-weight:700;font-size:16px;text-align:center;pointer-events:none;transition:opacity .6s}
@media (pointer:coarse){#isl .is-hint{display:none}}
@media (max-width:600px){#isl canvas.is-map{width:96px;height:96px}#isl .is-wind{font-size:11.5px}#isl .is-log{bottom:92px;max-width:70vw}}
`;
  function build() {
    if (!document.getElementById('isl-css')) { const st = document.createElement('style'); st.id = 'isl-css'; st.textContent = CSS; document.head.appendChild(st); }
    root = document.createElement('div'); root.id = 'isl';
    root.innerHTML = `<canvas class="is-main"></canvas>
<div class="is-top"><button class="is-btn" data-x title="Zurück zum Hub">✕</button><div class="is-place"><span data-isle>Heimatinsel</span><small data-on>1 Spieler online</small></div></div>
<div class="is-mapwrap"><canvas class="is-map" width="132" height="132" title="Karte vergrößern (M)"></canvas><div class="is-wind"><i></i><span data-wind></span></div></div>
<div class="is-log"></div>
<div class="is-chat"><input maxlength="120" placeholder="Nachricht an alle …" enterkeyhint="send"><button class="is-btn" data-send>Senden</button></div>
<div class="is-acts"><button class="is-act" data-chat>💬<span>Chat</span></button><button class="is-act" data-sail hidden>⛵<span>Segel</span></button><button class="is-act" data-boat>⚓<span>Boot</span></button></div>
<div class="is-hint">WASD/Pfeile laufen · E ins Boot · Leertaste Segel · T Chat · M Karte</div>
<div class="is-joy"><i></i></div>
<div class="is-say" style="opacity:0"></div>`;
    document.body.appendChild(root);
    cv = root.querySelector('canvas.is-main'); ctx = cv.getContext('2d');
    hud = {
      isle: root.querySelector('[data-isle]'), on: root.querySelector('[data-on]'), wind: root.querySelector('[data-wind]'), arrow: root.querySelector('.is-wind i'),
      map: root.querySelector('canvas.is-map'), log: root.querySelector('.is-log'), chat: root.querySelector('.is-chat'), input: root.querySelector('.is-chat input'),
      sail: root.querySelector('[data-sail]'), boat: root.querySelector('[data-boat]'), joy: root.querySelector('.is-joy'), say: root.querySelector('.is-say'),
    };
    root.querySelector('[data-x]').onclick = close;
    hud.boat.onclick = toggleBoat;
    hud.sail.onclick = toggleSail;
    root.querySelector('[data-chat]').onclick = () => openChat();
    root.querySelector('[data-send]').onclick = sendChat;
    hud.input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') sendChat(); else if (e.key === 'Escape') closeChat(); });
    hud.map.onclick = () => toggleMap();
    cv.addEventListener('pointerdown', joyDown);
    window.addEventListener('pointermove', joyMove);
    window.addEventListener('pointerup', joyUp);
    window.addEventListener('pointercancel', joyUp);
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    W = Math.round(root.clientWidth * DPR); H = Math.round(root.clientHeight * DPR);
    cv.width = W; cv.height = H;
    S = Math.max(2, Math.round(Math.min(W, H) / (TP * 13)));
    ctx.imageSmoothingEnabled = false;
  }
  function say(t) { hud.say.textContent = t; hud.say.style.opacity = 1; clearTimeout(say.t); say.t = setTimeout(() => (hud.say.style.opacity = 0), 2600); }
  function addLog(html) {
    log.push({ html, t: Date.now() }); if (log.length > 6) log.shift();
    hud.log.innerHTML = log.map(l => `<div>${l.html}</div>`).join('');
  }
  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function openChat() { chatOpen = true; hud.chat.style.display = 'flex'; hud.input.value = ''; hud.input.focus(); keys.clear(); }
  function closeChat() { chatOpen = false; hud.chat.style.display = 'none'; hud.input.blur(); }
  function sendChat() {
    const m = hud.input.value.trim(); closeChat();
    if (!m) return;
    if (typeof send === 'function') send({ t: 'i_chat', m });
  }
  function toggleMap() {
    bigMap = !bigMap;
    const old = root.querySelector('.is-big'); if (old) old.remove();
    if (!bigMap) return;
    const d = document.createElement('div'); d.className = 'is-big';
    d.innerHTML = `<b>Karte · ${found.size} Inseln entdeckt · tippen zum Schließen</b><canvas width="320" height="320"></canvas>`;
    root.appendChild(d); d.onclick = () => toggleMap();
    drawMap(d.querySelector('canvas'), 420, true);
  }

  /* ---------- Steuerung ---------- */
  function joyDown(e) {
    if (chatOpen || bigMap) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'mouse') return; // am PC über die Tastatur
    joy.on = true; joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joy.dx = joy.dy = 0;
    hud.joy.style.display = 'block'; hud.joy.style.left = e.clientX + 'px'; hud.joy.style.top = e.clientY + 'px'; hud.joy.firstChild.style.transform = '';
  }
  function joyMove(e) {
    if (!joy.on || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const l = Math.hypot(dx, dy), m = 50;
    if (l > m) { dx = dx / l * m; dy = dy / l * m; }
    joy.dx = dx / m; joy.dy = dy / m;
    hud.joy.firstChild.style.transform = `translate(${dx}px,${dy}px)`;
  }
  function joyUp(e) { if (!joy.on || e.pointerId !== joy.id) return; joy.on = false; joy.dx = joy.dy = 0; hud.joy.style.display = 'none'; }
  function onKey(e) {
    if (!open || chatOpen) return;
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') {
      if (k === 't' || k === 'enter') { e.preventDefault(); openChat(); return; }
      if (k === 'e' && !e.repeat) { toggleBoat(); return; }
      if (k === ' ' || k === 'q') { e.preventDefault(); if (!e.repeat) toggleSail(); return; }
      if (k === 'm' && !e.repeat) { toggleMap(); return; }
      if (k === 'escape') { if (bigMap) toggleMap(); return; }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      keys.add(k);
    } else keys.delete(k);
  }
  function inputDir() {
    let x = 0, y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x--; if (keys.has('d') || keys.has('arrowright')) x++;
    if (keys.has('w') || keys.has('arrowup')) y--; if (keys.has('s') || keys.has('arrowdown')) y++;
    if (joy.on && Math.hypot(joy.dx, joy.dy) > 0.18) { x = joy.dx; y = joy.dy; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return [x, y];
  }
  function toggleBoat() {
    if (me.inBoat) {
      // an Land gehen: freies Feld rund ums Boot suchen
      for (let r = 1; r <= 2.6; r += 0.4) for (let i = 0; i < 16; i++) {
        const a = boat.h + i / 16 * Math.PI * 2, x = boat.x + Math.cos(a) * r, y = boat.y + Math.sin(a) * r;
        if (walkable(x, y) && elev(x, y) >= 0) { me.inBoat = 0; me.x = x; me.y = y; boat.v = 0; boat.sail = 0; say('An Land gegangen'); return; }
      }
      say('Hier ist kein Ufer – fahr näher ans Land');
      return;
    }
    if (Math.hypot(boat.x - me.x, boat.y - me.y) < 2.2) { me.inBoat = 1; me.x = boat.x; me.y = boat.y; say('Leinen los! Leertaste oder ⛵ setzt das Segel'); return; }
    // Boot herholen, wenn Wasser in der Nähe ist
    for (let r = 1; r <= 4; r += 0.5) for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2, x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r;
      if (sailable(x, y)) { boat.x = x; boat.y = y; boat.h = a; boat.v = 0; boat.sail = 0; say('Dein Boot liegt jetzt hier am Ufer'); return; }
    }
    say(`Dein Boot liegt im ${dirName(Math.atan2(boat.y - me.y, boat.x - me.x))} (${Math.round(Math.hypot(boat.x - me.x, boat.y - me.y))} Felder). Geh ans Wasser, dann kannst du es rufen.`);
  }
  function toggleSail() { if (!me.inBoat) return; boat.sail = boat.sail ? 0 : 1; say(boat.sail ? 'Segel gesetzt – fahr quer zum Wind, dann bist du am schnellsten' : 'Segel eingeholt – du paddelst'); }

  /* ---------- Spiellogik ---------- */
  function step(dt) {
    const [ix, iy] = chatOpen || bigMap ? [0, 0] : inputDir();
    if (!me.inBoat) {
      const wade = elev(me.x, me.y) < 0;
      const sp = (wade ? 2.4 : 4.6) * dt;
      me.moving = ix || iy ? 1 : 0;
      if (me.moving) {
        if (Math.abs(ix) > Math.abs(iy)) me.dir = ix < 0 ? 1 : 2; else me.dir = iy < 0 ? 3 : 0;
        const nx = me.x + ix * sp, ny = me.y + iy * sp;
        if (walkable(nx, me.y)) me.x = nx;
        if (walkable(me.x, ny)) me.y = ny;
        me.ft += dt; if (me.ft > 0.16) { me.ft = 0; me.frame = me.frame === 1 ? 2 : 1; }
      } else me.frame = 0;
    } else {
      const w = wind();
      if (ix || iy) { // Bug in Richtung der Eingabe drehen
        const want = Math.atan2(iy, ix), d = wrap(want - boat.h), turn = 1.9 * dt * Math.min(1, Math.hypot(ix, iy) + 0.3);
        boat.h = wrap(boat.h + Math.max(-turn, Math.min(turn, d)));
      }
      let target = 0;
      if (boat.sail) target = 6.2 * w.s * polar(wrap(boat.h - w.a));
      else if (ix || iy) target = 1.6;
      boat.v += (target - boat.v) * Math.min(1, dt * (target > boat.v ? 0.7 : 1.2));
      const nx = boat.x + Math.cos(boat.h) * boat.v * dt, ny = boat.y + Math.sin(boat.h) * boat.v * dt;
      const bx = nx + Math.cos(boat.h) * 0.9, by = ny + Math.sin(boat.h) * 0.9; // Bug
      if (sailable(bx, by) && sailable(nx, ny)) { boat.x = nx; boat.y = ny; }
      else { if (boat.v > 1.5) say('Auf Grund gelaufen! Dreh das Boot oder geh an Land (⚓)'); boat.v = 0; }
      me.x = boat.x; me.y = boat.y; me.moving = boat.v > 0.2 ? 1 : 0;
      if (boat.v > 0.8 && Math.random() < dt * boat.v * 4) wake.push({ x: boat.x - Math.cos(boat.h) * 0.9 + (Math.random() - 0.5) * 0.4, y: boat.y - Math.sin(boat.h) * 0.9 + (Math.random() - 0.5) * 0.4, t: 0 });
    }
    for (let i = wake.length - 1; i >= 0; i--) { wake[i].t += dt; if (wake[i].t > 1.6) wake.splice(i, 1); }
    for (const o of others.values()) { const k = Math.min(1, dt * 8); for (const f of ['x', 'y', 'bx', 'by']) o[f] += (o.t[f] - o[f]) * k; o.bh += wrap(o.t.bh - o.bh) * k; o.ft += dt; }
    // Netz: nur wenn sich etwas geändert hat
    sendT += dt; saveT += dt;
    if (sendT > 0.2) {
      sendT = 0;
      const s = stateArr().map(v => Math.round(v * 100) / 100), k = JSON.stringify(s);
      if (k !== lastSent && myId && typeof send === 'function') { lastSent = k; send({ t: 'i_s', s }); }
    }
    if (saveT > 3) { saveT = 0; save(); }
  }

  /* ---------- Zeichnen ---------- */
  function drawBoat(x, y, h, sail, col, v, t, withMe) {
    const u = TP * S;
    ctx.save(); ctx.translate(x, y); ctx.rotate(h);
    const L = u * 1.1, B = u * 0.42;
    // Schatten und Bugwelle
    ctx.fillStyle = 'rgba(0,20,50,.28)'; ctx.beginPath(); ctx.ellipse(u * 0.06, u * 0.1, L, B * 1.05, 0, 0, Math.PI * 2); ctx.fill();
    if (v > 0.5) { ctx.strokeStyle = 'rgba(230,248,255,.7)'; ctx.lineWidth = S; ctx.beginPath(); ctx.moveTo(L * 0.6, -B * 1.1); ctx.quadraticCurveTo(L * 1.05, 0, L * 0.6, B * 1.1); ctx.stroke(); }
    // Rumpf
    ctx.fillStyle = '#6b4426'; ctx.beginPath(); ctx.moveTo(L, 0); ctx.quadraticCurveTo(L * 0.4, -B * 1.15, -L * 0.85, -B); ctx.lineTo(-L * 0.9, B); ctx.quadraticCurveTo(L * 0.4, B * 1.15, L, 0); ctx.fill();
    ctx.fillStyle = '#a8743f'; ctx.beginPath(); ctx.moveTo(L * 0.86, 0); ctx.quadraticCurveTo(L * 0.35, -B * 0.85, -L * 0.75, -B * 0.72); ctx.lineTo(-L * 0.78, B * 0.72); ctx.quadraticCurveTo(L * 0.35, B * 0.85, L * 0.86, 0); ctx.fill();
    ctx.fillStyle = '#8a5a34'; for (let i = -2; i <= 2; i++) ctx.fillRect(-L * 0.7, i * B * 0.28 - S / 2, L * 1.35, S * 0.6);
    // Figur im Boot
    if (withMe) {
      ctx.fillStyle = SHIRTS[col % 8]; ctx.beginPath(); ctx.arc(-L * 0.45, 0, u * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c39a'; ctx.beginPath(); ctx.arc(-L * 0.45, 0, u * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ['#3a2614', '#7a4a20', '#d9b25a', '#1f1f24'][col % 4]; ctx.beginPath(); ctx.arc(-L * 0.48, 0, u * 0.1, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
    }
    // Mast und Segel
    const mx = L * 0.25;
    const w = wind(t), rel = wrap(w.a - h), side = Math.sin(rel) >= 0 ? 1 : -1;
    if (sail) {
      const k = 0.25 + 1.15 * (1 - Math.abs(rel) / Math.PI), ba = Math.PI - side * k, bl = L * 1.05;
      const ex = mx + Math.cos(ba) * bl, ey = Math.sin(ba) * bl;
      const nxp = -Math.sin(ba) * side, nyp = Math.cos(ba) * side, bulge = u * 0.35 * w.s;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(mx + S * 2, S * 2); ctx.quadraticCurveTo((mx + ex) / 2 + nxp * bulge + S * 2, ey / 2 + nyp * bulge + S * 2, ex + S * 2, ey + S * 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f6efe0'; ctx.beginPath(); ctx.moveTo(mx, 0); ctx.quadraticCurveTo((mx + ex) / 2 + nxp * bulge * 2, ey / 2 + nyp * bulge * 2, ex, ey); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = SHIRTS[col % 8]; ctx.lineWidth = S * 1.2; ctx.beginPath(); ctx.moveTo(mx + (ex - mx) * 0.55, ey * 0.55); ctx.lineTo(mx + (ex - mx) * 0.55 + nxp * bulge * 0.9, ey * 0.55 + nyp * bulge * 0.9); ctx.stroke();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = S; ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(ex, ey); ctx.stroke();
    } else {
      ctx.fillStyle = '#e8dcc2'; ctx.fillRect(-L * 0.55, -S, mx + L * 0.55, S * 2.2);
      ctx.fillStyle = SHIRTS[col % 8]; ctx.fillRect(-L * 0.2, -S, S * 2, S * 2.2);
    }
    ctx.fillStyle = '#4a2e18'; ctx.beginPath(); ctx.arc(mx, 0, S * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function nameTag(x, y, name, me_) {
    ctx.font = `600 ${Math.round(4.2 * S)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const w = ctx.measureText(name).width + 4 * S;
    ctx.fillStyle = me_ ? 'rgba(227,169,43,.85)' : 'rgba(14,22,40,.7)'; roundRect(x - w / 2, y - 6 * S, w, 6 * S, 2 * S); ctx.fill();
    ctx.fillStyle = me_ ? '#2a1608' : '#fff'; ctx.fillText(name, x, y - 0.7 * S);
  }
  function bubble(x, y, text) {
    ctx.font = `500 ${Math.round(4.4 * S)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const t = text.length > 40 ? text.slice(0, 39) + '…' : text, w = ctx.measureText(t).width + 6 * S;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(x - w / 2, y - 8 * S, w, 7 * S, 3 * S); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 2 * S, y - 1.2 * S); ctx.lineTo(x, y + 0.8 * S); ctx.lineTo(x + 2 * S, y - 1.2 * S); ctx.fill();
    ctx.fillStyle = '#1a1a22'; ctx.fillText(t, x, y - 2.2 * S);
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function render(t) {
    const u = TP * S, camX = me.x, camY = me.y;
    const ox = Math.round(W / 2 - camX * u), oy = Math.round(H / 2 - camY * u);
    const sx = (wx) => ox + wx * u, sy = (wy) => oy + wy * u;
    ctx.fillStyle = '#1b4a84'; ctx.fillRect(0, 0, W, H);
    const k0x = Math.floor(-ox / u / CH), k1x = Math.floor((W - ox) / u / CH), k0y = Math.floor(-oy / u / CH), k1y = Math.floor((H - oy) / u / CH);
    const cs = CH * u;
    const vis = [];
    for (let ky = k0y; ky <= k1y; ky++) for (let kx = k0x; kx <= k1x; kx++) { const c = chunk(kx, ky); vis.push([kx, ky, c]); ctx.drawImage(c.ground, ox + kx * cs, oy + ky * cs, cs, cs); }
    // Wellen auf dem Wasser
    const tx0 = Math.floor(-ox / u), tx1 = Math.ceil((W - ox) / u), ty0 = Math.floor(-oy / u), ty1 = Math.ceil((H - oy) / u);
    ctx.fillStyle = 'rgba(220,243,255,.55)';
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const r = h2(tx, ty, SEED + 200); if (r > 0.07) continue;
      const ph = (t / 1000 * 0.5 + r * 40) % 3; if (ph > 1.3) continue;
      if (elev(tx + 0.5, ty + 0.5) > -0.05) continue;
      const a = Math.sin(ph / 1.3 * Math.PI);
      ctx.globalAlpha = a; ctx.fillRect(sx(tx) + 4 * S, sy(ty) + 8 * S + ph * S, 7 * S, S); ctx.fillRect(sx(tx) + 6 * S, sy(ty) + 7 * S + ph * S, 3 * S, S);
    }
    ctx.globalAlpha = 1;
    // Kielwasser
    for (const p of wake) { ctx.globalAlpha = Math.max(0, 0.6 - p.t * 0.38); ctx.fillStyle = '#eaf8ff'; const r = (1 + p.t * 2) * S; ctx.fillRect(sx(p.x) - r, sy(p.y) - r / 2, r * 2, Math.max(S, r / 2)); }
    ctx.globalAlpha = 1;
    // Figuren und Boote nach Höhe sortiert
    const ents = [];
    ents.push({ y: boat.y, f: () => drawBoat(sx(boat.x), sy(boat.y), boat.h, boat.sail, me.col, me.inBoat ? boat.v : 0, t / 1000, me.inBoat) });
    if (!me.inBoat) ents.push({ y: me.y, f: () => drawPerson(sx(me.x), sy(me.y), me.col, me.dir, me.frame, elev(me.x, me.y) < 0, t) });
    for (const o of others.values()) {
      ents.push({ y: o.by, f: () => drawBoat(sx(o.bx), sy(o.by), o.bh, o.sail, o.col, o.inBoat && o.moving ? 2 : 0, t / 1000, o.inBoat) });
      if (!o.inBoat) ents.push({ y: o.y, f: () => drawPerson(sx(o.x), sy(o.y), o.col, o.dir, o.moving ? (Math.floor(o.ft / 0.16) % 2) + 1 : 0, elev(o.x, o.y) < 0, t) });
    }
    ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
    // Baumkronen über den Figuren
    for (const [kx, ky, c] of vis) ctx.drawImage(c.top, ox + kx * cs, oy + ky * cs - u, cs, cs + u);
    // Namen und Sprechblasen
    const now = Date.now();
    for (const o of others.values()) {
      const hx = sx(o.x), hy = sy(o.y) - (o.inBoat ? 0.6 : 1.3) * u;
      nameTag(hx, hy, o.name, false);
      const b = bubbles.get(o.name); if (b && now - b.t < 6000) bubble(hx, hy - 7 * S, b.m);
    }
    const mb = bubbles.get(me.name); if (mb && now - mb.t < 6000) bubble(W / 2, H / 2 - (me.inBoat ? 0.6 : 1.3) * u - S, mb.m);
  }
  function drawPerson(x, y, col, dir, frame, wade, t) {
    const sp = sprite(col, dir, frame), w = 16 * S, h = 20 * S;
    if (wade) {
      ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h + 4 * S, w, h - 6 * S); ctx.clip();
      ctx.drawImage(sp, x - w / 2, y - h + 4 * S + 2 * S, w, h); ctx.restore();
      ctx.strokeStyle = 'rgba(230,248,255,.75)'; ctx.lineWidth = S; ctx.beginPath(); ctx.ellipse(x, y - 1 * S, 6 * S + Math.sin(t / 200) * S, 2 * S, 0, 0, Math.PI * 2); ctx.stroke();
    } else ctx.drawImage(sp, x - w / 2, y - h + 4 * S, w, h);
  }
  function drawMap(c, range, big) {
    const g = c.getContext('2d'), N = c.width, img = g.createImageData(N, N), d = img.data, step = (range * 2) / N;
    const x0 = me.x - range, y0 = me.y - range;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const e = elev(x0 + i * step, y0 + j * step), t = cls(e), col = PAL[t], o = (j * N + i) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const P = (x, y) => [(x - x0) / step, (y - y0) / step];
    // Inselnamen auf der großen Karte
    if (big) {
      g.font = '600 8px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2.5;
      const c0x = Math.floor(x0 / CELL), c1x = Math.floor((x0 + range * 2) / CELL), c0y = Math.floor(y0 / CELL), c1y = Math.floor((y0 + range * 2) / CELL);
      for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) { const isl = island(cx, cy); if (!isl || !found.has(isl.name)) continue; const [px_, py_] = P(isl.x, isl.y); g.strokeText(isl.name, px_, py_ - isl.r / step - 3); g.fillText(isl.name, px_, py_ - isl.r / step - 3); }
    }
    const dot = (x, y, col, r) => { const [a, b] = P(x, y); g.fillStyle = '#000'; g.beginPath(); g.arc(a, b, r + 1.2, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); g.fill(); };
    for (const o of others.values()) dot(o.x, o.y, SHIRTS[o.col % 8], big ? 2.5 : 2);
    if (!me.inBoat) dot(boat.x, boat.y, '#a8743f', big ? 2.5 : 2);
    dot(me.x, me.y, '#ffd27a', big ? 3.5 : 3);
  }
  function hudTick() {
    const w = wind();
    hud.arrow.style.setProperty('--a', w.a + 'rad');
    const str = w.s < 0.6 ? 'schwach' : w.s < 0.85 ? 'mäßig' : 'kräftig';
    hud.wind.innerHTML = `Wind nach ${dirName(w.a)}, ${str}` + (me.inBoat ? `<br>Fahrt: ${(boat.v * 2).toFixed(1)} Knoten${boat.sail ? '' : ' (Paddeln)'}` : '');
    const isl = nearestIsland(me.x, me.y);
    const place = isl ? isl.name : T_NAMES[cls(elev(me.x, me.y))] || 'Offenes Meer';
    if (place !== lastIsle) { lastIsle = place; hud.isle.textContent = place; if (isl && discover(isl) && place !== 'Heimatinsel') { say('🏝️ Neue Insel entdeckt: ' + place); addLog(`Entdeckt: <b>${escH(place)}</b> (${found.size} Inseln bisher)`); } }
    hud.on.textContent = online === 1 ? 'nur du bist online' : `${online} Spieler online`;
    hud.sail.hidden = !me.inBoat; hud.sail.classList.toggle('on', !!boat.sail);
    hud.boat.querySelector('span').textContent = me.inBoat ? 'An Land' : 'Boot';
    if (Math.hypot(me.x - mapAt[0], me.y - mapAt[1]) > 6 || mapDirty) { mapAt = [me.x, me.y]; mapDirty = false; drawMap(hud.map, 120, false); }
    // alte Chatzeilen ausblenden
    const now = Date.now(); [...hud.log.children].forEach((el, i) => { const l = log[i]; if (l && now - l.t > 15000) el.style.opacity = 0; });
  }
  let hudT = 0;
  function loop(t) {
    if (!open) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - (lastT || t)) / 1000); lastT = t;
    if (root.clientWidth * DPR !== W || root.clientHeight * DPR !== H) resize();
    step(dt);
    render(t);
    hudT += dt; if (hudT > 0.25) { hudT = 0; hudTick(); }
  }

  /* ---------- Netz ---------- */
  function join() { if (typeof send === 'function') send({ t: 'i_join', name: me.name, col: me.col, s: stateArr() }); lastSent = ''; }
  function net(m) {
    if (m.t === 'i_hi') { myId = m.id; online = m.n; return; }
    if (m.t === 'i_w') {
      online = m.n || online;
      const seen = new Set();
      for (const p of m.p || []) {
        const [id, name, col, x, y, dir, moving, inBoat, bx, by, bh, sail] = p; seen.add(id);
        const tgt = { x, y, bx: inBoat ? x : bx, by: inBoat ? y : by, bh };
        let o = others.get(id);
        if (!o) { o = { ...tgt, t: tgt, ft: 0 }; others.set(id, o); }
        Object.assign(o, { name, col, dir, moving, inBoat, sail, t: tgt });
      }
      for (const id of [...others.keys()]) if (!seen.has(id)) others.delete(id);
      mapDirty = true;
      return;
    }
    if (m.t === 'i_chat') { bubbles.set(m.n, { m: m.m, t: Date.now() }); addLog(`<b>${escH(m.n)}:</b> ${escH(m.m)}`); }
  }

  function openGame(name) {
    if (open) return;
    me.name = (name || 'Gast').slice(0, 16);
    if (!load()) spawn();
    if (!root) build(); else root.style.display = '';
    open = true; document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    window.addEventListener('blur', blur);
    resize(); lastT = 0; others.clear(); mapDirty = true; lastIsle = '';
    join();
    addLog('Willkommen im <b>Inselreich</b>! Das ist ein früher Prototyp.');
    say(me.inBoat ? 'Willkommen zurück auf See' : 'Willkommen auf der ' + (nearestIsland(me.x, me.y) || { name: 'Insel' }).name);
    raf = requestAnimationFrame(loop);
  }
  function blur() { keys.clear(); }
  function closeGame() {
    if (!open) return;
    open = false; cancelAnimationFrame(raf); save();
    if (typeof send === 'function') send({ t: 'i_leave' });
    myId = null;
    window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', blur);
    if (bigMap) toggleMap(); closeChat();
    root.style.display = 'none'; document.body.style.overflow = '';
  }
  function close() { closeGame(); }
  window.Insel = {
    open: openGame, close, net, isOpen: () => open, rejoin: () => { if (open) join(); },
    _dbg: { me, boat, others, elev, tileAt, wind, island, spawn, toggleBoat, toggleSail },
  };
})();
