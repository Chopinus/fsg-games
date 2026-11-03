// Inselreich – Prototyp einer offenen 2D-Pixelwelt aus Inseln.
// Die Welt entsteht aus einem festen Startwert und ist deshalb auf jedem Gerät gleich,
// über das Netz gehen nur die Positionen der Spieler (wenige Bytes, 5× pro Sekunde).
// Auf der Heimatinsel liegt die Kristallhöhle mit Schleimen, Fledermäusen und dem Höhlentroll.
(() => {
  'use strict';
  const SEED = 7331, CELL = 140, CH = 32, TP = 16; // Zellgröße für Inseln, Stückgröße, Pixel pro Feld
  const W_DEEP = 0, W_SEA = 1, W_SHALLOW = 2, SAND = 3, GRASS = 4, FOREST = 5, HILL = 6, ROCK = 7;
  const SHIRTS = ['#d8443a', '#3b7ad6', '#3fa34d', '#e3a92b', '#8e4fc9', '#e06aa8', '#2fb3b0', '#f07d2a'];
  const HAIRS = ['#3a2614', '#7a4a20', '#d9b25a', '#1f1f24'];
  const T_NAMES = { 0: 'Tiefsee', 1: 'Offenes Meer', 2: 'Flachwasser' };
  const CW = 96, CHH = 72, COX = -20000, COY = -20000; // Höhle: Größe und Lage im Koordinatenraum (weit weg von der Oberwelt)
  const MAXHP = 6;
  // Skilltree: drei Zweige, jede Fähigkeit braucht die darüber (mindestens Rang 1)
  // Skilltree: Start in der Mitte, links Kampf, rechts Sammeln, oben Seefahrt.
  // x/y = Lage im Baum, p = Fähigkeiten davor (eine davon reicht), key = große Schlüssel-Fähigkeit
  const BRANCHES = { k: ['⚔️', 'Kampf', '#ff7a6a'], s: ['⛏️', 'Sammeln', '#7ee08a'], f: ['⛵', 'Seefahrt', '#6ab8ff'] };
  const SKILLS = [
    { id: 'start', b: '', x: 0, y: 0, i: '🧭', n: 'Abenteurer', max: 0, d: 'Hier beginnt dein Weg. Jeder Skillpunkt öffnet neue Fähigkeiten – nach links Kampf, nach rechts Sammeln, nach oben Seefahrt.' },
    { id: 'klinge', b: 'k', x: -1, y: 0, p: ['start'], i: '🗡️', n: 'Scharfe Klinge', max: 3, d: 'Dein Schwert macht +1 Schaden pro Treffer.' },
    { id: 'zaeh', b: 'k', x: -2, y: -0.9, p: ['klinge'], i: '❤️', n: 'Zähigkeit', max: 3, d: 'Du bekommst ein zusätzliches Herz.' },
    { id: 'flink', b: 'k', x: -2, y: 0.9, p: ['klinge'], i: '💨', n: 'Schnelle Hiebe', max: 2, d: 'Du schlägst 20 % schneller zu.' },
    { id: 'krit', b: 'k', x: -3, y: -1.5, p: ['zaeh'], i: '💥', n: 'Volltreffer', max: 2, d: '15 % Chance auf doppelten Schaden.' },
    { id: 'heil', b: 'k', x: -3, y: 0, p: ['zaeh', 'flink'], i: '✨', n: 'Siegesheilung', max: 1, d: 'Jeder besiegte Gegner heilt dich um ein halbes Herz.' },
    { id: 'dodge', b: 'k', x: -3, y: 1.5, p: ['flink'], i: '🌀', n: 'Ausweichen', max: 2, d: '15 % Chance, einem Treffer auszuweichen.' },
    { id: 'wirbel', b: 'k', x: -4.1, y: -0.75, p: ['krit', 'heil'], i: '🌪️', n: 'Wirbelschlag', max: 1, key: 1, d: 'Dein Schlag trifft alle Gegner rund um dich, nicht nur vor dir.' },
    { id: 'zorn', b: 'k', x: -4.1, y: 0.75, p: ['heil', 'dodge'], i: '😤', n: 'Berserker', max: 1, key: 1, d: 'Mit halben Herzen oder weniger machst du +1 Schaden und schlägst schneller.' },
    { id: 'kraft', b: 's', x: 1, y: 0, p: ['start'], i: '🪓', n: 'Kräftige Schläge', max: 2, d: 'Du brauchst einen Schlag weniger, um etwas abzubauen.' },
    { id: 'ernte', b: 's', x: 2, y: -0.9, p: ['kraft'], i: '🧺', n: 'Reiche Ernte', max: 2, d: '30 % Chance auf doppelte Rohstoffe.' },
    { id: 'magnet', b: 's', x: 2, y: 0.9, p: ['kraft'], i: '🧲', n: 'Magnet', max: 1, d: 'Münzen und Rohstoffe fliegen dir von viel weiter weg zu.' },
    { id: 'holz', b: 's', x: 3, y: -1.5, p: ['ernte'], i: '🌲', n: 'Holzfäller', max: 1, d: 'Bäume geben ein Holz mehr.' },
    { id: 'glueck', b: 's', x: 3, y: 0, p: ['ernte', 'magnet'], i: '🍀', n: 'Glückspilz', max: 2, d: 'Gegner lassen 25 % mehr Münzen fallen.' },
    { id: 'schatz', b: 's', x: 3, y: 1.5, p: ['magnet'], i: '💰', n: 'Schatzsucher', max: 1, d: 'Beim Abbauen findest du manchmal Münzen.' },
    { id: 'meister', b: 's', x: 4.1, y: -0.75, p: ['holz', 'glueck'], i: '⚒️', n: 'Meistersammler', max: 1, key: 1, d: 'Alles lässt sich mit einem einzigen Schlag abbauen.' },
    { id: 'gold', b: 's', x: 4.1, y: 0.75, p: ['glueck', 'schatz'], i: '👑', n: 'Goldrausch', max: 1, key: 1, d: 'Du bekommst 25 % mehr EP für alles.' },
    { id: 'boot', b: 'f', x: 0, y: -1, p: ['start'], i: '⛵', n: 'Leichtes Boot', max: 3, d: 'Dein Boot segelt 12 % schneller.' },
    { id: 'paddel', b: 'f', x: -0.9, y: -2, p: ['boot'], i: '🛶', n: 'Starkes Paddel', max: 1, d: 'Du paddelst 50 % schneller.' },
    { id: 'fuss', b: 'f', x: 0.9, y: -2, p: ['boot'], i: '👟', n: 'Flinke Füße', max: 2, d: 'Du läufst 10 % schneller.' },
    { id: 'wind', b: 'f', x: -1.5, y: -3, p: ['paddel'], i: '🌬️', n: 'Hart am Wind', max: 1, d: 'Du kommst viel besser gegen den Wind voran.' },
    { id: 'schwimm', b: 'f', x: 0, y: -3, p: ['paddel', 'fuss'], i: '🐬', n: 'Wasserratte', max: 1, d: 'Im flachen Wasser bist du so schnell wie an Land.' },
    { id: 'entdecker', b: 'f', x: 1.5, y: -3, p: ['fuss'], i: '🔭', n: 'Entdecker', max: 1, d: 'Doppelte EP für neue Inseln und eine größere Minikarte.' },
    { id: 'sturm', b: 'f', x: -0.75, y: -4.1, p: ['wind', 'schwimm'], i: '⛈️', n: 'Sturmreiter', max: 1, key: 1, d: 'Bei kräftigem Wind segelst du 25 % schneller.' },
    { id: 'kapitaen', b: 'f', x: 0.75, y: -4.1, p: ['schwimm', 'entdecker'], i: '⚓', n: 'Kapitän', max: 1, key: 1, d: 'Dein Boot ist 20 % schneller und wendet doppelt so schnell.' },
  ];
  const SKILL = Object.fromEntries(SKILLS.map(s => [s.id, s]));
  const XP_FOE = { slime: 5, bigslime: 10, sandslime: 5, frostslime: 7, fireslime: 8, frog: 5, sporling: 6, bat: 6, moth: 6, scorpion: 8, wolf: 10, golem: 40, troll: 100 };
  const xpNeed = l => Math.round(20 * Math.pow(l, 1.5));
  // Werkstationen auf der Heimatinsel und was man dort herstellen kann
  const STATIONS = { werk: ['🪚', 'Werkbank', 'Werkzeuge, Waffen und Rüstung aus Holz, Stein und Fell'], schmiede: ['⚒️', 'Schmiede', 'Starke Waffen und Rüstungen aus seltenen Rohstoffen'], werft: ['⚓', 'Werft', 'Segel und Ausbauten für dein Boot'], koch: ['🍲', 'Kochstelle', 'Essen und Tränke, die heilen oder dich stärker machen'] };
  const RECIPES = [
    { id: 'steinschwert', st: 'werk', i: '🗡️', n: 'Steinschwert', d: '+1 Schaden', cost: { holz: 3, stein: 5 }, gear: 'schwert', tier: 1 },
    { id: 'steinaxt', st: 'werk', i: '🪓', n: 'Steinaxt', d: 'Abbauen braucht einen Schlag weniger', cost: { holz: 3, stein: 3 }, gear: 'axt', tier: 1 },
    { id: 'fellruestung', st: 'werk', i: '🧥', n: 'Fellrüstung', d: '+1 Herz', cost: { fell: 5, faser: 4 }, gear: 'ruestung', tier: 1 },
    { id: 'schaufel', st: 'werk', i: '🪏', n: 'Schaufel', d: 'Damit gräbst du Schätze von Schatzkarten aus', cost: { holz: 4, stein: 4 }, gear: 'schaufel', tier: 1 },
    { id: 'fernrohr', st: 'werk', i: '🔭', n: 'Fernrohr', d: 'Größere Minikarte und Weltkarte', cost: { eiskristall: 1, holz: 4, stein: 2 }, gear: 'fernrohr', tier: 1 },
    { id: 'eisschwert', st: 'schmiede', i: '❄️', n: 'Eisschwert', d: '+2 Schaden, getroffene Gegner werden langsamer', cost: { eis: 6, eiskristall: 2, holz: 2 }, gear: 'schwert', tier: 2 },
    { id: 'obsidianklinge', st: 'schmiede', i: '🔮', n: 'Obsidianklinge', d: '+3 Schaden', cost: { obsidian: 6, glut: 3, holz: 2 }, gear: 'schwert', tier: 3 },
    { id: 'drachenklinge', st: 'schmiede', i: '🔥', n: 'Drachenklinge', d: '+4 Schaden – aus den Schuppen des Feuerdrachen', cost: { drachenschuppe: 3, obsidian: 4, glut: 4 }, gear: 'schwert', tier: 4 },
    { id: 'drachenpanzer', st: 'schmiede', i: '🐲', n: 'Drachenpanzer', d: '+3 Herzen, Stacheln – aus drei Boss-Beuten', cost: { drachenschuppe: 2, frostherz: 2, wuestenperle: 2 }, gear: 'ruestung', tier: 3 },
    { id: 'obsidianaxt', st: 'schmiede', i: '⛏️', n: 'Obsidianaxt', d: 'Abbauen braucht zwei Schläge weniger', cost: { obsidian: 4, holz: 3, stein: 2 }, gear: 'axt', tier: 2 },
    { id: 'stachelpanzer', st: 'schmiede', i: '🛡️', n: 'Stachelpanzer', d: '+2 Herzen, und wer dich berührt, bekommt Schaden', cost: { stachel: 6, stein: 6, fell: 2 }, gear: 'ruestung', tier: 2 },
    { id: 'fasersegel', st: 'werft', i: '⛵', n: 'Fasersegel', d: 'Dein Boot segelt 10 % schneller', cost: { faser: 8, holz: 4 }, gear: 'segel', tier: 1 },
    { id: 'wollsegel', st: 'werft', i: '🧶', n: 'Wollsegel', d: 'Dein Boot segelt 20 % schneller', cost: { wolle: 8, faser: 4 }, gear: 'segel', tier: 2 },
    { id: 'seidensegel', st: 'werft', i: '🎐', n: 'Sporenseide-Segel', d: 'Dein Boot segelt 30 % schneller', cost: { sporen: 6, faser: 6, pilz: 4, wolle: 2 }, gear: 'segel', tier: 3 },
    { id: 'sturmsegel', st: 'werft', i: '🌪️', n: 'Sturmsegel', d: 'Dein Boot segelt 40 % schneller', cost: { koenigsspore: 2, giftdruese: 2, wolle: 6 }, gear: 'segel', tier: 4 },
    { id: 'rumpf', st: 'werft', i: '🛶', n: 'Verstärkter Rumpf', d: 'Dein Boot wendet 50 % schneller', cost: { holz: 15, stein: 5 }, gear: 'rumpf', tier: 1 },
    { id: 'saft', st: 'koch', i: '🧃', n: 'Beerensaft', d: 'Heilt ein Herz', cost: { beere: 3 }, item: 'saft' },
    { id: 'kuchen', st: 'koch', i: '🥧', n: 'Apfelkuchen', d: 'Heilt dich ganz', cost: { apfel: 3, holz: 1 }, item: 'kuchen' },
    { id: 'suppe', st: 'koch', i: '🍲', n: 'Pilzsuppe', d: '90 Sekunden +1 Schaden', cost: { pilz: 3, glibber: 1 }, item: 'suppe' },
    { id: 'shake', st: 'koch', i: '🥤', n: 'Kokos-Shake', d: '90 Sekunden 25 % schneller laufen und segeln', cost: { kokos: 2, banane: 2 }, item: 'shake' },
    { id: 'brot', st: 'koch', i: '🍞', n: 'Brot', d: 'Heilt zwei Herzen', cost: { weizen: 3 }, item: 'brot' },
    { id: 'ruehrei', st: 'koch', i: '🍳', n: 'Rührei', d: 'Heilt dich ganz', cost: { ei: 3 }, item: 'ruehrei' },
    { id: 'karottensuppe', st: 'koch', i: '🥣', n: 'Karottensuppe', d: '2 Minuten +1 Schaden und schneller', cost: { karotte: 3, pilz: 1 }, item: 'karottensuppe' },
    { id: 'kuerbiskuchen', st: 'koch', i: '🥮', n: 'Kürbiskuchen', d: '3 Minuten zwei Herzen mehr', cost: { kuerbis: 1, ei: 2, weizen: 2 }, item: 'kuerbiskuchen' },
    { id: 'elixier', st: 'koch', i: '🧪', n: 'Kaktus-Elixier', d: '90 Sekunden Stachelhaut: wer dich berührt, bekommt Schaden', cost: { kaktus: 3, sporen: 1 }, item: 'elixier' },
  ];
  const ITEM_USE = { brot: 'Heilt zwei Herzen', ruehrei: 'Heilt dich ganz', karottensuppe: '+1 Schaden und schneller für 2 Min.', kuerbiskuchen: '+2 Herzen für 3 Min.', saft: 'Heilt ein Herz', kuchen: 'Heilt dich ganz', suppe: '+1 Schaden für 90 Sek.', shake: 'Schneller für 90 Sek.', elixier: 'Stachelhaut für 90 Sek.' };
  const buff = { kraft: 0, tempo: 0, dorn: 0, herz: 0 };
  const GEAR_NAME = { schwert: ['Holzschwert', 'Steinschwert', 'Eisschwert', 'Obsidianklinge', 'Drachenklinge'], axt: ['', 'Steinaxt', 'Obsidianaxt'], ruestung: ['', 'Fellrüstung', 'Stachelpanzer', 'Drachenpanzer'], segel: ['', 'Fasersegel', 'Wollsegel', 'Sporenseide-Segel', 'Sturmsegel'], schaufel: ['', 'Schaufel'], rumpf: ['', 'Verstärkter Rumpf'], fernrohr: ['', 'Fernrohr'] };
  let prog = { xp: 0, lvl: 1, pts: 0, sk: {}, gear: {} };
  try { const q = JSON.parse(localStorage.getItem('insel.xp') || 'null'); if (q && q.lvl) prog = Object.assign(prog, q); } catch {}
  const saveProg = () => { try { localStorage.setItem('insel.xp', JSON.stringify(prog)); } catch {} };
  const sk = id => (id === 'start' ? 1 : prog.sk[id] || 0);
  { // alte oder nicht mehr erreichbare Fähigkeiten zurückerstatten
    let changed = true;
    while (changed) { changed = false; for (const [id, r] of Object.entries(prog.sk)) { const s = SKILL[id]; if (!s || !s.p || !s.p.some(q => sk(q) > 0) || r > s.max) { const keep = s && s.p && s.p.some(q => sk(q) > 0) ? s.max : 0; prog.pts += r - keep; if (keep) prog.sk[id] = keep; else delete prog.sk[id]; changed = true; } } }
  }
  const gear = g => (prog.gear && prog.gear[g]) || 0;
  const maxHp = () => MAXHP + 2 * sk('zaeh') + 2 * gear('ruestung') + (buff.herz > 0 ? 4 : 0);
  const WIESE = 0, WUESTE = 1, SCHNEE = 2, DSCHUNGEL = 3, VULKAN = 4, PILZ = 5, LAVA = 8;
  const BIOMES = [
    { n: 'Wiese', foes: ['slime'], info: 'Schleime · Holz, Steine, Äpfel und Beeren' },
    { n: 'Wüste', pre: 'Wüsteninsel', foes: ['scorpion', 'scorpion', 'sandslime'], info: 'Skorpione und Sandschleime · Kakteen, Sandstein und Kokosnüsse' },
    { n: 'Schnee', pre: 'Frostinsel', foes: ['wolf', 'frostslime'], info: 'Eiswölfe und Frostschleime · Eis, Eiskristalle und Tannenholz' },
    { n: 'Dschungel', pre: 'Dschungelinsel', foes: ['frog', 'frog', 'slime'], info: 'Giftfrösche · Tropenholz, Bananen, Fasern und Kokosnüsse' },
    { n: 'Vulkan', pre: 'Vulkaninsel', foes: ['fireslime', 'fireslime', 'golem'], info: 'Feuerschleime und Lavagolems · Obsidian und Glutsteine. Vorsicht vor der Lava!' },
    { n: 'Pilzwald', pre: 'Pilzinsel', foes: ['sporling', 'sporling', 'moth'], info: 'Sporlinge und Glühfalter · Riesenpilze und Sporen' },
  ];
  const BIOME_W = [0.3, 0.14, 0.14, 0.16, 0.1, 0.16];
  // Rohstoffe: Name, Symbol, Farbe
  const RES = {
    holz: ['Holz', '🪵', '#8a5a34'], stein: ['Stein', '🪨', '#8d8a84'], eis: ['Eis', '🧊', '#bfe6ff'], eiskristall: ['Eiskristall', '💎', '#7fe3f5'],
    obsidian: ['Obsidian', '🔮', '#3a2a4a'], kaktus: ['Kaktusfrucht', '🌵', '#e05a8a'], beere: ['Beeren', '🫐', '#d8443a'], apfel: ['Äpfel', '🍎', '#e0402a'],
    kokos: ['Kokosnüsse', '🥥', '#7a5028'], banane: ['Bananen', '🍌', '#f4e04d'], faser: ['Fasern', '🌾', '#c9b06a'], pilz: ['Pilze', '🍄', '#c94a3a'],
    glibber: ['Glibber', '💧', '#8ef07a'], stachel: ['Skorpionstachel', '🦂', '#d9a050'], fell: ['Wolfsfell', '🐺', '#c8ccd8'], glut: ['Glutsteine', '🔥', '#ff7a2a'], sporen: ['Sporen', '✨', '#c9a6ff'],
    saft: ['Beerensaft', '🧃', '#d84a8a', 1], kuchen: ['Apfelkuchen', '🥧', '#e0a050', 1], suppe: ['Pilzsuppe', '🍲', '#c96a3a', 1], shake: ['Kokos-Shake', '🥤', '#f0e0a0', 1], elixier: ['Kaktus-Elixier', '🧪', '#5ad06a', 1],
    wuestenperle: ['Wüstenperle', '🦪', '#f0e0c0'], frostherz: ['Frostherz', '💙', '#7fc8ff'], giftdruese: ['Giftdrüse', '🟢', '#5ad06a'], drachenschuppe: ['Drachenschuppe', '🐉', '#e04a2a'], koenigsspore: ['Königsspore', '🌟', '#e0a0ff'],
    samen_weizen: ['Weizensamen', '🌰', '#c8a050'], samen_karotte: ['Karottensamen', '🌰', '#e07a30'], samen_kuerbis: ['Kürbissamen', '🌰', '#e8a040'],
    weizen: ['Weizen', '🌾', '#e0c050'], karotte: ['Karotten', '🥕', '#f07a20'], kuerbis: ['Kürbisse', '🎃', '#e87a20'], ei: ['Eier', '🥚', '#f4eee0'], wolle: ['Wolle', '🧶', '#f0ece4'],
    brot: ['Brot', '🍞', '#d8a050', 1], ruehrei: ['Rührei', '🍳', '#f4d040', 1], karottensuppe: ['Karottensuppe', '🥣', '#f08a30', 1], kuerbiskuchen: ['Kürbiskuchen', '🥮', '#e8902a', 1],
  };

  /* ---------- Zufall und Rauschen ---------- */
  function h2(x, y, s) {
    let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653);
    n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  const sm = t => t * t * (3 - 2 * t);
  function vn(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
    const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const fbm = (x, y, s) => vn(x, y, s) * 0.55 + vn(x * 2.1, y * 2.1, s + 1) * 0.3 + vn(x * 4.3, y * 4.3, s + 2) * 0.15;

  /* ---------- Inseln ---------- */
  const SYL = ['Ka', 'Lo', 'Mi', 'Ra', 'Te', 'Nu', 'Sa', 'Vel', 'Or', 'Bri', 'Ma', 'Ho', 'Ze', 'Fa', 'Lu', 'Is', 'Ko', 'Ta'];
  const END = ['nar', 'lo', 'ka', 'dia', 'mos', 'tun', 'ra', 'wen', 'sel', 'rin', 'bo', 'ter'];
  const KIND = ['Insel', 'Eiland', 'Inseln', 'Atoll'];
  const islCache = new Map();
  function island(cx, cy) {
    const k = cx + ',' + cy;
    if (islCache.has(k)) return islCache.get(k);
    let v = null;
    const home = cx === 0 && cy === 0;
    if (!home && Math.hypot(cx * CELL + 70 - BIG.x, cy * CELL + 70 - BIG.y) < 360) { islCache.set(k, null); return null; } // Meer um die Heimatinsel
    if (home || h2(cx, cy, SEED) < 0.62) {
      const x = home ? CELL / 2 : cx * CELL + 25 + h2(cx, cy, SEED + 1) * 90;
      const y = home ? CELL / 2 : cy * CELL + 25 + h2(cx, cy, SEED + 2) * 90;
      const r = home ? 30 : 12 + h2(cx, cy, SEED + 3) * 30;
      let bi = 0;
      if (!home) { let q = h2(cx, cy, SEED + 9); while (bi < BIOME_W.length - 1 && q >= BIOME_W[bi]) { q -= BIOME_W[bi]; bi++; } }
      const k = home ? 0.66 : bi === VULKAN ? 1.35 : h2(cx, cy, SEED + 8) < 0.3 ? 1.2 : 0.62; // manche Inseln haben Berge, Vulkane immer
      const lobes = [[x, y, r, k]];
      const nl = home ? 2 : Math.floor(h2(cx, cy, SEED + 4) * 3);
      for (let i = 0; i < nl; i++) {
        const a = h2(cx, cy, SEED + 10 + i) * Math.PI * 2, d = r * (0.6 + h2(cx, cy, SEED + 20 + i) * 0.6);
        lobes.push([x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.4 + h2(cx, cy, SEED + 30 + i) * 0.45), k * 0.85]);
      }
      const nm = SYL[Math.floor(h2(cx, cy, SEED + 5) * SYL.length)] + END[Math.floor(h2(cx, cy, SEED + 6) * END.length)];
      const kind = KIND[Math.floor(h2(cx, cy, SEED + 7) * (r < 18 ? 4 : 2))];
      v = { x, y, r, lobes, b: bi, cx, cy, home: home ? 1 : 0, name: home ? 'Startinsel' : bi ? BIOMES[bi].pre + ' ' + nm : (kind === 'Inseln' ? nm + '-Inseln' : kind + ' ' + nm) };
    }
    islCache.set(k, v);
    return v;
  }
  let EB = 0, TB = 0; // Biom der zuletzt abgefragten Stelle
  function elev(x, y) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    let best = -3; EB = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const isl = island(cx + i, cy + j); if (!isl) continue;
      for (const [lx, ly, lr, lk] of isl.lobes) {
        const dx = x - lx, dy = y - ly; let v = 1 - (dx * dx + dy * dy) / (lr * lr);
        if (v > 0) v *= lk;
        if (v > best) { best = v; EB = isl.b; }
      }
    }
    if (nearBig(x, y)) for (const [lx, ly, lr, lk] of BIG.lobes) { const dx = x - lx, dy = y - ly; let v = 1 - (dx * dx + dy * dy) / (lr * lr); if (v > 0) v *= lk; if (v > best) { best = v; EB = 0; } }
    if (best < -2.5) return best;
    return best + (fbm(x / 22, y / 22, SEED + 50) - 0.5) * 1.05 + (vn(x / 5, y / 5, SEED + 51) - 0.5) * 0.16;
  }
  const cls = e => (e < -0.9 ? W_DEEP : e < -0.25 ? W_SEA : e < 0 ? W_SHALLOW : e < 0.1 ? SAND : e < 0.6 ? GRASS : e < 0.82 ? HILL : ROCK);
  const clsB = (e, b) => (b === VULKAN && e > 1.2 ? LAVA : cls(e));
  function tileAt(tx, ty) {
    const e = elev(tx + 0.5, ty + 0.5); TB = EB;
    const c = clsB(e, TB);
    if (c === GRASS && fbm(tx / 14, ty / 14, SEED + 60) > 0.6) return FOREST;
    return c;
  }
  // Höhleneingang: fester Platz auf der Heimatinsel mit festem Boden rundherum
  let ENT = null;
  function caveEnt() {
    if (ENT) return ENT;
    const hx = 70, hy = 70;
    for (let r = 9; r < 26 && !ENT; r++) for (let i = 0; i < 32 && !ENT; i++) {
      const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 16);
      const tx = Math.round(hx + Math.cos(a) * r), ty = Math.round(hy + Math.sin(a) * r);
      let ok = true;
      for (let dy = -4; dy <= 2 && ok; dy++) for (let dx = -3; dx <= 3 && ok; dx++) { const t = tileAt(tx + dx, ty + dy); if (t < GRASS) ok = false; }
      if (ok) ENT = { tx, ty, x: tx + 0.5, y: ty + 0.9 };
    }
    if (!ENT) ENT = { tx: 70, ty: 60, x: 70.5, y: 60.9 };
    return ENT;
  }
  // Werkstationen: Werkbank, Schmiede und Kochstelle am Startplatz, die Werft am Südufer
  let STPOS = null;
  function stations() {
    if (STPOS) return STPOS;
    let yw = 71; for (let r = 4; r < 50; r += 0.25) if (elev(70.5, 70.5 + r) < 0.02) { yw = 70.5 + r; break; }
    STPOS = [{ k: 'werk', x: 66.5, y: 68.6 }, { k: 'schmiede', x: 74.5, y: 68.6 }, { k: 'koch', x: 70.5, y: 66.8 }, { k: 'werft', x: 70.5, y: yw - 0.9, wy: yw }];
    return STPOS;
  }
  // Gegenstände: 1 Baum, 2 Palme, 3 Fels, 4 Blumen, 5 Gras, 6 Busch, 7 Tanne, 8 Kaktus, 9 toter Baum, 10 Dschungelbaum,
  // 11 Schneetanne, 12 Eisfels, 13 Obsidian, 14 Sandstein, 15 Riesenpilz, 16 Farn, 17 Trockenbusch, 18 Knochen, 19 kleine Pilze, 20 Schneeflecken
  // Tabelle je Biom und Bodenart: [Gegenstand, Anteil] nacheinander
  const OBJ = {
    [WIESE]: { [FOREST]: [[1, .17], [7, .13], [6, .04], [5, .06]], [GRASS]: [[1, .025], [6, .015], [4, .06], [5, .07]], [SAND]: [[2, .03]], [HILL]: [[3, .05], [7, .03], [6, .02]], [ROCK]: [[3, .07]] },
    [WUESTE]: { [FOREST]: [[8, .08], [17, .08]], [GRASS]: [[8, .04], [17, .04], [18, .012], [14, .02]], [SAND]: [[2, .03], [18, .01]], [HILL]: [[14, .07], [8, .02]], [ROCK]: [[14, .08]] },
    [SCHNEE]: { [FOREST]: [[11, .3], [20, .05]], [GRASS]: [[11, .05], [12, .02], [20, .06]], [SAND]: [[12, .02]], [HILL]: [[12, .06], [11, .05]], [ROCK]: [[12, .08]] },
    [DSCHUNGEL]: { [FOREST]: [[10, .22], [16, .15], [2, .04], [4, .03]], [GRASS]: [[10, .05], [16, .1], [2, .03], [4, .06]], [SAND]: [[2, .07]], [HILL]: [[3, .04], [10, .06], [16, .06]], [ROCK]: [[3, .06]] },
    [VULKAN]: { [FOREST]: [[9, .1], [13, .03]], [GRASS]: [[9, .03], [13, .03], [5, .03]], [SAND]: [[13, .02]], [HILL]: [[13, .06], [9, .02]], [ROCK]: [[13, .08]] },
    [PILZ]: { [FOREST]: [[15, .22], [19, .1]], [GRASS]: [[15, .05], [19, .08], [4, .04], [5, .05]], [SAND]: [[19, .03]], [HILL]: [[3, .04], [15, .05]], [ROCK]: [[3, .06]] },
  };
  function objAt(tx, ty, t) {
    const b = TB;
    if (Math.abs(tx - 70) < 6 && ty >= 64 && ty <= 73) return 0; // Startplatz und Werkstätten frei
    if (STPOS && Math.abs(tx - 70) < 4 && Math.abs(ty - STPOS[3].y) < 3) return 0; // vor der Werft frei
    const E = caveEnt(); if (Math.abs(tx - E.tx) <= 3 && ty >= E.ty - 4 && ty <= E.ty + 2) return 0; // vor der Höhle frei
    { const cx = Math.floor(tx / CELL), cy = Math.floor(ty / CELL); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const isl = islCache.get((cx + i) + ',' + (cy + j)); if (isl && isl.b && isl.r >= 20) { const c = islandCave(isl); if (c && Math.abs(tx - c.ent.tx) <= 3 && ty >= c.ent.ty - 4 && ty <= c.ent.ty + 2) return 0; } } }
    if (inTownClear(tx, ty)) return 0;
    const list = (OBJ[b] || OBJ[0])[t]; if (!list) return 0;
    let r = h2(tx, ty, SEED + 70);
    for (const [o, p] of list) { if (r < p) return o; r -= p; }
    return 0;
  }
  const SOLID = new Set([1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 14, 15]), FLAT = new Set([4, 5, 18, 19, 20]);
  const solid = o => SOLID.has(o);
  // abgebaute Gegenstände wachsen nach 5 Minuten nach
  const cut = new Map(), hits = new Map();
  const isCut = (tx, ty) => (cut.get(tx + ',' + ty) || 0) > Date.now();
  function walkable(x, y) {
    if (nearBig(x, y)) { const ta = townAt(x, y); if (ta === 4) return true; if (townBlocked(x, y)) return false; if (ta === 3 && baseSolid(x, y)) return false; }
    const e = elev(x, y); if (e < 0 && cls(e) !== W_SHALLOW) return false;
    if (clsB(e, EB) === LAVA) return false;
    const tx = Math.floor(x), ty = Math.floor(y), o = objAt(tx, ty, tileAt(tx, ty));
    if (solid(o) && !isCut(tx, ty)) { const dx = x - (tx + 0.5), dy = y - (ty + 0.8); if (dx * dx + dy * dy < (o === 3 ? 0.2 : 0.12)) return false; }
    for (const { e: E } of entsNear(x, y)) { const ex = x - E.x, ey = y - E.y; if (Math.abs(ex) < 1.6 && ey < 0 && ey > -2.7 && !(Math.abs(ex) < 0.4 && ey > -0.7)) return false; } // Felsen um die Eingänge
    if (STPOS && Math.abs(x - 70.5) < 6) for (const st of STPOS) { const dx = x - st.x, dy = y - (st.y - 0.25); if (dx * dx / (st.k === 'werft' ? 1.6 : 0.8) + dy * dy / 0.25 < 1) return false; }
    return true;
  }
  const sailable = (x, y) => elev(x, y) < -0.02 && !(nearBig(x, y) && townAt(x, y) === 4);
  function nearestIsland(x, y) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    let best = null, bd = 1e9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const isl = island(cx + i, cy + j); if (!isl) continue;
      const d = Math.hypot(x - isl.x, y - isl.y) / (isl.r * 1.6);
      if (d < bd) { bd = d; best = isl; }
    }
    if (nearBig(x, y)) { const d = Math.hypot(x - BIG.x, y - BIG.y) / (BIG.r * 1.6); if (d < bd) { bd = d; best = BIG; } }
    return bd < 1 ? best : null;
  }
  /* ---------- Heimatinsel mit Dorf (weit im Westen, außerhalb der Inselgruppe) ---------- */
  const BIG = { x: -400, y: 70, r: 118, b: 0, town: 1, name: 'Heimatinsel Lindmark' };
  BIG.lobes = [[BIG.x, BIG.y, 118, 0.5], [BIG.x - 70, BIG.y - 62, 62, 0.55], [BIG.x + 42, BIG.y - 92, 52, 0.75], [BIG.x - 84, BIG.y + 58, 56, 0.55], [BIG.x + 58, BIG.y + 74, 50, 0.55], [BIG.x - 128, BIG.y - 6, 46, 1.2]];
  const nearBig = (x, y) => Math.abs(x - BIG.x) < 270 && Math.abs(y - BIG.y) < 270;
  let TOWN = null;
  // Dorf-Grundriss: Platz, Wege, Häuser, Hafen und Bauplätze
  function town() {
    if (TOWN) return TOWN;
    const V = { x: BIG.x + 30, y: BIG.y };
    let shore = V.x + 60; for (let x = V.x + 10; x < V.x + 200; x += 0.25) if (elev(x, V.y) < 0.02) { shore = x; break; }
    const PX0 = V.x - 38, PY0 = V.y + 17, PW = 10, PG = 13; // Bauplätze 10×10, 5 Spalten, 3 Reihen
    const plots = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) plots.push({ id: r * 5 + c, x: PX0 + c * PG, y: PY0 + r * PG, w: PW, h: PW });
    const roads = [
      [V.x + 6, V.y, shore + 0.5, V.y], [V.x, V.y - 6, V.x, V.y - 24], [V.x - 6, V.y, V.x - 34, V.y], [V.x, V.y + 6, V.x, PY0 - 1.5],
      [PX0 - 1.5, PY0 - 1.5, PX0 + 5 * PG - 1.5, PY0 - 1.5], [PX0 - 1.5, PY0 + PG - 1.5, PX0 + 5 * PG - 1.5, PY0 + PG - 1.5], [PX0 - 1.5, PY0 + 2 * PG - 1.5, PX0 + 5 * PG - 1.5, PY0 + 2 * PG - 1.5],
      ...[0, 1, 2, 3, 4, 5].map(c => [PX0 + c * PG - 1.5, PY0 - 1.5, PX0 + c * PG - 1.5, PY0 + 3 * PG - 1.5]),
    ];
    const houses = [
      { k: 'hafen', x: V.x + 15, y: V.y - 4, wall: '#d8c8a8', roof: '#3b6aa8', sign: '⚓' },
      { k: 'markt', x: V.x + 6, y: V.y - 10, stall: 1, sign: '🪙' },
      { k: 'bau', x: V.x - 7, y: V.y - 10, wall: '#c8b8a0', roof: '#8a3a2a', sign: '🔨' },
      { k: 'hof', x: V.x - 17, y: V.y - 4, wall: '#e0d0b0', roof: '#c8a040', sign: '🌾' },
      { k: 'schneider', x: V.x - 16, y: V.y + 8, wall: '#e8d8e8', roof: '#8a4aa8', sign: '🎩' },
      { k: 'angler', x: shore - 4, y: V.y - 5, wall: '#b89a70', roof: '#4a7a6a', sign: '🎣', small: 1 },
    ];
    const npcs = [
      { k: 'hafen', n: 'Hafenmeisterin Greta', col: 1, hat: 'kapitaen', x: V.x + 15, y: V.y - 2.6, hi: ['Ahoi! Ich habe Aufträge für fleißige Abenteurer.', 'Jeden Tag gibt es neue Aufträge bei mir.'] },
      { k: 'markt', n: 'Händler Ole', col: 3, hat: 'none', x: V.x + 6, y: V.y - 8.6, hi: ['Frische Ware! Ich kaufe auch alles, was du findest.', 'Münzen gegen Rohstoffe, Rohstoffe gegen Münzen!'] },
      { k: 'bau', n: 'Baumeister Bruno', col: 7, hat: 'bauhelm', x: V.x - 7, y: V.y - 8.6, hi: ['Du willst bauen? Südlich vom Dorfplatz sind Bauplätze frei.', 'Jeder bekommt einen eigenen Bauplatz.'] },
      { k: 'hof', n: 'Bäuerin Frieda', col: 2, hat: 'stroh', x: V.x - 17, y: V.y - 2.6, hi: ['Mit Samen kannst du auf deinem Bauplatz Felder anlegen.', 'Hühner legen Eier, Schafe geben Wolle!'] },
      { k: 'schneider', n: 'Schneiderin Mila', col: 5, hat: 'blumen', x: V.x - 16, y: V.y + 9.4, hi: ['Ein neuer Hut gefällig? Oder eine Farbe für dein Boot?', 'Wer gut aussieht, segelt schneller. Sagt man.'] },
      { k: 'angler', n: 'Angler Hein', col: 6, hat: 'fischer', x: shore - 4, y: V.y - 3.6, hi: ['Die besten Fische beißen nachts.', 'Jede Inselart hat ihre eigenen Fische.'] },
    ];
    const walkers = [0, 1, 2, 3].map(i => ({ n: ['Lotte', 'Jakob', 'Emil', 'Rosa'][i], col: [0, 4, 6, 2][i], hat: ['none', 'stroh', 'none', 'blumen'][i], path: [[[V.x + 3, V.y + 3], [shore - 6, V.y + 0.8], [V.x + 3, V.y - 3], [V.x + 0.6, V.y - 21]], [[V.x - 3, V.y - 3], [V.x - 30, V.y + 0.8], [V.x - 3, V.y + 3], [V.x + 0.5, PY0 + 24]], [[V.x + 3, V.y - 3], [V.x + 0.6, V.y - 20], [V.x - 3, V.y - 3], [V.x - 3, V.y + 3]], [[V.x - 3, V.y + 3], [V.x + 0.6, PY0 + 11], [V.x + 3, V.y + 3], [shore - 8, V.y - 0.8]]][i], seg: 0, t: i * 7, x: [V.x + 3, V.x - 3, V.x + 3, V.x - 3][i], y: [V.y + 3, V.y - 3, V.y - 3, V.y + 3][i], dir: 0, lines: ['Schönes Wetter heute!', 'Warst du schon in der Kristallhöhle?', 'Im Westen soll es Berge geben.', 'Ich hab gehört, auf den Vulkaninseln gibt es Golems!', 'Die Hafenmeisterin sucht immer Hilfe.'] }));
    const dock = { x0: shore - 1, x1: shore + 7, y0: V.y - 1.2, y1: V.y + 1.2 };
    TOWN = { V, shore, plots, roads, houses, npcs, walkers, dock, bb: [PX0 - 6, V.y - 30, shore + 9, PY0 + 3 * PG + 3] };
    return TOWN;
  }
  const segD = (x, y, [x0, y0, x1, y1]) => { const dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l)) : 0; return Math.hypot(x - x0 - dx * t, y - y0 - dy * t); };
  // Was liegt an dieser Stelle im Dorf? 1 Platz, 2 Weg, 3 Bauplatz, 4 Steg
  function townAt(x, y) {
    if (!nearBig(x, y)) return 0;
    const T = town(); if (x < T.bb[0] || x > T.bb[2] || y < T.bb[1] || y > T.bb[3]) return 0;
    if (x >= T.dock.x0 && x <= T.dock.x1 && y >= T.dock.y0 && y <= T.dock.y1) return 4;
    if (Math.hypot(x - T.V.x, y - T.V.y) < 5) return 1;
    for (const p of T.plots) if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return 3;
    for (const r of T.roads) if (segD(x, y, r) < 1.1) return 2;
    return 0;
  }
  const inTownClear = (tx, ty) => { if (!nearBig(tx, ty)) return false; const T = town(); if (tx < T.bb[0] - 2 || tx > T.bb[2] + 2 || ty < T.bb[1] - 2 || ty > T.bb[3] + 2) return false; if (townAt(tx + 0.5, ty + 0.5)) return true; for (const h of T.houses) if (Math.abs(tx + 0.5 - h.x) < 5 && ty + 0.5 > h.y - 5 && ty + 0.5 < h.y + 4) return true; for (const r of T.roads) if (segD(tx + 0.5, ty + 0.5, r) < 2.2) return true; return Math.hypot(tx + 0.5 - T.V.x, ty + 0.5 - T.V.y) < 9; };
  function townBlocked(x, y) {
    if (!nearBig(x, y)) return false;
    const T = town(); if (x < T.bb[0] - 3 || x > T.bb[2] + 3 || y < T.bb[1] - 6 || y > T.bb[3] + 3) return false;
    for (const h of T.houses) { const hw = h.small ? 1.6 : 2.2; if (Math.abs(x - h.x) < hw && y < h.y - 0.05 && y > h.y - 2.4) return true; }
    if (Math.hypot(x - T.V.x, (y - T.V.y) * 1.6) < 1.5) return true; // Brunnen
    for (const n of T.npcs) if (Math.hypot(x - n.x, y - n.y) < 0.4) return true;
    return false;
  }


  /* ---------- Farben ---------- */
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PAL = {
    [W_DEEP]: hex('#1b4a84'), [W_SEA]: hex('#2768aa'), [W_SHALLOW]: hex('#3f9bcb'), [SAND]: hex('#e6d098'),
    [GRASS]: hex('#68b64b'), [FOREST]: hex('#4c9a3a'), [HILL]: hex('#8aab58'), [ROCK]: hex('#8d8a84'),
  };
  const FOAM = hex('#d9f1fb'), WETSAND = hex('#cbb57c');
  const BPAL = [
    null,
    { [SAND]: '#eed9a0', [GRASS]: '#e6c47e', [FOREST]: '#e2c080', [HILL]: '#d4a868', [ROCK]: '#b07e5a', wet: '#d4b47a', tuft: '#b89a50' },
    { [SAND]: '#d4dde6', [GRASS]: '#eef4fa', [FOREST]: '#e2ebf3', [HILL]: '#ccd9e6', [ROCK]: '#93a0ae', wet: '#b8c4d0', tuft: '#b8c8d8' },
    { [SAND]: '#e6d098', [GRASS]: '#3f9a3a', [FOREST]: '#2a7a2e', [HILL]: '#3f8434', [ROCK]: '#5e7a50', wet: '#cbb57c', tuft: '#2c7a2c' },
    { [SAND]: '#4e4644', [GRASS]: '#5a5250', [FOREST]: '#4a4240', [HILL]: '#5e403a', [ROCK]: '#2e2628', wet: '#3a3434', tuft: '#6a5a50' },
    { [SAND]: '#ddcbae', [GRASS]: '#8a62b8', [FOREST]: '#6a4a9a', [HILL]: '#9a7ac0', [ROCK]: '#7a7088', wet: '#c4b296', tuft: '#5c4290' },
  ].map(p => p && Object.fromEntries(Object.entries(p).map(([k, v]) => [k, k === 'tuft' ? v : hex(v)])));
  const LAVAC = hex('#ff6a1a');
  const colB = (b, t) => (t === LAVA ? LAVAC : t <= W_SHALLOW || !b ? PAL[t] : BPAL[b][t]);

  /* ---------- Pixel-Sprites ---------- */
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // Form pixelweise füllen und schattieren: Licht von links oben, Rand dunkel
  function paint(g, w, h, fn, pal, seed) {
    const img = g.getImageData(0, 0, w, h), d = img.data, N = new Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) N[y * w + x] = fn(x, y);
    const P = pal.map(hex);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, n = N[i]; if (!n) continue;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !N[i - 1] || !N[i + 1] || !N[i - w] || !N[i + w];
      let c;
      if (edge) c = P[0];
      else { const l = -n[0] * 0.45 - n[1] * 0.65 + (h2(x, y, seed) - 0.5) * 0.5 + (n[2] || 0); c = P[l < -0.4 ? 1 : l < 0.05 ? 2 : l < 0.42 ? 3 : 4]; }
      const o = i * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return N;
  }
  const blobFn = (list, seed) => (x, y) => {
    let r = null;
    for (let i = 0; i < list.length; i++) {
      const [cx, cy, rad] = list[i], dx = x + 0.5 - cx, dy = y + 0.5 - cy, rr = rad + (h2(x, y, seed + i) - 0.5) * 1.3;
      if (dx * dx + dy * dy < rr * rr) r = [dx / rad, dy / rad, (vn(x / 2.5, y / 2.5, seed + 7) - 0.5) * 0.5];
    }
    return r;
  };
  function outline(g, w, h, col) {
    const img = g.getImageData(0, 0, w, h), d = img.data, o = new Uint8ClampedArray(d), [r, gg, b] = hex(col);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (d[i + 3] > 40) continue;
      const near = (x > 0 && d[i - 1] > 200) || (x < w - 1 && d[i + 7] > 200) || (y > 0 && d[i - w * 4 + 3] > 200) || (y < h - 1 && d[i + w * 4 + 3] > 200);
      if (near) { o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = 235; }
    }
    img.data.set(o); g.putImageData(img, 0, 0);
  }
  const SPR = {};
  function buildSprites() {
    if (SPR.done) return;
    // Laubbäume: Stamm und Krone getrennt, damit die Krone im Wind schwingt
    SPR[1] = [0, 1, 2].map(v => {
      const [tr, tg] = mk(32, 44), [cr, cg] = mk(32, 44);
      R(tg, 14, 25, 5, 16, '#6b4426'); R(tg, 14, 25, 1, 16, '#8a5a34'); R(tg, 18, 25, 1, 16, '#4a2e18');
      R(tg, 15, 30, 1, 2, '#4a2e18'); R(tg, 17, 35, 1, 2, '#8a5a34'); R(tg, 12, 39, 2, 2, '#6b4426'); R(tg, 19, 39, 2, 2, '#5a3a20');
      outline(tg, 32, 44, '#20140c');
      const pal = v === 2 ? ['#16331a', '#1f5a2a', '#2a7536', '#3f9442', '#6fbf5a'] : ['#173a1c', '#245c27', '#2f7a2f', '#45a03c', '#7cc85a'];
      const N = paint(cg, 32, 44, blobFn([[16, 18, 9.5], [9, 20, 6.5], [23, 20, 6.5], [12, 11, 6.5], [21, 11, 6.5], [16, 7, 5.5]], 400 + v), pal, 410 + v);
      if (v === 1) for (let i = 0; i < 32 * 44; i++) if (N[i] && h2(i, v, 420) < 0.035) { const x = i % 32, y = (i / 32) | 0; if (N[i - 1] && N[i + 1] && N[i - 32] && N[i + 32]) { R(cg, x, y, 2, 2, '#d8443a'); R(cg, x, y, 1, 1, '#ff8a7a'); } }
      return { trunk: tr, crown: cr, w: 32, h: 44, ax: 16, ay: 41, sw: 7 };
    });
    // Tannen
    SPR[7] = [0, 1].map(v => {
      const [tr, tg] = mk(28, 48), [cr, cg] = mk(28, 48);
      R(tg, 12, 36, 4, 10, '#5a3a22'); R(tg, 12, 36, 1, 10, '#7a5232'); outline(tg, 28, 48, '#20140c');
      paint(cg, 28, 48, (x, y) => {
        let r = null;
        for (let k = 0; k < 4; k++) {
          const top = 2 + k * 8, bot = top + 13, half = 3.5 + k * 2.8 + v * 0.6;
          if (y < top || y > bot) continue;
          const f = (y - top) / (bot - top), hw = 1 + half * f + (h2(x, y, 430 + k) - 0.5) * 1.4, dx = x + 0.5 - 14;
          if (Math.abs(dx) < hw) r = [dx / (hw + 1) * 1.1, f * 1.3 - 0.5, 0];
        }
        return r;
      }, ['#0f2a1e', '#18432c', '#215a36', '#2f7642', '#55a05e'], 440 + v);
      return { trunk: tr, crown: cr, w: 28, h: 48, ax: 14, ay: 45, sw: 6 };
    });
    // Palmen
    SPR[2] = [-1, 1].map(lean => {
      const [tr, tg] = mk(40, 46), [cr, cg] = mk(40, 46);
      const top = [20 + lean * 6, 16];
      for (let i = 0; i <= 26; i++) { const p = i / 26, x = Math.round(20 + lean * 6 * p * p), y = Math.round(43 - 27 * p); R(tg, x - 1, y, 3, 1, i % 3 === 0 ? '#7a5028' : '#a8743f'); R(tg, x - 1, y, 1, 1, '#c99a5a'); }
      outline(tg, 40, 46, '#20140c');
      for (let f = 0; f < 7; f++) {
        const a = f / 7 * Math.PI * 2 + 0.3, ex = top[0] + Math.cos(a) * 15, ey = top[1] + Math.sin(a) * 7 + 5, qx = top[0] + Math.cos(a) * 8, qy = top[1] + Math.sin(a) * 4 - 5;
        for (let t = 0; t <= 1; t += 0.04) {
          const x = (1 - t) * (1 - t) * top[0] + 2 * (1 - t) * t * qx + t * t * ex, y = (1 - t) * (1 - t) * top[1] + 2 * (1 - t) * t * qy + t * t * ey;
          R(cg, Math.round(x), Math.round(y), 2, 1, '#3f9a37'); R(cg, Math.round(x), Math.round(y) - 1, 1, 1, '#6cc457');
          if (t > 0.2 && Math.round(t * 25) % 2) R(cg, Math.round(x), Math.round(y) + 1, 1, 2, '#2c7a2c');
        }
      }
      R(cg, top[0] - 2, top[1] + 1, 2, 2, '#6b4426'); R(cg, top[0] + 1, top[1] + 2, 2, 2, '#5a3a20'); R(cg, top[0] - 1, top[1] - 1, 3, 2, '#2c7a2c');
      outline(cg, 40, 46, '#13300f');
      return { trunk: tr, crown: cr, w: 40, h: 46, ax: 20, ay: 43, sw: 5 };
    });
    // Felsbrocken
    SPR[3] = [0, 1, 2].map(v => {
      const [c, g] = mk(22, 18);
      paint(g, 22, 18, blobFn(v === 0 ? [[11, 10, 7], [6, 12, 4.5], [16, 12, 4.5]] : v === 1 ? [[9, 11, 6], [15, 12, 4.5]] : [[11, 11, 5.5]], 450 + v), ['#2f2d2b', '#5d5a56', '#7b7873', '#9a9790', '#c4c1b9'], 460 + v);
      if (v !== 2) for (let x = 5; x < 17; x++) if (h2(x, v, 470) < 0.5) R(g, x, 5 + Math.round(h2(x, 1, 471) * 2), 1, 1, '#6a9a44');
      return { trunk: c, w: 22, h: 18, ax: 11, ay: 15, sw: 7 };
    });
    // Büsche mit Beeren
    SPR[6] = [0, 1].map(v => {
      const [c, g] = mk(20, 16);
      const N = paint(g, 20, 16, blobFn([[10, 9, 5.5], [5, 11, 4], [15, 11, 4]], 480 + v), ['#173a1c', '#2a6b2c', '#3a8a36', '#55a845', '#86d06a'], 490 + v);
      for (let i = 0; i < 320; i++) if (N[i] && h2(i, v, 495) < 0.06) R(g, i % 20, (i / 20) | 0, 1, 1, v ? '#5a7de0' : '#e04a5a');
      return { trunk: c, w: 20, h: 16, ax: 10, ay: 14, sw: 6, soft: 1 };
    });
    // Höhleneingang: Felshügel mit dunklem Bogen
    {
      const [c, g] = mk(56, 48);
      paint(g, 56, 48, blobFn([[28, 28, 17], [13, 34, 11], [43, 34, 11], [28, 15, 11], [19, 21, 9], [37, 21, 9]], 500), ['#24211f', '#4d4a46', '#6a6762', '#87847e', '#aeaba3'], 501);
      for (let x = 10; x < 46; x++) if (h2(x, 0, 502) < 0.6) R(g, x, 8 + Math.round(Math.abs(x - 28) * 0.5 + h2(x, 1, 503) * 3), 2, 2, '#5f9a3f');
      const arch = y => (y < 30 ? 0 : y < 31 ? 3 : y < 32 ? 5 : y < 34 ? 6 : 7);
      for (let y = 29; y < 46; y++) { const hw = arch(y); if (!hw) continue; R(g, 28 - hw - 1, y, hw * 2 + 2, 1, '#8f8b84'); }
      for (let y = 30; y < 46; y++) { const hw = arch(y); if (!hw) continue; for (let x = -hw; x < hw; x++) { const k = Math.min(1, (Math.abs(x) / hw) * 0.8 + (46 - y) / 40); const v = Math.round(10 + k * 26); g.fillStyle = `rgb(${v},${v - 3},${v + 6})`; g.fillRect(28 + x, y, 1, 1); } }
      R(g, 15, 33, 2, 12, '#6b4426'); R(g, 39, 33, 2, 12, '#6b4426'); R(g, 14, 32, 4, 2, '#4a2e18'); R(g, 38, 32, 4, 2, '#4a2e18');
      outline(g, 56, 48, '#1a1614');
      SPR.ent = { trunk: c, w: 56, h: 48, ax: 28, ay: 45, sw: 20, torches: [[16, 31], [40, 31]] };
    }
    // --- Pflanzen und Steine der anderen Inselarten
    const pineSpr = (pal, seed, v) => {
      const [tr, tg] = mk(28, 48), [cr, cg] = mk(28, 48);
      R(tg, 12, 36, 4, 10, '#5a3a22'); R(tg, 12, 36, 1, 10, '#7a5232'); outline(tg, 28, 48, '#20140c');
      paint(cg, 28, 48, (x, y) => {
        let r = null;
        for (let k = 0; k < 4; k++) {
          const top = 2 + k * 8, bot = top + 13, half = 3.5 + k * 2.8 + v * 0.6;
          if (y < top || y > bot) continue;
          const f = (y - top) / (bot - top), hw = 1 + half * f + (h2(x, y, seed + k) - 0.5) * 1.4, dx = x + 0.5 - 14;
          if (Math.abs(dx) < hw) r = [dx / (hw + 1) * 1.1, f * 1.3 - 0.5, 0];
        }
        return r;
      }, pal, seed + 9);
      return { trunk: tr, crown: cr, w: 28, h: 48, ax: 14, ay: 45, sw: 6 };
    };
    const rockSpr = (pal, seed) => [0, 1, 2].map(v => {
      const [c, g] = mk(22, 18);
      paint(g, 22, 18, blobFn(v === 0 ? [[11, 10, 7], [6, 12, 4.5], [16, 12, 4.5]] : v === 1 ? [[9, 11, 6], [15, 12, 4.5]] : [[11, 11, 5.5]], seed + v), pal, seed + 5 + v);
      return { trunk: c, w: 22, h: 18, ax: 11, ay: 15, sw: 7 };
    });
    const bushSpr = (pal, berries, seed, blobs) => [0, 1].map(v => {
      const [c, g] = mk(20, 16);
      const N = paint(g, 20, 16, blobFn(blobs || [[10, 9, 5.5], [5, 11, 4], [15, 11, 4]], seed + v), pal, seed + 3 + v);
      if (berries) for (let i = 0; i < 320; i++) if (N[i] && h2(i, v, seed + 7) < 0.06) R(g, i % 20, (i / 20) | 0, 1, 1, berries[v]);
      return { trunk: c, w: 20, h: 16, ax: 10, ay: 14, sw: 6, soft: 1 };
    });
    SPR[11] = [0, 1].map(v => pineSpr(['#0f2a1e', '#18432c', '#2a5e46', '#dfeaf4', '#ffffff'], 600 + v * 10, v));
    SPR[12] = rockSpr(['#3a5068', '#7aa0c0', '#a8d0ea', '#d8f0ff', '#ffffff'], 620);
    SPR[13] = rockSpr(['#0a060e', '#1e1428', '#2e2040', '#4a3468', '#8a6ac0'], 630);
    SPR[14] = rockSpr(['#4a2a18', '#9a5a32', '#c07a44', '#d89a5a', '#f0c088'], 640);
    SPR[16] = bushSpr(['#0f3a1a', '#1f6a2a', '#2f8a36', '#48aa48', '#7ad06a'], null, 650, [[10, 10, 4.5], [4, 11, 3.5], [16, 11, 3.5], [7, 6, 3], [13, 6, 3]]);
    SPR[17] = bushSpr(['#4a3418', '#7a5a2a', '#9a7a3a', '#b89a50', '#d8c07a'], null, 660, [[10, 10, 5], [5, 12, 3.5], [15, 12, 3.5]]);
    // Kaktus
    SPR[8] = [0, 1].map(v => {
      const [c, g] = mk(24, 36);
      const rects = v ? [[9, 4, 15, 34], [3, 12, 7, 22], [3, 19, 10, 22], [17, 8, 21, 18], [14, 15, 21, 18]] : [[9, 3, 15, 34], [3, 9, 7, 20], [3, 17, 10, 20], [17, 14, 21, 24], [14, 21, 21, 24]];
      const N = paint(g, 24, 36, (x, y) => {
        for (const [x0, y0, x1, y1] of rects) if (x >= x0 && x < x1 && y >= y0 && y < y1) {
          if ((y === y0) && (x === x0 || x === x1 - 1)) continue;
          const w = (x1 - x0) / 2; return [(x + 0.5 - (x0 + w)) / w, -0.3, ((x - x0) % 2) * -0.25];
        }
        return null;
      }, ['#123a14', '#2a6a2a', '#3a8a36', '#5aaa4a', '#8ad06a'], 670 + v);
      for (let i = 0; i < 24 * 36; i++) if (N[i] && h2(i, v, 671) < 0.05) R(g, i % 24, (i / 24) | 0, 1, 1, '#f4f0d8');
      if (v) { R(g, 10, 2, 4, 2, '#ff6aa0'); R(g, 11, 1, 2, 1, '#ffd0e0'); }
      return { trunk: c, w: 24, h: 36, ax: 12, ay: 33, sw: 6 };
    });
    // toter Baum
    SPR[9] = [0, 1].map(v => {
      const [c, g] = mk(32, 44);
      const line = (x0, y0, x1, y1, w, col) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const t = i / n; R(g, Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t), w, 1, col); } };
      const col = '#4a3a34', hi = '#6e5a50';
      line(16, 41, 16, 16, 4, col); line(15, 41, 15, 18, 1, hi);
      line(16, 28, 8, 18, 2, col); line(8, 18, 5, 12, 1, col); line(16, 23, 24, 13, 2, col); line(24, 13, 27, 8, 1, col);
      line(16, 17, v ? 18 : 13, 7, 2, col); line(9, 19, 10, 14, 1, col); if (v) line(16, 33, 23, 27, 2, col);
      R(g, 12, 39, 3, 2, col); R(g, 18, 39, 3, 2, col);
      outline(g, 32, 44, '#140e0c');
      return { trunk: c, w: 32, h: 44, ax: 16, ay: 41, sw: 6 };
    });
    // Dschungelbaum
    SPR[10] = [0, 1].map(v => {
      const [tr, tg] = mk(40, 52), [cr, cg] = mk(40, 52);
      R(tg, 16, 30, 8, 20, '#5a3a20'); R(tg, 16, 30, 2, 20, '#7a5232'); R(tg, 22, 30, 2, 20, '#3e2716'); R(tg, 12, 46, 5, 3, '#5a3a20'); R(tg, 23, 46, 5, 3, '#4a2e18');
      outline(tg, 40, 52, '#1a100a');
      const N = paint(cg, 40, 52, blobFn([[20, 21, 12], [9, 25, 8], [31, 25, 8], [14, 12, 8.5], [26, 12, 8.5], [20, 6, 6]], 680 + v), ['#0a2410', '#144a1e', '#1f6a28', '#2f8a34', '#58b04a'], 690 + v);
      for (let x = 6; x < 34; x += 3) if (h2(x, v, 691) < 0.5) { let y = 0; while (y < 52 && !(N[y * 40 + x] && !N[(y + 1) * 40 + x])) y++; const L = 3 + Math.floor(h2(x, v, 692) * 8); R(cg, x, y, 1, L, '#2f7a2a'); R(cg, x, y + L, 1, 1, '#5ab048'); }
      if (v) for (let i = 0; i < 40 * 52; i++) if (N[i] && h2(i, 1, 693) < 0.012) { R(cg, i % 40, (i / 40) | 0, 2, 3, '#f4e04d'); }
      return { trunk: tr, crown: cr, w: 40, h: 52, ax: 20, ay: 49, sw: 10 };
    });
    // Riesenpilz
    SPR[15] = [0, 1].map(v => {
      const [tr, tg] = mk(32, 40), [cr, cg] = mk(32, 40);
      R(tg, 13, 18, 6, 19, '#e8dcc6'); R(tg, 13, 18, 2, 19, '#fff8ea'); R(tg, 18, 18, 1, 19, '#c4b49a'); R(tg, 11, 35, 10, 2, '#d8ccb6');
      outline(tg, 32, 40, '#2a2020');
      paint(cg, 32, 40, (x, y) => { const dx = (x + 0.5 - 16) / 15, dy = (y + 0.5 - 17) / 11; return dx * dx + dy * dy < 1 && y < 20 ? [dx, dy, 0] : null; },
        v ? ['#0f2a4a', '#1a4a8a', '#2a6ac0', '#4a9ae0', '#9ad8ff'] : ['#4a0f0f', '#8a1a1a', '#c0302a', '#e04a3a', '#ff8a7a'], 700 + v);
      for (const [x, y, r] of [[10, 10, 2], [19, 8, 2.5], [25, 14, 1.5], [6, 15, 1.5], [15, 15, 1.5]]) for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= r * r) R(cg, x + i, y + j, 1, 1, v ? '#c8f4ff' : '#fff4ea');
      return { trunk: tr, crown: cr, w: 32, h: 40, ax: 16, ay: 37, sw: 9 };
    });
    // Werkstationen
    {
      const st = {};
      let [c, g] = mk(36, 28); // Werkbank
      R(g, 3, 10, 30, 5, '#8a5a34'); R(g, 3, 10, 30, 1, '#c99a5a'); R(g, 3, 14, 30, 1, '#5a3a20'); R(g, 5, 15, 3, 11, '#6b4426'); R(g, 28, 15, 3, 11, '#6b4426'); R(g, 6, 20, 24, 2, '#5a3a20');
      R(g, 6, 6, 10, 4, '#b8b4ac'); R(g, 6, 6, 10, 1, '#ffffff'); for (let i = 0; i < 5; i++) R(g, 6 + i * 2, 10, 1, 1, '#8a8a8a'); R(g, 16, 6, 4, 3, '#6b4426');
      R(g, 23, 3, 2, 8, '#6b4426'); R(g, 21, 2, 6, 3, '#8a8a8a'); R(g, 21, 2, 6, 1, '#c8c8c8');
      outline(g, 36, 28, '#1a1008'); st.werk = { trunk: c, w: 36, h: 28, ax: 18, ay: 26, sw: 13 };
      [c, g] = mk(36, 30); // Schmiede: Amboss und Esse
      R(g, 2, 8, 13, 20, '#5a5250'); R(g, 3, 9, 11, 18, '#7a706a'); R(g, 5, 14, 7, 7, '#2a1a14'); R(g, 3, 9, 11, 1, '#9a908a'); R(g, 6, 2, 5, 7, '#5a5250');
      R(g, 22, 18, 8, 10, '#6b4426'); R(g, 22, 18, 8, 1, '#8a5a34'); R(g, 18, 12, 16, 4, '#3a3a40'); R(g, 20, 16, 10, 3, '#3a3a40'); R(g, 18, 12, 16, 1, '#7a7a88'); R(g, 32, 13, 3, 2, '#3a3a40');
      outline(g, 36, 30, '#120c0a'); st.schmiede = { trunk: c, w: 36, h: 30, ax: 18, ay: 28, sw: 13, fire: [8.5, 18] };
      [c, g] = mk(30, 30); // Kochstelle
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; R(g, Math.round(15 + Math.cos(a) * 10) - 1, Math.round(24 + Math.sin(a) * 4) - 1, 3, 2, i % 2 ? '#8d8a84' : '#6f6c68'); }
      R(g, 4, 6, 2, 20, '#5a3a20'); R(g, 24, 6, 2, 20, '#5a3a20'); R(g, 4, 6, 22, 2, '#6b4426');
      R(g, 9, 10, 12, 9, '#2a2a30'); R(g, 8, 10, 14, 2, '#4a4a54'); R(g, 10, 12, 10, 6, '#3a3a44'); R(g, 10, 10, 10, 1, '#c96a3a'); R(g, 14, 8, 2, 2, '#4a4a54');
      outline(g, 30, 30, '#120c0a'); st.koch = { trunk: c, w: 30, h: 30, ax: 15, ay: 27, sw: 10, fire: [15, 22], steam: [15, 9] };
      [c, g] = mk(44, 30); // Werft: Steg mit Kran
      for (let i = 0; i < 6; i++) R(g, 4 + i * 6, 16, 5, 12, i % 2 ? '#8a5a34' : '#9a6a3a');
      R(g, 4, 16, 36, 1, '#c99a5a'); R(g, 4, 27, 36, 1, '#5a3a20'); R(g, 3, 26, 2, 4, '#5a3a20'); R(g, 39, 26, 2, 4, '#5a3a20');
      R(g, 8, 2, 2, 15, '#6b4426'); R(g, 8, 2, 14, 2, '#6b4426'); R(g, 20, 4, 1, 7, '#d8c8a0'); R(g, 18, 11, 5, 3, '#8a8a8a');
      R(g, 28, 9, 10, 7, '#f0e6d0'); R(g, 28, 9, 10, 1, '#ffffff'); R(g, 31, 9, 1, 7, '#d8443a'); R(g, 25, 12, 3, 4, '#6b4426'); R(g, 25, 11, 3, 1, '#8a5a34');
      outline(g, 44, 30, '#1a1008'); st.werft = { trunk: c, w: 44, h: 30, ax: 22, ay: 27, sw: 16 };
      SPR.st = st;
    }
    SPR.done = true;
  }

  /* ---------- Figuren mit Laufanimation ---------- */
  const charCache = new Map();
  function shadeHex(h, k) { const [r, g, b] = hex(h); return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; }
  // dir: 0 unten, 1 links, 2 rechts, 3 oben · frame: 0 steht, 1–4 Laufschritte
  function charSprite(col, dir, frame) {
    const key = col + '|' + dir + '|' + frame;
    let c = charCache.get(key); if (c) return c;
    let g; [c, g] = mk(16, 24);
    const sh = SHIRTS[col % 8], shD = shadeHex(sh, 0.72), shL = shadeHex(sh, 1.18), skin = '#f1c39a', skinD = '#d9a479', hair = HAIRS[col % 4];
    const pants = '#3a3f5c', pantsD = '#2b2f47', shoe = '#2a2420', eye = '#1d1a22';
    const walk = frame > 0, ph = frame - 1, bob = walk && (ph === 1 || ph === 3) ? -1 : 0;
    const P = (x, y, w, h, cl) => R(g, x, y, w, h, cl);
    if (dir === 0 || dir === 3) {
      const lUp = walk && ph === 2 ? 1 : 0, rUp = walk && ph === 0 ? 1 : 0;
      P(5, 17 + bob, 2, 4 - lUp - bob, pants); P(9, 17 + bob, 2, 4 - rUp - bob, pantsD);
      P(5, 21 - lUp, 2, 2, shoe); P(9, 21 - rUp, 2, 2, shoe);
      const aL = walk ? (ph === 0 ? -1 : ph === 2 ? 1 : 0) : 0;
      P(3, 11 + bob, 2, 4 + aL, dir === 0 ? sh : shD); P(3, 15 + bob + aL, 2, 1, skin);
      P(11, 11 + bob, 2, 4 - aL, dir === 0 ? shD : sh); P(11, 15 + bob - aL, 2, 1, skin);
      P(5, 10 + bob, 6, 7, sh); P(10, 10 + bob, 1, 7, shD); P(5, 10 + bob, 1, 6, shL); P(5, 16 + bob, 6, 1, '#5a3a22');
      if (dir === 0) { P(7, 10 + bob, 2, 1, skinD); P(8, 16 + bob, 1, 1, '#d9b25a'); }
      P(4, 2 + bob, 8, 8, skin); P(4, 9 + bob, 8, 1, skinD);
      if (dir === 0) {
        P(4, 1 + bob, 8, 3, hair); P(3, 2 + bob, 1, 5, hair); P(12, 2 + bob, 1, 5, hair); P(5, 4 + bob, 2, 1, hair); P(9, 4 + bob, 1, 1, hair);
        P(6, 6 + bob, 1, 2, eye); P(9, 6 + bob, 1, 2, eye); P(5, 8 + bob, 1, 1, '#f0a28a'); P(10, 8 + bob, 1, 1, '#f0a28a');
      } else { P(4, 1 + bob, 8, 8, hair); P(3, 2 + bob, 1, 6, hair); P(12, 2 + bob, 1, 6, hair); P(5, 2 + bob, 2, 1, shadeHex(hair, 1.3)); }
    } else {
      // seitlich: nach rechts zeichnen, nach links gespiegelt
      const [t, tg] = mk(16, 24); const Q = (x, y, w, h, cl) => R(tg, x, y, w, h, cl);
      const fo = walk ? (ph === 0 ? 2 : ph === 2 ? -2 : 0) : 0, bo = -fo;
      const fUp = walk && ph === 3 ? 1 : 0, bUp = walk && ph === 1 ? 1 : 0;
      const leg = (off, up, cl) => { const y0 = 17 + bob, y1 = 21 - up; for (let y = y0; y < y1; y++) Q(7 + Math.round(off * (y - y0) / Math.max(1, y1 - y0)), y, 2, 1, cl); Q(7 + off, y1, 3, 2, shoe); };
      leg(bo, bUp, pantsD); leg(fo, fUp, pants);
      const sw = walk ? -fo : 0;
      Q(6, 10 + bob, 5, 7, sh); Q(6, 10 + bob, 1, 7, shD); Q(10, 10 + bob, 1, 6, shL); Q(6, 16 + bob, 5, 1, '#5a3a22');
      for (let y = 0; y < 4; y++) Q(8 + Math.round(sw * y / 4), 11 + bob + y, 2, 1, y ? shD : sh);
      Q(8 + sw, 15 + bob, 2, 1, skin);
      Q(5, 2 + bob, 7, 8, skin); Q(5, 9 + bob, 7, 1, skinD); Q(12, 6 + bob, 1, 1, skin);
      Q(5, 1 + bob, 7, 3, hair); Q(4, 2 + bob, 3, 6, hair); Q(11, 2 + bob, 1, 2, hair);
      Q(10, 6 + bob, 1, 2, eye); Q(7, 5 + bob, 1, 2, skinD); Q(11, 8 + bob, 1, 1, '#f0a28a');
      if (dir === 1) { g.save(); g.translate(16, 0); g.scale(-1, 1); g.drawImage(t, 0, 0); g.restore(); } else g.drawImage(t, 0, 0);
    }
    outline(g, 16, 24, '#1a1420');
    charCache.set(key, c);
    return c;
  }

  /* ---------- Stücke der Oberwelt vorberechnen ---------- */
  const chunks = new Map();
  function bakeChunk(kx, ky) {
    const N = CH * TP, x0 = kx * CH, y0 = ky * CH;
    const TB2 = nearBig(x0 + CH / 2, y0 + CH / 2) && (() => { const b = town().bb; return x0 + CH > b[0] - 2 && x0 < b[2] + 2 && y0 + CH > b[1] - 2 && y0 < b[3] + 2; })();
    const G = CH + 3, eg = new Float32Array(G * G), fg = new Float32Array(G * G), bg = new Uint8Array(G * G);
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { eg[j * G + i] = elev(x0 + i - 1, y0 + j - 1); bg[j * G + i] = EB; fg[j * G + i] = fbm((x0 + i - 1) / 14, (y0 + j - 1) / 14, SEED + 60); }
    const [ground, g] = mk(N, N), img = g.createImageData(N, N), d = img.data;
    for (let py = 0; py < N; py++) {
      const fy = py / TP + 1, iy = Math.floor(fy), ry = fy - iy;
      for (let px = 0; px < N; px++) {
        const fx = px / TP + 1, ix = Math.floor(fx), rx = fx - ix;
        const a = eg[iy * G + ix], b = eg[iy * G + ix + 1], c = eg[(iy + 1) * G + ix], e4 = eg[(iy + 1) * G + ix + 1];
        const top = a + (b - a) * rx, bot = c + (e4 - c) * rx;
        let e = top + (bot - top) * ry;
        const wx = x0 * TP + px, wy = y0 * TP + py, nz = h2(wx, wy, SEED + 80);
        e += (nz - 0.5) * 0.025;
        const bi = bg[Math.round(fy) * G + Math.round(fx)];
        let t = clsB(e, bi);
        if (t === GRASS) {
          const fa = fg[iy * G + ix], fb = fg[iy * G + ix + 1], fc = fg[(iy + 1) * G + ix], fd = fg[(iy + 1) * G + ix + 1];
          const ft = fa + (fb - fa) * rx, fbt = fc + (fd - fc) * rx;
          if (ft + (fbt - ft) * ry + (nz - 0.5) * 0.02 > 0.6) t = FOREST;
        }
        let col = colB(bi, t), k = 1 + (nz - 0.5) * 0.08;
        if (t === W_SHALLOW && e > -0.035) col = FOAM;
        else if (t === SAND && e < 0.018) col = bi ? BPAL[bi].wet : WETSAND;
        if (t === LAVA) { const lv = vn(wx / 6, wy / 6, SEED + 83); k = lv > 0.72 ? 0.6 : 0.88 + lv * 0.35; if (e < 1.24) k *= 0.72; }
        else if (bi === VULKAN && t === ROCK && e > 1.05) k *= 0.75;
        const sl = ((b - a) + (e4 - c)) * 0.5 + ((c - a) + (e4 - b)) * 0.5;
        if (t >= GRASS && t !== LAVA) { k *= 1 - Math.max(-0.12, Math.min(0.12, sl * 0.55)); k *= 0.95 + vn(wx / 9, wy / 9, SEED + 82) * 0.1; }
        if (t <= W_SHALLOW) k *= 0.96 + vn(wx / 40, wy / 40, SEED + 81) * 0.08;
        if (TB2) { const tc = townPix(wx, wy); if (tc) { col = tc; k = 1; } }
        const o = (py * N + px) * 4;
        d[o] = Math.min(255, col[0] * k); d[o + 1] = Math.min(255, col[1] * k); d[o + 2] = Math.min(255, col[2] * k); d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // flache Dinge direkt auf den Boden, hohe Dinge als Objekte (werden mit den Figuren nach Tiefe sortiert)
    const objs = [];
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const wx = x0 + tx, wy = y0 + ty, t = tileAt(wx, wy), o = objAt(wx, wy, t), b = TB;
      if (!o) continue;
      const px = tx * TP, py = ty * TP, r = h2(wx, wy, SEED + 90);
      if (o === 4) drawFlowers(g, px, py, wx, wy, b);
      else if (o === 5) drawTuft(g, px, py, wx, wy, t, b);
      else if (o === 18) { // Knochen
        const a = px + 3 + Math.floor(r * 6), c = py + 6 + Math.floor(h2(wx, wy, 7) * 5);
        R(g, a, c + 2, 8, 1, '#e8e0cc'); R(g, a - 1, c + 1, 2, 3, '#f4eedd'); R(g, a + 7, c + 1, 2, 3, '#f4eedd');
        if (r > 0.5) { R(g, a + 2, c - 4, 5, 4, '#f4eedd'); R(g, a + 3, c - 3, 1, 1, '#2a2020'); R(g, a + 5, c - 3, 1, 1, '#2a2020'); }
      } else if (o === 19) { // kleine Pilze
        for (let i = 0; i < 3; i++) { const a = px + 2 + Math.floor(h2(wx, wy, 30 + i) * 11), c = py + 4 + Math.floor(h2(wx, wy, 40 + i) * 9), col = h2(wx, wy, 50 + i) < 0.5 ? '#c94ad0' : '#4ad0e0'; R(g, a + 1, c + 1, 1, 2, '#e8dcc6'); R(g, a, c, 3, 1, col); }
      } else if (o === 20) { // Schneeflecken
        for (let i = 0; i < 4; i++) { const a = px + 1 + Math.floor(h2(wx, wy, 60 + i) * 13), c = py + 1 + Math.floor(h2(wx, wy, 70 + i) * 13); R(g, a, c, 2, 1, '#ffffff'); R(g, a + 1, c + 1, 1, 1, '#b8d0e8'); }
      } else objs.push({ k: o, v: objVar(o, r, t), x: wx + 0.5 + Math.round((r - 0.5) * 4) / 16, y: wy + 0.8, tx: wx, ty: wy });
    }
    return { ground, objs };
  }
  const objVar = (o, r, t) => (o === 1 ? (t === FOREST ? (r < 0.5 ? 2 : 0) : (r < 0.35 ? 1 : 0)) : Math.min(SPR[o].length - 1, Math.floor(r * SPR[o].length)));
  function drawFlowers(g, x, y, wx, wy, b) {
    const cols = b === DSCHUNGEL ? ['#ff4a8a', '#ffa020', '#ff6040', '#f4e04d'] : b === PILZ ? ['#4ad0e0', '#f0a0ff', '#ffffff', '#c94ad0'] : ['#f4e04d', '#ffffff', '#e86a8a', '#b77de0'];
    for (let i = 0; i < 4; i++) {
      const a = h2(wx, wy, SEED + 100 + i), b = h2(wx, wy, SEED + 110 + i), fx = x + 2 + Math.floor(a * 12), fy = y + 2 + Math.floor(b * 12);
      R(g, fx, fy + 1, 1, 2, '#3a7d2c'); R(g, fx - 1, fy, 3, 1, cols[Math.floor(h2(wx, wy, SEED + 120) * 4)]); R(g, fx, fy - 1, 1, 3, cols[Math.floor(h2(wx, wy, SEED + 120) * 4)]); R(g, fx, fy, 1, 1, '#f4c430');
    }
  }
  function drawTuft(g, x, y, wx, wy, t, b) {
    const c = b ? BPAL[b].tuft : t === FOREST ? '#3a7d2c' : '#4f9a3c', c2 = b ? shadeHex(BPAL[b].tuft, 1.25) : t === FOREST ? '#5aa04a' : '#7cc461';
    for (let i = 0; i < 3; i++) { const a = Math.floor(h2(wx, wy, SEED + 130 + i) * 12) + 2, b = Math.floor(h2(wx, wy, SEED + 140 + i) * 10) + 3; R(g, x + a, y + b, 1, 3, c); R(g, x + a, y + b, 1, 1, c2); R(g, x + a - 1, y + b + 1, 1, 2, c); R(g, x + a + 1, y + b + 1, 1, 2, c); }
  }
  function chunk(kx, ky) {
    const k = kx + ',' + ky;
    let c = chunks.get(k);
    if (c) { chunks.delete(k); chunks.set(k, c); return c; }
    c = bakeChunk(kx, ky); chunks.set(k, c);
    if (chunks.size > 48) chunks.delete(chunks.keys().next().value);
    return c;
  }

  /* ---------- Kristallhöhle ---------- */
  let cave = null;
  const caves = new Map();
  const START_CAVE = { key: 'start', idx: 0, seed: SEED, b: -1, name: 'Kristallhöhle', boss: 'troll', foes: ['slime', 'bigslime'], fly: 'bat' };
  let caveSpec = START_CAVE;
  const CAVE_NAME = { 1: 'Sandgrube', 2: 'Eishöhle', 3: 'Dschungeltempel', 4: 'Vulkanschlund', 5: 'Pilzgrotte' };
  const CAVE_BOSS = { 1: 'sandwurm', 2: 'frostwyrm', 3: 'riesenfrosch', 4: 'feuerdrache', 5: 'sporenkoenigin' };
  const CAVE_FLY = { 1: 'bat', 2: 'bat', 3: 'bat', 4: 'bat', 5: 'moth' };
  // Höhle auf einer großen Insel einer Inselart (nicht auf Wiesen-Inseln)
  function islandCave(isl) {
    if (!isl || isl.cave !== undefined) return isl ? isl.cave : null;
    isl.cave = null;
    if (!isl.b || isl.town || isl.home || isl.r < 20 || isl.cx == null) return null;
    const keepE = EB, keepT = TB;
    for (let r = 3; r < isl.r * 0.7 && !isl.cave; r += 1.5) for (let i = 0; i < 16 && !isl.cave; i++) {
      const a = i / 16 * Math.PI * 2 + h2(isl.cx, isl.cy, 77), tx = Math.round(isl.x + Math.cos(a) * r), ty = Math.round(isl.y + Math.sin(a) * r);
      let ok = true;
      for (let dy = -4; dy <= 2 && ok; dy++) for (let dx = -3; dx <= 3 && ok; dx++) { const t = tileAt(tx + dx, ty + dy); if (t < GRASS || t === LAVA) ok = false; }
      if (ok) isl.cave = { key: 'c' + isl.cx + ',' + isl.cy, idx: 1 + ((Math.imul(isl.cx, 73856093) ^ Math.imul(isl.cy, 19349663)) >>> 0) % 900, seed: SEED + isl.cx * 1013 + isl.cy * 7919, b: isl.b, name: CAVE_NAME[isl.b], boss: CAVE_BOSS[isl.b], foes: BIOMES[isl.b].foes.filter(f => f !== 'golem'), fly: CAVE_FLY[isl.b], ent: { tx, ty, x: tx + 0.5, y: ty + 0.9 } };
    }
    EB = keepE; TB = keepT;
    return isl.cave;
  }
  // alle Höhleneingänge in der Nähe einer Stelle
  function entsNear(x, y) {
    const out = [{ spec: START_CAVE, e: caveEnt() }];
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const c = islandCave(island(cx + i, cy + j)); if (c) out.push({ spec: c, e: c.ent }); }
    return out;
  }
  const CPAL = { [-1]: [[98, 84, 86], [104, 86, 82], [20, 16, 26]], 1: [[150, 118, 78], [140, 100, 60], [40, 28, 18]], 2: [[140, 160, 182], [100, 130, 160], [22, 30, 48]], 3: [[74, 96, 62], [70, 90, 60], [14, 24, 14]], 4: [[72, 54, 52], [96, 54, 42], [22, 10, 10]], 5: [[96, 76, 120], [90, 70, 120], [26, 14, 36]] };
  function buildCave(spec = caveSpec) {
    if (caves.has(spec.key)) return (cave = caves.get(spec.key));
    let g = new Uint8Array(CW * CHH);
    const I = (x, y) => y * CW + x, border = (x, y) => x < 2 || y < 2 || x >= CW - 2 || y >= CHH - 2;
    for (let y = 0; y < CHH; y++) for (let x = 0; x < CW; x++) g[I(x, y)] = border(x, y) || h2(x, y, spec.seed + 300) < 0.46 ? 1 : 0;
    for (let it = 0; it < 5; it++) {
      const n = new Uint8Array(g);
      for (let y = 1; y < CHH - 1; y++) for (let x = 1; x < CW - 1; x++) {
        if (border(x, y)) continue;
        let w = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && g[I(x + i, y + j)]) w++;
        n[I(x, y)] = w > 4 ? 1 : w < 4 ? 0 : g[I(x, y)];
      }
      g = n;
    }
    const EX = 48, EY = CHH - 3;
    for (let y = CHH - 16; y < CHH; y++) for (let x = EX - 2; x <= EX + 2; x++) g[I(x, y)] = 0;
    // Bereiche verbinden, damit alles erreichbar ist
    const label = () => {
      const L = new Int32Array(CW * CHH).fill(-1), sizes = []; let n = 0;
      for (let s = 0; s < CW * CHH; s++) {
        if (g[s] || L[s] >= 0) continue;
        const q = [s]; L[s] = n; let c = 0;
        while (q.length) { const p = q.pop(); c++; const x = p % CW, y = (p / CW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = I(nx, ny); if (nx >= 0 && ny >= 0 && nx < CW && ny < CHH && !g[j] && L[j] < 0) { L[j] = n; q.push(j); } } }
        sizes.push(c); n++;
      }
      return [L, sizes];
    };
    let [L, sizes] = label();
    const main = L[I(EX, EY - 1)];
    const mainCells = []; for (let s = 0; s < CW * CHH; s++) if (L[s] === main) mainCells.push(s);
    for (let r = 0; r < sizes.length; r++) {
      if (r === main || sizes[r] < 18) continue;
      const s = L.indexOf(r), sx = s % CW, sy = (s / CW) | 0;
      let best = 0, bd = 1e9; for (const m of mainCells) { const d = Math.abs(m % CW - sx) + Math.abs(((m / CW) | 0) - sy); if (d < bd) { bd = d; best = m; } }
      const tx = best % CW, ty = (best / CW) | 0;
      for (let x = Math.min(sx, tx); x <= Math.max(sx, tx); x++) { g[I(x, sy)] = 0; if (sy + 1 < CHH - 2) g[I(x, sy + 1)] = 0; }
      for (let y = Math.min(sy, ty); y <= Math.max(sy, ty); y++) { g[I(tx, y)] = 0; if (tx + 1 < CW - 2) g[I(tx + 1, y)] = 0; }
    }
    [L] = label();
    const m2 = L[I(EX, EY - 1)];
    for (let s = 0; s < CW * CHH; s++) if (!g[s] && L[s] !== m2) g[s] = 1;
    // einzelne Wandpixel ohne Halt entfernen, die sehen komisch aus
    for (let y = 2; y < CHH - 2; y++) for (let x = 2; x < CW - 2; x++) if (g[I(x, y)] && !g[I(x, y - 1)] && !g[I(x, y + 1)]) g[I(x, y)] = 0;
    // Entfernung vom Eingang
    const dist = new Int16Array(CW * CHH).fill(-1), q = [I(EX, EY - 1)]; dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) { const p = q[h], x = p % CW, y = (p / CW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); if (!g[j] && dist[j] < 0) { dist[j] = dist[p] + 1; q.push(j); } } }
    const floor = []; for (let s = 0; s < CW * CHH; s++) if (dist[s] >= 0) floor.push(s);
    const wallsAround = s => { let w = 0; const x = s % CW, y = (s / CW) | 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && g[I(x + i, y + j)]) w++; return w; };
    const pick = (list, n, space) => { const out = []; for (const s of list) { if (out.length >= n) break; const x = s % CW, y = (s / CW) | 0; if (out.every(o => Math.hypot(o[0] - x, o[1] - y) >= space)) out.push([x, y]); } return out; };
    const byHash = seed => floor.slice().sort((a, b) => h2(a, 0, seed) - h2(b, 0, seed));
    const far = floor.filter(s => ((s / CW) | 0) < CHH - 14).reduce((a, s) => (dist[s] > dist[a] ? s : a), floor[0]);
    const boss = [far % CW + 0.5, ((far / CW) | 0) + 0.5];
    const slimes = pick(byHash(310).filter(s => dist[s] > 12 && Math.hypot(s % CW - boss[0], ((s / CW) | 0) - boss[1]) > 9 && wallsAround(s) < 3), 18, 4);
    const bats = pick(byHash(311).filter(s => dist[s] > 24 && wallsAround(s) < 2), 9, 6);
    const chests = pick(floor.filter(s => dist[s] > 18 && wallsAround(s) >= 5).sort((a, b) => dist[b] - dist[a]), 5, 12);
    // Kristalle und Fackeln an den Wänden
    const crystals = [], torches = [], shrooms = [];
    for (let y = 2; y < CHH - 2; y++) for (let x = 2; x < CW - 2; x++) {
      const s = I(x, y);
      if (g[s] && !g[I(x, y + 1)]) { // Wandfront
        const d = dist[I(x, y + 1)], r = h2(x, y, 320);
        if (d >= 0 && d < 34 && r < 0.12 && torches.every(t => Math.hypot(t[0] - x, t[1] - y) > 6)) torches.push([x + 0.5, y + 0.55]);
        else if (r > 0.94) crystals.push([x + 0.5, y + 0.6, h2(x, y, 321) < 0.5 ? 0 : 1]);
      } else if (!g[s] && dist[s] > 6 && h2(x, y, 322) < 0.025) shrooms.push([x, y, h2(x, y, 323) < 0.35 ? 1 : 0]);
    }
    cave = { g, dist, EX, EY, boss, slimes, bats, chests, crystals, torches, shrooms, seen: new Uint8Array(CW * CHH), spec };
    cave.canvas = bakeCave(cave, spec.b);
    caves.set(spec.key, cave);
    return cave;
  }
  const caveCell = (x, y) => (x < 0 || y < 0 || x >= CW || y >= CHH ? 1 : cave.g[y * CW + x]);
  const caveFree = (x, y, r = 0.28) => !caveCell(Math.floor(x - r), Math.floor(y - 0.15)) && !caveCell(Math.floor(x + r), Math.floor(y - 0.15)) && !caveCell(Math.floor(x - r), Math.floor(y + 0.12)) && !caveCell(Math.floor(x + r), Math.floor(y + 0.12));
  function bakeCave(C, bio) {
    const [F0, B0, T0] = CPAL[bio] || CPAL[-1];
    const W2 = CW * TP, H2 = CHH * TP, [cv2, g] = mk(W2, H2), img = g.createImageData(W2, H2), d = img.data;
    const wall = (x, y) => caveCell(x, y);
    for (let ty = 0; ty < CHH; ty++) for (let tx = 0; tx < CW; tx++) {
      const isW = wall(tx, ty), face = isW && !wall(tx, ty + 1);
      const wN = wall(tx, ty - 1), wS = wall(tx, ty + 1), wW = wall(tx - 1, ty), wE = wall(tx + 1, ty);
      for (let py = 0; py < TP; py++) for (let px = 0; px < TP; px++) {
        const wx = tx * TP + px, wy = ty * TP + py, nz = h2(wx, wy, SEED + 330);
        let r, gg, b;
        if (!isW) {
          const v = vn(wx / 7, wy / 7, SEED + 331);
          r = F0[0] + v * 22; gg = F0[1] + v * 18; b = F0[2] + v * 18;
          let k = 0.92 + nz * 0.14;
          if (wN && py < 6) k *= 0.55 + py * 0.075; if (wW && px < 4) k *= 0.7 + px * 0.075; if (wE && px > 11) k *= 0.7 + (15 - px) * 0.075; if (wS && py > 13) k *= 0.85;
          if (nz < 0.012) k *= 1.35;
          if ((Math.floor(wx / 3) + Math.floor(wy / 5)) % 23 === 0 && nz < 0.4) k *= 0.82;
          r *= k; gg *= k; b *= k;
        } else if (face && py >= 5) {
          const row = Math.floor((py - 5) / 4), mort = (py - 5) % 4 === 0 || (px + (row % 2) * 5) % 9 === 0;
          const v = 0.85 + h2(Math.floor((px + (row % 2) * 5) / 9) + tx * 3, row + ty * 5, SEED + 332) * 0.3;
          r = B0[0] * v; gg = B0[1] * v; b = B0[2] * v;
          if (mort) { r *= 0.62; gg *= 0.62; b *= 0.62; }
          if (py >= 14) { r *= 0.7; gg *= 0.7; b *= 0.7; }
          if (py === 5) { r = B0[0] * 1.27; gg = B0[1] * 1.35; b = B0[2] * 1.37; }
          r *= 0.92 + nz * 0.12; gg *= 0.92 + nz * 0.12; b *= 0.92 + nz * 0.12;
        } else {
          const v = vn(wx / 5, wy / 5, SEED + 333);
          r = T0[0] + v * 10; gg = T0[1] + v * 8; b = T0[2] + v * 10;
          const rim = (!wW && px < 2) || (!wE && px > 13) || (!wN && py < 2) || (face && py >= 3);
          if (rim) { r += 38; gg += 32; b += 38; }
          if (nz < 0.03) { r += 14; gg += 12; b += 16; }
        }
        const o = (wy * W2 + wx) * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    for (const [x, y, k] of C.crystals) {
      const cx = x * TP, cy = y * TP, col = bio === 4 ? ['#ff6a1a', '#ffb050', '#fff0c0'] : bio === 1 ? ['#e0a030', '#f4d070', '#fff4d0'] : k ? ['#7a5cff', '#b9a6ff', '#e6deff'] : ['#25b8d8', '#7fe3f5', '#e0fbff'];
      for (const [ox, h, w] of [[-4, 7, 3], [0, 10, 3], [4, 6, 2]]) { R(g, cx + ox, cy - h + 4, w, h, col[0]); R(g, cx + ox, cy - h + 4, 1, h, col[1]); R(g, cx + ox, cy - h + 4, w, 1, col[2]); }
    }
    for (const [x, y] of C.torches) { const cx = x * TP, cy = y * TP; R(g, cx - 1, cy - 1, 3, 7, '#5a3a22'); R(g, cx - 2, cy - 2, 5, 2, '#3a3036'); }
    for (const [x, y, k] of C.shrooms) {
      const bx = x * TP + 3 + Math.floor(h2(x, y, 324) * 8), by = y * TP + 6 + Math.floor(h2(x, y, 325) * 6), cap = k ? '#3fd0c8' : '#c94a3a';
      R(g, bx + 1, by + 2, 2, 3, '#e8dcc6'); R(g, bx - 1, by, 6, 2, cap); R(g, bx, by - 1, 4, 1, cap); R(g, bx + 1, by, 1, 1, '#fff');
    }
    // Ausgang mit Tageslicht
    const ex = C.EX * TP + 8, ey = CHH * TP;
    const grd = g.createLinearGradient(0, ey - 64, 0, ey); grd.addColorStop(0, 'rgba(255,240,190,0)'); grd.addColorStop(1, 'rgba(255,240,190,.6)');
    g.fillStyle = grd; g.fillRect(ex - 40, ey - 64, 80, 64);
    return cv2;
  }

  /* ---------- Wind ---------- */
  function wind(t) {
    t = t ?? Date.now() / 1000;
    const a = 0.8 + Math.sin(t / 97) * 1.1 + Math.sin(t / 31 + 1) * 0.35;
    const s = 0.72 + 0.28 * Math.sin(t / 53 + 2);
    return { a, s };
  }
  const POLAR = [[0, 0.6], [0.9, 0.85], [1.6, 1], [2.2, 0.72], [2.55, 0.14], [Math.PI, 0.05]];
  const POLAR2 = [[0, 0.6], [0.9, 0.85], [1.6, 1], [2.2, 0.8], [2.6, 0.5], [Math.PI, 0.25]];
  function polar(rel, good) {
    rel = Math.abs(rel);
    if (good) { for (let i = 1; i < POLAR2.length; i++) if (rel <= POLAR2[i][0]) { const [a0, v0] = POLAR2[i - 1], [a1, v1] = POLAR2[i]; return v0 + (v1 - v0) * (rel - a0) / (a1 - a0); } return 0.25; }
    for (let i = 1; i < POLAR.length; i++) if (rel <= POLAR[i][0]) { const [a0, v0] = POLAR[i - 1], [a1, v1] = POLAR[i]; return v0 + (v1 - v0) * (rel - a0) / (a1 - a0); }
    return 0.05;
  }
  const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const DIRN = ['Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten', 'Norden', 'Nordosten'];
  const dirName = a => DIRN[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];
  // Tag und Nacht: ein Tag dauert 14 Minuten, für alle gleich
  const DAYLEN = 840;
  const dayPhase = () => ((Date.now() / 1000) % DAYLEN) / DAYLEN;
  function darkness() { const p = dayPhase(); return p < 0.6 ? 0 : p < 0.68 ? (p - 0.6) / 0.08 * 0.62 : p < 0.93 ? 0.62 : (1 - p) / 0.07 * 0.62; }
  const isNight = () => darkness() > 0.3;

  /* ---------- Spielzustand ---------- */
  const me = { x: 70.5, y: 70.5, dir: 0, moving: 0, frame: 0, ft: 0, inBoat: 0, inCave: 0, col: 0, name: 'Gast', hp: MAXHP, coins: 0, inv: 0, atk: 0, kx: 0, ky: 0, fx: 0, fy: 1 };
  const boat = { x: 0, y: 0, h: 0, v: 0, sail: 0 };
  const others = new Map();
  const bubbles = new Map();
  const wake = [], parts = [], texts = [], items = [];
  let enemies = [];
  let myId = null, online = 1, lastSent = '', sendT = 0, saveT = 0, open = false, raf = 0, lastT = 0, shake = 0, hurtFlash = 0, regenT = 0, busy = false;
  let cv, ctx, root, hud = {}, S = 3, W = 0, H = 0, DPR = 1, lc, lg;
  const keys = new Set();
  const joy = { on: false, id: null, x0: 0, y0: 0, dx: 0, dy: 0 };
  let chatOpen = false, bigMap = false, mapDirty = true, mapAt = [1e9, 1e9], lastIsle = '';
  const log = [];
  let found = new Set();
  try { found = new Set(JSON.parse(localStorage.getItem('insel.found') || '[]')); } catch {}
  let bag = {};
  try { bag = JSON.parse(localStorage.getItem('insel.bag') || '{}') || {}; } catch {}
  const saveBag = () => { try { localStorage.setItem('insel.bag', JSON.stringify(bag)); } catch {} };
  let caveSaves = {};
  try { const q = JSON.parse(localStorage.getItem('insel.cave') || '{}'); caveSaves = q.boss !== undefined || q.chests ? { start: q } : q; } catch {}
  const cs = () => (caveSaves[caveSpec.key] = caveSaves[caveSpec.key] || { boss: 0, chests: {} });
  const saveCave = () => { try { localStorage.setItem('insel.cave', JSON.stringify(caveSaves)); } catch {} };
  function discover(isl) { if (found.has(isl.name)) return false; found.add(isl.name); try { localStorage.setItem('insel.found', JSON.stringify([...found])); } catch {} return true; }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem('insel.save') || 'null');
      if (s && Number.isFinite(s.x)) {
        Object.assign(me, { x: s.x, y: s.y, inBoat: s.inBoat ? 1 : 0, inCave: s.inCave ? 1 : 0, caveKey: s.caveKey || 'start', col: s.col | 0, coins: s.coins | 0, hp: Math.max(1, Math.min(maxHp(), s.hp ?? maxHp())) });
        Object.assign(boat, s.boat || {}); boat.v = 0;
        return true;
      }
    } catch {}
    me.col = Math.floor(Math.random() * 8);
    return false;
  }
  function save() { saveBag(); try { localStorage.setItem('insel.save', JSON.stringify({ caveKey: me.caveKey, x: me.x, y: me.y, inBoat: me.inBoat, inCave: me.inCave, col: me.col, coins: me.coins, hp: me.hp, boat: { x: boat.x, y: boat.y, h: boat.h, sail: boat.sail } })); } catch {} }
  function spawn() {
    const isl = island(0, 0);
    me.x = isl.x + 0.5; me.y = isl.y + 0.5;
    for (let r = 0; r < 20 && !walkable(me.x, me.y); r++) me.y += 1;
    let f = null;
    for (let r = 1; r < 80 && !f; r++) for (let i = 0; i < 32; i++) {
      const a = i / 32 * Math.PI * 2 + Math.PI / 2, x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r;
      if (sailable(x, y) && sailable(x + 1, y) && sailable(x - 1, y) && sailable(x, y + 1)) { f = [x, y, a]; break; }
    }
    if (f) { boat.x = f[0]; boat.y = f[1]; boat.h = f[2]; }
    const wf = stations()[3]; if (sailable(70.5, wf.wy + 1.6) && sailable(71.5, wf.wy + 1.6) && sailable(69.5, wf.wy + 1.6)) { boat.x = 70.5; boat.y = wf.wy + 1.6; boat.h = 0; }
    boat.sail = 0; boat.v = 0; me.inBoat = 0; me.inCave = 0;
  }
  const stateArr = () => [me.x + (me.inCave ? COX + caveSpec.idx * 1000 : 0), me.y + (me.inCave ? COY : 0), me.dir, me.moving, me.inBoat, boat.x, boat.y, boat.h, boat.sail, me.atk > 0 ? 1 : 0, prog.lvl];

  /* ---------- Oberfläche ---------- */
  const CSS = `
#isl{position:fixed;inset:0;z-index:9000;background:#1b4a84;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
#isl canvas.is-main{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
#isl .is-top{position:absolute;left:10px;top:10px;display:flex;gap:8px;align-items:flex-start;z-index:2}
#isl .is-btn{border:0;border-radius:12px;background:rgba(14,22,40,.72);color:#fff;font:600 15px system-ui;padding:9px 13px;cursor:pointer;backdrop-filter:blur(4px);box-shadow:0 2px 8px rgba(0,0,0,.3)}
#isl .is-btn:hover{background:rgba(30,44,74,.85)}
#isl .is-place{background:rgba(14,22,40,.6);padding:7px 12px;border-radius:12px;font-weight:700;font-size:15px;max-width:46vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#isl .is-place small{display:block;font-weight:500;opacity:.75;font-size:12px}
#isl .is-stats{display:flex;gap:10px;align-items:center;margin-top:4px;font-size:14px}
#isl .is-hearts{letter-spacing:1px;font-size:15px;line-height:1}
#isl .is-hearts .e{color:#4a3a48}#isl .is-hearts .f{color:#ff4d5e;text-shadow:0 0 4px rgba(255,60,80,.6)}
#isl .is-mapwrap{position:absolute;right:10px;top:10px;z-index:2;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
#isl canvas.is-map{width:132px;height:132px;border-radius:50%;border:3px solid rgba(255,255,255,.75);box-shadow:0 3px 12px rgba(0,0,0,.4);cursor:pointer;image-rendering:pixelated;background:#1b4a84}
#isl .is-wind{background:rgba(14,22,40,.6);border-radius:12px;padding:6px 10px;font-size:12.5px;display:flex;gap:8px;align-items:center;line-height:1.25}
#isl .is-wind i{display:inline-block;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.12);position:relative;flex:none}
#isl .is-wind i::after{content:"➤";position:absolute;inset:0;display:grid;place-items:center;font-style:normal;font-size:15px;color:#9fe0ff;transform:rotate(var(--a))}
#isl .is-big{position:absolute;inset:0;z-index:5;background:rgba(6,14,30,.82);display:grid;place-items:center}
#isl .is-big canvas{width:min(92vw,92vh,640px);height:min(92vw,92vh,640px);border-radius:16px;border:3px solid rgba(255,255,255,.7);image-rendering:pixelated}
#isl .is-big b{position:absolute;top:14px;left:0;right:0;text-align:center;font-size:16px}
#isl .is-log{position:absolute;left:10px;bottom:52px;z-index:2;max-width:min(420px,60vw);display:flex;flex-direction:column;gap:3px;pointer-events:none}
#isl .is-log div{background:rgba(14,22,40,.62);padding:4px 9px;border-radius:9px;font-size:13.5px;line-height:1.3;width:fit-content;max-width:100%;overflow-wrap:anywhere;transition:opacity 1s}
#isl .is-log div b{color:#ffd27a}
#isl .is-chat{position:absolute;left:10px;right:10px;bottom:10px;z-index:4;display:none;gap:6px;max-width:520px}
#isl .is-chat input{flex:1;min-width:0;border:0;border-radius:12px;padding:11px 13px;font-size:16px;background:rgba(255,255,255,.95);color:#111}
#isl .is-acts{position:absolute;right:12px;bottom:14px;z-index:2;display:flex;gap:10px;align-items:flex-end}
#isl .is-act{width:58px;height:58px;border-radius:50%;border:0;background:rgba(14,22,40,.72);color:#fff;font-size:24px;display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.35);cursor:pointer;position:relative}
#isl .is-act span{position:absolute;bottom:-17px;left:50%;transform:translateX(-50%);font-size:11px;white-space:nowrap;text-shadow:0 1px 2px #000;font-weight:600}
#isl .is-act.on{background:#e3a92b;color:#2a1608}
#isl .is-act.big{width:72px;height:72px;font-size:30px;background:rgba(150,40,40,.8)}
#isl .is-act[hidden]{display:none}
#isl .is-hint{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;z-index:1;background:rgba(14,22,40,.55);padding:6px 12px;border-radius:10px;font-size:12.5px;white-space:nowrap;pointer-events:none}
#isl .is-joy{position:absolute;z-index:3;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35);pointer-events:none;display:none}
#isl .is-joy i{position:absolute;left:50%;top:50%;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;background:rgba(255,255,255,.55)}
#isl .is-say{position:absolute;left:50%;top:22%;transform:translateX(-50%);z-index:3;background:rgba(14,22,40,.78);padding:10px 16px;border-radius:14px;font-weight:700;font-size:16px;text-align:center;pointer-events:none;transition:opacity .6s;max-width:86vw}
#isl .is-boss{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:2;width:min(360px,52vw);text-align:center;font-weight:800;font-size:14px;text-shadow:0 1px 3px #000;display:none}
#isl .is-boss i{display:block;height:12px;margin-top:4px;border-radius:6px;background:rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.7);overflow:hidden}
#isl .is-boss u{display:block;height:100%;background:linear-gradient(#ff6a5a,#b8261c);transition:width .2s}
#isl .is-bag{position:absolute;inset:0;z-index:6;background:rgba(6,10,24,.6);display:grid;place-items:center;padding:16px}
#isl .is-bagbox{background:#1c2236;border:2px solid rgba(255,255,255,.25);border-radius:16px;padding:14px 16px;width:min(440px,100%);max-height:80vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#isl .is-bagbox h3{margin:0 0 6px;display:flex;justify-content:space-between;align-items:center;font-size:18px}
#isl .is-bagbox p,#isl .is-bagbox small{color:#c8cde0;font-size:13.5px;line-height:1.4}
#isl .is-bagsum{color:#ffd27a;font-weight:700;margin-bottom:10px;font-size:14px}
#isl .is-baggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;margin-bottom:10px}
#isl .is-baggrid div{background:rgba(255,255,255,.07);border-radius:12px;padding:8px 4px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px}
#isl .is-baggrid i{font-style:normal;font-size:24px}#isl .is-baggrid b{font-size:16px}#isl .is-baggrid span{font-size:11.5px;color:#c8cde0}
#isl .is-xp{display:flex;align-items:center;gap:6px;margin-top:5px;cursor:pointer;font-size:12px}
#isl .is-xp b{color:#e0c8ff;white-space:nowrap}
#isl .is-xp i{flex:1;min-width:70px;height:7px;border-radius:4px;background:rgba(0,0,0,.45);overflow:hidden;display:block}
#isl .is-xp u{display:block;height:100%;width:0;background:linear-gradient(90deg,#a66cff,#e0b8ff);transition:width .3s}
#isl .is-xp em,#isl .is-dot{font-style:normal;background:#ffcf4a;color:#2a1608;border-radius:9px;padding:0 6px;font-weight:800;font-size:11px;animation:isPulse 1s infinite alternate}
#isl .is-dot{position:absolute;top:-2px;right:-2px;width:14px;height:14px;padding:0;border:2px solid #1c2236}
#isl .is-dot[hidden],#isl .is-xp em[hidden]{display:none}
@keyframes isPulse{to{transform:scale(1.15)}}
#isl .is-skill{position:absolute;inset:0;z-index:6;background:rgba(6,10,24,.66);display:grid;place-items:center;padding:10px}
#isl .is-skbox{background:#1c2236;border:2px solid rgba(255,255,255,.25);border-radius:16px;padding:12px 14px;width:min(900px,100%);max-height:94vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#isl .is-skbox h3{margin:0 0 2px;display:flex;justify-content:space-between;align-items:center;font-size:18px;gap:8px}
#isl .is-sksum{font-size:13px;color:#c8cde0;margin-bottom:8px}#isl .is-sksum b{color:#ffcf4a}
#isl .is-skwrap{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(200px,1fr);gap:12px;align-items:start}
#isl .is-skt{background:radial-gradient(120% 90% at 50% 80%,#2c2440,#1b1726 70%);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:6px}
#isl .is-tree{width:100%;max-height:62vh;display:block;touch-action:manipulation}
#isl .is-tree line{stroke:#342b47;stroke-width:6;stroke-linecap:round}
#isl .is-tree line.open{stroke:#5b4d73}#isl .is-tree line.on{stroke:var(--bc)}
#isl .is-tree .nd{cursor:pointer}
#isl .is-tree .nd circle:not(.glow),#isl .is-tree .nd polygon{fill:#262035;stroke:#a99fbb;stroke-width:4;transition:stroke .2s}
#isl .is-tree .nd.own circle:not(.glow),#isl .is-tree .nd.own polygon{fill:#3a2f55;stroke:var(--bc)}
#isl .is-tree .nd.full circle:not(.glow),#isl .is-tree .nd.full polygon{fill:#4a3a2a;stroke:#ffcf4a}
#isl .is-tree .nd.start circle{fill:#4a3a2a;stroke:#ffcf4a;stroke-width:5}
#isl .is-tree .nd.key polygon{stroke-width:5}
#isl .is-tree .nd.buy circle:not(.glow),#isl .is-tree .nd.buy polygon{stroke:#4fd18b}
#isl .is-tree .nd.sel circle:not(.glow),#isl .is-tree .nd.sel polygon{stroke:#fff;stroke-width:6}
#isl .is-tree .glow{fill:rgba(79,209,139,.22);stroke:none;animation:isPulse2 1.4s ease-in-out infinite}
@keyframes isPulse2{50%{opacity:.35}}
#isl .is-tree .ic{font-size:30px;text-anchor:middle;dominant-baseline:middle;pointer-events:none}
#isl .is-tree .rk{font:800 17px system-ui;fill:#e8e2f4;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:#1b1726;stroke-width:6px}
#isl .is-tree .q{font:800 30px system-ui;fill:rgba(255,255,255,.16);text-anchor:middle;pointer-events:none}
#isl .is-tree .br{font:800 22px system-ui;opacity:.55}
#isl .is-tree .fresh{animation:isPop .6s cubic-bezier(.3,1.6,.5,1) both}
@keyframes isPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
#isl .is-skinfo{background:rgba(255,255,255,.06);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px;font-size:14px;line-height:1.4}
#isl .is-skinfo b{font-size:17px}#isl .is-skinfo small{color:#c8cde0}#isl .is-skinfo p{margin:0}
#isl .is-skbr{font-weight:800;font-size:12.5px}#isl .is-skhint{color:#c8cde0;font-size:13px}
#isl .is-learn{border:0;border-radius:12px;padding:11px 16px;font:800 15px system-ui;background:#ffcf4a;color:#2a1608;cursor:pointer;margin-top:4px}
#isl .is-learn:disabled{background:#4a4f66;color:#9aa0b8;cursor:default}
#isl .is-skreset{border:0;background:none;color:#9aa0b8;font:500 12px system-ui;text-decoration:underline;cursor:pointer;margin-top:6px;align-self:flex-start;padding:0}
@media (max-width:700px){#isl .is-skwrap{grid-template-columns:1fr}#isl .is-skbox{padding:10px}}
#isl .is-npc{position:absolute;inset:0;z-index:6;background:rgba(6,10,24,.55);display:grid;place-items:center;padding:12px}
#isl .is-npcbox{background:#1c2236;border:2px solid rgba(255,207,74,.45);border-radius:16px;padding:14px;width:min(520px,100%);max-height:86vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#isl .is-npcbox h3{margin:0;display:flex;gap:10px;align-items:center;font-size:17px}
#isl .is-npcbox h3>span:nth-child(2){flex:1;min-width:0;display:flex;flex-direction:column}
#isl .is-npcbox h3 small{font-weight:500;color:#e8d8b8;font-size:13px;font-style:italic;margin-top:2px}
#isl .is-npcav{width:46px;height:46px;border-radius:50%;background:#e8d4a8;display:grid;place-items:center;font-size:24px;flex:none;border:3px solid #5a3a20}
#isl .is-npcmoney{color:#ffd27a;font-weight:800;font-size:14px;margin:10px 0 6px}
#isl .is-npcsub{color:#c8cde0;font-size:13px;margin:4px 0 8px}
#isl .is-npcbox p{font-size:14px;line-height:1.4;color:#d8dcea}
#isl .is-tabs{display:flex;gap:6px;margin-bottom:8px}#isl .is-tabs button{flex:1;border:0;border-radius:10px;padding:8px;font:700 14px system-ui;background:#2a3150;color:#c8cde0;cursor:pointer}#isl .is-tabs button.on{background:#ffcf4a;color:#2a1608}
#isl .is-shop{display:flex;flex-direction:column;gap:6px}
#isl .is-shop>div{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.06);border-radius:10px;padding:7px 9px}
#isl .is-shop i{font-style:normal;font-size:24px;width:32px;text-align:center}#isl .is-shop span{flex:1;min-width:0;display:flex;flex-direction:column}#isl .is-shop small{color:#c8cde0;font-size:12px}
#isl .is-shop button,#isl .is-quests button,#isl .is-ext{border:0;border-radius:9px;padding:7px 11px;font:800 13px system-ui;background:#ffcf4a;color:#2a1608;cursor:pointer;white-space:nowrap}
#isl .is-shop button:disabled,#isl .is-quests button:disabled,#isl .is-ext:disabled{background:#3c4258;color:#9aa0b8;cursor:default}
#isl .is-quests{display:flex;flex-direction:column;gap:7px}
#isl .is-quests>div{background:rgba(255,255,255,.06);border-radius:10px;padding:9px 10px;display:grid;grid-template-columns:1fr auto;gap:3px 10px;align-items:center}
#isl .is-quests>div.ready{border:1px solid rgba(79,209,139,.7)}#isl .is-quests>div.claimed{opacity:.55}
#isl .is-quests small{grid-column:1;color:#c8cde0;font-size:12px}#isl .is-quests i{grid-column:1;height:7px;border-radius:4px;background:rgba(0,0,0,.4);overflow:hidden}#isl .is-quests u{display:block;height:100%;background:#4fd18b}
#isl .is-quests span{grid-column:1;font-size:12px;color:#c8cde0}#isl .is-quests button,#isl .is-quests em{grid-column:2;grid-row:1/span 4;font-style:normal;color:#8ff0a8;font-weight:800;font-size:13px}
#isl .is-build{position:absolute;left:8px;right:8px;bottom:84px;z-index:4;background:rgba(20,26,44,.92);border:2px solid rgba(255,207,74,.5);border-radius:14px;padding:8px;max-width:760px;margin:0 auto}
#isl .is-bhead{display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:6px}#isl .is-bhead span{flex:1;min-width:0;color:#d8dcea}#isl .is-bhead em{font-style:normal;font-weight:800}#isl .is-bhead .ok{color:#8ff0a8}#isl .is-bhead .no{color:#ff8a7a}
#isl .is-bhead button{border:0;border-radius:9px;padding:7px 12px;font:800 13px system-ui;background:#4fd18b;color:#08220f;cursor:pointer}
#isl .is-bpieces{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
#isl .is-bpieces button{flex:none;width:72px;border:2px solid transparent;border-radius:10px;background:#2a3150;color:#fff;font:600 10.5px system-ui;padding:5px 2px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}
#isl .is-bpieces button i{font-style:normal;font-size:20px}#isl .is-bpieces button.on{border-color:#ffcf4a;background:#3a4268}#isl .is-bpieces button.no{opacity:.45}
#isl .is-act.on{background:#e3a92b}
#isl .is-chest{position:absolute;inset:0;z-index:6;background:rgba(6,10,24,.6);display:grid;place-items:center;padding:12px}
#isl .is-chbox{background:#1c2236;border:2px solid rgba(255,255,255,.25);border-radius:16px;padding:14px;width:min(640px,100%);max-height:86vh;overflow:auto}
#isl .is-chbox h3{margin:0;display:flex;justify-content:space-between;align-items:center}
#isl .is-chcols{display:grid;grid-template-columns:1fr 1fr;gap:10px}#isl .is-chcols h4{margin:4px 0 6px;font-size:14px}
#isl .is-chcols>div>div{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.06);border-radius:9px;padding:5px 6px;margin-bottom:4px;font-size:12px}
#isl .is-chcols i{font-style:normal;font-size:18px}#isl .is-chcols span{flex:1;min-width:0;display:flex;justify-content:space-between;gap:4px}
#isl .is-chcols button{border:0;border-radius:7px;padding:4px 6px;font:800 11px system-ui;background:#ffcf4a;color:#2a1608;cursor:pointer}
@media (max-width:600px){#isl .is-build{bottom:76px}#isl .is-chcols{grid-template-columns:1fr}}
#isl .is-craft{position:absolute;inset:0;z-index:6;background:rgba(6,10,24,.62);display:grid;place-items:center;padding:12px}
#isl .is-crbox{background:#1c2236;border:2px solid rgba(255,255,255,.25);border-radius:16px;padding:14px;width:min(520px,100%);max-height:88vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#isl .is-crbox h3{margin:0;display:flex;justify-content:space-between;align-items:center;font-size:19px}
#isl .is-crsub{color:#c8cde0;font-size:13px;margin:2px 0 10px}
#isl .is-crlist{display:flex;flex-direction:column;gap:8px}
#isl .is-rec{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.06);border-radius:12px;padding:9px 10px;border:1px solid transparent}
#isl .is-rec.ok{border-color:rgba(79,209,139,.6)}#isl .is-rec.have{opacity:.7}
#isl .is-rec>i{font-style:normal;font-size:28px;width:38px;text-align:center;flex:none}
#isl .is-rec>div{flex:1;min-width:0}#isl .is-rec b{font-size:15px}#isl .is-rec small{color:#c8cde0}
#isl .is-rec p{margin:1px 0 4px;font-size:12.5px;color:#d8dcea;line-height:1.3}
#isl .is-cost{display:flex;flex-wrap:wrap;gap:4px}
#isl .is-cost span{font-size:12px;font-weight:700;padding:2px 7px;border-radius:8px;background:rgba(0,0,0,.3)}
#isl .is-cost .ok{color:#8ff0a8}#isl .is-cost .no{color:#ff8a7a}
#isl .is-make{border:0;border-radius:10px;padding:9px 12px;font:800 13px system-ui;background:#ffcf4a;color:#2a1608;cursor:pointer;flex:none}
#isl .is-make:disabled{background:#3c4258;color:#9aa0b8;cursor:default}
#isl .is-baggrid .eat{border:1px solid rgba(255,207,74,.4)}
#isl .is-eat{margin-top:3px;border:0;border-radius:8px;background:#ffcf4a;color:#2a1608;font:800 11px system-ui;padding:3px 8px;cursor:pointer}
#isl .is-gear{font-size:13px;color:#e8e2f4;margin:4px 0 8px}
#isl .is-buffs{display:flex;gap:4px}#isl .is-buffs b{font-size:11.5px;background:rgba(255,207,74,.2);border-radius:6px;padding:0 4px}
#isl .is-fade{position:absolute;inset:0;z-index:8;background:#000;opacity:0;pointer-events:none;transition:opacity .35s}
@media (pointer:coarse){#isl .is-hint{display:none}#isl .is-log{bottom:10px}}
@media (max-width:600px){#isl .is-acts{right:8px;gap:6px}#isl .is-act{width:50px;height:50px;font-size:21px}#isl .is-act.big{width:62px;height:62px;font-size:27px}#isl .is-act span{font-size:10px;bottom:-15px}#isl canvas.is-map{width:96px;height:96px}#isl .is-wind{font-size:11.5px}#isl .is-log{bottom:100px;max-width:70vw}#isl .is-boss{top:60px;width:70vw}}
`;
  function build() {
    if (!document.getElementById('isl-css')) { const st = document.createElement('style'); st.id = 'isl-css'; st.textContent = CSS; document.head.appendChild(st); }
    root = document.createElement('div'); root.id = 'isl';
    root.innerHTML = `<canvas class="is-main"></canvas>
<div class="is-top"><button class="is-btn" data-x title="Zurück zum Hub">✕</button><div class="is-place"><span data-isle>Startinsel</span><small data-on>1 Spieler online</small><div class="is-stats"><span class="is-hearts" data-hp></span><span data-coins>🪙 0</span></div><div class="is-xp" data-xpbox title="Skilltree öffnen (K)"><b data-lvl>St. 1</b><i><u data-xp></u></i><em data-pts hidden>!</em></div></div></div>
<div class="is-boss"><span>Höhlentroll</span><i><u></u></i></div>
<div class="is-mapwrap"><canvas class="is-map" width="132" height="132" title="Karte vergrößern (M)"></canvas><div class="is-wind"><i></i><span data-wind></span></div></div>
<div class="is-log"></div>
<div class="is-chat"><input maxlength="120" placeholder="Nachricht an alle …" enterkeyhint="send"><button class="is-btn" data-send>Senden</button></div>
<div class="is-acts"><button class="is-act" data-skill>🌟<span>Skills</span><em class="is-dot" data-dot hidden></em></button><button class="is-act" data-bag>🎒<span>Rucksack</span></button><button class="is-act" data-chat>💬<span>Chat</span></button><button class="is-act" data-sail hidden>⛵<span>Segel</span></button><button class="is-act" data-build hidden>🔨<span>Bauen</span></button><button class="is-act" data-use hidden>🛠️<span>Benutzen</span></button><button class="is-act" data-boat>⚓<span>Boot</span></button><button class="is-act big" data-atk>⚔️<span>Angriff</span></button></div>
<div class="is-hint">WASD laufen · Leertaste/Klick: angreifen und abbauen · E Boot/Werkstatt · I Rucksack · K Skills · T Chat · M Karte</div>
<div class="is-joy"><i></i></div>
<div class="is-say" style="opacity:0"></div><div class="is-fade"></div>`;
    document.body.appendChild(root);
    cv = root.querySelector('canvas.is-main'); ctx = cv.getContext('2d');
    [lc, lg] = mk(8, 8);
    hud = {
      isle: root.querySelector('[data-isle]'), on: root.querySelector('[data-on]'), wind: root.querySelector('[data-wind]'), windBox: root.querySelector('.is-wind'), arrow: root.querySelector('.is-wind i'),
      map: root.querySelector('canvas.is-map'), log: root.querySelector('.is-log'), chat: root.querySelector('.is-chat'), input: root.querySelector('.is-chat input'),
      sail: root.querySelector('[data-sail]'), boat: root.querySelector('[data-boat]'), atk: root.querySelector('[data-atk]'), joy: root.querySelector('.is-joy'), say: root.querySelector('.is-say'),
      hp: root.querySelector('[data-hp]'), coins: root.querySelector('[data-coins]'), boss: root.querySelector('.is-boss'), bossBar: root.querySelector('.is-boss u'), fade: root.querySelector('.is-fade'),
    };
    root.querySelector('[data-x]').onclick = close;
    hud.boat.onclick = toggleBoat;
    hud.sail.onclick = toggleSail;
    hud.atk.addEventListener('pointerdown', e => { e.preventDefault(); attack(); });
    root.querySelector('[data-chat]').onclick = () => openChat();
    root.querySelector('[data-send]').onclick = sendChat;
    hud.input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') sendChat(); else if (e.key === 'Escape') closeChat(); });
    hud.map.onclick = () => toggleMap();
    root.querySelector('[data-bag]').onclick = () => toggleBag();
    root.querySelector('[data-skill]').onclick = () => toggleSkills();
    hud.use = root.querySelector('[data-use]'); hud.use.onclick = () => interact();
    hud.build = root.querySelector('[data-build]'); hud.build.onclick = () => toggleBuild();
    hud.buffs = document.createElement('span'); hud.buffs.className = 'is-buffs'; root.querySelector('.is-stats').appendChild(hud.buffs);
    root.querySelector('[data-xpbox]').onclick = () => toggleSkills();
    Object.assign(hud, { lvl: root.querySelector('[data-lvl]'), xp: root.querySelector('[data-xp]'), pts: root.querySelector('[data-pts]'), dot: root.querySelector('[data-dot]') });
    cv.addEventListener('pointerdown', joyDown);
    window.addEventListener('pointermove', joyMove);
    window.addEventListener('pointerup', joyUp);
    window.addEventListener('pointercancel', joyUp);
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    W = Math.round(root.clientWidth * DPR); H = Math.round(root.clientHeight * DPR);
    cv.width = W; cv.height = H;
    S = Math.max(2, Math.round(Math.min(W, H) / (TP * 13)));
    lc.width = Math.ceil(W / 4); lc.height = Math.ceil(H / 4);
    ctx.imageSmoothingEnabled = false;
  }
  function say(t) { hud.say.textContent = t; hud.say.style.opacity = 1; clearTimeout(say.t); say.t = setTimeout(() => (hud.say.style.opacity = 0), 2800); }
  function addLog(html) {
    log.push({ html, t: Date.now() }); if (log.length > 4) log.shift();
    hud.log.innerHTML = log.map(l => `<div>${l.html}</div>`).join('');
  }
  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function openChat() { chatOpen = true; hud.chat.style.display = 'flex'; hud.input.value = ''; hud.input.focus(); keys.clear(); }
  function closeChat() { chatOpen = false; hud.chat.style.display = 'none'; hud.input.blur(); }
  function sendChat() { const m = hud.input.value.trim(); closeChat(); if (m && typeof send === 'function') send({ t: 'i_chat', m }); }
  function toggleMap() {
    bigMap = !bigMap;
    const old = root.querySelector('.is-big'); if (old) old.remove();
    if (!bigMap) return;
    const d = document.createElement('div'); d.className = 'is-big';
    d.innerHTML = me.inCave ? '<b>Kristallhöhle · tippen zum Schließen</b><canvas width="288" height="216" style="height:auto;aspect-ratio:4/3"></canvas>' : `<b>Karte · ${found.size} Inseln entdeckt · tippen zum Schließen</b><canvas width="320" height="320"></canvas>`;
    root.appendChild(d); d.onclick = () => toggleMap();
    if (me.inCave) drawCaveMap(d.querySelector('canvas'), true); else drawMap(d.querySelector('canvas'), gear('fernrohr') ? 700 : 420, true);
  }
  function gainXP(n, x, y) {
    if (sk('gold')) n = Math.round(n * 1.25);
    prog.xp += n;
    texts.push({ x, y, s: '+' + n + ' EP', t: 0, col: '#d8b8ff' });
    while (prog.xp >= xpNeed(prog.lvl)) {
      prog.xp -= xpNeed(prog.lvl); prog.lvl++; prog.pts++;
      say(`🌟 Stufe ${prog.lvl}! Du hast einen Skillpunkt bekommen (K)`);
      addLog(`<b>Stufe ${prog.lvl} erreicht!</b> Öffne mit 🌟 den Skilltree.`);
      for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, s2 = 2 + Math.random() * 4; parts.push({ x: me.x, y: me.y - 0.6, z: 0, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2, t: 0, life: 0.9, col: i % 2 ? '#ffd27a' : '#e0b8ff', sz: 2 }); }
      me.hp = maxHp();
    }
    saveProg();
    if (skillOpen) renderSkills();
  }
  let skillOpen = false, skSel = null, skSeen = new Set();
  const skVisible = s => s.id === 'start' || sk(s.id) > 0 || s.p.some(q => sk(q) > 0);
  const skAvail = s => s.id !== 'start' && s.p.some(q => sk(q) > 0);
  function toggleSkills() {
    skillOpen = !skillOpen;
    const old = root.querySelector('.is-skill'); if (old) old.remove();
    if (!skillOpen) return;
    if (bagOpen) toggleBag();
    const d = document.createElement('div'); d.className = 'is-skill';
    root.appendChild(d);
    skSeen = new Set(SKILLS.filter(skVisible).map(s => s.id));
    d.onclick = e => {
      if (e.target === d || e.target.closest('[data-close]')) { toggleSkills(); return; }
      const n = e.target.closest('[data-sk]'); if (n) { skSel = n.dataset.sk; renderSkills(); return; }
      if (e.target.closest('[data-learn]')) {
        const s = SKILL[skSel];
        if (s && prog.pts > 0 && skAvail(s) && sk(s.id) < s.max) {
          prog.sk[s.id] = sk(s.id) + 1; prog.pts--; saveProg();
          if (s.id === 'zaeh') me.hp = Math.min(maxHp(), me.hp + 2);
          mapDirty = true; say(`${s.i} ${s.n} gelernt!`);
          renderSkills(true);
        }
        return;
      }
      if (e.target.closest('[data-reset]')) {
        const spent = Object.values(prog.sk).reduce((a, b) => a + b, 0);
        if (!spent) return;
        prog.pts += spent; prog.sk = {}; me.hp = Math.min(me.hp, maxHp()); saveProg(); skSel = 'start'; skSeen = new Set(SKILLS.filter(skVisible).map(s => s.id)); renderSkills(); say('Skillpunkte zurückgesetzt');
      }
    };
    if (!skSel || !skVisible(SKILL[skSel])) skSel = (SKILLS.find(s => skAvail(s) && sk(s.id) < s.max) || SKILLS[0]).id;
    renderSkills();
  }
  // Baum als Grafik: Linien zuerst, dann die Punkte. Unbekannte Fähigkeiten bleiben unsichtbar, bis ein Punkt davor gelernt ist.
  function treeSVG(reveal) {
    const vis = SKILLS.filter(skVisible), visIds = new Set(vis.map(s => s.id));
    // Ausschnitt passt sich an: am Anfang groß und nah, später wächst der Baum
    const shown = SKILLS.filter(s => visIds.has(s.id) || s.p.some(q => visIds.has(q)));
    let x0 = Math.min(-1.6, ...shown.map(s => s.x)) - 0.75, x1 = Math.max(1.6, ...shown.map(s => s.x)) + 0.75, y0 = Math.min(-1.6, ...shown.map(s => s.y)) - 0.85, y1 = Math.max(0.9, ...shown.map(s => s.y)) + 0.75;
    const U = 92, X0 = x0, Y0 = y0, Wv = (x1 - x0) * U, Hv = (y1 - y0) * U, P = s => [(s.x - X0) * U, (s.y - Y0) * U];
    let lines = '', nodes = '', labels = '';
    for (const [b, [ic, name, col]] of Object.entries(BRANCHES)) {
      const [x, y] = b === 'k' ? [0.2 * U, Hv - 0.22 * U] : b === 's' ? [Wv - 0.2 * U, Hv - 0.22 * U] : [-X0 * U, 0.32 * U];
      labels += `<text class="br" x="${x}" y="${y}" text-anchor="${b === 'k' ? 'start' : b === 's' ? 'end' : 'middle'}" fill="${col}">${ic} ${name}</text>`;
    }
    for (const s of vis) for (const q of s.p || []) {
      if (!visIds.has(q)) continue;
      const [x1, y1] = P(SKILL[q]), [x2, y2] = P(s), on = sk(q) > 0 && sk(s.id) > 0, open = sk(q) > 0;
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${on ? 'on' : open ? 'open' : ''}" style="--bc:${s.b ? BRANCHES[s.b][2] : '#ffcf4a'}"/>`;
    }
    for (const s of vis) {
      const [x, y] = P(s), r = sk(s.id), av = skAvail(s), can = av && r < s.max && prog.pts > 0, col = s.b ? BRANCHES[s.b][2] : '#ffcf4a';
      const fresh = reveal && !skSeen.has(s.id);
      const cls = ['nd', s.key ? 'key' : '', s.id === 'start' ? 'start' : '', r ? 'own' : 'av', r >= s.max && s.max ? 'full' : '', can ? 'buy' : '', skSel === s.id ? 'sel' : '', fresh ? 'fresh' : ''].join(' ');
      const R2 = s.key ? 36 : s.id === 'start' ? 38 : 30;
      const shape = s.key ? `<polygon points="${x},${y - R2} ${x + R2},${y} ${x},${y + R2} ${x - R2},${y}"/>` : `<circle cx="${x}" cy="${y}" r="${R2}"/>`;
      nodes += `<g class="${cls}" data-sk="${s.id}" style="--bc:${col};transform-origin:${x}px ${y}px">${can ? `<circle cx="${x}" cy="${y}" r="${R2 + 10}" class="glow"/>` : ''}${shape}<text x="${x}" y="${y + 2}" class="ic">${s.i}</text>${s.max > 1 || (s.max && !s.key) ? `<text x="${x}" y="${y + R2 + 20}" class="rk">${r}/${s.max}</text>` : ''}</g>`;
    }
    // Andeutung: hinter bekannten Fähigkeiten geht es weiter
    let hints = '';
    for (const s of SKILLS) if (!visIds.has(s.id) && s.p.some(q => visIds.has(q))) { const [x, y] = P(s); hints += `<text x="${x}" y="${y + 8}" class="q">?</text>`; }
    for (const s of vis) skSeen.add(s.id);
    return `<svg class="is-tree" viewBox="0 0 ${Wv} ${Hv}">${labels}${lines}${hints}${nodes}</svg>`;
  }
  function renderSkills(reveal) {
    const d = root.querySelector('.is-skill'); if (!d) return;
    const need = xpNeed(prog.lvl), sel = SKILL[skSel] || SKILLS[0];
    const r = sk(sel.id), av = skAvail(sel), isStart = sel.id === 'start';
    const why = isStart ? '' : r >= sel.max ? 'Voll ausgebaut' : !av ? 'Noch gesperrt' : !prog.pts ? 'Kein Skillpunkt frei' : 'Lernen (1 Punkt)';
    const br = sel.b ? BRANCHES[sel.b] : null;
    d.innerHTML = `<div class="is-skbox"><h3>🌟 Skilltree <button class="is-btn" data-close>✕</button></h3>
      <div class="is-sksum">Stufe <b>${prog.lvl}</b> · ${prog.xp} / ${need} EP · <b>${prog.pts}</b> Skillpunkt${prog.pts === 1 ? '' : 'e'} frei</div>
      <div class="is-skwrap"><div class="is-skt">${treeSVG(reveal)}</div>
      <div class="is-skinfo">${br ? `<span class="is-skbr" style="color:${br[2]}">${br[0]} ${br[1]}${sel.key ? ' · Schlüssel-Fähigkeit' : ''}</span>` : ''}<b>${sel.i} ${sel.n}</b>${sel.max ? `<small>Stufe ${r} von ${sel.max}</small>` : ''}<p>${sel.d}</p>
        ${isStart ? `<p class="is-skhint">EP gibt es für Gegner, Abbauen, Schatztruhen und neue Inseln. Jede neue Stufe bringt einen Skillpunkt.</p>` : `<button class="is-learn" data-learn ${r >= sel.max || !av || !prog.pts ? 'disabled' : ''}>${why}</button>`}
        <button class="is-skreset" data-reset>Alle Punkte zurücksetzen (kostenlos)</button></div></div></div>`;
  }
  let nearSt = null, craftOpen = null;
  /* ---------- Dorfbewohner: Händler, Aufträge ---------- */
  const PRICE = { wuestenperle: 25, frostherz: 25, giftdruese: 25, drachenschuppe: 30, koenigsspore: 25, weizen: 2, karotte: 3, kuerbis: 6, ei: 3, wolle: 5, brot: 6, ruehrei: 10, karottensuppe: 10, kuerbiskuchen: 14, holz: 1, stein: 1, faser: 1, beere: 1, apfel: 2, kokos: 3, banane: 3, kaktus: 3, pilz: 3, eis: 3, glibber: 2, stachel: 5, fell: 5, glut: 6, sporen: 4, obsidian: 8, eiskristall: 12, saft: 3, kuchen: 8, suppe: 6, shake: 8, elixier: 8 };
  const SHOP = [['saft', 15], ['kuchen', 40], ['fell', 22], ['stachel', 22], ['glut', 30], ['sporen', 18], ['obsidian', 38], ['eiskristall', 48]];
  const FOE_NAME = { slime: 'Schleime', sandslime: 'Sandschleime', frostslime: 'Frostschleime', fireslime: 'Feuerschleime', frog: 'Giftfrösche', sporling: 'Sporlinge', bat: 'Fledermäuse', moth: 'Glühfalter', scorpion: 'Skorpione', wolf: 'Eiswölfe' };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function quests() {
    if (prog.q && prog.q.day === today()) return prog.q.list;
    const day = today(), seed = [...(day + me.name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7), R = i => h2(seed, i, 990);
    const list = [], used = new Set();
    for (let i = 0; list.length < 3 && i < 30; i++) {
      const ty = ['collect', 'kill', 'harvest', 'visit'][Math.floor(R(i) * 4)];
      let q;
      if (ty === 'collect') { const k = ['holz', 'stein', 'faser', 'beere', 'apfel', 'kokos', 'kaktus', 'eis', 'pilz', 'glibber'][Math.floor(R(i + 50) * 10)]; const n = 5 + Math.floor(R(i + 60) * 8); q = { ty, key: k, n, txt: `Bring ${n} ${RES[k][0]} ${RES[k][1]}` }; }
      else if (ty === 'kill') { const k = Object.keys(FOE_NAME)[Math.floor(R(i + 70) * Object.keys(FOE_NAME).length)]; const n = 3 + Math.floor(R(i + 80) * 5); q = { ty, key: k, n, txt: `Besiege ${n} ${FOE_NAME[k]}` }; }
      else if (ty === 'harvest') { const k = R(i + 90) < 0.5 ? 'baum' : 'fels'; const n = 6 + Math.floor(R(i + 95) * 7); q = { ty, key: k, n, txt: `${k === 'baum' ? 'Fälle' : 'Zerschlage'} ${n} ${k === 'baum' ? 'Bäume' : 'Felsen'}` }; }
      else { const b = 1 + Math.floor(R(i + 99) * 5); q = { ty, key: b, n: 1, txt: `Betritt eine ${BIOMES[b].pre}` }; }
      const id = ty + q.key; if (used.has(id)) continue; used.add(id);
      q.have = 0; q.coins = 20 + q.n * 4 + (ty === 'visit' ? 30 : 0); q.xp = 25 + q.n * 4; list.push(q);
    }
    prog.q = { day, list }; saveProg();
    return list;
  }
  function qEvent(ty, key) {
    if (!prog.q || prog.q.day !== today()) return;
    for (const q of prog.q.list) if (q.ty === ty && (q.key === key || (key === 'bigslime' && q.key === 'slime')) && !q.done && q.have < q.n) {
      q.have++;
      if (q.have >= q.n) { q.done = true; say(`📜 Auftrag erfüllt: ${q.txt}! Hol dir die Belohnung bei Greta.`); }
      saveProg();
    }
  }
  let npcOpen = null, npcTab = 'kaufen', nearNpc = null, nearWalker = null;
  function toggleNpc(n) {
    const old = root.querySelector('.is-npc'); if (old) old.remove();
    if (!n || (npcOpen && npcOpen.k === n.k)) { npcOpen = null; return; }
    if (bagOpen) toggleBag(); if (skillOpen) toggleSkills(); if (craftOpen) toggleCraft();
    npcOpen = n; npcOpen.line = n.hi[Math.floor(Math.random() * n.hi.length)];
    const d = document.createElement('div'); d.className = 'is-npc'; root.appendChild(d);
    d.onclick = e => {
      if (e.target === d || e.target.closest('[data-close]')) { toggleNpc(); return; }
      const t = e.target.closest('[data-tab]'); if (t) { npcTab = t.dataset.tab; renderNpc(); return; }
      const b = e.target.closest('[data-buy]'); if (b) { const [k, pr] = SHOP.find(s => s[0] === b.dataset.buy) || []; if (k && me.coins >= pr) { me.coins -= pr; bag[k] = (bag[k] || 0) + 1; saveBag(); save(); say(`${RES[k][1]} ${RES[k][0]} gekauft`); } else say('Dafür hast du nicht genug Münzen'); renderNpc(); return; }
      const sl = e.target.closest('[data-sell]'); if (sl) { const k = sl.dataset.sell, n = sl.dataset.all ? bag[k] : 1; if (bag[k] >= n && n > 0) { bag[k] -= n; me.coins += n * PRICE[k]; saveBag(); save(); texts.push({ x: me.x, y: me.y - 1.6, s: '+' + n * PRICE[k] + ' 🪙', t: 0, col: '#ffd27a' }); } renderNpc(); return; }
      const qb = e.target.closest('[data-q]'); if (qb) { claimQuest(+qb.dataset.q); return; }
      const ex = e.target.closest('[data-ext]'); if (ex && npcExt[ex.dataset.ext]) { npcExt[ex.dataset.ext](ex); return; }
    };
    renderNpc();
  }
  const npcExt = {
    claim: () => { const free = town().plots.find(p => !PLOTS[p.id]); if (!free) { say('Gerade ist kein Bauplatz frei'); return; } send({ t: 'i_claim', id: free.id }); say(`🏡 Bauplatz Nr. ${free.id + 1} gehört jetzt dir! Geh hin und tippe auf 🔨 Bauen.`); },
    unclaim: b => { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Wirklich? Alles darauf geht verloren'; return; } send({ t: 'i_unclaim', id: myPlotId() }); prog.bed = null; saveProg(); say('Bauplatz aufgegeben'); },
    seed: b => { const [k, pr] = SEEDSHOP.find(s => s[0] === b.dataset.k) || []; if (k && me.coins >= pr) { me.coins -= pr; bag[k] = (bag[k] || 0) + 1; saveBag(); save(); say(`${RES[k][0]} gekauft`); renderNpc(); } else say('Dafür hast du nicht genug Münzen'); },
  };
  const SEEDSHOP = [['samen_weizen', 6], ['samen_karotte', 10], ['samen_kuerbis', 16]]; // spätere Etappen hängen hier Aktionen an (Bauplätze, Samen, Hüte ...)
  const npcBody = {
    bau: () => { const id = myPlotId(), free = town().plots.filter(p => !PLOTS[p.id]).length;
      return id >= 0 ? `<p>Dein Bauplatz ist <b>Nr. ${id + 1}</b> südlich vom Dorfplatz (dein Name steht auf dem Schild). Stell dich drauf und tippe auf <b>🔨 Bauen</b>. Alles, was du baust, sehen auch die anderen – und es bleibt gespeichert.</p><p>Tipps: Eine <b>Truhe</b> lagert Rohstoffe sicher, im <b>Bett</b> wachst du nach einer Ohnmacht auf, auf <b>Feldern</b> wachsen Samen, <b>Hühner</b> und <b>Schafe</b> geben Eier und Wolle.</p><button class="is-ext" data-ext="unclaim">Bauplatz aufgeben</button>`
        : `<p>Hier bekommt jeder Abenteurer einen eigenen Bauplatz (10 × 10 Felder) für eine Base mit Haus, Truhen, Feldern und Tieren. Frei sind noch <b>${free}</b> von ${town().plots.length}.</p><button class="is-ext" data-ext="claim" ${free && myId ? '' : 'disabled'}>🏡 Bauplatz nehmen</button>`; },
    hof: () => `<p>Samen pflanzt du auf einem <b>Feld</b> auf deinem Bauplatz. Danach heißt es warten – auch wenn du nicht spielst, wächst alles weiter.</p><div class="is-shop">${SEEDSHOP.map(([k, pr]) => `<div><i>${RES[SEEDS[k][0]][1]}</i><span><b>${RES[k][0]}</b><small>wächst in ${Math.round(SEEDS[k][1] / 60)} Min. zu ${RES[SEEDS[k][0]][0]}${bag[k] ? ` · hast ${bag[k]}` : ''}</small></span><button class="is-ext" data-ext="seed" data-k="${k}" ${me.coins >= pr ? '' : 'disabled'}>🪙 ${pr}</button></div>`).join('')}</div><p class="is-npcsub">Hühnerstall und Schafweide baust du selbst auf deinem Bauplatz.</p>`,
  }; // und eigene Inhalte je Bewohner
  function claimQuest(i) {
    const q = quests()[i]; if (!q || q.claimed) return;
    if (q.ty === 'collect' && !q.done) { if ((bag[q.key] || 0) < q.n) return; bag[q.key] -= q.n; saveBag(); q.done = true; }
    if (!q.done) return;
    q.claimed = true; me.coins += q.coins; save(); saveProg();
    gainXP(q.xp, me.x, me.y - 2); texts.push({ x: me.x, y: me.y - 2.4, s: '+' + q.coins + ' 🪙', t: 0, col: '#ffd27a' });
    say(`🎉 Belohnung: ${q.coins} Münzen und ${q.xp} EP`); renderNpc();
  }
  function renderNpc() {
    const d = root.querySelector('.is-npc'); if (!d || !npcOpen) return;
    const n = npcOpen, H = town().houses.find(h => h.k === n.k);
    let body = '';
    if (n.k === 'markt') {
      body = `<div class="is-tabs"><button data-tab="kaufen" class="${npcTab === 'kaufen' ? 'on' : ''}">Kaufen</button><button data-tab="verkaufen" class="${npcTab === 'verkaufen' ? 'on' : ''}">Verkaufen</button></div>`;
      if (npcTab === 'kaufen') body += `<div class="is-shop">${SHOP.map(([k, pr]) => `<div><i>${RES[k][1]}</i><span><b>${RES[k][0]}</b><small>${RES[k][3] ? ITEM_USE[k] : 'Rohstoff'}${bag[k] ? ` · hast ${bag[k]}` : ''}</small></span><button data-buy="${k}" ${me.coins >= pr ? '' : 'disabled'}>🪙 ${pr}</button></div>`).join('')}</div>`;
      else { const have = Object.keys(PRICE).filter(k => bag[k] > 0); body += have.length ? `<div class="is-shop">${have.map(k => `<div><i>${RES[k][1]}</i><span><b>${RES[k][0]}</b><small>hast ${bag[k]} · je 🪙 ${PRICE[k]}</small></span><button data-sell="${k}">1</button><button data-sell="${k}" data-all="1">Alle (${bag[k] * PRICE[k]})</button></div>`).join('')}</div>` : '<p>Du hast nichts zum Verkaufen. Sammle Rohstoffe auf den Inseln!</p>'; }
    } else if (n.k === 'hafen') {
      const list = quests();
      body = `<p class="is-npcsub">Heutige Aufträge · neue gibt es morgen</p><div class="is-quests">${list.map((q, i) => {
        const have = q.ty === 'collect' ? Math.min(q.n, bag[q.key] || 0) : q.have, ready = q.ty === 'collect' ? have >= q.n : q.done;
        return `<div class="${q.claimed ? 'claimed' : ready ? 'ready' : ''}"><b>${q.txt}</b><small>Belohnung: 🪙 ${q.coins} · ✨ ${q.xp} EP</small><i><u style="width:${have / q.n * 100}%"></u></i><span>${have}/${q.n}</span>${q.claimed ? '<em>✓ Erledigt</em>' : `<button data-q="${i}" ${ready ? '' : 'disabled'}>${q.ty === 'collect' ? 'Abgeben' : 'Belohnung'}</button>`}</div>`;
      }).join('')}</div>` + (npcBody.hafen ? npcBody.hafen() : '');
    } else body = npcBody[n.k] ? npcBody[n.k]() : '<p>Komm bald wieder, ich habe noch einiges vor!</p>';
    d.innerHTML = `<div class="is-npcbox"><h3><span class="is-npcav">${H ? H.sign : '🙂'}</span><span>${n.n}<small>„${n.line}“</small></span><button class="is-btn" data-close>✕</button></h3>
      <div class="is-npcmoney">🪙 ${me.coins} Münzen</div>${body}</div>`;
  }
  // Hüte (auch für Spieler in einer späteren Etappe): Rechtecke in Sprite-Pixeln über dem Kopf
  const HATS = {
    stroh: [[1, 3, 14, 2, '#e0c070'], [4, 0, 8, 3, '#d8b050'], [4, 2, 8, 1, '#c0503a']],
    kapitaen: [[3, 2, 10, 2, '#1d2a4a'], [4, -1, 8, 3, '#f4f4f4'], [7, 0, 2, 1, '#e3a92b']],
    bauhelm: [[3, 2, 10, 2, '#e8b020'], [4, -1, 8, 3, '#f4c430'], [7, -1, 2, 3, '#d89a10']],
    blumen: [[4, 1, 8, 1, '#3a8a36'], [4, 0, 2, 2, '#ff6a9a'], [7, 0, 2, 2, '#ffe060'], [10, 0, 2, 2, '#9ad8ff']],
    fischer: [[2, 2, 12, 2, '#e8d040'], [4, -1, 8, 3, '#f0dc50'], [3, 4, 2, 2, '#e8d040']],
    pirat: [[2, 1, 12, 2, '#1a1a1a'], [4, -2, 8, 3, '#2a2a2a'], [7, -1, 2, 2, '#f4f4f4']],
    krone: [[4, -1, 8, 3, '#f4c430'], [4, -3, 1, 2, '#f4c430'], [7, -3, 2, 2, '#f4c430'], [11, -3, 1, 2, '#f4c430'], [7, 0, 2, 1, '#d8443a']],
    zauber: [[3, 2, 10, 1, '#5a2a9a'], [5, -2, 6, 4, '#6a3ab0'], [6, -5, 4, 3, '#6a3ab0'], [7, -7, 2, 2, '#6a3ab0'], [7, -2, 1, 1, '#ffe060']],
    wikinger: [[4, -1, 8, 4, '#8a8a90'], [4, -1, 8, 1, '#b8b8c0'], [2, -3, 2, 3, '#f0ead6'], [12, -3, 2, 3, '#f0ead6']],
    koch: [[4, 1, 8, 2, '#f4f4f4'], [4, -5, 8, 6, '#ffffff'], [3, -6, 10, 2, '#ffffff']],
  };
  function drawHat(x, top, dir, hat) {
    const H = HATS[hat]; if (!H) return;
    const flip = dir === 1;
    for (const [a, b, w, h, c] of H) { ctx.fillStyle = '#1a1420'; ctx.fillRect(x + ((flip ? 16 - a - w : a) - 8) * S - S * 0.5, top + b * S - S * 0.5, w * S + S, h * S + S); }
    for (const [a, b, w, h, c] of H) { ctx.fillStyle = c; ctx.fillRect(x + ((flip ? 16 - a - w : a) - 8) * S, top + b * S, w * S, h * S); }
  }
  // Häuser im Dorf
  const houseCache = new Map();
  function houseSpr(h) {
    const key = h.stall ? 'stall' : h.wall + h.roof + (h.small ? 's' : '');
    if (houseCache.has(key)) return houseCache.get(key);
    const W2 = h.small ? 44 : 60, H2 = h.small ? 46 : 56, [c, g] = mk(W2, H2);
    if (h.stall) {
      R(g, 6, 30, 48, 18, '#8a5a34'); R(g, 6, 30, 48, 2, '#c99a5a'); R(g, 8, 36, 44, 1, '#5a3a20');
      R(g, 8, 10, 3, 40, '#6b4426'); R(g, 49, 10, 3, 40, '#6b4426');
      for (let i = 0; i < 6; i++) R(g, 4 + i * 9, 8, 9, 10, i % 2 ? '#f4f0e0' : '#d8443a');
      for (let i = 0; i < 6; i++) R(g, 4 + i * 9, 18, 9, 2, i % 2 ? '#d8d0c0' : '#a8302a');
      R(g, 12, 25, 7, 5, '#e0402a'); R(g, 21, 26, 6, 4, '#f4e04d'); R(g, 30, 25, 8, 5, '#8a5a34'); R(g, 40, 26, 6, 4, '#5aaa4a');
      R(g, 10, 48, 10, 8, '#a8743f'); R(g, 40, 48, 10, 8, '#a8743f');
    } else {
      const wx0 = h.small ? 5 : 7, wx1 = W2 - wx0, wy0 = h.small ? 24 : 28, wy1 = H2 - 2;
      for (let y = wy0; y < wy1; y++) R(g, wx0, y, wx1 - wx0, 1, (y - wy0) % 5 === 4 ? shadeHex(h.wall, 0.82) : h.wall);
      R(g, wx0, wy0, 2, wy1 - wy0, shadeHex(h.wall, 0.7)); R(g, wx1 - 2, wy0, 2, wy1 - wy0, shadeHex(h.wall, 0.7));
      const ry0 = 4, ry1 = wy0 + 3;
      for (let y = ry0; y < ry1; y++) { const f = (y - ry0) / (ry1 - ry0), hw = (W2 / 2 - 10) * 0.25 + (W2 / 2 - 1) * 0.75 * f + 2; R(g, Math.round(W2 / 2 - hw), y, Math.round(hw * 2), 1, (y - ry0) % 4 === 3 ? shadeHex(h.roof, 0.7) : y < ry0 + 2 ? shadeHex(h.roof, 1.25) : h.roof); }
      R(g, W2 - 18, 1, 5, 9, '#7a6a64'); R(g, W2 - 19, 0, 7, 2, '#5a4a44');
      const dw = 8, dx0 = W2 / 2 - dw / 2; R(g, dx0 - 1, wy1 - 15, dw + 2, 15, '#4a2e18'); R(g, dx0, wy1 - 14, dw, 14, '#8a5a34'); R(g, dx0 + dw - 3, wy1 - 8, 1, 2, '#f4c430');
      for (const wx of [wx0 + 4, wx1 - 12]) { R(g, wx - 1, wy0 + 5, 10, 9, '#4a2e18'); R(g, wx, wy0 + 6, 8, 7, '#9fd0f0'); R(g, wx, wy0 + 6, 8, 2, '#d8f0ff'); R(g, wx + 3, wy0 + 6, 1, 7, '#4a2e18'); R(g, wx, wy0 + 9, 8, 1, '#4a2e18'); R(g, wx - 1, wy0 + 14, 10, 2, '#5aaa4a'); }
    }
    outline(g, W2, H2, '#1a1008');
    const v = { c, w: W2, h: H2 };
    houseCache.set(key, v); return v;
  }
  function drawHouse(hs, ox, oy, u, t) {
    const sp = houseSpr(hs), x = ox + hs.x * u, y = oy + hs.y * u, dx = Math.round(x - sp.w / 2 * S), dy = Math.round(y - sp.h * S);
    shadow(x, y - S, sp.w / 2.4 * S, 0.25);
    ctx.drawImage(sp.c, dx, dy, sp.w * S, sp.h * S);
    if (!hs.stall) { // Rauch aus dem Schornstein
      for (let i = 0; i < 3; i++) { const ph = ((t / 2200 + i / 3 + hs.x * 0.1) % 1); ctx.fillStyle = `rgba(230,230,230,${0.45 * (1 - ph)})`; const r2 = (2 + ph * 3) * S; ctx.fillRect(dx + (sp.w - 15.5 + Math.sin(ph * 5 + i) * 2) * S - r2 / 2, dy - ph * 14 * S - r2 / 2, r2, r2); }
    }
    ctx.font = `${Math.round(7 * S)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sy = hs.stall ? dy + 4 * S : dy + (sp.h - 22) * S;
    ctx.fillStyle = '#5a3a20'; roundRect(x - 5 * S, sy - 4.5 * S, 10 * S, 9 * S, 2 * S); ctx.fill(); ctx.fillStyle = '#e8d4a8'; roundRect(x - 4.3 * S, sy - 3.8 * S, 8.6 * S, 7.6 * S, 1.5 * S); ctx.fill();
    ctx.fillText(hs.sign, x, sy + 0.3 * S);
  }
  function drawFountain(ox, oy, u, t) {
    const V = town().V, x = ox + V.x * u, y = oy + V.y * u;
    shadow(x, y + 4 * S, 22 * S, 0.22);
    ctx.fillStyle = '#5d5a56'; ctx.beginPath(); ctx.ellipse(x, y, 22 * S, 13 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9a9790'; ctx.beginPath(); ctx.ellipse(x, y - S, 21 * S, 12 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f9bcb'; ctx.beginPath(); ctx.ellipse(x, y, 17 * S, 9 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 4; i++) { const a = t / 900 + i * 1.6; ctx.fillRect(x + Math.cos(a) * 11 * S, y + Math.sin(a) * 5 * S, 4 * S, S); }
    ctx.fillStyle = '#7b7873'; ctx.fillRect(x - 2.5 * S, y - 16 * S, 5 * S, 16 * S); ctx.fillStyle = '#9a9790'; ctx.fillRect(x - 5 * S, y - 18 * S, 10 * S, 3 * S);
    ctx.fillStyle = 'rgba(160,220,255,.8)'; for (let i = 0; i < 6; i++) { const ph = ((t / 600 + i / 6) % 1), a = i / 6 * Math.PI * 2; ctx.fillRect(x + Math.cos(a) * ph * 12 * S, y - 18 * S + ph * ph * 18 * S + Math.sin(a) * ph * 4 * S, S * 1.5, S * 1.5); }
  }
  function townPix(wx, wy) { // Farbe für Dorfboden oder null
    const x = wx / TP, y = wy / TP, ta = townAt(x, y); if (!ta) return null;
    const nz = h2(wx, wy, SEED + 700);
    if (ta === 1) { const row = Math.floor(wy / 5), cx = Math.floor((wx + (row % 2) * 3) / 6), edge = wy % 5 === 0 || (wx + (row % 2) * 3) % 6 === 0, v = 0.85 + h2(cx, row, 701) * 0.25; const c = edge ? [96, 92, 86] : [168 * v, 162 * v, 152 * v]; return c; }
    if (ta === 2) { const k = 0.9 + nz * 0.15; return nz < 0.025 ? [150, 140, 120] : [200 * k, 168 * k, 120 * k]; }
    if (ta === 4) { const seam = wx % 16 === 0, k = 0.9 + h2(Math.floor(wx / 16), Math.floor(wy / 3), 702) * 0.2; return seam ? [74, 46, 24] : [154 * k, 106 * k, 58 * k]; }
    if (ta === 3) { const T = town(), p = T.plots.find(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); if (p && (x - p.x < 0.12 || p.x + p.w - x < 0.12 || y - p.y < 0.12 || p.y + p.h - y < 0.12)) return [63, 122, 52]; return null; }
    return null;
  }

  const coarse = matchMedia('(pointer:coarse)').matches;
  function interact() {
    if (!me.inBoat && !me.inCave) {
      if (nearNpc) { toggleNpc(nearNpc); return; }
      if (nearWalker) { nearWalker.say = { m: nearWalker.lines[Math.floor(Math.random() * nearWalker.lines.length)], t: Date.now() }; nearWalker.wait = 3; return; }
      if (extraInteract && extraInteract()) return;
      if (nearSt) { toggleCraft(nearSt.k); return; }
    }
    toggleBoat();
  }
  let extraInteract = null, extraNear = null; // Bauplatz, Felder, Truhen
  /* ---------- Eigene Basen auf den Bauplätzen (auf dem Server gespeichert) ---------- */
  const PIECES = {
    boden_holz: { n: 'Holzboden', i: '🟫', l: 0, cost: { holz: 2 } },
    boden_stein: { n: 'Steinboden', i: '⬜', l: 0, cost: { stein: 2 } },
    teppich: { n: 'Teppich', i: '🟥', l: 0, cost: { faser: 4 } },
    wand_holz: { n: 'Holzwand', i: '🪵', l: 1, solid: 1, cost: { holz: 4 } },
    wand_stein: { n: 'Steinwand', i: '🧱', l: 1, solid: 1, cost: { stein: 4 } },
    tuer: { n: 'Tür', i: '🚪', l: 1, cost: { holz: 3 } },
    zaun: { n: 'Zaun', i: '🚧', l: 1, solid: 1, cost: { holz: 2 } },
    hecke: { n: 'Hecke', i: '🌳', l: 1, solid: 1, cost: { holz: 1, faser: 2 } },
    fackel: { n: 'Fackel', i: '🔥', l: 1, cost: { holz: 1, faser: 1 }, light: 1 },
    laterne: { n: 'Laterne', i: '🏮', l: 1, solid: 1, cost: { stein: 2, glut: 1 }, light: 1 },
    truhe: { n: 'Truhe', i: '📦', l: 1, solid: 1, cost: { holz: 8 }, use: 'Truhe öffnen' },
    bett: { n: 'Bett', i: '🛏️', l: 1, solid: 1, cost: { holz: 6, faser: 6 }, use: 'Schlafen' },
    tisch: { n: 'Tisch', i: '🍽️', l: 1, solid: 1, cost: { holz: 4 } },
    stuhl: { n: 'Stuhl', i: '🪑', l: 1, cost: { holz: 2 } },
    blumen: { n: 'Blumenbeet', i: '🌷', l: 1, cost: { faser: 1, beere: 1 } },
    feld: { n: 'Feld', i: '🌱', l: 1, cost: { holz: 1, stein: 1 }, use: 'Feld' },
    huehner: { n: 'Hühnerstall', i: '🐔', l: 1, solid: 1, cost: { holz: 10, stein: 4 }, use: 'Eier holen', prod: ['ei', 480] },
    schafe: { n: 'Schafweide', i: '🐑', l: 1, solid: 1, cost: { holz: 12, faser: 6 }, use: 'Scheren', prod: ['wolle', 720] },
    werkbank: { n: 'Werkbank', i: '🪚', l: 1, solid: 1, cost: { holz: 10, stein: 6 }, station: 'werk', use: 'Werkbank' },
    amboss: { n: 'Amboss', i: '⚒️', l: 1, solid: 1, cost: { stein: 12, obsidian: 2 }, station: 'schmiede', use: 'Schmiede' },
    kochtopf: { n: 'Kochstelle', i: '🍲', l: 1, solid: 1, cost: { stein: 6, holz: 4 }, station: 'koch', use: 'Kochstelle' },
    flagge: { n: 'Flagge', i: '🚩', l: 1, solid: 1, cost: { holz: 2, faser: 4 } },
    statue: { n: 'Statue', i: '🗿', l: 1, solid: 1, cost: { stein: 10, obsidian: 4 } },
  };
  const SEEDS = { samen_weizen: ['weizen', 300], samen_karotte: ['karotte', 480], samen_kuerbis: ['kuerbis', 720] };
  let PLOTS = {}, buildOn = false, buildSel = 'boden_holz', buildCur = null, chestOpen = null, baseNear = null;
  const myPlotId = () => { for (const [id, p] of Object.entries(PLOTS)) if (p && p.o === myId) return +id; return -1; };
  function plotAt(x, y) { if (!nearBig(x, y)) return null; for (const p of town().plots) if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return p; return null; }
  function baseSolid(x, y) {
    const pl = plotAt(x, y); if (!pl || !PLOTS[pl.id]) return false;
    const it = PLOTS[pl.id].it[Math.floor(x - pl.x) + ',' + Math.floor(y - pl.y)];
    return !!(it && it[1] && PIECES[it[1]] && PIECES[it[1]].solid);
  }
  const affordable = cost => Object.entries(cost).every(([k, v]) => (bag[k] || 0) >= v);
  function placeAt(tx, ty) {
    const id = myPlotId(); if (id < 0) return;
    const pl = town().plots[id], lx = tx - pl.x, ly = ty - pl.y;
    if (lx < 0 || ly < 0 || lx >= pl.w || ly >= pl.h) { say('Nur auf deinem eigenen Bauplatz'); return; }
    const P2 = PLOTS[id], key = lx + ',' + ly, cur = P2.it[key] || [null, null];
    if (buildSel === 'abriss') {
      const L = cur[1] ? 1 : cur[0] ? 0 : -1; if (L < 0) return;
      const k = cur[L];
      if (k === 'truhe' && Object.keys(P2.c || {}).length) { say('Räum die Truhe zuerst aus'); return; }
      for (const [r, v] of Object.entries(PIECES[k] ? PIECES[k].cost : {})) bag[r] = (bag[r] || 0) + Math.floor(v / 2);
      cur[L] = null; P2.it[key] = cur; if (!cur[0] && !cur[1]) delete P2.it[key];
      saveBag(); send({ t: 'i_del', id, x: lx, y: ly, l: L }); if (k === 'bett' && prog.bed) { prog.bed = null; saveProg(); }
      for (let i = 0; i < 8; i++) parts.push({ x: tx + 0.5, y: ty + 0.6, z: 0, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, t: 0, life: 0.5, col: '#c9b08a', sz: 2 });
      return;
    }
    const pc = PIECES[buildSel]; if (!pc) return;
    if (cur[pc.l]) { say('Hier steht schon etwas'); return; }
    if (pc.solid && Math.floor(me.x) === tx && Math.floor(me.y) === ty) { say('Du stehst im Weg'); return; }
    if (!affordable(pc.cost)) { say('Dafür fehlen dir Rohstoffe'); return; }
    for (const [r, v] of Object.entries(pc.cost)) bag[r] -= v;
    cur[pc.l] = buildSel; P2.it[key] = cur; saveBag();
    send({ t: 'i_put', id, x: lx, y: ly, k: buildSel, l: pc.l });
    if (pc.prod) send({ t: 'i_collect', id, x: lx, y: ly });
    for (let i = 0; i < 8; i++) parts.push({ x: tx + 0.5, y: ty + 0.6, z: 0, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, t: 0, life: 0.5, col: '#fff3c0', sz: 2 });
    gainXP(1, tx + 0.5, ty);
    renderBuild();
  }
  function toggleBuild(on) {
    buildOn = on ?? !buildOn;
    let bar = root.querySelector('.is-build'); if (bar) bar.remove();
    if (!buildOn) return;
    bar = document.createElement('div'); bar.className = 'is-build'; root.appendChild(bar);
    bar.onclick = e => { const b = e.target.closest('[data-pc]'); if (b) { buildSel = b.dataset.pc; renderBuild(); return; } if (e.target.closest('[data-bdone]')) toggleBuild(false); };
    renderBuild();
  }
  function renderBuild() {
    const bar = root.querySelector('.is-build'); if (!bar) return;
    const pc = PIECES[buildSel];
    bar.innerHTML = `<div class="is-bhead"><b>🔨 Bauen</b><span>${buildSel === 'abriss' ? 'Tippe auf ein Bauteil, um es abzureißen (halbe Rohstoffe zurück)' : `${pc.i} ${pc.n}: ${Object.entries(pc.cost).map(([k, v]) => `<em class="${(bag[k] || 0) >= v ? 'ok' : 'no'}">${RES[k][1]}${v}</em>`).join(' ')} · ${coarse ? 'tippe aufs Feld' : 'klick aufs Feld oder Leertaste'}`}</span><button data-bdone>Fertig</button></div>
      <div class="is-bpieces"><button data-pc="abriss" class="${buildSel === 'abriss' ? 'on' : ''}"><i>🧹</i>Abreißen</button>${Object.entries(PIECES).map(([k, p]) => `<button data-pc="${k}" class="${buildSel === k ? 'on' : ''} ${affordable(p.cost) ? '' : 'no'}"><i>${p.i}</i>${p.n}</button>`).join('')}</div>`;
  }
  // Was ist in der Nähe der eigenen Base benutzbar?
  function findBaseNear() {
    const id = myPlotId(); if (id < 0) return null;
    const pl = town().plots[id], P2 = PLOTS[id]; if (!P2 || Math.abs(me.x - pl.x - 5) > 8 || Math.abs(me.y - pl.y - 5) > 8) return null;
    let best = null, bd = 1.45;
    for (const [key, [, o]] of Object.entries(P2.it)) {
      if (!o || !PIECES[o] || !PIECES[o].use) continue;
      const [lx, ly] = key.split(',').map(Number), d = Math.hypot(me.x - (pl.x + lx + 0.5), me.y - (pl.y + ly + 0.8));
      if (d < bd) { bd = d; best = { id, key, k: o, x: pl.x + lx, y: pl.y + ly, lx, ly }; }
    }
    return best;
  }
  extraNear = () => !buildOn && !!baseNear;
  extraInteract = () => {
    if (buildOn) return false;
    const b = baseNear; if (!b) return false;
    const P2 = PLOTS[b.id], pc = PIECES[b.k];
    if (pc.station) { toggleCraft(pc.station); return true; }
    if (b.k === 'truhe') { toggleChest(b.id); return true; }
    if (b.k === 'bett') { prog.bed = { x: b.x + 0.5, y: b.y + 1.5 }; saveProg(); me.hp = maxHp(); say('🛏️ Gut geschlafen! Hier wachst du jetzt auf, wenn du ohnmächtig wirst.'); return true; }
    if (b.k === 'feld') {
      const g = P2.g[b.key];
      if (g) {
        const [seed, at] = g, [crop, sec] = SEEDS[seed] || ['weizen', 300], left = sec * 1000 - (Date.now() - at);
        if (left > 0) { say(`${RES[crop][1]} wächst noch ${Math.ceil(left / 60000)} Min.`); return true; }
        const n = 2 + Math.floor(Math.random() * 2); for (let i = 0; i < n; i++) drop(b.x + 0.5, b.y + 0.6, crop);
        if (Math.random() < 0.4) drop(b.x + 0.5, b.y + 0.6, seed);
        delete P2.g[b.key]; send({ t: 'i_crop', id: b.id, x: b.lx, y: b.ly }); gainXP(3, b.x + 0.5, b.y); qEvent('harvest', 'ernte'); return true;
      }
      const seed = Object.keys(SEEDS).find(s => bag[s] > 0);
      if (!seed) { say('Du hast keine Samen. Bäuerin Frieda im Dorf verkauft welche.'); return true; }
      bag[seed]--; saveBag(); P2.g[b.key] = [seed, Date.now()]; send({ t: 'i_plant', id: b.id, x: b.lx, y: b.ly, k: seed });
      say(`${RES[seed][1]} gepflanzt – fertig in ${Math.round(SEEDS[seed][1] / 60)} Min.`); return true;
    }
    if (pc.prod) {
      const [res, sec] = pc.prod, last = P2.a[b.key] || Date.now(), n = Math.min(3, Math.floor((Date.now() - last) / (sec * 1000)));
      if (!n) { say(`Noch nichts da – alle ${Math.round(sec / 60)} Min. gibt es ${RES[res][0]}`); return true; }
      for (let i = 0; i < n; i++) drop(b.x + 0.5, b.y + 0.8, res);
      P2.a[b.key] = Date.now(); send({ t: 'i_collect', id: b.id, x: b.lx, y: b.ly }); gainXP(2 * n, b.x + 0.5, b.y); return true;
    }
    return false;
  };
  function toggleChest(id) {
    const old = root.querySelector('.is-chest'); if (old) old.remove();
    if (id == null || chestOpen === id) { chestOpen = null; return; }
    chestOpen = id;
    const d = document.createElement('div'); d.className = 'is-chest'; root.appendChild(d);
    d.onclick = e => {
      if (e.target === d || e.target.closest('[data-close]')) { toggleChest(); return; }
      const b = e.target.closest('[data-mv]'); if (!b) return;
      const k = b.dataset.k, P2 = PLOTS[chestOpen]; if (!P2) return;
      let n = +b.dataset.mv;
      if (n > 0) n = b.dataset.all ? bag[k] || 0 : Math.min(1, bag[k] || 0); else n = b.dataset.all ? -(P2.c[k] || 0) : -Math.min(1, P2.c[k] || 0);
      if (!n) return;
      bag[k] = (bag[k] || 0) - n; P2.c[k] = (P2.c[k] || 0) + n; if (!P2.c[k]) delete P2.c[k];
      saveBag(); send({ t: 'i_chest', id: chestOpen, k, n }); renderChest();
    };
    renderChest();
  }
  function renderChest() {
    const d = root.querySelector('.is-chest'), P2 = PLOTS[chestOpen]; if (!d || !P2) return;
    const row = (k, n, dir) => `<div><i>${RES[k][1]}</i><span>${RES[k][0]}<b>${n}</b></span><button data-mv="${dir}" data-k="${k}">${dir > 0 ? '→' : '←'} 1</button><button data-mv="${dir}" data-k="${k}" data-all="1">${dir > 0 ? '→' : '←'} alle</button></div>`;
    const mine = Object.keys(RES).filter(k => bag[k] > 0), box = Object.keys(P2.c || {}).filter(k => RES[k] && P2.c[k] > 0);
    d.innerHTML = `<div class="is-chbox"><h3>📦 Truhe <button class="is-btn" data-close>✕</button></h3><p class="is-npcsub">Was in der Truhe liegt, ist sicher auf dem Server gespeichert – auch wenn du das Gerät wechselst.</p>
      <div class="is-chcols"><div><h4>🎒 Rucksack</h4>${mine.map(k => row(k, bag[k], 1)).join('') || '<p>leer</p>'}</div><div><h4>📦 Truhe</h4>${box.map(k => row(k, P2.c[k], -1)).join('') || '<p>leer</p>'}</div></div></div>`;
  }
  // Bauteile zeichnen (im Raster des Bauplatzes)
  function drawFloor(k, x, y, u) {
    const c = k === 'boden_holz' ? ['#9a6a3a', '#7a5028'] : k === 'boden_stein' ? ['#a8a49c', '#7a7670'] : ['#b8303a', '#e8c040'];
    ctx.fillStyle = c[0]; ctx.fillRect(x, y, u, u); ctx.fillStyle = c[1];
    if (k === 'boden_holz') for (let i = 1; i < 4; i++) ctx.fillRect(x, y + i * u / 4, u, S * 0.6);
    else if (k === 'boden_stein') { ctx.fillRect(x + u / 2, y, S * 0.6, u); ctx.fillRect(x, y + u / 2, u, S * 0.6); }
    else { ctx.strokeStyle = c[1]; ctx.lineWidth = S; ctx.strokeRect(x + 2 * S, y + 2 * S, u - 4 * S, u - 4 * S); }
  }
  function drawPiece(k, x, y, u, t, P2, key, owner) {
    const P = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a * S, y + b * S, w * S, h * S); };
    if (k === 'wand_holz' || k === 'wand_stein') {
      const st = k === 'wand_stein', top = st ? '#b8b4ac' : '#b08050', front = st ? '#8a8680' : '#8a5a34', line = st ? '#6a6660' : '#5a3a20';
      shadow(x + u / 2, y + u, 8 * S, 0.2);
      P(0, -10, 16, 10, top); P(0, -10, 16, 1, st ? '#d8d4cc' : '#c99a5a'); P(0, 0, 16, 16, front);
      if (st) for (let r = 0; r < 4; r++) { P(0, r * 4, 16, 0.6, line); P(((r % 2) * 4) + 4, r * 4, 0.6, 4, line); P(((r % 2) * 4) + 12, r * 4, 0.6, 4, line); }
      else for (let i = 1; i < 4; i++) P(i * 4, 0, 0.6, 16, line);
      ctx.strokeStyle = 'rgba(20,12,8,.8)'; ctx.lineWidth = S * 0.8; ctx.strokeRect(x, y - 10 * S, u, 26 * S);
      return;
    }
    if (k === 'tuer') { P(1, -8, 14, 24, '#4a2e18'); P(3, -6, 10, 22, '#a8743f'); P(3, -6, 10, 1, '#c99a5a'); P(10, 4, 1.5, 2, '#f4c430'); return; }
    if (k === 'zaun') { P(1, 2, 2, 12, '#8a5a34'); P(13, 2, 2, 12, '#8a5a34'); P(0, 5, 16, 2, '#a8743f'); P(0, 10, 16, 2, '#a8743f'); return; }
    if (k === 'hecke') { const sp = SPR[6][0]; ctx.drawImage(sp.trunk, x - 2 * S, y - 4 * S, 20 * S, 16 * S); return; }
    if (k === 'fackel') { P(7, 4, 2, 11, '#6b4426'); flame(x + 8 * S, y + 5 * S, t, 0.8); return; }
    if (k === 'laterne') { shadow(x + u / 2, y + u, 4 * S, 0.2); P(7, 2, 2, 14, '#3a3a40'); P(4, -4, 8, 7, '#2a2a30'); P(5, -3, 6, 5, '#ffd25a'); ctx.fillStyle = 'rgba(255,200,80,.22)'; ctx.beginPath(); ctx.arc(x + 8 * S, y - S, 10 * S, 0, Math.PI * 2); ctx.fill(); return; }
    if (k === 'truhe') { drawChest(x + u / 2, y + u - S, false); return; }
    if (k === 'bett') { shadow(x + u / 2, y + u, 8 * S, 0.2); P(1, -2, 14, 18, '#5a3a20'); P(2, -1, 12, 5, '#f4f4f4'); P(2, 4, 12, 11, SHIRTS[owner % 8]); P(2, 4, 12, 1, '#ffffff55'); return; }
    if (k === 'tisch') { shadow(x + u / 2, y + u, 7 * S, 0.2); P(1, 2, 14, 6, '#a8743f'); P(1, 2, 14, 1, '#c99a5a'); P(2, 8, 2, 7, '#6b4426'); P(12, 8, 2, 7, '#6b4426'); P(6, 0, 4, 3, '#f4f4f4'); return; }
    if (k === 'stuhl') { P(4, 0, 8, 2, '#8a5a34'); P(4, 2, 1.5, 12, '#6b4426'); P(4, 7, 8, 3, '#a8743f'); P(10.5, 9, 1.5, 6, '#6b4426'); return; }
    if (k === 'blumen') { P(2, 10, 12, 5, '#5a3a20'); const cs = ['#ff6a9a', '#ffe060', '#9ad8ff', '#ff8a3a']; for (let i = 0; i < 4; i++) { P(3 + i * 3, 6, 1, 4, '#3a8a36'); P(2 + i * 3, 4 + (i % 2), 3, 3, cs[i]); } return; }
    if (k === 'feld') {
      P(0, 0, 16, 16, '#5a3a20'); for (let i = 0; i < 4; i++) P(1, 1 + i * 4, 14, 2, '#7a5230');
      const g = P2 && P2.g[key]; if (!g) return;
      const [seed, at] = g, [crop, sec] = SEEDS[seed] || ['weizen', 300], f = Math.min(1, (Date.now() - at) / (sec * 1000)), st = f >= 1 ? 3 : Math.floor(f * 3);
      for (let i = 0; i < 4; i++) {
        const cx = 2 + (i % 2) * 8, cy = 3 + Math.floor(i / 2) * 8;
        if (st === 0) P(cx + 1, cy + 2, 2, 2, '#6ac04a');
        else if (crop === 'weizen') { P(cx + 1, cy - st * 2 + 3, 1, st * 2 + 1, st === 3 ? '#d8b040' : '#6ac04a'); P(cx + 3, cy - st * 2 + 3, 1, st * 2 + 1, st === 3 ? '#e8c050' : '#5aaa3a'); if (st === 3) P(cx, cy - 4, 4, 2, '#f0d060'); }
        else if (crop === 'karotte') { P(cx, cy, 4, st + 1, '#4aa03a'); if (st === 3) P(cx + 1, cy + 3, 2, 2, '#f07a20'); }
        else { P(cx, cy + 1, 4, 2, '#3a8a2a'); if (st >= 2) { P(cx - (st - 2), cy + 2 - (st - 2), 4 + (st - 2) * 2, 3 + (st - 2), '#e87a20'); P(cx, cy + 2, 1, 2, '#c85a10'); } }
      }
      if (st === 3 && owner === me.col && Math.floor(t / 400) % 2) { ctx.font = `${Math.round(6 * S)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('✨', x + u / 2, y - 3 * S); }
      return;
    }
    if (k === 'huehner' || k === 'schafe') {
      const ch = k === 'huehner';
      shadow(x + u / 2, y + u, 9 * S, 0.22);
      if (ch) { P(1, -2, 14, 14, '#a8743f'); P(0, -6, 16, 5, '#8a3a2a'); P(6, 4, 4, 8, '#3a2414'); }
      else { P(0, 2, 1.5, 13, '#8a5a34'); P(14.5, 2, 1.5, 13, '#8a5a34'); P(0, 4, 16, 1.5, '#a8743f'); P(0, 11, 16, 1.5, '#a8743f'); }
      for (let i = 0; i < 2; i++) { // Tiere laufen herum
        const ph = t / 1000 * (0.6 + i * 0.3) + key.length + i * 2, ax = 8 + Math.sin(ph) * 9 + i * 3 - 1.5, ay = 14 + Math.cos(ph * 0.7) * 3 + i * 2;
        if (ch) { P(ax - 2, ay - 3, 4, 3, '#f4f4f4'); P(ax + 1, ay - 5, 2, 2, '#f4f4f4'); P(ax + 3, ay - 4, 1, 1, '#f0a020'); P(ax + 1, ay - 6, 1, 1, '#d8443a'); }
        else { P(ax - 4, ay - 4, 7, 5, '#f0ece4'); P(ax - 4, ay - 4, 7, 1, '#ffffff'); P(ax + 3, ay - 4, 3, 3, '#3a3a3a'); P(ax - 3, ay + 1, 1, 2, '#3a3a3a'); P(ax + 1, ay + 1, 1, 2, '#3a3a3a'); }
      }
      const pc = PIECES[k], last = P2 && P2.a[key], n = last ? Math.min(3, Math.floor((Date.now() - last) / (pc.prod[1] * 1000))) : 0;
      if (n > 0) { ctx.font = `${Math.round(6 * S)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(RES[pc.prod[0]][1] + (n > 1 ? '×' + n : ''), x + u / 2, y - 8 * S); }
      return;
    }
    if (PIECES[k] && PIECES[k].station) { const sp = SPR.st[PIECES[k].station], w = sp.w * S * 0.6, h = sp.h * S * 0.6; shadow(x + u / 2, y + u, 7 * S, 0.22); ctx.drawImage(sp.trunk, x + u / 2 - w / 2, y + u - h, w, h); if (sp.fire) flame(x + u / 2 - w / 2 + sp.fire[0] * S * 0.6, y + u - h + sp.fire[1] * S * 0.6, t, 0.5); return; }
    if (k === 'flagge') { P(3, -14, 1.5, 29, '#6b4426'); const wv = Math.sin(t / 200) * 1.5; ctx.fillStyle = SHIRTS[owner % 8]; ctx.beginPath(); ctx.moveTo(x + 4.5 * S, y - 13 * S); ctx.lineTo(x + (15 + wv) * S, y - 10 * S); ctx.lineTo(x + 4.5 * S, y - 6 * S); ctx.fill(); return; }
    if (k === 'statue') { shadow(x + u / 2, y + u, 8 * S, 0.25); P(2, 8, 12, 7, '#8d8a84'); P(2, 8, 12, 1, '#b8b4ac'); P(5, -8, 6, 16, '#d8b040'); P(4, -12, 8, 5, '#e8c850'); P(6, -11, 1, 1, '#5a3a10'); P(9, -11, 1, 1, '#5a3a10'); P(3, -3, 2, 6, '#d8b040'); P(11, -3, 2, 6, '#d8b040'); return; }
  }
  function drawBases(ents, ox, oy, u, t) {
    const T = town();
    for (const pl of T.plots) {
      const P2 = PLOTS[pl.id]; if (!P2) continue;
      const sx = ox + pl.x * u, sy = oy + pl.y * u; if (sx > W + u || sy > H + u * 2 || sx + pl.w * u < -u || sy + pl.h * u < -u * 2) continue;
      const owner = (others.get(P2.o) || {}).col ?? (P2.o === myId ? me.col : pl.id % 8);
      for (const [key, [f, o]] of Object.entries(P2.it)) {
        const [lx, ly] = key.split(',').map(Number), x = sx + lx * u, y = sy + ly * u;
        if (f) drawFloor(f, x, y, u);
        if (o) ents.push({ y: pl.y + ly + (o === 'teppich' ? 0 : 0.95), f: () => drawPiece(o, x, y, u, t, P2, key, owner) });
      }
    }
    if (buildOn && buildCur) {
      const x = ox + buildCur[0] * u, y = oy + buildCur[1] * u, ok = buildCur[2];
      ents.push({ y: 1e9, f: () => { ctx.strokeStyle = ok ? 'rgba(120,255,160,.95)' : 'rgba(255,90,80,.95)'; ctx.lineWidth = S; ctx.setLineDash([3 * S, 2 * S]); ctx.strokeRect(x + S / 2, y + S / 2, u - S, u - S); ctx.setLineDash([]); if (ok && buildSel !== 'abriss' && PIECES[buildSel]) { ctx.globalAlpha = 0.55; PIECES[buildSel].l === 0 ? drawFloor(buildSel, x, y, u) : drawPiece(buildSel, x, y, u, t, null, '', me.col); ctx.globalAlpha = 1; } } });
    }
  }
  // Bauen: Zielfeld vor dem Spieler, am PC unter der Maus
  let mouseTile = null;
  function updateBuildCursor() {
    if (!buildOn) { buildCur = null; return; }
    const id = myPlotId(); if (id < 0) { toggleBuild(false); return; }
    const pl = town().plots[id];
    let tx, ty;
    if (mouseTile && !coarse) [tx, ty] = mouseTile;
    else { const v = DIRV[me.dir]; tx = Math.floor(me.x + v[0] * 0.9); ty = Math.floor(me.y - 0.2 + v[1] * 0.9); }
    const ok = tx >= pl.x && ty >= pl.y && tx < pl.x + pl.w && ty < pl.y + pl.h;
    buildCur = [tx, ty, ok];
  }

  function useItem(k) {
    if (!bag[k]) return;
    if (['saft', 'kuchen', 'brot', 'ruehrei'].includes(k) && me.hp >= maxHp()) { say('Du hast schon volle Herzen'); return; }
    bag[k]--; saveBag();
    if (k === 'saft') me.hp = Math.min(maxHp(), me.hp + 2);
    else if (k === 'kuchen') me.hp = maxHp();
    else if (k === 'brot') me.hp = Math.min(maxHp(), me.hp + 4); else if (k === 'ruehrei') me.hp = maxHp();
    else if (k === 'karottensuppe') { buff.kraft = 120; buff.tempo = 120; } else if (k === 'kuerbiskuchen') { buff.herz = 180; me.hp = Math.min(maxHp(), me.hp + 4); }
    else if (k === 'suppe') buff.kraft = 90; else if (k === 'shake') buff.tempo = 90; else if (k === 'elixier') buff.dorn = 90;
    texts.push({ x: me.x, y: me.y - 1.6, s: RES[k][1], t: 0, col: '#fff' }); say(`${RES[k][1]} ${RES[k][0]}: ${ITEM_USE[k]}`);
    if (bagOpen) renderBag();
  }
  function toggleCraft(st) {
    const old = root.querySelector('.is-craft'); if (old) old.remove();
    if (!st || craftOpen === st) { craftOpen = null; return; }
    if (bagOpen) toggleBag(); if (skillOpen) toggleSkills();
    craftOpen = st;
    const d = document.createElement('div'); d.className = 'is-craft'; root.appendChild(d);
    d.onclick = e => {
      if (e.target === d || e.target.closest('[data-close]')) { toggleCraft(); return; }
      const b = e.target.closest('[data-make]'); if (b) craft(b.dataset.make);
    };
    renderCraft();
  }
  const recState = r => {
    if (r.gear && gear(r.gear) >= r.tier) return gear(r.gear) === r.tier ? 'have' : 'better';
    return Object.entries(r.cost).every(([k, v]) => (bag[k] || 0) >= v) ? 'ok' : 'miss';
  };
  function craft(id) {
    const r = RECIPES.find(q => q.id === id); if (!r || recState(r) !== 'ok') return;
    for (const [k, v] of Object.entries(r.cost)) bag[k] -= v;
    if (r.gear) { prog.gear = prog.gear || {}; prog.gear[r.gear] = r.tier; if (r.gear === 'ruestung') me.hp = maxHp(); mapDirty = true; }
    else bag[r.item] = (bag[r.item] || 0) + 1;
    saveBag(); saveProg();
    say(`${r.i} ${r.n} hergestellt!`); shake = 2;
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2; parts.push({ x: me.x, y: me.y - 0.8, z: 0, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, t: 0, life: 0.6, col: i % 2 ? '#ffd27a' : '#ffffff', sz: 2 }); }
    gainXP(r.gear ? 15 : 3, me.x, me.y - 2);
    renderCraft();
  }
  function renderCraft() {
    const d = root.querySelector('.is-craft'); if (!d || !craftOpen) return;
    const [ic, name, info] = STATIONS[craftOpen];
    const list = RECIPES.filter(r => r.st === craftOpen);
    d.innerHTML = `<div class="is-crbox"><h3>${ic} ${name} <button class="is-btn" data-close>✕</button></h3><div class="is-crsub">${info}</div>
      <div class="is-crlist">${list.map(r => {
        const st = recState(r);
        const cost = Object.entries(r.cost).map(([k, v]) => `<span class="${(bag[k] || 0) >= v ? 'ok' : 'no'}">${RES[k][1]} ${Math.min(bag[k] || 0, v)}/${v}</span>`).join('');
        const btn = st === 'have' ? '<button class="is-make" disabled>✓ Hast du</button>' : st === 'better' ? '<button class="is-make" disabled>Schon Besseres</button>' : `<button class="is-make" data-make="${r.id}" ${st === 'ok' ? '' : 'disabled'}>Herstellen</button>`;
        return `<div class="is-rec ${st}"><i>${r.i}</i><div><b>${r.n}</b>${r.item && bag[r.item] ? ` <small>(hast ${bag[r.item]})</small>` : ''}<p>${r.d}</p><div class="is-cost">${cost}</div></div>${btn}</div>`;
      }).join('')}</div></div>`;
  }
  let bagOpen = false;
  function toggleBag() {
    bagOpen = !bagOpen;
    const old = root.querySelector('.is-bag'); if (old) old.remove();
    if (!bagOpen) return;
    if (skillOpen) toggleSkills();
    const d = document.createElement('div'); d.className = 'is-bag';
    root.appendChild(d); d.onclick = e => { if (e.target === d || e.target.closest('[data-close]')) { toggleBag(); return; } const u = e.target.closest('[data-eat]'); if (u) useItem(u.dataset.eat); };
    renderBag();
  }
  function renderBag() {
    const d = root.querySelector('.is-bag'); if (!d) return;
    const have = Object.keys(RES).filter(k => bag[k] > 0);
    d.innerHTML = `<div class="is-bagbox"><h3>🎒 Rucksack <button class="is-btn" data-close>✕</button></h3>
      <div class="is-bagsum">🪙 ${me.coins} Münzen · ${have.reduce((a, k) => a + bag[k], 0)} Rohstoffe</div>
      ${have.length ? `<div class="is-baggrid">${have.map(k => `<div class="${RES[k][3] ? 'eat' : ''}"><i>${RES[k][1]}</i><b>${bag[k]}</b><span>${RES[k][0]}</span>${RES[k][3] ? `<button class="is-eat" data-eat="${k}" title="${ITEM_USE[k]}">Benutzen</button>` : ''}</div>`).join('')}</div>` : '<p>Noch leer. Schlag Bäume, Felsen, Büsche, Kakteen oder Pilze, um Rohstoffe zu sammeln. Auf jeder Inselart gibt es andere!</p>'}
      <div class="is-gear"><b>Ausrüstung:</b> ${GEAR_NAME.schwert[gear('schwert')]}${Object.keys(GEAR_NAME).filter(g => g !== 'schwert' && gear(g)).map(g => ' · ' + GEAR_NAME[g][gear(g)]).join('')}</div>
      <small>Auf der Startinsel stehen Werkbank, Schmiede, Kochstelle und am Südufer die Werft. Dort stellst du aus Rohstoffen Sachen her.</small></div>`;
  }
  function fade(fn) {
    if (busy) return; busy = true;
    hud.fade.style.opacity = 1;
    setTimeout(() => { fn(); hud.fade.style.opacity = 0; busy = false; }, 380);
  }

  /* ---------- Steuerung ---------- */
  function screenTile(cx, cy) { const r = cv.getBoundingClientRect(), [u, ox, oy] = camera(); return [Math.floor(((cx - r.left) * DPR - ox) / u), Math.floor(((cy - r.top) * DPR - oy) / u)]; }
  function joyDown(e) {
    if (chatOpen || bigMap) return;
    if (buildOn) { const tt = screenTile(e.clientX, e.clientY); if (e.pointerType === 'mouse') { if (e.button === 0) { mouseTile = tt; updateBuildCursor(); if (buildCur && buildCur[2]) placeAt(buildCur[0], buildCur[1]); } return; } joy.tap = { x: e.clientX, y: e.clientY, t: Date.now(), tt }; }
    if (e.pointerType === 'mouse') { // am PC: Klick greift in Mausrichtung an
      if (e.button !== 0) return;
      const r = cv.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
      if (!me.inBoat) { const l = Math.hypot(dx, dy) || 1; me.fx = dx / l; me.fy = dy / l; me.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); attack(true); }
      return;
    }
    joy.on = true; joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joy.dx = joy.dy = 0;
    hud.joy.style.display = 'block'; hud.joy.style.left = e.clientX + 'px'; hud.joy.style.top = e.clientY + 'px'; hud.joy.firstChild.style.transform = '';
  }
  function joyMove(e) {
    if (buildOn && e.pointerType === 'mouse') mouseTile = screenTile(e.clientX, e.clientY);
    if (!joy.on || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const l = Math.hypot(dx, dy), m = 50;
    if (l > m) { dx = dx / l * m; dy = dy / l * m; }
    joy.dx = dx / m; joy.dy = dy / m;
    hud.joy.firstChild.style.transform = `translate(${dx}px,${dy}px)`;
  }
  function joyUp(e) {
    if (buildOn && joy.tap && Math.hypot(e.clientX - joy.tap.x, e.clientY - joy.tap.y) < 12 && Date.now() - joy.tap.t < 350) { const [tx, ty] = joy.tap.tt, pl = town().plots[myPlotId()]; if (pl && tx >= pl.x && ty >= pl.y && tx < pl.x + pl.w && ty < pl.y + pl.h) placeAt(tx, ty); }
    joy.tap = null;
    if (!joy.on || e.pointerId !== joy.id) return; joy.on = false; joy.dx = joy.dy = 0; hud.joy.style.display = 'none'; }
  function onKey(e) {
    if (!open || chatOpen) return;
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') {
      if (k === 't' || k === 'enter') { e.preventDefault(); openChat(); return; }
      if (k === 'e' && !e.repeat) { interact(); return; }
      if (k === 'escape' && (npcOpen || craftOpen)) { toggleNpc(); toggleCraft(); return; }
      if (k === ' ' || k === 'q') { e.preventDefault(); if (!e.repeat) { if (me.inBoat) toggleSail(); else if (buildOn) { mouseTile = null; updateBuildCursor(); if (buildCur && buildCur[2]) placeAt(buildCur[0], buildCur[1]); } else attack(); } return; }
      if (k === 'b' && !e.repeat && !hud.build.hidden) { toggleBuild(); return; }
      if ((k === 'f' || k === 'j') && !e.repeat) { attack(); return; }
      if (k === 'm' && !e.repeat) { toggleMap(); return; }
      if (k === 'i' && !e.repeat) { toggleBag(); return; }
      if (k === 'k' && !e.repeat) { toggleSkills(); return; }
      if (k === 'escape' && skillOpen) { toggleSkills(); return; }
      if (k === 'escape') { if (bigMap) toggleMap(); return; }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      keys.add(k);
    } else keys.delete(k);
  }
  function inputDir() {
    let x = 0, y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x--; if (keys.has('d') || keys.has('arrowright')) x++;
    if (keys.has('w') || keys.has('arrowup')) y--; if (keys.has('s') || keys.has('arrowdown')) y++;
    if (joy.on && Math.hypot(joy.dx, joy.dy) > 0.18) { x = joy.dx; y = joy.dy; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return [x, y];
  }
  function toggleBoat() {
    if (me.inCave) { say('Hier unten gibt es kein Wasser für dein Boot'); return; }
    if (me.inBoat) {
      for (let r = 1; r <= 2.6; r += 0.4) for (let i = 0; i < 16; i++) {
        const a = boat.h + i / 16 * Math.PI * 2, x = boat.x + Math.cos(a) * r, y = boat.y + Math.sin(a) * r;
        if (walkable(x, y) && (elev(x, y) >= 0 || (nearBig(x, y) && townAt(x, y) === 4))) { me.inBoat = 0; me.x = x; me.y = y; boat.v = 0; boat.sail = 0; say('An Land gegangen'); return; }
      }
      say('Hier ist kein Ufer – fahr näher ans Land');
      return;
    }
    if (Math.hypot(boat.x - me.x, boat.y - me.y) < 2.2) { me.inBoat = 1; me.x = boat.x; me.y = boat.y; say('Leinen los! Leertaste oder ⛵ setzt das Segel'); return; }
    for (let r = 1; r <= 4; r += 0.5) for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2, x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r;
      if (sailable(x, y)) { boat.x = x; boat.y = y; boat.h = a; boat.v = 0; boat.sail = 0; say('Dein Boot liegt jetzt hier am Ufer'); return; }
    }
    say(`Dein Boot liegt im ${dirName(Math.atan2(boat.y - me.y, boat.x - me.x))} (${Math.round(Math.hypot(boat.x - me.x, boat.y - me.y))} Felder). Geh ans Wasser, dann kannst du es rufen.`);
  }
  function toggleSail() { if (!me.inBoat) return; boat.sail = boat.sail ? 0 : 1; say(boat.sail ? 'Segel gesetzt – fahr quer zum Wind, dann bist du am schnellsten' : 'Segel eingeholt – du paddelst'); }

  /* ---------- Kampf ---------- */
  const ATK_T = 0.3;
  function attack(aimed) {
    if (me.inBoat || me.atk > 0 || busy || chatOpen) return;
    if (!aimed) { const v = DIRV[me.dir]; me.fx = v[0]; me.fy = v[1]; }
    me.atkT = ATK_T * (1 - 0.2 * sk('flink')) * (rage() ? 0.8 : 1); me.atk = me.atkT; me.hitDone = false;
  }
  // Gegnerarten: Verhalten (hüpfen, fliegen, jagen, Keulenschlag), Leben, Schaden, Farben, Beute
  const EDEF = {
    slime: { ai: 'hop', hp: 3, dmg: 1, c: ['#1f5a24', '#5fcf5a'], loot: 'glibber', coins: [1, 3] },
    bigslime: { ai: 'hop', hp: 5, dmg: 2, c: ['#3d2a6e', '#8a5ce0'], loot: 'glibber', coins: [2, 4], big: 1 },
    sandslime: { ai: 'hop', hp: 3, dmg: 1, c: ['#7a5a1a', '#e8c25a'], loot: 'glibber', coins: [1, 3] },
    frostslime: { ai: 'hop', hp: 4, dmg: 1, c: ['#2a5a7a', '#a8e4ff'], loot: 'eis', coins: [1, 3] },
    fireslime: { ai: 'hop', hp: 4, dmg: 1, c: ['#7a2a0a', '#ff8a2a'], loot: 'glut', coins: [2, 4] },
    frog: { ai: 'hop', hp: 2, dmg: 1, c: ['#0f4a3a', '#3ad0a0'], loot: 'glibber', coins: [1, 2], frog: 1 },
    sporling: { ai: 'hop', hp: 3, dmg: 1, c: ['#4a1a5a', '#c94ad0'], loot: 'sporen', coins: [1, 3], shroom: 1 },
    bat: { ai: 'fly', hp: 2, dmg: 1, c: ['#3d2450', '#5a3474'], coins: [2, 2] },
    moth: { ai: 'fly', hp: 2, dmg: 1, c: ['#6a4aa0', '#e0c8ff'], loot: 'sporen', coins: [1, 2], moth: 1 },
    scorpion: { ai: 'chase', hp: 3, dmg: 1, sp: 2.4, c: ['#5a3010', '#d08a3a'], loot: 'stachel', coins: [2, 3] },
    wolf: { ai: 'chase', hp: 4, dmg: 1, sp: 3.1, c: ['#4a5060', '#c8ccd8'], loot: 'fell', coins: [2, 4], wolf: 1 },
    golem: { ai: 'slam', hp: 10, dmg: 2, sp: 1.0, r: 1.6, wake: 7, loot: 'glut', coins: [6, 10] },
    troll: { ai: 'slam', hp: 24, dmg: 2, sp: 1.35, r: 1.9, wake: 9, coins: [30, 30], boss: 1, name: 'Höhlentroll' },
    sandwurm: { ai: 'slam', hp: 40, dmg: 2, sp: 1.2, r: 2, wake: 9, coins: [40, 50], boss: 1, name: 'Sandwurm', loot: 'wuestenperle', lootN: 3, look: 'wurm', c: ['#8a6a3a', '#c8a060'] },
    frostwyrm: { ai: 'slam', hp: 45, dmg: 2, sp: 1.3, r: 2, wake: 9, coins: [40, 50], boss: 1, name: 'Frostwyrm', loot: 'frostherz', lootN: 3, look: 'wyrm', c: ['#3a6a9a', '#a8e4ff'] },
    riesenfrosch: { ai: 'slam', hp: 38, dmg: 2, sp: 1.5, r: 2.2, wake: 9, coins: [40, 50], boss: 1, name: 'Riesenfrosch', loot: 'giftdruese', lootN: 3, look: 'frosch', c: ['#0f4a3a', '#3ad0a0'] },
    feuerdrache: { ai: 'slam', hp: 55, dmg: 3, sp: 1.3, r: 2.2, wake: 10, coins: [60, 70], boss: 1, name: 'Feuerdrache', loot: 'drachenschuppe', lootN: 3, look: 'wyrm', c: ['#8a1a0a', '#ff7a2a'] },
    sporenkoenigin: { ai: 'slam', hp: 42, dmg: 2, sp: 1.2, r: 2.1, wake: 9, coins: [40, 50], boss: 1, name: 'Sporenkönigin', loot: 'koenigsspore', lootN: 3, look: 'koenigin', c: ['#5a1a6a', '#d06ae0'] },
  };
  function mkEnemy(k, x, y) { const d = EDEF[k], nh = !me.inCave && isNight() ? Math.ceil(d.hp * 1.5) : d.hp; return { k, d, x, y, hx: x, hy: y, hp: nh, max: nh, vx: 0, vy: 0, t: Math.random(), hop: 0, flash: 0, stun: 0, cd: 1, wind: 0, awake: false, back: 0, lunge: 0, fx: 1 }; }
  // Was ein abgebauter Gegenstand bringt: [Schläge, () => Beute]
  const HARV = {
    1: [3, v => ['holz', 'holz', ...(v === 1 ? ['apfel', 'apfel'] : [])]], 2: [3, () => ['holz', ...(Math.random() < 0.7 ? ['kokos'] : [])]], 3: [4, () => ['stein', 'stein']],
    6: [1, () => ['beere', 'beere']], 7: [3, () => ['holz', 'holz']], 8: [2, () => ['kaktus', ...(Math.random() < 0.4 ? ['faser'] : [])]], 9: [2, () => ['holz', 'holz']],
    10: [4, v => ['holz', 'holz', ...(v === 1 || Math.random() < 0.4 ? ['banane'] : [])]], 11: [3, () => ['holz', 'holz']], 12: [4, () => ['eis', 'eis', ...(Math.random() < 0.3 ? ['eiskristall'] : [])]],
    13: [5, () => ['obsidian', 'stein']], 14: [4, () => ['stein', 'stein']], 15: [3, () => ['pilz', 'pilz', ...(Math.random() < 0.3 ? ['sporen'] : [])]], 16: [1, () => ['faser']], 17: [1, () => ['faser']],
  };
  const TREES = new Set([1, 2, 7, 9, 10, 11]);
  function doHits() {
    me.hitDone = true;
    const fa = Math.atan2(me.fy, me.fx);
    let any = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const D = e.d, ex = e.x - me.x, ey = (e.y - (D.ai === 'fly' ? 0.4 : D.ai === 'slam' ? 0.6 : 0.15)) - (me.y - 0.4), d = Math.hypot(ex, ey), reach = D.ai === 'slam' ? 2.2 : 1.55;
      if (d > reach) continue;
      if (d > 0.5 && !sk('wirbel') && Math.abs(wrap(Math.atan2(ey, ex) - fa)) > 1.25) continue;
      hitEnemy(e, dmgRoll(), ex / (d || 1), ey / (d || 1)); any = true;
    }
    if (any || me.inCave) return;
    if (digTreasure()) return;
    // Rohstoffe abbauen: nächster Gegenstand in Schlagrichtung
    let best = null, bd = 9;
    for (let ty = Math.floor(me.y) - 2; ty <= Math.floor(me.y) + 1; ty++) for (let tx = Math.floor(me.x) - 2; tx <= Math.floor(me.x) + 2; tx++) {
      const t = tileAt(tx, ty), o = objAt(tx, ty, t);
      if (!HARV[o] || isCut(tx, ty)) continue;
      const ox = tx + 0.5 - me.x, oy = ty + 0.5 - (me.y - 0.3), d = Math.hypot(ox, oy);
      if (d > 1.6 || (d > 0.6 && Math.abs(wrap(Math.atan2(oy, ox) - fa)) > 1.2)) continue;
      if (d < bd) { bd = d; best = { tx, ty, o, t }; }
    }
    if (!best) return;
    const { tx, ty, o, t } = best, key = tx + ',' + ty, n = (hits.get(key) || 0) + 1, need = sk('meister') ? 1 : Math.max(1, HARV[o][0] - sk('kraft') - gear('axt')), loot = HARV[o][1];
    const col = TREES.has(o) ? '#a8743f' : o === 12 ? '#d8f0ff' : o === 13 ? '#4a3468' : o === 15 ? '#e04a3a' : o === 8 ? '#5aaa4a' : o >= 16 || o === 6 ? '#7ac05a' : '#9a9790';
    for (let i = 0; i < 6; i++) parts.push({ x: tx + 0.5, y: ty + 0.6, z: 0, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, t: 0, life: 0.45, col, sz: 2 });
    shake = Math.max(shake, 1.5);
    if (n < need) { hits.set(key, n); texts.push({ x: tx + 0.5, y: ty - 0.6, s: '●'.repeat(n) + '○'.repeat(need - n), t: 0, col: '#ffffff' }); return; }
    hits.delete(key); cut.set(key, Date.now() + 5 * 60e3);
    const got = loot(objVar(o, h2(tx, ty, SEED + 90), t)); if (sk('holz') && TREES.has(o)) got.push('holz');
    for (const k of got) { drop(tx + 0.5, ty + 0.6, k); if (Math.random() < 0.3 * sk('ernte')) drop(tx + 0.5, ty + 0.6, k); }
    if (sk('schatz') && Math.random() < 0.2) for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) drop(tx + 0.5, ty + 0.6, 'coin');
    gainXP(o === 12 || o === 13 ? 4 : o === 6 || o >= 16 ? 1 : 2, tx + 0.5, ty - 0.2);
    if (TREES.has(o)) qEvent('harvest', 'baum'); else if (o === 3 || (o >= 12 && o <= 14)) qEvent('harvest', 'fels');
  }
  const rage = () => sk('zorn') && me.hp <= maxHp() / 2;
  function dmgRoll() { let d = 1 + sk('klinge') + gear('schwert') + (rage() ? 1 : 0) + (buff.kraft > 0 ? 1 : 0); if (Math.random() < 0.15 * sk('krit')) { d *= 2; dmgRoll.crit = true; } else dmgRoll.crit = false; return d; }
  function hitEnemy(e, dmg, nx, ny) {
    const D = e.d, heavy = D.ai === 'slam';
    e.hp -= dmg; e.flash = 0.15; if (gear('schwert') === 2) e.slow = 2.5;
    const kb = heavy ? 1.5 : 7; e.vx = nx * kb; e.vy = ny * kb; e.stun = heavy ? 0.05 : 0.3; e.lunge = 0;
    texts.push({ x: e.x, y: e.y - 1, s: (dmgRoll.crit ? 'Volltreffer! -' : '-') + dmg, t: 0, col: dmgRoll.crit ? '#ff9a3a' : '#ffe08a' }); dmgRoll.crit = false;
    for (let i = 0; i < 5; i++) parts.push({ x: e.x, y: e.y - 0.4, z: 0, vx: (Math.random() - 0.5) * 4 + nx * 2, vy: (Math.random() - 0.5) * 4 + ny * 2, t: 0, life: 0.4, col: D.c ? D.c[1] : '#c9d3b0', sz: 2 });
    shake = Math.max(shake, heavy ? 4 : 2);
    if (D.ai !== 'slam' && !e.awake) e.awake = true;
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    const D = e.d;
    e.dead = true;
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3; parts.push({ x: e.x, y: e.y - 0.3, z: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.6, col: i % 3 ? '#e8e8f0' : '#bfbfd0', sz: 3 }); }
    const n = Math.round((D.coins[0] + Math.floor(Math.random() * (D.coins[1] - D.coins[0] + 1))) * (1 + 0.25 * sk('glueck')));
    gainXP(XP_FOE[e.k] || 5, e.x, e.y - 1.4); qEvent('kill', e.k);
    if (sk('heil')) me.hp = Math.min(maxHp(), me.hp + 1);
    for (let i = 0; i < n; i++) drop(e.x, e.y, 'coin');
    if (D.loot && !D.boss && Math.random() < 0.7) drop(e.x, e.y, D.loot);
    if (D.ai !== 'slam' && Math.random() < 0.2) drop(e.x, e.y, 'heart');
    if (D.boss) {
      cs().boss = Date.now(); saveCave();
      say(`🏆 Du hast den ${D.name} besiegt!`); addLog(`<b>${D.name} besiegt!</b> Er kommt in 10 Minuten wieder.`);
      for (let i = 0; i < 3; i++) drop(e.x, e.y, 'heart');
      for (let i = 0; i < (D.lootN || 0); i++) drop(e.x, e.y, D.loot);
      if (Math.random() < 0.5) drop(e.x, e.y, 'karte');
      prog.st = prog.st || {}; prog.st.bosse = (prog.st.bosse || 0) + 1; saveProg();
    }
    if (!me.inCave && !D.boss && Math.random() < 0.06) drop(e.x, e.y, 'karte'); else if (e.k === 'golem') say('🪨 Lavagolem besiegt!');
  }
  function newMap() {
    prog.maps = prog.maps || [];
    if (prog.maps.length >= 3) { me.coins += 15; texts.push({ x: me.x, y: me.y - 1.6, s: '+15 🪙', t: 0, col: '#ffd27a' }); return; }
    const cx0 = Math.floor(me.x / CELL), cy0 = Math.floor(me.y / CELL);
    for (let k = 0; k < 60; k++) {
      const isl = island(cx0 + Math.floor((Math.random() - 0.5) * 9), cy0 + Math.floor((Math.random() - 0.5) * 9)); if (!isl || !isl.b) continue;
      const a = Math.random() * Math.PI * 2, r = Math.random() * isl.r * 0.55, x = isl.x + Math.cos(a) * r, y = isl.y + Math.sin(a) * r;
      if (!walkable(x, y) || elev(x, y) < 0.12) continue;
      prog.maps.push({ x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, n: isl.name }); saveProg();
      say(`🗺️ Schatzkarte! Ein Schatz liegt auf ${isl.name} – rotes X auf der Karte`); addLog(`Schatzkarte gefunden: <b>${escH(isl.name)}</b>. Grab mit einer Schaufel (Werkbank) am X.`); mapDirty = true; return;
    }
  }
  function digTreasure() {
    const m = (prog.maps || []).find(q => Math.hypot(q.x - me.x, q.y - (me.y - 0.3)) < 1.4); if (!m) return false;
    if (!gear('schaufel')) { say('Hier liegt ein Schatz! Du brauchst eine Schaufel (Werkbank).'); return true; }
    prog.maps.splice(prog.maps.indexOf(m), 1); saveProg();
    shake = 5; say('💰 Schatz ausgegraben!');
    const rare = ['eiskristall', 'obsidian', 'glut', 'sporen', 'stachel', 'fell', 'drachenschuppe'];
    for (let i = 0; i < 25 + Math.floor(Math.random() * 25); i++) drop(m.x, m.y, 'coin');
    for (let i = 0; i < 3; i++) drop(m.x, m.y, rare[Math.floor(Math.random() * (rare.length - (Math.random() < 0.85 ? 1 : 0)))]);
    gainXP(40, m.x, m.y - 1); prog.st = prog.st || {}; prog.st.schatz = (prog.st.schatz || 0) + 1; mapDirty = true;
    return true;
  }
  function drop(x, y, k) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2.5; items.push({ x, y, k, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z: 0, vz: 4 + Math.random() * 3, t: 0 }); }
  function hurt(n, fx, fy, src) {
    if (me.inv > 0 || busy || me.hp <= 0 || me.inBoat) return;
    if (src && !src.dead && (gear('ruestung') >= 2 || buff.dorn > 0)) { const dx = src.x - me.x, dy = src.y - me.y, d = Math.hypot(dx, dy) || 1; hitEnemy(src, 1, dx / d, dy / d); }
    if (Math.random() < 0.15 * sk('dodge')) { me.inv = 0.6; texts.push({ x: me.x, y: me.y - 1.4, s: 'Ausgewichen!', t: 0, col: '#9fe0ff' }); return; }
    me.hp -= n; me.inv = 1; hurtFlash = 0.35; shake = Math.max(shake, 5);
    const dx = me.x - fx, dy = me.y - fy, d = Math.hypot(dx, dy) || 1; me.kx = dx / d * 9; me.ky = dy / d * 9;
    texts.push({ x: me.x, y: me.y - 1.4, s: '-' + n, t: 0, col: '#ff6a6a' });
    if (me.hp <= 0) {
      me.hp = 0;
      const inCave = me.inCave;
      setTimeout(() => fade(() => {
        if (inCave) leaveCave(true); else respawnHome();
        if (!inCave && prog.bed && myPlotId() >= 0) { me.x = prog.bed.x; me.y = prog.bed.y; }
        me.hp = maxHp(); say(inCave ? 'Du bist ohnmächtig geworden … und wachst vor der Höhle wieder auf.' : (prog.bed && myPlotId() >= 0 ? 'Du bist ohnmächtig geworden … und wachst in deinem Bett wieder auf.' : 'Du bist ohnmächtig geworden … und wachst auf der Startinsel wieder auf.'));
      }), 500);
    }
  }
  function respawnHome() {
    me.inBoat = 0; me.inCave = 0; me.x = 70.5; me.y = 70.5; me.kx = me.ky = 0; me.dir = 0;
    enemies = []; items.length = 0; mapDirty = true; lastSent = '';
  }
  function spawnEnemies() {
    const C = buildCave();
    enemies = [];
    const sp = caveSpec, fo = sp.foes;
    for (const [x, y] of C.slimes) enemies.push(mkEnemy(sp.key === 'start' ? (h2(x, y, 340) < 0.25 ? 'bigslime' : 'slime') : fo[Math.floor(h2(x, y, 341) * fo.length)], x + 0.5, y + 0.6));
    for (const [x, y] of C.bats) enemies.push(mkEnemy(sp.fly || 'bat', x + 0.5, y + 0.6));
    if (Date.now() - (cs().boss || 0) > 10 * 60e3) enemies.push(mkEnemy(sp.boss, C.boss[0], C.boss[1]));
    items.length = 0;
  }
  // Gegner auf den Inseln tauchen in der Nähe auf (nicht auf der Heimatinsel) und verschwinden weit weg wieder
  let spawnT = 0;
  const landFree = (x, y, r) => walkable(x, y) && elev(x, y) >= 0 && (!r || (walkable(x - r, y) && walkable(x + r, y)));
  function spawnOver(dt) {
    for (const e of enemies) if (Math.hypot(e.x - me.x, e.y - me.y) > 28) e.dead = true;
    const nt = isNight();
    spawnT += dt; if (spawnT < (nt ? 0.9 : 1.4)) return; spawnT = 0;
    if (me.inBoat || enemies.length >= (nt ? 7 : 5)) return;
    const isl = nearestIsland(me.x, me.y); if (!isl || isl.home || isl.town) return;
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 5, x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r;
      if (!landFree(x, y, 0.3)) continue;
      const near = nearestIsland(x, y); if (near !== isl) continue;
      const foes = BIOMES[isl.b].foes; let k2 = foes[Math.floor(Math.random() * foes.length)];
      if (k2 === 'golem' && enemies.some(e => e.k === 'golem')) k2 = 'fireslime';
      enemies.push(mkEnemy(k2, x, y)); return;
    }
  }
  function stepEnemies(dt) {
    const free = me.inCave ? (x, y, r) => caveFree(x, y, r) : (x, y, r) => landFree(x, y, r > 0.4 ? 0.4 : 0);
    for (const e of enemies) {
      if (e.dead) continue;
      const D = e.d;
      e.t += dt; e.flash = Math.max(0, e.flash - dt);
      const dx = me.x - e.x, dy = me.y - e.y, d = Math.hypot(dx, dy), alive = me.hp > 0 && !me.inBoat;
      if (e.slow > 0) e.slow -= dt;
      const dts = dt * (e.slow > 0 ? 0.5 : 1);
      let mx = e.vx * dts, my = e.vy * dts;
      e.vx *= Math.pow(0.02, dt); e.vy *= Math.pow(0.02, dt);
      if (Math.abs(dx) > 0.2) e.fx = dx > 0 ? 1 : -1;
      if (e.stun > 0) e.stun -= dt;
      else if (D.ai === 'hop') {
        e.hop = Math.max(0, e.hop - dt);
        const per = D.frog ? 1.0 : D.big ? 1.1 : 0.85;
        if (e.hop <= 0 && e.t > per) {
          e.t = 0; e.hop = D.frog ? 0.5 : 0.4;
          let tx, ty;
          if (d < 8 && alive) { tx = dx / (d || 1); ty = dy / (d || 1); } else { const a = Math.random() * Math.PI * 2; tx = Math.cos(a) * 0.4 + (e.hx - e.x) * 0.1; ty = Math.sin(a) * 0.4 + (e.hy - e.y) * 0.1; }
          const sp = D.frog ? 4.4 : D.big ? 2.6 : 3.2; e.vx = tx * sp; e.vy = ty * sp;
        }
        if (d < (D.big ? 0.75 : 0.6) && alive) hurt(D.dmg, e.x, e.y, e);
      } else if (D.ai === 'fly') {
        e.back = Math.max(0, e.back - dt);
        let tx = e.hx + Math.cos(e.t * 1.3) * 2 - e.x, ty = e.hy + Math.sin(e.t * 1.9) * 1.5 - e.y;
        if (d < 9 && alive) { tx = dx + Math.sin(e.t * 6) * 1.2; ty = dy + Math.cos(e.t * 5) * 1.2; if (e.back > 0) { tx = -tx; ty = -ty; } }
        const l = Math.hypot(tx, ty) || 1, sp = d < 9 && alive ? 3.6 : 1.5;
        mx += tx / l * sp * dt; my += ty / l * sp * dt;
        if (d < 0.6 && e.back <= 0 && alive) { hurt(D.dmg, e.x, e.y, e); e.back = 0.8; }
      } else if (D.ai === 'chase') {
        e.cd -= dt;
        if (e.lunge > 0) { e.lunge -= dt; }
        else if (d < 9 && alive) {
          if (d < 2.4 && e.cd <= 0) { e.lunge = 0.3; e.cd = 1.4; e.vx = dx / d * 8; e.vy = dy / d * 8; }
          else if (d > 0.8) { mx += dx / d * D.sp * dt; my += dy / d * D.sp * dt; }
        } else { mx += Math.cos(e.t * 0.7 + e.hx) * 0.6 * dt; my += Math.sin(e.t * 0.9 + e.hy) * 0.6 * dt; }
        e.moving = d < 9 && alive;
        if (d < 0.65 && alive) hurt(D.dmg, e.x, e.y, e);
      } else if (D.ai === 'slam') {
        if (d < D.wake && !e.awake) { e.awake = true; if (D.boss) say(`⚠️ ${D.name} ist erwacht!`); }
        e.cd -= dt;
        if (e.wind > 0) {
          e.wind -= dt;
          if (e.wind <= 0) {
            shake = 9; e.cd = 1.8;
            for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; parts.push({ x: e.sx + Math.cos(a) * 0.5, y: e.sy + Math.sin(a) * 0.5, z: 0, vx: Math.cos(a) * 5, vy: Math.sin(a) * 3, t: 0, life: 0.5, col: e.k === 'golem' ? '#ff8a3a' : '#8a7a6a', sz: 3 }); }
            if (Math.hypot(me.x - e.sx, me.y - e.sy) < D.r) hurt(D.dmg, e.sx, e.sy);
          }
        } else if (e.awake && alive) {
          if (d < D.r + 0.4 && e.cd <= 0) { e.wind = 0.75; e.sx = e.x + dx / (d || 1) * 1.1; e.sy = e.y + dy / (d || 1) * 1.1; }
          else if (d > 1.2) { mx += dx / d * D.sp * dt; my += dy / d * D.sp * dt; }
          if (d < 0.9) hurt(1, e.x, e.y);
        }
      }
      const fly = D.ai === 'fly', rad = D.ai === 'slam' ? 0.55 : 0.3;
      if (fly || free(e.x + mx, e.y, rad)) e.x += mx; else e.vx = -e.vx * 0.3;
      if (fly || free(e.x, e.y + my, rad)) e.y += my; else e.vy = -e.vy * 0.3;
      if (fly && me.inCave && caveCell(Math.floor(e.x), Math.floor(e.y))) { e.x -= mx; e.y -= my; }
    }
    enemies = enemies.filter(e => !e.dead);
  }

  /* ---------- Höhle betreten und verlassen ---------- */
  function enterCave(spec = START_CAVE) {
    fade(() => {
      caveSpec = spec; me.caveKey = spec.key; me.caveRet = spec.ent ? [spec.ent.x, spec.ent.y] : null;
      const C = buildCave(spec);
      me.inCave = 1; me.x = C.EX + 0.5; me.y = C.EY - 0.4; me.dir = 3; me.kx = me.ky = 0;
      spawnEnemies(); mapDirty = true;
      say(spec.key === 'start' ? 'Kristallhöhle – Vorsicht, hier leben Schleime, Fledermäuse und ein Höhlentroll!' : `${spec.name} – hier haust ${EDEF[spec.boss].name === 'Sporenkönigin' ? 'die' : 'der'} ${EDEF[spec.boss].name}!`);
      lastSent = '';
    });
  }
  function leaveCave(silent) {
    const E = caveSpec.ent || caveEnt();
    me.inCave = 0; me.x = E.x; me.y = E.y + 0.7; me.dir = 0; me.kx = me.ky = 0;
    enemies = []; items.length = 0; mapDirty = true; hud.boss.style.display = 'none';
    if (!silent) say('Zurück an der frischen Luft');
    lastSent = '';
  }

  /* ---------- Spiellogik ---------- */
  function walkStep(dt, ix, iy, free, speed) {
    me.moving = ix || iy ? 1 : 0;
    if (me.moving && me.atk <= 0) {
      if (Math.abs(ix) > Math.abs(iy)) me.dir = ix < 0 ? 1 : 2; else me.dir = iy < 0 ? 3 : 0;
      const l = Math.hypot(ix, iy); me.fx = ix / l; me.fy = iy / l;
    }
    const sp = speed * dt * (me.atk > 0 ? 0.45 : 1);
    const nx = me.x + ix * sp + me.kx * dt, ny = me.y + iy * sp + me.ky * dt;
    if (free(nx, me.y)) me.x = nx;
    if (free(me.x, ny)) me.y = ny;
    me.kx *= Math.pow(0.003, dt); me.ky *= Math.pow(0.003, dt);
    if (me.moving) {
      me.ft += dt * (speed / 4.6);
      if (me.ft > 0.13) {
        me.ft = 0; me.frame = me.frame >= 4 || me.frame < 1 ? 1 : me.frame + 1;
        if (me.frame === 1 || me.frame === 3) parts.push({ x: me.x + (Math.random() - 0.5) * 0.3, y: me.y, z: 0, vx: -ix * 0.8, vy: -0.3, t: 0, life: 0.45, col: me.inCave ? '#8a7c84' : 'dust', sz: 2 });
      }
    } else me.frame = 0;
  }
  function step(dt) {
    const [ix, iy] = chatOpen || bigMap || busy || me.hp <= 0 ? [0, 0] : inputDir();
    for (const k in buff) if (buff[k] > 0) buff[k] -= dt;
    if (nearBig(me.x, me.y)) for (const w of town().walkers) { // Dorfbewohner gehen spazieren
      w.t += dt; if (w.wait > 0) { w.wait -= dt; w.moving = 0; continue; }
      const [tx, ty] = w.path[(w.seg + 1) % w.path.length], dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy);
      if (d < 0.1) { w.seg = (w.seg + 1) % w.path.length; w.wait = 1 + Math.random() * 3; continue; }
      if (Math.hypot(me.x - w.x, me.y - w.y) < 1) { w.moving = 0; continue; }
      const sp = 1.4 * dt; w.x += dx / d * Math.min(sp, d); w.y += dy / d * Math.min(sp, d); w.moving = 1;
      w.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
    }
    me.inv = Math.max(0, me.inv - dt); hurtFlash = Math.max(0, hurtFlash - dt); shake = Math.max(0, shake - dt * 30);
    if (me.atk > 0) { me.atk -= dt; if (!me.hitDone && me.atk < (me.atkT || ATK_T) * 0.6) doHits(); }
    if (me.inCave) {
      walkStep(dt, ix, iy, (x, y) => caveFree(x, y), 4.4 * (1 + 0.1 * sk('fuss')));
      stepEnemies(dt);
      const C = cave;
      for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) { const x = Math.floor(me.x) + i, y = Math.floor(me.y) + j; if (x >= 0 && y >= 0 && x < CW && y < CHH && i * i + j * j < 40) C.seen[y * CW + x] = 1; }
      for (const [x, y, k] of C.chests.map((c, i) => [c[0], c[1], i])) {
        if (cs().chests[k] && Date.now() - cs().chests[k] < 30 * 60e3) continue;
        if (Math.hypot(me.x - (x + 0.5), me.y - (y + 0.7)) < 0.95) {
          cs().chests[k] = Date.now(); saveCave();
          const n = 8 + Math.floor(Math.random() * 8); for (let i = 0; i < n; i++) drop(x + 0.5, y + 0.9, 'coin');
          say('📦 Schatztruhe geöffnet!'); shake = 3; gainXP(15, x + 0.5, y);
        }
      }
      if (me.y > C.EY + 0.35 && !busy) fade(() => leaveCave());
    }
    if (!me.inCave) {
      spawnOver(dt); stepEnemies(dt);
      regenT += dt; if (regenT > 4) { regenT = 0; if (me.hp < maxHp() && !enemies.some(e => Math.hypot(e.x - me.x, e.y - me.y) < 9)) me.hp++; }
    }
    if (me.inCave) { /* schon erledigt */ } else if (!me.inBoat) {
      const wade = elev(me.x, me.y) < 0;
      walkStep(dt, ix, iy, walkable, (wade && !sk('schwimm') ? 2.4 : 4.6) * (1 + 0.1 * sk('fuss')) * (buff.tempo > 0 ? 1.25 : 1));
      nearSt = null; for (const st of stations()) if (Math.hypot(me.x - st.x, me.y - (st.y + 0.3)) < 1.9) nearSt = st;
      nearNpc = null; nearWalker = null; baseNear = nearBig(me.x, me.y) ? findBaseNear() : null; updateBuildCursor();
      if (nearBig(me.x, me.y)) { const T = town(); for (const n of T.npcs) if (Math.hypot(me.x - n.x, me.y - n.y) < 1.8) nearNpc = n; for (const w of T.walkers) if (Math.hypot(me.x - w.x, me.y - w.y) < 1.4) nearWalker = w; }
      for (const { spec, e: E } of entsNear(me.x, me.y)) if (Math.abs(me.x - E.x) < 0.42 && me.y < E.y - 0.2 && me.y > E.y - 1.2 && !busy) enterCave(spec);
    } else {
      const w = wind();
      if (ix || iy) {
        const want = Math.atan2(iy, ix), d = wrap(want - boat.h), turn = 1.9 * dt * Math.min(1, Math.hypot(ix, iy) + 0.3) * (sk('kapitaen') ? 2 : 1) * (gear('rumpf') ? 1.5 : 1);
        boat.h = wrap(boat.h + Math.max(-turn, Math.min(turn, d)));
      }
      let target = 0;
      if (boat.sail) target = 6.2 * w.s * polar(wrap(boat.h - w.a), sk('wind')) * (1 + 0.12 * sk('boot')) * (1 + 0.1 * gear('segel')) * (buff.tempo > 0 ? 1.25 : 1) * (sk('kapitaen') ? 1.2 : 1) * (sk('sturm') && w.s > 0.85 ? 1.25 : 1);
      else if (ix || iy) target = 1.6 * (sk('paddel') ? 1.5 : 1);
      boat.v += (target - boat.v) * Math.min(1, dt * (target > boat.v ? 0.7 : 1.2));
      const nx = boat.x + Math.cos(boat.h) * boat.v * dt, ny = boat.y + Math.sin(boat.h) * boat.v * dt;
      const bx = nx + Math.cos(boat.h) * 0.9, by = ny + Math.sin(boat.h) * 0.9;
      if (sailable(bx, by) && sailable(nx, ny)) { boat.x = nx; boat.y = ny; }
      else { if (boat.v > 1.5) say('Auf Grund gelaufen! Dreh das Boot oder geh an Land (⚓)'); boat.v = 0; }
      me.x = boat.x; me.y = boat.y; me.moving = boat.v > 0.2 ? 1 : 0;
      if (boat.v > 0.8 && Math.random() < dt * boat.v * 4) wake.push({ x: boat.x - Math.cos(boat.h) * 0.9 + (Math.random() - 0.5) * 0.4, y: boat.y - Math.sin(boat.h) * 0.9 + (Math.random() - 0.5) * 0.4, t: 0 });
    }
    // Beute einsammeln
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; it.t += dt;
      it.vz -= 18 * dt; it.z += it.vz * dt; if (it.z < 0) { it.z = 0; it.vz = -it.vz * 0.45; it.vx *= 0.6; it.vy *= 0.6; }
      const dx = me.x - it.x, dy = me.y - it.y, d = Math.hypot(dx, dy);
      if (it.t > 0.5 && d < (sk('magnet') ? 5 : 2.2)) { it.vx += dx / d * 30 * dt; it.vy += dy / d * 30 * dt; }
      const nx = it.x + it.vx * dt, ny = it.y + it.vy * dt;
      if (!me.inCave || caveFree(nx, ny, 0.1) || (it.t > 0.5 && d < 2.6)) { it.x = nx; it.y = ny; }
      if (it.t > 0.4 && d < 0.5) {
        items.splice(i, 1);
        if (it.k === 'coin') { me.coins++; texts.push({ x: me.x, y: me.y - 1.6, s: '+1', t: 0, col: '#ffd27a' }); }
        else if (it.k === 'karte') newMap();
        else if (it.k === 'heart') { me.hp = Math.min(maxHp(), me.hp + 2); texts.push({ x: me.x, y: me.y - 1.6, s: '♥', t: 0, col: '#ff6a7a' }); }
        else if (RES[it.k]) { bag[it.k] = (bag[it.k] || 0) + 1; texts.push({ x: me.x, y: me.y - 1.6, s: '+1 ' + RES[it.k][1], t: 0, col: '#ffffff' }); if (bagOpen) renderBag(); }
      } else if (it.t > 40) items.splice(i, 1);
    }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.1, dt); p.vy *= Math.pow(0.1, dt); if (p.t > p.life) parts.splice(i, 1); }
    for (let i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 0.9) texts.splice(i, 1); }
    for (let i = wake.length - 1; i >= 0; i--) { wake[i].t += dt; if (wake[i].t > 1.6) wake.splice(i, 1); }
    for (const o of others.values()) { const k = Math.min(1, dt * 8); for (const f of ['x', 'y', 'bx', 'by']) o[f] += (o.t[f] - o[f]) * k; o.bh += wrap(o.t.bh - o.bh) * k; o.ft += dt; if (o.atk) o.at = (o.at || 0) + dt; else o.at = 0; }
    sendT += dt; saveT += dt;
    if (sendT > 0.2) {
      sendT = 0;
      const s = stateArr().map(v => Math.round(v * 100) / 100), k = JSON.stringify(s);
      if (k !== lastSent && myId && typeof send === 'function') { lastSent = k; send({ t: 'i_s', s }); }
    }
    if (saveT > 3) { saveT = 0; save(); }
  }

  /* ---------- Zeichnen ---------- */
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function shadow(x, y, rx, a = 0.25) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.38, 0, 0, Math.PI * 2); ctx.fill(); }
  function drawBoat(x, y, h, sail, col, v, t, withMe) {
    const u = TP * S;
    ctx.save(); ctx.translate(x, y); ctx.rotate(h);
    const L = u * 1.1, B = u * 0.42;
    ctx.fillStyle = 'rgba(0,20,50,.28)'; ctx.beginPath(); ctx.ellipse(u * 0.06, u * 0.1, L, B * 1.05, 0, 0, Math.PI * 2); ctx.fill();
    if (v > 0.5) { ctx.strokeStyle = 'rgba(230,248,255,.7)'; ctx.lineWidth = S; ctx.beginPath(); ctx.moveTo(L * 0.6, -B * 1.1); ctx.quadraticCurveTo(L * 1.05, 0, L * 0.6, B * 1.1); ctx.stroke(); }
    ctx.fillStyle = '#4a2e18'; ctx.beginPath(); ctx.moveTo(L + S, 0); ctx.quadraticCurveTo(L * 0.4, -B * 1.25, -L * 0.88, -B - S); ctx.lineTo(-L * 0.93, B + S); ctx.quadraticCurveTo(L * 0.4, B * 1.25, L + S, 0); ctx.fill();
    ctx.fillStyle = '#6b4426'; ctx.beginPath(); ctx.moveTo(L, 0); ctx.quadraticCurveTo(L * 0.4, -B * 1.15, -L * 0.85, -B); ctx.lineTo(-L * 0.9, B); ctx.quadraticCurveTo(L * 0.4, B * 1.15, L, 0); ctx.fill();
    ctx.fillStyle = '#a8743f'; ctx.beginPath(); ctx.moveTo(L * 0.86, 0); ctx.quadraticCurveTo(L * 0.35, -B * 0.85, -L * 0.75, -B * 0.72); ctx.lineTo(-L * 0.78, B * 0.72); ctx.quadraticCurveTo(L * 0.35, B * 0.85, L * 0.86, 0); ctx.fill();
    ctx.fillStyle = '#8a5a34'; for (let i = -2; i <= 2; i++) ctx.fillRect(-L * 0.7, i * B * 0.28 - S / 2, L * 1.35, S * 0.6);
    if (withMe) {
      ctx.fillStyle = SHIRTS[col % 8]; ctx.beginPath(); ctx.arc(-L * 0.45, 0, u * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c39a'; ctx.beginPath(); ctx.arc(-L * 0.45, 0, u * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = HAIRS[col % 4]; ctx.beginPath(); ctx.arc(-L * 0.48, 0, u * 0.1, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
    }
    const mx = L * 0.25, w = wind(t), rel = wrap(w.a - h), side = Math.sin(rel) >= 0 ? 1 : -1;
    if (sail) {
      const k = 0.25 + 1.15 * (1 - Math.abs(rel) / Math.PI), ba = Math.PI - side * k, bl = L * 1.05;
      const ex = mx + Math.cos(ba) * bl, ey = Math.sin(ba) * bl, nxp = -Math.sin(ba) * side, nyp = Math.cos(ba) * side, bulge = u * 0.35 * w.s;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(mx + S * 2, S * 2); ctx.quadraticCurveTo((mx + ex) / 2 + nxp * bulge * 2 + S * 2, ey / 2 + nyp * bulge * 2 + S * 2, ex + S * 2, ey + S * 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f6efe0'; ctx.beginPath(); ctx.moveTo(mx, 0); ctx.quadraticCurveTo((mx + ex) / 2 + nxp * bulge * 2, ey / 2 + nyp * bulge * 2, ex, ey); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = SHIRTS[col % 8]; ctx.lineWidth = S * 1.2; ctx.beginPath(); ctx.moveTo(mx + (ex - mx) * 0.55, ey * 0.55); ctx.lineTo(mx + (ex - mx) * 0.55 + nxp * bulge * 0.9, ey * 0.55 + nyp * bulge * 0.9); ctx.stroke();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = S; ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(ex, ey); ctx.stroke();
    } else {
      ctx.fillStyle = '#e8dcc2'; ctx.fillRect(-L * 0.55, -S, mx + L * 0.55, S * 2.2);
      ctx.fillStyle = SHIRTS[col % 8]; ctx.fillRect(-L * 0.2, -S, S * 2, S * 2.2);
    }
    ctx.fillStyle = '#4a2e18'; ctx.beginPath(); ctx.arc(mx, 0, S * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function nameTag(x, y, name, gold) {
    ctx.font = `600 ${Math.round(4.2 * S)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const w = ctx.measureText(name).width + 4 * S;
    ctx.fillStyle = gold ? 'rgba(227,169,43,.85)' : 'rgba(14,22,40,.7)'; roundRect(x - w / 2, y - 6 * S, w, 6 * S, 2 * S); ctx.fill();
    ctx.fillStyle = gold ? '#2a1608' : '#fff'; ctx.fillText(name, x, y - 0.7 * S);
  }
  function bubble(x, y, text) {
    ctx.font = `500 ${Math.round(4.4 * S)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const t = text.length > 40 ? text.slice(0, 39) + '…' : text, w = ctx.measureText(t).width + 6 * S;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(x - w / 2, y - 8 * S, w, 7 * S, 3 * S); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 2 * S, y - 1.2 * S); ctx.lineTo(x, y + 0.8 * S); ctx.lineTo(x + 2 * S, y - 1.2 * S); ctx.fill();
    ctx.fillStyle = '#1a1a22'; ctx.fillText(t, x, y - 2.2 * S);
  }
  // Figur mit Schatten, Watten im Wasser, Schwerthieb
  function drawPlotSign(pl, ox, oy, u) {
    const x = ox + (pl.x + 1) * u, y = oy + (pl.y + 0.7) * u, own = plotOwner(pl.id);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - S, y - 10 * S, 2 * S, 10 * S);
    ctx.fillStyle = '#3a2414'; ctx.fillRect(x - 8.5 * S, y - 15.5 * S, 17 * S, 8 * S); ctx.fillStyle = own ? '#e8d4a8' : '#c8f0b8'; ctx.fillRect(x - 8 * S, y - 15 * S, 16 * S, 7 * S);
    ctx.fillStyle = '#2a1608'; ctx.font = `700 ${Math.round(3.6 * S)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(own ? (own.length > 9 ? own.slice(0, 8) + '…' : own) : 'Frei', x, y - 11.4 * S);
  }
  const plotOwner = id => (PLOTS[id] ? PLOTS[id].n : null);
  function drawPerson(x, y, col, dir, frame, wade, t, atkP, blink, whirl, tier, hat) {
    swordTier = tier || 0;
    const sp = charSprite(col, dir, frame), w = 16 * S, h = 24 * S, top = y - 23 * S;
    const fx = DIRV[dir][0], fy = DIRV[dir][1];
    if (!wade) shadow(x, y - S * 0.5, 5.5 * S, 0.28);
    if (atkP != null && dir === 3) drawSword(x, y, dir, atkP);
    if (blink && Math.floor(t / 80) % 2) ctx.globalAlpha = 0.45;
    if (wade) {
      ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, top, w, h - 7 * S); ctx.clip();
      ctx.drawImage(sp, x - w / 2, top + 3 * S, w, h); ctx.restore();
      ctx.strokeStyle = 'rgba(230,248,255,.75)'; ctx.lineWidth = S; ctx.beginPath(); ctx.ellipse(x, y - 4 * S, 6 * S + Math.sin(t / 200) * S, 2 * S, 0, 0, Math.PI * 2); ctx.stroke();
    } else ctx.drawImage(sp, x - w / 2, top, w, h);
    if (hat && hat !== 'none') drawHat(x, top + (frame === 2 || frame === 4 ? -S : 0), dir, hat);
    ctx.globalAlpha = 1;
    if (atkP != null && dir !== 3) drawSword(x, y, dir, atkP);
    if (atkP != null && whirl) { ctx.strokeStyle = `rgba(180,230,255,${0.6 * (1 - atkP)})`; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.ellipse(x, y - 8 * S, (10 + atkP * 14) * S, (6 + atkP * 8) * S, 0, 0, Math.PI * 2 * Math.min(1, atkP * 1.5)); ctx.stroke(); }
    void fx; void fy;
  }
  let swordTier = 0;
  function drawSword(x, y, dir, p) {
    const base = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][dir], side = dir === 1 ? -1 : 1;
    const a = base - side * 1.3 + side * 2.6 * Math.min(1, p * 1.4);
    const cx = x + DIRV[dir][0] * 2 * S, cy = y - 10 * S + DIRV[dir][1] * 2 * S, len = 13 * S;
    // Schwung-Spur
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - p)})`; ctx.lineWidth = 4 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, len * 0.85, side > 0 ? base - 1.3 : a, side > 0 ? a : base + 1.3); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(0, -S, 3 * S, 2 * S);
    ctx.fillStyle = '#d9b25a'; ctx.fillRect(3 * S, -2.5 * S, S * 1.5, 5 * S);
    const bl = ['#dfe6ee', '#b8b4ac', '#8fe4ff', '#8a5ad8', '#ff5a2a'][Math.min(4, swordTier)], hl = ['#ffffff', '#e0dcd4', '#e8fbff', '#d0b0ff', '#ffd080'][Math.min(4, swordTier)];
    ctx.fillStyle = bl; ctx.fillRect(4.5 * S, -S, len - 5 * S, 2 * S);
    ctx.fillStyle = hl; ctx.fillRect(4.5 * S, -S, len - 5 * S, S * 0.7);
    ctx.fillStyle = bl; ctx.beginPath(); ctx.moveTo(len - 0.5 * S, -S); ctx.lineTo(len + 1.5 * S, 0); ctx.lineTo(len - 0.5 * S, S); ctx.fill();
    ctx.restore(); ctx.lineCap = 'butt';
  }
  function drawObj(o, ox, oy, u, t) {
    const x = ox + o.x * u, y = oy + o.y * u;
    if (o.tx != null && isCut(o.tx, o.ty)) {
      if (TREES.has(o.k)) { shadow(x, y - S, 4 * S, 0.2); ctx.fillStyle = '#3a2414'; ctx.fillRect(x - 3 * S, y - 5 * S, 6 * S, 4 * S); ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 2.5 * S, y - 4.5 * S, 5 * S, 3 * S); ctx.fillStyle = '#d8b07a'; ctx.fillRect(x - 2 * S, y - 5 * S, 4 * S, S); }
      return;
    }
    const sp = o.k === 'ent' ? SPR.ent : o.k === 'st' ? SPR.st[o.st] : SPR[o.k][o.v];
    const dx = Math.round(x - sp.ax * S), dy = Math.round(y - sp.ay * S), w = sp.w * S, h = sp.h * S;
    shadow(x, y - S, sp.sw * S, 0.24);
    ctx.drawImage(sp.trunk, dx, dy, w, h);
    if (sp.crown) {
      const ws = wind(t / 1000).s, sway = Math.round(Math.sin(t / 1000 * 1.6 + o.x * 0.9 + o.y * 0.4) * 0.9 * ws * S);
      const behind = !me.inBoat && Math.abs(me.x - o.x) < 1.2 && me.y < o.y - 0.2 && me.y > o.y - 2.6;
      if (behind) ctx.globalAlpha = 0.55;
      ctx.drawImage(sp.crown, dx + sway, dy, w, h);
      ctx.globalAlpha = 1;
    }
    if (sp.torches) for (const [tx, ty] of sp.torches) flame(dx + tx * S, dy + ty * S, t, 1);
    if (sp.fire) flame(dx + sp.fire[0] * S, dy + sp.fire[1] * S, t, 0.8);
    if (sp.steam) for (let i = 0; i < 3; i++) { const ph = ((t / 1400 + i / 3) % 1); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; ctx.fillRect(dx + (sp.steam[0] + Math.sin(ph * 6 + i) * 2) * S, dy + (sp.steam[1] - ph * 9) * S, 2 * S, 2 * S); }
    if (o.k === 'st' && nearSt && nearSt.k === o.st) { ctx.font = `700 ${Math.round(4.6 * S)}px system-ui,sans-serif`; const tx2 = (coarse ? '' : 'E – ') + STATIONS[o.st][1], tw = ctx.measureText(tx2).width + 5 * S; ctx.fillStyle = 'rgba(14,22,40,.8)'; roundRect(x - tw / 2, dy - 9 * S, tw, 7 * S, 2.5 * S); ctx.fill(); ctx.fillStyle = '#ffd27a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tx2, x, dy - 5.5 * S); }
  }
  function flame(x, y, t, k) {
    const f = Math.sin(t / 70 + x) * 0.5 + Math.sin(t / 43 + y) * 0.5;
    ctx.fillStyle = 'rgba(255,170,60,.25)'; ctx.beginPath(); ctx.arc(x, y - 2 * S, (6 + f) * S * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x - 1.5 * S, y - (4 + f) * S, 3 * S, (4 + f) * S);
    ctx.fillStyle = '#ffd25a'; ctx.fillRect(x - 0.5 * S, y - (3 + f * 0.5) * S, S, (3 + f * 0.5) * S);
  }
  function drawParts(ox, oy, u) {
    for (const p of parts) {
      const a = 1 - p.t / p.life; ctx.globalAlpha = Math.max(0, a);
      const col = p.col === 'dust' ? (elev(p.x, p.y) < 0.1 ? '#f2e2b4' : '#c9dca0') : p.col;
      ctx.fillStyle = col; const s = p.sz * S * (p.col === 'dust' ? 0.6 + p.t * 2 : 1);
      ctx.fillRect(Math.round(ox + p.x * u - s / 2), Math.round(oy + p.y * u - s / 2 - p.t * 6 * S), s, s);
    }
    ctx.globalAlpha = 1;
    ctx.font = `800 ${Math.round(5.5 * S)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const tx of texts) {
      ctx.globalAlpha = Math.max(0, 1 - tx.t / 0.9);
      const x = ox + tx.x * u, y = oy + tx.y * u - tx.t * 14 * S;
      ctx.lineWidth = S * 1.2; ctx.strokeStyle = '#1a1420'; ctx.strokeText(tx.s, x, y); ctx.fillStyle = tx.col; ctx.fillText(tx.s, x, y);
    }
    ctx.globalAlpha = 1;
  }
  function drawItem(it, ox, oy, u, t) {
    const x = Math.round(ox + it.x * u), y = Math.round(oy + it.y * u), z = it.z * u * 0.4;
    shadow(x, y, 2.5 * S, 0.3);
    const by = y - z - 3 * S + Math.sin(t / 250 + it.x) * (it.z === 0 ? S * 0.6 : 0);
    if (it.k === 'coin') {
      const sq = Math.abs(Math.cos(t / 180 + it.x * 3));
      ctx.fillStyle = '#9a6a10'; ctx.fillRect(x - 3 * S * sq - S * 0.5, by - 3 * S, (6 * sq + 1) * S, 6 * S);
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - 2.5 * S * sq, by - 2.5 * S, 5 * S * sq, 5 * S);
      ctx.fillStyle = '#fff3b0'; ctx.fillRect(x - 1.5 * S * sq, by - 2 * S, S * sq, 2 * S);
    } else if (it.k === 'karte') {
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 4.5 * S, by - 3.5 * S, 9 * S, 7 * S); ctx.fillStyle = '#f0e0b0'; ctx.fillRect(x - 4 * S, by - 3 * S, 8 * S, 6 * S);
      ctx.strokeStyle = '#d8302a'; ctx.lineWidth = S; ctx.beginPath(); ctx.moveTo(x - S, by - S); ctx.lineTo(x + 2 * S, by + 2 * S); ctx.moveTo(x + 2 * S, by - S); ctx.lineTo(x - S, by + 2 * S); ctx.stroke();
    } else if (it.k !== 'heart') {
      const c = RES[it.k] ? RES[it.k][2] : '#fff';
      if (it.k === 'holz') { ctx.fillStyle = '#3a2414'; ctx.fillRect(x - 4.5 * S, by - 2.5 * S, 9 * S, 5 * S); ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 4 * S, by - 2 * S, 8 * S, 4 * S); ctx.fillStyle = '#d8b07a'; ctx.fillRect(x + 2 * S, by - 2 * S, 2 * S, 4 * S); ctx.fillStyle = '#a8743f'; ctx.fillRect(x - 4 * S, by - 2 * S, 6 * S, S); }
      else { ctx.fillStyle = '#1a1420'; ctx.fillRect(x - 3.5 * S, by - 3.5 * S, 7 * S, 7 * S); ctx.fillStyle = c; ctx.fillRect(x - 3 * S, by - 3 * S, 6 * S, 6 * S); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 2 * S, by - 2 * S, 2 * S, S); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 3 * S, by + 2 * S, 6 * S, S); }
    } else {
      ctx.fillStyle = '#7a1020'; for (const [a, b, w, h] of [[-3, -2, 3, 3], [0, -2, 3, 3], [-3, 0, 6, 2], [-2, 2, 4, 1], [-1, 3, 2, 1]]) ctx.fillRect(x + a * S - S * 0.5, by + b * S - S * 0.5, w * S + S, h * S + S);
      ctx.fillStyle = '#ff4d5e'; for (const [a, b, w, h] of [[-3, -2, 3, 3], [0, -2, 3, 3], [-3, 0, 6, 2], [-2, 2, 4, 1], [-1, 3, 2, 1]]) ctx.fillRect(x + a * S, by + b * S, w * S, h * S);
      ctx.fillStyle = '#ffc0c8'; ctx.fillRect(x - 2 * S, by - S, S, S);
    }
  }
  function drawEnemy(e, ox, oy, u, t) {
    const D = e.d, x = Math.round(ox + e.x * u), y = Math.round(oy + e.y * u), fl = e.flash > 0;
    const P = (top, a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a * S, top + b * S, w * S, h * S); };
    if (D.ai === 'hop') {
      const k = D.big ? 1.35 : 1, dur = D.frog ? 0.5 : 0.4, ph = e.hop > 0 ? Math.sin((1 - e.hop / dur) * Math.PI) : 0, z = ph * (D.frog ? 10 : 6) * S;
      shadow(x, y, 5 * S * k * (1 - ph * 0.3), 0.3);
      if (D.frog) {
        const by = y - z - 5 * S, c = fl ? '#fff' : D.c[1], cd = fl ? '#fff' : D.c[0];
        ctx.fillStyle = cd; ctx.beginPath(); ctx.ellipse(x, by, 7 * S, 5 * S, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, by, 6 * S, 4 * S, 0, 0, Math.PI * 2); ctx.fill();
        const leg = ph * 3 * S; ctx.fillStyle = cd; ctx.fillRect(x - 8 * S - leg, by + S, 3 * S, 3 * S + leg); ctx.fillRect(x + 5 * S + leg, by + S, 3 * S, 3 * S + leg);
        for (const sd of [-1, 1]) { ctx.fillStyle = cd; ctx.fillRect(x + sd * 3.5 * S - 2 * S, by - 6 * S, 4 * S, 4 * S); ctx.fillStyle = '#fff'; ctx.fillRect(x + sd * 3.5 * S - 1.5 * S, by - 5.5 * S, 3 * S, 3 * S); ctx.fillStyle = '#111'; ctx.fillRect(x + sd * 3.5 * S - 0.5 * S + e.fx * 0.5 * S, by - 4.5 * S, 1.5 * S, 1.5 * S); }
        ctx.fillStyle = '#f4e04d'; ctx.fillRect(x - 3 * S, by - S, S, S); ctx.fillRect(x + 2 * S, by + S, S, S); ctx.fillRect(x - S, by + 2 * S, S, S);
        return;
      }
      if (D.shroom) {
        const sq = e.hop > 0 ? ph * 0.2 : Math.sin(t / 200 + e.hx) * 0.06, by = y - z;
        ctx.fillStyle = fl ? '#fff' : '#e8dcc6'; ctx.fillRect(x - 3 * S, by - 7 * S, 6 * S, 6 * S);
        ctx.fillStyle = '#2a2020'; ctx.fillRect(x - 3 * S, by - S - (ph ? S : 0), 2 * S, S + (ph ? S : 0)); ctx.fillRect(x + S, by - S, 2 * S, S);
        ctx.fillStyle = '#111'; ctx.fillRect(x - 2 * S + e.fx * 0.5 * S, by - 5 * S, S, 2 * S); ctx.fillRect(x + S + e.fx * 0.5 * S, by - 5 * S, S, 2 * S);
        ctx.fillStyle = fl ? '#fff' : D.c[0]; ctx.beginPath(); ctx.ellipse(x, by - 8 * S, 7.5 * S * (1 + sq), 5 * S, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = fl ? '#fff' : D.c[1]; ctx.beginPath(); ctx.ellipse(x, by - 8.5 * S, 6.5 * S * (1 + sq), 4.2 * S, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#ffe8ff'; ctx.fillRect(x - 4 * S, by - 11 * S, 2 * S, 2 * S); ctx.fillRect(x + S, by - 12 * S, 2 * S, S); ctx.fillRect(x + 3 * S, by - 10 * S, S, S);
        return;
      }
      const sq = e.hop > 0 ? -ph * 0.25 : Math.sin(t / 180 + e.hx) * 0.08;
      const w = 7 * S * k * (1 - sq), h = 5.5 * S * k * (1 + sq), by = y - z - h * 0.9;
      if (e.k === 'fireslime') { ctx.fillStyle = 'rgba(255,120,30,.25)'; ctx.beginPath(); ctx.arc(x, by, w * 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = fl ? '#fff' : D.c[0]; ctx.beginPath(); ctx.ellipse(x, by, w + S, h + S, 0, Math.PI, 0); ctx.lineTo(x + w + S, by + h * 0.8); ctx.quadraticCurveTo(x, by + h * 1.25, x - w - S, by + h * 0.8); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : D.c[1]; ctx.beginPath(); ctx.ellipse(x, by, w, h, 0, Math.PI, 0); ctx.lineTo(x + w, by + h * 0.75); ctx.quadraticCurveTo(x, by + h * 1.15, x - w, by + h * 0.75); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - w * 0.55, by - h * 0.6, 2 * S, 1.5 * S);
      if (e.k === 'fireslime') { ctx.fillStyle = '#ffe080'; ctx.fillRect(x - S, by - h - S - Math.abs(Math.sin(t / 90)) * 2 * S, 2 * S, 2 * S); }
      const lx = Math.max(-1, Math.min(1, me.x - e.x)) * S;
      ctx.fillStyle = '#14101a'; ctx.fillRect(x - 3 * S * k + lx, by - S, 1.5 * S, 2.5 * S); ctx.fillRect(x + 1.5 * S * k + lx, by - S, 1.5 * S, 2.5 * S);
    } else if (D.ai === 'fly') {
      const z = (9 + Math.sin(t / 160 + e.hx) * 2) * S, f = Math.sin(t / (D.moth ? 70 : 45) + e.hx * 5), by = y - z;
      shadow(x, y, 3.5 * S, 0.22);
      const body = fl ? '#fff' : D.c[0], wing = fl ? '#fff' : D.c[1];
      if (D.moth) {
        ctx.fillStyle = 'rgba(220,180,255,.25)'; ctx.beginPath(); ctx.arc(x, by, 9 * S, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = wing; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sd * 4 * S, by - 2 * S, 4 * S * Math.abs(f) + S, 4 * S, sd * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + sd * 3 * S, by + 2.5 * S, 2.5 * S * Math.abs(f) + S, 2.5 * S, -sd * 0.3, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = body; ctx.fillRect(x - S, by - 4 * S, 2 * S, 8 * S);
        ctx.fillStyle = '#fff6a0'; ctx.fillRect(x - S, by + 3 * S, 2 * S, 2 * S);
        return;
      }
      ctx.fillStyle = wing;
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sd * 2 * S, by); ctx.lineTo(x + sd * 9 * S, by - 4 * S * f); ctx.lineTo(x + sd * 7 * S, by + 2 * S - 2 * S * f); ctx.lineTo(x + sd * 4 * S, by + 2 * S); ctx.fill(); }
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, by, 3 * S, 3.5 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 3 * S, by - 5 * S, 2 * S, 2 * S); ctx.fillRect(x + S, by - 5 * S, 2 * S, 2 * S);
      ctx.fillStyle = '#ff3a3a'; ctx.fillRect(x - 2 * S, by - S, S, S); ctx.fillRect(x + S, by - S, S, S);
    } else if (D.ai === 'chase') {
      shadow(x, y, 7 * S, 0.3);
      ctx.save(); ctx.translate(x, y); ctx.scale(e.fx, 1);
      const c = fl ? '#fff' : D.c[1], cd = fl ? '#fff' : D.c[0], run = e.moving || e.lunge > 0 ? Math.sin(t / 60) : 0;
      const Q = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(a * S, b * S, w * S, h * S); };
      if (D.wolf) {
        Q(-7, -5 + run, 2, 5 - run, cd); Q(-4, -5 - run, 2, 5 + run, cd); Q(3, -5 - run, 2, 5 + run, cd); Q(6, -5 + run, 2, 5 - run, cd);
        Q(-9, -11, 17, 7, cd); Q(-8, -10, 15, 5, c); Q(-8, -10, 15, 1, '#ffffff');
        Q(-13, -12 + (run > 0 ? 1 : 0), 5, 2, cd); Q(-14, -13, 3, 2, c);
        Q(6, -15, 7, 7, cd); Q(7, -14, 5, 5, c); Q(12, -12, 3, 3, c); Q(14, -12, 1, 1, '#111'); Q(7, -17, 2, 3, cd); Q(10, -17, 2, 3, cd);
        Q(10, -13, 1, 1, e.lunge > 0 ? '#ff3a3a' : '#2a6aff');
        if (e.lunge > 0) { Q(12, -9, 3, 1, '#fff'); }
      } else {
        // Skorpion
        for (let i = 0; i < 3; i++) { const lg = (i % 2 ? run : -run); Q(-4 + i * 3, -2 + lg * 0.5, 1, 3, cd); Q(-4 + i * 3, -7 - lg * 0.5, 1, 3, cd); }
        Q(-7, -7, 12, 6, cd); Q(-6, -6, 10, 4, c); Q(-6, -6, 10, 1, '#f0c080');
        Q(4, -9, 5, 2, cd); Q(8, -11, 3, 3, c); Q(4, -1, 5, 2, cd); Q(8, -1, 3, 3, c); Q(10, -11, 2, 1, cd); Q(10, 1, 2, 1, cd);
        const st = e.lunge > 0 ? 3 : Math.sin(t / 200) * 0.6;
        Q(-10, -6, 3, 2, cd); Q(-12, -9, 3, 3, c); Q(-11, -13 - st, 3, 4, c); Q(-9, -15 - st, 3, 2, c); Q(-6, -15 - st, 2, 2, '#3a1a08'); Q(-5, -14 - st, 1, 2, '#ffe0a0');
        Q(3, -5, 1, 1, '#111');
      }
      ctx.restore();
    } else if (e.k === 'golem') {
      if (e.wind > 0) {
        const p = 1 - e.wind / 0.75, sx = ox + e.sx * u, sy = oy + e.sy * u;
        ctx.strokeStyle = `rgba(255,90,20,${0.4 + p * 0.5})`; ctx.lineWidth = S; ctx.fillStyle = `rgba(255,90,20,${0.12 + p * 0.15})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, D.r * u * p, D.r * u * p * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(sx, sy, D.r * u, D.r * u * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
      shadow(x, y, 10 * S, 0.35);
      const bob = Math.round(Math.sin(t / 260) * S), top = y - 26 * S + bob, rk = fl ? '#fff' : '#3a2e2c', rk2 = fl ? '#fff' : '#5a4440', lava = fl ? '#fff' : `rgb(255,${120 + Math.round(Math.sin(t / 120) * 40)},30)`;
      const raise = e.wind > 0 ? 1 - e.wind / 0.75 : 0;
      P(top, -7, 19, 5, 7, rk); P(top, 2, 19, 5, 7, rk);
      P(top, -10, 6, 20, 15, rk); P(top, -9, 7, 18, 12, rk2); P(top, -3, 9, 1, 6, lava); P(top, -3, 12, 5, 1, lava); P(top, 3, 8, 1, 4, lava);
      P(top, -6, 0, 12, 8, rk); P(top, -5, 1, 10, 6, rk2); P(top, -4, 3, 3, 2, lava); P(top, 1, 3, 3, 2, lava);
      P(top, -14, 7 - raise * 8, 5, 12, rk); P(top, 9, 7 - raise * 8, 5, 12, rk); P(top, -14, 17 - raise * 8, 5, 3, rk2); P(top, 9, 17 - raise * 8, 5, 3, rk2);
    } else if (D.look) {
      // neue Bosse in den Höhlen der Inselarten
      if (e.wind > 0) {
        const p = 1 - e.wind / 0.75, sx = ox + e.sx * u, sy = oy + e.sy * u;
        ctx.strokeStyle = `rgba(255,60,40,${0.4 + p * 0.5})`; ctx.lineWidth = S; ctx.fillStyle = `rgba(255,60,40,${0.12 + p * 0.15})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, D.r * u * p, D.r * u * p * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(sx, sy, D.r * u, D.r * u * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
      const c0 = fl ? '#fff' : D.c[0], c1 = fl ? '#fff' : D.c[1], raise = e.wind > 0 ? 1 - e.wind / 0.75 : 0, bob = Math.sin(t / 240) * S;
      shadow(x, y, 15 * S, 0.35);
      const E2 = (a, b, rx, ry, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + a * S, y + b * S + bob, rx * S, ry * S, 0, 0, Math.PI * 2); ctx.fill(); };
      if (D.look === 'wurm') {
        for (let i = 4; i >= 0; i--) { const a = Math.sin(t / 300 + i * 0.8) * 3 * (i / 4); E2(a, -i * 7 - raise * 6, 9 - i * 0.6 + 1, 6, '#3a2410'); E2(a, -i * 7 - raise * 6, 9 - i * 0.6, 5.2, i % 2 ? c0 : c1); }
        const hy = -34 - raise * 8; E2(0, hy, 9, 8, '#3a2410'); E2(0, hy, 8, 7, c1); E2(0, hy + 3, 6, 3, '#2a0a0a');
        for (let i = -2; i <= 2; i++) { ctx.fillStyle = '#f0ead6'; ctx.fillRect(x + (i * 2.2 - 0.6) * S, y + (hy + 1) * S + bob, 1.2 * S, 2 * S); }
        E2(-4, hy - 4, 1.6, 1.6, '#ff3a2a'); E2(4, hy - 4, 1.6, 1.6, '#ff3a2a');
      } else if (D.look === 'wyrm') {
        const fw = Math.sin(t / 180) * 4 + raise * 6;
        for (const sd of [-1, 1]) { ctx.fillStyle = c0; ctx.beginPath(); ctx.moveTo(x + sd * 6 * S, y - 18 * S + bob); ctx.lineTo(x + sd * 26 * S, y - (30 + fw) * S + bob); ctx.lineTo(x + sd * 22 * S, y - 12 * S + bob); ctx.lineTo(x + sd * 10 * S, y - 10 * S + bob); ctx.fill(); }
        E2(0, -14, 12, 10, '#1a0a0a'); E2(0, -14, 11, 9, c0); E2(0, -11, 7, 6, c1);
        ctx.strokeStyle = c0; ctx.lineWidth = 4 * S; ctx.beginPath(); ctx.moveTo(x + 8 * S, y - 8 * S + bob); ctx.quadraticCurveTo(x + 20 * S, y - 2 * S, x + 18 * S + Math.sin(t / 300) * 4 * S, y - 12 * S); ctx.stroke();
        const hy = -30 - raise * 6; E2(0, hy, 8, 7, '#1a0a0a'); E2(0, hy, 7, 6, c0); E2(0, hy + 4, 5, 3, c1);
        ctx.fillStyle = '#f0ead6'; ctx.fillRect(x - 6 * S, y + (hy - 9) * S + bob, 2 * S, 4 * S); ctx.fillRect(x + 4 * S, y + (hy - 9) * S + bob, 2 * S, 4 * S);
        E2(-3, hy - 1, 1.5, 1.5, '#ffe060'); E2(3, hy - 1, 1.5, 1.5, '#ffe060');
        if (e.wind > 0) { ctx.fillStyle = e.k === 'feuerdrache' ? 'rgba(255,140,40,.7)' : 'rgba(180,240,255,.7)'; ctx.beginPath(); ctx.arc(x, y + (hy + 6) * S, (3 + raise * 5) * S, 0, Math.PI * 2); ctx.fill(); }
      } else if (D.look === 'frosch') {
        const jump = raise * 10;
        E2(0, -12 - jump, 16, 11, '#0a2a20'); E2(0, -12 - jump, 15, 10, c1); E2(0, -9 - jump, 10, 6, '#c8f0a0');
        for (const sd of [-1, 1]) { E2(sd * 8, -24 - jump, 5, 5, '#0a2a20'); E2(sd * 8, -24 - jump, 4.2, 4.2, '#fff'); E2(sd * 8 + 1, -24 - jump, 2, 2.5, '#111'); E2(sd * 14, -2 - jump * 0.5, 6, 3, c0); }
        ctx.fillStyle = '#f4e04d'; for (let i = 0; i < 6; i++) ctx.fillRect(x + ((h2(i, 1, 5) - 0.5) * 22) * S, y + (-16 + h2(i, 2, 5) * 8 - jump) * S + bob, 2 * S, 2 * S);
        ctx.fillStyle = '#f4c430'; ctx.fillRect(x - 5 * S, y + (-34 - jump) * S + bob, 10 * S, 3 * S); for (let i = 0; i < 3; i++) ctx.fillRect(x + (-5 + i * 4) * S, y + (-37 - jump) * S + bob, 2 * S, 3 * S);
      } else {
        // Sporenkönigin
        E2(0, -8, 8, 9, '#e8dcc6'); E2(-3, -12, 1.4, 2, '#111'); E2(3, -12, 1.4, 2, '#111');
        for (const sd of [-1, 1]) { ctx.strokeStyle = '#e8dcc6'; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.moveTo(x + sd * 7 * S, y - 8 * S + bob); ctx.lineTo(x + sd * (14 + raise * 4) * S, y - (4 + raise * 12) * S + bob); ctx.stroke(); }
        E2(0, -22, 19, 10, '#2a0a3a'); E2(0, -23, 18, 9, c0); E2(0, -25, 14, 6, c1);
        ctx.fillStyle = '#fff0ff'; for (const [a, b] of [[-10, -26], [-3, -29], [6, -27], [12, -23], [-14, -21]]) ctx.fillRect(x + a * S, y + b * S + bob, 3 * S, 2 * S);
        ctx.fillStyle = '#f4c430'; ctx.fillRect(x - 5 * S, y - 36 * S + bob, 10 * S, 3 * S); for (let i = 0; i < 3; i++) ctx.fillRect(x + (-5 + i * 4) * S, y - 39 * S + bob, 2 * S, 3 * S);
        ctx.fillStyle = 'rgba(220,160,255,.5)'; for (let i = 0; i < 6; i++) { const ph = (t / 1500 + i / 6) % 1; ctx.fillRect(x + Math.sin(i * 2 + ph * 6) * 20 * S, y - (20 + ph * 30) * S, 2 * S, 2 * S); }
      }
    } else {
      // Höhlentroll
      if (e.wind > 0) {
        const p = 1 - e.wind / 0.75, sx = ox + e.sx * u, sy = oy + e.sy * u;
        ctx.strokeStyle = `rgba(255,60,40,${0.4 + p * 0.5})`; ctx.lineWidth = S; ctx.fillStyle = `rgba(255,60,40,${0.12 + p * 0.15})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, D.r * u * p, D.r * u * p * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(sx, sy, D.r * u, D.r * u * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
      shadow(x, y, 13 * S, 0.35);
      const bob = Math.round(Math.sin(t / 220) * S), sk = fl ? '#fff' : '#7d8f6a', skD = fl ? '#fff' : '#566848', top = y - 34 * S + bob;
      P(top, -8, 26, 6, 8, skD); P(top, 2, 26, 6, 8, skD); P(top, -9, 32, 7, 2, '#3a3a30'); P(top, 2, 32, 7, 2, '#3a3a30');
      P(top, -12, 11, 24, 17, '#2a2a22'); P(top, -11, 12, 22, 15, sk); P(top, -7, 16, 14, 10, fl ? '#fff' : '#a9b48a'); P(top, -11, 24, 22, 3, '#6b4426');
      P(top, -8, 1, 16, 12, '#2a2a22'); P(top, -7, 2, 14, 10, sk); P(top, -7, 2, 14, 2, skD);
      P(top, -5, 6, 3, 2, '#fff'); P(top, 2, 6, 3, 2, '#fff'); P(top, -4, 6, 1, 2, '#b8261c'); P(top, 3, 6, 1, 2, '#b8261c');
      P(top, -5, 10, 10, 2, '#3a2a20'); P(top, -5, 9, 2, 2, '#f0ead6'); P(top, 3, 9, 2, 2, '#f0ead6');
      const raise = e.wind > 0 ? 1 - e.wind / 0.75 : 0;
      ctx.save(); ctx.translate(x + 12 * S, top + 14 * S); ctx.rotate(-0.4 - raise * 2.2 + (e.wind <= 0 && e.cd > 1.4 ? 1.2 : 0));
      ctx.fillStyle = sk; ctx.fillRect(-2 * S, -2 * S, 4 * S, 10 * S);
      ctx.fillStyle = '#4a2e18'; ctx.fillRect(-1.5 * S, 6 * S, 3 * S, 12 * S); ctx.fillStyle = '#6b4426'; ctx.fillRect(-3 * S, 14 * S, 6 * S, 8 * S); ctx.fillStyle = '#8a8a8a'; ctx.fillRect(-4 * S, 16 * S, S, S); ctx.fillRect(3 * S, 19 * S, S, S);
      ctx.restore();
      P(top, -15, 13, 4, 11, sk);
    }
    if (e.hp < e.max && !D.boss) {
      const bw = 12 * S, by = y - (D.ai === 'fly' ? 20 : D.ai === 'slam' ? 30 : D.big ? 16 : D.shroom ? 18 : 13) * S;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - bw / 2 - S * 0.5, by - S * 0.5, bw + S, 2.5 * S);
      ctx.fillStyle = '#ff5a4a'; ctx.fillRect(x - bw / 2, by, bw * e.hp / e.max, 1.5 * S);
    }
  }
  function camera() {
    const u = TP * S, sx = shake > 0 ? (Math.random() - 0.5) * shake * S * 0.5 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * S * 0.5 : 0;
    return [u, Math.round(W / 2 - me.x * u + sx), Math.round(H / 2 - (me.y - 0.5) * u + sy)];
  }
  const sameZone = (o, cave_) => (cave_ ? !!o.cave && o.cidx === caveSpec.idx : !o.cave);
  function drawPeople(ents, ox, oy, u, t, cave_) {
    if (!me.inBoat) ents.push({ y: me.y, f: () => drawPerson(ox + me.x * u, oy + me.y * u, me.col, me.dir, me.frame, !cave_ && elev(me.x, me.y) < 0 && !(nearBig(me.x, me.y) && townAt(me.x, me.y) === 4), t, me.atk > 0 ? 1 - me.atk / (me.atkT || ATK_T) : null, me.inv > 0, sk('wirbel'), gear('schwert')) });
    for (const o of others.values()) {
      if (!sameZone(o, cave_) || o.inBoat) continue;
      ents.push({ y: o.y, f: () => drawPerson(ox + o.x * u, oy + o.y * u, o.col, o.dir, o.moving ? (Math.floor(o.ft / 0.13) % 4) + 1 : 0, !cave_ && elev(o.x, o.y) < 0, t, o.atk ? Math.min(1, (o.at || 0) / ATK_T) : null) });
    }
  }
  function drawTags(ox, oy, u, cave_) {
    const now = Date.now();
    for (const o of others.values()) {
      if (!sameZone(o, cave_)) continue;
      const hx = ox + o.x * u, hy = oy + o.y * u - (o.inBoat ? 0.6 : 1.6) * u;
      nameTag(hx, hy, `${o.name} · St. ${o.lvl || 1}`, false);
      const b = bubbles.get(o.name); if (b && now - b.t < 6000) bubble(hx, hy - 7 * S, b.m);
    }
    const mb = bubbles.get(me.name); if (mb && now - mb.t < 6000) bubble(ox + me.x * u, oy + me.y * u - (me.inBoat ? 0.6 : 1.6) * u - S, mb.m);
  }
  function renderOver(t) {
    const [u, ox, oy] = camera(), sx = wx => ox + wx * u, sy = wy => oy + wy * u;
    ctx.fillStyle = '#1b4a84'; ctx.fillRect(0, 0, W, H);
    const k0x = Math.floor(-ox / u / CH), k1x = Math.floor((W - ox) / u / CH), k0y = Math.floor(-oy / u / CH), k1y = Math.floor((H - oy) / u / CH + 0.1);
    const cs = CH * u, vis = [];
    for (let ky = k0y; ky <= k1y + 1; ky++) for (let kx = k0x; kx <= k1x; kx++) { const c = chunk(kx, ky); vis.push(c); if (ky <= k1y) ctx.drawImage(c.ground, ox + kx * cs, oy + ky * cs, cs, cs); }
    // Wellen
    const tx0 = Math.floor(-ox / u), tx1 = Math.ceil((W - ox) / u), ty0 = Math.floor(-oy / u), ty1 = Math.ceil((H - oy) / u);
    ctx.fillStyle = 'rgba(220,243,255,.55)';
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const r = h2(tx, ty, SEED + 200); if (r > 0.07) continue;
      const ph = (t / 1000 * 0.5 + r * 40) % 3; if (ph > 1.3) continue;
      const ee = elev(tx + 0.5, ty + 0.5);
      if (ee > 1.2 && EB === VULKAN) { ctx.globalAlpha = Math.sin(ph / 1.3 * Math.PI); ctx.fillStyle = r < 0.035 ? '#ffe080' : '#ff9a30'; ctx.fillRect(sx(tx) + (4 + r * 100 % 8) * S, sy(ty) + (10 - ph * 6) * S, S * 1.5, S * 1.5); ctx.fillStyle = 'rgba(220,243,255,.55)'; continue; }
      if (ee > -0.05) continue;
      ctx.globalAlpha = Math.sin(ph / 1.3 * Math.PI); ctx.fillRect(sx(tx) + 4 * S, sy(ty) + 8 * S + ph * S, 7 * S, S); ctx.fillRect(sx(tx) + 6 * S, sy(ty) + 7 * S + ph * S, 3 * S, S);
    }
    ctx.globalAlpha = 1;
    for (const p of wake) { ctx.globalAlpha = Math.max(0, 0.6 - p.t * 0.38); ctx.fillStyle = '#eaf8ff'; const r = (1 + p.t * 2) * S; ctx.fillRect(sx(p.x) - r, sy(p.y) - r / 2, r * 2, Math.max(S, r / 2)); }
    ctx.globalAlpha = 1;
    for (const m of prog.maps || []) if (Math.hypot(m.x - me.x, m.y - me.y) < 30) { const a = sx(m.x), b = sy(m.y); ctx.strokeStyle = 'rgba(120,20,10,.85)'; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.moveTo(a - 5 * S, b - 3 * S); ctx.lineTo(a + 5 * S, b + 3 * S); ctx.moveTo(a + 5 * S, b - 3 * S); ctx.lineTo(a - 5 * S, b + 3 * S); ctx.stroke(); ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 1.6 * S; ctx.stroke(); }
    // alles mit Höhe nach Tiefe sortiert: Bäume, Felsen, Figuren, Boote
    const ents = [], mx0 = (-ox) / u - 2, mx1 = (W - ox) / u + 2, my0 = (-oy) / u - 1, my1 = (H - oy) / u + 3.5;
    for (const c of vis) for (const o of c.objs) if (o.x > mx0 && o.x < mx1 && o.y > my0 && o.y < my1) ents.push({ y: o.y, f: () => drawObj(o, ox, oy, u, t) });
    if (nearBig(me.x, me.y)) {
      const T = town(), inV = (x, y) => x > mx0 - 2 && x < mx1 + 2 && y > my0 && y < my1 + 3;
      for (const hs of T.houses) if (inV(hs.x, hs.y)) ents.push({ y: hs.y, f: () => drawHouse(hs, ox, oy, u, t) });
      if (inV(T.V.x, T.V.y)) ents.push({ y: T.V.y + 0.4, f: () => drawFountain(ox, oy, u, t) });
      for (const n of T.npcs) if (inV(n.x, n.y)) ents.push({ y: n.y, f: () => { drawPerson(ox + n.x * u, oy + n.y * u, n.col, 0, 0, false, t, null, false, 0, 0, n.hat); nameTag(ox + n.x * u, oy + n.y * u - 1.75 * u, n.n, true); if (nearNpc === n) { ctx.font = `700 ${Math.round(4.6 * S)}px system-ui,sans-serif`; const tx2 = coarse ? 'Tippe 🛠️' : 'E – Sprechen', tw = ctx.measureText(tx2).width + 5 * S; ctx.fillStyle = 'rgba(14,22,40,.85)'; roundRect(ox + n.x * u - tw / 2, oy + n.y * u - 2.4 * u - 7 * S, tw, 7 * S, 2.5 * S); ctx.fill(); ctx.fillStyle = '#ffd27a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tx2, ox + n.x * u, oy + n.y * u - 2.4 * u - 3.5 * S); } } });
      for (const w of T.walkers) if (inV(w.x, w.y)) ents.push({ y: w.y, f: () => { drawPerson(ox + w.x * u, oy + w.y * u, w.col, w.dir, w.moving ? (Math.floor(w.t / 0.15) % 4) + 1 : 0, false, t, null, false, 0, 0, w.hat); if (w.say && Date.now() - w.say.t < 4000) bubble(ox + w.x * u, oy + w.y * u - 1.6 * u, w.say.m); } });
      drawBases(ents, ox, oy, u, t);
      for (const pl of T.plots) if (inV(pl.x + 1, pl.y + 0.6)) ents.push({ y: pl.y + 0.6, f: () => drawPlotSign(pl, ox, oy, u) });
    }
    for (const st of stations()) if (st.x > mx0 && st.x < mx1 && st.y > my0 && st.y < my1) ents.push({ y: st.y, f: () => drawObj({ k: 'st', st: st.k, x: st.x, y: st.y }, ox, oy, u, t) });
    for (const { e: E } of entsNear(me.x, me.y)) if (E.x > mx0 && E.x < mx1 && E.y > my0 && E.y < my1 + 2) ents.push({ y: E.y, f: () => drawObj({ k: 'ent', x: E.x, y: E.y }, ox, oy, u, t) });
    ents.push({ y: boat.y, f: () => drawBoat(sx(boat.x), sy(boat.y), boat.h, boat.sail, me.col, me.inBoat ? boat.v : 0, t / 1000, me.inBoat) });
    for (const o of others.values()) ents.push({ y: o.by, f: () => drawBoat(sx(o.bx), sy(o.by), o.bh, o.sail, o.col, o.inBoat && o.moving ? 2 : 0, t / 1000, o.inBoat) });
    for (const e of enemies) ents.push({ y: e.y, f: () => drawEnemy(e, ox, oy, u, t) });
    for (const it of items) ents.push({ y: it.y, f: () => drawItem(it, ox, oy, u, t) });
    drawPeople(ents, ox, oy, u, t, false);
    ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
    drawParts(ox, oy, u);
    // Wolkenschatten ziehen mit dem Wind
    const w = wind(t / 1000), ts = t / 1000;
    for (let i = 0; i < 5; i++) {
      const bx = h2(i, 1, 900) * 160 + ts * 1.1 * Math.cos(w.a), by = h2(i, 2, 900) * 160 + ts * 1.1 * Math.sin(w.a);
      const cx = me.x + ((((bx - me.x) % 160) + 240) % 160) - 80, cy = me.y + ((((by - me.y) % 160) + 240) % 160) - 80;
      const px = sx(cx), py = sy(cy), rr = (6 + h2(i, 3, 900) * 6) * u;
      if (px < -rr * 2 || px > W + rr * 2 || py < -rr * 2 || py > H + rr * 2) continue;
      const gr = ctx.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, 'rgba(10,20,40,.13)'); gr.addColorStop(1, 'rgba(10,20,40,0)');
      ctx.fillStyle = gr; ctx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    }
    const dk = darkness();
    if (dk > 0.02) {
      const lw = lc.width, lh = lc.height, L4 = 4;
      lg.globalCompositeOperation = 'source-over'; lg.fillStyle = `rgba(8,12,42,${dk})`; lg.fillRect(0, 0, lw, lh);
      lg.globalCompositeOperation = 'destination-out';
      const light = (x, y, r, a) => { const px = (ox + x * u) / L4, py = (oy + y * u) / L4, rr = r * u / L4; if (px < -rr || py < -rr || px > lw + rr || py > lh + rr) return; const gr = lg.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(px - rr, py - rr, rr * 2, rr * 2); };
      const fl = Math.sin(t / 90) * 0.15;
      light(me.x, me.y - 0.5, 5.5 + fl, 1);
      for (const o of others.values()) if (!o.cave) light(o.x, o.y - 0.5, 4, 0.9);
      for (const st of stations()) if (st.k !== 'werk') light(st.x, st.y - 0.6, 3.2 + fl, 0.85);
      for (const { e: E } of entsNear(me.x, me.y)) light(E.x, E.y - 1.8, 3.5 + fl, 0.85);
      if (nearBig(me.x, me.y)) {
        const T = town(); for (const hs of T.houses) light(hs.x, hs.y - 1.2, 3.2, 0.8); light(T.V.x, T.V.y, 3, 0.6);
        for (const pl of T.plots) { const P2 = PLOTS[pl.id]; if (!P2) continue; for (const [key, [, o]] of Object.entries(P2.it)) if (o && PIECES[o] && PIECES[o].light) { const [lx, ly] = key.split(',').map(Number); light(pl.x + lx + 0.5, pl.y + ly + 0.3, o === 'laterne' ? 5 : 4 + fl, 0.95); } }
      }
      ctx.imageSmoothingEnabled = true; ctx.drawImage(lc, 0, 0, lw * L4, lh * L4); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 24 && dk > 0.4; i++) { const a2 = h2(i, 3, 980), b2 = h2(i, 4, 980); if (Math.sin(t / 700 + i) > 0.3) ctx.fillRect(a2 * W, b2 * H * 0.5, S, S); }
    }
    // Stimmung je Insel: Schnee, Asche und Glut, Sporen, Glühwürmchen
    const here = nearestIsland(me.x, me.y), hb = here ? here.b : -1;
    if (hb === SCHNEE || hb === VULKAN || hb === PILZ || hb === DSCHUNGEL) {
      const n = hb === SCHNEE ? 70 : 34;
      for (let i = 0; i < n; i++) {
        const a = h2(i, 1, 950), b = h2(i, 2, 950), sp = 0.5 + h2(i, 3, 950);
        let px, py, col, sz = S * (hb === SCHNEE ? 1.5 : 1.2);
        if (hb === SCHNEE) { px = (a * W + Math.sin(ts * sp + i) * 30 * S - me.x * u * 0.3) % W; py = (b * H + ts * 40 * S * sp) % H; col = 'rgba(255,255,255,.85)'; }
        else if (hb === VULKAN) { px = (a * W + Math.sin(ts * sp + i) * 20 * S) % W; py = H - (b * H + ts * 30 * S * sp) % H; col = i % 3 ? 'rgba(90,80,80,.55)' : 'rgba(255,140,40,.9)'; }
        else { px = (a * W + Math.sin(ts * 0.5 * sp + i) * 40 * S) % W; py = (b * H + Math.cos(ts * 0.4 * sp + i) * 30 * S) % H; col = hb === PILZ ? `rgba(220,170,255,${0.4 + 0.4 * Math.sin(ts * 2 + i)})` : `rgba(230,255,120,${Math.max(0, Math.sin(ts * 1.5 + i * 2)) * 0.8})`; }
        ctx.fillStyle = col; ctx.fillRect(Math.round((px + W) % W), Math.round((py + H) % H), sz, sz);
      }
    }
    drawTags(ox, oy, u, false);
  }
  function renderCave(t) {
    const C = cave, [u, ox, oy] = camera();
    ctx.fillStyle = '#0a070f'; ctx.fillRect(0, 0, W, H);
    // nur den sichtbaren Teil der Höhlenkarte zeichnen
    const sx0 = Math.max(0, Math.floor(-ox / u)), sy0 = Math.max(0, Math.floor(-oy / u)), sx1 = Math.min(CW, Math.ceil((W - ox) / u)), sy1 = Math.min(CHH, Math.ceil((H - oy) / u));
    if (sx1 > sx0 && sy1 > sy0) ctx.drawImage(C.canvas, sx0 * TP, sy0 * TP, (sx1 - sx0) * TP, (sy1 - sy0) * TP, ox + sx0 * u, oy + sy0 * u, (sx1 - sx0) * u, (sy1 - sy0) * u);
    const ents = [], inView = (x, y) => x > sx0 - 2 && x < sx1 + 2 && y > sy0 - 2 && y < sy1 + 3;
    C.chests.forEach(([x, y], i) => { if (inView(x, y)) ents.push({ y: y + 0.8, f: () => drawChest(ox + (x + 0.5) * u, oy + (y + 0.8) * u, cs().chests[i] && Date.now() - cs().chests[i] < 30 * 60e3) }); });
    for (const e of enemies) if (inView(e.x, e.y)) ents.push({ y: e.y, f: () => drawEnemy(e, ox, oy, u, t) });
    for (const it of items) ents.push({ y: it.y, f: () => drawItem(it, ox, oy, u, t) });
    drawPeople(ents, ox, oy, u, t, true);
    ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
    for (const [x, y] of C.torches) if (inView(x, y)) flame(ox + x * u, oy + y * u - S, t, 0.8);
    drawParts(ox, oy, u);
    // Licht und Dunkelheit
    const lw = lc.width, lh = lc.height, L4 = 4;
    lg.globalCompositeOperation = 'source-over'; lg.fillStyle = 'rgba(6,4,14,0.9)'; lg.fillRect(0, 0, lw, lh);
    lg.globalCompositeOperation = 'destination-out';
    const light = (x, y, r, a) => { const px = (ox + x * u) / L4, py = (oy + y * u) / L4, rr = r * u / L4; if (px < -rr || py < -rr || px > lw + rr || py > lh + rr) return; const gr = lg.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.65})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(px - rr, py - rr, rr * 2, rr * 2); };
    const fl = Math.sin(t / 90) * 0.15 + Math.sin(t / 37) * 0.1;
    light(me.x, me.y - 0.5, 7 + fl, 1);
    for (const o of others.values()) if (sameZone(o, true)) light(o.x, o.y - 0.5, 4.5, 0.9);
    for (const [x, y] of C.torches) light(x, y, 4.6 + fl, 0.95);
    for (const [x, y] of C.crystals) light(x, y, 2.8, 0.75);
    for (const [x, y, k] of C.shrooms) if (k) light(x + 0.5, y + 0.5, 1.6, 0.6);
    light(C.EX + 0.5, C.EY + 1, 8, 1);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(lc, 0, 0, lw * L4, lh * L4); ctx.imageSmoothingEnabled = false;
    // farbiges Leuchten
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, c) => { const px = ox + x * u, py = oy + y * u, rr = r * u; if (px < -rr || py < -rr || px > W + rr || py > H + rr) return; const gr = ctx.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(px - rr, py - rr, rr * 2, rr * 2); };
    for (const [x, y, k] of C.crystals) glow(x, y - 0.2, 1.8, k ? 'rgba(120,80,255,.28)' : 'rgba(40,200,240,.28)');
    for (const [x, y] of C.torches) glow(x, y - 0.1, 2.2, `rgba(255,140,40,${0.2 + fl * 0.2})`);
    ctx.globalCompositeOperation = 'source-over';
    drawTags(ox, oy, u, true);
  }
  function drawChest(x, y, opened) {
    const P = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a * S, y + b * S, w * S, h * S); };
    shadow(x, y, 7 * S, 0.35);
    P(-7, -10, 14, 10, '#2a1a10'); P(-6, -9, 12, 8, '#8a5a34'); P(-6, -9, 12, 1, '#a8743f'); P(-6, -5, 12, 1, '#5a3a20');
    if (opened) { P(-7, -15, 14, 5, '#2a1a10'); P(-6, -14, 12, 3, '#6b4426'); P(-5, -10, 10, 1, '#1a0f08'); }
    else { P(-7, -13, 14, 4, '#2a1a10'); P(-6, -12, 12, 3, '#a8743f'); P(-1, -8, 2, 3, '#ffd24a'); P(-6, -12, 1, 11, '#d9b25a'); P(5, -12, 1, 11, '#d9b25a'); }
  }
  function drawMap(c, range, big) {
    const g = c.getContext('2d'), N = c.width, img = g.createImageData(N, N), d = img.data, step = (range * 2) / N;
    const x0 = me.x - range, y0 = me.y - range;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const e = elev(x0 + i * step, y0 + j * step), t = clsB(e, EB), col = colB(EB, t), o = (j * N + i) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const P = (x, y) => [(x - x0) / step, (y - y0) / step];
    if (big) {
      g.font = '600 8px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2.5;
      const c0x = Math.floor(x0 / CELL), c1x = Math.floor((x0 + range * 2) / CELL), c0y = Math.floor(y0 / CELL), c1y = Math.floor((y0 + range * 2) / CELL);
      for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) { const isl = island(cx, cy); if (!isl || !found.has(isl.name)) continue; const [a, b] = P(isl.x, isl.y); g.strokeText(isl.name, a, b - isl.r / step - 3); g.fillText(isl.name, a, b - isl.r / step - 3); }
    }
    const dot = (x, y, col, r) => { const [a, b] = P(x, y); g.fillStyle = '#000'; g.beginPath(); g.arc(a, b, r + 1.2, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); g.fill(); };
    for (const { e: E } of entsNear(me.x, me.y)) dot(E.x, E.y, '#2a2028', big ? 2.5 : 2);
    for (const m of prog.maps || []) { const [a, b] = P(m.x, m.y); if (a > 0 && b > 0 && a < N && b < N) { g.strokeStyle = '#000'; g.lineWidth = 4; g.beginPath(); g.moveTo(a - 4, b - 4); g.lineTo(a + 4, b + 4); g.moveTo(a + 4, b - 4); g.lineTo(a - 4, b + 4); g.stroke(); g.strokeStyle = '#ff3a2a'; g.lineWidth = 2; g.stroke(); } }
    { const T = town(), [a, b] = P(T.V.x, T.V.y);
      if (a > 4 && b > 4 && a < N - 4 && b < N - 4) { g.font = `${big ? 12 : 10}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏠', a, b); if (big) { g.font = '700 9px system-ui'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2.5; g.strokeText('Lindmark', a, b + 11); g.fillText('Lindmark', a, b + 11); } }
      else { const ang = Math.atan2(T.V.y - me.y, T.V.x - me.x), rr = N / 2 - (big ? 12 : 10), qx = N / 2 + Math.cos(ang) * rr, qy = N / 2 + Math.sin(ang) * rr; g.save(); g.translate(qx, qy); g.rotate(ang); g.fillStyle = '#ffd27a'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-2, 0); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke(); g.restore(); g.font = '9px system-ui'; g.textAlign = 'center'; g.fillText('🏠', qx - Math.cos(ang) * 12, qy - Math.sin(ang) * 12); } }
    for (const o of others.values()) if (!o.cave) dot(o.x, o.y, SHIRTS[o.col % 8], big ? 2.5 : 2);
    if (!me.inBoat) dot(boat.x, boat.y, '#a8743f', big ? 2.5 : 2);
    dot(me.x, me.y, '#ffd27a', big ? 3.5 : 3);
  }
  function drawCaveMap(c, big) {
    const g = c.getContext('2d'), Wm = c.width, Hm = c.height, C = cave;
    const sc = big ? Wm / CW : 3, x0 = big ? 0 : me.x - Wm / sc / 2, y0 = big ? 0 : me.y - Hm / sc / 2;
    g.fillStyle = '#0a070f'; g.fillRect(0, 0, Wm, Hm);
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(CHH, y0 + Hm / sc + 1); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(CW, x0 + Wm / sc + 1); x++) {
      const s = y * CW + x; if (!C.seen[s]) continue;
      g.fillStyle = C.g[s] ? '#3a2e3e' : '#8a7c84'; g.fillRect((x - x0) * sc, (y - y0) * sc, sc + 0.5, sc + 0.5);
    }
    const dot = (x, y, col, r) => { g.fillStyle = '#000'; g.beginPath(); g.arc((x - x0) * sc, (y - y0) * sc, r + 1.2, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.arc((x - x0) * sc, (y - y0) * sc, r, 0, Math.PI * 2); g.fill(); };
    dot(C.EX + 0.5, C.EY + 0.5, '#fff3b0', 2.5);
    for (const o of others.values()) if (sameZone(o, true)) dot(o.x, o.y, SHIRTS[o.col % 8], 2);
    dot(me.x, me.y, '#ffd27a', 3);
  }
  function hudTick() {
    const w = wind();
    hud.hp.innerHTML = Array.from({ length: maxHp() / 2 }, (_, i) => (me.hp >= i * 2 + 2 ? '<span class="f">♥</span>' : me.hp === i * 2 + 1 ? '<span class="f" style="opacity:.55">♥</span>' : '<span class="e">♥</span>')).join('');
    hud.coins.textContent = '🪙 ' + me.coins;
    hud.lvl.textContent = 'St. ' + prog.lvl; hud.xp.style.width = Math.min(100, prog.xp / xpNeed(prog.lvl) * 100) + '%';
    hud.pts.hidden = !prog.pts; hud.dot.hidden = !prog.pts; hud.pts.textContent = prog.pts;
    if (me.inCave) {
      hud.windBox.style.display = 'none';
      if (lastIsle !== caveSpec.name) { lastIsle = caveSpec.name; hud.isle.textContent = caveSpec.name; }
      const boss = enemies.find(e => e.d.boss);
      if (boss) hud.boss.firstChild.textContent = boss.d.name;
      hud.boss.style.display = boss && boss.awake ? 'block' : 'none';
      if (boss) hud.bossBar.style.width = Math.max(0, boss.hp / boss.max * 100) + '%';
    } else {
      hud.windBox.style.display = ''; hud.boss.style.display = 'none';
      hud.arrow.style.setProperty('--a', w.a + 'rad');
      const str = w.s < 0.6 ? 'schwach' : w.s < 0.85 ? 'mäßig' : 'kräftig';
      const dp = dayPhase(), nightLeft = dp >= 0.64 ? Math.ceil((1 - dp) * DAYLEN / 60) : 0;
      hud.wind.innerHTML = `${isNight() ? `🌙 Nacht · noch ${nightLeft} Min.` : dp > 0.55 && dp < 0.64 ? '🌇 Abend' : '☀️ Tag'}<br>Wind nach ${dirName(w.a)}, ${str}` + (me.inBoat ? `<br>Fahrt: ${(boat.v * 2).toFixed(1)} Knoten${boat.sail ? '' : ' (Paddeln)'}` : '');
      const isl = nearestIsland(me.x, me.y);
      const place = isl ? isl.name : T_NAMES[cls(elev(me.x, me.y))] || 'Offenes Meer';
      if (isl && isl.b && lastIsle !== place) qEvent('visit', isl.b);
      if (place !== lastIsle) { lastIsle = place; hud.isle.textContent = place; if (isl && discover(isl) && !isl.home) { say('🏝️ Neue Insel entdeckt: ' + place); gainXP(sk('entdecker') ? 50 : 25, me.x, me.y - 2); addLog(`Entdeckt: <b>${escH(place)}</b> (${found.size} Inseln bisher) – ${escH(isl.town ? 'Hier liegt das Dorf mit Händler, Hafenmeisterin und Bauplätzen für deine eigene Base' : BIOMES[isl.b].info)}`); } }
    }
    hud.on.textContent = online === 1 ? 'nur du bist online' : `${online} Spieler online`;
    hud.sail.hidden = !me.inBoat; hud.sail.classList.toggle('on', !!boat.sail);
    hud.boat.hidden = !!me.inCave;
    const myP = myPlotId(), inMine = myP >= 0 && !me.inBoat && (() => { const pl = town().plots[myP]; return me.x > pl.x - 2 && me.x < pl.x + pl.w + 2 && me.y > pl.y - 2 && me.y < pl.y + pl.h + 2; })();
    hud.build.hidden = !inMine; hud.build.classList.toggle('on', buildOn);
    if (!inMine && buildOn) toggleBuild(false);
    hud.use.hidden = !(nearSt || nearNpc || nearWalker || (extraNear && extraNear())) || !!me.inBoat || !!me.inCave;
    if (chestOpen != null && (!baseNear || baseNear.k !== 'truhe')) toggleChest();
    if (npcOpen && (!nearNpc || nearNpc.k !== npcOpen.k)) toggleNpc();
    if (hud.use.hidden && craftOpen) toggleCraft();
    if (buff.herz <= 0 && me.hp > maxHp()) me.hp = maxHp();
    hud.buffs.innerHTML = [['kraft', '🍲'], ['tempo', '🥤'], ['dorn', '🧪'], ['herz', '🥮']].filter(([k]) => buff[k] > 0).map(([k, i]) => `<b>${i}${Math.ceil(buff[k])}s</b>`).join('');
    hud.atk.hidden = !!me.inBoat;
    hud.boat.querySelector('span').textContent = me.inBoat ? 'An Land' : 'Boot';
    if (me.inCave) drawCaveMap(hud.map, false);
    else if (Math.hypot(me.x - mapAt[0], me.y - mapAt[1]) > 6 || mapDirty) { mapAt = [me.x, me.y]; mapDirty = false; drawMap(hud.map, (sk('entdecker') ? 180 : 120) + (gear('fernrohr') ? 80 : 0), false); }
    const now = Date.now(); [...hud.log.children].forEach((el, i) => { const l = log[i]; if (l && now - l.t > 15000) el.style.opacity = 0; });
  }
  let hudT = 0;
  function loop(t) {
    if (!open) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - (lastT || t)) / 1000); lastT = t;
    if (root.clientWidth * DPR !== W || root.clientHeight * DPR !== H) resize();
    step(dt);
    if (me.inCave && cave) renderCave(t); else renderOver(t);
    if (hurtFlash > 0) { ctx.fillStyle = `rgba(200,20,30,${hurtFlash * 0.6})`; ctx.fillRect(0, 0, W, H); }
    hudT += dt; if (hudT > 0.2) { hudT = 0; hudTick(); }
  }

  /* ---------- Netz ---------- */
  function join() { if (typeof send === 'function') send({ t: 'i_join', name: me.name, col: me.col, s: stateArr() }); lastSent = ''; }
  function net(m) {
    if (m.t === 'i_hi') { myId = m.id; online = m.n; return; }
    if (m.t === 'i_plots') { PLOTS = m.plots || {}; for (const k in PLOTS) if (!PLOTS[k]) delete PLOTS[k]; return; }
    if (m.t === 'i_plot') { if (m.p) PLOTS[m.id] = m.p; else delete PLOTS[m.id]; if (chestOpen === m.id) renderChest(); if (npcOpen && npcOpen.k === 'bau') renderNpc(); return; }
    if (m.t === 'i_w') {
      online = m.n || online;
      const seen = new Set();
      for (const p of m.p || []) {
        let [id, name, col, x, y, dir, moving, inBoat, bx, by, bh, sail, atk, lvl] = p; seen.add(id);
        const inCave = x < COX / 2; let cidx = 0; if (inCave) { cidx = Math.floor((x - COX) / 1000); x -= COX + cidx * 1000; y -= COY; }
        const tgt = { x, y, bx: inBoat ? x : bx, by: inBoat ? y : by, bh };
        let o = others.get(id);
        if (!o || o.cave !== inCave || o.cidx !== cidx || Math.hypot(o.x - x, o.y - y) > 20) { o = { ...tgt, t: tgt, ft: 0 }; others.set(id, o); }
        Object.assign(o, { name, col, dir, moving, inBoat, sail, atk, lvl: lvl || 1, cave: inCave, cidx, t: tgt });
      }
      for (const id of [...others.keys()]) if (!seen.has(id)) others.delete(id);
      mapDirty = true;
      return;
    }
    if (m.t === 'i_chat') { bubbles.set(m.n, { m: m.m, t: Date.now() }); addLog(`<b>${escH(m.n)}:</b> ${escH(m.m)}`); }
  }

  function openGame(name) {
    if (open) return;
    me.name = (name || 'Gast').slice(0, 16);
    buildSprites(); caveEnt(); stations();
    if (!load()) spawn();
    if (!root) build(); else root.style.display = '';
    open = true; document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    window.addEventListener('blur', blur);
    const hint = root.querySelector('.is-hint'); hint.style.display = ''; clearTimeout(openGame.ht); openGame.ht = setTimeout(() => { hint.style.display = 'none'; }, 20000);
    resize(); lastT = 0; others.clear(); mapDirty = true; lastIsle = '';
    if (me.inCave) {
      caveSpec = START_CAVE;
      if (me.caveKey && me.caveKey !== 'start') { const [cx, cy] = me.caveKey.slice(1).split(',').map(Number), sp = islandCave(island(cx, cy)); if (sp) caveSpec = sp; }
      buildCave(caveSpec); spawnEnemies();
    }
    join();
    addLog('Willkommen im <b>Inselreich</b>! Das ist ein früher Prototyp.');
    if (!me.inCave) addLog('Im Norden der Startinsel liegt die <b>Kristallhöhle</b>. Dort lauern Gegner!'); if (!found.has(BIG.name)) addLog('Weit im <b>Westen</b> liegt die große <b>Heimatinsel</b> mit dem Dorf Lindmark. Segle hin! (Pfeil auf der Karte)');
    say(me.inCave ? 'Zurück in der Kristallhöhle' : me.inBoat ? 'Willkommen zurück auf See' : 'Willkommen auf der ' + (nearestIsland(me.x, me.y) || { name: 'Insel' }).name);
    raf = requestAnimationFrame(loop);
  }
  function blur() { keys.clear(); }
  function close() {
    if (!open) return;
    open = false; cancelAnimationFrame(raf); save();
    if (typeof send === 'function') send({ t: 'i_leave' });
    myId = null;
    window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', blur);
    if (bigMap) toggleMap(); closeChat();
    root.style.display = 'none'; document.body.style.overflow = '';
  }
  window.Insel = {
    open: openGame, close, net, isOpen: () => open, rejoin: () => { if (open) join(); },
    _dbg: { islandCave, entsNear, newMap, darkness, get caveSpec() { return caveSpec; }, get PLOTS() { return PLOTS; }, myPlotId, placeAt, toggleBuild, get buildSel() { return buildSel; }, set buildSel(v) { buildSel = v; }, get baseNear() { return baseNear; }, toggleChest, town, BIG, quests, qEvent, toggleNpc, get nearNpc() { return nearNpc; }, interact, stations, toggleCraft, craft, useItem, buff, get nearSt() { return nearSt; }, get prog() { return prog; }, gainXP, toggleSkills, me, boat, others, elev, tileAt, objAt, isCut, get bag() { return bag; }, wind, island, spawn, toggleBoat, toggleSail, caveEnt, enterCave, leaveCave, attack, get enemies() { return enemies; }, get cave() { return cave; } },
  };
})();
