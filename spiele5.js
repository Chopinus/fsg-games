'use strict';
// Game Hub – Kristallduell (Browser-Seite). Karten: duell_karten.js · Regeln: duell.js
// Nutzt die Helfer aus app.js (room, act, send, esc, isHost, againHTML, toast).
(function () {
  const K = window.DuellKarten; if (!K) return;
  const { C, F, KW } = K;
  const css = `
  .kd{--gap:6px;width:min(100%,920px);margin:0 auto;display:flex;flex-direction:column;gap:8px;user-select:none;-webkit-user-select:none;position:relative}
  .kd-table{position:relative;border-radius:22px;padding:10px;background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--fo) 30%,transparent),transparent 60%),radial-gradient(ellipse at 50% 100%,color-mix(in srgb,var(--fm) 30%,transparent),transparent 60%),linear-gradient(180deg,#151026,#0d0a18);border:1px solid #3a3058;box-shadow:inset 0 0 60px rgba(0,0,0,.6),0 20px 50px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:8px;overflow:hidden}
  .kd-table::before{content:"";position:absolute;left:8%;right:8%;top:50%;height:1px;background:linear-gradient(90deg,transparent,#5a4d8a,transparent);opacity:.6}
  .kd-bar{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);position:relative;z-index:1}
  .kd-bar .who{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
  .kd-bar .av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:22px;background:radial-gradient(circle at 35% 30%,var(--c1),var(--c2));box-shadow:0 0 14px color-mix(in srgb,var(--c1) 60%,transparent);flex:none}
  .kd-bar .nm{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kd-bar .nm small{display:block;font-weight:600;color:var(--muted);font-size:12px}
  .kd-bar.turn{border-color:#ffd23f;box-shadow:0 0 0 1px rgba(255,210,63,.3),0 0 20px rgba(255,210,63,.15)}
  .kd-life{position:relative;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font:400 22px var(--display);color:#fff;background:radial-gradient(circle at 35% 30%,#ff6b7d,#8a0f24);box-shadow:0 0 0 3px #3a0f18,0 0 18px rgba(255,60,90,.45);flex:none;transition:transform .2s}
  .kd-life.low{animation:kdpulse 1s ease-in-out infinite}
  @keyframes kdpulse{50%{box-shadow:0 0 0 3px #3a0f18,0 0 30px rgba(255,60,90,.9)}}
  .kd-gems{display:flex;flex-wrap:wrap;gap:2px;max-width:150px;align-items:center}
  .kd-gems i{width:12px;height:16px;clip-path:polygon(50% 0,100% 35%,80% 100%,20% 100%,0 35%);background:#2a3a5a}
  .kd-gems i.on{background:linear-gradient(160deg,#9ff3ff,#22a6ff 60%,#1650c0);filter:drop-shadow(0 0 3px #3ac8ff)}
  .kd-gems b{font-size:12px;margin-left:4px;color:#9fe9ff}
  @media (max-width:520px){.kd-gems{max-width:70px}.kd-gems i{width:9px;height:12px}.kd-life{width:44px;height:44px;font-size:19px}.kd-bar .av{width:34px;height:34px;font-size:18px}.kd-bar{gap:6px;padding:5px 8px}}
  .kd-row{display:flex;justify-content:center;gap:var(--gap);min-height:112px;align-items:center;position:relative;z-index:1;padding:4px 0}
  .kd-row .empty{color:#5a5078;font-size:13px}
  .kd-cre{position:relative;width:calc((min(100vw - 40px,900px) - 5 * var(--gap)) / 6);max-width:104px;aspect-ratio:.78;border-radius:14px;background:linear-gradient(160deg,var(--c1),var(--c2));border:2px solid color-mix(in srgb,var(--c1) 70%,#fff);box-shadow:0 6px 14px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .25s,box-shadow .25s,filter .25s,opacity .25s}
  .kd-cre .cn{position:absolute;bottom:14px;left:2px;right:2px;text-align:center;font-size:clamp(8px,1.6vw,10.5px);font-weight:800;line-height:1.05;color:#fff;text-shadow:0 1px 2px #000;overflow:hidden;max-height:2.2em}
  .kd-cre .art{margin-top:-14px;font-size:clamp(26px,6.5vw,42px);filter:drop-shadow(0 3px 4px rgba(0,0,0,.5));transition:transform .3s}
  .kd-cre .st{position:absolute;bottom:-8px;min-width:24px;height:24px;padding:0 5px;border-radius:12px;display:grid;place-items:center;font:800 14px var(--body);color:#fff;border:2px solid #0d0a18}
  .kd-cre .st.a{left:-6px;background:linear-gradient(#ffb547,#d9720f)} .kd-cre .st.h{right:-6px;background:linear-gradient(#ff5a6e,#b0142c)} .kd-cre .st.h.hurt{color:#ffd0d0;background:linear-gradient(#8a1a2a,#4a0a14)}
  .kd-cre .st.up{box-shadow:0 0 8px #3dff8a}
  .kd-cre .kwi{position:absolute;top:2px;left:0;right:0;display:flex;justify-content:center;gap:1px;font-size:12px}
  .kd-cre.tap{transform:rotate(9deg) scale(.94);filter:saturate(.45) brightness(.7)}
  .kd-cre.sick .art{opacity:.75}.kd-cre .zz{position:absolute;right:4px;top:14px;font-size:12px;animation:kdzz 2s ease-in-out infinite;color:#cfd8ff}
  @keyframes kdzz{50%{transform:translate(3px,-4px);opacity:.5}}
  .kd-cre.frz::after{content:"❄️";position:absolute;inset:0;border-radius:12px;background:rgba(160,220,255,.35);display:grid;place-items:center;font-size:22px;box-shadow:inset 0 0 14px #bfefff}
  .kd-cre.shield{box-shadow:0 0 0 3px #ffe58a,0 0 18px rgba(255,229,138,.7)}
  .kd-cre.can{animation:kdcan 1.6s ease-in-out infinite}
  @keyframes kdcan{50%{box-shadow:0 0 0 2px #3dff8a,0 0 18px rgba(61,255,138,.6)}}
  .kd-cre.sel{transform:translateY(-14px) scale(1.04);box-shadow:0 0 0 3px #ff4d4d,0 0 24px rgba(255,60,60,.8)!important;animation:none}
  .kd-row.foe .kd-cre.sel{transform:translateY(14px) scale(1.04)}
  .kd-cre.attacking{box-shadow:0 0 0 3px #ff4d4d,0 0 22px rgba(255,60,60,.7)}
  .kd-cre.bsel{transform:translateY(-10px);box-shadow:0 0 0 3px #3aa8ff,0 0 22px rgba(58,168,255,.8)}
  .kd-cre .bl{position:absolute;top:-10px;left:50%;transform:translateX(-50%);min-width:22px;height:22px;border-radius:11px;background:#3aa8ff;color:#fff;font:800 12px/22px var(--body);text-align:center;padding:0 5px;border:2px solid #0d0a18;z-index:2}
  .kd-cre .bl.ak{background:#ff4d4d}
  .tgt,.kd-cre.tgt{animation:kdtgt .9s ease-in-out infinite!important;cursor:crosshair}
  @keyframes kdtgt{50%{box-shadow:0 0 0 3px #ffd23f,0 0 24px rgba(255,210,63,.9)}}
  .kd-cre.summon{animation:kdsum .6s cubic-bezier(.2,1.5,.4,1) both}
  @keyframes kdsum{0%{transform:scale(0) rotate(-20deg);filter:brightness(3)}60%{filter:brightness(1.6)}100%{transform:none;filter:none}}
  .kd-cre.shake,.kd-life.shake{animation:kdshake .4s}
  @keyframes kdshake{20%{transform:translateX(-6px) rotate(-3deg)}40%{transform:translateX(5px) rotate(2deg)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
  .kd-cre.lunge-up{animation:kdlu .5s ease-in-out}.kd-cre.lunge-dn{animation:kdld .5s ease-in-out}
  @keyframes kdlu{40%{transform:translateY(-60px) scale(1.12);z-index:5}}
  @keyframes kdld{40%{transform:translateY(60px) scale(1.12);z-index:5}}
  .kd-ghost{position:fixed;pointer-events:none;z-index:40;margin:0!important}
  .kd-ghost.die{animation:kddie .8s ease-in forwards}
  @keyframes kddie{0%{filter:brightness(2)}30%{transform:scale(1.1) rotate(-4deg)}100%{transform:scale(.3) rotate(25deg) translateY(30px);opacity:0;filter:grayscale(1) blur(3px)}}
  .kd-ghost.bounce{animation:kdbounce .7s ease-in forwards}
  @keyframes kdbounce{to{transform:translateY(-120px) scale(.4);opacity:0}}
  .kd-float{position:fixed;z-index:45;pointer-events:none;font:400 30px var(--display);color:#ff4d5e;text-shadow:0 2px 0 #3a0010,0 0 12px rgba(255,60,80,.8);animation:kdfloat 1.2s ease-out forwards;transform:translate(-50%,-50%)}
  .kd-float.g{color:#3dff8a;text-shadow:0 2px 0 #003a10,0 0 12px rgba(61,255,138,.8)} .kd-float.y{color:#ffd23f;text-shadow:0 2px 0 #3a2a00,0 0 12px rgba(255,210,63,.8)} .kd-float.b{color:#9fe9ff;text-shadow:0 0 12px #3ac8ff}
  @keyframes kdfloat{0%{transform:translate(-50%,-30%) scale(.4);opacity:0}20%{transform:translate(-50%,-60%) scale(1.25);opacity:1}100%{transform:translate(-50%,-160%) scale(1);opacity:0}}
  .kd-mid{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;min-height:46px;position:relative;z-index:2;text-align:center}
  .kd-mid .msg{font-weight:800;font-size:15px;color:#e9e2ff}
  .kd-mid .msg.mine{color:#ffd23f}
  .kd-mid .btn{min-height:42px}
  .kd-mid .btn.atk{background:linear-gradient(#ff5a5a,#c01a2a);color:#fff;border-color:#ff8a8a;box-shadow:0 0 16px rgba(255,60,60,.5)}
  .kd-mid .btn.end{background:linear-gradient(#ffd23f,#e09a00);color:#2a1a00}
  .kd-hand{display:flex;justify-content:center;padding:30px 14px 12px;min-height:150px;overflow-x:auto;overflow-y:visible;scrollbar-width:none}
  .kd-hand::-webkit-scrollbar{display:none}
  .kd-hand .kd-card{margin:0 -5px;transform:rotate(var(--r)) translateY(var(--y));transform-origin:50% 100%}
  .kd-hand .kd-card:hover,.kd-hand .kd-card.on{transform:translateY(-16px) scale(1.06);z-index:3}
  .kd-hand .kd-card.new{animation:kddraw .5s ease-out both}
  @keyframes kddraw{from{transform:translateY(80px) rotate(10deg);opacity:0}}
  @media (max-width:600px){.kd-hand{justify-content:flex-start}.kd-hand .kd-card{margin:0 -4px}}
  .kd-card{position:relative;flex:none;width:104px;height:148px;border-radius:12px;padding:5px;background:linear-gradient(160deg,var(--c1),var(--c2));border:2px solid color-mix(in srgb,var(--c1) 60%,#fff);box-shadow:0 8px 18px rgba(0,0,0,.55);display:flex;flex-direction:column;gap:2px;color:#fff;cursor:pointer;transition:transform .2s,box-shadow .2s,filter .2s}
  .kd-card .in{flex:1;border-radius:8px;background:rgba(10,6,20,.55);display:flex;flex-direction:column;align-items:center;padding:3px 4px 4px;gap:1px;overflow:hidden}
  .kd-card .cost{position:absolute;left:-7px;top:-7px;width:28px;height:30px;display:grid;place-items:center;font:800 15px var(--body);color:#fff;background:linear-gradient(160deg,#9ff3ff,#1e8fff 60%,#1450b0);clip-path:polygon(50% 0,100% 30%,85% 100%,15% 100%,0 30%);text-shadow:0 1px 2px #002}
  .kd-card .art{font-size:34px;line-height:1.15;filter:drop-shadow(0 3px 4px rgba(0,0,0,.5))}
  .kd-card .nm{font-size:11.5px;font-weight:800;text-align:center;line-height:1.1}
  .kd-card .tx{font-size:9.5px;line-height:1.2;text-align:center;color:#e6def5;margin:0}
  .kd-card .kw{font-size:9.5px;color:#ffe58a;text-align:center;font-weight:700}
  .kd-card .st{position:absolute;bottom:-7px;min-width:24px;height:24px;border-radius:12px;display:grid;place-items:center;font:800 13px var(--body);border:2px solid #0d0a18;padding:0 4px}
  .kd-card .st.a{left:-6px;background:linear-gradient(#ffb547,#d9720f)}.kd-card .st.h{right:-6px;background:linear-gradient(#ff5a6e,#b0142c)}
  .kd-card .ty{position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.55)}
  .kd-card.play{box-shadow:0 0 0 2px #3dff8a,0 0 18px rgba(61,255,138,.55),0 8px 18px rgba(0,0,0,.55)}
  .kd-card.no{filter:saturate(.5) brightness(.75)}
  .kd-card.big{width:min(240px,70vw);height:auto;aspect-ratio:.7;padding:9px;border-radius:20px;cursor:default}
  .kd-card.big .art{font-size:86px}.kd-card.big .nm{font-size:20px}.kd-card.big .tx{font-size:15px}.kd-card.big .kw{font-size:14px}
  .kd-card.big .cost{width:46px;height:48px;font-size:24px;left:-12px;top:-12px}.kd-card.big .st{min-width:40px;height:40px;border-radius:20px;font-size:20px;bottom:-12px}
  .kd-card.big .ty{font-size:12px;bottom:6px}
  .kd-pop{position:fixed;inset:0;z-index:50;background:rgba(5,3,12,.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;animation:kdfade .2s both}
  @keyframes kdfade{from{opacity:0}}
  .kd-pop .kd-card{animation:kdzoom .35s cubic-bezier(.2,1.4,.4,1) both}
  @keyframes kdzoom{from{transform:scale(.4) rotate(-8deg);opacity:0}}
  .kd-pop .kwl{max-width:320px;display:flex;flex-direction:column;gap:4px;font-size:13px;color:#ddd}
  .kd-pop .kwl b{color:#ffe58a}
  .kd-cast{position:fixed;inset:0;z-index:48;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;pointer-events:none}
  .kd-cast .who{font:400 20px var(--display);color:#fff;text-shadow:0 2px 10px #000;animation:kdfade .3s both}
  .kd-cast .kd-card{animation:kdcast 1.6s cubic-bezier(.2,1.2,.4,1) both}
  @keyframes kdcast{0%{transform:translateY(-200px) scale(.3) rotate(-20deg);opacity:0}25%{transform:none;opacity:1}80%{transform:none;opacity:1}100%{transform:scale(.6);opacity:0}}
  .kd-banner{position:fixed;left:50%;top:42%;z-index:47;pointer-events:none;font:400 clamp(40px,11vw,84px) var(--display);color:#ffd23f;text-shadow:0 4px 0 #6a3a00,0 0 40px rgba(255,210,63,.7);animation:kdban 1.5s ease-out forwards;white-space:nowrap}
  @keyframes kdban{0%{transform:translate(-50%,-50%) scale(2.6);opacity:0}25%{transform:translate(-50%,-50%) scale(1);opacity:1}75%{opacity:1}100%{transform:translate(-50%,-80%) scale(.9);opacity:0}}
  .kd-tgtbar{position:sticky;top:6px;z-index:6;display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 12px;border-radius:14px;background:linear-gradient(90deg,#5a3a00,#7a5000);border:1px solid #ffd23f;color:#fff;font-weight:800;animation:kdfade .2s}
  .kd-pick{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
  .kd-fac{position:relative;border-radius:20px;padding:16px;background:linear-gradient(160deg,var(--c1),var(--c2));border:2px solid color-mix(in srgb,var(--c1) 60%,#fff);color:#fff;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:6px;overflow:hidden;transition:transform .2s,box-shadow .2s;animation:kdzoom .45s both}
  .kd-fac:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 14px 30px rgba(0,0,0,.5),0 0 24px color-mix(in srgb,var(--c1) 60%,transparent)}
  .kd-fac .e{font-size:48px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}
  .kd-fac b{font:400 26px var(--display)} .kd-fac p{margin:0;font-size:14px;color:#f0e8ff} .kd-fac .s{font-size:22px;letter-spacing:2px}
  .kd-fac.on{box-shadow:0 0 0 4px #ffd23f,0 0 30px rgba(255,210,63,.6)}
  .kd-fac .last{position:absolute;top:10px;right:12px;font-size:11px;background:rgba(0,0,0,.35);padding:2px 8px;border-radius:8px}
  .kd-log{font-size:13px;color:var(--muted);text-align:center;min-height:18px}
  .kd-end{text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center;animation:kdzoom .5s both}
  .kd-end .big{font:400 clamp(40px,10vw,72px) var(--display);color:#ffd23f;text-shadow:0 0 30px rgba(255,210,63,.6)}
  .kd-end .big.l{color:#9aa6c8;text-shadow:none}
  .kd-rules{max-width:520px;margin:10px auto 0;text-align:left;font-size:14px;color:var(--muted)}
  .kd-rules summary{cursor:pointer;color:var(--fg);font-weight:700}
  .kd-rules li{margin:3px 0}
  .kd-art{display:flex;gap:4px;align-items:flex-end}.kd-art i{width:40px;height:56px;border-radius:7px;display:grid;place-items:center;font-size:22px;font-style:normal;border:2px solid rgba(255,255,255,.5);box-shadow:0 6px 12px rgba(0,0,0,.5)}
  .kd-art i:nth-child(1){background:linear-gradient(160deg,#ff5a3d,#7a1a08);transform:rotate(-12deg) translateY(4px)}.kd-art i:nth-child(2){background:linear-gradient(160deg,#3aa8ff,#0b3a6a);transform:translateY(-4px)}.kd-art i:nth-child(3){background:linear-gradient(160deg,#a45cff,#3a1466);transform:rotate(12deg) translateY(4px)}
  `;
  const stl = document.createElement('style'); stl.textContent = css; document.head.appendChild(stl);
  const q = s => document.querySelector(s);
  const S = { rid: null, seen: -1, atk: new Set(), blk: {}, bsel: null, tgt: null, hand: new Set(), phaseKey: '' };
  const fc = f => F[f] || { col: '#666', col2: '#222', e: '❔', n: '?' };
  const cv = (f) => `--c1:${fc(f).col};--c2:${fc(f).col2}`;
  const kwIcons = kw => kw.map(k => (KW[k] ? KW[k][0] : '')).join('');
  function cardHTML(id, o = {}) {
    const c = C[id]; if (!c) return '';
    const kw = (c.kw || []).map(k => KW[k] ? KW[k][1] : k).join(' · ');
    return `<div class="kd-card ${o.cls || ''}" style="${cv(c.f)};${o.style || ''}" ${o.attr || ''}><span class="cost">${c.c}</span><div class="in"><div class="art">${c.art}</div><b class="nm">${esc(c.n)}</b>${kw ? `<div class="kw">${kw}</div>` : ''}${c.txt ? `<p class="tx">${esc(c.txt)}</p>` : ''}</div>
      ${c.t === 'k' ? `<span class="st a">${o.a ?? c.a}</span><span class="st h">${o.h ?? c.h}</span><span class="ty">Kreatur</span>` : '<span class="ty">Zauber</span>'}</div>`;
  }
  const canAttack = c => !c.tap && !c.sick && !c.kw.includes('mauer') && c.a > 0;
  const canBlock = (b, a) => !b.tap && (!a.kw.includes('flug') || b.kw.includes('flug') || b.kw.includes('reich'));
  const targetsFor = (v, tg) => {
    const me = v.me, foe = v.foe, out = [];
    if (tg === 'any') out.push('f:' + me, 'f:' + foe);
    for (const pid of [me, foe]) for (const c of v.P[pid].board) if (tg === 'any' || tg === 'cre' || (tg === 'ecre' && pid === foe) || (tg === 'own' && pid === me)) out.push('u:' + c.u);
    return out;
  };

  const playable = (v, c) => { const P = v.P[v.me]; return v.mine && v.turn === v.me && v.phase === 'main' && c.c <= P.cr && !(c.t === 'k' && P.board.length >= 6) && !(c.t === 'z' && c.e && c.e.tg && !targetsFor(v, c.e.tg).length); };
  function creHTML(c, v, side) {
    const k = C[c.id], my = side === 'me', main = v.phase === 'main' && v.turn === v.me && v.mine;
    const cls = ['kd-cre'];
    if (c.tap) cls.push('tap'); if (c.sick && !c.tap) cls.push('sick'); if (c.frz) cls.push('frz'); if (c.shield) cls.push('shield');
    if (my && main && !S.tgt && !v.attacked && canAttack(c)) cls.push(S.atk.has(c.u) ? 'sel' : 'can');
    if (v.atk.includes(c.u)) cls.push('attacking');
    if (S.bsel === c.u) cls.push('bsel');
    if (S.tgt && S.tgt.opts.includes('u:' + c.u)) cls.push('tgt');
    let badge = '';
    if (v.phase === 'block') {
      const ai = v.atk.indexOf(c.u); if (ai >= 0) badge = `<span class="bl ak">${ai + 1}</span>`;
      const bl = v.turn === v.me ? v.blocks : S.blk; const to = bl[c.u]; if (to != null) badge = `<span class="bl">🛡${v.atk.indexOf(Number(to)) + 1}</span>`;
    }
    const hurt = c.d > 0, up = c.a > k.a || c.h > k.h;
    return `<div class="${cls.join(' ')}" style="${cv(k.f)}" data-u="${c.u}" data-side="${side}">${badge}<div class="kwi">${kwIcons(c.kw)}</div><div class="art">${k.art}</div><span class="cn">${esc(k.n)}</span>${c.sick && !c.tap && my ? '<span class="zz">💤</span>' : ''}
      <span class="st a ${c.a > k.a ? 'up' : ''}">${c.a}</span><span class="st h ${hurt ? 'hurt' : ''} ${up && !hurt ? 'up' : ''}">${c.h - c.d}</span></div>`;
  }
  function barHTML(v, pid, side) {
    const P = v.P[pid], f = fc(P.fac), gems = Array.from({ length: P.mx }, (_, i) => `<i class="${i < P.cr ? 'on' : ''}"></i>`).join('');
    const tg = S.tgt && S.tgt.opts.includes('f:' + pid) ? 'tgt' : '';
    return `<div class="kd-bar ${v.turn === pid && v.phase !== 'end' ? 'turn' : ''}"><div class="who"><span class="av" style="--c1:${f.col};--c2:${f.col2}">${pid === 'bot' ? '🤖' : f.e}</span><span class="nm">${esc(v.nm[pid])}${side === 'me' && v.mine ? ' (du)' : ''}<small>${f.n} · <span title="Handkarten">🂠 ${P.hand}</span> · <span title="Karten im Deck">📚 ${P.deck}</span></small></span></div>
      <div class="kd-gems">${gems}<b>${P.cr}/${P.mx}</b></div>
      <div class="kd-life ${P.life <= 5 ? 'low' : ''} ${tg}" data-face="f:${pid}" title="Leben">${Math.max(0, P.life)}</div></div>`;
  }

  function render(stage, v) {
    if (S.rid !== room.id) { S.rid = room.id; S.seen = -1; S.atk.clear(); S.blk = {}; S.bsel = null; S.tgt = null; S.hand = new Set(); }
    // Auswahl aufräumen
    const pk = v.phase + ':' + v.turn + ':' + v.n + ':' + v.attacked;
    if (pk !== S.phaseKey) { S.phaseKey = pk; S.atk.clear(); S.blk = {}; S.bsel = null; S.tgt = null; }
    if (v.phase === 'pick') return renderPick(stage, v);
    // Alte Positionen merken (für Animationen gestorbener Kreaturen)
    const prev = {}; stage.querySelectorAll('[data-u]').forEach(e => { prev[e.dataset.u] = { r: e.getBoundingClientRect(), html: e.outerHTML }; });
    const me = v.me, foe = v.foe, myTurn = v.mine && v.turn === me, P = v.P[me];
    const hand = v.hand.map((h, i) => {
      const c = C[h.id], ok = playable(v, c), n = v.hand.length, mid = (n - 1) / 2;
      const isNew = S.seen >= 0 && !S.hand.has(h.h);
      return cardHTML(h.id, { cls: (ok ? 'play' : 'no') + (isNew ? ' new' : '') + (S.tgt && S.tgt.i === i ? ' on' : ''), attr: `data-hi="${i}"`, style: `--r:${((i - mid) * (n > 6 ? 1.5 : 2.5)).toFixed(1)}deg;--y:${(Math.abs(i - mid) ** 1.5 * 1.5).toFixed(1)}px;animation-delay:${isNew ? 0.1 : 0}s` });
    }).join('');
    S.hand = new Set(v.hand.map(h => h.h));
    let mid = '';
    if (v.phase === 'end') {
      const win = v.winner === me && v.mine;
      mid = `<div class="kd-end"><div class="big ${win || !v.mine ? '' : 'l'}">${v.draw ? 'Unentschieden!' : win ? '🏆 Sieg!' : v.mine ? 'Niederlage' : `${esc(v.nm[v.winner])} gewinnt!`}</div>
        <p class="note">Stand: ${esc(v.nm[v.p[0]])} ${v.score[v.p[0]] || 0} – ${v.score[v.p[1]] || 0} ${esc(v.nm[v.p[1]])}</p>${v.bot && isHost() ? '<button class="btn" data-kdbot="1">⚔️ Nochmal gegen den Bot</button>' : againHTML('⚔️ Revanche!')}</div>`;
    } else if (S.tgt) {
      mid = `<div class="kd-tgtbar">🎯 Ziel für ${esc(C[v.hand[S.tgt.i] ? v.hand[S.tgt.i].id : ''] ? C[v.hand[S.tgt.i].id].n : '')} wählen <button class="btn ghost small" data-kd="cancel">Abbrechen</button></div>`;
    } else if (v.phase === 'block') {
      if (v.mine && v.turn !== me) { const n = Object.keys(S.blk).length; mid = `<span class="msg mine">🛡️ Angriff! ${S.bsel ? 'Jetzt einen roten Angreifer antippen' : 'Tippe deine Kreatur, dann den Angreifer, den sie blocken soll'}</span><button class="btn" data-kd="block">${n ? `🛡️ Mit ${n} blocken` : 'Nicht blocken'}</button>`; }
      else mid = `<span class="msg">⏳ ${esc(v.nm[foe === v.turn ? me : foe])} wählt Blocker …</span>`;
    } else if (myTurn) {
      const n = S.atk.size, can = !v.attacked && P.board.some(canAttack);
      mid = `<span class="msg mine">${v.attacked ? 'Angriff vorbei – spiele noch Karten oder beende den Zug' : can ? (n ? '' : 'Karten spielen oder Angreifer antippen') : 'Dein Zug – spiele Karten aus'}</span>
        ${can && !n ? '<button class="btn ghost small" data-kd="all">⚔️ Alle wählen</button>' : ''}${n ? `<button class="btn atk" data-kd="attack">⚔️ Angreifen (${n})</button>` : ''}<button class="btn end" data-kd="end">Zug beenden ⏭</button>`;
    } else mid = `<span class="msg">⏳ ${esc(v.nm[v.turn])} ist am Zug …</span>`;
    if (v.left != null && v.phase !== 'end') mid += ` <span class="note">⏱ <span data-cd></span> s</span>`;
    const row = (pid, side) => { const b = v.P[pid].board; return `<div class="kd-row ${side}">${b.length ? b.map(c => creHTML(c, v, side)).join('') : '<span class="empty">– keine Kreaturen –</span>'}</div>`; };
    stage.dataset.mode = 'kd';
    stage.innerHTML = `<div class="kd"><div class="kd-table" style="--fo:${fc(v.P[foe].fac).col};--fm:${fc(P.fac).col}">${barHTML(v, foe, 'foe')}${row(foe, 'foe')}<div class="kd-mid">${mid}</div>${row(me, 'me')}${barHTML(v, me, 'me')}</div>
      ${v.mine ? `<div class="kd-hand">${hand || '<span class="note">Keine Handkarten</span>'}</div>` : ''}<p class="kd-log">${esc(v.log[v.log.length - 1] || '')}</p></div>`;
    if (deadline != null) { const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); stage.querySelectorAll('[data-cd]').forEach(e => (e.textContent = s)); }
    animate(stage, v, prev);
  }
  function renderPick(stage, v) {
    const mineF = v.P[v.me].fac, foeF = v.P[v.foe].fac;
    const key = 'pick' + mineF + foeF;
    if (stage.dataset.mode === key) return; stage.dataset.mode = key;
    const sample = { glut: ['g_kobold', 'g_meteor', 'g_drache'], wild: ['w_wolf', 'w_hydra', 'w_riese'], flut: ['f_fee', 'f_strudel', 'f_wal'], nacht: ['n_fleder', 'n_fluch', 'n_vampir'] };
    stage.innerHTML = `<div class="kd"><h2 class="center" style="margin:0">⚔️ Wähle dein Deck</h2>
      ${!v.mine ? '<p class="status">Die Spieler wählen ihre Decks …</p>' : mineF ? `<p class="status">Du spielst ${fc(mineF).e} ${fc(mineF).n}. ${foeF ? '' : `Warte auf ${esc(v.nm[v.foe])} …`}</p>` : `<p class="note center">Jedes Deck hat 30 Karten und spielt sich anders.${v.left != null ? ' Noch <span data-cd></span> s.' : ''}</p>
      <div class="kd-pick">${Object.entries(F).map(([k, f], i) => `<button class="kd-fac" data-kdf="${k}" style="--c1:${f.col};--c2:${f.col2};animation-delay:${i * 0.07}s">${v.lastFac === k ? '<span class="last">zuletzt</span>' : ''}<span class="e">${f.e}</span><b>${f.n}</b><p>${f.txt}</p><span class="s">${sample[k].map(id => C[id].art).join(' ')}</span></button>`).join('')}
      <button class="kd-fac" data-kdf="zufall" style="--c1:#6a6a8a;--c2:#262636"><span class="e">🎲</span><b>Zufall</b><p>Lass das Schicksal entscheiden.</p></button></div>`}</div>`;
  }
  function centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function floatAt(x, y, text, cls, delay) { setTimeout(() => { const f = document.createElement('div'); f.className = 'kd-float ' + (cls || ''); f.textContent = text; f.style.left = x + 'px'; f.style.top = y + 'px'; document.body.appendChild(f); setTimeout(() => f.remove(), 1300); }, delay); }
  function elFor(stage, t) { if (!t) return null; return t.startsWith('f:') ? stage.querySelector(`[data-face="${t}"]`) : stage.querySelector(`[data-u="${t.slice(2)}"]`); }
  function animate(stage, v, prev) {
    if (S.seen < 0) { S.seen = v.seq; return; }
    const evs = v.fx.filter(e => e.q > S.seen); S.seen = v.seq; if (!evs.length) return;
    let delay = 0; const pos = t => { const el = elFor(stage, t); if (el) return centerOf(el); const p = t && t.startsWith('u:') && prev[t.slice(2)]; return p ? [p.r.left + p.r.width / 2, p.r.top + p.r.height / 2] : null; };
    const pulse = (el, c, d) => { if (!el) return; setTimeout(() => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); setTimeout(() => el.classList.remove(c), 700); }, d); };
    for (const e of evs) {
      const el = elFor(stage, e.t);
      if (e.k === 'summon') { if (el) { el.classList.add('summon'); setTimeout(() => el.classList.remove('summon'), 700); } }
      else if (e.k === 'hit') { delay += 380; const a = stage.querySelector(`[data-u="${e.from}"]`); if (a) pulse(a, a.dataset.side === 'me' ? 'lunge-up' : 'lunge-dn', delay - 300); }
      else if (e.k === 'dmg') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '-' + e.n, '', delay); pulse(el, 'shake', delay); if (navigator.vibrate && e.t === 'f:' + v.me && v.mine) setTimeout(() => navigator.vibrate(40), delay); }
      else if (e.k === 'heal') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '+' + e.n, 'g', delay); }
      else if (e.k === 'buff') { const p = pos(e.t); if (p) floatAt(p[0], p[1], `+${e.a}/+${e.h}`, 'y', delay); }
      else if (e.k === 'freeze') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '❄️', 'b', delay); }
      else if (e.k === 'shield') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '🛡️', 'y', delay); }
      else if (e.k === 'kill') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '💀', '', delay); }
      else if (e.k === 'ramp') { const b = stage.querySelector(`[data-face="f:${e.p}"]`); if (b) { const p = centerOf(b.parentElement.querySelector('.kd-gems')); floatAt(p[0], p[1], '+💎', 'b', delay); } }
      else if (e.k === 'die' || e.k === 'bounce') {
        const p = prev[e.t.slice(2)]; if (!p) continue;
        const g = document.createElement('div'); g.innerHTML = p.html; const n = g.firstElementChild; if (!n) continue;
        n.classList.remove('sel', 'can', 'tgt', 'summon'); n.classList.add('kd-ghost');
        Object.assign(n.style, { left: p.r.left + 'px', top: p.r.top + 'px', width: p.r.width + 'px', height: p.r.height + 'px' });
        document.body.appendChild(n); setTimeout(() => n.classList.add(e.k === 'die' ? 'die' : 'bounce'), delay + 150); setTimeout(() => n.remove(), delay + 1100);
      }
      else if (e.k === 'play' && e.p !== v.me) { // gegnerische Karte groß zeigen
        const o = document.createElement('div'); o.className = 'kd-cast'; o.innerHTML = `<div class="who">${esc(v.nm[e.p])} spielt</div>${cardHTML(e.id, { cls: 'big' })}`;
        document.body.appendChild(o); setTimeout(() => o.remove(), 1650); delay += 500;
      }
      else if (e.k === 'turn' && e.p === v.me && v.mine) { const b = document.createElement('div'); b.className = 'kd-banner'; b.textContent = 'Dein Zug!'; document.body.appendChild(b); setTimeout(() => b.remove(), 1600); }
      else if (e.k === 'burn' && e.p === v.me && v.mine) toast(`Hand voll – ${C[e.id].n} ist verbrannt.`);
      else if (e.k === 'end' && v.mine && v.winner === v.me && window.g3confetti) setTimeout(() => g3confetti(140), delay + 300);
    }
  }
  function popup(html) {
    const o = document.createElement('div'); o.className = 'kd-pop'; o.innerHTML = html; document.body.appendChild(o);
    o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-kdx]')) o.remove(); });
    return o;
  }
  const kwList = kw => kw.length ? `<div class="kwl">${kw.map(k => KW[k] ? `<span>${KW[k][0]} <b>${KW[k][1]}:</b> ${KW[k][2]}</span>` : '').join('')}</div>` : '';
  function showHand(i) {
    const v = room.view, h = v.hand[i]; if (!h) return; const c = C[h.id], P = v.P[v.me];
    const ok = playable(v, c);
    const why = v.turn !== v.me ? 'Du bist nicht am Zug.' : v.phase !== 'main' ? '' : c.c > P.cr ? `Du brauchst ${c.c} 💎 (hast ${P.cr}).` : c.t === 'k' && P.board.length >= 6 ? 'Dein Feld ist voll.' : 'Dafür gibt es gerade kein Ziel.';
    const o = popup(`${cardHTML(h.id, { cls: 'big' })}${kwList(c.kw || [])}<div class="row" style="justify-content:center;gap:8px">${ok ? '<button class="btn" data-kdplay="1">✨ Ausspielen</button>' : `<span class="note">${why}</span>`}<button class="btn ghost" data-kdx="1">Schließen</button></div>`);
    const b = o.querySelector('[data-kdplay]'); if (b) b.addEventListener('click', () => { o.remove(); tryPlay(i); });
  }
  function tryPlay(i) {
    const v = room.view, h = v.hand[i]; if (!h) return; const c = C[h.id];
    if (c.e && c.e.tg) {
      const opts = targetsFor(v, c.e.tg);
      if (opts.length) { S.tgt = { i, opts }; S.atk.clear(); renderRoom(); return; }
      if (c.t === 'z') { toast('Dafür gibt es gerade kein Ziel.'); return; }
    }
    act({ type: 'play', i });
  }
  function showCre(u) {
    const v = room.view; let c = null; for (const pid of [v.me, v.foe]) { const x = v.P[pid].board.find(y => y.u === u); if (x) c = x; } if (!c) return;
    const st = [c.tap && (c.frz ? '❄️ eingefroren' : '😴 erschöpft'), c.sick && !c.tap && '💤 gerade beschworen', c.shield && '🛡️ Schild aktiv', c.d && `💔 ${c.d} Schaden (heilt am Zugende)`].filter(Boolean).join(' · ');
    popup(`${cardHTML(c.id, { cls: 'big', a: c.a, h: c.h - c.d })}${st ? `<p class="note" style="color:#ddd;margin:0">${st}</p>` : ''}${kwList(c.kw)}<button class="btn ghost" data-kdx="1">Schließen</button>`);
  }
  document.addEventListener('click', e => {
    if (!room || room.game !== 'duell') return;
    const kb = e.target.closest('[data-kdbot]'); if (kb && isHost()) { send({ t: 'start', bot: 1 }); return; }
    if (!room.view) return;
    const v = room.view;
    const f = e.target.closest('[data-kdf]'); if (f) { act({ type: 'deck', f: f.dataset.kdf }); return; }
    if (!e.target.closest('#stage')) return;
    // Zielwahl
    if (S.tgt) {
      const t = e.target.closest('[data-u],[data-face]'); const key = t ? (t.dataset.face || 'u:' + t.dataset.u) : null;
      if (key && S.tgt.opts.includes(key)) { const i = S.tgt.i; S.tgt = null; act({ type: 'play', i, t: key }); return; }
      if (e.target.closest('[data-kd="cancel"]') || e.target.closest('[data-hi]')) { S.tgt = null; renderRoom(); }
      return;
    }
    const b = e.target.closest('[data-kd]');
    if (b) {
      const a = b.dataset.kd;
      if (a === 'end') { if (S.atk.size && !v.attacked && !confirm('Du hast Angreifer gewählt, aber noch nicht angegriffen. Trotzdem Zug beenden?')) return; act({ type: 'end' }); }
      else if (a === 'attack') act({ type: 'attack', us: [...S.atk] });
      else if (a === 'all') { v.P[v.me].board.filter(canAttack).forEach(c => S.atk.add(c.u)); renderRoom(); }
      else if (a === 'block') act({ type: 'block', b: S.blk });
      return;
    }
    const h = e.target.closest('[data-hi]'); if (h) { showHand(Number(h.dataset.hi)); return; }
    const cEl = e.target.closest('[data-u]'); if (!cEl) return;
    const u = Number(cEl.dataset.u), side = cEl.dataset.side;
    const mine = v.P[v.me].board.find(c => c.u === u);
    // Blocken
    if (v.phase === 'block' && v.mine && v.turn !== v.me) {
      if (side === 'me' && mine) {
        if (S.blk[u] != null) { delete S.blk[u]; S.bsel = null; renderRoom(); return; }
        if (mine.tap) { toast('Erschöpfte Kreaturen können nicht blocken.'); return; }
        S.bsel = S.bsel === u ? null : u; renderRoom(); return;
      }
      if (side === 'foe' && v.atk.includes(u) && S.bsel != null) {
        const B = v.P[v.me].board.find(c => c.u === S.bsel), A = v.P[v.foe].board.find(c => c.u === u);
        if (!canBlock(B, A)) { toast('Fliegende Angreifer können nur von Flug oder Reichweite geblockt werden.'); return; }
        for (const k of Object.keys(S.blk)) if (S.blk[k] === u) delete S.blk[k]; // pro Angreifer ein Blocker
        S.blk[S.bsel] = u; S.bsel = null; renderRoom(); return;
      }
      showCre(u); return;
    }
    // Angreifer wählen
    if (side === 'me' && mine && v.phase === 'main' && v.turn === v.me && !v.attacked && canAttack(mine)) { if (S.atk.has(u)) S.atk.delete(u); else S.atk.add(u); renderRoom(); return; }
    showCre(u);
  });
  // Lobby: Bot-Knopf und Kurzregeln
  const kdLobby = () => `${isHost() ? '<div class="qz-lobby" style="text-align:center"><b>Kein Gegner da?</b><button class="btn" data-kdbot="1">🤖 Gegen den Kristall-Bot</button></div>' : ''}
    <details class="kd-rules"><summary>📖 So geht Kristallduell</summary><ul>
    <li>Jeder startet mit <b>20 Leben</b>. Bringe den Gegner auf 0.</li>
    <li>Jeden Zug bekommst du einen <b>💎 Kristall</b> mehr (bis 10) und ziehst eine Karte.</li>
    <li>Karten kosten Kristalle: <b>Kreaturen</b> kommen aufs Feld, <b>Zauber</b> wirken sofort.</li>
    <li>Neue Kreaturen schlafen eine Runde 💤 (außer mit ⚡ Eile).</li>
    <li>Einmal pro Zug darfst du <b>angreifen</b>: Kreaturen antippen, dann „Angreifen“. Der Gegner entscheidet, wer blockt.</li>
    <li>Geblockte Kreaturen kämpfen gegeneinander, ungeblockte treffen den Spieler. Schaden an Kreaturen heilt am Zugende.</li>
    <li>Karte antippen zeigt alle Details und Fähigkeiten.</li></ul></details>`;
  window.LobbyExtra = Object.assign(window.LobbyExtra || {}, { duell: kdLobby });
  const S2 = window.Spiele2 || (window.Spiele2 = { cast() {} });
  S2.duell = render;
})();
