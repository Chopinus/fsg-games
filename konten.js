// Spielstände mit selbst gewähltem Namen und Passwort.
// Dauerhaft gespeichert in einem privaten GitHub-Projekt (Umgebungsvariablen GITHUB_TOKEN und SAVE_REPO).
// Ohne diese Variablen landet alles nur in einer lokalen Datei, die beim Neustart von Render verloren geht.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.SAVE_REPO || '';
const FILE = process.env.SAVE_FILE || 'ritter-spielstaende.json'; // eigene Datei möglich, z. B. für die Leisten-Version
const LOCAL = path.join(__dirname, 'spielstaende.local.json');
const durable = !!(TOKEN && REPO);
// Test-Werkzeuge nur für diese Spielstand-Namen (Umgebungsvariable TEST_NAMES, mit Komma getrennt). Stehen bewusst nicht im Code.
const TESTERS = (process.env.TEST_NAMES || '').split(/[,;\n]/).map(n => n.replace(/["'`]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean);
const isTester = key => TESTERS.includes(key);
// Saison: muss zu SEASON in ritter.js passen. Beim Start werden alle Spielstände (außer Tester) einer älteren Saison zurückgesetzt.
// Name und Passwort bleiben, nur der Spielstand beginnt neu. Die alten Stände bleiben im Verlauf des GitHub-Projekts erhalten.
const SEASON = 1;
const oldSeason = d => !d || (Number(d.season) || 0) < SEASON;
// Test-Spielstände (mit Testwerkzeugen erspielt) dürfen nicht in normale Konten wandern
const testData = d => !!(d && d.tst);

let accounts = {};   // key (Name klein) -> { name, salt, hash, tokens: [sha256], data, updated }
let sha = null, dirty = false, flushTimer = null, ready = false, lastError = '';

const gh = (method, body, file = FILE) => fetch(`https://api.github.com/repos/${REPO}/contents/${file}`, {
  method,
  headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'fsg-spiele', 'X-GitHub-Api-Version': '2022-11-28' },
  body: body ? JSON.stringify(body) : undefined,
});

async function load() {
  try {
    if (durable) {
      const res = await gh('GET');
      if (res.status === 200) {
        const j = await res.json(); sha = j.sha;
        let text = j.content ? Buffer.from(j.content, 'base64').toString('utf8') : '';
        // Über 1 MB liefert GitHub den Inhalt nicht mehr im JSON mit, dann als Rohtext nachladen
        if (!text && j.size > 0) { const raw = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.raw', 'User-Agent': 'fsg-spiele', 'X-GitHub-Api-Version': '2022-11-28' } }); if (raw.ok) text = await raw.text(); else throw new Error(`Rohdaten: GitHub antwortet mit ${raw.status}`); }
        accounts = JSON.parse(text || '{}');
      } else if (res.status !== 404) { lastError = `GitHub antwortet mit ${res.status}`; console.error('Spielstände laden:', lastError, await res.text()); }
    } else if (fs.existsSync(LOCAL)) accounts = JSON.parse(fs.readFileSync(LOCAL, 'utf8'));
  } catch (e) { lastError = String(e.message || e); console.error('Spielstände laden:', e); }
  // Neue Saison: alte Spielstände zurücksetzen (Tester ausgenommen)
  let reset = 0;
  for (const [key, a] of Object.entries(accounts)) {
    if ((a.season || 0) >= SEASON) continue;
    a.season = SEASON;
    if (!isTester(key) && a.data && oldSeason(a.data)) { a.data = { season: SEASON }; a.updated = Date.now(); delete a.prev; reset++; }
  }
  if (reset || Object.values(accounts).some(a => a.season === SEASON)) markDirty();
  if (reset) console.log(`Neue Saison ${SEASON}: ${reset} Spielstände zurückgesetzt`);
  ready = true;
  console.log(`Spielstände: ${Object.keys(accounts).length} Konten, ${durable ? 'dauerhaft in ' + REPO : 'nur lokal (nicht dauerhaft)'}`);
}
async function flush() {
  if (!dirty) return;
  dirty = false;
  const text = JSON.stringify(accounts);
  try {
    if (durable) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await gh('PUT', { message: 'Spielstände aktualisiert', content: Buffer.from(text).toString('base64'), ...(sha ? { sha } : {}) });
        if (res.ok) { sha = (await res.json()).content.sha; lastError = ''; return; }
        if (res.status === 409 || res.status === 422) { const g = await gh('GET'); if (g.ok) sha = (await g.json()).sha; continue; }
        lastError = `GitHub antwortet mit ${res.status}`; console.error('Spielstände speichern:', lastError, await res.text()); break;
      }
      dirty = true; // beim nächsten Mal erneut versuchen
    } else fs.writeFileSync(LOCAL, text);
  } catch (e) { dirty = true; lastError = String(e.message || e); console.error('Spielstände speichern:', e); }
}
function markDirty() {
  dirty = true;
  if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = null; flush(); }, 15000);
}

