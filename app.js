'use strict';
// FSG Spieleabend – Browser-Seite
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};

const GAMES = [
  { key: 'uno', title: 'Letzte Karte', sub: 'Ablegespiel nach Uno-Regeln · 2–8 Spieler',
    art: '<span class="card c-r" style="--cw:40px"><span class="big">7</span></span><span class="card c-w" style="--cw:40px;transform:rotate(8deg)"><span class="wheel"></span></span>' },
  { key: 'schach', title: 'Schach', sub: '2 Spieler · weitere können zuschauen',
    art: '<span class="pc pw" style="font-size:52px">♞&#xFE0E;</span><span class="pc pb" style="font-size:52px;color:#e9dcc3">♛&#xFE0E;</span>' },
  { key: 'maedn', title: 'Mensch ärgere dich nicht', sub: '2–4 Spieler',
    art: ['rot', 'blau', 'gruen', 'gelb'].map(c => `<span class="fig ${c}" style="width:30px;height:30px;display:inline-block"></span>`).join('') },
  { key: 'vier', title: 'Vier gewinnt', sub: '2 Spieler · weitere können zuschauen',
    art: '<span style="display:grid;grid-template-columns:repeat(4,16px);gap:3px;background:var(--cb);padding:5px;border-radius:6px">' +
      [0, 0, 0, 2, 0, 0, 2, 1, 0, 2, 1, 1, 2, 1, 1, 2].map(x => `<i style="width:16px;height:16px;border-radius:50%;background:${x === 1 ? 'var(--cr)' : x === 2 ? 'var(--cy)' : 'var(--bg)'}"></i>`).join('') + '</span>' },
  { key: 'party', title: 'Minispiel-Party', sub: 'Zufällige Minispiele à 1–2 Minuten, Punkte nach Platzierung · 2–12 Spieler',
    art: ['r', 'g', 'b', 'y'].map((c, i) => `<span class="s-${c}" style="width:28px;height:28px;border-radius:8px;display:inline-block;transform:rotate(${i * 9 - 12}deg)"></span>`).join('') },
];
const gameOf = k => GAMES.find(g => g.key === k) || { title: k };

let key = store.get('fsg.key');
if (!key) { const a = new Uint8Array(16); crypto.getRandomValues(a); key = [...a].map(b => b.toString(16).padStart(2, '0')).join(''); store.set('fsg.key', key); }
let ws = null, pid = null, rooms = [], room = null, roomId = store.get('fsg.room'), deadline = null;
const ui = { sel: null, selKey: null, resign: false, flashSeen: {}, p: {} };

/* ---------- Verbindung ---------- */
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  const slow = setTimeout(() => { $('#conn').hidden = false; }, 1200);
  ws.onopen = () => { clearTimeout(slow); $('#conn').hidden = true; send({ t: 'hello', key, name: nick(), room: roomId }); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } onMsg(m); };
  ws.onclose = () => { clearTimeout(slow); $('#conn').hidden = false; $('#conn').textContent = 'Verbindung unterbrochen – verbinde neu …'; setTimeout(connect, 1500); };
}
function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
function act(a) { send({ t: 'act', a }); }
function onMsg(m) {
  if (m.t === 'hi') pid = m.pid;
  else if (m.t === 'rooms') { rooms = m.rooms; if (!room) renderRooms(); }
  else if (m.t === 'room') {
    room = m.room; roomId = room.id; store.set('fsg.room', roomId);
    if (room.view && room.view.left != null) deadline = Date.now() + room.view.left; else deadline = null;
    render();
  } else if (m.t === 'closed') { room = null; roomId = null; store.set('fsg.room', null); render(); }
  else if (m.t === 'err') toast(m.msg);
}

/* ---------- Helfer ---------- */
let toastT;
function toast(msg, big) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (big ? ' big' : ''); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), big ? 2600 : 3600); }
const nick = () => ($('#nick').value || '').trim();
const nameOf = id => (room && room.players.find(p => p.id === id) || {}).name || 'Jemand';
const isHost = () => room && room.host === room.me;
function patch(el, html, k) { if (el.dataset.k !== k) { el.innerHTML = html; el.dataset.k = k; return true; } return false; }
setInterval(() => {
  if (deadline == null) return;
  const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  document.querySelectorAll('[data-cd]').forEach(e => (e.textContent = s));
}, 200);

