// Montagsmaler – einer zeichnet, alle anderen raten.
// Striche gehen direkt (r.cast) an alle Geräte, der Server merkt sich das ganze Bild für Nachzügler.
const SPEED = Number(process.env.FSG_SPEED) || 1; // nur für Tests
const CHOOSE_MS = 12000, DRAW_MS = 80000, SHOW_MS = 7000;
const MAX_POINTS = 15000;

const WORDS = `Apfel Banane Birne Erdbeere Kirsche Ananas Zitrone Karotte Pilz Brezel Pizza Burger Pommes Eis Kuchen Torte Keks Brot Käse Ei
Hund Katze Maus Pferd Kuh Schwein Schaf Ziege Huhn Ente Gans Hase Igel Fuchs Bär Wolf Eule Adler Pinguin Elefant Giraffe Zebra Löwe Tiger Affe Krokodil
Schlange Schildkröte Frosch Fisch Hai Wal Delfin Krake Krabbe Schnecke Spinne Biene Schmetterling Marienkäfer Kamel Känguru Koala Papagei Flamingo Einhorn Drache
Haus Burg Kirche Leuchtturm Brücke Zelt Iglu Turm Pyramide Windmühle Hochhaus Bahnhof Schule Zaun Tür Fenster Treppe Kamin Garten Brunnen
Auto Fahrrad Motorrad Bus Zug Flugzeug Hubschrauber Rakete Schiff Boot U-Boot Traktor Bagger Feuerwehrauto Krankenwagen Roller Skateboard Kinderwagen Ballon Fallschirm
Sonne Mond Stern Wolke Regenbogen Blitz Schneemann Vulkan Berg Insel Baum Blume Kaktus Palme Blatt Tannenbaum Wasserfall Welle Tornado Regen
Tisch Stuhl Bett Sofa Lampe Uhr Spiegel Schrank Badewanne Toilette Kühlschrank Fernseher Handy Computer Tastatur Kamera Brille Schlüssel Schere Kerze
Hammer Säge Besen Eimer Leiter Regenschirm Koffer Rucksack Geschenk Krone Ring Schatzkiste Anker Kompass Lupe Glühbirne Batterie Magnet Seil Fahne
Hut Mütze Schal Handschuh Socke Schuh Stiefel Hose Kleid Krawatte Jacke Gürtel Badehose Sonnenbrille
Gitarre Klavier Trommel Geige Trompete Mikrofon Kopfhörer Fußball Basketball Tennisschläger Pokal Medaille Würfel Puzzle Schaukel Rutsche Karussell
Herz Auge Nase Mund Ohr Hand Fuß Zahn Knochen Skelett Gespenst Hexe Zauberer Pirat Ritter Prinzessin Roboter Alien Astronaut Clown Cowboy Vampir
Schneeflocke Feuer Lagerfeuer Spinnennetz Vogelnest Muschel Seestern Sandburg Strand Angel Zahnbürste Pflaster Spritze Thermometer Wecker Briefkasten Ampel Schneemobil
Teekanne Tasse Gabel Löffel Messer Pfanne Topf Flasche Strohhalm Zuckerwatte Popcorn Lolli Donut Hotdog Sandwich Waffel Kürbis Mais Gurke Tomate`.split(/\s+/).filter(Boolean);

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function schedule(r, ms, fn) {
  if (r.timer) clearTimeout(r.timer);
  r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } r.push(); }, ms / SPEED);
}
const say = (s, m) => { s.chat.push(m); if (s.chat.length > 40) s.chat.shift(); };

