// Würfelwelt: eigenes Open-World-Blockspiel für den Game Hub.
// Unendliche Welt aus Würfeln mit Biomen, Höhlen, Bäumen und Erzen. Abbauen, Bauen, Tag und Nacht,
// Kreativ- und Überlebensmodus. Läuft ganz im Browser (WebGL), gespeichert wird im Gerät.
(() => {
  'use strict';
  const CS = 16, H = 96, SEA = 32;
  const $ = s => document.querySelector(s);

  /* ================= Blöcke ================= */
  // tex: [oben, seite, unten] als Kachelnummer im Bildatlas. solid: man kann nicht hindurch. op: verdeckt Nachbarflächen.
  const B = {};
  const BL = [];
  function blk(id, key, name, tex, o = {}) { const b = { id, key, name, tex: Array.isArray(tex) ? tex : [tex, tex, tex], solid: o.solid ?? true, op: o.op ?? true, hard: o.hard ?? 0.6, drop: o.drop, cross: !!o.cross, water: !!o.water, glow: !!o.glow, alpha: !!o.alpha, inv: o.inv ?? true, pick: o.pick || 0, axe: !!o.axe, torch: !!o.torch }; BL[id] = b; B[key] = id; return b; }
  blk(0, 'luft', 'Luft', 0, { solid: false, op: false, inv: false });
  blk(1, 'gras', 'Grasblock', [1, 2, 3], { hard: 0.6, drop: 'erde' });
  blk(2, 'erde', 'Erde', 3, { hard: 0.5 });
  blk(3, 'stein', 'Stein', 4, { hard: 1.5, drop: 'pflaster', pick: 1 });
  blk(4, 'sand', 'Sand', 5, { hard: 0.5 });
  blk(5, 'wasser', 'Wasser', 6, { solid: false, op: false, water: true, inv: false, hard: 0 });
  blk(6, 'stamm', 'Holzstamm', [8, 7, 8], { hard: 1.2, axe: true });
  blk(7, 'blatt', 'Blätter', 9, { op: false, alpha: true, hard: 0.2 });
  blk(8, 'schnee', 'Schnee', 10, { hard: 0.4 });
  blk(9, 'grund', 'Grundfels', 11, { hard: 1e9, inv: false });
  blk(10, 'kohle', 'Kohleerz', 12, { hard: 1.8, pick: 1, drop: 'kohlestk' });
  blk(11, 'eisen', 'Eisenerz', 13, { hard: 2.2, pick: 2 });
  blk(12, 'bretter', 'Bretter', 14, { hard: 1, axe: true });
  blk(13, 'glas', 'Glas', 15, { op: false, alpha: true, hard: 0.4 });
  blk(14, 'ziegel', 'Ziegel', 16, { hard: 1.8, pick: 1 });
  blk(15, 'pflaster', 'Pflasterstein', 17, { hard: 1.6, pick: 1 });
  blk(16, 'kaktus', 'Kaktus', [19, 18, 19], { hard: 0.5 });
  blk(17, 'leucht', 'Leuchtstein', 20, { glow: true, hard: 0.6 });
  blk(18, 'sandstein', 'Sandstein', [22, 21, 22], { hard: 1.2, pick: 1 });
  blk(19, 'eis', 'Eis', 23, { hard: 0.6 });
  blk(20, 'stoffw', 'Stoff weiß', 24, { hard: 0.6 });
  blk(21, 'stoffr', 'Stoff rot', 25, { hard: 0.6 });
  blk(22, 'stoffg', 'Stoff gelb', 26, { hard: 0.6 });
  blk(23, 'stoffb', 'Stoff blau', 27, { hard: 0.6 });
  blk(24, 'blumer', 'Rote Blume', 28, { solid: false, op: false, cross: true, hard: 0 });
  blk(25, 'blumeg', 'Gelbe Blume', 29, { solid: false, op: false, cross: true, hard: 0 });
  blk(26, 'blumeb', 'Blaue Blume', 30, { solid: false, op: false, cross: true, hard: 0 });
  blk(27, 'halm', 'Grasbüschel', 31, { solid: false, op: false, cross: true, hard: 0, inv: false });
  blk(28, 'kies', 'Kies', 32, { hard: 0.6 });
  blk(29, 'fstamm', 'Fichtenstamm', [8, 33, 8], { hard: 1.2, axe: true });
  blk(30, 'fnadel', 'Fichtennadeln', 34, { op: false, alpha: true, hard: 0.2 });
  blk(31, 'steinz', 'Steinziegel', 35, { hard: 1.8, pick: 1 });
  blk(32, 'fackel', 'Fackel', 36, { solid: false, op: false, cross: true, glow: true, torch: true, hard: 0 });
  blk(33, 'bett', 'Bett', [37, 38, 14], { hard: 0.6, axe: true });
  const INV_IDS = BL.filter(b => b && b.inv).map(b => b.id);
  // Gegenstände, die keine Blöcke sind: Werkzeuge, Essen, Rohstoffe
  const ITEMS = {
    stock: { name: 'Stock', tile: 64 }, kohlestk: { name: 'Kohle', tile: 65 }, barren: { name: 'Eisenbarren', tile: 66 },
    hacke1: { name: 'Holzspitzhacke', tile: 67, pick: 1 }, hacke2: { name: 'Steinspitzhacke', tile: 68, pick: 2 }, hacke3: { name: 'Eisenspitzhacke', tile: 69, pick: 3 },
    schwert1: { name: 'Holzschwert', tile: 70, dmg: 4 }, schwert2: { name: 'Steinschwert', tile: 71, dmg: 5 }, schwert3: { name: 'Eisenschwert', tile: 72, dmg: 7 },
    axt: { name: 'Steinaxt', tile: 73, axe: 3, dmg: 4 },
    apfel: { name: 'Apfel', tile: 74, food: 4 }, fleisch: { name: 'Rohes Fleisch', tile: 75, food: 3 }, braten: { name: 'Braten', tile: 76, food: 8 },
    feder: { name: 'Feder', tile: 77 }, knochen: { name: 'Knochen', tile: 78 }, schleim: { name: 'Schleimkugel', tile: 79 },
  };
  const isItem = k => !!ITEMS[k];
  const nameOf = k => (ITEMS[k] ? ITEMS[k].name : BL[B[k]] ? BL[B[k]].name : k);
  const isOp = id => BL[id].op, isSolid = id => BL[id].solid;
  // Rezepte im Überlebensmodus
  const RECIPES = [
    { out: ['bretter', 4], in: [['stamm', 1]] }, { out: ['bretter', 4], in: [['fstamm', 1]] }, { out: ['stock', 4], in: [['bretter', 2]] },
    { out: ['hacke1', 1], in: [['bretter', 3], ['stock', 2]] }, { out: ['schwert1', 1], in: [['bretter', 2], ['stock', 1]] },
    { out: ['hacke2', 1], in: [['pflaster', 3], ['stock', 2]] }, { out: ['schwert2', 1], in: [['pflaster', 2], ['stock', 1]] }, { out: ['axt', 1], in: [['pflaster', 3], ['stock', 2]] },
    { out: ['barren', 1], in: [['eisen', 1], ['kohlestk', 1]] }, { out: ['hacke3', 1], in: [['barren', 3], ['stock', 2]] }, { out: ['schwert3', 1], in: [['barren', 2], ['stock', 1]] },
    { out: ['fackel', 4], in: [['kohlestk', 1], ['stock', 1]] }, { out: ['braten', 1], in: [['fleisch', 1], ['kohlestk', 1]] },
    { out: ['bett', 1], in: [['stoffw', 3], ['bretter', 3]] },
    { out: ['glas', 4], in: [['sand', 4], ['kohlestk', 1]] }, { out: ['ziegel', 4], in: [['erde', 4], ['kohlestk', 1]] },
    { out: ['sandstein', 1], in: [['sand', 2]] }, { out: ['steinz', 4], in: [['pflaster', 4]] },
    { out: ['leucht', 2], in: [['kohlestk', 2], ['barren', 1]] }, { out: ['stoffw', 1], in: [['blatt', 3]] }, { out: ['stoffw', 2], in: [['schleim', 1], ['blatt', 1]] },
    { out: ['stoffr', 1], in: [['stoffw', 1], ['blumer', 1]] }, { out: ['stoffg', 1], in: [['stoffw', 1], ['blumeg', 1]] },
    { out: ['stoffb', 1], in: [['stoffw', 1], ['blumeb', 1]] }, { out: ['eis', 1], in: [['schnee', 4]] },
  ];

  /* ================= Zufall und Rauschen ================= */
  function hash3(x, y, z, s) { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function makeNoise(seed) {
    const p = new Uint8Array(512); const a = []; for (let i = 0; i < 256; i++) a[i] = i;
    let s = seed >>> 0 || 1; const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (let i = 0; i < 512; i++) p[i] = a[i & 255];
    const G3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    function n2(xin, yin) {
      const s2 = (xin + yin) * F2, i = Math.floor(xin + s2), j = Math.floor(yin + s2), t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255;
      let n = 0, tt;
      tt = 0.5 - x0 * x0 - y0 * y0; if (tt > 0) { const g = G3[p[ii + p[jj]] % 12]; tt *= tt; n += tt * tt * (g[0] * x0 + g[1] * y0); }
      tt = 0.5 - x1 * x1 - y1 * y1; if (tt > 0) { const g = G3[p[ii + i1 + p[jj + j1]] % 12]; tt *= tt; n += tt * tt * (g[0] * x1 + g[1] * y1); }
      tt = 0.5 - x2 * x2 - y2 * y2; if (tt > 0) { const g = G3[p[ii + 1 + p[jj + 1]] % 12]; tt *= tt; n += tt * tt * (g[0] * x2 + g[1] * y2); }
      return 70 * n;
    }
    const gx = G3.map(g => g[0]), gy = G3.map(g => g[1]), gz = G3.map(g => g[2]);
    function n3(x, y, z) {
      const F3 = 1 / 3, G = 1 / 6, s3 = (x + y + z) * F3, i = Math.floor(x + s3), j = Math.floor(y + s3), k = Math.floor(z + s3), t = (i + j + k) * G;
      const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } }
      else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
      const ii = i & 255, jj = j & 255, kk = k & 255; let n = 0, g, tt;
      tt = 0.6 - x0 * x0 - y0 * y0 - z0 * z0; if (tt > 0) { g = p[ii + p[jj + p[kk]]] % 12; tt *= tt; n += tt * tt * (gx[g] * x0 + gy[g] * y0 + gz[g] * z0); }
      const x1 = x0 - i1 + G, y1 = y0 - j1 + G, z1 = z0 - k1 + G; tt = 0.6 - x1 * x1 - y1 * y1 - z1 * z1; if (tt > 0) { g = p[ii + i1 + p[jj + j1 + p[kk + k1]]] % 12; tt *= tt; n += tt * tt * (gx[g] * x1 + gy[g] * y1 + gz[g] * z1); }
      const x2 = x0 - i2 + 2 * G, y2 = y0 - j2 + 2 * G, z2 = z0 - k2 + 2 * G; tt = 0.6 - x2 * x2 - y2 * y2 - z2 * z2; if (tt > 0) { g = p[ii + i2 + p[jj + j2 + p[kk + k2]]] % 12; tt *= tt; n += tt * tt * (gx[g] * x2 + gy[g] * y2 + gz[g] * z2); }
      const x3 = x0 - 0.5, y3 = y0 - 0.5, z3 = z0 - 0.5; tt = 0.6 - x3 * x3 - y3 * y3 - z3 * z3; if (tt > 0) { g = p[ii + 1 + p[jj + 1 + p[kk + 1]]] % 12; tt *= tt; n += tt * tt * (gx[g] * x3 + gy[g] * y3 + gz[g] * z3); }
      return 32 * n;
    }
    const fbm = (x, y, oct) => { let a = 1, f = 1, s = 0, m = 0; for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); m += a; a *= 0.5; f *= 2; } return s / m; };
    return { n2, n3, fbm };
  }

  /* ================= Welt-Erzeugung ================= */
  let N = null, SEED = 1;
  // Höhe und Biom einer Spalte (ohne Blöcke), deterministisch aus dem Startwert
  function column(x, z) {
    const cont = N.fbm(x / 520, z / 520, 3), hills = N.fbm(x / 90 + 50, z / 90, 4), mnt = Math.max(0, N.fbm(x / 260 - 70, z / 260 + 30, 3) + 0.05);
    const temp = N.fbm(x / 700 + 200, z / 700, 2), moist = N.fbm(x / 600, z / 600 - 300, 2);
    let h = SEA + 3 + cont * 22 + hills * 7 + mnt * mnt * 120;
    h = Math.max(4, Math.min(H - 8, Math.floor(h)));
    let biome = 'wiese';
    if (temp > 0.28 && moist < 0.1) biome = 'wueste';
    else if (temp < -0.3) biome = 'schnee';
    else if (moist > 0.12) biome = 'wald';
    if (h > SEA + 34) biome = h > SEA + 46 ? 'gipfel' : 'berg';
    return { h, biome, beach: h <= SEA + 1 && biome !== 'schnee' };
  }
  function genChunk(cx, cz) {
    const d = new Uint8Array(CS * CS * H), x0 = cx * CS, z0 = cz * CS, cols = [];
    const set = (x, y, z, id) => { if (x >= 0 && x < CS && z >= 0 && z < CS && y >= 0 && y < H) d[(y * CS + z) * CS + x] = id; };
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = x0 + x, wz = z0 + z, C = column(wx, wz), h = C.h; cols.push(C);
      for (let y = 0; y <= Math.max(h, SEA); y++) {
        let id = 0;
        if (y === 0) id = B.grund;
        else if (y < h - 3) id = B.stein;
        else if (y < h) id = C.biome === 'wueste' || C.beach ? (y < h - 2 ? B.sandstein : B.sand) : C.biome === 'gipfel' || C.biome === 'berg' ? B.stein : B.erde;
        else if (y === h) id = C.beach ? (h < SEA - 2 ? B.kies : B.sand) : C.biome === 'wueste' ? B.sand : C.biome === 'schnee' || C.biome === 'gipfel' ? B.schnee : C.biome === 'berg' ? (hash3(wx, y, wz, SEED) < 0.5 ? B.stein : B.gras) : h < SEA ? (hash3(wx, 1, wz, SEED) < 0.5 ? B.sand : B.kies) : B.gras;
        else if (y <= SEA) id = y === SEA && C.biome === 'schnee' ? B.eis : B.wasser;
        // Höhlen: zwei 3D-Rauschwerte nahe null ergeben lange Gänge
        if (id && id !== B.wasser && id !== B.eis && y > 2 && y < h - 1 + (h > SEA + 2 ? 2 : 0)) {
          const a = N.n3(wx / 28, y / 18, wz / 28), b = N.n3(wx / 28 + 91, y / 18, wz / 28 - 37);
          if (a * a + b * b < 0.011 * (y < 10 ? 0.6 : 1)) id = 0;
        }
        if (id === B.stein) { const r = hash3(wx, y, wz, SEED + 7); if (y < 70 && r < 0.012) id = B.kohle; else if (y < 44 && r > 0.993) id = B.eisen; }
        d[(y * CS + z) * CS + x] = id;
      }
    }
    // Pflanzen, Bäume und Kakteen (auch aus Nachbar-Chunks hereinragend)
    for (let z = -3; z < CS + 3; z++) for (let x = -3; x < CS + 3; x++) {
      const wx = x0 + x, wz = z0 + z, inside = x >= 0 && x < CS && z >= 0 && z < CS;
      const C = inside ? cols[z * CS + x] : column(wx, wz), h = C.h; if (h <= SEA || C.beach) continue;
      const r = hash3(wx, 0, wz, SEED + 3), top = inside ? d[(h * CS + z) * CS + x] : -1;
      if (inside && top !== B.gras && top !== B.sand && top !== B.schnee) continue;
      if (C.biome === 'wueste') { if (r < 0.006 && inside) { const n = 2 + Math.floor(hash3(wx, 1, wz, SEED) * 2); for (let i = 1; i <= n; i++) set(x, h + i, z, B.kaktus); } continue; }
      const treeP = C.biome === 'wald' ? 0.045 : C.biome === 'schnee' ? 0.02 : C.biome === 'wiese' ? 0.005 : C.biome === 'berg' ? 0.01 : 0;
      if (r < treeP) {
        const spruce = C.biome === 'schnee' || C.biome === 'berg', th = (spruce ? 6 : 4) + Math.floor(hash3(wx, 2, wz, SEED) * 3);
        for (let i = 1; i <= th; i++) set(x, h + i, z, spruce ? B.fstamm : B.stamm);
        if (inside) set(x, h, z, B.erde);
        if (spruce) {
          for (let i = 2; i <= th + 1; i++) { const rad = i > th ? 0 : Math.max(1, Math.min(2, Math.floor((th - i) / 2) + 1)) - (i % 2 === 0 ? 0 : 1) + 1; for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) if (Math.abs(dx) + Math.abs(dz) <= rad + 0.5 && (dx || dz || i > th)) set(x + dx, h + i, z + dz, B.fnadel); }
          set(x, h + th + 2, z, B.fnadel);
        } else {
          for (let i = th - 2; i <= th + 1; i++) { const rad = i >= th ? 1 : 2; for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
            if (rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && hash3(wx + dx, h + i, wz + dz, SEED) < 0.6) continue;
            if (i === th + 1 && Math.abs(dx) + Math.abs(dz) > 1) continue;
            if ((dx || dz || i > th) && !(x + dx >= 0 && x + dx < CS && z + dz >= 0 && z + dz < CS && d[((h + i) * CS + z + dz) * CS + x + dx])) set(x + dx, h + i, z + dz, B.blatt); } }
        }
        continue;
      }
      if (!inside || top !== B.gras) continue;
      if (r > 0.86) set(x, h + 1, z, B.halm);
      else if (r > 0.845) set(x, h + 1, z, C.biome === 'wald' ? B.blumeb : hash3(wx, 5, wz, SEED) < 0.5 ? B.blumer : B.blumeg);
    }
    return d;
  }

  /* ================= Bildatlas (eigene Pixelgrafik) ================= */
  const AT = 16, TILES = 16; let atlas = null;
  function makeAtlas() {
    const c = document.createElement('canvas'); c.width = c.height = AT * TILES; const g = c.getContext('2d'); const img = g.createImageData(c.width, c.height);
    const px = (t, x, y, r, gg, b, a = 255) => { const X = (t % TILES) * AT + x, Y = Math.floor(t / TILES) * AT + y, i = (Y * c.width + X) * 4; img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = a; };
    const R = (t, x, y, k = 0) => hash3(x, y, t * 31 + k, 99);
    const cl = v => Math.max(0, Math.min(255, Math.round(v)));
    let fill54 = null, fill61 = null;
    const fill = (t, f) => { for (let y = 0; y < AT; y++) for (let x = 0; x < AT; x++) { const o = f(x, y, R(t, x, y)); if (o) px(t, x, y, cl(o[0]), cl(o[1]), cl(o[2]), o[3] ?? 255); } };
    const noisy = (base, amt) => (x, y, r) => [base[0] + (r - 0.5) * amt, base[1] + (r - 0.5) * amt, base[2] + (r - 0.5) * amt];
    const dirt = (x, y, r) => { const v = (r - 0.5) * 30, dark = R(3, x >> 1, y >> 1, 5) < 0.18 ? -22 : 0; return [128 + v + dark, 88 + v * 0.8 + dark, 58 + v * 0.6 + dark]; };
    const stone = (x, y, r) => { const blot = R(4, x >> 2, y >> 1, 2) < 0.3 ? -16 : 0, v = (r - 0.5) * 22 + blot; return [126 + v, 126 + v, 130 + v]; };
    fill(1, (x, y, r) => { const v = (r - 0.5) * 34, l = R(1, x >> 1, y, 3) < 0.25 ? 14 : 0; return [86 + v * 0.6 + l, 158 + v + l, 62 + v * 0.5]; });
    fill(2, (x, y, r) => { const edge = 3 + (R(2, x, 0, 9) < 0.5 ? 1 : 0) + (R(2, x, 1, 9) < 0.25 ? 1 : 0); if (y < edge) { const v = (r - 0.5) * 30; return [86 + v * 0.6, 156 + v, 62 + v * 0.5]; } return dirt(x, y, r); });
    fill(3, dirt); fill(4, stone);
    fill(5, (x, y, r) => { const v = (r - 0.5) * 26; return [222 + v, 206 + v, 150 + v * 0.8]; });
    fill(6, (x, y, r) => { const w = Math.sin((x + y * 0.5) * 0.8) * 0.5 + 0.5, v = (r - 0.5) * 14; return [44 + w * 30 + v, 110 + w * 40 + v, 210 + w * 25, 190]; });
    fill(7, (x, y, r) => { const s = (x % 4 === 0 ? -26 : 0) + (r - 0.5) * 22; return [108 + s, 78 + s * 0.8, 48 + s * 0.6]; });
    fill(8, (x, y, r) => { const d = Math.hypot(x - 7.5, y - 7.5), ring = Math.sin(d * 1.8) * 14; if (d > 7) return [104 + (r - 0.5) * 20, 76 + (r - 0.5) * 16, 46]; return [176 + ring + (r - 0.5) * 12, 142 + ring, 92 + ring * 0.6]; });
    fill(9, (x, y, r) => { if (R(9, x, y, 1) < 0.2) return [0, 0, 0, 0]; const v = (r - 0.5) * 40; return [52 + v * 0.5, 128 + v, 46 + v * 0.4]; });
    fill(10, (x, y, r) => { const v = (r - 0.5) * 14; return [238 + v, 244 + v, 252, 255]; });
    fill(11, (x, y, r) => { const v = (r - 0.5) * 70; return [58 + v, 56 + v, 60 + v]; });
    fill(12, (x, y, r) => { const o = R(12, x >> 1, y >> 1, 4) < 0.22; return o ? [34 + r * 20, 32 + r * 20, 34 + r * 20] : stone(x, y, r); });
    fill(13, (x, y, r) => { const o = R(13, x >> 1, y >> 1, 4) < 0.18; return o ? [214 + r * 30, 160 + r * 30, 116 + r * 20] : stone(x, y, r); });
    fill(14, (x, y, r) => { const seam = y % 4 === 3 || (x === ((y >> 2) % 2 ? 4 : 11) && y % 4 !== 3); const v = (r - 0.5) * 18 + (seam ? -40 : 0); return [176 + v, 132 + v, 82 + v * 0.7]; });
    fill(15, (x, y, r) => { const edge = x === 0 || y === 0 || x === 15 || y === 15, streak = (x - y === 3 || x - y === 4) && x > 4 && x < 13; return edge ? [214, 236, 246, 230] : streak ? [255, 255, 255, 150] : [200, 230, 245, 40]; });
    fill(16, (x, y, r) => { const row = y >> 2, mortar = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 7; const v = (r - 0.5) * 22; return mortar ? [196 + v, 188 + v, 176 + v] : [168 + v, 70 + v * 0.6, 54 + v * 0.5]; });
    fill(17, (x, y, r) => { const cx = Math.floor((x + (y >> 2) % 2 * 2) / 5), cy = y >> 2, e = (x + (y >> 2) % 2 * 2) % 5 === 4 || y % 4 === 3; const v = (R(17, cx, cy, 1) - 0.5) * 30 + (r - 0.5) * 14 + (e ? -38 : 0); return [128 + v, 128 + v, 132 + v]; });
    fill(18, (x, y, r) => { const stripe = x % 4 === 1 ? -26 : 0, dot = (x % 4 === 1 && y % 5 === 2) ? 60 : 0, v = (r - 0.5) * 18 + stripe; return [62 + v + dot, 146 + v + dot, 60 + v + dot * 0.6]; });
    fill(19, (x, y, r) => { const edge = x < 1 || x > 14 || y < 1 || y > 14, v = (r - 0.5) * 16; return edge ? [62 + v, 140 + v, 58] : [98 + v, 168 + v, 86 + v]; });
    fill(20, (x, y, r) => { const b = R(20, x >> 1, y >> 1, 3), v = (r - 0.5) * 40; return [255, 196 + b * 50 + v * 0.4, 96 + b * 80 + v]; });
    fill(21, (x, y, r) => { const band = Math.floor(y / 4) % 2 ? -14 : 0, v = (r - 0.5) * 14 + band; return [214 + v, 196 + v, 140 + v]; });
    fill(22, (x, y, r) => { const v = (r - 0.5) * 14, e = x === 0 || y === 0 || x === 15 || y === 15 ? -18 : 0; return [222 + v + e, 206 + v + e, 150 + v + e]; });
    fill(23, (x, y, r) => { const crack = (x * 3 + y * 5) % 17 === 0 ? 30 : 0, v = (r - 0.5) * 14; return [170 + v + crack, 212 + v + crack, 250]; });
    const wool = (cr, cg, cb) => (x, y, r) => { const v = (r - 0.5) * 22 + (((x + y) % 4 === 0) ? -8 : 0); return [cr + v, cg + v, cb + v]; };
    fill(24, wool(232, 232, 228)); fill(25, wool(196, 52, 50)); fill(26, wool(236, 196, 52)); fill(27, wool(52, 86, 196));
    const flower = (pr, pg, pb) => (x, y) => { const stem = x === 7 && y > 7, leafL = (x === 6 && y === 11) || (x === 5 && y === 10), petal = Math.hypot(x - 7, y - 5) < 2.6 && !(x === 7 && y === 5); if (x === 7 && y === 5) return [255, 230, 120]; if (petal) return [pr, pg, pb]; if (stem || leafL) return [58, 140, 48]; return [0, 0, 0, 0]; };
    fill(28, flower(220, 50, 56)); fill(29, flower(246, 214, 60)); fill(30, flower(80, 120, 230));
    fill(31, (x, y, r) => { const blade = (x % 3 === 1) && y > 4 + R(31, x, 0, 2) * 7; return blade ? [70 + r * 40, 150 + r * 50, 56] : [0, 0, 0, 0]; });
    fill(32, (x, y, r) => { const s = R(32, x >> 1, y >> 1, 6), v = (r - 0.5) * 20; return s < 0.3 ? [96 + v, 94 + v, 92 + v] : s > 0.8 ? [168 + v, 160 + v, 150 + v] : [136 + v, 132 + v, 128 + v]; });
    fill(33, (x, y, r) => { const s = (x % 3 === 0 ? -20 : 0) + (r - 0.5) * 18; return [80 + s, 56 + s * 0.8, 36 + s * 0.6]; });
    fill(34, (x, y, r) => { if (R(34, x, y, 1) < 0.15) return [0, 0, 0, 0]; const v = (r - 0.5) * 30; return [40 + v * 0.4, 96 + v, 62 + v * 0.5]; });
    fill(35, (x, y, r) => { const e = y % 8 === 7 || x % 8 === 7 || (y % 8 === 0) || (x % 8 === 0), v = (r - 0.5) * 16 + (e ? -30 : 0); return [130 + v, 130 + v, 134 + v]; });
    // Fackel, Bett
    fill(36, (x, y) => { if (x >= 7 && x <= 8 && y >= 6 && y < 16) return y < 8 ? [60, 40, 24] : [140, 100, 60]; if (y >= 2 && y < 6 && x >= 6 && x <= 9) return y < 4 ? [255, 240, 150] : [255, 160, 40]; return [0, 0, 0, 0]; });
    fill(37, (x, y, r) => { if (y < 5) return [236 + r * 14, 236 + r * 14, 230]; const v = (r - 0.5) * 20; return [176 + v, 40 + v * 0.5, 48 + v * 0.5]; });
    fill(38, (x, y, r) => { if (y < 6) return [180 + (r - 0.5) * 20, 44, 52]; const v = (r - 0.5) * 18; return y > 12 ? [90 + v, 62 + v, 40] : [150 + v, 112 + v, 70 + v]; });
    // Wesen: Nachtwandler, Schleimer, Knochenwerfer, Schaf, Huhn
    const skin = (cr, cg, cb, amt) => (x, y, r) => { const v = (r - 0.5) * amt; return [cr + v, cg + v, cb + v]; };
    fill(52, skin(52, 78, 74, 26)); fill(53, (x, y, r) => { const eye = y >= 6 && y <= 8 && (x === 4 || x === 5 || x === 10 || x === 11); if (eye) return [255, 70, 50]; if (y === 11 && x > 4 && x < 11) return [24, 30, 30]; return skin(52, 78, 74, 26)(x, y, r); });
    fill54 = (x, y, r) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const v = (r - 0.5) * 30; return e ? [60, 150, 60, 230] : [110 + v, 210 + v, 100 + v * 0.5, 200]; };
    fill(54, (x, y, r) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const v = (r - 0.5) * 30; return e ? [60, 150, 60, 230] : [110 + v, 210 + v, 100 + v * 0.5, 200]; });
    fill(55, (x, y, r) => { if ((x === 4 || x === 11) && y >= 5 && y <= 7) return [20, 50, 20, 255]; if (y === 11 && x > 5 && x < 10) return [30, 80, 30, 255]; return fill54(x, y, r); });
    fill(56, skin(214, 210, 196, 22)); fill(57, (x, y, r) => { if (y >= 6 && y <= 7 && (x === 3 || x === 4 || x === 11 || x === 12)) return [20, 20, 24]; if ((x === 4 || x === 11) && y === 6) return [40, 40, 44]; if (y >= 12 && y <= 13 && x > 4 && x < 11) return [90, 60, 60]; return skin(214, 210, 196, 22)(x, y, r); });
    fill(58, (x, y, r) => { const wool = (R(58, x >> 1, y >> 1, 3) - 0.5) * 30; return [236 + wool, 234 + wool, 226 + wool]; });
    fill(59, skin(240, 238, 232, 16)); fill(60, (x, y, r) => { if (y >= 5 && y <= 6 && (x === 4 || x === 11)) return [16, 16, 16]; if (y >= 8 && y <= 10 && x >= 6 && x <= 9) return [240, 170, 40]; if (y >= 11 && y <= 13 && x >= 7 && x <= 8) return [220, 40, 40]; return skin(240, 238, 232, 16)(x, y, r); });
    fill61 = (x, y, r) => { const crack = (x * 7 + y * 3) % 13 === 0 ? -30 : 0, v = (r - 0.5) * 18 + crack; return [210 + v, 206 + v, 192 + v]; };
    fill(61, (x, y, r) => { const crack = (x * 7 + y * 3) % 13 === 0 ? -30 : 0, v = (r - 0.5) * 18 + crack; return [210 + v, 206 + v, 192 + v]; });
    fill(62, (x, y, r) => { if (y >= 5 && y <= 8 && ((x >= 3 && x <= 6) || (x >= 9 && x <= 12))) return y === 7 && (x === 5 || x === 10) ? [120, 220, 255] : [24, 22, 28]; if (y === 12 && x % 2 === 0 && x > 3 && x < 12) return [40, 36, 40]; return fill61(x, y, r); });
    fill(63, skin(222, 160, 140, 18));
    // Gegenstände als flache Bilder (Pixel-Karten: h = Griff, m = Material, w = Glanz)
    const sprite = (t, rows, pal) => fill(t, (x, y) => { const ch = (rows[y] || '')[x]; const c = ch && pal[ch]; return c ? c : [0, 0, 0, 0]; });
    const PICK = ['................', '...mmmmmmm......', '..mwwwwwmmm.....', '.mm.....hmmm....', '.m.....h..mmm...', '......h....mm...', '.....h......m...', '....h...........', '...h............', '..h.............', '.h..............', 'h...............'];
    const SWORD = ['............mmm.', '...........mwwm.', '..........mwwm..', '.........mwwm...', '........mwwm....', '.......mwwm.....', '..g...mwwm......', '..gg.mwwm.......', '...ggwwm........', '....hgg.........', '...h..gg........', '..h.............', '.h..............'];
    const AXE = ['......mmm.......', '.....mwwmm......', '....mwwwmm......', '....mmmhmm......', '.....mmh........', '......h.........', '.....h..........', '....h...........', '...h............', '..h.............', '.h..............'];
    const H = [122, 86, 50], G = [196, 160, 60];
    const MAT = { 1: [[160, 120, 72], [200, 160, 100]], 2: [[120, 120, 126], [176, 176, 182]], 3: [[208, 212, 220], [250, 252, 255]] };
    [1, 2, 3].forEach(k => { sprite(66 + k, PICK, { h: H, m: MAT[k][0], w: MAT[k][1] }); sprite(69 + k, SWORD, { h: H, m: MAT[k][0], w: MAT[k][1], g: G }); });
    sprite(73, AXE, { h: H, m: MAT[2][0], w: MAT[2][1] });
    fill(64, (x, y) => (Math.abs(x - (15 - y)) <= 0 && y > 1 && y < 15 ? [130, 92, 56] : Math.abs(x - (15 - y)) === 1 && y > 1 && y < 15 && x > y - 2 ? [96, 66, 40] : [0, 0, 0, 0]));
    fill(65, (x, y, r) => (Math.hypot(x - 7.5, y - 8) < 5.2 + (R(65, x, y, 2) - 0.5) * 1.5 ? [30 + r * 30, 30 + r * 30, 34 + r * 30] : [0, 0, 0, 0]));
    fill(66, (x, y, r) => { if (y < 5 || y > 11 || x < 2 || x > 13) return [0, 0, 0, 0]; const top = y < 7 && x > 3 && x < 12; return top ? [244, 244, 248] : [196 + r * 20, 198 + r * 20, 206 + r * 20]; });
    fill(74, (x, y) => { if (x === 8 && y >= 1 && y <= 3) return [100, 70, 40]; if (y === 2 && (x === 9 || x === 10)) return [70, 160, 60]; const d = Math.hypot(x - 7.5, y - 9); return d < 5.5 ? (x < 6 && y < 8 ? [255, 140, 130] : [210, 40, 40]) : [0, 0, 0, 0]; });
    fill(75, (x, y) => { const d = Math.hypot((x - 7) / 1.2, y - 8); if (d < 5) return d < 2 ? [250, 220, 220] : [220, 90, 100]; if (x > 10 && x < 15 && Math.abs(y - 10) < 1) return [240, 236, 220]; return [0, 0, 0, 0]; });
    fill(76, (x, y) => { const d = Math.hypot((x - 7) / 1.2, y - 8); if (d < 5) return d < 2 ? [210, 160, 110] : [150, 86, 40]; if (x > 10 && x < 15 && Math.abs(y - 10) < 1) return [240, 236, 220]; return [0, 0, 0, 0]; });
    fill(77, (x, y) => { const on = Math.abs(x - y) <= 2 && x > 2 && y > 2 && x < 14 && y < 14; return on ? (x === y ? [190, 190, 190] : [246, 246, 246]) : [0, 0, 0, 0]; });
    fill(78, (x, y) => { const shaft = Math.abs(x - y) <= 1 && x > 3 && x < 12; const knob = Math.hypot(x - 3, y - 3) < 2.2 || Math.hypot(x - 12, y - 12) < 2.2; return shaft || knob ? [236, 232, 214] : [0, 0, 0, 0]; });
    fill(79, (x, y, r) => { const d = Math.hypot(x - 7.5, y - 8.5); return d < 5 ? (d < 2 && x < 8 ? [200, 255, 190] : [100 + r * 30, 200 + r * 30, 90]) : [0, 0, 0, 0]; });
    // Himmelskörper und Markierung
    fill(48, (x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 7.5 ? [255, 244, 190, 255] : [0, 0, 0, 0]; });
    fill(49, (x, y, r) => { const d = Math.hypot(x - 7.5, y - 7.5); return d < 7 ? [216 + r * 20, 220 + r * 20, 236, 255] : [0, 0, 0, 0]; });
    fill(50, () => [255, 255, 255, 255]);
    g.putImageData(img, 0, 0);
    return c;
  }
  const tileUV = t => [(t % TILES) / TILES, Math.floor(t / TILES) / TILES];

  /* ================= WebGL ================= */
  let gl, prog, loc = {}, tex, cloudTex, cv;
  const VS = `attribute vec3 a_p; attribute vec2 a_uv; attribute float a_l;
    uniform mat4 u_mvp; uniform vec3 u_cam; uniform vec2 u_uvoff;
    varying vec2 v_uv; varying float v_l; varying float v_d;
    void main(){ v_uv=a_uv+u_uvoff; v_l=a_l; v_d=length(a_p-u_cam); gl_Position=u_mvp*vec4(a_p,1.0); }`;
  const FS = `precision mediump float; uniform sampler2D u_tex; uniform float u_day; uniform vec3 u_fog; uniform vec2 u_fogr; uniform float u_alpha; uniform vec4 u_col; uniform float u_nofog;
    varying vec2 v_uv; varying float v_l; varying float v_d;
    void main(){ vec4 c=texture2D(u_tex,v_uv); if(c.a<0.08) discard; if(u_alpha<0.5 && c.a<0.5) discard;
      float l = v_l>1.5 ? 1.0 : v_l*u_day; vec3 col = c.rgb*l*u_col.rgb;
      float f = u_nofog>0.5 ? 0.0 : smoothstep(u_fogr.x,u_fogr.y,v_d); col=mix(col,u_fog,f);
      gl_FragColor=vec4(col, (u_alpha<0.5?1.0:c.a)*u_col.a*(1.0-f*u_nofog)); }`;
  function initGL(canvas) {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
    for (const n of ['a_p', 'a_uv', 'a_l']) loc[n] = gl.getAttribLocation(prog, n);
    for (const n of ['u_mvp', 'u_cam', 'u_uvoff', 'u_tex', 'u_day', 'u_fog', 'u_fogr', 'u_alpha', 'u_col', 'u_nofog']) loc[n] = gl.getUniformLocation(prog, n);
    atlas = makeAtlas();
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Wolken: eigene, wiederholbare Textur
    const cc = document.createElement('canvas'); cc.width = cc.height = 64; const cg = cc.getContext('2d'), id = cg.createImageData(64, 64); const nz = makeNoise(77);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const a = (Math.sin(x / 64 * Math.PI * 2) + 1) / 2, v = nz.n2(Math.cos(x / 64 * 6.283) * 2 + Math.cos(y / 64 * 6.283) * 0, Math.sin(x / 64 * 6.283) * 2) * 0 + nz.n3(Math.cos(x / 64 * 6.283) * 1.6, Math.sin(x / 64 * 6.283) * 1.6, Math.cos(y / 64 * 6.283) * 1.6 + Math.sin(y / 64 * 6.283) * 1.6); const i = (y * 64 + x) * 4, on = v > 0.18 ? 255 : 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = on ? 220 : 0; void a; }
    cg.putImageData(id, 0, 0);
    cloudTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, cloudTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cc);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1i(loc.u_tex, 0);
    return true;
  }
  const STRIDE = 6 * 4;
  function bindBuf(buf) { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc.a_p); gl.vertexAttribPointer(loc.a_p, 3, gl.FLOAT, false, STRIDE, 0); gl.enableVertexAttribArray(loc.a_uv); gl.vertexAttribPointer(loc.a_uv, 2, gl.FLOAT, false, STRIDE, 12); gl.enableVertexAttribArray(loc.a_l); gl.vertexAttribPointer(loc.a_l, 1, gl.FLOAT, false, STRIDE, 20); }
  function upload(arr, old) { const b = old || gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return b; }

  /* ================= Matrizen ================= */
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; }
  function mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function view(e, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const f = [-sy * cp, sp, -cy * cp], r = [cy, 0, -sy], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const m = new Float32Array(16);
    m[0] = r[0]; m[4] = r[1]; m[8] = r[2]; m[1] = u[0]; m[5] = u[1]; m[9] = u[2]; m[2] = -f[0]; m[6] = -f[1]; m[10] = -f[2];
    m[12] = -(r[0] * e[0] + r[1] * e[1] + r[2] * e[2]); m[13] = -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]); m[14] = f[0] * e[0] + f[1] * e[1] + f[2] * e[2]; m[15] = 1;
    return m;
  }

  /* ================= Chunks ================= */
  const chunks = new Map(); let edits = {};
  const ck = (cx, cz) => cx + ',' + cz;
  function getChunk(cx, cz) { return chunks.get(ck(cx, cz)); }
  function ensureData(cx, cz) {
    let c = getChunk(cx, cz); if (c && c.data) return c;
    if (!c) { c = { cx, cz, data: null, top: null, mesh: null, dirty: true }; chunks.set(ck(cx, cz), c); }
    c.data = genChunk(cx, cz);
    const E = edits[ck(cx, cz)]; if (E) for (const k in E) c.data[+k] = E[k];
    c.top = new Uint8Array(CS * CS); for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) colTop(c, x, z);
    return c;
  }
  function colTop(c, x, z) { let y = H - 1; while (y > 0 && !blocksSky(c.data[(y * CS + z) * CS + x])) y--; c.top[z * CS + x] = y; }
  const blocksSky = id => id && BL[id].op;
  const getBW = (x, y, z) => getB(x, y, z);
  function getB(x, y, z) {
    if (y < 0) return B.grund; if (y >= H) return 0;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS), c = chunks.get(cx + ',' + cz);
    if (!c || !c.data) return 0;
    return c.data[(y * CS + (z - cz * CS)) * CS + (x - cx * CS)];
  }
  function topAt(x, z) { const cx = Math.floor(x / CS), cz = Math.floor(z / CS), c = chunks.get(cx + ',' + cz); if (!c || !c.top) return 0; return c.top[(z - cz * CS) * CS + (x - cx * CS)]; }
  function setB(x, y, z, id) {
    if (y < 1 || y >= H) return false;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS), c = getChunk(cx, cz); if (!c || !c.data) return false;
    const lx = x - cx * CS, lz = z - cz * CS, i = (y * CS + lz) * CS + lx;
    c.data[i] = id; (edits[ck(cx, cz)] = edits[ck(cx, cz)] || {})[i] = id; dirtySave = true;
    colTop(c, lx, lz); c.dirty = true;
    const mark = (dx, dz) => { const n = getChunk(cx + dx, cz + dz); if (n) n.dirty = true; };
    if (lx === 0) mark(-1, 0); if (lx === CS - 1) mark(1, 0); if (lz === 0) mark(0, -1); if (lz === CS - 1) mark(0, 1);
    if (lx === 0 && lz === 0) mark(-1, -1); if (lx === CS - 1 && lz === CS - 1) mark(1, 1); if (lx === 0 && lz === CS - 1) mark(-1, 1); if (lx === CS - 1 && lz === 0) mark(1, -1);
    return true;
  }
  // Flächen eines Würfels: Richtung, Tangenten u/v, welche Textur (0 oben, 1 Seite, 2 unten), Grundhelligkeit
  const FACES = [
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], t: 0, s: 1.0 }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], t: 2, s: 0.5 },
    { n: [1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], t: 1, s: 0.78 }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], t: 1, s: 0.78 },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], t: 1, s: 0.88 }, { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], t: 1, s: 0.66 },
  ];
  const OPQ = new Uint8Array(256); BL.forEach(b => { if (b) OPQ[b.id] = b.op ? 1 : 0; });
  function meshChunk(c) {
    const op = [], wa = [], x0 = c.cx * CS, z0 = c.cz * CS, d = c.data, E = 1 / TILES, eps = 0.0008, ctop = c.top;
    const getB = (x, y, z) => { if (y < 0) return B.grund; if (y >= H) return 0; const lx = x - x0, lz = z - z0; if (lx >= 0 && lx < CS && lz >= 0 && lz < CS) return d[(y * CS + lz) * CS + lx]; return getBW(x, y, z); };
    const aoOcc = (x, y, z) => OPQ[getB(x, y, z)];
    const skyLight = (x, y, z) => { const lx = x - x0, lz = z - z0, t = lx >= 0 && lx < CS && lz >= 0 && lz < CS ? ctop[lz * CS + lx] : topAt(x, z); if (y > t) return 1; const dd = t - y; return Math.max(0.3, 0.72 - dd * 0.035); };
    let maxY = H - 1; while (maxY > 0) { let any = false; const o = maxY * CS * CS; for (let i = 0; i < CS * CS; i++) if (d[o + i]) { any = true; break; } if (any) break; maxY--; }
    const quad = (out, P, uvs, L, flip) => { const ord = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3]; for (const k of ord) { const p = P[k]; out.push(p[0], p[1], p[2], uvs[k][0], uvs[k][1], L[k]); } };
    for (let y = 0; y <= maxY; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const id = d[(y * CS + z) * CS + x]; if (!id) continue; const b = BL[id], wx = x0 + x, wz = z0 + z;
      if (b.cross) {
        const [u0, v0] = tileUV(b.tex[0]), L = skyLight(wx, y, wz) * 0.95, u1 = u0 + E - eps, v1 = v0 + E - eps, a = u0 + eps, bb = v0 + eps;
        for (const [ax, az, bx, bz] of [[0.15, 0.15, 0.85, 0.85], [0.15, 0.85, 0.85, 0.15]]) quad(op, [[wx + ax, y, wz + az], [wx + bx, y, wz + bz], [wx + bx, y + 1, wz + bz], [wx + ax, y + 1, wz + az]], [[a, v1], [u1, v1], [u1, bb], [a, bb]], [L, L, L, L]);
        continue;
      }
      for (const F of FACES) {
        const nx = wx + F.n[0], ny = y + F.n[1], nz = wz + F.n[2], nid = getB(nx, ny, nz), nb = BL[nid];
        if (b.water) { if (nid === B.wasser || (nb.op && F.n[1] !== 1) || (nb.op && nid)) continue; }
        else if (nb.op || (nid === id && (b.alpha || b.water))) continue;
        if (ny < 0) continue;
        const [tu, tv] = tileUV(b.tex[F.t]), out = b.water ? wa : op;
        const sky = b.glow ? 2 : skyLight(nx, Math.min(ny, H - 1), nz);
        const P = [], UV = [], L = [], ao = [];
        const top = b.water && F.n[1] === 1 && getB(wx, y + 1, wz) !== B.wasser ? 0.875 : 1;
        for (const [cu, cv] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
          const base = [wx, y, wz];
          for (let k = 0; k < 3; k++) base[k] += (F.n[k] > 0 ? 1 : 0) + F.u[k] * cu + F.v[k] * cv;
          if (b.water && base[1] > y + 0.5) base[1] = y + top;
          P.push(base);
          // Texturkoordinaten: Seitenflächen stehen aufrecht (v nach oben = Bild nach oben)
          const vert = F.v[1] === 1; UV.push([tu + (cu ? E - eps : eps), tv + (vert ? (cv ? eps : E - eps) : (cv ? E - eps : eps))]);
          let a = 3;
          if (!b.water && !b.glow) { const su = cu ? 1 : -1, sv = cv ? 1 : -1;
            const s1 = aoOcc(nx + F.u[0] * su, ny + F.u[1] * su, nz + F.u[2] * su), s2 = aoOcc(nx + F.v[0] * sv, ny + F.v[1] * sv, nz + F.v[2] * sv), co = aoOcc(nx + F.u[0] * su + F.v[0] * sv, ny + F.u[1] * su + F.v[1] * sv, nz + F.u[2] * su + F.v[2] * sv);
            a = s1 && s2 ? 0 : 3 - s1 - s2 - co; }
          ao.push(a); L.push(b.glow ? 2 : F.s * sky * (0.5 + a / 6));
        }
        quad(out, P, UV, L, ao[0] + ao[2] < ao[1] + ao[3]);
      }
    }
    c.mesh = c.mesh || {};
    c.mesh.op = upload(new Float32Array(op), c.mesh.op); c.mesh.opN = op.length / 6;
    c.mesh.wa = upload(new Float32Array(wa), c.mesh.wa); c.mesh.waN = wa.length / 6;
    c.dirty = false;
  }
  function freeChunk(c) { if (c.mesh) { gl.deleteBuffer(c.mesh.op); gl.deleteBuffer(c.mesh.wa); } chunks.delete(ck(c.cx, c.cz)); }

  /* ================= Spielzustand ================= */
  const SAVE_KEY = 'wuerfelwelt.v1';
  let W = null, dirtySave = false;
  const P = { x: 0.5, y: 60, z: 0.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, ground: false, fly: false, hp: 20, food: 20, air: 10, fallStart: null, inWater: false, headWater: false };
  function newWorld(seed, mode) {
    W = { seed, mode, time: 0.3, inv: {}, hot: ['gras', 'erde', 'stein', 'bretter', 'stamm', 'glas', 'ziegel', 'leucht', 'sand'], sel: 0, pos: null };
    if (mode === 'ueberleben') W.hot = [null, null, null, null, null, null, null, null, null];
    edits = {};
  }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.seed) { W = s.W; edits = s.edits || {}; return true; } } catch {} return false; }
  function save() { if (!W) return; W.pos = { x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch, fly: P.fly, hp: P.hp, food: P.food }; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ seed: W.seed, W, edits })); dirtySave = false; } catch { toast('Speicher voll – Welt konnte nicht gespeichert werden'); } }
  function startWorld() {
    SEED = W.seed; N = makeNoise(SEED);
    for (const c of [...chunks.values()]) freeChunk(c);
    if (W.pos) Object.assign(P, { x: W.pos.x, y: W.pos.y, z: W.pos.z, yaw: W.pos.yaw, pitch: W.pos.pitch, fly: !!W.pos.fly && W.mode === 'kreativ', hp: W.pos.hp || 20, food: W.pos.food ?? 20 });
    else { const s = findSpawn(); Object.assign(P, { x: s[0] + 0.5, y: s[1] + 1.01, z: s[2] + 0.5, yaw: 0, pitch: -0.2, fly: false, hp: 20, food: 20 }); W.spawn = s; }
    P.vx = P.vy = P.vz = 0; P.air = 10; P.fallStart = null; MOBS.length = 0; SHOTS.length = 0;
    // Chunk unter dem Spieler sofort erzeugen, damit er nicht fällt
    const pcx = Math.floor(P.x / CS), pcz = Math.floor(P.z / CS);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) ensureData(pcx + dx, pcz + dz);
    while (collides(P.x, P.y, P.z) && P.y < H) P.y += 1;
    hud();
  }
  function findSpawn() {
    for (let r = 0; r < 400; r += 8) for (let a = 0; a < 8; a++) { const x = Math.round(Math.cos(a * 0.785) * r), z = Math.round(Math.sin(a * 0.785) * r), C = column(x, z); if (C.h > SEA + 1 && C.biome !== 'gipfel') return [x, C.h + 1, z]; }
    return [0, H - 10, 0];
  }

  /* ================= Physik ================= */
  const PW = 0.3, PH = 1.8, EYE = 1.62;
  function collides(x, y, z) { for (let by = Math.floor(y); by <= Math.floor(y + PH - 0.001); by++) for (let bz = Math.floor(z - PW); bz <= Math.floor(z + PW - 0.001); bz++) for (let bx = Math.floor(x - PW); bx <= Math.floor(x + PW - 0.001); bx++) if (isSolid(getB(bx, by, bz))) return true; return false; }
  function moveAxis(axis, d) {
    if (!d) return false; const steps = Math.ceil(Math.abs(d) / 0.25), s = d / steps;
    for (let i = 0; i < steps; i++) { const np = { x: P.x, y: P.y, z: P.z }; np[axis] += s; if (collides(np.x, np.y, np.z)) return true; P[axis] = np[axis]; }
    return false;
  }
  const keys = {}; const touch = { mx: 0, mz: 0, jump: false, down: false, mine: false };
  let mining = null, autoJumpT = 0;
  function physics(dt) {
    const ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + touch.mx, iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + touch.mz;
    const len = Math.hypot(ix, iz) || 1, sprint = keys.ShiftLeft && !P.fly ? false : keys.ControlLeft || (keys.KeyW && keys.ShiftRight);
    const feet = getB(Math.floor(P.x), Math.floor(P.y + 0.1), Math.floor(P.z)), head = getB(Math.floor(P.x), Math.floor(P.y + EYE), Math.floor(P.z));
    P.inWater = BL[feet].water || BL[getB(Math.floor(P.x), Math.floor(P.y + 0.9), Math.floor(P.z))].water; P.headWater = BL[head].water;
    const speed = P.fly ? (sprint ? 20 : 11) : P.inWater ? 2.6 : sprint ? 5.8 : 4.3, sneak = !P.fly && keys.ShiftLeft;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    const mag = Math.min(1, Math.hypot(ix, iz));
    const wx = (rx * ix + fx * iz) / len * mag * speed * (sneak ? 0.35 : 1), wz = (rz * ix + fz * iz) / len * mag * speed * (sneak ? 0.35 : 1);
    const acc = P.ground || P.fly || P.inWater ? 14 : 3;
    P.vx += (wx - P.vx) * Math.min(1, acc * dt); P.vz += (wz - P.vz) * Math.min(1, acc * dt);
    const up = keys.Space || touch.jump, down = keys.ShiftLeft || touch.down;
    if (P.fly) { P.vy += (((up ? 1 : 0) - (down ? 1 : 0)) * speed - P.vy) * Math.min(1, 10 * dt); }
    else if (P.inWater) { P.vy -= 10 * dt; if (up) P.vy = Math.min(P.vy + 26 * dt, 3.2); P.vy = Math.max(P.vy, -3); }
    else { P.vy -= 28 * dt; P.vy = Math.max(P.vy, -40); if (up && P.ground) { P.vy = 8.6; P.ground = false; } }
    // Automatisch hüpfen auf dem Handy, wenn eine Stufe im Weg ist
    if (autoJumpT > 0) autoJumpT -= dt;
    const ox = P.x, oz = P.z;
    // Schleichen: nicht von Kanten fallen
    let hitX = moveAxis('x', P.vx * dt); if (sneak && P.ground && !collides(P.x, P.y - 0.1, P.z)) { P.x = ox; hitX = true; }
    let hitZ = moveAxis('z', P.vz * dt); if (sneak && P.ground && !collides(P.x, P.y - 0.1, P.z)) { P.z = oz; hitZ = true; }
    if (hitX) P.vx = 0; if (hitZ) P.vz = 0;
    if ((hitX || hitZ) && P.ground && !P.fly && isTouch && autoJumpT <= 0 && mag > 0.3 && !collides(P.x + Math.sign(wx) * 0.4, P.y + 1.05, P.z + Math.sign(wz) * 0.4)) { P.vy = 8.6; P.ground = false; autoJumpT = 0.4; }
    const vy = P.vy * dt, hitY = moveAxis('y', vy);
    if (hitY) { if (P.vy < 0) { if (!P.ground && P.fallStart != null && W.mode === 'ueberleben') { const fall = P.fallStart - P.y; if (fall > 3.5) hurt(Math.floor(fall - 3)); } P.ground = true; P.fallStart = null; if (P.fly && W.mode === 'kreativ' && down) P.fly = false; } P.vy = 0; }
    else { P.ground = false; if (P.vy < 0 && P.fallStart == null) P.fallStart = P.y; }
    if (P.inWater || P.fly) P.fallStart = null;
    if (P.y < -20) { P.y = H; P.vy = 0; }
    // Luft unter Wasser (Überleben)
    if (W.mode === 'ueberleben') {
      if (P.headWater) { P.air -= dt; if (P.air < 0) { P.air += 1; hurt(2); } } else P.air = Math.min(10, P.air + dt * 3);
      const moving = Math.hypot(P.vx, P.vz) > 1;
      P.food = Math.max(0, P.food - dt * (moving ? (sprint ? 1 / 12 : 1 / 30) : 1 / 60));
      regen += dt;
      if (P.food >= 16 && regen > 2.5 && P.hp < 20) { regen = 0; P.hp++; P.food = Math.max(0, P.food - 0.4); hud(); }
      else if (P.food <= 0 && regen > 4) { regen = 0; if (P.hp > 2) hurt(1); }
    }
  }
  let regen = 0;
  function hurt(n) { if (W.mode !== 'ueberleben' || n <= 0) return; P.hp -= n; flash = 0.35; sfx('hurt'); if (P.hp <= 0) { P.hp = 20; P.food = Math.max(P.food, 14); const s = W.spawn || findSpawn(); P.x = s[0] + 0.5; P.y = s[1] + 1.5; P.z = s[2] + 0.5; P.vx = P.vy = P.vz = 0; for (let i = MOBS.length - 1; i >= 0; i--) if (MOBS[i].hostile && Math.hypot(MOBS[i].x - P.x, MOBS[i].z - P.z) < 20) MOBS.splice(i, 1); toast(W.bed ? 'Du bist gestorben und in deinem Bett aufgewacht. Deine Sachen hast du noch.' : 'Du bist gestorben und am Startpunkt wieder aufgewacht. Deine Sachen hast du noch.'); } hud(); }
  let flash = 0;

  /* ================= Zielen, Abbauen, Bauen ================= */
  function raycast(maxD = 6) {
    const e = [P.x, P.y + EYE, P.z], cp = Math.cos(P.pitch), dir = [-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp];
    let x = Math.floor(e[0]), y = Math.floor(e[1]), z = Math.floor(e[2]); const st = dir.map(v => (v > 0 ? 1 : -1));
    const tD = dir.map(v => Math.abs(1 / (v || 1e-9))); const tM = [0, 1, 2].map(k => { const p = e[k], c = [x, y, z][k]; return (dir[k] > 0 ? c + 1 - p : p - c) * tD[k]; });
    let face = null, t = 0;
    while (t <= maxD) {
      const id = getB(x, y, z);
      if (id && !BL[id].water) return { x, y, z, id, face };
      if (tM[0] < tM[1] && tM[0] < tM[2]) { x += st[0]; t = tM[0]; tM[0] += tD[0]; face = [-st[0], 0, 0]; }
      else if (tM[1] < tM[2]) { y += st[1]; t = tM[1]; tM[1] += tD[1]; face = [0, -st[1], 0]; }
      else { z += st[2]; t = tM[2]; tM[2] += tD[2]; face = [0, 0, -st[2]]; }
    }
    return null;
  }
  const selKey = () => W.hot[W.sel];
  const held = () => { const k = selKey(); return k && ITEMS[k] ? ITEMS[k] : null; };
  const survival = () => W.mode === 'ueberleben';
  function takeOne(k) { W.inv[k]--; if (W.inv[k] <= 0) { delete W.inv[k]; const i = W.hot.indexOf(k); if (i >= 0) W.hot[i] = null; } }
  // Was ein Block beim Abbauen hergibt (im Überlebensmodus)
  function dropsOf(b) {
    const h = held(), pt = h && h.pick || 0;
    if (b.pick && pt < b.pick) return [];
    if (b.key === 'halm') return Math.random() < 0.12 ? [['apfel', 1]] : [];
    if (b.key === 'blatt' || b.key === 'fnadel') { const o = []; if (Math.random() < 0.3) o.push([b.key, 1]); if (b.key === 'blatt' && Math.random() < 0.07) o.push(['apfel', 1]); if (Math.random() < 0.08) o.push(['stock', 1]); return o; }
    return [[b.drop || b.key, 1]];
  }
  function breakAt(h) {
    const b = BL[h.id]; if (b.hard > 1e6) return;
    if (survival()) for (const [k, n] of dropsOf(b)) giveItem(k, n);
    setB(h.x, h.y, h.z, 0); sfx('break', h.id);
    if (b.key === 'bett' && W.bed && W.bed[0] === h.x && W.bed[1] === h.y && W.bed[2] === h.z) W.bed = null;
    // Pflanzen und Fackeln auf dem abgebauten Block fallen mit
    const above = getB(h.x, h.y + 1, h.z); if (BL[above].cross) { if (survival() && BL[above].key !== 'halm') giveItem(BL[above].key, 1); setB(h.x, h.y + 1, h.z, 0); }
  }
  function place() {
    const k = selKey();
    // Essen
    if (k && ITEMS[k] && ITEMS[k].food && survival()) { if (P.food >= 20) { toast('Du bist satt.'); return; } if (W.inv[k] > 0) { P.food = Math.min(20, P.food + ITEMS[k].food); takeOne(k); sfx('eat'); swing = 1; hud(); } return; }
    const h = raycast();
    // Schlafen im Bett
    if (h && h.id === B.bett) { sleep(h); return; }
    if (!h || !h.face || !k || isItem(k)) return;
    if (survival() && !(W.inv[k] > 0)) return;
    const id = B[k], x = h.x + h.face[0], y = h.y + h.face[1], z = h.z + h.face[2];
    const cur = getB(x, y, z); if (cur && !BL[cur].water && !BL[cur].cross) return;
    if (BL[id].cross) { const below = getB(x, y - 1, z); if (BL[id].torch ? !BL[below].solid : below !== B.gras && below !== B.erde) return; }
    if (isSolid(id)) { const minX = P.x - PW, maxX = P.x + PW, minZ = P.z - PW, maxZ = P.z + PW; if (x + 1 > minX && x < maxX && z + 1 > minZ && z < maxZ && y + 1 > P.y && y < P.y + PH) return; for (const m of MOBS) if (x + 1 > m.x - m.w && x < m.x + m.w && z + 1 > m.z - m.w && z < m.z + m.w && y + 1 > m.y && y < m.y + m.h) return; }
    if (setB(x, y, z, id)) { if (survival()) takeOne(k); sfx('place', id); hud(); swing = 1; }
  }
  function sleep(h) {
    const night = dayLight() < 0.35;
    W.bed = [h.x, h.y, h.z]; W.spawn = [h.x, h.y + 1, h.z];
    if (!night) { toast('Startpunkt gesetzt. Schlafen kannst du nur nachts.'); return; }
    if (MOBS.some(m => m.hostile && Math.hypot(m.x - P.x, m.z - P.z) < 10)) { toast('Du kannst nicht schlafen, Monster sind in der Nähe!'); return; }
    sleepT = 1.6; toast('Gute Nacht … Startpunkt gesetzt.');
  }
  let sleepT = 0;
  function giveItem(k, n) { W.inv[k] = (W.inv[k] || 0) + n; if (!W.hot.includes(k)) { const i = W.hot.indexOf(null); if (i >= 0) W.hot[i] = k; } hud(); }
  let swing = 0;
  function mineSpeed(b) {
    const h = held(); let f = 1;
    if (b.pick) f = h && h.pick ? [1, 2, 4, 7][h.pick] : 0.3;
    else if (b.axe && h && h.axe) f = h.axe;
    return f;
  }
  function mineStep(dt, want) {
    if (want && survival()) { const m = targetMob(); if (m) { attackT -= dt; if (attackT <= 0) { attack(m); attackT = 0.45; } mining = null; return; } }
    else if (want && W.mode === 'kreativ') { const m = targetMob(); if (m) { attackT -= dt; if (attackT <= 0) { attack(m); attackT = 0.35; } mining = null; return; } }
    const h = want ? raycast() : null;
    if (!h) { mining = null; return; }
    if (W.mode === 'kreativ') { if (!mining || mining.t <= 0) { breakAt(h); mining = { t: 0.22, x: h.x, y: h.y, z: h.z }; swing = 1; } else mining.t -= dt; return; }
    if (!mining || mining.x !== h.x || mining.y !== h.y || mining.z !== h.z) mining = { x: h.x, y: h.y, z: h.z, p: 0, need: BL[h.id].hard / mineSpeed(BL[h.id]), snd: 0 };
    mining.p += dt; mining.snd -= dt; if (mining.snd <= 0) { mining.snd = 0.25; sfx('hit', h.id); swing = 1; }
    if (mining.p >= mining.need) { breakAt(h); mining = null; P.food = Math.max(0, P.food - 0.02); }
  }
  let attackT = 0;

  /* ================= Wesen: Tiere am Tag, Monster in der Nacht ================= */
  // Jedes Wesen besteht aus Quadern (Kopf, Körper, Beine). Werte: Leben, Tempo, Schaden, was es fallen lässt.
  const KINDS = {
    wandler: { name: 'Nachtwandler', hostile: true, hp: 20, speed: 2.6, dmg: 3, w: 0.3, h: 1.85, drops: [['knochen', 0.4], ['fleisch', 0.3]], tiles: { body: 52, head: 53 } },
    werfer: { name: 'Knochenwerfer', hostile: true, ranged: true, hp: 16, speed: 2.2, dmg: 2, w: 0.3, h: 1.85, drops: [['knochen', 1], ['knochen', 0.5]], tiles: { body: 61, head: 62 } },
    schleimer: { name: 'Schleimer', hostile: true, jumper: true, hp: 12, speed: 3, dmg: 2, w: 0.45, h: 0.9, drops: [['schleim', 1], ['schleim', 0.4]], tiles: { body: 54, head: 55 } },
    schaf: { name: 'Schaf', hp: 8, speed: 1.6, w: 0.45, h: 1.25, drops: [['stoffw', 1], ['fleisch', 1]], tiles: { body: 58, head: 57, leg: 56 } },
    huhn: { name: 'Huhn', hp: 4, speed: 1.8, w: 0.25, h: 0.75, drops: [['feder', 1], ['fleisch', 1]], tiles: { body: 59, head: 60, leg: 63 } },
  };
  const MOBS = [], SHOTS = [];
  let spawnT = 0;
  const dayLight = () => { const sy = Math.sin(W.time * Math.PI * 2); return Math.max(0, Math.min(1, sy * 3 + 0.35)); };
  function nearLight(x, y, z, r) { for (let dy = -3; dy <= 3; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const id = getB(x + dx, y + dy, z + dz); if (id && BL[id].glow) return true; } return false; }
  function spawnMobs(dt) {
    spawnT -= dt; if (spawnT > 0) return; spawnT = 1.2;
    const hostiles = MOBS.filter(m => m.hostile).length, animals = MOBS.length - hostiles;
    const ang = Math.random() * Math.PI * 2, dist = 16 + Math.random() * 18, x = Math.floor(P.x + Math.cos(ang) * dist), z = Math.floor(P.z + Math.sin(ang) * dist);
    const top = topAt(x, z); if (!top) return;
    const night = dayLight() < 0.3;
    // Monster: nachts an der Oberfläche oder jederzeit tief in Höhlen, nie bei Licht
    if (survival() && W.monsters !== false && hostiles < (night ? 10 : 4)) {
      let y = -1;
      if (night && Math.random() < 0.7) { if (!BL[getB(x, top, z)].water) y = top + 1; }
      else { for (let t = 0; t < 6 && y < 0; t++) { const yy = 4 + Math.floor(Math.random() * Math.max(1, top - 10)); if (!getB(x, yy, z) && !getB(x, yy + 1, z) && isSolid(getB(x, yy - 1, z)) && yy < top - 6) y = yy; } }
      if (y > 0 && !getB(x, y, z) && !getB(x, y + 1, z) && !nearLight(x, y, z, 7)) {
        const r = Math.random(), kind = r < 0.5 ? 'wandler' : r < 0.78 ? 'werfer' : 'schleimer';
        return addMob(kind, x + 0.5, y, z + 0.5);
      }
    }
    // Tiere am Tag auf Gras
    if (!night && animals < 8 && getB(x, top, z) === B.gras && !getB(x, top + 1, z) && Math.random() < 0.5) {
      const kind = Math.random() < 0.55 ? 'schaf' : 'huhn', n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) addMob(kind, x + 0.5 + i * 0.7, top + 1, z + 0.5);
    }
  }
  function addMob(kind, x, y, z) { const K = KINDS[kind]; MOBS.push({ kind, K, x, y, z, vx: 0, vy: 0, vz: 0, yaw: Math.random() * 6.28, hp: K.hp, w: K.w, h: K.h, hostile: !!K.hostile, ground: false, hurtT: 0, atkT: 1, wanderT: 0, walk: 0, jumpT: 0, burnT: 0 }); }
  function mobCollides(m, x, y, z) { for (let by = Math.floor(y); by <= Math.floor(y + m.h - 0.001); by++) for (let bz = Math.floor(z - m.w); bz <= Math.floor(z + m.w - 0.001); bz++) for (let bx = Math.floor(x - m.w); bx <= Math.floor(x + m.w - 0.001); bx++) if (isSolid(getB(bx, by, bz))) return true; return false; }
  function mobMove(m, ax, d) { if (!d) return false; const n = Math.ceil(Math.abs(d) / 0.3), s = d / n; for (let i = 0; i < n; i++) { const p = { x: m.x, y: m.y, z: m.z }; p[ax] += s; if (mobCollides(m, p.x, p.y, p.z)) return true; m[ax] = p[ax]; } return false; }
  function updateMobs(dt) {
    if (W.mode === 'kreativ') { for (let i = MOBS.length - 1; i >= 0; i--) if (MOBS[i].hostile) MOBS.splice(i, 1); }
    spawnMobs(dt);
    const day = dayLight();
    for (let i = MOBS.length - 1; i >= 0; i--) {
      const m = MOBS[i], K = m.K, dx = P.x - m.x, dz = P.z - m.z, dist = Math.hypot(dx, dz), dy = P.y - m.y;
      if (dist > 80 || m.y < -10 || !getChunk(Math.floor(m.x / CS), Math.floor(m.z / CS))) { MOBS.splice(i, 1); continue; }
      m.hurtT = Math.max(0, m.hurtT - dt); m.atkT -= dt;
      // Monster an der Sonne zerfallen
      if (m.hostile && day > 0.6 && m.y >= topAt(Math.floor(m.x), Math.floor(m.z))) { m.burnT += dt; if (m.burnT > 1.5 + (i % 5) * 0.4) { poof(m); MOBS.splice(i, 1); continue; } }
      let tx = 0, tz = 0, sp = K.speed;
      const chase = m.hostile && survival() && dist < 24 && Math.abs(dy) < 12 && P.hp > 0;
      if (chase) {
        if (K.ranged && dist < 9) { tx = -dx / dist; tz = -dz / dist; sp *= 0.6; if (dist < 5) { tx = dx / dist * 0.2; tz = dz / dist * 0.2; } }
        else { tx = dx / (dist || 1); tz = dz / (dist || 1); }
        m.yaw = Math.atan2(-dx, -dz);
        if (K.ranged && dist < 16 && m.atkT <= 0) { m.atkT = 2.2; throwBone(m); }
        else if (!K.ranged && dist < m.w + 0.9 && Math.abs(dy) < 1.6 && m.atkT <= 0) { m.atkT = 1; hurt(K.dmg); P.vx += dx / (dist || 1) * 5; P.vz += dz / (dist || 1) * 5; P.vy = Math.max(P.vy, 4); }
      } else {
        m.wanderT -= dt; if (m.wanderT <= 0) { m.wanderT = 2 + Math.random() * 4; m.wdir = Math.random() < 0.4 ? null : Math.random() * 6.28; }
        if (m.fleeT > 0) { m.fleeT -= dt; tx = -dx / (dist || 1); tz = -dz / (dist || 1); sp *= 1.8; m.yaw = Math.atan2(dx, dz); }
        else if (m.wdir != null) { tx = Math.sin(m.wdir) * -1; tz = -Math.cos(m.wdir); m.yaw = m.wdir; sp *= 0.5; }
      }
      const inW = BL[getB(Math.floor(m.x), Math.floor(m.y + 0.3), Math.floor(m.z))].water;
      if (K.jumper) { m.jumpT -= dt; if (m.ground) { m.vx *= 0.6; m.vz *= 0.6; if (m.jumpT <= 0 && (tx || tz)) { m.jumpT = 0.8 + Math.random() * 0.6; m.vy = 7; m.vx = tx * sp * 1.6; m.vz = tz * sp * 1.6; } } }
      else { m.vx += (tx * sp - m.vx) * Math.min(1, dt * 8); m.vz += (tz * sp - m.vz) * Math.min(1, dt * 8); }
      m.vy -= (inW ? 8 : 26) * dt; if (inW) m.vy = Math.max(m.vy, -2) + (tx || tz ? 14 * dt : 0);
      const hx = mobMove(m, 'x', m.vx * dt), hz = mobMove(m, 'z', m.vz * dt);
      if ((hx || hz) && m.ground && !K.jumper) m.vy = 8.2;
      if (mobMove(m, 'y', m.vy * dt)) { m.ground = m.vy < 0; m.vy = 0; } else m.ground = false;
      m.walk += Math.hypot(m.vx, m.vz) * dt * 3;
    }
    // Geworfene Knochen
    for (let i = SHOTS.length - 1; i >= 0; i--) {
      const s = SHOTS[i]; s.t += dt; s.vy -= 12 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (Math.abs(s.x - P.x) < 0.4 && Math.abs(s.z - P.z) < 0.4 && s.y > P.y && s.y < P.y + PH) { hurt(KINDS.werfer.dmg); P.vx += s.vx * 0.3; P.vz += s.vz * 0.3; SHOTS.splice(i, 1); continue; }
      if (s.t > 4 || isSolid(getB(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z)))) SHOTS.splice(i, 1);
    }
  }
  function throwBone(m) {
    const ex = P.x - m.x, ey = P.y + 1.2 - (m.y + 1.5), ez = P.z - m.z, d = Math.hypot(ex, ez), t = d / 12;
    SHOTS.push({ x: m.x, y: m.y + 1.5, z: m.z, vx: ex / t, vy: ey / t + 6 * t, vz: ez / t, t: 0 }); sfx('throw');
  }
  function poof(m) { for (let i = 0; i < 6; i++) PUFFS.push({ x: m.x + (Math.random() - 0.5) * m.w * 2, y: m.y + Math.random() * m.h, z: m.z + (Math.random() - 0.5) * m.w * 2, t: 0 }); }
  const PUFFS = [];
  // Ziel unter dem Fadenkreuz (bis 3,5 Blöcke, nur wenn kein Block davor ist)
  function targetMob() {
    const e = [P.x, P.y + EYE, P.z], cp = Math.cos(P.pitch), d = [-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp];
    let best = null, bt = 3.5; const h = raycast(); const blockT = h ? Math.hypot(h.x + 0.5 - e[0], h.y + 0.5 - e[1], h.z + 0.5 - e[2]) - 0.4 : 99;
    for (const m of MOBS) {
      const mn = [m.x - m.w - 0.1, m.y, m.z - m.w - 0.1], mx = [m.x + m.w + 0.1, m.y + m.h, m.z + m.w + 0.1];
      let t0 = 0, t1 = bt; for (let k = 0; k < 3; k++) { const inv = 1 / (d[k] || 1e-9); let a = (mn[k] - e[k]) * inv, b = (mx[k] - e[k]) * inv; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
      if (t0 <= t1 && t0 < bt && t0 < blockT) { bt = t0; best = m; }
    }
    return best;
  }
  function attack(m) {
    const h = held(), dmg = h && h.dmg ? h.dmg : 1;
    m.hp -= dmg; m.hurtT = 0.3; swing = 1; sfx('hit2');
    const dx = m.x - P.x, dz = m.z - P.z, d = Math.hypot(dx, dz) || 1; m.vx = dx / d * 7; m.vz = dz / d * 7; m.vy = 4.5; m.ground = false;
    if (!m.hostile) m.fleeT = 4;
    if (m.hp <= 0) {
      const i = MOBS.indexOf(m); if (i >= 0) MOBS.splice(i, 1); poof(m);
      if (survival()) for (const [k, ch] of m.K.drops) if (Math.random() < ch) giveItem(k, 1);
    }
  }

  /* ================= Klang (erzeugt, keine Dateien) ================= */
  let AC = null;
  function sfx(kind, id) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      if (kind === 'eat' || kind === 'throw' || kind === 'hit2') { const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime; o.type = kind === 'eat' ? 'square' : 'triangle'; o.frequency.setValueAtTime(kind === 'eat' ? 220 : kind === 'throw' ? 500 : 160, t0); o.frequency.exponentialRampToValueAtTime(kind === 'throw' ? 900 : 90, t0 + 0.12); g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15); o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + 0.16); return; }
      const t = AC.currentTime, len = kind === 'break' ? 0.18 : kind === 'hurt' ? 0.2 : 0.08, buf = AC.createBuffer(1, Math.floor(AC.sampleRate * len), AC.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
      const src = AC.createBufferSource(); src.buffer = buf; const f = AC.createBiquadFilter(); f.type = 'lowpass';
      const b = id != null ? BL[id] : null; f.frequency.value = kind === 'hurt' ? 500 : b && (b.key === 'glas' || b.key === 'eis') ? 4000 : b && (b.key.includes('stein') || b.key === 'pflaster' || b.key.includes('erz') || b.key === 'kohle' || b.key === 'eisen' || b.key === 'ziegel') ? 1600 : b && (b.key === 'blatt' || b.key === 'fnadel' || b.cross) ? 2500 : 900;
      const g = AC.createGain(); g.gain.value = kind === 'hit' ? 0.12 : 0.25; src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t);
    } catch {}
  }

  /* ================= Oberfläche ================= */
  let root, isTouch = false, running = false, raf = 0, last = 0, menuOpen = false, invOpen = false, RD = 4, lastSaveT = 0;
  const CSS = `
  #welt{position:fixed;inset:0;z-index:50;background:#000;color:#fff;font-family:Figtree,system-ui,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none;overflow:hidden}
  #welt canvas.ww-gl{position:absolute;inset:0;width:100%;height:100%;display:block}
  #welt .ww-cross{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;pointer-events:none}
  #welt .ww-cross::before,#welt .ww-cross::after{content:"";position:absolute;background:rgba(255,255,255,.85);box-shadow:0 0 2px #000}
  #welt .ww-cross::before{left:10px;top:2px;width:2px;height:18px}#welt .ww-cross::after{top:10px;left:2px;height:2px;width:18px}
  #welt .ww-prog{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;pointer-events:none;background:conic-gradient(rgba(255,255,255,.85) var(--p,0%),transparent 0);-webkit-mask:radial-gradient(circle,transparent 13px,#000 14px);mask:radial-gradient(circle,transparent 13px,#000 14px)}
  #welt .ww-hot{position:absolute;left:50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;gap:4px;padding:4px;border-radius:10px;background:rgba(0,0,0,.45)}
  #welt .ww-hot button{position:relative;width:46px;height:46px;border-radius:8px;border:2px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);padding:0;cursor:pointer}
  #welt .ww-hot button.ww-on{border-color:#fff;background:rgba(255,255,255,.22)}
  #welt .ww-hot img,#welt .ww-grid img{width:34px;height:34px;image-rendering:pixelated;pointer-events:none}
  #welt .ww-hot small,#welt .ww-grid small{position:absolute;right:3px;bottom:1px;font-size:11px;font-weight:800;text-shadow:0 1px 2px #000}
  #welt .ww-top{position:absolute;top:calc(8px + env(safe-area-inset-top,0px));left:8px;right:8px;display:flex;gap:6px;align-items:center;pointer-events:none}
  #welt .ww-top>*{pointer-events:auto}
  #welt .ww-tb{height:38px;min-width:38px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.45);color:#fff;font:inherit;font-weight:800;font-size:15px;cursor:pointer}
  #welt .ww-info{margin-left:auto;font-size:12px;opacity:.85;text-shadow:0 1px 2px #000;text-align:right;pointer-events:none}
  #welt .ww-hearts{position:absolute;left:50%;bottom:calc(68px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font-size:15px;letter-spacing:1px;text-shadow:0 1px 2px #000;pointer-events:none;white-space:nowrap}
  #welt .ww-held{position:absolute;right:8%;bottom:calc(70px + env(safe-area-inset-bottom,0px));width:120px;height:120px;pointer-events:none;transform-origin:80% 90%;transition:transform .05s}
  #welt .ww-held img{width:100%;height:100%;image-rendering:pixelated;filter:drop-shadow(0 6px 8px rgba(0,0,0,.4))}
  #welt .ww-held.item img{transform:rotate(0deg) scale(1.1)}
  #welt .ww-sleep{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none}
  #welt .ww-hearts span{display:inline-block;margin:0 6px}#welt .ww-hearts i{font-style:normal;opacity:.25;filter:grayscale(1)}
  #welt .ww-food{font-size:13px}#welt .ww-air{color:#9fd8ff}
  #welt .ww-flash{position:absolute;inset:0;background:rgba(200,0,0,.35);pointer-events:none;opacity:0;transition:opacity .25s}
  #welt .ww-under{position:absolute;inset:0;background:rgba(30,80,170,.35);pointer-events:none;display:none}
  #welt .ww-pane{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,10,20,.6);backdrop-filter:blur(3px);padding:16px}
  #welt .ww-card{width:min(560px,100%);max-height:100%;overflow:auto;background:#1c1f2c;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
  #welt h2{margin:0 0 10px;font-family:Bungee,Figtree,sans-serif;font-weight:400;font-size:22px}
  #welt .ww-btn{display:block;width:100%;margin:6px 0;padding:11px;border-radius:12px;border:0;background:#3b4160;color:#fff;font:inherit;font-weight:800;font-size:15px;cursor:pointer}
  #welt .ww-btn.ww-gold{background:#ffb547;color:#2a1608}#welt .ww-btn.ww-ghost{background:transparent;border:1px solid rgba(255,255,255,.25)}
  #welt .ww-row{display:flex;gap:8px;align-items:center}#welt .ww-row .ww-btn{flex:1}
  #welt .ww-note{font-size:13px;opacity:.75;line-height:1.4}
  #welt .ww-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:6px;margin:10px 0}
  #welt .ww-grid button{position:relative;height:56px;border-radius:10px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);cursor:pointer;padding:0}
  #welt .ww-grid button.ww-on{border-color:#ffb547}
  #welt .ww-rec{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.05);margin:4px 0;font-size:13px}
  #welt .ww-rec img{width:26px;height:26px;image-rendering:pixelated}#welt .ww-rec .ww-btn{width:auto;margin:0 0 0 auto;padding:6px 12px;font-size:13px}
  #welt .ww-rec .ww-btn:disabled{opacity:.4}
  #welt .ww-tabs{display:flex;gap:6px;margin-bottom:8px}#welt .ww-tabs button{flex:1;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:none;color:#fff;font:inherit;font-weight:800;cursor:pointer}#welt .ww-tabs button.ww-on{background:#3b4160}
  #welt .ww-toast{position:absolute;left:50%;top:60px;transform:translateX(-50%);background:rgba(0,0,0,.7);padding:8px 14px;border-radius:10px;font-size:14px;max-width:90%;text-align:center;pointer-events:none}
  #welt .ww-stick{position:absolute;left:calc(22px + env(safe-area-inset-left,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));width:124px;height:124px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.2)}
  #welt .ww-stick i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(255,255,255,.3)}
  #welt .ww-tbtns{position:absolute;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:62px 62px;gap:10px}
  #welt .ww-tbtns button{width:62px;height:62px;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:rgba(0,0,0,.35);color:#fff;font-size:24px;padding:0}
  #welt .ww-tbtns button.ww-on{background:rgba(255,181,71,.5)}
  #welt input[type=range]{width:100%}
  #welt label{display:block;margin-top:12px;font-size:13px;font-weight:600;letter-spacing:0;text-transform:none;color:rgba(255,255,255,.75)}
  #welt input{font:inherit;font-size:16px;min-width:0}
  #welt h2{text-wrap:balance}
  #welt .ww-sel{display:flex;gap:6px}#welt .ww-sel button{flex:1}
  @media (max-width:560px){#welt .ww-hot button{width:36px;height:36px}#welt .ww-hot img{width:26px;height:26px}#welt .ww-hot{gap:2px;padding:3px}}
  `;
  // Kleines Würfelbild eines Blocks für Leiste und Inventar
  const ICONS = {};
  function icon(id) {
    if (ICONS[id]) return ICONS[id];
    const b = BL[id], c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const t = n => [(n % TILES) * AT, Math.floor(n / TILES) * AT];
    if (b.cross) { const [sx, sy] = t(b.tex[0]); g.drawImage(atlas, sx, sy, AT, AT, 4, 4, 40, 40); }
    else {
      const face = (n, m, shade) => { const [sx, sy] = t(n); g.save(); g.setTransform(...m); g.drawImage(atlas, sx, sy, AT, AT, 0, 0, AT, AT); g.fillStyle = `rgba(0,0,0,${shade})`; g.fillRect(0, 0, AT, AT); g.restore(); };
      const s = 1.3;
      face(b.tex[0], [s, s * 0.5, -s, s * 0.5, 24, 3], 0);
      face(b.tex[1], [s, s * 0.5, 0, s, 3.2, 13.5], 0.18);
      face(b.tex[1], [s, -s * 0.5, 0, s, 24, 24], 0.35);
    }
    return (ICONS[id] = c.toDataURL());
  }
  function iconK(k) {
    if (!isItem(k)) return icon(B[k]);
    if (ICONS['i' + k]) return ICONS['i' + k];
    const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const t = ITEMS[k].tile;
    g.drawImage(atlas, (t % TILES) * AT, Math.floor(t / TILES) * AT, AT, AT, 4, 4, 40, 40);
    return (ICONS['i' + k] = c.toDataURL());
  }
  function build() {
    if (!document.getElementById('weltCss')) { const st = document.createElement('style'); st.id = 'weltCss'; st.textContent = CSS; document.head.appendChild(st); }
    root = document.createElement('div'); root.id = 'welt';
    root.innerHTML = `<canvas class="ww-gl"></canvas><div class="ww-under"></div><div class="ww-flash"></div><div class="ww-cross"></div><div class="ww-prog" hidden></div>
      <div class="ww-top"><button class="ww-tb" data-a="menu" aria-label="Menü">☰</button><button class="ww-tb" data-a="inv" aria-label="Inventar">🎒</button><button class="ww-tb" data-a="fly" hidden aria-label="Fliegen">✈</button><div class="ww-info"></div></div>
      <div class="ww-held"></div><div class="ww-sleep"></div><div class="ww-hearts"></div><div class="ww-hot"></div><div class="ww-touch" hidden><div class="ww-stick"><i></i></div><div class="ww-tbtns"><button data-t="mine" aria-label="Abbauen">⛏</button><button data-t="place" aria-label="Setzen">🧱</button><button data-t="down" aria-label="Runter">⬇</button><button data-t="jump" aria-label="Springen">⤒</button></div></div>
      <div class="ww-pane" hidden></div><div class="ww-toast" hidden></div>`;
    document.body.appendChild(root);
    cv = root.querySelector('canvas.ww-gl');
    isTouch = matchMedia('(pointer: coarse)').matches;
    root.querySelector('.ww-touch').hidden = !isTouch;
    bindInput();
  }
  let toastT = 0;
  function toast(msg) { const t = root.querySelector('.ww-toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600); }
  function hud() {
    if (!root || !W) return;
    const hot = root.querySelector('.ww-hot');
    hot.innerHTML = W.hot.map((k, i) => `<button class="${i === W.sel ? 'ww-on' : ''}" data-h="${i}" aria-label="${k ? nameOf(k) : 'leer'}">${k ? `<img src="${iconK(k)}" alt="">` : ''}${k && W.mode === 'ueberleben' ? `<small>${W.inv[k] || 0}</small>` : ''}</button>`).join('');
    const hf = Math.ceil(P.food / 2);
    root.querySelector('.ww-hearts').innerHTML = W.mode === 'ueberleben' ? `<span class="ww-hp">${'❤'.repeat(Math.ceil(P.hp / 2))}<i>${'❤'.repeat(10 - Math.ceil(P.hp / 2))}</i></span><span class="ww-food">${'🍖'.repeat(hf)}<i>${'🍖'.repeat(10 - hf)}</i></span>${P.headWater ? `<span class="ww-air">${'○'.repeat(Math.max(0, Math.ceil(P.air)))}</span>` : ''}` : '';
    const hk = W.hot[W.sel], hi = root.querySelector('.ww-held'); if (hi) { hi.innerHTML = hk ? `<img src="${iconK(hk)}" alt="">` : ''; hi.className = 'ww-held' + (hk && isItem(hk) ? ' item' : ''); }
    root.querySelector('[data-a="fly"]').hidden = W.mode !== 'kreativ';
    root.querySelector('[data-a="fly"]').style.background = P.fly ? 'rgba(255,181,71,.55)' : '';
    root.querySelector('[data-t="down"]').style.visibility = P.fly || !isTouch ? 'visible' : 'hidden';
  }
  function pane(html) { const p = root.querySelector('.ww-pane'); if (!html) { p.hidden = true; p.innerHTML = ''; return; } p.innerHTML = `<div class="ww-card">${html}</div>`; p.hidden = false; }
  function showMenu() {
    menuOpen = true; invOpen = false; if (document.pointerLockElement) document.exitPointerLock();
    const mode = W.mode === 'kreativ' ? 'Kreativ' : 'Überleben';
    pane(`<h2>Würfelwelt</h2><p class="ww-note">Welt ${W.seed} · ${mode}</p>
      <button class="ww-btn ww-gold" data-m="weiter">Weiterspielen</button>
      <label class="ww-note">Sichtweite: <b data-rdv>${RD}</b> Chunks</label><input type="range" min="2" max="10" value="${RD}" data-m="rd">
      <p class="ww-note">${isTouch ? 'Links: Laufen. Rechts wischen: Umschauen. ⛏ halten: Abbauen, 🧱: Setzen, ⤒: Springen.' : 'WASD: Laufen · Maus: Umschauen · Linksklick halten: Abbauen · Rechtsklick: Setzen · Leertaste: Springen · Shift: Schleichen · Strg: Rennen · 1–9 oder Mausrad: Block wählen · E: Inventar' + (W.mode === 'kreativ' ? ' · F: Fliegen' : '')}</p>
      ${W.mode === 'ueberleben' ? `<button class="ww-btn ww-ghost" data-m="monster">Monster: ${W.monsters === false ? 'aus (friedlich)' : 'an'}</button><p class="ww-note">Überleben: Nachts und in dunklen Höhlen kommen Nachtwandler, Knochenwerfer und Schleimer. Fackeln und Leuchtstein halten sie fern. Iss Äpfel und Braten gegen Hunger, schlaf im Bett, um die Nacht zu überspringen. Holz → Bretter → Stöcke → Spitzhacke: Stein und Erze brauchen eine Spitzhacke.</p>` : ''}
      <div class="ww-row"><button class="ww-btn" data-m="neu">Neue Welt</button><button class="ww-btn ww-ghost" data-m="hub">Zurück zum Hub</button></div>`);
  }
  function showNew(first) {
    menuOpen = true;
    pane(`<h2>${first ? 'Willkommen in der Würfelwelt' : 'Neue Welt'}</h2><p class="ww-note">Eine unendliche Welt aus Würfeln: Wiesen, Wälder, Wüsten, verschneite Berge, Seen und Höhlen voller Erz. Baue, was du willst.${first ? '' : ' Die alte Welt wird dabei gelöscht.'}</p>
      <div class="ww-sel"><button class="ww-btn ww-gold" data-m="mk" data-mode="kreativ">Kreativ<br><small style="font-weight:600">alle Blöcke, fliegen</small></button><button class="ww-btn" data-m="mk" data-mode="ueberleben">Überleben<br><small style="font-weight:600">Monster, Hunger, Werkzeuge</small></button></div>
      <label class="ww-note">Startwert der Welt (leer = zufällig)</label><input data-m="seed" inputmode="numeric" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:#11131c;color:#fff;font:inherit">
      ${first ? '<button class="ww-btn ww-ghost" data-m="hub">Zurück zum Hub</button>' : '<button class="ww-btn ww-ghost" data-m="menu">Abbrechen</button>'}`);
  }
  let invTab = 'bloecke';
  function showInv() {
    invOpen = true; menuOpen = true; if (document.pointerLockElement) document.exitPointerLock();
    if (W.mode === 'kreativ') {
      pane(`<h2>Blöcke</h2><p class="ww-note">Tippe einen Block an: Er kommt in das gewählte Feld der Leiste (Feld ${W.sel + 1}).</p>
        <div class="ww-grid">${[...INV_IDS.map(id => BL[id].key), ...Object.keys(ITEMS)].map(k => `<button data-pick="${k}" class="${W.hot[W.sel] === k ? 'ww-on' : ''}" title="${nameOf(k)}"><img src="${iconK(k)}" alt="${nameOf(k)}"></button>`).join('')}</div>
        <button class="ww-btn ww-gold" data-m="weiter">Fertig</button>`);
      return;
    }
    const items = Object.keys(W.inv).filter(k => W.inv[k] > 0);
    const can = r => r.in.every(([k, n]) => (W.inv[k] || 0) >= n);
    pane(`<h2>Inventar</h2><div class="ww-tabs"><button data-tab="bloecke" class="${invTab === 'bloecke' ? 'ww-on' : ''}">Sachen</button><button data-tab="bauen" class="${invTab === 'bauen' ? 'ww-on' : ''}">Herstellen</button></div>
      ${invTab === 'bloecke' ? (items.length ? `<p class="ww-note">Tippe etwas an, um es in Feld ${W.sel + 1} der Leiste zu legen.</p><div class="ww-grid">${items.map(k => `<button data-pick="${k}" class="${W.hot[W.sel] === k ? 'ww-on' : ''}" title="${nameOf(k)}"><img src="${iconK(k)}" alt=""><small>${W.inv[k]}</small></button>`).join('')}</div>` : '<p class="ww-note">Noch leer. Baue Blöcke ab, um sie zu sammeln.</p>')
      : RECIPES.map((r, i) => `<div class="ww-rec">${r.in.map(([k, n]) => `<img src="${iconK(k)}" alt="" title="${nameOf(k)}">×${n}`).join(' + ')} → <img src="${iconK(r.out[0])}" alt="">×${r.out[1]} <span>${nameOf(r.out[0])}</span><button class="ww-btn" data-craft="${i}" ${can(r) ? '' : 'disabled'}>Herstellen</button></div>`).join('')}
      <button class="ww-btn ww-gold" data-m="weiter">Fertig</button>`);
  }
  function closePane() { pane(null); menuOpen = false; invOpen = false; }
  function onPane(e) {
    const t = e.target.closest('[data-m],[data-pick],[data-tab],[data-craft]'); if (!t) return;
    if (t.dataset.pick) { W.hot[W.sel] = t.dataset.pick; hud(); dirtySave = true; showInv(); return; }
    if (t.dataset.tab) { invTab = t.dataset.tab; showInv(); return; }
    if (t.dataset.craft != null) { const r = RECIPES[+t.dataset.craft]; if (r.in.every(([k, n]) => (W.inv[k] || 0) >= n)) { r.in.forEach(([k, n]) => { W.inv[k] -= n; if (W.inv[k] <= 0) { delete W.inv[k]; const i = W.hot.indexOf(k); if (i >= 0) W.hot[i] = null; } }); giveItem(r.out[0], r.out[1]); sfx('place', B[r.out[0]] ?? null); dirtySave = true; } showInv(); return; }
    const m = t.dataset.m;
    if (m === 'weiter') { closePane(); lockPointer(); }
    else if (m === 'neu') showNew(false);
    else if (m === 'monster') { W.monsters = W.monsters === false; if (W.monsters === false) for (let i = MOBS.length - 1; i >= 0; i--) if (MOBS[i].hostile) MOBS.splice(i, 1); dirtySave = true; showMenu(); }
    else if (m === 'menu') showMenu();
    else if (m === 'hub') close();
    else if (m === 'mk') { const v = root.querySelector('[data-m="seed"]').value.trim(); const seed = v ? (Math.abs(parseInt(v, 10)) || [...v].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)) % 1e9 || 1 : 1 + Math.floor(Math.random() * 1e9);
      newWorld(seed, t.dataset.mode); startWorld(); save(); closePane(); lockPointer(); toast(t.dataset.mode === 'kreativ' ? 'Kreativ: alle Blöcke über 🎒, fliegen mit ' + (isTouch ? '✈' : 'F') : 'Überleben: Holz sammeln, Werkzeug bauen – bevor es dunkel wird!'); }
  }
  function lockPointer() { if (!isTouch && cv.requestPointerLock) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch {} } }
  function bindInput() {
    root.querySelector('.ww-pane').addEventListener('click', onPane);
    root.querySelector('.ww-pane').addEventListener('input', e => { if (e.target.dataset.m === 'rd') { RD = +e.target.value; root.querySelector('[data-rdv]').textContent = RD; try { localStorage.setItem('wuerfelwelt.rd', RD); } catch {} } });
    root.querySelector('.ww-top').addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'menu') showMenu(); else if (a.dataset.a === 'inv') showInv(); else if (a.dataset.a === 'fly') { P.fly = !P.fly; hud(); } });
    root.querySelector('.ww-hot').addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (b) { W.sel = +b.dataset.h; hud(); } });
    // Maus und Tastatur
    cv.addEventListener('mousedown', e => { if (isTouch || menuOpen) return; if (document.pointerLockElement !== cv) { lockPointer(); return; } if (e.button === 0) mouseMine = true; else if (e.button === 2) place(); });
    window.addEventListener('mouseup', e => { if (e.button === 0) mouseMine = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousemove', e => { if (document.pointerLockElement !== cv) return; P.yaw -= e.movementX * 0.0024; P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch - e.movementY * 0.0024)); });
    document.addEventListener('pointerlockchange', () => { if (running && !isTouch && document.pointerLockElement !== cv && !menuOpen) showMenu(); });
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', e => { keys[e.code] = false; });
    cv.addEventListener('wheel', e => { if (menuOpen) return; W.sel = (W.sel + (e.deltaY > 0 ? 1 : 8)) % 9; hud(); }, { passive: true });
    // Berührung: Steuerknüppel links, Umschauen rechts, Knöpfe
    const stick = root.querySelector('.ww-stick'), knob = stick.querySelector('i'); let stickId = null, lookId = null, lx = 0, ly = 0;
    root.addEventListener('touchstart', e => {
      if (menuOpen) return;
      for (const t of e.changedTouches) {
        const btn = t.target.closest && t.target.closest('[data-t]');
        if (btn) { const k = btn.dataset.t; if (k === 'jump') touch.jump = true; else if (k === 'down') touch.down = true; else if (k === 'mine') touch.mine = true; else if (k === 'place') place(); btn.classList.add('ww-on'); e.preventDefault(); continue; }
        if (t.target.closest && t.target.closest('.ww-top,.ww-hot')) continue;
        const r = stick.getBoundingClientRect();
        if (stickId == null && t.clientX < window.innerWidth * 0.42 && t.clientY > window.innerHeight * 0.35) { stickId = t.identifier; moveStick(t, r); }
        else if (lookId == null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
        e.preventDefault();
      }
    }, { passive: false });
    const moveStick = (t, r) => { const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (t.clientX - cx) / 50, dy = (t.clientY - cy) / 50; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } touch.mx = dx; touch.mz = -dy; knob.style.transform = `translate(${dx * 36}px,${dy * 36}px)`; };
    root.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) moveStick(t, stick.getBoundingClientRect());
        else if (t.identifier === lookId) { P.yaw -= (t.clientX - lx) * 0.0055; P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch - (t.clientY - ly) * 0.0055)); lx = t.clientX; ly = t.clientY; }
      }
      if (!menuOpen) e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; touch.mx = touch.mz = 0; knob.style.transform = ''; }
        if (t.identifier === lookId) lookId = null;
        const btn = t.target.closest && t.target.closest('[data-t]');
        if (btn) { const k = btn.dataset.t; if (k === 'jump') touch.jump = false; else if (k === 'down') touch.down = false; else if (k === 'mine') { touch.mine = false; mining = null; } btn.classList.remove('ww-on'); }
      }
    };
    root.addEventListener('touchend', end); root.addEventListener('touchcancel', end);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden && running) save(); });
    window.addEventListener('pagehide', () => { if (running) save(); });
  }
  let mouseMine = false;
  function onKey(e) {
    if (!running) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    keys[e.code] = true;
    if (e.code === 'Escape') { if (menuOpen) { closePane(); lockPointer(); } return; }
    if (e.code === 'KeyE') { if (invOpen) { closePane(); lockPointer(); } else showInv(); return; }
    if (menuOpen) return;
    if (/^Digit[1-9]$/.test(e.code)) { W.sel = +e.code.slice(5) - 1; hud(); }
    if (e.code === 'KeyF' && W.mode === 'kreativ') { P.fly = !P.fly; hud(); }
    if (e.code === 'Space') e.preventDefault();
  }
  function resize() { if (!cv) return; const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2); cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr); }

  /* ================= Zeichnen ================= */
  let skyBuf = null, lineBuf = null, cloudBuf = null, mobBuf = null, mobBuf2 = null;
  function skyLightAt(x, y, z) { const t = topAt(Math.floor(x), Math.floor(z)); if (y > t) return 1; return Math.max(0.3, 0.72 - (t - y) * 0.035); }
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (!menuOpen) {
      let rest = dt; while (rest > 0) { const s = Math.min(rest, 1 / 60); physics(s); rest -= s; }
      mineStep(dt, mouseMine || touch.mine);
      W.time = (W.time + dt / 1200) % 1;
      updateMobs(dt);
      if (sleepT > 0) { sleepT -= dt; if (sleepT <= 0) { W.time = 0.03; for (let i = MOBS.length - 1; i >= 0; i--) if (MOBS[i].hostile) MOBS.splice(i, 1); P.food = Math.max(0, P.food - 3); toast('Guten Morgen!'); hud(); } }
    }
    swing = Math.max(0, swing - dt * 5); flash = Math.max(0, flash - dt);
    loadAround(); render(now / 1000);
    // Anzeige
    const pr = root.querySelector('.ww-prog'); if (mining && mining.need) { pr.hidden = false; pr.style.setProperty('--p', Math.min(100, mining.p / mining.need * 100) + '%'); } else pr.hidden = true;
    root.querySelector('.ww-flash').style.opacity = flash > 0 ? 1 : 0;
    root.querySelector('.ww-sleep').style.opacity = sleepT > 0 ? Math.min(1, (1.6 - sleepT) * 2, sleepT * 3) : 0;
    const hel = root.querySelector('.ww-held'); if (hel) hel.style.transform = swing > 0 ? `rotate(${-swing * 35}deg) translate(${-swing * 30}px,${-swing * 18}px)` : '';
    root.querySelector('.ww-under').style.display = P.headWater ? 'block' : 'none';
    infoT -= dt; if (infoT <= 0) { infoT = 0.5; const C = column(Math.floor(P.x), Math.floor(P.z)); root.querySelector('.ww-info').innerHTML = `${{ wiese: 'Wiese', wald: 'Wald', wueste: 'Wüste', schnee: 'Schneeland', berg: 'Berge', gipfel: 'Gipfel' }[C.biome]} · ${clock()}<br>x ${Math.floor(P.x)} · y ${Math.floor(P.y)} · z ${Math.floor(P.z)}`; if (W.mode === 'ueberleben') hud(); }
    lastSaveT += dt; if (lastSaveT > 10 && dirtySave) { lastSaveT = 0; save(); }
  }
  let infoT = 0;
  const clock = () => { const m = Math.floor(((W.time + 0.25) % 1) * 24 * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  // Chunks um den Spieler erzeugen und Maschen bauen, pro Bild nur wenige
  function loadAround() {
    const pcx = Math.floor(P.x / CS), pcz = Math.floor(P.z / CS);
    const t0 = performance.now(), el = () => performance.now() - t0; let gen = 0, mesh = 0;
    const order = [];
    for (let dz = -RD - 1; dz <= RD + 1; dz++) for (let dx = -RD - 1; dx <= RD + 1; dx++) order.push([dx * dx + dz * dz, dx, dz]);
    order.sort((a, b) => a[0] - b[0]);
    for (const [, dx, dz] of order) {
      const cx = pcx + dx, cz = pcz + dz; let c = getChunk(cx, cz);
      if (!c || !c.data) { if (gen === 0 || el() < 5) { ensureData(cx, cz); gen++; } continue; }
    }
    for (const [d2, dx, dz] of order) {
      if (Math.abs(dx) > RD || Math.abs(dz) > RD || d2 > (RD + 0.5) * (RD + 0.5)) continue;
      const c = getChunk(pcx + dx, pcz + dz); if (!c || !c.data || !c.dirty) continue;
      let ok = true; for (let z = -1; z <= 1 && ok; z++) for (let x = -1; x <= 1; x++) { const n = getChunk(c.cx + x, c.cz + z); if (!n || !n.data) { ok = false; break; } }
      if (!ok) continue;
      if (mesh === 0 || el() < 9 || (Math.abs(dx) <= 1 && Math.abs(dz) <= 1)) { meshChunk(c); mesh++; }
    }
    // weit entfernte Chunks freigeben
    for (const c of chunks.values()) if (Math.abs(c.cx - pcx) > RD + 3 || Math.abs(c.cz - pcz) > RD + 3) freeChunk(c);
  }
  function render(t) {
    const w = cv.width, h = cv.height; gl.viewport(0, 0, w, h);
    const sunA = W.time * Math.PI * 2, sunY = Math.sin(sunA), day = Math.max(0, Math.min(1, sunY * 3 + 0.35));
    const dusk = Math.max(0, 1 - Math.abs(sunY) * 4) * (sunY > -0.3 ? 1 : 0);
    let sky = lerp3([0.04, 0.05, 0.12], [0.55, 0.76, 1], day); sky = lerp3(sky, [0.95, 0.55, 0.35], dusk * 0.45);
    let fogCol = sky, fogR = [RD * CS * 0.55, RD * CS * 0.95];
    if (P.headWater) { fogCol = [0.08, 0.2, 0.42]; fogR = [2, 26]; }
    gl.clearColor(fogCol[0], fogCol[1], fogCol[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const eye = [P.x, P.y + EYE - (P.ground && Math.hypot(P.vx, P.vz) > 1 ? Math.abs(Math.sin(t * 9)) * 0.05 : 0), P.z];
    const proj = persp(75 * Math.PI / 180, w / h, 0.08, 1000), V = view(eye, P.yaw, P.pitch), mvp = mul(proj, V);
    gl.uniformMatrix4fv(loc.u_mvp, false, mvp); gl.uniform3fv(loc.u_cam, eye); gl.uniform2f(loc.u_uvoff, 0, 0);
    gl.uniform1f(loc.u_day, 0.27 + 0.73 * day); gl.uniform3fv(loc.u_fog, fogCol); gl.uniform2fv(loc.u_fogr, fogR); gl.uniform4f(loc.u_col, 1, 1, 1, 1); gl.uniform1f(loc.u_nofog, 0);
    // Sonne und Mond (ohne Nebel, immer hell)
    gl.depthMask(false); gl.enable(gl.BLEND); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1f(loc.u_alpha, 1); gl.uniform1f(loc.u_nofog, 1);
    const body = (dir, size, tile) => { const c = [eye[0] + dir[0] * 300, eye[1] + dir[1] * 300, eye[2] + dir[2] * 300], u = [0, 0, 1], v = [dir[1], -dir[0], 0], [tu, tv] = tileUV(tile), E = 1 / TILES;
      const P4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [c[0] + (u[0] * a + v[0] * b) * size, c[1] + (u[1] * a + v[1] * b) * size, c[2] + (u[2] * a + v[2] * b) * size]);
      const UV = [[tu, tv + E], [tu + E, tv + E], [tu + E, tv], [tu, tv]], arr = []; for (const k of [0, 1, 2, 0, 2, 3]) arr.push(...P4[k], ...UV[k], 2); return arr; };
    const sd = [Math.cos(sunA), Math.sin(sunA), 0.25]; const sl = Math.hypot(...sd); sd.forEach((v, i) => (sd[i] = v / sl));
    const sk = [...body(sd, 22, 48), ...body(sd.map(v => -v), 16, 49)];
    skyBuf = upload(new Float32Array(sk), skyBuf); bindBuf(skyBuf); gl.drawArrays(gl.TRIANGLES, 0, sk.length / 6);
    gl.uniform1f(loc.u_nofog, 0); gl.depthMask(true); gl.disable(gl.BLEND);
    // Welt, undurchsichtig
    gl.uniform1f(loc.u_alpha, 0);
    const vis = [];
    const fx = -Math.sin(P.yaw) * Math.cos(P.pitch), fz = -Math.cos(P.yaw) * Math.cos(P.pitch);
    for (const c of chunks.values()) {
      if (!c.mesh) continue; const mx = c.cx * CS + 8 - eye[0], mz = c.cz * CS + 8 - eye[2], dd = Math.hypot(mx, mz);
      if (dd > (RD + 1.2) * CS) continue;
      if (dd > 24 && (mx * fx + mz * fz) / dd < -0.55 && Math.abs(P.pitch) < 0.9) continue; // hinter der Kamera
      vis.push([dd, c]);
      if (c.mesh.opN) { bindBuf(c.mesh.op); gl.drawArrays(gl.TRIANGLES, 0, c.mesh.opN); }
    }
    // Wesen, Knochen und Rauchwölkchen aus Quadern
    if (MOBS.length || SHOTS.length || PUFFS.length) {
      const norm = [], red = [], E = 1 / TILES;
      const box = (out, m, x0, y0, z0, x1, y1, z1, tiles, piv, ang, L) => {
        const cy = Math.cos(m.yaw), sy = Math.sin(m.yaw), ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
        const tr = (x, y, z) => { if (ang) { const yy = piv[0] + (y - piv[0]) * ca - (z - piv[1]) * sa, zz = piv[1] + (y - piv[0]) * sa + (z - piv[1]) * ca; y = yy; z = zz; } return [m.x + x * cy + z * sy, m.y + y, m.z - x * sy + z * cy]; };
        const F6 = [[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], tiles.top ?? tiles.side, 1], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], tiles.side, 0.5],
          [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], tiles.front ?? tiles.side, 0.9], [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], tiles.side, 0.7],
          [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], tiles.side, 0.78], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], tiles.side, 0.78]];
        for (const [a, b, c, d, t, sh] of F6) { const [tu, tv] = tileUV(t), P4 = [a, b, c, d].map(q => tr(q[0], q[1], q[2])), UV = [[tu + E, tv + E], [tu, tv + E], [tu, tv], [tu + E, tv]], l = sh * L;
          for (const k of [0, 1, 2, 0, 2, 3]) out.push(P4[k][0], P4[k][1], P4[k][2], UV[k][0], UV[k][1], l); }
      };
      for (const m of MOBS) {
        const out = m.hurtT > 0 ? red : norm, T = m.K.tiles, L = Math.max(0.35, skyLightAt(m.x, m.y + 1, m.z)), sw = Math.sin(m.walk) * 0.6, k = m.kind;
        if (k === 'wandler' || k === 'werfer') {
          const bt = { side: T.body }, ht = { side: T.body, front: T.head };
          box(out, m, -0.24, 0, -0.12, -0.01, 0.75, 0.12, bt, [0.75, 0], sw, L); box(out, m, 0.01, 0, -0.12, 0.24, 0.75, 0.12, bt, [0.75, 0], -sw, L);
          box(out, m, -0.25, 0.75, -0.13, 0.25, 1.45, 0.13, bt, null, 0, L);
          const arm = k === 'wandler' ? -1.45 : -0.2 - Math.max(0, m.atkT > 1.8 ? 1 : 0);
          box(out, m, -0.42, 0.75, -0.1, -0.25, 1.45, 0.1, bt, [1.4, 0], arm + sw * 0.2, L); box(out, m, 0.25, 0.75, -0.1, 0.42, 1.45, 0.1, bt, [1.4, 0], arm - sw * 0.2, L);
          box(out, m, -0.24, 1.45, -0.24, 0.24, 1.93, 0.24, ht, null, 0, L);
        } else if (k === 'schleimer') {
          const sq = m.ground ? 0.85 : 1.12, hh = 0.9 * sq, ww = 0.45 / Math.sqrt(sq);
          box(out, m, -ww, 0, -ww, ww, hh, ww, { side: T.body, front: T.head }, null, 0, L);
        } else if (k === 'schaf') {
          const lt = { side: T.leg }; for (const [lx, lz, a] of [[-0.25, -0.35, sw], [0.07, -0.35, -sw], [-0.25, 0.25, -sw], [0.07, 0.25, sw]]) box(out, m, lx, 0, lz, lx + 0.18, 0.5, lz + 0.18, lt, [0.5, lz + 0.09], a, L);
          box(out, m, -0.36, 0.45, -0.5, 0.36, 1.05, 0.5, { side: T.body }, null, 0, L);
          box(out, m, -0.2, 0.75, -0.82, 0.2, 1.15, -0.45, { side: T.leg, front: T.head }, null, 0, L);
        } else if (k === 'huhn') {
          const lt = { side: T.leg }; box(out, m, -0.12, 0, -0.03, -0.06, 0.28, 0.03, lt, [0.28, 0], sw, L); box(out, m, 0.06, 0, -0.03, 0.12, 0.28, 0.03, lt, [0.28, 0], -sw, L);
          box(out, m, -0.18, 0.28, -0.25, 0.18, 0.6, 0.25, { side: T.body }, null, 0, L);
          box(out, m, -0.11, 0.5, -0.38, 0.11, 0.78, -0.16, { side: T.body, front: T.head }, null, 0, L);
        }
      }
      for (const b of SHOTS) box(norm, { x: b.x, y: b.y, z: b.z, yaw: b.t * 9 }, -0.18, -0.05, -0.05, 0.18, 0.05, 0.05, { side: 61 }, null, 0, 1);
      for (let i = PUFFS.length - 1; i >= 0; i--) { const f = PUFFS[i]; f.t += 1 / 60; if (f.t > 0.8) { PUFFS.splice(i, 1); continue; } const r = 0.12 + f.t * 0.25; box(norm, { x: f.x, y: f.y + f.t * 0.8, z: f.z, yaw: 0 }, -r, -r, -r, r, r, r, { side: 50 }, null, 0, 0.9 * (1 - f.t)); }
      gl.uniform1f(loc.u_alpha, 0);
      if (norm.length) { mobBuf = upload(new Float32Array(norm), mobBuf); bindBuf(mobBuf); gl.drawArrays(gl.TRIANGLES, 0, norm.length / 6); }
      if (red.length) { mobBuf2 = upload(new Float32Array(red), mobBuf2); bindBuf(mobBuf2); gl.uniform4f(loc.u_col, 1, 0.45, 0.45, 1); gl.drawArrays(gl.TRIANGLES, 0, red.length / 6); gl.uniform4f(loc.u_col, 1, 1, 1, 1); }
    }
    // Markierung des anvisierten Blocks
    const hit = menuOpen ? null : raycast();
    if (hit) {
      const e = 0.003, x0 = hit.x - e, y0 = hit.y - e, z0 = hit.z - e, x1 = hit.x + 1 + e, y1 = hit.y + 1 + e, z1 = hit.z + 1 + e, [tu, tv] = tileUV(50), L = [];
      const ed = [[x0, y0, z0, x1, y0, z0], [x1, y0, z0, x1, y0, z1], [x1, y0, z1, x0, y0, z1], [x0, y0, z1, x0, y0, z0], [x0, y1, z0, x1, y1, z0], [x1, y1, z0, x1, y1, z1], [x1, y1, z1, x0, y1, z1], [x0, y1, z1, x0, y1, z0], [x0, y0, z0, x0, y1, z0], [x1, y0, z0, x1, y1, z0], [x1, y0, z1, x1, y1, z1], [x0, y0, z1, x0, y1, z1]];
      for (const s of ed) L.push(s[0], s[1], s[2], tu + 0.01, tv + 0.01, 2, s[3], s[4], s[5], tu + 0.01, tv + 0.01, 2);
      lineBuf = upload(new Float32Array(L), lineBuf); bindBuf(lineBuf); gl.enable(gl.BLEND); gl.uniform1f(loc.u_alpha, 1); gl.uniform4f(loc.u_col, 0, 0, 0, 0.55); gl.drawArrays(gl.LINES, 0, L.length / 6); gl.uniform4f(loc.u_col, 1, 1, 1, 1); gl.disable(gl.BLEND);
    }
    // Wasser, durchsichtig, von hinten nach vorne
    gl.enable(gl.BLEND); gl.uniform1f(loc.u_alpha, 1); gl.depthMask(false);
    gl.uniform2f(loc.u_uvoff, (t * 0.004) % (1 / TILES) * 0, 0);
    vis.sort((a, b) => b[0] - a[0]);
    for (const [, c] of vis) if (c.mesh.waN) { bindBuf(c.mesh.wa); gl.drawArrays(gl.TRIANGLES, 0, c.mesh.waN); }
    // Wolken
    const cy = 118, sz = (RD + 3) * CS, off = t * 0.002;
    const cx0 = eye[0] - sz, cx1 = eye[0] + sz, cz0 = eye[2] - sz, cz1 = eye[2] + sz, k = 1 / 96;
    const cl = [cx0, cy, cz0, cx0 * k + off, cz0 * k, 1, cx1, cy, cz0, cx1 * k + off, cz0 * k, 1, cx1, cy, cz1, cx1 * k + off, cz1 * k, 1, cx0, cy, cz0, cx0 * k + off, cz0 * k, 1, cx1, cy, cz1, cx1 * k + off, cz1 * k, 1, cx0, cy, cz1, cx0 * k + off, cz1 * k, 1];
    cloudBuf = upload(new Float32Array(cl), cloudBuf); bindBuf(cloudBuf); gl.bindTexture(gl.TEXTURE_2D, cloudTex); gl.uniform2f(loc.u_uvoff, 0, 0);
    gl.uniform4f(loc.u_col, 1, 1, 1, 0.8); gl.uniform2fv(loc.u_fogr, [sz * 0.5, sz * 0.98]); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.uniform4f(loc.u_col, 1, 1, 1, 1);
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.depthMask(true); gl.disable(gl.BLEND);
  }

  /* ================= Öffnen und Schließen ================= */
  function open() {
    if (!root) {
      build();
      try { if (!initGL(cv)) throw new Error('kein WebGL'); }
      catch (err) { root.innerHTML = `<div class="ww-pane"><div class="ww-card"><h2>Würfelwelt</h2><p class="ww-note">Dein Gerät oder Browser unterstützt leider kein WebGL. Ohne WebGL kann die 3D-Welt nicht gezeichnet werden.</p><button class="ww-btn" onclick="Welt.close()">Zurück zum Hub</button></div></div>`; root.hidden = false; return; }
    }
    root.hidden = false; const hub = $('#hub'); if (hub) hub.hidden = true;
    try { RD = +localStorage.getItem('wuerfelwelt.rd') || (isTouch ? 3 : 5); } catch { RD = isTouch ? 3 : 5; }
    resize(); running = true; last = performance.now();
    if (loadSave()) { startWorld(); showMenu(); } else { W = null; showNew(true); W = { seed: 1, mode: 'kreativ', time: 0.3, inv: {}, hot: Array(9).fill(null), sel: 0 }; N = makeNoise(1); }
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function close() {
    if (running && W && W.seed && localStorage.getItem(SAVE_KEY)) save();
    running = false; cancelAnimationFrame(raf); if (document.pointerLockElement) document.exitPointerLock();
    for (const k in keys) keys[k] = false; mouseMine = false;
    if (root) root.hidden = true; const hub = $('#hub'); if (hub) hub.hidden = false;
  }
  window.Welt = { open, close, isOpen: () => running, _dbg: { P, get W() { return W; }, chunks, genChunk, meshChunk, ensureData, getB, setB, raycast, place, breakAt, column, keys, touch, MOBS, addMob, attack, tick: (n, dt = 0.05) => { for (let i = 0; i < n; i++) { physics(dt); updateMobs(dt); W.time = (W.time + dt / 1200) % 1; } } } };
})();