/* ---------- Hub ---------- */
function renderTiles() {
  $('#tiles').innerHTML = `<div class="tile wide solo-tile"><div class="art"><span class="rl-art"></span></div><div style="display:flex;flex-direction:column;gap:4px;min-width:0"><b>Ritterlauf <span class="pill">Solo</span></b><span class="sub">Dein Ritter kämpft sich allein durch Gegnerwellen. Sammle Gold und Seelen, verbessere ihn und komm jedes Mal weiter. Spielstand mit Passwort.</span></div>
      <button class="btn small" data-solo="1">Spielen</button></div>` + GAMES.map(g => g.key === 'party'
    ? `<div class="tile wide"><div class="art">${g.art}</div><div style="display:flex;flex-direction:column;gap:4px;min-width:0"><b>${esc(g.title)}</b><span class="sub">${esc(g.sub)}</span></div>
      <button class="btn small" data-create="${g.key}">Party starten</button></div>`
    : `<div class="tile"><div class="art">${g.art}</div><b>${esc(g.title)}</b><span class="sub">${esc(g.sub)}</span>
      <button class="btn small" data-create="${g.key}">Neue Runde</button></div>`).join('');
}
function renderRooms() {
  const el = $('#rooms');
  if (!rooms.length) { el.innerHTML = '<div class="empty">Gerade ist keine Runde offen. Starte oben ein Spiel – deine Freunde sehen es dann sofort hier.</div>'; return; }
  el.innerHTML = rooms.map(r => {
    const g = gameOf(r.game);
    const pill = r.status === 'lobby' ? '<span class="pill wait">Wartet</span>' : r.status === 'playing' ? '<span class="pill play">Läuft</span>' : '<span class="pill end">Beendet</span>';
    const mine = r.id === roomId;
    return `<div class="roomrow"><div style="min-width:0"><div class="name">${esc(r.name)}</div>
      <div class="meta"><span class="chip">${esc(g.title)}</span>${pill}${r.players.map(p => `<span class="chip">${esc(p.name)}${p.host ? ' ★' : ''}</span>`).join('')}</div></div>
      <button class="btn small" data-join="${r.id}" ${r.full && !mine ? 'disabled' : ''}>${mine ? 'Zurück zur Runde' : r.full ? 'Voll' : r.status === 'lobby' ? 'Beitreten' : 'Einsteigen'}</button></div>`;
  }).join('');
}
function needNick() {
  const n = nick();
  if (!n) { toast('Gib zuerst deinen Namen ein.'); $('#nick').focus(); return false; }
  store.set('fsg.nick', n); send({ t: 'name', name: n }); return true;
}
$('#tiles').addEventListener('click', e => { if (e.target.closest('[data-solo]')) { window.Ritter.open(); return; } const b = e.target.closest('[data-create]'); if (b && needNick()) send({ t: 'create', game: b.dataset.create }); });
$('#rooms').addEventListener('click', e => { const b = e.target.closest('[data-join]'); if (b && needNick()) send({ t: 'join', room: b.dataset.join }); });
$('#nick').addEventListener('change', () => { const n = nick(); if (n) { store.set('fsg.nick', n); send({ t: 'name', name: n }); } });

