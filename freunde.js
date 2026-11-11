// Freunde-Menü für den Game Hub und alle Spiele (z. B. Dungeon).
// Freundesliste mit Online-Status („spielt gerade …“), Anfragen, Chat und Einladungen zum Spielen.
// Im Hub nutzt es die bestehende Verbindung (send + msg), in eigenständigen Spielseiten öffnet es eine eigene.
(() => {
  const S = { opts: null, view: null, tab: 'list', chat: null, msgs: [], invites: [], ws: null, where: 'Game Hub', hidden: false, handlers: {}, pollT: null, busy: false, err: '' };
  const $ = (q, el = document) => el.querySelector(q);
  const h = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const konto = () => { try { const k = JSON.parse(localStorage.getItem('fsg.konto') || 'null'); return k && k.name && k.token ? k : null; } catch { return null; } };
  const emit = (ev, d) => (S.handlers[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } });
  async function api(action, body = {}) {
    const k = konto(); if (!k) return { error: 'Bitte melde dich im Game Hub an.' };
    try { const r = await fetch('/api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: k.name, token: k.token, ...body }) }); return await r.json().catch(() => ({ error: 'Fehler' })); }
    catch { return { error: 'Keine Verbindung zum Server.' }; }
  }
  const send = m => { if (S.opts && S.opts.send) S.opts.send(m); else if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(m)); };

  /* ---------- Stil (eigenständig, passt in Hub und Spiele) ---------- */
  const css = `
  #frw{position:fixed;z-index:9000;font-family:${'"Figtree",-apple-system,"Segoe UI",Roboto,sans-serif'};font-size:15px;color:#f4ede1}
  #frw .frb{width:52px;height:52px;border-radius:50%;border:2px solid #ffb54788;background:#262035ee;font-size:24px;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45);position:relative;color:#fff}
  #frw .frb i{position:absolute;right:-4px;top:-4px;min-width:20px;height:20px;border-radius:10px;background:#e5484d;color:#fff;font:700 12px/20px sans-serif;font-style:normal;padding:0 5px}
  #frw .frp{position:fixed;inset:auto;width:min(420px,calc(100vw - 20px));height:min(560px,calc(100vh - 40px));background:#1f1a2b;border:1px solid #3d3452;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}
  #frw .frh{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #3d3452;background:#262035}
  #frw .frh b{flex:1;font-size:17px}
  #frw button.x{background:none;border:0;color:#a99fbb;font-size:20px;cursor:pointer}
  #frw .tabs{display:flex;gap:6px;padding:8px 10px;border-bottom:1px solid #3d3452}
  #frw .tabs button{flex:1;border:1px solid #3d3452;background:#262035;color:#f4ede1;border-radius:10px;padding:7px 4px;font:inherit;font-size:13px;cursor:pointer}
  #frw .tabs button.on{background:#ffb547;color:#2a1a00;border-color:#ffb547;font-weight:700}
  #frw .body{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px;overscroll-behavior:contain;touch-action:pan-y}
  #frw .fr{display:flex;align-items:center;gap:10px;background:#262035;border:1px solid #3d3452;border-radius:12px;padding:9px 10px}
  #frw .dot{width:11px;height:11px;border-radius:50%;flex:none;background:#6b6280}#frw .dot.on{background:#27c06a;box-shadow:0 0 8px #27c06a}
  #frw .nm{flex:1;min-width:0}#frw .nm b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#frw .nm small{color:#a99fbb;font-size:12px}
  #frw .sb{border:1px solid #3d3452;background:#30293f;color:#f4ede1;border-radius:10px;padding:7px 9px;font:inherit;font-size:13px;cursor:pointer;position:relative}
  #frw .sb.go{background:#ffb547;color:#2a1a00;border-color:#ffb547;font-weight:700}#frw .sb.no{background:#3a2430;border-color:#5a3040}
  #frw .sb:disabled{opacity:.4}
  #frw .sb i{position:absolute;right:-5px;top:-6px;background:#e5484d;color:#fff;border-radius:9px;font:700 11px/16px sans-serif;font-style:normal;padding:0 5px}
  #frw .muted{color:#a99fbb;font-size:13px;line-height:1.5}
  #frw form{display:flex;gap:8px;padding:10px;border-top:1px solid #3d3452}
  #frw input{flex:1;min-width:0;background:#15121c;border:1px solid #3d3452;color:#f4ede1;border-radius:10px;padding:9px 10px;font:inherit;font-size:15px}
  #frw .msg{max-width:80%;padding:7px 10px;border-radius:12px;background:#30293f;align-self:flex-start;white-space:pre-wrap;word-break:break-word;line-height:1.4}
  #frw .msg.me{align-self:flex-end;background:#5a3f12;color:#fff}
  #frw .msg small{display:block;color:#a99fbb;font-size:11px;margin-top:2px}
  #frw .menu{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  #frw-inv{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 14px);transform:translateX(-50%);z-index:9100;display:flex;flex-direction:column;gap:8px;font-family:"Figtree",-apple-system,sans-serif}
  #frw-inv .frw-card{background:#262035;border:2px solid #ffb547;border-radius:14px;padding:12px 14px;color:#f4ede1;box-shadow:0 12px 30px rgba(0,0,0,.55);display:flex;align-items:center;gap:10px;min-width:min(360px,92vw)}
  #frw-inv .frw-card span{flex:1;line-height:1.4}#frw-inv button{border:0;border-radius:10px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}
  #frw-inv .ok{background:#ffb547;color:#2a1a00}#frw-inv .nok{background:#3a2430;color:#f4ede1}
  #frw-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 20px);transform:translateX(-50%);z-index:9200;background:#ffb547;color:#2a1a00;font:700 14px "Figtree",sans-serif;padding:10px 16px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:90vw;text-align:center}`;
  function toast(t) { let el = document.getElementById('frw-toast'); if (!el) { el = document.createElement('div'); el.id = 'frw-toast'; document.body.appendChild(el); } el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), 2800); }

  /* ---------- Darstellung ---------- */
  function badgeCount() { const v = S.view; return (v ? v.inc.length + v.friends.reduce((s, f) => s + (f.unread || 0), 0) : 0); }
  function placeBtn(root) { const p = S.opts.pos || 'tr', b = $('.frb', root); const st = p === 'bl' ? 'left:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px)' : p === 'tl' ? 'left:14px;top:calc(env(safe-area-inset-top,0px) + 14px)' : 'right:14px;top:calc(env(safe-area-inset-top,0px) + 14px)'; root.style.cssText = st; }
  function render() {
    let root = document.getElementById('frw');
    if (!root) { root = document.createElement('div'); root.id = 'frw'; document.body.appendChild(root); root.addEventListener('click', onClick); root.addEventListener('submit', onSubmit); ['keydown', 'keyup', 'pointerdown', 'touchstart'].forEach(ev => root.addEventListener(ev, e => e.stopPropagation(), { passive: true })); }
    root.hidden = S.hidden; placeBtn(root);
    const n = badgeCount(), open = !!S.openP;
    let html = `<button class="frb" data-f="toggle" aria-label="Freunde">👥${n ? `<i>${n > 9 ? '9+' : n}</i>` : ''}</button>`;
    if (open) {
      const pos = (S.opts.pos || 'tr') === 'bl' ? 'left:10px;bottom:76px' : (S.opts.pos === 'tl' ? 'left:10px;top:76px' : 'right:10px;top:76px');
      html += `<div class="frp" style="${pos}">`;
      if (S.chat) {
        const f = (S.view && S.view.friends.find(x => x.name === S.chat)) || { name: S.chat };
        html += `<div class="frh"><button class="x" data-f="back" aria-label="Zurück">←</button><span class="dot ${f.online ? 'on' : ''}"></span><b>${h(f.name)}</b><button class="sb go" data-f="invmenu" data-n="${h(f.name)}" ${f.online ? '' : 'disabled'}>🎮 Einladen</button><button class="x" data-f="toggle">✕</button></div>
          <div class="body" id="frmsgs">${S.inviteFor === f.name ? inviteMenu(f.name) : ''}${S.msgs.length ? S.msgs.map(m => `<div class="msg ${m.me ? 'me' : ''}">${h(m.x)}<small>${new Date(m.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') : '<div class="muted">Noch keine Nachrichten. Schreib die erste!</div>'}</div>
          <form data-f="chatform"><input name="t" maxlength="300" placeholder="Nachricht an ${h(f.name)} …" autocomplete="off" enterkeyhint="send"><button class="sb go">Senden</button></form>`;
      } else {
        const v = S.view, inc = v ? v.inc.length : 0;
        html += `<div class="frh"><b>👥 Freunde</b><button class="x" data-f="toggle" aria-label="Schließen">✕</button></div>
          <div class="tabs"><button class="${S.tab === 'list' ? 'on' : ''}" data-f="tab" data-t="list">Freunde${v ? ' (' + v.friends.length + ')' : ''}</button><button class="${S.tab === 'req' ? 'on' : ''}" data-f="tab" data-t="req">Anfragen${inc ? ' (' + inc + ')' : ''}</button><button class="${S.tab === 'add' ? 'on' : ''}" data-f="tab" data-t="add">Hinzufügen</button></div><div class="body">`;
        if (!konto()) html += `<div class="muted">Melde dich im Game Hub mit deinem Konto an, um Freunde hinzuzufügen, zu chatten und einzuladen.</div>`;
        else if (!v) html += `<div class="muted">Lade …</div>`;
        else if (S.tab === 'list') {
          if (!v.friends.length) html += `<div class="muted">Noch keine Freunde. Füge welche unter „Hinzufügen“ hinzu – mit ihrem Kontonamen.</div>`;
          for (const f of v.friends) html += `<div class="fr"><span class="dot ${f.online ? 'on' : ''}"></span><div class="nm"><b>${h(f.name)}</b><small>${f.online ? 'Online' + (f.where ? ' · ' + h(f.where) : '') : 'Offline'}</small></div>
            <button class="sb" data-f="chat" data-n="${h(f.name)}">💬${f.unread ? `<i>${f.unread}</i>` : ''}</button><button class="sb go" data-f="invmenu" data-n="${h(f.name)}" ${f.online ? '' : 'disabled'} title="Zum Spielen einladen">🎮</button></div>${S.inviteFor === f.name ? inviteMenu(f.name) : ''}`;
        } else if (S.tab === 'req') {
          if (!v.inc.length && !v.out.length) html += `<div class="muted">Keine offenen Anfragen.</div>`;
          for (const n2 of v.inc) html += `<div class="fr"><span class="dot"></span><div class="nm"><b>${h(n2)}</b><small>möchte mit dir befreundet sein</small></div><button class="sb go" data-f="ans" data-ok="1" data-n="${h(n2)}">Annehmen</button><button class="sb no" data-f="ans" data-ok="0" data-n="${h(n2)}">✕</button></div>`;
          for (const n2 of v.out) html += `<div class="fr"><span class="dot"></span><div class="nm"><b>${h(n2)}</b><small>Anfrage gesendet – wartet</small></div></div>`;
        } else {
          html += `<div class="muted">Gib den Kontonamen deines Freundes ein. Sobald er annimmt, seht ihr euch gegenseitig online, könnt chatten und euch zum Spielen einladen.</div>
            <form data-f="addform" style="padding:0;border:0"><input name="n" maxlength="20" placeholder="Kontoname" autocomplete="off"><button class="sb go">Anfrage senden</button></form>${S.err ? `<div class="muted" style="color:#ff8a7a">${h(S.err)}</div>` : ''}`;
          if (v.friends.length) html += `<div class="muted" style="margin-top:8px">Freund entfernen:</div>` + v.friends.map(f => `<div class="fr"><div class="nm"><b>${h(f.name)}</b></div><button class="sb no" data-f="rm" data-n="${h(f.name)}">Entfernen</button></div>`).join('');
        }
        html += `</div>`;
      }
      html += `</div>`;
    }
    root.innerHTML = html;
    const ml = $('#frmsgs', root); if (ml) ml.scrollTop = ml.scrollHeight;
  }
  function inviteMenu(name) {
    const games = (S.opts.games && S.opts.games()) || [S.where];
    return `<div class="menu">${games.map(g => `<button class="sb go" data-f="inv" data-n="${h(name)}" data-g="${h(g.game || g)}" data-r="${h(g.room || '')}">${h(g.label || g)}</button>`).join('')}<button class="sb" data-f="invmenu" data-n="">Abbrechen</button></div>`;
  }
  function showInvite(inv) {
    let box = document.getElementById('frw-inv'); if (!box) { box = document.createElement('div'); box.id = 'frw-inv'; document.body.appendChild(box); }
    const card = document.createElement('div'); card.className = 'frw-card';
    card.innerHTML = `<span>🎮 <b>${h(inv.from)}</b> lädt dich ein: <b>${h(inv.roomName || inv.game)}</b></span><button class="ok">Annehmen</button><button class="nok">✕</button>`;
    const done = ok => { card.remove(); send({ t: 'invite_answer', to: inv.from, ok, game: inv.game }); if (ok && S.opts.onAccept) S.opts.onAccept(inv); };
    card.querySelector('.ok').onclick = () => done(true); card.querySelector('.nok').onclick = () => done(false);
    box.appendChild(card); setTimeout(() => card.isConnected && done(false), 40000);
    try { navigator.vibrate && navigator.vibrate(60); } catch {}
  }

  /* ---------- Aktionen ---------- */
  async function refresh() { if (!konto()) { S.view = null; render(); return; } const r = await api('friends'); if (!r.error) { S.view = r; emit('change', r); } render(); }
  async function loadChat() { if (!S.chat) return; const r = await api('chat', { who: S.chat }); if (!r.error) { S.msgs = r.msgs || []; const f = S.view && S.view.friends.find(x => x.name === S.chat); if (f) f.unread = 0; } render(); }
  function onClick(e) {
    const b = e.target.closest('[data-f]'); if (!b) return; const f = b.dataset.f, n = b.dataset.n;
    if (f === 'toggle') { S.openP = !S.openP; S.chat = null; S.inviteFor = null; if (S.openP) refresh(); render(); }
    if (f === 'tab') { S.tab = b.dataset.t; S.err = ''; S.inviteFor = null; render(); }
    if (f === 'chat') { S.chat = n; S.msgs = []; S.inviteFor = null; render(); loadChat(); }
    if (f === 'back') { S.chat = null; S.inviteFor = null; refresh(); }
    if (f === 'invmenu') { S.inviteFor = n && S.inviteFor !== n ? n : null; render(); }
    if (f === 'inv') { send({ t: 'invite', to: n, game: b.dataset.g, room: b.dataset.r || null }); S.inviteFor = null; render(); }
    if (f === 'ans') api('friend_answer', { who: n, ok: b.dataset.ok === '1' }).then(r => { if (r.msg) toast(r.msg); refresh(); });
    if (f === 'rm') { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Wirklich?'; return; } api('friend_remove', { who: n }).then(refresh); }
  }
  function onSubmit(e) {
    e.preventDefault(); const form = e.target;
    if (form.dataset.f === 'chatform') { const i = form.querySelector('input'), t = i.value.trim(); if (!t) return; i.value = ''; api('chat_send', { who: S.chat, text: t }).then(r => { if (r.error) toast(r.error); else { S.msgs = r.msgs || S.msgs; render(); } }); }
    if (form.dataset.f === 'addform') { const n = form.querySelector('input').value.trim(); if (!n) return; api('friend_add', { who: n }).then(r => { S.err = r.error || ''; if (r.msg) toast(r.msg); if (!r.error) S.view = r; render(); }); }
  }
  // Nachrichten vom Server (im Hub von app.js weitergereicht)
  function msg(m) {
    if (!m || typeof m.t !== 'string') return false;
    if (m.t === 'fr_ping' || m.t === 'fr_req') { refresh(); if (m.t === 'fr_req') toast('👥 ' + m.from + ' möchte mit dir befreundet sein'); return true; }
    if (m.t === 'fr_msg') { if (S.openP && S.chat === m.from) loadChat(); else { refresh(); if (!S.openP) toast('💬 Neue Nachricht von ' + m.from); } return true; }
    if (m.t === 'invite') { showInvite(m); return true; }
    if (m.t === 'invite_sent') { toast('Einladung an ' + m.to + ' gesendet'); return true; }
    if (m.t === 'invite_answer') { toast(m.ok ? '✅ ' + m.from + ' hat angenommen!' : m.from + ' kann gerade nicht'); emit('answer', m); return true; }
    return false;
  }
  // Eigene Verbindung (für Spielseiten außerhalb des Hubs, z. B. Dungeon)
  function connect() {
    let key = localStorage.getItem('fsg.key'); if (!key) { key = Math.random().toString(16).slice(2) + Date.now().toString(16); localStorage.setItem('fsg.key', key); }
    const ws = S.ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', key: key + 'x', name: (konto() || {}).name || 'Gast', room: null }));
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } if (m.t === 'hi') { const k = konto(); if (k) ws.send(JSON.stringify({ t: 'konto', name: k.name, token: k.token, where: S.where })); return; } if (m.t === 'err' && m.msg) { toast(m.msg); return; } msg(m); };
    ws.onclose = () => setTimeout(connect, 3000);
  }
  window.Freunde = {
    init(opts) { S.opts = opts || {}; S.where = S.opts.where || S.where; if (!document.getElementById('frw-css')) { const st = document.createElement('style'); st.id = 'frw-css'; st.textContent = css; document.head.appendChild(st); }
      if (!S.opts.send) connect(); render(); refresh(); clearInterval(S.pollT); S.pollT = setInterval(() => { if (!document.hidden) { refresh(); if (S.openP && S.chat) loadChat(); } }, 30000); },
    msg, refresh, toast,
    list: () => S.view ? S.view.friends : [],
    invite: (name, game, room) => send({ t: 'invite', to: name, game, room: room || null }),
    setWhere(w) { if (w === S.where) return; S.where = w; send({ t: 'where', g: w }); },
    setHidden(v) { if (S.hidden === !!v) return; S.hidden = !!v; if (S.hidden) S.openP = false; render(); },
    on(ev, fn) { (S.handlers[ev] = S.handlers[ev] || []).push(fn); },
    loggedIn: () => !!konto(),
  };
})();
