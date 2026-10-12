'use strict';
// Ritterlauf – Solo-Incremental. Läuft komplett im Browser, Spielstand per Passwort.
(function () {
  /* ================= Spiellogik (ohne Grafik) ================= */
  const UPG = [
    { id: 'atk', name: 'Schwert schärfen', desc: '+12 % Schaden', base: 10, grow: 1.17 },
    { id: 'hp', name: 'Kettenhemd', desc: '+12 % Leben', base: 10, grow: 1.17 },
    { id: 'spd', name: 'Schwertkunst', desc: '+6 % Angriffstempo', base: 25, grow: 1.32, max: 25 },
    { id: 'regen', name: 'Kräutertee', desc: '+0,4 % Leben pro Sekunde', base: 40, grow: 1.4, max: 15 },
    { id: 'gold', name: 'Goldgier', desc: '+10 % Gold', base: 60, grow: 1.38 },
  ];
  const TAL = [
    { id: 'krit', br: 'Klinge', name: 'Scharfes Auge', desc: '+8 % Chance auf kritische Treffer', max: 5, cost: 1 },
    { id: 'kritd', br: 'Klinge', name: 'Vernichtung', desc: '+40 % kritischer Schaden', max: 5, cost: 1, req: 'krit' },
    { id: 'doppel', br: 'Klinge', name: 'Doppelschlag', desc: '+12 % Chance, zweimal zuzuschlagen', max: 3, cost: 2, req: 'krit' },
    { id: 'feuer', br: 'Klinge', name: 'Feuerklinge', desc: 'Treffer brennen nach: +30 % Schaden über 2 s', max: 3, cost: 3, req: 'doppel' },
    { id: 'block', br: 'Bollwerk', name: 'Schildwall', desc: '+8 % Chance, einen Treffer abzublocken', max: 5, cost: 1 },
    { id: 'dorn', br: 'Bollwerk', name: 'Dornenpanzer', desc: 'Wirft 25 % des erlittenen Schadens zurück', max: 3, cost: 2, req: 'block' },
    { id: 'raub', br: 'Bollwerk', name: 'Blutdurst', desc: 'Heilt um 3 % des verursachten Schadens', max: 5, cost: 2, req: 'block' },
    { id: 'phoenix', br: 'Bollwerk', name: 'Zweites Leben', desc: 'Einmal pro Lauf mit halbem Leben wieder aufstehen', max: 1, cost: 5, req: 'raub' },
    { id: 'wirbel', br: 'Kampfkunst', name: 'Wirbelwind', desc: 'Fähigkeit: trifft alle nahen Gegner mit 400 % (+150 % je Stufe)', max: 3, cost: 2 },
    { id: 'rausch', br: 'Kampfkunst', name: 'Kampfrausch', desc: 'Wirbelwind wird automatisch eingesetzt', max: 1, cost: 3, req: 'wirbel' },
    { id: 'sprung', br: 'Kampfkunst', name: 'Vorstoß', desc: 'Starte weiter vorne: 10 % deines Rekords je Stufe', max: 5, cost: 2, req: 'wirbel' },
    { id: 'seelen', br: 'Kampfkunst', name: 'Seelensammler', desc: '+1 Seele pro besiegtem Boss', max: 3, cost: 3, req: 'sprung' },
    { id: 'magnet', br: 'Glück', name: 'Goldmagnet', desc: '+25 % Gold', max: 5, cost: 1 },
    { id: 'truhe', br: 'Glück', name: 'Schatzjäger', desc: '+4 % Chance auf eine Truhe mit 10-fachem Gold', max: 4, cost: 2, req: 'magnet' },
    { id: 'heil', br: 'Glück', name: 'Rastplatz', desc: 'Nach jeder Stufe +10 % Leben zusätzlich', max: 3, cost: 2, req: 'magnet' },
    { id: 'ahnen', br: 'Glück', name: 'Ahnenkraft', desc: '+10 % Schaden und Leben je Stufe, ohne Obergrenze', max: 9999, cost: 2, scale: 5 },
    { id: 'zeit', br: 'Glück', name: 'Ausdauer', desc: 'Wirbelwind lädt 15 % schneller', max: 3, cost: 3, req: 'truhe' },
  ];
  const BIOMES = [
    { name: 'Grüne Wiesen', sky: ['#8fc9f2', '#d9f0ff'], hill: ['#6fb45e', '#4f9447'], ground: '#7a5b3a', enemy: 'schleim', boss: 'Schleimkönig' },
    { name: 'Finsterwald', sky: ['#2f5a6b', '#7fa7a0'], hill: ['#2f6b3f', '#1f4d2d'], ground: '#4d3a28', enemy: 'goblin', boss: 'Goblinhäuptling' },
    { name: 'Knochengruft', sky: ['#2a2238', '#5b4d73'], hill: ['#4a4058', '#352d44'], ground: '#3a3344', enemy: 'skelett', boss: 'Knochenfürst' },
    { name: 'Glutberge', sky: ['#5a1f1f', '#e0773b'], hill: ['#6b2d22', '#46201a'], ground: '#2e1d1a', enemy: 'daemon', boss: 'Höllenfürst' },
    { name: 'Frostgipfel', sky: ['#9fc3e6', '#eef6ff'], hill: ['#cfe3f2', '#a9c8df'], ground: '#7e95a8', enemy: 'golem', boss: 'Frostriese' },
  ];

  function fresh() { return { v: 1, gold: 0, souls: 0, best: 0, runs: 0, up: Object.fromEntries(UPG.map(u => [u.id, 0])), tal: Object.fromEntries(TAL.map(t => [t.id, 0])), speed: 1, auto: true }; }
  const upCost = (S, u) => Math.ceil(u.base * Math.pow(u.grow, S.up[u.id]));
  const talOk = (S, t) => !t.req || S.tal[t.req] > 0;
  const talCost = (S, t) => t.cost + (t.scale ? Math.floor(S.tal[t.id] / t.scale) : 0);

  function stats(S) {
    const u = S.up, t = k => S.tal[k] || 0;
    return {
      atk: 10 * Math.pow(1.12, u.atk) * (1 + 0.1 * t('ahnen')), hp: 100 * Math.pow(1.12, u.hp) * (1 + 0.1 * t('ahnen')), aps: 1 + 0.06 * u.spd, regen: 0.004 * u.regen,
      goldMul: (1 + 0.1 * u.gold) * (1 + 0.25 * t('magnet')), crit: 0.05 + 0.08 * t('krit'), critD: 1.5 + 0.4 * t('kritd'),
      dbl: 0.12 * t('doppel'), burn: 0.3 * t('feuer'), block: 0.08 * t('block'), thorns: 0.25 * t('dorn'), steal: 0.03 * t('raub'),
      phoenix: t('phoenix'), whirl: t('wirbel'), whirlMul: 4 + 1.5 * Math.max(0, t('wirbel') - 1), whirlCd: 10 * (1 - 0.15 * t('zeit')),
      auto: t('rausch'), jump: t('sprung'), soulBonus: t('seelen'), chest: 0.04 * t('truhe'), rest: 0.15 + 0.1 * t('heil'),
    };
  }
  const biomeOf = stage => BIOMES[Math.floor((stage - 1) / 10) % BIOMES.length];
  function makeEnemy(stage, i, boss) {
    const hp = 18 * Math.pow(1.16, stage - 1) * (boss ? 9 : 1);
    return { x: 520 + i * 46, hp, max: hp, dmg: 3 * Math.pow(1.14, stage - 1) * (boss ? 2.4 : 1), atkT: 1.2, rate: boss ? 1.6 : 1.3,
      gold: 2 * Math.pow(1.15, stage - 1) * (boss ? 12 : 1), boss, type: biomeOf(stage).enemy, burn: 0, burnT: 0, hitT: 0, bob: Math.random() * 6 };
  }
  function newRun(S) {
    const st = stats(S);
    const start = st.jump ? Math.max(1, Math.floor(S.best * 0.1 * st.jump)) : 1;
    const run = { stage: start, startStage: start, hp: st.hp, kills: 0, gold: 0, souls: 0, phoenixUsed: false, atkT: 0.4, swing: 0, whirlCd: 0, whirlFx: 0,
      enemies: [], floats: [], scroll: 0, dead: false, deadT: 0, time: 0, hurtT: 0 };
    spawnWave(run);
    return run;
  }
  function spawnWave(run) {
    const boss = run.stage % 10 === 0;
    run.enemies = [];
    const n = boss ? 3 : 5;
    for (let i = 0; i < n; i++) run.enemies.push(makeEnemy(run.stage, i, false));
    if (boss) run.enemies.push(makeEnemy(run.stage, n + 0.6, true));
  }
  function float(run, x, y, text, color, size = 14) { run.floats.push({ x, y, text, color, size, t: 1 }); }

  function hit(S, st, run, e, mult) {
    let dmg = st.atk * mult, crit = Math.random() < st.crit;
    if (crit) dmg *= st.critD;
    e.hp -= dmg; e.hitT = 0.15;
    if (st.burn) { e.burn = dmg * st.burn / 2; e.burnT = 2; }
    if (st.steal) run.hp = Math.min(st.hp, run.hp + dmg * st.steal);
    float(run, e.x + (Math.random() * 16 - 8), 150 - (e.boss ? 40 : 0), fmt(dmg), crit ? '#ffd23f' : '#ffffff', crit ? 18 : 13);
  }
  function whirl(S, st, run) {
    if (!st.whirl || run.whirlCd > 0 || run.dead) return false;
    let any = false;
    for (const e of run.enemies) if (e.x < 270) { hit(S, st, run, e, st.whirlMul); any = true; }
    if (!any) return false;
    run.whirlCd = st.whirlCd; run.whirlFx = 0.5;
    return true;
  }
  // Ein Simulationsschritt. Gibt Ereignisse zurück (z. B. 'dead').
  function step(S, st, run, dt) {
    if (run.dead) { run.deadT += dt; return; }
    run.time += dt;
    run.hp = Math.min(st.hp, run.hp + st.hp * st.regen * dt);
    run.whirlCd = Math.max(0, run.whirlCd - dt); run.whirlFx -= dt; run.swing = Math.max(0, run.swing - dt * 4); run.hurtT -= dt;
    run.enemies.sort((a, b) => a.x - b.x);
    let walking = true;
    run.enemies.forEach((e, i) => {
      const target = 160 + i * 34 + (e.boss ? 10 : 0);
      if (e.x > target) e.x = Math.max(target, e.x - 75 * dt); else if (i === 0) walking = false;
      e.hitT -= dt;
      if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burn * dt; }
    });
    if (walking) run.scroll += 70 * dt;
    const front = run.enemies[0];
    if (front && front.x <= 165 + (front.boss ? 10 : 0)) {
      run.atkT -= dt;
      if (run.atkT <= 0) {
        run.atkT += 1 / st.aps; run.swing = 1;
        hit(S, st, run, front, 1);
        if (Math.random() < st.dbl && front.hp > 0) hit(S, st, run, front, 1);
      }
      front.atkT -= dt;
      if (front.atkT <= 0 && front.hp > 0) {
        front.atkT += front.rate;
        if (Math.random() < st.block) float(run, 110, 120, 'Geblockt', '#9fd0ff', 13);
        else {
          run.hp -= front.dmg; run.hurtT = 0.2;
          if (st.thorns) front.hp -= front.dmg * st.thorns;
        }
      }
    } else run.atkT = Math.min(run.atkT, 0.3);
    if (st.auto && st.whirl && run.whirlCd <= 0 && run.enemies.filter(e => e.x < 270).length >= 2) whirl(S, st, run);
    // Besiegte Gegner
    for (const e of run.enemies) {
      if (e.hp > 0) continue;
      let g = e.gold * st.goldMul;
      if (Math.random() < st.chest) { g *= 10; float(run, e.x, 110, 'Truhe!', '#ffd23f', 16); }
      g = Math.max(1, Math.round(g));
      S.gold = Math.min(1e15, S.gold + g); run.gold += g; run.kills++;
      float(run, e.x, 130, '+' + fmt(g), '#ffcf4a', 14);
      if (e.boss) { const s = 1 + Math.floor(run.stage / 25) + st.soulBonus; S.souls += s; run.souls += s; float(run, e.x, 95, `+${s} Seele${s > 1 ? 'n' : ''}`, '#c9a6ff', 16); }
    }
    run.enemies = run.enemies.filter(e => e.hp > 0);
    if (!run.enemies.length) {
      if (run.stage > S.best) S.best = run.stage;
      run.stage++; run.hp = Math.min(st.hp, run.hp + st.hp * st.rest);
      spawnWave(run);
    }
    run.floats.forEach(f => { f.t -= dt; f.y -= 30 * dt; });
    run.floats = run.floats.filter(f => f.t > 0);
    if (run.hp <= 0) {
      if (st.phoenix && !run.phoenixUsed) { run.phoenixUsed = true; run.hp = st.hp * 0.5; float(run, 110, 100, 'Zweites Leben!', '#ffb547', 18); }
      else { run.hp = 0; run.dead = true; S.runs++; return 'dead'; }
    }
  }

  /* ---------- Passwort ---------- */
  const ALPH = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function toNums(S) { return [1, Math.floor(S.gold), S.souls, S.best, S.runs, ...UPG.map(u => S.up[u.id]), ...TAL.map(t => S.tal[t.id])]; }
  function encode(S) {
    const out = [];
    for (let n of toNums(S)) { n = Math.max(0, Math.floor(n)); do { const d = n % 16; n = Math.floor(n / 16); out.push(d + (n > 0 ? 16 : 0)); } while (n > 0); }
    let sum = 0; out.forEach((v, i) => (sum = (sum + v * ((i % 7) + 1)) % 1024));
    out.push(sum % 32, Math.floor(sum / 32));
    return out.map((v, i) => ALPH[(v + i * 7 + 3) % 32]).join('').replace(/(.{4})(?=.)/g, '$1-');
  }
  function decode(code) {
    const raw = String(code).toUpperCase().replace(/O/g, '0').replace(/[I]/g, '1').replace(/[^0-9A-Z]/g, '');
    const vals = [];
    for (let i = 0; i < raw.length; i++) { const k = ALPH.indexOf(raw[i]); if (k < 0) return null; vals.push(((k - i * 7 - 3) % 32 + 64) % 32); }
    if (vals.length < 3) return null;
    const body = vals.slice(0, -2), sumGot = vals[vals.length - 2] + vals[vals.length - 1] * 32;
    let sum = 0; body.forEach((v, i) => (sum = (sum + v * ((i % 7) + 1)) % 1024));
    if (sum !== sumGot) return null;
    const nums = []; let n = 0, mul = 1;
    for (const v of body) { n += (v % 16) * mul; mul *= 16; if (v < 16) { nums.push(n); n = 0; mul = 1; } }
    if (nums[0] !== 1 || nums.length !== 5 + UPG.length + TAL.length) return null;
    const S = fresh();
    [S.gold, S.souls, S.best, S.runs] = nums.slice(1, 5);
    UPG.forEach((u, i) => (S.up[u.id] = Math.min(nums[5 + i], u.max || 9999)));
    TAL.forEach((t, i) => (S.tal[t.id] = Math.min(nums[5 + UPG.length + i], t.max)));
    return S;
  }

  function fmt(n) {
    if (n < 1000) return String(Math.floor(n));
    const units = ['', ' Tsd.', ' Mio.', ' Mrd.', ' Bio.', ' Brd.'];
    let i = 0; while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString()).replace('.', ',') + units[i];
  }

  const core = { UPG, TAL, fresh, stats, newRun, step, whirl, encode, decode, upCost, talOk, talCost, fmt };
  if (typeof module !== 'undefined') { module.exports = core; return; }

  /* ================= Oberfläche ================= */
  const $ = s => document.querySelector(s);
  const KEY = 'fsg.ritter';
  let S = load(), st = stats(S), run = null, tab = 'schmiede', raf = 0, last = 0, active = false, cv, ctx, scale = 1, resign = false, saveT = 0;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); const f = fresh(); return { ...f, ...s, up: { ...f.up, ...s.up }, tal: { ...f.tal, ...s.tal } }; } } catch {}
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} cloudDirty = true; }

  /* ---------- Konto mit eigenem Namen und Passwort ---------- */
  const AKEY = 'fsg.ritter.konto';
  let acct = null, cloudDirty = false, cloudMsg = '', cloudBusy = false, durableInfo = null;
  try { acct = JSON.parse(localStorage.getItem(AKEY) || 'null'); } catch {}
  const setAcct = a => { acct = a; try { a ? localStorage.setItem(AKEY, JSON.stringify(a)) : localStorage.removeItem(AKEY); } catch {} };
  async function api(action, body, keepalive) {
    try {
      const res = await fetch('/api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: !!keepalive });
      const j = await res.json().catch(() => ({}));
      return res.ok ? j : { error: j.error || 'Der Server antwortet gerade nicht.' };
    } catch { return { error: 'Keine Verbindung zum Server.' }; }
  }
  const timeStr = t => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  async function cloudSave(force, keepalive) {
    if (!acct || cloudBusy || (!cloudDirty && !force)) return;
    cloudBusy = true; cloudDirty = false;
    const r = await api('save', { name: acct.name, token: acct.token, data: S }, keepalive);
    cloudBusy = false;
    if (r.error) { cloudDirty = true; cloudMsg = r.error; if (/anmelden/.test(r.error)) setAcct(null); }
    else { acct.updated = r.updated; setAcct(acct); cloudMsg = `Gespeichert um ${timeStr(r.updated)}`; }
    if (tab === 'stand' && !document.activeElement?.closest?.('#rlPanel form')) panel();
  }
  setInterval(() => cloudSave(false), 30000);
  const W = 480, H = 270, GROUND = 222;

  function open() {
    active = true;
    $('#hub').hidden = true; $('#room').hidden = true; $('#solo').hidden = false;
    st = stats(S);
    if (!run) run = newRun(S);
    if (!cv) {
      $('#solo').innerHTML = `
        <div class="topbar"><button class="btn ghost small" id="soloBack">‹ Spiele</button><div class="title"><b>Ritterlauf</b><small>Solo</small></div>
          <button class="btn ghost small" id="soloSpeed">Tempo ×1</button></div>
        <div id="soloCanvas" class="rl-canvas"></div>
        <div class="rl-bar"><div class="rl-stat"><span class="rl-gold" id="rlGold"></span><span class="rl-soul" id="rlSouls"></span><span class="note" id="rlBest"></span></div>
          <button class="btn" id="rlWhirl" hidden>Wirbelwind</button></div>
        <div class="rl-tabs" role="tablist"><button data-tab="schmiede">Schmiede</button><button data-tab="talente">Talente</button><button data-tab="stand">Spielstand</button></div>
        <div id="rlDead"></div><div id="rlPanel"></div>`;
      cv = document.createElement('canvas'); $('#soloCanvas').appendChild(cv); ctx = cv.getContext('2d');
      cv.addEventListener('pointerdown', () => tryWhirl());
      window.addEventListener('resize', sizeCanvas);
      $('#soloBack').onclick = close;
      $('#soloSpeed').onclick = () => { S.speed = S.speed >= 3 ? 1 : S.speed + 1; hud(); };
      $('#rlWhirl').onclick = tryWhirl;
      $('.rl-tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; resign = false; panel(); } };
      $('#rlPanel').addEventListener('click', onPanel);
      $('#rlDead').addEventListener('click', onPanel);
      $('#rlPanel').addEventListener('submit', onSubmit);
    }
    sizeCanvas(); hud(); deadBox(); panel();
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function close() { active = false; cancelAnimationFrame(raf); save(); cloudSave(true); $('#solo').hidden = true; $('#hub').hidden = false; }
  function sizeCanvas() {
    const host = $('#soloCanvas'); const w = Math.min(host.clientWidth || 360, 900);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = w + 'px'; cv.style.height = (w * H / W) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * H / W * dpr); scale = cv.width / W;
  }
  function tryWhirl() { if (run && whirl(S, st, run)) hud(); }

  function loop(now) {
    if (!active) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const steps = S.speed;
    for (let i = 0; i < steps; i++) {
      const ev = step(S, st, run, dt);
      if (ev === 'dead') { save(); deadBox(); cloudSave(true); if (tab !== 'stand') panel(); }
    }
    if (run.dead && S.auto && run.deadT > 3) { run = newRun(S); deadBox(); if (tab !== 'stand') panel(); }
    draw(now / 1000);
    saveT += dt; if (saveT > 0.25) { saveT = 0; hud(); if (tab !== 'stand') refreshButtons(); }
    raf = requestAnimationFrame(loop);
  }
  let saveClock = 0;
  setInterval(() => { if (active) { saveClock++; save(); } }, 4000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); cloudSave(true, true); } });

  function hud() {
    $('#rlGold').textContent = fmt(S.gold) + ' Gold';
    $('#rlSouls').textContent = S.souls + ' Seelen';
    $('#rlBest').textContent = `Rekord: Stufe ${S.best}`;
    $('#soloSpeed').textContent = `Tempo ×${S.speed}`;
    const w = $('#rlWhirl');
    w.hidden = !st.whirl;
    if (st.whirl) { w.disabled = run.whirlCd > 0 || run.dead; w.textContent = run.whirlCd > 0 ? `Wirbelwind ${Math.ceil(run.whirlCd)} s` : st.auto ? 'Wirbelwind (auto)' : 'Wirbelwind!'; }
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function panel() {
    document.querySelectorAll('.rl-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const p = $('#rlPanel');
    let html = '';
    if (tab === 'schmiede') {
      html += `<p class="note">Gold bleibt nach jedem Lauf erhalten. Verbesserungen wirken sofort.</p><div class="rl-shop">` + UPG.map(u => {
        const lvl = S.up[u.id], maxed = u.max && lvl >= u.max, c = upCost(S, u);
        return `<div class="rl-item"><div><b>${u.name}</b> <span class="note">Stufe ${lvl}${u.max ? ` / ${u.max}` : ''}</span><div class="note">${u.desc}</div></div>
          <button class="btn small" data-up="${u.id}" data-cost="${maxed ? '' : c}" ${maxed || S.gold < c ? 'disabled' : ''}>${maxed ? 'Maximal' : fmt(c) + ' Gold'}</button></div>`;
      }).join('') + `</div><p class="note">Schaden ${fmt(st.atk)} · Leben ${fmt(st.hp)} · ${st.aps.toFixed(2).replace('.', ',')} Schläge/s · Krit ${Math.round(st.crit * 100)} %</p>`;
    } else if (tab === 'talente') {
      const brs = [...new Set(TAL.map(t => t.br))];
      html += `<p class="note">Seelen bekommst du für jeden besiegten Boss (alle 10 Stufen).</p><div class="rl-tree">` + brs.map(br => `<div class="rl-branch"><h3>${br}</h3>` + TAL.filter(t => t.br === br).map(t => {
        const r = S.tal[t.id], ok = talOk(S, t), maxed = r >= t.max, req = t.req && TAL.find(x => x.id === t.req), c = talCost(S, t);
        return `<div class="rl-node ${r ? 'has' : ''} ${ok ? '' : 'locked'}"><b>${t.name}</b><span class="note">${t.max > 99 ? `Stufe ${r}` : `${r} / ${t.max}`}</span><div class="note">${t.desc}</div>
          ${!ok ? `<div class="note">Benötigt: ${req.name}</div>` : `<button class="btn small" data-tal="${t.id}" data-cost="${maxed ? '' : c}" ${maxed || S.souls < c ? 'disabled' : ''}>${maxed ? 'Gelernt' : c + (c === 1 ? ' Seele' : ' Seelen')}</button>`}</div>`;
      }).join('') + '</div>').join('') + '</div>';
    } else {
      const code = encode(S);
      if (durableInfo === null) { durableInfo = 'pending'; api('status', {}).then(r => { durableInfo = r.error && r.durable === undefined ? 'pending' : r.durable; if (tab === 'stand' && !document.activeElement?.closest?.('#rlPanel form')) panel(); }); }
      const warn = durableInfo === false ? '<p class="warn">Der Server ist noch nicht für dauerhaftes Speichern eingerichtet. Spielstände gehen verloren, wenn er neu startet. Wer die Seite betreibt, findet die Anleitung in der README.</p>' : '';
      html += `<div class="rl-save">${warn}`;
      if (acct) {
        html += `<h3>Angemeldet als ${esc(acct.name)}</h3>
          <p class="note">Dein Fortschritt wird automatisch gespeichert. Auf einem anderen Gerät meldest du dich einfach mit Name und Passwort an.</p>
          <p class="note" id="rlCloud">${esc(cloudMsg || (acct.updated ? `Zuletzt gespeichert um ${timeStr(acct.updated)}` : ''))}</p>
          <div class="row"><button class="btn small" data-rl="cloudsave">Jetzt speichern</button><button class="btn ghost small" data-rl="logout">Abmelden</button></div>
          <h3>Passwort ändern</h3>
          <form class="rl-form" id="rlPwForm"><input id="rlNewPw" type="password" placeholder="Neues Passwort" autocomplete="new-password"><button class="btn small">Ändern</button></form>`;
      } else {
        html += `<h3>Spielstand speichern</h3>
          <p class="note">Wähle einen Namen und ein Passwort. Damit lädst du deinen Ritter auf jedem Gerät, und er wird ab dann automatisch gespeichert.</p>
          <form class="rl-form" id="rlCreate"><input id="rlCName" placeholder="Name, z. B. Sir Christof" maxlength="20" autocomplete="username">
            <input id="rlCPw" type="password" placeholder="Passwort (mind. 4 Zeichen)" autocomplete="new-password">
            <input id="rlCPw2" type="password" placeholder="Passwort wiederholen" autocomplete="new-password"><button class="btn">Spielstand anlegen</button></form>
          <h3>Spielstand laden</h3>
          <p class="note">Achtung: Der Fortschritt auf diesem Gerät wird durch den geladenen Spielstand ersetzt.</p>
          <form class="rl-form" id="rlLogin"><input id="rlLName" placeholder="Name" maxlength="20" autocomplete="username">
            <input id="rlLPw" type="password" placeholder="Passwort" autocomplete="current-password"><button class="btn">Laden</button></form>`;
      }
      html += `<details class="rl-details"><summary>Notfall-Code (ohne Konto)</summary>
          <p class="note">Dieser Code enthält deinen kompletten Spielstand. Er funktioniert auch ohne Server-Speicher.</p>
          <div class="rl-code" id="rlCode">${code}</div><button class="btn small" data-rl="copy">Kopieren</button>
          <div class="numrow"><input id="rlIn" placeholder="XXXX-XXXX-…" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn" data-rl="load">Code laden</button></div></details>
        <h3>Neu anfangen</h3><button class="btn ${resign ? 'danger' : 'ghost'} small" data-rl="reset">${resign ? 'Wirklich alles löschen? Tippen zum Bestätigen' : 'Spielstand zurücksetzen'}</button></div>`;
    }
    const open = p.querySelector('details[open]');
    p.innerHTML = html;
    if (open && p.querySelector('details')) p.querySelector('details').open = true;
  }
  function deadBox() {
    const d = $('#rlDead');
    if (!run || !run.dead) { d.innerHTML = ''; return; }
    d.innerHTML = `<div class="rl-dead"><b>Gefallen auf Stufe ${run.stage}</b><span>${run.kills} Gegner besiegt · +${fmt(run.gold)} Gold${run.souls ? ` · +${run.souls} Seelen` : ''}</span>
      <div class="row"><button class="btn" data-rl="again">Neuer Lauf</button><label class="rl-check"><input type="checkbox" id="rlAuto" ${S.auto ? 'checked' : ''}> automatisch neu starten</label></div></div>`;
    $('#rlAuto').onchange = e => { S.auto = e.target.checked; save(); };
  }
  function adopt(data) {
    const f = fresh(), s2 = { ...f, ...data, up: { ...f.up, ...(data.up || {}) }, tal: { ...f.tal, ...(data.tal || {}) } };
    s2.speed = S.speed; s2.auto = S.auto; S = s2; st = stats(S); run = newRun(S);
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    deadBox(); hud();
  }
  async function onSubmit(e) {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button');
    const val = id => ($(id).value || '').trim();
    btn.disabled = true;
    try {
      if (f.id === 'rlCreate') {
        if ($('#rlCPw').value !== $('#rlCPw2').value) { toast('Die Passwörter sind unterschiedlich.'); return; }
        const r = await api('create', { name: val('#rlCName'), pass: $('#rlCPw').value, data: S });
        if (r.error) { toast(r.error); return; }
        setAcct({ name: r.name, token: r.token, updated: r.updated }); cloudMsg = `Gespeichert um ${timeStr(r.updated)}`; cloudDirty = false;
        toast(`Spielstand „${r.name}“ angelegt`); panel();
      } else if (f.id === 'rlLogin') {
        const r = await api('login', { name: val('#rlLName'), pass: $('#rlLPw').value });
        if (r.error) { toast(r.error); return; }
        setAcct({ name: r.name, token: r.token, updated: r.updated }); adopt(r.data || {}); cloudDirty = false;
        cloudMsg = `Geladen – zuletzt gespeichert um ${timeStr(r.updated)}`; toast(`Willkommen zurück, ${r.name}!`); panel();
      } else if (f.id === 'rlPwForm') {
        const r = await api('password', { name: acct.name, token: acct.token, pass: $('#rlNewPw').value });
        if (r.error) { toast(r.error); return; }
        acct.token = r.token; setAcct(acct); toast('Passwort geändert'); panel();
      }
    } finally { btn.disabled = false; }
  }
  function refreshButtons() {
    document.querySelectorAll('#rlPanel [data-cost]').forEach(b => {
      const c = Number(b.dataset.cost); if (!b.dataset.cost) return;
      b.disabled = (b.dataset.up ? S.gold : S.souls) < c;
    });
  }
  function toast(m) { const t = $('#toast'); t.textContent = m; t.className = 'toast'; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3000); }
  function onPanel(e) {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.up) {
      const u = UPG.find(x => x.id === b.dataset.up), c = upCost(S, u);
      if (S.gold >= c && !(u.max && S.up[u.id] >= u.max)) { S.gold -= c; S.up[u.id]++; const oldMax = st.hp; st = stats(S); if (u.id === 'hp' && run) run.hp += st.hp - oldMax; save(); panel(); hud(); }
    } else if (b.dataset.tal) {
      const t = TAL.find(x => x.id === b.dataset.tal);
      const c = talCost(S, t);
      if (talOk(S, t) && S.souls >= c && S.tal[t.id] < t.max) { S.souls -= c; S.tal[t.id]++; st = stats(S); save(); panel(); hud(); }
    } else if (b.dataset.rl === 'again') { run = newRun(S); deadBox(); }
    else if (b.dataset.rl === 'cloudsave') { cloudMsg = 'Wird gespeichert …'; panel(); cloudSave(true); }
    else if (b.dataset.rl === 'logout') { cloudSave(true).then(() => { setAcct(null); cloudMsg = ''; panel(); toast('Abgemeldet. Dein Spielstand bleibt auf dem Server.'); }); }
    else if (b.dataset.rl === 'copy') {
      const code = $('#rlCode').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('Passwort kopiert'), () => {
        const r = document.createRange(); r.selectNodeContents($('#rlCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Passwort markiert – jetzt kopieren');
      });
    } else if (b.dataset.rl === 'load') {
      const s = decode($('#rlIn').value);
      if (!s) { toast('Dieses Passwort stimmt nicht. Prüfe jedes Zeichen.'); return; }
      adopt(s); save(); panel(); toast('Spielstand geladen');
    } else if (b.dataset.rl === 'reset') {
      if (!resign) { resign = true; panel(); setTimeout(() => { if (resign) { resign = false; if (tab === 'stand') panel(); } }, 4000); return; }
      resign = false; adopt(fresh()); save(); panel(); toast('Neuer Spielstand');
    }
  }

  /* ---------- Zeichnen ---------- */
  function draw(t) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const bm = biomeOf(run.stage);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, bm.sky[0]); g.addColorStop(1, bm.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    hills(bm.hill[0], 0.25, 150, 26, 0.012);
    hills(bm.hill[1], 0.5, 180, 18, 0.02);
    ctx.fillStyle = bm.ground; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let x = -(run.scroll % 32); x < W; x += 32) ctx.fillRect(x, GROUND + 8, 16, 4);
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(0, GROUND, W, 3);
    // Gegner von hinten nach vorne
    [...run.enemies].sort((a, b) => b.x - a.x).forEach(e => enemy(e, t));
    knight(108, GROUND, t);
    if (run.whirlFx > 0) {
      ctx.strokeStyle = `rgba(255,220,150,${run.whirlFx * 1.6})`; ctx.lineWidth = 6;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(110, GROUND - 30, 40 + i * 22 + (0.5 - run.whirlFx) * 80, t * 12 + i, t * 12 + i + 2.4); ctx.stroke(); }
    }
    run.floats.forEach(f => { ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = `${f.size}px "Bungee","Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); });
    ctx.globalAlpha = 1;
    // Kopfzeile
    ctx.fillStyle = 'rgba(15,12,22,.55)'; ctx.fillRect(0, 0, W, 34);
    ctx.font = '14px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(`Stufe ${run.stage}`, 10, 22);
    ctx.font = '12px "Figtree",sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText(run.stage % 10 === 0 ? `Boss: ${bm.boss}` : bm.name, 100, 22);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(W - 170, 12, 160, 12);
    ctx.fillStyle = run.hurtT > 0 ? '#ff7a7a' : '#e5484d'; ctx.fillRect(W - 170, 12, 160 * Math.max(0, run.hp / st.hp), 12);
    ctx.font = '10px "Figtree",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(`${fmt(Math.max(0, run.hp))} / ${fmt(st.hp)}`, W - 90, 22);
    if (run.dead) {
      ctx.fillStyle = 'rgba(15,12,22,.65)'; ctx.fillRect(0, 0, W, H);
      ctx.font = '26px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#ffb547'; ctx.fillText('GEFALLEN', W / 2, H / 2 - 10);
      ctx.font = '13px "Figtree",sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(S.auto ? `Neuer Lauf in ${Math.max(0, Math.ceil(3 - run.deadT))} s – nutze die Zeit für Verbesserungen` : 'Verbessere dich in der Schmiede und starte neu', W / 2, H / 2 + 18);
    }
  }
  function hills(color, par, base, amp, freq) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) { const wx = x + run.scroll * par; ctx.lineTo(x, base - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.3 + 1) * amp * 0.4); }
    ctx.lineTo(W, H); ctx.fill();
  }
  function knight(x, y, t) {
    const walk = run.enemies.length && run.enemies[0].x > 166 && !run.dead;
    const step = walk ? Math.sin(t * 12) : 0, bob = walk ? Math.abs(Math.sin(t * 12)) * 2 : 0;
    ctx.save(); ctx.translate(x, y - bob);
    if (run.dead) { ctx.rotate(-1.3); ctx.translate(-10, 6); }
    // Beine
    ctx.fillStyle = '#3d3a48'; ctx.fillRect(-9 + step * 3, -22, 7, 22); ctx.fillRect(2 - step * 3, -22, 7, 22);
    // Schild hinten
    ctx.fillStyle = '#2f5aa8'; ctx.beginPath(); ctx.moveTo(-20, -48); ctx.lineTo(-6, -48); ctx.lineTo(-6, -30); ctx.lineTo(-13, -22); ctx.lineTo(-20, -30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-14, -45, 2, 18); ctx.fillRect(-18, -38, 10, 2);
    // Körper
    ctx.fillStyle = '#c9cdd6'; ctx.fillRect(-10, -50, 20, 30);
    ctx.fillStyle = '#b8323a'; ctx.fillRect(-7, -46, 14, 24); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1, -44, 2, 18);
    // Kopf
    ctx.fillStyle = '#d9dde5'; ctx.beginPath(); ctx.arc(0, -60, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1726'; ctx.fillRect(1, -62, 10, 3);
    ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(-2, -70); ctx.quadraticCurveTo(-18, -82 + Math.sin(t * 6) * 2, -20, -62); ctx.quadraticCurveTo(-10, -70, -2, -66); ctx.fill();
    // Schwert
    const ang = -1.25 + (1 - run.swing) * 0 + (run.swing > 0 ? (1 - run.swing) * 2.2 - 0.2 : 0.35);
    ctx.save(); ctx.translate(8, -40); ctx.rotate(run.whirlFx > 0 ? t * 30 : ang);
    ctx.fillStyle = '#7a5b3a'; ctx.fillRect(-2, -3, 8, 6);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(5, -7, 3, 14);
    ctx.fillStyle = st.burn ? '#ffb070' : '#eef2f7'; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(40, -2); ctx.lineTo(45, 0); ctx.lineTo(40, 2); ctx.lineTo(8, 3); ctx.fill();
    ctx.restore();
    if (run.hurtT > 0) { ctx.fillStyle = 'rgba(255,60,60,.35)'; ctx.fillRect(-14, -74, 30, 74); }
    ctx.restore();
  }
  function enemy(e, t) {
    const s = e.boss ? 1.8 : 1, y = GROUND, bob = Math.sin(t * 6 + e.bob) * 2;
    ctx.save(); ctx.translate(e.x, y); ctx.scale(s, s);
    const flash = e.hitT > 0;
    const col = c => (flash ? '#ffffff' : c);
    if (e.type === 'schleim') {
      ctx.fillStyle = col('#58c46a'); ctx.beginPath(); ctx.ellipse(0, -12 + bob / 2, 16, 12 - bob / 2, 0, Math.PI, 0); ctx.lineTo(16, 0); ctx.lineTo(-16, 0); ctx.fill();
      eyes(-6, -14, '#fff');
    } else if (e.type === 'goblin') {
      ctx.fillStyle = col('#5e8c3a'); ctx.fillRect(-8, -26, 16, 18); ctx.fillRect(-7, -8, 5, 8); ctx.fillRect(2, -8, 5, 8);
      ctx.beginPath(); ctx.arc(0, -32 + bob / 2, 9, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, -34); ctx.lineTo(-16, -40); ctx.lineTo(-7, -30); ctx.fill();
      ctx.fillStyle = col('#8a6a3a'); ctx.fillRect(-14, -24, 3, 22);
      eyes(-6, -33, '#ffd23f');
    } else if (e.type === 'skelett') {
      ctx.fillStyle = col('#e8e2d0'); ctx.fillRect(-2, -28, 4, 20); for (let i = 0; i < 3; i++) ctx.fillRect(-7, -26 + i * 5, 14, 2);
      ctx.fillRect(-6, -8, 3, 8); ctx.fillRect(3, -8, 3, 8);
      ctx.beginPath(); ctx.arc(0, -35 + bob / 2, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#1b1726'; ctx.fillRect(-5, -37, 3, 3); ctx.fillRect(-1, -37, 3, 3);
      ctx.fillStyle = col('#9aa3ad'); ctx.fillRect(-16, -30, 2, 24);
    } else if (e.type === 'daemon') {
      ctx.fillStyle = col('#c4382f'); ctx.fillRect(-10, -30, 20, 22); ctx.fillRect(-8, -8, 6, 8); ctx.fillRect(2, -8, 6, 8);
      ctx.beginPath(); ctx.arc(0, -36 + bob / 2, 10, 0, 7); ctx.fill();
      ctx.fillStyle = col('#2a1a1a'); ctx.beginPath(); ctx.moveTo(-8, -42); ctx.lineTo(-12, -54); ctx.lineTo(-3, -44); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, -42); ctx.lineTo(12, -54); ctx.lineTo(3, -44); ctx.fill();
      ctx.fillStyle = 'rgba(255,160,60,.5)'; ctx.beginPath(); ctx.arc(0, -20, 14 + Math.sin(t * 8) * 2, 0, 7); ctx.fill();
      eyes(-7, -38, '#ffd23f');
    } else {
      ctx.fillStyle = col('#a9c8df'); ctx.fillRect(-13, -32, 26, 24); ctx.fillRect(-11, -8, 8, 8); ctx.fillRect(3, -8, 8, 8);
      ctx.fillStyle = col('#cfe3f2'); ctx.fillRect(-9, -46 + bob / 2, 18, 14); ctx.fillRect(-20, -30, 7, 18);
      eyes(-6, -40, '#4fc3ff');
    }
    if (e.boss) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-8, -50); ctx.lineTo(-8, -58); ctx.lineTo(-4, -53); ctx.lineTo(0, -60); ctx.lineTo(4, -53); ctx.lineTo(8, -58); ctx.lineTo(8, -50); ctx.fill(); }
    if (e.burnT > 0) { ctx.fillStyle = 'rgba(255,140,40,.8)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-6 + i * 6, -10 - ((t * 40 + i * 9) % 20), 2.5, 0, 7); ctx.fill(); } }
    ctx.restore();
    // Lebensbalken
    const bw = e.boss ? 60 : 30, by = y - (e.boss ? 112 : 54);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(e.x - bw / 2, by, bw, 5);
    ctx.fillStyle = e.boss ? '#c9a6ff' : '#e5484d'; ctx.fillRect(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 5);
  }
  function eyes(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 4, 4); ctx.fillRect(x + 8, y, 4, 4); ctx.fillStyle = '#111'; ctx.fillRect(x - 1 + 1, y + 1, 2, 2); ctx.fillRect(x + 7 + 1, y + 1, 2, 2); }

  window.Ritter = { open, close, isOpen: () => active };
})();
