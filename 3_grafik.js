// Teil 3: Grafik (Plakate, Gegner, Bosse, Gebiete, Helden, Begleiter, Animationen)
// Teil von Ritterlauf. Der Server setzt alle Teile in dieser Reihenfolge zu /ritter.js zusammen:
// 1_spiel.js → 2_audio.js → 3_grafik.js → 4_oberflaeche.js. Einzeln ist eine Datei kein gültiges Skript.

  // ---------- Bilder für die Plakate am Anschlagbrett (einmal gezeichnet, dann gemerkt) ----------
  const POSTER_ART = {};
  function posterArt(id) {
    if (POSTER_ART[id]) return POSTER_ART[id];
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const main = ctx; ctx = c.getContext('2d');
    try { ctx.setTransform(1, 0, 0, 1, 0, 0); ART_SCENES[id](1.7); } catch (err) { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, 0, W, H); } finally { ctx = main; }
    return (POSTER_ART[id] = c.toDataURL('image/jpeg', 0.86));
  }
  const artTeam = (ks, x0, t, walk, gap = 30) => ks.forEach((k, i) => DRAW[k](x0 - i * gap, null, t, walk));
  const artScene = (env, sc, t) => { env.back(t, sc); env.props(t, sc); };
  const ART_SCENES = {
    ruf1(t) { // Sternenruf: Nachthimmel mit fallendem Stern über der Gruppe
      skyFill(['#070a24', '#1c1a4a', '#4a2a6a']); stars(t, 90, 200, 1, 7);
      for (let i = 0; i < 3; i++) { const x = 120 + i * 120, y = 40 + i * 18, c = ['143,227,255', '200,150,255', '255,214,90'][i];
        const g = ctx.createLinearGradient(x - 90, y - 50, x, y); g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(1, `rgba(${c},.9)`); ctx.strokeStyle = g; ctx.lineWidth = 3 + i; ctx.beginPath(); ctx.moveTo(x - 90, y - 50); ctx.lineTo(x, y); ctx.stroke(); glowDot(x, y, 16 + i * 6, c, 0.9); }
      ctx.fillStyle = '#120a1e'; ctx.fillRect(0, GROUND - 6, W, H); artTeam(['r', 'm', 's', 'w'], 330, t, false, 40); },
    ruf2(t) { // hervorgehobener Held der Woche im goldenen Lichtkreis
      const B = bannerOf(), k = B.five;
      const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 260); g.addColorStop(0, '#5a3a10'); g.addColorStop(1, '#120a1e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + t * 0.1; ctx.fillStyle = `rgba(255,214,90,${i % 2 ? 0.08 : 0.14})`; ctx.beginPath(); ctx.moveTo(W / 2, H / 2 + 20); ctx.lineTo(W / 2 + Math.cos(a) * 400, H / 2 + 20 + Math.sin(a) * 400); ctx.lineTo(W / 2 + Math.cos(a + 0.2) * 400, H / 2 + 20 + Math.sin(a + 0.2) * 400); ctx.fill(); }
      glowDot(W / 2, GROUND - 60, 110, '255,214,90', 0.45);
      ctx.save(); ctx.translate(W / 2, GROUND); ctx.scale(1.7, 1.7); ctx.translate(-W / 2, -GROUND); DRAW[k](W / 2, null, t, false); ctx.restore();
      ctx.fillStyle = '#ffd23f'; ctx.font = '22px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★★★★★', W / 2, 36); },
    deko1(t) { // Lager mit Deko
      const po = DECO_OVR; DECO_OVR = { zelt: 'd_zelt_pav', feuer: 'd_feuer_lila', banner: 'd_banner_rot', himmel: 'd_himmel_nordlicht', tier: 'd_tier_katze', t1: 'd_tr_13', t2: 'd_tr_4', t3: 'd_tr_12' };
      try { drawBg('lager', 0, t, 250); decoBack(t); artTeam(['r', 'p'], 200, t, false, 34); decoFront(t); } finally { DECO_OVR = po; } },
    deko2(t) { // Trophäen in einer Reihe
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1a10'); g.addColorStop(1, '#120a06'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(0, 150, W, 14); ctx.fillRect(0, 238, W, 14);
      for (let i = 0; i < 5; i++) trophy([13, 0, 4, 8, 12][i], 50 + i * 95, 150, t, 2.4); for (let i = 0; i < 5; i++) trophy([3, 5, 10, 14, 2][i], 50 + i * 95, 238, t, 2.4); },
    truhe1(t) { // Truhen im Albtraum
      const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 300); g.addColorStop(0, '#3a1a4a'); g.addColorStop(1, '#0a0614'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) chestDraw(70 + i * 110, 200, 1.6, i + 1, i === 3); },
    truhe2(t) { // Albtraumfürst und Sternenkönig
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0f2a'); g.addColorStop(1, '#06040c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); stars(t, 60, 160, 1, 3);
      ctx.fillStyle = '#120a1e'; ctx.fillRect(0, GROUND, W, H);
      const po = GEAR_OVR; try { GEAR_OVR = { k: 'r', gear: { kopf: 'g_r_kopf_sonne', koerper: 'g_r_koerper_sonne', beine: 'g_r_beine_sonne' } }; ctx.save(); ctx.translate(160, GROUND); ctx.scale(1.6, 1.6); ctx.translate(-160, -GROUND); DRAW.r(160, null, t, false); ctx.restore();
        GEAR_OVR = { k: 'n', gear: { kopf: 'g_n_kopf_seelen', koerper: 'g_n_koerper_seelen', beine: 'g_n_beine_seelen' } }; ctx.save(); ctx.translate(320, GROUND); ctx.scale(1.6, 1.6); ctx.translate(-320, -GROUND); DRAW.n(320, null, t, false); ctx.restore(); } finally { GEAR_OVR = po; } },
    kopf1(t) { // Steckbrief an der Bretterwand
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.save(); ctx.translate(W / 2, H / 2 + 4); ctx.rotate(0.03); ctx.fillStyle = '#e9d6a8'; ctx.fillRect(-120, -120, 240, 240); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 3; ctx.strokeRect(-120, -120, 240, 240);
      ctx.fillStyle = '#3a2410'; ctx.font = '26px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GESUCHT', 0, -84);
      ctx.fillStyle = '#c9b48a'; ctx.fillRect(-70, -70, 140, 100);
      const e = makeEnemy(20, 0, true, false, null); e.x = 0; e._px = 0; ctx.save(); ctx.beginPath(); ctx.rect(-70, -70, 140, 100); ctx.clip(); ctx.translate(0, 30 - GROUND); ctx.scale(0.6, 0.6); ctx.translate(0, GROUND * 0.66); enemy(e, t); ctx.restore();
      ctx.fillStyle = '#3a2410'; ctx.font = '18px "Bungee","Arial Black",sans-serif'; ctx.fillText('💠 BELOHNUNG', 0, 64); ctx.font = 'bold 13px sans-serif'; ctx.fillText('tot oder lebendig', 0, 86);
      ctx.restore(); },
    kopf2(t) { if (!drawBg('x_schatten', 200, t)) artScene(ENV[7], 200, t); const e = makeEnemy(40, 0, true, false, null); e.x = 360; e._px = 360; enemy(e, t); artTeam(['a', 's', 'r'], 210, t, false, 36); },
    lohn1(t) { // Geschenkkiste mit Glanz
      skyFill(['#1a1030', '#3a2058', '#6a3a5a']); stars(t, 40, 150, 0.6, 3);
      glowDot(W / 2, GROUND - 40, 120, '255,214,120', 0.5);
      ctx.save(); ctx.translate(W / 2, GROUND - 10);
      rr(-60, -70, 120, 70, 8); fillO(LG(-70, 0, '#c84a4a', '#7a1e24')); rr(-66, -86, 132, 22, 6); fillO(LG(-86, -64, '#e05a5a', '#9a2a30'));
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-8, -86, 16, 86); for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 18, -94, 18, 10, sx * 0.4, 0, 7); fillO('#ffd23f'); }
      ctx.restore(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t; sparkle(W / 2 + Math.cos(a) * 90, GROUND - 70 + Math.sin(a) * 50, 6, 0.8); }
      ctx.fillStyle = '#120a1e'; ctx.fillRect(0, GROUND, W, H); },
    lohn2(t) { // Kalender mit 7 Tagen
      ctx.fillStyle = '#2a1d14'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.02); ctx.fillStyle = '#efdcb4'; ctx.fillRect(-200, -100, 400, 200); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 3; ctx.strokeRect(-200, -100, 400, 200);
      ctx.fillStyle = '#3a2410'; ctx.font = '18px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('7 TAGE', 0, -66);
      const ic = ['⬢', '◈', '💠', '◆', '◈', '💠', '🎁'];
      for (let i = 0; i < 7; i++) { const x = -165 + i * 55, y = -44; ctx.fillStyle = i === 6 ? '#ffd27a' : '#f7ecd2'; ctx.fillRect(x - 24, y, 48, 110); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 24, y, 48, 110);
        ctx.fillStyle = '#5a3a1a'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(`Tag ${i + 1}`, x, y + 18); ctx.font = '24px sans-serif'; ctx.fillText(ic[i], x, y + 66);
        if (i < 3) { ctx.strokeStyle = '#2f8a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 12, y + 84); ctx.lineTo(x - 2, y + 94); ctx.lineTo(x + 14, y + 74); ctx.stroke(); } }
      ctx.restore(); },
    reise1(t) { if (!drawBg('finster', 300, t)) artScene(ENV[1], 300, t); artTeam(['s', 'r'], 260, t, true, 34);
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(372, GROUND - 74, 6, 74);
      [['NORDEN', -0.08, -70], ['BERGE', 0.1, -50]].forEach(([tx, rot, y], i) => { ctx.save(); ctx.translate(375, GROUND + y); ctx.rotate(rot); ctx.fillStyle = '#c9a874'; ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(48, -9); ctx.lineTo(58, 0); ctx.lineTo(48, 9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a2410'; ctx.font = '8px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tx, 24, 3); ctx.restore(); }); },
    reise2(t) {
      ctx.fillStyle = '#2a1d14'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.03);
      ctx.fillStyle = '#e8d4a8'; ctx.fillRect(-190, -110, 380, 220); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 3; ctx.strokeRect(-190, -110, 380, 220);
      ctx.fillStyle = 'rgba(120,160,90,.35)'; ctx.beginPath(); ctx.ellipse(-90, -30, 70, 40, 0.3, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(90,120,170,.35)'; ctx.beginPath(); ctx.ellipse(90, 40, 60, 30, -0.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5a3a'; for (const [x, y] of [[40, -60], [60, -70], [80, -58]]) { ctx.beginPath(); ctx.moveTo(x - 12, y + 10); ctx.lineTo(x, y - 12); ctx.lineTo(x + 12, y + 10); ctx.fill(); }
      ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(-150, 70); ctx.bezierCurveTo(-80, 10, -20, 90, 30, 20); ctx.bezierCurveTo(70, -30, 110, 10, 140, -50); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(130, -60); ctx.lineTo(150, -40); ctx.moveTo(150, -60); ctx.lineTo(130, -40); ctx.stroke();
      ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(-150, 70, 6, 0, 7); ctx.fill();
      ctx.translate(-140, -70); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.stroke(); ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.fill(); ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd27a'; ctx.font = '13px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1 h · 3 h · 9 h', W / 2, H - 12);
    },
    wboss1(t) { const wk = ((WBC.info && WBC.info.bk) || 0) % WB_BOSS.length, B = WB_BOSS[wk];
      if (!drawBg(B.bg, 200, t)) artScene(ENV[B.zone], 200, t);
      const e = makeEnemy(100, 0, true, false, null); e.x = 340; e.wb = true; e.wbk = wk; e.bk = B.zone; e.type = B.kind;
      ctx.save(); ctx.translate(340, GROUND); ctx.scale(1.05, 1.05); ctx.translate(-340, -GROUND); enemy(e, t); ctx.restore();
      artTeam(['w', 'r', 'm'], 190, t, false, 34); },
    wboss2(t) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a0a12'); g.addColorStop(1, '#5a1420'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1a0508'; ctx.fillRect(40, 40, W - 80, 30); ctx.fillStyle = '#e5484d'; ctx.fillRect(44, 44, (W - 88) * 0.62, 22); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(44, 44, (W - 88) * 0.62, 7);
      ctx.fillStyle = '#ffe2a8'; ctx.font = '14px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GEMEINSAM', W / 2, 62);
      const ids = ['r', 'w', 's', 'm', 'p', 't', 'a', 'n']; for (let row = 0; row < 2; row++) { ctx.save(); ctx.translate(0, row * -46); ctx.globalAlpha = row ? 0.55 : 1; artTeam(ids, W - 40 - row * 15, t, false, 52); ctx.restore(); }
    },
    feld1(t) { const env = ENV_CAMP, fx = 250; artScene(env, 0, t);
      lightPool(fx, GROUND - 14, 150, '255,150,60', 0.32); lightPool(fx, GROUND - 8, 60, '255,200,120', 0.25);
      ctx.beginPath(); ctx.moveTo(350, GROUND); ctx.lineTo(400, GROUND - 70); ctx.lineTo(450, GROUND); fillO('#7a6046');
      ctx.fillStyle = '#2a1f17'; ctx.beginPath(); ctx.moveTo(390, GROUND); ctx.lineTo(400, GROUND - 32); ctx.lineTo(410, GROUND); ctx.fill();
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(400, GROUND - 70); ctx.lineTo(400, GROUND - 88); ctx.lineTo(417, GROUND - 82); ctx.lineTo(400, GROUND - 76); ctx.fill();
      campFire(fx, t, true); env.front(t, 0); },
    feld2(t) { const env = ENV[4]; artScene(env, 260, t); env.front(t, 260); },
    woche1(t) {
      skyFill(['#1b2a4a', '#3a4f7a', '#d98a5a']);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, GROUND - 20, W, H);
      ctx.save(); ctx.translate(W / 2, 135); ctx.rotate(-0.03);
      ctx.fillStyle = '#c9a874'; ctx.fillRect(-170, -100, 340, 200); ctx.fillStyle = '#efdcb4'; ctx.fillRect(-160, -92, 320, 184);
      ctx.fillStyle = '#3a2410'; ctx.font = '20px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DIESE WOCHE', 0, -60);
      const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
      days.forEach((d, i) => { const x = -135 + i * 45, y = -40; ctx.fillStyle = i < 4 ? '#d8c39a' : '#f7ecd2'; ctx.fillRect(x - 18, y, 38, 50); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 18, y, 38, 50);
        ctx.fillStyle = '#5a3a1a'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(d, x + 1, y + 16); if (i < 4) { ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 10, y + 24); ctx.lineTo(x + 12, y + 44); ctx.moveTo(x + 12, y + 24); ctx.lineTo(x - 10, y + 44); ctx.stroke(); } });
      for (let i = 0; i < 5; i++) { const x = -110 + i * 55, y = 50; ctx.fillStyle = '#ffd23f'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 14, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07010'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.arc(W / 2 + 150, 215, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#e04a40'; ctx.beginPath(); ctx.arc(W / 2 + 147, 212, 18, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffe2a8'; ctx.font = '20px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('7', W / 2 + 147, 219);
    },
    woche2(t) { const env = ENV[10]; artScene(env, 80, t); env.front(t, 80); },
    turm1(t) {
      // Der Turm von außen: wächst bis über die Wolken hinaus, kein Ende in Sicht
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0820'); g.addColorStop(0.55, '#2a1f52'); g.addColorStop(1, '#a0607a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 110; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * hash(i)})`; ctx.fillRect(hash(i + 3) * W, hash(i + 9) * H * 0.75, 1.3, 1.3); }
      const cloud = (y, a, seed) => { ctx.fillStyle = `rgba(230,210,255,${a})`; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(hash(seed + i) * W, y + Math.sin(i * 2.1) * 6, 46 + 50 * hash(i + seed), 7 + 4 * hash(seed - i), 0, 0, 7); ctx.fill(); } };
      cloud(48, 0.18, 11); cloud(110, 0.16, 23);
      const cx = W / 2, base = 230, top = 34;
      const wAt = y => top + (base - top) * Math.pow(Math.max(0, y) / H, 1.3);
      ctx.beginPath(); ctx.moveTo(cx - base / 2, H); for (let y = H; y >= -12; y -= 6) ctx.lineTo(cx - wAt(y) / 2, y); for (let y = -12; y <= H; y += 6) ctx.lineTo(cx + wAt(y) / 2, y); ctx.closePath();
      const tg = ctx.createLinearGradient(cx - base / 2, 0, cx + base / 2, 0); tg.addColorStop(0, '#2a2140'); tg.addColorStop(0.35, '#7a6aa0'); tg.addColorStop(0.55, '#9a8ac0'); tg.addColorStop(1, '#2c2244');
      ctx.fillStyle = tg; ctx.fill(); ctx.strokeStyle = 'rgba(255,230,190,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let y = H - 10, k = 0; y > -12; k++) { const w = wAt(y), f = w / base, step = 5 + 30 * f;
        ctx.strokeStyle = 'rgba(20,10,40,.45)'; ctx.lineWidth = Math.max(0.6, f * 2.5); ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx + w / 2, y); ctx.stroke();
        const n = Math.max(1, Math.round(w / 30)); for (let i = 0; i < n; i++) { if (hash(k * 7 + i) < 0.35) continue; const wx = cx - w / 2 + (i + 0.5) * w / n, ww = 3 + 7 * f, wh = step * 0.45;
          ctx.fillStyle = '#2a1830'; ctx.fillRect(wx - ww / 2 - 1, y - step * 0.75 - 1, ww + 2, wh + 2); ctx.fillStyle = `rgba(255,${190 + 40 * hash(k + i) | 0},110,${0.75 + 0.25 * hash(k - i)})`; ctx.fillRect(wx - ww / 2, y - step * 0.75, ww, wh); }
        y -= step; }
      const tl = ctx.createRadialGradient(cx, 0, 4, cx, 0, 90); tl.addColorStop(0, 'rgba(255,240,200,.85)'); tl.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = tl; ctx.fillRect(cx - 100, -10, 200, 100);
      cloud(36, 0.32, 41); cloud(92, 0.24, 57); cloud(160, 0.14, 71);
      ctx.fillStyle = '#140d22'; ctx.fillRect(0, H - 16, W, 16);
      ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.moveTo(cx - 14, H - 16); ctx.lineTo(cx - 14, H - 40); ctx.quadraticCurveTo(cx, H - 54, cx + 14, H - 40); ctx.lineTo(cx + 14, H - 16); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(cx - 10, H - 16); ctx.lineTo(cx - 10, H - 38); ctx.quadraticCurveTo(cx, H - 49, cx + 10, H - 38); ctx.lineTo(cx + 10, H - 16); ctx.fill();
      lightPool(cx, H - 20, 40, '255,200,120', 0.4);
    },
    turm2(t) { artScene(ENV_TOWER, 40, t); for (const x of [43, 117, 194, 233]) lightPool(x * 2 - (x > 200 ? 0 : 0), 140, 70, '255,170,80', 0.28); lightPool(W / 2, GROUND, 160, '255,160,90', 0.12); ENV_TOWER.front(t, 40); },
    ahnen1(t) { artScene(ENV_AHNEN, 20, t); ENV_AHNEN.front(t, 20); },
    ahnen2(t) {
      const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.6); g.addColorStop(0, '#4a2f10'); g.addColorStop(1, '#0e0716'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2 + 6);
      for (let i = 0; i < 24; i++) { ctx.rotate(Math.PI / 12); ctx.fillStyle = `rgba(255,210,122,${i % 2 ? 0.08 : 0.16})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -260); ctx.lineTo(18, -260); ctx.fill(); }
      ctx.restore();
      lightPool(W / 2, H / 2 + 6, 120, '255,200,110', 0.35);
      ctx.fillStyle = '#b8862f'; ctx.beginPath(); ctx.arc(W / 2, H / 2 + 6, 82, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(W / 2, H / 2 + 6, 74, 0, 7); ctx.fill();
      ctx.strokeStyle = '#8a5f1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2, H / 2 + 6, 60, 0, 7); ctx.stroke();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; ctx.fillStyle = '#8a5f1a'; ctx.beginPath(); ctx.arc(W / 2 + Math.cos(a) * 67, H / 2 + 6 + Math.sin(a) * 67, 2.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#fff6d8'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? 11 : 46, a = -Math.PI / 2 + k * Math.PI / 4; ctx.lineTo(W / 2 + Math.cos(a) * r, H / 2 + 6 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5f1a'; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,230,160,${0.4 + 0.5 * hash(i)})`; ctx.fillRect(hash(i + 4) * W, hash(i + 8) * H, 2, 2); }
    },
    exp1(t) { const env = ENV[11]; artScene(env, 200, t); artTeam(['o', 'd', 'a', 'n', 'e'], 230, t, true, 30);
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(380, GROUND - 70, 6, 70); ctx.fillStyle = '#c9a874'; ctx.beginPath(); ctx.moveTo(360, GROUND - 66); ctx.lineTo(420, GROUND - 66); ctx.lineTo(432, GROUND - 56); ctx.lineTo(420, GROUND - 46); ctx.lineTo(360, GROUND - 46); ctx.fill();
      ctx.fillStyle = '#3a2410'; ctx.font = '9px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ABENTEUER', 394, GROUND - 52); env.front(t, 200); },
    exp2(t) {
      ctx.fillStyle = '#2a2236'; ctx.fillRect(0, 0, W, H);
      const x0 = W / 2 - 120, y0 = 25, pw = 80, ph = 110;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, pw * 3, ph * 2); ctx.clip();
      const g = ctx.createLinearGradient(0, y0, 0, y0 + ph * 2); g.addColorStop(0, '#ff8a9a'); g.addColorStop(1, '#5a2a4a'); ctx.fillStyle = g; ctx.fillRect(x0, y0, pw * 3, ph * 2);
      ctx.translate(W / 2, y0 + ph * 2 + 30); ctx.scale(2.4, 2.4); ctx.translate(0, -GROUND); DRAW.a(0, null, t, false); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * pw, y0); for (let y = 0; y < 2; y++) { ctx.lineTo(x0 + i * pw, y0 + y * ph + ph * 0.4); ctx.arc(x0 + i * pw + 8, y0 + y * ph + ph * 0.5, 10, -Math.PI * 0.75, Math.PI * 0.75); ctx.lineTo(x0 + i * pw, y0 + (y + 1) * ph); } ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x0, y0 + ph); for (let i = 0; i < 3; i++) { ctx.lineTo(x0 + i * pw + pw * 0.4, y0 + ph); ctx.arc(x0 + i * pw + pw * 0.5, y0 + ph + 8, 10, -Math.PI * 1.25, Math.PI * 0.25, true); ctx.lineTo(x0 + (i + 1) * pw, y0 + ph); } ctx.stroke();
      ctx.fillStyle = '#1a1424'; ctx.fillRect(x0 + 2 * pw + 2, y0 + ph + 2, pw - 4, ph - 4);
      ctx.save(); ctx.translate(x0 + 3 * pw + 34, y0 + ph + 20); ctx.rotate(0.25); ctx.fillStyle = '#5a2a4a'; ctx.fillRect(0, 0, pw - 10, ph - 10); ctx.strokeStyle = '#fff'; ctx.strokeRect(0, 0, pw - 10, ph - 10); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, pw * 3, ph * 2);
    },
  };
  /* ---------- Anschlagbrett: alle Spielarten als Plakate ---------- */
  const boardOpenIds = () => ['weekly', 'login', 'deko', ...((S.bestEver || 0) > 150 || chestCount(S) ? ['truhen'] : []), ...(feature(S, 'turm') ? ['tower'] : []), ...(ahnOpen(S) ? ['ahn'] : []), ...(expOpen(S) ? ['exp'] : []), ...(gachaOpen(S) ? ['ruf', 'kopf'] : [])];
  const boardNew = () => { if (!Array.isArray(S.knownBoard)) S.knownBoard = boardOpenIds(); return boardOpenIds().filter(id => !S.knownBoard.includes(id)); };
  const POSTER_ID = { 'Tages-Herausforderung': 'weekly', Turm: 'tower', Ahnenprüfung: 'ahn', Expedition: 'exp', Sternenruf: 'ruf', Kopfgeldjagd: 'kopf', 'Täglicher Lohn': 'login', 'Lager einrichten': 'deko', 'Albtraum-Truhen': 'truhen' };
  function poster(o) {
    const lock = o.lock ? `<span class="rl-pstamp">${esc(o.lock)}</span>` : '', fresh = !o.lock && o.isNew;
    return `<article class="rl-poster ${o.lock ? 'locked' : ''}" style="--pc:${o.col};--rot:${o.rot}deg">${fresh ? '<i class="rl-reddot rl-pdot" aria-label="neu"></i>' : ''}
      <span class="rl-ppin" aria-hidden="true"></span>
      <div class="rl-pband"><span class="rl-pico" aria-hidden="true">${o.icon}</span><h3>${esc(o.title)}</h3></div>
      <p class="rl-pdesc">${esc(o.desc)}</p>
      ${o.art ? `<div class="rl-pimgs">${o.art.map((id, i) => `<img src="${posterArt(id)}" alt="" style="--r:${i ? 2.5 : -2}deg">`).join('')}</div>` : ''}
      ${o.info && o.info.length ? `<div class="rl-pinfo">${o.info.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
      ${lock}
      <div class="rl-pact">${o.lock ? '' : o.acts || ''}</div>
    </article>`;
  }
  function showBoard() {
    if (!inCamp()) return;
    const cap = capOf(S), stg = st.startStage, wk = S.daily && S.daily.day === dayId() ? S.daily.best : 0;
    const rules = weekRules(dayId()).map(id => RULE[id]).filter(Boolean), nextTier = WEEK_TIERS.find(x => x.st > wk);
    const tOpen = feature(S, 'turm'), aOpen = ahnOpen(S), eOpen = expOpen(S);
    const list = [
      { title: 'Feldzug', art: ['feld1', 'feld2'], icon: '⚔️', col: '#ffb547', rot: -2, desc: 'Der klassische Lauf: Kämpf dich Stufe um Stufe durch die Gebiete. Bringt Gold, Seelen und Runen.',
        info: [`Rekord: <b>Stufe ${S.best}</b> von ${cap === Infinity ? '∞' : cap}`, `Start: <b>${esc(zoneName(stg))}</b> (Stufe ${stg})`],
        acts: `<button class="btn" data-m="go" data-go="normal">Aufbrechen</button>${areaMax(S) >= 1 ? '<button class="btn ghost small" data-m="go" data-go="area">Startgebiet ändern</button>' : ''}` },
      { title: 'Tages-Herausforderung', art: ['woche1', 'woche2'], icon: '📜', col: '#4fc3ff', rot: 1.5, desc: 'Jeden Tag neue Regeln. Alle starten bei Stufe 1. Je weiter du kommst, desto mehr Sterne gibt es, ganz oben auch eine Krone.',
        info: [...(rules.length ? [`Regeln: ${rules.map(r => `<b title="${esc(r.desc)}">${esc(r.name)}</b>`).join(', ')}`] : []), `Heute: <b>${wk ? `Stufe ${wk}` : 'noch nicht gespielt'}</b> · neue Regeln in ${dayLeft()}`, nextTier ? `Nächste Belohnung ab Stufe ${nextTier.st}: <b>${nextTier.stars} Sterne${nextTier.crown ? ' + 1 Krone' : ''}</b>` : '<b>Alle Belohnungen geholt</b>'],
        acts: '<button class="btn" data-m="go" data-go="weekly">Herausforderung annehmen</button>' },
      { title: 'Turm', art: ['turm1', 'turm2'], icon: '🏰', col: '#c9a6ff', rot: -1, desc: 'Etage für Etage nach oben, nur Elite-Gegner. Jede Rekord-Etage gibt allen Helden +3 % Schaden und Leben, bis zum nächsten Aufstieg.',
        info: tOpen ? [`Rekord: <b>Etage ${S.towerBest}</b>`, `Bonus bis zum Aufstieg: <b>+${S.towerBest * 3} %</b>`, `Nächste Rune bei Etage ${5 * Math.floor(S.towerBest / 5) + 5}`] : [],
        lock: tOpen ? '' : 'Ab der 8. Wiedergeburt', acts: '<button class="btn" data-m="go" data-go="tower">Turm betreten</button>' },
      { title: 'Ahnenprüfung', art: ['ahnen1', 'ahnen2'], icon: '✦', col: '#ffd27a', rot: 2, desc: '10 Missionen voller Bosse mit je 3 Phasen. Am Ende wartet der Urahn mit einem Ahnensiegel.',
        info: aOpen ? [`Nächste Mission: <b>${S.ahn.m + 1}/10 · ${esc(AHN_MISSIONS[S.ahn.m].name)}</b>`, `Freie Siegel: <b>${S.ahn.sig}</b> · erhalten: ${S.ahn.got}`] : [],
        lock: aOpen ? '' : 'Ab der 6. Wiedergeburt', acts: `<button class="btn" data-m="go" data-go="ahn">Mission ${S.ahn.m + 1} starten</button><button class="btn ghost small" data-m="go" data-go="ahnmap">Zur Karte</button>` },
      { title: 'Heldenreisen', art: ['reise1', 'reise2'], icon: '🧳', col: '#d9935a', rot: 1, desc: 'Schick Helden für 1, 3 oder 9 Stunden auf Reise. Solange fehlen sie in der Truppe, dafür bringen sie Gold, Seelen und Splitter mit.',
        info: [`Unterwegs: <b>${HEROES.filter(h => onTrip(S, h.id)).length}</b>${tripsReady().length ? ` · <b style="color:#9be36b">${tripsReady().length} zurück!</b>` : ''}`], acts: '<button class="btn" data-m="go" data-go="trips">Reisen planen</button>' },
      { title: 'Wochenboss', art: ['wboss1', 'wboss2'], icon: '🐲', col: '#e5484d', rot: -1, desc: 'Alle gegen denselben Boss mit unendlich vielen Lebensleisten. Jede Leiste macht ihn stärker und bringt dir Beute. Mit deiner Gilde schaltet ihr Wochenziele frei.',
        info: wbInfoLines(), lock: acct && acct.token ? '' : 'Nur mit Konto', acts: '<button class="btn" data-m="go" data-go="wboss">Zum Wochenboss</button>' },
      { title: 'Expedition', art: ['exp1', 'exp2'], icon: '🧭', col: '#9bd14a', rot: -1.5, desc: 'Kurze Aufträge für Heldensplitter. Mit etwas Glück findest du Puzzleteile für neue Helden.',
        info: eOpen ? [`Heldensplitter: <b>${S.exp.spl}</b>`, `Puzzle-Helden fertig: <b>${PUZZLE.filter(id => assembled(S, id)).length}/${PUZZLE.length}</b>`] : [],
        lock: eOpen ? '' : 'Ab dem 1. Aufstieg', acts: '<button class="btn" data-m="go" data-go="exp">Aufträge ansehen</button>' },
      { title: 'Täglicher Lohn', art: ['lohn1', 'lohn2'], icon: '🎁', col: '#ff8ac8', rot: 1, desc: 'Jeden Tag ein Geschenk, das für immer bleibt: Runen, Splitter, Heldensplitter und Sternkristalle. Am 7. Tag gibt es am meisten.',
        info: [loginToday(S) ? 'Heute schon abgeholt. Morgen gibt es mehr.' : '<b style="color:#9be36b">Heute noch nicht abgeholt!</b>', `Tag ${(S.login.n % 7) + (loginToday(S) ? 0 : 1)} von 7`], acts: '<button class="btn" data-m="go" data-go="login">Ansehen</button>' },
      { title: 'Sternenruf', art: ['ruf2', 'ruf1'], icon: '🌠', col: '#8fe3ff', rot: -2, desc: 'Ruf mit Sternkristallen nach Helden. Fünf-Sterne-Helden sind selten, jede weitere Kopie stärkt sie mit einem Sternbild.',
        info: gachaOpen(S) ? [evtOpen(S) ? `Sternenruf: <b>${esc(HERO_BY_ID[bannerOf().five].name)}</b> ★★★★★` : 'Ewiger Himmel offen · Sonderbanner ab dem 2. Aufstieg', ...(!(S.gacha && S.gacha.gift) ? ['<b style="color:#9be36b">🎁 10 Rufe geschenkt!</b>'] : []), `Sternkristalle: <b>${fmt(S.gem)}</b> 💠`]
          : gemOpen(S) ? [`Schon gesammelt: <b>${fmt(S.gem)}</b> 💠 (${Math.floor(S.gem / GACHA.cost)} Rufe)`, 'Sternkristalle gibt es für neue Boss-Siege und den täglichen Lohn.'] : [], lock: gachaOpen(S) ? '' : 'Ab dem 1. Aufstieg', acts: '<button class="btn" data-m="go" data-go="ruf">Zum Sternenruf</button>' },
      { title: 'Kopfgeldjagd', art: ['kopf1', 'kopf2'], icon: '📜', col: '#d9935a', rot: 1.5, desc: 'Jeden Tag drei Steckbriefe: Bosse der Ahnenprüfung mit Großangriffen und Schwachstellen. Jeder bringt einmal am Tag Sternkristalle.',
        info: gachaOpen(S) ? [`Heute erledigt: <b>${[0, 1, 2].filter(i => bountyDone(S, i)).length}/3</b>`] : [], lock: gachaOpen(S) ? '' : 'Ab dem 1. Aufstieg', acts: '<button class="btn" data-m="go" data-go="kopf">Steckbriefe ansehen</button>' },
      { title: 'Albtraum-Truhen', art: ['truhe1', 'truhe2'], icon: '🧰', col: '#b06bff', rot: -1, desc: 'Im Albtraum ab Stufe 151 lässt jeder Boss eine Truhe fallen. Darin: Gold, Seelen, Heldenteile und Lager-Deko. Je tiefer du kommst, desto besser die Truhen.',
        info: [`Ungeöffnet: <b>${chestCount(S)}</b>${[4, 3, 2].filter(r => S.chest && S.chest[r]).map(r => ` · <b style="color:${RAR_COL[r]}">${S.chest[r]} ${RAR[r]}</b>`).join('')}`], lock: (S.bestEver || 0) > 150 || chestCount(S) ? '' : 'Ab Stufe 151 (Albtraum)', acts: `<button class="btn" data-m="go" data-go="truhen">${chestCount(S) ? 'Truhen öffnen' : 'Ansehen'}</button>` },
      { title: 'Lager einrichten', art: ['deko1', 'deko2'], icon: '🏕️', col: '#ffb547', rot: 1.5, desc: 'Zelt, Feuer, Banner, Himmel, ein Tier und drei Trophäen. Nur fürs Auge, ohne Boni. Doppelte Stücke werden gesammelt.',
        info: [`Deko-Stücke: <b>${Object.keys(S.inv || {}).filter(id => ITEMS[id] && ITEMS[id].cat === 'deco').length}</b> · Trophäen: <b>${TROPHY_N.filter((n, i) => invN(S, 'd_tr_' + i)).length}/${TROPHY_N.length}</b>`], acts: '<button class="btn" data-m="go" data-go="deko">Einrichten</button>' },
    ];
    const nb = boardNew(); list.forEach(o => (o.isNew = nb.includes(POSTER_ID[o.title])));
    S.knownBoard = [...new Set([...(S.knownBoard || []), ...nb])]; save(); setTimeout(action, 0);
    modal(`<div class="rl-boardhead"><h2>Anschlagbrett</h2><p>Wähle dein nächstes Abenteuer</p></div>
      <div class="rl-posters">${list.map(poster).join('')}</div>
      <div class="row" style="justify-content:center"><button class="btn ghost rl-boardclose" data-m="ok">Schließen</button></div>`, 'rl-anschlag');
  }
  function boardGo(go) {
    if (!inCamp()) return;
    const toTab = id => { tab = id; confirm = ''; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    if (go === 'normal') startRun();
    else if (go === 'weekly') startRun('weekly');
    else if (go === 'tower' && feature(S, 'turm')) startRun('tower');
    else if (go === 'area') showAreas(true);
    else if (go === 'ahn' && ahnOpen(S)) { startRun('ahnen'); save(); }
    else if (go === 'ahnmap') toTab('ahnen');
    else if (go === 'exp' && run && run.mission && MISSION[run.mission]) { S.exp.mission = run.mission; startRun('exp'); }
    else if (go === 'exp') toTab('exp');
    else if (go === 'sigil') toTab('ahnen');
    else if (go === 'trips') showTrips();
    else if (go === 'ruf' && gachaOpen(S)) showBanner();
    else if (go === 'kopf' && gachaOpen(S)) showBounty();
    else if (go === 'login') showLogin();
    else if (go === 'deko') showCamp();
    else if (go === 'truhen') showChests();
    else if (go === 'bountyrun') { $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (go === 'wboss') showWboss();
    else if (go.startsWith('hero:')) toTab(go.slice(5));
    if (['normal', 'weekly', 'tower', 'ahn'].includes(go) || (go === 'exp' && run && !run.dead)) $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- Fenster: Willkommen und Neuigkeiten ---------- */
  function modal(html, cls = '') {
    const p = $('#picker');
    p.innerHTML = `<div class="sheet rl-modal ${cls}" role="dialog">${html}</div>`;
    p.hidden = false;
    p.onclick = e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      p.hidden = true; p.onclick = null;
      if (b.dataset.m === 'area') { S.area = Math.max(0, Number(b.dataset.z) || 0); save(); refresh(); if (b.dataset.back === 'board') showBoard(); }
      if (b.dataset.m === 'areaback') showBoard();
      if (b.dataset.m === 'go') boardGo(b.dataset.go);
      if (b.dataset.m === 'save') { tab = 'stand'; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
  }
  function showAreas(fromBoard) {
    const max = areaMax(S), cur = Math.min(S.area || 0, max), cap = capOf(S);
    let rows = '';
    for (let z = 0; z <= max + 1; z++) {
      const s0 = 10 * z + 1; if (s0 > cap) break;
      const bm = biomeOf(s0), lock = z > max;
      rows += `<button class="rl-areab ${z === cur ? 'on' : ''} ${lock ? 'locked' : ''}" ${lock ? 'disabled' : `data-m="area" data-z="${z}"${fromBoard ? ' data-back="board"' : ''}`} style="--a1:${bm.sky[0]};--a2:${bm.hill[0]};--a3:${bm.ground[0]}">
        <span class="sw"></span><span class="tx"><b>${esc(zoneName(s0))}${z === cur ? ' · gewählt' : ''}</b><small>Stufe ${s0}–${s0 + 9} · Boss: ${esc(bossOf(s0))}${z ? ` · Fernkämpfer: ${esc(rangedName(s0))}` : ' · keine Fernkämpfer'}</small>
        ${lock ? `<small class="lk">Gesperrt – besiege zuerst: ${esc(bossOf(s0 - 1))} auf Stufe ${s0 - 1}</small>` : ''}</span></button>`;
    }
    modal(`<h2>Startgebiet wählen</h2>
      <p class="note">Ein Gebiet wird frei, sobald du den Boss davor besiegt hast. Bis zur nächsten Wiedergeburt bleibt es frei. Für übersprungene Bosse bekommst du beim Start ein Drittel ihrer Seelen. Ein früherer Start lohnt sich also, wenn dir Seelen fehlen.</p>
      <div class="rl-areas">${rows}</div><div class="row" style="justify-content:center"><button class="btn ghost" data-m="${fromBoard ? 'areaback' : 'ok'}">${fromBoard ? '‹ Zurück zum Brett' : 'Schließen'}</button></div>`);
    const on = $('#picker .rl-areab.on'); if (on) on.scrollIntoView({ block: 'center' });
  }
  function showExpInfo() {
    S.seenExp = true; save();
    modal(`<span class="rl-mic" style="border-color:#9bd14a;color:#9bd14a">◈</span><h2>Neu: Expeditionen</h2>
      <ul class="rl-list"><li>Im neuen Reiter <b>Expedition</b> spielst du kurze Missionen für einen Helden deiner Wahl.</li>
      <li>Jede geschaffte Mission gibt sicher <b>Heldensplitter</b>. Jedes fehlende Puzzleteil hat dazu 0,5 % Chance.</li>
      <li>Mit Splittern kaufst du gezielt Puzzleteile. 6 Teile ergeben einen neuen Helden: <b>Assassine, Nekromant, Barde, Druidin oder Tüftlerin</b>.</li></ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Zu den Expeditionen</button></div>`);
    tab = 'exp'; renderTabs(); panel();
  }
  // Neuigkeiten: neueste Einträge oben. Neue Updates OBEN mit höherer id anhängen.
  // Neuigkeiten ab Version 1.0. Neue Einträge oben anfügen, mit fortlaufender id.
  // Neuigkeiten, neueste zuerst. Jede Neuerung als kurzer Stichpunkt. id immer hochzählen.
  const UPDATES = [
    { id: 8, title: 'Darstellung verbessert', date: '24.10.2026', items: [
      ['Fix', 'Heldenpfad, Fertigkeitenbaum und Läden werden nicht mehr zusammengedrückt'],
      ['Fix', 'Am PC füllt das Spielfeld die linke Seite, das Menü ist breiter'],
      ['Fix', 'Handy quer: Spielfeld und Menü passen besser, Beschreibung verdeckt den Baum nicht mehr'],
      ['Umstellung', 'Die Startseite heißt jetzt Game Hub'],
    ] },
    { id: 7, title: 'Weniger Datenverbrauch', date: '24.10.2026', items: [
      ['Fix', 'Musik wird nur noch einmal geladen und im Browser gespeichert'],
      ['Fix', 'Spiel-Datei wird komprimiert geladen (etwa 70 % kleiner)'],
      ['Umstellung', 'Online-Speichern und Abfragen nur, solange das Spiel im Vordergrund ist'],
      ['Umstellung', 'Freunde und Gilde werden seltener abgefragt, wenn ihr Fenster zu ist'],
    ] },
    { id: 6, title: 'Sammlung: Heldenteile, Truhen und Lager-Deko', date: '24.10.2026', items: [
      ['Neu', 'Albtraum-Truhen: Ab Stufe 151 lässt jeder Boss eine Truhe fallen (gewöhnlich, selten, episch, legendär)'],
      ['Neu', 'Gewöhnliche Truhen geben Gold oder Seelen, die anderen Heldenteile und Lager-Deko'],
      ['Neu', 'Jeder Held hat eigene Teile: 3 Färbungen, ein episches und ein legendäres Set'],
      ['Neu', 'Legendäre Sets leuchten; alle drei Teile zusammen geben eine Aura und eine passende Waffe'],
      ['Neu', 'Aussehen ändern über den 👕-Knopf in der Heldenkarte'],
      ['Neu', 'Lager einrichten: Zelt, Feuer, Banner, Himmel, Tier und 3 Trophäen (am Brett oder Zelt antippen)'],
      ['Neu', 'Trophäen: Feldzug-Bosse lassen selten ihre Trophäe fallen'],
      ['Neu', 'Banner-Sets: 10, 30 und 60 Rufe auf dem Sonderbanner geben Banner, Feuer und Zelt des Helden'],
      ['Info', 'Deko und Heldenteile geben keine Boni, doppelte Stücke werden gesammelt'],
    ] },
    { id: 5, title: 'Sternenruf früher', date: '24.10.2026', items: [
      ['Umstellung', 'Ewiger Himmel und Kopfgeldjagd öffnen schon mit dem 1. Aufstieg'],
      ['Info', 'Das Sonderbanner kommt weiterhin mit dem 2. Aufstieg'],
      ['Neu', 'Sternkristalle sammelt man schon ab der 1. Wiedergeburt'],
      ['Neu', 'Beim Öffnen gibt es einmal 10 Rufe geschenkt'],
      ['Umstellung', 'Fehlende Fünf-Sterne-Helden: jede Kopie gibt 3 Puzzleteile, zwei Kopien schalten frei'],
    ] },
    { id: 4, title: 'Neue Oberfläche', date: '24.10.2026', items: [
      ['Neu', 'Alles passt auf einen Bildschirm, nur das Menü scrollt'],
      ['Neu', 'Untere Leiste mit Symbolen wie in einem Handyspiel'],
      ['Neu', 'Gold, Seelen und Sternkristalle immer oben sichtbar'],
      ['Neu', 'Der ?-Knopf blendet Erklärtexte ein und aus'],
      ['Neu', 'Am PC: Spielfeld links, Menü rechts'],
    ] },
    { id: 3, title: 'Sternenruf', date: '24.10.2026', items: [
      ['Neu', 'Sternenruf: Helden mit Sternkristallen rufen'],
      ['Neu', 'Zwei Banner: Ewiger Himmel (alle gleich) und Sternenruf (alle 2 Wochen ein neuer hervorgehobener Held)'],
      ['Neu', 'Sternbilder: Kopien stärken einen Helden, jeder Held hat eigene Sternbilder'],
      ['Neu', 'Neue Ruf-Animation mit Sternwarte und Karten zum Umdrehen'],
      ['Neu', 'Täglicher Lohn: jeden Tag ein Geschenk, am 7. Tag das größte'],
      ['Neu', 'Kopfgeldjagd: täglich drei Steckbriefe mit Sternkristallen'],
      ['Neu', 'Sternkristalle auch von neuen Boss-Siegen, Heldenreisen und dem Wochenboss'],
    ] },
    { id: 2, title: 'Ahnenprüfung und Heldenwerte', date: '24.10.2026', items: [
      ['Umstellung', 'Ahnenprüfung neu: Großangriffe mit Schildwall abwehren und Schwachstellen antippen'],
      ['Neu', 'Segen: Nach jedem Boss einen Segen wählen, er gilt für die ganze Prüfung'],
      ['Neu', '📊 Werte: alle Werte eines Helden und seiner Fähigkeiten auf einen Blick'],
      ['Umstellung', 'Meisterschafts-Skins färben die Figur jetzt richtig um statt eines Farbfilters'],
    ] },
    { id: 1, title: 'Wochenboss, Gilden und neue Grafik', date: '24.10.2026', items: [
      ['Neu', 'Wochenboss mit unendlich vielen Lebensleisten, jede Leiste macht ihn stärker'],
      ['Neu', 'Beute für jede abgezogene Leiste, der beste Versuch zählt für die Gruppenziele'],
      ['Neu', '3 Wochenbosse im Wechsel'],
      ['Neu', 'Gilden mit bis zu 5 Spielern: per Einladung oder Anfrage beitreten'],
      ['Info', 'Ohne Gilde kommt man in eine Zufallsgruppe'],
      ['Neu', 'Neue Grafik für alle Helden, Begleiter, Beschwörungen, Gegner und Bosse'],
      ['Neu', 'Neue Bosse in der Ahnenprüfung'],
    ] },
  ];
  const GAME_VERSION = '1.0';
  const newsSeen = () => { try { return Number(localStorage.getItem('fsg.ritter.news')) || 0; } catch { return 0; } };
  const TAGC = { Neu: '#7ee08a', Balance: '#ffcf4a', Fix: '#7fb2ff', Info: '#c9a6ff', Umstellung: '#ff9a8a' };
  function showUpdates() {
    try { if (UPDATES.length) localStorage.setItem('fsg.ritter.news', String(UPDATES[0].id)); } catch {}
    hud();
    modal(`<span class="rl-mic">📰</span><h2>Neuigkeiten</h2><p class="note">Ritterlauf ${GAME_VERSION}</p>${UPDATES.length ? '' : '<p>Hier erscheinen ab jetzt alle Neuerungen und Änderungen am Spiel.</p>'}<div class="rl-upd">${UPDATES.map((u, i) => `<details ${i === 0 ? 'open' : ''}><summary><b>${esc(u.title)}</b><small>${u.date}</small></summary>
      <ul>${u.items.map(([tag, txt]) => `<li><span class="tag" style="--tc:${TAGC[tag] || '#aaa'}">${tag}</span>${esc(txt)}</li>`).join('')}</ul></details>`).join('')}</div>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Schließen</button></div>`);
  }
  function showInfInfo() {
    const r = S.infNews; delete S.infNews; save();
    modal(`<span class="rl-mic">∞</span><h2>Endlos-Fertigkeiten neu</h2>
      <ul class="rl-list"><li>Jede Klasse hat jetzt ein eigenes Paar Endlos-Fertigkeiten, die auf die ganze Gruppe wirken.</li>
      <li>Deine bisher gekauften Endlos-Stufen wurden zurückgegeben: <b>${coin}${fmt(r.g)}</b> und <b>${soul}${fmt(r.s)}</b>. Damit kannst du sie neu verteilen.</li>
      <li>Die Endlos-Fertigkeiten des Ritters (Schaden und Leben) bleiben unverändert.</li></ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Verstanden</button></div>`);
  }
  // Hinweis bei jedem Start: Testphase
  function openChain() { if (seasonNote) seasonInfo(); else if (!S.seenIntro) showIntro(); else if (S.news && !cine) showNews(); else if (S.keyNews != null) showKeyInfo(); else if (S.infNews) showInfInfo(); else if (!S.seenField && HEROES.filter(h => hired(S, h.tree)).length > fieldSlots(S)) showFieldInfo(); else if (expOpen(S) && !S.seenExp) showExpInfo(); }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-beta]')) setTimeout(() => { if (active) openChain(); }, 80); }, true);
  let betaShown = false;
  // Sitzender Ritter auf einem Baumstamm, für den Startbildschirm
  // Baumstamm am Lagerfeuer (Sitzplatz des Ritters)
  function campLog(x) {
    rr(x - 22, GROUND - 17, 44, 17, 7); fillO(LG(GROUND - 17, GROUND, '#7a5434', '#4a3220'));
    ctx.strokeStyle = 'rgba(40,25,15,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 20, GROUND - 8.5, 3, 7, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 16, GROUND - 11); ctx.lineTo(x + 8, GROUND - 11); ctx.stroke();
  }
  // angewinkelte Beine des sitzenden Ritters
  function sitLegs(x) { for (const [dx, k] of [[-4, 0], [3, 1]]) { rr(x + dx - 2, GROUND - 22, 18, 7, 3); fillO(k ? '#e9edf3' : '#c6ccd6'); rr(x + dx + 11, GROUND - 19, 7, 17, 3); fillO(k ? '#e9edf3' : '#c6ccd6'); rr(x + dx + 10, GROUND - 5, 11, 5, 2); fillO('#4a4e5a'); } }
  // Sitzender Ritter auf einem Baumstamm (lean: nach vorne beugen beim Aufstehen)
  function knightSit(x, t, lean = 0, noLog = false) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + 4, GROUND + 1, 30, 4, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(x - 70, 0, 140, GROUND - 17); ctx.clip(); ctx.translate(x, GROUND - 17); ctx.rotate(lean); ctx.translate(-x, -(GROUND - 17)); ctx.translate(0, 5); DRAW.r(x, null, t * 0.5, false); ctx.restore();
    if (!noLog) campLog(x);
    sitLegs(x);
  }
  // Ritter steht auf: k = 0 (sitzt) bis 1 (steht), wandert dabei vom Stamm zu seinem Platz
  function knightRise(x0, x1, t, k) {
    const e = k * k * (3 - 2 * k), x = x0 + (x1 - x0) * e, dy = 5 * (1 - e), clipB = GROUND - 17 + 17 * e + 0.01;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 70, 0, 140, clipB); ctx.clip(); ctx.translate(0, dy); DRAW.r(x, null, t, false); ctx.restore();
    if (e < 1) { const pa = ctx.globalAlpha; ctx.globalAlpha = pa * (1 - e); sitLegs(x0 + (x1 - x0) * e * 0.5); ctx.globalAlpha = pa; }
    if (k > 0.3 && k < 1) for (let i = 0; i < 5; i++) { const p = (k - 0.3) / 0.7; ctx.fillStyle = `rgba(200,180,150,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(x - 10 + i * 6 + (i - 2) * p * 8, GROUND - 2 - p * 6 * (1 + (i % 2)), 2 + p * 3, 0, 7); ctx.fill(); }
  }
  // Teleport-Strahl in der Farbe des Helden (tb: Sekunden seit Beginn); gibt die Sichtbarkeit des Helden zurück
  function heroBeam(x, col, tb) {
    if (tb < 0) return 0;
    const rgb = hexRgb(col), grow = Math.min(1, tb / 0.2), fade = tb < 0.2 ? 1 : Math.max(0, 1 - (tb - 0.2) / 0.5);
    if (fade > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const w = 12 + 10 * (1 - fade) + 4 * Math.sin(tb * 40) * fade, bot = GROUND * grow;
      const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.35, `rgba(${rgb},${0.55 * fade})`); g.addColorStop(0.5, `rgba(255,255,255,${0.9 * fade})`); g.addColorStop(0.65, `rgba(${rgb},${0.55 * fade})`); g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - w, 0, w * 2, bot);
      glowDot(x, bot - 4, 26 * fade + 6, rgb, fade);
      if (tb > 0.2) { const p = (tb - 0.2) / 0.5; ctx.strokeStyle = `rgba(${rgb},${0.8 * (1 - p)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, GROUND + 1, 10 + p * 34, 3 + p * 6, 0, 0, 7); ctx.stroke(); }
      for (let i = 0; i < 6; i++) { const q = (tb * 1.8 + i / 6) % 1; glowDot(x + Math.sin(i * 2.1 + tb * 9) * (8 + q * 10), GROUND - q * 70, 2, rgb, fade * (1 - q)); }
      ctx.restore();
    }
    return Math.max(0, Math.min(1, (tb - 0.16) / 0.2));
  }
  function titleScene(t) {
    const env = ENV_CAMP, fx = 262; env.back(t, 0); env.props(t, 0);
    lightPool(fx, GROUND - 14, 170 + Math.sin(t * 5) * 7, '255,150,60', 0.36); lightPool(fx, GROUND - 8, 70, '255,200,120', 0.28);
    const tx = 350; ctx.beginPath(); ctx.moveTo(tx - 52, GROUND); ctx.lineTo(tx, GROUND - 74); ctx.lineTo(tx + 52, GROUND); fillO('#7a6046');
    ctx.fillStyle = '#2a1f17'; ctx.beginPath(); ctx.moveTo(tx - 11, GROUND); ctx.lineTo(tx, GROUND - 34); ctx.lineTo(tx + 11, GROUND); ctx.fill();
    ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(tx, GROUND - 74); ctx.lineTo(tx, GROUND - 92); ctx.lineTo(tx + 17 + Math.sin(t * 3) * 1.5, GROUND - 86); ctx.lineTo(tx, GROUND - 80); ctx.fill();
    knightSit(206, t);
    ctx.save(); ctx.translate(fx, GROUND); ctx.scale(1.35, 1.35); ctx.translate(-fx, -GROUND); campFire(fx, t, true); ctx.restore();
    for (let i = 0; i < 6; i++) { const ph = (t * 0.35 + i / 6) % 1; glowDot(fx + Math.sin(i * 2.3 + t) * 10, GROUND - 24 - ph * 90, 2.2, '255,180,90', 0.8 * (1 - ph)); }
    env.front(t, 0);
  }
  // Helden, die im Lager stehen
  const campHeroes = () => HEROES.filter(h => st[h.id] && (!st.field || st.field.includes(h.id))).map(h => h.id);
  // Zeitplan des Einstiegs: Aufstehen, dann ein Strahl pro Held
  function introTimes(camp) {
    const n = camp.filter(k => k !== 'r').length, gap = Math.min(0.28, 1.3 / Math.max(1, n)), start = 0.85;
    return { start, gap, end: n ? start + gap * (n - 1) + 0.55 : 1.1 };
  }
  let intro = null;
  function showTitle() {
    if (document.querySelector('.rl-title')) return;
    const camp = !(run && !run.dead) && !cine;
    intro = camp ? { t0: null } : null;
    const ov = document.createElement('div'); ov.className = 'rl-title';
    ov.innerHTML = `<canvas width="960" height="540"></canvas><div class="rl-ttext"><h1>Ritterlauf</h1><p>Legenden am Lagerfeuer</p><button class="btn rl-tplay">Spielen</button><small>Version ${GAME_VERSION}</small></div>`;
    document.body.appendChild(ov);
    const c = ov.querySelector('canvas'), g = c.getContext('2d'); let alive = true, raf2 = 0;
    const frame = now => {
      if (!alive) return; const main = ctx, ms = scale; ctx = g;
      try { if (camp) { scale = 2; draw(now / 1000); } else { g.setTransform(2, 0, 0, 2, 0, 0); titleScene(now / 1000); } } catch (e) {} finally { ctx = main; scale = ms; }
      raf2 = requestAnimationFrame(frame);
    };
    raf2 = requestAnimationFrame(frame);
    let shrunk = false, tm = 0;
    const shrink = () => {
      if (shrunk) return; shrunk = true; clearTimeout(tm);
      const target = document.querySelector('#soloCanvas canvas') || document.querySelector('#soloCanvas'), r = target ? target.getBoundingClientRect() : null;
      ov.classList.add('go');
      if (r && r.width > 0) { ov.style.left = r.left + 'px'; ov.style.top = r.top + 'px'; ov.style.width = r.width + 'px'; ov.style.height = r.height + 'px'; }
      setTimeout(() => { ov.classList.add('fade'); }, 950);
      setTimeout(() => { alive = false; cancelAnimationFrame(raf2); ov.remove(); if (active) openChain(); }, 1350);
    };
    const go = () => {
      if (ov.classList.contains('play')) { shrink(); return; } // zweiter Klick: Einstieg abkürzen
      ov.classList.add('play'); SND.play && SND.play('tick');
      if (!camp || !intro) { shrink(); return; }
      intro.t0 = performance.now() / 1000;
      tm = setTimeout(shrink, Math.max(400, (introTimes(campHeroes()).end - 0.1) * 1000));
    };
    ov.querySelector('.rl-tplay').onclick = e => { e.stopPropagation(); go(); };
    ov.addEventListener('click', () => { if (ov.classList.contains('play')) shrink(); });
    ov.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(); });
    setTimeout(() => { const b = ov.querySelector('.rl-tplay'); if (b) b.focus(); }, 50);
  }
  function showBeta() {
    modal(`<span class="rl-mic">🧪</span><h2>Testphase</h2>
      <p>Ritterlauf wird gerade auf <b>Balancing und Design</b> getestet. Deshalb werden <b>alle Spielstände demnächst zurückgesetzt</b>.</p>
      <p class="note">Ihr könnt das Spiel aber trotzdem gerne testen. Über Rückmeldungen freuen wir uns!</p>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok" data-beta="1">Alles klar, los geht's</button></div>`);
  }
  function showKeyInfo() {
    const back = S.keyNews, inf = S.infNews; delete S.keyNews; delete S.infNews; save();
    modal(`<span class="rl-mic">⚿</span><h2>Neu: Schlüsselsockel</h2>
      <ul class="rl-list"><li>Jeder Held hat <b>1 festen Sockel</b> für eine Schlüssel-Fertigkeit.</li>
      <li>Für jede Wiedergeburt bekommst du <b>1 weiteren Sockel</b>, den du auf einen beliebigen Helden setzt. Diese Sockel bleiben auch beim Aufstieg.</li>
      <li>Du hast <b>${kSlots(S)} Sockel</b> zum Verteilen (so viele Wiedergeburten hast du gemacht). Setzen und Abnehmen geht oben im Fertigkeitenbaum jedes Helden.</li>
      ${back ? `<li>Deine ${back} Schlüssel-Fertigkeit${back > 1 ? 'en wurden' : ' wurde'} abgenommen. Gold und Seelen hast du komplett zurück.</li>` : ''}
      ${inf ? `<li><b>Endlos-Fertigkeiten:</b> Jede Klasse hat jetzt ein eigenes Paar. Deine bisherigen Endlos-Stufen (außer beim Ritter) wurden zurückgegeben: <b>${coin}${fmt(inf.g)}</b> und <b>${soul}${fmt(inf.s)}</b>.</li>` : ''}</ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Verstanden</button></div>`);
  }
  function showFieldInfo() {
    S.seenField = true; save();
    const f = fieldOf(S);
    modal(`<span class="rl-mic">⚑</span><h2>Neu: Aufstellung</h2>
      <ul class="rl-list"><li>Auf dem Feld ist jetzt Platz für <b>${fieldSlots(S)} Helden</b>. Die anderen warten am Lagerfeuer. Ihre Fertigkeiten und Runen bleiben erhalten.</li>
      <li>Gerade kämpfen: <b>${f.map(id => HERO_BY_ID[id].name).join(', ')}</b>. Über den Helden-Karten im Lager wechselst du aus.</li>
      <li>Mehr Plätze: <b>Fünfter Platz</b> im Sternen-Laden (40 Sterne) und <b>Sechster Platz</b> im Kronen-Laden (10 Kronen).</li></ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Verstanden</button></div>`);
  }
  function showIntro() {
    S.seenIntro = true; save();
    modal(`<span class="rl-mic">⚔</span><h2>Willkommen im Ritterlauf</h2>
      <p class="note">Dein Ritter sitzt am Lagerfeuer und wartet auf sein erstes Abenteuer. So geht es los:</p>
      <ol class="rl-howto">
        <li><span>⚔️</span><div><b>Feldzug starten</b><small>Tippe unten auf „Feldzug starten“. Dein Ritter läuft los und kämpft ganz von allein, Stufe um Stufe, bis er fällt.</small></div></li>
        <li><span>🪙</span><div><b>Beute sammeln</b><small>Jeder Gegner gibt Gold. Alle 10 Stufen wartet ein Boss, der Seelen fallen lässt.</small></div></li>
        <li><span>🌳</span><div><b>Stärker werden</b><small>Zurück im Lager kaufst du im Reiter „Ritter“ mit Gold und Seelen neue Fertigkeiten. Dann kommst du beim nächsten Lauf weiter.</small></div></li>
        <li><span>🔁</span><div><b>Immer wieder</b><small>Laufen, verbessern, weiter kommen. Alles Weitere schaltet sich nach und nach frei und wird dann erklärt.</small></div></li>
      </ol>
      ${acct ? '' : `<div class="rl-savebox"><b>Tipp: Sichere deinen Fortschritt</b><span>Lege im Reiter „Spielstand“ einen Namen und ein Passwort fest. Dann geht nichts verloren und du kannst auf jedem Gerät weiterspielen.</span></div>`}
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Los geht’s</button>${acct ? '' : '<button class="btn ghost" data-m="save">Spielstand anlegen</button>'}</div>`);
  }
  function newsList(n) {
    const items = [];
    if (n.kind === 'rebirth') {
      const road = ROADMAP.find(x => x.r === n.n);
      if (road) items.push(road.text);
      items.push(`Stufen bis ${capOf(S) === Infinity ? '∞ (Albtraum-Stufen)' : capOf(S)} sind jetzt offen`);
      items.push(`+1 Schlüsselsockel (jetzt ${kSlots(S)}), den du auf einen beliebigen Helden setzen kannst`);
      items.push(`+${n.stars} Sterne für den Sternen-Laden`);
      const nextR = ROADMAP.find(x => x.r === n.n + 1);
      if (nextR) items.push(`Nächste Wiedergeburt ab Stufe ${reqOf(S)}: ${nextR.text}`);
      if (n.n >= 9) items.push('Der Aufstieg ist jetzt möglich, sobald du Stufe 150 erreichst');
    } else {
      items.push(`+${n.crowns} Kronen für den Kronen-Laden`);
      if (n.n === 1) items.push('Neuer Reiter Expedition: Missionen geben Heldensplitter und Puzzleteile für 5 neue Helden');
      const road = ASC_ROAD.find(x => x.a === n.n); if (road) items.push(road.text);
      items.push(`Gegner sind jetzt ×${Math.pow(1.6, n.n).toFixed(1).replace('.', ',')} so stark wie am Anfang`);
      items.push('Der Wiedergeburt-Fahrplan beginnt von vorn – mit deinen Kronen-Boni geht es viel schneller');
    }
    return items;
  }
  function showNews() {
    const n = S.news; if (!n) return;
    S.news = null; save();
    const title = n.kind === 'asc' ? `Aufstieg ${n.n}!` : `Wiedergeburt ${n.n}!`;
    modal(`<span class="rl-mic ${n.kind === 'asc' ? 'crown' : ''}">${n.kind === 'asc' ? '♛' : '✦'}</span><h2>${title}</h2>${n.rank ? `<p class="rl-rankup" style="--rc:${rankOf(n.n).col}">${rankBadge(n.n)} Neuer Rang: <b>${esc(n.rank)}</b>${n.rankBonus ? ` · <span class="rl-cur crown">${crown}+${n.rankBonus}</span> Kronen als Rang-Geschenk` : ''}</p>` : ''}<p class="note">Das ist neu:</p>
      <ul class="rl-list">${newsList(n).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Weiter</button></div>`);
  }
  /* ---------- Ahnenprüfung: Karte, Missionen, Siegel ---------- */
  let ahnSel = null;
  // Schwebende Inseln im All, Mission 10 ist das Schloss der Ahnen
  const AHN_PTS = [[58, 322], [148, 284], [90, 206], [176, 142], [268, 188], [338, 274], [430, 306], [432, 216], [366, 124], [516, 150]];
  const ahnRnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function ahnIslandTop(i, c) {
    // Themen-Akzente auf der Insel (Koordinaten: Mitte der Oberseite = 0,0)
    const g = [];
    const tree = (x, s, a, b) => `<g transform="translate(${x},0) scale(${s})"><rect x="-1.2" y="-6" width="2.4" height="6" fill="#6b4a2c"/><circle cy="-10" r="6" fill="${a}"/><circle cx="-3" cy="-8" r="4" fill="${b}"/></g>`;
    const pine = (x, s, a) => `<g transform="translate(${x},0) scale(${s})"><rect x="-1" y="-4" width="2" height="4" fill="#3a2a1a"/><path d="M0,-20 L7,-4 L-7,-4 Z" fill="${a}"/><path d="M0,-25 L5,-12 L-5,-12 Z" fill="${a}" opacity=".85"/></g>`;
    switch (i) {
      case 0: g.push(tree(-12, 1, '#5fc45a', '#8ae07a'), tree(10, 0.8, '#4fae4e', '#7ed06e'), `<circle cx="-2" cy="-2" r="1.6" fill="#ffd23f"/><circle cx="4" cy="-1.5" r="1.4" fill="#ff8ab8"/><circle cx="18" cy="-2" r="1.5" fill="#fff"/>`); break;
      case 1: g.push(pine(-14, 1, '#1f5a3a'), pine(-2, 1.25, '#174a30'), pine(12, 0.95, '#226240'), `<circle cx="4" cy="-14" r="1.5" fill="#ffe58a"/><circle cx="7" cy="-14" r="1.5" fill="#ffe58a"/>`); break;
      case 2: g.push(`<path d="M-16,0 v-10 a5,5 0 0 1 10,0 v10 Z" fill="#8a84a8" stroke="#3a3450" stroke-width="1"/><path d="M4,0 v-8 h3 v-4 h3 v4 h3 v8 Z" fill="#a49ec0" stroke="#3a3450" stroke-width="1"/><path d="M-4,-1 h8 M-2,-3 l4,4" stroke="#e8e2d0" stroke-width="1.6"/><circle cx="-11" cy="-18" r="3" fill="#c9a6ff" opacity=".8"/>`); break;
      case 3: g.push(`<path d="M-18,0 L-2,-22 L4,-18 L16,0 Z" fill="#4a2a24" stroke="#1b0e0c" stroke-width="1.2"/><path d="M-5,-18 L-2,-22 L4,-18 L1,-14 Z" fill="#ff7a3d"/><path d="M-1,-14 Q2,-6 -3,0" stroke="#ffb547" stroke-width="2" fill="none"/><circle cx="1" cy="-26" r="3" fill="#ff9a3d" opacity=".7" class="ahn-smoke"/>`); break;
      case 4: g.push(`<path d="M-16,0 L-10,-16 L-6,-4 L0,-24 L5,-6 L10,-14 L16,0 Z" fill="#dff4ff" stroke="#6e8ba3" stroke-width="1"/><path d="M-3,-3 l3,-12 l3,12 Z" fill="#9fe0ff"/>`); break;
      case 5: g.push(`<ellipse cx="2" cy="-2" rx="14" ry="3.5" fill="#3a6a5a"/><ellipse cx="2" cy="-2.5" rx="10" ry="2" fill="#5a9a7a"/><path d="M-14,0 v-12 M-11,0 v-9 M14,0 v-11" stroke="#6a8a4a" stroke-width="1.5"/><ellipse cx="-14" cy="-13" rx="1.4" ry="3" fill="#8a5a2b"/><ellipse cx="14" cy="-12" rx="1.4" ry="3" fill="#8a5a2b"/><ellipse cx="0" cy="-10" rx="18" ry="4" fill="#c8e8d0" opacity=".25"/>`); break;
      case 6: g.push(`<path d="M-16,0 C-14,-14 -4,-6 -8,-20 M8,0 C12,-12 2,-10 6,-22 M-2,0 C0,-8 4,-6 2,-14" stroke="#3a6a2a" stroke-width="2.2" fill="none"/><circle cx="-8" cy="-20" r="3" fill="#ff6b9a"/><circle cx="6" cy="-22" r="3" fill="#ff8ab8"/><circle cx="2" cy="-14" r="2.4" fill="#ff6b9a"/>`); break;
      case 7: g.push(`<path d="M-10,0 v-14 l5,-6 l5,6 v14 Z M2,0 v-20 l5,-10 l5,10 v20 Z" fill="#3a2a5a" stroke="#1a1030" stroke-width="1"/><rect x="5" y="-16" width="4" height="5" rx="2" fill="#ffd27a"/><path d="M-20,-24 q3,-3 6,0 q3,-3 6,0" stroke="#2a1a3a" stroke-width="1.5" fill="none"/>`); break;
      case 8: g.push(`<path d="M-14,0 v-8 a14,12 0 0 1 28,0 v8 Z" fill="#e8e0ff" stroke="#4a3a7a" stroke-width="1.2"/><path d="M2,-16 l14,-10" stroke="#5a4a8a" stroke-width="3"/><circle cx="-6" cy="-24" r="1.6" fill="#fff"/><circle cx="12" cy="-30" r="1.2" fill="#ffd27a"/>`); break;
    }
    return g.join('');
  }
  function ahnIsland(i, x, y, st) {
    const M = AHN_MISSIONS[i], c = M.col, last = i === AHN_COUNT - 1, w = last ? 62 : 34, d = last ? 50 : 30;
    const glowA = st === 'done' ? 0.55 : st === 'cur' ? 0.75 : 0.35;
    if (last) return ahnCastle(x, y, st);
    let rocks = `<path d="M${-w},0 Q${-w * 0.7},${d * 0.5} ${-w * 0.35},${d * 0.7} L${-w * 0.15},${d} L0,${d * 1.25} L${w * 0.2},${d * 0.95} L${w * 0.45},${d * 0.6} Q${w * 0.8},${d * 0.4} ${w},0 Z" fill="url(#ahnRock)" stroke="#5a4a3a" stroke-width="1.2"/>`;
    rocks += `<path d="M${-w * 0.5},${d * 0.25} L${-w * 0.2},${d * 0.55} L${w * 0.05},${d * 0.4} M${w * 0.25},${d * 0.2} L${w * 0.1},${d * 0.7}" stroke="#ffd27a" stroke-width="1.2" fill="none" opacity=".8"/>`;
    rocks += `<path d="M${-w * 0.3},${d * 0.75} l2,8 l2,-8 M${w * 0.3},${d * 0.55} l1.5,7 l1.5,-7" fill="${c}" stroke="${c}" stroke-width="1" opacity=".9"/>`;
    return `<g class="ahn-isl" style="animation-delay:${-ahnRnd(i) * 6}s">
      <ellipse cx="0" cy="${d * 0.6}" rx="${w * 1.5}" ry="${d * 1.1}" fill="${c}" opacity="${glowA * 0.35}" filter="url(#ahnBlur)"/>
      ${rocks}
      <ellipse cx="0" cy="0" rx="${w}" ry="${w * 0.28}" fill="url(#ahnTop)" stroke="#fff6d8" stroke-width="1.4"/>
      <ellipse cx="0" cy="-1" rx="${w * 0.86}" ry="${w * 0.2}" fill="${c}" opacity=".55"/>
      ${ahnIslandTop(i, c)}
    </g>`;
  }
  function ahnCastle(x, y, st) {
    const tower = (tx, h, w, cap) => `<g transform="translate(${tx},0)"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" fill="url(#ahnWall)" stroke="#8a6a2a" stroke-width="1"/>
      <path d="M${-w / 2 - 2},${-h} L0,${-h - cap} L${w / 2 + 2},${-h} Z" fill="url(#ahnGold)" stroke="#8a6a2a" stroke-width="1"/><rect x="-1.5" y="${-h + 6}" width="3" height="6" rx="1.5" fill="#ffe8a8"/>
      <path d="M0,${-h - cap} v-8" stroke="#ffd27a" stroke-width="1"/><path d="M0,${-h - cap - 8} l7,2.5 l-7,2.5 Z" fill="#c9a6ff"/></g>`;
    return `<g class="ahn-isl" style="animation-delay:-2s">
      <g class="ahn-rays" opacity="${st === 'done' ? 0.6 : 0.85}">${[...Array(10)].map((_, k) => `<path d="M0,-50 L${Math.cos(k * 0.628) * 140},${-50 + Math.sin(k * 0.628) * 140} L${Math.cos(k * 0.628 + 0.12) * 140},${-50 + Math.sin(k * 0.628 + 0.12) * 140} Z" fill="#ffe8a8" opacity=".12"/>`).join('')}</g>
      <circle cx="0" cy="-50" r="70" fill="url(#ahnHalo)"/>
      <path d="M-70,0 Q-52,26 -28,34 L-10,52 L0,66 L12,50 L32,32 Q56,20 70,0 Z" fill="url(#ahnRock)" stroke="#8a6a2a" stroke-width="1.4"/>
      <path d="M-40,12 L-20,30 L0,22 M24,10 L12,40" stroke="#ffd27a" stroke-width="1.6" fill="none"/>
      <path d="M-18,40 l2,12 l2,-12 M20,30 l2,10 l2,-10 M0,60 l1.5,9 l1.5,-9" fill="#ffd27a" stroke="#ffd27a"/>
      <ellipse cx="0" cy="0" rx="70" ry="16" fill="url(#ahnTop)" stroke="#fff6d8" stroke-width="1.6"/>
      <rect x="-40" y="-26" width="80" height="26" fill="url(#ahnWall)" stroke="#8a6a2a" stroke-width="1"/>
      ${[...Array(9)].map((_, k) => `<rect x="${-40 + k * 9.4}" y="-30" width="5" height="5" fill="#fff4dc" stroke="#8a6a2a" stroke-width=".6"/>`).join('')}
      ${tower(-46, 46, 14, 16)}${tower(46, 46, 14, 16)}${tower(-24, 64, 12, 14)}${tower(24, 64, 12, 14)}${tower(0, 86, 18, 22)}
      <path d="M-8,0 v-14 a8,8 0 0 1 16,0 v14 Z" fill="#3a2a10" stroke="#8a6a2a" stroke-width="1"/><path d="M-6,-1 v-12 a6,6 0 0 1 12,0 v12" fill="#ffd27a" opacity=".55"/>
      <path d="M-12,-104 l-4,-9 l7,4 l5,-10 l4,10 l7,-4 l-4,9 Z" transform="translate(4,0)" fill="#ffd27a" stroke="#8a6a2a" stroke-width="1" class="ahn-crown"/>
    </g>`;
  }
  function ahnMap() {
    const cur = S.ahn.m, sel = ahnSel == null ? cur : ahnSel;
    const stars = [...Array(90)].map((_, i) => { const r = ahnRnd(i * 3 + 1); return `<circle cx="${(ahnRnd(i * 7 + 2) * 600).toFixed(1)}" cy="${(ahnRnd(i * 11 + 5) * 380).toFixed(1)}" r="${(0.4 + r * 1.3).toFixed(2)}" fill="${r > 0.85 ? '#ffe8b0' : r > 0.7 ? '#c9d8ff' : '#fff'}" class="${i % 3 ? '' : 'ahn-tw'}" style="animation-delay:${(-r * 4).toFixed(2)}s"/>`; }).join('');
    const bridges = AHN_PTS.slice(1).map(([x1, y1], i) => { const [x0, y0] = AHN_PTS[i], mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 26, done = i < cur;
      return `<path d="M${x0},${y0} Q${mx},${my} ${x1},${y1}" fill="none" stroke="${done ? '#7fd4ff' : '#ffd27a'}" stroke-width="5" opacity="${done ? 0.35 : 0.18}" filter="url(#ahnBlur2)"/>
        <path d="M${x0},${y0} Q${mx},${my} ${x1},${y1}" fill="none" stroke="${done ? '#bfeaff' : i === cur - 0 ? '#ffe8a8' : 'rgba(255,232,168,.5)'}" stroke-width="1.6" stroke-dasharray="2 6" stroke-linecap="round" class="ahn-flow"/>`; }).join('');
    const isl = AHN_PTS.map(([x, y], i) => {
      const st = i < cur ? 'done' : i === cur ? 'cur' : 'later', last = i === AHN_COUNT - 1, M = AHN_MISSIONS[i];
      const bx = last ? 0 : 0, by = last ? 30 : 22, col = st === 'done' ? '#4fc3ff' : '#e5484d';
      return `<g class="ahn-node ${st} ${i === sel ? 'sel' : ''}" data-ahn="${i}" transform="translate(${x},${y})" role="button" aria-label="Mission ${i + 1}: ${esc(M.name)}">
        ${ahnIsland(i, x, y, st)}
        <g transform="translate(${bx},${by})">${st === 'cur' ? `<circle r="15" fill="none" stroke="#ffb0b0" stroke-width="2.5" class="ahn-pulse"/>` : ''}
          <circle r="10" fill="${col}" stroke="#fff6d8" stroke-width="2"/><text y="3.8" text-anchor="middle" class="ahn-num">${st === 'done' ? '✓' : i + 1}</text></g>
        ${st === 'cur' ? `<g transform="translate(0,${last ? -128 : -46})"><g class="ahn-hero"><path d="M0,9 L-6,-2 L6,-2 Z" fill="#ffb547" stroke="#1b1726" stroke-width="1.4"/><circle cy="-6" r="6.5" fill="#ffb547" stroke="#1b1726" stroke-width="1.4"/><text y="-3" text-anchor="middle" font-size="8.5" fill="#2a1a00">⚔</text></g></g>` : ''}
        ${i === sel ? `<ellipse cx="0" cy="${last ? 0 : 0}" rx="${last ? 76 : 40}" ry="${last ? 20 : 12}" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="3 4" class="ahn-selring"/>` : ''}
      </g>`;
    }).join('');
    return `<div class="ahn-map"><svg viewBox="0 0 600 380" role="img" aria-label="Sternenkarte der Ahnenprüfung">
      <defs>
        <radialGradient id="ahnSpace" cx=".55" cy=".35" r=".9"><stop offset="0" stop-color="#1e1446"/><stop offset=".55" stop-color="#0c0824"/><stop offset="1" stop-color="#04030c"/></radialGradient>
        <linearGradient id="ahnRock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ead2"/><stop offset=".45" stop-color="#c8b48a"/><stop offset="1" stop-color="#6a5a46"/></linearGradient>
        <linearGradient id="ahnTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e8d8b0"/></linearGradient>
        <linearGradient id="ahnWall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#f0e2c0"/><stop offset="1" stop-color="#cdb888"/></linearGradient>
        <linearGradient id="ahnGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset="1" stop-color="#d8a040"/></linearGradient>
        <radialGradient id="ahnHalo"><stop offset="0" stop-color="#fff2c8" stop-opacity=".55"/><stop offset=".6" stop-color="#ffd27a" stop-opacity=".15"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
        <filter id="ahnBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
        <filter id="ahnBlur2"><feGaussianBlur stdDeviation="2.5"/></filter>
        <filter id="ahnNeb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
      </defs>
      <rect width="600" height="380" fill="url(#ahnSpace)"/>
      <g filter="url(#ahnNeb)" opacity=".75"><ellipse cx="120" cy="90" rx="120" ry="60" fill="#5a2a9a"/><ellipse cx="470" cy="250" rx="130" ry="60" fill="#1a5a7a"/><ellipse cx="320" cy="120" rx="90" ry="40" fill="#8a3a6a" opacity=".6"/><ellipse cx="540" cy="60" rx="80" ry="50" fill="#b08a3a" opacity=".5"/></g>
      ${stars}
      <path d="M-20,60 L60,30" stroke="#fff" stroke-width="1.4" stroke-linecap="round" class="ahn-shoot"/>
      <circle cx="552" cy="320" r="22" fill="#6a4aa8"/><circle cx="544" cy="314" r="22" fill="#8a6ac8" opacity=".5"/><ellipse cx="552" cy="320" rx="36" ry="7" fill="none" stroke="#c9a6ff" stroke-width="1.5" opacity=".7" transform="rotate(-15 552 320)"/>
      ${bridges}
      ${isl}
    </svg></div>`;
  }
  function ahnAbilChips(ph) { return ph.map((p, i) => `<span class="ahn-ph"><b>P${i + 1}</b>${[...p.a.map(id => AHN_ABIL[id].name), ...Object.entries(p.t || {}).map(([k, v]) => AHN_TRAIT[k] ? AHN_TRAIT[k](v) : '')].filter(Boolean).join(' · ') || 'Grundangriff'}</span>`).join(''); }
  function ahnTab() {
    if (!ahnOpen(S)) return '<p class="note">Die Ahnenprüfung wird mit der 6. Wiedergeburt freigeschaltet.</p>';
    const cur = S.ahn.m, sel = ahnSel == null ? cur : Math.max(0, Math.min(AHN_COUNT - 1, ahnSel)), M = AHN_MISSIONS[sel], lvl = ahnLevelFor(S);
    const state = sel < cur ? 'done' : sel === cur ? 'cur' : 'later';
    const bosses = ahnBossesOf(sel);
    let html = `<div class="ahn-head"><div><h3 class="rl-h3">Ahnenprüfung</h3>
      <p class="note">10 Missionen mit je 5 Bossen, jeder mit 3 Phasen. Am Ende der Kette wartet der Urahn, und wer ihn besiegt, bekommt ein <b>Ahnensiegel</b>. Danach beginnt die Prüfung von vorne, so oft du willst.</p></div>
      <div class="ahn-stats"><span class="ahn-sig">✦ <b>${S.ahn.sig}</b> Siegel frei</span><span class="note">insgesamt ${S.ahn.got} erhalten</span></div></div>`;
    html += `<div class="ahn-how rl-long"><b>So kämpfst du</b><span>🛡 <b>Großangriff:</b> Der Boss holt sichtbar aus. Drück rechtzeitig <b>Schildwall</b> (Knopf, Leertaste oder auf die Helden tippen), dann blockst du 90 %. Sonst blockt der Schildwall automatisch nur 25 %.</span><span>🎯 <b>Schwachstelle:</b> Leuchtet am Boss ein Ziel auf, tipp es an. Das macht viel Schaden und betäubt ihn.</span><span>✨ <b>Segen:</b> Nach jedem Boss wählst du einen von drei Segen. Sie gelten für die ganze Prüfung bis zum Siegel, aber nur hier.</span></div>`;
    const bl = S.ahn.boons || [];
    html += `<div class="ahn-boons"><h3 class="rl-h3">Segen dieser Prüfung (${bl.length})</h3>${bl.length ? `<div class="ahn-blist">${bl.map(b => { const B = AHN_BOONS[b.id]; return `<span class="ahn-boon k-${B.kind}" title="${esc(ahnBoonText(b))}">${B.icon} <b>${esc(B.name)}</b><small>${esc(ahnBoonText(b))}</small></span>`; }).join('')}</div>` : '<p class="note">Noch keine. Den ersten Segen gibt es nach dem ersten besiegten Boss.</p>'}</div>`;
    html += ahnMap();
    html += `<div class="ahn-mission" style="--mc:${M.col}"><div class="ahn-mhead"><span class="ahn-mnum">${sel + 1}</span><div><b>${esc(M.name)}</b><small>${esc(M.desc)}</small></div>
      <span class="ahn-state ${state}">${state === 'done' ? 'Geschafft' : state === 'cur' ? 'Nächste Mission' : 'Noch gesperrt'}</span></div>
      <ol class="ahn-bosses">${bosses.map((d, i) => `<li class="${d.ahne ? 'ahne' : ''}" style="--bc:${d.tint || '#ffd27a'}"><span class="ahn-bi">${d.ahne ? '♛' : i + 1}</span><div><b>${esc(d.name)}</b><i>„${esc(d.quote)}“</i><div class="ahn-phs">${ahnAbilChips(d.ph)}</div></div></li>`).join('')}</ol>
      <p class="note">Vor jedem Boss kommen 2 Wellen Diener. Nach jedem Boss stehen gefallene Helden wieder auf. Scheitert die Mission, fängst du sie neu an. Gegnerstärke: <b>Stufe ${lvl}</b> (80 % deiner höchsten Stufe in diesem Aufstieg, wird bei jedem Missionsstart neu berechnet).</p>
      <div class="row">${state === 'cur' ? `<button class="btn gold" data-rl="ahnstart" ${inCamp() ? '' : 'disabled'}>Mission ${sel + 1} starten</button>` : ''}${ahnSel != null && ahnSel !== cur ? '<button class="btn ghost small" data-rl="ahncur">Zur nächsten Mission</button>' : ''}</div></div>`;
    // Siegel setzen
    const hiredH = HEROES.filter(h => hired(S, h.tree));
    html += `<div class="ahn-sigils"><h3 class="rl-h3">Ahnensiegel</h3><p class="note">Ein Siegel setzt du auf einen Helden. Sein Fertigkeitenbaum wächst dann nach unten: 5 passive Fähigkeiten, 3 Siegel-Fähigkeiten mit einem eigenen Platz und 4 Siegel-Schlüssel mit einem eigenen Sockel. Die neuen Knoten kaufst du wie alle anderen mit Gold und Seelen. Das Siegel bleibt bei Wiedergeburt und Aufstieg auf dem Helden.</p>
      <div class="ahn-sgrid">${hiredH.map(h => { const on = S.ahn.place[h.id]; return `<button class="ahn-sh ${on ? 'on' : ''}" style="--hc:${h.color}" data-sig="${h.id}" ${on || S.ahn.sig <= 0 ? 'disabled' : ''}><span class="pt">${PORTRAIT[h.id]}</span><b>${h.name}</b><small>${on ? '✦ Siegel gesetzt' : S.ahn.sig > 0 ? 'Siegel setzen' : 'kein Siegel frei'}</small></button>`; }).join('')}</div></div>`;
    if (acct && acct.tester && hiredH.some(h => S.ahn.place[h.id])) html += `<div class="rl-test"><b>🧪 Test</b> <button class="btn ghost small" data-rl="tahnsigclear">Alle Siegel von den Helden nehmen (Siegel kommen zurück)</button></div>`;
    if (acct && acct.tester) html += `<div class="rl-test"><b>🧪 Test</b> <button class="btn small" data-rl="tahnwin">Aktuelle Mission als geschafft werten</button> <button class="btn small" data-rl="tahnsig">+1 Siegel</button> <span class="note">Boss direkt starten:</span> ${ahnBossesOf(S.ahn.m).map((d, i) => `<button class="btn ghost small" data-rl="tahnboss" data-bi="${i}" title="${esc(d.name)}">${d.ahne ? '♛' : i + 1}</button>`).join('')} <button class="btn ghost small" data-rl="tahnreset">Prüfung zurücksetzen</button></div>`;
    return html;
  }
  function ahnAction(a, b) {
    if (a === 'ahnstart' || a === 'tahnboss') {
      if (!inCamp() || !ahnOpen(S)) return true;
      if (a === 'tahnboss' && !(acct && acct.tester)) return true;
      startRun('ahnen');
      if (a === 'tahnboss' && run && run.ahn) { const n = ahnBossesOf(run.ahn.mi).length; run.ahn.bi = Math.min(n - 1, b.dataset.bi != null ? Number(b.dataset.bi) : n - 1); run.ahn.wave = AHN_TUNE.waves; spawnWave(run); }
      save(); $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' }); return true;
    }
    if (a === 'ahncur') { ahnSel = null; panel(); return true; }
    if (!(acct && acct.tester) || !/^tahn/.test(a)) return false;
    if (a === 'tahnwin') { const r = ahnClaim(S, { victory: true, ahn: { mi: S.ahn.m } }); ahnSel = null; if (r && r.sigil) sigilGot(); else toast(`Mission ${r.mission + 1} als geschafft gewertet`); afterChange(); }
    if (a === 'tahnsigclear') { for (const id of Object.keys(S.ahn.place)) { const h = HERO_BY_ID[id]; delete S.ahn.place[id]; S.ahn.sig++; S.equip = S.equip.filter(x => !(NODE[x].sig && NODE[x].tree === h.tree)); for (const n of NODES) if (n.sig && n.tree === h.tree) delete S.nodes[n.id]; } toast('Siegel zurückgenommen'); afterChange(); }
    if (a === 'tahnsig') { S.ahn.sig++; S.ahn.got++; toast('+1 Ahnensiegel'); afterChange(); }
    if (a === 'tahnreset') { S.ahn = ahnFix(); ahnSel = null; toast('Ahnenprüfung zurückgesetzt'); afterChange(); }
    return true;
  }
  function ahnClick(e) {
    const n = e.target.closest('[data-ahn]');
    if (n) { ahnSel = Number(n.dataset.ahn); SND.play('tick'); panel(); return true; }
    const sg = e.target.closest('[data-sig]');
    if (sg) { const h = HERO_BY_ID[sg.dataset.sig]; if (placeSigil(S, h.id)) { SND.play('forge'); toast(`Ahnensiegel auf ${h.name} gesetzt`, true); afterChange(); } return true; }
    return false;
  }
  function sigilGot() {
    SND.play('rebirth');
    modal(`<div class="rl-rsigil"><div class="rays"></div><div class="seal"><span>✦</span></div></div><h2>Ahnensiegel erhalten!</h2>
      <p>Der Urahn ist besiegt. Du hast jetzt <b>${S.ahn.sig}</b> freie${S.ahn.sig === 1 ? 's' : ''} Siegel.</p>
      <p class="note">Setze es im Reiter Ahnenprüfung auf einen Helden. Die Prüfung beginnt jetzt von vorne, mit neu festgelegter Gegnerstärke.</p>
      <button class="btn gold" data-m="ok">Weiter</button>`);
  }
  function ahnEndInfo() {
    const A = run.ahn, M = AHN_MISSIONS[A.mi], list = ahnBossesOf(A.mi), r = run.ahnReward;
    if (run.victory) return `<div class="rl-dead win"><b>Mission ${A.mi + 1} geschafft: ${esc(M.name)}</b><span>${r && r.sigil ? '✦ Ahnensiegel erhalten!' : `Weiter geht es mit Mission ${A.mi + 2}: ${esc(AHN_MISSIONS[Math.min(AHN_COUNT - 1, A.mi + 1)].name)}`}</span><span class="note">Alle Bosse besiegt. Die Karte findest du im Reiter Ahnenprüfung.</span></div>`;
    const d = list[A.bi], bs = A.boss;
    return `<div class="rl-dead"><b>Mission ${A.mi + 1} gescheitert</b><span>${A.wave < AHN_TUNE.waves || !d ? `Bei den Dienern vor Boss ${A.bi + 1}` : `Bei ${esc(d.name)} (Boss ${A.bi + 1} von ${list.length}${bs ? `, Phase ${bs.phase + 1}` : ''})`}</span><span class="note">Die Mission fängt beim nächsten Versuch von vorne an. Stärkere Runen oder eine andere Aufstellung helfen.</span></div>`;
  }

  /* ================= Zeichnen ================= */
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const OUT = 'rgba(20,14,30,.85)';
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fillO(c) { ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke(); }
  function shadow(x, w) { const pa = ctx.globalAlpha; ctx.globalAlpha = pa * 0.45; ctx.drawImage(glowSprite('0,0,0'), x - w * 1.2, GROUND + 2 - 5, w * 2.4, 10); ctx.globalAlpha = pa; }

  function sky(bm, t, night) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, night ? '#141a33' : bm.sky[0]); g.addColorStop(1, night ? '#3d3157' : bm.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Sonne oder Mond mit Schein
    const sx = night ? 440 : 400, sy = night ? 46 : 70, sc = night ? '#f3ecd8' : bm.sun;
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90); glow.addColorStop(0, sc + 'aa'); glow.addColorStop(1, sc + '00');
    ctx.fillStyle = glow; ctx.fillRect(sx - 90, sy - 90, 180, 180);
    ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(sx, sy, night ? 14 : 18, 0, 7); ctx.fill();
    if (night) { ctx.fillStyle = '#141a33'; ctx.beginPath(); ctx.arc(sx + 6, sy - 4, 12, 0, 7); ctx.fill(); }
    if (night || bm.prop === 'grab') for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * hash(i) * (0.6 + 0.4 * Math.sin(t * 2 + i))})`; ctx.fillRect(hash(i + 3) * W, hash(i + 7) * 130, 1.4, 1.4); }
    // Wolken
    if (!night && bm.prop !== 'grab') for (let i = 0; i < 4; i++) {
      const cx = ((hash(i) * W + t * (6 + i * 3)) % (W + 120)) - 60, cy = 30 + hash(i + 9) * 60;
      ctx.fillStyle = bm.prop === 'lava' ? 'rgba(60,30,30,.35)' : 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.ellipse(cx, cy, 34, 9, 0, 0, 7); ctx.ellipse(cx + 18, cy - 6, 18, 9, 0, 0, 7); ctx.ellipse(cx - 16, cy - 3, 14, 7, 0, 0, 7); ctx.fill();
    }
  }
  function range(color, par, base, amp, freq, scroll, sharp) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 6) {
      const wx = x + scroll * par;
      const y = sharp ? base - Math.abs(Math.sin(wx * freq)) * amp - Math.abs(Math.sin(wx * freq * 2.7 + 2)) * amp * 0.35
        : base - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.3 + 1) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.fill();
  }
  function ground(bm, scroll, night) {
    const g = ctx.createLinearGradient(0, GROUND, 0, H);
    g.addColorStop(0, night ? '#3a2d22' : bm.ground[0]); g.addColorStop(1, night ? '#211912' : bm.ground[1]);
    ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, GROUND, W, 2);
    for (let i = 0; i < 26; i++) {
      const wx = ((i * 37 - scroll) % (W + 40) + W + 40) % (W + 40) - 20;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(wx, GROUND + 10 + hash(i) * 30, 4 + hash(i + 1) * 6, 2, 0, 0, 7); ctx.fill();
    }
  }
  function props(bm, scroll, t) {
    for (let k = Math.floor(scroll / 90) - 1; k < Math.floor(scroll / 90) + 7; k++) {
      if (hash(k * 3.7) < 0.45) continue;
      const x = k * 90 + hash(k) * 50 - scroll, y = GROUND, s = 0.7 + hash(k + 2) * 0.5;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      if (bm.prop === 'baum') { ctx.fillStyle = '#6b4a2c'; ctx.fillRect(-3, -26, 6, 26); ctx.fillStyle = '#4f9a48'; ctx.beginPath(); ctx.arc(0, -34, 16, 0, 7); ctx.arc(-10, -26, 11, 0, 7); ctx.arc(10, -27, 11, 0, 7); ctx.fill(); }
      else if (bm.prop === 'tanne') { ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-2, -14, 4, 14); ctx.fillStyle = '#1e4a33'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 3, -10 - i * 12); ctx.lineTo(0, -34 - i * 12); ctx.lineTo(14 - i * 3, -10 - i * 12); ctx.fill(); } }
      else if (bm.prop === 'grab') { ctx.fillStyle = '#5b5470'; rr(-8, -24, 16, 24, 7); ctx.fill(); ctx.fillStyle = '#3a3448'; ctx.fillRect(-1, -19, 2, 9); ctx.fillRect(-4, -16, 8, 2); }
      else if (bm.prop === 'lava') { const gl = 0.5 + 0.3 * Math.sin(t * 3 + k); ctx.fillStyle = `rgba(255,120,40,${gl})`; ctx.beginPath(); ctx.ellipse(0, 4, 22, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1714'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-4, -18); ctx.lineTo(4, -10); ctx.lineTo(10, 0); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(160,210,255,.85)'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-2, -26); ctx.lineTo(4, -18); ctx.lineTo(7, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-2, -20, 2, 12); }
      ctx.restore();
    }
    if (bm.prop === 'kristall') for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect((hash(i) * W + t * 10) % W, (hash(i + 4) * H + t * (20 + hash(i) * 20)) % GROUND, 2, 2); }
    if (bm.prop === 'lava') for (let i = 0; i < 16; i++) { ctx.fillStyle = 'rgba(255,170,80,.7)'; ctx.fillRect((hash(i) * W) % W, GROUND - ((t * (15 + hash(i) * 25) + hash(i + 2) * 200) % 200), 2, 2); }
  }

  // Helden
  function heroBar(x, y, h, max, color) {
    if (!h || !h.alive) return;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(x - 16, y, 32, 5, 2); ctx.fill();
    ctx.fillStyle = color; rr(x - 16, y, 32 * Math.max(0, h.hp / max), 5, 2); ctx.fill();
  }

  // Gegner
  function eyes(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 4, 4); ctx.fillRect(x + 8, y, 4, 4); ctx.fillStyle = '#111'; ctx.fillRect(x + 1, y + 1, 2, 2); ctx.fillRect(x + 9, y + 1, 2, 2); }
  // Ausrüstung der Fernkämpfer
  function rangedGear(e, t, col) {
    const pulse = Math.max(0, 1 - e.shotT / 0.5);
    if (e.type === 'goblin') {
      ctx.fillStyle = col('#7a3b2e'); ctx.beginPath(); ctx.arc(0, -35, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(8, -30); ctx.lineTo(-8, -30); ctx.fill();
      ctx.strokeStyle = '#5a3d25'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(-13, -26); ctx.lineTo(-18, -32); ctx.moveTo(-13, -26); ctx.lineTo(-8, -32); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,61,37,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-18, -32); ctx.quadraticCurveTo(-13, -26 + pulse * 6, -8, -32); ctx.stroke();
      ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.arc(-13, -28 + pulse * 4, 2.5, 0, 7); ctx.fill();
    } else if (e.type === 'skelett') {
      ctx.strokeStyle = col('#8a6a3a'); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-10, -24, 13, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(232,226,208,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-14, -36); ctx.lineTo(-14 + pulse * 8, -24); ctx.lineTo(-14, -12); ctx.stroke();
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(4, -30, 4, 14); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(4, -33, 1.5, 4); ctx.fillRect(6.5, -34, 1.5, 4);
    } else if (e.type === 'daemon') {
      const r = 4 + pulse * 3 + Math.sin(t * 10) * 0.8;
      ctx.fillStyle = 'rgba(255,140,60,.45)'; ctx.beginPath(); ctx.arc(-15, -32, r + 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(-15, -32, r, 0, 7); ctx.fill();
      ctx.fillStyle = col('#c4382f'); ctx.fillRect(-14, -28, 5, 4);
    } else if (e.type === 'golem') {
      ctx.fillStyle = col('#5b7fa8'); rr(-13, -33, 26, 26, 4); ctx.fill();
      ctx.save(); ctx.translate(-20, -42 + Math.sin(t * 3) * 2); ctx.rotate(t * 1.5);
      ctx.fillStyle = `rgba(190,235,255,${0.75 + pulse * 0.25})`; ctx.beginPath(); ctx.moveTo(0, -6 - pulse * 2); ctx.lineTo(4, 0); ctx.lineTo(0, 6 + pulse * 2); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(190,140,255,.8)'; ctx.beginPath(); ctx.arc(-15, -10 - pulse * 3, 2 + pulse * 2, 0, 7); ctx.fill();
    }
  }
  // ---------- Eigene Boss-Figuren ----------
  function geye(x, y, c, r) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, 7); ctx.fill();
  }
  function poly(pts, c, outline) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (outline) fillO(c); else { ctx.fillStyle = c; ctx.fill(); } }
  // Bosse der Gebiete 6–15
  const BOSS_ART = {
    5(e, t, col, hit, ph) { // Moorhexe
      for (let i = 0; i < 3; i++) { const a = ph * 1.2 + i * 2.1; ctx.fillStyle = 'rgba(140,255,140,.3)'; ctx.beginPath(); ctx.arc(Math.cos(a) * 44, -70 + Math.sin(a) * 18, 6, 0, 7); ctx.fill(); }
      const fl = Math.sin(ph * 2) * 3;
      ctx.save(); ctx.translate(8, fl - 6);
      ctx.beginPath(); ctx.moveTo(-18, -64); ctx.lineTo(18, -64); ctx.lineTo(28, -2); for (let i = 0; i < 6; i++) ctx.lineTo(28 - i * 9.5 - 4.5, -10 + (i % 2) * 8); ctx.lineTo(-28, -2); ctx.closePath(); fillO(col('#2f2440'));
      ctx.save(); ctx.translate(16, -54); ctx.rotate(0.15); ctx.fillStyle = '#4a3220'; ctx.fillRect(-2, -40, 4, 96);
      const og = ctx.createRadialGradient(0, -46, 1, 0, -46, 14); og.addColorStop(0, '#d9ffb0'); og.addColorStop(0.4, `rgba(120,255,120,${0.7 + 0.3 * Math.sin(ph * 5)})`); og.addColorStop(1, 'rgba(120,255,120,0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, -46, 14, 0, 7); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(-2, -74, 13, 0, 7); fillO(col('#8fbf6a'));
      poly([[-14, -76], [-30, -70], [-13, -68]], col('#8fbf6a'), true);
      ctx.fillStyle = '#5a7a3a'; ctx.beginPath(); ctx.arc(-26, -71, 2, 0, 7); ctx.fill();
      geye(-8, -77, 'rgba(255,240,90,.95)', 2.2); geye(2, -77, 'rgba(255,240,90,.95)', 2.2);
      ctx.strokeStyle = '#1b1726'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-6, -68, 5, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#5b4a6e'; ctx.beginPath(); ctx.moveTo(-26, -84); ctx.lineTo(24, -84); ctx.lineTo(14, -90); ctx.quadraticCurveTo(6, -112, 18, -132); ctx.quadraticCurveTo(-4, -118, -8, -90); ctx.lineTo(-16, -90); ctx.closePath(); fillO(col('#3a2d55'));
      ctx.fillStyle = '#9b6ad6'; ctx.fillRect(-9, -91, 22, 4);
      ctx.restore();
      ctx.save(); ctx.translate(-36, 0);
      ctx.fillStyle = 'rgba(120,255,120,.25)'; for (let i = 0; i < 4; i++) { const p = (ph * 0.6 + i * 0.25) % 1; ctx.beginPath(); ctx.arc(Math.sin(i * 2 + ph) * 6, -30 - p * 50, 4 + p * 8, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, -14, 20, 15, 0, 0, 7); fillO('#2a2a30');
      ctx.fillStyle = '#7ee08a'; ctx.beginPath(); ctx.ellipse(0, -26, 17, 4, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#c8ffb0'; ctx.beginPath(); ctx.arc(-8 + i * 8, -27 - Math.abs(Math.sin(ph * 6 + i)) * 4, 2, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ff7a3d'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 8, 0); ctx.quadraticCurveTo(-8 + i * 8, -8 - Math.sin(ph * 10 + i) * 3, -6 + i * 8, 0); ctx.fill(); }
      ctx.restore();
    },
    6(e, t, col, hit, ph) { // Dornentroll
      const br = Math.sin(ph * 1.5) * 1.5;
      ctx.fillStyle = col('#56664a'); rr(-22, -30, 16, 30, 5); ctx.fill(); rr(6, -30, 16, 30, 5); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -60 - br, 34, 36, 0, 0, 7); fillO(col('#6f8a5a'));
      ctx.fillStyle = col('#8aa070'); ctx.beginPath(); ctx.ellipse(-4, -54 - br, 20, 20, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(70,110,50,.8)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(10 + (i % 3) * 8, -86 + Math.floor(i / 3) * 8 - br, 5, 0, 7); ctx.fill(); }
      ctx.save(); ctx.translate(-26, -70 - br); ctx.rotate(0.4 + Math.sin(ph * 2) * 0.1);
      rr(-8, 0, 16, 40, 7); fillO(col('#6f8a5a'));
      ctx.translate(0, 38); ctx.rotate(-1.2);
      ctx.fillStyle = '#5a3d25'; rr(-6, -4, 56, 12, 6); ctx.fill(); ctx.beginPath(); ctx.ellipse(48, 2, 12, 10, 0, 0, 7); fillO(col('#6b4a2e'));
      ctx.fillStyle = '#c9cdd6'; for (let i = 0; i < 4; i++) poly([[42 + i * 4, -7], [45 + i * 4, -15], [47 + i * 4, -7]], '#c9cdd6');
      ctx.restore();
      ctx.save(); ctx.translate(26, -72 - br); ctx.rotate(-0.3); rr(-8, 0, 16, 40, 7); fillO(col('#6f8a5a')); ctx.restore();
      ctx.strokeStyle = '#3d5a24'; ctx.lineWidth = 2.5; for (const [x0, y0] of [[-30, -60], [24, -64]]) { ctx.beginPath(); for (let k = 0; k < 6; k++) ctx.lineTo(x0 + Math.sin(k * 1.4) * 8, y0 + k * 6 - br); ctx.stroke(); }
      ctx.fillStyle = '#e5484d'; for (let k = 0; k < 6; k++) { poly([[-30 + Math.sin(k * 1.4) * 8, -60 + k * 6 - br], [-36 + Math.sin(k * 1.4) * 8, -62 + k * 6 - br], [-31 + Math.sin(k * 1.4) * 8, -57 + k * 6 - br]], '#e5484d'); }
      ctx.beginPath(); ctx.ellipse(-12, -96 - br, 15, 12, 0, 0, 7); fillO(col('#7d9866'));
      ctx.fillStyle = '#4a5e3a'; ctx.fillRect(-26, -100 - br, 26, 4);
      geye(-18, -97 - br, 'rgba(255,120,60,.95)', 2.2); geye(-8, -97 - br, 'rgba(255,120,60,.95)', 2.2);
      rr(-26, -90 - br, 26, 10, 4); fillO(col('#7d9866'));
      poly([[-24, -90 - br], [-22, -100 - br], [-19, -90 - br]], '#efe9d8', true); poly([[-8, -90 - br], [-6, -100 - br], [-3, -90 - br]], '#efe9d8', true);
    },
    7(e, t, col, hit, ph) { // Vampirgraf
      for (let i = 0; i < 3; i++) { const a = ph * 2 + i * 2.1, x = Math.cos(a) * 46, y = -100 + Math.sin(a * 1.5) * 16, f = Math.sin(ph * 18 + i) * 5; ctx.fillStyle = '#1b1726'; poly([[x - 10, y - f], [x - 3, y], [x, y - 3], [x + 3, y], [x + 10, y - f], [x, y + 4]], '#1b1726'); }
      const cw = Math.sin(ph * 2) * 4;
      ctx.beginPath(); ctx.moveTo(-14, -88); ctx.quadraticCurveTo(-46 - cw, -50, -40 - cw, 0); ctx.lineTo(40 + cw, 0); ctx.quadraticCurveTo(46 + cw, -50, 14, -88); ctx.closePath(); fillO(col('#16101f'));
      ctx.fillStyle = col('#8f1d2c'); ctx.beginPath(); ctx.moveTo(-12, -84); ctx.quadraticCurveTo(-36 - cw, -48, -32 - cw, -4); ctx.lineTo(32 + cw, -4); ctx.quadraticCurveTo(36 + cw, -48, 12, -84); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col('#24202e'); rr(-14, -84, 28, 84, 6); ctx.fill();
      ctx.fillStyle = '#efe9d8'; poly([[-6, -84], [6, -84], [0, -64]], '#efe9d8'); ctx.fillStyle = '#8f1d2c'; ctx.beginPath(); ctx.arc(0, -66, 3, 0, 7); ctx.fill();
      for (const sgn of [-1, 1]) poly([[sgn * 4, -86], [sgn * 22, -110], [sgn * 18, -86]], col('#3a1020'), true);
      ctx.beginPath(); ctx.ellipse(0, -98, 11, 13, 0, 0, 7); fillO(col('#e8e4f0'));
      ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.moveTo(-12, -100); ctx.quadraticCurveTo(-12, -116, 0, -114); ctx.quadraticCurveTo(12, -116, 12, -100); ctx.lineTo(6, -106); ctx.lineTo(0, -100); ctx.lineTo(-6, -106); ctx.closePath(); ctx.fill();
      geye(-5, -98, 'rgba(255,40,60,.95)', 2); geye(4, -98, 'rgba(255,40,60,.95)', 2);
      ctx.fillStyle = '#5a1a24'; ctx.fillRect(-5, -90, 9, 2); poly([[-4, -89], [-3, -85], [-2, -89]], '#fff'); poly([[1, -89], [2, -85], [3, -89]], '#fff');
      ctx.save(); ctx.translate(-14, -70); ctx.rotate(0.5); rr(-4, 0, 8, 24, 3); fillO(col('#24202e')); ctx.fillStyle = '#e8e4f0'; ctx.beginPath(); ctx.arc(0, 26, 4, 0, 7); ctx.fill(); ctx.restore();
    },
    8(e, t, col, hit, ph) { // Magmatitan
      for (let i = 0; i < 4; i++) { const p = (ph * 0.5 + i * 0.25) % 1; ctx.fillStyle = `rgba(80,70,70,${0.4 * (1 - p)})`; ctx.beginPath(); ctx.arc(-10 + i * 7 + Math.sin(ph + i) * 4, -110 - p * 40, 6 + p * 10, 0, 7); ctx.fill(); }
      const pulse = 0.6 + 0.4 * Math.sin(ph * 3);
      ctx.fillStyle = col('#2b2523'); rr(-24, -34, 18, 34, 4); ctx.fill(); rr(6, -34, 18, 34, 4); ctx.fill();
      poly([[-32, -96], [28, -100], [38, -60], [26, -28], [-28, -26], [-38, -62]], col('#3a3230'), true);
      const cg = ctx.createRadialGradient(0, -64, 2, 0, -64, 22); cg.addColorStop(0, '#fff3c4'); cg.addColorStop(0.4, `rgba(255,150,40,${pulse})`); cg.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, -64, 22, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,140,40,${pulse})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-26, -88); ctx.lineTo(-12, -74); ctx.lineTo(-20, -50); ctx.moveTo(24, -90); ctx.lineTo(10, -76); ctx.lineTo(22, -40); ctx.moveTo(-6, -40); ctx.lineTo(4, -30); ctx.stroke();
      for (const [sx, rot] of [[-36, 0.35], [36, -0.25]]) {
        ctx.save(); ctx.translate(sx, -86); ctx.rotate(rot + Math.sin(ph * 2) * 0.05);
        poly([[-9, 0], [9, 0], [11, 34], [-11, 34]], col('#3a3230'), true);
        poly([[-14, 32], [14, 32], [16, 52], [-16, 52]], col('#4a403c'), true);
        ctx.strokeStyle = `rgba(255,140,40,${pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 38); ctx.lineTo(0, 44); ctx.lineTo(8, 38); ctx.stroke();
        const d = (ph * 0.9 + sx) % 1; ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.ellipse(4, 52 + d * 30, 2.5, 4, 0, 0, 7); ctx.fill();
        ctx.restore();
      }
      poly([[-14, -118], [14, -118], [18, -96], [-18, -96]], col('#4a403c'), true);
      ctx.fillStyle = `rgba(255,200,80,${pulse})`; ctx.fillRect(-12, -110, 9, 4); ctx.fillRect(3, -110, 9, 4);
      ctx.fillStyle = `rgba(255,120,30,${pulse})`; ctx.fillRect(-8, -102, 16, 3);
    },
    9(e, t, col, hit, ph) { // Kristallspinne
      const step = ph * 4;
      ctx.strokeStyle = col('#7fa6c4'); ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) for (const sgn of [-1, 1]) {
        const bx = -6 + i * 8, kx = bx + sgn * (26 + i * 4), ky = -48 - Math.max(0, Math.sin(step + i * 1.3 + (sgn > 0 ? Math.PI : 0))) * 8, fx = bx + sgn * (40 + i * 6);
        ctx.beginPath(); ctx.moveTo(bx, -30); ctx.lineTo(kx, ky); ctx.lineTo(fx, 0); ctx.stroke();
      }
      const ag = ctx.createLinearGradient(10, -70, 40, -10); ag.addColorStop(0, hit ? '#fff' : '#e3f6ff'); ag.addColorStop(1, hit ? '#fff' : '#5aa6d6');
      ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(18, -70); ctx.lineTo(46, -64); ctx.lineTo(58, -36); ctx.lineTo(44, -12); ctx.lineTo(14, -14); ctx.closePath(); ctx.fillStyle = ag; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(18, -70); ctx.lineTo(30, -40); ctx.lineTo(46, -64); ctx.moveTo(30, -40); ctx.lineTo(44, -12); ctx.moveTo(30, -40); ctx.lineTo(4, -40); ctx.stroke();
      for (const [x, y, h] of [[20, -70, 16], [34, -68, 22], [48, -62, 14]]) poly([[x - 4, y + 2], [x, y - h], [x + 4, y + 2]], 'rgba(190,238,255,.95)', true);
      ctx.beginPath(); ctx.ellipse(-16, -34, 20, 15, 0, 0, 7); fillO(col('#4f7a9a'));
      for (const [x, y, r] of [[-26, -40, 3], [-20, -44, 3.5], [-28, -32, 2.2], [-14, -42, 2.4], [-22, -36, 2], [-30, -38, 1.8]]) geye(x, y, 'rgba(79,195,255,.9)', r);
      ctx.fillStyle = '#d8f3ff'; poly([[-34, -26], [-38, -14], [-30, -24]], '#d8f3ff', true); poly([[-26, -24], [-28, -12], [-22, -22]], '#d8f3ff', true);
    },
    10(e, t, col, hit, ph) { // Sternenwächter
      const fl = Math.sin(ph * 1.6) * 3;
      ctx.strokeStyle = 'rgba(200,220,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); const cs = [[-50, -120], [-36, -104], [-44, -84], [40, -116], [50, -96], [36, -80]]; cs.forEach(([x, y], i) => (i % 3 ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      cs.forEach(([x, y], i) => starDot(x, y, 2 + Math.sin(ph * 3 + i)));
      ctx.save(); ctx.translate(0, fl - 4);
      const g = ctx.createLinearGradient(0, -110, 0, 0); g.addColorStop(0, hit ? '#fff' : '#3a4ba8'); g.addColorStop(1, hit ? '#fff' : '#141a44');
      ctx.beginPath(); ctx.moveTo(-20, -84); ctx.lineTo(20, -84); ctx.lineTo(26, -30); ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.lineTo(-26, -30); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#c9d6ff'; ctx.stroke();
      for (let i = 0; i < 12; i++) starDot(-18 + hash(i) * 36, -80 + hash(i + 4) * 76, 0.8 + 0.8 * Math.sin(ph * 4 + i));
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sgn * 24, -80, 12, 8, sgn * 0.3, 0, 7); ctx.fillStyle = col('#2a357a'); ctx.fill(); ctx.strokeStyle = '#c9d6ff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.save(); ctx.translate(-24, -58); ctx.rotate(-2.25);
      const sg = ctx.createLinearGradient(0, 0, 70, 0); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, 'rgba(160,190,255,.3)');
      ctx.shadowColor = 'rgba(170,200,255,.9)'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(62, -4); ctx.lineTo(74, 0); ctx.lineTo(62, 4); ctx.lineTo(0, 5); ctx.closePath(); ctx.fillStyle = sg; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = '#c9d6ff'; ctx.stroke(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-4, -10, 5, 20); ctx.fillRect(-12, -3, 10, 6);
      ctx.restore();
      rr(-12, -110, 24, 26, 8); ctx.fillStyle = col('#2a357a'); ctx.fill(); ctx.strokeStyle = '#c9d6ff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.8 + 0.2 * Math.sin(ph * 6)})`; ctx.fillRect(-9, -100, 18, 3);
      ctx.strokeStyle = `rgba(255,236,170,${0.7 + 0.3 * Math.sin(ph * 2)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -118, 16, 4, 0, 0, 7); ctx.stroke();
      ctx.restore();
    },
    11(e, t, col, hit, ph) { // Uralter Baumhirte
      const sw = Math.sin(ph * 1.2) * 0.05;
      ctx.fillStyle = col('#5a3d25'); for (const [x, dx] of [[-14, -14], [-4, -4], [8, 10], [16, 22]]) { ctx.beginPath(); ctx.moveTo(x - 4, -16); ctx.quadraticCurveTo(x, -4, x + dx, 0); ctx.lineTo(x + dx + 6, 0); ctx.quadraticCurveTo(x + 4, -6, x + 5, -16); ctx.fill(); }
      rr(-20, -100, 40, 88, 10); fillO(col('#6b4a2e'));
      ctx.strokeStyle = 'rgba(40,25,15,.6)'; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-16 + i * 8, -96); ctx.quadraticCurveTo(-12 + i * 8, -60, -16 + i * 8, -16); ctx.stroke(); }
      ctx.fillStyle = 'rgba(126,200,90,.7)'; for (const [x, y] of [[-18, -40], [14, -70], [-10, -24]]) { ctx.beginPath(); ctx.ellipse(x, y, 6, 3, 0.4, 0, 7); ctx.fill(); }
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(sgn * 18, -84); ctx.rotate(sgn * (0.7 + sw * 3));
        ctx.fillStyle = col('#5a3d25'); rr(-5, 0, 10, 44, 4); ctx.fill();
        ctx.strokeStyle = col('#5a3d25'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(-8, 54); ctx.moveTo(0, 42); ctx.lineTo(4, 56); ctx.moveTo(0, 42); ctx.lineTo(10, 50); ctx.stroke();
        ctx.fillStyle = '#4f9447'; ctx.beginPath(); ctx.arc(-6, 20, 6, 0, 7); ctx.fill();
        ctx.restore();
      }
      ctx.save(); ctx.rotate(sw);
      for (const [x, y, r, c] of [[-30, -112, 20, '#2f6b3f'], [26, -114, 22, '#2f6b3f'], [0, -128, 26, '#3e8a4e'], [-16, -132, 16, '#4f9447'], [18, -136, 16, '#4f9447'], [2, -146, 14, '#6fb45e']]) { ctx.fillStyle = hit ? '#fff' : c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#e5484d'; for (const [x, y] of [[-20, -120], [12, -130], [28, -110]]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(-8, -78, 6, 7, 0, 0, 7); ctx.ellipse(6, -78, 6, 7, 0, 0, 7); ctx.fill();
      geye(-8, -78, 'rgba(160,255,120,.95)', 2.2); geye(6, -78, 'rgba(160,255,120,.95)', 2.2);
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(-1, -58, 8, 5, 0, 0, 7); ctx.fill();
      const lf = (ph * 0.3) % 1; ctx.fillStyle = '#7ec85a'; ctx.beginPath(); ctx.ellipse(-30 + lf * 20, -100 + lf * 100, 3, 1.6, ph, 0, 7); ctx.fill();
    },
    12(e, t, col, hit, ph) { // Geisterkönig
      const fl = Math.sin(ph * 1.8) * 4;
      ctx.save(); ctx.translate(0, fl - 10); ctx.globalAlpha = hit ? 1 : 0.88;
      const g = ctx.createLinearGradient(0, -120, 0, 0); g.addColorStop(0, hit ? '#fff' : 'rgba(210,240,255,.95)'); g.addColorStop(1, 'rgba(150,200,255,0)');
      ctx.beginPath(); ctx.moveTo(-26, -86); ctx.quadraticCurveTo(-34, -40, -18 + Math.sin(ph * 3) * 6, 4); ctx.quadraticCurveTo(-4, -12, 6 + Math.sin(ph * 3 + 1) * 6, 6); ctx.quadraticCurveTo(14, -10, 22 + Math.sin(ph * 3 + 2) * 6, 2); ctx.quadraticCurveTo(34, -40, 26, -86);
      ctx.quadraticCurveTo(26, -118, 0, -120); ctx.quadraticCurveTo(-26, -118, -26, -86); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.globalAlpha = 1;
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(sgn * 24, -80); ctx.rotate(sgn * (0.5 + Math.sin(ph * 2) * 0.1));
        ctx.fillStyle = 'rgba(210,240,255,.85)'; rr(-5, 0, 10, 30, 5); ctx.fill();
        ctx.strokeStyle = '#8a8f9c'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(0, 34 + k * 7, 3, 4, 0, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#5b5f6b'; rr(-6, 28, 12, 5, 2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#1b2a44'; ctx.beginPath(); ctx.ellipse(-8, -96, 5, 7, 0.2, 0, 7); ctx.ellipse(8, -96, 5, 7, -0.2, 0, 7); ctx.fill();
      geye(-8, -96, 'rgba(120,220,255,.95)', 2); geye(8, -96, 'rgba(120,220,255,.95)', 2);
      ctx.fillStyle = '#1b2a44'; ctx.beginPath(); ctx.ellipse(0, -80, 6, 8 + Math.sin(ph * 4) * 2, 0, 0, 7); ctx.fill();
      poly([[-16, -112], [-18, -128], [-9, -118], [0, -134], [9, -118], [18, -128], [16, -112]], col('#b7bcc6'), true);
      ctx.fillStyle = '#4fc3ff'; ctx.beginPath(); ctx.arc(0, -120, 2.4, 0, 7); ctx.fill();
      ctx.restore();
    },
    13(e, t, col, hit, ph) { // Drachenkaiser
      const flap = Math.sin(ph * 3) * 0.2, br = Math.sin(ph * 1.5) * 2;
      ctx.save(); ctx.translate(14, -76); ctx.rotate(-0.3 + flap);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, -46); ctx.lineTo(56, -54); ctx.quadraticCurveTo(48, -36, 54, -20); ctx.quadraticCurveTo(40, -26, 38, -10); ctx.quadraticCurveTo(26, -16, 20, 4); ctx.closePath(); fillO(col('#8f2620'));
      ctx.strokeStyle = '#5a1612'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(54, -20); ctx.moveTo(0, 0); ctx.lineTo(38, -10); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(30, -20); ctx.quadraticCurveTo(62, -16, 58, -46); ctx.quadraticCurveTo(66, -12, 30, -10); ctx.closePath(); fillO(col('#b8322a'));
      ctx.fillStyle = col('#7a1d18'); rr(-20, -28, 14, 28, 5); ctx.fill(); rr(12, -28, 14, 28, 5); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, -48 - br, 30, 26, 0, 0, 7); fillO(col('#b8322a'));
      ctx.fillStyle = col('#ffcf7a'); ctx.beginPath(); ctx.ellipse(-4, -44 - br, 16, 20, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(170,110,40,.6)'; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-16, -58 + i * 7 - br); ctx.lineTo(8, -58 + i * 7 - br); ctx.stroke(); }
      ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.strokeStyle = col('#b8322a'); ctx.beginPath(); ctx.moveTo(-6, -64 - br); ctx.quadraticCurveTo(-20, -92, -22, -104 - br); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(-1, -66 - br); ctx.quadraticCurveTo(-14, -92, -16, -104 - br); ctx.moveTo(-12, -62 - br); ctx.quadraticCurveTo(-26, -92, -28, -104 - br); ctx.stroke();
      ctx.save(); ctx.translate(-26, -108 - br);
      poly([[6, -8], [-6, -12], [-22, -6], [-30, 2], [-22, 6], [-6, 6], [8, 6]], col('#c4382f'), true);
      for (const [hx, hy] of [[2, -10], [8, -6]]) poly([[hx, hy], [hx + 14, hy - 12], [hx + 6, hy + 2]], '#2a1a1a', true);
      geye(-8, -6, 'rgba(255,220,80,.95)', 2);
      ctx.fillStyle = '#1b0e0c'; ctx.fillRect(-28, 2, 18, 2);
      if (Math.sin(ph * 1.3) > 0.2) { for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#ffd23f', '#ff7a3d', '#e5484d'][i % 3]; ctx.beginPath(); ctx.arc(-34 - i * 6, 4 + Math.sin(ph * 20 + i) * 2, 3 + i * 0.6, 0, 7); ctx.fill(); } }
      poly([[-2, -12], [2, -22], [6, -12]], '#ffd23f', true);
      ctx.restore();
      ctx.save(); ctx.translate(-6, -76); ctx.rotate(-flap);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -48); ctx.lineTo(-48, -60); ctx.quadraticCurveTo(-40, -42, -46, -26); ctx.quadraticCurveTo(-32, -30, -30, -14); ctx.quadraticCurveTo(-18, -18, -12, 4); ctx.closePath(); fillO(col('#a32a22'));
      ctx.restore();
    },
    14(e, t, col, hit, ph) { // Sturmtitan
      if (Math.sin(ph * 7) > 0.85) { ctx.strokeStyle = 'rgba(210,235,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); let x = -40 + hash(Math.floor(ph * 7)) * 80, y = -150; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash(k + Math.floor(ph * 7)) - 0.5) * 20; y += 20; ctx.lineTo(x, y); } ctx.stroke(); }
      for (let i = 0; i < 5; i++) { const x = -40 + i * 20 + Math.sin(ph + i) * 4; ctx.fillStyle = 'rgba(90,100,130,.55)'; ctx.beginPath(); ctx.arc(x, -140 + Math.sin(ph * 1.5 + i) * 3, 14, 0, 7); ctx.fill(); }
      ctx.fillStyle = col('#6e7f9a'); rr(-20, -30, 16, 30, 5); ctx.fill(); rr(4, -30, 16, 30, 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18, -96); ctx.quadraticCurveTo(46, -60, 40, -6); ctx.lineTo(-10, -20); ctx.closePath(); fillO(col('#4a5670'));
      rr(-26, -98, 52, 72, 14); fillO(col('#8a9ab8'));
      ctx.fillStyle = col('#c9a64a'); ctx.fillRect(-26, -48, 52, 6); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -45, 4, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(-26, -88); ctx.rotate(0.25 + Math.sin(ph * 2) * 0.05);
      rr(-7, 0, 14, 38, 6); fillO(col('#8a9ab8'));
      ctx.translate(-2, 38); ctx.rotate(-0.3);
      ctx.fillStyle = '#c9a64a'; ctx.fillRect(-2, -80, 4, 120);
      ctx.strokeStyle = `rgba(200,235,255,${0.7 + 0.3 * Math.sin(ph * 15)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(-6, -92); ctx.lineTo(4, -100); ctx.lineTo(-2, -116); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(26, -88); ctx.rotate(-0.3); rr(-7, 0, 14, 38, 6); fillO(col('#8a9ab8')); ctx.restore();
      rr(-14, -122, 28, 26, 9); fillO(col('#9aaac6'));
      geye(-6, -112, 'rgba(230,245,255,.95)', 2.4); geye(6, -112, 'rgba(230,245,255,.95)', 2.4);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = hit ? '#fff' : 'rgba(200,210,230,.95)'; ctx.beginPath(); ctx.arc(-12 + i * 6, -98 + (i % 2) * 4, 7, 0, 7); ctx.fill(); }
      for (const [x, h] of [[-12, 12], [-4, 18], [4, 18], [12, 12]]) poly([[x - 2, -122], [x + 3, -122 - h * 0.6], [x - 1, -122 - h * 0.55], [x + 2, -122 - h]], '#ffe58a');
    },
  };
  function starDot(x, y, r) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, Math.max(0.4, r), 0, 7); ctx.fill(); }
  // ---------- Bosse der Heldengebiete ----------
  Object.assign(BOSS_ART, {
    x_schatten(e, t, col, hit, ph) { // Die Gildenmeisterin
      const sway = Math.sin(ph * 1.6) * 2, atk = e.atkAt != null && run ? Math.max(0, 1 - (run.time - e.atkAt) / 0.4) : 0;
      for (let i = 0; i < 6; i++) { const q = (ph * 0.5 + i / 6) % 1; ctx.fillStyle = `rgba(40,30,60,${0.45 * (1 - q)})`; ctx.beginPath(); ctx.arc(Math.sin(i * 2.1) * 26, -6 - q * 26, 8 + q * 10, 0, 7); ctx.fill(); }
      // langer Mantel mit roter Innenseite, weht
      ctx.beginPath(); ctx.moveTo(-14, -96); ctx.lineTo(16, -96); ctx.lineTo(34 + sway * 2, -4); for (let i = 0; i < 6; i++) ctx.lineTo(34 - i * 11 + sway, -2 + (i % 2) * 8); ctx.lineTo(-30, -4); ctx.closePath(); fillO(col('#2a2238'));
      poly([[12, -90], [30 + sway * 2, -6], [20, -4]], col('#8a2433'));
      // Körper und Schärpe
      rr(-14, -100, 28, 46, 8); fillO(col('#3a3050')); poly([[-14, -78], [14, -66], [14, -60], [-14, -72]], col('#c43a4a'));
      ctx.fillStyle = col('#c9a64a'); ctx.fillRect(-3, -74, 6, 6);
      // Kapuze mit Gesicht im Schatten
      ctx.beginPath(); ctx.moveTo(-18, -100); ctx.quadraticCurveTo(-20, -130, 0, -136); ctx.quadraticCurveTo(20, -130, 16, -100); ctx.closePath(); fillO(col('#3d3550'));
      ctx.fillStyle = '#0a0810'; ctx.beginPath(); ctx.ellipse(-3, -112, 11, 10, 0, 0, 7); ctx.fill();
      geye(-8, -114, 'rgba(255,60,80,.95)', 2.2); geye(1, -114, 'rgba(255,60,80,.95)', 2.2);
      ctx.fillStyle = col('#2a2236'); ctx.fillRect(-13, -108, 18, 6);
      // zwei Klingen, die vordere sticht bei Angriff
      for (const [ax, ay, rot, ln] of [[-16 - atk * 14, -78, -1.9 + atk * 0.5, 30], [16, -76, -0.6, 24]]) { ctx.save(); ctx.translate(ax, ay); ctx.rotate(rot);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-5, -ln * 0.5, 1, -ln); ctx.quadraticCurveTo(4, -ln * 0.5, 3, 0); ctx.closePath(); fillO(hit ? '#fff' : '#d8dde8');
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-2, 0, 6, 8); ctx.fillStyle = '#c9a64a'; ctx.fillRect(-4, -1, 10, 2.4); ctx.restore(); }
      glowDot(-16 - atk * 14, -78, 10, '255,60,80', 0.3 + atk * 0.5);
    },
    x_friedhof(e, t, col, hit, ph) { // Der Totengräber
      const br = Math.sin(ph * 1.2) * 1.5, sw = Math.sin(ph * 2) * 0.08;
      // Laterne mit grünem Seelenfeuer hängt am Gürtel
      // Stiefel und Mantel
      rr(-24, -14, 18, 14, 4); fillO(col('#2a2420')); rr(4, -14, 18, 14, 4); fillO(col('#2a2420'));
      ctx.beginPath(); ctx.moveTo(-30, -10); ctx.lineTo(-24, -86 - br); ctx.quadraticCurveTo(0, -98 - br, 24, -84 - br); ctx.lineTo(32, -10); for (let i = 0; i < 5; i++) ctx.lineTo(32 - i * 15.5 - 7, -10 + (i % 2 ? 0 : 7)); ctx.closePath(); fillO(col('#3e3a34'));
      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-18 + i * 14, -70, 6, 4); }
      ctx.fillStyle = col('#5a4a30'); ctx.fillRect(-26, -50 - br, 56, 6);
      ctx.save(); ctx.translate(20, -44 + br); ctx.rotate(sw); ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 0); ctx.stroke(); rr(-6, 0, 12, 14, 2); fillO('#3a3a40'); ctx.fillStyle = `rgba(107,224,184,${0.7 + 0.3 * Math.sin(ph * 6)})`; ctx.fillRect(-4, 2, 8, 10); ctx.restore();
      glowDot(20, -37 + br, 26, '107,224,184', 0.45);
      // Kopf: bleich, mit breitem Hut
      ctx.beginPath(); ctx.arc(-6, -102 - br, 14, 0, 7); fillO(col('#c8ccbc'));
      geye(-12, -104 - br, 'rgba(107,255,170,.95)', 2); geye(-2, -104 - br, 'rgba(107,255,170,.95)', 2);
      ctx.strokeStyle = '#1b1726'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-14, -94 - br); for (let i = 0; i < 6; i++) ctx.lineTo(-14 + i * 3, -94 - br + (i % 2 ? 2 : -1)); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-6, -114 - br, 30, 6, -0.05, 0, 7); fillO(col('#2a2622')); rr(-20, -134 - br, 28, 22, 4); fillO(col('#2a2622'));
      ctx.fillStyle = col('#6a5a3a'); ctx.fillRect(-20, -118 - br, 28, 4);
      // riesige Schaufel, schwingt beim Angriff
      const atk = e.atkAt != null && run ? Math.max(0, 1 - (run.time - e.atkAt) / 0.45) : 0;
      ctx.save(); ctx.translate(-22, -70 - br); ctx.rotate(-0.5 - atk * 1.2);
      ctx.fillStyle = col('#5a3d25'); ctx.fillRect(-2.5, -10, 5, 74); ctx.fillStyle = col('#4a3220'); ctx.fillRect(-7, -14, 14, 5);
      ctx.beginPath(); ctx.moveTo(-12, 62); ctx.lineTo(12, 62); ctx.lineTo(10, 86); ctx.quadraticCurveTo(0, 94, -10, 86); ctx.closePath(); fillO(hit ? '#fff' : '#8a8f9c');
      ctx.restore();
      ctx.beginPath(); ctx.arc(-22, -70 - br, 7, 0, 7); fillO(col('#c8ccbc'));
    },
    x_theater(e, t, col, hit, ph) { // Der Puppenspieler
      const br = Math.sin(ph * 1.4) * 2, pull = Math.sin(ph * 3) * 6;
      // Spielkreuz über dem Kopf und Fäden zur kleinen Puppe vorne
      ctx.save(); ctx.translate(-28, -150 + br); ctx.rotate(Math.sin(ph * 1.5) * 0.15); ctx.fillStyle = col('#8a5a3a'); ctx.fillRect(-22, -2, 44, 4); ctx.fillRect(-2, -14, 4, 28); ctx.restore();
      ctx.strokeStyle = 'rgba(240,230,255,.6)'; ctx.lineWidth = 0.9; for (const [sx, tx] of [[-48, -54], [-28, -46], [-8, -38]]) { ctx.beginPath(); ctx.moveTo(sx, -150 + br); ctx.lineTo(tx, -40 + (sx === -28 ? pull : 0)); ctx.stroke(); }
      // kleine Puppe
      ctx.save(); ctx.translate(-46, -26 + pull * 0.4); ctx.fillStyle = col('#c43a6a'); ctx.fillRect(-6, -14, 12, 14); ctx.beginPath(); ctx.arc(0, -20, 6, 0, 7); fillO(col('#f2d8b0')); ctx.fillStyle = '#1b1726'; ctx.fillRect(-3, -21, 1.5, 1.5); ctx.fillRect(1, -21, 1.5, 1.5); ctx.strokeStyle = '#c9955a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-5, 10); ctx.moveTo(3, 0); ctx.lineTo(5, 10); ctx.stroke(); ctx.restore();
      // langer Frack
      ctx.beginPath(); ctx.moveTo(-18, -100 - br); ctx.lineTo(20, -100 - br); ctx.lineTo(30, -2); ctx.lineTo(10, -2); ctx.lineTo(4, -40); ctx.lineTo(-4, -40); ctx.lineTo(-10, -2); ctx.lineTo(-30, -2); ctx.closePath(); fillO(col('#3a2050'));
      poly([[-6, -98 - br], [6, -98 - br], [3, -50], [-3, -50]], col('#f2eaf8'));
      ctx.fillStyle = col('#c43a6a'); poly([[-6, -96 - br], [0, -90 - br], [6, -96 - br], [0, -92 - br]], col('#c43a6a'));
      // Arme mit langen Fingern nach oben zum Kreuz
      for (const [sx, ex] of [[-16, -40], [16, -14]]) { ctx.strokeStyle = col('#2a1840'); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, -92 - br); ctx.lineTo(ex, -132 + br); ctx.stroke(); ctx.strokeStyle = col('#e8dcc8'); ctx.lineWidth = 1.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(ex, -132 + br); ctx.lineTo(ex - 4 + i * 4, -142 + br); ctx.stroke(); } }
      // Kopf: weiße Maske mit breitem Grinsen und Zylinder
      ctx.beginPath(); ctx.ellipse(0, -114 - br, 15, 17, 0, 0, 7); fillO(hit ? '#fff' : '#f4f0f8');
      ctx.fillStyle = '#1b1726'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-3 + s * 6, -118 - br, 3.4, 4.4, 0, 0, 7); ctx.fill(); }
      geye(-9, -118 - br, 'rgba(255,138,200,.9)', 1.8); geye(3, -118 - br, 'rgba(255,138,200,.9)', 1.8);
      ctx.beginPath(); ctx.moveTo(-13, -108 - br); ctx.quadraticCurveTo(-3, -96 - br, 9, -108 - br); ctx.quadraticCurveTo(-3, -101 - br, -13, -108 - br); ctx.fillStyle = '#1b1726'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -130 - br, 20, 4, 0, 0, 7); fillO(col('#1b1726')); rr(-12, -158 - br, 24, 28, 3); fillO(col('#1b1726')); ctx.fillStyle = col('#c43a6a'); ctx.fillRect(-12, -138 - br, 24, 4);
    },
    x_hain(e, t, col, hit, ph) { // Der Moderhirsch
      const br = Math.sin(ph * 1.3) * 1.5, step = Math.sin(ph * 2) * 2;
      // Beine
      for (const [lx, s] of [[-30, step], [-16, -step], [18, step], [30, -step]]) { ctx.strokeStyle = OUT; ctx.lineWidth = 7.5; ctx.beginPath(); ctx.moveTo(lx, -46); ctx.lineTo(lx + s, -18); ctx.lineTo(lx + s * 0.5, 0); ctx.stroke(); ctx.strokeStyle = col('#3a2e2a'); ctx.lineWidth = 5; ctx.stroke(); }
      // Körper
      ctx.beginPath(); ctx.ellipse(0, -60 - br, 42, 22, 0, 0, 7); fillO(col('#4a3a34'));
      ctx.strokeStyle = 'rgba(230,220,200,.55)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-4 + i * 9, -60 - br, 12, 1.9, 4.4); ctx.stroke(); }
      for (const [fx, fy, r] of [[14, -74, 8], [-20, -52, 6], [26, -58, 5]]) { ctx.fillStyle = col('#7a3a9a'); ctx.beginPath(); ctx.ellipse(fx, fy - br, r, r * 0.7, 0, 0, 7); ctx.fill(); glowDot(fx, fy - br, r * 2, '190,90,255', 0.45); }
      ctx.fillStyle = '#4a6a3a'; ctx.beginPath(); ctx.ellipse(-4, -80 - br, 22, 5, 0, 0, 7); ctx.fill();
      // Hals und Kopf nach links
      ctx.beginPath(); ctx.moveTo(-30, -70 - br); ctx.quadraticCurveTo(-44, -88 - br, -48, -104 - br); ctx.lineTo(-36, -108 - br); ctx.quadraticCurveTo(-26, -86 - br, -14, -74 - br); ctx.closePath(); fillO(col('#4a3a34'));
      ctx.beginPath(); ctx.ellipse(-50, -106 - br, 13, 9, -0.35, 0, 7); fillO(col('#5a463e')); ctx.beginPath(); ctx.ellipse(-62, -100 - br, 6, 5, -0.3, 0, 7); fillO(col('#3a2e2a'));
      geye(-52, -110 - br, 'rgba(210,120,255,.95)', 2.2);
      // Geweih mit Pilzen und Ranken
      ctx.strokeStyle = col('#d8ccb0'); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { const bx = -46 + s * 4, by = -114 - br; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + s * 10 + 4, by - 26); ctx.lineTo(bx + s * 18 + 6, by - 46); ctx.moveTo(bx + s * 6 + 2, by - 14); ctx.lineTo(bx + s * 18, by - 18); ctx.moveTo(bx + s * 12 + 4, by - 32); ctx.lineTo(bx + s * 24 + 6, by - 34); ctx.stroke();
        ctx.fillStyle = col('#9a4aca'); ctx.beginPath(); ctx.ellipse(bx + s * 18 + 6, by - 47, 5, 2.6, 0, Math.PI, 0); ctx.fill(); glowDot(bx + s * 18 + 6, by - 46, 8, '190,90,255', 0.5); }
      for (let i = 0; i < 5; i++) { const q = (ph * 0.4 + i / 5) % 1; ctx.fillStyle = `rgba(200,120,255,${0.6 * (1 - q)})`; ctx.fillRect(Math.sin(i * 3) * 30, -80 - q * 60, 2, 2); }
    },
    x_werk(e, t, col, hit, ph) { // Der Dampfkoloss
      const br = Math.sin(ph * 2) * 1.2, atk = e.atkAt != null && run ? Math.max(0, 1 - (run.time - e.atkAt) / 0.4) : 0;
      for (let i = 0; i < 5; i++) { const q = (ph * 0.6 + i / 5) % 1; ctx.fillStyle = `rgba(210,210,220,${0.5 * (1 - q)})`; ctx.beginPath(); ctx.arc(14 + Math.sin(i * 2 + ph) * 4 + q * 10, -142 - q * 40, 6 + q * 12, 0, 7); ctx.fill(); }
      // Beine mit Kolben
      for (const lx of [-22, 8]) { rr(lx, -40, 16, 40, 4); fillO(col('#5a5f6b')); ctx.fillStyle = col('#c9a64a'); ctx.fillRect(lx + 2, -28, 12, 3); rr(lx - 4, -8, 24, 8, 3); fillO(col('#3a3e48')); }
      // Kessel-Rumpf
      rr(-36, -118 - br, 72, 80, 14); fillO(col('#9a6a3a')); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-36, -78 - br, 72, 6);
      ctx.fillStyle = 'rgba(60,40,20,.5)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-30 + i * 10, -112 - br, 1.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-30 + i * 10, -44 - br, 1.5, 0, 7); ctx.fill(); }
      // Feuerloch vorne
      rr(-22, -74 - br, 28, 18, 4); fillO('#2a1a10'); const fg = ctx.createLinearGradient(0, -72 - br, 0, -58 - br); fg.addColorStop(0, '#ffe08a'); fg.addColorStop(1, '#ff5a1a'); ctx.fillStyle = fg; ctx.fillRect(-19, -70 - br, 22, 11);
      ctx.fillStyle = '#2a1a10'; for (let i = 0; i < 4; i++) ctx.fillRect(-18 + i * 6, -71 - br, 2, 13); glowDot(-8, -64 - br, 30, '255,140,40', 0.45 + 0.15 * Math.sin(ph * 8));
      // Druckanzeige
      ctx.beginPath(); ctx.arc(18, -96 - br, 10, 0, 7); fillO('#e8e2d0'); ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, -96 - br); ctx.lineTo(18 + Math.cos(-2.4 + Math.sin(ph * 2) * 1.2) * 8, -96 - br + Math.sin(-2.4 + Math.sin(ph * 2) * 1.2) * 8); ctx.stroke();
      // Schornstein und Kopf-Luke mit Augen
      rr(8, -140 - br, 14, 26, 2); fillO(col('#3a3e48')); ctx.fillStyle = col('#c9a64a'); ctx.fillRect(6, -142 - br, 18, 4);
      rr(-26, -132 - br, 30, 16, 6); fillO(col('#5a5f6b')); geye(-18, -124 - br, 'rgba(255,170,60,.95)', 2.2); geye(-6, -124 - br, 'rgba(255,170,60,.95)', 2.2);
      // Kolbenarm mit Faust, stößt beim Angriff
      ctx.save(); ctx.translate(-34, -92 - br); ctx.rotate(0.5 - atk * 0.6);
      rr(-6, -4, 12, 30, 4); fillO(col('#5a5f6b')); ctx.fillStyle = col('#c9cdd6'); ctx.fillRect(-2, 24, 4, 10 + atk * 14);
      rr(-12, 32 + atk * 14, 24, 18, 5); fillO(hit ? '#fff' : '#3a3e48'); ctx.restore();
    },
    x_mine(e, t, col, hit, ph) { // Der Runenwächter
      const br = Math.sin(ph * 1.1) * 1.5, gl = 0.6 + 0.4 * Math.sin(ph * 2.5), RR = '255,90,60';
      const stone = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, hit ? '#fff' : '#8a7f7a'); g.addColorStop(1, hit ? '#fff' : '#3e3634'); return g; };
      for (const lx of [-28, 6]) { rr(lx, -36, 22, 36, 6); ctx.fillStyle = stone(-36, 0); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-36, -34); ctx.lineTo(34, -34); ctx.lineTo(44, -80 - br); ctx.lineTo(36, -118 - br); ctx.lineTo(8, -128 - br); ctx.lineTo(-26, -124 - br); ctx.lineTo(-44, -100 - br); ctx.lineTo(-42, -62); ctx.closePath(); ctx.fillStyle = stone(-128, -34); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      // Kristalle wachsen aus den Schultern
      for (const [cx, cy, h] of [[30, -116, 26], [20, -124, 18], [-30, -120, 22]]) { ctx.save(); ctx.translate(cx, cy - br); poly([[-5, 0], [0, -h], [5, 0]], hit ? '#fff' : '#ff8a6a', true); ctx.restore(); glowDot(cx, cy - br - h / 2, 14, RR, 0.35 * gl); }
      // rote Runen auf der Brust
      ctx.save(); ctx.strokeStyle = `rgba(${RR},${0.7 + 0.3 * gl})`; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, -104 - br); ctx.lineTo(-6, -60); ctx.moveTo(-6, -98 - br); ctx.lineTo(8, -86); ctx.lineTo(-6, -74); ctx.moveTo(-20, -90); ctx.lineTo(-14, -82); ctx.moveTo(14, -66); ctx.lineTo(22, -58); ctx.stroke(); ctx.restore();
      glowDot(-4, -82, 34, RR, 0.35 * gl);
      // Kopf, tief zwischen den Schultern
      rr(-22, -146 - br, 30, 24, 6); ctx.fillStyle = stone(-146, -122); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.fillStyle = '#1a1010'; ctx.fillRect(-18, -138 - br, 22, 6); geye(-13, -135 - br, `rgba(${RR},.95)`, 2.2); geye(-1, -135 - br, `rgba(${RR},.95)`, 2.2);
      // gewaltiger Arm nach vorne
      const atk = e.atkAt != null && run ? Math.max(0, 1 - (run.time - e.atkAt) / 0.45) : 0;
      ctx.save(); ctx.translate(-40, -104 - br); ctx.rotate(0.3 - atk * 0.9);
      rr(-10, 0, 20, 44, 7); ctx.fillStyle = stone(0, 44); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
      rr(-14, 40, 28, 24, 7); ctx.fillStyle = stone(40, 64); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = `rgba(${RR},${0.8 * gl})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 46); ctx.lineTo(6, 58); ctx.moveTo(6, 46); ctx.lineTo(-6, 58); ctx.stroke(); ctx.restore();
    },
  });
  // ---------- Wochenbosse (Version 7): drei eigene Riesen, nur für den Wochenboss ----------
  const bossAtk = (e, len = 0.45) => (run && e.atkAt != null ? Math.max(0, 1 - (run.time - e.atkAt) / len) : 0);
  // dicker Hals/Tentakel als Kette aus Kreisen entlang einer Kurve
  // glatter Schlauch mit Umriss: Teilstücke mit abnehmender Breite und runden Enden
  function tube(pts, w0, w1, fill, edge = OUT) {
    const n = pts.length - 1; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) for (let i = 0; i < n; i++) { const w = w0 + (w1 - w0) * (i + 0.5) / n;
      ctx.strokeStyle = pass ? (typeof fill === 'function' ? fill(i / n) : fill) : edge; ctx.lineWidth = pass ? w : w + 2.6;
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke(); }
    // Glanzlinie
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); pts.forEach(([x, y], i) => { const w = w0 + (w1 - w0) * i / n; i ? ctx.lineTo(x - w * 0.2, y - w * 0.2) : ctx.moveTo(x - w * 0.2, y - w * 0.2); }); ctx.lineWidth = Math.max(1, w0 * 0.2); ctx.stroke();
    ctx.restore();
  }
  const bez = (p0, p1, p2, p3, n) => { const out = []; for (let i = 0; i <= n; i++) { const q = i / n, a = (1 - q) ** 3, b = 3 * (1 - q) ** 2 * q, c = 3 * (1 - q) * q * q, d = q ** 3; out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); } return out; };
  const WB_ART = [
    // 0 – Tiamat, die Sternenhydra: fünf Köpfe auf einem Leib aus Sternennebel
    function tiamat(e, t, col, hit, ph) {
      ctx.scale(0.86, 0.86);
      const atk = bossAtk(e), br = Math.sin(t * 1.2);
      const C = c => (hit ? '#ffffff' : c);
      // Schwanz
      tube(bez([40, -40], [80, -30], [95, -70 + Math.sin(t * 1.5) * 8], [70, -95 + Math.sin(t * 1.5) * 12], 22), 18, 4, q => C(q < 0.5 ? '#2a2f6a' : '#3a3f8a'));
      // Beine hinten
      for (const [lx, d] of [[30, 1], [-20, 0]]) { ctx.save(); ctx.translate(lx, -30); const k = Math.sin(t * 2 + lx) * 0.05; limb(0, 0, 0.2 + k, 16, 13, C(d ? '#22265a' : '#2a2f6a')); limb(Math.sin(0.2) * 16, 16, -0.1, 12, 11, C('#1c2050')); for (let i = 0; i < 3; i++) poly([[-6 + i * 4 + Math.sin(0.2) * 16, 27], [-9 + i * 4 + Math.sin(0.2) * 16, 31], [-4 + i * 4 + Math.sin(0.2) * 16, 29]], C('#f0e8ff'), true); ctx.restore(); }
      // Leib mit Sternennebel
      ctx.save(); ctx.beginPath(); ctx.ellipse(10, -58 + br, 62, 40, -0.08, 0, 7); ctx.closePath();
      ctx.fillStyle = hit ? '#fff' : RG(-10, -70, 80, '#5a4ab8', '#141640'); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.clip();
      if (!hit) { for (let i = 0; i < 4; i++) glowDot(-20 + i * 22 + Math.sin(t * 0.5 + i) * 8, -60 + Math.cos(t * 0.4 + i * 2) * 14, 26, ['120,90,255', '80,200,255', '255,120,220', '120,255,220'][i], 0.35);
        for (let i = 0; i < 40; i++) { const sx = -50 + hash(i) * 120, sy = -95 + hash(i + 9) * 75, tw = 0.5 + 0.5 * Math.sin(t * 3 + i); ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`; ctx.fillRect(sx, sy + br, i % 7 ? 1.2 : 2.2, i % 7 ? 1.2 : 2.2); } }
      ctx.restore();
      // Schuppenkamm
      for (let i = 0; i < 8; i++) poly([[-30 + i * 11, -95 + Math.abs(i - 3.5) * 2.4 + br], [-25 + i * 11, -109 + Math.abs(i - 3.5) * 2.6 + br], [-20 + i * 11, -95 + Math.abs(i - 3.5) * 2.4 + br]], C(i % 2 ? '#7ad7ff' : '#c08cff'), true);
      // Vorderbeine
      for (const lx of [-35, 5]) { const kn = limb(lx, -38, -0.25, 16, 14, C('#30357a'), 'rgba(255,255,255,.15)'); const ft = limb(kn[0], kn[1], 0.05, 14, 12, C('#262a66')); for (let i = 0; i < 3; i++) poly([[ft[0] - 8 + i * 4, ft[1] - 2], [ft[0] - 12 + i * 4, ft[1] + 2], [ft[0] - 6 + i * 4, ft[1] + 1]], C('#f0e8ff'), true); }
      // fünf Hälse mit Köpfen, jeder in eigener Edelstein-Farbe
      const heads = [[-110, -140, '#7ad7ff', '122,215,255'], [-78, -170, '#ff7ad8', '255,122,216'], [-40, -182, '#ffd27a', '255,210,122'], [-122, -100, '#9be36b', '155,227,107'], [-4, -168, '#c08cff', '192,140,255']];
      heads.forEach(([hx, hy, hc, rgb], i) => {
        const sw = Math.sin(t * 1.3 + i * 1.7) * 7, lunge = atk * (i % 2 ? 26 : 18) * Math.sin((1 - atk) * Math.PI + 0.3);
        const X = hx + sw - lunge, Y = hy + Math.cos(t * 1.1 + i) * 5 + lunge * 0.3;
        const base = [-30 + i * 9, -80];
        tube(bez(base, [base[0] - 10, base[1] - 40], [X + 30, Y + 30], [X + 8, Y + 4], 18), 17, 9, q => C(q > 0.85 ? hc : '#2a2f6a'));
        ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.15 + Math.sin(t * 1.3 + i) * 0.08 - atk * 0.2);
        const open = atk * 7 + Math.max(0, Math.sin(t * 0.9 + i * 2)) * 2;
        // Unterkiefer
        ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(-20, 3 + open); ctx.lineTo(-17, 7 + open); ctx.lineTo(8, 8); ctx.closePath(); fillO(C('#22265a'));
        // Kopf mit Schnauze
        ctx.beginPath(); ctx.moveTo(12, -8); ctx.quadraticCurveTo(0, -14, -14, -8); ctx.lineTo(-24, -3); ctx.quadraticCurveTo(-25, 2, -20, 3); ctx.lineTo(8, 4); ctx.quadraticCurveTo(15, 1, 12, -8); ctx.closePath(); fillO(hit ? '#fff' : LG(-14, 4, hc, '#2a2f6a'));
        for (let k = 0; k < 4; k++) poly([[-18 + k * 4, 3], [-16 + k * 4, 6.5 + open * 0.3], [-14 + k * 4, 3]], '#ffffff', false);
        poly([[6, -9], [16, -22], [12, -7]], C('#f0e8ff'), true); poly([[0, -11], [6, -22], [5, -9]], C('#d8ccff'), true);
        glowDot(-8, -7, 7, rgb, 0.9); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-8, -7, 2.4, 1.6, -0.2, 0, 7); ctx.fill();
        if (open > 3) { glowDot(-24, 4, 10 + open * 2, rgb, 0.8); }
        ctx.restore();
      });
      // Sternenstaub um die Köpfe
      for (let i = 0; i < 10; i++) { const q = (t * 0.25 + i / 10) % 1; glowDot(-140 + hash(i) * 160, -60 - q * 160, 3, '220,210,255', 0.8 * Math.sin(q * Math.PI)); }
    },
    // 1 – Ferrox, der Uhrwerk-Koloss: Dampfkessel-Bauch, Kolbenbeine, Hammerarm
    function ferrox(e, t, col, hit, ph) {
      ctx.scale(0.9, 0.9);
      const atk = bossAtk(e, 0.55), C = c => (hit ? '#ffffff' : c), puff = Math.sin(t * 3);
      const brass = (y0, y1) => (hit ? '#fff' : LG(y0, y1, '#e8b860', '#7a5420')), iron = (y0, y1) => (hit ? '#fff' : LG(y0, y1, '#8a92a2', '#3a404c'));
      // großes Zahnrad hinten
      gear(30, -120, 34, t * 0.6, C('#b8862e')); gear(55, -80, 18, -t * 1.1, C('#9a7030'));
      // Rauch aus den Schornsteinen
      for (const sx of [20, 46]) { for (let i = 0; i < 5; i++) { const q = (t * 0.5 + i / 5 + sx * 0.01) % 1; ctx.fillStyle = `rgba(90,90,100,${0.5 * (1 - q)})`; ctx.beginPath(); ctx.arc(sx + q * 18, -188 - q * 50, 6 + q * 14, 0, 7); ctx.fill(); } rr(sx - 6, -190, 12, 30, 2); fillO(iron(-190, -160)); rr(sx - 8, -194, 16, 6, 2); fillO(brass(-194, -188)); }
      // Kolbenbeine
      for (const [lx, d] of [[25, 1], [-20, 0]]) { const st = Math.sin(t * 2 + lx) * 2;
        rr(lx - 9, -62, 18, 28, 4); fillO(d ? iron(-62, -34) : brass(-62, -34));
        rr(lx - 5, -38 + st, 10, 24, 2); fillO(C('#c9cdd6')); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(lx - 5, -30 + st, 10, 2);
        rr(lx - 16, -14, 32, 14, 4); fillO(iron(-14, 0)); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(lx - 11 + i * 7, -7, 1.5, 0, 7); ctx.fill(); } }
      // Kanonenarm hinten (rechts)
      ctx.save(); ctx.translate(55, -140); ctx.rotate(0.3 + Math.sin(t) * 0.05); rr(-8, 0, 16, 40, 5); fillO(brass(0, 40)); rr(-11, 36, 22, 30, 4); fillO(iron(36, 66)); ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(0, 66, 6, 0, 7); ctx.fill(); glowDot(0, 66, 10, '255,140,60', 0.4 + 0.2 * puff); ctx.restore();
      // Kessel-Rumpf
      ctx.beginPath(); ctx.moveTo(-45, -60); ctx.quadraticCurveTo(-55, -130, -15, -165); ctx.quadraticCurveTo(30, -175, 55, -150); ctx.quadraticCurveTo(70, -100, 50, -60); ctx.quadraticCurveTo(0, -48, -45, -60); ctx.closePath(); fillO(brass(-170, -55));
      ctx.strokeStyle = 'rgba(90,60,20,.6)'; ctx.lineWidth = 2; for (const yy of [-140, -110, -80]) { ctx.beginPath(); ctx.moveTo(-50, yy); ctx.quadraticCurveTo(5, yy + 8, 60, yy); ctx.stroke(); }
      ctx.fillStyle = '#5a3a14'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-40 + i * 11, -140 + Math.sin(i) * 2, 1.6, 0, 7); ctx.arc(-42 + i * 11.5, -82, 1.6, 0, 7); ctx.fill(); }
      // Feuerluke im Bauch
      rr(-30, -122, 44, 34, 8); fillO(iron(-122, -88));
      const fire = 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 5.3);
      if (!hit) { ctx.fillStyle = RG(-8, -100, 24, `rgba(255,${200 + fire * 40},120,1)`, 'rgba(200,60,20,1)'); rr(-26, -118, 36, 26, 6); ctx.fill(); glowDot(-8, -105, 40, '255,140,50', 0.5 * fire); }
      ctx.fillStyle = '#2a2a30'; for (let i = 0; i < 5; i++) ctx.fillRect(-24 + i * 7.5, -118, 2.4, 26);
      // Druckanzeige
      ctx.beginPath(); ctx.arc(32, -118, 11, 0, 7); fillO(C('#f4ecd8')); ctx.strokeStyle = '#1b1726'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(32, -118); ctx.lineTo(32 + Math.cos(-2.5 + puff * 0.8 + atk * 1.5) * 8, -118 + Math.sin(-2.5 + puff * 0.8 + atk * 1.5) * 8); ctx.stroke(); ctx.strokeStyle = '#e5484d'; ctx.beginPath(); ctx.arc(32, -118, 8.5, -0.6, 0.2); ctx.stroke();
      // Kopf: Kuppel mit großem Linsenauge
      ctx.save(); ctx.translate(-8, -172); ctx.rotate(Math.sin(t * 0.8) * 0.04 - atk * 0.1);
      ctx.beginPath(); ctx.arc(0, 0, 22, Math.PI, 0); ctx.lineTo(22, 8); ctx.lineTo(-22, 8); ctx.closePath(); fillO(iron(-22, 8));
      ctx.beginPath(); ctx.arc(-6, -2, 11, 0, 7); fillO(brass(-13, 9)); ctx.beginPath(); ctx.arc(-6, -2, 8, 0, 7); ctx.fillStyle = '#1b1726'; ctx.fill();
      if (!hit) { glowDot(-6, -2, 14, '255,180,60', 0.9); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(-7, -2, 4.5, 0, 7); ctx.fill(); ctx.save(); ctx.translate(-7, -2); ctx.rotate(t * 2); ctx.strokeStyle = '#a8600a'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(4, 0); ctx.stroke(); } ctx.restore(); ctx.fillStyle = '#fff'; ctx.fillRect(-9, -5, 2, 2); }
      ctx.fillStyle = '#c9cdd6'; for (let i = 0; i < 4; i++) ctx.fillRect(-18 + i * 9, 3, 5, 3);
      ctx.restore();
      // Hammerarm vorne (links): holt aus und schlägt zu
      const sw = atk > 0 ? (atk > 0.55 ? -1.6 * eOut((1 - atk) / 0.45) : -1.6 + 2.3 * eOut((0.55 - atk) / 0.55)) : 0.15 + Math.sin(t * 1.1) * 0.05;
      ctx.save(); ctx.translate(-48, -140); ctx.rotate(sw);
      rr(-9, -4, 18, 40, 6); fillO(brass(-4, 36)); ctx.fillStyle = '#c9cdd6'; rr(-4, 30, 8, 18, 2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.translate(0, 52); rr(-24, -12, 48, 26, 5); fillO(iron(-12, 14)); rr(-26, -14, 8, 30, 3); fillO(brass(-14, 16)); rr(18, -14, 8, 30, 3); fillO(brass(-14, 16));
      ctx.fillStyle = '#ffd27a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-8 + i * 8, 1, 2, 0, 7); ctx.fill(); } ctx.restore();
      ctx.restore();
      if (atk > 0 && atk < 0.45) { const q = 1 - atk / 0.45; for (let i = 0; i < 10; i++) { const a = Math.PI + i / 9 * Math.PI; ctx.fillStyle = `rgba(200,180,140,${0.6 * (1 - q)})`; ctx.beginPath(); ctx.arc(-80 + Math.cos(a) * q * 40, -4 + Math.sin(a) * q * 12, 5 + q * 6, 0, 7); ctx.fill(); } }
    },
    // 2 – Morwen, die Schattenkönigin: schwebender Geisterleib, Maske, Krone, Schattenarme
    function morwen(e, t, col, hit, ph) {
      ctx.scale(0.86, 0.86);
      const atk = bossAtk(e, 0.5), hov = Math.sin(t * 1.4) * 6 - 6, C = c => (hit ? '#ffffff' : c);
      // Schattententakel hinten
      for (let i = 0; i < 6; i++) { const a0 = -0.4 + i * 0.35, wv = Math.sin(t * 1.6 + i * 1.3);
        tube(bez([20, -120 + hov], [60 + Math.cos(a0) * 20, -160 + i * 14 + hov], [90 + wv * 15, -100 + i * 20 + hov], [70 + wv * 25, -40 + i * 18 + hov], 16), 12, 2, q => C(`rgb(${40 + q * 40},${20 + q * 10},${70 + q * 50})`)); }
      // Seelenlichter
      for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * 1.05; glowDot(Math.cos(a) * 80, -110 + Math.sin(a) * 30 + hov, 7, '200,150,255', 0.7); }
      // Kleid, das unten in Schattenfetzen zerfällt
      ctx.beginPath(); ctx.moveTo(-28, -120 + hov); ctx.quadraticCurveTo(-55, -60 + hov, -60, -20 + hov);
      for (let i = 0; i <= 10; i++) { const q = i / 10, xx = -60 + q * 120, yy = -20 + hov + Math.sin(t * 3 + i * 1.7) * 6 + (i % 2 ? 10 : -2); ctx.lineTo(xx, yy); }
      ctx.quadraticCurveTo(55, -60 + hov, 30, -120 + hov); ctx.closePath(); fillO(hit ? '#fff' : LG(-120 + hov, -10 + hov, '#3a2060', '#0a0614'));
      ctx.strokeStyle = 'rgba(200,150,255,.35)'; ctx.lineWidth = 1.5; for (const xx of [-25, 0, 25]) { ctx.beginPath(); ctx.moveTo(xx * 0.6, -110 + hov); ctx.quadraticCurveTo(xx, -70 + hov, xx * 1.3, -25 + hov); ctx.stroke(); }
      // Oberkörper
      ctx.beginPath(); ctx.moveTo(-26, -118 + hov); ctx.quadraticCurveTo(-30, -150 + hov, -14, -162 + hov); ctx.lineTo(14, -162 + hov); ctx.quadraticCurveTo(30, -150 + hov, 26, -118 + hov); ctx.closePath(); fillO(hit ? '#fff' : LG(-162 + hov, -118 + hov, '#4a2a7a', '#1a0e2e'));
      ctx.fillStyle = '#c08cff'; ctx.beginPath(); ctx.moveTo(0, -158 + hov); ctx.lineTo(5, -140 + hov); ctx.lineTo(0, -126 + hov); ctx.lineTo(-5, -140 + hov); ctx.closePath(); ctx.fill(); glowDot(0, -140 + hov, 10, '192,140,255', 0.7);
      // langes Haar
      ctx.beginPath(); ctx.moveTo(-12, -190 + hov); ctx.quadraticCurveTo(30 + Math.sin(t) * 5, -185 + hov, 38 + Math.sin(t * 1.3) * 6, -120 + hov); ctx.quadraticCurveTo(20, -140 + hov, 12, -165 + hov); ctx.closePath(); fillO(C('#1a1226'));
      // Kopf mit Maske
      ctx.save(); ctx.translate(-2, -180 + hov); ctx.rotate(-0.08 - atk * 0.15);
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 17, 0, 0, 7); fillO(hit ? '#fff' : LG(-17, 17, '#f4f0fa', '#b8b0cc'));
      ctx.strokeStyle = '#2a1a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, 9); ctx.quadraticCurveTo(-1, 12 + atk * 3, 4, 9); ctx.stroke();
      for (const ex of [-8, 3]) { ctx.fillStyle = '#1a0e2e'; ctx.beginPath(); ctx.ellipse(ex, -2, 4, 2.6, ex < 0 ? 0.2 : -0.2, 0, 7); ctx.fill(); if (!hit) { glowDot(ex, -2, 9, '200,120,255', 0.9); ctx.fillStyle = '#f0d8ff'; ctx.beginPath(); ctx.arc(ex - 0.5, -2, 1.3, 0, 7); ctx.fill(); } }
      ctx.strokeStyle = 'rgba(120,80,160,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 1.5); ctx.lineTo(-9, 8); ctx.moveTo(3, 1.5); ctx.lineTo(4, 7); ctx.stroke();
      // Krone aus schwarzen Zacken
      for (let i = 0; i < 7; i++) { const xx = -14 + i * 4.7, hh = 12 + (i % 2 ? 6 : 0) + (i === 3 ? 10 : 0); poly([[xx - 2.6, -13], [xx, -13 - hh], [xx + 2.6, -13]], C('#1a1226'), true); }
      ctx.fillStyle = '#c08cff'; for (const xx of [-9.5, 0.2, 9.8]) { ctx.beginPath(); ctx.arc(xx, -16, 1.8, 0, 7); ctx.fill(); }
      glowDot(0.2, -30, 6, '192,140,255', 0.8);
      ctx.restore();
      // Schattenhände: die vordere greift beim Angriff zu
      const reach = atk * 40;
      for (const [hx, hy, s2, back] of [[50, -130, 1, true], [-48 - reach, -135 + Math.sin(t * 1.7) * 6 + reach * 0.3, -1, false]]) {
        ctx.save(); ctx.translate(hx, hy + hov); ctx.scale(s2 < 0 ? 1 : -1, 1);
        tube(bez([28, 6], [16, 2], [8, 4], [0, 0], 8), 9, 7, C(back ? '#2a1a40' : '#3a2458'));
        ctx.beginPath(); ctx.ellipse(-3, 0, 8, 6.5, 0, 0, 7); fillO(C('#d8d0e8'));
        for (let k = 0; k < 4; k++) { const fa = -0.9 + k * 0.5 + (atk > 0 ? -0.3 : Math.sin(t * 2 + k) * 0.1); tube(bez([-7, -2 + k * 1.6], [-12 + Math.cos(fa) * -3, -4 + k * 2], [-16, -2 + k * 3 + Math.sin(fa) * 4], [-21, 2 + k * 3.2 + Math.sin(fa) * 6], 5), 3.4, 1.6, C('#e8e0f4')); }
        ctx.restore();
      }
    },
  ];
  function bossDraw(e, t, col) {
    const hit = e.hitT > 0 && t - (e._flT || -9) < 0.07, ph = t + e.bob;
    if (e.wb && WB_ART[e.wbk]) return WB_ART[e.wbk](e, t, col, hit, ph);
    if (BOSS_ART[e.bk]) return BOSS_ART[e.bk](e, t, col, hit, ph);
    if (e.type === 'schleim') {
      const sq = Math.sin(ph * 3) * 3;
      ctx.fillStyle = col('#3a9e4c');
      for (let i = 0; i < 5; i++) { const dx = -36 + i * 18, dl = 4 + ((ph * 6 + i * 3.3) % 9); ctx.beginPath(); ctx.ellipse(dx, 1, 4, dl, 0, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-48, 0); ctx.bezierCurveTo(-54, -42 - sq, -28, -70 + sq, 0, -70 + sq); ctx.bezierCurveTo(30, -70 + sq, 54, -42 - sq, 48, 0); ctx.closePath();
      const g = ctx.createLinearGradient(0, -70, 0, 0); g.addColorStop(0, hit ? '#fff' : '#9cf59a'); g.addColorStop(1, hit ? '#fff' : '#2f8a42');
      ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(16, -22); ctx.rotate(0.7); ctx.fillStyle = '#fff'; ctx.fillRect(-11, -2, 22, 4); ctx.beginPath(); ctx.arc(-11, -2, 3.5, 0, 7); ctx.arc(-11, 2, 3.5, 0, 7); ctx.arc(11, -2, 3.5, 0, 7); ctx.arc(11, 2, 3.5, 0, 7); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(-20, -14); ctx.rotate(-0.4); ctx.fillStyle = '#c9cdd6'; ctx.fillRect(-2, -16, 4, 24); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-6, 4, 12, 3); ctx.restore();
      for (let i = 0; i < 6; i++) { const p = (ph * 0.35 + i * 0.17) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - p)})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(-28 + i * 11, -6 - p * 48, 1.5 + (i % 3), 0, 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-24, -50 + sq, 10, 5, -0.6, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1b3d22'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-30, -48 + sq); ctx.lineTo(-14, -41 + sq); ctx.moveTo(0, -41 + sq); ctx.lineTo(14, -48 + sq); ctx.stroke();
      for (const ex of [-21, 7]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, -35 + sq, 7, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(ex - 3, -34 + sq, 3, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#1b3d22'; ctx.beginPath(); ctx.ellipse(-8, -18 + sq / 2, 15, 7 + Math.abs(sq), 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) poly([[-20 + i * 7, -18 + sq / 2], [-16 + i * 7, -18 + sq / 2], [-18 + i * 7, -13 + sq / 2]], '#fff');
      ctx.save(); ctx.translate(6, -68 + sq); ctx.rotate(-0.18);
      poly([[-18, 4], [-20, -14], [-10, -5], [0, -18], [10, -5], [20, -14], [18, 4]], col('#ffd23f'), true);
      ctx.fillStyle = '#e0a020'; ctx.fillRect(-18, 0, 36, 4); ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(0, -4, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#3b7ad6'; ctx.beginPath(); ctx.arc(-10, -1, 2, 0, 7); ctx.arc(10, -1, 2, 0, 7); ctx.fill();
      ctx.restore();
      return;
    }
    if (e.type === 'goblin') {
      const sw = Math.sin(ph * 2) * 0.06;
      ctx.fillStyle = col('#6b5a48'); ctx.beginPath(); ctx.moveTo(6, -66); ctx.quadraticCurveTo(38, -50, 34, -4); ctx.lineTo(22, -10); ctx.lineTo(14, -2); ctx.lineTo(6, -12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col('#3f5e24'); ctx.fillRect(-15, -22, 11, 22); ctx.fillRect(4, -22, 11, 22);
      ctx.fillStyle = '#4a3220'; rr(-17, -6, 14, 6, 2); ctx.fill(); rr(3, -6, 14, 6, 2); ctx.fill();
      rr(-19, -64, 38, 46, 9); fillO(col('#5e8c3a'));
      ctx.fillStyle = col('#7a5534'); ctx.save(); ctx.beginPath(); ctx.rect(-19, -64, 38, 46); ctx.clip(); ctx.rotate(0.5); ctx.fillRect(-30, -46, 60, 7); ctx.restore();
      ctx.fillStyle = '#4a3220'; ctx.fillRect(-19, -28, 38, 6); ctx.fillStyle = '#efe9d8'; ctx.beginPath(); ctx.arc(0, -25, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.fillRect(-2.5, -26, 2, 2); ctx.fillRect(0.5, -26, 2, 2);
      ctx.save(); ctx.translate(26, -2); ctx.rotate(sw);
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(-2, -104, 4, 104);
      ctx.beginPath(); ctx.arc(0, -108, 7, 0, 7); fillO(col('#efe9d8')); ctx.fillStyle = '#1b1726'; ctx.fillRect(-4, -110, 3, 3); ctx.fillRect(1, -110, 3, 3);
      ctx.fillStyle = `rgba(120,255,140,${0.6 + 0.4 * Math.sin(ph * 5)})`; ctx.fillRect(-4, -110, 2, 2); ctx.fillRect(1, -110, 2, 2);
      for (const [fx, c2] of [[-6, '#e5484d'], [0, '#ffd23f'], [6, '#3b7ad6']]) poly([[fx, -98], [fx - 3, -84], [fx + 3, -84]], c2);
      ctx.restore();
      ctx.save(); ctx.translate(-16, -56); ctx.rotate(-0.5 + Math.sin(ph * 2.5) * 0.15);
      rr(-4, 0, 8, 22, 3); fillO(col('#6fa046'));
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(-2, 18, 4, 10);
      poly([[-2, 26], [-24, 22], [-26, 38], [-2, 34]], col('#b7bcc6'), true);
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, -76, 15, 0, 7); fillO(col('#6fa046'));
      poly([[-12, -80], [-30, -92], [-13, -71]], col('#6fa046'), true); poly([[12, -80], [30, -92], [13, -71]], col('#6fa046'), true);
      ctx.fillStyle = '#e5484d'; ctx.fillRect(-11, -78, 6, 2); ctx.fillRect(-11, -74, 6, 2);
      ctx.beginPath(); ctx.arc(0, -82, 15.5, Math.PI, 0); ctx.lineTo(15.5, -80); ctx.lineTo(-15.5, -80); fillO('#5b5f6b');
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * 12, -88); ctx.quadraticCurveTo(sgn * 26, -96, sgn * 22, -112); ctx.quadraticCurveTo(sgn * 18, -98, sgn * 6, -94); fillO('#efe9d8'); }
      geye(-7, -77, 'rgba(255,210,63,.9)', 2.5); geye(5, -77, 'rgba(255,210,63,.9)', 2.5);
      ctx.fillStyle = '#1b1726'; ctx.fillRect(-8, -67, 14, 3);
      poly([[-7, -67], [-5, -72], [-3, -67]], '#fff'); poly([[3, -67], [5, -72], [7, -67]], '#fff');
      return;
    }
    if (e.type === 'skelett') {
      const fl = Math.sin(ph * 1.8) * 3;
      ctx.save(); ctx.translate(0, fl - 4);
      for (let i = 0; i < 3; i++) { const a = ph * 1.4 + i * 2.1, x = Math.cos(a) * 40, y = -60 + Math.sin(a) * 14; ctx.fillStyle = 'rgba(190,160,255,.35)'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(230,220,255,.8)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
      const g = ctx.createLinearGradient(0, -78, 0, 0); g.addColorStop(0, hit ? '#fff' : '#4b2d6e'); g.addColorStop(1, hit ? '#fff' : '#20122e');
      ctx.beginPath(); ctx.moveTo(-16, -74); ctx.lineTo(16, -74); ctx.lineTo(30, 0);
      for (let i = 0; i < 6; i++) ctx.lineTo(30 - i * 10 - 5, -6 - (i % 2) * 6 + Math.sin(ph * 4 + i) * 2);
      ctx.lineTo(-30, 0); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.fillStyle = '#1a0f26'; poly([[-9, -72], [9, -72], [5, -38], [-5, -38]], '#1a0f26');
      ctx.fillStyle = col('#e8e2d0'); ctx.fillRect(-1.5, -70, 3, 30); for (let i = 0; i < 4; i++) { rr(-8, -66 + i * 7, 16, 2.5, 1); ctx.fill(); }
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sgn * 16, -72, 9, 6, 0, 0, 7); fillO(col('#efe9d8')); poly([[sgn * 12, -76], [sgn * 22, -90], [sgn * 20, -74]], col('#efe9d8'), true); }
      ctx.save(); ctx.translate(-28, 0); ctx.rotate(-0.08);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-2, -116, 4, 112);
      ctx.beginPath(); ctx.moveTo(2, -112); ctx.quadraticCurveTo(-34, -124, -46, -92); ctx.quadraticCurveTo(-30, -108, 2, -104); ctx.closePath(); fillO(col('#c9cdd6'));
      ctx.restore();
      ctx.beginPath(); ctx.arc(-24, -48, 5, 0, 7); fillO(col('#efe9d8'));
      ctx.beginPath(); ctx.arc(0, -88, 13, 0, 7); fillO(col('#efe9d8'));
      rr(-8, -80, 16, 8, 3); fillO(col('#e8e2d0')); ctx.fillStyle = '#1b1726'; for (let i = 0; i < 4; i++) ctx.fillRect(-6 + i * 4, -78, 1.5, 5);
      ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(-5, -90, 4, 0, 7); ctx.arc(5, -90, 4, 0, 7); ctx.fill();
      geye(-5, -90, 'rgba(180,140,255,.95)', 2.2); geye(5, -90, 'rgba(180,140,255,.95)', 2.2);
      poly([[-13, -98], [-15, -112], [-8, -102], [-4, -116], [0, -103], [4, -116], [8, -102], [15, -112], [13, -98]], col('#b08a3a'), true);
      ctx.fillStyle = '#c9a6ff'; ctx.beginPath(); ctx.arc(0, -103, 2.2, 0, 7); ctx.fill();
      ctx.restore();
      return;
    }
    if (e.type === 'daemon') {
      const flap = Math.sin(ph * 4) * 0.18;
      const au = ctx.createRadialGradient(0, -55, 10, 0, -55, 70); au.addColorStop(0, 'rgba(255,140,40,.45)'); au.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = au; ctx.beginPath(); ctx.arc(0, -55, 70 + Math.sin(ph * 7) * 3, 0, 7); ctx.fill();
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(sgn * 10, -66); ctx.rotate(sgn * flap); ctx.scale(sgn, 1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, -34); ctx.lineTo(58, -40); ctx.quadraticCurveTo(52, -26, 56, -14); ctx.quadraticCurveTo(44, -18, 42, -6); ctx.quadraticCurveTo(30, -12, 26, 2); ctx.quadraticCurveTo(14, -4, 4, 10); ctx.closePath(); fillO(col('#5a1612'));
        ctx.strokeStyle = '#2a0a08'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(56, -14); ctx.moveTo(0, 0); ctx.lineTo(42, -6); ctx.moveTo(26, -34); ctx.lineTo(26, 2); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = col('#7a1d18'); ctx.fillRect(-16, -24, 12, 24); ctx.fillRect(4, -24, 12, 24);
      ctx.fillStyle = '#1b0e0c'; rr(-18, -6, 15, 6, 2); ctx.fill(); rr(3, -6, 15, 6, 2); ctx.fill();
      rr(-22, -74, 44, 54, 12); fillO(col('#b8322a'));
      ctx.strokeStyle = `rgba(255,190,80,${0.6 + 0.4 * Math.sin(ph * 6)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -66); ctx.lineTo(-4, -52); ctx.lineTo(-12, -40); ctx.moveTo(8, -64); ctx.lineTo(12, -48); ctx.lineTo(6, -34); ctx.stroke();
      for (const sgn of [-1, 1]) poly([[sgn * 16, -74], [sgn * 30, -84], [sgn * 24, -70]], col('#2a1a1a'), true);
      ctx.save(); ctx.translate(-30, -4);
      ctx.fillStyle = '#2a1a1a'; ctx.fillRect(-2, -112, 4, 110);
      poly([[-10, -112], [10, -112], [10, -106], [-10, -106]], '#2a1a1a');
      for (const px of [-10, 0, 10]) poly([[px - 2, -110], [px, -126], [px + 2, -110]], '#c9cdd6', true);
      for (let i = 0; i < 4; i++) { const h = 10 + Math.sin(ph * 12 + i) * 4; ctx.fillStyle = ['#ff7a3d', '#ffd23f'][i % 2]; ctx.beginPath(); ctx.moveTo(-10 + i * 6, -124); ctx.quadraticCurveTo(-8 + i * 6, -124 - h, -5 + i * 6, -124); ctx.fill(); }
      ctx.restore();
      ctx.save(); ctx.translate(-20, -64); ctx.rotate(0.6); rr(-5, 0, 10, 26, 4); fillO(col('#b8322a')); ctx.restore();
      ctx.beginPath(); ctx.arc(0, -86, 15, 0, 7); fillO(col('#c4382f'));
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * 9, -96); ctx.quadraticCurveTo(sgn * 34, -100, sgn * 30, -126); ctx.quadraticCurveTo(sgn * 24, -106, sgn * 4, -100); fillO('#2a1a1a'); }
      geye(-7, -88, 'rgba(255,220,80,.95)', 2.6); geye(5, -88, 'rgba(255,220,80,.95)', 2.6);
      ctx.fillStyle = '#1b0e0c'; ctx.beginPath(); ctx.moveTo(-9, -78); ctx.quadraticCurveTo(-1, -72, 7, -78); ctx.lineTo(-9, -78); ctx.fill();
      poly([[-7, -78], [-5, -73], [-3, -78]], '#fff'); poly([[1, -78], [3, -73], [5, -78]], '#fff');
      return;
    }
    // Frostriese
    for (let i = 0; i < 8; i++) { const a = ph * 0.8 + i * 0.8, x = Math.cos(a) * 52, y = -56 + Math.sin(a * 1.3) * 40; ctx.fillStyle = 'rgba(230,248,255,.85)'; ctx.fillRect(x, y, 2.5, 2.5); }
    const mist = ctx.createRadialGradient(0, -4, 4, 0, -4, 60); mist.addColorStop(0, 'rgba(200,235,255,.45)'); mist.addColorStop(1, 'rgba(200,235,255,0)'); ctx.fillStyle = mist; ctx.fillRect(-60, -30, 120, 34);
    ctx.fillStyle = col('#7f9fba'); rr(-20, -28, 15, 28, 4); ctx.fill(); rr(5, -28, 15, 28, 4); ctx.fill();
    const g = ctx.createLinearGradient(0, -90, 0, -20); g.addColorStop(0, hit ? '#fff' : '#e3f1fb'); g.addColorStop(1, hit ? '#fff' : '#8fb0c8');
    rr(-28, -90, 56, 66, 14); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,140,180,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -80); ctx.lineTo(-6, -64); ctx.lineTo(-16, -50); ctx.moveTo(10, -76); ctx.lineTo(16, -58); ctx.stroke();
    for (const sgn of [-1, 1]) { poly([[sgn * 18, -88], [sgn * 26, -112], [sgn * 32, -86]], 'rgba(160,225,255,.95)', true); poly([[sgn * 30, -86], [sgn * 42, -104], [sgn * 40, -80]], 'rgba(190,238,255,.95)', true); }
    ctx.save(); ctx.translate(-26, -70); ctx.rotate(0.9 + Math.sin(ph * 1.6) * 0.08);
    rr(-7, 0, 14, 30, 6); fillO(col('#cfe3f2'));
    ctx.translate(0, 28); poly([[-5, 0], [5, 0], [12, 36], [0, 46], [-12, 36]], col('#a8dcf5'), true);
    poly([[-12, 30], [-20, 26], [-12, 22]], '#d8f3ff', true); poly([[12, 30], [20, 26], [12, 22]], '#d8f3ff', true); poly([[0, 46], [-4, 54], [4, 54]], '#d8f3ff', true);
    ctx.restore();
    ctx.save(); ctx.translate(26, -72); ctx.rotate(-0.25); rr(-7, 0, 14, 34, 6); fillO(col('#cfe3f2')); ctx.restore();
    rr(-14, -112, 28, 26, 8); fillO(col('#d8eaf6'));
    ctx.fillStyle = '#6e8ba3'; ctx.fillRect(-14, -104, 28, 4);
    geye(-6, -100, 'rgba(79,195,255,.95)', 2.4); geye(6, -100, 'rgba(79,195,255,.95)', 2.4);
    for (let i = 0; i < 5; i++) poly([[-12 + i * 6, -88], [-6 + i * 6, -88], [-9 + i * 6, -74 - (i % 2) * 6]], '#bfe8ff', true);
  }
  function enemy(e, t) {
    const s = e.boss ? 1.15 : e.elite ? 1.15 : 1, bob = Math.sin(t * 6 + e.bob) * 2;
    shadow(e.x, e.boss ? 44 : 16 * s);
    ctx.save(); ctx.translate(e.x, GROUND); ctx.scale(s, s);
    if (e.elite) { ctx.save(); ctx.scale(1, 0.25); ctx.strokeStyle = `rgba(215,181,255,${0.5 + 0.3 * Math.sin(t * 4 + e.bob)})`; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.stroke(); ctx.restore(); }
    if (e.elite) { const gl = ctx.createRadialGradient(0, -20, 4, 0, -20, 34); gl.addColorStop(0, 'rgba(201,166,255,.45)'); gl.addColorStop(1, 'rgba(201,166,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-34, -54, 68, 60); }
    if (e.hitT > 0 && t - (e._flT || -9) > 0.3) e._flT = t; // höchstens alle 0,3 s kurz aufblitzen, sonst bleibt ein Gegner bei Dauerbeschuss weiß
    const flash = e.hitT > 0 && t - e._flT < 0.07, col = c => (flash ? '#ffffff' : c);
    const mv = e._px != null && Math.abs(e._px - e.x) > 0.05; e._px = e.x;
    const atk = run && e.atkAt != null ? Math.max(0, 1 - (run.time - e.atkAt) / 0.32) : 0;
    if (e.boss && !e.ahn) { ctx.save(); ctx.scale(1, 0.22); const ra = 58; ctx.fillStyle = RG(0, 0, ra * 1.3, 'rgba(190,120,255,.35)', 'rgba(190,120,255,0)'); ctx.beginPath(); ctx.arc(0, 0, ra * 1.3, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(210,170,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, ra, 0, 7); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, ra * 0.78, 0, 7); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = t * 0.6 + i * Math.PI / 4; ctx.fillStyle = 'rgba(230,200,255,.8)'; ctx.fillRect(Math.cos(a) * ra * 0.89 - 2.5, Math.sin(a) * ra * 0.89 - 6, 5, 12); } ctx.restore();
        for (let i = 0; i < 5; i++) { const p = (t * 0.5 + i / 5) % 1; ctx.fillStyle = `rgba(210,170,255,${(1 - p) * 0.7})`; ctx.fillRect(Math.sin(i * 2.3) * 40, -p * 120, 2, 2); }
        if (e.enrage > 1) glowDot(0, -60, 95, '255,50,40', Math.min(0.55, (e.enrage - 1) * 0.7) * (0.8 + 0.2 * Math.sin(t * 8))); }
    // Treffer: kurz stauchen und zurückweichen
    const hq = e.hitT > 0 ? Math.min(1, e.hitT / 0.15) : 0; if (hq) { ctx.translate(hq * (e.boss ? 1.5 : 3), 0); ctx.scale(1 + hq * 0.05, 1 - hq * 0.05); }
    styled(() => {
    if (e.ahn) ahnBoss(e, t, col);
    else if (e.boss) bossDraw(e, t, col);
    else { const art = ENEMY_ART[e.type] || ENEMY_ART.schleim, G = (y0, y1, a, b) => (flash ? '#ffffff' : LG(y0, y1, a, b));
      ctx.save(); ctx.translate(-Math.sin(atk * Math.PI) * 6, 0); const es = ENEMY_SIZE[e.type] || 1; ctx.scale(es, es); if (e.echo) { ctx.globalAlpha = 0.8; tintDraw(() => art(e, t, t + e.bob, col, G, atk, mv), flash ? null : e.echo, 0.8, 50); } else art(e, t, t + e.bob, col, G, atk, mv); ctx.restore(); ctx.globalAlpha = 1; }
    }, 0, e.boss ? -250 : -110, 10, e.boss ? 160 : 64, { ow: e.boss ? 1.2 : 1 });
    if (false) { ctx.beginPath(); ctx.moveTo(-8, -52); ctx.lineTo(-8, -60); ctx.lineTo(-4, -55); ctx.lineTo(0, -62); ctx.lineTo(4, -55); ctx.lineTo(8, -60); ctx.lineTo(8, -52); ctx.closePath(); fillO('#ffd23f'); }
    if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, (e.boss ? -112 : -56) + Math.sin(a) * 3, 2.2, 0, 7); ctx.fill(); }
    if (e.poisonT > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(155,227,107,.8)'; ctx.beginPath(); ctx.arc(-6 + i * 6, -10 - ((t * 30 + i * 9) % 22), 2.5, 0, 7); ctx.fill(); }
    ctx.restore();
    if (e.ahn || e.dying) return;
    const bw = e.boss ? 72 : 30, by = GROUND - (e.wb ? 206 : e.boss ? (BOSS_ART[e.bk] && typeof e.bk === 'string' ? 182 : BOSS_BAR[e.bk] || 184) : e.elite ? 62 : 56);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(e.x - bw / 2, by, bw, 5, 2); ctx.fill();
    ctx.fillStyle = e.boss ? '#c9a6ff' : e.elite ? '#d7b5ff' : '#e5484d'; rr(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 5, 2); ctx.fill();
  }

  // ---------- Normale Gegner: eine eigene Figur pro Gebiet (Version 5.7) ----------
  function eC(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); }
  function eE(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); }
  function eP(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  function eL(w, c, pts) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  function eO(w = 1.5) { ctx.lineWidth = w; ctx.strokeStyle = OUT; ctx.stroke(); }
  function eFill(c, w = 1.5) { ctx.fillStyle = c; ctx.fill(); if (w) eO(w); }
  // Auge mit Pupille, die nach links zu den Helden schaut
  function eEye(x, y, r, pupil = '#1b1726', white = '#ffffff') {
    eC(x, y, r); eFill(white, 1);
    ctx.fillStyle = pupil; eC(x - r * 0.3, y + r * 0.05, r * 0.55); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; eC(x - r * 0.5, y - r * 0.3, r * 0.22); ctx.fill();
  }
  function eGlowEye(x, y, r, rgb) { glowDot(x, y, r * 3.2, rgb, 0.55); ctx.fillStyle = `rgb(${rgb})`; eC(x, y, r); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.85)'; eC(x - r * 0.25, y - r * 0.25, r * 0.4); ctx.fill(); }
  function eLegs(step, c, boot, y0 = -14, w = 5, gap = 4) {
    for (const [lx, s] of [[-gap - w, step], [gap - 1, -step]]) { ctx.save(); ctx.translate(lx + s * 2.5, 0); rr(0, y0, w, -y0 - 2, 2); eFill(c); rr(-1.5, -4, w + 3, 4, 2); eFill(boot, 1.2); ctx.restore(); }
  }
  function eBlade(len, c = '#dfe5ee') { eP([[0, 0], [-2.2, -3], [-2.2, -len], [0, -len - 5], [2.2, -len], [2.2, -3]]); eFill(LG(-len, 0, '#ffffff', c), 1.2); }

  const ENEMY_ART = {
    // Grüne Wiesen – Schleim / Spuckschleim
    schleim(e, t, ph, C, G, a, mv) {
      const sq = Math.sin(ph * 4) * (mv ? 2.4 : 1.2), w = 19 + sq * 0.6, h = 25 - sq + a * 3;
      const col = e.ranged ? ['#e2b8ff', '#7a3cc4', '#5a2a96'] : ['#b6f59a', '#33a352', '#1f7a3a'];
      if (!e.ranged) { eL(1.6, C('#3f8a2e'), [[3, -h + 1], [4, -h - 6]]); ctx.save(); ctx.translate(4, -h - 6); ctx.rotate(-0.7); eE(4, 0, 5, 2.4); eFill(C('#7ed957'), 1); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.bezierCurveTo(-w - 1, -h * 0.85, -w * 0.45, -h, 0, -h); ctx.bezierCurveTo(w * 0.6, -h, w + 1, -h * 0.75, w, 0); ctx.quadraticCurveTo(0, 3, -w, 0); ctx.closePath();
      ctx.fillStyle = G(-h, 0, col[0], col[1]); ctx.fill(); eO(1.6);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; eE(2, -3, w * 0.8, 4); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,255,255,.28)'; eC(3 + i * 5, -4 - ((ph * 9 + i * 6) % (h - 8)), 1.4 + i * 0.4); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.6)'; eE(-9, -h + 7, 5, 2.6, -0.5); ctx.fill(); eE(-14, -h + 12, 1.6, 1.2); ctx.fill();
      eEye(-10, -13, 4.2); eEye(-1, -14, 4.6);
      ctx.fillStyle = col[2]; ctx.beginPath(); ctx.arc(-6, -6.5, 3.4, 0.1, Math.PI - 0.1); ctx.fill();
      ctx.fillStyle = '#ff8fa8'; eE(-6, -4.4, 1.8, 1); ctx.fill();
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.6); ctx.fillStyle = `rgba(196,120,255,${0.6 + p * 0.4})`; eE(-9, -3 + p * 4, 1.8, 2.2 + p * 2); ctx.fill();
        for (let i = 0; i < 3; i++) { eC(-8 + i * 8, -h - 1 + Math.sin(ph * 5 + i) * 1.5, 2.6); eFill(C(col[0]), 1); }
      }
    },
    // Finsterwald – Goblin / Goblin-Schleuderer
    goblin(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 11) : 0;
      eLegs(step, C('#5b4128'), C('#2e2218'), -13);
      ctx.save(); ctx.translate(9, -26); ctx.rotate(0.2); rr(-2.5, 0, 5, 13, 2.5); eFill(C('#6fa046')); ctx.restore();
      rr(-9, -29, 18, 18, 5); eFill(G(-29, -11, '#9a6d3f', '#6b4726'));
      ctx.fillStyle = C('#4a3220'); ctx.fillRect(-9, -16, 18, 3); ctx.fillStyle = '#e0b84a'; ctx.fillRect(-2, -16.5, 4, 4);
      eL(1, 'rgba(40,25,15,.5)', [[-5, -27], [-3, -19]]); eL(1, 'rgba(40,25,15,.5)', [[4, -27], [2, -20]]);
      const hy = -38 + (mv ? Math.abs(step) * -1 : 0);
      for (const s of [-1, 1]) { eP([[s * 6, hy - 3], [s * 19, hy - 9 + (s < 0 ? Math.sin(ph * 3) : 0)], [s * 7, hy + 3]]); eFill(C('#78b04e'), 1.3); eP([[s * 8, hy - 1.5], [s * 15, hy - 6], [s * 8, hy + 1.5]]); ctx.fillStyle = C('#d88f86'); ctx.fill(); }
      eC(0, hy, 10); eFill(G(hy - 10, hy + 10, '#8cc45c', '#5e8f38'));
      eP([[-7, hy + 1], [-15, hy + 3], [-7, hy + 5]]); eFill(C('#7ab04c'), 1.2);
      eEye(-6, hy - 2, 2.8, '#1b1726', '#ffe27a'); eEye(1, hy - 2.5, 2.8, '#1b1726', '#ffe27a');
      eL(1.6, '#3a2a14', [[-9, hy - 6], [-3, hy - 5]]); eL(1.6, '#3a2a14', [[0, hy - 6], [5, hy - 7]]);
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.moveTo(-8, hy + 5); ctx.quadraticCurveTo(-2, hy + 9, 4, hy + 5); ctx.closePath(); ctx.fill();
      eP([[-6, hy + 5.3], [-5, hy + 8], [-4, hy + 5.6]]); ctx.fillStyle = '#fff'; ctx.fill(); eP([[1, hy + 5.6], [2, hy + 7.6], [3, hy + 5.4]]); ctx.fill();
      if (e.ranged) {
        ctx.beginPath(); ctx.arc(0, hy - 1, 11.5, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(9, hy + 4); ctx.quadraticCurveTo(13, hy + 12, 6, hy + 14); ctx.lineTo(8, hy + 2); ctx.closePath(); eFill(G(hy - 12, hy + 12, '#c44a3a', '#7a2a22'));
        const p = Math.max(0, 1 - e.shotT / 0.5);
        eL(2.4, C('#6b4a2e'), [[-12, -12], [-12, -26], [-17, -33]]); eL(2.4, C('#6b4a2e'), [[-12, -26], [-7, -33]]);
        eL(1, 'rgba(60,40,25,.9)', [[-17, -33], [-12, -27 + p * 7], [-7, -33]]);
        ctx.fillStyle = '#9aa3ad'; eC(-12, -28 + p * 6, 2.4); ctx.fill();
        eC(-12, -13, 3); eFill(C('#78b04e'), 1);
      } else {
        ctx.fillStyle = C('#7f8794'); ctx.beginPath(); ctx.arc(0, hy - 2, 10.5, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(10, hy - 4); ctx.lineTo(-10, hy - 4); ctx.closePath(); ctx.fill(); eO(1.2);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-6, hy - 10, 6, 2);
        ctx.save(); ctx.translate(-10, -20); ctx.rotate(-1.1 - a * 0.9); eBlade(14, '#aab3c0'); ctx.fillStyle = C('#5a3d25'); ctx.fillRect(-3.5, -1, 7, 2.5); ctx.fillRect(-1.5, 0, 3, 6); ctx.restore();
        eC(-10, -20, 3); eFill(C('#78b04e'), 1);
      }
    },
    // Knochengruft – Skelett / Skelett-Schütze
    skelett(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 10) : 0, bone = C('#efe8d4'), dk = '#b8ae94';
      for (const [lx, s] of [[-4, step], [4, -step]]) { eL(3.2, OUT, [[lx, -15], [lx + s * 3, -7], [lx + s * 2, -1]]); eL(2.2, bone, [[lx, -15], [lx + s * 3, -7], [lx + s * 2, -1]]); ctx.fillStyle = bone; eC(lx + s * 3, -7, 1.8); ctx.fill(); eE(lx + s * 2 - 1.5, -1, 3.2, 1.6); eFill(bone, 1); }
      eE(0, -16, 7, 3.2); eFill(bone, 1.2);
      eL(3.4, OUT, [[0, -17], [0, -30]]); eL(2.2, bone, [[0, -17], [0, -30]]);
      for (let i = 0; i < 3; i++) { const y = -28 + i * 4, w = 8 - i; eL(3.4, OUT, [[0, y], [-w, y + 1.5]]); eL(3.4, OUT, [[0, y], [w, y + 1.5]]); eL(2, bone, [[-w, y + 1.5], [0, y], [w, y + 1.5]]); }
      if (!e.ranged) { ctx.save(); ctx.translate(9, -24); eC(0, 0, 8); eFill(G(-8, 8, '#8a6a3a', '#5a4024')); ctx.strokeStyle = C('#9aa3ad'); ctx.lineWidth = 1.6; eC(0, 0, 6.5); ctx.stroke(); ctx.fillStyle = C('#c9cdd6'); eC(0, 0, 2); ctx.fill(); ctx.restore(); }
      const hy = -38;
      eC(0, hy, 9); eFill(G(hy - 9, hy + 9, '#fbf6e8', '#d6ccb2'));
      rr(-6, hy + 5, 11, 6, 2); eFill(bone, 1.2);
      ctx.strokeStyle = dk; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-4 + i * 2.6, hy + 5); ctx.lineTo(-4 + i * 2.6, hy + 9); ctx.stroke(); }
      ctx.fillStyle = '#1b1726'; eE(-5, hy - 1, 2.8, 3.2); ctx.fill(); eE(2, hy - 1, 2.6, 3); ctx.fill();
      eGlowEye(-5.4, hy - 0.6, 1.2, '170,140,255'); eGlowEye(1.6, hy - 0.6, 1.1, '170,140,255');
      eP([[-2, hy + 2], [-0.5, hy + 4.5], [-3.5, hy + 4.5]]); ctx.fillStyle = '#1b1726'; ctx.fill();
      eL(1, 'rgba(120,110,90,.7)', [[3, hy - 8], [5, hy - 5], [4, hy - 3]]);
      if (e.ranged) {
        ctx.beginPath(); ctx.arc(0, hy - 1, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(10, hy + 6); ctx.quadraticCurveTo(4, hy + 2, 0, hy - 6); ctx.quadraticCurveTo(-6, hy - 2, -10, hy - 2); ctx.closePath(); eFill(G(hy - 11, hy + 6, '#4a3f66', '#2a2340'));
        const p = Math.max(0, 1 - e.shotT / 0.5);
        ctx.strokeStyle = C('#8a6a3a'); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(-6, -25, 14, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
        eL(1, 'rgba(232,226,208,.9)', [[-10.3, -38.3], [-10.3 + p * 9, -25], [-10.3, -11.7]]);
        if (p > 0.2) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-12 + p * 9, -26, 14, 1.6); }
        rr(6, -34, 5, 16, 2); eFill(C('#5a3d25'), 1); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(6.5, -38, 1.5, 4); ctx.fillRect(9, -39, 1.5, 5);
      } else {
        ctx.fillStyle = C('#8b7a6a'); ctx.beginPath(); ctx.arc(0, hy - 2, 9.8, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); eO(1.2);
        eP([[-9, hy - 4], [-15, hy - 13], [-7, hy - 8]]); eFill(C('#efe8d4'), 1); eP([[9, hy - 4], [15, hy - 13], [7, hy - 8]]); eFill(C('#efe8d4'), 1);
        eL(3.2, OUT, [[-3, -27], [-9, -19]]); eL(2, bone, [[-3, -27], [-9, -19]]);
        ctx.save(); ctx.translate(-9, -19); ctx.rotate(-1.15 - a * 0.9); eBlade(17, '#9a8f7a'); ctx.fillStyle = C('#5a3d25'); ctx.fillRect(-4, -1, 8, 2.5); ctx.fillRect(-1.5, 0, 3, 6); ctx.restore();
      }
    },
    // Glutberge – Teufelchen / Feuerteufel
    daemon(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 11) : 0, flap = Math.sin(ph * 7);
      glowDot(0, -24, 30, '255,140,60', 0.3 + 0.1 * Math.sin(ph * 8));
      for (const s of [1, -1]) { ctx.save(); ctx.translate(s * 4, -30); ctx.scale(s, 1); ctx.rotate(-0.2 + flap * 0.15);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -14); ctx.lineTo(22, -6); ctx.quadraticCurveTo(18, -2, 20, 2); ctx.quadraticCurveTo(14, 0, 13, 5); ctx.quadraticCurveTo(8, 2, 4, 6); ctx.closePath(); eFill(G(-14, 6, '#5a1a1a', '#2a0e0e'), 1.2);
        eL(1, 'rgba(255,120,80,.5)', [[0, 0], [20, 2]]); eL(1, 'rgba(255,120,80,.5)', [[0, 0], [13, 5]]); ctx.restore(); }
      ctx.strokeStyle = C('#a52a22'); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(20 + Math.sin(ph * 3) * 3, -8, 18, -26); ctx.stroke();
      eP([[18, -26], [14, -31], [18, -36], [22, -31]]); eFill(C('#2a1a1a'), 1);
      for (const [lx, s] of [[-6, step], [2, -step]]) { ctx.save(); ctx.translate(lx + s * 2.5, 0); ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(-2, -8, 2, -6); ctx.lineTo(0, -1); ctx.lineTo(5, -1); ctx.lineTo(6, -16); ctx.closePath(); eFill(C('#8f2620'), 1.2); rr(-1, -3, 7, 3, 1.5); eFill('#1b0e0c', 0); ctx.restore(); }
      rr(-9, -32, 18, 19, 7); eFill(G(-32, -13, '#e2553f', '#9e2a22'));
      ctx.fillStyle = C('#f08a5c'); eE(-1, -21, 5, 6); ctx.fill();
      const hy = -40;
      eC(0, hy, 9.5); eFill(G(hy - 10, hy + 9, '#f0644a', '#b8322a'));
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 5, hy - 7); ctx.quadraticCurveTo(s * 10, hy - 16, s * 7, hy - 21); ctx.quadraticCurveTo(s * 6, hy - 14, s * 1, hy - 9); ctx.closePath(); eFill(G(hy - 21, hy - 7, '#3a2a2a', '#1b1010'), 1); }
      eP([[8, hy - 1], [15, hy - 5], [9, hy + 3]]); eFill(C('#d4473c'), 1);
      eGlowEye(-5.5, hy - 1, 1.9, '255,214,80'); eGlowEye(1.5, hy - 1.5, 1.9, '255,214,80');
      eL(1.4, '#3a1010', [[-8, hy - 5], [-3, hy - 3.5]]); eL(1.4, '#3a1010', [[0, hy - 4], [4, hy - 5]]);
      ctx.fillStyle = '#2a0e0c'; ctx.beginPath(); ctx.moveTo(-7, hy + 4); ctx.quadraticCurveTo(-2, hy + 8, 3, hy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; eP([[-5.5, hy + 4.3], [-4.6, hy + 6.6], [-3.6, hy + 4.5]]); ctx.fill(); eP([[0, hy + 4.6], [1, hy + 6.6], [2, hy + 4.4]]); ctx.fill();
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5), r = 4.5 + p * 3 + Math.sin(ph * 10) * 0.7;
        eC(-10, -24, 3); eFill(C('#c4382f'), 1);
        glowDot(-15, -32, r + 9, '255,140,60', 0.7);
        for (let i = 0; i < 4; i++) { const fh = 6 + Math.sin(ph * 14 + i) * 2.5; ctx.fillStyle = ['#ff7a3d', '#ffd23f'][i % 2]; ctx.beginPath(); ctx.moveTo(-15 - r + i * r * 0.66, -32); ctx.quadraticCurveTo(-15 - r * 0.6 + i * r * 0.66, -32 - r - fh, -15 - r * 0.2 + i * r * 0.66, -32); ctx.fill(); }
        ctx.fillStyle = '#fff3c0'; eC(-15, -32, r * 0.7); ctx.fill();
      } else {
        ctx.save(); ctx.translate(-9, -22); ctx.rotate(-0.25 - a * 0.6);
        eL(3.4, OUT, [[0, 10], [0, -30]]); eL(2.2, C('#3a2a2a'), [[0, 10], [0, -30]]);
        eL(2.2, '#2a1a1a', [[-6, -30], [6, -30]]);
        for (const px of [-6, 0, 6]) { eP([[px - 1.6, -30], [px, -40], [px + 1.6, -30]]); eFill(LG(-40, -30, '#ffffff', '#b7bcc6'), 1); }
        ctx.restore(); eC(-9, -22, 3); eFill(C('#c4382f'), 1);
      }
    },
    // Frostgipfel – Eisgolem / Eisschamane
    golem(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 7) : 0;
      for (const [lx, s] of [[-12, step], [3, -step]]) { ctx.save(); ctx.translate(lx + s * 2, 0); eP([[0, -14], [9, -14], [10, 0], [-1, 0]]); eFill(G(-14, 0, '#9fc3dc', '#5f86a6')); ctx.restore(); }
      if (e.ranged) {
        ctx.beginPath(); ctx.moveTo(-11, -34); ctx.lineTo(11, -34); ctx.lineTo(15, -4); ctx.quadraticCurveTo(0, 0, -15, -4); ctx.closePath(); eFill(G(-34, -4, '#4f7fb0', '#2a4a78'));
        for (let i = 0; i < 4; i++) { eP([[-14 + i * 8, -5], [-10 + i * 8, -5], [-12 + i * 8, 1]]); eFill(C('#cfefff'), 1); }
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(-11, -26, 22, 3);
      } else {
        eP([[-14, -36], [13, -36], [16, -22], [11, -12], [-12, -12], [-16, -24]]); eFill(G(-36, -12, '#e6f4ff', '#8fb6d6'));
        eL(1.2, 'rgba(90,140,180,.65)', [[-8, -34], [-3, -26], [-9, -16]]); eL(1.2, 'rgba(90,140,180,.65)', [[7, -33], [10, -24]]);
        const gl = 0.6 + 0.4 * Math.sin(ph * 4); glowDot(0, -24, 10, '79,195,255', gl);
        eP([[0, -29], [4, -24], [0, -19], [-4, -24]]); ctx.fillStyle = `rgba(200,240,255,${0.7 + gl * 0.3})`; ctx.fill();
        for (const s of [-1, 1]) { eP([[s * 9, -36], [s * 13, -48], [s * 16, -35]]); eFill(C('#bfe8ff'), 1.2); eP([[s * 14, -35], [s * 20, -43], [s * 19, -32]]); eFill(C('#d8f3ff'), 1.2); }
      }
      const hy = -44 + (e.ranged ? 0 : 0);
      eP([[-9, hy - 7], [8, hy - 8], [10, hy + 6], [-10, hy + 7]]); eFill(G(hy - 8, hy + 7, '#f2faff', '#b4d2ea'));
      ctx.fillStyle = '#20384f'; ctx.fillRect(-9, hy - 1, 18, 4);
      eGlowEye(-5, hy + 1, 1.6, '79,195,255'); eGlowEye(2, hy + 1, 1.6, '79,195,255');
      if (e.ranged) {
        eP([[-10, hy - 6], [0, hy - 20], [10, hy - 6]]); eFill(G(hy - 20, hy - 6, '#5f95c8', '#2a4a78'), 1.3);
        for (let i = 0; i < 3; i++) { eP([[-7 + i * 6, hy + 7], [-4 + i * 6, hy + 7], [-5.5 + i * 6, hy + 13]]); eFill(C('#e6f6ff'), 0.8); }
        const p = Math.max(0, 1 - e.shotT / 0.5);
        eL(2.6, C('#6b4a2e'), [[-14, -2], [-14, -46]]);
        ctx.save(); ctx.translate(-14, -50 + Math.sin(ph * 3) * 1.5); ctx.rotate(ph * 1.5); glowDot(0, 0, 9 + p * 4, '160,225,255', 0.7);
        eP([[0, -6 - p * 2], [4, 0], [0, 6 + p * 2], [-4, 0]]); eFill(`rgba(220,245,255,${0.85 + p * 0.15})`, 1); ctx.restore();
        eC(-13, -26, 3.2); eFill(C('#cfe3f2'), 1);
      } else {
        ctx.save(); ctx.translate(-14, -32); ctx.rotate(0.35 + a * 0.6 + Math.sin(ph * 2) * 0.05);
        rr(-4.5, 0, 9, 13, 3); eFill(C('#cfe3f2'), 1.3); eP([[-6, 12], [6, 12], [7, 22], [0, 25], [-7, 22]]); eFill(G(12, 25, '#e8f6ff', '#9fc3dc'), 1.3);
        ctx.restore();
      }
    },
    // Nebelmoor – Moorkröte / Blasrohr-Kröte
    frosch(e, t, ph, C, G, a, mv) {
      const hop = mv ? Math.abs(Math.sin(ph * 6)) * 5 : 0;
      ctx.save(); ctx.translate(0, -hop);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, -10); ctx.quadraticCurveTo(s * 18, -14 + hop, s * 14, -1 + hop * 0.6); ctx.lineTo(s * 5, -1 + hop * 0.6); ctx.closePath(); eFill(G(-14, 0, '#6c8f3a', '#3f5e22'), 1.3);
        for (let i = 0; i < 3; i++) { eE(s * (8 + i * 3.5), hop * 0.6, 2, 1.2); eFill(C('#55752e'), 1); } }
      eE(0, -16, 16, 13); eFill(G(-29, -3, '#7da348', '#41632a'));
      ctx.fillStyle = C('#d9d49a'); eE(-4, -12, 9, 8); ctx.fill();
      ctx.fillStyle = 'rgba(40,60,20,.6)'; for (const [x, y, r] of [[6, -24, 2.2], [11, -18, 1.6], [3, -27, 1.4], [10, -11, 1.8]]) { eC(x, y, r); ctx.fill(); }
      eL(2, OUT, [[-15, -15], [-6, -13], [4, -16]]); eL(1, '#9e3a3a', [[-14, -14.5], [-6, -12.5], [3, -15.5]]);
      for (const [x, r] of [[-9, 5.4], [3, 5.2]]) { eC(x, -27, r + 1.6); eFill(G(-34, -22, '#8cb352', '#4f7530'), 1.3); eEye(x - 0.5, -27.5, r, '#1b1726', '#f5e9a0'); ctx.fillStyle = 'rgba(30,20,10,.85)'; ctx.fillRect(x - r * 0.9, -28, r * 1.4, 1.4); }
      eE(2, -34, 12, 2.4, -0.05); eFill(C('#5a4a2a'), 1); eE(2, -36, 6, 3.2); eFill(C('#6a5a32'), 1);
      eL(1.4, C('#8ab04a'), [[6, -37], [9, -44]]); eE(10, -45, 1.8, 3.4, 0.4); eFill(C('#a3c95a'), 0);
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5);
        ctx.save(); ctx.translate(-14, -14); ctx.rotate(-0.12); rr(-20, -1.8, 22, 3.6, 1.8); eFill(G(-2, 2, '#c9a46a', '#8a6a3a'), 1.2); for (let i = 0; i < 3; i++) { ctx.fillStyle = '#5a3d25'; ctx.fillRect(-16 + i * 6, -2, 1.2, 4); } ctx.restore();
        if (p > 0) { glowDot(-36, -17, 4 + p * 4, '150,230,110', p); }
      } else {
        ctx.save(); ctx.translate(-12, -8); ctx.rotate(-1.3 - a * 0.5);
        eL(3.2, OUT, [[0, 8], [0, -26]]); eL(2, C('#c9b98f'), [[0, 8], [0, -26]]);
        eP([[0, -26], [-3, -30], [0, -38], [3, -30]]); eFill(LG(-38, -26, '#f2ead2', '#b8ae94'), 1);
        eL(1.2, '#8ab04a', [[-1.5, -24], [1.5, -22], [-1.5, -20]]);
        ctx.restore(); eC(-12, -8, 3); eFill(C('#6c8f3a'), 1);
      }
      ctx.restore();
    },
    // Dornendickicht – Dornenwürger / Samenspucker
    dorn(e, t, ph, C, G, a, mv) {
      const sway = Math.sin(ph * 2.2) * 0.12;
      for (let i = 0; i < 4; i++) { const x = -9 + i * 6, w = Math.sin(ph * 6 + i) * (mv ? 2.5 : 0.8); eL(3.6, OUT, [[x, -10], [x + w - 2, -4], [x - 3 + w, 0]]); eL(2.4, C('#5a3d25'), [[x, -10], [x + w - 2, -4], [x - 3 + w, 0]]); }
      ctx.save(); ctx.translate(0, -8); ctx.rotate(sway);
      eE(0, -10, 12, 11); eFill(G(-21, 1, '#6f9a3a', '#3d5e22'));
      for (let i = 0; i < 7; i++) { const an = -Math.PI * 0.95 + i * 0.5, x = Math.cos(an) * 11, y = -10 + Math.sin(an) * 10; eP([[x - Math.sin(an) * 2, y + Math.cos(an) * 2], [x + Math.cos(an) * 6, y + Math.sin(an) * 6], [x + Math.sin(an) * 2, y - Math.cos(an) * 2]]); eFill(C('#e6d6a8'), 0.8); }
      eL(1, 'rgba(30,50,15,.5)', [[-6, -16], [-2, -6], [4, -2]]);
      eL(3.4, OUT, [[2, -18], [0, -26], [-3, -32]]); eL(2.4, C('#4f7a2e'), [[2, -18], [0, -26], [-3, -32]]);
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(1, -22); ctx.rotate(s * 0.9); eE(7, 0, 7, 2.6); eFill(C('#7ec85a'), 1); ctx.restore(); }
      const open = e.ranged ? 0.25 + Math.max(0, 1 - e.shotT / 0.5) * 0.5 : 0.25 + a * 0.6 + Math.max(0, Math.sin(ph * 2)) * 0.1;
      ctx.save(); ctx.translate(-4, -36);
      for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * open * 0.7); ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(-4, s * 12, -16, s * 2); ctx.quadraticCurveTo(-6, s * 1, 4, 0); ctx.closePath(); eFill(s < 0 ? G(-12, 0, '#d84a6a', '#8a2a3a') : G(0, 12, '#8a2a3a', '#5e1a2a'), 1.3);
        for (let i = 0; i < 4; i++) { const tx = -13 + i * 4; eP([[tx, s * 1.6], [tx + 1, s * 4.5], [tx + 2, s * 1.4]]); ctx.fillStyle = '#fff6e0'; ctx.fill(); } ctx.restore(); }
      ctx.fillStyle = 'rgba(255,220,120,.9)'; eC(-1, -1.6, 1.4); ctx.fill();
      ctx.restore();
      if (e.ranged) { const p = Math.max(0, 1 - e.shotT / 0.5); if (p > 0.1) { ctx.fillStyle = '#c9a46a'; eE(-22 + p * 4, -36, 2.6, 1.8); eFill('#c9a46a', 1); } }
      else { ctx.save(); ctx.translate(-8, -16); ctx.rotate(-0.4 - a * 1.2); ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-8, -4, -10, -14, -18, -14 + Math.sin(ph * 5) * 2); ctx.stroke(); ctx.strokeStyle = C('#4f7a2e'); ctx.lineWidth = 2.2; ctx.stroke();
        for (let i = 1; i < 4; i++) { const x = -i * 5, y = -i * 4; eP([[x, y], [x - 1, y - 4], [x + 2, y - 1]]); eFill(C('#e6d6a8'), 0); } ctx.restore(); }
      ctx.restore();
    },
    // Schattenkrypta – Gruftfledermaus / Schreifledermaus
    fleder(e, t, ph, C, G, a, mv) {
      const fy = -32 + Math.sin(ph * 4) * 4 - a * 2, flap = Math.sin(ph * 14);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; eE(0, 0, 10 - Math.sin(ph * 4) * 2, 2.5); ctx.fill();
      ctx.save(); ctx.translate(-a * 4, fy);
      for (const s of [1, -1]) { ctx.save(); ctx.scale(s, 1); ctx.rotate(flap * 0.45 - 0.15);
        ctx.beginPath(); ctx.moveTo(3, -3); ctx.quadraticCurveTo(14, -16, 26, -10); ctx.quadraticCurveTo(24, -4, 26, 2); ctx.quadraticCurveTo(21, -1, 18, 4); ctx.quadraticCurveTo(14, 0, 10, 5); ctx.quadraticCurveTo(7, 1, 3, 4); ctx.closePath();
        eFill(G(-16, 5, e.ranged ? '#6a3a9a' : '#5a3a6a', '#2a1a3a'), 1.3);
        eL(1, 'rgba(200,160,255,.35)', [[3, -2], [26, -10]]); eL(1, 'rgba(200,160,255,.35)', [[3, -1], [18, 4]]); ctx.restore(); }
      eE(0, 0, 9, 10); eFill(G(-10, 10, '#6a4a7a', '#3a2448'));
      ctx.fillStyle = C('#8a6a96'); eE(-1, 3, 5, 5.5); ctx.fill();
      for (const s of [-1, 1]) { eP([[s * 3 - 1, -8], [s * 8 - 1, -18], [s * 7 + 1, -6]]); eFill(C('#5a3a6a'), 1.2); eP([[s * 4 - 1, -8.5], [s * 7.4 - 1, -15], [s * 6.4, -8]]); ctx.fillStyle = C('#c48aa8'); ctx.fill(); }
      eGlowEye(-4.5, -3, 1.9, e.ranged ? '200,140,255' : '255,70,80'); eGlowEye(1.5, -3.5, 1.9, e.ranged ? '200,140,255' : '255,70,80');
      eE(-2, 1, 2, 1.3); eFill('#2a1a2a', 0);
      ctx.fillStyle = '#fff'; eP([[-4, 3], [-3.2, 6], [-2.4, 3]]); ctx.fill(); eP([[-0.6, 3], [0.2, 6], [1, 3]]); ctx.fill();
      eL(1.4, OUT, [[-3, 9], [-4, 13]]); eL(1.4, OUT, [[2, 9], [3, 13]]);
      if (e.ranged) { const p = Math.max(0, 1 - e.shotT / 0.6); for (let i = 0; i < 3; i++) { const q = (p + i * 0.33) % 1; ctx.strokeStyle = `rgba(200,140,255,${(1 - q) * 0.8 * (p > 0 ? 1 : 0.35)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-6 - q * 14, 2, 3 + q * 8, Math.PI * 0.7, Math.PI * 1.3); ctx.stroke(); } }
      ctx.restore();
    },
    // Aschewüste – Glutskorpion / Giftskorpion
    skorpion(e, t, ph, C, G, a, mv) {
      const step = mv ? ph * 14 : 0, body = e.ranged ? ['#b0a04a', '#6a5a22'] : ['#d98a3a', '#8a4a1a'];
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = -6 + i * 6, k = Math.sin(step + i * 2 + (s > 0 ? Math.PI : 0)) * 2; eL(2.8, OUT, [[x, -7], [x + s * 2 - 3 + k, -12], [x - 5 + k + s, 0]]); eL(1.6, C(body[1]), [[x, -7], [x + s * 2 - 3 + k, -12], [x - 5 + k + s, 0]]); }
      const segs = [[10, -9, 5.5], [15, -15, 5], [17, -22, 4.6], [15, -29, 4.2], [10, -34, 3.8]], sw = Math.sin(ph * 2) * 1.5 - a * 5;
      segs.forEach(([x, y, r], i) => { eC(x + (i > 1 ? sw * (i - 1) * 0.5 : 0), y + (i > 2 ? a * 2 : 0), r); eFill(G(y - r, y + r, body[0], body[1]), 1.3); });
      const [sx, sy] = [10 + sw * 1.5, -34 + a * 2];
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.6 - a * 0.6); eP([[0, -3], [-10, -1], [-3, 3]]); eFill(LG(-3, 3, '#3a2a1a', '#1b120a'), 1);
      if (e.ranged) { const p = Math.max(0, 1 - e.shotT / 0.5); glowDot(-9, -1, 5 + p * 5, '160,240,90', 0.6 + p * 0.4); ctx.fillStyle = '#b8ff6a'; eE(-9, 2 + p * 3, 1.3, 1.8 + p); ctx.fill(); }
      ctx.restore();
      eE(-2, -9, 12, 6.5); eFill(G(-15, -2, body[0], body[1]));
      for (let i = 0; i < 3; i++) eL(1, 'rgba(60,30,10,.5)', [[-6 + i * 5, -15], [-7 + i * 5, -4]]);
      for (const [dy, s] of [[-4, 1], [-12, -1]]) { ctx.save(); ctx.translate(-12, dy); ctx.rotate(s * 0.15 - a * 0.3);
        eL(3.4, OUT, [[0, 0], [-7, -2]]); eL(2.2, C(body[1]), [[0, 0], [-7, -2]]);
        ctx.translate(-9, -2); const op = 0.3 + Math.max(0, Math.sin(ph * 3 + dy)) * 0.3 + a * 0.4;
        ctx.save(); ctx.rotate(-op); eE(-4, -1.5, 5, 2.4); eFill(G(-4, 1, body[0], body[1]), 1.2); ctx.restore();
        ctx.save(); ctx.rotate(op * 0.6); eE(-3, 1.5, 4, 2); eFill(G(-1, 4, body[0], body[1]), 1.2); ctx.restore(); ctx.restore(); }
      ctx.fillStyle = '#1b120a'; eC(-10, -12, 1.4); ctx.fill(); eC(-7, -13, 1.2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; eE(-5, -12, 5, 1.6, -0.2); ctx.fill();
    },
    // Eisgrotten – Kristallspinne / Netzspinne
    spinne(e, t, ph, C, G, a, mv) { // Kristallspinne klein: dunkler Leib, Kristall-Hinterleib, Beine im Wellenschritt
      const step = mv ? ph * 14 : ph * 2, gl = 0.65 + 0.35 * Math.sin(ph * 3);
      const leg = (i, front) => { const lift = mv ? Math.max(0, Math.sin(step + i * 1.6 + (front ? Math.PI : 0))) * 3 : 0;
        const hx = -8 + i * 3, hy = -12, fx = [-24, -16, 6, 16][i] + (front ? -2 : 3), fy = -lift, kx = hx + (fx - hx) * 0.45, ky = hy - 9 + Math.abs(i - 1.5);
        eL(front ? 2.6 : 3, OUT, [[hx, hy], [kx, ky], [fx, fy]]); eL(front ? 1.6 : 1.9, C(front ? '#5a4a80' : '#33284e'), [[hx, hy], [kx, ky], [fx, fy]]);
        ctx.save(); ctx.translate(fx, fy); eP([[-1.3, -2], [0, 3], [1.3, -2]]); eFill(C(front ? '#9fe8ff' : '#6ab0d0'), 0.8); ctx.restore(); };
      for (let i = 0; i < 4; i++) leg(i, false);
      // Kristall-Hinterleib
      ctx.save(); ctx.translate(10, -16); ctx.rotate(-0.15);
      glowDot(2, -2, 14, '140,220,255', 0.35 * gl);
      eP([[-9, 2], [-3, -10], [6, -12], [13, -3], [10, 7], [0, 9], [-7, 7]]); eFill(G(-12, 9, '#e8fbff', '#3a8ac0'));
      ctx.fillStyle = 'rgba(255,255,255,.5)'; eP([[-3, -10], [6, -12], [2, -2]]); ctx.fill(); ctx.fillStyle = 'rgba(30,90,150,.35)'; eP([[13, -3], [10, 7], [2, -2]]); ctx.fill();
      eL(0.8, 'rgba(255,255,255,.6)', [[2, -2], [-9, 2]]); eL(0.8, 'rgba(255,255,255,.6)', [[2, -2], [0, 9]]);
      glowDot(2, -2, 5, '200,245,255', 0.8 * gl);
      for (const [x, y, h2, r] of [[-2, -8, 8, -0.4], [5, -11, 10, 0], [11, -6, 7, 0.5]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); eP([[-1.8, 1], [0, -h2], [1.8, 1]]); eFill(C('#bff0ff'), 0.8); ctx.restore(); }
      ctx.restore();
      // Vorderleib und Kopf
      eE(-6, -12, 8.5, 6); eFill(G(-18, -6, '#5a4a80', '#1e1630'));
      ctx.fillStyle = 'rgba(160,140,220,.35)'; eE(-7, -15, 5, 1.6, -0.2); ctx.fill();
      eE(-14, -10, 5, 4.4); eFill(G(-14, -6, '#4a3a6a', '#1a1228'));
      eGlowEye(-16, -11, 1.3, '150,230,255'); eGlowEye(-13, -12.5, 1.5, '150,230,255'); eGlowEye(-17, -8.5, 0.9, '150,230,255'); eGlowEye(-13.5, -8.8, 0.9, '150,230,255');
      ctx.save(); ctx.translate(-18, -6); for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * (0.2 + a * 0.5)); eP([[0, 0], [-5, s * 1.4], [-1.5, s * 3]]); eFill(C('#9fe8ff'), 0.9); ctx.restore(); } ctx.restore();
      for (let i = 0; i < 4; i++) leg(i, true);
      if (e.ranged) { const p = Math.max(0, 1 - e.shotT / 0.5); ctx.strokeStyle = `rgba(240,248,255,${0.5 + p * 0.5})`; ctx.lineWidth = 0.8; for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(14, -24); ctx.lineTo(14 + Math.cos(an) * (3 + p * 3), -24 + Math.sin(an) * (3 + p * 3)); ctx.stroke(); } eL(0.8, 'rgba(240,248,255,.6)', [[14, -24], [14, -40]]); }
    },
    // Sternenfeld – Sternengeist / Sternenrufer
    astral(e, t, ph, C, G, a, mv) {
      const fy = -6 + Math.sin(ph * 2.5) * 3;
      ctx.save(); ctx.translate(-a * 4, fy);
      glowDot(0, -26, 28, '140,160,255', 0.35);
      ctx.beginPath(); ctx.moveTo(-10, -40); ctx.quadraticCurveTo(0, -50, 10, -40); ctx.lineTo(13, -14);
      for (let i = 0; i < 5; i++) { const x0 = 13 - i * 5.2; ctx.quadraticCurveTo(x0 - 2.6, -4 + Math.sin(ph * 5 + i) * 2.5, x0 - 5.2, -12); }
      ctx.closePath(); ctx.fillStyle = G(-48, -6, '#3a4aa8', 'rgba(40,30,110,.4)'); ctx.fill(); eO(1.3);
      for (let i = 0; i < 9; i++) { const x = -9 + hash(i + e.bob) * 18, y = -38 + hash(i * 3 + 1) * 26, tw = 0.5 + 0.5 * Math.sin(ph * 4 + i); ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`; eC(x, y, 0.6 + tw * 0.6); ctx.fill(); }
      ctx.fillStyle = '#0d0a24'; eE(-1, -36, 7, 6.5); ctx.fill();
      for (const [x, y] of [[-4, -37], [1.5, -37.5]]) { glowDot(x, y, 5, '255,240,160', 0.8); ctx.fillStyle = '#fff6c0'; eP([[x, y - 2.6], [x + 0.8, y - 0.8], [x + 2.6, y], [x + 0.8, y + 0.8], [x, y + 2.6], [x - 0.8, y + 0.8], [x - 2.6, y], [x - 0.8, y - 0.8]]); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const an = ph * 1.8 + i * 2.1; ctx.fillStyle = '#ffe58a'; eC(Math.cos(an) * 17, -26 + Math.sin(an) * 6, 1.5); ctx.fill(); }
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5);
        eL(2.2, C('#c9b8ff'), [[-12, -4], [-14, -40]]);
        glowDot(-14, -43, 7 + p * 5, '255,230,140', 0.85);
        ctx.fillStyle = '#fff6c0'; ctx.save(); ctx.translate(-14, -43); ctx.rotate(ph * 2); eP([[0, -5], [1.4, -1.4], [5, 0], [1.4, 1.4], [0, 5], [-1.4, 1.4], [-5, 0], [-1.4, -1.4]]); ctx.fill(); ctx.restore();
      } else {
        ctx.save(); ctx.translate(-11, -22); ctx.rotate(-0.6 - a * 1.1);
        ctx.beginPath(); ctx.arc(-4, -10, 11, -Math.PI * 0.55, Math.PI * 0.5); ctx.arc(-1, -10, 8, Math.PI * 0.45, -Math.PI * 0.5, true); ctx.closePath(); eFill(LG(-21, 1, '#fff6d0', '#c9b8ff'), 1);
        ctx.restore();
      }
      ctx.restore();
    },
    // Uralter Hain – Pilzling / Sporenpilz
    pilz(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 10) : 0, sq = Math.sin(ph * 3) * 0.8;
      for (const [lx, s] of [[-6, step], [2, -step]]) { rr(lx + s * 2.5, -8, 5, 8, 2); eFill(C('#c9b28a'), 1.2); }
      rr(-8, -24 + sq, 16, 18 - sq, 6); eFill(G(-24, -6, '#fbf2dc', '#d6c49a'));
      eEye(-5, -16 + sq, 2.4); eEye(1, -16.5 + sq, 2.4);
      ctx.fillStyle = 'rgba(255,140,150,.5)'; eC(-6.5, -12.5 + sq, 1.6); ctx.fill(); eC(3, -12.5 + sq, 1.6); ctx.fill();
      eL(1.2, OUT, [[-4, -11.5 + sq], [-2, -10.5 + sq], [0, -11.5 + sq]]);
      const capC = e.ranged ? ['#b88ae0', '#6a3a9a'] : ['#ff5a4a', '#b8221a'];
      ctx.beginPath(); ctx.moveTo(-17, -22 + sq); ctx.bezierCurveTo(-17, -42, 17, -42, 17, -22 + sq); ctx.quadraticCurveTo(0, -18 + sq, -17, -22 + sq); ctx.closePath(); eFill(G(-40, -20, capC[0], capC[1]));
      ctx.fillStyle = 'rgba(255,255,255,.95)'; for (const [x, y, r] of [[-9, -30, 3], [1, -35, 3.6], [10, -28, 2.6], [-2, -26, 1.8], [-13, -24, 1.6]]) { eC(x, y + sq * 0.5, r); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.3)'; eE(-6, -35, 6, 2, -0.4); ctx.fill();
      ctx.fillStyle = 'rgba(90,60,30,.35)'; ctx.fillRect(-11, -21.5 + sq, 22, 1.5);
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.6);
        for (let i = 0; i < 6; i++) { const q = (ph * 0.4 + i / 6) % 1; ctx.fillStyle = `rgba(210,180,255,${(1 - q) * (0.4 + p * 0.5)})`; eC(-14 + i * 5 + Math.sin(ph * 2 + i) * 3, -36 - q * 14, 1.4 + q * 2); ctx.fill(); }
        eC(-10, -14, 2.6); eFill(C('#f2e6c6'), 1);
      } else {
        ctx.save(); ctx.translate(-9, -13); ctx.rotate(-0.7 - a * 1.2);
        ctx.beginPath(); ctx.moveTo(-1.5, 2); ctx.lineTo(1.5, 2); ctx.lineTo(3.5, -14); ctx.quadraticCurveTo(0, -18, -3.5, -14); ctx.closePath(); eFill(G(-18, 2, '#9a6d3f', '#5a3d25'), 1.2);
        ctx.fillStyle = '#4a3220'; eC(-2, -12, 0.9); ctx.fill(); eC(1.5, -9, 0.8); ctx.fill();
        ctx.restore(); eC(-9, -13, 2.6); eFill(C('#f2e6c6'), 1);
      }
    },
    // Totenreich – Kettengeist / Seelenrufer
    geist(e, t, ph, C, G, a, mv) {
      const fy = -4 + Math.sin(ph * 2.2) * 3;
      ctx.save(); ctx.translate(-a * 5, fy);
      glowDot(0, -24, 26, '120,255,220', 0.25);
      ctx.beginPath(); ctx.moveTo(-9, -42); ctx.quadraticCurveTo(0, -54, 10, -42); ctx.quadraticCurveTo(15, -26, 14, -12);
      for (let i = 0; i < 5; i++) { const x0 = 14 - i * 5.6; ctx.lineTo(x0 - 2.8, -2 + Math.sin(ph * 6 + i * 1.3) * 3); ctx.lineTo(x0 - 5.6, -11); }
      ctx.quadraticCurveTo(-14, -30, -9, -42); ctx.closePath(); ctx.fillStyle = G(-50, -2, 'rgba(170,220,215,.95)', 'rgba(60,110,120,.25)'); ctx.fill(); eO(1.2);
      ctx.fillStyle = '#081414'; eE(-2, -38, 6.5, 6); ctx.fill();
      eGlowEye(-4.5, -38.5, 1.7, '120,255,220'); eGlowEye(0.5, -38.5, 1.7, '120,255,220');
      eL(1.6, '#7a8a94', [[8, -24], [10, -18], [8, -12], [11, -6]]); ctx.strokeStyle = '#9aa8b0'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { eE(8.5 + (i % 2) * 1.5, -22 + i * 5, 1.5, 2.4); ctx.stroke(); }
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5);
        eL(2, C('#d6e8e4'), [[-6, -24], [-12, -26]]);
        glowDot(-15, -28, 7 + p * 5, '120,255,220', 0.9); ctx.fillStyle = '#e6fff8'; eC(-15, -28, 2.6 + p * 1.4); ctx.fill();
      } else {
        ctx.save(); ctx.translate(-8, -24); ctx.rotate(-0.3 - a * 1.1);
        eL(3.2, OUT, [[0, 14], [0, -26]]); eL(2, C('#4a3a2a'), [[0, 14], [0, -26]]);
        ctx.beginPath(); ctx.moveTo(1, -26); ctx.quadraticCurveTo(-10, -30, -20, -18); ctx.quadraticCurveTo(-10, -24, 1, -21); ctx.closePath(); eFill(LG(-30, -18, '#eef4f6', '#8aa0aa'), 1);
        ctx.restore();
        eL(2.2, C('#d6e8e4'), [[-5, -26], [-8, -24]]);
      }
      ctx.restore();
    },
    // Drachenhort – Drachenjunges / Feuerdrache
    drache(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 10) : 0, flap = Math.sin(ph * 5) * 0.2, sc = e.ranged ? ['#e0703a', '#9a3a1a'] : ['#4ab07a', '#22704a'];
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(18, -8, 22 + Math.sin(ph * 3) * 2, -18); ctx.stroke(); ctx.strokeStyle = C(sc[1]); ctx.lineWidth = 4.2; ctx.stroke();
      eP([[22 + Math.sin(ph * 3) * 2, -18], [19, -24], [26, -22]]); eFill(C(sc[1]), 1);
      ctx.save(); ctx.translate(4, -30); ctx.rotate(-0.3 + flap);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -16); ctx.lineTo(20, -12); ctx.quadraticCurveTo(15, -8, 17, -3); ctx.quadraticCurveTo(11, -5, 10, 0); ctx.quadraticCurveTo(6, -2, 3, 3); ctx.closePath(); eFill(G(-16, 3, '#f2c46a', '#b8862a'), 1.2); ctx.restore();
      for (const [lx, s] of [[-6, step], [2, -step]]) { ctx.save(); ctx.translate(lx + s * 2.5, 0); rr(0, -14, 6, 13, 3); eFill(C(sc[1]), 1.2); for (let i = 0; i < 3; i++) { eP([[i * 2.2 - 1, -1], [i * 2.2 - 2, 1.2], [i * 2.2 + 0.4, -1]]); ctx.fillStyle = '#f2ead2'; ctx.fill(); } ctx.restore(); }
      eE(0, -22, 10, 11); eFill(G(-33, -11, sc[0], sc[1]));
      ctx.fillStyle = C('#f2d48a'); eE(-3, -20, 5, 8); ctx.fill(); ctx.strokeStyle = 'rgba(150,110,40,.5)'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-7, -26 + i * 4); ctx.lineTo(1, -26 + i * 4); ctx.stroke(); }
      for (let i = 0; i < 4; i++) { eP([[6 + i, -30 + i * 4], [11 + i, -30 + i * 4], [7 + i, -26 + i * 4]]); eFill(C('#f2c46a'), 0.8); }
      const hy = -38;
      ctx.beginPath(); ctx.moveTo(6, hy - 6); ctx.quadraticCurveTo(0, hy - 10, -8, hy - 5); ctx.quadraticCurveTo(-18, hy - 3, -18, hy + 3); ctx.quadraticCurveTo(-10, hy + 7, 6, hy + 5); ctx.closePath(); eFill(G(hy - 10, hy + 7, sc[0], sc[1]));
      for (const s of [0, 1]) { eP([[2 + s * 4, hy - 7], [6 + s * 6, hy - 16], [6 + s * 4, hy - 6]]); eFill(C('#f2ead2'), 1); }
      ctx.fillStyle = OUT; eC(-15, hy - 1, 0.9); ctx.fill();
      eC(-4, hy - 3, 2.6); eFill('#ffe27a', 1); ctx.fillStyle = '#1b1726'; eE(-4.6, hy - 3, 0.9, 2.2); ctx.fill();
      eL(1, OUT, [[-17, hy + 2.5], [-6, hy + 3]]);
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5), fl = 0.3 + p * 0.7;
        glowDot(-19, hy + 2, 6 + p * 8, '255,150,60', fl);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(255,${190 - i * 40},80,${fl})`; eC(-20 - i * 3 - p * 4, hy + 2 + Math.sin(ph * 12 + i) * 1.4, 2.4 - i * 0.5 + p); ctx.fill(); }
      } else {
        ctx.save(); ctx.translate(-8, -26); ctx.rotate(0.3 - a * 1);
        rr(-2.5, 0, 5, 9, 2.5); eFill(C(sc[1]), 1.1);
        for (let i = 0; i < 3; i++) { eP([[-2 + i * 2, 9], [-3 + i * 2, 13], [-0.5 + i * 2, 9]]); ctx.fillStyle = '#f2ead2'; ctx.fill(); }
        ctx.restore();
        if (a > 0.3) for (let i = 0; i < 3; i++) eL(1.6, `rgba(255,255,255,${a})`, [[-18 + i * 3, -30], [-24 + i * 3, -16]]);
      }
    },
    // Himmelsspitze – Sturmelementar / Blitzrufer
    sturm(e, t, ph, C, G, a, mv) {
      const fy = -10 + Math.sin(ph * 2) * 3;
      ctx.save(); ctx.translate(-a * 5, fy);
      const flick = Math.sin(ph * 23) > 0.6 ? 1 : 0;
      glowDot(0, -22, 26, '180,200,255', 0.25 + flick * 0.25);
      for (let i = 0; i < 4; i++) { const p = (ph * 0.8 + i * 0.25) % 1; ctx.fillStyle = `rgba(150,170,200,${(1 - p) * 0.6})`; eC(-6 + i * 4, -2 + p * 8, 2 + p * 2); ctx.fill(); }
      const puffs = [[-9, -14, 8], [3, -12, 9], [10, -20, 7.5], [-12, -24, 7], [-3, -28, 10], [7, -32, 8]];
      puffs.forEach(([x, y, r]) => { eC(x, y, r + 1.5); ctx.fillStyle = OUT; ctx.fill(); });
      puffs.forEach(([x, y, r], i) => { eC(x + Math.sin(ph * 2 + i) * 0.8, y, r); ctx.fillStyle = G(y - r, y + r, '#c9d4e6', '#5a6a86'); ctx.fill(); });
      ctx.strokeStyle = `rgba(255,248,180,${0.55 + flick * 0.45})`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(2, -28); ctx.lineTo(-2, -22); ctx.lineTo(3, -20); ctx.lineTo(-1, -12); ctx.stroke();
      eGlowEye(-6.5, -25, 1.9, '255,248,180'); eGlowEye(0, -26, 1.9, '255,248,180');
      eL(1.4, '#2a3248', [[-9, -29], [-4.5, -27.6]]); eL(1.4, '#2a3248', [[-2, -28], [2, -29.6]]);
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5);
        glowDot(-17, -20, 6 + p * 6, '255,248,180', 0.6 + p * 0.4);
        ctx.strokeStyle = '#fff8c0'; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const an = ph * 9 + i * 2.1; ctx.beginPath(); ctx.moveTo(-17, -20); ctx.lineTo(-17 + Math.cos(an) * (4 + p * 4), -20 + Math.sin(an) * (4 + p * 4)); ctx.stroke(); }
      } else {
        ctx.strokeStyle = `rgba(255,248,180,${0.5 + a * 0.5})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(-20 - a * 6, -14); ctx.lineTo(-17 - a * 6, -11); ctx.lineTo(-25 - a * 8, -6); ctx.stroke();
      }
      ctx.restore();
    },
  };
  const ENEMY_KIND_LIST = ['schleim', 'goblin', 'skelett', 'daemon', 'golem', 'frosch', 'dorn', 'fleder', 'skorpion', 'spinne', 'astral', 'pilz', 'geist', 'drache', 'sturm'];
  const ENEMY_SIZE = { skorpion: 1.3, spinne: 1.05, schleim: 1.05 };
  // ---------- Gegner der Heldengebiete ----------
  Object.assign(ENEMY_ART, {
    // Schattenviertel – Meuchler: geduckter Kapuzenmann mit Krummdolch
    meuchler(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 12) : 0, crouch = 3 + Math.sin(ph * 2) * 0.8;
      eLegs(step, C('#2c2638'), C('#16121e'), -13, 5, 3);
      ctx.save(); ctx.translate(0, crouch);
      // Umhang hinten
      eP([[4, -30], [14, -8 + Math.sin(ph * 4) * 2], [8, -6], [2, -16]]); eFill(G(-30, -6, '#3d3550', '#1d1828'));
      rr(-8, -31, 16, 19, 5); eFill(G(-31, -12, '#4a4160', '#28223a'));
      ctx.fillStyle = C('#8a2433'); ctx.fillRect(-8, -18, 16, 3);
      // Kapuze
      ctx.beginPath(); ctx.moveTo(-10, -30); ctx.quadraticCurveTo(-12, -44, 0, -47); ctx.quadraticCurveTo(10, -46, 9, -30); ctx.closePath(); eFill(G(-47, -30, '#5a5074', '#2c2640'));
      ctx.fillStyle = '#0c0a12'; eE(-2, -36, 6, 5); ctx.fill();
      glowDot(-5, -37, 4, '255,60,70', 0.8); glowDot(0, -37, 4, '255,60,70', 0.8);
      ctx.fillStyle = '#ff5060'; ctx.fillRect(-6, -37.6, 2.4, 1.4); ctx.fillRect(-1.2, -37.6, 2.4, 1.4);
      ctx.fillStyle = C('#2a2236'); ctx.fillRect(-8, -34, 13, 3);
      // Dolch, sticht bei Angriff nach vorn
      ctx.save(); ctx.translate(-9 - a * 7, -21); ctx.rotate(-1.75 + a * 0.4);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-3, -9, 1, -16); ctx.quadraticCurveTo(2, -8, 2.5, 0); ctx.closePath(); eFill(LG(-16, 0, '#ffffff', '#9aa3b4'), 1);
      ctx.fillStyle = C('#3a2a1a'); ctx.fillRect(-1.5, 0, 4, 5); ctx.restore();
      eC(-9 - a * 7, -21, 2.6); eFill(C('#4a4160'), 1);
      ctx.restore();
    },
    // Schattenviertel – Armbrustschütze
    armbrust(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 10) : 0, p = Math.max(0, 1 - e.shotT / 0.6);
      eLegs(step, C('#3a3040'), C('#1a1420'), -13);
      rr(-8, -30, 16, 18, 4); eFill(G(-30, -12, '#5b4e3a', '#33291e'));
      eL(2, C('#8a2433'), [[-8, -29], [8, -14]]);
      // Hut mit breiter Krempe
      eC(0, -36, 7); eFill(G(-43, -29, '#d8b89a', '#a88466'));
      ctx.fillStyle = '#2a2236'; eE(-3, -36, 6, 2.4); ctx.fill(); glowDot(-4, -36, 3, '255,80,80', 0.5);
      eE(0, -42, 12, 2.6); eFill(C('#2a2236'), 1.2); rr(-6, -50, 12, 9, 3); eFill(C('#3a3048'), 1.2); ctx.fillStyle = C('#8a2433'); ctx.fillRect(-6, -44, 12, 2);
      // Armbrust nach links
      ctx.save(); ctx.translate(-10, -22);
      rr(-16, -2, 18, 4, 2); eFill(C('#6b4a2e'), 1.2);
      ctx.beginPath(); ctx.moveTo(-14, -9); ctx.quadraticCurveTo(-19, 0, -14, 9); eL(2.2, C('#4a3220'), [[-14, -9], [-17, 0], [-14, 9]]);
      eL(0.9, 'rgba(230,220,200,.9)', [[-14, -9], [-8 + p * 6, 0], [-14, 9]]);
      ctx.fillStyle = '#d8d2c0'; ctx.fillRect(-22 + p * 4, -0.8, 14, 1.6); ctx.fillStyle = '#9aa3ad'; eP([[-24 + p * 4, 0], [-21 + p * 4, -2], [-21 + p * 4, 2]]); ctx.fill();
      ctx.restore(); eC(-8, -22, 2.6); eFill(C('#c9a07a'), 1);
    },
    // Friedhof – Ghul: gebückt, lange Arme mit Krallen
    ghul(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 9) : 0, hunch = Math.sin(ph * 3) * 1.2;
      for (const [lx, s] of [[-6, step], [3, -step]]) { eL(4.4, OUT, [[lx, -16], [lx + s * 3 - 2, -8], [lx + s * 2, -1]]); eL(3, C('#9fb79a'), [[lx, -16], [lx + s * 3 - 2, -8], [lx + s * 2, -1]]); }
      ctx.fillStyle = C('#4a4038'); eP([[-9, -18], [8, -18], [10, -11], [-10, -11]]); ctx.fill(); eO(1.2);
      ctx.save(); ctx.translate(0, hunch);
      eE(0, -24, 10, 9, -0.3); eFill(G(-33, -15, '#b8cfae', '#7d9474'));
      for (let i = 0; i < 3; i++) eL(1, 'rgba(60,80,55,.6)', [[-4 + i * 4, -30], [-2 + i * 4, -20]]);
      // langer Arm nach vorn
      const reach = a * 8;
      eL(4.6, OUT, [[-6, -27], [-14 - reach, -20], [-18 - reach, -10]]); eL(3.2, C('#a9c09f'), [[-6, -27], [-14 - reach, -20], [-18 - reach, -10]]);
      for (let i = 0; i < 3; i++) eL(1.4, C('#efe8d4'), [[-18 - reach, -10], [-22 - reach + i * 2, -6 + i]]);
      // Kopf tief und vorne
      eC(-9, -33, 7.5); eFill(G(-41, -26, '#c8dcbd', '#8aa181'));
      geyeE(-13, -35, '#ffe06a'); geyeE(-8, -35.5, '#ffe06a');
      ctx.fillStyle = '#2a1a1a'; eE(-11, -29, 4, 2.4); ctx.fill(); ctx.fillStyle = '#efe8d4'; for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 2, -30.5, 1, 1.6);
      ctx.restore();
    },
    // Friedhof – Irrlicht: schwebender Geist, der Seelenfeuer wirft
    irrlicht(e, t, ph, C, G, a, mv) {
      const fl = Math.sin(ph * 2.5) * 4, p = Math.max(0, 1 - e.shotT / 0.6);
      glowDot(0, -30 + fl, 26, '107,224,184', 0.35 + p * 0.3);
      ctx.save(); ctx.translate(0, fl);
      ctx.beginPath(); ctx.moveTo(-11, -30); ctx.quadraticCurveTo(-12, -48, 0, -50); ctx.quadraticCurveTo(12, -48, 11, -30);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(9 - i * 5, -18 + Math.sin(ph * 6 + i) * 3, 6 - i * 5.5, -22 + (i % 2) * 4);
      ctx.closePath(); ctx.fillStyle = C('rgba(170,255,220,.85)'); ctx.fill(); eO(1.2);
      ctx.fillStyle = '#123a30'; eE(-5, -40, 2.6, 3.6); ctx.fill(); eE(2, -40, 2.6, 3.6); ctx.fill();
      eE(-1.5, -33, 2.4, 1.6 + p * 1.6); ctx.fill();
      ctx.fillStyle = `rgba(107,224,184,${0.6 + p * 0.4})`; eC(-13, -32, 3 + p * 2); ctx.fill(); glowDot(-13, -32, 8 + p * 4, '107,224,184', 0.6);
      ctx.restore();
      ctx.fillStyle = 'rgba(107,224,184,.25)'; eE(0, 0, 10, 2.4); ctx.fill();
    },
    // Geistertheater – Marionette an Fäden
    marionette(e, t, ph, C, G, a, mv) {
      const jerk = Math.sin(ph * 5) * 2, step = mv ? Math.sin(ph * 8) : 0;
      ctx.strokeStyle = 'rgba(240,230,255,.45)'; ctx.lineWidth = 0.8; for (const x of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(x, -38 + (x ? jerk : 0)); ctx.lineTo(x * 0.4, -90); ctx.stroke(); }
      for (const [lx, s] of [[-5, step], [3, -step]]) { eL(3.6, OUT, [[lx, -15], [lx + s * 4, -2]]); eL(2.4, C('#c9955a'), [[lx, -15], [lx + s * 4, -2]]); eC(lx + s * 4, -1, 2.2); eFill(C('#2a1a2a'), 1); }
      rr(-7, -30, 14, 16, 3); eFill(G(-30, -14, '#c43a6a', '#7a1f44'));
      ctx.fillStyle = C('#ffd27a'); for (let i = 0; i < 3; i++) eC(0, -27 + i * 5, 1.1), ctx.fill();
      eL(3.4, OUT, [[-6, -28], [-12, -22 + jerk - a * 6]]); eL(2.2, C('#c9955a'), [[-6, -28], [-12, -22 + jerk - a * 6]]);
      ctx.save(); ctx.translate(-12, -22 + jerk - a * 6); ctx.rotate(-1.4 - a); eBlade(11, '#c9cdd6'); ctx.restore();
      eL(3.4, OUT, [[6, -28], [10, -20 - jerk]]); eL(2.2, C('#c9955a'), [[6, -28], [10, -20 - jerk]]);
      eC(0, -38 + jerk * 0.3, 8); eFill(G(-46, -30, '#f2d8b0', '#c9a07a'));
      ctx.fillStyle = '#e04a7a'; eC(-5, -36, 1.6); ctx.fill(); eC(3, -36, 1.6); ctx.fill();
      ctx.fillStyle = '#1b1726'; eC(-4, -39.5, 1.3); ctx.fill(); eC(2, -39.5, 1.3); ctx.fill();
      eL(1, '#1b1726', [[-6, -35.5], [-1, -34], [4, -35.5]]); eL(1, 'rgba(60,30,20,.6)', [[-1, -34], [-1, -31]]);
      ctx.fillStyle = C('#2a1a2a'); eP([[-9, -43], [9, -43], [4, -52], [-3, -50]]); ctx.fill(); eO(1);
    },
    // Geistertheater – schwebende Maske, die Schallringe schleudert
    maske(e, t, ph, C, G, a, mv) {
      const fl = Math.sin(ph * 2) * 3.5, tilt = Math.sin(ph * 1.3) * 0.12, p = Math.max(0, 1 - e.shotT / 0.6);
      ctx.save(); ctx.translate(0, -34 + fl); ctx.rotate(tilt);
      for (const s of [-1, 1]) { ctx.strokeStyle = C(s < 0 ? '#9b6ad6' : '#ff8ac8'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(s * 11, -2); ctx.quadraticCurveTo(s * 18, 8 + Math.sin(ph * 4 + s) * 4, s * 14, 20); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-13, -10); ctx.quadraticCurveTo(0, -18, 13, -10); ctx.quadraticCurveTo(15, 4, 6, 12); ctx.quadraticCurveTo(0, 15, -6, 12); ctx.quadraticCurveTo(-15, 4, -13, -10); ctx.closePath(); eFill(G(-16, 14, '#ffffff', '#d8d0e8'));
      ctx.fillStyle = '#1b1726'; for (const s of [-1, 1]) { eE(s * 5.5, -4, 3.6, 2.4, s * -0.3); ctx.fill(); }
      glowDot(-5.5, -4, 4, '255,138,200', 0.5 + p * 0.4); glowDot(5.5, -4, 4, '255,138,200', 0.5 + p * 0.4);
      ctx.beginPath(); ctx.arc(0, 4, 5 + p * 1.5, 0.15, Math.PI - 0.15); ctx.fillStyle = '#1b1726'; ctx.fill();
      ctx.fillStyle = C('#e04a7a'); eE(-9, 2, 2.4, 1.4); ctx.fill(); eE(9, 2, 2.4, 1.4); ctx.fill();
      ctx.fillStyle = C('#ffd27a'); eP([[0, -18], [-3, -13], [3, -13]]); ctx.fill();
      ctx.restore();
      if (p > 0.2) for (let i = 0; i < 2; i++) { ctx.strokeStyle = `rgba(255,138,200,${p * (0.8 - i * 0.3)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-14 - i * 5, -30 + fl, 4 + i * 3, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke(); }
    },
    // Verdorbener Hain – Faulwurz: kranker Wurzelschrat
    faulwurz(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 7) : 0;
      for (let i = 0; i < 4; i++) { const x = -9 + i * 6, s = (i % 2 ? step : -step) * 2; eL(3.6, OUT, [[x, -8], [x - 3 + s, 0]]); eL(2.4, C('#5a4030'), [[x, -8], [x - 3 + s, 0]]); }
      ctx.beginPath(); ctx.moveTo(-12, -8); ctx.quadraticCurveTo(-15, -30, -6, -40); ctx.quadraticCurveTo(4, -46, 10, -36); ctx.quadraticCurveTo(14, -20, 11, -8); ctx.closePath(); eFill(G(-44, -8, '#6a5240', '#3a2a22'));
      for (let i = 0; i < 3; i++) eL(1, 'rgba(30,20,15,.6)', [[-6 + i * 6, -36], [-8 + i * 6, -12]]);
      // lila Fäulnis und Moos
      ctx.fillStyle = C('#7a3a9a'); eE(6, -22, 4, 6, 0.3); ctx.fill(); eE(-8, -16, 3, 4); ctx.fill(); glowDot(6, -22, 8, '190,90,255', 0.4);
      ctx.fillStyle = '#4a6a3a'; eE(-2, -41, 7, 2.6); ctx.fill();
      // Äste als Arme
      eL(3.4, OUT, [[-10, -26], [-17 - a * 6, -30], [-21 - a * 6, -36]]); eL(2.2, C('#5a4030'), [[-10, -26], [-17 - a * 6, -30], [-21 - a * 6, -36]]); eL(1.6, C('#5a4030'), [[-17 - a * 6, -30], [-22 - a * 6, -26]]);
      eL(3.4, OUT, [[10, -28], [16, -38]]); eL(2.2, C('#5a4030'), [[10, -28], [16, -38]]);
      ctx.fillStyle = '#12080e'; eE(-5, -30, 3, 2.4); ctx.fill(); eE(2, -30, 3, 2.4); ctx.fill();
      glowDot(-5, -30, 4, '210,120,255', 0.9); glowDot(2, -30, 4, '210,120,255', 0.9);
      ctx.fillStyle = '#12080e'; ctx.beginPath(); ctx.moveTo(-6, -23); for (let i = 0; i < 5; i++) ctx.lineTo(-6 + i * 2.5, -23 + (i % 2) * 2); ctx.lineTo(4, -20); ctx.lineTo(-6, -20); ctx.fill();
    },
    // Verdorbener Hain – Dornfalter: Motte mit Augenflecken, wirft Dornen
    dornfalter(e, t, ph, C, G, a, mv) {
      const fl = Math.sin(ph * 3) * 3, flap = Math.sin(ph * 14) * 0.5 + 0.6, p = Math.max(0, 1 - e.shotT / 0.6);
      ctx.save(); ctx.translate(0, -36 + fl);
      for (const [dx, dy, sc] of [[6, -10, 1], [4, 6, 0.75]]) { ctx.save(); ctx.translate(dx, dy * flap); ctx.scale(1, flap); eE(0, 0, 11 * sc, 8 * sc, -0.4); eFill(G(-8, 8, '#5a3a7a', '#2a1a3a'), 1.2); ctx.fillStyle = '#e8c860'; eC(2, -1, 3.4 * sc); ctx.fill(); ctx.fillStyle = '#1b1726'; eC(2, -1, 1.8 * sc); ctx.fill(); ctx.restore(); }
      eE(-2, 0, 7, 4.4); eFill(G(-4, 4, '#8a6a9a', '#4a3a5a'));
      for (let i = 0; i < 3; i++) eL(0.8, 'rgba(255,255,255,.3)', [[-4 + i * 3, -3], [-5 + i * 3, 3]]);
      eC(-8, -1, 3.6); eFill(C('#6a4a7a'), 1);
      ctx.fillStyle = '#ffe06a'; eC(-9.5, -2, 1.2); ctx.fill();
      eL(0.9, C('#2a1a3a'), [[-9, -4], [-13, -9], [-15, -8]]); eL(0.9, C('#2a1a3a'), [[-8, -4], [-10, -10], [-12, -10]]);
      if (p > 0.3) { ctx.fillStyle = `rgba(180,255,120,${p})`; eP([[-14, 1], [-20 - p * 3, 0], [-14, -1]]); ctx.fill(); }
      ctx.restore();
    },
    // Uhrwerkfabrik – Blechling: Uhrwerk-Soldat mit Aufziehschlüssel
    blechling(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 10) : 0;
      eLegs(step, C('#8a8f9c'), C('#3a3e48'), -12, 5, 3);
      rr(-9, -31, 18, 20, 4); eFill(G(-31, -11, '#d8b878', '#8a6a3a'));
      ctx.fillStyle = 'rgba(60,40,20,.5)'; for (const [rx, ry] of [[-6, -28], [6, -28], [-6, -14], [6, -14]]) { eC(rx, ry, 1); ctx.fill(); }
      ctx.fillStyle = C('#5a3a20'); ctx.fillRect(-9, -22, 18, 2.4);
      // Aufziehschlüssel hinten, dreht sich
      ctx.save(); ctx.translate(11, -22); ctx.rotate(ph * 4); ctx.fillStyle = C('#c9a64a'); ctx.fillRect(-1, -1, 6, 2); eE(7, -3, 2.6, 2); ctx.fill(); eE(7, 3, 2.6, 2); ctx.fill(); ctx.restore();
      // Kopf mit Linse
      rr(-8, -43, 16, 12, 4); eFill(G(-43, -31, '#c9cdd6', '#7a808c'));
      eC(-3, -37, 4); eFill('#2a2e38', 1); glowDot(-3, -37, 5, '255,170,60', 0.8); ctx.fillStyle = '#ffd27a'; eC(-3.6, -37.4, 1.8); ctx.fill();
      eL(1.4, C('#7a808c'), [[2, -43], [3, -48]]); eC(3, -49, 1.6); eFill(C('#e5484d'), 1);
      // Hammer-Arm
      ctx.save(); ctx.translate(-8, -26); ctx.rotate(-0.4 - a * 1.4 + Math.sin(ph * 3) * 0.1);
      eL(3.4, OUT, [[0, 0], [-10, 0]]); eL(2.2, C('#8a8f9c'), [[0, 0], [-10, 0]]); rr(-15, -4, 6, 8, 1.5); eFill(C('#5a5f6b'), 1.2); ctx.restore();
    },
    // Uhrwerkfabrik – Kanonier: kleiner Kanonenwagen
    kanonier(e, t, ph, C, G, a, mv) {
      const p = Math.max(0, 1 - e.shotT / 0.6), rec = e.shotT > 2 ? 0 : Math.max(0, (e.shotT - 1.8)) * 0;
      for (const wx of [-7, 7]) { ctx.save(); ctx.translate(wx, -6); ctx.rotate(mv ? -ph * 5 : 0); eC(0, 0, 6); eFill(C('#5a3a20'), 1.4); ctx.strokeStyle = '#c9a64a'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * 0.785 * 2) * 5, Math.sin(i * 0.785 * 2) * 5); ctx.stroke(); } ctx.restore(); }
      rr(-11, -22, 22, 13, 3); eFill(G(-22, -9, '#8a8f9c', '#4a4e58'));
      ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 3; i++) { eC(-7 + i * 7, -15, 1); ctx.fill(); }
      // Rohr nach links, hebt sich beim Laden
      ctx.save(); ctx.translate(-4, -24); ctx.rotate(0.15 + p * 0.25);
      rr(-20 + rec, -4, 22, 8, 3); eFill(G(-4, 4, '#5a5f6b', '#2a2e38')); rr(-22 + rec, -5, 4, 10, 1.5); eFill(C('#c9a64a'), 1);
      if (p > 0.5) glowDot(-22, 0, 5 + p * 4, '255,170,60', p * 0.6);
      ctx.restore();
      // Zündschnur-Kopf mit Auge
      eC(6, -26, 5); eFill(G(-31, -21, '#c9cdd6', '#7a808c'));
      ctx.fillStyle = '#2a2e38'; eC(4.5, -26.5, 2.2); ctx.fill(); ctx.fillStyle = '#ffb547'; eC(4, -27, 1); ctx.fill();
      for (let i = 0; i < 3; i++) { const q = (ph * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(200,200,210,${0.4 * (1 - q)})`; eC(10 + q * 4, -30 - q * 14, 2 + q * 3); ctx.fill(); }
    },
    // Runenmine – Grubenwicht mit Helmlampe und Spitzhacke
    grubenwicht(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 12) : 0;
      eLegs(step, C('#5a4a3a'), C('#2a2018'), -11, 4.5, 3);
      rr(-8, -26, 16, 16, 5); eFill(G(-26, -10, '#6a6a7a', '#3a3a48'));
      ctx.fillStyle = C('#8a6a3a'); ctx.fillRect(-8, -14, 16, 2.4);
      eC(-1, -32, 8); eFill(G(-40, -24, '#9ab08a', '#6a8060'));
      for (const s of [-1, 1]) { eP([[s * 6, -34], [s * 13, -38], [s * 7, -30]]); eFill(C('#8aa07a'), 1); }
      eEye(-5, -32, 2.6, '#1b1726', '#ffe27a'); eEye(1, -32.5, 2.6, '#1b1726', '#ffe27a');
      ctx.fillStyle = '#2a1a10'; eE(-3, -27, 3, 1.4); ctx.fill();
      // Helm mit Lampe
      ctx.beginPath(); ctx.arc(-1, -35, 9, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(8, -35); ctx.lineTo(-10, -35); ctx.closePath(); eFill(G(-44, -35, '#ffd23f', '#c9962a'));
      rr(-8, -43, 5, 5, 1.5); eFill(C('#f2f2f2'), 1); glowDot(-8, -40, 9, '255,240,180', 0.7);
      // Spitzhacke
      ctx.save(); ctx.translate(-8, -19); ctx.rotate(-0.6 - a * 1.6);
      eL(3, OUT, [[0, 0], [-2, -16]]); eL(2, C('#8a6a3a'), [[0, 0], [-2, -16]]);
      ctx.beginPath(); ctx.moveTo(-10, -14); ctx.quadraticCurveTo(-2, -20, 6, -15); ctx.lineTo(-2, -17); ctx.closePath(); eFill(LG(-20, -14, '#e0e6ee', '#7d8696'), 1.2); ctx.restore();
    },
    // Runenmine – Kristallgeist: schwebender Kristall mit Auge
    kristallwisp(e, t, ph, C, G, a, mv) {
      const fl = Math.sin(ph * 2.2) * 4, p = Math.max(0, 1 - e.shotT / 0.6), sp = ph * 1.5;
      glowDot(0, -34 + fl, 24, '70,212,238', 0.35 + p * 0.3);
      ctx.save(); ctx.translate(0, -34 + fl);
      for (let i = 0; i < 4; i++) { const an = sp + i * Math.PI / 2, x = Math.cos(an) * 16, y = Math.sin(an) * 6; ctx.save(); ctx.translate(x, y); ctx.rotate(an); eP([[0, -4], [2, 0], [0, 4], [-2, 0]]); eFill(C('#9cf2ff'), 0.8); ctx.restore(); }
      eP([[0, -16], [8, -4], [5, 10], [-5, 10], [-8, -4]]); eFill(G(-16, 10, '#c8f8ff', '#2a8fa6'), 1.4);
      eL(1, 'rgba(255,255,255,.6)', [[0, -16], [0, 10]]); eL(1, 'rgba(255,255,255,.35)', [[-8, -4], [8, -4]]);
      eC(-1, -2, 3.6); eFill('#0a2a33', 1); glowDot(-1.5, -2, 4, '200,255,255', 0.7 + p * 0.3); ctx.fillStyle = '#ffffff'; eC(-2, -2.5, 1.3); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(70,212,238,.25)'; eE(0, 0, 10, 2.4); ctx.fill();
    },
  });
  // Leuchtendes Auge für die Gebietsgegner
  function geyeE(x, y, c) { glowDot(x, y, 4, hexRgb(c), 0.7); ctx.fillStyle = c; eC(x, y, 1.5); ctx.fill(); }
  Object.assign(ENEMY_SIZE, { ghul: 1.1, faulwurz: 1.1, kanonier: 1.05, dornfalter: 1.35, kristallwisp: 1.2, maske: 1.1 });
  // ================= Umgebung (Grafik-Update 6.0): 15 eigene Gebiete, Lager und Turm =================
  const frac = x => x - Math.floor(x);
  function vg(stops, y0 = 0, y1 = H) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function skyFill(stops, y1 = GROUND) { ctx.fillStyle = vg(stops, 0, y1); ctx.fillRect(0, 0, W, H); }
  function disc(x, y, r, core, rgb, a = 0.5) { glowDot(x, y, r * 7, rgb, a * 0.35); glowDot(x, y, r * 2.6, rgb, a); ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  function moon(x, y, r, t, tint = '#f3ecd8', glow = '240,232,210') {
    glowDot(x, y, r * 6, glow, 0.22); glowDot(x, y, r * 2.2, glow, 0.35);
    ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.08)'; for (const [dx, dy, rr2] of [[-4, -3, 3.4], [4, 3, 2.4], [-2, 5, 1.8], [5, -5, 1.6]]) { ctx.beginPath(); ctx.arc(x + dx * r / 14, y + dy * r / 14, rr2 * r / 14, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, 7); ctx.fill();
  }
  function stars(t, n, yMax = 150, a = 1, seed = 0) {
    for (let i = 0; i < n; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i + seed) * 2) + i), x = hash(i * 1.3 + seed) * W, y = hash(i * 2.7 + 5 + seed) * yMax, s = hash(i + 11 + seed) < 0.12 ? 1.8 : 1.1;
      ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.75 * tw) * a})`; ctx.fillRect(x, y, s, s);
      if (s > 1.5 && tw > 0.8) { ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`; ctx.fillRect(x - 2, y + 0.4, 5.8, 1); ctx.fillRect(x + 0.4, y - 2, 1, 5.8); }
    }
  }
  function cloud(x, y, s, top, bottom, a = 1) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = bottom; ctx.beginPath(); ctx.ellipse(0, 4, 40, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(-16, 0, 18, 11, 0, 0, 7); ctx.ellipse(4, -6, 20, 15, 0, 0, 7); ctx.ellipse(22, 0, 16, 10, 0, 0, 7); ctx.ellipse(0, 3, 36, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-2, -12, 10, 4, -0.2, 0, 7); ctx.fill();
    ctx.restore();
  }
  function clouds(t, n, y0, y1, top, bottom, a = 1, speed = 6, seed = 0, scale = 1) {
    for (let i = 0; i < n; i++) { const sp = speed * (0.6 + hash(i + seed) * 0.8), x = frac(hash(i * 3.3 + seed) + t * sp / (W + 200)) * (W + 200) - 100; cloud(x, y0 + hash(i * 5.1 + seed) * (y1 - y0), (0.55 + hash(i + 7 + seed) * 0.6) * scale, top, bottom, a); }
  }
  // Höhenzug: rund, spitz (Berge), Dünen, Tafelberge
  function ry(wx, f, seed, kind) {
    const u = wx * f + seed;
    if (kind === 'peak') { const a = 1 - Math.abs(frac(u) * 2 - 1), b = 1 - Math.abs(frac(u * 2.37 + 0.31) * 2 - 1); return Math.pow(a, 1.5) * 0.72 + Math.pow(b, 2.2) * 0.32 + Math.sin(u * 9.3) * 0.025; }
    if (kind === 'dune') return 0.5 + 0.42 * Math.sin(u) + 0.12 * Math.sin(u * 2.2 + 1);
    if (kind === 'mesa') { const s = Math.sin(u) * 0.7 + Math.sin(u * 0.37 + 2) * 0.3; return s > 0.25 ? 0.95 + Math.sin(u * 11) * 0.015 : s > 0.05 ? 0.2 + (s - 0.05) * 3.75 : 0.18 + 0.05 * Math.sin(u * 4); }
    return 0.5 + 0.34 * Math.sin(u) + 0.14 * Math.sin(u * 2.3 + seed * 1.7) + 0.05 * Math.sin(u * 6.1 + seed);
  }
  function ridge(sc, par, base, amp, f, fill, o = {}) {
    const off = sc * par, kind = o.kind, seed = o.seed || 0, ys = [];
    ctx.beginPath(); ctx.moveTo(-4, H);
    for (let x = -4; x <= W + 4; x += 4) { const y = base - amp * ry(x + off, f, seed, kind); ys.push(y); ctx.lineTo(x, y); }
    ctx.lineTo(W + 4, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (o.snow) {
      ctx.save(); ctx.clip(); const sl = base - amp * (o.snowAt || 0.62);
      ctx.beginPath(); ctx.moveTo(-4, 0); for (let x = -4; x <= W + 4; x += 6) ctx.lineTo(x, sl + Math.sin((x + off) * 0.21) * 3 + Math.sin((x + off) * 0.07) * 4); ctx.lineTo(W + 4, 0); ctx.closePath();
      ctx.fillStyle = o.snow; ctx.fill();
      ctx.restore();
    }
    if (o.shade) { ctx.save(); ctx.clip(); ctx.fillStyle = vg(['rgba(0,0,0,0)', o.shade], base - amp, base + 20); ctx.fillRect(0, base - amp - 4, W, H); ctx.restore(); }
    if (o.rim) { ctx.strokeStyle = o.rim; ctx.lineWidth = 1; ctx.beginPath(); ys.forEach((y, i) => (i ? ctx.lineTo(-4 + i * 4, y) : ctx.moveTo(-4, y))); ctx.stroke(); }
    return x => base - amp * ry(x + off, f, seed, kind);
  }
  // Wiederholt Dinge in der Welt (parallax), fest verankert über die Weltposition
  function each(sc, par, sp, fn, skip = 0, seed = 0) {
    const off = sc * par, k0 = Math.floor((off - 120) / sp), k1 = Math.floor((off + W + 120) / sp);
    for (let k = k0; k <= k1; k++) { if (hash(k * 7.13 + seed) < skip) continue; fn(k * sp + hash(k * 3.1 + seed) * sp * 0.6 - off, k); }
  }
  function fog(t, y, h, rgb, a, speed = 8, n = 6, seed = 0) {
    if (lowFx) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) { const x = frac(hash(i * 2.1 + seed) + t * speed * (0.6 + hash(i) * 0.6) / (W + 260)) * (W + 260) - 130, yy = y + (hash(i * 4.4 + seed) - 0.5) * h * 0.6, rx = 90 + hash(i + 3) * 70;
      const pa = ctx.globalAlpha; ctx.globalAlpha = a * 0.9; ctx.drawImage(glowSprite(rgb), x - rx, yy - h, rx * 2, h * 2); ctx.globalAlpha = pa; }
  }
  function sunRays(t, x0, rgb, a, n = 4, spread = 46, slant = -90) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) { const x = x0 + i * spread + Math.sin(t * 0.3 + i) * 6, w = 14 + hash(i + 2) * 22, al = a * (0.55 + 0.45 * Math.sin(t * 0.7 + i * 1.7));
      ctx.fillStyle = vg([`rgba(${rgb},${al})`, `rgba(${rgb},0)`], 0, GROUND + 10); ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x + w, -5); ctx.lineTo(x + w + slant, GROUND + 10); ctx.lineTo(x + slant - w * 0.4, GROUND + 10); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // Partikel: dot, glow, flake, rain, streak, leaf, ember, petal
  function parts(t, n, o) {
    if (lowFx) n = Math.ceil(n / 2);
    const [x0, y0, w, h] = o.area || [0, 0, W, GROUND], seed = o.seed || 0;
    for (let i = 0; i < n; i++) {
      const r1 = hash(i * 1.7 + seed), r2 = hash(i * 3.9 + seed + 1), sp = 0.6 + hash(i + seed + 2) * 0.8;
      let x = x0 + frac(r1 + t * (o.vx || 0) * sp / w) * w + Math.sin(t * (o.wob || 0) + i) * (o.wa || 0), y = y0 + frac(r2 + t * (o.vy || 0) * sp / h) * h;
      const s = (o.size || 2) * (0.6 + hash(i + 9 + seed) * 0.8), al = (o.alpha || 1) * (o.tw ? 0.4 + 0.6 * Math.abs(Math.sin(t * o.tw + i)) : 1);
      if (o.type === 'glow') { glowDot(x, y, s * 3, o.rgb, al * 0.6); ctx.fillStyle = `rgba(255,255,255,${al})`; ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }
      else if (o.type === 'rain') { ctx.strokeStyle = `rgba(${o.rgb},${al})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); }
      else if (o.type === 'streak') { ctx.strokeStyle = `rgba(${o.rgb},${al})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 * sp, y + 1); ctx.stroke(); }
      else if (o.type === 'leaf' || o.type === 'petal') { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 * sp + i); ctx.scale(1, Math.sin(t * 3 + i)); ctx.fillStyle = `rgba(${o.rgb},${al})`; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.4, s * 0.7, 0, 0, 7); ctx.fill(); ctx.restore(); }
      else if (o.type === 'flake') { ctx.fillStyle = `rgba(${o.rgb},${al})`; ctx.beginPath(); ctx.arc(x, y, s * 0.7, 0, 7); ctx.fill(); }
      else if (o.type === 'ember') { glowDot(x, y, s * 2.2, o.rgb, al * 0.5); ctx.fillStyle = `rgba(255,236,190,${al})`; ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4); }
      else { ctx.fillStyle = `rgba(${o.rgb},${al})`; ctx.fillRect(x, y, s, s); }
    }
  }
  const VIG = new Map();
  function vignette(a, rgb = '0,0,0') {
    let c = VIG.get(rgb); if (!c) { c = document.createElement('canvas'); c.width = 240; c.height = 135; const g = c.getContext('2d'), v = g.createRadialGradient(120, 74, 52, 120, 74, 168); v.addColorStop(0, `rgba(${rgb},0)`); v.addColorStop(1, `rgba(${rgb},1)`); g.fillStyle = v; g.fillRect(0, 0, 240, 135); VIG.set(rgb, c); }
    const pa = ctx.globalAlpha; ctx.globalAlpha = a; ctx.drawImage(c, 0, 0, W, H); ctx.globalAlpha = pa;
  }
  function grade(color, a, mode = 'soft-light') { if (lowFx) return; ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  function lightPool(x, y, r, rgb, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(x, y, r, rgb, a); ctx.restore(); }

  // ---------- Boden ----------
  function groundBase(top, mid, bot, edge, sc, o = {}) {
    ctx.fillStyle = vg([top, mid, bot], GROUND, H); ctx.fillRect(0, GROUND, W, H - GROUND);
    if (edge) { ctx.fillStyle = edge; ctx.beginPath(); ctx.moveTo(0, GROUND + 3); for (let x = 0; x <= W; x += 6) ctx.lineTo(x, GROUND - 1 + Math.sin((x + sc) * 0.35) * 1.2 + (hash(Math.floor((x + sc) / 6)) - 0.5) * 1.6); ctx.lineTo(W, GROUND + 3); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, GROUND + 3, W, 1);
    // Steinchen und Flecken
    each(sc, 1, 14, (x, k) => { const y = GROUND + 7 + hash(k * 1.9) * 36, s = 1 + hash(k * 2.3) * 2.6;
      ctx.fillStyle = o.speck || 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y, s * 1.6, s * 0.7, 0, 0, 7); ctx.fill();
      if (hash(k * 5.5) < 0.35) { ctx.fillStyle = o.hi || 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(x - s * 0.3, y - s * 0.3, s * 0.8, s * 0.3, 0, 0, 7); ctx.fill(); } }, 0.15, 3);
    if (o.path) { ctx.fillStyle = o.path; ctx.beginPath(); ctx.moveTo(0, GROUND + 14); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, GROUND + 13 + Math.sin((x + sc) * 0.03) * 2); for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, GROUND + 30 + Math.sin((x + sc) * 0.025 + 1) * 3); ctx.closePath(); ctx.fill(); }
  }
  function tufts(sc, col, hi, par = 1, y = GROUND + 1, sp = 18, h = 7, seed = 0) {
    each(sc, par, sp, (x, k) => { const n = 3 + Math.floor(hash(k + seed) * 3), hh = h * (0.6 + hash(k * 1.3 + seed) * 0.8);
      for (let j = 0; j < n; j++) { const bx = x + j * 2.2, tip = bx + (j - n / 2) * 1.6 + Math.sin(sc * 0.02 + k) * 0.8;
        ctx.fillStyle = j % 2 ? col : hi; ctx.beginPath(); ctx.moveTo(bx - 1.1, y); ctx.quadraticCurveTo(bx, y - hh * 0.6, tip, y - hh * (0.7 + hash(k + j) * 0.4)); ctx.lineTo(bx + 1.1, y); ctx.closePath(); ctx.fill(); } }, 0.3, seed);
  }
  function flowers(sc, cols, seed = 0) {
    each(sc, 1, 22, (x, k) => { const y = GROUND + 4 + hash(k * 3.3 + seed) * 10, c = cols[k % cols.length];
      ctx.strokeStyle = 'rgba(40,90,40,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i * 1.257; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4, 1.1, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(x, y, 0.9, 0, 7); ctx.fill(); }, 0.35, seed);
  }
  function tiles(sc, col, rowH = 9, w = 22) {
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    for (let r = 0; r < 6; r++) { const y = GROUND + 4 + r * rowH * (1 + r * 0.12); if (y > H) break; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      const ww = w * (1 + r * 0.25), o = ((sc * (1 + r * 0.04) + (r % 2) * ww / 2) % ww + ww) % ww;
      for (let x = -o; x < W; x += ww) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rowH * (1 + r * 0.12)); ctx.stroke(); } }
  }

  // ---------- Requisiten ----------
  function oak(x, y, s, leaf = ['#6cc25a', '#3f8a3e', '#2c6a33'], trunk = '#6b4a2c') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = trunk; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-2, -16, -3, -30); ctx.lineTo(3, -30); ctx.quadraticCurveTo(2, -16, 5, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = trunk; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-9, -32); ctx.moveTo(1, -26); ctx.lineTo(9, -34); ctx.stroke();
    const blobs = [[-12, -36, 12], [10, -38, 12], [0, -46, 15], [-6, -52, 10], [8, -51, 10], [-15, -45, 9], [15, -46, 9]];
    ctx.fillStyle = leaf[2]; for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(bx + 1, by + 2, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = leaf[1]; for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = leaf[0]; for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(bx - r * 0.25, by - r * 0.3, r * 0.6, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function pine(x, y, s, cols = ['#2f6b4a', '#1d4a33', '#14361f'], snow) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-2.5, -12, 5, 12);
    for (let i = 0; i < 4; i++) { const w = 18 - i * 3.6, yb = -8 - i * 12, h = 20;
      ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(-w, yb); ctx.lineTo(0, yb - h); ctx.lineTo(w, yb); ctx.quadraticCurveTo(0, yb + 3, -w, yb); ctx.fill();
      ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.moveTo(-w * 0.15, yb - 2); ctx.lineTo(0, yb - h); ctx.lineTo(w, yb); ctx.quadraticCurveTo(w * 0.4, yb + 1, -w * 0.15, yb - 2); ctx.fill();
      if (snow) { ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(-w * 0.7, yb - h * 0.32); ctx.lineTo(0, yb - h); ctx.lineTo(w * 0.7, yb - h * 0.32); ctx.quadraticCurveTo(0, yb - h * 0.15, -w * 0.7, yb - h * 0.32); ctx.fill(); } }
    ctx.restore();
  }
  function deadTree(x, y, s, col, moss) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineCap = 'round';
    const br = (x0, y0, a, len, w, d) => { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (moss && d === 1) { ctx.strokeStyle = moss; ctx.lineWidth = 1; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x1 - i * 2, y1); ctx.quadraticCurveTo(x1 - i * 2 + 1, y1 + 6, x1 - i * 2, y1 + 10 + i * 3); ctx.stroke(); } ctx.strokeStyle = col; }
      if (d > 0) { br(x1, y1, a - 0.5, len * 0.66, w * 0.62, d - 1); br(x1, y1, a + 0.45, len * 0.6, w * 0.6, d - 1); } };
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-2, -10, -3, -24); ctx.lineTo(3, -24); ctx.quadraticCurveTo(2, -10, 7, 0); ctx.closePath(); ctx.fill();
    br(0, -22, -1.9, 14, 3.4, 2); br(0, -22, -1.1, 15, 3, 2); br(-1, -14, -2.6, 9, 2, 1);
    ctx.restore();
  }
  function rock(x, y, s, c1, c2, hi = 'rgba(255,255,255,.18)') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-10, -8); ctx.lineTo(-3, -13); ctx.lineTo(6, -11); ctx.lineTo(12, -4); ctx.lineTo(13, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-3, -13); ctx.lineTo(6, -11); ctx.lineTo(2, -6); ctx.lineTo(-6, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hi; ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(4, -10.5); ctx.lineTo(0, -8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function bush(x, y, s, c = ['#5aa84e', '#3a7d3a'], berry) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = c[1]; for (const [bx, by, r] of [[-8, -5, 7], [0, -8, 9], [8, -5, 7]]) { ctx.beginPath(); ctx.arc(bx, by, r, Math.PI, 0); ctx.fill(); }
    ctx.fillRect(-15, -5, 30, 5);
    ctx.fillStyle = c[0]; for (const [bx, by, r] of [[-9, -7, 4], [-1, -11, 5], [7, -7, 4]]) { ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); }
    if (berry) { ctx.fillStyle = berry; for (const [bx, by] of [[-6, -4], [3, -9], [9, -3], [-1, -3], [-11, -2]]) { ctx.beginPath(); ctx.arc(bx, by, 1.4, 0, 7); ctx.fill(); } }
    ctx.restore();
  }
  function fence(x, y, s, col = '#8a6a44') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
    for (const px of [-14, 0, 14]) { ctx.fillRect(px - 1.6, -16, 3.2, 16); ctx.beginPath(); ctx.moveTo(px - 1.6, -16); ctx.lineTo(px, -19); ctx.lineTo(px + 1.6, -16); ctx.fill(); }
    ctx.fillRect(-16, -13, 32, 2.4); ctx.fillRect(-16, -7, 32, 2.4);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(-16, -11, 32, 0.8); ctx.fillRect(-16, -5, 32, 0.8);
    ctx.restore();
  }
  function tomb(x, y, s, col, kind) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 3, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.rotate((kind - 1) * 0.06);
    if (kind === 0) { ctx.fillStyle = col; ctx.fillRect(-1.8, -26, 3.6, 26); ctx.fillRect(-8, -20, 16, 3.6); }
    else { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-8, -16); ctx.arc(0, -16, 8, Math.PI, 0); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-4, -16, 8, 1.4); ctx.fillRect(-3, -12, 6, 1.4); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-8, -16, 2, 16); }
    ctx.restore();
    ctx.fillStyle = 'rgba(80,110,60,.6)'; ctx.beginPath(); ctx.ellipse(-4, -1, 5, 2, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function candle(x, y, t, k, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(-1.6, -8, 3.2, 8); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0.6, -8, 1, 8);
    const f = 1 + Math.sin(t * 13 + k) * 0.15; glowDot(0, -11, 9 * f, '255,190,90', 0.5);
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(0, -11, 1.6, 3 * f, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.ellipse(0, -10.4, 0.7, 1.4, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function flame(x, y, s, t, k, c1 = '#ff8a3d', c2 = '#ffd27a', rgb = '255,150,60') {
    glowDot(x, y - 4 * s, 18 * s, rgb, 0.45);
    for (let i = 0; i < 3; i++) { const h = (7 + Math.sin(t * 11 + k + i * 2) * 2.5) * s * (1 - i * 0.22); ctx.fillStyle = i === 2 ? '#fff6d8' : i ? c2 : c1;
      ctx.beginPath(); ctx.moveTo(x - (3.2 - i) * s, y); ctx.quadraticCurveTo(x - (2 - i * 0.5) * s, y - h * 0.6, x + Math.sin(t * 7 + k) * s, y - h); ctx.quadraticCurveTo(x + (2 - i * 0.5) * s, y - h * 0.6, x + (3.2 - i) * s, y); ctx.closePath(); ctx.fill(); }
  }
  function crystal(x, y, s, c1, c2, rgb, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    glowDot(0, -10, 22, rgb, 0.25 + 0.12 * Math.sin(t * 2 + k));
    for (const [dx, h, w, a] of [[-6, 16, 4, -0.35], [5, 13, 3.6, 0.3], [0, 24, 5, 0]]) { ctx.save(); ctx.translate(dx, 0); ctx.rotate(a);
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.75); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-w * 0.6, -h * 0.7, 1, h * 0.5); ctx.restore(); }
    ctx.restore();
  }
  function mushroom(x, y, s, cap, glowRgb, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (glowRgb) glowDot(0, -7, 14, glowRgb, 0.35 + 0.15 * Math.sin(t * 2 + k));
    ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.moveTo(-1.8, 0); ctx.quadraticCurveTo(-2.4, -4, -1.4, -6); ctx.lineTo(1.4, -6); ctx.quadraticCurveTo(2.4, -4, 1.8, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cap; ctx.beginPath(); ctx.ellipse(0, -6, 6, 4, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (const [dx, dy] of [[-3, -7.5], [1, -9], [3.4, -7]]) { ctx.beginPath(); ctx.arc(dx, dy, 0.8, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function reeds(x, y, s, col, head, seed = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const dx = (i - 3) * 2.2, h = 16 + hash(i + seed) * 10; ctx.beginPath(); ctx.moveTo(dx, 0); ctx.quadraticCurveTo(dx + 1, -h * 0.6, dx + (i - 3) * 1.2, -h); ctx.stroke();
      if (i % 2 && head) { ctx.fillStyle = head; ctx.beginPath(); ctx.ellipse(dx + (i - 3) * 1.1, -h + 2, 1.5, 3.6, 0, 0, 7); ctx.fill(); } }
    ctx.restore();
  }
  function pillar(x, y, s, col, dark, broken, cap, hb = 0.5) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const h = broken ? 22 + hb * 14 : 44;
    ctx.fillStyle = col; ctx.fillRect(-6, -h, 12, h); ctx.fillStyle = dark; for (let i = -4; i <= 4; i += 4) ctx.fillRect(i - 0.6, -h, 1.2, h);
    ctx.fillStyle = col; ctx.fillRect(-8, -4, 16, 4); ctx.fillStyle = dark; ctx.fillRect(-8, -1.2, 16, 1.2);
    if (broken) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, -h); ctx.lineTo(-3, -h - 5); ctx.lineTo(1, -h - 2); ctx.lineTo(4, -h - 6); ctx.lineTo(6, -h); ctx.fill(); ctx.fillRect(10, -3, 7, 3); }
    else { ctx.fillStyle = cap || col; ctx.fillRect(-8, -h - 4, 16, 4); ctx.fillRect(-7, -h - 6, 14, 2); }
    ctx.restore();
  }
  function bones(x, y, s, col = '#e8e2d0') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -4, 4, 0, 7); ctx.fill(); ctx.fillRect(-2.6, -2, 5.2, 3);
    ctx.fillStyle = 'rgba(30,20,30,.85)'; ctx.fillRect(-2, -5, 1.4, 1.6); ctx.fillRect(0.6, -5, 1.4, 1.6);
    ctx.fillStyle = col; ctx.save(); ctx.rotate(0.3); ctx.fillRect(4, -1.4, 10, 1.8); ctx.beginPath(); ctx.arc(4, -0.5, 1.4, 0, 7); ctx.arc(14, -0.5, 1.4, 0, 7); ctx.fill(); ctx.restore();
    ctx.restore();
  }
  function ribcage(x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-34, -2); ctx.quadraticCurveTo(0, -8, 34, -3); ctx.stroke();
    ctx.lineWidth = 2.2; for (let i = -3; i <= 3; i++) { const bx = i * 9, h = 26 - Math.abs(i) * 3.5; ctx.beginPath(); ctx.moveTo(bx, -5); ctx.quadraticCurveTo(bx + 8, -h * 0.8, bx + 4, -h); ctx.stroke(); }
    ctx.restore();
  }
  function goldPile(x, y, s, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = vg(['#ffe48a', '#d99a22', '#8a5a14'], -18, 0); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-12, -20, 0, -18); ctx.quadraticCurveTo(14, -20, 26, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,.8)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(-16 + i * 5 + hash(i + k) * 3, -4 - hash(i * 2 + k) * 10, 2.2, 1, 0, 0, 7); ctx.fill(); }
    const sp = 0.5 + 0.5 * Math.sin(t * 3 + k * 2); if (sp > 0.85) { const sx = -8 + hash(k + Math.floor(t)) * 16, sy = -12; ctx.fillStyle = '#fff'; ctx.fillRect(sx - 3, sy, 7, 1); ctx.fillRect(sx, sy - 3, 1, 7); }
    ctx.restore();
  }
  function chest(x, y, s, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    glowDot(0, -10, 18, '255,210,100', 0.25 + 0.1 * Math.sin(t * 3 + k));
    ctx.fillStyle = '#6b3a1c'; rr(-11, -12, 22, 12, 2); ctx.fill(); ctx.fillStyle = '#8a4e24'; ctx.beginPath(); ctx.moveTo(-11, -12); ctx.quadraticCurveTo(0, -20, 11, -12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0a83a'; ctx.fillRect(-11, -12.5, 22, 1.6); ctx.fillRect(-7, -16, 2, 16); ctx.fillRect(5, -16, 2, 16); ctx.fillRect(-1.6, -10, 3.2, 3.6);
    ctx.restore();
  }
  function obelisk(x, y, s, col, rgb, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    glowDot(0, -22, 26, rgb, 0.2 + 0.1 * Math.sin(t * 1.5 + k));
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-4, -36); ctx.lineTo(0, -42); ctx.lineTo(4, -36); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-4, -36); ctx.lineTo(0, -42); ctx.lineTo(0, 0); ctx.fill();
    const a = 0.55 + 0.45 * Math.sin(t * 2 + k); ctx.fillStyle = `rgba(${rgb},${a})`; for (let i = 0; i < 4; i++) { ctx.fillRect(-1.6, -32 + i * 7, 3.2, 1.2); ctx.fillRect(-0.6, -34 + i * 7, 1.2, 4); }
    ctx.restore();
  }
  function lantern(x, y, s, t, k, rgb = '255,200,110') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#3a3026'; ctx.fillRect(-1.2, -40, 2.4, 40); ctx.fillRect(-1.2, -40, 10, 2);
    const sw = Math.sin(t * 1.4 + k) * 0.12; ctx.translate(8, -38); ctx.rotate(sw);
    ctx.strokeStyle = '#3a3026'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 4); ctx.stroke();
    glowDot(0, 9, 16, rgb, 0.45 + 0.1 * Math.sin(t * 9 + k));
    ctx.fillStyle = '#3a3026'; ctx.fillRect(-3.4, 4, 6.8, 1.6); ctx.fillRect(-3.4, 13, 6.8, 1.6); ctx.fillStyle = `rgba(${rgb},.95)`; ctx.fillRect(-2.6, 5.6, 5.2, 7.4);
    ctx.restore();
  }

  // ---------- Gemalte Hintergründe (Bilder) mit Bewegung obendrauf ----------
  // Je Gebiet ein Bild, an den Rändern überblendet, damit es nahtlos wiederholt. Himmel und Kulisse ziehen langsamer vorbei als der Boden.
  // t = Oberkante des Laufwegs im Bild, fy = Höhe, auf der die Figuren stehen (mitten auf dem Weg). Leuchtende Stellen flackern bzw. pulsieren. Ohne Bild wird wie früher gezeichnet.
  const BG_V = 4; // bei neuen Bildern erhöhen
  const BG_META = {"wiesen":{"w":1728,"h":768,"fy":602,"g":[],"t":590,"ext":"webp","sky":[1728,768,0.8,-134]},"finster":{"w":1728,"h":768,"fy":619,"g":[],"t":609},"gruft":{"w":1728,"h":768,"fy":614,"g":[[1151,547,9,"104,122,156","c"]],"t":608},"glut":{"w":1728,"h":768,"fy":624,"g":[[426,334,40,"243,83,9","f"],[462,556,40,"243,84,8","f"],[247,580,40,"229,85,7","f"],[1149,357,40,"243,80,8","f"],[1697,557,40,"246,84,9","f"],[36,318,40,"225,73,7","f"],[1167,589,40,"231,68,13","f"],[519,489,37,"223,60,10","f"],[818,570,35,"232,75,12","f"],[663,596,29,"232,84,6","f"],[1626,578,34,"225,65,13","f"],[1389,569,26,"214,55,12","f"],[107,492,25,"183,52,15","f"],[916,597,23,"233,71,13","f"],[876,585,24,"229,67,14","f"],[596,368,24,"241,72,17","f"],[977,598,22,"231,68,14","f"],[281,465,23,"184,49,15","f"]],"t":617},"frost":{"w":1728,"h":768,"fy":608,"g":[],"t":597},"moor":{"w":1728,"h":768,"fy":603,"g":[],"t":595},"dornen":{"w":1728,"h":768,"fy":600,"g":[],"t":591},"krypta":{"w":1728,"h":768,"fy":619,"g":[[1148,331,40,"105,86,243","c"],[894,462,40,"156,99,212","c"],[1462,505,40,"165,106,223","c"],[290,406,40,"94,70,214","c"],[1605,476,40,"77,61,177","c"],[1279,381,40,"82,59,180","c"],[1384,287,40,"83,59,197","c"],[963,293,38,"114,71,210","c"],[1069,339,38,"119,76,214","c"],[1149,478,40,"69,57,161","c"],[1061,268,40,"90,60,209","c"],[1480,296,32,"116,73,206","c"],[525,499,31,"159,104,221","c"],[780,408,35,"91,64,197","c"],[1080,264,34,"95,62,215","c"],[26,379,31,"130,85,201","c"],[506,518,25,"139,95,212","c"],[1393,476,33,"84,64,186","c"]],"t":612},"wueste":{"w":1728,"h":768,"fy":624,"g":[],"t":610},"eis":{"w":1728,"h":768,"fy":598,"g":[[865,569,40,"102,208,240","c"],[672,490,40,"115,224,249","c"],[1467,367,40,"78,188,233","c"],[1064,150,40,"60,158,209","c"],[439,74,40,"63,152,195","c"],[1430,64,40,"54,149,200","c"],[495,374,40,"48,133,202","c"],[1633,142,40,"55,156,208","c"],[733,531,40,"117,228,250","c"],[810,354,40,"53,171,226","c"],[290,508,40,"123,217,239","c"],[187,321,40,"77,167,212","c"],[449,403,40,"54,169,221","c"],[1220,67,40,"52,149,201","c"],[720,88,39,"38,137,193","c"],[1594,515,40,"40,126,188","c"],[370,306,40,"39,116,185","c"],[523,543,39,"35,156,216","c"]],"t":583},"sterne":{"w":1728,"h":768,"fy":634,"g":[[1661,258,40,"102,74,216","c"],[391,306,38,"102,70,219","c"],[1278,434,40,"108,82,226","c"],[482,590,34,"142,90,238","c"],[1094,282,36,"106,73,219","c"],[1205,595,34,"132,92,230","c"],[1510,424,29,"130,109,232","c"],[317,593,34,"131,108,195","c"],[105,595,28,"123,89,202","c"],[1606,245,27,"88,66,190","c"],[764,344,25,"90,69,200","c"],[975,603,22,"116,81,225","c"],[263,588,25,"152,129,200","c"],[1418,597,23,"148,125,192","c"],[1488,98,16,"110,73,190","c"],[598,594,21,"160,136,191","c"],[304,275,19,"91,65,190","c"],[792,570,21,"184,160,201","c"]],"t":628},"hain":{"w":1728,"h":768,"fy":608,"g":[[741,245,40,"222,230,149","c"],[1634,278,40,"200,213,139","c"],[931,299,40,"219,229,151","c"],[1423,309,40,"195,210,139","c"],[1207,249,40,"228,235,152","c"],[378,333,40,"193,208,138","c"],[1059,345,40,"210,223,148","c"],[214,278,40,"182,198,128","c"],[459,340,40,"214,225,148","c"],[1312,295,40,"207,221,145","c"],[818,575,31,"106,208,208","c"],[1724,318,34,"202,215,141","c"],[1628,438,39,"160,170,102","c"],[1113,116,36,"176,191,115","c"],[1688,568,27,"202,172,107","f"],[743,436,33,"144,165,99","c"],[541,567,29,"202,173,107","f"],[1389,518,24,"106,211,216","c"]],"t":597},"toten":{"w":1728,"h":768,"fy":611,"g":[[1058,585,40,"110,221,155","c"],[712,516,40,"103,211,160","c"],[1422,515,40,"91,203,153","c"],[1149,304,38,"107,205,169","c"],[9,590,33,"114,219,156","c"],[1716,587,31,"133,226,168","c"],[282,519,32,"113,209,162","c"],[538,596,39,"41,163,91","c"],[1488,594,36,"41,168,93","c"],[339,284,29,"104,192,161","c"],[5,274,27,"112,193,163","c"],[830,268,27,"98,183,154","c"],[1058,108,24,"109,181,154","c"],[218,161,23,"93,164,140","c"],[1516,560,27,"43,162,101","c"],[1319,599,19,"38,157,90","c"],[1724,274,13,"101,186,154","c"],[237,561,12,"60,173,108","c"]],"t":605},"hort":{"w":1728,"h":768,"fy":612,"g":[[799,318,40,"249,119,24","f"],[1043,271,40,"247,113,23","f"],[1365,484,40,"251,132,27","f"],[1719,319,40,"247,101,16","f"],[837,527,40,"251,138,28","f"],[1462,577,40,"240,142,26","f"],[569,574,40,"240,134,21","f"],[28,586,40,"232,119,17","f"],[1590,350,40,"219,77,18","f"],[1270,580,40,"242,97,13","f"],[411,583,39,"246,120,11","f"],[1639,512,40,"242,103,8","f"],[1189,549,38,"244,96,17","f"],[504,555,38,"243,98,9","f"],[6,364,38,"243,122,23","f"],[41,166,40,"221,78,12","f"],[1037,569,32,"234,147,36","f"],[751,576,31,"245,99,10","f"]],"t":605},"himmel":{"w":1728,"h":768,"fy":617,"g":[],"t":612},"lager":{"w":1690,"h":931,"fy":797,"fx":832,"fire":[772,628,128,157],"g":[[289,571,36,"255,190,90","f"],[1166,684,36,"255,190,90","f"],[832,730,60,"255,150,50","f"]]},"x_hain":{"w":1728,"h":768,"fy":569,"g":[[1369,471,40,"131,64,194","c"],[209,548,40,"183,121,223","c"],[38,546,40,"190,130,229","c"],[976,550,40,"160,99,205","c"],[593,543,40,"174,114,219","c"],[1477,543,40,"173,117,217","c"],[1197,304,38,"160,61,238","c"],[493,380,39,"160,63,235","c"],[1085,471,40,"127,58,189","c"],[1487,436,40,"128,59,194","c"],[921,330,40,"112,54,167","c"],[361,514,40,"122,57,182","c"],[780,234,34,"149,57,230","c"],[650,382,40,"121,59,182","c"],[1602,250,31,"145,57,229","c"],[237,429,40,"121,56,179","c"],[1017,433,38,"132,63,193","c"],[1332,169,34,"116,55,177","c"]],"t":563},"x_werk":{"w":1728,"h":768,"fy":571,"g":[[467,525,40,"189,120,56","f"],[1431,502,40,"200,123,50","f"],[1423,562,40,"199,139,71","f"],[248,560,40,"194,130,64","f"],[655,498,40,"185,118,58","f"],[122,280,40,"178,104,37","f"],[399,480,40,"170,103,47","f"],[1640,497,38,"179,110,51","f"],[970,502,40,"212,129,47","f"],[163,505,37,"195,121,51","f"],[891,562,32,"183,128,70","f"],[372,121,29,"191,133,54","f"],[927,122,29,"189,132,54","f"],[1400,131,26,"195,135,54","f"],[205,130,24,"203,142,56","f"],[1318,387,35,"167,102,37","f"],[312,507,33,"185,112,46","f"],[1619,563,24,"185,128,74","f"]],"t":565},"x_mine":{"w":1728,"h":768,"fy":572,"g":[[512,449,40,"38,154,211","c"],[300,466,40,"48,184,219","c"],[46,470,40,"47,188,226","c"],[775,531,40,"41,188,231","c"],[50,166,40,"43,186,231","c"],[900,303,40,"38,175,225","c"],[337,320,40,"37,168,223","c"],[1582,527,40,"39,176,228","c"],[1192,511,40,"37,175,225","c"],[1410,496,40,"39,161,214","c"],[756,145,40,"44,184,226","c"],[380,141,39,"48,190,226","c"],[1482,153,39,"41,178,224","c"],[106,363,39,"36,160,218","c"],[728,289,35,"237,207,122","f"],[1179,157,29,"50,180,216","c"],[1089,520,36,"39,143,203","c"],[1380,289,34,"238,207,123","f"]],"t":558},"turm":{"w":1728,"h":768,"fy":556,"g":[[907,450,40,"131,92,190","c"],[681,536,40,"149,110,188","c"],[1414,467,40,"112,82,179","c"],[1268,366,40,"206,130,71","f"],[835,110,40,"199,131,64","f"],[1030,366,40,"210,136,72","f"],[162,111,40,"202,136,59","f"],[592,366,40,"213,141,70","f"],[257,463,40,"120,86,184","c"],[1148,457,40,"115,84,181","c"],[1483,111,40,"203,135,67","f"],[299,462,40,"113,83,180","c"],[1111,461,40,"123,88,188","c"],[906,324,40,"89,64,163","c"],[676,468,40,"144,99,197","c"],[1583,464,40,"113,82,179","c"],[673,390,40,"116,82,182","c"],[1696,366,40,"226,152,86","f"]],"t":547},"ahnen":{"w":1728,"h":768,"fy":564,"g":[[856,553,40,"204,156,139","f"],[1377,447,40,"228,171,79","f"],[609,444,40,"228,171,80","f"],[823,169,40,"171,183,171","c"],[263,170,40,"181,190,165","c"],[1584,169,40,"173,184,170","c"],[1186,197,40,"184,192,167","c"],[335,472,40,"145,195,238","c"],[1674,473,38,"144,210,239","c"],[1497,513,40,"175,123,177","c"],[1144,472,38,"148,211,244","c"],[423,513,40,"187,133,176","c"],[894,480,33,"135,197,237","c"],[522,509,40,"182,127,174","c"],[962,513,38,"185,130,178","c"],[1618,393,37,"239,154,133","f"],[1601,512,35,"184,131,177","c"],[666,385,32,"212,129,130","f"]],"t":559},"x_schatten":{"w":1728,"h":768,"fy":606,"g":[[1572,496,28,"225,186,103","f"],[800,422,23,"249,178,94","f"],[820,422,23,"248,176,94","f"],[426,497,27,"224,190,109","f"],[1043,497,26,"224,193,111","f"],[1448,411,23,"219,158,88","f"],[1022,434,23,"221,163,92","f"],[616,534,29,"169,129,108","f"],[1020,412,20,"240,176,92","f"],[1552,529,27,"181,134,99","f"],[1168,426,23,"180,131,94","f"],[1684,452,20,"203,146,94","f"],[516,432,18,"229,168,92","f"],[532,432,18,"229,165,89","f"],[1440,430,16,"236,179,95","f"],[1456,430,16,"235,174,94","f"],[1402,532,19,"200,140,90","f"],[1418,534,19,"202,137,83","f"]],"t":602},"x_friedhof":{"w":1728,"h":768,"fy":577,"g":[[1188,549,40,"152,210,167","c"],[779,550,40,"158,215,169","c"],[313,546,37,"157,214,170","c"],[18,551,40,"159,217,174","c"],[667,550,36,"91,166,133","c"],[1564,391,31,"125,197,162","c"],[827,232,29,"115,188,154","c"],[402,144,27,"111,187,153","c"],[1382,142,25,"104,177,145","c"],[1062,537,21,"124,192,143","c"],[1719,551,19,"126,186,146","c"],[1039,536,17,"106,171,127","c"],[421,553,12,"89,158,116","c"],[54,550,12,"93,154,124","c"],[1520,552,10,"92,159,121","c"],[311,517,10,"121,171,120","c"],[343,272,9,"96,165,131","c"],[190,385,8,"108,156,133","c"]],"t":569},"x_theater":{"w":1728,"h":768,"fy":572,"g":[[896,566,40,"194,144,68","f"],[594,119,40,"210,145,63","f"],[1341,120,40,"212,147,67","f"],[52,119,40,"196,135,62","f"],[1456,295,40,"212,130,57","f"],[427,292,40,"204,126,66","f"],[1016,442,40,"199,124,52","f"],[236,119,40,"184,124,58","f"],[593,452,40,"197,133,67","f"],[1586,455,40,"200,134,67","f"],[1427,454,34,"207,148,77","f"],[707,320,29,"213,131,56","f"],[1447,460,24,"208,148,75","f"],[1125,380,17,"175,98,38","f"],[909,379,16,"177,98,38","f"],[596,156,19,"160,87,32","f"],[1722,132,10,"184,108,39","f"],[920,392,12,"167,88,34","f"]],"t":570},"albtraum":{"w":2136,"h":515,"fy":417,"g":[]}};
  const ZONE_BG = ['wiesen', 'finster', 'gruft', 'glut', 'frost', 'moor', 'dornen', 'krypta', 'wueste', 'eis', 'sterne', 'hain', 'toten', 'hort', 'himmel'];
  const BG_IMG = {};
  function bgFile(f) {
    let e = BG_IMG[f];
    if (!e) { e = BG_IMG[f] = { ok: false, img: new Image() }; e.img.onload = () => { e.ok = true; }; e.img.src = `/bilder/${f}?v=${BG_V}`; }
    return e.ok ? e.img : null;
  }
  // Gebiete mit Himmels-Ebene: bg_X_sky.jpg (ganz hinten) + bg_X.webp (Szene mit durchsichtigem Himmel)
  function bgImg(k) {
    const M = BG_META[k]; if (!M) return null;
    const img = bgFile(`bg_${k}.${M.ext || 'jpg'}`), sky = M.sky ? bgFile(`bg_${k}_sky.jpg`) : true;
    return img && sky ? img : null;
  }
  let bgPre = false;
  function bgPreload() { if (bgPre) return; bgPre = true; bgImg('lager'); Object.keys(BG_META).filter(k => k !== 'lager').forEach((k, i) => setTimeout(() => bgImg(k), 400 + 250 * i)); }
  const LOBBY_S = 0.302; // Lagerbild: fester Maßstab, Feuerstelle liegt dort, wo das Spiel das Feuer zeichnet
  const bgScale = k => (BG_META[k].fx ? LOBBY_S : GROUND / BG_META[k].fy);
  function bgKey(R, stage, tower) {
    if (!R) return 'lager';
    if (tower) return 'turm';
    if (R.mode === 'wboss') { const B = WB_BOSS[R.wb.bk % WB_BOSS.length]; return BG_META[B.bg] ? B.bg : ZONE_BG[B.zone % ZONE_BG.length]; }
    if (ahnLike(R)) { const M = AHN_MISSIONS[R.ahn.mi]; return M && M.env === 'ahnen' ? 'ahnen' : M ? ZONE_BG[M.env % ZONE_BG.length] : null; }
    if (areaOf(R)) { const a = 'x_' + MISSION[R.mission].area; return BG_META[a] ? a : null; }
    return nightmare(stage) ? 'albtraum' : ZONE_BG[zoneOf(stage) % ZONE_BG.length];
  }
  function bgGlow(M, s, t, xAt, cut, dw) {
    if (lowFx || !M.g.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [gx, gy, r, rgb, kind] of M.g) {
      const ph = gx * 0.013 + gy * 0.007, R2 = r * s * 1.7, y = xAt.y + gy * s;
      const a = kind === 'f' ? 0.2 + 0.1 * Math.sin(t * 9 + ph) * Math.sin(t * 5.3 + ph * 2) + 0.07 * Math.sin(t * 2.1 + ph) : 0.13 + 0.1 * Math.sin(t * 1.5 + ph);
      for (let x = (gy >= cut ? xAt.near : xAt.far) + gx * s; x < W + R2; x += dw) if (x > -R2) glowDot(x, y, R2, rgb, a);
    }
    ctx.restore();
  }
  // fixX: Lager (Feuer an dieser x-Stelle, Bild steht still). Sonst laufender Hintergrund mit Tiefenwirkung.
  function drawBg(k, sc, t, fixX, sz) {
    const img = bgImg(k); if (!img) return false;
    const M = BG_META[k], s = sz || bgScale(k);
    if (M.fx) {
      const x = (fixX != null ? fixX : 250) - M.fx * s, y = GROUND - M.fy * s, w = M.w * s, h = M.h * s;
      ctx.drawImage(img, x, y, w + 0.5, h);
      if (y + h < H) ctx.drawImage(img, 0, M.h - 24, M.w, 24, x, y + h - 1, w + 0.5, H - y - h + 2);
      // Gemaltes Feuer bewegt sich: Flammen strecken sich leicht (nur größer, damit das Original darunter verdeckt bleibt)
      if (M.fire) { const [fx0, fy0, fw, fh] = M.fire, k1 = 1.03 + 0.05 * (0.5 + 0.5 * Math.sin(t * 7.3)) + 0.03 * (0.5 + 0.5 * Math.sin(t * 12.1 + 1)), k2 = 1.01 + 0.02 * (0.5 + 0.5 * Math.sin(t * 5.1 + 2));
        const bx = x + (fx0 + fw / 2) * s, by = y + (fy0 + fh) * s, FS = k === 'lager' ? fireSrc() : null;
        // Lager-Deko: umgefärbtes Feuer (erst ruhig darüber, dann die bewegten Flammen)
        if (FS) { const pd = FS.pad; ctx.drawImage(FS.c, x + (fx0 - pd) * s, y + (fy0 - pd) * s, FS.c.width * s, FS.c.height * s); ctx.drawImage(FS.c, pd, pd, fw, fh, bx - fw * s * k2 / 2, by - fh * s * k1, fw * s * k2, fh * s * k1);
          const it = decoOf('feuer'); if (it && (it.kind === 'stern' || it.kind === 'hero')) { const rgb = hexRgb(decoCol(it)); for (let i = 0; i < 6; i++) { const p = (t * 0.5 + i / 6) % 1; ctx.fillStyle = `rgba(${rgb},${1 - p})`; if (it.kind === 'stern') sparkle(bx + Math.sin(i * 2 + t) * 10, by - 22 - p * 60, 2.4 * (1 - p) + 0.6, 1 - p); else ctx.fillRect(bx + Math.sin(i * 3 + t) * 9, by - 20 - p * 60, 2.2, 2.2); } } }
        else ctx.drawImage(img, fx0, fy0, fw, fh, bx - fw * s * k2 / 2, by - fh * s * k1, fw * s * k2, fh * s * k1); }
      if (x + w < W) { ctx.save(); ctx.translate(2 * (x + w), 0); ctx.scale(-1, 1); ctx.drawImage(img, x, y, w, h); ctx.restore(); }
      if (x > 0) { ctx.save(); ctx.translate(2 * x, 0); ctx.scale(-1, 1); ctx.drawImage(img, x, y, w, h); ctx.restore(); }
      bgGlow(M, s, t, { far: x, near: x, y }, 1e9, 1e9);
    } else {
      const dw = M.w * s, cut = (M.t || M.fy - 14) - 2, wrap = v => -(((v % dw) + dw) % dw);
      const far = wrap(sc * 0.4), near = wrap(sc);
      // Himmel: sk = Größe im Verhältnis zur Szene, sy = Verschiebung nach oben (schneidet oben Himmel ab, damit die Berge über die Hügel ragen)
      if (M.sky) { const [sW, sH, sk, sy] = M.sky, sky = bgFile(`bg_${k}_sky.jpg`), sh = sH * sk * s, sw = sW * sk * s, sx = -(((sc * 0.12 % sw) + sw) % sw); for (let x = Math.floor(sx); x < W; x += sw) ctx.drawImage(sky, x, sy * s, sw + 1, sh); }
      for (let x = Math.floor(far); x < W; x += dw) ctx.drawImage(img, x, 0, dw + 1, M.h * s);
      for (let x = Math.floor(near); x < W; x += dw) {
        const pa = ctx.globalAlpha; ctx.globalAlpha = pa * 0.5; ctx.drawImage(img, 0, cut - 4, M.w, 4, x, (cut - 4) * s, dw + 1, 4 * s); ctx.globalAlpha = pa;
        ctx.drawImage(img, 0, cut, M.w, M.h - cut, x, cut * s, dw + 1, (M.h - cut) * s);
        if (M.h * s < H) ctx.drawImage(img, 0, M.h - 16, M.w, 16, x, M.h * s - 1, dw + 1, H - M.h * s + 2);
      }
      bgGlow(M, s, t, { far, near, y: 0 }, cut, dw);
    }
    if (BG_AMB[k]) { ctx.save(); if (fixX != null) ctx.translate(fixX - 250, 0); try { BG_AMB[k](t); } catch (e) {} ctx.restore(); }
    return true;
  }
  // Kleine Bewegungen je Gebiet, hinter den Figuren: Nebel, Funken, Glühwürmchen, Schnee, Staub …
  const BG_AMB = {
    wiesen: t => { sunRays(t, 330, '255,245,200', 0.06, 4, 46, -100); parts(t, 6, { type: 'glow', rgb: '255,250,200', vx: 4, vy: -2, wob: 1, wa: 8, size: 1, tw: 2, alpha: 0.5, area: [0, 120, W, 90], seed: 61 }); },
    finster: t => { fog(t, 186, 34, '110,170,190', 0.22, 5, 5, 2); parts(t, 12, { type: 'glow', rgb: '190,255,140', vx: 3, vy: -3, wob: 1, wa: 12, size: 1.2, tw: 2, alpha: 0.75, area: [0, 100, W, 110], seed: 62 }); },
    gruft: t => { fog(t, 200, 30, '150,110,210', 0.22, 4, 5, 3); parts(t, 10, { rgb: '220,200,255', vx: 2, vy: -4, size: 1.1, tw: 1.5, alpha: 0.5, seed: 63 }); },
    glut: t => { parts(t, 22, { type: 'ember', rgb: '255,140,60', vx: 6, vy: -26, wob: 2, wa: 6, size: 1.5, tw: 4, alpha: 0.9, seed: 64 }); fog(t, 205, 28, '255,90,40', 0.12, 6, 4, 4); },
    frost: t => { parts(t, 30, { type: 'flake', rgb: '255,255,255', vx: -10, vy: 22, wob: 1.2, wa: 8, size: 1.6, alpha: 0.85, area: [0, 0, W, H], seed: 65 }); fog(t, 200, 26, '230,240,255', 0.18, 7, 4, 5); },
    moor: t => { fog(t, 196, 36, '140,220,200', 0.24, 4, 6, 6); parts(t, 12, { type: 'glow', rgb: '160,255,200', vx: 2, vy: -2, wob: 1, wa: 10, size: 1.2, tw: 2, alpha: 0.75, area: [0, 110, W, 100], seed: 66 }); },
    dornen: t => { parts(t, 14, { type: 'petal', rgb: '255,120,150', vx: 14, vy: 10, wob: 2, wa: 8, size: 1.4, alpha: 0.7, area: [0, 0, W, H], seed: 67 }); fog(t, 205, 26, '120,220,190', 0.14, 4, 4, 7); },
    krypta: t => { fog(t, 205, 28, '140,100,230', 0.22, 3, 5, 8); parts(t, 14, { rgb: '210,190,255', vx: 2, vy: 3, wob: 1, wa: 6, size: 1, tw: 1.2, alpha: 0.45, seed: 68 }); },
    wueste: t => { parts(t, 26, { type: 'streak', rgb: '255,210,150', vx: 70, vy: 3, size: 1, alpha: 0.35, area: [0, 110, W, 110], seed: 69 }); fog(t, 200, 34, '255,180,110', 0.16, 14, 5, 9); },
    eis: t => { parts(t, 18, { type: 'glow', rgb: '150,210,255', vx: 1, vy: -3, size: 1.1, tw: 3, alpha: 0.8, seed: 70 }); fog(t, 205, 26, '120,180,255', 0.16, 3, 4, 10); },
    sterne: t => { parts(t, 26, { type: 'glow', rgb: '200,190,255', size: 0.9, tw: 2.5, alpha: 0.9, area: [0, 0, W, 120], seed: 71 }); const p = frac(t / 7), sx = 420 - p * 260, sy = 20 + p * 60; if (p < 0.18) { ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p / 0.18)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 26, sy - 6); ctx.stroke(); } },
    hain: t => { sunRays(t, 250, '255,240,170', 0.09, 5, 40, -96); parts(t, 12, { type: 'leaf', rgb: '170,210,90', vx: 10, vy: 14, wob: 2, wa: 10, size: 1.6, alpha: 0.75, area: [0, 0, W, H], seed: 72 }); parts(t, 10, { type: 'glow', rgb: '255,240,170', vx: 1, vy: -2, size: 1, tw: 2, alpha: 0.6, area: [0, 90, W, 120], seed: 73 }); },
    toten: t => { fog(t, 196, 38, '170,160,230', 0.26, 4, 6, 11); parts(t, 8, { type: 'glow', rgb: '170,255,220', vx: 3, vy: -6, wob: 1.4, wa: 14, size: 1.3, tw: 2, alpha: 0.7, area: [0, 90, W, 120], seed: 74 }); },
    hort: t => { parts(t, 24, { type: 'ember', rgb: '255,110,50', vx: 4, vy: -30, wob: 2, wa: 6, size: 1.5, tw: 4, alpha: 0.9, seed: 75 }); fog(t, 208, 26, '255,70,30', 0.14, 5, 4, 12); },
    himmel: t => { fog(t, 190, 40, '255,255,255', 0.3, 9, 6, 13); parts(t, 8, { type: 'glow', rgb: '255,250,220', vx: 3, vy: -2, size: 1, tw: 2, alpha: 0.6, area: [0, 40, W, 150], seed: 76 }); },
    albtraum: t => { fog(t, 198, 38, '230,90,200', 0.24, 5, 6, 14); parts(t, 18, { type: 'ember', rgb: '255,90,180', vx: 3, vy: -18, wob: 2, wa: 8, size: 1.4, tw: 3, alpha: 0.8, seed: 77 }); },
    x_schatten: t => { fog(t, 205, 30, '140,120,200', 0.2, 4, 5, 15); parts(t, 10, { type: 'glow', rgb: '255,210,140', vx: 2, vy: -3, wob: 1.4, wa: 10, size: 1, tw: 2.5, alpha: 0.6, area: [0, 120, W, 90], seed: 79 }); },
    x_friedhof: t => { fog(t, 198, 36, '120,230,170', 0.26, 4, 6, 16); parts(t, 8, { type: 'glow', rgb: '170,255,210', vx: 3, vy: -5, wob: 1.3, wa: 14, size: 1.3, tw: 2, alpha: 0.7, area: [0, 70, W, 140], seed: 80 }); },
    x_theater: t => { sunRays(t, 140 + Math.sin(t * 0.4) * 40, '255,230,170', 0.07, 3, 30, -84); sunRays(t, 360 + Math.sin(t * 0.33 + 2) * 40, '255,230,170', 0.06, 3, 30, -96); parts(t, 16, { rgb: '255,230,180', vx: 2, vy: -3, wob: 1, wa: 8, size: 0.9, tw: 1.5, alpha: 0.45, seed: 81 }); },
    x_hain: t => { fog(t, 200, 34, '170,90,230', 0.24, 4, 6, 17); parts(t, 16, { type: 'glow', rgb: '200,140,255', vx: 2, vy: -6, wob: 1.2, wa: 10, size: 1.1, tw: 2, alpha: 0.75, seed: 82 }); },
    x_werk: t => { fog(t, 200, 30, '255,190,120', 0.16, 6, 5, 18); parts(t, 12, { type: 'ember', rgb: '255,180,80', vx: 8, vy: -14, wob: 2, wa: 6, size: 1.1, tw: 4, alpha: 0.7, seed: 83 }); },
    x_mine: t => { parts(t, 16, { type: 'glow', rgb: '120,200,255', vx: 1, vy: -2, size: 1, tw: 3, alpha: 0.8, seed: 84 }); parts(t, 10, { rgb: '200,190,170', vx: 2, vy: 6, size: 0.9, alpha: 0.35, seed: 85 }); },
    turm: t => { parts(t, 14, { rgb: '255,220,170', vx: 2, vy: -3, wob: 1, wa: 8, size: 0.9, tw: 1.5, alpha: 0.45, seed: 86 }); fog(t, 205, 26, '150,120,220', 0.14, 3, 4, 19); },
    ahnen: t => { parts(t, 16, { type: 'glow', rgb: '140,200,255', vx: 1, vy: -10, wob: 1.2, wa: 8, size: 1.1, tw: 2, alpha: 0.8, seed: 87 }); fog(t, 200, 30, '200,170,255', 0.16, 5, 5, 20); },
    lager: t => { parts(t, 8, { type: 'ember', rgb: '255,170,80', vx: 2, vy: -24, wob: 2, wa: 5, size: 1.1, tw: 4, alpha: 0.8, area: [228, 60, 44, 150], seed: 78 }); },
  };

  // ---------- Die 15 Gebiete ----------
  const ENV = [];
  // 0 Grüne Wiesen
  ENV[0] = {
    back(t, sc) {
      skyFill(['#4f97e0', '#9fd0f5', '#e8f6ff']); disc(392, 58, 15, '#fffbe6', '255,244,200', 0.55);
      clouds(t, 5, 22, 92, '#ffffff', '#d6e8f7', 0.95, 5);
      ridge(sc, 0.06, 160, 74, 0.008, '#93b3d6', { kind: 'peak', snow: 'rgba(250,252,255,.95)', snowAt: 0.66, seed: 2 });
      ctx.fillStyle = vg(['rgba(230,244,255,0)', 'rgba(230,244,255,.55)'], 110, 175); ctx.fillRect(0, 110, W, 70);
      const hy = ridge(sc, 0.2, 186, 30, 0.012, '#86c06a', { seed: 1, rim: 'rgba(220,255,200,.35)' });
      each(sc, 0.2, 34, (x, k) => { const y = hy(x) + 2; ctx.fillStyle = '#5c9c4e'; ctx.beginPath(); ctx.arc(x, y - 6, 6 + hash(k) * 3, 0, 7); ctx.arc(x + 5, y - 4, 4, 0, 7); ctx.fill(); }, 0.5, 4);
      ridge(sc, 0.4, 204, 18, 0.018, '#5fae4c', { seed: 3, rim: 'rgba(200,255,180,.3)' });
      groundBase('#6cbf4f', '#7a6040', '#5a4430', '#7fd05c', sc, { path: 'rgba(196,160,110,.45)', speck: 'rgba(60,40,20,.25)' });
      flowers(sc, ['#ff6b8a', '#ffffff', '#ffd23f', '#9fb8ff']);
    },
    props(t, sc) {
      each(sc, 0.85, 120, (x, k) => oak(x, GROUND, 0.8 + hash(k) * 0.4), 0.4, 11);
      each(sc, 1, 70, (x, k) => (hash(k * 9) < 0.5 ? bush(x, GROUND + 2, 0.8 + hash(k) * 0.4, undefined, hash(k) < 0.4 ? '#e5484d' : null) : hash(k * 4) < 0.5 ? fence(x, GROUND + 1, 1) : rock(x, GROUND + 2, 0.7, '#a8a69a', '#7d7a70')), 0.45, 12);
    },
    front(t, sc) {
      parts(t, 4, { type: 'petal', rgb: '255,255,255', vx: 22, vy: 14, wob: 2, wa: 10, size: 1.6, alpha: 0.8, seed: 3 });
      for (let i = 0; i < 2; i++) { const x = frac(hash(i) + t * 0.03) * W, y = 150 + Math.sin(t * 1.3 + i * 3) * 30, f = Math.abs(Math.sin(t * 14 + i)); ctx.fillStyle = i ? '#ffd23f' : '#ff9ad0'; ctx.beginPath(); ctx.ellipse(x - 2, y, 2.4, 2.4 * f + 0.4, -0.4, 0, 7); ctx.ellipse(x + 2, y, 2.4, 2.4 * f + 0.4, 0.4, 0, 7); ctx.fill(); }
      tufts(sc, '#3f8a3e', '#5aa84e', 1.3, H, 26, 12, 5);
      grade('#ffe9b0', 0.18); vignette(0.18);
    },
  };
  // 1 Finsterwald
  ENV[1] = {
    back(t, sc) {
      skyFill(['#0c2229', '#1f4a4c', '#5d8a78']); disc(370, 70, 11, '#e8f1d8', '220,240,200', 0.3);
      each(sc, 0.12, 16, (x, k) => pine(x, 168 + hash(k) * 8, 0.55 + hash(k * 2) * 0.25, ['#2f5a52', '#2a4f48', '#24453f']), 0, 21);
      fog(t, 160, 40, '150,190,170', 0.35, 4, 6, 1);
      each(sc, 0.3, 24, (x, k) => pine(x, 192 + hash(k) * 6, 0.85 + hash(k * 2) * 0.3, ['#21443b', '#1b3a32', '#152e27']), 0.1, 22);
      sunRays(t, 250, '200,240,190', 0.07, 4, 50, -70);
      fog(t, 196, 30, '140,180,160', 0.3, 6, 6, 2);
      ridge(sc, 0.5, 214, 10, 0.03, '#183026', { seed: 2 });
      groundBase('#2f5a34', '#3b2f22', '#1d160f', '#3d6e3c', sc, { speck: 'rgba(0,0,0,.3)' });
    },
    props(t, sc) {
      each(sc, 0.8, 110, (x, k) => pine(x, GROUND, 1.25 + hash(k) * 0.35, ['#24503e', '#183a2c', '#10281e']), 0.35, 31);
      each(sc, 1, 60, (x, k) => { if (hash(k * 5) < 0.5) mushroom(x, GROUND + 2, 1.1, '#e5484d', '255,120,120', t, k); else { ctx.fillStyle = '#4a3624'; ctx.beginPath(); ctx.ellipse(x, GROUND - 3, 9, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6a5034'; ctx.beginPath(); ctx.ellipse(x - 7, GROUND - 3, 2.6, 4, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#3d6e3c'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 4 + i * 2, GROUND); ctx.quadraticCurveTo(x + 6 + i * 3, GROUND - 8, x + 10 + i * 3, GROUND - 6); ctx.stroke(); } } }, 0.45, 32);
    },
    front(t, sc) {
      parts(t, 14, { type: 'glow', rgb: '210,255,120', vx: 6, vy: -4, wob: 1.5, wa: 12, size: 1.6, tw: 2, alpha: 0.9, area: [0, 90, W, 130], seed: 5 });
      parts(t, 5, { type: 'leaf', rgb: '120,150,80', vx: 18, vy: 20, wob: 2, wa: 8, size: 2, alpha: 0.8, seed: 6 });
      tufts(sc, '#14301c', '#1f4a2a', 1.3, H, 22, 14, 7);
      grade('#3a8a7a', 0.25); vignette(0.38);
    },
  };
  // 2 Knochengruft
  ENV[2] = {
    back(t, sc) {
      skyFill(['#0d0a1c', '#251d40', '#4a3a66']); stars(t, 60, 140, 0.9); moon(388, 54, 17, t, '#ece6ff', '220,210,255');
      clouds(t, 3, 30, 80, 'rgba(70,60,100,.7)', 'rgba(40,34,62,.7)', 0.8, 3, 4);
      const ruin = (x, k, base, col) => { ctx.fillStyle = col; const w = 30 + hash(k) * 30, h = 40 + hash(k * 2) * 50;
        ctx.fillRect(x, base - h, w, h); for (let i = 0; i < w; i += 8) if (hash(k + i) < 0.7) ctx.fillRect(x + i, base - h - 5, 5, 5);
        if (hash(k * 3) < 0.5) { ctx.fillRect(x + w * 0.4, base - h - 22, 10, 22); ctx.beginPath(); ctx.moveTo(x + w * 0.4 - 2, base - h - 22); ctx.lineTo(x + w * 0.4 + 5, base - h - 38); ctx.lineTo(x + w * 0.4 + 12, base - h - 22); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,220,140,.5)'; if (hash(k * 5) < 0.4) ctx.fillRect(x + w * 0.3, base - h * 0.6, 3, 5); };
      each(sc, 0.1, 70, (x, k) => ruin(x, k, 180, '#231c38'), 0.35, 41);
      fog(t, 175, 30, '120,100,170', 0.3, 3, 5, 3);
      const hy = ridge(sc, 0.3, 200, 18, 0.016, '#2c2440', { seed: 5 });
      each(sc, 0.3, 60, (x, k) => deadTree(x, hy(x) + 3, 0.9 + hash(k) * 0.4, '#1c1630'), 0.5, 42);
      groundBase('#3f3654', '#2c2540', '#16121f', '#4a4062', sc, { speck: 'rgba(0,0,0,.3)', hi: 'rgba(200,180,255,.1)' });
      tiles(sc, 'rgba(0,0,0,.22)', 9, 26);
    },
    props(t, sc) {
      each(sc, 1, 54, (x, k) => { const r = hash(k * 6); if (r < 0.45) tomb(x, GROUND + 2, 0.9 + hash(k) * 0.3, '#6a6284', hash(k) < 0.4 ? 0 : 1); else if (r < 0.65) bones(x, GROUND + 3, 1); else if (r < 0.85) { candle(x, GROUND + 2, t, k); candle(x + 5, GROUND + 3, t, k + 1, 0.8); } else deadTree(x, GROUND, 1.2, '#2a2240'); }, 0.25, 43);
    },
    front(t, sc) {
      parts(t, 8, { type: 'glow', rgb: '190,150,255', vx: 4, vy: -6, wob: 1, wa: 14, size: 2, tw: 1.4, alpha: 0.8, area: [0, 120, W, 100], seed: 7 });
      fog(t, GROUND + 4, 18, '150,130,200', 0.28, 7, 7, 4);
      grade('#5a3a9a', 0.25); vignette(0.42);
    },
  };
  // 3 Glutberge
  ENV[3] = {
    back(t, sc) {
      skyFill(['#1f0606', '#6a1c10', '#d8622e']); disc(110, 80, 22, 'rgba(255,190,120,.9)', '255,120,60', 0.45);
      clouds(t, 4, 20, 70, 'rgba(60,24,22,.75)', 'rgba(30,12,10,.75)', 0.85, 3, 8, 1.3);
      const vol = (x, k) => { const b = 176, h = 72 + hash(k) * 30, w = 70 + hash(k * 2) * 30;
        ctx.fillStyle = '#3e1410'; ctx.beginPath(); ctx.moveTo(x - w, b); ctx.lineTo(x - 10, b - h); ctx.lineTo(x + 10, b - h); ctx.lineTo(x + w, b); ctx.closePath(); ctx.fill();
        glowDot(x, b - h, 26, '255,120,40', 0.55); ctx.strokeStyle = 'rgba(255,140,50,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, b - h); ctx.quadraticCurveTo(x - 12, b - h * 0.6, x - 20, b - 6); ctx.stroke(); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 5, b - h); ctx.quadraticCurveTo(x + 10, b - h * 0.5, x + 24, b - 4); ctx.stroke();
        for (let i = 0; i < 5; i++) { const p = frac(t * 0.08 + i / 5 + hash(k)), r = 8 + p * 26; ctx.fillStyle = `rgba(50,30,30,${0.5 * (1 - p)})`; ctx.beginPath(); ctx.arc(x + Math.sin(p * 4 + k) * 10 + p * 20, b - h - 8 - p * 80, r, 0, 7); ctx.fill(); } };
      each(sc, 0.08, 220, (x, k) => vol(x, k), 0.2, 51);
      const hy = ridge(sc, 0.25, 196, 34, 0.02, '#2e100c', { kind: 'peak', seed: 3 });
      ctx.strokeStyle = 'rgba(255,120,40,.55)'; ctx.lineWidth = 1.4; each(sc, 0.25, 90, (x, k) => { ctx.beginPath(); ctx.moveTo(x, hy(x) + 4); ctx.quadraticCurveTo(x + 8, hy(x) + 20, x + 4, 206); ctx.stroke(); }, 0.4, 52);
      ridge(sc, 0.45, 212, 12, 0.03, '#22100c', { seed: 6 });
      groundBase('#3a2420', '#24140f', '#110806', '#4a2a20', sc, { speck: 'rgba(0,0,0,.35)', hi: 'rgba(255,140,80,.15)' });
      each(sc, 1, 46, (x, k) => { const a = 0.45 + 0.35 * Math.sin(t * 2.4 + k); ctx.strokeStyle = `rgba(255,${120 + 40 * a | 0},40,${a})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, GROUND + 6 + hash(k) * 10); ctx.lineTo(x + 8, GROUND + 12 + hash(k) * 12); ctx.lineTo(x + 5, GROUND + 22 + hash(k) * 14); ctx.lineTo(x + 14, GROUND + 30 + hash(k) * 10); ctx.stroke(); }, 0.3, 53);
    },
    props(t, sc) {
      each(sc, 1, 80, (x, k) => { const r = hash(k * 4);
        if (r < 0.4) { const a = 0.6 + 0.3 * Math.sin(t * 3 + k); ctx.fillStyle = vg([`rgba(255,220,120,${a})`, `rgba(255,90,30,${a})`], GROUND, GROUND + 8); ctx.beginPath(); ctx.ellipse(x, GROUND + 5, 22, 5, 0, 0, 7); ctx.fill(); lightPool(x, GROUND, 40, '255,110,40', 0.25); }
        else if (r < 0.75) { ctx.fillStyle = '#1a0c0a'; ctx.beginPath(); ctx.moveTo(x - 9, GROUND + 2); ctx.lineTo(x - 4, GROUND - 22); ctx.lineTo(x + 1, GROUND - 12); ctx.lineTo(x + 4, GROUND - 28); ctx.lineTo(x + 10, GROUND + 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,120,60,.35)'; ctx.fillRect(x + 3, GROUND - 24, 1, 20); }
        else deadTree(x, GROUND + 1, 1, '#1a0c0a'); }, 0.35, 54);
    },
    front(t, sc) {
      parts(t, 22, { type: 'ember', rgb: '255,140,60', vx: 8, vy: -26, wob: 2, wa: 8, size: 1.6, alpha: 0.9, seed: 9 });
      parts(t, 10, { type: 'dot', rgb: '90,80,80', vx: 6, vy: 10, size: 1.4, alpha: 0.5, seed: 10 });
      ctx.fillStyle = vg(['rgba(255,90,30,0)', 'rgba(255,90,30,.18)'], 150, H); ctx.fillRect(0, 150, W, H);
      grade('#ff6a2a', 0.28); vignette(0.4, '30,0,0');
    },
  };
  // 4 Frostgipfel
  ENV[4] = {
    back(t, sc) {
      skyFill(['#6a9ad2', '#bcd8f2', '#f2f8ff']); disc(380, 64, 14, '#ffffff', '255,255,255', 0.5);
      clouds(t, 3, 30, 80, '#ffffff', '#dbe8f5', 0.8, 6, 2);
      ridge(sc, 0.05, 168, 96, 0.007, '#8aa8c8', { kind: 'peak', snow: '#f4f9ff', snowAt: 0.45, seed: 7, shade: 'rgba(60,90,130,.25)' });
      ctx.fillStyle = vg(['rgba(240,248,255,0)', 'rgba(240,248,255,.6)'], 120, 180); ctx.fillRect(0, 120, W, 60);
      const hy = ridge(sc, 0.2, 196, 40, 0.012, '#c8dbec', { kind: 'peak', snow: '#f6fbff', snowAt: 0.3, seed: 2 });
      each(sc, 0.2, 22, (x, k) => pine(x, hy(x) + 6, 0.5 + hash(k) * 0.2, ['#5f8096', '#4f6e84', '#45627a'], '#f4f9ff'), 0.45, 61);
      ridge(sc, 0.45, 212, 12, 0.02, '#dfeaf5', { seed: 4 });
      groundBase('#f2f8ff', '#d4e3f0', '#a8bfd4', '#ffffff', sc, { speck: 'rgba(90,130,170,.18)', hi: 'rgba(255,255,255,.8)' });
      each(sc, 1, 60, (x, k) => { ctx.fillStyle = 'rgba(150,190,230,.35)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 18 + hash(k) * 16, 26, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 10, GROUND + 17 + hash(k) * 16, 8, 1); }, 0.4, 62);
    },
    props(t, sc) {
      each(sc, 0.85, 100, (x, k) => pine(x, GROUND, 1.1 + hash(k) * 0.4, ['#2f5a4a', '#1f4436', '#16342a'], '#f4f9ff'), 0.4, 63);
      each(sc, 1, 70, (x, k) => (hash(k * 3) < 0.6 ? crystal(x, GROUND + 2, 0.8, '#e6f8ff', '#9fd4f2', '170,225,255', t, k) : rock(x, GROUND + 2, 0.9, '#d8e6f2', '#9fb4c8', 'rgba(255,255,255,.7)')), 0.4, 64);
    },
    front(t, sc) {
      parts(t, 34, { type: 'flake', rgb: '255,255,255', vx: 14, vy: 26, wob: 1.6, wa: 6, size: 2.2, alpha: 0.9, seed: 11 });
      parts(t, 5, { type: 'streak', rgb: '255,255,255', vx: 160, vy: 4, size: 1, alpha: 0.3, area: [0, 60, W, 150], seed: 12 });
      grade('#9fd0ff', 0.22); vignette(0.15, '30,60,100');
    },
  };
  // 5 Nebelmoor
  ENV[5] = {
    back(t, sc) {
      skyFill(['#28342f', '#4e5e54', '#7e8c80']); disc(330, 76, 13, 'rgba(230,236,220,.55)', '220,230,210', 0.25);
      clouds(t, 4, 20, 80, 'rgba(110,124,114,.8)', 'rgba(70,84,76,.8)', 0.8, 4, 6, 1.4);
      const hy = ridge(sc, 0.1, 178, 22, 0.01, '#4a5a50', { seed: 3 });
      each(sc, 0.1, 50, (x, k) => deadTree(x, hy(x) + 3, 0.7 + hash(k) * 0.3, '#3f4d44'), 0.4, 71);
      fog(t, 172, 40, '190,205,190', 0.45, 5, 7, 5);
      const h2 = ridge(sc, 0.3, 200, 14, 0.02, '#3a473e', { seed: 1 });
      each(sc, 0.3, 30, (x, k) => reeds(x, h2(x) + 3, 0.7, '#2c3a30', '#3a2c20', k), 0.4, 72);
      fog(t, 200, 30, '190,205,190', 0.4, 7, 7, 6);
      groundBase('#40463a', '#2e3228', '#171912', '#4d5a44', sc, { speck: 'rgba(0,0,0,.3)' });
      each(sc, 1, 90, (x, k) => { const y = GROUND + 14 + hash(k) * 16; ctx.fillStyle = vg(['rgba(160,180,170,.55)', 'rgba(80,100,95,.6)'], y - 4, y + 4); ctx.beginPath(); ctx.ellipse(x, y, 30, 5, 0, 0, 7); ctx.fill();
        const r = frac(t * 0.4 + hash(k)) * 12; ctx.strokeStyle = `rgba(220,235,225,${0.4 * (1 - r / 12)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x + 6, y, r, r * 0.25, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = '#4f7a3c'; ctx.beginPath(); ctx.ellipse(x - 12, y + 1, 4, 1.4, 0, 0, 7); ctx.fill(); }, 0.35, 73);
    },
    props(t, sc) {
      each(sc, 1, 70, (x, k) => { const r = hash(k * 7); if (r < 0.4) deadTree(x, GROUND + 1, 1.2, '#2c3329', 'rgba(110,140,90,.85)'); else if (r < 0.75) reeds(x, GROUND + 2, 1, '#3d5236', '#5a3c22', k); else lantern(x, GROUND + 1, 1, t, k, '170,230,255'); }, 0.25, 74);
    },
    front(t, sc) {
      parts(t, 26, { type: 'rain', rgb: '200,215,230', vx: -30, vy: 300, size: 1, alpha: 0.35, seed: 13 });
      parts(t, 6, { type: 'glow', rgb: '120,210,255', vx: 5, vy: -3, wob: 1.2, wa: 18, size: 2.2, tw: 1.2, alpha: 0.85, area: [0, 130, W, 80], seed: 14 });
      fog(t, GROUND - 4, 26, '200,214,200', 0.32, 9, 7, 8);
      grade('#6a8a70', 0.3); vignette(0.35);
    },
  };
  // 6 Dornendickicht
  ENV[6] = {
    back(t, sc) {
      skyFill(['#e8a95e', '#efd79a', '#d9e8b0']); disc(120, 84, 18, '#fff3c8', '255,220,140', 0.55);
      clouds(t, 3, 30, 80, 'rgba(255,240,210,.9)', 'rgba(230,190,150,.8)', 0.85, 5, 9);
      ridge(sc, 0.08, 172, 30, 0.01, '#a7b77a', { seed: 5 });
      const vine = (x, k, base, col, s) => { ctx.strokeStyle = col; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, base);
        let px = x, py = base; for (let i = 0; i < 4; i++) { const nx = px + (hash(k + i) - 0.4) * 30 * s, ny = py - (14 + hash(k * 2 + i) * 12) * s; ctx.quadraticCurveTo(px + 14 * s * (i % 2 ? 1 : -1), (py + ny) / 2, nx, ny); px = nx; py = ny; } ctx.stroke();
        ctx.beginPath(); ctx.arc(px + 6 * s, py, 6 * s, Math.PI, Math.PI * 2.6); ctx.stroke(); };
      each(sc, 0.25, 40, (x, k) => vine(x, k, 205, '#5a6a38', 0.9), 0.2, 81);
      ridge(sc, 0.25, 200, 16, 0.025, '#5e6e3a', { seed: 2 });
      ridge(sc, 0.45, 212, 10, 0.035, '#4a5a2c', { seed: 7 });
      groundBase('#7d9a45', '#6b5a36', '#3c311d', '#8fae52', sc, { speck: 'rgba(60,40,20,.28)' });
      each(sc, 1, 18, (x, k) => { ctx.fillStyle = ['#c46a2a', '#d99a3a', '#8a4a20'][k % 3]; ctx.beginPath(); ctx.ellipse(x, GROUND + 6 + hash(k) * 30, 2.2, 1, hash(k) * 3, 0, 7); ctx.fill(); }, 0.4, 82);
    },
    props(t, sc) {
      each(sc, 1, 60, (x, k) => { const r = hash(k * 3);
        if (r < 0.55) { bush(x, GROUND + 2, 1.1, ['#5e7a34', '#3e5a24'], '#d62a3a'); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const bx = x - 12 + i * 10; ctx.beginPath(); ctx.moveTo(bx, GROUND); ctx.quadraticCurveTo(bx - 6, GROUND - 16, bx + 4, GROUND - 22); ctx.stroke(); for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(bx - 2 + j, GROUND - j * 6); ctx.lineTo(bx - 5 + j, GROUND - j * 6 - 2); ctx.stroke(); } } }
        else if (r < 0.8) { for (let i = 0; i < 3; i++) { const fx = x + i * 7 - 7, fy = GROUND - 6 - hash(k + i) * 8; ctx.strokeStyle = '#3e5a24'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, GROUND); ctx.lineTo(fx, fy); ctx.stroke(); ctx.fillStyle = '#e04a6a'; ctx.beginPath(); ctx.arc(fx, fy, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#ff8aa8'; ctx.beginPath(); ctx.arc(fx - 0.8, fy - 0.8, 1.4, 0, 7); ctx.fill(); } }
        else rock(x, GROUND + 2, 0.9, '#a49a7a', '#7a705a'); }, 0.2, 83);
    },
    front(t, sc) {
      parts(t, 8, { type: 'leaf', rgb: '210,120,50', vx: 20, vy: 22, wob: 2, wa: 10, size: 2.2, alpha: 0.9, seed: 15 });
      parts(t, 14, { type: 'glow', rgb: '255,240,180', vx: 4, vy: -2, wob: 1, wa: 10, size: 1, tw: 2, alpha: 0.6, seed: 16 });
      tufts(sc, '#4a5a2c', '#6a7a3a', 1.3, H, 24, 12, 9);
      grade('#ffcf7a', 0.25); vignette(0.2);
    },
  };
  // 7 Schattenkrypta
  ENV[7] = {
    back(t, sc) {
      skyFill(['#05040c', '#120f28', '#271f48']); stars(t, 40, 110, 0.7, 3); moon(90, 50, 12, t, '#ffb0a0', '255,120,110');
      const cath = (x, k) => { const b = 190, w = 60 + hash(k) * 30, h = 70 + hash(k * 2) * 30; ctx.fillStyle = '#1b1638';
        ctx.fillRect(x, b - h, w, h); for (const sx of [x - 4, x + w - 8]) { ctx.fillRect(sx, b - h - 30, 12, h + 30); ctx.beginPath(); ctx.moveTo(sx - 2, b - h - 30); ctx.lineTo(sx + 6, b - h - 62); ctx.lineTo(sx + 14, b - h - 30); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(x + 4, b - h); ctx.lineTo(x + w / 2, b - h - 26); ctx.lineTo(x + w - 4, b - h); ctx.fill();
        const cx = x + w / 2, cy = b - h + 16, g = 0.6 + 0.3 * Math.sin(t * 1.3 + k); ctx.fillStyle = `rgba(255,170,90,${g})`; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#1b1638'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke();
        for (let i = 0; i < 3; i++) { const wx = x + 12 + i * (w - 24) / 2, wy = b - h + 34; if (wy > b - 14) break; ctx.fillStyle = [`rgba(220,70,90,${g * 0.8})`, `rgba(90,130,255,${g * 0.8})`, `rgba(170,90,230,${g * 0.8})`][i]; ctx.beginPath(); ctx.moveTo(wx - 3, wy + 14); ctx.lineTo(wx - 3, wy + 3); ctx.arc(wx, wy + 3, 3, Math.PI, 0); ctx.lineTo(wx + 3, wy + 14); ctx.fill(); ctx.fillStyle = '#1b1638'; ctx.fillRect(wx - 0.5, wy, 1, 14); } };
      each(sc, 0.1, 150, (x, k) => cath(x, k), 0.2, 91);
      fog(t, 185, 30, '80,70,140', 0.35, 3, 6, 9);
      const h2 = ridge(sc, 0.35, 206, 6, 0.02, '#1a1530', { seed: 3 });
      each(sc, 0.35, 12, (x) => { ctx.fillStyle = '#1a1530'; ctx.fillRect(x, 190, 1.6, 18); ctx.beginPath(); ctx.moveTo(x - 1, 190); ctx.lineTo(x + 0.8, 186); ctx.lineTo(x + 2.6, 190); ctx.fill(); }, 0, 92);
      ctx.fillStyle = '#1a1530'; ctx.fillRect(0, 196, W, 2);
      groundBase('#2c2640', '#1a1628', '#0b0912', '#3a3254', sc, { speck: 'rgba(0,0,0,.35)', hi: 'rgba(160,140,255,.1)' });
      tiles(sc, 'rgba(0,0,0,.35)', 8, 24);
    },
    props(t, sc) {
      each(sc, 1, 66, (x, k) => { const r = hash(k * 5);
        if (r < 0.4) { ctx.fillStyle = '#2a2236'; ctx.fillRect(x - 1, GROUND - 26, 2, 26); ctx.fillRect(x - 9, GROUND - 22, 18, 2); for (const cx of [x - 8, x, x + 8]) candle(cx, GROUND - 22, t, k + cx, 0.8); lightPool(x, GROUND - 30, 40, '255,170,80', 0.22); }
        else if (r < 0.7) { ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.moveTo(x - 12, GROUND + 1); ctx.lineTo(x - 9, GROUND - 8); ctx.lineTo(x + 9, GROUND - 8); ctx.lineTo(x + 12, GROUND + 1); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#4a3848'; ctx.fillRect(x - 9, GROUND - 10, 18, 3); ctx.fillStyle = 'rgba(200,180,120,.5)'; ctx.fillRect(x - 1, GROUND - 7, 2, 6); ctx.fillRect(x - 3, GROUND - 5, 6, 1.5); }
        else { ctx.fillStyle = '#2c2840'; ctx.fillRect(x - 6, GROUND - 10, 12, 10); ctx.beginPath(); ctx.moveTo(x - 6, GROUND - 10); ctx.lineTo(x - 4, GROUND - 22); ctx.lineTo(x, GROUND - 26); ctx.lineTo(x + 4, GROUND - 22); ctx.lineTo(x + 6, GROUND - 10); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 4, GROUND - 20); ctx.lineTo(x - 12, GROUND - 24); ctx.lineTo(x - 5, GROUND - 16); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 4, GROUND - 20); ctx.lineTo(x + 12, GROUND - 24); ctx.lineTo(x + 5, GROUND - 16); ctx.fill(); ctx.fillStyle = 'rgba(255,60,60,.8)'; ctx.fillRect(x - 2, GROUND - 22, 1.2, 1.2); ctx.fillRect(x + 1, GROUND - 22, 1.2, 1.2); } }, 0.25, 93);
    },
    front(t, sc) {
      for (let i = 0; i < 4; i++) { const x = frac(hash(i * 3) + t * 0.05 * (1 + i * 0.3)) * (W + 40) - 20, y = 50 + hash(i) * 70 + Math.sin(t * 2 + i) * 10, f = Math.sin(t * 16 + i);
        ctx.fillStyle = '#05040c'; ctx.beginPath(); ctx.ellipse(x, y, 2, 1.6, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 4, y - 5 * f, x - 8, y - 1 * f); ctx.quadraticCurveTo(x - 4, y + 1, x, y); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 5 * f, x + 8, y - 1 * f); ctx.quadraticCurveTo(x + 4, y + 1, x, y); ctx.fill(); }
      fog(t, GROUND, 20, '90,80,150', 0.3, 6, 7, 10);
      grade('#3a2a8a', 0.3); vignette(0.5);
    },
  };
  // 8 Aschewüste
  ENV[8] = {
    back(t, sc) {
      skyFill(['#5a4844', '#a7806a', '#e0c098']); disc(330, 74, 26, 'rgba(255,236,200,.85)', '255,220,170', 0.4);
      ridge(sc, 0.06, 182, 60, 0.012, '#9a6e58', { kind: 'mesa', seed: 4, shade: 'rgba(80,40,30,.25)' });
      ctx.fillStyle = vg(['rgba(230,200,160,0)', 'rgba(230,200,160,.5)'], 130, 190); ctx.fillRect(0, 130, W, 60);
      ridge(sc, 0.2, 200, 22, 0.012, '#b88c64', { kind: 'dune', seed: 2, rim: 'rgba(255,230,190,.5)' });
      ridge(sc, 0.4, 214, 14, 0.018, '#9a7250', { kind: 'dune', seed: 6, rim: 'rgba(255,220,180,.4)' });
      groundBase('#b08860', '#8a6644', '#4e3824', '#c49a6c', sc, { speck: 'rgba(80,50,30,.22)', hi: 'rgba(255,230,190,.25)' });
      ctx.strokeStyle = 'rgba(90,60,40,.25)'; ctx.lineWidth = 1; for (let r = 0; r < 5; r++) { const y = GROUND + 9 + r * 8; ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin((x + sc * (1 + r * 0.05)) * 0.08 + r) * 1.8); ctx.stroke(); }
    },
    props(t, sc) {
      each(sc, 1, 76, (x, k) => { const r = hash(k * 3);
        if (r < 0.35) { ctx.fillStyle = '#6a5a3a'; ctx.fillRect(x - 2.5, GROUND - 30, 5, 30); ctx.fillRect(x - 11, GROUND - 22, 8, 3.6); ctx.fillRect(x - 11, GROUND - 30, 3.6, 10); ctx.fillRect(x + 3, GROUND - 16, 8, 3.6); ctx.fillRect(x + 7.4, GROUND - 24, 3.6, 10); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + 1, GROUND - 30, 1.5, 30); }
        else if (r < 0.65) { ribcage(x, GROUND + 2, 0.55, '#e8dcc4'); bones(x + 18, GROUND + 3, 1.1, '#efe4cc'); }
        else rock(x, GROUND + 2, 1.2, '#b89a7a', '#8a6a4e', 'rgba(255,230,200,.3)'); }, 0.25, 101);
    },
    front(t, sc) {
      parts(t, 26, { type: 'dot', rgb: '230,200,160', vx: 90, vy: 6, wob: 2, wa: 4, size: 1.3, alpha: 0.5, seed: 17 });
      parts(t, 6, { type: 'streak', rgb: '255,235,200', vx: 200, vy: 2, size: 1, alpha: 0.25, area: [0, 120, W, 100], seed: 18 });
      parts(t, 10, { type: 'dot', rgb: '120,110,110', vx: 10, vy: 14, size: 1.2, alpha: 0.5, seed: 19 });
      grade('#e8a870', 0.3); vignette(0.22, '60,30,10');
    },
  };
  // 9 Eisgrotten (Höhle)
  ENV[9] = {
    back(t, sc) {
      skyFill(['#040d18', '#0b2338', '#14405a']);
      each(sc, 0.08, 46, (x, k) => { const a = 0.35 + 0.25 * Math.sin(t * 1.3 + k); const y = 70 + hash(k) * 100, c = hash(k * 3) < 0.6 ? '80,200,255' : '170,120,255'; glowDot(x, y, 30 + hash(k * 2) * 30, c, a * 0.45); ctx.fillStyle = `rgba(${c},${0.5 + a * 0.5})`; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x + (i - 1) * 4, y + 4); ctx.rotate((i - 1) * 0.4); ctx.beginPath(); ctx.moveTo(-1.6, 0); ctx.lineTo(0, -7 - i % 2 * 3); ctx.lineTo(1.6, 0); ctx.fill(); ctx.restore(); } }, 0.2, 111);
      ctx.fillStyle = '#0a1c2c'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 6) { const wx = x + sc * 0.3; ctx.lineTo(x, 26 + Math.sin(wx * 0.03) * 8 + Math.abs(Math.sin(wx * 0.11)) * 14); } ctx.lineTo(W, 0); ctx.fill();
      each(sc, 0.3, 26, (x, k) => { const L = 18 + hash(k) * 36; ctx.fillStyle = '#0d2234'; ctx.beginPath(); ctx.moveTo(x - 7, 20); ctx.lineTo(x, 20 + L); ctx.lineTo(x + 7, 20); ctx.fill(); ctx.fillStyle = 'rgba(170,230,255,.5)'; ctx.beginPath(); ctx.moveTo(x - 1, 20 + L * 0.5); ctx.lineTo(x, 20 + L); ctx.lineTo(x + 1.6, 20 + L * 0.5); ctx.fill(); }, 0.2, 112);
      const hy = ridge(sc, 0.25, 196, 40, 0.02, '#123048', { kind: 'peak', seed: 3, shade: 'rgba(0,10,25,.35)' });
      each(sc, 0.25, 70, (x, k) => crystal(x, hy(x) + 6, 0.7, '#c8f4ff', '#4fb8e8', '90,210,255', t, k), 0.4, 113);
      ridge(sc, 0.45, 212, 10, 0.03, '#0e263a', { seed: 5 });
      groundBase('#5a9ab8', '#2c5a78', '#0e2232', '#8fd0ea', sc, { speck: 'rgba(0,20,40,.3)', hi: 'rgba(220,250,255,.35)' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg(['rgba(120,220,255,.18)', 'rgba(120,220,255,0)'], GROUND, GROUND + 20); ctx.fillRect(0, GROUND, W, 20); ctx.restore();
      ctx.strokeStyle = 'rgba(200,240,255,.25)'; ctx.lineWidth = 0.8; each(sc, 1, 40, (x, k) => { ctx.beginPath(); ctx.moveTo(x, GROUND + 6 + hash(k) * 10); ctx.lineTo(x + 10, GROUND + 14 + hash(k) * 10); ctx.lineTo(x + 6, GROUND + 26 + hash(k) * 10); ctx.stroke(); }, 0.4, 114);
    },
    props(t, sc) {
      each(sc, 1, 58, (x, k) => { const r = hash(k * 4); if (r < 0.65) crystal(x, GROUND + 2, 1 + hash(k) * 0.3, r < 0.3 ? '#e8d4ff' : '#d4f6ff', r < 0.3 ? '#9a6ae8' : '#4fb8e8', r < 0.3 ? '170,120,255' : '90,210,255', t, k);
        else { ctx.fillStyle = '#9fd8f2'; ctx.beginPath(); ctx.moveTo(x - 6, GROUND + 1); ctx.lineTo(x - 1, GROUND - 26); ctx.lineTo(x + 6, GROUND + 1); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - 2, GROUND - 18, 1.2, 16); } }, 0.3, 115);
    },
    front(t, sc) {
      parts(t, 20, { type: 'glow', rgb: '140,230,255', vx: 3, vy: -6, wob: 1, wa: 10, size: 1.2, tw: 2, alpha: 0.8, seed: 20 });
      parts(t, 10, { type: 'flake', rgb: '220,245,255', vx: 4, vy: 12, size: 1.2, alpha: 0.6, seed: 21 });
      grade('#3ab0ff', 0.28); vignette(0.5, '0,10,30');
    },
  };
  // 10 Sternenfeld
  ENV[10] = {
    back(t, sc) {
      skyFill(['#06051a', '#17124a', '#3a2a74']);
      for (const [x, y, r, c] of [[120, 60, 90, '255,110,200'], [330, 90, 110, '90,140,255'], [230, 40, 70, '170,100,255']]) glowDot(x, y, r, c, 0.22);
      ctx.save(); ctx.translate(W / 2, 60); ctx.rotate(-0.3); ctx.fillStyle = RG(0, 0, 260, 'rgba(255,255,255,.12)', 'rgba(255,255,255,0)'); ctx.scale(1, 0.12); ctx.beginPath(); ctx.arc(0, 0, 260, 0, 7); ctx.fill(); ctx.restore();
      stars(t, 120, 190, 1, 7);
      const sh = frac(t * 0.13); if (sh < 0.15) { const p = sh / 0.15, x = 420 - p * 200, y = 20 + p * 60; ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26, y - 8); ctx.stroke(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 2; i++) { ctx.fillStyle = vg([`rgba(${i ? '120,255,200' : '180,120,255'},0)`, `rgba(${i ? '120,255,200' : '180,120,255'},.16)`, 'rgba(0,0,0,0)'], 40 + i * 20, 130); ctx.beginPath(); ctx.moveTo(0, 60 + i * 20); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, 50 + i * 20 + Math.sin(x * 0.02 + t * 0.4 + i) * 16); ctx.lineTo(W, 140); ctx.lineTo(0, 140); ctx.fill(); } ctx.restore();
      each(sc, 0.12, 130, (x, k) => { const y = 110 + hash(k) * 40 + Math.sin(t * 0.8 + k) * 4, w = 20 + hash(k * 2) * 18; ctx.fillStyle = '#2a2058'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - 8, x + w, y); ctx.lineTo(x + w * 0.4, y + 10); ctx.lineTo(x, y + 18); ctx.lineTo(x - w * 0.5, y + 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#4a3a8a'; ctx.fillRect(x - w, y - 1, w * 2, 2); }, 0.3, 121);
      ridge(sc, 0.25, 202, 22, 0.015, '#251d56', { seed: 3, rim: 'rgba(200,170,255,.3)' });
      groundBase('#3d2f7a', '#251c52', '#100c28', '#5a46a8', sc, { speck: 'rgba(0,0,0,.3)', hi: 'rgba(200,180,255,.2)' });
      each(sc, 1, 20, (x, k) => { const y = GROUND + 6 + hash(k) * 30, a = 0.5 + 0.5 * Math.sin(t * 2 + k); glowDot(x, y, 5, '200,180,255', a * 0.6); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }, 0.4, 122);
    },
    props(t, sc) {
      each(sc, 1, 70, (x, k) => { if (hash(k * 2) < 0.4) obelisk(x, GROUND + 1, 0.9, '#2a2260', '150,200,255', t, k);
        else for (let i = 0; i < 3; i++) { const fx = x + i * 8 - 8, fy = GROUND - 5 - hash(k + i) * 6; ctx.strokeStyle = '#4a3a8a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, GROUND); ctx.lineTo(fx, fy); ctx.stroke(); glowDot(fx, fy, 8, '255,220,140', 0.4 + 0.2 * Math.sin(t * 3 + k + i)); ctx.fillStyle = '#fff3b0'; for (let p = 0; p < 5; p++) { const a = p * 1.257 + t * 0.5; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 1.8, fy + Math.sin(a) * 1.8, 1, 0, 7); ctx.fill(); } } }, 0.3, 123);
    },
    front(t, sc) {
      parts(t, 20, { type: 'glow', rgb: '210,190,255', vx: 2, vy: -10, wob: 1, wa: 8, size: 1.1, tw: 2.5, alpha: 0.9, seed: 22 });
      grade('#7a5aff', 0.22); vignette(0.4, '5,0,20');
    },
  };
  // 11 Uralter Hain
  ENV[11] = {
    back(t, sc) {
      skyFill(['#b8d890', '#e4f0b8', '#fff6d0']);
      each(sc, 0.1, 48, (x, k) => { const w = 10 + hash(k) * 10; ctx.fillStyle = '#9ab07a'; ctx.fillRect(x - w / 2, 40, w, 160); ctx.fillStyle = '#8aa06a'; ctx.beginPath(); ctx.arc(x, 40, 36 + hash(k) * 20, 0, 7); ctx.fill(); }, 0, 131);
      sunRays(t, 160, '255,250,200', 0.12, 5, 60, -60);
      each(sc, 0.25, 90, (x, k) => { const w = 22 + hash(k) * 16; ctx.fillStyle = '#5e6e3e'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 10, 206); ctx.quadraticCurveTo(x - w / 2, 190, x - w / 2, 120); ctx.lineTo(x - w / 2, 0); ctx.lineTo(x + w / 2, 0); ctx.lineTo(x + w / 2, 120); ctx.quadraticCurveTo(x + w / 2, 190, x + w / 2 + 12, 206); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,220,.12)'; ctx.fillRect(x + w / 2 - 5, 0, 4, 190); }, 0.2, 132);
      ctx.fillStyle = '#4e6a32'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 8) { const wx = x + sc * 0.3; ctx.lineTo(x, 24 + Math.sin(wx * 0.04) * 10 + Math.sin(wx * 0.13) * 6); } ctx.lineTo(W, 0); ctx.fill();
      ctx.fillStyle = '#3e5626'; each(sc, 0.3, 18, (x, k) => { ctx.beginPath(); ctx.arc(x, 20 + hash(k) * 16, 10 + hash(k * 2) * 8, 0, 7); ctx.fill(); }, 0.2, 133);
      ridge(sc, 0.45, 210, 10, 0.03, '#3e5a28', { seed: 4 });
      groundBase('#5a8a3a', '#3e5a26', '#1e2c12', '#6aa046', sc, { speck: 'rgba(30,40,10,.3)' });
      ctx.strokeStyle = '#4a3a22'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; each(sc, 1, 90, (x, k) => { ctx.beginPath(); ctx.moveTo(x, GROUND + 2); ctx.quadraticCurveTo(x + 20, GROUND + 12 + hash(k) * 10, x + 46, GROUND + 6 + hash(k) * 8); ctx.stroke(); }, 0.4, 134);
    },
    props(t, sc) {
      each(sc, 0.85, 160, (x, k) => { const w = 26; ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.moveTo(x - w - 14, GROUND); ctx.quadraticCurveTo(x - w, GROUND - 10, x - w * 0.6, GROUND - 60); ctx.lineTo(x - w * 0.6, -10); ctx.lineTo(x + w * 0.6, -10); ctx.lineTo(x + w * 0.6, GROUND - 60); ctx.quadraticCurveTo(x + w, GROUND - 10, x + w + 16, GROUND); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,170,70,.6)'; ctx.beginPath(); ctx.ellipse(x - 8, GROUND - 40, 8, 14, 0.2, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,220,.1)'; ctx.fillRect(x + w * 0.6 - 5, -10, 4, GROUND - 40);
        ctx.strokeStyle = 'rgba(40,30,20,.5)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 10 + i * 5, 0); ctx.lineTo(x - 12 + i * 5 + Math.sin(i) * 2, GROUND - 40); ctx.stroke(); } }, 0.45, 135);
      each(sc, 1, 54, (x, k) => { const r = hash(k * 3); if (r < 0.45) { for (let i = 0; i < 3; i++) mushroom(x + i * 6, GROUND + 2, 0.8 + hash(k + i) * 0.4, '#5ad0c8', '120,255,230', t, k + i); }
        else if (r < 0.75) { ctx.fillStyle = '#7a7a6a'; rr(x - 7, GROUND - 28, 14, 28, 4); ctx.fill(); ctx.fillStyle = 'rgba(90,140,60,.7)'; ctx.beginPath(); ctx.ellipse(x - 3, GROUND - 26, 6, 3, 0, 0, 7); ctx.fill(); const a = 0.5 + 0.5 * Math.sin(t * 2 + k); ctx.fillStyle = `rgba(140,255,200,${a})`; ctx.fillRect(x - 1, GROUND - 20, 2, 8); ctx.fillRect(x - 3, GROUND - 16, 6, 1.4); glowDot(x, GROUND - 16, 12, '140,255,200', a * 0.3); }
        else bush(x, GROUND + 2, 1, ['#6aa046', '#3e6a28']); }, 0.3, 136);
    },
    front(t, sc) {
      parts(t, 24, { type: 'glow', rgb: '255,250,190', vx: 4, vy: -3, wob: 1, wa: 12, size: 1, tw: 1.6, alpha: 0.75, seed: 23 });
      tufts(sc, '#2e4a1c', '#4a6e2a', 1.3, H, 22, 13, 11);
      grade('#ffe9a0', 0.25); vignette(0.3, '20,30,0');
    },
  };
  // 12 Totenreich
  ENV[12] = {
    back(t, sc) {
      skyFill(['#081412', '#183430', '#36584c']); stars(t, 30, 100, 0.5, 9); moon(100, 56, 14, t, '#d8ffe8', '170,255,210');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg(['rgba(80,255,180,0)', 'rgba(80,255,180,.12)', 'rgba(0,0,0,0)'], 20, 120); ctx.beginPath(); ctx.moveTo(0, 40); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, 34 + Math.sin(x * 0.025 + t * 0.5) * 14); ctx.lineTo(W, 130); ctx.lineTo(0, 130); ctx.fill(); ctx.restore();
      each(sc, 0.1, 40, (x, k) => { const h = 30 + hash(k) * 50; ctx.fillStyle = '#16302a'; ctx.fillRect(x - 5, 186 - h, 10, h); if (hash(k * 2) < 0.5) ctx.fillRect(x - 8, 186 - h - 3, 16, 3); else { ctx.beginPath(); ctx.moveTo(x - 5, 186 - h); ctx.lineTo(x, 186 - h - 8); ctx.lineTo(x + 5, 186 - h); ctx.fill(); } }, 0.35, 141);
      fog(t, 178, 34, '120,220,180', 0.3, 3, 6, 11);
      const hy = ridge(sc, 0.3, 202, 14, 0.02, '#14241f', { seed: 6 });
      each(sc, 0.3, 46, (x, k) => deadTree(x, hy(x) + 3, 0.8 + hash(k) * 0.3, '#0e1a16'), 0.4, 142);
      groundBase('#3a4440', '#262e2a', '#0e1210', '#4a5650', sc, { speck: 'rgba(0,0,0,.3)', hi: 'rgba(160,255,210,.12)' });
      each(sc, 1, 50, (x, k) => { const a = 0.35 + 0.3 * Math.sin(t * 2 + k); ctx.strokeStyle = `rgba(120,255,190,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, GROUND + 8 + hash(k) * 14); ctx.lineTo(x + 7, GROUND + 14 + hash(k) * 14); ctx.lineTo(x + 3, GROUND + 22 + hash(k) * 14); ctx.stroke(); }, 0.4, 143);
    },
    props(t, sc) {
      each(sc, 1, 64, (x, k) => { const r = hash(k * 2);
        if (r < 0.35) pillar(x, GROUND + 1, 0.9, '#5a6a64', '#3a4844', true, null, hash(k * 9));
        else if (r < 0.65) { ctx.fillStyle = '#2a3430'; ctx.beginPath(); ctx.moveTo(x - 7, GROUND); ctx.lineTo(x - 4, GROUND - 16); ctx.lineTo(x + 4, GROUND - 16); ctx.lineTo(x + 7, GROUND); ctx.fill(); ctx.fillStyle = '#3a4844'; ctx.fillRect(x - 6, GROUND - 19, 12, 3); flame(x, GROUND - 19, 1, t, k, '#3ad08a', '#9affc8', '80,255,170'); }
        else { ctx.strokeStyle = '#c8d4cc'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * 2.4 - 3, GROUND + 1); ctx.lineTo(x + i * 3 - 5, GROUND - 6 - (i % 2) * 2 + Math.sin(t * 2 + k + i) * 0.8); ctx.stroke(); } ctx.fillStyle = '#c8d4cc'; ctx.beginPath(); ctx.ellipse(x, GROUND - 1, 4, 2, 0, 0, 7); ctx.fill(); } }, 0.25, 144);
    },
    front(t, sc) {
      for (let i = 0; i < 6; i++) { const p = frac(t * 0.07 + hash(i * 3)), x = hash(i * 7) * W + Math.sin(t + i) * 10, y = GROUND - p * 160, a = Math.sin(p * Math.PI) * 0.6;
        glowDot(x, y, 10, '150,255,210', a * 0.5); ctx.fillStyle = `rgba(220,255,240,${a})`; ctx.beginPath(); ctx.arc(x, y, 2.6, Math.PI, 0); ctx.lineTo(x + 2.6, y + 5); ctx.quadraticCurveTo(x, y + 9 + Math.sin(t * 4 + i) * 2, x - 2.6, y + 5); ctx.fill(); }
      fog(t, GROUND, 24, '120,220,180', 0.3, 8, 7, 12);
      grade('#3ac08a', 0.25); vignette(0.45, '0,15,10');
    },
  };
  // 13 Drachenhort
  ENV[13] = {
    back(t, sc) {
      skyFill(['#120604', '#3a160c', '#7a3416']);
      ctx.fillStyle = '#1e0c06'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 8) { const wx = x + sc * 0.15; ctx.lineTo(x, 40 + Math.sin(wx * 0.02) * 20 + Math.abs(Math.sin(wx * 0.07)) * 18); } ctx.lineTo(W, 0); ctx.fill();
      each(sc, 0.15, 30, (x, k) => { const L = 14 + hash(k) * 30; ctx.fillStyle = '#1e0c06'; ctx.beginPath(); ctx.moveTo(x - 6, 50); ctx.lineTo(x, 50 + L); ctx.lineTo(x + 6, 50); ctx.fill(); }, 0.3, 151);
      glowDot(240, 230, 260, '255,110,30', 0.25);
      each(sc, 0.18, 200, (x, k) => ribcage(x, 186, 1.6, 'rgba(70,40,30,.9)'), 0.3, 152);
      const hy = ridge(sc, 0.3, 200, 28, 0.016, '#c08a2a', { seed: 4, rim: 'rgba(255,240,170,.7)' });
      each(sc, 0.3, 16, (x, k) => { const a = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7); if (a > 0.8) { const y = hy(x) + 4 + hash(k) * 8; ctx.fillStyle = `rgba(255,255,230,${a})`; ctx.fillRect(x - 2.5, y, 6, 1); ctx.fillRect(x, y - 2.5, 1, 6); } }, 0.3, 153);
      ridge(sc, 0.45, 212, 10, 0.03, '#5a3416', { seed: 7 });
      groundBase('#5a3a1e', '#3a2412', '#160c06', '#7a5226', sc, { speck: 'rgba(0,0,0,.3)', hi: 'rgba(255,210,120,.3)' });
      each(sc, 1, 12, (x, k) => { const y = GROUND + 5 + hash(k) * 36; ctx.fillStyle = hash(k * 2) < 0.5 ? '#ffd24a' : '#e0a030'; ctx.beginPath(); ctx.ellipse(x, y, 1.8, 0.9, 0, 0, 7); ctx.fill(); }, 0.4, 154);
    },
    props(t, sc) {
      each(sc, 1, 76, (x, k) => { const r = hash(k * 2);
        if (r < 0.4) goldPile(x, GROUND + 2, 0.8 + hash(k) * 0.3, t, k);
        else if (r < 0.65) chest(x, GROUND + 1, 1, t, k);
        else if (r < 0.85) { ctx.save(); ctx.translate(x, GROUND); ctx.rotate(-0.15); ctx.fillStyle = '#b8bcc8'; ctx.fillRect(-1.2, -30, 2.4, 26); ctx.beginPath(); ctx.moveTo(-1.2, -30); ctx.lineTo(0, -34); ctx.lineTo(1.2, -30); ctx.fill(); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-5, -6, 10, 2); ctx.fillRect(-1, -4, 2, 6); ctx.restore(); }
        else bones(x, GROUND + 3, 1.3, '#d8ccb4'); }, 0.25, 155);
    },
    front(t, sc) {
      parts(t, 18, { type: 'ember', rgb: '255,160,60', vx: 6, vy: -20, wob: 2, wa: 8, size: 1.4, alpha: 0.85, seed: 24 });
      ctx.fillStyle = vg(['rgba(255,120,30,0)', 'rgba(255,120,30,.16)'], 150, H); ctx.fillRect(0, 150, W, H);
      grade('#ff9a3a', 0.28); vignette(0.45, '30,8,0');
    },
  };
  // 14 Himmelsspitze
  ENV[14] = {
    back(t, sc) {
      skyFill(['#24326e', '#6a5eb0', '#f2a878']); disc(360, 150, 22, '#fff0d0', '255,200,150', 0.55);
      each(sc, 0.04, 260, (x, k) => { ctx.fillStyle = 'rgba(70,70,110,.55)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + i * 18 - 36, 70 + Math.sin(i) * 6, 18 + (i % 2) * 8, 0, 7); ctx.fill(); }
        if (frac(t * 0.21 + hash(k)) < 0.04) { ctx.strokeStyle = 'rgba(255,255,220,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x - 6, 100); ctx.lineTo(x + 2, 104); ctx.lineTo(x - 8, 130); ctx.stroke(); } }, 0.3, 161);
      ridge(sc, 0.08, 180, 70, 0.009, '#6a6aa0', { kind: 'peak', snow: 'rgba(255,240,240,.85)', snowAt: 0.6, seed: 2 });
      clouds(t, 6, 150, 182, '#fff3ea', '#d8c8e0', 0.95, 4, 12, 1.4);
      ctx.fillStyle = vg(['rgba(255,240,230,0)', 'rgba(255,240,230,.75)'], 160, 196); ctx.fillRect(0, 160, W, 40);
      each(sc, 0.3, 80, (x, k) => pillar(x, 206, 0.9, '#d8d0e8', '#a89cc0', hash(k) < 0.4, '#e0b84a', hash(k * 9)), 0.35, 162);
      ridge(sc, 0.45, 212, 10, 0.03, '#7a7698', { seed: 5 });
      groundBase('#9a96b8', '#6a6688', '#34304a', '#b8b4d4', sc, { speck: 'rgba(0,0,0,.2)', hi: 'rgba(255,255,255,.3)' });
      each(sc, 1, 70, (x, k) => { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 4 + hash(k) * 10, 14, 2.2, 0, 0, 7); ctx.fill(); }, 0.45, 163);
    },
    props(t, sc) {
      each(sc, 1, 90, (x, k) => { if (hash(k * 2) < 0.5) { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 1, GROUND - 40, 2, 40); ctx.fillRect(x + 59, GROUND - 34, 2, 34);
          ctx.strokeStyle = 'rgba(60,50,40,.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x, GROUND - 38); ctx.quadraticCurveTo(x + 30, GROUND - 26, x + 60, GROUND - 32); ctx.stroke();
          const cols = ['#e5484d', '#ffd23f', '#3b7ad6', '#ffffff', '#5aa84e']; for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7, fx = x + u * 60, fy = GROUND - 38 + 6 * u + Math.sin(u * Math.PI) * 7 - 6 * u * u; const fl = Math.sin(t * 6 + i + k) * 1.5; ctx.fillStyle = cols[i % 5]; ctx.beginPath(); ctx.moveTo(fx - 3, fy); ctx.lineTo(fx + 3, fy); ctx.lineTo(fx + 2 + fl, fy + 7); ctx.lineTo(fx - 3 + fl, fy + 6); ctx.fill(); } }
        else rock(x, GROUND + 2, 1.1, '#c8c4dc', '#8a86a6', 'rgba(255,255,255,.5)'); }, 0.3, 164);
    },
    front(t, sc) {
      parts(t, 10, { type: 'streak', rgb: '255,255,255', vx: 220, vy: 3, size: 1, alpha: 0.35, area: [0, 40, W, 180], seed: 25 });
      parts(t, 8, { type: 'flake', rgb: '255,255,255', vx: 60, vy: 10, size: 1.4, alpha: 0.6, seed: 26 });
      grade('#ffb88a', 0.2); vignette(0.2, '20,10,40');
    },
  };
  // Lager bei Nacht
  const ENV_CAMP = {
    back(t, sc) {
      skyFill(['#0b0f24', '#1d1d42', '#3a2f55']); stars(t, 90, 170, 1, 2); moon(430, 46, 14, t);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg(['rgba(140,120,255,0)', 'rgba(140,120,255,.08)', 'rgba(0,0,0,0)'], 30, 140); ctx.fillRect(0, 30, W, 110); ctx.restore();
      ridge(0, 0, 168, 60, 0.009, '#1e1f3c', { kind: 'peak', snow: 'rgba(200,200,240,.35)', snowAt: 0.62, seed: 3 });
      each(0, 0, 14, (x, k) => pine(x, 196 + hash(k) * 4, 0.5 + hash(k) * 0.3, ['#16233a', '#121c30', '#0e1626']), 0, 171);
      ridge(0, 0, 210, 8, 0.03, '#141a26', { seed: 6 });
      groundBase('#2e3a2a', '#221c14', '#0e0b08', '#3a4a32', 0, { speck: 'rgba(0,0,0,.35)' });
    },
    props(t) {
      rock(60, GROUND + 3, 1.2, '#4a4a52', '#2e2e36'); bush(110, GROUND + 3, 1, ['#2a4030', '#1a2c20']); pine(30, GROUND, 1.3, ['#1e3a2c', '#142a20', '#0e1e16']); pine(462, GROUND, 1.1, ['#1e3a2c', '#142a20', '#0e1e16']);
      lantern(330, GROUND + 1, 1, t, 3);
    },
    front(t) {
      parts(t, 10, { type: 'glow', rgb: '210,255,140', vx: 3, vy: -3, wob: 1, wa: 12, size: 1.3, tw: 2, alpha: 0.7, area: [0, 120, W, 90], seed: 30 });
      tufts(0, '#14261a', '#1e3622', 0, H, 26, 12, 13);
      vignette(0.35);
    },
  };
  // Turm: Innenraum mit Fenstern und Fackeln
  const ENV_TOWER = {
    back(t, sc) {
      skyFill(['#1a1230', '#2a1e48', '#3a2a5e']);
      const off = sc * 0.3; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
      for (let r = 0; r < 14; r++) { const y = r * 16; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); const o = ((off + (r % 2) * 18) % 36 + 36) % 36; for (let x = -o; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); } }
      each(sc, 0.3, 130, (x, k) => { ctx.fillStyle = '#0a0818'; ctx.beginPath(); ctx.moveTo(x - 16, 150); ctx.lineTo(x - 16, 80); ctx.arc(x, 80, 16, Math.PI, 0); ctx.lineTo(x + 16, 150); ctx.fill(); ctx.save(); ctx.clip(); stars(t, 12, 160, 1, k); moon(x + 6, 76, 5, t); ctx.restore();
        ctx.strokeStyle = '#4a3a6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 16, 150); ctx.lineTo(x - 16, 80); ctx.arc(x, 80, 16, Math.PI, 0); ctx.lineTo(x + 16, 150); ctx.stroke(); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x, 150); ctx.moveTo(x - 16, 110); ctx.lineTo(x + 16, 110); ctx.stroke(); }, 0, 181);
      each(sc, 0.3, 130, (x, k) => { const tx = x + 65; ctx.fillStyle = '#3a2a1a'; ctx.fillRect(tx - 2, 130, 4, 16); flame(tx, 130, 1.3, t, k); lightPool(tx, 128, 70, '255,160,80', 0.18); }, 0, 182);
      groundBase('#4a3e66', '#2e2644', '#130f20', '#5a4e7a', sc, { speck: 'rgba(0,0,0,.3)' });
      tiles(sc, 'rgba(0,0,0,.3)', 9, 30);
    },
    props() {},
    front(t) { parts(t, 10, { type: 'glow', rgb: '200,160,255', vx: 2, vy: -8, size: 1.2, tw: 2, alpha: 0.7, seed: 31 }); grade('#7a4aff', 0.18); vignette(0.5); },
  };
  const ENV_MINE = {
    back(t, sc) {
      skyFill(['#0c0a12', '#16131e', '#231e2c']);
      // Felswand mit Schichten
      for (let r = 0; r < 4; r++) { ctx.fillStyle = ['#1b1824', '#211d2b', '#272233', '#2c2738'][r]; ctx.beginPath(); ctx.moveTo(0, 60 + r * 34); for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, 60 + r * 34 + Math.sin((x + sc * (0.1 + r * 0.05)) * 0.03 + r) * 6); ctx.lineTo(W, GROUND); ctx.lineTo(0, GROUND); ctx.fill(); }
      // Tropfsteine oben
      each(sc, 0.25, 34, (x, k) => { const h = 18 + hash(k * 1.7) * 34; ctx.fillStyle = '#121019'; ctx.beginPath(); ctx.moveTo(x - 9, 0); ctx.lineTo(x + 9, 0); ctx.lineTo(x, h); ctx.fill(); }, 0, 77);
      // leuchtende Runenkristalle in der Wand
      each(sc, 0.35, 70, (x, k) => { const y = 90 + hash(k * 2.3) * 70, s2 = 0.7 + hash(k) * 0.6, a = 0.6 + 0.4 * Math.sin(t * 1.5 + k);
        ctx.fillStyle = '#2a8fa6'; ctx.beginPath(); ctx.moveTo(x, y - 12 * s2); ctx.lineTo(x + 5 * s2, y); ctx.lineTo(x, y + 6 * s2); ctx.lineTo(x - 5 * s2, y); ctx.fill(); ctx.fillStyle = '#9cf2ff'; ctx.fillRect(x - 0.8, y - 8 * s2, 1.6, 8 * s2); glowDot(x, y - 3, 22 * s2, '70,212,238', 0.35 * a); }, 0.2, 13);
      // Stützbalken der Mine mit Laternen
      each(sc, 0.6, 150, (x, k) => { ctx.fillStyle = '#4a3220'; ctx.fillRect(x - 30, 108, 7, GROUND - 108); ctx.fillRect(x + 23, 108, 7, GROUND - 108); ctx.fillRect(x - 34, 102, 68, 9); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 34, 109, 68, 2);
        ctx.fillStyle = '#2a2018'; ctx.fillRect(x - 1, 111, 2, 8); ctx.fillStyle = '#ffcf7a'; rr(x - 4, 119, 8, 10, 2); ctx.fill(); lightPool(x, 124, 56, '255,180,90', 0.3); }, 0, 21);
      groundBase('#3a3442', '#29242f', '#121016', '#4a4454', sc, { speck: 'rgba(0,0,0,.35)' });
      // Schienen
      const o = ((sc % 24) + 24) % 24; ctx.fillStyle = '#4a3220'; for (let x = -o; x < W; x += 24) ctx.fillRect(x, GROUND + 9, 14, 4); ctx.fillStyle = '#8a8f9c'; ctx.fillRect(0, GROUND + 8, W, 2); ctx.fillRect(0, GROUND + 13, W, 2);
    },
    props() {},
    front(t) { parts(t, 14, { type: 'glow', rgb: '120,230,255', vx: 3, vy: -6, size: 1.1, tw: 2, alpha: 0.7, seed: 41 }); grade('#2fb8d8', 0.14); vignette(0.55); },
  };
  // ---------- Umgebungen der Heldengebiete ----------
  const ENV_SCHATTEN = { // Schattenviertel: Dächer und Gassen bei Nacht
    back(t, sc) {
      skyFill(['#0e0c1e', '#231a3a', '#3a2440']); stars(t, 30, 110, 0.8, 5); moon(380, 46, 16, t, '#f3e6d0', '240,220,200');
      // ferne Dächer
      each(sc, 0.15, 44, (x, k) => { const h = 50 + hash(k * 1.3) * 50; ctx.fillStyle = '#1a1528'; ctx.fillRect(x - 22, GROUND - 60 - h, 44, h + 60); ctx.beginPath(); ctx.moveTo(x - 26, GROUND - 60 - h); ctx.lineTo(x, GROUND - 82 - h); ctx.lineTo(x + 26, GROUND - 60 - h); ctx.fill();
        if (hash(k * 3) < 0.6) { ctx.fillStyle = 'rgba(255,190,110,.55)'; ctx.fillRect(x - 6, GROUND - 40 - h, 5, 7); } }, 0, 9);
      // nahe Häuser mit Fachwerk, Fenstern und Wäscheleinen
      each(sc, 0.45, 96, (x, k) => { const h = 70 + hash(k * 2.1) * 30, top = GROUND - h;
        ctx.fillStyle = '#2e2438'; ctx.fillRect(x - 40, top, 80, h); ctx.fillStyle = '#3e3048'; ctx.beginPath(); ctx.moveTo(x - 46, top); ctx.lineTo(x, top - 30); ctx.lineTo(x + 46, top); ctx.fill();
        ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 40, top + 30); ctx.lineTo(x + 40, top + 30); ctx.moveTo(x, top); ctx.lineTo(x, GROUND); ctx.moveTo(x - 40, top); ctx.lineTo(x - 10, top + 30); ctx.stroke();
        for (const [wx, wy] of [[-24, 10], [14, 10], [-24, 44], [14, 44]]) { const lit = hash(k * 7 + wx + wy) < 0.55; ctx.fillStyle = lit ? '#ffc870' : '#141020'; ctx.fillRect(x + wx, top + wy, 12, 12); if (lit) glowDot(x + wx + 6, top + wy + 6, 14, '255,190,110', 0.35); ctx.fillStyle = '#1a1420'; ctx.fillRect(x + wx + 5, top + wy, 2, 12); }
        ctx.fillStyle = '#4a3a50'; ctx.fillRect(x + 20, top - 24, 8, 14);
        ctx.strokeStyle = 'rgba(200,190,210,.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 40, top + 24); ctx.quadraticCurveTo(x + 56, top + 34, x + 72, top + 26); ctx.stroke();
        for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#8a3a4a', '#4a6a8a', '#c9b48a'][i]; ctx.fillRect(x + 46 + i * 8, top + 27 + Math.sin(i + t) * 0.6, 5, 8); } }, 0, 17);
      // Laternen an Pfählen
      each(sc, 0.8, 140, (x) => { ctx.fillStyle = '#1a1420'; ctx.fillRect(x - 1.5, GROUND - 70, 3, 70); ctx.fillRect(x - 1.5, GROUND - 70, 12, 3); ctx.fillStyle = '#ffd27a'; rr(x + 6, GROUND - 68, 8, 10, 2); ctx.fill(); lightPool(x + 10, GROUND - 62, 60, '255,200,120', 0.35); lightPool(x + 10, GROUND, 40, '255,200,120', 0.2); }, 0, 23);
      groundBase('#4a4250', '#2e2836', '#141018', '#5a5262', sc, { speck: 'rgba(0,0,0,.35)' }); tiles(sc, 'rgba(0,0,0,.35)', 8, 20);
    },
    props() {},
    front(t) { fog(t, GROUND - 10, 18, '90,70,120', 0.3, 6, 5, 3); grade('#5a3a9a', 0.16); vignette(0.55); },
  };
  const ENV_FRIEDHOF = { // Vergessener Friedhof
    back(t, sc) {
      skyFill(['#1a2420', '#2e3a34', '#48524a']); moon(90, 52, 20, t, '#d8e8d0', '200,230,200');
      each(sc, 0.12, 120, (x, k) => { ctx.fillStyle = '#1e2824'; ctx.beginPath(); ctx.moveTo(x - 60, GROUND - 40); ctx.quadraticCurveTo(x, GROUND - 90 - hash(k) * 20, x + 60, GROUND - 40); ctx.lineTo(x + 60, GROUND); ctx.lineTo(x - 60, GROUND); ctx.fill(); }, 0, 4);
      // Mausoleum und tote Bäume
      each(sc, 0.3, 190, (x, k) => { if (hash(k * 2) < 0.5) { ctx.fillStyle = '#26302c'; ctx.fillRect(x - 26, GROUND - 74, 52, 74); ctx.beginPath(); ctx.moveTo(x - 32, GROUND - 74); ctx.lineTo(x, GROUND - 98); ctx.lineTo(x + 32, GROUND - 74); ctx.fill(); ctx.fillStyle = '#121a16'; ctx.fillRect(x - 8, GROUND - 40, 16, 40); ctx.fillStyle = '#3a443e'; ctx.fillRect(x - 3, GROUND - 92, 6, 14); ctx.fillRect(x - 7, GROUND - 88, 14, 4); }
        else { ctx.strokeStyle = '#1c2420'; ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 4, GROUND - 70); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 3, GROUND - 50); ctx.lineTo(x - 22, GROUND - 80); ctx.lineTo(x - 30, GROUND - 76); ctx.moveTo(x + 4, GROUND - 64); ctx.lineTo(x + 26, GROUND - 92); ctx.moveTo(x + 16, GROUND - 80); ctx.lineTo(x + 30, GROUND - 78); ctx.stroke(); } }, 0, 11);
      // Eisenzaun
      ctx.strokeStyle = '#141a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND - 30); ctx.lineTo(W, GROUND - 30); ctx.moveTo(0, GROUND - 14); ctx.lineTo(W, GROUND - 14); ctx.stroke();
      each(sc, 0.6, 12, (x) => { ctx.fillStyle = '#141a18'; ctx.fillRect(x - 1, GROUND - 38, 2, 38); ctx.beginPath(); ctx.moveTo(x - 3, GROUND - 38); ctx.lineTo(x, GROUND - 44); ctx.lineTo(x + 3, GROUND - 38); ctx.fill(); }, 0, 2);
      // Grabsteine und Kreuze
      each(sc, 0.85, 58, (x, k) => { const tilt = (hash(k * 4) - 0.5) * 0.3, r = hash(k * 6); ctx.save(); ctx.translate(x, GROUND + 2); ctx.rotate(tilt);
        if (r < 0.55) { rr(-9, -26, 18, 26, 8); ctx.fillStyle = '#6a726c'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-4, -18, 8, 1.5); ctx.fillRect(-5, -14, 10, 1.5); ctx.fillStyle = '#4a6a3a'; ctx.beginPath(); ctx.ellipse(6, -2, 6, 3, 0, 0, 7); ctx.fill(); }
        else { ctx.fillStyle = '#5a625c'; ctx.fillRect(-2.5, -32, 5, 32); ctx.fillRect(-9, -26, 18, 5); }
        ctx.restore(); }, 0.1, 31);
      // Irrlichter in der Ferne
      for (let i = 0; i < 6; i++) { const x = (hash(i * 3) * W + t * 6 * (hash(i) - 0.5) * 2 + W) % W, y = 120 + hash(i + 9) * 70 + Math.sin(t * 1.4 + i) * 6; glowDot(x, y, 10, '107,224,184', 0.45 + 0.25 * Math.sin(t * 3 + i)); }
      groundBase('#3a4a36', '#26302a', '#121814', '#4a5a42', sc, { speck: 'rgba(0,0,0,.3)' }); tufts(sc, '#2a3a26', '#3a4a32', 1, GROUND + 1, 20, 6, 4);
    },
    props() {},
    front(t) { fog(t, GROUND - 6, 22, '160,200,170', 0.32, 7, 6, 8); grade('#3a8a6a', 0.14); vignette(0.55); },
  };
  const ENV_THEATER = { // Geistertheater: Bühne mit Vorhang
    back(t, sc) {
      skyFill(['#1a0a14', '#2a1020', '#3a1428']);
      // Kulissen: aufgemalte Pappbäume und ein Pappmond, ziehen vorbei
      each(sc, 0.4, 130, (x, k) => { const r = hash(k * 2.7); ctx.fillStyle = r < 0.5 ? '#3a5a3a' : '#5a3a6a'; ctx.strokeStyle = '#1a0a14'; ctx.lineWidth = 2;
        if (r < 0.5) { ctx.beginPath(); ctx.moveTo(x - 24, GROUND - 40); ctx.lineTo(x, GROUND - 120); ctx.lineTo(x + 24, GROUND - 40); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 4, GROUND - 40, 8, 40); }
        else { ctx.beginPath(); ctx.arc(x, GROUND - 110, 22, 0, 7); ctx.fillStyle = '#e8d8a0'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#3a1428'; ctx.beginPath(); ctx.arc(x + 9, GROUND - 114, 20, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(230,220,200,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, GROUND - 210); ctx.lineTo(x, GROUND - 132); ctx.stroke(); } }, 0, 6);
      // Kronleuchter
      for (const cx of [130, 350]) { ctx.strokeStyle = '#c9a64a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, 30); ctx.stroke(); ctx.fillStyle = '#c9a64a'; ctx.beginPath(); ctx.ellipse(cx, 34, 26, 5, 0, 0, 7); ctx.fill(); for (let i = 0; i < 5; i++) { const fx = cx - 20 + i * 10; flame(fx, 30, 0.6, t, i + cx); } glowDot(cx, 34, 50, '255,200,120', 0.3); }
      // Scheinwerferkegel
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [sx, tx] of [[60, 150], [420, 330]]) { const a = 0.08 + 0.03 * Math.sin(t * 0.8 + sx); ctx.fillStyle = vg([`rgba(255,240,200,${a})`, 'rgba(255,240,200,0)'], 0, GROUND); ctx.beginPath(); ctx.moveTo(sx - 8, 0); ctx.lineTo(sx + 8, 0); ctx.lineTo(tx + 50 + Math.sin(t * 0.5) * 20, GROUND); ctx.lineTo(tx - 50 + Math.sin(t * 0.5) * 20, GROUND); ctx.fill(); } ctx.restore();
      // Bühnenboden aus Dielen mit Rampenlichtern
      ctx.fillStyle = vg(['#6a4428', '#4a2e1a', '#2a1a10'], GROUND, H); ctx.fillRect(0, GROUND, W, H - GROUND);
      const o = ((sc % 36) + 36) % 36; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; for (let y = GROUND + 8; y < H; y += 9) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } for (let x = -o; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x, H); ctx.stroke(); }
      ctx.fillStyle = '#c9a64a'; ctx.fillRect(0, GROUND, W, 2);
      for (let x = ((-sc * 1) % 48 + 48) % 48; x < W; x += 48) { ctx.fillStyle = '#2a1a10'; rr(x - 5, GROUND + 22, 10, 6, 2); ctx.fill(); glowDot(x, GROUND + 22, 16, '255,220,150', 0.35); }
    },
    props() {},
    front(t) {
      // seitliche Vorhänge und Lambrequin oben, fest im Bild
      for (const [x0, dir] of [[0, 1], [W, -1]]) { for (let i = 0; i < 4; i++) { const x = x0 + dir * (i * 9 + Math.sin(t * 0.6 + i) * 1.5); ctx.fillStyle = i % 2 ? '#8a1428' : '#a81c34'; ctx.fillRect(dir > 0 ? x : x - 10, 0, 10, H); } ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(dir > 0 ? x0 + 36 : x0 - 40, 0, 4, H); }
      ctx.fillStyle = '#a81c34'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 16); for (let x = W; x >= 0; x -= 40) ctx.quadraticCurveTo(x - 20, 30, x - 40, 16); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#c9a64a'; ctx.fillRect(0, 14, W, 2);
      grade('#ff4a7a', 0.1); vignette(0.5);
    },
  };
  const ENV_HAIN = { // Verdorbener Hain
    back(t, sc) {
      skyFill(['#140e1e', '#241a34', '#2e2a3a']);
      for (let i = 0; i < 8; i++) glowDot((i * 73 + 20) % W, 40 + (i * 37) % 70, 30, '150,80,200', 0.12);
      each(sc, 0.15, 50, (x, k) => { ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.moveTo(x - 18, GROUND); ctx.lineTo(x - 6, GROUND - 120 - hash(k) * 40); ctx.lineTo(x + 6, GROUND - 120 - hash(k) * 40); ctx.lineTo(x + 18, GROUND); ctx.fill(); }, 0, 2);
      // verdrehte Bäume mit lila Glut
      each(sc, 0.45, 110, (x, k) => { const h = 130 + hash(k) * 40; ctx.strokeStyle = '#24182a'; ctx.lineCap = 'round'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.bezierCurveTo(x + 14, GROUND - h * 0.4, x - 14, GROUND - h * 0.7, x + 6, GROUND - h); ctx.stroke();
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 2, GROUND - h * 0.6); ctx.quadraticCurveTo(x - 30, GROUND - h * 0.75, x - 40, GROUND - h * 0.62); ctx.moveTo(x + 4, GROUND - h * 0.8); ctx.quadraticCurveTo(x + 34, GROUND - h * 0.95, x + 46, GROUND - h * 0.8); ctx.stroke();
        ctx.strokeStyle = 'rgba(90,60,110,.8)'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { const vx = x - 36 + i * 24; ctx.beginPath(); ctx.moveTo(vx, GROUND - h * 0.7); ctx.quadraticCurveTo(vx + 4, GROUND - h * 0.5, vx, GROUND - h * 0.38 + Math.sin(t + i) * 3); ctx.stroke(); }
        ctx.fillStyle = '#9a4aca'; ctx.beginPath(); ctx.ellipse(x + 8, GROUND - h * 0.45, 5, 7, 0, 0, 7); ctx.fill(); glowDot(x + 8, GROUND - h * 0.45, 18, '190,90,255', 0.4 + 0.2 * Math.sin(t * 2 + k)); }, 0, 13);
      groundBase('#3a2e3a', '#241c26', '#100c12', '#4a3a4a', sc, { speck: 'rgba(0,0,0,.3)' });
      each(sc, 1, 46, (x, k) => { if (hash(k * 3) < 0.5) for (let i = 0; i < 3; i++) mushroom(x + i * 6, GROUND + 2, 0.7 + hash(k + i) * 0.4, '#9a4aca', '200,120,255', t, k + i); else bush(x, GROUND + 2, 0.9, ['#3a2a44', '#241a2e'], '#c060ff'); }, 0.3, 19);
    },
    props() {},
    front(t) { parts(t, 18, { type: 'glow', rgb: '200,120,255', vx: 2, vy: -5, size: 1.1, tw: 2, alpha: 0.7, seed: 61 }); fog(t, GROUND - 4, 16, '120,80,140', 0.3, 5, 5, 12); grade('#7a3aaa', 0.16); vignette(0.55); },
  };
  const ENV_WERK = { // Uhrwerkfabrik
    back(t, sc) {
      skyFill(['#1e1612', '#2e221a', '#3a2c20']);
      // Ziegelwand
      const off = sc * 0.3; ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1;
      for (let r = 0; r < 14; r++) { const y = r * 12; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); const o = ((off + (r % 2) * 13) % 26 + 26) % 26; for (let x = -o; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 12); ctx.stroke(); } }
      // große Zahnräder drehen sich
      each(sc, 0.3, 150, (x, k) => { const r = 30 + hash(k) * 22, y = 70 + hash(k * 2) * 60, sp = (k % 2 ? 1 : -1) * 0.4;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * sp); ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, rr2 = i % 2 ? r : r + 7; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a2e22'; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 7); ctx.fill(); ctx.fillStyle = '#5a4a3a'; for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillRect(-3, 0, 6, r * 0.62); ctx.restore(); } ctx.fillStyle = '#c9a64a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); ctx.restore(); }, 0, 7);
      // Rohre mit Dampf
      each(sc, 0.6, 120, (x, k) => { ctx.fillStyle = '#7a6a5a'; ctx.fillRect(x - 5, 40, 10, GROUND - 40); ctx.fillRect(x - 5, 40, 60, 10); ctx.fillStyle = '#c9a64a'; ctx.fillRect(x - 7, 100, 14, 4); ctx.fillRect(x - 7, 160, 14, 4);
        for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3 + hash(k)) % 1; ctx.fillStyle = `rgba(220,220,230,${0.4 * (1 - q)})`; ctx.beginPath(); ctx.arc(x + 54 + q * 8, 40 - q * 30, 4 + q * 10, 0, 7); ctx.fill(); } }, 0, 29);
      // Hängelampen
      each(sc, 0.8, 160, (x) => { ctx.strokeStyle = '#1a140e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 60); ctx.stroke(); ctx.fillStyle = '#3a3a40'; ctx.beginPath(); ctx.moveTo(x - 10, 66); ctx.lineTo(x, 58); ctx.lineTo(x + 10, 66); ctx.fill(); lightPool(x, 70, 70, '255,170,80', 0.3); }, 0, 37);
      // Förderband als Boden
      ctx.fillStyle = vg(['#3a3e48', '#22252c', '#101216'], GROUND, H); ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#4a4e58'; ctx.fillRect(0, GROUND, W, 6); const o = ((sc % 16) + 16) % 16; ctx.fillStyle = 'rgba(0,0,0,.4)'; for (let x = -o; x < W; x += 16) ctx.fillRect(x, GROUND, 3, 6);
      for (let x = -((sc * 1) % 40 + 40) % 40; x < W + 40; x += 40) { ctx.save(); ctx.translate(x, GROUND + 14); ctx.rotate(sc * 0.05); ctx.fillStyle = '#5a5f6b'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#2a2e38'; ctx.fillRect(-1, -7, 2, 14); ctx.restore(); }
    },
    props() {},
    front(t) { parts(t, 12, { type: 'ember', rgb: '255,170,80', vx: 4, vy: -10, size: 1.2, tw: 2, alpha: 0.7, seed: 71 }); grade('#ff8a3a', 0.12); vignette(0.55); },
  };
  const AREA_ENV = { schatten: ENV_SCHATTEN, friedhof: ENV_FRIEDHOF, theater: ENV_THEATER, hain: ENV_HAIN, werk: ENV_WERK, mine: ENV_MINE };
  function envOf(stage, mode) { return mode === 'camp' ? ENV_CAMP : mode === 'tower' ? ENV_TOWER : ENV[zoneOf(stage) % ENV.length]; }
  /* ================= Ahnenprüfung: Grafik ================= */
  // Färbt eine Zeichnung ein: erst auf eine eigene Fläche zeichnen, dann mit der Farbe überziehen
  let ahnCv = null, ahnCv2 = null;
  function tintDraw(fn, tint, amount, halfW = 120) {
    if (!tint || !cv) { fn(); return; }
    if (!ahnCv) { ahnCv = document.createElement('canvas'); ahnCv2 = document.createElement('canvas'); }
    for (const c of [ahnCv, ahnCv2]) if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; }
    const main = ctx, oc = ahnCv.getContext('2d'), o2 = ahnCv2.getContext('2d'), m = main.getTransform(), a0 = main.globalAlpha;
    const sx = Math.max(0, Math.floor(m.e - halfW * m.a)), sw = Math.min(cv.width - sx, Math.ceil(halfW * 2 * m.a));
    if (sw <= 0) return;
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(sx, 0, sw, cv.height); oc.globalAlpha = 1;
    oc.setTransform(m); ctx = oc;
    try { fn(); } finally { ctx = main; }
    oc.setTransform(1, 0, 0, 1, 0, 0);
    // Farbton übernehmen, Helligkeit behalten, dann auf die Form zuschneiden
    o2.setTransform(1, 0, 0, 1, 0, 0); o2.globalCompositeOperation = 'source-over'; o2.globalAlpha = 1; o2.clearRect(sx, 0, sw, cv.height);
    o2.drawImage(ahnCv, sx, 0, sw, cv.height, sx, 0, sw, cv.height);
    o2.globalCompositeOperation = 'color'; o2.globalAlpha = amount; o2.fillStyle = tint; o2.fillRect(sx, 0, sw, cv.height);
    const n = parseInt(tint.slice(1), 16), lum = (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
    if (lum > 0.7) { o2.globalAlpha = (lum - 0.6) * 1.1; o2.globalCompositeOperation = 'screen'; o2.fillRect(sx, 0, sw, cv.height); }
    else if (lum < 0.3) { o2.globalAlpha = (0.35 - lum) * 1.2; o2.globalCompositeOperation = 'multiply'; o2.fillRect(sx, 0, sw, cv.height); }
    o2.globalAlpha = 1; o2.globalCompositeOperation = 'destination-in'; o2.drawImage(ahnCv, sx, 0, sw, cv.height, sx, 0, sw, cv.height);
    o2.globalCompositeOperation = 'source-over';
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a0; main.drawImage(ahnCv2, sx, 0, sw, cv.height, sx, 0, sw, cv.height); main.restore();
  }
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
  // Effekte rund um die Bosse
  function ahnAcc(kind, rgb, t, front, ph) {
    const sp = 1 + ph * 0.35;
    if (kind === 'blasen') { if (!front) return; for (let i = 0; i < 7; i++) { const p = (t * 0.35 * sp + i / 7) % 1; ctx.strokeStyle = `rgba(${rgb},${0.7 * (1 - p)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(Math.sin(i * 2.3) * 40, -10 - p * 110, 2 + (i % 3), 0, 7); ctx.stroke(); } return; }
    if (kind === 'staub') { if (front) return; for (let i = 0; i < 8; i++) { const p = (t * 0.5 * sp + i / 8) % 1; ctx.fillStyle = `rgba(190,160,120,${0.45 * (1 - p)})`; ctx.beginPath(); ctx.arc((i - 4) * 14 + p * 20, -4 - p * 20, 5 + p * 8, 0, 7); ctx.fill(); } return; }
    if (kind === 'blaetter' || kind === 'blueten' || kind === 'federn' || kind === 'asche' || kind === 'schnee') {
      if (!front) return;
      const col = { blaetter: ['#7ac85a', '#c8a03a'], blueten: ['#ff8ab8', '#ffd0e0'], federn: ['#2a2a3a', '#5a5a7a'], asche: ['#8a8a96', '#4a4a52'], schnee: ['#ffffff', '#cfefff'] }[kind];
      for (let i = 0; i < 10; i++) { const p = (t * 0.25 * sp + i / 10) % 1, x = Math.sin(i * 3.1) * 60 + Math.sin(t * 1.5 + i) * 10, y = -150 + p * 150; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.globalAlpha = (1 - p) * 0.9; ctx.fillStyle = col[i % 2];
        if (kind === 'schnee' || kind === 'asche') { ctx.beginPath(); ctx.arc(0, 0, kind === 'schnee' ? 1.8 : 2.2, 0, 7); ctx.fill(); } else { ctx.beginPath(); ctx.ellipse(0, 0, kind === 'federn' ? 5 : 4, 2, 0, 0, 7); ctx.fill(); }
        ctx.restore(); }
      ctx.globalAlpha = 1; return;
    }
    if (kind === 'runen' || kind === 'echo') {
      if (front) return;
      ctx.save(); ctx.translate(0, -70); ctx.globalCompositeOperation = 'lighter';
      const r = 62 + ph * 6; ctx.strokeStyle = `rgba(${rgb},${0.35 + ph * 0.12})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r - 9, 0, 7); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = t * 0.4 * sp + i * Math.PI / 6; ctx.save(); ctx.rotate(a); ctx.translate(r - 4.5, 0); ctx.fillStyle = `rgba(${rgb},.7)`; ctx.fillRect(-1.5, -3, 3, 6); ctx.restore(); }
      ctx.restore();
      if (kind === 'echo') glowDot(0, -70, 90, rgb, 0.18 + 0.06 * Math.sin(t * 2));
      return;
    }
    if (kind === 'schatten' || kind === 'leere') { if (front) return; for (let i = 0; i < 6; i++) { const p = (t * 0.3 * sp + i / 6) % 1; ctx.fillStyle = kind === 'leere' ? `rgba(20,10,40,${0.5 * (1 - p)})` : `rgba(30,20,50,${0.45 * (1 - p)})`; ctx.beginPath(); ctx.arc(Math.sin(i * 2.1) * 34, -20 - p * 100, 14 + p * 18, 0, 7); ctx.fill(); }
      if (kind === 'leere') { ctx.strokeStyle = `rgba(${rgb},.5)`; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const p = (t * 0.4 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, -70, 30 + p * 60, (30 + p * 60) * 0.4, 0, 0, 7); ctx.globalAlpha = 1 - p; ctx.stroke(); } ctx.globalAlpha = 1; } return; }
    if (kind === 'knochen') { if (front) return; for (let i = 0; i < 4; i++) { const a = t * 0.9 * sp + i * Math.PI / 2, x = Math.cos(a) * 58, y = -80 + Math.sin(a) * 18; ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-7, -1.5, 14, 3); ctx.beginPath(); ctx.arc(-7, -2, 2.4, 0, 7); ctx.arc(-7, 2, 2.4, 0, 7); ctx.arc(7, -2, 2.4, 0, 7); ctx.arc(7, 2, 2.4, 0, 7); ctx.fill(); ctx.restore(); } return; }
    if (kind === 'geister' || kind === 'irrlicht') { if (!front) return; for (let i = 0; i < 5; i++) { const a = t * 0.7 * sp + i * 1.26, x = Math.cos(a) * 54, y = -84 + Math.sin(a * 1.4) * 34; glowDot(x, y, kind === 'irrlicht' ? 9 : 7, rgb, 0.75); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); } return; }
    if (kind === 'gift') { if (front) return; for (let i = 0; i < 6; i++) { const p = (t * 0.4 * sp + i / 6) % 1; ctx.fillStyle = `rgba(140,220,90,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(Math.sin(i * 1.7) * 36, -6 - p * 60, 8 + p * 14, 0, 7); ctx.fill(); } return; }
    if (kind === 'funken' || kind === 'flammen' || kind === 'sterne') {
      if (!front) { if (kind === 'flammen') for (let i = 0; i < 7; i++) { const h = 16 + Math.sin(t * 9 * sp + i * 1.9) * 7; ctx.fillStyle = ['#ff5a2a', '#ffb547', '#ffd23f'][i % 3]; ctx.beginPath(); ctx.moveTo(-42 + i * 12, 2); ctx.quadraticCurveTo(-38 + i * 12, -h, -32 + i * 12, 2); ctx.fill(); } return; }
      for (let i = 0; i < 9; i++) { const p = (t * 0.6 * sp + i / 9) % 1, x = Math.sin(i * 2.7 + p * 3) * 50, y = -20 - p * 130;
        if (kind === 'sterne') { ctx.fillStyle = `rgba(255,240,200,${1 - p})`; sparkle(x, y, 3 * (1 - p) + 1, 1 - p); } else { ctx.fillStyle = `rgba(255,${180 + (i % 3) * 25},80,${1 - p})`; ctx.fillRect(x, y, 2.2, 2.2); } }
      return;
    }
    if (kind === 'kristalle') { if (front) return; for (let i = 0; i < 5; i++) { const a = t * 0.6 * sp + i * 1.26, x = Math.cos(a) * 60, y = -70 + Math.sin(a) * 22; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t + i) * 0.3); poly([[0, -10], [5, 0], [0, 10], [-5, 0]], `rgba(${rgb},.85)`, true); ctx.restore(); } return; }
    if (kind === 'blut') { if (front) return; for (let i = 0; i < 6; i++) { const p = (t * 0.5 * sp + i / 6) % 1; ctx.fillStyle = `rgba(200,20,40,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.ellipse(Math.sin(i * 2.9) * 30, -100 + p * 100, 2, 3.5, 0, 0, 7); ctx.fill(); } glowDot(0, -60, 70, '200,20,40', 0.15); }
  }
  // Ein Boss der Ahnenprüfung: Grundbild + Farbe + Effekte + Phase
  // ---------- Eigene Ahnen-Bosse (Version 7) ----------
  // Statt eingefärbter Gebietsbosse bekommen viele Ahnen-Bosse eine eigene Figur. Alle schauen nach links zu den Helden.
  function eyeGlow(x, y, rgb, r = 2.4) { glowDot(x, y, r * 3, rgb, 0.85); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.75, r * 0.55, 0, 0, 7); ctx.fill(); }
  function crownAt(x, y, w, c = '#ffd23f', gem = '#e5484d') { ctx.beginPath(); ctx.moveTo(x - w / 2, y); for (let i = 0; i <= 4; i++) { const xx = x - w / 2 + i * w / 4; ctx.lineTo(xx, y - (i % 2 ? w * 0.28 : w * 0.55)); if (i < 4) ctx.lineTo(xx + w / 8, y - w * 0.18); } ctx.lineTo(x + w / 2, y); ctx.closePath(); fillO(LG(y - w * 0.55, y, '#fff2b0', c)); ctx.fillStyle = gem; ctx.beginPath(); ctx.arc(x, y - w * 0.18, w * 0.09, 0, 7); ctx.fill(); }
  const AHN_FN = {
    'Glibberbaron'(e, t) {
      const sq = Math.sin(t * 3) * 3, atk = bossAtk(e);
      ctx.beginPath(); ctx.moveTo(-50, 0); ctx.bezierCurveTo(-56, -48 - sq, -30, -78 + sq, 0, -78 + sq); ctx.bezierCurveTo(32, -78 + sq, 56, -48 - sq, 50, 0); ctx.closePath(); fillO(RG(-14, -56, 70, '#ffc2e4', '#d8408c'));
      for (let i = 0; i < 6; i++) { const q = (t * 0.4 + i / 6) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - q)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-30 + i * 12, -10 - q * 50, 2 + (i % 3), 0, 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-24, -58 + sq, 10, 5, -0.6, 0, 7); ctx.fill();
      // Gesicht: Monokel, Schnurrbart
      for (const [ex, mono] of [[-24, 1], [-4, 0]]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, -46 + sq * 0.5, 6, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(ex - 1.5, -45 + sq * 0.5, 3, 0, 7); ctx.fill(); if (mono) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(ex, -46 + sq * 0.5, 8, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex + 6, -40); ctx.quadraticCurveTo(ex + 8, -26, ex + 4, -18); ctx.stroke(); } }
      ctx.beginPath(); ctx.moveTo(-14, -33); ctx.quadraticCurveTo(-26, -36, -32, -28); ctx.quadraticCurveTo(-22, -31, -14, -29); ctx.quadraticCurveTo(-6, -31, 4, -28); ctx.quadraticCurveTo(-2, -36, -14, -33); ctx.closePath(); fillO('#5a2a3a');
      if (atk > 0) { ctx.fillStyle = '#7a1a3a'; ctx.beginPath(); ctx.ellipse(-14, -22, 7, 4 * atk + 1, 0, 0, 7); ctx.fill(); }
      // Zylinder
      ctx.save(); ctx.translate(-4, -76 + sq); ctx.rotate(-0.12); rr(-18, -3, 36, 6, 2); fillO('#1b1726'); rr(-12, -30, 24, 28, 3); fillO(LG(-30, -2, '#3a3046', '#120e18')); ctx.fillStyle = '#e5484d'; ctx.fillRect(-12, -8, 24, 4); ctx.restore();
    },
    'Rabenfürst Krahl'(e, t) {
      const atk = bossAtk(e), fl = Math.sin(t * 2) * 0.1;
      // Raben kreisen
      for (let i = 0; i < 4; i++) { const a = t * 1.4 + i * 1.57, f = Math.sin(t * 14 + i * 2) * 5; ctx.save(); ctx.translate(Math.cos(a) * 60, -120 + Math.sin(a) * 20); ctx.scale(Math.sin(a) > 0 ? 1 : -1, 1); ctx.beginPath(); ctx.moveTo(-9, -f); ctx.quadraticCurveTo(-4, -2, 0, 0); ctx.quadraticCurveTo(4, -2, 9, -f); ctx.quadraticCurveTo(4, 1, 0, 2.5); ctx.quadraticCurveTo(-4, 1, -9, -f); ctx.closePath(); fillO('#1a1a2a'); ctx.restore(); }
      // Federmantel
      ctx.beginPath(); ctx.moveTo(-14, -110); ctx.quadraticCurveTo(-44, -60, -46 - fl * 30, 0); for (let i = 0; i <= 8; i++) ctx.lineTo(-46 + i * 11.5, i % 2 ? -8 : 0); ctx.quadraticCurveTo(44, -60, 16, -110); ctx.closePath(); fillO(LG(-110, 0, '#3a3a5a', '#0e0e1a'));
      ctx.strokeStyle = 'rgba(120,120,170,.45)'; ctx.lineWidth = 1; for (let r = 0; r < 4; r++) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const x0 = -34 + i * 13 + (r % 2) * 6, y0 = -80 + r * 18; ctx.moveTo(x0 - 6, y0); ctx.quadraticCurveTo(x0, y0 + 8, x0 + 6, y0); } ctx.stroke(); }
      // Federkragen
      for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; poly([[Math.cos(a) * 18, -110 + Math.sin(a) * 8], [Math.cos(a) * 32, -118 + Math.sin(a) * 18], [Math.cos(a + 0.2) * 18, -110 + Math.sin(a + 0.2) * 8]], i % 2 ? '#2a2a44' : '#4a4a6e', true); }
      // Kopf mit Schnabel-Maske
      ctx.save(); ctx.translate(-2, -126); ctx.rotate(-0.1 - atk * 0.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 15, 0, 0, 7); fillO(LG(-15, 15, '#2a2a40', '#0a0a14'));
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(-30, 0, -38 - atk * 6, 10); ctx.quadraticCurveTo(-24, 8, -6, 8); ctx.closePath(); fillO(LG(-4, 10, '#ffd27a', '#a8781a'));
      ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, 3); ctx.quadraticCurveTo(-24, 4, -36 - atk * 6, 9.5); ctx.stroke();
      eyeGlow(-6, -4, '255,80,80', 2.6);
      for (let i = 0; i < 5; i++) poly([[-6 + i * 4, -12], [-4 + i * 5, -26 - (i % 2) * 6], [-1 + i * 4, -12]], i % 2 ? '#4a4a6e' : '#2a2a44', true);
      ctx.restore();
      // Stab mit Rabenschädel
      ctx.save(); ctx.translate(-30, -70); ctx.rotate(-0.15 - atk * 0.4); ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 70); ctx.lineTo(0, -40); ctx.stroke(); ctx.strokeStyle = '#4a3a2e'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -46, 7, 6, 0, 0, 7); fillO('#ece6d4'); poly([[-6, -46], [-16, -43], [-6, -42]], '#d8d0b8', true); eyeGlow(-2, -47, '160,80,255', 1.6); ctx.restore();
    },
    'Der Hirschkönig'(e, t) {
      ctx.scale(0.9, 0.9);
      const st = Math.sin(t * 1.5), atk = bossAtk(e);
      // Beine
      for (const [lx, d] of [[30, 1], [-22, 1], [36, 0], [-16, 0]]) { const kn = limb(lx, -48, d ? 0.05 : -0.05, 22, 7, d ? '#7a5a3a' : '#a07a4e'); const ft = limb(kn[0], kn[1], d ? -0.15 : 0.1, 24, 5.5, d ? '#6a4a2e' : '#8a6a42'); ctx.beginPath(); ctx.ellipse(ft[0], ft[1] - 1.5, 3.4, 2.4, 0, 0, 7); fillO('#2a1a10'); }
      // Körper
      ctx.beginPath(); ctx.ellipse(8, -62, 38, 20, -0.05, 0, 7); fillO(LG(-82, -42, '#c8a070', '#7a5432'));
      ctx.fillStyle = '#5f8f4a'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(-16 + i * 9, -80 + Math.sin(i) * 2, 6, 3, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-6 + i * 8, -66 + (i % 2) * 4, 1.8, 0, 7); ctx.fill(); }
      // Hals und Kopf
      tube(bez([-20, -70], [-28, -90], [-34, -104], [-38, -112 - st], 10), 18, 13, '#b48a5a');
      ctx.save(); ctx.translate(-40, -116 - st); ctx.rotate(-0.25 - atk * 0.4);
      ctx.beginPath(); ctx.moveTo(10, -6); ctx.quadraticCurveTo(-8, -12, -22, -2); ctx.quadraticCurveTo(-24, 4, -18, 6); ctx.quadraticCurveTo(0, 10, 10, 6); ctx.closePath(); fillO(LG(-12, 10, '#d8b080', '#8a6440'));
      ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(-21, 1, 1.8, 0, 7); ctx.fill(); eyeGlow(-6, -3, '200,255,140', 2);
      // goldenes Geweih mit Blättern
      for (const s2 of [1, 0.7]) { ctx.save(); ctx.translate(4, -8); ctx.scale(s2, s2); ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.lineCap = 'round'; const P2 = [[0, 0], [6, -22], [2, -40], [10, -58]];
        const draw2 = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -14, 6, -24); ctx.quadraticCurveTo(0, -36, 6, -52); ctx.moveTo(6, -24); ctx.quadraticCurveTo(18, -30, 22, -42); ctx.moveTo(4, -38); ctx.quadraticCurveTo(-8, -44, -10, -54); ctx.moveTo(8, -14); ctx.lineTo(18, -16); ctx.stroke(); };
        draw2(); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 3.6; draw2(); ctx.fillStyle = '#7ee08a'; for (const [lx, ly] of [[22, -42], [-10, -54], [6, -52]]) { ctx.beginPath(); ctx.ellipse(lx, ly, 4, 2, 0.6, 0, 7); ctx.fill(); }
        ctx.restore(); }
      glowDot(10, -50, 20, '255,220,120', 0.35);
      ctx.restore();
    },
    'Die Klagende'(e, t) {
      const atk = bossAtk(e, 0.6), hov = Math.sin(t * 1.6) * 5 - 10;
      if (atk > 0) for (let i = 0; i < 3; i++) { const q = ((1 - atk) * 1.5 + i * 0.25) % 1; ctx.strokeStyle = `rgba(200,240,255,${0.7 * (1 - q)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-30, -112 + hov, 10 + q * 60, 2.4, 3.9); ctx.stroke(); }
      // Haar weht nach hinten
      for (let i = 0; i < 6; i++) { const wv = Math.sin(t * 2 + i) * 8; tube(bez([-4, -130 + hov], [20, -140 + i * 6 + hov], [50 + wv, -120 + i * 10 + hov], [70 + wv * 1.5, -90 + i * 14 + hov], 12), 9, 2, q => `rgba(${230 - q * 40},${245 - q * 30},255,${1 - q * 0.6})`); }
      // Geisterleib
      ctx.beginPath(); ctx.moveTo(-18, -110 + hov); ctx.quadraticCurveTo(-34, -60 + hov, -30, -10 + hov); for (let i = 0; i <= 8; i++) ctx.lineTo(-30 + i * 7.5, -10 + hov + Math.sin(t * 4 + i * 1.3) * 6 + (i % 2 ? 6 : 0)); ctx.quadraticCurveTo(34, -60 + hov, 18, -110 + hov); ctx.closePath();
      ctx.save(); ctx.globalAlpha *= 0.88; fillO(LG(-110 + hov, -10 + hov, '#e8f8ff', 'rgba(140,200,230,.2)')); ctx.restore();
      // Arme ausgestreckt
      tube(bez([-14, -100 + hov], [-30, -96 + hov], [-40 - atk * 8, -104 + hov], [-50 - atk * 10, -112 + hov], 8), 7, 4, 'rgba(220,240,255,.9)');
      // Kopf: hohle Augen, schreiender Mund
      ctx.beginPath(); ctx.ellipse(-2, -126 + hov, 13, 16, 0, 0, 7); fillO(LG(-142 + hov, -110 + hov, '#ffffff', '#b8d8e8'));
      for (const ex of [-9, 2]) { ctx.fillStyle = '#1a2a3a'; ctx.beginPath(); ctx.ellipse(ex, -130 + hov, 3.6, 5, 0, 0, 7); ctx.fill(); glowDot(ex, -130 + hov, 6, '160,230,255', 0.8); }
      ctx.fillStyle = '#1a2a3a'; ctx.beginPath(); ctx.ellipse(-5, -116 + hov, 4 + atk * 2, 5 + atk * 5, 0, 0, 7); ctx.fill();
    },
    'Pestdoktor Varn'(e, t) {
      const atk = bossAtk(e), sw = Math.sin(t * 1.4);
      // Giftwolken
      for (let i = 0; i < 6; i++) { const q = (t * 0.3 + i / 6) % 1; ctx.fillStyle = `rgba(150,200,80,${0.35 * (1 - q)})`; ctx.beginPath(); ctx.arc(-40 + Math.sin(i * 3) * 30, -20 - q * 70, 8 + q * 12, 0, 7); ctx.fill(); }
      // Mantel
      ctx.beginPath(); ctx.moveTo(-16, -100); ctx.quadraticCurveTo(-32, -50, -36 - sw * 3, 0); ctx.lineTo(34 - sw * 3, 0); ctx.quadraticCurveTo(30, -50, 16, -100); ctx.closePath(); fillO(LG(-100, 0, '#4a3a2e', '#1e1610'));
      ctx.fillStyle = '#2a2018'; ctx.fillRect(-3, -96, 6, 92); ctx.fillStyle = '#c9a64a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, -88 + i * 16, 2, 0, 7); ctx.fill(); }
      rr(-20, -60, 40, 6, 2); fillO('#2a1a10');
      for (let i = 0; i < 3; i++) { rr(-18 + i * 6, -58, 4, 9, 1); fillO(['#9be36b', '#e5484d', '#7ad7ff'][i]); }
      // Arm mit Laterne
      const lx = -38 - atk * 10, ly = -62 + sw * 3;
      tube(bez([-12, -92], [-22, -86], [-30, -74], [lx + 4, ly - 4], 8), 8, 6, '#3a2e24');
      ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx, ly - 4); ctx.lineTo(lx, ly + 2); ctx.stroke();
      rr(lx - 6, ly + 2, 12, 14, 2); fillO('#3a3a44'); glowDot(lx, ly + 9, 16, '155,227,107', 0.7 + 0.2 * Math.sin(t * 5)); ctx.fillStyle = '#c8ff9a'; rr(lx - 4, ly + 4, 8, 10, 2); ctx.fill();
      // Kopf: Schnabelmaske und breiter Hut
      ctx.save(); ctx.translate(0, -112); ctx.rotate(-0.08 - atk * 0.15);
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 12, 0, 0, 7); fillO('#2a2018');
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-30, 2, -34, 14); ctx.quadraticCurveTo(-20, 10, -4, 8); ctx.closePath(); fillO(LG(-2, 14, '#e8dcc0', '#a8987a'));
      for (const ex of [-6, 2]) { ctx.beginPath(); ctx.arc(ex, -2, 4, 0, 7); fillO('#5a4a3a'); ctx.fillStyle = 'rgba(160,240,120,.85)'; ctx.beginPath(); ctx.arc(ex, -2, 2.6, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, -10, 26, 5, -0.1, 0, 7); fillO('#1a1410'); rr(-12, -26, 24, 16, 3); fillO(LG(-26, -10, '#2a2018', '#0e0a06')); ctx.fillStyle = '#7a1a1a'; ctx.fillRect(-12, -14, 24, 3);
      ctx.restore();
    },
    'Höllenhund Kerberos'(e, t) {
      const atk = bossAtk(e), ph = t * 6;
      // Flammenmähne hinten
      for (let i = 0; i < 9; i++) { const q = (t * 1.2 + i / 9) % 1; glowDot(20 - i * 4, -86 - q * 30, 10 * (1 - q), '255,120,40', 0.6); }
      for (const [lx, d] of [[34, 1], [-14, 1], [40, 0], [-8, 0]]) { const a1 = Math.sin(ph + lx) * 0.1; const kn = limb(lx, -44, a1, 18, 9, d ? '#4a1a14' : '#6a2a20'); const ft = limb(kn[0], kn[1], a1 - 0.2, 18, 8, d ? '#3a140e' : '#5a2018'); for (let k = 0; k < 3; k++) poly([[ft[0] - 6 + k * 3, ft[1]], [ft[0] - 9 + k * 3, ft[1] + 2], [ft[0] - 4 + k * 3, ft[1] + 1]], '#f4ecd8', true); }
      // Schwanz aus Flammen
      ctx.save(); ctx.translate(48, -66); ctx.rotate(-0.8 + Math.sin(t * 4) * 0.2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14, -16, 10, -34); ctx.quadraticCurveTo(4, -16, -4, -4); ctx.closePath(); fillO(LG(-34, 0, '#ffd27a', '#e5484d')); ctx.restore();
      ctx.beginPath(); ctx.ellipse(14, -62, 38, 22, -0.05, 0, 7); fillO(LG(-84, -40, '#8a3a2a', '#3a1410'));
      ctx.strokeStyle = 'rgba(255,140,60,.6)'; ctx.lineWidth = 1.6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 12, -78); ctx.lineTo(-2 + i * 12, -64); ctx.lineTo(-8 + i * 12, -52); ctx.stroke(); }
      // drei Köpfe
      [[-40, -96, 0], [-24, -116, 1], [-6, -100, 2]].forEach(([hx, hy, i]) => {
        const lun = atk * (i === 1 ? 14 : 8), bob = Math.sin(t * 3 + i * 2) * 3;
        tube(bez([-6 + i * 8, -72], [hx + 14, hy + 20], [hx + 8, hy + 10], [hx + 4 - lun, hy + bob], 8), 16, 12, '#7a2a20');
        ctx.save(); ctx.translate(hx - lun, hy + bob); ctx.rotate(-0.1 - atk * 0.2);
        const open = atk * 6 + Math.max(0, Math.sin(t * 2 + i)) * 2;
        ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(-18, 3 + open); ctx.lineTo(-15, 7 + open); ctx.lineTo(8, 8); ctx.closePath(); fillO('#4a1a14');
        ctx.beginPath(); ctx.moveTo(10, -9); ctx.quadraticCurveTo(-6, -14, -16, -6); ctx.lineTo(-22, -1); ctx.quadraticCurveTo(-22, 3, -17, 3); ctx.lineTo(8, 4); ctx.quadraticCurveTo(14, -1, 10, -9); ctx.closePath(); fillO(LG(-14, 4, '#a84a34', '#5a1e14'));
        for (let k = 0; k < 4; k++) poly([[-16 + k * 4, 3], [-14 + k * 4, 6], [-12 + k * 4, 3]], '#fff', false);
        poly([[2, -9], [8, -20], [8, -7]], '#3a140e', true); eyeGlow(-8, -6, '255,200,60', 2.2);
        if (open > 3) glowDot(-22, 4, 8 + open, '255,140,40', 0.8);
        rr(2, 2, 10, 4, 1.5); fillO('#3a3a44'); for (let k = 0; k < 2; k++) poly([[4 + k * 5, 2], [5.5 + k * 5, -2], [7 + k * 5, 2]], '#c9cdd6', true);
        ctx.restore(); });
    },
    'Eisjungfer Skadi'(e, t) {
      const atk = bossAtk(e), hov = Math.sin(t * 1.5) * 4 - 6;
      for (let i = 0; i < 10; i++) { const q = (t * 0.3 + i / 10) % 1; ctx.save(); ctx.translate(-50 + hash(i) * 100, -150 + q * 150); ctx.rotate(t + i); ctx.strokeStyle = `rgba(230,248,255,${0.8 * Math.sin(q * Math.PI)})`; ctx.lineWidth = 1; for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke(); } ctx.restore(); }
      // Kleid aus Eisschichten
      for (let l = 0; l < 3; l++) { const w = 34 - l * 7, y0 = -8 - l * 18; ctx.beginPath(); ctx.moveTo(-12 + l * 2, -96 + hov); ctx.quadraticCurveTo(-w, -40 + hov, -w - 4, y0 + hov); for (let i = 0; i <= 6; i++) ctx.lineTo(-w - 4 + i * (2 * w + 8) / 6, y0 + hov + (i % 2 ? 8 : 0)); ctx.quadraticCurveTo(w, -40 + hov, 12 - l * 2, -96 + hov); ctx.closePath(); fillO(LG(-96 + hov, y0 + hov, ['#bfe8ff', '#dff4ff', '#ffffff'][l], ['#4a8acd', '#7ab8e8', '#bfe8ff'][l])); }
      // Oberkörper und Arme
      ctx.beginPath(); ctx.moveTo(-12, -96 + hov); ctx.quadraticCurveTo(-14, -116 + hov, -6, -122 + hov); ctx.lineTo(6, -122 + hov); ctx.quadraticCurveTo(14, -116 + hov, 12, -96 + hov); ctx.closePath(); fillO(LG(-122 + hov, -96 + hov, '#e8f8ff', '#8ac0e8'));
      const sa = -1.3 - atk * 0.6;
      const hd = limb(-8, -114 + hov, sa, 14, 5, '#d8f0ff'); const hd2 = limb(hd[0], hd[1], sa - 0.6, 12, 4.4, '#e8f8ff');
      // Eisspeer
      ctx.save(); ctx.translate(hd2[0], hd2[1]); ctx.rotate(-1.75 - atk * 0.3); ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 40); ctx.stroke(); ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 2.4; ctx.stroke(); poly([[-4, 38], [0, 56], [4, 38]], '#e8f8ff', true); glowDot(0, 48, 12, '180,230,255', 0.6); ctx.restore();
      // Kopf, langes weißes Haar, Kristallkrone
      tube(bez([4, -134 + hov], [24, -128 + hov], [30 + Math.sin(t * 2) * 4, -100 + hov], [36 + Math.sin(t * 2) * 6, -70 + hov], 10), 10, 3, '#f4fbff');
      ctx.beginPath(); ctx.ellipse(-2, -134 + hov, 10, 11.5, 0, 0, 7); fillO(LG(-146 + hov, -122 + hov, '#ffffff', '#c8e4f4'));
      ctx.fillStyle = '#1a3a5a'; ctx.beginPath(); ctx.ellipse(-8, -135 + hov, 2, 2.6, 0, 0, 7); ctx.ellipse(-1, -135 + hov, 1.7, 2.4, 0, 0, 7); ctx.fill(); glowDot(-8, -135 + hov, 4, '120,220,255', 0.8);
      for (let i = 0; i < 5; i++) poly([[-10 + i * 5, -143 + hov], [-8 + i * 5, -154 - (i === 2 ? 8 : (i % 2) * 4) + hov], [-6 + i * 5, -143 + hov]], '#dff8ff', true);
      glowDot(0, -152 + hov, 10, '180,230,255', 0.6);
    },
    'Krötenkönig Quarg'(e, t) {
      const atk = bossAtk(e), sac = 1 + Math.max(0, Math.sin(t * 2.4)) * 0.35;
      // Zunge beim Angriff
      if (atk > 0) { const L = Math.sin((1 - atk) * Math.PI) * 70; ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-36, -44); ctx.quadraticCurveTo(-36 - L * 0.5, -60, -36 - L, -40); ctx.stroke(); ctx.strokeStyle = '#e86a8a'; ctx.lineWidth = 5.6; ctx.stroke(); ctx.beginPath(); ctx.arc(-36 - L, -40, 5, 0, 7); fillO('#ff8aaa'); }
      // Hinterbeine
      for (const s2 of [1, 0]) { ctx.beginPath(); ctx.ellipse(28 - s2 * 6, -18, 22, 16, -0.3, 0, 7); fillO(LG(-34, 0, s2 ? '#4a7a2e' : '#6aa84a', '#2e5a1e')); }
      // Körper
      ctx.beginPath(); ctx.ellipse(0, -46, 52, 42, 0, 0, 7); fillO(RG(-16, -70, 80, '#8ad060', '#2e6a1e'));
      ctx.fillStyle = 'rgba(30,80,20,.5)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-30 + hash(i) * 60, -80 + hash(i + 3) * 60, 3 + hash(i + 5) * 4, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(-14, -26, 30 * sac * 0.9, 18 * sac, 0, 0, 7); fillO(LG(-44, -8, '#fff2c0', '#d8c080'));
      // Vorderbeine
      for (const lx of [-38, -10]) { ctx.beginPath(); ctx.ellipse(lx, -8, 9, 7, 0, 0, 7); fillO('#5a9a3a'); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(lx - 8 + k * 6, -2, 3, 0, 7); fillO('#6ab84a'); } }
      // Augen und Krone
      for (const ex of [-30, -4]) { ctx.beginPath(); ctx.arc(ex, -84, 11, 0, 7); fillO('#7ac050'); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(ex - 2, -85, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.fillRect(ex - 7, -86.5, 10, 3); }
      ctx.strokeStyle = '#2e5a1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-46, -54); ctx.quadraticCurveTo(-20, -44, 8, -56); ctx.stroke();
      ctx.save(); ctx.translate(-16, -98); ctx.rotate(-0.15); crownAt(0, 0, 26); ctx.restore();
      // Zepter
      ctx.save(); ctx.translate(26, -40); ctx.rotate(0.3); ctx.strokeStyle = OUT; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, -40); ctx.stroke(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.beginPath(); ctx.arc(0, -44, 5, 0, 7); fillO('#7ad7ff'); glowDot(0, -44, 10, '122,215,255', 0.6); ctx.restore();
    },
    'Rosenkönigin Spina'(e, t) {
      const atk = bossAtk(e);
      // Dornenranke als Peitsche
      const L = 30 + atk * 50; tube(bez([-22, -84], [-40, -100], [-50 - L * 0.4, -60 + Math.sin(t * 3) * 10], [-40 - L, -30 + Math.sin(t * 2) * 8], 16), 5, 2.4, '#3a7a2a');
      for (let i = 0; i < 6; i++) { const q = i / 6, p = bez([-22, -84], [-40, -100], [-50 - L * 0.4, -60 + Math.sin(t * 3) * 10], [-40 - L, -30 + Math.sin(t * 2) * 8], 6)[i]; poly([[p[0], p[1] - 2], [p[0] - 2, p[1] - 6], [p[0] + 2, p[1] - 2]], '#d8f0c0', true); }
      // Kleid aus Blütenblättern
      for (let l = 0; l < 4; l++) { const w = 38 - l * 6, y0 = -l * 16; for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; ctx.save(); ctx.translate(Math.sin(a) * w * 0.7, y0 - 6); ctx.rotate(a * 0.6); ctx.beginPath(); ctx.ellipse(0, 0, 9, 14, 0, 0, 7); fillO(LG(-14, 14, ['#ff6b8a', '#ff8aa8', '#e5484d', '#ff9ab8'][l], '#8a1a3a')); ctx.restore(); } }
      ctx.beginPath(); ctx.moveTo(-12, -60); ctx.quadraticCurveTo(-14, -90, -6, -100); ctx.lineTo(6, -100); ctx.quadraticCurveTo(14, -90, 12, -60); ctx.closePath(); fillO(LG(-100, -60, '#ff8aa8', '#a8203a'));
      limb(-8, -94, -1.2 - atk * 0.6, 14, 4.4, '#9ad070'); limb(10, -94, 0.4, 14, 4.4, '#7ab050');
      // Kopf mit grüner Haut, Rosenhaar
      ctx.beginPath(); ctx.ellipse(0, -112, 10, 11, 0, 0, 7); fillO(LG(-123, -101, '#c8f0a0', '#7ab050'));
      ctx.fillStyle = '#1a3a12'; ctx.beginPath(); ctx.ellipse(-6, -113, 1.8, 2.4, 0, 0, 7); ctx.ellipse(0, -113, 1.6, 2.2, 0, 0, 7); ctx.fill(); glowDot(-6, -113, 4, '255,100,150', 0.7);
      ctx.strokeStyle = '#8a1a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -106); ctx.quadraticCurveTo(-3, -104, 0, -106); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = Math.PI * (0.95 + i * 0.22); const rx = Math.cos(a) * 12, ry = -114 + Math.sin(a) * 12; ctx.beginPath(); ctx.arc(rx, ry, 5.5, 0, 7); fillO('#e5484d'); ctx.strokeStyle = '#8a1a3a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(rx, ry, 3, 0, 5); ctx.stroke(); }
      crownAt(0, -126, 18, '#7ab050', '#ff6b8a');
    },
    'Gräfin Sanguina'(e, t) {
      const atk = bossAtk(e), fl = Math.sin(t * 3) * 0.12;
      glowDot(20, -130, 40, '255,40,60', 0.25); ctx.beginPath(); ctx.arc(20, -130, 22, 0, 7); ctx.fillStyle = 'rgba(200,30,50,.35)'; ctx.fill();
      // Fledermausflügel
      for (const s2 of [1, -1]) { ctx.save(); ctx.translate(s2 * 10, -96); ctx.scale(s2, 1); ctx.rotate(-0.2 - fl);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, -30); ctx.lineTo(50, -36); ctx.quadraticCurveTo(44, -26, 48, -14); ctx.quadraticCurveTo(38, -18, 34, -6); ctx.quadraticCurveTo(24, -10, 18, 2); ctx.closePath(); fillO(LG(-36, 0, '#4a1a2a', '#1a0610')); ctx.restore(); }
      // Ballkleid
      ctx.beginPath(); ctx.moveTo(-12, -78); ctx.quadraticCurveTo(-46, -30, -48, 0); ctx.quadraticCurveTo(0, 6, 48, 0); ctx.quadraticCurveTo(46, -30, 12, -78); ctx.closePath(); fillO(LG(-78, 0, '#c41a3a', '#4a0614'));
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.4; for (const xx of [-28, -12, 6, 22]) { ctx.beginPath(); ctx.moveTo(xx * 0.3, -70); ctx.quadraticCurveTo(xx, -30, xx * 1.4, -2); ctx.stroke(); }
      ctx.strokeStyle = '#1a0610'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-48, -1); ctx.quadraticCurveTo(0, 5, 48, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, -78); ctx.quadraticCurveTo(-14, -100, -6, -106); ctx.lineTo(6, -106); ctx.quadraticCurveTo(14, -100, 11, -78); ctx.closePath(); fillO(LG(-106, -78, '#a8102a', '#5a0618'));
      // Arm mit Fächer
      const a1 = -1.1 - atk * 0.7; const el = limb(-8, -100, a1, 12, 4, '#f0e6ee'); const hd = limb(el[0], el[1], a1 - 0.5, 10, 3.6, '#f0e6ee');
      ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(-0.8 - atk); for (let i = 0; i < 7; i++) { ctx.save(); ctx.rotate(-0.7 + i * 0.23); poly([[0, 0], [-2, -16], [2, -16]], i % 2 ? '#1a0610' : '#c41a3a', true); ctx.restore(); } ctx.restore();
      // Kopf
      ctx.beginPath(); ctx.ellipse(0, -118, 10, 11.5, 0, 0, 7); fillO(LG(-130, -106, '#ffffff', '#d8c8d0'));
      ctx.beginPath(); ctx.moveTo(-10, -118); ctx.quadraticCurveTo(-12, -136, 2, -134); ctx.quadraticCurveTo(14, -132, 10, -112); ctx.quadraticCurveTo(14, -100, 20, -96); ctx.quadraticCurveTo(6, -98, 6, -114); ctx.quadraticCurveTo(2, -126, -10, -118); ctx.closePath(); fillO('#1a0a14');
      eyeGlow(-6, -119, '255,40,60', 2); ctx.fillStyle = '#8a0a1a'; ctx.beginPath(); ctx.ellipse(-4, -111, 2.6, 1.2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; poly([[-6, -111], [-5, -108], [-4, -111]], '#fff', false);
      crownAt(0, -132, 14, '#c9cdd6', '#e5484d');
    },
    'Kometenreiter'(e, t) {
      const atk = bossAtk(e), hov = Math.sin(t * 2) * 4 - 20;
      // Feuerschweif
      for (let i = 0; i < 14; i++) { const q = i / 14; glowDot(20 + q * 90, -50 + hov - q * 20 + Math.sin(t * 6 + i) * 4, 22 * (1 - q * 0.7), q < 0.3 ? '255,240,180' : '255,140,60', 0.6 * (1 - q)); }
      // Komet als Reittier
      ctx.beginPath(); ctx.moveTo(-40, -50 + hov); ctx.quadraticCurveTo(-36, -80 + hov, 0, -82 + hov); ctx.quadraticCurveTo(40, -78 + hov, 46, -50 + hov); ctx.quadraticCurveTo(30, -22 + hov, 0, -22 + hov); ctx.quadraticCurveTo(-30, -24 + hov, -40, -50 + hov); ctx.closePath(); fillO(RG(-14, -62 + hov, 50, '#8a7060', '#3a2a24'));
      ctx.strokeStyle = 'rgba(255,170,60,.8)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-20 + i * 14, -70 + hov); ctx.lineTo(-14 + i * 14, -56 + hov); ctx.lineTo(-22 + i * 14, -40 + hov); ctx.stroke(); }
      glowDot(0, -50 + hov, 30, '255,150,60', 0.3);
      // Reiter in Rüstung
      ctx.save(); ctx.translate(0, -80 + hov);
      limb(-4, -10, 0.6, 10, 6, '#c8b070'); limb(4, -10, 0.2, 10, 6, '#e8d090');
      ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.quadraticCurveTo(12, -26, 8, -36); ctx.lineTo(-8, -36); ctx.quadraticCurveTo(-12, -26, -10, -8); ctx.closePath(); fillO(LG(-36, -8, '#fff2b0', '#c8902a'));
      ctx.beginPath(); ctx.arc(0, -46, 10, 0, 7); fillO(LG(-56, -36, '#fff6c8', '#c8902a')); rr(-10, -48, 10, 3, 1); fillO('#1b1726'); eyeGlow(-6, -46.5, '255,240,170', 1.6);
      for (let i = 0; i < 5; i++) { const q = (t * 2 + i / 5) % 1; glowDot(4 + q * 10, -56 - q * 14, 4 * (1 - q), '255,200,80', 0.8); }
      // Lanze
      ctx.save(); ctx.translate(-8, -26); ctx.rotate(1.45 + atk * 0.25 + Math.sin(t * 2) * 0.03); ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 54); ctx.stroke(); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 3; ctx.stroke(); poly([[-5, 52], [0, 70 + atk * 10], [5, 52]], '#fff6d8', true); glowDot(0, 64, 10, '255,220,120', 0.7); ctx.restore();
      ctx.restore();
    },
    'Zeitweber Chronos'(e, t) {
      const atk = bossAtk(e), hov = Math.sin(t * 1.3) * 3 - 6;
      // Ziffernblatt-Heiligenschein
      ctx.save(); ctx.translate(4, -116 + hov); ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fillStyle = 'rgba(200,230,255,.18)'; ctx.fill(); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = '#ffd27a'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.fillRect(Math.cos(a) * 29 - 1, Math.sin(a) * 29 - 1, 2.4, 2.4); }
      ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 2 - 1.57) * 26, Math.sin(t * 2 - 1.57) * 26); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 0.2 - 1.57) * 18, Math.sin(t * 0.2 - 1.57) * 18); ctx.stroke(); ctx.restore();
      gear(40, -60 + hov, 9, t, '#c9a64a'); gear(-44, -90 + hov, 7, -t * 1.4, '#9aa3ad');
      // Robe
      ctx.beginPath(); ctx.moveTo(-14, -100 + hov); ctx.quadraticCurveTo(-30, -50 + hov, -34, -2); ctx.lineTo(34, -2); ctx.quadraticCurveTo(30, -50 + hov, 14, -100 + hov); ctx.closePath(); fillO(LG(-100 + hov, 0, '#4a6ab8', '#1a2450'));
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-34, -4); ctx.lineTo(34, -4); ctx.stroke(); for (let i = 0; i < 4; i++) sparkle(-16 + i * 11, -50 + (i % 2) * 18 + hov, 2.4, 0.8);
      // Arm mit Sanduhr
      const a1 = -1.2 - atk * 0.5; const el = limb(-10, -94 + hov, a1, 12, 5, '#5a7ac8'); const hd = limb(el[0], el[1], a1 - 0.4, 11, 4.4, '#4a6ab8');
      ctx.save(); ctx.translate(hd[0] - 6, hd[1] - 6); ctx.rotate(t * 0.5 + atk * 3);
      rr(-7, -12, 14, 3, 1); fillO('#c9a64a'); rr(-7, 9, 14, 3, 1); fillO('#c9a64a');
      ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(5, -9); ctx.lineTo(0.8, 0); ctx.lineTo(5, 9); ctx.lineTo(-5, 9); ctx.lineTo(-0.8, 0); ctx.closePath(); ctx.fillStyle = 'rgba(220,240,255,.7)'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(-3, 9); ctx.lineTo(3, 9); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      // Kopf mit langem Bart
      ctx.beginPath(); ctx.moveTo(-8, -104 + hov); ctx.quadraticCurveTo(-10, -80 + hov, 0, -70 + hov); ctx.quadraticCurveTo(10, -80 + hov, 8, -104 + hov); ctx.closePath(); fillO('#f4f4f8');
      ctx.beginPath(); ctx.ellipse(0, -112 + hov, 9, 10, 0, 0, 7); fillO(LG(-122 + hov, -102 + hov, '#f8e4cc', '#d8b494'));
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-5, -114 + hov, 2, 1.4, 0, 0, 7); ctx.ellipse(1, -114 + hov, 1.8, 1.3, 0, 0, 7); ctx.fill(); glowDot(-5, -114 + hov, 3, '150,220,255', 0.8);
      ctx.beginPath(); ctx.moveTo(-10, -114 + hov); ctx.quadraticCurveTo(-8, -126 + hov, 2, -124 + hov); ctx.quadraticCurveTo(10, -122 + hov, 10, -112 + hov); ctx.quadraticCurveTo(4, -118 + hov, -10, -114 + hov); ctx.closePath(); fillO('#4a6ab8');
    },
    'Leere-Titan'(e, t) {
      ctx.scale(0.8, 0.8);
      const atk = bossAtk(e, 0.6), br = Math.sin(t * 0.9) * 2;
      // Beine
      for (const [lx, d] of [[22, 1], [-18, 0]]) { const kn = limb(lx, -50, d ? 0.05 : -0.05, 24, 18, d ? '#1a1430' : '#2a2048'); limb(kn[0], kn[1], 0, 22, 16, d ? '#140f26' : '#221a3c'); }
      // Rumpf aus Obsidian mit Rissen, durch die die Leere scheint
      ctx.save(); ctx.beginPath(); ctx.moveTo(-40, -50); ctx.lineTo(42, -50); ctx.lineTo(50, -110 + br); ctx.lineTo(30, -150 + br); ctx.lineTo(-26, -152 + br); ctx.lineTo(-48, -112 + br); ctx.closePath(); fillO(LG(-152, -50, '#3a2e5a', '#120c22')); ctx.clip();
      const cracks = [[-30, -130, -10, -110, -16, -84, 4, -64], [20, -140, 10, -116, 26, -96, 14, -60], [-40, -90, -24, -80, -30, -60]];
      for (const c of cracks) { ctx.beginPath(); ctx.moveTo(c[0], c[1] + br); for (let i = 2; i < c.length; i += 2) ctx.lineTo(c[i], c[i + 1] + br); ctx.strokeStyle = 'rgba(160,120,255,.9)'; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); }
      for (let i = 0; i < 20; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.sin(t * 2 + i)})`; ctx.fillRect(-40 + hash(i) * 86, -150 + hash(i + 4) * 96 + br, 1.4, 1.4); }
      ctx.restore();
      // Arme: der vordere schlägt
      const sa = atk > 0 ? -2.2 + 2.6 * eOut(1 - atk) : 0.2 + Math.sin(t) * 0.04;
      const el = limb(-46, -132 + br, sa, 30, 18, '#2a2048', 'rgba(160,120,255,.25)'); const fs = limb(el[0], el[1], sa - 0.3, 26, 16, '#221a3c');
      ctx.beginPath(); ctx.arc(fs[0], fs[1], 13, 0, 7); fillO(RG(fs[0] - 4, fs[1] - 4, 16, '#4a3a7a', '#120c22')); glowDot(fs[0], fs[1], 16, '160,120,255', 0.4 + atk * 0.4);
      limb(44, -132 + br, 0.25, 30, 16, '#1a1430');
      // Kopf: schmaler Block mit einem riesigen Auge
      ctx.save(); ctx.translate(0, -166 + br); rr(-20, -18, 40, 30, 8); fillO(LG(-18, 12, '#3a2e5a', '#120c22'));
      ctx.beginPath(); ctx.ellipse(-4, -3, 12, 9, 0, 0, 7); ctx.fillStyle = '#05030a'; ctx.fill(); glowDot(-4, -3, 22, '160,120,255', 0.8);
      ctx.fillStyle = '#e8d8ff'; ctx.beginPath(); ctx.ellipse(-6 - atk * 2, -3, 4.5, 6.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.ellipse(-6.5 - atk * 2, -3, 1.6, 5, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) poly([[-14 + i * 14, -18], [-10 + i * 14, -30 - (i === 1 ? 8 : 0)], [-6 + i * 14, -18]], '#2a2048', true);
      ctx.restore();
    },
  };
  // ---------- Überarbeitete Gebietsbosse (Version 7) ----------
  Object.assign(BOSS_ART, {
    4(e, t, col, hit, ph) { // Frostriese: zotteliger Eisriese mit Kristallfäusten
      const atk = bossAtk(e), br = Math.sin(t * 1.4) * 1.5, C = c => (hit ? '#fff' : c);
      for (let i = 0; i < 4; i++) { const q = (t * 0.6 + i / 4) % 1; ctx.fillStyle = `rgba(220,240,255,${0.4 * (1 - q)})`; ctx.beginPath(); ctx.arc(-34 - q * 20, -112 - q * 6, 4 + q * 8, 0, 7); ctx.fill(); }
      for (const [lx, d] of [[20, 1], [-16, 0]]) { const kn = limb(lx, -46, d ? 0.1 : -0.08, 22, 18, C(d ? '#9ab8d0' : '#c8e0f0')); const ft = limb(kn[0], kn[1], 0, 20, 16, C(d ? '#8aa8c0' : '#b8d4e8')); ctx.beginPath(); ctx.ellipse(ft[0] - 4, ft[1] - 4, 15, 7, 0, 0, 7); fillO(C('#e8f4ff')); }
      // hinterer Arm
      { const el = limb(38, -122 + br, 0.25, 30, 18, C('#9ab8d0')); limb(el[0], el[1], 0.05, 24, 16, C('#8aa8c0')); }
      // zotteliger Leib
      ctx.beginPath(); ctx.moveTo(-40, -60); for (let i = 0; i <= 10; i++) ctx.lineTo(-40 + i * 8.5, -50 + (i % 2) * 8); ctx.quadraticCurveTo(54, -110, 30, -145 + br); ctx.quadraticCurveTo(0, -158 + br, -32, -142 + br); ctx.quadraticCurveTo(-56, -110, -40, -60); ctx.closePath(); fillO(hit ? '#fff' : LG(-158, -50, '#ffffff', '#8ab0cc'));
      ctx.strokeStyle = 'rgba(100,140,180,.45)'; ctx.lineWidth = 1.4; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-30 + i * 8, -130 + (i % 3) * 8 + br); ctx.lineTo(-33 + i * 8, -115 + (i % 3) * 8 + br); ctx.stroke(); }
      // Kopf mit Eiszapfenbart und Eiskrone
      ctx.save(); ctx.translate(-14, -150 + br); ctx.rotate(-0.08 - atk * 0.1);
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 17, 0, 0, 7); fillO(hit ? '#fff' : LG(-17, 17, '#ffffff', '#a8c8e0'));
      for (let i = 0; i < 6; i++) poly([[-14 + i * 5, 8], [-12 + i * 5, 22 + (i % 2) * 6], [-10 + i * 5, 8]], C('#d8f0ff'), true);
      for (const ex of [-10, 2]) eyeGlow(ex, -2, '120,210,255', 3);
      ctx.fillStyle = '#4a6a8a'; ctx.fillRect(-14, -8, 9, 2); ctx.fillRect(-2, -8, 9, 2);
      for (let i = 0; i < 5; i++) poly([[-16 + i * 8, -12], [-13 + i * 8, -30 - (i === 2 ? 10 : (i % 2) * 6)], [-10 + i * 8, -12]], C('#bfe8ff'), true);
      glowDot(0, -30, 18, '180,230,255', 0.4);
      ctx.restore();
      // vorderer Arm mit Kristallfaust, schlägt zu
      const sa = atk > 0 ? strike(1 - atk, -2.4, -4.6, 0.2, 0.15, 0.45, 0.2 - Math.PI * 2) : 0.2 + Math.sin(t * 1.1) * 0.05;
      const el = limb(-40, -124 + br, sa, 30, 19, C('#c8e0f0'), 'rgba(255,255,255,.35)'); const fs = limb(el[0], el[1], sa - 0.1, 24, 17, C('#b8d4e8'));
      ctx.save(); ctx.translate(fs[0], fs[1]); for (let i = 0; i < 5; i++) { ctx.rotate(1.25); poly([[-5, 0], [0, -16], [5, 0]], C('#7ad7ff'), true); } ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); fillO(C('#e8f8ff')); glowDot(0, 0, 18, '122,215,255', 0.5); ctx.restore();
    },
    8(e, t, col, hit, ph) { // Magmatitan: Basaltbrocken, glühende Risse, Lavatropfen
      const atk = bossAtk(e), br = Math.sin(t * 1.2) * 1.5, C = c => (hit ? '#fff' : c), lava = 0.7 + 0.3 * Math.sin(t * 4);
      const rock = (y0, y1) => (hit ? '#fff' : LG(y0, y1, '#5a4a4a', '#1e1414'));
      for (let i = 0; i < 6; i++) { const q = (t * 0.7 + i / 6) % 1; glowDot(-30 + hash(i) * 70, -60 - q * 110, 3 * (1 - q), '255,160,60', 0.8); }
      for (const [lx, d] of [[22, 1], [-18, 0]]) { const kn = limb(lx, -50, 0, 22, 20, C(d ? '#2a2020' : '#3a2e2e')); const ft = limb(kn[0], kn[1], 0, 20, 18, C(d ? '#241a1a' : '#342828')); rr(ft[0] - 16, ft[1] - 10, 30, 10, 3); fillO(rock(-10, 0)); glowDot(ft[0], ft[1] - 4, 12, '255,120,40', 0.3 * lava); }
      { const el = limb(40, -122 + br, 0.25, 28, 20, C('#2a2020')); limb(el[0], el[1], 0.05, 24, 18, C('#241a1a')); }
      // Rumpf aus Brocken
      ctx.save(); ctx.beginPath(); ctx.moveTo(-44, -54); ctx.lineTo(46, -54); ctx.lineTo(54, -108 + br); ctx.lineTo(36, -148 + br); ctx.lineTo(-30, -150 + br); ctx.lineTo(-52, -112 + br); ctx.closePath(); fillO(rock(-150, -54)); ctx.clip();
      ctx.strokeStyle = `rgba(255,${120 + lava * 60},40,1)`; ctx.lineWidth = 3.4; ctx.lineJoin = 'round';
      for (const c of [[-34, -134, -14, -118, -22, -96, 0, -78, -8, -58], [26, -140, 14, -118, 30, -100, 16, -60], [-46, -96, -28, -86, -36, -64]]) { ctx.beginPath(); ctx.moveTo(c[0], c[1] + br); for (let i = 2; i < c.length; i += 2) ctx.lineTo(c[i], c[i + 1] + br); ctx.stroke(); }
      ctx.restore();
      if (!hit) { glowDot(0, -104 + br, 34, '255,140,40', 0.55 * lava); ctx.beginPath(); ctx.arc(0, -104 + br, 11, 0, 7); ctx.fillStyle = RG(-3, -107 + br, 13, '#fff6c0', '#ff7a1a'); ctx.fill(); }
      // Kopf mit Hörnern und Flammenaugen
      ctx.save(); ctx.translate(-10, -158 + br); rr(-20, -14, 40, 26, 7); fillO(rock(-14, 12));
      for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s2 * 14, -10); ctx.quadraticCurveTo(s2 * 30, -16, s2 * 26, -34); ctx.quadraticCurveTo(s2 * 20, -20, s2 * 8, -14); ctx.closePath(); fillO(C('#3a2a2a')); }
      for (const ex of [-10, 4]) { eyeGlow(ex, -2, '255,160,40', 3.2); for (let k = 0; k < 3; k++) { const q = (t * 2 + k / 3 + ex) % 1; glowDot(ex + 1, -6 - q * 10, 3 * (1 - q), '255,140,40', 0.8); } }
      ctx.strokeStyle = `rgba(255,140,40,${lava})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 7); ctx.lineTo(10, 7); ctx.stroke();
      ctx.restore();
      // vorderer Arm schlägt
      const sa = atk > 0 ? strike(1 - atk, -2.4, -4.5, 0.25, 0.15, 0.45, 0.25 - Math.PI * 2) : 0.25 + Math.sin(t) * 0.04;
      const el = limb(-46, -126 + br, sa, 30, 21, C('#3a2e2e'), 'rgba(255,140,40,.3)'); const fs = limb(el[0], el[1], sa - 0.1, 26, 19, C('#342828'));
      ctx.beginPath(); ctx.arc(fs[0], fs[1], 14, 0, 7); fillO(rock(fs[1] - 14, fs[1] + 14)); glowDot(fs[0], fs[1], 18, '255,120,40', 0.45 + atk * 0.4);
      for (let i = 0; i < 3; i++) { const q = (t * 0.9 + i / 3) % 1; ctx.fillStyle = `rgba(255,${140 + q * 80},40,${1 - q})`; ctx.beginPath(); ctx.ellipse(fs[0] + (i - 1) * 6, fs[1] + 12 + q * 30, 2.4, 3.4, 0, 0, 7); ctx.fill(); }
    },
    10(e, t, col, hit, ph) { // Sternenwächter: himmlischer Ritter mit Nachthimmel-Umhang und Lichtschwert
      const atk = bossAtk(e), br = Math.sin(t * 1.3) * 1.5, C = c => (hit ? '#fff' : c);
      const armor = (y0, y1) => (hit ? '#fff' : LG(y0, y1, '#4a6ad8', '#141e5a'));
      // Sternenumhang
      ctx.save(); ctx.beginPath(); ctx.moveTo(-6, -140 + br); ctx.quadraticCurveTo(50 + Math.sin(t * 2) * 6, -100, 46 + Math.sin(t * 2.4) * 8, -6); ctx.lineTo(-10, -4); ctx.closePath(); fillO(hit ? '#fff' : LG(-140, 0, '#2a2a7a', '#0a0a2a')); ctx.clip();
      if (!hit) for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.sin(t * 3 + i)})`; ctx.fillRect(-4 + hash(i) * 50, -130 + hash(i + 3) * 124, 1.6, 1.6); }
      ctx.restore();
      // Heiligenring
      ctx.save(); ctx.translate(-6, -186 + br); ctx.rotate(t * 0.5); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 16, 5, 0, 0, 7); ctx.stroke(); ctx.restore(); glowDot(-6, -186 + br, 16, '255,220,140', 0.35);
      for (const [lx, d] of [[14, 1], [-16, 0]]) { const kn = limb(lx, -60, d ? 0.08 : -0.06, 26, 13, d ? C('#22307a') : C('#3a52b8')); const ft = limb(kn[0], kn[1], 0, 26, 12, d ? C('#1c286a') : C('#3048a8')); ctx.beginPath(); ctx.moveTo(ft[0] - 14, ft[1]); ctx.lineTo(ft[0] + 6, ft[1]); ctx.lineTo(ft[0] + 4, ft[1] - 8); ctx.lineTo(ft[0] - 10, ft[1] - 8); ctx.closePath(); fillO(C('#ffd27a')); }
      // Rüstung
      ctx.beginPath(); ctx.moveTo(-26, -60); ctx.lineTo(24, -60); ctx.quadraticCurveTo(32, -110, 26, -144 + br); ctx.quadraticCurveTo(0, -152 + br, -28, -144 + br); ctx.quadraticCurveTo(-34, -110, -26, -60); ctx.closePath(); fillO(armor(-152, -60));
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-1, -144 + br); ctx.lineTo(-1, -64); ctx.stroke(); if (!hit) { ctx.save(); ctx.translate(-1, -112 + br); ctx.fillStyle = '#ffd27a'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); poly([[-3, 0], [0, -12], [3, 0]], '#ffe8a0', false); } ctx.restore(); glowDot(-1, -112 + br, 16, '255,230,150', 0.5); }
      for (const sx of [-26, 24]) { ctx.beginPath(); ctx.ellipse(sx, -140 + br, 13, 9, 0, Math.PI, 0); ctx.closePath(); fillO(armor(-150, -132)); ctx.fillStyle = '#ffd27a'; ctx.fillRect(sx - 12, -141 + br, 24, 2); }
      // Helm mit Sehschlitz aus Licht
      ctx.save(); ctx.translate(-4, -160 + br); ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-15, -6); ctx.quadraticCurveTo(-12, -18, 0, -18); ctx.quadraticCurveTo(12, -18, 14, -6); ctx.lineTo(13, 10); ctx.closePath(); fillO(armor(-18, 10));
      ctx.fillStyle = '#ffd27a'; ctx.fillRect(-1.5, -18, 3, 26); if (!hit) { glowDot(-6, -2, 12, '160,200,255', 0.8); ctx.fillStyle = '#d8eaff'; ctx.fillRect(-14, -4, 12, 3); }
      poly([[-2, -18], [4, -34], [8, -16]], C('#ffd27a'), true); ctx.restore();
      // Lichtschwert
      const sa = atk > 0 ? strike(1 - atk, -2.5, -4.7, 0.5, 0.15, 0.45, 0.5 - Math.PI * 2) : 0.5 + Math.sin(t * 1.2) * 0.04;
      const el = limb(-26, -134 + br, sa, 24, 11, C('#3a52b8')); const hd = limb(el[0], el[1], sa + 0.5, 20, 10, C('#30489f'));
      ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(-(atk > 0 ? sa + 0.6 : 2.3)); bladeY(70, 8, '#ffffff', '#9fd0ff', '#ffd27a', '#2a2a6a', '#ffd27a'); if (!hit) glowDot(0, 40, 30, '160,210,255', 0.35); ctx.restore();
      hand(hd[0], hd[1], C('#ffd27a'), 5);
      if (atk > 0.1 && atk < 0.9) smear(-26, -134 + br, 74, -2.4, Math.max(-4.7, sa), '180,220,255', atk);
    },
    12(e, t, col, hit, ph) { // Geisterkönig: durchscheinender König mit Ketten, Krone und Zepter
      const atk = bossAtk(e), hov = Math.sin(t * 1.5) * 5 - 10;
      for (let i = 0; i < 6; i++) { const a = t * 0.9 + i * 1.05; glowDot(Math.cos(a) * 56, -90 + Math.sin(a) * 26 + hov, 6, '150,255,220', 0.6); }
      ctx.save(); ctx.globalAlpha *= hit ? 1 : 0.9;
      ctx.beginPath(); ctx.moveTo(-26, -120 + hov); ctx.quadraticCurveTo(-48, -60 + hov, -40, -12 + hov); for (let i = 0; i <= 8; i++) ctx.lineTo(-40 + i * 10, -12 + hov + Math.sin(t * 3.4 + i) * 5 + (i % 2 ? 8 : 0)); ctx.quadraticCurveTo(48, -60 + hov, 26, -120 + hov); ctx.closePath();
      fillO(hit ? '#fff' : LG(-120 + hov, -10 + hov, 'rgba(200,255,240,.95)', 'rgba(60,150,140,.25)'));
      // Ketten
      ctx.strokeStyle = 'rgba(80,110,120,.9)'; ctx.lineWidth = 2; for (let k = 0; k < 2; k++) for (let i = 0; i < 8; i++) { const xx = -30 + i * 8, yy = -80 + k * 26 + Math.sin(i * 0.8) * 4 + hov; ctx.beginPath(); ctx.ellipse(xx, yy, 3.6, 2.2, i % 2 ? 0 : Math.PI / 2, 0, 7); ctx.stroke(); }
      // Umhang-Kragen und Kopf
      ctx.beginPath(); ctx.moveTo(-30, -122 + hov); ctx.quadraticCurveTo(0, -112 + hov, 30, -122 + hov); ctx.lineTo(24, -136 + hov); ctx.quadraticCurveTo(0, -126 + hov, -24, -136 + hov); ctx.closePath(); fillO(hit ? '#fff' : '#3a7a7a');
      ctx.beginPath(); ctx.ellipse(-2, -146 + hov, 15, 17, 0, 0, 7); fillO(hit ? '#fff' : LG(-163 + hov, -129 + hov, '#f0fffa', '#90d8c8'));
      for (const ex of [-9, 3]) { ctx.fillStyle = '#0a2a2a'; ctx.beginPath(); ctx.ellipse(ex, -148 + hov, 4, 5.4, 0, 0, 7); ctx.fill(); if (!hit) glowDot(ex, -148 + hov, 7, '150,255,220', 0.9); }
      ctx.fillStyle = '#0a2a2a'; ctx.beginPath(); ctx.ellipse(-4, -136 + hov, 4, 2.4 + atk * 4, 0, 0, 7); ctx.fill();
      // Bart aus Nebel
      for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(220,255,245,${0.6 - i * 0.12})`; ctx.beginPath(); ctx.ellipse(-4 + Math.sin(t * 2 + i) * 2, -128 + i * 7 + hov, 8 - i, 5, 0, 0, 7); ctx.fill(); }
      ctx.save(); ctx.translate(-2, -164 + hov); crownAt(0, 0, 30, '#c9cdd6', '#6be0b8'); ctx.restore(); glowDot(-2, -176 + hov, 12, '150,255,220', 0.4);
      // Zepter-Arm
      const a1 = -1.2 - atk * 0.7; const el = limb(-24, -118 + hov, a1, 18, 7, hit ? '#fff' : 'rgba(190,250,235,.95)'); const hd = limb(el[0], el[1], a1 - 0.4, 16, 6, hit ? '#fff' : 'rgba(190,250,235,.95)');
      ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(-0.4 - atk * 0.6); ctx.strokeStyle = OUT; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, -40); ctx.stroke(); ctx.strokeStyle = '#c9cdd6'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.beginPath(); ctx.arc(0, -44, 6, 0, 7); fillO('#6be0b8'); glowDot(0, -44, 14 + atk * 10, '107,224,184', 0.7); ctx.restore();
      ctx.restore();
    },
    14(e, t, col, hit, ph) { // Sturmtitan: Riese mit Wolkenbart, Blitzkrone und Dreizack
      const atk = bossAtk(e), br = Math.sin(t * 1.3) * 1.5, C = c => (hit ? '#fff' : c), fl = Math.sin(t * 13) > 0.6;
      const skin = (y0, y1) => (hit ? '#fff' : LG(y0, y1, '#b8c8e0', '#5a6a88'));
      // Sturmwolken hinten
      for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(90,100,130,${0.5})`; ctx.beginPath(); ctx.arc(-40 + i * 18 + Math.sin(t * 0.7 + i) * 4, -186 + (i % 2) * 8 + br, 16, 0, 7); ctx.fill(); }
      if (fl && !hit) { ctx.strokeStyle = 'rgba(255,248,180,.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(30, -186); ctx.lineTo(22, -160); ctx.lineTo(32, -150); ctx.lineTo(20, -120); ctx.stroke(); glowDot(26, -150, 30, '255,248,180', 0.4); }
      for (const [lx, d] of [[20, 1], [-16, 0]]) { const kn = limb(lx, -54, d ? 0.06 : -0.06, 24, 17, C(d ? '#5a6a88' : '#8a9ab8')); const ft = limb(kn[0], kn[1], 0, 22, 15, C(d ? '#4a5a78' : '#7a8aa8')); rr(ft[0] - 14, ft[1] - 8, 26, 8, 3); fillO(C('#c9a64a')); }
      { const el = limb(38, -128 + br, 0.3, 28, 17, C('#6a7a98')); limb(el[0], el[1], 0.1, 24, 15, C('#5a6a88')); }
      // Körper mit Lendentuch und Gürtel
      ctx.beginPath(); ctx.moveTo(-36, -54); ctx.lineTo(36, -54); ctx.quadraticCurveTo(46, -110, 34, -150 + br); ctx.quadraticCurveTo(0, -160 + br, -34, -150 + br); ctx.quadraticCurveTo(-46, -110, -36, -54); ctx.closePath(); fillO(skin(-160, -54));
      ctx.strokeStyle = 'rgba(60,70,100,.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-14, -130 + br); ctx.quadraticCurveTo(-4, -120, 6, -130 + br); ctx.moveTo(-20, -100); ctx.quadraticCurveTo(-2, -92, 16, -100); ctx.stroke();
      rr(-38, -66, 76, 12, 3); fillO(C('#c9a64a')); ctx.beginPath(); ctx.arc(0, -60, 8, 0, 7); fillO(C('#ffd23f')); ctx.strokeStyle = '#1b1726'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(1, -66); ctx.lineTo(-3, -60); ctx.lineTo(2, -60); ctx.lineTo(-2, -54); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-34, -56); ctx.lineTo(34, -56); ctx.lineTo(30, -30); ctx.lineTo(-30, -30); ctx.closePath(); fillO(C('#3a4a6a'));
      // Kopf mit Wolkenbart und Blitzkrone
      ctx.save(); ctx.translate(-8, -164 + br);
      ctx.beginPath(); ctx.ellipse(0, 0, 17, 18, 0, 0, 7); fillO(skin(-18, 18));
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-14 + i * 4.6, 12 + (i % 2) * 6 + Math.sin(t * 2 + i), 7, 0, 7); fillO(C(i % 2 ? '#e8ecf4' : '#c8d0e0')); }
      for (const ex of [-9, 3]) eyeGlow(ex, -3, '255,248,180', 2.8);
      ctx.strokeStyle = '#3a4a6a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-14, -9); ctx.lineTo(-5, -7); ctx.moveTo(0, -7); ctx.lineTo(8, -9); ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(-14 + i * 7, -16); ctx.rotate((i - 2) * 0.2); poly([[-2.5, 0], [1, -10], [-1, -10], [2.5, -20], [3, -8], [0.5, -8], [3, 0]], C('#ffe85a'), true); ctx.restore(); }
      glowDot(0, -26, 20, '255,248,180', 0.45);
      ctx.restore();
      // Dreizack-Arm
      const sa = atk > 0 ? strike(1 - atk, -2.2, -4.4, 0.4, 0.15, 0.45, 0.4 - Math.PI * 2) : 0.4 + Math.sin(t * 1.1) * 0.04;
      const el = limb(-38, -132 + br, sa, 28, 17, C('#8a9ab8'), 'rgba(255,255,255,.25)'); const hd = limb(el[0], el[1], sa + 0.4, 24, 15, C('#7a8aa8'));
      ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(-(atk > 0 ? sa + 0.5 : 2.6));
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 60); ctx.stroke(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3.6; ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-10, 72); ctx.lineTo(-10, 60); ctx.lineTo(10, 60); ctx.lineTo(10, 72); ctx.moveTo(0, 60); ctx.lineTo(0, 78); ctx.stroke(); ctx.strokeStyle = '#ffe85a'; ctx.lineWidth = 3; ctx.stroke();
      if (!hit) glowDot(0, 70, 16 + atk * 14, '255,248,180', 0.6); ctx.restore();
      hand(hd[0], hd[1], C('#b8c8e0'), 6);
    },
  });
  // ---------- Neu gestaltet (Version 7): Höllenfürst und Kristallspinne ----------
  Object.assign(BOSS_ART, {
    3(e, t, col, hit, ph) { // Höllenfürst: gehörnter Dämonenfürst mit Flammenkrone, Fledermausflügeln und glühendem Dreizack
      const atk = bossAtk(e, 0.5), br = Math.sin(t * 1.5) * 1.6, C = c => (hit ? '#fff' : c), fl = 0.75 + 0.25 * Math.sin(t * 7);
      const skin = (y0, y1) => (hit ? '#fff' : LG(y0, y1, '#e0483a', '#7a1812'));
      // Glut am Boden
      for (let i = 0; i < 7; i++) { const q = (t * 0.8 + i / 7) % 1; glowDot(-40 + hash(i + 3) * 80, -q * 120, 2.6 * (1 - q), '255,140,50', 0.9); }
      // Flügel hinten (schlagen langsam)
      const fw = Math.sin(t * 2.2) * 0.12;
      for (const [sx, k] of [[1, 0.9], [-1, 1]]) {
        ctx.save(); ctx.translate(sx * 10 + 8, -128 + br); ctx.scale(sx * k, k); ctx.rotate(-0.25 + fw * sx);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, -34); ctx.lineTo(70, -40); ctx.quadraticCurveTo(66, -22, 74, -6); ctx.quadraticCurveTo(58, -12, 52, 6); ctx.quadraticCurveTo(40, -2, 32, 16); ctx.quadraticCurveTo(22, 6, 10, 22); ctx.closePath();
        fillO(hit ? '#fff' : LG(-40, 22, '#5a1418', '#2a080c'));
        ctx.strokeStyle = C('#1a0406'); ctx.lineWidth = 2.2; ctx.beginPath(); for (const [x2, y2] of [[70, -40], [74, -6], [52, 6], [32, 16]]) { ctx.moveTo(30, -34); ctx.lineTo(x2, y2); } ctx.stroke();
        ctx.restore();
      }
      // Schwanz mit Pfeilspitze
      { const sw = Math.sin(t * 1.8) * 8; ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 8.5; ctx.beginPath(); ctx.moveTo(18, -52); ctx.quadraticCurveTo(52, -40 + sw * 0.5, 62, -10 + sw); ctx.stroke(); ctx.strokeStyle = C('#9a2018'); ctx.lineWidth = 6; ctx.stroke();
        poly([[56, -12 + sw], [70, -16 + sw], [66, 0 + sw]], C('#2a0a0a'), true); }
      // Bocksbeine mit Hufen
      for (const [lx, d] of [[16, 1], [-14, 0]]) {
        const kn = limb(lx, -58, d ? 0.35 : 0.2, 22, 15, C(d ? '#8a1c16' : '#b02a20'));
        const an = limb(kn[0], kn[1], d ? -0.45 : -0.55, 22, 11, C(d ? '#7a1812' : '#9a2018'));
        ctx.beginPath(); ctx.ellipse(an[0] - 2, an[1] - 3, 9, 5, 0, 0, 7); fillO(C('#1e1214'));
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(an[0] - 2, an[1] - 7, 1.4, 6);
        // Fell am Oberschenkel
        ctx.fillStyle = C(d ? '#3a1210' : '#4a1612'); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(kn[0] - 6 + i * 4, kn[1] - 2, 4, 0, 7); ctx.fill(); }
      }
      // hinterer Arm
      { const el = limb(30, -122 + br, 0.35, 24, 14, C('#9a2018')); const hd = limb(el[0], el[1], -0.2, 20, 12, C('#8a1c16')); ctx.beginPath(); ctx.arc(hd[0], hd[1], 7, 0, 7); fillO(C('#7a1812'));
        glowDot(hd[0], hd[1] - 6, 14, '255,140,40', 0.7 * fl); ctx.fillStyle = `rgba(255,${180 + 60 * fl},80,.95)`; ctx.beginPath(); ctx.moveTo(hd[0] - 5, hd[1] - 4); ctx.quadraticCurveTo(hd[0], hd[1] - 22 - fl * 4, hd[0] + 5, hd[1] - 4); ctx.fill(); }
      // Oberkörper: muskulöser Leib mit dunkler Brustplatte
      ctx.beginPath(); ctx.moveTo(-30, -60); ctx.quadraticCurveTo(-40, -110, -30, -134 + br); ctx.quadraticCurveTo(0, -150 + br, 32, -134 + br); ctx.quadraticCurveTo(40, -108, 28, -60); ctx.closePath(); fillO(skin(-150, -60));
      ctx.beginPath(); ctx.moveTo(-22, -128 + br); ctx.lineTo(22, -128 + br); ctx.lineTo(18, -96 + br); ctx.lineTo(0, -88 + br); ctx.lineTo(-18, -96 + br); ctx.closePath(); fillO(hit ? '#fff' : LG(-128, -88, '#3a2a30', '#150c10'));
      ctx.strokeStyle = 'rgba(255,190,90,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-20, -126 + br); ctx.lineTo(20, -126 + br); ctx.stroke();
      // glühende Rune auf der Brust
      if (!hit) { glowDot(0, -110 + br, 18, '255,120,40', 0.7 * fl); ctx.strokeStyle = `rgba(255,${190 + 50 * fl},90,1)`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-6, -118 + br); ctx.lineTo(0, -104 + br); ctx.lineTo(6, -118 + br); ctx.moveTo(-7, -110 + br); ctx.lineTo(7, -110 + br); ctx.stroke(); }
      // Bauchmuskeln
      ctx.strokeStyle = 'rgba(80,10,8,.45)'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-12, -84 + i * 8); ctx.quadraticCurveTo(0, -80 + i * 8, 12, -84 + i * 8); ctx.stroke(); }
      // Lendenschurz mit Gürtel
      ctx.fillStyle = C('#2a1418'); ctx.fillRect(-30, -66, 58, 8); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.strokeRect(-30, -66, 58, 8);
      ctx.beginPath(); ctx.arc(0, -62, 5, 0, 7); fillO(C('#ffb23a'));
      poly([[-18, -58], [18, -58], [10, -36], [-10, -36]], C('#3a1418'), true);
      // Schulterplatten mit Stacheln
      for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 30, -132 + br); ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, sx * 0.2, 0, 7); fillO(hit ? '#fff' : LG(-10, 10, '#4a3a42', '#1a1016'));
        for (let i = 0; i < 3; i++) poly([[-8 + i * 7, -6], [-6 + i * 7 + sx * 2, -20 - (i === 1 ? 6 : 0)], [-3 + i * 7, -6]], C('#d8cfc0'), true); ctx.restore(); }
      // Kopf mit Hörnern und Flammenkrone
      ctx.save(); ctx.translate(-6, -156 + br); ctx.rotate(-0.06 - atk * 0.12);
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 10, -8); ctx.bezierCurveTo(sx * 30, -14, sx * 40, -30, sx * 30, -48); ctx.bezierCurveTo(sx * 30, -32, sx * 22, -22, sx * 4, -16); ctx.closePath(); fillO(hit ? '#fff' : LG(-48, -8, '#f0e6d0', '#5a4a3a'));
        ctx.strokeStyle = 'rgba(60,40,30,.5)'; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sx * (12 + k * 5), -10 - k * 4); ctx.lineTo(sx * (16 + k * 5), -16 - k * 5); ctx.stroke(); } }
      ctx.beginPath(); ctx.moveTo(-16, -10); ctx.quadraticCurveTo(-18, 10, -6, 18); ctx.lineTo(8, 18); ctx.quadraticCurveTo(18, 8, 16, -10); ctx.quadraticCurveTo(0, -20, -16, -10); fillO(skin(-16, 18));
      // Spitzohr
      poly([[14, -4], [28, -10], [16, 4]], C('#b02a20'), true);
      // Augen und Brauen
      for (const ex of [-9, 3]) eyeGlow(ex, -2, '255,220,80', 2.8);
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-5, -5); ctx.moveTo(8, -8); ctx.lineTo(0, -5); ctx.stroke();
      // Mund mit Reißzähnen, Bart
      ctx.fillStyle = '#2a0808'; ctx.beginPath(); ctx.moveTo(-9, 7); ctx.quadraticCurveTo(-2, 12 + atk * 4, 6, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; for (const fx of [-7, 3]) { ctx.beginPath(); ctx.moveTo(fx, 7); ctx.lineTo(fx + 1.5, 11); ctx.lineTo(fx + 3, 7); ctx.fill(); }
      poly([[-6, 16], [0, 28], [6, 16]], C('#3a1010'), true);
      // Flammenkrone
      for (let i = 0; i < 5; i++) { const fx = -12 + i * 6, hgt = 12 + (i % 2 ? 4 : 9) + Math.sin(t * 9 + i * 1.7) * 3;
        glowDot(fx, -22 - hgt * 0.5, 7, '255,150,50', 0.5); ctx.fillStyle = hit ? '#fff' : LG(-22 - hgt, -16, '#fff2a8', '#ff5a1a'); ctx.beginPath(); ctx.moveTo(fx - 4, -16); ctx.quadraticCurveTo(fx - 3, -22 - hgt * 0.5, fx, -22 - hgt); ctx.quadraticCurveTo(fx + 3, -22 - hgt * 0.5, fx + 4, -16); ctx.fill(); }
      ctx.fillStyle = C('#ffb23a'); rr(-15, -18, 30, 5, 2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      // vorderer Arm mit Dreizack: sticht nach vorne
      const p = 1 - atk, thrust = atk > 0 ? (p < 0.25 ? -8 * eOut(p / 0.25) : p < 0.5 ? -8 + 40 * eOut((p - 0.25) / 0.25) : 32 * (1 - eOut((p - 0.5) / 0.5))) : 0;
      const sx0 = -30, sy0 = -128 + br;
      const el = limb(sx0, sy0, -0.5 - thrust * 0.012, 24, 15, C('#b02a20'), 'rgba(255,200,160,.3)'); const hd = limb(el[0], el[1], -1.35 - thrust * 0.008, 20, 13, C('#9a2018'));
      ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(-0.18);
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(38, 0); ctx.lineTo(-70, 0); ctx.stroke(); ctx.strokeStyle = C('#3a2a2a'); ctx.lineWidth = 3.6; ctx.stroke();
      ctx.save(); ctx.translate(-70, 0);
      glowDot(-10, 0, 22, '255,120,40', 0.5 * fl + atk * 0.4);
      ctx.fillStyle = hit ? '#fff' : LG(-10, 10, '#ffe08a', '#c06010'); ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(4, 12); ctx.lineTo(0, 12); ctx.lineTo(0, -12); ctx.fill();
      for (const ty of [-11, 0, 11]) poly([[2, ty - 2.6], [-24 - (ty ? 0 : 6), ty], [2, ty + 2.6]], hit ? '#fff' : '#ffcf5a', true);
      ctx.restore(); ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, 7); fillO(C('#9a2018')); ctx.restore();
    },
    9(e, t, col, hit, ph) { // Kristallspinne: dunkler Leib, riesiger leuchtender Kristall-Hinterleib, acht Beine im Wellenschritt
      const atk = bossAtk(e, 0.5), C = c => (hit ? '#fff' : c), gl = 0.7 + 0.3 * Math.sin(t * 2.4), rear = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;
      // Glitzern
      for (let i = 0; i < 6; i++) { const q = (t * 0.5 + i / 6) % 1; const a = Math.sin(q * Math.PI); if (a > 0.1) sparkle(10 + hash(i) * 60, -40 - hash(i + 2) * 70 - q * 20, 3, a * 0.9); }
      // Beine: Hüfte am Vorderleib, Knie hoch, Spitze am Boden; vier hinten (dunkler), vier vorne
      const leg = (i, front) => {
        const side = i % 4, phase = t * 5 + side * 1.6 + (front ? Math.PI : 0), lift = Math.max(0, Math.sin(phase)) * 6;
        const hx = -20 + side * 7, hy = -34 - rear * 10, fx = [-80, -56, 22, 56][side] + (front ? -6 : 8), fy = -lift - (side === 0 ? rear * 30 : 0);
        const kx = hx + (fx - hx) * 0.45 + (side < 2 ? -4 : 4), ky = hy - 20 + Math.abs(side - 1.5) * 3 - (side === 0 ? rear * 20 : 0);
        const dark = front ? '#4a3a6a' : '#2a2040';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = OUT; ctx.lineWidth = front ? 6.4 : 7.2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.strokeStyle = C(dark); ctx.lineWidth = front ? 4.2 : 4.8; ctx.stroke();
        // Kristallspitze am Fuß
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.atan2(fy - ky, fx - kx) - Math.PI / 2); poly([[-3, -4], [0, 7], [3, -4]], hit ? '#fff' : (front ? '#9fe8ff' : '#6ab0d0'), true); ctx.restore();
        ctx.beginPath(); ctx.arc(kx, ky, 3.2, 0, 7); fillO(C(front ? '#6a5a9a' : '#3a2f5a'));
      };
      for (let i = 0; i < 4; i++) leg(i, false);
      // Kristall-Hinterleib (Facetten)
      ctx.save(); ctx.translate(38, -54 - rear * 4); ctx.rotate(-0.15 + rear * 0.08); ctx.scale(1.15, 1.15);
      const facets = [[[-30, 6], [-8, -30], [20, -38], [44, -10], [36, 22], [4, 30], [-24, 22]]];
      glowDot(6, -4, 46, '140,220,255', 0.35 * gl);
      ctx.beginPath(); facets[0].forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); fillO(hit ? '#fff' : LG(-38, 30, '#e8fbff', '#3a8ac0'));
      if (!hit) {
        const F = [[[-8, -30], [20, -38], [8, -6]], [[20, -38], [44, -10], [8, -6]], [[44, -10], [36, 22], [8, -6]], [[36, 22], [4, 30], [8, -6]], [[4, 30], [-24, 22], [8, -6]], [[-24, 22], [-30, 6], [8, -6]], [[-30, 6], [-8, -30], [8, -6]]];
        const cols = ['rgba(255,255,255,.55)', 'rgba(200,240,255,.35)', 'rgba(60,130,190,.35)', 'rgba(30,90,150,.45)', 'rgba(80,160,210,.3)', 'rgba(170,230,255,.3)', 'rgba(255,255,255,.4)'];
        F.forEach((f, k) => { ctx.fillStyle = cols[k]; ctx.beginPath(); f.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); });
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; for (const [x, y] of facets[0]) { ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(x, y); ctx.stroke(); }
        // inneres Herz
        glowDot(8, -6, 16, '190,240,255', 0.8 * gl); ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * gl})`; ctx.beginPath(); ctx.moveTo(8, -14); ctx.lineTo(13, -6); ctx.lineTo(8, 2); ctx.lineTo(3, -6); ctx.closePath(); ctx.fill();
      }
      // Kristallstacheln auf dem Rücken
      for (const [x, y, h2, a] of [[-6, -26, 26, -0.4], [12, -34, 34, -0.1], [30, -28, 24, 0.25], [42, -12, 18, 0.6]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); poly([[-5, 2], [0, -h2], [5, 2]], hit ? '#fff' : '#bff0ff', true); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(0, -h2 + 4); ctx.lineTo(1.5, 0); ctx.fill(); ctx.restore(); }
      ctx.restore();
      // Vorderleib und Kopf
      ctx.save(); ctx.translate(-16, -40 - rear * 14); ctx.rotate(rear * 0.25); ctx.scale(1.2, 1.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 24, 16, 0, 0, 7); fillO(hit ? '#fff' : LG(-16, 16, '#5a4a80', '#1e1630'));
      ctx.fillStyle = 'rgba(160,140,220,.35)'; ctx.beginPath(); ctx.ellipse(-4, -8, 14, 4, -0.2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-24, 4, 13, 11, 0, 0, 7); fillO(hit ? '#fff' : LG(-7, 15, '#4a3a6a', '#1a1228'));
      // Augenhaufen
      for (const [ex, ey, r] of [[-30, 0, 3], [-24, -3, 3.4], [-18, 0, 2.6], [-28, 6, 2], [-21, 6, 2]]) eyeGlow(ex, ey, '150,230,255', r);
      // Kieferklauen
      const bite = Math.max(rear, Math.max(0, Math.sin(t * 3)) * 0.3);
      for (const s2 of [-1, 1]) { ctx.save(); ctx.translate(-32, 12); ctx.rotate(s2 * (0.25 + bite * 0.4)); poly([[-2, 0], [-10, 10], [-4, 14], [2, 2]], hit ? '#fff' : '#9fe8ff', true); ctx.restore(); }
      ctx.restore();
      for (let i = 0; i < 4; i++) leg(i, true);
    },
  });
  // Sehr große neue Bosse etwas kleiner, damit Kopf und Krone nicht unter der Anzeige oben verschwinden
  { const f = AHN_FN['Leere-Titan']; AHN_FN['Leere-Titan'] = (e, t) => { ctx.save(); ctx.scale(0.87, 0.87); f(e, t); ctx.restore(); }; }
  // Drachenkaiser: roter Drache mit goldenem Bauchpanzer, langem Hals, Hornkrone und Feueratem
  BOSS_ART[13] = function (e, t, col, hit, ph) {
    const atk = bossAtk(e, 0.6), br = Math.sin(t * 1.3) * 2, C = c => (hit ? '#fff' : c), fl = Math.sin(t * 2.1);
    const body = (y0, y1) => (hit ? '#fff' : LG(y0, y1, '#e2483a', '#6a1410'));
    // Flügel hinten (weit hinten oben, damit der Kopf frei bleibt)
    const wing = (sx, k, flap) => {
      ctx.save(); ctx.translate(sx, -96 + br); ctx.rotate(-0.55 + flap); ctx.scale(k, k);
      const tips = [[24, -86], [58, -74], [80, -46], [88, -12]];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24, -86); for (let i = 1; i < tips.length; i++) { const [x0, y0] = tips[i - 1], [x1, y1] = tips[i]; ctx.quadraticCurveTo((x0 + x1) / 2 - 6, (y0 + y1) / 2 + 12, x1, y1); }
      ctx.quadraticCurveTo(44, 0, 0, 10); ctx.closePath();
      fillO(hit ? '#fff' : LG(-86, 10, '#a82a22', '#4a0c0a'));
      ctx.strokeStyle = C('#3a0808'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); for (const [x, y] of tips) { ctx.moveTo(4, -4); ctx.lineTo(x, y); } ctx.stroke();
      ctx.strokeStyle = C('#d8a040'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24, -86); ctx.stroke();
      poly([[24, -86], [20, -98], [30, -88]], C('#f0e0c0'), true);
      ctx.restore();
    };
    wing(18, 0.92, Math.sin(t * 2.4) * 0.16 + 0.1);
    // Schwanz
    const tw = Math.sin(t * 1.6) * 10;
    tube(bez([40, -52], [80, -46], [96, -20 + tw * 0.4], [118, -14 + tw], 22), 22, 5, q => (hit ? '#fff' : q < 0.4 ? '#9a2018' : '#b8281e'));
    ctx.save(); ctx.translate(118, -14 + tw); poly([[0, -8], [16, -2], [0, 6], [4, -1]], C('#d8a040'), true); ctx.restore();
    // Rückenstacheln auf dem Schwanz
    for (let i = 0; i < 5; i++) { const q = 0.15 + i * 0.16, P = bez([40, -52], [80, -46], [96, -20 + tw * 0.4], [118, -14 + tw], 10)[Math.round(q * 10)]; poly([[P[0] - 4, P[1] - 6], [P[0] + 1, P[1] - 16 + i * 1.6], [P[0] + 5, P[1] - 6]], C('#d8a040'), true); }
    // Beine hinten
    for (const [lx, d] of [[34, 1], [-18, 1]]) { const kn = limb(lx, -50, 0.45, 20, 15, C('#7a1812')); const ft = limb(kn[0], kn[1], -0.25, 18, 12, C('#6a1410')); ctx.beginPath(); ctx.ellipse(ft[0] - 4, ft[1] - 3, 10, 5, 0, 0, 7); fillO(C('#5a1210')); for (let k = 0; k < 3; k++) poly([[ft[0] - 12 + k * 4, ft[1] - 2], [ft[0] - 16 + k * 4, ft[1] + 1], [ft[0] - 10 + k * 4, ft[1] + 1]], '#f0e6d0', true); }
    // Rumpf
    ctx.beginPath(); ctx.ellipse(8, -70 + br * 0.5, 46, 32, -0.08, 0, 7); fillO(body(-102, -38));
    // goldener Bauchpanzer
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -60 + br * 0.5, 34, 22, -0.08, 0.2, Math.PI + 0.6); ctx.closePath(); fillO(hit ? '#fff' : LG(-80, -40, '#ffe7a0', '#d09030')); ctx.clip();
    ctx.strokeStyle = 'rgba(140,80,20,.55)'; ctx.lineWidth = 1.6; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-34 + i * 6, -78); ctx.quadraticCurveTo(-30 + i * 9, -60, -28 + i * 10, -38); ctx.stroke(); }
    ctx.restore();
    // Rückenschuppen
    for (let i = 0; i < 6; i++) poly([[-18 + i * 12, -98 + br * 0.5 + Math.abs(i - 2) * 2], [-14 + i * 12, -112 + br * 0.5 + Math.abs(i - 2) * 2], [-8 + i * 12, -98 + br * 0.5 + Math.abs(i - 2) * 2]], C('#d8a040'), true);
    // Hals (geschwungen nach vorne oben) und Kopf
    const lunge = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;
    const hx = -66 - lunge * 14, hy = -150 + br * 1.4 + lunge * 22 + fl * 2;
    const neck = bez([-26, -84 + br * 0.5], [-40, -110], [-70 - lunge * 6, -112 + lunge * 10], [hx + 14, hy + 10], 14);
    tube(neck, 26, 18, q => (hit ? '#fff' : q < 0.5 ? '#b02a20' : '#c8322a'));
    for (let i = 2; i < neck.length - 1; i += 2) { const [x, y] = neck[i]; poly([[x + 4, y - 9], [x + 10, y - 18], [x + 11, y - 6]], C('#d8a040'), true); }
    // Kehle golden
    ctx.strokeStyle = hit ? '#fff' : 'rgba(255,214,120,.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); neck.slice(2, -1).forEach(([x, y], i) => (i ? ctx.lineTo(x - 4, y + 8) : ctx.moveTo(x - 4, y + 8))); ctx.stroke();
    // Vorderbeine
    for (const [lx, d] of [[-10, 0], [-30, 0]]) { const sw = d ? 0 : Math.sin(t * 1.3 + lx) * 0.05; const kn = limb(lx, -56, -0.35 + sw, 20, 15, C('#b02a20'), 'rgba(255,190,150,.25)'); const ft = limb(kn[0], kn[1], 0.15, 18, 12, C('#9a2018')); ctx.beginPath(); ctx.ellipse(ft[0] - 5, ft[1] - 3, 10, 5, 0, 0, 7); fillO(C('#8a1c16')); for (let k = 0; k < 3; k++) poly([[ft[0] - 13 + k * 4, ft[1] - 2], [ft[0] - 17 + k * 4, ft[1] + 1], [ft[0] - 11 + k * 4, ft[1] + 1]], '#f0e6d0', true); }
    // Kopf
    const open = 0.12 + Math.max(0, fl) * 0.08 + lunge * 0.5;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.12 + lunge * 0.25);
    // Hornkrone
    for (const [x, y, l, a] of [[10, -10, 22, -0.5], [16, -6, 18, -0.2], [4, -12, 16, -0.9]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(4, -l * 0.6, 10, -l); ctx.quadraticCurveTo(4, -l * 0.4, 4, 2); ctx.closePath(); fillO(hit ? '#fff' : LG(-l, 0, '#fff4d0', '#a08040')); ctx.restore(); }
    // Unterkiefer
    ctx.save(); ctx.translate(-2, 4); ctx.rotate(open);
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-30, 2); ctx.quadraticCurveTo(-34, 6, -28, 9); ctx.lineTo(8, 9); ctx.closePath(); fillO(C('#a82a22'));
    ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 6, 2); ctx.lineTo(-24 + i * 6, -3); ctx.lineTo(-22 + i * 6, 2); ctx.fill(); }
    ctx.restore();
    // Oberkopf mit Schnauze
    ctx.beginPath(); ctx.moveTo(18, -6); ctx.quadraticCurveTo(10, -16, -6, -14); ctx.lineTo(-30, -6); ctx.quadraticCurveTo(-38, -2, -34, 4); ctx.lineTo(10, 6); ctx.quadraticCurveTo(22, 4, 18, -6); ctx.closePath(); fillO(body(-16, 6));
    ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-28 + i * 6, 4); ctx.lineTo(-26 + i * 6, 9); ctx.lineTo(-24 + i * 6, 4); ctx.fill(); }
    // Nüstern mit Rauch, Auge, Braue
    ctx.fillStyle = '#3a0808'; ctx.beginPath(); ctx.ellipse(-30, -3, 2, 1.3, 0, 0, 7); ctx.fill();
    for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; ctx.fillStyle = `rgba(90,80,80,${0.35 * (1 - q)})`; ctx.beginPath(); ctx.arc(-34 - q * 10, -6 - q * 16, 2 + q * 5, 0, 7); ctx.fill(); }
    eyeGlow(-4, -8, '255,214,60', 3);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(2, -11); ctx.stroke();
    // Bartfäden
    ctx.strokeStyle = C('#d8a040'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-26, 6); ctx.quadraticCurveTo(-30, 18 + fl * 3, -22, 24 + fl * 4); ctx.stroke();
    // Feuer im Maul / Atem beim Angriff
    if (!hit) { glowDot(-30, 4, 14 + lunge * 20, '255,150,40', 0.35 + lunge * 0.6);
      if (lunge > 0.05) for (let i = 0; i < 9; i++) { const q = (t * 3 + i / 9) % 1, d2 = q * 70 * lunge; ctx.fillStyle = `rgba(255,${200 - q * 140},${60 - q * 40},${(1 - q) * 0.9})`; ctx.beginPath(); ctx.arc(-34 - d2, 8 + d2 * 0.35 + Math.sin(i * 3 + t * 9) * 4 * q, 4 + q * 9, 0, 7); ctx.fill(); } }
    ctx.restore();
    // vorderer Flügel
    wing(34, 0.86, Math.sin(t * 2.4 + 0.3) * 0.18 - 0.08);
  };
  for (const [k, sc] of [[3, 0.78], [13, 0.74], [4, 0.85], [8, 0.86], [10, 0.83], [12, 0.88], [14, 0.82]]) { const f = BOSS_ART[k]; if (f) BOSS_ART[k] = (e, t, col, hit, ph) => { ctx.save(); ctx.scale(sc, sc); f(e, t, col, hit, ph); ctx.restore(); }; }
  // Höhe der Lebensleiste über dem Boss (kleine Bosse tiefer, große knapp unter der Anzeige oben)
  const BOSS_BAR = { 0: 122, 1: 160, 9: 120, 6: 165, 7: 172, 13: 170, 3: 182 };
  function ahnBoss(e, t, col) {
    const d = e.ahn, ph = e.phase || 0, rgb = d.tint ? hexRgb(d.tint) : '255,210,122', lunge = (e.lunge || 0) * 2 * 40;
    ctx.save(); ctx.translate(-lunge, 0);
    // Bodenring in Bossfarbe, in Phase 3 heller und schneller
    ctx.save(); ctx.scale(1, 0.22); const ra = 60;
    ctx.fillStyle = RG(0, 0, ra * 1.4, `rgba(${rgb},${0.28 + ph * 0.1})`, `rgba(${rgb},0)`); ctx.beginPath(); ctx.arc(0, 0, ra * 1.4, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},.6)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, ra, 0, 7); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < ph + 1 ? `rgba(${rgb},.95)` : 'rgba(255,255,255,.2)'; const a = t * (0.5 + ph * 0.4) + i * 2.09; ctx.beginPath(); ctx.arc(Math.cos(a) * ra * 0.85, Math.sin(a) * ra * 0.85, 6, 0, 7); ctx.fill(); }
    ctx.restore();
    if (ph >= 2) glowDot(0, -64, 100, '255,80,50', 0.18 + 0.08 * Math.sin(t * 7));
    if (d.ahne) { drawAhne(e, t, col); ctx.restore(); ahnBossFx(e, t, rgb); return; }
    ahnAcc(d.acc, rgb, t, false, ph);
    const sz = d.sz || 1, inv = e.invT > 0;
    ctx.save(); ctx.scale(sz, sz); if (inv) ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 30);
    if (d.acc === 'echo') ctx.globalAlpha *= 0.82;
    const hitT = e.hitT; e.hitT = 0;
    if (AHN_FN[d.name]) AHN_FN[d.name](e, t); else if (d.art) drawDragon(e, t, d.art); else tintDraw(() => bossDraw(e, t, c => c), d.tint, d.acc === 'echo' ? 0.8 : 0.85, 130 * sz);
    e.hitT = hitT; if (hitT > 0) glowDot(0, -60, 60, '255,255,255', 0.16);
    ctx.restore(); ctx.globalAlpha = 1;
    ahnAcc(d.acc, rgb, t, true, ph);
    ctx.restore();
    ahnBossFx(e, t, rgb);
  }
  function ahnBossFx(e, t, rgb) {
    if (e.castT > 0 && !(e.ahn && e.ahn.art)) { const p = 1 - e.castT / 0.8; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${rgb},${1 - p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -60, 30 + p * 70, (30 + p * 70) * 0.9, 0, 0, 7); ctx.stroke(); glowDot(0, -70, 50, rgb, 0.35 * (1 - p)); ctx.restore(); }
    if (e.shieldHp > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, -70, 30, 0, -70, 82); g.addColorStop(0, 'rgba(120,190,255,0)'); g.addColorStop(0.85, 'rgba(140,200,255,.28)'); g.addColorStop(1, 'rgba(200,235,255,.6)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -70, 70, 84, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(200,235,255,.7)'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * 1.05; ctx.beginPath(); ctx.arc(0, -70, 76, a, a + 0.4); ctx.stroke(); } ctx.restore(); }
    if (e.reflT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const y = -140 + ((t * 120 + i * 30) % 150); ctx.fillStyle = 'rgba(230,240,255,.35)'; ctx.fillRect(-46, y, 92, 2); } ctx.restore(); }
    if (e.healT > 0) for (let i = 0; i < 4; i++) { const p = (t * 0.9 + i / 4) % 1; ctx.fillStyle = `rgba(126,224,138,${1 - p})`; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', Math.sin(i * 2) * 30, -40 - p * 90); }
    if (e.frenzyT > 0) glowDot(0, -60, 80, '255,40,40', 0.3 + 0.15 * Math.sin(t * 16));
    if (e.enrage > 1) glowDot(0, -60, 95, '255,50,40', Math.min(0.55, (e.enrage - 1) * 0.7) * (0.8 + 0.2 * Math.sin(t * 8)));
  }

  /* ---------- Der Urahn ---------- */
  const AHNE_PAL = [
    { main: '#ffd27a', light: '#fff2c8', dark: '#8a5a1a', rgb: '255,205,110', cape: ['#4a1f7a', '#14071f'], eye: '255,240,180' },
    { main: '#d8b8ff', light: '#f4ecff', dark: '#5a3a9a', rgb: '205,165,255', cape: ['#3a1260', '#0c0418'], eye: '235,200,255' },
    { main: '#bff0ff', light: '#ffffff', dark: '#2a6a9a', rgb: '150,230,255', cape: ['#0c3060', '#030a18'], eye: '200,250,255' },
  ];
  function ahneSword(len, P, glow) {
    if (glow) glowDot(0, -len * 0.5, len * 0.55, P.rgb, 0.25);
    poly([[0, -len - 6], [3.4, -len], [3.4, 0], [-3.4, 0], [-3.4, -len]], P.light, true);
    ctx.fillStyle = `rgba(${P.rgb},.8)`; ctx.fillRect(-0.8, -len + 2, 1.6, len - 4);
    ctx.fillStyle = P.dark; ctx.fillRect(-9, -1, 18, 3.5); ctx.fillStyle = P.main; ctx.fillRect(-1.6, 2, 3.2, 8); ctx.beginPath(); ctx.arc(0, 11, 2.6, 0, 7); ctx.fill();
  }
  function drawAhne(e, t, col) {
    const ph = e.phase || 0, P = AHNE_PAL[ph], hov = -10 + Math.sin(t * 1.4) * 4, inv = e.invT > 0, flash = false;
    const C = c => c;
    ctx.save(); ctx.translate(0, 10); ctx.scale(0.88, 0.88);
    // Lichtstrahlen und Runenkreis hinter ihm
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32 + Math.sin(t * 0.6 + i) * 0.05; ctx.fillStyle = `rgba(${P.rgb},${0.07 + (i % 2) * 0.04})`; ctx.beginPath(); ctx.moveTo(0, -110 + hov); ctx.lineTo(Math.cos(a - 0.06) * 260, -110 + hov + Math.sin(a - 0.06) * 260); ctx.lineTo(Math.cos(a + 0.06) * 260, -110 + hov + Math.sin(a + 0.06) * 260); ctx.closePath(); ctx.fill(); }
    ctx.translate(0, -118 + hov);
    const R1 = 74 + ph * 4;
    ctx.strokeStyle = `rgba(${P.rgb},.55)`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, R1, 0, 7); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, R1 - 10, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R1 + 7, 0, 7); ctx.stroke();
    ctx.save(); ctx.rotate(t * 0.25);
    for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = `rgba(${P.rgb},.75)`; if (i % 2) ctx.fillRect(R1 - 7, -1, 5, 2); else { ctx.beginPath(); ctx.moveTo(R1 - 8, 0); ctx.lineTo(R1 - 4, -3); ctx.lineTo(R1, 0); ctx.lineTo(R1 - 4, 3); ctx.fill(); } }
    ctx.restore();
    ctx.save(); ctx.rotate(-t * 0.4); ctx.strokeStyle = `rgba(${P.rgb},.35)`; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI * 2 / 6 * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * (R1 - 12), Math.sin(a) * (R1 - 12)); } ctx.stroke(); ctx.restore();
    ctx.restore();
    // Kreisende Geisterklingen (hinter dem Körper)
    const nS = 2 + ph, swords = [];
    for (let i = 0; i < nS; i++) { const a = t * (0.9 + ph * 0.25) + i * Math.PI * 2 / nS; swords.push({ a, x: Math.cos(a) * 84, y: -96 + hov + Math.sin(a) * 26, front: Math.sin(a) > 0 }); }
    const drawS = s => { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.cos(s.a) * 0.5 + Math.PI); ctx.globalAlpha = s.front ? 0.95 : 0.55; ahneSword(30, P, true); ctx.restore(); ctx.globalAlpha = 1; };
    swords.filter(s => !s.front).forEach(drawS);
    ctx.save(); if (inv) ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 30);
    ctx.translate(0, hov);
    // Umhang
    const w1 = Math.sin(t * 1.8) * 6, w2 = Math.sin(t * 1.8 + 1.3) * 8;
    const cg = ctx.createLinearGradient(0, -130, 0, 0); cg.addColorStop(0, P.cape[0]); cg.addColorStop(1, 'rgba(10,4,20,0)');
    ctx.beginPath(); ctx.moveTo(-30, -128); ctx.bezierCurveTo(-60, -100, -78 + w1, -50, -70 + w2, 6); ctx.quadraticCurveTo(-30, -6 + w1, 4, 10); ctx.quadraticCurveTo(40, -2, 54 + w1, 4); ctx.bezierCurveTo(50, -50, 46, -100, 30, -128); ctx.closePath(); ctx.fillStyle = flash ? '#fff' : cg; ctx.fill();
    ctx.strokeStyle = `rgba(${P.rgb},.75)`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-30, -128); ctx.bezierCurveTo(-60, -100, -78 + w1, -50, -70 + w2, 6); ctx.stroke();
    for (let i = 0; i < 5; i++) { const p = (t * 0.4 + i / 5) % 1; ctx.fillStyle = `rgba(${P.rgb},${0.6 * (1 - p)})`; ctx.fillRect(-66 + i * 26 + Math.sin(t + i) * 6, 4 - p * 30, 2, 2); }
    // Geisterhafter Unterleib
    const tg = ctx.createLinearGradient(0, -78, 0, -4); tg.addColorStop(0, C(P.dark)); tg.addColorStop(0.6, `rgba(${P.rgb},.35)`); tg.addColorStop(1, `rgba(${P.rgb},0)`);
    ctx.beginPath(); ctx.moveTo(-26, -78); ctx.quadraticCurveTo(-30 + w1 * 0.5, -40, -12 + w2 * 0.6, -4); ctx.quadraticCurveTo(0, 4, 10 + w1 * 0.6, -6); ctx.quadraticCurveTo(28, -40, 26, -78); ctx.closePath(); ctx.fillStyle = tg; ctx.fill();
    for (let i = 0; i < 4; i++) { const sx = -16 + i * 11, sw = Math.sin(t * 2.4 + i) * 5; ctx.strokeStyle = `rgba(${P.rgb},.35)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, -60); ctx.quadraticCurveTo(sx + sw, -30, sx - sw, -8); ctx.stroke(); }
    // Gürtel
    rr(-28, -82, 56, 10, 3); fillO(C(P.dark)); for (let i = 0; i < 5; i++) { rr(-24 + i * 10, -80, 8, 6, 1.5); fillO(C(P.main)); }
    glowDot(0, -77, 9, P.rgb, 0.8); ctx.fillStyle = C(P.light); ctx.beginPath(); ctx.arc(0, -77, 3, 0, 7); ctx.fill();
    // Brustpanzer
    const bg = ctx.createLinearGradient(0, -134, 0, -80); bg.addColorStop(0, C(P.light)); bg.addColorStop(0.45, C(P.main)); bg.addColorStop(1, C(P.dark));
    ctx.beginPath(); ctx.moveTo(-32, -132); ctx.lineTo(32, -132); ctx.quadraticCurveTo(34, -104, 26, -82); ctx.lineTo(-26, -82); ctx.quadraticCurveTo(-34, -104, -32, -132); ctx.closePath(); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = `rgba(60,30,10,.45)`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -130); ctx.lineTo(0, -84); ctx.moveTo(-24, -118); ctx.quadraticCurveTo(-12, -110, -4, -96); ctx.moveTo(24, -118); ctx.quadraticCurveTo(12, -110, 4, -96); ctx.moveTo(-22, -92); ctx.lineTo(22, -92); ctx.stroke();
    // Wappen mit Herzstein
    ctx.save(); ctx.translate(0, -110); poly([[0, -12], [10, -6], [8, 8], [0, 14], [-8, 8], [-10, -6]], C(P.dark), true);
    glowDot(0, 0, 18, P.rgb, 0.7 + 0.25 * Math.sin(t * 3)); ctx.fillStyle = C(P.light); ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill(); ctx.restore();
    // Schulterplatten mit Stacheln
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.translate(sg * 33, -126); ctx.scale(sg, 1);
      ctx.beginPath(); ctx.moveTo(-10, 8); ctx.quadraticCurveTo(-8, -14, 14, -12); ctx.quadraticCurveTo(24, -4, 20, 12); ctx.quadraticCurveTo(6, 6, -10, 8); ctx.closePath(); fillO(C(P.main));
      ctx.fillStyle = `rgba(255,255,255,.35)`; ctx.beginPath(); ctx.ellipse(4, -6, 8, 3, -0.3, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) poly([[2 + k * 7, -10 - k], [6 + k * 7, -24 - k * 2], [9 + k * 7, -8 - k]], C(P.light), true);
      if (ph >= 2) for (let k = 0; k < 4; k++) { const h = 10 + Math.sin(t * 10 + k * 1.7) * 4; ctx.fillStyle = k % 2 ? 'rgba(200,250,255,.9)' : 'rgba(110,200,255,.85)'; ctx.beginPath(); ctx.moveTo(-2 + k * 6, -8); ctx.quadraticCurveTo(k * 6, -8 - h, 3 + k * 6, -8); ctx.fill(); }
      ctx.restore();
    }
    // Arme mit Panzerhandschuhen zum Schwertgriff
    for (const sg of [-1, 1]) { ctx.save(); ctx.translate(sg * 26, -118); ctx.rotate(sg > 0 ? 0.55 : -0.25); rr(-6, 0, 12, 30, 5); fillO(C(P.dark)); ctx.translate(0, 28); ctx.rotate(sg > 0 ? -1.1 : -0.35); rr(-6, 0, 12, 22, 4); fillO(C(P.main)); ctx.restore(); }
    // Großschwert vor ihm
    ctx.save(); ctx.translate(-16, -76); ctx.rotate(Math.PI - 0.08);
    glowDot(0, -46, 50, P.rgb, 0.3);
    poly([[0, -96], [6, -86], [6, 0], [-6, 0], [-6, -86]], C(P.light), true);
    ctx.fillStyle = `rgba(${P.rgb},.95)`; ctx.fillRect(-1.4, -84, 2.8, 80);
    for (let i = 0; i < 5; i++) { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(-3, -76 + i * 15, 6, 2); }
    rr(-20, -4, 40, 7, 3); fillO(C(P.dark)); poly([[-20, -1], [-28, -8], [-24, 2]], C(P.main), true); poly([[20, -1], [28, -8], [24, 2]], C(P.main), true);
    rr(-3.5, 3, 7, 16, 2); fillO(C(P.dark)); glowDot(0, 22, 8, P.rgb, 0.9); ctx.fillStyle = C(P.light); ctx.beginPath(); ctx.arc(0, 22, 3.4, 0, 7); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(-14, -84); rr(-8, -6, 16, 12, 4); fillO(C(P.main)); ctx.restore();
    // Bart aus Licht
    for (let i = 0; i < 7; i++) { const bx = -10 + i * 3.3, sw = Math.sin(t * 2 + i * 0.8) * 3; ctx.strokeStyle = `rgba(${P.rgb},${0.55 + (i % 2) * 0.2})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(bx, -140); ctx.quadraticCurveTo(bx + sw, -128, bx - 2 + sw * 1.4, -112 + (i % 3) * 4); ctx.stroke(); }
    // Helm mit leuchtendem Visier
    ctx.save(); ctx.translate(0, -152);
    const hg2 = ctx.createLinearGradient(0, -18, 0, 16); hg2.addColorStop(0, C(P.light)); hg2.addColorStop(1, C(P.main));
    ctx.beginPath(); ctx.moveTo(-15, 14); ctx.lineTo(-17, -6); ctx.quadraticCurveTo(-15, -20, 0, -22); ctx.quadraticCurveTo(15, -20, 17, -6); ctx.lineTo(15, 14); ctx.lineTo(6, 18); ctx.lineTo(-6, 18); ctx.closePath(); ctx.fillStyle = hg2; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = C(P.dark); ctx.fillRect(-1.5, -20, 3, 12);
    ctx.fillStyle = '#100818'; rr(-13, -4, 26, 5, 2); ctx.fill(); ctx.fillRect(-1.6, -4, 3.2, 16);
    glowDot(-6, -1.5, 9, P.eye, 0.9); glowDot(6, -1.5, 9, P.eye, 0.9);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, -2.5, 7, 2); ctx.fillRect(3, -2.5, 7, 2);
    for (const sg of [-1, 1]) { ctx.save(); ctx.scale(sg, 1); ctx.beginPath(); ctx.moveTo(16, -8); ctx.quadraticCurveTo(30, -14, 34, -30); ctx.quadraticCurveTo(26, -18, 16, -14); ctx.closePath(); fillO(C(P.light)); ctx.restore(); }
    ctx.restore();
    // Schwebende Krone
    ctx.save(); ctx.translate(0, -186 + Math.sin(t * 2) * 2); ctx.rotate(Math.sin(t * 0.9) * 0.05);
    glowDot(0, -4, 34, P.rgb, 0.45 + 0.15 * Math.sin(t * 2.5));
    ctx.beginPath(); ctx.moveTo(-18, 6); ctx.lineTo(-20, -8); ctx.lineTo(-12, -2); ctx.lineTo(-8, -16); ctx.lineTo(-3, -4); ctx.lineTo(0, -20); ctx.lineTo(3, -4); ctx.lineTo(8, -16); ctx.lineTo(12, -2); ctx.lineTo(20, -8); ctx.lineTo(18, 6); ctx.closePath(); fillO(C(P.main));
    ctx.fillStyle = C(P.dark); ctx.fillRect(-18, 2, 36, 4);
    for (const [gx, gy, gc] of [[0, -14, '#e5484d'], [-8, -10, '#4fc3ff'], [8, -10, '#7ee08a'], [0, 4, P.light]]) { ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(gx, gy, 2.2, 0, 7); ctx.fill(); }
    if (ph >= 2) for (let k = 0; k < 5; k++) { const h = 8 + Math.sin(t * 11 + k) * 3; ctx.fillStyle = 'rgba(200,250,255,.9)'; ctx.beginPath(); ctx.moveTo(-14 + k * 7, -6); ctx.quadraticCurveTo(-12 + k * 7, -10 - h, -9 + k * 7, -6); ctx.fill(); }
    ctx.restore();
    ctx.restore();
    swords.filter(s => s.front).forEach(drawS);
    // Glut steigt auf, in Phase 3 auch Risse im Boden
    for (let i = 0; i < 14; i++) { const p = (t * (0.35 + ph * 0.15) + i / 14) % 1; ctx.fillStyle = `rgba(${P.rgb},${(1 - p) * 0.9})`; ctx.fillRect(Math.sin(i * 2.3 + p * 4) * 70, -10 - p * 200, 2, 2); }
    if (ph >= 2) { ctx.strokeStyle = `rgba(150,230,255,${0.6 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-60, 2); ctx.lineTo(-40, -1); ctx.lineTo(-24, 3); ctx.lineTo(-8, 0); ctx.moveTo(10, 2); ctx.lineTo(30, -1); ctx.lineTo(52, 3); ctx.stroke(); }
    if (e.hitT > 0) glowDot(0, -110, 70, '255,255,255', 0.18);
    ctx.restore();
  }

  /* ---------- Halle der Ahnen ---------- */
  function ahnStatue(x, y, s, kind) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = 'rgba(70,50,120,.75)';
    rr(-14, -60, 28, 60, 6); ctx.fill(); ctx.beginPath(); ctx.arc(0, -70, 11, 0, 7); ctx.fill();
    if (kind === 0) { ctx.fillRect(14, -96, 5, 70); ctx.fillRect(8, -34, 17, 4); }
    if (kind === 1) { rr(-30, -54, 20, 34, 6); ctx.fill(); }
    if (kind === 2) { ctx.strokeStyle = 'rgba(70,50,120,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(18, -50, 22, -1.2, 1.2); ctx.stroke(); }
    if (kind === 3) { ctx.fillRect(16, -100, 4, 100); ctx.beginPath(); ctx.arc(18, -104, 6, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,210,122,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -70, 11, Math.PI, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-14, -56); ctx.lineTo(-14, -4); ctx.stroke();
    ctx.restore();
  }
  const ENV_AHNEN = {
    back(t, sc) {
      skyFill(['#0a0820', '#2a1a5a', '#6a3a7a', '#e0a060']);
      stars(t, 70, 150, 0.9, 77);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) { ctx.beginPath(); for (let x = 0; x <= W; x += 8) { const y = 40 + b * 18 + Math.sin(x * 0.012 + t * 0.4 + b) * 14 + Math.sin(x * 0.03 + t * 0.7) * 5; ctx[x ? 'lineTo' : 'moveTo'](x, y); }
        for (let x = W; x >= 0; x -= 8) { const y = 40 + b * 18 + 22 + Math.sin(x * 0.012 + t * 0.4 + b + 0.4) * 14; ctx.lineTo(x, y); } ctx.closePath();
        ctx.fillStyle = vg([`rgba(${b === 1 ? '255,210,122' : '120,230,190'},0)`, `rgba(${b === 1 ? '255,210,122' : '120,230,190'},.14)`, 'rgba(0,0,0,0)'], 30 + b * 18, 100 + b * 18); ctx.fill(); }
      ctx.restore();
      disc(240, 150, 30, '#fff3d0', '255,210,140', 0.6);
      each(sc, 0.05, 150, (x, k) => ahnStatue(x, 176, 0.9 + hash(k) * 0.2, k % 4), 0, 171);
      ridge(sc, 0.1, 176, 18, 0.02, '#2a1a4a', { seed: 8 });
      each(sc, 0.12, 210, (x, k) => { ctx.fillStyle = 'rgba(40,24,70,.9)'; ctx.beginPath(); ctx.moveTo(x - 30, 120 + hash(k) * 20); ctx.lineTo(x + 30, 120 + hash(k) * 20); ctx.lineTo(x + 10, 146 + hash(k) * 20); ctx.lineTo(x - 14, 150 + hash(k) * 20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,210,122,.25)'; ctx.fillRect(x - 30, 119 + hash(k) * 20, 60, 2); }, 0.2, 172);
      fog(t, 170, 30, '200,170,255', 0.18, 6, 5, 3);
      each(sc, 0.35, 92, (x, k) => { pillar(x, 210, 1.05, '#3a2a5a', '#22183a', false, '#d8a84a', hash(k)); const fy = 128; ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x - 7, fy, 14, 6); flame(x, fy, 1.3, t, k, '#7ac8ff', '#e8f8ff', '120,200,255'); lightPool(x, fy, 70, '120,200,255', 0.16); }, 0.3, 173);
      groundBase('#3a2a52', '#241a38', '#0e0a18', '#d8a84a', sc, { speck: 'rgba(0,0,0,.25)', hi: 'rgba(255,210,122,.25)' });
      tiles(sc, 'rgba(255,210,122,.22)', 9, 30);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg(['rgba(255,210,122,.18)', 'rgba(255,210,122,0)'], GROUND, H); ctx.fillRect(0, GROUND, W, H - GROUND); ctx.restore();
    },
    props(t, sc) {
      each(sc, 1, 160, (x, k) => { ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x - 1.5, GROUND - 74, 3, 74);
        const sw = Math.sin(t * 1.2 + k) * 2; ctx.beginPath(); ctx.moveTo(x + 1, GROUND - 72); ctx.lineTo(x + 24 + sw, GROUND - 70); ctx.lineTo(x + 22 + sw * 1.5, GROUND - 34); ctx.lineTo(x + 13 + sw, GROUND - 40); ctx.lineTo(x + 3 + sw * 0.5, GROUND - 34); ctx.closePath(); fillO('#5a2a8a');
        ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x + 12 + sw, GROUND - 56, 4, 0, 7); ctx.fill(); ctx.fillRect(x + 1, GROUND - 74, 24, 3); }, 0.25, 174);
    },
    front(t) {
      parts(t, 16, { type: 'glow', rgb: '255,215,140', vx: 3, vy: -10, wob: 1, wa: 10, size: 1.4, tw: 2, alpha: 0.85, seed: 41 });
      grade('#ffcf7a', 0.12); vignette(0.35, '20,6,40');
    },
  };
  function ahnEnv(R) { const M = AHN_MISSIONS[R.ahn.mi]; return M.env === 'ahnen' ? ENV_AHNEN : ENV[M.env % ENV.length]; }

  /* ---------- Effekte auf Helden und Bildschirm ---------- */
  function ahnWorld(R, t) {
    const A = R.ahn;
    for (const f of A.fx) {
      const p = 1 - Math.max(0, f.t) / f.d;
      if (f.kind === 'slam' && f.t > 0) { const x0 = R.pos[R.order[R.order.length - 1]] - 30, x1 = R.frontX + 30; ctx.save(); ctx.fillStyle = `rgba(255,60,40,${0.12 + 0.25 * p})`; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, GROUND + 3, (x1 - x0) / 2 + 10, 10, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(255,120,90,${0.5 + 0.5 * Math.sin(t * 20)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, GROUND + 3, ((x1 - x0) / 2 + 10) * p, 10 * p, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      if (f.kind === 'bomb' && f.t > 0 && R.h[f.k] && R.h[f.k].alive) { const x = R.pos[f.k], y = GROUND - 112 - Math.abs(Math.sin(t * 6)) * 4;
        glowDot(x, y, 14, '255,90,40', 0.35 + 0.3 * p); ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.fillStyle = Math.sin(t * 30) > 0 ? '#ffd23f' : '#ff5a2a'; ctx.fillRect(x + 3, y - 11, 2.5, 4);
        ctx.font = '11px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(Math.ceil(f.t), x, y + 4); }
      if (f.kind === 'burn' && f.t > 0) { const x0 = R.pos[R.order[R.order.length - 1]] - 26, x1 = R.frontX + 26; for (let i = 0; i < 12; i++) { const x = x0 + (x1 - x0) * i / 11, h = 12 + Math.sin(t * 10 + i * 1.7) * 6; ctx.fillStyle = ['#ff5a2a', '#ffb547', '#ffd23f'][i % 3]; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x - 5, GROUND + 4); ctx.quadraticCurveTo(x - 2, GROUND - h, x + 4, GROUND + 4); ctx.fill(); } ctx.globalAlpha = 1; lightPool((x0 + x1) / 2, GROUND, 90, '255,120,40', 0.2); }
      if (f.kind === 'poison' && f.t > 0) { ctx.fillStyle = 'rgba(120,200,80,.12)'; ctx.fillRect(0, GROUND - 120, R.frontX + 40, 124); }
      if (f.kind === 'chain' && f.t > 0) { ctx.strokeStyle = `rgba(200,230,255,${1 - p})`; ctx.lineWidth = 2.5; ctx.beginPath(); let px = A.boss ? A.boss.x : 400, py = GROUND - 90; ctx.moveTo(px, py);
        for (const k of f.ks) { const x = R.pos[k], y = GROUND - 50; for (let j = 1; j <= 3; j++) ctx.lineTo(px + (x - px) * j / 3 + (Math.random() - 0.5) * 12, py + (y - py) * j / 3 + (Math.random() - 0.5) * 12); px = x; py = y; } ctx.stroke(); }
      if (f.kind === 'drain' && f.t > 0 && A.boss) { const x = R.pos[f.k]; ctx.strokeStyle = `rgba(220,40,70,${1 - p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, GROUND - 50); ctx.quadraticCurveTo((x + A.boss.x) / 2, GROUND - 120, A.boss.x, GROUND - 80); ctx.stroke(); }
      if (f.kind === 'quake' && f.t > 0) for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(160,130,100,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.arc(30 + i * 30, GROUND - p * 20, 6 + p * 10, 0, 7); ctx.fill(); }
    }
    for (const k of R.order) {
      const h = R.h[k]; if (!h.alive) continue; const x = R.pos[k], top = GROUND - (k === 'w' || k === 'o' ? 104 : 96);
      if (h.stunT > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffe58a'; sparkle(x + Math.cos(a) * 11, top - 6 + Math.sin(a) * 3, 3, 1); }
      if (h.markT > 0) { glowDot(x, top - 14, 10, '255,40,60', 0.6); ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('☠', x, top - 9); }
      if (h.dotT > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(155,227,107,.8)'; ctx.beginPath(); ctx.arc(x - 6 + i * 6, GROUND - 30 - ((t * 30 + i * 9) % 30), 2.5, 0, 7); ctx.fill(); }
      if (R.curseT > 0) for (let i = 0; i < 2; i++) { const p = (t * 0.8 + i / 2 + k.charCodeAt(0) * 0.1) % 1; ctx.fillStyle = `rgba(180,80,255,${1 - p})`; ctx.fillRect(x - 8 + i * 14, GROUND - 20 - p * 50, 2, 2); }
      if (R.slowT > 0) { ctx.fillStyle = 'rgba(190,235,255,.22)'; ctx.beginPath(); ctx.ellipse(x, GROUND - 40, 16, 44, 0, 0, 7); ctx.fill(); }
    }
  }
  function ahnScreen(R, t) {
    const A = R.ahn;
    if (R.blindT > 0) { const g = ctx.createRadialGradient(R.frontX, GROUND - 50, 40, R.frontX, GROUND - 50, 260); g.addColorStop(0, 'rgba(5,0,15,0)'); g.addColorStop(1, `rgba(5,0,15,${Math.min(0.75, R.blindT)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (R.slowT > 0) { ctx.fillStyle = `rgba(190,235,255,${Math.min(0.12, R.slowT * 0.05)})`; ctx.fillRect(0, 0, W, H); }
    if (R.silT > 0) { ctx.strokeStyle = `rgba(200,160,255,${R.silT * 0.5})`; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6); }
    // Auftritt des Urahns
    if (R.introT > 0) {
      const T = 3.4 - R.introT, a = Math.min(1, T * 2, R.introT * 2);
      ctx.fillStyle = `rgba(8,4,20,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
      const bx = A.boss ? A.boss.x : 400, beam = Math.min(1, T / 0.8);
      const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, `rgba(255,236,170,${0.6 * a})`); g.addColorStop(1, `rgba(255,236,170,${0.15 * a})`); ctx.fillStyle = g; ctx.fillRect(bx - 30 * beam, 0, 60 * beam, GROUND);
      ctx.save(); ctx.globalAlpha = Math.min(1, Math.max(0, (T - 0.6) * 2)) * a; ctx.textAlign = 'center';
      ctx.font = '30px "Bungee","Arial Black",sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.strokeText('DER URAHN', W / 2, 92); const tg = ctx.createLinearGradient(0, 70, 0, 96); tg.addColorStop(0, '#fff6d8'); tg.addColorStop(1, '#ffb547'); ctx.fillStyle = tg; ctx.fillText('DER URAHN', W / 2, 92);
      ctx.font = 'italic 12px "Figtree",sans-serif'; ctx.fillStyle = '#f4e8ff'; ctx.fillText('„Zeigt mir, dass ihr meiner würdig seid.“', W / 2, 114); ctx.restore();
    }
    ahnMechDraw(R, t);
    // Banner bei Boss-Auftritt und Phasenwechsel
    if (A.banner && !(R.introT > 0)) {
      const b = A.banner, dur = b.phase ? 2.4 : b.ahne ? 5 : 3.2, a = Math.max(0, Math.min(1, b.t * 2, (dur - b.t) * 4)), y = b.phase ? 84 : 90;
      ctx.save(); ctx.globalAlpha = a;
      const bg = ctx.createLinearGradient(0, y - 30, 0, y + 22); bg.addColorStop(0, 'rgba(25,10,40,0)'); bg.addColorStop(0.3, 'rgba(25,10,40,.82)'); bg.addColorStop(0.7, 'rgba(25,10,40,.82)'); bg.addColorStop(1, 'rgba(25,10,40,0)');
      ctx.fillStyle = bg; ctx.fillRect(0, y - 30, W, 52); ctx.fillStyle = b.phase ? '#ff7a5a' : '#ffd27a'; ctx.fillRect(W / 2 - 120 * a, y - 22, 240 * a, 1.5); ctx.fillRect(W / 2 - 120 * a, y + 14, 240 * a, 1.5);
      ctx.textAlign = 'center'; ctx.font = `${b.phase ? 20 : 19}px "Bungee","Arial Black",sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(b.title, W / 2 + (1 - a) * 30, y); ctx.fillStyle = b.phase ? '#ffb09a' : '#fff2c8'; ctx.fillText(b.title, W / 2 + (1 - a) * 30, y);
      ctx.font = `${b.phase ? '600 11px' : 'italic 11px'} "Figtree",sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillText(b.phase ? b.sub : `„${b.sub}“`, W / 2, y + 12 - 1);
      ctx.restore();
    }
  }
  // Großangriff (rote Zone + Countdown), Schildwall (goldene Kuppel) und Schwachstelle (Zielscheibe am Boss)
  function ahnMechDraw(R, t) {
    const A = R.ahn, al = R.order.filter(k => R.h[k] && R.h[k].alive), xs = al.map(k => R.pos[k] || R.frontX), x0 = Math.min(...xs, R.frontX) - 26, x1 = Math.max(...xs, R.frontX) + 26;
    if (A.big && al.length) {
      const p = 1 - A.big.t / A.big.d, pulse = 0.5 + 0.5 * Math.sin(t * (10 + p * 20));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, GROUND - 120, 0, GROUND + 8); g.addColorStop(0, 'rgba(255,40,30,0)'); g.addColorStop(1, `rgba(255,50,30,${0.18 + 0.22 * p + 0.1 * pulse})`);
      ctx.fillStyle = g; ctx.fillRect(x0, GROUND - 120, x1 - x0, 128); ctx.restore();
      ctx.save(); ctx.scale(1, 0.25); ctx.strokeStyle = `rgba(255,80,60,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (GROUND + 2) * 4, (x1 - x0) / 2, 40, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      // Countdown-Ring über der Gruppe
      const cx = (x0 + x1) / 2, cy = 58;
      ctx.fillStyle = 'rgba(20,6,10,.75)'; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p)); ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = '15px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('!', cx, cy + 6);
      const ready = R.swCd <= 0 || R.swT > 0;
      ctx.font = '11px "Bungee","Arial Black",sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
      const msg = R.swT > 0 ? 'Schildwall steht!' : ready ? 'Großangriff – Schildwall!' : 'Großangriff!';
      ctx.strokeText(msg, cx, cy + 30); ctx.fillStyle = R.swT > 0 ? '#9fe8ff' : '#ff8a6a'; ctx.fillText(msg, cx, cy + 30);
    }
    if (A.bigHit && !A.bigHit.manual) { ctx.fillStyle = `rgba(255,40,30,${A.bigHit.t * 0.35})`; ctx.fillRect(0, 0, W, H); }
    // Schildwall: goldene Kuppel über der Gruppe
    if (R.swT > 0 && al.length) {
      const a = Math.min(1, R.swT * 2, (AHN_MECH.wallReal - R.swT) * 6 + 0.2), cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + 8;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, GROUND, rx * 0.3, cx, GROUND, rx * 1.1); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(0.85, `rgba(255,220,120,${0.22 * a})`); g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, GROUND, rx, 105, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = `rgba(255,230,150,${0.75 * a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, GROUND, rx, 105, 0, Math.PI, 0); ctx.stroke();
      for (let i = 0; i < 6; i++) { const q = ((t * 0.7 + i / 6) % 1), an = Math.PI + q * Math.PI; glowDot(cx + Math.cos(an) * rx, GROUND + Math.sin(an) * 105, 4, '255,230,150', a * 0.8); }
      ctx.restore();
    }
    if (A.wallFx) { const q = 1 - A.wallFx.t / 0.5, cx = (x0 + x1) / 2; ctx.strokeStyle = `rgba(255,230,150,${1 - q})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, GROUND, (x1 - x0) / 2 * (0.6 + q * 0.6), 90 * (0.6 + q * 0.6), 0, Math.PI, 0); ctx.stroke(); }
    // Schwachstelle am Boss
    const e = A.boss;
    if (A.spot && e && e.hp > 0) {
      const x = e.x + A.spot.dx, y = GROUND + A.spot.dy, life = A.spot.t / A.spot.d, pu = 0.5 + 0.5 * Math.sin(t * 9);
      ctx.save(); glowDot(x, y, 26 + pu * 6, '255,224,80', 0.55);
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, 10 + pu * 1.5, 0, 7); ctx.stroke();
      ctx.lineWidth = 1.5; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.moveTo(x + dx * 6, y + dy * 6); ctx.lineTo(x + dx * 15, y + dy * 15); ctx.stroke(); }
      ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,224,80,${0.9})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life); ctx.stroke();
      ctx.restore();
    }
    if (A.spotFx) { const q = 1 - A.spotFx.t / 0.5; ctx.strokeStyle = `rgba(255,236,120,${1 - q})`; ctx.lineWidth = 4 * (1 - q) + 1; ctx.beginPath(); ctx.arc(A.spotFx.x, A.spotFx.y, 10 + q * 40, 0, 7); ctx.stroke(); glowDot(A.spotFx.x, A.spotFx.y, 40 * (1 - q), '255,236,120', 0.8 * (1 - q)); }
  }
  function ahnHud(R, t) {
    const A = R.ahn, M = AHN_MISSIONS[A.mi], list = A.list || ahnBossesOf(A.mi), e = A.boss && A.boss.hp > 0 ? A.boss : null;
    ctx.font = '13px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd27a'; ctx.fillText(A.bounty ? 'Kopfgeld' : `Mission ${A.mi + 1}`, 12, 20);
    ctx.font = '600 11px "Figtree",sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(A.bounty ? `${A.bounty.diff} · Stufe ${A.bounty.lvl}` : M.name, A.bounty ? 92 : 98, 19);
    ctx.textAlign = 'right'; ctx.fillStyle = '#e8dcff';
    if (!A.bounty) ctx.fillText(`Boss ${Math.min(A.bi + 1, list.length)}/${list.length}${A.wave < AHN_TUNE.waves ? ` · Diener ${A.wave + 1}/${AHN_TUNE.waves}` : ''}`, W - 12, 19);
    // Fortschritts-Punkte der Bosse
    if (!A.bounty) for (let i = 0; i < list.length; i++) { const x = W - 12 - (list.length - 1 - i) * 11, y = 28; ctx.fillStyle = i < A.bi ? '#4fc3ff' : i === A.bi ? '#ffd27a' : 'rgba(255,255,255,.25)'; ctx.beginPath(); list[i].ahne ? (ctx.moveTo(x - 4, y + 2), ctx.lineTo(x - 4, y - 3), ctx.lineTo(x - 2, y), ctx.lineTo(x, y - 4), ctx.lineTo(x + 2, y), ctx.lineTo(x + 4, y - 3), ctx.lineTo(x + 4, y + 2), ctx.closePath()) : ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    if (!e || e.x > 520) return;
    const d = e.ahn, bw = 250, bx = W / 2 - bw / 2, by = H - 26, col = d.ahne ? '#ffd27a' : d.tint || '#c9a6ff';
    const pg = ctx.createLinearGradient(0, by - 22, 0, H); pg.addColorStop(0, 'rgba(10,6,18,0)'); pg.addColorStop(0.5, 'rgba(10,6,18,.55)'); pg.addColorStop(1, 'rgba(10,6,18,.8)'); ctx.fillStyle = pg; ctx.fillRect(0, by - 22, W, H - by + 22);
    ctx.textAlign = 'center'; ctx.font = `${d.ahne ? 13 : 12}px "Bungee","Arial Black",sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(d.name, W / 2, by - 4); ctx.fillStyle = d.ahne ? '#fff2c8' : '#fff'; ctx.fillText(d.name, W / 2, by - 4);
    ctx.fillStyle = 'rgba(10,6,18,.85)'; rr(bx - 2, by, bw + 4, 10, 4); ctx.fill();
    const f = Math.max(0, e.hp / e.max), g = ctx.createLinearGradient(0, by, 0, by + 8); g.addColorStop(0, '#fff'); g.addColorStop(0.25, col); g.addColorStop(1, e.phase >= 2 ? '#c03030' : '#5a2a8a');
    ctx.fillStyle = g; rr(bx, by + 1, bw * f, 8, 3); ctx.fill();
    if (e.shieldHp > 0) { ctx.fillStyle = 'rgba(160,215,255,.85)'; rr(bx, by + 1, Math.min(bw, bw * e.shieldHp / e.max * 3), 3, 1.5); ctx.fill(); }
    ctx.fillStyle = 'rgba(10,6,18,.9)'; for (const q of [1 / 3, 2 / 3]) ctx.fillRect(bx + bw * q - 1, by, 2, 10);
    for (let i = 0; i < 3; i++) { const x = bx + bw + 14 + i * 11, y = by + 5; ctx.fillStyle = i < e.phase ? 'rgba(255,255,255,.3)' : i === e.phase ? (e.phase >= 2 ? '#ff7a5a' : col) : 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill(); }
    if (e.enrage > 1) { ctx.font = '10px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#ff6a5a'; ctx.textAlign = 'right'; ctx.fillText(`WUT ×${e.enrage.toFixed(1).replace('.', ',')}`, bx - 8, by + 9); }
  }

  /* ---------- Eigene Drachen der Ahnenprüfung ---------- */
  const DRAKE = {
    bone: { body: '#ece4d0', dark: '#8a8070', belly: '#cfc6ae', mem: 'rgba(90,60,130,.55)', eye: '200,140,255', br: '180,120,255' },
    frost: { body: '#eef8ff', dark: '#7aa8c8', belly: '#c4e6fa', mem: 'rgba(170,225,255,.5)', eye: '120,220,255', br: '190,235,255' },
    thorn: { body: '#4a8a40', dark: '#1f4a24', belly: '#b8e090', mem: '#5a9a44', eye: '255,120,170', br: '255,150,190' },
    hydra: { body: '#3f9070', dark: '#1d5a44', belly: '#a8d8a8', mem: null, eye: '255,230,90', br: '150,230,90' },
    kaiser: { body: '#c8322a', dark: '#5e1410', belly: '#ffcf7a', mem: 'rgba(150,30,24,.8)', eye: '255,220,80', br: '255,150,60' },
  };
  function drakeWing(P, kind, front, flap, t) {
    ctx.save(); ctx.rotate((front ? -0.15 : -0.45) + (front ? -flap : flap * 0.8)); if (!front) ctx.scale(0.85, 0.85);
    const tips = [[-46, -64], [-62, -44], [-66, -20], [-54, 0]];
    if (kind === 'thorn') {
      for (let i = 0; i < 4; i++) { const [x, y] = tips[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(x * 0.5 - 10, y * 0.5 - 14, x, y); ctx.quadraticCurveTo(x * 0.6 + 8, y * 0.6 + 6, 0, 0); fillO(i % 2 ? P.mem : '#3a7a34'); ctx.strokeStyle = 'rgba(200,240,160,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x * 0.92, y * 0.92); ctx.stroke(); }
      ctx.restore(); return;
    }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -52); ctx.lineTo(tips[0][0], tips[0][1]);
    for (let i = 1; i < 4; i++) { const [x0, y0] = tips[i - 1], [x1, y1] = tips[i]; ctx.quadraticCurveTo((x0 + x1) / 2 + 12, (y0 + y1) / 2 + 2, x1, y1); }
    ctx.quadraticCurveTo(-24, 0, 0, 8); ctx.closePath();
    ctx.fillStyle = P.mem; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = OUT; ctx.stroke();
    if (kind === 'bone') { ctx.fillStyle = 'rgba(10,6,20,.85)'; for (const [hx, hy, r] of [[-38, -40, 5], [-50, -18, 4], [-30, -16, 3]]) { ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.fill(); } }
    if (kind === 'frost') { ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 - i * 10, -30 + i * 6); ctx.lineTo(-20 - i * 10, -40 + i * 6); ctx.lineTo(-24 - i * 10, -28 + i * 6); ctx.fill(); } }
    ctx.strokeStyle = kind === 'bone' ? P.body : P.dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -52); for (const [x, y] of tips) { ctx.moveTo(-20, -52); ctx.lineTo(x, y); } ctx.stroke();
    ctx.restore();
  }
  function drakeHead(P, kind, open, t, k = 0) {
    // Kopf schaut nach links, (0,0) = Ansatz am Hals
    const eye = P.eye;
    if (kind === 'bone') {
      ctx.save(); ctx.translate(-10, 6); ctx.rotate(-open * 0.5);
      poly([[0, 0], [-26, 2], [-30, 6], [-4, 8]], P.body, true); for (let i = 0; i < 5; i++) poly([[-6 - i * 5, 2], [-8 - i * 5, -2], [-10 - i * 5, 2]], '#fff', false);
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(6, 4); ctx.quadraticCurveTo(8, -16, -8, -18); ctx.quadraticCurveTo(-24, -16, -34, -6); ctx.lineTo(-36, 2); ctx.lineTo(-8, 6); ctx.closePath(); fillO(P.body);
      for (let i = 0; i < 5; i++) poly([[-12 - i * 5, 6], [-14 - i * 5, 11], [-16 - i * 5, 6]], '#fff', false);
      ctx.fillStyle = '#140a20'; ctx.beginPath(); ctx.ellipse(-10, -8, 6, 5, -0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-30, -4, 2, 1.4, 0, 0, 7); ctx.fill();
      glowDot(-10, -8, 9, eye, 0.9); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-10, -8, 1.6, 0, 7); ctx.fill();
      for (const sg of [0, 1]) poly([[2 - sg * 6, -14], [14 - sg * 4, -30 - sg * 4], [8 - sg * 6, -12]], P.dark, true);
      ctx.strokeStyle = 'rgba(80,60,40,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(0, -6); ctx.lineTo(-4, 2); ctx.stroke();
      return;
    }
    if (kind === 'frost') {
      ctx.save(); ctx.translate(-8, 4); ctx.rotate(-open * 0.45); poly([[0, 0], [-34, 3], [-30, 8], [-2, 8]], P.belly, true); ctx.restore();
      ctx.beginPath(); ctx.moveTo(6, 6); ctx.quadraticCurveTo(10, -14, -6, -16); ctx.quadraticCurveTo(-28, -12, -40, -2); ctx.lineTo(-38, 4); ctx.lineTo(-6, 6); ctx.closePath(); fillO(P.body);
      ctx.fillStyle = 'rgba(122,168,200,.35)'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.quadraticCurveTo(-26, -10, -38, -2); ctx.lineTo(-30, -4); ctx.quadraticCurveTo(-18, -10, -6, -10); ctx.fill();
      for (const [x, y, l, a] of [[0, -14, 26, -0.5], [-4, -15, 22, -0.75], [4, -10, 20, -0.2], [-10, -14, 14, -1]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); poly([[0, -3], [l, 0], [0, 3]], '#bfeaff', true); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(2, -1, l * 0.6, 1); ctx.restore(); }
      for (let i = 0; i < 3; i++) poly([[-14 - i * 6, 6], [-16 - i * 6, 14 + i], [-18 - i * 6, 6]], '#dff4ff', true);
      glowDot(-16, -6, 8, eye, 0.85); ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.ellipse(-16, -6, 3.2, 1.6, -0.2, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) { const p = (t * 0.7 + i / 3) % 1; ctx.fillStyle = `rgba(220,245,255,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.arc(-40 - p * 14, -4 - p * 8 + Math.sin(t * 3 + i) * 2, 2 + p * 4, 0, 7); ctx.fill(); }
      return;
    }
    if (kind === 'thorn') {
      ctx.save(); ctx.translate(-8, 4); ctx.rotate(-open * 0.5); poly([[0, 0], [-28, 4], [-24, 9], [0, 8]], P.dark, true); ctx.restore();
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(4, -6); ctx.rotate(-1.6 + i * 0.5); poly([[0, -4], [16, 0], [0, 4]], i % 2 ? '#5aa84a' : '#7ac860', true); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(4, -12); ctx.lineTo(-10, -16); ctx.lineTo(-30, -8); ctx.lineTo(-34, 2); ctx.lineTo(-6, 7); ctx.closePath(); fillO(P.body);
      for (let i = 0; i < 6; i++) poly([[-6 - i * 4, -12 + i * 1.4], [-4 - i * 4, -22 + i * 1.6], [-2 - i * 4, -12 + i * 1.4]], '#2a3a1a', true);
      ctx.fillStyle = '#ff6b9a'; ctx.beginPath(); ctx.arc(-2, -18, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#ffb0c8'; ctx.beginPath(); ctx.arc(-2, -18, 1.8, 0, 7); ctx.fill();
      for (let i = 0; i < 4; i++) poly([[-12 - i * 5, 6], [-14 - i * 5, 10], [-16 - i * 5, 6]], '#f4f0d8', false);
      glowDot(-14, -6, 7, eye, 0.9); ctx.fillStyle = '#fff0f4'; poly([[-18, -6], [-11, -8], [-12, -4]], '#fff0f4');
      return;
    }
    // Hydra-Kopf
    ctx.save(); ctx.translate(-6, 4); ctx.rotate(-open * 0.55); poly([[0, 0], [-22, 3], [-18, 7], [0, 6]], P.dark, true); ctx.restore();
    ctx.beginPath(); ctx.moveTo(5, 5); ctx.quadraticCurveTo(6, -10, -6, -11); ctx.quadraticCurveTo(-20, -8, -26, 0); ctx.lineTo(-6, 5); ctx.closePath(); fillO(P.body);
    poly([[2, -8], [12, -18 + Math.sin(t * 4 + k) * 2], [8, -4]], '#7ad0a0', true);
    glowDot(-10, -4, 6, eye, 0.9); ctx.fillStyle = '#1b1726'; ctx.fillRect(-11, -5.5, 2, 3);
    const dp = (t * 0.8 + k * 0.3) % 1; ctx.fillStyle = `rgba(150,230,90,${1 - dp})`; ctx.beginPath(); ctx.ellipse(-20, 6 + dp * 18, 1.6, 2.4, 0, 0, 7); ctx.fill();
  }
  function drakeBreath(P, kind, x, y, a, t) {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const len = 150 * a;
    const g = ctx.createLinearGradient(x, y, x - len, y + 30); g.addColorStop(0, `rgba(${P.br},${0.7 * a})`); g.addColorStop(1, `rgba(${P.br},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x - len, y + 30 - 26 * a); ctx.lineTo(x - len, y + 30 + 26 * a); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 14; i++) { const p = (t * 1.6 + i / 14) % 1, px = x - p * len, py = y + p * 30 + Math.sin(i * 2.7 + t * 9) * 16 * p;
      if (kind === 'frost') { ctx.fillStyle = `rgba(255,255,255,${1 - p})`; sparkle(px, py, 3, 1 - p); }
      else if (kind === 'thorn') { ctx.save(); ctx.translate(px, py); ctx.rotate(i + t * 6); ctx.fillStyle = i % 2 ? `rgba(255,140,190,${1 - p})` : `rgba(90,160,60,${1 - p})`; ctx.beginPath(); ctx.ellipse(0, 0, 4, 1.6, 0, 0, 7); ctx.fill(); ctx.restore(); }
      else { glowDot(px, py, 6 + p * 6, P.br, (1 - p) * 0.8); } }
    ctx.restore();
  }
  function drawDragon(e, t, kind) {
    const P = DRAKE[kind], ph = t + e.bob, flap = Math.sin(ph * 3) * 0.25, br = Math.sin(ph * 1.6) * 2;
    const ca = e.castT > 0 ? Math.sin((1 - e.castT / 0.8) * Math.PI) : 0, lx = -ca * 12;
    const open = Math.max(ca, kind === 'bone' ? Math.max(0, Math.sin(ph * 5)) * 0.25 : 0.05 + Math.max(0, Math.sin(ph * 1.2)) * 0.12);
    // Schwanz
    const tw = Math.sin(ph * 1.8) * 8;
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(24, -26); ctx.quadraticCurveTo(58, -18 + tw * 0.4, 84, -8 + tw); ctx.stroke();
    ctx.strokeStyle = kind === 'bone' ? P.dark : P.body; ctx.lineWidth = 11; ctx.stroke();
    if (kind === 'bone') { ctx.strokeStyle = P.body; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
    ctx.save(); ctx.translate(84, -8 + tw);
    if (kind === 'frost') poly([[0, -8], [16, 0], [0, 8], [4, 0]], '#bfeaff', true);
    else if (kind === 'thorn') { ctx.fillStyle = '#ff6b9a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.26) * 4, Math.sin(i * 1.26) * 4, 3.4, 0, 7); ctx.fill(); } ctx.fillStyle = '#ffd0e0'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, 7); ctx.fill(); }
    else if (kind === 'bone') poly([[0, -5], [14, 0], [0, 5]], P.body, true);
    else poly([[0, -2], [12, -10], [8, 2], [12, 10], [0, 4]], '#7ad0a0', true);
    ctx.restore();
    // hinterer Flügel
    if (P.mem) { ctx.save(); ctx.translate(12, -70); drakeWing(P, kind, false, flap, t); ctx.restore(); }
    // Beine hinten
    for (const lx2 of [6, 20]) { ctx.save(); ctx.translate(lx2, -30); rr(-7, 0, 14, 30, 6); fillO(lx2 === 6 ? P.dark : P.body); poly([[-8, 30], [-10, 34], [-4, 30]], '#f4f0e0'); poly([[-2, 30], [-4, 34], [2, 30]], '#f4f0e0'); ctx.restore(); }
    // Körper
    ctx.save(); ctx.translate(4, -48 - br);
    const bg = ctx.createLinearGradient(0, -28, 0, 28); bg.addColorStop(0, P.body); bg.addColorStop(1, P.dark);
    ctx.beginPath(); ctx.ellipse(0, 0, 36, 28, 0, 0, 7);
    if (kind === 'bone') { ctx.fillStyle = 'rgba(30,16,46,.92)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke(); glowDot(-2, 2, 22, P.eye, 0.35 + 0.15 * Math.sin(ph * 3));
      ctx.strokeStyle = P.body; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const x = -22 + i * 9; ctx.beginPath(); ctx.moveTo(x, -22 + Math.abs(i - 2.5) * 2); ctx.quadraticCurveTo(x - 8, 2, x - 2, 20 - Math.abs(i - 2.5) * 2); ctx.stroke(); }
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, -18); ctx.quadraticCurveTo(0, -30, 32, -14); ctx.stroke(); }
    else { ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.fillStyle = P.belly; ctx.beginPath(); ctx.ellipse(-10, 6, 18, 18, 0.2, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-26, -6 + i * 6); ctx.lineTo(4, -4 + i * 6); ctx.stroke(); } }
    for (let i = 0; i < 6; i++) { const x = -20 + i * 9, y = -26 + Math.abs(i - 2) * 1.5;
      if (kind === 'frost') poly([[x - 3, y + 3], [x + 1, y - 12 - (i % 2) * 4], [x + 4, y + 3]], '#bfeaff', true);
      else if (kind === 'thorn') poly([[x - 2, y + 2], [x + 3, y - 10], [x + 4, y + 3]], '#2a3a1a', true);
      else if (kind === 'bone') { ctx.fillStyle = P.body; ctx.beginPath(); ctx.arc(x, y - 2, 3, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = '#7ad0a0'; ctx.beginPath(); ctx.ellipse(x, y - 1, 3, 5, 0.4, 0, 7); ctx.fill(); } }
    if (kind === 'thorn') { ctx.strokeStyle = '#2a5a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 10); ctx.bezierCurveTo(-10, -12, 10, 24, 30, -2); ctx.stroke(); for (const [rx, ry] of [[-14, 0], [12, 8]]) { ctx.fillStyle = '#ff6b9a'; ctx.beginPath(); ctx.arc(rx, ry, 3.6, 0, 7); ctx.fill(); } }
    if (kind === 'hydra') for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(90,140,60,.7)'; ctx.beginPath(); ctx.ellipse(-20 + i * 12, -18 + (i % 2) * 6, 6, 2.4, 0.3, 0, 7); ctx.fill(); }
    ctx.restore();
    // Vorderbein
    ctx.save(); ctx.translate(-22, -34); rr(-6, 0, 12, 34, 5); fillO(P.body); poly([[-7, 34], [-11, 38], [-3, 34]], '#f4f0e0'); poly([[-1, 34], [-4, 38], [3, 34]], '#f4f0e0'); ctx.restore();
    // Hälse und Köpfe
    const heads = kind === 'hydra' ? [[-36, -104, 0], [-12, -124, 1.7], [-58, -84, 3.1]] : [[-34, -108, 0]];
    for (const [hx0, hy0, k] of heads) {
      const sw = kind === 'hydra' ? Math.sin(ph * 1.7 + k) * 6 : Math.sin(ph * 1.2) * 3;
      const hx = hx0 + lx + sw, hy = hy0 - br + (kind === 'hydra' ? Math.cos(ph * 1.3 + k) * 4 : 0);
      ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = kind === 'hydra' ? 12 : 15; ctx.beginPath(); ctx.moveTo(-8, -60 - br); ctx.quadraticCurveTo(hx + 16, (hy - 60) / 2 - 10, hx + 6, hy + 2); ctx.stroke();
      ctx.strokeStyle = kind === 'bone' ? P.dark : P.body; ctx.lineWidth = kind === 'hydra' ? 9 : 12; ctx.stroke();
      if (kind === 'bone') { ctx.strokeStyle = P.body; ctx.lineWidth = 4; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
      else { ctx.strokeStyle = P.belly; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -58 - br); ctx.quadraticCurveTo(hx + 10, (hy - 60) / 2 - 6, hx + 2, hy + 6); ctx.stroke(); }
      ctx.save(); ctx.translate(hx, hy); drakeHead(P, kind, open, ph, k); ctx.restore();
      drakeBreath(P, kind, hx - 34, hy + 4, kind === 'hydra' ? ca * 0.7 : ca, ph);
    }
    // vorderer Flügel
    if (P.mem) { ctx.save(); ctx.translate(-4, -74 - br); drakeWing(P, kind, true, flap, t); ctx.restore(); }
    // Umgebungsteilchen
    for (let i = 0; i < 6; i++) { const p = (ph * 0.4 + i / 6) % 1, x = Math.sin(i * 2.1) * 50, y = -10 - p * 130;
      if (kind === 'bone') glowDot(x, y, 4, P.eye, 0.6 * (1 - p)); else if (kind === 'frost') { ctx.fillStyle = `rgba(255,255,255,${1 - p})`; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); }
      else if (kind === 'thorn') { ctx.fillStyle = `rgba(255,140,190,${1 - p})`; ctx.beginPath(); ctx.ellipse(x, -140 + p * 140, 3, 1.4, i, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = `rgba(150,220,120,${0.5 * (1 - p)})`; ctx.beginPath(); ctx.arc(x, -4 - p * 30, 3 + p * 4, 0, 7); ctx.fill(); } }
  }

  // Neue Klassen
  // Helden aus den Expeditionen

  function turret(x, t, fire, alpha = 1, small = false) {
    ctx.globalAlpha = alpha; shadow(x, small ? 8 : 12);
    ctx.save(); ctx.translate(x, GROUND); if (small) ctx.scale(0.72, 0.72);
    // Dreibein aus Holz
    ctx.lineCap = 'round';
    for (const [a, b] of [[-11, 0], [11, 0], [2, 1]]) { ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(a, b); ctx.stroke(); ctx.strokeStyle = '#8a5d36'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(a, b); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, -13, 10, 3, 0, 0, 7); fillO('#c9a24a');
    // Gehäuse
    rr(-10, -27, 20, 14, 4); fillO(LG(-27, -13, '#e0894a', '#9a4e1c'));
    ctx.fillStyle = '#ffd38a'; for (const [rx, ry] of [[-7, -24], [7, -24], [-7, -16], [7, -16]]) { ctx.beginPath(); ctx.arc(rx, ry, 1, 0, 7); ctx.fill(); }
    // Zahnrad dreht sich
    ctx.save(); ctx.translate(-4, -20); ctx.rotate(t * 3 + x);
    ctx.fillStyle = '#c9a24a'; for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate(k * Math.PI / 4); ctx.fillRect(-1, -6.2, 2, 2.4); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, 7); fillO('#e2c070'); ctx.fillStyle = '#6b4a20'; ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, 7); ctx.fill(); ctx.restore();
    // Lauf mit Messingringen und Rückstoß
    ctx.save(); ctx.translate(3 - fire * 3, -21); ctx.rotate(-0.06);
    rr(0, -3.5, 19, 7, 3); fillO(LG(-4, 4, '#7e8794', '#3c424c'));
    ctx.fillStyle = '#d9b45a'; ctx.fillRect(4, -3.8, 2, 7.6); ctx.fillRect(12, -3.8, 2, 7.6); ctx.fillRect(17.5, -4.2, 2.2, 8.4);
    ctx.restore();
    // Kessel-Schornstein mit Dampf
    ctx.fillStyle = '#5b5f6b'; ctx.fillRect(-9, -32, 4, 6);
    for (let k = 0; k < 3; k++) { const ph = (t * 0.8 + k / 3 + x * 0.01) % 1; ctx.fillStyle = `rgba(230,230,240,${0.35 * (1 - ph)})`; ctx.beginPath(); ctx.arc(-7 + ph * 4, -34 - ph * 12, 1.5 + ph * 3, 0, 7); ctx.fill(); }
    // Mündungsfeuer
    if (fire > 0) { glowDot(24, -22, 9 + fire * 6, '255,190,90', fire); ctx.fillStyle = `rgba(255,240,180,${fire})`; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.5 : 6 + fire * 3, a = k * Math.PI / 5; ctx.lineTo(24 + Math.cos(a) * r, -22 + Math.sin(a) * r); } ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // Knochen mit dunkler Kontur
  function bone(x1, y1, x2, y2, w, col = '#ebe6d6') { ctx.lineCap = 'round'; ctx.strokeStyle = '#4a4436'; ctx.lineWidth = w + 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function minion(x, t, sw, alpha, big = false) {
    ctx.globalAlpha = alpha; shadow(x, big ? 11 : 8);
    const sc = big ? 1.05 : 0.78, step = Math.sin(t * 7 + x) * 2;
    ctx.save(); ctx.translate(x, GROUND); ctx.scale(sc, sc);
    if (big) glowDot(0, -24, 30, '107,224,184', 0.35 + 0.15 * Math.sin(t * 4 + x));
    // Beine
    bone(-3, -15, -5 + step * 0.5, -7, 2.6); bone(-5 + step * 0.5, -7, -6 + step, 0, 2.4);
    bone(3, -15, 5 - step * 0.5, -7, 2.6); bone(5 - step * 0.5, -7, 6 - step, 0, 2.4);
    // Becken und Wirbelsäule
    ctx.beginPath(); ctx.ellipse(0, -15, 5, 2.6, 0, 0, 7); fillO('#ddd8c6');
    bone(0, -15, 0, -33, 2.4, '#d8d2bf');
    // Rippen
    ctx.strokeStyle = '#4a4436'; ctx.lineWidth = 2.6; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(0, -29 + k * 4, 6 - k * 0.6, 2.2, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); }
    ctx.strokeStyle = '#ebe6d6'; ctx.lineWidth = 1.4; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(0, -29 + k * 4, 6 - k * 0.6, 2.2, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); }
    // hinterer Arm mit Rundschild
    bone(-3, -31, -8, -24, 2.2); ctx.beginPath(); ctx.arc(-9, -22, 5.5, 0, 7); fillO(big ? '#2f6b55' : '#6b4a2e'); ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-9, -22, 3.8, 0, 7); ctx.stroke();
    // vorderer Arm mit Schwert, schwingt beim Angriff
    ctx.save(); ctx.translate(3, -31); ctx.rotate(sw > 0 ? -1.3 + (1 - sw) * 1.9 : -0.35 + Math.sin(t * 2 + x) * 0.05);
    bone(0, 0, 7, 3, 2.2); ctx.fillStyle = '#6b4a2e'; ctx.fillRect(6, 1, 3, 4); ctx.fillStyle = '#c9a24a'; ctx.fillRect(4.5, 3.5, 6, 1.6);
    ctx.beginPath(); ctx.moveTo(6.6, 5); ctx.lineTo(9.4, 5); ctx.lineTo(8.6, 18); ctx.lineTo(8, 20); ctx.lineTo(7.4, 18); ctx.closePath(); fillO(LG(5, 20, '#e8eef4', '#8a96a4'));
    ctx.restore();
    // Schädel mit leuchtenden Augen
    ctx.beginPath(); ctx.arc(0, -39, 6.4, 0, 7); fillO('#f2eedf');
    rr(-3.8, -36, 7.6, 4.4, 1.6); fillO('#e6e1cf');
    ctx.fillStyle = '#4a4436'; for (let k = -2; k <= 2; k += 2) ctx.fillRect(k - 0.3, -34.6, 0.6, 2.6);
    ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.ellipse(-2.4, -39.5, 1.8, 2.1, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(2.4, -39.5, 1.8, 2.1, 0, 0, 7); ctx.fill();
    glowDot(-2.4, -39.5, 4, '107,224,184', 0.9); glowDot(2.4, -39.5, 4, '107,224,184', 0.9);
    ctx.fillStyle = '#9dffd8'; ctx.fillRect(-2.9, -40, 1, 1); ctx.fillRect(1.9, -40, 1, 1);
    if (big) { ctx.beginPath(); ctx.moveTo(-7, -42); ctx.lineTo(-11, -50); ctx.lineTo(-4, -45); fillO('#d8d2bf'); ctx.beginPath(); ctx.moveTo(7, -42); ctx.lineTo(11, -50); ctx.lineTo(4, -45); fillO('#d8d2bf'); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // Knochenriese (Nekromant, Siegel): hält vorne alle Nahkampf-Treffer ab
  function boneGiant(x, t, f) {
    const br = Math.sin(t * 2) * 1.5;
    shadow(x, 30); glowDot(x, GROUND - 52, 60, '107,224,184', 0.25);
    ctx.save(); ctx.translate(x, GROUND);
    bone(-9, -40, -12, -20, 6); bone(-12, -20, -13, 0, 5.5); bone(9, -40, 12, -20, 6); bone(12, -20, 13, 0, 5.5);
    ctx.beginPath(); ctx.ellipse(0, -40, 14, 6, 0, 0, 7); fillO('#ddd8c6');
    bone(0, -40, 0, -80, 5, '#d8d2bf');
    glowDot(0, -64 + br, 16, '107,224,184', 0.7);
    for (let k = 0; k < 4; k++) { ctx.strokeStyle = '#4a4436'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, -74 + k * 7 + br, 17 - k * 1.5, 5.5, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); ctx.strokeStyle = '#ebe6d6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -74 + k * 7 + br, 17 - k * 1.5, 5.5, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); }
    bone(-16, -80, -26, -60, 5.5); bone(-26, -60, -22, -42, 5);
    bone(16, -80, 26, -64, 5.5); ctx.save(); ctx.translate(26, -64); ctx.rotate(0.5 + Math.sin(t * 2.5) * 0.12); bone(0, 0, 12, 4, 5); bone(10, 2, 30, 8, 8, '#d8d2bf'); ctx.beginPath(); ctx.arc(31, 8, 7, 0, 7); fillO('#ebe6d6'); ctx.restore();
    ctx.beginPath(); ctx.arc(0, -94 + br, 13, 0, 7); fillO('#f2eedf');
    rr(-8, -88 + br, 16, 8, 3); fillO('#e6e1cf');
    ctx.fillStyle = '#4a4436'; for (let k = -5; k <= 5; k += 2.5) ctx.fillRect(k - 0.5, -86 + br, 1, 4.5);
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 10, -100 + br); ctx.quadraticCurveTo(sx * 22, -110 + br, sx * 20, -122 + br); ctx.quadraticCurveTo(sx * 16, -108 + br, sx * 6, -104 + br); fillO('#d8d2bf'); }
    ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.ellipse(-5, -95 + br, 3.6, 4, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, -95 + br, 3.6, 4, 0, 0, 7); ctx.fill();
    glowDot(-5, -95 + br, 8, '107,224,184', 1); glowDot(5, -95 + br, 8, '107,224,184', 1);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(x - 22, GROUND - 132, 44, 5, 2); ctx.fill(); ctx.fillStyle = '#6be0b8'; rr(x - 22, GROUND - 132, 44 * f, 5, 2); ctx.fill();
  }
  // Schattenklon (Assassine, Siegel): halb durchsichtige Kopie mit Rauch
  function shadowClone(x, t) {
    for (let k = 0; k < 6; k++) { const ph = (t * 0.7 + k / 6) % 1; glowDot(x + Math.sin(k * 2.1 + t) * 10, GROUND - 4 - ph * 30, 7 + ph * 6, '120,40,160', 0.4 * (1 - ph)); }
    ctx.save(); ctx.globalAlpha = 0.5 + 0.1 * Math.sin(t * 6); DRAW.a(x, null, t, false); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.18; ctx.globalCompositeOperation = 'lighter'; DRAW.a(x + 2, null, t, false); ctx.restore();
  }
  // Eber (Tierbändiger, Siegel): stürmt durch die Gegner
  function boar(x, t) {
    const g = Math.sin(t * 30), y = GROUND;
    shadow(x, 18);
    for (let k = 0; k < 4; k++) glowDot(x - 24 - k * 8, y - 3 - k, 6 + k * 2, '180,150,110', 0.3 - k * 0.06);
    ctx.save(); ctx.translate(x, y);
    for (const [lx, ph] of [[-11, 0], [-5, 1], [7, 1], [12, 0]]) { ctx.save(); ctx.translate(lx, -9); ctx.rotate((ph ? g : -g) * 0.5); rr(-2, 0, 4, 9, 1.5); fillO('#4a2f1a'); ctx.restore(); }
    ctx.beginPath(); ctx.ellipse(0, -15, 17, 9, -0.05, 0, 7); fillO(LG(-24, -6, '#9a6a42', '#5a3a20'));
    ctx.fillStyle = '#3a2414'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-12 + k * 3, -23); ctx.lineTo(-11 + k * 3, -28 + (k % 2) * 2); ctx.lineTo(-9.5 + k * 3, -23); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(13, -21); ctx.quadraticCurveTo(24, -20, 27, -13); ctx.lineTo(25, -8); ctx.quadraticCurveTo(18, -7, 12, -10); ctx.closePath(); fillO('#8a5a36');
    ctx.beginPath(); ctx.ellipse(27, -11, 3, 3.4, 0, 0, 7); fillO('#e0a090'); ctx.fillStyle = '#5a2a2a'; ctx.fillRect(26.2, -12, 1, 1.5); ctx.fillRect(27.6, -12, 1, 1.5);
    ctx.beginPath(); ctx.moveTo(22, -9); ctx.quadraticCurveTo(26, -6, 25, -2); ctx.quadraticCurveTo(23, -6, 20.5, -8); fillO('#f4ecd8');
    ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(19, -17, 1.4, 0, 7); ctx.fill(); glowDot(19, -17, 3, '255,80,40', 0.6);
    ctx.beginPath(); ctx.moveTo(13, -21); ctx.lineTo(15, -27); ctx.lineTo(17, -21); fillO('#6a4426');
    ctx.restore();
  }
  // ---------- Begleiter (Version 1.0: neu gezeichnet) ----------
  // Drache: kleiner roter Drache mit Hörnern, Flughäuten, Bauchschuppen und Schwanzspitze; speit Feuer aus dem Maul
  function dragonC(x, y, t, a) {
    const f = Math.sin(t * 7) * 11, tw = Math.sin(t * 3) * 4, fire = a > 0;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 5);
    const wing = (sx, sy, s, c1, c2, bone) => {
      ctx.save(); ctx.translate(sx, sy); ctx.scale(s, s);
      const ex = -3, ey = -15 - f * 0.55, tx = -16, ty = -31 - f, f1x = -27, f1y = -17 - f * 0.6, f2x = -24, f2y = -5 - f * 0.25;
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(ex, ey); ctx.lineTo(tx, ty);
      ctx.quadraticCurveTo(-18, (ty + f1y) / 2 + 3, f1x, f1y); ctx.quadraticCurveTo(-20, (f1y + f2y) / 2 + 2, f2x, f2y); ctx.quadraticCurveTo(-12, -1, -8, 4); ctx.closePath();
      fillO(LG(ty, 4, c1, c2));
      ctx.strokeStyle = bone; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(ex, ey); ctx.lineTo(tx, ty); ctx.moveTo(ex, ey); ctx.lineTo(f1x, f1y); ctx.moveTo(ex, ey); ctx.lineTo(f2x, f2y); ctx.stroke();
      ctx.fillStyle = '#ffd59a'; ctx.beginPath(); ctx.arc(tx, ty, 1.4, 0, 7); ctx.fill();
      ctx.restore();
    };
    // ferner Flügel
    wing(2, -6, 0.82, '#b8323a', '#5a1018', '#4a0e14');
    // Schwanz mit Spitze
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.quadraticCurveTo(-24, -5 + tw, -38, 3 + tw * 1.4); ctx.quadraticCurveTo(-24, 5 + tw, -8, 5); ctx.closePath(); fillO(LG(-6, 6, '#e5484d', '#8e1f28'));
    ctx.save(); ctx.translate(-38, 3 + tw * 1.4); ctx.rotate(0.35 + tw * 0.04);
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-5, -5); ctx.lineTo(-10, 0.5); ctx.lineTo(-5, 5); ctx.closePath(); fillO(LG(-5, 5, '#ffd27a', '#e08a2a')); ctx.restore();
    // Hinterbein
    ctx.save(); ctx.translate(-3, 5); ctx.rotate(0.3 + Math.sin(t * 2) * 0.1); rr(-2.5, 0, 5, 8, 2); fillO('#a82a34');
    ctx.strokeStyle = '#ffe9c8'; ctx.lineWidth = 1.2; ctx.beginPath(); for (const k of [-2, 0, 2]) { ctx.moveTo(k, 8); ctx.lineTo(k + 1.5, 10.5); } ctx.stroke(); ctx.restore();
    // Rumpf
    ctx.save(); ctx.rotate(-0.12); ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, 7); fillO(LG(-8, 8, '#f0626a', '#9c2430'));
    ctx.beginPath(); ctx.ellipse(1, 3.5, 10.5, 4, 0, 0, Math.PI); ctx.fillStyle = '#ffd59a'; ctx.fill();
    ctx.strokeStyle = 'rgba(180,90,40,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); for (let k = -7; k <= 8; k += 3) { ctx.moveTo(k, 3.6); ctx.lineTo(k, 6.8 - Math.abs(k) * 0.12); } ctx.stroke();
    ctx.restore();
    // Rückenstacheln
    ctx.fillStyle = '#ffb547'; for (let k = 0; k < 5; k++) { const sx = -11 + k * 5, sy = -7.5 + k * -0.6; ctx.beginPath(); ctx.moveTo(sx - 2, sy + 1.5); ctx.lineTo(sx + 0.5, sy - 3.5); ctx.lineTo(sx + 2.5, sy + 1); ctx.closePath(); ctx.fill(); }
    // Vorderbein
    ctx.save(); ctx.translate(9, 4); ctx.rotate(-0.2); rr(-2, 0, 4.5, 6, 2); fillO('#c23642'); ctx.restore();
    // Hals und Kopf
    ctx.beginPath(); ctx.moveTo(6, -6); ctx.quadraticCurveTo(14, -10, 17, -18); ctx.lineTo(23, -15); ctx.quadraticCurveTo(18, -6, 11, 2); ctx.closePath(); fillO(LG(-18, 2, '#f0626a', '#b02a36'));
    ctx.save(); ctx.translate(21, -17);
    // Hörner
    ctx.fillStyle = '#ffe9c8'; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
    for (const [hx, hy, l] of [[-3, -4, 9], [1, -5, 7]]) { ctx.beginPath(); ctx.moveTo(hx - 2, hy + 1); ctx.quadraticCurveTo(hx - l * 0.6, hy - l * 0.3, hx - l, hy - l * 0.15 - 2); ctx.quadraticCurveTo(hx - l * 0.4, hy - 1, hx + 2, hy + 1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // Unterkiefer (klappt beim Feuerspeien auf)
    ctx.save(); ctx.translate(2, 2); ctx.rotate(fire ? 0.45 : 0.04); rr(-1, -1, 12, 4, 2); fillO('#b02a36'); ctx.restore();
    // Schädel und Schnauze
    ctx.beginPath(); ctx.moveTo(-6, 2); ctx.quadraticCurveTo(-6, -7, 2, -7); ctx.quadraticCurveTo(9, -6, 13, -2); ctx.quadraticCurveTo(14, 1, 11, 2.5); ctx.lineTo(-2, 3.5); ctx.closePath(); fillO(LG(-7, 3, '#f47a80', '#c23642'));
    ctx.fillStyle = '#5a1018'; ctx.beginPath(); ctx.arc(11, -2.5, 0.9, 0, 7); ctx.fill();
    const blink = (t % 4.3) < 0.13 ? 0.15 : 1;
    ctx.save(); ctx.translate(2.5, -3); ctx.scale(1, blink); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.fillRect(-0.5, -1.8, 1.1, 3.6); ctx.restore();
    ctx.strokeStyle = '#7a1a24'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-0.5, -5.8); ctx.lineTo(5, -5); ctx.stroke();
    if (fire) glowDot(13, 2, 12, '255,170,60', Math.min(1, a));
    else for (let i = 0; i < 2; i++) { const p = (t * 0.7 + i * 0.5) % 1; ctx.fillStyle = `rgba(190,190,200,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(13 + p * 5, -3 - p * 10, 1.2 + p * 2.2, 0, 7); ctx.fill(); }
    ctx.restore();
    // naher Flügel
    wing(-1, -7, 1, '#ff8a6a', '#b02a36', '#7a1a24');
    // Feueratem aus dem Maul
    if (fire) {
      const al = Math.min(1, a), mx = 33, my = -13;
      const g = ctx.createLinearGradient(mx, 0, 260, 0); g.addColorStop(0, `rgba(255,240,170,${al})`); g.addColorStop(0.25, `rgba(255,160,60,${al * 0.9})`); g.addColorStop(1, 'rgba(255,70,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx, my - 2); ctx.quadraticCurveTo(140, 10, 260, 58); ctx.lineTo(260, 122); ctx.quadraticCurveTo(140, 50, mx, my + 4); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 10; i++) { const p = (t * 1.6 + i * 0.1) % 1, px = mx + p * 220, py = my + p * (34 + 55 * hash(i)) + Math.sin(t * 9 + i) * 4; glowDot(px, py, 4 + p * 9, i % 2 ? '255,200,80' : '255,110,40', al * (1 - p)); }
    }
    ctx.restore();
  }
  // Eule: runder Federball mit Gesichtsschleier, Federohren und großen Bernstein-Augen
  function owlC(x, y, t) {
    const fl = Math.sin(t * 9), bob = Math.sin(t * 3) * 3;
    ctx.save(); ctx.translate(x, y + bob);
    // Flügel
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.translate(7, -1); ctx.rotate(-0.15 - fl * 0.35);
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(10, -10, 21, -6);
      for (let k = 0; k < 4; k++) { const fx = 21 - k * 4.5, fy = -6 + k * 3.2; ctx.quadraticCurveTo(fx + 1, fy + 4, fx - 3.5, fy + 3); }
      ctx.quadraticCurveTo(4, 8, 0, 6); ctx.closePath(); fillO(LG(-8, 8, '#c9a46a', '#6e5232'));
      ctx.strokeStyle = 'rgba(255,240,210,.55)'; ctx.lineWidth = 0.9; ctx.beginPath();
      for (let k = 0; k < 4; k++) { const fx = 21 - k * 4.5, fy = -6 + k * 3.2; ctx.moveTo(4, 0); ctx.quadraticCurveTo(fx - 4, fy - 1, fx - 2, fy + 2); } ctx.stroke();
      ctx.restore();
    }
    // Körper
    ctx.beginPath(); ctx.ellipse(0, 3, 10, 12, 0, 0, 7); fillO(LG(-9, 15, '#c9a46a', '#7a5a36'));
    ctx.beginPath(); ctx.ellipse(0, 6, 6.8, 8.2, 0, 0, 7); ctx.fillStyle = '#f2e4c2'; ctx.fill();
    ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1; ctx.beginPath();
    for (const [vx, vy] of [[-3, 2], [1.5, 2], [-1, 6], [3.5, 6], [-3.5, 9.5], [1, 9.5], [-1, 12.5]]) { ctx.moveTo(vx - 1.2, vy); ctx.lineTo(vx, vy + 1.3); ctx.lineTo(vx + 1.2, vy); } ctx.stroke();
    // Krallen
    ctx.strokeStyle = '#e0a020'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath(); for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.moveTo(s * 3, 14); ctx.lineTo(s * 3 + k * 1.3, 16.5); } ctx.stroke();
    // Kopf mit Federohren
    ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-11, -18); ctx.lineTo(-5, -14.5); ctx.quadraticCurveTo(0, -16, 5, -14.5); ctx.lineTo(11, -18); ctx.lineTo(10, -7); ctx.quadraticCurveTo(10, 1, 0, 1); ctx.quadraticCurveTo(-10, 1, -10, -7); ctx.closePath();
    fillO(LG(-18, 1, '#d8b47a', '#9a7446'));
    // Gesichtsschleier
    ctx.fillStyle = '#f6ead0'; ctx.beginPath(); ctx.arc(-4.2, -7, 4.8, 0, 7); ctx.arc(4.2, -7, 4.8, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(122,90,54,.7)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(-4.2, -7, 4.8, 0.6, 5.7); ctx.moveTo(4.2 + 4.8 * Math.cos(-2.55), -7 + 4.8 * Math.sin(-2.55)); ctx.arc(4.2, -7, 4.8, -2.55, 2.55, true); ctx.stroke();
    // Augen (blinzeln ab und zu)
    const open = (t % 5.1) < 0.14 ? 0.12 : 1;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 4.2, -7); ctx.scale(1, open);
      ctx.beginPath(); ctx.arc(0, 0, 3.3, 0, 7); ctx.fillStyle = RG(0, 0, 3.3, '#ffd24a', '#e07a10'); ctx.fill(); ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#140e1e'; ctx.beginPath(); ctx.arc(0, 0.2, 1.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-0.8, -0.9, 0.7, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -11.5); ctx.lineTo(-1, -9.5); ctx.moveTo(8, -11.5); ctx.lineTo(1, -9.5); ctx.stroke();
    // Schnabel
    ctx.beginPath(); ctx.moveTo(-1.6, -5.2); ctx.lineTo(1.6, -5.2); ctx.quadraticCurveTo(0.8, -2, 0, -1.2); ctx.quadraticCurveTo(-0.8, -2, -1.6, -5.2); ctx.closePath(); fillO('#e0a020');
    // goldenes Funkeln (Krit-Glück)
    const sp = (t * 0.8) % 1; if (sp < 0.35) sparkle(12, -16, 3 * Math.sin(sp / 0.35 * Math.PI), 0.9);
    ctx.restore();
  }
  // Golem: Felsbrocken mit Moos, Steinfäusten und glühendem Bernsteinkern
  function golemC(x, t) {
    shadow(x, 20);
    const br = Math.sin(t * 2), sw = Math.sin(t * 1.6) * 0.06;
    ctx.save(); ctx.translate(x, GROUND + br * 0.5);
    const stone = LG(-60, 0, '#b8c0ca', '#68707a'), dark = LG(-50, 0, '#9aa3ad', '#555c66');
    const arm = (s, front) => {
      ctx.save(); ctx.translate(s * 16, -47); ctx.rotate(s * (0.08 + sw));
      ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(6, -3); ctx.lineTo(7, 14); ctx.lineTo(-4, 15); ctx.closePath(); fillO(front ? stone : dark);
      ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(8, 12); ctx.lineTo(10, 24); ctx.lineTo(3, 30); ctx.lineTo(-7, 27); ctx.lineTo(-9, 19); ctx.closePath(); fillO(front ? stone : dark);
      ctx.strokeStyle = 'rgba(30,24,40,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, 21); ctx.lineTo(8, 19); ctx.stroke();
      ctx.restore();
    };
    arm(-1, false);
    // Beine
    for (const lx of [-13, 3]) { ctx.beginPath(); ctx.moveTo(lx, -20); ctx.lineTo(lx + 10, -21); ctx.lineTo(lx + 11, -3); ctx.lineTo(lx + 12, 0); ctx.lineTo(lx - 2, 0); ctx.lineTo(lx - 1, -4); ctx.closePath(); fillO(dark); }
    // Rumpf
    ctx.beginPath(); ctx.moveTo(-15, -18); ctx.lineTo(-20, -32); ctx.lineTo(-19, -46); ctx.lineTo(-11, -55); ctx.lineTo(3, -57); ctx.lineTo(16, -51); ctx.lineTo(20, -38); ctx.lineTo(17, -24); ctx.lineTo(9, -16); ctx.closePath(); fillO(stone);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(-17, -45); ctx.lineTo(-10, -53); ctx.lineTo(0, -55); ctx.lineTo(-10, -48); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,40,.55)'; ctx.lineWidth = 1.1; ctx.beginPath();
    ctx.moveTo(-14, -27); ctx.lineTo(-9, -30); ctx.lineTo(-10, -36); ctx.moveTo(12, -46); ctx.lineTo(8, -42); ctx.lineTo(10, -37); ctx.moveTo(6, -22); ctx.lineTo(3, -26); ctx.stroke();
    // Bernsteinkern
    const pulse = 0.75 + 0.25 * Math.sin(t * 3);
    glowDot(0, -36, 16, '255,170,60', 0.55 * pulse);
    ctx.beginPath(); ctx.moveTo(0, -43); ctx.lineTo(5, -36); ctx.lineTo(0, -29); ctx.lineTo(-5, -36); ctx.closePath(); fillO(LG(-43, -29, '#ffe7a0', '#e07a10'));
    ctx.strokeStyle = `rgba(255,190,90,${0.5 * pulse})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(5, -36); ctx.lineTo(10, -33); ctx.moveTo(-5, -36); ctx.lineTo(-10, -40); ctx.moveTo(0, -29); ctx.lineTo(-1, -24); ctx.stroke();
    // Moos
    ctx.fillStyle = '#5fa04a'; for (const [mx, my, r] of [[-12, -53, 4], [-6, -56, 3.5], [12, -51, 3.2], [-18, -42, 2.5]]) { ctx.beginPath(); ctx.arc(mx, my, r, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = '#8acb5c'; for (const [mx, my] of [[-13, -55], [-6, -58], [12, -53]]) ctx.fillRect(mx - 1, my - 1, 2, 2);
    // Kopf
    ctx.beginPath(); ctx.moveTo(-9, -54); ctx.lineTo(-8, -66); ctx.lineTo(3, -69); ctx.lineTo(11, -64); ctx.lineTo(10, -54); ctx.closePath(); fillO(LG(-69, -54, '#c4ccd6', '#7e8692'));
    ctx.fillStyle = '#2a2433'; ctx.beginPath(); ctx.moveTo(-7, -62); ctx.lineTo(10, -63); ctx.lineTo(9, -58); ctx.lineTo(-6, -57.5); ctx.closePath(); ctx.fill();
    const eye = 0.7 + 0.3 * Math.sin(t * 3);
    glowDot(-2, -60, 5, '255,180,70', eye); glowDot(6, -60, 5, '255,180,70', eye);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(-3.5, -61, 3, 2); ctx.fillRect(4.5, -61, 3, 2);
    // Kristalle auf der Schulter
    for (const [cx, cy, h, r] of [[15, -50, 9, 0.3], [19, -46, 6, 0.7]]) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(r); ctx.beginPath(); ctx.moveTo(-2.2, 0); ctx.lineTo(0, -h); ctx.lineTo(2.2, 0); ctx.closePath(); fillO(LG(-h, 0, '#ffe7a0', '#e0902a')); ctx.restore(); }
    arm(1, true);
    ctx.restore();
  }
  // Phönix: Feuervogel mit Flammenkamm, flackernden Flügeln und langen Schweiffedern
  function phoenixC(x, y, t) {
    const f = Math.sin(t * 8) * 10;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2.5) * 5);
    glowDot(0, -2, 40, '255,140,50', 0.45 + 0.1 * Math.sin(t * 5));
    // Glut, die nach hinten wegfliegt
    for (let i = 0; i < 8; i++) { const p = (t * 0.9 + i / 8) % 1; glowDot(-14 - p * 40, 4 + p * 14 + Math.sin(t * 4 + i) * 3, 2.5 * (1 - p) + 1, i % 2 ? '255,210,90' : '255,120,40', 1 - p); }
    // Schweiffedern
    for (let k = 0; k < 3; k++) {
      const sway = Math.sin(t * 3 + k) * 4, ex = -44 - k * 6, ey = 6 + k * 7 + sway;
      ctx.beginPath(); ctx.moveTo(-8, 1); ctx.bezierCurveTo(-20, 0 + k * 2, -30, ey - 8, ex, ey); ctx.bezierCurveTo(-30, ey + 2, -20, 6 + k * 2, -8, 4); ctx.closePath();
      const g = ctx.createLinearGradient(-8, 0, ex, 0); g.addColorStop(0, '#ffb547'); g.addColorStop(0.6, '#ff5a2a'); g.addColorStop(1, 'rgba(200,40,40,.2)'); ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.translate(ex + 4, ey - 1); ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 2.2, -0.2, 0, 7); ctx.fillStyle = '#ffe27a'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, 7); ctx.fillStyle = '#c0282a'; ctx.fill(); ctx.restore();
    }
    // Flammenflügel
    const wing = (s, c1, c2) => {
      ctx.save(); ctx.translate(-1, -2); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(6, 0);
      const pts = [[-2, -16 - f * 0.7], [-8, -26 - f], [-13, -18 - f * 0.8], [-20, -24 - f * 0.9], [-21, -12 - f * 0.5], [-28, -12 - f * 0.6], [-20, -3 - f * 0.2]];
      for (let i = 0; i < pts.length; i++) { const [px, py] = pts[i], fl = Math.sin(t * 13 + i * 1.7) * 1.5; ctx.lineTo(px + fl, py + (i % 2 ? 0 : fl)); }
      ctx.quadraticCurveTo(-10, 4, -4, 3); ctx.closePath(); fillO(LG(-26 - f, 4, c1, c2));
      ctx.restore();
    };
    wing(0.85, '#ff8a3d', '#b02a24');
    // Körper
    ctx.save(); ctx.rotate(-0.15); ctx.beginPath(); ctx.ellipse(0, 0, 11, 6.5, 0, 0, 7); fillO(LG(-6, 6, '#ffc35a', '#e04a24'));
    ctx.beginPath(); ctx.ellipse(2, 2.5, 7, 3, 0, 0, Math.PI); ctx.fillStyle = '#ffe9a0'; ctx.fill(); ctx.restore();
    // Kopf mit Flammenkamm
    ctx.save(); ctx.translate(11, -8);
    for (let k = 0; k < 3; k++) { const fl = Math.sin(t * 11 + k * 2) * 1.5; ctx.beginPath(); ctx.moveTo(-1 + k * 2, -3); ctx.quadraticCurveTo(-4 - k * 2, -8 - k + fl, -9 - k * 3, -9 - k * 2 + fl); ctx.quadraticCurveTo(-5 - k * 2, -5, -3 + k * 2, -1); ctx.closePath(); ctx.fillStyle = ['#ffe27a', '#ffb547', '#ff6a2a'][k]; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-6, 6); ctx.quadraticCurveTo(-7, -4, 0, -4.5); ctx.quadraticCurveTo(5, -4.5, 5.5, 0); ctx.quadraticCurveTo(5, 4, 0, 5); ctx.closePath(); fillO(LG(-5, 5, '#ffd27a', '#ff8a3d'));
    ctx.beginPath(); ctx.moveTo(4.5, -1.8); ctx.quadraticCurveTo(10, -1.5, 10, 1.5); ctx.quadraticCurveTo(7.5, 0.8, 4.5, 1.6); ctx.closePath(); fillO('#ffd23f');
    ctx.fillStyle = '#2a0e10'; ctx.beginPath(); ctx.arc(1.5, -1, 1.4, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(1.6, -1.9, 0.8, 0.8);
    ctx.restore();
    wing(1, '#ffe27a', '#ff5a2a');
    ctx.restore();
  }
  // Kleine Bilder der Begleiter für den Begleiter-Reiter
  const compPicCache = {};
  function compPic(id) {
    if (compPicCache[id] !== undefined) return compPicCache[id];
    let url = '';
    try {
      const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d');
      if (g) {
        const main = ctx; ctx = g;
        try {
          const P = { drache: [1.3, 67, 80], eule: [1.8, 60, 64], golem: [1.4, 60, 107], phoenix: [1.4, 81, 64] }[id] || [1, 60, 60];
          g.scale(P[0], P[0]); const lx = P[1] / P[0], ly = P[2] / P[0];
          if (id === 'drache') dragonC(lx, ly, 0.9, 0);
          else if (id === 'eule') owlC(lx, ly, 0.3);
          else if (id === 'phoenix') phoenixC(lx, ly, 0.4);
          else if (id === 'golem') { g.translate(0, ly - GROUND); golemC(lx, 0.4); }
        } finally { ctx = main; }
        url = c.toDataURL();
      }
    } catch (e) { url = ''; }
    return (compPicCache[id] = url);
  }
  function drawComps(t, R) {
    const act = (S.compActive || []).filter(id => S.comps[id]);
    if (act.includes('golem')) golemC(R ? R.frontX + 34 : 356, t);
    if (act.includes('drache')) dragonC(R ? R.frontX - 40 : 150, R ? 70 : 96, t, R && R.fx.dragon > 0 ? R.fx.dragon : 0);
    if (act.includes('eule')) owlC(R ? (R.pos.p || R.pos.s || R.frontX - 40) : 432, R ? 110 : 118, t);
    if (act.includes('phoenix')) phoenixC(R ? R.frontX - 82 : 238, R ? 112 : 104, t);
  }
  function weather(stage, t) {
    const z = zoneOf(stage) % 15;
    if (z === 5 || z === 1) { ctx.strokeStyle = 'rgba(200,220,255,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 40; i++) { const x = (hash(i) * W + t * 60) % W, y = (hash(i + 7) * H + t * 380) % GROUND; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); } }
    if (z === 5 || z === 7) { const g = ctx.createLinearGradient(0, GROUND - 60, 0, GROUND + 10); g.addColorStop(0, 'rgba(220,220,235,0)'); g.addColorStop(1, 'rgba(220,220,235,.35)'); ctx.fillStyle = g; ctx.fillRect(0, GROUND - 60, W, 70); }
    if (z === 9 || z === 14) for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect((hash(i) * W + Math.sin(t + i) * 10 + W) % W, (hash(i + 4) * H + t * (25 + hash(i) * 20)) % GROUND, 2, 2); }
    if (z === 8 || z === 13 || stage > 150) for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(255,150,70,.7)'; ctx.fillRect(hash(i) * W, GROUND - ((t * (15 + hash(i) * 25) + hash(i + 2) * 200) % 200), 2, 2); }
  }
  function grassFront(scroll, night) {
    ctx.fillStyle = night ? 'rgba(20,30,20,.9)' : 'rgba(40,70,35,.85)';
    for (let k = Math.floor(scroll * 1.3 / 40) - 1; k < Math.floor(scroll * 1.3 / 40) + 14; k++) {
      if (hash(k * 1.7) < 0.5) continue;
      const x = k * 40 - scroll * 1.3 + hash(k) * 20;
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x + j * 3, H); ctx.quadraticCurveTo(x + j * 3 - 2, H - 10, x + j * 3 + 2 - j, H - 16 - hash(k + j) * 8); ctx.lineTo(x + j * 3 + 2, H); ctx.fill(); }
    }
  }
  // ---------- Heldenfiguren (Version 5.5: aufwendig gezeichnet) ----------
  const LG = (y0, y1, a, b) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const RG = (x, y, r, a, b) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  // Leuchtpunkte als vorbereitete Bilder (viel schneller als jedes Mal einen Verlauf zu bauen)
  const GLOW = new Map();
  function glowSprite(rgb) {
    let c = GLOW.get(rgb); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.4, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    GLOW.set(rgb, c); return c;
  }
  function glowDot(x, y, r, rgb, a = 1) { if (!(r > 0) || !(a > 0)) return; if (SKIN_MAP) rgb = SKIN_MAP(rgb); const pa = ctx.globalAlpha; ctx.globalAlpha = pa * Math.min(1, a); ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = pa; }
  // ---------- Figuren-Look (Version 7): Umriss, Lichtkante, Schattenseite ----------
  // Jede Figur wird erst auf eine unsichtbare Ebene gezeichnet. Daraus entsteht eine Maske (schwache Leuchteffekte zählen kaum mit),
  // die einen dunklen Umriss, eine helle Lichtkante oben links (Farbe des Gebiets) und eine Schattenseite unten rechts bekommt.
  const LOOK = { c: null, m: null, e: null, rim: '255,244,222', ra: 0.5, ow: 0.85, on: true, busy: false };
  try { LOOK.on = localStorage.getItem('fsg.ritter.look') !== '0'; } catch {}
  const LOOK_RIM = { wiesen: '255,246,214', finster: '200,240,170', gruft: '190,205,255', glut: '255,170,96', frost: '214,236,255', moor: '206,240,186', dornen: '255,196,222',
    krypta: '214,176,255', wueste: '255,222,160', eis: '200,236,255', sterne: '220,206,255', hain: '214,255,190', toten: '186,214,255', hort: '255,190,110', himmel: '255,236,200',
    lager: '255,190,120', turm: '220,196,255', ahnen: '255,226,150', albtraum: '255,120,120', x_hain: '214,170,255', x_werk: '255,206,140', x_mine: '255,190,140',
    x_schatten: '190,200,255', x_friedhof: '180,255,220', x_theater: '255,180,220' };
  function lookFor(bgk) { LOOK.rim = LOOK_RIM[bgk] || '255,244,222'; }
  const LOOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]];
  function lookCan(k, w, h) { let c = LOOK[k]; if (!c) c = LOOK[k] = document.createElement('canvas'); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }
  // fn zeichnet die Figur, x = Mitte, top/bottom = Höhe in Spiel-Einheiten, half = halbe Breite. o.tint färbt (Treffer), o.ow Umrissbreite
  function styled(fn, x, top, bottom, half, o = {}) {
    const main = ctx, tgt = main && main.canvas;
    if (!LOOK.on || LOOK.busy || lowFx || !tgt || !tgt.width) { fn(); return; }
    const m = main.getTransform(), k = Math.hypot(m.a, m.b), pad = Math.ceil(k * 3);
    // Bereich auf dem Bildschirm (Ecken umrechnen, auch bei Drehung)
    const pts = [[x - half, top], [x + half, top], [x - half, bottom], [x + half, bottom]].map(([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]);
    let x0 = Math.floor(Math.min(...pts.map(p => p[0]))) - pad, y0 = Math.floor(Math.min(...pts.map(p => p[1]))) - pad;
    let x1 = Math.ceil(Math.max(...pts.map(p => p[0]))) + pad, y1 = Math.ceil(Math.max(...pts.map(p => p[1]))) + pad;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(tgt.width, x1); y1 = Math.min(tgt.height, y1);
    const w = x1 - x0, h = y1 - y0; if (w <= 2 || h <= 2) { fn(); return; }
    const C = lookCan('c', tgt.width, tgt.height), M = lookCan('m', tgt.width, tgt.height), E = lookCan('e', tgt.width, tgt.height);
    const cc = C.getContext('2d'), mc = M.getContext('2d'), ec = E.getContext('2d');
    cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over'; cc.clearRect(x0, y0, w, h);
    cc.save(); cc.beginPath(); cc.rect(x0, y0, w, h); cc.clip(); cc.setTransform(m); cc.globalAlpha = main.globalAlpha;
    ctx = cc; LOOK.busy = true;
    try { fn(); } finally { ctx = main; LOOK.busy = false; cc.restore(); }
    cc.setTransform(1, 0, 0, 1, 0, 0);
    if (o.tint) { cc.globalCompositeOperation = 'source-atop'; cc.fillStyle = o.tint; cc.fillRect(x0, y0, w, h); cc.globalCompositeOperation = 'source-over'; }
    // Maske: Deckkraft hoch 4, damit Schein und Glühen fast nicht mitzählen
    mc.setTransform(1, 0, 0, 1, 0, 0); mc.globalAlpha = 1; mc.globalCompositeOperation = 'source-over'; mc.clearRect(x0, y0, w, h);
    mc.drawImage(C, x0, y0, w, h, x0, y0, w, h);
    mc.globalCompositeOperation = 'destination-in'; for (let i = 0; i < 3; i++) mc.drawImage(C, x0, y0, w, h, x0, y0, w, h);
    mc.globalCompositeOperation = 'source-in'; mc.fillStyle = 'rgba(16,11,28,.92)'; mc.fillRect(x0, y0, w, h); mc.globalCompositeOperation = 'source-over';
    const ow = Math.max(1, k * (o.ow || LOOK.ow));
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'source-over';
    const ga = main.globalAlpha;
    for (const [dx, dy] of LOOK_DIRS) main.drawImage(M, x0, y0, w, h, x0 + dx * ow, y0 + dy * ow, w, h);
    main.globalAlpha = 1; main.drawImage(C, x0, y0, w, h, x0, y0, w, h);
    // Lichtkante oben links
    const edge = (rgb, dx, dy, alpha, op) => {
      ec.setTransform(1, 0, 0, 1, 0, 0); ec.globalCompositeOperation = 'source-over'; ec.globalAlpha = 1; ec.clearRect(x0, y0, w, h);
      ec.drawImage(M, x0, y0, w, h, x0, y0, w, h);
      ec.globalCompositeOperation = 'source-in'; ec.fillStyle = `rgb(${rgb})`; ec.fillRect(x0, y0, w, h);
      ec.globalCompositeOperation = 'destination-out'; ec.drawImage(M, x0, y0, w, h, x0 + dx, y0 + dy, w, h); ec.globalCompositeOperation = 'source-over';
      main.globalAlpha = alpha * ga; main.globalCompositeOperation = op; main.drawImage(E, x0, y0, w, h, x0, y0, w, h);
    };
    const rd = Math.max(1.4, k * 0.6); edge(o.rim || LOOK.rim, rd, rd, o.ra != null ? o.ra : LOOK.ra, 'screen');
    main.restore();
  }
  function pose(t, walk, f = 12) { return { step: walk ? Math.sin(t * f) : 0, bob: walk ? Math.abs(Math.sin(t * f)) * 2 : Math.sin(t * 1.7) * 0.6 }; }
  function begin(x, h, t, walk, f, sh) {
    const p = pose(t, walk, f); shadow(x, sh);
    ctx.save(); ctx.translate(x, GROUND - p.bob);
    if (h && !h.alive) { const f = h.fall == null ? 1 : h.fall; ctx.rotate(-1.4 * f); ctx.translate(-12 * f, 8 * f); }
    return p;
  }
  function hurt() {}
  // Treffer: Held leuchtet rot auf (nur die Figur, kein Kasten)
  let tintCv = null;
  function drawHero(k, x, h, t, walk) { DRAW[k](x, h, t, walk); }
  function legs(step, c1, c2, boot, w = 7) {
    for (const [lx, s] of [[-w - 1, step], [1, -step]]) { ctx.save(); ctx.translate(lx + s * 3, 0); rr(0, -22, w, 20, 2); fillO(LG(-22, 0, c1, c2)); rr(-1, -5, w + 2, 5, 2); fillO(boot); ctx.restore(); }
  }
  function cape(t, top, c1, c2, len = 48, spread = 20) {
    const wind = Math.sin(t * 2.3) * 3;
    ctx.beginPath(); ctx.moveTo(-4, top); ctx.quadraticCurveTo(-spread - wind, top + len * 0.45, -spread + 4 - wind * 1.5, top + len);
    ctx.lineTo(-spread + 10 - wind, top + len - 3); ctx.lineTo(-6, top + len - 6); ctx.closePath(); fillO(LG(top, top + len, c1, c2));
  }
  function sparkle(x, y, s, a) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.25, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.25, y); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 0.25); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s * 0.25); ctx.closePath(); ctx.fill(); }

  // ---------- Helden-Baukasten (Version 7) ----------
  // Alle menschlichen Helden teilen sich ein Skelett: Beine mit Knie, Arme mit Ellbogen, Oberkörper, Kopf.
  // Jeder Held beschreibt nur Farben, Kleidung, Kopf und Waffe. Laufen, Atmen, Ausholen und Zuschlagen kommen vom Baukasten.
  const eOut = v => 1 - (1 - clamp01(v)) ** 3, eIn = v => clamp01(v) ** 2;
  // Glied: von (x,y) in Richtung a (0 = nach unten, positiv = nach vorne), Länge l, Breite w. Gibt den Endpunkt zurück.
  function limb(x, y, a, l, w, c, hi) {
    const x1 = x + Math.sin(a) * l, y1 = y + Math.cos(a) * l;
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = w + 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
    if (hi) { ctx.strokeStyle = hi; ctx.lineWidth = w * 0.32; ctx.beginPath(); ctx.moveTo(x - w * 0.18, y + 0.6); ctx.lineTo(x1 - w * 0.18, y1 - 0.6); ctx.stroke(); }
    return [x1, y1];
  }
  // Stiefel/Fuß am Ende des Unterschenkels, zeigt immer nach vorne
  function boot(x, y, c, cuff, len = 7.5, hgt = 4.6) {
    ctx.beginPath(); ctx.moveTo(x - 3, y - hgt); ctx.lineTo(x + 1.5, y - hgt); ctx.quadraticCurveTo(x + len, y - hgt + 1.2, x + len, y - 0.6); ctx.lineTo(x + len - 0.5, y); ctx.lineTo(x - 3.4, y); ctx.closePath(); fillO(c);
    if (cuff) { rr(x - 3.6, y - hgt - 2, 6.6, 2.6, 1.2); fillO(cuff); }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x - 3.4, y - 1.2, len + 2.8, 1.2);
  }
  function hand(x, y, c = '#f1c9a5', r = 2.6) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); fillO(c); }
  // Augen mit Blinzeln (schaut nach rechts)
  function face(cx, cy, o = {}) {
    const t = o.t || 0, blink = ((t + (o.seed || 0)) % 3.9) < 0.12, ex = cx + (o.ex || 3.4), ey = cy + (o.ey || -0.5), sc = o.s || 1;
    if (o.cheek !== false) { ctx.fillStyle = 'rgba(255,120,130,.35)'; ctx.beginPath(); ctx.ellipse(ex - 3.2 * sc, ey + 3.4 * sc, 1.9 * sc, 1.1 * sc, 0, 0, 7); ctx.fill(); }
    for (const [dx, k] of [[0, 1], [-4.4 * sc, 0.78]]) {
      const x = ex + dx;
      if (blink) { ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 1.6 * sc * k, ey); ctx.quadraticCurveTo(x, ey + 1 * sc, x + 1.6 * sc * k, ey); ctx.stroke(); continue; }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, ey, 1.9 * sc * k, 2.4 * sc, 0, 0, 7); ctx.fill();
      ctx.fillStyle = o.eye || '#3b6fd6'; ctx.beginPath(); ctx.ellipse(x + 0.5 * sc, ey + 0.2, 1.4 * sc * k, 1.75 * sc, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#14101e'; ctx.beginPath(); ctx.arc(x + 0.7 * sc, ey + 0.3, 0.8 * sc, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 1 * sc, ey - 0.6 * sc, 0.55 * sc, 0, 7); ctx.fill();
    }
    if (o.brow) { ctx.strokeStyle = o.brow; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(ex - 1.8, ey - 3.6 + (o.angry ? 0.8 : 0)); ctx.quadraticCurveTo(ex, ey - 4.4, ex + 2.2, ey - 3.8 - (o.angry ? 0.6 : 0)); ctx.stroke(); }
    if (o.mouth !== false) { ctx.strokeStyle = '#8a3a34'; ctx.lineWidth = 0.9; ctx.beginPath();
      if (o.open) { ctx.fillStyle = '#5a1e1e'; ctx.ellipse(ex - 0.8, ey + 5.4, 1.4, 1.1, 0, 0, 7); ctx.fill(); }
      else { ctx.moveTo(ex - 2.4, ey + 5); ctx.quadraticCurveTo(ex - 0.8, ey + 6.2, ex + 0.6, ey + 4.9); ctx.stroke(); } }
  }
  function headBall(x, y, r, skin = '#f8d9b8', shade = '#e0ae86') { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); fillO(RG(x + r * 0.3, y - r * 0.3, r * 1.3, skin, shade)); }
  // Umhang, der mit Wind und Laufen weht. top = Schulterhöhe, Ursprung am Rücken
  function cloth(x, y, len, w, c1, c2, t, walk, o = {}) {
    const wv = Math.sin(t * 2.6 + (o.seed || 0)) * 2.5 + (walk ? 5 : 0), tip = -w - wv, rag = o.rag ?? 4;
    ctx.beginPath(); ctx.moveTo(x + 2, y);
    ctx.quadraticCurveTo(x - w * 0.6 - wv * 0.4, y + len * 0.45, x + tip, y + len);
    for (let i = 1; i <= rag; i++) { const q = i / rag; ctx.lineTo(x + tip + q * (w * 0.9 + wv * 0.7) - (i % 2 ? 0 : 1.5), y + len - (i % 2 ? 4 : 0) + Math.sin(t * 5 + i) * 0.8); }
    ctx.quadraticCurveTo(x + 2, y + len * 0.5, x + 4, y + 1); ctx.closePath(); fillO(LG(y, y + len, c1, c2));
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 1, y + 4); ctx.quadraticCurveTo(x - w * 0.4 - wv * 0.3, y + len * 0.5, x + tip + w * 0.35, y + len - 3); ctx.stroke();
  }
  // ---------- Heldenteile (Sammlung) ----------
  // Jeder Held hat eigene Sets, die zu seinem Aussehen passen: Selten = Färbung eines Körperteils,
  // Episch = eigenes Set mit neuen Formen, Legendär = auffälliges Set mit Leuchten, Funken und Aura.
  // Ein Set-Teil kann haben: pal (Farbtabelle für den Körperteil), head (eigener Kopf), over (Zusatz darüber),
  // cape (eigener Umhang), pads (Schulterstücke), boot (Stiefel), fx (Effekte). Alle drei Teile eines Sets: aura, wpal (Waffe), wfx.
  let GEAR_OVR = null, GEAR_CUR = null, GEAR_K = null;
  const gearFor = k => (GEAR_OVR && GEAR_OVR.k === k ? GEAR_OVR.gear : (S.gear && S.gear[k]) || null);
  const PAL = (h1, h2, o = {}) => ({ h1, h2, spread: o.spread ?? 0.18, sat: o.sat ?? 1, lm: o.lm ?? 0.9, la: o.la ?? 0, metal: o.metal || [h1, 0.3, 0.92, 0.02], gold: o.gold || [46, 0.95, 1.05] });
  const TINT_PAL = {
    rubin: PAL(354, 18, { sat: 1.05, lm: 0.92, metal: [354, 0.42, 0.92, 0.02] }), smaragd: PAL(140, 170, { metal: [150, 0.32, 0.9, 0.02] }),
    saphir: PAL(216, 196, { sat: 1.05, lm: 0.92, metal: [214, 0.4, 0.95, 0], gold: [205, 0.6, 1.08] }), amethyst: PAL(276, 300, { lm: 0.88, metal: [270, 0.32, 0.9, 0.02] }),
    gold: PAL(42, 30, { spread: 0.12, lm: 0.95, la: 0.06, metal: [44, 0.62, 0.98, 0.06], gold: [48, 1, 1.1] }), obsidian: PAL(262, 250, { spread: 0.1, sat: 0.4, lm: 0.42, la: 0.03, metal: [255, 0.14, 0.42, 0.03], gold: [276, 0.75, 0.9] }),
    frost: PAL(192, 210, { spread: 0.12, sat: 0.55, lm: 0.6, la: 0.38, metal: [196, 0.35, 0.78, 0.2], gold: [190, 0.6, 1.1] }), rose: PAL(330, 345, { spread: 0.15, sat: 0.9, lm: 0.82, la: 0.14, metal: [330, 0.3, 0.92, 0.06] }),
  };
  const heroHue = k => { const hh = HERO_BY_ID[k]; if (!hh) return 0; const n = parseInt(hh.color.slice(1), 16); return rgbHsl((n >> 16) & 255, (n >> 8) & 255, n & 255)[0]; };
  // Teil des gerade gezeichneten Helden: Set-Teil (Beschreibung) oder null
  const gearDef = slot => { const id = GEAR_CUR && GEAR_CUR[slot], it = id && ITEMS[id]; if (!it || it.kind !== 'set') return null; const s = GSET[it.hero] && GSET[it.hero][it.set]; return s && s[slot] ? { ...s[slot], set: it.set, rar: it.rar } : null; };
  const gearIt = slot => gearDef(slot);
  function tintSeg(slot, fn) {
    const id = GEAR_CUR && GEAR_CUR[slot], it = id && ITEMS[id]; if (!it) return fn();
    const pal = it.kind === 'tint' ? TINT_PAL[it.tint] : (gearDef(slot) || {}).pal;
    if (!pal) return fn();
    let r; withPal(pal, 'g' + id, heroHue(GEAR_K), () => { r = fn(); }, true); return r;
  }
  const fullSet = () => { const a = gearDef('kopf'), b = gearDef('koerper'), c = gearDef('beine'); if (!(a && b && c && a.set === b.set && b.set === c.set)) return null; return GSET[GEAR_K][a.set]; };
  function gearAura(t) { const s = fullSet(); if (s && s.aura) { ctx.save(); s.aura(t); ctx.restore(); } }
  function gearWeapon(fn) { const s = fullSet(); if (s && s.wpal) withPal(s.wpal, 'w' + GEAR_K + s.n, heroHue(GEAR_K), fn, true); else fn(); }
  function gearFx(A, t) { for (const sl of ['kopf', 'koerper', 'beine']) { const d = gearDef(sl); if (d && d.fx) { ctx.save(); d.fx(A, t); ctx.restore(); } } const s = fullSet(); if (s && s.fx) { ctx.save(); s.fx(A, t); ctx.restore(); } }
  function gearCape(d, A, t, walk) { if (!d || !d.cape) return false; d.cape(A, t, walk); return true; }
  function gearPad(d, t, back) { if (d && d.pads) d.pads(t, back); }
  function gearChest(d, t, A) { if (d && d.over) d.over(A, t); }
  function gearBoot(d, ft, kn, t, back, walk) {
    if (!d || !d.boot) return; const [fx0, fy0] = ft, y = Math.min(0, fy0);
    ctx.save(); ctx.translate(fx0, y); ctx.scale(0.86, 0.86); try { d.boot(kn ? [(kn[0] - fx0) / 0.86, (kn[1] - y) / 0.86] : null, t, back, walk); } finally { ctx.restore(); }
  }
  // ----- kleine Zeichenhelfer -----
  function flameLick(x, y, h, w, t, c1, c2, seed = 0) {
    const f = Math.sin(t * 9 + seed) * 0.18 + 1, hh = h * f;
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.9, y - hh * 0.55, x + Math.sin(t * 6 + seed) * w * 0.5, y - hh); ctx.quadraticCurveTo(x + w * 0.9, y - hh * 0.55, x + w, y); ctx.closePath();
    ctx.fillStyle = LG(y - hh, y, c1, c2); ctx.fill();
  }
  function fire(x, y, h, w, t, rgbOut, rgbIn, seed = 0) { flameLick(x, y, h, w, t, `rgba(${rgbOut},0)`, `rgba(${rgbOut},.9)`, seed); flameLick(x, y, h * 0.6, w * 0.55, t, `rgba(${rgbIn},0)`, `rgba(${rgbIn},.95)`, seed + 1.7); }
  function starP(x, y, r1, r2, n = 5, rot = 0) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot - Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  function sunRays(x, y, r0, r1, n, rot, rgb, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const an = rot + i / n * Math.PI * 2, w = 0.12; ctx.fillStyle = `rgba(${rgb},${a})`; ctx.beginPath(); ctx.moveTo(x + Math.cos(an - w) * r0, y + Math.sin(an - w) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.lineTo(x + Math.cos(an + w) * r0, y + Math.sin(an + w) * r0); ctx.fill(); } ctx.restore(); }
  function rise(n, t, sp, w, h, y0, draw) { for (let i = 0; i < n; i++) { const p = (((t * sp + i / n) % 1) + 1) % 1; draw(Math.sin(i * 2.7 + t * 0.8) * w, y0 - p * h, p, i); } }
  function wing(sx, sy, s, t, c1, c2, rim, feathers = 5) {
    const flap = Math.sin(t * 2.2) * 0.08; ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.25 + flap); ctx.scale(s, s);
    for (let i = feathers - 1; i >= 0; i--) { const a = -0.6 - i * 0.28, len = 22 + i * 3; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(-len / 2, 0, len / 2, 4.5, 0, 0, 7); fillO(LG(-6, 6, c1, c2)); if (rim) { ctx.strokeStyle = rim; ctx.lineWidth = 0.8; ctx.stroke(); } ctx.restore(); }
    ctx.restore();
  }
  function scales(x0, y0, cols, rows, r, c1, c2) { for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { ctx.beginPath(); ctx.arc(x0 + i * r * 1.7 + (j % 2) * r * 0.85, y0 + j * r * 1.2, r, 0, Math.PI); fillO(j % 2 ? c2 : c1); } }
  function leaf(x, y, len, a, c) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.35, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.35, 0, 0); fillO(c); ctx.restore(); }
  const motes = (t, rgb, n = 6, h = 70, w = 16, size = 1.6) => rise(n, t, 0.45, w, h, -4, (x, y, p) => { ctx.fillStyle = `rgba(${rgb},${(1 - p) * 0.9})`; ctx.beginPath(); ctx.arc(x, y, size * (1 - p) + 0.5, 0, 7); ctx.fill(); });
  const auraPool = (t, rgb, a = 0.36) => { lightPool(0, -34, 46 + Math.sin(t * 2) * 4, rgb, a); lightPool(0, -4, 34, rgb, a * 0.8); };
  const GSET = {};
  // ===== Ritter =====
  GSET.r = {
    drache: {
      n: 'Drachenritter',
      kopf: { head(A, t) {
        // Drachenkopf-Helm: Schnauze nach vorne, Hörner nach hinten, Zackenkamm
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-2 - i * 3.2, -11 + i * 1.6); ctx.lineTo(-5 - i * 3.6, -17 + i * 2.2 + Math.sin(t * 4 + i) * 0.4); ctx.lineTo(-5 - i * 3.2, -9.5 + i * 1.8); ctx.closePath(); fillO('#ffd23f'); }
        for (const [sx, d] of [[-4, 1], [2, 0.8]]) { ctx.beginPath(); ctx.moveTo(sx, -9); ctx.quadraticCurveTo(sx - 10 * d, -16, sx - 16 * d, -12); ctx.quadraticCurveTo(sx - 9 * d, -11.5, sx - 2, -6); ctx.closePath(); fillO(LG(-16, -6, '#fff4d8', '#b89a5a')); }
        ctx.beginPath(); ctx.moveTo(-9, 7); ctx.lineTo(-10, -3); ctx.quadraticCurveTo(-9, -12, 1, -12); ctx.quadraticCurveTo(9, -12, 12, -6); ctx.lineTo(17, -4); ctx.quadraticCurveTo(18, -1, 15.5, 0.5); ctx.lineTo(9.5, 1); ctx.lineTo(10, 7); ctx.quadraticCurveTo(0, 9.5, -9, 7); ctx.closePath(); fillO(LG(-12, 8, '#6fd18a', '#1f5a32'));
        scales(-7, -8, 4, 3, 1.6, 'rgba(20,70,40,.35)', 'rgba(255,255,255,.12)');
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(11.4, 3.6); ctx.lineTo(12.8, 1); ctx.moveTo(13, 0.8); ctx.lineTo(14.2, 2.8); ctx.lineTo(15.2, 0.6); ctx.fill();
        rr(3, -4.4, 8.4, 3, 1.2); fillO('#1b1726'); glowDot(8.5, -3, 4.5, '255,190,60', 0.55 + 0.25 * Math.sin(t * 3)); ctx.fillStyle = '#ffcf4a'; ctx.fillRect(6, -3.6, 4, 1.3);
        ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(16, -3, 0.7, 0, 7); ctx.fill();
        if (S.asc > 0 && !(cine && cine.kind === 'asc')) crownIcon(-1, -18, 0.55, 0);
      } },
      koerper: { pal: PAL(140, 120, { sat: 0.9, lm: 0.85, metal: [145, 0.32, 0.8, 0.02], gold: [46, 0.95, 1.05] }),
        cape(A, t, walk) { const x = A.sh[0] - 2, y = A.sh[1] + 1, fl = Math.sin(t * 2.4) * 2 + (walk ? 3 : 0);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 24 - fl, y - 6); ctx.lineTo(x - 22 - fl, y + 6); ctx.lineTo(x - 26 - fl, y + 14); ctx.lineTo(x - 20 - fl, y + 20); ctx.lineTo(x - 22 - fl, y + 30); ctx.lineTo(x - 12, y + 26); ctx.lineTo(x - 4, y + 32); ctx.closePath(); fillO(LG(y - 6, y + 32, '#3f9a5a', '#14361f'));
          ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 1.2; ctx.beginPath(); for (const [ex, ey] of [[-24, -6], [-26, 14], [-22, 30]]) { ctx.moveTo(x, y); ctx.lineTo(x + ex - fl, y + ey); } ctx.stroke(); },
        over() { scales(-5, -22, 4, 4, 1.5, 'rgba(255,210,63,.55)', 'rgba(255,255,255,.18)'); ctx.save(); ctx.translate(0, -12); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0); ctx.closePath(); fillO('#ffd23f'); ctx.restore(); },
        pads() { ctx.beginPath(); ctx.ellipse(0, -1, 7.5, 5.5, 0, Math.PI, 0); ctx.lineTo(7.5, 1.5); ctx.lineTo(-7.5, 1.5); ctx.closePath(); fillO(LG(-6, 1, '#7fe09a', '#1f6a3a')); for (const sx of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(sx - 1.3, -4); ctx.lineTo(sx - 2.5, -8); ctx.lineTo(sx + 1.3, -4.5); ctx.closePath(); fillO('#ffd23f'); } } },
      beine: { pal: PAL(140, 120, { sat: 0.8, lm: 0.7, metal: [150, 0.25, 0.7, 0], gold: [46, 0.95, 1.05] }),
        boot() { ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(2, -7); ctx.quadraticCurveTo(8, -6, 9, -1); ctx.lineTo(8.5, 0); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-7, 0, '#5fc47a', '#1f5a32')); ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(7, -4 + i * 1.6); ctx.quadraticCurveTo(11, -3.5 + i * 1.6, 11.5, -1 + i * 1.1); ctx.lineTo(8, -2.4 + i * 1.6); ctx.fill(); } } },
    },
    sonne: {
      n: 'Sonnenpaladin',
      kopf: { head(A, t) {
        sunRays(0, -4, 10, 24, 12, t * 0.6, '255,220,120', 0.28 + 0.08 * Math.sin(t * 3));
        const wv = Math.sin(t * 6) * 1.6 + (A.walk ? 3 : 0);
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-1, -10 + i); ctx.quadraticCurveTo(-12 - wv - i * 2, -21 + i * 3, -21 - wv * 1.5 - i, -6 + i * 2); ctx.quadraticCurveTo(-11 - wv, -11 + i * 2, -1, -6 + i); ctx.closePath(); fillO(['#ffffff', '#fff2c8', '#ffe08a'][i]); }
        ctx.beginPath(); ctx.moveTo(-8.5, 7); ctx.lineTo(-9.5, -3); ctx.quadraticCurveTo(-9, -12.5, 0, -12.5); ctx.quadraticCurveTo(9.5, -12.5, 10, -2); ctx.lineTo(9.5, 7); ctx.quadraticCurveTo(0, 9.5, -8.5, 7); ctx.closePath(); fillO(LG(-12, 8, '#fff8e0', '#e0a830'));
        ctx.save(); ctx.translate(0, -14); starP(0, 0, 5.5, 2.4, 8, t * 0.5); fillO('#ffe27a'); ctx.restore(); glowDot(0, -14, 8, '255,230,140', 0.7);
        rr(0, -3.6, 10.4, 3.4, 1.4); fillO('#3a2a10'); glowDot(6.5, -2, 6, '255,220,120', 0.8 + 0.2 * Math.sin(t * 4)); ctx.fillStyle = '#fff6c8'; ctx.fillRect(2, -2.8, 8, 1.6);
        ctx.strokeStyle = '#c9902a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -4); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-4, -8, 3.2, 1.4, -0.5, 0, 7); ctx.fill();
      } },
      koerper: { pal: PAL(44, 40, { sat: 0.55, lm: 1.05, la: 0.12, metal: [45, 0.25, 1.02, 0.12], gold: [44, 1, 1.12] }),
        cape(A, t, walk) { cloth(A.sh[0] - 3, A.sh[1] + 1, 46, 20, '#ffffff', '#e8c870', t, walk, { seed: 1, rag: 5 }); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.2; },
        over(A, t) { ctx.save(); ctx.translate(0, -14); sunRays(0, 0, 3, 9, 8, t, '255,230,140', 0.5); starP(0, 0, 4.5, 2, 8, t * 0.3); fillO('#ffe27a'); ctx.beginPath(); ctx.arc(0, 0, 2, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); glowDot(0, -14, 10, '255,230,140', 0.5); },
        pads(t) { ctx.beginPath(); ctx.ellipse(0, -1, 8, 6, 0, Math.PI, 0); ctx.lineTo(8, 1.5); ctx.lineTo(-8, 1.5); ctx.closePath(); fillO(LG(-7, 1, '#fff8e0', '#d9a02a')); starP(0, -2.5, 2.6, 1.1, 4, t); ctx.fillStyle = '#fff'; ctx.fill(); } },
      beine: { pal: PAL(44, 40, { sat: 0.6, lm: 1, la: 0.1, metal: [45, 0.45, 1, 0.1], gold: [44, 1, 1.12] }),
        boot(kn, t) { ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(2, -7); ctx.quadraticCurveTo(8.5, -5.5, 8.5, -0.6); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-7, 0, '#fff4c8', '#c9902a')); glowDot(2, -3, 6, '255,220,120', 0.5); if (kn) { ctx.beginPath(); ctx.arc(kn[0] + 1, kn[1], 3.4, 0, 7); fillO('#ffe08a'); } } },
      aura(t) { sunRays(0, -38, 18, 70, 14, t * 0.25, '255,220,120', 0.1); auraPool(t, '255,214,120', 0.4); },
      fx(A, t) { motes(t, '255,236,160', 7, 80, 18); },
      wpal: PAL(46, 40, { sat: 0.7, lm: 1.05, la: 0.15, metal: [48, 0.55, 1.05, 0.15], gold: [44, 1, 1.15] }),
      wfx(A, t) { if (A.handF) glowDot(A.handF[0], A.handF[1] - 8, 14, '255,230,140', 0.45 + 0.15 * Math.sin(t * 5)); },
    },
  };
  // ===== Wächter =====
  GSET.w = {
    turm: {
      n: 'Festungswächter',
      kopf: { head(A, t) {
        rr(-10, -12, 20, 21, 3); fillO(LG(-12, 9, '#c8ccd4', '#6a707e'));
        for (let i = 0; i < 4; i++) { rr(-10 + i * 5.4, -16, 4, 5, 0.8); fillO(LG(-16, -11, '#d8dce4', '#8a909e')); }
        ctx.strokeStyle = 'rgba(40,44,56,.4)'; ctx.lineWidth = 0.8; for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(-10, -6 + j * 5); ctx.lineTo(10, -6 + j * 5); ctx.stroke(); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 7 + (j % 2) * 3, -6 + j * 5); ctx.lineTo(-6 + i * 7 + (j % 2) * 3, -1 + j * 5); ctx.stroke(); } }
        ctx.fillStyle = '#1b1726'; rr(4.5, -8.5, 3, 11, 1.4); ctx.fill(); glowDot(6, -4, 5, '255,200,90', 0.6 + 0.2 * Math.sin(t * 2)); ctx.fillStyle = '#ffcf6a'; ctx.fillRect(5.2, -6.5, 1.6, 6);
        ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-1, -26, 1.4, 11); ctx.fillStyle = '#3f7ae6'; ctx.beginPath(); ctx.moveTo(0.4, -26); ctx.lineTo(9 + Math.sin(t * 4) * 1.4, -23.5); ctx.lineTo(0.4, -21); ctx.fill();
      } },
      koerper: { pal: PAL(220, 210, { sat: 0.35, lm: 0.85, metal: [220, 0.08, 0.82, 0.02], gold: [40, 0.7, 0.95] }),
        over() { ctx.strokeStyle = 'rgba(30,34,46,.35)'; ctx.lineWidth = 0.8; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(-7, -21 + j * 4.5); ctx.lineTo(7, -21 + j * 4.5); ctx.stroke(); } },
        pads() { rr(-8, -4, 16, 6, 1); fillO(LG(-4, 2, '#d0d4dc', '#7a808e')); for (let i = 0; i < 3; i++) { rr(-8 + i * 6, -8, 4, 4.4, 0.6); fillO('#b8bcc6'); } } },
      beine: { pal: PAL(220, 210, { sat: 0.25, lm: 0.7, metal: [220, 0.08, 0.7, 0], gold: [40, 0.6, 0.9] }),
        boot() { rr(-5, -8, 14.5, 8.5, 1.5); fillO(LG(-8, 0, '#a8aeb8', '#5a606e')); ctx.strokeStyle = 'rgba(30,34,46,.4)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(9.5, -4); ctx.moveTo(2, -8); ctx.lineTo(2, -4); ctx.stroke(); } },
    },
    frost: {
      n: 'Frostbollwerk',
      kopf: { head(A, t) {
        for (const [x, h, a] of [[-6, 11, -0.4], [-1.5, 16, -0.12], [3.5, 12, 0.15], [7.5, 8, 0.4]]) { ctx.save(); ctx.translate(x, -9); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-2.4, 2); ctx.lineTo(0, -h); ctx.lineTo(2.4, 2); ctx.closePath(); fillO(LG(-h, 2, '#ffffff', '#5ab8e8')); ctx.restore(); }
        ctx.beginPath(); ctx.moveTo(-9.5, 8); ctx.lineTo(-10, -4); ctx.lineTo(-6, -11.5); ctx.lineTo(4, -12); ctx.lineTo(10.5, -5); ctx.lineTo(10, 8); ctx.quadraticCurveTo(0, 10, -9.5, 8); ctx.closePath(); fillO(LG(-12, 8, '#e8faff', '#4a9ad0'));
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6, -11.5); ctx.lineTo(-3, 2); ctx.moveTo(4, -12); ctx.lineTo(1, -2); ctx.stroke();
        ctx.fillStyle = '#0e2a44'; ctx.fillRect(1, -6.5, 9.5, 3); glowDot(6.5, -5, 5, '160,230,255', 0.7 + 0.2 * Math.sin(t * 3)); ctx.fillStyle = '#d8f6ff'; ctx.fillRect(3, -5.8, 7, 1.4);
        for (let i = 0; i < 3; i++) { const p = (t * 0.7 + i / 3) % 1; ctx.fillStyle = `rgba(230,250,255,${0.5 * (1 - p)})`; ctx.beginPath(); ctx.arc(12 + p * 8, 3 - p * 3, 1.5 + p * 2, 0, 7); ctx.fill(); }
      } },
      koerper: { pal: PAL(198, 210, { sat: 0.7, lm: 0.75, la: 0.25, metal: [198, 0.45, 0.8, 0.18], gold: [190, 0.7, 1.12] }),
        cape(A, t, walk) { cloth(A.sh[0] - 4, A.sh[1] + 2, 34, 16, '#cdeeff', '#3a7ab8', t, walk, { seed: 2, rag: 6 }); },
        over(A, t) { ctx.save(); ctx.translate(0, -13); for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.strokeStyle = '#eafaff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -5); ctx.moveTo(0, -3); ctx.lineTo(1.4, -4.2); ctx.moveTo(0, -3); ctx.lineTo(-1.4, -4.2); ctx.stroke(); } ctx.restore(); glowDot(0, -13, 9, '170,230,255', 0.45 + 0.15 * Math.sin(t * 2)); },
        pads(t) { for (const [x, h, a] of [[-5, 8, -0.5], [0, 12, -0.1], [5, 7, 0.4]]) { ctx.save(); ctx.translate(x, 0); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-2.4, 1); ctx.lineTo(0, -h); ctx.lineTo(2.4, 1); ctx.closePath(); fillO(LG(-h, 1, '#ffffff', '#5ab8e8')); ctx.restore(); } glowDot(0, -3, 8, '170,230,255', 0.4); } },
      beine: { pal: PAL(198, 210, { sat: 0.5, lm: 0.7, la: 0.22, metal: [198, 0.4, 0.75, 0.15], gold: [190, 0.6, 1.1] }),
        boot(kn, t, back) { ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(2, -7); ctx.quadraticCurveTo(8.5, -5.5, 8.5, -0.6); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-7, 0, '#eafaff', '#5aa8d8')); for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3 + (back ? 0.4 : 0)) % 1; ctx.fillStyle = `rgba(230,250,255,${0.55 * (1 - p)})`; ctx.beginPath(); ctx.arc(-4 + i * 5 - p * 4, -1 - p * 3, 2 + p * 2.5, 0, 7); ctx.fill(); } } },
      aura(t) { auraPool(t, '150,220,255', 0.42); },
      fx(A, t) { ctx.fillStyle = 'rgba(240,250,255,.9)'; for (let i = 0; i < 9; i++) { const p = (t * 0.25 + i / 9) % 1, x = Math.sin(i * 2.1 + t * 0.7) * 24, y = -90 + p * 92; ctx.save(); ctx.translate(x, y); ctx.rotate(t + i); ctx.globalAlpha *= Math.sin(p * Math.PI); ctx.fillRect(-1.6, -0.3, 3.2, 0.6); ctx.fillRect(-0.3, -1.6, 0.6, 3.2); ctx.restore(); } },
      wpal: PAL(198, 210, { sat: 0.8, lm: 0.85, la: 0.2, metal: [198, 0.5, 0.95, 0.15], gold: [190, 0.8, 1.15] }),
      wfx(A, t) { if (A.handB) glowDot(A.handB[0] + 2, A.handB[1], 18, '170,230,255', 0.35 + 0.1 * Math.sin(t * 3)); },
    },
  };
  // ===== Schützin =====
  const archerFace = (t, hair) => { headBall(0, 0, 8.5); face(0, 1, { t, seed: 1.3, eye: '#2f9a4f', brow: hair || '#9a6a3a' }); };
  const elfEar = () => { ctx.beginPath(); ctx.moveTo(-5.5, -1); ctx.quadraticCurveTo(-12, -5, -13, -9); ctx.quadraticCurveTo(-8, -6, -4.5, 2); ctx.closePath(); fillO('#efc39c'); };
  GSET.s = {
    wald: {
      n: 'Waldläuferin',
      kopf: { head(A, t) {
        for (const [x, a] of [[-6, -0.9], [-1, -0.4], [4, 0.2]]) { ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + Math.sin(a) * 8, -18); ctx.lineTo(x + Math.sin(a) * 8 - 3, -21); ctx.stroke(); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.3; ctx.stroke(); }
        archerFace(t); elfEar();
        ctx.beginPath(); ctx.moveTo(-10.5, 7); ctx.quadraticCurveTo(-13.5, -12, 0, -14); ctx.quadraticCurveTo(10, -14.5, 10.5, -7); ctx.quadraticCurveTo(5, -10.5, -1.5, -9.6); ctx.quadraticCurveTo(-7, -8, -7.4, 7); ctx.closePath(); fillO(LG(-14, 7, '#6a9a3a', '#2a4a1a'));
        for (let i = 0; i < 6; i++) leaf(-9 + i * 3.2, -12 + Math.abs(i - 2.5) * 0.9, 6, -1.9 + i * 0.25, i % 2 ? '#7ab84a' : '#4a8a2a');
      } },
      koerper: { pal: PAL(95, 35, { sat: 0.75, lm: 0.82, metal: [90, 0.15, 0.8, 0], gold: [40, 0.6, 0.9] }),
        cape(A, t, walk) { cloth(A.sh[0] - 3, A.sh[1] + 1, 34, 16, '#5a8a2a', '#22401a', t, walk, { seed: 3, rag: 8 }); const wv = Math.sin(t * 2.6 + 3) * 2.5 + (walk ? 5 : 0); for (let i = 0; i < 5; i++) leaf(A.sh[0] - 8 - wv * 0.5 - i * 2.4, A.sh[1] + 8 + i * 5, 6, 1.9 + i * 0.2, i % 2 ? '#7ab84a' : '#9ac84a'); },
        over() { leaf(-2, -20, 7, 0.6, '#7ab84a'); leaf(2, -20, 7, 2.5, '#5a9a3a'); ctx.beginPath(); ctx.arc(0, -19.5, 1.6, 0, 7); fillO('#c9a64a'); } },
      beine: { pal: PAL(30, 60, { sat: 0.7, lm: 0.8, metal: [30, 0.15, 0.7, 0], gold: [40, 0.6, 0.9] }),
        boot() { ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(2, -8); ctx.quadraticCurveTo(8, -5, 8.5, -0.6); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-8, 0, '#8a6a3a', '#4a3020')); ctx.strokeStyle = 'rgba(30,20,10,.5)'; ctx.lineWidth = 0.7; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4, -7 + i * 2); ctx.lineTo(2, -6 + i * 2); ctx.stroke(); } leaf(-4, -8, 5, -2.2, '#6aaa3a'); } },
    },
    mond: {
      n: 'Mondjägerin',
      kopf: { head(A, t) {
        const wv = Math.sin(t * 2.4) * 1.5 + (A.walk ? 3 : 0);
        ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-16 - wv, -4, -18 - wv, 10); ctx.quadraticCurveTo(-13 - wv, 6, -11 - wv * 0.5, 14); ctx.quadraticCurveTo(-8, 4, -5, 2); ctx.closePath(); fillO(LG(-8, 14, '#f4f6ff', '#9aa8d8'));
        archerFace(t, '#c8d0f0'); elfEar();
        ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(-10, -9.5, 0, -9.8); ctx.quadraticCurveTo(9, -9.6, 9, -4.5); ctx.quadraticCurveTo(4, -6.5, 0, -5.4); ctx.quadraticCurveTo(-4, -4.5, -5.5, 4); ctx.closePath(); fillO(LG(-10, 4, '#ffffff', '#b8c4ec'));
        ctx.strokeStyle = '#d8e0ff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, -6, 9.2, 3, -0.08, Math.PI, 0); ctx.stroke();
        ctx.save(); ctx.translate(1.5, -12.5); glowDot(0, 0, 10, '200,220,255', 0.6 + 0.2 * Math.sin(t * 2)); ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.arc(1.8, -1, 3.6, 0, 7, true); ctx.fillStyle = '#f4f8ff'; ctx.fill('evenodd'); ctx.restore();
      } },
      koerper: { pal: PAL(232, 250, { sat: 0.75, lm: 0.62, la: 0.04, metal: [225, 0.15, 1.02, 0.08], gold: [220, 0.25, 1.15] }),
        cape(A, t, walk) { cloth(A.sh[0] - 3, A.sh[1] + 1, 42, 19, '#2a3a8a', '#0c1030', t, walk, { seed: 3, rag: 5 }); for (let i = 0; i < 7; i++) sparkle(A.sh[0] - 6 - (i * 7) % 17, A.sh[1] + 6 + i * 5, 1.4 + (i % 2), 0.5 + 0.5 * Math.sin(t * 4 + i)); },
        over(A, t) { ctx.save(); ctx.translate(0, -15); ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, 7); ctx.arc(1.6, -0.8, 3, 0, 7, true); ctx.fillStyle = '#e8eeff'; ctx.fill('evenodd'); ctx.restore(); glowDot(0, -15, 8, '200,220,255', 0.45); } },
      beine: { pal: PAL(230, 250, { sat: 0.5, lm: 0.7, la: 0.08, metal: [225, 0.15, 1, 0.08], gold: [220, 0.25, 1.15] }),
        boot(kn, t, back) { ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(2, -8); ctx.quadraticCurveTo(8.5, -5.5, 8.5, -0.6); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-8, 0, '#f0f4ff', '#8a96c8')); for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3 + (back ? 0.5 : 0)) % 1; sparkle(-4 - p * 14, -3 - p * 5, 1.6 * (1 - p) + 0.4, 1 - p); } } },
      aura(t) { ctx.save(); ctx.translate(-4, -64); glowDot(0, 0, 24, '200,220,255', 0.3); ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.arc(5, -3, 11, 0, 7, true); ctx.fillStyle = 'rgba(230,238,255,.35)'; ctx.fill('evenodd'); ctx.restore(); auraPool(t, '170,190,255', 0.3); },
      fx(A, t) { rise(5, t, 0.3, 20, 70, -6, (x, y, p) => sparkle(x, y, 2 * (1 - p) + 0.6, 1 - p)); },
      wpal: PAL(225, 250, { sat: 0.35, lm: 1.05, la: 0.18, metal: [225, 0.2, 1.08, 0.15], gold: [220, 0.3, 1.2] }),
      wfx(A, t) { if (A.handB) glowDot(A.handB[0] + 4, A.handB[1], 16, '210,225,255', 0.4 + 0.1 * Math.sin(t * 3)); },
    },
  };
  // ===== Magier =====
  const mageFace = (t, beard = '#f4f4f8') => { headBall(0, 1, 8.2, '#f6d4b4', '#dcaa86'); face(0, 2, { t, seed: 0.7, eye: '#5a3aa8', brow: beard === '#f4f4f8' ? '#e8e8f0' : beard, mouth: false, cheek: false });
    ctx.beginPath(); ctx.moveTo(1, 5); ctx.quadraticCurveTo(6, 3, 9, 6); ctx.quadraticCurveTo(5, 8.5, 1, 7.5); ctx.closePath(); fillO(beard); ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.ellipse(8, 3, 1.6, 1.2, 0, 0, 7); ctx.fill(); };
  const mageHat = (t, c1, c2, brim, band) => { const wv = Math.sin(t * 2) * 1.5;
    ctx.beginPath(); ctx.ellipse(1, -5, 13, 3.4, -0.08, 0, 7); fillO(LG(-8, -2, brim[0], brim[1]));
    ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-3, -16, -2, -24); ctx.quadraticCurveTo(-6 - wv, -27, -12 - wv, -26); ctx.quadraticCurveTo(-3, -22, 2, -26); ctx.quadraticCurveTo(5, -16, 9, -6); ctx.closePath(); fillO(LG(-27, -6, c1, c2));
    rr(-7.5, -8.4, 17, 3, 1.2); fillO(band); return [-12 - wv, -26]; };
  GSET.m = {
    feuer: {
      n: 'Feuermagier',
      kopf: { head(A, t) {
        mageFace(t, '#f0e0d0'); const [tx, ty] = mageHat(t, '#e85a2a', '#8a1c14', ['#c83a1e', '#6a1410'], '#ffb547');
        fire(tx + 1, ty + 3, 12, 3.6, t, '255,120,40', '255,230,120', 1); glowDot(tx, ty - 2, 8, '255,140,40', 0.6);
        ctx.save(); ctx.translate(2.5, -14); ctx.beginPath(); ctx.moveTo(0, 3); ctx.quadraticCurveTo(-3, 0, 0, -4); ctx.quadraticCurveTo(0.6, -1, 2, -2); ctx.quadraticCurveTo(3, 1, 0, 3); fillO('#ffd23f'); ctx.restore();
      } },
      koerper: { pal: PAL(10, 32, { sat: 1.3, lm: 1.05, la: 0.06, metal: [20, 0.3, 0.85, 0], gold: [40, 1, 1.08] }),
        over(A, t) { ctx.save(); ctx.translate(0, -13); fire(0, 3, 9, 3, t, '255,120,40', '255,220,120', 4); ctx.restore(); },
        fx(A, t) { rise(4, t, 0.6, 10, 40, -24, (x, y, p) => { ctx.fillStyle = `rgba(255,${150 + p * 80 | 0},60,${1 - p})`; ctx.fillRect(x + 4, y, 1.8, 1.8); }); } },
      beine: { pal: PAL(6, 28, { sat: 1.3, lm: 0.95, la: 0.04, metal: [15, 0.3, 0.8, 0], gold: [40, 1, 1.05] }),
        boot(kn, t, back) { if (back) return; for (let i = 0; i < 3; i++) fire(-10 + i * 7, 1, 6 + (i % 2) * 2, 2.4, t, '255,120,40', '255,220,120', i * 2.3); } },
    },
    kosmos: {
      n: 'Sternenweiser',
      kopf: { head(A, t) {
        mageFace(t, '#e8f0ff'); const [tx, ty] = mageHat(t, '#2a2a7a', '#0c0a2a', ['#24206a', '#0a0820'], '#b06bff');
        ctx.save(); ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-3, -16, -2, -24); ctx.lineTo(2, -26); ctx.quadraticCurveTo(5, -16, 9, -6); ctx.closePath(); ctx.clip();
        for (let i = 0; i < 9; i++) { const a = t * 0.8 + i * 0.7, r = 2 + i * 1.1; ctx.fillStyle = `rgba(${i % 2 ? '200,170,255' : '150,220,255'},.8)`; ctx.beginPath(); ctx.arc(1 + Math.cos(a) * r * 0.6, -14 + Math.sin(a) * r, 0.7 + (i % 3) * 0.3, 0, 7); ctx.fill(); }
        ctx.restore();
        ctx.save(); ctx.translate(tx, ty); starP(0, 0, 4.4, 1.8, 5, t); fillO('#fff6c8'); ctx.restore(); glowDot(tx, ty, 10, '255,240,180', 0.7 + 0.2 * Math.sin(t * 3));
        for (let i = 0; i < 2; i++) { const a = t * (1.4 + i * 0.5) + i * 3, x = Math.cos(a) * 15, y = -10 + Math.sin(a) * 4; ctx.beginPath(); ctx.arc(x, y, 1.8 - i * 0.4, 0, 7); fillO(i ? '#7fd8ff' : '#ff9a6a'); }
      } },
      koerper: { pal: PAL(245, 268, { sat: 0.9, lm: 0.5, la: 0.03, metal: [240, 0.2, 0.8, 0.05], gold: [270, 0.6, 1.1] }),
        over(A, t) { const pts = [[-5, -20], [-1, -16], [3, -19], [5, -12], [-3, -9]]; ctx.strokeStyle = 'rgba(200,190,255,.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); pts.forEach(([x, y], i) => sparkle(x, y, 1.6, 0.6 + 0.4 * Math.sin(t * 3 + i))); } },
      beine: { pal: PAL(255, 285, { sat: 0.9, lm: 0.45, la: 0.03, metal: [250, 0.2, 0.7, 0.05], gold: [270, 0.6, 1.1] }),
        boot(kn, t, back) { if (back) return; glowDot(0, -2, 16, '150,110,255', 0.35); for (let i = 0; i < 4; i++) sparkle(-12 + i * 7, -3 - (i % 2) * 4, 1.4, 0.5 + 0.5 * Math.sin(t * 4 + i)); } },
      aura(t) { auraPool(t, '140,110,255', 0.4); ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const a = t * 0.4 + i * 2.1; ctx.fillStyle = `rgba(${['120,90,255', '80,160,255', '200,100,255'][i]},.12)`; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 10, -40 + Math.sin(a) * 8, 26, 14, a, 0, 7); ctx.fill(); } ctx.restore(); },
      fx(A, t) { for (let i = 0; i < 6; i++) { const a = t * 0.9 + i / 6 * Math.PI * 2, x = Math.cos(a) * 24, y = -38 + Math.sin(a) * 9; if (Math.sin(a) < 0) continue; sparkle(x, y, 2, 0.9); } },
      wpal: PAL(50, 40, { sat: 0.5, lm: 1.1, la: 0.2, metal: [48, 0.3, 1.1, 0.15], gold: [48, 1, 1.15] }),
      wfx(A, t) { if (A.handF) { const x = A.handF[0] + 1, y = A.handF[1] - 26; glowDot(x, y, 14, '255,240,180', 0.55); sparkle(x, y, 4, 0.9); } },
    },
  };
  // ===== Priesterin =====
  const priestFace = (t, hairA, hairB, eye = '#4a8ae6') => { headBall(0, 0, 8.4, '#f8dcc0', '#e2b290'); face(0, 1, { t, seed: 2.1, eye, brow: hairB });
    ctx.beginPath(); ctx.moveTo(-8.6, 3); ctx.quadraticCurveTo(-10, -9, 0, -9.6); ctx.quadraticCurveTo(9, -9.6, 9.2, -3); ctx.quadraticCurveTo(5, -6.5, 1, -5.5); ctx.quadraticCurveTo(-4, -4, -5.5, 5); ctx.closePath(); fillO(LG(-10, 4, hairA, hairB)); };
  const blossom = (x, y, r, c, core = '#ffd23f') => { ctx.fillStyle = c; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.26) * r, y + Math.sin(k * 1.26) * r, r * 0.8, 0, 7); ctx.fill(); } ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, 7); ctx.fill(); };
  GSET.p = {
    bluete: {
      n: 'Blütenpriesterin',
      kopf: { head(A, t) {
        ctx.beginPath(); ctx.moveTo(-7, -3); ctx.quadraticCurveTo(-15, 2, -13, 13); ctx.quadraticCurveTo(-9, 8, -6, 6); ctx.closePath(); fillO(LG(-4, 13, '#ffd0e4', '#e080a8'));
        priestFace(t, '#ffd8ea', '#e088b0');
        for (let i = 0; i < 6; i++) { const a = Math.PI * (1.02 + i * 0.19), x = Math.cos(a) * 9.6, y = -3 + Math.sin(a) * 8.2; leaf(x, y, 4, a + 1.4, '#6ac46a'); blossom(x, y, 1.6, ['#ff8ac8', '#ffffff', '#ffb4d8'][i % 3]); }
      } },
      koerper: { pal: PAL(335, 350, { sat: 0.55, lm: 0.95, la: 0.06, metal: [330, 0.25, 1, 0.08], gold: [140, 0.5, 0.95] }),
        over() { blossom(0, -18, 2.2, '#ff8ac8'); leaf(1.5, -18, 5, 0.5, '#6ac46a'); leaf(-1.5, -18, 5, 2.6, '#6ac46a'); },
        fx(A, t) { rise(5, t, -0.25, 22, -80, -80, (x, y, p) => { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + p * 6); ctx.fillStyle = `rgba(255,170,210,${Math.sin(p * Math.PI)})`; ctx.beginPath(); ctx.ellipse(0, 0, 2, 1.1, 0, 0, 7); ctx.fill(); ctx.restore(); }); } },
      beine: { pal: PAL(335, 350, { sat: 0.5, lm: 0.95, la: 0.08, metal: [330, 0.25, 1, 0.08], gold: [140, 0.5, 0.95] }),
        boot(kn, t, back) { if (back) return; for (let i = 0; i < 4; i++) blossom(-10 + i * 6, -1.5 - (i % 2), 1.4, i % 2 ? '#ffffff' : '#ff8ac8'); } },
    },
    engel: {
      n: 'Erzengel',
      kopf: { head(A, t) {
        ctx.save(); ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(-1, -14, 11, 3.4, -0.1, 0, 7); ctx.stroke(); ctx.restore();
        glowDot(-1, -14, 18, '255,236,150', 0.55 + 0.15 * Math.sin(t * 3)); sunRays(-1, -14, 6, 20, 10, t * 0.4, '255,236,160', 0.18);
        const wv = Math.sin(t * 2) * 1.2 + (A.walk ? 2 : 0);
        ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-17 - wv, -2, -16 - wv, 14); ctx.quadraticCurveTo(-11, 8, -6, 6); ctx.closePath(); fillO(LG(-6, 14, '#fff6c8', '#e8b040'));
        priestFace(t, '#fff6c8', '#e8b040', '#7ab8ff');
        ctx.beginPath(); ctx.moveTo(-8, -6); ctx.quadraticCurveTo(0, -11, 9, -6); ctx.lineTo(8.5, -8.5); ctx.quadraticCurveTo(0, -13.5, -7.5, -8.6); ctx.closePath(); fillO(LG(-13, -6, '#fff8d8', '#d9a02a'));
        ctx.beginPath(); ctx.moveTo(1, -16); ctx.lineTo(3, -11); ctx.lineTo(1, -8); ctx.lineTo(-1, -11); ctx.closePath(); fillO('#7ab8ff'); glowDot(1, -12, 6, '150,200,255', 0.7);
      } },
      koerper: { pal: PAL(46, 40, { sat: 0.45, lm: 1.05, la: 0.12, metal: [45, 0.3, 1.05, 0.12], gold: [44, 1, 1.12] }),
        cape(A, t) { const x = A.sh[0] - 3, y = A.sh[1] + 3; glowDot(x - 14, y, 26, '255,240,180', 0.35); wing(x, y, 1.75, t, '#ffffff', '#f0d080', '#ffd23f', 6); },
        over(A, t) { ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(6, -22); ctx.lineTo(4, -12); ctx.lineTo(0, -9); ctx.lineTo(-4, -12); ctx.closePath(); fillO(LG(-22, -9, '#fff4c0', '#c9902a')); ctx.beginPath(); ctx.arc(0, -16, 1.8, 0, 7); fillO('#7ab8ff'); } },
      beine: { pal: PAL(46, 40, { sat: 0.4, lm: 1.05, la: 0.14, metal: [45, 0.3, 1.05, 0.12], gold: [44, 1, 1.12] }),
        boot(kn, t, back) { if (back) return; glowDot(0, -1, 18, '255,236,160', 0.4 + 0.1 * Math.sin(t * 2)); } },
      aura(t) { sunRays(0, -60, 10, 90, 16, t * 0.15, '255,240,180', 0.08); auraPool(t, '255,236,160', 0.42); },
      fx(A, t) { rise(4, t, -0.2, 26, -90, -90, (x, y, p) => { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + p * 9) * 0.8); ctx.globalAlpha *= Math.sin(p * Math.PI); ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 4, 0.3, 0, 7); fillO('#ffffff'); ctx.restore(); }); },
      wpal: PAL(46, 40, { sat: 0.6, lm: 1.1, la: 0.15, metal: [46, 0.4, 1.1, 0.15], gold: [46, 1, 1.15] }),
      wfx(A, t) { if (A.handF) glowDot(A.handF[0], A.handF[1] - 24, 16, '255,240,180', 0.55 + 0.15 * Math.sin(t * 4)); },
    },
  };
  // ===== Tierbändiger =====
  const tamerFace = (t, beard) => { headBall(0, 1, 8.4, '#f0c8a0', '#d49a70'); face(0, 1.5, { t, seed: 3.3, eye: '#6b4a2e', brow: '#5a3a20', mouth: false, cheek: false });
    ctx.beginPath(); ctx.moveTo(-4, 3); ctx.quadraticCurveTo(-2, 12, 4, 12); ctx.quadraticCurveTo(10, 10, 9, 3); ctx.quadraticCurveTo(6, 6, 3, 5.6); ctx.quadraticCurveTo(0, 6, -4, 3); ctx.closePath(); fillO(LG(3, 12, beard[0], beard[1])); };
  GSET.t = {
    baer: {
      n: 'Bärenfell',
      kopf: { head(A, t) {
        tamerFace(t, ['#8a5a30', '#5a3a1e']);
        ctx.beginPath(); ctx.moveTo(-11, 6); ctx.quadraticCurveTo(-13, -11, -1, -13.5); ctx.quadraticCurveTo(10, -14, 13, -7); ctx.lineTo(16, -5); ctx.quadraticCurveTo(15, -2, 11, -3); ctx.quadraticCurveTo(4, -7, -4, -5); ctx.quadraticCurveTo(-7.5, -2, -8, 6); ctx.closePath(); fillO(LG(-14, 6, '#8a5a34', '#4a2e18'));
        for (const ex of [-6, 1.5]) { ctx.beginPath(); ctx.arc(ex, -12.5, 3, 0, 7); fillO('#7a4e2c'); ctx.fillStyle = '#c89a6a'; ctx.beginPath(); ctx.arc(ex, -12.5, 1.4, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#c89a6a'; ctx.beginPath(); ctx.ellipse(13, -5, 3.4, 2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(15.5, -5.4, 1, 0, 7); ctx.fill(); ctx.fillRect(7.5, -9, 1.6, 1.6);
        ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(9 + i * 2, -3.3); ctx.lineTo(10 + i * 2, -1); ctx.lineTo(11 + i * 2, -3.3); ctx.fill(); }
      } },
      koerper: { pal: PAL(28, 20, { sat: 0.8, lm: 0.82, metal: [30, 0.2, 0.7, 0], gold: [38, 0.6, 0.9] }),
        over() { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = -9 + i * 2.25; ctx.lineTo(x, -24 + (i % 2) * 3); } ctx.lineTo(9, -26); ctx.lineTo(-9, -26); ctx.closePath(); fillO('#7a4e2c'); },
        pads() { ctx.beginPath(); ctx.ellipse(0, -1, 7.5, 5.5, 0, Math.PI, 0); ctx.lineTo(7.5, 1.5); for (let i = 0; i < 5; i++) ctx.lineTo(7.5 - i * 3.75, 1.5 + (i % 2) * 2.4); ctx.closePath(); fillO(LG(-6, 3, '#9a6a3e', '#5a3a1e')); } },
      beine: { pal: PAL(28, 20, { sat: 0.7, lm: 0.75, metal: [30, 0.2, 0.7, 0], gold: [38, 0.6, 0.9] }),
        boot() { ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(2.5, -9); ctx.quadraticCurveTo(9, -6, 9, -0.6); ctx.lineTo(-5, 0); ctx.closePath(); fillO(LG(-9, 0, '#9a6a3e', '#4a2e18')); ctx.beginPath(); for (let i = 0; i <= 5; i++) ctx.lineTo(-5 + i * 1.5, -9 - (i % 2) * 1.8); ctx.lineTo(2.5, -9); ctx.closePath(); fillO('#b07a4a'); } },
    },
    geist: {
      n: 'Geisterwolf',
      kopf: { head(A, t) {
        tamerFace(t, ['#d8e4f0', '#8a9aac']);
        fire(-8, -9, 12, 3, t, '120,230,255', '230,255,255', 2); fire(-2, -11, 10, 2.6, t, '120,230,255', '230,255,255', 5);
        ctx.beginPath(); ctx.moveTo(-10, 5); ctx.quadraticCurveTo(-12, -9, -2, -12); ctx.quadraticCurveTo(8, -13, 13, -6); ctx.lineTo(16, -3); ctx.quadraticCurveTo(11, -3, 8, -5); ctx.quadraticCurveTo(2, -7, -4, -5); ctx.quadraticCurveTo(-7, -2, -7.5, 5); ctx.closePath(); fillO(LG(-13, 5, '#ffffff', '#9ab4cc'));
        for (const ex of [-5, 1]) { ctx.beginPath(); ctx.moveTo(ex, -10.5); ctx.lineTo(ex + 2.5, -18); ctx.lineTo(ex + 4.5, -10.5); ctx.closePath(); fillO('#e8f0f8'); }
        glowDot(8.5, -7.5, 6, '100,230,255', 0.9); ctx.fillStyle = '#c8ffff'; ctx.beginPath(); ctx.ellipse(8.5, -7.5, 1.6, 1, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(9 + i * 1.8, -3.4); ctx.lineTo(9.8 + i * 1.8, -1.2); ctx.lineTo(10.6 + i * 1.8, -3.4); ctx.fill(); }
      } },
      koerper: { pal: PAL(200, 190, { sat: 0.4, lm: 0.85, la: 0.25, metal: [200, 0.25, 0.9, 0.12], gold: [185, 0.7, 1.1] }),
        cape(A, t, walk) { cloth(A.sh[0] - 3, A.sh[1] + 1, 36, 18, '#f0f6ff', '#7a94b0', t, walk, { seed: 5, rag: 8 }); },
        over(A, t) { ctx.strokeStyle = `rgba(120,230,255,${0.7 + 0.3 * Math.sin(t * 3)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-3, -20); ctx.lineTo(0, -14); ctx.lineTo(3, -20); ctx.moveTo(0, -14); ctx.lineTo(0, -8); ctx.stroke(); glowDot(0, -14, 9, '120,230,255', 0.5); } },
      beine: { pal: PAL(200, 190, { sat: 0.35, lm: 0.8, la: 0.22, metal: [200, 0.25, 0.85, 0.1], gold: [185, 0.7, 1.1] }),
        boot(kn, t, back) { ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(2.5, -9); ctx.quadraticCurveTo(9, -6, 9, -0.6); ctx.lineTo(-5, 0); ctx.closePath(); fillO(LG(-9, 0, '#f0f6ff', '#8aa4bc')); for (let i = 0; i < 2; i++) { const p = (t * 0.9 + i / 2 + (back ? 0.25 : 0)) % 1; glowDot(-4 - p * 12, -3 - p * 6, 4 * (1 - p) + 1, '120,230,255', 1 - p); } } },
      aura(t) { auraPool(t, '100,220,255', 0.42); },
      fx(A, t) { rise(5, t, 0.5, 18, 70, -6, (x, y, p) => glowDot(x, y, 3 + 2 * (1 - p), '120,230,255', 1 - p)); },
      wpal: PAL(195, 190, { sat: 0.6, lm: 0.95, la: 0.2, metal: [195, 0.45, 1, 0.15], gold: [185, 0.8, 1.15] }),
      wfx(A, t) { if (A.handF) glowDot(A.handF[0] + 4, A.handF[1] - 10, 14, '120,230,255', 0.5); },
    },
  };
  // ===== Assassine =====
  GSET.a = {
    nacht: {
      n: 'Nachtklinge',
      kopf: { head(A, t) {
        headBall(0, 0, 8.2, '#e8c4a4', '#c4987a');
        ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(9.5, -5); ctx.quadraticCurveTo(10.5, 3, 7, 8); ctx.quadraticCurveTo(0, 9, -3, 6); ctx.closePath(); fillO(LG(-6, 8, '#e8eaf0', '#8a90a0'));
        ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.moveTo(2, -2.6); ctx.lineTo(9.6, -2.2); ctx.lineTo(9.2, -0.8); ctx.lineTo(2.2, -1.2); ctx.closePath(); ctx.fill(); glowDot(6, -1.8, 5, '255,60,80', 0.8); ctx.fillStyle = '#ff4d5e'; ctx.fillRect(4.5, -2.3, 3.6, 0.9);
        ctx.strokeStyle = 'rgba(30,30,40,.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(4, 3); ctx.lineTo(8.5, 2.6); ctx.moveTo(4.5, 5); ctx.lineTo(8, 4.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10.5, 8); ctx.quadraticCurveTo(-13, -11, 0, -13.5); ctx.quadraticCurveTo(10.5, -14, 11.5, -5); ctx.lineTo(9.5, -5); ctx.quadraticCurveTo(6, -9, 0, -8.5); ctx.quadraticCurveTo(-5.5, -7, -7, 8); ctx.closePath(); fillO(LG(-14, 8, '#2a2438', '#08060c'));
      } },
      koerper: { pal: PAL(255, 240, { sat: 0.25, lm: 0.55, la: 0.02, metal: [230, 0.1, 0.85, 0.05], gold: [0, 0.75, 0.9] }),
        cape(A, t, walk) { const wv = Math.sin(t * 3) * 3 + (walk ? 6 : 0), x = A.sh[0], y = A.sh[1] + 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 14 - wv, y - 2, x - 26 - wv, y + 4 + Math.sin(t * 5) * 2); ctx.lineTo(x - 22 - wv, y + 8); ctx.quadraticCurveTo(x - 12 - wv, y + 4, x, y + 4); ctx.closePath(); fillO('#2a2438'); },
        over() { ctx.strokeStyle = '#8a90a0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(6, -6); ctx.moveTo(6, -22); ctx.lineTo(-6, -6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -14, 1.8, 0, 7); fillO('#e5484d'); } },
      beine: { pal: PAL(255, 240, { sat: 0.25, lm: 0.5, la: 0.02, metal: [230, 0.1, 0.8, 0.04], gold: [0, 0.75, 0.9] }),
        boot() { ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(2, -8); ctx.quadraticCurveTo(8, -4.5, 8.5, -0.5); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-8, 0, '#3a3448', '#14101c')); ctx.strokeStyle = '#8a90a0'; ctx.lineWidth = 0.7; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4, -7 + i * 2.2); ctx.lineTo(3, -5.5 + i * 2.2); ctx.stroke(); } } },
    },
    blutmond: {
      n: 'Blutmond',
      kopf: { head(A, t) {
        const wv = Math.sin(t * 3) * 1.5 + (A.walk ? 3 : 0);
        ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-15 - wv, -6, -17 - wv, 6); ctx.quadraticCurveTo(-12, 2, -6, 4); ctx.closePath(); fillO(LG(-8, 6, '#ff5a6a', '#8a1424'));
        headBall(0, 0, 8.2, '#e8c4a4', '#c4987a');
        for (const [sx, d] of [[-3, -1], [5, 1]]) { ctx.beginPath(); ctx.moveTo(sx - 2, -7); ctx.quadraticCurveTo(sx + d * 2, -16, sx + d * 5, -19); ctx.quadraticCurveTo(sx + d * 1, -12, sx + 2.4, -6); ctx.closePath(); fillO(LG(-19, -6, '#fff4d8', '#c8a878')); }
        ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(4, -10, 10, -6); ctx.quadraticCurveTo(11.5, 1, 9, 5); ctx.lineTo(10.5, 8); ctx.lineTo(6, 6.5); ctx.lineTo(3, 9); ctx.lineTo(0, 6.5); ctx.quadraticCurveTo(-4, 4, -4, -8); ctx.closePath(); fillO(LG(-10, 9, '#e8303e', '#7a0c18'));
        ctx.fillStyle = '#1b0508'; ctx.beginPath(); ctx.moveTo(2, -3.5); ctx.lineTo(8.5, -2.5); ctx.lineTo(7.5, -0.5); ctx.lineTo(3, -1); ctx.closePath(); ctx.fill(); glowDot(6, -2, 6, '255,220,90', 0.85); ctx.fillStyle = '#ffe27a'; ctx.fillRect(4.6, -2.4, 2.8, 1.1);
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(3, 5); ctx.lineTo(4, 7.4); ctx.lineTo(5, 5); ctx.moveTo(6.2, 5); ctx.lineTo(7.2, 7.2); ctx.lineTo(8.2, 5); ctx.fill();
      } },
      koerper: { pal: PAL(356, 340, { sat: 1, lm: 0.7, la: 0.01, metal: [350, 0.25, 0.6, 0], gold: [44, 1, 1.05] }),
        cape(A, t, walk) { const x = A.sh[0], y = A.sh[1] + 1; for (let r = 0; r < 3; r++) { const wv = Math.sin(t * 3 + r) * 4 + (walk ? 7 : 0), len = 32 + r * 6; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - len * 0.4 - wv, y - 4 + r * 3, x - len * 0.7 - wv, y + 8 + Math.sin(t * 4 + r) * 4, x - len - wv, y + 4 + r * 4); ctx.lineTo(x - len - wv + 2, y + 8 + r * 4); ctx.bezierCurveTo(x - len * 0.6 - wv, y + 12, x - len * 0.3, y + 3 + r * 3, x, y + 4 + r); ctx.closePath(); fillO(r % 2 ? '#a8101e' : '#e5303e'); } },
        over(A, t) { ctx.beginPath(); ctx.arc(0, -15, 4, 0, 7); fillO('#c8101e'); glowDot(0, -15, 9, '255,40,60', 0.5 + 0.2 * Math.sin(t * 3)); } },
      beine: { pal: PAL(356, 340, { sat: 0.9, lm: 0.55, la: 0.01, metal: [350, 0.25, 0.55, 0], gold: [44, 1, 1.05] }),
        boot(kn, t, back) { ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(2, -8); ctx.quadraticCurveTo(8, -4.5, 8.5, -0.5); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-8, 0, '#3a1018', '#14060a')); for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3 + (back ? 0.4 : 0)) % 1; ctx.fillStyle = `rgba(255,40,60,${0.5 * (1 - p)})`; ctx.beginPath(); ctx.arc(-4 - p * 10, -2 - p * 4, 2 + p * 3, 0, 7); ctx.fill(); } } },
      aura(t) { ctx.save(); ctx.translate(0, -50); glowDot(0, 0, 40, '255,40,60', 0.35); ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fillStyle = 'rgba(200,20,40,.22)'; ctx.fill(); ctx.restore(); },
      fx(A, t) { rise(5, t, -0.3, 24, -80, -80, (x, y, p) => { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + p * 8); ctx.fillStyle = `rgba(255,60,80,${Math.sin(p * Math.PI)})`; ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 1, 0, 0, 7); ctx.fill(); ctx.restore(); }); },
      wpal: PAL(356, 340, { sat: 1, lm: 0.85, la: 0.05, metal: [355, 0.7, 0.85, 0.05], gold: [44, 1, 1.05] }),
      wfx(A, t) { if (A.handF) glowDot(A.handF[0] + 4, A.handF[1], 12, '255,40,60', 0.5); },
    },
  };
  // ===== Nekromant =====
  GSET.n = {
    knochen: {
      n: 'Knochenfürst',
      kopf: { head(A, t) {
        const gl = 0.7 + 0.3 * Math.sin(t * 3);
        ctx.beginPath(); ctx.arc(1, -1, 8.6, 0, 7); fillO(LG(-10, 8, '#f8f0dc', '#c8b890'));
        rr(-2, 4, 10, 5, 1.8); fillO('#ece2c4'); ctx.fillStyle = '#5a4a30'; for (let i = 0; i < 4; i++) ctx.fillRect(-0.5 + i * 2.2, 4.5, 0.8, 4);
        ctx.fillStyle = '#0c0a08'; for (const ex of [2.2, 6.8]) { ctx.beginPath(); ctx.ellipse(ex, -1.2, 2.2, 2.6, 0, 0, 7); ctx.fill(); glowDot(ex, -1.2, 4, '107,224,184', 0.9 * gl); }
        ctx.beginPath(); ctx.moveTo(4.3, 1.4); ctx.lineTo(3.4, 3); ctx.lineTo(5.2, 3); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, -6); for (let i = 0; i < 5; i++) { ctx.lineTo(-7 + i * 4, -15 - (i % 2) * 3); ctx.lineTo(-5 + i * 4, -8); } ctx.lineTo(10, -6); ctx.quadraticCurveTo(1, -9, -8, -6); ctx.closePath(); fillO(LG(-18, -6, '#f8f0dc', '#a89870'));
        glowDot(1, -12, 3, '107,224,184', gl);
      } },
      koerper: { pal: PAL(45, 35, { sat: 0.2, lm: 0.75, la: 0.06, metal: [45, 0.15, 0.85, 0.05], gold: [160, 0.6, 0.95] }),
        over() { ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(0, -9); ctx.stroke(); ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 1.3; ctx.stroke();
          for (let i = 0; i < 3; i++) { const y = -19 + i * 4; for (const d of [-1, 1]) { ctx.strokeStyle = OUT; ctx.lineWidth = 2.1; ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(d * 4, y - 1, d * 4.8, y + 2.4); ctx.stroke(); ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 1.1; ctx.stroke(); } } },
        pads() { ctx.beginPath(); ctx.arc(0, -2, 5.5, 0, 7); fillO('#f4ecd8'); ctx.fillStyle = '#1a1414'; ctx.beginPath(); ctx.arc(-1.8, -2.5, 1.4, 0, 7); ctx.arc(2, -2.5, 1.4, 0, 7); ctx.fill(); } },
      beine: { pal: PAL(40, 30, { sat: 0.2, lm: 0.6, la: 0.03, metal: [40, 0.1, 0.7, 0], gold: [160, 0.6, 0.95] }),
        boot(kn, t, back) { if (back) return; ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-12 + i * 6, -1); ctx.lineTo(-11 + i * 6, -6); ctx.stroke(); } } },
    },
    seelen: {
      n: 'Seelenernter',
      kopf: { head(A, t) {
        ctx.beginPath(); ctx.moveTo(-11, 9); ctx.quadraticCurveTo(-14, -13, 1, -15); ctx.quadraticCurveTo(13, -14, 12, 0); ctx.quadraticCurveTo(11, 8, 6, 10); ctx.closePath(); fillO(LG(-15, 10, '#1f4a44', '#060c0c'));
        ctx.beginPath(); ctx.ellipse(3.5, 0, 6, 7, 0, 0, 7); ctx.fillStyle = '#020404'; ctx.fill();
        fire(4, 4, 14, 4.5, t, '80,255,180', '220,255,240', 3); glowDot(4, -2, 12, '80,255,180', 0.7);
        for (const ex of [2, 6]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, -1, 1.2, 0.9, 0, 0, 7); ctx.fill(); }
        ctx.strokeStyle = 'rgba(107,224,184,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, 5); ctx.quadraticCurveTo(-10, -10, 0, -12.5); ctx.stroke();
      } },
      koerper: { pal: PAL(170, 185, { sat: 0.6, lm: 0.5, la: 0.02, metal: [170, 0.2, 0.7, 0.02], gold: [155, 0.9, 1.05] }),
        over(A, t) { ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(3, -15); ctx.lineTo(0, -10); ctx.lineTo(-3, -15); ctx.closePath(); fillO('#2a6a5a'); glowDot(0, -15, 9, '80,255,180', 0.6 + 0.25 * Math.sin(t * 4)); } },
      beine: { pal: PAL(170, 185, { sat: 0.55, lm: 0.45, la: 0.02, metal: [170, 0.2, 0.6, 0], gold: [155, 0.9, 1.05] }),
        boot(kn, t, back) { if (back) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const ph = t * 1.5 + i; ctx.fillStyle = 'rgba(80,255,180,.16)'; ctx.beginPath(); ctx.ellipse(-8 + i * 5 + Math.sin(ph) * 2, -2, 6, 3.2, 0, 0, 7); ctx.fill(); } ctx.restore(); } },
      aura(t) { auraPool(t, '80,255,180', 0.4); },
      fx(A, t) { for (let i = 0; i < 4; i++) { const a = t * 1.3 + i / 4 * Math.PI * 2, x = Math.cos(a) * 22, y = -36 + Math.sin(a) * 10 + Math.sin(t * 3 + i) * 2;
        ctx.fillStyle = 'rgba(200,255,235,.85)'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 2.4, y); ctx.quadraticCurveTo(x - Math.cos(a + 0.5) * 8, y + 5, x - Math.cos(a + 0.4) * 10, y + 8); ctx.lineTo(x + 2.4, y); ctx.fill(); glowDot(x, y, 6, '80,255,180', 0.6); ctx.fillStyle = '#0a2a20'; ctx.fillRect(x - 1.2, y - 0.8, 0.8, 0.8); ctx.fillRect(x + 0.4, y - 0.8, 0.8, 0.8); } },
      wpal: PAL(160, 175, { sat: 0.8, lm: 0.9, la: 0.06, metal: [160, 0.5, 0.95, 0.08], gold: [155, 1, 1.1] }),
      wfx(A, t) { if (A.handF) glowDot(A.handF[0], A.handF[1] - 22, 14, '80,255,180', 0.6); },
    },
  };
  // ===== Barde =====
  const bardFace = (t, A, hair = ['#a86a3a', '#6b3a1e']) => { headBall(0, 0, 8.3); face(0, 1, { t, seed: 4.2, eye: '#8a4ad8', brow: hair[1], open: A.atk });
    ctx.beginPath(); ctx.moveTo(-8.5, 3); ctx.quadraticCurveTo(-10, -8, 0, -8.4); ctx.quadraticCurveTo(7, -8.4, 8.5, -5.5); ctx.quadraticCurveTo(1, -6, -3, -3); ctx.quadraticCurveTo(-5, 0, -5.5, 5); ctx.closePath(); fillO(LG(-9, 5, hair[0], hair[1])); };
  GSET.b = {
    gaukler: {
      n: 'Gaukler',
      kopf: { head(A, t) {
        bardFace(t, A);
        const sw = Math.sin(t * 4) * 1.5 + (A.walk ? 2 : 0);
        for (const [dir, c] of [[-1, '#e5484d'], [1, '#ffd23f']]) { ctx.beginPath(); ctx.moveTo(-6, -7); ctx.quadraticCurveTo(dir * 6 - 2, -22, dir * 13 - 2 - sw * (dir < 0 ? 1 : 0.4), -14 + (dir < 0 ? 0 : 2)); ctx.quadraticCurveTo(dir * 4, -12, 6, -7); ctx.closePath(); fillO(c);
          ctx.beginPath(); ctx.arc(dir * 13 - 2 - sw * (dir < 0 ? 1 : 0.4), -13 + (dir < 0 ? 0 : 2), 1.8, 0, 7); fillO('#ffe08a'); }
        rr(-8, -9, 16, 3, 1.4); fillO('#7a3ab8'); ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 4, -9); ctx.lineTo(-4 + i * 4, -6); ctx.lineTo(-2 + i * 4, -9); ctx.fill(); }
      } },
      koerper: { pal: PAL(350, 48, { spread: 0.6, sat: 1.05, lm: 0.95, metal: [45, 0.3, 0.95, 0.05], gold: [48, 1, 1.05] }),
        over() { for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) { ctx.save(); ctx.translate(-3 + i * 6, -20 + j * 5); ctx.beginPath(); ctx.moveTo(0, -2.4); ctx.lineTo(2.2, 0); ctx.lineTo(0, 2.4); ctx.lineTo(-2.2, 0); ctx.closePath(); ctx.fillStyle = (i + j) % 2 ? 'rgba(229,72,77,.85)' : 'rgba(255,210,63,.85)'; ctx.fill(); ctx.restore(); } } },
      beine: { pal: PAL(48, 350, { spread: 0.6, sat: 1.05, lm: 0.95, metal: [45, 0.3, 0.95, 0.05], gold: [48, 1, 1.05] }),
        boot(kn, t, back) { ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(3, -6); ctx.quadraticCurveTo(9, -5, 11, -8); ctx.quadraticCurveTo(12, -4, 8, -0.6); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-8, 0, back ? '#c83a3e' : '#e5484d', '#7a1c22')); ctx.beginPath(); ctx.arc(11, -8.4, 1.4, 0, 7); fillO('#ffd23f'); } },
    },
    phoenix: {
      n: 'Phönixsänger',
      kopf: { head(A, t) {
        for (let i = 0; i < 5; i++) { const a = -2.3 + i * 0.28 + Math.sin(t * 3 + i) * 0.05; ctx.save(); ctx.translate(-1, -7); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(7, -3, 17 + i, 0); ctx.quadraticCurveTo(7, 3, 0, 0); fillO(LG(-3, 3, ['#ffd23f', '#ff9a3d', '#e5484d', '#ff9a3d', '#ffd23f'][i], '#c8301e')); ctx.restore(); }
        for (let i = 0; i < 3; i++) { const a = -2.0 + i * 0.4; fire(-1 + Math.cos(a) * 17, -7 + Math.sin(a) * 17, 8, 2.4, t, '255,130,40', '255,240,150', i * 2); }
        bardFace(t, A, ['#ff9a3d', '#c8401e']);
        rr(-7.5, -9, 15, 2.6, 1.2); fillO('#ffd23f'); ctx.beginPath(); ctx.arc(1, -8, 1.8, 0, 7); fillO('#e5484d');
      } },
      koerper: { pal: PAL(18, 40, { sat: 1.1, lm: 0.95, la: 0.02, metal: [30, 0.4, 0.9, 0.05], gold: [46, 1, 1.1] }),
        cape(A, t) { const x = A.sh[0] - 2, y = A.sh[1] + 2; glowDot(x - 12, y + 6, 24, '255,130,40', 0.35); wing(x, y, 1.1, t, '#ffb547', '#e5303e', '#ffd23f', 6); for (let i = 0; i < 3; i++) fire(x - 14 - i * 6, y + 10 + i * 3, 7, 2.2, t, '255,130,40', '255,240,150', i * 1.7); },
        over(A, t) { ctx.save(); ctx.translate(0, -14); ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(-5, -1, -2, -5); ctx.lineTo(0, -2); ctx.lineTo(2, -5); ctx.quadraticCurveTo(5, -1, 0, 4); fillO('#ffd23f'); ctx.restore(); glowDot(0, -14, 9, '255,160,60', 0.5); } },
      beine: { pal: PAL(10, 30, { sat: 1.05, lm: 0.8, la: 0.02, metal: [20, 0.35, 0.85, 0.03], gold: [46, 1, 1.1] }),
        boot(kn, t, back) { ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(2, -7); ctx.quadraticCurveTo(8.5, -5.5, 8.5, -0.6); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-7, 0, '#ffb547', '#a8201e')); fire(-3, -6, 7, 2, t, '255,130,40', '255,240,150', back ? 2 : 0); } },
      aura(t) { auraPool(t, '255,140,50', 0.42); },
      fx(A, t) { rise(5, t, 0.4, 20, 70, -10, (x, y, p, i) => { ctx.fillStyle = `rgba(255,${180 - p * 80 | 0},60,${1 - p})`; ctx.font = 'bold 8px serif'; ctx.textAlign = 'center'; ctx.fillText(i % 2 ? '♪' : '♫', x, y); }); },
      wpal: PAL(40, 25, { sat: 0.9, lm: 1.05, la: 0.08, metal: [40, 0.6, 1.05, 0.08], gold: [46, 1, 1.12] }),
      wfx(A, t) { if (A.handF) glowDot(A.handF[0] - 4, A.handF[1] + 2, 14, '255,160,60', 0.5); },
    },
  };
  // ===== Druidin =====
  const druidFace = (t, hair) => { headBall(0, 0, 8.3); face(0, 1, { t, seed: 5.5, eye: '#2f9a4f', brow: hair[1] });
    ctx.beginPath(); ctx.moveTo(-9, 4); ctx.quadraticCurveTo(-10.5, -10, 1, -10); ctx.quadraticCurveTo(9.5, -10, 9.5, -2); ctx.quadraticCurveTo(5, -6, 0, -5); ctx.quadraticCurveTo(-5, -4, -6, 6); ctx.closePath(); fillO(LG(-10, 6, hair[0], hair[1])); };
  const antler = (sx, dir, c, s = 1) => { ctx.save(); ctx.translate(sx, -8); ctx.scale(dir * s, s); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.lineCap = 'round'; const path = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2, -8, 6, -14); ctx.moveTo(2, -6); ctx.lineTo(7, -8); ctx.moveTo(4, -10); ctx.lineTo(1, -15); ctx.moveTo(5.4, -12.5); ctx.lineTo(9.5, -15); }; path(); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 1.6; path(); ctx.stroke(); ctx.restore(); };
  GSET.d = {
    herbst: {
      n: 'Herbstdruidin',
      kopf: { head(A, t) {
        antler(-4, -1, '#a8784a'); antler(3, 1, '#a8784a', 0.9);
        druidFace(t, ['#e8582a', '#8a2a14']);
        for (let i = 0; i < 6; i++) { const a = Math.PI * (1.05 + i * 0.18), x = Math.cos(a) * 9.4, y = -2 + Math.sin(a) * 8; leaf(x, y, 5, a + 1.2 + Math.sin(t * 2 + i) * 0.1, ['#e8582a', '#ffb547', '#c8301e'][i % 3]); }
      } },
      koerper: { pal: PAL(24, 40, { sat: 0.95, lm: 0.85, metal: [30, 0.2, 0.75, 0], gold: [40, 0.9, 1] }),
        over() { leaf(-1, -19, 6, 0.4, '#ffb547'); leaf(1, -19, 6, 2.7, '#e8582a'); ctx.beginPath(); ctx.arc(0, -19, 1.6, 0, 7); fillO('#8a5a2e'); } },
      beine: { pal: PAL(22, 38, { sat: 0.9, lm: 0.75, metal: [30, 0.2, 0.7, 0], gold: [40, 0.9, 1] }),
        fx(A, t) { rise(4, t, -0.22, 26, -80, -80, (x, y, p, i) => { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.5 + p * 7); ctx.globalAlpha *= Math.sin(p * Math.PI); leaf(0, 0, 5, 0, ['#e8582a', '#ffb547', '#c8301e', '#a8784a'][i % 4]); ctx.restore(); }); } },
    },
    weltenbaum: {
      n: 'Weltenbaum',
      kopf: { head(A, t) {
        glowDot(0, -18, 18, '150,255,140', 0.35 + 0.1 * Math.sin(t * 2));
        antler(-4, -1, '#d8ffd0', 1.25); antler(3, 1, '#d8ffd0', 1.15);
        for (const [x, y, c] of [[-10, -22, '#ff8ac8'], [-5, -26, '#ffffff'], [8, -24, '#ffd23f'], [11, -19, '#ff8ac8']]) { blossom(x, y, 1.5, c); glowDot(x, y, 4, '255,240,200', 0.5); }
        druidFace(t, ['#7ae86a', '#1f7a3a']);
        ctx.strokeStyle = '#5be37d'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.quadraticCurveTo(-4, -8, 8, -6); ctx.stroke(); leaf(-6, -6, 4, -2.4, '#5be37d'); leaf(2, -7.6, 4, -1.6, '#5be37d');
        for (let i = 0; i < 4; i++) { const a = t * 1.2 + i * 1.6, x = Math.cos(a) * 14, y = -12 + Math.sin(a * 1.3) * 6; glowDot(x, y, 3, '220,255,120', 0.8); }
      } },
      koerper: { pal: PAL(130, 100, { sat: 0.95, lm: 0.85, la: 0.04, metal: [120, 0.25, 0.8, 0.03], gold: [80, 0.9, 1.1] }),
        over(A, t) { ctx.strokeStyle = `rgba(150,255,140,${0.7 + 0.3 * Math.sin(t * 2)})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(-4, -14, 0, -18); ctx.quadraticCurveTo(4, -21, 1, -24); ctx.moveTo(0, -14); ctx.lineTo(4, -16); ctx.stroke(); glowDot(0, -16, 9, '150,255,140', 0.4); } },
      beine: { pal: PAL(28, 90, { sat: 0.8, lm: 0.7, metal: [30, 0.2, 0.7, 0], gold: [80, 0.9, 1.1] }),
        boot(kn, t, back) { if (back) return; ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.lineCap = 'round'; const R = () => { ctx.beginPath(); for (const [a, b, c] of [[-10, -2, -16], [-4, -1, -10], [5, -1, 12], [9, -2, 15]]) { ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, 1, c, 1); } }; R(); ctx.stroke(); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.6; R(); ctx.stroke(); } },
      aura(t) { auraPool(t, '130,255,120', 0.4); },
      fx(A, t) { for (let i = 0; i < 6; i++) { const a = t * 0.8 + i / 6 * Math.PI * 2, x = Math.cos(a) * 22, y = -34 + Math.sin(a) * 12; ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2); leaf(0, 0, 5, 0, i % 2 ? '#5be37d' : '#9be36b'); ctx.restore(); } },
      wpal: PAL(110, 90, { sat: 0.9, lm: 1, la: 0.08, metal: [110, 0.5, 1, 0.08], gold: [80, 1, 1.15] }),
      wfx(A, t) { if (A.handF) glowDot(A.handF[0], A.handF[1] - 22, 14, '150,255,140', 0.55); },
    },
  };
  // ===== Tüftlerin =====
  const tinkerFace = (t, A, hair = ['#ff8a4a', '#c44a22'], noTail) => {
    if (!noTail) { ctx.beginPath(); ctx.moveTo(-6, -5); ctx.quadraticCurveTo(-14 - (A.walk ? 2 : 0), -4, -13 - Math.sin(t * 3) * 1.5, 7); ctx.quadraticCurveTo(-9, 2, -5, 0); ctx.closePath(); fillO(LG(-6, 7, hair[0], hair[1])); }
    headBall(0, 0, 8.3); face(0, 1.5, { t, seed: 6.6, eye: '#3b6fd6', brow: hair[1] });
    ctx.beginPath(); ctx.moveTo(-8.6, 2); ctx.quadraticCurveTo(-10, -9.5, 0.5, -9.5); ctx.quadraticCurveTo(9, -9.5, 9, -3.5); ctx.quadraticCurveTo(4, -6, -1, -5); ctx.quadraticCurveTo(-5, -3, -6, 3); ctx.closePath(); fillO(LG(-10, 3, hair[0], hair[1])); };
  const cogwheel = (x, y, r, c, rot) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr2 = i % 2 ? r : r * 1.3; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.closePath(); fillO(c); ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 7); ctx.fillStyle = '#2a1a0a'; ctx.fill(); ctx.restore(); };
  GSET.e = {
    dampf: {
      n: 'Dampfpionierin',
      kopf: { head(A, t) {
        tinkerFace(t, A);
        rr(-7, -21, 14, 13, 1.5); fillO(LG(-21, -8, '#6a4a2e', '#3a2414')); ctx.beginPath(); ctx.ellipse(0, -8, 12, 2.8, 0, 0, 7); fillO('#4a3220'); rr(-7, -12, 14, 2.6, 0.8); fillO('#c9a64a');
        cogwheel(5, -16, 3, '#c9a64a', t * 1.5); cogwheel(-1, -14, 2, '#e0b85a', -t * 2);
        for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3) % 1; ctx.fillStyle = `rgba(230,230,240,${0.5 * (1 - p)})`; ctx.beginPath(); ctx.arc(-4 - p * 6, -22 - p * 10, 2 + p * 3, 0, 7); ctx.fill(); }
        rr(-7.5, -6, 17, 3, 1); fillO('#3a3a44'); for (const gx of [1.5, 7]) { ctx.beginPath(); ctx.arc(gx, -4.6, 3.2, 0, 7); fillO('#c9a64a'); ctx.fillStyle = `rgba(120,255,160,${0.7 + 0.2 * Math.sin(t * 2)})`; ctx.beginPath(); ctx.arc(gx, -4.6, 2.2, 0, 7); ctx.fill(); }
      } },
      koerper: { pal: PAL(32, 25, { sat: 0.8, lm: 0.8, metal: [38, 0.45, 0.85, 0.02], gold: [42, 0.9, 1] }),
        over(A, t) { cogwheel(0, -15, 3.6, '#c9a64a', t); },
        pads(t) { cogwheel(0, -2, 4.2, '#b8903a', t * 1.4); } },
      beine: { pal: PAL(30, 25, { sat: 0.7, lm: 0.7, metal: [38, 0.45, 0.8, 0], gold: [42, 0.9, 1] }),
        boot() { ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(2.5, -9); ctx.quadraticCurveTo(9, -6, 9, -0.6); ctx.lineTo(-4.5, 0); ctx.closePath(); fillO(LG(-9, 0, '#8a5a2e', '#3a2414')); ctx.fillStyle = '#c9a64a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-1.5, -7.5 + i * 2.5, 0.9, 0, 7); ctx.fill(); } } },
    },
    blitz: {
      n: 'Blitzschmiedin',
      kopf: { head(A, t) {
        tinkerFace(t, A, ['#e8f4ff', '#6a9ad8']);
        ctx.beginPath(); ctx.moveTo(-9.5, -1); ctx.quadraticCurveTo(-10, -12, 0, -12); ctx.quadraticCurveTo(10, -12, 10, -1); ctx.closePath(); fillO(LG(-12, -1, '#d8e4f4', '#5a6a8a'));
        rr(-10.5, -3, 21, 2.6, 1); fillO('#3a4a6a'); ctx.fillStyle = '#2a3a5a'; ctx.fillRect(-1, -20, 2, 9);
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, -13 - i * 2.4, 3.4 - i * 0.6, 1, 0, 0, 7); ctx.strokeStyle = '#c9a64a'; ctx.lineWidth = 1.1; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, -21, 2.6, 0, 7); fillO('#bff4ff'); glowDot(0, -21, 9, '120,220,255', 0.8);
        ctx.strokeStyle = `rgba(200,245,255,${0.6 + 0.4 * Math.sin(t * 13)})`; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 2; k++) { let x = 0, y = -21; ctx.moveTo(x, y); for (let i = 0; i < 4; i++) { x += (k ? 3 : -3) + Math.sin(t * 20 + i * 7 + k) * 1.5; y += 2 + Math.cos(t * 17 + i) * 1.5; ctx.lineTo(x, y); } } ctx.stroke();
        rr(1, -7, 9, 3, 1); fillO('#1b2a44'); glowDot(6, -5.5, 5, '120,220,255', 0.7); ctx.fillStyle = '#bff4ff'; ctx.fillRect(2.5, -6.3, 6, 1.4);
      } },
      koerper: { pal: PAL(210, 195, { sat: 0.85, lm: 0.85, la: 0.06, metal: [205, 0.35, 0.95, 0.06], gold: [195, 0.8, 1.15] }),
        over(A, t) { ctx.beginPath(); ctx.arc(0, -15, 4, 0, 7); fillO('#2a3a5a'); ctx.beginPath(); ctx.arc(0, -15, 2.4, 0, 7); ctx.fillStyle = `rgba(190,245,255,${0.7 + 0.3 * Math.sin(t * 9)})`; ctx.fill(); glowDot(0, -15, 10, '120,220,255', 0.6); } },
      beine: { pal: PAL(210, 200, { sat: 0.6, lm: 0.75, la: 0.04, metal: [205, 0.3, 0.9, 0.04], gold: [195, 0.8, 1.15] }),
        boot(kn, t, back) { rr(-5, -9, 13, 8.6, 2); fillO(LG(-9, 0, '#c8d4e4', '#4a5a7a')); ctx.fillStyle = '#2a3a5a'; ctx.fillRect(-6.5, -7, 2, 5); const f = 0.8 + 0.2 * Math.sin(t * 20 + (back ? 2 : 0)); ctx.beginPath(); ctx.moveTo(-6.5, -2); ctx.lineTo(-11 * f - 3, -4.5); ctx.lineTo(-6.5, -7); ctx.closePath(); ctx.fillStyle = 'rgba(120,220,255,.85)'; ctx.fill(); glowDot(-7, -4.5, 6, '120,220,255', 0.6); } },
      aura(t) { auraPool(t, '120,200,255', 0.4); },
      fx(A, t) { if ((t * 3) % 1 < 0.35) { ctx.strokeStyle = 'rgba(210,250,255,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); let x = Math.sin(t * 7) * 18, y = -70; ctx.moveTo(x, y); for (let i = 0; i < 5; i++) { x += Math.sin(t * 31 + i * 5) * 7; y += 9; ctx.lineTo(x, y); } ctx.stroke(); } },
      wpal: PAL(200, 190, { sat: 0.7, lm: 1, la: 0.12, metal: [200, 0.5, 1.05, 0.1], gold: [195, 0.9, 1.15] }),
      wfx(A, t) { if (A.handF) glowDot(A.handF[0] + 4, A.handF[1] - 6, 12, '120,220,255', 0.5 + 0.3 * Math.sin(t * 15)); },
    },
  };
  // ===== Runengolem (eigene Koordinaten: Kopf-Block um (0,-7), Körper vom Boden bis y = -70) =====
  GSET.o = {
    lava: {
      n: 'Lavagolem',
      kopf: { pal: PAL(15, 25, { sat: 1, lm: 0.6, metal: [15, 0.18, 0.5, 0.02], gold: [30, 1, 1.05] }),
        over(A, t) { for (let i = 0; i < 4; i++) fire(-7 + i * 5, -15, 8 + (i % 2) * 3, 2.4, t, '255,110,30', '255,230,120', i * 2); glowDot(1, -16, 12, '255,120,40', 0.5); } },
      koerper: { pal: PAL(15, 25, { sat: 1, lm: 0.55, metal: [15, 0.14, 0.45, 0.02], gold: [30, 1, 1.05] }),
        over(A, t) { const g = 0.6 + 0.4 * Math.sin(t * 2); ctx.strokeStyle = `rgba(255,130,40,${g})`; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-15, -30); ctx.lineTo(-8, -38); ctx.lineTo(-10, -48); ctx.moveTo(12, -28); ctx.lineTo(16, -40); ctx.lineTo(10, -50); ctx.moveTo(-4, -62); ctx.lineTo(4, -56); ctx.stroke(); glowDot(-9, -40, 10, '255,120,40', 0.35 * g); glowDot(14, -40, 10, '255,120,40', 0.35 * g); } },
      beine: { pal: PAL(15, 25, { sat: 1, lm: 0.5, metal: [15, 0.14, 0.4, 0.02], gold: [30, 1, 1.05] }),
        boot(kn, t, back) { glowDot(0, -2, 10, '255,120,40', 0.45); ctx.fillStyle = 'rgba(255,150,50,.85)'; for (let i = 0; i < 2; i++) { const p = (t * 0.5 + i / 2 + (back ? 0.3 : 0)) % 1; ctx.beginPath(); ctx.arc(-6 + i * 8, -1 + p * 2, 1.4 * (1 - p) + 0.4, 0, 7); ctx.fill(); } } },
    },
    kristall: {
      n: 'Kristallkoloss',
      kopf: { pal: PAL(280, 300, { sat: 0.9, lm: 0.85, la: 0.06, metal: [280, 0.45, 0.95, 0.05], gold: [300, 0.9, 1.1] }),
        over(A, t) { for (const [x, h, a] of [[-6, 10, -0.4], [-1, 15, -0.1], [4, 12, 0.2], [8, 7, 0.5]]) { ctx.save(); ctx.translate(x, -14); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-2.6, 2); ctx.lineTo(0, -h); ctx.lineTo(2.6, 2); ctx.closePath(); fillO(LG(-h, 2, '#ffe8ff', '#9a4ae0')); ctx.restore(); } glowDot(0, -20, 14, '210,140,255', 0.5 + 0.2 * Math.sin(t * 3)); } },
      koerper: { pal: PAL(280, 300, { sat: 0.85, lm: 0.8, la: 0.05, metal: [280, 0.4, 0.9, 0.04], gold: [300, 0.9, 1.1] }),
        over(A, t) { for (const [x, y, h, a] of [[-18, -64, 16, -0.5], [-12, -68, 12, -0.2], [16, -66, 15, 0.4], [21, -60, 10, 0.7], [-20, -40, 9, -1]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(0, -h); ctx.lineTo(3, 2); ctx.closePath(); fillO(LG(-h, 2, '#ffe8ff', '#8a3ad0')); ctx.restore(); } glowDot(2, -47, 22, '210,140,255', 0.4 + 0.15 * Math.sin(t * 2)); } },
      beine: { pal: PAL(280, 300, { sat: 0.8, lm: 0.75, la: 0.04, metal: [280, 0.4, 0.85, 0.03], gold: [300, 0.9, 1.1] }),
        boot(kn, t) { for (const [x, h] of [[-5, 5], [0, 7], [5, 4]]) { ctx.beginPath(); ctx.moveTo(x - 2, 0); ctx.lineTo(x, -h); ctx.lineTo(x + 2, 0); ctx.closePath(); fillO(LG(-h, 0, '#ffe8ff', '#9a4ae0')); } } },
      aura(t) { auraPool(t, '200,120,255', 0.45); ctx.save(); ctx.translate(0, -40); ctx.scale(1.6, 1.6); auraPool(t, '200,120,255', 0.15); ctx.restore(); },
      fx(A, t) { for (let i = 0; i < 5; i++) { const a = t * 0.9 + i / 5 * Math.PI * 2, x = Math.cos(a) * 34, y = -50 + Math.sin(a) * 12; ctx.save(); ctx.translate(x, y); ctx.rotate(t + i); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); ctx.closePath(); fillO(LG(-5, 5, '#ffe8ff', '#9a4ae0')); ctx.restore(); glowDot(x, y, 7, '210,140,255', 0.5); } },
    },
  };
  // Grundgerüst: berechnet Stellung (Laufen, Atmen, Angriff) und zeichnet in fester Reihenfolge
  function hum(x, h, t, walk, P) {
    const f = P.f || 11, ph = t * f + (P.seed || 0), sw = h ? h.swing : 0, p = sw > 0 ? 1 - sw : 1, atk = sw > 0, br = Math.sin(t * 2.1 + (P.seed || 0));
    shadow(x, P.sh || 15);
    ctx.save(); ctx.translate(x, GROUND);
    if (!h || h.alive) gearAura(t);
    if (h && !h.alive) { const fa = h.fall == null ? 1 : h.fall; ctx.rotate(-1.4 * fa); ctx.translate(-12 * fa, 8 * fa); }
    const L = P.leg || {}, tl = L.thigh || 11, sl = L.shin || 10.5;
    // Beine: Oberschenkel schwingt, Knie beugt sich beim Vorschwingen
    const legA = (q) => walk ? [Math.sin(q) * 0.62, Math.max(0, Math.cos(q)) * 0.95 + 0.08] : [q === ph ? 0.14 : -0.12, 0.06];
    const lf = legA(ph), lb = legA(ph + Math.PI);
    const footY = ([a, k]) => Math.cos(a) * tl + Math.cos(a - k) * sl;
    const hipY = -Math.max(footY(lf), footY(lb)) + (L.raise || 0);
    const lean = (P.lean || 0) + (walk ? 0.08 : 0) + (P.atkLean ? P.atkLean(p, atk) : 0);
    const A = { t, walk, sw, p, atk, br, ph, lean, hipY, x: 0, P, h, tl, sl };
    // Knie und Füße für Stiefel aus der Sammlung (bei Roben wie in robe())
    { const kn = (q, x0) => [x0 + Math.sin(q[0]) * tl, hipY + Math.cos(q[0]) * tl], ftp = (q, x0) => { const k0 = kn(q, x0); return [k0[0] + Math.sin(q[0] - q[1]) * sl, k0[1] + Math.cos(q[0] - q[1]) * sl]; };
      A.legs = P.robe ? [[lb, -2, 1], [lf, 2, 0]].map(([q, o, b]) => { const f = ftp(q, 0); return { back: b, kn: null, ft: [f[0] + o, f[1]] }; }) : [[lb, -2.6, 1], [lf, 2.6, 0]].map(([q, x0, b]) => ({ back: b, kn: kn(q, x0), ft: ftp(q, x0) })); }
    // Oberkörper-Punkte (gedreht um die Hüfte)
    const bodyLen = P.body || 24, bob = walk ? -Math.abs(Math.sin(ph)) * 1.2 : br * 0.5;
    const hip = [0, hipY], sh = [Math.sin(lean) * bodyLen, hipY - Math.cos(lean) * bodyLen + bob];
    A.hip = hip; A.sh = sh; A.head = [sh[0] + Math.sin(lean) * 10 + (P.headX || 1), sh[1] - (P.neck || 11)];
    // Arme: Grundhaltung + Pendeln beim Laufen; Angriff von P.arms
    const swing = walk ? Math.sin(ph) * 0.45 : br * 0.04;
    A.armB = { a: (P.armB ?? 0.15) - swing, e: P.elbB ?? 0.3 };
    A.armF = { a: (P.armF ?? 0.25) + swing * 0.7, e: P.elbF ?? 0.5 };
    if (P.arms) P.arms(A);
    const shB = [sh[0] - 4 + (P.shBx || 0), sh[1] + 2], shF = [sh[0] + 4 + (P.shFx || 0), sh[1] + 2];
    const arm = (s, ar, c, dir) => { const up = P.upper || 9, lo = P.lower || 8.5; const e = limb(s[0], s[1], ar.a, up, P.armW || 4.6, c, 'rgba(255,255,255,.25)'); const w = limb(e[0], e[1], ar.a + ar.e * dir, lo, (P.armW || 4.6) - 0.6, P.sleeve2 || c); return [e, w]; };
    A.shB = shB; A.shF = shF;
    // 1 hinten: Umhang, Rücken
    const gb = gearIt('koerper');
    tintSeg('koerper', () => { if (!gearCape(gb, A, t, walk) && P.cape) P.cape(A); if (P.behind) P.behind(A); });
    // 2 hinterer Arm mit Gegenstand
    ctx.save(); const [eB, hB] = tintSeg('koerper', () => arm(shB, A.armB, P.sleeveB || P.sleeve || '#888', 1)); A.handB = hB; A.angB = A.armB.a + A.armB.e;
    if (P.itemB) { ctx.save(); ctx.translate(hB[0], hB[1]); gearWeapon(() => P.itemB(A)); ctx.restore(); }
    if (!P.noHandB) hand(hB[0], hB[1], P.glove || P.skin || '#f1c9a5'); ctx.restore();
    if (gb && gb.pads) { ctx.save(); ctx.translate(shB[0], shB[1] + 2.5); ctx.rotate(lean); ctx.scale(0.85, 0.85); gearPad(gb, t, true); ctx.restore(); }
    // 3 Beine
    const leg = (q, back) => { const [a, k] = q, x0 = back ? -2.6 : 2.6; const kn = limb(x0, hipY, a, tl, L.w || 5.4, back ? (L.c2 || L.c || '#555') : (L.c || '#666'), back ? null : 'rgba(255,255,255,.2)'); const ft = limb(kn[0], kn[1], a - k, sl, (L.w || 5.4) - 0.8, back ? (L.s2 || L.s || L.c2 || '#444') : (L.s || L.c || '#555')); if (!P.noBoots) boot(ft[0], Math.min(0, ft[1]), back ? (L.b2 || L.b || '#3a2a22') : (L.b || '#4a3426'), L.cuff, L.bl, L.bh); return ft; };
    tintSeg('beine', () => { if (!P.robe) { leg(lb, true); leg(lf, false); } else P.robe(A, lf, lb, leg); });
    { const gl = gearIt('beine'); if (gl) for (const L2 of A.legs) gearBoot(gl, L2.ft, L2.kn, t, L2.back, walk); }
    // 4 Oberkörper
    ctx.save(); ctx.translate(hip[0], hip[1]); ctx.rotate(lean); ctx.translate(0, bob); tintSeg('koerper', () => P.torso(A)); if (gb) gearChest(gb, t, A); ctx.restore();
    // 5 Kopf
    ctx.save(); ctx.translate(A.head[0], A.head[1]); ctx.rotate(lean * 0.5 + (P.headTilt ? P.headTilt(A) : 0)); { const gh = gearIt('kopf'); if (gh && gh.head) gh.head(A, t, P); else { tintSeg('kopf', () => P.headFn(A)); if (gh && gh.over) gh.over(A, t); } } ctx.restore();
    // 6 vorderer Arm mit Waffe
    const [eF, hF] = tintSeg('koerper', () => arm(shF, A.armF, P.sleeve || '#999', 1)); A.handF = hF; A.angF = A.armF.a + A.armF.e;
    if (P.itemF) { ctx.save(); ctx.translate(hF[0], hF[1]); gearWeapon(() => P.itemF(A)); ctx.restore(); }
    if (!P.noHandF) hand(hF[0], hF[1], P.glove || P.skin || '#f1c9a5');
    if (P.after) tintSeg('koerper', () => P.after(A));
    if (gb && gb.pads) { ctx.save(); ctx.translate(shF[0], shF[1] + 2.5); ctx.rotate(lean); ctx.scale(0.85, 0.85); gearPad(gb, t, false); ctx.restore(); }
    if (!h || h.alive) { const fs = fullSet(); if (fs && fs.wfx) { ctx.save(); fs.wfx(A, t); ctx.restore(); } gearFx(A, t); }
    ctx.restore();
    return A;
  }
  // Robe statt Beinen: Füße schauen unten raus, der Saum schwingt mit den Schritten
  function robe(A, lf, lb, c1, c2, trim, o = {}) {
    const fx = q => Math.sin(q[0]) * A.tl + Math.sin(q[0] - q[1]) * A.sl, fyv = q => Math.cos(q[0]) * A.tl + Math.cos(q[0] - q[1]) * A.sl;
    const xf = fx(lf) + 2, xb = fx(lb) - 2, top = A.hipY - (o.top || 6), wTop = o.wTop || 8, wB = o.wB || 13;
    for (const [xx, q, b] of [[xb, lb, 1], [xf, lf, 0]]) boot(xx, Math.min(0, A.hipY + fyv(q)), b ? (o.b2 || '#2a1f2e') : (o.b || '#3a2a3e'), null, 6.5, 3.6);
    const sway = (xf + xb) * 0.25, hem = -1.2;
    ctx.beginPath(); ctx.moveTo(-wTop + Math.sin(A.lean) * 2, top); ctx.lineTo(wTop + Math.sin(A.lean) * 2, top);
    ctx.quadraticCurveTo(wB * 0.9 + sway, hem - 10, wB + sway * 1.4, hem);
    for (let i = 1; i <= 5; i++) { const q = i / 5; ctx.quadraticCurveTo(wB + sway * 1.4 - (q - 0.1) * (wB * 2) - 1, hem + (i % 2 ? 1.6 : -0.6), wB + sway * 1.4 - q * wB * 2, hem); }
    ctx.quadraticCurveTo(-wB * 0.9 + sway, hem - 10, -wTop + Math.sin(A.lean) * 2, top); ctx.closePath(); fillO(LG(top, 0, c1, c2));
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1, top + 3); ctx.quadraticCurveTo(2 + sway, -8, 2 + sway * 1.3, -1); ctx.stroke();
    if (trim) { ctx.strokeStyle = trim; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(wB + sway * 1.4, hem - 1); ctx.lineTo(-wB + sway * 1.4, hem - 1); ctx.stroke(); }
  }
  // Schlag-Kurve: Ausholen (bis q0), Zuschlagen (bis q1), Zurückfedern
  function strike(p, from, hit, rest, q0 = 0.12, q1 = 0.42, rest2 = rest) { return p < q0 ? rest + (from - rest) * eOut(p / q0) : p < q1 ? from + (hit - from) * eOut((p - q0) / (q1 - q0)) : hit + (rest2 - hit) * eOut((p - q1) / (1 - q1)); }
  // Leuchtender Schwungbogen der Waffe, von Armwinkel aFrom bis aTo (gleiche Winkel wie limb)
  function smear(cx, cy, r, aFrom, aTo, rgb, al) {
    if (al <= 0.02 || Math.abs(aTo - aFrom) < 0.05) return;
    const t0 = Math.PI / 2 - aFrom, t1 = Math.PI / 2 - aTo, ccw = t1 < t0;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(${rgb},${al * (0.55 - i * 0.15)})`; ctx.lineWidth = 7 - i * 2.2; ctx.beginPath(); ctx.arc(cx, cy, r - i * 2, t0, t1, ccw); ctx.stroke(); }
    ctx.strokeStyle = `rgba(255,255,255,${al * 0.7})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, r + 1, t0 + (t1 - t0) * 0.35, t1, ccw); ctx.stroke(); ctx.restore();
  }
  // Klinge entlang +y (vorher mit ctx.rotate(-a) ausrichten)
  function bladeY(len, w, c1, c2, guard = '#ffd23f', grip = '#6b4a2e', pommel = '#3b7ad6') {
    ctx.fillStyle = grip; rr(-1.4, -5, 2.8, 7, 1.2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -6, 2.2, 0, 7); fillO(pommel);
    rr(-5.5, 1.4, 11, 2.8, 1.2); fillO(guard);
    ctx.beginPath(); ctx.moveTo(-w / 2, 4); ctx.lineTo(w / 2, 4); ctx.lineTo(w / 2 - 0.4, len - 4); ctx.lineTo(0, len + 1); ctx.lineTo(-w / 2 + 0.4, len - 4); ctx.closePath(); fillO(LG(4, len, c1, c2));
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-w / 4, 6); ctx.lineTo(-w / 4, len - 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,100,120,.5)'; ctx.beginPath(); ctx.moveTo(0.4, 6); ctx.lineTo(0.4, len - 3); ctx.stroke();
  }
  function kite(w, hgt, c1, c2, rim = '#ffd23f', cross = '#ffd23f') {
    ctx.beginPath(); ctx.moveTo(-w / 2, -hgt * 0.42); ctx.quadraticCurveTo(0, -hgt * 0.56, w / 2, -hgt * 0.42); ctx.lineTo(w / 2, 0); ctx.quadraticCurveTo(w * 0.42, hgt * 0.34, 0, hgt * 0.58); ctx.quadraticCurveTo(-w * 0.42, hgt * 0.34, -w / 2, 0); ctx.closePath();
    fillO(LG(-hgt * 0.5, hgt * 0.6, c1, c2)); ctx.strokeStyle = rim; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = cross; ctx.fillRect(-1.2, -hgt * 0.34, 2.4, hgt * 0.78); ctx.fillRect(-w * 0.32, -hgt * 0.12, w * 0.64, 2.4);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(-w * 0.4, -hgt * 0.38); ctx.lineTo(-w * 0.12, -hgt * 0.42); ctx.lineTo(-w * 0.38, 0); ctx.closePath(); ctx.fill();
  }
  const STEEL = ['#f4f7fb', '#9aa4b4'], STEEL2 = ['#c9d0dc', '#6f7a8c'];
  function knight(x, h, t, walk) {
    const spin = run && run.fx && run.fx.wirbel > 0;
    hum(x, h, t, walk, {
      f: 12, sh: 16, seed: 0.3,
      leg: { c: '#dfe5ee', c2: '#9ea8b8', s: '#cfd6e2', s2: '#8d97a8', b: '#8a94a6', b2: '#6c7588', w: 5.8, cuff: '#ffd23f' },
      sleeve: '#c4ccd8', sleeveB: '#8f99aa', glove: '#7a8496', armW: 5,
      atkLean: (p, atk) => atk ? strike(p, -0.12, 0.18, 0) : 0,
      arms(A) {
        if (spin) { A.armF.a = t * 30; A.armF.e = 0; return; }
        // Überkopf-Hieb: Arm hoch nach hinten, über oben nach vorne (Winkel laufen über -π hinaus)
        if (A.atk) { A.armF.a = strike(A.p, -2.5, -4.85, 0.55, 0.12, 0.42, 0.55 - Math.PI * 2); A.armF.e = strike(A.p, 0.4, -0.05, 0.7); }
        else { A.armF.a = 0.55 + A.br * 0.03; A.armF.e = 0.7; }
        A.armB.a = -0.75; A.armB.e = 1.0;
      },
      cape(A) { cloth(A.sh[0] - 3, A.sh[1] + 1, 40, 18, '#d6394a', '#6e1520', t, walk, { seed: 1 }); },
      itemB(A) { ctx.translate(-2, 2); ctx.rotate(-0.08); kite(16, 24, '#4a8ae6', '#1d3f80'); },
      torso(A) {
        // Kettenhemd-Rock
        ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(8, -4); ctx.lineTo(9, 4); ctx.lineTo(-9, 4); ctx.closePath(); fillO(LG(-4, 4, '#a8b0bc', '#6a7282'));
        ctx.fillStyle = 'rgba(40,46,60,.35)'; for (let i = 0; i < 6; i++) ctx.fillRect(-7.5 + i * 2.8, -2, 1.2, 5);
        // Brustpanzer
        ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.quadraticCurveTo(10, -14, 9, -24); ctx.quadraticCurveTo(0, -27, -9, -24); ctx.quadraticCurveTo(-10, -14, -7, -2); ctx.closePath(); fillO(LG(-26, -2, STEEL[0], STEEL[1]));
        // Wappenrock mit Kreuz
        ctx.beginPath(); ctx.moveTo(-5, -23); ctx.lineTo(5, -23); ctx.lineTo(5.5, 5); ctx.lineTo(0, 8); ctx.lineTo(-5.5, 5); ctx.closePath(); fillO(LG(-23, 8, '#e0404f', '#8a1c28'));
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1, -19, 2, 14); ctx.fillRect(-4, -15, 8, 2);
        ctx.strokeStyle = 'rgba(255,210,63,.85)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-4.6, -22); ctx.lineTo(-5, 4.5); ctx.moveTo(4.6, -22); ctx.lineTo(5, 4.5); ctx.stroke();
        // Gürtel
        rr(-8.5, -5, 17, 3.2, 1); fillO('#4a3220'); rr(-2.2, -5.6, 4.4, 4.4, 1); fillO('#ffd23f');
        // Halsberge
        ctx.beginPath(); ctx.ellipse(1, -24.5, 6.5, 2.6, 0, 0, 7); fillO(LG(-27, -22, STEEL[0], STEEL2[1]));
      },
      headFn(A) {
        // Helmbusch weht nach hinten
        const wv = Math.sin(t * 6) * 1.6 + (walk ? 3 : 0);
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-1, -9 + i); ctx.quadraticCurveTo(-12 - wv - i * 2, -19 + i * 3 + Math.sin(t * 6 + i) * 1.5, -20 - wv * 1.5 - i, -5 + i * 2); ctx.quadraticCurveTo(-11 - wv, -10 + i * 2, -1, -5 + i); ctx.closePath(); fillO(['#ff6b6b', '#e5484d', '#b8323a'][i]); }
        // Topfhelm
        ctx.beginPath(); ctx.moveTo(-8.5, 7); ctx.lineTo(-9.5, -3); ctx.quadraticCurveTo(-9, -11.5, 0, -11.5); ctx.quadraticCurveTo(9.5, -11.5, 10, -2); ctx.lineTo(9.5, 7); ctx.quadraticCurveTo(0, 9, -8.5, 7); ctx.closePath(); fillO(LG(-11, 8, STEEL[0], STEEL[1]));
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1.2, -11, 2.4, 8);
        rr(0, -3.6, 10.4, 3.4, 1.4); fillO('#1b1726');
        glowDot(7, -2, 4, '120,200,255', 0.5 + 0.25 * Math.sin(t * 3)); ctx.fillStyle = `rgba(150,215,255,${0.6 + 0.3 * Math.sin(t * 3)})`; ctx.fillRect(5, -2.6, 4, 1.4);
        ctx.fillStyle = '#5b5f6b'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(4.5 + i * 2.2, 2 + j * 2, 1, 1);
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-4, -7.5, 3.2, 1.4, -0.5, 0, 7); ctx.fill();
        if (S.asc > 0 && !(cine && cine.kind === 'asc')) crownIcon(0, -17, 0.62, 0);
      },
      itemF(A) {
        const a = spin ? t * 30 : A.atk ? A.angF + 0.15 : 2.45;
        ctx.rotate(-a); bladeY(30, 4.6, '#ffffff', '#aab4c4');
      },
      after(A) {
        // Schulterstück vorne
        ctx.save(); ctx.translate(A.shF[0], A.shF[1] + 0.5); ctx.rotate(A.lean);
        ctx.beginPath(); ctx.ellipse(0, 0, 6.2, 4.6, -0.25, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); fillO(LG(-4, 4, STEEL[0], STEEL[1])); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-5, 2.2, 9.5, 1.2);
        ctx.restore();
        if (A.atk && !spin && A.p > 0.12 && A.p < 0.6) smear(A.shF[0], A.shF[1], 34, -2.4, Math.max(-4.9, A.armF.a), '255,236,170', 1 - (A.p - 0.12) / 0.48);
        if (spin) smear(A.shF[0], A.shF[1], 34, t * 30 - 2.6, t * 30, '255,236,170', 0.85);
      },
    });
  }










  function wolf(x, t, walk, alpha = 1) {
    // Wolf mit Galopp: Beine mit Gelenken, Schwanz wedelt, Ohren zucken
    const ph = t * 13 + x * 0.7, run2 = walk ? 1 : 0, bob = walk ? Math.abs(Math.sin(ph)) * 2.5 : Math.sin(t * 3 + x) * 0.6, br = Math.sin(t * 2.4 + x);
    const pa0 = ctx.globalAlpha; ctx.globalAlpha = pa0 * alpha; shadow(x, 15);
    ctx.save(); ctx.translate(x, GROUND - bob);
    const leg = (hx, hy, q, back, front) => { const a1 = run2 ? Math.sin(q) * 0.7 : (front ? 0.1 : -0.1), k1 = run2 ? (front ? -1 : 1) * Math.max(0, Math.cos(q)) * 0.9 : 0;
      const c = back ? '#5c626e' : '#8a909c'; const kn = limb(hx, hy, a1, 7, 4, c); const ft = limb(kn[0], kn[1], a1 + k1, 6.5, 3.3, back ? '#4e5460' : '#7a808c');
      ctx.beginPath(); ctx.ellipse(ft[0] + 1, Math.min(0, ft[1]) - 1, 2.6, 1.6, 0, 0, 7); fillO(back ? '#3e434e' : '#5c626e'); };
    leg(-9, -13, ph + Math.PI * 0.9, 1, 0); leg(9, -14, ph + Math.PI * 0.2, 1, 1);
    // Schwanz
    const wag = Math.sin(t * (walk ? 10 : 6) + x) * 0.35;
    ctx.save(); ctx.translate(-13, -17); ctx.rotate(-0.6 + wag - run2 * 0.3); ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.quadraticCurveTo(-10, -6, -16, -2); ctx.quadraticCurveTo(-11, 0, -12, 3.5); ctx.quadraticCurveTo(-6, 1.5, 0, 2.5); ctx.closePath(); fillO(LG(-6, 4, '#d0d6e0', '#7e8490')); ctx.restore();
    // Körper mit Fellzacken
    ctx.beginPath(); ctx.moveTo(-14, -14); ctx.quadraticCurveTo(-15, -24, -4, -24); ctx.quadraticCurveTo(8, -26, 13, -22); ctx.quadraticCurveTo(16, -15, 11, -10); ctx.quadraticCurveTo(0, -8, -10, -10); ctx.closePath(); fillO(LG(-26, -8, '#c4cad6', '#6a707c'));
    ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.ellipse(4, -11.5, 8, 2.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7e8490'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 3.6, -23.5); ctx.lineTo(-6.5 + i * 3.6, -27 - (i % 2)); ctx.lineTo(-5 + i * 3.6, -23.5); ctx.fill(); }
    leg(-8, -12, ph, 0, 0); leg(10, -13, ph + Math.PI * 1.2, 0, 1);
    // Kopf
    ctx.save(); ctx.translate(13, -22); ctx.rotate(run2 ? 0.12 : br * 0.04);
    ctx.beginPath(); ctx.moveTo(-4, -5); ctx.quadraticCurveTo(3, -9, 8, -6); ctx.lineTo(16, -3.5); ctx.quadraticCurveTo(17, 0, 15, 1.5); ctx.lineTo(8, 3); ctx.quadraticCurveTo(0, 5, -4, 2); ctx.closePath(); fillO(LG(-9, 4, '#d0d6e0', '#7e8490'));
    ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(7, 1.6); ctx.lineTo(15, 0.8); ctx.lineTo(9, 3.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(16, -2.8, 1.3, 0, 7); ctx.fill();
    const tw = Math.sin(t * 7 + x) > 0.92 ? 0.3 : 0;
    for (const [ex, ec] of [[1, '#8a909c'], [4.5, '#9aa0ac']]) { ctx.save(); ctx.translate(ex, -6); ctx.rotate(-0.25 + tw); ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.lineTo(0, -7.5); ctx.lineTo(2.4, 0); ctx.closePath(); fillO(ec); ctx.fillStyle = '#d9a0a0'; ctx.beginPath(); ctx.moveTo(-1, -0.6); ctx.lineTo(0, -5); ctx.lineTo(1, -0.6); ctx.fill(); ctx.restore(); }
    glowDot(8.5, -3, 4, '255,210,63', 0.7); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(8.5, -3, 1.5, 1.1, -0.2, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.fillRect(8.6, -3.6, 0.8, 1.2);
    if (walk && Math.sin(t * 5 + x) > 0.4) { ctx.fillStyle = '#e88a9a'; ctx.beginPath(); ctx.ellipse(12, 3.8, 1.6, 2.2, 0.3, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.restore(); ctx.globalAlpha = pa0;
  }









  // Gefallene Helden: kippen um, Staub fliegt, die Seele steigt auf – danach bleiben sie liegen und fallen zurück
  function drawFallen(R, k, t) {
    const h = R.h[k], since = R.time - (h.deadAt == null ? R.time - 9 : h.deadAt);
    const x = R.pos[k] - Math.max(0, R.scroll - (h.deadScroll == null ? R.scroll : h.deadScroll));
    if (x < -70) return;
    h.hurtT = 0;
    const p = Math.min(1, since / 0.5);
    h.fall = p < 1 ? 1 - Math.pow(1 - p, 3) * (1 - p * 0.15) : 1;
    if (since < 0.12) { ctx.globalAlpha = 1; DRAW[k](x, h, t, false); const fa = 0.7 * (1 - since / 0.12); ctx.fillStyle = RG(x, GROUND - 40, 46, `rgba(255,255,255,${fa})`, 'rgba(255,255,255,0)'); ctx.beginPath(); ctx.arc(x, GROUND - 40, 46, 0, 7); ctx.fill(); }
    else { ctx.globalAlpha = since < 0.5 ? 1 : Math.max(0.55, 1 - (since - 0.5) * 0.25); DRAW[k](x, h, t, false); }
    ctx.globalAlpha = 1;
    if (since > 0.45 && since < 1.1) { const q = (since - 0.45) / 0.65; for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; ctx.fillStyle = `rgba(200,180,150,${0.55 * (1 - q)})`; ctx.beginPath(); ctx.arc(x - 18 + Math.cos(a) * 26 * q, GROUND - 2 + Math.sin(a) * 10 * q, 3 + q * 4, 0, 7); ctx.fill(); } }
    if (since > 0.3 && since < 2.4) {
      const q = (since - 0.3) / 2.1, sy = GROUND - 30 - q * 90, sx = x - 10 + Math.sin(q * 9) * 5, a = Math.sin(q * Math.PI) * 0.75;
      ctx.fillStyle = RG(sx, sy, 16, `rgba(220,235,255,${a * 0.6})`, 'rgba(220,235,255,0)'); ctx.beginPath(); ctx.arc(sx, sy, 16, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(240,248,255,${a})`; ctx.beginPath(); ctx.arc(sx, sy - 4, 6, Math.PI, 0); ctx.lineTo(sx + 6, sy + 6); ctx.quadraticCurveTo(sx + 3, sy + 3, sx, sy + 7); ctx.quadraticCurveTo(sx - 3, sy + 3, sx - 6, sy + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(40,40,60,${a})`; ctx.fillRect(sx - 3, sy - 5, 1.6, 2); ctx.fillRect(sx + 1.4, sy - 5, 1.6, 2);
    }
  }
  const SHOT_STYLE = { schleim: ['blob', '190,120,255'], goblin: ['stone', '154,163,173'], skelett: ['arrow', '232,226,208'], daemon: ['fire', '255,120,40'], golem: ['ice', '160,225,255'],
    frosch: ['blob', '150,230,110'], dorn: ['seed', '201,164,106'], fleder: ['ring', '200,140,255'], skorpion: ['blob', '184,255,106'], spinne: ['web', '240,248,255'],
    astral: ['star', '255,230,140'], pilz: ['spore', '210,180,255'], geist: ['orb', '120,255,220'], drache: ['fire', '255,150,60'], sturm: ['bolt', '255,248,180'] };
  Object.assign(SHOT_STYLE, { armbrust: ['arrow', '232,226,208'], irrlicht: ['orb', '107,224,184'], maske: ['ring', '255,138,200'], dornfalter: ['seed', '180,255,120'], kanonier: ['stone', '60,60,70'], kristallwisp: ['ice', '70,212,238'], meuchler: ['arrow', '232,226,208'], ghul: ['blob', '160,200,140'], marionette: ['ring', '255,138,200'], faulwurz: ['spore', '200,120,255'], blechling: ['stone', '154,163,173'], grubenwicht: ['stone', '154,163,173'] });  // ---------- Wächter: schwerer Turmschild vorne, Streitkolben hinten ----------
  function guard(x, h, t, walk) {
    const wall = run && run.fx && (run.fx.w_wall > 0 || run.hautT > 0);
    hum(x, h, t, walk, {
      f: 10, sh: 20, seed: 1.1, body: 25, lean: -0.02,
      leg: { c: '#c9d2e0', c2: '#8a96aa', s: '#b4bfcf', s2: '#77839a', b: '#4a5060', b2: '#3a3f4c', w: 6.6, cuff: '#c9a64a', thigh: 11.5, shin: 10.5 },
      sleeve: '#b8c3d4', sleeveB: '#7f8ba0', glove: '#5b4632', armW: 5.6,
      atkLean: (p, atk) => atk ? strike(p, -0.1, 0.14, 0) : 0,
      arms(A) {
        A.armF.a = 1.05 + A.br * 0.02 + (A.atk ? strike(A.p, 0, -0.2, 0) : 0); A.armF.e = 0.2;
        if (A.atk) { A.armB.a = strike(A.p, -2.7, -4.7, -0.5, 0.15, 0.45, -0.5 - Math.PI * 2); A.armB.e = 0.2; }
        else { A.armB.a = -0.5 + (walk ? Math.sin(A.ph) * 0.2 : 0); A.armB.e = 0.5; }
      },
      cape(A) { cloth(A.sh[0] - 4, A.sh[1] + 2, 30, 14, '#5a7ab8', '#22345e', t, walk, { seed: 2, rag: 3 }); },
      itemB(A) {
        ctx.rotate(-A.angB);
        ctx.fillStyle = '#5a3d25'; rr(-1.6, -3, 3.2, 17, 1.2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.save(); ctx.translate(0, 16);
        ctx.fillStyle = '#c9cdd6'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.3) * 4, Math.sin(a - 0.3) * 4); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(Math.cos(a + 0.3) * 4, Math.sin(a + 0.3) * 4); ctx.closePath(); fillO('#d6dbe3'); }
        ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, 7); fillO(RG(-2, -2, 7, '#f2f5f9', '#7d8696'));
        ctx.restore();
      },
      torso(A) {
        // Schuppenpanzer
        ctx.beginPath(); ctx.moveTo(-9.5, 4); ctx.lineTo(9.5, 4); ctx.quadraticCurveTo(12, -12, 11, -25); ctx.quadraticCurveTo(0, -29, -11, -25); ctx.quadraticCurveTo(-12, -12, -9.5, 4); ctx.closePath(); fillO(LG(-27, 4, '#dfe7f2', '#7b889e'));
        ctx.strokeStyle = 'rgba(60,72,95,.45)'; ctx.lineWidth = 1; for (let r = 0; r < 5; r++) { ctx.beginPath(); for (let i = 0; i < 5; i++) { const x0 = -9 + i * 4.4 + (r % 2) * 2.2, y0 = -21 + r * 4.6; ctx.moveTo(x0 - 2.2, y0); ctx.quadraticCurveTo(x0, y0 + 3, x0 + 2.2, y0); } ctx.stroke(); }
        rr(-10, -4, 20, 3.8, 1.2); fillO('#4a3220'); rr(-2.6, -4.6, 5.2, 5, 1.2); fillO('#c9a64a');
        // Fellkragen
        ctx.fillStyle = '#8a6a4a'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-10 + i * 3.6, -25 + Math.sin(i * 2) * 1, 3.8, 0, 7); fillO(i % 2 ? '#9a7a56' : '#7a5a3a'); }
      },
      headFn(A) {
        // Eimerhelm mit Hörnern
        for (const [sx, s2] of [[-1, 1], [1, -1]]) { ctx.beginPath(); ctx.moveTo(sx * 8, -5); ctx.quadraticCurveTo(sx * 15, -8, sx * 14, -17); ctx.quadraticCurveTo(sx * 11, -10, sx * 7, -9); ctx.closePath(); fillO(LG(-17, -5, '#fff4dc', '#bfa77a')); }
        rr(-10, -12, 20, 21, 5); fillO(LG(-12, 9, '#f2f6fb', '#8995a8'));
        ctx.fillStyle = '#c9a64a'; ctx.fillRect(-10, -3, 20, 2.2); ctx.fillRect(-1.3, -13, 2.6, 9);
        ctx.fillStyle = '#1b1726'; ctx.fillRect(1, -7.5, 9.5, 3); ctx.fillRect(5, -7.5, 3, 10);
        glowDot(7.5, -6, 4, '120,180,255', 0.45 + 0.3 * Math.sin(t * 2)); ctx.fillStyle = `rgba(140,200,255,${0.55 + 0.3 * Math.sin(t * 2)})`; ctx.fillRect(6.5, -7, 3.6, 1.6);
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-5, -9, 3, 1.3, -0.4, 0, 7); ctx.fill();
        ctx.fillStyle = '#c9cdd6'; for (const [bx, by] of [[-7.5, 5], [-3, 6], [7, 5]]) { ctx.beginPath(); ctx.arc(bx, by, 0.9, 0, 7); ctx.fill(); }
      },
      itemF(A) {
        ctx.rotate(-0.06 + (A.atk ? strike(A.p, 0, 0.12, 0) : 0));
        ctx.translate(3, -2);
        rr(-9.5, -23, 19, 46, 5); fillO(LG(-23, 23, '#4a8ae6', '#1a3a78'));
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; rr(-7.5, -21, 15, 42, 4); ctx.stroke();
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1.6, -15, 3.2, 30); ctx.fillRect(-6, -5, 12, 3.2);
        ctx.beginPath(); ctx.arc(0, -3.4, 4, 0, 7); fillO('#ffd23f'); ctx.fillStyle = '#1d3f80'; ctx.beginPath(); ctx.arc(0, -3.4, 2, 0, 7); ctx.fill();
        ctx.fillStyle = '#c9cdd6'; for (const [bx, by] of [[-6, -19], [6, -19], [-6, 18], [6, 18]]) { ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(-7, -20); ctx.lineTo(-2, -20); ctx.lineTo(-7, 2); ctx.fill();
        if (wall) { glowDot(0, 0, 30, '127,178,255', 0.5); ctx.strokeStyle = `rgba(170,210,255,${0.6 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 2; rr(-12, -26, 24, 52, 7); ctx.stroke(); }
      },
      noHandF: true,
      after(A) { if (A.atk && A.p > 0.15 && A.p < 0.6) smear(A.shB[0], A.shB[1], 28, -2.6, Math.max(-4.7, A.armB.a), '200,220,255', 1 - (A.p - 0.15) / 0.45);
        ctx.save(); ctx.translate(A.shB[0] - 1, A.shB[1]); ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 5.2, -0.2, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); fillO(LG(-5, 4, '#eef3fa', '#8e9aae')); ctx.restore(); },
    });
  }

  // ---------- Schützin: Langbogen, zieht die Sehne bis zur Wange ----------
  function archer(x, h, t, walk) {
    const wind = Math.sin(t * 2.3);
    hum(x, h, t, walk, {
      f: 13, sh: 13, seed: 2.2,
      leg: { c: '#5a4630', c2: '#3e301f', s: '#7a5232', s2: '#5a3a24', b: '#6b4228', b2: '#4a2e1c', w: 5, cuff: '#a67a48' },
      sleeve: '#2f6b34', sleeveB: '#24552a', glove: '#f1c9a5', armW: 4.2,
      arms(A) {
        // vorderer Arm hält den Bogen nach vorne, hinterer zieht
        const draw = A.atk ? (A.p < 0.55 ? eOut(A.p / 0.55) : 0) : 0, rel = A.atk && A.p >= 0.55 ? 1 - eOut((A.p - 0.55) / 0.45) : 0;
        A.pull = draw * 8; A.rel = rel;
        A.armF.a = 1.35 + (walk ? Math.sin(A.ph) * 0.06 : 0); A.armF.e = 0.12;
        A.armB.a = 1.1 - draw * 0.25 + rel * 0.4; A.armB.e = -1.9 + draw * -0.4;
      },
      cape(A) { cloth(A.sh[0] - 3, A.sh[1] + 1, 30, 14, '#3e7a3a', '#1a3f24', t, walk, { seed: 3, rag: 5 }); },
      behind(A) {
        // Köcher mit Pfeilen
        ctx.save(); ctx.translate(A.sh[0] - 7, A.sh[1] + 2); ctx.rotate(-0.45 + A.lean);
        rr(-4, -2, 8, 20, 2.5); fillO(LG(0, 20, '#8a5e36', '#4e331c')); ctx.fillStyle = '#c9a64a'; ctx.fillRect(-4, 1, 8, 1.5); ctx.fillRect(-4, 14, 8, 1.5);
        for (let i = 0; i < 4; i++) { const fx = -2.8 + i * 1.9; ctx.fillStyle = '#d8dce4'; ctx.fillRect(fx, -6, 0.9, 5); ctx.fillStyle = ['#e5484d', '#f2f2f2', '#7ee08a', '#ffd23f'][i]; ctx.beginPath(); ctx.moveTo(fx - 0.9, -10 - (i % 2)); ctx.lineTo(fx + 1.8, -9); ctx.lineTo(fx + 0.4, -4); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        // Zopf hinten
        ctx.save(); ctx.translate(A.head[0] - 6, A.head[1] + 1);
        for (let i = 0; i < 4; i++) { const bx = -3 - i * 1.3 - wind * i * 0.4 - (walk ? i * 0.6 : 0), by = 3 + i * 4; ctx.beginPath(); ctx.ellipse(bx, by, 3.2 - i * 0.25, 2.6, 0.4, 0, 7); fillO(i % 2 ? '#e6b448' : '#d9a83a'); }
        ctx.fillStyle = '#e5484d'; ctx.fillRect(-9.5 - wind * 1.3, 17, 4, 2); ctx.restore();
      },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(8, 5); ctx.lineTo(8.5, -2); ctx.quadraticCurveTo(9.5, -14, 8, -24); ctx.quadraticCurveTo(0, -26, -8, -24); ctx.quadraticCurveTo(-9.5, -14, -8.5, -2); ctx.closePath(); fillO(LG(-25, 5, '#86d05f', '#2f6b34'));
        // Lederweste mit Schnürung
        ctx.beginPath(); ctx.moveTo(-7, -21); ctx.lineTo(-1, -24); ctx.lineTo(1.5, -17); ctx.lineTo(4, -24); ctx.lineTo(7.5, -21); ctx.lineTo(7.5, -3); ctx.lineTo(-7.5, -3); ctx.closePath(); fillO(LG(-24, -3, '#9a6a3e', '#5a3a20'));
        ctx.strokeStyle = '#e8d9a8'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-0.5, -18 + i * 3.6); ctx.lineTo(3, -16.4 + i * 3.6); ctx.moveTo(3, -18 + i * 3.6); ctx.lineTo(-0.5, -16.4 + i * 3.6); } ctx.stroke();
        rr(-8.5, -4.4, 17, 3.4, 1); fillO('#3a2616'); rr(-2.3, -5, 4.6, 4.6, 1); fillO('#ffd23f');
        // Halstuch
        ctx.beginPath(); ctx.moveTo(-6, -25); ctx.quadraticCurveTo(1, -20, 7, -25); ctx.lineTo(6, -22); ctx.quadraticCurveTo(1, -18, -5, -22); ctx.closePath(); fillO('#2f6b3f');
      },
      headFn(A) {
        headBall(0, 0, 8.5);
        face(0, 1, { t, seed: 1.3, eye: '#2f9a4f', brow: '#9a6a3a' });
        // Pony
        ctx.beginPath(); ctx.moveTo(-7, -4); ctx.quadraticCurveTo(0, -10.5, 8.6, -5.6); ctx.quadraticCurveTo(5.5, -5.8, 4, -4.6); ctx.quadraticCurveTo(2, -6, -0.5, -4.6); ctx.quadraticCurveTo(-3, -5.6, -5.5, -1.5); ctx.closePath(); fillO(LG(-10, -2, '#ffe596', '#d9a83a'));
        // Kapuze mit Goldrand und Feder
        ctx.beginPath(); ctx.moveTo(-10, 6); ctx.quadraticCurveTo(-13, -12, 0, -14); ctx.quadraticCurveTo(9.5, -14.5, 10, -7.5); ctx.quadraticCurveTo(5, -11, -1.5, -10); ctx.quadraticCurveTo(-7, -8.5, -7.2, 6); ctx.closePath(); fillO(LG(-14, 6, '#5fae48', '#24552f'));
        ctx.strokeStyle = '#c9a64a'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-7.4, 5); ctx.quadraticCurveTo(-7, -8.8, -1.5, -10.2); ctx.quadraticCurveTo(5, -11.3, 9.7, -7.8); ctx.stroke();
        ctx.save(); ctx.translate(-5, -12); ctx.rotate(-1.05 + wind * 0.06); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -8, -1, -15); ctx.quadraticCurveTo(3, -8, 0, 0); fillO('#e5484d'); ctx.restore();
        // Elfenohr
        ctx.beginPath(); ctx.moveTo(-5.5, -1); ctx.quadraticCurveTo(-12, -5, -13, -9); ctx.quadraticCurveTo(-8, -6, -4.5, 2); ctx.closePath(); fillO('#efc39c');
      },
      itemF(A) {
        // Bogen senkrecht in der vorderen Hand, Sehne zur hinteren Hand
        const sx = A.handB[0] - A.handF[0], sy = A.handB[1] - A.handF[1], drawn = A.pull > 1;
        ctx.strokeStyle = '#4e2f16'; ctx.lineWidth = 4.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-3, -24); ctx.quadraticCurveTo(1, -23, 3, -16); ctx.quadraticCurveTo(10, 0, 3, 16); ctx.quadraticCurveTo(1, 23, -3, 24); ctx.stroke();
        ctx.strokeStyle = '#b07a42'; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(-3, -24, 1.8, 0, 7); ctx.arc(-3, 24, 1.8, 0, 7); ctx.fill();
        glowDot(5, 0, 6, '126,224,138', 0.35 + 0.15 * Math.sin(t * 3));
        ctx.strokeStyle = 'rgba(245,245,240,.95)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-3, -24);
        if (drawn) ctx.lineTo(sx, sy); else ctx.lineTo(-3 - (A.rel || 0) * 3 * Math.sin(t * 60), 0);
        ctx.lineTo(-3, 24); ctx.stroke();
      },
      after(A) {
        ctx.save(); ctx.translate(A.shF[0], A.shF[1]); ctx.beginPath(); ctx.ellipse(0, 0, 5.4, 3.8, -0.2, 0, 7); fillO(LG(-4, 4, '#a67a48', '#6b4a2e')); ctx.restore();
        // Pfeil zwischen Sehnenhand und Bogen
        if (A.pull > 1) { const hB = A.handB, hF = A.handF; ctx.save(); ctx.translate(hB[0], hB[1]); ctx.rotate(Math.atan2(hF[1] - hB[1], hF[0] - hB[0]));
          ctx.fillStyle = '#e8e2d0'; ctx.fillRect(0, -0.7, 26, 1.4); ctx.fillStyle = '#e5484d'; ctx.fillRect(-1, -1.8, 3.5, 3.6); ctx.beginPath(); ctx.moveTo(26, -2.6); ctx.lineTo(30.5, 0); ctx.lineTo(26, 2.6); ctx.closePath(); fillO('#c9cdd6'); glowDot(28, 0, 6, '126,224,138', 0.6); ctx.restore(); }
      },
    });
  }

  // ---------- Magier: Sternenrobe, Spitzhut, Bart, Stab mit Kugel ----------
  function mage(x, h, t, walk) {
    hum(x, h, t, walk, {
      f: 10, sh: 14, seed: 3.1, leg: { thigh: 10, shin: 10 },
      sleeve: '#5a3aa8', sleeveB: '#3f2780', glove: '#f1d2b4', armW: 5.2,
      atkLean: (p, atk) => atk ? strike(p, -0.08, 0.1, 0) : 0,
      arms(A) {
        if (A.atk) { A.armF.a = strike(A.p, 2.4, 1.9, 0.9, 0.2, 0.5); A.armF.e = strike(A.p, -0.6, -0.4, -0.3, 0.2, 0.5); A.armB.a = strike(A.p, 1.9, 1.7, 0.3, 0.2, 0.5); A.armB.e = 0.3; }
        else { A.armF.a = 0.9; A.armF.e = -0.3; A.armB.a = 0.3; A.armB.e = 0.6; }
      },
      behind(A) { for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; glowDot(Math.cos(a) * 18, -40 + Math.sin(a * 1.3) * 16, 4, '200,140,255', 0.7); } },
      robe(A, lf, lb) { robe(A, lf, lb, '#6a46b8', '#2f1d5e', '#ffd23f', { top: 2, wB: 13.5 }); ctx.fillStyle = '#ffd23f'; for (const [sx, sy] of [[-6, -14], [5, -9], [-2, -5]]) sparkle(sx, sy, 2, 0.75); },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-8.5, 4); ctx.lineTo(8.5, 4); ctx.quadraticCurveTo(9.5, -12, 7.5, -24); ctx.quadraticCurveTo(0, -26, -7.5, -24); ctx.quadraticCurveTo(-9.5, -12, -8.5, 4); ctx.closePath(); fillO(LG(-25, 4, '#7a56c8', '#3a2470'));
        ctx.fillStyle = '#ffd23f'; sparkle(-3, -14, 2.2, 0.8); sparkle(4, -6, 1.6, 0.7);
        rr(-8.6, -3, 17.2, 3, 1); fillO('#ffd23f');
        // Bart über der Brust
        ctx.beginPath(); ctx.moveTo(-1, -26); ctx.quadraticCurveTo(10, -24, 8, -14); ctx.quadraticCurveTo(6, -6, 3, -3); ctx.quadraticCurveTo(1, -8, -1, -9); ctx.quadraticCurveTo(-3, -16, -1, -26); ctx.closePath(); fillO(LG(-26, -3, '#ffffff', '#c9cdd6'));
        ctx.strokeStyle = 'rgba(150,155,170,.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(2, -22); ctx.quadraticCurveTo(5, -14, 3.5, -6); ctx.moveTo(5, -21); ctx.quadraticCurveTo(7, -15, 5.5, -9); ctx.stroke();
      },
      headFn(A) {
        headBall(0, 1, 8.2, '#f6d4b4', '#dcaa86');
        face(0, 2, { t, seed: 0.7, eye: '#5a3aa8', brow: '#e8e8f0', mouth: false, cheek: false });
        ctx.beginPath(); ctx.moveTo(1, 5); ctx.quadraticCurveTo(6, 3, 9, 6); ctx.quadraticCurveTo(5, 8.5, 1, 7.5); ctx.closePath(); fillO('#f4f4f8');
        ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.ellipse(8, 3, 1.6, 1.2, 0, 0, 7); ctx.fill();
        // Spitzhut mit Mond, Spitze knickt nach hinten
        const wv = Math.sin(t * 2) * 1.5;
        ctx.beginPath(); ctx.ellipse(1, -5, 13, 3.4, -0.08, 0, 7); fillO(LG(-8, -2, '#6a46b8', '#3a2470'));
        ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-3, -16, -2, -24); ctx.quadraticCurveTo(-6 - wv, -27, -12 - wv, -26); ctx.quadraticCurveTo(-3, -22, 2, -26); ctx.quadraticCurveTo(5, -16, 9, -6); ctx.closePath(); fillO(LG(-27, -6, '#8a66d8', '#4a2d90'));
        rr(-7.5, -8.4, 17, 3, 1.2); fillO('#ffd23f');
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(2.5, -14, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#6a46b8'; ctx.beginPath(); ctx.arc(3.8, -14.8, 2.6, 0, 7); ctx.fill();
        sparkle(-3, -18, 1.6, 0.9);
      },
      itemF(A) {
        ctx.rotate(A.atk ? -0.3 : 0.12);
        ctx.strokeStyle = OUT; ctx.lineWidth = 4.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, -30); ctx.stroke(); ctx.strokeStyle = '#8a5e36'; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -33, 4.4, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
        const g = A.atk ? 1 - Math.abs(A.p - 0.45) * 1.6 : 0.4 + 0.15 * Math.sin(t * 3);
        glowDot(0, -34, 12 + Math.max(0, g) * 12, '200,140,255', Math.min(1, 0.5 + g));
        ctx.beginPath(); ctx.arc(0, -34, 3.6, 0, 7); fillO(RG(-1, -35, 4, '#ffffff', '#c08cff'));
        if (A.atk && A.p > 0.3 && A.p < 0.7) for (let i = 0; i < 6; i++) { const a = i * 1.05 + t * 8, r = 6 + (A.p - 0.3) * 30; ctx.fillStyle = `rgba(230,200,255,${0.9 - (A.p - 0.3) * 2})`; ctx.fillRect(Math.cos(a) * r - 1, -34 + Math.sin(a) * r - 1, 2, 2); }
      },
    });
  }

  // ---------- Priesterin: helle Robe, Heiligenschein, Flügel, Sonnenstab ----------
  function priest(x, h, t, walk) {
    hum(x, h, t, walk, {
      f: 10, sh: 13, seed: 4.4, leg: { thigh: 10, shin: 10 },
      sleeve: '#fffaf0', sleeveB: '#e6dcc6', glove: '#f6d8bc', armW: 4.6,
      arms(A) {
        if (A.atk) { A.armF.a = strike(A.p, 2.7, 2.5, 0.85, 0.2, 0.55); A.armF.e = strike(A.p, -0.3, -0.2, -0.4, 0.2, 0.55); A.armB.a = strike(A.p, 1.2, 1.0, 0.2, 0.2, 0.55); A.armB.e = 0.9; }
        else { A.armF.a = 0.85; A.armF.e = -0.4; A.armB.a = 0.25; A.armB.e = 0.8; }
      },
      behind(A) {
        // Flügel, schlagen langsam
        const fl = Math.sin(t * 2.2) * 0.12 + (A.atk ? 0.2 : 0);
        for (const [dx, sc, c] of [[-2, 0.85, '#e8e4f6'], [0, 1, '#ffffff']]) {
          ctx.save(); ctx.translate(A.sh[0] - 4 + dx, A.sh[1] + 4); ctx.rotate(-0.5 - fl); ctx.scale(sc, sc);
          // Federflügel: oben runder Bogen, unten drei weiche Federreihen
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -16, -20, -17); ctx.quadraticCurveTo(-26, -16, -25, -10);
          ctx.quadraticCurveTo(-27, -6, -22, -4); ctx.quadraticCurveTo(-24, 1, -18, 1); ctx.quadraticCurveTo(-18, 6, -12, 5); ctx.quadraticCurveTo(-9, 8, -5, 5); ctx.quadraticCurveTo(-2, 4, 0, 0); ctx.closePath(); fillO(LG(-17, 8, c, '#cfd6f2'));
          ctx.strokeStyle = 'rgba(150,160,200,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-3, -3); ctx.quadraticCurveTo(-12, -8, -22, -6); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-10, -2, -17, 0); ctx.stroke();
          ctx.restore();
        }
        // langes Haar hinten
        ctx.beginPath(); ctx.moveTo(A.head[0] - 7, A.head[1] - 3); ctx.quadraticCurveTo(A.head[0] - 13 - (walk ? 2 : 0), A.head[1] + 12, A.head[0] - 8 - Math.sin(t * 2) * 1.5, A.head[1] + 22); ctx.lineTo(A.head[0] - 1, A.head[1] + 14); ctx.lineTo(A.head[0] + 1, A.head[1] + 2); ctx.closePath(); fillO(LG(A.head[1], A.head[1] + 22, '#ffe7a0', '#d9a83a'));
      },
      robe(A, lf, lb) { robe(A, lf, lb, '#ffffff', '#d9d2c0', '#ffd23f', { top: 2, wB: 12.5, b: '#c9a64a', b2: '#a8873a' }); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1.2, -16, 2.4, 14); },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.quadraticCurveTo(9, -12, 7, -24); ctx.quadraticCurveTo(0, -26, -7, -24); ctx.quadraticCurveTo(-9, -12, -8, 4); ctx.closePath(); fillO(LG(-25, 4, '#ffffff', '#e2d9c4'));
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1.3, -22, 2.6, 22); ctx.fillRect(-5, -16, 10, 2.4);
        rr(-8.2, -3.5, 16.4, 3, 1); fillO('#c9a64a');
        ctx.beginPath(); ctx.arc(0.5, -21, 3, 0, 7); fillO('#ffd23f');
      },
      headFn(A) {
        // Heiligenschein
        ctx.save(); ctx.globalAlpha *= 0.95; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-1, -13, 9, 2.8, -0.1, 0, 7); ctx.stroke(); ctx.restore();
        glowDot(-1, -13, 12, '255,236,150', 0.35 + 0.1 * Math.sin(t * 3));
        headBall(0, 0, 8.4, '#f8dcc0', '#e2b290');
        face(0, 1, { t, seed: 2.1, eye: '#4a8ae6', brow: '#c99a3a' });
        // Haare mit Scheitel
        ctx.beginPath(); ctx.moveTo(-8.6, 3); ctx.quadraticCurveTo(-10, -9, 0, -9.6); ctx.quadraticCurveTo(9, -9.6, 9.2, -3); ctx.quadraticCurveTo(5, -6.5, 1, -5.5); ctx.quadraticCurveTo(-4, -4, -5.5, 5); ctx.closePath(); fillO(LG(-10, 4, '#fff0b4', '#e0b04a'));
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-2, -7.4, 3, 0.9, -0.2, 0, 7); ctx.fill();
      },
      itemF(A) {
        ctx.rotate(A.atk ? -0.2 : 0.1);
        ctx.strokeStyle = OUT; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, -30); ctx.stroke(); ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 2.4; ctx.stroke();
        const g = A.atk ? Math.max(0, 1 - Math.abs(A.p - 0.45) * 1.8) : 0;
        glowDot(0, -34, 14 + g * 16, '255,240,170', 0.6 + g * 0.4);
        ctx.save(); ctx.translate(0, -34); ctx.rotate(t * 0.8); ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-1.4, -4); ctx.lineTo(0, -8.5); ctx.lineTo(1.4, -4); ctx.fill(); } ctx.restore();
        ctx.beginPath(); ctx.arc(0, -34, 4, 0, 7); fillO(RG(-1, -35, 5, '#ffffff', '#ffd27a'));
      },
    });
  }

  // ---------- Tierbändiger: Wolfsfell-Kapuze, Bart, Axt ----------
  function tamer(x, h, t, walk) {
    hum(x, h, t, walk, {
      f: 11, sh: 15, seed: 5.2, body: 24,
      leg: { c: '#6b4a2e', c2: '#4e3420', s: '#7a5a3a', s2: '#5a4028', b: '#3a2a1c', b2: '#2a1e14', w: 5.8, cuff: '#9aa3ad' },
      sleeve: '#8a5e36', sleeveB: '#6b4628', glove: '#e8b896', armW: 5.2,
      atkLean: (p, atk) => atk ? strike(p, -0.15, 0.2, 0) : 0,
      arms(A) {
        if (A.atk) { A.armF.a = strike(A.p, -2.4, -4.9, 0.6, 0.12, 0.42, 0.6 - Math.PI * 2); A.armF.e = strike(A.p, 0.5, 0, 0.6); }
        else { A.armF.a = 0.6; A.armF.e = 0.6; }
        A.armB.a = walk ? A.armB.a : 0.1; A.armB.e = 0.4;
      },
      behind(A) {
        // Fellumhang (Wolfsfell)
        cloth(A.sh[0] - 3, A.sh[1], 30, 15, '#9aa3ad', '#5a626e', t, walk, { seed: 4, rag: 6 });
      },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.quadraticCurveTo(11, -12, 9, -24); ctx.quadraticCurveTo(0, -27, -9, -24); ctx.quadraticCurveTo(-11, -12, -9, 4); ctx.closePath(); fillO(LG(-26, 4, '#a0703e', '#5a3a20'));
        ctx.strokeStyle = '#3a2616'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-7, -22); ctx.lineTo(7, -3); ctx.stroke();
        ctx.fillStyle = '#e8e2d0'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-5 + i * 3.6, -18 + i * 4.5); ctx.lineTo(-3.6 + i * 3.6, -14 + i * 4.5); ctx.lineTo(-2.4 + i * 3.6, -18 + i * 4.5); ctx.closePath(); fillO('#ece6d4'); }
        rr(-9.5, -4, 19, 3.6, 1); fillO('#3a2616'); ctx.beginPath(); ctx.arc(0, -2.2, 2.6, 0, 7); fillO('#9aa3ad');
      },
      headFn(A) {
        headBall(0, 1, 8.4, '#f0c8a0', '#d49a70');
        face(0, 1.5, { t, seed: 3.3, eye: '#6b4a2e', brow: '#5a3a20', mouth: false, cheek: false });
        // Bart
        ctx.beginPath(); ctx.moveTo(-4, 3); ctx.quadraticCurveTo(-2, 12, 4, 12); ctx.quadraticCurveTo(10, 10, 9, 3); ctx.quadraticCurveTo(6, 6, 3, 5.6); ctx.quadraticCurveTo(0, 6, -4, 3); ctx.closePath(); fillO(LG(3, 12, '#8a5a30', '#5a3a1e'));
        // Wolfskopf-Kapuze
        ctx.beginPath(); ctx.moveTo(-10, 5); ctx.quadraticCurveTo(-12, -9, -2, -12); ctx.quadraticCurveTo(8, -13, 13, -6); ctx.lineTo(15, -3); ctx.quadraticCurveTo(10, -3, 8, -5); ctx.quadraticCurveTo(2, -7, -4, -5); ctx.quadraticCurveTo(-7, -2, -7.5, 5); ctx.closePath(); fillO(LG(-13, 5, '#b4bcc8', '#6a727e'));
        for (const ex of [-5, 1]) { ctx.beginPath(); ctx.moveTo(ex, -10.5); ctx.lineTo(ex + 2.5, -17); ctx.lineTo(ex + 4.5, -10.5); ctx.closePath(); fillO('#9aa3ad'); }
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(8.5, -7.5, 1.3, 0.9, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.fillRect(14, -4.5, 2, 1.6);
        ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(9 + i * 1.8, -3.4); ctx.lineTo(9.8 + i * 1.8, -1.4); ctx.lineTo(10.6 + i * 1.8, -3.4); ctx.fill(); }
      },
      itemF(A) {
        ctx.rotate(-(A.atk ? A.angF + 0.1 : 2.6));
        ctx.strokeStyle = OUT; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 22); ctx.stroke(); ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(1, 16); ctx.quadraticCurveTo(11, 13, 12, 22); ctx.quadraticCurveTo(10, 28, 1, 26); ctx.closePath(); fillO(LG(14, 28, '#eef2f8', '#8a94a6'));
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(11.5, 17); ctx.quadraticCurveTo(12.6, 22, 10.5, 26.5); ctx.stroke();
      },
      after(A) { if (A.atk && A.p > 0.12 && A.p < 0.6) smear(A.shF[0], A.shF[1], 30, -2.3, Math.max(-4.9, A.armF.a), '255,226,170', 1 - (A.p - 0.12) / 0.48); },
    });
  }

  // ---------- Assassine: Kapuze, Maske, roter Schal, zwei Dolche ----------
  function assassin(x, h, t, walk) {
    const wind = Math.sin(t * 3.1);
    hum(x, h, t, walk, {
      f: 14, sh: 13, seed: 6.1, lean: 0.16, body: 22,
      leg: { c: '#2a2438', c2: '#1c1828', s: '#3a3248', s2: '#262032', b: '#1a1622', b2: '#141018', w: 5, cuff: '#e5484d' },
      sleeve: '#2e2840', sleeveB: '#221e30', glove: '#3a3248', armW: 4.2,
      atkLean: (p, atk) => atk ? strike(p, -0.1, 0.35, 0, 0.1, 0.3) : 0,
      arms(A) {
        if (A.atk) { A.armF.a = strike(A.p, 0.3, 1.75, 1.0, 0.1, 0.3); A.armF.e = strike(A.p, 1.5, 0, 0.9, 0.1, 0.3); A.armB.a = strike(A.p, 1.6, 0.3, -0.4, 0.25, 0.5); A.armB.e = 1.2; }
        else { A.armF.a = 1.0; A.armF.e = 0.9; A.armB.a = -0.4; A.armB.e = 1.2; }
      },
      cape(A) {
        // langer roter Schal weht
        const wv = wind * 3 + (walk ? 8 : 2);
        // Schal als Band aus Segmenten, das wellenförmig flattert
        const hx = A.head[0] - 2, hy = A.head[1] + 8, n = 9, len = 30 + wv, top = [], bot = [];
        for (let i = 0; i <= n; i++) { const q = i / n, xx = hx - q * len, yy = hy + q * 5 + Math.sin(t * 7 - q * 5) * q * 4, w = 2.6 - q * 0.8; top.push([xx, yy - w]); bot.push([xx, yy + w]); }
        ctx.beginPath(); top.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); bot.reverse().forEach(([a, b]) => ctx.lineTo(a, b)); ctx.closePath(); fillO(LG(hy - 4, hy + 8, '#ff5a6a', '#a01e2e'));
      },
      itemB(A) { ctx.rotate(-(A.angB + 0.2)); ctx.scale(0.75, 0.75); bladeY(15, 3.2, '#e8ecf2', '#8a94a6', '#e5484d', '#2a2438', '#e5484d'); },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-7.5, 4); ctx.lineTo(7.5, 4); ctx.quadraticCurveTo(8.5, -10, 7.5, -22); ctx.quadraticCurveTo(0, -24, -7.5, -22); ctx.quadraticCurveTo(-8.5, -10, -7.5, 4); ctx.closePath(); fillO(LG(-23, 4, '#3a3250', '#1a1626'));
        ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(6, -2); ctx.stroke();
        ctx.fillStyle = '#c9cdd6'; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(-3 + i * 3, -15 + i * 4.5); ctx.rotate(0.9); ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(1, 0); ctx.lineTo(0, 3); ctx.lineTo(-1, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
        rr(-8, -4, 16, 3, 1); fillO('#141018');
      },
      headFn(A) {
        headBall(0, 0, 8.2, '#e8c4a4', '#c4987a');
        // Maske über Mund und Nase
        ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(9.2, 0); ctx.quadraticCurveTo(9, 7, 3, 8); ctx.quadraticCurveTo(-3, 7.5, -3, 1); ctx.closePath(); fillO(LG(0, 8, '#e5484d', '#8a1c28'));
        // Augen schmal und leuchtend
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5, -2, 2, 1.2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(5.5, -2, 0.9, 0, 7); ctx.fill(); glowDot(5.5, -2, 4, '255,77,94', 0.8);
        // Kapuze
        ctx.beginPath(); ctx.moveTo(-10, 7); ctx.quadraticCurveTo(-12, -10, 0, -12.5); ctx.quadraticCurveTo(10, -13, 11, -4); ctx.lineTo(9.5, -4); ctx.quadraticCurveTo(6, -8.5, 0, -7.5); ctx.quadraticCurveTo(-5, -6, -6.5, 7); ctx.closePath(); fillO(LG(-13, 7, '#3e3656', '#16121e'));
      },
      itemF(A) { ctx.rotate(-(A.atk ? A.angF : A.angF - 0.3)); ctx.scale(0.8, 0.8); bladeY(17, 3.4, '#ffffff', '#9aa4b4', '#e5484d', '#2a2438', '#e5484d'); },
      after(A) { if (A.atk && A.p > 0.08 && A.p < 0.35) { const q = (A.p - 0.08) / 0.27; ctx.strokeStyle = `rgba(255,220,230,${0.8 * (1 - q)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.handF[0] - 12, A.handF[1]); ctx.lineTo(A.handF[0] + 14, A.handF[1] - 1); ctx.stroke(); } },
    });
  }

  // ---------- Nekromant: schwarze Robe, Augen in der Kapuze, Schädelstab ----------
  function necro(x, h, t, walk) {
    const gl = 0.7 + 0.3 * Math.sin(t * 3);
    hum(x, h, t, walk, {
      f: 9, sh: 14, seed: 7.3, leg: { thigh: 10, shin: 10 }, lean: 0.05,
      sleeve: '#2a2632', sleeveB: '#1c1a22', glove: '#d8dce4', armW: 5.2,
      arms(A) {
        if (A.atk) { A.armF.a = strike(A.p, 2.6, 2.0, 0.8, 0.2, 0.5); A.armF.e = -0.4; A.armB.a = strike(A.p, 2.0, 1.4, 0.4, 0.2, 0.5); A.armB.e = -0.3; }
        else { A.armF.a = 0.8; A.armF.e = -0.3; A.armB.a = 0.4 + Math.sin(t * 1.5) * 0.05; A.armB.e = 0.7; }
      },
      behind(A) { for (let i = 0; i < 4; i++) { const q = (t * 0.4 + i / 4) % 1; ctx.fillStyle = `rgba(107,224,184,${0.5 * (1 - q)})`; ctx.beginPath(); ctx.arc(Math.sin(i * 2.4 + t) * 12, -4 - q * 40, 1.8, 0, 7); ctx.fill(); } },
      robe(A, lf, lb) {
        robe(A, lf, lb, '#2e2a38', '#121016', null, { top: 2, wB: 14, b: '#1a1620' });
        ctx.strokeStyle = `rgba(107,224,184,${0.6 * gl})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-1, -20); ctx.lineTo(0, -2); ctx.stroke();
        ctx.fillStyle = `rgba(107,224,184,${0.8 * gl})`; for (let i = 0; i < 3; i++) ctx.fillRect(-8 + i * 7, -4, 2, 2);
      },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-8.5, 4); ctx.lineTo(8.5, 4); ctx.quadraticCurveTo(9.5, -12, 8, -24); ctx.quadraticCurveTo(0, -26, -8, -24); ctx.quadraticCurveTo(-9.5, -12, -8.5, 4); ctx.closePath(); fillO(LG(-25, 4, '#3a3446', '#16141c'));
        ctx.strokeStyle = `rgba(107,224,184,${0.75 * gl})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 3); ctx.stroke();
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-4 + i * 4, -6, 1.6, 0, 7); fillO('#e8e2d0'); }
      },
      headFn(A) {
        // Kapuze mit dunklem Gesicht und leuchtenden Augen
        ctx.beginPath(); ctx.moveTo(-10, 8); ctx.quadraticCurveTo(-13, -12, 1, -14); ctx.quadraticCurveTo(11, -13, 11, 0); ctx.quadraticCurveTo(10, 7, 6, 9); ctx.closePath(); fillO(LG(-14, 9, '#3e384c', '#16141c'));
        ctx.beginPath(); ctx.ellipse(3.5, 0, 6, 7, 0, 0, 7); ctx.fillStyle = '#07060a'; ctx.fill();
        for (const ex of [2, 6]) { glowDot(ex, -1, 4, '107,224,184', 0.9 * gl); ctx.fillStyle = '#c8ffe8'; ctx.beginPath(); ctx.ellipse(ex, -1, 1.1, 0.8, 0, 0, 7); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-9, -9, 0, -11.5); ctx.stroke();
      },
      itemF(A) {
        ctx.rotate(A.atk ? -0.25 : 0.1);
        ctx.strokeStyle = OUT; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, -28); ctx.stroke(); ctx.strokeStyle = '#4a3a2e'; ctx.lineWidth = 2.4; ctx.stroke();
        const g = A.atk ? Math.max(0, 1 - Math.abs(A.p - 0.4) * 1.8) : 0;
        glowDot(0, -32, 12 + g * 14, '107,224,184', 0.45 + g * 0.5);
        ctx.beginPath(); ctx.ellipse(0, -33, 5.2, 5.6, 0, 0, 7); fillO(LG(-38, -28, '#f4f0e2', '#c8c0a8'));
        ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(-1.8, -33.5, 1.4, 0, 7); ctx.arc(2.2, -33.5, 1.4, 0, 7); ctx.fill(); ctx.fillStyle = '#6be0b8'; ctx.fillRect(-2.3, -34, 1, 1); ctx.fillRect(1.7, -34, 1, 1);
        ctx.fillStyle = '#1b1726'; for (let i = 0; i < 3; i++) ctx.fillRect(-2 + i * 1.6, -29.5, 0.9, 1.6);
        for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s2 * 4, -36); ctx.quadraticCurveTo(s2 * 9, -40, s2 * 8, -45); ctx.quadraticCurveTo(s2 * 6, -40, s2 * 3, -38); ctx.closePath(); fillO('#d8d0bc'); }
      },
      itemB(A) { if (A.atk || Math.sin(t * 1.3) > 0.6) glowDot(0, 0, 7, '107,224,184', 0.5); },
    });
  }

  // ---------- Barde: Federhut, bunte Jacke, Laute ----------
  function bard(x, h, t, walk) {
    hum(x, h, t, walk, {
      f: 12, sh: 13, seed: 8.2,
      leg: { c: '#3a5ab8', c2: '#2a4088', s: '#e5484d', s2: '#a8323a', b: '#4a2e22', b2: '#3a221a', w: 4.8, cuff: '#ffd23f' },
      sleeve: '#e86aa8', sleeveB: '#b84a80', glove: '#f1c9a5', armW: 4.4,
      arms(A) {
        const st = A.atk ? Math.sin(A.p * 30) * 0.35 * (1 - A.p) : Math.sin(t * 4) * 0.05;
        A.armF.a = 1.25; A.armF.e = 0.25; A.armB.a = 0.7 + st; A.armB.e = 0.7;
      },
      cape(A) { cloth(A.sh[0] - 3, A.sh[1] + 1, 26, 12, '#7a3ab8', '#3a1a60', t, walk, { seed: 6, rag: 3 }); },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(8, 5); ctx.quadraticCurveTo(9.5, -12, 8, -24); ctx.quadraticCurveTo(0, -26, -8, -24); ctx.quadraticCurveTo(-9.5, -12, -8, 5); ctx.closePath(); fillO(LG(-25, 5, '#ff8ac8', '#b8407a'));
        ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8, -20 + i * 8); ctx.lineTo(0, -16 + i * 8); ctx.lineTo(8, -20 + i * 8); ctx.lineTo(8, -17 + i * 8); ctx.lineTo(0, -13 + i * 8); ctx.lineTo(-8, -17 + i * 8); ctx.fill(); }
        ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(1, -19 + i * 5, 1.1, 0, 7); ctx.fill(); }
        // Rüschenkragen
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-5 + i * 2.8, -24.5, 2.4, 0, 7); fillO('#fff8f0'); }
        rr(-8.5, -3, 17, 3, 1); fillO('#4a2e22');
      },
      headFn(A) {
        headBall(0, 0, 8.3);
        face(0, 1, { t, seed: 4.2, eye: '#8a4ad8', brow: '#6b3a1e', open: A.atk });
        ctx.beginPath(); ctx.moveTo(-8.5, 3); ctx.quadraticCurveTo(-10, -8, 0, -8.4); ctx.quadraticCurveTo(7, -8.4, 8.5, -5.5); ctx.quadraticCurveTo(1, -6, -3, -3); ctx.quadraticCurveTo(-5, 0, -5.5, 5); ctx.closePath(); fillO(LG(-9, 5, '#a86a3a', '#6b3a1e'));
        // Federhut
        const wv = Math.sin(t * 3) * 0.08 + (walk ? -0.15 : 0);
        ctx.beginPath(); ctx.ellipse(0, -7, 13, 3.6, -0.15, 0, 7); fillO(LG(-10, -3, '#8a4ad8', '#4a2280'));
        ctx.beginPath(); ctx.moveTo(-7, -8); ctx.quadraticCurveTo(-5, -16, 2, -16); ctx.quadraticCurveTo(8, -15, 8, -8); ctx.closePath(); fillO(LG(-16, -8, '#9a5ae8', '#5a2a90'));
        rr(-7, -9.5, 15, 2.4, 1); fillO('#ffd23f');
        ctx.save(); ctx.translate(-3, -13); ctx.rotate(-0.9 + wv); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-3, -12, 3, -22); ctx.quadraticCurveTo(5, -10, 0, 0); fillO(LG(-22, 0, '#fff27a', '#ffb547')); ctx.strokeStyle = 'rgba(180,100,20,.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(0, -10, 2.6, -20); ctx.stroke(); ctx.restore();
      },
      itemF(A) {
        // Laute quer vor dem Körper: Hals in der vorderen Hand, Bauch an der Hüfte
        ctx.save(); const bx = A.hip[0] - A.handF[0] + 1, by = A.hip[1] - A.handF[1] - 12;
        const ang = Math.atan2(-by, -bx);
        ctx.strokeStyle = OUT; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, -1.5); ctx.lineTo(bx, by); ctx.stroke(); ctx.strokeStyle = '#6b4228'; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); ctx.translate(4, -1.5); ctx.rotate(ang); rr(-1, -2.5, 5, 5, 1.5); fillO('#4a2e1c'); ctx.restore();
        ctx.translate(bx, by); ctx.rotate(ang - Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(0, 2, 7.5, 9, 0, 0, 7); fillO(LG(-8, 11, '#e8a050', '#9a5a22'));
        ctx.beginPath(); ctx.arc(0, -1, 2.6, 0, 7); ctx.fillStyle = '#2a1608'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,210,.8)'; ctx.lineWidth = 0.5; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(i * 0.9, -14); ctx.lineTo(i * 0.9, 7); } ctx.stroke();
        rr(-3, 6, 6, 1.6, 0.6); fillO('#3a2414');
        ctx.restore();
      },
      after(A) {
        if (A.atk) for (let i = 0; i < 3; i++) { const q = (A.p * 1.5 + i * 0.33) % 1; ctx.save(); ctx.globalAlpha *= 1 - q; ctx.fillStyle = ['#ff8ac8', '#ffd23f', '#8ad8ff'][i]; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♪', 6 + q * 14 + i * 3, -36 - q * 18 + Math.sin(q * 9) * 2); ctx.restore(); }
      },
    });
  }

  // ---------- Druidin: rote Haare mit Blüten, Blätterkleid, Geweihstab ----------
  function druid(x, h, t, walk) {
    hum(x, h, t, walk, {
      f: 11, sh: 13, seed: 9.4, leg: { thigh: 10, shin: 10 },
      sleeve: '#4a9a4a', sleeveB: '#357a38', glove: '#f1c9a5', armW: 4.4,
      arms(A) {
        if (A.atk) { A.armF.a = strike(A.p, 2.3, 1.7, 0.8, 0.2, 0.5); A.armF.e = -0.4; A.armB.a = strike(A.p, 1.4, 1.1, 0.25, 0.2, 0.5); A.armB.e = 0.3; }
        else { A.armF.a = 0.8; A.armF.e = -0.35; A.armB.a = 0.25; A.armB.e = 0.7; }
      },
      behind(A) {
        // lange rote Locken hinten
        ctx.beginPath(); ctx.moveTo(A.head[0] - 6, A.head[1] - 6); ctx.quadraticCurveTo(A.head[0] - 16 - (walk ? 2 : 0), A.head[1] + 6, A.head[0] - 11 - Math.sin(t * 2) * 1.5, A.head[1] + 20); ctx.quadraticCurveTo(A.head[0] - 6, A.head[1] + 18, A.head[0] - 2, A.head[1] + 12); ctx.lineTo(A.head[0], A.head[1]); ctx.closePath(); fillO(LG(A.head[1] - 6, A.head[1] + 20, '#ff7a3d', '#b8401e'));
      },
      robe(A, lf, lb) {
        robe(A, lf, lb, '#5ab85a', '#245a2a', null, { top: 2, wB: 12.5, b: '#6b4a2e' });
        ctx.fillStyle = '#9be36b'; for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(-10 + i * 4, -2 + (i % 2)); ctx.rotate(0.6 + i); ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 1.2, 0, 0, 7); ctx.fill(); ctx.restore(); }
      },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-7.5, 4); ctx.lineTo(7.5, 4); ctx.quadraticCurveTo(8.5, -12, 7, -23); ctx.quadraticCurveTo(0, -25, -7, -23); ctx.quadraticCurveTo(-8.5, -12, -7.5, 4); ctx.closePath(); fillO(LG(-24, 4, '#6ac86a', '#2f7a34'));
        ctx.fillStyle = '#9be36b'; for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(-5 + i * 2.6, -22 + (i % 2) * 2); ctx.rotate(-0.4 + i * 0.3); ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.4, 0, 0, 7); fillO('#8ad860'); ctx.restore(); }
        rr(-7.8, -3, 15.6, 2.6, 1); fillO('#6b4a2e'); ctx.beginPath(); ctx.arc(1, -1.8, 1.8, 0, 7); fillO('#ff8ac8');
      },
      headFn(A) {
        headBall(0, 0, 8.3);
        face(0, 1, { t, seed: 5.5, eye: '#2f9a4f', brow: '#b8401e' });
        ctx.beginPath(); ctx.moveTo(-9, 4); ctx.quadraticCurveTo(-10.5, -10, 1, -10); ctx.quadraticCurveTo(9.5, -10, 9.5, -2); ctx.quadraticCurveTo(5, -6, 0, -5); ctx.quadraticCurveTo(-5, -4, -6, 6); ctx.closePath(); fillO(LG(-10, 6, '#ff8a4a', '#c44a22'));
        // Blütenkranz
        for (let i = 0; i < 5; i++) { const a = Math.PI * (1.05 + i * 0.2), fx = Math.cos(a) * 9.5, fy = -2 + Math.sin(a) * 8; ctx.fillStyle = ['#ff8ac8', '#ffffff', '#ffd23f', '#ff8ac8', '#b8a0ff'][i]; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(fx + Math.cos(k * 1.26) * 1.5, fy + Math.sin(k * 1.26) * 1.5, 1.2, 0, 7); ctx.fill(); } ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(fx, fy, 0.8, 0, 7); ctx.fill(); }
      },
      itemF(A) {
        ctx.rotate(A.atk ? -0.25 : 0.1);
        ctx.strokeStyle = OUT; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(2, -6, 0, -26); ctx.stroke(); ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 2.4; ctx.stroke();
        // Geweih
        ctx.strokeStyle = OUT; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(-7, -30, -8, -38); ctx.moveTo(-4, -30); ctx.lineTo(-9, -31); ctx.moveTo(0, -26); ctx.quadraticCurveTo(7, -30, 7, -38); ctx.moveTo(4, -30); ctx.lineTo(9, -32); ctx.stroke();
        ctx.strokeStyle = '#d8c09a'; ctx.lineWidth = 1.6; ctx.stroke();
        const g = A.atk ? Math.max(0, 1 - Math.abs(A.p - 0.4) * 1.8) : 0;
        glowDot(0, -31, 10 + g * 14, '155,227,107', 0.5 + g * 0.5); ctx.beginPath(); ctx.arc(0, -31, 2.6, 0, 7); fillO('#d8ffc0');
        ctx.fillStyle = '#7ee08a'; ctx.beginPath(); ctx.ellipse(3, -14, 3, 1.4, 0.5, 0, 7); ctx.fill();
        if (A.atk && A.p > 0.25 && A.p < 0.8) for (let i = 0; i < 5; i++) { const q = (A.p - 0.25) / 0.55, a = i * 1.3 + t * 3; ctx.fillStyle = `rgba(155,227,107,${1 - q})`; ctx.save(); ctx.translate(Math.cos(a) * (5 + q * 20), -31 + Math.sin(a) * (5 + q * 16)); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 2.4, 1.1, 0, 0, 7); ctx.fill(); ctx.restore(); }
      },
    });
  }

  // ---------- Tüftlerin: Schutzbrille, Latzhose, Rucksack mit Zahnrädern, Schraubenschlüssel ----------
  function gear(x, y, r, a, c) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a0 = i * Math.PI / 4; ctx.lineTo(Math.cos(a0 - 0.2) * r * 1.3, Math.sin(a0 - 0.2) * r * 1.3); ctx.lineTo(Math.cos(a0 + 0.2) * r * 1.3, Math.sin(a0 + 0.2) * r * 1.3); ctx.lineTo(Math.cos(a0 + 0.4) * r, Math.sin(a0 + 0.4) * r); } ctx.closePath(); fillO(c); ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 7); ctx.fill(); ctx.restore(); }
  function tinker(x, h, t, walk) {
    hum(x, h, t, walk, {
      f: 12, sh: 14, seed: 10.1,
      leg: { c: '#e8752a', c2: '#b85a1e', s: '#d86a24', s2: '#a8501a', b: '#3a3a44', b2: '#2a2a32', w: 5.4, cuff: '#5a5a66' },
      sleeve: '#3a6ab8', sleeveB: '#2a4a88', glove: '#5a4632', armW: 4.6,
      atkLean: (p, atk) => atk ? strike(p, -0.1, 0.15, 0) : 0,
      arms(A) {
        if (A.atk) { A.armF.a = strike(A.p, -2.2, -4.6, 0.6, 0.12, 0.42, 0.6 - Math.PI * 2); A.armF.e = strike(A.p, 0.4, 0, 0.6); }
        else { A.armF.a = 0.6; A.armF.e = 0.6; }
        A.armB.a = walk ? A.armB.a : 0.2; A.armB.e = 0.5;
      },
      behind(A) {
        ctx.save(); ctx.translate(A.sh[0] - 9, A.sh[1] + 9); ctx.rotate(A.lean);
        rr(-6, -10, 11, 20, 3); fillO(LG(-10, 10, '#8a6a4a', '#4e3a26'));
        gear(-1, -3, 4, t * 2, '#c9a64a'); gear(2, 5, 3, -t * 2.7, '#9aa3ad');
        ctx.fillStyle = '#5a5a66'; rr(-3, -16, 3, 7, 1); ctx.fill();
        for (let i = 0; i < 3; i++) { const q = (t * 0.6 + i / 3) % 1; ctx.fillStyle = `rgba(220,220,230,${0.5 * (1 - q)})`; ctx.beginPath(); ctx.arc(-1.5 - q * 4, -18 - q * 14, 2 + q * 3, 0, 7); ctx.fill(); }
        ctx.restore();
      },
      torso(A) {
        ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.quadraticCurveTo(9.5, -12, 8, -23); ctx.quadraticCurveTo(0, -25, -8, -23); ctx.quadraticCurveTo(-9.5, -12, -8, 4); ctx.closePath(); fillO(LG(-24, 4, '#4a7ad8', '#2a4a90'));
        // Latz
        rr(-6, -18, 12, 22, 2.5); fillO(LG(-18, 4, '#f08a3a', '#b85a1e'));
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(-3.6, -16, 1.2, 0, 7); ctx.arc(3.6, -16, 1.2, 0, 7); ctx.fill();
        rr(-3.5, -12, 7, 5, 1); fillO('#d86a24');
        ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(4, 0); ctx.stroke();
      },
      headFn(A) {
        // Pferdeschwanz
        ctx.beginPath(); ctx.moveTo(-6, -5); ctx.quadraticCurveTo(-14 - (walk ? 2 : 0), -4, -13 - Math.sin(t * 3) * 1.5, 7); ctx.quadraticCurveTo(-9, 2, -5, 0); ctx.closePath(); fillO(LG(-6, 7, '#ff8a4a', '#c44a22'));
        headBall(0, 0, 8.3);
        face(0, 1.5, { t, seed: 6.6, eye: '#3b6fd6', brow: '#c44a22' });
        ctx.fillStyle = 'rgba(60,40,30,.25)'; ctx.beginPath(); ctx.arc(-1, 5, 0.6, 0, 7); ctx.arc(1.5, 6, 0.5, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8.6, 2); ctx.quadraticCurveTo(-10, -9.5, 0.5, -9.5); ctx.quadraticCurveTo(9, -9.5, 9, -3.5); ctx.quadraticCurveTo(4, -6, -1, -5); ctx.quadraticCurveTo(-5, -3, -6, 3); ctx.closePath(); fillO(LG(-10, 3, '#ff8a4a', '#c44a22'));
        // Schutzbrille auf der Stirn
        rr(-7.5, -8.2, 16, 2.4, 1); fillO('#3a3a44');
        for (const gx of [1, 6.4]) { ctx.beginPath(); ctx.arc(gx, -7, 2.8, 0, 7); fillO('#c9a64a'); ctx.fillStyle = `rgba(150,220,255,${0.75 + 0.2 * Math.sin(t * 2)})`; ctx.beginPath(); ctx.arc(gx, -7, 1.9, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(gx - 1, -8.2, 0.9, 0.9); }
      },
      itemF(A) {
        ctx.rotate(-(A.atk ? A.angF + 0.1 : 2.4));
        ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 16); ctx.stroke(); ctx.strokeStyle = '#b8c0cc'; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.save(); ctx.translate(0, 19); ctx.beginPath(); ctx.arc(0, 0, 4.6, 0.6, Math.PI * 2 - 0.6 + Math.PI); ctx.strokeStyle = OUT; ctx.lineWidth = 4.2; ctx.stroke(); ctx.strokeStyle = '#d8dee8'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.restore();
        ctx.fillStyle = '#e5484d'; rr(-1.6, -3, 3.2, 6, 1); ctx.fill();
      },
      after(A) {
        if (A.atk && A.p > 0.3 && A.p < 0.6) for (let i = 0; i < 5; i++) { const q = (A.p - 0.3) / 0.3, a = i * 1.25; ctx.fillStyle = `rgba(255,210,63,${1 - q})`; ctx.fillRect(A.handF[0] + 18 + Math.cos(a) * q * 10, A.handF[1] + Math.sin(a) * q * 10, 2, 2); }
      },
    });
  }


  // Runengolem: Steinkoloss mit leuchtenden Runen, zwei kleine Runensteine kreisen um seinen Kopf
  function golem(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 7, 26), sw = h ? h.swing : 0, gl = 0.6 + 0.4 * Math.sin(t * 2.2), RC = '70,212,238';
    const stone = (y0, y1) => LG(y0, y1, '#a3aab8', '#555c6b');
    // Runensteine hinter dem Kopf
    const orb = i => { const a = t * 1.6 + i * Math.PI; return [Math.cos(a) * 22, -84 + Math.sin(a) * 6, Math.sin(a) < 0]; };
    for (let i = 0; i < 2; i++) { const [ox, oy, back] = orb(i); if (back) { rr(ox - 3.5, oy - 3.5, 7, 7, 2); fillO(stone(oy - 4, oy + 4)); glowDot(ox, oy, 6, RC, 0.5 * gl); } }
    // hinterer Arm
    const gb = gearIt('koerper'), gpad = (x0, y0, back) => { if (!gb || !gb.pads) return; ctx.save(); ctx.translate(x0, y0); ctx.scale(1.5, 1.5); gearPad(gb, t, back); ctx.restore(); };
    if (!h || h.alive) gearAura(t);
    if (gb && gb.cape) { ctx.save(); ctx.translate(-4, -30); ctx.scale(1.25, 1.25); gearCape(gb, { sh: [-6, -28] }, t, walk); ctx.restore(); }
    tintSeg('koerper', () => {
    ctx.save(); ctx.translate(-14, -58); ctx.rotate(0.15 - step * 0.15); rr(-6, 0, 11, 24, 4); fillO(LG(0, 24, '#7f8695', '#434a58')); rr(-7, 22, 14, 12, 4); fillO(LG(22, 34, '#7f8695', '#3c4250')); ctx.restore();
    });
    gpad(-14, -61, true);
    const GL = [];
    tintSeg('beine', () => {
    { const ph = t * 7; for (const [lx, q, back] of [[-8, ph + Math.PI, 1], [8, ph, 0]]) { const a1 = walk ? Math.sin(q) * 0.35 : 0, k1 = walk ? Math.max(0, Math.cos(q)) * 0.6 : 0;
      const kn = limb(lx, -26, a1, 12, 12, back ? '#6f7686' : '#9aa1ae', back ? null : 'rgba(255,255,255,.18)'); const ft = limb(kn[0], kn[1], a1 - k1, 11, 11, back ? '#636a7a' : '#8a919e');
      rr(ft[0] - 8, Math.min(0, ft[1]) - 6, 17, 6, 2.5); fillO(LG(-6, 0, back ? '#6a7180' : '#a3aab8', '#4a5060')); GL.push({ kn, ft, back }); } }
    });
    { const gl = gearIt('beine'); if (gl) for (const q of GL) { ctx.save(); ctx.translate(q.ft[0], Math.min(0, q.ft[1])); ctx.scale(1.55, 1.55); gearBoot(gl, [0, 0], [(q.kn[0] - q.ft[0]) / 1.55, (q.kn[1] - Math.min(0, q.ft[1])) / 1.55], t, q.back, walk); ctx.restore(); } }
    tintSeg('koerper', () => {
    // Rumpf: kantiger Fels
    ctx.beginPath(); ctx.moveTo(-17, -22); ctx.lineTo(18, -22); ctx.lineTo(24, -44); ctx.lineTo(21, -64); ctx.lineTo(6, -70); ctx.lineTo(-14, -68); ctx.lineTo(-23, -56); ctx.lineTo(-21, -36); ctx.closePath(); fillO(stone(-70, -22));
    ctx.strokeStyle = 'rgba(40,44,56,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-17, -40); ctx.lineTo(-8, -46); ctx.lineTo(-10, -56); ctx.moveTo(12, -30); ctx.lineTo(17, -42); ctx.moveTo(4, -64); ctx.lineTo(0, -58); ctx.stroke();
    // Moos auf den Schultern
    ctx.fillStyle = '#5f8f4a'; for (const [mx, my, mr] of [[-16, -64, 5], [-10, -68, 4], [16, -66, 4.5]]) { ctx.beginPath(); ctx.ellipse(mx, my, mr, mr * 0.55, 0, 0, 7); ctx.fill(); }
    // Rune auf der Brust
    ctx.save(); ctx.strokeStyle = `rgba(${RC},${0.75 + 0.25 * gl})`; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, -34); ctx.moveTo(0, -58); ctx.lineTo(8, -51); ctx.lineTo(0, -45); ctx.lineTo(9, -36); ctx.moveTo(-9, -52); ctx.lineTo(-5, -48); ctx.stroke(); ctx.restore();
    glowDot(2, -47, 18, RC, 0.35 * gl);
    });
    if (gb && gb.over) { ctx.save(); gb.over({}, t); ctx.restore(); }
    { const gh = gearIt('kopf');
    tintSeg('kopf', () => {
    // Kopf: kleiner Block, leicht nach vorne geneigt
    ctx.save(); ctx.translate(4, -70); ctx.rotate(0.06); rr(-10, -15, 21, 16, 4); fillO(LG(-15, 1, '#b3b9c6', '#646b7a'));
    ctx.fillStyle = '#2a2e38'; ctx.fillRect(-1, -9, 11, 4);
    ctx.fillStyle = `rgba(${RC},${0.8 + 0.2 * gl})`; ctx.fillRect(1, -8.5, 3, 2.5); ctx.fillRect(6, -8.5, 3, 2.5); glowDot(5, -7, 8, RC, 0.6 * gl);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-8, -14, 8, 2); ctx.restore();
    });
    if (gh && gh.over) { ctx.save(); ctx.translate(4.5, -70); ctx.rotate(0.06); gh.over({}, t); ctx.restore(); } }
    tintSeg('koerper', () => {
    // vorderer Arm mit Faust, schlägt nach vorne
    ctx.save(); ctx.translate(15, -60); ctx.rotate(sw > 0 ? -0.2 - Math.sin(sw * Math.PI) * 1.1 : 0.2 + Math.sin(t * 1.7) * 0.04);
    rr(-5, 0, 12, 26, 4); fillO(LG(0, 26, '#aab1bf', '#5a6170')); rr(-7, 23, 16, 14, 4); fillO(LG(23, 37, '#b5bbc8', '#5a6170'));
    ctx.strokeStyle = `rgba(${RC},${0.7 + 0.3 * gl})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, 27); ctx.lineTo(4, 33); ctx.moveTo(4, 27); ctx.lineTo(-2, 33); ctx.stroke(); glowDot(1, 30, 9, RC, (0.4 + sw * 0.6) * gl);
    ctx.restore();
    });
    gpad(16, -61, false);
    for (let i = 0; i < 2; i++) { const [ox, oy, back] = orb(i); if (!back) { rr(ox - 3.5, oy - 3.5, 7, 7, 2); fillO(stone(oy - 4, oy + 4)); ctx.fillStyle = `rgba(${RC},.9)`; ctx.fillRect(ox - 0.8, oy - 2.5, 1.6, 5); glowDot(ox, oy, 7, RC, 0.6 * gl); } }
    if (!h || h.alive) gearFx({ head: [4, -78] }, t);
    ctx.restore();
  }
  // ---------- Meisterschafts-Skins: echtes Umfärben statt Farbfilter ----------
  // Während ein Held mit Skin gezeichnet wird, läuft jede Farbe (Füllung, Linie, Verlauf, Leuchtpunkt) durch eine Farbtabelle.
  // Form und Animation bleiben gleich. Haut, Augen, Umrisse und Weiß bleiben unverändert.
  // h1/h2 = Haupt- und Zweitfarbton, sat/lm/la = Sättigung und Helligkeit, metal = Farbe für Metall und Grau, gold = Farbe für Gold.
  const SKIN_PAL = {
    nacht: { h1: 228, h2: 268, spread: 0.35, sat: 0.95, lm: 0.82, la: 0, metal: [220, 0.16, 0.92, 0], gold: [205, 0.55, 1.05] },
    glut: { h1: 12, h2: 34, spread: 0.3, sat: 1.1, lm: 0.85, la: 0, metal: [250, 0.06, 0.5, 0.03], gold: [30, 0.95, 1.05] },
    ahnen: { h1: 44, h2: 34, spread: 0.2, sat: 0.9, lm: 0.72, la: 0.24, metal: [42, 0.3, 0.95, 0.08], gold: [46, 0.9, 1.1] },
  };
  const rgbHsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l]; };
  const hslRgb = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; s = clamp01(s); l = clamp01(l); if (!s) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = tt => { tt = (tt + 1) % 1; return tt < 1 / 6 ? p + (q - p) * 6 * tt : tt < 0.5 ? q : tt < 2 / 3 ? p + (q - p) * (2 / 3 - tt) * 6 : p; };
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)]; };
  const hueDist = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return d; };
  function skinRgb(P, h0, r, g, b) {
    const [h, s, l] = rgbHsl(r, g, b);
    if (l < 0.16 || l > 0.96) return [r, g, b];                                           // Umriss, Schwarz, reines Weiß
    if (s < 0.14) { const [mh, ms, mm, ma] = P.metal; return hslRgb(mh, ms, l * mm + ma); }  // Metall, Grau, Stoffweiß
    if (h >= 10 && h <= 42 && s >= 0.2 && l >= 0.6 && l <= 0.93) return [r, g, b];        // Haut
    if (h >= 38 && h <= 60 && s >= 0.55 && l >= 0.45) { const [gh, gs, gm] = P.gold; return hslRgb(gh, gs * s, l * gm); } // Gold
    const d = hueDist(h, h0), nh = Math.abs(d) > 100 ? P.h2 + d * 0.15 : P.h1 + d * P.spread;
    return hslRgb(nh, s * P.sat, l * P.lm + P.la);
  }
  const SKIN_CACHE = new Map();
  function skinColor(P, key, h0, c) {
    if (typeof c !== 'string') return c;
    const ck = key + '|' + c; let v = SKIN_CACHE.get(ck); if (v !== undefined) return v;
    let m, out = c;
    if ((m = /^#([0-9a-f]{3})$/i.exec(c))) { const [r, g, b] = [...m[1]].map(x => parseInt(x + x, 16)); const q = skinRgb(P, h0, r, g, b); out = `rgb(${q.join(',')})`; }
    else if ((m = /^#([0-9a-f]{6})$/i.exec(c))) { const n = parseInt(m[1], 16); const q = skinRgb(P, h0, (n >> 16) & 255, (n >> 8) & 255, n & 255); out = `rgb(${q.join(',')})`; }
    else if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c))) { const q = skinRgb(P, h0, +m[1], +m[2], +m[3]); out = m[4] != null ? `rgba(${q.join(',')},${m[4]})` : `rgb(${q.join(',')})`; }
    else if ((m = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/.exec(c))) { out = skinRgb(P, h0, +m[1], +m[2], +m[3]).join(','); } // "r,g,b" für Leuchtpunkte
    if (SKIN_CACHE.size > 6000) SKIN_CACHE.clear();
    SKIN_CACHE.set(ck, out); return out;
  }
  let SKIN_MAP = null; // aktive Umfärbung (für glowDot)
  const SKIN_PROPS = new Set(['fillStyle', 'strokeStyle', 'shadowColor']);
  function withSkin(id, k, fn) {
    const P = SKIN_PAL[id], hero = HERO_BY_ID[k]; if (!P || !hero) { fn(); return; }
    const n = parseInt(hero.color.slice(1), 16), h0 = rgbHsl((n >> 16) & 255, (n >> 8) & 255, n & 255)[0], key = id + k;
    withPal(P, key, h0, fn);
  }
  // Umfärben während fn läuft. raw = auf der echten Zeichenfläche, also ohne eine äußere Umfärbung (Meisterschafts-Skin)
  let PX_BASE = null;
  function withPal(P, key, h0, fn, raw) {
    const map = c => skinColor(P, key, h0, c), outer = ctx, real = raw && PX_BASE ? PX_BASE : ctx, bound = new Map();
    const grad = g => { const add = g.addColorStop; g.addColorStop = (o, c) => add.call(g, o, map(c)); return g; };
    const px = new Proxy(real, {
      get(t, p) { const v = t[p]; if (typeof v !== 'function') return v;
        if (p === 'createLinearGradient' || p === 'createRadialGradient') return (...a) => grad(v.apply(t, a));
        let b = bound.get(p); if (!b) { b = v.bind(t); bound.set(p, b); } return b; },
      set(t, p, v) { t[p] = SKIN_PROPS.has(p) ? map(v) : v; return true; },
    });
    const prevMap = SKIN_MAP, prevBase = PX_BASE; if (!PX_BASE) PX_BASE = real; ctx = px; SKIN_MAP = raw || !prevMap ? map : c => prevMap(map(c));
    try { fn(); } finally { ctx = outer; SKIN_MAP = prevMap; PX_BASE = prevBase; }
  }
  const DRAW = { r: knight, w: guard, s: archer, m: mage, p: priest, t: tamer, a: assassin, n: necro, b: bard, d: druid, e: tinker, o: golem };
  for (const k of Object.keys(DRAW)) {
    const base = DRAW[k];
    const hc = HERO_BY_ID[k] ? hexRgb(HERO_BY_ID[k].color) : null;
    const skinned = (x, h, t, walk) => {
      const pg = GEAR_CUR, pk = GEAR_K; GEAR_CUR = gearFor(k); GEAR_K = k;
      try { skinned0(x, h, t, walk); } finally { GEAR_CUR = pg; GEAR_K = pk; }
    };
    const skinned0 = (x, h, t, walk) => {
      const sk = SKIN[(S.skin || {})[k]], main = cv && (ctx.canvas === cv || (tintCv && ctx.canvas === tintCv) || (LOOK.c && ctx.canvas === LOOK.c));
      // Ahnensiegel: schwaches Licht in der Farbe des Helden, hinter der Figur
      if (main && hc && S.ahn && S.ahn.place && S.ahn.place[k] && (!h || h.alive)) {
        const pu = 0.5 + 0.5 * Math.sin(t * 1.6 + k.charCodeAt(0));
        lightPool(x, GROUND - 30, 50 + pu * 6, hc, 0.34 + pu * 0.1);
        lightPool(x, GROUND - 58, 30, hc, 0.18 + pu * 0.06);
        lightPool(x, GROUND - 1, 34, hc, 0.26 + pu * 0.06);
      }
      if (!sk || !SKIN_PAL[sk.id]) return base(x, h, t, walk);
      withSkin(sk.id, k, () => base(x, h, t, walk));
    };
    DRAW[k] = (x, h, t, walk) => {
      const hurt = h && h.alive && h.hurtT > 0 ? `rgba(255,40,40,${Math.min(0.6, 0.25 + h.hurtT * 3)})` : null;
      styled(() => skinned(x, h, t, walk), x, GROUND - 140, GROUND + 14, 78, { tint: hurt });
    };
  }
  // Begleiter und Beschwörungen bekommen denselben Look wie die Helden
  { const f = wolf; wolf = (x, t, walk, alpha) => styled(() => f(x, t, walk, alpha), x, GROUND - 60, GROUND + 8, 40); }
  { const f = minion; minion = (x, t, sw, alpha, big) => styled(() => f(x, t, sw, alpha, big), x, GROUND - 90, GROUND + 8, 40); }
  { const f = boneGiant; boneGiant = (x, t, a) => styled(() => f(x, t, a), x, GROUND - 200, GROUND + 8, 90); }
  { const f = shadowClone; shadowClone = (x, t) => styled(() => f(x, t), x, GROUND - 120, GROUND + 8, 60); }
  { const f = boar; boar = (x, t) => styled(() => f(x, t), x, GROUND - 50, GROUND + 8, 50); }
  { const f = turret; turret = (x, t, fire, alpha, small) => styled(() => f(x, t, fire, alpha, small), x, GROUND - 50, GROUND + 8, 36); }
  { const f = dragonC; dragonC = (x, y, t, a) => styled(() => f(x, y, t, a), x, y - 70, y + 50, 90); }
  { const f = owlC; owlC = (x, y, t) => styled(() => f(x, y, t), x, y - 50, y + 40, 60); }
  { const f = golemC; golemC = (x, t) => styled(() => f(x, t), x, GROUND - 130, GROUND + 8, 70); }
  { const f = phoenixC; phoenixC = (x, y, t) => styled(() => f(x, y, t), x, y - 60, y + 50, 90); }
  const HCOL = Object.fromEntries(HEROES.map(h => [h.id, h.color]));

  const campRun = { scroll: 0, fx: {} };
  function draw(t) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (cine) { drawCine(t); return; }
    const R = run && !run.dead ? run : null;
    if (R && R.shake > 0) ctx.translate((Math.random() - 0.5) * 6 * R.shake / 0.25, (Math.random() - 0.5) * 4 * R.shake / 0.25);
    const tower = R && R.mode === 'tower';
    const stage = R ? (tower ? 15 + R.stage * 2 : R.stage) : 1;
    const bm = biomeOf(stage), scroll = R ? R.scroll : 0, night = !R;
    const env = R && R.mode === 'wboss' ? ENV[WB_BOSS[R.wb.bk % WB_BOSS.length].zone % ENV.length] : R && ahnLike(R) ? ahnEnv(R) : R && areaOf(R) ? AREA_ENV[MISSION[R.mission].area] : envOf(stage, night ? 'camp' : tower ? 'tower' : 'run');
    const bgk = bgKey(R, stage, tower), painted = !!bgk && drawBg(bgk, scroll, t, night ? 250 : null);
    lookFor(bgk);
    if (!painted) { env.back(t, scroll); env.props(t, scroll); }
    if (R && !tower && !ahnLike(R) && R.mode !== 'wboss' && nightmare(stage)) {
      if (painted) { ctx.fillStyle = 'rgba(90,0,30,.18)'; ctx.fillRect(0, 0, W, H); }
      else { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(170,40,60,.7)'; ctx.fillRect(0, 0, W, H); ctx.restore(); ctx.fillStyle = 'rgba(90,0,20,.22)'; ctx.fillRect(0, 0, W, H); }
    }
    if (R) {
      const wfZ = wfZoom(R, t);
      if (wfZ < 0.995 || R.wf || R.wfKilled) wfBeast(R, t, wfZ);
      ctx.save(); if (wfZ < 0.995) { ctx.translate(150, GROUND); ctx.scale(wfZ, wfZ); ctx.translate(-150, -GROUND); }
      const walking = R.enemies.length && R.enemies[0].x > R.frontX + 54;
      // Zerfall besiegter Gegner: weiß aufblitzen, zusammensacken, Funken
      for (const c of R.corpses || []) { const e = c.e, q = Math.min(1, c.t / 0.5); if (e.wf) continue;
        ctx.save(); ctx.globalAlpha = (1 - q) ** 1.5; ctx.translate(e.x, GROUND); ctx.scale(1 + q * 0.35, Math.max(0.05, 1 - q * 0.85)); ctx.translate(-e.x, -GROUND);
        e.hitT = 0.15; e._flT = t; enemy(e, t); ctx.restore();
        const n = e.boss ? 18 : 8, hgt = e.boss ? 90 : 30;
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + e.bob, r = 6 + q * (e.boss ? 70 : 28); glowDot(e.x + Math.cos(a) * r, GROUND - hgt * 0.6 + Math.sin(a) * r * 0.6 - q * 10, (e.boss ? 5 : 3) * (1 - q), i % 2 ? '255,236,170' : '255,255,255', 0.9 * (1 - q)); }
      }
      [...R.enemies].sort((a, b) => b.x - a.x).forEach(e => !e.wf && enemy(e, t));
      if (R.fx.wurzel > 0 || R.enemies.some(e => e.rooted > 0)) R.enemies.filter(e => e.rooted > 0).forEach(e => { ctx.strokeStyle = '#5e8c3a'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(e.x - 12 + i * 12, GROUND); ctx.quadraticCurveTo(e.x - 18 + i * 12, GROUND - 14, e.x - 8 + i * 10, GROUND - 22); ctx.stroke(); } });
      if (R.enemies.some(e => e.frozen > 0)) R.enemies.filter(e => e.frozen > 0).forEach(e => { ctx.fillStyle = 'rgba(180,225,255,.45)'; rr(e.x - 18, GROUND - 50, 36, 50, 6); ctx.fill(); });
      // Helden von hinten nach vorne zeichnen
      [...R.order].reverse().filter(k => !R.h[k].alive).forEach(k => drawFallen(R, k, t));
      [...R.order].reverse().filter(k => R.h[k].alive).forEach(k => drawHero(k, R.pos[k], R.h[k], t, walking));
      if (R.h.e && R.h.e.alive && st.e) { const n = st.e.turrets + (R.extraTurretT > 0 ? 1 : 0), fire = R.turretT > 0.85 / Math.max(0.2, st.e.turretAps) ? 1 : 0; for (let i = 0; i < n; i++) turret(R.pos.e + 24 + i * 16, t, fire, i >= st.e.turrets ? 0.9 : 1); if (R.tinkT > 0) turret(R.pos.e + 24 + n * 16, t, fire, Math.min(1, R.tinkT * 2), true); }
      R.minions.forEach((mi, i) => minion(R.frontX + 26 + (i % 4) * 10 + (i >= 4 ? 5 : 0), t, mi.swing || 0, Math.min(1, mi.t * 2), (mi.mul || 1) > 1));
      if (R.h.t && R.h.t.alive) {
        const n = st.t.wolves + (R.packT > 0 ? 2 + st.t.packBonus : 0);
        for (let i = 0; i < n; i++) wolf(R.frontX + 22 - i * 10 + (i >= st.t.wolves ? 6 : 0), t, walking, i >= st.t.wolves ? 0.75 : 1);
      }
      for (const k of R.order) {
        const h = R.h[k]; if (!h.alive) continue;
        const y = GROUND - (k === 'w' || k === 'o' ? 96 : k === 'm' ? 92 : 88);
        ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(R.pos[k] - 14, y, 28, 5, 2); ctx.fill();
        ctx.fillStyle = HCOL[k]; rr(R.pos[k] - 14, y, 28 * Math.max(0, h.hp / st[k].hp), 5, 2); ctx.fill();
        if (h.shield > 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(R.pos[k] - 14, y - 4, 28 * Math.min(1, h.shield / st[k].hp), 3, 1.5); ctx.fill();
          ctx.strokeStyle = 'rgba(255,228,138,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(R.pos[k], GROUND - 40, 20, 46, 0, 0, 7); ctx.stroke(); }
      }
      if (ahnLike(R)) ahnWorld(R, t);
      drawComps(t, R);
      // Geschosse
      for (const a of R.arrows) {
        const p = Math.min(1, a.t / a.d), arc = a.kind === 'hag' ? 50 : a.kind === 'feuer' || a.kind === 'licht' ? 6 : 14;
        const x = a.x + (a.tx - a.x) * p, y = a.y + (a.ty - a.y) * p - Math.sin(p * Math.PI) * arc;
        if (a.kind === 'feuer') { ctx.fillStyle = 'rgba(255,140,60,.35)'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); continue; }
        if (a.kind === 'kunai') { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 25); ctx.fillStyle = '#d8dce4'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -1.5); ctx.lineTo(7, 0); ctx.lineTo(0, 1.5); ctx.fill(); } ctx.restore(); continue; }
        if (a.kind === 'nekro') { ctx.fillStyle = 'rgba(107,224,184,.35)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#c8ffe8'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); continue; }
        if (a.kind === 'note') { ctx.fillStyle = '#ff8ac8'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♪', x, y + 5 + Math.sin(p * 12) * 3); continue; }
        if (a.kind === 'bomb') { ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = Math.sin(t * 40) > 0 ? '#ffd23f' : '#ff7a3d'; ctx.fillRect(x + 2, y - 7, 2, 3); if (p > 0.92) { ctx.fillStyle = 'rgba(255,170,60,.7)'; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); } continue; }
        if (a.kind === 'shot') { ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x - 3, y - 1, 6, 2); continue; }
        if (a.kind === 'licht') { ctx.strokeStyle = 'rgba(255,240,170,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 6, y); ctx.stroke(); continue; }
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(a.ty - a.y - Math.cos(p * Math.PI) * arc * Math.PI, a.tx - a.x));
        ctx.fillStyle = a.kind === 'gift' ? '#9be36b' : '#e8e2d0'; ctx.fillRect(-9, -1, 14, 2); ctx.fillStyle = '#b7bcc6'; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, 0); ctx.lineTo(5, 3); ctx.fill();
        ctx.restore();
      }
      // Geschosse der Gegner
      for (const s of R.eshots) {
        const st = SHOT_STYLE[s.kind] || ['blob', '170,120,240'], kind = st[0], rgb = st[1];
        const p = Math.min(1, s.t / s.d), arc = kind === 'blob' || kind === 'stone' || kind === 'seed' || kind === 'spore' ? 42 : kind === 'arrow' ? 16 : 8;
        const x = s.x + (s.tx - s.x) * p, y = s.y + (s.ty - s.y) * p - Math.sin(p * Math.PI) * arc;
        if (kind === 'fire') { glowDot(x + 4, y, 11, rgb, 0.6); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 2, 0, 7); ctx.fill(); }
        else if (kind === 'ice') { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 12); glowDot(0, 0, 8, rgb, 0.5); ctx.fillStyle = '#e6f8ff'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(3, 0); ctx.lineTo(0, 6); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
        else if (kind === 'arrow') { const a = Math.atan2(-(s.ty - s.y) + Math.cos(p * Math.PI) * arc * Math.PI, -(s.tx - s.x)); ctx.save(); ctx.translate(x, y); ctx.rotate(-a + Math.PI); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-9, -1, 14, 2); ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, 0); ctx.lineTo(5, 3); ctx.fill(); ctx.fillStyle = '#c44a3a'; ctx.fillRect(-10, -2.5, 3, 1.5); ctx.fillRect(-10, 1, 3, 1.5); ctx.restore(); }
        else if (kind === 'stone' || kind === 'seed') { ctx.fillStyle = kind === 'seed' ? '#c9a46a' : '#9aa3ad'; ctx.beginPath(); ctx.ellipse(x, y, 3.2, kind === 'seed' ? 2.2 : 3, t * 8, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.stroke(); }
        else if (kind === 'web') { ctx.strokeStyle = 'rgba(240,248,255,.9)'; ctx.lineWidth = 1; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 5); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 6, Math.sin(an) * 6); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 7); ctx.stroke(); ctx.restore(); }
        else if (kind === 'star') { glowDot(x, y, 9, rgb, 0.7); ctx.save(); ctx.translate(x, y); ctx.rotate(t * 8); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 1.6 : 5, an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
        else if (kind === 'bolt') { ctx.strokeStyle = '#fff8c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, y - 3); ctx.lineTo(x + 4, y + 2); ctx.lineTo(x, y - 2); ctx.lineTo(x - 6, y + 2); ctx.stroke(); glowDot(x, y, 8, rgb, 0.6); }
        else if (kind === 'ring') { for (let i = 0; i < 2; i++) { ctx.strokeStyle = `rgba(${rgb},${0.9 - i * 0.35})`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x + i * 6, y, 4 + i * 2, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke(); } }
        else if (kind === 'orb' || kind === 'spore') { glowDot(x, y, 9, rgb, 0.75); ctx.fillStyle = `rgb(${rgb})`; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.2, 0, 7); ctx.fill(); }
        else { ctx.fillStyle = `rgba(${rgb},.95)`; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - 1.5, y - 1, 1.6, 1, 0, 0, 7); ctx.fill(); }
      }
      // Effekte der Fähigkeiten
      const fx = R.fx;
      if (fx.wirbel > 0 && R.pos.r) { ctx.strokeStyle = `rgba(255,220,150,${fx.wirbel * 1.6})`; ctx.lineWidth = 5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(R.pos.r, GROUND - 30, 40 + i * 22 + (0.5 - fx.wirbel) * 80, t * 12 + i, t * 12 + i + 2.4); ctx.stroke(); } }
      if (fx.blitz > 0) bolt(fx.blitzX, fx.blitz, '210,235,255');
      if (fx.heil > 0) { ctx.fillStyle = `rgba(126,224,138,${fx.heil * 0.5})`; ctx.beginPath(); ctx.arc(R.frontX - 40, GROUND - 40, 120 * (1 - fx.heil), 0, 7); ctx.fill(); }
      if (fx.w_wall > 0 && R.pos.w) { ctx.strokeStyle = `rgba(127,178,255,${fx.w_wall * 1.6})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(R.pos.w + 20, GROUND - 10, 30 + (0.5 - fx.w_wall) * 220, -1.2, 0.2); ctx.stroke(); }
      if (fx.m_meteor > 0) { const p = 1 - fx.m_meteor * 2; for (let i = 0; i < 4; i++) { const mx = 230 + i * 60, my = -20 + p * (GROUND - 10); ctx.fillStyle = 'rgba(255,120,40,.4)'; ctx.beginPath(); ctx.arc(mx - 10, my - 16, 12, 0, 7); ctx.fill(); ctx.fillStyle = '#ffb070'; ctx.beginPath(); ctx.arc(mx, my, 9, 0, 7); ctx.fill(); }
        if (fx.m_meteor < 0.15) { ctx.fillStyle = `rgba(255,170,80,${fx.m_meteor * 3})`; ctx.fillRect(0, 0, W, H); } }
      if (fx.m_eis > 0) { ctx.fillStyle = `rgba(190,230,255,${fx.m_eis * 0.6})`; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 20; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(hash(i) * W, (hash(i + 3) * GROUND + t * 120) % GROUND, 2, 2); } }
      if (fx.m_kette > 0 && fx.chain) { ctx.strokeStyle = `rgba(226,201,255,${fx.m_kette * 2})`; ctx.lineWidth = 3; ctx.beginPath(); let px = R.pos.m || 60, py = GROUND - 60; ctx.moveTo(px, py); for (const x of fx.chain) { for (let j = 1; j <= 3; j++) ctx.lineTo(px + (x - px) * j / 3 + (Math.random() - 0.5) * 12, py + (GROUND - 30 - py) * j / 3 + (Math.random() - 0.5) * 14); px = x; py = GROUND - 30; } ctx.stroke(); }
      if (fx.s_falke > 0) bird(fx.falkeX, fx.s_falke, t);
      if (fx.a_schatten > 0 && fx.shadowXs) fx.shadowXs.forEach(sx => { ctx.fillStyle = `rgba(60,20,80,${fx.a_schatten * 1.2})`; ctx.beginPath(); ctx.arc(sx + 14, GROUND - 26, 22, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(255,107,122,${fx.a_schatten * 2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 12, GROUND - 46); ctx.lineTo(sx + 12, GROUND - 10); ctx.moveTo(sx + 12, GROUND - 46); ctx.lineTo(sx - 12, GROUND - 10); ctx.stroke(); });
      if (fx.n_raub > 0 && fx.raubX) { ctx.strokeStyle = `rgba(107,224,184,${fx.n_raub * 2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx.raubX, GROUND - 30); ctx.quadraticCurveTo((fx.raubX + (R.pos.n || 80)) / 2, GROUND - 120, R.pos.n || 80, GROUND - 60); ctx.stroke(); }
      if (fx.n_fluch > 0) { ctx.fillStyle = `rgba(40,120,90,${fx.n_fluch * 0.5})`; ctx.fillRect(R.frontX + 30, 0, W, H); }
      R.enemies.forEach(e => { if (e.cursed > 0) { ctx.fillStyle = 'rgba(107,224,184,.8)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☠', e.x, GROUND - (e.boss ? 176 : 66)); } });
      if (R.songT > 0) for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,138,200,${Math.min(1, R.songT) * 0.8})`; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i % 2 ? '♫' : '♪', 40 + ((i * 47 + t * 40) % 200), GROUND - 90 - Math.sin(t * 3 + i) * 12); }
      if (fx.b_wiegen > 0) R.enemies.filter(e => e.sleep > 0).forEach(e => { ctx.fillStyle = 'rgba(220,220,255,.9)'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('z', e.x + 8, GROUND - 70 - (t * 20 % 14)); });
      if (fx.b_schall > 0 && fx.schallX) { const rr2 = (0.5 - fx.b_schall) * 500; ctx.strokeStyle = `rgba(255,138,200,${fx.b_schall * 1.8})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(fx.schallX, GROUND - 40, rr2, -0.8, 0.8); ctx.stroke(); }
      if (R.roarT > 0) { ctx.strokeStyle = `rgba(155,209,74,${Math.min(1, R.roarT) * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(R.frontX - 50, GROUND - 40, 110, 56, 0, 0, 7); ctx.stroke(); }
      if (fx.d_adler > 0 && fx.adlerXs) fx.adlerXs.forEach((ax, i) => bird(ax + i * 6, fx.d_adler, t + i));
      if (fx.t_sprung > 0 && fx.sprungX) wolf(fx.sprungX - 20 * fx.t_sprung * 2, t, true);
      if (fx.p_segen > 0 || fx.p_schild > 0) { const v = Math.max(fx.p_segen || 0, fx.p_schild || 0); ctx.fillStyle = `rgba(255,228,138,${v * 0.35})`; ctx.fillRect(0, 0, W, H); }
      if (fx.p_wieder > 0) { ctx.fillStyle = `rgba(255,240,180,${fx.p_wieder})`; ctx.fillRect(0, 0, W, 6); }
      if (R.buffT > 0) { ctx.strokeStyle = 'rgba(255,181,71,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(R.frontX - 50, GROUND + 2, 90 + Math.sin(t * 10) * 3, 8, 0, 0, 7); ctx.stroke(); }
      golemFx(R, t); sigFx(R, t);
      if (R.fx.phoenix > 0) { ctx.fillStyle = `rgba(255,154,61,${Math.min(1, R.fx.phoenix) * 0.4})`; ctx.fillRect(0, 0, W, H); }
      env.front(t, scroll);
      if (ahnLike(R)) ahnScreen(R, t);
      statusIcons(R, t);
      if (!tower && !ahnLike(R) && nightmare(stage)) { parts(t, 14, { type: 'ember', rgb: '255,60,60', vx: 4, vy: -18, size: 1.4, alpha: 0.8, seed: 40 }); vignette(0.45, '60,0,10'); }
      for (const p of R.parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); }
      ctx.globalAlpha = 1;
      for (const f of R.floats) { ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = `${f.size}px "Bungee","Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); }
      ctx.globalAlpha = 1; ctx.restore();
      if (R.wf || R.wfKilled) wfHud(R, t);
      ctx.globalAlpha = 1;
      const hg = ctx.createLinearGradient(0, 0, 0, 40); hg.addColorStop(0, 'rgba(15,12,22,.75)'); hg.addColorStop(1, 'rgba(15,12,22,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 40);
      if (ahnLike(R)) ahnHud(R, t); else {
      ctx.font = '15px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
      ctx.fillText(tower ? `Turm · Etage ${R.stage}` : R.mode === 'wboss' ? 'Wochenboss' : `Stufe ${R.stage}`, 12, 22);
      ctx.font = '12px "Figtree",sans-serif';
      const bossNow = R.mode === 'exp' || R.mode === 'wboss' ? R.enemies.some(e => e.boss) : tower || (R.rules && R.rules.includes('boss')) ? R.stage % 5 === 0 : R.stage % 10 === 0;
      ctx.fillStyle = bossNow ? '#c9a6ff' : 'rgba(255,255,255,.8)';
      ctx.fillText(R.wf || R.wfKilled ? 'Der Weltenfresser' : bossNow ? `Boss: ${bossNameOf(R, stage)}` : tower ? `Rekord ${S.towerBest}` : areaOf(R) ? areaOf(R).name : `${zoneName(R.stage)} · Grenze ${st.cap === Infinity ? '∞' : st.cap}`, tower ? 170 : 106, 21);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffcf4a'; if (R.mode === 'normal') ctx.fillText(`+${fmt(R.gold)} Gold`, W - 12, 21);
      if (R.mode === 'weekly') { ctx.fillStyle = '#ffd23f'; ctx.fillText('Tages-Herausforderung', W - 12, 21); }
      if (R.mode === 'wboss') { ctx.fillStyle = '#ffb4b4'; ctx.fillText(`Leiste ${wbScore(R) + 1} · ${wbScore(R)} geschafft`, W - 12, 21); }
      if (R.mode === 'exp') { const ms = MISSION[R.mission]; ctx.fillStyle = '#c8f08a'; ctx.fillText(`${ms.name}: ${ms.bosses ? `Bosse ${R.bossKills}/${ms.bosses}` : `Welle ${R.waves}/${ms.waves}`}`, W - 12, 21); }
      }
      if (R.bannerT > 0) {
        const a = Math.max(0, Math.min(1, R.bannerT * 2, (2.2 - R.bannerT) * 4)), y = 92;
        ctx.globalAlpha = a; ctx.fillStyle = 'rgba(30,10,40,.75)'; ctx.fillRect(0, y - 26, W, 44);
        ctx.fillStyle = '#c9a6ff'; ctx.fillRect(0, y - 26, W, 2); ctx.fillRect(0, y + 16, W, 2);
        ctx.textAlign = 'center'; ctx.font = '22px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(`BOSS · ${bossNameOf(R, stage)}`, W / 2 + (1 - a) * 40, y + 4);
        ctx.globalAlpha = 1;
      }
    } else {
      // Lager
      const fx = 250, frgb = fireRGB();
      if (painted) decoBack(t);
      lightPool(fx, GROUND - 14, 150 + Math.sin(t * 5) * 6, frgb, 0.32); lightPool(fx, GROUND - 8, 60, frgb === '255,150,60' ? '255,200,120' : frgb, 0.25);
      if (!painted) { ctx.beginPath(); ctx.moveTo(350, GROUND); ctx.lineTo(400, GROUND - 70); ctx.lineTo(450, GROUND); fillO('#7a6046');
      ctx.fillStyle = '#2a1f17'; ctx.beginPath(); ctx.moveTo(390, GROUND); ctx.lineTo(400, GROUND - 32); ctx.lineTo(410, GROUND); ctx.fill(); }
      if (!painted) {
      ctx.fillStyle = S.asc ? rankOf(S.asc).col : '#e5484d'; ctx.beginPath(); ctx.moveTo(400, GROUND - 70); ctx.lineTo(400, GROUND - 88); ctx.lineTo(417 + Math.sin(t * 3) * 1.5, GROUND - 82); ctx.lineTo(400, GROUND - 76); ctx.fill(); }
      if (!painted) campFire(fx, t, true);
      if (!(run && run.dead) && !intro) { const pa = 0.25 + 0.2 * Math.sin(t * 3); ctx.strokeStyle = `rgba(255,210,140,${pa})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.ellipse(fx, GROUND + 2, 40, 9, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      const camp = campHeroes();
      const spots = {}; let fr = 0, bk = 0;
      for (const k of ['w', 'o', 'd', 't']) if (camp.includes(k)) spots[k] = 296 + 30 * fr++ + (k === 'o' ? 4 : 0);
      for (const k of ['r', 's', 'a', 'm', 'n', 'b', 'e', 'p']) if (camp.includes(k)) spots[k] = 210 - 30 * bk++;
      // Einstieg: Ritter sitzt am Feuer, steht auf, die anderen kommen per Lichtstrahl dazu
      const IT = introTimes(camp), it = intro ? (intro.t0 == null ? -1 : t - intro.t0) : 99;
      if (intro && intro.t0 != null && it > IT.end + 0.8) intro = null;
      const uiA = Math.max(0, Math.min(1, (it - IT.end) / 0.6)), others = camp.filter(k => k !== 'r');
      if (intro && it >= 0.2 && !intro.sUp) { intro.sUp = 1; SND.play('aufstehen'); }
      if (intro && others.length && it >= IT.start - 0.1 && !intro.sTp) { intro.sTp = 1; SND.play('teleport'); }
      campLog(194);
      if (it < 99) {
        const kx = spots.r || 210, kR = it < 0 ? 0 : Math.max(0, Math.min(1, (it - 0.25) / 0.6));
        if (kR <= 0) knightSit(194, t, it < 0 ? 0 : Math.min(1, it / 0.25) * 0.14, true);
        else { const pa = ctx.globalAlpha, gone = camp.includes('r') ? 1 : Math.max(0, 1 - (it - 1) / 0.4); ctx.globalAlpha = pa * gone; if (gone > 0) knightRise(194, kx, t, kR); ctx.globalAlpha = pa; }
      }
      others.forEach((k, i) => {
        const tb = it - (IT.start + IT.gap * i), a = it >= 99 ? 1 : it < 0 ? 0 : Math.max(0, Math.min(1, (tb - 0.16) / 0.2));
        if (a > 0) { const pa = ctx.globalAlpha; ctx.globalAlpha = pa * a; DRAW[k](spots[k], null, t, false); if (k === 't') wolf(spots.t + 32, t, false); if (k === 'e') turret(spots.e - 22, t, 0); ctx.globalAlpha = pa; }
        if (it < 99 && it >= 0) heroBeam(spots[k], (HEROES.find(h => h.id === k) || HEROES[0]).color, tb);
      });
      if (it >= 99 && camp.includes('r')) DRAW.r(spots.r, null, t, false);
      if (uiA > 0) { const pa = ctx.globalAlpha; ctx.globalAlpha = pa * uiA; drawComps(t, null); ctx.globalAlpha = pa; }
      if (painted) decoFront(t);
      noticeBoard(t, painted);
      env.front(t, 0);
      ctx.globalAlpha = uiA;
      ctx.textAlign = 'center'; ctx.font = '20px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#ffb547';
      const done = run && run.dead;
      ctx.fillText(done ? (run.mode === 'tower' ? `Turm: Etage ${run.stage}` : run.victory ? `Stufengrenze ${st.cap} erreicht!` : run.wf ? 'Vom Weltenfresser verschlungen' : `Gefallen auf Stufe ${run.stage}`) : S.asc ? `Lager · ${rankOf(S.asc).name}` : 'Lager', W / 2, 42);
      ctx.font = '12px "Figtree",sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText(done ? `${run.kills} Gegner${run.gold ? ` · +${fmt(run.gold)} Gold` : ''}${run.souls ? ` · +${run.souls} Seelen` : ''}${run.runes.length ? ` · ${run.runes.length} Runen` : ''}` : 'Lagerfeuer: Truppe anpassen · Brett links: Abenteuer wählen', W / 2, 64);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  /* ---------- Lager-Deko ---------- */
  // Das Lagerbild ist gemalt. Zelt und Feuer werden umgefärbt (Pixel des Bildausschnitts), alles andere wird dazugezeichnet.
  // Bild -> Welt: x * 0.302 - 1.26, y * 0.302 - 18.7
  let DECO_OVR = null; // Vorschau im Fenster: { slot: id }
  const decoOf = slot => { const o = DECO_OVR && slot in DECO_OVR ? DECO_OVR[slot] : (S.camp || {})[slot]; return o && ITEMS[o] ? ITEMS[o] : null; };
  const HERO_GLYPH = { a: '☾', n: '☠', b: '♪', d: '❀', e: '⚙', o: 'ᛟ' };
  const TENT_R = [1250, 495, 400, 320], FIRE_PAD = 10;
  const DECO_CACHE = {};
  // Ausschnitt des Lagerbilds umfärben: Pixel im Farbbereich [h0,h1] bekommen Farbton und Sättigung der Zielfarbe
  function recolorCrop(key, rect, hueRange, target, minS = 0.25, light, minL = 0) {
    if (DECO_CACHE[key]) return DECO_CACHE[key];
    const img = bgImg('lager'); if (!img || !img.complete || !img.naturalWidth) return null;
    const [x, y, w, h] = rect, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.drawImage(img, x, y, w, h, 0, 0, w, h);
    let d; try { d = g.getImageData(0, 0, w, h); } catch (e) { return null; }
    const n = parseInt(target.slice(1), 16), [th, ts, tl] = rgbHsl((n >> 16) & 255, (n >> 8) & 255, n & 255), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const [hh, s, l] = rgbHsl(p[i], p[i + 1], p[i + 2]);
      if (s < minS || l < minL || hh < hueRange[0] || hh > hueRange[1]) continue;
      const nl = light ? Math.min(0.97, l * light[0] + light[1]) : tl < 0.3 ? l * 0.45 + 0.04 : l;
      const q = hslRgb(th + (hh - (hueRange[0] + hueRange[1]) / 2) * 0.3, Math.min(1, ts * (0.6 + s * 0.6)), nl); p[i] = q[0]; p[i + 1] = q[1]; p[i + 2] = q[2];
    }
    g.putImageData(d, 0, 0); return (DECO_CACHE[key] = c);
  }
  const W_OF = (ix, iy) => [ix * LOBBY_S + 250 - 832 * LOBBY_S, iy * LOBBY_S + GROUND - 797 * LOBBY_S];
  const decoCol = it => (it.kind === 'hero' ? HERO_BY_ID[it.hero].color : it.kind === 'stern' ? '#fff2b0' : it.col || '#ffffff');
  // Feuer: welches Bild soll das gemalte Feuer verwenden (für drawBg) und welche Lichtfarbe
  function fireSrc() {
    const it = decoOf('feuer'); if (!it) return null;
    const M = BG_META.lager, [fx, fy, fw, fh] = M.fire, r = [fx - FIRE_PAD, fy - FIRE_PAD, fw + FIRE_PAD * 2, fh + FIRE_PAD];
    const c = recolorCrop('f' + it.id, r, [0, 62], decoCol(it), 0.3, it.kind === 'stern' ? [0.4, 0.58] : null, 0.42);
    return c ? { c, pad: FIRE_PAD } : null;
  }
  const fireRGB = () => { const it = decoOf('feuer'); return it ? hexRgb(decoCol(it)) : '255,150,60'; };
  // Zelt
  function decoTent(t) {
    const it = decoOf('zelt'); if (!it) return;
    if (it.kind === 'pav') { pavilion(t); return; }
    const c = recolorCrop('z' + it.id, TENT_R, [18, 52], decoCol(it), 0.22); if (!c) return;
    const [x, y] = W_OF(TENT_R[0], TENT_R[1]); ctx.drawImage(c, x, y, TENT_R[2] * LOBBY_S, TENT_R[3] * LOBBY_S);
    if (it.kind === 'hero') {
      const [ex, ey] = W_OF(1435, 690); ctx.beginPath(); ctx.arc(ex, ey, 9, 0, 7); fillO('rgba(255,248,230,.92)');
      ctx.fillStyle = HERO_BY_ID[it.hero].color; ctx.font = 'bold 12px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(HERO_GLYPH[it.hero] || '✦', ex, ey + 0.5); ctx.textBaseline = 'alphabetic';
      const [px, py] = W_OF(1440, 505); ctx.fillStyle = HERO_BY_ID[it.hero].color; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 17 + Math.sin(t * 3) * 1.5, py + 5); ctx.lineTo(px, py + 10); ctx.fill();
    }
  }
  function pavilion(t) {
    const x0 = 372, x1 = 500, top = 168, base = GROUND + 2, mid = (x0 + x1) / 2;
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.lineTo(x1 - 2, base); ctx.lineTo(x0 + 2, base); ctx.closePath(); fillO('#f4ead8');
    for (let i = 0; i < 6; i++) { if (i % 2) continue; ctx.fillStyle = '#c8323e'; ctx.fillRect(x0 + i * (x1 - x0) / 6, top, (x1 - x0) / 6, base - top); }
    ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.moveTo(mid - 12, base); ctx.quadraticCurveTo(mid, top + 14, mid + 12, base); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0 - 10, top + 4); ctx.quadraticCurveTo(mid, 112, x1 + 10, top + 4); ctx.closePath(); fillO(LG(110, top, '#e0404f', '#8a1c28'));
    for (let i = 0; i < 9; i++) { const xx = x0 - 8 + i * (x1 - x0 + 16) / 8; ctx.beginPath(); ctx.moveTo(xx - 7, top + 4); ctx.quadraticCurveTo(xx, top + 13, xx + 7, top + 4); fillO(i % 2 ? '#f4ead8' : '#c8323e'); }
    ctx.fillStyle = '#6b4a2e'; ctx.fillRect(mid - 1, 120, 2, 22); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(mid, 141, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(mid + 1, 120); ctx.lineTo(mid + 18 + Math.sin(t * 3) * 1.5, 125); ctx.lineTo(mid + 1, 130); ctx.fill();
  }
  // Banner: Fahnenstange zwischen Brett und Baumstamm
  function decoBanner(t, x = 104, y = GROUND) {
    const it = decoOf('banner'); if (!it) return;
    const col = decoCol(it), hero = it.kind === 'hero';
    shadow(x, 8); ctx.fillStyle = '#5a3d25'; rr(x - 1.6, y - 114, 3.2, 114, 1.5); ctx.fill(); ctx.beginPath(); ctx.arc(x, y - 115, 3, 0, 7); fillO('#ffd23f');
    rr(x - 14, y - 111, 28, 3, 1.5); fillO('#6b4a2e');
    const wv = i => Math.sin(t * 2.4 + i * 0.9) * 1.6;
    ctx.beginPath(); ctx.moveTo(x - 12, y - 108); ctx.lineTo(x + 12, y - 108); ctx.lineTo(x + 12 + wv(3), y - 74); ctx.lineTo(x + wv(2), y - 68); ctx.lineTo(x - 12 + wv(1), y - 74); ctx.closePath(); fillO(LG(y - 108, y - 68, col, shade(col, 0.6)));
    ctx.strokeStyle = hero ? '#ffd23f' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 10, y - 106); ctx.lineTo(x + 10, y - 106); ctx.lineTo(x + 10 + wv(3), y - 76); ctx.lineTo(x + wv(2), y - 71); ctx.lineTo(x - 10 + wv(1), y - 76); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = hero ? '#fff6dc' : 'rgba(255,255,255,.8)'; ctx.font = hero ? 'bold 15px serif' : 'bold 12px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(hero ? HERO_GLYPH[it.hero] || '✦' : '⚜', x + wv(2) * 0.5, y - 89); ctx.textBaseline = 'alphabetic';
    if (hero) glowDot(x, y - 89, 14, hexRgb(col), 0.25 + 0.1 * Math.sin(t * 3));
  }
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`; };
  // Himmel und Wetter
  function decoSkyBack(t) {
    const it = decoOf('himmel'); if (!it) return;
    if (it.kind === 'nordlicht') { ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) { ctx.beginPath(); for (let x = 0; x <= W; x += 12) { const y = 30 + b * 14 + Math.sin(x * 0.02 + t * 0.6 + b) * 10 + Math.sin(x * 0.051 - t * 0.4) * 5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        for (let x = W; x >= 0; x -= 12) { const y = 64 + b * 14 + Math.sin(x * 0.02 + t * 0.6 + b) * 10; ctx.lineTo(x, y); } ctx.closePath();
        const g = ctx.createLinearGradient(0, 20, 0, 100); g.addColorStop(0, `rgba(${['80,255,170', '120,200,255', '200,120,255'][b]},0.2)`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fill(); }
      ctx.restore(); }
    if (it.kind === 'schnupp') for (let i = 0; i < 2; i++) { const p = ((t * 0.22 + i * 0.55) % 1.6); if (p > 1) continue; const x = 60 + i * 210 + p * 120, y = 14 + i * 18 + p * 40;
      const g = ctx.createLinearGradient(x - 40, y - 14, x, y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,240,${0.9 * (1 - p)})`); ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 40, y - 14); ctx.lineTo(x, y); ctx.stroke(); glowDot(x, y, 5, '255,250,220', 1 - p); }
  }
  function decoSkyFront(t) {
    const it = decoOf('himmel'); if (!it) return;
    if (it.kind === 'gluehw') for (let i = 0; i < 14; i++) { const x = (i * 37 + Math.sin(t * 0.5 + i) * 18 + 20) % W, y = 150 + ((i * 23) % 60) + Math.sin(t * 0.9 + i * 2) * 8, a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
      glowDot(x, y, 5, '220,255,120', 0.5 * a); ctx.fillStyle = `rgba(240,255,170,${a})`; ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6); }
    if (it.kind === 'schnee') { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 60; i++) { const sp = 12 + (i % 5) * 4, y = ((i * 53 + t * sp) % (H + 10)) - 5, x = (i * 97 + Math.sin(t + i) * 8) % W; ctx.beginPath(); ctx.arc(x, y, 0.8 + (i % 3) * 0.4, 0, 7); ctx.fill(); } }
  }
  // Tiere
  function decoPet(t) {
    const it = decoOf('tier'); if (!it) return;
    if (it.kind === 'katze') { const x = 70, y = GROUND, tail = Math.sin(t * 2) * 0.4;
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, -1); ctx.quadraticCurveTo(-14, -2, -13 + tail * 4, -10); ctx.stroke(); ctx.strokeStyle = '#e8963a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-1, -4, 7, 5, 0, 0, 7); fillO('#e8963a'); ctx.beginPath(); ctx.arc(5, -10, 4.5, 0, 7); fillO('#f0a24a');
      for (const ex of [2.4, 7]) { ctx.beginPath(); ctx.moveTo(ex - 2, -13); ctx.lineTo(ex - 1, -17); ctx.lineTo(ex + 1.4, -13.5); ctx.fill(); }
      const bl = (t % 4) < 0.15; ctx.fillStyle = '#1a1424'; if (bl) ctx.fillRect(4.6, -10.6, 3.4, 0.8); else { ctx.fillRect(5, -11.4, 1.1, 1.8); ctx.fillRect(7.4, -11.4, 1.1, 1.8); } ctx.restore(); }
    if (it.kind === 'fuchs') { const x = 352, y = GROUND - 1, br = 1 + Math.sin(t * 1.6) * 0.04;
      ctx.save(); ctx.translate(x, y); ctx.scale(br, br); ctx.beginPath(); ctx.ellipse(0, -5, 11, 6, 0, 0, 7); fillO('#e0702a'); ctx.beginPath(); ctx.ellipse(-8, -3, 9, 4.5, 0.3, 0, 7); fillO('#f08a3a');
      ctx.fillStyle = '#fff4e8'; ctx.beginPath(); ctx.ellipse(-14, -2, 3.5, 2.5, 0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(8, -6, 4.5, 0, 7); fillO('#e0702a');
      ctx.beginPath(); ctx.moveTo(6, -9); ctx.lineTo(7.5, -14); ctx.lineTo(10, -9.5); ctx.fill(); ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(8, -6.5); ctx.lineTo(10.4, -6.5); ctx.stroke(); ctx.restore();
      if ((t % 5) < 2.5) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '7px sans-serif'; ctx.fillText('z', x + 12 + (t % 2.5) * 2, y - 14 - (t % 2.5) * 4); } }
    if (it.kind === 'eule') { const x = 64, y = 130, bl = (t % 3.3) < 0.15;
      ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.ellipse(0, -7, 6.5, 8, 0, 0, 7); fillO('#8a6a4a'); ctx.fillStyle = '#d8c0a0'; ctx.beginPath(); ctx.ellipse(0, -4, 4, 5, 0, 0, 7); ctx.fill();
      for (const ex of [-2.6, 2.6]) { ctx.beginPath(); ctx.arc(ex, -10, 2.4, 0, 7); fillO('#fff4c8'); ctx.fillStyle = '#1a1424'; if (bl) ctx.fillRect(ex - 1.6, -10.3, 3.2, 0.7); else { ctx.beginPath(); ctx.arc(ex, -10, 1.1, 0, 7); ctx.fill(); } }
      ctx.fillStyle = '#ffb547'; ctx.beginPath(); ctx.moveTo(-1, -8); ctx.lineTo(1, -8); ctx.lineTo(0, -6); ctx.fill(); ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.moveTo(-5, -13); ctx.lineTo(-4, -17); ctx.lineTo(-2, -14); ctx.moveTo(5, -13); ctx.lineTo(4, -17); ctx.lineTo(2, -14); ctx.fill(); ctx.restore(); }
    if (it.kind === 'drache') { const a = t * 0.7, x = 250 + Math.cos(a) * 70, y = 112 + Math.sin(a * 2) * 10, dir = -Math.sin(a) >= 0 ? 1 : -1, fl = Math.sin(t * 12);
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); glowDot(0, 0, 14, '255,120,60', 0.25);
      ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-8, -10 - fl * 5); ctx.lineTo(3, -3); ctx.closePath(); fillO('#c84a3a');
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, 7); fillO('#e0604a'); ctx.beginPath(); ctx.arc(8, -2, 3.6, 0, 7); fillO('#e0604a'); ctx.fillStyle = '#ffd23f'; ctx.fillRect(8.6, -3.2, 1.2, 1.2);
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-13, 3, -16, -1); ctx.stroke(); ctx.strokeStyle = '#e0604a'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(4, -12 + fl * 5); ctx.lineTo(7, -2); ctx.closePath(); fillO('#f07a5a'); ctx.restore(); }
  }
  // Trophäen (Ursprung = Bodenmitte)
  function trophy(i, x, y, t, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); shadow(0, 9);
    switch (i) {
      case 0: ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-10, -12, 0, -13); ctx.quadraticCurveTo(10, -12, 9, 0); ctx.closePath(); fillO(LG(-13, 0, '#8af07a', '#3aa04a')); ctx.fillStyle = '#1a1424'; ctx.fillRect(1, -8, 1.4, 2.4); ctx.fillRect(4.5, -8, 1.4, 2.4);
        ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(-5, -18); ctx.lineTo(-2, -15); ctx.lineTo(0, -19); ctx.lineTo(2, -15); ctx.lineTo(5, -18); ctx.lineTo(5, -12); ctx.closePath(); fillO('#ffd23f'); break;
      case 1: ctx.fillStyle = '#6b4a2e'; rr(-1.6, -22, 3.2, 22, 1); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(8, -26); ctx.lineTo(6, -12); ctx.lineTo(-6, -12); ctx.closePath(); fillO('#6faa3a');
        ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(-14, -28); ctx.lineTo(-8, -20); ctx.moveTo(8, -24); ctx.lineTo(14, -28); ctx.lineTo(8, -20); fillO('#6faa3a'); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-4, -22, 2.4, 2.4); ctx.fillRect(2, -22, 2.4, 2.4); ctx.fillStyle = '#fff'; ctx.fillRect(-3, -15, 6, 1.6); break;
      case 2: rr(-7, -4, 14, 4, 1); fillO('#6b4a2e'); ctx.beginPath(); ctx.arc(0, -11, 7, 0, 7); fillO('#f4ecd8'); rr(-4.5, -7, 9, 5, 1.5); fillO('#f4ecd8'); ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.arc(-2.6, -11, 2, 0, 7); ctx.arc(2.8, -11, 2, 0, 7); ctx.fill(); ctx.fillRect(-2, -5, 1, 2.4); ctx.fillRect(0.4, -5, 1, 2.4); break;
      case 3: rr(-6, -4, 12, 4, 1); fillO('#4a3220'); ctx.beginPath(); ctx.moveTo(-4, -4); ctx.quadraticCurveTo(-8, -18, 4, -26); ctx.quadraticCurveTo(-2, -16, 4, -4); ctx.closePath(); fillO(LG(-26, -4, '#ff9a6a', '#8a1c28')); glowDot(3, -25, 5, '255,120,60', 0.6); break;
      case 4: for (const [dx, hgt, a] of [[-5, 13, -0.3], [0, 20, 0], [5, 11, 0.35]]) { ctx.save(); ctx.translate(dx, 0); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-2.4, -hgt * 0.8); ctx.lineTo(0, -hgt); ctx.lineTo(2.4, -hgt * 0.8); ctx.lineTo(3, 0); ctx.closePath(); fillO(LG(-hgt, 0, '#eafaff', '#5ab8e8')); ctx.restore(); } glowDot(0, -10, 12, '150,220,255', 0.35 + 0.1 * Math.sin(t * 2)); break;
      case 5: ctx.beginPath(); ctx.ellipse(0, -7, 10, 7, 0, 0, Math.PI); ctx.lineTo(-10, -9); ctx.lineTo(10, -9); ctx.closePath(); fillO('#2a2430'); ctx.beginPath(); ctx.ellipse(0, -9, 9, 2.4, 0, 0, 7); fillO('#5be37d');
        for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(150,255,150,${1 - p})`; ctx.beginPath(); ctx.arc(-4 + i * 4, -10 - p * 12, 1.4 + p, 0, 7); ctx.fill(); } break;
      case 6: ctx.save(); ctx.rotate(0.35); ctx.fillStyle = '#6b4a2e'; rr(-1.8, -24, 3.6, 24, 1.5); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -22, 5, 7, 0, 0, 7); fillO('#7a5a3a'); ctx.fillStyle = '#3f8a3a';
        for (const [a, b] of [[-5, -24], [5, -21], [-4, -17], [4, -27], [0, -30]]) { ctx.beginPath(); ctx.moveTo(a * 0.8, b + 1.5); ctx.lineTo(a * 1.5, b); ctx.lineTo(a * 0.8, b - 1.5); ctx.fill(); } ctx.restore(); break;
      case 7: ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-7, -18); ctx.lineTo(-4, -28); ctx.lineTo(4, -28); ctx.lineTo(7, -18); ctx.lineTo(4, 0); ctx.closePath(); fillO(LG(-28, 0, '#5a2a3a', '#2a1020')); ctx.fillStyle = '#c8a040'; ctx.fillRect(-0.8, -24, 1.6, 10); ctx.fillRect(-3, -21, 6, 1.6); break;
      case 8: ctx.beginPath(); ctx.moveTo(0, -1); ctx.bezierCurveTo(-12, -9, -8, -20, 0, -15); ctx.bezierCurveTo(8, -20, 12, -9, 0, -1); ctx.closePath(); fillO(LG(-20, 0, '#ffb547', '#8a2a14')); ctx.strokeStyle = `rgba(255,230,120,${0.6 + 0.3 * Math.sin(t * 4)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(0, -8); ctx.lineTo(3, -12); ctx.stroke(); glowDot(0, -9, 12, '255,140,40', 0.4 + 0.15 * Math.sin(t * 4)); break;
      case 9: ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.6; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(Math.cos(i * 1.25) * 13, -9 + Math.sin(i * 1.25) * 11); ctx.stroke(); } ctx.beginPath(); ctx.ellipse(0, -8, 6, 8, 0, 0, 7); fillO(LG(-16, 0, '#ffffff', '#c8c0d8')); break;
      case 10: { const b = Math.sin(t * 2) * 2; glowDot(0, -14 + b, 14, '200,220,255', 0.5); ctx.beginPath(); ctx.moveTo(0, -24 + b); ctx.lineTo(4, -14 + b); ctx.lineTo(0, -5 + b); ctx.lineTo(-4, -14 + b); ctx.closePath(); fillO(LG(-24, -5, '#ffffff', '#8ab0ff')); rr(-5, -3, 10, 3, 1); fillO('#4a3a66'); } break;
      case 11: ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, -26); ctx.quadraticCurveTo(2, -32, 7, -30); ctx.stroke(); ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#5be37d'; for (const [a, b, r] of [[3, -22, 0.6], [-2, -17, -0.6], [3, -12, 0.5]]) { ctx.beginPath(); ctx.ellipse(a, b, 3.4, 1.5, r, 0, 7); ctx.fill(); } break;
      case 12: ctx.fillStyle = '#3a3448'; rr(-5, -18, 10, 16, 2); ctx.fill(); ctx.fillStyle = `rgba(140,240,255,${0.7 + 0.25 * Math.sin(t * 3)})`; ctx.fillRect(-3.4, -16, 6.8, 12); glowDot(0, -10, 14, '120,230,255', 0.45);
        ctx.strokeStyle = '#3a3448'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -19, 3, Math.PI, 0); ctx.stroke(); rr(-6, -3, 12, 3, 1); fillO('#3a3448'); break;
      case 13: ctx.beginPath(); ctx.moveTo(-12, -2); ctx.quadraticCurveTo(-12, -14, -2, -15); ctx.lineTo(10, -10); ctx.lineTo(14, -4); ctx.lineTo(8, -1); ctx.lineTo(-2, -3); ctx.closePath(); fillO('#f4ecd8');
        ctx.beginPath(); ctx.moveTo(-6, -13); ctx.quadraticCurveTo(-14, -22, -20, -18); ctx.quadraticCurveTo(-13, -17, -9, -10); ctx.closePath(); fillO('#e8dcc0'); ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.arc(1, -9, 2.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#f4ecd8'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(5 + i * 3, -2); ctx.lineTo(6 + i * 3, 1); ctx.lineTo(7 + i * 3, -2); ctx.fill(); } break;
      case 14: rr(-6, -4, 12, 4, 1); fillO('#4a3220'); ctx.beginPath(); ctx.moveTo(-3, -4); ctx.quadraticCurveTo(-10, -16, -2, -24); ctx.lineTo(4, -22); ctx.quadraticCurveTo(-3, -15, 3, -4); ctx.closePath(); fillO(LG(-24, -4, '#e8e0ff', '#7a8ab8'));
        if ((t % 2.4) < 0.25) { ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(1, -24); ctx.lineTo(5, -30); ctx.lineTo(2, -31); ctx.lineTo(7, -38); ctx.stroke(); glowDot(4, -30, 10, '255,250,180', 0.6); } break;
    }
    ctx.restore();
  }
  const TROPHY_POS = { t1: [30, 223], t2: [348, 223], t3: [470, 224] };
  function decoTrophies(t) { for (const [slot, [x, y]] of Object.entries(TROPHY_POS)) { const it = decoOf(slot); if (it) trophy(it.ti, x, y, t); } }
  // Alles hinter den Helden (nach dem Hintergrund) und davor (nach den Helden)
  function decoBack(t) { decoSkyBack(t); decoTent(t); decoBanner(t); decoTrophies(t); }
  function decoFront(t) { decoPet(t); decoSkyFront(t); }
  // Anschlagbrett links im Lager: Holzbrett mit bunten Plakaten
  function noticeBoard(t, painted) {
    const x = 10, y = GROUND - 100, w = 70, h = 56;
    if (painted) { const pulse = 0.35 + 0.25 * Math.sin(t * 3); if (!(run && run.dead)) { ctx.strokeStyle = `rgba(255,210,140,${pulse})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); rr(2, GROUND - 94, 84, 74, 6); ctx.stroke(); ctx.setLineDash([]); } return; }
    shadow(x + w / 2, 34);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 8, y + 10, 6, GROUND - y - 10); ctx.fillRect(x + w - 14, y + 10, 6, GROUND - y - 10);
    const pulse = 0.35 + 0.25 * Math.sin(t * 3);
    lightPool(x + w / 2, y + h / 2, 60, '255,200,120', 0.12 + pulse * 0.08);
    ctx.fillStyle = '#6b4a2e'; rr(x - 2, y - 2, w + 4, h + 4, 4); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#8a6240' : '#7d5737'; ctx.fillRect(x, y + i * (h / 4), w, h / 4 - 1); }
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x - 4, y - 7, w + 8, 7);
    ctx.fillStyle = '#ffe2a8'; ctx.font = '7px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('AUFTRÄGE', x + w / 2, y - 1);
    const cols = ['#ffb547', '#4fc3ff', feature(S, 'turm') ? '#c9a6ff' : '#8f8676', ahnOpen(S) ? '#ffd27a' : '#8f8676', expOpen(S) ? '#9bd14a' : '#8f8676'];
    const ps = [[4, 5, -0.12], [26, 3, 0.08], [48, 6, -0.05], [12, 30, 0.1], [36, 29, -0.08]];
    ps.forEach(([px, py, rot], i) => {
      ctx.save(); ctx.translate(x + px + 9, y + py + 11); ctx.rotate(rot + Math.sin(t * 1.3 + i) * 0.02);
      ctx.fillStyle = '#efe1bf'; ctx.fillRect(-9, -11, 18, 22);
      ctx.fillStyle = cols[i]; ctx.fillRect(-9, -11, 18, 6);
      ctx.fillStyle = 'rgba(60,40,20,.55)'; ctx.fillRect(-6, -2, 12, 1.5); ctx.fillRect(-6, 2, 9, 1.5); ctx.fillRect(-6, 6, 11, 1.5);
      ctx.fillStyle = '#c8302e'; ctx.beginPath(); ctx.arc(0, -11, 1.8, 0, 7); ctx.fill();
      ctx.restore();
    });
    if (!(run && run.dead)) { ctx.strokeStyle = `rgba(255,210,140,${pulse})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); rr(x - 5, y - 10, w + 10, h + 15, 6); ctx.stroke(); ctx.setLineDash([]); }
  }
  function campFire(fx, t, pool) {
    if (!pool) { lightPool(fx, GROUND - 14, 120 + Math.sin(t * 5) * 6, '255,150,60', 0.3); lightPool(fx, GROUND - 8, 50, '255,200,120', 0.25); }
    shadow(fx, 26);
    ctx.fillStyle = '#5a3d25'; ctx.save(); ctx.translate(fx, GROUND - 3); ctx.rotate(0.25); ctx.fillRect(-20, -3, 40, 6); ctx.rotate(-0.5); ctx.fillRect(-20, -3, 40, 6); ctx.restore();
    for (let i = 0; i < 6; i++) { const h = 20 + Math.sin(t * 9 + i * 1.7) * 7; ctx.fillStyle = ['#e5484d', '#ffb547', '#ffd23f'][i % 3]; ctx.beginPath(); ctx.moveTo(fx - 15 + i * 6, GROUND - 6); ctx.quadraticCurveTo(fx - 12 + i * 5, GROUND - 6 - h, fx - 7 + i * 6, GROUND - 6); ctx.fill(); }
    for (let i = 0; i < 6; i++) { const p = ((t * 0.6 + i / 6) % 1); ctx.fillStyle = `rgba(255,200,120,${1 - p})`; ctx.fillRect(fx + Math.sin(i * 3 + t) * 10, GROUND - 20 - p * 70, 2, 2); }
  }
  // ---------- Truppen-Menü: Porträts und Szene ----------
  const PORT = {};
  // Ganze Heldenfigur als Bild (für den Sternenruf)
  const FIG = {};
  function figureURL(k) {
    if (FIG[k]) return FIG[k];
    const Z = 4, c = document.createElement('canvas'); c.width = 110 * Z; c.height = 140 * Z;
    const main = ctx; ctx = c.getContext('2d');
    const lb = LOOK.busy; LOOK.busy = true;
    try { ctx.setTransform(Z, 0, 0, Z, 0, 0); ctx.translate(0, 130 - GROUND); DRAW[k](55, null, 0.6, false); } catch (err) {} finally { ctx = main; LOOK.busy = lb; }
    return (FIG[k] = c.toDataURL());
  }
  // Boss der Ahnenprüfung als Bild (für die Steckbriefe der Kopfgeldjagd)
  const BPIC = {};
  function bossPicURL(def) {
    if (BPIC[def.name]) return BPIC[def.name];
    const Z = 2, c = document.createElement('canvas'); c.width = 240 * Z; c.height = 240 * Z;
    const main = ctx, mainCv = cv; ctx = c.getContext('2d');
    try { ctx.setTransform(Z, 0, 0, Z, 0, 0); ctx.translate(0, 228 - GROUND); const e = makeEnemy(40, 0, true, false, null, false); e.ahn = def; e.bk = def.bk; e.type = def.bk >= 0 && def.bk < 5 ? ENEMY_KINDS[def.bk] : 'geist'; e.phase = 0; e.x = 120; e._px = 120; e.hp = e.max; enemy(e, 0.5); } catch (err) {} finally { ctx = main; }
    return (BPIC[def.name] = c.toDataURL());
  }
  function portraitURL(k) {
    if (PORT[k]) return PORT[k];
    const Z = 3, c = document.createElement('canvas'); c.width = 120 * Z; c.height = 130 * Z;
    const main = ctx; ctx = c.getContext('2d');
    try { ctx.setTransform(Z, 0, 0, Z, 0, 0); ctx.translate(0, 120 - GROUND); DRAW[k](60, null, 0.3, false); } finally { ctx = main; }
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, w = c.width;
    let top = c.height;
    for (let y = 0; y < 110 * Z && top === c.height; y++) for (let x = 50 * Z; x < 70 * Z; x++) if (d[(y * w + x) * 4 + 3] > 80) { top = y; break; }
    const dy = { m: 12, r: 4, b: 4, n: 2 }[k] || 0, size = 42 * Z, out = document.createElement('canvas'); out.width = out.height = 120;
    out.getContext('2d').drawImage(c, 60 * Z - size / 2 + 2 * Z, Math.max(0, top + (dy - 4) * Z), size, size, 0, 0, 120, 120);
    return (PORT[k] = out.toDataURL());
  }
  // Bilder neu zeichnen, wenn sich das Aussehen eines Helden ändert
  function heroPicReset(k) { delete PORT[k]; delete FIG[k]; for (const key of Object.keys(ICON)) if (key.endsWith('|' + k)) delete ICON[key]; }
  // Kleine Bilder für die Sammlung: Heldenteil am Helden, Deko-Stück, Truhe
  const ICON = {};
  function heroWithGear(k, gear, Z = 3) {
    const c = document.createElement('canvas'); c.width = 80 * Z; c.height = 100 * Z;
    const main = ctx, po = GEAR_OVR, lb = LOOK.busy; ctx = c.getContext('2d'); GEAR_OVR = { k, gear }; LOOK.busy = true;
    try { ctx.setTransform(Z, 0, 0, Z, 0, 0); ctx.translate(0, 94 - GROUND); DRAW[k](40, null, 0.6, false); } catch (err) {} finally { ctx = main; GEAR_OVR = po; LOOK.busy = lb; }
    return c;
  }
  function itemIconURL(id, k) {
    const it = ITEMS[id]; if (!it) return ''; k = it.hero || k || 'r';
    const key = id + '|' + (it.cat === 'gear' ? k : ''); if (ICON[key]) return ICON[key];
    let c;
    if (it.cat === 'gear') {
      // nur dieses Teil am Helden, auf den passenden Körperteil vergrößert (der Golem ganz)
      const full = heroWithGear(k, { [it.slot]: id }), Z = 3;
      if (k === 'o') c = full; else { const y0 = { kopf: 4, koerper: 30, beine: 56 }[it.slot]; c = document.createElement('canvas'); c.width = 60 * Z; c.height = 45 * Z; c.getContext('2d').drawImage(full, 10 * Z, y0 * Z, 60 * Z, 45 * Z, 0, 0, c.width, c.height); }
    }
    else {
      const Z = 3; c = document.createElement('canvas'); c.width = 96 * Z; c.height = 72 * Z;
      const main = ctx, po = DECO_OVR; ctx = c.getContext('2d'); DECO_OVR = { [it.slot === 'troph' ? 't1' : it.slot]: id };
      try {
        ctx.setTransform(Z, 0, 0, Z, 0, 0);
        const sky = ctx.createLinearGradient(0, 0, 0, 72); sky.addColorStop(0, '#141a3a'); sky.addColorStop(1, '#2a2048'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 96, 72);
        ctx.fillStyle = '#2a3a22'; ctx.fillRect(0, 60, 96, 12);
        const at = (wx, wy, sc) => { ctx.translate(48, 62); ctx.scale(sc, sc); ctx.translate(-wx, -wy); };
        if (it.slot === 'zelt') { at(436, 224, 0.62); if (it.kind === 'pav') pavilion(0.6); else { const img = bgImg('lager'); if (img && img.complete) { const [x, y] = W_OF(TENT_R[0], TENT_R[1]); ctx.drawImage(img, TENT_R[0], TENT_R[1], TENT_R[2], TENT_R[3], x, y, TENT_R[2] * LOBBY_S, TENT_R[3] * LOBBY_S); } decoTent(0.6); } }
        else if (it.slot === 'feuer') { at(251, 222, 1.15); const F = fireSrc(), M = BG_META.lager, [fx0, fy0] = M.fire; glowDot(251, 205, 34, hexRgb(decoCol(it)), 0.45); if (F) { const [x, y] = W_OF(fx0 - F.pad, fy0 - F.pad); ctx.drawImage(F.c, x, y, F.c.width * LOBBY_S, F.c.height * LOBBY_S); } }
        else if (it.slot === 'banner') { at(104, 222, 0.5); decoBanner(0.6); }
        else if (it.slot === 'tier') { const P = { katze: [70, 222, 2.6], fuchs: [352, 222, 2.2], eule: [64, 130, 2.6], drache: [250, 124, 2.2] }[it.kind]; at(P[0], P[1], P[2]); decoPet(it.kind === 'drache' ? Math.PI / 2 / 0.7 : 0.6); }
        else if (it.slot === 'himmel') { ctx.save(); ctx.scale(96 / W, 72 / 120); decoSkyBack(2.2); decoSkyFront(2.2); if (it.kind === 'schnupp') { decoSkyBack(0.6); } ctx.restore(); }
        else if (it.slot === 'troph') { trophy(it.ti, 48, 62, 0.6, 2.1); }
      } catch (err) {} finally { ctx = main; DECO_OVR = po; }
    }
    return (ICON[key] = c.toDataURL());
  }
  // Truhe zeichnen (Ursprung = Bodenmitte)
  function chestDraw(x, y, s, rar, open) {
    ctx.save(); ctx.translate(x - 32 * s, y - 50 * s); ctx.scale(s, s); const col = RAR_COL[rar], rgb = hexRgb(col);
    glowDot(32, 30, 30, rgb, rar >= 3 ? 0.55 : 0.3);
    rr(10, 26, 44, 24, 4); fillO(LG(26, 50, '#8a5a2e', '#4a2e16')); ctx.fillStyle = col; ctx.fillRect(10, 34, 44, 4); ctx.fillRect(20, 26, 3, 24); ctx.fillRect(41, 26, 3, 24);
    if (open) { ctx.beginPath(); ctx.moveTo(10, 26); ctx.lineTo(54, 26); ctx.lineTo(50, 10); ctx.lineTo(14, 10); ctx.closePath(); fillO(LG(10, 26, '#6a4422', '#3a2412')); glowDot(32, 24, 22, rgb, 0.9); }
    else { ctx.beginPath(); ctx.moveTo(10, 28); ctx.quadraticCurveTo(10, 12, 32, 12); ctx.quadraticCurveTo(54, 12, 54, 28); ctx.closePath(); fillO(LG(12, 28, '#a06a36', '#5a3818')); ctx.fillStyle = col; ctx.fillRect(20, 13, 3, 15); ctx.fillRect(41, 13, 3, 15); }
    rr(28, 30, 8, 9, 2); fillO(col); ctx.fillStyle = '#2a1a0a'; ctx.fillRect(31, 33, 2, 4);
    if (rar === 4) for (let i = 0; i < 5; i++) sparkle(8 + i * 12, 8 + (i % 2) * 6, 2.6, 0.9);
    ctx.restore();
  }
  // Truhe in der Farbe ihrer Seltenheit
  function chestIconURL(rar, open) {
    const key = 'chest' + rar + (open ? 'o' : ''); if (ICON[key]) return ICON[key];
    const Z = 3, c = document.createElement('canvas'); c.width = 64 * Z; c.height = 56 * Z; const main = ctx; ctx = c.getContext('2d');
    try {
      ctx.setTransform(Z, 0, 0, Z, 0, 0); chestDraw(32, 50, 1, rar, open);
    } catch (err) {} finally { ctx = main; }
    return (ICON[key] = c.toDataURL());
  }
  function squadSpots(ids, slots) {
    const ord = LINE_ORDER.filter(k => ids.includes(k)), n = Math.max(slots, ord.length), gap = Math.min(58, 300 / Math.max(1, n - 1)), c = 280;
    const xs = Array.from({ length: n }, (_, i) => c + (n - 1) * gap / 2 - i * gap);
    return { heroes: ord.map((k, i) => ({ k, x: xs[i] })), empty: xs.slice(ord.length) };
  }
  function roleRing(x, col, t, empty) {
    ctx.save();
    if (empty) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(220,215,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 21, 6.5, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = 'rgba(220,215,255,.45)'; ctx.font = '16px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', x, GROUND - 14);
      ctx.restore(); return;
    }
    const p = 0.5 + 0.5 * Math.sin(t * 2.6 + x * 0.05);
    ctx.globalAlpha = 0.35 + 0.25 * p; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 26 + p * 2, 8 + p, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 22, 6.5, 0, 0, 7); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 14, 4, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  function drawSquad(t, sq) {
    const main = ctx; ctx = sq.cv.getContext('2d');
    try {
      const sc = sq.cv.width / W, off = sq.offL != null ? sq.offL : Math.max(0, sq.cv.height / sc - H);
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      // Oben: die Leere
      const g = ctx.createLinearGradient(0, 0, 0, off + 60); g.addColorStop(0, '#020309'); g.addColorStop(0.55, '#060920'); g.addColorStop(1, '#060920');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, off + 60);
      // Unten: das Lager mit der Truppe
      ctx.save(); ctx.translate(0, off); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      const pf = drawBg('lager', 0, t, 64, 0.49); if (!pf) { ENV_CAMP.back(t, 0); ENV_CAMP.props(t, 0); campFire(64, t); }
      const sp = squadSpots(sq.ids, sq.slots);
      sp.empty.forEach(x => roleRing(x, null, t, true));
      sp.heroes.forEach(({ k, x }) => roleRing(x, ROLE_INFO[ROLE[k]].col, t));
      [...sp.heroes].sort((a, b) => a.x - b.x).forEach(({ k, x }) => DRAW[k](x, null, t, false));
      ENV_CAMP.front(t, 0);
      ctx.textAlign = 'center'; ctx.font = '700 10px "Figtree",sans-serif';
      sp.heroes.forEach(({ k, x }) => { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(HERO_BY_ID[k].name, x + 0.8, GROUND + 25.8); ctx.fillStyle = ROLE_INFO[ROLE[k]].col; ctx.fillText(HERO_BY_ID[k].name, x, GROUND + 25); });
      ctx.restore();
      // Übergang von der Leere ins Lager
      const b = ctx.createLinearGradient(0, off - 4, 0, off + 120); b.addColorStop(0, 'rgba(6,9,32,1)'); b.addColorStop(0.5, 'rgba(6,9,32,.55)'); b.addColorStop(1, 'rgba(6,9,32,0)');
      ctx.fillStyle = b; ctx.fillRect(0, off - 4, W, 124);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const nx = (hash(i + 40) * W + Math.sin(t * 0.07 + i) * 30), ny = hash(i + 50) * (off + 40), r = 80 + hash(i + 60) * 90;
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, r); ng.addColorStop(0, i % 2 ? 'rgba(110,70,220,.16)' : 'rgba(40,110,230,.13)'); ng.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ng; ctx.fillRect(nx - r, ny - r, r * 2, r * 2);
      }
      for (let i = 0; i < 110; i++) { const a = 0.25 + 0.6 * hash(i + 70) * (0.6 + 0.4 * Math.sin(t * (1 + hash(i) * 2) + i)); ctx.fillStyle = `rgba(${200 + hash(i + 5) * 55 | 0},${210 + hash(i + 6) * 45 | 0},255,${a})`; const s = hash(i + 80) > 0.9 ? 2 : 1.2; ctx.fillRect(hash(i + 11) * W, hash(i + 23) * (off + 40), s, s); }
      ctx.restore();
      sq.off = off; sq.spots = sp;
    } finally { ctx = main; }
  }
  // ---------- Animationen: Wiedergeburt und Krönung (Aufstieg) ----------
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - Math.pow(1 - clamp01(x), 3);
  const seg = (T, a, b) => clamp01((T - a) / (b - a));
  function crownIcon(x, y, s, glow) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (glow) { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 28); g.addColorStop(0, `rgba(255,220,110,${glow})`); g.addColorStop(1, 'rgba(255,220,110,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 28, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-14, -8); ctx.lineTo(-6, -1); ctx.lineTo(0, -12); ctx.lineTo(6, -1); ctx.lineTo(14, -8); ctx.lineTo(12, 6); ctx.closePath(); fillO('#ffd23f');
    ctx.fillStyle = '#e0a020'; ctx.fillRect(-12, 2, 24, 4);
    ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(0, -2, 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#3b7ad6'; ctx.beginPath(); ctx.arc(-7, 0.5, 1.7, 0, 7); ctx.arc(7, 0.5, 1.7, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff6c8'; for (const [px, py] of [[-14, -8], [0, -12], [14, -8]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function starIcon(x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function rays(cx, cy, a, t, rgb) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.12);
    for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = `rgba(${rgb},${a * (i % 2 ? 0.07 : 0.15)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -340); ctx.lineTo(22, -340); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function bigText(text, y, size, col, a, sc) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y); ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.font = `${size}px "Bungee","Arial Black",sans-serif`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,10,30,.8)'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  function cineBg(t) {
    const bm = biomeOf(1);
    sky(bm, t, true);
    range('#2a2745', 0.12, 150, 40, 0.01, 0, true); range('#25313a', 0.3, 170, 22, 0.013, 0); range('#1c2a22', 0.55, 196, 14, 0.022, 0);
    ground(bm, 0, true);
  }
  function lineup(ids, center) {
    const order = ['r', 'w', 'o', 'd', 's', 'a', 'm', 'n', 'p', 'b', 't', 'e'].filter(k => ids.includes(k));
    const xs = {}; const rest = order.filter(k => k !== center);
    if (order.includes(center)) xs[center] = 240;
    rest.forEach((k, i) => (xs[k] = 240 + (i % 2 ? 1 : -1) * (52 + Math.floor(i / 2) * 46)));
    return xs;
  }
  function drawTeam(ids, xs, t, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    [...ids].sort((a, b) => Math.abs(xs[b] - 240) - Math.abs(xs[a] - 240)).forEach(k => { if (xs[k] != null) DRAW[k](xs[k], null, t, false); });
    if (ids.includes('t') && xs.t != null) wolf(xs.t + 30, t, false);
    ctx.restore();
  }
  function hint(T, dur) {
    const a = T > 0.6 && T < dur - 0.4 ? 0.7 : 0;
    if (!a) return;
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = '11px "Figtree",sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(T > dur - 1.6 ? 'Tippen zum Fortfahren' : 'Tippen zum Überspringen', W / 2, H - 10); ctx.globalAlpha = 1;
  }
  function drawCine(t) {
    const c = cine, T = c.t;
    cineBg(t);
    if (c.kind === 'rebirth') {
      const oldTeam = c.team && c.team.length ? c.team : ['r'];
      const newTeam = HEROES.filter(h => st[h.id] && st.field.includes(h.id)).map(h => h.id);
      // 1) Licht steigt auf, die alte Gruppe löst sich auf
      const up = seg(T, 0, 1.7);
      if (T < 2) {
        const xs = lineup(oldTeam, 'r');
        drawTeam(oldTeam, xs, t, 1 - up * 0.8);
        for (const k of oldTeam) {
          const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, 'rgba(201,166,255,0)'); g.addColorStop(1, `rgba(220,200,255,${up * 0.75})`);
          ctx.fillStyle = g; ctx.fillRect(xs[k] - 16 - up * 6, 0, 32 + up * 12, GROUND);
        }
        for (let i = 0; i < 46; i++) {
          const k = oldTeam[i % oldTeam.length], x0 = xs[k] + (hash(i) - 0.5) * 34;
          const p = (T * (0.7 + hash(i + 9) * 0.8) + hash(i + 3)) % 1.2;
          if (p > up * 1.2) continue;
          ctx.fillStyle = i % 3 ? 'rgba(201,166,255,.9)' : 'rgba(255,255,255,.95)';
          ctx.fillRect(x0 + Math.sin(T * 6 + i) * 6, GROUND - 10 - p * 190, 2, 2);
        }
      }
      // 3) Neue Gruppe erscheint
      if (T >= 1.9) {
        const a = seg(T, 1.9, 2.6), xs = lineup(newTeam, 'r');
        drawTeam(newTeam, xs, t, a);
        const r = ease(seg(T, 1.9, 3)) * 300;
        ctx.strokeStyle = `rgba(201,166,255,${1 - seg(T, 1.9, 3)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(240, GROUND - 30, r, r * 0.45, 0, 0, 7); ctx.stroke();
        // Sterne fliegen ins Konto
        const n = Math.max(1, Math.min(12, c.amount || 1)), target = [W - 60, 24];
        let arrived = 0;
        for (let i = 0; i < n; i++) {
          const s0 = 2.3 + i * 0.09, p = seg(T, s0, s0 + 0.9);
          if (p >= 1) { arrived++; continue; }
          if (p <= 0) continue;
          const ang = i / n * Math.PI * 2, bx = 240 + Math.cos(ang) * 60, by = 120 + Math.sin(ang) * 30;
          const e = ease(p), x = bx + (target[0] - bx) * e, y = by + (target[1] - by) * e - Math.sin(p * Math.PI) * 40;
          starIcon(x, y, 6, '#ffd23f');
        }
        if (T > 2.3) {
          const shown = Math.round(c.before + (c.amount || 0) * arrived / n);
          ctx.fillStyle = 'rgba(15,12,22,.65)'; rr(W - 132, 10, 122, 26, 13); ctx.fill();
          starIcon(W - 116, 23, 7, '#ffd23f'); ctx.textAlign = 'left'; ctx.font = '13px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(fmt(shown), W - 104, 28);
        }
        const tp = seg(T, 2.0, 2.5);
        bigText(`WIEDERGEBURT ${c.n}`, 78, 26, '#e6d4ff', tp, 0.6 + 0.4 * ease(tp));
        if (c.amount) bigText(`+${fmt(c.amount)} Sterne`, 104, 15, '#ffd23f', seg(T, 2.6, 3), 1);
      }
      // 2) Weißer Blitz
      const fl = T < 1.8 ? seg(T, 1.5, 1.8) : 1 - seg(T, 1.8, 2.5);
      if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, H); }
    } else {
      // Krönung
      const team = HEROES.filter(h => st[h.id] && st.field.includes(h.id)).map(h => h.id), xs = lineup(team.includes('r') ? team : ['r', ...team], 'r');
      ctx.fillStyle = 'rgba(50,12,70,.45)'; ctx.fillRect(0, 0, W, H);
      const headY = GROUND - 78, land = 3.8;
      rays(240, headY, seg(T, 0.4, 2) * (T > land ? 1.6 : 1), t, '255,215,110');
      // Lichtsäule von oben
      const beam = seg(T, 0.9, 1.6) * (1 - seg(T, land + 0.2, land + 1.2) * 0.6);
      if (beam > 0) { const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, `rgba(255,236,170,${beam * 0.55})`); g.addColorStop(1, `rgba(255,236,170,${beam * 0.15})`); ctx.fillStyle = g; ctx.fillRect(222, 0, 36, GROUND); }
      drawTeam(team.filter(k => k !== 'r'), xs, t, 0.9);
      knight(240, null, t, false);
      // Krone schwebt herab
      const p = seg(T, 1.2, land);
      if (T < land) {
        const y = -30 + (headY + 30) * ease(p), x = 240 + Math.sin(T * 2.6) * 10 * (1 - p), s = 1.5 - 0.6 * ease(p);
        for (let i = 0; i < 10; i++) { const q = (T * 1.4 + i / 10) % 1; ctx.fillStyle = `rgba(255,236,170,${(1 - q) * 0.9})`; ctx.fillRect(x + (hash(i) - 0.5) * 26, y - q * 50, 2, 2); }
        if (T > 1.2) crownIcon(x, y, s, 0.6);
      } else {
        crownIcon(240, headY, 0.9, 0.35 + 0.15 * Math.sin(t * 4));
        const b = seg(T, land, land + 1.1);
        ctx.strokeStyle = `rgba(255,215,110,${1 - b})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(240, headY, ease(b) * 230, 0, 7); ctx.stroke();
        for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + hash(i), r = ease(b) * (70 + hash(i + 5) * 90); ctx.fillStyle = `rgba(255,${200 + (i % 3) * 20},120,${1 - b})`; ctx.fillRect(240 + Math.cos(a) * r, headY + Math.sin(a) * r * 0.8, 3, 3); }
        const f = 1 - seg(T, land, land + 0.6); if (f > 0) { ctx.fillStyle = `rgba(255,236,170,${f * 0.85})`; ctx.fillRect(0, 0, W, H); }
      }
      // Titel
      if (T < land) bigText(`AUFSTIEG ${c.n}`, 44, 16, '#e6d4ff', seg(T, 0.5, 1.1) * (1 - seg(T, land - 0.4, land)), 1);
      else {
        const tp = seg(T, land + 0.2, land + 0.7);
        bigText('GEKRÖNT!', 64, 30, '#ffd23f', tp, 0.6 + 0.4 * ease(tp));
        bigText(`Aufstieg ${c.n}`, 88, 14, '#e6d4ff', seg(T, land + 0.5, land + 0.9), 1);
      }
      // Kronen fliegen als Währung in den Zähler
      if (T > land + 0.5) {
        const n = Math.max(1, Math.min(14, c.amount || 1)), target = [W - 116, 23];
        let arrived = 0;
        for (let i = 0; i < n; i++) {
          const s0 = land + 0.7 + i * 0.1, q = seg(T, s0, s0 + 0.95);
          if (q >= 1) { arrived++; continue; }
          if (q <= 0) continue;
          const e = ease(q), x = 240 + (target[0] - 240) * e + Math.sin(i * 2.1) * 40 * Math.sin(q * Math.PI), y = headY + (target[1] - headY) * e - Math.sin(q * Math.PI) * 50;
          crownIcon(x, y, 0.5, 0.4);
        }
        const shown = Math.round(c.before + (c.amount || 0) * arrived / n);
        ctx.fillStyle = 'rgba(15,12,22,.7)'; rr(W - 134, 9, 124, 28, 14); ctx.fill();
        crownIcon(W - 116, 23, 0.55, arrived ? 0.5 : 0); ctx.textAlign = 'left'; ctx.font = '13px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(fmt(shown), W - 100, 28);
        if (arrived === n) bigText(`+${fmt(c.amount)} Kronen`, 112, 15, '#ffd23f', seg(T, land + 0.7 + n * 0.1 + 0.9, land + 1.6 + n * 0.1 + 0.9), 1);
      }
      const fin = seg(T, 0, 0.8); if (fin < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fin})`; ctx.fillRect(0, 0, W, H); }
    }
    const out = seg(T, c.dur - 0.35, c.dur); if (out > 0) { ctx.fillStyle = `rgba(15,12,22,${out})`; ctx.fillRect(0, 0, W, H); }
    hint(T, c.dur);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  // ---------- Der Weltenfresser ----------
  // Kamera zoomt langsam heraus, solange er lebt, und danach wieder herein
  function wfZoom(R, t) {
    const target = R.wf ? 0.55 : 1, last = R._wfLast == null ? t : R._wfLast, dt = Math.min(0.1, Math.max(0, t - last)); R._wfLast = t;
    R._wfZ = R._wfZ == null ? 1 : R._wfZ + (target - R._wfZ) * Math.min(1, dt * (R.wf ? 0.9 : 0.45));
    return R._wfZ;
  }
  // Ein Leib aus zerbrochener Welt: Gestein mit Lava-Rissen, ein Feuerauge, ein Spalt als Schlund, kreisende Trümmer
  const wfH = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function wfRock(x, y, r, seed, c1, c2) {
    ctx.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + seed, rr2 = r * (0.7 + wfH(seed * 9 + k) * 0.45); k ? ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : ctx.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); const g = ctx.createLinearGradient(x, y - r, x, y + r); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill();
  }
  function wfTree(x, y, s, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#3a2618'; ctx.fillRect(-1.5 * s, -2 * s, 3 * s, 10 * s); ctx.fillStyle = '#1f3a24'; ctx.beginPath(); ctx.moveTo(0, -14 * s); ctx.lineTo(7 * s, -1 * s); ctx.lineTo(-7 * s, -1 * s); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, -19 * s); ctx.lineTo(5 * s, -8 * s); ctx.lineTo(-5 * s, -8 * s); ctx.fill(); ctx.restore(); }
  function wfBeast(R, t, z) {
    const e = R.enemies.find(x => x.wf), prog = Math.min(1, (1 - z) / 0.45);
    // Himmel wird schwarz, Sterne verlöschen
    ctx.fillStyle = `rgba(6,2,10,${0.78 * prog})`; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const on = wfH(i + 3) > prog * 1.05; if (!on) continue; ctx.fillStyle = `rgba(255,240,220,${0.5 * prog})`; ctx.fillRect(wfH(i) * W, wfH(i + 50) * 120, 1.2, 1.2); }
    const dead = !e && R.wfKilled;
    if (!e && !dead) return;
    const hp = e ? e.hp / e.max : 0, bite = e && R.wf && R.wf.biteFx > 0 ? Math.sin(Math.min(1, R.wf.biteFx / 0.6) * Math.PI) : 0;
    const rise = (1 - prog) * 260, cx = 350, cy = 92 + rise + Math.sin(t * 0.7) * 5, hit = e && e.hitT > 0;
    if (dead) { // Zerfall: glühende Brocken regnen vom Himmel
      const k = t - (R._wfKB == null ? t : R._wfKB);
      for (let i = 0; i < 70; i++) { const a = wfH(i) * Math.PI * 2, d = wfH(i + 7) * 170, vy = 40 + wfH(i + 9) * 120, x = cx + Math.cos(a) * d + (wfH(i + 11) - 0.5) * 60 * k, y = cy + Math.sin(a) * d * 0.7 + vy * k + 60 * k * k;
        if (y > GROUND + 40) continue; ctx.globalAlpha = Math.max(0, 1 - k / 4); wfRock(x, y, 4 + wfH(i + 3) * 12, i, '#4a3a38', '#1a1012'); if (i % 3 === 0) glowDot(x, y, 10, '255,120,40', 0.5 * Math.max(0, 1 - k / 3)); }
      ctx.globalAlpha = 1; return;
    }
    // Trümmer hinter dem Leib
    const deb = (front) => { for (let i = 0; i < 16; i++) { const sp = 0.25 + wfH(i) * 0.25, ph = (t * sp * 0.1 + wfH(i + 20)) % 1, a = wfH(i + 40) * 6.28 + t * sp, rad = 290 - ph * 170, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.42 + 10, isF = Math.sin(a) > 0;
      if (isF !== front) continue; ctx.globalAlpha = Math.min(1, (1 - ph) * 3) * prog;
      if (i % 4 === 0) wfTree(x, y, 0.8 + wfH(i + 5) * 0.6, t * sp * 2 + i); else wfRock(x, y, 5 + wfH(i + 2) * 10, i + Math.floor(t * sp), '#6a5a50', '#2a1e1c'); }
      ctx.globalAlpha = 1; };
    deb(false);
    // Leib: zerklüftete Steinmasse
    ctx.beginPath(); for (let k = 0; k <= 28; k++) { const a = k / 28 * Math.PI * 2, r = 175 * (0.82 + wfH(k + 1) * 0.28) + Math.sin(t * 1.1 + k) * 2, x = cx + Math.cos(a) * r * 1.05, y = cy + Math.sin(a) * r * 0.85; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.save(); const bg = ctx.createRadialGradient(cx - 50, cy - 60, 20, cx, cy, 190); bg.addColorStop(0, hit ? '#5a4448' : '#3a2e30'); bg.addColorStop(0.6, '#1e1618'); bg.addColorStop(1, '#0c0809'); ctx.fillStyle = bg; ctx.fill(); ctx.clip();
    // Platten und Kanten
    for (let i = 0; i < 18; i++) { const a = wfH(i + 60) * 6.28, d = 40 + wfH(i + 61) * 120, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8; ctx.globalAlpha = 0.5; wfRock(x, y, 14 + wfH(i + 62) * 18, i + 60, '#4a3c3c', '#161012'); }
    ctx.globalAlpha = 1;
    // Lava-Risse, die mit sinkendem Leben heller und zahlreicher werden
    const glow = 0.45 + (1 - hp) * 0.55 + Math.sin(t * 3) * 0.08, nCr = 6 + Math.floor((1 - hp) * 8);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < nCr; i++) { let x = cx + (wfH(i + 80) - 0.5) * 280, y = cy + (wfH(i + 81) - 0.5) * 220; 
      ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (wfH(i * 7 + k) - 0.5) * 40; y += (wfH(i * 7 + k + 3) - 0.3) * 26; ctx.lineTo(x, y); }
      ctx.strokeStyle = `rgba(255,90,20,${0.35 * glow})`; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = `rgba(255,200,90,${glow})`; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    // Schlund: senkrechter Spalt unter dem Auge
    const mx = cx - 6, my = cy + 70, mw = 8 + bite * 34, mh = 62 + bite * 14;
    ctx.beginPath(); ctx.moveTo(mx, my - mh); for (let k = 1; k <= 6; k++) ctx.lineTo(mx + mw * Math.sin(k / 6 * Math.PI) * (k % 2 ? 1 : 0.7), my - mh + k / 6 * mh * 2); for (let k = 5; k >= 1; k--) ctx.lineTo(mx - mw * Math.sin(k / 6 * Math.PI) * (k % 2 ? 0.7 : 1), my - mh + k / 6 * mh * 2); ctx.closePath();
    const mg = ctx.createRadialGradient(mx, my, 2, mx, my, mh); mg.addColorStop(0, '#fff0b0'); mg.addColorStop(0.25, '#ff7a1a'); mg.addColorStop(0.7, '#8a1408'); mg.addColorStop(1, '#2a0606'); ctx.fillStyle = mg; ctx.fill();
    glowDot(mx, my, 30 + bite * 60, '255,120,30', 0.35 + bite * 0.5);
    // Das Auge folgt dem vordersten Helden
    const ex = cx - 10, ey = cy - 38, look = Math.max(-1, Math.min(1, ((R.frontX || 150) - ex) / 260)), blink = (Math.sin(t * 0.9) > 0.985 ? 0.1 : 1) * Math.min(1, prog * 1.5);
    ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, 58, 34 * blink + 0.5, 0, 0, 7); ctx.fillStyle = '#120808'; ctx.fill(); ctx.clip();
    const ig = ctx.createRadialGradient(ex + look * 22, ey + 6, 2, ex + look * 22, ey + 6, 34); ig.addColorStop(0, '#fff6c0'); ig.addColorStop(0.35, '#ffb020'); ig.addColorStop(0.75, '#d0400c'); ig.addColorStop(1, '#3a0a04');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex + look * 22, ey + 6, 32, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a0404'; ctx.beginPath(); ctx.ellipse(ex + look * 24, ey + 6, 4 + bite * 3, 22, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2a1e1e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(ex, ey, 60, 36 * blink + 1, 0, 0, 7); ctx.stroke();
    glowDot(ex + look * 22, ey + 6, 70, '255,140,40', 0.3 * blink);
    deb(true);
    // Weltenbeben: Brocken brechen ab und regnen herab
    if (R.wf && R.wf.quakeFx > 0) { const k = 0.8 - R.wf.quakeFx; for (let i = 0; i < 14; i++) { const x = 60 + wfH(i + 90) * 380, y = cy + 120 + k * (180 + wfH(i + 91) * 120); wfRock(x, y, 5 + wfH(i + 92) * 8, i, '#5a4a44', '#1a1012'); }
      ctx.fillStyle = `rgba(255,140,60,${R.wf.quakeFx * 0.18})`; ctx.fillRect(0, 0, W, H); }
    for (let i = 0; i < 10; i++) glowDot(330 + i * 18 + Math.sin(t + i) * 6, GROUND + 2, 18, '90,70,70', 0.25 * prog);
  }
  function wfHud(R, t) {
    const e = R.enemies.find(x => x.wf);
    if (R.wf && e) {
      const it = R.wf.t, a = Math.max(0, Math.min(1, it / 0.6, (5.5 - it) / 0.8));
      if (it < 5.5) { const bh = 26 * Math.min(1, it / 0.8); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
        ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.font = '26px "Bungee","Arial Black",sans-serif';
        ctx.strokeText('DER WELTENFRESSER', W / 2, 110); ctx.fillStyle = '#ffb070'; ctx.fillText('DER WELTENFRESSER', W / 2, 110);
        ctx.font = '12px "Figtree",sans-serif'; ctx.fillStyle = '#ffe2c8'; ctx.fillText('Er hat seit Anbeginn der Zeit gewartet.', W / 2, 130); ctx.globalAlpha = 1; }
      const bw = 260, bx = W / 2 - bw / 2, by = H - 24;
      ctx.fillStyle = 'rgba(10,2,8,.85)'; rr(bx - 2, by, bw + 4, 10, 4); ctx.fill();
      const g = ctx.createLinearGradient(0, by, 0, by + 8); g.addColorStop(0, '#ffd0a0'); g.addColorStop(0.3, '#ff5a3a'); g.addColorStop(1, '#5a0a14'); ctx.fillStyle = g; rr(bx, by + 1, bw * Math.max(0, e.hp / e.max), 8, 3); ctx.fill();
      ctx.textAlign = 'center'; ctx.font = '11px "Bungee","Arial Black",sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText('Der Weltenfresser', W / 2, by - 4); ctx.fillStyle = '#ffb070'; ctx.fillText('Der Weltenfresser', W / 2, by - 4);
    }
    if (R.wfKilled) { R._wfKB = R._wfKB == null ? t : R._wfKB; const k = t - R._wfKB; if (k < 5) { const a = Math.max(0, Math.min(1, k * 2, (5 - k) / 0.8));
      ctx.globalAlpha = a; ctx.fillStyle = `rgba(255,220,140,${0.35 * Math.max(0, 1 - k)})`; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.font = '22px "Bungee","Arial Black",sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText('DER WELTENFRESSER IST GEFALLEN', W / 2, 110); ctx.fillStyle = '#ffd27a'; ctx.fillText('DER WELTENFRESSER IST GEFALLEN', W / 2, 110);
      ctx.font = '12px "Figtree",sans-serif'; ctx.fillStyle = '#fff2c8'; ctx.fillText(R.wfKilled.first ? `Du bist jetzt Weltenbezwinger · +${R.wfKilled.crowns} Kronen` : `+${R.wfKilled.crowns} Kronen`, W / 2, 130); ctx.globalAlpha = 1; } }
  }
  // Kleine Symbole über Helden und Gegnern für jeden laufenden Effekt (Stärkungen, Schwächungen, Schaden über Zeit)
  const ST_GOOD = 'rgba(16,30,22,.9)', ST_BAD = 'rgba(46,10,16,.9)';
  function heroStatus(R, k) {
    const h = R.h[k], L = [], A = R.ahn, add = (i, c, bad) => L.push([i, c, bad]);
    if (h.invT > 0 || h.protT > 0) add('✧', '#fff2b0');
    if (h.shield > 0) add('◈', '#fff2b0');
    if (R.atkB && R.atkB[k]) add('⚔', '#ffb547');
    if (R.apsB && R.apsB[k]) add('»', '#ffe48a');
    if (k === 'w') { if (R.hautT > 0) add('▣', '#7fb2ff'); if (R.racheT > 0) add('⚡', '#7fb2ff'); if (R.tauntT > 0) add('☄', '#ff8a8a'); if (R.prallT > 0) add('◖', '#7fb2ff'); }
    if (k === 't') { if (R.packT > 0) add('✥', '#d9935a'); if (R.howlT > 0) add('☾', '#e6dcff'); }
    if (k === 'd') { if (R.bearT > 0) add('❖', '#9bd14a'); if (R.natureT > 0) add('❀', '#9bd14a'); if (R.bloomT > 0) add('✿', '#c8f08a'); }
    if (k === 'a') { if (R.cloneT > 0) add('☾', '#d9a0ff'); if (R.flowN > 0) add('≫', '#ff6b7a'); if (h.nextCrit) add('!', '#ffd23f'); }
    if (k === 's') { if (R.huntT > 0) add('➶', '#7ee08a'); if (R.aimT > 0) add('⌖', '#7ee08a'); }
    if (k === 'r' && R.brother) add('✠', '#ffb547');
    if (k === 'e') { if (R.overT > 0) add('⇶', '#f28c28'); if (R.tinkT > 0) add('⚙', '#f28c28'); }
    if (k === 'o') { if (R.golemT > 0) add('☄', '#ff8a8a'); if (R.monoT > 0) add('▮', '#46d4ee'); if (R.stormT > 0) add('✴', '#46d4ee'); }
    if (k === 'n' && R.collectN > 0) add('◇', '#6be0b8');
    if (h.stunT > 0) add('✶', '#ffe58a', 1);
    if (h.markT > 0) add('◎', '#ff5a5a', 1);
    if (h.dotT > 0) add('☣', '#9be36b', 1);
    if (A && A.fx && A.fx.some(f => f.kind === 'bomb' && f.k === k && f.t > 0)) add('✹', '#ff9a3d', 1);
    return L;
  }
  // Effekte, die auf die ganze Gruppe wirken: eine gemeinsame Leiste oben links
  function partyStatus(R) {
    const L = [], A = R.ahn, add = (i, c, bad) => L.push([i, c, bad]);
    if (R.buffT > 0) add('▲', '#ffb547');
    if (R.songT > 0) add('♬', '#ff8ac8');
    if (R.roarT > 0) add('Ʊ', '#9bd14a');
    if (R.shatterT > 0) add('✸', '#46d4ee');
    if (R.honorT > 0) add('⚐', '#ffd27a');
    if (R.wrathT > 0) add('☀', '#ffe48a');
    if (R.critBT > 0) add('✦', '#ffd27a');
    if (R.crescN > 0) add('↗', '#ff8ac8');
    if (R.groundT > 0 && R.h.p && R.h.p.alive) add('✚', '#7ee08a');
    if (R.curseT > 0) add('☠', '#c08cff', 1);
    if (R.slowT > 0) add('❄', '#bfe6ff', 1);
    if (R.blindT > 0) add('◌', '#c0c6cc', 1);
    if (R.silT > 0) add('✕', '#ff9a9a', 1);
    if (A && A.fx && A.fx.some(f => f.kind === 'burn' && f.t > 0)) add('♨', '#ff7a3d', 1);
    return L;
  }
  function enemyStatus(e) {
    const L = [], add = (i, c, bad) => L.push([i, c, bad]);
    if (e.sleep > 0) add('z', '#dcdcff', 1); else if (e.frozen > 0) add('❄', '#bfe6ff', 1); else if (e.rooted > 0) add('❦', '#c8f08a', 1); else if (e.stun > 0) add('✶', '#ffe58a', 1);
    if (e.poisonT > 0) add(e.poisonN > 1 ? '☣' + e.poisonN : '☣', '#9be36b', 1);
    if (e.burnT > 0) add('♨', '#ff7a3d', 1);
    if (e.bleedT > 0) add('♦', '#ff4d5e', 1);
    if (e.markT > 0 && e.mark > 0) add('◎', '#ff6b7a', 1);
    if (e.cursed > 0) add('☠', '#6be0b8', 1);
    if (e.duelT > 0) add('⚔', '#ffb547', 1);
    if (e.smarkT > 0) add('✕', '#ff6b7a', 1);
    if (e.linkT > 0) add('∞', '#6be0b8', 1);
    if (e.manaT > 0) add('✺', '#c08cff', 1);
    if (e.dissT > 0) add('♭', '#ff8ac8', 1);
    if (e.quakeT > 0) add('≋', '#d2a878', 1);
    if (e.shieldHp > 0) add('◈', '#a0d7ff');
    if (e.invT > 0) add('✧', '#ffffff');
    if (e.reflT > 0) add('◐', '#c8e6ff');
    if (e.healT > 0 || (e.traits && e.traits.regen)) add('✚', '#7ee08a');
    if (e.frenzyT > 0) add('»', '#ff5a5a');
    if (e.traits && e.traits.armor) add('▣', '#c8c8d8');
    if (e.enrage > 1) add('▲', '#ff5a5a');
    return L;
  }
  const ST_FONT = '"Segoe UI Symbol","Apple Symbols","Noto Sans Symbols 2","Noto Sans Symbols",sans-serif';
  function badgeRow(L, cx, y, per, dir = -1, sz = 9) {
    L.forEach(([g, c, bad], i) => {
      const row = Math.floor(i / per), inRow = Math.min(per, L.length - row * per), col = i % per;
      const x = cx + (col - (inRow - 1) / 2) * (sz + 1), yy = y + dir * row * (sz + 1);
      ctx.fillStyle = bad ? ST_BAD : ST_GOOD; ctx.beginPath(); ctx.arc(x, yy, sz / 2, 0, 7); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = c; ctx.font = `bold ${Math.round(sz * (g.length > 1 ? 0.6 : 0.78))}px ${ST_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(g, x, yy + 0.5);
    });
    ctx.textBaseline = 'alphabetic';
  }
  function statusIcons(R, t) {
    const P = partyStatus(R);
    if (P.length) { const sz = 11; badgeRow(P, 16 + (Math.min(P.length, 12) - 1) * (sz + 1) / 2, 40, 12, 1, sz); }
    for (const k of R.order) {
      const h = R.h[k]; if (!h.alive) continue;
      const L = heroStatus(R, k); if (!L.length) continue;
      badgeRow(L, R.pos[k], GROUND - (k === 'w' || k === 'o' ? 96 : k === 'm' ? 92 : 88) - (h.shield > 0 ? 11 : 7), 3);
    }
    for (const e of R.enemies) {
      if (e.hp <= 0 || e.x > 500) continue;
      const L = enemyStatus(e); if (!L.length) continue;
      if (e.ahn) badgeRow(L, W / 2, H - 46, 12);
      else badgeRow(L, e.x, GROUND - (e.boss ? 170 : e.elite ? 62 : 56) - 7, e.boss ? 6 : 3);
    }
  }
  // Zeichnet die laufenden Effekte der Siegel-Fähigkeiten
  function golemFx(R, t) {
    const x = R.pos.o; if (x == null || !R.h.o) return; const RC = '70,212,238', hy = GROUND - 40, alive = R.h.o.alive;
    if (alive && R.golemT > 0) { for (let i = 0; i < 3; i++) { const a = t * 1.2 + i * 2.09; ctx.strokeStyle = `rgba(${RC},.55)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, GROUND - 2, 34, 8, 0, a, a + 1.4); ctx.stroke(); } glowDot(x, GROUND - 2, 30, RC, 0.25); }
    if (alive && R.monoT > 0) { ctx.save(); ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t * 8); ctx.strokeStyle = `rgb(${RC})`; ctx.lineWidth = 3; rr(x - 30, GROUND - 98, 60, 100, 10); ctx.stroke(); ctx.restore(); lightPool(x, GROUND - 48, 52, RC, 0.25); }
    if (alive && R.stormT > 0) for (let i = 0; i < 6; i++) { const a = t * 3 + i * Math.PI / 3, ox = x + Math.cos(a) * 46, oy = hy + Math.sin(a) * 14; rr(ox - 4, oy - 4, 8, 8, 2); ctx.fillStyle = '#8d94a3'; ctx.fill(); ctx.fillStyle = `rgba(${RC},.95)`; ctx.fillRect(ox - 0.8, oy - 3, 1.6, 6); glowDot(ox, oy, 9, RC, 0.55); }
    const bb = R.fx.o_beben; if (bb > 0) { const p = 1 - bb / 0.5; ctx.strokeStyle = `rgba(${RC},${0.8 * (1 - p)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x + 20, GROUND, 20 + p * 120, 6 + p * 10, 0, 0, 7); ctx.stroke(); for (let i = 0; i < 6; i++) { const rx = x + 30 + i * 18 + p * 30, ry = GROUND - 8 - Math.sin(p * Math.PI) * (10 + (i % 3) * 8); ctx.fillStyle = '#7f8695'; ctx.fillRect(rx, ry, 5, 5); } }
    const gg = R.fx.o_glyphe; if (gg > 0) for (const k of R.order) { const hx = R.pos[k]; if (hx == null || !R.h[k].alive) continue; ctx.strokeStyle = `rgba(${RC},${gg * 1.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(hx, GROUND - 1, 18, 5, 0, 0, 7); ctx.stroke(); glowDot(hx, GROUND - 40, 26, RC, gg * 0.8); }
    const sp = R.fx.sg_o_spalt; if (sp > 0 && R.fx.spaltX != null) { const cx = R.fx.spaltX, a = Math.min(1, sp * 2.5); ctx.strokeStyle = `rgba(${RC},${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 40, GROUND + 2); for (let i = 1; i <= 8; i++) ctx.lineTo(cx - 40 + i * 10, GROUND + 2 + (i % 2 ? -4 : 3)); ctx.stroke(); lightPool(cx, GROUND - 6, 40, RC, 0.5 * a); for (let i = 0; i < 5; i++) { ctx.fillStyle = '#6a7180'; const ry = GROUND - (1 - sp / 0.5) * (30 + i * 9); ctx.fillRect(cx - 22 + i * 10, ry, 6, 6); } }
    if (R.shatterT > 0) for (let i = 0; i < 10; i++) { const ph = (t * 0.6 + i / 10) % 1, px = (R.order.map(k => R.pos[k]).filter(v => v != null)[i % R.order.length] || x) + Math.sin(i * 3.1) * 12; glowDot(px, GROUND - 10 - ph * 80, 5, RC, 0.7 * (1 - ph)); }
  }
  function sigFx(R, t) {
    const hy = GROUND - 34, P = k => R.pos[k];
    const ring = (x, y, r, col, w = 3) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); };
    const sym = (x, y, s, col, size = 13) => { ctx.fillStyle = col; ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(s, x, y); };
    if (R.groundT > 0) { ctx.fillStyle = `rgba(255,228,138,${Math.min(1, R.groundT) * 0.22})`; ctx.fillRect(0, GROUND - 6, R.frontX + 30, 14); }
    if (R.tauntT > 0 && P('w')) ring(P('w'), hy, 26 + Math.sin(t * 9) * 3, 'rgba(255,90,90,.75)');
    if (R.prallT > 0 && P('w')) { ctx.strokeStyle = 'rgba(127,178,255,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(P('w') + 6, hy, 34, -1.1, 1.1); ctx.stroke(); }
    if (R.honorT > 0 && P('r')) { const x = P('r') - 8, y = hy - 52; ctx.fillStyle = '#c9a24a'; ctx.fillRect(x, y, 2, 30); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 20 + Math.sin(t * 6) * 2, y + 6); ctx.lineTo(x + 2, y + 13); ctx.fill(); }
    if (R.wallT > 0) { const x = R.frontX + 32; for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#d8d2bf' : '#bfb8a2'; ctx.fillRect(x, GROUND - 14 - i * 12, 12, 11); } }
    if (R.giant) boneGiant(R.frontX + 30, t, Math.max(0, R.giant.hp / R.giant.max));
    if (R.cloneT > 0 && P('a')) shadowClone(P('a') + 16, t);
    if (R.bearT > 0 && P('d')) ring(P('d'), hy + 6, 24, 'rgba(155,209,74,.8)', 4);
    R.order.forEach(k => { const h = R.h[k]; if (h.alive && (h.invT > 0 || h.protT > 0)) ring(P(k), hy, 22, h.protT > 0 ? 'rgba(127,178,255,.7)' : 'rgba(255,242,176,.8)', 2.5); });
    if (R.holeT > 0) { const x = R.holeX, y = GROUND - 40; ctx.fillStyle = 'rgba(20,6,40,.85)'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); for (let i = 0; i < 3; i++) ring(x, y, 22 + ((t * 30 + i * 9) % 26), `rgba(192,140,255,${0.6 - i * 0.15})`, 2); }
    if (R.beam && R.beam.tgt && P('m')) { const w = 2 + R.beam.i * 1.2; ctx.strokeStyle = 'rgba(226,201,255,.9)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(P('m') + 10, hy - 6); ctx.lineTo(R.beam.tgt.x, GROUND - (R.beam.tgt.boss ? 60 : 30)); ctx.stroke(); glowDot(R.beam.tgt.x, GROUND - (R.beam.tgt.boss ? 60 : 30), 14 + w * 2, '200,150,255', 0.8); }
    if (R.flameT > 0 && P('e')) { const x = R.frontX + 20; for (let i = 0; i < 10; i++) { const f = (t * 3 + i / 10) % 1; glowDot(x + f * 120, GROUND - 26 + Math.sin(i * 7 + t * 20) * 6 * f, 6 + f * 12, f < 0.5 ? '255,200,90' : '255,110,40', 0.9 - f * 0.6); } }
    if (R.aimT > 0 && P('s')) sym(P('s') + 18, hy - 20, '⌖', 'rgba(126,224,138,.95)', 16);
    if (R.fx.sg_t_eber > 0) boar(R.frontX + (0.5 - R.fx.sg_t_eber) * 600, t);
    if (R.fx.sg_w_beben > 0) { ctx.fillStyle = `rgba(120,90,60,${R.fx.sg_w_beben})`; ctx.fillRect(R.frontX + 20, GROUND - 2, W, 6); }
    if (R.fx.sg_e_rakete > 0) glowDot(R.frontX + 120, GROUND - 60, 30 * R.fx.sg_e_rakete * 2, '255,150,60', 0.7);
    for (const e of R.enemies) {
      if (e.manaT > 0) glowDot(e.x, GROUND - (e.boss ? 70 : 30), 16, '192,140,255', 0.5 + Math.sin(t * 12) * 0.2);
      if (e.quakeT > 0) { ctx.fillStyle = 'rgba(120,90,60,.5)'; ctx.fillRect(e.x - 12, GROUND - 3, 24, 4); }
      if (e.bleedT > 0) glowDot(e.x, GROUND - 22, 6, '200,30,40', 0.6);
    }
    const linked = R.enemies.filter(e => e.linkT > 0);
    if (linked.length > 1) { ctx.strokeStyle = 'rgba(107,224,184,.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); linked.forEach((e, i) => (i ? ctx.lineTo(e.x, GROUND - 40) : ctx.moveTo(e.x, GROUND - 40))); ctx.stroke(); ctx.setLineDash([]); }
  }
  function bolt(x0, a, rgb) {
    ctx.strokeStyle = `rgba(${rgb},${a * 2})`; ctx.lineWidth = 4; ctx.beginPath(); let x = x0 || 220, y = 0; ctx.moveTo(x, y);
    while (y < GROUND - 30) { y += 22; x += (Math.random() - 0.5) * 28; ctx.lineTo(x, y); } ctx.stroke();
    ctx.fillStyle = `rgba(${rgb},${a * 0.3})`; ctx.fillRect(0, 0, W, H);
  }
  function bird(x, a, t) {
    const p = 1 - a * 2, bx = 60 + ((x || 260) - 60) * p, by = 60 + p * 110;
    ctx.save(); ctx.translate(bx, by); ctx.fillStyle = '#8a5a2b';
    const f = Math.sin(t * 30) * 8;
    ctx.beginPath(); ctx.moveTo(-14, -f); ctx.lineTo(0, 0); ctx.lineTo(14, -f); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(4, -1, 4, 2); ctx.restore();
  }

