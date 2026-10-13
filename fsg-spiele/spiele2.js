'use strict';
// FSG Spieleabend – Montagsmaler, Stadt-Land-Fluss, Wer ist der Spion?, Kniffel (Browser-Seite)
// Nutzt die Helfer aus app.js (room, act, esc, nameOf, isHost, againHTML, boardHTML, dieHTML, toast).
(function () {
  const q = s => document.querySelector(s);
  // Inhalt nur ersetzen, wenn er sich geändert hat – so bleiben Eingabefelder und Fokus erhalten
  function set(sel, html) { const e = typeof sel === 'string' ? q(sel) : sel; if (e && e.dataset.h !== html) { e.innerHTML = html; e.dataset.h = html; } }
  function skel(st, mode, html) { if (st.dataset.mode !== mode) { st.dataset.mode = mode; delete st.dataset.h; st.innerHTML = html; return true; } return false; }
  const cd = left => (left != null ? '<span data-cd></span> s' : '');
  const me = () => room.me;
  const chips = (list, extra = () => '') => list.map((x, i) => `<span class="chip ${x.id === me() ? 'me' : ''}">${i + 1}. ${esc(nameOf(x.id))} · ${x.pts}${extra(x)}</span>`).join('');
  function finalBoard(st, mode, title, list, label, again) {
    let place = 0, prev = null;
    const rows = list.map((x, i) => { if (x.pts !== prev) { place = i; prev = x.pts; } return { id: x.id, place: place + 1, pts: x.pts, label }; });
    skel(st, mode, '');
    set(st, `<div class="g2"><h2 style="text-align:center">${esc(title)}</h2>
      <p class="status">${!rows.length ? '' : rows.length > 1 && rows[1].pts === rows[0].pts ? 'Unentschieden!' : rows[0].id === me() ? 'Du gewinnst!' : `${esc(nameOf(rows[0].id))} gewinnt!`}</p>
      <div style="width:min(100%,520px);margin:0 auto">${boardHTML(rows)}</div><div class="row" style="justify-content:center">${againHTML(again)}</div></div>`);
  }

  /* ================= Montagsmaler ================= */
  const COLORS = ['#17131f', '#e5484d', '#f28c28', '#f2be1a', '#27a06a', '#3b7ad6', '#8b5cf6', '#8a5a3c', '#f4a6c0', '#ffffff'];
  const WIDTHS = [4, 10, 24];
  const M = { turn: -1, sv: -1, strokes: [], color: 0, width: 1, cur: null, buf: [], flushT: null, cv: null, ctx: null, v: null };
  const npts = strokes => strokes.reduce((n, s) => n + s[2].length, 0);
  function drawStroke(s, from) {
    const ctx = M.ctx; if (!ctx) return;
    const [c, w, p] = s;
    ctx.strokeStyle = ctx.fillStyle = COLORS[c]; ctx.lineWidth = WIDTHS[w]; ctx.lineCap = ctx.lineJoin = 'round';
    if (p.length === 2) { ctx.beginPath(); ctx.arc(p[0], p[1], WIDTHS[w] / 2, 0, 7); ctx.fill(); return; }
    const k = Math.max(0, from - 2);
    ctx.beginPath(); ctx.moveTo(p[k], p[k + 1]);
    for (let i = k + 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.stroke();
  }
  function redraw() {
    const ctx = M.ctx; if (!ctx) return;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 600);
    M.strokes.forEach(s => drawStroke(s, 0));
  }
  const canDraw = () => M.v && M.v.phase === 'draw' && M.v.drawer === me() && room && room.status === 'playing';
  function flush() {
    if (M.cur == null || !M.buf.length) return;
    const s = M.strokes[M.cur];
    act({ type: 'pts', i: M.cur, c: s[0], w: s[1], p: M.buf }); M.buf = [];
  }
  function bindCanvas(cv) {
    M.cv = cv; M.ctx = cv.getContext('2d');
    const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 800), Math.round((e.clientY - r.top) / r.height * 600)]; };
    cv.addEventListener('pointerdown', e => {
      if (!canDraw()) return;
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch {}
      const [x, y] = pos(e);
      M.cur = M.strokes.length; M.strokes.push([M.color, M.width, [x, y]]); M.buf = [x, y];
      drawStroke(M.strokes[M.cur], 0);
      clearInterval(M.flushT); M.flushT = setInterval(flush, 80);
    });
    cv.addEventListener('pointermove', e => {
      if (M.cur == null) return;
      e.preventDefault();
      const s = M.strokes[M.cur], p = s[2], before = p.length;
      for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) {
        const [x, y] = pos(ev), lx = p[p.length - 2], ly = p[p.length - 1];
        if (Math.abs(x - lx) + Math.abs(y - ly) < 3) continue;
        p.push(x, y); M.buf.push(x, y);
      }
      if (p.length > before) drawStroke(s, before);
      if (M.buf.length >= 380) flush();
    });
    const up = () => { if (M.cur == null) return; flush(); clearInterval(M.flushT); M.cur = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
  }
  function maler(st, v) {
    M.v = v;
    if (room.status === 'ended') { M.turn = -1; finalBoard(st, 'maler-end', 'Montagsmaler – Endstand', v.score, 'Punkte', 'Nochmal spielen'); return; }
    if (skel(st, 'maler', `<div class="g2 maler">
        <div class="g2head"><div id="mlTitle"></div><span class="cd" id="mlCd"></span></div>
        <div class="ml-main">
          <div class="ml-board">
            <div class="ml-canvas"><canvas id="mlCv" width="800" height="600"></canvas><div class="ml-over" id="mlOver" hidden></div></div>
            <div class="ml-tools" id="mlTools" hidden>
              ${COLORS.map((c, i) => `<button class="ml-col" data-mc="${i}" style="background:${c}" aria-label="Farbe ${i + 1}${i === 9 ? ' (Radierer)' : ''}">${i === 9 ? '⌫' : ''}</button>`).join('')}
              <span class="ml-sep"></span>
              ${WIDTHS.map((w, i) => `<button class="ml-w" data-mw="${i}" aria-label="Strichstärke ${i + 1}"><i style="width:${Math.max(6, w * 0.8)}px;height:${Math.max(6, w * 0.8)}px"></i></button>`).join('')}
              <span class="ml-sep"></span>
              <button class="btn ghost small" data-mt="undo">↶ Zurück</button><button class="btn ghost small" data-mt="clear">Alles löschen</button>
            </div>
          </div>
          <div class="ml-side">
            <form class="g2-form" id="mlForm" hidden><input id="mlIn" maxlength="40" placeholder="Dein Tipp …" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="send"><button class="btn small">Raten</button></form>
            <div class="ml-chat" id="mlChat"></div>
            <div class="ptot" id="mlScore"></div>
          </div>
        </div>
        <div class="row" id="mlCtl" style="justify-content:center"></div></div>`)) {
      bindCanvas(q('#mlCv')); M.turn = -1;
      q('#mlForm').addEventListener('submit', e => { e.preventDefault(); const i = q('#mlIn'), t = i.value.trim(); if (t) act({ type: 'guess', text: t }); i.value = ''; i.focus(); });
    }
    // Bild abgleichen
    const drawing = v.drawer === me() && v.phase === 'draw';
    if (v.turnNo !== M.turn) { M.turn = v.turnNo; M.sv = v.sv; M.strokes = v.strokes.map(s => [s[0], s[1], [...s[2]]]); M.cur = null; redraw(); }
    else if (M.cur == null && (v.sv !== M.sv && !drawing || npts(v.strokes) > npts(M.strokes))) { M.sv = v.sv; M.strokes = v.strokes.map(s => [s[0], s[1], [...s[2]]]); redraw(); }
    const drawer = esc(nameOf(v.drawer)), turnTxt = `Zug ${v.turnNo} von ${v.total}`;
    let title;
    if (v.phase === 'choose') title = v.drawer === me() ? `<h2>Wähle ein Wort</h2><span class="note">${turnTxt}</span>` : `<h2>${drawer} wählt ein Wort …</h2><span class="note">${turnTxt}</span>`;
    else if (v.phase === 'draw') title = v.drawer === me() ? `<h2>Zeichne: <span class="acc">${esc(v.word)}</span></h2><span class="note">Nicht schreiben – nur malen! · ${turnTxt}</span>`
      : v.word ? `<h2>Richtig: <span class="acc">${esc(v.word)}</span></h2><span class="note">${drawer} zeichnet · ${turnTxt}</span>`
        : `<h2 class="ml-pat">${v.pattern.map(ch => (ch === '_' ? '<i>_</i>' : `<b>${esc(ch)}</b>`)).join('')} <small>${v.pattern.length}</small></h2><span class="note">${drawer} zeichnet · ${turnTxt}</span>`;
    else title = `<h2>Das Wort war: <span class="acc">${esc(v.word || '')}</span></h2><span class="note">${turnTxt}</span>`;
    set('#mlTitle', title);
    set('#mlCd', cd(v.left));
    const over = q('#mlOver');
    if (v.phase === 'choose') {
      over.hidden = false;
      set(over, v.choices ? `<p class="qtext small">Was möchtest du zeichnen?</p><div class="ml-pick">${v.choices.map((w, i) => `<button class="btn" data-mp="${i}">${esc(w)}</button>`).join('')}</div><p class="note">Sonst wird in <span data-cd></span> s eins ausgewählt.</p>`
        : `<p class="qtext small">${drawer} sucht sich gerade ein Wort aus …</p>`);
    } else if (v.phase === 'reveal') {
      over.hidden = false;
      const g = v.gain || { guessed: {}, drawer: 0 };
      const rows = Object.entries(g.guessed).map(([id, p]) => `<span class="chip">${esc(nameOf(id))} +${p}</span>`).join('');
      set(over, `<p class="qtext">${esc(v.word || '–')}</p><div class="ptot">${rows || '<span class="note">Keiner hat es erraten.</span>'}${g.drawer ? `<span class="chip">✎ ${drawer} +${g.drawer}</span>` : ''}</div><p class="note">Weiter in <span data-cd></span> s</p>`);
    } else over.hidden = true;
    q('#mlTools').hidden = !drawing;
    document.querySelectorAll('[data-mc]').forEach(b => b.classList.toggle('on', Number(b.dataset.mc) === M.color));
    document.querySelectorAll('[data-mw]').forEach(b => b.classList.toggle('on', Number(b.dataset.mw) === M.width));
    q('#mlCv').classList.toggle('can', drawing);
    const canGuess = v.phase === 'draw' && v.drawer !== me() && !v.word;
    const form = q('#mlForm'); if (form.hidden === canGuess) form.hidden = !canGuess;
    const chat = q('#mlChat'), atEnd = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 8;
    set(chat, v.chat.slice(-30).map(c => c.sys ? `<p class="sys">${esc(c.text)}</p>` : `<p class="${c.ok ? 'ok' : ''}"><b>${esc(nameOf(c.id))}</b> ${esc(c.text)}</p>`).join('') || '<p class="sys">Hier erscheinen die Tipps.</p>');
    if (atEnd) chat.scrollTop = chat.scrollHeight;
    set('#mlScore', chips(v.score, x => (x.id === v.drawer ? ' ✎' : v.guessed.includes(x.id) ? ' ✓' : '')));
    set('#mlCtl', (isHost() || drawing ? `<button class="btn ghost small" data-mt="skip">${drawing ? 'Zug beenden' : 'Zug überspringen'}</button>` : '') + (isHost() ? '<button class="btn ghost small" data-mt="stop">Spiel beenden</button>' : ''));
  }
  function malerCast(d) {
    if (!M.v || d.turn !== M.turn) return;
    if (d.op === 'set') { if (M.cur != null && d.by === me()) M.cur = null; M.sv = d.sv; M.strokes = d.strokes.map(s => [s[0], s[1], [...s[2]]]); redraw(); return; }
    if (d.op === 'pts') {
      if (d.by === me() || d.sv !== M.sv) return;
      if (d.i === M.strokes.length) { M.strokes.push([d.c, d.w, [...d.p]]); drawStroke(M.strokes[d.i], 0); }
      else if (d.i === M.strokes.length - 1) { const p = M.strokes[d.i][2], from = p.length; p.push(...d.p); drawStroke(M.strokes[d.i], from); }
    }
  }

  /* ================= Stadt-Land-Fluss ================= */
  function slf(st, v) {
    if (room.status === 'ended') { finalBoard(st, 'slf-end', 'Stadt-Land-Fluss – Endstand', v.total, 'Punkte', 'Nochmal spielen'); return; }
    const head = `<div class="g2head"><div><h2>Runde ${v.round} von ${v.rounds}</h2><span class="note">Buchstabe ${esc(v.letter)}</span></div><span class="cd" id="slCd"></span></div>`;
    if (v.phase === 'write' || v.phase === 'stopping') {
      if (skel(st, 'slf-w-' + v.round, `<div class="g2 slf">${head}
          <div class="slf-letter">${esc(v.letter)}</div>
          <div id="slMsg" class="slf-msg"></div>
          ${v.inRound ? `<form class="slf-form" id="slForm" autocomplete="off">${v.cats.map((c, i) => `<label class="slf-f"><span>${esc(c)}</span><input data-ci="${i}" maxlength="30" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="${esc(v.letter)} …"></label>`).join('')}</form>
          <button class="btn slf-stop" id="slStop" type="button" disabled>STOPP!</button>` : '<p class="note">Du steigst in der nächsten Runde ein.</p>'}
          <div class="ptot" id="slProg"></div></div>`) && v.inRound) {
        const inputs = [...st.querySelectorAll('[data-ci]')];
        if (v.mine) inputs.forEach((x, i) => (x.value = v.mine[i] || ''));
        const vals = () => inputs.map(x => x.value);
        const upd = () => { q('#slStop').disabled = vals().some(x => !x.trim()); };
        upd();
        q('#slForm').addEventListener('input', () => { upd(); act({ type: 'ans', a: vals() }); });
        q('#slForm').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const i = inputs.indexOf(e.target); if (inputs[i + 1]) inputs[i + 1].focus(); else e.target.blur(); } });
        q('#slStop').addEventListener('click', () => act({ type: 'stop', a: vals() }));
      }
      set('#slCd', cd(v.left));
      set('#slMsg', v.phase === 'stopping' ? `<b>${v.stoppedBy === me() ? 'Du hast' : esc(nameOf(v.stoppedBy)) + ' hat'} STOPP gerufen!</b> Noch <span data-cd></span> Sekunden.` : '');
      const stop = q('#slStop'); if (stop && v.phase === 'stopping') stop.hidden = true;
      set('#slProg', v.progress.map(p => `<span class="chip ${p.id === me() ? 'me' : ''}">${esc(nameOf(p.id))} ${p.n}/${v.cats.length}</span>`).join(''));
      return;
    }
    skel(st, 'slf-r', '<div class="g2 slf" id="slRev"></div>');
    const scoring = v.phase === 'score', mine = v.inRound;
    const cats = v.cats.map((c, ci) => `<div class="slf-cat"><b>${esc(c)}</b><div class="slf-ans">${v.table[ci].map(x => {
      const cls = !x.t ? 'empty' : x.ok ? 'ok' : 'bad';
      const can = !scoring && mine && x.id !== me() && x.t;
      return `<button class="slf-a ${cls} ${x.me ? 'flagged' : ''} ${x.id === me() ? 'own' : ''}" ${can ? `data-sf="${x.id}" data-ci="${ci}"` : 'disabled'}>
        <small>${esc(nameOf(x.id))}</small><span>${x.t ? esc(x.t) : '—'}</span>
        ${scoring ? `<em>${x.pts ? '+' + x.pts : '0'}</em>` : x.t && !x.auto ? '<em>✗</em>' : x.flags ? `<em>✗ ${x.flags}/${v.need}</em>` : ''}</button>`;
    }).join('')}</div></div>`).join('');
    const nReady = v.ready.length, iReady = v.ready.includes(me());
    set('#slRev', `<div class="g2head"><div><h2>${scoring ? 'Auswertung' : 'Antworten prüfen'} · ${esc(v.letter)}</h2><span class="note">Runde ${v.round} von ${v.rounds}</span></div></div>
      <p class="note">${scoring ? 'Allein in der Kategorie: 20 · einzigartig: 10 · doppelt: 5' : `Tippe auf eine Antwort, die nicht zählen soll. Ab ${v.need} ${v.need === 1 ? 'Stimme' : 'Stimmen'} wird sie gestrichen. Falscher Anfangsbuchstabe zählt automatisch nicht.`}</p>
      <div class="slf-cats">${cats}</div>
      ${scoring ? `<div class="ptot">${Object.entries(v.gain).sort((a, b) => b[1] - a[1]).map(([id, p]) => `<span class="chip ${id === me() ? 'me' : ''}">${esc(nameOf(id))} +${p}</span>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center">
        ${!scoring && mine ? `<button class="btn ${iReady ? 'ghost' : ''}" data-sl="ready">${iReady ? 'Doch noch nicht fertig' : 'Passt so'} (${nReady}/${v.part.length})</button>` : ''}
        ${!scoring && isHost() ? '<button class="btn ghost" data-sl="score">Jetzt auswerten</button>' : ''}
        ${scoring && isHost() ? `<button class="btn" data-sl="next">${v.round >= v.rounds ? 'Zum Endstand' : 'Nächste Runde'}</button>` : ''}
        ${scoring && !isHost() ? `<p class="note">${esc(nameOf(room.host))} startet die nächste Runde.</p>` : ''}
        ${isHost() ? '<button class="btn ghost small" data-sl="end">Spiel beenden</button>' : ''}
      </div>
      <span class="note" style="text-align:center">Gesamtpunkte</span><div class="ptot">${chips(v.total)}</div>`);
  }

  /* ================= Wer ist der Spion? ================= */
  const SP = { round: -1, show: false };
  function spion(st, v) {
    if (room.status === 'ended') { finalBoard(st, 'spion-end', 'Wer ist der Spion? – Endstand', v.score, 'Punkte', 'Nochmal spielen'); return; }
    if (skel(st, 'spion-' + v.round, `<div class="g2 spion">
        <div class="g2head"><div><h2>Runde ${v.round}</h2><span class="note" id="spSub"></span></div><span class="cd" id="spCd"></span></div>
        <button class="sp-card" id="spCard" type="button"></button>
        <div id="spMain" class="sp-main"></div>
        <form class="g2-form" id="spForm" hidden><input id="spIn" maxlength="30" placeholder="Dein Hinweis …" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="send"><button class="btn small">Senden</button></form>
        <div class="sp-clues" id="spClues"></div>
        <span class="note" style="text-align:center">Punkte</span><div class="ptot" id="spScore"></div>
        <div class="row" id="spCtl" style="justify-content:center"></div></div>`)) {
      SP.show = false;
      q('#spCard').addEventListener('click', () => { SP.show = !SP.show; spion(st, room.view); });
      q('#spForm').addEventListener('submit', e => { e.preventDefault(); const i = q('#spIn'), t = i.value.trim(); if (t) { act({ type: 'clue', text: t }); i.value = ''; } });
    }
    const open = v.phase === 'reveal';
    set('#spSub', `Kategorie: ${esc(v.cat)}`);
    set('#spCd', cd(v.left));
    let card;
    if (!v.role) card = '<span class="sp-k">Du schaust zu</span><span class="note">Ab der nächsten Runde spielst du mit.</span>';
    else if (!SP.show && !open) card = `<span class="sp-k">Deine Rolle</span><b class="sp-w">Tippen zum Aufdecken</b><span class="note">Halt das iPad so, dass keiner mitliest.</span>`;
    else if (v.role === 'spy') card = `<span class="sp-k">Du bist der</span><b class="sp-w spy">SPION</b><span class="note">Kategorie: ${esc(v.cat)}. Finde das Wort heraus, ohne aufzufliegen.${open ? '' : ' Tippen zum Verdecken.'}</span>`;
    else card = `<span class="sp-k">Das geheime Wort</span><b class="sp-w">${esc(v.word)}</b><span class="note">Kategorie: ${esc(v.cat)}. Einer von euch kennt es nicht.${open ? '' : ' Tippen zum Verdecken.'}</span>`;
    set('#spCard', card);
    q('#spCard').classList.toggle('spy', v.role === 'spy' && (SP.show || open));
    let main = '';
    const myTurn = v.phase === 'clue' && v.turn === me();
    if (v.phase === 'clue') main = myTurn ? `<p class="status mine">Du bist dran!</p><p class="note">Gib einen Hinweis zum Wort – nicht zu offensichtlich, sonst errät der Spion es.</p>`
      : `<p class="status">${esc(nameOf(v.turn))} gibt einen Hinweis …</p><p class="note">${v.clues.length + 1}. von ${v.total} Hinweisen</p>`;
    else if (v.phase === 'vote') {
      main = `<p class="status ${v.myVote ? '' : 'mine'}">Wer ist der Spion?</p><p class="note">${v.voted.length} von ${v.part.length} haben abgestimmt. Du kannst deine Stimme noch ändern.</p>
        ${v.inRound ? `<div class="sp-vote">${v.part.filter(id => id !== me()).map(id => `<button class="btn ${v.myVote === id ? '' : 'ghost'}" data-sp="${id}">${esc(nameOf(id))}${v.voted.includes(id) ? ' ✓' : ''}</button>`).join('')}</div>` : ''}`;
    } else if (v.phase === 'guess') {
      main = v.role === 'spy' ? `<p class="status mine">Du wurdest entlarvt!</p><p class="note">Letzte Chance: Welches Wort war es? Wenn du richtig rätst, gewinnst du trotzdem.</p>
          <div class="sp-vote">${v.options.map(w => `<button class="btn ghost" data-sg="${esc(w)}">${esc(w)}</button>`).join('')}</div>`
        : `<p class="status">${esc(nameOf(v.accused))} wurde entlarvt!</p><p class="note">${esc(nameOf(v.accused))} darf jetzt noch das geheime Wort raten …</p>`;
    } else if (open) {
      const r = v.result || {}, spyWin = r.win === 'spy';
      const why = { tie: 'Ihr wart euch nicht einig.', wrong: `Ihr habt ${esc(nameOf(v.accused))} verdächtigt – falsch!`, guessed: `Entlarvt, aber das Wort „${esc(v.word)}“ richtig geraten.`,
        caught: `Entlarvt und falsch geraten („${esc(v.guess || '')}“).`, noguess: 'Entlarvt und keine Antwort gegeben.', left: 'Der Spion hat das Spiel verlassen.', few: 'Zu wenige Spieler übrig.' }[r.why] || '';
      const votes = Object.entries(v.votes || {}).map(([a, b]) => `<span class="chip">${esc(nameOf(a))} → ${esc(nameOf(b))}</span>`).join('');
      main = `<p class="status ${spyWin ? '' : 'mine'}">${spyWin ? `Der Spion ${esc(nameOf(v.spy))} gewinnt!` : `Ihr habt den Spion ${esc(nameOf(v.spy))} erwischt!`}</p>
        <p class="note">${why} Das Wort war <b>${esc(v.word)}</b>.</p><div class="ptot">${votes}</div>`;
    }
    set('#spMain', main);
    const form = q('#spForm'); if (form.hidden === myTurn) { form.hidden = !myTurn; if (myTurn) q('#spIn').focus(); }
    set('#spClues', v.clues.length ? v.clues.map((c, i) => `${i && i % v.part.length === 0 ? '<hr>' : ''}<p><b>${esc(nameOf(c.id))}</b> ${esc(c.text)}${open && c.id === v.spy ? ' <span class="pill">Spion</span>' : ''}</p>`).join('') : '<p class="note">Noch keine Hinweise.</p>');
    set('#spScore', chips(v.score));
    set('#spCtl', isHost() ? `${open ? '<button class="btn" data-sl2="next">Nächste Runde</button>' : ''}<button class="btn ghost small" data-sl2="end">Spiel beenden</button>` : open ? `<p class="note">${esc(nameOf(room.host))} startet die nächste Runde.</p>` : '');
  }

  /* ================= Kniffel ================= */
  const KN = { rollId: -1 };
  function kniffel(st, v) {
    skel(st, 'kniffel', '<div class="g2 kn" id="knRoot"></div>');
    const myTurn = v.turn === me(), playing = room.status === 'playing';
    const anim = v.rollId !== KN.rollId && KN.rollId !== -1; KN.rollId = v.rollId;
    const dice = v.dice.map((d, i) => dieHTML(d, myTurn && v.rolls > 0 && v.rolls < 3 ? `data-kh="${i}"` : 'disabled',
      `${v.held[i] ? 'held' : ''} ${anim && !v.held[i] ? 'roll' : ''} ${d ? '' : 'ghost'}`)).join('');
    let status;
    if (!playing) status = v.winner ? (v.winner === me() ? 'Du hast gewonnen!' : `${esc(nameOf(v.winner))} gewinnt!`) : 'Spiel beendet';
    else if (myTurn) status = v.rolls === 0 ? 'Du bist dran – würfle!' : v.rolls < 3 ? 'Tippe Würfel zum Festhalten oder trag ein Feld ein' : 'Trag jetzt ein Feld ein';
    else status = `${esc(nameOf(v.turn))} ist dran`;
    const head = v.order.map(id => `<th class="${id === v.turn ? 'cur' : ''} ${id === me() ? 'me' : ''}">${esc(nameOf(id))}</th>`).join('');
    const cell = (id, k) => {
      const val = v.sheet[id][k];
      if (val != null) return `<td class="${v.last && v.last.id === id && v.last.cat === k ? 'just' : ''}">${val === 0 ? '<span class="zero">–</span>' : val}</td>`;
      if (id === me() && v.preview && k in v.preview) return `<td><button class="kn-pick ${v.preview[k] ? '' : 'nil'}" data-kc="${k}">${v.preview[k]}</button></td>`;
      return '<td></td>';
    };
    const row = (k, label) => `<tr><th>${label}</th>${v.order.map(id => cell(id, k)).join('')}</tr>`;
    const sum = (label, f, cls = '') => `<tr class="sum ${cls}"><th>${label}</th>${v.order.map(id => `<td>${f(v.sums[id])}</td>`).join('')}</tr>`;
    set('#knRoot', `<div class="kn-top">
        <div class="kn-dice ${myTurn ? 'can' : ''}">${dice}</div>
        <div class="row" style="justify-content:center">${myTurn ? `<button class="btn" data-kn="roll" ${v.rolls >= 3 ? 'disabled' : ''}>${v.rolls === 0 ? 'Würfeln' : `Nochmal würfeln (${3 - v.rolls} übrig)`}</button>` : ''}</div>
        <p class="status ${myTurn ? 'mine' : ''}">${status}</p><p class="log">${esc(v.log)}</p>
        ${!v.mine && playing ? '<p class="note">Du schaust bei diesem Spiel zu.</p>' : ''}
        ${!playing ? `<div class="row" style="justify-content:center">${againHTML('Nochmal spielen')}</div>` : ''}
      </div>
      <div class="kn-wrap"><table class="kn-sheet"><thead><tr><th></th>${head}</tr></thead><tbody>
        ${v.cats.slice(0, 6).map(([k, l]) => row(k, l)).join('')}
        ${sum('Summe oben', s => s.up)}${sum('Bonus (ab 63)', s => (s.bonus ? '+35' : `<span class="zero">noch ${63 - s.up}</span>`))}
        ${v.cats.slice(6).map(([k, l]) => row(k, l)).join('')}
        ${sum('Gesamt', s => s.total, 'total')}
      </tbody></table></div>
      ${isHost() && playing ? '<div class="row" style="justify-content:center"><button class="btn ghost small" data-kn="end">Spiel beenden</button></div>' : ''}`);
  }

  /* ================= Klicks ================= */
  document.getElementById('room').addEventListener('click', e => {
    const t = e.target;
    let b;
    if ((b = t.closest('[data-mc]'))) { M.color = Number(b.dataset.mc); if (M.color === 9 && M.width < 2) M.width = 2; maler($('#stage'), room.view); return; }
    if ((b = t.closest('[data-mw]'))) { M.width = Number(b.dataset.mw); maler($('#stage'), room.view); return; }
    if ((b = t.closest('[data-mp]'))) { act({ type: 'pick', i: Number(b.dataset.mp) }); return; }
    if ((b = t.closest('[data-mt]'))) {
      const a = b.dataset.mt;
      if (a === 'undo') { if (!canDraw() || !M.strokes.length) return; M.strokes.pop(); redraw(); }
      if (a === 'clear') { if (!canDraw()) return; M.strokes = []; redraw(); }
      act({ type: a }); return;
    }
    if ((b = t.closest('[data-sf]'))) { act({ type: 'flag', id: b.dataset.sf, ci: Number(b.dataset.ci) }); return; }
    if ((b = t.closest('[data-sl]'))) { act({ type: b.dataset.sl }); return; }
    if ((b = t.closest('[data-sp]'))) { act({ type: 'vote', id: b.dataset.sp }); return; }
    if ((b = t.closest('[data-sg]'))) { act({ type: 'guess', word: b.dataset.sg }); return; }
    if ((b = t.closest('[data-sl2]'))) { act({ type: b.dataset.sl2 }); return; }
    if ((b = t.closest('[data-kh]'))) { act({ type: 'hold', i: Number(b.dataset.kh) }); return; }
    if ((b = t.closest('[data-kc]'))) { act({ type: 'score', cat: b.dataset.kc }); return; }
    if ((b = t.closest('[data-kn]'))) { if (!b.disabled) act({ type: b.dataset.kn }); return; }
  });

  window.Spiele2 = {
    maler, slf, spion, kniffel,
    cast(d) { if (d && d.g === 'maler' && room && room.game === 'maler') malerCast(d); },
  };
})();