// ---------- Freunde und Chat ----------
// Freundeslisten stehen im Konto (acc.fr). Nachrichten liegen in einer eigenen Datei (ritter-chats.json),
// damit der Spielstand-Speicher klein bleibt. Je Freundespaar werden nur die letzten 60 Nachrichten behalten.
const CHAT_FILE = 'ritter-chats.json', CHAT_LOCAL = path.join(__dirname, 'chats.local.json');
let chats = {}, chatSha = null, chatDirty = false, chatTimer = null;
async function chatLoad() {
  try {
    if (durable) {
      const res = await gh('GET', null, CHAT_FILE);
      if (res.status === 200) { const j = await res.json(); chatSha = j.sha; let text = j.content ? Buffer.from(j.content, 'base64').toString('utf8') : '';
        if (!text && j.size > 0) { const raw = await fetch(`https://api.github.com/repos/${REPO}/contents/${CHAT_FILE}`, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.raw', 'User-Agent': 'fsg-spiele', 'X-GitHub-Api-Version': '2022-11-28' } }); if (raw.ok) text = await raw.text(); }
        chats = JSON.parse(text || '{}'); }
    } else if (fs.existsSync(CHAT_LOCAL)) chats = JSON.parse(fs.readFileSync(CHAT_LOCAL, 'utf8'));
  } catch (e) { console.error('Chats laden:', e); }
}
async function chatFlush() {
  if (!chatDirty) return; chatDirty = false;
  const text = JSON.stringify(chats);
  try {
    if (durable) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await gh('PUT', { message: 'Chats aktualisiert', content: Buffer.from(text).toString('base64'), ...(chatSha ? { sha: chatSha } : {}) }, CHAT_FILE);
        if (res.ok) { chatSha = (await res.json()).content.sha; return; }
        if (res.status === 409 || res.status === 422) { const g = await gh('GET', null, CHAT_FILE); if (g.ok) chatSha = (await g.json()).sha; continue; }
        console.error('Chats speichern:', res.status); break;
      }
      chatDirty = true;
    } else fs.writeFileSync(CHAT_LOCAL, text);
  } catch (e) { chatDirty = true; console.error('Chats speichern:', e); }
}
function chatMark() { chatDirty = true; if (!chatTimer) chatTimer = setTimeout(() => { chatTimer = null; chatFlush(); }, 60000); }
const pairOf = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
const seen = new Map();            // wer zuletzt da war (nur im Speicher): key -> Zeitpunkt
const ONLINE_MS = 45000;
const isOnline = key => Date.now() - (seen.get(key) || 0) < ONLINE_MS;
const sendTimes = new Map();       // Bremse gegen Spam: höchstens 8 Nachrichten in 10 Sekunden
const FR_MAX = 60, REQ_MAX = 30, MSG_MAX = 300, KEEP = 60;
const frOf = acc => (acc.fr = acc.fr || { f: [], i: [], o: [] });
const cleanMsg = t => String(t || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, MSG_MAX);
function friendsView(key, acc) {
  const fr = frOf(acc), rd = (chats._read && chats._read[key]) || {};
  const nameOf = k => (accounts[k] ? accounts[k].name : null);
  const friends = fr.f.filter(nameOf).map(k => { const c = chats[pairOf(key, k)] || [], last = c[c.length - 1];
    return { name: nameOf(k), online: isOnline(k), unread: c.filter(m => m.f !== key && m.t > (rd[k] || 0)).length, last: last ? last.t : 0 }; })
    .sort((a, b) => (b.online - a.online) || (b.last - a.last) || a.name.localeCompare(b.name));
  return { me: acc.name, friends, inc: fr.i.filter(nameOf).map(nameOf), out: fr.o.filter(nameOf).map(nameOf) };
}
function social(action, key, acc, body) {
  seen.set(key, Date.now());
  const fr = frOf(acc), wn = cleanName(body.who), wk = keyOf(wn), other = accounts[wk];
  if (action === 'friends') return [200, friendsView(key, acc)];
  if (!other) return [404, { error: 'Diesen Namen gibt es nicht.' }];
  if (wk === key) return [400, { error: 'Das bist du selbst.' }];
  const ofr = frOf(other), drop = (arr, k) => { const i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); };
  if (action === 'friend_add') {
    if (fr.f.includes(wk)) return [400, { error: `Ihr seid schon befreundet.` }];
    if (fr.i.includes(wk)) { drop(fr.i, wk); drop(ofr.o, key); fr.f.push(wk); ofr.f.push(key); markDirty(); return [200, { ...friendsView(key, acc), msg: `Du und ${other.name} seid jetzt befreundet.` }]; }
    if (fr.o.includes(wk)) return [400, { error: 'Anfrage ist schon unterwegs.' }];
    if (fr.f.length >= FR_MAX) return [400, { error: `Du hast schon ${FR_MAX} Freunde.` }];
    if (ofr.i.length >= REQ_MAX || fr.o.length >= REQ_MAX) return [400, { error: 'Gerade sind zu viele Anfragen offen.' }];
    fr.o.push(wk); ofr.i.push(key); markDirty();
    return [200, { ...friendsView(key, acc), msg: `Anfrage an ${other.name} geschickt.` }];
  }
  if (action === 'friend_answer') {
    if (!fr.i.includes(wk)) return [400, { error: 'Diese Anfrage gibt es nicht mehr.' }];
    drop(fr.i, wk); drop(ofr.o, key);
    if (body.ok) { if (!fr.f.includes(wk)) fr.f.push(wk); if (!ofr.f.includes(key)) ofr.f.push(key); }
    markDirty();
    return [200, { ...friendsView(key, acc), msg: body.ok ? `Du und ${other.name} seid jetzt befreundet.` : 'Anfrage abgelehnt.' }];
  }
  if (action === 'friend_remove') {
    drop(fr.f, wk); drop(ofr.f, key); drop(fr.o, wk); drop(ofr.i, key); drop(fr.i, wk); drop(ofr.o, key); markDirty();
    if (chats[pairOf(key, wk)]) { delete chats[pairOf(key, wk)]; chatMark(); }
    return [200, friendsView(key, acc)];
  }
  const mate = gOf.has(wk) && gOf.get(wk) === gOf.get(key); // Gildenmitglieder dürfen gegenseitig ins Profil schauen
  if (!fr.f.includes(wk) && !(action === 'profile' && mate)) return [403, { error: 'Ihr seid nicht befreundet.' }];
  if (action === 'profile') { const gid = gOf.get(wk); return [200, { name: other.name, online: isOnline(wk), updated: other.updated || 0, data: other.data || {}, guild: gid && guilds[gid] ? guilds[gid].name : null }]; }
  const pk = pairOf(key, wk);
  if (action === 'chat_send') {
    const text = cleanMsg(body.text); if (!text) return [400, { error: 'Leere Nachricht.' }];
    const ts = (sendTimes.get(key) || []).filter(x => Date.now() - x < 10000);
    if (ts.length >= 8) return [429, { error: 'Langsam! Warte kurz.' }];
    sendTimes.set(key, [...ts, Date.now()]);
    const list = chats[pk] = chats[pk] || [], t = Math.max(Date.now(), list.length ? list[list.length - 1].t + 1 : 0);
    list.push({ f: key, x: text, t }); if (list.length > KEEP) list.splice(0, list.length - KEEP);
    chatMark();
  }
  if (action === 'chat' || action === 'chat_send') {
    const list = chats[pk] || [], since = Number(body.since) || 0;
    const rd = (chats._read = chats._read || {})[key] = (chats._read[key] || {});
    if (list.length && rd[wk] !== list[list.length - 1].t) { rd[wk] = list[list.length - 1].t; chatMark(); }
    return [200, { name: other.name, online: isOnline(wk), msgs: list.filter(m => m.t > since).map(m => ({ me: m.f === key, x: m.x, t: m.t })) }];
  }
  return [404, { error: 'Unbekannt' }];
}

// ---------- Wochenboss ----------
// Eine Woche (Montag 0 Uhr UTC bis Sonntag) kämpfen alle gegen denselben Boss. Jeder Spieler hat 3 Versuche pro Tag.
// Der Server zählt die Versuche und merkt sich pro Spieler die meisten Leisten aus einem Versuch. Die Summe zählt fürs Gemeinschaftsziel.
const WB_FILE = 'ritter-wochenboss.json', WB_LOCAL = path.join(__dirname, 'wochenboss.local.json');
const WB_TRIES = 3, WB_MAX_BARS = 2000, WB_BOSSES = 3; // drei eigene Wochenbosse, wechseln wöchentlich
// Gruppenziele: Summe der besten Leistenzahl (ein Versuch) der bis zu 5 Spieler einer Gilde bzw. Zufallsgruppe.
// Muss zu WB.goals in ritter/1_spiel.js passen.
const WB_GOALS = [40, 100, 180, 280, 400];
let wb = null, wbSha = null, wbDirty = false, wbTimer = null;
const wbWeekStart = t => { const d = new Date(t); const day = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day); };
const wbWeekId = t => { const ws = wbWeekStart(t), th = new Date(ws + 3 * 86400000), y = th.getUTCFullYear(), w1 = wbWeekStart(Date.UTC(y, 0, 4)); return `${y}-W${String(1 + Math.round((ws - w1) / 604800000)).padStart(2, '0')}`; };
const dayIdUTC = t => new Date(t).toISOString().slice(0, 10);
async function wbLoad() {
  try {
    if (durable) {
      const res = await gh('GET', null, WB_FILE);
      if (res.status === 200) { const j = await res.json(); wbSha = j.sha; wb = JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8') || 'null'); }
    } else if (fs.existsSync(WB_LOCAL)) wb = JSON.parse(fs.readFileSync(WB_LOCAL, 'utf8'));
  } catch (e) { console.error('Wochenboss laden:', e); }
}
async function wbFlush() {
  if (!wbDirty || !wb) return; wbDirty = false;
  const text = JSON.stringify(wb);
  try {
    if (durable) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await gh('PUT', { message: 'Wochenboss aktualisiert', content: Buffer.from(text).toString('base64'), ...(wbSha ? { sha: wbSha } : {}) }, WB_FILE);
        if (res.ok) { wbSha = (await res.json()).content.sha; return; }
        if (res.status === 409 || res.status === 422) { const g = await gh('GET', null, WB_FILE); if (g.ok) wbSha = (await g.json()).sha; continue; }
        console.error('Wochenboss speichern:', res.status); break;
      }
      wbDirty = true;
    } else fs.writeFileSync(WB_LOCAL, text);
  } catch (e) { wbDirty = true; console.error('Wochenboss speichern:', e); }
}
function wbMark() { wbDirty = true; if (!wbTimer) wbTimer = setTimeout(() => { wbTimer = null; wbFlush(); }, 30000); }
const wbReached = total => WB_GOALS.filter(g => total >= g).length;
// Gruppe eines Spielers: seine Gilde, sonst die Zufallsgruppe aus Spielern ohne Gilde (wird beim ersten Kampf der Woche vergeben)
function wbGroup(W, key) {
  const gid = gOf.get(key);
  if (gid && guilds[gid]) return { kind: 'guild', name: guilds[gid].name, members: guilds[gid].members };
  const pid = W.players[key] && W.players[key].pool, pool = pid && W.pools && W.pools[pid];
  if (!pool) return { kind: 'none', name: '', members: [key] };
  return { kind: 'pool', name: `Gruppe ${pid}`, members: pool.filter(k => !gOf.has(k)) };
}
const wbGroupTotal = (W, G) => G.members.reduce((a, k) => a + ((W.players[k] && W.players[k].best) || 0), 0);
function wbPoolJoin(W, key) {
  if (gOf.has(key) || W.players[key].pool) return;
  W.pools = W.pools || {};
  let pid = Object.keys(W.pools).find(id => W.pools[id].filter(k => !gOf.has(k)).length < 5);
  if (!pid) { pid = String(Object.keys(W.pools).length + 1); W.pools[pid] = []; }
  W.pools[pid].push(key); W.players[key].pool = pid;
}
// Neue Woche: alte Woche abschließen. Jeder, der mitgekämpft hat, bekommt die Belohnung der erreichten Ziele.
function wbEnsure(now = Date.now()) {
  const id = wbWeekId(now);
  if (wb && wb.week === id) return wb;
  let last = wb && wb.last ? wb.last : null;
  if (wb && wb.week) {
    const res = {};
    for (const [k, p] of Object.entries(wb.players)) if (p.best > 0) { const G = wbGroup(wb, k), t = wbGroupTotal(wb, G); res[k] = { best: p.best, goals: wbReached(t), total: t, group: G.kind === 'guild' ? G.name : 'Zufallsgruppe', claimed: false }; }
    // Unabgeholte Belohnungen der Vorwoche bleiben erhalten
    if (last && last.res) for (const [k, r] of Object.entries(last.res)) if (!r.claimed && !res[k]) res[k] = { ...r, old: true };
    last = { week: wb.week, total: wb.total, res, bk: wb.bk };
  }
  const num = Number(id.slice(-2)) || 0;
  wb = { week: id, bk: num % WB_BOSSES, total: 0, players: {}, pools: {}, last };
  wbMark();
  return wb;
}
function wbAction(action, key, acc, body) {
  const W = wbEnsure(), now = Date.now(), today = dayIdUTC(now);
  seen.set(key, Date.now()); W.pools = W.pools || {};
  const me = W.players[key] || (W.players[key] = { name: acc.name, best: 0, tries: {}, open: {} });
  me.name = acc.name; me.best = me.best || 0; me.tries = me.tries || {}; me.open = me.open || {};
  for (const d of Object.keys(me.tries)) if (d !== today) delete me.tries[d];
  for (const [t, at] of Object.entries(me.open)) if (now - at > 1800000) delete me.open[t];
  const info = extra => {
    const list = Object.entries(W.players).filter(([, p]) => p.best > 0).sort((a, b) => b[1].best - a[1].best);
    const rank = list.findIndex(([k]) => k === key) + 1;
    const L = W.last && W.last.res && W.last.res[key];
    const G = wbGroup(W, key), gt = wbGroupTotal(W, G);
    const group = { kind: G.kind, name: G.name, total: gt, members: G.members.map(k => ({ name: nameOf(k), best: (W.players[k] && W.players[k].best) || 0, me: k === key, online: isOnline(k) })).sort((a, b) => b.best - a.best) };
    return { week: W.week, bk: W.bk, endsAt: wbWeekStart(now) + 7 * 86400000, total: W.total, group, goals: WB_GOALS, reached: wbReached(gt), players: list.length,
      me: { best: me.best, rank, tries: me.tries[today] || 0, triesMax: WB_TRIES },
      top: list.slice(0, 10).map(([k, p], i) => ({ name: p.name, best: p.best, me: k === key, rank: i + 1 })),
      last: L && !L.claimed ? { goals: L.goals, best: L.best, total: L.total || 0, group: L.group || '', week: (W.last && W.last.week) || '' } : null, ...extra };
  };
  if (action === 'wb_info') return [200, info()];
  if (action === 'wb_start') {
    if ((me.tries[today] || 0) >= WB_TRIES) return [400, { error: 'Für heute sind alle Versuche verbraucht. Morgen geht es weiter.' }];
    me.tries[today] = (me.tries[today] || 0) + 1; wbPoolJoin(W, key);
    const tryId = crypto.randomBytes(8).toString('hex'); me.open[tryId] = now; wbMark();
    return [200, { tryId, ...info() }];
  }
  if (action === 'wb_hit') {
    const t = String(body.tryId || '');
    if (!me.open[t]) return [400, { error: 'Dieser Versuch zählt nicht mehr.' }];
    delete me.open[t];
    const bars = Math.max(0, Math.min(WB_MAX_BARS, Math.floor(Number(body.bars) || 0))), better = bars > me.best;
    if (better) { W.total += bars - me.best; me.best = bars; }
    wbMark();
    return [200, info({ bars, better })];
  }
  if (action === 'wb_claim') {
    const L = W.last && W.last.res && W.last.res[key];
    if (!L || L.claimed) return [400, { error: 'Keine Belohnung offen.' }];
    L.claimed = true; wbMark();
    return [200, info({ goals: L.goals, best: L.best })];
  }
  return [404, { error: 'Unbekannt' }];
}

