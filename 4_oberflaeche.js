// Teil 4: Oberfläche (Menüs, Lobby, Konto, Spielschleife) – schließt das Skript ab
// Teil von Ritterlauf. Der Server setzt alle Teile in dieser Reihenfolge zu /ritter.js zusammen:
// 1_spiel.js → 2_audio.js → 3_grafik.js → 4_oberflaeche.js. Einzeln ist eine Datei kein gültiges Skript.

  /* ================= Oberfläche ================= */
  const $ = s => document.querySelector(s);
  const KEY = 'fsg.ritter';
  const ACT_NAME = id => NODE[id].name;
  const PORTRAIT = { r: '⚔', w: '⛨', s: '➶', m: '✦', p: '☀', t: '✥', a: '☾', n: '☠', b: '♪', d: '❀', e: '⚙', o: '⬢' };
  let S = load(), st = stats(S), run = null, tab = 'ritter', raf = 0, last = 0, active = false, cv, ctx, scale = 1, cine = null, areaBefore = 0;
  const sel = Object.fromEntries(HEROES.map(h => [h.tree, h.hire || 'start']));
  let confirm = '', hudT = 0, runeSel = null;
  let notice = S.reset ? 'Neue Version: Dein alter Spielstand stammte aus der allerersten Version und wurde zurückgesetzt. Ab jetzt bleibt dein Fortschritt bei Updates erhalten.' : '';
  if (S.reset) delete S.reset;
  function load() { try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch {} return fresh(); }
  function save() { if (acct && acct.tester) S.tst = 1; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} cloudDirty = true; }
  const inCamp = () => !run || run.dead;

  let wSel = [], wRes = null, fSlots = [], fRes = null;
  let shopSel = 'stern', runeView = 'ausr', forgeSort = 'art', forgeFilt = 'all', forgeSel = null; try { shopSel = localStorage.getItem('fsg.ritter.shop') || 'stern'; } catch {}
  let lowFx = false, fxAvg = 1 / 60, fxClock = 0;

  /* ---------- Konto mit eigenem Namen und Passwort ---------- */
  const AKEY = 'fsg.ritter.konto';
  let acct = null, cloudDirty = false, cloudMsg = '', cloudBusy = false, durableInfo = null;
  try { acct = JSON.parse(localStorage.getItem(AKEY) || 'null'); } catch {}
  // Neue Saison: Gäste und bekannte Nicht-Tester werden lokal zurückgesetzt, Tester behalten ihren Stand.
  // Bei unbekanntem Tester-Status entscheidet der Server beim nächsten Speichern.
  let seasonNote = false;
  function seasonCheck() {
    if ((S.season || 0) >= SEASON) return;
    if (acct && acct.tester === true) { S.season = SEASON; save(); return; }
    if (!acct || acct.tester === false) seasonReset();
  }
  function seasonReset() {
    S = migrate({ season: SEASON }); S.season = SEASON; run = null; seasonNote = true;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    if (active) { refresh(); seasonInfo(); }
  }
  function seasonInfo() {
    if (!seasonNote) return; seasonNote = false;
    modal(`<span class="rl-mic">⚔</span><h2>Ritterlauf ${GAME_VERSION}</h2><p>Mit dem Start von Version ${GAME_VERSION} beginnen <b>alle neu</b>. Die Testphase ist vorbei, und dein Spielstand wurde zurückgesetzt. Dein Name und Passwort bleiben erhalten.</p><p class="note">Danke fürs Testen und viel Spaß beim neuen Abenteuer!</p>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Los geht’s</button></div>`);
  }
  const setAcct = a => { acct = a; if (a && a.tester && S && !S.tst) { S.tst = 1; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} } try { a ? localStorage.setItem(AKEY, JSON.stringify(a)) : localStorage.removeItem(AKEY); } catch {} };
  async function api(action, body, keepalive) {
    try {
      const res = await fetch('/api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: !!keepalive });
      const j = await res.json().catch(() => ({}));
      return res.ok ? j : { ...j, error: j.error || 'Der Server antwortet gerade nicht.' };
    } catch { return { error: 'Keine Verbindung zum Server.' }; }
  }
  const timeStr = t => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const typing = () => document.activeElement?.closest?.('#rlPanel form');
  let conflict = null; // neuerer Stand von einem anderen Gerät, wartet auf Entscheidung
  async function cloudSave(force, keepalive, keep) {
    if (conflict && !keep) { if (inCamp()) resolveConflict(conflict); return {}; }
    if (!acct || cloudBusy || (!cloudDirty && !force)) return {};
    cloudBusy = true; cloudDirty = false;
    const r = await api('save', { name: acct.name, token: acct.token, data: S, base: acct.updated || 0, force: !!keep }, keepalive);
    cloudBusy = false;
    if (r.reset) { acct.updated = r.updated; acct.tester = false; setAcct(acct); seasonReset(); cloudDirty = true; setTimeout(() => cloudSave(true, false, true), 300); return r; }
    if (r.conflict) { resolveConflict({ data: r.data, updated: r.updated }); return r; }
    if (r.error) { cloudDirty = true; cloudMsg = r.error; if (/anmelden/.test(r.error)) setAcct(null); }
    else { acct.updated = r.updated; acct.tester = !!r.tester; setAcct(acct); cloudMsg = `Gespeichert um ${timeStr(r.updated)}`; if (acct.tester && (S.season || 0) < SEASON) { S.season = SEASON; save(); } }
    if (tab === 'stand' && !typing() && active) panel();
    return r;
  }
  // Test-Werkzeug: Stufe kaufen, kostenlos kaufen oder eine Stufe zurücknehmen
  // Test: beliebiges Tempo
  function testSpeed() {
    modal(`<span class="rl-mic">⏩</span><h2>Tempo (Test)</h2><p class="note">Beliebige Zahl, z. B. 0,5 oder 10. Normal geht bis ×${String(maxSpeed(S)).replace('.', ',')}.</p>
      <div class="numrow" style="justify-content:center;margin:8px 0"><input id="rlTSpeed" inputmode="decimal" value="${String(S.speed).replace('.', ',')}" style="max-width:120px;text-align:center"></div>
      <div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn" data-m="ok" data-tspeed="set">Setzen</button><button class="btn ghost" data-m="ok" data-tspeed="cycle">Normal weiterschalten</button><button class="btn ghost" data-m="ok">Abbrechen</button></div>`);
  }
  // Test: bestimmte Rune auswählen
  let tRSort = 'art', tRFilt = 'all';
  function testRunePicker(amt = 1) {
    const chips = tRSort === 'art' ? RUNES.map(r => [r.id, r.name, r.color]) : Array.from({ length: 10 }, (_, i) => [String(i + 1), 'Stufe ' + ROMAN[i + 1], '#c9a6ff']);
    const tiles = [];
    for (const R of RUNES) for (let tier = 1; tier <= 10; tier++) {
      if (tRFilt !== 'all' && (tRSort === 'art' ? R.id !== tRFilt : String(tier) !== tRFilt)) continue;
      tiles.push({ R, tier });
    }
    if (tRSort === 'stufe') tiles.sort((a, b) => a.tier - b.tier);
    modal(`<span class="rl-mic">🧪</span><h2>Rune bekommen</h2><p class="note">Lager ${S.runes.length}/${runeCap(S)} · ist das Lager voll, gibt es Splitter.</p>
      <div class="numrow" style="justify-content:center;margin:4px 0"><label class="note" for="rlTRAmt">Anzahl</label><input id="rlTRAmt" type="number" min="1" value="${amt}" style="max-width:90px;text-align:center"></div>
      <div class="rl-fbar" style="justify-content:center"><span class="note">Sortieren:</span><button data-trsort="art" class="${tRSort === 'art' ? 'on' : ''}">nach Art</button><button data-trsort="stufe" class="${tRSort === 'stufe' ? 'on' : ''}">nach Stufe</button></div>
      <div class="rl-fbar chips" style="justify-content:center"><button data-trfilt="all" class="${tRFilt === 'all' ? 'on' : ''}">Alle</button>${chips.map(([v, nm, c]) => `<button data-trfilt="${v}" class="${tRFilt === v ? 'on' : ''}" style="--rc:${c}">${esc(nm)}</button>`).join('')}</div>
      <div class="rl-fgrid rl-tgrid">${tiles.map(({ R, tier }) => `<button class="rl-ftile" data-tgive="${R.id}:${tier}" style="--rc:${R.color}" title="${esc(R.desc(runeVal(R.id, tier)))}"><b>${ROMAN[tier]}</b><small>${R.name}</small></button>`).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-m="ok">Fertig</button></div>`);
  }
  document.addEventListener('click', e => {
    if (!(acct && acct.tester) || !e.target.closest) return;
    const sp = e.target.closest('[data-tspeed]');
    if (sp) { if (sp.dataset.tspeed === 'set') { const v = Number(String($('#rlTSpeed').value).replace(',', '.')); if (v > 0 && v <= 100) { S.speed = v; save(); hud(); toast(`Tempo ×${String(v).replace('.', ',')}`); } else toast('Bitte eine Zahl zwischen 0,1 und 100.'); }
      else { S.speed = S.speed >= maxSpeed(S) ? 1 : S.speed < 3 ? Math.floor(S.speed) + 1 : S.speed + 0.5; if (S.speed > maxSpeed(S)) S.speed = 1; save(); hud(); } return; }
    const amtNow = () => Math.max(1, Math.min(200, Math.floor(Number($('#rlTRAmt') && $('#rlTRAmt').value) || 1)));
    const so = e.target.closest('[data-trsort]'); if (so) { tRSort = so.dataset.trsort; tRFilt = 'all'; testRunePicker(amtNow()); e.stopPropagation(); return; }
    const fi = e.target.closest('[data-trfilt]'); if (fi) { tRFilt = fi.dataset.trfilt; testRunePicker(amtNow()); e.stopPropagation(); return; }
    const gv = e.target.closest('[data-tgive]');
    if (gv) { const [t, tier] = gv.dataset.tgive.split(':'), n = amtNow(); let got = 0; for (let i = 0; i < n; i++) if (addRune(S, t, Number(tier))) got++;
      SND.play('rune'); toast(got ? `${got}× ${RUNE[t].name} ${ROMAN[tier]} ins Lager` : 'Lager voll, als Splitter gutgeschrieben.'); save(); if (active) refresh(); testRunePicker(n); e.stopPropagation(); }
  }, true);
  function testInfo(key) {
    const [kind, id] = key.split(':');
    if (kind === 'n') { const n = NODE[id]; return n && { name: n.name, r: rank(S, id), max: n.max, can: canBuy(S, n), cost: (c => [c.g ? `${fmt(c.g)} Gold` : '', c.s ? `${c.s} Seelen` : ''].filter(Boolean).join(' + ') || 'gratis')(nodeCost(S, n)) }; }
    if (kind === 'p') { const p = PERKS.find(x => x.id === id); return p && { name: p.name, r: perk(S, id), max: p.max, can: perk(S, id) < p.max && S.stars >= perkCost(S, p), cost: `${perkCost(S, p)} Sterne` }; }
    const p = CPERKS.find(x => x.id === id); return p && { name: p.name, r: cperk(S, id), max: p.max, can: cperk(S, id) < p.max && S.crowns >= cperkCost(S, p), cost: `${cperkCost(S, p)} Kronen` };
  }
  function testMenu(key) {
    const i = testInfo(key); if (!i) return;
    modal(`<span class="rl-mic">🧪</span><h2>${esc(i.name)}</h2><p class="note">Stufe ${i.r}${i.max < 9999 ? ` von ${i.max}` : ''} · Test-Werkzeug</p>
      <div class="numrow" style="justify-content:center;margin:6px 0 10px"><label class="note" for="rlTAmt">Anzahl Stufen</label><input id="rlTAmt" type="number" inputmode="numeric" min="1" value="1" style="max-width:110px;text-align:center"></div>
      <div class="row" style="justify-content:center;flex-wrap:wrap;gap:8px">
        <button class="btn" data-m="ok" data-tdo="buy:${key}" ${i.can && inCamp() ? '' : 'disabled'}>1. Kaufen (nächste: ${i.cost})</button>
        <button class="btn" data-m="ok" data-tdo="free:${key}" ${i.r < i.max ? '' : 'disabled'}>2. Kostenlos kaufen</button>
        <button class="btn ghost" data-m="ok" data-tdo="sell:${key}" ${i.r > 0 ? '' : 'disabled'}>3. Verkaufen</button>
        <button class="btn ghost" data-m="ok">Abbrechen</button></div>`);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-tdo]'); if (!b || b.disabled || !(acct && acct.tester)) return;
    const [mode, kind, id] = b.dataset.tdo.split(':');
    const store = kind === 'n' ? S.nodes : kind === 'p' ? S.perks : S.cperks;
    const max = kind === 'n' ? NODE[id].max : (kind === 'p' ? PERKS : CPERKS).find(x => x.id === id).max;
    const r = store[id] || 0, amtEl = document.getElementById('rlTAmt'), amt = Math.max(1, Math.min(100000, Math.floor(Number(amtEl && amtEl.value) || 1)));
    let done = 0;
    if (mode === 'buy') { for (; done < amt; done++) { const ok = kind === 'n' ? buy(S, NODE[id]) : kind === 'p' ? buyPerk(S, PERKS.find(x => x.id === id)) : buyCperk(S, CPERKS.find(x => x.id === id)); if (!ok) break; } }
    else if (mode === 'free') { done = Math.min(amt, max - r); if (done <= 0) return; store[id] = r + done; if (kind === 'n' && NODE[id].active && r === 0 && eqOf(S, NODE[id].tree, NODE[id].sig).length < slotLim(S, NODE[id].tree, NODE[id].sig)) S.equip.push(id); }
    else { done = Math.min(amt, r); if (done <= 0) return; if (r - done > 0) store[id] = r - done; else { delete store[id]; if (kind === 'n') S.equip = S.equip.filter(x => x !== id); } if (kind === 'n') S.nodes.start = 1; }
    if (!done) { toast('Nicht genug Gold, Seelen, Sterne oder Kronen.'); return; }
    SND.play(mode === 'sell' ? 'tick' : 'buy'); toast(`${done} Stufe${done > 1 ? 'n' : ''} ${mode === 'sell' ? 'verkauft' : 'gekauft'}: jetzt Stufe ${store[id] || 0}`); setTimeout(afterChange, 0);
  }, true);
  // Automatisch: der Stand mit mehr (oder gleich vielen) Läufen gewinnt
  function resolveConflict(c) {
    conflict = c;
    const srv = Math.floor(Number(c.data && c.data.runs) || 0), loc = Math.floor(Number(S.runs) || 0);
    if (srv >= loc) {
      if (!inCamp()) return; // erst nach dem Lauf übernehmen
      conflict = null; adopt(c.data || {}); acct.updated = c.updated; setAcct(acct); cloudDirty = false;
      cloudMsg = `Neuerer Stand geladen (${srv} Läufe)`; if (active) toast(`Spielstand vom anderen Gerät geladen (${srv} Läufe).`);
    } else { conflict = null; cloudSave(true, false, true); cloudMsg = `Dieser Stand hat mehr Läufe (${loc}) und wurde gespeichert.`; }
  }
  function showConflict() {
    if (!conflict) return;
    const d = conflict.data || {}, num = v => Math.max(0, Math.floor(Number(v) || 0));
    const desc = x => `${num(x.asc) ? `${num(x.asc)}× Aufstieg, ` : ''}${num(x.rebirths)}× Wiedergeburt, Rekord Stufe ${Math.max(num(x.best), 0)}, ${num(x.runs)} Läufe`;
    modal(`<span class="rl-mic">⇅</span><h2>Neuerer Spielstand gefunden</h2>
      <p class="note">Mit „${esc(acct ? acct.name : '')}“ wurde um <b>${timeStr(conflict.updated)}</b> auf einem anderen Gerät weitergespielt.</p>
      <ul class="rl-list"><li><b>Anderes Gerät:</b> ${desc(d)}</li><li><b>Dieses Gerät:</b> ${desc(S)}</li></ul>
      <div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn" data-m="ok" data-sync="load">Stand vom anderen Gerät laden</button>
      <button class="btn ghost" data-m="ok" data-sync="keep">Diesen Stand behalten</button></div>
      <p class="note" style="text-align:center">Im Zweifel: laden. Der Stand, mit dem zuletzt gespielt wurde, ist meistens der richtige.</p>`);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-sync]'); if (!b || !conflict) return;
    const c = conflict; conflict = null;
    if (b.dataset.sync === 'load') { adopt(c.data || {}); acct.updated = c.updated; setAcct(acct); cloudDirty = false; cloudMsg = `Geladen – zuletzt gespeichert um ${timeStr(c.updated)}`; toast('Spielstand vom anderen Gerät geladen.'); }
    else { cloudSave(true, false, true).then(() => toast('Dieser Stand wurde gespeichert.')); }
  }, true);
  setInterval(() => cloudSave(false), 30000);
  setInterval(() => { if (active) save(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); cloudSave(true, true); } });

  const W = 480, H = 270, GROUND = 222;
  function tabsList() {
    const t = [];
    for (const h of HEROES) if (classOpen(S, h.tree) || S.rebirths + 1 >= h.rebirth) t.push({ id: h.tree, label: h.name, color: h.color, locked: !classOpen(S, h.tree) });
    if (S.rebirths >= 1 || S.asc || S.stars || S.crowns || S.tempo || expOpen(S)) t.push({ id: 'laeden', label: 'Läden', color: '#ffcf4a' });
    if (expOpen(S)) t.push({ id: 'exp', label: 'Expedition', color: '#9bd14a' });
    if (feature(S, 'runen') || S.runes.length) t.push({ id: 'runen', label: 'Runen', color: '#ff7a3d' });
    if (S.asc >= 2 || Object.keys(S.comps).length) t.push({ id: 'begleiter', label: 'Begleiter', color: '#ff9a3d' });
    if (ahnOpen(S)) t.push({ id: 'ahnen', label: 'Ahnenprüfung', color: '#ffd27a' });
    t.push({ id: 'halle', label: 'Ruhmeshalle', color: '#ffd23f' }, { id: 'ruhm', label: S.asc || S.rebirths >= 9 ? 'Wiedergeburt & Aufstieg' : 'Wiedergeburt', color: '#c9a6ff' }, { id: 'stand', label: 'Spielstand', color: '#a99fbb' });
    return t;
  }
  // Reiter in Gruppen: alle Helden unter „Helden“, Ahnenprüfung und Expedition unter „Abenteuer“
  const TAB_GROUPS = { helden: { label: 'Helden', color: '#ffb547' }, abenteuer: { label: 'Abenteuer', color: '#ffd27a' } };
  const groupOf = id => (HERO[id] ? 'helden' : id === 'ahnen' || id === 'exp' ? 'abenteuer' : null);
  const lastSub = { helden: 'ritter', abenteuer: 'ahnen' };
  function renderTabs() {
    const list = tabsList();
    if (!list.some(t => t.id === tab)) tab = 'ritter';
    const g = groupOf(tab); if (g) lastSub[g] = tab;
    const top = [], seen = new Set();
    for (const t of list) {
      const gr = groupOf(t.id);
      if (!gr) { top.push(t); continue; }
      if (seen.has(gr)) continue; seen.add(gr);
      const members = list.filter(x => groupOf(x.id) === gr), target = members.some(x => x.id === lastSub[gr]) ? lastSub[gr] : members[0].id;
      top.push(members.length > 1 || gr === 'helden' ? { id: target, label: TAB_GROUPS[gr].label, color: g === gr ? (list.find(x => x.id === tab) || {}).color || TAB_GROUPS[gr].color : TAB_GROUPS[gr].color, group: gr } : members[0]);
    }
    const isOn = t => (t.group ? t.group === g : t.id === tab);
    // Neu erschienene Reiter bekommen einen roten Punkt, bis man sie einmal öffnet
    if (!Array.isArray(S.knownTabs)) S.knownTabs = list.map(t => t.id);
    if (!S.knownTabs.includes(tab)) S.knownTabs.push(tab);
    const isNew = id => !S.knownTabs.includes(id), groupNew = gr => list.some(x => groupOf(x.id) === gr && isNew(x.id));
    const dot = on => (on ? '<i class="rl-reddot rl-tdot" aria-label="neu"></i>' : '');
    let html = `<div class="rl-trow">${top.map(t => `<button data-tab="${t.id}" class="${isOn(t) ? 'on' : ''} ${t.locked ? 'locked' : ''}" style="--tc:${t.color}">${t.label}${dot(t.group ? groupNew(t.group) : isNew(t.id))}</button>`).join('')}</div>`;
    if (g) {
      const members = list.filter(x => groupOf(x.id) === g);
      if (members.length > 1) html += `<div class="rl-sub">${members.map(t => { const h = HERO[t.id];
        return `<button data-tab="${t.id}" class="${t.id === tab ? 'on' : ''} ${t.locked ? 'locked' : ''}" style="--tc:${t.color}">${h ? `<span class="pt">${PORTRAIT[h.id]}</span>` : ''}${t.label}${h && S.ahn && S.ahn.place[h.id] ? '<i class="sig" title="Ahnensiegel">✦</i>' : ''}${dot(isNew(t.id))}</button>`; }).join('')}</div>`;
    }
    $('.rl-tabs').innerHTML = html;
    const on = document.querySelector('.rl-sub .on'); if (on && on.offsetLeft + on.offsetWidth > on.parentNode.clientWidth) on.parentNode.scrollLeft = on.offsetLeft - 24;
  }
  function open() {
    if (UPD.pending) { active = true; updApply(true); return; }
    seasonCheck();
    active = true; bgPreload(); frStart(); gdStart(); setTimeout(() => wbFetch(true), 2500); clearInterval(WBC.timer); WBC.timer = setInterval(() => { if (active && !document.hidden) wbFetch(); }, 300000);
    $('#hub').hidden = true; $('#room').hidden = true; $('#solo').hidden = false;
    st = stats(S);
    if (!cv) {
      $('#solo').innerHTML = `
        <div class="topbar"><button class="btn ghost small" id="soloBack">‹ Spiele</button><div class="title"><b>Ritterlauf</b><small>Solo</small></div>
          <div class="rl-topr"><button class="btn ghost small rl-newsbtn" id="soloSnd" aria-label="Ton an oder aus"></button><button class="btn ghost small rl-newsbtn" id="soloFriends" aria-label="Freunde">👥<span class="dot" hidden></span></button><button class="btn ghost small rl-newsbtn" id="soloGuild" aria-label="Gilde">🛡<span class="dot" hidden></span></button><button class="btn ghost small rl-newsbtn" id="soloNews" aria-label="Neuigkeiten">📰<span class="dot" hidden></span></button><button class="btn ghost small" id="soloSpeed">Tempo ×1</button></div></div>
        <div class="rl-stage"><div id="soloCanvas" class="rl-canvas"></div></div>
        <div class="rl-heroes" id="rlHeroes"></div>
        <div class="rl-bar"><div class="rl-stat" id="rlStat"></div><div id="rlAction" class="row"></div></div>
        <div class="rl-tabs" role="tablist"></div>
        <div id="rlPanel"></div>`;
      cv = document.createElement('canvas'); $('#soloCanvas').appendChild(cv); ctx = cv.getContext('2d');
      cv.addEventListener('click', e => {
        if (cine) { if (cine.t > 0.4) cine.t = Math.max(cine.t, cine.dur - 0.25); return; }
        if (!inCamp()) return;
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
        if (x < 84 && y > GROUND - 112 && y < GROUND + 4) { showBoard(); return; }
        if (x > 90 && x < 400 && y > 80) openSquad();
      });
      window.addEventListener('resize', () => { sizeCanvas(); if (squad && !squad.el.hidden) sizeSquad(); });
      $('#soloBack').onclick = close;
      $('#soloNews').onclick = showUpdates; $('#soloFriends').onclick = showFriends; $('#soloGuild').onclick = showGuild;
      $('#soloSnd').onclick = () => soundMenu();
      $('#soloSnd').textContent = SND.isOn() ? '🔊' : '🔇';
      $('#soloSpeed').onclick = () => { if (acct && acct.tester) { testSpeed(); return; } S.speed = S.speed >= maxSpeed(S) ? 1 : S.speed < 3 ? S.speed + 1 : S.speed + 0.5; save(); hud(); };
      $('.rl-tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; confirm = ''; runeSel = null; wRes = null; fRes = null; renderTabs(); panel(); } };
      for (const id of ['#rlPanel', '#rlAction', '#rlHeroes']) $(id).addEventListener('click', onClick);
      $('#rlPanel').addEventListener('submit', onSubmit);
    }
    sizeCanvas(); refresh();
    if (S.starNews) { const n = S.starNews; delete S.starNews; save(); setTimeout(() => toast(`Sternen-Laden zurückgesetzt: ${n} Sterne zurück. Verteile sie neu!`, true), 1200); }
    if (S.startNews) { const n = S.startNews; delete S.startNews; save(); setTimeout(() => toast(`Sprungstart wurde zu Beutezug umgebaut: ${n} Sterne zurück.`, true), 600); }
    if (conflict) setTimeout(() => resolveConflict(conflict), 300); else if (acct) setTimeout(() => cloudSave(true), 800);
    showTitle();

    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  // Test-Cheat: Tester haben unendlich viele Heldensplitter, sobald die Expeditionen offen sind
  const testerSplinters = () => { if (acct && acct.tester && expOpen(S) && S.exp.spl < 1e6) S.exp.spl = 9999999; };
  function refresh() { testerSplinters(); st = run && !run.dead ? statsFor(S, run.mode) : stats(S); renderTabs(); hud(); heroes(); action(); panel(); }
  function achCheck(run, quiet) { const got = checkAch(S, run); if (got.length) { st = run && !run.dead ? statsFor(S, run.mode) : stats(S); if (!quiet) got.forEach((a, i) => setTimeout(() => toast(`Erfolg: ${a.name} (+3 % Stärke)`, true), i * 1800)); save(); } return got; }
  /* ---------- Freunde und Chat ---------- */
  // Freunde per Benutzername anfragen, sehen wer online ist, miteinander schreiben. Läuft über kurze Abfragen an den Server:
  // alle 20 s die Freundesliste (zählt zugleich als „online“), bei offenem Chat alle 3 s neue Nachrichten.
  const FR = { data: null, timer: 0, poll: 0, chat: null, last: 0, sure: false };
  const frCall = (action, extra = {}) => api(action, { name: acct.name, token: acct.token, ...extra });
  const frOpen = () => { const p = $('#picker'); return p && !p.hidden && p.querySelector('.rl-friends'); };
  const hhmm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function frDot() { const d = $('#soloFriends .dot'), D = FR.data; if (d) d.hidden = !(D && (D.inc.length || D.friends.some(f => f.unread))); }
  async function frRefresh() {
    if (!active || document.hidden || !acct || !acct.token) return;
    const r = await frCall('friends'); if (r.error) return;
    const before = FR.data; FR.data = r; frDot();
    if (before && r.inc.some(n => !before.inc.includes(n))) toast(`👥 Freundschaftsanfrage von ${r.inc.find(n => !before.inc.includes(n))}`);
    if (frOpen() && !FR.chat) frLists();
  }
  function frStart() { clearInterval(FR.timer); FR.timer = setInterval(frRefresh, 20000); setTimeout(frRefresh, 1500); }
  function frStop() { clearInterval(GD.timer); clearInterval(FR.timer); clearInterval(FR.poll); FR.chat = null; }
  function showFriends() {
    SND.play('tick');
    if (!acct || !acct.token) {
      modal(`<h2>👥 Freunde</h2><p>Für Freunde und Chat brauchst du ein Konto mit <b>Name und Passwort</b>. Dein Name ist dann dein Benutzername, unter dem dich andere finden.</p>
        <div class="row" style="justify-content:center"><button class="btn" data-m="x" id="frGoStand">Konto anlegen oder anmelden</button><button class="btn ghost" data-m="x">Später</button></div>`, 'rl-friends');
      $('#frGoStand').addEventListener('click', () => { tab = 'stand'; renderTabs(); panel(); const t = $('.rl-tabs'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      return;
    }
    FR.chat = null; clearInterval(FR.poll);
    modal(`<div id="frBody"></div>`, 'rl-friends');
    const sheet = $('#picker .rl-friends');
    sheet.addEventListener('click', frClick);
    sheet.addEventListener('keydown', e => { if (e.key !== 'Enter' || e.shiftKey) return; if (e.target.id === 'frName') { e.preventDefault(); frAct('add'); } if (e.target.id === 'frText') { e.preventDefault(); frAct('send'); } });
    frMain(); frRefresh();
  }
  function frMain() {
    const b = $('#frBody'); if (!b) return;
    b.innerHTML = `<h2>👥 Freunde</h2><p class="note">Dein Benutzername: <b>${esc(acct.name)}</b>. Unter diesem Namen können dich Freunde anfragen.</p>
      <div class="rl-fradd"><input id="frName" maxlength="20" placeholder="Benutzername eingeben" autocomplete="off" spellcheck="false"><button class="btn small" data-fr="add">Anfragen</button></div>
      <p class="note rl-frmsg" id="frMsg"></p><div id="frLists"><p class="note">Lädt …</p></div>
      <div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost" data-m="x">Schließen</button></div>`;
    frLists();
  }
  function frLists() {
    const el = $('#frLists'), D = FR.data; if (!el || !D) return;
    const inc = D.inc.map(n => `<div class="rl-frrow"><b>${esc(n)}</b><span class="sp"></span><button class="btn small" data-fr="yes" data-who="${esc(n)}">Annehmen</button><button class="btn ghost small" data-fr="no" data-who="${esc(n)}">Ablehnen</button></div>`).join('');
    const fr = D.friends.map(f => `<div class="rl-frrow"><button class="rl-frname" data-fr="prof" data-who="${esc(f.name)}"><span class="rl-on ${f.online ? 'on' : ''}"></span><b>${esc(f.name)}</b><small>${f.online ? 'online' : 'offline'}</small></button><span class="sp"></span>${f.unread ? `<span class="rl-badge">${f.unread}</span>` : ''}<button class="btn ghost small" data-fr="prof" data-who="${esc(f.name)}" aria-label="Profil">👤</button><button class="btn small" data-fr="open" data-who="${esc(f.name)}" aria-label="Chat">💬</button></div>`).join('');
    const out = D.out.map(n => `<div class="rl-frrow"><b>${esc(n)}</b><small>wartet auf Antwort</small><span class="sp"></span><button class="btn ghost small" data-fr="cancel" data-who="${esc(n)}">Zurückziehen</button></div>`).join('');
    el.innerHTML = (inc ? `<h3 class="rl-h3">Anfragen an dich</h3>${inc}` : '')
      + `<h3 class="rl-h3">Freunde (${D.friends.length}) · ${D.friends.filter(f => f.online).length} online</h3>${fr || '<p class="note">Noch keine Freunde. Frag jemanden mit seinem Benutzernamen an.</p>'}`
      + (out ? `<h3 class="rl-h3">Gesendete Anfragen</h3>${out}` : '');
  }
  function frChat(who) {
    const b = $('#frBody'); if (!b) return;
    FR.chat = who; FR.last = 0; FR.sure = false;
    b.innerHTML = `<div class="rl-chathead"><button class="btn ghost small" data-fr="back">‹ Zurück</button><span class="rl-on" id="frOn"></span><b>${esc(who)}</b><small id="frOnT"></small><span class="sp"></span><button class="btn ghost small" data-fr="prof" data-who="${esc(who)}">👤 Profil</button></div>
      <div class="rl-chat" id="frLog"><p class="note">Lädt …</p></div>
      <div class="rl-fradd"><input id="frText" maxlength="300" placeholder="Nachricht schreiben …" autocomplete="off"><button class="btn small" data-fr="send">Senden</button></div>
      <p class="note rl-frmsg" id="frMsg"></p>
      <div class="row" style="justify-content:space-between;margin-top:6px"><button class="btn ghost small" data-fr="remove">Freund entfernen</button><button class="btn ghost small" data-m="x">Schließen</button></div>`;
    clearInterval(FR.poll); frPull(true); FR.poll = setInterval(() => { if (!frOpen() || !FR.chat) { clearInterval(FR.poll); FR.chat = null; return; } frPull(); }, 3000);
    setTimeout(() => { const i = $('#frText'); if (i && matchMedia('(pointer:fine)').matches) i.focus(); }, 50);
  }
  function frShow(r, first) {
    const log = $('#frLog'); if (!log || r.name.toLowerCase() !== String(FR.chat).toLowerCase()) return;
    const on = $('#frOn'), ot = $('#frOnT'); if (on) on.classList.toggle('on', !!r.online); if (ot) ot.textContent = r.online ? 'online' : 'offline';
    if (first) log.innerHTML = r.msgs.length ? '' : '<p class="note" id="frEmpty">Noch keine Nachrichten. Sag Hallo! 👋</p>';
    const fresh = r.msgs.filter(m => m.t > FR.last); if (!fresh.length) return;
    const e = $('#frEmpty'); if (e) e.remove();
    const nearEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    for (const m of fresh) { const d = document.createElement('div'); d.className = 'rl-msg' + (m.me ? ' me' : ''); d.innerHTML = `<span>${esc(m.x).replace(/\n/g, '<br>')}</span><small>${hhmm(m.t)}</small>`; log.appendChild(d); FR.last = Math.max(FR.last, m.t); }
    if (first || nearEnd || fresh.some(m => m.me)) log.scrollTop = log.scrollHeight;
    if (!first && fresh.some(m => !m.me)) SND.play('tick');
  }
  async function frPull(first) {
    const who = FR.chat; const r = await frCall('chat', { who, since: first ? 0 : FR.last });
    if (FR.chat !== who) return;
    if (r.error) { const m = $('#frMsg'); if (m) m.textContent = r.error; return; }
    frShow(r, first);
    if (FR.data) { const f = FR.data.friends.find(x => x.name === r.name); if (f && f.unread) { f.unread = 0; frDot(); } }
  }
  // Profil eines Freundes: Rang, Rekorde, Aufstellung mit Runen, Begleiter, Erfolge
  async function frProfile(who, host = '#frBody') {
    const b = $(host); if (!b) return;
    FR.chat = null; clearInterval(FR.poll);
    b.innerHTML = `<div class="rl-chathead"><button class="btn ghost small" data-fr="back">‹ Zurück</button><b>${esc(who)}</b></div><p class="note">Lädt …</p>`;
    const r = await frCall('profile', { who });
    if (!$(host) || FR.chat) return;
    if (r.error) { b.innerHTML = `<div class="rl-chathead"><button class="btn ghost small" data-fr="back">‹ Zurück</button><b>${esc(who)}</b></div><p class="warn">${esc(r.error)}</p>`; return; }
    let P; try { P = migrate(JSON.parse(JSON.stringify(r.data || {}))); } catch { P = fresh(); }
    const rk = rankOf(P.asc), field = fieldOf(P), num = n => fmt(Math.floor(Number(n) || 0));
    const ago = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'gerade eben' : m < 60 ? `vor ${m} min` : m < 1440 ? `vor ${Math.round(m / 60)} h` : `vor ${Math.round(m / 1440)} Tagen`; };
    const stat = (ic, label, val) => `<div class="rl-pstat"><span>${ic}</span><b>${val}</b><small>${label}</small></div>`;
    const heroCard = k => {
      const h = HERO_BY_ID[k]; if (!h) return '';
      const rs = (P.sockets[k] || []).map(id => id && P.runes.find(x => x.id === id)).filter(Boolean);
      const L = mastLevel(P, k);
      return `<div class="rl-phero" style="--hc:${h.color}"><img src="${portraitURL(k)}" alt=""><b>${esc(h.name)}</b>${L ? `<small>Meisterschaft ${L}</small>` : ''}${P.ahn && P.ahn.place && P.ahn.place[k] ? '<small class="sig">✦ Ahnensiegel</small>' : ''}
        <div class="rl-prunes">${rs.map(x => `<span class="rl-rune mini" style="--rc:${RUNE[x.t].color}" title="${esc(RUNE[x.t].name)} ${ROMAN[x.tier]}"><b>${ROMAN[x.tier]}</b></span>`).join('') || '<small>keine Runen</small>'}</div></div>`;
    };
    const comps = (P.compActive || []).filter(id => P.comps && P.comps[id] && COMP[id]);
    b.innerHTML = `<div class="rl-chathead"><button class="btn ghost small" data-fr="back">‹ Zurück</button><span class="rl-on ${r.online ? 'on' : ''}"></span><b>${esc(r.name)}</b><small>${r.online ? 'online' : `offline${r.updated ? ' · zuletzt ' + ago(r.updated) : ''}`}</small><span class="sp"></span>${host === '#frBody' ? `<button class="btn small" data-fr="open" data-who="${esc(r.name)}">💬 Chat</button>` : ''}</div>
      <div class="rl-prank" style="--rc:${rk.col}">${P.asc ? `👑 ${esc(rk.name)}` : 'Abenteurer'}</div>${r.guild ? `<p class="note rl-pguild">🛡 Gilde: <b>${esc(r.guild)}</b></p>` : ''}
      <div class="rl-pstats">${stat('🏁', 'Rekord', num(Math.max(P.bestEver || 0, P.best || 0, P.ascBest || 0)))}${stat('🔄', 'Wiedergeburten', num(P.rebirths))}${stat('👑', 'Aufstiege', num(P.asc))}${stat('🗼', 'Turm-Rekord', num(P.towerBest))}${stat('✦', 'Ahnensiegel', num(P.ahn && P.ahn.got))}${stat('🐉', 'Weltenfresser', num(P.wf))}${stat('⚔️', 'Gegner besiegt', num(P.tot && P.tot.kills))}${stat('🏆', 'Erfolge', `${Object.keys(P.ach || {}).length}/${ACH.length}`)}</div>
      <h3 class="rl-h3">Aufstellung</h3><div class="rl-pteam">${field.map(heroCard).join('')}</div>
      ${comps.length ? `<h3 class="rl-h3">Begleiter</h3><div class="rl-pcomps">${comps.map(id => `<div class="rl-pcomp"><img src="${compPic(id)}" alt=""><b>${esc(COMP[id].name)}</b><small>Stufe ${P.comps[id]}</small></div>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost" data-m="x">Schließen</button></div>`;
  }
  function frClick(e) { const b = e.target.closest('[data-fr]'); if (!b) return; frAct(b.dataset.fr, b.dataset.who); }
  async function frAct(a, who) {
    const msg = t => { const m = $('#frMsg'); if (m) { m.textContent = t || ''; m.classList.remove('bad'); } }, bad = t => { const m = $('#frMsg'); if (m) { m.textContent = t; m.classList.add('bad'); } };
    if (a === 'open') { SND.play('tick'); frChat(who); return; }
    if (a === 'prof') { SND.play('tick'); frProfile(who); return; }
    if (a === 'back') { SND.play('tick'); FR.chat = null; clearInterval(FR.poll); frMain(); frRefresh(); return; }
    if (a === 'send') {
      const i = $('#frText'), text = i ? i.value.trim() : ''; if (!text || FR.busy) return;
      FR.busy = true; const r = await frCall('chat_send', { who: FR.chat, text, since: FR.last }); FR.busy = false;
      if (r.error) { bad(r.error); return; } msg(''); if (i) i.value = ''; frShow(r, false); SND.play('tick'); return;
    }
    if (a === 'remove') {
      if (!FR.sure) { FR.sure = true; bad(`Wirklich ${FR.chat} als Freund entfernen? Der Chat wird dabei gelöscht. Tippe noch einmal.`); return; }
      const r = await frCall('friend_remove', { who: FR.chat }); if (r.error) { bad(r.error); return; }
      FR.data = r; FR.chat = null; clearInterval(FR.poll); frMain(); frDot(); return;
    }
    let action = null, extra = {};
    if (a === 'add') { const i = $('#frName'); who = i ? i.value.trim() : ''; if (!who) { bad('Gib einen Benutzernamen ein.'); return; } action = 'friend_add'; }
    if (a === 'yes' || a === 'no') { action = 'friend_answer'; extra.ok = a === 'yes'; }
    if (a === 'cancel') action = 'friend_remove';
    if (!action) return;
    const r = await frCall(action, { who, ...extra });
    if (r.error) { bad(r.error); return; }
    FR.data = r; frDot(); frLists(); msg(r.msg || ''); SND.play('buy');
    if (a === 'add') { const i = $('#frName'); if (i) i.value = ''; }
  }
  function close() { frStop(); MUS.set(null); SND.ambient(false); closeSquad(); intro = null; const tov = document.querySelector('.rl-title'); if (tov) tov.remove(); active = false; cancelAnimationFrame(raf); save(); cloudSave(true); $('#solo').hidden = true; $('#hub').hidden = false; }
  function sizeCanvas() {
    const host = $('#soloCanvas'); const w = Math.min(host.clientWidth || 360, 960);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = w + 'px'; cv.style.height = (w * H / W) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * H / W * dpr); scale = cv.width / W;
  }
  /* ---------- Gilden ---------- */
  // Bis zu 5 Spieler. Beitreten per Einladung des Gründers oder per Anfrage, die der Gründer bestätigt.
  // Beim Wochenboss zählen die Gruppenziele nur für die eigene Gilde (ohne Gilde: Zufallsgruppe).
  const GD = { data: null, timer: 0, busy: false, view: 'main', list: null };
  const gdOpen = () => { const p = $('#picker'); return p && !p.hidden && p.querySelector('.rl-guild'); };
  function gdDot() { const d = $('#soloGuild .dot'), D = GD.data; if (d) d.hidden = !(D && (D.guild ? D.guild.me && D.guild.req.length : D.invites.length)); }
  async function gdRefresh() {
    if (!active || document.hidden || !acct || !acct.token) return;
    const r = await frCall('guild'); if (r.error) return;
    const before = GD.data; GD.data = r; gdDot();
    if (before && before.guild && r.guild && r.guild.me && r.guild.req.some(n => !before.guild.req.includes(n))) toast(`🛡 ${r.guild.req.find(n => !before.guild.req.includes(n))} möchte in deine Gilde.`);
    if (before && r.invites.some(i => !before.invites.some(x => x.id === i.id))) toast(`🛡 Einladung in die Gilde „${r.invites[r.invites.length - 1].name}“`);
    if (gdOpen() && GD.view === 'main') gdRender();
  }
  function gdStart() { clearInterval(GD.timer); GD.timer = setInterval(gdRefresh, 45000); setTimeout(gdRefresh, 2000); }
  function showGuild() {
    SND.play('tick');
    if (!acct || !acct.token) {
      modal(`<h2>🛡 Gilde</h2><p>Für Gilden brauchst du ein Konto mit <b>Name und Passwort</b>.</p>
        <div class="row" style="justify-content:center"><button class="btn" data-m="save">Konto anlegen oder anmelden</button><button class="btn ghost" data-m="x">Später</button></div>`, 'rl-guild');
      return;
    }
    GD.view = 'main'; GD.list = null;
    modal('<div id="gdBody"><p class="note">Lädt …</p></div>', 'rl-guild');
    const sheet = $('#picker .rl-guild');
    sheet.addEventListener('click', gdClick);
    sheet.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const id = e.target.id; if (id === 'gdNew') { e.preventDefault(); gdAct('create'); } if (id === 'gdQ') { e.preventDefault(); gdAct('search'); } if (id === 'gdWho') { e.preventDefault(); gdAct('invite'); } if (id === 'gdRen') { e.preventDefault(); gdAct('rename'); } });
    gdRender(); gdRefresh().then(() => { if (gdOpen() && GD.data && !GD.data.guild && !GD.list) gdAct('search'); });
  }
  function gdRender() {
    const b = $('#gdBody'), D = GD.data; if (!b) return;
    GD.view = 'main';
    if (!D) { b.innerHTML = '<h2>🛡 Gilde</h2><p class="note">Lädt …</p>'; return; }
    const close = '<div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost" data-m="x">Schließen</button></div>';
    const msg = '<p class="note rl-frmsg" id="gdMsg"></p>';
    if (!D.guild) {
      const inv = D.invites.map(g => `<div class="rl-frrow"><b>${esc(g.name)}</b><small>${g.n} / ${D.max}</small><span class="sp"></span><button class="btn small" data-gd="accept" data-id="${g.id}">Beitreten</button><button class="btn ghost small" data-gd="decline" data-id="${g.id}">Ablehnen</button></div>`).join('');
      const asked = D.asked.map(g => `<div class="rl-frrow"><b>${esc(g.name)}</b><small>wartet auf den Gründer</small><span class="sp"></span><button class="btn ghost small" data-gd="cancel" data-id="${g.id}">Zurückziehen</button></div>`).join('');
      const list = GD.list ? (GD.list.length ? GD.list.map(g => `<div class="rl-frrow"><b>${esc(g.name)}</b><small>${g.n} / ${D.max} · Gründer: ${esc(g.owner)}</small><span class="sp"></span>${g.n >= D.max ? '<small>voll</small>' : g.asked ? '<small>angefragt</small>' : `<button class="btn small" data-gd="ask" data-id="${g.id}">Anfragen</button>`}</div>`).join('') : '<p class="note">Keine Gilde gefunden.</p>') : '';
      b.innerHTML = `<h2>🛡 Gilde</h2><p class="note">In einer Gilde sind bis zu <b>${D.max} Spieler</b>. Beim Wochenboss kämpft ihr zusammen für eure Gruppenziele. Ohne Gilde kommst du dort in eine Zufallsgruppe mit anderen Spielern ohne Gilde.</p>
        ${inv ? `<h3 class="rl-h3">Einladungen an dich</h3>${inv}` : ''}
        <h3 class="rl-h3">Eigene Gilde gründen</h3><div class="rl-fradd"><input id="gdNew" maxlength="24" placeholder="Name der Gilde" autocomplete="off" spellcheck="false"><button class="btn small" data-gd="create">Gründen</button></div>
        <h3 class="rl-h3">Gilde suchen</h3><div class="rl-fradd"><input id="gdQ" maxlength="24" placeholder="Name oder leer für alle" autocomplete="off" spellcheck="false"><button class="btn small" data-gd="search">Suchen</button></div>
        ${msg}${asked ? `<h3 class="rl-h3">Deine Anfragen</h3>${asked}` : ''}<div id="gdList">${list}</div>${close}`;
      return;
    }
    const G = D.guild, free = D.max - G.members.length;
    const mem = G.members.map(m => `<div class="rl-frrow"><button class="rl-frname" data-gd="prof" data-who="${esc(m.name)}"><span class="rl-on ${m.online ? 'on' : ''}"></span><b>${esc(m.name)}</b>${m.owner ? '<em class="rl-gdown">Gründer</em>' : ''}${m.me ? '<small>du</small>' : ''}</button><span class="sp"></span><small title="Beste Leisten beim Wochenboss diese Woche">👹 ${m.best}</small>${G.me && !m.me ? `<button class="btn ghost small" data-gd="kick" data-who="${esc(m.name)}" aria-label="Entfernen">✕</button>` : ''}</div>`).join('')
      + Array.from({ length: free }, () => '<div class="rl-frrow rl-gdfree"><small>freier Platz</small></div>').join('');
    const req = G.me && G.req.length ? `<h3 class="rl-h3">Anfragen</h3>${G.req.map(n => `<div class="rl-frrow"><b>${esc(n)}</b><span class="sp"></span><button class="btn small" data-gd="yes" data-who="${esc(n)}" ${free ? '' : 'disabled'}>Aufnehmen</button><button class="btn ghost small" data-gd="no" data-who="${esc(n)}">Ablehnen</button></div>`).join('')}` : '';
    const inv = G.me && G.inv.length ? `<h3 class="rl-h3">Eingeladen</h3>${G.inv.map(n => `<div class="rl-frrow"><b>${esc(n)}</b><small>wartet auf Antwort</small><span class="sp"></span><button class="btn ghost small" data-gd="uninv" data-who="${esc(n)}">Zurückziehen</button></div>`).join('')}` : '';
    const goals = WBC.info && WBC.info.group && WBC.info.group.kind === 'guild' ? WBC.info : null;
    const friends = FR.data ? FR.data.friends.filter(f => !G.members.some(m => m.name === f.name) && !G.inv.includes(f.name)) : [];
    b.innerHTML = `<h2>🛡 ${esc(G.name)}</h2><p class="note">${G.members.length} / ${D.max} Mitglieder · Gründer: <b>${esc(G.owner)}</b>${goals ? ` · Wochenboss: <b>${goals.group.total}</b> Leisten, ${goals.reached} / ${goals.goals.length} Ziele` : ''}</p>
      <h3 class="rl-h3">Mitglieder</h3>${mem}
      ${req}
      ${G.me ? `<h3 class="rl-h3">Spieler einladen</h3><div class="rl-fradd"><input id="gdWho" maxlength="20" placeholder="Benutzername" autocomplete="off" spellcheck="false" list="gdFr"><button class="btn small" data-gd="invite" ${free ? '' : 'disabled'}>Einladen</button></div><datalist id="gdFr">${friends.map(f => `<option value="${esc(f.name)}">`).join('')}</datalist>
        ${inv}<h3 class="rl-h3">Name ändern</h3><div class="rl-fradd"><input id="gdRen" maxlength="24" value="${esc(G.name)}" autocomplete="off" spellcheck="false"><button class="btn ghost small" data-gd="rename">Ändern</button></div>` : '<p class="note">Nur der Gründer kann einladen, Anfragen annehmen und den Namen ändern.</p>'}
      ${msg}
      <div class="row" style="justify-content:space-between;margin-top:10px"><button class="btn ghost small" data-gd="leave">${GD.sure ? 'Wirklich verlassen?' : 'Gilde verlassen'}</button><button class="btn ghost" data-m="x">Schließen</button></div>`;
  }
  function gdClick(e) {
    if (e.target.closest('[data-fr="back"]')) { gdRender(); return; }
    const b = e.target.closest('[data-gd]'); if (!b || b.disabled) return;
    gdAct(b.dataset.gd, b.dataset.who, b.dataset.id);
  }
  async function gdAct(a, who, id) {
    if (GD.busy) return;
    const say = (t, bad) => { const m = $('#gdMsg'); if (m) { m.textContent = t || ''; m.classList.toggle('bad', !!bad); } };
    const val = sel => { const i = $(sel); return i ? i.value.trim() : ''; };
    if (a === 'prof') { GD.view = 'prof'; frProfile(who, '#gdBody'); return; }
    if (a === 'leave' && !GD.sure) { GD.sure = true; gdRender(); setTimeout(() => { GD.sure = false; if (gdOpen() && GD.view === 'main') gdRender(); }, 4000); return; }
    const map = { create: ['guild_create', { gname: val('#gdNew') }], search: ['guild_search', { q: val('#gdQ') }], ask: ['guild_request', { gid: id }], cancel: ['guild_cancel', { gid: id }],
      accept: ['guild_answer', { gid: id, yes: true }], decline: ['guild_answer', { gid: id, yes: false }], leave: ['guild_leave', {}], rename: ['guild_rename', { gname: val('#gdRen') }],
      invite: ['guild_invite', { who: val('#gdWho') }], uninv: ['guild_uninvite', { who }], yes: ['guild_decide', { who, yes: true }], no: ['guild_decide', { who, yes: false }], kick: ['guild_kick', { who }] };
    const m = map[a]; if (!m) return;
    if ((a === 'create' || a === 'rename') && !m[1].gname) { say('Gib einen Namen ein.', true); return; }
    if (a === 'invite' && !m[1].who) { say('Gib einen Benutzernamen ein.', true); return; }
    GD.busy = true; const r = await frCall(m[0], m[1]); GD.busy = false; GD.sure = false;
    if (r.error) { say(r.error, true); SND.play('tick'); return; }
    if (a === 'search') { GD.list = r.list; gdRender(); return; }
    GD.data = r; gdDot(); gdRender(); if (r.msg) say(r.msg);
    if (['create', 'accept', 'yes', 'leave', 'kick'].includes(a)) { SND.play('buy'); wbFetch(true); }
    if (a === 'ask') { GD.list = null; gdAct('search'); }
  }
  /* ---------- Heldenreisen ---------- */
  // Ein Held zieht 1, 3 oder 9 Stunden allein los und bringt danach Gold, Seelen, Runensplitter und Heldensplitter mit.
  // In der Zeit fehlt er in der Truppe. Die Uhr läuft auch, wenn das Spiel zu ist.
  const tripsReady = (now = Date.now()) => HEROES.filter(h => onTrip(S, h.id) && tripLeft(S, h.id, now) <= 0);
  const durStr = ms => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${Math.max(1, m)} min`; };
  const rewHTML = r => [r.gold ? `<span class="rl-cur gold">${coin}${fmt(r.gold)}</span>` : '', r.souls ? `<span class="rl-cur soul">${soul}${r.souls}</span>` : '', r.dust ? `<span class="rl-cur dust">${dust}${r.dust}</span>` : '', r.spl ? `<span class="rl-cur spl">◈ ${r.spl}</span>` : ''].filter(Boolean).join(' ') || '<span class="note">kaum etwas</span>';
  let trTimer = 0, trReadyN = -1;
  function showTrips() {
    SND.play('tick');
    modal('<div id="trBody"></div>', 'rl-trips');
    $('#picker .rl-trips').addEventListener('click', trClick);
    trRender();
    clearInterval(trTimer);
    trTimer = setInterval(() => { if ($('#picker').hidden || !$('#picker .rl-trips')) { clearInterval(trTimer); return; } trRender(); }, 1000);
  }
  function trRender() {
    const b = $('#trBody'); if (!b) return;
    const now = Date.now(), own = HEROES.filter(h => hired(S, h.tree)), free = own.filter(h => !onTrip(S, h.id));
    const rows = own.map(h => {
      const T = S.trips && S.trips[h.id], left = T ? tripLeft(S, h.id, now) : 0;
      const pic = `<span class="rl-trpic" style="--hc:${h.color}"><img src="${portraitURL(h.id)}" alt=""></span>`;
      if (T && left <= 0) return `<div class="rl-trrow done">${pic}<div class="rl-trmid"><b>${h.name} ist zurück!</b><small>${(TRIPS.find(o => o.h === T.h) || TRIPS[0]).name} · Mitgebracht: ${rewHTML(tripReward(S, T))}</small></div><button class="btn gold small" data-tr="claim" data-id="${h.id}">Abholen</button></div>`;
      if (T) { const pc = 100 - left / (T.h * 3600000) * 100;
        return `<div class="rl-trrow away">${pic}<div class="rl-trmid"><b>${h.name} <em class="rl-trtag">unterwegs</em></b><span class="rl-trbar"><i style="width:${pc.toFixed(1)}%"></i></span><small>Zurück in <b>${durStr(left)}</b> · bringt ${rewHTML(tripReward(S, T))}</small></div></div>`; }
      const last = free.length <= 1, camp = inCamp();
      const btns = TRIPS.map(o => `<button class="btn ghost small rl-trgo" data-tr="go" data-id="${h.id}" data-h="${o.h}" ${last || !camp ? 'disabled' : ''}><b>${o.h} h</b><small>${rewHTML(tripReward(S, { h: o.h }))}</small></button>`).join('');
      return `<div class="rl-trrow">${pic}<div class="rl-trmid"><b>${h.name}</b><small>${last ? 'Bleibt im Lager: Ein Held muss immer da sein.' : !camp ? 'Losschicken geht nur im Lager.' : `${fieldOf(S).includes(h.id) ? 'Kämpft gerade mit. ' : ''}Wohin soll die Reise gehen?`}</small><div class="rl-trbtns">${btns}</div></div></div>`;
    }).join('');
    const ready = tripsReady(now).length;
    b.innerHTML = `<h2>🧭 Heldenreisen</h2><p class="note">Schick Helden für 1, 3 oder 9 Stunden auf Reisen. Solange sie weg sind, fehlen sie in der Truppe. Die Zeit läuft auch weiter, wenn das Spiel zu ist. Kurze Reisen bringen pro Stunde etwas mehr, lange sind bequemer.</p>
      ${ready > 1 ? `<div class="row" style="justify-content:center"><button class="btn gold" data-tr="all">Alle ${ready} abholen</button></div>` : ''}
      <div class="rl-trlist">${rows}</div>
      <p class="note" style="margin-top:8px">Bisher heimgekehrt: <b>${S.tripsDone || 0}</b> Reisen</p>
      <div class="row" style="justify-content:center;margin-top:6px"><button class="btn ghost" data-m="x">Schließen</button></div>`;
  }
  function trClaim(id) {
    const r = claimTrip(S, id); if (!r) return null;
    noteTripAch(); return r;
  }
  const noteTripAch = () => {};
  function trClick(e) {
    const b = e.target.closest('[data-tr]'); if (!b || b.disabled) return;
    const k = b.dataset.tr, id = b.dataset.id;
    if (k === 'go') {
      if (!inCamp()) { toast('Losschicken geht nur im Lager.'); return; }
      const h = Number(b.dataset.h);
      if (!startTrip(S, id, h)) { toast('Mindestens ein Held muss im Lager bleiben.'); return; }
      SND.play('buy'); toast(`${HERO_BY_ID[id].name} bricht für ${h} Stunde${h > 1 ? 'n' : ''} auf.`);
    } else if (k === 'claim' || k === 'all') {
      const ids = k === 'all' ? tripsReady().map(h => h.id) : [id], sum = { gold: 0, souls: 0, dust: 0, spl: 0 };
      for (const x of ids) { const r = trClaim(x); if (r) for (const q in sum) sum[q] += r[q] || 0; }
      SND.play('gold'); toast(`Reisebeute: ${[sum.gold ? fmt(sum.gold) + ' Gold' : '', sum.souls ? sum.souls + ' Seelen' : '', sum.dust ? sum.dust + ' Runensplitter' : '', sum.spl ? sum.spl + ' Heldensplitter' : ''].filter(Boolean).join(', ') || 'nichts'}`, true);
    }
    trReadyN = tripsReady().length;
    afterChange(); trRender();
  }
  // Wird regelmäßig aufgerufen: meldet Heimkehrer
  function trWatch() {
    const n = tripsReady().length;
    if (n !== trReadyN) {
      if (trReadyN >= 0 && n > trReadyN) { const h = tripsReady().pop(); toast(`🧭 ${h ? h.name : 'Ein Held'} ist von der Reise zurück! Abholen am Anschlagbrett.`); SND.play('tick'); }
      trReadyN = n; if (inCamp()) action();
    }
  }

  /* ---------- Wochenboss ---------- */
  // Alle Spieler kämpfen eine Woche lang gegen denselben Boss. Der Server zählt Versuche (3 pro Tag) und Punkte.
  // Die beste Leistenzahl pro Spieler zählt für die Gruppenziele seiner Gilde (ohne Gilde: Zufallsgruppe). Belohnung am Wochenende pro erreichtem Ziel.
  const WBC = { info: null, at: 0, busy: false, tryId: null, timer: 0 };
  const wbCall = (action, extra = {}) => api(action, { name: acct.name, token: acct.token, ...extra });
  const wbOpen = () => { const p = $('#picker'); return p && !p.hidden && p.querySelector('.rl-wboss'); };
  async function wbFetch(force) {
    if (!acct || !acct.token || WBC.busy || (!force && Date.now() - WBC.at < 60000)) return WBC.info;
    WBC.busy = true; const r = await wbCall('wb_info'); WBC.busy = false;
    if (!r.error) { const had = WBC.info && WBC.info.last; WBC.info = r; WBC.at = Date.now(); if (r.last && !had && inCamp()) action(); if (wbOpen()) wbRender(); }
    return r;
  }
  const wbClaimable = () => !!(acct && acct.token && WBC.info && WBC.info.last);
  const wbBossName = bk => WB_BOSS[(bk || 0) % WB_BOSS.length].name;
  function wbInfoLines() {
    if (!acct || !acct.token) return ['Alle gegen einen Boss mit unendlich vielen Leisten. Jede Leiste bringt Beute.'];
    const I = WBC.info; if (!I) { wbFetch(); return ['Lädt …']; }
    wbFetch();
    return [`Diese Woche: <b>${esc(wbBossName(I.bk))}</b>`,
      `${wbGroupLabel(I)}: <b>${fmt(I.group ? I.group.total : 0)}</b> Leisten · Ziel ${I.reached} / ${I.goals.length}`,
      `Dein Rekord: <b>${I.me.best}</b> Leisten · Versuche heute: ${I.me.triesMax - I.me.tries} / ${I.me.triesMax}`]
      .concat(I.last ? ['<b style="color:#ffd23f">Belohnung der Vorwoche wartet!</b>'] : []);
  }
  const wbGroupLabel = I => !I.group || I.group.kind === 'none' ? 'Deine Gruppe' : I.group.kind === 'guild' ? `Gilde ${esc(I.group.name)}` : 'Zufallsgruppe';
  function showWboss() {
    SND.play('tick');
    if (!acct || !acct.token) {
      modal(`<h2>👹 Wochenboss</h2><p>Beim Wochenboss kämpfen alle Spieler zusammen gegen denselben Gegner. Dafür brauchst du ein Konto mit <b>Name und Passwort</b>, damit deine Leisten gezählt werden.</p>
        <div class="row" style="justify-content:center"><button class="btn" data-m="save">Konto anlegen oder anmelden</button><button class="btn ghost" data-m="x">Später</button></div>`, 'rl-wboss');
      return;
    }
    modal('<div id="wbBody"><p class="note">Lädt …</p></div>', 'rl-wboss');
    $('#picker .rl-wboss').addEventListener('click', wbClick);
    wbRender(); wbFetch(true);
  }
  function wbRender(msg) {
    const b = $('#wbBody'), I = WBC.info; if (!b || !I) return;
    const left = Math.max(0, I.endsAt - Date.now()), d = Math.floor(left / 86400000), hh = Math.floor(left % 86400000 / 3600000);
    const triesLeft = I.me.triesMax - I.me.tries, top = I.goals[I.goals.length - 1], GR = I.group || { kind: 'none', total: 0, members: [] }, gt = GR.total;
    // Zielleiste mit Markierungen für jedes Ziel
    const marks = I.goals.map((g, i) => `<span class="rl-wbmark ${gt >= g ? 'ok' : ''}" style="left:${(g / top * 100).toFixed(1)}%"><i></i><b>${i + 1}</b><small>${fmt(g)}</small></span>`).join('');
    const goals = I.goals.map((g, i) => `<div class="rl-wbgrow ${gt >= g ? 'ok' : ''}"><span class="n">${gt >= g ? '✓' : i + 1}</span><span>Ziel ${i + 1}: <b>${fmt(g)}</b> Leisten</span><span class="sp"></span>${rewHTML(hoursReward(S, i + 1, 0.5))}</div>`).join('');
    const list = I.top.length ? I.top.map(p => `<div class="rl-wbrow ${p.me ? 'me' : ''}"><span class="rk">${p.rank}.</span><b>${esc(p.name)}</b><span class="sp"></span><span>${p.best} Leisten</span></div>`).join('') : '<p class="note">Noch hat niemand gekämpft. Sei die oder der Erste!</p>';
    const mates = GR.kind === 'none' ? '<p class="note">Du hast keine Gilde. Beim ersten Kampf dieser Woche kommst du in eine Zufallsgruppe mit bis zu 4 anderen Spielern ohne Gilde. <button class="btn ghost small" data-wb="guild">🛡 Gilde suchen</button></p>'
      : GR.members.map(p => `<div class="rl-wbrow ${p.me ? 'me' : ''}"><span class="rl-on ${p.online ? 'on' : ''}"></span><b>${esc(p.name)}</b><span class="sp"></span><span>${p.best ? `${p.best} Leisten` : '<small>noch nicht gekämpft</small>'}</span></div>`).join('')
        + (GR.kind === 'pool' ? '<p class="note">Ihr seid eine Zufallsgruppe, weil ihr alle keine Gilde habt. <button class="btn ghost small" data-wb="guild">🛡 Gilde suchen</button></p>' : '');
    let claim = '';
    if (I.last) claim = `<div class="rl-wbclaim" style="--tc:#ffd23f"><h3>Belohnung der letzten Woche</h3><p>Dein Rekord: <b>${I.last.best}</b> Leisten · ${I.last.group && I.last.group !== 'Zufallsgruppe' ? `Gilde ${esc(I.last.group)}` : 'Deine Gruppe'}: <b>${I.last.total}</b> Leisten, <b>${I.last.goals} von ${I.goals.length}</b> Zielen erreicht</p>${I.last.goals ? `<p>${rewHTML(hoursReward(S, wbGoalHours(I.last.goals), 0.5))}</p>` : '<p class="note">Kein Ziel geschafft, diesmal gibt es nichts.</p>'}<button class="btn gold" data-wb="claim">${I.last.goals ? 'Abholen' : 'Schade, weiter'}</button></div>`;
    const ex = [10, 30, 60].map(n => `<span><b>${n} Leisten</b>${rewHTML(wbBarPreview(n))}</span>`).join('');
    b.innerHTML = `<h2>👹 Wochenboss: ${esc(wbBossName(I.bk))}</h2>
      <p class="note">Alle kämpfen diese Woche gegen denselben Boss mit unendlich vielen Lebensleisten. Mit jeder Leiste werden seine Leben und sein Schaden um ${Math.round((WB.grow - 1) * 100)} % stärker. <b>Jede Leiste bringt sofort Beute.</b> Du hast <b>${I.me.triesMax} Versuche pro Tag</b>. Dein bester Versuch zählt für die Ziele deiner Gilde. Noch <b>${d} Tage ${hh} Std.</b></p>
      ${claim}
      <div class="rl-wbgoal"><div class="lb"><span>${wbGroupLabel(I)}: <b>${fmt(gt)}</b> Leisten</span><b>${I.reached} / ${I.goals.length} Ziele</b></div><div class="rl-wbtrack"><span class="rl-trbar big"><i style="width:${Math.min(100, gt / top * 100).toFixed(1)}%"></i></span>${marks}</div><small>Summe der besten Versuche deiner Gruppe (bis zu 5 Spieler). Jedes erreichte Ziel gibt am Wochenende allen aus der Gruppe, die mitgekämpft haben, eine Belohnung.</small></div>
      <h3 class="rl-h3">${wbGroupLabel(I)}</h3><div class="rl-wblist">${mates}</div>
      <div class="rl-wbme"><span><b>${I.me.best}</b>dein Rekord</span><span><b>${I.me.rank || '–'}</b>dein Platz</span><span><b>${triesLeft}</b>Versuche heute</span><span><b>${S.wbBest || 0}</b>Allzeit-Rekord</span></div>
      <h3 class="rl-h3">Beute pro Versuch</h3><div class="rl-wbex">${ex}</div>
      <h3 class="rl-h3">Gruppenziele</h3><div class="rl-wbgoals">${goals}</div>
      <h3 class="rl-h3">Bestenliste (alle ${I.players} Spieler)</h3><div class="rl-wblist">${list}</div>
      <p class="note rl-frmsg" id="wbMsg">${msg ? esc(msg) : ''}</p>
      <div class="row" style="justify-content:center;margin-top:8px"><button class="btn ${triesLeft > 0 && inCamp() ? '' : 'ghost'}" data-wb="start" ${triesLeft > 0 && inCamp() ? '' : 'disabled'}>${triesLeft > 0 ? (inCamp() ? 'Kämpfen' : 'Erst den Feldzug beenden') : 'Morgen wieder'}</button><button class="btn ghost" data-m="x">Schließen</button></div>`;
  }
  // Vorschau der Beute für n Leisten, ohne etwas gutzuschreiben
  function wbBarPreview(n) { const R = rateOf(S), sec = wbBarSecs(n); return { gold: Math.floor(R.g * sec), souls: Math.floor(R.s * sec), dust: feature(S, 'runen') ? Math.floor(R.d * sec) : 0, spl: expOpen(S) ? Math.floor(n / 10) : 0 }; }
  async function wbClick(e) {
    const b = e.target.closest('[data-wb]'); if (!b || b.disabled || WBC.busy) return;
    const m = $('#wbMsg');
    if (b.dataset.wb === 'start') {
      if (!inCamp()) return;
      b.disabled = true; WBC.busy = true; const r = await wbCall('wb_start'); WBC.busy = false;
      if (r.error) { if (m) m.textContent = r.error; b.disabled = false; return; }
      WBC.info = r; WBC.at = Date.now(); WBC.tryId = r.tryId;
      S.wbBk = r.bk; $('#picker').hidden = true;
      startRun('wboss'); run.wb.tryId = r.tryId; save();
      $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (b.dataset.wb === 'guild') { showGuild();
    } else if (b.dataset.wb === 'claim') {
      b.disabled = true; WBC.busy = true; const r = await wbCall('wb_claim'); WBC.busy = false;
      if (r.error) { if (m) m.textContent = r.error; return; }
      const g = wbReward(S, r.goals); WBC.info = r; WBC.at = Date.now();
      if (g.goals) { SND.play('victory'); toast(`Wochenboss: ${g.goals} Ziele geschafft! ${[g.gold ? fmt(g.gold) + ' Gold' : '', g.souls ? g.souls + ' Seelen' : '', g.dust ? g.dust + ' Runensplitter' : '', g.spl ? g.spl + ' Heldensplitter' : ''].filter(Boolean).join(', ')}`, true); }
      afterChange(); wbRender();
    }
  }
  // Ende eines Kampfs: Beute pro Leiste gutschreiben (nur bei einem gültigen Versuch) und Ergebnis melden
  function wbFinish(R) {
    const bars = wbScore(R);
    R.wbLoot = R.wb.tryId ? wbBarReward(S, bars) : null;
    if (!R.wbLoot) R.wbMsg = 'Ohne gültigen Versuch wird nichts gezählt.';
    wbSubmit(R, bars);
  }
  async function wbSubmit(R, bars) {
    if (!R.wb.tryId || !acct || !acct.token) return;
    const r = await wbCall('wb_hit', { tryId: R.wb.tryId, bars }); R.wb.tryId = null;
    if (r.error) R.wbMsg = r.error;
    else { WBC.info = r; WBC.at = Date.now(); R.wbMsg = r.better ? `Neuer Wochenrekord: ${r.me.best} Leisten! ${wbGroupLabel(r)}: ${fmt(r.group.total)} Leisten, ${r.reached} / ${r.goals.length} Ziele.` : `Dein Wochenrekord bleibt bei ${r.me.best} Leisten. ${wbGroupLabel(r)}: ${fmt(r.group.total)} Leisten.`; }
    const el = $('#wbRes'); if (el) el.textContent = R.wbMsg;
  }
  function playCine(kind, team) {
    const n = S.news; if (!n) return;
    cine = { kind, t: 0, dur: kind === 'asc' ? 8.2 : 4.6, n: n.n, amount: kind === 'asc' ? n.crowns : n.stars,
      before: kind === 'asc' ? S.crowns - n.crowns : S.stars - n.stars, team };
    const host = $('#soloCanvas'); if (host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function startRun(mode) {
    if (cine) return;
    areaBefore = areaMax(S); st = statsFor(S, mode); run = newRun(S, mode); confirm = ''; notice = ''; heroes(); action(); panel(); }
  function soundMenu() {
    const pc = v => Math.round(v * 100);
    modal(`<h2>🔊 Ton</h2>
      <label class="rl-vol"><span>Musik <b id="vm">${pc(SND.vol.m)}%</b></span><input type="range" id="volM" min="0" max="100" value="${pc(SND.vol.m)}"></label>
      <label class="rl-vol"><span>Effekte <b id="vs">${pc(SND.vol.s)}%</b></span><input type="range" id="volS" min="0" max="100" value="${pc(SND.vol.s)}"></label>
      <button class="btn ghost" id="volOn">${SND.isOn() ? 'Alles stummschalten' : 'Ton einschalten'}</button>
      <button class="btn" data-m="x">Fertig</button>`);
    const m = $('#volM'), e = $('#volS');
    m.oninput = () => { SND.setVol('m', m.value / 100); $('#vm').textContent = m.value + '%'; };
    e.oninput = () => { SND.setVol('s', e.value / 100); $('#vs').textContent = e.value + '%'; };
    e.onchange = () => { SND.unlock(); SND.play('buy'); };
    $('#volOn').onclick = () => { const on = SND.toggle(); $('#picker').hidden = true; $('#soloSnd').textContent = on ? '🔊' : '🔇'; toast(on ? 'Ton an' : 'Ton aus'); };
    $('#picker').addEventListener('click', ev => { if (ev.target.closest('[data-m]')) $('#soloSnd').textContent = SND.isOn() ? '🔊' : '🔇'; }, { once: true });
  }
  let defeatFor = null, musT = 0;
  MUS.onEnd(() => { defeatFor = run; });
  function musicState() {
    if (!active) return null;
    const t = document.querySelector('.rl-title'); if (t && !t.classList.contains('play')) return null;
    if (!run || run.dead) return run && run.dead && !run.victory && defeatFor !== run ? 'defeat' : 'lobby';
    if (run.wf) return 'wf';
    if (run.mode === 'wboss') return 'boss';
    if (run.mode === 'ahnen' || run.mode === 'tower' || run.mode === 'exp') return 'tempel';
    if (run.stage > 150) return 'albtraum';
    if (run.enemies && run.enemies.some(e => e.boss || e.isBoss || e.wf)) return 'boss';
    return 'feldzug';
  }
  function loop(now) {
    if (!active) return;
    if (UPD.pending && !UPD.busy && (!run || run.dead)) updApply();
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    musT += dt; if (musT > 0.25) { musT = 0; const ms = musicState(); MUS.set(ms); MUS.tick(); SND.ambient(ms === 'lobby' || ms === 'defeat'); }
    // Automatisch weniger Effekte, wenn das Gerät nicht hinterherkommt
    if (!document.hidden && dt > 0) { fxClock += dt; fxAvg = fxAvg * 0.95 + dt * 0.05; if (fxClock > 3 && !lowFx && fxAvg > 0.03) lowFx = true; }
    if (cine) { cine.t += dt; if (cine.t >= cine.dur) { cine = null; showNews(); } }
    if (run && !run.dead) {
      const n = Math.ceil(S.speed), sdt = dt * S.speed / n;
      for (let i = 0; i < n; i++) if (step(S, st, run, sdt) === 'dead') { endRun(); break; }
    } else if (run) run.deadT += dt;
    if (STRIP.on) stripTick();
    draw(now / 1000);
    if (squad && !squad.el.hidden) drawSquad(now / 1000, squad);
    hudT += dt; if (hudT > 0.2) { hudT = 0; hud(); if (run && !run.dead) heroes(); trWatch(); }
    raf = requestAnimationFrame(loop);
  }

  function endRun() {
    const R = run, res = { extra: [] };
    if (R.mode === 'weekly') { const r = claimWeekly(S, R); R.weeklyReward = r; }
    if (R.mode === 'exp') { const r = claimExp(S, R); R.expReward = r; }
    if (R.mode === 'ahnen') { const r = ahnClaim(S, R); R.ahnReward = r; ahnSel = null; }
    if (R.mode === 'wboss') { R.victory = true; wbFinish(R); }
    noteRate(S, R);
    if (R.mode === 'normal' && areaMax(S) > areaBefore) res.area = zoneName(10 * areaMax(S) + 1);
    SND.play(R.victory ? 'victory' : 'defeat');
    res.ach = achCheck(R, true); save(); cloudSave(true); refresh();
    setTimeout(() => { if (active && run === R) showResult(R, res); }, R.victory ? 500 : 900);
  }
  // ---------- Ergebnis-Bildschirm: Gefallen oder Geschafft, mit allen Belohnungen ----------
  function showResult(R, res) {
    const win = !!R.victory, mins = Math.floor(R.time / 60), secs = Math.floor(R.time % 60);
    const items = [], add = (ic, text, col = '#ffe2a8', cls = '') => items.push(`<li class="${cls}" style="--ic:${col}"><span class="ri">${ic}</span><span>${text}</span></li>`);
    let title = '', sub = '', special = '', again = '', againLabel = 'Nochmal';
    if (R.mode === 'normal') { title = win ? `Stufengrenze ${capOf(S)} erreicht!` : R.wf ? 'Verschlungen' : 'Gefallen'; sub = win ? 'Weitere Stufen gibt es mit der nächsten Wiedergeburt.' : `auf Stufe ${R.stage} · ${esc(zoneName(R.stage))}`; again = 'normal'; againLabel = 'Neuer Feldzug'; }
    if (R.mode === 'tower') { title = 'Der Turm ist vorbei'; sub = `Etage ${R.stage} erreicht`; again = 'tower'; }
    if (R.mode === 'weekly') { title = 'Herausforderung vorbei'; sub = `Stufe ${R.stage} · Bestes Ergebnis heute: Stufe ${(S.daily || {}).best || R.stage}`; again = 'weekly'; }
    if (R.mode === 'exp') { const m = MISSION[R.mission]; title = win ? `Expedition geschafft: ${m.name}` : `Expedition gescheitert: ${m.name}`; sub = win ? `${R.waves} Wellen überstanden` : esc(R.failNote || `Gefallen auf Stufe ${R.stage}`); again = 'exp'; againLabel = 'Nochmal'; }
    if (R.mode === 'ahnen') { const A = R.ahn, M = AHN_MISSIONS[A.mi], d = ahnBossesOf(A.mi)[A.bi];
      title = win ? `Mission ${A.mi + 1} geschafft` : `Mission ${A.mi + 1} gescheitert`;
      sub = win ? esc(M.name) : A.wave < AHN_TUNE.waves || !d ? `Bei den Dienern vor Boss ${A.bi + 1}` : `Bei ${esc(d.name)}${A.boss ? `, Phase ${A.boss.phase + 1}` : ''}`;
      again = 'ahn'; againLabel = win ? (R.ahnReward && R.ahnReward.sigil ? 'Neue Prüfung' : `Mission ${S.ahn.m + 1} starten`) : 'Nochmal versuchen'; }
    if (R.mode === 'wboss') { title = `Wochenboss: ${wbScore(R)} Leisten`; sub = esc(wbBossName(R.wb.bk)); again = 'wboss'; againLabel = 'Zum Wochenboss';
      special = `<div class="rl-wbres"><b>${wbScore(R)}</b><small>Leisten abgezogen</small><p class="note" id="wbRes">${esc(R.wbMsg || 'Wird gemeldet …')}</p></div>`;
      if (R.wbLoot) { const L = R.wbLoot; if (L.gold) add(coin, `<b>+${fmt(L.gold)}</b> Gold`, '#ffcf4a'); if (L.souls) add(soul, `<b>+${L.souls}</b> Seelen`, '#c9a6ff'); if (L.dust) add(dust, `<b>+${L.dust}</b> Runensplitter`, '#e2c9ff'); if (L.spl) add('◈', `<b>+${L.spl}</b> Heldensplitter`, '#9bd14a'); } }
    // Belohnungen
    if (R.gold) add(coin, `<b>+${fmt(R.gold)}</b> Gold`, '#ffcf4a');
    if (R.souls) add(soul, `<b>+${R.souls}</b> Seele${R.souls > 1 ? 'n' : ''}`, '#c9a6ff');
    for (const r of R.runes) add('◆', `Rune <b>${RUNE[r.t].name} ${ROMAN[r.tier]}</b>`, RUNE[r.t].color);
    if (R.weeklyReward && R.weeklyReward.stars) add(star, `<b>+${R.weeklyReward.stars}</b> Sterne`, '#ffd23f');
    if (R.weeklyReward && R.weeklyReward.crowns) add(crown, `<b>+${R.weeklyReward.crowns}</b> Krone`, '#ffd23f');
    if (R.expReward) add('◈', `<b>+${R.expReward.spl}</b> Heldensplitter`, '#9bd14a');
    if (R.expReward && R.expReward.dup != null) add('🧩', `Doppeltes Puzzleteil von ${HERO_BY_ID[R.expReward.hero].name}: <b>+${R.expReward.dupSpl}</b> Heldensplitter`, HERO_BY_ID[R.expReward.hero].color);
    if (R.expReward && R.expReward.rune) add('⬢', `Rune aus der Mine: <b>${RUNE[R.expReward.rune.t].name} ${ROMAN[R.expReward.rune.tier]}</b>`, RUNE[R.expReward.rune.t].color);
    if (R.expReward && R.expReward.runeDust) add('⬢', `Runenlager voll: Minen-Rune zu <b>${R.expReward.runeDust} Runensplittern</b> zerlegt`, '#e2c9ff');
    if (R.mode === 'tower' && R.stage > (R.towerBefore || 0)) add('🏰', `Neuer Turm-Rekord: <b>Etage ${R.stage}</b> · +${R.stage * 3} % Schaden und Leben bis zum Aufstieg`, '#c9a6ff', 'hot');
    if (R.mode === 'normal' && S.best > (R.bestBefore || 0)) add('★', `Neuer Rekord: <b>Stufe ${S.best}</b>`, '#ffb547', 'hot');
    if (res.area) add('⚑', `Neues Startgebiet frei: <b>${esc(res.area)}</b>`, '#7ee08a', 'hot');
    if (R.ahnReward && !R.ahnReward.sigil) add('✦', `Mission ${R.ahnReward.mission + 2} ist frei: <b>${esc(AHN_MISSIONS[R.ahnReward.mission + 1].name)}</b>`, '#ffd27a');
    if (R.wfKilled) add('🐉', `<b>Der Weltenfresser ist gefallen!</b> ${R.wfKilled.first ? 'Du bist jetzt Weltenbezwinger · ' : ''}+${R.wfKilled.crowns} Kronen`, '#ffb070', 'hot');
    for (const a of res.ach || []) add('🏆', `Erfolg: <b>${esc(a.name)}</b> (+3 % Stärke)`, '#ffd23f', 'hot');
    // Besondere Belohnungen mit Animation
    if (R.ahnReward && R.ahnReward.sigil) special = `<div class="rl-rsigil"><div class="rays"></div><div class="seal"><span>✦</span></div>
        <h3>Ahnensiegel erhalten!</h3><p>Der Urahn ist besiegt. Du hast jetzt <b>${S.ahn.sig}</b> freie${S.ahn.sig === 1 ? 's' : ''} Siegel.</p>
        <button class="btn gold" data-m="go" data-go="sigil">Siegel setzen</button></div>`;
    const ex = R.expReward;
    if (ex && ex.piece != null) { const h = HERO_BY_ID[ex.hero];
      special = ex.complete ? `<div class="rl-rpuzzle done" style="--hc:${h.color}">${puzzleHTML(ex.hero, false, ex.piece)}<h3>${h.name} ist bereit!</h3><p>Alle 6 Puzzleteile sind zusammen. ${h.name} hat sich deiner Gruppe angeschlossen. Stell den Helden in der Aufstellung am Lagerfeuer auf.</p><button class="btn" data-m="go" data-go="hero:${h.tree}">Zu ${h.name}</button></div>`
        : `<div class="rl-rpuzzle" style="--hc:${h.color}">${puzzleHTML(ex.hero, false, ex.piece)}<h3>Puzzleteil gefunden!</h3><p>Ein Teil für ${h.name}: jetzt <b>${pieceCount(S, ex.hero)} von 6</b>.</p></div>`;
      if (ex.complete && S.exp.target === ex.hero) { const nx = PUZZLE.find(x => !assembled(S, x)); if (nx) { S.exp.target = nx; save(); } } }
    const stats = `<div class="rl-rstats"><span><b>${R.mode === 'wboss' ? `×${fmt(Math.pow(WB.grow, wbScore(R)))}` : R.mode === 'tower' ? `Etage ${R.stage}` : `Stufe ${R.stage}`}</b>${R.mode === 'wboss' ? 'Bossstärke am Ende' : R.mode === 'exp' || R.mode === 'ahnen' ? 'Gegnerstärke' : 'erreicht'}</span><span><b>${R.kills}</b>Gegner besiegt</span><span><b>${mins}:${String(secs).padStart(2, '0')}</b>Spielzeit</span></div>`;
    const showAgain = again && inCamp() && (again !== 'tower' || feature(S, 'turm')) && (again !== 'ahn' || ahnOpen(S));
    modal(`<div class="rl-rhead"><span class="rl-remb">${win ? '🏆' : '💀'}</span><h2>${title}</h2><p>${sub}</p></div>
      ${special}
      ${stats}
      ${items.length ? `<h4 class="rl-rlabel">${win ? 'Deine Belohnungen' : 'Das nimmst du mit'}</h4><ul class="rl-rlist">${items.join('')}</ul>` : special ? '' : '<p class="note rl-rnone">Diesmal keine Beute. Verbessere deine Helden und versuch es nochmal.</p>'}
      <div class="row rl-ract">${showAgain ? `<button class="btn ${win ? 'gold' : ''}" data-m="go" data-go="${again}">${againLabel}</button>` : ''}<button class="btn ghost" data-m="ok">Zum Lager</button></div>`, `rl-result ${win ? 'win' : 'lose'}`);
  }
  /* ---------- Leisten ---------- */
  const crown = '<i class="rl-crown" aria-hidden="true"></i>', coin = '<i class="rl-coin" aria-hidden="true"></i>', soul = '<i class="rl-soulic" aria-hidden="true"></i>', star = '<i class="rl-star" aria-hidden="true"></i>', dust = '<i class="rl-dust" aria-hidden="true"></i>';
  function hud() {
    { const el = $('#rlStat'); el.innerHTML = ''; el.hidden = true; }
    { const d = $('#soloNews .dot'); if (d) d.hidden = !UPDATES.length || newsSeen() >= UPDATES[0].id; }
    $('#soloSpeed').textContent = `Tempo ×${String(S.speed).replace('.', ',')}`;
  }
  function heroes() {
    const live = run && !run.dead, box = $('#rlHeroes');
    box.hidden = !S.uiTroop;
    if (!S.uiTroop) { box.innerHTML = ''; return; }
    // Nur die Helden, die gerade in der Truppe sind
    const inTroop = live ? run.order : fieldOf(S);
    const list = HEROES.filter(h => st[h.id] && inTroop.includes(h.id));
    const next = null;
    const field = fieldOf(S), slots = fieldSlots(S), hiredN = HEROES.filter(h => hired(S, h.tree)).length;
    const bar = '';
    $('#rlHeroes').innerHTML = bar + list.map(h => {
      const sh = st[h.id];
      if (!sh) return `<button class="rl-hero locked" data-tab="${h.tree}" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><span class="hn"><b>${h.name}</b><small>Im Baum anheuern</small></span></button>`;
      const eq = S.equip.filter(id => NODE[id].tree === h.tree);
      let body;
      if (live && run.h[h.id]) {
        const hs = run.h[h.id], pct = Math.max(0, hs.hp / sh.hp);
        body = `<span class="hp"><i style="width:${pct * 100}%"></i>${hs.shield > 0 ? `<em style="width:${Math.min(100, hs.shield / sh.hp * 100)}%"></em>` : ''}</span><small>${hs.alive ? `${fmt(Math.max(0, hs.hp))} / ${fmt(sh.hp)}` : 'Gefallen'}</small>
          <span class="cds">${eq.map(id => { const cd = run.cds[id] || 0; return `<span class="cd ${cd > 0 ? '' : 'ok'}">${ACT_NAME(id)}${cd > 0 ? ` ${Math.ceil(cd)}s` : ''}</span>`; }).join('')}</span>`;
      } else body = `<small>${h.id === 'p' ? `Heilung ${fmt(sh.heal)}` : `Schaden ${fmt(sh.atk)}`} · Leben ${fmt(sh.hp)}</small><span class="cds">${eq.map(id => `<span class="cd ok">${ACT_NAME(id)}</span>`).join('') || '<span class="cd">keine Fähigkeit</span>'}</span>`;
      const benched = !field.includes(h.id);
      if (live && !run.h[h.id]) body = '<small>Wartet am Lagerfeuer</small>';
      return `<button class="rl-hero ${live && run.h[h.id] && !run.h[h.id].alive ? 'down' : ''} ${benched ? 'bench' : ''}" data-tab="${h.tree}" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><span class="hn"><b>${h.name}${benched ? ' <em class="rl-benchtag">Bank</em>' : ''}</b>${body}</span></button>`;
    }).join('') + (next && !live ? `<div class="rl-hero locked" style="--hc:${next.color}"><span class="pt">?</span><span class="hn"><b>${next.name}</b><small>kommt mit der ${next.rebirth}. Wiedergeburt</small></span></div>` : '');
  }
  function action() {
    const a = $('#rlAction');
    const troopBtn = `<button class="btn ghost rl-troopbtn ${S.uiTroop ? 'on' : ''}" data-rl="troop" aria-expanded="${!!S.uiTroop}">Truppe ${S.uiTroop ? '▴' : '▾'}</button>`;
    if (inCamp()) a.innerHTML = `${troopBtn}<button class="btn ghost rl-boardbtn" data-rl="board">📋 Anschlagbrett${boardNew().length || tripsReady().length || wbClaimable() ? '<i class="rl-reddot" aria-label="neu"></i>' : ''}</button>${areaMax(S) >= 1 ? `<button class="btn ghost rl-area" data-rl="area"><small>Startgebiet</small><b>${esc(zoneName(st.startStage))} ▾</b></button>` : ''}<button class="btn rl-go" data-rl="start">Feldzug starten</button>`;
    else a.innerHTML = `${troopBtn}<button class="btn ${confirm === 'giveup' ? 'danger' : 'ghost'} small" data-rl="giveup">${confirm === 'giveup' ? 'Wirklich aufgeben?' : run.mode === 'tower' ? 'Turm verlassen' : run.mode === 'weekly' ? 'Herausforderung beenden'   : run.mode === 'wboss' ? 'Kampf beenden' : run.mode === 'exp' || run.mode === 'ahnen' ? 'Mission abbrechen' : 'Feldzug aufgeben'}</button>`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const costHTML = c => [c.g ? `<span class="rl-cur gold">${coin}${fmt(c.g)}</span>` : '', c.s ? `<span class="rl-cur soul">${soul}${c.s}</span>` : ''].join(' ');

  /* ---------- Bäume ---------- */
  function treeSVG(tree) {
    const sg = sigOn(S, tree), list = NODES.filter(n => n.tree === tree && (!n.sig || sg));
    const P = n => [n.x * 100 + 50, n.y * 100 + 50];
    let lines = '', nodes = '';
    for (const n of list) for (const pid of n.p || []) {
      const p = NODE[pid], on = rank(S, n.id) > 0 && rank(S, pid) > 0, open = rank(S, pid) > 0;
      const [x1, y1] = P(p), [x2, y2] = P(n);
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${on ? 'on' : open ? 'open' : ''}"/>`;
    }
    for (const n of list) {
      const [x, y] = P(n), r = rank(S, n.id), av = available(S, n), afford = inCamp() && canBuy(S, n);
      const cls = ['nd', n.sig ? 'sig' : '', n.active ? 'act' : '', n.kind || '', r ? 'own' : av ? 'av' : 'lock', afford ? 'buy' : '', sel[tree] === n.id ? 'sel' : '', S.equip.includes(n.id) ? 'eq' : ''].join(' ');
      const R = n.kind === 'key' ? 36 : n.kind === 'start' ? 34 : 30;
      const shape = n.active ? `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="16"/>` : n.kind === 'key' ? `<polygon points="${x},${y - R} ${x + R},${y} ${x},${y + R} ${x - R},${y}"/>` : `<circle cx="${x}" cy="${y}" r="${R}"/>`;
      const lbl = n.max > 1 ? (n.max > 99 ? r : `${r}/${n.max}`) : '';
      nodes += `<g class="${cls}" data-node="${n.id}" role="button" aria-label="${esc(n.name)}">${afford ? `<circle cx="${x}" cy="${y}" r="${R + 10}" class="glow"/>` : ''}${shape}<text x="${x}" y="${y + 2}" class="ic">${n.icon}</text>${lbl ? `<text x="${x}" y="${y + 52}" class="rk">${lbl}</text>` : ''}</g>`;
    }
    const band = sg ? `<rect class="sigband" x="6" y="702" width="688" height="404" rx="28"/><text class="sigtxt" x="350" y="1096">✦ Ahnensiegel ✦</text>` : '';
    return `<svg class="rl-tree2" viewBox="0 0 700 ${sg ? 1110 : 710}">${band}${lines}${nodes}</svg>`;
  }
  function detailHTML(tree) {
    const n = NODE[sel[tree]], r = rank(S, n.id), maxed = r >= n.max, h = HERO[tree], why = blockReason(S, n);
    const type = n.kind === 'start' ? (n.cost ? 'Anheuern' : 'Start') : n.active ? (n.sig ? 'Siegel-Fähigkeit' : 'Aktive Fähigkeit') : n.kind === 'key' ? (n.sig ? 'Siegel-Schlüssel' : 'Schlüssel') : n.kind === 'inf' ? 'Endlos' : n.sig ? 'Siegel · Passiv' : 'Passiv';
    let act = '';
    if (n.cost) {
      if (maxed && n.kind === 'key') { const c = nodeCost(S, { ...n, id: '_' }); act = `<button class="btn ${confirm === 'unkey' ? 'danger' : 'ghost'} small" data-rl="unkey" ${inCamp() ? '' : 'disabled'}>${confirm === 'unkey' ? 'Wirklich abnehmen?' : 'Schlüssel abnehmen'}</button><span class="note">Du bekommst ${costHTML(c)} zurück und kannst einen anderen Schlüssel wählen.</span>`; }
      else if (maxed) act = '<span class="note">Voll ausgebaut</span>';
      else if (why) act = `<span class="note">${esc(why)}</span>`;
      else act = `<div class="rl-buy"><button class="btn small" data-rl="buy" ${inCamp() && canBuy(S, n) ? '' : 'disabled'}>${n.kind === 'start' ? 'Anheuern' : r ? 'Verbessern' : 'Freischalten'}</button>${costHTML(nodeCost(S, n))}</div>${inCamp() ? '' : '<span class="note">Verbessern geht nur im Lager nach dem Lauf.</span>'}`;
      if (acct && acct.tester) act += `<button class="btn ghost small" data-tmenu="n:${n.id}" title="Test-Werkzeug">🧪</button>`;
    }
    if (n.active && r) {
      const on = S.equip.includes(n.id), used = eqOf(S, tree, n.sig).length, lim = slotLim(S, tree, n.sig);
      act += `<button class="btn ghost small" data-rl="equip" ${inCamp() && lim > 0 ? '' : 'disabled'}>${on ? 'Ablegen' : used >= lim ? 'Ausrüsten (tauscht)' : 'Ausrüsten'}</button>${n.sig ? '<span class="note">Kommt in den Siegel-Platz.</span>' : ''}`;
    }
    const mcd = n.active && ACT[n.id] && typeof ACT[n.id].minCd === 'number' ? ACT[n.id].minCd : 0;
    if (mcd) act = `<span class="note">Höchstens alle ${mcd} s, auch wenn die Fähigkeit schneller lädt.</span>` + act;
    return `<div class="rl-detail" style="--hc:${h.color}"><div class="rl-dhead"><span class="rl-dic">${n.icon}</span><div><b>${esc(n.name)}</b><span class="pill">${type}</span></div></div>
      ${n.max > 1 ? `<span class="note">${n.max > 99 ? `Stufe ${r}` : `Stufe ${r} von ${n.max}`}</span>` : ''}<p>${esc(n.desc)}</p>${n.cap ? `<p class="note">${r >= n.cap ? `Grenze erreicht${r > n.cap ? ` · ${r - n.cap} Bonus-Stufen aktiv` : ''}` : `Noch ${n.cap - r} Stufen bis zur Grenze`}</p>` : ''}<div class="row">${act}</div></div>`;
  }
  function sockRow(tree) {
    const cap = keyCap(S, tree), used = keyNeed(S, tree), extra = cap - 1, free = kFree(S);
    const dots = Array.from({ length: cap }, (_, i) => `<span class="rl-sock ${i < used ? 'on' : ''} ${i === 0 ? 'fix' : ''}" title="${i === 0 ? 'Fester Sockel' : 'Verteilbarer Sockel'}">⚿</span>`).join('')
      + (sigOn(S, tree) ? `<span class="rl-sock sig ${sigKeysUsed(S, tree) ? 'on' : ''}" title="Siegelsockel: nur für einen Siegel-Schlüssel">✦</span>` : '');
    return `<div class="rl-keyrow"><span class="note">Schlüsselsockel ${used}/${cap}</span><span class="rl-socks">${dots}</span>
      <button class="btn ghost small" data-rl="sockadd" ${free > 0 && inCamp() ? '' : 'disabled'}>+ Sockel setzen</button>
      <button class="btn ghost small" data-rl="sockdel" ${extra > 0 && inCamp() ? '' : 'disabled'}>− Sockel abnehmen</button>
      <span class="note">frei: <b>${free}</b> von ${kSlots(S)}</span></div>`;
  }
  function heroTab(tree) {
    const h = HERO[tree], eq = eqOf(S, tree, false), eqS = eqOf(S, tree, true), ok = hired(S, tree), sg = sigOn(S, tree);
    const lockedNote = !classOpen(S, tree) ? `<p class="warn">${h.puzzle ? `Diese Klasse bekommst du mit 6 Puzzleteilen aus den Expeditionen (${pieceCount(S, h.id)}/6).` : `Diese Klasse wird mit der ${h.rebirth}. Wiedergeburt freigeschaltet.`} Du kannst dir den Baum schon ansehen.</p>` : '';
    return `${lockedNote}<div class="rl-hhead" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><div><h3>${h.name}</h3><p class="note">${h.desc}</p>
      ${ok ? `<p class="note">Aktive Fähigkeiten ${eq.length}/${slotsOf(S, tree)}: ${eq.length ? esc(eq.map(ACT_NAME).join(', ')) : 'noch keine'}${sg ? ` · <span class="rl-sigslot">✦ Siegel-Platz: ${eqS.length ? esc(eqS.map(ACT_NAME).join(', ')) : 'frei'}</span>` : ''}</p>${mastHTML(h)}${sockRow(tree)}` : ''}</div></div>
      ${acct && acct.tester ? `<div class="rl-test"><b>🧪 Test</b> <button class="btn small ${confirm === 'tbuild' ? 'danger' : ''}" data-rl="tbuild" ${inCamp() && classOpen(S, tree) ? '' : 'disabled'}>${confirm === 'tbuild' ? 'Wirklich den ganzen Baum setzen?' : 'Baum komplett ausbauen'}</button><span class="note">Alles auf voll, beide Endlos-Fertigkeiten auf 42. Kostet nichts. Schlüssel bleiben, wie sie sind.</span>
        <button class="btn small ${S.tKeepTree ? '' : 'ghost'}" data-rl="tkeep">${S.tKeepTree ? '✓ Bäume bleiben bei Wiedergeburt' : 'Bäume bleiben bei Wiedergeburt: aus'}</button><span class="note">Wenn an, behalten alle Helden bei einer Wiedergeburt ihre Fertigkeitenbäume und ausgerüsteten Fähigkeiten. Gilt für alle Helden.</span></div>` : ''}
      ${wallet(['gold', 'souls'], 'rl-treewallet')}
      <div class="rl-treewrap"><div class="rl-treebox">${treeSVG(tree)}${!sg && ahnOpen(S) && classOpen(S, tree) ? `<p class="note rl-signote">✦ Mit einem Ahnensiegel wächst dieser Baum nach unten: 5 passive Fähigkeiten, 3 Siegel-Fähigkeiten mit eigenem Platz und 4 Siegel-Schlüssel mit eigenem Sockel. ${S.ahn.sig > 0 ? 'Du hast ein freies Siegel, setze es im Reiter Ahnenprüfung.' : 'Siegel bekommst du in der Ahnenprüfung.'}</p>` : ''}</div>${detailHTML(tree)}</div>`;
  }
  function testBuild(tree) {
    const inf = NODES.filter(n => n.tree === tree && n.kind === 'inf');
    for (const n of NODES) {
      if (n.tree !== tree || n.kind === 'key' || (n.sig && !sigOn(S, tree))) continue;
      S.nodes[n.id] = n.kind === 'inf' ? 42 : n.max;
    }
    const acts = NODES.filter(n => n.tree === tree && n.active).map(n => n.id);
    for (const id of acts) if (!S.equip.includes(id) && eqOf(S, tree, NODE[id].sig).length < slotLim(S, tree, NODE[id].sig)) S.equip.push(id);
  }
  function campInfo() {
    if (run && run.dead) {
      const extra = `${run.kills} Gegner besiegt${run.gold ? ` · ${coin}+${fmt(run.gold)}` : ''}${run.souls ? ` · ${soul}+${run.souls}` : ''}${run.runes.length ? ` · ${run.runes.length} Rune${run.runes.length > 1 ? 'n' : ''}` : ''}`;
      if (run.mode === 'weekly') { const r = run.weeklyReward || {}; return `<div class="rl-dead week"><b>Tages-Herausforderung: Stufe ${run.stage}</b><span>Bestes Ergebnis heute: Stufe ${(S.daily || {}).best || 0}${r.stars ? ` · ${star}+${r.stars}` : ''}${r.crowns ? ` · ${crown}+${r.crowns}` : ''}</span><span class="note">Belohnungen und Bestenliste findest du in der Ruhmeshalle.</span></div>`; }
      if (run.mode === 'ahnen') return ahnEndInfo();
      if (run.mode === 'exp') {
        const m = MISSION[run.mission], r = run.expReward;
        if (run.victory && r) return `<div class="rl-dead win"><b>Mission geschafft: ${esc(m.name)}</b><span>+${r.spl} Heldensplitter${r.rune ? ` · Rune: ${RUNE[r.rune.t].name} ${ROMAN[r.rune.tier]}` : r.runeDust ? ` · +${r.runeDust} Runensplitter (Lager voll)` : ''}${r.piece != null ? ` · Puzzleteil für ${HERO_BY_ID[r.hero].name}!` : ''}${r.dup != null ? ` · doppeltes Teil: +${r.dupSpl} Splitter` : ''}</span><span class="note">Splitter: ${S.exp.spl}${r.hero ? ` · Puzzleteile von ${HERO_BY_ID[r.hero].name}: ${pieceCount(S, r.hero)}/6` : ''}</span></div>`;
        return `<div class="rl-dead"><b>Mission gescheitert: ${esc(m.name)}</b><span>${esc(run.failNote || `Gefallen auf Stufe ${run.stage}`)}</span><span class="note">Versuch es mit stärkeren Helden oder einer leichteren Mission.</span></div>`;
      }
      if (run.mode === 'tower') return `<div class="rl-dead tower"><b>Turm: Etage ${run.stage} erreicht</b><span>${extra}</span><span class="note">Dein Turm-Rekord (${S.towerBest}) gibt allen Helden bis zum nächsten Aufstieg +${S.towerBest * 3} % Schaden und Leben.</span></div>`;
      if (run.victory) return `<div class="rl-dead win"><b>Stufengrenze ${capOf(S)} erreicht!</b><span>${extra}</span><span class="note">Weitere Stufen schaltest du mit der nächsten Wiedergeburt frei.</span></div>`;
      return `<div class="rl-dead"><b>Lauf vorbei auf Stufe ${run.stage}</b><span>${extra}</span><span class="note">Verbessere deine Helden und starte dann den nächsten Lauf.</span></div>`;
    }
    if (!run && !acct && S.runs >= 2) return `<div class="rl-hint"><span><b>Tipp:</b> Sichere deinen Fortschritt mit Namen und Passwort, damit er nicht verloren geht.</span><button class="btn small" data-rl="gosave">Jetzt sichern</button></div>`;
    if (!run) return '<p class="note">Du bist im Lager. Hier verbesserst du deine Helden mit Gold und Seelen. Seelen gibt es von Bossen (alle 10 Stufen) und manchmal von Elite-Gegnern mit lila Schimmer.</p>';
    return '<p class="note">Der Lauf läuft. Verbessern kannst du erst danach im Lager.</p>';
  }
  /* ---------- Runen ---------- */
  function runeChip(r, extra = '') {
    return `<button class="rl-rune ${extra}" data-rune="${r.id}" style="--rc:${RUNE[r.t].color}" aria-label="${RUNE[r.t].name} ${ROMAN[r.tier]}"><b>${ROMAN[r.tier]}</b><small>${RUNE[r.t].name}</small></button>`;
  }
  function runenTab() {
    const used = new Set(Object.values(S.sockets).flat().filter(Boolean));
    const selR = runeSel && S.runes.find(r => r.id === runeSel);
    let html = !feature(S, 'runen') && S.runes.length ? `<p class="warn">🔒 Deine ${S.runes.length} Runen sind sicher aufbewahrt, auch in ihren Sockeln. Sie wirken aber erst wieder ab der 2. Wiedergeburt, und bis dahin fallen keine neuen.</p>` : '';
    html += `<p class="note">Bosse lassen Runen fallen. Setze bis zu 3 Runen pro Klasse ein. Drei Runen der gleichen Art in einer Klasse geben +50 % Bonus. Runen bleiben bei der Wiedergeburt erhalten.</p>`;
    if (extraSocks(S)) html += `<p class="rl-reson">⬢ Runenhort: ${extraSocks(S)} Zusatz-Sockel je Held (bis Stufe ${XSOCK.slice(0, extraSocks(S)).map(x => ROMAN[x.max]).join(', ')}). Sie zählen nicht zum 3er-Set.</p>`;
    if (runeAmp(S) > 1) html += `<p class="rl-reson">⬢ Runenresonanz: alle eingesetzten Runen wirken <b>+${Math.round((runeAmp(S) - 1) * 100)} %</b> stärker.</p>`;
    if (selR) html += `<div class="rl-runesel" style="--rc:${RUNE[selR.t].color}"><b>${RUNE[selR.t].name} ${ROMAN[selR.tier]}</b><span>${RUNE[selR.t].desc(runeVal(selR.t, selR.tier))}</span><span class="note">Tippe auf einen Sockel, um sie einzusetzen.</span>
      ${feature(S, 'runen') ? `<div class="row">${feature(S, 'schmiede') ? `<button class="btn small" data-rl="merge" ${canMerge(S, selR) ? '' : 'disabled'}>3 verschmelzen → ${ROMAN[selR.tier + 1] || ''} (${dust}${mergeCost(selR.tier)})</button>` : ''}<button class="btn ghost small" data-rl="dismantle">Zerstören (+${dust}${shardOf(selR.tier)})</button></div>` : ''}</div>`;
    html += '<div class="rl-sockets">' + HEROES.filter(h => st[h.id]).map(h => {
      const allS = S.sockets[h.id] || [], xs = extraSocks(S), slots = allS.slice(0, 3 + Math.max(xs, allS.slice(3).some(Boolean) ? 3 : 0));
      const b = Object.entries((() => { const list = slots.map(id => id && S.runes.find(r => r.id === id)).filter(Boolean); const c = {}; list.forEach(r => (c[r.t] = (c[r.t] || 0) + 1)); return c; })()).filter(([, n]) => n >= 3);
      return `<div class="rl-sockrow" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><b>${h.name}</b><div class="slots">${slots.map((id, i) => {
        const r = id && S.runes.find(x => x.id === id);
        const xi = i - 3, lock = i >= 3 && xi >= xs, cap = i >= 3 ? XSOCK[xi].max : 10;
        if (r) return `<span class="slotwrap ${i >= 3 ? 'xs' : ''} ${lock || r.tier > cap ? 'off' : ''}" data-sock="${h.id}:${i}" ${lock ? `title="Wirkt erst wieder ab Runenhort ${XSOCK[xi].at}"` : ''}>${runeChip(r, 'in')}</span>`;
        if (lock) return `<span class="rl-slot xs locked" title="Runenhort ${XSOCK[xi].at}">🔒</span>`;
        return `<button class="rl-slot ${i >= 3 ? 'xs' : ''} ${selR && (i < 3 || selR.tier <= cap) ? 'ready' : ''}" data-sock="${h.id}:${i}" ${i >= 3 ? `title="Zusatz-Sockel für Runen bis Stufe ${ROMAN[cap]}"` : ''}>${i >= 3 ? `≤${ROMAN[cap]}` : '+'}</button>`;
      }).join('')}</div>${b.length ? `<span class="pill">Set: ${RUNE[b[0][0]].name}</span>` : ''}${h.id === 'o' && st.o && st.o.runeSelf ? `<span class="pill rl-golempill">Golem-Runen +${Math.round(st.o.runeSelf * 100)} %</span>` : ''}</div>`;
    }).join('') + '</div>';
    const free = S.runes.filter(r => !used.has(r.id)).sort((a, b) => b.tier - a.tier || a.t.localeCompare(b.t));
    html += `<h3 class="rl-h3">Lager (${S.runes.length}/${runeCap(S)})</h3><div class="rl-inv">${free.map(r => runeChip(r, r.id === runeSel ? 'on' : '')).join('') || '<p class="note">Noch keine freien Runen. Besiege Bosse, um welche zu finden.</p>'}</div>`;
    return html;
  }
  const KOBOLD_SVG = `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="kfg" cx="50%" cy="78%" r="60%"><stop offset="0" stop-color="#ff9a3d" stop-opacity=".55"/><stop offset=".55" stop-color="#ff6a2a" stop-opacity=".18"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
<linearGradient id="kskin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ccf5a"/><stop offset="1" stop-color="#5e8f34"/></linearGradient>
<linearGradient id="kanv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a909c"/><stop offset=".25" stop-color="#5a606c"/><stop offset="1" stop-color="#2e323a"/></linearGradient>
<linearGradient id="khot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7a2a"/><stop offset=".5" stop-color="#fff2a8"/><stop offset="1" stop-color="#ff7a2a"/></linearGradient>
<linearGradient id="kapr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a34"/><stop offset="1" stop-color="#5a3a20"/></linearGradient>
</defs>
<ellipse cx="100" cy="175" rx="100" ry="70" fill="url(#kfg)" class="kglow"/>
<ellipse cx="100" cy="214" rx="78" ry="9" fill="rgba(0,0,0,.35)"/>
<!-- Beine -->
<rect x="112" y="168" width="12" height="40" rx="5" fill="#4a3a2a" stroke="#1e1610" stroke-width="2"/>
<rect x="134" y="168" width="12" height="40" rx="5" fill="#4a3a2a" stroke="#1e1610" stroke-width="2"/>
<ellipse cx="117" cy="208" rx="11" ry="5" fill="#2a1e14"/><ellipse cx="141" cy="208" rx="11" ry="5" fill="#2a1e14"/>
<!-- Körper mit Schürze -->
<path d="M104 120 Q129 104 154 120 L158 176 Q129 186 100 176 Z" fill="#a0603a" stroke="#1e1610" stroke-width="2.5"/>
<path d="M110 128 Q129 120 148 128 L150 182 Q129 190 108 182 Z" fill="url(#kapr)" stroke="#1e1610" stroke-width="2"/>
<rect x="104" y="150" width="50" height="6" fill="#3a2614"/><rect x="125" y="149" width="8" height="8" rx="1.5" fill="#e0b84a"/>
<!-- hinterer Arm hält das Werkstück mit Zange -->
<path d="M108 132 Q86 146 76 160" fill="none" stroke="#1e1610" stroke-width="11" stroke-linecap="round"/>
<path d="M108 132 Q86 146 76 160" fill="none" stroke="url(#kskin)" stroke-width="7" stroke-linecap="round"/>
<path d="M76 160 L52 166 M76 160 L52 160" stroke="#3a3a44" stroke-width="3" stroke-linecap="round"/>
<!-- Kopf -->
<g class="khead">
<path d="M106 84 L74 66 L98 96 Z" fill="url(#kskin)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M152 84 L186 64 L160 96 Z" fill="url(#kskin)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M104 82 L84 72 L100 92 Z" fill="#d88f86"/><path d="M154 82 L176 70 L158 92 Z" fill="#d88f86"/>
<circle cx="129" cy="92" r="27" fill="url(#kskin)" stroke="#1e1610" stroke-width="2.5"/>
<path d="M104 80 Q129 58 154 80 L154 74 Q129 52 104 74 Z" fill="#7a3a24" stroke="#1e1610" stroke-width="2"/>
<rect x="106" y="70" width="46" height="9" rx="4" fill="#5a3a24" stroke="#1e1610" stroke-width="1.6"/>
<circle cx="118" cy="74" r="7" fill="#9fd8f2" stroke="#2a2a30" stroke-width="2.5"/><circle cx="140" cy="74" r="7" fill="#9fd8f2" stroke="#2a2a30" stroke-width="2.5"/>
<circle cx="116" cy="72" r="2.2" fill="#fff" opacity=".8"/><circle cx="138" cy="72" r="2.2" fill="#fff" opacity=".8"/>
<ellipse cx="119" cy="92" rx="5.5" ry="6" fill="#fff6a0" stroke="#1e1610" stroke-width="1.6"/><ellipse cx="139" cy="92" rx="5.5" ry="6" fill="#fff6a0" stroke="#1e1610" stroke-width="1.6"/>
<circle cx="117.5" cy="93" r="2.6" fill="#1e1610"/><circle cx="137.5" cy="93" r="2.6" fill="#1e1610"/>
<path d="M126 96 Q122 106 128 107 Q133 106 131 97 Z" fill="#7aa848" stroke="#1e1610" stroke-width="1.6"/>
<path d="M114 108 Q129 120 144 108 Q129 114 114 108 Z" fill="#2a1410" stroke="#1e1610" stroke-width="1.4"/>
<path d="M118 109 L120 113 L122 110 Z M136 110 L138 113 L140 109 Z" fill="#fff"/>
<circle cx="111" cy="102" r="3" fill="#ff9a8a" opacity=".45"/><circle cx="147" cy="102" r="3" fill="#ff9a8a" opacity=".45"/>
</g>
<!-- Amboss -->
<path d="M48 150 L150 150 Q160 150 160 158 L150 164 L118 166 L124 190 L136 196 L136 204 L60 204 L60 196 L72 190 L78 166 L56 164 Q30 160 22 152 Q36 150 48 150 Z" fill="url(#kanv)" stroke="#14161a" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M50 152 L150 152" stroke="#b8bec8" stroke-width="2" opacity=".7"/>
<!-- glühendes Werkstück -->
<rect x="56" y="143" width="44" height="8" rx="3" fill="url(#khot)" class="khot"/>
<ellipse cx="78" cy="146" rx="30" ry="10" fill="#ffb060" opacity=".25" class="khot"/>
<!-- Arm mit Hammer (animiert) -->
<g class="karm">
<path d="M150 126 Q164 108 150 92" fill="none" stroke="#1e1610" stroke-width="12" stroke-linecap="round"/>
<path d="M150 126 Q164 108 150 92" fill="none" stroke="url(#kskin)" stroke-width="8" stroke-linecap="round"/>
<rect x="146" y="40" width="7" height="58" rx="3" fill="#7a5230" stroke="#1e1610" stroke-width="2" transform="rotate(55 150 92)"/>
<rect x="132" y="30" width="34" height="18" rx="3" fill="#6a707c" stroke="#14161a" stroke-width="2.5" transform="rotate(55 150 92)"/>
<rect x="134" y="32" width="30" height="5" rx="2" fill="#b8bec8" opacity=".6" transform="rotate(55 150 92)"/>
</g>
<!-- Funken -->
<g class="ksparks"><circle cx="80" cy="138" r="2.2" fill="#ffe08a"/><circle cx="92" cy="134" r="1.6" fill="#ffb347"/><circle cx="70" cy="132" r="1.8" fill="#fff2a8"/><circle cx="100" cy="128" r="1.4" fill="#ffd27a"/><circle cx="62" cy="128" r="1.4" fill="#ffb347"/></g>
</svg>`;
  const kHit = () => setTimeout(() => { const el = document.querySelector('.rl-kobold'); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } }, 30);
  const GAMBLER_SVG = `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="gbg" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#c9a6ff" stop-opacity=".35"/><stop offset="1" stop-color="#c9a6ff" stop-opacity="0"/></radialGradient>
<linearGradient id="gskin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6a6f2"/><stop offset="1" stop-color="#7a64c8"/></linearGradient>
<linearGradient id="gfelt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8a5a"/><stop offset="1" stop-color="#1c5a3a"/></linearGradient>
<linearGradient id="gcup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a3a1c"/><stop offset=".5" stop-color="#a8642e"/><stop offset="1" stop-color="#6a3a1c"/></linearGradient>
<linearGradient id="gvest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c43a4a"/><stop offset="1" stop-color="#7a1e2a"/></linearGradient>
</defs>
<ellipse cx="100" cy="120" rx="100" ry="100" fill="url(#gbg)" class="gglow"/>
<!-- Körper -->
<path d="M66 132 Q100 112 134 132 L140 186 Q100 198 60 186 Z" fill="#f2ead8" stroke="#1e1610" stroke-width="2.5"/>
<path d="M66 132 Q80 124 92 122 L96 190 Q76 190 60 186 Z M134 132 Q120 124 108 122 L104 190 Q124 190 140 186 Z" fill="url(#gvest)" stroke="#1e1610" stroke-width="2"/>
<circle cx="100" cy="148" r="2.4" fill="#ffd23f"/><circle cx="100" cy="162" r="2.4" fill="#ffd23f"/>
<path d="M92 124 L100 134 L108 124 L100 128 Z" fill="#1e1610"/>
<!-- linker Arm mit Münze -->
<path d="M68 138 Q48 150 44 166" fill="none" stroke="#1e1610" stroke-width="11" stroke-linecap="round"/>
<path d="M68 138 Q48 150 44 166" fill="none" stroke="url(#gskin)" stroke-width="7" stroke-linecap="round"/>
<g class="gcoin"><circle cx="42" cy="160" r="7" fill="#ffd23f" stroke="#a87a10" stroke-width="2"/><text x="42" y="164" font-size="9" text-anchor="middle" fill="#a87a10" font-weight="900">$</text></g>
<!-- Kopf -->
<path d="M76 92 L46 74 L70 104 Z" fill="url(#gskin)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M124 92 L156 72 L130 104 Z" fill="url(#gskin)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M74 90 L56 80 L72 100 Z M126 90 L146 78 L128 100 Z" fill="#e8a0c0"/>
<circle cx="100" cy="100" r="27" fill="url(#gskin)" stroke="#1e1610" stroke-width="2.5"/>
<!-- Zylinder -->
<g class="ghat"><rect x="78" y="42" width="44" height="34" rx="3" fill="#1e1a2a" stroke="#0a0810" stroke-width="2"/><rect x="78" y="64" width="44" height="7" fill="#c43a4a"/><rect x="68" y="72" width="64" height="8" rx="4" fill="#1e1a2a" stroke="#0a0810" stroke-width="2"/>
<path d="M114 64 l6 -9 l3 9 z" fill="#ffd23f"/></g>
<!-- Augen: eins mit Monokel -->
<ellipse cx="90" cy="98" rx="5" ry="5.5" fill="#fff6a0" stroke="#1e1610" stroke-width="1.6"/><circle cx="89" cy="99" r="2.4" fill="#1e1610"/>
<ellipse cx="111" cy="97" rx="6" ry="6.5" fill="#fff6a0" stroke="#1e1610" stroke-width="1.6"/><circle cx="110" cy="98" r="2.8" fill="#1e1610"/>
<circle cx="111" cy="97" r="9" fill="rgba(200,240,255,.25)" stroke="#ffd23f" stroke-width="2"/><path d="M119 102 Q124 116 118 128" fill="none" stroke="#ffd23f" stroke-width="1"/>
<path d="M84 90 L94 92 M106 88 L117 87" stroke="#1e1610" stroke-width="2" stroke-linecap="round"/>
<path d="M98 102 Q95 110 100 111 Q104 110 102 103 Z" fill="#9a88e0" stroke="#1e1610" stroke-width="1.5"/>
<!-- Grinsen mit Goldzahn -->
<path d="M84 114 Q100 128 118 112 Q100 120 84 114 Z" fill="#2a1410" stroke="#1e1610" stroke-width="1.4"/>
<path d="M90 116 l2 4 l2 -3 z M108 116 l2 3 l2 -4 z" fill="#fff"/><rect x="98" y="117" width="4" height="4" rx="1" fill="#ffd23f"/>
<!-- rechter Arm mit Würfelbecher -->
<g class="gcupgrp">
<path d="M132 138 Q154 128 156 108" fill="none" stroke="#1e1610" stroke-width="11" stroke-linecap="round"/>
<path d="M132 138 Q154 128 156 108" fill="none" stroke="url(#gskin)" stroke-width="7" stroke-linecap="round"/>
<path d="M144 84 L170 84 L166 112 L148 112 Z" fill="url(#gcup)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<rect x="142" y="80" width="30" height="6" rx="3" fill="#8a4e24" stroke="#1e1610" stroke-width="2"/>
<path d="M150 92 L164 92 M150 100 L163 100" stroke="#e0a83a" stroke-width="1.6"/>
</g>
<!-- Spieltisch -->
<ellipse cx="100" cy="206" rx="96" ry="22" fill="url(#gfelt)" stroke="#0e2a1c" stroke-width="3"/>
<ellipse cx="100" cy="204" rx="84" ry="16" fill="none" stroke="#e0c070" stroke-width="1.2" stroke-dasharray="4 3" opacity=".7"/>
<g><ellipse cx="48" cy="204" rx="9" ry="3.5" fill="#a87a10"/><rect x="39" y="196" width="18" height="8" fill="#ffd23f" stroke="#a87a10" stroke-width="1.4"/><ellipse cx="48" cy="196" rx="9" ry="3.5" fill="#ffe27a" stroke="#a87a10" stroke-width="1.4"/>
<ellipse cx="62" cy="208" rx="8" ry="3" fill="#a87a10"/><ellipse cx="62" cy="205" rx="8" ry="3" fill="#ffe27a" stroke="#a87a10" stroke-width="1.2"/></g>
<g transform="rotate(-12 140 202)"><rect x="128" y="192" width="18" height="24" rx="2" fill="#fff" stroke="#1e1610" stroke-width="1.4"/><text x="137" y="208" font-size="10" text-anchor="middle" fill="#c43a4a" font-weight="900">♥</text></g>
<!-- Würfel -->
<g class="gdie d1"><rect x="-8" y="-8" width="16" height="16" rx="3.5" fill="#fff" stroke="#1e1610" stroke-width="1.8"/><circle cx="-3.5" cy="-3.5" r="1.7" fill="#c43a4a"/><circle cx="3.5" cy="3.5" r="1.7" fill="#c43a4a"/><circle cx="0" cy="0" r="1.7" fill="#c43a4a"/></g>
<g class="gdie d2"><rect x="-8" y="-8" width="16" height="16" rx="3.5" fill="#fff" stroke="#1e1610" stroke-width="1.8"/><circle cx="-3.5" cy="-3.5" r="1.7" fill="#1e1610"/><circle cx="3.5" cy="-3.5" r="1.7" fill="#1e1610"/><circle cx="-3.5" cy="3.5" r="1.7" fill="#1e1610"/><circle cx="3.5" cy="3.5" r="1.7" fill="#1e1610"/></g>
<g class="gspark"><path d="M30 60 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#ffe27a"/><path d="M170 150 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#c9a6ff"/></g>
</svg>`;
  function runenWrap() {
    if (!feature(S, 'runen')) return runenTab();
    return `${wallet(['dust'])}<div class="rl-subtabs"><button data-runeview="ausr" class="${runeView === 'ausr' ? 'on' : ''}">🛡️ Ausrüstung</button>${feature(S, 'schmiede') ? `<button data-runeview="schmied" class="${runeView === 'schmied' ? 'on' : ''}">⚒️ Schmied</button><button data-runeview="wandler" class="${runeView === 'wandler' ? 'on' : ''}">🎲 Wandler</button>` : `<button data-runeview="schmied" class="${runeView === 'schmied' ? 'on' : ''}">💥 Zerlegen</button>`}</div>`
      + (runeView === 'schmied' ? forgeView() : runeView === 'wandler' && feature(S, 'schmiede') ? wandlerView() : runenTab());
  }
  // Runenschmied: Stapel als Kacheln, sortierbar nach Art oder Stufe, mit Kobold am Amboss
  function forgeGroups() {
    const used = socketed(S), groups = {};
    for (const r of S.runes) { const k = r.t + ':' + r.tier; (groups[k] = groups[k] || { key: k, t: r.t, tier: r.tier, n: 0, free: 0 }).n++; if (!used.has(r.id)) groups[k].free++; }
    const ti = t => RUNES.findIndex(x => x.id === t);
    return Object.values(groups).sort(forgeSort === 'art' ? (a, b) => ti(a.t) - ti(b.t) || b.tier - a.tier : (a, b) => b.tier - a.tier || ti(a.t) - ti(b.t));
  }
  function forgeFiltered(all) { return forgeFilt === 'all' ? all : all.filter(g => (forgeSort === 'art' ? g.t === forgeFilt : String(g.tier) === forgeFilt)); }
  // Runenwandler beim Glücksspiel-Kobold
  function wandlerView() {
    const all = forgeGroups().filter(g => g.free > 0), list = forgeFiltered(all);
    const chips = forgeSort === 'art' ? [...new Set(all.map(g => g.t))].map(t => [t, RUNE[t].name, RUNE[t].color]) : [...new Set(all.map(g => g.tier))].sort((a, b) => a - b).map(n => [String(n), 'Stufe ' + ROMAN[n], '#c9a6ff']);
    wSel = wSel.filter(id => S.runes.some(r => r.id === id) && !socketed(S).has(id));
    const sel = wSel.map(id => S.runes.find(r => r.id === id));
    const inUse = k => wSel.filter(id => { const r = S.runes.find(x => x.id === id); return r && r.t + ':' + r.tier === k; }).length;
    const ok = sel.length === 2 && sel[0].tier === sel[1].tier;
    const slot = (r, i) => r ? `<button class="rl-wslot full" data-wrm="${i}" style="--rc:${RUNE[r.t].color}"><b>${ROMAN[r.tier]}</b><small>${RUNE[r.t].name}</small><span class="x">✕</span></button>` : '<div class="rl-wslot"><span>?</span></div>';
    let html = `<div class="rl-forge2"><div class="rl-fmain">
      <p class="note">Leg <b>2 Runen derselben Stufe</b> in den Kessel. Heraus kommt <b>1 zufällige Rune derselben Stufe</b>, aber nie eine der beiden Arten, die du hineingelegt hast. Eingesetzte Runen können nicht gewandelt werden.</p>
      <div class="rl-wmach">${slot(sel[0], 0)}<span class="plus">+</span>${slot(sel[1], 1)}<span class="plus">→</span>
        <div class="rl-wslot res ${wRes ? 'reveal' : ''}" ${wRes ? `style="--rc:${RUNE[wRes.t].color}"` : ''}>${wRes ? `<span class="roll">🎲</span><b>${ROMAN[wRes.tier]}</b><small>${RUNE[wRes.t].name}</small>` : '<span>🎲</span>'}</div></div>
      <div class="row" style="justify-content:center;margin:8px 0"><button class="btn" data-rl="wroll" ${ok && inCamp() ? '' : 'disabled'}>🎲 Würfeln!</button></div>
      ${sel.length === 2 && !ok ? '<p class="warn">Beide Runen müssen dieselbe Stufe haben.</p>' : ''}
      <div class="rl-fbar"><span class="note">Sortieren:</span><button data-fsort="art" class="${forgeSort === 'art' ? 'on' : ''}">nach Art</button><button data-fsort="stufe" class="${forgeSort === 'stufe' ? 'on' : ''}">nach Stufe</button></div>
      <div class="rl-fbar chips"><button data-ffilt="all" class="${forgeFilt === 'all' ? 'on' : ''}">Alle</button>${chips.map(([v, nm, c]) => `<button data-ffilt="${v}" class="${forgeFilt === v ? 'on' : ''}" style="--rc:${c}">${esc(nm)}</button>`).join('')}</div>
      <div class="rl-fgrid">${list.map(g => { const R = RUNE[g.t], left = g.free - inUse(g.key); return `<button class="rl-ftile ${left ? '' : 'used'}" data-wsel="${g.key}" style="--rc:${R.color}" ${left ? '' : 'disabled'}><b>${ROMAN[g.tier]}</b><small>${R.name}</small><span class="cnt">×${left}</span></button>`; }).join('') || '<p class="note">Keine freien Runen.</p>'}</div>
      </div><div class="rl-kobold gamble ${wRes ? 'hit' : ''}" aria-hidden="true">${GAMBLER_SVG}<p class="note" style="text-align:center;margin:4px 0 0">„Zwei rein, eine raus! Das Glück ist mit den Mutigen …“</p></div></div>`;
    return html;
  }
  function forgeView() {
    const all = forgeGroups(), list = forgeFiltered(all), ln = S.rlager || 0, lc = lagerCost(ln), canForge = feature(S, 'schmiede'), used = socketed(S);
    const chips = forgeSort === 'art' ? [...new Set(all.map(g => g.t))].map(t => [t, RUNE[t].name, RUNE[t].color]) : [...new Set(all.map(g => g.tier))].sort((a, b) => a - b).map(n => [String(n), 'Stufe ' + ROMAN[n], '#c9a6ff']);
    fSlots = fSlots.filter(id => S.runes.some(r => r.id === id) && !used.has(id));
    const sel = fSlots.map(id => S.runes.find(r => r.id === id)), g0 = sel[0];
    const inUse = k => sel.filter(r => r.t + ':' + r.tier === k).length;
    const mc = g0 ? mergeCost(g0.tier) : 0, canM = canForge && sel.length === 3 && g0.tier < 10 && S.dust >= mc;
    const killN = list.reduce((a, g) => a + g.free, 0), killS = list.reduce((a, g) => a + g.free * shardOf(g.tier), 0);
    const slot = (r, i) => r ? `<button class="rl-wslot full" data-frm="${i}" style="--rc:${RUNE[r.t].color}"><b>${ROMAN[r.tier]}</b><small>${RUNE[r.t].name}</small><span class="x">✕</span></button>` : '<div class="rl-wslot"><span>?</span></div>';
    let html = `<div class="rl-forge2"><div class="rl-fmain">
      <div class="rl-wallet"><span class="rl-cur dust">${dust}${S.dust} Runensplitter</span><span class="note">Lager ${S.runes.length}/${runeCap(S)}</span>
        <button class="btn small" data-rl="lager" ${ln < LAGER_MAX && S.dust >= lc && inCamp() ? '' : 'disabled'}>${ln >= LAGER_MAX ? 'Lager voll ausgebaut' : `Lager +5 (${dust}${lc})`}</button>
        ${canForge ? `<button class="btn ghost small" data-rl="buyrune" ${S.dust >= DUST_RUNE && S.runes.length < runeCap(S) ? '' : 'disabled'}>Zufällige Rune (${dust}${DUST_RUNE})</button>` : ''}</div>
      <p class="note">${canForge ? 'Tippe eine Rune an, um sie auf den Amboss zu legen (bis zu 3 gleiche). <b>3 gleiche</b> schmiedest du zu einer Rune der nächsten Stufe. Alles auf dem Amboss kannst du auch zerstören.' : 'Tippe Runen an, die du nicht brauchst (bis zu 3 gleiche), und zerstöre sie für Runensplitter. Schmieden und Wandeln kommen erst mit der 4. Wiedergeburt.'}</p>
      <div class="rl-wmach">${slot(sel[0], 0)}<span class="plus">+</span>${slot(sel[1], 1)}<span class="plus">+</span>${slot(sel[2], 2)}${canForge ? `<span class="plus">→</span>
        <div class="rl-wslot res ${fRes ? 'reveal' : ''}" ${fRes ? `style="--rc:${RUNE[fRes.t].color}"` : ''}>${fRes ? `<span class="roll">⚒️</span><b>${ROMAN[fRes.tier]}</b><small>${RUNE[fRes.t].name}</small>` : (g0 && canForge && g0.tier < 10 ? `<b style="opacity:.35">${ROMAN[g0.tier + 1]}</b><small style="opacity:.5">${RUNE[g0.t].name}</small>` : '<span>⚒️</span>')}</div>` : ''}</div>
      <div class="row" style="justify-content:center;margin:8px 0;flex-wrap:wrap">${canForge ? `<button class="btn" data-rl="fup" ${canM && inCamp() ? '' : 'disabled'}>⚒️ Schmieden${g0 ? ` (${dust}${mc})` : ''}</button>` : ''}
        <button class="btn ghost" data-rl="fdel" ${sel.length && inCamp() ? '' : 'disabled'}>💥 Zerstören${sel.length ? ` (+${dust}${sel.reduce((a, r) => a + shardOf(r.tier), 0)})` : ''}</button></div>
      <div class="rl-fbar"><span class="note">Sortieren:</span><button data-fsort="art" class="${forgeSort === 'art' ? 'on' : ''}">nach Art</button><button data-fsort="stufe" class="${forgeSort === 'stufe' ? 'on' : ''}">nach Stufe</button></div>
      <div class="rl-fbar chips"><button data-ffilt="all" class="${forgeFilt === 'all' ? 'on' : ''}">Alle</button>${chips.map(([v, nm, c]) => `<button data-ffilt="${v}" class="${forgeFilt === v ? 'on' : ''}" style="--rc:${c}">${esc(nm)}</button>`).join('')}</div>
      <div class="rl-fgrid">${list.map(g => { const R = RUNE[g.t], left = g.free - inUse(g.key); return `<button class="rl-ftile ${left ? '' : 'used'}" data-fpick="${g.key}" style="--rc:${R.color}" ${left ? '' : 'disabled'}><b>${ROMAN[g.tier]}</b><small>${R.name}</small><span class="cnt">×${left}</span>${g.n - g.free ? `<span class="lock" title="eingesetzt">⚑${g.n - g.free}</span>` : ''}</button>`; }).join('') || '<p class="note">Keine Runen. Bosse lassen Runen fallen.</p>'}</div>`;
    const lab = confirm === 'fall2' ? `Wirklich ${killN} Runen zerstören?` : confirm === 'fall' ? 'Sicher? Nochmal tippen' : `Alle ${forgeFilt === 'all' ? '' : 'gefilterten '}freien zerstören (${killN} Runen, +${killS} Splitter)`;
    html += `<div class="row" style="margin-top:10px"><button class="btn small ${confirm ? 'danger' : 'ghost'}" data-rl="fall" ${killN && inCamp() ? '' : 'disabled'}>💥 ${lab}</button></div>
      <p class="note">Eingesetzte Runen (⚑) werden nie zerstört.${canForge ? ' Schmieden kostet so viel, wie 3 zerstörte Runen dieser Stufe geben.' : ''}</p></div>
      ${canForge ? `<div class="rl-kobold ${fRes ? 'hit' : ''}" aria-hidden="true">${KOBOLD_SVG}</div>` : ''}</div>`;
    return html;
  }

  /* ---------- Wiedergeburt ---------- */
  function ruhmTab() {
    const gain = starsFor(S), req = reqOf(S);
    const tRb = acct && acct.tester ? `<div class="rl-test"><b>🧪 Test</b> <button class="btn small" data-rl="twf" ${inCamp() ? '' : 'disabled'}>Weltenfresser testen</button> <button class="btn small" data-rl="trebirth" ${inCamp() ? '' : 'disabled'}>Sofort wiedergeboren werden</button> <button class="btn small ${confirm === 'unrb' ? 'danger' : 'ghost'}" data-rl="tunrb" ${inCamp() && S.rebirths > 0 ? '' : 'disabled'}>${confirm === 'unrb' ? 'Wirklich eine zurück?' : '↩ Eine Wiedergeburt zurück'}</button><span class="note">Sofort: ohne Voraussetzung. Sterne gibt es für deinen Rekord, mindestens aber so viele wie beim Erreichen der Voraussetzung. Zurück: Sternen-Laden wird zurückgesetzt, die Sterne dieser Wiedergeburt gehen verloren, Freischaltungen dieser Stufe auch.</span></div>` : '';
    if (S.rebirths >= 9) return tRb + ascSection(true) + shopHint('Sternen-Laden');
    let html = `<div class="rl-rebirth"><div><h3>Wiedergeburt ${S.rebirths + 1}</h3>
      <p class="note">Setzt Gold, Seelen, alle Fertigkeiten und deinen Rekord auf null. Dafür bekommst du Sterne für dauerhafte Verbesserungen, neue Stufen und neue Inhalte. Runen und Sterne bleiben.</p>
      <p>Voraussetzung: <b>Stufe ${req}</b> · dein Rekord: <b>${S.best}</b> → ${gain ? `<b class="rl-cur star">${star}${gain} Sterne</b>` : 'noch nicht erreicht'}</p></div>
      <button class="btn ${confirm === 'rebirth' ? 'danger' : ''}" data-rl="rebirth" ${gain && inCamp() ? '' : 'disabled'}>${confirm === 'rebirth' ? 'Wirklich zurücksetzen?' : 'Wiedergeboren werden'}</button></div>`;
    html += tRb;
    html += `<div class="rl-road">${ROADMAP.map(x => `<div class="rl-step ${S.rebirths >= x.r ? 'done' : S.rebirths + 1 === x.r ? 'next' : ''}"><span>${x.r}</span><div><b>${x.text}</b><small>Stufen bis ${CAPS[Math.min(x.r, CAPS.length - 1)]} · +1 Schlüsselsockel</small></div></div>`).join('')}</div>`;
    html += ascSection();
    html += shopHint('Sternen-Laden');
    return html;
  }
  const shopHint = name => `<div class="rl-gohint"><span>Den <b>${name}</b> findest du jetzt im Reiter Läden.</span><button class="btn small rl-gotree" data-tab="laeden">Zu den Läden</button></div>`;
  function starShop() { return `<h3 class="rl-h3">Sternen-Laden</h3><p class="note">Du hast <span class="rl-cur star">${star}${S.stars}</span> Sterne.</p><div class="rl-perks">${perkCards()}`; }
  function perkCards() {
    return PERKS.map(p => {
      const r = perk(S, p.id), maxed = r >= p.max, c = perkCost(S, p);
      return `<div class="rl-perk ${r ? 'has' : ''}"><b>${esc(p.name)}</b><span class="note">${p.max > 99 ? `Stufe ${r}` : `${r} / ${p.max}`}</span><p class="note">${esc(p.desc)}</p>
        <div class="row"><button class="btn small" data-perk="${p.id}" ${maxed || S.stars < c ? 'disabled' : ''}>${maxed ? 'Voll' : `${c} ${c === 1 ? 'Stern' : 'Sterne'}`}</button>${acct && acct.tester ? `<button class="btn ghost small" data-tmenu="p:${p.id}">🧪</button>` : ''}</div></div>`;
    }).join('') + '</div>';
  }
  function panel() {
    const p = $('#rlPanel');
    let html = notice ? `<p class="warn">${esc(notice)}</p>` : '';
    if (HERO[tab]) html += campInfo() + heroTab(tab);
    else if (tab === 'runen') html += campInfo() + runenWrap();
    else if (tab === 'begleiter') html += campInfo() + compTab();
    else if (tab === 'halle') html += halleTab();
    else if (tab === 'zeit' || tab === 'laeden') html += ladenTab();
    else if (tab === 'exp') html += campInfo() + expTab();
    else if (tab === 'ahnen') html += campInfo() + ahnTab();
    else if (tab === 'ruhm') html += ruhmTab();
    else html += standHTML();
    const openDet = p.querySelector('details[open]');
    p.innerHTML = html;
    if (openDet && p.querySelector('details')) p.querySelector('details').open = true;
  }
  function standHTML() {
    const code = encode(S);
    if (durableInfo === null) { durableInfo = 'pending'; api('status', {}).then(r => { durableInfo = r.error && r.durable === undefined ? 'pending' : r.durable; if (tab === 'stand' && !typing()) panel(); }); }
    let html = `<div class="rl-save">${durableInfo === false ? '<p class="warn">Der Server ist noch nicht für dauerhaftes Speichern eingerichtet. Spielstände gehen verloren, wenn er neu startet. Wer die Seite betreibt, findet die Anleitung in der README.</p>' : ''}`;
    if (acct) {
      html += `<h3>Angemeldet als ${esc(acct.name)}</h3>
        <p class="note">Dein Fortschritt wird automatisch gespeichert. Auf einem anderen Gerät meldest du dich einfach mit Name und Passwort an.</p>
        <p class="note">${esc(cloudMsg || (acct.updated ? `Zuletzt gespeichert um ${timeStr(acct.updated)}` : ''))}</p>
        <div class="row"><button class="btn small" data-rl="cloudsave">Jetzt speichern</button><button class="btn ghost small" data-rl="logout">Abmelden</button></div>
        <h3>Passwort ändern</h3>
        <form class="rl-form" id="rlPwForm"><input id="rlNewPw" type="password" placeholder="Neues Passwort" autocomplete="new-password"><button class="btn small">Ändern</button></form>`;
      if (acct.tester) html += `<div class="rl-test"><h3>🧪 Test-Werkzeuge</h3><p class="note">Nur für Test-Spielstände sichtbar. Zahlen auch wie 1e9 oder 5000000.</p>
        <div class="numrow"><input id="rlTGold" inputmode="decimal" placeholder="Gold, z. B. 1e9" autocomplete="off"><button class="btn small" data-rl="tgold">Gold setzen</button></div>
        <div class="numrow"><input id="rlTSouls" inputmode="decimal" placeholder="Seelen, z. B. 500" autocomplete="off"><button class="btn small" data-rl="tsouls">Seelen setzen</button></div>
        <div class="row"><button class="btn small" data-rl="trunepick">Rune auswählen …</button><button class="btn ghost small" data-rl="trunes">3 zufällige Runen ins Lager</button></div></div>`;
    } else {
      html += `<h3>Spielstand speichern</h3>
        <p class="note">Wähle einen Namen und ein Passwort. Damit lädst du deine Helden auf jedem Gerät, und sie werden ab dann automatisch gespeichert.</p>
        <form class="rl-form" id="rlCreate"><input id="rlCName" placeholder="Name, z. B. Ritter Kunibert" maxlength="20" autocomplete="username">
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
      <h3>Neu anfangen</h3><button class="btn ${confirm === 'reset' ? 'danger' : 'ghost'} small" data-rl="reset">${confirm === 'reset' ? 'Wirklich alles löschen? Tippen zum Bestätigen' : 'Spielstand komplett löschen'}</button></div>`;
    return html;
  }
  function adopt(data) {
    S = migrate(data); delete S.reset; run = null;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    refresh();
  }
  function toast(m, big) { const t = $('#toast'); t.textContent = m; t.className = 'toast' + (big ? ' gold' : ''); t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), big ? 3600 : 3200); }
  function ask(key, redraw) { if (confirm === key) { confirm = ''; return true; } confirm = key; redraw(); setTimeout(() => { if (confirm === key) { confirm = ''; redraw(); } }, 4000); return false; }
  function afterChange() { save(); refresh(); }
  function onClick(e) {
    if (ahnClick(e)) return;
    const g = e.target.closest('[data-node]');
    if (g) { sel[tab] = g.dataset.node; panel(); return; }
    const tm = e.target.closest('[data-tmenu]');
    if (tm) { if (acct && acct.tester) testMenu(tm.dataset.tmenu); return; }
    const rf = e.target.closest('[data-rforge]');
    if (rf) {
      const [op, t, tierS] = rf.dataset.rforge.split(':'), tier = Number(tierS), used = socketed(S);
      if (op === 'd') { const r = S.runes.find(x => x.t === t && x.tier === tier && !used.has(x.id)); if (r) { const d = dismantle(S, r); SND.play('crit'); toast(`${RUNE[t].name} ${ROMAN[tier]} zerstört: +${d} Runensplitter`); afterChange(); } }
      else { const r = S.runes.find(x => x.t === t && x.tier === tier); const nr = r && merge(S, r); if (nr) { SND.play('forge'); toast(`${RUNE[nr.t].name} ${ROMAN[nr.tier]} geschmiedet!`, true); achCheck(); afterChange(); } }
      return;
    }
    const lu = e.target.closest('[data-lineup]');
    if (lu) {
      if (!inCamp()) { toast('Die Aufstellung änderst du im Lager.'); return; }
      const r = toggleField(S, lu.dataset.lineup);
      if (r === 'full') toast('Alle Plätze sind belegt. Nimm zuerst jemanden raus.');
      else if (r === 'last') toast('Mindestens ein Held muss kämpfen.');
      else if (r === 'trip') toast('Dieser Held ist gerade auf Reise.');
      afterChange(); return;
    }
    const tb = e.target.closest('.rl-hero[data-tab], .rl-gotree[data-tab]');
    if (tb) { tab = tb.dataset.tab; confirm = ''; wRes = null; fRes = null; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const sk = e.target.closest('[data-sock]');
    if (sk) {
      const [hid, i] = sk.dataset.sock.split(':'); const slot = Number(i);
      if (runeSel) { const rr0 = runeById(S, runeSel); if (socket(S, hid, slot, runeSel)) { runeSel = null; afterChange(); } else toast(slot - 3 >= extraSocks(S) ? 'Dieser Sockel ist noch gesperrt.' : `In diesen Zusatz-Sockel passen nur Runen bis Stufe ${ROMAN[XSOCK[slot - 3].max]}${rr0 ? ` (deine ist ${ROMAN[rr0.tier]})` : ''}.`); }
      else if (S.sockets[hid][slot]) { unsocket(S, hid, slot); afterChange(); toast('Rune herausgenommen'); }
      return;
    }
    const rb = e.target.closest('[data-rune]');
    if (rb) { const id = Number(rb.dataset.rune); runeSel = runeSel === id ? null : id; panel(); return; }
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.cperk) { if (buyCperk(S, CPERKS.find(p => p.id === b.dataset.cperk))) afterChange(); return; }
    if (b.dataset.complvl) { if (levelComp(S, b.dataset.complvl)) { achCheck(); afterChange(); } return; }
    if (b.dataset.compon) { toggleComp(S, b.dataset.compon); afterChange(); return; }
    if (b.dataset.board) { boardKey = b.dataset.board; panel(); return; }
    if (b.dataset.shoptab) { shopSel = b.dataset.shoptab; try { localStorage.setItem('fsg.ritter.shop', shopSel); } catch {} SND.play('tick'); panel(); return; }
    if (b.dataset.runeview) { wRes = null; fRes = null; fSlots = []; runeView = b.dataset.runeview; confirm = ''; SND.play('tick'); panel(); return; }
    if (b.dataset.fsort) { fRes = null; wRes = null; forgeSort = b.dataset.fsort; forgeFilt = 'all'; confirm = ''; panel(); return; }
    if (b.dataset.ffilt) { fRes = null; wRes = null; forgeFilt = b.dataset.ffilt; confirm = ''; panel(); return; }
    if (b.dataset.wsel) { const [t, tier] = b.dataset.wsel.split(':'), used = socketed(S); const r = S.runes.find(x => x.t === t && x.tier === Number(tier) && !used.has(x.id) && !wSel.includes(x.id)); if (r) { wRes = null; if (wSel.length >= 2) wSel = []; if (wSel.length === 1) { const a = S.runes.find(x => x.id === wSel[0]); if (!a || a.tier !== r.tier) wSel = []; } wSel.push(r.id); SND.play('tick'); } panel(); return; }
    if (b.dataset.wrm) { wSel.splice(Number(b.dataset.wrm), 1); wRes = null; panel(); return; }
    if (b.dataset.fpick) { const [t, tier] = b.dataset.fpick.split(':'), used = socketed(S); fRes = null;
      const cur = fSlots.map(id => S.runes.find(r => r.id === id)).filter(Boolean); if (cur.length && (cur[0].t !== t || cur[0].tier !== Number(tier))) fSlots = [];
      const free = S.runes.filter(x => x.t === t && x.tier === Number(tier) && !used.has(x.id) && !fSlots.includes(x.id));
      if (!fSlots.length) fSlots = free.slice(0, 3).map(r => r.id); else if (fSlots.length < 3 && free.length) fSlots.push(free[0].id);
      SND.play('tick'); panel(); return; }
    if (b.dataset.frm) { fSlots.splice(Number(b.dataset.frm), 1); fRes = null; panel(); return; }
    if (b.dataset.fsel) { forgeSel = forgeSel === b.dataset.fsel ? null : b.dataset.fsel; confirm = ''; SND.play('tick'); panel(); return; }
    if (b.dataset.shopjump) { const el = document.getElementById('shop-' + b.dataset.shopjump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (b.dataset.xinfo) { const id = b.dataset.xinfo; if (expInfo.has(id)) expInfo.delete(id); else expInfo.add(id); panel(); return; }
    if (b.dataset.target) { S.exp.target = b.dataset.target; save(); panel(); return; }
    if (b.dataset.piece) { const [hid, i] = b.dataset.piece.split(':'); testerSplinters(); if (buyPiece(S, hid, Number(i))) { const h = HERO_BY_ID[hid]; if (assembled(S, hid)) heroDone(hid); else toast(`Puzzleteil ${pieceCount(S, hid)}/6 für ${h.name}`); afterChange(); } return; }
    if (b.dataset.tempo) { if (buyTempo(S)) { toast(`Tempo ×${String(maxSpeed(S)).replace('.', ',')} freigeschaltet!`, true); afterChange(); } return; }
    if (b.dataset.pathmode) { pathMode = b.dataset.pathmode; panel(); return; }
    if (b.dataset.skin) { const [hid, id] = b.dataset.skin.split(':'); if (SKIN[id] && mastLevel(S, hid) >= SKIN[id].L) { S.skin = S.skin || {}; if (id === 'std') delete S.skin[hid]; else S.skin[hid] = id; SND.play('tick'); save(); panel(); } return; }
    if (b.dataset.perk) { if (buyPerk(S, PERKS.find(p => p.id === b.dataset.perk))) afterChange(); return; }
    const a = b.dataset.rl;
    if (a && ahnAction(a, b)) return;
    if (a === 'start') startRun();
    else if (a === 'weekly') startRun('weekly');
    else if (a === 'mission') { S.exp.mission = b.dataset.m2; startRun('exp'); $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (a === 'gosave') { tab = 'stand'; renderTabs(); panel(); }
    else if (a === 'ascend') { if (ask('ascend', panel)) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); ascend(S); run = null; achCheck(); afterChange(); SND.play('rebirth'); playCine('asc', team); } }
    else if (a === 'tower') startRun('tower');
    else if (a === 'area') showAreas();
    else if (a === 'board') { if (inCamp()) showBoard(); }
    else if (a === 'twf') { if (acct && acct.tester && inCamp()) { startRun(); if (run) { run.stage = WF_STAGE; spawnWave(run); $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' }); } } }
    else if (a === 'troop') { S.uiTroop = !S.uiTroop; save(); heroes(); action(); }
    else if (a === 'giveup') { if (ask('giveup', action)) { run.dead = true; if (run.mode === 'wboss') endRun(); else { S.runs++; save(); cloudSave(true); refresh(); } } }
    else if (a === 'tgold' || a === 'tsouls') { if (acct && acct.tester) { const el = $(a === 'tgold' ? '#rlTGold' : '#rlTSouls'); let t = String(el.value).replace(/\s/g, '');
        if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
        const v = Number(t);
        if (!(v >= 0) || !isFinite(v)) { toast('Bitte eine Zahl eingeben.'); return; }
        if (a === 'tgold') S.gold = Math.min(1e18, Math.floor(v)); else S.souls = Math.min(1e15, Math.floor(v));
        toast(a === 'tgold' ? `Gold: ${fmt(S.gold)}` : `Seelen: ${fmt(S.souls)}`); afterChange(); } }
    else if (a === 'trunepick') { if (acct && acct.tester) testRunePicker(); }
    else if (a === 'trunes') { if (acct && acct.tester) { const got = []; for (let i = 0; i < 3; i++) { const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, 1 + Math.floor(Math.random() * 3)); if (r) got.push(`${RUNE[r.t].name} ${ROMAN[r.tier]}`); }
        SND.play('rune'); toast(got.length ? `Neue Runen: ${got.join(', ')}` : 'Lager voll, als Splitter gutgeschrieben.'); afterChange(); } }
    else if (a === 'pres') { if (inCamp() && ask('pres', panel)) { const n = resetPerks(S); SND.play('buy'); toast(`Sternen-Laden zurückgesetzt: +${n} Sterne`, true); afterChange(); } }
    else if (a === 'wroll') { if (inCamp() && wSel.length === 2) { const nr = transmute(S, wSel[0], wSel[1]); if (nr) { wSel = []; wRes = nr; SND.play('soul'); setTimeout(() => SND.play('rune'), 900); setTimeout(() => toast(`Gewürfelt: ${RUNE[nr.t].name} ${ROMAN[nr.tier]}!`, true), 950); afterChange(); } } }
    else if (a === 'fup') { const r = fSlots.length === 3 && S.runes.find(x => x.id === fSlots[0]); const nr = r && merge(S, r); if (nr) { fSlots = []; fRes = nr; SND.play('forge'); kHit(); setTimeout(() => toast(`${RUNE[nr.t].name} ${ROMAN[nr.tier]} geschmiedet!`, true), 700); achCheck(); afterChange(); } }
    else if (a === 'fdel') { if (!inCamp()) return; const used = socketed(S); let d = 0, n = 0; for (const id of fSlots) { const r = S.runes.find(x => x.id === id); if (r && !used.has(r.id)) { d += dismantle(S, r); n++; } } fSlots = []; fRes = null; if (n) { SND.play('crit'); kHit(); toast(`${n} Rune${n > 1 ? 'n' : ''} zerstört: +${d} Runensplitter`); afterChange(); } }
    else if (a === 'fall') { if (!inCamp()) return;
      if (confirm === 'fall2') { confirm = ''; const used = socketed(S), keys = new Set(forgeFiltered(forgeGroups()).map(g => g.key)); let n = 0, d = 0;
        for (const r of [...S.runes]) if (keys.has(r.t + ':' + r.tier) && !used.has(r.id)) { d += dismantle(S, r); n++; }
        forgeSel = null; SND.play('forge'); kHit(); toast(`${n} Runen zerstört: +${d} Runensplitter`, true); afterChange(); }
      else { confirm = confirm === 'fall' ? 'fall2' : 'fall'; panel(); const c0 = confirm; setTimeout(() => { if (confirm === c0) { confirm = ''; panel(); } }, 5000); } }
    else if (a === 'tunrb') { if (acct && acct.tester && inCamp() && ask('unrb', panel)) { const r = unrebirth(S); if (r) { run = null; SND.play('tick'); toast(`Zurück auf Wiedergeburt ${S.rebirths}: −${r.lost} Sterne, Sternen-Laden zurückgesetzt (+${r.back})`, true); afterChange(); } } }
    else if (a === 'tkeep') { if (acct && acct.tester) { S.tKeepTree = !S.tKeepTree; save(); toast(S.tKeepTree ? 'Bäume bleiben bei Wiedergeburt' : 'Bäume werden bei Wiedergeburt wieder zurückgesetzt', true); panel(); } }
    else if (a === 'tbuild') { if (acct && acct.tester && inCamp() && HERO[tab] && classOpen(S, tab) && ask('tbuild', panel)) { testBuild(tab); achCheck(); afterChange(); SND.play('forge'); toast(`${HERO[tab].name}: Baum ausgebaut`, true); } }
    else if (a === 'trebirth') { if (acct && acct.tester && inCamp()) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); const g = rebirth(S, true); run = null; achCheck(); afterChange(); SND.play('rebirth'); toast(`Test-Wiedergeburt: +${g} Sterne`, true); playCine('rebirth', team); } }
    else if (a === 'lager') { if (inCamp() && buyLager(S)) { SND.play('forge'); toast(`Runen-Lager erweitert: jetzt ${runeCap(S)} Plätze`); afterChange(); } }
    else if (a === 'altar') { if (inCamp() && buyAltar(S)) { SND.play('soul'); toast(`Seelenaltar Stufe ${S.altar}: Seelen ×${altarMul(S).toFixed(2).replace('.', ',')}`, true); afterChange(); } }
    else if (a === 'sockadd') { if (inCamp() && addSock(S, tab)) { toast('Sockel gesetzt.'); afterChange(); } }
    else if (a === 'sockdel') { if (inCamp()) { const r = removeSock(S, tab); if (r === 'used') toast('Alle Sockel sind belegt. Nimm zuerst eine Schlüssel-Fertigkeit ab.'); else if (r === 'ok') { toast('Sockel abgenommen. Du kannst ihn jetzt woanders setzen.'); afterChange(); } } }
    else if (a === 'unkey') { if (inCamp() && ask('unkey', panel)) { const n = NODE[sel[tab]], c = removeKey(S, n); if (c) { toast(`${n.name} abgenommen. Gold und Seelen sind zurück.`); afterChange(); } } }
    else if (a === 'buy') { if (inCamp() && buy(S, NODE[sel[tab]])) { SND.play('buy'); achCheck(); afterChange(); } }
    else if (a === 'equip') { if (inCamp()) { toggleEquip(S, sel[tab]); afterChange(); } }
    else if (a === 'rebirth') { if (ask('rebirth', panel)) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); rebirth(S); run = null; achCheck(); afterChange(); SND.play('rebirth'); playCine('rebirth', team); } }
    else if (a === 'merge') { const r = S.runes.find(x => x.id === runeSel); const nr = r && merge(S, r); if (nr) { runeSel = nr.id; toast(`${RUNE[nr.t].name} ${ROMAN[nr.tier]} geschmiedet`); afterChange(); } }
    else if (a === 'dismantle') { const r = S.runes.find(x => x.id === runeSel); if (r) { const d = dismantle(S, r); runeSel = null; toast(`+${d} Runensplitter`); afterChange(); } }
    else if (a === 'buyrune') { const r = buyRune(S); if (r) { runeSel = r.id; toast(`Neue Rune: ${RUNE[r.t].name} I`); afterChange(); } }
    else if (a === 'cloudsave') { cloudMsg = 'Wird gespeichert …'; panel(); cloudSave(true); }
    else if (a === 'logout') {
      if (run && !run.dead) { toast('Beende zuerst den laufenden Feldzug.'); return; }
      if (conflict) { resolveConflict(conflict); return; }
      cloudSave(true).then(r => {
        if (conflict || (r && r.conflict)) return; // erst den Konflikt entscheiden
        if (r && r.error && !/anmelden/.test(r.error)) { toast(`Abmelden abgebrochen: ${r.error} Dein Fortschritt wäre sonst verloren.`, true); panel(); return; }
        conflict = null; setAcct(null); cloudMsg = '';
        // Der Spielstand gehört zum Konto: auf diesem Gerät neu beginnen, damit kein anderes Konto ihn übernehmen kann
        adopt(fresh()); S.seenIntro = true; S.season = SEASON; run = null; save(); refresh();
        toast('Abgemeldet. Dein Spielstand ist sicher auf dem Server.');
      });
    }
    else if (a === 'copy') {
      const code = $('#rlCode').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('Code kopiert'), () => {
        const r = document.createRange(); r.selectNodeContents($('#rlCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Code markiert – jetzt kopieren');
      });
    } else if (a === 'load') {
      const s = decode($('#rlIn').value);
      if (!s) { toast('Dieser Code stimmt nicht. Prüfe jedes Zeichen.'); return; }
      if (s.tst && !(acct && acct.tester)) { toast('Dieser Code stammt von einem Test-Spielstand und gilt nur für Tester.'); return; }
      if ((s.season || 0) < SEASON && !(acct && acct.tester)) { toast(`Dieser Code ist von vor Version ${GAME_VERSION} und gilt nicht mehr.`); return; }
      s.speed = Math.min(S.speed, maxSpeed(s)); adopt(s); save(); toast('Spielstand geladen');
    } else if (a === 'reset') { if (ask('reset', panel)) { adopt(fresh()); save(); toast('Neuer Spielstand'); } }
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
        setAcct({ name: r.name, token: r.token, updated: r.updated, tester: !!r.tester }); cloudMsg = `Gespeichert um ${timeStr(r.updated)}`; cloudDirty = false;
        if (r.reset) { adopt(fresh()); S.seenIntro = true; S.season = SEASON; run = null; save(); refresh(); toast(`Spielstand „${r.name}“ angelegt. Fortschritt aus einem Test-Spielstand wird nicht übernommen.`, true); }
        else toast(`Spielstand „${r.name}“ angelegt`);
        panel();
      } else if (f.id === 'rlLogin') {
        const r = await api('login', { name: val('#rlLName'), pass: $('#rlLPw').value });
        if (r.error) { toast(r.error); return; }
        setAcct({ name: r.name, token: r.token, updated: r.updated, tester: !!r.tester });
        const fresh1 = !!(r.data && r.data.season && !r.data.v), old = !fresh1 && (!r.data || !r.data.v || r.data.v < 2);
        adopt(r.data || {}); if (r.tester) S.tst = 1; cloudDirty = true;
        cloudMsg = `Geladen – zuletzt gespeichert um ${timeStr(r.updated)}`;
        toast(fresh1 ? `Angemeldet. Mit Version ${GAME_VERSION} beginnt dein Abenteuer neu.` : old ? 'Angemeldet. Dein Spielstand stammte aus der allerersten Version und wurde zurückgesetzt.' : `Willkommen zurück, ${r.name}!`); panel();
      } else if (f.id === 'rlPwForm') {
        const r = await api('password', { name: acct.name, token: acct.token, pass: $('#rlNewPw').value });
        if (r.error) { toast(r.error); return; }
        acct.token = r.token; setAcct(acct); toast('Passwort geändert'); panel();
      }
    } finally { btn.disabled = false; }
  }

  function mastHTML(h) {
    const mi = mastInfo((S.mast || {})[h.id]), cur = (S.skin || {})[h.id] || 'std', pct = mi.L >= MAST_MAX ? 100 : Math.floor(mi.rest / mi.need * 100);
    return `<div class="rl-mast" style="--hc:${h.color}"><div class="rl-mrow"><b>★ Meisterschaft ${mi.L}/${MAST_MAX}</b><span class="rl-mbar"><i style="width:${pct}%"></i></span><small>${mi.L >= MAST_MAX ? 'Gemeistert' : `${fmt(mi.rest)} / ${fmt(mi.need)} EP`} · +${2 * mi.L} % Schaden und Leben</small></div>
      <div class="rl-skins">${SKINS.map(k => { const ok = mi.L >= k.L; return `<button class="rl-skin ${cur === k.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-skin="${h.id}:${k.id}" ${ok ? '' : 'disabled'} style="--sc:${k.tint || h.color}"><i></i>${esc(k.name)}${ok ? '' : `<small>ab Stufe ${k.L}</small>`}</button>`; }).join('')}</div>
      <p class="note">Meisterschaft sammelt jeder Held mit jedem besiegten Gegner, solange er kämpft. Sie bleibt für immer, auch über Wiedergeburt und Aufstieg.</p></div>`;
  }
  /* ---------- Aufstiegsränge ---------- */
  const rankBadge = a => { const r = rankOf(a); return `<i class="rl-rkb" style="--rc:${r.col}" title="${esc(r.name)}">${a >= 10 ? '♛' : a >= 8 ? '♚' : a >= 4 ? '⚜' : a >= 1 ? '⚔' : '·'}</i>`; };
  function rankLadder() {
    const a = S.asc || 0, nx = rankOf(a + 1);
    const steps = Array.from({ length: Math.max(11, a + 2) }, (_, i) => i).slice(Math.max(0, a - 5), Math.max(11, a + 2));
    return `<div class="rl-ranks"><div class="rl-rkhead">${rankBadge(a)}<div><b style="color:${rankOf(a).col}">${esc(rankOf(a).name)}</b><small>Dein Rang${S.wf ? ` · <span class="rl-wfk">Weltenbezwinger${S.wf > 1 ? ` ×${S.wf}` : ''}</span>` : ''}</small></div></div>
      <div class="rl-rksteps">${steps.map(i => `<span class="${i < a ? 'done' : i === a ? 'cur' : ''}" style="--rc:${rankOf(i).col}" title="Aufstieg ${i}">${esc(rankOf(i).name)}</span>`).join('')}</div>
      <p class="note">Nächster Rang mit Aufstieg ${a + 1}: <b>${esc(nx.name)}</b> · Rang-Geschenk <span class="rl-cur crown">${crown}${rankBonus(a + 1)}</span> Kronen</p></div>`;
  }
  /* ---------- Aufstieg ---------- */
  function ascSection(main) {
    const k = crownsFor(S), can = S.rebirths >= ASC_REQ_REBIRTHS;
    let html = `<div class="rl-asc"><div><h3>${S.asc ? `Aufstieg ${S.asc + 1}` : 'Aufstieg'}</h3>
      <p class="note">Die zweite Prestige-Ebene. Setzt auch Wiedergeburten, Sterne und den Sternen-Laden zurück – dafür bekommst du Kronen für mächtige Königs-Boni. Auch der Turm-Rekord und sein Bonus fangen von vorne an. Runen, Erfolge, Begleiter und Ahnensiegel bleiben. Gegner werden mit jedem Aufstieg stärker.</p>
      ${rankLadder()}
      <p>Voraussetzung: <b>9. Wiedergeburt</b> und <b>Stufe ${ASC_REQ_STAGE}</b> · ${k ? `jetzt: <b class="rl-cur crown">${crown}${k} Kronen</b> (Grundwert ${ascBase(S)}${(S.asc || 0) < 2 ? ' beim ' + ((S.asc || 0) + 1) + '. Aufstieg' : ''}, dazu 1 je 4 Stufen über 150)` : can ? `dein Rekord: ${S.best}` : `du bist bei Wiedergeburt ${S.rebirths}`}</p></div>
      <button class="btn ${confirm === 'ascend' ? 'danger' : 'gold'}" data-rl="ascend" ${k && inCamp() ? '' : 'disabled'}>${confirm === 'ascend' ? 'Wirklich aufsteigen?' : 'Aufsteigen'}</button></div>`;
    if (main || S.asc) html += `<div class="rl-road">${ASC_ROAD.map(x => `<div class="rl-step crown ${S.asc >= x.a ? 'done' : S.asc + 1 === x.a ? 'next' : ''}"><span>${x.a}</span><div><b>${x.text}</b><small>Gegner ×${Math.pow(1.6, x.a).toFixed(1).replace('.', ',')} stärker</small></div></div>`).join('')}</div>`;
    if (S.asc || S.crowns) html += `<div class="rl-gohint"><span>Den <b>Kronen-Laden</b> findest du jetzt im Reiter Läden.</span><button class="btn small gold rl-gotree" data-tab="laeden">Zu den Läden</button></div>`;
    return html;
  }

  function crownShop() {
    return `<h3 class="rl-h3">Kronen-Laden</h3><p class="note">Du hast <span class="rl-cur crown">${crown}${S.crowns}</span> Kronen. Kronen-Boni bleiben für immer.</p><div class="rl-perks">${CPERKS.map(p => {
      const r = cperk(S, p.id), maxed = r >= p.max, c = cperkCost(S, p);
      const hot = p.id === 'k_veteran' && !r;
      return `<div class="rl-perk crown ${r ? 'has' : ''} ${hot ? 'hot' : ''}">${hot ? '<span class="rl-reddot" title="Wichtig: ohne Veteranen musst du nach jedem Aufstieg alle Helden neu anheuern"></span>' : ''}<b>${esc(p.name)}</b><span class="note">${p.max > 99 ? `Stufe ${r}` : `${r} / ${p.max}`}</span><p class="note">${esc(p.desc)}</p>
        <div class="row"><button class="btn small gold" data-cperk="${p.id}" ${maxed || S.crowns < c ? 'disabled' : ''}>${maxed ? 'Voll' : `${c} ${c === 1 ? 'Krone' : 'Kronen'}`}</button>${acct && acct.tester ? `<button class="btn ghost small" data-tmenu="c:${p.id}">🧪</button>` : ''}</div></div>`;
    }).join('')}</div>`;
  }
  /* ---------- Begleiter ---------- */
  function compTab() {
    let html = `${wallet(['souls'])}<p class="note">Begleiter kämpfen an deiner Seite und bleiben für immer – auch bei Wiedergeburt und Aufstieg. Verbessern kostest Seelen. Aktive Begleiter: ${S.compActive.length}/${compSlots(S)}.</p><div class="rl-comps">`;
    html += COMPS.map(c => {
      const l = S.comps[c.id] || 0, on = S.compActive.includes(c.id), cost = compCost(l), max = compMax(S);
      if (!l) return `<div class="rl-comp locked" style="--cc:${c.color}"><span class="cic">?</span><div><b>${c.name}</b><p class="note">Kommt mit dem ${c.asc}. Aufstieg.</p></div></div>`;
      return `<div class="rl-comp ${on ? 'on' : ''}" style="--cc:${c.color}"><span class="cic">${compPic(c.id) ? `<img src="${compPic(c.id)}" alt="">` : { drache: '♆', eule: '◉', golem: '▣', phoenix: '❂' }[c.id]}</span><div><b>${c.name}</b> <span class="note">Stufe ${l} / ${max}</span><p class="note">${c.desc(l)}</p>
        <div class="row"><button class="btn small" data-complvl="${c.id}" ${l >= max || S.souls < cost ? 'disabled' : ''}>${l >= max ? 'Maximal' : `Verbessern ${soul}${cost}`}</button>
        <button class="btn ghost small" data-compon="${c.id}">${on ? 'Ablegen' : 'Mitnehmen'}</button></div></div></div>`;
    }).join('');
    return html + '</div>';
  }

  /* ---------- Ruhmeshalle: Woche, Erfolge, Bestenliste ---------- */
  let boardKey = 'stage', boardData = null, boardAt = 0, pathMode = 'ever';
  // Heldenpfad: alle gespeicherten Spielstände als Fähnchen auf dem Weg durch die Gebiete
  function pathHTML() {
    const meName = acct ? acct.name : null;
    const list = (boardData && boardData.path ? boardData.path : []).filter(r => r.name !== meName).map(r => ({ ...r }));
    list.push({ name: meName || 'Du', me: true, stage: Math.max(S.bestEver, S.best), cur: S.best, asc: S.asc, rebirths: S.rebirths });
    const items = list.map(r => ({ ...r, v: pathMode === 'cur' ? r.cur : r.stage })).filter(r => r.v > 0 || r.me).sort((a, b) => a.v - b.v || (a.me ? 1 : -1));
    const top = Math.max(150, ...items.map(r => r.v)), maxS = Math.ceil((top + 6) / 10) * 10, PX = 9, L = 24, w = L + maxS * PX + 70;
    let zones = '';
    for (let z = 0; z < maxS / 10; z++) {
      const s0 = 10 * z + 1, bm = biomeOf(s0);
      zones += `<div class="zone ${s0 > 150 ? 'nm' : ''}" style="left:${L + z * 10 * PX}px;width:${10 * PX}px;--a1:${bm.sky[0]};--a2:${bm.hill[0]}" title="${esc(zoneName(s0))}"><span>${esc(zoneName(s0))}</span><i class="boss" title="Boss: ${esc(bossOf(s0))}"></i></div>`;
    }
    const lanes = []; let pins = '';
    for (const r of items) {
      const x = L + r.v * PX;
      let lane = lanes.findIndex(e => e <= x - 92);
      if (lane < 0) lane = lanes.length < 6 ? lanes.length : lanes.indexOf(Math.min(...lanes));
      lanes[lane] = x;
      const badge = r.asc ? ` · A${r.asc}` : r.rebirths ? ` · W${r.rebirths}` : '';
      pins += `<div class="pin ${r.me ? 'me' : ''}" style="left:${x}px;z-index:${10 - lane}"><span class="flag"><b>${esc(r.name)}</b><small>Stufe ${r.v}${badge}</small></span><i class="pole" style="height:${12 + lane * 38}px"></i></div>`;
    }
    const h = 40 + 12 + Math.max(1, lanes.length) * 38 + 30;
    requestAnimationFrame(() => { const p = document.querySelector('.rl-path'), m = p && p.querySelector('.pin.me'); if (p && m && !p.dataset.s) { p.dataset.s = 1; p.scrollLeft = Math.max(0, m.offsetLeft - p.clientWidth / 2); } });
    return `<h3 class="rl-h3">Heldenpfad</h3>
      <div class="rl-btabs"><button class="${pathMode === 'ever' ? 'on' : ''}" data-pathmode="ever">Weiteste Stufe aller Zeiten</button><button class="${pathMode === 'cur' ? 'on' : ''}" data-pathmode="cur">Seit der letzten Wiedergeburt</button></div>
      <div class="rl-path"><div class="trk" style="width:${w}px;height:${h}px">${zones}<span class="start" style="left:${L}px">Start</span>${pins}</div></div>
      <p class="note">Jedes Fähnchen ist ein gespeicherter Spielstand. W = Wiedergeburten, A = Aufstiege. ${acct ? '' : 'Lege im Reiter „Spielstand“ einen Spielstand an, damit deine Freunde dich hier auch sehen.'}${boardData ? '' : ' Die anderen Spielstände werden geladen …'}</p>`;
  }
  const PIECE_POS = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  function puzzleHTML(id, shop, newIdx) {
    const h = HERO_BY_ID[id], m = pieceMask(S, id);
    return `<div class="rl-puz" style="--hc:${h.color}">${PIECE_POS.map(([x, y], i) => {
      const got = m & (1 << i);
      return got ? `<span class="pc got ${i === newIdx ? 'new' : ''}" style="--x:${x};--y:${y}"><i>${PORTRAIT[id]}</i></span>`
        : shop ? `<button class="pc buy" style="--x:${x};--y:${y}" data-piece="${id}:${i}" ${S.exp.spl >= PIECE_COST ? '' : 'disabled'} title="Teil ${i + 1} kaufen"><b>${PIECE_COST}</b></button>` : `<span class="pc" style="--x:${x};--y:${y}"></span>`;
    }).join('')}</div>`;
  }
  const expInfo = new Set();
  function expTab() {
    const camp = inCamp();
    const pc = v => `${Math.round(v * 1000) / 10} %`.replace('.', ',');
    const mRow = m => { const h = m.hero && HERO_BY_ID[m.hero], open = expInfo.has(m.id), sp = `${m.spl[0]}–${m.spl[1]} Heldensplitter`;
      const rewards = [[sp, 1], ...(m.rune ? [['1 Rune', 1]] : []), ...(h ? [[`1 Puzzleteil (${h.name})`, PIECE_CHANCE]] : [])];
      return `<div class="rl-mission ${h ? 'hero' : ''} ${open ? 'open' : ''}" ${h ? `style="--hc:${h.color}"` : ''}><div class="rl-mtop"><span class="ic">${h ? PORTRAIT[m.hero] : m.icon}</span><b>${m.name}</b>
        <button class="rl-minfo ${open ? 'on' : ''}" data-xinfo="${m.id}" aria-label="Infos zu ${esc(m.name)}">i</button>
        <button class="btn small" data-rl="mission" data-m2="${m.id}" ${camp ? '' : 'disabled'}>Starten</button></div>
        ${open ? `<div class="rl-mbody"><p>${m.desc}</p><div class="rl-mrew"><span>Belohnungen</span>${rewards.map(([n, v]) => `<div><b>${n}</b><i>${pc(v)}</i></div>`).join('')}</div>
          ${h ? `<small>Doppeltes Teil: ${PIECE_DUP} Splitter${assembled(S, m.hero) ? ` · ${h.name} ist fertig` : ` · Teile ${pieceCount(S, m.hero)}/6`}</small>` : ''}<small>Alle Wellen auf Stufe ${expStage(S, m)}</small></div>` : ''}</div>`; };
    const heroes = PUZZLE.map(id => {
      const h = HERO_BY_ID[id], done = assembled(S, id), n = pieceCount(S, id), hm = heroMission(id);
      return `<div class="rl-xhero ${done ? 'done' : ''}" style="--hc:${h.color}">
        <div class="top"><span class="pt">${PORTRAIT[id]}</span><div><b>${h.name}</b><small>${done ? (hired(S, h.tree) ? 'In deiner Gruppe' : 'Fertig! Jetzt im Baum anheuern.') : `${n}/6 Puzzleteile`}</small></div></div>
        <p class="note">${esc(h.desc)}</p>${puzzleHTML(id, !done)}
        ${done ? `<button class="btn small ghost rl-gotree" data-tab="${h.tree}">Zum Baum</button>` : hm ? `<span class="rl-minetag" style="--hc:${h.color}">${hm.icon} Teile nur in: ${esc(hm.name)}</span>` : ''}</div>`;
    }).join('');
    return `<div class="rl-exp"><div class="rl-xhead"><div><h3 class="rl-h3">Expeditionen</h3><p class="note">Jeder Puzzle-Held hat sein eigenes Gebiet mit eigenen Gegnern und einem eigenen Boss. Nur dort findest du seine Puzzleteile: Jeder Sieg hat 6 % Chance auf eines der 6 Teile. Ein Teil, das du schon hast, wird zu ${PIECE_DUP} Heldensplittern. Die allgemeinen Missionen geben mehr Heldensplitter. Mit Splittern kaufst du jedes Teil gezielt (${PIECE_COST} Splitter). Tippe auf ⓘ für Details und Belohnungen. Gold, Seelen und Rekorde gibt es in Expeditionen nicht.</p></div>
      <div class="rl-spl"><span>◈</span><b>${S.exp.spl}</b><small>Heldensplitter</small></div></div>
      ${camp ? '' : '<p class="note">Missionen startest du im Lager.</p>'}
      <h3 class="rl-h3">Heldengebiete</h3><div class="rl-missions">${MISSIONS.filter(m => m.hero).map(mRow).join('')}</div>
      <h3 class="rl-h3">Allgemeine Missionen</h3><p class="note">Nur Heldensplitter, dafür mehr davon.</p><div class="rl-missions">${MISSIONS.filter(m => !m.hero).map(mRow).join('')}</div>
      <h3 class="rl-h3">Helden &amp; Puzzle-Laden</h3><p class="note">Tippe ein leeres Teil an, um es für ${PIECE_COST} Splitter zu kaufen.</p>
      <div class="rl-xheroes">${heroes}</div></div>`;
  }
  function pieceFound(id) {
    const h = HERO_BY_ID[id];
    modal(`<span class="rl-mic" style="border-color:${h.color};color:${h.color}">${PORTRAIT[id]}</span><h2>Puzzleteil gefunden!</h2>
      <p class="note" style="text-align:center">Ein Teil für ${h.name}: jetzt ${pieceCount(S, id)} von 6.</p>${puzzleHTML(id, false)}
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Super</button></div>`);
  }
  function heroDone(id) {
    const h = HERO_BY_ID[id];
    if (S.exp.target === id) { const nx = PUZZLE.find(x => !assembled(S, x)); if (nx) { S.exp.target = nx; save(); } }
    modal(`<span class="rl-mic" style="border-color:${h.color};color:${h.color}">${PORTRAIT[id]}</span><h2>${h.name} ist bereit!</h2>
      <ul class="rl-list"><li>Alle 6 Puzzleteile sind zusammengesetzt.</li><li>${esc(h.desc)}</li><li>${h.name} hat sich deiner Gruppe angeschlossen. Stell den Helden in der Aufstellung am Lagerfeuer auf.</li><li>Das Puzzle bleibt für immer fertig. Ohne „Veteranen“ aus dem Kronen-Laden musst du den Helden nach einem Aufstieg neu anheuern, direkt in der Aufstellung.</li></ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Los geht’s</button></div>`);
  }
  // Runenschmied: Runen zerstören (gibt Runensplitter) und 3 gleiche verschmelzen (kostet so viel wie 3 zerstörte)
  function forgeShop() {
    const used = socketed(S), groups = {};
    for (const r of S.runes) { const k = r.t + ':' + r.tier; (groups[k] = groups[k] || { t: r.t, tier: r.tier, n: 0, free: 0 }).n++; if (!used.has(r.id)) groups[k].free++; }
    const list = Object.values(groups).sort((a, b) => b.tier - a.tier || RUNES.findIndex(x => x.id === a.t) - RUNES.findIndex(x => x.id === b.t));
    const row = g => { const R = RUNE[g.t], mc = mergeCost(g.tier), canM = feature(S, 'schmiede') && g.n >= 3 && g.tier < 10 && S.dust >= mc;
      return `<div class="rl-frow" style="--rc:${R.color}"><span class="rl-rune mini"><b>${ROMAN[g.tier]}</b></span><div class="nm"><b>${R.name} ${ROMAN[g.tier]}</b><small>${g.n}× im Besitz${g.n - g.free ? ` · ${g.n - g.free} eingesetzt` : ''}</small></div>
        <button class="btn ghost small" data-rforge="d:${g.t}:${g.tier}" ${g.free ? '' : 'disabled title="Alle eingesetzt"'}>Zerstören +${dust}${shardOf(g.tier)}</button>
        ${feature(S, 'schmiede') ? `<button class="btn small" data-rforge="m:${g.t}:${g.tier}" ${canM ? '' : 'disabled'}>${g.tier >= 10 ? 'Höchste Stufe' : `3 → ${ROMAN[g.tier + 1]} · ${dust}${mc}`}</button>` : ''}</div>`; };
    const ln = S.rlager || 0, lc = lagerCost(ln);
    return `<h3 class="rl-h3">Runenschmied</h3><p class="note">Zerstöre Runen, die du nicht brauchst, und bekomme <b>Runensplitter</b>. Mit Splittern erweiterst du dein <b>Runen-Lager</b>${feature(S, 'schmiede') ? ' und verschmilzt <b>3 gleiche Runen</b> zu einer Rune der nächsten Stufe. Ein Verschmelzen kostet genau so viel, wie 3 zerstörte Runen dieser Stufe geben' : '. Ab der 4. Wiedergeburt kannst du außerdem 3 gleiche Runen verschmelzen'}. Eingesetzte Runen werden nie zerstört.</p>
      <div class="rl-wallet"><span class="rl-cur dust">${dust}${S.dust} Runensplitter</span><span class="note">Lager ${S.runes.length}/${runeCap(S)}</span>
      <button class="btn small" data-rl="lager" ${ln < LAGER_MAX && S.dust >= lc && inCamp() ? '' : 'disabled'}>${ln >= LAGER_MAX ? 'Lager voll ausgebaut' : `Lager +5 Plätze (${dust}${lc})`}</button>
      ${feature(S, 'schmiede') ? `<button class="btn ghost small" data-rl="buyrune" ${S.dust >= DUST_RUNE && S.runes.length < runeCap(S) ? '' : 'disabled'}>Zufällige Rune I (${dust}${DUST_RUNE})</button>` : ''}</div>
      <div class="rl-forgelist">${list.map(row).join('') || '<p class="note">Noch keine Runen. Bosse lassen Runen fallen.</p>'}</div>`;
  }
  function ladenTab() {
    const open = { stern: S.rebirths >= 1 || S.stars > 0 || S.asc > 0, zeit: S.asc > 0, altar: S.rebirths >= 1 || S.asc > 0 || S.altar > 0, schmiede: feature(S, 'runen') || S.asc > 0, krone: S.asc > 0 || S.crowns > 0, puzzle: expOpen(S) };
    const LIST = [
      ['stern', 'Sternen-Laden', 'mit der 1. Wiedergeburt', star], ['zeit', 'Zeitbaum', 'mit dem 1. Aufstieg', '⏱'], ['altar', 'Seelenaltar', 'mit der 1. Wiedergeburt', soul],
      ['krone', 'Kronen-Laden', 'mit dem 1. Aufstieg', crown], ['puzzle', 'Puzzle-Laden', 'mit dem 1. Aufstieg (Expeditionen)', '◈'],
    ];
    let cur = shopSel; if (!LIST.some(([id]) => id === cur && open[id])) cur = (LIST.find(([id]) => open[id]) || ['stern'])[0];
    let html = `${wallet({ stern: ['stars'], zeit: ['souls'], altar: ['gold'], krone: ['crowns'], puzzle: ['spl'] }[cur] || [])}
      <div class="rl-shopnav">${LIST.map(([id, name, when, ic]) => open[id] ? `<button data-shoptab="${id}" class="${id === cur ? 'on' : ''}">${ic} ${name}${id === 'krone' && !cperk(S, 'k_veteran') ? '<span class="rl-reddot"></span>' : ''}</button>` : `<span class="lock" title="Kommt ${when}">🔒 ${name}</span>`).join('')}</div>`;
    if (open.stern && cur === 'stern') html += `<section id="shop-stern" class="rl-shop"><h3 class="rl-h3">Sternen-Laden</h3><p class="note">Du hast <span class="rl-cur star">${star}${S.stars}</span> Sterne. Sterne bekommst du bei jeder Wiedergeburt und aus der Tages-Herausforderung. Beim Aufstieg werden die Sternen-Boni zurückgesetzt.</p><div class="rl-perks">${perkCards()}</div><div class="row" style="margin-top:10px"><button class="btn ${confirm === 'pres' ? 'danger' : 'ghost'} small" data-rl="pres" ${inCamp() && Object.keys(S.perks).length ? '' : 'disabled'}>${confirm === 'pres' ? 'Wirklich alles zurücksetzen?' : '↺ Sternen-Laden zurücksetzen (alle Sterne zurück)'}</button></div></section>`;
    if (open.zeit && cur === 'zeit') html += `<section id="shop-zeit" class="rl-shop">${zeitTab()}</section>`;
    if (open.altar && cur === 'altar') { const L = S.altar || 0, c = altarCost(L), maxed = L >= ALTAR_MAX;
      html += `<section id="shop-altar" class="rl-shop"><h3 class="rl-h3">Seelenaltar</h3><p class="note">Opfere Gold für mehr Seelen. Jede Stufe gibt <b>+15 % Seelen</b> von Bossen, Elite-Gegnern und Abkürzungen. Der Altar bleibt <b>für immer</b>, auch nach Wiedergeburt und Aufstieg. Tipp: Kurz vor einer Wiedergeburt brauchst du dein Gold sowieso nicht mehr.</p>
      <div class="rl-altar"><div class="rl-altar-ic">${soul}</div><div><b>Stufe ${L} von ${ALTAR_MAX}</b><span class="note">Seelen jetzt ×${altarMul(S).toFixed(2).replace('.', ',')}${maxed ? '' : ` · nächste Stufe ×${(altarMul(S) + 0.15).toFixed(2).replace('.', ',')}`}</span></div>
      <button class="btn small" data-rl="altar" ${!maxed && S.gold >= c && inCamp() ? '' : 'disabled'}>${maxed ? 'Voll ausgebaut' : `Opfern: ${coin}${fmt(c)}`}</button></div></section>`; }
    if (open.krone && cur === 'krone') html += `<section id="shop-krone" class="rl-shop">${crownShop()}</section>`;
    if (open.puzzle && cur === 'puzzle') html += `<section id="shop-puzzle" class="rl-shop"><h3 class="rl-h3">Puzzle-Laden</h3><p class="note">Du hast <b>◈ ${S.exp.spl}</b> Heldensplitter aus den Expeditionen. Tippe ein leeres Teil an, um es für ${PIECE_COST} Splitter zu kaufen.</p>
      <div class="rl-xheroes">${PUZZLE.map(id => { const h = HERO_BY_ID[id], done = assembled(S, id); return `<div class="rl-xhero ${done ? 'done' : ''}" style="--hc:${h.color}"><div class="top"><span class="pt">${PORTRAIT[id]}</span><div><b>${h.name}</b><small>${done ? 'Fertig' : `${pieceCount(S, id)}/6 Puzzleteile`}</small></div></div>${puzzleHTML(id, !done)}</div>`; }).join('')}</div></section>`;
    const next = LIST.find(([id]) => !open[id]);
    if (next) html += `<p class="note rl-nextshop">Als Nächstes kommt der <b>${next[1]}</b> ${next[2]}.</p>`;
    return html;
  }
  function zeitTab() {
    const lv = S.tempo || 0, f = x => String(x).replace('.', ',');
    const nodes = [`<div class="rl-znode own"><span class="ic">⏱</span><b>×1 bis ×3</b><small>von Anfang an</small></div>`];
    TEMPO_COST.forEach((cost, i) => {
      const sp = 3.5 + 0.5 * i, own = i < lv, next = i === lv, can = next && S.souls >= cost;
      nodes.push(`<i class="rl-zlink ${own ? 'own' : ''}"></i><div class="rl-znode ${own ? 'own' : next ? 'next' : 'locked'}"><span class="ic">${own ? '✓' : next ? '⏩' : '🔒'}</span><b>×${f(sp)}</b>
        ${own ? '<small>freigeschaltet</small>' : `<button class="btn small ${can ? '' : 'ghost'}" ${next ? `data-tempo="1" ${can ? '' : 'disabled'}` : 'disabled'}>${soul}${cost}</button>`}</div>`);
    });
    return `<div class="rl-zeit"><h3 class="rl-h3">Zeitbaum</h3>
      <p class="note">Hier schaltest du mit Seelen schnellere Spieltempos frei, bis maximal ×5. Was du hier kaufst, bleibt für immer, auch nach Wiedergeburt und Aufstieg. Umschalten kannst du oben rechts mit dem Knopf „Tempo“.</p>
      <div class="rl-ztree">${nodes.join('')}</div>
      <p class="note">Gerade möglich: bis ×${f(maxSpeed(S))} · Du hast ${soul}${S.souls} Seelen.</p></div>`;
  }
  function halleTab() {
    const dy = dayId(), rules = weekRules(dy), mine = S.daily && S.daily.day === dy ? S.daily : { best: 0, claimed: 0 };
    let html = pathHTML() + `<div class="rl-week"><div><h3>Tages-Herausforderung</h3><p class="note">Heute · gleiche Regeln für alle, neue Regeln in ${dayLeft()}. Du startest bei Stufe 1 mit deinen aktuellen Helden. Es gibt kein Gold, dafür jeden Tag neu Sterne und eine Krone.</p>
      <div class="rl-rules">${rules.map(r => `<span class="rl-rule"><b>${RULE[r].name}</b>${RULE[r].desc}</span>`).join('')}</div>
      <div class="rl-tiers">${WEEK_TIERS.map((t, i) => `<span class="rl-tier ${mine.claimed & (1 << i) ? 'done' : ''}"><b>Stufe ${t.st}</b>${star}${t.stars}${t.crown ? ` ${crown}${t.crown}` : ''}</span>`).join('')}</div>
      <p>Dein Bestes heute: <b>Stufe ${mine.best}</b> · diese Woche: <b>Stufe ${S.weekly.week === weekId() ? S.weekly.best : 0}</b></p></div>
      <button class="btn" data-rl="weekly" ${inCamp() ? '' : 'disabled'}>Herausforderung starten</button></div>`;
    const n = Object.keys(S.ach).length;
    html += `<h3 class="rl-h3">Erfolge (${n}/${ACH.length})</h3><p class="note">Jeder Erfolg gibt allen Helden dauerhaft +3 % Schaden und Leben. Zusammen gerade: +${Math.round((Math.pow(1 + ACH_BONUS, n) - 1) * 100)} %.</p>
      <div class="rl-achs">${ACH.map(a => `<div class="rl-ach ${S.ach[a.id] ? 'got' : ''}"><span>${S.ach[a.id] ? '★' : '☆'}</span><div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div></div>`).join('')}</div>`;
    const tabsB = [['stage', 'Höchste Stufe'], ['prestige', 'Wiedergeburten'], ['tower', 'Turm'], ['weekly', 'Diese Woche'], ['ach', 'Erfolge']];
    html += `<h3 class="rl-h3">Bestenliste</h3><div class="rl-btabs">${tabsB.map(([k, l]) => `<button class="${boardKey === k ? 'on' : ''}" data-board="${k}">${l}</button>`).join('')}</div>`;
    if (!acct) html += '<p class="note">Lege im Reiter „Spielstand“ einen Spielstand mit Namen und Passwort an, um in der Bestenliste zu erscheinen.</p>';
    if (!boardData || Date.now() - boardAt > 30000) {
      boardAt = Date.now();
      api('board', {}).then(r => { if (!r.error) { boardData = r; if (tab === 'halle') panel(); } });
    }
    if (!boardData) html += '<p class="note">Bestenliste wird geladen …</p>';
    else {
      const list = boardData[boardKey] || [];
      const val = r => (boardKey === 'stage' ? `Stufe ${r.stage}` : boardKey === 'prestige' ? `${r.asc ? `Aufstieg ${r.asc} · ` : ''}${r.rebirths} Wiedergeb.` : boardKey === 'tower' ? `Etage ${r.tower}` : boardKey === 'weekly' ? `Stufe ${r.week}` : `${r.ach} Erfolge`);
      html += list.length ? `<ol class="rl-board">${list.map((r, i) => `<li class="${acct && r.name === acct.name ? 'me' : ''}"><span class="pl">${i + 1}</span><b>${r.asc ? rankBadge(r.asc) : ''}${esc(r.name)}${r.asc ? ` <small class="rl-rkname" style="--rc:${rankOf(r.asc).col}">${esc(rankOf(r.asc).name)}</small>` : ''}</b><span>${val(r)}</span></li>`).join('')}</ol>` : '<p class="note">Noch keine Einträge.</p>';
      html += `<p class="note">${boardData.players} Spielstände · wird alle 30 Sekunden aktualisiert</p>`;
    }
    return html;
  }

  /* ---------- Truppe: Helden aufstellen ---------- */
  let squad = null;
  function squadHeroes() {
    if (S.asc) return HEROES;
    const own = HEROES.filter(h => hired(S, h.tree)), nx = HEROES.find(h => !h.puzzle && !hired(S, h.tree));
    return nx ? [...own, nx] : own;
  }
  function lockReason(h) {
    if (h.puzzle) return `${h.name}: Setze das Puzzle aus den Expeditionen zusammen.`;
    if (S.rebirths < h.rebirth) return `${h.name} kommt mit der ${h.rebirth}. Wiedergeburt.`;
    return `${h.name} kannst du jetzt in seinem Baum anheuern.`;
  }
  function openSquad() {
    if (!inCamp()) return;
    if (!squad) {
      const el = document.createElement('div'); el.className = 'rl-squad'; el.hidden = true;
      el.innerHTML = `<div class="sq-panel" role="dialog" aria-label="Truppe"><canvas class="sq-bg"></canvas><div class="sq-top"><div class="sq-head"><h2>Truppe</h2><span class="sq-count"></span><button class="sq-x" aria-label="Schließen">✕</button></div><div class="sq-row"></div><p class="sq-tip"></p><div class="sq-legend"></div></div><div class="sq-scene" aria-hidden="true"></div></div>`;
      document.body.appendChild(el);
      squad = { el, cv: el.querySelector('.sq-bg'), ids: [], slots: 4, off: 0, spots: null };
      el.addEventListener('click', onSquadClick);
    }
    squad.el.hidden = false; renderSquad(); sizeSquad(); SND.play('tick');
  }
  function closeSquad() { if (squad) squad.el.hidden = true; }
  function sizeSquad() {
    const c = squad.cv, sc = squad.el.querySelector('.sq-scene'), dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
    if (!w) return;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); squad.offL = sc.offsetTop * W / w;
  }
  function renderSquad() {
    const field = fieldOf(S), slots = fieldSlots(S), el = squad.el;
    squad.ids = field; squad.slots = slots;
    el.querySelector('.sq-count').textContent = `${field.length} / ${slots} Plätze`;
    const list = squadHeroes();
    el.querySelector('.sq-row').innerHTML = list.map(h => {
      const own = hired(S, h.tree), on = field.includes(h.id), col = ROLE_INFO[ROLE[h.id]].col, can = !own && classOpen(S, h.tree), c = can ? nodeCost(S, NODE[h.hire]) : null;
      const away = own && onTrip(S, h.id);
      if (away) return `<button class="sq-tile trip" data-sq="${h.id}" style="--rc:${col}"><span class="pic"><img src="${portraitURL(h.id)}" alt=""><b class="lk">🧭</b></span><span class="nm">${h.name}</span><small class="sq-cost">${tripLeft(S, h.id) > 0 ? `auf Reise · ${durStr(tripLeft(S, h.id))}` : 'zurück, abholen!'}</small></button>`;
      return `<button class="sq-tile ${own ? (on ? 'on' : 'bench') : can ? 'hire' : 'locked'}" data-sq="${h.id}" style="--rc:${col}"><span class="pic"><img src="${portraitURL(h.id)}" alt="">${own ? '' : can ? '<b class="lk hire">＋</b>' : '<b class="lk">🔒</b>'}</span><span class="nm">${h.name}</span>${on ? '<em>✓</em>' : ''}${can ? `<small class="sq-cost">Anheuern: ${fmt(c.g)} Gold${c.s ? ` · ${c.s} Seelen` : ''}</small>` : ''}</button>`;
    }).join('');
    el.querySelector('.sq-tip').textContent = `Tippe ein Porträt an, um den Helden ein- oder auszuwechseln. Rechts steht die vorderste Reihe.${slots < 6 ? ` Mehr Plätze: ${perk(S, 'p_feld') ? '' : 'Fünfter Platz im Sternen-Laden'}${!perk(S, 'p_feld') && !cperk(S, 'k_feld') ? ', ' : ''}${cperk(S, 'k_feld') ? '' : 'Sechster Platz im Kronen-Laden'}.` : ''}`;
    const roles = [...new Set(LINE_ORDER.filter(k => list.some(h => h.id === k)).map(k => ROLE[k]))];
    el.querySelector('.sq-legend').innerHTML = roles.map(r => `<span style="--rc:${ROLE_INFO[r].col}"><i></i>${ROLE_INFO[r].name}</span>`).join('');
    sizeSquad();
  }
  function squadToggle(id) {
    if (!inCamp()) { toast('Die Truppe änderst du im Lager.'); return; }
    const r = toggleField(S, id);
    if (r === 'full') toast('Alle Plätze sind belegt. Nimm zuerst jemanden raus.');
    else if (r === 'last') toast('Mindestens ein Held muss kämpfen.');
    else if (r === 'trip') { toast(`${HERO_BY_ID[id].name} ist auf Reise und kommt in ${durStr(tripLeft(S, id))} zurück.`); return; }
    else SND.play(r === 'in' ? 'buy' : 'tick');
    afterChange(); renderSquad();
  }
  function onSquadClick(e) {
    if (e.target === squad.el || e.target.closest('.sq-x')) { closeSquad(); return; }
    const t = e.target.closest('[data-sq]');
    if (t) {
      const h = HERO_BY_ID[t.dataset.sq];
      if (hired(S, h.tree)) squadToggle(h.id);
      else if (classOpen(S, h.tree) && h.hire) {
        if (!inCamp()) toast('Anheuern geht nur im Lager.');
        else if (buy(S, NODE[h.hire])) { SND.play('buy'); toast(`${h.name} schließt sich deiner Gruppe an!`, true); afterChange(); renderSquad(); }
        else { const c = nodeCost(S, NODE[h.hire]); toast(`Zum Anheuern fehlen dir Gold oder Seelen (${fmt(c.g)} Gold${c.s ? `, ${c.s} Seelen` : ''}).`); }
      }
      else if (!h.puzzle && S.rebirths >= h.rebirth) { closeSquad(); tab = h.tree; confirm = ''; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); toast(lockReason(h)); }
      else toast(lockReason(h));
      return;
    }
    const sc = e.target.closest('.sq-scene');
    if (sc && squad.spots) {
      const r = sc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      const hit = squad.spots.heroes.find(s => Math.abs(s.x - x) < 24);
      if (hit) squadToggle(hit.k); else if (squad.spots.empty.some(ex => Math.abs(ex - x) < 24)) toast('Tippe oben ein Porträt an, um den Platz zu füllen.');
    }
  }

  // Geldbörse: zeigt nur die Währungen, die an dieser Stelle gebraucht werden
  const wallet = (list, cls = '') => `<div class="rl-wallet rl-wsmall ${cls}">${list.map(k => ({ gold: `<span class="rl-cur gold" title="Gold">${coin}${fmt(S.gold)}</span>`, souls: `<span class="rl-cur soul" title="Seelen">${soul}${S.souls}</span>`, stars: `<span class="rl-cur star" title="Sterne">${star}${S.stars}</span>`, dust: `<span class="rl-cur dust" title="Runensplitter">${dust}${S.dust}</span>`, crowns: `<span class="rl-cur crown" title="Kronen">${crown}${S.crowns}</span>`, spl: `<span class="rl-cur spl" title="Heldensplitter">◈ ${S.exp.spl}</span>` })[k]).join('')}</div>`;
  /* ---------- Leisten-Modus (eigene Seite strip.html / Taskleisten-Version) ---------- */
  // Nur aktiv, wenn die Seite vor ritter.js window.RITTER_STRIP = true setzt. Dann laufen Feldzüge von allein weiter
  // und die Leiste liest über window.RitterStrip Stand, Bild und Knöpfe aus.
  const STRIP = { on: !!window.RITTER_STRIP, auto: true };
  try { STRIP.auto = localStorage.getItem('fsg.ritter.leiste.auto') !== '0'; } catch {}
  function stripTick() {
    if (!STRIP.auto || cine || !S) return;
    if (document.querySelector('.rl-title')) return;
    const noRun = !run, over = run && run.dead && run.deadT > 3.5;
    if (!noRun && !over) return;
    if (squad && !squad.el.hidden) return;
    const p = $('#picker'); if (p && !p.hidden && !(run && run.dead && p.querySelector('.rl-result'))) return; // offenes Fenster nicht wegklicken (außer Ergebnis)
    if (p) p.hidden = true;
    startRun();
  }
  if (STRIP.on) window.RitterStrip = {
    W, H, GROUND,
    canvas: () => cv,
    state: () => {
      const live = run && !run.dead, boss = live ? run.enemies.find(e => e.boss || e.wb) : null;
      return { live, camp: inCamp(), mode: run ? run.mode : null, stage: run ? run.stage : 0, zone: run ? zoneName(run.stage) : '', best: S.best, cap: capOf(S),
        gold: S.gold, souls: S.souls, runGold: run ? run.gold : 0, runSouls: run ? run.souls : 0, time: run ? run.time : 0, speed: S.speed, maxSpeed: maxSpeed(S), auto: STRIP.auto,
        boss: boss ? { name: run.mode === 'wboss' ? wbBossName(run.wb.bk) : BOSS_NAMES[boss.bk % BOSS_NAMES.length] || 'Boss', hp: Math.max(0, boss.hp / boss.max) } : null,
        heroes: live ? run.order.filter(k => run.h[k]).map(k => ({ id: k, color: HERO_BY_ID[k].color, hp: run.h[k].alive ? Math.max(0, run.h[k].hp / st[k].hp) : 0 })) : [],
        trips: tripsReady().length, sound: SND.isOn(), title: !!document.querySelector('.rl-title') };
    },
    setAuto: v => { STRIP.auto = !!v; try { localStorage.setItem('fsg.ritter.leiste.auto', v ? '1' : '0'); } catch {} },
    start: () => { if (inCamp()) { $('#picker').hidden = true; startRun(); } },
    speed: () => { const b = $('#soloSpeed'); if (b) b.click(); },
    sound: () => { const b = $('#soloSnd'); if (b) b.click(); },
  };
  // Galerie zum Prüfen aller Figuren (nur mit window.RITTER_GALLERY, z. B. auf einer Testseite)
  if (window.RITTER_GALLERY) window.RitterGallery = {
    W, H, GROUND, heroes: Object.keys(DRAW), kinds: ENEMY_KINDS, bossNames: BOSS_NAMES, missions: AHN_MISSIONS, ahne: AHNE,
    use(c, sc) { cv = c; ctx = c.getContext('2d'); scale = sc; ctx.setTransform(sc, 0, 0, sc, 0, 0); },
    at(x, y, s, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); try { fn(); } finally { ctx.restore(); } },
    hero(k, x, t, o = {}) { drawHero(k, x, { alive: true, swing: o.swing || 0, hurtT: o.hurt || 0, hp: 1, fall: 1 }, t, !!o.walk); },
    enemy(o, x, t) { const e = makeEnemy(o.stage || 5, 0, !!o.boss, !!o.elite, null, !!o.ranged); Object.assign(e, o.set || {}); e.x = x; e._px = x; enemy(e, t); return e; },
    ahn(def, x, t, ph = 0) { const e = makeEnemy(40, 0, true, false, null, false); e.ahn = def; e.bk = def.bk; e.type = def.bk >= 0 && def.bk < 5 ? ENEMY_KINDS[def.bk] : 'geist'; e.phase = ph; e.x = x; e._px = x; enemy(e, t); },
    fn: { wolf, minion, boneGiant, shadowClone, boar, turret, dragonC, owlC, golemC, phoenixC, drawDragon },
  };
  window.Ritter = { open, close, isOpen: () => active };
})();

