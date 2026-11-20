// Wortagenten (wie Codenames): Zwei Teams, 25 Wörter. Der Chef jedes Teams gibt einen Hinweis aus einem Wort
// und einer Zahl, sein Team tippt die passenden Karten an. Wer die schwarze Karte erwischt, verliert sofort.
const WORDS = (`Apfel Bank Birne Brücke Burg Drache Eis Feder Fisch Flasche Flügel Fuchs Gabel Geist Glas Gold Gras Hammer Hand Herz Himmel Honig Horn Hund
Insel Jäger Kaiser Kamm Karte Katze Kerze Kette Kiwi Knopf Koch Krone Kugel Lampe Laser Leiter Licht Löwe Luft Mantel Maske Maus Meer Messer Mond Musik Nadel
Nagel Netz Ninja Ofen Oper Palme Papier Pferd Pilot Pirat Planet Platte Pole Post Puppe Pyramide Quelle Rakete Ring Ritter Roboter Rose Rücken Säge Schal Schatten
Schiff Schild Schlange Schloss Schnee Schule Schwan Seil Sonne Spiegel Spinne Stadion Stern Strand Strom Tafel Taube Teller Tiger Tor Turm Uhr Vampir Vulkan Wal
Wald Wand Welle Wolke Wurm Zahn Zelt Zug Zwerg Anker Arzt Atlas Ball Band Baum Bett Blatt Blitz Boot Brief Buch Bus Dach Diamant Dino Dose Ei Engel Erde Fahne
Feuer Film Finger Flöte Frosch Gitarre Glocke Hai Helm Hexe Hose Hut Igel Jacke Kaktus Kamera Kanal Kasse Keks Kino Kirche Kiste Koffer Komet König Korb Kran
Kuchen Kuh Labor Laub Löffel Magnet Markt Mars Mauer Medaille Mikrofon Mühle Münze Mumie Nase Nest Note Oase Ozean Paket Panda Park Pass Pinguin Pizza Popcorn
Prinz Radio Regen Riese Rock Sand Satellit Schaf Schatz Schere Schlüssel Schuh Sessel Sirene Socke Spion Stift Stuhl Sturm Tasche Taxi Tee Telefon Tinte Tunnel
Ufo Vogel Waffel Wagen Wasser Wecker Wiese Wind Wolf Würfel Zauber Zebra Ziege Zitrone Zucker`).split(/\s+/).filter(Boolean);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
const TN = { r: 'Rot', b: 'Blau' };

function deal(s) {
  const first = Math.random() < 0.5 ? 'r' : 'b', other = first === 'r' ? 'b' : 'r';
  const keys = shuffle([...Array(9).fill(first), ...Array(8).fill(other), ...Array(7).fill('n'), 'x']);
  s.words = shuffle(WORDS).slice(0, 25); s.key = keys; s.open = Array(25).fill(false); s.turn = first; s.first = first;
  s.clue = null; s.guesses = 0; s.hist = []; s.win = null; s.why = null; s.last = null;
}
const left = (s, t) => s.key.filter((k, i) => k === t && !s.open[i]).length;
function balance(r) { // Teams auffüllen, Chefs wählen
  const s = r.state;
  for (const p of r.players) if (!s.team[p.id]) { const nr = Object.values(s.team).filter(t => t === 'r').length, nb = Object.values(s.team).filter(t => t === 'b').length; s.team[p.id] = nr <= nb ? 'r' : 'b'; }
  for (const t of ['r', 'b']) if (!s.boss[t] || s.team[s.boss[t]] !== t || !r.players.some(p => p.id === s.boss[t])) { const m = r.players.filter(p => s.team[p.id] === t); s.boss[t] = m.length ? m[Math.floor(Math.random() * m.length)].id : null; }
}
function endTurn(s) { s.turn = s.turn === 'r' ? 'b' : 'r'; s.clue = null; s.guesses = 0; }

