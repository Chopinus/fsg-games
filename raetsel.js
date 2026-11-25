// Tagesrätsel: Sudoku, Nonogramm, Verbindungen und Mathe-Blitz – jeden Tag neu, für alle gleich, mit Rangliste.
// Die Zeit misst der Server (Start bis richtige Lösung). Gespeichert beim Konto in acc.rx = { d: tag, k: { art: {...} } }.
const START = Date.UTC(2026, 10, 20);
const dayNo = (t = Date.now()) => Math.floor((t + 3600e3 - START) / 864e5);
const dayStr = (t = Date.now()) => new Date(t + 3600e3).toISOString().slice(0, 10);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (a, R) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cache = new Map();
const memo = (k, f) => { if (!cache.has(k)) { if (cache.size > 40) cache.clear(); cache.set(k, f()); } return cache.get(k); };

/* ---------- Sudoku ---------- */
function sudokuOk(g, i, v) { const r = (i / 9) | 0, c = i % 9, br = r - (r % 3), bc = c - (c % 3); for (let k = 0; k < 9; k++) { if (g[r * 9 + k] === v || g[k * 9 + c] === v || g[(br + ((k / 3) | 0)) * 9 + bc + (k % 3)] === v) return false; } return true; }
function sudokuFill(g, R) { const i = g.indexOf(0); if (i < 0) return true; for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], R)) { if (sudokuOk(g, i, v)) { g[i] = v; if (sudokuFill(g, R)) return true; g[i] = 0; } } return false; }
function sudokuCount(g, lim = 2) { const i = g.indexOf(0); if (i < 0) return 1; let n = 0; for (let v = 1; v <= 9 && n < lim; v++) if (sudokuOk(g, i, v)) { g[i] = v; n += sudokuCount(g, lim - n); g[i] = 0; } return n; }
function sudoku(d) {
  return memo('s' + d, () => {
    const R = rng(d * 7919 + 13), sol = Array(81).fill(0); sudokuFill(sol, R);
    const puz = sol.slice(), target = 30 + (d % 3) * 2; // 30–34 vorgegebene Zahlen
    for (const i of shuffle([...Array(81).keys()], R)) { if (puz.filter(Boolean).length <= target) break; const v = puz[i]; puz[i] = 0; if (sudokuCount(puz.slice()) !== 1) puz[i] = v; }
    return { puz, sol };
  });
}
/* ---------- Nonogramm (Pixelbilder 10×10) ---------- */
const PICS = [
  ['Herz', '...........##....##.####..########################.########...######.....####.......##..............'],
  ['Pilz', '...####....########.##.####.#############..####..#.............####......####......####.....######..'],
  ['Katze', '.#......#..##....##..########.##.####.################..####.########...######....#....#...##....##.'],
  ['Haus', '....##.......####.....######...########.##########.########..##.##.##..##.##.##..#####.##..#####.##.'],
  ['Baum', '....##.......####.....######...########...######...########.##########....##........##.......####...'],
  ['Schiff', '....#.........##........###.......####......#####.....#.....##########.########...######..##########'],
  ['Stern', '....##........##.......####...##########.########...######....######...###..###..##....##.#........#'],
  ['Rakete', '....##.......####......#..#......####......####......####.....######...##.##.##..#..##..#.....##....'],
  ['Smiley', '..######...#......#.#..#..#..##..#..#..##........##.#....#.##..####..#.#......#...######............'],
  ['Note', '...######....######....#....#....#....#....#....#....#....#..###..###.####.####.####.####..##...##..'],
  ['Fisch', '..............###...#..#####..##.###.##.######################.######.#..#####......###.............'],
  ['Schlüssel', '.####.....##..##....##..##.....####.......##........##........####......##........###.......##......'],
  ['Krone', '#...##...###..##..####.####.#######################.##.##.############.########..########...........'],
  ['Geist', '..######...########.############.##.##.###.##.##.#################################.##.##.##..#..#..#']
].map(([n, s]) => [n, s.replace(/~/g, '#').padEnd(100, '.').slice(0, 100)]);
function clues(bits) { const rows = [], cols = []; const run = a => { const o = []; let n = 0; for (const b of a) { if (b) n++; else if (n) { o.push(n); n = 0; } } if (n) o.push(n); return o.length ? o : [0]; };
  for (let r = 0; r < 10; r++) rows.push(run(bits.slice(r * 10, r * 10 + 10))); for (let c = 0; c < 10; c++) cols.push(run([...Array(10)].map((_, r) => bits[r * 10 + c]))); return { rows, cols }; }