/* ---------- Raum ---------- */
function render() {
  if (!room || room.game !== 'party') endMini();
  if (window.Ritter && Ritter.isOpen()) { if (!room) return; Ritter.close(); }
  $('#hub').hidden = !!room; $('#room').hidden = !room;
  if (!room) { $('#picker').hidden = true; renderRooms(); return; }
  renderRoom();
}
function renderRoom() {
  const r = room, el = $('#room'), g = gameOf(r.game);
  if (!el.querySelector('#rtop')) el.innerHTML = '<div id="rtop"></div><div id="stage" class="center"></div>';
  $('#rtop').innerHTML = `<div class="topbar"><button class="btn ghost small" data-room="hub">‹ Spiele</button>
    <div class="title"><b>${esc(r.name)}</b><small>${esc(g.title)}</small></div>
    <button class="btn ghost small" data-room="leave">Verlassen</button></div>`;
  const st = $('#stage');
  if (r.status === 'lobby' || !r.view) { setMode(st, 'lobby'); st.innerHTML = lobbyHTML(); return; }
  if (r.game === 'uno') renderUno(st, r.view);
  else if (r.game === 'schach') renderChess(st, r.view);
  else if (r.game === 'vier') renderVier(st, r.view);
  else if (r.game === 'maedn') renderMaedn(st, r.view);
  else if (r.game === 'party') renderParty(st, r.view);
}
function setMode(st, mode) { if (st.dataset.mode !== mode) { st.dataset.mode = mode; st.innerHTML = ''; } }
function lobbyHTML() {
  const r = room, n = r.players.length, need = r.min;
  return `<h2>Warten auf Mitspieler</h2>
    <div class="seats">${r.players.map(p => `<span class="chip ${p.online ? '' : 'off'}">${esc(p.name)}${p.id === r.host ? ' ★' : ''}${p.id === r.me ? ' (du)' : ''}</span>`).join('')}</div>
    <p class="note">Freunde öffnen</p><div class="shareurl">${esc(location.host)}</div>
    <p class="note">und tippen bei „${esc(r.name)}“ auf Beitreten.${r.seats < 12 ? ` Es spielen bis zu ${r.seats}, alle weiteren schauen zu.` : ''}</p>
    ${isHost() ? `<div class="row" style="justify-content:center"><button class="btn" data-room="start" ${n < need ? 'disabled' : ''}>${n < need ? `Noch ${need - n} Spieler nötig` : 'Spiel starten'}</button>
      <button class="btn ghost" data-room="close">Runde auflösen</button></div>`
      : `<p class="status">${esc(nameOf(r.host))} startet das Spiel.</p>`}`;
}
function againHTML(label) {
  return isHost() ? `<button class="btn" data-room="start" ${room.players.length < room.min ? 'disabled' : ''}>${label}</button>`
    : `<p class="note">${esc(nameOf(room.host))} kann eine neue Runde starten.</p>`;
}
$('#room').addEventListener('click', e => {
  const b = e.target.closest('[data-room]');
  if (!b || b.disabled) return;
  const a = b.dataset.room;
  if (a === 'hub') send({ t: 'hub' });
  else if (a === 'leave') send({ t: 'leave' });
  else if (a === 'close') send({ t: 'close' });
  else if (a === 'start') send({ t: 'start' });
});

