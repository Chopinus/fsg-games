// Wer ist der Spion? – alle kennen das geheime Wort, nur der Spion nicht.
// Reihum gibt jeder einen Hinweis, dann wird abgestimmt.
const SPEED = Number(process.env.FSG_SPEED) || 1; // nur für Tests
const CLUE_MS = 45000, VOTE_MS = 90000, GUESS_MS = 40000;

const PACKS = {
  'Tiere': 'Hund Katze Pferd Elefant Giraffe Pinguin Löwe Krokodil Hai Delfin Eule Biene Schlange Känguru Kuh Affe Igel Papagei',
  'Essen': 'Pizza Spaghetti Döner Pommes Sushi Burger Pfannkuchen Suppe Salat Schnitzel Brezel Eis Lasagne Currywurst Müsli Tacos Waffeln Kartoffelsalat',
  'Orte': 'Schule Krankenhaus Strand Flughafen Kino Bahnhof Supermarkt Zoo Freibad Bibliothek Kirche Bauernhof Fitnessstudio Friseur Campingplatz Freizeitpark Museum Bäckerei',
  'Berufe': 'Lehrer Arzt Polizist Koch Pilot Feuerwehrmann Bäcker Friseur Tierarzt Gärtner Astronaut Zahnarzt Busfahrer Fotograf Schauspieler Mechaniker Postbote Richter',
  'Sport': 'Fußball Tennis Schwimmen Basketball Skifahren Reiten Boxen Volleyball Turnen Golf Klettern Handball Eishockey Tischtennis Surfen Badminton Leichtathletik Rudern',
  'Gegenstände': 'Regenschirm Schlüssel Handy Brille Rucksack Kerze Spiegel Wecker Kopfhörer Zahnbürste Schere Lampe Kissen Taschenlampe Fernbedienung Geldbeutel Uhr Stift',
  'Fahrzeuge': 'Fahrrad Bus Zug Flugzeug Hubschrauber Schiff Motorrad Traktor Rakete Taxi Straßenbahn Roller Feuerwehrauto Krankenwagen Kanu Bagger Wohnmobil Seilbahn',
  'Freizeit': 'Kino Geburtstagsparty Grillen Camping Zirkus Konzert Wandern Shoppen Videospiele Brettspiele Picknick Schwimmbad Karaoke Bowling Minigolf Klassenfahrt Weihnachten Silvester',
};
const CATS = Object.keys(PACKS).map(k => [k, PACKS[k].split(' ')]);

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
function schedule(r, ms, fn) {
  if (r.timer) clearTimeout(r.timer);
  r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } r.push(); }, ms / SPEED);
}
const add = (s, id, n) => { s.score[id] = (s.score[id] || 0) + n; };

