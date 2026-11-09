'use strict';
// Casino im Game Hub – Browser-Seite. Nur Spielgeld: Jetons liegen beim Hub-Konto auf dem Server, es gibt nichts zu kaufen.
// Nutzt Helfer aus app.js: room, rooms, send, act, esc, toast, nick.
(function () {
  const q = s => document.querySelector(s);
  const fmtN = n => Math.floor(n || 0).toLocaleString('de-DE');
  const admN = (n, a) => (a && window.admHTML ? window.admHTML(n, true) : esc(n)); // Admin-Schild
  const short = n => (n >= 1e9 ? (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace('.', ',') + ' Mrd.' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' Mio.' : n >= 1e4 ? Math.round(n / 1e3) + ' Tsd.' : fmtN(n));
  function set(el, html) { if (typeof el === 'string') el = q(el); if (el && el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; } return el; }

  /* ---------- Geldbörse (nur Spielgeld) ---------- */
  const WK = 'casino.jetons', DAY = 'casino.tag', HELP = 'casino.hilfe';
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  // Die Jetons liegen auf dem Server beim Hub-Konto. Im Browser wird nur angezeigt, was der Server sagt.
  let wallet = 0, CZ = null; // CZ: Stand vom Server { w, d, m, bonus, help, own, eq, work, seated }
  const konto = () => { try { const k = JSON.parse(store.get('fsg.konto') || 'null'); return k && k.name && k.token ? k : null; } catch { return null; } };
  async function czCall(action, extra) { const k = konto(); if (!k) return { error: 'Bitte melde dich im Hub an.' }; const r = await czApi(action, { name: k.name, token: k.token, ...(extra || {}) }); if (!r) return { error: 'Keine Verbindung zum Server.' }; if (r.gift > 0) { infoGift += r.gift; infoWhy = r.why || ''; } if (r.w != null) { CZ = r; wallet = r.w; debt = r.d || 0; SH.own = ['konfetti', 'klingeln', 'gruen', '', ...(r.own || [])]; SH.eq = { fx: 'konfetti', sfx: 'klingeln', felt: 'gruen', badge: '', ...(r.eq || {}) }; feltApply(); showWallet(); if (r.gift > 0) { toast(`🎁 ${fmtN(r.gift)} Jetons gutgeschrieben${r.why ? ' – ' + r.why : ''}`); snd('win'); } } return r; }
  let infoGift = 0, infoWhy = ''; // Gutschrift, die im Info-Fenster gezeigt wird
  const INFO_KEY = () => 'fsg.cz.info2.' + ((konto() || {}).name || '').toLowerCase();
  const infoSeen = () => { try { return !!localStorage.getItem(INFO_KEY()); } catch { return false; } };
  function infoHTML() {
    if (infoSeen() && !infoGift) return '';
    const g = infoGift ? `<div class="cz-news-gift">🎁 <b>${fmtN(infoGift)} Jetons</b> zurückgeholt – ${esc(infoWhy)}.</div>` : '';
    return `<div class="cz-news"><div class="cz-news-box"><h3>🎰 Neu im Casino</h3>
      <p><b>Deine Jetons liegen jetzt bei deinem Hub-Konto</b> auf dem Server – nicht mehr auf dem Gerät. Du hast auf jedem Gerät denselben Stand, und er geht nicht mehr verloren.</p>
      <p><b>Neustart:</b> Weil sich viele über neue Konten Millionen erschummelt hatten, haben alle wieder bei 10.000 Jetons angefangen. Auch die Rangliste fängt neu an.</p>
      <p><b>Alte Stände:</b> Wer vor der Umstellung Jetons hatte, bekommt seinen alten Stand einmalig zurück – bis höchstens 50.000. Öffne das Casino dafür auf dem <b>Gerät, auf dem du damals gespielt hast</b>, angemeldet mit deinem Konto. Wer über 1 Million hatte, bekommt nichts zurück.</p>
      ${g}<p class="cz-note">Spielen geht nur noch mit Hub-Konto. Neue Konten haben ein Einsatzlimit, das mit dem Alter des Kontos wächst (1.000 am ersten Tag, ab 7 Tagen unbegrenzt). In der Rangliste erscheinen Konten ab 3 Tagen.</p>
      <button class="cz-btn" data-cz="infook">Alles klar</button></div></div>`;
  }
  function sendKonto() { const k = konto(); if (typeof send === 'function') send(k ? { t: 'konto', name: k.name, token: k.token } : { t: 'konto' }); }
  try { addEventListener('fsg-konto', () => { sendKonto(); CZ = null; if (lobby && !lobby.hidden) { czGift(); renderLobby(); } }); } catch {}
  const showWallet = () => document.querySelectorAll('[data-cz-wallet]').forEach(e => (e.textContent = fmtN(wallet)));
  const setWallet = v => { wallet = Math.max(0, Math.min(1e12, Math.floor(v))); showWallet(); };

  /* ---------- Shop: Gewinn-Effekte, Gewinn-Sounds, Tischfarben und Abzeichen für Jetons ---------- */
  const SHOP_ITEMS = {
    fx: { t: '🎆 Gewinn-Effekte', d: 'Erscheinen bei großen Gewinnen (ab 2.500 Jetons) – je größer der Gewinn, desto mehr.', items: [
      ['konfetti', '🎉', 'Konfetti', 0], ['gold', '🪙', 'Goldregen', 8000], ['feuerwerk', '🎆', 'Feuerwerk', 20000], ['blitz', '⚡', 'Blitzgewitter', 35000], ['diamant', '💎', 'Diamantenregen', 60000], ['regenbogen', '🌈', 'Regenbogen-Explosion', 100000]] },
    sfx: { t: '🎺 Gewinn-Sounds', d: 'Spielen bei großen Gewinnen.', items: [
      ['klingeln', '🔔', 'Klingeln', 0], ['fanfare', '🎺', 'Fanfare', 6000], ['glocken', '🛎️', 'Glockenspiel', 12000], ['jackpot', '🚨', 'Jackpot-Sirene', 25000], ['applaus', '👏', 'Applaus', 40000], ['koenig', '👑', 'Königsfanfare', 80000]] },
    felt: { t: '🟩 Tischfarbe', d: 'Die Farbe des Spieltischs bei dir.', items: [
      ['gruen', '🟩', 'Klassisch Grün', 0], ['blau', '🟦', 'Ozeanblau', 5000], ['rot', '🟥', 'Samtrot', 5000], ['lila', '🟪', 'Königslila', 10000], ['nacht', '⬛', 'Mitternacht', 15000], ['goldf', '🟨', 'Goldener Tisch', 50000]] },
    badge: { t: '🏅 Abzeichen', d: 'Steht in der Rangliste vor deinem Namen – alle sehen es.', items: [
      ['', '➖', 'Keins', 0], ['zylinder', '🎩', 'Zylinder', 5000], ['klee', '🍀', 'Glücksklee', 10000], ['hai', '🦈', 'Kartenhai', 20000], ['feuer', '🔥', 'Glückssträhne', 40000], ['dia', '💎', 'Diamant', 80000], ['krone', '👑', 'Casino-König', 150000]] },
  };
  const FELT = { gruen: ['#0f5a3a', '#083d27'], blau: ['#0f3e6a', '#082440'], rot: ['#6a1420', '#3e0810'], lila: ['#4a1a6a', '#2a0a40'], nacht: ['#1a1a22', '#08080c'], goldf: ['#7a5a14', '#3e2c08'] };
  const BADGE = { zylinder: '🎩', klee: '🍀', hai: '🦈', feuer: '🔥', dia: '💎', krone: '👑' };
  let SH = { own: ['konfetti', 'klingeln', 'gruen', ''], eq: { fx: 'konfetti', sfx: 'klingeln', felt: 'gruen', badge: '' } };

  setTimeout(() => feltApply(), 0);
  function feltApply() { let st = document.getElementById('czFelt'); if (!st) { st = document.createElement('style'); st.id = 'czFelt'; document.head.appendChild(st); } const f = FELT[SH.eq.felt] || FELT.gruen; st.textContent = `.cz{--felt:${f[0]};--felt2:${f[1]}}`; }
  function shopHTML() {
    return `<p class="cz-note">Kaufen geht nur mit Jetons, die dir wirklich gehören – Bankschulden werden abgezogen. Du hast <b>${fmtN(net())}</b>.</p>` + Object.entries(SHOP_ITEMS).map(([cat, C]) => `<div class="cz-sec">${C.t}</div><p class="cz-note">${C.d}</p>
      <div class="cz-shop">${C.items.map(([k, ic, n, pr]) => { const own = SH.own.includes(k) || !pr, on = SH.eq[cat] === k;
        return `<div class="cz-item ${on ? 'on' : ''}"><span class="ic">${ic}</span><b>${n}</b><small>${pr ? fmtN(pr) + ' Jetons' : 'gratis'}</small>
          <div class="row">${on ? '<button class="cz-btn small" disabled>✓ Aktiv</button>' : own ? `<button class="cz-btn small" data-cz-eq="${cat}" data-k="${k}">Benutzen</button>` : `<button class="cz-btn small" data-cz-buy="${cat}" data-k="${k}" ${net() >= pr ? '' : 'disabled'}>Kaufen</button>`}${cat === 'fx' || cat === 'sfx' ? `<button class="cz-btn small dark" data-cz-try="${cat}" data-k="${k}">▶</button>` : ''}</div></div>`; }).join('')}</div>`).join('');
  }
  // Sounds aus dem Browser (keine Dateien nötig)
  function tone(f, t0, dur, type = 'square', vol = 0.07, f2) { const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + t0; o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.05); }
  function noise(t0, dur, vol = 0.12) { const n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2) * (0.5 + 0.5 * Math.random()); const src = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; src.buffer = buf; g.gain.value = vol; src.connect(f); f.connect(g); g.connect(AC.destination); src.start(AC.currentTime + t0); }
  function winSound(k, big) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      const N = [523, 659, 784, 1046, 1318, 1568];
      if (k === 'fanfare') [[0, 523, 0.15], [0.15, 523, 0.1], [0.27, 523, 0.1], [0.4, 784, 0.5]].forEach(([t, f, d]) => { tone(f, t, d, 'sawtooth', 0.05); tone(f * 1.5, t, d, 'square', 0.025); });
      else if (k === 'glocken') N.concat(big ? N.slice().reverse() : []).forEach((f, i) => tone(f * 2, i * 0.09, 0.6, 'sine', 0.08));
      else if (k === 'jackpot') { for (let i = 0; i < (big ? 4 : 2); i++) tone(600, i * 0.45, 0.42, 'sawtooth', 0.04, 1400); N.forEach((f, i) => tone(f * 2, 0.9 + i * 0.07, 0.4, 'triangle', 0.06)); }
      else if (k === 'applaus') { for (let i = 0; i < (big ? 60 : 35); i++) noise(Math.random() * (big ? 2.2 : 1.4), 0.08 + Math.random() * 0.08, 0.1); tone(784, 0, 0.3, 'triangle', 0.04); }
      else if (k === 'koenig') [[0, 392], [0.2, 523], [0.4, 659], [0.6, 784], [0.9, 1046]].forEach(([t, f], i) => { tone(f, t, i === 4 ? 1.1 : 0.25, 'sawtooth', 0.05); tone(f / 2, t, i === 4 ? 1.1 : 0.25, 'square', 0.03); tone(f * 1.25, t, i === 4 ? 1.1 : 0.25, 'triangle', 0.03); });
      else [0, 0.12, 0.24].forEach((t, i) => tone(N[i + 2] * 1.5, t, 0.3, 'square', 0.05));
    } catch {}
  }
  // Effekte auf einer Leinwand über allem
  function winFx(k, power) {
    const cv = document.createElement('canvas'); cv.className = 'cz-fx'; document.body.appendChild(cv);
    const DP = Math.min(2, devicePixelRatio || 1), W = cv.width = innerWidth * DP, H = cv.height = innerHeight * DP, g = cv.getContext('2d');
    const P = [], n = Math.round(90 * power), T0 = performance.now(), LIFE = 2400 + 600 * power;
    const cols = k === 'gold' ? ['#ffd24a', '#ffe58a', '#d9a52c'] : k === 'diamant' ? ['#bff4ff', '#7fe3f5', '#ffffff', '#c8b0ff'] : k === 'blitz' ? ['#fff', '#cfe8ff'] : ['#ff5a7a', '#ffd24a', '#5ad06a', '#5ab4ff', '#c86aff', '#ff9a3a'];
    const burst = (x, y, m, sp) => { for (let i = 0; i < m; i++) { const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * sp; P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, r: (2 + Math.random() * 3) * DP, c: cols[i % cols.length], rot: Math.random() * 6, life: 1 }); } };
    if (k === 'feuerwerk') for (let i = 0; i < 3 + power * 2; i++) setTimeout(() => burst(W * (0.2 + Math.random() * 0.6), H * (0.15 + Math.random() * 0.35), 60, 7 * DP), i * 350);
    else if (k === 'regenbogen') burst(W / 2, H / 2, n * 2, 12 * DP);
    else if (k !== 'blitz') for (let i = 0; i < n; i++) P.push({ x: Math.random() * W, y: -Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 2 * DP, vy: (2 + Math.random() * 3) * DP, r: (k === 'gold' ? 6 : k === 'diamant' ? 5 : 4) * DP * (0.7 + Math.random() * 0.6), c: cols[i % cols.length], rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.3, life: 1 });
    const bolts = [];
    (function frame(now) {
      const tt = now - T0; g.clearRect(0, 0, W, H);
      if (k === 'regenbogen' && tt < 900) { const R = tt / 900 * Math.hypot(W, H) * 0.6; ['#ff3a3a', '#ff9a2a', '#ffe02a', '#3ad06a', '#3a9aff', '#9a5aff'].forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = 0.5 * (1 - tt / 900); g.lineWidth = 14 * DP; g.beginPath(); g.arc(W / 2, H / 2, Math.max(1, R - i * 16 * DP), 0, Math.PI * 2); g.stroke(); }); g.globalAlpha = 1; }
      if (k === 'blitz') { if (Math.random() < 0.12 * power && tt < LIFE - 500) bolts.push({ x: Math.random() * W, t: now, seg: Array.from({ length: 9 }, () => (Math.random() - 0.5) * 80 * DP) }); g.fillStyle = `rgba(200,230,255,${bolts.some(b => now - b.t < 90) ? 0.18 : 0})`; g.fillRect(0, 0, W, H);
        for (const b of bolts) { const a = 1 - (now - b.t) / 400; if (a <= 0) continue; g.strokeStyle = `rgba(255,255,255,${a})`; g.shadowColor = '#9ad8ff'; g.shadowBlur = 20 * DP; g.lineWidth = 4 * DP; g.beginPath(); let x = b.x; g.moveTo(x, 0); b.seg.forEach((d, i) => { x += d; g.lineTo(x, (i + 1) / 9 * H * 0.8); }); g.stroke(); g.shadowBlur = 0; } }
      for (const q of P) { q.x += q.vx; q.y += q.vy; q.vy += (k === 'feuerwerk' || k === 'regenbogen' ? 0.12 : 0.04) * DP; q.vx *= 0.995; q.rot += q.spin || 0.1;
        g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.fillStyle = q.c; g.globalAlpha = Math.max(0, 1 - tt / LIFE);
        if (k === 'gold') { g.beginPath(); g.ellipse(0, 0, q.r, q.r * Math.abs(Math.cos(q.rot)) + 1, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#b8862e'; g.fillRect(-q.r * 0.3, -1, q.r * 0.6, 2); }
        else if (k === 'diamant') { g.beginPath(); g.moveTo(0, -q.r); g.lineTo(q.r * 0.7, 0); g.lineTo(0, q.r); g.lineTo(-q.r * 0.7, 0); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-1, -q.r * 0.6, 2, 2); }
        else g.fillRect(-q.r, -q.r * 0.5, q.r * 2, q.r);
        g.restore(); }
      g.globalAlpha = 1;
      if (tt < LIFE) requestAnimationFrame(frame); else cv.remove();
    })(T0);
  }
  const BIGWIN = 2500;
  function celebrate(won) {
    const power = Math.min(3, 1 + won / 15000);
    winFx(SH.eq.fx || 'konfetti', power); winSound(SH.eq.sfx || 'klingeln', won >= 20000);
    toast(`🎉 Großer Gewinn: +${fmtN(won)} Jetons!`);
  }
  /* ---------- Bank: Kredit aufnehmen und zurückzahlen ---------- */
  const DEBT = 'casino.schuld', DEBT_MAX = 50000, LOANS = [1000, 5000, 10000];
  let debt = 0;
  const net = () => Math.max(0, wallet - debt); // für die Rangliste zählt, was dir wirklich gehört
  /* ---------- Geldrangliste: aus den Hub-Konten auf dem Server ---------- */
  let czBoard = null, czTimer = null;
  async function czApi(action, body) { try { const r = await fetch('/api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.ok ? await r.json() : null; } catch { return null; } }
  function czReport(now) { clearTimeout(czTimer); czTimer = setTimeout(async () => { const k = konto(); const r = await czApi('casino_top', k ? { name: k.name } : {}); if (r) { czBoard = r; renderBoard(); } }, now ? 0 : 3000); }
  let boardTab = 'cur';
  function renderBoard() {
    const el = q('#czBoard'); if (!el) return;
    if (!czBoard) { set(el, '<p class="cz-note">Rangliste wird geladen …</p>'); return; }
    const B = (boardTab === 'ever' ? czBoard.ever : czBoard.cur) || { top: czBoard.top || [], rank: czBoard.rank, players: czBoard.players };
    const top = B.top || [], pod = [top[1], top[0], top[2]], place = [2, 1, 3];
    const podium = top.length ? `<div class="cz-podium">${pod.map((e, i) => e ? `<div class="cz-pod p${place[i]} ${e.me ? 'me' : ''}"><span class="cz-medal">${['🥈', '🥇', '🥉'][i]}</span><b>${e.b && BADGE[e.b] ? BADGE[e.b] + ' ' : ''}${admN(e.n, e.adm)}</b><em>${fmtN(e.c)}</em><div class="cz-step">${place[i]}.</div></div>` : `<div class="cz-pod p${place[i]} empty"><div class="cz-step">${place[i]}.</div></div>`).join('')}</div>` : '<p class="cz-note">Noch niemand auf der Liste.</p>';
    const rest = top.slice(3).map((e, i) => `<div class="cz-rrow ${e.me ? 'me' : ''}"><b>${i + 4}.</b><span>${e.b && BADGE[e.b] ? BADGE[e.b] + ' ' : ''}${admN(e.n, e.adm)}${e.me ? ' (du)' : ''}</span><em>${fmtN(e.c)}</em></div>`).join('');
    const mine = B.rank > top.length ? `<div class="cz-rrow me"><b>${B.rank}.</b><span>Du</span><em>${fmtN(B.mine || net())}</em></div>` : '';
    set(el, `<div class="cz-tabs"><button class="cz-btn small ${boardTab === 'cur' ? '' : 'dark'}" data-cz-bt="cur">💰 Momentan</button><button class="cz-btn small ${boardTab === 'ever' ? '' : 'dark'}" data-cz-bt="ever">👑 Jemals am meisten</button></div>
      <p class="cz-note">${boardTab === 'cur' ? 'Jetons, die du gerade hast – Bankschulden werden abgezogen. Zählt die letzten 30 Tage.' : 'Der höchste Jetonstand, den jemand je hatte (ohne Bankschulden).'}</p>
      ${podium}<div class="cz-rlist">${rest}${mine}</div><p class="cz-note">${B.players || 0} Spieler · jedes Hub-Konto zählt einmal · Konten erscheinen ab 3 Tagen Alter</p>${CZ && CZ.boardFrom ? `<p class="cz-note">🔰 Dein Konto erscheint ab ${new Date(CZ.boardFrom).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr in der Rangliste.</p>` : ''}`);
  }

  /* ---------- Schulden abarbeiten: harte, schlecht bezahlte Arbeit für die Bank ---------- */
  // Der Lohn geht komplett an die Bank (nicht in den Geldbeutel). Absichtlich mühsam: Schulden sollen wehtun.
  const JOBS = {
    mine: { i: '⛏️', n: 'Kohlemine', d: 'Hack Kohle aus dem Fels. Manchmal ist es nur wertloser Stein.', pay: '40 je Sack Kohle' },
    teller: { i: '🍽️', n: 'Tellerwaschen', d: 'Schrubb die Essensreste von den Tellern der Gewinner. Lass bloß keinen fallen!', pay: '30 je Teller' },
    putzen: { i: '🧹', n: 'Casino-Boden schrubben', d: 'Jede Fliese zweimal schrubben, bis sie glänzt.', pay: '45 je Boden' },
  };
  const BOSS = ['Der Aufseher brüllt: „Schneller, Schuldner!“', 'Der Aufseher gähnt und zählt seine Jetons.', '„Wer spielt, muss auch schuften!“', 'Ein Gewinner läuft vorbei und lacht dich aus.', '„Pause? Pausen gibt es für Leute ohne Schulden.“', 'Der Aufseher notiert: „Arbeitet zu langsam.“', '„Noch 100 Säcke, dann reden wir weiter.“'];
  const W = { job: null, hp: 0, max: 0, spots: [], tiles: [], msg: '', last: 0, earned: 0, shift: 0, shake: 0, busy: false };

  function newWork() {
    if (W.job === 'mine') { W.max = W.hp = 6 + Math.floor(Math.random() * 6); }
    if (W.job === 'teller') { W.spots = Array.from({ length: 4 + Math.floor(Math.random() * 4) }, () => ({ x: 22 + Math.random() * 56, y: 22 + Math.random() * 56, ok: 0 })); }
    if (W.job === 'putzen') { W.tiles = Array.from({ length: 16 }, () => (Math.random() < 0.75 ? 2 : 0)); }
  }
  function workHTML() {
    const J = JOBS[W.job];
    if (!J) return '';
    const head = `<div class="cz-work-h"><button class="cz-btn small dark" data-cz-w="stop">← Schicht beenden</button><div><b>${J.i} ${J.n}</b><small>Lohn: ${J.pay} · geht direkt an die Bank</small></div><div class="cz-debtbox"><small>SCHULDEN</small><b>${fmtN(debt)}</b></div></div>
      <div class="cz-boss">${esc(W.msg || BOSS[0])}</div>`;
    let body = '';
    if (!debt) body = '<div class="cz-free">🎉 Schuldenfrei! Der Aufseher lässt dich gehen.</div>';
    else if (W.job === 'mine') body = `<div class="cz-mine"><button class="cz-rock ${W.shake ? 'hit' : ''}" data-cz-w="hack" style="--crack:${(1 - W.hp / W.max).toFixed(2)}"><span>🪨</span><i class="cz-cracks"></i></button><div class="cz-hpbar"><i style="width:${W.hp / W.max * 100}%"></i></div><small class="cz-note">Tippe auf den Fels, bis er zerbricht.</small></div>`;
    else if (W.job === 'teller') body = `<div class="cz-plate"><div class="cz-dish">${W.spots.map((p, k) => p.ok ? '' : `<button class="cz-dirt" data-cz-w="wipe" data-k="${k}" style="left:${p.x}%;top:${p.y}%"></button>`).join('')}</div><small class="cz-note">Tippe alle Flecken weg. Pass auf – manchmal rutscht ein Teller aus der Hand.</small></div>`;
    else if (W.job === 'putzen') body = `<div class="cz-floor">${W.tiles.map((t, k) => `<button class="cz-fl t${t}" data-cz-w="scrub" data-k="${k}"></button>`).join('')}</div><small class="cz-note">Schmutzige Fliesen brauchen zwei Mal Schrubben.</small>`;
    return head + body + `<p class="cz-note">Diese Schicht: ${fmtN(W.shift)} abgearbeitet · insgesamt schon ${fmtN(W.earned)} Jetons Schulden abgearbeitet.</p>`;
  }
  function workTap(b) {
    const now = performance.now(); if (now - W.last < 70) return; W.last = now; // nicht schneller als ein Mensch tippen kann
    const a = b.dataset.czW;
    if (a === 'stop') { W.job = null; W.shift = 0; renderLobby(); return; }
    if (!debt) return;
    let done = false;
    if (W.busy) return;
    if (a === 'hack') { W.hp--; snd('card'); W.shake = 1; setTimeout(() => { W.shake = 0; }, 90); if (W.hp <= 0) done = true; }
    if (a === 'wipe') { const sp = W.spots[+b.dataset.k]; if (sp && !sp.ok) { sp.ok = 1; snd('card'); } if (W.spots.every(q => q.ok)) done = true; }
    if (a === 'scrub') { const k = +b.dataset.k; if (W.tiles[k] > 0) { W.tiles[k]--; snd('card'); } if (W.tiles.every(t => !t)) done = true; }
    if (!done) { renderLobby(); return; }
    W.busy = true; renderLobby();
    czCall('cz_work', { job: W.job }).then(r => {
      W.busy = false;
      if (r.error) W.msg = r.error;
      else { W.shift += r.pay || 0; W.earned = r.work || 0;
        W.msg = { kohle: `⚫ Ein Sack Kohle! ${fmtN(r.pay)} Schulden abgearbeitet.`, stein: '🪨 Nur wertloser Stein. Der Aufseher lacht.', kaputt: '💥 Teller zerbrochen! Die Bank schreibt dir 50 Schulden dazu.', sauber: W.job === 'putzen' ? `🧽 Der Boden glänzt! ${fmtN(r.pay)} Schulden abgearbeitet.` : `✨ Blitzblank! ${fmtN(r.pay)} Schulden abgearbeitet.` }[r.res] || '';
        snd(r.pay ? 'chip' : 'lose'); if (Math.random() < 0.35) W.msg += ' ' + BOSS[Math.floor(Math.random() * BOSS.length)];
        if (!debt) { W.msg = '🎉 Schuldenfrei!'; snd('win'); toast('🎉 Du hast alle Schulden abgearbeitet!'); } }
      newWork(); renderLobby();
    });
  }
  function bankHTML() {
    const room = DEBT_MAX - debt;
    return `<div class="cz-bank"><div class="cz-bankrow"><div><small>DEINE JETONS</small><b>${fmtN(wallet)}</b></div><div><small>SCHULDEN BEI DER BANK</small><b class="${debt ? 'red' : ''}">${fmtN(debt)}</b></div><div><small>DIR GEHÖRT WIRKLICH</small><b>${fmtN(net())}</b></div></div>
      <div class="cz-sec">🏦 Kredit aufnehmen</div>
      <p class="cz-note">Die Bank leiht dir Jetons, so lange du willst – ohne Zinsen. Ab ${fmtN(DEBT_MAX)} Schulden gibt es nichts mehr, bis du etwas zurückzahlst. In der Rangliste zählen nur Jetons, die dir wirklich gehören.</p>
      <div class="cz-toprow" style="justify-content:flex-start">${LOANS.map(n => `<button class="cz-btn small" data-cz-loan="${n}" ${n <= room ? '' : 'disabled'}>+ ${fmtN(n)} leihen</button>`).join('')}${room > 0 && room < LOANS[0] ? `<button class="cz-btn small" data-cz-loan="${room}">+ ${fmtN(room)} leihen</button>` : ''}</div>
      ${room <= 0 ? '<p class="cz-note" style="color:#ff8a7a">Kreditrahmen ausgeschöpft – zahl zuerst etwas zurück.</p>' : `<p class="cz-note">Noch ${fmtN(room)} Kreditrahmen frei.</p>`}
      <div class="cz-sec">💸 Zurückzahlen</div>
      ${debt ? `<div class="cz-sec">⛏️ Schulden abarbeiten</div><p class="cz-note">Kein Geld zum Zurückzahlen? Dann arbeite für die Bank. Der Lohn ist mies und geht komplett an die Bank – aber jede Schicht macht deine Schulden kleiner.</p>
      <div class="cz-shop">${Object.entries(JOBS).map(([k, J]) => `<div class="cz-item"><span class="ic">${J.i}</span><b>${J.n}</b><small>${J.d}</small><small><b>${J.pay}</b></small><div class="row"><button class="cz-btn small dark" data-cz-job="${k}">Schicht beginnen</button></div></div>`).join('')}</div>` : ''}
      ${debt ? `<div class="cz-toprow" style="justify-content:flex-start">${[1000, 5000].filter(n => n < debt).map(n => `<button class="cz-btn small dark" data-cz-pay="${n}" ${wallet >= n ? '' : 'disabled'}>${fmtN(n)} zurück</button>`).join('')}<button class="cz-btn small dark" data-cz-pay="all" ${wallet > 0 ? '' : 'disabled'}>${wallet >= debt ? `Alles zurück (${fmtN(debt)})` : `So viel wie geht (${fmtN(wallet)})`}</button></div>` : '<p class="cz-note">Du hast keine Schulden. 🎉</p>'}
    </div>`;
  }
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- Aussehen ---------- */
  const CSS = `
  .cz{--gold:#e8c46a;--gold2:#b8862e;--felt:#0f5a3a;--felt2:#083d27;--ink:#f6efe0;color:var(--ink);font-family:Figtree,system-ui,sans-serif}
  #czLobby{position:fixed;inset:0;z-index:40;overflow:auto;background:radial-gradient(1200px 600px at 50% -10%,#3a1630 0,#140b16 55%,#09060b 100%);padding:16px 16px 40px}
  #czLobby::before{content:"";position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(115deg,rgba(232,196,106,.035) 0 2px,transparent 2px 22px)}
  .cz-wrap{max-width:1040px;margin:0 auto;position:relative}
  .cz-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
  .cz-logo{font-family:Bungee,Figtree,sans-serif;font-size:clamp(28px,6vw,46px);line-height:1;background:linear-gradient(180deg,#fff2c4,#e8c46a 45%,#9b6b1e);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(0,0,0,.4));letter-spacing:.02em}
  .cz-logo small{display:block;font-family:Figtree,sans-serif;font-size:13px;letter-spacing:.3em;color:#cdb98c;-webkit-text-fill-color:#cdb98c;font-weight:800;margin-top:4px}
  .cz-wallet{margin-left:auto;display:flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border-radius:999px;background:linear-gradient(180deg,#2a1d12,#140d08);border:1px solid rgba(232,196,106,.45);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 6px 18px rgba(0,0,0,.4)}
  .cz-wallet b{font-size:20px;color:#ffe9a8;font-variant-numeric:tabular-nums}
  .cz-wallet small{display:block;font-size:10px;letter-spacing:.15em;color:#b9a27a;font-weight:800}
  .cz-btn{border:0;border-radius:12px;padding:10px 16px;font:inherit;font-weight:800;font-size:15px;cursor:pointer;color:#2a1608;background:linear-gradient(180deg,#ffe7a3,#e8c46a 50%,#c8973e);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 4px 0 #7a5418,0 8px 18px rgba(0,0,0,.35);transition:transform .08s,filter .15s}
  .cz-btn:hover{filter:brightness(1.07)}.cz-btn:active{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 2px 0 #7a5418}
  .cz-btn:disabled{filter:grayscale(.8) brightness(.7);cursor:default;transform:none}
  .cz-btn.dark{color:var(--ink);background:linear-gradient(180deg,#3b2c45,#241a2c);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 4px 0 #120c16,0 8px 18px rgba(0,0,0,.35);border:1px solid rgba(232,196,106,.25)}
  .cz-btn.red{color:#fff;background:linear-gradient(180deg,#ff7a6a,#c8332c);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 0 #6e1410,0 8px 18px rgba(0,0,0,.35)}
  .cz-btn.small{padding:7px 12px;font-size:13px;border-radius:10px}
  .cz-note{font-size:13px;color:#cdbf9f;opacity:.9;margin:0}
  .cz-games{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin:14px 0}
  .cz-game{position:relative;border-radius:18px;padding:14px;overflow:hidden;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(232,196,106,.28);box-shadow:0 14px 30px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:8px}
  .cz-game .art{height:120px;border-radius:12px;display:grid;place-items:center;position:relative;overflow:hidden;background:radial-gradient(120% 100% at 50% 0,#17734b,#0a3d27);box-shadow:inset 0 0 0 2px rgba(232,196,106,.35),inset 0 0 40px rgba(0,0,0,.5)}
  .cz-game h3{margin:2px 0 0;font-family:Bungee,Figtree,sans-serif;font-weight:400;font-size:19px;color:#ffe9a8}
  .cz-game p{margin:0;font-size:13px;color:#d8ccb2;line-height:1.35;flex:1}
  .cz-game .row{display:flex;gap:8px}.cz-game .row .cz-btn{flex:1}
  .cz-tables{display:grid;gap:8px}
  .cz-trow{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
  .cz-trow b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cz-sec{font-family:Bungee,Figtree,sans-serif;font-weight:400;font-size:18px;color:#ffe9a8;margin:18px 0 8px}
  .cz-rlist{display:flex;flex-direction:column;gap:5px;max-width:560px}
  .cz-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:8px}
  .cz-item{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:12px 10px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
  .cz-item.on{border-color:var(--gold);background:rgba(232,196,106,.12)}.cz-item .ic{font-size:34px;line-height:1.1}.cz-item small{color:#cdbf9f}.cz-item .row{display:flex;gap:6px}
  .cz-work-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:12px 0 8px}.cz-work-h>div{display:flex;flex-direction:column}.cz-work-h small{color:#cdbf9f}
  .cz-debtbox{margin-left:auto;background:rgba(255,80,60,.12);border:1px solid rgba(255,120,100,.4);border-radius:12px;padding:6px 12px}.cz-debtbox b{color:#ff8a7a;font-size:22px}
  .cz-boss{background:#2a2016;border-left:4px solid #8a6a3a;border-radius:8px;padding:9px 12px;margin:6px 0 14px;color:#e8d8b8;font-style:italic;max-width:640px}
  .cz-free{font-size:26px;text-align:center;padding:40px 0;color:var(--gold)}
  .cz-mine{display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0;background:radial-gradient(ellipse at center,#2a2420 0%,#120e0c 70%);border-radius:18px}
  .cz-rock{position:relative;border:0;background:none;cursor:pointer;font-size:150px;line-height:1;transition:transform .08s;filter:drop-shadow(0 10px 12px rgba(0,0,0,.6)) grayscale(.4) brightness(calc(1 - var(--crack) * .35))}
  .cz-rock.hit{transform:scale(.93) rotate(-4deg)}.cz-rock:active{transform:scale(.93)}
  .cz-hpbar{width:220px;height:10px;border-radius:6px;background:#3a2a20;overflow:hidden}.cz-hpbar i{display:block;height:100%;background:linear-gradient(90deg,#7a6a5a,#b8a890)}
  .cz-plate{display:flex;flex-direction:column;align-items:center;gap:10px}
  .cz-dish{position:relative;width:min(300px,78vw);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#ffffff 0 52%,#e8eef4 53% 62%,#cfd8e2 63% 100%);box-shadow:0 10px 24px rgba(0,0,0,.5)}
  .cz-dirt{position:absolute;width:44px;height:36px;margin:-18px 0 0 -22px;border:0;border-radius:50% 40% 55% 45%;background:radial-gradient(circle at 40% 40%,#8a5a2a,#5a3a1a);cursor:pointer;opacity:.9}
  .cz-floor{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;width:min(360px,86vw);padding:6px;background:#1a1410;border-radius:10px}
  .cz-news{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:16px}
  .cz-news-box{max-width:460px;width:100%;max-height:90vh;overflow:auto;background:#1d1420;border:2px solid #c9a24a;border-radius:16px;padding:20px 22px;color:#f3e6c4;box-shadow:0 20px 50px rgba(0,0,0,.5)}
  .cz-news-box h3{margin:0 0 10px;color:#ffd977;font-size:22px}.cz-news-box p{margin:0 0 10px;line-height:1.45}
  .cz-news-gift{background:#2f4a22;border:1px solid #6fbf4a;border-radius:10px;padding:10px 12px;margin:4px 0 12px}
  .cz-news-box .cz-btn{width:100%;margin-top:6px}
  .cz-floor .cz-fl{aspect-ratio:1;border:0;border-radius:4px;cursor:pointer;background:linear-gradient(135deg,#e8e0d0,#c8bca8)}
  .cz-floor .cz-fl.t2{background:linear-gradient(135deg,#6a5a3a,#4a3a22)}.cz-floor .cz-fl.t1{background:linear-gradient(135deg,#a8987a,#8a7a5a)}
  .cz-login{max-width:520px;margin:40px auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:26px 20px}.cz-login .ic{font-size:48px}.cz-login h3{margin:0;font-family:Bungee,Figtree,sans-serif;font-weight:400;color:#ffe9a8}.cz-login p{margin:0;color:#d8ccb4}
  .cz-fx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99999}
  .cz-ltabs,.cz-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 6px}
  .cz-podium{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end;max-width:560px;margin:14px 0 12px}
  .cz-pod{display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;min-width:0}
  .cz-pod b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}.cz-pod em{font-style:normal;font-weight:800;color:var(--gold);font-size:14px}
  .cz-medal{font-size:34px;line-height:1}.cz-pod.p1 .cz-medal{font-size:44px}
  .cz-step{width:100%;border-radius:12px 12px 4px 4px;display:grid;place-items:center;font-family:Bungee,Figtree,sans-serif;font-size:22px;color:#2a1608;margin-top:4px}
  .cz-pod.p1 .cz-step{height:110px;background:linear-gradient(180deg,#ffe58a,#d9a52c)}.cz-pod.p2 .cz-step{height:80px;background:linear-gradient(180deg,#eef0f4,#a8adb8)}.cz-pod.p3 .cz-step{height:60px;background:linear-gradient(180deg,#f0b88a,#b0703a)}
  .cz-pod.empty .cz-step{opacity:.35}.cz-pod.me b{color:var(--gold)}
  .cz-bank{max-width:640px}.cz-bankrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
  .cz-bankrow>div{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
  .cz-bankrow small{font-size:11px;letter-spacing:.5px;color:#cdbf9f}.cz-bankrow b{font-size:20px;color:var(--gold)}.cz-bankrow b.red{color:#ff8a7a}
  @media (max-width:520px){.cz-bankrow{grid-template-columns:1fr}}
  .cz-rrow{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:11px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
  .cz-rrow b{width:34px;font-size:16px}.cz-rrow span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cz-rrow em{font-style:normal;font-weight:800;color:var(--gold)}
  .cz-rrow.me{background:rgba(232,196,106,.16);border-color:rgba(232,196,106,.5)}
  .cz-nick{display:flex;gap:8px;align-items:center;margin:8px 0}.cz-nick input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(232,196,106,.35);background:#1a1218;color:#fff;font:inherit;font-size:16px}
  /* Jetons */
  .cz-chip{--c:#c8332c;position:relative;display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;font-weight:900;font-size:12px;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.6);cursor:pointer;border:0;padding:0;
    background:radial-gradient(circle at 50% 50%,var(--c) 0 52%,#fff 52% 56%,var(--c) 56% 100%);box-shadow:inset 0 0 0 3px rgba(255,255,255,.0),0 3px 0 rgba(0,0,0,.45),0 6px 10px rgba(0,0,0,.35)}
  .cz-chip::before{content:"";position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(#fff 0 12deg,transparent 12deg 45deg);-webkit-mask:radial-gradient(circle,transparent 66%,#000 67% 86%,transparent 87%);mask:radial-gradient(circle,transparent 66%,#000 67% 86%,transparent 87%);opacity:.9}
  .cz-chip span{position:relative}
  .cz-chip.sel{transform:translateY(-6px);box-shadow:0 0 0 3px #ffe9a8,0 9px 0 rgba(0,0,0,.45),0 12px 16px rgba(0,0,0,.35)}
  .cz-chip.mini{width:26px;height:26px;font-size:8px;cursor:default}
  .cz-chips{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center}
  /* Karten */
  .cz-card{--w:58px;position:relative;width:var(--w);height:calc(var(--w)*1.42);border-radius:calc(var(--w)*.1);background:linear-gradient(160deg,#fff,#f1ece2);color:#1b1b22;box-shadow:0 4px 10px rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,0,0,.08);display:inline-block;font-weight:900;flex:none}
  .cz-card.r{color:#c8202c}
  .cz-card .tl,.cz-card .br{position:absolute;font-size:calc(var(--w)*.24);line-height:.95;text-align:center}
  .cz-card .tl{left:5%;top:4%}.cz-card .br{right:5%;bottom:4%;transform:rotate(180deg)}
  .cz-card .mid{position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--w)*.62)}
  .cz-card.back{background:linear-gradient(135deg,#7d1626,#4b0b16);box-shadow:0 4px 10px rgba(0,0,0,.45),inset 0 0 0 3px #f1e3c0,inset 0 0 0 5px #7d1626}
  .cz-card.back::after{content:"";position:absolute;inset:7px;border-radius:5px;background:repeating-linear-gradient(45deg,rgba(232,196,106,.55) 0 2px,transparent 2px 7px),repeating-linear-gradient(-45deg,rgba(232,196,106,.55) 0 2px,transparent 2px 7px)}
  .cz-card.new{animation:czDeal .45s cubic-bezier(.2,.8,.2,1) both}
  @keyframes czDeal{from{transform:translate(0,-160px) rotate(-25deg);opacity:0}to{transform:none;opacity:1}}
  .cz-cards{display:flex;gap:6px;justify-content:center;min-height:calc(58px*1.42)}
  .cz-cards.over .cz-card+.cz-card{margin-left:-30px}
  /* Tisch */
  #stage[data-mode^="cz"]{padding:0;max-width:none;align-items:stretch;justify-content:flex-start}
  .cz-room{width:100%;box-sizing:border-box;border-radius:18px}
  .cz-room{position:relative;min-height:calc(100vh - 70px);padding:10px 10px 16px;background:radial-gradient(1000px 500px at 50% 0,#2c1424,#100a12 70%)}
  .cz-felt{position:relative;margin:0 auto;max-width:1000px;border-radius:200px 200px 28px 28px/120px 120px 28px 28px;padding:22px 16px 18px;background:radial-gradient(120% 90% at 50% 30%,#1a8a58 0,var(--felt) 45%,var(--felt2) 100%);box-shadow:0 0 0 10px #3a2212,0 0 0 12px #c8973e,0 0 0 16px #2a170b,0 30px 60px rgba(0,0,0,.6),inset 0 0 80px rgba(0,0,0,.45)}
  .cz-felt::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:repeating-radial-gradient(circle at 30% 20%,rgba(255,255,255,.018) 0 1px,transparent 1px 3px)}
  .cz-felt .stamp{text-align:center;font-family:Bungee,Figtree,sans-serif;color:rgba(255,233,168,.32);font-size:clamp(14px,3vw,22px);letter-spacing:.08em;margin:6px 0;pointer-events:none}
  .cz-bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center;margin-top:12px}
  .cz-status{text-align:center;font-weight:800;color:#ffe9a8;min-height:22px;margin:8px 0;text-shadow:0 2px 4px rgba(0,0,0,.5)}
  .cz-timer{display:inline-block;min-width:34px;padding:2px 8px;border-radius:999px;background:rgba(0,0,0,.35);color:#fff;font-variant-numeric:tabular-nums;margin-left:6px}
  .cz-info{display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:center;max-width:1000px;margin:0 auto 14px}
  .cz-log{max-width:1000px;margin:14px auto 0;font-size:13px;color:#cdbf9f;display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center}
  .cz-log span:first-child{color:#ffe9a8;font-weight:800}
  .cz-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:900;background:rgba(0,0,0,.45);color:#fff;border:1px solid rgba(255,255,255,.15)}
  .cz-badge.win{background:linear-gradient(180deg,#ffe7a3,#c8973e);color:#2a1608}.cz-badge.lose{background:rgba(200,40,40,.6)}.cz-badge.push{background:rgba(120,120,140,.6)}
  .cz-seats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:16px}
  .cz-seat{position:relative;border-radius:16px;padding:8px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08);text-align:center;min-height:120px}
  .cz-seat.me{border-color:rgba(232,196,106,.7);box-shadow:0 0 0 2px rgba(232,196,106,.25),inset 0 0 30px rgba(232,196,106,.08)}
  .cz-seat.turn{box-shadow:0 0 0 3px #ffe9a8,0 0 24px rgba(255,233,168,.5)}
  .cz-seat .nm{font-weight:800;font-size:13px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cz-seat .nm i{font-style:normal;opacity:.6;font-size:11px}
  .cz-seat.empty{opacity:.35;display:grid;place-items:center;font-size:12px}
  .cz-seat .cz-card{--w:44px}
  .cz-val{display:inline-block;margin-top:4px;padding:1px 8px;border-radius:8px;background:rgba(0,0,0,.5);font-weight:900;font-size:13px}
  .cz-dealer{text-align:center}
  .cz-dealer .lbl{font-size:12px;letter-spacing:.2em;color:#ffe9a8;opacity:.8;font-weight:800;margin-bottom:6px}
  /* Roulette */
  .cz-rl{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:16px;align-items:center}
  @media (max-width:760px){.cz-rl{grid-template-columns:1fr}}
  .cz-wheel{position:relative;width:100%;max-width:320px;aspect-ratio:1;margin:0 auto}
  .cz-wheel canvas{width:100%;height:100%;display:block}
  .cz-hist{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin-top:8px}
  .cz-hist span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:900;color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.2)}
  .n-r{background:#c8202c}.n-b{background:#1b1b22}.n-g{background:#0c8a4a}
  .cz-board{display:grid;grid-template-columns:42px repeat(12,1fr) 42px;gap:3px;user-select:none}
  .cz-board button{position:relative;min-height:38px;border:1px solid rgba(255,255,255,.35);border-radius:6px;color:#fff;font:inherit;font-weight:900;font-size:14px;cursor:pointer;padding:0;background:transparent;transition:filter .1s}
  .cz-board button:hover{filter:brightness(1.25)}
  .cz-board .z{grid-row:span 3;background:#0c8a4a}
  .cz-board .r{background:linear-gradient(180deg,#d8323e,#a81822)}.cz-board .b{background:linear-gradient(180deg,#2a2a33,#121218)}
  .cz-board .o{background:rgba(0,0,0,.25);font-size:12px}
  .cz-board .win{box-shadow:0 0 0 3px #ffe9a8,0 0 18px #ffe9a8;z-index:2}
  .cz-board .stk{position:absolute;right:-4px;top:-6px;z-index:3;pointer-events:none}
  .cz-board .oth{position:absolute;left:2px;bottom:1px;font-size:9px;opacity:.75}
  @media (max-width:560px){.cz-board{grid-template-columns:28px repeat(12,1fr) 30px;gap:2px}.cz-board button{min-height:32px;font-size:11px}}
  /* Pferderennen */
  .cz-track{position:relative;width:100%;aspect-ratio:2.4;border-radius:14px;overflow:hidden;box-shadow:inset 0 0 0 3px rgba(232,196,106,.35)}
  .cz-track canvas{width:100%;height:100%;display:block}
  .cz-horses{display:grid;gap:6px;margin-top:12px}
  .cz-horse{display:grid;grid-template-columns:22px 1fr auto auto auto;gap:8px;align-items:center;padding:6px 8px;border-radius:12px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08)}
  .cz-horse .sw{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.4)}
  .cz-horse b{font-size:14px}.cz-horse .od{font-weight:900;color:#ffe9a8;font-variant-numeric:tabular-nums}
  .cz-horse.place1{border-color:#ffe9a8;box-shadow:0 0 0 2px rgba(255,233,168,.4)}
  /* Spielautomat */
  .cz-rad{max-width:640px;margin:0 auto;border-radius:26px;padding:16px;background:linear-gradient(180deg,#1a3a5a,#0a1a2c);box-shadow:0 0 0 4px #c8973e,0 0 0 8px #3a2212,0 20px 50px rgba(0,0,0,.6)}
  .cz-rad .top{text-align:center;font-family:Bungee,Figtree,sans-serif;font-size:clamp(20px,5vw,30px);color:#ffe9a8;text-shadow:0 0 18px rgba(255,200,80,.6);margin-bottom:10px}
  .cz-radw{position:relative;width:min(440px,82vw);aspect-ratio:1;margin:0 auto}.cz-radcv{width:100%;height:100%;display:block}
  .cz-radptr{position:absolute;left:50%;top:-14px;transform:translateX(-50%);font-size:36px;color:#ffe9a8;text-shadow:0 2px 0 #7a4a12,0 0 10px rgba(255,200,80,.8);line-height:1}
  @keyframes czSpinArt{to{transform:rotate(360deg)}}
  .cz-slot{max-width:640px;margin:0 auto;border-radius:26px;padding:16px;background:linear-gradient(180deg,#5b1020,#2c0710);box-shadow:0 0 0 4px #c8973e,0 0 0 8px #3a2212,0 20px 50px rgba(0,0,0,.6),inset 0 2px 0 rgba(255,255,255,.15)}
  .cz-slot .top{text-align:center;font-family:Bungee,Figtree,sans-serif;font-size:clamp(20px,5vw,30px);color:#ffe9a8;text-shadow:0 0 18px rgba(255,200,80,.6);margin-bottom:10px}
  .cz-reels{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:10px;border-radius:16px;background:linear-gradient(180deg,#120609,#2a0d14);box-shadow:inset 0 6px 18px rgba(0,0,0,.8)}
  .cz-reel{position:relative;height:calc(3 * var(--cell));overflow:hidden;border-radius:10px;background:linear-gradient(180deg,#d9d2c4,#fffaf0 30%,#fffaf0 70%,#d9d2c4);--cell:clamp(52px,13vw,92px)}
  .cz-strip{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column}
  .cz-sym{height:var(--cell);display:grid;place-items:center;font-size:calc(var(--cell)*.58)}
  .cz-sym.sieben{font-family:Bungee,Figtree,sans-serif;font-size:calc(var(--cell)*.62);color:#d1162a;text-shadow:0 2px 0 #7a0a12,0 0 10px rgba(255,80,80,.4)}
  .cz-sym.hit{animation:czPulse .7s ease-in-out infinite alternate;background:radial-gradient(circle,rgba(255,220,100,.55),transparent 70%)}
  @keyframes czPulse{to{transform:scale(1.12)}}
  .cz-lines{position:absolute;inset:10px;pointer-events:none}
  .cz-win{text-align:center;font-family:Bungee,Figtree,sans-serif;font-size:26px;color:#ffe9a8;min-height:36px;margin-top:10px;text-shadow:0 0 16px rgba(255,200,80,.7)}
  .cz-win.big{animation:czBig 1s ease-in-out infinite alternate}@keyframes czBig{to{transform:scale(1.15);color:#fff}}
  .cz-paytable{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px;font-size:12px}
  .cz-paytable div{background:rgba(0,0,0,.3);border-radius:8px;padding:4px;text-align:center}
  /* Poker */
  .cz-pk{position:relative;max-width:1000px;margin:0 auto;aspect-ratio:1.9;min-height:420px}
  .cz-pk .oval{position:absolute;inset:10% 8%;border-radius:999px;background:radial-gradient(120% 90% at 50% 30%,#1a8a58 0,var(--felt) 45%,var(--felt2) 100%);box-shadow:0 0 0 10px #3a2212,0 0 0 12px #c8973e,0 0 0 16px #2a170b,0 30px 60px rgba(0,0,0,.6),inset 0 0 80px rgba(0,0,0,.45)}
  .cz-pk .center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center}
  .cz-pk .pot{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:rgba(0,0,0,.45);font-weight:900;color:#ffe9a8;margin-top:8px}
  .cz-pseat{position:absolute;width:150px;transform:translate(-50%,-50%);text-align:center}
  .cz-pseat .box{padding:6px 8px;border-radius:14px;background:linear-gradient(180deg,rgba(30,20,30,.92),rgba(14,10,16,.92));border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 18px rgba(0,0,0,.5)}
  .cz-pseat.me .box{border-color:rgba(232,196,106,.8)}.cz-pseat.turn .box{box-shadow:0 0 0 3px #ffe9a8,0 0 24px rgba(255,233,168,.6)}
  .cz-pseat.fold{opacity:.45}
  .cz-pseat .cz-card{--w:40px}.cz-pseat.me .cz-card{--w:56px}
  .cz-pseat .stk{font-size:13px;color:#ffe9a8;font-weight:800}
  .cz-pseat .bet{position:absolute;left:50%;transform:translateX(-50%);padding:2px 8px;border-radius:999px;background:rgba(0,0,0,.6);font-size:12px;font-weight:900;white-space:nowrap}
  .cz-dbtn{position:absolute;width:22px;height:22px;border-radius:50%;background:#fff;color:#111;font-size:11px;font-weight:900;display:grid;place-items:center;box-shadow:0 2px 4px rgba(0,0,0,.5)}
  .cz-raise{display:flex;align-items:center;gap:8px}.cz-raise input{width:160px}
  @media (max-width:640px){.cz-pk{aspect-ratio:.85;min-height:520px}.cz-pk .oval{inset:16% 4%}.cz-pseat{width:112px}.cz-pseat .cz-card{--w:30px}.cz-pseat.me .cz-card{--w:46px}.cz-card{--w:44px}.cz-cards{min-height:calc(44px*1.42)}}
  .cz-toprow{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
  .cz-ghost{opacity:.6;font-size:12px}
  `;
  function css() { if (!q('#czCss')) { const s = document.createElement('style'); s.id = 'czCss'; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------- Bausteine ---------- */
  const CHIP_VAL = [10, 50, 100, 500, 1000, 5000, 25000, 100000];
  const CHIP_COL = { 10: '#2f6fd6', 50: '#c8332c', 100: '#1d8a4c', 500: '#6a35b8', 1000: '#151518', 5000: '#d4882a', 25000: '#c2185b', 100000: '#00838f' };
  const chipLabel = v => (v >= 1000 ? v / 1000 + 'K' : String(v));
  const chipHTML = (v, cls = '', attrs = '') => `<button class="cz-chip ${cls}" style="--c:${CHIP_COL[v] || '#555'}" ${attrs}><span>${chipLabel(v)}</span></button>`;
  const stackHTML = n => { if (!n) return ''; const v = [...CHIP_VAL].reverse().find(x => x <= n) || 10; return `<span class="cz-chip mini" style="--c:${CHIP_COL[v]}" title="${fmtN(n)}"><span>${short(n)}</span></span>`; };
  let chipSel = Number(store.get('casino.chip')) || 100;
  function chipBar(maxV) {
    const vals = CHIP_VAL.filter(v => v <= Math.max(100, maxV));
    if (!vals.includes(chipSel)) chipSel = vals[Math.min(vals.length - 1, 2)];
    return `<div class="cz-chips">${vals.map(v => chipHTML(v, v === chipSel ? 'sel' : '', `data-cz-chip="${v}" aria-label="Jeton ${v}"`)).join('')}</div>`;
  }
  const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' }, RANK = r => (r === 'T' ? '10' : r);
  const prevCards = {};
  function cardsHTML(list, key, over) {
    const prev = prevCards[key] || 0; prevCards[key] = list.length;
    return `<div class="cz-cards ${over ? 'over' : ''}">${list.map((c, i) => {
      const nw = i >= prev ? ' new' : '', st = `style="animation-delay:${(i - prev) * 0.12}s"`;
      if (c === '??') return `<span class="cz-card back${nw}" ${st}></span>`;
      const r = RANK(c[0]), s = SUIT[c[1]], red = c[1] === 'h' || c[1] === 'd';
      return `<span class="cz-card ${red ? 'r' : ''}${nw}" ${st}><span class="tl">${r}<br>${s}</span><span class="mid">${s}</span><span class="br">${r}<br>${s}</span></span>`;
    }).join('')}</div>`;
  }
  // kurzer Klang aus dem Gerät, keine Dateien
  let AC = null;
  function snd(kind) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
      const P = { chip: [1800, 2600, 0.05, 'triangle', 0.08], card: [500, 300, 0.06, 'triangle', 0.06], win: [523, 1046, 0.35, 'square', 0.06], tick: [1200, 1100, 0.02, 'square', 0.03], lose: [300, 160, 0.3, 'sawtooth', 0.04] }[kind] || [800, 800, 0.05, 'sine', 0.05];
      o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]); g.gain.setValueAtTime(P[4], t); g.gain.exponentialRampToValueAtTime(0.0008, t + P[2] + 0.05);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + P[2] + 0.06);
    } catch {}
  }

  /* ================= Lobby ================= */
  const GAMES = [
    { kind: 'blackjack', title: 'Blackjack', text: 'Schlag die Bank mit 21. Karte ziehen, bleiben, verdoppeln, teilen. Blackjack zahlt 3 : 2.', art: () => `<div style="display:flex;gap:6px;transform:rotate(-6deg)">${cardsHTML(['As', 'Kh'], 'art1')}</div>` },
    { kind: 'roulette', title: 'Roulette', text: 'Europäisches Roulette mit einer Null. Setz auf Zahlen, Farben, Dutzende und Kolonnen.', art: () => `<canvas width="220" height="220" data-cz-artwheel style="width:110px;height:110px"></canvas>` },
    { kind: 'poker', title: "Texas Hold'em", text: 'Poker mit zwei eigenen und fünf gemeinsamen Karten. Bluffen, erhöhen, all-in gehen.', art: () => `<div style="display:flex;align-items:center;gap:10px">${cardsHTML(['Ad', 'Ac'], 'art2', true)}<div>${chipHTML(500, '', 'tabindex="-1"')}${chipHTML(100, '', 'tabindex="-1"')}</div></div>` },
    { kind: 'rennen', title: 'Pferderennen', text: 'Sechs Pferde, jede Runde neue Quoten. Wette auf Sieg oder Platz und fiebere mit.', art: () => `<div style="font-size:54px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))">🏇</div>` },
    { kind: 'rad', title: 'Glücksrad', text: 'Dreh das Rad! Jedes Feld multipliziert deinen Einsatz – von ×0,1 bis ×10. Je breiter das Feld, desto öfter bleibt es stehen.', art: () => `<div style="font-size:52px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5));animation:czSpinArt 6s linear infinite">🎡</div>` },
    { kind: 'slots', title: 'Spielautomat', text: '5 Walzen, 10 Gewinnlinien, Joker ersetzen alles. Drei Siebener bringen das große Glück.', art: () => `<div style="font-family:Bungee,sans-serif;font-size:40px;color:#ffe9a8;text-shadow:0 0 16px rgba(255,200,80,.7)">7 7 7</div>` },
  ];
  let lobby = null;
  // Gutschriften (z. B. Ersatz nach einem Fehler) für das angemeldete Hub-Konto einmalig abholen
  let claimTried = '';
  async function czGift() {
    await czCall('cz_state');
    const k = konto(), dev = store.get('fsg.key');
    if (k && dev && claimTried !== k.name) { // alten Stand dieses Geräts einmal abfragen
      claimTried = k.name; const r = await czCall('cz_claim', { dev });
      if (r && r.claimNo && typeof toast === 'function') toast(r.claimNo);
    }
    if (lobby && !lobby.hidden) renderLobby();
  }
  function openLobby() {
    css(); sendKonto(); czGift();
    if (!lobby) { lobby = document.createElement('div'); lobby.id = 'czLobby'; lobby.className = 'cz'; document.body.appendChild(lobby); lobby.addEventListener('click', onLobby); }
    lobby.hidden = false; const hub = q('#hub'); if (hub) hub.hidden = true; renderLobby();
  }
  function closeLobby() { if (lobby) lobby.hidden = true; const hub = q('#hub'); if (hub && !room) hub.hidden = false; }
  let lobbyTab = 'games';
  function renderLobby() {
    if (!lobby || lobby.hidden) return;
    if (!konto() || !CZ) { // Casino nur mit Hub-Konto: die Jetons liegen auf dem Server
      lobby.innerHTML = `<div class="cz-wrap"><div class="cz-head"><button class="cz-btn dark small" data-cz="back">‹ Hub</button><div class="cz-logo">Casino Aurum<small>NUR SPIELGELD · KEIN ECHTES GELD</small></div></div>
        <div class="cz-login">${konto() ? '<p>Dein Casino-Konto wird geladen …</p>' : `<span class="ic">🔐</span><h3>Im Casino spielst du mit deinem Konto</h3><p>Deine Jetons liegen sicher auf dem Server bei deinem Hub-Konto – auf jedem Gerät derselbe Stand. Jedes Konto startet einmal mit ${fmtN(10000)} Jetons.</p><p>Melde dich dafür im Hub unter „👤 Anmelden oder Konto anlegen“ an.</p><button class="cz-btn" data-cz="back">Zum Hub</button>`}</div></div>`;
      return;
    }
    const bonus = !!(CZ && CZ.bonus), helpOk = !!(CZ && CZ.help);
    const open = (typeof rooms !== 'undefined' ? rooms : []).filter(r => r.game === 'casino');
    lobby.innerHTML = `<div class="cz-wrap">
      <div class="cz-head"><button class="cz-btn dark small" data-cz="back">‹ Hub</button>
        <div class="cz-logo">Casino Aurum<small>NUR SPIELGELD · KEIN ECHTES GELD</small></div>
        <div class="cz-wallet">${chipHTML(1000, '', 'tabindex="-1"')}<div><small>DEINE JETONS</small><b data-cz-wallet>${fmtN(wallet)}</b></div></div></div>
      <div class="cz-ltabs">${[...(W.job ? [['work', '⛏️ Schicht']] : []), ['games', '🎰 Spiele'], ['shop', '🛍️ Shop'], ['bank', '🏦 Bank' + (debt ? ' · ' + short(debt) : '')], ['board', '🏆 Rangliste']].map(([k, t]) => `<button class="cz-btn small ${lobbyTab === k ? '' : 'dark'}" data-cz-tab="${k}">${t}</button>`).join('')}</div>
      ${lobbyTab === 'work' ? workHTML() : lobbyTab === 'shop' ? shopHTML() : lobbyTab === 'bank' ? bankHTML() : lobbyTab === 'board' ? '<div class="cz-sec">🏆 Rangliste</div><div id="czBoard"></div>' : `<div class="cz-toprow" style="justify-content:flex-start">
        ${CZ && CZ.lim ? `<span class="cz-note cz-lim">🔰 Neues Konto: Höchsteinsatz <b>${fmtN(CZ.lim)}</b> pro Runde${CZ.limNext ? ` · ab ${new Date(CZ.limNext).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr ${CZ.limNextN ? fmtN(CZ.limNextN) : 'unbegrenzt'}` : ''} – ab 7 Tagen unbegrenzt.</span>` : ''}
        ${bonus ? '<button class="cz-btn small" data-cz="bonus">🎁 Tagesbonus: 2.000 Jetons</button>' : '<span class="cz-note">Tagesbonus abgeholt – morgen gibt es neuen.</span>'}
        ${helpOk ? '<button class="cz-btn small dark" data-cz="help">Pleite? 1.000 Jetons Starthilfe</button>' : ''}
      </div>
      ${nick() ? '' : '<div class="cz-nick"><input id="czNick" maxlength="16" placeholder="Dein Name am Tisch"><button class="cz-btn small" data-cz="nick">Speichern</button></div>'}
      <div class="cz-games">${GAMES.map(g => `<div class="cz-game"><div class="art">${g.art()}</div><h3>${g.title}</h3><p>${g.text}</p>
        <div class="row"><button class="cz-btn small" data-cz-open="${g.kind}">Tisch eröffnen</button><button class="cz-btn small dark" data-cz-solo="${g.kind}">Allein mit Bots</button></div></div>`).join('')}</div>
      <div class="cz-sec">Offene Tische</div>
      <div class="cz-tables">${open.length ? open.map(r => `<div class="cz-trow"><b>${esc(r.name)}</b><span class="cz-note">${r.players.length} ${r.players.length === 1 ? 'Spieler' : 'Spieler'}</span><button class="cz-btn small" data-cz-join="${r.id}">Hinsetzen</button></div>`).join('') : '<p class="cz-note">Gerade ist kein Tisch offen. Eröffne einen – deine Freunde sehen ihn dann hier und in der Runden-Liste.</p>'}</div>`}
      <p class="cz-note" style="margin-top:22px">Hier wird nur mit Spieljetons gespielt. Sie haben keinen Geldwert, lassen sich weder kaufen noch auszahlen und liegen bei deinem Hub-Konto.</p>
    </div>${infoHTML()}`;
    const cvw = lobby.querySelector('[data-cz-artwheel]'); if (cvw) drawWheel(cvw, 0.4, null);
    renderBoard(); if (!renderLobby.asked || Date.now() - renderLobby.asked > 20000) { renderLobby.asked = Date.now(); czReport(true); }
  }
  function needName() {
    const inp = q('#czNick'); if (inp && inp.value.trim()) { q('#nick').value = inp.value.trim(); q('#nick').dispatchEvent(new Event('change')); }
    if (!nick()) { toast('Gib zuerst deinen Namen ein.'); const i = q('#czNick'); if (i) i.focus(); return false; }
    try { localStorage.setItem('fsg.nick', nick()); } catch {} send({ t: 'name', name: nick() }); return true;
  }
  function onLobby(e) {
    const by = e.target.closest('[data-cz-buy]'); if (by) { const cat = by.dataset.czBuy, k = by.dataset.k, it = SHOP_ITEMS[cat].items.find(x => x[0] === k); czCall('cz_buy', { cat, k }).then(r => { if (r.error) toast(r.error); else { snd('win'); toast(`🛍️ ${it ? it[2] : k} gekauft und aktiviert!`); if (cat === 'fx') winFx(k, 1.5); if (cat === 'sfx') winSound(k, false); } renderLobby(); }); return; }
    const eqb = e.target.closest('[data-cz-eq]'); if (eqb) { czCall('cz_eq', { cat: eqb.dataset.czEq, k: eqb.dataset.k }).then(r => { if (r.error) toast(r.error); renderLobby(); }); return; }
    const tr = e.target.closest('[data-cz-try]'); if (tr) { if (tr.dataset.czTry === 'fx') winFx(tr.dataset.k, 1.5); else winSound(tr.dataset.k, true); return; }
    const jb = e.target.closest('[data-cz-job]'); if (jb) { W.job = jb.dataset.czJob; W.shift = 0; W.msg = BOSS[Math.floor(Math.random() * BOSS.length)]; newWork(); lobbyTab = 'work'; renderLobby(); return; }
    const wk = e.target.closest('[data-cz-w]'); if (wk) { workTap(wk); if (!W.job) { lobbyTab = 'bank'; renderLobby(); } return; }
    const tb = e.target.closest('[data-cz-tab]'); if (tb) { lobbyTab = tb.dataset.czTab; renderLobby(); if (lobbyTab === 'board') czReport(true); return; }
    const bt = e.target.closest('[data-cz-bt]'); if (bt) { boardTab = bt.dataset.czBt; renderBoard(); return; }
    const ln = e.target.closest('[data-cz-loan]'); if (ln) { czCall('cz_loan', { n: +ln.dataset.czLoan }).then(r => { if (r.error) toast(r.error); else { snd('chip'); toast(`🏦 Geliehen – Schulden jetzt ${fmtN(debt)}`); } renderLobby(); }); return; }
    const py = e.target.closest('[data-cz-pay]'); if (py) { const n = py.dataset.czPay === 'all' ? Math.min(wallet, debt) : +py.dataset.czPay; czCall('cz_pay', { n }).then(r => { if (r.error) toast(r.error); else { snd('chip'); toast(debt ? `💸 Zurückgezahlt – noch ${fmtN(debt)} Schulden` : '🎉 Alle Schulden bezahlt!'); } renderLobby(); }); return; }
    const b = e.target.closest('[data-cz],[data-cz-open],[data-cz-solo],[data-cz-join]'); if (!b) return;
    if (b.dataset.cz === 'back') { closeLobby(); return; }
    if (b.dataset.cz === 'infook') { try { localStorage.setItem(INFO_KEY(), '1'); } catch {} infoGift = 0; const x = lobby.querySelector(".cz-news"); if (x) x.remove(); return; }
    if (b.dataset.cz === 'bonus') { czCall('cz_bonus').then(r => { if (r.error) toast(r.error); else { snd('win'); toast('2.000 Jetons gutgeschrieben – viel Glück!'); } renderLobby(); }); return; }
    if (b.dataset.cz === 'help') { czCall('cz_help').then(r => { if (r.error) toast(r.error); else snd('chip'); renderLobby(); }); return; }
    if (b.dataset.cz === 'nick') { needName(); renderLobby(); return; }
    if (!needName()) return;
    if (b.dataset.czOpen || b.dataset.czSolo) { const kind = b.dataset.czOpen || b.dataset.czSolo; send({ t: 'create', game: 'casino', kind, priv: !!b.dataset.czSolo }); closeLobby(); return; }
    if (b.dataset.czJoin) { send({ t: 'join', room: b.dataset.czJoin }); closeLobby(); }
  }

  /* ================= Tisch ================= */
  let V = null, sitAsked = null, deadline = 0, lastKind = null, lastVW = null, vwRoom = null;
  function timerHTML() { return `<span class="cz-timer" data-cz-cd></span>`; }
  setInterval(() => { const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); document.querySelectorAll('[data-cz-cd]').forEach(e => (e.textContent = deadline ? s + ' s' : '')); }, 250);
  function render(st, v) {
    css(); V = v; if (!v) return;
    deadline = v.left != null ? Date.now() + v.left : 0;
    // Jetons vom Tisch nur übernehmen, wenn sie sich dort wirklich geändert haben. Ein alter Platz (z. B. aus einem anderen Tab)
    // darf den Stand auf dem Gerät nicht überschreiben – dann bringt das Gerät seinen Stand an den Tisch mit.
    if (vwRoom !== room.id) { vwRoom = room.id; lastVW = null; }
    if (v.wallet != null && v.wallet !== lastVW) { const before = lastVW == null ? v.wallet : wallet; lastVW = v.wallet; setWallet(v.wallet); if (v.mySeat >= 0 && v.wallet - before >= BIGWIN && before > 0) { const w = v.wallet - before; setTimeout(() => celebrate(w), v.kind === 'rad' ? 4300 : v.kind === 'slots' ? 2300 : 0); } }
    // automatisch hinsetzen und eigene Jetons mitbringen
    if (v.mySeat < 0 && v.free > 0 && sitAsked !== room.id) { sitAsked = room.id; sendKonto(); act({ type: 'sit' }); }
    const mode = 'cz-' + v.kind;
    if (st.dataset.mode !== mode) { st.dataset.mode = mode; delete st.dataset.h; st.innerHTML = `<div class="cz cz-room"><div class="cz-info"></div><div class="cz-main"></div><div class="cz-log"></div></div>`; lastKind = null; }
    const me = v.mySeat >= 0 ? v.seats[v.mySeat] : null;
    set(st.querySelector('.cz-info'), `<div class="cz-wallet">${chipHTML(1000, '', 'tabindex="-1"')}<div><small>DEINE JETONS${v.kind === 'poker' && me ? ' · AM TISCH ' + fmtN(me.stack) : ''}</small><b data-cz-wallet>${fmtN(wallet)}</b></div></div>
      <div class="cz-toprow">${v.mySeat < 0 ? `<span class="cz-badge">${v.free ? 'Du setzt dich …' : 'Alle Plätze besetzt – du schaust zu'}</span>` : ''}
      ${v.host && v.kind !== 'slots' && v.kind !== 'rad' ? `<button class="cz-btn small dark" data-czt="botadd" ${v.free ? '' : 'disabled'}>+ Bot</button><button class="cz-btn small dark" data-czt="botdel">− Bot</button>` : ''}
      <button class="cz-btn small dark" data-czt="lobby">Casino</button></div>`);
    set(st.querySelector('.cz-log'), (v.log || []).slice(0, 5).map(l => `<span>${esc(l)}</span>`).join(''));
    const main = st.querySelector('.cz-main');
    if (v.phase === 'idle') { set(main, '<p class="cz-status">Der Tisch wird vorbereitet …</p>'); lastKind = null; return; }
    if (v.phase === 'paused') { set(main, '<div class="cz-felt" style="text-align:center;padding:40px 16px"><p class="cz-status">Der Tisch macht Pause, weil eine Weile niemand gespielt hat.</p><button class="cz-btn" data-czt="resume">Weiterspielen</button></div>'); lastKind = null; return; }
    ({ blackjack: bj, roulette: rl, poker: pk, rennen: race, slots: slot, rad: radUI })[v.kind](main, v, me);
  }

  /* ---------- Blackjack ---------- */
  function bj(main, v, me) {
    if (lastKind !== 'bj') { lastKind = 'bj'; main.innerHTML = `<div class="cz-felt"><div class="cz-dealer"></div><div class="stamp">BLACKJACK ZAHLT 3 : 2 · BANK STEHT AUF 17</div><div class="cz-status"></div><div class="cz-seats"></div></div><div class="cz-bar"></div>`; }
    const dealerDone = v.phase === 'dealer' || v.phase === 'done';
    set(main.querySelector('.cz-dealer'), `<div class="lbl">BANK</div>${cardsHTML(v.dealer, 'bjd')}${v.dealer.length ? `<span class="cz-val">${v.dval}${v.dealer.includes('??') ? '' : v.dval > 21 ? ' · überkauft' : ''}</span>` : ''}`);
    const myTurn = v.phase === 'play' && v.turn && v.turn.i === v.mySeat;
    let status = '';
    if (v.phase === 'bet') status = me && me.ready ? 'Warte auf die anderen …' : 'Setzt eure Jetons!';
    else if (v.phase === 'play') status = myTurn ? 'Du bist dran!' : v.turn && v.seats[v.turn.i] ? `${esc(v.seats[v.turn.i].name)} ist dran` : '';
    else if (v.phase === 'dealer') status = 'Die Bank zieht …';
    else if (v.phase === 'done') status = me && me.hands.length ? (me.win > 0 ? `Gewonnen: +${fmtN(me.win)}` : me.win < 0 ? `Verloren: ${fmtN(me.win)}` : 'Unentschieden') : 'Runde vorbei';
    set(main.querySelector('.cz-status'), status + (v.phase === 'bet' || myTurn ? timerHTML() : ''));
    const RES = { win: ['GEWONNEN', 'win'], bj: ['BLACKJACK', 'win'], lose: ['VERLOREN', 'lose'], bust: ['ÜBERKAUFT', 'lose'], push: ['PUSH', 'push'] };
    set(main.querySelector('.cz-seats'), v.seats.map((x, i) => {
      if (!x) return `<div class="cz-seat empty">freier Platz</div>`;
      const turn = v.phase === 'play' && v.turn && v.turn.i === i;
      return `<div class="cz-seat ${i === v.mySeat ? 'me' : ''} ${turn ? 'turn' : ''}"><div class="nm">${admN(x.name, x.adm)} ${x.bot ? '<i>Bot</i>' : ''}</div>
        ${x.hands.length ? x.hands.map((h, k) => `<div style="margin:2px 0">${cardsHTML(h.cards, 'bj' + i + '_' + k, true)}<span class="cz-val">${h.v}</span> ${stackHTML(h.bet)}${h.res && dealerDone ? ` <span class="cz-badge ${RES[h.res][1]}">${RES[h.res][0]}</span>` : ''}</div>`).join('') : `<div style="min-height:66px;display:grid;place-items:center">${x.bet ? stackHTML(x.bet) + (x.ready ? ' <span class="cz-badge">bereit</span>' : '') : '<span class="cz-ghost">kein Einsatz</span>'}</div>`}
      </div>`;
    }).join(''));
    let bar = '';
    if (me && v.phase === 'bet') bar = `${chipBar(wallet)}<div class="cz-bar" style="margin:0">${me.bet ? `<span class="cz-badge">Einsatz ${fmtN(me.bet)}</span>` : ''}<button class="cz-btn" data-czt="bet">Setzen</button><button class="cz-btn dark" data-czt="clear" ${me.bet ? '' : 'disabled'}>Löschen</button><button class="cz-btn dark" data-czt="rebet">Wie zuvor</button><button class="cz-btn red" data-czt="deal" ${me.bet && !me.ready ? '' : 'disabled'}>Austeilen</button></div>`;
    else if (myTurn) { const h = me.hands[v.turn.h]; const pair = h && h.cards.length === 2 && me.hands.length === 1 && (h.cards[0][0] === h.cards[1][0] || ('TJQK'.includes(h.cards[0][0]) && 'TJQK'.includes(h.cards[1][0])));
      bar = `<button class="cz-btn" data-czt="hit">Karte</button><button class="cz-btn dark" data-czt="stand">Bleiben</button><button class="cz-btn dark" data-czt="double" ${h && h.cards.length === 2 && wallet >= h.bet ? '' : 'disabled'}>Verdoppeln</button><button class="cz-btn dark" data-czt="split" ${pair && wallet >= h.bet ? '' : 'disabled'}>Teilen</button>`; }
    set(main.querySelector('.cz-bar'), bar);
  }

  /* ---------- Roulette ---------- */
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const ncol = n => (n === 0 ? 'g' : REDS.has(n) ? 'r' : 'b');
  function drawWheel(cv, rot, ball) {
    const g = cv.getContext('2d'), W = cv.width, R = W / 2; g.clearRect(0, 0, W, W); g.save(); g.translate(R, R);
    const rim = g.createRadialGradient(0, 0, R * 0.7, 0, 0, R); rim.addColorStop(0, '#5a3418'); rim.addColorStop(0.85, '#2a170b'); rim.addColorStop(1, '#c8973e');
    g.fillStyle = rim; g.beginPath(); g.arc(0, 0, R * 0.99, 0, 7); g.fill();
    g.rotate(rot); const seg = Math.PI * 2 / 37;
    for (let i = 0; i < 37; i++) { const n = ORDER[i]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * 0.86, i * seg - seg / 2 - Math.PI / 2, (i + 1) * seg - seg / 2 - Math.PI / 2); g.closePath(); g.fillStyle = n === 0 ? '#0c8a4a' : REDS.has(n) ? '#c8202c' : '#16161c'; g.fill(); g.strokeStyle = '#c8973e'; g.lineWidth = R * 0.008; g.stroke();
      g.save(); g.rotate(i * seg); g.fillStyle = '#fff'; g.font = `bold ${R * 0.085}px Figtree,sans-serif`; g.textAlign = 'center'; g.fillText(n, 0, -R * 0.74); g.restore(); }
    const inner = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.6); inner.addColorStop(0, '#d9b065'); inner.addColorStop(0.5, '#7a4a20'); inner.addColorStop(1, '#3a2212');
    g.fillStyle = inner; g.beginPath(); g.arc(0, 0, R * 0.6, 0, 7); g.fill();
    for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2); g.fillStyle = '#e8c46a'; g.fillRect(-R * 0.025, -R * 0.42, R * 0.05, R * 0.42); g.beginPath(); g.arc(0, -R * 0.42, R * 0.045, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(0, 0, R * 0.08, 0, 7); g.fill();
    g.restore();
    if (ball) { g.save(); g.translate(R, R); const bx = Math.cos(ball.a) * R * ball.r, by = Math.sin(ball.a) * R * ball.r; const bg = g.createRadialGradient(bx - 2, by - 2, 1, bx, by, R * 0.04); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#bbb'); g.fillStyle = bg; g.beginPath(); g.arc(bx, by, R * 0.035, 0, 7); g.fill(); g.restore(); }
  }
  const RLW = { spinId: -1, anim: 0, rot: 0, settled: null };
  function rl(main, v, me) {
    if (lastKind !== 'rl') {
      lastKind = 'rl';
      const nums = []; for (let row = 0; row < 3; row++) for (let c = 0; c < 12; c++) nums.push({ n: c * 3 + (3 - row), row, c });
      main.innerHTML = `<div class="cz-felt"><div class="cz-rl"><div><div class="cz-wheel"><canvas width="640" height="640"></canvas></div><div class="cz-hist"></div></div>
        <div><div class="cz-status"></div><div class="cz-board">
          <button class="z n-g" data-rk="n0" style="grid-row:1/4">0</button>
          ${nums.map(o => `<button class="${ncol(o.n)}" data-rk="n${o.n}" style="grid-row:${o.row + 1};grid-column:${o.c + 2}">${o.n}</button>`).join('')}
          ${[0, 1, 2].map(r => `<button class="o" data-rk="c${3 - r}" style="grid-row:${r + 1};grid-column:14">2:1</button>`).join('')}
          ${[1, 2, 3].map(d => `<button class="o" data-rk="d${d}" style="grid-row:4;grid-column:${2 + (d - 1) * 4}/span 4">${['1–12', '13–24', '25–36'][d - 1]}</button>`).join('')}
          ${[['low', '1–18'], ['even', 'Gerade'], ['red', '◆'], ['black', '◆'], ['odd', 'Ungerade'], ['high', '19–36']].map(([k, l], i) => `<button class="o ${k === 'red' ? 'r' : k === 'black' ? 'b' : ''}" data-rk="${k}" style="grid-row:5;grid-column:${2 + i * 2}/span 2">${l}</button>`).join('')}
        </div></div></div></div><div class="cz-bar"></div>`;
      RLW.spinId = -1; RLW.settled = null;
    }
    const cv = main.querySelector('canvas');
    if (v.result != null && v.spinId !== RLW.spinId) {
      RLW.spinId = v.spinId; const target = ORDER.indexOf(v.result), seg = Math.PI * 2 / 37, start = RLW.rot, dur = v.phase === 'spin' ? Math.max(1500, (v.left || 6000) - 300) : 10;
      const endRot = start - (start % (Math.PI * 2)) + Math.PI * 2 * 5 + (Math.PI * 2 - target * seg);
      const t0 = performance.now(); cancelAnimationFrame(RLW.anim);
      const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); RLW.rot = start + (endRot - start) * e;
        const ba = -Math.PI / 2 - (1 - e) * Math.PI * 14, br = 0.93 - Math.min(1, p * 1.4) * 0.15 + (p > 0.7 ? 0 : Math.sin(p * 40) * 0.01);
        drawWheel(cv, RLW.rot, { a: ba, r: br }); if (p < 1) RLW.anim = requestAnimationFrame(step); else { RLW.settled = v.result; snd('win'); rl(main, V, V && V.mySeat >= 0 ? V.seats[V.mySeat] : null); } };
      RLW.anim = requestAnimationFrame(step); snd('tick');
    } else if (!RLW.anim || v.phase === 'bet') { if (v.phase === 'bet') { RLW.settled = null; } drawWheel(cv, RLW.rot, RLW.settled != null ? { a: -Math.PI / 2, r: 0.78 } : null); }
    set(main.querySelector('.cz-hist'), (v.hist || []).map((n, i) => `<span class="n-${ncol(n)}" style="${i ? '' : 'transform:scale(1.18);box-shadow:0 0 0 2px #ffe9a8'}">${n}</span>`).join(''));
    const shown = v.phase === 'done' || (v.phase === 'spin' && RLW.settled === v.result) ? v.result : null;
    main.querySelectorAll('.cz-board [data-rk]').forEach(b => {
      const k = b.dataset.rk, mine = me && me.bets[k] || 0, oth = v.seats.reduce((a, x, i) => a + (x && i !== v.mySeat ? x.bets[k] || 0 : 0), 0);
      const won = shown != null && rlPays(k, shown);
      const html = `${b.dataset.lbl || (b.dataset.lbl = b.innerHTML)}${mine ? `<span class="stk">${stackHTML(mine)}</span>` : ''}${oth ? `<span class="oth">${short(oth)}</span>` : ''}`;
      if (b.dataset.h !== html) { b.innerHTML = html; b.dataset.h = html; } b.classList.toggle('win', !!won);
    });
    const myBet = me ? Object.values(me.bets).reduce((a, b) => a + b, 0) : 0;
    let status = v.phase === 'bet' ? (me && me.ready ? 'Warte auf die anderen …' : 'Machen Sie Ihr Spiel!') : v.phase === 'spin' ? (RLW.settled === v.result ? `${v.result} ${ncol(v.result) === 'r' ? 'Rot' : ncol(v.result) === 'b' ? 'Schwarz' : 'Null'}` : 'Rien ne va plus – nichts geht mehr') : `${v.result} ${ncol(v.result) === 'r' ? 'Rot' : ncol(v.result) === 'b' ? 'Schwarz' : 'Null'}${me && myBet === 0 && me.win === 0 ? '' : me ? (me.win > 0 ? ` · Gewonnen: +${fmtN(me.win)}` : me.win < 0 ? ` · Verloren: ${fmtN(me.win)}` : '') : ''}`;
    set(main.querySelector('.cz-status'), status + (v.phase === 'bet' ? timerHTML() : ''));
    set(main.querySelector('.cz-bar'), me && v.phase === 'bet' ? `${chipBar(wallet)}<div class="cz-bar" style="margin:0"><span class="cz-badge">Einsatz ${fmtN(myBet)}</span><button class="cz-btn dark" data-czt="clear" ${myBet ? '' : 'disabled'}>Löschen</button><button class="cz-btn dark" data-czt="rebet">Wie zuvor</button><button class="cz-btn red" data-czt="go" ${myBet && !me.ready ? '' : 'disabled'}>Drehen</button></div><p class="cz-note" style="width:100%;text-align:center">Jeton wählen, dann aufs Feld tippen. Zahl zahlt 35 : 1, Dutzend und Kolonne 2 : 1, Farbe, Gerade/Ungerade und Hälften 1 : 1.</p>` : '');
  }
  function rlPays(k, n) {
    if (k[0] === 'n') return +k.slice(1) === n; if (n === 0) return false;
    return { red: REDS.has(n), black: !REDS.has(n), even: n % 2 === 0, odd: n % 2 === 1, low: n <= 18, high: n >= 19, d1: n <= 12, d2: n > 12 && n <= 24, d3: n > 24, c1: n % 3 === 1, c2: n % 3 === 2, c3: n % 3 === 0 }[k];
  }

  /* ---------- Pferderennen ---------- */
  const HCOL = ['#e5484d', '#3b7ad6', '#f2be1a', '#27a06a', '#8b5cf6', '#f28c28'];
  const RC = { id: -1, t0: 0, anim: 0 };
  function horsePos(race, i, t) {
    const T = race.times[i], p = Math.min(1, t / T), st = race.style[i];
    const e = st === 0 ? 1 - Math.pow(1 - p, 1.6) : st === 1 ? Math.pow(p, 1.35) : p + Math.sin(p * Math.PI) * 0.06 * Math.sin(i * 3 + 1);
    return Math.min(1, Math.max(0, e));
  }
  function drawTrack(cv, v, t) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.25); sky.addColorStop(0, '#2a4a7a'); sky.addColorStop(1, '#6f9cc8'); g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.22);
    g.fillStyle = '#2f6d33'; g.fillRect(0, H * 0.22, W, H * 0.08);
    for (let i = 0; i < 30; i++) { g.fillStyle = `hsl(${(i * 47) % 360},55%,${45 + (i % 3) * 8}%)`; g.beginPath(); g.arc((i + 0.5) * W / 30, H * 0.2, W / 90, 0, 7); g.fill(); }
    const top = H * 0.3, lane = (H * 0.66) / 6;
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#a4724a' : '#b07b50'; g.fillRect(0, top + i * lane, W, lane); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, top + i * lane, W, 2); }
    g.fillStyle = '#fff'; g.fillRect(0, H - H * 0.04, W, H * 0.04);
    const x0 = W * 0.06, x1 = W * 0.92;
    for (let k = 0; k < 10; k++) { g.fillStyle = k % 2 ? '#111' : '#fff'; g.fillRect(x1, top + k * (H * 0.66) / 10, W * 0.012, (H * 0.66) / 10); }
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x0, top, 3, H * 0.66);
    const race = v.race;
    v.horses.forEach((h, i) => {
      const p = race ? horsePos(race, i, t) : 0, x = x0 + (x1 - x0) * p, y = top + i * lane + lane * 0.55, s = lane / 26, gal = race && p < 1 ? Math.sin(t * 18 + i) : 0;
      g.save(); g.translate(x, y); g.scale(s, s);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(-4, 11, 16, 3, 0, 0, 7); g.fill();
      g.strokeStyle = '#5a3418'; g.lineWidth = 2.4; g.lineCap = 'round';
      for (const [lx, ph] of [[-12, 0], [-9, 1.6], [6, 3.2], [9, 4.8]]) { g.beginPath(); g.moveTo(lx, 2); g.lineTo(lx + Math.sin(t * 18 + ph + i) * 4 * (race && p < 1 ? 1 : 0.2), 11); g.stroke(); }
      g.fillStyle = '#7a4a24'; g.beginPath(); g.ellipse(-3, 0, 14, 6.5, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(8, -3); g.lineTo(16, -11 + gal); g.lineTo(21, -9 + gal); g.lineTo(13, 1); g.fill();
      g.fillStyle = '#3a2212'; g.beginPath(); g.moveTo(-16, -2); g.quadraticCurveTo(-24, 0, -22 + gal * 2, 6); g.lineTo(-17, 1); g.fill();
      g.fillStyle = HCOL[i]; g.beginPath(); g.ellipse(-2, -9, 4.5, 4.5, 0, 0, 7); g.fill(); g.fillRect(-6, -7, 8, 6);
      g.fillStyle = '#ffe0bd'; g.beginPath(); g.arc(0, -15, 2.8, 0, 7); g.fill();
      g.fillStyle = HCOL[i]; g.fillRect(-3, -19, 6, 3);
      g.restore();
      g.fillStyle = '#fff'; g.font = `bold ${lane * 0.32}px Figtree,sans-serif`; g.fillText(String(i + 1), 8, y + lane * 0.12);
    });
    if (race && v.phase !== 'race' || (race && t > Math.max(...race.times))) {
      const w = race.order[0]; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(W * 0.25, H * 0.02, W * 0.5, H * 0.16); g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.font = `bold ${H * 0.08}px Bungee,Figtree,sans-serif`; g.fillText(`Sieg: ${v.horses[w].name}`, W / 2, H * 0.12); g.textAlign = 'left';
    }
  }
  let raceKey = 'p';
  function race(main, v, me) {
    if (lastKind !== 'race') { lastKind = 'race'; main.innerHTML = `<div class="cz-felt" style="border-radius:28px"><div class="cz-track"><canvas width="1200" height="500"></canvas></div><div class="cz-status"></div><div class="cz-horses"></div></div><div class="cz-bar"></div>`; RC.id = -1; }
    const cv = main.querySelector('canvas');
    if (v.race && v.race.id !== RC.id) { RC.id = v.race.id; RC.t0 = performance.now() - (v.phase === 'race' ? Math.max(0, 12500 - (v.left || 12500)) : 99999); cancelAnimationFrame(RC.anim);
      const step = now => { const t = (now - RC.t0) / 1000; drawTrack(cv, V && V.kind === 'rennen' ? V : v, t); if (t < Math.max(...v.race.times) + 1.5 && q('#stage') && q('#stage').dataset.mode === 'cz-rennen') RC.anim = requestAnimationFrame(step); };
      RC.anim = requestAnimationFrame(step); }
    else if (!v.race) drawTrack(cv, v, 0);
    const order = v.race && v.phase === 'done' ? v.race.order : null;
    set(main.querySelector('.cz-status'), v.phase === 'bet' ? (me && me.ready ? 'Warte auf die anderen …' : 'Wetten bitte! Sieg zahlt die Quote, Platz (unter den ersten 3) etwa ein Viertel davon') + timerHTML() : v.phase === 'race' ? 'Und sie sind gestartet!' : me && (me.win || Object.keys(me.bets).length) ? (me.win > 0 ? `Gewonnen: +${fmtN(me.win)}` : `Verloren: ${fmtN(me.win)}`) : 'Rennen vorbei');
    set(main.querySelector('.cz-horses'), v.horses.map((h, i) => {
      const mine = me ? (me.bets['s' + i] || 0) + (me.bets['p' + i] || 0) : 0, pl = order ? order.indexOf(i) + 1 : 0;
      return `<div class="cz-horse ${pl === 1 ? 'place1' : ''}"><span class="sw" style="background:${HCOL[i]}"></span><b>${i + 1}. ${esc(h.name)} ${pl ? `<span class="cz-badge ${pl === 1 ? 'win' : ''}">${pl}. Platz</span>` : ''}</b><span class="od">${String(h.odds).replace('.', ',')}</span>
        ${me && v.phase === 'bet' ? `<button class="cz-btn small" data-czb="s${i}">Sieg</button><button class="cz-btn small dark" data-czb="p${i}">Platz</button>` : '<span></span><span></span>'}
        ${mine ? `<span style="grid-column:2/-1;font-size:12px;color:#ffe9a8">Deine Wette: ${me.bets['s' + i] ? 'Sieg ' + fmtN(me.bets['s' + i]) : ''} ${me.bets['p' + i] ? 'Platz ' + fmtN(me.bets['p' + i]) : ''}</span>` : ''}</div>`;
    }).join(''));
    const myBet = me ? Object.values(me.bets).reduce((a, b) => a + b, 0) : 0;
    set(main.querySelector('.cz-bar'), me && v.phase === 'bet' ? `${chipBar(wallet)}<div class="cz-bar" style="margin:0"><span class="cz-badge">Einsatz ${fmtN(myBet)}</span><button class="cz-btn dark" data-czt="clear" ${myBet ? '' : 'disabled'}>Löschen</button><button class="cz-btn red" data-czt="go" ${myBet && !me.ready ? '' : 'disabled'}>Start</button></div>` : '');
  }

  /* ---------- Spielautomat ---------- */
  const SYMS = { kirsche: '🍒', zitrone: '🍋', pflaume: '🍇', glocke: '🔔', stern: '⭐', diamant: '💎', sieben: '7', joker: '🃏' };
  const SYMK = Object.keys(SYMS);
  const LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0]];
  const SL = { id: -1, spinning: false, bet: Number(store.get('casino.slotbet')) || 100, shown: null };
  const symHTML = k => `<div class="cz-sym ${k}">${SYMS[k]}</div>`;
  function slot(main, v, me) {
    if (lastKind !== 'slot') {
      lastKind = 'slot';
      const rnd = () => SYMK[Math.floor(Math.random() * 6)];
      main.innerHTML = `<div class="cz-slot"><div class="top">✦ GOLDRAUSCH ✦</div><div class="cz-reels">${[0, 1, 2, 3, 4].map(c => `<div class="cz-reel"><div class="cz-strip" data-reel="${c}">${[rnd(), rnd(), rnd()].map(symHTML).join('')}</div></div>`).join('')}<svg class="cz-lines" viewBox="0 0 500 300" preserveAspectRatio="none"></svg></div>
        <div class="cz-win"></div><div class="cz-bar"></div>
        <div class="cz-paytable">${['sieben', 'joker', 'diamant', 'stern', 'glocke', 'pflaume', 'zitrone', 'kirsche'].map(k => `<div>${SYMS[k] === '7' ? '<b style="color:#d1162a;font-family:Bungee">7</b>' : SYMS[k]} ×5 · ${{ sieben: 2000, joker: 2500, diamant: 750, stern: 350, glocke: 200, pflaume: 100, zitrone: 75, kirsche: 60 }[k]}</div>`).join('')}</div>
        <p class="cz-note" style="text-align:center;margin-top:8px">Gewinne je Linie mal ein Zehntel des Einsatzes. 3 gleiche von links gewinnen, 🃏 ersetzt jedes Symbol.</p></div><div class="cz-others"></div>`;
      SL.id = me && me.slot ? me.slot.id : -1; if (me && me.slot) showGrid(main, me.slot, false);
    }
    if (me && me.slot && me.slot.id !== SL.id) { SL.id = me.slot.id; spinAnim(main, me.slot); }
    if (!SL.spinning) set(main.querySelector('.cz-bar'), me ? `<div class="cz-chips">${[10, 50, 100, 500, 1000, 5000].map(b => `<button class="cz-btn small ${b === SL.bet ? '' : 'dark'}" data-czs="${b}">${short(b)}</button>`).join('')}</div><button class="cz-btn red" data-czt="spin" style="font-size:20px;padding:14px 34px" ${wallet >= SL.bet ? '' : 'disabled'}>DREHEN · ${fmtN(SL.bet)}</button>` : '');
    const others = v.seats.filter((x, i) => x && i !== v.mySeat && x.slot);
    let oth = main.parentNode.querySelector('.cz-others'); if (oth) set(oth, others.length ? `<div class="cz-log">${others.map(x => `<span>${admN(x.name, x.adm)}: ${x.slot.pay ? '+' + fmtN(x.slot.pay) : 'kein Gewinn'}</span>`).join('')}</div>` : '');
  }
  function showGrid(main, sres, hits) {
    sres.grid.forEach((col, c) => { const el = main.querySelector(`[data-reel="${c}"]`); el.style.transition = 'none'; el.style.transform = 'none'; el.innerHTML = col.map(symHTML).join(''); });
    const svg = main.querySelector('.cz-lines'); svg.innerHTML = '';
    if (hits && sres.wins.length) {
      const cols = ['#ffe9a8', '#ff7a6a', '#7fd4ff', '#a6f28a', '#ffa6ec'];
      sres.wins.forEach((w, k) => { const L = LINES[w.line]; svg.innerHTML += `<polyline points="${L.map((r, c) => `${c * 100 + 50},${r * 100 + 50}`).join(' ')}" fill="none" stroke="${cols[k % cols.length]}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
        for (let c = 0; c < w.n; c++) { const el = main.querySelector(`[data-reel="${c}"]`).children[L[c]]; if (el) el.classList.add('hit'); } });
    }
    const win = main.querySelector('.cz-win'); win.textContent = hits ? (sres.pay ? `+ ${fmtN(sres.pay)}` : '') : ''; win.classList.toggle('big', hits && sres.pay >= sres.bet * 10);
  }
  function spinAnim(main, sres) {
    SL.spinning = true; set(main.querySelector('.cz-bar'), '<button class="cz-btn red" disabled style="font-size:20px;padding:14px 34px">…</button>');
    main.querySelector('.cz-lines').innerHTML = ''; main.querySelector('.cz-win').textContent = '';
    const cell = main.querySelector('.cz-reel').clientHeight / 3;
    sres.grid.forEach((col, c) => {
      const el = main.querySelector(`[data-reel="${c}"]`), n = 18 + c * 5, list = [];
      for (let i = 0; i < n; i++) list.push(SYMK[Math.floor(Math.random() * 7)]);
      el.style.transition = 'none'; el.style.transform = 'none'; el.innerHTML = [...col, ...list].map(symHTML).join('');
      el.style.transform = `translateY(${-n * cell}px)`; void el.offsetHeight;
      el.style.transition = `transform ${1.1 + c * 0.28}s cubic-bezier(.12,.9,.25,1)`; el.style.transform = 'translateY(0)';
    });
    snd('tick');
    setTimeout(() => { SL.spinning = false; showGrid(main, sres, true); if (sres.pay) snd('win'); else snd('card'); if (V) slot(main, V, V.mySeat >= 0 ? V.seats[V.mySeat] : null); }, 1100 + 4 * 280 + 120);
  }

  /* ---------- Glücksrad ---------- */
  const RD = { id: -1, spinning: false, bet: Number(store.get('casino.radbet')) || 100, ang: 0, segs: null };
  const radCol = m => (m >= 10 ? ['#ffd24a', '#2a1608'] : m >= 5 ? ['#e8443a', '#fff'] : m >= 3 ? ['#c86aff', '#fff'] : m >= 2 ? ['#3a9aff', '#fff'] : m >= 1.5 ? ['#2fb3b0', '#fff'] : m >= 1 ? ['#3fa34d', '#fff'] : m >= 0.5 ? ['#5a4a6a', '#fff'] : ['#2a2230', '#cdbf9f']);
  const mTxt = m => '×' + String(m).replace('.', ',');
  function drawRad(cv, ang) {
    const segs = RD.segs; if (!segs) return; const g = cv.getContext('2d'), DPR2 = Math.min(2, devicePixelRatio || 1), Sz = cv.clientWidth * DPR2; if (cv.width !== Sz) { cv.width = cv.height = Sz; }
    const R = Sz / 2, tot = segs.reduce((a, s) => a + s[1], 0); g.clearRect(0, 0, Sz, Sz);
    g.save(); g.translate(R, R); g.rotate(ang);
    let a0 = -Math.PI / 2;
    for (const [m, w] of segs) { const a1 = a0 + w / tot * Math.PI * 2, [bg, fg] = radCol(m);
      g.fillStyle = bg; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * 0.96, a0, a1); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2 * DPR2; g.stroke();
      const am = (a0 + a1) / 2; g.save(); g.rotate(am); g.fillStyle = fg; g.font = `800 ${Math.round(R * (w >= 3 ? 0.085 : 0.07))}px Bungee, Figtree, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(mTxt(m), R * 0.88, 0); g.restore();
      a0 = a1; }
    g.restore();
    g.strokeStyle = '#c8973e'; g.lineWidth = R * 0.05; g.beginPath(); g.arc(R, R, R * 0.96, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + ang; g.fillStyle = i % 2 ? '#ffe9a8' : '#fff7d8'; g.beginPath(); g.arc(R + Math.cos(a) * R * 0.96, R + Math.sin(a) * R * 0.96, R * 0.018, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#3a2212'; g.beginPath(); g.arc(R, R, R * 0.13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8c46a'; g.beginPath(); g.arc(R, R, R * 0.09, 0, Math.PI * 2); g.fill();
  }
  function radUI(main, v, me) {
    RD.segs = v.segs || RD.segs;
    if (lastKind !== 'rad') {
      lastKind = 'rad';
      main.innerHTML = `<div class="cz-rad"><div class="top">✦ GLÜCKSRAD ✦</div><div class="cz-radw"><canvas class="cz-radcv"></canvas><div class="cz-radptr">▼</div></div><div class="cz-win"></div><div class="cz-bar"></div>
        <div class="cz-paytable">${[...new Map(RD.segs.map(s => [s[0], 0])).keys()].sort((a, b) => b - a).map(m => { const w = RD.segs.filter(s => s[0] === m).reduce((a, s) => a + s[1], 0), tot = RD.segs.reduce((a, s) => a + s[1], 0); return `<div><b style="color:${m < 1 ? '#cdbf9f' : radCol(m)[0]}">${mTxt(m)}</b> · ${(w / tot * 100).toFixed(w / tot < 0.05 ? 1 : 0).replace('.', ',')} %</div>`; }).join('')}</div>
        <p class="cz-note" style="text-align:center;margin-top:8px">Dein Einsatz wird mit dem Feld unter dem Pfeil malgenommen. Unter ×1 bekommst du nur einen Teil zurück.</p></div><div class="cz-others"></div>`;
      RD.id = me && me.rad ? me.rad.id : -1; if (me && me.rad) RD.ang = radTarget(me.rad);
      requestAnimationFrame(() => drawRad(main.querySelector('.cz-radcv'), RD.ang));
    }
    if (me && me.rad && me.rad.id !== RD.id) { RD.id = me.rad.id; radSpin(main, me.rad); }
    if (!RD.spinning) set(main.querySelector('.cz-bar'), me ? `<div class="cz-chips">${[10, 50, 100, 500, 1000, 5000, 25000].map(b => `<button class="cz-btn small ${b === RD.bet ? '' : 'dark'}" data-czrb="${b}">${short(b)}</button>`).join('')}</div><button class="cz-btn red" data-czt="radspin" style="font-size:20px;padding:14px 34px" ${wallet >= RD.bet ? '' : 'disabled'}>DREHEN · ${fmtN(RD.bet)}</button>` : '<span class="cz-note">Setz dich hin, um zu drehen.</span>');
    const others = v.seats.filter((x, i) => x && i !== v.mySeat && x.rad);
    let oth = main.parentNode.querySelector('.cz-others'); if (oth) set(oth, others.length ? `<div class="cz-log">${others.map(x => `<span>${admN(x.name, x.adm)}: ${mTxt(x.rad.m)} → ${fmtN(x.rad.pay)}</span>`).join('')}</div>` : '');
  }
  // Winkel, bei dem Feld i (mit zufälliger Stelle im Feld) unter dem Pfeil oben steht
  function radTarget(r) {
    const segs = RD.segs, tot = segs.reduce((a, s) => a + s[1], 0); let st = 0; for (let k = 0; k < r.i; k++) st += segs[k][1];
    const mid = (st + segs[r.i][1] * (0.15 + 0.7 * (r.off ?? 0.5))) / tot * Math.PI * 2;
    return -mid;
  }
  function radSpin(main, r) {
    RD.spinning = true; set(main.querySelector('.cz-bar'), '<button class="cz-btn red" disabled style="font-size:20px;padding:14px 34px">…</button>');
    const win = main.querySelector('.cz-win'); win.textContent = ''; win.classList.remove('big');
    const cv = main.querySelector('.cz-radcv'), from = RD.ang, tgt = radTarget(r), base = from - (from % (Math.PI * 2));
    let to = base + tgt; while (to < from + Math.PI * 2 * 5) to += Math.PI * 2;
    const T0 = performance.now(), DUR = 4200; let lastSeg = -1;
    const segAt = a => { const segs = RD.segs, tot = segs.reduce((x, s) => x + s[1], 0); let p = (((-a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * tot, k = 0; for (; k < segs.length - 1; k++) { p -= segs[k][1]; if (p <= 0) break; } return k; };
    (function step(now) {
      const p = Math.min(1, (now - T0) / DUR), e = 1 - Math.pow(1 - p, 4); RD.ang = from + (to - from) * e; drawRad(cv, RD.ang);
      const sg = segAt(RD.ang); if (sg !== lastSeg) { lastSeg = sg; if (p < 0.98) snd('tick'); }
      if (p < 1) requestAnimationFrame(step);
      else { RD.spinning = false; RD.ang = to % (Math.PI * 2); win.textContent = `${mTxt(r.m)} · ${r.pay ? '+ ' + fmtN(r.pay) : 'nichts'}`; win.classList.toggle('big', r.m >= 5); if (r.m >= 1) snd('win'); else snd('lose'); if (V && V.kind === 'rad') radUI(main, V, V.mySeat >= 0 ? V.seats[V.mySeat] : null); }
    })(T0);
  }

  /* ---------- Poker ---------- */
  const PPOS = [[50, 92], [10, 70], [10, 28], [50, 8], [90, 28], [90, 70]];
  let raiseTo = 0;
  function pk(main, v, me) {
    if (lastKind !== 'pk') { lastKind = 'pk'; main.innerHTML = `<div class="cz-pk"><div class="oval"></div><div class="center"></div><div class="cz-pseats"></div></div><div class="cz-status"></div><div class="cz-bar"></div>`; }
    const n = v.seats.length, rot = v.mySeat >= 0 ? v.mySeat : 0;
    set(main.querySelector('.center'), `<div class="stamp" style="font-family:Bungee;color:rgba(255,233,168,.3);margin-bottom:6px">TEXAS HOLD'EM · ${v.bb / 2}/${v.bb}</div>${cardsHTML(v.board, 'pkb')}<div class="pot">${stackHTML(v.pot)} Topf ${fmtN(v.pot)}</div>${v.result ? `<div class="cz-status">${esc(v.result.names.join(' & '))} gewinnt${v.result.hand ? ' mit ' + esc(v.result.hand) : ''}</div>` : ''}`);
    set(main.querySelector('.cz-pseats'), v.seats.map((x, i) => {
      const [px, py] = PPOS[((i - rot) % n + n) % n] || [50, 50];
      if (!x) return `<div class="cz-pseat" style="left:${px}%;top:${py}%"><div class="box cz-ghost">freier Platz</div></div>`;
      const cls = `${i === v.mySeat ? 'me' : ''} ${v.turnI === i ? 'turn' : ''} ${x.folded ? 'fold' : ''}`;
      const betY = py > 50 ? -62 : 62;
      return `<div class="cz-pseat ${cls}" style="left:${px}%;top:${py}%">${cardsHTML(x.cards, 'pk' + i)}<div class="box"><div class="nm" style="font-weight:800;font-size:13px">${admN(x.name, x.adm)}${x.bot ? ' <i style="opacity:.6;font-style:normal;font-size:11px">Bot</i>' : ''}</div><div class="stk">${fmtN(x.stack)}</div>
        ${x.shown ? `<div class="cz-badge ${x.win > 0 ? 'win' : ''}">${esc(x.shown)}</div>` : x.allin ? '<div class="cz-badge">ALL-IN</div>' : x.folded ? '<div class="cz-ghost">ausgestiegen</div>' : ''}${x.win > 0 && v.street === 'show' ? `<div class="cz-badge win">+${fmtN(x.win)}</div>` : ''}</div>
        ${x.bet ? `<div class="bet" style="top:calc(50% + ${betY}px)">${fmtN(x.bet)}</div>` : ''}${v.btn === i ? `<span class="cz-dbtn" style="right:-6px;top:-6px">D</span>` : ''}</div>`;
    }).join(''));
    const myTurn = v.turnI === v.mySeat && v.mySeat >= 0 && v.phase === 'hand';
    let status = v.phase === 'wait' ? 'Warte auf Mitspieler – holt euch Bots dazu, wenn ihr allein seid.' : v.phase === 'show' ? '' : myTurn ? 'Du bist dran!' : v.turnI >= 0 && v.seats[v.turnI] ? `${esc(v.seats[v.turnI].name)} überlegt …` : '';
    set(main.querySelector('.cz-status'), status + (myTurn ? timerHTML() : ''));
    if (myTurn) {
      const need = v.toCall - me.bet, minTo = Math.min(me.bet + me.stack, v.toCall + v.minRaise), maxTo = me.bet + me.stack;
      if (raiseTo < minTo || raiseTo > maxTo) raiseTo = minTo;
      set(main.querySelector('.cz-bar'), `<button class="cz-btn red" data-czt="fold">Aussteigen</button>
        ${need > 0 ? `<button class="cz-btn" data-czt="call">Mitgehen ${fmtN(Math.min(need, me.stack))}</button>` : '<button class="cz-btn" data-czt="check">Schieben</button>'}
        ${maxTo > v.toCall ? `<span class="cz-raise"><input type="range" min="${minTo}" max="${maxTo}" step="${v.bb / 2}" value="${raiseTo}" data-czr><button class="cz-btn dark" data-czt="raise">Erhöhen auf <b data-czrv>${fmtN(raiseTo)}</b></button></span><button class="cz-btn dark" data-czt="allin">All-in</button>` : ''}`);
    } else set(main.querySelector('.cz-bar'), me && me.stack === 0 && !(v.phase === 'hand' && me.cards.length) ? '<p class="cz-note">Keine Jetons mehr am Tisch. In der nächsten Hand kaufst du automatisch nach, wenn du noch Jetons hast.</p>' : '');
  }

  /* ---------- Klicks am Tisch ---------- */
  document.addEventListener('click', e => {
    if (!room || room.game !== 'casino' || !V) return;
    const t = e.target;
    let b = t.closest('[data-cz-chip]'); if (b) { chipSel = +b.dataset.czChip; store.set('casino.chip', chipSel); document.querySelectorAll('[data-cz-chip]').forEach(x => x.classList.toggle('sel', +x.dataset.czChip === chipSel)); snd('chip'); return; }
    b = t.closest('[data-rk]'); if (b && V.kind === 'roulette') { if (V.phase !== 'bet') return; if (chipSel > wallet) { toast('Nicht genug Jetons.'); return; } act({ type: 'bet', key: b.dataset.rk, amount: chipSel }); snd('chip'); return; }
    b = t.closest('[data-czb]'); if (b) { if (chipSel > wallet) { toast('Nicht genug Jetons.'); return; } act({ type: 'bet', key: b.dataset.czb, amount: chipSel }); snd('chip'); return; }
    b = t.closest('[data-czrb]'); if (b) { RD.bet = +b.dataset.czrb; store.set('casino.radbet', RD.bet); radUI(q('#stage .cz-main'), V, V.mySeat >= 0 ? V.seats[V.mySeat] : null); return; }
    b = t.closest('[data-czs]'); if (b) { SL.bet = +b.dataset.czs; store.set('casino.slotbet', SL.bet); slot(q('#stage .cz-main'), V, V.mySeat >= 0 ? V.seats[V.mySeat] : null); return; }
    b = t.closest('[data-czt]'); if (!b || b.disabled) return;
    const a = b.dataset.czt;
    if (a === 'lobby') { send({ t: 'leave' }); setTimeout(() => { openLobby(); czCall('cz_state').then(renderLobby); }, 300); return; }
    if (a === 'botadd') { act({ type: 'bot', add: true }); return; }
    if (a === 'botdel') { act({ type: 'bot', add: false }); return; }
    if (a === 'bet') { if (chipSel > wallet) { toast('Nicht genug Jetons.'); return; } act({ type: 'bet', amount: chipSel }); snd('chip'); return; }
    if (a === 'spin') { if (SL.spinning) return; act({ type: 'spin', amount: SL.bet }); return; }
    if (a === 'radspin') { if (RD.spinning) return; act({ type: 'spin', amount: RD.bet }); return; }
    if (a === 'raise') { act({ type: 'raise', to: raiseTo }); return; }
    if (['hit', 'stand', 'double', 'split'].includes(a)) snd('card');
    act({ type: a });
  });
  document.addEventListener('input', e => { const r = e.target.closest && e.target.closest('[data-czr]'); if (!r) return; raiseTo = +r.value; const l = q('[data-czrv]'); if (l) l.textContent = fmtN(raiseTo); });

  window.Casino = { render, openLobby, closeLobby, refreshLobby: renderLobby, isLobby: () => !!(lobby && !lobby.hidden) };
})();