/* ---------- Letzte Karte ---------- */
const COLORNAME = { r: 'Rot', y: 'Gelb', g: 'Grün', b: 'Blau' };
const COLORVAR = { r: 'var(--cr)', y: 'var(--cy)', g: 'var(--cg)', b: 'var(--cb)' };
const SYM = { S: 'Ø', R: '⇆', D: '+2', W: '', F: '+4' };
function cardHTML(c, attrs = '', extra = '') {
  const col = c[0], v = c[1];
  if (col === 'w') return `<button class="card c-w ${extra}" ${attrs} aria-label="${v === 'F' ? 'Plus vier' : 'Farbwechsel'}"><span class="wheel"></span><span class="big">${SYM[v]}</span></button>`;
  const s = SYM[v] ?? v;
  return `<button class="card c-${col} ${extra}" ${attrs} aria-label="${COLORNAME[col]} ${s}"><span class="cn tl">${s}</span><span class="big">${s}</span><span class="cn br">${s}</span></button>`;
}
function renderUno(st, v) {
  setMode(st, 'uno');
  const me = room.me, seatedMe = v.seated.findIndex(x => x.id === me);
  const others = seatedMe >= 0 ? [...v.seated.slice(seatedMe + 1), ...v.seated.slice(0, seatedMe)] : v.seated;
  const playing = room.status === 'playing', myTurn = playing && v.turn === me;
  if (v.flash && (ui.flashSeen[room.id] ?? 0) < v.flash.at) {
    if (ui.flashSeen[room.id] !== undefined) toast(v.flash.id === me ? 'Letzte Karte!' : `${nameOf(v.flash.id)}: Letzte Karte!`, true);
    ui.flashSeen[room.id] = v.flash.at;
  } else if (ui.flashSeen[room.id] === undefined) ui.flashSeen[room.id] = v.flash ? v.flash.at : 0;
  let status;
  if (room.status === 'ended') status = v.winner ? (v.winner === me ? 'Du hast gewonnen!' : `${esc(nameOf(v.winner))} gewinnt!`) : 'Runde beendet';
  else if (myTurn) status = v.drew ? 'Gezogene Karte legen oder behalten' : 'Du bist dran';
  else status = `${esc(nameOf(v.turn))} ist dran`;
  const hand = v.hand.map(c => {
    const ok = v.playable.includes(c);
    return cardHTML(c, `data-uno="play" data-card="${c}" ${ok ? '' : 'disabled'}`, ok ? 'ok' : myTurn ? 'dim' : '');
  }).join('');
  st.innerHTML = `
    <div class="opps">${others.map(p => `<div class="opp ${playing && p.id === v.turn ? 'turn' : ''}"><div class="nm">${esc(nameOf(p.id))}</div><div class="cnt ${p.count === 1 ? 'last' : ''}">${p.count}</div></div>`).join('')}</div>
    <div class="piles">
      <div><button class="cardback ${myTurn && !v.drew ? 'can' : ''}" data-uno="draw" aria-label="Karte ziehen" ${myTurn && !v.drew ? '' : 'disabled'}><span>FSG</span></button><div class="pilecount">${v.deck} im Stapel</div></div>
      <div class="discard" style="--cur:${COLORVAR[v.color]}">${cardHTML(v.top, 'tabindex="-1" disabled')}<span class="ring"></span></div>
    </div>
    <div class="dir">${v.dir > 0 ? '↻ im Uhrzeigersinn' : '↺ gegen den Uhrzeigersinn'} · ${COLORNAME[v.color]}</div>
    <p class="status ${myTurn ? 'mine' : ''}">${status}</p>
    <p class="log">${esc(v.log)}</p>
    ${room.status === 'ended' ? againHTML('Neue Runde') : ''}
    ${isHost() && playing && !myTurn ? `<button class="btn ghost small" data-uno="skip">${esc(nameOf(v.turn))} überspringen</button>` : ''}
    <div class="handwrap" style="width:calc(100% + 32px)">
      <div class="bar"><b>${seatedMe >= 0 ? `Deine Hand · ${v.hand.length}` : 'Du schaust zu – alle Plätze sind besetzt.'}</b>
      ${myTurn && v.drew ? '<button class="btn small" data-uno="pass">Behalten &amp; weiter</button>' : ''}</div>
      <div class="hand">${hand}</div>
    </div>`;
}
let pendingWild = null;
function openColorPicker(card) {
  pendingWild = card;
  const p = $('#picker');
  p.innerHTML = `<div class="sheet" role="dialog" aria-label="Farbe wählen"><h2>Welche Farbe?</h2><div class="swatches">
    ${Object.keys(COLORNAME).map(c => `<button data-color="${c}" style="background:${COLORVAR[c]}">${COLORNAME[c]}</button>`).join('')}</div>
    <button class="btn ghost small" data-color="">Abbrechen</button></div>`;
  p.hidden = false;
}
$('#picker').addEventListener('click', e => {
  const b = e.target.closest('[data-color],[data-promo]');
  if (!b && e.target.id !== 'picker') return;
  $('#picker').hidden = true;
  if (b && b.dataset.color && pendingWild) act({ type: 'play', card: pendingWild, color: b.dataset.color });
  if (b && b.dataset.promo && ui.promo) act({ type: 'move', f: ui.promo[0], t: ui.promo[1], promo: b.dataset.promo });
  pendingWild = null; ui.promo = null;
});