function nextTurn(r) {
  const s = r.state;
  let drawer = null;
  while (s.queue.length && !drawer) { const id = s.queue.shift(); if (r.players.some(p => p.id === id)) drawer = id; }
  if (!drawer || r.players.length < 2) { s.phase = 'end'; s.deadline = null; r.status = 'ended'; return; }
  s.turnNo++; s.drawer = drawer; s.word = null; s.strokes = []; s.sv++; s.guessed = {}; s.reveal = [];
  const fresh = WORDS.filter(w => !s.used.includes(w));
  s.choices = shuffle(fresh.length >= 3 ? fresh : WORDS).slice(0, 3);
  s.phase = 'choose'; s.deadline = Date.now() + CHOOSE_MS;
  schedule(r, CHOOSE_MS, () => beginDraw(r, pick(s.choices)));
}
function beginDraw(r, word) {
  const s = r.state;
  s.word = word; s.used.push(word); s.choices = null;
  s.phase = 'draw'; s.drawStart = Date.now(); s.deadline = Date.now() + DRAW_MS;
  say(s, { sys: 1, text: `${nameOf(r, s.drawer)} zeichnet jetzt.` });
  const hint = () => {
    const hidden = [...s.word].map((ch, i) => i).filter(i => /[A-Za-zÄÖÜäöüß]/.test(s.word[i]) && !s.reveal.includes(i));
    if (hidden.length > 2) s.reveal.push(pick(hidden));
  };
  schedule(r, DRAW_MS * 0.5, () => { hint(); schedule(r, DRAW_MS * 0.25, () => { if (s.word.length > 5) hint(); schedule(r, DRAW_MS * 0.25, () => endTurn(r, 'time')); }); });
}
function endTurn(r, why) {
  const s = r.state;
  if (s.phase !== 'draw' && s.phase !== 'choose') return;
  const n = Object.keys(s.guessed).length;
  if (s.phase === 'draw' && n) s.score[s.drawer] = (s.score[s.drawer] || 0) + 20 * n;
  s.turnGain = { drawer: s.phase === 'draw' ? 20 * n : 0, guessed: { ...s.guessed } };
  s.lastWord = s.word || null;
  say(s, { sys: 1, text: why === 'all' ? `Alle haben „${s.word}“ erraten!` : s.word ? `Das Wort war „${s.word}“.` : 'Zug übersprungen.' });
  s.phase = 'reveal'; s.deadline = Date.now() + SHOW_MS;
  schedule(r, SHOW_MS, () => nextTurn(r));
}
const guessers = r => r.players.filter(p => p.id !== r.state.drawer && r.state.inGame.includes(p.id));