function nono(d) { return memo('n' + d, () => { const [name, s] = PICS[((d % PICS.length) + PICS.length) % PICS.length]; const bits = [...s].map(ch => (ch === '#' ? 1 : 0)); return { name, bits, ...clues(bits) }; }); }
/* ---------- Verbindungen: 16 Wörter, 4 Gruppen ---------- */
// Spieler-Idee (v59): Jedes Wort darf nur in genau eine Gruppe passen (keine Doppeldeutigkeiten wie König/Dame in Schach und Karten).
const VERB = [
  [['Ritter', 'Burg Schwert Rüstung Lanze'], ['Schokoriegel', 'Twix Bounty Snickers Lion'], ['Römische Götter', 'Minerva Neptun Merkur Amor'], ['___zeit', 'Mahl Hoch Frei Schlaf']],
  [['Obst', 'Apfel Birne Kiwi Mango'], ['Smartphone-Marken', 'Apple Samsung Xiaomi Nokia'], ['Farben', 'Lila Türkis Beige Ocker'], ['___salat', 'Kartoffel Ei Nudel Wurst']],
  [['Hunderassen', 'Mops Pudel Dackel Beagle'], ['Sportarten mit Ball', 'Tennis Rugby Golf Handball'], ['Gibt es beim Boxen', 'Ring Runde Gong Handschuh'], ['___mann', 'Schnee Weihnachts Feuerwehr Sand']],
  [['Musikinstrumente', 'Geige Harfe Tuba Flöte'], ['Wochentage', 'Montag Freitag Samstag Sonntag'], ['Schach', 'Turm Läufer Bauer Springer'], ['Im Kartenspiel', 'Bube Ass Joker Pik']],
  [['Wetter', 'Regen Hagel Nebel Sturm'], ['Bäume', 'Eiche Birke Linde Tanne'], ['Hauptstädte', 'Rom Oslo Wien Bern'], ['Märchen-Figuren', 'Hexe Zwerg Riese Fee']],
  [['Fortbewegung', 'Fahrrad Roller Skateboard Inliner'], ['Im Klassenzimmer', 'Tafel Kreide Pult Beamer'], ['Getränke', 'Saft Tee Kakao Limo'], ['Zahlen auf Englisch', 'One Two Ten Six']],
  [['Gewürze', 'Pfeffer Salz Zimt Curry'], ['Superhelden', 'Batman Superman Hulk Thor'], ['Edelsteine', 'Rubin Saphir Opal Smaragd'], ['Körperteile', 'Knie Ellbogen Schulter Ferse']],
  [['Meerestiere', 'Hai Wal Qualle Robbe'], ['Kontinente', 'Afrika Asien Europa Amerika'], ['Pizzasorten', 'Margherita Hawaii Salami Funghi'], ['Sternzeichen', 'Löwe Widder Stier Zwillinge']],
  [['Gemüse', 'Gurke Lauch Spinat Kohl'], ['Werkzeuge', 'Hammer Schraubenzieher Zange Feile'], ['Tänze', 'Walzer Tango Salsa Samba'], ['Haben Zähne', 'Kamm Reißverschluss Zahnrad Krokodil']],
  [['Fächer in der Schule', 'Mathe Bio Chemie Kunst'], ['Spielkonsolen', 'Switch Xbox PlayStation GameBoy'], ['Vögel', 'Amsel Meise Spatz Specht'], ['Kann man drücken', 'Daumen Knopf Schulbank Taste']],
  [['Nagetiere', 'Maus Hamster Ratte Biber'], ['Länder in Europa', 'Polen Irland Malta Ungarn'], ['Süßigkeiten', 'Lolli Kaugummi Lakritz Bonbon'], ['Haben Flügel', 'Flugzeug Engel Windmühle Drache']],
  [['Monate', 'März April Juni Juli'], ['Berufe', 'Bäcker Maurer Pilot Richter'], ['Kleidung', 'Pulli Rock Schal Mütze'], ['___stein', 'Edel Grab Kiesel Back']],
  [['Im Wald', 'Moos Pilz Farn Zapfen'], ['Bundesländer', 'Bayern Hessen Sachsen Bremen'], ['Brotsorten', 'Brezel Baguette Toast Ciabatta'], ['Haben Tasten', 'Klavier Tastatur Telefon Fernbedienung']],
  [['Reptilien', 'Echse Schlange Gecko Leguan'], ['Am Strand', 'Sand Muschel Liegestuhl Düne'], ['Schreibgeräte', 'Füller Bleistift Kuli Marker'], ['Kann man schlagen', 'Sahne Alarm Rad Wurzeln']],
  [['Nudelsorten', 'Penne Spaghetti Fusilli Lasagne'], ['Weltraum', 'Komet Galaxie Meteor Nebula'], ['Märchen', 'Rapunzel Aschenputtel Rotkäppchen Schneewittchen'], ['Wörter mit Doppel-O', 'Boot Moor Zoo Moos']],
  [['Pferd', 'Fohlen Stute Hengst Pony'], ['Im Badezimmer', 'Seife Dusche Handtuch Spiegel'], ['Sportgeräte', 'Reck Barren Bock Ringe'], ['Nach „Haus“', 'Tür Aufgabe Schuh Meister']],
];
function verb(d) { return memo('v' + d, () => { const P = VERB[((d % VERB.length) + VERB.length) % VERB.length]; const groups = P.map(([n, w]) => ({ n, w: w.split(' ') })); const R = rng(d * 31 + 7); return { groups, words: shuffle(groups.flatMap(g => g.w), R) }; }); }
/* ---------- Mathe-Blitz: 60 Sekunden Kopfrechnen, Aufgaben aus dem Startwert ---------- */
function mathe(seed, n = 80) {
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const lv = Math.min(4, Math.floor(i / 6)), k = Math.floor(R() * 4), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    let a, b, op, res;
    if (k === 0) { a = ri(2, 10 + lv * 20); b = ri(2, 10 + lv * 20); op = '+'; res = a + b; }
    else if (k === 1) { a = ri(5, 15 + lv * 20); b = ri(1, a); op = '−'; res = a - b; }
    else if (k === 2) { a = ri(2, 6 + lv * 2); b = ri(2, 9 + lv); op = '×'; res = a * b; }
    else { b = ri(2, 9 + lv); res = ri(2, 9 + lv); a = b * res; op = ':'; }
    out.push([a, op, b, res]);
  }
  return out;
}
const MATHE_MS = 60000;