// ---------- Gilden ----------
// Bis zu 5 Spieler. Beitreten nur per Einladung des Gründers oder per Anfrage, die der Gründer bestätigt.
// Gespeichert in ritter-gilden.json (wie die Chats). Wer in keiner Gilde ist, kommt beim Wochenboss in eine Zufallsgruppe.
const G_FILE = 'ritter-gilden.json', G_LOCAL = path.join(__dirname, 'gilden.local.json');
const G_MAX = 5, G_REQ_MAX = 20;
let guilds = {}, gSha = null, gDirty = false, gTimer = null;
const gOf = new Map(); // Spieler-key -> Gilden-id
function gIndex() { gOf.clear(); for (const g of Object.values(guilds)) for (const k of g.members) gOf.set(k, g.id); }
async function gLoad() {
  try {
    if (durable) {
      const res = await gh('GET', null, G_FILE);
      if (res.status === 200) { const j = await res.json(); gSha = j.sha; guilds = JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8') || '{}'); }
    } else if (fs.existsSync(G_LOCAL)) guilds = JSON.parse(fs.readFileSync(G_LOCAL, 'utf8'));
  } catch (e) { console.error('Gilden laden:', e); }
  gIndex();
}
async function gFlush() {
  if (!gDirty) return; gDirty = false;
  const text = JSON.stringify(guilds);
  try {
    if (durable) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await gh('PUT', { message: 'Gilden aktualisiert', content: Buffer.from(text).toString('base64'), ...(gSha ? { sha: gSha } : {}) }, G_FILE);
        if (res.ok) { gSha = (await res.json()).content.sha; return; }
        if (res.status === 409 || res.status === 422) { const g = await gh('GET', null, G_FILE); if (g.ok) gSha = (await g.json()).sha; continue; }
        console.error('Gilden speichern:', res.status); break;
      }
      gDirty = true;
    } else fs.writeFileSync(G_LOCAL, text);
  } catch (e) { gDirty = true; console.error('Gilden speichern:', e); }
}
function gMark() { gIndex(); gDirty = true; if (!gTimer) gTimer = setTimeout(() => { gTimer = null; gFlush(); }, 20000); }
const gName = n => String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().replace(/\s+/g, ' ');
const gValid = n => /^[\p{L}\p{N} _.'!&-]{3,24}$/u.test(n);
const gTaken = (n, except) => Object.values(guilds).some(g => g.id !== except && g.name.toLowerCase() === n.toLowerCase());
const nameOf = k => (accounts[k] && accounts[k].name) || k;
const gDrop = (arr, k) => { const i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); };
function gView(key) {
  const id = gOf.get(key), g = id && guilds[id], W = wb && wb.week === wbWeekId(Date.now()) ? wb : null;
  const best = k => (W && W.players[k] && W.players[k].best) || 0;
  const invites = Object.values(guilds).filter(x => x.inv.includes(key)).map(x => ({ id: x.id, name: x.name, n: x.members.length }));
  const asked = Object.values(guilds).filter(x => x.req.includes(key)).map(x => ({ id: x.id, name: x.name, n: x.members.length }));
  if (!g) return { guild: null, invites, asked, max: G_MAX };
  const owner = g.owner === key;
  return { guild: { id: g.id, name: g.name, owner: nameOf(g.owner), me: owner, created: g.created,
      members: g.members.map(k => ({ name: nameOf(k), online: isOnline(k), owner: k === g.owner, me: k === key, best: best(k) })),
      req: owner ? g.req.map(nameOf) : [], inv: owner ? g.inv.map(nameOf) : [], total: g.members.reduce((a, k) => a + best(k), 0) },
    invites, asked, max: G_MAX };
}
function guildAction(action, key, acc, body) {
  seen.set(key, Date.now());
  const myId = gOf.get(key), my = myId && guilds[myId], ok = (msg) => [200, { ...gView(key), msg }];
  if (action === 'guild') return [200, gView(key)];
  if (action === 'guild_search') {
    const q = gName(body.q).toLowerCase();
    const list = Object.values(guilds).filter(g => !q || g.name.toLowerCase().includes(q)).sort((a, b) => (a.members.length >= G_MAX) - (b.members.length >= G_MAX) || b.members.length - a.members.length).slice(0, 15)
      .map(g => ({ id: g.id, name: g.name, n: g.members.length, owner: nameOf(g.owner), asked: g.req.includes(key) }));
    return [200, { list }];
  }
  if (action === 'guild_create') {
    if (my) return [400, { error: 'Du bist schon in einer Gilde.' }];
    const n = gName(body.gname);
    if (!gValid(n)) return [400, { error: 'Der Gildenname braucht 3 bis 24 Zeichen.' }];
    if (gTaken(n)) return [409, { error: 'Diesen Gildennamen gibt es schon.' }];
    if (Object.keys(guilds).length >= 2000) return [507, { error: 'Es gibt zu viele Gilden.' }];
    const id = crypto.randomBytes(5).toString('hex');
    for (const g of Object.values(guilds)) gDrop(g.req, key), gDrop(g.inv, key);
    guilds[id] = { id, name: n, owner: key, members: [key], req: [], inv: [], created: Date.now() };
    gMark(); return ok(`Gilde „${n}“ gegründet!`);
  }
  if (action === 'guild_request') {
    const g = guilds[String(body.gid || '')];
    if (!g) return [404, { error: 'Diese Gilde gibt es nicht mehr.' }];
    if (my) return [400, { error: 'Du bist schon in einer Gilde.' }];
    if (g.members.length >= G_MAX) return [400, { error: 'Diese Gilde ist voll.' }];
    if (g.inv.includes(key)) { gDrop(g.inv, key); g.members.push(key); for (const o of Object.values(guilds)) gDrop(o.req, key), gDrop(o.inv, key); gMark(); return ok(`Willkommen in „${g.name}“!`); }
    if (g.req.includes(key)) return [400, { error: 'Deine Anfrage ist schon unterwegs.' }];
    if (g.req.length >= G_REQ_MAX) return [400, { error: 'Diese Gilde hat gerade zu viele offene Anfragen.' }];
    g.req.push(key); gMark(); return ok(`Anfrage an „${g.name}“ gesendet. Der Gründer muss sie bestätigen.`);
  }
  if (action === 'guild_cancel') { const g = guilds[String(body.gid || '')]; if (g) { gDrop(g.req, key); gMark(); } return ok(''); }
  if (action === 'guild_answer') { // Einladung annehmen oder ablehnen
    const g = guilds[String(body.gid || '')];
    if (!g || !g.inv.includes(key)) return [404, { error: 'Diese Einladung gibt es nicht mehr.' }];
    gDrop(g.inv, key);
    if (!body.yes) { gMark(); return ok('Einladung abgelehnt.'); }
    if (my) { gMark(); return [400, { error: 'Du bist schon in einer Gilde. Verlass sie zuerst.' }]; }
    if (g.members.length >= G_MAX) { gMark(); return [400, { error: 'Diese Gilde ist inzwischen voll.' }]; }
    g.members.push(key); for (const o of Object.values(guilds)) gDrop(o.req, key), gDrop(o.inv, key);
    gMark(); return ok(`Willkommen in „${g.name}“!`);
  }
  if (!my) return [400, { error: 'Du bist in keiner Gilde.' }];
  const owner = my.owner === key, wk = keyOf(cleanName(body.who));
  if (action === 'guild_leave') {
    gDrop(my.members, key);
    if (!my.members.length) delete guilds[my.id];
    else if (owner) my.owner = my.members[0]; // der Älteste übernimmt
    gMark(); return ok(`Du hast „${my.name}“ verlassen.`);
  }
  if (!owner) return [403, { error: 'Das darf nur der Gründer der Gilde.' }];
  if (action === 'guild_rename') {
    const n = gName(body.gname);
    if (!gValid(n)) return [400, { error: 'Der Gildenname braucht 3 bis 24 Zeichen.' }];
    if (gTaken(n, my.id)) return [409, { error: 'Diesen Gildennamen gibt es schon.' }];
    my.name = n; gMark(); return ok('Name geändert.');
  }
  if (action === 'guild_invite') {
    const other = accounts[wk];
    if (!other) return [404, { error: 'Diesen Namen gibt es nicht.' }];
    if (wk === key) return [400, { error: 'Das bist du selbst.' }];
    if (gOf.has(wk)) return [400, { error: `${other.name} ist schon in einer Gilde.` }];
    if (my.members.length >= G_MAX) return [400, { error: 'Deine Gilde ist voll.' }];
    if (my.req.includes(wk)) { gDrop(my.req, wk); my.members.push(wk); for (const o of Object.values(guilds)) gDrop(o.req, wk), gDrop(o.inv, wk); gMark(); return ok(`${other.name} hatte schon angefragt und ist jetzt dabei.`); }
    if (my.inv.includes(wk)) return [400, { error: 'Die Einladung ist schon unterwegs.' }];
    if (my.inv.length >= G_REQ_MAX) return [400, { error: 'Zu viele offene Einladungen.' }];
    my.inv.push(wk); gMark(); return ok(`${other.name} ist eingeladen.`);
  }
  if (action === 'guild_uninvite') { gDrop(my.inv, wk); gMark(); return ok(''); }
  if (action === 'guild_decide') { // Anfrage bestätigen oder ablehnen
    if (!my.req.includes(wk)) return [404, { error: 'Diese Anfrage gibt es nicht mehr.' }];
    gDrop(my.req, wk);
    if (!body.yes) { gMark(); return ok('Anfrage abgelehnt.'); }
    if (gOf.has(wk)) { gMark(); return [400, { error: `${nameOf(wk)} ist inzwischen in einer anderen Gilde.` }]; }
    if (my.members.length >= G_MAX) { gMark(); return [400, { error: 'Deine Gilde ist voll.' }]; }
    my.members.push(wk); for (const o of Object.values(guilds)) gDrop(o.req, wk), gDrop(o.inv, wk);
    gMark(); return ok(`${nameOf(wk)} ist jetzt in der Gilde.`);
  }
  if (action === 'guild_kick') {
    if (wk === key || !my.members.includes(wk)) return [400, { error: 'Das geht nicht.' }];
    gDrop(my.members, wk); gMark(); return ok(`${nameOf(wk)} wurde aus der Gilde entfernt.`);
  }
  return [404, { error: 'Unbekannt' }];
}
const GUILD_ACTIONS = ['guild', 'guild_search', 'guild_create', 'guild_request', 'guild_cancel', 'guild_answer', 'guild_leave', 'guild_rename', 'guild_invite', 'guild_uninvite', 'guild_decide', 'guild_kick'];