/* ---------- Schach ---------- */
const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const glyph = p => `<span class="pc ${p[0] === 'w' ? 'pw' : 'pb'}">${GLYPH[p[1]]}&#xFE0E;</span>`;
function renderChess(st, v) {
  setMode(st, 'schach');
  const lastKey = JSON.stringify(v.last) + v.turn;
  if (ui.selKey !== lastKey) { ui.sel = null; ui.selKey = lastKey; ui.resign = false; }
  const flip = v.mine === 'b';
  const myTurn = room.status === 'playing' && v.mine === v.turn;
  const targets = ui.sel != null ? v.moves.filter(m => m[0] === ui.sel).map(m => m[1]) : [];
  const kingSq = v.check ? v.board.indexOf(v.turn + 'K') : -1;
  let cells = '';
  for (let i = 0; i < 64; i++) {
    const sq = flip ? 63 - i : i, r = sq >> 3, c = sq & 7, p = v.board[sq];
    const cls = ['sq', (r + c) % 2 ? 'd' : 'l'];
    if (v.last && v.last.includes(sq)) cls.push('last');
    if (sq === ui.sel) cls.push('sel');
    if (sq === kingSq) cls.push('check');
    const hint = targets.includes(sq) ? `<span class="hint ${p ? 'cap' : ''}"></span>` : '';
    cells += `<button class="${cls.join(' ')}" data-sq="${sq}" aria-label="${'abcdefgh'[c]}${8 - r}">${p ? glyph(p) : ''}${hint}</button>`;
  }
  const topCol = flip ? 'w' : 'b', botCol = flip ? 'b' : 'w';
  const bar = col => {
    const id = col === 'w' ? v.w : v.b;
    return `<div class="bar" style="width:min(100%,560px)"><span class="player ${room.status === 'playing' && v.turn === col ? 'turn' : ''}">
      <span class="dot" style="background:${col === 'w' ? '#fffaf0' : '#17131f'};border:2px solid var(--muted)"></span>${esc(nameOf(id))}${id === room.me ? ' (du)' : ''}</span>
      <span class="taken">${v.taken[col].map(glyph).join('')}</span></div>`;
  };
  let status;
  if (v.result) status = v.result.winner ? `${v.result.winner === v.mine ? 'Du gewinnst' : `${esc(nameOf(v.result.winner === 'w' ? v.w : v.b))} gewinnt`} – ${esc(v.result.reason)}` : esc(v.result.reason);
  else if (!v.mine) status = `${esc(nameOf(v.turn === 'w' ? v.w : v.b))} ist am Zug`;
  else status = myTurn ? (v.check ? 'Schach! Du bist dran' : 'Du bist dran') : 'Gegner ist am Zug';
  st.innerHTML = `${bar(topCol)}<div class="chess">${cells}</div>${bar(botCol)}
    <p class="status ${myTurn ? 'mine' : ''}">${status}</p><p class="log">${esc(v.log)}</p>
    ${!v.mine ? '<p class="note">Du schaust bei dieser Partie zu.</p>' : ''}
    ${room.status === 'ended' ? againHTML('Neue Partie (Farben tauschen)') : ''}
    ${room.status === 'playing' && v.mine ? `<button class="btn ${ui.resign ? 'danger' : 'ghost'} small" data-chess="resign">${ui.resign ? 'Wirklich aufgeben? Tippen zum Bestätigen' : 'Aufgeben'}</button>` : ''}`;
}

