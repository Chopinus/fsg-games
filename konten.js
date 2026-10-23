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
const WB_TRIES = 3, WB_MAX_BARS = 2000, WB_BOSSES = 15;
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

// Bremse gegen Passwort-Raten: höchstens 12 falsche Versuche pro Minute und IP
const fails = new Map();
const recent = ip => (fails.get(ip) || []).filter(x => Date.now() - x < 60000);
const blocked = ip => recent(ip).length >= 12;
const fail = ip => fails.set(ip, [...recent(ip), Date.now()]);

async function handle(action, body, ip) {
  if (!ready) return [503, { error: 'Der Speicher startet noch. Versuch es in ein paar Sekunden noch mal.' }];
  const name = cleanName(body.name), key = keyOf(name), acc = accounts[key];
  if (action === 'status') return [200, { durable, error: lastError || null, testers: TESTERS.length }];
  if (action === 'create') {
    if (!validName(name)) return [400, { error: 'Der Name braucht 3 bis 20 Zeichen (Buchstaben, Zahlen, Leerzeichen, - _ .).' }];
    if (String(body.pass || '').length < 4) return [400, { error: 'Das Passwort braucht mindestens 4 Zeichen.' }];
    if (acc) return [409, { error: 'Diesen Namen gibt es schon. Wähle einen anderen oder lade den Spielstand.' }];
    let data = cleanData(body.data);
    if (!data) return [400, { error: 'Der Spielstand ist ungültig.' }];
    const wiped = !isTester(key) && (oldSeason(data) || testData(data));
    if (wiped) data = { season: SEASON };
    if (Object.keys(accounts).length >= 5000) return [507, { error: 'Der Speicher ist voll.' }];
    const salt = crypto.randomBytes(16).toString('hex');
    const a = accounts[key] = { name, salt, hash: hashPw(body.pass, salt), tokens: [], data, updated: Date.now(), season: SEASON };
    const token = newToken(a); markDirty();
    return [200, { name, token, updated: a.updated, durable, tester: isTester(key), reset: wiped && testData(cleanData(body.data)) }];
  }
  if (action === 'login') {
    if (blocked(ip)) return [429, { error: 'Zu viele falsche Versuche. Warte eine Minute.' }];
    if (!acc || !checkPw(acc, body.pass || '')) { fail(ip); return [401, { error: 'Name oder Passwort stimmt nicht.' }]; }
    const token = newToken(acc); markDirty();
    return [200, { name: acc.name, token, data: acc.data, updated: acc.updated, durable, tester: isTester(key) }];
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

load(); chatLoad(); wbLoad(); gLoad();
// Render beendet den Dienst mit SIGTERM – vorher noch speichern
process.on('SIGTERM', async () => { await flush(); await chatFlush(); await wbFlush(); await gFlush(); process.exit(0); });
process.on('SIGINT', async () => { await flush(); await chatFlush(); await wbFlush(); await gFlush(); process.exit(0); });

module.exports = { handle, flush, durable };
