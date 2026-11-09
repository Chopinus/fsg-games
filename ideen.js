// Ideen & Vorschläge im Hub: Spieler schlagen Verbesserungen für ein Spiel vor.
// Neue Vorschläge sieht zuerst nur der Absender. Täglich gegen 18 Uhr werden sie geprüft und dann für alle sichtbar und bewertbar.
// Der Admin nimmt Vorschläge an oder lehnt sie ab; angenommene kommen an den Update-Tagen (Mi, Fr, So) ins Spiel.
(() => {
  const q = s => document.querySelector(s);
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const konto = () => { try { const k = JSON.parse(localStorage.getItem('fsg.konto') || 'null'); return k && k.name && k.token ? k : null; } catch { return null; } };
  const say = (m) => (typeof toast === 'function' ? toast(m) : alert(m));
  async function call(a, body) {
    const k = konto();
    try {
      const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(k ? { name: k.name, token: k.token } : {}), ...(body || {}) }) });
      return await r.json();
    } catch { return { error: 'Keine Verbindung zum Server.' }; }
  }

  const ST = {
    neu: ['⏳ Wartet auf Prüfung', 'neu'], offen: ['🗳️ Offen', 'offen'], angenommen: ['✅ Angenommen', 'ok'],
    umgesetzt: ['🚀 Umgesetzt', 'done'], abgelehnt: ['✖️ Abgelehnt', 'no'], verworfen: ['🚫 Nicht veröffentlicht', 'no'],
  };
  const AI = { gut: ['👍 Gut & machbar', 'ok'], unsicher: ['🤔 Unsicher', 'mid'], nein: ['👎 Eher nicht', 'no'] };
  let D = null, tab = 'top', page = null, busy = false, formOpen = false, draft = {};

  function games() {
    const names = [...document.querySelectorAll('#tiles .tile b')].map(b => (b.firstChild && b.firstChild.textContent || '').trim()).filter(Boolean);
    return [...new Set([...names, 'Game Hub allgemein'])];
  }
  const date = t => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

  function card(v) {
    const st = ST[v.st] || ['', ''], cat = (D.cats || {})[v.c] || '';
    const vote = v.st === 'offen' ? `<button class="vz-up ${v.me ? 'on' : ''}" data-vz-up="${v.id}" ${v.mine ? 'disabled title="Eigene Vorschläge kann man nicht bewerten"' : ''}>👍 ${v.up}</button>` : (v.up ? `<span class="vz-up static">👍 ${v.up}</span>` : '');
    const ai = D.admin && v.ai ? `<div class="vz-ai ${AI[v.ai.v] ? AI[v.ai.v][1] : ''}"><b>Claude: ${AI[v.ai.v] ? AI[v.ai.v][0] : h(v.ai.v)}</b>${v.ai.cost ? ` · Aufwand ${h(v.ai.cost)}` : ''}${v.ai.dup ? ` · ähnlich wie ${h(v.ai.dup)}` : ''}<p>${h(v.ai.why)}</p></div>` : '';
    const adm = D.admin ? `<div class="vz-adm">${v.st === 'offen' || v.st === 'neu' || v.st === 'verworfen' ? `<button class="btn small" data-vz-d="angenommen" data-id="${v.id}">✅ Annehmen</button><button class="btn small ghost" data-vz-d="abgelehnt" data-id="${v.id}">✖️ Ablehnen</button>` : ''}${v.st === 'angenommen' || v.st === 'abgelehnt' ? `<button class="btn small ghost" data-vz-d="offen" data-id="${v.id}">↩︎ Wieder offen</button>` : ''}</div>` : '';
    const del = v.mine && v.st === 'neu' ? `<button class="vz-link" data-vz-del="${v.id}">zurückziehen</button>` : '';
    return `<article class="vz-card">
      <div class="vz-top"><span class="vz-st ${st[1]}">${st[0]}</span><span class="pill">${h(v.g)}</span>${cat ? `<span class="vz-cat">${h(cat)}</span>` : ''}<span class="vz-grow"></span>${vote}</div>
      <h3>${h(v.t)}</h3><p class="vz-x">${h(v.x)}</p>
      ${v.reason ? `<p class="vz-why no">Grund: ${h(v.reason)}</p>` : ''}${v.dn ? `<p class="vz-why">Admin: ${h(v.dn)}</p>` : ''}${v.note ? `<p class="vz-why ok">Umgesetzt: ${h(v.note)}</p>` : ''}
      ${ai}${adm}
      <div class="vz-meta">von ${h(v.n)}${v.mine ? ' (du)' : ''} · ${date(v.ts)} ${del}</div></article>`;
  }

  function listFor(t) {
    const L = (D && D.list) || [];
    const by = (a, b) => b.up - a.up || b.ts - a.ts;
    if (t === 'top') return L.filter(v => v.st === 'offen').sort(by);
    if (t === 'ok') return L.filter(v => v.st === 'angenommen').sort(by);
    if (t === 'done') return L.filter(v => v.st === 'umgesetzt').sort((a, b) => b.ts - a.ts);
    if (t === 'mine') return L.filter(v => v.mine).sort((a, b) => b.ts - a.ts);
    if (t === 'adm') return L.filter(v => ['neu', 'offen', 'verworfen', 'abgelehnt'].includes(v.st)).sort((a, b) => ['offen', 'neu', 'verworfen', 'abgelehnt'].indexOf(a.st) - ['offen', 'neu', 'verworfen', 'abgelehnt'].indexOf(b.st) || by(a, b));
    return [];
  }

  function formHTML() {
    const k = konto();
    if (!k) return `<div class="vz-note">🔐 Melde dich oben im Hub mit deinem Konto an, um Ideen einzureichen und zu bewerten.</div>`;
    if (!formOpen) return `<button class="btn" data-vz="form" ${D && !D.left ? 'disabled' : ''}>💡 Neue Idee einreichen</button><span class="vz-small">${D ? `Noch ${D.left} von ${D.week} diese Woche` : ''}</span>`;
    return `<form class="vz-form" id="vzForm">
      <div class="vz-row"><div class="field"><label for="vzG">Spiel</label><select id="vzG" name="g"><option value="">Bitte wählen …</option>${games().map(g => `<option ${draft.g === g ? 'selected' : ''}>${h(g)}</option>`).join('')}</select></div>
      <div class="field"><label for="vzC">Art</label><select id="vzC" name="c">${Object.entries((D && D.cats) || {}).map(([k2, l]) => `<option value="${k2}" ${draft.c === k2 ? 'selected' : ''}>${h(l)}</option>`).join('')}</select></div></div>
      <div class="field"><label for="vzT">Titel</label><input id="vzT" name="t" maxlength="80" placeholder="z. B. Mehr Gegner in der Eiswelt" value="${h(draft.t || '')}"></div>
      <div class="field"><label for="vzX">Beschreibung</label><textarea id="vzX" name="x" maxlength="800" rows="4" placeholder="Was genau soll sich ändern, und warum wäre das besser?">${h(draft.x || '')}</textarea></div>
      <div class="vz-row end"><button type="button" class="btn ghost small" data-vz="cancel">Abbrechen</button><button class="btn small" ${busy ? 'disabled' : ''}>Einreichen</button></div>
      <p class="vz-small">Dein Vorschlag wird täglich gegen 18 Uhr geprüft und danach für alle sichtbar. Beleidigende oder unsinnige Vorschläge werden nicht veröffentlicht.</p></form>`;
  }

  function render() {
    if (!page || page.hidden) return;
    const tabs = [['top', '🗳️ Abstimmen'], ['ok', '✅ Angenommen'], ['done', '🚀 Umgesetzt'], ...(konto() ? [['mine', '📝 Meine']] : []), ...(D && D.admin ? [['adm', '🛡️ Freigabe']] : [])];
    if (!tabs.some(t => t[0] === tab)) tab = 'top';
    const L = D ? listFor(tab) : null;
    const waiting = D && D.admin ? D.list.filter(v => v.st === 'neu').length : 0;
    const empty = { top: 'Gerade gibt es keine offenen Ideen. Reich doch die erste ein!', ok: 'Noch nichts angenommen.', done: 'Noch nichts umgesetzt.', mine: 'Du hast noch keine Idee eingereicht.', adm: 'Nichts zu entscheiden.' }[tab];
    page.innerHTML = `<div class="wrap vz">
      <div class="vz-head"><button class="btn small ghost" data-vz="back">‹ Hub</button><h2>💡 Ideen & Vorschläge</h2></div>
      <p class="lead">Schlag Verbesserungen für die Spiele vor – Balance, neue Funktionen, Fehler. <b>Täglich gegen 18 Uhr</b> werden neue Ideen geprüft und dann für alle zum Abstimmen freigegeben. Angenommene Ideen kommen <b>mittwochs, freitags und sonntags</b> ins Spiel.</p>
      <div class="panel vz-formbox">${formHTML()}</div>
      <div class="vz-tabs">${tabs.map(([k2, l]) => `<button class="vz-tab ${tab === k2 ? 'on' : ''}" data-vz-tab="${k2}">${l}</button>`).join('')}</div>
      ${tab === 'adm' ? `<p class="vz-small">${waiting} Idee(n) warten auf die nächste Prüfung. Alles, was du annimmst, setzt Claude am nächsten Update-Tag um (Mi, Fr, So).</p>` : ''}
      <div class="vz-list">${!D ? '<p class="vz-small">Wird geladen …</p>' : L.length ? L.map(card).join('') : `<p class="vz-small">${empty}</p>`}</div></div>`;
    const f = q('#vzForm');
    if (f) {
      f.oninput = () => { draft = { g: f.g.value, c: f.c.value, t: f.t.value, x: f.x.value }; };
      f.onsubmit = async e => {
        e.preventDefault(); if (busy) return; busy = true;
        const r = await call('vs_add', { g: f.g.value, c: f.c.value, t: f.t.value, x: f.x.value }); busy = false;
        if (r.error) { say(r.error); return; }
        draft = {}; formOpen = false; tab = 'mine'; say(`Danke! Deine Idee wird ${new Date().getHours() < 18 ? 'heute' : 'morgen'} gegen 18 Uhr geprüft.`); await load();
      };
    }
  }

  async function load() { const r = await call('vs_list'); if (!r.error) D = r; else if (!D) D = { list: [], cats: {}, left: 0, week: 3 }; render(); }

  function open() {
    if (!page) {
      page = document.createElement('main'); page.id = 'ideen'; page.hidden = true; document.body.insertBefore(page, q('#picker'));
      page.addEventListener('click', onClick);
    }
    const hub = q('#hub'); if (hub) hub.hidden = true;
    page.hidden = false; scrollTo(0, 0); render(); load();
  }
  function close() { if (page) page.hidden = true; const hub = q('#hub'); if (hub) hub.hidden = false; }

  async function onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.vz === 'back') return close();
    if (b.dataset.vz === 'form') { formOpen = true; render(); setTimeout(() => { const g = q('#vzG'); if (g) g.focus(); }, 30); return; }
    if (b.dataset.vz === 'cancel') { formOpen = false; render(); return; }
    if (b.dataset.vzTab) { tab = b.dataset.vzTab; render(); return; }
    if (b.dataset.vzUp) { const r = await call('vs_vote', { id: b.dataset.vzUp }); if (r.error) say(r.error); else { Object.assign(D.list.find(v => v.id === r.item.id) || {}, r.item); render(); } return; }
    if (b.dataset.vzDel) { const r = await call('vs_delete', { id: b.dataset.vzDel }); if (r.error) say(r.error); else load(); return; }
    if (b.dataset.vzD) {
      const d = b.dataset.vzD; let dn = '';
      if (d === 'abgelehnt') { dn = prompt('Kurze Begründung für die Spieler (optional):') ?? null; if (dn === null) return; }
      const r = await call('vs_decide', { id: b.dataset.id, d, dn }); if (r.error) say(r.error); else { say(d === 'angenommen' ? 'Angenommen – kommt am nächsten Update-Tag.' : d === 'abgelehnt' ? 'Abgelehnt.' : 'Wieder offen.'); load(); }
    }
  }

  // Einstieg im Hub
  function teaser() {
    const hub = q('#hub'); if (!hub || q('#vzTeaser')) return;
    const sec = document.createElement('section'); sec.className = 'stack'; sec.id = 'vzTeaser';
    sec.innerHTML = `<h2>Ideen für die Spiele</h2><div class="panel vz-teaser"><span class="vz-bulb">💡</span><div><b>Du hast eine Idee, wie ein Spiel besser wird?</b><p>Schlag sie vor oder stimm über die Ideen der anderen ab. Updates mit angenommenen Ideen kommen mittwochs, freitags und sonntags.</p></div><button class="btn small" data-vz-open="1">Ideen ansehen</button></div>`;
    const rooms = q('#rooms'), before = rooms && rooms.closest('section');
    if (before && before.parentNode === hub) hub.insertBefore(sec, before); else hub.appendChild(sec); // über den offenen Runden
    sec.addEventListener('click', e => { if (e.target.closest('[data-vz-open]')) open(); });
  }

  const css = document.createElement('style');
  css.textContent = `
  .vz-teaser{flex-direction:row;align-items:center;gap:14px;border-color:#5b4a2a;background:linear-gradient(120deg,#2f2614,var(--surface) 70%)}
  .vz-teaser p{margin:4px 0 0;color:var(--muted);font-size:15px}.vz-teaser>div{flex:1;min-width:0}
  .vz-bulb{font-size:34px;line-height:1}
  @media (max-width:600px){.vz-teaser{flex-direction:column;align-items:stretch;text-align:left}.vz-bulb{display:none}}
  .vz-head{display:flex;align-items:center;gap:14px}
  .vz-formbox{flex-direction:row;flex-wrap:wrap;align-items:center;gap:12px}
  .vz-form{display:flex;flex-direction:column;gap:12px;width:100%}
  .vz-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.vz-row.end{display:flex;justify-content:flex-end;gap:10px}
  @media (max-width:560px){.vz-row{grid-template-columns:1fr}}
  .vz select,.vz textarea{font:inherit;font-size:17px;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 12px;width:100%;min-width:0}
  .vz textarea{resize:vertical;min-height:110px}
  .vz-small{color:var(--muted);font-size:14px;margin:0}
  .vz-note{color:var(--muted)}
  .vz-tabs{display:flex;gap:8px;flex-wrap:wrap}
  .vz-tab{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:8px 14px;font-weight:800;font-size:14px}
  .vz-tab.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
  .vz-list{display:flex;flex-direction:column;gap:12px}
  .vz-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
  .vz-card h3{margin:0;font-size:19px}
  .vz-x{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#e6dccd}
  .vz-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.vz-grow{flex:1}
  .vz-st{font-size:13px;font-weight:800;padding:3px 9px;border-radius:999px;background:var(--surface2)}
  .vz-st.ok,.vz-st.done{color:#8be3b8}.vz-st.no{color:#ff9a9a}.vz-st.neu{color:#ffd27a}.vz-st.offen{color:#9cc3ff}
  .vz-cat{font-size:13px;color:var(--muted)}
  .vz-up{border:1px solid var(--line);background:var(--bg);border-radius:999px;padding:6px 12px;font-weight:800;min-height:36px}
  .vz-up.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.vz-up:disabled{opacity:.6;cursor:default}
  .vz-up.static{display:inline-block;color:var(--muted)}
  .vz-why{margin:0;font-size:14px;color:var(--muted)}.vz-why.no{color:#ffb0b0}.vz-why.ok{color:#8be3b8}
  .vz-ai{border-radius:10px;padding:10px 12px;background:var(--surface2);border-left:4px solid var(--muted);font-size:14px}
  .vz-ai.ok{border-color:#27a06a}.vz-ai.mid{border-color:#f2be1a}.vz-ai.no{border-color:#e5484d}
  .vz-ai p{margin:4px 0 0;color:#e6dccd}
  .vz-adm{display:flex;gap:8px;flex-wrap:wrap}
  .vz-meta{font-size:13px;color:var(--muted)}
  .vz-link{background:none;border:0;color:var(--accent);text-decoration:underline;padding:0 0 0 6px;font-size:13px}`;
  document.head.appendChild(css);
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', teaser); else teaser();
  window.Ideen = { open };
})();
