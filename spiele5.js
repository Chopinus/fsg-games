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
  .kd-cre.used{filter:saturate(.5) brightness(.75)}
  .kd-mode{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:3;font-size:12px;font-weight:800;padding:3px 10px;border-radius:99px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.18);cursor:pointer;white-space:nowrap}
  .kd-modes{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0}
  .kd-modes button{border:2px solid #4a3f66;background:#1d1830;color:#fff;border-radius:14px;padding:10px 14px;font:800 15px var(--body);cursor:pointer;text-align:left;max-width:260px}
  .kd-modes button small{display:block;font-weight:600;color:var(--muted);font-size:12px}
  .kd-modes button.on{border-color:#ffd23f;background:linear-gradient(135deg,#3a2a6a,#2a1a4a);box-shadow:0 0 16px rgba(255,210,63,.35)}
  .kd-card .sof{position:absolute;top:2px;left:22px;font-size:9px;font-weight:800;color:#2a1a00;background:#ffd23f;border-radius:6px;padding:0 4px}
  .kd-hero{position:relative;flex:none;width:58px;height:58px;border-radius:50%;padding:0;border:0;cursor:pointer;background:conic-gradient(#ffd23f var(--p),rgba(255,255,255,.12) 0);display:grid;place-items:center;transition:transform .2s}
  .kd-hero .hp{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;font-size:30px;background:radial-gradient(circle at 35% 30%,var(--c1),var(--c2));box-shadow:inset 0 0 10px rgba(0,0,0,.5)}
  .kd-hero .cdn{position:absolute;bottom:-4px;right:-4px;min-width:22px;height:22px;border-radius:11px;background:#1a1030;border:2px solid #6a5a9a;color:#fff;font:800 12px/18px var(--body)}
  .kd-hero .rd{position:absolute;bottom:-4px;right:-4px;width:24px;height:24px;border-radius:50%;background:#ffd23f;border:2px solid #1a1030;font-size:13px;line-height:20px}
  .kd-hero.ready{background:conic-gradient(#ffd23f 100%,#ffd23f 0);box-shadow:0 0 14px rgba(255,210,63,.6)}
  .kd-hero.go{animation:kdhgo 1.1s ease-in-out infinite}
  @keyframes kdhgo{50%{transform:scale(1.1);box-shadow:0 0 26px rgba(255,210,63,1)}}
  .kd-hero.fire{animation:kdhfire .8s cubic-bezier(.2,1.6,.4,1)}
  @keyframes kdhfire{30%{transform:scale(1.4) rotate(-8deg);filter:brightness(1.8)}}
  @media (max-width:520px){.kd-hero{width:46px;height:46px}.kd-hero .hp{width:40px;height:40px;font-size:24px}}
  .kd-heroc{width:min(300px,82vw);border-radius:22px;padding:18px;background:linear-gradient(160deg,var(--c1),var(--c2));border:3px solid #ffd23f;box-shadow:0 0 40px rgba(255,210,63,.5);color:#fff;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;animation:kdzoom .35s cubic-bezier(.2,1.4,.4,1) both}
  .kd-heroc .hp{font-size:90px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))} .kd-heroc>b{font:400 26px var(--display)} .kd-heroc small{opacity:.85}
  .kd-heroc .pw{margin-top:6px;background:rgba(0,0,0,.35);border-radius:14px;padding:10px 12px;width:100%} .kd-heroc .pw b{color:#ffd23f;font-size:17px}
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
  .kd-card .nm.ln{font-size:10px;letter-spacing:-.2px}.kd-card.big .nm.ln{font-size:18px}
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
  /* Seltenheit und Stufen */
  .kd-card .rg{position:absolute;bottom:13px;left:50%;width:9px;height:9px;transform:translateX(-50%) rotate(45deg);background:var(--rc);box-shadow:0 0 6px var(--rc);border:1px solid rgba(0,0,0,.5)}
  .kd-card.big .rg{width:14px;height:14px;bottom:26px}
  .kd-cre .rg{position:absolute;top:3px;right:3px;width:7px;height:7px;transform:rotate(45deg);background:var(--rc);box-shadow:0 0 5px var(--rc)}
  .lvs{position:absolute;top:2px;right:5px;font-size:9px;letter-spacing:-1px;color:#ffe58a;text-shadow:0 0 4px #000,0 1px 1px #000;z-index:2}
  .kd-card.big .lvs{font-size:15px;top:6px;right:10px}
  .kd-cre .lvs{top:auto;bottom:17px;right:50%;transform:translateX(50%);font-size:8px;display:none}
  .lv2{border-color:#e4e9f2!important;box-shadow:0 0 0 1px #8f98aa,0 0 10px rgba(220,230,255,.35),0 8px 18px rgba(0,0,0,.55)}
  .lv3,.lv4{border-color:#ffd54a!important;box-shadow:0 0 0 1px #a8790a,0 0 14px rgba(255,200,60,.45),0 8px 18px rgba(0,0,0,.55)}
  .lv4{animation:kdlv4 2.4s ease-in-out infinite}
  @keyframes kdlv4{50%{box-shadow:0 0 0 1px #a8790a,0 0 22px var(--c1),0 8px 18px rgba(0,0,0,.55)}}
  .lv5{border-color:transparent!important;background:linear-gradient(160deg,var(--c1),var(--c2)) padding-box,conic-gradient(from var(--kdang,0deg),#ff5a5a,#ffd23f,#3dff8a,#3aa8ff,#b45cff,#ff5a5a) border-box!important;animation:kdlv5 3s linear infinite;box-shadow:0 0 18px rgba(255,255,255,.35),0 8px 18px rgba(0,0,0,.55)}
  @property --kdang{syntax:'<angle>';initial-value:0deg;inherits:false}
  @keyframes kdlv5{to{--kdang:360deg}}
  .lv5 .art{animation:kdbob 2.2s ease-in-out infinite}
  @keyframes kdbob{50%{transform:translateY(-4px) scale(1.05)}}
  .kd-card .shine,.kd-cre .shine{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none}
  .shine::before{content:"";position:absolute;top:-20%;bottom:-20%;width:40%;left:-60%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-15deg);animation:kdshine 3.6s ease-in-out infinite}
  @keyframes kdshine{0%,55%{left:-60%}100%{left:130%}}
  .spk{position:absolute;inset:0;pointer-events:none;border-radius:inherit}
  .spk::before,.spk::after{content:"✦";position:absolute;color:#fff;font-size:10px;text-shadow:0 0 6px #fff,0 0 12px var(--c1);animation:kdspk 2.4s ease-in-out infinite;opacity:0}
  .spk::before{top:12%;left:14%}.spk::after{bottom:28%;right:12%;animation-delay:1.2s}
  @keyframes kdspk{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1.2) rotate(90deg)}}
  .kd-pt{position:fixed;z-index:46;pointer-events:none;font-size:18px;transform:translate(-50%,-50%);transition:left .38s cubic-bezier(.4,0,.6,1),top .38s cubic-bezier(.4,0,.6,1),opacity .3s,transform .38s}
  .kd-ring{position:fixed;z-index:44;pointer-events:none;width:20px;height:20px;border-radius:50%;border:4px solid var(--rc);transform:translate(-50%,-50%);animation:kdring .7s ease-out forwards;box-shadow:0 0 20px var(--rc)}
  @keyframes kdring{to{width:180px;height:180px;opacity:0;border-width:1px}}
  .kd-bon{display:inline-flex;gap:2px;margin-left:4px;cursor:pointer}
  .kd-bon i{font-style:normal;font-size:12px;padding:0 4px;border-radius:6px;background:rgba(255,210,63,.18);border:1px solid rgba(255,210,63,.5)}
  .kd-decks{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
  .kd-dk{position:relative;border-radius:16px;padding:12px 14px;background:linear-gradient(160deg,var(--c1),var(--c2));border:2px solid color-mix(in srgb,var(--c1) 60%,#fff);color:#fff;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:4px;transition:transform .2s;animation:kdzoom .4s both}
  .kd-dk:hover{transform:translateY(-3px)} .kd-dk b{font-size:17px} .kd-dk small{opacity:.85} .kd-dk.bad{filter:grayscale(.7);opacity:.6;cursor:not-allowed}
  .kd-dk .e{position:absolute;right:12px;top:8px;font-size:28px} .kd-dk.mine{box-shadow:0 0 0 2px #ffd23f}
  .kd-dk .last{position:absolute;right:10px;bottom:8px;font-size:11px;background:rgba(0,0,0,.35);padding:2px 8px;border-radius:8px}
  .kd-rew{background:rgba(255,210,63,.1);border:1px solid rgba(255,210,63,.4);border-radius:14px;padding:10px 14px;text-align:left;font-size:14px;max-width:420px}
  .kd-rew b{color:#ffd23f;font-size:18px} .kd-rew div{margin-top:3px}
  .kd-lad{font-size:13px;color:#ffd23f}
  /* ---------- klassischer Kartenstil ---------- */
  .kd-card .cost{display:none}
  .kd-card .mc{position:absolute;top:3px;right:3px;display:flex;gap:1px;z-index:2}
  .pip{width:17px;height:17px;border-radius:50%;display:inline-grid;place-items:center;font-size:11px;font-weight:800;line-height:1;background:var(--pc,#cfcfd8);color:#1a1a1a;box-shadow:0 1px 2px rgba(0,0,0,.6),inset 0 -1px 2px rgba(0,0,0,.25)}
  .pip.gen{background:#cfcfd8}
  .kd-card.big .mc{top:8px;right:8px;gap:2px}.kd-card.big .pip{width:24px;height:24px;font-size:14px}
  .kd-card .in{padding-top:16px}
  .kd-card .tl{font-size:8.5px;color:#d8cfa8;font-weight:700;letter-spacing:.02em;border-top:1px solid rgba(255,255,255,.15);border-bottom:1px solid rgba(255,255,255,.15);width:100%;text-align:center;padding:1px 0}
  .kd-card.big .tl{font-size:13px;padding:3px 0}
  .kd-card .pt{position:absolute;bottom:-6px;right:-5px;min-width:34px;height:22px;padding:0 6px;border-radius:8px;background:linear-gradient(#f4ead0,#c9b88a);color:#2a1a00;font:800 13px/22px var(--body);text-align:center;border:2px solid #1a1030;box-shadow:0 2px 4px rgba(0,0,0,.5)}
  .kd-card.big .pt{min-width:58px;height:34px;font-size:20px;line-height:30px;bottom:-10px;right:-10px;border-radius:12px}
  .kd-card.land .in{justify-content:center}.kd-card.land .art{font-size:48px}.kd-card.big.land .art{font-size:110px}
  .kd-card .st,.kd-card .ty,.kd-card .sof{display:none}
  .kd-card .kwt{color:#ffe58a;font-weight:800}
  /* Phasenleiste, Länder, Mana */
  .kd-mid{justify-content:space-between;padding:0 4px}
  .kd-phase{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .kd-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:99px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.16);font-weight:800;font-size:13.5px;white-space:nowrap}
  .kd-pill.me{background:linear-gradient(135deg,rgba(255,210,63,.25),rgba(255,140,40,.15));border-color:rgba(255,210,63,.6);color:#ffe9a8}
  .kd-pill.warn{background:rgba(255,80,80,.18);border-color:rgba(255,100,100,.6);color:#ffd0d0}
  .kd-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
  .kd-lands{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;min-height:32px;margin:2px 0;position:relative;z-index:1;cursor:pointer}
  .kd-land{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;font-size:19px;font-style:normal;background:radial-gradient(circle at 35% 30%,var(--pc),color-mix(in srgb,var(--pc) 40%,#000));border:1px solid rgba(255,255,255,.4);box-shadow:0 2px 4px rgba(0,0,0,.5);transition:transform .3s,filter .3s}
  .kd-land.t{transform:rotate(90deg) scale(.86);filter:brightness(.45) saturate(.4)}
  .kd-land.pop{animation:kdsum .5s cubic-bezier(.2,1.5,.4,1)}
  .kd-land.flash{animation:kdlflash .5s}
  @keyframes kdlflash{40%{filter:brightness(2.2);transform:scale(1.2)}}
  .kd-lands .none{font-size:11px;color:#6a5e8a}
  .kd-mana{display:flex;gap:2px;align-items:center;flex-wrap:wrap;max-width:140px}
  .kd-mana .pip{width:17px;height:17px;font-size:10px}.kd-mana .pip.off{opacity:.28;filter:grayscale(1)}
  .kd-cnt{display:flex;gap:8px;font-size:12px;color:var(--muted);font-weight:700}
  .kd-icbtn{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);color:#fff;font-size:16px;cursor:pointer;display:grid;place-items:center;flex:none}
  .kd-topbtns{display:flex;gap:6px;flex:none}
  .kd-cre .ab{position:absolute;top:-8px;left:-6px;width:22px;height:22px;border-radius:50%;background:#3aa8ff;border:2px solid #0d0a18;font-size:12px;display:grid;place-items:center;z-index:3}
  .kd-cre .ab.on{background:#3dff8a;animation:kdcan 1.2s infinite}
  .kd-cre .au{position:absolute;bottom:14px;left:2px;font-size:11px;z-index:2}
  /* Mulligan */
  .kd-mull{display:flex;flex-direction:column;align-items:center;gap:14px;padding:10px 0;animation:kdzoom .4s both}
  .kd-mull .cards{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
  .kd-mull h2{margin:0;font:400 30px var(--display)}
  /* Aktions-Blatt (wie in Handyspielen von unten) */
  .kd-sheet{position:fixed;inset:0;z-index:9900;background:rgba(5,3,12,.6);display:flex;flex-direction:column;justify-content:flex-end;align-items:center;animation:kdfade .2s both}
  .kd-sheet .pan{width:min(560px,100%);background:linear-gradient(180deg,#241c3a,#161126);border-radius:24px 24px 0 0;border:1px solid #4a3f66;border-bottom:0;padding:10px 16px calc(env(safe-area-inset-bottom,0px) + 18px);display:flex;flex-direction:column;align-items:center;gap:12px;animation:kdsheet .3s cubic-bezier(.2,1.1,.4,1) both;max-height:88vh;overflow-y:auto}
  @keyframes kdsheet{from{transform:translateY(100%)}}
  .kd-sheet .grab{width:44px;height:5px;border-radius:3px;background:rgba(255,255,255,.25)}
  .kd-sheet .bigbtns{display:flex;flex-direction:column;gap:8px;width:100%}
  .kd-sheet .bigbtns .btn{width:100%;min-height:50px;font-size:17px}
  .kd-sheet h3{margin:0;font:400 24px var(--display)}
  .kd-gl{display:flex;flex-direction:column;gap:6px;width:100%;font-size:14px}
  .kd-gl div{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05)}
  .kd-gl b{color:#ffe58a}
  .kd-tabs{display:flex;gap:6px;background:rgba(0,0,0,.3);padding:4px;border-radius:14px}
  .kd-tabs button{border:0;background:none;color:#cfc6e6;font:800 14px var(--body);padding:8px 14px;border-radius:10px;cursor:pointer}
  .kd-tabs button.on{background:#ffd23f;color:#2a1a00}

  `;
  const stl = document.createElement('style'); stl.textContent = css; document.head.appendChild(stl);
  const q = s => document.querySelector(s);
  const S = { rid: null, seen: -1, atk: new Set(), blk: [], bsel: null, tgt: null, hand: new Set(), phaseKey: '' };
  const fc = f => F[f] || { col: '#666', col2: '#222', e: '❔', n: '?' };
  const cv = (f) => `--c1:${fc(f).col};--c2:${fc(f).col2}`;
  const kwIcons = kw => kw.map(k => (KW[k] ? KW[k][0] : '')).join('');
  const RAR = K.RAR;
  const stars = lv => (lv >= 2 ? `<span class="lvs">${'★'.repeat(lv)}</span>` : '');
  const lvFx = lv => (lv >= 3 ? '<i class="shine"></i>' : '') + (lv >= 5 ? '<i class="spk"></i>' : '');
  const MANA = { W: ['☀️', '#f8e7a0'], U: ['💧', '#7cc4ff'], B: ['💀', '#b894e8'], R: ['🔥', '#ff9a7a'], G: ['🌿', '#8ee0a8'], A: ['🗺️', '#f0c890'] };
  const pip = (ch, off) => ch === 'gen' ? '' : `<i class="pip ${off ? 'off' : ''}" style="--pc:${MANA[ch] ? MANA[ch][1] : '#ccc'}">${MANA[ch] ? MANA[ch][0] : ch}</i>`;
  function pips(m) { const o = K.parseCost(m); return (o.gen ? `<i class="pip gen">${o.gen}</i>` : '') + Object.entries(o).filter(([k]) => k !== 'gen').map(([k, n]) => pip(k).repeat(n)).join(''); }
  window.KDpips = pips;
  function cardHTML(id, o = {}) {
    const c = C[id]; if (!c) return '';
    const kw = (c.kw || []).map(k => KW[k] ? KW[k][1] : k).join(', '), lv = o.lv || 0, land = c.t === 'l';
    const txt = [kw ? `<span class="kwt">${kw}</span>` : '', c.txt ? esc(c.txt).replace(/\{(\w)\}/g, (m0, x) => (MANA[x] ? MANA[x][0] : x)) : ''].filter(Boolean).join(' ');
    return `<div class="kd-card ${land ? 'land' : ''} ${o.cls || ''} ${lv >= 2 ? 'lv' + lv : ''}" style="${cv(c.f)};${c.r ? `--rc:${RAR[c.r].col};` : ''}${o.style || ''}" ${o.attr || ''}>${lvFx(lv)}${land ? '' : `<span class="mc">${pips(c.m)}</span>`}${stars(lv)}
      <div class="in"><div class="art">${c.art}</div><b class="nm ${c.n.length > 13 ? 'ln' : ''}">${esc(c.n)}</b><div class="tl">${esc(c.tl || '')}</div>${txt ? `<p class="tx">${txt}</p>` : ''}</div>
      ${c.r && !land ? '<i class="rg"></i>' : ''}${c.t === 'k' ? `<span class="pt">${o.a ?? c.a}/${o.h ?? c.h}</span>` : ''}</div>`;
  }
  window.KDcard = cardHTML;
  const canAttack = c => !c.tap && !c.sick && !c.kw.includes('mauer') && !c.kw.includes('bann') && c.a > 0;
  const canBlock = (b, a) => !b.tap && !b.kw.includes('bann') && (!a.kw.includes('flug') || b.kw.includes('flug') || b.kw.includes('reich'));
  const targetsFor = (v, e) => {
    const me = v.me, foe = v.foe, out = [], tg = e.tg;
    if (tg === 'any') out.push('f:' + me, 'f:' + foe);
    for (const pid of [me, foe]) for (const c of v.P[pid].board) if ((tg === 'any' || tg === 'cre' || (tg === 'ecre' && pid === foe) || (tg === 'own' && pid === me)) && !(e.k === 'steal' && c.a > e.max) && !(c.kw.includes('fluch') && pid !== me)) out.push('u:' + c.u);
    return out;
  };
  // Mana wie auf dem Server: passt das in die ungetappten Länder?
  function canPay(v, m) {
    if (!m) return true;
    const o = K.parseCost(m), free = v.P[v.me].lands.filter(l => !l.tap).map(l => l.col);
    for (const [col, n] of Object.entries(o)) { if (col === 'gen') continue; for (let i = 0; i < n; i++) { const j = free.indexOf(col); if (j < 0) return false; free.splice(j, 1); } }
    return free.length >= o.gen;
  }
  const fast = c => !!(c.inst || (c.kw || []).includes('blitz'));
  const instWin = v => v.mine && ((v.phase === 'block' && v.turn !== v.me) || (v.phase === 'trick' && v.turn === v.me));
  const myMain = v => v.mine && v.turn === v.me && v.phase === 'main';
  const playable = (v, c) => {
    const P = v.P[v.me]; if (!v.mine) return false;
    if (c.t === 'l') return myMain(v) && !P.landPlayed;
    if (!(myMain(v) || (fast(c) && instWin(v)))) return false;
    return canPay(v, c.m) && !(c.t === 'k' && P.board.length >= 7) && !(c.t !== 'k' && c.e && c.e.tg && !targetsFor(v, c.e).length);
  };
  const abilityReady = (v, c) => { const A = C[c.id].act; return !!A && v.mine && (myMain(v) || instWin(v)) && !(A.tap && (c.tap || (c.sick && !c.kw.includes('eile')))) && canPay(v, A.m) && !(A.e.tg && !targetsFor(v, A.e).length); };
  function creHTML(c, v, side) {
    const k = C[c.id], my = side === 'me', main = myMain(v);
    const cls = ['kd-cre'];
    if (c.tap) cls.push('tap'); if (c.sick && !c.tap) cls.push('sick'); if (c.frz) cls.push('frz'); if (c.shield) cls.push('shield');
    if (my && main && !S.tgt && !v.attacked && canAttack(c)) cls.push(S.atk.has(c.u) ? 'sel' : 'can');
    if (v.atk.includes(c.u)) cls.push('attacking');
    if (S.bsel === c.u) cls.push('bsel');
    if (S.tgt && S.tgt.opts.includes('u:' + c.u)) cls.push('tgt');
    let badge = '';
    if (v.phase === 'block' || v.phase === 'trick') {
      const ai = v.atk.indexOf(c.u); if (ai >= 0) badge = `<span class="bl ak">${ai + 1}</span>`;
      const pairs = v.phase === 'block' && v.turn !== v.me ? S.blk : (v.bl || []);
      const mineB = pairs.filter(([b]) => b === c.u).map(([, a]) => v.atk.indexOf(Number(a)) + 1);
      if (mineB.length) badge = `<span class="bl">🛡${mineB.join('+')}</span>`;
    }
    const hurt = c.d > 0, up = c.a > k.a || c.h > k.h, lv = (v.P[side === 'me' ? v.me : v.foe].lv || {})[c.id] || 1;
    if (lv >= 2) cls.push('lv' + lv);
    const ab = k.act ? `<span class="ab ${my && abilityReady(v, c) ? 'on' : ''}">⟳</span>` : '';
    return `<div class="${cls.join(' ')}" style="${cv(k.f)};${k.r ? `--rc:${RAR[k.r].col}` : ''}" data-u="${c.u}" data-side="${side}" data-lv="${lv}" data-f="${k.f}">${lvFx(lv)}${k.r ? '<i class="rg"></i>' : ''}${badge}${ab}<div class="kwi">${kwIcons(c.kw)}</div><div class="art">${k.art}</div><span class="cn">${esc(k.n)}</span>${(c.auras || []).length ? `<span class="au">📜${c.auras.length}</span>` : ''}${c.sick && !c.tap && my ? '<span class="zz">💤</span>' : ''}
      <span class="st a ${c.a > k.a ? 'up' : ''}">${c.a}</span><span class="st h ${hurt ? 'hurt' : ''} ${up && !hurt ? 'up' : ''}">${c.h - c.d}</span></div>`;
  }
  const HE = K.HEROES || {};
  function heroHTML(v, pid, side) {
    const h = v.P[pid].hero; if (!h || !HE[h.id]) return '';
    const H = HE[h.id], f = fc(h.id), ready = h.cd === 0, mineNow = side === 'me' && myMain(v) && !S.tgt;
    const pct = Math.round((1 - h.cd / H.cd) * 100);
    return `<button class="kd-hero ${ready ? 'ready' : ''} ${ready && mineNow ? 'go' : ''}" data-kdhero="${pid}" style="--c1:${f.col};--c2:${f.col2};--p:${pct}%" aria-label="Held"><span class="hp">${H.art}</span>${ready ? '<span class="rd">⚡</span>' : `<span class="cdn">${h.cd}</span>`}</button>`;
  }
  function manaHTML(P) { // ungetappte Länder als leuchtende Mana-Symbole
    const cols = {}; for (const l of P.lands) { cols[l.col] = cols[l.col] || [0, 0]; cols[l.col][0]++; if (!l.tap) cols[l.col][1]++; }
    return Object.entries(cols).map(([c, [n, free]]) => pip(c).repeat(free) + pip(c, 1).repeat(n - free)).join('') || '<span class="note" style="font-size:11px">kein Mana</span>';
  }
  function landsHTML(v, pid) { const L = v.P[pid].lands; return `<div class="kd-lands" data-kdlands="${pid}">${L.length ? L.map(l => `<i class="kd-land ${l.tap ? 't' : ''}" data-l="${l.u}" style="--pc:${MANA[l.col][1]}">${MANA[l.col][0]}</i>`).join('') : '<span class="none">noch keine Länder</span>'}</div>`; }
  function barHTML(v, pid, side) {
    const P = v.P[pid], f = fc(P.fac);
    const tg = S.tgt && S.tgt.opts.includes('f:' + pid) ? 'tgt' : '';
    return `<div class="kd-bar ${v.turn === pid && v.phase !== 'end' ? 'turn' : ''}"><div class="who"><span class="av" style="--c1:${f.col};--c2:${f.col2}">${P.art || (pid === 'bot' ? '🤖' : f.e)}</span><span class="nm">${esc(v.nm[pid])}${side === 'me' && v.mine ? ' (du)' : ''}${(P.bon || []).length ? `<span class="kd-bon" data-kdbon="${pid}">${P.bon.map(b => `<i>${fc(b).e}</i>`).join('')}</span>` : ''}
      <small class="kd-cnt"><span>🂠 ${P.hand}</span><span>📚 ${P.deck}</span><span>🪦 ${P.grave}</span></small></span></div>
      <div class="kd-mana">${manaHTML(P)}</div>${heroHTML(v, pid, side)}
      <div class="kd-life ${P.life <= 5 ? 'low' : ''} ${tg}" data-face="f:${pid}">${Math.max(0, P.life)}</div></div>`;
  }

  function render(stage, v) {
    if (S.rid !== room.id) { S.rid = room.id; S.seen = -1; S.atk.clear(); S.blk = []; S.bsel = null; S.tgt = null; S.hand = new Set(); }
    const pk = v.phase + ':' + v.turn + ':' + v.n + ':' + v.attacked;
    if (pk !== S.phaseKey) { S.phaseKey = pk; if (v.phase !== 'end') S.arenaShown = 0; S.atk.clear(); S.blk = []; S.bsel = null; S.tgt = null; }
    if (v.phase === 'pick') return renderPick(stage, v);
    if (v.phase === 'mull') return renderMull(stage, v);
    const prev = {}; stage.querySelectorAll('[data-u]').forEach(e => { prev[e.dataset.u] = { r: e.getBoundingClientRect(), html: e.outerHTML }; });
    const me = v.me, foe = v.foe, myTurn = v.mine && v.turn === me, P = v.P[me];
    const hand = v.hand.map((h, i) => {
      const c = C[h.id], ok = playable(v, c), n = v.hand.length, mid = (n - 1) / 2;
      const isNew = S.seen >= 0 && !S.hand.has(h.h);
      return cardHTML(h.id, { lv: (P.lv || {})[h.id] || 1, cls: (ok ? 'play' : 'no') + (isNew ? ' new' : '') + (S.tgt && S.tgt.i === i ? ' on' : ''), attr: `data-hi="${i}"`, style: `--r:${((i - mid) * (n > 6 ? 1.5 : 2.5)).toFixed(1)}deg;--y:${(Math.abs(i - mid) ** 1.5 * 1.5).toFixed(1)}px;animation-delay:${isNew ? 0.1 : 0}s` });
    }).join('');
    S.hand = new Set(v.hand.map(h => h.h));
    let pill = '', acts = '';
    if (v.phase === 'end') {
      const win = v.winner === me && v.mine, rw = v.rew;
      const nextAr = v.arena != null ? (rw && rw.tr != null ? K.arenaOf(rw.tr) : v.arena) : null;
      if (rw && rw.newArena != null && !S.arenaShown) { S.arenaShown = 1; const A = K.ARENAS[rw.newArena]; setTimeout(() => { banner(`${A.e} ${A.n}!`); if (window.g3confetti) g3confetti(160); }, 400); }
      pill = `<div class="kd-end"><div class="big ${win || !v.mine ? '' : 'l'}">${v.draw ? 'Unentschieden!' : win ? '🏆 Sieg!' : v.mine ? 'Niederlage' : `${esc(v.nm[v.winner])} gewinnt!`}</div>
        ${rw && rw.lines && rw.lines.length ? `<div class="kd-rew">${rw.f ? `<b>+${rw.f} 🪙</b>` : ''}${rw.lines.map(l => `<div>${esc(l)}</div>`).join('')}</div>` : ''}
        <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap">${v.bot && isHost() ? (nextAr != null ? `<button class="btn" data-kdbot="1" data-kdarena="${nextAr}">🏆 Nächster Kampf</button>` : `<button class="btn" data-kdbot="0">⚔️ Nochmal</button>`) : againHTML('⚔️ Revanche!')}<button class="btn ghost" data-kdz="spielen">💎 Zentrale</button></div></div>`;
    } else if (S.tgt) {
      const what = S.tgt.hero ? HE[P.hero.id].pow : S.tgt.abil ? 'Fähigkeit' : (v.hand[S.tgt.i] ? C[v.hand[S.tgt.i].id].n : '');
      pill = `<span class="kd-pill me">🎯 Ziel für ${esc(what)}</span>`; acts = '<button class="btn ghost small" data-kd="cancel">✕ Abbrechen</button>';
    } else if (v.phase === 'block') {
      if (v.mine && v.turn !== me) { const n = S.blk.length; pill = `<span class="kd-pill warn">🛡️ ${S.bsel != null ? 'Angreifer antippen' : 'Blocker wählen'}</span>`; acts = `<button class="btn" data-kd="block">${n ? `✅ Blocken (${n})` : 'Nicht blocken'}</button>`; }
      else pill = `<span class="kd-pill">⏳ ${esc(v.nm[foe === v.turn ? me : foe])} blockt …</span>`;
    } else if (v.phase === 'trick') {
      if (v.mine && v.turn === me) { pill = '<span class="kd-pill me">⚡ Kampftricks?</span>'; acts = '<button class="btn atk" data-kd="go">💥 Kampfschaden</button>'; }
      else pill = `<span class="kd-pill">⏳ ${esc(v.nm[v.turn])} überlegt …</span>`;
    } else if (myTurn) {
      const n = S.atk.size, can = !v.attacked && P.board.some(canAttack);
      pill = `<span class="kd-pill me">${v.attacked ? '☀️ Zweite Hauptphase' : '☀️ Hauptphase'}</span>`;
      acts = `${can && !n ? '<button class="btn ghost small" data-kd="all">⚔️ Alle</button>' : ''}${n ? `<button class="btn atk" data-kd="attack">⚔️ Angreifen (${n})</button>` : ''}<button class="btn end" data-kd="end">Zug beenden ⏭</button>`;
    } else pill = `<span class="kd-pill">⏳ ${esc(v.nm[v.turn])} ist am Zug</span>`;
    if (v.left != null && v.phase !== 'end') pill += ` <span class="kd-pill">⏱ <span data-cd></span></span>`;
    const row = (pid, side) => { const b = v.P[pid].board; return `<div class="kd-row ${side}">${b.length ? b.map(c => creHTML(c, v, side)).join('') : '<span class="empty">–</span>'}</div>`; };
    stage.dataset.mode = 'kd';
    const AR = v.arena != null && K.ARENAS ? K.ARENAS[v.arena] : null;
    const mid = v.phase === 'end' ? pill : `<div class="kd-topbtns"><button class="kd-icbtn" data-kdrules="1" aria-label="Regeln">📖</button><button class="kd-icbtn" data-kdlog="1" aria-label="Verlauf">📜</button></div><div class="kd-phase">${pill}</div><div class="kd-acts">${acts}</div>`;
    stage.innerHTML = `<div class="kd"><div class="kd-table" style="--fo:${fc(v.P[foe].fac).col};--fm:${fc(P.fac).col};${AR ? `background:radial-gradient(ellipse at 50% 50%,color-mix(in srgb,${AR.col} 22%,transparent),transparent 70%),linear-gradient(180deg,${AR.col2},#0d0a18 50%,${AR.col2})` : ''}">
      ${barHTML(v, foe, 'foe')}${landsHTML(v, foe)}${row(foe, 'foe')}<div class="kd-mid">${mid}</div>${row(me, 'me')}${landsHTML(v, me)}${barHTML(v, me, 'me')}</div>
      ${v.mine ? `<div class="kd-hand">${hand || '<span class="note">Keine Handkarten</span>'}</div>` : ''}</div>`;
    if (deadline != null) { const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); stage.querySelectorAll('[data-cd]').forEach(e => (e.textContent = s)); }
    animate(stage, v, prev);
  }
  function renderMull(stage, v) {
    const done = v.mull && v.mull[v.me], key = 'mull' + v.hand.map(h => h.h).join() + done;
    if (stage.dataset.mode === key) return; stage.dataset.mode = key;
    const P = v.P[v.me], lands = v.hand.filter(h => C[h.id].t === 'l').length;
    stage.innerHTML = `<div class="kd"><div class="kd-mull"><h2>Deine Starthand</h2>
      <div class="kd-phase"><span class="kd-pill">🃏 ${v.hand.length} Karten</span><span class="kd-pill">🏞️ ${lands} Länder</span><span class="kd-pill">${v.first === v.me ? '▶️ Du beginnst' : '⏸ Gegner beginnt'}</span></div>
      <div class="cards">${v.hand.map(h => cardHTML(h.id, { lv: (P.lv || {})[h.id] || 1 })).join('')}</div>
      ${!v.mine ? '' : done ? '<span class="kd-pill">⏳ Warte auf den Gegner …</span>' : `<div class="row" style="gap:10px;justify-content:center"><button class="btn" data-kdkeep="1" style="min-height:52px;font-size:18px">✅ Behalten</button>${v.mulled[v.me] ? '' : `<button class="btn ghost" data-kdmull="1" style="min-height:52px;font-size:18px">🔄 Mulligan (${v.hand.length - 1})</button>`}</div>`}
      ${v.left != null ? '<span class="kd-pill">⏱ <span data-cd></span></span>' : ''}</div></div>`;
  }
  function renderPick(stage, v) {
    const mineF = v.P[v.me].fac, foeF = v.P[v.foe].fac;
    const key = 'pick' + mineF + foeF + (v.opts || []).length;
    if (stage.dataset.mode === key) return; stage.dataset.mode = key;
    const dk = (o, i) => { const f = fc(o.th); return `<button class="kd-dk ${o.mine ? 'mine' : ''} ${o.ok === false ? 'bad' : ''}" data-kdd="${o.id}" style="--c1:${f.col};--c2:${f.col2};animation-delay:${i * 0.05}s">
      <span class="e">${o.hero && HE[o.hero] ? HE[o.hero].art : f.e}</span><b>${esc(o.n)}</b><small>${o.ok === false ? '⚠️ unfertig' : o.bon.length ? o.bon.map(b => fc(b).e + ' ' + K.B[b][0]).join(' · ') : f.n}</small>${v.lastDeck === o.id ? '<span class="last">zuletzt</span>' : ''}</button>`; };
    const my = (v.opts || []).filter(o => o.mine), base = (v.opts || []).filter(o => !o.mine);
    const foeTxt = `${v.P[v.foe].art || (v.bot ? '🤖' : '👤')} ${esc(v.nm[v.foe])}`;
    stage.innerHTML = `<div class="kd"><div class="kd-phase" style="justify-content:center"><span class="kd-pill me">⚔️ Deck wählen</span><span class="kd-pill">Gegner: ${foeTxt}</span>${v.left != null ? '<span class="kd-pill">⏱ <span data-cd></span></span>' : ''}</div>
      ${!v.mine ? '<p class="status">Die Spieler wählen ihre Decks …</p>' : mineF ? `<p class="status">✅ Deck gewählt${foeF ? '' : ` – warte auf ${esc(v.nm[v.foe])}`}</p>` : `
      ${my.length ? `<div class="kd-decks">${my.map(dk).join('')}</div>` : ''}
      <div class="kd-phase" style="justify-content:center;margin-top:10px"><span class="kd-pill">🃏 Leihdecks</span></div><div class="kd-decks" style="margin-top:8px">${base.map(dk).join('')}</div>`}</div>`;
  }
  function banner(t) { const b = document.createElement('div'); b.className = 'kd-banner'; b.style.fontSize = 'clamp(28px,7vw,54px)'; b.textContent = t; document.body.appendChild(b); setTimeout(() => b.remove(), 1700); }
  const PT = { glut: ['🔥', '#ff5a3d'], wild: ['🍃', '#3ec46d'], flut: ['💧', '#3aa8ff'], nacht: ['🟣', '#a45cff'], licht: ['✨', '#f5c542'], abent: ['⭐', '#e0a050'] };
  function trail(from, to, f, lv, delay) {
    const [em, col] = PT[f] || ['✦', '#fff'];
    setTimeout(() => {
      for (let i = 0; i < 7; i++) setTimeout(() => {
        const p = document.createElement('i'); p.className = 'kd-pt'; p.textContent = em;
        p.style.left = from[0] + (Math.random() - 0.5) * 20 + 'px'; p.style.top = from[1] + (Math.random() - 0.5) * 20 + 'px'; document.body.appendChild(p);
        requestAnimationFrame(() => requestAnimationFrame(() => { p.style.left = to[0] + (Math.random() - 0.5) * 30 + 'px'; p.style.top = to[1] + (Math.random() - 0.5) * 30 + 'px'; p.style.transform = 'translate(-50%,-50%) scale(.5)'; p.style.opacity = '0.2'; }));
        setTimeout(() => p.remove(), 450);
      }, i * 40);
      if (lv >= 5) setTimeout(() => { burst(to, em, col); }, 380);
    }, Math.max(0, delay));
  }
  function burst(at, em, col) {
    const r = document.createElement('div'); r.className = 'kd-ring'; r.style.cssText = `left:${at[0]}px;top:${at[1]}px;--rc:${col}`; document.body.appendChild(r); setTimeout(() => r.remove(), 750);
    for (let i = 0; i < 10; i++) { const p = document.createElement('i'); p.className = 'kd-pt'; p.textContent = em; p.style.left = at[0] + 'px'; p.style.top = at[1] + 'px'; document.body.appendChild(p);
      const a = (i / 10) * Math.PI * 2; requestAnimationFrame(() => requestAnimationFrame(() => { p.style.left = at[0] + Math.cos(a) * 70 + 'px'; p.style.top = at[1] + Math.sin(a) * 70 + 'px'; p.style.opacity = '0'; })); setTimeout(() => p.remove(), 450); }
  }
  function ring(el, lv, delay) { setTimeout(() => { const c = centerOf(el), col = (PT[el.dataset.f] || [0, '#fff'])[1]; const r = document.createElement('div'); r.className = 'kd-ring'; r.style.cssText = `left:${c[0]}px;top:${c[1]}px;--rc:${col}`; document.body.appendChild(r); setTimeout(() => r.remove(), 750); if (lv >= 5) burst(c, (PT[el.dataset.f] || ['✦'])[0], col); }, delay); }
  window.KDfx = { burst, ring };
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
      if (e.k === 'summon') { if (el) { el.classList.add('summon'); setTimeout(() => el.classList.remove('summon'), 700); if (Number(el.dataset.lv) >= 4) ring(el, Number(el.dataset.lv), delay + 150); } }
      else if (e.k === 'land') { const l = stage.querySelector(`[data-l="${e.u}"]`); if (l) l.classList.add('pop'); }
      else if (e.k === 'tapL') for (const u of e.us || []) { const l = stage.querySelector(`[data-l="${u}"]`); if (l) pulse(l, 'flash', delay); }
      else if (e.k === 'ability') { pulse(el, 'shake', delay); if (el && e.tgt) { const to = pos(e.tgt); if (to) trail(centerOf(el), to, el.dataset.f, 5, delay + 100); } delay += 300; }
      else if (e.k === 'hit') {
        delay += 380; const a = stage.querySelector(`[data-u="${e.from}"]`) || null, pv = prev[e.from];
        if (a) pulse(a, a.dataset.side === 'me' ? 'lunge-up' : 'lunge-dn', delay - 300);
        const lv = a ? Number(a.dataset.lv) : pv ? Number((pv.html.match(/data-lv="(\d)"/) || [])[1]) : 1, f = a ? a.dataset.f : pv ? (pv.html.match(/data-f="(\w+)"/) || [])[1] : '';
        const from = a ? centerOf(a) : pv ? [pv.r.left + pv.r.width / 2, pv.r.top + pv.r.height / 2] : null, to = pos(e.to);
        if (lv >= 4 && from && to) trail(from, to, f, lv, delay - 280);
      }
      else if (e.k === 'weak') { const p = pos(e.t); if (p) floatAt(p[0], p[1], `−${e.a}/−${e.h}`, 'b', delay); pulse(el, 'shake', delay); }
      else if (e.k === 'steal') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '🪦 übernommen', 'b', delay); }
      else if (e.k === 'dmg') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '-' + e.n, '', delay); pulse(el, 'shake', delay); if (navigator.vibrate && e.t === 'f:' + v.me && v.mine) setTimeout(() => navigator.vibrate(40), delay); }
      else if (e.k === 'heal') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '+' + e.n, 'g', delay); }
      else if (e.k === 'buff') { const p = pos(e.t); if (p) floatAt(p[0], p[1], e.kw && e.kw.includes('bann') ? '🔗' : `+${e.a}/+${e.h}`, 'y', delay); }
      else if (e.k === 'freeze') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '❄️', 'b', delay); }
      else if (e.k === 'shield') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '🛡️', 'y', delay); }
      else if (e.k === 'kill') { const p = pos(e.t); if (p) floatAt(p[0], p[1], '💀', '', delay); }
      else if (e.k === 'ramp') { const b = stage.querySelector(`[data-kdlands="${e.p}"]`); if (b) { const p = centerOf(b); floatAt(p[0], p[1], '+🏞️', 'b', delay); } }
      else if (e.k === 'die' || e.k === 'bounce') {
        const p = prev[e.t.slice(2)]; if (!p) continue;
        const g = document.createElement('div'); g.innerHTML = p.html; const n = g.firstElementChild; if (!n) continue;
        n.classList.remove('sel', 'can', 'tgt', 'summon'); n.classList.add('kd-ghost');
        Object.assign(n.style, { left: p.r.left + 'px', top: p.r.top + 'px', width: p.r.width + 'px', height: p.r.height + 'px' });
        document.body.appendChild(n); setTimeout(() => n.classList.add(e.k === 'die' ? 'die' : 'bounce'), delay + 150); setTimeout(() => n.remove(), delay + 1100);
      }
      else if (e.k === 'play' && e.p !== v.me) {
        const o = document.createElement('div'); o.className = 'kd-cast'; o.innerHTML = `<div class="who">${esc(v.nm[e.p])} wirkt</div>${cardHTML(e.id, { cls: 'big', lv: (v.P[e.p].lv || {})[e.id] || 1 })}`;
        document.body.appendChild(o); setTimeout(() => o.remove(), 1650); delay += 500;
      }
      else if (e.k === 'heropow') {
        const hb = stage.querySelector(`[data-kdhero="${e.p}"]`), H = HE[e.id];
        if (hb) { hb.classList.add('fire'); setTimeout(() => hb.classList.remove('fire'), 900); burst(centerOf(hb), H ? H.art : '⚡', fc(e.id).col); }
        if (H) banner(`${H.art} ${H.pow}!`);
        if (hb && e.tgt) { const to = pos(e.tgt); if (to) trail(centerOf(hb), to, e.id, 5, 200); }
        delay += 500;
      }
      else if (e.k === 'turn' && e.p === v.me && v.mine) banner('Dein Zug!');
      else if (e.k === 'burn' && e.p === v.me && v.mine) toast(`Hand voll – ${C[e.id].n} kommt in den Friedhof.`);
      else if (e.k === 'end' && v.mine && v.winner === v.me && window.g3confetti) setTimeout(() => g3confetti(140), delay + 300);
    }
  }
  // ---------- Blätter von unten (Handyspiel-Stil) ----------
  function sheet(html, opts = {}) {
    const o = document.createElement('div'); o.className = 'kd-sheet'; o.innerHTML = `<div class="pan"><i class="grab"></i>${html}</div>`; document.body.appendChild(o);
    const close = () => { o.remove(); }; o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-kdx]')) close(); });
    let y0 = null; const pan = o.querySelector('.pan'); // nach unten wischen schließt
    pan.addEventListener('touchstart', e => { if (pan.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    pan.addEventListener('touchmove', e => { if (y0 != null) { const d = e.touches[0].clientY - y0; if (d > 0) pan.style.transform = `translateY(${d}px)`; } }, { passive: true });
    pan.addEventListener('touchend', e => { if (y0 == null) return; const d = (e.changedTouches[0].clientY - y0); y0 = null; if (d > 90) close(); else pan.style.transform = ''; });
    return o;
  }
  window.KDsheet = sheet;
  const popup = sheet;
  const kwList = kw => kw.length ? `<div class="kd-gl">${kw.map(k => KW[k] ? `<div><span>${KW[k][0]}</span><span><b>${KW[k][1]}</b> – ${KW[k][2]}</span></div>` : '').join('')}</div>` : '';
  function showHand(i) {
    const v = room.view, h = v.hand[i]; if (!h) return; const c = C[h.id], P = v.P[v.me];
    const ok = playable(v, c);
    const why = !v.mine ? '' : c.t === 'l' ? (P.landPlayed ? 'Du hast in diesem Zug schon ein Land gespielt.' : 'Länder spielst du in deiner Hauptphase.') : !(myMain(v) || (fast(c) && instWin(v))) ? (fast(c) ? 'Gerade ist der Gegner dran.' : 'Nur in deiner Hauptphase.') : !canPay(v, c.m) ? 'Nicht genug passendes Mana.' : 'Dafür gibt es gerade kein Ziel.';
    const o = sheet(`${cardHTML(h.id, { cls: 'big', lv: (P.lv || {})[h.id] || 1 })}${kwList(c.kw || [])}<div class="bigbtns">${ok ? `<button class="btn" data-kdplay="1">${c.t === 'l' ? '🏞️ Land ausspielen' : '✨ Wirken'}</button>` : `<span class="kd-pill warn" style="justify-content:center">${why}</span>`}<button class="btn ghost" data-kdx="1">Schließen</button></div>`);
    const b = o.querySelector('[data-kdplay]'); if (b) b.addEventListener('click', () => { o.remove(); tryPlay(i); });
  }
  function tryPlay(i) {
    const v = room.view, h = v.hand[i]; if (!h) return; const c = C[h.id];
    if (c.t !== 'l' && c.e && c.e.tg) {
      const opts = targetsFor(v, c.e);
      if (opts.length) { S.tgt = { i, opts }; S.atk.clear(); renderRoom(); return; }
      if (c.t !== 'k') { toast('Dafür gibt es gerade kein Ziel.'); return; }
    }
    act({ type: 'play', i });
  }
  function useAbility(u) {
    const v = room.view, c = v.P[v.me].board.find(x => x.u === u); if (!c) return; const A = C[c.id].act;
    if (A.e.tg) { const opts = targetsFor(v, A.e); if (!opts.length) { toast('Dafür gibt es gerade kein Ziel.'); return; } S.tgt = { abil: u, opts }; S.atk.clear(); renderRoom(); return; }
    act({ type: 'ability', u });
  }
  function showHero(v, pid) {
    const h = v.P[pid].hero, H = HE[h.id], f = fc(h.id), mine = pid === v.me && v.mine, can = mine && myMain(v) && h.cd === 0;
    const o = sheet(`<div class="kd-heroc" style="--c1:${f.col};--c2:${f.col2}"><span class="hp">${H.art}</span><b>${esc(H.n)}</b><small>${f.e} Held</small>
      <div class="pw"><b>⚡ ${esc(H.pow)}</b><div>${esc(H.txt)}</div></div></div><div class="kd-phase" style="justify-content:center"><span class="kd-pill">⏳ alle ${H.cd} Züge</span><span class="kd-pill ${h.cd ? '' : 'me'}">${h.cd ? `bereit in ${h.cd}` : '⚡ bereit'}</span></div>
      <div class="bigbtns">${can ? '<button class="btn" data-kdpow="1">⚡ Heldenkraft einsetzen</button>' : ''}<button class="btn ghost" data-kdx="1">Schließen</button></div>`);
    const b = o.querySelector('[data-kdpow]'); if (b) b.addEventListener('click', () => {
      o.remove(); const e = H.e;
      if (e.tg) { const opts = targetsFor(v, e); if (!opts.length) { toast('Dafür gibt es gerade kein Ziel.'); return; } S.tgt = { hero: 1, opts }; S.atk.clear(); renderRoom(); return; }
      act({ type: 'hero' });
    });
  }
  function showCre(u, actions) {
    const v = room.view; let c = null, lv = 1, side = null; for (const pid of [v.me, v.foe]) { const x = v.P[pid].board.find(y => y.u === u); if (x) { c = x; side = pid; lv = (v.P[pid].lv || {})[x.id] || 1; } } if (!c) return;
    const st = [c.tap && (c.frz ? '❄️ eingefroren' : '↪️ getappt'), c.sick && !c.tap && '💤 gerade gekommen', c.shield && '🛡️ Schutzschild', c.d && `💔 ${c.d} Schaden`, (c.auras || []).length && `📜 ${c.auras.map(a => C[a].n).join(', ')}`].filter(Boolean);
    const mine = side === v.me && v.mine, ab = mine && abilityReady(v, c), atkOk = mine && myMain(v) && !v.attacked && canAttack(c);
    const o = sheet(`${cardHTML(c.id, { cls: 'big', a: c.a, h: c.h - c.d, lv })}${st.length ? `<div class="kd-phase" style="justify-content:center">${st.map(x => `<span class="kd-pill">${x}</span>`).join('')}</div>` : ''}${kwList(c.kw)}
      <div class="bigbtns">${ab ? '<button class="btn" data-kdab="1">⟳ Fähigkeit nutzen</button>' : ''}${atkOk ? `<button class="btn ${S.atk.has(u) ? 'ghost' : 'atk'}" data-kdatk="1">${S.atk.has(u) ? '✕ Nicht angreifen' : '⚔️ Angreifen'}</button>` : ''}<button class="btn ghost" data-kdx="1">Schließen</button></div>`);
    const a1 = o.querySelector('[data-kdab]'); if (a1) a1.addEventListener('click', () => { o.remove(); useAbility(u); });
    const a2 = o.querySelector('[data-kdatk]'); if (a2) a2.addEventListener('click', () => { o.remove(); if (S.atk.has(u)) S.atk.delete(u); else S.atk.add(u); renderRoom(); });
  }
  function showRules() {
    const M = K.MODES.klassisch;
    const o = sheet(`<h3>📖 Regeln</h3><div class="kd-tabs"><button class="on" data-rt="r">Ablauf</button><button data-rt="k">Fähigkeiten</button><button data-rt="m">Mana</button></div><div class="kd-gl" data-rtc></div><button class="btn ghost" data-kdx="1" style="width:100%">Schließen</button>`);
    const fill = t => { o.querySelectorAll('[data-rt]').forEach(b => b.classList.toggle('on', b.dataset.rt === t)); o.querySelector('[data-rtc]').innerHTML = t === 'r' ? M.rules.map((x, i) => `<div><span>${i + 1}.</span><span>${esc(x)}</span></div>`).join('')
      : t === 'k' ? Object.values(KW).map(k => `<div><span>${k[0]}</span><span><b>${k[1]}</b> – ${k[2]}</span></div>`).join('')
      : Object.entries(F).map(([f, x]) => `<div><span>${pip(x.m)}</span><span><b>${x.n}</b> – Land „${x.land}“. ${esc(x.txt)}</span></div>`).join('') + '<div><span>⟳</span><span><b>Tappen</b> – Länder tappen sich beim Bezahlen von selbst. Getappte Länder sind ausgegraut und enttappen zu Beginn deines Zuges.</span></div>'; };
    fill('r'); o.addEventListener('click', e => { const b = e.target.closest('[data-rt]'); if (b) fill(b.dataset.rt); });
  }
  window.KDrules = showRules;
  // gedrückt halten: Details
  let holdT = null, held = false;
  document.addEventListener('pointerdown', e => { const h = e.target.closest && e.target.closest('#stage [data-u], #stage [data-hi]'); if (!h || !room || room.game !== 'duell') return; held = false; clearTimeout(holdT); holdT = setTimeout(() => { held = true; if (h.dataset.u) showCre(Number(h.dataset.u)); else showHand(Number(h.dataset.hi)); }, 480); });
  ['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => clearTimeout(holdT)));
  document.addEventListener('click', e => { if (held && e.target.closest('#stage [data-u], #stage [data-hi]')) { e.stopImmediatePropagation(); e.preventDefault(); held = false; } }, true);
  document.addEventListener('click', e => {
    if (!room || room.game !== 'duell') return;
    const kb = e.target.closest('[data-kdbot]'); if (kb && isHost()) { const ar = kb.dataset.kdarena; send({ t: 'start', bot: 1, ...(ar != null ? { arena: Number(ar) } : {}) }); return; }
    if (e.target.closest('[data-kdrinfo]')) { showRules(); return; }
    if (!room.view) return;
    const v = room.view;
    if (e.target.closest('[data-kdkeep]')) { act({ type: 'keep' }); return; }
    if (e.target.closest('[data-kdmull]')) { act({ type: 'mull' }); return; }
    const f = e.target.closest('[data-kdd]'); if (f) { if (f.classList.contains('bad')) { toast('Dieses Deck ist nicht fertig – baue es in der Zentrale fertig.'); return; } act({ type: 'deck', d: f.dataset.kdd }); return; }
    if (e.target.closest('[data-kdrules]')) { showRules(); return; }
    if (e.target.closest('[data-kdlog]')) { sheet(`<h3>📜 Verlauf</h3><div class="kd-gl">${v.log.slice().reverse().map(l => `<div><span>•</span><span>${esc(l)}</span></div>`).join('')}</div><button class="btn ghost" data-kdx="1" style="width:100%">Schließen</button>`); return; }
    const bo = e.target.closest('[data-kdbon]'); if (bo) { const P = v.P[bo.dataset.kdbon]; sheet(`<h3>🎨 Themen-Bonus</h3><div class="kd-gl">${(P.bon || []).map(b => `<div><span>${fc(b).e}</span><span><b>${K.B[b][0]}</b> – ${K.B[b][1]}</span></div>`).join('')}</div><button class="btn ghost" data-kdx="1" style="width:100%">Schließen</button>`); return; }
    const ld = e.target.closest('[data-kdlands]'); if (ld && !S.tgt) { const L = v.P[ld.dataset.kdlands].lands, cnt = {}; for (const l of L) { cnt[l.col] = cnt[l.col] || [0, 0]; cnt[l.col][0]++; if (!l.tap) cnt[l.col][1]++; }
      sheet(`<h3>🏞️ Länder</h3><div class="kd-gl">${Object.entries(cnt).map(([c, [n, fr]]) => `<div><span>${pip(c)}</span><span><b>${C['land_' + c].n}</b> – ${n}× im Spiel, ${fr} ungetappt</span></div>`).join('') || '<div><span>–</span><span>Noch keine Länder im Spiel.</span></div>'}</div><button class="btn ghost" data-kdx="1" style="width:100%">Schließen</button>`); return; }
    if (!e.target.closest('#stage')) return;
    const hb = e.target.closest('[data-kdhero]');
    if (hb && !S.tgt) { showHero(v, hb.dataset.kdhero); return; }
    if (S.tgt) {
      const t = e.target.closest('[data-u],[data-face]'); const key = t ? (t.dataset.face || 'u:' + t.dataset.u) : null;
      if (key && S.tgt.opts.includes(key)) { const T = S.tgt; S.tgt = null; act(T.hero ? { type: 'hero', t: key } : T.abil ? { type: 'ability', u: T.abil, t: key } : { type: 'play', i: T.i, t: key }); return; }
      if (e.target.closest('[data-kd="cancel"]') || e.target.closest('[data-hi]')) { S.tgt = null; renderRoom(); }
      return;
    }
    const b = e.target.closest('[data-kd]');
    if (b) {
      const a = b.dataset.kd;
      if (a === 'end') { if (S.atk.size && !v.attacked) { const o = sheet(`<h3>Zug beenden?</h3><span class="kd-pill warn">Du hast Angreifer gewählt, aber nicht angegriffen.</span><div class="bigbtns"><button class="btn atk" data-y="a">⚔️ Doch angreifen</button><button class="btn ghost" data-y="e">Zug beenden</button></div>`); o.addEventListener('click', ev => { const y = ev.target.closest('[data-y]'); if (!y) return; o.remove(); act(y.dataset.y === 'a' ? { type: 'attack', us: [...S.atk] } : { type: 'end' }); }); return; } act({ type: 'end' }); }
      else if (a === 'attack') act({ type: 'attack', us: [...S.atk] });
      else if (a === 'all') { v.P[v.me].board.filter(canAttack).forEach(c => S.atk.add(c.u)); renderRoom(); }
      else if (a === 'block') act({ type: 'block', b: S.blk });
      else if (a === 'go') act({ type: 'go' });
      return;
    }
    const h = e.target.closest('[data-hi]'); if (h) { const i = Number(h.dataset.hi), c = C[v.hand[i].id]; if (c.t === 'l' && playable(v, c)) { act({ type: 'play', i }); return; } showHand(i); return; }
    const cEl = e.target.closest('[data-u]'); if (!cEl) return;
    const u = Number(cEl.dataset.u), side = cEl.dataset.side;
    const mine = v.P[v.me].board.find(c => c.u === u);
    if (v.phase === 'block' && v.mine && v.turn !== v.me) { // Blocken: mehrere Blocker pro Angreifer, Wache blockt zwei
      if (side === 'me' && mine) {
        if (abilityReady(v, mine) && S.bsel == null && !S.blk.some(([x]) => x === u)) { showCre(u); return; }
        if (S.bsel === u) { S.bsel = null; renderRoom(); return; }
        if (S.blk.some(([x]) => x === u) && !(mine.kw.includes('wache') && S.blk.filter(([x]) => x === u).length < 2)) { S.blk = S.blk.filter(([x]) => x !== u); S.bsel = null; renderRoom(); return; }
        if (mine.tap || mine.kw.includes('bann')) { toast('Diese Kreatur kann nicht blocken.'); return; }
        S.bsel = u; renderRoom(); return;
      }
      if (side === 'foe' && v.atk.includes(u) && S.bsel != null) {
        const B = v.P[v.me].board.find(c => c.u === S.bsel), A = v.P[v.foe].board.find(c => c.u === u);
        if (!canBlock(B, A)) { toast('Flieger können nur von Flugfähigkeit oder Reichweite geblockt werden.'); return; }
        if (S.blk.some(([x, y]) => x === B.u && y === u)) { S.bsel = null; renderRoom(); return; }
        if (!B.kw.includes('wache')) S.blk = S.blk.filter(([x]) => x !== B.u);
        S.blk.push([B.u, u]); S.bsel = null; renderRoom(); return;
      }
      showCre(u); return;
    }
    if (side === 'me' && mine && abilityReady(v, mine)) { showCre(u); return; }
    if (side === 'me' && mine && myMain(v) && !v.attacked && canAttack(mine)) { if (S.atk.has(u)) S.atk.delete(u); else S.atk.add(u); renderRoom(); return; }
    showCre(u);
  });
  // Lobby
  window.KDmode = () => 'klassisch';
  window.KDmodePick = () => '';
  const kdLobby = () => {
    if (window.KDZ && KDZ.pending != null && isHost()) { const p = KDZ.pending; KDZ.pending = null; setTimeout(() => send({ t: 'start', bot: 1, ...(typeof p === 'object' ? p : {}) }), 50); }
    return `<div class="kd-phase" style="justify-content:center;margin:6px 0">${isHost() ? '<button class="btn" data-kdbot="0">🤖 Gegen den Bot</button><button class="btn ghost" data-kdz="trophaen">🏆 Trophäenkampf</button>' : ''}<button class="btn ghost" data-kdz="spielen">💎 Zentrale</button><button class="kd-icbtn" data-kdrinfo="1" aria-label="Regeln">📖</button></div>`;
  };
  window.LobbyExtra = Object.assign(window.LobbyExtra || {}, { duell: kdLobby });
  const S2 = window.Spiele2 || (window.Spiele2 = { cast() {} });
  S2.duell = render;
})();