module.exports = {
  title: 'Wortagenten', min: 4, seats: 12,
  start(r) {
    const old = r.state;
    r.state = { phase: 'setup', team: old && old.team ? old.team : {}, boss: old && old.boss ? { r: old.boss.b, b: old.boss.r } : {}, score: old && old.score ? old.score : { r: 0, b: 0 } };
    for (const id of Object.keys(r.state.team)) if (!r.players.some(p => p.id === id)) delete r.state.team[id];
    balance(r); r.status = 'playing';
  },
  onJoin(r) { if (r.state && r.status === 'playing') balance(r); },
  onLeave(r, pid) { const s = r.state; if (!s) return; delete s.team[pid]; balance(r); },
  act(r, pid, a) {
    const s = r.state; if (!s || r.status !== 'playing') return 'quiet';
    const my = s.team[pid];
    if (s.phase === 'setup') {
      if (a.type === 'team' && (a.t === 'r' || a.t === 'b')) { s.team[pid] = a.t; for (const t of ['r', 'b']) if (s.boss[t] === pid && t !== a.t) s.boss[t] = null; balance(r); return; }
      if (a.type === 'boss' && my) { s.boss[my] = pid; return; }
      if (a.type === 'go' && pid === r.host) {
        balance(r);
        for (const t of ['r', 'b']) if (r.players.filter(p => s.team[p.id] === t).length < 2) return `Team ${TN[t]} braucht mindestens 2 Spieler.`;
        deal(s); s.phase = 'play'; return;
      }
      return 'quiet';
    }
    if (s.phase !== 'play' || !my) return 'quiet';
    const boss = s.boss[my] === pid;
    if (a.type === 'clue') {
      if (!boss || my !== s.turn || s.clue) return 'quiet';
      const w = clean(a.w, 24).replace(/\s+/g, ''); const n = Math.max(0, Math.min(9, Number(a.n) | 0));
      if (!w) return 'Gib ein Hinweiswort ein.';
      if (s.words.some((x, i) => !s.open[i] && x.toLowerCase() === w.toLowerCase())) return 'Das Wort liegt auf dem Feld – nimm ein anderes.';
      s.clue = { w, n, t: my }; s.guesses = 0; s.hist.push({ t: my, w, n }); return;
    }
    if (a.type === 'pass') { if (boss || my !== s.turn || !s.clue || !s.guesses) return 'quiet'; endTurn(s); return; }
    if (a.type === 'tap') {
      const i = Number(a.i);
      if (boss || my !== s.turn || !s.clue || !(i >= 0 && i < 25) || s.open[i]) return 'quiet';
      s.open[i] = true; s.last = { i, by: pid }; s.guesses++;
      const k = s.key[i], other = my === 'r' ? 'b' : 'r';
      if (k === 'x') { s.win = other; s.why = `${nameOf(r, pid)} hat den Doppelagenten erwischt!`; }
      else if (!left(s, 'r')) { s.win = 'r'; s.why = 'Team Rot hat alle Agenten gefunden!'; }
      else if (!left(s, 'b')) { s.win = 'b'; s.why = 'Team Blau hat alle Agenten gefunden!'; }
      else if (k !== my) endTurn(s);
      else if (s.clue.n && s.guesses > s.clue.n) endTurn(s);
      if (s.win) { s.score[s.win]++; s.phase = 'end'; r.status = 'ended'; }
      return;
    }
    return 'quiet';
  },
  winners(r) { const s = r.state; return s && s.win ? r.players.filter(p => s.team[p.id] === s.win).map(p => p.id) : []; },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    const my = s.team[pid], boss = my && s.boss[my] === pid, all = s.phase === 'end';
    const v = { phase: s.phase, team: s.team, boss: s.boss, my, isBoss: boss, score: s.score };
    if (s.phase !== 'setup') {
      v.words = s.words; v.open = s.open; v.turn = s.turn; v.clue = s.clue; v.guesses = s.guesses; v.hist = s.hist.slice(-12); v.win = s.win; v.why = s.why; v.last = s.last; v.first = s.first;
      v.key = s.key.map((k, i) => (boss || all || s.open[i] ? k : null)); v.left = { r: left(s, 'r'), b: left(s, 'b') };
    }
    return v;
  },
};
