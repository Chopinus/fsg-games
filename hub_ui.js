'use strict';
// Game Hub – neue Startseite: Kategorien, Suche, animierte Spielkacheln, Hub-Level und Wochen-Aufgaben.
(function () {
  const css = `
  .hx-hero{position:relative;border-radius:24px;padding:22px 20px;overflow:hidden;background:linear-gradient(135deg,#2b1f4a,#1b1726 55%,#3a1f2e);border:1px solid #3d3452;isolation:isolate}
  .hx-hero::before,.hx-hero::after{content:"";position:absolute;width:320px;height:320px;border-radius:50%;filter:blur(60px);opacity:.55;z-index:-1;animation:hxblob 14s ease-in-out infinite alternate}
  .hx-hero::before{background:#ff7a3d;left:-80px;top:-140px}.hx-hero::after{background:#7a3dff;right:-90px;bottom:-160px;animation-delay:-6s}
  @keyframes hxblob{0%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,30px) scale(1.15)}100%{transform:translate(-30px,50px) scale(.95)}}
  .hx-hero h1{font-family:var(--display);font-weight:400;font-size:clamp(40px,9vw,72px);line-height:.92;margin:0;background:linear-gradient(90deg,#fff,#ffd27a 40%,#ff8fd0 70%,#9fe9ff);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% 100%;animation:hxshine 8s linear infinite}
  @keyframes hxshine{to{background-position:-200% 0}}
  .hx-hero p{margin:8px 0 0;color:#d9cfe9;max-width:56ch}
  .hx-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .hx-stats span{font-size:13px;font-weight:800;padding:5px 11px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
  .hx-stats .live::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#3dff8a;margin-right:6px;box-shadow:0 0 8px #3dff8a;animation:pulse 1.6s infinite}
  .hx-lv{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:12px 14px;cursor:pointer;transition:transform .15s}
  .hx-lv:hover{transform:translateY(-2px)}
  .hx-ring{--p:0;width:58px;height:58px;border-radius:50%;background:conic-gradient(#ffb547 calc(var(--p)*1%),#2e2742 0);display:grid;place-items:center;transition:--p 1s}
  .hx-ring b{width:46px;height:46px;border-radius:50%;background:var(--surface);display:grid;place-items:center;font:400 20px var(--display);color:var(--accent)}
  .hx-lv .bar{height:8px;border-radius:99px;background:#2e2742;overflow:hidden;margin-top:6px}.hx-lv .bar i{display:block;height:100%;background:linear-gradient(90deg,#ffb547,#ff7a3d);border-radius:99px;transition:width 1s}
  .hx-lv small{color:var(--muted)}
  .hx-q{display:flex;gap:6px}.hx-q i{width:10px;height:10px;border-radius:50%;background:#2e2742}.hx-q i.d{background:#3dff8a;box-shadow:0 0 6px #3dff8a}
  .hx-bar{position:sticky;top:0;z-index:5;margin:0 -16px;padding:10px 16px;background:linear-gradient(var(--bg) 70%,transparent);display:flex;flex-direction:column;gap:8px}
  .hx-cats{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.hx-cats::-webkit-scrollbar{display:none}
  .hx-cats button{flex:0 0 auto;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:99px;padding:9px 14px;font:800 14px var(--body);cursor:pointer;transition:all .2s}
  .hx-cats button.on{background:var(--accent);color:#1b1400;border-color:var(--accent);box-shadow:0 6px 18px rgba(255,181,71,.35)}
  .hx-search{font-size:16px;padding:10px 14px}
  #tiles.hx{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
  .hx-t{position:relative;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;background:var(--surface);border:1px solid var(--line);text-align:left;animation:hxin .45s both;transition:transform .2s,box-shadow .2s,border-color .2s;cursor:pointer}
  .hx-t:hover{transform:translateY(-4px);box-shadow:0 16px 36px rgba(0,0,0,.4);border-color:#5a4d7a}
  @keyframes hxin{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
  .hx-t .art{position:relative;height:108px;display:flex;align-items:center;justify-content:center;gap:6px;background:var(--g);overflow:hidden}
  .hx-t .art::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.18) 45%,transparent 60%);transform:translateX(-120%);transition:transform .7s}
  .hx-t:hover .art::after{transform:translateX(120%)}
  .hx-t .art > *{transition:transform .3s}.hx-t:hover .art > *{transform:scale(1.08) rotate(-2deg)}
  .hx-t .bd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
  .hx-t b{font-size:17px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .hx-t .sub{color:var(--muted);font-size:13.5px;line-height:1.35;flex:1}
  .hx-t .go{align-self:flex-start;margin-top:4px}
  .hx-t .pill{font-size:10.5px}.hx-t .pill.new{background:#ff3fa4;color:#fff;animation:hxnew 2s ease-in-out infinite}.hx-t .pill.day{background:#27a06a;color:#fff}
  @keyframes hxnew{50%{box-shadow:0 0 12px #ff3fa4}}
  .hx-t.big{grid-column:span 2}@media (max-width:560px){.hx-t.big{grid-column:auto}}
  .hx-t.big .art{height:140px}
  .hx-sec{grid-column:1/-1;margin:10px 0 0;font:400 18px var(--display);color:#d9cfe9;display:flex;align-items:center;gap:8px}
  .hx-sec::after{content:"";flex:1;height:1px;background:var(--line)}
  .hx-empty{grid-column:1/-1}
  /* Kachel-Bilder */
  .qz-art{display:flex;gap:6px}.qz-art i{width:30px;height:30px;border-radius:8px;background:var(--c);display:grid;place-items:center;font-style:normal;color:#fff;font-size:15px;box-shadow:0 4px 0 rgba(0,0,0,.3);animation:hxbob 2.4s ease-in-out infinite}
  .qz-art i:nth-child(2){animation-delay:.2s}.qz-art i:nth-child(3){animation-delay:.4s}.qz-art i:nth-child(4){animation-delay:.6s}
  @keyframes hxbob{50%{transform:translateY(-6px)}}
  .ww2-art{position:relative;width:96px;height:64px}.ww2-art b{position:absolute;right:6px;top:0;font-size:40px;filter:drop-shadow(0 0 14px rgba(255,250,200,.8))}.ww2-art i{position:absolute;left:8px;bottom:-4px;font-size:44px;font-style:normal;animation:hxhowl 3s ease-in-out infinite;transform-origin:bottom}
  @keyframes hxhowl{50%{transform:rotate(-8deg)}}
  .ag-art{display:grid;grid-template-columns:repeat(3,26px);gap:4px}.ag-art i{height:18px;border-radius:4px;background:#e9e0cc}.ag-art .ag-r{background:#ff5a6e}.ag-art .ag-b{background:#4da3ff}.ag-art .ag-x{background:#111}
  .sv-art{display:grid;grid-template-columns:repeat(3,22px);gap:3px;padding:5px;border-radius:8px;background:#0f3d6e}.sv-art i{height:22px;border-radius:3px;background:rgba(120,190,255,.25);position:relative}.sv-art .hit{background:radial-gradient(#ffd23f,#ff6b3d 50%,#8a1f12);animation:hxbob 1.4s infinite}.sv-art .miss::after{content:"";position:absolute;inset:7px;border-radius:50%;background:#cfe8ff}
  .ka-art{position:relative;width:100px;height:60px}.ka-art i{position:absolute;width:var(--s);height:var(--s);border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff,var(--c) 40%,rgba(0,0,0,.4));box-shadow:0 0 12px var(--c);animation:hxbob 3s ease-in-out infinite}
  .ka-art i:nth-child(2){animation-delay:-1s}.ka-art i:nth-child(3){animation-delay:-2s}
  .tu-art{font-size:52px;filter:drop-shadow(0 0 16px rgba(255,210,63,.7));animation:hxbob 2.6s ease-in-out infinite}
  .rx-art{display:grid;grid-template-columns:repeat(3,24px);gap:3px}.rx-art i{height:24px;border-radius:5px;background:#fff3;display:grid;place-items:center;font:800 13px var(--body);font-style:normal;color:#fff}.rx-art i.f{background:#ffb547;color:#1b1400}
  .tw-art{font-size:46px;display:flex;gap:2px;align-items:flex-end}.tw-art span{animation:hxbob 2s ease-in-out infinite}.tw-art span:nth-child(2){font-size:30px;animation-delay:.3s}
  /* Aufgaben-Fenster */
  .hx-panel{position:fixed;inset:0;z-index:50;background:rgba(10,8,20,.7);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;animation:hxfade .25s both}
  @keyframes hxfade{from{opacity:0}to{opacity:1}}
  .hx-sheet{width:min(100%,620px);max-height:88vh;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:22px 22px 0 0;padding:18px 16px 26px;display:flex;flex-direction:column;gap:12px;animation:hxsheet .35s cubic-bezier(.2,.9,.3,1) both}
  @media (min-width:700px){.hx-panel{align-items:center}.hx-sheet{border-radius:22px}}
  @keyframes hxsheet{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
  .hx-quest{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:12px;border-radius:14px;background:var(--surface);border:1px solid var(--line)}
  .hx-quest.d{border-color:#27a06a;background:linear-gradient(90deg,rgba(39,160,106,.18),var(--surface))}
  .hx-quest .bar{grid-column:1/-1;height:8px;border-radius:99px;background:#2e2742;overflow:hidden}.hx-quest .bar i{display:block;height:100%;background:linear-gradient(90deg,#3dff8a,#22c4ff)}
  .hx-cols{display:flex;flex-wrap:wrap;gap:6px}
  .hx-cols button{border:1px solid var(--line);background:var(--surface);border-radius:99px;padding:7px 12px;font:800 13px var(--body);color:var(--fg);cursor:pointer}
  .hx-cols button.on{outline:2px solid var(--accent)}.hx-cols button:disabled{opacity:.4}
  /* EP-Meldung & Aufstieg */
  .hx-xp{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:70;background:linear-gradient(90deg,#ffb547,#ff7a3d);color:#1b1400;font:800 16px var(--body);padding:10px 18px;border-radius:99px;box-shadow:0 10px 30px rgba(255,140,60,.45);animation:hxxp 2.6s ease-out forwards;pointer-events:none}
  @keyframes hxxp{0%{opacity:0;transform:translate(-50%,20px) scale(.8)}15%{opacity:1;transform:translate(-50%,0) scale(1.05)}25%{transform:translate(-50%,0) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-30px)}}
  .hx-up{position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:radial-gradient(circle,rgba(255,181,71,.35),rgba(10,8,20,.85));animation:hxfade .3s both;cursor:pointer}
  .hx-up div{text-align:center;animation:hxpopup .7s cubic-bezier(.2,1.4,.4,1) both}
  .hx-up .n{font:400 clamp(80px,24vw,170px) var(--display);color:#ffd23f;text-shadow:0 0 40px rgba(255,210,63,.8),0 8px 0 #7a4a00;line-height:1}
  @keyframes hxpopup{from{transform:scale(.3) rotate(-10deg);opacity:0}to{transform:none;opacity:1}}
  /* Namensfarben */
  .hbn.nc-gold{background:linear-gradient(90deg,#ffe58a,#ffb300,#ffe58a);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800}
  .hbn.nc-fire{background:linear-gradient(90deg,#ff3d00,#ffb300,#ff3d00);background-size:200%;-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;animation:hxshine 3s linear infinite}
  .hbn.nc-rainbow{background:linear-gradient(90deg,#ff4d4d,#ffb347,#ffe14d,#4dff88,#4dc3ff,#b04dff,#ff4d4d);background-size:200%;-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;animation:hxshine 4s linear infinite}
  .hbn.nc-galaxy{background:linear-gradient(90deg,#7a3dff,#22e3ff,#ff3fa4,#7a3dff);background-size:200%;-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;animation:hxshine 5s linear infinite}
  .hblv{display:inline-block;margin-left:5px;font:800 10px var(--body);padding:1px 5px;border-radius:6px;background:#3a2f5a;color:#ffd27a;vertical-align:1px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const q = s => document.querySelector(s);
  const esc2 = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const konto2 = () => { try { const k = JSON.parse(localStorage.getItem('fsg.konto') || 'null'); return k && k.name && k.token ? k : null; } catch { return null; } };
  async function call(a, body) { const k = konto2(); if (!k) return { error: 'login' }; try { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: k.name, token: k.token, ...(body || {}) }) }); return await r.json(); } catch { return { error: 'net' }; } }

  const CATS = [['top', '⭐ Neu & beliebt'], ['freunde', '👥 Mit Freunden'], ['party', '🎉 Party'], ['taeglich', '🧩 Täglich'], ['solo', '🌍 Solo & Welten'], ['alle', '📚 Alle']];
  const G = k => (typeof GAMES !== 'undefined' ? GAMES.find(g => g.key === k) : null);
  // Kacheln: k = Schlüssel, cats = Kategorien, act = Attribut für den Klick
  function catalog() {
    const room = k => { const g = G(k); return g ? { k, t: g.title, s: g.sub, art: g.art, act: `data-create="${k}"`, btn: k === 'party' ? 'Party starten' : 'Neue Runde', neu: g.neu } : null; };
    const L = [
      { k: 'ritter', t: 'Ritterlauf', s: 'Deine Heldengruppe kämpft sich durch Gegnerwellen. Klassen, Runen, Wiedergeburt und Bestenliste.', art: '<span class="rl-art"></span>', act: 'data-solo="1"', btn: 'Spielen', pill: 'Solo', g: 'linear-gradient(135deg,#5a2c12,#2a1608)', cats: ['solo', 'top'], big: 1 },
      { k: 'turmwacht', t: 'Turmwacht', s: 'Tower Defense: Baue Bogen-, Kanonen-, Frost- und Blitztürme und verteidige die Burg. Wie weit kommst du?', art: '<span class="tw-art"><span>🏰</span><span>🏹</span></span>', act: 'data-tw-open="1"', btn: 'Spielen', neu: 1, pill: 'Solo', g: 'linear-gradient(135deg,#2f6f2a,#14361a)', cats: ['solo', 'top'] },
      { k: 'raetsel', t: 'Tagesrätsel', s: 'Sudoku, Nonogramm, Verbindungen und Mathe-Blitz – jeden Tag neu, mit Rangliste.', art: '<span class="rx-art">' + ['5', '', '3', '', '7', '', '1', '', '9'].map((x, i) => `<i class="${i % 2 ? 'f' : ''}">${x}</i>`).join('') + '</span>', act: 'data-rx-open=""', btn: 'Rätseln', neu: 1, day: 1, g: 'linear-gradient(135deg,#3a2f7a,#1d1840)', cats: ['taeglich', 'top'] },
      { k: 'wortle', t: 'Wörtle', s: 'Jeden Tag ein neues Wort mit 5 Buchstaben – 6 Versuche. Plus freies Spiel.', art: '<span class="wd-art">🟩</span>', act: 'data-wd-open="1"', btn: 'Spielen', day: 1, g: 'linear-gradient(135deg,#1f6a3a,#0f2e1c)', cats: ['taeglich'] },
      { k: 'mathe', t: 'Mathe-Blitz', s: '60 Sekunden Kopfrechnen gegen die Uhr – wer schafft heute die meisten?', art: '<span style="font:400 40px var(--display);color:#ffd23f;text-shadow:0 0 18px rgba(255,210,63,.6)">7×8</span>', act: 'data-rx-open="mathe"', btn: 'Los', day: 1, neu: 1, g: 'linear-gradient(135deg,#6a3a00,#2a1600)', cats: ['taeglich'] },
      { k: 'verb', t: 'Verbindungen', s: '16 Wörter, 4 geheime Gruppen. Finde die Gemeinsamkeiten!', art: '<span class="rx-art" style="grid-template-columns:repeat(4,20px)">' + ['#f9df6d', '#a0c35a', '#b0c4ef', '#ba81c5'].map(c => `<i style="background:${c}"></i>`.repeat(2)).join('') + '</span>', act: 'data-rx-open="verb"', btn: 'Los', day: 1, neu: 1, g: 'linear-gradient(135deg,#5a3d8a,#241840)', cats: ['taeglich'] },
      { ...room('quiz'), g: 'linear-gradient(135deg,#3b2a8a,#1a1440)', cats: ['freunde', 'party', 'top'], big: 1 },
      { ...room('werwolf'), g: 'linear-gradient(160deg,#1c2a6a,#0a0d24)', cats: ['freunde', 'party', 'top'] },
      { ...room('arena'), g: 'radial-gradient(circle at 30% 30%,#1a2060,#05060f)', cats: ['freunde', 'party', 'top'] },
      { ...room('lichtrad'), g: 'linear-gradient(135deg,#06081a,#141a3a)', cats: ['freunde', 'party', 'top'] },
      { ...room('agenten'), g: 'linear-gradient(135deg,#6a2030,#1f3a6a)', cats: ['freunde', 'party'] },
      { ...room('schiffe'), g: 'linear-gradient(180deg,#0f3d6e,#08223f)', cats: ['freunde', 'top'] },
      { ...room('turnier'), g: 'linear-gradient(135deg,#6a4a00,#2a1d00)', cats: ['freunde', 'party'] },
      { k: 'dungeon', t: 'Dungeon', s: 'Pixel-Dungeon-Crawler mit Helden, Artefakten und Bossen – auch im Koop. Testversion v0.1.', art: '<span class="dg-art"></span>', act: 'data-dungeon="1"', btn: 'Spielen', pill: 'v0.1 Test', g: 'linear-gradient(135deg,#2a1a3a,#0d0814)', cats: ['solo'] },
      { k: 'insel', t: 'Inselreich', s: 'Offene Pixelwelt für alle: Inseln erkunden, bauen, segeln und gemeinsam spielen.', art: '<span class="is-art"></span>', act: 'data-insel="1"', btn: 'Spielen', pill: 'Welt', g: 'linear-gradient(135deg,#0f5a7a,#082a3a)', cats: ['solo'] },
      { k: 'welt', t: 'Würfelwelt', s: 'Unendliche Würfelwelt – abbauen, bauen, entdecken. Kreativ- oder Überlebensmodus.', art: '<span class="ww-art"></span>', act: 'data-welt="1"', btn: 'Spielen', pill: 'Welt', g: 'linear-gradient(135deg,#3a6a2a,#1a2e12)', cats: ['solo'] },
      { k: 'casino', t: 'Casino Aurum', s: 'Blackjack, Roulette, Poker, Pferderennen, Automat und Glücksrad – nur mit Spieljetons.', art: '<span class="cz-art"></span>', act: 'data-casino="1"', btn: 'Spielen', pill: 'Spielgeld', g: 'linear-gradient(135deg,#5a0f1f,#1f0610)', cats: ['solo', 'freunde'] },
      ...['uno', 'schach', 'vier', 'maedn', 'kniffel', 'siedler'].map(k => ({ ...room(k), g: 'linear-gradient(135deg,#2e2742,#1e1a2c)', cats: ['freunde'] })),
      ...['party', 'maler', 'slf', 'spion'].map(k => ({ ...room(k), g: 'linear-gradient(135deg,#3a2342,#1e1a2c)', cats: ['party', 'freunde'] })),
      { k: 'ideen', t: 'Ideen & Vorschläge', s: 'Schlag vor, was besser werden soll, und stimm über die Ideen der anderen ab.', art: '<span class="vz-art">💡</span>', act: 'data-vz-open="1"', btn: 'Ideen ansehen', g: 'linear-gradient(135deg,#4a3a12,#1e1808)', cats: ['alle'] },
    ];
    return L.filter(x => x && x.t);
  }
  let cat = 'top', term = '';
  try { cat = localStorage.getItem('fsg.hubcat') || 'top'; } catch {}
  function tileHTML(x, i) {
    const pills = `${x.neu ? '<span class="pill new">Neu</span>' : ''}${x.day ? '<span class="pill day">Täglich</span>' : ''}${x.pill ? `<span class="pill">${esc2(x.pill)}</span>` : ''}`;
    return `<div class="hx-t ${x.big && cat !== 'alle' ? 'big' : ''}" data-hxt="${x.k}" style="--g:${x.g};animation-delay:${Math.min(i, 14) * 0.035}s"><div class="art">${x.art}</div>
      <div class="bd"><b>${esc2(x.t)} ${pills}</b><span class="sub">${esc2(x.s)}</span><button class="btn small go" ${x.act}>${esc2(x.btn)}</button></div></div>`;
  }
  function renderTiles() {
    const el = q('#tiles'); if (!el) return; el.classList.add('hx');
    let L = catalog();
    const t = term.trim().toLowerCase();
    if (t) L = L.filter(x => (x.t + ' ' + x.s).toLowerCase().includes(t));
    else if (cat !== 'alle') L = L.filter(x => x.cats.includes(cat));
    el.innerHTML = L.length ? L.map(tileHTML).join('') : '<div class="empty hx-empty">Nichts gefunden. Probier ein anderes Wort.</div>';
    document.querySelectorAll('.hx-cats button').forEach(b => b.classList.toggle('on', !t && b.dataset.hxc === cat));
  }
  // Ganze Kachel anklickbar (nicht nur der Knopf)
  document.addEventListener('click', e => {
    const t = e.target.closest('.hx-t'); if (!t || e.target.closest('button')) return;
    const b = t.querySelector('button.go'); if (b) b.click();
  });
  // Turmwacht erst beim ersten Öffnen laden
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tw-open]'); if (!b || window.Turmwacht) return;
    e.stopImmediatePropagation(); b.disabled = true; b.textContent = 'Lädt …';
    const sc = document.createElement('script'); sc.src = 'turmwacht.js?v=1'; sc.onload = () => { b.disabled = false; b.textContent = 'Spielen'; window.Turmwacht && Turmwacht.open(); }; sc.onerror = () => { b.disabled = false; b.textContent = 'Spielen'; toast('Turmwacht konnte nicht geladen werden.'); }; document.body.appendChild(sc);
  }, true);

  /* ---------- Kopf, Kategorien, Level-Karte ---------- */
  function build() {
    const brand = q('#hub .brand'); if (brand && !q('.hx-hero')) {
      brand.outerHTML = `<header class="hx-hero"><h1>Game·Hub</h1><p>Über 25 Spiele für dich und deine Freunde – jeder auf seinem eigenen Gerät. Starte eine Runde, löse die Tagesrätsel oder steig in offene Runden ein.</p>
        <div class="hx-stats"><span class="live">Live</span><span data-hxrooms style="cursor:pointer">0 offene Runden</span><span>🧩 Neue Rätsel jeden Tag</span></div></header><div data-hxlv></div>`;
    }
    const sec = q('#tiles') && q('#tiles').closest('section');
    if (sec && !q('.hx-bar')) {
      const h2 = sec.querySelector('h2'); if (h2) h2.remove();
      const bar = document.createElement('div'); bar.className = 'hx-bar';
      bar.innerHTML = `<div class="hx-cats">${CATS.map(([k, n]) => `<button data-hxc="${k}">${n}</button>`).join('')}</div><input class="hx-search" type="search" placeholder="🔍 Spiel suchen …" autocomplete="off">`;
      sec.insertBefore(bar, q('#tiles'));
      bar.addEventListener('click', e => { const b = e.target.closest('[data-hxc]'); if (!b) return; cat = b.dataset.hxc; term = ''; bar.querySelector('input').value = ''; try { localStorage.setItem('fsg.hubcat', cat); } catch {} renderTiles(); });
      bar.querySelector('input').addEventListener('input', e => { term = e.target.value; renderTiles(); });
      bar.querySelector('input').addEventListener('keydown', e => e.stopPropagation());
    }
    // Übersichtlicher: Wer angemeldet ist, braucht das Namensfeld nicht ganz oben
    const pan = q('#hub > .panel'), rs = q('#rooms') && q('#rooms').closest('section');
    if (pan && rs && konto2() && !pan.dataset.moved) { pan.dataset.moved = 1; rs.after(pan); }
    // Offene Runden direkt unter die Level-Karte, wenn welche da sind
    renderTiles(); lvLoad();
  }
  let LV = null;
  async function lvLoad() {
    const box = q('[data-hxlv]'); if (!box) return;
    if (!konto2()) { box.innerHTML = `<div class="hx-lv" data-hxacct><div class="hx-ring" style="--p:0"><b>?</b></div><div><b>Hub-Level & Wochen-Aufgaben</b><br><small>Melde dich mit deinem Konto an: Jedes Spiel gibt Erfahrung, Level schalten Namensfarben frei.</small></div><span>›</span></div>`; return; }
    const r = await call('hub_state'); if (r.error) return; LV = r; lvCard();
    if (r.news && r.news.lv) levelUp(r.news.lv);
  }
  function lvCard() {
    const box = q('[data-hxlv]'); if (!box || !LV) return;
    const p = Math.round((LV.into / LV.need) * 100);
    box.innerHTML = `<div class="hx-lv" data-hxquests><div class="hx-ring" style="--p:${p}"><b>${LV.lv}</b></div>
      <div><b>Level ${LV.lv} · ${esc2(LV.title)}</b><div class="bar"><i style="width:${p}%"></i></div><small>${LV.into} / ${LV.need} EP bis Level ${LV.lv + 1}</small></div>
      <div style="text-align:right"><small>Wochen-Aufgaben</small><div class="hx-q">${LV.quests.map(x => `<i class="${x.done ? 'd' : ''}"></i>`).join('')}</div></div></div>`;
  }
  function panel() {
    if (!LV) return;
    const d = Math.floor(LV.weekLeft / 864e5), hh = Math.floor((LV.weekLeft % 864e5) / 36e5);
    const P = document.createElement('div'); P.className = 'hx-panel';
    P.innerHTML = `<div class="hx-sheet"><div class="row" style="justify-content:space-between;align-items:center"><h2>📜 Wochen-Aufgaben</h2><button class="btn ghost small" data-hxx>✕</button></div>
      <p class="note">Neue Aufgaben in ${d} T ${hh} Std. · Jede erledigte Aufgabe gibt Bonus-EP.</p>
      ${LV.quests.map(x => `<div class="hx-quest ${x.done ? 'd' : ''}"><b>${x.done ? '✅ ' : ''}${esc2(x.t)}</b><span class="note">+${x.xp} EP</span><div class="bar"><i style="width:${Math.round((x.p / x.n) * 100)}%"></i></div><small class="note">${x.p} / ${x.n}</small></div>`).join('')}
      <h2>🎨 Namensfarbe</h2><p class="note">Wird in Runden und Lobbys neben deinem Level angezeigt.</p>
      <div class="hx-cols">${LV.colors.map(c => `<button data-hxcol="${c.id}" class="${LV.nc === c.id ? 'on' : ''}" ${LV.lv < c.lv ? 'disabled' : ''}><span class="hbn ${['gold', 'fire', 'rainbow', 'galaxy'].includes(c.css) ? 'nc-' + c.css : ''}" style="${c.css && !['gold', 'fire', 'rainbow', 'galaxy'].includes(c.css) ? 'color:' + c.css : ''}">${esc2(c.n)}</span>${LV.lv < c.lv ? ` · Lv ${c.lv}` : ''}</button>`).join('')}</div>
      <h2>🏅 Titel</h2><p class="note">${LV.titles.map(([l, n]) => `<span style="${LV.lv >= l ? 'color:var(--accent);font-weight:800' : ''}">Lv ${l} ${esc2(n)}</span>`).join(' · ')}</p>
      <p class="note">EP gibt es für jede Runde im Hub (Sieg = mehr), gelöste Tagesrätsel, Wörtle und Turmwacht.</p></div>`;
    document.body.appendChild(P);
    P.addEventListener('click', async e => {
      if (e.target === P || e.target.closest('[data-hxx]')) { P.remove(); return; }
      const c = e.target.closest('[data-hxcol]'); if (c && !c.disabled) { const r = await call('hub_color', { c: c.dataset.hxcol }); if (r.error) { toast(r.error); return; } LV = r; P.remove(); lvCard(); panel(); toast('Namensfarbe gespeichert – sie erscheint ab deiner nächsten Runde.'); }
    });
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-hxquests]')) panel();
    if (e.target.closest('[data-hxrooms]')) { const r = q('#rooms'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (e.target.closest('[data-hxacct]')) { const b = q('[data-acct="open"]'); if (b) { b.click(); b.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  });
  function levelUp(lv) {
    const o = document.createElement('div'); o.className = 'hx-up';
    o.innerHTML = `<div><div style="font:400 26px var(--display);color:#fff">LEVEL UP!</div><div class="n">${lv}</div><div style="color:#fff;font-weight:800">${LV ? esc2(LV.title) : ''}</div><p class="note" style="color:#ddd">Tippen zum Schließen</p></div>`;
    document.body.appendChild(o); o.addEventListener('click', () => o.remove()); setTimeout(() => o.remove(), 4500);
    if (window.g3confetti) g3confetti(120);
  }
  window.addEventListener('fsg-hubxp', e => {
    const m = e.detail || {}; const t = document.createElement('div'); t.className = 'hx-xp'; t.textContent = `+${m.g} EP${m.win ? ' · Sieg! 🏆' : ''}`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2700);
    const old = LV && LV.lv; setTimeout(async () => { const r = await call('hub_state'); if (r.error) return; LV = r; lvCard(); if (old && r.lv > old) levelUp(r.lv); }, 600);
  });
  window.addEventListener('fsg-konto', () => setTimeout(lvLoad, 300));
  // Zahlen im Kopf: offene Runden
  setInterval(() => { const e = q('[data-hxrooms]'); if (e && typeof rooms !== 'undefined') e.textContent = `${rooms.length} offene Runde${rooms.length === 1 ? '' : 'n'}`; }, 1500);
  // Zurück zum Hub (nach Rätseln, Turmwacht …): Level neu laden
  new MutationObserver(() => { const hub = q('#hub'); if (hub && !hub.hidden && konto2() && (!lvLoad.t || Date.now() - lvLoad.t > 15000)) { lvLoad.t = Date.now(); lvLoad(); } }).observe(q('#hub'), { attributes: true, attributeFilter: ['hidden'] });
  window.HubUI = { renderTiles, refresh: lvLoad };
  build();
})();
