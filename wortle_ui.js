// Wörtle im Hub (Spieler-Idee): jeden Tag ein neues deutsches Wort mit 5 Buchstaben, 6 Versuche, Rangliste des Tages.
// Das Wort prüft der Server (wortle.js) – im Browser steht die Lösung nirgends.
(() => {
  const q = s => document.querySelector(s);
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const konto = () => { try { const k = JSON.parse(localStorage.getItem('fsg.konto') || 'null'); return k && k.name && k.token ? k : null; } catch { return null; } };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  async function call(a, body) {
    const k = konto(); if (!k) return { error: 'Melde dich im Game Hub an, um bei Wörtle mitzuspielen.', login: true };
    try { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: k.name, token: k.token, ...(body || {}) }) }); return await r.json(); }
    catch { return { error: 'Keine Verbindung zum Server.' }; }
  }
  const css = `
  #wortle{max-width:560px;margin:0 auto;padding:calc(env(safe-area-inset-top,0px) + 12px) 14px 40px}
  #wortle .wd-top{display:flex;align-items:center;gap:10px;margin-bottom:6px}#wortle .wd-top h2{flex:1;margin:0;font-family:var(--display);font-size:22px;letter-spacing:.5px}
  #wortle .wd-sub{color:var(--muted);font-size:13px;margin:0 0 12px}
  #wortle .wd-grid{display:grid;grid-template-rows:repeat(6,1fr);gap:6px;width:min(330px,86vw);margin:0 auto}
  #wortle .wd-row{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
  #wortle .wd-row.shake{animation:wdShake .4s}
  @keyframes wdShake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
  #wortle .wd-c{aspect-ratio:1;display:grid;place-items:center;border:2px solid var(--line);border-radius:8px;font:800 clamp(22px,7vw,30px)/1 var(--body);text-transform:uppercase;background:var(--surface)}
  #wortle .wd-c.f{border-color:#7a6e92}
  #wortle .wd-c.s0{background:#3a3446;border-color:#3a3446;color:#cfc6dc}#wortle .wd-c.s1{background:#c9a227;border-color:#c9a227;color:#1b1400}#wortle .wd-c.s2{background:#2f9e5b;border-color:#2f9e5b;color:#fff}
  #wortle .wd-c.new{animation:wdFlip .45s both}
  @keyframes wdFlip{0%{transform:rotateX(0)}50%{transform:rotateX(90deg)}100%{transform:rotateX(0)}}
  #wortle .wd-kb{display:flex;flex-direction:column;gap:6px;margin:16px auto 0;max-width:520px;user-select:none}
  #wortle .wd-kr{display:flex;gap:5px;justify-content:center}
  #wortle .wd-k{flex:1;max-width:44px;height:52px;border:0;border-radius:8px;background:#4a4160;color:var(--fg);font:700 16px var(--body);text-transform:uppercase;cursor:pointer;padding:0;touch-action:manipulation}
  #wortle .wd-k.wide{max-width:70px;flex:1.5;font-size:13px}
  #wortle .wd-k.s0{background:#2a2533;color:#7d7490}#wortle .wd-k.s1{background:#c9a227;color:#1b1400}#wortle .wd-k.s2{background:#2f9e5b;color:#fff}
  #wortle .wd-end{text-align:center;margin:14px 0 0;display:flex;flex-direction:column;gap:8px;align-items:center}
  #wortle .wd-end b{font-size:18px}
  #wortle .wd-stats{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:16px 0 4px}
  #wortle .wd-stats div{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 12px;text-align:center;min-width:72px}
  #wortle .wd-stats b{display:block;font-size:20px}#wortle .wd-stats small{color:var(--muted);font-size:11.5px}
  #wortle .wd-board{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-top:14px}
  #wortle .wd-board h3{margin:0 0 8px;font-size:16px}
  #wortle .wd-board ol{margin:0;padding-left:24px;display:flex;flex-direction:column;gap:4px}
  #wortle .wd-board li span{color:var(--muted);font-size:13px;margin-left:6px}
  #wortle .wd-board li.me{color:var(--accent);font-weight:700}
  #wortle .wd-help{color:var(--muted);font-size:13px;line-height:1.5}
  .wd-tile .wd-art{font-size:34px}`;

  let page = null, D = null, cur = '', busy = false, lastN = 0, shakeRow = -1;
  const KB = ['qwertzuiop', 'asdfghjkl', '+yxcvbnm-'];
  function keyState() { const st = {}; if (!D) return st; D.g.forEach((g, i) => [...g].forEach((ch, j) => { st[ch] = Math.max(st[ch] ?? -1, +D.r[i][j]); })); return st; }
  const fmtT = ms => { const s = Math.round(ms / 1000); return s < 60 ? s + ' Sek.' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' Min.'; };
  function render() {
    if (!page) return;
    const k = konto();
    if (!k) { page.innerHTML = `<div class="wd-top"><button class="btn ghost small" data-wd="back">‹ Spiele</button><h2>Wörtle</h2></div><p class="wd-help">Jeden Tag ein neues Wort mit 5 Buchstaben – du hast 6 Versuche. Um mitzuspielen und in die Rangliste zu kommen, melde dich oben im Game Hub mit deinem Konto an.</p>`; return; }
    if (!D) { page.innerHTML = `<div class="wd-top"><button class="btn ghost small" data-wd="back">‹ Spiele</button><h2>Wörtle</h2></div><p class="wd-help">Wird geladen …</p>`; return; }
    const ks = keyState(), rows = [];
    for (let i = 0; i < 6; i++) {
      const g = D.g[i], r = D.r[i], live = !D.done && i === D.g.length;
      rows.push(`<div class="wd-row ${i === shakeRow ? 'shake' : ''}">${[0, 1, 2, 3, 4].map(j => {
        if (g) return `<div class="wd-c s${r[j]} ${i >= lastN ? 'new' : ''}" style="animation-delay:${j * 0.12}s">${h(g[j])}</div>`;
        const ch = live ? cur[j] || '' : ''; return `<div class="wd-c ${ch ? 'f' : ''}">${h(ch)}</div>`;
      }).join('')}</div>`);
    }
    lastN = D.g.length; shakeRow = -1;
    const kb = D.done ? '' : `<div class="wd-kb">${KB.map(row => `<div class="wd-kr">${[...row].map(c => c === '+' ? '<button class="wd-k wide" data-wk="enter">Raten</button>' : c === '-' ? '<button class="wd-k wide" data-wk="back">⌫</button>' : `<button class="wd-k ${ks[c] != null ? 's' + ks[c] : ''}" data-wk="${c}">${c}</button>`).join('')}</div>`).join('')}</div>`;
    const end = D.done ? `<div class="wd-end">${D.win ? `<b>🎉 Geschafft in ${D.g.length} von 6 Versuchen!</b><small>Zeit ab dem ersten Versuch: ${fmtT(D.ms)}</small>` : `<b>Leider nicht geschafft.</b><small>Das Wort war <b>${h(String(D.word || '').toUpperCase())}</b>.</small>`}<button class="btn small" data-wd="share">📋 Ergebnis kopieren</button><small class="wd-help">Morgen gibt es ein neues Wort.</small></div>` : '';
    const T = D.top || { today: [], streaks: [] }, me = k.name.toLowerCase();
    page.innerHTML = `<div class="wd-top"><button class="btn ghost small" data-wd="back">‹ Spiele</button><h2>Wörtle Nr. ${D.nr}</h2><button class="btn ghost small" data-wd="help">?</button></div>
      <p class="wd-sub">Errate das Wort des Tages mit 5 Buchstaben. 🟩 richtiger Platz · 🟨 kommt woanders vor · ⬛ kommt nicht vor. Ä = AE, Ö = OE, Ü = UE, ß = SS.</p>
      <div class="wd-grid">${rows.join('')}</div>${kb}${end}
      <div class="wd-stats"><div><b>${D.plays}</b><small>gespielt</small></div><div><b>${D.plays ? Math.round(D.wins / D.plays * 100) : 0} %</b><small>gewonnen</small></div><div><b>🔥 ${D.st}</b><small>Serie</small></div><div><b>${D.best}</b><small>beste Serie</small></div></div>
      <div class="wd-board"><h3>🏆 Rangliste heute</h3>${T.today.length ? `<ol>${T.today.map(x => `<li class="${x.name.toLowerCase() === me ? 'me' : ''}">${h(x.name)}<span>${x.n}/6 · ${fmtT(x.ms)}</span></li>`).join('')}</ol>` : '<p class="wd-help">Heute hat es noch niemand gelöst. Sei die oder der Erste!</p>'}
        <p class="wd-help" style="margin:8px 0 0">${T.played || 0} haben heute mitgeraten, ${T.solved || 0} haben es gelöst. Weniger Versuche zählen zuerst, bei Gleichstand die schnellere Zeit.</p></div>
      ${T.streaks.length ? `<div class="wd-board"><h3>🔥 Längste Serien</h3><ol>${T.streaks.map(x => `<li class="${x.name.toLowerCase() === me ? 'me' : ''}">${h(x.name)}<span>${x.st} Tage am Stück</span></li>`).join('')}</ol></div>` : ''}`;
  }
  async function load() { const r = await call('wd_state'); if (r.error) { if (!r.login) say(r.error); } else { if (!D) lastN = r.g.length; D = r; } render(); }
  async function guess() {
    if (busy || !D || D.done) return;
    if (cur.length < 5) { shakeRow = D.g.length; render(); say('Zu wenige Buchstaben.'); return; }
    busy = true; const r = await call('wd_guess', { w: cur }); busy = false;
    if (r.error) { shakeRow = D.g.length; render(); say(r.error); return; }
    D = r; cur = ''; render();
    if (D.done) setTimeout(() => say(D.win ? '🎉 Richtig!' : 'Das Wort war ' + String(D.word || '').toUpperCase()), 700);
  }
  function key(k) {
    if (!page || page.hidden || !D || D.done) return;
    if (k === 'enter') return guess();
    if (k === 'back') { cur = cur.slice(0, -1); render(); return; }
    if (/^[a-z]$/.test(k) && cur.length < 5) { cur += k; render(); }
  }
  function share() {
    const t = `Wörtle Nr. ${D.nr} ${D.win ? D.g.length : 'X'}/6\n` + D.r.map(r => [...r].map(c => (c === '2' ? '🟩' : c === '1' ? '🟨' : '⬛')).join('')).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => say('Ergebnis kopiert – ohne das Wort zu verraten.'), () => prompt('Zum Kopieren:', t));
  }
  function open() {
    if (!page) {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      page = document.createElement('main'); page.id = 'wortle'; page.hidden = true; document.body.insertBefore(page, q('#picker'));
      page.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.wk) return key(b.dataset.wk);
        if (b.dataset.wd === 'back') return close();
        if (b.dataset.wd === 'share') return share();
        if (b.dataset.wd === 'help') say('Grün: Buchstabe am richtigen Platz. Gelb: kommt im Wort vor, aber woanders. Grau: kommt nicht vor. Jeden Tag um Mitternacht gibt es ein neues Wort.');
      });
    }
    const hub = q('#hub'); if (hub) hub.hidden = true;
    page.hidden = false; scrollTo(0, 0); if (D) lastN = D.g.length; render(); load();
  }
  function close() { if (page) page.hidden = true; const hub = q('#hub'); if (hub) hub.hidden = false; }
  document.addEventListener('keydown', e => {
    if (!page || page.hidden || e.ctrlKey || e.metaKey || e.altKey || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    const k = e.key.toLowerCase(), map = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
    if (k === 'enter') { e.preventDefault(); key('enter'); } else if (k === 'backspace') { e.preventDefault(); key('back'); } else if (map[k]) [...map[k]].forEach(key); else if (/^[a-z]$/.test(k)) key(k);
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-wd-open]')) open(); });
  window.Wortle = { open, isOpen: () => !!(page && !page.hidden) };
})();