module.exports = {
  title: 'Montagsmaler', min: 2, seats: 12,
  start(r) {
    if (r.timer) clearTimeout(r.timer);
    const ids = shuffle(r.players.map(p => p.id));
    const per = ids.length <= 4 ? 3 : ids.length <= 7 ? 2 : 1;
    const queue = []; for (let k = 0; k < per; k++) queue.push(...ids);
    r.state = { queue, total: queue.length, turnNo: 0, score: Object.fromEntries(ids.map(id => [id, 0])), inGame: ids,
      phase: 'choose', drawer: null, word: null, choices: null, strokes: [], sv: 0, guessed: {}, reveal: [], chat: [], used: [], deadline: null };
    r.status = 'playing';
    nextTurn(r);
  },
  onJoin(r, pid) {
    const s = r.state;
    if (!s || r.status !== 'playing' || s.inGame.includes(pid)) return;
    s.inGame.push(pid); s.score[pid] = s.score[pid] || 0; s.queue.push(pid); s.total++;
    say(s, { sys: 1, text: `${nameOf(r, pid)} spielt mit.` });
  },
  onLeave(r, pid, name) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    s.inGame = s.inGame.filter(x => x !== pid);
    const before = s.queue.length; s.queue = s.queue.filter(x => x !== pid); s.total -= before - s.queue.length;
    say(s, { sys: 1, text: `${name} ist gegangen.` });
    if (r.players.length < 2) { if (r.timer) clearTimeout(r.timer); r.timer = null; s.phase = 'end'; r.status = 'ended'; return; }
    if (s.drawer === pid && (s.phase === 'draw' || s.phase === 'choose')) endTurn(r, 'left');
    else if (s.phase === 'draw' && guessers(r).every(p => s.guessed[p.id])) endTurn(r, 'all');
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    if (a.type === 'stop') { if (r.host !== pid) return; if (r.timer) clearTimeout(r.timer); r.timer = null; s.phase = 'end'; r.status = 'ended'; return; }
    if (a.type === 'skip') { if (r.host !== pid && s.drawer !== pid) return; endTurn(r, 'skip'); return; }
    if (a.type === 'pick') {
      if (s.phase !== 'choose' || pid !== s.drawer) return 'quiet';
      const w = s.choices[Number(a.i)]; if (!w) return 'quiet';
      beginDraw(r, w); return;
    }
    if (a.type === 'pts' || a.type === 'undo' || a.type === 'clear') {
      if (s.phase !== 'draw' || pid !== s.drawer) return 'quiet';
      if (a.type === 'undo') { s.strokes.pop(); s.sv++; r.cast({ g: 'maler', op: 'set', sv: s.sv, turn: s.turnNo, strokes: s.strokes, by: pid }); return 'quiet'; }
      if (a.type === 'clear') { s.strokes = []; s.sv++; r.cast({ g: 'maler', op: 'set', sv: s.sv, turn: s.turnNo, strokes: [], by: pid }); return 'quiet'; }
      const i = Number(a.i), c = Number(a.c), w = Number(a.w);
      if (!Array.isArray(a.p) || a.p.length > 400 || a.p.length % 2 || !(c >= 0 && c < 10) || !(w >= 0 && w < 3)) return 'quiet';
      const used = s.strokes.reduce((n, st) => n + st[2].length / 2, 0);
      if (used + a.p.length / 2 > MAX_POINTS) return 'Das Bild ist voll – lösch etwas.';
      const p = a.p.map((v, k) => Math.max(0, Math.min(k % 2 ? 600 : 800, Math.round(Number(v) || 0))));
      if (i === s.strokes.length) s.strokes.push([c, w, p]);
      else if (i === s.strokes.length - 1) s.strokes[i][2].push(...p);
      else return 'quiet';
      r.cast({ g: 'maler', op: 'pts', sv: s.sv, turn: s.turnNo, i, c, w, p, by: pid });
      return 'quiet';
    }
    if (a.type === 'guess') {
      const text = clean(a.text, 40);
      if (!text || s.phase !== 'draw' || pid === s.drawer || s.guessed[pid] != null) return 'quiet';
      if (!s.inGame.includes(pid)) { s.inGame.push(pid); s.score[pid] = s.score[pid] || 0; }
      const g = norm(text), w = norm(s.word);
      if (g === w) {
        const left = Math.max(0, s.deadline - Date.now());
        const pts = Math.max(20, Math.round((40 + 60 * left / DRAW_MS) / 5) * 5) + (Object.keys(s.guessed).length === 0 ? 10 : 0);
        s.guessed[pid] = pts; s.score[pid] = (s.score[pid] || 0) + pts;
        say(s, { ok: 1, id: pid, text: `hat es erraten! (+${pts})` });
        if (guessers(r).every(p => s.guessed[p.id] != null)) endTurn(r, 'all');
        return;
      }
      if (w.length >= 4 && lev(g, w) <= (w.length >= 8 ? 2 : 1)) return 'Knapp daneben!';
      say(s, { id: pid, text });
      return 'soon';
    }
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const drawing = pid === s.drawer;
    const knows = drawing || s.phase === 'reveal' || s.phase === 'end' || (s.guessed && s.guessed[pid] != null);
    const pattern = s.word ? [...s.word].map((ch, i) => (/[A-Za-zÄÖÜäöüß]/.test(ch) && !s.reveal.includes(i) ? '_' : ch)) : null;
    return {
      phase: s.phase, drawer: s.drawer, turnNo: s.turnNo, total: s.total,
      left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null,
      word: knows ? (s.phase === 'reveal' ? s.lastWord : s.word) : null,
      pattern, choices: drawing && s.phase === 'choose' ? s.choices : null,
      strokes: s.phase === 'draw' || s.phase === 'reveal' ? s.strokes : [], sv: s.sv,
      guessed: Object.keys(s.guessed || {}), chat: s.chat, gain: s.phase === 'reveal' ? s.turnGain : null,
      score: Object.entries(s.score).map(([id, pts]) => ({ id, pts })).sort((a, b) => b.pts - a.pts),
    };
  },
  _test: { WORDS, norm, lev },
};
