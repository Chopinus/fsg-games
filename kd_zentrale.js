'use strict';
// Kristallduell-Zentrale: Packs öffnen, Sammlung, Deck-Bau, Bot-Leiter, Tagesaufgaben. Daten: kd_konto.js (Server)
(function () {
  const K = window.DuellKarten; if (!K) return;
  const { C, F, RAR, B, LADDER, PACK } = K;
  const HE = K.HEROES || {};
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
  #kdz .tabs{display:flex;justify-content:space-around;gap:4px;padding:6px 8px calc(env(safe-area-inset-bottom,0px) + 6px);flex:none;background:rgba(13,10,24,.94);border-top:1px solid rgba(255,255,255,.1);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
  #kdz .tabs button{flex:1;max-width:120px;display:flex;flex-direction:column;align-items:center;gap:2px;border:0;background:none;color:#8f84ad;padding:6px 2px;border-radius:14px;font:800 11px var(--body);cursor:pointer;transition:background .2s,color .2s}
  #kdz .tabs button i{font-style:normal;font-size:24px;line-height:1;transition:transform .25s cubic-bezier(.2,1.6,.4,1)}
  #kdz .tabs button.on{color:#fff;background:linear-gradient(160deg,rgba(106,63,214,.75),rgba(58,106,214,.55));box-shadow:0 4px 14px rgba(90,60,220,.4)}
  #kdz .tabs button.on i{transform:translateY(-3px) scale(1.18)}
  #kdz .tabs button .dot{position:absolute;margin:-2px 0 0 22px;width:9px;height:9px;border-radius:50%;background:#ff4d6d;box-shadow:0 0 6px #ff4d6d}
  #kdz .zb{flex:1;overflow-y:auto;padding:6px 14px 24px;-webkit-overflow-scrolling:touch}
  #kdz .zb.swl{animation:kdzswl .25s ease-out} #kdz .zb.swr{animation:kdzswr .25s ease-out}
  @keyframes kdzswl{from{transform:translateX(40px);opacity:.3}} @keyframes kdzswr{from{transform:translateX(-40px);opacity:.3}}
  #kdz .hd{display:flex;align-items:center;gap:8px;margin:6px 0 2px} #kdz .hd h3{margin:0;flex:1}
  .kdz-i{flex:none;width:28px;height:28px;border-radius:50%;border:1px solid rgba(159,243,255,.5);background:rgba(58,168,255,.18);color:#9ff3ff;font:italic 800 15px Georgia,serif;cursor:pointer;display:inline-grid;place-items:center;padding:0;vertical-align:middle}
  .kdz-i:active{transform:scale(.9)}
  #kdz .car{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 4px 14px;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin:0 -14px;padding-left:14px;padding-right:14px}
  #kdz .car::-webkit-scrollbar{display:none}
  #kdz .car>*{flex:none;scroll-snap-align:center}
  #kdz .car .kdz-pack{width:min(170px,44vw)}
  #kdz .dots{display:flex;justify-content:center;gap:6px;margin-top:-6px} #kdz .dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.2)} #kdz .dots i.on{background:#ffd23f;width:18px;border-radius:4px}
  #kdz .arc{width:min(250px,70vw);border-radius:20px;padding:16px 14px;background:radial-gradient(circle at 50% 20%,color-mix(in srgb,var(--c1) 60%,transparent),transparent 70%),linear-gradient(170deg,var(--c2),#120c22);border:2px solid color-mix(in srgb,var(--c1) 60%,#fff);display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;position:relative}
  #kdz .arc .ae{font-size:56px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))} #kdz .arc b{font:400 21px var(--display)} #kdz .arc small{color:#e8e0ff;opacity:.85;font-size:12px}
  #kdz .arc.lock{filter:grayscale(.75) brightness(.6)} #kdz .arc.cur{box-shadow:0 0 0 3px #ffd23f,0 0 26px rgba(255,210,63,.5)}
  #kdz .arc .tags{display:flex;gap:4px;flex-wrap:wrap;justify-content:center} #kdz .arc .tags span{font-size:11px;font-weight:800;padding:2px 8px;border-radius:8px;background:rgba(0,0,0,.35)}
  #kdz .arc .here{position:absolute;top:-10px;font-size:11px;font-weight:800;background:#ffd23f;color:#2a1a00;padding:2px 10px;border-radius:8px}
  #kdz .pbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  #kdz .pbar .kpl{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:99px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);font-weight:800;font-size:13px;white-space:nowrap}
  #kdz .lands{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
  #kdz .lrow{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:14px;background:linear-gradient(90deg,color-mix(in srgb,var(--c1) 40%,transparent),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.1)}
  #kdz .lrow .la{font-size:26px} #kdz .lrow .ln{flex:1;min-width:0;font-weight:800;font-size:14px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} #kdz .lrow .ln small{display:block;font-weight:600;color:var(--muted)}
  #kdz .lrow button{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.3);color:#fff;font:800 18px var(--body);cursor:pointer;padding:0}
  #kdz .lrow button:active{transform:scale(.88)} #kdz .lrow .n{min-width:24px;text-align:center;font-weight:800;font-size:17px}
  .kdz-hp{position:fixed;inset:0;z-index:9850;background:rgba(5,3,12,.8);display:flex;align-items:center;justify-content:center;padding:16px;animation:kdzin .3s both}
  .kdz-hp .pn{max-width:680px;width:100%;max-height:90vh;overflow-y:auto;background:linear-gradient(180deg,#2a1f48,#151022);border:2px solid #ffd23f;border-radius:24px;padding:18px;text-align:center;box-shadow:0 0 50px rgba(255,210,63,.35)}
  .kdz-hp h2{margin:4px 0;font:400 28px var(--display);color:#ffd23f}
  #kdz .wrap{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
  #kdz h3{margin:6px 0 2px;font-size:17px}
  #kdz .box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:12px 14px}
  #kdz .big2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
  #kdz .bigb{border:0;border-radius:18px;padding:18px;text-align:left;color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:4px;font:inherit;transition:transform .15s;box-shadow:0 10px 24px rgba(0,0,0,.4)}
  #kdz .bigb:hover{transform:translateY(-3px)} #kdz .bigb b{font-size:19px} #kdz .bigb .e{font-size:36px}
  #kdz .kdz-wel{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:linear-gradient(135deg,rgba(255,210,63,.22),rgba(180,92,255,.22));border-color:#ffd23f;animation:kdzwel 2s ease-in-out infinite}
  #kdz .kdz-wel .e{font-size:42px;animation:kdpkw .9s ease-in-out infinite}#kdz .kdz-wel b{font-size:18px}
  @keyframes kdzwel{50%{box-shadow:0 0 24px rgba(255,210,63,.45)}}
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
  #kdz .dkrow{display:flex;gap:10px;align-items:stretch}
  #kdz .dkrow .mgrid.deck{flex:1;min-width:0}
  #kdz .heroslot{flex:none;width:128px;border-radius:18px;border:3px solid #ffd23f;background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.18),transparent 60%),linear-gradient(170deg,var(--c1),var(--c2));color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:12px 8px;cursor:pointer;font:inherit;text-align:center;box-shadow:0 0 22px rgba(255,210,63,.35);position:relative;transition:transform .15s}
  #kdz .heroslot:hover{transform:translateY(-3px)}
  #kdz .heroslot .hp{font-size:58px;filter:drop-shadow(0 6px 8px rgba(0,0,0,.5));animation:kdbob 2.6s ease-in-out infinite}
  #kdz .heroslot b{font-size:14px;line-height:1.1} #kdz .heroslot small{font-size:11.5px;opacity:.9} #kdz .heroslot .cd{opacity:.75}
  #kdz .heroslot .tag{position:absolute;top:-11px;background:#ffd23f;color:#2a1a00;font-weight:800;font-size:11px;letter-spacing:.12em;padding:2px 10px;border-radius:9px}
  #kdz .heroslot.empty{border-style:dashed;background:rgba(255,210,63,.06);box-shadow:none;color:#ffd23f}
  #kdz .heroslot.empty .hp{font-size:40px;animation:none}
  @media (max-width:600px){#kdz .dkrow{flex-direction:column-reverse;gap:16px}#kdz .heroslot{width:100%;flex-direction:row;justify-content:flex-start;gap:12px;padding:14px 16px;text-align:left}#kdz .heroslot .hp{font-size:46px}#kdz .heroslot b{font-size:15px}#kdz .heroslot small{font-size:12px}#kdz .heroslot .tag{left:16px}}
  .hgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px}
  .htile{position:relative;min-width:150px;border-radius:16px;border:2px solid color-mix(in srgb,var(--c1) 60%,#fff);background:linear-gradient(165deg,var(--c1),var(--c2));color:#fff;display:flex;flex-direction:column;align-items:center;gap:3px;padding:12px 8px;text-align:center;cursor:pointer;font:inherit}
  .htile .hp{font-size:44px} .htile b{font-size:14px} .htile small{font-size:11.5px;opacity:.9}
  .htile .st{margin-top:4px;font-size:11px;font-weight:800;background:rgba(0,0,0,.35);border-radius:8px;padding:2px 8px}
  .htile.on{border-color:#ffd23f;box-shadow:0 0 0 2px #ffd23f,0 0 20px rgba(255,210,63,.6)}
  .htile.lock{filter:grayscale(.85) brightness(.55)}
  #kdz .arhero{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:18px;border-radius:22px;background:radial-gradient(circle at 15% 30%,color-mix(in srgb,var(--c1) 55%,transparent),transparent 60%),linear-gradient(135deg,var(--c2),#120c22);border:2px solid color-mix(in srgb,var(--c1) 70%,#fff);box-shadow:0 0 30px color-mix(in srgb,var(--c1) 30%,transparent)}
  #kdz .arhero .ae{font-size:72px;filter:drop-shadow(0 6px 12px rgba(0,0,0,.5));animation:kdbob 3s ease-in-out infinite}
  #kdz .arhero .ai{flex:1;min-width:200px;display:flex;flex-direction:column;gap:4px} #kdz .arhero .ai b{font:400 30px var(--display)} #kdz .arhero small{color:#e8e0ff;opacity:.85}
  #kdz .arhero .trn{font:800 26px var(--body);color:#ffd23f}
  #kdz .trbar{height:12px;border-radius:6px;background:rgba(0,0,0,.4);overflow:hidden} #kdz .trbar i{display:block;height:100%;background:linear-gradient(90deg,#ffd23f,#ff8a3d);box-shadow:0 0 10px #ffb020}
  #kdz .btn.big{font-size:20px;padding:14px 26px}
  #kdz .arpath{display:flex;flex-direction:column;gap:8px}
  #kdz .arr{position:relative;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:16px;background:linear-gradient(90deg,color-mix(in srgb,var(--c1) 30%,#1d1830),#1d1830);border:1px solid rgba(255,255,255,.1);animation:kdzoom .4s both}
  #kdz .arr .ae{font-size:34px;width:46px;text-align:center} #kdz .arr .ai{flex:1;min-width:0} #kdz .arr .ai b{display:block} #kdz .arr small{display:block;color:var(--muted);font-size:12px}
  #kdz .arr.lock{filter:grayscale(.7) brightness(.6)} #kdz .arr.cur{border:2px solid #ffd23f;box-shadow:0 0 18px rgba(255,210,63,.4)}
  #kdz .arr .here{font-size:11px;font-weight:800;background:#ffd23f;color:#2a1a00;padding:3px 8px;border-radius:8px;white-space:nowrap}
  .kdz-pack.gross{border-width:3px} .kdz-pack.koenig{border:3px solid #b45cff;box-shadow:0 0 22px rgba(180,92,255,.5)} .kdz-pack.legende{border:3px solid #ffb020;box-shadow:0 0 28px rgba(255,176,32,.6)}
  #kdz .mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:12px 8px;justify-items:center}
  #kdz .mgrid.deck{background:rgba(255,210,63,.06);border:1px solid rgba(255,210,63,.3);border-radius:16px;padding:14px 10px;min-height:120px}
  #kdz .mw{position:relative;cursor:pointer;transition:transform .15s;-webkit-touch-callout:none;user-select:none}
  #kdz .mw:active{transform:scale(.94)}
  #kdz .mw .cnt{position:absolute;top:-7px;right:-5px;z-index:3;background:#ffd23f;color:#2a1a00;border-radius:9px;padding:0 6px;font-size:12px;font-weight:800;border:2px solid #1a1030}
  #kdz .mw .cnt.free{background:#3dff8a;color:#003a10}
  #kdz .mw.used{opacity:.4} #kdz .mw.used .cnt{background:#6a6a8a;color:#fff}
  #kdz .mw .ib{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);z-index:4;width:26px;height:26px;border-radius:50%;border:2px solid #1a1030;background:#3aa8ff;color:#fff;font:italic 800 14px Georgia,serif;cursor:pointer;display:grid;place-items:center;padding:0;box-shadow:0 2px 6px rgba(0,0,0,.5)}
  #kdz .mw{margin-bottom:6px}
  #kdz .mw .lk{position:absolute;top:30px;left:50%;transform:translateX(-50%);font-size:22px;z-index:3}
  #kdz .mw.just{animation:kdzjust .45s cubic-bezier(.2,1.6,.4,1)}
  @keyframes kdzjust{from{transform:scale(.4) translateY(30px);opacity:0}}
  #kdz .mw.slot{width:76px;height:108px;border:2px dashed rgba(255,210,63,.5);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffd23f;font-weight:800;font-size:20px;cursor:default}
  #kdz .mw.slot small{font-size:11px;color:var(--muted)}
  .kd-card.mini{width:76px;height:108px;padding:3px;border-radius:10px}
  .kd-card.mini .in{padding:2px}.kd-card.mini .art{font-size:30px;margin-top:6px}.kd-card.mini .nm{font-size:9px;max-width:100%;overflow-wrap:anywhere;hyphens:auto;-webkit-hyphens:auto}.kd-card.mini .nm.ln{font-size:8px}
  .kd-card.mini .tx,.kd-card.mini .kw,.kd-card.mini .ty{display:none}
  .kd-card.mini .mc{top:2px;right:2px;gap:0}.kd-card.mini .pip{width:12px;height:12px;font-size:7px}
  .kd-card.mini .tl{display:none}
  .kd-card.mini .pt{min-width:26px;height:18px;font-size:11px;line-height:15px;bottom:-5px;right:-4px;padding:0 4px}
  .kd-card.mini .rg{bottom:6px;width:7px;height:7px}
  .kd-card.mini .lvs{font-size:7px}
  @media (max-width:520px){#kdz .mgrid{grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:12px 4px}.kd-card.mini{width:68px;height:98px}.kd-card.mini .art{font-size:26px}#kdz .mw.slot{width:68px;height:98px}#kdz .mgrid.deck{padding:12px 6px}}
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
  .kd-one.open.r-s .fr .kd-card,.kdf.open.r-s .fr .kd-card{box-shadow:0 0 0 2px #4aa8ff,0 0 18px rgba(74,168,255,.6)}
  .kd-one.open.r-e .fr .kd-card,.kdf.open.r-e .fr .kd-card{box-shadow:0 0 0 3px #b45cff,0 0 34px rgba(180,92,255,.85);animation:kdre 1.6s ease-in-out infinite}
  .kd-one.open.r-l .fr .kd-card,.kdf.open.r-l .fr .kd-card{box-shadow:0 0 0 3px #ffb020,0 0 44px rgba(255,176,32,.95);animation:kdrl 1.2s ease-in-out infinite}
  @keyframes kdre{50%{box-shadow:0 0 0 3px #d49cff,0 0 50px rgba(180,92,255,1)}}
  @keyframes kdrl{50%{box-shadow:0 0 0 4px #ffe08a,0 0 70px rgba(255,200,60,1)}}
  .kd-heroc.big{width:min(300px,80vw)} .kd-heroc.big .hp{animation:kdbob 2.4s ease-in-out infinite}
  .kd-heroc.mini{width:104px;height:148px;padding:8px 4px;gap:2px;border-width:2px;animation:none;justify-content:center} .kd-heroc.mini .hp{font-size:48px} .kd-heroc.mini b{font-size:12px;font-family:var(--body);font-weight:800}
  #kdpk .skip{position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);right:14px;z-index:5}
  #kdpk .cntr{font-weight:800;color:#cfc6e6;letter-spacing:.1em;z-index:3}
  #kdpk .meteor{position:absolute;left:-15%;top:8%;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 18px 8px var(--mc),0 0 60px 24px var(--mc);transform:rotate(28deg);animation:kdmet 1.1s cubic-bezier(.55,0,.85,1) forwards;z-index:4}
  #kdpk .meteor::after{content:"";position:absolute;right:8px;top:50%;width:320px;height:8px;transform:translateY(-50%);background:linear-gradient(90deg,transparent,var(--mc));border-radius:4px;filter:blur(1.5px)}
  @keyframes kdmet{to{left:52%;top:46%}}
  #kdpk .dim{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .5s;pointer-events:none}
  #kdpk .dim.on{opacity:.55}
  #kdpk .vortex{position:absolute;left:50%;top:46%;width:620px;height:620px;margin:-310px 0 0 -310px;border-radius:50%;background:conic-gradient(from 0deg,transparent,var(--vc),transparent 30%,var(--vc),transparent 60%,var(--vc),transparent);filter:blur(18px);opacity:0;transition:opacity .4s;animation:kdrays 1.4s linear infinite;pointer-events:none}
  #kdpk .vortex.on{opacity:.75}
  .kd-one{position:relative;width:min(230px,58vw);aspect-ratio:.7;perspective:1200px;cursor:pointer;z-index:3}
  .kd-one .fl{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.3,1.25,.5,1)}
  .kd-one.open .fl{transform:rotateY(180deg)}
  .kd-one .bk,.kd-one .fr{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
  .kd-one .fr{transform:rotateY(180deg)} .kd-one .fr .kd-card.big{width:100%;height:100%;animation:none}
  .kd-one .bk{border-radius:20px;border:3px solid #8a7ab8;background:radial-gradient(circle at 50% 40%,#5a3fa0,#1a1030);display:grid;place-items:center;font-size:84px;box-shadow:0 14px 30px rgba(0,0,0,.6),0 0 var(--gw,0) var(--rc)}
  .kd-one .bk::after{content:"";position:absolute;inset:10px;border-radius:14px;border:2px dashed rgba(255,255,255,.22)}
  .kd-one.r-s .bk{--gw:18px}.kd-one.r-e .bk{--gw:34px;animation:kdglow 1.1s ease-in-out infinite}.kd-one.r-l .bk{--gw:50px;animation:kdglow .7s ease-in-out infinite}
  .kd-one.in{animation:kdonein .5s cubic-bezier(.2,1.3,.4,1) both}
  @keyframes kdonein{from{transform:translateX(70vw) rotate(25deg);opacity:0}}
  .kd-one.out{animation:kdoneout .35s ease-in forwards}
  @keyframes kdoneout{to{transform:translateX(-80vw) rotate(-25deg);opacity:0}}
  .kd-one.charge{animation:kdcharge .9s ease-in-out}
  @keyframes kdcharge{20%{transform:translateY(-6px) rotate(-3deg)}40%{transform:translateY(-10px) rotate(3deg) scale(1.04)}60%{transform:translateY(-14px) rotate(-4deg) scale(1.07)}80%{transform:translateY(-18px) rotate(4deg) scale(1.1)}}
  .kd-one.chargeL{animation:kdchargeL 1.6s ease-in-out}
  @keyframes kdchargeL{15%{transform:translateY(-8px) rotate(-2deg)}30%{transform:translateY(-16px) rotate(3deg) scale(1.05)}45%{transform:translateY(-24px) rotate(-4deg) scale(1.08)}60%{transform:translateY(-32px) rotate(5deg) scale(1.12)}75%{transform:translateY(-38px) rotate(-6deg) scale(1.16)}90%{transform:translateY(-40px) scale(1.2)}100%{transform:none}}
  .kd-one.pop{animation:kdonepop .6s cubic-bezier(.2,1.6,.4,1)}
  @keyframes kdonepop{30%{transform:scale(1.15)}}
  #kdpk .inf{min-height:66px;text-align:center;opacity:0;transition:opacity .4s .5s;z-index:3}
  #kdpk .inf.on{opacity:1} #kdpk .inf b{display:block;font:400 26px var(--display);color:#fff} #kdpk .inf .rr{font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:13px}
  #kdpk .inf .lbl{position:static;transform:none;opacity:1;display:block;margin-top:4px;font-size:15px}
  #kdpk .hint{color:#a99cc8;font-size:13px;z-index:3;min-height:18px}
  #kdpk .rtx{position:absolute;top:12%;left:50%;white-space:nowrap;font:400 clamp(40px,10vw,76px) var(--display);color:var(--rc);text-shadow:0 0 30px var(--rc),0 4px 0 rgba(0,0,0,.6);animation:kdban 1.8s ease-out forwards;pointer-events:none;z-index:4}
  #kdpk .sum{display:flex;flex-direction:column;align-items:center;gap:10px;z-index:3;animation:kdzin .3s both}
  #kdpk .sum .row5 .kdf{animation:kdfin .5s cubic-bezier(.2,1.3,.4,1) both}
  #kdpk .cv{position:fixed;z-index:4;pointer-events:none;width:8px;height:8px;border-radius:50%;background:#ffd23f;box-shadow:0 0 10px 3px #ffb020;transition:left .9s cubic-bezier(.5,0,.8,.6),top .9s cubic-bezier(.5,0,.8,.6),opacity .9s}
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
    Z.tab = tab || Z.tab || 'spielen';
    let el = q('#kdz'); if (!el) { el = document.createElement('div'); el.id = 'kdz'; document.body.appendChild(el); document.documentElement.style.overflow = 'hidden'; }
    render(); await load(); render(); afterTab();
  }
  function close() { const el = q('#kdz'); if (el) el.remove(); document.documentElement.style.overflow = ''; Z.ed = null; }
  const TABS = [['spielen', '⚔️', 'Spielen'], ['packs', '🎁', 'Packs'], ['decks', '📦', 'Decks'], ['samml', '🃏', 'Sammlung'], ['trophaen', '🏆', 'Trophäen']];
  const sheet = h => window.KDsheet(h);
  const ib = k => `<button class="kdz-i" data-kdzi="${k}" aria-label="Info">i</button>`;
  const hd = (t, k, extra) => `<div class="hd"><h3>${t}</h3>${extra || ''}${k ? ib(k) : ''}</div>`;
  const INFO = {
    levels: () => `<h3>⭐ Kartenstufen</h3><div class="kd-gl"><div><span>★★</span><span>Silberrahmen</span></div><div><span>★★★</span><span>Goldrahmen mit Glanz</span></div><div><span>★★★★</span><span>Leuchten und Angriffs-Effekt</span></div><div><span>★★★★★</span><span>Prisma-Rahmen, Aura und Einschlag</span></div><div><span>💡</span><span>Mehrfach gezogene Karten steigen auf. Nur das Aussehen ändert sich, nie die Stärke.</span></div></div>`,
    bonus: () => null,
    heroes: () => `<h3>🦸 Helden</h3><div class="kd-gl"><div><span>🎴</span><span>Jedes Deck hat einen eigenen Heldenplatz zusätzlich zu den ${K.DECK_SIZE} Karten.</span></div><div><span>⚡</span><span>Die Heldenkraft setzt du in deiner Hauptphase ein. Danach lädt sie über einige Züge neu auf.</span></div><div><span>🎁</span><span>Den Abenteuer-Helden hat jeder. Alle anderen stecken mit ${Math.round(K.HERO_P * 100)} % in Themen-Packs – in höheren Kampfgebieten öfter.</span></div></div>`,
    funken: () => `<h3>🪙 Funken & ✨ Sternenstaub</h3><div class="kd-gl"><div><span>🪙</span><span>Gibt es für jedes Duell (Siege mehr), Tagesaufgaben und den Trophäenweg. Damit kaufst du Packs.</span></div><div><span>✨</span><span>Entsteht aus Karten über der Höchststufe. Damit stellst du fehlende Karten her.</span></div></div>`,
    packs: () => { const s = Z.st, A = K.ARENAS[s.ar || 0], L = K.ARENAS[K.ARENAS.length - 1]; return `<h3>🎁 Pack-Chancen</h3><div class="kd-phase" style="justify-content:center"><span class="kd-pill">${A.e} ${A.n}</span></div><div class="kd-gl">${Object.entries(RAR).map(([k, r]) => `<div><span style="color:${r.col}">◆</span><span><b style="color:${r.col}">${r.n}</b> – ${A.odds[k]} %</span></div>`).join('')}<div><span>🦸</span><span><b>Held</b> – ${A.hero} % pro Themen-Pack</span></div><div><span>💜</span><span>Seltene Karte spätestens in <b>${PACK.pityE - s.pe}</b> Packs garantiert</span></div><div><span>🧡</span><span>Mythische Karte spätestens in <b>${PACK.pityL - s.pl}</b> Packs garantiert</span></div><div><span>📈</span><span>Höhere Kampfgebiete verbessern die Chancen – bis ${L.odds.l} % mythisch und ${L.hero} % Held.</span></div></div>`; },
    trophy: () => `<h3>🏆 Trophäenkampf</h3><div class="kd-gl"><div><span>⬆️</span><span>Sieg ≈ +30 🏆</span></div><div><span>⬇️</span><span>Niederlage ≈ −20 🏆 – unter den Anfang deines Gebiets fällst du nie.</span></div><div><span>🤖</span><span>Die Bots spielen zufällig eines von drei Gebiets-Decks und werden mit jedem Gebiet schlauer.</span></div><div><span>🎁</span><span>Alle 100 🏆 gibt es eine Belohnung auf dem Trophäenweg.</span></div></div>`,
    deck: () => `<h3>📦 Deckregeln</h3><div class="kd-gl"><div><span>🃏</span><span>Genau <b>${K.DECK_SIZE}</b> Karten.</span></div><div><span>4️⃣</span><span>Höchstens ${K.MAX_COPIES} Kopien pro Karte – Standardländer unbegrenzt.</span></div><div><span>🏞️</span><span>Faustregel: 17 Länder, 23 Zauber, höchstens zwei Farben.</span></div><div><span>🎨</span><span>Ab ${K.BONUS_MIN} Karten einer Farbe wirkt ihr Themen-Bonus.</span></div><div><span>👆</span><span>Antippen fügt hinzu oder nimmt heraus, gedrückt halten zeigt Details.</span></div></div>`,
    rules: () => { window.KDrules && KDrules(); return null; },
  };
  function render() {
    const el = q('#kdz'); if (!el) return;
    const s = Z.st, sc = el.querySelector('.zb') ? el.querySelector('.zb').scrollTop : 0;
    el.innerHTML = `<div class="zh"><h2>💎 Kristallduell</h2><div class="cur" data-kdzi="funken" style="cursor:pointer">${s ? `<span data-cur="f">🪙 ${s.f}</span><span data-cur="st">✨ ${s.st}</span>${s.free ? `<span data-cur="free">🎁 ${s.free}</span>` : ''}` : ''}</div><button class="zx" data-kdzx="1" aria-label="Schließen">✕</button></div>
      <div class="zb ${Z.swipe || ''}"><div class="wrap">${body()}</div></div><nav class="tabs">${TABS.map(([k, e, n]) => `<button class="${Z.tab === k ? 'on' : ''}" data-kdzt="${k}"><i>${e}</i>${n}${k === 'packs' && s && (s.free || Object.values(s.fp || {}).some(x => x > 0)) ? '<span class="dot"></span>' : ''}</button>`).join('')}</nav>`;
    Z.swipe = '';
    const zb = el.querySelector('.zb'); if (zb && Z.keepScroll) zb.scrollTop = sc; Z.keepScroll = false;
  }
  const needLogin = what => `<div class="box center"><div style="font-size:44px">🔐</div><p>Melde dich an, um ${what}.</p><button class="btn" data-kdzlogin="1">Anmelden</button></div>`;
  function body() {
    const s = Z.st;
    if (Z.tab === 'spielen') return tabPlay(s);
    if (!me()) return needLogin(Z.tab === 'packs' ? 'Packs zu öffnen' : Z.tab === 'samml' ? 'Karten zu sammeln' : Z.tab === 'decks' ? 'eigene Decks zu bauen' : 'Trophäen zu sammeln');
    if (!s) return `<p class="note center">${Z.err ? esc(Z.err) : 'Lädt …'}</p>`;
    if (Z.tab === 'packs') return tabPacks(s);
    if (Z.tab === 'samml') return tabColl(s);
    if (Z.tab === 'decks') return tabDecks(s);
    if (Z.tab === 'trophaen' || Z.tab === 'leiter') return tabTrophy(s);
    return '';
  }
  const welcomeBox = s => s && s.welcome > 0 ? `<div class="box kdz-wel"><span class="e">🎁</span><div style="flex:1;min-width:180px"><b>Willkommens-Packs: noch ${s.welcome}</b></div><button class="btn" data-kdzpack="start">Öffnen</button></div>` : '';
  const ARn = s => K.ARENAS[K.arenaOf(s.tr || 0)];
  function tabPlay(s) {
    const tot = Object.values(C).filter(c => !c.tok && c.t !== 'l').length, own = s ? Object.keys(s.c).filter(id => C[id] && !C[id].tok && C[id].t !== 'l' && s.c[id] > 0).length : 0;
    const first = s && !s.packs && !(s.tr > 0) ? `<div class="box kdz-wel" style="animation:none"><span class="e" style="animation:none">🗺️</span><div style="flex:1;min-width:180px"><b>Willkommen, Abenteurer!</b><div class="pbar" style="margin-top:6px"><span class="kpl">📦 Startdeck: ${K.DECK_SIZE} Karten</span><span class="kpl">🏞️ mit Ländern</span></div></div><button class="btn" data-kdzgo="0">⚔️ Erstes Duell</button>${ib('rules')}</div>` : '';
    return `${welcomeBox(s)}${first}<div class="big2">
      <button class="bigb" data-kdzgo="arena" style="background:linear-gradient(135deg,#a8790a,#3a2a00)"><span class="e">🏆</span><b>Trophäenkampf</b><span>${s ? `${ARn(s).e} ${ARn(s).n} · ${s.tr} 🏆` : 'Gegen Bots um Trophäen'}</span></button>
      <button class="bigb" data-kdzgo="friends" style="background:linear-gradient(135deg,#6a3fd6,#2a1a6a)"><span class="e">👥</span><b>Gegen Freunde</b><span>Runde erstellen</span></button>
      <button class="bigb" data-kdzgo="0" style="background:linear-gradient(135deg,#1f6a8a,#0b2a3a)"><span class="e">🤖</span><b>Übungs-Bot</b><span>Ohne Trophäen</span></button></div>
      <div class="pbar" style="justify-content:center"><button class="btn ghost small" data-kdzi="rules">📖 Regeln</button><button class="btn ghost small" data-kdzbonp="1">🎨 Themen-Boni</button><button class="btn ghost small" data-kdzi="heroes">🦸 Helden</button><button class="btn ghost small" data-kdzi="levels">⭐ Stufen</button></div>
      ${s ? `<div class="box">${hd('📅 Tagesaufgaben')}${s.dq.map(x => `<div class="q ${x.done ? 'done' : ''}"><span class="t">${x.done ? '✅' : '🎯'} ${esc(x.t)}</span><span class="bar"><i style="width:${(x.n / x.g) * 100}%"></i></span><span>${x.n}/${x.g}</span><span>+60 🪙</span></div>`).join('')}
        <div class="q ${s.dfw ? 'done' : ''}"><span class="t">${s.dfw ? '✅' : '🌅'} Erster Sieg des Tages</span><span>+60 🪙</span></div></div>
        <div class="box">${hd('📊 Sammlung', 'funken')}<div class="pbar"><span class="kpl">🃏 ${own}/${tot} Karten</span><span class="kpl">🎁 ${s.packs} Packs</span><span class="kpl">📦 ${s.decks.length} Decks</span><span class="kpl">🦸 ${Object.keys(s.heroes || {}).filter(h => HE[h]).length}/${Object.keys(HE).length} Helden</span></div></div>` : `<div class="box">${needLogin('Karten zu sammeln, Packs zu öffnen und eigene Decks zu bauen')}</div>`}`;
  }
  function tabPacks(s) {
    if (s.welcome > 0) return welcomeBox(s);
    const ai = s.ar || 0, T = K.PACKS[Z.ptype] && ai >= K.PACKS[Z.ptype].min ? Z.ptype : 'klein', P = K.PACKS[T];
    const freeN = t => (t === 'klein' ? s.free : (s.fp || {})[t] || 0);
    const can = freeN(T) > 0 || s.f >= P.cost;
    const pk = (th, i) => { const f = fc(th === 'mix' ? null : th); return `<button class="kdz-pack ${T}" data-kdzpack="${th}" style="${th === 'mix' ? '--c1:#b45cff;--c2:#1f3a8a' : cv(th)};animation:kdzoom .4s ${i * 0.05}s both" ${can ? '' : 'disabled'}><span class="e">${th === 'mix' ? '💎' : f.e}</span><b>${th === 'mix' ? 'Kristall' : f.n}<br>${P.n}</b><span class="note" style="position:relative;color:#eee;font-size:12px">${th === 'mix' ? 'alle Farben' : f.n + ' · ' + f.land}</span><span class="pr ${freeN(T) ? 'free' : ''}">${freeN(T) ? `Gratis (${freeN(T)})` : P.cost + ' 🪙'}</span></button>`; };
    const list = ['mix', ...Object.keys(F)];
    return `<div class="chips ptypes">${Object.entries(K.PACKS).map(([k, p]) => { const lock = ai < p.min; return `<button class="${k === T ? 'on' : ''}" data-kdzptype="${k}">${lock ? '🔒' : '🎁'} ${p.n} · ${p.size}🃏${freeN(k) ? ` · <b>${freeN(k)}× gratis</b>` : ''}${lock ? ` · ${K.ARENAS[p.min].e}` : ''}</button>`; }).join('')}</div>
      ${hd(`🎁 ${P.n}`, 'packs', `<span class="pbar"><span class="kpl" style="color:${RAR.e.col}">💜 ${PACK.pityE - s.pe}</span><span class="kpl" style="color:${RAR.l.col}">🧡 ${PACK.pityL - s.pl}</span></span>`)}
      <div class="car" data-kdzcar="1">${list.map(pk).join('')}</div><div class="dots">${list.map((x, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
      ${can ? '' : `<div class="pbar" style="justify-content:center"><span class="kpl">🔒 ${P.cost} 🪙 nötig</span><button class="btn small" data-kdzgo="arena">🏆 Funken verdienen</button></div>`}`;
  }
  // Trophäen: aktuelles Kampfgebiet, Weg mit allen Gebieten, Rangliste
  function tabTrophy(s) {
    const ai = K.arenaOf(s.tr), A = K.ARENAS[ai], N = K.ARENAS[ai + 1];
    const pct = N ? Math.max(0, Math.min(100, ((s.tr - A.t) / (N.t - A.t)) * 100)) : 100;
    const nextRoad = (Math.floor((s.trMax || 0) / 100) + 1) * 100;
    const bot = i => (i < 2 ? 'Anfänger' : i < 5 ? 'Geübt' : i < 8 ? 'Clever' : i < 11 ? 'Meister' : 'Champion');
    return `<div class="arhero" style="--c1:${A.col};--c2:${A.col2}"><span class="ae">${A.e}</span><div class="ai"><small>Kampfgebiet ${ai + 1}/${K.ARENAS.length}</small><b>${A.n}</b>
        <div class="trn">🏆 ${s.tr}</div><div class="trbar"><i style="width:${pct}%"></i></div><div class="pbar">${N ? `<span class="kpl">${N.e} noch ${N.t - s.tr} 🏆</span>` : '<span class="kpl">👑 Höchstes Gebiet</span>'}<span class="kpl">🎁 bei ${nextRoad} 🏆</span></div></div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:center"><button class="btn big" data-kdzgo="arena">⚔️ Kämpfen</button><div class="pbar">${ib('trophy')}<button class="btn ghost small" data-kdztop="1">🏅 Rangliste</button></div></div></div>
      ${hd('🛤️ Kampfgebiete', '', '<span class="note">← wischen →</span>')}<div class="car" data-kdzcar="ar">${K.ARENAS.map((x, i) => { const reached = (s.trMax || 0) >= x.t, cur = i === ai;
        return `<div class="arc ${reached ? '' : 'lock'} ${cur ? 'cur' : ''}" style="--c1:${x.col};--c2:${x.col2}" ${cur ? 'data-cur-ar="1"' : ''}>${cur ? '<span class="here">DU BIST HIER</span>' : ''}<span class="ae">${reached ? x.e : '🔒'}</span><b>${i + 1}. ${x.n}</b><small>ab ${x.t} 🏆</small>
          <div class="tags"><span>🤖 ${bot(i)}</span><span>⭐ Stufe ${x.lv}</span></div><div class="tags"><span style="color:${RAR.l.col}">◆ ${x.odds.l} %</span><span style="color:${RAR.e.col}">◆ ${x.odds.e} %</span><span>🦸 ${x.hero} %</span></div>${Object.values(K.PACKS).filter(p => p.min === i && i > 0).map(p => `<div class="tags"><span style="background:rgba(255,210,63,.25)">🎁 ${p.n}</span></div>`).join('')}</div>`; }).join('')}</div>`;
  }
  async function showTop() {
    const o = sheet('<h3>🏅 Rangliste</h3><p class="note">Lädt …</p>');
    const r = await call('kd_top'); const pan = o.querySelector('.pan'); if (!pan) return;
    pan.innerHTML = `<i class="grab"></i><h3>🏅 Rangliste</h3><div class="kd-gl" style="width:100%">${(r.top || []).map((x, i) => `<div style="${me() && x.n === me().name ? 'color:#ffd23f;font-weight:800' : ''}"><span>${['🥇', '🥈', '🥉'][i] || i + 1 + '.'}</span><span style="display:flex;gap:8px"><span style="flex:1">${esc(x.n)}</span><span>${K.ARENAS[K.arenaOf(x.tr)].e} <b>${x.tr}</b> 🏆</span></span></div>`).join('') + (r.me && r.me.rank > 30 ? `<div style="color:#ffd23f"><span>${r.me.rank}.</span><span>Du – <b>${r.me.tr}</b> 🏆</span></div>` : '') || '<div><span>–</span><span>Noch niemand mit Trophäen.</span></div>'}</div><button class="btn ghost" data-kdx="1" style="width:100%">Schließen</button>`;
  }

  const progOf = (id, n) => { const t = RAR[C[id].r].lv, lv = K.levelOf(id, n); if (lv >= 5) return [1, 'Höchste Stufe']; const a = t[lv - 1] || 0, b = t[lv]; return [(n - a) / (b - a), `${n}/${b} für ★${lv + 1}`]; };
  function filterIds(th, ra, miss, s, onlyOwned) {
    return Object.entries(C).filter(([id, c]) => !c.tok && c.t !== 'l' && (th === 'alle' || c.f === th) && (ra === 'alle' || c.r === ra) && (!miss || !(s.c[id] > 0)) && (!onlyOwned || s.c[id] > 0))
      .sort((a, b) => Object.keys(F).indexOf(a[1].f) - Object.keys(F).indexOf(b[1].f) || a[1].c - b[1].c || a[1].n.localeCompare(b[1].n)).map(([id]) => id);
  }
  const themeChips = (cur, attr) => `<div class="chips"><button class="${cur === 'alle' ? 'on' : ''}" ${attr}="alle">Alle</button>${Object.entries(F).map(([k, f]) => `<button class="${cur === k ? 'on' : ''}" ${attr}="${k}">${f.e} ${f.n}</button>`).join('')}</div>`;
  function tabColl(s) {
    const ids = filterIds(Z.th, Z.ra, Z.miss, s);
    const all = filterIds(Z.th, 'alle', false, s), have = all.filter(id => s.c[id] > 0).length;
    return `<div class="box" style="display:flex;flex-direction:column;gap:8px">${themeChips(Z.th, 'data-kdzth')}
      <div class="chips"><button class="${Z.ra === 'alle' ? 'on' : ''}" data-kdzra="alle">Jede Seltenheit</button>${Object.entries(RAR).map(([k, r]) => `<button class="${Z.ra === k ? 'on' : ''}" data-kdzra="${k}" style="color:${Z.ra === k ? '' : r.col}">◆ ${r.n}</button>`).join('')}<button class="${Z.miss ? 'on' : ''}" data-kdzmiss="1">🔒 Fehlende</button><button data-kdzbonp="1">🎨 Boni</button></div>
      <div class="pbar"><span class="kpl">🃏 ${have}/${all.length}</span><span class="kpl">✨ ${s.st}</span>${ib('levels')}</div></div>
      ${hd(`🦸 Helden <span class="note">${Object.keys(s.heroes || {}).filter(h => HE[h]).length}/${Object.keys(HE).length}</span>`, 'heroes')}<div class="car">${Object.keys(HE).map(id => heroTile(id, s, false)).join('')}</div>
      ${hd('🃏 Karten')}
      <div class="grid">${ids.map(id => { const n = s.c[id] || 0, lv = K.levelOf(id, n); const [p, t] = n ? progOf(id, n) : [0, `${RAR[C[id].r].craft} ✨`];
        return `<div class="cw" data-kdzcard="${id}">${n ? `<span class="cnt">×${n}</span>` : '<span class="lock">🔒</span>'}${card(id, { lv: Math.max(1, lv), cls: n ? '' : 'miss' })}${n ? `<span class="prog"><i style="width:${p * 100}%"></i></span>` : ''}<span class="pl">${t}</span></div>`; }).join('') || '<p class="note">Keine Karten für diesen Filter.</p>'}</div>`;
  }
  const LVTXT = ['', 'Grundkarte', 'Silberrahmen', 'Goldrahmen mit Glanz', 'Leuchten und Angriffs-Effekt', 'Prisma-Rahmen, Aura und Einschlag'];
  function showCard(id) {
    const s = Z.st, n = s.c[id] || 0, lv = K.levelOf(id, n), R = RAR[C[id].r], max = R.lv[4];
    const o = document.createElement('div'); o.className = 'kd-pop'; o.style.zIndex = 9700;
    o.innerHTML = `${card(id, { cls: 'big', lv: Math.max(1, lv) })}<div class="kd-rew" style="max-width:340px"><div class="pbar" style="justify-content:center"><span class="kpl" style="color:${R.col}">◆ ${R.n}</span><span class="kpl">${fc(C[id].f).e} ${fc(C[id].f).n}</span><span class="kpl">max. ${K.MAX_COPIES}×</span></div>
      <div>${n ? `Du besitzt <b style="font-size:15px">${n}</b> · Stufe ${'★'.repeat(lv)} (${LVTXT[lv]})` : 'Noch nicht in deiner Sammlung.'}</div>
      ${lv < 5 ? `<div class="note">${R.lv.map((t, i) => `★${i + 1}: ${t}×`).join(' · ')} <button class="kdz-i" data-kdzi2="levels" style="width:22px;height:22px;font-size:12px">i</button></div>` : ''}
      ${n >= max ? '<div class="note">Weitere Kopien werden zu Sternenstaub (+' + R.dust + ' ✨).</div>' : ''}</div>
      ${(C[id].kw || []).length ? `<div class="kd-rew" style="max-width:340px">${C[id].kw.map(k => K.KW[k] ? `<div>${K.KW[k][0]} <b style="font-size:14px">${K.KW[k][1]}:</b> ${K.KW[k][2]}</div>` : '').join('')}</div>` : ''}
      <div class="kd-rew" style="max-width:340px;cursor:pointer" data-kdzbonp="1"><div>${fc(C[id].f).e} Thema <b style="font-size:14px">${fc(C[id].f).n}</b> · ab ${K.BONUS_MIN}: <b style="font-size:14px">${B[C[id].f][0]}</b> – ${B[C[id].f][1]}</div></div>
      ${Z.tab === 'decks' && Z.ed && n ? (() => { const k = Z.ed.cards[id] || 0, mx = Math.min(K.MAX_COPIES, n); return `<div class="row" style="justify-content:center;gap:8px"><span class="note">Im Deck: <b>${k}/${mx}</b></span>${k ? `<button class="btn ghost small" data-kdzpm="-1">➖ Herausnehmen</button>` : ''}${k < mx ? `<button class="btn small" data-kdzpm="1">➕ Ins Deck</button>` : ''}</div>`; })() : ''}
      <div class="row" style="justify-content:center;gap:8px">${n < max ? `<button class="btn" data-kdzcraft="${id}" ${s.st < R.craft ? 'disabled' : ''}>✨ Herstellen (${R.craft})</button>` : ''}<button class="btn ghost" data-kdx="1">Schließen</button></div>`;
    document.body.appendChild(o);
    o.addEventListener('click', async e => {
      if (e.target === o || e.target.closest('[data-kdx]')) { o.remove(); return; }
      if (e.target.closest('[data-kdzbonp]')) { showBonus(); return; }
      if (e.target.closest('[data-kdzi2]')) { sheet(INFO.levels() + '<button class="btn ghost" data-kdx="1" style="width:100%">Schließen</button>'); return; }
      const pm = e.target.closest('[data-kdzpm]');
      if (pm) { o.remove(); const d = Z.ed, k = d.cards[id] || 0;
        if (pm.dataset.kdzpm === '1') { if (deckN(d.cards) >= K.DECK_SIZE) { toast(`Das Deck ist voll (${K.DECK_SIZE} Karten) – nimm erst eine Karte heraus.`); return; } d.cards[id] = k + 1; Z.just = id; }
        else if (k > 1) d.cards[id] = k - 1; else delete d.cards[id];
        Z.keepScroll = true; render(); Z.just = null; saveSoon(); return; }
      const b = e.target.closest('[data-kdzcraft]'); if (!b || Z.busy) return;
      Z.busy = true; const r = await call('kd_craft', { id }); Z.busy = false;
      if (r.error) { toast(r.error); return; } o.remove(); Z.keepScroll = true; setState(r.state, true);
      toast(r.up ? `✨ ${C[id].n} erreicht Stufe ${r.lv}!` : `✨ ${C[id].n} hergestellt`); showCard(id);
    });
  }
  // Baut aus der Sammlung ein spielbares Deck: 23 Zauber in höchstens zwei Farben, dazu 17 passende Länder
  function autoDeck(own) {
    const th = {}; for (const [id, n] of Object.entries(own)) if (C[id] && C[id].t !== 'l' && n > 0) th[C[id].f] = (th[C[id].f] || 0) + Math.min(n, K.MAX_COPIES);
    const rank = Object.keys(th).sort((a, b) => th[b] - th[a]), cols = rank.slice(0, 2);
    const rv = { g: 0, s: 1, e: 2, l: 3 };
    const score = id => (C[id].f === cols[0] ? 3 : 2) + rv[C[id].r] * 1.5 + (C[id].c <= 3 ? 1 : 0) + (C[id].t === 'k' ? 0.5 : 0);
    const cards = {}; let n = 0, cre = 0, big = 0; const SP = K.DECK_SIZE - 17;
    const add = (id, lim) => { const mx = Math.min(K.MAX_COPIES, own[id] || 0); while ((cards[id] || 0) < mx && n < lim && !(C[id].c >= 6 && big >= 3)) { cards[id] = (cards[id] || 0) + 1; n++; if (C[id].t === 'k') cre++; if (C[id].c >= 6) big++; } };
    let ids = Object.keys(own).filter(id => C[id] && !C[id].tok && C[id].t !== 'l' && own[id] > 0 && cols.includes(C[id].f)).sort((a, b) => score(b) - score(a) || C[a].c - C[b].c);
    for (const id of ids.filter(id => C[id].t === 'k')) if (cre < 15) add(id, Math.min(SP, n + 15 - cre));
    for (const id of ids) add(id, SP);
    if (n < SP) { ids = Object.keys(own).filter(id => C[id] && !C[id].tok && C[id].t !== 'l' && own[id] > 0).sort((a, b) => score(b) - score(a)); for (const id of ids) add(id, SP); }
    return withLands(cards);
  }
  // füllt das Deck mit Standardländern im Verhältnis der Farbsymbole auf 40 auf
  function withLands(cards) {
    for (const id of Object.keys(cards)) if (C[id].t === 'l') delete cards[id];
    const sp = deckN(cards), need = Math.max(0, K.DECK_SIZE - sp); if (!need) return cards;
    const pipsBy = {}; for (const [id, k] of Object.entries(cards)) { const o = K.parseCost(C[id].m || ''); for (const [c, v] of Object.entries(o)) if (c !== 'gen') pipsBy[c] = (pipsBy[c] || 0) + v * k; }
    const tot = Object.values(pipsBy).reduce((a, b) => a + b, 0) || 1, ent = Object.entries(pipsBy).sort((a, b) => b[1] - a[1]);
    if (!ent.length) ent.push(['A', 1]);
    let left = need; ent.forEach(([c, v], i) => { const k = i === ent.length - 1 ? left : Math.max(1, Math.round(need * v / tot)); const kk = Math.min(left, k); if (kk > 0) { cards['land_' + c] = kk; left -= kk; } });
    return cards;
  }
  const deckN = cards => Object.values(cards).reduce((a, b) => a + b, 0);
  // Deck-Bau wie in Clash Royale: oben das Deck, darunter die eigenen Karten, ganz unten die gesperrten. Speichert automatisch.
  function ensureEd(s) {
    if (Z.di == null || Z.di >= s.decks.length) Z.di = s.decks.length ? 0 : -1;
    if (!Z.ed || Z.ed.i !== Z.di) { const d = s.decks[Z.di]; Z.ed = d ? { i: Z.di, n: d.n, cards: { ...d.cards }, hero: d.hero || null } : { i: -1, n: 'Mein Deck', cards: {}, hero: (s.heroes || {}).abent ? 'abent' : null }; }
  }
  let saveT = null;
  function saveSoon() {
    Z.saving = 'wait'; const st = q('#kdz .svst'); if (st) st.textContent = '… speichert';
    clearTimeout(saveT); saveT = setTimeout(async () => {
      const d = Z.ed; if (!d) return;
      const r = await call('kd_deck_save', { i: d.i, n: d.n, cards: d.cards, hero: d.hero || null });
      if (r.error) { Z.saving = 'err'; toast(r.error); render(); return; }
      if (d.i < 0) { d.i = r.i; Z.di = r.i; }
      Z.saving = 'ok'; Z.st = r.state;
      const ae = document.activeElement; if (ae && ae.matches && ae.matches('#kdz [data-kdzname]')) { const st = q('#kdz .svst'); if (st) st.textContent = '✓ gespeichert'; return; }
      Z.keepScroll = true; render();
    }, 650);
  }
  const mini = (id, o = {}) => card(id, { lv: Math.max(1, K.levelOf(id, (Z.st.c || {})[id] || 0)), cls: 'mini ' + (o.cls || '') });
  function showBonus() { // alle Themen-Boni, mit Stand im aktuellen Deck
    const th = Z.tab === 'decks' && Z.ed ? K.themesOf(Z.ed.cards) : null;
    const o = document.createElement('div'); o.className = 'kd-pop'; o.style.zIndex = 9800;
    o.innerHTML = `<div class="kd-rew" style="max-width:420px;width:100%"><b>🎨 Themen-Boni</b><div class="note">Hast du mindestens ${K.BONUS_MIN} Karten eines Themas im Deck, wirkt sein Bonus im ganzen Duell. Mit 10/10/10 sind sogar drei Boni aktiv.</div>
      ${Object.entries(B).map(([f, b]) => { const n = th ? th[f] || 0 : null, on = n != null && n >= K.BONUS_MIN; return `<div style="display:flex;gap:10px;align-items:center;margin-top:10px;padding:8px 10px;border-radius:12px;background:${on ? 'rgba(61,255,138,.14)' : 'rgba(255,255,255,.05)'};border:1px solid ${on ? 'rgba(61,255,138,.5)' : 'rgba(255,255,255,.08)'}">
        <span style="font-size:28px">${fc(f).e}</span><div style="flex:1"><div><b style="font-size:15px;color:${fc(f).col}">${b[0]}</b> <span class="note">(${fc(f).n})</span></div><div>${b[1]}</div></div>
        ${n != null ? `<span style="font-weight:800;white-space:nowrap;color:${on ? '#3dff8a' : '#cfc6e6'}">${on ? '✓ aktiv' : `${n}/${K.BONUS_MIN}`}</span>` : ''}</div>`; }).join('')}</div><button class="btn ghost" data-kdx="1">Schließen</button>`;
    document.body.appendChild(o);
    o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-kdx]')) o.remove(); });
  }
  function heroSlot(id) {
    const H = HE[id];
    if (!H) return `<button class="heroslot empty" data-kdzhero="1"><span class="hp">＋</span><b>Held</b><small>Platz für deinen Helden</small></button>`;
    return `<button class="heroslot" data-kdzhero="1" style="${cv(id)}"><span class="tag">HELD</span><span class="hp">${H.art}</span><b>${esc(H.n)}</b><small>⚡ ${esc(H.pow)}</small><small class="cd">⏳ alle ${H.cd} Züge</small></button>`;
  }
  function heroTile(id, s, sel) { const H = HE[id], own = (s.heroes || {})[id];
    return `<button class="htile ${own ? '' : 'lock'} ${sel ? 'on' : ''}" data-kdzhpick="${id}" style="${cv(id)}"><span class="hp">${own ? H.art : '🔒'}</span><b>${esc(H.n)}</b><small>⚡ ${esc(H.pow)} · alle ${H.cd} Züge</small><small>${esc(H.txt)}</small>${own ? (sel ? '<span class="st">✓ im Deck</span>' : '') : `<span class="st">${Math.round(K.HERO_P * 100)} % pro ${fc(id).n}-Pack</span>`}</button>`; }
  function heroPicker(mode) { // mode 'deck': Held fürs aktuelle Deck wählen · 'info': nur anschauen
    const s = Z.st, cur = mode === 'deck' && Z.ed ? Z.ed.hero : null;
    const o = document.createElement('div'); o.className = 'kd-pop'; o.style.zIndex = 9700;
    o.innerHTML = `<div class="kd-rew" style="max-width:640px;width:100%"><b>🦸 Helden</b><div class="note">Ein Held hat einen eigenen Platz im Deck. Seine Heldenkraft setzt du im Duell ein, sobald die Abklingzeit vorbei ist – danach lädt sie neu auf.${mode === 'deck' ? ' Tippe einen Helden an, um ihn ins Deck zu nehmen.' : ''}</div>
      <div class="hgrid">${Object.keys(HE).map(id => heroTile(id, s, id === cur)).join('')}</div></div>
      <div class="row" style="justify-content:center;gap:8px">${mode === 'deck' && cur ? '<button class="btn ghost" data-kdzhpick="">Ohne Helden</button>' : ''}<button class="btn ghost" data-kdx="1">Schließen</button></div>`;
    document.body.appendChild(o);
    o.addEventListener('click', e => {
      if (e.target === o || e.target.closest('[data-kdx]')) { o.remove(); return; }
      const t = e.target.closest('[data-kdzhpick]'); if (!t || mode !== 'deck') return;
      const id = t.dataset.kdzhpick;
      if (id && !(s.heroes || {})[id]) { toast(`Diesen Helden hast du noch nicht – er steckt mit ${Math.round(K.HERO_P * 100)} % in jedem ${fc(id).n}-Pack.`); return; }
      Z.ed.hero = id || null; o.remove(); Z.keepScroll = true; render(); saveSoon(); toast(id ? `${HE[id].art} ${HE[id].n} führt jetzt dein Deck an` : 'Deck ohne Helden');
    });
  }
  function tabDecks(s) {
    ensureEd(s);
    const d = Z.ed, n = deckN(d.cards), isL = id => C[id] && C[id].t === 'l';
    const lands = Object.entries(d.cards).reduce((a, [id, k]) => a + (isL(id) ? k : 0), 0), cre = Object.entries(d.cards).reduce((a, [id, k]) => a + (C[id].t === 'k' ? k : 0), 0);
    const th = K.themesOf(d.cards), err = K.checkDeck(d.cards, s.c);
    const curve = [1, 2, 3, 4, 5, 6, 7].map(c => Object.entries(d.cards).reduce((a, [id, k]) => a + (!isL(id) && (c === 7 ? C[id].c >= 7 : Math.max(1, C[id].c) === c) ? k : 0), 0)), mx = Math.max(4, ...curve);
    const inDeck = Object.entries(d.cards).filter(([id]) => !isL(id)).sort((a, b) => C[a[0]].c - C[b[0]].c || C[a[0]].n.localeCompare(C[b[0]].n));
    const all = filterIds(Z.edTh, 'alle', false, s);
    const avail = id => Math.min(K.MAX_COPIES, s.c[id] || 0) - (d.cards[id] || 0);
    const owned = all.filter(id => s.c[id] > 0 && avail(id) > 0), locked = all.filter(id => !(s.c[id] > 0));
    const chip = (dk, i) => { const t = K.mainTheme(dk.cards); return `<button class="${i === Z.di ? 'on' : ''}" data-kdzed="${i}">${fc(t).e} ${esc(dk.n)} ${dk.err ? '⚠️' : '✅'}</button>`; };
    const lrow = f => { const x = F[f], id = 'land_' + x.m, k = d.cards[id] || 0; return `<div class="lrow" style="${cv(f)}"><span class="la">${x.landArt}</span><span class="ln">${esc(x.land)}<small>${window.KDpips ? KDpips(x.m) : ''}</small></span><button data-kdzland="${id}" data-d="-1" ${k ? '' : 'disabled style="opacity:.3"'}>−</button><span class="n">${k}</span><button data-kdzland="${id}" data-d="1">＋</button></div>`; };
    const usedCols = Object.keys(F).filter(f => (th[f] || 0) > 0 || d.cards['land_' + F[f].m]);
    const showCols = Z.allLands ? Object.keys(F) : (usedCols.length ? usedCols : ['abent']);
    return `<div class="chips">${s.decks.map(chip).join('')}${Z.di < 0 ? '<button class="on">🆕 Neues Deck</button>' : ''}${s.decks.length < 8 ? '<button data-kdzed="new">＋ Neu</button>' : ''}</div>
      <div class="box dkhead"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input class="nm" data-kdzname="1" maxlength="24" value="${esc(d.n)}" style="flex:1;min-width:150px"><span class="svst note">${Z.saving === 'wait' ? '… speichert' : Z.saving === 'ok' ? '✓ gespeichert' : ''}</span>
        <button class="btn ghost small" data-kdzauto="1">✨ Auto</button>${d.i >= 0 ? '<button class="btn ghost small" data-kdzdel="1" aria-label="Deck löschen">🗑</button>' : ''}${ib('deck')}</div>
        <div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-end;margin-top:8px"><div class="stat" style="flex:1;min-width:220px"><span class="${n === K.DECK_SIZE ? 'ok' : 'bad'}">🃏 ${n}/${K.DECK_SIZE}</span><span>🏞️ ${lands} Länder</span><span>✨ ${n - lands} Zauber</span><span>🐾 ${cre}</span>${Object.entries(th).sort((a, b) => b[1] - a[1]).map(([f, k]) => `<span class="${k >= K.BONUS_MIN ? 'ok' : ''}" data-kdzbonp="1" style="cursor:pointer">${fc(f).e} ${k}${k >= K.BONUS_MIN ? ' ✓' : `/${K.BONUS_MIN}`}</span>`).join('')}<span data-kdzbonp="1" style="cursor:pointer;background:rgba(255,210,63,.18);color:#ffd23f">🎨 Boni</span></div>
        <div class="curve" style="width:170px;height:46px">${curve.map((k, i) => `<div><span>${k || ''}</span><i style="height:${(k / mx) * 28}px"></i>${i === 6 ? '7+' : i + 1}</div>`).join('')}</div></div>
        ${err ? `<div class="note" style="color:#ffb0b0;margin-top:6px">⚠️ ${esc(err)}</div>` : '<div class="note" style="color:#9fffc4;margin-top:6px">✅ Spielbereit</div>'}</div>
      ${hd(`🃏 Dein Deck <span class="note">${n - lands}</span>`)}
      <div class="dkrow"><div class="mgrid deck">${inDeck.map(([id, k]) => `<div class="mw ${Z.just === id ? 'just' : ''}" data-kdzrm="${id}" data-hold="${id}">${mini(id)}<span class="cnt">×${k}</span><button class="ib" data-kdzinfo="${id}" aria-label="Details">i</button></div>`).join('')}${n < K.DECK_SIZE ? `<div class="mw slot"><span>＋${K.DECK_SIZE - n}</span><small>frei</small></div>` : ''}</div>${heroSlot(d.hero)}</div>
      ${hd(`🏞️ Länder <span class="note">${lands}</span>`, '', `<button class="btn ghost small" data-kdzlauto="1" aria-label="Länder auffüllen">⚖️ Auffüllen</button><button class="btn ghost small" data-kdzlall="1" aria-label="Alle Farben">${Z.allLands ? '➖' : '🎨 Alle'}</button>`)}
      <div class="lands">${showCols.map(lrow).join('')}</div>
      ${themeChips(Z.edTh, 'data-kdzeth')}
      ${hd('✋ Deine Karten')}
      <div class="mgrid">${owned.map(id => `<div class="mw" data-kdzadd="${id}" data-hold="${id}">${mini(id)}<span class="cnt free">${avail(id)}×</span><button class="ib" data-kdzinfo="${id}" aria-label="Details">i</button></div>`).join('') || '<p class="note" style="grid-column:1/-1">Alle passenden Karten sind schon im Deck.</p>'}</div>
      ${hd(`🔒 Gesperrt <span class="note">${locked.length}</span>`)}
      <div class="mgrid">${locked.map(id => `<div class="mw lock" data-kdzcard="${id}">${mini(id, { cls: 'miss' })}<span class="lk">🔒</span></div>`).join('')}</div>`;
  }
  // Pack öffnen mit Animation
  // Pack öffnen: Karten werden nacheinander aufgedeckt, am Ende alle zusammen gezeigt. Episch und legendär mit eigener Animation.
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const RCOL = { g: '#e8e8f0', s: '#9fc4ff', e: '#ffcc33', l: '#ff6a1a' };
  async function openPack(th) {
    if (Z.busy) return; Z.busy = true;
    const f = th === 'mix' ? { col: '#b45cff', col2: '#1f3a8a', e: '💎', n: 'Kristall' } : th === 'start' ? { col: '#ffb020', col2: '#7a2a8a', e: '🎁', n: 'Willkommens' } : fc(th);
    const o = document.createElement('div'); o.id = 'kdpk'; o.style.cssText = `--c1:${f.col};--c2:${f.col2}`;
    o.innerHTML = `<div class="dim"></div><div class="rays"></div><div class="vortex"></div><button class="btn ghost small skip" hidden>Überspringen ⏭</button>
      <div class="kdz-pack pk" style="--c1:${f.col};--c2:${f.col2}"><span class="e">${f.e}</span><b>${th === 'mix' ? 'Kristallpack' : th === 'start' ? 'Willkommens-Pack' : f.n + '-Pack'}${th !== 'start' && Z.ptype && Z.ptype !== 'klein' ? '<br>' + K.PACKS[Z.ptype].n : ''}</b></div><div class="msg">Wird geöffnet …</div>`;
    document.body.appendChild(o);
    const [r] = await Promise.all([call('kd_pack', { th, type: th === 'start' ? undefined : Z.ptype || 'klein' }), sleep(600)]);
    Z.busy = false;
    if (r.error) { o.remove(); toast(r.error); return; }
    setState(r.state, true);
    let waiter = null, skip = false;
    const tap = () => (skip ? Promise.resolve() : new Promise(res => { waiter = res; }));
    const skipBtn = o.querySelector('.skip');
    o.addEventListener('click', e => {
      if (e.target.closest('.skip')) { skip = true; skipBtn.hidden = true; }
      if (waiter) { const w = waiter; waiter = null; w(); }
    });
    const msg = o.querySelector('.msg'), pk = o.querySelector('.pk');
    msg.textContent = r.pity ? (r.pity === 'l' ? '🧡 Glücksschutz: mythische Karte garantiert!' : '💜 Glücksschutz: seltene Karte garantiert!') : 'Tippe auf das Pack!';
    await tap();
    // Sternschnuppe in der Farbe der besten Karte
    const best = r.hero ? 'l' : ['l', 'e', 's', 'g'].find(x => r.cards.some(c => c.r === x));
    pk.style.animationDuration = '.25s'; msg.textContent = '';
    if (!skip) {
      const m = document.createElement('div'); m.className = 'meteor'; m.style.setProperty('--mc', RCOL[best]); o.appendChild(m);
      await sleep(1050); m.remove();
    }
    pk.classList.add('boom'); const fl = document.createElement('div'); fl.className = 'flash'; fl.style.background = best === 'g' ? '#fff' : RCOL[best]; o.appendChild(fl);
    await sleep(450); pk.remove(); msg.remove(); setTimeout(() => fl.remove(), 600);
    skipBtn.hidden = false;
    const dim = o.querySelector('.dim'), rays = o.querySelector('.rays'), vortex = o.querySelector('.vortex');
    const center = el => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
    // Karten einzeln aufdecken
    for (let i = 0; i < r.cards.length && !skip; i++) {
      const c = r.cards[i], R = RAR[c.r];
      const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px;z-index:3';
      wrap.innerHTML = `<div class="cntr">KARTE ${i + 1} / ${r.cards.length}</div><div class="kd-one in r-${c.r}" style="--rc:${R.col}"><div class="fl"><div class="bk">💎</div><div class="fr">${card(c.id, { cls: 'big', lv: Math.max(1, c.lv) })}</div></div></div>
        <div class="inf"><b>${esc(C[c.id].n)}</b><span class="rr" style="color:${R.col}">◆ ${R.n}</span><span class="lbl ${c.isNew ? 'new' : c.up ? 'up' : c.dust ? 'dust' : 'n'}">${c.isNew ? '✨ NEU in deiner Sammlung!' : c.up ? `★ Stufe ${c.lv} erreicht!` : c.dust ? `Höchste Stufe – +${c.dust} ✨ Sternenstaub` : `Jetzt ${c.n}× im Besitz`}</span></div><div class="hint">Tippen zum Aufdecken</div>`;
      o.appendChild(wrap);
      const one = wrap.querySelector('.kd-one'), inf = wrap.querySelector('.inf'), hint = wrap.querySelector('.hint');
      await tap(); if (skip) { wrap.remove(); break; }
      hint.textContent = '';
      if (c.r === 'e') { vortex.style.setProperty('--vc', 'rgba(255,204,51,.9)'); vortex.classList.add('on'); one.classList.remove('in'); one.classList.add('charge'); await sleep(900); }
      if (c.r === 'l') {
        dim.classList.add('on'); vortex.style.setProperty('--vc', 'rgba(255,106,26,.95)'); vortex.classList.add('on'); one.classList.remove('in'); one.classList.add('chargeL');
        const [cx, cy] = center(one);
        for (let k = 0; k < 26; k++) { const p = document.createElement('i'); p.className = 'cv'; const a = Math.random() * Math.PI * 2, d = 260 + Math.random() * 200; p.style.left = cx + Math.cos(a) * d + 'px'; p.style.top = cy + Math.sin(a) * d + 'px'; o.appendChild(p);
          setTimeout(() => { p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.opacity = '0'; }, 50 + k * 30); setTimeout(() => p.remove(), 1500); }
        if (navigator.vibrate) navigator.vibrate([30, 60, 30, 60, 30]);
        await sleep(1600);
      }
      one.classList.remove('in', 'charge', 'chargeL'); one.classList.add('open');
      vortex.classList.remove('on'); dim.classList.remove('on');
      await sleep(350);
      const at = center(one);
      if (c.r !== 'g' && window.KDfx) KDfx.burst(at, c.r === 'l' ? '🧡' : c.r === 'e' ? '💜' : '💠', R.col);
      if (c.r === 'e' || c.r === 'l') {
        one.classList.add('pop'); const t = document.createElement('div'); t.className = 'rtx'; t.style.setProperty('--rc', R.col); t.textContent = c.r === 'l' ? 'MYTHISCH!' : 'SELTEN!'; o.appendChild(t); setTimeout(() => t.remove(), 1900);
        if (window.KDfx) setTimeout(() => KDfx.burst(at, '✦', R.col), 250);
      }
      if (c.r === 'l') { rays.classList.add('on'); if (navigator.vibrate) navigator.vibrate([80, 40, 160]); }
      if (c.up && c.lv >= 3 && window.KDfx) setTimeout(() => KDfx.burst(at, '⭐', '#ffd23f'), 500);
      inf.classList.add('on'); hint.textContent = i < r.cards.length - 1 ? 'Tippen für die nächste Karte' : 'Tippen für die Übersicht';
      await tap();
      rays.classList.remove('on');
      one.classList.add('out'); inf.style.opacity = 0; await sleep(skip ? 0 : 320); wrap.remove();
    }
    // Held gezogen (1 %): eigene große Enthüllung
    if (r.hero && HE[r.hero.id]) {
      const H = HE[r.hero.id], hf = fc(r.hero.id);
      skipBtn.hidden = true; dim.classList.add('on'); vortex.style.setProperty('--vc', 'rgba(255,255,255,.9)'); vortex.classList.add('on');
      const t0 = document.createElement('div'); t0.className = 'msg'; t0.style.zIndex = 3; t0.textContent = 'Moment … da ist noch etwas im Pack!'; o.appendChild(t0);
      if (navigator.vibrate) navigator.vibrate([40, 80, 40, 80, 200]);
      await sleep(1500); t0.remove(); vortex.classList.remove('on');
      const fl2 = document.createElement('div'); fl2.className = 'flash'; fl2.style.background = '#ffd23f'; o.appendChild(fl2); setTimeout(() => fl2.remove(), 700);
      rays.classList.add('on'); dim.classList.remove('on');
      const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;z-index:3';
      w.innerHTML = `<div class="kd-heroc big" style="--c1:${hf.col};--c2:${hf.col2}"><span class="hp">${H.art}</span><b>${esc(H.n)}</b><small>${hf.e} Held · ${hf.n}</small><div class="pw"><b>⚡ ${esc(H.pow)}</b><div>${esc(H.txt)}</div><div class="note" style="color:#eee">Abklingzeit: ${H.cd} Züge</div></div></div>
        <div class="msg">${r.hero.dup ? `Schon in deiner Sammlung – +${r.hero.dust} ✨ Sternenstaub` : '🦸 Neuer Held! Setze ihn unter 📦 Decks in den Heldenplatz.'}</div><div class="hint">Tippen für die Übersicht</div>`;
      o.appendChild(w);
      const t = document.createElement('div'); t.className = 'rtx'; t.style.setProperty('--rc', '#ffd23f'); t.textContent = 'HELD!'; o.appendChild(t); setTimeout(() => t.remove(), 1900);
      const at = center(w.querySelector('.kd-heroc')); if (window.KDfx) { KDfx.burst(at, '⭐', '#ffd23f'); setTimeout(() => KDfx.burst(at, H.art, hf.col), 300); setTimeout(() => KDfx.burst(at, '✦', '#fff'), 600); }
      skip = false; await tap(); w.remove(); rays.classList.remove('on');
    }
    // Übersicht
    skipBtn.remove(); rays.classList.remove('on'); vortex.classList.remove('on'); dim.classList.remove('on');
    o.querySelectorAll('.kd-one,.cntr,.inf,.hint').forEach(e => e.parentElement && e.parentElement !== o ? e.parentElement.remove() : e.remove());
    const sum = document.createElement('div'); sum.className = 'sum';
    sum.innerHTML = `<div class="msg">Deine neuen Karten</div><div class="row5">${r.hero && HE[r.hero.id] ? `<div class="kdf open r-l" style="--rc:#ffd23f"><div class="kd-heroc mini" style="--c1:${fc(r.hero.id).col};--c2:${fc(r.hero.id).col2}"><span class="hp">${HE[r.hero.id].art}</span><b>${esc(HE[r.hero.id].n)}</b></div><span class="lbl up" style="opacity:1">${r.hero.dup ? '+' + r.hero.dust + ' ✨' : '🦸 HELD!'}</span></div>` : ''}${r.cards.map((c, i) => `<div class="kdf open r-${c.r}" data-i="${i}" style="--rc:${RAD(c.r)};animation-delay:${i * 0.09}s"><div class="fl"><div class="bk">💎</div><div class="fr">${card(c.id, { lv: Math.max(1, c.lv) })}</div></div>
      <span class="lbl ${c.isNew ? 'new' : c.up ? 'up' : c.dust ? 'dust' : 'n'}">${c.isNew ? '✨ NEU!' : c.up ? `★ Stufe ${c.lv}!` : c.dust ? `+${c.dust} ✨` : `×${c.n}`}</span></div>`).join('')}</div><div class="acts"></div>`;
    o.appendChild(sum);
    const acts = sum.querySelector('.acts');
    if (r.welcome) acts.innerHTML = r.state.welcome > 0 ? `<button class="btn" data-pk="again">🎁 Nächstes Willkommens-Pack (${r.state.welcome} übrig)</button><button class="btn ghost" data-pk="close">Später</button>` : '<button class="btn" data-pk="auto">✨ Deck automatisch bauen</button><button class="btn ghost" data-pk="close">Fertig</button>';
    else { const PT = K.PACKS[r.type] || K.PACKS.klein, fr = r.type && r.type !== 'klein' ? (r.state.fp || {})[r.type] || 0 : r.state.free, can = fr > 0 || r.state.f >= PT.cost; acts.innerHTML = `${can ? `<button class="btn" data-pk="again">🎁 Noch ein ${PT.n} (${fr ? 'Gratis' : PT.cost + ' 🪙'})</button>` : ''}<button class="btn ghost" data-pk="close">Fertig</button>`; }
    sum.addEventListener('click', e => {
      const k = e.target.closest('.kdf'); if (k) { showCard(r.cards[Number(k.dataset.i)].id); return; }
      const b = e.target.closest('[data-pk]'); if (!b) return;
      if (b.dataset.pk === 'again') { o.remove(); openPack(th); }
      else if (b.dataset.pk === 'auto') { o.remove(); Z.tab = 'decks'; Z.di = -1; Z.ed = { i: -1, n: 'Mein Deck', cards: autoDeck(Z.st.c), hero: 'abent' }; render(); saveSoon(); toast('✨ Deck gebaut und gespeichert'); }
      else o.remove();
    });
  }
  const RAD = r => RAR[r].col;
  function startGame(kind) {
    const p = kind === 'friends' ? null : kind === 'arena' ? { arena: K.arenaOf((Z.st && Z.st.tr) || 0) } : { lvl: Number(kind) || 0 };
    if (kind === 'arena' && !me()) { toast('Für Trophäenkämpfe brauchst du ein Konto.'); return; }
    close();
    if (typeof room !== 'undefined' && room && room.game === 'duell' && isHost() && p) { send({ t: 'start', bot: 1, ...p }); return; }
    if (typeof needNick === 'function' && !needNick()) return;
    window.KDZ.pending = p; send({ t: 'create', game: 'duell' });
  }
  document.addEventListener('click', async e => {
    const op = e.target.closest('[data-kdz]'); if (op) { e.preventDefault(); const t = op.dataset.kdz; open(TABS.some(x => x[0] === t) ? t : 'spielen'); return; }
    const el = q('#kdz'); if (!el || !el.contains(e.target)) return;
    const g = (a) => e.target.closest(`[${a}]`);
    let b;
    if (g('data-kdzx')) { close(); return; }
    if ((b = g('data-kdzt'))) { goTab(b.dataset.kdzt); if (!Z.st && me()) { await load(); render(); } return; }
    if ((b = g('data-kdzi'))) { const h = INFO[b.dataset.kdzi] && INFO[b.dataset.kdzi](); if (b.dataset.kdzi === 'bonus') showBonus(); else if (h) sheet(h + '<button class="btn ghost" data-kdx="1" style="width:100%">Schließen</button>'); return; }
    if (g('data-kdztop')) { showTop(); return; }
    if ((b = g('data-kdzland'))) { const id = b.dataset.kdzland, d = Z.ed, k = (d.cards[id] || 0) + Number(b.dataset.d); if (k < 0) return; if (k > (d.cards[id] || 0) && deckN(d.cards) >= K.DECK_SIZE) { toast(`Das Deck ist voll (${K.DECK_SIZE}).`); return; } if (k) d.cards[id] = k; else delete d.cards[id]; Z.keepScroll = true; render(); saveSoon(); return; }
    if (g('data-kdzlauto')) { withLands(Z.ed.cards); Z.keepScroll = true; render(); saveSoon(); toast('⚖️ Länder passend zu deinen Farben aufgefüllt'); return; }
    if (g('data-kdzlall')) { Z.allLands = !Z.allLands; Z.keepScroll = true; render(); return; }
    if (g('data-kdzlogin')) { close(); const a = q('[data-acct="open"]'); if (a) { a.click(); a.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
    if ((b = g('data-kdzgo'))) { startGame(b.dataset.kdzgo); return; }
    if ((b = g('data-kdzptype'))) { const P = K.PACKS[b.dataset.kdzptype]; if ((Z.st.ar || 0) < P.min) { toast(`${P.n} gibt es ab ${K.ARENAS[P.min].e} ${K.ARENAS[P.min].n}.`); return; } Z.ptype = b.dataset.kdzptype; Z.keepScroll = true; render(); return; }
    if ((b = g('data-kdzpack'))) { if (!b.disabled) openPack(b.dataset.kdzpack); return; }
    if ((b = g('data-kdzth'))) { Z.th = b.dataset.kdzth; render(); return; }
    if ((b = g('data-kdzra'))) { Z.ra = b.dataset.kdzra; render(); return; }
    if (g('data-kdzmiss')) { Z.miss = !Z.miss; render(); return; }
    if ((b = g('data-kdzcard'))) { showCard(b.dataset.kdzcard); return; }
    if (g('data-kdzhero')) { heroPicker('deck'); return; }
    if (g('data-kdzhpick')) { heroPicker('info'); return; }
    if ((b = g('data-kdzinfo'))) { showCard(b.dataset.kdzinfo); return; }
    if (g('data-kdzbonp')) { showBonus(); return; }
    if ((b = g('data-kdzed'))) {
      const i = b.dataset.kdzed;
      if (i === 'new') { Z.di = -1; Z.ed = { i: -1, n: 'Deck ' + (Z.st.decks.length + 1), cards: {} }; Z.saving = ''; render(); return; }
      Z.di = Number(i); Z.ed = null; Z.saving = ''; render(); return;
    }
    if (g('data-kdzauto')) { const cards = autoDeck(Z.st.c); Z.ed.cards = cards; Z.keepScroll = true; render(); saveSoon(); if (deckN(cards) < K.DECK_SIZE) toast('Für ein volles Deck fehlen dir noch Karten – öffne ein paar Packs.'); else toast('✨ Deck automatisch gefüllt'); return; }
    if ((b = g('data-kdzeth'))) { Z.edTh = b.dataset.kdzeth; Z.keepScroll = true; render(); return; }
    if ((b = g('data-kdzadd'))) {
      const id = b.dataset.kdzadd, d = Z.ed, k = d.cards[id] || 0, mx = Math.min(K.MAX_COPIES, Z.st.c[id] || 0);
      if (k >= mx) return;
      if (deckN(d.cards) >= K.DECK_SIZE) { toast(`Das Deck ist voll (${K.DECK_SIZE} Karten) – nimm oben erst eine Karte heraus.`); return; }
      d.cards[id] = k + 1; Z.just = id; Z.keepScroll = true; render(); Z.just = null; saveSoon(); return;
    }
    if ((b = g('data-kdzrm'))) { const id = b.dataset.kdzrm, d = Z.ed; if (d.cards[id] > 1) d.cards[id]--; else delete d.cards[id]; Z.keepScroll = true; render(); saveSoon(); return; }
    if (g('data-kdzdel')) { const o = sheet(`<h3>🗑 Deck löschen?</h3><span class="kd-pill warn">„${esc(Z.ed.n)}“ ist danach weg.</span><div class="bigbtns"><button class="btn atk" data-y="1">🗑 Löschen</button><button class="btn ghost" data-kdx="1">Abbrechen</button></div>`);
      o.addEventListener('click', async ev => { if (!ev.target.closest('[data-y]')) return; o.remove(); const r = await call('kd_deck_del', { i: Z.ed.i }); if (r.error) { toast(r.error); return; } Z.ed = null; Z.di = 0; setState(r.state); }); return; }
  });
  // Gedrückt halten: Kartendetails
  let holdT = null, held = false;
  document.addEventListener('pointerdown', e => { const h = e.target.closest && e.target.closest('#kdz [data-hold]'); if (!h) return; held = false; clearTimeout(holdT); holdT = setTimeout(() => { held = true; showCard(h.dataset.hold); }, 450); });
  ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, e => { if (t !== 'pointermove' || Math.abs(e.movementX) + Math.abs(e.movementY) > 6) clearTimeout(holdT); }));
  document.addEventListener('click', e => { if (held && e.target.closest('#kdz [data-hold]')) { e.stopImmediatePropagation(); e.preventDefault(); held = false; } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('#kdz [data-hold]')) e.preventDefault(); });
  document.addEventListener('input', e => { if (e.target.matches && e.target.matches('#kdz [data-kdzname]') && Z.ed) { Z.ed.n = e.target.value; saveSoon(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && q('#kdz') && !q('#kdpk') && !q('.kd-pop')) close(); });
  function goTab(t) { const a = TABS.findIndex(x => x[0] === Z.tab), b = TABS.findIndex(x => x[0] === t); if (a === b) return; Z.swipe = b > a ? 'swl' : 'swr'; Z.tab = t; render(); const zb = q('#kdz .zb'); if (zb) zb.scrollTop = 0; afterTab(); }
  function afterTab() { const c = q('#kdz [data-cur-ar]'); if (c) c.scrollIntoView({ inline: 'center', block: 'nearest' }); }
  let sx = null, sy = null, sOk = false;
  document.addEventListener('touchstart', e => { const z = e.target.closest && e.target.closest('#kdz .zb'); sOk = !!z && !e.target.closest('.car,input,.mgrid.deck .mw'); if (!sOk) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => { if (!sOk || sx == null || q('#kdpk') || q('.kd-sheet') || q('.kd-pop')) { sx = null; return; } const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) { const i = TABS.findIndex(x => x[0] === Z.tab), j = i + (dx < 0 ? 1 : -1); if (j >= 0 && j < TABS.length) goTab(TABS[j][0]); } }, { passive: true });
  document.addEventListener('scroll', e => { const c = e.target; if (!c.matches || !c.matches('#kdz .car')) return; const d = c.nextElementSibling; if (!d || !d.classList.contains('dots')) return; const kids = [...c.children], mid = c.scrollLeft + c.clientWidth / 2; let bi = 0, bd = 1e9; kids.forEach((k, i) => { const m = k.offsetLeft + k.offsetWidth / 2, dd = Math.abs(m - mid); if (dd < bd) { bd = dd; bi = i; } }); [...d.children].forEach((x, i) => x.classList.toggle('on', i === bi)); }, true);
  window.KDZ = { pending: null, open, close };
})();