const keyOf = n => n.toLowerCase();
const cleanName = n => String(n || '').trim().replace(/\s+/g, ' ');
const validName = n => /^[\p{L}\p{N} _.-]{3,20}$/u.test(n);
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
function newToken(acc) {
  const t = crypto.randomBytes(24).toString('hex');
  acc.tokens = [sha256(t), ...(acc.tokens || [])].slice(0, 8); // bis zu 8 Geräte
  return t;
}
function checkPw(acc, pw) {
  const h = Buffer.from(hashPw(pw, acc.salt), 'hex'), want = Buffer.from(acc.hash, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
function cleanData(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const s = JSON.stringify(d);
  return s.length <= 40000 ? JSON.parse(s) : null;
}


// ---------- Inselreich-Spielstände ----------
// Gleiches Konto (Name + Passwort) wie im Ritterlauf, aber eigene Datei, damit der Ritterlauf-Speicher klein bleibt.
const ISL_FILE = 'inselreich-spielstaende.json', ISL_LOCAL = path.join(__dirname, 'inselreich-spielstaende.local.json');
let isl = {}, islSha = null, islDirty = false, islTimer = null;
async function islLoad() {
  try {
    if (durable) {
      const res = await gh('GET', null, ISL_FILE);
      if (res.status === 200) { const j = await res.json(); islSha = j.sha; let text = j.content ? Buffer.from(j.content, 'base64').toString('utf8') : '';
        if (!text && j.size > 0) { const raw = await fetch(`https://api.github.com/repos/${REPO}/contents/${ISL_FILE}`, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.raw', 'User-Agent': 'fsg-spiele', 'X-GitHub-Api-Version': '2022-11-28' } }); if (raw.ok) text = await raw.text(); }
        isl = JSON.parse(text || '{}'); }
    } else if (fs.existsSync(ISL_LOCAL)) isl = JSON.parse(fs.readFileSync(ISL_LOCAL, 'utf8'));
  } catch (e) { console.error('Inselreich-Stände laden:', e); }
}
async function islFlush() {
  if (!islDirty) return;
  islDirty = false;
  const text = JSON.stringify(isl);
  try {
    if (durable) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await gh('PUT', { message: 'Inselreich-Spielstände aktualisiert', content: Buffer.from(text).toString('base64'), ...(islSha ? { sha: islSha } : {}) }, ISL_FILE);
        if (res.ok) { islSha = (await res.json()).content.sha; return; }
        if (res.status === 409 || res.status === 422) { const g = await gh('GET', null, ISL_FILE); if (g.ok) islSha = (await g.json()).sha; continue; }
        console.error('Inselreich-Stände speichern:', res.status); break;
      }
      islDirty = true;
    } else fs.writeFileSync(ISL_LOCAL, text);
  } catch (e) { islDirty = true; console.error('Inselreich-Stände speichern:', e); }
}
function islMark() { islDirty = true; if (!islTimer) islTimer = setTimeout(() => { islTimer = null; islFlush(); }, 20000); }
function islAction(action, key, acc, body) {
  const cur = isl[key];
  if (action === 'insel_load') return [200, { name: acc.name, data: cur ? cur.d : null, updated: cur ? cur.u : 0 }];
  // insel_save
  const d = body.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return [400, { error: 'Der Spielstand ist ungültig.' }];
  const text = JSON.stringify(d);
  if (text.length > 60000) return [413, { error: 'Der Spielstand ist zu groß.' }];
  const base = Number(body.base) || 0;
  if (cur && base && cur.u > base && !body.force) return [409, { conflict: true, data: cur.d, updated: cur.u, error: 'Auf einem anderen Gerät wurde weitergespielt.' }];
  isl[key] = { d: JSON.parse(text), u: Date.now() }; islMark();
  return [200, { updated: isl[key].u, durable }];
}
// Für Inselreich (Bauplatz gehört dem Konto, egal auf welchem Gerät)
function tokenKey(name, token) {
  const key = keyOf(cleanName(name)), acc = accounts[key];
  return acc && (acc.tokens || []).includes(sha256(String(token || ''))) ? key : null;
}


// ---------- Casino-Gutschriften (einmalig je Konto, Name in Kleinbuchstaben) ----------
const CZ_GIFTS = [
  { id: 'g-2026-11-09-chop', k: 'chop', n: 14300, why: 'Ersatz für den Fehler beim Verlassen des Blackjack-Tischs' },
  { id: 'g-2026-11-09-chop2', k: 'chop', n: 14300, why: 'Ersatz für den Fehler beim Verlassen des Blackjack-Tischs (kam vorher nicht beim Konto an)' },
];

// ---------- Casino-Konto: Jetons liegen auf dem Server beim Hub-Konto (nicht mehr im Browser) ----------
// Jedes Konto startet einmal mit 10.000 Jetons. Am Tisch werden die Jetons des Platzes laufend ins Konto geschrieben.
const CZ_START = 10000, CZ_DEBT_MAX = 50000;
const CZ_PRICES = {
  fx: { konfetti: 0, gold: 8000, feuerwerk: 20000, blitz: 35000, diamant: 60000, regenbogen: 100000 },
  sfx: { klingeln: 0, fanfare: 6000, glocken: 12000, jackpot: 25000, applaus: 40000, koenig: 80000 },
  felt: { gruen: 0, blau: 5000, rot: 5000, lila: 10000, nacht: 15000, goldf: 50000 },
  badge: { '': 0, zylinder: 5000, klee: 10000, hai: 20000, feuer: 40000, dia: 80000, krone: 150000 },
};
const CZ_JOBS = { mine: 1400, teller: 900, putzen: 2200 }; // so schnell kann man frühestens fertig sein (ms)
const czSeated = new Map(); // Konto -> Raum, solange es an einem Tisch sitzt (nur im Speicher)
const czDay = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
function czAcc(key) {
  const a = accounts[key]; if (!a) return null;
  if (!a.cz) { a.cz = { w: CZ_START, d: 0, m: CZ_START, own: [], eq: {}, day: '', help: 0, work: 0, t: Date.now() }; markDirty(); }
  return a.cz;
}
function czSync(key, w) { // vom Tisch: aktueller Stand des Platzes
  const z = czAcc(key); if (!z) return;
  w = Math.max(0, Math.min(1e12, Math.floor(Number(w) || 0)));
  if (z.w !== w) { z.w = w; z.m = Math.max(z.m || 0, w - (z.d || 0)); z.t = Date.now(); markDirty(); }
}
// ---------- Alte Stände zurückholen (einmalig) ----------
// Vor dem Umzug auf den Server lagen die Jetons im Gerät; die alte Rangliste (casino-rangliste.json) hat je Gerät Name und Stand gemeldet.
// Wer dort stand und ein Hub-Konto mit demselben Namen hat, bekommt einmalig den Teil über 10.000 zurück, den der Neustart genommen hat.
// Gedeckelt bei 50.000. Wer je über 1 Mio. hatte, hat sehr wahrscheinlich geschummelt und bekommt nichts zurück.
const CZ_OLD_FILE = 'casino-rangliste.json', CZ_OLD_LOCAL = path.join(__dirname, 'casino-rangliste.local.json');
const CZ_REST_ID = 'r-2026-11-09-alt', CZ_REST_MAX = 50000, CZ_CHEAT = 1e6;
let czOld = null; // Kontoschlüssel -> alter Stand
let czOldDev = null; // Geräte-Eintrag (sha256('cz'+Gerätekennung)) -> { n, c, m, t } aus der alten Rangliste
// Zweite Runde: Rückgabe über das Gerät, auf dem die Jetons lagen (der Name in der alten Liste war oft nicht der Kontoname).
const CZ_DEV_ID = 'r-2026-11-09-geraet';
const czClaimed = () => new Set(Object.values(accounts).map(a => a.czClaim).filter(Boolean));
async function czOldLoad() {
  let raw = null;
  try {
    if (durable) { const res = await gh('GET', null, CZ_OLD_FILE); if (res.status === 200) { const j = await res.json(); raw = JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8') || '{}'); } }
    else if (fs.existsSync(CZ_OLD_LOCAL)) raw = JSON.parse(fs.readFileSync(CZ_OLD_LOCAL, 'utf8'));
  } catch (e) { console.error('Alte Casino-Rangliste laden:', e); }
  if (!raw) { console.log('Alte Casino-Rangliste nicht gefunden – keine Rückgabe'); return; } // ohne Datei niemanden als erledigt markieren
  const best = {}, cheat = new Set();
  for (const e of Object.values(raw || {})) {
    if (!e || !e.n) continue; const k = keyOf(cleanName(e.n)); if (!k) continue;
    if ((Number(e.m) || 0) > CZ_CHEAT || (Number(e.c) || 0) > CZ_CHEAT) cheat.add(k);
    best[k] = Math.max(best[k] || 0, Math.floor(Number(e.c) || 0));
  }
  for (const k of cheat) delete best[k];
  czOld = best; czOldDev = raw;
  console.log(`Alte Casino-Stände: ${Object.keys(best).length} Namen, ${cheat.size} ausgeschlossen`);
}
function czState(key, acc) {
  const z = czAcc(key), now = Date.now();
  // einmalige Gutschriften – nicht während man am Tisch sitzt, sonst überschreibt der Platz sie
  let gift = 0, why = ''; acc.gifts = acc.gifts || [];
  if (!czSeated.has(key)) {
    for (const g of CZ_GIFTS) if (g.k === key && !acc.gifts.includes(g.id)) { acc.gifts.push(g.id); z.w += g.n; gift += g.n; why = g.why; markDirty(); }
    if (czOld && !acc.gifts.includes(CZ_REST_ID)) {
      acc.gifts.push(CZ_REST_ID); markDirty();
      const back = Math.min(CZ_REST_MAX, czOld[key] || 0) - CZ_START;
      if (back > 0) { z.w += back; z.m = Math.max(z.m || 0, z.w - (z.d || 0)); gift += back; why = 'dein alter Stand von vor der Umstellung (bis 50.000)'; }
    }
  }
  return { name: acc.name, w: z.w, d: z.d || 0, m: z.m || 0, bonus: z.day !== czDay(), help: z.w < 100 && now - (z.help || 0) > 3600e3, own: z.own || [], eq: z.eq || {}, work: z.work || 0, seated: czSeated.has(key), gift, why };
}
function czTop(key) {
  const old = Date.now() - 30 * 864e5, all = Object.entries(accounts).filter(([, a]) => a.cz);
  const live = all.filter(([, a]) => (a.cz.t || 0) > old).sort((a, b) => (b[1].cz.w - (b[1].cz.d || 0)) - (a[1].cz.w - (a[1].cz.d || 0)));
  const best = all.slice().sort((a, b) => (b[1].cz.m || 0) - (a[1].cz.m || 0));
  const pack = (list, f) => ({ top: list.slice(0, 50).map(([k, a]) => ({ n: a.name, c: f(a.cz), b: (a.cz.eq && a.cz.eq.badge) || '', me: k === key, adm: VS_ADMINS.includes(k) })), rank: key ? list.findIndex(([k]) => k === key) + 1 : 0, mine: key && accounts[key] && accounts[key].cz ? f(accounts[key].cz) : 0, players: list.length });
  const cur = pack(live, z => Math.max(0, z.w - (z.d || 0))), ever = pack(best, z => z.m || 0);
  return { top: cur.top.slice(0, 20), rank: cur.rank, players: cur.players, cur, ever };
}
function czAction(action, key, acc, body) {
  if (action === 'casino_top' || action === 'casino_report') return [200, czTop(acc ? key : '')];
  if (!acc || !(acc.tokens || []).includes(sha256(String(body.token || '')))) return [401, { error: 'Bitte melde dich im Hub an, um im Casino zu spielen.' }];
  const z = czAcc(key), ok = () => { z.t = Date.now(); markDirty(); return [200, czState(key, acc)]; };
  if (action === 'cz_state') return [200, czState(key, acc)];
  if (action === 'cz_claim') { // alten Stand dieses Geräts zurückholen (einmal pro Konto und pro Gerät)
    const st = czState(key, acc); acc.gifts = acc.gifts || [];
    if (!czOldDev || acc.gifts.includes(CZ_DEV_ID) || czSeated.has(key)) return [200, st];
    const dk = String(body.dev || ''); if (!/^[a-f0-9]{32}$/.test(dk)) return [200, st];
    const id = sha256('cz' + dk).slice(0, 16), e = czOldDev[id];
    if (!e || czClaimed().has(id)) return [200, st];
    if ((Number(e.m) || 0) > CZ_CHEAT || (Number(e.c) || 0) > CZ_CHEAT) { acc.gifts.push(CZ_DEV_ID); acc.czClaim = id; markDirty(); return [200, { ...st, claimNo: 'Auf diesem Gerät lagen über 1 Million Jetons – die werden nicht zurückgegeben.' }]; }
    const prev = Math.max(0, Math.min(CZ_REST_MAX, (czOld && czOld[key]) || 0) - CZ_START); // schon über den Namen zurückbekommen
    const back = Math.max(0, Math.min(CZ_REST_MAX, Math.floor(Number(e.c) || 0)) - CZ_START - prev);
    if (back <= 0) return [200, st]; // nichts zu holen – Gerät nicht verbrauchen
    acc.gifts.push(CZ_DEV_ID); acc.czClaim = id;
    z.w += back; z.m = Math.max(z.m || 0, z.w - (z.d || 0)); z.t = Date.now(); markDirty();
    return [200, { ...czState(key, acc), gift: (st.gift || 0) + back, why: `dein alter Stand auf diesem Gerät (${Math.min(CZ_REST_MAX, Math.floor(Number(e.c) || 0)).toLocaleString('de-DE')} Jetons, höchstens 50.000)` }];
  }
  if (czSeated.has(key) && action !== 'cz_eq') return [409, { error: 'Du sitzt noch an einem Tisch. Steh zuerst auf.' }];
  if (action === 'cz_bonus') { if (z.day === czDay()) return [409, { error: 'Den Tagesbonus gibt es morgen wieder.' }]; z.day = czDay(); z.w += 2000; return ok(); }
  if (action === 'cz_help') { if (z.w >= 100 || Date.now() - (z.help || 0) < 3600e3) return [409, { error: 'Starthilfe gibt es nur, wenn du fast nichts mehr hast – höchstens einmal pro Stunde.' }]; z.help = Date.now(); z.w += 1000; return ok(); }
  if (action === 'cz_loan') { const n = Math.min(Math.floor(Number(body.n) || 0), CZ_DEBT_MAX - (z.d || 0)); if (n <= 0) return [409, { error: 'Dein Kreditrahmen ist ausgeschöpft.' }]; z.d = (z.d || 0) + n; z.w += n; return ok(); }
  if (action === 'cz_pay') { const n = Math.min(Math.floor(Number(body.n) || 0), z.w, z.d || 0); if (n <= 0) return [409, { error: 'Nichts zurückzuzahlen.' }]; z.w -= n; z.d -= n; return ok(); }
  if (action === 'cz_buy' || action === 'cz_eq') {
    const cat = String(body.cat || ''), k = String(body.k || ''), P = CZ_PRICES[cat]; if (!P || !(k in P)) return [400, { error: 'Gibt es nicht.' }];
    z.own = z.own || []; z.eq = z.eq || {};
    if (action === 'cz_buy' && P[k] && !z.own.includes(k)) { if (z.w - (z.d || 0) < P[k]) return [409, { error: 'Dafür fehlen dir eigene Jetons (Schulden zählen nicht).' }]; z.w -= P[k]; z.own.push(k); }
    if (P[k] && !z.own.includes(k)) return [409, { error: 'Das hast du noch nicht gekauft.' }];
    z.eq[cat] = k; return ok();
  }
  if (action === 'cz_work') {
    const job = String(body.job || ''), min = CZ_JOBS[job]; if (!min) return [400, { error: 'Diesen Job gibt es nicht.' }];
    if (!(z.d > 0)) return [409, { error: 'Du hast keine Schulden.' }];
    const now = Date.now(); if (now - (z.wt || 0) < min) return [429, { error: 'Langsam! Der Aufseher glaubt dir nicht, dass du so schnell warst.' }];
    z.wt = now; let pay = 0, res = '';
    if (job === 'mine') { if (Math.random() < 0.7) { pay = 40; res = 'kohle'; } else res = 'stein'; }
    else if (job === 'teller') { if (Math.random() < 0.06) { z.d = Math.min(CZ_DEBT_MAX * 2, z.d + 50); res = 'kaputt'; } else { pay = 30; res = 'sauber'; } }
    else { pay = 45; res = 'sauber'; }
    pay = Math.min(pay, z.d); z.d -= pay; z.work = (z.work || 0) + pay;
    const r = ok(); r[1].res = res; r[1].pay = pay; return r;
  }
  return [400, { error: 'Unbekannte Aktion.' }];
}

// Bremse gegen massenhaft neue Konten (z. B. um im Casino immer wieder neu anzufangen): je Netzwerk 1 Konto pro 20 s und 25 pro Tag
const creates = new Map();
function createLimit(ip, add) {
  const now = Date.now(), k = String(ip || '?'), e = (creates.get(k) || []).filter(t => now - t < 864e5);
  if (add) { e.push(now); creates.set(k, e); return ''; }
  if (e.length && now - e[e.length - 1] < 20000) return 'Bitte warte kurz, bevor du noch ein Konto anlegst.';
  if (e.length >= 25) return 'Von diesem Netzwerk wurden heute schon sehr viele Konten angelegt. Versuch es morgen wieder.';
  return '';
}
// ---------- Ideen & Vorschläge der Spieler ----------
// Ablauf: Spieler reichen ein (Status "neu", nur für sie sichtbar). Täglich gegen 18 Uhr prüft Claude die neuen Vorschläge
// und schreibt das Ergebnis in vorschlaege-pruefung.json (im selben privaten Repo). Der Server holt diese Datei regelmäßig ab:
// geeignete Vorschläge werden "offen" (öffentlich, mit 👍 bewertbar), unpassende "verworfen". Der Admin (Chop) nimmt offene an
// oder lehnt sie ab. An Update-Tagen (Mi, Fr, So) setzt Claude angenommene um und meldet sie über dieselbe Datei als "umgesetzt".
// Nur der Server schreibt vorschlaege.json, nur Claude schreibt vorschlaege-pruefung.json – so gibt es keine Schreibkonflikte.
const VS_FILE = 'vorschlaege.json', VS_LOCAL = path.join(__dirname, 'vorschlaege.local.json');
const VS_REV_FILE = 'vorschlaege-pruefung.json', VS_REV_LOCAL = path.join(__dirname, 'vorschlaege-pruefung.local.json');
const VS_ADMINS = String(process.env.VS_ADMINS || 'chop').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const VS_CATS = { balance: '⚖️ Balance', feature: '✨ Neue Funktion', bug: '🐞 Fehler', grafik: '🎨 Grafik & Sound', sonstiges: '💬 Sonstiges' };
const VS_WEEK = 3, VS_MAX_NEW = 300;
let vs = { list: [], seq: 0 }, vsSha = null, vsDirty = false, vsTimer = null, vsRevSha = '';
async function vsLoad() {
  try {
    if (durable) { const res = await gh('GET', null, VS_FILE); if (res.status === 200) { const j = await res.json(); vsSha = j.sha; vs = JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8') || '{}'); } }
    else if (fs.existsSync(VS_LOCAL)) vs = JSON.parse(fs.readFileSync(VS_LOCAL, 'utf8'));
  } catch (e) { console.error('Vorschläge laden:', e); }
  vs.list = vs.list || []; vs.seq = vs.seq || 0;
  vsPull(); setInterval(vsPull, 10 * 60e3).unref();
}
async function vsFlush() {
  if (!vsDirty) return; vsDirty = false;
  const text = JSON.stringify(vs);
  try {
    if (durable) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await gh('PUT', { message: 'Vorschläge aktualisiert', content: Buffer.from(text).toString('base64'), ...(vsSha ? { sha: vsSha } : {}) }, VS_FILE);
        if (res.ok) { vsSha = (await res.json()).content.sha; return; }
        if (res.status === 409 || res.status === 422) { const g = await gh('GET', null, VS_FILE); if (g.ok) vsSha = (await g.json()).sha; continue; }
        console.error('Vorschläge speichern:', res.status); break;
      }
      vsDirty = true;
    } else fs.writeFileSync(VS_LOCAL, text);
  } catch (e) { vsDirty = true; console.error('Vorschläge speichern:', e); }
}
function vsMark() { vsDirty = true; if (!vsTimer) vsTimer = setTimeout(() => { vsTimer = null; vsFlush(); }, 15000); }
// Prüfergebnisse von Claude abholen und übernehmen
let vsPulled = 0;
async function vsPull() {
  vsPulled = Date.now(); let rev = null;
  try {
    if (durable) {
      const res = await gh('GET', null, VS_REV_FILE); if (res.status !== 200) return;
      const j = await res.json(); if (j.sha === vsRevSha) return; vsRevSha = j.sha;
      rev = JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8') || '{}');
    } else if (fs.existsSync(VS_REV_LOCAL)) rev = JSON.parse(fs.readFileSync(VS_REV_LOCAL, 'utf8'));
  } catch (e) { console.error('Vorschlags-Prüfung laden:', e); return; }
  if (!rev) return;
  const byId = new Map(vs.list.map(v => [v.id, v])); let changed = false;
  const txt = (x, n) => String(x || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n);
  for (const [id, r] of Object.entries(rev.reviews || {})) {
    const v = byId.get(id); if (!v || v.st !== 'neu' || !r) continue;
    v.st = r.st === 'verworfen' ? 'verworfen' : 'offen';
    v.ai = { v: ['gut', 'unsicher', 'nein'].includes(r.v) ? r.v : 'unsicher', why: txt(r.why, 600), cost: ['klein', 'mittel', 'groß'].includes(r.cost) ? r.cost : '', dup: txt(r.dup, 20) };
    if (v.st === 'verworfen') v.reason = txt(r.reason || r.why, 200);
    v.rt = Date.now(); changed = true;
  }
  for (const [id, d] of Object.entries(rev.done || {})) {
    const v = byId.get(id); if (!v || v.st !== 'angenommen') continue;
    v.st = 'umgesetzt'; v.note = txt(d && d.note, 300); v.dt = Date.now(); changed = true;
  }
  if (changed) vsMark();
}
const vsPublic = v => ['offen', 'angenommen', 'umgesetzt', 'abgelehnt'].includes(v.st);
function vsView(v, key, admin) {
  const o = { id: v.id, n: v.n, g: v.g, c: v.c, t: v.t, x: v.x, st: v.st, ts: v.ts, up: (v.votes || []).length, me: (v.votes || []).includes(key), mine: v.k === key, adm: VS_ADMINS.includes(v.k) };
  if (v.reason && (o.mine || admin)) o.reason = v.reason;
  if (v.note) o.note = v.note;
  if (v.dn) { o.dn = v.dn; o.dnBy = v.dnBy || 'Admin'; }
  if (admin && v.ai) o.ai = v.ai;
  return o;
}
async function vsAction(action, key, acc, body) {
  const authed = !!(acc && (acc.tokens || []).includes(sha256(String(body.token || ''))));
  const admin = authed && VS_ADMINS.includes(key);
  const now = Date.now();
  if (action === 'vs_list') {
    if (now - vsPulled > 120e3) await vsPull(); // Prüfergebnisse höchstens alle 2 Minuten nachsehen
    const old = now - 30 * 864e5;
    const list = vs.list.filter(v => (vsPublic(v) && !(v.st === 'abgelehnt' && v.ts < old)) || (authed && (v.k === key || admin)))
      .slice(-300).map(v => vsView(v, authed ? key : '', admin));
    const used = authed ? vs.list.filter(v => v.k === key && now - v.ts < 7 * 864e5).length : 0;
    return [200, { list, cats: VS_CATS, admin, left: authed ? Math.max(0, VS_WEEK - used) : 0, week: VS_WEEK }];
  }
  if (!authed) return [401, { error: 'Melde dich im Hub mit deinem Konto an.' }];
  if (action === 'vs_add') {
    const t = String(body.t || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 80), x = String(body.x || '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').trim().slice(0, 800);
    const g = String(body.g || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30), c = VS_CATS[body.c] ? body.c : 'sonstiges';
    if (t.length < 4) return [400, { error: 'Gib deinem Vorschlag einen kurzen Titel (mindestens 4 Zeichen).' }];
    if (x.length < 15) return [400, { error: 'Beschreib deinen Vorschlag etwas genauer (mindestens 15 Zeichen).' }];
    if (!g) return [400, { error: 'Wähle aus, zu welchem Spiel der Vorschlag gehört.' }];
    if (vs.list.filter(v => v.k === key && now - v.ts < 7 * 864e5).length >= VS_WEEK) return [429, { error: `Du kannst höchstens ${VS_WEEK} Vorschläge pro Woche einreichen.` }];
    if (vs.list.filter(v => v.st === 'neu').length >= VS_MAX_NEW) return [429, { error: 'Gerade warten sehr viele Vorschläge auf die Prüfung. Versuch es morgen wieder.' }];
    const v = { id: 'v' + (++vs.seq), k: key, n: acc.name, g, c, t, x, st: 'neu', ts: now, votes: [] };
    vs.list.push(v); vsMark();
    return [200, { ok: true, item: vsView(v, key, admin) }];
  }
  const v = vs.list.find(e => e.id === String(body.id || ''));
  if (!v) return [404, { error: 'Diesen Vorschlag gibt es nicht mehr.' }];
  if (action === 'vs_vote') {
    if (v.st !== 'offen') return [400, { error: 'Bewerten kann man nur offene Vorschläge.' }];
    if (v.k === key) return [400, { error: 'Deinen eigenen Vorschlag kannst du nicht bewerten.' }];
    v.votes = v.votes || []; const i = v.votes.indexOf(key); if (i >= 0) v.votes.splice(i, 1); else v.votes.push(key);
    vsMark(); return [200, { ok: true, item: vsView(v, key, admin) }];
  }
  if (action === 'vs_delete') { // eigenen, noch nicht geprüften Vorschlag zurückziehen
    if (!(v.k === key && v.st === 'neu') && !admin) return [403, { error: 'Das geht nur bei deinen eigenen, noch nicht geprüften Vorschlägen.' }];
    vs.list.splice(vs.list.indexOf(v), 1); vsMark(); return [200, { ok: true }];
  }
  if (action === 'vs_note') { // Kommentar des Admins zu einem Vorschlag (für alle sichtbar)
    if (!admin) return [403, { error: 'Nur für Admins.' }];
    v.dn = String(body.dn || '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').trim().slice(0, 500); v.dnBy = acc.name;
    vsMark(); return [200, { ok: true, item: vsView(v, key, admin) }];
  }
  if (action === 'vs_decide') {
    if (!admin) return [403, { error: 'Nur für Admins.' }];
    const d = String(body.d || '');
    if (!['angenommen', 'abgelehnt', 'offen'].includes(d)) return [400, { error: 'Ungültig' }];
    if (!['offen', 'angenommen', 'abgelehnt', 'neu', 'verworfen'].includes(v.st)) return [400, { error: 'Dieser Vorschlag ist schon umgesetzt.' }];
    v.st = d; v.dt = now;
    const dn = String(body.dn || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 500); if (dn) { v.dn = dn; v.dnBy = acc.name; } // Begründung nur setzen, wenn eine angegeben wurde
    vsMark(); return [200, { ok: true, item: vsView(v, key, admin) }];
  }
  return [400, { error: 'Unbekannte Aktion' }];
}

// Bremse gegen Passwort-Raten: höchstens 12 falsche Versuche pro Minute und IP
const fails = new Map();
const recent = ip => (fails.get(ip) || []).filter(x => Date.now() - x < 60000);
const blocked = ip => recent(ip).length >= 12;
const fail = ip => fails.set(ip, [...recent(ip), Date.now()]);

async function handle(action, body, ip) {
  if (!ready) return [503, { error: 'Der Speicher startet noch. Versuch es in ein paar Sekunden noch mal.' }];
  const name = cleanName(body.name), key = keyOf(name), acc = accounts[key];
  if (action === 'status') return [200, { durable, error: lastError || null, testers: TESTERS.length, admins: VS_ADMINS.map(k => accounts[k] && accounts[k].name).filter(Boolean) }];
  if (action === 'create') {
    const lim = createLimit(ip); if (lim) return [429, { error: lim }];
    const dev = /^[a-f0-9]{32}$/.test(String(body._dev || '')) ? sha256('dev' + body._dev).slice(0, 24) : '';
    if (!dev) return [428, { error: 'Bitte lade die Seite einmal neu und versuch es dann noch mal. (Cookies müssen erlaubt sein.)' }];
    const had = Object.values(accounts).find(x => x.dev === dev);
    if (had) return [403, { error: `Auf diesem Gerät wurde schon ein Konto erstellt (${had.name}). Melde dich damit an – anmelden kannst du dich mit jedem Konto.` }];
    if (!validName(name)) return [400, { error: 'Der Name braucht 3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, - _ .).' }];
    if (String(body.pass || '').length < 4) return [400, { error: 'Das Passwort braucht mindestens 4 Zeichen.' }];
    if (acc) return [409, { error: 'Diesen Namen gibt es schon. Wähle einen anderen oder lade den Spielstand.' }];
    let data = cleanData(body.data);
    if (!data) return [400, { error: 'Der Spielstand ist ungültig.' }];
    const wiped = !isTester(key) && (oldSeason(data) || testData(data));
    if (wiped) data = { season: SEASON };
    if (Object.keys(accounts).length >= 5000) return [507, { error: 'Der Speicher ist voll.' }];
    const salt = crypto.randomBytes(16).toString('hex');
    const a = accounts[key] = { name, salt, hash: hashPw(body.pass, salt), tokens: [], data, updated: Date.now(), season: SEASON, dev };
    createLimit(ip, true); const token = newToken(a); markDirty();
    return [200, { name, token, updated: a.updated, durable, tester: isTester(key), reset: wiped && testData(cleanData(body.data)) }];
  }
  if (action === 'login') {
    if (blocked(ip)) return [429, { error: 'Zu viele falsche Versuche. Warte eine Minute.' }];
    if (!acc || !checkPw(acc, body.pass || '')) { fail(ip); return [401, { error: 'Name oder Passwort stimmt nicht.' }]; }
    const token = newToken(acc); markDirty();
    return [200, { name: acc.name, token, data: acc.data, updated: acc.updated, durable, tester: isTester(key) }];
  }
  if (action === 'session') { // angemeldet bleiben: Konto aus dem Hub in einem Spiel übernehmen
    if (!acc || !(acc.tokens || []).includes(sha256(String(body.token || '')))) return [401, { error: 'Bitte melde dich neu an.' }];
    return [200, { name: acc.name, data: acc.data || null, updated: acc.updated || 0, durable, tester: isTester(key) }];
  }
  if (action === 'save') {
    if (!acc || !acc.tokens.includes(sha256(String(body.token || '')))) return [401, { error: 'Bitte melde dich neu an.' }];
    const data = cleanData(body.data);
    if (!data) return [400, { error: 'Der Spielstand ist ungültig.' }];
    // Stand aus einer alten Saison (z. B. ein noch offener Tab): nicht annehmen, das Spiel setzt sich dann selbst zurück
    if (!isTester(key) && (oldSeason(data) || testData(data))) return [409, { reset: true, updated: acc.updated, error: 'Neue Version: Der Spielstand wurde zurückgesetzt.' }];
    // Wurde inzwischen auf einem anderen Gerät gespeichert? Dann nicht einfach überschreiben.
    const base = Number(body.base) || 0;
    if (base && acc.updated > base && !body.force) return [409, { conflict: true, data: acc.data, updated: acc.updated, error: 'Auf einem anderen Gerät wurde weitergespielt.' }];
    if (body.force && base && acc.updated > base) acc.prev = { data: acc.data, updated: acc.updated }; // Sicherung des überschriebenen Stands
    acc.data = data; acc.updated = Date.now(); markDirty();
    return [200, { updated: acc.updated, durable, tester: isTester(key) }];
  }
  if (action === 'password') {
    if (!acc || !acc.tokens.includes(sha256(String(body.token || '')))) return [401, { error: 'Bitte melde dich neu an.' }];
    if (String(body.pass || '').length < 4) return [400, { error: 'Das Passwort braucht mindestens 4 Zeichen.' }];
    acc.salt = crypto.randomBytes(16).toString('hex'); acc.hash = hashPw(body.pass, acc.salt);
    const token = newToken(acc); acc.tokens = [acc.tokens[0]]; markDirty(); // andere Geräte abmelden
    return [200, { token }];
  }
  if (action === 'board') return [200, board()];
  if (action === 'casino_top' || action === 'casino_report' || action.startsWith('cz_')) return czAction(action, key, acc, body);
  if (action.startsWith('vs_')) return vsAction(action, key, acc, body);
  if (action === 'casino_gift') return [200, { chips: 0 }]; // alte Seiten: Gutschriften kommen jetzt mit cz_state
  if (action === 'insel_load' || action === 'insel_save') {
    if (!acc || !(acc.tokens || []).includes(sha256(String(body.token || '')))) return [401, { error: 'Bitte melde dich neu an.' }];
    return islAction(action, key, acc, body);
  }
  if (GUILD_ACTIONS.includes(action)) {
    if (!acc || !(acc.tokens || []).includes(sha256(String(body.token || '')))) return [401, { error: 'Bitte melde dich neu an.' }];
    return guildAction(action, key, acc, body);
  }
  if (['wb_info', 'wb_start', 'wb_hit', 'wb_claim'].includes(action)) {
    if (!acc || !(acc.tokens || []).includes(sha256(String(body.token || '')))) return [401, { error: 'Bitte melde dich neu an.' }];
    return wbAction(action, key, acc, body);
  }
  if (['friends', 'friend_add', 'friend_answer', 'friend_remove', 'chat', 'chat_send', 'profile'].includes(action)) {
    if (!acc || !(acc.tokens || []).includes(sha256(String(body.token || '')))) return [401, { error: 'Bitte melde dich neu an.' }];
    return social(action, key, acc, body);
  }
  return [404, { error: 'Unbekannt' }];
}

// Bestenliste aus den gespeicherten Spielständen
function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}
let boardCache = null, boardAt = 0;
function board() {
  if (boardCache && Date.now() - boardAt < 20000) return boardCache;
  const wk = weekId(), num = v => Math.max(0, Math.floor(Number(v) || 0));
  const rows = Object.entries(accounts).filter(([key]) => !isTester(key)).map(([, a]) => {
    const d = a.data || {};
    return { name: a.name, stage: Math.max(num(d.bestEver), num(d.best)), cur: num(d.best), asc: num(d.asc), rebirths: num(d.rebirths), tower: num(d.towerBest),
      ach: Object.keys(d.ach || {}).length, week: d.weekly && d.weekly.week === wk ? num(d.weekly.best) : 0 };
  });
  const top = (key, tie) => rows.filter(r => r[key] > 0 || (key === 'prestige' && (r.asc || r.rebirths)))
    .sort((a, b) => (b[key] - a[key]) || (tie ? b[tie] - a[tie] : 0)).slice(0, 25);
  rows.forEach(r => (r.prestige = r.asc * 100 + r.rebirths));
  boardCache = { week: wk, players: rows.length, stage: top('stage'), prestige: top('prestige', 'stage'), tower: top('tower'), ach: top('ach'), weekly: top('week'),
    path: rows.filter(r => r.stage > 0).sort((a, b) => b.stage - a.stage).slice(0, 200).map(r => ({ name: r.name, stage: r.stage, cur: r.cur, asc: r.asc, rebirths: r.rebirths })) };
  boardAt = Date.now();
  return boardCache;
}

load().finally(czOldLoad); vsLoad(); chatLoad(); wbLoad(); gLoad(); islLoad();
// Render beendet den Dienst mit SIGTERM – vorher noch speichern
process.on('SIGTERM', async () => { await flush(); await chatFlush(); await wbFlush(); await gFlush(); await islFlush(); await vsFlush(); process.exit(0); });
process.on('SIGINT', async () => { await flush(); await chatFlush(); await wbFlush(); await gFlush(); await islFlush(); await vsFlush(); process.exit(0); });

const isAdmin = k => VS_ADMINS.includes(String(k || '').toLowerCase());
const adminNames = () => VS_ADMINS.map(k => accounts[k] && accounts[k].name).filter(Boolean);
module.exports = { handle, flush, durable, tokenKey, czAcc, czSync, czSeated, isAdmin, adminNames };
