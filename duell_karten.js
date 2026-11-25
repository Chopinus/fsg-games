// Kristallduell – alle Karten (eigene Erfindung). Wird vom Server (duell.js) und im Browser (spiele5.js) benutzt.
// t: 'k' = Kreatur, 'z' = Zauber · c = Kosten in Kristallen · a/h = Angriff/Leben · kw = Fähigkeiten
// e = Wirkung (Zauber) bzw. Ruf (Kreatur: wirkt beim Ausspielen). tg = Ziel: any (Kreatur oder Spieler), cre (Kreatur), ecre (gegnerische Kreatur), own (eigene Kreatur)
(function () {
  const F = {
    glut: { n: 'Glut', e: '🔥', col: '#ff5a3d', col2: '#7a1a08', txt: 'Schnell und angriffslustig: Eile, direkter Schaden und Drachen.' },
    wild: { n: 'Wildnis', e: '🌿', col: '#3ec46d', col2: '#0f4a24', txt: 'Riesige Kreaturen, mehr Kristalle und Durchbruch.' },
    flut: { n: 'Flut', e: '💧', col: '#3aa8ff', col2: '#0b3a6a', txt: 'Flieger, Einfrieren, Zurückschicken und viele Karten.' },
    nacht: { n: 'Schatten', e: '💀', col: '#a45cff', col2: '#3a1466', txt: 'Gift, Lebensentzug, Vernichtung und Wiederkehr.' },
  };
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
    // ---------- Glut ----------
    g_kobold: { n: 'Funkenkobold', f: 'glut', t: 'k', c: 1, a: 2, h: 1, kw: ['eile'], art: '👺' },
    g_fuchs: { n: 'Glutfuchs', f: 'glut', t: 'k', c: 2, a: 3, h: 2, art: '🦊' },
    g_brand: { n: 'Brandstifter', f: 'glut', t: 'k', c: 2, a: 2, h: 2, e: { k: 'face', n: 1 }, art: '🧨', txt: 'Ruf: 1 Schaden an den Gegner.' },
    g_stoss: { n: 'Flammenstoß', f: 'glut', t: 'z', c: 1, e: { k: 'dmg', n: 2, tg: 'any' }, art: '🔥', txt: '2 Schaden an ein beliebiges Ziel.' },
    g_krieger: { n: 'Aschenkrieger', f: 'glut', t: 'k', c: 3, a: 3, h: 2, kw: ['eile'], art: '🗡️' },
    g_phoenix: { n: 'Phönixküken', f: 'glut', t: 'k', c: 3, a: 2, h: 2, kw: ['flug'], e: { k: 'dmg', n: 1, tg: 'any' }, art: '🐦', txt: 'Ruf: 1 Schaden an ein beliebiges Ziel.' },
    g_rausch: { n: 'Kampfrausch', f: 'glut', t: 'z', c: 2, e: { k: 'buff', a: 3, h: 1, tg: 'own' }, art: '💢', txt: 'Eine eigene Kreatur bekommt +3/+1.' },
    g_golem: { n: 'Lavagolem', f: 'glut', t: 'k', c: 4, a: 4, h: 5, art: '🌋' },
    g_sturm: { n: 'Feuersturm', f: 'glut', t: 'z', c: 4, e: { k: 'dmgAll', n: 2, side: 'foe' }, art: '🎆', txt: '2 Schaden an alle gegnerischen Kreaturen.' },
    g_meteor: { n: 'Meteor', f: 'glut', t: 'z', c: 5, e: { k: 'dmg', n: 5, tg: 'any' }, art: '☄️', txt: '5 Schaden an ein beliebiges Ziel.' },
    g_drache: { n: 'Glutdrache', f: 'glut', t: 'k', c: 6, a: 5, h: 5, kw: ['flug'], art: '🐉' },
    g_titan: { n: 'Magmatitan', f: 'glut', t: 'k', c: 7, a: 7, h: 6, kw: ['durch'], e: { k: 'face', n: 2 }, art: '👹', txt: 'Ruf: 2 Schaden an den Gegner.' },
    // ---------- Wildnis ----------
    w_moos: { n: 'Moosling', f: 'wild', t: 'k', c: 1, a: 1, h: 3, kw: ['mauer'], art: '🌱' },
    w_wolf: { n: 'Waldwolf', f: 'wild', t: 'k', c: 2, a: 3, h: 2, art: '🐺' },
    w_samen: { n: 'Kristallsamen', f: 'wild', t: 'z', c: 2, e: { k: 'ramp' }, art: '🌰', txt: '+1 Kristall – sofort und dauerhaft.' },
    w_peitsche: { n: 'Rankenpeitsche', f: 'wild', t: 'z', c: 2, e: { k: 'dmg', n: 3, tg: 'cre' }, art: '🌿', txt: '3 Schaden an eine Kreatur.' },
    w_dorn: { n: 'Dornenwächter', f: 'wild', t: 'k', c: 3, a: 2, h: 4, kw: ['reich'], art: '🌵' },
    w_hirsch: { n: 'Hainhirsch', f: 'wild', t: 'k', c: 3, a: 3, h: 3, kw: ['wach'], art: '🦌' },
    w_kraut: { n: 'Heilkräuter', f: 'wild', t: 'z', c: 2, e: { k: 'heal', n: 4, draw: 1 }, art: '🍃', txt: 'Heile dich um 4 und ziehe 1 Karte.' },
    w_wuchs: { n: 'Riesenwuchs', f: 'wild', t: 'z', c: 3, e: { k: 'buff', a: 3, h: 3, tg: 'own' }, art: '💪', txt: 'Eine eigene Kreatur bekommt +3/+3.' },
    w_baer: { n: 'Bärenmutter', f: 'wild', t: 'k', c: 4, a: 4, h: 3, e: { k: 'token', id: 'w_junges', n: 1 }, art: '🐻', txt: 'Ruf: Beschwört ein Bärenjunges (2/2).' },
    w_hydra: { n: 'Sumpfhydra', f: 'wild', t: 'k', c: 5, a: 5, h: 4, kw: ['durch', 'reich'], art: '🐍' },
    w_herde: { n: 'Herdenruf', f: 'wild', t: 'z', c: 5, e: { k: 'buffAll', a: 2, h: 2 }, art: '🐘', txt: 'Alle eigenen Kreaturen bekommen +2/+2.' },
    w_riese: { n: 'Urwaldriese', f: 'wild', t: 'k', c: 7, a: 8, h: 8, kw: ['durch'], art: '🦍' },
    w_junges: { n: 'Bärenjunges', f: 'wild', t: 'k', c: 1, a: 2, h: 2, art: '🧸', tok: 1 },
    // ---------- Flut ----------
    f_fee: { n: 'Wasserfee', f: 'flut', t: 'k', c: 1, a: 1, h: 2, kw: ['flug'], art: '🧚' },
    f_muschel: { n: 'Muschelwache', f: 'flut', t: 'k', c: 2, a: 1, h: 4, kw: ['schild'], art: '🐚' },
    f_frost: { n: 'Frostblick', f: 'flut', t: 'z', c: 1, e: { k: 'freeze', tg: 'ecre', draw: 1 }, art: '❄️', txt: 'Friere eine gegnerische Kreatur ein und ziehe 1 Karte.' },
    f_einfall: { n: 'Eingebung', f: 'flut', t: 'z', c: 3, e: { k: 'draw', n: 2 }, art: '💭', txt: 'Ziehe 2 Karten.' },
    f_sirene: { n: 'Sirene', f: 'flut', t: 'k', c: 3, a: 2, h: 2, kw: ['flug'], e: { k: 'draw', n: 1 }, art: '🧜', txt: 'Ruf: Ziehe 1 Karte.' },
    f_falke: { n: 'Sturmfalke', f: 'flut', t: 'k', c: 3, a: 3, h: 2, kw: ['flug'], art: '🦅' },
    f_welle: { n: 'Flutwelle', f: 'flut', t: 'z', c: 2, e: { k: 'bounce', tg: 'cre' }, art: '🌊', txt: 'Schicke eine Kreatur auf die Hand ihres Besitzers zurück.' },
    f_schild: { n: 'Wasserschild', f: 'flut', t: 'z', c: 1, e: { k: 'buff', a: 0, h: 2, shield: 1, tg: 'own' }, art: '🫧', txt: 'Eine eigene Kreatur bekommt +0/+2 und Schild.' },
    f_golem: { n: 'Eisgolem', f: 'flut', t: 'k', c: 4, a: 3, h: 5, e: { k: 'freeze', tg: 'ecre' }, art: '🧊', txt: 'Ruf: Friere eine gegnerische Kreatur ein.' },
    f_strudel: { n: 'Zeitstrudel', f: 'flut', t: 'z', c: 5, e: { k: 'freezeAll' }, art: '🌀', txt: 'Friere alle gegnerischen Kreaturen ein.' },
    f_wal: { n: 'Wolkenwal', f: 'flut', t: 'k', c: 5, a: 4, h: 6, kw: ['flug'], art: '🐋' },
    f_krake: { n: 'Tiefseekrake', f: 'flut', t: 'k', c: 7, a: 6, h: 7, e: { k: 'bounce', tg: 'ecre' }, art: '🐙', txt: 'Ruf: Schicke eine gegnerische Kreatur auf die Hand zurück.' },
    // ---------- Schatten ----------
    n_ratte: { n: 'Pestratte', f: 'nacht', t: 'k', c: 1, a: 1, h: 1, kw: ['gift'], art: '🐀' },
    n_pakt: { n: 'Dunkler Pakt', f: 'nacht', t: 'z', c: 1, e: { k: 'draw', n: 2, self: 2 }, art: '📜', txt: 'Ziehe 2 Karten, du verlierst 2 Leben.' },
    n_fleder: { n: 'Blutfledermaus', f: 'nacht', t: 'k', c: 2, a: 2, h: 1, kw: ['flug', 'saug'], art: '🦇' },
    n_spinne: { n: 'Giftspinne', f: 'nacht', t: 'k', c: 2, a: 1, h: 3, kw: ['gift'], art: '🕷️' },
    n_zug: { n: 'Seelenzug', f: 'nacht', t: 'z', c: 2, e: { k: 'drain', n: 2 }, art: '👻', txt: '2 Schaden an den Gegner, du heilst dich um 2.' },
    n_meuchler: { n: 'Schattenmeuchler', f: 'nacht', t: 'k', c: 3, a: 4, h: 2, kw: ['eile'], art: '🥷' },
    n_grab: { n: 'Grabesruf', f: 'nacht', t: 'z', c: 3, e: { k: 'revive' }, art: '⚰️', txt: 'Holt deine zuletzt gestorbene Kreatur zurück aufs Feld.' },
    n_ghul: { n: 'Ghul', f: 'nacht', t: 'k', c: 3, a: 3, h: 3, kw: ['saug'], art: '🧟' },
    n_fluch: { n: 'Todesfluch', f: 'nacht', t: 'z', c: 4, e: { k: 'kill', tg: 'cre' }, art: '💀', txt: 'Zerstöre eine Kreatur.' },
    n_pest: { n: 'Pestwolke', f: 'nacht', t: 'z', c: 4, e: { k: 'dmgAll', n: 2, side: 'all' }, art: '☠️', txt: '2 Schaden an ALLE Kreaturen.' },
    n_vampir: { n: 'Vampirfürst', f: 'nacht', t: 'k', c: 5, a: 4, h: 4, kw: ['flug', 'saug'], art: '🧛' },
    n_lich: { n: 'Knochenlich', f: 'nacht', t: 'k', c: 6, a: 5, h: 6, e: { k: 'dmgAll', n: 1, side: 'foe' }, art: '🧙', txt: 'Ruf: 1 Schaden an alle gegnerischen Kreaturen.' },
  };
  // Decks: je 30 Karten
  const DECKS = {
    glut: { g_kobold: 3, g_fuchs: 3, g_brand: 3, g_stoss: 3, g_krieger: 3, g_phoenix: 2, g_rausch: 2, g_golem: 3, g_sturm: 2, g_meteor: 2, g_drache: 2, g_titan: 2 },
    wild: { w_moos: 2, w_wolf: 3, w_samen: 3, w_peitsche: 3, w_dorn: 3, w_hirsch: 3, w_kraut: 2, w_wuchs: 2, w_baer: 3, w_hydra: 2, w_herde: 2, w_riese: 2 },
    flut: { f_fee: 3, f_muschel: 3, f_frost: 3, f_einfall: 2, f_sirene: 3, f_falke: 3, f_welle: 2, f_schild: 2, f_golem: 3, f_strudel: 2, f_wal: 2, f_krake: 2 },
    nacht: { n_ratte: 3, n_pakt: 2, n_fleder: 3, n_spinne: 2, n_zug: 3, n_meuchler: 3, n_grab: 2, n_ghul: 3, n_fluch: 3, n_pest: 2, n_vampir: 2, n_lich: 2 },
  };
  const out = { F, KW, C, DECKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = out; else window.DuellKarten = out;
})();
