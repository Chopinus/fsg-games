'use strict';
// Kristallduell-Zentrale: Packs öffnen, Sammlung, Deck-Bau, Bot-Leiter, Tagesaufgaben. Daten: kd_konto.js (Server)
(function () {
  const K = window.DuellKarten; if (!K) return;
  const { C, F, RAR, B, LADDER, PACK } = K;
  const css = `
  #kdz{position:fixed;inset:0;z-index:9500;background:radial-gradient(ellipse at 50% -10%,#3a1f6a,#0d0a18 70%);color:var(--fg);display:flex;flex-direction:column;animation:kdzin .25s ease-out both;font-family:var(--body)}
  @keyframes kdzin{from{opacity:0;transform:scale(.98)}}
  #kdz .zh{display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px;flex-wrap:wrap}
  #kdz .zh h2{margin:0;font:400 26px var(--display);flex:1;min-width:150px;background:linear-gradient(90deg,#9ff3ff,#b45cff,#ffd23f);-webkit-background-clip:text;background-clip:text;color:transparent}
  #kdz .cur{display:flex;gap:6px;flex-wrap:wrap}
  #kdz .cur span{padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);font-weight:800;font-size:14px;white-space:nowrap}
  #kdz .cur span.bump{animation:kdzbump .5s}
  @keyframes kdzbump{40%{transform:scale(1.25);background:rgba(255,210,63,.35)}}
  #kdz .zx{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:18px;cursor:pointer}
  #kdz .tabs{display:flex;gap:6px;padding:0 14px 8px;overflow-x:auto;scrollbar-width:none;flex:none}
  #kdz .tabs button{flex:none;border:1px solid #4a3f66;background:#1d1830;color:#cfc6e6;padding:9px 14px;border-radius:12px;font:700 14px var(--body);cursor:pointer}
  #kdz .tabs button.on{background:linear-gradient(135deg,#6a3fd6,#3a6ad6);color:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(90,60,220,.45)}
  #kdz .zb{flex:1;overflow-y:auto;padding:6px 14px calc(env(safe-area-inset-bottom,0px) + 24px);-webkit-overflow-scrolling:touch}
  #kdz .wrap{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
  #kdz h3{margin:6px 0 2px;font-size:17px}
  #kdz .box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:12px 14px}
  #kdz .big2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
  #kdz .bigb{border:0;border-radius:18px;padding:18px;text-align:left;color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:4px;font:inherit;transition:transform .15s;box-shadow:0 10px 24px rgba(0,0,0,.4)}
  #kdz .bigb:hover{transform:translateY(-3px)} #kdz .bigb b{font-size:19px} #kdz .bigb .e{font-size:36px}
  #kdz .q{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)} #kdz .q:last-child{border:0}
  #kdz .q .bar{flex:1;height:8px;border-radius:4px;background:#2a2340;overflow:hidden;max-width:160px} #kdz .q .bar i{display:block;height:100%;background:linear-gradient(90deg,#3dff8a,#22c4a0)}
  #kdz .q.done{opacity:.6} #kdz .q .t{flex:2;min-width:0}
  #kdz .packs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
  .kdz-pack{position:relative;aspect-ratio:.72;border-radius:16px;border:2px solid color-mix(in srgb,var(--c1) 60%,#fff);background:linear-gradient(160deg,var(--c1),var(--c2));color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font:inherit;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.45),inset 0 0 30px rgba(255,255,255,.12);transition:transform .2s}
  .kdz-pack::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 10px,transparent 10px 20px)}
  .kdz-pack:hover{transform:translateY(-4px) rotate(-1deg)}
  .kdz-pack .e{font-size:54px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5));position:relative} .kdz-pack b{font:400 20px var(--display);position:relative;text-align:center;line-height:1.1}
  .kdz-pack .pr{position:relative;background:rgba(0,0,0,.4);padding:4px 12px;border-radius:99px;font-weight:800;font-size:14px}
  .kdz-pack .pr.free{background:#3dff8a;color:#003a10}
  .kdz-pack[disabled]{filter:grayscale(.6) brightness(.7);cursor:not-allowed}
  #kdz .pity{display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:#cfc6e6}
  #kdz .pity span{padding:4px 10px;border-radius:10px;background:rgba(255,255,255,.06)}
  #kdz .chips{display:flex;gap:6px;flex-wrap:wrap}
  #kdz .chips button{border:1px solid #4a3f66;background:#1d1830;color:#cfc6e6;padding:6px 11px;border-radius:99px;font:700 13px var(--body);cursor:pointer}
  #kdz .chips button.on{background:#ffd23f;color:#2a1a00;border-color:#ffd23f}
  #kdz .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:16px 10px;justify-items:center;padding-top:8px}
  #kdz .cw{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer}
  #kdz .cw .cnt{position:absolute;top:-8px;right:-4px;z-index:3;background:#1d1830;border:1px solid #6a5a9a;border-radius:10px;padding:1px 7px;font-size:12px;font-weight:800}
  #kdz .cw .prog{width:96px;height:6px;border-radius:3px;background:#2a2340;overflow:hidden} #kdz .cw .prog i{display:block;height:100%;background:linear-gradient(90deg,#ffd23f,#ff8a3d)}
  #kdz .cw .pl{font-size:11px;color:var(--muted)}
  .kd-card.miss{filter:grayscale(1) brightness(.35)}
  #kdz .cw .lock{position:absolute;top:22px;z-index:3;font-size:26px}
  #kdz .ed{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:14px;align-items:start}
  @media (max-width:760px){#kdz .ed{grid-template-columns:1fr}}
  #kdz .dl{display:flex;flex-direction:column;gap:3px;max-height:60vh;overflow-y:auto}
  @media (max-width:760px){#kdz .dl{max-height:none}}
  #kdz .dr{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:10px;background:linear-gradient(90deg,color-mix(in srgb,var(--c1) 45%,transparent),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);cursor:pointer;font-size:14px}
  #kdz .dr .c{width:22px;height:24px;display:grid;place-items:center;font-weight:800;font-size:12px;background:linear-gradient(160deg,#9ff3ff,#1e8fff 60%,#1450b0);clip-path:polygon(50% 0,100% 30%,85% 100%,15% 100%,0 30%)}
  #kdz .dr .n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #kdz .dr .x{color:#ffd23f;font-weight:800}
  #kdz .dr:hover{filter:brightness(1.2)}
  #kdz .stat{display:flex;gap:8px;flex-wrap:wrap;font-size:13px} #kdz .stat span{padding:3px 9px;border-radius:9px;background:rgba(255,255,255,.07)} #kdz .stat .ok{background:rgba(61,255,138,.18);color:#9fffc4} #kdz .stat .bad{background:rgba(255,90,90,.18);color:#ffb0b0}
  #kdz .curve{display:flex;align-items:flex-end;gap:4px;height:54px} #kdz .curve div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-size:10px;color:var(--muted);height:100%} #kdz .curve i{display:block;width:100%;background:linear-gradient(#9ff3ff,#1e8fff);border-radius:3px 3px 0 0;min-height:2px}
  #kdz input.nm{font-size:16px;padding:8px 12px;border-radius:10px;border:1px solid #4a3f66;background:#151121;color:#fff;width:100%}
  #kdz .cw .indeck{position:absolute;bottom:22px;z-index:3;background:#ffd23f;color:#2a1a00;border-radius:9px;padding:1px 8px;font-size:12px;font-weight:800}
  #kdz .lad{display:flex;flex-direction:column;gap:8px}
  #kdz .lr{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:16px;background:linear-gradient(90deg,color-mix(in srgb,var(--c1) 35%,#1d1830),#1d1830);border:1px solid rgba(255,255,255,.1);animation:kdzoom .4s both}
  #kdz .lr .a{font-size:34px;width:46px;text-align:center} #kdz .lr .i{flex:1;min-width:0} #kdz .lr .i b{display:block;font-size:16px} #kdz .lr .i small{color:var(--muted);display:block}
  #kdz .lr.lock{filter:grayscale(.8) brightness(.6)} #kdz .lr.done .a::after{content:"✅";font-size:14px;position:relative;left:-8px;top:12px}
  #kdpk{position:fixed;inset:0;z-index:9600;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--c1) 35%,#0d0a18),#05030c 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:16px;animation:kdzin .25s both;overflow:hidden}
  #kdpk .pk{width:min(220px,56vw);font-size:16px;animation:kdpkw .9s ease-in-out infinite}
  @keyframes kdpkw{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg) scale(1.04)}}
  #kdpk .pk.boom{animation:kdpkb .5s ease-in forwards}
  @keyframes kdpkb{60%{transform:scale(1.25);filter:brightness(2.5)}100%{transform:scale(1.8);opacity:0;filter:brightness(4) blur(6px)}}
  #kdpk .flash{position:absolute;inset:0;background:#fff;animation:kdflash .6s ease-out forwards;pointer-events:none}
  @keyframes kdflash{from{opacity:.9}to{opacity:0}}
  #kdpk .row5{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:720px}
  .kdf{position:relative;width:104px;height:148px;perspective:800px;cursor:pointer;animation:kdfin .5s cubic-bezier(.2,1.3,.4,1) both}
  @keyframes kdfin{from{transform:translateY(-60px) scale(.3) rotate(-20deg);opacity:0}}
  .kdf .fl{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.3,1.4,.5,1)}
  .kdf.open .fl{transform:rotateY(180deg)}
  .kdf .bk,.kdf .fr{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
  .kdf .fr{transform:rotateY(180deg)} .kdf .fr .kd-card{margin:0}
  .kdf .bk{border-radius:12px;border:2px solid #8a7ab8;background:radial-gradient(circle at 50% 40%,#5a3fa0,#1a1030);display:grid;place-items:center;font-size:40px;box-shadow:0 8px 18px rgba(0,0,0,.55),0 0 var(--gw,0) var(--rc)}
  .kdf .bk::after{content:"";position:absolute;inset:6px;border-radius:8px;border:1px dashed rgba(255,255,255,.25)}
  .kdf.r-e .bk{--gw:22px;animation:kdglow 1.2s ease-in-out infinite}.kdf.r-l .bk{--gw:34px;animation:kdglow .8s ease-in-out infinite}.kdf.r-s .bk{--gw:10px}
  @keyframes kdglow{50%{box-shadow:0 8px 18px rgba(0,0,0,.55),0 0 calc(var(--gw) * 1.8) var(--rc)}}
  .kdf .lbl{position:absolute;left:50%;bottom:-30px;transform:translateX(-50%);white-space:nowrap;font-weight:800;font-size:13px;opacity:0;transition:opacity .3s .4s}
  .kdf.open .lbl{opacity:1} .lbl.new{color:#3dff8a}.lbl.up{color:#ffd23f}.lbl.dust{color:#9fe9ff}.lbl.n{color:#cfc6e6}
  #kdpk .leg{position:absolute;top:18%;left:50%;white-space:nowrap;font:400 clamp(40px,10vw,80px) var(--display);color:#ffb020;text-shadow:0 0 30px #ff8a00,0 4px 0 #6a3a00;animation:kdban 1.8s ease-out forwards;pointer-events:none;z-index:2}
  #kdpk .rays{position:absolute;width:900px;height:900px;left:50%;top:50%;margin:-450px 0 0 -450px;background:repeating-conic-gradient(rgba(255,190,60,.18) 0 8deg,transparent 8deg 20deg);animation:kdrays 6s linear infinite;pointer-events:none;opacity:0;transition:opacity .6s}
  #kdpk .rays.on{opacity:1}
  @keyframes kdrays{to{transform:rotate(360deg)}}
  #kdpk .acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:24px;min-height:44px}
  #kdpk .msg{font:400 22px var(--display);color:#fff;text-align:center}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const q = s => document.querySelector(s);
  const fc = f => F[f] || { col: '#6a6a8a', col2: '#262636', e: '🎲', n: 'Gemischt' };
  const cv = f => `--c1:${fc(f).col};--c2:${fc(f).col2}`;
  const card = (id, o) => window.KDcard(id, o);
  const me = () => (typeof konto !== 'undefined' && konto) || null;
  const Z = { tab: 'spielen', st: null, th: 'alle', ra: 'alle', miss: false, ed: null, edTh: 'alle', busy: false, err: '' };
  async function call(a, body) {
    const k = me(); if (!k) return { error: 'login' };
    try { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: k.name, token: k.token, ...(body || {}) }) }); return await r.json(); } catch { return { error: 'Keine Verbindung.' }; }
  }
  async function load() { if (!me()) { Z.st = null; return; } const r = await call('kd_state'); if (r.error) { Z.err = r.error; return; } Z.st = r; Z.err = ''; }
  function setState(s, bump) { const old = Z.st; Z.st = s; render(); if (bump && old) for (const k of ['f', 'st', 'free']) if (old[k] !== s[k]) { const e = q(`#kdz [data-cur="${k}"]`); if (e) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } } }
  async function open(tab) {
    Z.tab = tab || Z.tab || 'spielen'; if (Z.tab === 'decks' && !Z.ed) Z.ed = null;
    let el = q('#kdz'); if (!el) { el = document.createElement('div'); el.id = 'kdz'; document.body.appendChild(el); document.documentElement.style.overflow = 'hidden'; }
    render(); await load(); render();
  }
  function close() { const el = q('#kdz'); if (el) el.remove(); document.documentElement.style.overflow = ''; Z.ed = null; }
  const TABS = [['spielen', '⚔️ Spielen'], ['packs', '🎁 Packs'], ['samml', '🃏 Sammlung'], ['decks', '📦 Decks'], ['leiter', '🏆 Bot-Leiter']];
  function render() {
    const el = q('#kdz'); if (!el) return;
    const s = Z.st, sc = el.querySelector('.zb') ? el.querySelector('.zb').scrollTop : 0;
    el.innerHTML = `<div class="zh"><h2>💎 Kristallduell</h2><div class="cur">${s ? `<span data-cur="f" title="Funken: bekommst du fürs Spielen">🪙 ${s.f}</span><span data-cur="st" title="Sternenstaub: zum Herstellen fehlender Karten">✨ ${s.st}</span>${s.free ? `<span data-cur="free" title="Gratis-Packs">🎁 ${s.free}</span>` : ''}` : ''}</div><button class="zx" data-kdzx="1" aria-label="Schließen">✕</button></div>
      <div class="tabs">${TABS.map(([k, n]) => `<button class="${Z.tab === k ? 'on' : ''}" data-kdzt="${k}">${n}</button>`).join('')}</div><div class="zb"><div class="wrap">${body()}</div></div>`;
    const zb = el.querySelector('.zb'); if (zb && Z.keepScroll) zb.scrollTop = sc; Z.keepScroll = false;
  }
  const needLogin = what => `<div class="box center"><p>Melde dich mit deinem Hub-Konto an, um ${what}.</p><p class="note">Ohne Konto kannst du trotzdem mit den Grunddecks spielen – gegen Freunde oder den Bot.</p><button class="btn" data-kdzlogin="1">Anmelden</button></div>`;
  function body() {
    const s = Z.st;
    if (Z.tab === 'spielen') return tabPlay(s);
    if (!me()) return needLogin(Z.tab === 'packs' ? 'Packs zu öffnen' : Z.tab === 'samml' ? 'Karten zu sammeln' : Z.tab === 'decks' ? 'eigene Decks zu bauen' : 'die Bot-Leiter zu erklimmen');
    if (!s) return `<p class="note center">${Z.err ? esc(Z.err) : 'Lädt …'}</p>`;
    if (Z.tab === 'packs') return tabPacks(s);
    if (Z.tab === 'samml') return tabColl(s);
    if (Z.tab === 'decks') return Z.ed ? tabEdit(s) : tabDecks(s);
    if (Z.tab === 'leiter') return tabLadder(s);
    return '';
  }
  function tabPlay(s) {
    const tot = Object.values(C).filter(c => !c.tok).length, own = s ? Object.keys(s.c).filter(id => C[id] && !C[id].tok && s.c[id] > 0).length : 0;
    return `<div class="big2">
      <button class="bigb" data-kdzgo="friends" style="background:linear-gradient(135deg,#6a3fd6,#2a1a6a)"><span class="e">👥</span><b>Gegen Freunde</b><span>Runde erstellen und Freunde einladen</span></button>
      <button class="bigb" data-kdzgo="0" style="background:linear-gradient(135deg,#1f6a8a,#0b2a3a)"><span class="e">🤖</span><b>Übungs-Bot</b><span>Locker üben, gibt etwas Funken</span></button>
      <button class="bigb" data-kdzt="leiter" style="background:linear-gradient(135deg,#a8790a,#3a2a00)"><span class="e">🏆</span><b>Bot-Leiter</b><span>${s ? `Stufe ${s.lad}/${LADDER.length} geschafft` : '10 Gegner, immer stärker'}</span></button></div>
      ${s ? `<div class="box"><h3>📅 Tagesaufgaben</h3>${s.dq.map(x => `<div class="q ${x.done ? 'done' : ''}"><span class="t">${x.done ? '✅' : '🎯'} ${esc(x.t)}</span><span class="bar"><i style="width:${(x.n / x.g) * 100}%"></i></span><span>${x.n}/${x.g}</span><span>+60 🪙</span></div>`).join('')}
        <div class="q ${s.dfw ? 'done' : ''}"><span class="t">${s.dfw ? '✅' : '🌅'} Erster Sieg des Tages</span><span>+60 🪙</span></div></div>
        <div class="box"><h3>📊 Deine Sammlung</h3><p style="margin:4px 0">${own} von ${tot} Karten · ${s.packs} Packs geöffnet · ${s.decks.length} eigene Decks</p><p class="note" style="margin:0">Funken gibt es für jedes Duell (Siege zählen mehr), für Tagesaufgaben und für neue Stufen der Bot-Leiter.</p></div>` : `<div class="box">${needLogin('Karten zu sammeln, Packs zu öffnen und eigene Decks zu bauen')}</div>`}
      <div class="box"><h3>⭐ Kartenstufen</h3><p class="note" style="margin:4px 0">Ziehst du eine Karte mehrfach, steigt ihre Stufe – nur das Aussehen ändert sich, nicht die Stärke:</p>
        <div class="stat"><span>★★ Silberrahmen</span><span>★★★ Goldrahmen mit Glanz</span><span>★★★★ leuchtet + Angriffs-Effekt</span><span>★★★★★ Prisma-Rahmen, Aura und Einschlag</span></div></div>
      <div class="box"><h3>🎨 Themen-Boni</h3><p class="note" style="margin:4px 0">Ab ${K.BONUS_MIN} Karten eines Themas im Deck. Du kannst Themen frei mischen – mit 10/10/10 hast du sogar drei Boni.</p>${Object.entries(B).map(([f, b]) => `<div>${fc(f).e} <b>${b[0]}</b> – ${b[1]}</div>`).join('')}</div>`;
  }
  function tabPacks(s) {
    const can = s.free > 0 || s.f >= PACK.cost;
    const pk = (th, i) => { const f = fc(th === 'mix' ? null : th); return `<button class="kdz-pack" data-kdzpack="${th}" style="${th === 'mix' ? '--c1:#b45cff;--c2:#1f3a8a' : cv(th)};animation:kdzoom .4s ${i * 0.05}s both" ${can ? '' : 'disabled'}><span class="e">${th === 'mix' ? '💎' : f.e}</span><b>${th === 'mix' ? 'Kristallpack' : f.n + '-Pack'}</b><span class="note" style="position:relative;color:#eee;font-size:12px">${th === 'mix' ? 'alle Themen' : 'nur ' + f.n + '-Karten'}</span><span class="pr ${s.free ? 'free' : ''}">${s.free ? 'Gratis' : PACK.cost + ' 🪙'}</span></button>`; };
    return `<div class="box"><div class="pity"><span>📦 ${PACK.size} Karten pro Pack, mindestens eine seltene</span><span>💜 Epische Karte garantiert in spätestens <b>${PACK.pityE - s.pe}</b> Packs</span><span>🧡 Legendäre Karte garantiert in spätestens <b>${PACK.pityL - s.pl}</b> Packs</span></div>
      <div class="pity" style="margin-top:6px">${Object.entries(RAR).map(([k, r]) => `<span style="color:${r.col}">◆ ${r.n} ${PACK.odds[k]} %</span>`).join('')}</div></div>
      ${can ? '' : `<p class="note center">Du brauchst ${PACK.cost} 🪙 für ein Pack – spiel ein paar Duelle!</p>`}
      <div class="packs">${['mix', ...Object.keys(F)].map(pk).join('')}</div>`;
  }
  const progOf = (id, n) => { const t = RAR[C[id].r].lv, lv = K.levelOf(id, n); if (lv >= 5) return [1, 'Höchste Stufe']; const a = t[lv - 1] || 0, b = t[lv]; return [(n - a) / (b - a), `${n}/${b} für ★${lv + 1}`]; };
  function filterIds(th, ra, miss, s, onlyOwned) {
    return Object.entries(C).filter(([id, c]) => !c.tok && (th === 'alle' || c.f === th) && (ra === 'alle' || c.r === ra) && (!miss || !(s.c[id] > 0)) && (!onlyOwned || s.c[id] > 0))
      .sort((a, b) => Object.keys(F).indexOf(a[1].f) - Object.keys(F).indexOf(b[1].f) || a[1].c - b[1].c || a[1].n.localeCompare(b[1].n)).map(([id]) => id);
  }
  const themeChips = (cur, attr) => `<div class="chips"><button class="${cur === 'alle' ? 'on' : ''}" ${attr}="alle">Alle</button>${Object.entries(F).map(([k, f]) => `<button class="${cur === k ? 'on' : ''}" ${attr}="${k}">${f.e} ${f.n}</button>`).join('')}</div>`;
  function tabColl(s) {
    const ids = filterIds(Z.th, Z.ra, Z.miss, s);
    const all = filterIds(Z.th, 'alle', false, s), have = all.filter(id => s.c[id] > 0).length;
    return `<div class="box" style="display:flex;flex-direction:column;gap:8px">${themeChips(Z.th, 'data-kdzth')}
      <div class="chips"><button class="${Z.ra === 'alle' ? 'on' : ''}" data-kdzra="alle">Jede Seltenheit</button>${Object.entries(RAR).map(([k, r]) => `<button class="${Z.ra === k ? 'on' : ''}" data-kdzra="${k}" style="color:${Z.ra === k ? '' : r.col}">◆ ${r.n}</button>`).join('')}<button class="${Z.miss ? 'on' : ''}" data-kdzmiss="1">🔒 Nur fehlende</button></div>
      <span class="note">${have} von ${all.length} Karten · ✨ ${s.st} Sternenstaub zum Herstellen</span></div>
      <div class="grid">${ids.map(id => { const n = s.c[id] || 0, lv = K.levelOf(id, n); const [p, t] = n ? progOf(id, n) : [0, `${RAR[C[id].r].craft} ✨`];
        return `<div class="cw" data-kdzcard="${id}">${n ? `<span class="cnt">×${n}</span>` : '<span class="lock">🔒</span>'}${card(id, { lv: Math.max(1, lv), cls: n ? '' : 'miss' })}${n ? `<span class="prog"><i style="width:${p * 100}%"></i></span>` : ''}<span class="pl">${t}</span></div>`; }).join('') || '<p class="note">Keine Karten für diesen Filter.</p>'}</div>`;
  }
  const LVTXT = ['', 'Grundkarte', 'Silberrahmen', 'Goldrahmen mit Glanz', 'Leuchten und Angriffs-Effekt', 'Prisma-Rahmen, Aura und Einschlag'];
  function showCard(id) {
    const s = Z.st, n = s.c[id] || 0, lv = K.levelOf(id, n), R = RAR[C[id].r], max = R.lv[4];
    const o = document.createElement('div'); o.className = 'kd-pop'; o.style.zIndex = 9700;
    o.innerHTML = `${card(id, { cls: 'big', lv: Math.max(1, lv) })}<div class="kd-rew" style="max-width:340px"><div><b style="color:${R.col};font-size:15px">◆ ${R.n}</b> · ${fc(C[id].f).e} ${fc(C[id].f).n} · höchstens ${R.max}× pro Deck</div>
      <div>${n ? `Du besitzt <b style="font-size:15px">${n}</b> · Stufe ${'★'.repeat(lv)} (${LVTXT[lv]})` : 'Noch nicht in deiner Sammlung.'}</div>
      ${lv < 5 ? `<div class="note">${R.lv.map((t, i) => `★${i + 1}: ${t}×`).join(' · ')}</div>` : ''}
      ${n >= max ? '<div class="note">Weitere Kopien werden zu Sternenstaub (+' + R.dust + ' ✨).</div>' : ''}</div>
      <div class="row" style="justify-content:center;gap:8px">${n < max ? `<button class="btn" data-kdzcraft="${id}" ${s.st < R.craft ? 'disabled' : ''}>✨ Herstellen (${R.craft})</button>` : ''}<button class="btn ghost" data-kdx="1">Schließen</button></div>`;
    document.body.appendChild(o);
    o.addEventListener('click', async e => {
      if (e.target === o || e.target.closest('[data-kdx]')) { o.remove(); return; }
      const b = e.target.closest('[data-kdzcraft]'); if (!b || Z.busy) return;
      Z.busy = true; const r = await call('kd_craft', { id }); Z.busy = false;
      if (r.error) { toast(r.error); return; } o.remove(); Z.keepScroll = true; setState(r.state, true);
      toast(r.up ? `✨ ${C[id].n} erreicht Stufe ${r.lv}!` : `✨ ${C[id].n} hergestellt`); showCard(id);
    });
  }
  function tabDecks(s) {
    return `<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-kdzed="new">➕ Neues Deck</button><span class="note">Regeln: genau ${K.DECK_SIZE} Karten, mindestens ${K.MIN_CRE} Kreaturen, jede Karte höchstens 3× (episch 2×, legendär 1×). Themen darfst du frei mischen.</span></div>
      ${s.decks.length ? `<div class="kd-decks">${s.decks.map((d, i) => { const th = K.mainTheme(d.cards), n = Object.values(d.cards).reduce((a, b) => a + b, 0), bo = K.bonusesOf(d.cards); return `<button class="kd-dk ${d.err ? '' : 'mine'}" data-kdzed="${i}" style="${cv(th)};animation-delay:${i * 0.05}s"><span class="e">${fc(th).e}</span><b>${esc(d.n)}</b><small>${n}/${K.DECK_SIZE} Karten${bo.length ? ' · Bonus ' + bo.map(b => fc(b).e).join('') : ''}</small><small>${d.err ? '⚠️ ' + esc(d.err) : '✅ spielbereit'}</small></button>`; }).join('')}</div>` : '<p class="note center">Noch keine eigenen Decks. Starte mit einem leeren Deck oder einer Kopie eines Grunddecks.</p>'}
      <h3>🃏 Grunddecks als Vorlage</h3><div class="kd-decks">${Object.keys(K.DECKS).map(f => `<button class="kd-dk" data-kdzcopy="${f}" style="${cv(f)}"><span class="e">${fc(f).e}</span><b>Grunddeck ${fc(f).n}</b><small>Als eigenes Deck kopieren und anpassen</small></button>`).join('')}</div>`;
  }
  const deckN = cards => Object.values(cards).reduce((a, b) => a + b, 0);
  function tabEdit(s) {
    const d = Z.ed, n = deckN(d.cards), cre = Object.entries(d.cards).reduce((a, [id, k]) => a + (C[id].t === 'k' ? k : 0), 0), th = K.themesOf(d.cards), err = K.checkDeck(d.cards, s.c);
    const curve = [1, 2, 3, 4, 5, 6, 7].map(c => Object.entries(d.cards).reduce((a, [id, k]) => a + ((c === 7 ? C[id].c >= 7 : C[id].c === c) ? k : 0), 0)), mx = Math.max(4, ...curve);
    const list = Object.entries(d.cards).sort((a, b) => C[a[0]].c - C[b[0]].c || C[a[0]].n.localeCompare(C[b[0]].n));
    const pool = filterIds(Z.edTh, 'alle', false, s, true);
    return `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn ghost small" data-kdzback="1">‹ Zurück</button><input class="nm" data-kdzname="1" maxlength="24" value="${esc(d.n)}" style="flex:1;min-width:160px"><button class="btn" data-kdzsave="1">💾 Speichern</button>${d.i >= 0 ? '<button class="btn ghost small" data-kdzdel="1">🗑 Löschen</button>' : ''}</div>
      <div class="ed"><div class="box" style="display:flex;flex-direction:column;gap:8px">
        <div class="stat"><span class="${n === K.DECK_SIZE ? 'ok' : 'bad'}">🃏 ${n}/${K.DECK_SIZE}</span><span class="${cre >= K.MIN_CRE ? 'ok' : 'bad'}">🐾 ${cre} Kreaturen (min. ${K.MIN_CRE})</span></div>
        <div class="stat">${Object.entries(th).sort((a, b) => b[1] - a[1]).map(([f, k]) => `<span class="${k >= K.BONUS_MIN ? 'ok' : ''}" title="${esc(B[f][0] + ': ' + B[f][1])}">${fc(f).e} ${k}${k >= K.BONUS_MIN ? ' ✓ ' + B[f][0] : `/${K.BONUS_MIN}`}</span>`).join('') || '<span>Noch leer</span>'}</div>
        <div class="curve">${curve.map((k, i) => `<div><span>${k || ''}</span><i style="height:${(k / mx) * 38}px"></i>${i === 6 ? '7+' : i + 1}</div>`).join('')}</div>
        ${err && n ? `<span class="note" style="color:#ffb0b0">⚠️ ${esc(err)}</span>` : ''}
        <div class="dl">${list.map(([id, k]) => `<div class="dr" data-kdzrm="${id}" style="${cv(C[id].f)}" title="Antippen zum Entfernen"><span class="c">${C[id].c}</span><span>${C[id].art}</span><span class="n" style="color:${RAR[C[id].r].col === '#b8b8c8' ? '#fff' : RAR[C[id].r].col}">${esc(C[id].n)}</span><span class="x">×${k}</span></div>`).join('') || '<p class="note">Tippe unten auf Karten, um sie hinzuzufügen.</p>'}</div></div>
        <div style="display:flex;flex-direction:column;gap:8px">${themeChips(Z.edTh, 'data-kdzeth')}<div class="grid">${pool.map(id => { const k = d.cards[id] || 0, mx2 = Math.min(RAR[C[id].r].max, s.c[id] || 0); return `<div class="cw" data-kdzadd="${id}" style="${k >= mx2 ? 'opacity:.45' : ''}">${card(id, { lv: Math.max(1, K.levelOf(id, s.c[id])) })}${k ? `<span class="indeck">${k}/${mx2} im Deck</span>` : ''}<span class="pl">${s.c[id]}× im Besitz</span></div>`; }).join('')}</div></div></div>`;
  }
  function tabLadder(s) {
    return `<p class="note">Besiege die Gegner der Reihe nach. Jede neue Stufe gibt Funken und ein Gratis-Pack, die letzte sogar drei. Geschaffte Stufen kannst du jederzeit wiederholen.</p><div class="lad">${LADDER.map((L, i) => { const lv = i + 1, done = s.lad >= lv, open = lv <= s.lad + 1; const f = L.th[0];
      return `<div class="lr ${done ? 'done' : ''} ${open ? '' : 'lock'}" style="${cv(f)};animation-delay:${i * 0.04}s"><span class="a">${L.art}</span><span class="i"><b>${lv}. ${esc(L.n)}</b><small>${L.th.map(t => fc(t).e).join('')} · ❤️ ${L.life} Leben · ${L.r.includes('l') ? 'mit legendären Karten' : L.r.includes('e') ? 'mit epischen Karten' : L.r.includes('s') ? 'mit seltenen Karten' : 'nur gewöhnliche Karten'}</small><small>${done ? '✅ geschafft' : `Belohnung: ${100 + lv * 30} 🪙 + ${lv === LADDER.length ? 3 : 1} Gratis-Pack${lv === LADDER.length ? 's' : ''}`}</small></span>
        ${open ? `<button class="btn ${done ? 'ghost small' : ''}" data-kdzgo="${lv}">${done ? 'Nochmal' : '⚔️ Kämpfen'}</button>` : '<span style="font-size:22px">🔒</span>'}</div>`; }).join('')}</div>`;
  }
  // Pack öffnen mit Animation
  async function openPack(th) {
    if (Z.busy) return; Z.busy = true;
    const f = th === 'mix' ? { col: '#b45cff', col2: '#1f3a8a', e: '💎', n: 'Kristall' } : fc(th);
    const o = document.createElement('div'); o.id = 'kdpk'; o.style.cssText = `--c1:${f.col};--c2:${f.col2}`;
    o.innerHTML = `<div class="rays"></div><div class="kdz-pack pk" style="--c1:${f.col};--c2:${f.col2}"><span class="e">${f.e}</span><b>${th === 'mix' ? 'Kristallpack' : f.n + '-Pack'}</b></div><div class="msg">Wird geöffnet …</div>`;
    document.body.appendChild(o);
    const [r] = await Promise.all([call('kd_pack', { th }), new Promise(res => setTimeout(res, 1100))]);
    Z.busy = false;
    if (r.error) { o.remove(); toast(r.error); return; }
    o.querySelector('.pk').classList.add('boom'); const fl = document.createElement('div'); fl.className = 'flash'; o.appendChild(fl);
    await new Promise(res => setTimeout(res, 450));
    o.querySelector('.pk').remove(); o.querySelector('.msg').textContent = r.pity ? (r.pity === 'l' ? '🧡 Glücksschutz: legendäre Karte garantiert!' : '💜 Glücksschutz: epische Karte garantiert!') : 'Tippe die Karten an!';
    const row = document.createElement('div'); row.className = 'row5';
    row.innerHTML = r.cards.map((c, i) => `<div class="kdf r-${c.r}" data-i="${i}" style="--rc:${RAR[c.r].col};animation-delay:${i * 0.12}s"><div class="fl"><div class="bk">💎</div><div class="fr">${card(c.id, { lv: Math.max(1, c.lv) })}</div></div>
      <span class="lbl ${c.isNew ? 'new' : c.up ? 'up' : c.dust ? 'dust' : 'n'}">${c.isNew ? '✨ NEU!' : c.up ? `★ Stufe ${c.lv}!` : c.dust ? `+${c.dust} ✨ Staub` : `×${c.n}`}</span></div>`).join('');
    o.appendChild(row);
    const acts = document.createElement('div'); acts.className = 'acts'; acts.innerHTML = '<button class="btn" data-pk="all">Alle aufdecken</button>'; o.appendChild(acts);
    const flip = (el) => {
      if (el.classList.contains('open')) return; el.classList.add('open');
      const c = r.cards[Number(el.dataset.i)], rc = el.getBoundingClientRect(), at = [rc.left + rc.width / 2, rc.top + rc.height / 2];
      if (c.r === 'e' || c.r === 'l') setTimeout(() => window.KDfx && KDfx.burst(at, c.r === 'l' ? '🧡' : '💜', RAR[c.r].col), 300);
      if (c.r === 'l') { o.querySelector('.rays').classList.add('on'); const t = document.createElement('div'); t.className = 'leg'; t.textContent = 'LEGENDÄR!'; o.appendChild(t); setTimeout(() => t.remove(), 1900); if (navigator.vibrate) navigator.vibrate([60, 40, 120]); }
      if (c.up && c.lv >= 4) setTimeout(() => window.KDfx && KDfx.burst(at, '⭐', '#ffd23f'), 500);
      if (row.querySelectorAll('.kdf:not(.open)').length === 0) setTimeout(done, 700);
    };
    const done = () => { const can = r.state.free > 0 || r.state.f >= PACK.cost; acts.innerHTML = `${can ? `<button class="btn" data-pk="again">🎁 Noch ein Pack (${r.state.free ? 'Gratis' : PACK.cost + ' 🪙'})</button>` : ''}<button class="btn ghost" data-pk="close">Fertig</button>`; };
    o.addEventListener('click', e => {
      const k = e.target.closest('.kdf'); if (k) { if (k.classList.contains('open')) { const c = r.cards[Number(k.dataset.i)]; showCard(c.id); } else flip(k); return; }
      const b = e.target.closest('[data-pk]'); if (!b) return;
      if (b.dataset.pk === 'all') row.querySelectorAll('.kdf:not(.open)').forEach((el, i) => setTimeout(() => flip(el), i * 220));
      else if (b.dataset.pk === 'again') { o.remove(); openPack(th); }
      else o.remove();
    });
    setState(r.state, true);
  }
  function startGame(kind) {
    close();
    const lvl = kind === 'friends' ? null : Number(kind) || 0;
    if (typeof room !== 'undefined' && room && room.game === 'duell' && isHost() && lvl != null) { send({ t: 'start', bot: 1, lvl }); return; }
    if (typeof needNick === 'function' && !needNick()) return;
    window.KDZ.pending = lvl; send({ t: 'create', game: 'duell' });
  }
  document.addEventListener('click', async e => {
    const op = e.target.closest('[data-kdz]'); if (op) { e.preventDefault(); const t = op.dataset.kdz; open(TABS.some(x => x[0] === t) ? t : 'spielen'); return; }
    const el = q('#kdz'); if (!el || !el.contains(e.target)) return;
    const g = (a) => e.target.closest(`[${a}]`);
    let b;
    if (g('data-kdzx')) { close(); return; }
    if ((b = g('data-kdzt'))) { Z.tab = b.dataset.kdzt; Z.ed = null; render(); if (!Z.st && me()) { await load(); render(); } return; }
    if (g('data-kdzlogin')) { close(); const a = q('[data-acct="open"]'); if (a) { a.click(); a.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
    if ((b = g('data-kdzgo'))) { startGame(b.dataset.kdzgo); return; }
    if ((b = g('data-kdzpack'))) { if (!b.disabled) openPack(b.dataset.kdzpack); return; }
    if ((b = g('data-kdzth'))) { Z.th = b.dataset.kdzth; render(); return; }
    if ((b = g('data-kdzra'))) { Z.ra = b.dataset.kdzra; render(); return; }
    if (g('data-kdzmiss')) { Z.miss = !Z.miss; render(); return; }
    if ((b = g('data-kdzcard'))) { showCard(b.dataset.kdzcard); return; }
    if ((b = g('data-kdzed'))) { const i = b.dataset.kdzed; if (i === 'new') Z.ed = { i: -1, n: 'Mein Deck', cards: {} }; else { const d = Z.st.decks[Number(i)]; Z.ed = { i: Number(i), n: d.n, cards: { ...d.cards } }; } render(); return; }
    if ((b = g('data-kdzcopy'))) { const f = b.dataset.kdzcopy; Z.ed = { i: -1, n: 'Mein ' + fc(f).n + '-Deck', cards: { ...K.DECKS[f] } }; Z.edTh = f; render(); return; }
    if (g('data-kdzback')) { if (Z.ed && Z.ed.dirty && !confirm('Änderungen verwerfen?')) return; Z.ed = null; render(); return; }
    if ((b = g('data-kdzeth'))) { Z.edTh = b.dataset.kdzeth; Z.keepScroll = true; render(); return; }
    if ((b = g('data-kdzadd'))) {
      const id = b.dataset.kdzadd, d = Z.ed, k = d.cards[id] || 0, mx = Math.min(RAR[C[id].r].max, Z.st.c[id] || 0);
      if (k >= mx) { toast(k >= RAR[C[id].r].max ? `${C[id].n} darf höchstens ${RAR[C[id].r].max}× ins Deck.` : `Du besitzt ${C[id].n} nur ${Z.st.c[id] || 0}×.`); return; }
      if (deckN(d.cards) >= K.DECK_SIZE) { toast(`Das Deck ist voll (${K.DECK_SIZE} Karten).`); return; }
      d.cards[id] = k + 1; d.dirty = true; Z.keepScroll = true; render(); return;
    }
    if ((b = g('data-kdzrm'))) { const id = b.dataset.kdzrm, d = Z.ed; if (d.cards[id] > 1) d.cards[id]--; else delete d.cards[id]; d.dirty = true; Z.keepScroll = true; render(); return; }
    if (g('data-kdzsave')) {
      const d = Z.ed; d.n = (q('#kdz [data-kdzname]') || {}).value || d.n;
      const r = await call('kd_deck_save', { i: d.i, n: d.n, cards: d.cards }); if (r.error) { toast(r.error); return; }
      const err = r.state.decks[r.i] && r.state.decks[r.i].err; Z.ed = null; setState(r.state); toast(err ? `Gespeichert – noch nicht spielbereit: ${err}` : '✅ Deck gespeichert und spielbereit!'); return;
    }
    if (g('data-kdzdel')) { if (!confirm('Dieses Deck wirklich löschen?')) return; const r = await call('kd_deck_del', { i: Z.ed.i }); if (r.error) { toast(r.error); return; } Z.ed = null; setState(r.state); return; }
  });
  document.addEventListener('input', e => { if (e.target.matches && e.target.matches('#kdz [data-kdzname]') && Z.ed) { Z.ed.n = e.target.value; Z.ed.dirty = true; } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && q('#kdz') && !q('#kdpk') && !q('.kd-pop')) close(); });
  window.KDZ = { pending: null, open, close };
})();