const KINDS = { sudoku: 'Sudoku', nono: 'Nonogramm', verb: 'Verbindungen', mathe: 'Mathe-Blitz' };
function rxOf(acc) { const d = dayStr(); if (!acc.rx || acc.rx.d !== d) acc.rx = { d, k: {} }; return acc.rx; }
let topC = null, topT = 0;
function tops(accounts, isTester) {
  if (topC && Date.now() - topT < 5000) return topC;
  const d = dayStr(), T = { sudoku: [], nono: [], verb: [], mathe: [] };
  for (const [k, a] of Object.entries(accounts)) {
    const X = a && a.rx; if (!X || X.d !== d || isTester(k)) continue;
    for (const kind of Object.keys(T)) { const e = X.k[kind]; if (e && e.done && e.rank !== false) T[kind].push({ name: a.name, ms: e.ms || 0, sc: e.sc || 0, miss: e.miss || 0 }); }
  }
  T.sudoku.sort((a, b) => a.ms - b.ms); T.nono.sort((a, b) => a.ms - b.ms);
  T.verb.sort((a, b) => a.miss - b.miss || a.ms - b.ms); T.mathe.sort((a, b) => b.sc - a.sc || a.ms - b.ms);
  for (const k of Object.keys(T)) T[k] = T[k].slice(0, 15);
  topC = T; topT = Date.now(); return T;
}
function pub(kind, e, d) {
  const out = { kind, done: !!(e && e.done), started: !!(e && e.t0), ms: e && e.ms, sc: e && e.sc, miss: e && e.miss, nr: d + 1, el: e && e.t0 && !e.done ? Date.now() - e.t0 : 0 };
  if (kind === 'sudoku') out.puz = sudoku(d).puz;
  if (kind === 'nono') { const N = nono(d); out.rows = N.rows; out.cols = N.cols; if (out.done) { out.name = N.name; out.bits = N.bits; } }
  if (kind === 'verb') { const V = verb(d); out.words = V.words; out.found = ((e && e.found) || []).map(i => V.groups[i]); out.missLeft = 4 - ((e && e.miss) || 0); if (out.done || out.missLeft <= 0) out.groups = V.groups; out.failed = !!(e && e.failed); }
  if (kind === 'mathe') { out.seed = e && e.seed; out.left = e && e.t0 && !e.done ? Math.max(0, e.t0 + MATHE_MS - Date.now()) : null; out.dur = MATHE_MS; }
  return out;
}
// Fertig: Ereignis für Hub-Level melden (Callback aus konten.js)
function action(act, key, acc, body, accounts, markDirty, isTester, onSolve) {
  const d = dayNo(), X = rxOf(acc);
  if (act === 'rx_state') return [200, { nr: d + 1, mine: Object.fromEntries(Object.keys(KINDS).map(k => [k, pub(k, X.k[k], d)])), top: tops(accounts, isTester), kinds: KINDS }];
  const kind = String(body.kind || ''); if (!KINDS[kind]) return [400, { error: 'Unbekanntes Rätsel.' }];
  const e = X.k[kind] || (X.k[kind] = {});
  if (act === 'rx_start') {
    if (!e.t0) { e.t0 = Date.now(); if (kind === 'mathe') e.seed = (d * 1000003 + Math.floor(Math.random() * 1e6)) >>> 0; markDirty(); }
    return [200, pub(kind, e, d)];
  }
  if (act !== 'rx_submit') return [404, { error: 'Unbekannt' }];
  if (e.done) return [200, pub(kind, e, d)];
  if (!e.t0) return [400, { error: 'Starte das Rätsel zuerst.' }];
  const solved = () => { e.done = true; e.ms = Date.now() - e.t0; markDirty(); topC = null; if (onSolve) onSolve(kind); };
  if (kind === 'sudoku') {
    const g = Array.isArray(body.g) ? body.g.slice(0, 81).map(n => Number(n) | 0) : []; const P = sudoku(d).puz;
    if (g.length !== 81 || g.some((v, i) => v < 1 || v > 9 || (P[i] && P[i] !== v))) return [200, { ...pub(kind, e, d), wrong: true }];
    for (let i = 0; i < 81; i++) { const v = g[i]; g[i] = 0; if (!sudokuOk(g, i, v)) return [200, { ...pub(kind, e, d), wrong: true }]; g[i] = v; }
    solved(); return [200, pub(kind, e, d)];
  }
  if (kind === 'nono') {
    const g = Array.isArray(body.g) ? body.g.slice(0, 100).map(n => (n ? 1 : 0)) : []; const N = nono(d), C = clues(g);
    if (g.length !== 100 || JSON.stringify(C.rows) !== JSON.stringify(N.rows) || JSON.stringify(C.cols) !== JSON.stringify(N.cols)) return [200, { ...pub(kind, e, d), wrong: true }];
    solved(); return [200, pub(kind, e, d)];
  }
  if (kind === 'verb') {
    if (e.failed) return [200, pub(kind, e, d)];
    const V = verb(d), pickW = Array.isArray(body.w) ? [...new Set(body.w.map(String))].slice(0, 4) : [];
    if (pickW.length !== 4 || !pickW.every(w => V.words.includes(w))) return [400, { error: 'Wähle genau 4 Wörter.' }];
    e.found = e.found || []; e.miss = e.miss || 0; e.tries = e.tries || [];
    const key4 = pickW.slice().sort().join('|'); if (e.tries.includes(key4)) return [200, { ...pub(kind, e, d), dup: true }];
    e.tries.push(key4);
    const gi = V.groups.findIndex(g => pickW.every(w => g.w.includes(w)));
    let one = false;
    if (gi >= 0 && !e.found.includes(gi)) { e.found.push(gi); if (e.found.length === 4) solved(); else markDirty(); }
    else { e.miss++; one = V.groups.some(g => pickW.filter(w => g.w.includes(w)).length === 3); if (e.miss >= 4) { e.failed = true; e.rank = false; } markDirty(); }
    return [200, { ...pub(kind, e, d), hit: gi >= 0, one }];
  }
  if (kind === 'mathe') {
    const ans = Array.isArray(body.a) ? body.a.slice(0, 80).map(n => Number(n)) : [];
    if (Date.now() - e.t0 > MATHE_MS + 8000) { e.sc = e.sc || 0; } // zu spät abgegeben: zählt, was bis dahin da war (nichts)
    const P = mathe(e.seed); let sc = 0; for (let i = 0; i < ans.length; i++) { if (ans[i] === P[i][3]) sc++; else break; }
    e.sc = Date.now() - e.t0 > MATHE_MS + 8000 ? 0 : sc; solved(); e.ms = Math.min(e.ms, MATHE_MS); return [200, pub(kind, e, d)];
  }
}
module.exports = { action, mathe, KINDS };
