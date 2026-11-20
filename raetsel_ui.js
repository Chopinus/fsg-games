// Tagesrätsel im Hub: Sudoku, Nonogramm, Verbindungen, Mathe-Blitz – jeden Tag neu, mit Rangliste.
// Die Zeit misst der Server; Lösungen prüft der Server (raetsel.js).
(() => {
  const q = s => document.querySelector(s);
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const konto = () => { try { const k = JSON.parse(localStorage.getItem('fsg.konto') || 'null'); return k && k.name && k.token ? k : null; } catch { return null; } };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  async function call(a, body) {
    const k = konto(); if (!k) return { error: 'Melde dich oben im Game Hub mit deinem Konto an, um bei den Tagesrätseln mitzumachen.', login: true };
    try { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: k.name, token: k.token, ...(body || {}) }) }); return await r.json(); }
    catch { return { error: 'Keine Verbindung zum Server.' }; }
  }
  const css = `
  #raetsel{max-width:760px;margin:0 auto;padding:max(14px,env(safe-area-inset-top)) 16px 40px;display:flex;flex-direction:column;gap:14px}
  .rx-top{display:flex;align-items:center;gap:10px}.rx-top h2{flex:1;margin:0}
  .rx-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .rx-tabs button{border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:14px;padding:10px 4px;font:800 13px var(--body);display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;transition:transform .15s}
  .rx-tabs button span{font-size:22px} .rx-tabs button.on{background:linear-gradient(160deg,#ffb547,#ff7a3d);color:#1b1400;border-color:transparent;transform:translateY(-2px);box-shadow:0 8px 20px rgba(255,140,60,.35)}
  .rx-tabs button.ok::after{content:"✓";color:#3dff8a;font-size:12px}
  .rx-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px;animation:rxin .35s both}
  @keyframes rxin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes rxpop{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.05)}100%{transform:none;opacity:1}}
  @keyframes rxshake{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  .rx-start{text-align:center;padding:26px 10px;display:flex;flex-direction:column;gap:12px;align-items:center}
  .rx-start .ico{font-size:64px;animation:rxpop .6s both}
  .rx-time{font:400 22px var(--display);color:var(--accent);text-align:center}
  .rx-done{text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center;animation:rxpop .5s both}
  .rx-done .big{font:400 clamp(30px,8vw,46px) var(--display);color:#3dff8a}
  .rx-top10{display:flex;flex-direction:column;gap:4px}
  .rx-top10 p{margin:0;display:flex;justify-content:space-between;padding:6px 10px;border-radius:10px;background:var(--bg);font-size:14px}
  .rx-top10 p.me{outline:2px solid var(--accent)}
  /* Sudoku */
  .sd{display:grid;grid-template-columns:repeat(9,1fr);width:min(100%,460px);margin:0 auto;border:3px solid #cfc4e6;border-radius:10px;overflow:hidden;background:#cfc4e6;gap:1px}
  .sd button{border:0;aspect-ratio:1;background:var(--bg);color:#9fd3ff;font:800 clamp(16px,4.6vw,24px) var(--body);padding:0;cursor:pointer;transition:background .15s}
  .sd button.g{color:var(--fg)} .sd button.hl{background:#2a2442} .sd button.same{background:#3b2f5e} .sd button.sel{background:#5a3d8a} .sd button.bad{color:#ff5a6e;animation:rxshake .3s}
  .sd button:nth-child(9n+3),.sd button:nth-child(9n+6){margin-right:2px} .sd button:nth-child(n+19):nth-child(-n+27),.sd button:nth-child(n+46):nth-child(-n+54){margin-bottom:2px}
  .sd.win button{animation:rxwin .6s both} @keyframes rxwin{50%{background:#1f8a4c;transform:scale(1.08)}}
  .pad{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;width:min(100%,460px);margin:0 auto}
  .pad button{border:1px solid var(--line);background:var(--surface2);color:var(--fg);border-radius:12px;min-height:50px;font:800 20px var(--body);cursor:pointer}
  .pad button:active{background:var(--accent);color:#1b1400}
  /* Nonogramm */
  .nn{display:grid;width:min(100%,520px);margin:0 auto;gap:2px;user-select:none;-webkit-user-select:none;touch-action:none}
  .nn .cl{font:800 11px var(--body);color:var(--muted);display:flex;align-items:flex-end;justify-content:center;gap:2px;flex-direction:column;text-align:center;line-height:1.1;padding-bottom:3px}
  .nn .cr{flex-direction:row;align-items:center;justify-content:flex-end;padding:0 4px 0 0;gap:4px}
  .nn .cl.ok{color:#3dff8a}
  .nn .c{aspect-ratio:1;border-radius:4px;background:#3a3158;box-shadow:inset 0 0 0 1px #4a4070;transition:background .12s,transform .12s;position:relative}
  .nn .c.f{background:linear-gradient(160deg,#ffb547,#ff7a3d);transform:scale(.94)} .nn .c.x::after{content:"✕";position:absolute;inset:0;display:grid;place-items:center;color:#6c5f8a;font-weight:900}
  .nn .c.b5{margin-right:3px} .nn .c.r5{margin-bottom:3px}
  .nn.win .c.f{animation:rxwin .8s both;background:linear-gradient(160deg,#3dff8a,#22c4ff)}
  .rx-mode{display:flex;gap:6px;justify-content:center}
  .rx-mode button{border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:99px;padding:8px 16px;font:800 14px var(--body)} .rx-mode button.on{background:var(--accent);color:#1b1400}
  /* Verbindungen */
  .vb{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
  .vb button{border:0;border-radius:12px;min-height:64px;padding:6px;background:#e9e0cc;color:#2a2238;font:800 clamp(12px,3.2vw,16px) var(--body);cursor:pointer;transition:transform .15s,background .15s;word-break:break-word;hyphens:auto}
  .vb button.on{background:#5a3d8a;color:#fff;transform:scale(.96)} .vb.shake button.on{animation:rxshake .4s}
  .vg{border-radius:14px;padding:12px;text-align:center;color:#1b1400;animation:rxpop .5s both}
  .vg b{display:block;font-size:13px;text-transform:uppercase;letter-spacing:.06em} .vg span{font-weight:700}
  .vg.c0{background:#f9df6d}.vg.c1{background:#a0c35a}.vg.c2{background:#b0c4ef}.vg.c3{background:#ba81c5}
  .vmiss{display:flex;gap:6px;justify-content:center;align-items:center;color:var(--muted);font-size:14px}.vmiss i{width:12px;height:12px;border-radius:50%;background:var(--accent)}.vmiss i.x{background:var(--line)}
  /* Mathe-Blitz */
  .mb-q{font:400 clamp(44px,13vw,84px) var(--display);text-align:center;letter-spacing:.02em;animation:rxpop .25s both}
  .mb-in{font:400 clamp(34px,9vw,54px) var(--display);text-align:center;color:var(--accent);min-height:1.2em;border-bottom:3px solid var(--line);width:min(70%,280px);margin:0 auto}
  .mb-in.ok{color:#3dff8a}
  .mb-bar{height:10px;border-radius:99px;background:var(--bg);overflow:hidden}.mb-bar i{display:block;height:100%;background:linear-gradient(90deg,#3dff8a,#ffd23f,#ff4d6d);transition:width .2s linear}
  .mb-sc{text-align:center;font-weight:800;color:var(--muted)}
  `;
  const KINDS = [['sudoku', '🔢', 'Sudoku'], ['nono', '🖼️', 'Nonogramm'], ['verb', '🧩', 'Verbindungen'], ['mathe', '⚡', 'Mathe-Blitz']];
  const INFO = {
    sudoku: 'Fülle das Feld so, dass in jeder Zeile, jeder Spalte und jedem 3×3-Kasten jede Zahl von 1 bis 9 genau einmal steht.',
    nono: 'Die Zahlen sagen dir, wie viele Kästchen in einer Reihe hintereinander ausgefüllt sind. Daraus entsteht ein Bild!',
    verb: 'Finde vier Gruppen aus je vier Wörtern, die etwas gemeinsam haben. Du darfst dich höchstens viermal irren.',
    mathe: '60 Sekunden Kopfrechnen – so viele Aufgaben wie möglich. Die richtige Zahl tippen, schon kommt die nächste.',
  };
  let page = null, S = null, tab = 'sudoku', T = {}, tick = null;
  const fmt = ms => { const s = Math.floor((ms || 0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const me = () => (konto() || {}).name;

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mathe(seed, n = 80) { // gleiche Aufgaben wie auf dem Server
    const R = rng(seed), out = [];
    for (let i = 0; i < n; i++) {
      const lv = Math.min(4, Math.floor(i / 6)), k = Math.floor(R() * 4), ri = (a, b) => a + Math.floor(R() * (b - a + 1)); let a, b, op, res;
      if (k === 0) { a = ri(2, 10 + lv * 20); b = ri(2, 10 + lv * 20); op = '+'; res = a + b; }
      else if (k === 1) { a = ri(5, 15 + lv * 20); b = ri(1, a); op = '−'; res = a - b; }
      else if (k === 2) { a = ri(2, 6 + lv * 2); b = ri(2, 9 + lv); op = '×'; res = a * b; }
      else { b = ri(2, 9 + lv); res = ri(2, 9 + lv); a = b * res; op = ':'; }
      out.push([a, op, b, res]);
    }
    return out;
  }

  function topHTML(kind) {
    const L = (S && S.top && S.top[kind]) || [];
    const val = x => (kind === 'mathe' ? `${x.sc} richtig` : kind === 'verb' ? `${x.miss ? x.miss + ' Fehler · ' : ''}${fmt(x.ms)}` : fmt(x.ms));
    return `<b>🏆 Rangliste heute</b><div class="rx-top10">${L.length ? L.map((x, i) => `<p class="${x.name === me() ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || i + 1 + '.'} ${h(x.name)}</span><b>${val(x)}</b></p>`).join('') : '<p class="note" style="background:none">Noch niemand – sei die oder der Erste!</p>'}</div>`;
  }
  function render() {
    if (!page) return;
    const head = `<div class="rx-top"><button class="btn ghost small" data-rx="back">‹ Spiele</button><h2>Tagesrätsel${S ? ` <small class="note">Nr. ${S.nr}</small>` : ''}</h2></div>
      <div class="rx-tabs">${KINDS.map(([k, e, n]) => `<button class="${tab === k ? 'on' : ''} ${S && S.mine[k].done ? 'ok' : ''}" data-rxt="${k}"><span>${e}</span>${n}</button>`).join('')}</div>`;
    if (!S) { page.innerHTML = head + '<div class="rx-card"><p class="note">Wird geladen …</p></div>'; return; }
    const M = S.mine[tab];
    let body;
    if (M.done || (tab === 'verb' && M.failed)) body = doneHTML(M);
    else if (!M.started) body = `<div class="rx-start"><div class="ico">${KINDS.find(k => k[0] === tab)[1]}</div><h2>${KINDS.find(k => k[0] === tab)[2]}</h2><p class="note">${INFO[tab]}</p><button class="btn" data-rx="start">${tab === 'mathe' ? '⚡ 60 Sekunden starten' : '▶ Starten – die Zeit läuft'}</button><small class="note">Ein Versuch pro Tag zählt für die Rangliste.</small></div>`;
    else body = playHTML(M);
    page.innerHTML = `${head}<div class="rx-card">${body}</div><div class="rx-card">${topHTML(tab)}</div>`;
    after(M);
  }
  function doneHTML(M) {
    if (tab === 'verb' && M.failed && !M.done) return `<div class="rx-done"><div class="big" style="color:#ff6b8b">Knapp daneben!</div><p class="note">Hier ist die Auflösung:</p></div>${(M.groups || []).map((g, i) => `<div class="vg c${i}"><b>${h(g.n)}</b><span>${g.w.map(h).join(', ')}</span></div>`).join('')}<p class="note" style="text-align:center">Morgen gibt es neue Verbindungen.</p>`;
    let extra = '';
    if (tab === 'nono' && M.bits) extra = `<p class="note">Das Bild: <b>${h(M.name)}</b></p><div class="nn win" style="grid-template-columns:repeat(10,1fr);width:min(60%,240px)">${M.bits.map(b => `<div class="c ${b ? 'f' : ''}"></div>`).join('')}</div>`;
    if (tab === 'verb' && M.groups) extra = M.groups.map((g, i) => `<div class="vg c${i}" style="width:100%"><b>${h(g.n)}</b><span>${g.w.map(h).join(', ')}</span></div>`).join('');
    return `<div class="rx-done"><div style="font-size:54px">🎉</div><div class="big">${tab === 'mathe' ? `${M.sc} richtig!` : fmt(M.ms)}</div><p class="note">${tab === 'mathe' ? 'in 60 Sekunden' : tab === 'verb' ? `gelöst mit ${M.miss || 0} Fehler${M.miss === 1 ? '' : 'n'}` : 'gelöst!'} · Morgen gibt es ein neues Rätsel.</p>${extra}</div>`;
  }
  function playHTML(M) {
    if (tab === 'sudoku') {
      const g = T.sd || (T.sd = { g: M.puz.slice(), sel: -1, base: M.puz.slice() });
      return `<div class="rx-time" data-rxclock></div><div class="sd" data-sd>${g.g.map((v, i) => `<button data-sdi="${i}" class="${g.base[i] ? 'g' : ''}">${v || ''}</button>`).join('')}</div>
        <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-sdn="${n}">${n}</button>`).join('')}<button data-sdn="0">⌫</button></div>`;
    }
    if (tab === 'nono') {
      const N = T.nn || (T.nn = { g: Array(100).fill(0), mode: 1 });
      const mx = Math.max(...M.cols.map(c => c.length)), cells = [];
      cells.push('<div></div>'); for (let c = 0; c < 10; c++) cells.push(`<div class="cl" data-nnc="${c}">${M.cols[c].map(x => `<span>${x}</span>`).join('')}</div>`);
      for (let r = 0; r < 10; r++) { cells.push(`<div class="cl cr" data-nnr="${r}">${M.rows[r].map(x => `<span>${x}</span>`).join('')}</div>`); for (let c = 0; c < 10; c++) { const i = r * 10 + c; cells.push(`<div class="c ${N.g[i] === 1 ? 'f' : N.g[i] === 2 ? 'x' : ''} ${c === 4 ? 'b5' : ''} ${r === 4 ? 'r5' : ''}" data-nni="${i}"></div>`); } }
      return `<div class="rx-time" data-rxclock></div><div class="rx-mode"><button class="${N.mode === 1 ? 'on' : ''}" data-nnm="1">■ Ausfüllen</button><button class="${N.mode === 2 ? 'on' : ''}" data-nnm="2">✕ Markieren</button></div>
        <div class="nn" data-nn style="grid-template-columns:${Math.max(38, mx * 12)}px repeat(10,1fr);grid-template-rows:${Math.max(30, mx * 14)}px repeat(10,auto)">${cells.join('')}</div><p class="note" style="text-align:center">Tipp: Wischen füllt mehrere Kästchen auf einmal.</p>`;
    }
    if (tab === 'verb') {
      const V = T.vb || (T.vb = { sel: [], order: null });
      const found = new Set(M.found.flatMap(g => g.w)); const rest = (V.order || M.words).filter(w => !found.has(w));
      return `<div class="rx-time" data-rxclock></div>${M.found.map((g, i) => `<div class="vg c${i}"><b>${h(g.n)}</b><span>${g.w.map(h).join(', ')}</span></div>`).join('')}
        <div class="vb" data-vb>${rest.map(w => `<button class="${V.sel.includes(w) ? 'on' : ''}" data-vw="${h(w)}">${h(w)}</button>`).join('')}</div>
        <div class="vmiss">Fehler übrig: ${[0, 1, 2, 3].map(i => `<i class="${i < M.missLeft ? '' : 'x'}"></i>`).join('')}</div>
        <div class="row" style="justify-content:center;gap:8px"><button class="btn ghost small" data-vbx="mix">🔀 Mischen</button><button class="btn ghost small" data-vbx="clear">Abwählen</button><button class="btn small" data-vbx="go" ${V.sel.length === 4 ? '' : 'disabled'}>Prüfen</button></div>`;
    }
    if (tab === 'mathe') {
      const B = T.mb || (T.mb = { P: mathe(M.seed), i: 0, inp: '', ans: [], t0: Date.now() - (M.dur - (M.left || 0)) });
      const P = B.P[B.i];
      return `<div class="mb-bar"><i data-mbbar style="width:100%"></i></div><div class="mb-sc">✓ ${B.i} richtig</div><div class="mb-q" data-mbq>${P[0]} ${P[1]} ${P[2]}</div><div class="mb-in" data-mbin>${B.inp || '?'}</div>
        <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button data-mbn="${n}">${n}</button>`).join('')}<button data-mbn="back" style="grid-column:span 5">⌫ Löschen</button></div>`;
    }
    return '';
  }
  function after(M) {
    clearInterval(tick); tick = null;
    if (!M.started || M.done || M.failed) return;
    const t0 = Date.now() - (M.el || 0);
    if (tab === 'mathe') { tick = setInterval(mbTick, 100); return; }
    const clk = () => { const e = page && page.querySelector('[data-rxclock]'); if (e) e.textContent = '⏱ ' + fmt(Date.now() - t0); };
    clk(); tick = setInterval(clk, 500);
    if (tab === 'sudoku') sdPaint();
    if (tab === 'nono') nnCheck(false);
  }
  /* Sudoku */
  function sdPaint() {
    const g = T.sd; if (!g) return; const box = page.querySelector('[data-sd]'); if (!box) return;
    const sr = (g.sel / 9) | 0, sc = g.sel % 9, sv = g.g[g.sel];
    [...box.children].forEach((b, i) => {
      const r = (i / 9) | 0, c = i % 9, same = sv && g.g[i] === sv;
      const hl = g.sel >= 0 && (r === sr || c === sc || (((r / 3) | 0) === ((sr / 3) | 0) && ((c / 3) | 0) === ((sc / 3) | 0)));
      let bad = false; const v = g.g[i]; if (v && !g.base[i]) for (let k = 0; k < 81; k++) { if (k === i || g.g[k] !== v) continue; const r2 = (k / 9) | 0, c2 = k % 9; if (r2 === r || c2 === c || (((r2 / 3) | 0) === ((r / 3) | 0) && ((c2 / 3) | 0) === ((c / 3) | 0))) { bad = true; break; } }
      b.className = `${g.base[i] ? 'g' : ''} ${i === g.sel ? 'sel' : same ? 'same' : hl ? 'hl' : ''} ${bad ? 'bad' : ''}`; b.textContent = v || '';
    });
  }
  async function sdSet(n) {
    const g = T.sd; if (!g || g.sel < 0 || g.base[g.sel]) return;
    g.g[g.sel] = n; sdPaint();
    if (g.g.every(Boolean)) { const r = await call('rx_submit', { kind: 'sudoku', g: g.g }); if (r.wrong) { say('Noch nicht ganz – irgendwo stimmt etwas nicht.'); return; } if (r.done) { page.querySelector('[data-sd]').classList.add('win'); setTimeout(() => load(), 900); } }
  }
  /* Nonogramm */
  let nnDrag = null;
  function nnPaint(i, val) { const N = T.nn; N.g[i] = val; const c = page.querySelector(`[data-nni="${i}"]`); if (c) c.className = `c ${val === 1 ? 'f' : val === 2 ? 'x' : ''} ${i % 10 === 4 ? 'b5' : ''} ${((i / 10) | 0) === 4 ? 'r5' : ''}`; }
  function runs(a) { const o = []; let n = 0; for (const b of a) { if (b === 1) n++; else if (n) { o.push(n); n = 0; } } if (n) o.push(n); return o.length ? o : [0]; }
  async function nnCheck(submit = true) {
    const M = S.mine.nono, N = T.nn; let all = true;
    for (let r = 0; r < 10; r++) { const ok = JSON.stringify(runs(N.g.slice(r * 10, r * 10 + 10))) === JSON.stringify(M.rows[r]); const e = page.querySelector(`[data-nnr="${r}"]`); if (e) e.classList.toggle('ok', ok); all = all && ok; }
    for (let c = 0; c < 10; c++) { const ok = JSON.stringify(runs([...Array(10)].map((_, r) => N.g[r * 10 + c]))) === JSON.stringify(M.cols[c]); const e = page.querySelector(`[data-nnc="${c}"]`); if (e) e.classList.toggle('ok', ok); all = all && ok; }
    if (all && submit) { const r = await call('rx_submit', { kind: 'nono', g: N.g.map(x => (x === 1 ? 1 : 0)) }); if (r.done) { page.querySelector('[data-nn]').classList.add('win'); setTimeout(() => load(), 1200); } }
  }
  /* Mathe-Blitz */
  function mbTick() {
    const B = T.mb; if (!B) return; const left = Math.max(0, 60000 - (Date.now() - B.t0));
    const bar = page.querySelector('[data-mbbar]'); if (bar) bar.style.width = (left / 600) + '%';
    if (left <= 0 && !B.sent) { B.sent = true; clearInterval(tick); call('rx_submit', { kind: 'mathe', a: B.ans }).then(() => load()); }
  }
  function mbKey(n) {
    const B = T.mb; if (!B || B.sent) return;
    if (n === 'back') B.inp = B.inp.slice(0, -1); else if (B.inp.length < 5) B.inp += n;
    const P = B.P[B.i], el = page.querySelector('[data-mbin]');
    if (Number(B.inp) === P[3]) { B.ans.push(P[3]); B.i++; B.inp = ''; if (el) { el.textContent = '✓'; el.classList.add('ok'); } setTimeout(() => { if (!page.querySelector('[data-mbq]')) return; const Q = B.P[B.i]; const q2 = page.querySelector('[data-mbq]'); q2.textContent = `${Q[0]} ${Q[1]} ${Q[2]}`; q2.style.animation = 'none'; void q2.offsetWidth; q2.style.animation = ''; const i2 = page.querySelector('[data-mbin]'); i2.classList.remove('ok'); i2.textContent = '?'; page.querySelector('.mb-sc').textContent = `✓ ${B.i} richtig`; }, 120); }
    else if (el) el.textContent = B.inp || '?';
  }
  async function load() {
    const r = await call('rx_state'); if (r.error) { say(r.error); if (r.login) close(); return; }
    if (!S || S.nr !== r.nr) T = {}; S = r; render();
  }
  async function start() {
    const r = await call('rx_start', { kind: tab }); if (r.error) { say(r.error); return; }
    S.mine[tab] = r; delete T[{ sudoku: 'sd', nono: 'nn', verb: 'vb', mathe: 'mb' }[tab]]; render();
  }
  function open(kind) {
    if (!page) {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      page = document.createElement('main'); page.id = 'raetsel'; page.hidden = true; document.body.insertBefore(page, q('#picker'));
      page.addEventListener('click', async e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.rx === 'back') return close();
        if (b.dataset.rx === 'start') return start();
        if (b.dataset.rxt) { tab = b.dataset.rxt; return render(); }
        if (b.dataset.sdi) { T.sd.sel = Number(b.dataset.sdi); return sdPaint(); }
        if (b.dataset.sdn) return sdSet(Number(b.dataset.sdn));
        if (b.dataset.nnm) { T.nn.mode = Number(b.dataset.nnm); page.querySelectorAll('[data-nnm]').forEach(x => x.classList.toggle('on', x === b)); return; }
        if (b.dataset.vw) { const V = T.vb, w = b.dataset.vw; if (V.sel.includes(w)) V.sel = V.sel.filter(x => x !== w); else if (V.sel.length < 4) V.sel.push(w); return render(); }
        if (b.dataset.vbx === 'clear') { T.vb.sel = []; return render(); }
        if (b.dataset.vbx === 'mix') { const a = (T.vb.order || S.mine.verb.words).slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } T.vb.order = a; return render(); }
        if (b.dataset.vbx === 'go') {
          const r = await call('rx_submit', { kind: 'verb', w: T.vb.sel }); if (r.error) return say(r.error);
          if (r.dup) return say('Diese Kombination hast du schon probiert.');
          if (r.hit) { T.vb.sel = []; S.mine.verb = r; render(); if (r.done) setTimeout(load, 700); }
          else { const box = page.querySelector('[data-vb]'); box.classList.add('shake'); setTimeout(() => { S.mine.verb = r; render(); }, 450); say(r.one ? 'Eins daneben!' : 'Leider nicht.'); }
          return;
        }
        if (b.dataset.mbn) return mbKey(b.dataset.mbn);
      });
      page.addEventListener('pointerdown', e => { const c = e.target.closest('[data-nni]'); if (!c || !T.nn) return; e.preventDefault(); const i = Number(c.dataset.nni), cur = T.nn.g[i]; nnDrag = cur === T.nn.mode ? 0 : T.nn.mode; nnPaint(i, nnDrag); });
      page.addEventListener('pointermove', e => { if (nnDrag == null) return; const el = document.elementFromPoint(e.clientX, e.clientY); const c = el && el.closest && el.closest('[data-nni]'); if (c) { const i = Number(c.dataset.nni); if (T.nn.g[i] !== nnDrag) nnPaint(i, nnDrag); } });
      addEventListener('pointerup', () => { if (nnDrag != null) { nnDrag = null; nnCheck(true); } });
    }
    if (kind) tab = kind;
    const hub = q('#hub'); if (hub) hub.hidden = true;
    page.hidden = false; scrollTo(0, 0); render(); load();
  }
  function close() { clearInterval(tick); if (page) page.hidden = true; const hub = q('#hub'); if (hub) hub.hidden = false; }
  document.addEventListener('keydown', e => {
    if (!page || page.hidden || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    if (tab === 'sudoku' && T.sd) { if (/^[1-9]$/.test(e.key)) sdSet(Number(e.key)); else if (e.key === 'Backspace' || e.key === 'Delete') sdSet(0);
      else if (e.key.startsWith('Arrow')) { const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key]; T.sd.sel = Math.max(0, Math.min(80, (T.sd.sel < 0 ? 0 : T.sd.sel) + d)); sdPaint(); e.preventDefault(); } }
    if (tab === 'mathe' && T.mb) { if (/^[0-9]$/.test(e.key)) mbKey(e.key); else if (e.key === 'Backspace') mbKey('back'); }
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-rx-open]'); if (b) open(b.dataset.rxOpen || null); });
  window.Raetsel = { open, isOpen: () => !!(page && !page.hidden) };
})();
