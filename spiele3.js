'use strict';
// Game Hub – Quiz-Duell, Werwolf, Wortagenten, Schiffe versenken, Vier-gewinnt-Turnier (Browser-Seite)
// Nutzt die Helfer aus app.js (room, act, send, esc, nameOf, isHost, againHTML, toast, hbHTML).
(function () {
  const css = `
  .g3{width:min(100%,760px);margin:0 auto;display:flex;flex-direction:column;gap:14px;align-items:stretch}
  .g3 .center{text-align:center}
  @keyframes g3pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.06);opacity:1}100%{transform:scale(1)}}
  @keyframes g3up{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}
  @keyframes g3shake{0%,100%{transform:none}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}
  @keyframes g3glow{0%,100%{box-shadow:0 0 0 0 rgba(61,255,138,.0)}50%{box-shadow:0 0 0 8px rgba(61,255,138,.25)}}
  @keyframes g3float{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-60px);opacity:0}}
  @keyframes g3bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
  @keyframes g3spin{to{transform:rotate(360deg)}}
  @keyframes g3conf{0%{transform:translate(0,-20px) rotate(0);opacity:1}100%{transform:translate(var(--dx),110vh) rotate(var(--rot));opacity:.9}}
  .g3conf{position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden}
  .g3conf i{position:absolute;top:0;width:9px;height:14px;border-radius:2px;animation:g3conf var(--t) cubic-bezier(.2,.6,.4,1) forwards}
  .g3timer{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
  .g3timer i{display:block;height:100%;background:linear-gradient(90deg,#3dff8a,#ffd23f 60%,#ff4d6d);transform-origin:left;animation:g3bar linear forwards}
  .g3board{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
  .g3board .chip{transition:transform .4s}
  /* Quiz */
  .qz-head{display:flex;justify-content:space-between;align-items:center;font-weight:800;color:var(--muted);font-size:14px}
  .qz-q{background:linear-gradient(160deg,#2c2546,#1d1830);border:1px solid #4a3f6b;border-radius:20px;padding:26px 20px;text-align:center;font-size:clamp(20px,4.4vw,30px);font-weight:800;line-height:1.25;animation:g3pop .5s both;box-shadow:0 18px 40px rgba(0,0,0,.35)}
  .qz-cat{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#ffd23f;margin-bottom:8px;font-weight:800}
  .qz-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .qz-o{position:relative;border:0;border-radius:16px;min-height:78px;padding:12px 14px 12px 48px;text-align:left;font:800 17px var(--body);color:#fff;background:var(--c);box-shadow:0 6px 0 rgba(0,0,0,.28);cursor:pointer;animation:g3up .45s both;transition:transform .12s,filter .2s,opacity .3s}
  .qz-o:active{transform:translateY(3px);box-shadow:0 3px 0 rgba(0,0,0,.28)}
  .qz-o b{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:22px;opacity:.85}
  .qz-o.dim{filter:saturate(.3) brightness(.6)} .qz-o.pick{outline:4px solid #fff;outline-offset:-4px}
  .qz-o.ok{animation:g3glow 1s 2;filter:none;outline:4px solid #3dff8a;outline-offset:-4px}
  .qz-o.bad{animation:g3shake .5s;filter:saturate(.25) brightness(.55)}
  .qz-o .cnt{position:absolute;right:12px;bottom:8px;font-size:13px;background:rgba(0,0,0,.3);padding:2px 8px;border-radius:99px}
  .qz-gain{font:400 clamp(30px,8vw,54px) var(--display);text-align:center;color:#3dff8a;animation:g3pop .5s both;text-shadow:0 0 18px rgba(61,255,138,.5)}
  .qz-gain.zero{color:#ff6b8b;text-shadow:none}
  .qz-rank{display:flex;flex-direction:column;gap:6px}
  .qz-row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 12px;animation:g3up .4s both}
  .qz-row.me{border-color:var(--accent)} .qz-row .pl{font-family:var(--display);color:var(--accent)} .qz-row .g{color:#3dff8a;font-weight:800;font-size:13px;margin-left:6px}
  .qz-big{font:400 clamp(42px,12vw,90px) var(--display);text-align:center;color:var(--accent);animation:g3pop .6s both}
  .podium{display:flex;align-items:flex-end;justify-content:center;gap:10px;margin-top:10px}
  .podium div{width:min(30%,150px);text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center}
  .podium .blk{width:100%;border-radius:12px 12px 4px 4px;background:linear-gradient(180deg,var(--c),rgba(0,0,0,.25));display:grid;place-items:center;font:400 34px var(--display);color:#1b1726;animation:g3grow 1s cubic-bezier(.2,.9,.3,1.2) both;transform-origin:bottom}
  @keyframes g3grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
  .podium .nm{font-weight:800;animation:g3up .5s .7s both}
  .qz-lobby{display:flex;flex-direction:column;gap:10px;margin-top:16px;padding:14px;border-radius:14px;background:var(--surface);border:1px solid var(--line);text-align:left}
  .qz-lobby .chips{display:flex;flex-wrap:wrap;gap:6px}
  .qz-lobby button.c{border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:99px;padding:7px 12px;font:700 13px var(--body);cursor:pointer}
  .qz-lobby button.c.on{background:var(--accent);color:#1b1400;border-color:var(--accent)}
  .qz-lobby textarea{font:14px var(--body);background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:10px;min-height:110px;resize:vertical}
  /* Werwolf */
  .ww{position:relative;border-radius:22px;padding:18px 14px;overflow:hidden;transition:background 1.2s;min-height:420px}
  .ww.night{background:radial-gradient(120% 80% at 70% 0%,#2a3a7a 0%,#141a3a 45%,#090b1c 100%)}
  .ww.day{background:radial-gradient(120% 80% at 30% 0%,#ffd88a 0%,#e98a52 35%,#5a2f4a 100%)}
  .ww.end{background:radial-gradient(120% 80% at 50% 0%,#4a3f6b,#1b1726)}
  .ww .sky{position:absolute;inset:0;pointer-events:none}
  .ww .moon{position:absolute;right:22px;top:14px;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fffbe6,#e9e2c0 60%,#bdb48c);box-shadow:0 0 40px rgba(255,250,220,.55);animation:wwmoon 6s ease-in-out infinite}
  .ww .sun{position:absolute;left:22px;top:12px;width:66px;height:66px;border-radius:50%;background:radial-gradient(circle,#fff6c8,#ffd23f 55%,#ff9a3d);box-shadow:0 0 50px rgba(255,210,63,.8);animation:wwmoon 5s ease-in-out infinite}
  @keyframes wwmoon{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
  .ww .st{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:wwtw 3s ease-in-out infinite}
  @keyframes wwtw{0%,100%{opacity:.2}50%{opacity:1}}
  .ww h3{position:relative;margin:0 0 4px;font:400 clamp(20px,4.5vw,28px) var(--display);color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.4)}
  .ww .sub{position:relative;color:rgba(255,255,255,.85);margin:0 0 12px;font-weight:600}
  .ww-grid{position:relative;display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:10px}
  .ww-p{position:relative;border:0;border-radius:16px;padding:12px 6px 10px;background:rgba(255,255,255,.1);backdrop-filter:blur(4px);color:#fff;font:700 14px var(--body);display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;transition:transform .15s,background .2s;animation:g3up .4s both}
  .ww-p:hover{transform:translateY(-2px)} .ww-p .av{font-size:30px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))}
  .ww-p.dead{opacity:.45;filter:grayscale(1);cursor:default} .ww-p.sel{background:rgba(255,77,109,.45);box-shadow:0 0 0 3px #ff4d6d}
  .ww-p.me{box-shadow:0 0 0 2px rgba(255,255,255,.6)} .ww-p .vc{position:absolute;top:-6px;right:-4px;background:#ff4d6d;color:#fff;border-radius:99px;padding:1px 7px;font-size:12px;animation:g3pop .3s}
  .ww-p .tag{font-size:11px;padding:1px 6px;border-radius:99px;background:rgba(0,0,0,.35)} .ww-p .tag.wolf{background:#b3123a} .ww-p .tag.gut{background:#1f8a4c}
  .ww-card{perspective:900px;width:min(260px,80%);margin:10px auto;aspect-ratio:3/4}
  .ww-card .in{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:wwflip 1.2s .4s cubic-bezier(.3,1.4,.5,1) both}
  @keyframes wwflip{from{transform:rotateY(180deg)}to{transform:rotateY(0)}}
  .ww-card .f,.ww-card .b{position:absolute;inset:0;border-radius:20px;backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:18px;text-align:center}
  .ww-card .f{background:linear-gradient(160deg,#3a2f5a,#191428);border:2px solid #ffd23f;color:#fff;box-shadow:0 20px 50px rgba(0,0,0,.5)}
  .ww-card .b{transform:rotateY(180deg);background:repeating-linear-gradient(45deg,#2a2342 0 12px,#221c36 12px 24px);border:2px solid #6a5a9a}
  .ww-card .e{font-size:72px;animation:g3pop .6s 1.2s both} .ww-card b{font:400 24px var(--display);color:#ffd23f}
  .ww-act{position:relative;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px}
  .ww-log{position:relative;margin-top:14px;display:flex;flex-direction:column;gap:4px;font-size:14px;color:rgba(255,255,255,.88)}
  .ww-log p{margin:0;animation:g3up .4s both}
  .ww-news{position:relative;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:8px 0}
  .ww-news div{background:rgba(0,0,0,.35);border-radius:16px;padding:12px 16px;text-align:center;color:#fff;animation:g3pop .6s both}
  .ww-news .e{font-size:40px}
  /* Wortagenten */
  .ag-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
  .ag-sc{font:400 26px var(--display);display:flex;align-items:center;gap:8px}
  .ag-sc.r{color:#ff5a6e} .ag-sc.b{color:#4da3ff} .ag-sc.on{animation:pulse 1.6s infinite}
  .ag-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
  .ag-c{position:relative;border:0;border-radius:12px;aspect-ratio:1.45;padding:4px;font:800 clamp(11px,2.6vw,16px) var(--body);color:#2a2238;background:linear-gradient(180deg,#f6eedd,#e3d6bb);box-shadow:0 4px 0 #b9a985;cursor:pointer;overflow:hidden;word-break:break-word;hyphens:auto;transition:transform .15s}
  .ag-c:hover{transform:translateY(-2px)} .ag-c.mark{outline:3px solid var(--accent);outline-offset:-3px;animation:pulse 1s infinite}
  .ag-c.k-r{box-shadow:0 4px 0 #b9a985,inset 0 0 0 4px #ff5a6e} .ag-c.k-b{box-shadow:0 4px 0 #b9a985,inset 0 0 0 4px #4da3ff} .ag-c.k-x{box-shadow:0 4px 0 #b9a985,inset 0 0 0 4px #111;background:linear-gradient(180deg,#d6cdbd,#b8ad97)} .ag-c.k-n{box-shadow:0 4px 0 #b9a985,inset 0 0 0 4px #c9b98f}
  .ag-c.o{color:#fff;animation:agflip .55s both;box-shadow:0 4px 0 rgba(0,0,0,.35)}
  .ag-c.o.r{background:linear-gradient(160deg,#ff6b7d,#c51f3a)} .ag-c.o.b{background:linear-gradient(160deg,#5bb0ff,#1f5fc5)} .ag-c.o.n{background:linear-gradient(160deg,#d9c79c,#a8946a);color:#3a2f1a} .ag-c.o.x{background:linear-gradient(160deg,#333,#000)}
  .ag-c.o span{opacity:.85;font-size:.85em} .ag-c.o::after{content:attr(data-i);position:absolute;right:4px;top:2px;font-size:14px}
  @keyframes agflip{0%{transform:rotateX(90deg)}100%{transform:none}}
  .ag-clue{text-align:center;padding:12px;border-radius:16px;background:var(--surface);border:1px solid var(--line);animation:g3pop .4s both}
  .ag-clue b{font:400 clamp(24px,6vw,38px) var(--display);letter-spacing:.04em} .ag-clue.r b{color:#ff5a6e} .ag-clue.b b{color:#4da3ff}
  .ag-teams{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .ag-team{border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px;min-height:180px}
  .ag-team.r{background:linear-gradient(180deg,rgba(255,90,110,.25),rgba(255,90,110,.06));border:1px solid rgba(255,90,110,.5)}
  .ag-team.b{background:linear-gradient(180deg,rgba(77,163,255,.25),rgba(77,163,255,.06));border:1px solid rgba(77,163,255,.5)}
  .ag-team h3{margin:0;font:400 20px var(--display)} .ag-team.r h3{color:#ff7b8b} .ag-team.b h3{color:#7bbcff}
  .ag-form{display:flex;gap:8px;flex-wrap:wrap;justify-content:center} .ag-form input{max-width:220px} .ag-form select{font:inherit;font-size:18px;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:10px}
  .ag-hist{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:13px}
  .ag-hist span{padding:3px 9px;border-radius:99px;background:var(--surface2)} .ag-hist .r{color:#ff8b9b} .ag-hist .b{color:#8bc4ff}
  /* Schiffe versenken */
  .sv-wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media (max-width:720px){.sv-wrap{grid-template-columns:1fr}.sv-wrap .own{order:2}}
  .sv-b{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;padding:6px;border-radius:14px;background:linear-gradient(180deg,#0f3d6e,#0a2547);box-shadow:inset 0 0 30px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.3);position:relative;overflow:hidden}
  .sv-b::before{content:"";position:absolute;inset:-50%;background:repeating-linear-gradient(115deg,rgba(255,255,255,.04) 0 14px,transparent 14px 40px);animation:svwave 9s linear infinite;pointer-events:none}
  @keyframes svwave{to{transform:translateX(80px)}}
  .sv-b button{position:relative;border:0;padding:0;aspect-ratio:1;border-radius:4px;background:rgba(120,190,255,.12);cursor:pointer}
  .sv-b.can button:not(.m):not(.h):hover{background:rgba(255,210,63,.45)}
  .sv-b .s{background:linear-gradient(180deg,#9aa6b8,#5d6878);box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)}
  .sv-b .m::after{content:"";position:absolute;inset:34%;border-radius:50%;background:#cfe8ff;opacity:.8}
  .sv-b .m.new::before{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #cfe8ff;animation:svsplash .8s ease-out forwards}
  @keyframes svsplash{from{transform:scale(.3);opacity:1}to{transform:scale(2.2);opacity:0}}
  .sv-b .h{background:radial-gradient(circle,#ffd23f 0,#ff6b3d 45%,#8a1f12 100%)}
  .sv-b .h.new{animation:svboom .7s ease-out}
  @keyframes svboom{0%{transform:scale(.2);filter:brightness(3)}60%{transform:scale(1.5)}100%{transform:none}}
  .sv-b .k{background:radial-gradient(circle,#444 0,#1a1a1a 70%);box-shadow:inset 0 0 0 2px #ff4d4d}
  .sv-b .k::after{content:"✕";position:absolute;inset:0;display:grid;place-items:center;color:#ff6b6b;font-weight:900;font-size:12px}
  .sv-fleet{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;font-size:12px}
  .sv-fleet i{display:inline-block;height:10px;border-radius:3px;background:#9aa6b8;margin-right:2px}
  .sv-fleet .gone i{background:#5a2020;opacity:.6}
  .sv-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:800}
  /* Turnier */
  .tu-br{display:flex;gap:14px;overflow-x:auto;padding:6px 2px 10px}
  .tu-col{display:flex;flex-direction:column;justify-content:space-around;gap:10px;min-width:150px}
  .tu-col h4{margin:0;text-align:center;color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase}
  .tu-m{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:6px 8px;display:flex;flex-direction:column;gap:3px;font-size:14px;animation:g3up .4s both;cursor:pointer}
  .tu-m .pl{display:flex;justify-content:space-between;gap:6px;padding:2px 4px;border-radius:6px} .tu-m .pl.w{background:rgba(61,255,138,.15);font-weight:800}
  .tu-m .pl.l{opacity:.5;text-decoration:line-through} .tu-m.live{border-color:var(--accent);box-shadow:0 0 0 2px rgba(255,181,71,.25)} .tu-m.mine{border-color:#3dff8a}
  .tu-champ{text-align:center;animation:g3pop .7s both} .tu-champ .cup{font-size:80px;display:inline-block;animation:wwmoon 2s ease-in-out infinite;filter:drop-shadow(0 0 20px rgba(255,210,63,.7))}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const q = s => document.querySelector(s);
  const left = () => (typeof deadline !== 'undefined' && deadline ? Math.max(0, deadline - Date.now()) : 0);
  const me = () => room.me;
  function confetti(n = 90) {
    const box = document.createElement('div'); box.className = 'g3conf';
    const C = ['#ffd23f', '#ff3fa4', '#22e3ff', '#3dff8a', '#a46bff', '#ff8a3d'];
    box.innerHTML = Array.from({ length: n }, () => `<i style="left:${Math.random() * 100}%;background:${C[(Math.random() * C.length) | 0]};--dx:${(Math.random() - 0.5) * 200}px;--rot:${Math.random() * 900}deg;--t:${2 + Math.random() * 2.2}s;animation-delay:${Math.random() * 0.6}s"></i>`).join('');
    document.body.appendChild(box); setTimeout(() => box.remove(), 5200);
  }
  window.g3confetti = confetti;
  // Inhalt nur neu setzen, wenn sich der Schlüssel ändert (damit Animationen nicht neu starten)
  function frame(stage, mode, key, html) { if (stage.dataset.mode !== mode || stage.dataset.k3 !== key) { stage.dataset.mode = mode; stage.dataset.k3 = key; stage.innerHTML = html; return true; } return false; }
  const timerBar = (ms, total) => `<div class="g3timer"><i style="animation-duration:${ms}ms;width:100%;transform:scaleX(${Math.max(0, ms / (total || ms))})"></i></div>`;
  const pname = id => esc(nameOf(id));

  /* ================= Quiz-Duell ================= */
  const QZ = { cat: 'Alle', n: 10, custom: '' };
  try { Object.assign(QZ, JSON.parse(localStorage.getItem('fsg.quizopt') || '{}')); } catch {}
  const QCATS = ['Alle', 'Allgemeinwissen', 'Geografie', 'Geschichte', 'Natur & Technik', 'Mathe', 'Sport', 'Filme, Serien & Musik', 'Tiere', 'Gaming & Internet', 'Sprache', 'Eigene'];
  const QCOL = [['#e5484d', '▲'], ['#3b7ad6', '◆'], ['#d9a400', '●'], ['#27a06a', '■']];
  function quizLobby() {
    if (!isHost()) return `<p class="note" style="margin-top:12px">Kategorie: <b>${esc(QZ.cat === 'Eigene' ? 'Eigene Fragen' : QZ.cat)}</b> – der Gastgeber wählt.</p>`;
    return `<div class="qz-lobby"><b>Kategorie</b><div class="chips">${QCATS.map(c => `<button class="c ${QZ.cat === c ? 'on' : ''}" data-qzc="${esc(c)}">${c === 'Eigene' ? '✏️ Eigene Fragen' : esc(c)}</button>`).join('')}</div>
      <b>Anzahl Fragen</b><div class="chips">${[5, 10, 15, 20].map(n => `<button class="c ${QZ.n === n ? 'on' : ''}" data-qzn="${n}">${n}</button>`).join('')}</div>
      ${QZ.cat === 'Eigene' ? `<b>Eigene Fragen</b><small class="note">Eine Frage pro Zeile: <code>Frage | richtige Antwort | falsch | falsch | falsch</code> – zum Beispiel für den Lernstoff der nächsten Arbeit.</small><textarea data-qzt placeholder="Wie heißt die Hauptstadt von Polen? | Warschau | Krakau | Danzig | Posen">${esc(QZ.custom)}</textarea>` : ''}
      <small class="note">Du kannst auch allein spielen. Jede Antwort: bis zu 1000 Punkte – je schneller, desto mehr. Serien geben Bonus!</small></div>`;
  }
  const saveQZ = () => { try { localStorage.setItem('fsg.quizopt', JSON.stringify(QZ)); } catch {} };
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-qzc]'); if (c) { QZ.cat = c.dataset.qzc; saveQZ(); window.renderRoom && renderRoom(); return; }
    const n = e.target.closest('[data-qzn]'); if (n) { QZ.n = Number(n.dataset.qzn); saveQZ(); window.renderRoom && renderRoom(); }
  });
  document.addEventListener('input', e => { if (e.target.matches('[data-qzt]')) { QZ.custom = e.target.value.slice(0, 4000); saveQZ(); } });
  function quiz(stage, v) {
    const rank = (v.board || []).map((x, i) => ({ ...x, pl: i + 1 }));
    if (v.phase === 'intro') {
      frame(stage, 'quiz', 'intro', `<div class="g3 center"><p class="qz-cat">${esc(v.cat)}</p><div class="qz-big">Bereit?</div><p class="note">${v.total} Fragen · Antworte schnell für mehr Punkte</p>${timerBar(v.left, v.dur)}</div>`);
      return;
    }
    if (v.phase === 'q') {
      const fresh = frame(stage, 'quiz', 'q' + v.qi, `<div class="g3"><div class="qz-head"><span>Frage ${v.qi + 1} / ${v.total}</span><span data-qzn2></span></div>${timerBar(v.left, v.dur)}
        <div class="qz-q"><div class="qz-cat">${esc(v.qcat || '')}</div>${esc(v.q)}</div>
        <div class="qz-opts">${v.opts.map((o, i) => `<button class="qz-o" data-qa="${i}" style="--c:${QCOL[i][0]};animation-delay:${0.1 + i * 0.07}s"><b>${QCOL[i][1]}</b>${esc(o)}</button>`).join('')}</div>
        <p class="note center" data-qzst></p></div>`);
      void fresh;
      stage.querySelectorAll('.qz-o').forEach((b, i) => { b.classList.toggle('pick', v.mine === i); b.classList.toggle('dim', v.mine != null && v.mine !== i); b.disabled = v.mine != null || !v.inGame; });
      const n2 = stage.querySelector('[data-qzn2]'); if (n2) n2.textContent = `${v.n} / ${rank.length} haben geantwortet`;
      const s2 = stage.querySelector('[data-qzst]'); if (s2) s2.textContent = !v.inGame ? 'Du schaust zu.' : v.mine != null ? '✓ Antwort eingeloggt – warte auf die anderen …' : '';
      return;
    }
    if (v.phase === 'rev') {
      if (frame(stage, 'quiz', 'r' + v.qi, `<div class="g3"><div class="qz-head"><span>Frage ${v.qi + 1} / ${v.total}</span><span>Auflösung</span></div>
        <div class="qz-q" style="animation:none">${esc(v.q)}</div>
        <div class="qz-opts">${v.opts.map((o, i) => `<button class="qz-o ${i === v.ok ? 'ok' : v.mine === i ? 'bad' : 'dim'}" style="--c:${QCOL[i][0]};animation-delay:0s" disabled><b>${QCOL[i][1]}</b>${esc(o)}<span class="cnt">${v.cnt[i]}</span></button>`).join('')}</div>
        ${v.inGame ? `<div class="qz-gain ${v.gain ? '' : 'zero'}">${v.gain ? '+' + v.gain : v.mine == null ? 'Zu langsam!' : 'Leider falsch'}</div>` : ''}
        <div class="qz-rank">${rank.slice(0, 6).map((x, i) => `<div class="qz-row ${x.id === me() ? 'me' : ''}" style="animation-delay:${0.15 + i * 0.06}s"><span class="pl">${x.pl}.</span><span>${pname(x.id)}${x.g ? `<span class="g">+${x.g}</span>` : ''}${x.st >= 2 ? ` 🔥${x.st}` : ''}</span><b>${x.pts}</b></div>`).join('')}</div></div>`)) {
        if (v.gain && v.mine === v.ok && navigator.vibrate) navigator.vibrate(40);
      }
      return;
    }
    // Ende: Siegertreppchen
    const top3 = rank.slice(0, 3), order = [top3[1], top3[0], top3[2]], H = [110, 150, 80], COL = ['#c8ccd6', '#ffd23f', '#d98b4a'];
    if (frame(stage, 'quiz', 'end', `<div class="g3 center"><h2>🏁 Endstand</h2>
      <div class="podium">${order.map((x, i) => x ? `<div><span class="nm">${pname(x.id)}<br><small class="note">${x.pts} Punkte</small></span><div class="blk" style="--c:${COL[i]};height:${H[i]}px;animation-delay:${[0.3, 0.6, 0][i]}s">${[2, 1, 3][i]}</div></div>` : '').join('')}</div>
      <div class="qz-rank" style="margin-top:10px">${rank.slice(3).map(x => `<div class="qz-row ${x.id === me() ? 'me' : ''}"><span class="pl">${x.pl}.</span><span>${pname(x.id)}</span><b>${x.pts}</b></div>`).join('')}</div>
      ${againHTML('Neue Quiz-Runde')}</div>`)) { if (top3[0] && top3[0].id === me()) confetti(); }
  }

  /* ================= Werwolf ================= */
  const WR = { e: { wolf: '🐺', seher: '🔮', hexe: '🧪', jaeger: '🏹', dorf: '🧑‍🌾' }, n: { wolf: 'Werwolf', seher: 'Seherin', hexe: 'Hexe', jaeger: 'Jäger', dorf: 'Dorfbewohner' } };
  const stars = () => Array.from({ length: 40 }, () => `<i class="st" style="left:${Math.random() * 100}%;top:${Math.random() * 60}%;animation-delay:${Math.random() * 3}s"></i>`).join('');
  let wwStars = stars();
  function werwolf(stage, v) {
    const night = v.phase === 'night' || v.phase === 'roles', day = ['dawn', 'day', 'dusk', 'shot'].includes(v.phase);
    const cls = v.phase === 'end' ? 'end' : night ? 'night' : 'day';
    const myRole = v.me, P = v.players;
    let title = '', sub = '', act = '', sel = null, clickable = () => false, aType = '';
    if (v.phase === 'roles') {
      const R = v.roleInfo;
      frame(stage, 'ww', 'roles', `<div class="g3"><div class="ww night"><div class="sky">${wwStars}<div class="moon"></div></div><h3>Deine Rolle</h3><p class="sub">Zeig sie niemandem!</p>
        ${R ? `<div class="ww-card"><div class="in"><div class="f"><div class="e">${R.e}</div><b>${esc(R.n)}</b><small>${esc(R.d)}</small></div><div class="b"></div></div></div>` : '<p class="sub">Du schaust zu.</p>'}
        ${myRole === 'wolf' ? `<p class="sub center">Dein Rudel: ${P.filter(p => p.role === 'wolf' && p.id !== me()).map(p => pname(p.id)).join(', ') || 'du jagst allein'}</p>` : ''}${timerBar(left(), 8000)}</div></div>`);
      return;
    }
    if (v.phase === 'night') {
      title = `🌙 Nacht ${v.day}`;
      if (!v.alive) sub = 'Du bist tot und schaust zu – psst!';
      else if (myRole === 'wolf') { sub = v.target ? `Euer Opfer: ${pname(v.target)}` : 'Wählt gemeinsam ein Opfer.'; sel = v.wv && v.wv[me()]; aType = 'wolf'; clickable = p => p.alive && p.role !== 'wolf'; }
      else if (myRole === 'seher') { if (v.seerDone) { const ls = v.lastSeen; sub = ls ? `🔮 ${pname(ls.id)} ist ${ls.wolf ? 'ein WERWOLF! 🐺' : 'kein Werwolf.'}` : 'Du hast geschaut.'; } else { sub = 'Wessen Rolle willst du sehen?'; aType = 'see'; clickable = p => p.alive && p.id !== me(); } }
      else if (myRole === 'hexe') {
        sub = v.victim ? `Die Werwölfe wollen ${pname(v.victim)} fressen.` : 'Die Werwölfe sind sich noch nicht einig …';
        aType = 'poison'; sel = v.witch && v.witch.poison; clickable = p => !v.poisonUsed && p.alive && p.id !== me();
        act = `${!v.healUsed ? `<button class="btn ${v.witch.heal ? '' : 'ghost'} small" data-ww="heal">💚 ${v.witch.heal ? 'Wird geheilt' : 'Heiltrank'}</button>` : ''}
          ${!v.poisonUsed ? `<span class="note" style="color:#fff;align-self:center">☠️ Gifttrank: tippe jemanden an</span>` : ''}
          <button class="btn ${v.witch.done ? 'ghost' : ''} small" data-ww="witchdone">${v.witch.done ? '✓ Fertig' : 'Fertig für heute Nacht'}</button>`;
      } else sub = 'Du schläfst tief und fest … 😴';
    } else if (v.phase === 'dawn') { title = '☀️ Der Morgen'; sub = v.news.length ? '' : 'Niemand ist gestorben!'; }
    else if (v.phase === 'day') { title = `🗣️ Tag ${v.day}`; sub = v.alive ? 'Diskutiert im Chat 💬 und stimmt ab: Wer ist ein Werwolf?' : 'Du bist tot – schau zu, wie das Dorf entscheidet.'; if (v.alive) { aType = 'vote'; sel = v.votes && v.votes[me()]; clickable = p => p.alive && p.id !== me(); } }
    else if (v.phase === 'dusk') { title = '⚖️ Abstimmung'; sub = v.news.length ? '' : 'Heute wird niemand verbannt.'; }
    else if (v.phase === 'shot') { title = '🏹 Der letzte Schuss'; sub = v.hunter === me() ? 'Du bist gestorben. Wen nimmst du mit?' : `Der Jäger ${pname(v.hunter)} legt an …`; if (v.hunter === me()) { aType = 'shoot'; clickable = p => p.alive; act = '<button class="btn ghost small" data-ww="noshot">Nicht schießen</button>'; } }
    else if (v.phase === 'end') { title = v.win === 'dorf' ? '🌅 Das Dorf gewinnt!' : '🌑 Die Werwölfe gewinnen!'; sub = 'Alle Rollen sind aufgedeckt.'; }
    const votesFor = id => (v.votes ? Object.values(v.votes).filter(t => t === id).length : 0) + (v.wv && myRole === 'wolf' ? Object.values(v.wv).filter(t => t === id).length : 0);
    const news = (v.phase === 'dawn' || v.phase === 'dusk' || v.phase === 'shot') && v.news.length ? `<div class="ww-news">${v.news.map(n => `<div><div class="e">${n.why === 'dorf' ? '⚖️' : n.why === 'pfeil' ? '🏹' : n.why === 'gift' ? '☠️' : '🪦'}</div><b>${pname(n.id)}</b><br>${WR.e[n.role]} ${WR.n[n.role]}</div>`).join('')}</div>` : '';
    const grid = `<div class="ww-grid">${P.map((p, i) => { const can = clickable(p) && v.phase !== 'end'; const vc = votesFor(p.id);
      return `<button class="ww-p ${p.alive ? '' : 'dead'} ${sel === p.id ? 'sel' : ''} ${p.id === me() ? 'me' : ''}" ${can ? `data-wwp="${esc(p.id)}" data-wwt="${aType}"` : 'disabled'} style="animation-delay:${i * 0.03}s">
        <span class="av">${p.alive ? (p.role ? WR.e[p.role] : '🙂') : '💀'}</span>${pname(p.id)}${p.id === me() ? ' (du)' : ''}
        ${p.role && (!p.alive || v.phase === 'end' || p.id === me() || (myRole === 'wolf' && p.role === 'wolf')) ? `<span class="tag">${WR.n[p.role]}</span>` : ''}${p.seen ? `<span class="tag ${p.seen}">${p.seen === 'wolf' ? '🐺 Werwolf' : '✓ gut'}</span>` : ''}${vc ? `<span class="vc">${vc}</span>` : ''}</button>`; }).join('')}</div>`;
    const key = [v.phase, v.day, sub, sel, JSON.stringify(v.votes || {}), JSON.stringify(v.wv || {}), JSON.stringify(v.witch || {}), P.map(p => p.alive).join()].join('|');
    if (frame(stage, 'ww', key, `<div class="g3"><div class="ww ${cls}"><div class="sky">${night ? wwStars + '<div class="moon"></div>' : day ? '<div class="sun"></div>' : ''}</div>
      <h3>${title}</h3>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}${v.left ? timerBar(v.left, { night: 40000, day: 100000, dawn: 7000, dusk: 7000, shot: 20000 }[v.phase] || v.left) : ''}
      ${news}${grid}<div class="ww-act">${act}</div>
      <div class="ww-log">${v.log.map((l, i) => `<p style="animation-delay:${i * 0.05}s">${esc(l)}</p>`).join('')}</div></div>
      ${v.phase === 'end' ? `<div class="center">${againHTML('Neue Runde Werwolf')}</div>` : ''}${v.roleInfo && v.phase !== 'end' ? `<p class="note center">Deine Rolle: ${v.roleInfo.e} <b>${esc(v.roleInfo.n)}</b> – ${esc(v.roleInfo.d)}</p>` : ''}</div>`)) {
      if (v.phase === 'end') { const won = (v.win === 'wolf') === (myRole === 'wolf'); if (won && myRole) confetti(); }
    }
  }
  document.addEventListener('click', e => {
    if (!room || room.game !== 'werwolf') return;
    const p = e.target.closest('[data-wwp]'); if (p) { act({ type: p.dataset.wwt, id: p.dataset.wwp }); return; }
    const b = e.target.closest('[data-ww]'); if (!b) return;
    const a = b.dataset.ww; if (a === 'noshot') act({ type: 'shoot', id: '' }); else act({ type: a });
  });

  /* ================= Wortagenten ================= */
  let agMark = null;
  function agenten(stage, v) {
    const T = { r: 'Rot', b: 'Blau' };
    if (v.phase === 'setup') {
      const col = t => { const ms = room.players.filter(p => v.team[p.id] === t);
        return `<div class="ag-team ${t}"><h3>Team ${T[t]}</h3>${ms.map(p => `<span class="chip">${v.boss[t] === p.id ? '🕵️ ' : ''}${esc(p.name)}${p.id === me() ? ' (du)' : ''}${v.boss[t] === p.id ? ' · Chef' : ''}</span>`).join('') || '<span class="note">noch leer</span>'}
          ${v.my !== t ? `<button class="btn ghost small" data-ag="team" data-t="${t}">Zu Team ${T[t]}</button>` : v.boss[t] !== me() ? `<button class="btn ghost small" data-ag="boss">🕵️ Ich werde Chef</button>` : ''}</div>`; };
      frame(stage, 'ag', 'setup' + JSON.stringify([v.team, v.boss]), `<div class="g3"><h2 class="center">Teams aufstellen</h2><p class="note center">Jedes Team braucht einen Chef: Nur der Chef sieht, welche Karten zu wem gehören, und gibt Hinweise. Die anderen raten.</p>
        <div class="ag-teams">${col('r')}${col('b')}</div>
        ${isHost() ? '<div class="center"><button class="btn" data-ag="go">Los geht’s!</button></div>' : `<p class="status">${pname(room.host)} startet, wenn alle bereit sind.</p>`}</div>`);
      return;
    }
    const myTurn = v.my === v.turn && room.status === 'playing', boss = v.isBoss;
    let ctrl = '';
    if (room.status === 'ended') ctrl = `<div class="ag-clue ${v.win}"><b>🏆 Team ${T[v.win]} gewinnt!</b><p class="note">${esc(v.why)}</p></div><div class="center">${againHTML('Neue Runde (Chefs tauschen)')}</div>`;
    else if (!v.clue) ctrl = boss && myTurn ? `<form class="ag-form" data-agclue><input name="w" maxlength="24" placeholder="Ein Hinweiswort" autocomplete="off"><select name="n">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<option value="${n}">${n === 0 ? '∞' : n}</option>`).join('')}</select><button class="btn">Hinweis geben</button></form>`
      : `<p class="status">${myTurn ? 'Euer Chef denkt nach …' : `Chef von Team ${T[v.turn]} denkt nach …`}</p>`;
    else ctrl = `<div class="ag-clue ${v.clue.t}"><small class="note">Hinweis für Team ${T[v.clue.t]}</small><br><b>${esc(v.clue.w)} · ${v.clue.n || '∞'}</b><br><small class="note">${v.guesses} geraten${v.clue.n ? ` – noch ${Math.max(0, v.clue.n + 1 - v.guesses)} möglich` : ''}</small></div>
      ${myTurn && !boss ? `<p class="note center">Tippe ein Wort zweimal an, um es aufzudecken.</p>${v.guesses ? '<div class="center"><button class="btn ghost small" data-ag="pass">Zug beenden</button></div>' : ''}` : ''}`;
    const cards = v.words.map((w, i) => { const o = v.open[i], k = v.key[i];
      const ic = { r: '🕵️', b: '🕵️', n: '🧍', x: '💣' }[k] || '';
      return `<button class="ag-c ${o ? 'o ' + k : k ? 'k-' + k : ''} ${agMark === i && !o ? 'mark' : ''}" data-agc="${i}" ${o ? `data-i="${ic}"` : ''} style="${o && v.last && v.last.i === i ? '' : 'animation-delay:0s'}"><span>${esc(w)}</span></button>`; }).join('');
    const key = JSON.stringify([v.open, v.clue, v.turn, v.guesses, agMark, room.status, v.isBoss]);
    frame(stage, 'ag', key, `<div class="g3"><div class="ag-top"><span class="ag-sc r ${v.turn === 'r' && room.status === 'playing' ? 'on' : ''}">🟥 ${v.left.r}</span><span class="note">${v.my ? `Du: Team ${T[v.my]}${boss ? ' · Chef 🕵️' : ''}` : 'Zuschauer'}</span><span class="ag-sc b ${v.turn === 'b' && room.status === 'playing' ? 'on' : ''}">${v.left.b} 🟦</span></div>
      <div class="ag-grid">${cards}</div>${ctrl}
      ${v.hist.length ? `<div class="ag-hist">${v.hist.map(h => `<span class="${h.t}">${esc(h.w)} ${h.n || '∞'}</span>`).join('')}</div>` : ''}
      <p class="note center">Stand: Rot ${v.score.r} – ${v.score.b} Blau</p></div>`);
  }
  document.addEventListener('click', e => {
    if (!room || room.game !== 'agenten') return;
    const c = e.target.closest('[data-agc]');
    if (c) { const v = room.view, i = Number(c.dataset.agc); if (!v || v.open[i] || v.isBoss || v.my !== v.turn || !v.clue) return; if (agMark === i) { agMark = null; act({ type: 'tap', i }); } else { agMark = i; window.renderRoom && renderRoom(); } return; }
    const b = e.target.closest('[data-ag]'); if (!b) return;
    const a = b.dataset.ag; if (a === 'team') act({ type: 'team', t: b.dataset.t }); else act({ type: a });
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-agclue]'); if (!f) return; e.preventDefault();
    act({ type: 'clue', w: f.w.value.trim(), n: Number(f.n.value) });
  });

  /* ================= Schiffe versenken ================= */
  let svLast = null;
  function schiffe(stage, v) {
    const N = 10, myTurn = room.status === 'playing' && v.phase === 'play' && v.turn === me() && v.mine;
    const newKey = v.last ? v.last.by + ':' + v.last.c : null, isNew = newKey && newKey !== svLast; svLast = newKey;
    const sunkSet = b => new Set((b.sunk || []).flat());
    const ownShip = new Set(v.own.ships.flatMap(s => s.cells));
    const oSunk = sunkSet(v.own), eSunk = sunkSet(v.enemy), eShip = new Set(v.enemy.ships ? v.enemy.ships.flatMap(s => s.cells) : []);
    const cell = (b, c, own) => { const s = b.shots[c]; const nw = isNew && v.last.c === c && ((own && v.last.by !== v.me) || (!own && v.last.by === v.me)) ? ' new' : '';
      let cls = own && ownShip.has(c) ? 's' : (!own && eShip.has(c) ? 's' : '');
      if (s === 1) cls += ' m'; if (s === 2) cls += (own ? oSunk : eSunk).has(c) ? ' k' : ' h';
      return `<button class="${cls}${nw}" ${!own && myTurn && !s ? `data-svf="${c}"` : 'tabindex="-1"'} aria-label="${'ABCDEFGHIJ'[c % N]}${((c / N) | 0) + 1}"></button>`; };
    const fleet = b => `<div class="sv-fleet">${b.left.map((l, i) => `<span class="${l ? '' : 'gone'}">${'<i style="width:12px"></i>'.repeat([5, 4, 3, 3, 2][i])}</span>`).join('')}</div>`;
    const nm = id => esc(v.names[id]);
    let head;
    if (v.phase === 'place') head = v.mine ? (v.ready[v.me] ? `<p class="status">Bereit! Warte auf ${nm(v.foe)} …</p>` : `<p class="status mine">Stell deine Flotte auf</p><div class="center row" style="justify-content:center"><button class="btn ghost" data-sv="shuffle">🎲 Neu mischen</button><button class="btn" data-sv="ready">✓ Bereit</button></div>`) : '<p class="status">Die Flotten werden aufgestellt …</p>';
    else if (v.phase === 'end') head = `<p class="status">${v.winner === v.me ? '🏆 Du hast gewonnen!' : `${nm(v.winner)} gewinnt!`}</p><div class="center">${v.bot && isHost() ? '<button class="btn" data-svbot="1">Nochmal gegen Admiral Bot</button>' : againHTML('Revanche!')}</div>`;
    else head = `<p class="status ${myTurn ? 'mine' : ''}">${myTurn ? '🎯 Feuer frei – tippe aufs Gegnerfeld' : v.turn === 'bot' ? '🤖 Admiral Bot zielt …' : `${nm(v.turn)} zielt …`}</p>`;
    const st = s => (s && s.shots ? `${s.hits}/${s.shots} Treffer` : '');
    stage.dataset.mode = 'sv';
    stage.innerHTML = `<div class="g3">${head}<p class="log">${esc(v.log || '')}</p>
      <div class="sv-wrap"><div class="own"><div class="sv-h"><span>⚓ ${v.mine ? 'Deine Flotte' : nm(v.me)}</span><small class="note">${st(v.stats[v.foe])}</small></div><div class="sv-b">${v.own.shots.map((_, c) => cell(v.own, c, true)).join('')}</div>${fleet(v.own)}</div>
      <div><div class="sv-h"><span>🎯 ${nm(v.foe)}</span><small class="note">${st(v.stats[v.me])}</small></div><div class="sv-b ${myTurn ? 'can' : ''}">${v.enemy.shots.map((_, c) => cell(v.enemy, c, false)).join('')}</div>${fleet(v.enemy)}</div></div>
      <p class="note center">Stand: ${nm(v.p[0])} ${v.score[v.p[0]] || 0} – ${v.score[v.p[1]] || 0} ${nm(v.p[1])}</p></div>`;
    if (isNew && v.last.hit && navigator.vibrate) navigator.vibrate(v.last.sunk != null ? [60, 40, 90] : 50);
    if (v.phase === 'end' && v.winner === v.me && stage.dataset.cf !== 'sv' + v.score[v.me]) { stage.dataset.cf = 'sv' + v.score[v.me]; confetti(); }
  }
  document.addEventListener('click', e => {
    if (!room) return;
    const sb = e.target.closest('[data-svbot]'); if (sb && isHost()) { send({ t: 'start', bot: 1 }); return; }
    if (room.game !== 'schiffe') return;
    const f = e.target.closest('[data-svf]'); if (f) { act({ type: 'fire', c: Number(f.dataset.svf) }); return; }
    const b = e.target.closest('[data-sv]'); if (b) act({ type: b.dataset.sv });
  });
  const svLobby = () => (isHost() ? '<div class="qz-lobby" style="text-align:center"><b>Kein Gegner da?</b><button class="btn" data-svbot="1">🤖 Gegen Admiral Bot spielen</button></div>' : '');

  /* ================= Vier-gewinnt-Turnier ================= */
  let tuWatch = null;
  function turnier(stage, v) {
    const cur = v.rounds[v.rounds.length - 1], mine = cur.ms.find(m => m.p.includes(me()) && !m.winner);
    const watch = mine || (tuWatch != null && cur.ms[tuWatch]) || cur.ms.find(m => !m.winner) || cur.ms[0];
    const nm = id => (id ? esc(v.names[id] || 'Jemand') : '<i class="note">Freilos</i>');
    const br = `<div class="tu-br">${v.rounds.map((R, ri) => `<div class="tu-col"><h4>${esc(R.title)}</h4>${R.ms.map((m, mi) => `<div class="tu-m ${!m.winner && ri === v.rounds.length - 1 ? 'live' : ''} ${m.p.includes(me()) ? 'mine' : ''}" data-tuw="${ri === v.rounds.length - 1 ? mi : ''}" style="animation-delay:${mi * 0.05}s">${m.p.map(id => `<span class="pl ${m.winner ? (m.winner === id ? 'w' : 'l') : ''}">${nm(id)}${m.winner === id ? ' ✓' : ''}</span>`).join('')}</div>`).join('')}</div>`).join('')}</div>`;
    let body = '';
    if (v.phase === 'end') body = `<div class="tu-champ"><div class="cup">🏆</div><h2>${nm(v.champ)} ist Champion!</h2></div><div class="center">${againHTML('Neues Turnier')}</div>`;
    else if (v.phase === 'break') body = `<p class="status">Nächste Runde startet in <span data-cd></span> s …</p>`;
    else if (watch) {
      const myTurn = mine && mine.p[mine.turn] === me();
      const cells = watch.board.map((x, i) => `<button ${mine ? `data-col="${i % 7}"` : ''} class="${x ? 'p' + x : ''} ${watch.win && watch.win.includes(i) ? 'win' : ''} ${i === watch.last ? 'lastc' : ''}"></button>`).join('');
      body = `<p class="status ${myTurn ? 'mine' : ''}">${mine ? (myTurn ? 'Du bist dran!' : `${nm(mine.p[mine.turn])} ist dran`) : watch.winner ? `${nm(watch.winner)} kommt weiter` : `Du schaust zu: ${nm(watch.p[0])} gegen ${nm(watch.p[1])}`}</p>
        ${watch.draw ? '<p class="note center">Unentschieden – neue Partie mit getauschten Farben!</p>' : ''}
        <div class="bar" style="width:min(100%,560px);margin:0 auto"><span class="player"><span class="dot" style="background:var(--cr)"></span>${nm(watch.p[0])}</span><span class="player"><span class="dot" style="background:var(--cy)"></span>${nm(watch.p[1])}</span></div>
        <div class="c4 ${myTurn ? 'can' : ''}">${cells}</div>${!mine && cur.ms.some(m => m.p.includes(me()) && m.winner && m.winner !== me()) ? '<p class="note center">Du bist ausgeschieden – schau den anderen zu.</p>' : ''}`;
    }
    stage.dataset.mode = 'tu';
    stage.innerHTML = `<div class="g3">${br}${body}</div>`;
    if (v.phase === 'end' && v.champ === me() && stage.dataset.cf !== 'tu') { stage.dataset.cf = 'tu'; confetti(140); }
  }
  document.addEventListener('click', e => { if (!room || room.game !== 'turnier') return; const w = e.target.closest('[data-tuw]'); if (w && w.dataset.tuw !== '') { tuWatch = Number(w.dataset.tuw); window.renderRoom && renderRoom(); } });

  /* ================= Anmelden ================= */
  window.LobbyExtra = Object.assign(window.LobbyExtra || {}, { quiz: quizLobby, schiffe: svLobby });
  window.LobbyOpt = Object.assign(window.LobbyOpt || {}, { quiz: () => ({ cat: QZ.cat, n: QZ.n, custom: QZ.cat === 'Eigene' ? QZ.custom : '' }) });
  const S2 = window.Spiele2 || (window.Spiele2 = { cast() {} });
  Object.assign(S2, { quiz, werwolf, agenten, schiffe, turnier });
  document.addEventListener('click', e => { if (!room || room.game !== 'quiz') return; const b = e.target.closest('[data-qa]'); if (b && !b.disabled) act({ type: 'answer', i: Number(b.dataset.qa) }); });
})();