function newRound(r) {
  const s = r.state;
  s.round++;
  s.part = shuffle(r.players.map(p => p.id));
  s.part.forEach(id => (s.score[id] = s.score[id] || 0));
  const cands = s.part.filter(id => id !== s.lastSpy);
  s.spy = pick(cands.length ? cands : s.part); s.lastSpy = s.spy;
  const [cat, words] = pick(CATS);
  const fresh = words.filter(w => !s.used.includes(w));
  s.cat = cat; s.word = pick(fresh.length ? fresh : words); s.used.push(s.word);
  s.options = shuffle([s.word, ...shuffle(words.filter(w => w !== s.word)).slice(0, 7)]);
  s.clues = []; s.laps = s.part.length <= 5 ? 2 : 1;
  s.queue = []; for (let k = 0; k < s.laps; k++) s.queue.push(...s.part);
  s.votes = {}; s.accused = null; s.guess = null; s.result = null;
  beginClue(r);
}
function beginClue(r) {
  const s = r.state;
  s.phase = 'clue'; s.deadline = Date.now() + CLUE_MS;
  schedule(r, CLUE_MS, () => giveClue(r, s.queue[0], '…'));
}
function giveClue(r, id, text) {
  const s = r.state;
  s.clues.push({ id, text });
  s.queue.shift();
  afterClue(r);
}
function afterClue(r) {
  const s = r.state;
  if (!s.queue.length) { s.phase = 'vote'; s.deadline = Date.now() + VOTE_MS; schedule(r, VOTE_MS, () => tally(r)); }
  else beginClue(r);
}
function tally(r) {
  const s = r.state;
  if (s.phase !== 'vote') return;
  const count = {};
  for (const t of Object.values(s.votes)) count[t] = (count[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(count));
  const top = Object.keys(count).filter(id => count[id] === max);
  s.count = count;
  if (!max || top.length > 1) return finish(r, 'spy', 'tie');
  s.accused = top[0];
  if (s.accused !== s.spy) return finish(r, 'spy', 'wrong');
  s.phase = 'guess'; s.deadline = Date.now() + GUESS_MS;
  schedule(r, GUESS_MS, () => finish(r, 'group', 'noguess'));
}
function finish(r, win, why) {
  const s = r.state;
  if (r.timer) clearTimeout(r.timer); r.timer = null;
  s.phase = 'reveal'; s.deadline = null; s.result = { win, why };
  for (const [v, t] of Object.entries(s.votes)) if (t === s.spy && v !== s.spy) add(s, v, 1);
  if (win === 'spy') add(s, s.spy, why === 'guessed' ? 2 : 3);
  else s.part.forEach(id => id !== s.spy && add(s, id, 2));
}

module.exports = {
  title: 'Wer ist der Spion?', min: 3, seats: 12,
  start(r) {
    if (r.timer) clearTimeout(r.timer);
    const old = r.state;
    r.state = { round: 0, score: {}, used: old && old.used ? old.used.slice(-60) : [], lastSpy: null, part: [], clues: [], votes: {}, phase: 'clue' };
    r.status = 'playing';
    newRound(r);
  },
  onLeave(r, pid, name) {
    const s = r.state;
    if (!s || r.status !== 'playing' || !s.part.includes(pid)) return;
    if (pid === s.spy && s.phase !== 'reveal') { s.part = s.part.filter(x => x !== pid); finish(r, 'group', 'left'); return; }
    const cur = s.phase === 'clue' && s.queue[0] === pid;
    s.queue = s.queue.filter(x => x !== pid);
    s.part = s.part.filter(x => x !== pid); delete s.votes[pid];
    for (const k in s.votes) if (s.votes[k] === pid) delete s.votes[k];
    if (s.part.length < 3 && s.phase !== 'reveal') { finish(r, 'spy', 'few'); return; }
    if (s.phase === 'clue') {
      if (cur || !s.queue.length) afterClue(r);
    } else if (s.phase === 'vote' && s.part.every(id => s.votes[id])) tally(r);
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    if (a.type === 'next') { if (r.host !== pid || s.phase !== 'reveal') return; newRound(r); return; }
    if (a.type === 'end') { if (r.host !== pid) return; if (r.timer) clearTimeout(r.timer); r.timer = null; r.status = 'ended'; s.phase = 'end'; return; }
    if (!s.part.includes(pid)) return 'Du steigst in der nächsten Runde ein.';
    if (a.type === 'clue') {
      if (s.phase !== 'clue' || s.queue[0] !== pid) return 'quiet';
      const text = clean(a.text, 30);
      if (!text) return 'Schreib einen Hinweis.';
      if (pid !== s.spy && norm(text).includes(norm(s.word))) return 'Das geheime Wort darfst du nicht verraten!';
      giveClue(r, pid, text); return;
    }
    if (a.type === 'vote') {
      if (s.phase !== 'vote' || a.id === pid || !s.part.includes(a.id)) return 'quiet';
      s.votes[pid] = a.id;
      if (s.part.every(id => s.votes[id])) tally(r);
      return;
    }
    if (a.type === 'guess') {
      if (s.phase !== 'guess' || pid !== s.spy) return 'quiet';
      const w = String(a.word || ''); if (!s.options.includes(w)) return 'quiet';
      s.guess = w;
      finish(r, w === s.word ? 'spy' : 'group', w === s.word ? 'guessed' : 'caught');
      return;
    }
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const inRound = s.part.includes(pid), open = s.phase === 'reveal' || s.phase === 'end';
    const amSpy = inRound && pid === s.spy;
    return {
      phase: s.phase, round: s.round, inRound, cat: s.cat,
      left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null,
      role: !inRound ? null : amSpy ? 'spy' : 'agent',
      word: open || (inRound && !amSpy) ? s.word : null,
      spy: open ? s.spy : null,
      part: s.part, clues: s.clues, laps: s.laps,
      turn: s.phase === 'clue' ? s.queue[0] : null, total: s.part.length * s.laps,
      voted: Object.keys(s.votes), myVote: s.votes[pid] || null,
      votes: open ? s.votes : null, accused: s.accused,
      options: s.phase === 'guess' || open ? s.options : null, guess: s.guess,
      result: s.result,
      score: Object.entries(s.score).filter(([id]) => r.players.some(p => p.id === id)).map(([id, pts]) => ({ id, pts })).sort((a, b) => b.pts - a.pts),
    };
  },
};