/* ---------- Vier gewinnt ---------- */
function renderVier(st, v) {
  setMode(st, 'vier');
  const myTurn = room.status === 'playing' && v.turn === room.me;
  const cells = v.board.map((x, i) => `<button data-col="${i % 7}" aria-label="Spalte ${i % 7 + 1}" class="${x ? 'p' + x : ''} ${v.win && v.win.includes(i) ? 'win' : ''} ${i === v.last ? 'lastc' : ''}"></button>`).join('');
  const pl = (id, n) => `<span class="player ${room.status === 'playing' && v.turn === id ? 'turn' : ''}"><span class="dot" style="background:${n ? 'var(--cy)' : 'var(--cr)'}"></span>${esc(nameOf(id))} · ${v.score[id] || 0}</span>`;
  let status;
  if (room.status === 'ended') status = v.winner ? (v.winner === room.me ? 'Du hast gewonnen!' : `${esc(nameOf(v.winner))} gewinnt!`) : 'Unentschieden';
  else status = myTurn ? 'Du bist dran – tippe eine Spalte' : `${esc(nameOf(v.turn))} ist dran`;
  st.innerHTML = `<div class="bar" style="width:min(100%,560px)">${pl(v.p[0], 0)}${pl(v.p[1], 1)}</div>
    <div class="c4 ${myTurn ? 'can' : ''}">${cells}</div>
    <p class="status ${myTurn ? 'mine' : ''}">${status}</p>
    ${v.mine < 0 ? '<p class="note">Du schaust bei dieser Partie zu.</p>' : ''}
    ${room.status === 'ended' ? againHTML('Nochmal spielen') : ''}`;
}

/* ---------- Mensch ärgere dich nicht ---------- */
const PATH = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
  [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10], [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5]];
const GOALS = [[[1, 5], [2, 5], [3, 5], [4, 5]], [[5, 1], [5, 2], [5, 3], [5, 4]], [[9, 5], [8, 5], [7, 5], [6, 5]], [[5, 9], [5, 8], [5, 7], [5, 6]]];
const BASES = [[[0, 0], [1, 0], [0, 1], [1, 1]], [[9, 0], [10, 0], [9, 1], [10, 1]], [[9, 9], [10, 9], [9, 10], [10, 10]], [[0, 9], [1, 9], [0, 10], [1, 10]]];
const MCOL = ['rot', 'blau', 'gruen', 'gelb'], MNAME = { rot: 'Rot', blau: 'Blau', gruen: 'Grün', gelb: 'Gelb' };
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function dieHTML(n, attrs, cls) { return `<button class="die ${cls}" ${attrs} aria-label="Würfel ${n || ''}">${[...Array(9)].map((_, i) => `<i class="${n && PIPS[n].includes(i) ? 'on' : ''}"></i>`).join('')}</button>`; }
function renderMaedn(st, v) {
  setMode(st, 'maedn');
  const cell = new Map(), k = (x, y) => x + ',' + y;
  PATH.forEach(([x, y], i) => cell.set(k(x, y), { cls: i % 10 === 0 ? `${MCOL[i / 10]} start` : '' }));
  GOALS.forEach((g, c) => g.forEach(([x, y]) => cell.set(k(x, y), { cls: MCOL[c] })));
  BASES.forEach((g, c) => g.forEach(([x, y]) => cell.set(k(x, y), { cls: MCOL[c] })));
  const myTurn = room.status === 'playing' && v.turn === room.me;
  v.pieces.forEach((pcs, seat) => {
    const c = v.board[seat], color = MCOL[c];
    pcs.forEach((pos, i) => {
      const [x, y] = pos < 0 ? BASES[c][i] : pos >= 40 ? GOALS[c][pos - 40] : PATH[(c * 10 + pos) % 40];
      const can = seat === v.mine && v.movable.includes(i);
      cell.get(k(x, y)).fig = `<span class="fig ${color} ${can ? 'can' : ''}" ${can ? `data-piece="${i}" role="button" aria-label="Figur ${i + 1} ziehen"` : ''}></span>`;
    });
  });
  let grid = '';
  for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
    const c = cell.get(k(x, y));
    grid += c ? `<div class="mf ${c.cls}">${c.fig || ''}</div>` : '<div></div>';
  }
  const players = v.seats.map((id, s) => `<span class="player ${room.status === 'playing' && v.turn === id ? 'turn' : ''}"><span class="dot" style="background:${['var(--cr)', 'var(--cb)', 'var(--cg)', 'var(--cy)'][v.board[s]]}"></span>${esc(nameOf(id))}</span>`).join('');
  const canRoll = myTurn && v.die === null;
  let status;
  if (room.status === 'ended') status = v.winner ? (v.winner === room.me ? 'Du hast gewonnen!' : `${esc(nameOf(v.winner))} gewinnt!`) : 'Spiel beendet';
  else if (myTurn) status = v.die === null ? 'Du bist dran – tippe auf den Würfel' : 'Tippe eine leuchtende Figur';
  else status = `${esc(nameOf(v.turn))} ist dran`;
  st.innerHTML = `<div class="bar" style="width:min(100%,560px);justify-content:center">${players}</div>
    <div class="maedn">${grid}</div>
    <div class="row" style="justify-content:center;gap:18px">${dieHTML(v.die ?? v.lastDie, canRoll ? 'data-md="roll"' : 'disabled', canRoll ? 'can' : v.die == null ? 'ghost' : '')}
      <div style="text-align:left"><p class="status ${myTurn ? 'mine' : ''}" style="text-align:left">${status}</p><p class="log" style="text-align:left">${esc(v.log)}</p></div></div>
    ${v.mine < 0 ? '<p class="note">Du schaust bei diesem Spiel zu.</p>' : ''}
    ${room.status === 'ended' ? againHTML('Nochmal spielen') : ''}`;
}

