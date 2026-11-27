// Kristallduell – alle Karten (eigene Erfindung). Wird vom Server (duell.js) und im Browser (spiele5.js) benutzt.
// Regeln nah an klassischen Sammelkartenspielen: Länder (1 pro Zug) erzeugen farbiges Mana, Karten kosten z. B. „2R“ (2 beliebige + 1 Glut).
// t: 'k' Kreatur, 'z' Hexerei (inst: 1 = Spontanzauber), 'a' Aura, 'l' Land · c = umgewandelte Kosten · m = Manakosten · a/h = Stärke/Widerstand
// e = Wirkung (Zauber/Aura) bzw. „Wenn … ins Spiel kommt“ (Kreatur) · tod = „Wenn … stirbt“ · act = aktivierte Fähigkeit (tap: Tappen als Kosten)
(function () {
  const F = {
    abent: { n: 'Abenteuer', e: '🗺️', m: 'A', land: 'Wegkreuzung', landArt: '🛤️', col: '#e0a050', col2: '#5a3410', txt: 'Das Startthema: mutige Dorfhelden, leicht zu spielen.' },
    glut: { n: 'Glut', e: '🔥', m: 'R', land: 'Glutberg', landArt: '🌋', col: '#ff5a3d', col2: '#7a1a08', txt: 'Rot: Eile, direkter Schaden und Drachen.' },
    wild: { n: 'Wildnis', e: '🌿', m: 'G', land: 'Urwald', landArt: '🌳', col: '#3ec46d', col2: '#0f4a24', txt: 'Grün: riesige Kreaturen, Trampelschaden und mehr Länder.' },
    flut: { n: 'Flut', e: '💧', m: 'U', land: 'Gezeitenquelle', landArt: '🌊', col: '#3aa8ff', col2: '#0b3a6a', txt: 'Blau: Flieger, Tappen, Zurückschicken und Karten ziehen.' },
    nacht: { n: 'Schatten', e: '💀', m: 'B', land: 'Grabmoor', landArt: '🪦', col: '#a45cff', col2: '#3a1466', txt: 'Schwarz: Todesberührung, Lebensverknüpfung, Zerstören und Wiederkehr.' },
    licht: { n: 'Licht', e: '✨', m: 'W', land: 'Sonnenfeld', landArt: '🌄', col: '#f5c542', col2: '#6a4a08', txt: 'Weiß: Lebenspunkte, Schutz, Engel und Ritter.' },
  };
  // Themen-Bonus: ab 10 Nicht-Land-Karten einer Farbe im Deck
  const B = {
    abent: ['Kameradschaft', 'Deine Kreaturen kommen mit +1/+0 ins Spiel.'],
    glut: ['Flammenseele', 'Deine Karten fügen 1 zusätzlichen Schadenspunkt zu.'],
    wild: ['Urkraft', 'Deine Kreaturen kommen mit +0/+1 ins Spiel.'],
    flut: ['Gezeitenwissen', 'Deine Starthand hat 1 Karte mehr.'],
    nacht: ['Seelenernte', 'Immer wenn eine gegnerische Kreatur stirbt, erhältst du 1 Lebenspunkt dazu.'],
    licht: ['Morgenröte', 'Zu Beginn deines Zuges erhältst du 1 Lebenspunkt dazu.'],
  };
  const BONUS_MIN = 10;
  // Seltenheit: g gewöhnlich, s ungewöhnlich, e selten, l mythisch
  const RAR = {
    g: { n: 'Gewöhnlich', col: '#b8b8c8', max: 4, lv: [1, 4, 8, 13, 20], craft: 30, dust: 5 },
    s: { n: 'Ungewöhnlich', col: '#c8d4e8', max: 4, lv: [1, 3, 6, 10, 15], craft: 80, dust: 15 },
    e: { n: 'Selten', col: '#ffcc33', max: 4, lv: [1, 2, 4, 7, 10], craft: 250, dust: 50 },
    l: { n: 'Mythisch', col: '#ff6a1a', max: 4, lv: [1, 2, 3, 5, 7], craft: 1000, dust: 200 },
  };
  // Stufe einer Karte aus der Anzahl, die man besitzt (0 = nicht im Besitz)
  const levelOf = (id, n) => { const c = C[id]; if (!c || !n) return 0; const t = RAR[c.r || 'g'].lv; let l = 0; for (let i = 0; i < t.length; i++) if (n >= t[i]) l = i + 1; return l; };
  const DECK_SIZE = 40, MIN_CRE = 0, MAX_COPIES = 4;
  // Deck prüfen: cards = { id: Anzahl }, own = Sammlung { id: Anzahl } (null = nicht prüfen). Gibt Fehlertext oder null zurück.
  function checkDeck(cards, own) {
    let n = 0;
    for (const [id, k] of Object.entries(cards || {})) {
      const c = C[id]; if (!c || c.tok) return 'Unbekannte Karte im Deck.';
      if (!(k > 0)) continue;
      if (c.t !== 'l') { // Grundländer: beliebig viele, gehören allen
        if (k > MAX_COPIES) return `${c.n} darf höchstens ${MAX_COPIES}× ins Deck.`;
        if (own && (own[id] || 0) < k) return `Du besitzt ${c.n} nicht oft genug.`;
      }
      n += k;
    }
    if (n !== DECK_SIZE) return `Ein Deck braucht genau ${DECK_SIZE} Karten (gerade ${n}).`;
    return null;
  }
  function themesOf(cards) { const t = {}; for (const [id, k] of Object.entries(cards || {})) { const c = C[id]; if (c && c.t !== 'l') t[c.f] = (t[c.f] || 0) + k; } return t; }
  const bonusesOf = cards => Object.entries(themesOf(cards)).filter(([, n]) => n >= BONUS_MIN).map(([f]) => f);
  const mainTheme = cards => (Object.entries(themesOf(cards)).sort((a, b) => b[1] - a[1])[0] || ['glut'])[0];
  const KW = {
    flug: ['🪽', 'Flugfähigkeit', 'Kann nur von Kreaturen mit Flugfähigkeit oder Reichweite geblockt werden.'],
    reich: ['🏹', 'Reichweite', 'Kann Kreaturen mit Flugfähigkeit blocken.'],
    eile: ['⚡', 'Eile', 'Kann angreifen und ⟳ nutzen, sobald sie ins Spiel kommt.'],
    wach: ['👁️', 'Wachsamkeit', 'Wird durch Angreifen nicht getappt.'],
    durch: ['🦏', 'Trampelschaden', 'Überzähliger Kampfschaden geht an den verteidigenden Spieler.'],
    gift: ['☠️', 'Todesberührung', 'Jeder Schaden, den sie einer Kreatur zufügt, ist tödlich.'],
    saug: ['🩸', 'Lebensverknüpfung', 'Schaden, den sie zufügt, gibt dir ebenso viele Lebenspunkte.'],
    schild: ['🛡️', 'Schutzschild', 'Der nächste Schaden an ihr wird verhindert, dann ist der Schild weg.'],
    mauer: ['🧱', 'Verteidiger', 'Kann nicht angreifen.'],
    erst: ['🗡️', 'Erstschlag', 'Fügt Kampfschaden vor Kreaturen ohne Erstschlag zu.'],
    wache: ['🛡', 'Wache', 'Kann eine zusätzliche Kreatur blocken.'],
    fluch: ['🔰', 'Fluchsicher', 'Kann nicht das Ziel von Zaubern oder Fähigkeiten deiner Gegner werden.'],
    bedroh: ['😈', 'Bedrohlich', 'Kann nur von zwei oder mehr Kreaturen geblockt werden.'],
    blitz: ['💨', 'Aufblitzen', 'Kann gewirkt werden, wann immer du einen Spontanzauber wirken könntest.'],
    bann: ['🔗', 'Gefesselt', 'Kann weder angreifen noch blocken.'],
  };

  const C = {
    // ---------- Abenteuer (Startthema) ----------
    a_bauer: { n: 'Mutiger Bauer', f: 'abent', r: 'g', t: 'k', c: 1, a: 1, h: 2, art: '🧑‍🌾' },
    a_hund: { n: 'Treuer Hund', f: 'abent', r: 'g', t: 'k', c: 1, a: 2, h: 1, art: '🐶' },
    a_bogen: { n: 'Bogenschützin', f: 'abent', r: 'g', t: 'k', c: 2, a: 2, h: 2, kw: ['erst', 'reich'], art: '🎯' },
    a_wache: { n: 'Stadtwache', f: 'abent', r: 'g', t: 'k', c: 2, a: 2, h: 3, kw: ['wache'], art: '💂' },
    a_reiter: { n: 'Botenreiter', f: 'abent', r: 'g', t: 'k', c: 3, a: 3, h: 2, kw: ['eile'], art: '🏇' },
    a_schmied: { n: 'Dorfschmied', f: 'abent', r: 'g', t: 'k', c: 3, a: 2, h: 3, e: { k: 'buff', a: 1, h: 1, tg: 'own' }, art: '🔨', txt: 'Ruf: Eine eigene Kreatur bekommt +1/+1.' },
    a_ritter: { n: 'Fahrender Ritter', f: 'abent', r: 'g', t: 'k', c: 4, a: 4, h: 4, art: '🪖' },
    a_riese: { n: 'Hügelriese', f: 'abent', r: 'g', t: 'k', c: 5, a: 5, h: 5, art: '🧌' },
    a_trank: { n: 'Heiltrank', f: 'abent', r: 'g', t: 'z', inst: 1, c: 1, e: { k: 'heal', n: 4 }, art: '🧪', txt: 'Heile dich um 4.' },
    a_pfeil: { n: 'Pfeilhagel', f: 'abent', r: 'g', t: 'z', c: 2, e: { k: 'dmgAll', n: 1, side: 'foe' }, art: '🏹', txt: '1 Schaden an alle gegnerischen Kreaturen.' },
    a_klee: { n: 'Glücksklee', f: 'abent', r: 'g', t: 'z', inst: 1, c: 2, e: { k: 'buff', a: 2, h: 2, tg: 'own' }, art: '🍀', txt: 'Eine eigene Kreatur bekommt +2/+2.' },
    a_karte: { n: 'Schatzkarte', f: 'abent', r: 'g', t: 'z', c: 3, e: { k: 'draw', n: 2 }, art: '🗺️', txt: 'Ziehe 2 Karten.' },
    a_magier: { n: 'Wandermagier', f: 'abent', r: 's', t: 'k', c: 3, a: 2, h: 3, e: { k: 'dmg', n: 2, tg: 'any' }, art: '🧙‍♂️', txt: 'Ruf: 2 Schaden an ein beliebiges Ziel.' },
    a_schwan: { n: 'Schwanenritterin', f: 'abent', r: 's', t: 'k', c: 4, a: 3, h: 4, kw: ['flug'], art: '🦢' },
    a_falle: { n: 'Fallgrube', f: 'abent', r: 's', t: 'z', inst: 1, c: 3, e: { k: 'dmg', n: 4, tg: 'cre' }, art: '🕳️', txt: '4 Schaden an eine Kreatur.' },
    a_prinz: { n: 'Prinz der Grenzlande', f: 'abent', r: 'e', t: 'k', c: 5, a: 4, h: 5, kw: ['wach'], e: { k: 'buffOthers', a: 1, h: 0 }, art: '🤴', txt: 'Ruf: Deine anderen Kreaturen bekommen +1/+0.' },
    a_gilde: { n: 'Gildenmeisterin Rhea', f: 'abent', r: 'l', t: 'k', c: 6, a: 5, h: 5, e: { k: 'token', id: 'a_rekrut', n: 2 }, art: '🧝‍♀️', txt: 'Ruf: Beschwört 2 Gildenrekruten (2/2, Eile).' },
    a_rekrut: { n: 'Gildenrekrut', f: 'abent', t: 'k', c: 2, a: 2, h: 2, kw: ['eile'], art: '🧑‍🎤', tok: 1 },
    // ---------- Neue Karten im klassischen Stil ----------
    a_wegelag: { n: 'Wegelagerer', f: 'abent', r: 'g', t: 'k', c: 2, a: 2, h: 1, kw: ['bedroh'], art: '🧔‍♂️' },
    a_kompass: { n: 'Glückskompass', f: 'abent', r: 'g', t: 'a', c: 1, e: { k: 'buff', a: 1, h: 1, tg: 'own' }, art: '🧭' },
    a_kundschaft: { n: 'Kundschafterin', f: 'abent', r: 's', t: 'k', c: 2, a: 1, h: 2, act: { tap: 1, m: '1', e: { k: 'draw', n: 1 } }, art: '🔭' },
    g_lehrling: { n: 'Funkenlehrling', f: 'glut', r: 's', t: 'k', c: 2, a: 1, h: 1, act: { tap: 1, e: { k: 'dmg', n: 1, tg: 'any' } }, art: '🪄' },
    g_wut: { n: 'Kampfwut', f: 'glut', r: 'g', t: 'a', c: 2, e: { k: 'buff', a: 2, h: 0, kw: ['eile'], tg: 'own' }, art: '😡' },
    g_pluender: { n: 'Glutplünderer', f: 'glut', r: 'g', t: 'k', c: 2, a: 2, h: 1, kw: ['bedroh'], art: '🦹' },
    w_geist: { n: 'Wildnisgeist', f: 'wild', r: 'g', t: 'a', c: 3, e: { k: 'buff', a: 2, h: 2, kw: ['durch'], tg: 'own' }, art: '🐾' },
    w_wandler: { n: 'Mooswandler', f: 'wild', r: 's', t: 'k', c: 3, a: 3, h: 3, kw: ['fluch'], art: '🦥' },
    w_hueter: { n: 'Dickichthüterin', f: 'wild', r: 'g', t: 'k', c: 2, a: 1, h: 4, kw: ['reich'], art: '🦔' },
    f_schwebe: { n: 'Schwebezauber', f: 'flut', r: 'g', t: 'a', c: 2, e: { k: 'buff', a: 1, h: 1, kw: ['flug'], tg: 'own' }, art: '🎈' },
    f_pirat: { n: 'Nebelpirat', f: 'flut', r: 's', t: 'k', c: 3, a: 2, h: 2, kw: ['blitz', 'flug'], art: '🏴‍☠️' },
    f_seher: { n: 'Gedankenseherin', f: 'flut', r: 's', t: 'k', c: 3, a: 1, h: 3, act: { tap: 1, m: '1', e: { k: 'freeze', tg: 'ecre' } }, art: '👁️' },
    n_fluchband: { n: 'Grabesfluch', f: 'nacht', r: 'g', t: 'a', c: 2, e: { k: 'weaken', a: 2, h: 2, tg: 'cre' }, art: '⛓️' },
    n_schleicher: { n: 'Schattenschleicher', f: 'nacht', r: 'g', t: 'k', c: 2, a: 2, h: 1, kw: ['bedroh'], art: '🐈‍⬛' },
    n_fresser: { n: 'Knochenfresser', f: 'nacht', r: 's', t: 'k', c: 4, a: 3, h: 3, kw: ['gift'], art: '🦂' },
    l_fessel: { n: 'Fesseln des Lichts', f: 'licht', r: 'g', t: 'a', c: 2, e: { k: 'buff', a: 0, h: 0, kw: ['bann'], tg: 'ecre' }, art: '🔗' },
    l_sani: { n: 'Feldsanitäterin', f: 'licht', r: 'g', t: 'k', c: 2, a: 1, h: 3, act: { tap: 1, e: { k: 'heal', n: 2 } }, art: '🧑‍⚕️' },
    l_himmel: { n: 'Himmelswächterin', f: 'licht', r: 's', t: 'k', c: 3, a: 2, h: 2, kw: ['flug', 'wach'], art: '🕊️' },
    // ---------- Glut ----------
    g_kobold: { n: 'Funkenkobold', f: 'glut', t: 'k', c: 1, a: 2, h: 1, kw: ['eile'], art: '👺' },
    g_fuchs: { n: 'Glutfuchs', f: 'glut', t: 'k', c: 2, a: 3, h: 2, art: '🦊' },
    g_brand: { n: 'Brandstifter', f: 'glut', t: 'k', c: 2, a: 2, h: 2, e: { k: 'face', n: 1 }, art: '🧨', txt: 'Ruf: 1 Schaden an den Gegner.' },
    g_stoss: { n: 'Flammenstoß', f: 'glut', t: 'z', inst: 1, c: 1, e: { k: 'dmg', n: 2, tg: 'any' }, art: '🔥', txt: '2 Schaden an ein beliebiges Ziel.' },
    g_krieger: { n: 'Aschenkrieger', f: 'glut', t: 'k', c: 3, a: 3, h: 2, kw: ['erst', 'eile'], art: '🗡️' },
    g_phoenix: { n: 'Phönixküken', f: 'glut', t: 'k', r: 's', c: 3, a: 2, h: 2, kw: ['flug'], e: { k: 'dmg', n: 1, tg: 'any' }, art: '🐦', txt: 'Ruf: 1 Schaden an ein beliebiges Ziel.' },
    g_rausch: { n: 'Kampfrausch', f: 'glut', t: 'z', inst: 1, c: 2, e: { k: 'buff', a: 3, h: 1, tg: 'own' }, art: '💢', txt: 'Eine eigene Kreatur bekommt +3/+1.' },
    g_golem: { n: 'Lavagolem', f: 'glut', t: 'k', c: 4, a: 4, h: 5, art: '🌋' },
    g_sturm: { n: 'Feuersturm', f: 'glut', t: 'z', r: 's', c: 4, e: { k: 'dmgAll', n: 2, side: 'foe' }, art: '🎆', txt: '2 Schaden an alle gegnerischen Kreaturen.' },
    g_meteor: { n: 'Meteor', f: 'glut', t: 'z', r: 's', c: 5, e: { k: 'dmg', n: 5, tg: 'any' }, art: '☄️', txt: '5 Schaden an ein beliebiges Ziel.' },
    g_drache: { n: 'Glutdrache', f: 'glut', t: 'k', r: 'e', c: 6, a: 5, h: 5, kw: ['flug'], art: '🐉' },
    g_titan: { n: 'Magmatitan', f: 'glut', t: 'k', r: 'e', c: 7, a: 7, h: 6, kw: ['durch'], e: { k: 'face', n: 2 }, art: '👹', txt: 'Ruf: 2 Schaden an den Gegner.' },
    // ---------- Wildnis ----------
    w_moos: { n: 'Moosling', f: 'wild', t: 'k', c: 1, a: 1, h: 3, kw: ['mauer'], art: '🌱' },
    w_wolf: { n: 'Waldwolf', f: 'wild', t: 'k', c: 2, a: 3, h: 2, art: '🐺' },
    w_samen: { n: 'Kristallsamen', f: 'wild', t: 'z', c: 2, e: { k: 'ramp' }, art: '🌰', txt: '+1 Kristall – sofort und dauerhaft.' },
    w_peitsche: { n: 'Rankenpeitsche', f: 'wild', t: 'z', inst: 1, c: 2, e: { k: 'dmg', n: 3, tg: 'cre' }, art: '🌿', txt: '3 Schaden an eine Kreatur.' },
    w_dorn: { n: 'Dornenwächter', f: 'wild', t: 'k', c: 3, a: 2, h: 4, kw: ['wache', 'reich'], art: '🌵' },
    w_hirsch: { n: 'Hainhirsch', f: 'wild', t: 'k', r: 's', c: 3, a: 3, h: 3, kw: ['wach'], art: '🦌' },
    w_kraut: { n: 'Heilkräuter', f: 'wild', t: 'z', inst: 1, c: 2, e: { k: 'heal', n: 4, draw: 1 }, art: '🍃', txt: 'Heile dich um 4 und ziehe 1 Karte.' },
    w_wuchs: { n: 'Riesenwuchs', f: 'wild', t: 'z', inst: 1, c: 3, e: { k: 'buff', a: 3, h: 3, tg: 'own' }, art: '💪', txt: 'Eine eigene Kreatur bekommt +3/+3.' },
    w_baer: { n: 'Bärenmutter', f: 'wild', t: 'k', r: 's', c: 4, a: 4, h: 3, e: { k: 'token', id: 'w_junges', n: 1 }, art: '🐻', txt: 'Ruf: Beschwört ein Bärenjunges (2/2).' },
    w_hydra: { n: 'Sumpfhydra', f: 'wild', t: 'k', r: 's', c: 5, a: 5, h: 4, kw: ['durch', 'reich'], art: '🐍' },
    w_herde: { n: 'Herdenruf', f: 'wild', t: 'z', r: 'e', c: 5, e: { k: 'buffAll', a: 2, h: 2 }, art: '🐘', txt: 'Alle eigenen Kreaturen bekommen +2/+2.' },
    w_riese: { n: 'Urwaldriese', f: 'wild', t: 'k', r: 'e', c: 7, a: 8, h: 8, kw: ['durch'], art: '🦍' },
    w_junges: { n: 'Bärenjunges', f: 'wild', t: 'k', c: 1, a: 2, h: 2, art: '🧸', tok: 1 },
    // ---------- Flut ----------
    f_fee: { n: 'Wasserfee', f: 'flut', t: 'k', c: 1, a: 1, h: 2, kw: ['flug'], art: '🧚' },
    f_muschel: { n: 'Muschelwache', f: 'flut', t: 'k', c: 2, a: 1, h: 4, kw: ['wache', 'schild'], art: '🐚' },
    f_frost: { n: 'Frostblick', f: 'flut', t: 'z', inst: 1, c: 1, e: { k: 'freeze', tg: 'ecre', draw: 1 }, art: '❄️', txt: 'Friere eine gegnerische Kreatur ein und ziehe 1 Karte.' },
    f_einfall: { n: 'Eingebung', f: 'flut', t: 'z', c: 3, e: { k: 'draw', n: 2 }, art: '💭', txt: 'Ziehe 2 Karten.' },
    f_sirene: { n: 'Sirene', f: 'flut', t: 'k', r: 's', c: 3, a: 2, h: 2, kw: ['flug'], e: { k: 'draw', n: 1 }, art: '🧜', txt: 'Ruf: Ziehe 1 Karte.' },
    f_falke: { n: 'Sturmfalke', f: 'flut', t: 'k', c: 3, a: 3, h: 2, kw: ['flug'], art: '🦅' },
    f_welle: { n: 'Flutwelle', f: 'flut', t: 'z', inst: 1, r: 's', c: 2, e: { k: 'bounce', tg: 'cre' }, art: '🌊', txt: 'Schicke eine Kreatur auf die Hand ihres Besitzers zurück.' },
    f_schild: { n: 'Wasserschild', f: 'flut', t: 'z', inst: 1, c: 1, e: { k: 'buff', a: 0, h: 2, shield: 1, tg: 'own' }, art: '🫧', txt: 'Eine eigene Kreatur bekommt +0/+2 und Schild.' },
    f_golem: { n: 'Eisgolem', f: 'flut', t: 'k', r: 's', c: 4, a: 3, h: 5, e: { k: 'freeze', tg: 'ecre' }, art: '🧊', txt: 'Ruf: Friere eine gegnerische Kreatur ein.' },
    f_strudel: { n: 'Zeitstrudel', f: 'flut', t: 'z', r: 'e', c: 5, e: { k: 'freezeAll' }, art: '🌀', txt: 'Friere alle gegnerischen Kreaturen ein.' },
    f_wal: { n: 'Wolkenwal', f: 'flut', t: 'k', r: 's', c: 5, a: 4, h: 6, kw: ['flug'], art: '🐋' },
    f_krake: { n: 'Tiefseekrake', f: 'flut', t: 'k', r: 'e', c: 7, a: 6, h: 7, e: { k: 'bounce', tg: 'ecre' }, art: '🐙', txt: 'Ruf: Schicke eine gegnerische Kreatur auf die Hand zurück.' },
    // ---------- Schatten ----------
    n_ratte: { n: 'Pestratte', f: 'nacht', t: 'k', c: 1, a: 1, h: 1, kw: ['gift'], art: '🐀' },
    n_pakt: { n: 'Dunkler Pakt', f: 'nacht', t: 'z', inst: 1, c: 1, e: { k: 'draw', n: 2, self: 2 }, art: '📜', txt: 'Ziehe 2 Karten, du verlierst 2 Leben.' },
    n_fleder: { n: 'Blutfledermaus', f: 'nacht', t: 'k', c: 2, a: 2, h: 1, kw: ['flug', 'saug'], art: '🦇' },
    n_spinne: { n: 'Giftspinne', f: 'nacht', t: 'k', c: 2, a: 1, h: 3, kw: ['gift'], art: '🕷️' },
    n_zug: { n: 'Seelenzug', f: 'nacht', t: 'z', inst: 1, c: 2, e: { k: 'drain', n: 2 }, art: '👻', txt: '2 Schaden an den Gegner, du heilst dich um 2.' },
    n_meuchler: { n: 'Schattenmeuchler', f: 'nacht', t: 'k', r: 's', c: 3, a: 4, h: 2, kw: ['erst', 'eile'], art: '🥷' },
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
    w_eiche: { n: 'Wächtereiche', f: 'wild', r: 's', t: 'k', c: 4, a: 2, h: 7, kw: ['wache', 'reich', 'mauer'], art: '🌳' },
    w_druide: { n: 'Hain-Druidin', f: 'wild', r: 's', t: 'k', c: 3, a: 2, h: 2, e: { k: 'ramp' }, art: '🧝', txt: 'Ruf: +1 Kristall – sofort und dauerhaft.' },
    w_loewe: { n: 'Steppenlöwe', f: 'wild', r: 'e', t: 'k', c: 5, a: 4, h: 4, e: { k: 'buffOthers', a: 1, h: 1 }, art: '🦁', txt: 'Ruf: Deine anderen Kreaturen bekommen +1/+1.' },
    w_jagd: { n: 'Wilde Jagd', f: 'wild', r: 'e', t: 'z', c: 5, e: { k: 'token', id: 'w_jwolf', n: 3 }, art: '🏹', txt: 'Beschwört 3 Jagdhunde (2/2, Eile).' },
    w_brakka: { n: 'Urmammut Brakka', f: 'wild', r: 'l', t: 'k', c: 6, a: 5, h: 6, kw: ['durch'], wachs: [1, 1], art: '🦣', txt: 'Wächst: Zu Beginn deines Zuges +1/+1.' },
    w_gaia: { n: 'Gaia, Herz des Hains', f: 'wild', r: 'l', t: 'k', c: 9, a: 9, h: 9, kw: ['durch', 'reich'], e: { k: 'heal', n: 6 }, art: '🌍', txt: 'Ruf: Heile dich um 6.' },
    w_spor: { n: 'Sporling', f: 'wild', t: 'k', c: 1, a: 1, h: 1, art: '🦠', tok: 1 },
    w_jwolf: { n: 'Jagdhund', f: 'wild', t: 'k', c: 2, a: 2, h: 2, kw: ['eile'], art: '🐕', tok: 1 },
    f_krabbe: { n: 'Panzerkrabbe', f: 'flut', r: 'g', t: 'k', c: 2, a: 2, h: 2, kw: ['schild'], art: '🦀' },
    f_otter: { n: 'Flussotter', f: 'flut', r: 'g', t: 'k', c: 2, a: 2, h: 3, kw: ['wach'], art: '🦦' },
    f_hai: { n: 'Riffhai', f: 'flut', r: 's', t: 'k', c: 4, a: 5, h: 3, kw: ['erst'], art: '🦈' },
    f_nebel: { n: 'Nebelschleier', f: 'flut', r: 's', t: 'z', inst: 1, c: 3, e: { k: 'shieldAll' }, art: '🌫️', txt: 'Alle deine Kreaturen bekommen Schild.' },
    f_magier: { n: 'Gezeitenmagier', f: 'flut', r: 'e', t: 'k', c: 4, a: 2, h: 4, e: { k: 'draw', n: 2 }, art: '🔮', txt: 'Ruf: Ziehe 2 Karten.' },
    f_orakel: { n: 'Orakel der Tiefe', f: 'flut', r: 'l', t: 'k', c: 5, a: 3, h: 5, kw: ['flug'], e: { k: 'draw', n: 1 }, tod: { k: 'draw', n: 2 }, art: '🧿', txt: 'Ruf: Ziehe 1 Karte. Nachhall: Ziehe 2 Karten.' },
    f_levi: { n: 'Leviathan', f: 'flut', r: 'l', t: 'k', c: 8, a: 7, h: 8, e: { k: 'freezeAll' }, art: '🐳', txt: 'Ruf: Friere alle gegnerischen Kreaturen ein.' },
    n_skelett: { n: 'Skelettkrieger', f: 'nacht', r: 'g', t: 'k', c: 2, a: 2, h: 2, tod: { k: 'token', id: 'n_knochen', n: 1 }, art: '🦴', txt: 'Nachhall: Beschwört einen Knochenhaufen (1/1).' },
    n_kauz: { n: 'Totenkauz', f: 'nacht', r: 'g', t: 'k', c: 1, a: 1, h: 1, kw: ['flug'], tod: { k: 'draw', n: 1 }, art: '🦉', txt: 'Nachhall: Ziehe 1 Karte.' },
    n_hexe: { n: 'Sumpfhexe', f: 'nacht', r: 's', t: 'k', c: 3, a: 2, h: 3, e: { k: 'drain', n: 2 }, art: '🧙‍♀️', txt: 'Ruf: 2 Schaden an den Gegner, du heilst dich um 2.' },
    n_verderb: { n: 'Verderbnis', f: 'nacht', r: 's', t: 'z', inst: 1, c: 2, e: { k: 'weaken', a: 2, h: 2, tg: 'cre' }, art: '🦠', txt: 'Eine Kreatur bekommt dauerhaft −2/−2.' },
    n_faenger: { n: 'Seelenfänger', f: 'nacht', r: 'e', t: 'k', c: 6, a: 3, h: 4, e: { k: 'steal', max: 3, tg: 'ecre' }, art: '🪦', txt: 'Ruf: Übernimm eine gegnerische Kreatur mit höchstens 3 Angriff.' },
    n_morgul: { n: 'Knochendrache Morgul', f: 'nacht', r: 'l', t: 'k', c: 7, a: 5, h: 5, kw: ['flug'], tod: { k: 'token', id: 'n_geist', n: 1 }, art: '🐲', txt: 'Nachhall: Kehrt als Drachengeist (3/3, Flug, Lebensentzug) zurück.' },
    n_gruft: { n: 'Fürst der Gruft', f: 'nacht', r: 'l', t: 'k', c: 8, a: 5, h: 7, e: { k: 'revive', n: 2 }, art: '⚱️', txt: 'Ruf: Holt deine 2 zuletzt gestorbenen Kreaturen zurück.' },
    n_knochen: { n: 'Knochenhaufen', f: 'nacht', t: 'k', c: 1, a: 1, h: 1, art: '☠️', tok: 1 },
    n_geist: { n: 'Drachengeist', f: 'nacht', t: 'k', c: 4, a: 3, h: 3, kw: ['flug', 'saug'], art: '👻', tok: 1 },
    // ---------- Licht ----------
    l_novize: { n: 'Lichtnovizin', f: 'licht', r: 'g', t: 'k', c: 1, a: 1, h: 2, e: { k: 'heal', n: 2 }, art: '🕯️', txt: 'Ruf: Heile dich um 2.' },
    l_knappe: { n: 'Schildknappe', f: 'licht', r: 'g', t: 'k', c: 2, a: 2, h: 2, kw: ['schild'], art: '⚔️' },
    l_segen: { n: 'Segen', f: 'licht', r: 'g', t: 'z', inst: 1, c: 1, e: { k: 'buff', a: 1, h: 2, tg: 'own' }, art: '✨', txt: 'Eine eigene Kreatur bekommt +1/+2.' },
    l_ross: { n: 'Himmelsross', f: 'licht', r: 'g', t: 'k', c: 3, a: 2, h: 3, kw: ['flug'], art: '🐎' },
    l_ritter: { n: 'Sonnenritter', f: 'licht', r: 'g', t: 'k', c: 3, a: 3, h: 3, kw: ['erst', 'wach'], art: '🤺' },
    l_haende: { n: 'Heilende Hände', f: 'licht', r: 'g', t: 'z', c: 2, e: { k: 'heal', n: 5 }, art: '🙏', txt: 'Heile dich um 5.' },
    l_strahl: { n: 'Lichtstrahl', f: 'licht', r: 'g', t: 'z', inst: 1, c: 2, e: { k: 'dmg', n: 2, tg: 'cre', heal: 2 }, art: '🔆', txt: '2 Schaden an eine Kreatur, du heilst dich um 2.' },
    l_waechter: { n: 'Tempelwächter', f: 'licht', r: 'g', t: 'k', c: 4, a: 2, h: 6, kw: ['wache', 'reich'], art: '🗿' },
    l_moench: { n: 'Bergmönch', f: 'licht', r: 'g', t: 'k', c: 2, a: 2, h: 3, art: '🧘' },
    l_paladin: { n: 'Paladin', f: 'licht', r: 's', t: 'k', c: 4, a: 3, h: 4, kw: ['saug'], art: '🦸' },
    l_engel: { n: 'Schutzengel', f: 'licht', r: 's', t: 'k', c: 5, a: 4, h: 5, kw: ['flug', 'wach'], art: '👼' },
    l_sonne: { n: 'Sonnenfeuer', f: 'licht', r: 's', t: 'z', c: 4, e: { k: 'dmgAll', n: 2, side: 'foe', heal: 2 }, art: '☀️', txt: '2 Schaden an alle gegnerischen Kreaturen, du heilst dich um 2.' },
    l_schild: { n: 'Göttlicher Schild', f: 'licht', r: 's', t: 'z', inst: 1, c: 3, e: { k: 'shieldAll' }, art: '🌟', txt: 'Alle deine Kreaturen bekommen Schild.' },
    l_einhorn: { n: 'Einhorn', f: 'licht', r: 'e', t: 'k', c: 5, a: 4, h: 4, kw: ['schild'], e: { k: 'heal', n: 4 }, art: '🦄', txt: 'Ruf: Heile dich um 4.' },
    l_bann: { n: 'Bannlicht', f: 'licht', r: 'e', t: 'z', c: 5, e: { k: 'kill', tg: 'cre' }, art: '⚡', txt: 'Zerstöre eine Kreatur.' },
    l_koenig: { n: 'Sonnenkönig Aurel', f: 'licht', r: 'l', t: 'k', c: 6, a: 4, h: 5, e: { k: 'buffOthers', a: 1, h: 1, shield: 1 }, art: '👑', txt: 'Ruf: Deine anderen Kreaturen bekommen +1/+1 und Schild.' },
    l_seraph: { n: 'Erzengel Seraphiel', f: 'licht', r: 'l', t: 'k', c: 8, a: 6, h: 7, kw: ['flug', 'wach', 'saug'], art: '😇' },
  };
  // Helden: eigener großer Platz im Deck (nicht Teil der 30 Karten). Heldenkraft einsetzbar, wenn die Abklingzeit (in eigenen Zügen) vorbei ist.
  // Sammeln: 1 % Chance pro Themenpack auf den Helden des Themas. Den Abenteuer-Helden hat jeder von Anfang an.
  const HEROES = {
    abent: { n: 'Hauptmann Aldric', art: '🦸‍♂️', pow: 'Schwerthieb', cd: 3, e: { k: 'dmg', n: 2, tg: 'any' }, txt: '2 Schaden an ein beliebiges Ziel.' },
    glut: { n: 'Flammenkönigin Pyra', art: '👸', pow: 'Feuerregen', cd: 3, e: { k: 'dmgAll', n: 1, side: 'foe', face: 2 }, txt: '1 Schaden an alle gegnerischen Kreaturen und 2 an den Gegner.' },
    wild: { n: 'Waldkönig Ur', art: '🧔', pow: 'Urwuchs', cd: 3, e: { k: 'buff', a: 1, h: 1, tg: 'own', kw: ['durch'] }, txt: 'Eine eigene Kreatur bekommt dauerhaft +1/+1 und Trampelschaden.' },
    flut: { n: 'Meereskaiserin Nerea', art: '🧜‍♀️', pow: 'Gezeitenbann', cd: 3, e: { k: 'freeze', tg: 'ecre', draw: 1 }, txt: 'Friere eine gegnerische Kreatur ein und ziehe 1 Karte.' },
    nacht: { n: 'Nekromant Morvan', art: '🧛‍♂️', pow: 'Seelenraub', cd: 3, e: { k: 'drain', n: 3 }, txt: '3 Schaden an den Gegner, du heilst dich um 3.' },
    licht: { n: 'Hohepriesterin Lumen', art: '🧝‍♀️', pow: 'Heiliger Schutz', cd: 3, e: { k: 'shieldAll', heal: 2 }, txt: 'Alle deine Kreaturen bekommen Schild, du heilst dich um 2.' },
  };
  const HERO_P = 0.01; // pro Pack

  // ---------- Grundländer, Manakosten und Kartentexte ----------
  for (const [f, x] of Object.entries(F)) C['land_' + x.m] = { n: x.land, f, r: 'g', t: 'l', c: 0, col: x.m, art: x.landArt, basic: 1 };
  const COLORS = Object.fromEntries(Object.entries(F).map(([f, x]) => [x.m, f]));
  for (const c of Object.values(C)) {
    if (c.t === 'l' || c.tok) continue;
    if (!c.m) { const L = F[c.f].m, pips = c.c <= 2 ? 1 : c.c <= 5 ? (c.r === 'e' || c.r === 'l' ? 2 : 1) : 2, gen = Math.max(0, c.c - pips); c.m = (gen ? String(gen) : '') + L.repeat(Math.min(pips, c.c)); }
  }
  // Kosten zerlegen: '2RR' -> { gen: 2, R: 2 }
  const parseCost = m => { const o = { gen: 0 }; const n = String(m || '').match(/^\d+/); if (n) o.gen = Number(n[0]); for (const ch of String(m || '').replace(/^\d+/, '')) o[ch] = (o[ch] || 0) + 1; return o; };
  const cmc = m => { const o = parseCost(m); return Object.values(o).reduce((a, b) => a + b, 0); };
  const TYPE = c => c.t === 'k' ? 'Kreatur' : c.t === 'a' ? 'Verzauberung — Aura' : c.t === 'l' ? 'Standardland' : c.inst ? 'Spontanzauber' : 'Hexerei';
  const pl = (n, one, many) => n === 1 ? one : many;
  function effText(e, name) {
    const tgt = { any: 'einem Ziel deiner Wahl', cre: 'einer Kreatur deiner Wahl', ecre: 'einer Kreatur deiner Wahl, die ein Gegner kontrolliert', own: 'einer Kreatur deiner Wahl, die du kontrollierst' }[e.tg] || '';
    const kwl = e.kw && e.kw.length ? ' und ' + e.kw.map(k => KW[k] ? KW[k][1] : k).join(' und ') : '';
    let t = '';
    switch (e.k) {
      case 'dmg': t = `füge ${tgt} ${e.n} ${pl(e.n, 'Schadenspunkt', 'Schadenspunkte')} zu`; break;
      case 'face': t = `füge jedem Gegner ${e.n} ${pl(e.n, 'Schadenspunkt', 'Schadenspunkte')} zu`; break;
      case 'drain': t = `jeder Gegner verliert ${e.n} Lebenspunkte und du erhältst ${e.n} Lebenspunkte dazu`; break;
      case 'heal': t = `du erhältst ${e.n} Lebenspunkte dazu`; break;
      case 'draw': t = `ziehe ${e.n === 1 ? 'eine Karte' : e.n + ' Karten'}${e.self ? ` und verliere ${e.self} Lebenspunkte` : ''}`; break;
      case 'kill': t = 'zerstöre eine Kreatur deiner Wahl'; break;
      case 'bounce': t = `bringe ${e.tg === 'ecre' ? 'eine Kreatur deiner Wahl, die ein Gegner kontrolliert,' : 'eine Kreatur deiner Wahl'} auf die Hand ihres Besitzers zurück`; break;
      case 'freeze': t = `tappe ${e.tg === 'ecre' ? 'eine Kreatur deiner Wahl, die ein Gegner kontrolliert' : 'eine Kreatur deiner Wahl'}. Sie enttappt während des nächsten Enttappsegments ihres Beherrschers nicht`; break;
      case 'freezeAll': t = 'tappe alle Kreaturen deiner Gegner. Sie enttappen während des nächsten Enttappsegments nicht'; break;
      case 'buff': t = e.kw && e.kw.includes('bann') && !e.a && !e.h ? 'die verzauberte Kreatur kann weder angreifen noch blocken' : `${e.aura ? 'die verzauberte Kreatur' : 'eine Kreatur deiner Wahl, die du kontrollierst,'} erhält +${e.a}/+${e.h}${kwl}${e.shield ? ' und Schutzschild' : ''}`; break;
      case 'buffAll': t = `Kreaturen, die du kontrollierst, erhalten +${e.a}/+${e.h}`; break;
      case 'buffOthers': t = `andere Kreaturen, die du kontrollierst, erhalten +${e.a}/+${e.h}${e.shield ? ' und Schutzschild' : ''}`; break;
      case 'shieldAll': t = 'Kreaturen, die du kontrollierst, erhalten Schutzschild'; break;
      case 'weaken': t = `${e.aura ? 'die verzauberte Kreatur' : 'eine Kreatur deiner Wahl'} erhält -${e.a}/-${e.h}`; break;
      case 'steal': t = `übernimm die Kontrolle über eine Kreatur mit Stärke ${e.max} oder weniger, die ein Gegner kontrolliert`; break;
      case 'dmgAll': t = `füge ${e.side === 'all' ? 'jeder Kreatur' : 'jeder Kreatur, die ein Gegner kontrolliert,'} ${e.n} ${pl(e.n, 'Schadenspunkt', 'Schadenspunkte')} zu`; break;
      case 'token': { const T = C[e.id]; t = `erzeuge ${e.n === 1 ? 'einen' : e.n} ${T.a}/${T.h} ${pl(e.n, 'Kreaturenspielstein', 'Kreaturenspielsteine')} „${T.n}“${T.kw && T.kw.length ? ' mit ' + T.kw.map(k => KW[k][1]).join(' und ') : ''}`; break; }
      case 'ramp': t = 'bringe ein Grundland aus deiner Bibliothek getappt ins Spiel'; break;
      case 'revive': t = e.n > 1 ? `bringe die letzten ${e.n} Kreaturen, die in deinen Friedhof gelegt wurden, ins Spiel zurück` : 'bringe die letzte Kreatur, die in deinen Friedhof gelegt wurde, ins Spiel zurück'; break;
    }
    if (e.heal && e.k !== 'heal') t += `. Du erhältst ${e.heal} Lebenspunkte dazu`;
    if (e.face) t += `. Füge jedem Gegner ${e.face} Schadenspunkte zu`;
    if (e.draw && e.k !== 'draw') t += `. Ziehe ${e.draw === 1 ? 'eine Karte' : e.draw + ' Karten'}`;
    return t;
  }
  const cap = t => t ? t[0].toUpperCase() + t.slice(1) + '.' : '';
  const costTxt = m => { const o = parseCost(m); return (o.gen ? `{${o.gen}}` : '') + Object.entries(o).filter(([k]) => k !== 'gen').map(([k, n]) => `{${k}}`.repeat(n)).join(''); };
  for (const [id, c] of Object.entries(C)) {
    c.tl = TYPE(c);
    if (c.t === 'a' && c.e) c.e.aura = 1;
    if (c.t === 'l') { c.txt = `⟳: Erzeuge {${c.col}}.`; continue; }
    const parts = [];
    if (c.t === 'k' && c.e) parts.push(`Wenn ${c.n} ins Spiel kommt, ${effText(c.e, c.n)}.`);
    if (c.t !== 'k' && c.e) parts.push(cap(effText(c.e, c.n)));
    if (c.wachs) parts.push(`Zu Beginn deines Zuges erhält ${c.n} +${c.wachs[0]}/+${c.wachs[1]}.`);
    if (c.tod) parts.push(`Wenn ${c.n} stirbt, ${effText(c.tod, c.n)}.`);
    if (c.act) parts.push(`${c.act.m ? costTxt(c.act.m) + ', ' : ''}${c.act.tap ? '⟳' : ''}: ${cap(effText(c.act.e, c.n))}`);
    c.txt = parts.join(' ');
  }
  // Grunddecks: je 40 Karten (23 Zauber/Kreaturen + 17 Länder)
  const DECKS = {
    abent: { a_bauer: 2, a_hund: 2, a_bogen: 2, a_wache: 2, a_wegelag: 2, a_reiter: 2, a_schmied: 2, a_ritter: 2, a_riese: 2, a_trank: 1, a_pfeil: 2, a_klee: 1, a_kompass: 1, land_A: 17 },
    glut: { g_kobold: 3, g_fuchs: 3, g_brand: 3, g_stoss: 3, g_krieger: 3, g_phoenix: 2, g_rausch: 2, g_golem: 3, g_sturm: 2, g_meteor: 2, g_drache: 2, g_titan: 2 },
    wild: { w_moos: 2, w_wolf: 3, w_samen: 3, w_peitsche: 3, w_dorn: 3, w_hirsch: 3, w_kraut: 2, w_wuchs: 2, w_baer: 3, w_hydra: 2, w_herde: 2, w_riese: 2 },
    flut: { f_fee: 3, f_muschel: 3, f_frost: 3, f_einfall: 2, f_sirene: 3, f_falke: 3, f_welle: 2, f_schild: 2, f_golem: 3, f_strudel: 2, f_wal: 2, f_krake: 2 },
    nacht: { n_ratte: 3, n_pakt: 2, n_fleder: 3, n_spinne: 2, n_zug: 3, n_meuchler: 3, n_grab: 2, n_ghul: 3, n_fluch: 3, n_pest: 2, n_vampir: 2, n_lich: 2 },
    licht: { l_novize: 3, l_knappe: 3, l_segen: 3, l_ross: 3, l_ritter: 3, l_haende: 2, l_strahl: 3, l_waechter: 2, l_moench: 2, l_paladin: 2, l_engel: 2, l_sonne: 2 },
  };
  for (const [id, c] of Object.entries(C)) if (!c.tok && !c.r) c.r = 'g';
  // alte 30er-Listen -> 40er-Decks: 23 Zauber/Kreaturen + 17 Länder passend zu den Farben
  function to40(list) {
    if (Object.keys(list).some(id => id.startsWith('land_'))) return list;
    const d = { ...list }; let n = Object.values(d).reduce((a, b) => a + b, 0);
    while (n > 23) { const id = Object.keys(d).sort((a, b) => d[b] - d[a] || C[b].c - C[a].c)[0]; if (--d[id] <= 0) delete d[id]; n--; }
    const col = {}; for (const [id, k] of Object.entries(d)) { const o = parseCost(C[id].m); for (const [ch, x] of Object.entries(o)) if (ch !== 'gen') col[ch] = (col[ch] || 0) + x * k; }
    const tot = Object.values(col).reduce((a, b) => a + b, 0) || 1, cols = Object.keys(col).sort((a, b) => col[b] - col[a]); let left = 17;
    cols.forEach((ch, i) => { const k = i === cols.length - 1 ? left : Math.max(1, Math.round(17 * col[ch] / tot)); d['land_' + ch] = (d['land_' + ch] || 0) + Math.min(k, left); left -= Math.min(k, left); });
    return d;
  }
  for (const f of Object.keys(DECKS)) DECKS[f] = to40(DECKS[f]);
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

  // Spielmodi – gleiche Karten, andere Kampfregeln
  const MODES = {
    klassisch: { n: 'Duell', e: '🃏', short: 'Angreifen und Blocken', rules: [
      'Pro Zug darfst du ein Land ausspielen. Länder tappen sich automatisch, um deine Karten zu bezahlen.',
      'Du greifst mit beliebig vielen Kreaturen an, dein Gegner verteilt seine Blocker – auch mehrere gegen einen Angreifer.',
      'Spontanzauber, Kreaturen mit Aufblitzen und ⟳-Fähigkeiten gehen auch im gegnerischen Zug: beim Blocken oder als Kampftrick.',
      'Schaden an Kreaturen heilt am Ende des Zuges. Wer auf 0 Lebenspunkte fällt, verliert.',
    ] },
  };
  // Kampfgebiete (Trophäenweg). bot: Fehlerquote der Bots, smart: Bots nutzen Mehrfachblocks, Sofortzauber und planen voraus.
  // odds: Pack-Chancen in % (l = legendär), hero: Helden-Chance pro Pack in %.
  const ARENAS = [
    { n: 'Dorfplatz', e: '🗺️', t: 0, col: '#e0a050', col2: '#3a2410' },
    { n: 'Erntefelder', e: '🌾', t: 200, col: '#d8c050', col2: '#3a3410' },
    { n: 'Glutschlucht', e: '🔥', t: 450, col: '#ff5a3d', col2: '#3a0f08' },
    { n: 'Wilder Hain', e: '🌿', t: 750, col: '#3ec46d', col2: '#0a2a14' },
    { n: 'Gezeitenküste', e: '💧', t: 1100, col: '#3aa8ff', col2: '#08203a' },
    { n: 'Sonnenwüste', e: '🏜️', t: 1500, col: '#f0b040', col2: '#3a2008' },
    { n: 'Schattengruft', e: '💀', t: 1950, col: '#a45cff', col2: '#1a0a30' },
    { n: 'Frostgipfel', e: '❄️', t: 2450, col: '#9fe9ff', col2: '#0a2030' },
    { n: 'Lichttempel', e: '✨', t: 3000, col: '#f5c542', col2: '#3a2a08' },
    { n: 'Drachenhort', e: '🐉', t: 3600, col: '#ff7a2a', col2: '#2a0a04' },
    { n: 'Sternenreich', e: '🌌', t: 4300, col: '#7a6aff', col2: '#08061e' },
    { n: 'Kristallthron', e: '💎', t: 5000, col: '#9ff3ff', col2: '#1a1040' },
  ];
  ARENAS.forEach((a, i) => {
    const t = i / (ARENAS.length - 1);
    a.bot = Math.max(0, +(0.4 - 0.4 * t).toFixed(2)); a.smart = i >= 4; a.lv = Math.min(5, 1 + Math.floor(i / 2.5));
    const l = +(0.5 + 4 * t).toFixed(1), e = +(6 + 8 * t).toFixed(1), sr = +(25 + 5 * t).toFixed(1);
    a.odds = { l, e, s: sr, g: +(100 - l - e - sr).toFixed(1) }; a.hero = +(1 + 3 * t).toFixed(1);
  });
  const arenaOf = tr => { let i = 0; ARENAS.forEach((a, k) => { if ((tr || 0) >= a.t) i = k; }); return i; };
  // Pack-Arten: größere Packs ab höheren Kampfgebieten
  const PACKS = {
    klein: { n: 'Pack', size: 5, cost: 100, min: 0, sure: 's', txt: '5 Karten, mindestens 1 seltene' },
    gross: { n: 'Großes Pack', size: 8, cost: 180, min: 3, sure: 's', sure2: 1, txt: '8 Karten, mindestens 2 seltene' },
    koenig: { n: 'Königspack', size: 10, cost: 350, min: 6, sure: 'e', txt: '10 Karten, mindestens 1 seltene, doppelte Helden-Chance' },
    legende: { n: 'Mythospack', size: 12, cost: 700, min: 9, sure: 'l', txt: '12 Karten, mindestens 1 mythische, dreifache Helden-Chance' },
  };
  // Bot-Decks pro Kampfgebiet (zufällig gewählt)
  const D = str => Object.fromEntries(str.trim().split(/\s+/).map(x => { const [id, n] = x.split('*'); return [id, Number(n)]; }));
  const BOTDECKS = [
    [['Bauernwehr', 'a_bauer*3 a_hund*3 a_bogen*3 a_wache*3 a_reiter*3 a_schmied*3 a_ritter*3 a_riese*3 a_trank*2 a_pfeil*2 a_klee*2'],
     ['Ritterzug', 'a_bauer*2 a_hund*2 a_bogen*3 a_wache*3 a_reiter*3 a_schmied*3 a_ritter*3 a_riese*3 a_trank*3 a_pfeil*3 a_klee*1 a_karte*1'],
     ['Gauklertruppe', 'g_kobold*3 g_fuchs*3 g_brand*3 g_krieger*3 g_golem*3 a_bauer*3 a_wache*3 a_ritter*3 g_stoss*3 a_trank*3']],
    [['Erntehelfer', 'a_bauer*3 w_pilz*3 w_wolf*3 a_wache*3 w_eber*3 w_dorn*3 a_ritter*3 a_riese*2 w_kraut*2 w_peitsche*3 w_samen*2'],
     ['Wolfsrudel', 'w_wolf*3 a_hund*3 w_pilz*3 w_moos*2 w_eber*3 w_dorn*3 a_reiter*3 a_ritter*3 w_wuchs*3 w_peitsche*2 a_klee*2'],
     ['Hofhunde', 'a_hund*3 a_bauer*3 a_bogen*3 a_wache*3 a_schmied*3 a_reiter*3 a_ritter*3 a_riese*3 a_magier*1 a_pfeil*3 a_trank*2']],
    [['Funkenflug', 'g_kobold*3 g_fuchs*3 g_brand*3 g_salam*2 g_krieger*3 g_phoenix*2 g_berserk*2 g_golem*3 g_stoss*3 g_regen*2 g_rausch*2 g_sturm*2'],
     ['Lavawall', 'g_fuchs*3 g_brand*3 a_wache*3 g_krieger*3 g_golem*3 a_ritter*3 a_riese*3 g_stoss*3 g_meteor*2 g_rausch*2 a_trank*2'],
     ['Brandschatzer', 'g_kobold*3 g_brand*3 g_salam*3 g_krieger*3 g_berserk*3 g_phoenix*3 g_golem*2 g_stoss*3 g_regen*3 g_meteor*2 g_sturm*2']],
    [['Hainwacht', 'w_moos*2 w_wolf*3 w_pilz*3 w_dorn*3 w_hirsch*3 w_eber*3 w_druide*2 w_baer*3 w_eiche*2 w_hydra*2 w_peitsche*2 w_wuchs*2'],
     ['Bärenkraft', 'w_wolf*3 w_pilz*2 w_dorn*3 w_hirsch*3 w_baer*3 w_eber*3 w_hydra*3 w_samen*3 w_kraut*2 w_wuchs*3 w_peitsche*2'],
     ['Waldläufer', 'a_bogen*3 w_wolf*3 a_reiter*3 w_hirsch*3 a_schwan*2 w_baer*3 a_ritter*3 w_hydra*2 a_magier*2 w_peitsche*3 a_klee*3']],
    [['Gezeitenschwarm', 'f_fee*3 f_krabbe*3 f_otter*3 f_muschel*2 f_falke*3 f_sirene*3 f_golem*2 f_hai*2 f_wal*2 f_frost*3 f_welle*2 f_einfall*2'],
     ['Tiefsee', 'f_krabbe*3 f_muschel*3 f_otter*3 f_sirene*3 f_golem*3 f_hai*3 f_magier*2 f_wal*2 f_krake*1 f_frost*3 f_nebel*2 f_strudel*2'],
     ['Sturmflieger', 'f_fee*3 f_falke*3 f_sirene*3 a_schwan*3 g_phoenix*3 f_wal*3 f_otter*3 f_frost*3 f_schild*3 f_welle*3']],
    [['Sonnenglut', 'l_novize*3 g_fuchs*3 l_knappe*3 g_krieger*3 l_ritter*3 g_golem*3 l_paladin*2 g_drache*1 l_strahl*3 g_stoss*3 l_sonne*2 g_meteor*1'],
     ['Wüstenritter', 'l_moench*3 l_ross*3 l_ritter*3 g_berserk*3 l_waechter*2 l_paladin*3 l_engel*2 g_schmied*2 l_segen*3 l_haende*2 l_schild*2 g_rausch*2'],
     ['Feuerpriester', 'l_novize*3 g_salam*3 g_brand*3 l_knappe*3 g_phoenix*3 l_einhorn*2 g_golem*3 g_regen*3 l_strahl*3 g_sturm*2 l_bann*2']],
    [['Gruftwache', 'n_ratte*3 n_kauz*3 n_fleder*3 n_skelett*3 n_spinne*2 n_ghul*3 n_hexe*3 n_meuchler*2 n_vampir*2 n_lich*1 n_zug*3 n_fluch*2'],
     ['Seuchenbringer', 'n_ratte*3 n_spinne*3 n_skelett*3 n_ghul*3 n_hexe*3 n_lich*2 n_faenger*2 n_kauz*3 n_pest*2 n_verderb*3 n_pakt*2 n_grab*1'],
     ['Blutnacht', 'n_fleder*3 n_meuchler*3 n_ghul*3 n_vampir*2 n_morgul*1 n_hexe*3 n_skelett*3 n_kauz*2 n_zug*3 n_fluch*3 n_verderb*2 n_pakt*2']],
    [['Eiswacht', 'f_muschel*3 l_knappe*3 f_otter*3 l_ritter*3 f_golem*3 l_waechter*3 l_engel*2 f_wal*2 f_frost*3 l_segen*3 f_strudel*2'],
     ['Gletscherengel', 'l_novize*3 f_fee*3 l_ross*3 f_sirene*3 l_engel*3 f_magier*2 l_einhorn*2 f_orakel*1 l_haende*2 f_welle*3 l_schild*2 f_einfall*3'],
     ['Nordlicht', 'f_krabbe*3 l_moench*3 f_hai*3 l_paladin*3 f_golem*3 l_koenig*1 f_krake*2 l_strahl*3 f_frost*3 l_bann*2 f_nebel*2 l_segen*2']],
    [['Tempelgarde', 'l_novize*3 l_knappe*3 l_moench*3 l_ross*3 l_ritter*3 l_waechter*2 l_paladin*3 l_engel*3 l_einhorn*2 l_seraph*1 l_segen*2 l_strahl*2'],
     ['Heilige Schar', 'l_novize*3 l_knappe*3 l_ritter*3 l_paladin*3 l_engel*3 l_einhorn*2 l_koenig*1 l_haende*2 l_sonne*3 l_schild*2 l_bann*2 l_segen*3'],
     ['Sonnenwende', 'a_bogen*3 l_knappe*3 a_schmied*3 l_ritter*3 a_schwan*3 l_engel*3 a_prinz*2 l_koenig*1 a_gilde*1 l_strahl*3 a_falle*3 l_segen*2']],
    [['Drachenbrut', 'g_fuchs*3 g_krieger*3 g_phoenix*3 g_golem*3 g_schmied*2 g_drache*2 g_titan*2 g_ignar*1 g_phoenix2*1 g_stoss*3 g_meteor*3 g_sturm*3 g_rausch*1'],
     ['Urzeit', 'w_wolf*3 w_druide*3 w_eber*3 w_baer*3 w_hydra*3 w_loewe*2 w_riese*2 w_brakka*1 w_gaia*1 w_samen*3 w_peitsche*3 w_herde*2 w_wuchs*1'],
     ['Feuerwald', 'g_salam*3 w_wolf*3 g_berserk*3 w_hirsch*3 g_bombe*2 w_hydra*3 g_drache*2 w_riese*2 w_brakka*1 g_stoss*3 w_peitsche*3 g_meteor*2']],
    [['Sternennacht', 'n_fleder*3 f_fee*3 n_meuchler*3 f_sirene*3 n_hexe*3 f_magier*2 n_vampir*2 f_orakel*1 n_morgul*1 n_zug*3 f_frost*3 n_fluch*3'],
     ['Abgrund', 'f_krabbe*3 n_spinne*3 f_otter*3 n_ghul*3 f_hai*3 n_lich*2 f_krake*2 n_faenger*2 f_levi*1 n_gruft*1 f_welle*3 n_verderb*2 f_strudel*2'],
     ['Leere', 'n_kauz*3 n_skelett*3 f_muschel*3 n_ghul*3 f_golem*3 n_vampir*2 f_wal*3 n_lich*2 n_pest*2 f_einfall*3 n_grab*3']],
    [['Kristallkönig', 'l_seraph*1 l_koenig*1 g_ignar*1 g_phoenix2*1 l_engel*3 l_paladin*3 g_phoenix*3 g_meteor*3 l_bann*2 g_schmied*2 l_einhorn*2 g_drache*2 l_ritter*3 g_krieger*3'],
     ['Prisma', 'f_levi*1 n_gruft*1 f_orakel*1 n_morgul*1 f_magier*2 n_vampir*2 f_hai*3 n_fresser*3 f_pirat*3 n_fluch*3 f_welle*3 n_hexe*3 f_frost*2 n_faenger*2'],
     ['Drachenthron', 'g_krieger*3 w_hirsch*3 g_berserk*3 w_baer*3 g_drache*2 w_riese*2 g_titan*2 w_brakka*1 g_phoenix2*1 g_ignar*1 g_stoss*3 w_peitsche*3 w_herde*2 g_rausch*1']],
  ].map(list => list.map(([n, str]) => ({ n, cards: to40(D(str)) })));
  // Funken pro Sieg im Trophäenkampf: 25, je Kampfgebiet +5 (außer in Gebieten, die ein neues Pack freischalten), höchstens 50
  const winCoins = ai => { let v = 25; for (let i = 1; i <= ai; i++) if (!Object.values(PACKS).some(p => p.min === i)) v += 5; return Math.min(50, v); };
  const out = { winCoins, parseCost, cmc, COLORS, MAX_COPIES, to40, MODES, ARENAS, arenaOf, PACKS, BOTDECKS, HEROES, HERO_P, LADDER, PACK, F, KW, C, DECKS, B, BONUS_MIN, RAR, levelOf, checkDeck, themesOf, bonusesOf, mainTheme, DECK_SIZE, MIN_CRE };
  if (typeof module !== 'undefined' && module.exports) module.exports = out; else window.DuellKarten = out;
})();
