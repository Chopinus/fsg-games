// Spielstände mit selbst gewähltem Namen und Passwort.
// Dauerhaft gespeichert in einem privaten GitHub-Projekt (Umgebungsvariablen GITHUB_TOKEN und SAVE_REPO).
// Ohne diese Variablen landet alles nur in einer lokalen Datei, die beim Neustart von Render verloren geht.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.SAVE_REPO || '';
const FILE = 'ritter-spielstaende.json';
const LOCAL = path.join(__dirname, 'spielstaende.local.json');
const durable = !!(TOKEN && REPO);
// Test-Werkzeuge nur für diese Spielstand-Namen (Umgebungsvariable TEST_NAMES, mit Komma getrennt). Stehen bewusst nicht im Code.
const TESTERS = (process.env.TEST_NAMES || '').split(/[,;\n]/).map(n => n.replace(/["'`]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean);
const isTester = key => TESTERS.includes(key);
// Saison: muss zu SEASON in ritter.js passen. Beim Start werden alle Spielstände (außer Tester) einer älteren Saison zurückgesetzt.
// Name und Passwort bleiben, nur der Spielstand beginnt neu. Die alten Stände bleiben im Verlauf des GitHub-Projekts erhalten.
const SEASON = 1;
const oldSeason = d => !d || (Number(d.season) || 0) < SEASON;

let accounts = {};   // key (Name klein) -> { name, salt, hash, tokens: [sha256], data, updated }
let sha = null, dirty = false, flushTimer = null, ready = false, lastError = '';

const gh = (method, body) => fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
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
    if (!isTester(key) && oldSeason(data)) data = { season: SEASON };
    if (Object.keys(accounts).length >= 5000) return [507, { error: 'Der Speicher ist voll.' }];
    const salt = crypto.randomBytes(16).toString('hex');
    const a = accounts[key] = { name, salt, hash: hashPw(body.pass, salt), tokens: [], data, updated: Date.now(), season: SEASON };
    const token = newToken(a); markDirty();
    return [200, { name, token, updated: a.updated, durable, tester: isTester(key) }];
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
    if (!isTester(key) && oldSeason(data)) return [409, { reset: true, updated: acc.updated, error: 'Neue Version: Der Spielstand wurde zurückgesetzt.' }];
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

load();
// Render beendet den Dienst mit SIGTERM – vorher noch speichern
process.on('SIGTERM', async () => { await flush(); process.exit(0); });
process.on('SIGINT', async () => { await flush(); process.exit(0); });

module.exports = { handle, flush, durable };