/* ---------- Minispiel-Party ---------- */
let stopMini = null, miniKey = null;
function endMini() { if (stopMini) { stopMini(); stopMini = null; } miniKey = null; }
function boardHTML(rows) {
  return `<div class="board">${rows.map(x => `<div class="r ${x.id === room.me ? 'me' : ''}"><span class="pl">${x.place ?? ''}</span><span>${esc(nameOf(x.id))}</span><span class="lbl">${esc(x.label ?? '')}</span><span class="pts">${x.pts != null ? (x.plus ? '+' : '') + x.pts : ''}</span></div>`).join('') || '<p class="note">Noch keine Ergebnisse.</p>'}</div>`;
}
function renderParty(st, v) {
  if (room.status === 'ended') {
    endMini(); setMode(st, 'party-end');
    let place = 0, prev = null;
    const rows = v.total.map((x, i) => { if (x.pts !== prev) { place = i; prev = x.pts; } return { id: x.id, place: place + 1, pts: x.pts, label: 'Punkte' }; });
    st.innerHTML = `<h2>Party vorbei</h2><p class="status">${rows.length ? `${esc(nameOf(rows[0].id))} gewinnt!` : ''}</p>
      <div style="width:min(100%,520px)">${boardHTML(rows)}</div><p class="note">${v.played} Minispiele gespielt</p>${againHTML('Neue Party')}`;
    return;
  }
  if (st.dataset.mode !== 'party') {
    endMini(); st.dataset.mode = 'party';
    st.innerHTML = '<div class="party"><div class="phead" id="phead"></div><div class="qarea" id="qarea"></div><div class="ptot" id="plive"></div><div class="ptot" id="ptot"></div><div class="row" id="pctl"></div></div>';
  }
  const m = v.mini;
  $('#phead').innerHTML = m ? `<div><h2>${esc(m.title)}</h2><span class="note">${v.phase === 'intro' ? 'Gleich geht’s los' : v.phase === 'results' ? 'Ergebnis' : 'Läuft'} · Minispiel ${v.phase === 'results' ? v.played : v.played + 1}</span></div>
    <span class="cd">${deadline ? '<span data-cd></span> s' : ''}</span>` : '';
  $('#ptot').innerHTML = '<span class="note" style="width:100%;text-align:center">Gesamtpunkte</span>' + v.total.map((x, i) => `<span class="chip">${i + 1}. ${esc(nameOf(x.id))} · ${x.pts}</span>`).join('');
  $('#pctl').innerHTML = isHost() ? '<button class="btn ghost small" data-party="skip">Minispiel überspringen</button><button class="btn ghost small" data-party="stop">Party beenden</button>' : '';
  const qa = $('#qarea');
  const k = [v.phase, m && m.key, v.played].join('|');
  if (v.phase === 'play') {
    const live = Object.entries(m.live || {}).sort((a, b) => b[1].v - a[1].v);
    $('#plive').innerHTML = live.map(([id, x], i) => `<span class="chip" ${id === room.me ? 'style="color:var(--accent)"' : ''}>${i + 1}. ${esc(nameOf(id))} · ${esc(x.label)}</span>`).join('');
    if (qa.dataset.k !== k) {
      endMini(); qa.innerHTML = '<div id="minihost" style="width:100%"></div>'; qa.dataset.k = k; miniKey = k;
      const left = v.left != null ? v.left : m.ms;
      stopMini = window.MiniGames.run(m.key, $('#minihost'), {
        seed: m.seed, ms: Math.max(1000, left),
        onLive: s => act({ type: 'live', v: s.v, label: s.label }),
        onFinal: s => act({ type: 'final', v: s.v, label: s.label }),
        peers: () => Object.entries((room.view && room.view.mini && room.view.mini.live) || {}).filter(([id]) => id !== room.me).map(([id, x]) => ({ name: nameOf(id), v: x.v })),
      });
    }
    return;
  }
  $('#plive').innerHTML = '';
  if (v.phase === 'intro') {
    endMini();
    patch(qa, `<p class="qtext">${esc(m.title)}</p><p class="qtext small" style="max-width:36ch">${esc(m.howto)}</p><p class="note">Los geht’s in <span data-cd></span> Sekunden</p>`, k);
    return;
  }
  if (v.phase === 'results') {
    endMini();
    const rows = v.results.map(x => ({ id: x.id, place: x.place, label: x.label, pts: x.pts, plus: true }));
    patch(qa, `<p class="qtext small">Platzierung: ${esc(m.title)}</p><div style="width:min(100%,520px)">${boardHTML(rows)}</div><p class="note">Nächstes Minispiel in <span data-cd></span> s</p>`, k);
  }
}

