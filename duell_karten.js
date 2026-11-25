// Kristallduell – alle Karten (eigene Erfindung). Wird vom Server (duell.js) und im Browser (spiele5.js) benutzt.
// t: 'k' = Kreatur, 'z' = Zauber · c = Kosten in Kristallen · a/h = Angriff/Leben · kw = Fähigkeiten
// e = Wirkung (Zauber) bzw. Ruf (Kreatur: wirkt beim Ausspielen). tg = Ziel: any (Kreatur oder Spieler), cre (Kreatur), ecre (gegnerische Kreatur), own (eigene Kreatur)
(function () {
  const F = {
    abent: { n: 'Abenteuer', e: '🗺️', col: '#e0a050', col2: '#5a3410', txt: 'Das Startthema: mutige Dorfhelden, ehrliche Werte, leicht zu spielen.' },
    glut: { n: 'Glut', e: '🔥', col: '#ff5a3d', col2: '#7a1a08', txt: 'Schnell und angriffslustig: Eile, direkter Schaden und Drachen.' },
    wild: { n: 'Wildnis', e: '🌿', col: '#3ec46d', col2: '#0f4a24', txt: 'Riesige Kreaturen, mehr Kristalle und Durchbruch.' },
    flut: { n: 'Flut', e: '💧', col: '#3aa8ff', col2: '#0b3a6a', txt: 'Flieger, Einfrieren, Zurückschicken und viele Karten.' },
    nacht: { n: 'Schatten', e: '💀', col: '#a45cff', col2: '#3a1466', txt: 'Gift, Lebensentzug, Vernichtung und Wiederkehr.' },
    licht: { n: 'Licht', e: '✨', col: '#f5c542', col2: '#6a4a08', txt: 'Heilung, Schilde, Engel und unerschütterliche Ritter.' },
  };
  // Themen-Bonus: ab 10 Karten eines Themas im Deck
  const B = {
    abent: ['Kameradschaft', 'Deine Kreaturen kommen mit +1/+0 ins Spiel.'],
    glut: ['Flammenseele', 'Deine Schadenszauber und Rufe machen +1 Schaden.'],
    wild: ['Urkraft', 'Deine Kreaturen kommen mit +0/+1 ins Spiel.'],
    flut: ['Gezeitenwissen', 'Du startest mit 1 Karte mehr auf der Hand.'],
    nacht: ['Seelenernte', 'Stirbt eine gegnerische Kreatur, heilst du dich um 1.'],
    licht: ['Morgenröte', 'Zu Beginn deines Zuges heilst du dich um 1.'],
  };
  const BONUS_MIN = 10;
  // Seltenheit: g gewöhnlich, s selten, e episch, l legendär
  const RAR = {
    g: { n: 'Gewöhnlich', col: '#b8b8c8', max: 3, lv: [1, 4, 8, 13, 20], craft: 30, dust: 5 },
    s: { n: 'Selten', col: '#4aa8ff', max: 3, lv: [1, 3, 6, 10, 15], craft: 80, dust: 15 },
    e: { n: 'Episch', col: '#b45cff', max: 2, lv: [1, 2, 4, 7, 10], craft: 250, dust: 50 },
    l: { n: 'Legendär', col: '#ffa31a', max: 1, lv: [1, 2, 3, 5, 7], craft: 1000, dust: 200 },
  };
  // Stufe einer Karte aus der Anzahl, die man besitzt (0 = nicht im Besitz)
  const levelOf = (id, n) => { const c = C[id]; if (!c || !n) return 0; const t = RAR[c.r || 'g'].lv; let l = 0; for (let i = 0; i < t.length; i++) if (n >= t[i]) l = i + 1; return l; };
  const DECK_SIZE = 30, MIN_CRE = 12;
  // Deck prüfen: cards = { id: Anzahl }, own = Sammlung { id: Anzahl } (null = nicht prüfen). Gibt Fehlertext oder null zurück.
  function checkDeck(cards, own) {
    let n = 0, cre = 0;
    for (const [id, k] of Object.entries(cards || {})) {
      const c = C[id]; if (!c || c.tok) return 'Unbekannte Karte im Deck.';
      if (!(k > 0)) continue;
      const mx = RAR[c.r || 'g'].max; if (k > mx) return `${c.n} darf höchstens ${mx}× ins Deck.`;
      if (own && (own[id] || 0) < k) return `Du besitzt ${c.n} nicht oft genug.`;
      n += k; if (c.t === 'k') cre += k;
    }
    if (n !== DECK_SIZE) return `Ein Deck braucht genau ${DECK_SIZE} Karten (gerade ${n}).`;
    if (cre < MIN_CRE) return `Ein Deck braucht mindestens ${MIN_CRE} Kreaturen (gerade ${cre}).`;
    return null;
  }
  function themesOf(cards) { const t = {}; for (const [id, k] of Object.entries(cards || {})) { const c = C[id]; if (c) t[c.f] = (t[c.f] || 0) + k; } return t; }
  const bonusesOf = cards => Object.entries(themesOf(cards)).filter(([, n]) => n >= BONUS_MIN).map(([f]) => f);
  const mainTheme = cards => (Object.entries(themesOf(cards)).sort((a, b) => b[1] - a[1])[0] || ['glut'])[0];
  const KW = {
    flug: ['🪽', 'Flug', 'Kann nur von Kreaturen mit Flug oder Reichweite geblockt werden.'],
    reich: ['🏹', 'Reichweite', 'Kann auch Flieger blocken.'],
    eile: ['⚡', 'Eile', 'Kann sofort angreifen.'],
    wach: ['👁️', 'Wachsam', 'Wird beim Angreifen nicht erschöpft und kann danach noch blocken.'],
    durch: ['🦏', 'Durchbruch', 'Überschüssiger Schaden beim Blocken trifft trotzdem den Spieler.'],
    gift: ['🧪', 'Gift', 'Jeder Schaden an einer Kreatur zerstört sie.'],
    saug: ['🩸', 'Lebensentzug', 'Verursachter Schaden heilt dich.'],
    schild: ['🛡️', 'Schild', 'Der erste Schaden wird verhindert, dann ist der Schild weg.'],
    mauer: ['🧱', 'Mauer', 'Kann nicht angreifen, nur blocken.'],
  };
  const C = {
    // ---------- Abenteuer (Startthema) ----------
    a_bauer: { n: 'Mutiger Bauer', f: 'abent', r: 'g', t: 'k', c: 1, a: 1, h: 2, art: '🧑‍🌾' },
    a_hund: { n: 'Treuer Hund', f: 'abent', r: 'g', t: 'k', c: 1, a: 2, h: 1, art: '🐶' },
    a_bogen: { n: 'Bogenschützin', f: 'abent', r: 'g', t: 'k', c: 2, a: 2, h: 2, kw: ['reich'], art: '🎯' },
    a_wache: { n: 'Stadtwache', f: 'abent', r: 'g', t: 'k', c: 2, a: 2, h: 3, art: '💂' },
    a_reiter: { n: 'Botenreiter', f: 'abent', r: 'g', t: 'k', c: 3, a: 3, h: 2, kw: ['eile'], art: '🏇' },
    a_schmied: { n: 'Dorfschmied', f: 'abent', r: 'g', t: 'k', c: 3, a: 2, h: 3, e: { k: 'buff', a: 1, h: 1, tg: 'own' }, art: '🔨', txt: 'Ruf: Eine eigene Kreatur bekommt +1/+1.' },
    a_ritter: { n: 'Fahrender Ritter', f: 'abent', r: 'g', t: 'k', c: 4, a: 4, h: 4, art: '🪖' },
    a_riese: { n: 'Hügelriese', f: 'abent', r: 'g', t: 'k', c: 5, a: 5, h: 5, art: '🧌' },
    a_trank: { n: 'Heiltrank', f: 'abent', r: 'g', t: 'z', c: 1, e: { k: 'heal', n: 4 }, art: '🧪', txt: 'Heile dich um 4.' },
    a_pfeil: { n: 'Pfeilhagel', f: 'abent', r: 'g', t: 'z', c: 2, e: { k: 'dmgAll', n: 1, side: 'foe' }, art: '🏹', txt: '1 Schaden an alle gegnerischen Kreaturen.' },
    a_klee: { n: 'Glücksklee', f: 'abent', r: 'g', t: 'z', c: 2, e: { k: 'buff', a: 2, h: 2, tg: 'own' }, art: '🍀', txt: 'Eine eigene Kreatur bekommt +2/+2.' },
    a_karte: { n: 'Schatzkarte', f: 'abent', r: 'g', t: 'z', c: 3, e: { k: 'draw', n: 2 }, art: '🗺️', txt: 'Ziehe 2 Karten.' },
    a_magier: { n: 'Wandermagier', f: 'abent', r: 's', t: 'k', c: 3, a: 2, h: 3, e: { k: 'dmg', n: 2, tg: 'any' }, art: '🧙‍♂️', txt: 'Ruf: 2 Schaden an ein beliebiges Ziel.' },
    a_schwan: { n: 'Schwanenritterin', f: 'abent', r: 's', t: 'k', c: 4, a: 3, h: 4, kw: ['flug'], art: '🦢' },
    a_falle: { n: 'Fallgrube', f: 'abent', r: 's', t: 'z', c: 3, e: { k: 'dmg', n: 4, tg: 'cre' }, art: '🕳️', txt: '4 Schaden an eine Kreatur.' },
    a_prinz: { n: 'Prinz der Grenzlande', f: 'abent', r: 'e', t: 'k', c: 5, a: 4, h: 5, kw: ['wach'], e: { k: 'buffOthers', a: 1, h: 0 }, art: '🤴', txt: 'Ruf: Deine anderen Kreaturen bekommen +1/+0.' },
    a_gilde: { n: 'Gildenmeisterin Rhea', f: 'abent', r: 'l', t: 'k', c: 6, a: 5, h: 5, e: { k: 'token', id: 'a_rekrut', n: 2 }, art: '🧝‍♀️', txt: 'Ruf: Beschwört 2 Gildenrekruten (2/2, Eile).' },
    a_rekrut: { n: 'Gildenrekrut', f: 'abent', t: 'k', c: 2, a: 2, h: 2, kw: ['eile'], art: '🧑‍🎤', tok: 1 },
    // ---------- Glut ----------
    g_kobold: { n: 'Funkenkobold', f: 'glut', t: 'k', c: 1, a: 2, h: 1, kw: ['eile'], art: '👺' },
    g_fuchs: { n: 'Glutfuchs', f: 'glut', t: 'k', c: 2, a: 3, h: 2, art: '🦊' },
    g_brand: { n: 'Brandstifter', f: 'glut', t: 'k', c: 2, a: 2, h: 2, e: { k: 'face', n: 1 }, art: '🧨', txt: 'Ruf: 1 Schaden an den Gegner.' },
    g_stoss: { n: 'Flammenstoß', f: 'glut', t: 'z', c: 1, e: { k: 'dmg', n: 2, tg: 'any' }, art: '🔥', txt: '2 Schaden an ein beliebiges Ziel.' },
    g_krieger: { n: 'Aschenkrieger', f: 'glut', t: 'k', c: 3, a: 3, h: 2, kw: ['eile'], art: '🗡️' },
    g_phoenix: { n: 'Phönixküken', f: 'glut', t: 'k', r: 's', c: 3, a: 2, h: 2, kw: ['flug'], e: { k: 'dmg', n: 1, tg: 'any' }, art: '🐦', txt: 'Ruf: 1 Schaden an ein beliebiges Ziel.' },
    g_rausch: { n: 'Kampfrausch', f: 'glut', t: 'z', c: 2, e: { k: 'buff', a: 3, h: 1, tg: 'own' }, art: '💢', txt: 'Eine eigene Kreatur bekommt +3/+1.' },
    g_golem: { n: 'Lavagolem', f: 'glut', t: 'k', c: 4, a: 4, h: 5, art: '🌋' },
    g_sturm: { n: 'Feuersturm', f: 'glut', t: 'z', r: 's', c: 4, e: { k: 'dmgAll', n: 2, side: 'foe' }, art: '🎆', txt: '2 Schaden an alle gegnerischen Kreaturen.' },
    g_meteor: { n: 'Meteor', f: 'glut', t: 'z', r: 's', c: 5, e: { k: 'dmg', n: 5, tg: 'any' }, art: '☄️', txt: '5 Schaden an ein beliebiges Ziel.' },
    g_drache: { n: 'Glutdrache', f: 'glut', t: 'k', r: 'e', c: 6, a: 5, h: 5, kw: ['flug'], art: '🐉' },
    g_titan: { n: 'Magmatitan', f: 'glut', t: 'k', r: 'e', c: 7, a: 7, h: 6, kw: ['durch'], e: { k: 'face', n: 2 }, art: '👹', txt: 'Ruf: 2 Schaden an den Gegner.' },
    // ---------- Wildnis ----------
    w_moos: { n: 'Moosling', f: 'wild', t: 'k', c: 1, a: 1, h: 3, kw: ['mauer'], art: '🌱' },
    w_wolf: { n: 'Waldwolf', f: 'wild', t: 'k', c: 2, a: 3, h: 2, art: '🐺' },
    w_samen: { n: 'Kristallsamen', f: 'wild', t: 'z', c: 2, e: { k: 'ramp' }, art: '🌰', txt: '+1 Kristall – sofort und dauerhaft.' },
    w_peitsche: { n: 'Rankenpeitsche', f: 'wild', t: 'z', c: 2, e: { k: 'dmg', n: 3, tg: 'cre' }, art: '🌿', txt: '3 Schaden an eine Kreatur.' },
    w_dorn: { n: 'Dornenwächter', f: 'wild', t: 'k', c: 3, a: 2, h: 4, kw: ['reich'], art: '🌵' },
    w_hirsch: { n: 'Hainhirsch', f: 'wild', t: 'k', r: 's', c: 3, a: 3, h: 3, kw: ['wach'], art: '🦌' },
    w_kraut: { n: 'Heilkräuter', f: 'wild', t: 'z', c: 2, e: { k: 'heal', n: 4, draw: 1 }, art: '🍃', txt: 'Heile dich um 4 und ziehe 1 Karte.' },
    w_wuchs: { n: 'Riesenwuchs', f: 'wild', t: 'z', c: 3, e: { k: 'buff', a: 3, h: 3, tg: 'own' }, art: '💪', txt: 'Eine eigene Kreatur bekommt +3/+3.' },
    w_baer: { n: 'Bärenmutter', f: 'wild', t: 'k', r: 's', c: 4, a: 4, h: 3, e: { k: 'token', id: 'w_junges', n: 1 }, art: '🐻', txt: 'Ruf: Beschwört ein Bärenjunges (2/2).' },
    w_hydra: { n: 'Sumpfhydra', f: 'wild', t: 'k', r: 's', c: 5, a: 5, h: 4, kw: ['durch', 'reich'], art: '🐍' },
    w_herde: { n: 'Herdenruf', f: 'wild', t: 'z', r: 'e', c: 5, e: { k: 'buffAll', a: 2, h: 2 }, art: '🐘', txt: 'Alle eigenen Kreaturen bekommen +2/+2.' },
    w_riese: { n: 'Urwaldriese', f: 'wild', t: 'k', r: 'e', c: 7, a: 8, h: 8, kw: ['durch'], art: '🦍' },
    w_junges: { n: 'Bärenjunges', f: 'wild', t: 'k', c: 1, a: 2, h: 2, art: '🧸', tok: 1 },
    // ---------- Flut ----------
    f_fee: { n: 'Wasserfee', f: 'flut', t: 'k', c: 1, a: 1, h: 2, kw: ['flug'], art: '🧚' },
    f_muschel: { n: 'Muschelwache', f: 'flut', t: 'k', c: 2, a: 1, h: 4, kw: ['schild'], art: '🐚' },
    f_frost: { n: 'Frostblick', f: 'flut', t: 'z', c: 1, e: { k: 'freeze', tg: 'ecre', draw: 1 }, art: '❄️', txt: 'Friere eine gegnerische Kreatur ein und ziehe 1 Karte.' },
    f_einfall: { n: 'Eingebung', f: 'flut', t: 'z', c: 3, e: { k: 'draw', n: 2 }, art: '💭', txt: 'Ziehe 2 Karten.' },
    f_sirene: { n: 'Sirene', f: 'flut', t: 'k', r: 's', c: 3, a: 2, h: 2, kw: ['flug'], e: { k: 'draw', n: 1 }, art: '🧜', txt: 'Ruf: Ziehe 1 Karte.' },
    f_falke: { n: 'Sturmfalke', f: 'flut', t: 'k', c: 3, a: 3, h: 2, kw: ['flug'], art: '🦅' },
    f_welle: { n: 'Flutwelle', f: 'flut', t: 'z', r: 's', c: 2, e: { k: 'bounce', tg: 'cre' }, art: '🌊', txt: 'Schicke eine Kreatur auf die Hand ihres Besitzers zurück.' },
    f_schild: { n: 'Wasserschild', f: 'flut', t: 'z', c: 1, e: { k: 'buff', a: 0, h: 2, shield: 1, tg: 'own' }, art: '🫧', txt: 'Eine eigene Kreatur bekommt +0/+2 und Schild.' },
    f_golem: { n: 'Eisgolem', f: 'flut', t: 'k', r: 's', c: 4, a: 3, h: 5, e: { k: 'freeze', tg: 'ecre' }, art: '🧊', txt: 'Ruf: Friere eine gegnerische Kreatur ein.' },
    f_strudel: { n: 'Zeitstrudel', f: 'flut', t: 'z', r: 'e', c: 5, e: { k: 'freezeAll' }, art: '🌀', txt: 'Friere alle gegnerischen Kreaturen ein.' },
    f_wal: { n: 'Wolkenwal', f: 'flut', t: 'k', r: 's', c: 5, a: 4, h: 6, kw: ['flug'], art: '🐋' },
    f_krake: { n: 'Tiefseekrake', f: 'flut', t: 'k', r: 'e', c: 7, a: 6, h: 7, e: { k: 'bounce', tg: 'ecre' }, art: '🐙', txt: 'Ruf: Schicke eine gegnerische Kreatur auf die Hand zurück.' },
    // ---------- Schatten ----------
    n_ratte: { n: 'Pestratte', f: 'nacht', t: 'k', c: 1, a: 1, h: 1, kw: ['gift'], art: '🐀' },
    n_pakt: { n: 'Dunkler Pakt', f: 'nacht', t: 'z', c: 1, e: { k: 'draw', n: 2, self: 2 }, art: '📜', txt: 'Ziehe 2 Karten, du verlierst 2 Leben.' },
    n_fleder: { n: 'Blutfledermaus', f: 'nacht', t: 'k', c: 2, a: 2, h: 1, kw: ['flug', 'saug'], art: '🦇' },
    n_spinne: { n: 'Giftspinne', f: 'nacht', t: 'k', c: 2, a: 1, h: 3, kw: ['gift'], art: '🕷️' },
    n_zug: { n: 'Seelenzug', f: 'nacht', t: 'z', c: 2, e: { k: 'drain', n: 2 }, art: '👻', txt: '2 Schaden an den Gegner, du heilst dich um 2.' },
    n_meuchler: { n: 'Schattenmeuchler', f: 'nacht', t: 'k', r: 's', c: 3, a: 4, h: 2, kw: ['eile'], art: '🥷' },
    n_grab: { n: 'Grabesruf', f: 'nacht', t: 'z', r: 's', c: 3, e: { k: 'revive' }, art: '⚰️', txt: 'Holt deine zuletzt gestorbene Kreatur zurück aufs Feld.' },
    n_ghul: { n: 'Ghul', f: 'nacht', t: 'k', c: 3, a: 3, h: 3, kw: ['saug'], art: '🧟' },
    n_fluch: { n: 'Todesfluch', f: 'nacht', t: 'z', r: 's', c: 4, e: { k: 'kill', tg: 'cre' }, art: '💀', txt: 'Zerstöre eine Kreatur.' },
    n_pest: { n: 'Pestwolke', f: 'nacht', t: 'z', r: 'e', c: 4, e: { k: 'dmgAll', n: 2, side: 'all' }, art: '☠️', txt: '2 Schaden an ALLE Kreaturen.' },
    n_vampir: { n: 'Vampirfürst', f: 'nacht', t: 'k', r: 'e', c: 5, a: 4, h: 4, kw: ['flug', 'saug'], art: '🧛' },
    n_lich: { n: 'Knochenlich', f: 'nacht', t: 'k', r: 'e', c: 6, a: 5, h: 6, e: { k: 'dmgAll', n: 1, side: 'foe' }, art: '🧙', txt: 'Ruf: 1 Schaden an alle gegnerischen Kreaturen.' },
    // ---------- Neue Karten aus den Packs ----------
    g_regen: { n: 'Funkenregen', f: 'glut', r: 'g', t: 'z', c: 2, e: { k: 'dmgAll', n: 1, side: 'foe' }, art: '🎇', txt: '1 Schaden an alle gegnerischen Kreaturen.' },
    g_salam: { n: 'Feuersalamander', f: 'glut', r: 's', t: 'k', c: 2, a: 2, h: 2, e: { k: 'dmg', n: 1, tg: 'any' }, art: '🦎', txt: 'Ruf: 1 Schaden an ein beliebiges Ziel.' },
    g_berserk: { n: 'Glutberserker', f: 'glut', r: 's', t: 'k', c: 3, a: 2, h: 3, wachs: [1, 0], art: '😤', txt: 'Wächst: Zu Beginn deines Zuges +1/+0.' },
    g_schmied: { n: 'Flammenschmied', f: 'glut', r: 'e', t: 'k', c: 4, a: 3, h: 4, e: { k: 'buffOthers', a: 1, h: 0 }, art: '⚒️', txt: 'Ruf: Deine anderen Kreaturen bekommen +1/+0.' },
    g_bombe: { n: 'Glutbombe', f: 'glut', r: 'e', t: 'k', c: 3, a: 1, h: 3, kw: ['mauer'], tod: { k: 'dmgAll', n: 2, side: 'foe' }, art: '💣', txt: 'Nachhall: 2 Schaden an alle gegnerischen Kreaturen.' },
    g_phoenix2: { n: 'Ewiger Phönix', f: 'glut', r: 'l', t: 'k', c: 5, a: 4, h: 3, kw: ['flug'], tod: { k: 'token', id: 'g_asche', n: 1 }, art: '🦚', txt: 'Nachhall: Ersteht als Aschenphönix (3/2, Flug, Eile) wieder auf.' },
    g_ignar: { n: 'Vulkanfürst Ignar', f: 'glut', r: 'l', t: 'k', c: 8, a: 6, h: 6, kw: ['eile', 'durch'], e: { k: 'dmgAll', n: 2, side: 'foe' }, art: '😈', txt: 'Ruf: 2 Schaden an alle gegnerischen Kreaturen.' },
    g_asche: { n: 'Aschenphönix', f: 'glut', t: 'k', c: 3, a: 3, h: 2, kw: ['flug', 'eile'], art: '🐦', tok: 1 },
    w_pilz: { n: 'Sporenpilz', f: 'wild', r: 'g', t: 'k', c: 1, a: 1, h: 1, tod: { k: 'token', id: 'w_spor', n: 2 }, art: '🍄', txt: 'Nachhall: Beschwört 2 Sporlinge (1/1).' },
    w_eber: { n: 'Wildeber', f: 'wild', r: 'g', t: 'k', c: 3, a: 3, h: 3, kw: ['durch'], art: '🐗' },
    w_eiche: { n: 'Wächtereiche', f: 'wild', r: 's', t: 'k', c: 4, a: 2, h: 7, kw: ['reich', 'mauer'], art: '🌳' },
    w_druide: { n: 'Hain-Druidin', f: 'wild', r: 's', t: 'k', c: 3, a: 2, h: 2, e: { k: 'ramp' }, art: '🧝', txt: 'Ruf: +1 Kristall – sofort und dauerhaft.' },
    w_loewe: { n: 'Steppenlöwe', f: 'wild', r: 'e', t: 'k', c: 5, a: 4, h: 4, e: { k: 'buffOthers', a: 1, h: 1 }, art: '🦁', txt: 'Ruf: Deine anderen Kreaturen bekommen +1/+1.' },
    w_jagd: { n: 'Wilde Jagd', f: 'wild', r: 'e', t: 'z', c: 5, e: { k: 'token', id: 'w_jwolf', n: 3 }, art: '🏹', txt: 'Beschwört 3 Jagdhunde (2/2, Eile).' },
    w_brakka: { n: 'Urmammut Brakka', f: 'wild', r: 'l', t: 'k', c: 6, a: 5, h: 6, kw: ['durch'], wachs: [1, 1], art: '🦣', txt: 'Wächst: Zu Beginn deines Zuges +1/+1.' },
    w_gaia: { n: 'Gaia, Herz des Hains', f: 'wild', r: 'l', t: 'k', c: 9, a: 9, h: 9, kw: ['durch', 'reich'], e: { k: 'heal', n: 6 }, art: '🌍', txt: 'Ruf: Heile dich um 6.' },
    w_spor: { n: 'Sporling', f: 'wild', t: 'k', c: 1, a: 1, h: 1, art: '🦠', tok: 1 },
    w_jwolf: { n: 'Jagdhund', f: 'wild', t: 'k', c: 2, a: 2, h: 2, kw: ['eile'], art: '🐕', tok: 1 },
    f_krabbe: { n: 'Panzerkrabbe', f: 'flut', r: 'g', t: 'k', c: 2, a: 2, h: 2, kw: ['schild'], art: '🦀' },
    f_otter: { n: 'Flussotter', f: 'flut', r: 'g', t: 'k', c: 2, a: 2, h: 3, kw: ['wach'], art: '🦦' },
    f_hai: { n: 'Riffhai', f: 'flut', r: 's', t: 'k', c: 4, a: 5, h: 3, art: '🦈' },
    f_nebel: { n: 'Nebelschleier', f: 'flut', r: 's', t: 'z', c: 3, e: { k: 'shieldAll' }, art: '🌫️', txt: 'Alle deine Kreaturen bekommen Schild.' },
    f_magier: { n: 'Gezeitenmagier', f: 'flut', r: 'e', t: 'k', c: 4, a: 2, h: 4, e: { k: 'draw', n: 2 }, art: '🔮', txt: 'Ruf: Ziehe 2 Karten.' },
    f_orakel: { n: 'Orakel der Tiefe', f: 'flut', r: 'l', t: 'k', c: 5, a: 3, h: 5, kw: ['flug'], e: { k: 'draw', n: 1 }, tod: { k: 'draw', n: 2 }, art: '🧿', txt: 'Ruf: Ziehe 1 Karte. Nachhall: Ziehe 2 Karten.' },
    f_levi: { n: 'Leviathan', f: 'flut', r: 'l', t: 'k', c: 8, a: 7, h: 8, e: { k: 'freezeAll' }, art: '🐳', txt: 'Ruf: Friere alle gegnerischen Kreaturen ein.' },
    n_skelett: { n: 'Skelettkrieger', f: 'nacht', r: 'g', t: 'k', c: 2, a: 2, h: 2, tod: { k: 'token', id: 'n_knochen', n: 1 }, art: '🦴', txt: 'Nachhall: Beschwört einen Knochenhaufen (1/1).' },
    n_kauz: { n: 'Totenkauz', f: 'nacht', r: 'g', t: 'k', c: 1, a: 1, h: 1, kw: ['flug'], tod: { k: 'draw', n: 1 }, art: '🦉', txt: 'Nachhall: Ziehe 1 Karte.' },
    n_hexe: { n: 'Sumpfhexe', f: 'nacht', r: 's', t: 'k', c: 3, a: 2, h: 3, e: { k: 'drain', n: 2 }, art: '🧙‍♀️', txt: 'Ruf: 2 Schaden an den Gegner, du heilst dich um 2.' },
    n_verderb: { n: 'Verderbnis', f: 'nacht', r: 's', t: 'z', c: 2, e: { k: 'weaken', a: 2, h: 2, tg: 'cre' }, art: '🦠', txt: 'Eine Kreatur bekommt dauerhaft −2/−2.' },
    n_faenger: { n: 'Seelenfänger', f: 'nacht', r: 'e', t: 'k', c: 6, a: 3, h: 4, e: { k: 'steal', max: 3, tg: 'ecre' }, art: '🪦', txt: 'Ruf: Übernimm eine gegnerische Kreatur mit höchstens 3 Angriff.' },
    n_morgul: { n: 'Knochendrache Morgul', f: 'nacht', r: 'l', t: 'k', c: 7, a: 5, h: 5, kw: ['flug'], tod: { k: 'token', id: 'n_geist', n: 1 }, art: '🐲', txt: 'Nachhall: Kehrt als Drachengeist (3/3, Flug, Lebensentzug) zurück.' },
    n_gruft: { n: 'Fürst der Gruft', f: 'nacht', r: 'l', t: 'k', c: 8, a: 5, h: 7, e: { k: 'revive', n: 2 }, art: '⚱️', txt: 'Ruf: Holt deine 2 zuletzt gestorbenen Kreaturen zurück.' },
    n_knochen: { n: 'Knochenhaufen', f: 'nacht', t: 'k', c: 1, a: 1, h: 1, art: '☠️', tok: 1 },
    n_geist: { n: 'Drachengeist', f: 'nacht', t: 'k', c: 4, a: 3, h: 3, kw: ['flug', 'saug'], art: '👻', tok: 1 },
    // ---------- Licht ----------
    l_novize: { n: 'Lichtnovizin', f: 'licht', r: 'g', t: 'k', c: 1, a: 1, h: 2, e: { k: 'heal', n: 2 }, art: '🕯️', txt: 'Ruf: Heile dich um 2.' },
    l_knappe: { n: 'Schildknappe', f: 'licht', r: 'g', t: 'k', c: 2, a: 2, h: 2, kw: ['schild'], art: '⚔️' },
    l_segen: { n: 'Segen', f: 'licht', r: 'g', t: 'z', c: 1, e: { k: 'buff', a: 1, h: 2, tg: 'own' }, art: '✨', txt: 'Eine eigene Kreatur bekommt +1/+2.' },
    l_ross: { n: 'Himmelsross', f: 'licht', r: 'g', t: 'k', c: 3, a: 2, h: 3, kw: ['flug'], art: '🐎' },
    l_ritter: { n: 'Sonnenritter', f: 'licht', r: 'g', t: 'k', c: 3, a: 3, h: 3, kw: ['wach'], art: '🤺' },
    l_haende: { n: 'Heilende Hände', f: 'licht', r: 'g', t: 'z', c: 2, e: { k: 'heal', n: 5 }, art: '🙏', txt: 'Heile dich um 5.' },
    l_strahl: { n: 'Lichtstrahl', f: 'licht', r: 'g', t: 'z', c: 2, e: { k: 'dmg', n: 2, tg: 'cre', heal: 2 }, art: '🔆', txt: '2 Schaden an eine Kreatur, du heilst dich um 2.' },
    l_waechter: { n: 'Tempelwächter', f: 'licht', r: 'g', t: 'k', c: 4, a: 2, h: 6, kw: ['reich'], art: '🗿' },
    l_moench: { n: 'Bergmönch', f: 'licht', r: 'g', t: 'k', c: 2, a: 2, h: 3, art: '🧘' },
    l_paladin: { n: 'Paladin', f: 'licht', r: 's', t: 'k', c: 4, a: 3, h: 4, kw: ['saug'], art: '🦸' },
    l_engel: { n: 'Schutzengel', f: 'licht', r: 's', t: 'k', c: 5, a: 4, h: 5, kw: ['flug', 'wach'], art: '👼' },
    l_sonne: { n: 'Sonnenfeuer', f: 'licht', r: 's', t: 'z', c: 4, e: { k: 'dmgAll', n: 2, side: 'foe', heal: 2 }, art: '☀️', txt: '2 Schaden an alle gegnerischen Kreaturen, du heilst dich um 2.' },
    l_schild: { n: 'Göttlicher Schild', f: 'licht', r: 's', t: 'z', c: 3, e: { k: 'shieldAll' }, art: '🌟', txt: 'Alle deine Kreaturen bekommen Schild.' },
    l_einhorn: { n: 'Einhorn', f: 'licht', r: 'e', t: 'k', c: 5, a: 4, h: 4, kw: ['schild'], e: { k: 'heal', n: 4 }, art: '🦄', txt: 'Ruf: Heile dich um 4.' },
    l_bann: { n: 'Bannlicht', f: 'licht', r: 'e', t: 'z', c: 5, e: { k: 'kill', tg: 'cre' }, art: '⚡', txt: 'Zerstöre eine Kreatur.' },
    l_koenig: { n: 'Sonnenkönig Aurel', f: 'licht', r: 'l', t: 'k', c: 6, a: 4, h: 5, e: { k: 'buffOthers', a: 1, h: 1, shield: 1 }, art: '👑', txt: 'Ruf: Deine anderen Kreaturen bekommen +1/+1 und Schild.' },
    l_seraph: { n: 'Erzengel Seraphiel', f: 'licht', r: 'l', t: 'k', c: 8, a: 6, h: 7, kw: ['flug', 'wach', 'saug'], art: '😇' },
  };
  // Grunddecks: je 30 Karten (bekommt jeder zum Start)
  const DECKS = {
    abent: { a_bauer: 3, a_hund: 3, a_bogen: 3, a_wache: 3, a_reiter: 3, a_schmied: 3, a_ritter: 3, a_riese: 2, a_trank: 2, a_pfeil: 2, a_klee: 2, a_karte: 1 },
    glut: { g_kobold: 3, g_fuchs: 3, g_brand: 3, g_stoss: 3, g_krieger: 3, g_phoenix: 2, g_rausch: 2, g_golem: 3, g_sturm: 2, g_meteor: 2, g_drache: 2, g_titan: 2 },
    wild: { w_moos: 2, w_wolf: 3, w_samen: 3, w_peitsche: 3, w_dorn: 3, w_hirsch: 3, w_kraut: 2, w_wuchs: 2, w_baer: 3, w_hydra: 2, w_herde: 2, w_riese: 2 },
    flut: { f_fee: 3, f_muschel: 3, f_frost: 3, f_einfall: 2, f_sirene: 3, f_falke: 3, f_welle: 2, f_schild: 2, f_golem: 3, f_strudel: 2, f_wal: 2, f_krake: 2 },
    nacht: { n_ratte: 3, n_pakt: 2, n_fleder: 3, n_spinne: 2, n_zug: 3, n_meuchler: 3, n_grab: 2, n_ghul: 3, n_fluch: 3, n_pest: 2, n_vampir: 2, n_lich: 2 },
    licht: { l_novize: 3, l_knappe: 3, l_segen: 3, l_ross: 3, l_ritter: 3, l_haende: 2, l_strahl: 3, l_waechter: 2, l_moench: 2, l_paladin: 2, l_engel: 2, l_sonne: 2 },
  };
  for (const [id, c] of Object.entries(C)) if (!c.tok && !c.r) c.r = 'g';
  // Bot-Leiter: 10 Gegner, die immer stärker werden
  const LADDER = [
    { n: 'Lehrling Pip', art: '🧒', th: ['glut'], r: 'g', life: 14 },
    { n: 'Waldläuferin Mira', art: '🏹', th: ['wild'], r: 'g', life: 16 },
    { n: 'Kapitän Kork', art: '🏴‍☠️', th: ['flut'], r: 'g', life: 18 },
    { n: 'Grabwächter Ulf', art: '⚰️', th: ['nacht'], r: 'gs', life: 18 },
    { n: 'Ordensritterin Hella', art: '🛡️', th: ['licht'], r: 'gs', life: 20 },
    { n: 'Drachenreiter Brann', art: '🐉', th: ['glut', 'wild'], r: 'gse', life: 20 },
    { n: 'Sturmhexe Nyra', art: '🌪️', th: ['flut', 'nacht'], r: 'gse', life: 22 },
    { n: 'Erzdruide Thorn', art: '🌳', th: ['wild', 'licht'], r: 'gsel', life: 24 },
    { n: 'Schattenkönigin Vex', art: '👸', th: ['nacht', 'glut'], r: 'gsel', life: 26 },
    { n: 'Der Kristallwächter', art: '💎', th: ['glut', 'wild', 'flut', 'nacht', 'licht'], r: 'gsel', life: 30 },
  ];
  const PACK = { cost: 100, size: 5, odds: { g: 60, s: 28, e: 9.5, l: 2.5 }, pityE: 10, pityL: 30 };
  const out = { LADDER, PACK, F, KW, C, DECKS, B, BONUS_MIN, RAR, levelOf, checkDeck, themesOf, bonusesOf, mainTheme, DECK_SIZE, MIN_CRE };
  if (typeof module !== 'undefined' && module.exports) module.exports = out; else window.DuellKarten = out;
})();