/* ---------- Klicks im Spiel ---------- */
$('#room').addEventListener('click', e => {
  const t = e.target;
  const uno = t.closest('[data-uno]');
  if (uno && !uno.disabled) {
    const a = uno.dataset.uno;
    if (a === 'play') { const c = uno.dataset.card; if (c[0] === 'w') openColorPicker(c); else act({ type: 'play', card: c }); }
    else act({ type: a });
    return;
  }
  const sqb = t.closest('[data-sq]');
  if (sqb) {
    const v = room.view, sq = Number(sqb.dataset.sq);
    if (room.status !== 'playing' || v.mine !== v.turn) return;
    const mv = ui.sel != null && v.moves.find(m => m[0] === ui.sel && m[1] === sq);
    if (mv) {
      if (mv[2]) {
        ui.promo = [mv[0], mv[1]];
        const p = $('#picker');
        p.innerHTML = `<div class="sheet"><h2>Umwandeln in …</h2><div class="swatches">${[['Q', 'Dame'], ['R', 'Turm'], ['B', 'Läufer'], ['N', 'Springer']].map(([k, n]) => `<button data-promo="${k}" style="background:var(--surface2)">${GLYPH[k]}&#xFE0E; ${n}</button>`).join('')}</div></div>`;
        p.hidden = false;
      } else act({ type: 'move', f: mv[0], t: mv[1] });
      ui.sel = null;
    } else ui.sel = v.moves.some(m => m[0] === sq) && ui.sel !== sq ? sq : null;
    renderRoom();
    return;
  }
  const ch = t.closest('[data-chess]');
  if (ch) { if (ui.resign) act({ type: 'resign' }); else { ui.resign = true; renderRoom(); setTimeout(() => { ui.resign = false; if (room && room.game === 'schach') renderRoom(); }, 4000); } return; }
  const col = t.closest('[data-col]');
  if (col) { act({ type: 'drop', col: Number(col.dataset.col) }); return; }
  if (t.closest('[data-md="roll"]')) { act({ type: 'roll' }); return; }
  const pc = t.closest('[data-piece]');
  if (pc) { act({ type: 'move', piece: Number(pc.dataset.piece) }); return; }
  const pt = t.closest('[data-party]');
  if (pt) act({ type: pt.dataset.party });
});

/* ---------- Start ---------- */
$('#nick').value = store.get('fsg.nick') || '';
renderTiles();
connect();
