// Teil 1: Spielinhalte und Regeln (Helden, Fertigkeiten, Runen, Kampf, Spielstand, Werte)
// Teil von Ritterlauf. Der Server setzt alle Teile in dieser Reihenfolge zu /ritter.js zusammen:
// 1_spiel.js → 2_audio.js → 3_grafik.js → 4_oberflaeche.js. Einzeln ist eine Datei kein gültiges Skript.

'use strict';
// Ritterlauf – Solo-Incremental mit sechs Klassen, Fertigkeitenbäumen, Wiedergeburten, Runen und Turm.
// Läuft im Browser; Spielstand lokal, per Konto (Name + Passwort) oder Notfall-Code.
//
// REGEL FÜR SPÄTERE UPDATES: Neue Fertigkeiten nur HINTEN an NODES bzw. PERKS anhängen und vorhandene IDs nie
// ändern. Die Reihenfolge der ersten Einträge (LEGACY) ist für alte Notfall-Codes festgelegt. Größere Umbauten
// bekommen eine neue SAVE_VERSION und einen Schritt in migrate().
(function () {
  const SAVE_VERSION = 5;

  /* ================= Klassen ================= */
  // Saison: mit Version 1.0 wurden alle Spielstände (außer Tester) zurückgesetzt. Erhöhen = neuer Reset.
  const SEASON = 1;
  const HEROES = [
    { id: 'r', tree: 'ritter', name: 'Ritter', color: '#ffb547', slots: 2, rebirth: 0, line: 'front', desc: 'Kämpft vorne mit dem Schwert. Ausgewogen zwischen Angriff und Verteidigung.' },
    { id: 'w', tree: 'waechter', name: 'Wächter', color: '#7fb2ff', slots: 1, rebirth: 1, hire: 'w_hire', line: 'front', desc: 'Steht ganz vorne und fängt die Treffer ab. Viel Leben, wenig Schaden.' },
    { id: 's', tree: 'schuetze', name: 'Schützin', color: '#7ee08a', slots: 1, rebirth: 3, hire: 's_hire', line: 'back', desc: 'Schießt aus der hinteren Reihe. Viel Schaden auf ein Ziel, wenig Leben.' },
    { id: 'm', tree: 'magier', name: 'Magier', color: '#c08cff', slots: 1, rebirth: 5, hire: 'm_hire', line: 'back', desc: 'Zauber treffen mehrere Gegner gleichzeitig. Mächtige Fähigkeiten, sehr wenig Leben.' },
    { id: 'p', tree: 'priester', name: 'Priesterin', color: '#ffe48a', slots: 1, rebirth: 7, hire: 'p_hire', line: 'back', desc: 'Heilt die Gruppe, gibt Schilde und belebt Gefallene wieder.' },
    { id: 't', tree: 'baendiger', name: 'Tierbändiger', color: '#d9935a', slots: 1, rebirth: 9, hire: 't_hire', line: 'front', desc: 'Kämpft mit der Axt, sein Wolf greift zusätzlich an. Ruft im Notfall das ganze Rudel.' },
    { id: 'a', tree: 'assassine', name: 'Assassine', color: '#ff6b7a', slots: 1, rebirth: 99, puzzle: true, hire: 'a_hire', line: 'back', desc: 'Wirft Kunai aus der hinteren Reihe, trifft oft kritisch und macht Jagd auf Fernkämpfer.' },
    { id: 'n', tree: 'nekromant', name: 'Nekromant', color: '#6be0b8', slots: 1, rebirth: 99, puzzle: true, hire: 'n_hire', line: 'back', desc: 'Besiegte Gegner stehen als Skelett-Diener wieder auf und kämpfen für dich. Verflucht und raubt Leben.' },
    { id: 'b', tree: 'barde', name: 'Barde', color: '#ff8ac8', slots: 1, rebirth: 99, puzzle: true, hire: 'b_hire', line: 'back', desc: 'Sein Lied macht alle Helden stärker und schneller. Schläfert Gegner ein und stößt sie mit Schallwellen zurück.' },
    { id: 'd', tree: 'druidin', name: 'Druidin', color: '#9bd14a', slots: 1, rebirth: 99, puzzle: true, hire: 'd_hire', line: 'front', desc: 'Kämpft vorne mit Bärenkräften, heilt die Gruppe und ruft Ranken und Adler zu Hilfe.' },
    { id: 'e', tree: 'tueftler', name: 'Tüftlerin', color: '#f28c28', slots: 1, rebirth: 99, puzzle: true, hire: 'e_hire', line: 'back', desc: 'Wirft Bomben, die mehrere Gegner treffen. Ihr Geschützturm schießt die ganze Zeit mit.' },
    { id: 'o', tree: 'runengolem', name: 'Runengolem', color: '#46d4ee', slots: 1, rebirth: 99, puzzle: true, mine: true, hire: 'o_hire', line: 'front', desc: 'Ein Koloss aus Stein, in den uralte Runen gemeißelt sind. Steht vorne, hält enorm viel aus und lässt alle Runen stärker wirken.' },
  ];
  const HERO = Object.fromEntries(HEROES.map(h => [h.tree, h]));
  const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));
  // Rollen für die Truppe: bestimmen Farbe des Kreises und die Reihenfolge von vorne nach hinten
  const ROLE = { w: 'tank', r: 'melee', t: 'melee', d: 'msup', s: 'ranged', a: 'ranged', m: 'ranged', n: 'ranged', e: 'ranged', b: 'sup', p: 'sup', o: 'tank' };
  const ROLE_INFO = { tank: { name: 'Tank', col: '#b06bff' }, melee: { name: 'Nahkampf', col: '#ff4d5e' }, msup: { name: 'Nahkampf-Helfer', col: '#ffd23f' }, ranged: { name: 'Fernkampf', col: '#4fc3ff' }, sup: { name: 'Unterstützung', col: '#5be37d' } };
  const LINE_ORDER = ['w', 'o', 'r', 't', 'd', 's', 'a', 'm', 'n', 'e', 'b', 'p'];

  // Was jede Wiedergeburt freischaltet
  const CAPS = [30, 45, 60, 75, 90, 105, 120, 135, 150];
  const ROADMAP = [
    { r: 1, text: 'Wächter als neue Klasse, dazu der Seelenaltar' }, { r: 2, text: 'Runen: Bosse lassen Runen fallen, jede Klasse hat 3 Sockel. Runen zerstören und das Lager mit Runensplittern erweitern' }, { r: 3, text: 'Schützin als neue Klasse' },
    { r: 4, text: 'Runenschmied und Wandler: 3 gleiche Runen verschmelzen, zufällige Runen kaufen, 2 Runen umwandeln' }, { r: 5, text: 'Magier als neue Klasse' }, { r: 6, text: 'Ahnenprüfung: 10 Missionen voller Bosse, am Ende wartet der Urahn mit einem Ahnensiegel' },
    { r: 7, text: 'Priesterin als neue Klasse' }, { r: 8, text: 'Turm-Modus: endloser Turm mit Bonus bis zum nächsten Aufstieg' }, { r: 9, text: 'Tierbändiger als neue Klasse. Alle 150 Stufen, danach endlose Albtraum-Stufen. Der Aufstieg wird möglich.' },
  ];
  const capOf = S => (S.rebirths >= CAPS.length ? Infinity : CAPS[Math.min(S.rebirths, CAPS.length - 1)]);
  const reqOf = S => Math.max(15, (S.rebirths < CAPS.length - 1 ? CAPS[S.rebirths] - 5 : 145) - 5 * ((S.cperks && S.cperks.k_schnell) || 0));
  const keyLimit = S => S.rebirths + 1;
  const feature = (S, f) => S.rebirths >= ({ runen: 2, schmiede: 4, turm: 8, ahnen: 6 })[f] || (f === 'ahnen' && S.asc > 0);

  /* ================= Fertigkeitenbäume ================= */
  const G = (base, grow) => r => ({ g: Math.ceil(base * Math.pow(grow, r)), s: 0 });
  const SL = list => r => ({ g: 0, s: list[Math.min(r, list.length - 1)] });
  const ACTC = SL([2, 4, 7]), ACTC2 = SL([3, 5, 8]);
  // Vorlage: 25 Plätze je Baum
  const TPL = {
    S0: [3, 6, []], A: [1, 5, ['S0']], H: [3, 5, ['S0']], U: [5, 5, ['S0']],
    a1: [0, 4, ['A']], a2: [2, 4, ['A']], h1: [3, 4, ['H']], h2: [4, 4, ['H']], u1: [6, 4, ['U']],
    X1: [1, 3, ['a1', 'a2']], X2: [3, 3, ['h1', 'h2']], X3: [5, 3, ['h2', 'u1']],
    b1: [0, 2, ['X1']], b2: [2, 2, ['X1']], b3: [3, 2, ['X2']], b4: [4, 2, ['X2']], b5: [5, 2, ['X3']], b6: [6, 2, ['X3']],
    K1: [1, 1, ['b1', 'b2']], K2: [3, 1, ['b3', 'b4']], K3: [5, 1, ['b5', 'b6']],
    K4: [0, 0, ['K1']], K5: [6, 0, ['K3']], I1: [2, 0, ['K1', 'K2']], I2: [4, 0, ['K2', 'K3']],
  };
  const dm = (h, s, v) => ({ h, s, dim: v }), pw = (h, s, v) => ({ h, s, pow: v }), ad = (h, s, v) => ({ h, s, add: v }), mu = (h, s, v) => ({ h, s, mul: v }), xx = (h, s, v) => ({ h, s, x: v });
  // Endlos-Fertigkeiten: jede Starter-Klasse hat ein eigenes Paar, die Expeditions-Helden teilen sich die Paare
  const INF = {
    w: [[dm('all', 'dr', 0.03)], 'Alle Helden erleiden 3 % weniger Schaden je Stufe (wirkt immer etwas schwächer). Ab Stufe 25: jede weitere Stufe +3 % Dornen (zurückgeworfener Schaden) für alle Helden', [ad('all', 'thorns', 0.06)], 'Alle Helden werfen 6 % je Stufe des erlittenen Schadens zurück', { g: { cap: 25, over: [ad('all', 'thorns', 0.03)] } }],
    s: [[ad('all', 'crit', 0.02)], '+2 % kritische Trefferchance für alle Helden je Stufe. Über 100 % gibt es Mehrfach-Krits: 150 % heißt sicher ein Krit und mit 50 % ein doppelter (doppelter kritischer Schaden)', [ad('all', 'critD', 0.12)], '+12 % kritischer Schaden für alle Helden je Stufe'],
    p: [[pw('g', 'walk', 1.03)], '+3 % Laufgeschwindigkeit der Gruppe je Stufe. Ab Stufe 37 (×3 Tempo): jede weitere Stufe +1,5 % Angriffstempo aller Helden', [pw('all', 'aps', 1.03)], '+3 % Angriffstempo aller Helden je Stufe', { g: { cap: 37, over: [pw('all', 'aps', 1.015)] } }],
    m: [[pw('all', 'actMul', 1.06)], '+6 % Schaden aller aktiven Fähigkeiten je Stufe', [ad('all', 'cdr', 0.02)], '−2 % Abklingzeit aller aktiven Fähigkeiten je Stufe. Abklingzeit sinkt höchstens um 60 %, jeder Prozentpunkt darüber wird zu +2 % Schaden der aktiven Fähigkeiten'],
    t: [[pw('g', 'gold', 1.04)], '+4 % Gold je Stufe', [ad('all', 'regen', 0.001)], 'Alle Helden regenerieren 0,1 % ihres Lebens pro Sekunde je Stufe'],
  };
  const PAIR = { w: 'w', s: 's', p: 'p', m: 'm', t: 't', a: 's', n: 't', b: 'p', d: 'w', e: 'm', o: 'w' };
  // Endlos-Fertigkeiten mit Grenze: ab cap wirkt jede weitere Stufe als Ersatz-Bonus (over), damit sie wirklich endlos bleiben
  const infG = (h, base) => ({ max: 9999, cost: G(base, 1.35), kind: 'inf', fx: INF[PAIR[h]][0], desc: INF[PAIR[h]][1], icon: '∞', ...((INF[PAIR[h]][4] || {}).g || {}) });
  const infS = h => ({ max: 9999, cost: r => ({ g: 0, s: 3 + r }), kind: 'inf', fx: INF[PAIR[h]][2], desc: INF[PAIR[h]][3], icon: '∞', ...((INF[PAIR[h]][4] || {}).s || {}) });

  // Ritter: Positionen wie bisher, damit alte Spielstände gleich aussehen
  const RITTER = [
    { id: 'start', name: 'Knappe', icon: '⚔', x: 3, y: 6, kind: 'start', max: 1, desc: 'Hier beginnt dein Weg. Von hier aus schaltest du benachbarte Fertigkeiten frei.' },
    { id: 'atk1', name: 'Klingenschliff', icon: 'S', x: 1, y: 5, p: ['start'], max: 30, cost: G(8, 1.7), fx: [pw('r', 'atk', 1.1)], desc: '+10 % Schaden des Ritters je Stufe (wächst aufeinander auf)' },
    { id: 'hp1', name: 'Zähigkeit', icon: 'L', x: 3, y: 5, p: ['start'], max: 30, cost: G(8, 1.7), fx: [pw('r', 'hp', 1.1)], desc: '+10 % Leben des Ritters je Stufe (wächst aufeinander auf)' },
    { id: 'gold1', name: 'Plünderer', icon: 'G', x: 5, y: 5, p: ['start'], max: 10, cost: G(12, 1.9), fx: [mu('g', 'gold', 0.06)], desc: '+6 % Gold je Stufe' },
    { id: 'spd', name: 'Schnelle Hand', icon: 'T', x: 0, y: 4, p: ['atk1'], max: 8, cost: G(30, 1.9), fx: [mu('r', 'aps', 0.04)], desc: '+4 % Angriffstempo des Ritters je Stufe' },
    { id: 'krit', name: 'Scharfes Auge', icon: 'K', x: 2, y: 4, p: ['atk1'], max: 8, cost: G(25, 1.9), fx: [ad('r', 'crit', 0.03)], desc: '+3 % Chance auf kritische Treffer je Stufe' },
    { id: 'armor', name: 'Plattenrüstung', icon: 'R', x: 3, y: 4, p: ['hp1'], max: 8, cost: G(30, 1.9), fx: [ad('r', 'dr', 0.04)], desc: '−4 % erlittener Schaden des Ritters je Stufe' },
    { id: 'regen', name: 'Zweiter Atem', icon: '+', x: 4, y: 4, p: ['hp1'], max: 5, cost: G(40, 2), fx: [ad('r', 'regen', 0.003)], desc: 'Der Ritter heilt 0,3 % seines Lebens pro Sekunde je Stufe' },
    { id: 'truhe', name: 'Schatzjäger', icon: '$', x: 5, y: 4, p: ['gold1'], max: 5, cost: G(50, 2), fx: [ad('g', 'chest', 0.03)], desc: '+3 % Chance je Stufe auf eine Truhe mit 10-fachem Gold' },
    { id: 'seelenf', name: 'Seelenfänger', icon: '◆', x: 6, y: 4, p: ['gold1'], max: 3, cost: ACTC2, fx: [ad('g', 'eliteSoul', 0.15)], desc: 'Elite-Gegner lassen mit 15 % Chance je Stufe eine Seele fallen' },
    { id: 'wirbel', name: 'Wirbelwind', icon: '↻', x: 1, y: 3, p: ['spd', 'krit'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: trifft alle nahen Gegner mit 200 % Schaden (+50 % je Stufe). Abklingzeit 18 s (−1 s je Stufe).' },
    { id: 'heil', name: 'Heilgebet', icon: '✚', x: 3, y: 3, p: ['armor', 'regen'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: heilt den Ritter um 40 % (+8 % je Stufe) und alle anderen Helden um 10 % (+3 % je Stufe), wenn einer unter 55 % fällt. Abklingzeit 22 s.' },
    { id: 'blitz', name: 'Blitzschlag', icon: 'ϟ', x: 5, y: 3, p: ['truhe', 'seelenf'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: trifft den stärksten Gegner mit 400 % Schaden (+150 % je Stufe). Abklingzeit 14 s.' },
    { id: 'doppel', name: 'Doppelschlag', icon: '»', x: 0, y: 2, p: ['wirbel'], max: 3, cost: ACTC2, fx: [ad('r', 'dbl', 0.08)], desc: '+8 % Chance je Stufe, zweimal zuzuschlagen' },
    { id: 'kritd', name: 'Vernichtung', icon: '!', x: 2, y: 2, p: ['wirbel'], max: 8, cost: G(150, 1.9), fx: [ad('r', 'critD', 0.15)], desc: '+15 % kritischer Schaden je Stufe' },
    { id: 'dorn', name: 'Dornenpanzer', icon: '✱', x: 3, y: 2, p: ['heil'], max: 3, cost: ACTC2, fx: [ad('r', 'thorns', 0.2)], desc: 'Wirft 20 % je Stufe des erlittenen Schadens zurück' },
    { id: 'schild', name: 'Doppelhieb', icon: '⚔', x: 4, y: 2, p: ['heil'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: zwei schnelle Hiebe am vordersten Gegner mit je 250 % Schaden (+50 % je Stufe). Wirbelwind lädt dabei 3 s weiter. Abklingzeit 9 s.' },
    { id: 'habgier', name: 'Habgier', icon: '¤', x: 5, y: 2, p: ['blitz'], max: 3, cost: ACTC2, fx: [mu('g', 'gold', 0.15)], desc: '+15 % Gold je Stufe' },
    { id: 'schrei', name: 'Kriegsschrei', icon: '▲', x: 6, y: 2, p: ['blitz'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: alle Helden machen 6 s lang +40 % Schaden (+15 % je Stufe). Abklingzeit 20 s.' },
    { id: 'berserk', name: 'Berserker', icon: 'B', x: 1, y: 1, p: ['doppel', 'kritd'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', fx: [xx('r', 'atk', 1.4), xx('r', 'hp', 0.8)], desc: 'Schlüssel: Ritter +40 % Schaden, aber −20 % Leben' },
    { id: 'phoenix', name: 'Vorbild', icon: '♕', x: 3, y: 1, p: ['dorn', 'schild'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', fx: [ad('r', 'vorbild', 0.02)], desc: 'Schlüssel: Besiegt der Ritter einen Gegner, heilen alle Helden 2 % ihres Lebens' },
    { id: 'ernte', name: 'Seelenernte', icon: '☽', x: 5, y: 1, p: ['habgier', 'schrei'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', fx: [xx('g', 'soulMul', 3), ad('g', 'eliteSoul', 0.25), mu('g', 'gold', 0.5)], desc: 'Schlüssel: Bosse geben dreimal so viele Seelen, Elite-Gegner haben +25 % Chance, eine Seele fallen zu lassen (zusätzlich zu Seelenfänger und Co.) und du bekommst +50 % Gold' },
    { id: 'schmiede', name: 'Schmiedekunst', icon: '∞', x: 2, y: 0, p: ['berserk', 'phoenix'], max: 9999, cost: G(2500, 1.35), kind: 'inf', fx: [pw('all', 'atk', 1.05)], desc: '+5 % Schaden aller Helden je Stufe, ohne Obergrenze' },
    { id: 'ahnen', name: 'Ahnenkraft', icon: '∞', x: 4, y: 0, p: ['phoenix', 'ernte'], max: 9999, cost: r => ({ g: 0, s: 3 + r }), kind: 'inf', fx: [pw('all', 'hp', 1.05)], desc: '+5 % Leben aller Helden je Stufe, ohne Obergrenze' },
  ];
  // Neue Klassen und Erweiterungen: Platz in der Vorlage → Knoten
  const KEYC = (g, s) => () => ({ g, s });
  const TREES = {
    waechter: { h: 'w', nodes: {
      S0: { id: 'w_hire', name: 'Wächter anheuern', icon: '⛨', kind: 'start', max: 1, cost: KEYC(400, 3), desc: 'Der Wächter schließt sich deiner Gruppe an. Er steht ganz vorne und fängt die Treffer ab.' },
      A: { id: 'w_atk', name: 'Streitkolben', icon: 'S', max: 30, cost: G(30, 1.7), fx: [pw('w', 'atk', 1.1)], desc: '+10 % Schaden des Wächters je Stufe (wächst aufeinander auf)' },
      H: { id: 'w_hp', name: 'Bollwerk', icon: 'L', max: 30, cost: G(30, 1.7), fx: [pw('w', 'hp', 1.1)], desc: '+10 % Leben des Wächters je Stufe (wächst aufeinander auf)' },
      U: { id: 'w_armor', name: 'Turmschild', icon: 'R', max: 8, cost: G(60, 1.9), fx: [ad('w', 'dr', 0.04)], desc: '−4 % erlittener Schaden des Wächters je Stufe' },
      a1: { id: 'w_spd', name: 'Schwerer Schwung', icon: 'T', max: 8, cost: G(80, 1.9), fx: [mu('w', 'aps', 0.05)], desc: '+5 % Angriffstempo des Wächters je Stufe' },
      a2: { id: 'w_krit', name: 'Wuchtschlag', icon: 'K', max: 8, cost: G(80, 1.9), fx: [ad('w', 'crit', 0.04)], desc: '+4 % Chance auf kritische Treffer des Wächters je Stufe' },
      h1: { id: 'w_parade', name: 'Parade', icon: '⟋', max: 5, cost: G(200, 1.9), fx: [ad('w', 'block', 0.06)], desc: '+6 % Chance je Stufe, einen Treffer abzuwehren' },
      h2: { id: 'w_regen', name: 'Unerschütterlich', icon: '+', max: 5, cost: G(200, 2), fx: [ad('w', 'regen', 0.005)], desc: 'Der Wächter heilt 0,5 % seines Lebens pro Sekunde je Stufe' },
      u1: { id: 'w_aura', name: 'Schutzaura', icon: '◎', max: 5, cost: SL([3, 4, 6, 8, 10]), fx: [ad('g', 'partyDr', 0.03)], desc: 'Alle Helden nehmen 3 % weniger Schaden je Stufe' },
      X1: { id: 'w_wall', name: 'Schildwall', icon: '▬', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 150 % Schaden (+50 % je Stufe) an allen nahen Gegnern und betäubt sie 1 s. Abklingzeit 12 s.' },
      X2: { id: 'w_haut', name: 'Eiserne Haut', icon: '◈', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: der Wächter nimmt 5 s lang (+1 s je Stufe) 60 % weniger Schaden, wenn er unter 70 % fällt. Abklingzeit 16 s.' },
      X3: { id: 'w_rache', name: 'Vergeltung', icon: '⚡', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 6 s lang (+1 s je Stufe) wirft der Wächter 60 % des erlittenen Schadens zurück. Abklingzeit 15 s.' },
      b1: { id: 'w_dorn', name: 'Stachelschild', icon: '✱', max: 3, cost: ACTC2, fx: [ad('w', 'thorns', 0.15)], desc: 'Wirft 15 % je Stufe des erlittenen Schadens zurück' },
      b2: { id: 'w_stun', name: 'Erschüttern', icon: '≋', max: 5, cost: G(300, 1.9), fx: [ad('w', 'stunChance', 0.06)], desc: '+6 % Chance je Stufe, den Gegner kurz zu betäuben' },
      b3: { id: 'w_hp2', name: 'Eisenwille', icon: 'Ш', max: 5, cost: SL([3, 5, 8, 10, 12]), fx: [mu('w', 'hp', 0.08)], desc: '+8 % Leben des Wächters je Stufe' },
      b4: { id: 'w_dr2', name: 'Standhaft', icon: 'R', max: 5, cost: G(400, 1.9), fx: [ad('w', 'dr', 0.03)], desc: '−3 % erlittener Schaden des Wächters je Stufe' },
      b5: { id: 'w_gold', name: 'Wegzoll', icon: '$', max: 5, cost: G(300, 2), fx: [mu('g', 'gold', 0.06)], desc: '+6 % Gold je Stufe' },
      b6: { id: 'w_party', name: 'Kampfgefährte', icon: '⚑', max: 5, cost: ACTC2, fx: [mu('g', 'partyAtk', 0.03)], desc: '+3 % Schaden aller Helden je Stufe' },
      K1: { id: 'w_key2', name: 'Bergfeste', icon: '▲', max: 1, cost: KEYC(5000, 12), kind: 'key', fx: [xx('w', 'hp', 1.6)], desc: 'Schlüssel: Wächter +60 % Leben' },
      K2: { id: 'w_key', name: 'Letzte Bastion', icon: 'Ψ', max: 1, cost: KEYC(5000, 12), kind: 'key', fx: [ad('w', 'revive', 1)], desc: 'Schlüssel: Fällt der Wächter, steht er einmal pro Lauf mit vollem Leben wieder auf' },
      K3: { id: 'w_key3', name: 'Schildträger', icon: '⛉', max: 1, cost: KEYC(5000, 12), kind: 'key', fx: [ad('g', 'partyDr', 0.15)], desc: 'Schlüssel: alle Helden nehmen 15 % weniger Schaden' },
      K4: { id: 'w_key4', name: 'Racheengel', icon: '✠', max: 1, cost: KEYC(9000, 18), kind: 'key', fx: [xx('w', 'atk', 2)], desc: 'Schlüssel: Wächter macht doppelten Schaden' },
      K5: { id: 'w_key5', name: 'Unbezwingbar', icon: '◙', max: 1, cost: KEYC(9000, 18), kind: 'key', fx: [ad('w', 'block', 0.2)], desc: 'Schlüssel: +20 % Chance, Treffer abzuwehren' },
      I1: { id: 'w_inf1', name: 'Festungsbau', ...infG('w', 2500) },
      I2: { id: 'w_inf2', name: 'Ewige Wacht', ...infS('w') },
    } },
    schuetze: { h: 's', nodes: {
      S0: { id: 's_hire', name: 'Schützin anheuern', icon: '➶', kind: 'start', max: 1, cost: KEYC(1500, 6), desc: 'Die Schützin schließt sich deiner Gruppe an und schießt aus der hinteren Reihe.' },
      A: { id: 's_atk', name: 'Zielwasser', icon: 'S', max: 30, cost: G(45, 1.7), fx: [pw('s', 'atk', 1.1)], desc: '+10 % Schaden der Schützin je Stufe (wächst aufeinander auf)' },
      H: { id: 's_hp', name: 'Lederwams', icon: 'L', max: 30, cost: G(45, 1.7), fx: [pw('s', 'hp', 1.1)], desc: '+10 % Leben der Schützin je Stufe (wächst aufeinander auf)' },
      U: { id: 's_gold', name: 'Kopfgeld', icon: '$', max: 5, cost: G(300, 2), fx: [mu('g', 'gold', 0.08)], desc: '+8 % Gold je Stufe' },
      a1: { id: 's_spd', name: 'Schnellschuss', icon: 'T', max: 10, cost: G(90, 1.9), fx: [mu('s', 'aps', 0.05)], desc: '+5 % Angriffstempo der Schützin je Stufe' },
      a2: { id: 's_krit', name: 'Adlerauge', icon: 'K', max: 8, cost: G(90, 1.9), fx: [ad('s', 'crit', 0.04)], desc: '+4 % Chance auf kritische Treffer der Schützin je Stufe' },
      h1: { id: 's_ausw', name: 'Ausweichen', icon: '~', max: 6, cost: G(200, 1.9), fx: [ad('s', 'dodge', 0.05)], desc: '+5 % Chance je Stufe, Treffern auszuweichen' },
      h2: { id: 's_flask', name: 'Feldflasche', icon: '+', max: 5, cost: G(200, 2), fx: [ad('s', 'regen', 0.004)], desc: 'Die Schützin heilt 0,4 % ihres Lebens pro Sekunde je Stufe' },
      u1: { id: 's_durch', name: 'Durchschlag', icon: '→', max: 3, cost: ACTC2, fx: [ad('s', 'pierce', 0.3)], desc: 'Pfeile treffen auch den zweiten Gegner mit 30 % Schaden je Stufe' },
      X1: { id: 's_hagel', name: 'Pfeilhagel', icon: '⋮', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 6 Pfeile auf zufällige Gegner mit je 120 % Schaden (+40 % je Stufe). Abklingzeit 14 s.' },
      X2: { id: 's_falke', name: 'Falkenschlag', icon: 'V', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: ein Falke trifft den stärksten Gegner mit 350 % (+120 % je Stufe) und markiert ihn: +25 % Schaden für 5 s. Abklingzeit 12 s.' },
      X3: { id: 's_gift', name: 'Giftpfeil', icon: '☠', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: vergiftet den stärksten Gegner, 300 % Schaden (+100 % je Stufe) über 5 s. Abklingzeit 10 s.' },
      b1: { id: 's_kritd', name: 'Kopfschuss', icon: '!', max: 8, cost: G(250, 1.9), fx: [ad('s', 'critD', 0.2)], desc: '+20 % kritischer Schaden der Schützin je Stufe' },
      b2: { id: 's_multi', name: 'Fächerschuss', icon: '⫶', max: 5, cost: ACTC2, fx: [ad('s', 'extraShot', 0.1)], desc: '+10 % Chance je Stufe auf einen zusätzlichen Pfeil' },
      b3: { id: 's_jagd', name: 'Jagdinstinkt', icon: '◎', max: 5, cost: G(400, 1.9), fx: [ad('s', 'bossDmg', 0.1)], desc: '+10 % Schaden gegen Bosse und Elite-Gegner je Stufe' },
      b4: { id: 's_mark', name: 'Markierung', icon: '⌖', max: 5, cost: ACTC2, fx: [ad('s', 'vuln', 0.03)], desc: 'Getroffene Gegner nehmen 4 s lang 3 % mehr Schaden je Stufe von allen' },
      b5: { id: 's_tox', name: 'Toxikologie', icon: '⚗', max: 5, cost: ACTC2, fx: [ad('s', 'actMul', 0.25)], desc: '+25 % Schaden der aktiven Fähigkeiten der Schützin je Stufe' },
      b6: { id: 's_beute', name: 'Beutezug', icon: '¤', max: 5, cost: G(300, 2), fx: [ad('g', 'chest', 0.02)], desc: '+2 % Truhenchance je Stufe' },
      K1: { id: 's_key', name: 'Meisterschützin', icon: '✶', max: 1, cost: KEYC(8000, 15), kind: 'key', fx: [ad('s', 'shots', 1)], desc: 'Schlüssel: Die Schützin schießt jedes Mal zwei Pfeile' },
      K2: { id: 's_key2', name: 'Adlerblick', icon: '◉', max: 1, cost: KEYC(8000, 15), kind: 'key', fx: [ad('s', 'crit', 0.2)], desc: 'Schlüssel: +20 % Chance auf kritische Treffer' },
      K3: { id: 's_key3', name: 'Giftmeisterin', icon: '☣', max: 1, cost: KEYC(8000, 15), kind: 'key', fx: [ad('s', 'cdr', 0.4)], desc: 'Schlüssel: Fähigkeiten der Schützin laden 40 % schneller' },
      K4: { id: 's_key4', name: 'Sturmköcher', icon: '≫', max: 1, cost: KEYC(12000, 20), kind: 'key', fx: [xx('s', 'aps', 1.5)], desc: 'Schlüssel: +50 % Angriffstempo' },
      K5: { id: 's_key5', name: 'Kopfgeldjägerin', icon: '♛', max: 1, cost: KEYC(12000, 20), kind: 'key', fx: [xx('g', 'eliteGold', 3)], desc: 'Schlüssel: Bosse und Elite-Gegner geben dreifaches Gold' },
      I1: { id: 's_inf1', name: 'Pfeilmacherei', ...infG('s', 3000) },
      I2: { id: 's_inf2', name: 'Waldgeist', ...infS('s') },
    } },
    magier: { h: 'm', nodes: {
      S0: { id: 'm_hire', name: 'Magier anheuern', icon: '✦', kind: 'start', max: 1, cost: KEYC(3000, 8), desc: 'Der Magier schließt sich deiner Gruppe an. Seine Zauber treffen mehrere Gegner.' },
      A: { id: 'm_atk', name: 'Zauberkraft', icon: 'S', max: 30, cost: G(60, 1.7), fx: [pw('m', 'atk', 1.1)], desc: '+10 % Schaden des Magiers je Stufe (wächst aufeinander auf)' },
      H: { id: 'm_hp', name: 'Robe des Weisen', icon: 'L', max: 30, cost: G(60, 1.7), fx: [pw('m', 'hp', 1.1)], desc: '+10 % Leben des Magiers je Stufe (wächst aufeinander auf)' },
      U: { id: 'm_mana', name: 'Manafluss', icon: '◌', max: 8, cost: G(120, 1.9), fx: [ad('m', 'cdr', 0.03)], desc: 'Fähigkeiten des Magiers laden 3 % schneller je Stufe' },
      a1: { id: 'm_spd', name: 'Schnelles Wirken', icon: 'T', max: 8, cost: G(120, 1.9), fx: [mu('m', 'aps', 0.05)], desc: '+5 % Angriffstempo des Magiers je Stufe' },
      a2: { id: 'm_krit', name: 'Arkane Präzision', icon: 'K', max: 8, cost: G(120, 1.9), fx: [ad('m', 'crit', 0.04)], desc: '+4 % Chance auf kritische Treffer je Stufe' },
      h1: { id: 'm_schild', name: 'Manaschild', icon: 'R', max: 8, cost: G(150, 1.9), fx: [ad('m', 'dr', 0.04)], desc: '−4 % erlittener Schaden des Magiers je Stufe' },
      h2: { id: 'm_regen', name: 'Meditation', icon: '+', max: 5, cost: G(200, 2), fx: [ad('m', 'regen', 0.004)], desc: 'Der Magier heilt 0,4 % seines Lebens pro Sekunde je Stufe' },
      u1: { id: 'm_splash', name: 'Flächenmagie', icon: '◍', max: 5, cost: ACTC2, fx: [ad('m', 'splash', 0.1)], desc: 'Feuerbälle treffen nahe Gegner mit +10 % Schaden je Stufe' },
      X1: { id: 'm_meteor', name: 'Meteor', icon: '☄', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: trifft alle Gegner mit 500 % Schaden (+150 % je Stufe). Abklingzeit 18 s.' },
      X2: { id: 'm_eis', name: 'Eissturm', icon: '❄', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 150 % Schaden (+50 % je Stufe) an allen nahen Gegnern, friert sie 1,5 s ein. Abklingzeit 14 s.' },
      X3: { id: 'm_kette', name: 'Kettenblitz', icon: 'ϟ', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: springt über 4 Gegner (+1 je Stufe) mit je 250 % Schaden. Abklingzeit 10 s.' },
      b1: { id: 'm_brand', name: 'Feuerbrand', icon: '♨', max: 5, cost: ACTC2, fx: [ad('m', 'burn', 0.1)], desc: 'Treffer brennen nach: +10 % Schaden je Stufe über 2 s' },
      b2: { id: 'm_kritd', name: 'Arkane Wucht', icon: '!', max: 8, cost: G(300, 1.9), fx: [ad('m', 'critD', 0.2)], desc: '+20 % kritischer Schaden je Stufe' },
      b3: { id: 'm_bind', name: 'Lebensbindung', icon: '♥', max: 5, cost: ACTC2, fx: [ad('m', 'lifesteal', 0.02)], desc: 'Heilt um 2 % je Stufe des verursachten Schadens' },
      b4: { id: 'm_zeit', name: 'Zeitfluss', icon: '⌛', max: 5, cost: G(400, 1.9), fx: [ad('m', 'cdr', 0.04)], desc: 'Fähigkeiten des Magiers laden 4 % schneller je Stufe' },
      b5: { id: 'm_elem', name: 'Elementarkunde', icon: '✺', max: 5, cost: ACTC2, fx: [ad('m', 'actMul', 0.15)], desc: '+15 % Schaden der aktiven Fähigkeiten je Stufe' },
      b6: { id: 'm_sog', name: 'Seelensog', icon: '◆', max: 3, cost: ACTC2, fx: [ad('g', 'eliteSoul', 0.1)], desc: 'Elite-Gegner lassen mit 10 % Chance je Stufe eine Seele fallen' },
      K1: { id: 'm_k1', name: 'Glaskanone', icon: '◇', max: 1, cost: KEYC(9000, 16), kind: 'key', fx: [xx('m', 'atk', 1.6), xx('m', 'hp', 0.7)], desc: 'Schlüssel: Magier +60 % Schaden, aber −30 % Leben' },
      K2: { id: 'm_k2', name: 'Zeitkrümmung', icon: '⧗', max: 1, cost: KEYC(9000, 16), kind: 'key', fx: [ad('m', 'cdr', 0.3)], desc: 'Schlüssel: Fähigkeiten des Magiers laden 30 % schneller' },
      K3: { id: 'm_k3', name: 'Erzmagier', icon: '✷', max: 1, cost: KEYC(9000, 16), kind: 'key', fx: [ad('m', 'shots', 1)], desc: 'Schlüssel: Der Magier wirft jedes Mal zwei Feuerbälle' },
      K4: { id: 'm_k4', name: 'Inferno', icon: '♨', max: 1, cost: KEYC(14000, 22), kind: 'key', fx: [ad('m', 'splash', 0.5)], desc: 'Schlüssel: Feuerbälle treffen nahe Gegner mit +50 % Schaden' },
      K5: { id: 'm_k5', name: 'Elementarbeherrschung', icon: '✺', max: 1, cost: KEYC(14000, 22), kind: 'key', fx: [ad('m', 'actMul', 1)], desc: 'Schlüssel: Fähigkeiten des Magiers machen doppelten Schaden' },
      I1: { id: 'm_inf1', name: 'Arkane Bibliothek', ...infG('m', 3500) },
      I2: { id: 'm_inf2', name: 'Sternenstaub', ...infS('m') },
    } },
    priester: { h: 'p', nodes: {
      S0: { id: 'p_hire', name: 'Priesterin anheuern', icon: '☀', kind: 'start', max: 1, cost: KEYC(5000, 10), desc: 'Die Priesterin schließt sich deiner Gruppe an und heilt verletzte Helden.' },
      A: { id: 'p_heil', name: 'Heilkraft', icon: '✚', max: 30, cost: G(80, 1.7), fx: [pw('p', 'heal', 1.1)], desc: '+10 % Heilung je Stufe (wächst aufeinander auf)' },
      H: { id: 'p_hp', name: 'Segen der Ausdauer', icon: 'L', max: 30, cost: G(80, 1.7), fx: [pw('p', 'hp', 1.1)], desc: '+10 % Leben der Priesterin je Stufe (wächst aufeinander auf)' },
      U: { id: 'p_licht', name: 'Lichtstrahl', icon: 'S', max: 25, cost: G(100, 1.75), fx: [pw('p', 'atk', 1.12)], desc: '+12 % Schaden der Priesterin je Stufe (wächst aufeinander auf)' },
      a1: { id: 'p_spd', name: 'Gebetsrhythmus', icon: 'T', max: 8, cost: G(150, 1.9), fx: [mu('p', 'aps', 0.05)], desc: '+5 % Tempo der Priesterin je Stufe' },
      a2: { id: 'p_over', name: 'Überfluss', icon: '◐', max: 5, cost: ACTC2, fx: [ad('p', 'overShield', 0.2)], desc: '20 % je Stufe der überschüssigen Heilung werden zu einem Schild' },
      h1: { id: 'p_aura', name: 'Heilige Aura', icon: '◎', max: 5, cost: G(250, 2), fx: [ad('g', 'partyRegen', 0.002)], desc: 'Alle Helden heilen 0,2 % ihres Lebens pro Sekunde je Stufe' },
      h2: { id: 'p_dr', name: 'Gottvertrauen', icon: 'R', max: 8, cost: G(200, 1.9), fx: [ad('p', 'dr', 0.04)], desc: '−4 % erlittener Schaden der Priesterin je Stufe' },
      u1: { id: 'p_gold', name: 'Opfergaben', icon: '$', max: 5, cost: G(300, 2), fx: [mu('g', 'gold', 0.06)], desc: '+6 % Gold je Stufe' },
      X1: { id: 'p_segen', name: 'Segen', icon: '✧', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: heilt alle Helden um 30 % (+8 % je Stufe), wenn einer unter 60 % fällt. Abklingzeit 18 s.' },
      X2: { id: 'p_schild', name: 'Schutzschild', icon: '◯', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: alle Helden bekommen einen Schild über 20 % ihres Lebens (+5 % je Stufe). Abklingzeit 16 s.' },
      X3: { id: 'p_wieder', name: 'Wiederbelebung', icon: '☥', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: belebt einen gefallenen Helden mit 40 % Leben wieder (+15 % je Stufe). Abklingzeit 40 s.' },
      b1: { id: 'p_hand', name: 'Gesegnete Hände', icon: '✋', max: 5, cost: ACTC2, fx: [mu('p', 'heal', 0.1)], desc: '+10 % Heilung je Stufe' },
      b2: { id: 'p_wunderh', name: 'Wunderheilung', icon: 'K', max: 5, cost: G(300, 1.9), fx: [ad('p', 'crit', 0.05)], desc: '+5 % Chance je Stufe auf doppelte Heilung oder kritische Treffer' },
      b3: { id: 'p_quell', name: 'Lebensquell', icon: '♥', max: 5, cost: ACTC2, fx: [mu('g', 'partyHp', 0.03)], desc: '+3 % Leben aller Helden je Stufe' },
      b4: { id: 'p_andacht', name: 'Andacht', icon: '⌛', max: 5, cost: G(400, 1.9), fx: [ad('p', 'cdr', 0.05)], desc: 'Fähigkeiten der Priesterin laden 5 % schneller je Stufe' },
      b5: { id: 'p_zorn', name: 'Heiliger Zorn', icon: '✸', max: 5, cost: ACTC2, fx: [mu('p', 'atk', 0.15)], desc: '+15 % Schaden der Priesterin je Stufe' },
      b6: { id: 'p_weihe', name: 'Weihe', icon: '⚑', max: 5, cost: ACTC2, fx: [mu('g', 'partyAtk', 0.03)], desc: '+3 % Schaden aller Helden je Stufe' },
      K1: { id: 'p_k1', name: 'Märtyrerin', icon: '✝', max: 1, cost: KEYC(12000, 20), kind: 'key', fx: [xx('p', 'heal', 1.8), xx('p', 'hp', 0.8)], desc: 'Schlüssel: +80 % Heilung, aber −20 % Leben' },
      K2: { id: 'p_k2', name: 'Ewige Flamme', icon: '♆', max: 1, cost: KEYC(12000, 20), kind: 'key', fx: [ad('p', 'reviveFast', 1)], desc: 'Schlüssel: Wiederbelebung lädt doppelt so schnell' },
      K3: { id: 'p_k3', name: 'Schutzpatronin', icon: '⛉', max: 1, cost: KEYC(12000, 20), kind: 'key', fx: [ad('g', 'partyDr', 0.1)], desc: 'Schlüssel: alle Helden nehmen 10 % weniger Schaden' },
      K4: { id: 'p_k4', name: 'Wunder', icon: '✺', max: 1, cost: KEYC(18000, 26), kind: 'key', fx: [ad('p', 'miracle', 1)], desc: 'Schlüssel: Würde ein Held fallen, werden einmal pro Lauf alle Helden voll geheilt' },
      K5: { id: 'p_k5', name: 'Lichtgestalt', icon: '☀', max: 1, cost: KEYC(18000, 26), kind: 'key', fx: [ad('p', 'splash', 0.6)], desc: 'Schlüssel: Lichtstrahlen treffen auch nahe Gegner mit 60 % Schaden' },
      I1: { id: 'p_inf1', name: 'Tempelbau', ...infG('p', 3500) },
      I2: { id: 'p_inf2', name: 'Göttlicher Funke', ...infS('p') },
    } },
    baendiger: { h: 't', nodes: {
      S0: { id: 't_hire', name: 'Tierbändiger anheuern', icon: '✥', kind: 'start', max: 1, cost: KEYC(8000, 12), desc: 'Der Tierbändiger und sein Wolf schließen sich deiner Gruppe an.' },
      A: { id: 't_atk', name: 'Axtkunst', icon: 'S', max: 30, cost: G(100, 1.7), fx: [pw('t', 'atk', 1.1)], desc: '+10 % Schaden des Bändigers je Stufe (wächst aufeinander auf)' },
      H: { id: 't_hp', name: 'Dickes Fell', icon: 'L', max: 30, cost: G(100, 1.7), fx: [pw('t', 'hp', 1.1)], desc: '+10 % Leben des Bändigers je Stufe (wächst aufeinander auf)' },
      U: { id: 't_wolf', name: 'Wolfsbiss', icon: 'W', max: 25, cost: G(100, 1.75), fx: [pw('t', 'wolfAtk', 1.12)], desc: '+12 % Schaden des Wolfs je Stufe (wächst aufeinander auf)' },
      a1: { id: 't_spd', name: 'Wildheit', icon: 'T', max: 8, cost: G(150, 1.9), fx: [mu('t', 'aps', 0.05)], desc: '+5 % Angriffstempo des Bändigers je Stufe' },
      a2: { id: 't_krit', name: 'Raubtierinstinkt', icon: 'K', max: 8, cost: G(150, 1.9), fx: [ad('t', 'crit', 0.04)], desc: '+4 % Chance auf kritische Treffer je Stufe' },
      h1: { id: 't_kraut', name: 'Kräuterkunde', icon: '+', max: 5, cost: G(200, 2), fx: [ad('t', 'regen', 0.004)], desc: 'Der Bändiger heilt 0,4 % seines Lebens pro Sekunde je Stufe' },
      h2: { id: 't_dr', name: 'Lederpanzer', icon: 'R', max: 8, cost: G(200, 1.9), fx: [ad('t', 'dr', 0.04)], desc: '−4 % erlittener Schaden des Bändigers je Stufe' },
      u1: { id: 't_wspd', name: 'Rudeltempo', icon: '≫', max: 8, cost: G(200, 1.9), fx: [mu('t', 'wolfAps', 0.06)], desc: '+6 % Angriffstempo des Wolfs je Stufe' },
      X1: { id: 't_rudel', name: 'Rudelruf', icon: '◬', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: zwei weitere Wölfe kämpfen 8 s lang mit (+2 s je Stufe). Abklingzeit 20 s.' },
      X2: { id: 't_wurzel', name: 'Wurzeln', icon: '❦', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: Wurzeln halten alle Gegner 2 s fest (+0,5 s je Stufe) und machen 120 % Schaden. Abklingzeit 15 s.' },
      X3: { id: 't_sprung', name: 'Raubtiersprung', icon: '⤴', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: der Wolf springt den stärksten Gegner an, 600 % Schaden (+200 % je Stufe). Abklingzeit 12 s.' },
      b1: { id: 't_blut', name: 'Blutrausch', icon: '♥', max: 5, cost: ACTC2, fx: [ad('t', 'lifesteal', 0.03)], desc: 'Heilt um 3 % je Stufe des verursachten Schadens' },
      b2: { id: 't_fleisch', name: 'Zerfleischen', icon: '!', max: 8, cost: G(300, 1.9), fx: [ad('t', 'critD', 0.2)], desc: '+20 % kritischer Schaden je Stufe' },
      b3: { id: 't_natur', name: 'Naturverbunden', icon: '❀', max: 5, cost: G(400, 2), fx: [ad('g', 'partyRegen', 0.002)], desc: 'Alle Helden heilen 0,2 % ihres Lebens pro Sekunde je Stufe' },
      b4: { id: 't_baer', name: 'Bärenkraft', icon: 'B', max: 5, cost: ACTC2, fx: [mu('t', 'hp', 0.08)], desc: '+8 % Leben des Bändigers je Stufe' },
      b5: { id: 't_jagd', name: 'Jagdbeute', icon: '$', max: 5, cost: G(300, 2), fx: [mu('g', 'gold', 0.06)], desc: '+6 % Gold je Stufe' },
      b6: { id: 't_zahn', name: 'Wolfszähne', icon: 'V', max: 5, cost: ACTC2, fx: [ad('t', 'wolfCrit', 0.06)], desc: '+6 % Chance je Stufe auf kritische Wolfsbisse' },
      K1: { id: 't_k1', name: 'Alphawolf', icon: 'A', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [xx('t', 'wolfAtk', 2)], desc: 'Schlüssel: der Wolf macht doppelten Schaden' },
      K2: { id: 't_k2', name: 'Bärengestalt', icon: 'Ʊ', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [xx('t', 'atk', 1.5), xx('t', 'hp', 1.5)], desc: 'Schlüssel: Bändiger +50 % Schaden und Leben' },
      K3: { id: 't_k3', name: 'Zweiter Wolf', icon: 'Ⅱ', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('t', 'wolves', 1)], desc: 'Schlüssel: ein zweiter Wolf kämpft immer mit' },
      K4: { id: 't_k4', name: 'Symbiose', icon: '∞', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('t', 'wolfHeal', 0.05)], desc: 'Schlüssel: Wolfsbisse heilen die Gruppe um 5 % des Schadens' },
      K5: { id: 't_k5', name: 'Wildnisruf', icon: '◬', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('t', 'packBonus', 2)], desc: 'Schlüssel: Rudelruf ruft vier statt zwei Wölfe' },
      I1: { id: 't_inf1', name: 'Wildgehege', ...infG('t', 4000) },
      I2: { id: 't_inf2', name: 'Geist der Wildnis', ...infS('t') },
    } },
  };
  // Neue Ritter-Schlüssel (ab Version 4)
  const RITTER_NEW = [
    { id: 'r_tanz', name: 'Klingentanz', icon: '✣', x: 0, y: 0, p: ['berserk'], max: 1, cost: KEYC(8000, 16), kind: 'key', fx: [ad('r', 'dbl', 0.25), ad('r', 'cdr', 0.2)], desc: 'Schlüssel: +25 % Chance auf Doppelschlag, Fähigkeiten des Ritters laden 20 % schneller' },
    { id: 'r_mut', name: 'Heldenmut', icon: '♔', x: 6, y: 0, p: ['ernte'], max: 1, cost: KEYC(8000, 16), kind: 'key', fx: [mu('g', 'partyAtk', 0.15)], desc: 'Schlüssel: alle Helden machen 15 % mehr Schaden' },
  ];
  // Aufbau der Liste – LEGACY-Reihenfolge zuerst
  const LEGACY = ['w_hire', 'w_hp', 'w_armor', 'w_atk', 'w_haut', 'w_aura', 'w_wall', 'w_parade', 'w_regen', 'w_key',
    's_hire', 's_atk', 's_spd', 's_krit', 's_hagel', 's_durch', 's_gift', 's_gold', 's_hp', 's_key'];
  const built = {};
  for (const [tree, def] of Object.entries(TREES)) {
    const slotId = Object.fromEntries(Object.entries(def.nodes).map(([slot, n]) => [slot, n.id]));
    for (const [slot, n] of Object.entries(def.nodes)) {
      const [x, y, ps] = TPL[slot];
      built[n.id] = { ...n, tree, x, y, p: ps.map(s => slotId[s]) };
    }
  }
  const NODES = [...RITTER.map(n => ({ ...n, tree: 'ritter' })), ...LEGACY.map(id => built[id])];
  for (const tree of Object.keys(TREES)) for (const n of Object.values(TREES[tree].nodes)) if (!LEGACY.includes(n.id)) NODES.push(built[n.id]);
  RITTER_NEW.forEach(n => NODES.push({ ...n, tree: 'ritter' }));
  // Helden aus den Expeditionen (ab Version 5.4) – werden mit 6 Puzzleteilen freigeschaltet
  const C1 = (h, id, name, icon, desc, s, v, max = 8, cost = G(150, 1.9), kind = 'ad') => ({ id, name, icon, max, cost, fx: [{ ad, mu, pw, xx }[kind](h, s, v)], desc });
  const TREES2 = {
    assassine: { h: 'a', nodes: {
      S0: { id: 'a_hire', name: 'Assassine anheuern', icon: '☾', kind: 'start', max: 1, cost: KEYC(1500, 6), desc: 'Die Assassine schließt sich deiner Gruppe an. Sie wirft Kunai aus der hinteren Reihe.' },
      A: C1('a', 'a_atk', 'Kunaiwurf', 'S', '+10 % Schaden der Assassine je Stufe (wächst aufeinander auf)', 'atk', 1.1, 30, G(100, 1.7), 'pw'),
      H: C1('a', 'a_hp', 'Schattenleib', 'L', '+10 % Leben der Assassine je Stufe (wächst aufeinander auf)', 'hp', 1.1, 30, G(100, 1.7), 'pw'),
      U: C1('a', 'a_back', 'Meuchlerin', '⌖', '+12 % Schaden gegen Fernkämpfer je Stufe', 'rangedDmg', 0.12),
      a1: C1('a', 'a_spd', 'Flinke Finger', 'T', '+5 % Angriffstempo der Assassine je Stufe', 'aps', 0.05, 8, G(150, 1.9), 'mu'),
      a2: C1('a', 'a_krit', 'Schwachstelle', 'K', '+4 % Chance auf kritische Treffer je Stufe', 'crit', 0.04),
      h1: C1('a', 'a_ausw', 'Schattentanz', '~', '+5 % Chance je Stufe, Treffern auszuweichen', 'dodge', 0.05, 6, G(200, 1.9)),
      h2: C1('a', 'a_regen', 'Verbandszeug', '+', 'Die Assassine heilt 0,4 % ihres Lebens pro Sekunde je Stufe', 'regen', 0.004, 5, G(200, 2)),
      u1: C1('a', 'a_pierce', 'Durchbohren', '→', 'Kunai treffen auch den zweiten Gegner mit 30 % Schaden je Stufe', 'pierce', 0.3, 3, ACTC2),
      X1: { id: 'a_schatten', name: 'Schattenschritt', icon: '☾', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: springt hinter die Gegner und ersticht bis zu 2 Fernkämpfer mit 600 % Schaden (+200 % je Stufe). Gibt es keine, trifft es die hintersten Gegner. Abklingzeit 14 s.' },
      X2: { id: 'a_sturm', name: 'Klingensturm', icon: '✷', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: wirft 8 Kunai auf zufällige Gegner mit je 120 % Schaden (+40 % je Stufe). Abklingzeit 12 s.' },
      X3: { id: 'a_mal', name: 'Todesmal', icon: '✖', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 300 % Schaden (+100 % je Stufe) am stärksten Gegner. Er nimmt 6 s lang 40 % mehr Schaden von allen. Abklingzeit 15 s.' },
      b1: C1('a', 'a_kritd', 'Meuchelstoß', '!', '+20 % kritischer Schaden je Stufe', 'critD', 0.2, 8, G(250, 1.9)),
      b2: C1('a', 'a_zwilling', 'Zwillingsklingen', '⫶', '+10 % Chance je Stufe auf ein zusätzliches Kunai', 'extraShot', 0.1, 5, ACTC2),
      b3: C1('a', 'a_dr', 'Nebelmantel', 'R', '−4 % erlittener Schaden der Assassine je Stufe', 'dr', 0.04, 6, G(300, 1.9)),
      b4: C1('a', 'a_jagd', 'Kopfgeld', '◎', '+10 % Schaden gegen Bosse und Elite-Gegner je Stufe', 'bossDmg', 0.1, 5, G(400, 1.9)),
      b5: C1('g', 'a_gold', 'Taschendiebin', '$', '+6 % Gold je Stufe', 'gold', 0.06, 5, G(300, 2), 'mu'),
      b6: C1('a', 'a_act', 'Klingenmeisterin', '✺', '+20 % Schaden der aktiven Fähigkeiten je Stufe', 'actMul', 0.2, 5, ACTC2),
      K1: { id: 'a_k1', name: 'Nachtklinge', icon: '✶', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('a', 'crit', 0.2)], desc: 'Schlüssel: +20 % Chance auf kritische Treffer' },
      K2: { id: 'a_k2', name: 'Phantom', icon: '◌', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('a', 'dodge', 0.2)], desc: 'Schlüssel: +20 % Chance, Treffern auszuweichen' },
      K3: { id: 'a_k3', name: 'Schattenmeisterin', icon: '⧗', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('a', 'cdr', 0.35)], desc: 'Schlüssel: Fähigkeiten der Assassine laden 35 % schneller' },
      K4: { id: 'a_k4', name: 'Klingenregen', icon: '⋮', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('a', 'shots', 1)], desc: 'Schlüssel: Die Assassine wirft jedes Mal zwei Kunai' },
      K5: { id: 'a_k5', name: 'Henkerin', icon: '☠', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('a', 'rangedDmg', 1)], desc: 'Schlüssel: doppelter Schaden gegen Fernkämpfer' },
      I1: { id: 'a_inf1', name: 'Klingenschmiede', ...infG('a', 4000) },
      I2: { id: 'a_inf2', name: 'Gilde der Schatten', ...infS('a') },
    } },
    nekromant: { h: 'n', nodes: {
      S0: { id: 'n_hire', name: 'Nekromant anheuern', icon: '☠', kind: 'start', max: 1, cost: KEYC(1500, 6), desc: 'Der Nekromant schließt sich deiner Gruppe an. Besiegte Gegner stehen als seine Skelett-Diener wieder auf.' },
      A: C1('n', 'n_atk', 'Dunkle Kunst', 'S', '+10 % Schaden des Nekromanten je Stufe (wächst aufeinander auf)', 'atk', 1.1, 30, G(100, 1.7), 'pw'),
      H: C1('n', 'n_hp', 'Knochenpanzer', 'L', '+10 % Leben des Nekromanten je Stufe (wächst aufeinander auf)', 'hp', 1.1, 30, G(100, 1.7), 'pw'),
      U: C1('n', 'n_raise', 'Totenruf', '☥', '+5 % Chance je Stufe, dass ein besiegter Gegner als Skelett aufsteht', 'raise', 0.05),
      a1: C1('n', 'n_spd', 'Schnelles Wirken', 'T', '+5 % Angriffstempo des Nekromanten je Stufe', 'aps', 0.05, 8, G(150, 1.9), 'mu'),
      a2: C1('n', 'n_krit', 'Fluchblick', 'K', '+4 % Chance auf kritische Treffer je Stufe', 'crit', 0.04),
      h1: C1('n', 'n_dr', 'Gruftstaub', 'R', '−4 % erlittener Schaden des Nekromanten je Stufe', 'dr', 0.04),
      h2: C1('n', 'n_steal', 'Lebensentzug', '♥', 'Heilt um 2 % je Stufe des verursachten Schadens', 'lifesteal', 0.02, 5, ACTC2),
      u1: C1('n', 'n_max', 'Knochenheer', 'Ⅲ', '+1 Skelett-Diener gleichzeitig je Stufe', 'minionMax', 1, 3, ACTC2),
      X1: { id: 'n_heer', name: 'Totenheer', icon: '☗', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: ruft sofort 3 Skelette (+1 je Stufe) für 12 s. Abklingzeit 20 s.' },
      X2: { id: 'n_raub', name: 'Seelenraub', icon: '◆', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 300 % Schaden (+100 % je Stufe) am stärksten Gegner, heilt die Gruppe um 15 % davon. Abklingzeit 12 s.' },
      X3: { id: 'n_fluch', name: 'Fluch der Schwäche', icon: '✖', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: alle Gegner nehmen 6 s lang 25 % mehr Schaden (+10 % je Stufe). Abklingzeit 16 s.' },
      b1: C1('n', 'n_minion', 'Knochenschmiede', 'B', '+15 % Schaden der Skelette je Stufe', 'minionMul', 0.15, 8, G(250, 1.9), 'mu'),
      b2: C1('n', 'n_kritd', 'Seelenbrand', '!', '+20 % kritischer Schaden je Stufe', 'critD', 0.2, 8, G(250, 1.9)),
      b3: C1('g', 'n_seele', 'Seelenhunger', '◇', 'Elite-Gegner lassen mit 10 % Chance je Stufe eine Seele fallen', 'eliteSoul', 0.1, 3, ACTC2),
      b4: C1('n', 'n_cdr', 'Grabesstille', '⌛', 'Fähigkeiten des Nekromanten laden 4 % schneller je Stufe', 'cdr', 0.04, 5, G(400, 1.9)),
      b5: C1('g', 'n_party', 'Todesaura', '⚑', '+3 % Schaden aller Helden je Stufe', 'partyAtk', 0.03, 5, ACTC2, 'mu'),
      b6: C1('n', 'n_dauer', 'Ewige Diener', '∞', 'Skelette bleiben 2 s länger je Stufe', 'minionDur', 2, 5, G(400, 1.9)),
      K1: { id: 'n_k1', name: 'Lich', icon: '◇', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [xx('n', 'atk', 1.6), xx('n', 'hp', 0.8)], desc: 'Schlüssel: Nekromant +60 % Schaden, aber −20 % Leben' },
      K2: { id: 'n_k2', name: 'Heerführer', icon: 'Ⅴ', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('n', 'minionMax', 2)], desc: 'Schlüssel: +2 Skelett-Diener gleichzeitig' },
      K3: { id: 'n_k3', name: 'Gruftkönig', icon: '♛', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [xx('n', 'minionMul', 2)], desc: 'Schlüssel: Skelette machen doppelten Schaden' },
      K4: { id: 'n_k4', name: 'Seelenbund', icon: '∞', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('g', 'partyRegen', 0.004)], desc: 'Schlüssel: alle Helden heilen 0,4 % ihres Lebens pro Sekunde' },
      K5: { id: 'n_k5', name: 'Unsterblich', icon: 'Φ', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('n', 'revive', 1)], desc: 'Schlüssel: Einmal pro Lauf steht der Nekromant mit halbem Leben wieder auf' },
      I1: { id: 'n_inf1', name: 'Knochengrube', ...infG('n', 4000) },
      I2: { id: 'n_inf2', name: 'Seelenbrunnen', ...infS('n') },
    } },
    barde: { h: 'b', nodes: {
      S0: { id: 'b_hire', name: 'Barde anheuern', icon: '♪', kind: 'start', max: 1, cost: KEYC(1500, 6), desc: 'Der Barde schließt sich deiner Gruppe an. Seine Lieder machen alle Helden stärker.' },
      A: C1('b', 'b_atk', 'Lautenspiel', 'S', '+10 % Schaden des Barden je Stufe (wächst aufeinander auf)', 'atk', 1.1, 30, G(100, 1.7), 'pw'),
      H: C1('b', 'b_hp', 'Wanderjahre', 'L', '+10 % Leben des Barden je Stufe (wächst aufeinander auf)', 'hp', 1.1, 30, G(100, 1.7), 'pw'),
      U: C1('b', 'b_lied', 'Heldenlied', '♫', 'Das Lied des Barden gibt allen Helden +2 % Schaden je Stufe', 'songAtk', 0.02, 10),
      a1: C1('b', 'b_spd', 'Taktgefühl', 'T', '+5 % Angriffstempo des Barden je Stufe', 'aps', 0.05, 8, G(150, 1.9), 'mu'),
      a2: C1('b', 'b_krit', 'Hohe Töne', 'K', '+4 % Chance auf kritische Treffer je Stufe', 'crit', 0.04),
      h1: C1('b', 'b_ausw', 'Bühnenpräsenz', '~', '+5 % Chance je Stufe, Treffern auszuweichen', 'dodge', 0.05, 6, G(200, 1.9)),
      h2: C1('g', 'b_ballade', 'Ballade', '+', 'Alle Helden heilen 0,2 % ihres Lebens pro Sekunde je Stufe', 'partyRegen', 0.002, 5, G(250, 2)),
      u1: C1('b', 'b_takt', 'Marschtakt', '≫', 'Das Lied gibt allen Helden +2 % Angriffstempo je Stufe', 'songAps', 0.02, 8, G(200, 1.9)),
      X1: { id: 'b_krieg', name: 'Kriegslied', icon: '♬', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: alle Helden greifen 6 s lang 30 % schneller an (+10 % je Stufe). Abklingzeit 18 s.' },
      X2: { id: 'b_wiegen', name: 'Wiegenlied', icon: 'z', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: alle nahen Gegner schlafen 2 s ein (+0,5 s je Stufe). Abklingzeit 16 s.' },
      X3: { id: 'b_schall', name: 'Schallwelle', icon: '◍', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 200 % Schaden (+60 % je Stufe) an allen nahen Gegnern und stößt sie zurück. Abklingzeit 12 s.' },
      b1: C1('b', 'b_kritd', 'Crescendo', '!', '+20 % kritischer Schaden je Stufe', 'critD', 0.2, 8, G(250, 1.9)),
      b2: C1('g', 'b_hut', 'Hutsammlung', '$', '+8 % Gold je Stufe', 'gold', 0.08, 5, G(300, 2), 'mu'),
      b3: C1('g', 'b_mit', 'Mitreißend', '⚑', '+3 % Schaden aller Helden je Stufe', 'partyAtk', 0.03, 5, ACTC2, 'mu'),
      b4: C1('b', 'b_cdr', 'Gutes Gehör', '⌛', 'Fähigkeiten des Barden laden 4 % schneller je Stufe', 'cdr', 0.04, 5, G(400, 1.9)),
      b5: C1('g', 'b_hymne', 'Hymne', '♥', '+3 % Leben aller Helden je Stufe', 'partyHp', 0.03, 5, ACTC2, 'mu'),
      b6: C1('b', 'b_virt', 'Virtuose', '✺', '+20 % Schaden der aktiven Fähigkeiten je Stufe', 'actMul', 0.2, 5, ACTC2),
      K1: { id: 'b_k1', name: 'Legende', icon: '♔', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('b', 'songAtk', 0.15)], desc: 'Schlüssel: das Lied gibt allen Helden +15 % Schaden' },
      K2: { id: 'b_k2', name: 'Ohrwurm', icon: '≫', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('b', 'songAps', 0.15)], desc: 'Schlüssel: das Lied gibt allen Helden +15 % Angriffstempo' },
      K3: { id: 'b_k3', name: 'Zugabe', icon: '⧗', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('b', 'cdr', 0.35)], desc: 'Schlüssel: Fähigkeiten des Barden laden 35 % schneller' },
      K4: { id: 'b_k4', name: 'Orchester', icon: '♫', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [mu('g', 'partyAtk', 0.15)], desc: 'Schlüssel: alle Helden machen 15 % mehr Schaden' },
      K5: { id: 'b_k5', name: 'Schutzlied', icon: '⛉', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('g', 'partyDr', 0.1)], desc: 'Schlüssel: alle Helden nehmen 10 % weniger Schaden' },
      I1: { id: 'b_inf1', name: 'Konzertsaal', ...infG('b', 4000) },
      I2: { id: 'b_inf2', name: 'Sphärenklang', ...infS('b') },
    } },
    druidin: { h: 'd', nodes: {
      S0: { id: 'd_hire', name: 'Druidin anheuern', icon: '❀', kind: 'start', max: 1, cost: KEYC(1500, 6), desc: 'Die Druidin schließt sich deiner Gruppe an. Sie kämpft vorne mit Bärenkräften und ruft die Natur zu Hilfe.' },
      A: C1('d', 'd_atk', 'Krallen', 'S', '+10 % Schaden der Druidin je Stufe (wächst aufeinander auf)', 'atk', 1.1, 30, G(100, 1.7), 'pw'),
      H: C1('d', 'd_hp', 'Bärenfell', 'L', '+10 % Leben der Druidin je Stufe (wächst aufeinander auf)', 'hp', 1.1, 30, G(100, 1.7), 'pw'),
      U: C1('g', 'd_wild', 'Wildwuchs', '❦', 'Alle Helden heilen 0,2 % ihres Lebens pro Sekunde je Stufe', 'partyRegen', 0.002, 5, G(200, 2)),
      a1: C1('d', 'd_spd', 'Raubtier', 'T', '+5 % Angriffstempo der Druidin je Stufe', 'aps', 0.05, 8, G(150, 1.9), 'mu'),
      a2: C1('d', 'd_krit', 'Instinkt', 'K', '+4 % Chance auf kritische Treffer je Stufe', 'crit', 0.04),
      h1: C1('d', 'd_dr', 'Borke', 'R', '−4 % erlittener Schaden der Druidin je Stufe', 'dr', 0.04),
      h2: C1('d', 'd_regen', 'Verjüngung', '+', 'Die Druidin heilt 0,5 % ihres Lebens pro Sekunde je Stufe', 'regen', 0.005, 5, G(200, 2)),
      u1: C1('d', 'd_dorn', 'Dornenhaut', '✱', 'Wirft 15 % je Stufe des erlittenen Schadens zurück', 'thorns', 0.15, 3, ACTC2),
      X1: { id: 'd_ranken', name: 'Ranken', icon: '❦', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: Ranken halten alle Gegner 2 s fest (+0,5 s je Stufe) und machen 150 % Schaden. Abklingzeit 14 s.' },
      X2: { id: 'd_bruell', name: 'Bärengebrüll', icon: 'Ʊ', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: alle Helden nehmen 6 s lang 40 % weniger Schaden (+1 s je Stufe). Abklingzeit 18 s.' },
      X3: { id: 'd_adler', name: 'Adlerschwarm', icon: 'V', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: Adler stürzen sich auf bis zu 3 Fernkämpfer oder die hintersten Gegner, je 300 % Schaden (+100 % je Stufe). Abklingzeit 12 s.' },
      b1: C1('d', 'd_kritd', 'Zerreißen', '!', '+20 % kritischer Schaden je Stufe', 'critD', 0.2, 8, G(250, 1.9)),
      b2: C1('d', 'd_stun', 'Prankenhieb', '≋', '+6 % Chance je Stufe, den Gegner kurz zu betäuben', 'stunChance', 0.06, 5, G(300, 1.9)),
      b3: C1('d', 'd_eiche', 'Eichenkraft', 'Ш', '+8 % Leben der Druidin je Stufe', 'hp', 0.08, 5, ACTC2, 'mu'),
      b4: C1('g', 'd_mond', 'Mondtau', '♥', '+3 % Leben aller Helden je Stufe', 'partyHp', 0.03, 5, ACTC2, 'mu'),
      b5: C1('g', 'd_kraut', 'Kräutersammlerin', '$', '+6 % Gold je Stufe', 'gold', 0.06, 5, G(300, 2), 'mu'),
      b6: C1('g', 'd_geist', 'Naturgeist', '⚑', '+3 % Schaden aller Helden je Stufe', 'partyAtk', 0.03, 5, ACTC2, 'mu'),
      K1: { id: 'd_k1', name: 'Urbärin', icon: 'B', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [xx('d', 'atk', 1.5), xx('d', 'hp', 1.5)], desc: 'Schlüssel: Druidin +50 % Schaden und Leben' },
      K2: { id: 'd_k2', name: 'Weltenbaum', icon: 'Φ', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('d', 'revive', 1)], desc: 'Schlüssel: Einmal pro Lauf steht die Druidin mit halbem Leben wieder auf' },
      K3: { id: 'd_k3', name: 'Herz des Waldes', icon: '❀', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('g', 'partyRegen', 0.006)], desc: 'Schlüssel: alle Helden heilen 0,6 % ihres Lebens pro Sekunde' },
      K4: { id: 'd_k4', name: 'Wildes Herz', icon: '≫', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [xx('d', 'aps', 1.4)], desc: 'Schlüssel: +40 % Angriffstempo der Druidin' },
      K5: { id: 'd_k5', name: 'Rindenhaut', icon: '◙', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('d', 'block', 0.2)], desc: 'Schlüssel: +20 % Chance, Treffer abzuwehren' },
      I1: { id: 'd_inf1', name: 'Heiliger Hain', ...infG('d', 4000) },
      I2: { id: 'd_inf2', name: 'Atem der Erde', ...infS('d') },
    } },
    tueftler: { h: 'e', nodes: {
      S0: { id: 'e_hire', name: 'Tüftlerin anheuern', icon: '⚙', kind: 'start', max: 1, cost: KEYC(1500, 6), desc: 'Die Tüftlerin schließt sich deiner Gruppe an. Sie wirft Bomben, und ihr Geschützturm schießt mit.' },
      A: C1('e', 'e_atk', 'Sprengpulver', 'S', '+10 % Schaden der Tüftlerin je Stufe (wächst aufeinander auf)', 'atk', 1.1, 30, G(100, 1.7), 'pw'),
      H: C1('e', 'e_hp', 'Schutzanzug', 'L', '+10 % Leben der Tüftlerin je Stufe (wächst aufeinander auf)', 'hp', 1.1, 30, G(100, 1.7), 'pw'),
      U: C1('e', 'e_turm', 'Geschütztechnik', '⌂', '+12 % Schaden des Geschützturms je Stufe (wächst aufeinander auf)', 'turretMul', 1.12, 25, G(100, 1.75), 'pw'),
      a1: C1('e', 'e_spd', 'Schnellzünder', 'T', '+5 % Angriffstempo der Tüftlerin je Stufe', 'aps', 0.05, 8, G(150, 1.9), 'mu'),
      a2: C1('e', 'e_krit', 'Präzisionsmechanik', 'K', '+4 % Chance auf kritische Treffer je Stufe', 'crit', 0.04),
      h1: C1('e', 'e_dr', 'Panzerplatten', 'R', '−4 % erlittener Schaden der Tüftlerin je Stufe', 'dr', 0.04),
      h2: C1('e', 'e_regen', 'Erste Hilfe', '+', 'Die Tüftlerin heilt 0,4 % ihres Lebens pro Sekunde je Stufe', 'regen', 0.004, 5, G(200, 2)),
      u1: C1('e', 'e_splash', 'Streuladung', '◍', 'Bomben treffen nahe Gegner mit +10 % Schaden je Stufe', 'splash', 0.1, 5, ACTC2),
      X1: { id: 'e_turm2', name: 'Zweites Geschütz', icon: '⌂', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: baut für 10 s (+2 s je Stufe) einen weiteren Geschützturm. Abklingzeit 20 s.' },
      X2: { id: 'e_streu', name: 'Streubombe', icon: '✸', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 6 Bomben auf zufällige Gegner mit je 150 % Schaden (+50 % je Stufe). Abklingzeit 14 s.' },
      X3: { id: 'e_mine', name: 'Minenfeld', icon: '✺', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: Minen explodieren unter allen nahen Gegnern, 250 % Schaden (+80 % je Stufe) und 1 s betäubt. Abklingzeit 15 s.' },
      b1: C1('e', 'e_kritd', 'Sprengkraft', '!', '+20 % kritischer Schaden je Stufe', 'critD', 0.2, 8, G(250, 1.9)),
      b2: C1('e', 'e_tspd', 'Schnellfeuer', '≫', '+6 % Feuertempo des Geschützturms je Stufe', 'turretAps', 0.06, 8, G(200, 1.9), 'mu'),
      b3: C1('g', 'e_schrott', 'Schrotthändlerin', '$', '+6 % Gold je Stufe', 'gold', 0.06, 5, G(300, 2), 'mu'),
      b4: C1('e', 'e_cdr', 'Werkbank', '⌛', 'Fähigkeiten der Tüftlerin laden 4 % schneller je Stufe', 'cdr', 0.04, 5, G(400, 1.9)),
      b5: C1('e', 'e_act', 'Sprengmeisterin', '✺', '+20 % Schaden der aktiven Fähigkeiten je Stufe', 'actMul', 0.2, 5, ACTC2),
      b6: C1('e', 'e_boss', 'Panzerbrecher', '◎', '+10 % Schaden gegen Bosse und Elite-Gegner je Stufe', 'bossDmg', 0.1, 5, G(400, 1.9)),
      K1: { id: 'e_k1', name: 'Doppelturm', icon: 'Ⅱ', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('e', 'turrets', 1)], desc: 'Schlüssel: ein zweiter Geschützturm steht immer bereit' },
      K2: { id: 'e_k2', name: 'Großkaliber', icon: '●', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [xx('e', 'turretMul', 2)], desc: 'Schlüssel: Geschütztürme machen doppelten Schaden' },
      K3: { id: 'e_k3', name: 'Brandbomben', icon: '♨', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('e', 'burn', 0.3)], desc: 'Schlüssel: Bomben brennen nach, +30 % Schaden über 2 s' },
      K4: { id: 'e_k4', name: 'Kettenreaktion', icon: '✷', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('e', 'splash', 0.5)], desc: 'Schlüssel: Bomben treffen nahe Gegner mit +50 % Schaden' },
      K5: { id: 'e_k5', name: 'Automatik', icon: '⧗', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('e', 'cdr', 0.35)], desc: 'Schlüssel: Fähigkeiten der Tüftlerin laden 35 % schneller' },
      I1: { id: 'e_inf1', name: 'Werkstatt', ...infG('e', 4000) },
      I2: { id: 'e_inf2', name: 'Geniestreich', ...infS('e') },
    } },
  };
  for (const [tree, def] of Object.entries(TREES2)) {
    const slotId = Object.fromEntries(Object.entries(def.nodes).map(([slot, n]) => [slot, n.id]));
    for (const [slot, n] of Object.entries(def.nodes)) { const [x, y, ps] = TPL[slot]; NODES.push({ ...n, tree, x, y, p: ps.map(s => slotId[s]) }); }
  }
  /* ================= Ahnensiegel: Erweiterung der Bäume (ab Version 33) ================= */
  // Ein Siegel auf einem Helden lässt seinen Baum nach unten wachsen: 5 Passive, 3 Aktive mit eigenem Platz, 4 Schlüssel mit eigenem Sockel. Keine Endlos-Fertigkeiten.
  // Unter dem Start (Reihe 6) liegen die Reihen 7 bis 10.
  const SIG_TPL = {
    P1: [1, 7, ['S0']], P2: [3, 7, ['S0']], P3: [5, 7, ['S0']],
    A1: [1, 8, ['P1']], A2: [3, 8, ['P2']], A3: [5, 8, ['P3']],
    P4: [2, 9, ['A1', 'A2']], P5: [4, 9, ['A2', 'A3']],
    K1: [0, 10, ['P4']], K2: [2, 10, ['P4']], K3: [4, 10, ['P5']], K4: [6, 10, ['P5']],
  };
  const SIGC = { p: G(6000, 1.85), blood: G(5000, 1.6), q: SL([4, 6, 9, 12, 16]), a: SL([6, 10, 15]), k: KEYC(30000, 40) };
  const sP = (id, name, icon, desc, fx, cost = SIGC.p, max = 5) => ({ id, name, icon, max, cost, fx, desc });
  const sQ = (id, name, icon, desc, fx) => sP(id, name, icon, desc, fx, SIGC.q, 5);
  const sA = (id, name, icon, desc) => ({ id, name, icon, max: 3, cost: SIGC.a, active: true, desc: 'Aktiv: ' + desc });
  const sK = (id, name, icon, desc, fx) => ({ id, name, icon, max: 1, cost: SIGC.k, kind: 'key', fx, desc: 'Schlüssel: ' + desc });
  const sBlood = (h, who, heal) => sP(`sg_${h}_urblut`, 'Ahnenblut', '✦', `+5 % ${heal ? 'Heilung' : 'Schaden'} und Leben ${who} je Stufe (wächst aufeinander auf)`, [pw(h, heal ? 'heal' : 'atk', 1.05), pw(h, 'hp', 1.05)], SIGC.blood, 10);
  const SIG = {
    ritter: { h: 'r', nodes: {
      P1: sP('sg_r_ehre', 'Ritterehre', '✺', '+6 % Schaden der aktiven Fähigkeiten des Ritters je Stufe', [mu('r', 'actMul', 0.06)]),
      P2: sBlood('r', 'des Ritters'),
      P3: sP('sg_r_fahne', 'Fahnenträger', '⚑', '+2 % Schaden aller Helden je Stufe', [mu('g', 'partyAtk', 0.02)]),
      A1: sA('sg_r_schlag', 'Ritterschlag', '♔', 'der stärkste andere Held bekommt 8 s lang +50 % Schaden (+15 % je Stufe). Abklingzeit 20 s.'),
      A2: sA('sg_r_banner', 'Banner der Ehre', '⚐', 'fällt ein Held unter 35 %, kann 8 s lang (+1 s je Stufe) kein Held unter 1 Leben fallen. Abklingzeit 35 s.'),
      A3: sA('sg_r_duell', 'Ehrenduell', '⚔', 'fordert den stärksten Gegner heraus: 8 s lang macht die Gruppe +100 % Schaden (+25 % je Stufe) gegen ihn, und er macht 30 % weniger Schaden. Abklingzeit 18 s.'),
      P4: sQ('sg_r_kunst', 'Schwertkunst', 'T', '+5 % Angriffstempo des Ritters je Stufe', [mu('r', 'aps', 0.05)]),
      P5: sQ('sg_r_orden', 'Ordensrüstung', 'R', '−3 % erlittener Schaden des Ritters je Stufe', [ad('r', 'dr', 0.03)]),
      K1: sK('sg_r_meister', 'Waffenmeister', '✣', 'jeder 5. Angriff des Ritters trifft alle nahen Gegner', [ad('r', 'wmaster', 1)]),
      K2: sK('sg_r_schwur', 'Ritterschwur', '▲', 'Kriegsschrei hält doppelt so lange', [ad('r', 'schwur', 1)]),
      K3: sK('sg_r_blut', 'Blutklinge', '♥', 'Treffer des Ritters heilen ihn um 6 % des Schadens', [ad('r', 'lifesteal', 0.06)]),
      K4: sK('sg_r_bruder', 'Schwertbruder', '⚔', 'fällt ein anderer Held, macht der Ritter bis zum Ende der Welle +60 % Schaden', [ad('r', 'brother', 0.6)]),
    } },
    waechter: { h: 'w', nodes: {
      P1: sP('sg_w_granit', 'Granitleib', 'Ш', '+6 % Leben des Wächters je Stufe', [mu('w', 'hp', 0.06)]),
      P2: sBlood('w', 'des Wächters'),
      P3: sP('sg_w_schild', 'Schildmeister', '⟋', '+3 % Chance je Stufe, einen Treffer abzuwehren', [ad('w', 'block', 0.03)]),
      A1: sA('sg_w_spott', 'Spott', '☄', '5 s lang (+1 s je Stufe) greifen alle Gegner, auch Fernkämpfer, nur den Wächter an, und er nimmt 30 % weniger Schaden. Abklingzeit 18 s.'),
      A2: sA('sg_w_beben', 'Erdbeben', '≋', '250 % Schaden (+60 % je Stufe) an allen Gegnern, sie laufen 4 s lang 40 % langsamer. Abklingzeit 16 s.'),
      A3: sA('sg_w_prall', 'Prallschild', '◖', '6 s lang fängt der Wächter alle Geschosse der Gegner ab. Sie prallen zurück und treffen den Schützen mit 200 % des Wächter-Schadens (+60 % je Stufe). Abklingzeit 15 s.'),
      P4: sQ('sg_w_wucht', 'Wucht', '!', '+15 % kritischer Schaden des Wächters je Stufe', [ad('w', 'critD', 0.15)]),
      P5: sQ('sg_w_wehr', 'Wehrturm', '◎', 'Alle Helden nehmen 2 % weniger Schaden je Stufe', [ad('g', 'partyDr', 0.02)]),
      K1: sK('sg_w_schlag', 'Schildschlag', '◘', 'jeder abgewehrte Treffer betäubt den Angreifer 0,5 s (Bosse 0,25 s)', [ad('w', 'blockStun', 1)]),
      K2: sK('sg_w_koloss', 'Koloss', '▣', 'Angriffe des Wächters machen zusätzlich 4 % seines maximalen Lebens als Schaden, höchstens so viel wie sein normaler Schaden (also bis doppelt so viel)', [ad('w', 'koloss', 0.04)]),
      K3: sK('sg_w_wille', 'Eiserner Wille', '◈', 'Eiserne Haut löst schon bei 90 % Leben aus und hält 3 s länger', [ad('w', 'wille', 1)]),
      K4: sK('sg_w_schutz', 'Beschützer', '⛨', 'fällt ein anderer Held unter 25 %, schirmt der Wächter ihn 3 s komplett ab (einmal je Held und Welle)', [ad('w', 'protector', 1)]),
    } },
    schuetze: { h: 's', nodes: {
      P1: sP('sg_s_feder', 'Federkiel', 'T', '+5 % Angriffstempo der Schützin je Stufe', [mu('s', 'aps', 0.05)]),
      P2: sBlood('s', 'der Schützin'),
      P3: sP('sg_s_weit', 'Weitblick', 'K', '+3 % Chance auf kritische Treffer je Stufe', [ad('s', 'crit', 0.03)]),
      A1: sA('sg_s_ziel', 'Zielschuss', '⌖', 'zielt 1,5 s und trifft den Gegner mit dem meisten Leben mit 1200 % Schaden (+400 % je Stufe). Abklingzeit 16 s.'),
      A2: sA('sg_s_sperr', 'Sperrfeuer', '⋙', '4 s lang (+1 s je Stufe) schießt die Schützin dreimal so schnell. Abklingzeit 18 s.'),
      A3: sA('sg_s_sprung', 'Rückzugssprung', '↶', 'springt zurück, trifft die 2 vordersten Gegner mit 200 % (+60 % je Stufe) und ist 2 s unverwundbar. Abklingzeit 14 s.'),
      P4: sQ('sg_s_stahl', 'Stahlspitzen', '!', '+20 % kritischer Schaden der Schützin je Stufe', [ad('s', 'critD', 0.2)]),
      P5: sQ('sg_s_jagd', 'Großwildjagd', '◎', '+10 % Schaden gegen Bosse und Elite-Gegner je Stufe', [ad('s', 'bossDmg', 0.1)]),
      K1: sK('sg_s_scharf', 'Scharfschützin', '⊕', '+100 % Schaden gegen Gegner mit mehr als 80 % Leben', [ad('s', 'sharp', 1)]),
      K2: sK('sg_s_fieber', 'Jagdfieber', '≫', 'jeder besiegte Gegner gibt der Schützin 3 s lang +30 % Angriffstempo', [ad('s', 'hunt', 0.3)]),
      K3: sK('sg_s_falke', 'Falkenfreundin', 'V', 'der Falke greift zusätzlich alle 4 s von selbst den stärksten Gegner an (150 % Schaden)', [ad('s', 'falcon', 1.5)]),
      K4: sK('sg_s_toxik', 'Toxikologin', '☣', 'Giftpfeil kann bis zu 3-mal auf demselben Gegner stapeln', [ad('s', 'toxik', 1)]),
    } },
    magier: { h: 'm', nodes: {
      P1: sP('sg_m_wissen', 'Arkanes Wissen', '✺', '+6 % Schaden der aktiven Fähigkeiten des Magiers je Stufe', [mu('m', 'actMul', 0.06)]),
      P2: sBlood('m', 'des Magiers'),
      P3: sP('sg_m_fluss', 'Zauberfluss', '⌛', 'Fähigkeiten des Magiers laden 3 % schneller je Stufe', [ad('m', 'cdr', 0.03)]),
      A1: sA('sg_m_loch', 'Schwarzes Loch', '◉', 'zieht alle Gegner 3 s lang zusammen und hält sie fest, 150 % Schaden pro Sekunde (+50 % je Stufe). Abklingzeit 18 s.'),
      A2: sA('sg_m_strahl', 'Arkaner Strahl', '⟿', '3 s langer Strahl auf den stärksten Gegner. Der Schaden steigt alle 0,5 s, insgesamt etwa 1500 % (+25 % je Stufe). Abklingzeit 16 s.'),
      A3: sA('sg_m_mana', 'Manabrand', '♨', 'der stärkste Gegner verliert 4 s lang (+1 s je Stufe) 8 % seines aktuellen Lebens pro Sekunde. Bosse nehmen stattdessen 150 % Schaden des Magiers pro Sekunde. Abklingzeit 16 s.'),
      P4: sQ('sg_m_kern', 'Feuerkern', '!', '+20 % kritischer Schaden des Magiers je Stufe', [ad('m', 'critD', 0.2)]),
      P5: sQ('sg_m_schild', 'Arkane Haut', 'R', '−3 % erlittener Schaden des Magiers je Stufe', [ad('m', 'dr', 0.03)]),
      K1: sK('sg_m_schauer', 'Meteorschauer', '☄', 'Meteor fällt dreimal hintereinander mit je 50 % seines Schadens', [ad('m', 'schauer', 1)]),
      K2: sK('sg_m_frost', 'Permafrost', '❄', 'eingefrorene Gegner nehmen 50 % mehr Schaden von allen Helden', [ad('g', 'permafrost', 0.5)]),
      K3: sK('sg_m_ueber', 'Überladung', 'ϟ', 'jeder 4. Feuerball springt als Blitz auf 3 weitere Gegner (je 100 % Schaden)', [ad('m', 'overload', 1)]),
      K4: sK('sg_m_konz', 'Konzentration', '◎', '+100 % Schaden, wenn nur ein Gegner auf dem Feld ist', [ad('m', 'focus', 1)]),
    } },
    priester: { h: 'p', nodes: {
      P1: sP('sg_p_quell', 'Lichtquell', '+', '+8 % Heilung der Priesterin je Stufe', [mu('p', 'heal', 0.08)]),
      P2: sBlood('p', 'der Priesterin', true),
      P3: sP('sg_p_schnur', 'Gebetsschnur', '⌛', 'Fähigkeiten der Priesterin laden 3 % schneller je Stufe', [ad('p', 'cdr', 0.03)]),
      A1: sA('sg_p_boden', 'Heiliger Boden', '✚', 'fällt ein Held unter 80 %, heilen 8 s lang alle Helden 3 % ihres Lebens pro Sekunde (+1 % je Stufe). Abklingzeit 22 s.'),
      A2: sA('sg_p_eile', 'Segen der Schnelligkeit', '≫', 'die zwei Helden mit dem meisten Schaden greifen 6 s lang 50 % schneller an (+10 % je Stufe). Abklingzeit 18 s.'),
      A3: sA('sg_p_gebet', 'Gebet der Eile', '⧗', 'die aktiven Fähigkeiten aller anderen Helden laden sofort 4 s weiter (+1 s je Stufe). Abklingzeit 20 s.'),
      P4: sQ('sg_p_schein', 'Heiligenschein', '♥', '+2 % Leben aller Helden je Stufe', [mu('g', 'partyHp', 0.02)]),
      P5: sQ('sg_p_haende', 'Sanfte Hände', '❦', 'Alle Helden heilen 0,1 % ihres Lebens pro Sekunde je Stufe', [ad('g', 'partyRegen', 0.001)]),
      K1: sK('sg_p_fluegel', 'Engelsflügel', '⚚', 'wiederbelebte Helden sind 5 s unverwundbar', [ad('p', 'angel', 1)]),
      K2: sK('sg_p_feuer', 'Heiliges Feuer', '♨', 'die Hälfte jeder Heilung der Priesterin trifft den vordersten Gegner als Schaden, höchstens so viel wie ihre normale Heilung', [ad('p', 'holyFire', 0.5)]),
      K3: sK('sg_p_hohe', 'Hohepriesterin', '♛', 'Schutzschild ist doppelt so stark', [ad('p', 'hohe', 1)]),
      K4: sK('sg_p_wut', 'Heilige Wut', '☀', 'jede Wiederbelebung gibt allen Helden 6 s lang +40 % Schaden', [ad('p', 'wrath', 0.4)]),
    } },
    baendiger: { h: 't', nodes: {
      P1: sP('sg_t_blut', 'Wolfsblut', 'W', '+8 % Schaden der Wölfe je Stufe', [mu('t', 'wolfAtk', 0.08)]),
      P2: sBlood('t', 'des Tierbändigers'),
      P3: sP('sg_t_faehrte', 'Fährtenleser', 'T', '+5 % Angriffstempo des Tierbändigers je Stufe', [mu('t', 'aps', 0.05)]),
      A1: sA('sg_t_eber', 'Eberansturm', '➽', 'ein Eber rennt durch alle Gegner, 250 % Schaden (+80 % je Stufe), und wirft sie 1 s um (Bosse 0,5 s). Abklingzeit 14 s.'),
      A2: sA('sg_t_geheul', 'Wolfsgeheul', '☾', '6 s lang (+1 s je Stufe) machen alle Wölfe +80 % Schaden und beißen 50 % schneller. Abklingzeit 18 s.'),
      A3: sA('sg_t_instinkt', 'Urinstinkt', '✚', 'fällt der Tierbändiger unter 50 %, heilt er sich um 35 % seines Lebens (+10 % je Stufe). Abklingzeit 20 s.'),
      P4: sQ('sg_t_faenge', 'Scharfe Fänge', 'K', '+3 % Chance auf kritische Bisse der Wölfe je Stufe', [ad('t', 'wolfCrit', 0.03)]),
      P5: sQ('sg_t_fell', 'Zottelpelz', 'R', '−3 % erlittener Schaden des Tierbändigers je Stufe', [ad('t', 'dr', 0.03)]),
      K1: sK('sg_t_fuehrer', 'Rudelführer', '♚', 'jeder Wolf auf dem Feld gibt dem Tierbändiger +15 % Schaden', [ad('t', 'packLead', 0.15)]),
      K2: sK('sg_t_spur', 'Blutspur', '♦', 'Wolfsbisse lassen bluten: +40 % ihres Schadens über 3 s', [ad('t', 'bleed', 0.4)]),
      K3: sK('sg_t_treu', 'Treuer Begleiter', '♡', 'fällt der Tierbändiger, kämpft sein Wolf mit doppeltem Schaden weiter', [ad('t', 'loyal', 1)]),
      K4: sK('sg_t_leit', 'Leittier', '⤴', 'Raubtiersprung springt 2 weitere Gegner an', [ad('t', 'leit', 1)]),
    } },
    assassine: { h: 'a', nodes: {
      P1: sP('sg_a_nebel', 'Nebelschritt', '~', '+3 % Chance je Stufe, Treffern auszuweichen', [ad('a', 'dodge', 0.03)]),
      P2: sBlood('a', 'der Assassine'),
      P3: sP('sg_a_fokus', 'Schattenfokus', '⌛', 'Fähigkeiten der Assassine laden 3 % schneller je Stufe', [ad('a', 'cdr', 0.03)]),
      A1: sA('sg_a_kehle', 'Kehlschnitt', '⟋', 'besiegt sofort einen normalen Gegner unter 25 % Leben. Bosse nehmen stattdessen 500 % Schaden (+150 % je Stufe). Abklingzeit 10 s.'),
      A2: sA('sg_a_klon', 'Schattenklon', '☾', 'ein Klon kämpft 8 s mit und macht 50 % ihres Schadens (+15 % je Stufe). Abklingzeit 20 s.'),
      A3: sA('sg_a_mal', 'Schattenmal', '✕', 'markiert 3 Gegner für 8 s. Wird einer besiegt, springt sie sofort zum nächsten markierten und trifft ihn mit 400 % (+120 % je Stufe). Abklingzeit 16 s.'),
      P4: sQ('sg_a_praez', 'Tödliche Präzision', 'K', '+3 % Chance auf kritische Treffer je Stufe', [ad('a', 'crit', 0.03)]),
      P5: sQ('sg_a_rausch', 'Blutrausch', '♥', 'Heilt um 1 % je Stufe des verursachten Schadens', [ad('a', 'lifesteal', 0.01)]),
      K1: sK('sg_a_tanz', 'Schattentänzerin', '◌', 'nach jedem Ausweichen ist der nächste Treffer garantiert kritisch', [ad('a', 'dancer', 1)]),
      K2: sK('sg_a_seele', 'Seelenklinge', '◆', 'jeder besiegte Gegner lädt ihre Fähigkeiten 1 s weiter', [ad('a', 'soulBlade', 1)]),
      K3: sK('sg_a_kalt', 'Kaltblütig', '❄', '+50 % kritischer Schaden gegen Bosse', [ad('a', 'coldBlood', 0.5)]),
      K4: sK('sg_a_fluss', 'Klingenfluss', '≫', 'jeder Treffer gibt +2 % Angriffstempo, bis zu 20-mal. Wird sie getroffen, fängt es von vorne an.', [ad('a', 'flow', 0.02)]),
    } },
    nekromant: { h: 'n', nodes: {
      P1: sP('sg_n_mark', 'Knochenmark', 'B', '+10 % Schaden der Skelette je Stufe', [mu('n', 'minionMul', 0.1)]),
      P2: sBlood('n', 'des Nekromanten'),
      P3: sP('sg_n_feuer', 'Seelenfeuer', '✺', '+6 % Schaden der aktiven Fähigkeiten des Nekromanten je Stufe', [mu('n', 'actMul', 0.06)]),
      A1: sA('sg_n_wand', 'Knochenwand', '▥', 'eine Wand aus Knochen hält alle Nahkampf-Angriffe der Gegner 4 s lang auf (+1 s je Stufe). Abklingzeit 22 s.'),
      A2: sA('sg_n_riese', 'Knochenriese', '☗', 'ein Riese aus Knochen steht 12 s ganz vorne und fängt alle Nahkampf-Treffer ab. Er hält 300 % des Lebens des Nekromanten aus (+100 % je Stufe). Abklingzeit 25 s.'),
      A3: sA('sg_n_fessel', 'Seelenfessel', '∞', 'verbindet die 3 stärksten Gegner für 6 s (+1 s je Stufe). Schaden an einem trifft die anderen zu 50 %. Abklingzeit 16 s.'),
      P4: sQ('sg_n_kaelte', 'Grabkälte', 'K', '+3 % Chance auf kritische Treffer je Stufe', [ad('n', 'crit', 0.03)]),
      P5: sQ('sg_n_wacht', 'Totenwacht', 'R', '−3 % erlittener Schaden des Nekromanten je Stufe', [ad('n', 'dr', 0.03)]),
      K1: sK('sg_n_ewig', 'Unvergänglich', '∞', 'Skelette bleiben doppelt so lange', [ad('n', 'minionLong', 1)]),
      K2: sK('sg_n_ruest', 'Knochenrüstung', '▤', 'jedes Skelett gibt dem Nekromanten 5 % weniger erlittenen Schaden (höchstens 40 %)', [ad('n', 'boneArmor', 0.05)]),
      K3: sK('sg_n_samm', 'Seelensammler', '◇', 'jeder besiegte Gegner gibt dem Nekromanten +1 % Schaden für den Lauf, höchstens +50 %', [ad('n', 'collect', 0.01)]),
      K4: sK('sg_n_beschw', 'Totenbeschwörer', '♛', 'aus jedem Elite-Gegner steht ein starkes Skelett mit dreifachem Schaden auf', [ad('n', 'necro', 1)]),
    } },
    barde: { h: 'b', nodes: {
      P1: sP('sg_b_solo', 'Solist', '♫', 'Das Lied gibt allen Helden +1 % Schaden je Stufe', [ad('b', 'songAtk', 0.01)]),
      P2: sBlood('b', 'des Barden'),
      P3: sP('sg_b_rhythm', 'Rhythmus', '≫', 'Das Lied gibt allen Helden +1 % Angriffstempo je Stufe', [ad('b', 'songAps', 0.01)]),
      A1: sA('sg_b_diss', 'Dissonanz', '♭', 'alle Gegner greifen 5 s lang (+1 s je Stufe) halb so schnell an. Abklingzeit 16 s.'),
      A2: sA('sg_b_echo', 'Echo', '◍', 'wiederholt die zuletzt genutzte Fähigkeit eines anderen Helden. Abklingzeit 20 s (−2 s je Stufe).'),
      A3: sA('sg_b_ahnen', 'Ballade der Ahnen', '♔', '8 s lang +25 % Krit-Chance für alle Helden (+5 % je Stufe). Abklingzeit 20 s.'),
      P4: sQ('sg_b_kehle', 'Goldkehlchen', '⌛', 'Fähigkeiten des Barden laden 3 % schneller je Stufe', [ad('b', 'cdr', 0.03)]),
      P5: sQ('sg_b_applaus', 'Applaus', '$', '+8 % Gold je Stufe', [mu('g', 'gold', 0.08)]),
      K1: sK('sg_b_ensemble', 'Ensemble', '♬', 'das Lied und das Kriegslied lassen auch Wölfe, Skelette und Geschütztürme schneller angreifen', [ad('b', 'ensemble', 1)]),
      K2: sK('sg_b_steig', 'Steigerung', '↗', 'alle 5 s machen alle Helden +10 % mehr Schaden, bis +50 %. Wird der Barde getroffen, fängt es von vorne an.', [ad('b', 'cresc', 0.1)]),
      K3: sK('sg_b_takt', 'Taktmeister', '♩', 'Kriegslied lädt 40 % schneller', [ad('b', 'takt', 1)]),
      K4: sK('sg_b_muse', 'Muse', '✧', 'der Barde gibt 20 % seiner Krit-Chance an alle anderen Helden weiter', [ad('b', 'muse', 0.2)]),
    } },
    druidin: { h: 'd', nodes: {
      P1: sP('sg_d_wurzel', 'Wurzelwerk', 'Ш', '+6 % Leben der Druidin je Stufe', [mu('d', 'hp', 0.06)]),
      P2: sBlood('d', 'der Druidin'),
      P3: sP('sg_d_wild', 'Wildheit', 'T', '+5 % Angriffstempo der Druidin je Stufe', [mu('d', 'aps', 0.05)]),
      A1: sA('sg_d_gestalt', 'Wildgestalt', 'Ʊ', 'verwandelt sich 8 s lang (+1 s je Stufe) in eine Bärin: doppelter Schaden, und sie nimmt nur halb so viel Schaden. Abklingzeit 22 s.'),
      A2: sA('sg_d_wachs', 'Wachstum', '❦', 'alle Helden bekommen 10 s lang 20 % zusätzliches Leben (+5 % je Stufe), das zuerst verloren geht. Abklingzeit 24 s.'),
      A3: sA('sg_d_gewalt', 'Naturgewalt', '❀', '5 s lang (+1 s je Stufe) heilt sich die Druidin um ihren gesamten verursachten Schaden. Abklingzeit 20 s.'),
      P4: sQ('sg_d_sichel', 'Mondsichel', '!', '+15 % kritischer Schaden der Druidin je Stufe', [ad('d', 'critD', 0.15)]),
      P5: sQ('sg_d_erde', 'Erdkraft', '+', 'Die Druidin heilt 0,2 % ihres Lebens pro Sekunde je Stufe', [ad('d', 'regen', 0.002)]),
      K1: sK('sg_d_bluete', 'Blütezeit', '✿', 'jede Heilung auf die Druidin gibt ihr 4 s lang +20 % Schaden', [ad('d', 'bloom', 0.2)]),
      K2: sK('sg_d_auge', 'Adlerauge', 'V', 'Adlerschwarm trifft 2 zusätzliche Ziele', [ad('d', 'eagle', 2)]),
      K3: sK('sg_d_rinde', 'Uralte Rinde', '◙', 'Bärengebrüll hält doppelt so lange', [ad('d', 'rinde', 1)]),
      K4: sK('sg_d_hueter', 'Waldhüterin', '♣', '+40 % Schaden, solange alle Helden über 50 % Leben haben', [ad('d', 'warden', 0.4)]),
    } },
    tueftler: { h: 'e', nodes: {
      P1: sP('sg_e_lager', 'Kugellager', '≫', '+5 % Feuertempo der Geschütztürme je Stufe', [mu('e', 'turretAps', 0.05)]),
      P2: sBlood('e', 'der Tüftlerin'),
      P3: sP('sg_e_zuend', 'Zündkapsel', '✺', '+6 % Schaden der aktiven Fähigkeiten der Tüftlerin je Stufe', [mu('e', 'actMul', 0.06)]),
      A1: sA('sg_e_flamme', 'Flammenwerfer', '♨', '3 s langer Feuerstrahl nach vorne: alle 0,5 s 200 % Schaden (+50 % je Stufe) an den 3 vordersten Gegnern. Abklingzeit 14 s.'),
      A2: sA('sg_e_rakete', 'Raketensalve', '➶', '3 Raketen auf den stärksten Gegner, je 400 % Schaden (+120 % je Stufe). Abklingzeit 15 s.'),
      A3: sA('sg_e_druck', 'Überdruck', '⇶', 'Geschütztürme feuern 6 s lang (+1 s je Stufe) doppelt so schnell. Abklingzeit 18 s.'),
      P4: sQ('sg_e_mantel', 'Stahlmantel', '●', '+10 % Schaden der Geschütztürme je Stufe', [mu('e', 'turretMul', 0.1)]),
      P5: sQ('sg_e_helm', 'Schutzhelm', 'R', '−3 % erlittener Schaden der Tüftlerin je Stufe', [ad('e', 'dr', 0.03)]),
      K1: sK('sg_e_geist', 'Tüftlergeist', '⚙', 'jede Fähigkeit baut für 4 s ein kleines Zusatzgeschütz mit halbem Schaden', [ad('e', 'tinker', 1)]),
      K2: sK('sg_e_splitter', 'Splittergranaten', '✸', 'Streubombe wirft 10 statt 6 Bomben', [ad('e', 'splitter', 1)]),
      K3: sK('sg_e_panzer', 'Panzerung', '▣', 'solange ein Geschützturm steht, nimmt die Tüftlerin 25 % weniger Schaden', [ad('e', 'plating', 0.25)]),
      K4: sK('sg_e_fein', 'Feinmechanik', '⚲', 'Geschütztürme haben die doppelte Krit-Chance der Tüftlerin und +50 % kritischen Schaden', [ad('e', 'precise', 1)]),
    } },
  };
  for (const [tree, def] of Object.entries(SIG)) {
    const slotId = Object.fromEntries(Object.entries(def.nodes).map(([slot, n]) => [slot, n.id]));
    slotId.S0 = tree === 'ritter' ? 'start' : HERO[tree].hire;
    for (const [slot, n] of Object.entries(def.nodes)) { const [x, y, ps] = SIG_TPL[slot]; NODES.push({ ...n, tree, x, y, p: ps.map(s => slotId[s]), sig: true }); }
  }
  // Runengolem (Puzzle-Held aus der Runenmine): Baum und Siegel-Baum, ans Ende der Liste gehängt
  const GOLEM_TREE = {
    S0: { id: 'o_hire', name: 'Runengolem anheuern', icon: '⬢', kind: 'start', max: 1, cost: KEYC(1500, 6), desc: 'Der Runengolem schließt sich deiner Gruppe an. Er steht vorne, hält viel aus und verstärkt alle Runen.' },
    A: C1('o', 'o_atk', 'Steinfaust', 'S', '+10 % Schaden des Runengolems je Stufe (wächst aufeinander auf)', 'atk', 1.1, 30, G(100, 1.7), 'pw'),
    H: C1('o', 'o_hp', 'Felsenleib', 'L', '+10 % Leben des Runengolems je Stufe (wächst aufeinander auf)', 'hp', 1.1, 30, G(100, 1.7), 'pw'),
    U: C1('o', 'o_schliff', 'Runenschliff', '◈', 'Runen im Runengolem wirken 10 % stärker je Stufe', 'runeSelf', 0.1, 5, ACTC2),
    a1: C1('o', 'o_spd', 'Schwungmasse', 'T', '+5 % Angriffstempo des Runengolems je Stufe', 'aps', 0.05, 8, G(150, 1.9), 'mu'),
    a2: C1('o', 'o_stun', 'Erschütterung', '≋', '+6 % Chance je Stufe, den Gegner kurz zu betäuben', 'stunChance', 0.06, 5, G(300, 1.9)),
    h1: C1('o', 'o_dr', 'Granithaut', 'R', '−4 % erlittener Schaden des Runengolems je Stufe', 'dr', 0.04),
    h2: C1('o', 'o_regen', 'Steinfluss', '+', 'Der Runengolem heilt 0,4 % seines Lebens pro Sekunde je Stufe', 'regen', 0.004, 5, G(200, 2)),
    u1: C1('o', 'o_dorn', 'Runendornen', '✱', 'Wirft 15 % je Stufe des erlittenen Schadens zurück', 'thorns', 0.15, 3, ACTC2),
    X1: { id: 'o_wall', name: 'Runenwall', icon: '▥', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: 5 s lang (+1 s je Stufe) greifen alle Gegner nur den Runengolem an, und er nimmt 40 % weniger Schaden. Abklingzeit 20 s.' },
    X2: { id: 'o_beben', name: 'Runenbeben', icon: '≋', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: der Golem stampft auf. 200 % Schaden (+60 % je Stufe) an allen nahen Gegnern, sie sind 1,2 s betäubt. Abklingzeit 14 s.' },
    X3: { id: 'o_glyphe', name: 'Schutzglyphe', icon: '⬡', max: 3, cost: ACTC2, active: true, desc: 'Aktiv: alle Helden bekommen einen Schild aus 12 % des Golem-Lebens (+4 % je Stufe). Abklingzeit 22 s.' },
    b1: C1('o', 'o_kritd', 'Felsbrecher', '!', '+20 % kritischer Schaden je Stufe', 'critD', 0.2, 8, G(250, 1.9)),
    b2: C1('o', 'o_block', 'Steinwall', '◙', '+4 % Chance je Stufe, Treffer abzuwehren', 'block', 0.04, 5, G(300, 1.9)),
    b3: C1('o', 'o_eisen', 'Eisenader', 'Ш', '+8 % Leben des Runengolems je Stufe', 'hp', 0.08, 5, ACTC2, 'mu'),
    b4: C1('g', 'o_wacht', 'Felsenwacht', '⛉', 'Alle Helden nehmen 2 % weniger Schaden je Stufe', 'partyDr', 0.02, 5, ACTC2),
    b5: C1('o', 'o_cdr', 'Runengedächtnis', '⌛', 'Fähigkeiten des Runengolems laden 4 % schneller je Stufe', 'cdr', 0.04, 5, G(400, 1.9)),
    b6: C1('g', 'o_ader', 'Runenader', '♥', '+3 % Leben aller Helden je Stufe', 'partyHp', 0.03, 5, ACTC2, 'mu'),
    K1: { id: 'o_k1', name: 'Urgestein', icon: '⬢', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [xx('o', 'hp', 1.5), xx('o', 'atk', 1.3)], desc: 'Schlüssel: Runengolem +50 % Leben und +30 % Schaden' },
    K2: { id: 'o_k2', name: 'Runenherz', icon: '◈', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('o', 'runeSelf', 1)], desc: 'Schlüssel: Runen im Runengolem wirken doppelt so stark' },
    K3: { id: 'o_k3', name: 'Splitterschlag', icon: '✸', max: 1, cost: KEYC(16000, 24), kind: 'key', fx: [ad('o', 'wmaster', 1)], desc: 'Schlüssel: jeder 5. Schlag trifft alle Gegner in der Nähe' },
    K4: { id: 'o_k4', name: 'Granitwille', icon: 'R', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('o', 'dr', 0.15)], desc: 'Schlüssel: Runengolem nimmt 15 % weniger Schaden' },
    K5: { id: 'o_k5', name: 'Erdverbunden', icon: '▼', max: 1, cost: KEYC(22000, 30), kind: 'key', fx: [ad('o', 'block', 0.1), ad('o', 'blockStun', 1)], desc: 'Schlüssel: +10 % Chance, Treffer abzuwehren. Abgewehrte Angreifer sind kurz betäubt' },
    I1: { id: 'o_inf1', name: 'Runenresonanz', icon: '∞', max: 9999, cost: G(4000, 1.35), kind: 'inf', desc: 'Alle eingesetzten Runen aller Helden wirken 4 % stärker je Stufe' },
    I2: { id: 'o_inf2', name: 'Runenhort', icon: '∞', max: 9999, cost: r => ({ g: 0, s: 3 + r }), kind: 'inf', desc: '+1 % Runenkraft für alle je Stufe. Bei Stufe 15, 35 und 60 bekommt jeder Held einen Zusatz-Sockel, für Runen bis Stufe IV, VI und VIII. Zusatz-Sockel zählen nicht zum 3er-Set.' },
  };
  const GOLEM_SIG = {
    P1: sP('sg_o_granit', 'Granitkern', 'Ш', '+6 % Leben des Runengolems je Stufe', [mu('o', 'hp', 0.06)]),
    P2: sBlood('o', 'des Runengolems'),
    P3: sP('sg_o_glyph', 'Glyphenkunde', '✺', '+6 % Schaden der aktiven Fähigkeiten des Runengolems je Stufe', [mu('o', 'actMul', 0.06)]),
    A1: sA('sg_o_monolith', 'Monolith', '▮', '5 s lang (+1 s je Stufe) greifen alle Gegner nur den Runengolem an. Er nimmt 40 % weniger Schaden und wirft 100 % des Schadens zurück. Abklingzeit 22 s.'),
    A2: sA('sg_o_sturm', 'Runensturm', '✴', '6 s lang kreisen Runen um den Golem und treffen jede Sekunde alle nahen Gegner mit 80 % Schaden (+20 % je Stufe). Abklingzeit 18 s.'),
    A3: sA('sg_o_spalt', 'Erdspalt', 'Ψ', '400 % Schaden (+100 % je Stufe) am stärksten Gegner, er ist 2 s betäubt. Abklingzeit 16 s.'),
    P4: sQ('sg_o_kern', 'Runenkern', '◈', 'Runen im Runengolem wirken 5 % stärker je Stufe', [ad('o', 'runeSelf', 0.05)]),
    P5: sQ('sg_o_basalt', 'Basalt', 'R', '−3 % erlittener Schaden des Runengolems je Stufe', [ad('o', 'dr', 0.03)]),
    K1: sK('sg_o_reson', 'Resonanz', '≈', 'jede Rune im Runengolem gibt allen anderen Helden +5 % Schaden', [ad('o', 'reson', 0.05)]),
    K2: sK('sg_o_fels', 'Fels in der Brandung', '▲', 'solange der Runengolem über 50 % Leben hat, nehmen alle anderen Helden 15 % weniger Schaden', [ad('o', 'bulwark', 0.15)]),
    K3: sK('sg_o_wirbel', 'Runenwirbel', '✴', 'Runensturm hält doppelt so lange', [ad('o', 'stormX', 1)]),
    K4: sK('sg_o_ewig', 'Zerbrochener Stein', '✸', 'fällt der Runengolem, zerspringt er in Runen: alle Helden bekommen 8 s lang +40 % Schaden', [ad('o', 'shatter', 0.4)]),
  };
  {
    const sid = Object.fromEntries(Object.entries(GOLEM_TREE).map(([slot, n]) => [slot, n.id]));
    for (const [slot, n] of Object.entries(GOLEM_TREE)) { const [x, y, ps] = TPL[slot]; NODES.push({ ...n, tree: 'runengolem', x, y, p: ps.map(q => sid[q]) }); }
    const gid = Object.fromEntries(Object.entries(GOLEM_SIG).map(([slot, n]) => [slot, n.id])); gid.S0 = 'o_hire';
    for (const [slot, n] of Object.entries(GOLEM_SIG)) { const [x, y, ps] = SIG_TPL[slot]; NODES.push({ ...n, tree: 'runengolem', x, y, p: ps.map(q => gid[q]), sig: true }); }
  }
  // Schalter, die Siegel-Schlüssel setzen (Startwert 0)
  const SIG_FLAGS = ['wmaster', 'schwur', 'brother', 'vorbild', 'blockStun', 'koloss', 'wille', 'protector', 'sharp', 'hunt', 'falcon', 'toxik', 'schauer', 'overload', 'focus',
    'angel', 'holyFire', 'hohe', 'wrath', 'packLead', 'bleed', 'loyal', 'leit', 'dancer', 'soulBlade', 'coldBlood', 'flow', 'minionLong', 'boneArmor', 'collect', 'necro',
    'ensemble', 'cresc', 'takt', 'muse', 'bloom', 'eagle', 'rinde', 'warden', 'tinker', 'splitter', 'plating', 'precise', 'runeSelf', 'reson', 'bulwark', 'stormX', 'shatter'];
  const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));
  for (const h of HEROES) if (h.hire) { if (h.puzzle) NODE[h.hire].reqPuzzle = h.id; else NODE[h.hire].reqRebirth = h.rebirth; }

  // Dauerhafte Upgrades aus der Wiedergeburt (bezahlt mit Sternen)
  const PERKS = [
    { id: 'p_macht', name: 'Heldenblut', desc: '+10 % Schaden und Leben aller Helden je Stufe (wächst aufeinander auf)', max: 999, cost: r => 1 + r + Math.floor(r / 2) },
    { id: 'p_gold', name: 'Goldader', desc: '+15 % Gold je Stufe', max: 999, cost: r => 1 + r },
    { id: 'p_seele', name: 'Seelenquelle', desc: '+1 Seele pro besiegtem Boss je Stufe', max: 10, cost: r => 2 + 2 * r },
    { id: 'p_start', name: 'Beutezug', desc: 'Startest du in einem späteren Gebiet, bekommst du 10 % je Stufe des Golds der übersprungenen Stufen und +10 % mehr Abkürzungs-Seelen. Ausgezahlt wird nach und nach in den ersten 2 Minuten des Laufs', max: 10, cost: r => 2 + r },
    { id: 'p_freunde', name: 'Alte Freunde', desc: 'Angeheuerte Klassen bleiben nach einer Wiedergeburt angeheuert', max: 1, cost: () => 5 },
    { id: 'p_platz', name: 'Dritte Hand', desc: '+1 Platz für aktive Fähigkeiten des Ritters', max: 1, cost: () => 8 },
    { id: 'p_zins', name: 'Startkapital', desc: 'Nach einer Wiedergeburt startest du mit 500 Gold je Stufe', max: 30, cost: r => 1 + Math.floor(r / 2) },
    { id: 'p_seelenst', name: 'Seelenvorrat', desc: 'Nach einer Wiedergeburt startest du mit 3 Seelen je Stufe', max: 20, cost: r => 2 + r },
    { id: 'p_feld', name: 'Fünfter Platz', desc: '+1 Platz auf dem Feld: 5 Helden kämpfen gleichzeitig', max: 1, cost: () => 40 },
  ];
  const PERK = Object.fromEntries(PERKS.map(p => [p.id, p]));
  // Erste Wiedergeburt gibt doppelte Sterne, ab Stufe 60 wachsen die Sterne langsamer (damit späte Wiedergeburten nicht durchrauschen)
  const starsFor = (S, best = S.best) => (best < reqOf(S) ? 0 : Math.floor(Math.pow(Math.max(1, best - 15), 1.35) / 3 * (1 + 0.5 * ((S.cperks && S.cperks.k_sterne) || 0)) * ((S.rebirths || 0) < 1 ? 2 : 1) * (best > 60 ? 60 / best : 1)));

  /* ================= Aufstieg (2. Prestige-Ebene) ================= */
  const ASC_REQ_REBIRTHS = 9, ASC_REQ_STAGE = 150;
  const CPERKS = [
    { id: 'k_blut', name: 'Königsblut', desc: 'Alle Helden ×1,5 Schaden und Leben je Stufe', max: 999, cost: r => 3 + 2 * r },
    { id: 'k_schatz', name: 'Schatzkammer', desc: 'Doppeltes Gold je Stufe', max: 999, cost: r => 3 + 2 * r },
    { id: 'k_sterne', name: 'Sternenerbe', desc: '+50 % Sterne bei jeder Wiedergeburt je Stufe', max: 10, cost: r => 4 + 2 * r },
    { id: 'k_seele', name: 'Seelenfluss', desc: 'Bosse geben doppelt so viele Seelen je Stufe', max: 5, cost: r => 4 + 3 * r },
    { id: 'k_schnell', name: 'Schneller Weg', desc: 'Jede Wiedergeburt braucht 5 Stufen weniger je Stufe', max: 3, cost: r => 6 + 3 * r },
    { id: 'k_veteran', name: 'Veteranen', desc: 'Angeheuerte Klassen bleiben bei Wiedergeburt und Aufstieg angeheuert', max: 1, cost: () => 8 },
    { id: 'k_hand', name: 'Zweite Hand', desc: 'Jede Klasse bekommt einen zusätzlichen Platz für aktive Fähigkeiten', max: 1, cost: () => 15 },
    { id: 'k_start', name: 'Königlicher Start', desc: 'Nach Wiedergeburt und Aufstieg startest du mit 5.000 Gold und 10 Seelen je Stufe', max: 10, cost: r => 2 + r },
    { id: 'k_feld', name: 'Sechster Platz', desc: '+1 Platz auf dem Feld, für immer. Zusammen mit dem Fünften Platz aus dem Sternen-Laden kämpfen alle 6 Helden', max: 1, cost: () => 10 },
  ];
  const CPERK = Object.fromEntries(CPERKS.map(p => [p.id, p]));
  // Grundwert: 1. Aufstieg 25, 2. Aufstieg 18, danach 10 Kronen. Dazu +1 je 4 Stufen über 150
  const ascBase = S => [25, 18][S.asc || 0] ?? 10;
  const crownsFor = S => (S.rebirths >= ASC_REQ_REBIRTHS && S.best >= ASC_REQ_STAGE ? ascBase(S) + Math.floor((S.best - ASC_REQ_STAGE) / 4) : 0);
  const ASC_ROAD = [
    { a: 1, text: 'Kronen-Laden mit dauerhaften Königs-Boni' }, { a: 2, text: 'Begleiter: Drache und Eule' }, { a: 3, text: 'Begleiter: Golem' },
    { a: 4, text: 'Begleiter: Phönix und ein zweiter Begleiter-Platz' }, { a: 5, text: 'Begleiter bis Stufe 100' },
  ];
  const ascDiff = S => Math.pow(1.6, S.asc || 0);
  // Aufstiegsränge: ein Titel pro Aufstieg, ab dem 10. Aufstieg Kaiser mit Zählung
  const RANKS = [
    { name: 'Abenteurer', col: '#a99fbb' }, { name: 'Ritter', col: '#c9ced8' }, { name: 'Freiherr', col: '#7ee08a' }, { name: 'Baron', col: '#4fc3ff' },
    { name: 'Graf', col: '#7fb2ff' }, { name: 'Markgraf', col: '#c08cff' }, { name: 'Herzog', col: '#ff8ac8' }, { name: 'Fürst', col: '#ff9a3d' },
    { name: 'König', col: '#ffd23f' }, { name: 'Großkönig', col: '#ffb547' }, { name: 'Kaiser', col: '#fff2b0' },
  ];
  const romanN = n => { let r = ''; for (const [v, c] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { r += c; n -= v; } return r; };
  const rankOf = a => { a = Math.max(0, Math.floor(a || 0)); const R0 = RANKS[Math.min(a, RANKS.length - 1)]; return { name: a < RANKS.length ? R0.name : `Kaiser ${romanN(a - RANKS.length + 2)}`, col: R0.col, n: a }; };
  const rankBonus = a => 2 * a; // einmalige Kronen beim Erreichen eines neuen Rangs
  // Helden-Meisterschaft: Erfahrung je Held über alle Aufstiege, Stufen geben Bonus und Farben
  const MAST_MAX = 10;
  const mastNeed = L => Math.round(300 * Math.pow(1.5, L));
  function mastInfo(xp) { let L = 0, rest = Math.max(0, xp || 0); while (L < MAST_MAX && rest >= mastNeed(L)) { rest -= mastNeed(L); L++; } return { L, rest, need: L < MAST_MAX ? mastNeed(L) : 0 }; }
  const mastLevel = (S, id) => mastInfo(S.mast && S.mast[id]).L;
  const SKINS = [
    { id: 'std', name: 'Standard', L: 0 },
    { id: 'nacht', name: 'Mitternacht', L: 3, tint: '#3a56c8', amt: 0.6 },
    { id: 'glut', name: 'Glut', L: 6, tint: '#ff8a1a', amt: 0.55 },
    { id: 'ahnen', name: 'Ahnenglanz', L: 10, tint: '#ffe08a', amt: 0.65, aura: true },
  ];
  const SKIN = Object.fromEntries(SKINS.map(k => [k.id, k]));
  // Der Weltenfresser: wartet unangekündigt auf Stufe 300 im Feldzug
  const WF_STAGE = 300, WF = { hp: 25, dmg: 1.4, crownsFirst: 30, crowns: 5 };

  /* ================= Begleiter ================= */
  const COMPS = [
    { id: 'drache', name: 'Drache', asc: 2, color: '#e5484d', desc: l => `Speit alle 3 s Feuer auf alle Gegner (${Math.round(30 * (1 + 0.2 * l))} % des Gruppenschadens)` },
    { id: 'eule', name: 'Eule', asc: 2, color: '#d9c48a', desc: l => `+${(1.5 * l).toFixed(1).replace('.', ',')} % Krit-Chance für alle, +${5 * l} % Gold` },
    { id: 'golem', name: 'Golem', asc: 3, color: '#9aa3ad', desc: l => `Alle Helden nehmen ${Math.min(30, 1.5 * l).toFixed(1).replace('.', ',')} % weniger Schaden und haben +${3 * l} % Leben` },
    { id: 'phoenix', name: 'Phönix', asc: 4, color: '#ff9a3d', desc: l => `Heilt alle Helden um ${(0.15 * l).toFixed(2).replace('.', ',')} % pro Sekunde${l >= 10 ? ', belebt einmal pro Lauf alle Gefallenen wieder' : ' (ab Stufe 10: Wiederbelebung)'}` },
  ];
  const COMP = Object.fromEntries(COMPS.map(c => [c.id, c]));
  const compMax = S => ((S.asc || 0) >= 5 ? 100 : 50);
  const compSlots = S => ((S.asc || 0) >= 4 ? 2 : 1);
  const compCost = lvl => Math.ceil(5 * Math.pow(1.28, lvl));

  /* ================= Erfolge ================= */
  const ACH = [
    { id: 'st10', name: 'Erste Schritte', desc: 'Erreiche Stufe 10', ok: S => S.bestEver >= 10 },
    { id: 'st25', name: 'Abenteurer', desc: 'Erreiche Stufe 25', ok: S => S.bestEver >= 25 },
    { id: 'st50', name: 'Veteran', desc: 'Erreiche Stufe 50', ok: S => S.bestEver >= 50 },
    { id: 'st100', name: 'Held', desc: 'Erreiche Stufe 100', ok: S => S.bestEver >= 100 },
    { id: 'st150', name: 'Legende', desc: 'Erreiche Stufe 150', ok: S => S.bestEver >= 150 },
    { id: 'st200', name: 'Albtraumjäger', desc: 'Erreiche Stufe 200', ok: S => S.bestEver >= 200 },
    { id: 'rb1', name: 'Neues Leben', desc: 'Werde zum ersten Mal wiedergeboren', ok: S => S.rebirths >= 1 || S.asc > 0 },
    { id: 'rb5', name: 'Kreislauf', desc: 'Werde 5-mal in einem Durchgang wiedergeboren', ok: S => S.rebirths >= 5 || S.asc > 0 },
    { id: 'rb9', name: 'Vollendung', desc: 'Erreiche die 9. Wiedergeburt', ok: S => S.rebirths >= 9 || S.asc > 0 },
    { id: 'asc1', name: 'Gekrönt', desc: 'Steige zum ersten Mal auf', ok: S => S.asc >= 1 },
    { id: 'asc3', name: 'Dynastie', desc: 'Steige 3-mal auf', ok: S => S.asc >= 3 },
    { id: 'k1k', name: 'Gegnerflut', desc: 'Besiege insgesamt 1.000 Gegner', ok: S => S.tot.kills >= 1000 },
    { id: 'k10k', name: 'Schlachtfeld', desc: 'Besiege insgesamt 10.000 Gegner', ok: S => S.tot.kills >= 10000 },
    { id: 'k100k', name: 'Armeebrecher', desc: 'Besiege insgesamt 100.000 Gegner', ok: S => S.tot.kills >= 100000 },
    { id: 'gold1m', name: 'Wohlstand', desc: 'Besitze 1 Million Gold auf einmal', ok: S => S.gold >= 1e6 },
    { id: 'gold1b', name: 'Drachenhort', desc: 'Besitze 1 Milliarde Gold auf einmal', ok: S => S.gold >= 1e9 },
    { id: 'souls100', name: 'Seelensammler', desc: 'Sammle insgesamt 100 Seelen', ok: S => S.tot.souls >= 100 },
    { id: 'souls1k', name: 'Seelenhirte', desc: 'Sammle insgesamt 1.000 Seelen', ok: S => S.tot.souls >= 1000 },
    { id: 'party3', name: 'Trio', desc: 'Habe 3 Klassen gleichzeitig in der Gruppe', ok: S => HEROES.filter(h => hired(S, h.tree)).length >= 3 },
    { id: 'party6', name: 'Volle Gruppe', desc: 'Habe alle 6 Klassen in der Gruppe', ok: S => HEROES.filter(h => !h.puzzle).every(h => hired(S, h.tree)) },
    { id: 'keys10', name: 'Schlüsselmeister', desc: 'Besitze 10 Schlüssel-Fertigkeiten gleichzeitig', ok: S => NODES.filter(n => n.kind === 'key' && S.nodes[n.id]).length >= 10 },
    { id: 'rune5', name: 'Runenmeister', desc: 'Besitze eine Rune der Stufe V', ok: S => S.runes.some(r => r.tier >= 5) },
    { id: 'runeset', name: 'Gleichklang', desc: 'Setze 3 gleiche Runen in eine Klasse ein', ok: S => HEROES.some(h => { const t = (S.sockets[h.id] || []).map(id => (S.runes.find(r => r.id === id) || {}).t).filter(Boolean); return t.length === 3 && t.every(x => x === t[0]); }) },
    { id: 'tower10', name: 'Turmstürmer', desc: 'Erreiche Etage 10 im Turm', ok: S => S.towerBest >= 10 },
    { id: 'tower30', name: 'Turmherr', desc: 'Erreiche Etage 30 im Turm', ok: S => S.towerBest >= 30 },
    { id: 'clean50', name: 'Ohne Verluste', desc: 'Erreiche Stufe 50 in einem Lauf, ohne dass ein Held fällt', ok: (S, run) => run && run.mode === 'normal' && run.stage > 50 && !run.losses },
    { id: 'week30', name: 'Herausforderer', desc: 'Erreiche Stufe 30 in einer Tages-Herausforderung', ok: S => S.weekly.best >= 30 },
    { id: 'comp10', name: 'Treuer Freund', desc: 'Bringe einen Begleiter auf Stufe 10', ok: S => Object.values(S.comps).some(l => l >= 10) },
    { id: 'comp4', name: 'Menagerie', desc: 'Besitze alle 4 Begleiter', ok: S => COMPS.every(c => (S.comps[c.id] || 0) > 0) },
  ];
  const ACH_BONUS = 0.03; // +3 % Schaden und Leben je Erfolg (wächst aufeinander auf)

  /* ================= Wochen-Herausforderung ================= */
  const RULES = [
    { id: 'speed', name: 'Eilige Gegner', desc: 'Gegner laufen und schlagen 50 % schneller' },
    { id: 'boss', name: 'Bossparade', desc: 'Alle 5 Stufen kommt ein Boss' },
    { id: 'noheal', name: 'Keine Heilung', desc: 'Keine Heilung und keine Regeneration' },
    { id: 'glass', name: 'Glaskanonen', desc: 'Helden haben halbes Leben, machen aber doppelten Schaden' },
    { id: 'elite', name: 'Eliteschar', desc: '40 % der Gegner sind Elite-Gegner' },
    { id: 'giant', name: 'Riesen', desc: 'Gegner haben doppeltes Leben, Helden schlagen 50 % schneller zu' },
    { id: 'trio', name: 'Kleine Gruppe', desc: 'Nur die drei vordersten Klassen kämpfen mit' },
  ];
  const RULE = Object.fromEntries(RULES.map(r => [r.id, r]));
  // Tages-Herausforderung (früher wöchentlich): neue Regeln und Belohnungen jeden Tag um Mitternacht
  const WEEK_TIERS = [{ st: 15, stars: 1 }, { st: 30, stars: 2 }, { st: 50, stars: 3 }, { st: 80, stars: 5 }, { st: 120, stars: 8, crown: 1 }];
  const dayId = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayLeft = (d = new Date()) => { const m = new Date(d); m.setHours(24, 0, 0, 0); const mins = Math.max(1, Math.round((m - d) / 60000)); return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`; };
  function weekId(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0')}`;
  }
  function weekRules(id) {
    let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const a = h % RULES.length; let b = ((Math.imul(h ^ (h >>> 13), 2654435761) >>> 0) >>> 5) % RULES.length; if (b === a) b = (b + 1) % RULES.length;
    return [RULES[a].id, RULES[b].id];
  }

  /* ================= Runen ================= */
  const RUNES = [
    { id: 'kraft', name: 'Kraft', color: '#e5484d', desc: v => `+${pct(v)} Schaden`, val: 0.08 },
    { id: 'leben', name: 'Leben', color: '#27a06a', desc: v => `+${pct(v)} Leben`, val: 0.08 },
    { id: 'eile', name: 'Eile', color: '#f2be1a', desc: v => `+${pct(v)} Angriffstempo, Fähigkeiten laden ${pct(v / 4)} schneller (über 60 % Abklingzeit wird daraus mehr Fähigkeiten-Schaden)`, val: 0.07 },
    { id: 'zorn', name: 'Zorn', color: '#ff7a3d', desc: v => `Kritische Treffer machen +${pct(v)} mehr Schaden`, val: 0.12 },
    { id: 'schutz', name: 'Schutz', color: '#7fb2ff', desc: v => `−${pct(v)} erlittener Schaden (zählt immer voll, höchstens 72 %). Jeder Prozentpunkt über 72 % wird zu +2 % Leben`, val: 0.025 },
    { id: 'fokus', name: 'Fokus', color: '#c08cff', desc: v => `Fähigkeiten laden ${pct(v)} schneller. Abklingzeit sinkt höchstens um 60 %, jeder Prozentpunkt darüber wird zu +2 % Schaden der aktiven Fähigkeiten`, val: 0.04 },
    { id: 'glueck', name: 'Glück', color: '#ffcf4a', desc: v => `+${pct(v)} Gold für alle`, val: 0.06 },
    { id: 'seele', name: 'Seele', color: '#c9a6ff', desc: v => `+${pct(v)} Chance auf Seelen bei Elite-Gegnern. Über 100 % gibt es mehrere Seelen: 380 % heißt sicher 3 und mit 80 % eine 4. Dazu +${pct(0.1 * Math.sqrt(v))} Seelen von Bossen (alle Seelen-Runen zusammen).`, val: 0.3, grow: 1.75 },
  ];
  const RUNE = Object.fromEntries(RUNES.map(r => [r.id, r]));
  const pct = v => `${Math.round(v * 1000) / 10} %`.replace('.', ',');
  const runeVal = (type, tier) => RUNE[type].val * Math.pow(RUNE[type].grow || 2.2, tier - 1);
  // Chancen über 100 %: 380 % = sicher 3 Mal, dazu 80 % Chance auf ein 4. Mal
  const procs = p => (p > 0 ? Math.floor(p) + (Math.random() < p - Math.floor(p) ? 1 : 0) : 0);
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const LAGER_STEP = 5, LAGER_MAX = 12;
  const lagerCost = n => 10 * Math.pow(2, n);
  const runeCap = S => 40 + LAGER_STEP * (S.rlager || 0);
  const DUST_RUNE = 4;
  const shardOf = tier => Math.pow(3, tier - 1), mergeCost = tier => Math.pow(3, tier);
  /* ================= Ahnenprüfung ================= */
  // 10 Missionen mit je 5 eigenen Bossen (3 Phasen), am Ende von Mission 10 wartet der Urahn. Wer die Kette schafft, bekommt ein Ahnensiegel.
  // len: Bosskämpfe dauern so viel länger. Leben ×len, Fähigkeiten und Wut entsprechend seltener bzw. später, Grundangriff schwächer.
  // So bleibt die Zahl der Fähigkeiten und der Gesamtschaden pro Kampf gleich, nur die Dauer wächst (Ziel: ganze Prüfung ≈ 1 h bei Tempo ×3).
  const AHN_TUNE = { hp: 32, dmg: 0.3, atk: 0.5, mHp: 0.3, mDmg: 0.08, minHp: 0.55, waves: 2, lvl: 0.8, ahneHp: 1.2, enr: 140, len: 4 };
  // Großangriff, Schildwall und Schwachstellen (Zeiten mit *Real* in echten Sekunden, unabhängig vom Spieltempo, sonst Spielsekunden)
  // big: alle so viele Sekunden ein angekündigter Großangriff, teleReal: Vorwarnzeit, bigDmg: Anteil vom Leben jedes Helden.
  // wallCd: Abklingzeit Schildwall, wallReal: so lange hält er, wallBlock: blockt beim Großangriff (von Hand), wallAuto: automatisch.
  // spot: alle so viele Sekunden eine Schwachstelle, spotReal: so lange sichtbar, spotDmg: Anteil vom Boss-Leben, spotStun: Betäubung.
  const AHN_MECH = { big: 16, teleReal: 2.2, bigDmg: 0.6, wallCd: 14, wallReal: 4, wallBlock: 0.9, wallAuto: 0.25, spot: 7, spotReal: 2.6, spotDmg: 0.025, spotStun: 1.5 };
  // Fähigkeiten der Bosse. dmg-Werte sind Vielfache des Boss-Angriffs.
  const AHN_ABIL = {
    slam: { name: 'Erdstoß', desc: 'holt aus und trifft alle Helden', cd: 9, tele: 1.4 },
    quake: { name: 'Beben', desc: 'betäubt alle Helden kurz', cd: 14 },
    snipe: { name: 'Fernschlag', desc: 'trifft den hintersten Helden hart', cd: 7 },
    rain: { name: 'Geschosshagel', desc: 'Geschosse auf zufällige Helden', cd: 10 },
    bomb: { name: 'Zeitbombe', desc: 'eine Bombe explodiert nach 3 s an einem Helden', cd: 12 },
    summon: { name: 'Ruf der Diener', desc: 'ruft zwei Diener vor sich', cd: 16 },
    split: { name: 'Abspaltung', desc: 'teilt zu Beginn der Phase zwei Abbilder ab', cd: 0, start: true },
    shield: { name: 'Schutzpanzer', desc: 'ein Schild schluckt Schaden, bis er bricht', cd: 18 },
    reflect: { name: 'Spiegelhaut', desc: 'wirft 4 s lang Schaden auf den vordersten Helden zurück', cd: 15 },
    heal: { name: 'Regeneration', desc: 'heilt sich 5 s lang', cd: 18 },
    stun: { name: 'Betäubungshieb', desc: 'betäubt den vordersten Helden', cd: 11 },
    poison: { name: 'Giftwolke', desc: 'alle Helden verlieren 6 s lang Leben', cd: 14 },
    curse: { name: 'Fluch', desc: 'Heilung wirkt 7 s lang viel schwächer', cd: 15 },
    silence: { name: 'Stille', desc: 'alle Fähigkeiten der Helden laden 4 s länger', cd: 15 },
    frenzy: { name: 'Raserei', desc: 'greift 5 s lang doppelt so schnell an', cd: 14 },
    mark: { name: 'Todesmarke', desc: 'ein Held nimmt 6 s lang doppelten Schaden', cd: 13 },
    charge: { name: 'Ansturm', desc: 'stürmt auf den vordersten Helden und wirft ihn um', cd: 12 },
    drain: { name: 'Lebensraub', desc: 'stiehlt dem vordersten Helden Leben', cd: 10 },
    freeze: { name: 'Frosthauch', desc: 'Helden greifen 5 s lang halb so schnell an', cd: 14 },
    blind: { name: 'Finsternis', desc: 'Helden verfehlen 5 s lang jeden dritten Angriff', cd: 15 },
    vanish: { name: 'Schattenflucht', desc: 'wird 2 s unverwundbar und weicht zurück', cd: 16 },
    burn: { name: 'Feuersbrunst', desc: 'der Boden brennt 6 s lang unter den Helden', cd: 14 },
    chain: { name: 'Kettenblitz', desc: 'ein Blitz springt über drei Helden', cd: 10 },
  };
  const AHN_TRAIT = { armor: v => `nimmt ${Math.round(v * 100)} % weniger Schaden`, haste: v => `greift ${Math.round((v - 1) * 100)} % schneller an`, regen: v => `heilt ${(v * 100).toFixed(1).replace('.', ',')} % pro Sekunde` };
  // b(name, Bossbild, Farbe, Größe, Effekt, Spruch, Phase 1, Phase 2, Phase 3); Phasen: [Fähigkeiten, Eigenschaften]
  const ahnB = (name, bk, tint, sz, acc, quote, p1, p2, p3) => ({ name, bk, tint, sz, acc, quote, ph: [p1, p2, p3].map(p => ({ a: p[0], t: p[1] || {} })) });
  const AHN_MISSIONS = [
    { name: 'Wiesengrund', env: 0, minion: 'schleim', col: '#7ee08a', desc: 'Sanfte Hügel, aber die Bewohner sind alles andere als sanft.', bosses: [
      ahnB('Glibberbaron', 0, '#ff7ab8', 1, 'blasen', 'Ich bin weich, aber ihr werdet nicht durchkommen!', [['summon']], [['slam'], { armor: 0.1 }], [['split', 'frenzy']]),
      ahnB('Hauptmann Knirschzahn', 1, '#c9a64a', 1, 'staub', 'Meine Bande hat noch nie verloren.', [['charge']], [['rain', 'summon']], [['frenzy', 'stun']]),
      ahnB('Der Moosgreis', 11, '#9be36b', 1, 'blaetter', 'Wurzeln vergessen nichts.', [['heal']], [['poison', 'snipe']], [['shield', 'quake']]),
      ahnB('Königin Tauperle', 0, '#7ad7ff', 1.05, 'blasen', 'Jeder Tropfen gehorcht mir.', [['freeze']], [['split', 'heal']], [['rain', 'freeze'], { armor: 0.2 }]),
      ahnB('Wächter des Hains', 10, '#b5e08a', 1, 'runen', 'Nur wer würdig ist, geht weiter.', [['snipe']], [['reflect', 'slam']], [['summon', 'blind']]),
    ] },
    { name: 'Finsterforst', env: 1, minion: 'goblin', col: '#3f8a5a', desc: 'Zwischen den Stämmen lauern Augen, die nie schlafen.', bosses: [
      ahnB('Rabenfürst Krahl', 7, '#4a4a6a', 1, 'federn', 'Die Raben erzählen mir alles.', [['snipe', 'rain']], [['vanish', 'mark']], [['blind', 'chain']]),
      ahnB('Borkenbrecher', 6, '#8a5a2b', 1.1, 'staub', 'Ich zerbreche Eichen. Und Helden.', [['slam']], [['charge'], { armor: 0.3 }], [['quake', 'frenzy']]),
      ahnB('Hexe Nachtschatten', 5, '#7a5ad8', 1, 'schatten', 'Mein Kessel brodelt schon für euch.', [['curse']], [['poison', 'summon']], [['silence', 'mark']]),
      ahnB('Grauklaue', 1, '#9aa3ad', 1.05, 'staub', 'Das Rudel jagt heute Helden.', [['charge', 'frenzy']], [['summon']], [['drain', 'frenzy'], { haste: 1.3 }]),
      ahnB('Der Hirschkönig', 11, '#e8d9a8', 1.1, 'blaetter', 'Der Wald hat mich gekrönt.', [['stun']], [['heal', 'slam']], [['shield', 'rain', 'quake']]),
    ] },
    { name: 'Knochenacker', env: 2, minion: 'skelett', col: '#c9c0e0', desc: 'Hier ruhen die Gefallenen. Nicht alle bleiben liegen.', bosses: [
      ahnB('Gebeinsammler', 2, '#e8e2d0', 1, 'knochen', 'Eure Knochen fehlen mir noch.', [['summon']], [['drain', 'curse']], [['split', 'summon']]),
      ahnB('Grabwächter Morrak', 2, '#7a9a6a', 1.1, 'runen', 'Niemand stört die Toten.', [['shield']], [['slam'], { armor: 0.25 }], [['quake', 'stun']]),
      ahnB('Die Klagende', 12, '#c8f5ff', 1, 'geister', 'Hört ihr mein Lied? Es ist euer letztes.', [['blind']], [['silence', 'vanish']], [['mark', 'chain']]),
      ahnB('Pestdoktor Varn', 5, '#7a9a3a', 1, 'gift', 'Keine Sorge, das tut nur kurz weh.', [['poison']], [['curse', 'bomb']], [['poison', 'rain', 'heal']]),
      ahnB('Knochendrache Ossar', 13, '#d8d0c0', 1, 'knochen', 'Ich war schon tot. Ihr habt keine Chance.', [['rain']], [['charge', 'burn']], [['quake', 'frenzy'], { armor: 0.2 }]),
    ] },
    { name: 'Glutschlund', env: 3, minion: 'daemon', col: '#ff7a3d', desc: 'Die Erde selbst brennt. Bleibt nicht zu lange stehen.', bosses: [
      ahnB('Funkenkobold Zisch', 3, '#ffd23f', 0.95, 'funken', 'Bumm! Hihihi!', [['bomb']], [['rain', 'frenzy']], [['split', 'bomb']]),
      ahnB('Schlackenkoloss', 8, '#6a5a5a', 1.1, 'funken', 'Ich bin aus erkaltetem Feuer gemacht.', [['slam'], { armor: 0.3 }], [['shield', 'quake']], [['burn', 'charge']]),
      ahnB('Flammenzunge Ignara', 3, '#ff4a8a', 1, 'flammen', 'Tanzt für mich im Feuer!', [['burn']], [['snipe', 'mark']], [['frenzy', 'chain', 'burn']]),
      ahnB('Aschefürst', 8, '#9a9aa8', 1.05, 'asche', 'Alles wird zu Asche. Auch ihr.', [['curse']], [['blind', 'burn']], [['summon', 'heal']]),
      ahnB('Höllenhund Kerberos', 3, '#e5484d', 1.1, 'flammen', 'Drei Köpfe, drei Mal so hungrig.', [['charge', 'frenzy']], [['drain']], [['split', 'frenzy'], { haste: 1.3 }]),
    ] },
    { name: 'Frostkamm', env: 4, minion: 'golem', col: '#9fd0ff', desc: 'Eisige Winde, die jede Bewegung schwer machen.', bosses: [
      ahnB('Eisjungfer Skadi', 4, '#bfe8ff', 0.95, 'schnee', 'Erstarrt in Ehrfurcht.', [['freeze']], [['snipe', 'shield']], [['rain', 'freeze']]),
      ahnB('Gletscherbrecher', 4, '#6e8ba3', 1.15, 'schnee', 'Berge weichen mir aus.', [['slam']], [[], { armor: 0.35 }], [['quake', 'charge']]),
      ahnB('Schneesturmgeist', 14, '#e8f4ff', 1, 'schnee', 'Ich bin der Wind, den ihr nicht seht.', [['chain']], [['blind', 'freeze']], [['vanish', 'rain']]),
      ahnB('Kristallmatriarchin', 9, '#9fd0ff', 1, 'kristalle', 'Meine Kinder sind überall.', [['summon']], [['reflect', 'shield']], [['split', 'reflect']]),
      ahnB('Der Weiße Wyrm', 13, '#f0faff', 1.05, 'schnee', 'Mein Atem ist der ewige Winter.', [['freeze', 'rain']], [['charge', 'mark']], [['quake', 'freeze', 'frenzy']]),
    ] },
    { name: 'Nebelsumpf', env: 5, minion: 'frosch', col: '#7ab87a', desc: 'Im Nebel verliert man den Weg. Und manchmal die Hoffnung.', bosses: [
      ahnB('Krötenkönig Quarg', 0, '#6aa84a', 1.1, 'blasen', 'Quaaark! Verbeugt euch!', [['summon']], [['poison', 'split']], [['heal', 'frenzy']]),
      ahnB('Moorhexe Grisla', 5, '#4a8a5a', 1, 'gift', 'Der Sumpf hat Hunger.', [['curse', 'poison']], [['silence']], [['mark', 'bomb']]),
      ahnB('Sumpfhydra', 13, '#3a8a6a', 1.05, 'gift', 'Schlagt einen Kopf ab, und es wachsen zwei.', [['rain']], [['heal', 'drain']], [['split', 'chain']]),
      ahnB('Irrlichtmutter', 12, '#c8ff9a', 1, 'irrlicht', 'Folgt dem Licht. Es führt euch heim.', [['blind']], [['vanish', 'snipe']], [['silence', 'chain', 'blind']]),
      ahnB('Der Ertrunkene', 12, '#4a7a9a', 1.05, 'geister', 'Das Wasser ist so still. Kommt näher.', [['drain']], [['stun', 'curse']], [['quake', 'poison']]),
    ] },
    { name: 'Dornenlabyrinth', env: 6, minion: 'dorn', col: '#ff6b9a', desc: 'Jeder Weg sticht. Jede Abkürzung auch.', bosses: [
      ahnB('Rosenkönigin Spina', 6, '#ff6b9a', 1, 'blueten', 'Schönheit hat ihren Preis.', [['reflect']], [['poison', 'snipe']], [['heal', 'reflect'], { armor: 0.2 }]),
      ahnB('Distelriese', 6, '#9a7ad8', 1.15, 'blueten', 'Ich bin größer als die Hecke.', [['slam'], { armor: 0.25 }], [['rain']], [['quake', 'frenzy']]),
      ahnB('Wurzelwürger', 11, '#6b4a2e', 1.05, 'blaetter', 'Ich halte euch fest. Für immer.', [['stun']], [['drain', 'summon']], [['stun', 'quake']]),
      ahnB('Gärtner des Verfalls', 5, '#a8a04a', 1, 'blueten', 'Alles, was blüht, muss welken.', [['summon']], [['curse', 'burn']], [['split', 'heal']]),
      ahnB('Dornendrache Spiral', 13, '#5a9a3a', 1, 'blueten', 'Meine Schuppen sind Stacheln.', [['charge']], [['rain', 'mark']], [['frenzy', 'burn', 'chain']]),
    ] },
    { name: 'Mitternachtskrypta', env: 7, minion: 'fleder', col: '#b06bff', desc: 'Hier herrscht ewige Nacht. Und sie hat Durst.', bosses: [
      ahnB('Gräfin Sanguina', 7, '#e5484d', 1, 'blut', 'Ein Tropfen nur. Oder zwei.', [['drain']], [['summon', 'vanish']], [['drain', 'frenzy', 'heal']]),
      ahnB('Schwarmfürst Nyx', 7, '#5a4a8a', 1, 'federn', 'Tausend Flügel, ein Wille.', [['rain']], [['blind', 'split']], [['chain', 'snipe']]),
      ahnB('Kryptawächter', 2, '#8a7aa8', 1.15, 'runen', 'Die Siegel bleiben verschlossen.', [['shield']], [['stun'], { armor: 0.3 }], [['quake', 'silence']]),
      ahnB('Seelenfänger Morn', 12, '#9a6be0', 1, 'geister', 'Eure Seelen glänzen so schön.', [['silence']], [['mark', 'curse']], [['vanish', 'bomb']]),
      ahnB('Der Blutmond', 7, '#ff2a4a', 1.1, 'blut', 'Wenn ich aufgehe, fällt jeder Held.', [['mark']], [['frenzy', 'drain']], [['split', 'quake', 'frenzy']]),
    ] },
    { name: 'Sternenwacht', env: 10, minion: 'astral', col: '#ffd27a', desc: 'Am Rand des Himmels prüfen die Sterne selbst eure Stärke.', bosses: [
      ahnB('Kometenreiter', 10, '#ffb547', 1, 'sterne', 'Ich falle schneller, als ihr schaut.', [['rain']], [['charge', 'burn']], [['bomb', 'frenzy']]),
      ahnB('Nebulara', 10, '#c08cff', 1, 'sterne', 'Ich bin aus Sternenstaub geboren.', [['blind']], [['silence', 'heal']], [['vanish', 'chain']]),
      ahnB('Sternenschmied', 8, '#ffd23f', 1.1, 'funken', 'Ich schmiede Sterne. Ihr seid nur Funken.', [['shield', 'slam']], [['bomb'], { armor: 0.3 }], [['quake', 'rain']]),
      ahnB('Zeitweber Chronos', 14, '#9fd0ff', 1.05, 'runen', 'Eure Zeit ist längst abgelaufen.', [['silence']], [['freeze', 'mark']], [['stun', 'silence', 'frenzy']]),
      ahnB('Leere-Titan', 14, '#3a2a6a', 1.15, 'leere', 'Hinter mir ist nichts. Nicht einmal Licht.', [['curse']], [['reflect', 'drain']], [['split', 'quake', 'blind']]),
    ] },
    { name: 'Halle der Ahnen', env: 'ahnen', minion: 'geist', col: '#ffd27a', desc: 'Die Echos der ersten Helden warten. Und hinter ihnen der Urahn.', bosses: [
      ahnB('Echo des Ersten Ritters', 2, '#ffd27a', 1.1, 'echo', 'Ich stand hier, bevor es euch gab.', [['charge', 'stun']], [['frenzy', 'slam']], [['split', 'quake']]),
      ahnB('Echo des Ewigen Wächters', 4, '#9fc8ff', 1.1, 'echo', 'Kein Schlag kommt an mir vorbei.', [['shield'], { armor: 0.2 }], [['reflect']], [['quake', 'shield', 'heal']]),
      ahnB('Echo der Sternenschützin', 5, '#a8f0b0', 1, 'echo', 'Ich verfehle nie.', [['snipe', 'rain']], [['mark', 'vanish']], [['chain', 'rain', 'frenzy']]),
      ahnB('Echo des Erzmagiers', 12, '#d8b8ff', 1.05, 'echo', 'Jeder Zauber, den ihr kennt, stammt von mir.', [['bomb', 'burn']], [['silence', 'chain']], [['freeze', 'blind', 'bomb']]),
      ahnB('Echo der Lichtpriesterin', 10, '#fff2b0', 1, 'echo', 'Ich heile. Aber nicht euch.', [['heal', 'curse']], [['summon', 'shield']], [['heal', 'silence', 'reflect']]),
    ] },
  ];
  // Drachen mit eigenem Bild statt eingefärbtem Grundbild
  const AHN_ART = { 'Knochendrache Ossar': 'bone', 'Der Weiße Wyrm': 'frost', 'Sumpfhydra': 'hydra', 'Dornendrache Spiral': 'thorn' };
  AHN_MISSIONS.forEach(M => M.bosses.forEach(d => { if (AHN_ART[d.name]) d.art = AHN_ART[d.name]; }));
  const AHNE = { name: 'Der Urahn', ahne: true, bk: -1, tint: null, sz: 1, acc: 'ahne', quote: 'Ihr wollt das Siegel? Dann zeigt mir, dass ihr meiner würdig seid.',
    ph: [{ n: 'Der König erwacht', a: ['slam', 'charge', 'summon'], t: {} }, { n: 'Klingen der Ahnen', a: ['rain', 'mark', 'shield'], t: { armor: 0.1 } }, { n: 'Flamme der Ewigkeit', a: ['quake', 'frenzy', 'chain', 'split'], t: { armor: 0.1, haste: 1.15 } }] };
  // ---------- Segen der Ahnen ----------
  // Nach jedem besiegten Boss (einmal pro Boss und Prüfung) wählt man einen von drei Segen. Sie gelten für die ganze Prüfung
  // (alle 10 Missionen bis zum Siegel), aber nur in der Ahnenprüfung. Mit dem Siegel beginnt die nächste Prüfung ohne Segen.
  // all: für alle Helden, hero: stark für einen Helden, mech: verbessert Schildwall oder Schwachstellen. v = Wert in Prozent(punkten).
  const AHN_BOONS = {
    dmg: { name: 'Ahnenkraft', icon: '⚔', kind: 'all', v: 10, desc: v => `Alle Helden machen +${v} % Schaden.` },
    hp: { name: 'Ahnenhaut', icon: '❤', kind: 'all', v: 12, desc: v => `Alle Helden haben +${v} % Leben.` },
    aps: { name: 'Eile der Ahnen', icon: '⏩', kind: 'all', v: 8, desc: v => `Alle Helden greifen ${v} % schneller an.` },
    crit: { name: 'Scharfe Klingen', icon: '✦', kind: 'all', v: 5, desc: v => `Alle Helden +${v} % Krit-Chance.` },
    cdr: { name: 'Zeitfluss', icon: '⌛', kind: 'all', v: 6, desc: v => `Abklingzeiten aller Helden −${v} %. Gilt auch über die Grenze von 60 % hinaus.` },
    dr: { name: 'Steinhaut', icon: '🛡', kind: 'all', v: 5, desc: v => `Alle Helden nehmen ${v} % weniger Schaden. Gilt auch über die normale Grenze hinaus (bis 90 %).` },
    regen: { name: 'Lebensquelle', icon: '✚', kind: 'all', v: 0.6, desc: v => `Alle Helden heilen ${String(v).replace('.', ',')} % ihres Lebens pro Sekunde.` },
    act: { name: 'Fähigkeitsmacht', icon: '💥', kind: 'all', v: 15, desc: v => `Fähigkeiten aller Helden +${v} % Schaden.` },
    h_dmg: { name: 'Erwählter', icon: '⚔', kind: 'hero', v: 40, desc: (v, n) => `${n} macht +${v} % Schaden.` },
    h_hp: { name: 'Bollwerk', icon: '❤', kind: 'hero', v: 50, desc: (v, n) => `${n} hat +${v} % Leben.` },
    h_aps: { name: 'Raserei', icon: '⏩', kind: 'hero', v: 25, desc: (v, n) => `${n} greift ${v} % schneller an.` },
    h_cdr: { name: 'Zeitmeister', icon: '⌛', kind: 'hero', v: 15, desc: (v, n) => `Abklingzeiten von ${n} −${v} %. Gilt auch über die Grenze von 60 % hinaus.` },
    h_crit: { name: 'Todesblick', icon: '✦', kind: 'hero', v: 15, desc: (v, n) => `${n} +${v} % Krit-Chance und +${v * 2} % Krit-Schaden.` },
    wall: { name: 'Ahnenschild', icon: '🛡', kind: 'mech', v: 25, desc: v => `Der Schildwall lädt ${v} % schneller.` },
    wallA: { name: 'Wachsamkeit', icon: '👁', kind: 'mech', v: 20, desc: v => `Der automatische Schildwall blockt ${v} % mehr vom Großangriff.` },
    spot: { name: 'Ahnenblick', icon: '🎯', kind: 'mech', v: 50, desc: v => `Treffer auf Schwachstellen machen +${v} % Schaden.` },
    spotF: { name: 'Jägerauge', icon: '🔍', kind: 'mech', v: 20, desc: v => `Schwachstellen erscheinen ${v} % öfter.` },
  };
  const AHN_BOON_W = { all: 5, hero: 3, mech: 2 };
  // Drei verschiedene Segen zur Auswahl; einer kann ein glänzender (doppelter Wert) sein
  function ahnRollBoons(S, run) {
    const ids = Object.keys(AHN_BOONS), out = [], field = run.order.filter(k => st0(S)[k]);
    while (out.length < 3) {
      const tot = ids.reduce((a, id) => a + (out.some(o => o.id === id) ? 0 : AHN_BOON_W[AHN_BOONS[id].kind]), 0);
      let r = Math.random() * tot, id = ids[0];
      for (const x of ids) { if (out.some(o => o.id === x)) continue; r -= AHN_BOON_W[AHN_BOONS[x].kind]; if (r <= 0) { id = x; break; } }
      const B = AHN_BOONS[id], gold = Math.random() < 0.15, o = { id, v: B.v * (gold ? 2 : 1), gold };
      if (B.kind === 'hero') o.h = field[Math.floor(Math.random() * field.length)] || run.order[0];
      out.push(o);
    }
    return out;
  }
  const st0 = S => Object.fromEntries(HEROES.map(h => [h.id, hired(S, h.tree)]));
  const ahnBoonText = b => { const B = AHN_BOONS[b.id]; return B ? B.desc(b.v, b.h ? HERO_BY_ID[b.h].name : '') : ''; };
  function ahnPickBoon(S, run, i) {
    const o = run.boonOffer && run.boonOffer[i]; if (!o) return null;
    S.ahn.boons.push({ id: o.id, v: o.v, ...(o.h ? { h: o.h } : {}) });
    run.boonOffer = null; run.pause = false;
    return o;
  }
  // Segen auf die Werte anwenden (nur in der Ahnenprüfung)
  function ahnApplyBoons(S, st) {
    const M = { wallCd: 1, wallA: 0, spotDmg: 1, spotF: 1 }, sum = {};
    // gleiche Segen werden zusammengezählt (zwei Mal +10 % Schaden = +20 %, nicht ×1,21)
    for (const b of (S.ahn && S.ahn.boons) || []) { if (!AHN_BOONS[b.id]) continue; const key = b.id + '|' + (b.h || ''); sum[key] = (sum[key] || 0) + b.v / 100; }
    for (const [key, f] of Object.entries(sum)) {
      const [id, hid] = key.split('|'), B = AHN_BOONS[id];
      const ts = B.kind === 'hero' ? [st[hid]].filter(Boolean) : HEROES.map(h => st[h.id]).filter(Boolean);
      for (const T of ts) switch (id) {
        case 'dmg': case 'h_dmg': T.atk *= 1 + f; if (T.heal) T.heal *= 1 + f; if (T.wolfAtk) T.wolfAtk *= 1 + f; break;
        case 'hp': case 'h_hp': T.hp *= 1 + f; break;
        case 'aps': case 'h_aps': T.aps *= 1 + f; if (T.wolfAps) T.wolfAps *= 1 + f; if (T.turretAps) T.turretAps *= 1 + f; break;
        case 'crit': T.crit += f; break;
        case 'h_crit': T.crit += f; T.critD += f * 2; break;
        case 'cdr': case 'h_cdr': T.cdr = Math.min(0.85, T.cdr + f); break;
        case 'dr': T.dr = Math.min(0.9, T.dr + f); break;
        case 'regen': T.regen += f; break;
        case 'act': T.actMul *= 1 + f; break;
      }
      if (id === 'wall') M.wallCd *= Math.max(0.3, 1 - f);
      if (id === 'wallA') M.wallA += f;
      if (id === 'spot') M.spotDmg += f;
      if (id === 'spotF') M.spotF *= 1 + f;
    }
    st.ahnB = M;
  }
  const AHN_COUNT = AHN_MISSIONS.length;
  const ahnOpen = S => feature(S, 'ahnen');
  const ahnLike = run => !!run && (run.mode === 'ahnen' || run.mode === 'bounty');
  const ahnBossesOf = mi => (mi === AHN_COUNT - 1 ? [...AHN_MISSIONS[mi].bosses, AHNE] : AHN_MISSIONS[mi].bosses);
  const ahnLevelFor = S => Math.max(10, Math.round(AHN_TUNE.lvl * Math.max(S.ascBest || 0, S.best || 0, 10)));
  function ahnFix(d) {
    const a = d && typeof d === 'object' ? d : {}, n = x => Math.max(0, Math.floor(Number(x) || 0));
    const out = { m: Math.min(AHN_COUNT - 1, n(a.m)), lvl: n(a.lvl), sig: n(a.sig), got: n(a.got), place: {}, boons: [], bgot: [] };
    for (const b of Array.isArray(a.boons) ? a.boons.slice(0, 80) : []) if (b && AHN_BOONS[b.id] && Number(b.v) > 0) { const o = { id: b.id, v: Math.min(1000, Number(b.v)) }; if (AHN_BOONS[b.id].kind === 'hero') { if (!HERO_BY_ID[b.h]) continue; o.h = b.h; } out.boons.push(o); }
    for (const k of Array.isArray(a.bgot) ? a.bgot.slice(0, 80) : []) if (/^\d+-\d+$/.test(String(k))) out.bgot.push(String(k));
    for (const h of HEROES) if (a.place && a.place[h.id]) out.place[h.id] = 1;
    return out;
  }
  function placeSigil(S, hid) {
    if (!HERO_BY_ID[hid] || S.ahn.place[hid] || S.ahn.sig <= 0) return false;
    S.ahn.sig--; S.ahn.place[hid] = 1; return true;
  }
  function ahnInit(S, run) {
    S.ahn.lvl = ahnLevelFor(S);
    run.stage = run.startStage = S.ahn.lvl;
    run.ahn = { mi: S.ahn.m, bi: 0, wave: 0, boss: null, fx: [], banner: null, big: null, spot: null, spotFx: null, wallFx: null, bigs: 0, blocked: 0, spots: 0 };
    run.swT = 0; run.swCd = 0;
  }
  function ahnMinion(run, i, ranged, mul = 1) {
    const e = makeEnemy(run.stage, i, false, false, run, ranged);
    e.type = AHN_MISSIONS[run.ahn.mi].minion; e.hp *= AHN_TUNE.minHp * mul; e.max = e.hp;
    return e;
  }
  function ahnSpawn(run) {
    const A = run.ahn, list = A.list || ahnBossesOf(A.mi);
    run.enemies = [];
    if (A.wave < AHN_TUNE.waves) { for (let i = 0; i < 4; i++) run.enemies.push(ahnMinion(run, i, i === 3)); return; }
    const def = list[A.bi], e = makeEnemy(run.stage, 1.2, true, false, run);
    // spätere Missionen sind härter (gleicht die gesammelten Segen aus)
    const ms = A.noScale ? 0 : A.mi, hpMul = AHN_TUNE.hp * AHN_TUNE.len * (def.ahne ? AHN_TUNE.ahneHp : 1) * (1 + AHN_TUNE.mHp * ms) * (A.hpMul || 1);
    e.hp *= hpMul; e.max = e.hp; e.adm = e.dmg * AHN_TUNE.dmg * (1 + AHN_TUNE.mDmg * ms); e.dmg = e.adm * AHN_TUNE.atk; e.lastHp = e.hp;
    e.ahn = def; e.bk = def.bk; e.type = def.bk >= 0 && def.bk < 5 ? ENEMY_KINDS[def.bk] : AHN_MISSIONS[A.mi].minion;
    e.bigT = 6; e.spotT = 3;
    e.reach = def.ahne ? 62 : 30; e.phase = 0; e.phaseT = 0; e.shieldHp = 0; e.invT = 0; e.reflT = 0; e.healT = 0; e.frenzyT = 0; e.x = 600;
    ahnPhase(e, 0);
    A.boss = e; A.banner = { t: def.ahne ? 5 : 3.2, title: def.name, sub: def.quote, ahne: !!def.ahne };
    if (def.ahne) run.introT = 3.4;
    run.enemies.push(e);
  }
  function ahnPhase(e, p) {
    const P = e.ahn.ph[p];
    e.phase = p; e.phaseT = 0; e.traits = P.t || {};
    e.ab = P.a.filter(id => !AHN_ABIL[id].start).map((id, i) => ({ id, t: 2.5 + i * 1.8 }));
    e.rate = 1.6 * (e.traits.haste ? 1 / e.traits.haste : 1);
  }
  const aliveHeroes = run => run.order.filter(k => run.h[k].alive);
  function ahnCast(S, st, run, c, e, id) {
    const D = e.adm || e.dmg, A = run.ahn, al = aliveHeroes(run); if (!al.length) return;
    const fk = al[0], back = al[al.length - 1], rnd = () => al[Math.floor(Math.random() * al.length)];
    const hurt = (k, m) => hurtHero(c, k, D * m, null);
    c.efloat(e, AHN_ABIL[id].name, '#ffd27a', 15); e.castT = 0.8; e.castId = id;
    switch (id) {
      case 'slam': A.fx.push({ kind: 'slam', t: AHN_ABIL.slam.tele, d: AHN_ABIL.slam.tele }); break;
      case 'quake': al.forEach(k => { hurt(k, 0.4); run.h[k].stunT = Math.max(run.h[k].stunT || 0, 1); }); run.shake = 0.35; A.fx.push({ kind: 'quake', t: 0.6, d: 0.6 }); break;
      case 'snipe': hurt(back, 1.6); run.eshots.push({ x: e.x - 20, y: 150, tx: run.pos[back], ty: 175, t: 0, d: 0.3, k: back, dmg: 0, kind: 'sturm' }); break;
      case 'rain': for (let i = 0; i < 6; i++) { const k = rnd(); run.eshots.push({ x: e.x - 10, y: 120, tx: run.pos[k], ty: 180, t: -i * 0.12, d: 0.6, k, dmg: D * 0.35, kind: e.type }); } break;
      case 'bomb': { const k = rnd(); A.fx.push({ kind: 'bomb', k, t: 3, d: 3 }); break; }
      case 'summon': for (let i = 0; i < 2; i++) { const m = ahnMinion(run, 0, false, 0.6); m.x = e.x - 40 - i * 30; run.enemies.push(m); } c.burst(e.x - 40, 190, '#c9a6ff', 12); break;
      case 'shield': e.shieldHp = Math.max(e.shieldHp, e.max * 0.03); break;
      case 'reflect': e.reflT = 4; break;
      case 'heal': e.healT = 5; break;
      case 'stun': hurt(fk, 1); run.h[fk].stunT = Math.max(run.h[fk].stunT || 0, 2.5); break;
      case 'poison': al.forEach(k => { run.h[k].dotT = 6; run.h[k].dotP = 0.012; }); A.fx.push({ kind: 'poison', t: 6, d: 6 }); break;
      case 'curse': run.curseT = 7; break;
      case 'silence': for (const id2 of S.equip) run.cds[id2] = (run.cds[id2] || 0) + 4; run.silT = 1.2; break;
      case 'frenzy': e.frenzyT = 5; break;
      case 'mark': { const k = rnd(); run.h[k].markT = 6; break; }
      case 'charge': hurt(fk, 1.6); run.h[fk].stunT = Math.max(run.h[fk].stunT || 0, 1); e.lunge = 0.5; run.shake = 0.3; break;
      case 'drain': { hurt(fk, 0.8); e.hp = Math.min(e.max * (3 - e.phase) / 3, e.hp + e.max * 0.006); e.lastHp = e.hp; A.fx.push({ kind: 'drain', k: fk, t: 0.8, d: 0.8 }); break; }
      case 'freeze': run.slowT = 5; break;
      case 'blind': run.blindT = 5; break;
      case 'vanish': e.invT = 2; e.x += 40; break;
      case 'burn': A.fx.push({ kind: 'burn', t: 6, d: 6, dps: D * 0.15 }); break;
      case 'chain': { const ks = [...al].sort(() => Math.random() - 0.5).slice(0, 3); ks.forEach(k => hurt(k, 0.7)); A.fx.push({ kind: 'chain', ks, t: 0.5, d: 0.5 }); break; }
      case 'split': for (let i = 0; i < 2; i++) { const m = makeEnemy(run.stage, 0, false, true, run); m.type = e.type; m.hp = m.max = e.max * 0.06 / AHN_TUNE.len; m.dmg = D * 0.35; m.x = e.x - 30 - i * 26; m.echo = e.ahn.tint || '#ffd27a'; run.enemies.push(m); } c.burst(e.x, 170, e.ahn.tint || '#ffd27a', 16); break;
    }
  }
  // Wird jeden Schritt in der Ahnenprüfung aufgerufen
  function ahnStep(S, st, run, c, dt) {
    const A = run.ahn;
    for (const k of run.order) {
      const h = run.h[k]; if (!h.alive) continue;
      if (h.stunT > 0) h.stunT -= dt; if (h.markT > 0) h.markT -= dt;
      if (h.dotT > 0) { h.dotT -= dt; h.hp -= st[k].hp * h.dotP * dt; if (h.hp <= 0) { h.hp = 1; hurtHero(c, k, 2, null); } }
    }
    const rdt = dt / Math.max(1, S.speed || 1), MB = st.ahnB || { wallCd: 1, wallA: 0, spotDmg: 1, spotF: 1 };
    // Schildwall: von Hand (Knopf) oder automatisch beim Großangriff
    run.swCd -= dt; if (run.swT > 0) run.swT -= rdt;
    if (run.swReq) { run.swReq = false; if (run.swCd <= 0 && aliveHeroes(run).length) { run.swT = AHN_MECH.wallReal; run.swCd = AHN_MECH.wallCd * MB.wallCd; A.wallFx = { t: 0.5 }; c.float(run.order[0], 'Schildwall!', '#ffd27a', 15); } }
    if (A.wallFx) { A.wallFx.t -= rdt; if (A.wallFx.t <= 0) A.wallFx = null; }
    if (A.spotFx) { A.spotFx.t -= rdt; if (A.spotFx.t <= 0) A.spotFx = null; }
    // Großangriff: Vorwarnung in echten Sekunden, dann Treffer auf alle Helden
    if (A.big) { A.big.t -= rdt; if (A.big.t <= 0) {
      const manual = run.swT > 0, auto = !manual && run.swCd <= 0;
      const block = manual ? AHN_MECH.wallBlock : auto ? Math.min(0.9, AHN_MECH.wallAuto + MB.wallA) : 0;
      if (auto) { run.swCd = AHN_MECH.wallCd * MB.wallCd; A.wallFx = { t: 0.5 }; }
      A.bigs++; if (manual) A.blocked++;
      const f = AHN_MECH.bigDmg * (1 - block);
      for (const k of aliveHeroes(run)) { const T = st[k], raw = T.hp * f / Math.max(0.1, 1 - T.dr); hurtHero(c, k, raw, null); }
      c.float(run.order[0], manual ? 'Abgewehrt!' : auto ? 'Halb abgewehrt' : 'Volltreffer!', manual ? '#9fe8ff' : auto ? '#ffd27a' : '#ff6a5a', 16);
      run.shake = manual ? 0.2 : 0.55; c.burst(run.frontX, 200, manual ? '#9fe8ff' : '#ff6a3a', manual ? 14 : 26);
      A.big = null; A.bigHit = { t: 0.6, manual };
    } }
    if (A.bigHit) { A.bigHit.t -= rdt; if (A.bigHit.t <= 0) A.bigHit = null; }
    // Schwachstelle: antippen (Anfrage aus der Oberfläche) macht viel Schaden und betäubt
    if (A.spot) { A.spot.t -= rdt; if (A.spot.t <= 0) A.spot = null; }
    if (run.spotReq) { run.spotReq = false; const b = A.boss; if (A.spot && b && b.hp > 0) {
      const dmg = b.max * AHN_MECH.spotDmg * MB.spotDmg; b.spotDmg = (b.spotDmg || 0) + dmg; b.stun = Math.max(b.stun || 0, AHN_MECH.spotStun);
      c.efloat(b, 'Schwachstelle! ' + fmt(dmg), '#ffe066', 18); c.burst(b.x + A.spot.dx, 222 + A.spot.dy, '#ffe066', 22); run.shake = 0.35;
      A.spotFx = { t: 0.5, x: b.x + A.spot.dx, y: 222 + A.spot.dy }; A.spot = null; A.spots++; sfx('boss'); } }
    run.curseT -= dt; run.slowT -= dt; run.blindT -= dt; run.silT -= dt; if (run.introT > 0) run.introT -= rdt;
    if (A.banner) { A.banner.t -= rdt; if (A.banner.t <= 0) A.banner = null; }
    // Effekte mit Verzögerung
    for (const f of A.fx) {
      f.t -= dt;
      if (f.kind === 'burn') aliveHeroes(run).forEach(k => { const h = run.h[k]; h.hp -= f.dps * dt * (1 - st[k].dr * 0.6); if (h.hp <= 0) { h.hp = 1; hurtHero(c, k, 2, null); } });
      if (f.t <= 0 && !f.done) {
        f.done = true;
        const D = A.boss ? A.boss.adm || A.boss.dmg : 0;
        if (f.kind === 'slam') { aliveHeroes(run).forEach(k => hurtHero(c, k, D * 0.9, null)); run.shake = 0.4; c.burst(run.frontX, 210, '#ffb070', 18); }
        if (f.kind === 'bomb' && run.h[f.k] && run.h[f.k].alive) { hurtHero(c, f.k, D * 1.8, null); aliveHeroes(run).filter(k => k !== f.k).forEach(k => hurtHero(c, k, D * 0.4, null)); c.burst(run.pos[f.k], 180, '#ff9a3d', 20); run.shake = 0.3; }
      }
    }
    A.fx = A.fx.filter(f => f.t > -0.3);
    const e = A.boss;
    if (!e || e.hp <= 0 && e.phase >= 2) return;
    // Schaden am Boss: Schild, Panzerung, Spiegelhaut, Unverwundbarkeit
    const lost = (e.lastHp || e.hp) - e.hp;
    if (lost > 0) {
      let back = 0;
      if (e.invT > 0 || (run.introT > 0)) back = lost;
      else {
        if (e.shieldHp > 0) { const a = Math.min(e.shieldHp, lost); e.shieldHp -= a; back += a; if (e.shieldHp <= 0) c.efloat(e, 'Schild gebrochen!', '#9fd0ff', 16); }
        if (e.traits.armor) back += (lost - back) * e.traits.armor;
        if (e.reflT > 0) { const fk = frontHero(run); if (fk) hurtHero(c, fk, Math.min((lost - back) * 0.25, st[fk].hp * 0.12 * dt), null); } // höchstens 12 % Leben pro Sekunde
      }
      e.hp += back;
    }
    if (e.spotDmg) { e.hp -= e.spotDmg; e.spotDmg = 0; }
    // Phasen bei 2/3 und 1/3
    const thr = (2 - e.phase) / 3;
    if (e.phase < 2 && e.hp <= e.max * thr) {
      e.hp = e.max * thr; ahnPhase(e, e.phase + 1); e.invT = 1.4; run.shake = 0.4;
      const P = e.ahn.ph[e.phase];
      A.banner = { t: 2.4, title: `Phase ${e.phase + 1}`, sub: P.n || P.a.map(id => AHN_ABIL[id].name).join(' · '), phase: true };
      P.a.filter(id => AHN_ABIL[id].start).forEach(id => ahnCast(S, st, run, c, e, id));
      sfx('boss');
    }
    e.lastHp = e.hp;
    e.invT -= dt; e.reflT -= dt; e.frenzyT -= dt; e.castT = (e.castT || 0) - dt; e.lunge = Math.max(0, (e.lunge || 0) - dt);
    if (e.healT > 0) { e.healT -= dt; e.hp = Math.min(e.max * (3 - e.phase) / 3, e.hp + e.max * 0.0012 * dt); e.lastHp = e.hp; }
    if (e.traits.regen) { e.hp = Math.min(e.max * (3 - e.phase) / 3, e.hp + e.max * e.traits.regen / AHN_TUNE.len * dt); e.lastHp = e.hp; }
    e.atkMul = e.frenzyT > 0 ? 2 : 1;
    if (run.introT > 0 || e.stun > 0 || e.x > 470) return;
    // Wut, wenn eine Phase zu lange dauert
    e.phaseT += dt;
    const enr = AHN_TUNE.enr * AHN_TUNE.len, en = e.phaseT > enr ? 1 + 0.15 * Math.floor((e.phaseT - enr) / 8 + 1) : 1;
    if (en > (e.enrage || 1)) { e.enrage = en; c.efloat(e, `Wut ×${en.toFixed(1).replace('.', ',')}`, '#ff5a5a', 15); }
    for (const ab of e.ab) { ab.t -= dt; if (ab.t <= 0) { ahnCast(S, st, run, c, e, ab.id); ab.t = AHN_ABIL[ab.id].cd * AHN_TUNE.len * (0.85 + Math.random() * 0.3); } }
    e.bigT -= dt; if (e.bigT <= 0 && !A.big) { e.bigT = AHN_MECH.big * (0.9 + Math.random() * 0.2) * (e.phase >= 2 ? 0.8 : 1); A.big = { t: AHN_MECH.teleReal, d: AHN_MECH.teleReal }; c.efloat(e, 'Großangriff!', '#ff6a5a', 17); e.castT = 0.8; sfx('boss'); }
    e.spotT -= dt; if (e.spotT <= 0 && !A.spot) { e.spotT = AHN_MECH.spot / MB.spotF * (0.85 + Math.random() * 0.3); const sz = (e.ahn && e.ahn.sz) || 1; A.spot = { t: AHN_MECH.spotReal, d: AHN_MECH.spotReal, dx: (-10 + Math.random() * 30) * sz, dy: -(45 + Math.random() * 60) * sz }; }
  }
  // Welle geschafft: nächste Welle, nächster Boss oder Mission gewonnen
  function ahnNext(S, st, run, c) {
    const A = run.ahn, list = A.list || ahnBossesOf(A.mi);
    if (A.wave < AHN_TUNE.waves) A.wave++;
    else {
      const bk = `${A.mi}-${A.bi}`;
      if (run.mode === 'ahnen' && !S.ahn.bgot.includes(bk)) { S.ahn.bgot.push(bk); run.boonOffer = ahnRollBoons(S, run); run.pause = true; }
      A.bi++; A.wave = 0; A.boss = null; A.big = null; A.spot = null; run.bossKills++;
      if (A.bi >= list.length) { run.victory = true; run.dead = true; return 'dead'; }
      // Die Ahnen stärken die Gruppe zwischen den Bossen
      for (const k of run.order) { const h = run.h[k]; if (!h.alive) { h.alive = true; h.hp = st[k].hp * 0.35; h.revived = false; c.float(k, 'Ahnenkraft', '#ffd27a', 13); } else h.hp = Math.min(st[k].hp, h.hp + st[k].hp * 0.4); h.stunT = 0; h.markT = 0; h.dotT = 0; }
      A.fx = []; run.curseT = 0; run.slowT = 0; run.blindT = 0;
    }
    for (const k of run.order) { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * 0.15); }
    spawnWave(run);
  }
  function ahnClaim(S, run) {
    if (!run.victory || !run.ahn) return null;
    const mi = run.ahn.mi;
    if (mi !== S.ahn.m) return null;
    if (mi >= AHN_COUNT - 1) { S.ahn.m = 0; S.ahn.lvl = 0; S.ahn.sig++; S.ahn.got++; S.ahn.boons = []; S.ahn.bgot = []; return { mission: mi, sigil: true }; }
    S.ahn.m = mi + 1; return { mission: mi, sigil: false };
  }

  /* ================= Sternenruf (Banner) ab dem 1. Aufstieg, Sonderbanner ab dem 2. ================= */
  // Währung: Sternkristalle (S.gem). Ein Ruf kostet 100, zehn Rufe 1000.
  // 5★ = die sechs Puzzle-Helden, 4★ = die sechs Grundhelden, 3★ = Runensplitter oder Heldensplitter.
  // Zwei Banner mit getrenntem Fortschritt:
  //  - Ewiger Himmel (Standard): alle Helden mit gleicher Chance, keiner ist hervorgehoben.
  //  - Sternenruf (Sonderbanner): alle 2 Wochen ein neuer hervorgehobener 5★. 50 % Chance auf ihn; verliert man das, ist der nächste 5★ garantiert er.
  // 5★ zu 0,6 %, ab Ruf 74 steigt die Chance stark, spätestens bei Ruf 90. 4★ spätestens alle 10 Rufe.
  const GACHA = { cost: 100, base5: 0.006, soft5: 74, step5: 0.06, hard5: 90, base4: 0.051, hard4: 10, refund5: 300, refund4: 40, consMax: 6, evtDays: 14 };
  const G_FIVE = ['a', 'n', 'b', 'd', 'e', 'o'], G_FOUR = ['r', 'w', 's', 'm', 'p', 't'];
  // Sternbilder: jeder Held hat eigene. s = Werte (mal bei MULK, sonst plus), x = besondere Wirkungen im Kampf
  //  cCd: Abklingzeit einer Fähigkeit mal Wert · cEcho: Chance, dass eine Fähigkeit (oder 'all') ein zweites Mal ausgelöst wird
  const MULK = new Set(['atk', 'hp', 'aps', 'heal', 'act', 'wolfAtk', 'wolfAps', 'minionMul', 'minionDur', 'turretMul', 'turretAps']);
  const CONS_H = {
    r: [
      { n: 'Klingenmeister', d: '+20 % Schaden', s: { atk: 0.2 } },
      { n: 'Lauter Schwur', d: 'Kriegsschrei hält 4 s länger', x: { cSchrei: 4 } },
      { n: 'Gestählt', d: '+25 % Leben und +6 % Schadensreduktion', s: { hp: 0.25, dr: 0.06 } },
      { n: 'Doppelschlag', d: '25 % Chance, dass ein Angriff zweimal trifft', s: { dbl: 0.25 } },
      { n: 'Wirbelsturm', d: 'Wirbelwind lädt 30 % schneller', x: { cCd: { wirbel: 0.7 } } },
      { n: 'Held der Legenden', d: 'Wirbelwind schlägt zweimal zu und jeder 5. Angriff wird zu einem kleinen Wirbel', x: { cEcho: { wirbel: 1 }, wmaster: 1 } },
    ],
    w: [
      { n: 'Fels in der Brandung', d: '+25 % Leben', s: { hp: 0.25 } },
      { n: 'Dornenpanzer', d: 'Wirft 30 % des erlittenen Schadens zurück', s: { thorns: 0.3 } },
      { n: 'Bollwerk', d: '+6 % Schadensreduktion und +5 % Blocken', s: { dr: 0.06, block: 0.05 } },
      { n: 'Erdstoß', d: 'Schildwall lädt 30 % schneller', x: { cCd: { w_wall: 0.7 } } },
      { n: 'Veteran', d: '+30 % Leben und +20 % Schaden', s: { hp: 0.3, atk: 0.2 } },
      { n: 'Unerschütterlich', d: 'Eiserne Haut schützt die ganze Gruppe (−30 % Schaden) und Vergeltung wirft doppelt so viel zurück', x: { cHautAll: 1, cRache: 1 } },
    ],
    s: [
      { n: 'Adlerauge', d: '+10 % Krit-Chance', s: { crit: 0.1 } },
      { n: 'Pfeilregen', d: 'Pfeilhagel schießt 4 Pfeile mehr', x: { cHagel: 4 } },
      { n: 'Ruhige Hand', d: '+20 % Schaden', s: { atk: 0.2 } },
      { n: 'Durchschlag', d: 'Pfeile durchbohren und treffen den Gegner dahinter mit 40 %', s: { pierce: 0.4 } },
      { n: 'Schnelle Sehne', d: '+15 % Angriffstempo', s: { aps: 0.15 } },
      { n: 'Doppelsehne', d: 'Jeder Angriff verschießt einen Pfeil mehr', s: { shots: 1 } },
    ],
    m: [
      { n: 'Arkane Gabe', d: '+20 % Schaden der Fähigkeiten', s: { act: 0.2 } },
      { n: 'Glutkern', d: 'Feuerbälle treffen Gegner daneben mit +20 % mehr Schaden', s: { splash: 0.2 } },
      { n: 'Gabelblitz', d: 'Kettenblitz springt auf 2 Gegner mehr', x: { cKette: 2 } },
      { n: 'Großmagier', d: '+25 % Schaden', s: { atk: 0.25 } },
      { n: 'Sternenfall', d: 'Meteor lädt 25 % schneller', x: { cCd: { m_meteor: 0.75 } } },
      { n: 'Doppelzauber', d: 'Jede Fähigkeit wird zweimal ausgelöst', x: { cEcho: { all: 1 } } },
    ],
    p: [
      { n: 'Sanfte Hände', d: '+20 % Heilung', s: { heal: 0.2 } },
      { n: 'Heiliger Schild', d: 'Schutzschild ist 30 % stärker', x: { cSchild: 0.3 } },
      { n: 'Gottvertrauen', d: '+25 % Leben', s: { hp: 0.25 } },
      { n: 'Auferstehung', d: 'Wiederbelebung lädt 40 % schneller', x: { cCd: { p_wieder: 0.6 } } },
      { n: 'Gnade', d: '+25 % Heilung und +10 % Chance auf doppelte Heilung', s: { heal: 0.25, crit: 0.1 } },
      { n: 'Heiligenschein', d: 'Jede Heilung der Priesterin heilt alle anderen Helden um 25 % davon mit', x: { cHalo: 0.25 } },
    ],
    t: [
      { n: 'Scharfe Fänge', d: '+25 % Schaden der Wölfe', s: { wolfAtk: 0.25 } },
      { n: 'Langer Ruf', d: 'Rudelruf hält 4 s länger', x: { cRudel: 4 } },
      { n: 'Wildes Blut', d: '+20 % Schaden und +15 % Leben', s: { atk: 0.2, hp: 0.15 } },
      { n: 'Zweiter Gefährte', d: 'Ein zweiter Wolf kämpft immer mit', s: { wolves: 1 } },
      { n: 'Großes Rudel', d: 'Rudelruf ruft 2 Wölfe mehr', s: { packBonus: 2 } },
      { n: 'Herr der Wölfe', d: 'Noch ein Wolf kämpft immer mit und alle Wölfe beißen 30 % schneller', s: { wolves: 1, wolfAps: 0.3 } },
    ],
    a: [
      { n: 'Schattenblick', d: '+10 % Krit-Chance', s: { crit: 0.1 } },
      { n: 'Giftklinge', d: '+40 % Krit-Schaden', s: { critD: 0.4 } },
      { n: 'Klingensturm', d: 'Kunaisturm wirft 4 Kunai mehr', x: { cSturm: 4 } },
      { n: 'Jägerin', d: '+25 % Schaden gegen Fernkämpfer', s: { rangedDmg: 0.25 } },
      { n: 'Tiefes Mal', d: 'Todesmal lässt das Ziel 15 % mehr Schaden nehmen', x: { cMal: 0.15 } },
      { n: 'Schattentanz', d: 'Jeder Angriff wirft ein Kunai mehr und Schattenschritt trifft 2 Ziele mehr', s: { shots: 1 }, x: { cSchatten: 2 } },
    ],
    n: [
      { n: 'Offene Gräber', d: '+1 Skelett gleichzeitig', s: { minionMax: 1 } },
      { n: 'Knochensplitter', d: 'Skelette machen 30 % mehr Schaden', s: { minionMul: 0.3 } },
      { n: 'Große Armee', d: 'Totenheer ruft 2 Skelette mehr', x: { cHeer: 2 } },
      { n: 'Ruf des Todes', d: '+10 % Chance, dass Besiegte aufstehen', s: { raise: 0.1 } },
      { n: 'Ewige Wacht', d: 'Skelette halten 50 % länger', s: { minionDur: 0.5 } },
      { n: 'Knochenkönig', d: '+2 Skelette gleichzeitig und alle Skelette machen doppelten Schaden', s: { minionMax: 2, minionMul: 1 } },
    ],
    b: [
      { n: 'Klare Stimme', d: 'Das Lied gibt allen +4 % Schaden mehr', s: { songAtk: 0.04 } },
      { n: 'Schneller Takt', d: 'Das Lied gibt allen +3 % Tempo mehr', s: { songAps: 0.03 } },
      { n: 'Zugabe', d: 'Kriegslied hält 3 s länger', x: { cKrieg: 3 } },
      { n: 'Schlaflied', d: 'Wiegenlied schläfert 1,5 s länger ein', x: { cWiegen: 1.5 } },
      { n: 'Hymne', d: 'Das Lied gibt allen +6 % Schaden mehr', s: { songAtk: 0.06 } },
      { n: 'Sternenchor', d: 'Kriegslied wirkt doppelt so stark und das Lied gibt allen +5 % Tempo mehr', s: { songAps: 0.05 }, x: { cKriegMul: 1 } },
    ],
    d: [
      { n: 'Borke', d: '+20 % Leben', s: { hp: 0.2 } },
      { n: 'Würgeranken', d: 'Ranken halten 1 s länger fest', x: { cRanken: 1 } },
      { n: 'Adlerschwarm', d: 'Adlerruf schickt 2 Adler mehr', x: { cAdler: 2 } },
      { n: 'Urbär', d: 'Bärengebrüll hält 3 s länger', x: { cBruell: 3 } },
      { n: 'Wildheit', d: '+20 % Schaden und +5 % Schadensreduktion', s: { atk: 0.2, dr: 0.05 } },
      { n: 'Mutter Natur', d: 'Jede Fähigkeit der Druidin heilt die ganze Gruppe um 6 %', x: { cNatur: 0.06 } },
    ],
    e: [
      { n: 'Feinmechanik', d: 'Geschütztürme machen 25 % mehr Schaden', s: { turretMul: 0.25 } },
      { n: 'Mehr Pulver', d: 'Streubomben wirft 3 Bomben mehr', x: { cStreu: 3 } },
      { n: 'Schnellfeuer', d: 'Geschütztürme feuern 20 % schneller', s: { turretAps: 0.2 } },
      { n: 'Zweiter Turm', d: 'Ein zweiter Geschützturm baut sich immer mit auf', s: { turrets: 1 } },
      { n: 'Sprengmeisterin', d: 'Bomben treffen Gegner daneben mit +20 % mehr Schaden', s: { splash: 0.2 } },
      { n: 'Meisterwerk', d: 'Geschütztürme machen doppelten Schaden und das gebaute Geschütz bleibt doppelt so lange', s: { turretMul: 1 }, x: { cTurm: 1 } },
    ],
    o: [
      { n: 'Granithaut', d: '+25 % Leben', s: { hp: 0.25 } },
      { n: 'Tiefe Glyphe', d: 'Schutzglyphe ist 30 % stärker', x: { cGlyphe: 0.3 } },
      { n: 'Bergkraft', d: '+20 % Schaden und +5 % Schadensreduktion', s: { atk: 0.2, dr: 0.05 } },
      { n: 'Runenkern', d: 'Runen im Golem wirken 15 % stärker', s: { runeSelf: 0.15 } },
      { n: 'Ewiger Wall', d: 'Runenwall hält 2 s länger', x: { cWall: 2 } },
      { n: 'Siebter Sockel', d: 'Der Golem kann eine Rune mehr einsetzen (jede Stufe, zählt nicht zum 3er-Set)', x: { cSock: 1 } },
    ],
  };
  const consList = id => CONS_H[id] || [];
  // Ewiger Himmel und Kopfgeldjagd ab dem 1. Aufstieg, das Sonderbanner ab dem 2. Aufstieg.
  // Sternkristalle sammelt man schon ab der 1. Wiedergeburt, damit beim Öffnen gleich gerufen werden kann.
  const gachaOpen = S => S.asc >= 1;
  const evtOpen = S => S.asc >= 2;
  const gemOpen = S => S.rebirths >= 1 || S.asc >= 1;
  const GIFT_PULLS = 10;
  const consOf = (S, id) => Math.max(0, Math.min(GACHA.consMax, Math.floor((S.cons && S.cons[id]) || 0)));
  // Sternbilder auf die Werte eines Helden legen (in stats())
  function consApply(T, id, n) {
    const L = consList(id);
    for (let i = 0; i < Math.min(n, L.length); i++) {
      const c = L[i];
      for (const [k, v] of Object.entries(c.s || {})) {
        if (k === 'act') T.actMul *= 1 + v; else if (MULK.has(k)) T[k] = (T[k] || 0) * (1 + v); else T[k] = (T[k] || 0) + v;
      }
      for (const [k, v] of Object.entries(c.x || {})) {
        if (v && typeof v === 'object') { T[k] = T[k] || {}; for (const [a, b] of Object.entries(v)) T[k][a] = k === 'cCd' ? (T[k][a] || 1) * b : Math.max(T[k][a] || 0, b); }
        else T[k] = (T[k] || 0) + v;
      }
    }
  }
  const weekNum = id => { const m = /(\d+)-W(\d+)/.exec(id || weekId()); return m ? Number(m[1]) * 53 + Number(m[2]) : 0; };
  // Sonderbanner: wechselt alle 2 Wochen am Montag. Zählung ab Montag, 5. Januar 1970.
  function evtPeriod(d = new Date()) {
    const day = (d.getDay() + 6) % 7, mon = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - day) / 864e5);
    const k = mon - 4, p = Math.floor(k / GACHA.evtDays), left = GACHA.evtDays - (k - p * GACHA.evtDays);
    return { p, end: new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + left) };
  }
  const EVT_NAME = { a: 'Klinge im Mondlicht', n: 'Ruf der Gruft', b: 'Ballade der Sterne', d: 'Herz der Wildnis', e: 'Zahnrad und Zunder', o: 'Erwachen der Runen' };
  function evtBanner(d = new Date()) {
    const P = evtPeriod(d), p = ((P.p % 6) + 6) % 6, five = G_FIVE[p];
    return { kind: 'evt', p: P.p, end: P.end, five, name: EVT_NAME[five], four: [0, 2, 4].map(i => G_FOUR[(p + i) % G_FOUR.length]), next: G_FIVE[(p + 1) % 6] };
  }
  // alter Name, wird noch von der Grafik benutzt
  const bannerOf = () => evtBanner();
  function gPity(d, evt) {
    const a = d && typeof d === 'object' ? d : {}, n = x => Math.max(0, Math.floor(Number(x) || 0));
    const o = { p5: Math.min(GACHA.hard5, n(a.p5)), p4: Math.min(GACHA.hard4, n(a.p4)), n: n(a.n) };
    if (evt) { o.g5 = !!a.g5; o.g4 = !!a.g4; }
    return o;
  }
  function gFix(d) {
    const a = d && typeof d === 'object' ? d : {};
    // alter Spielstand: es gab nur ein Banner mit Hervorhebung, sein Fortschritt geht an das Sonderbanner
    const old = !a.evt && !a.std && (a.p5 != null || a.n != null);
    return { evt: gPity(old ? a : a.evt, true), std: gPity(old ? null : a.std, false),
      gift: !!a.gift, bs: a.bs && Number.isFinite(Number(a.bs.p)) ? { p: Math.floor(Number(a.bs.p)), n: Math.max(0, Math.floor(Number(a.bs.n) || 0)) } : null,
      hist: (Array.isArray(a.hist) ? a.hist : []).slice(-60).filter(x => x && [3, 4, 5].includes(x.r)).map(x => ({ r: x.r, id: String(x.id || '').slice(0, 12), t: Math.max(0, Math.floor(Number(x.t) || 0)), b: x.b === 'std' ? 'std' : 'evt' })) };
  }
  // 3★: kleine Gegenstände, die für immer bleiben
  function gThree(S) {
    if (feature(S, 'runen') && Math.random() < 0.6) { const d = Math.max(5, shardOf(bossRuneTier(Math.max(S.best || 1, 10))) * 2); S.dust += d; return { kind: 'dust', n: d }; }
    if (S.exp) { S.exp.spl += 5; return { kind: 'spl', n: 5 }; }
    S.dust += 10; return { kind: 'dust', n: 10 };
  }
  function gHero(S, id, rar) {
    const h = HERO_BY_ID[id], out = { kind: 'hero', id, r: rar };
    // Noch nicht fertiger Puzzle-Held: jede Kopie bringt 3 fehlende Puzzleteile (2 Kopien = fertig)
    if (h.puzzle && !assembled(S, id)) {
      S.exp = S.exp || { spl: 0, done: 0, target: 'a', pieces: {} }; S.exp.pieces = S.exp.pieces || {};
      const have = pieceMask(S, id), miss = [0, 1, 2, 3, 4, 5].filter(i => !(have & (1 << i))).sort(() => Math.random() - 0.5).slice(0, 3);
      S.exp.pieces[id] = miss.reduce((m, i) => m | (1 << i), have); out.pieces = miss.length; out.have = pieceCount(S, id);
      if (assembled(S, id)) { puzzleHire(S, id); out.unlock = true; }
      return out;
    }
    S.cons = S.cons || {}; const c = consOf(S, id);
    if (c >= GACHA.consMax) { const g = rar === 5 ? GACHA.refund5 : GACHA.refund4; S.gem += g; out.refund = g; return out; }
    S.cons[id] = c + 1; out.cons = c + 1; out.consName = (consList(id)[c] || {}).n; return out;
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function gachaPull(S, count, bk = 'evt') {
    // Geschenk beim Öffnen: einmal 10 Rufe auf dem Ewigen Himmel gratis (der 10. ist sicher mindestens 4★)
    const gift = bk === 'gift';
    if (gift) { if (!gachaOpen(S) || (S.gacha && S.gacha.gift)) return null; bk = 'std'; count = GIFT_PULLS; }
    if (!gachaOpen(S) || !(count === 1 || count === 10) || (!gift && S.gem < GACHA.cost * count) || !['evt', 'std'].includes(bk) || (bk === 'evt' && !evtOpen(S))) return null;
    if (!gift) S.gem -= GACHA.cost * count; S.gacha = S.gacha && S.gacha.evt ? S.gacha : gFix(S.gacha); if (gift) S.gacha.gift = true;
    const G = S.gacha[bk], evt = bk === 'evt', B = evtBanner(), res = [];
    for (let i = 0; i < count; i++) {
      G.p5++; G.p4++; G.n++;
      const r5 = G.p5 >= GACHA.hard5 ? 1 : GACHA.base5 + (G.p5 >= GACHA.soft5 ? (G.p5 - GACHA.soft5 + 1) * GACHA.step5 : 0);
      let item;
      if (Math.random() < r5) {
        if (evt) { const feat = G.g5 || Math.random() < 0.5; G.g5 = !feat; item = gHero(S, feat ? B.five : pick(G_FIVE.filter(x => x !== B.five)), 5); item.feat = feat; }
        else item = gHero(S, pick(G_FIVE), 5);
        G.p5 = 0;
      } else if (G.p4 >= GACHA.hard4 || Math.random() < GACHA.base4) {
        if (evt) { const feat = G.g4 || Math.random() < 0.5; G.g4 = !feat; item = gHero(S, feat ? pick(B.four) : pick(G_FOUR.filter(x => !B.four.includes(x))), 4); item.feat = feat; }
        else item = gHero(S, pick(G_FOUR), 4);
        G.p4 = 0;
      } else item = { r: 3, ...gThree(S) };
      res.push(item);
      S.gacha.hist.push({ r: item.r, id: item.id || item.kind, t: Date.now(), b: bk }); if (S.gacha.hist.length > 60) S.gacha.hist.shift();
    }
    res.deco = evt ? bsetAdd(S, count) : [];
    return res;
  }
  // Quellen für Sternkristalle
  const GEM_SRC = { boss: 15, tripHour: 3, wbGoal: 50, bounty: [40, 60, 100] };
  // Erster Sieg über einen Boss (Stufe) seit der letzten Wiedergeburt
  function gemBossFirst(S, stage) {
    if (!gemOpen(S)) return 0;
    // gemerkt wird nur die höchste belohnte Boss-Stufe (spart Platz im Spielstand)
    if (stage <= (S.gBoss || 0)) return 0;
    S.gBoss = stage; S.gem += GEM_SRC.boss; return GEM_SRC.boss;
  }
  /* ================= Sammlung: Lager-Deko und Heldenteile ================= */
  // Alles hier ist nur Aussehen, ohne Boni. Jeder Gegenstand wird gestapelt (S.inv[id] = Anzahl),
  // damit man später doppelte Teile handeln oder verkaufen kann. Ein Teil an einem Helden belegt ein Exemplar.
  const RAR = ['', 'Gewöhnlich', 'Selten', 'Episch', 'Legendär'], RAR_COL = ['', '#b8b0c8', '#5aa8ff', '#c98aff', '#ffd23f'];
  const GEAR_SLOTS = [{ k: 'kopf', n: 'Kopf' }, { k: 'koerper', n: 'Oberteil' }, { k: 'beine', n: 'Beine' }];
  const TINTS = [
    { k: 'rubin', n: 'Rubin', col: '#e0404f' }, { k: 'smaragd', n: 'Smaragd', col: '#3fc46a' }, { k: 'saphir', n: 'Saphir', col: '#3f7fe8' }, { k: 'amethyst', n: 'Amethyst', col: '#9a5ae0' },
    { k: 'gold', n: 'Gold', col: '#f0b83a' }, { k: 'obsidian', n: 'Obsidian', col: '#3a3448' }, { k: 'frost', n: 'Frost', col: '#bfeaff' }, { k: 'rose', n: 'Rosen', col: '#ff8ac8' },
  ];
  const TINT_NOUN = { kopf: 'Kopf', koerper: 'Rüstung', beine: 'Beine' };
  // Jeder Held hat eigene Teile: 3 Färbungen (selten), ein episches und ein legendäres Set
  const HERO_SETS = {
    r: { tints: ['rubin', 'saphir', 'obsidian'], sets: [['drache', 3, 'Drachenritter', ['Drachenhelm', 'Drachenschuppen', 'Drachenklauen']], ['sonne', 4, 'Sonnenpaladin', ['Sonnenhelm', 'Sonnenrüstung', 'Sonnenschienen']]] },
    w: { tints: ['gold', 'smaragd', 'obsidian'], sets: [['turm', 3, 'Festungswächter', ['Turmhelm', 'Mauerpanzer', 'Steinstiefel']], ['frost', 4, 'Frostbollwerk', ['Eiskrone', 'Frostpanzer', 'Frosttritte']]] },
    s: { tints: ['rubin', 'saphir', 'gold'], sets: [['wald', 3, 'Waldläuferin', ['Blätterkapuze', 'Blättermantel', 'Wanderstiefel']], ['mond', 4, 'Mondjägerin', ['Mondsichel', 'Sternenumhang', 'Mondschritte']]] },
    m: { tints: ['smaragd', 'rubin', 'gold'], sets: [['feuer', 3, 'Feuermagier', ['Flammenhut', 'Glutrobe', 'Glutsaum']], ['kosmos', 4, 'Sternenweiser', ['Galaxienhut', 'Sternenrobe', 'Nebelsaum']]] },
    p: { tints: ['saphir', 'amethyst', 'smaragd'], sets: [['bluete', 3, 'Blütenpriesterin', ['Blütenkranz', 'Blütengewand', 'Blütensaum']], ['engel', 4, 'Erzengel', ['Engelsdiadem', 'Engelsflügel', 'Lichtsaum']]] },
    t: { tints: ['frost', 'obsidian', 'rubin'], sets: [['baer', 3, 'Bärenfell', ['Bärenkopf', 'Bärenpelz', 'Pelzstiefel']], ['geist', 4, 'Geisterwolf', ['Geisterwolfskopf', 'Geisterpelz', 'Geisterpfoten']]] },
    a: { tints: ['gold', 'smaragd', 'frost'], sets: [['nacht', 3, 'Nachtklinge', ['Silbermaske', 'Schattengurt', 'Schleichsohlen']], ['blutmond', 4, 'Blutmond', ['Oni-Maske', 'Blutbänder', 'Blutnebel']]] },
    n: { tints: ['rubin', 'amethyst', 'gold'], sets: [['knochen', 3, 'Knochenfürst', ['Schädelkrone', 'Rippenpanzer', 'Knochensaum']], ['seelen', 4, 'Seelenernter', ['Seelenfeuer', 'Seelenrobe', 'Seelennebel']]] },
    b: { tints: ['saphir', 'smaragd', 'obsidian'], sets: [['gaukler', 3, 'Gaukler', ['Narrenkappe', 'Rautenwams', 'Schnabelschuhe']], ['phoenix', 4, 'Phönixsänger', ['Phönixkrone', 'Phönixschwingen', 'Glutstiefel']]] },
    d: { tints: ['saphir', 'amethyst', 'gold'], sets: [['herbst', 3, 'Herbstdruidin', ['Herbstgeweih', 'Herbstgewand', 'Herbstlaub']], ['weltenbaum', 4, 'Weltenbaum', ['Lichtgeweih', 'Rankengewand', 'Wurzelsaum']]] },
    e: { tints: ['smaragd', 'amethyst', 'obsidian'], sets: [['dampf', 3, 'Dampfpionierin', ['Zahnradzylinder', 'Messingweste', 'Messingstiefel']], ['blitz', 4, 'Blitzschmiedin', ['Teslahelm', 'Spulenpanzer', 'Raketenstiefel']]] },
    o: { tints: ['saphir', 'rubin', 'gold'], sets: [['lava', 3, 'Lavagolem', ['Magmakrone', 'Lavakern', 'Glutfüße']], ['kristall', 4, 'Kristallkoloss', ['Kristallkrone', 'Kristallpanzer', 'Kristallfüße']]] },
  };
  const DECO_SLOTS = [{ k: 'zelt', n: 'Zelt' }, { k: 'feuer', n: 'Feuer' }, { k: 'banner', n: 'Banner' }, { k: 'himmel', n: 'Himmel' }, { k: 'tier', n: 'Tier' }, { k: 't1', n: 'Trophäe 1', type: 'troph' }, { k: 't2', n: 'Trophäe 2', type: 'troph' }, { k: 't3', n: 'Trophäe 3', type: 'troph' }];
  const decoType = slot => (/^t\d$/.test(slot) ? 'troph' : slot);
  const ITEMS = {};
  const addItem = o => (ITEMS[o.id] = o);
  for (const [h, D] of Object.entries(HERO_SETS)) GEAR_SLOTS.forEach((s, si) => {
    for (const tk of D.tints) { const t = TINTS.find(x => x.k === tk); addItem({ id: `g_${h}_${s.k}_${t.k}`, cat: 'gear', hero: h, slot: s.k, rar: 2, kind: 'tint', tint: t.k, n: `${t.n}-${TINT_NOUN[s.k]}`, col: t.col, src: 'chest' }); }
    for (const [k, rar, setName, parts] of D.sets) addItem({ id: `g_${h}_${s.k}_${k}`, cat: 'gear', hero: h, slot: s.k, rar, kind: 'set', set: k, setName, n: parts[si], src: 'chest' });
  });
  // Lager-Deko
  [['rot', 'Rotes Zelt', '#c8323e'], ['blau', 'Blaues Zelt', '#2f62c8'], ['gruen', 'Grünes Zelt', '#3f9a4a'], ['schwarz', 'Schwarzes Zelt', '#3a3448']].forEach(([k, n, col]) => addItem({ id: `d_zelt_${k}`, cat: 'deco', slot: 'zelt', rar: 2, kind: 'tint', col, n, src: 'chest' }));
  addItem({ id: 'd_zelt_pav', cat: 'deco', slot: 'zelt', rar: 3, kind: 'pav', n: 'Ritterpavillon', col: '#e0404f', src: 'chest' });
  [['blau', 'Geisterflamme', '#4fb8ff'], ['gruen', 'Giftfeuer', '#5be37d'], ['lila', 'Seelenfeuer', '#b06bff']].forEach(([k, n, col]) => addItem({ id: `d_feuer_${k}`, cat: 'deco', slot: 'feuer', rar: 2, kind: 'tint', col, n, src: 'chest' }));
  addItem({ id: 'd_feuer_stern', cat: 'deco', slot: 'feuer', rar: 4, kind: 'stern', n: 'Sternenfeuer', col: '#fff2b0', src: 'chest' });
  [['rot', 'Rotes Banner', '#c8323e'], ['blau', 'Blaues Banner', '#2f62c8']].forEach(([k, n, col]) => addItem({ id: `d_banner_${k}`, cat: 'deco', slot: 'banner', rar: 2, kind: 'plain', col, n, src: 'chest' }));
  [['gluehw', 'Glühwürmchen', 3], ['schnupp', 'Sternschnuppen', 3], ['schnee', 'Schneefall', 3], ['nordlicht', 'Nordlicht', 4]].forEach(([k, n, rar]) => addItem({ id: `d_himmel_${k}`, cat: 'deco', slot: 'himmel', rar, kind: k, n, src: 'chest' }));
  [['katze', 'Lagerkatze', 3], ['fuchs', 'Fuchs', 3], ['eule', 'Eule', 3], ['drache', 'Kleiner Drache', 4]].forEach(([k, n, rar]) => addItem({ id: `d_tier_${k}`, cat: 'deco', slot: 'tier', rar, kind: k, n, src: 'chest' }));
  // Trophäen: eine pro Feldzug-Boss, fallen selten
  const TROPHY_N = ['Schleimkrone', 'Goblin-Totem', 'Knochenschädel', 'Höllenhorn', 'Frostkristall', 'Hexenkessel', 'Dornenkeule', 'Vampirsarg', 'Magmaherz', 'Spinnenei',
    'Sternensplitter', 'Hirtenstab', 'Geisterlaterne', 'Drachenschädel', 'Sturmhorn'];
  TROPHY_N.forEach((n, i) => addItem({ id: `d_tr_${i}`, cat: 'deco', slot: 'troph', rar: 3, kind: 'troph', ti: i, n, src: 'boss', boss: i }));
  // Banner-Sets: zum Sonderbanner jedes Fünf-Sterne-Helden gibt es Banner, Feuer und Zelt
  const BSET_AT = [{ n: 10, slot: 'banner' }, { n: 30, slot: 'feuer' }, { n: 60, slot: 'zelt' }];
  const BSET_NAME = { banner: 'Banner', feuer: 'Feuer', zelt: 'Zelt' };
  for (const id of ['a', 'n', 'b', 'd', 'e', 'o']) for (const x of BSET_AT) addItem({ id: `d_${x.slot}_h${id}`, cat: 'deco', slot: x.slot, rar: 4, kind: 'hero', hero: id, n: `${BSET_NAME[x.slot]}: ${HERO_BY_ID[id].name}`, src: 'banner' });
  const itemOf = id => ITEMS[id] || null;
  const invN = (S, id) => Math.max(0, Math.floor((S.inv && S.inv[id]) || 0));
  function invAdd(S, id, n = 1) { if (!ITEMS[id]) return 0; S.inv = S.inv || {}; S.inv[id] = invN(S, id) + n; return S.inv[id]; }
  // Wie oft ein Gegenstand gerade benutzt wird (an Helden oder im Lager)
  function invUsed(S, id) {
    let n = 0;
    for (const g of Object.values(S.gear || {})) for (const v of Object.values(g || {})) if (v === id) n++;
    for (const v of Object.values(S.camp || {})) if (v === id) n++;
    return n;
  }
  const invFree = (S, id) => invN(S, id) - invUsed(S, id);
  function equipGear(S, hid, slot, id) {
    if (!HERO_BY_ID[hid] || !GEAR_SLOTS.some(s => s.k === slot)) return false;
    S.gear = S.gear || {}; const cur = (S.gear[hid] || {})[slot] || null;
    if (id) { const it = ITEMS[id]; if (!it || it.cat !== 'gear' || it.slot !== slot || it.hero !== hid) return false; if (cur !== id && invFree(S, id) < 1) return false; }
    S.gear[hid] = { ...(S.gear[hid] || {}) }; if (id) S.gear[hid][slot] = id; else delete S.gear[hid][slot];
    if (!Object.keys(S.gear[hid]).length) delete S.gear[hid];
    return true;
  }
  function setDeco(S, slot, id) {
    if (!DECO_SLOTS.some(s => s.k === slot)) return false;
    S.camp = S.camp || {}; const cur = S.camp[slot] || null;
    if (id) { const it = ITEMS[id]; if (!it || it.cat !== 'deco' || it.slot !== decoType(slot)) return false; if (cur !== id && invFree(S, id) < 1) return false; S.camp[slot] = id; }
    else delete S.camp[slot];
    return true;
  }
  // Albtraum-Truhen: nach jedem Boss ab Stufe 151 eine sichere Truhe. Alle Truhen sind gleich, der Inhalt wird beim Öffnen
  // mit festen Chancen gewürfelt: 0,1 % legendär, 1 % episch, 25 % selten, sonst Gold oder Seelen. Keine Steigerung mit der Tiefe.
  // Unter S.chest[1] liegen die neuen Truhen; S.chest[2..4] sind alte, schon gewürfelte Truhen und öffnen mit ihrer Seltenheit.
  const CHEST = { leg: 0.001, epic: 0.01, rare: 0.25 };
  function chestRoll(S) { S.chest = S.chest || {}; S.chest[1] = (S.chest[1] || 0) + 1; return 1; }
  const chestCount = S => [1, 2, 3, 4].reduce((a, r) => a + ((S.chest && S.chest[r]) || 0), 0);
  function chestRar() { const r = Math.random(); return r < CHEST.leg ? 4 : r < CHEST.leg + CHEST.epic ? 3 : r < CHEST.leg + CHEST.epic + CHEST.rare ? 2 : 1; }
  function openChest(S) {
    if (!S.chest) return null;
    const old = [4, 3, 2].find(r => S.chest[r] > 0);
    let rar;
    if (old) { S.chest[old]--; rar = old; } else if (S.chest[1] > 0) { S.chest[1]--; rar = chestRar(); } else return null;
    if (rar === 1) {
      const R = hoursReward(S, 0.25, 1);
      if (Math.random() < 0.6 || !R.souls) { const g = Math.max(1, R.gold); S.gold = Math.min(GOLD_MAX, S.gold + g); return { rar, kind: 'gold', n: g }; }
      const s = Math.max(1, R.souls); S.souls += s; S.tot.souls += s; return { rar, kind: 'souls', n: s };
    }
    const deco = Math.random() < (rar === 4 ? 0.25 : 0.35);
    let pool = Object.values(ITEMS).filter(x => x.rar === rar && x.src === 'chest' && x.cat === (deco ? 'deco' : 'gear') && (!x.hero || hired(S, HERO_BY_ID[x.hero].tree)));
    if (!pool.length) pool = Object.values(ITEMS).filter(x => x.rar === rar && x.src === 'chest');
    const it = pool[Math.floor(Math.random() * pool.length)], n = invAdd(S, it.id);
    return { rar, kind: 'item', id: it.id, dup: n > 1, n };
  }
  // Trophäe beim Boss-Sieg: kleine Chance, die mit jedem Boss ohne Trophäe etwas steigt
  const TROPHY = { base: 0.005, pity: 0.0008 };
  function trophyRoll(S, stage) {
    const P = S.pity = S.pity || {}; P.tro = P.tro || 0;
    if (Math.random() < TROPHY.base + P.tro * TROPHY.pity) { P.tro = 0; const id = `d_tr_${zoneOf(stage) % TROPHY_N.length}`; return { id, n: invAdd(S, id) }; }
    P.tro++; return null;
  }
  // Banner-Set: Rufe auf dem aktuellen Sonderbanner zählen; bei 10, 30 und 60 gibt es Banner, Feuer und Zelt des Helden
  function bsetCount(S) { const B = evtBanner(), x = S.gacha && S.gacha.bs; return x && x.p === B.p ? x.n : 0; }
  function bsetAdd(S, n) {
    const B = evtBanner(), G = S.gacha; if (!G.bs || G.bs.p !== B.p) G.bs = { p: B.p, n: 0 };
    const before = G.bs.n; G.bs.n += n; const got = [];
    for (const x of BSET_AT) if (before < x.n && G.bs.n >= x.n) { const id = `d_${x.slot}_h${B.five}`; invAdd(S, id); got.push(id); }
    return got;
  }
  function collFix(out, d) {
    const n = x => Math.max(0, Math.min(1e6, Math.floor(Number(x) || 0)));
    out.inv = {}; for (const [k, v] of Object.entries((d.inv && typeof d.inv === 'object') ? d.inv : {})) if (ITEMS[k] && n(v)) out.inv[k] = n(v);
    out.gear = {}; for (const [h, g] of Object.entries((d.gear && typeof d.gear === 'object') ? d.gear : {})) { if (!HERO_BY_ID[h] || !g || typeof g !== 'object') continue;
      const o = {}; for (const s of GEAR_SLOTS) { const id = g[s.k]; if (ITEMS[id] && ITEMS[id].slot === s.k && ITEMS[id].hero === h && out.inv[id]) o[s.k] = id; } if (Object.keys(o).length) out.gear[h] = o; }
    out.camp = {}; for (const s of DECO_SLOTS) { const id = d.camp && d.camp[s.k]; if (ITEMS[id] && ITEMS[id].cat === 'deco' && ITEMS[id].slot === decoType(s.k) && out.inv[id]) out.camp[s.k] = id; }
    // mehr benutzt als vorhanden: überzählige ablegen
    for (const id of Object.keys(out.inv)) { let over = invUsed(out, id) - out.inv[id];
      for (const g of Object.values(out.gear)) for (const k of Object.keys(g)) if (over > 0 && g[k] === id) { delete g[k]; over--; }
      for (const k of Object.keys(out.camp)) if (over > 0 && out.camp[k] === id) { delete out.camp[k]; over--; } }
    out.chest = {}; for (const r of [1, 2, 3, 4]) { const v = n(d.chest && d.chest[r]); if (v) out.chest[r] = v; }
    out.pity = { tro: n(d.pity && d.pity.tro), leg: n(d.pity && d.pity.leg) };
  }


  /* ================= Tägliche Anmeldebelohnung ================= */
  // Einmal pro Tag. 7 Tage im Kreis, kein Gold und keine Seelen, nur Dinge, die bleiben.
  // Was es genau gibt, hängt davon ab, was schon freigeschaltet ist (Runen, Expedition, Sternenruf).
  const LOGIN = [
    { kind: 'dust', n: 3 }, { kind: 'spl', n: 20 }, { kind: 'gem', n: 40 }, { kind: 'rune', n: 0 },
    { kind: 'spl', n: 30 }, { kind: 'gem', n: 60 }, { kind: 'gem', n: 160, rune: 1 },
  ];
  // Konkrete Belohnung für Tag i (0..6) nach Fortschritt
  function loginItem(S, i) {
    const L = LOGIN[i], runes = feature(S, 'runen'), tier = bossRuneTier(Math.max(S.best || 1, S.ascBest || 1, 10));
    const dust = Math.max(10, shardOf(tier) * L.n * 2);
    if (L.kind === 'dust') return runes ? { kind: 'dust', n: dust } : { kind: 'stars', n: 2 };
    if (L.kind === 'spl') return expOpen(S) ? { kind: 'spl', n: L.n } : runes ? { kind: 'dust', n: Math.max(10, shardOf(tier) * 4) } : { kind: 'stars', n: 3 };
    if (L.kind === 'rune') return runes ? { kind: 'rune', tier: Math.min(10, tier + 1) } : { kind: 'stars', n: 3 };
    return { kind: 'gem', n: L.n, rune: L.rune && runes ? Math.min(10, tier + 1) : 0 };
  }
  const loginToday = S => !!(S.login && S.login.day === dayId());
  function claimLogin(S) {
    if (loginToday(S)) return null;
    S.login = S.login || { day: '', n: 0 };
    const i = S.login.n % 7, it = loginItem(S, i), out = { day: i, ...it, runes: [] };
    if (it.kind === 'dust') S.dust += it.n;
    if (it.kind === 'spl') S.exp.spl += it.n;
    if (it.kind === 'stars') S.stars += it.n;
    if (it.kind === 'gem') S.gem += it.n;
    const tiers = [it.kind === 'rune' ? it.tier : 0, it.rune || 0].filter(Boolean);
    out.runeDust = 0; for (const tr of tiers) { const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, tr); if (r) out.runes.push(r); else out.runeDust += shardOf(tr); }
    S.login.day = dayId(); S.login.n++;
    return out;
  }

  /* ================= Kopfgeldjagd ================= */
  // Jeden Tag drei Steckbriefe: bekannte Bosse der Ahnenprüfung, mit ihren Phasen, Großangriffen und Schwachstellen.
  // Leicht / Mittel / Schwer, jeweils einmal pro Tag Belohnung. Ab dem 1. Aufstieg.
  const BOUNTY = { lvl: [0.75, 0.83, 0.9], name: ['Leicht', 'Mittel', 'Schwer'], hp: 0.5 };
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  function bountiesOf(S, day = dayId()) {
    const all = []; AHN_MISSIONS.forEach((M, mi) => M.bosses.forEach(d => all.push({ mi, d })));
    let h = hashStr('kopfgeld' + day); const pick = [];
    while (pick.length < 3) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; const x = all[h % all.length]; if (!pick.includes(x)) pick.push(x); }
    const base = Math.max(S.ascBest || 0, S.best || 0, 10);
    return pick.map((x, i) => ({ i, mi: x.mi, def: x.d, lvl: Math.max(10, Math.round(base * BOUNTY.lvl[i])), gem: GEM_SRC.bounty[i], diff: BOUNTY.name[i] }));
  }
  const bountyDone = (S, i) => !!(S.bounty && S.bounty.day === dayId() && S.bounty.done.includes(i));
  function bountyClaim(S, run) {
    if (!run.victory || run.bountyI == null || bountyDone(S, run.bountyI)) return null;
    if (!S.bounty || S.bounty.day !== dayId()) S.bounty = { day: dayId(), done: [] };
    S.bounty.done.push(run.bountyI); const g = GEM_SRC.bounty[run.bountyI] || 0; S.gem += g;
    const spl = expOpen(S) ? 10 : 0; if (spl) S.exp.spl += spl;
    return { gem: g, spl };
  }

  /* ================= Heldenreisen ================= */
  // Ein Held geht 1, 3 oder 9 Stunden auf Reise. In der Zeit kämpft er nicht mit. Danach bringt er Gold, Seelen und Splitter mit.
  // Ertrag: ein Teil dessen, was die Gruppe in derselben Zeit im Feldzug verdienen würde (gemessen an den letzten Feldzügen).
  const TRIPS = [{ h: 1, eff: 0.5, name: 'Kurze Reise' }, { h: 3, eff: 0.42, name: 'Lange Reise' }, { h: 9, eff: 0.33, name: 'Große Expedition' }];
  const TRIP_SHARE = 0.25; // ein Held bringt ein Viertel des Gruppen-Ertrags
  const HOUR = 3600000;
  const onTrip = (S, id) => !!(S.trips && S.trips[id]);
  const tripLeft = (S, id, now = Date.now()) => { const T = S.trips && S.trips[id]; return T ? Math.max(0, T.at + T.h * HOUR - now) : 0; };
  // Ertrag pro Sekunde im Feldzug: gleitender Durchschnitt der letzten Feldzüge, sonst eine grobe Schätzung nach Rekord
  function rateOf(S) {
    const r = S.rate;
    if (r && r.t >= 120) return { g: r.g / r.t, s: r.s / r.t, d: r.d / r.t };
    const b = Math.max(5, S.best || 1);
    return { g: grow(b, ...TUNE.gold) * 0.8, s: (1 + Math.floor(b / 20)) / 70, d: feature(S, 'runen') ? shardOf(bossRuneTier(b)) / 90 : 0 };
  }
  function noteRate(S, run) {
    if (!run || run.mode !== 'normal' || run.time < 20) return;
    const r = S.rate || { g: 0, s: 0, d: 0, t: 0 }, k = 0.75, d = run.runes.reduce((a, x) => a + shardOf(x.tier), 0) + Math.max(0, S.dust - (run.dust0 || S.dust));
    S.rate = { g: r.g * k + run.gold, s: r.s * k + run.souls, d: r.d * k + d, t: r.t * k + run.time };
  }
  // Belohnung für h Stunden Ertrag mit Wirkungsgrad eff (auch für den Wochenboss benutzt)
  function hoursReward(S, h, eff) {
    const R = rateOf(S), sec = h * 3600 * eff;
    const out = { gold: Math.floor(R.g * sec), souls: Math.floor(R.s * sec), dust: feature(S, 'runen') ? Math.floor(R.d * sec) : 0, spl: expOpen(S) ? Math.max(1, Math.round(h * eff * 4)) : 0 };
    return out;
  }
  const tripReward = (S, T) => { const o = TRIPS.find(x => x.h === T.h) || TRIPS[0]; return { ...hoursReward(S, T.h * TRIP_SHARE, o.eff), gem: gemOpen(S) ? T.h * GEM_SRC.tripHour : 0 }; };
  function startTrip(S, id, h) {
    const o = TRIPS.find(x => x.h === h);
    if (!o || !HERO_BY_ID[id] || !hired(S, HERO_BY_ID[id].tree) || onTrip(S, id)) return false;
    const free = HEROES.filter(x => hired(S, x.tree) && !onTrip(S, x.id) && x.id !== id);
    if (!free.length) return false; // mindestens ein Held bleibt im Lager
    S.trips = S.trips || {}; S.trips[id] = { at: Date.now(), h }; S.bench = (S.bench || []).filter(x => x !== id);
    return true;
  }
  // Heimkehr: gibt die Belohnung zurück (oder null, wenn die Reise noch läuft)
  function claimTrip(S, id, now = Date.now()) {
    const T = S.trips && S.trips[id]; if (!T || tripLeft(S, id, now) > 0) return null;
    const r = tripReward(S, T);
    S.gold = Math.min(GOLD_MAX, S.gold + r.gold); S.souls += r.souls; S.tot.souls += r.souls; S.dust += r.dust; if (r.spl) S.exp.spl += r.spl; if (r.gem) S.gem += r.gem;
    // Platz für spätere Fundstücke: r.extra
    delete S.trips[id]; S.tripsDone = (S.tripsDone || 0) + 1;
    return { id, h: T.h, ...r };
  }

  /* ================= Wochenboss ================= */
  // Alle Spieler kämpfen eine Woche lang gegen denselben Boss. Er ist für alle gleich stark und hat unendlich viele
  // Lebensleisten. Mit jeder abgezogenen Leiste werden Leben und Schaden um einen festen Faktor stärker.
  // Jede Leiste bringt sofort Beute. Die beste Leistenzahl pro Spieler (ein Versuch) zählt fürs Gemeinschaftsziel.
  const WB = { lvl: 8, grow: 1.15, hp: 4, tries: 3, maxT: 600, goals: [40, 100, 180, 280, 400] }; // goals: Gruppenziele (Gilde bzw. Zufallsgruppe), müssen zu WB_GOALS in konten.js passen
  // Die drei Wochenbosse wechseln sich wöchentlich ab (Server: Woche % 3)
  const WB_BOSS = [
    { name: 'Tiamat, die Sternenhydra', bg: 'sterne', zone: 10, kind: 'drache' },
    { name: 'Ferrox, der Uhrwerk-Koloss', bg: 'x_werk', zone: 8, kind: 'golem' },
    { name: 'Morwen, die Schattenkönigin', bg: 'krypta', zone: 7, kind: 'geist' },
  ];
  const wbScore = run => (run.wb && run.wb.bars) || 0;
  function wbSpawn(run) {
    const e = makeEnemy(WB.lvl, 1.2, true, false, run);
    e.hp *= WB.hp; e.max = e.hp; e.wb = true; e.wbk = run.wb.bk % WB_BOSS.length; e.bk = WB_BOSS[e.wbk].zone; e.type = WB_BOSS[e.wbk].kind;
    run.enemies = [e]; run.bannerT = 2.2;
  }
  function wbBars(run, c) {
    for (const e of run.enemies) if (e.wb) while (e.hp <= 0) {
      run.wb.bars++; e.max *= WB.grow; e.hp += e.max; e.dmg *= WB.grow;
      c.efloat(e, `Leiste ${run.wb.bars}!`, '#ffd27a', 16); c.burst(e.x, 150, '#ffd27a', 18); run.shake = 0.25; sfx('boss');
    }
  }
  // Beute pro Leiste: Leiste n ist so viel wert wie (3 + n/10) Sekunden Feldzug, spätere Leisten also etwas mehr
  // (80 Leisten ≈ 9 Minuten Feldzug, 20 Leisten ≈ 1,4 Minuten)
  function wbBarSecs(bars) { return bars * 3 + bars * bars * 0.05; }
  function wbBarReward(S, bars) {
    if (!bars) return { gold: 0, souls: 0, dust: 0, spl: 0 };
    const R = rateOf(S), sec = wbBarSecs(bars);
    const r = { gold: Math.floor(R.g * sec), souls: Math.floor(R.s * sec), dust: feature(S, 'runen') ? Math.floor(R.d * sec) : 0, spl: expOpen(S) ? Math.floor(bars / 10) : 0 };
    S.gold = Math.min(GOLD_MAX, S.gold + r.gold); S.souls += r.souls; S.tot.souls += r.souls; S.dust += r.dust; if (r.spl) S.exp.spl += r.spl;
    S.wbBest = Math.max(S.wbBest || 0, bars);
    return r;
  }
  // Wochenende: Belohnung für jedes erreichte Gemeinschaftsziel (Ziel i ist i+1 Stunden Feldzug wert)
  const wbGoalHours = n => { let h = 0; for (let i = 0; i < n; i++) h += i + 1; return h; };
  function wbReward(S, goals) {
    const n = Math.max(0, Math.min(WB.goals.length, Math.floor(goals) || 0));
    const r = n ? hoursReward(S, wbGoalHours(n), 0.5) : { gold: 0, souls: 0, dust: 0, spl: 0 };
    S.gold = Math.min(GOLD_MAX, S.gold + r.gold); S.souls += r.souls; S.tot.souls += r.souls; S.dust += r.dust; if (r.spl) S.exp.spl += r.spl;
    const gem = gemOpen(S) ? n * GEM_SRC.wbGoal : 0; S.gem += gem;
    S.wbWeeks = (S.wbWeeks || 0) + 1;
    return { goals: n, ...r, gem };
  }

  /* ================= Spielstand ================= */
  function fresh() {
    return { v: SAVE_VERSION, gold: 0, souls: 0, best: 0, bestEver: 0, runs: 0, nodes: { start: 1 }, equip: [], speed: 1, stars: 0, rebirths: 0, perks: {},
      runes: [], sockets: Object.fromEntries(HEROES.map(h => [h.id, [null, null, null, null, null, null]])), dust: 0, runeSeq: 1, towerBest: 0,
      season: SEASON, asc: 0, ascBest: 0, rankGot: 0, mast: {}, skin: {}, wf: 0, crowns: 0, cperks: {}, ach: {}, tot: { kills: 0, souls: 0 }, weekly: { week: '', best: 0, claimed: 0 }, comps: {}, compActive: [], gem: 0, gacha: gFix(), cons: {}, inv: {}, gear: {}, camp: {}, chest: {}, pity: { tro: 0, leg: 0 }, gBoss: 0, login: { day: '', n: 0 }, bounty: { day: '', done: [] }, seenIntro: false, area: 0, tempo: 0, bench: [], altar: 0, seenField: false, exp: { spl: 0, done: 0, target: 'a', pieces: {} }, ahn: ahnFix() };
  }
  function migrate(d) {
    if (!d || typeof d !== 'object') return fresh();
    if (!d.v || d.v < 2) { const f = fresh(); f.reset = true; return f; } // allererste Version: anderes System
    const f = fresh();
    const out = { ...f, ...d, v: SAVE_VERSION, nodes: { ...f.nodes }, perks: {}, runes: [], sockets: {} };
    for (const [id, r] of Object.entries(d.nodes || {})) if (NODE[id]) out.nodes[id] = Math.max(0, Math.min(NODE[id].max, Math.floor(Number(r) || 0)));
    for (const [id, r] of Object.entries(d.perks || {})) if (PERK[id]) out.perks[id] = Math.max(0, Math.min(PERK[id].max, Math.floor(Number(r) || 0)));
    out.nodes.start = 1;
    for (const k of ['gold', 'souls', 'best', 'bestEver', 'runs', 'stars', 'rebirths', 'dust', 'runeSeq', 'towerBest']) out[k] = Math.max(0, Math.floor(Number(out[k]) || 0));
    out.runeSeq = Math.max(1, out.runeSeq);
    out.bestEver = Math.max(out.bestEver, out.best);
    for (const r of Array.isArray(d.runes) ? d.runes : []) if (r && RUNE[r.t] && r.tier >= 1) out.runes.push({ id: Math.floor(r.id) || out.runeSeq++, t: r.t, tier: Math.min(10, Math.floor(r.tier)) });
    out.runeSeq = Math.max(out.runeSeq, ...out.runes.map(r => r.id + 1));
    const ids = new Set(out.runes.map(r => r.id)), used = new Set();
    for (const h of HEROES) {
      const arr = (d.sockets && Array.isArray(d.sockets[h.id]) ? d.sockets[h.id] : []).slice(0, h.id === 'o' ? 7 : 6);
      out.sockets[h.id] = (h.id === 'o' && arr.length > 6 ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5]).map(i => (ids.has(arr[i]) && !used.has(arr[i]) ? (used.add(arr[i]), arr[i]) : null));
    }
    out.cperks = {}; for (const [id, r] of Object.entries(d.cperks || {})) if (CPERK[id]) out.cperks[id] = Math.max(0, Math.min(CPERK[id].max, Math.floor(Number(r) || 0)));
    for (const k of ['asc', 'crowns']) out[k] = Math.max(0, Math.floor(Number(d[k]) || 0));
    out.ach = {}; for (const a of ACH) if (d.ach && d.ach[a.id]) out.ach[a.id] = 1;
    out.tot = { kills: Math.max(0, Math.floor(Number(d.tot?.kills) || 0)), souls: Math.max(0, Math.floor(Number(d.tot?.souls) || 0)) };
    if (Array.isArray(d.knownTabs)) out.knownTabs = d.knownTabs.filter(x => typeof x === 'string').slice(0, 60);
    if (Array.isArray(d.knownBoard)) out.knownBoard = d.knownBoard.filter(x => typeof x === 'string').slice(0, 10);
    out.season = Math.max(0, Math.floor(Number(d.season) || 0));
    if (d.tst) out.tst = 1;
    out.daily = { day: String(d.daily?.day || ''), best: Math.max(0, Math.floor(Number(d.daily?.best) || 0)), claimed: Math.max(0, Math.floor(Number(d.daily?.claimed) || 0)) };
    out.weekly = { week: String(d.weekly?.week || ''), best: Math.max(0, Math.floor(Number(d.weekly?.best) || 0)), claimed: Math.max(0, Math.floor(Number(d.weekly?.claimed) || 0)) };
    out.comps = {}; for (const c of COMPS) { const l = Math.floor(Number(d.comps?.[c.id]) || 0); if (l > 0) out.comps[c.id] = Math.min(100, l); }
    out.compActive = (Array.isArray(d.compActive) ? d.compActive : []).filter(id => out.comps[id]).slice(0, 2);
    out.seenIntro = !!d.seenIntro || out.runs > 0;
    out.area = Math.max(0, Math.min(99, Math.floor(Number(d.area) || 0)));
    out.tempo = Math.max(0, Math.min(TEMPO_COST.length, Math.floor(Number(d.tempo) || 0)));
    out.bench = Array.isArray(d.bench) ? [...new Set(d.bench.filter(id => HERO_BY_ID[id]))] : [];
    out.seenField = !!d.seenField; out.seenExp = !!d.seenExp;
    out.trips = {}; for (const h of HEROES) { const T = d.trips && d.trips[h.id]; if (T && TRIPS.some(o => o.h === T.h) && Number(T.at) > 0) out.trips[h.id] = { at: Number(T.at), h: T.h }; }
    { const r = d.rate || {}, n = x => Math.max(0, Number(x) || 0); out.rate = { g: n(r.g), s: n(r.s), d: n(r.d), t: n(r.t) }; }
    out.tripsDone = Math.max(0, Math.floor(Number(d.tripsDone) || 0));
    collFix(out, d);
    out.gem = Math.max(0, Math.min(1e9, Math.floor(Number(d.gem) || 0))); out.gacha = gFix(d.gacha);
    out.cons = {}; for (const h of HEROES) { const c = Math.max(0, Math.min(GACHA.consMax, Math.floor(Number(d.cons && d.cons[h.id]) || 0))); if (c) out.cons[h.id] = c; }
    out.gBoss = Math.max(0, Math.min(1e7, Math.floor(Number(Array.isArray(d.gBoss) ? Math.max(0, ...d.gBoss.map(Number).filter(x => x > 0)) : d.gBoss) || 0)));
    out.login = { day: String((d.login && d.login.day) || '').slice(0, 12), n: Math.max(0, Math.floor(Number(d.login && d.login.n) || 0)) };
    out.bounty = { day: String((d.bounty && d.bounty.day) || '').slice(0, 12), done: (Array.isArray(d.bounty && d.bounty.done) ? d.bounty.done : []).filter(x => [0, 1, 2].includes(x)) };
    out.wbBest = Math.max(0, Math.floor(Number(d.wbBest) || 0)); out.wbWeeks = Math.max(0, Math.floor(Number(d.wbWeeks) || 0));
    out.wbBk = Math.max(0, Math.floor(Number(d.wbBk) || 0));
    const ex = d.exp && typeof d.exp === 'object' ? d.exp : {};
    out.exp = { spl: Math.max(0, Math.floor(Number(ex.spl) || 0)), done: Math.max(0, Math.floor(Number(ex.done) || 0)), target: PUZZLE.includes(ex.target) ? ex.target : 'a', pieces: {} };
    for (const id of PUZZLE) { const m = Math.floor(Number(ex.pieces && ex.pieces[id]) || 0); if (m > 0) out.exp.pieces[id] = m & 63; }
    out.speed = Math.round((Number(d.speed) || 1) * 2) / 2; if (!(out.speed >= 1 && out.speed <= maxSpeed(out))) out.speed = Math.min(3, maxSpeed(out));
    out.equip = [];
    for (const id of Array.isArray(d.equip) ? d.equip : []) if (NODE[id] && NODE[id].active && out.nodes[id] > 0 && !out.equip.includes(id)) out.equip.push(id);
    for (const h of HEROES) for (const sg of [false, true]) { const mine = eqOf(out, h.tree, sg), lim = slotLim(out, h.tree, sg); if (mine.length > lim) out.equip = out.equip.filter(id => !mine.slice(lim).includes(id)); }
    out.kplace = {};
    for (const h of HEROES) { const n = Math.floor(Number(d.kplace && d.kplace[h.id]) || 0); if (n > 0) out.kplace[h.id] = n; }
    out.kslots = Math.max(0, Math.floor(Number(d.kslots) || 0));
    if (!d.keyV) {
      // Umstellung auf Schlüsselsockel: alle Schlüssel kommen ab, Gold und Seelen zurück, Sockel = bisherige Wiedergeburten
      let back = 0;
      for (const n of NODES) if (n.kind === 'key' && out.nodes[n.id]) { const c = n.cost(0); out.gold += c.g; out.souls += c.s; delete out.nodes[n.id]; back++; }
      out.kslots = out.rebirths + 9 * out.asc; out.kplace = {}; if (out.runs > 0) out.keyNews = back;
    }
    out.keyV = 1;
    if (!d.infV) {
      // Neue Endlos-Paare: bisher gekaufte Endlos-Stufen (außer beim Ritter) werden in Gold und Seelen zurückgegeben
      let g = 0, so = 0;
      for (const n of NODES) if (n.kind === 'inf' && n.tree !== 'ritter' && out.nodes[n.id]) { for (let r = 0; r < out.nodes[n.id]; r++) { const c = n.cost(r); g += c.g; so += c.s; } delete out.nodes[n.id]; }
      out.gold += g; out.souls += so; if ((g || so) && out.runs > 0) out.infNews = { g, s: so };
    }
    out.infV = 1;
    if (!d.startV && out.perks.p_start) { const r0 = Math.floor(Number(d.perks && d.perks.p_start) || 0); let back = 0; for (let r = 0; r < r0; r++) back += 2 + r; out.stars += back; delete out.perks.p_start; if (out.runs > 0) out.startNews = back; }
    out.startV = 1;
    if (!d.shardV) out.dust = Math.ceil(out.dust / 2); // Runenstaub wird zu Runensplittern (neuer Kurs)
    out.shardV = 1;
    if (!d.starV && Object.keys(out.perks).length) { const back = resetPerks(out); if (out.runs > 0 && back) out.starNews = back; }
    out.starV = 1;
    out.rbHist = (Array.isArray(d.rbHist) ? d.rbHist : []).map(x => Math.max(0, Math.floor(Number(x) || 0))).slice(-40);
    out.rlager = Math.max(0, Math.min(LAGER_MAX, Math.floor(Number(d.rlager) || 0)));
    out.altar = Math.max(0, Math.min(ALTAR_MAX, Math.floor(Number(d.altar) || 0)));
    out.ahn = ahnFix(d.ahn);
    out.ascBest = d.ascBest != null ? Math.max(0, Math.floor(Number(d.ascBest) || 0)) : out.asc > 0 ? out.best : Math.max(out.bestEver, out.best); // vor Version 37 unbekannt: beste Schätzung
    out.ascBest = Math.max(out.ascBest, out.best);
    out.mast = {}; out.skin = {};
    for (const h of HEROES) { const x = Math.floor(Number(d.mast && d.mast[h.id]) || 0); if (x > 0) out.mast[h.id] = x; const sk = d.skin && d.skin[h.id]; if (SKIN[sk] && sk !== 'std' && mastLevel(out, h.id) >= SKIN[sk].L) out.skin[h.id] = sk; }
    out.wf = Math.max(0, Math.floor(Number(d.wf) || 0)); out.rankGot = Math.max(out.asc, Math.floor(Number(d.rankGot) || 0));
    if (!d.puzV) for (const id of PUZZLE) puzzleHire(out, id);
    out.puzV = 1;
    if (!d.ahnV) out.ahn.lvl = 0; // Stärke neu: nach dem höchsten Rekord überhaupt
    out.ahnV = 1;
    for (const h of [...HEROES].reverse()) while (kPlaced(out) > out.kslots && out.kplace[h.id]) { if (--out.kplace[h.id] <= 0) delete out.kplace[h.id]; }
    for (const h of HEROES) { const keys = NODES.filter(n => n.tree === h.tree && n.kind === 'key' && out.nodes[n.id]).reverse(); for (const n of keys) { if (keyNeed(out, h.tree) <= keyCap(out, h.tree) && (!n.sig || sigOn(out, h.tree))) continue; const c = n.cost(0); out.gold += c.g; out.souls += c.s; delete out.nodes[n.id]; } }
    delete out.reset;
    return out;
  }
  const rank = (S, id) => S.nodes[id] || 0;
  const PUZZLE = HEROES.filter(h => h.puzzle).map(h => h.id);
  const pieceMask = (S, id) => (S.exp && S.exp.pieces && S.exp.pieces[id]) || 0;
  const pieceCount = (S, id) => { let m = pieceMask(S, id), n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
  const assembled = (S, id) => pieceMask(S, id) === 63;
  const perk = (S, id) => S.perks[id] || 0;
  const slotsOf = (S, tree) => HERO[tree].slots + (tree === 'ritter' ? (S.perks?.p_platz || 0) : 0) + (S.cperks?.k_hand || 0);
  const cperk = (S, id) => (S.cperks && S.cperks[id]) || 0;
  const hired = (S, tree) => tree === 'ritter' || (rank(S, HERO[tree].hire) > 0 && (!HERO[tree].puzzle || assembled(S, HERO[tree].id)));
  const classOpen = (S, tree) => (HERO[tree].puzzle ? assembled(S, HERO[tree].id) : S.rebirths >= HERO[tree].rebirth) || hired(S, tree);
  const keysUsed = (S, tree) => NODES.filter(n => n.tree === tree && n.kind === 'key' && !n.sig && rank(S, n.id) > 0).length;
  // Ahnensiegel: eigener Platz für eine Siegel-Fähigkeit und eigener Sockel für einen Siegel-Schlüssel
  const sigOn = (S, tree) => !!(S.ahn && S.ahn.place && HERO[tree] && S.ahn.place[HERO[tree].id]);
  const sigKeysUsed = (S, tree) => NODES.filter(n => n.tree === tree && n.kind === 'key' && n.sig && rank(S, n.id) > 0).length;
  const sigCap = (S, tree) => (sigOn(S, tree) ? 1 : 0);
  // Belegte normale Sockel: normale Schlüssel plus Siegel-Schlüssel, die nicht mehr in den Siegelsockel passen
  const keyNeed = (S, tree, addSig = 0, addBase = 0) => keysUsed(S, tree) + addBase + Math.max(0, sigKeysUsed(S, tree) + addSig - sigCap(S, tree));
  const eqOf = (S, tree, sg) => S.equip.filter(id => NODE[id] && NODE[id].tree === tree && !!NODE[id].sig === !!sg);
  const slotLim = (S, tree, sg) => (sg ? sigCap(S, tree) : slotsOf(S, tree));
  function blockReason(S, n) {
    if (n.reqPuzzle && !assembled(S, n.reqPuzzle)) return `Setze zuerst alle 6 Puzzleteile in den Expeditionen zusammen (${pieceCount(S, n.reqPuzzle)}/6).`;
    if (n.reqRebirth && S.rebirths < n.reqRebirth && !rank(S, n.id)) return `Wird mit der ${n.reqRebirth}. Wiedergeburt freigeschaltet.`;
    if (n.sig && !sigOn(S, n.tree)) return 'Setze zuerst im Reiter Ahnenprüfung ein Ahnensiegel auf diesen Helden.';
    if (n.kind === 'key' && !rank(S, n.id) && keyNeed(S, n.tree, n.sig ? 1 : 0, n.sig ? 0 : 1) > keyCap(S, n.tree)) return n.sig ? `Der Siegelsockel und alle ${keyCap(S, n.tree)} Schlüsselsockel dieser Klasse sind belegt. Nimm einen Schlüssel ab oder setze oben einen freien Sockel auf diese Klasse.` : `Alle ${keyCap(S, n.tree)} Schlüsselsockel dieser Klasse sind belegt. Setze oben einen freien Sockel auf diese Klasse (du bekommst einen pro Wiedergeburt).`;
    if (n.kind !== 'start' && !(n.p || []).some(p => rank(S, p) > 0)) return `Schalte zuerst ${(n.p || []).map(id => NODE[id].name).join(' oder ')} frei.`;
    return '';
  }
  const available = (S, n) => !blockReason(S, n);
  const nodeCost = (S, n) => (n.cost ? n.cost(rank(S, n.id)) : { g: 0, s: 0 });
  function canBuy(S, n) {
    if (!n.cost || !available(S, n) || rank(S, n.id) >= n.max) return false;
    const c = nodeCost(S, n);
    return S.gold >= c.g && S.souls >= c.s;
  }
  function buy(S, n) {
    if (!canBuy(S, n)) return false;
    const c = nodeCost(S, n);
    S.gold -= c.g; S.souls -= c.s; S.nodes[n.id] = rank(S, n.id) + 1;
    if (n.active && S.nodes[n.id] === 1 && eqOf(S, n.tree, n.sig).length < slotLim(S, n.tree, n.sig)) S.equip.push(n.id);
    return true;
  }
  // Seelenaltar: Gold opfern für einen dauerhaften Seelen-Multiplikator (bleibt bei Wiedergeburt und Aufstieg)
  const ALTAR_MAX = 25, ALTAR_STEP = 0.15;
  const altarCost = L => Math.ceil(25000 * Math.pow(3, L));
  const altarMul = S => 1 + ALTAR_STEP * (S.altar || 0);
  const altarOpen = S => S.rebirths >= 1 || S.asc > 0 || (S.altar || 0) > 0;
  function buyAltar(S) { const L = S.altar || 0; if (L >= ALTAR_MAX || !altarOpen(S) || S.gold < altarCost(L)) return false; S.gold -= altarCost(L); S.altar = L + 1; return true; }
  const roundSouls = x => { const f = Math.floor(x); return f + (Math.random() < x - f ? 1 : 0); };
  // Schlüsselsockel: jeder Held hat 1 festen Sockel, dazu kommen frei verteilbare Sockel (1 pro Wiedergeburt, bleiben beim Aufstieg)
  const kSlots = S => S.kslots || 0;
  const kPlaced = S => Object.values(S.kplace || {}).reduce((a, b) => a + b, 0);
  const kFree = S => Math.max(0, kSlots(S) - kPlaced(S));
  const kExtra = (S, tree) => (S.kplace || {})[HERO[tree].id] || 0;
  const keyCap = (S, tree) => 1 + kExtra(S, tree);
  function addSock(S, tree) { if (!HERO[tree] || kFree(S) <= 0) return false; S.kplace = S.kplace || {}; S.kplace[HERO[tree].id] = kExtra(S, tree) + 1; return true; }
  function removeSock(S, tree) {
    const n = kExtra(S, tree); if (!n) return 'none';
    if (keyNeed(S, tree) > keyCap(S, tree) - 1) return 'used';
    if (n > 1) S.kplace[HERO[tree].id] = n - 1; else delete S.kplace[HERO[tree].id];
    return 'ok';
  }
  // Schlüssel-Fertigkeit wieder abnehmen (Umskillen): Gold und Seelen kommen voll zurück
  function removeKey(S, n) {
    if (!n || n.kind !== 'key' || !rank(S, n.id)) return false;
    const c = n.cost(0);
    S.gold += c.g; S.souls += c.s; delete S.nodes[n.id];
    return c;
  }
  function toggleEquip(S, id) {
    const n = NODE[id]; if (!n || !n.active || !rank(S, id)) return;
    const i = S.equip.indexOf(id);
    if (i >= 0) { S.equip.splice(i, 1); return; }
    const mine = eqOf(S, n.tree, n.sig), lim = slotLim(S, n.tree, n.sig);
    if (lim <= 0) return;
    if (mine.length >= lim) S.equip.splice(S.equip.indexOf(mine[0]), 1);
    S.equip.push(id);
  }
  const perkCost = (S, p) => p.cost(perk(S, p.id));
  function buyPerk(S, p) {
    if (perk(S, p.id) >= p.max || S.stars < perkCost(S, p)) return false;
    S.stars -= perkCost(S, p); S.perks[p.id] = perk(S, p.id) + 1; if (p.id === 'p_feld') S.bench = []; return true;
  }
  function keepHires(S) { return perk(S, 'p_freunde') || cperk(S, 'k_veteran') ? HEROES.filter(h => h.hire && rank(S, h.hire)).map(h => h.hire) : []; }
  function rebirth(S, force) {
    const st = starsFor(S) || (force ? starsFor(S, reqOf(S)) : 0); if (!st && !force) return 0;
    S.stars += st; S.rebirths++; S.kslots = kSlots(S) + 1; S.rbHist = [...(S.rbHist || []), st].slice(-40); S.bestEver = Math.max(S.bestEver, S.best);
    const keep = keepHires(S), keepTree = !!S.tKeepTree;
    if (!keepTree) { S.nodes = { start: 1 }; keep.forEach(id => (S.nodes[id] = 1)); }
    S.gold = 500 * perk(S, 'p_zins') + 5000 * cperk(S, 'k_start'); S.souls = 3 * perk(S, 'p_seelenst') + 10 * cperk(S, 'k_start'); S.best = 0; if (!keepTree) S.equip = []; S.area = 0;
    S.gBoss = 0;
    S.news = { kind: 'rebirth', n: S.rebirths, stars: st };
    return st;
  }
  function ascend(S) {
    const k = crownsFor(S); if (!k) return 0;
    S.crowns += k; S.asc++; S.bestEver = Math.max(S.bestEver, S.best);
    let rb = 0; if (S.asc > (S.rankGot || 0)) { rb = rankBonus(S.asc); S.crowns += rb; S.rankGot = S.asc; }
    const keep = cperk(S, 'k_veteran') ? keepHires(S) : [];
    S.nodes = { start: 1 }; keep.forEach(id => (S.nodes[id] = 1));
    S.gBoss = 0;
    S.rebirths = 0; S.stars = 0; S.perks = {}; S.best = 0; S.ascBest = 0; S.towerBest = 0; S.ahn.lvl = 0; S.equip = []; S.area = 0;
    S.gold = 5000 * cperk(S, 'k_start'); S.souls = 10 * cperk(S, 'k_start');
    for (const c of COMPS) if (S.asc >= c.asc && !S.comps[c.id]) S.comps[c.id] = 1;
    if (!S.compActive.length && Object.keys(S.comps).length) S.compActive = [Object.keys(S.comps)[0]];
    S.news = { kind: 'asc', n: S.asc, crowns: k, rank: rankOf(S.asc).name, rankBonus: rb };
    return k;
  }
  const cperkCost = (S, p) => p.cost(cperk(S, p.id));
  function buyCperk(S, p) {
    if (cperk(S, p.id) >= p.max || S.crowns < cperkCost(S, p)) return false;
    S.crowns -= cperkCost(S, p); S.cperks[p.id] = cperk(S, p.id) + 1; if (p.id === 'k_feld') S.bench = []; return true;
  }
  function levelComp(S, id) {
    const l = S.comps[id] || 0; if (!l || l >= compMax(S)) return false;
    const c = compCost(l); if (S.souls < c) return false;
    S.souls -= c; S.comps[id] = l + 1; return true;
  }
  function toggleComp(S, id) {
    if (!S.comps[id]) return;
    const i = S.compActive.indexOf(id);
    if (i >= 0) { S.compActive.splice(i, 1); return; }
    if (S.compActive.length >= compSlots(S)) S.compActive.shift();
    S.compActive.push(id);
  }
  function checkAch(S, run) {
    const got = [];
    for (const a of ACH) if (!S.ach[a.id] && a.ok(S, run)) { S.ach[a.id] = 1; got.push(a); }
    return got;
  }
  function claimWeekly(S, run) {
    const id = weekId(), day = dayId();
    // Wochenbestwert bleibt für die Bestenliste „Diese Woche“, Belohnungen gibt es pro Tag
    if (S.weekly.week !== id) S.weekly = { week: id, best: 0, claimed: 0 };
    if (!S.daily || S.daily.day !== day) S.daily = { day, best: 0, claimed: 0 };
    const score = run.stage;
    S.weekly.best = Math.max(S.weekly.best, score); S.daily.best = Math.max(S.daily.best, score);
    let stars = 0, crowns = 0;
    WEEK_TIERS.forEach((t, i) => { if (S.daily.best >= t.st && !(S.daily.claimed & (1 << i))) { S.daily.claimed |= 1 << i; stars += t.stars; crowns += t.crown || 0; } });
    S.stars += stars; S.crowns += crowns;
    return { stars, crowns };
  }

  // Soundeffekte: im Browser setzt die Oberfläche hier die echte Funktion ein
  let sfx = () => {};
  /* ---------- Runen ---------- */
  const runeById = (S, id) => S.runes.find(r => r.id === id);
  function addRune(S, t, tier) {
    if (S.runes.length >= runeCap(S)) { S.dust += shardOf(tier); return null; }
    const r = { id: S.runeSeq++, t, tier }; S.runes.push(r); return r;
  }
  const socketed = S => new Set(Object.values(S.sockets).flat().filter(Boolean));
  function socket(S, hid, slot, runeId) {
    if (!sockOk(S, slot, runeById(S, runeId), hid)) return false;
    for (const h of HEROES) S.sockets[h.id] = (S.sockets[h.id] || [null, null, null, null, null, null]).map(x => (x === runeId ? null : x));
    while (S.sockets[hid].length < Math.max(6, slot + 1)) S.sockets[hid].push(null);
    S.sockets[hid][slot] = runeId; return true;
  }
  function unsocket(S, hid, slot) { S.sockets[hid][slot] = null; }
  function canMerge(S, r) { return feature(S, 'schmiede') && S.runes.filter(x => x.t === r.t && x.tier === r.tier).length >= 3 && r.tier < 10 && S.dust >= mergeCost(r.tier); }
  function merge(S, r) {
    if (!canMerge(S, r)) return null;
    const used = socketed(S);
    const same = S.runes.filter(x => x.t === r.t && x.tier === r.tier).sort((a, b) => (used.has(a.id) ? 1 : 0) - (used.has(b.id) ? 1 : 0) || (a.id === r.id ? -1 : 0)).slice(0, 3);
    const keepSlot = Object.entries(S.sockets).flatMap(([hid, arr]) => arr.map((x, i) => (same.some(s => s.id === x) ? [hid, i] : null))).filter(Boolean)[0];
    S.runes = S.runes.filter(x => !same.includes(x));
    for (const h of HEROES) S.sockets[h.id] = S.sockets[h.id].map(x => (same.some(s => s.id === x) ? null : x));
    S.dust -= mergeCost(r.tier);
    const nr = { id: S.runeSeq++, t: r.t, tier: r.tier + 1 }; S.runes.push(nr);
    if (keepSlot) S.sockets[keepSlot[0]][keepSlot[1]] = nr.id;
    return nr;
  }
  // Sternen-Laden zurücksetzen: alle ausgegebenen Sterne kommen zurück
  function resetPerks(S) {
    let back = 0;
    for (const p of PERKS) for (let r = 0; r < perk(S, p.id); r++) back += p.cost(r);
    S.stars += back; S.perks = {}; S.bench = [];
    return back;
  }
  // Boss-Runen kommen in einem Bereich: unter 25 nur I, ab 25 I–II, ab 50 II–III, ab 75 II–IV, ab 100 III–V …
  function bossRuneTier(stage) {
    const b = Math.min(10, 1 + Math.floor(stage / 25)), x = Math.random();
    if (b === 1) return 1;
    if (b <= 3) return x < 0.6 ? b - 1 : b;
    return x < 0.4 ? b - 2 : x < 0.75 ? b - 1 : b;
  }
  // Runenwandler: 2 freie Runen derselben Stufe rein, 1 zufällige Rune derselben Stufe einer anderen Art raus
  function transmute(S, idA, idB) { if (!feature(S, 'schmiede')) return null;
    if (!feature(S, 'runen') || idA === idB) return null;
    const used = socketed(S), a = S.runes.find(r => r.id === idA), b = S.runes.find(r => r.id === idB);
    if (!a || !b || used.has(a.id) || used.has(b.id) || a.tier !== b.tier) return null;
    const pool = RUNES.filter(r => r.id !== a.t && r.id !== b.t); if (!pool.length) return null;
    S.runes = S.runes.filter(r => r !== a && r !== b);
    const nr = { id: S.runeSeq++, t: pool[Math.floor(Math.random() * pool.length)].id, tier: a.tier }; S.runes.push(nr);
    return nr;
  }
  // Test: eine Wiedergeburt zurück. Sternen-Laden wird zurückgesetzt, die Sterne dieser Wiedergeburt gehen verloren.
  function unrebirth(S) {
    if ((S.rebirths || 0) <= 0) return null;
    const hist = S.rbHist || [];
    const est = (() => { const tmp = { ...S, rebirths: S.rebirths - 1 }; return starsFor(tmp, reqOf(tmp)); })();
    const lost = hist.length ? hist.pop() : est;
    const back = resetPerks(S);
    S.stars = Math.max(0, S.stars - lost); S.rebirths--; S.rbHist = hist;
    S.kslots = Math.max(0, kSlots(S) - 1);
    for (const h of [...HEROES].reverse()) while (kPlaced(S) > S.kslots && S.kplace && S.kplace[h.id]) { if (--S.kplace[h.id] <= 0) delete S.kplace[h.id]; }
    for (const h of HEROES) {
      if (!h.puzzle && h.hire && h.rebirth > S.rebirths && S.nodes[h.hire]) { delete S.nodes[h.hire]; S.equip = S.equip.filter(id => NODE[id].tree !== h.tree); }
      const keys = NODES.filter(n => n.tree === h.tree && n.kind === 'key' && S.nodes[n.id]);
      for (const n of keys.slice(keyCap(S, h.tree))) { const c = n.cost(0); S.gold += c.g; S.souls += c.s; delete S.nodes[n.id]; }
    }
    S.bench = (S.bench || []).filter(id => HEROES.some(h => h.id === id && hired(S, h.tree)));
    S.area = Math.min(S.area || 0, areaMax(S));
    return { lost, back };
  }
  function buyLager(S) { const n = S.rlager || 0; if (!feature(S, 'runen') || n >= LAGER_MAX || S.dust < lagerCost(n)) return false; S.dust -= lagerCost(n); S.rlager = n + 1; return true; }
  function dismantle(S, r) {
    if (!feature(S, 'runen')) return 0;
    for (const h of HEROES) S.sockets[h.id] = S.sockets[h.id].map(x => (x === r.id ? null : x));
    S.runes = S.runes.filter(x => x !== r);
    const d = shardOf(r.tier); S.dust += d; return d;
  }
  function buyRune(S) {
    if (!feature(S, 'schmiede') || S.dust < DUST_RUNE || S.runes.length >= runeCap(S)) return null;
    S.dust -= DUST_RUNE; return addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, 1);
  }
  // Runenresonanz (Endlos-Fertigkeit des Runengolems): alle Runen wirken stärker
  const runeAmp = S => 1 + 0.04 * ((S.nodes && S.nodes.o_inf1) || 0) + 0.01 * ((S.nodes && S.nodes.o_inf2) || 0);
  // Runenhort: Zusatz-Sockel ab Stufe 15, 35 und 60, jeweils mit Höchststufe für Runen
  const XSOCK = [{ at: 15, max: 4 }, { at: 35, max: 6 }, { at: 60, max: 8 }];
  const extraSocks = S => XSOCK.filter(x => ((S.nodes && S.nodes.o_inf2) || 0) >= x.at).length;
  // Platz 6 (der siebte) ist der Sternsockel des Golems aus dem 6. Sternbild: jede Stufe erlaubt
  const starSock = (S, hid) => hid === 'o' && consOf(S, 'o') >= 6;
  const sockOk = (S, slot, r, hid) => slot < 3 || (slot === 6 ? !!r && starSock(S, hid) : slot < 6 && slot - 3 < extraSocks(S) && !!r && r.tier <= XSOCK[slot - 3].max);
  const golemRunes = S => (feature(S, 'runen') ? (S.sockets.o || []).filter(id => id && runeById(S, id)).length : 0);
  function runeBonus(S, hid, amp = 1) {
    const b = {};
    if (!feature(S, 'runen')) return b;
    const slots = S.sockets[hid] || [], main = slots.slice(0, 3).map(id => id && runeById(S, id)).filter(Boolean);
    const count = {}; main.forEach(r => (count[r.t] = (count[r.t] || 0) + 1));
    for (const r of main) b[r.t] = (b[r.t] || 0) + runeVal(r.t, r.tier) * (count[r.t] >= 3 ? 1.5 : 1) * amp;
    for (let i = 3; i < slots.length; i++) { const r = slots[i] && runeById(S, slots[i]); if (r && sockOk(S, i, r, hid)) b[r.t] = (b[r.t] || 0) + runeVal(r.t, r.tier) * amp; }
    return b;
  }

  /* ================= Werte ================= */
  const BASE = {
    r: { atk: 10, hp: 100, aps: 1, crit: 0.05, critD: 1.5 },
    w: { atk: 6, hp: 160, aps: 0.8, crit: 0.05, critD: 1.5 },
    s: { atk: 7, hp: 70, aps: 1.1, crit: 0.08, critD: 1.6 },
    m: { atk: 9, hp: 60, aps: 0.7, crit: 0.05, critD: 1.5, splash: 0.3 },
    p: { atk: 3, hp: 80, aps: 0.8, crit: 0.05, critD: 1.5, heal: 8 },
    t: { atk: 6, hp: 110, aps: 0.9, crit: 0.05, critD: 1.5, wolfAtk: 5, wolfAps: 1.2, wolves: 1 },
    a: { atk: 8, hp: 65, aps: 1.2, crit: 0.15, critD: 1.8, rangedDmg: 0.25 },
    n: { atk: 6, hp: 70, aps: 0.8, crit: 0.05, critD: 1.5, raise: 0.1, minionMax: 2, minionMul: 1, minionDur: 10 },
    b: { atk: 4, hp: 75, aps: 0.9, crit: 0.05, critD: 1.5, songAtk: 0.08, songAps: 0.05 },
    d: { atk: 6, hp: 140, aps: 0.9, crit: 0.05, critD: 1.5 },
    e: { atk: 6, hp: 70, aps: 0.7, crit: 0.05, critD: 1.5, splash: 0.3, turrets: 1, turretMul: 0.6, turretAps: 1 },
    o: { atk: 5, hp: 190, aps: 0.65, crit: 0.05, critD: 1.5 },
  };
  const ZERO = { dr: 0, regen: 0, dbl: 0, thorns: 0, block: 0, dodge: 0, lifesteal: 0, cdr: 0, actMul: 1, burn: 0, pierce: 0, shots: 1, splash: 0, stunChance: 0,
    bossDmg: 0, vuln: 0, extraShot: 0, revive: 0, heal: 0, overShield: 0, reviveFast: 0, miracle: 0, wolfAtk: 0, wolfAps: 0, wolves: 0, wolfCrit: 0, wolfHeal: 0, packBonus: 0,
    ...Object.fromEntries(SIG_FLAGS.map(f => [f, 0])), rangedDmg: 0, raise: 0, minionMax: 0, minionMul: 1, minionDur: 0, songAtk: 0, songAps: 0, turrets: 0, turretMul: 0, turretAps: 0 };
  // Aufstellung: 4 Plätze auf dem Feld, +1 aus dem Sternen-Laden, +1 aus dem Kronen-Laden
  const fieldSlots = S => Math.min(6, 4 + perk(S, 'p_feld') + cperk(S, 'k_feld'));
  function fieldOf(S) {
    const avail = HEROES.filter(h => hired(S, h.tree) && !onTrip(S, h.id)).map(h => h.id), bench = S.bench || [];
    const f = avail.filter(id => !bench.includes(id)).slice(0, fieldSlots(S));
    return f.length ? f : avail.slice(0, 1);
  }
  function toggleField(S, id) {
    const f = fieldOf(S);
    if (!HEROES.some(h => h.id === id && hired(S, h.tree))) return 'none';
    if (onTrip(S, id)) return 'trip';
    S.bench = HEROES.filter(h => hired(S, h.tree) && !onTrip(S, h.id) && !f.includes(h.id) && h.id !== id).map(h => h.id);
    if (f.includes(id)) { if (f.length <= 1) return 'last'; S.bench.push(id); return 'out'; }
    if (f.length >= fieldSlots(S)) { S.bench.push(id); return 'full'; }
    return fieldOf(S).includes(id) ? 'in' : 'full';
  }
  function stats(S) {
    const hs = {};
    for (const h of HEROES) if (hired(S, h.tree)) hs[h.id] = { ...ZERO, ...BASE[h.id] };
    const g = { gold: 1, chest: 0, eliteSoul: 0, soulMul: 1, partyAtk: 1, partyHp: 1, partyDr: 0, partyRegen: 0, eliteGold: 1, walk: 1, permafrost: 0 };
    const each = (h, fn) => (h === 'all' ? Object.values(hs).forEach(fn) : h === 'g' ? fn(g) : hs[h] && fn(hs[h]));
    for (const n of NODES) {
      const r0 = rank(S, n.id); if (!r0 || !n.fx || (n.sig && !sigOn(S, n.tree))) continue;
      const r = n.cap ? Math.min(r0, n.cap) : r0;
      if (n.over && r0 > n.cap) for (const e of n.over) each(e.h, T => { const ro = r0 - n.cap; if (e.pow) T[e.s] *= Math.pow(e.pow, ro); else if (e.add) T[e.s] += e.add * ro; });
      for (const e of n.fx) each(e.h, T => {
        if (e.pow) T[e.s] *= Math.pow(e.pow, r);
        else if (e.add) T[e.s] += e.add * r;
        else if (e.mul) T[e.s] *= 1 + e.mul * r;
        else if (e.x) T[e.s] *= e.x;
        else if (e.dim) T[e.s] = 1 - (1 - T[e.s]) * Math.pow(1 - e.dim, r);
        if (e.h === 'all' && e.s === 'atk' && T.heal) T.heal *= Math.pow(e.pow, r);
      });
    }
    const achN = Object.keys(S.ach || {}).length;
    const perm = Math.pow(1.1, perk(S, 'p_macht')) * (1 + 0.03 * S.towerBest) * Math.pow(1 + ACH_BONUS, achN) * Math.pow(1.5, cperk(S, 'k_blut'));
    g.gold *= (1 + 0.15 * perk(S, 'p_gold')) * Math.pow(2, cperk(S, 'k_schatz'));
    g.soulMul *= Math.pow(2, cperk(S, 'k_seele')) * altarMul(S);
    const comp = {};
    for (const id of S.compActive || []) { const l = (S.comps || {})[id] || 0; if (l) comp[id] = l; }
    if (comp.eule) { g.gold *= 1 + 0.05 * comp.eule; Object.values(hs).forEach(T => (T.crit += 0.015 * comp.eule)); }
    if (comp.golem) { g.partyDr += Math.min(0.3, 0.015 * comp.golem); g.partyHp *= 1 + 0.03 * comp.golem; }
    if (comp.phoenix) g.partyRegen += 0.0015 * comp.phoenix;
    const bardOn = hs.b && fieldOf(S).includes('b');
    if (bardOn) g.partyAtk *= 1 + hs.b.songAtk;
    if (bardOn && hs.b.muse) { const mc = hs.b.crit * hs.b.muse; for (const [hid, T] of Object.entries(hs)) if (hid !== 'b') T.crit += mc; }
    let seeleSum = 0;
    for (const [hid, T] of Object.entries(hs)) {
      consApply(T, hid, consOf(S, hid));
      const rb = runeBonus(S, hid, runeAmp(S) * (1 + (T.runeSelf || 0))), mb = 1 + 0.02 * mastLevel(S, hid);
      T.atk *= mb; T.hp *= mb; if (T.heal) T.heal *= mb; if (T.wolfAtk) T.wolfAtk *= mb;
      if (bardOn) T.aps *= 1 + hs.b.songAps;
      if (bardOn && hs.b.ensemble) { if (T.wolfAps) T.wolfAps *= 1 + hs.b.songAps; if (T.turretAps) T.turretAps *= 1 + hs.b.songAps; }
      T.atk *= perm * g.partyAtk * (1 + (rb.kraft || 0)); T.hp *= perm * g.partyHp * (1 + (rb.leben || 0)); if (T.heal) T.heal *= perm * (1 + (rb.kraft || 0));
      if (T.wolfAtk) T.wolfAtk *= perm * g.partyAtk * (1 + (rb.kraft || 0));
      T.aps *= 1 + (rb.eile || 0); T.critD *= 1 + (rb.zorn || 0);
      // Abklingzeit höchstens 60 %: jeder Prozentpunkt darüber wird zu +2 % Schaden der Fähigkeiten
      const cdrRaw = T.cdr + (rb.fokus || 0) + (rb.eile || 0) * 0.25;
      T.cdr = Math.min(0.6, cdrRaw); if (cdrRaw > 0.6) T.actMul *= 1 + 2 * (cdrRaw - 0.6);
      // Schadensreduktion: ab 50 % zählt der Rest halb, Schutz-Runen zählen immer voll (höchstens 72 %)
      const drRaw = T.dr + g.partyDr, drAll = (drRaw <= 0.5 ? drRaw : 0.5 + (drRaw - 0.5) * 0.5) + (rb.schutz || 0); T.dr = Math.min(0.72, drAll);
      // Schutz über 72 %: jeder Prozentpunkt darüber wird zu +2 % Leben
      if (drAll > 0.72 && rb.schutz) { const over = Math.min(rb.schutz, drAll - 0.72); T.hp *= 1 + 2 * over; } T.block = Math.min(0.35, T.block); T.regen += g.partyRegen;
      g.gold *= 1 + (rb.glueck || 0); g.eliteSoul += rb.seele || 0; seeleSum += rb.seele || 0;
    }
    // Seelen-Runen: zusätzlich mehr Seelen von Bossen (wächst langsamer als die Elite-Chance)
    if (seeleSum > 0) g.soulMul *= 1 + 0.1 * Math.sqrt(seeleSum);
    // Resonanz: jede Rune im Golem stärkt alle anderen Helden
    if (hs.o && hs.o.reson) { const n = golemRunes(S); if (n) for (const [hid, T] of Object.entries(hs)) if (hid !== 'o') { const f = 1 + hs.o.reson * n; T.atk *= f; if (T.heal) T.heal *= f; if (T.wolfAtk) T.wolfAtk *= f; } }
    g.walk = Math.min(3, g.walk);
    const area = Math.min(S.area || 0, areaMax(S));
    const startStage = 1 + 10 * area;
    const field = fieldOf(S);
    const dragon = comp.drache ? 0.3 * (1 + 0.2 * comp.drache) * field.reduce((a, k) => a + (hs[k] ? hs[k].atk : 0), 0) : 0;
    return { ...hs, ...Object.fromEntries(HEROES.filter(h => !hs[h.id]).map(h => [h.id, null])), g, soulBonus: perk(S, 'p_seele'), startStage, cap: capOf(S), comp, dragon, field, slots: fieldSlots(S) };
  }
  // Expeditionen (ab dem 1. Aufstieg): Missionen geben Heldensplitter und mit etwas Glück Puzzleteile
  const MISSIONS = [
    { id: 'streif', name: 'Streifzug', desc: 'Überstehe 15 Wellen.', waves: 15, spl: [4, 6], start: 0.9, icon: '⚑' },
    { id: 'bosse', name: 'Bosshatz', desc: 'Besiege 4 Bosse. Jede dritte Welle bringt einen.', bosses: 4, spl: [4, 6], start: 0.87, icon: '♛' },
    { id: 'festung', name: 'Belagerung', desc: 'Überstehe 25 Wellen, ohne dass ein Held fällt.', waves: 25, spl: [4, 6], start: 0.81, noLoss: true, icon: '⛉' },
    { id: 'h_a', hero: 'a', area: 'schatten', name: 'Schattenviertel', desc: 'Schleiche 18 Wellen durch die Gassen der Diebesgilde. Jede 6. Welle stellt sich dir die Gildenmeisterin. Nur hier findest du Teile der Assassine.', waves: 18, bossEvery: 6, spl: [2, 3], start: 0.85, icon: '☾' },
    { id: 'h_n', hero: 'n', area: 'friedhof', name: 'Vergessener Friedhof', desc: 'Überstehe 18 Wellen zwischen den Gräbern. Jede 6. Welle gräbt sich der Totengräber aus der Erde. Nur hier findest du Teile des Nekromanten.', waves: 18, bossEvery: 6, spl: [2, 3], start: 0.85, icon: '☠' },
    { id: 'h_b', hero: 'b', area: 'theater', name: 'Geistertheater', desc: 'Spiele 18 Wellen lang auf der verfluchten Bühne. Jede 6. Welle zieht der Puppenspieler die Fäden. Nur hier findest du Teile des Barden.', waves: 18, bossEvery: 6, spl: [2, 3], start: 0.85, icon: '♪' },
    { id: 'h_d', hero: 'd', area: 'hain', name: 'Verdorbener Hain', desc: 'Kämpfe dich 18 Wellen durch den kranken Wald. Jede 6. Welle bricht der Moderhirsch durchs Unterholz. Nur hier findest du Teile der Druidin.', waves: 18, bossEvery: 6, spl: [2, 3], start: 0.85, icon: '❀' },
    { id: 'h_e', hero: 'e', area: 'werk', name: 'Uhrwerkfabrik', desc: 'Überstehe 18 Wellen in der verlassenen Fabrik. Jede 6. Welle stampft der Dampfkoloss heran. Nur hier findest du Teile der Tüftlerin.', waves: 18, bossEvery: 6, spl: [2, 3], start: 0.85, icon: '⚙' },
    { id: 'mine', hero: 'o', area: 'mine', name: 'Runenmine', desc: 'Dringe 18 Wellen tief in die alte Runenmine vor. Jede 6. Welle erwacht der Runenwächter. Nur hier findest du Teile des Runengolems, und jeder Sieg bringt eine Rune.', waves: 18, bossEvery: 6, spl: [2, 3], start: 0.85, icon: '⬢', rune: true },
  ];
  const MISSION = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
  // Themengebiete der Puzzle-Helden: eigene Umgebung, eigene Gegner und ein eigener Boss
  const AREAS = {
    schatten: { name: 'Schattenviertel', melee: 'meuchler', ranged: 'armbrust', boss: 'Die Gildenmeisterin', bk: 'x_schatten', col: '#ff6b7a' },
    friedhof: { name: 'Vergessener Friedhof', melee: 'ghul', ranged: 'irrlicht', boss: 'Der Totengräber', bk: 'x_friedhof', col: '#6be0b8' },
    theater: { name: 'Geistertheater', melee: 'marionette', ranged: 'maske', boss: 'Der Puppenspieler', bk: 'x_theater', col: '#ff8ac8' },
    hain: { name: 'Verdorbener Hain', melee: 'faulwurz', ranged: 'dornfalter', boss: 'Der Moderhirsch', bk: 'x_hain', col: '#9bd14a' },
    werk: { name: 'Uhrwerkfabrik', melee: 'blechling', ranged: 'kanonier', boss: 'Der Dampfkoloss', bk: 'x_werk', col: '#f28c28' },
    mine: { name: 'Runenmine', melee: 'grubenwicht', ranged: 'kristallwisp', boss: 'Der Runenwächter', bk: 'x_mine', col: '#46d4ee' },
  };
  const areaOf = run => (run && run.mode === 'exp' && MISSION[run.mission] && AREAS[MISSION[run.mission].area]) || null;
  const bossNameOf = (run, stage) => (run && run.wb ? WB_BOSS[run.wb.bk % WB_BOSS.length].name : areaOf(run) ? areaOf(run).boss : bossOf(stage));
  const heroMission = id => MISSIONS.find(m => m.hero === id);
  const PIECE_COST = 100, PIECE_CHANCE = 0.06, PIECE_DUP = 50;
  const expOpen = S => S.asc >= 1 || (S.exp && S.exp.done > 0);
  const expStage = (S, m) => Math.max(1, Math.round(Math.max(S.ascBest || 0, S.best || 0) * m.start));
  function claimExp(S, run) {
    const m = MISSION[run.mission]; if (!m || !run.victory) return null;
    const spl = m.spl[0] + Math.floor(Math.random() * (m.spl[1] - m.spl[0] + 1));
    S.exp.spl += spl; S.exp.done++;
    const id = m.hero || null, have = id ? pieceMask(S, id) : 63, missing = [0, 1, 2, 3, 4, 5].filter(i => !(have & (1 << i)));
    let piece = null, rune = null, runeDust = 0;
    if (m.rune && feature(S, 'runen')) { const d0 = S.dust; rune = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, bossRuneTier(run.stage)); runeDust = S.dust - d0; }
    // Jedes der 6 Teile kann fallen. Hat man es schon, wird es zu Heldensplittern.
    let dup = null;
    if (id && Math.random() < PIECE_CHANCE) { const k = Math.floor(Math.random() * 6); if (have & (1 << k)) { dup = k; S.exp.spl += PIECE_DUP; } else { piece = k; S.exp.pieces[id] = have | (1 << piece); } }
    const complete = piece != null && id && assembled(S, id);
    if (complete) puzzleHire(S, id);
    return { spl, piece, dup, dupSpl: dup != null ? PIECE_DUP : 0, hero: id, complete, rune, runeDust };
  }
  // Fertiges Puzzle: der Held schließt sich sofort kostenlos an
  function puzzleHire(S, id) { const h = HERO_BY_ID[id]; if (h && h.hire && assembled(S, id) && !rank(S, h.hire)) S.nodes[h.hire] = 1; }
  function buyPiece(S, id, i) {
    if (!PUZZLE.includes(id) || !(i >= 0 && i < 6) || (pieceMask(S, id) & (1 << i)) || S.exp.spl < PIECE_COST) return false;
    S.exp.spl -= PIECE_COST; S.exp.pieces[id] = pieceMask(S, id) | (1 << i);
    puzzleHire(S, id);
    return true;
  }
  // Werte mit den Regeln der Tages-Herausforderung
  function statsFor(S, mode) {
    const st = stats(S);
    if (mode === 'exp') { const m = MISSION[S.exp.mission] || MISSIONS[0]; st.cap = Infinity; st.startStage = expStage(S, m); st.rules = m.rules || []; return st; }
    if (mode === 'ahnen') { st.cap = Infinity; ahnApplyBoons(S, st); return st; }
    if (mode === 'bounty') { st.cap = Infinity; return st; }
    if (mode === 'wboss') { st.cap = Infinity; return st; }
    if (mode !== 'weekly') return st;
    const rules = weekRules(dayId());
    for (const h of HEROES) { const T = st[h.id]; if (!T) continue;
      if (rules.includes('glass')) { T.hp *= 0.5; T.atk *= 2; T.wolfAtk *= 2; }
      if (rules.includes('giant')) { T.aps *= 1.5; T.wolfAps *= 1.5; }
      if (rules.includes('noheal')) { T.regen = 0; T.lifesteal = 0; T.heal = 0; }
    }
    if (rules.includes('noheal')) st.g.partyRegen = 0;
    st.cap = Infinity; st.startStage = 1; st.rules = rules;
    return st;
  }

  /* ================= Aktive Fähigkeiten ================= */
  const near = run => run.enemies.filter(e => e.x < 300 + (e.reach || 0));
  const engaged = run => run.enemies[0] && run.enemies[0].x < run.frontX + 70 + (run.enemies[0].reach || 0);
  const strongest = (run, maxX = 400) => run.enemies.filter(e => e.x < maxX).sort((a, b) => b.hp - a.hp)[0];
  const anyBelow = (run, st, f) => run.order.some(k => run.h[k].alive && run.h[k].hp < st[k].hp * f);
  const ACT = {
    wirbel: { cd: (r, S) => 19 - r - (rank(S, 'r_tanz') ? 3 : 0), ready: run => near(run).length >= 3 || near(run).some(e => e.boss), cast: (c, r) => near(c.run).forEach(e => c.hit('r', e, (2 + 0.5 * (r - 1)) * c.st.r.actMul)) },
    heil: { cd: () => 22, ready: (run, st) => anyBelow(run, st, 0.55), cast: (c, r) => c.healSplit('r', 0.4 + 0.08 * (r - 1), 0.1 + 0.03 * (r - 1)) },
    blitz: { cd: () => 14, ready: run => !!strongest(run, 320), cast: (c, r) => { const t = strongest(c.run, 320); c.hit('r', t, (4 + 1.5 * (r - 1)) * c.st.r.actMul, '#cfe6ff'); c.run.fx.blitzX = t.x; c.run.shake = 0.25; } },
    schild: { cd: () => 9, ready: engaged, cast: (c, r) => { const m = (2.5 + 0.5 * (r - 1)) * c.st.r.actMul; for (let i = 0; i < 2; i++) { const e = c.run.enemies.find(x => x.hp > 0); if (e) c.hit('r', e, m, '#ffe0a8'); } if (c.run.cds.wirbel > 0) c.run.cds.wirbel = Math.max(0, c.run.cds.wirbel - 3); } },
    schrei: { minCd: (S, st) => (st.r && st.r.schwur ? 24 : 0), cd: () => 20, ready: engaged, cast: (c, r) => { c.run.buffT = (c.st.r.schwur ? 12 : 6) + (c.st.r.cSchrei || 0); c.run.buffMul = 0.4 + 0.15 * (r - 1); c.float('r', 'Kriegsschrei!', '#ffb547'); } },
    w_wall: { cd: () => 12, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => { near(c.run).forEach(e => { c.hit('w', e, (1.5 + 0.5 * (r - 1)) * c.st.w.actMul, '#cfe0ff'); e.stun = Math.max(e.stun, 1); }); c.run.shake = 0.2; } },
    w_haut: { cd: () => 16, ready: (run, st) => run.h.w.hp < st.w.hp * (st.w.wille ? 0.9 : 0.7), cast: (c, r) => { c.run.hautT = 5 + r + (c.st.w.wille ? 3 : 0); c.float('w', 'Eiserne Haut', '#7fb2ff'); } },
    w_rache: { cd: () => 15, ready: engaged, cast: (c, r) => { c.run.racheT = 6 + r; c.float('w', 'Vergeltung', '#7fb2ff'); } },
    s_hagel: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 380); for (let i = 0, n = 6 + (c.st.s.cHagel || 0); i < n; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('s', e, 0.3 + i * 0.06, 'hag'); c.hit('s', e, (1.2 + 0.4 * (r - 1)) * c.st.s.actMul, '#c8f5cf'); } } },
    s_falke: { cd: () => 12, ready: run => !!strongest(run, 380), cast: (c, r) => { const t = strongest(c.run, 380); c.hit('s', t, (3.5 + 1.2 * (r - 1)) * c.st.s.actMul, '#c8f5cf'); t.mark = Math.max(t.mark || 0, 0.25); t.markT = 5; c.run.fx.falkeX = t.x; } },
    s_gift: { cd: () => 10, ready: run => !!strongest(run, 380), cast: (c, r) => { const t = strongest(c.run, 380); const stack = c.st.s.toxik ? Math.min(3, (t.poisonT > 0 ? t.poisonN || 1 : 0) + 1) : 1; t.poisonN = stack; t.poison = c.st.s.atk * (3 + (r - 1)) * c.st.s.actMul / 5 * stack; t.poisonT = 5; c.arrow('s', t, 0.35, 'gift'); } },
    m_meteor: { cd: () => 18, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { const n = c.st.m.schauer ? 3 : 1; for (let i = 0; i < n; i++) c.run.enemies.filter(e => e.x < 520 && e.hp > 0).forEach(e => c.hit('m', e, (5 + 1.5 * (r - 1)) * c.st.m.actMul * (n > 1 ? 0.5 : 1), '#ffb070')); c.run.shake = 0.3; } },
    m_eis: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => near(c.run).forEach(e => { c.hit('m', e, (1.5 + 0.5 * (r - 1)) * c.st.m.actMul, '#bfe6ff'); e.stun = Math.max(e.stun, 1.5); e.frozen = 1.5; }) },
    m_kette: { cd: () => 10, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { const ts = c.run.enemies.filter(e => e.x < 450).slice(0, 3 + r + (c.st.m.cKette || 0)); c.run.fx.chain = ts.map(e => e.x); ts.forEach(e => c.hit('m', e, 2.5 * c.st.m.actMul, '#e2c9ff')); } },
    p_segen: { cd: () => 18, ready: (run, st) => anyBelow(run, st, 0.6), cast: (c, r) => c.healAll(0.3 + 0.08 * (r - 1), 'p') },
    p_schild: { cd: () => 16, ready: engaged, cast: (c, r) => c.run.order.forEach(k => { const h = c.run.h[k]; if (h.alive) h.shield = Math.max(h.shield, c.st[k].hp * (0.2 + 0.05 * (r - 1)) * (c.st.p.hohe ? 2 : 1) * (1 + (c.st.p.cSchild || 0))); }) },
    p_wieder: { cd: (r, S) => (rank(S, 'p_k2') ? 20 : 40), ready: run => run.order.some(k => !run.h[k].alive), cast: (c, r) => { const k = c.run.order.find(k => !c.run.h[k].alive); const h = c.run.h[k]; h.alive = true; h.hp = c.st[k].hp * (0.4 + 0.15 * (r - 1)); c.float(k, 'Wiederbelebt!', '#ffe48a'); sigRevive(c, k); } },
    t_rudel: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.packT = 8 + 2 * (r - 1) + (c.st.t.cRudel || 0); c.float('t', 'Rudelruf!', '#d9935a'); } },
    t_wurzel: { cd: () => 15, ready: run => near(run).length >= 1, cast: (c, r) => c.run.enemies.filter(e => e.x < 460).forEach(e => { c.hit('t', e, 1.2 * c.st.t.actMul, '#b5e08a'); e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1)); e.rooted = 2; }) },
    t_sprung: { cd: () => 12, ready: run => !!strongest(run, 360), cast: (c, r) => { const t = strongest(c.run, 360); c.hit('t', t, (6 + 2 * (r - 1)) * c.st.t.actMul, '#ffd2a8', true); c.run.fx.sprungX = t.x;
      if (c.st.t.leit) c.run.enemies.filter(e => e !== t && e.x < 420).sort((a, b) => b.hp - a.hp).slice(0, 2).forEach(e => c.hit('t', e, (6 + 2 * (r - 1)) * c.st.t.actMul, '#ffd2a8', true)); } },
    a_schatten: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 480), cast: (c, r) => {
      const vis = c.run.enemies.filter(e => e.x < 480), rng = vis.filter(e => e.ranged), ts = (rng.length ? rng : [...vis].sort((a, b) => b.x - a.x)).slice(0, 2 + (c.st.a.cSchatten || 0));
      ts.forEach(e => c.hit('a', e, (6 + 2 * (r - 1)) * c.st.a.actMul * (e.ranged ? 1 + c.st.a.rangedDmg : 1), '#ff6b7a')); c.run.fx.shadowXs = ts.map(e => e.x); } },
    a_sturm: { cd: () => 12, ready: run => run.enemies.some(e => e.x < 400), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 400); for (let i = 0, n = 8 + (c.st.a.cSturm || 0); i < n; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('a', e, 0.2 + i * 0.05, 'kunai'); c.hit('a', e, (1.2 + 0.4 * (r - 1)) * c.st.a.actMul, '#ffc2c8'); } } },
    a_mal: { cd: () => 15, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); c.hit('a', t, (3 + (r - 1)) * c.st.a.actMul, '#ff6b7a'); t.mark = Math.max(t.mark || 0, 0.4 + (c.st.a.cMal || 0)); t.markT = 6; c.efloat(t, 'Todesmal', '#ff6b7a', 13); } },
    n_heer: { cd: () => 20, ready: engaged, cast: (c, r) => { for (let i = 0; i < 2 + r + (c.st.n.cHeer || 0); i++) c.run.minions.push({ t: c.st.n.minionLong ? 24 : 12, atkT: 0.3 + i * 0.15, swing: 0 }); c.float('n', 'Totenheer!', '#6be0b8'); } },
    n_raub: { cd: () => 12, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); const d = c.hit('n', t, (3 + (r - 1)) * c.st.n.actMul, '#6be0b8'); c.healAllAbs(d * 0.15); c.run.fx.raubX = t.x; } },
    n_fluch: { cd: () => 16, ready: run => run.enemies.some(e => e.x < 420), cast: (c, r) => { c.run.enemies.forEach(e => { e.mark = Math.max(e.mark || 0, 0.25 + 0.1 * (r - 1)); e.markT = 6; e.cursed = 6; }); c.float('n', 'Fluch!', '#6be0b8'); } },
    b_krieg: { cd: (r, S) => (rank(S, 'sg_b_takt') && sigOn(S, 'barde') ? 18 * 0.6 : 18), ready: engaged, cast: (c, r) => { c.run.songT = 6 + (c.st.b.cKrieg || 0); c.run.songMul = (0.3 + 0.1 * (r - 1)) * (1 + (c.st.b.cKriegMul || 0)); c.float('b', 'Kriegslied!', '#ff8ac8'); } },
    b_wiegen: { cd: () => 16, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => near(c.run).forEach(e => { e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1) + (c.st.b.cWiegen || 0)); e.sleep = 2 + 0.5 * (r - 1) + (c.st.b.cWiegen || 0); }) },
    b_schall: { cd: () => 12, ready: run => near(run).length >= 1, cast: (c, r) => { near(c.run).forEach(e => { c.hit('b', e, (2 + 0.6 * (r - 1)) * c.st.b.actMul, '#ffd0ea'); e.x += e.boss ? 15 : 40; }); c.run.fx.schallX = c.run.pos.b || 80; } },
    d_ranken: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => c.run.enemies.filter(e => e.x < 460).forEach(e => { c.hit('d', e, 1.5 * c.st.d.actMul, '#c8f08a'); e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1) + (c.st.d.cRanken || 0)); e.rooted = 2 + 0.5 * (r - 1) + (c.st.d.cRanken || 0); }) },
    d_bruell: { minCd: (S, st) => (st.d && st.d.rinde ? 32 : 0), cd: () => 18, ready: engaged, cast: (c, r) => { c.run.roarT = (6 + (r - 1) + (c.st.d.cBruell || 0)) * (c.st.d.rinde ? 2 : 1); c.float('d', 'Bärengebrüll!', '#9bd14a'); c.run.shake = 0.2; } },
    d_adler: { cd: () => 12, ready: run => run.enemies.some(e => e.x < 480), cast: (c, r) => {
      const vis = c.run.enemies.filter(e => e.x < 480), rng = vis.filter(e => e.ranged), base = (rng.length ? rng : [...vis].sort((a, b) => b.x - a.x)).slice(0, 3 + (c.st.d.cAdler || 0)), ts = [...base, ...[...vis].filter(e => !base.includes(e)).sort((a, b) => b.x - a.x)].slice(0, 3 + (c.st.d.eagle || 0) + (c.st.d.cAdler || 0));
      ts.forEach(e => c.hit('d', e, (3 + (r - 1)) * c.st.d.actMul, '#e8f5c8')); c.run.fx.adlerXs = ts.map(e => e.x); } },
    e_turm2: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.extraTurretT = (10 + 2 * (r - 1)) * (1 + (c.st.e.cTurm || 0)); c.float('e', 'Geschütz gebaut!', '#f28c28'); } },
    e_streu: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 400), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 400); for (let i = 0, n = (c.st.e.splitter ? 10 : 6) + (c.st.e.cStreu || 0); i < n; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('e', e, 0.3 + i * 0.07, 'bomb'); c.hit('e', e, (1.5 + 0.5 * (r - 1)) * c.st.e.actMul, '#ffc58a'); c.burst(e.x, 196, '#ff9a3d', 6); } } },
    e_mine: { cd: () => 15, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => { near(c.run).forEach(e => { c.hit('e', e, (2.5 + 0.8 * (r - 1)) * c.st.e.actMul, '#ffc58a'); e.stun = Math.max(e.stun, 1); c.burst(e.x, 214, '#ffd23f', 10); }); c.run.shake = 0.25; } },
  };

  // Aktive Fähigkeiten der Ahnensiegel
  const aliveIn = run => run.order.filter(k => run.h[k].alive);
  Object.assign(ACT, {
    sg_r_schlag: { minCd: 16, cd: () => 20, ready: run => engaged(run) && aliveIn(run).some(k => k !== 'r'), cast: (c, r) => {
      const k = aliveIn(c.run).filter(x => x !== 'r').sort((a, b) => c.st[b].atk - c.st[a].atk)[0]; if (!k) return;
      c.run.atkB[k] = { t: 8, v: 0.5 + 0.15 * (r - 1) }; c.float(k, 'Ritterschlag!', '#ffb547', 15); } },
    sg_r_banner: { minCd: 24, cd: () => 35, ready: (run, st) => anyBelow(run, st, 0.35), cast: (c, r) => { c.run.honorT = 8 + (r - 1); c.float('r', 'Banner der Ehre!', '#ffd27a', 15); } },
    sg_r_duell: { minCd: 16, cd: () => 18, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); t.duelT = 8; t.duelV = 1 + 0.25 * (r - 1); c.efloat(t, 'Duell!', '#ffb547', 15); } },
    o_wall: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.golemT = 5 + (r - 1) + (c.st.o.cWall || 0); c.float('o', 'Runenwall!', '#46d4ee', 15); } },
    o_beben: { cd: () => 14, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => { near(c.run).forEach(e => { c.hit('o', e, (2 + 0.6 * (r - 1)) * c.st.o.actMul, '#bff4ff'); e.stun = Math.max(e.stun, 1.2); }); c.run.shake = 0.3; } },
    o_glyphe: { cd: () => 22, ready: engaged, cast: (c, r) => { const v = c.st.o.hp * (0.12 + 0.04 * (r - 1)) * (1 + (c.st.o.cGlyphe || 0)); c.run.order.forEach(k => { const h = c.run.h[k]; if (h.alive) h.shield = Math.max(h.shield || 0, v); }); c.float('o', 'Schutzglyphe', '#46d4ee'); } },
    sg_o_monolith: { minCd: 18, cd: () => 22, ready: engaged, cast: (c, r) => { c.run.golemT = c.run.monoT = 5 + (r - 1); c.float('o', 'Monolith!', '#46d4ee', 15); } },
    sg_o_sturm: { minCd: 16, cd: () => 18, ready: run => run.enemies.some(e => e.x < 400), cast: (c, r) => { c.run.stormT = 6 * (c.st.o.stormX ? 2 : 1); c.run.stormV = (0.8 + 0.2 * (r - 1)) * c.st.o.actMul; c.run.stormTick = 0; c.float('o', 'Runensturm', '#46d4ee'); } },
    sg_o_spalt: { cd: () => 16, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); c.hit('o', t, (4 + (r - 1)) * c.st.o.actMul, '#bff4ff'); t.stun = Math.max(t.stun, 2); c.run.fx.spaltX = t.x; c.run.shake = 0.35; } },
    sg_w_spott: { minCd: 14, cd: () => 18, ready: run => engaged(run), cast: (c, r) => { c.run.tauntT = 5 + (r - 1); c.float('w', 'Spott!', '#7fb2ff', 15); } },
    sg_w_beben: { cd: () => 16, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => {
      c.run.enemies.filter(e => e.x < 520).forEach(e => { c.hit('w', e, (2.5 + 0.6 * (r - 1)) * c.st.w.actMul, '#cfe0ff'); e.quakeT = 4; }); c.run.shake = 0.35; } },
    sg_w_prall: { minCd: 12, cd: () => 15, ready: run => run.enemies.some(e => (e.ranged || e.ahn) && e.x < 470), cast: (c, r) => { c.run.prallT = 6; c.run.prallV = (2 + 0.6 * (r - 1)) * c.st.w.actMul; c.float('w', 'Prallschild', '#7fb2ff'); } },
    sg_s_ziel: { cd: () => 16, ready: run => !!strongest(run, 420) && !(run.aimT > 0), cast: (c, r) => { c.run.aimT = 1.5; c.run.aimV = (12 + 4 * (r - 1)) * c.st.s.actMul; c.float('s', 'Zielt …', '#c8f5cf'); } },
    sg_s_sperr: { minCd: 12, cd: () => 18, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { c.run.apsB.s = { t: 4 + (r - 1), v: 2 }; c.float('s', 'Sperrfeuer!', '#7ee08a'); } },
    sg_s_sprung: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => {
      c.run.enemies.slice(0, 2).forEach(e => c.hit('s', e, (2 + 0.6 * (r - 1)) * c.st.s.actMul, '#c8f5cf')); const h = c.run.h.s; if (h) h.invT = 2; c.float('s', 'Rückzug!', '#7ee08a'); } },
    sg_m_loch: { minCd: 8, cd: () => 18, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => {
      c.run.holeT = 3; c.run.holeTick = 0; c.run.holeV = (1.5 + 0.5 * (r - 1)) * c.st.m.actMul; c.run.holeX = Math.min(430, (c.run.enemies[0] ? c.run.enemies[0].x : 300) + 50); } },
    sg_m_strahl: { cd: () => 16, ready: run => !!strongest(run, 420), cast: (c, r) => { c.run.beam = { t: 3, tick: 0, i: 0, v: (1 + 0.25 * (r - 1)) * c.st.m.actMul }; } },
    sg_m_mana: { minCd: 12, cd: () => 16, ready: run => !!strongest(run, 420), cast: (c, r) => { const t = strongest(c.run, 420); t.manaT = 4 + (r - 1); c.efloat(t, 'Manabrand', '#c08cff', 14); } },
    sg_p_boden: { minCd: 16, cd: () => 22, ready: (run, st) => anyBelow(run, st, 0.8), cast: (c, r) => { c.run.groundT = 8; c.run.groundV = 0.03 + 0.01 * (r - 1); c.float('p', 'Heiliger Boden', '#ffe48a'); } },
    sg_p_eile: { minCd: 12, cd: () => 18, ready: run => engaged(run) || run.enemies.some(e => e.x < 380), cast: (c, r) => {
      aliveIn(c.run).sort((a, b) => c.st[b].atk - c.st[a].atk).slice(0, 2).forEach(k => { c.run.apsB[k] = { t: 6, v: 0.5 + 0.1 * (r - 1) }; c.float(k, 'Eile!', '#ffe48a', 13); }); } },
    sg_p_gebet: { cd: () => 20, ready: (run, st, S) => S.equip.some(id => NODE[id].tree !== 'priester' && run.cds[id] > 3), cast: (c, r) => {
      for (const id of c.S.equip) if (NODE[id].tree !== 'priester' && c.run.cds[id] > 0) c.run.cds[id] = Math.max(0, c.run.cds[id] - (4 + (r - 1))); c.float('p', 'Gebet der Eile', '#ffe48a'); } },
    sg_t_eber: { cd: () => 14, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => {
      c.run.enemies.filter(e => e.x < 520).forEach(e => { c.hit('t', e, (2.5 + 0.8 * (r - 1)) * c.st.t.actMul, '#ffd2a8'); e.stun = Math.max(e.stun, e.boss ? 0.5 : 1); }); c.run.fx.eberX = 0; c.run.shake = 0.2; } },
    sg_t_geheul: { minCd: 16, cd: () => 18, ready: run => engaged(run), cast: (c, r) => { c.run.howlT = 6 + (r - 1); c.float('t', 'Wolfsgeheul!', '#d9935a'); } },
    sg_t_instinkt: { cd: () => 20, ready: (run, st) => run.h.t && run.h.t.hp < st.t.hp * 0.5, cast: (c, r) => c.healOne('t', c.st.t.hp * (0.35 + 0.1 * (r - 1))) },
    sg_a_kehle: { cd: () => 10, ready: run => run.enemies.some(e => e.x < 480 && (e.boss || e.hp < e.max * 0.25)), cast: (c, r) => {
      const vis = c.run.enemies.filter(e => e.x < 480), low = vis.filter(e => !e.boss && e.hp < e.max * 0.25).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (low) { low.hp = 0; low.lastBy = 'a'; c.efloat(low, 'Kehlschnitt!', '#ff6b7a', 15); c.burst(low.x, 190, '#ff6b7a', 10); }
      else { const b = vis.find(e => e.boss); if (b) c.hit('a', b, (5 + 1.5 * (r - 1)) * c.st.a.actMul, '#ff6b7a'); } } },
    sg_a_klon: { minCd: 16, cd: () => 20, ready: run => run.enemies.some(e => e.x < 420), cast: (c, r) => { c.run.cloneT = 8; c.run.cloneV = 0.5 + 0.15 * (r - 1); c.run.cloneAtk = 0.2; c.float('a', 'Schattenklon', '#ff6b7a'); } },
    sg_a_mal: { cd: () => 16, ready: run => run.enemies.filter(e => e.x < 480).length >= 2, cast: (c, r) => {
      c.run.enemies.filter(e => e.x < 480).slice(0, 3).forEach(e => { e.smarkT = 8; c.efloat(e, '✕', '#ff6b7a', 16); }); c.run.smarkV = (4 + 1.2 * (r - 1)) * c.st.a.actMul; } },
    sg_n_wand: { minCd: 14, cd: () => 22, ready: run => engaged(run), cast: (c, r) => { c.run.wallT = 4 + (r - 1); c.float('n', 'Knochenwand!', '#6be0b8', 15); } },
    sg_n_riese: { minCd: 24, cd: () => 25, ready: run => engaged(run) && !run.giant, cast: (c, r) => { const hp = c.st.n.hp * (3 + (r - 1)); c.run.giant = { t: 12, hp, max: hp }; c.float('n', 'Knochenriese!', '#6be0b8', 15); } },
    sg_n_fessel: { minCd: 16, cd: () => 16, ready: run => run.enemies.filter(e => e.x < 480).length >= 2, cast: (c, r) => {
      [...c.run.enemies].filter(e => e.x < 480).sort((a, b) => b.hp - a.hp).slice(0, 3).forEach(e => { e.linkT = 6 + (r - 1); c.efloat(e, '∞', '#6be0b8', 16); }); } },
    sg_b_diss: { minCd: 14, cd: () => 16, ready: run => engaged(run), cast: (c, r) => { c.run.enemies.forEach(e => (e.dissT = 5 + (r - 1))); c.float('b', 'Dissonanz!', '#ff8ac8'); } },
    sg_b_echo: { cd: r => 20 - 2 * (r - 1), ready: (run, st, S) => { const id = run.lastAct; return !!(id && ACT[id] && rank(S, id) && !minCdOf(id, S, st) && ACT[id].ready(run, st, S)); }, cast: (c, r) => {
      const id = c.run.lastAct; if (!id) return; try { ACT[id].cast(c, rank(c.S, id)); c.run.fx[id] = 0.5; } catch (err) {} c.float('b', `Echo: ${NODE[id].name}`, '#ff8ac8', 13); } },
    sg_b_ahnen: { minCd: 16, cd: () => 20, ready: run => engaged(run) || run.enemies.some(e => e.x < 380), cast: (c, r) => { c.run.critBT = 8; c.run.critBV = 0.25 + 0.05 * (r - 1); c.float('b', 'Ballade der Ahnen', '#ffd27a'); } },
    sg_d_gestalt: { minCd: 20, cd: () => 22, ready: run => engaged(run), cast: (c, r) => { c.run.bearT = 8 + (r - 1); c.float('d', 'Wildgestalt!', '#9bd14a', 15); } },
    sg_d_wachs: { minCd: 20, cd: () => 24, ready: run => engaged(run), cast: (c, r) => {
      const f = 0.2 + 0.05 * (r - 1); c.run.growT = 10;
      aliveIn(c.run).forEach(k => { const h = c.run.h[k], add = c.st[k].hp * f; if (h.growS) h.shield = Math.max(0, (h.shield || 0) - h.growS); h.shield = (h.shield || 0) + add; h.growS = add; }); c.float('d', 'Wachstum', '#9bd14a'); } },
    sg_d_gewalt: { minCd: 14, cd: () => 20, ready: run => engaged(run), cast: (c, r) => { c.run.natureT = 5 + (r - 1); c.float('d', 'Naturgewalt', '#9bd14a'); } },
    sg_e_flamme: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => { c.run.flameT = 3; c.run.flameTick = 0; c.run.flameV = (2 + 0.5 * (r - 1)) * c.st.e.actMul; } },
    sg_e_rakete: { cd: () => 15, ready: run => !!strongest(run, 420), cast: (c, r) => {
      const t = strongest(c.run, 420); c.run.fx.raketeX = t.x; for (let i = 0; i < 3; i++) { c.arrow('e', t, 0.3 + i * 0.12, 'rakete'); c.hit('e', t, (4 + 1.2 * (r - 1)) * c.st.e.actMul, '#ffc58a'); } c.burst(t.x, 180, '#ff9a3d', 14); c.run.shake = 0.2; } },
    sg_e_druck: { minCd: 16, cd: () => 18, ready: run => engaged(run) || run.enemies.some(e => e.x < 420), cast: (c, r) => { c.run.overT = 6 + (r - 1); c.float('e', 'Überdruck!', '#f28c28'); } },
  });
  // Mindestabstand zwischen zwei Einsätzen: Effekte mit Dauer laufen höchstens die halbe Zeit, egal wie schnell sie laden
  const minCdOf = (id, S, st) => { const m = ACT[id] && ACT[id].minCd; return typeof m === 'function' ? m(S, st) : m || 0; };
  // Wird jeden Schritt aufgerufen: laufende Siegel-Effekte
  function sigStep(S, st, run, c, dt) {
    for (const k in run.atkB) if (run.atkB[k]) { run.atkB[k].t -= dt; if (run.atkB[k].t <= 0) run.atkB[k] = null; }
    for (const k in run.apsB) if (run.apsB[k]) { run.apsB[k].t -= dt; if (run.apsB[k].t <= 0) run.apsB[k] = null; }
    for (const key of ['golemT', 'monoT', 'shatterT', 'honorT', 'huntT', 'tauntT', 'prallT', 'howlT', 'cloneT', 'wallT', 'critBT', 'bearT', 'natureT', 'overT', 'tinkT', 'wrathT', 'bloomT', 'groundT', 'growT', 'falkT']) if (run[key] > 0) run[key] -= dt;
    // Runensturm
    if (run.stormT > 0) { run.stormT -= dt; run.stormTick -= dt; if (run.stormTick <= 0 && run.h.o && run.h.o.alive) { run.stormTick += 1; near(run).forEach(e => c.hit('o', e, run.stormV, '#bff4ff')); } }
    // Zielschuss
    if (run.aimT > 0) { run.aimT -= dt; if (run.aimT <= 0) { const t = [...run.enemies].filter(e => e.x < 480).sort((a, b) => b.hp - a.hp)[0]; if (t && run.h.s && run.h.s.alive) { c.arrow('s', t, 0.18, 'hag'); c.hit('s', t, run.aimV, '#c8f5cf'); c.efloat(t, 'Zielschuss!', '#7ee08a', 16); run.shake = 0.15; } } }
    // Schwarzes Loch
    if (run.holeT > 0) { run.holeT -= dt; run.holeTick -= dt; for (const e of run.enemies) if (e.x < 520) { e.x += (run.holeX - e.x) * Math.min(1, dt * 3); e.stun = Math.max(e.stun, 0.15); }
      if (run.holeTick <= 0) { run.holeTick += 0.5; run.enemies.filter(e => e.x < 520).forEach(e => c.hit('m', e, run.holeV * 0.5, '#e2c9ff')); } }
    // Arkaner Strahl
    if (run.beam) { const B = run.beam; B.t -= dt; B.tick -= dt;
      if (B.tick <= 0 && B.i < 6) { B.tick += 0.5; B.i++; B.tgt = B.tgt && B.tgt.hp > 0 ? B.tgt : strongest(run, 480); if (B.tgt && run.h.m && run.h.m.alive) c.hit('m', B.tgt, 0.714 * B.i * B.v, '#e2c9ff'); }
      if (B.t <= 0 || B.i >= 6) run.beam = null; }
    // Heiliger Boden
    if (run.groundT > 0 && !run.noheal && run.h.p && run.h.p.alive) for (const k of run.order) { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * run.groundV * dt * (run.curseT > 0 ? 0.4 : 1)); }
    // Wachstum läuft aus
    if (run.growT !== undefined && run.growT <= 0 && run.growT > -1) { run.growT = -9; for (const k of run.order) { const h = run.h[k]; if (h.growS) { h.shield = Math.max(0, (h.shield || 0) - h.growS); h.growS = 0; } } }
    // Flammenwerfer
    if (run.flameT > 0) { run.flameT -= dt; run.flameTick -= dt; if (run.flameTick <= 0 && run.h.e && run.h.e.alive) { run.flameTick += 0.5; run.enemies.slice(0, 3).filter(e => e.x < 420).forEach(e => c.hit('e', e, run.flameV, '#ffb070')); } }
    // Schattenklon
    if (run.cloneT > 0 && st.a && run.h.a && run.h.a.alive && run.enemies.length && run.enemies[0].x < 420) { run.cloneAtk -= dt; if (run.cloneAtk <= 0) { run.cloneAtk += 1 / st.a.aps; const tg = run.enemies[0]; c.arrow('a', tg, 0.22, 'kunai'); c.hit('a', tg, run.cloneV, '#d9a0ff'); } }
    // Falkenfreundin
    if (st.s && st.s.falcon && run.h.s && run.h.s.alive && run.enemies.some(e => e.x < 400)) { if (!(run.falkT > 0)) { run.falkT = 4; const t = strongest(run, 400); if (t) { c.hit('s', t, st.s.falcon, '#c8f5cf'); run.fx.s_falke = 0.5; run.fx.falkeX = t.x; } } }
    // Knochenriese
    if (run.giant) { run.giant.t -= dt; if (run.giant.t <= 0 || run.giant.hp <= 0) { if (run.giant.hp <= 0) c.float('n', 'Riese zerfällt', '#6be0b8', 12); run.giant = null; } }
    // Steigerung
    if (st.b && st.b.cresc && run.h.b && run.h.b.alive) { run.crescT = (run.crescT || 0) + dt; if (run.crescT >= 5) { run.crescT = 0; if ((run.crescN || 0) < 5) { run.crescN = (run.crescN || 0) + 1; c.float('b', `Steigerung +${run.crescN * 10} %`, '#ff8ac8', 12); } } }
    else run.crescN = 0;
    // Gegner-Effekte
    for (const e of run.enemies) {
      if (e.duelT > 0) e.duelT -= dt; if (e.quakeT > 0) e.quakeT -= dt; if (e.dissT > 0) e.dissT -= dt; if (e.linkT > 0) e.linkT -= dt; if (e.smarkT > 0) e.smarkT -= dt;
      if (e.manaT > 0) { e.manaT -= dt; if (e.boss) { if (st.m) { e.hp -= st.m.atk * 1.5 * st.m.actMul * dt; e.lastBy = 'm'; } } else e.hp -= e.hp * 0.08 * dt; }
      if (e.bleedT > 0) { e.bleedT -= dt; e.hp -= e.bleed * dt; }
    }
  }
  // Zusätzlicher Schaden durch Siegel-Effekte
  function sigMul(run, st, k, e, wolf) {
    const T = st[k]; let m = 1;
    const ab = run.atkB[k]; if (ab) m *= 1 + ab.v;
    if (e.duelT > 0) m *= 1 + (e.duelV || 1);
    if (k === 'r' && run.brother && T.brother) m *= 1 + T.brother;
    if (T.sharp && e.hp > e.max * 0.8) m *= 1 + T.sharp;
    if (st.g.permafrost && e.frozen > 0) m *= 1 + st.g.permafrost;
    if (T.focus && run.enemies.length === 1) m *= 1 + T.focus;
    if (run.wrathT > 0) m *= 1 + (st.p ? st.p.wrath : 0.4);
    if (k === 't' && !wolf && T.packLead) m *= 1 + T.packLead * (T.wolves + (run.packT > 0 ? 2 + T.packBonus : 0));
    if (wolf && run.howlT > 0) m *= 1.8;
    if (k === 'n' && T.collect) m *= 1 + Math.min(0.5, T.collect * (run.collectN || 0));
    if (k === 'd') { if (run.bearT > 0) m *= 2; if (run.bloomT > 0 && T.bloom) m *= 1 + T.bloom; if (T.warden && run.order.every(x => run.h[x].alive && run.h[x].hp >= st[x].hp * 0.5)) m *= 1 + T.warden; }
    if (run.crescN > 0) m *= 1 + 0.1 * run.crescN;
    if (run.shatterT > 0 && st.o) m *= 1 + st.o.shatter;
    return m;
  }
  // Wiederbelebung: Engelsflügel und Heilige Wut
  function sigAps(run, st, k) {
    let m = 1; const b = run.apsB[k]; if (b) m *= 1 + b.v;
    if (k === 'a' && st.a.flow) m *= 1 + st.a.flow * (run.flowN || 0);
    if (k === 's' && run.huntT > 0) m *= 1 + st.s.hunt;
    return m;
  }
  function sigKill(S, st, run, c, e) {
    if (e.lastBy === 'r' && st.r && st.r.vorbild && run.h.r && run.h.r.alive && !run.noheal) run.order.forEach(k => { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * st.r.vorbild * (run.curseT > 0 ? 0.4 : 1)); });
    if (st.s && st.s.hunt && run.h.s && run.h.s.alive) run.huntT = 3;
    if (st.a && st.a.soulBlade && run.h.a && run.h.a.alive) for (const id of S.equip) if (NODE[id].tree === 'assassine' && run.cds[id] > 0) run.cds[id] = Math.max(0, run.cds[id] - 1);
    if (st.n && st.n.collect && run.h.n && run.h.n.alive) run.collectN = (run.collectN || 0) + 1;
    if (e.elite && st.n && st.n.necro && run.h.n && run.h.n.alive) { run.minions.push({ t: st.n.minionDur * (st.n.minionLong ? 2 : 1), atkT: 0.5, swing: 0, mul: 3 }); c.efloat(e, 'Totenbeschwörer!', '#6be0b8', 12); }
    if (e.smarkT > 0 && run.h.a && run.h.a.alive) { const nx = run.enemies.find(o => o !== e && o.hp > 0 && o.smarkT > 0); if (nx) { c.hit('a', nx, run.smarkV || 4, '#ff6b7a'); c.efloat(nx, 'Schattenmal!', '#ff6b7a', 14); run.fx.shadowXs = [nx.x]; run.fx.a_schatten = 0.4; } }
  }
  function sigRevive(c, k) {
    const { st, run } = c; if (!st.p || !run.h.p) return;
    if (st.p.angel && run.h[k]) { run.h[k].invT = 5; c.float(k, 'Engelsflügel', '#fff2b0', 12); }
    if (st.p.wrath) { run.wrathT = 6; c.float('p', 'Heilige Wut!', '#ffe48a', 14); }
  }

  /* ================= Kampf ================= */
  const ZONES = ['Grüne Wiesen', 'Finsterwald', 'Knochengruft', 'Glutberge', 'Frostgipfel', 'Nebelmoor', 'Dornendickicht', 'Schattenkrypta', 'Aschewüste', 'Eisgrotten',
    'Sternenfeld', 'Uralter Hain', 'Totenreich', 'Drachenhort', 'Himmelsspitze'];
  const BIOMES = [
    { sky: ['#7cc0ee', '#cfeaff'], far: '#9cc9a6', hill: ['#6fb45e', '#4f9447'], ground: ['#7a5b3a', '#5e452c'], enemy: 'schleim', boss: 'Schleimkönig', ranged: 'Spuckschleim', prop: 'baum', sun: '#fff3c4' },
    { sky: ['#1f3d4f', '#6d9a91'], far: '#2d5547', hill: ['#2f6b3f', '#1f4d2d'], ground: ['#4d3a28', '#382a1d'], enemy: 'goblin', boss: 'Goblinhäuptling', ranged: 'Goblin-Schleuderer', prop: 'tanne', sun: '#e8f1d8' },
    { sky: ['#1d1729', '#4d3f66'], far: '#3a3150', hill: ['#4a4058', '#352d44'], ground: ['#3a3344', '#2a2433'], enemy: 'skelett', boss: 'Knochenfürst', ranged: 'Skelett-Schütze', prop: 'grab', sun: '#d9d2ff' },
    { sky: ['#3d1414', '#d9682f'], far: '#7a2f20', hill: ['#6b2d22', '#46201a'], ground: ['#2e1d1a', '#1f1311'], enemy: 'daemon', boss: 'Höllenfürst', ranged: 'Feuerteufel', prop: 'lava', sun: '#ffd27a' },
    { sky: ['#8fb8e0', '#eef6ff'], far: '#c4d8ea', hill: ['#dceaf5', '#b4cde0'], ground: ['#8aa0b2', '#6e8496'], enemy: 'golem', boss: 'Frostriese', ranged: 'Eisschamane', prop: 'kristall', sun: '#ffffff' },
  ];
  const ENEMY_KINDS = ['schleim', 'goblin', 'skelett', 'daemon', 'golem', 'frosch', 'dorn', 'fleder', 'skorpion', 'spinne', 'astral', 'pilz', 'geist', 'drache', 'sturm'];
  const RANGED_NAMES = ['Spuckschleim', 'Goblin-Schleuderer', 'Skelett-Schütze', 'Feuerteufel', 'Eisschamane', 'Blasrohr-Kröte', 'Samenspucker', 'Schreifledermaus', 'Giftskorpion', 'Netzspinne',
    'Sternenrufer', 'Sporenpilz', 'Seelenrufer', 'Feuerdrache', 'Blitzrufer'];
  const rangedName = stage => RANGED_NAMES[zoneOf(stage) % RANGED_NAMES.length];
  const BOSS_NAMES = ['Schleimkönig', 'Goblinhäuptling', 'Knochenfürst', 'Höllenfürst', 'Frostriese', 'Moorhexe', 'Dornentroll', 'Vampirgraf', 'Magmatitan', 'Kristallspinne',
    'Sternenwächter', 'Uralter Baumhirte', 'Geisterkönig', 'Drachenkaiser', 'Sturmtitan'];
  const bossOf = stage => BOSS_NAMES[zoneOf(stage) % BOSS_NAMES.length];
  const zoneOf = stage => Math.floor((Math.max(1, stage) - 1) / 10);
  const biomeOf = stage => BIOMES[zoneOf(stage) % BIOMES.length];
  const zoneName = stage => (zoneOf(stage) < ZONES.length ? ZONES[zoneOf(stage)] : `Albtraum ${ROMAN[Math.min(10, zoneOf(stage) - ZONES.length + 1)] || zoneOf(stage) - ZONES.length + 1}`);
  const nightmare = stage => stage > 150;
  // Zeitbaum: höhere Spieltempos (×3,5 bis ×5) für Seelen, bleibt für immer
  const TEMPO_COST = [30, 90, 250, 600];
  const maxSpeed = S => 3 + 0.5 * Math.min(TEMPO_COST.length, S.tempo || 0);
  function buyTempo(S) {
    const lv = S.tempo || 0, cost = TEMPO_COST[lv];
    if (cost == null || !(S.asc > 0) || S.souls < cost) return false;
    S.souls -= cost; S.tempo = lv + 1; S.speed = maxSpeed(S);
    return true;
  }
  // Startgebiet: ein Gebiet ist wählbar, sobald der Boss des Gebiets davor in diesem Durchgang besiegt wurde
  const areaMax = S => Math.max(0, Math.min(Math.floor((S.best || 0) / 10), Math.floor((Math.min(capOf(S), 1e6) - 1) / 10)));
  // Gegner werden pro Stufe stärker – anfangs schneller, später langsamer
  function grow(stage, a, b, c) { const s = stage - 1, s1 = Math.min(s, 30), s2 = Math.min(Math.max(s - 30, 0), 50), s3 = Math.max(s - 80, 0); return Math.exp(s1 * Math.log(a) + s2 * Math.log(b) + s3 * Math.log(c)); }
  const TUNE = { hp: [1.135, 1.115, 1.085], dmg: [1.12, 1.1, 1.075], gold: [1.14, 1.105, 1.08], hard: [1.0, 0.6, 1.0, 0.15, 1.3, 0.5, 0.05] };
  const RANGED = { hp: 0.65, dmg: 0.5, rate: 2.4 };
  const rangedCount = stage => { const z = zoneOf(stage); return z === 0 ? 0 : z < 3 ? 1 : 2; };
  // Ab der 1. Wiedergeburt werden Gegner stärker (je Wiedergeburt etwas mehr); Expeditionen bleiben gleich
  // Gegnerstärke je Wiedergeburt (Leben, Schaden), so abgestimmt, dass jede Wiedergeburt bei ×5 etwa 1 h 40 min dauert
  const HARD_HP = [1, 1.0, 1.9, 3.4, 2.4, 12.5, 17, 24, 24, 24], HARD_DMG = [1, 1.0, 1.18, 1.45, 1.4, 2.45, 2.9, 3.4, 3.4, 3.4];
  function hardMul(S, exp) {
    if (exp || ((S.rebirths || 0) < 1 && !(S.asc > 0))) return null;
    const i = Math.min(HARD_HP.length - 1, Math.max(1, S.rebirths || 0));
    return [HARD_HP[i], HARD_DMG[i], TUNE.hard[4]];
  }

  function makeEnemy(stage, i, boss, eliteForce, run, ranged) {
    const elite = !boss && (eliteForce || Math.random() < ((run && run.eliteChance) || 0.12));
    const m = (boss ? 6 : elite ? 3 : 1) * (ranged ? RANGED.hp : 1), diff = (run && run.diff) || 1;
    const hm = (run && run.hard) || [1, 1, 1], hp = 20 * hm[0] * (boss ? hm[2] : 1) * grow(stage, ...TUNE.hp) * m * diff * ((run && run.hpMul) || 1);
    return { x: 560 + i * 46, hp, max: hp, dmg: 4 * hm[1] * (boss ? Math.sqrt(hm[2]) : 1) * grow(stage, ...TUNE.dmg) * (boss ? 2 : elite ? 1.5 : 1) * diff, atkT: 1.2, rate: (boss ? 1.6 : 1.3) / ((run && run.speed) || 1),
      gold: grow(stage, ...TUNE.gold) * (boss ? 10 : elite ? 4 : 1), boss, bk: zoneOf(stage) % BOSS_NAMES.length, elite, ranged: !!ranged, shotT: 0.8 + Math.random() * 1.2, type: ENEMY_KINDS[zoneOf(stage) % ENEMY_KINDS.length], stun: 0, hitT: 0, poison: 0, poisonT: 0, burn: 0, burnT: 0, mark: 0, markT: 0, bob: Math.random() * 6 };
  }
  const FRONT = LINE_ORDER.filter(k => HERO_BY_ID[k].line === 'front'), BACK = LINE_ORDER.filter(k => HERO_BY_ID[k].line !== 'front');
  function newRun(S, mode) {
    const st = statsFor(S, mode), tower = mode === 'tower', weekly = mode === 'weekly', exp = mode === 'exp', rules = weekly || exp ? st.rules : [];
    let order = [...FRONT, ...BACK].filter(k => st[k] && (!st.field || st.field.includes(k)));
    if (rules.includes('trio')) order = order.slice(0, 3);
    const pos = {}; order.forEach((k, i) => (pos[k] = 152 - i * 25));
    const h = {}; for (const k of order) h[k] = { hp: st[k].hp, alive: true, atkT: 0.3 + Math.random() * 0.4, wolfT: 0.5, swing: 0, hurtT: 0, revived: false, shield: 0 };
    const run = { mode: tower ? 'tower' : weekly ? 'weekly' : exp ? 'exp' : mode === 'ahnen' ? 'ahnen' : mode === 'bounty' ? 'bounty' : mode === 'wboss' ? 'wboss' : 'normal', stage: tower || weekly ? 1 : st.startStage, startStage: tower || weekly ? 1 : st.startStage, rules, losses: 0,
      mission: exp ? (MISSION[S.exp.mission] ? S.exp.mission : 'streif') : null, waves: 0, bossKills: 0, minions: [], turretT: 1, extraTurretT: 0, songT: 0, songMul: 0, roarT: 0,
      hard: hardMul(S, false), diff: ascDiff(S), speed: rules.includes('speed') ? 1.5 : 1, hpMul: rules.includes('giant') ? 2 : 1, eliteChance: rules.includes('elite') ? 0.4 : 0.12, noheal: rules.includes('noheal'),
      dragonT: 2, compRevive: false, bannerT: 0, kills: 0, gold: 0, souls: 0, runes: [], phoenixUsed: false, miracleUsed: false,
      bestBefore: S.best, towerBefore: S.towerBest, fx: {}, cds: {}, castAt: {}, atkB: {}, apsB: {}, buffT: 0, buffMul: 0, hautT: 0, racheT: 0, packT: 0, order, pos, frontX: pos[order[0]], h,
      enemies: [], floats: [], arrows: [], eshots: [], parts: [], vq: [], scroll: 0, dead: false, victory: false, deadT: 0, time: 0, shake: 0 };
    // Abkürzung: übersprungene Bosse geben einen Teil ihrer Seelen
    if (run.mode === 'normal' && run.stage > 10) {
      let skip = 0; for (let b = 10; b < run.stage; b += 10) skip += Math.round((1 + Math.floor(b / 20)) * st.g.soulMul) + st.soulBonus;
      const beute = perk(S, 'p_start');
      run.skipSouls = Math.floor(skip * (SKIP_SOULS + 0.1 * beute)); run.skipGold = 0;
      // Beutezug (Sternen-Laden): Teil des Golds der übersprungenen Stufen
      if (beute) {
        let g = 0; for (let s2 = 1; s2 < run.stage; s2++) g += grow(s2, ...TUNE.gold) * (s2 % 10 === 0 ? 13 : 5) * 1.36;
        g = Math.floor(g * st.g.gold * 0.1 * beute);
        run.skipGold = Math.max(0, g);
      }
      // Ausgezahlt wird nach und nach während des Laufs (alle 20 s ein Sechstel), sonst ließe sich durch Starten und Aufgeben endlos sammeln
      if (run.skipSouls || run.skipGold) { run.skipN = SKIP_PARTS; run.skipLeft = SKIP_PARTS; run.floats.push({ x: 150, y: 100, text: 'Abkürzung: Belohnung kommt nach und nach im Lauf', color: '#c9a6ff', size: 12, t: 2.6 }); }
    }
    run.dust0 = S.dust;
    if (run.mode === 'ahnen') ahnInit(S, run);
    if (run.mode === 'bounty') { const B = bountiesOf(S)[Math.max(0, Math.min(2, Math.floor(S.bountySel || 0)))]; run.bountyI = B.i; run.stage = run.startStage = B.lvl;
      run.ahn = { mi: B.mi, bi: 0, wave: AHN_TUNE.waves, boss: null, fx: [], banner: null, big: null, spot: null, spotFx: null, wallFx: null, bigs: 0, blocked: 0, spots: 0, list: [B.def], hpMul: BOUNTY.hp, noScale: true, bounty: B };
      run.swT = 0; run.swCd = 0; }
    if (run.mode === 'wboss') { run.stage = run.startStage = WB.lvl; run.wb = { bars: 0, bk: Math.max(0, Math.floor(S.wbBk || 0)) % WB_BOSS.length }; }
    spawnWave(run);
    return run;
  }
  const SKIP_PARTS = 6, SKIP_STEP = 20;
  let SKIP_SOULS = Number((typeof process !== 'undefined' && process.env && process.env.SKIP) || 0.35);
  const towerStage = floor => 15 + floor * 2;
  function spawnWave(run) {
    run.brother = false; for (const k of run.order || []) if (run.h[k]) run.h[k].protUsed = false;
    if (ahnLike(run)) return ahnSpawn(run);
    if (run.mode === 'wboss') return wbSpawn(run);
    run.enemies = [];
    if (run.mode === 'tower') {
      const s = towerStage(run.stage), boss = run.stage % 5 === 0;
      for (let i = 0; i < 3; i++) run.enemies.push(makeEnemy(s, i, false, true, run, i === 2));
      if (boss) { run.enemies.push(makeEnemy(s, 3.6, true, false, run)); run.bannerT = 2.2; }
      return;
    }
    if (run.mode === 'normal' && run.stage === WF_STAGE) return wfSpawn(run);
    const MS = run.mode === 'exp' ? MISSION[run.mission] : null;
    const boss = MS ? !!((MS.bosses && (run.waves + 1) % 3 === 0) || (MS.bossEvery && (run.waves + 1) % MS.bossEvery === 0)) : run.stage % (run.rules && run.rules.includes('boss') ? 5 : 10) === 0, n = boss ? 3 : 5;
    const nr = Math.min(boss ? 1 : 2, rangedCount(run.stage));
    for (let i = 0; i < n; i++) run.enemies.push(makeEnemy(run.stage, i, false, false, run, i >= n - nr));
    if (boss) { run.enemies.push(makeEnemy(run.stage, n + 0.6, true, false, run)); run.bannerT = 2.2; }
    const A = areaOf(run); if (A) for (const e of run.enemies) { e.type = e.ranged ? A.ranged : A.melee; if (e.boss) e.bk = A.bk; }
  }
  function wfSpawn(run) {
    const e = makeEnemy(WF_STAGE, 1.6, true, false, run);
    e.hp *= WF.hp; e.max = e.hp; e.dmg *= WF.dmg; e.wf = true; e.x = 560; e.reach = 40; e.rate = 2.2; e.type = 'drache';
    e.wfT = { bite: 6, quake: 11, brood: false };
    run.enemies = [e]; run.wf = { t: 0 }; run.bannerT = 0;
  }
  // Fähigkeiten des Weltenfressers
  function wfStep(S, st, run, c, dt) {
    const e = run.enemies.find(x => x.wf); if (!e) return;
    run.wf.t += dt;
    if (run.wf.t < 3.2) { e.stun = Math.max(e.stun, 0.2); return; }
    const al = run.order.filter(k => run.h[k].alive); if (!al.length) return;
    e.wfT.bite -= dt; e.wfT.quake -= dt;
    if (e.wfT.bite <= 0) { e.wfT.bite = 7; hurtHero(c, al[0], e.dmg * 2.6, e); c.efloat(e, 'Verschlingen!', '#ff5a5a', 18); run.shake = 0.6; run.wf.biteFx = 0.6; }
    if (e.wfT.quake <= 0) { e.wfT.quake = 12; al.forEach(k => hurtHero(c, k, e.dmg * 0.7, null)); c.efloat(e, 'Weltenbeben!', '#ffb070', 18); run.shake = 0.9; run.wf.quakeFx = 0.8; }
    if (!e.wfT.brood && e.hp < e.max * 0.5) { e.wfT.brood = true; for (let i = 0; i < 3; i++) { const m = makeEnemy(WF_STAGE, i, false, true, run); m.x = e.x - 50 - i * 30; m.type = 'skorpion'; run.enemies.push(m); } c.efloat(e, 'Die Brut erwacht!', '#c9a6ff', 18); }
    // eigene, langsamere Wut
    e.age = (e.age || 0) + dt; const en = e.age > 60 ? 1 + 0.1 * Math.floor((e.age - 60) / 10 + 1) : 1; if (en > (e.enrage || 1)) { e.enrage = en; c.efloat(e, `Hunger ×${en.toFixed(1).replace('.', ',')}`, '#ff5a5a', 15); }
    if (run.wf.biteFx > 0) run.wf.biteFx -= dt; if (run.wf.quakeFx > 0) run.wf.quakeFx -= dt;
  }
  function ctxFor(S, st, run) {
    const c = { S, st, run };
    c.float = (k, text, color, size = 14) => run.floats.push({ x: run.pos[k] || 120, y: 110, text, color, size, t: 1 });
    c.efloat = (e, text, color, size = 13) => {
      // Bei Bossen unter Dauerbeschuss nicht unendlich viele Zahlen übereinander stapeln
      run.floats.push({ x: e.x + (e.reach ? 52 : 0) + (Math.random() * (e.boss ? 50 : 16) - (e.boss ? 25 : 8)), y: e.reach ? 168 + Math.random() * 14 : 150 - (e.boss ? 40 + Math.random() * 30 : 0), text, color, size, t: 1, dmg: /^[\d.,×\s]+(Tsd\.|Mio\.|Mrd\.|Bio\.)?/.test(text) && !/^\+/.test(text) });
    };
    // Ereignisse nur für die Anzeige (Treffer, Einschläge, Heilung); die Grafik holt sie jedes Bild ab
    c.vfx = ev => { if (run.vq && run.vq.length < 60) run.vq.push(ev); };
    c.burst = (x, y, color, n = 8) => { for (let i = 0; i < n; i++) run.parts.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140 - 20, t: 0.6, c: color }); };
    c.arrow = (k, e, d, kind) => run.arrows.push({ x: (run.pos[k] || 60) + 8, y: 168, tx: e.x, ty: 188 - (e.boss ? 30 : 0), t: 0, d, kind: kind || k });
    c.hit = (k, e, mult, color, wolf, opt) => {
      const T = st[k]; if (!T || !e) return 0;
      if (run.blindT > 0 && Math.random() < 0.33) { c.efloat(e, 'Verfehlt', '#9aa3ad', 11); return 0; }
      let dmg = (wolf ? T.wolfAtk : T.atk) * mult * (run.buffT > 0 ? 1 + run.buffMul : 1) * (1 + (e.markT > 0 ? e.mark : 0)) * sigMul(run, st, k, e, wolf);
      if ((e.boss || e.elite) && T.bossDmg) dmg *= 1 + T.bossDmg;
      const hh = run.h[k], tur = !!(opt && opt.turret && T.precise), forced = !!(k === 'a' && hh && hh.nextCrit);
      if (forced) hh.nextCrit = false;
      const nCrit = Math.max(forced ? 1 : 0, procs((wolf ? T.crit + T.wolfCrit : T.crit) * (tur ? 2 : 1) + (run.critBT > 0 ? run.critBV : 0))), crit = nCrit > 0;
      if (crit) dmg *= (T.critD + (tur ? 0.5 : 0) + (e.boss && T.coldBlood ? T.coldBlood : 0)) * nCrit;
      e.hp -= dmg; e.hitT = 0.15; e.lastBy = k;
      if (wolf && T.bleed) { e.bleed = dmg * T.bleed / 3; e.bleedT = 3; }
      if (k === 'd' && run.natureT > 0 && hh && hh.alive && !run.noheal) hh.hp = Math.min(T.hp, hh.hp + dmg);
      if (k === 'a' && T.flow) run.flowN = Math.min(20, (run.flowN || 0) + 1);
      if (e.linkT > 0) for (const o of run.enemies) if (o !== e && o.linkT > 0 && o.hp > 0) { o.hp -= dmg * 0.5; o.hitT = 0.15; o.lastBy = k; }
      if (T.burn && !wolf) { e.burn = dmg * T.burn / 2; e.burnT = 2; }
      if (T.vuln && k === 's') { e.mark = Math.max(e.mark || 0, T.vuln); e.markT = 4; }
      if (T.lifesteal) { const h = run.h[k]; if (h && h.alive) h.hp = Math.min(T.hp, h.hp + dmg * T.lifesteal); }
      if (wolf && T.wolfHeal) c.healAllAbs(dmg * T.wolfHeal);
      if (run.floats.reduce((n, f) => n + (f.dmg && f.t > 0.6 && Math.abs(f.x - e.x) < 60 ? 1 : 0), 0) < (e.boss ? 3 : 2)) c.efloat(e, nCrit > 1 ? `${nCrit}× ${fmt(dmg)}` : fmt(dmg), nCrit > 1 ? '#ff9a3d' : crit ? '#ffd23f' : color || '#ffffff', nCrit > 1 ? 20 : crit ? 18 : 13);
      if (crit) c.burst(e.x, 190, '#ffd23f', 5);
      sfx(crit ? 'crit' : 'hit', k);
      return dmg;
    };
    c.healOne = (k, amt, src) => {
      const h = run.h[k], T = st[k]; if (!h || !h.alive || run.noheal) return;
      if (run.curseT > 0) amt *= 0.4;
      if (k === 'd' && T.bloom) run.bloomT = 4;
      if (src === 'p' && st.p && st.p.holyFire && st.p.atk > 0 && run.enemies[0]) c.hit('p', run.enemies[0], Math.min(amt * st.p.holyFire, st.p.heal) / st.p.atk, '#fff2b0');
      const over = h.hp + amt - T.hp; h.hp = Math.min(T.hp, h.hp + amt);
      if (over > 0 && st.p && st.p.overShield) h.shield = Math.min(T.hp * 0.5, h.shield + over * st.p.overShield);
      c.float(k, '+' + fmt(amt), '#7ee08a', 12);
      // 6. Sternbild der Priesterin: die anderen bekommen einen Teil mit
      if (src === 'p' && st.p && st.p.cHalo) run.order.forEach(x => x !== k && run.h[x].alive && c.healOne(x, amt * st.p.cHalo));
    };
    c.healAll = (f, src) => { run.order.forEach(k => run.h[k].alive && c.healOne(k, st[k].hp * f, src)); run.fx.heal = 0.5; };
    c.healSplit = (me, fMe, fOther) => { run.order.forEach(k => run.h[k].alive && c.healOne(k, st[k].hp * (k === me ? fMe : fOther))); run.fx.heal = 0.5; };
    c.healAllAbs = a => !run.noheal && (a *= run.curseT > 0 ? 0.4 : 1) && run.order.forEach(k => { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + a); });
    return c;
  }
  function frontHero(run) { return run.order.find(k => run.h[k].alive); }
  const tauntK = run => (run.tauntT > 0 && run.h.w && run.h.w.alive ? 'w' : run.golemT > 0 && run.h.o && run.h.o.alive ? 'o' : null);
  function hurtHero(c, k, raw, attacker) {
    const { st, run } = c, h = run.h[k], T = st[k];
    if (!h || !h.alive) return;
    if (h.invT > 0 || h.protT > 0) return;
    const boss = attacker && attacker.boss;
    if (boss && attacker.enrage) raw *= attacker.enrage;
    if (attacker && attacker.duelT > 0) raw *= 0.7;
    if (h.markT > 0) raw *= 2;
    if (T.block && Math.random() < T.block * (boss ? 0.5 : 1)) { c.float(k, 'Abgewehrt', '#9fd0ff', 12); if (attacker && T.blockStun) attacker.stun = Math.max(attacker.stun, boss ? 0.25 : 0.5); return; }
    if (T.dodge && Math.random() < T.dodge) { c.float(k, 'Ausgewichen', '#c8f5cf', 12); if (T.dancer) h.nextCrit = true; return; }
    let d = raw * (1 - T.dr * (boss ? 0.6 : 1));
    if (run.roarT > 0) d *= 0.6;
    if (run.swT > 0) d *= 0.5;
    if (run.hautT > 0 && (k === 'w' || (st.w && st.w.cHautAll))) d *= k === 'w' ? 0.4 : 0.7;
    if (k === 'w' && run.tauntT > 0) d *= 0.7;
    if (k === 'd' && run.bearT > 0) d *= 0.5;
    if (k === 'e' && T.plating) d *= 1 - T.plating;
    if (k === 'o' && run.golemT > 0) d *= 0.6;
    if (k !== 'o' && st.o && st.o.bulwark && run.h.o && run.h.o.alive && run.h.o.hp >= st.o.hp * 0.5) d *= 1 - st.o.bulwark;
    if (k === 'n' && T.boneArmor) d *= 1 - Math.min(0.4, T.boneArmor * run.minions.length);
    if (h.shield > 0) { const a = Math.min(h.shield, d); h.shield -= a; d -= a; if (h.growS) h.growS = Math.min(h.growS, h.shield); }
    h.hp -= d; h.hurtT = 0.2; sfx('hurt');
    if (d > 0) { if (k === 'a') run.flowN = 0; if (k === 'b') { run.crescN = 0; run.crescT = 0; } }
    if (attacker) { let refl = T.thorns; if (k === 'w' && run.racheT > 0) refl += 0.6 * (1 + ((st.w && st.w.cRache) || 0)); if (k === 'o' && run.monoT > 0) refl += 1; if (refl) attacker.hp -= raw * refl * (boss ? 0.4 : 1); }
    if (h.hp > 0 && k !== 'w' && st.w && st.w.protector && run.h.w && run.h.w.alive && h.hp < T.hp * 0.25 && !h.protUsed) { h.protUsed = true; h.protT = 3; c.float(k, 'Beschützt!', '#7fb2ff', 13); }
    if (h.hp <= 0 && run.honorT > 0) { h.hp = 1; c.float(k, 'Ehre!', '#ffd27a', 12); }
    if (h.hp <= 0) {
      if (st.p && st.p.miracle && !run.miracleUsed && run.h.p && run.h.p.alive) { run.miracleUsed = true; run.order.forEach(x => run.h[x].alive && (run.h[x].hp = st[x].hp)); h.hp = T.hp * 0.5; c.float(k, 'Wunder!', '#ffe48a', 18); run.fx.heal = 0.5; }
      else if (T.revive && !h.revived) { h.revived = true; h.hp = T.hp * (k === 'w' ? 1 : 0.5); c.float(k, k === 'w' ? 'Letzte Bastion!' : 'Zweites Leben!', '#ffb547', 16); sigRevive(c, k); }
      else { h.hp = 0; h.alive = false; h.shield = 0; h.deadAt = run.time; h.deadScroll = run.scroll; run.losses++; sfx('fall'); c.float(k, `${HERO_BY_ID[k].name} gefallen`, '#ff8a8a', 13);
        if (k === 'o' && T.shatter) { run.shatterT = 8; run.golemT = 0; run.monoT = 0; run.stormT = 0; c.float('o', 'Zerbrochener Stein!', '#46d4ee', 15); run.fx.shatter = 1; } if (k !== 'r' && st.r && st.r.brother && run.h.r && run.h.r.alive && !run.brother) { run.brother = true; c.float('r', 'Schwertbruder!', '#ffb547', 15); } }
    }
  }
  function step(S, st, run, dt) {
    if (run.dead) { run.deadT += dt; return; }
    if (run.pause) return;
    const c = ctxFor(S, st, run);
    run.time += dt; run.bannerT -= dt; run.buffT -= dt; run.hautT -= dt; run.racheT -= dt; run.packT -= dt; run.songT -= dt; run.roarT -= dt; run.extraTurretT -= dt; run.shake = Math.max(0, run.shake - dt);
    for (const k of run.order) {
      const h = run.h[k]; if (!h.alive) continue;
      if (st[k].regen) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * st[k].regen * dt * (run.curseT > 0 ? 0.4 : 1));
      h.swing = Math.max(0, h.swing - dt * 4); h.hurtT -= dt;
      if (h.invT > 0) h.invT -= dt; if (h.protT > 0) h.protT -= dt;
    }
    for (const k in run.cds) run.cds[k] = Math.max(0, run.cds[k] - dt);
    for (const k in run.fx) if (typeof run.fx[k] === 'number' && !/X$/.test(k)) run.fx[k] -= dt;
    const fk = frontHero(run);
    if (!fk) { run.dead = true; S.runs++; return 'dead'; }
    if (run.mode === 'exp' && run.losses > 0 && MISSION[run.mission].noLoss) { run.dead = true; run.failNote = 'Ein Held ist gefallen.'; return 'dead'; }
    run.frontX = run.pos[fk];
    run.enemies.sort((a, b) => a.x - b.x);
    let walking = true;
    run.enemies.forEach((e, i) => {
      const target = run.frontX + 50 + i * 34 + (e.boss ? 10 : 0) + (e.reach || 0);
      if (e.stun > 0) e.stun -= dt;
      else if (e.x > target) e.x = Math.max(target, e.x - 75 * run.speed * (st.g.walk || 1) * (e.quakeT > 0 ? 0.6 : 1) * dt);
      else if (e.x < target) e.x = Math.min(target, e.x + 75 * dt);
      if (i === 0 && e.x <= target + 1) walking = false;
      e.hitT -= dt; e.markT -= dt; e.frozen -= dt; e.rooted -= dt; e.sleep -= dt; e.cursed -= dt;
      if (e.poisonT > 0) { e.poisonT -= dt; e.hp -= e.poison * dt; }
      if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burn * dt; }
    });
    if (walking) run.scroll += 70 * (st.g.walk || 1) * dt;
    // Begleiter
    if (st.dragon && run.enemies.length && run.enemies[0].x < 440) {
      run.dragonT -= dt;
      if (run.dragonT <= 0) { run.dragonT = 3; run.fx.dragon = 0.6; run.enemies.filter(e => e.x < 480).forEach(e => { e.hp -= st.dragon; e.hitT = 0.15; c.efloat(e, fmt(st.dragon), '#ff9a6a', 13); }); }
    }
    // Aktive Fähigkeiten
    for (const id of S.equip) {
      const n = NODE[id], hk = HERO[n.tree].id, h = run.h[hk];
      if (!h || !h.alive || h.stunT > 0 || !rank(S, id) || run.cds[id] > 0 || !run.enemies.length) continue;
      if (n.sig && !sigOn(S, n.tree)) continue;
      const mc = minCdOf(id, S, st);
      if (mc && run.time - (run.castAt[id] ?? -1e9) < mc) continue;
      if (!ACT[id].ready(run, st, S)) continue;
      c.inCast = true; try { ACT[id].cast(c, rank(S, id)); } finally { c.inCast = false; }
      // Sternbilder: zweites Auslösen, Heilung bei jeder Fähigkeit, schnellere Abklingzeit
      const T = st[hk], ech = T.cEcho ? T.cEcho[id] || T.cEcho.all || 0 : 0;
      if (ech && Math.random() < ech && run.enemies.length) { ACT[id].cast(c, rank(S, id)); c.float(hk, '✦ Sternenecho', '#ffe6a0', 12); }
      if (T.cNatur) c.healAll(T.cNatur);
      run.cds[id] = Math.max(mc, ACT[id].cd(rank(S, id), S) * (1 - T.cdr) * ((T.cCd && T.cCd[id]) || 1)); run.castAt[id] = run.time; run.fx[id] = 0.5; sfx('skill', hk);
      if (hk !== 'b' && !mc) run.lastAct = id;
      if (hk === 'e' && st.e.tinker) run.tinkT = 4;
    }
    sigStep(S, st, run, c, dt);
    if (run.skipLeft > 0 && run.mode === 'normal' && run.time >= (SKIP_PARTS - run.skipLeft + 1) * SKIP_STEP) { run.skipLeft--;
      const ps = Math.floor(run.skipSouls / run.skipN) + (run.skipLeft ? 0 : run.skipSouls % run.skipN), pg = Math.floor(run.skipGold / run.skipN);
      if (ps) { S.souls += ps; S.tot.souls += ps; run.souls += ps; run.floats.push({ x: 150, y: 100, text: `Abkürzung: +${ps} Seelen`, color: '#c9a6ff', size: 13, t: 2 }); }
      if (pg) { S.gold = Math.min(GOLD_MAX, S.gold + pg); run.gold += pg; run.floats.push({ x: 150, y: 120, text: `Beutezug: +${fmt(pg)} Gold`, color: '#ffd23f', size: 13, t: 2 }); } }
    if (run.wf) wfStep(S, st, run, c, dt);
    const ensF = st.b && st.b.ensemble && run.h.b && run.songT > 0 ? 1 + run.songMul : 1;
    const f = run.enemies[0], eng = f && f.x <= run.frontX + 52 + (f.boss ? 10 : 0) + (f.reach || 0);
    for (const k of run.order) {
      const h = run.h[k], T = st[k];
      if (k === 't' && !h.alive && T.loyal && eng && run.enemies.length) { h.wolfT -= dt * (run.howlT > 0 ? 1.5 : 1) * ensF; if (h.wolfT <= 0) { h.wolfT += 1 / T.wolfAps; for (let i = 0; i < T.wolves; i++) c.hit('t', run.enemies[0], 2, '#ffd2a8', true); } }
      if (!h.alive || !run.enemies.length || h.stunT > 0) continue;
      const melee = FRONT.includes(k);
      if (melee && !eng) { h.atkT = Math.min(h.atkT, 0.3); continue; }
      if (!melee && run.enemies[0].x > 420) continue;
      h.atkT -= dt * (run.songT > 0 ? 1 + run.songMul : 1) * (run.slowT > 0 ? 0.5 : 1) * sigAps(run, st, k);
      if (h.atkT <= 0) {
        h.atkT += 1 / T.aps; h.swing = 1;
        const tgt = run.enemies[0];
        if (k === 'p') {
          const low = run.order.filter(x => run.h[x].alive && run.h[x].hp < st[x].hp * 0.95).sort((a, b) => run.h[a].hp / st[a].hp - run.h[b].hp / st[b].hp)[0];
          if (low) c.healOne(low, T.heal * (Math.random() < T.crit ? 2 : 1), 'p');
          else { c.arrow('p', tgt, 0.25, 'licht'); c.hit('p', tgt, 1, '#fff2b0'); if (T.splash) run.enemies.slice(1).filter(e => e.x - tgt.x < 70).forEach(e => c.hit('p', e, T.splash, '#fff2b0')); }
        } else if (k === 's') {
          const n = T.shots + procs(T.extraShot);
          for (let i = 0; i < n; i++) { c.arrow('s', tgt, 0.25 + i * 0.08); c.hit('s', tgt, 1, '#c8f5cf'); if (T.pierce && run.enemies[1]) c.hit('s', run.enemies[1], T.pierce, '#c8f5cf'); }
        } else if (k === 'a') {
          const n = T.shots + procs(T.extraShot);
          for (let i = 0; i < n; i++) { c.arrow('a', tgt, 0.22 + i * 0.07, 'kunai'); c.hit('a', tgt, tgt.ranged ? 1 + T.rangedDmg : 1, '#ffc2c8'); if (T.pierce && run.enemies[1]) c.hit('a', run.enemies[1], T.pierce * (run.enemies[1].ranged ? 1 + T.rangedDmg : 1), '#ffc2c8'); }
        } else if (k === 'n') {
          c.arrow('n', tgt, 0.3, 'nekro'); c.hit('n', tgt, 1, '#b8ffe4');
        } else if (k === 'b') {
          c.arrow('b', tgt, 0.35, 'note'); c.hit('b', tgt, 1, '#ffd0ea');
        } else if (k === 'e') {
          c.arrow('e', tgt, 0.4, 'bomb'); c.hit('e', tgt, 1, '#ffc58a'); run.enemies.slice(1).filter(e => e.x - tgt.x < 60).forEach(e => c.hit('e', e, T.splash, '#ffc58a'));
        } else if (k === 'm') {
          for (let i = 0; i < T.shots; i++) { c.arrow('m', tgt, 0.35 + i * 0.1, 'feuer'); c.hit('m', tgt, 1, '#ffd0a0'); run.enemies.slice(1).filter(e => e.x - tgt.x < 70).forEach(e => c.hit('m', e, T.splash, '#ffd0a0')); }
          if (T.overload && (h.cnt = (h.cnt || 0) + 1) % 4 === 0) { const ts = run.enemies.filter(e => e !== tgt && e.hp > 0).slice(0, 3); ts.forEach(e => c.hit('m', e, 1, '#e2c9ff')); if (ts.length) { run.fx.m_kette = 0.35; run.fx.chain = ts.map(e => e.x); } }
        } else {
          c.hit(k, tgt, 1 + (T.koloss ? Math.min(1, T.koloss * T.hp / Math.max(1e-9, T.atk)) : 0), k === 'w' ? '#cfe0ff' : null);
          if (T.dbl) for (let i = procs(T.dbl); i > 0 && tgt.hp > 0; i--) c.hit(k, tgt, 1);
          if (T.wmaster && (h.cnt = (h.cnt || 0) + 1) % 5 === 0) { near(run).filter(e => e !== tgt).forEach(e => c.hit(k, e, 1, '#ffe0a8')); run.fx.wirbel = 0.25; }
          if (T.stunChance && Math.random() < T.stunChance) tgt.stun = Math.max(tgt.stun, 0.5);
        }
      }
      if (k === 'e' && run.enemies[0] && run.enemies[0].x < 440) {
        run.turretT -= dt * (run.overT > 0 ? 2 : 1) * ensF;
        if (run.turretT <= 0) {
          run.turretT += 1 / Math.max(0.2, T.turretAps);
          const n = T.turrets + (run.extraTurretT > 0 ? 1 : 0), nn = n + (run.tinkT > 0 ? 1 : 0), tg = run.enemies[0];
          for (let i = 0; i < nn; i++) { run.arrows.push({ x: (run.pos.e || 60) + 26 + i * 14, y: 196 - i * 4, tx: tg.x, ty: 196, t: 0, d: 0.16, kind: 'shot' }); c.hit('e', tg, T.turretMul * (i >= n ? 0.5 : 1), '#ffe0b0', false, TURRET); }
        }
      }
      if (k === 't' && eng) {
        h.wolfT -= dt * (run.howlT > 0 ? 1.5 : 1) * ensF;
        if (h.wolfT <= 0) { const n = T.wolves + (run.packT > 0 ? 2 + T.packBonus : 0); h.wolfT += 1 / T.wolfAps; for (let i = 0; i < n; i++) c.hit('t', run.enemies[0] || tgtSafe(run), 1, '#ffd2a8', true); }
      }
    }
    // Fernkämpfer schießen von hinten auf zufällige Helden
    for (const e of run.enemies) {
      if (!e.ranged || e.stun > 0 || e.x > 450 || e.hp <= 0) continue;
      e.shotT -= dt * (e.dissT > 0 ? 0.5 : 1);
      if (e.shotT > 0) continue;
      e.shotT += RANGED.rate / run.speed;
      const alive = run.order.filter(k => run.h[k].alive); if (!alive.length) break;
      const k = tauntK(run) || alive[Math.floor(Math.random() * alive.length)];
      run.eshots.push({ x: e.x - 12, y: 188, tx: run.pos[k], ty: 180, t: 0, d: 0.55, k, dmg: e.dmg * RANGED.dmg, kind: e.type, src: e });
    }
    for (const s of run.eshots) { s.t += dt; if (s.t >= s.d && !s.done) { s.done = true;
      if (run.prallT > 0 && s.dmg > 0 && run.h.w && run.h.w.alive) { const tg = s.src && s.src.hp > 0 ? s.src : run.enemies.find(x => x.boss) || run.enemies[0]; if (tg) c.hit('w', tg, run.prallV, '#cfe0ff'); c.float('w', 'Abgeprallt', '#9fd0ff', 11); }
      else hurtHero(c, tauntK(run) || s.k, s.dmg, null); } }
    run.eshots = run.eshots.filter(s => !s.done);
    // Skelett-Diener
    if (run.minions.length) {
      const N = st.n, alive = run.h.n && run.h.n.alive;
      for (const m of run.minions) {
        m.t -= dt; if (!alive || !N || !run.enemies.length) continue;
        m.atkT -= dt * (st.b && st.b.ensemble && run.h.b ? (1 + st.b.songAps) * ensF : 1); if (m.atkT <= 0 && run.enemies[0].x < run.frontX + 90) { m.atkT += 1; m.swing = 1; c.hit('n', run.enemies[0], 0.8 * N.minionMul * (m.mul || 1), '#d8fff0'); }
        m.swing = Math.max(0, (m.swing || 0) - dt * 4);
      }
      run.minions = run.minions.filter(m => m.t > 0 && alive);
    }
    // Boss-Wut: ein Boss wird mit der Zeit immer stärker, damit niemand ewig allein durchhält
    if (f && f.boss && eng && !f.ahn && !f.wf) { f.age = (f.age || 0) + dt; const en = f.age > 25 ? 1 + 0.2 * Math.floor((f.age - 25) / 5 + 1) : 1; if (en > (f.enrage || 1)) { f.enrage = en; c.efloat(f, en < 1.25 ? 'Wut!' : `Wut ×${en.toFixed(1).replace('.', ',')}`, '#ff5a5a', 15); } }
    // Gegner greifen an
    if (f && eng && f.stun <= 0 && !f.ranged) {
      f.atkT -= dt * (f.atkMul || 1) * (f.dissT > 0 ? 0.5 : 1);
      if (f.atkT <= 0 && f.hp > 0) {
        f.atkT += f.rate;
        f.atkAt = run.time;
        if (run.wallT > 0) c.efloat(f, 'Knochenwand', '#6be0b8', 11);
        else if (run.giant) { run.giant.hp -= f.dmg * (f.enrage || 1); c.efloat(f, 'Knochenriese', '#6be0b8', 11); }
        else {
          const tk = tauntK(run) || fk;
          hurtHero(c, tk, f.dmg, f);
          if (f.boss && !tauntK(run)) { run.shake = 0.15; for (const k of run.order) if (k !== tk) hurtHero(c, k, f.dmg * 0.35, null); }
        }
      }
    }
    if (ahnLike(run)) ahnStep(S, st, run, c, dt);
    if (run.mode === 'wboss') { wbBars(run, c); if (run.time >= WB.maxT) { run.victory = true; run.dead = true; return 'dead'; } }
    // Besiegte Gegner
    const g = st.g;
    for (const e of run.enemies) {
      if (e.hp > 0) continue;
      run.kills++; S.tot.kills++;
      if (e.boss) run.bossKills++;
      sigKill(S, st, run, c, e);
      { const xp = e.wf ? 500 : e.boss ? 10 : e.elite ? 3 : 1; S.mast = S.mast || {}; for (const k of run.order) if (run.h[k].alive) S.mast[k] = (S.mast[k] || 0) + xp; }
      if (e.wf) { const first = !(S.wf > 0); S.wf = (S.wf || 0) + 1; const cr = first ? WF.crownsFirst : WF.crowns; S.crowns += cr; run.wfKilled = { first, crowns: cr }; run.wf = null; c.burst(e.x, 120, '#ffd27a', 60); run.shake = 1; }
      sfx(e.boss ? 'boss' : 'kill');
      if (st.n && run.h.n && run.h.n.alive && run.minions.length < st.n.minionMax && Math.random() < st.n.raise) { run.minions.push({ t: st.n.minionDur * (st.n.minionLong ? 2 : 1), atkT: 0.6, swing: 0 }); c.efloat(e, 'Erhebe dich!', '#6be0b8', 12); }
      c.burst(e.x, 200, e.boss ? '#c9a6ff' : '#ffffff', e.boss ? 24 : 8);
      if (run.mode === 'normal') {
        let gold = e.gold * g.gold * (e.boss || e.elite ? g.eliteGold : 1);
        if (Math.random() < g.chest) { gold *= 10; c.efloat(e, 'Truhe!', '#ffd23f', 16); }
        gold = Math.max(1, Math.round(gold));
        S.gold = Math.min(GOLD_MAX, S.gold + gold); run.gold += gold; sfx('coin');
        run.floats.push({ x: e.x, y: 130, text: '+' + fmt(gold), color: '#ffcf4a', size: 14, t: 1 });
      }
      if (e.boss && run.mode === 'normal') { const g = gemBossFirst(S, run.stage); if (g) run.floats.push({ x: e.x, y: 60, text: `+${g} 💠 Sternkristalle`, color: '#8fe3ff', size: 15, t: 1.6 }); }
      if (e.boss && run.mode === 'normal') {
        const tr = trophyRoll(S, run.stage);
        if (tr) { (run.trophies = run.trophies || []).push(tr.id); run.floats.push({ x: e.x, y: 40, text: `Trophäe: ${ITEMS[tr.id].n}!`, color: '#c98aff', size: 16, t: 2.2 }); sfx('rune'); }
        if (nightmare(run.stage)) { const r = chestRoll(S); (run.chests = run.chests || []).push(r); run.floats.push({ x: e.x, y: 76, text: 'Albtraum-Truhe!', color: '#c98aff', size: 15, t: 1.8 }); }
      }
      let souls = 0;
      if (e.boss) souls = roundSouls((1 + Math.floor(run.stage / 20)) * g.soulMul) + st.soulBonus;
      else if (e.elite) { const n = procs(g.eliteSoul); if (n) souls = n * Math.max(1, roundSouls(altarMul(S))); }
      if (run.mode === 'tower') souls = e.boss ? 1 : 0;
      if (run.mode === 'weekly' || run.mode === 'exp' || ahnLike(run) || run.mode === 'wboss') souls = 0;
      if (souls) { sfx('soul'); S.tot.souls += souls; S.souls += souls; run.souls += souls; run.floats.push({ x: e.x, y: 95, text: `+${souls} Seele${souls > 1 ? 'n' : ''}`, color: '#c9a6ff', size: 16, t: 1 }); }
      if (feature(S, 'runen') && run.mode === 'normal' && (e.boss || (e.elite && Math.random() < 0.03))) {
        const tier = e.boss ? bossRuneTier(run.stage) : Math.min(10, 1 + Math.floor(run.stage / 40));
        const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, tier);
        if (r) { sfx('rune'); run.runes.push(r); run.floats.push({ x: e.x, y: 75, text: `Rune: ${RUNE[r.t].name} ${ROMAN[r.tier]}`, color: RUNE[r.t].color, size: 14, t: 1.4 }); }
      }
    }
    // Besiegte Gegner bleiben kurz als Zerfall-Animation sichtbar (nur Optik)
    run.corpses = (run.corpses || []).filter(c => (c.t += dt) < 0.5);
    for (const e of run.enemies) if (e.hp <= 0 && run.corpses.length < 14) { e.dying = true; run.corpses.push({ e, t: 0 }); }
    run.enemies = run.enemies.filter(e => e.hp > 0);
    if (!run.enemies.length) {
      if (run.mode === 'tower') {
        if (run.stage > S.towerBest) {
          S.towerBest = run.stage;
          if (run.stage % 5 === 0) { const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, Math.min(10, 1 + Math.floor(run.stage / 15))); if (r) run.runes.push(r); }
        }
      } else if (ahnLike(run)) { return ahnNext(S, st, run, c);
      } else if (run.mode === 'exp') {
        run.waves++;
        const m = MISSION[run.mission];
        if ((m.waves && run.waves >= m.waves) || (m.bosses && run.bossKills >= m.bosses)) { run.victory = true; run.dead = true; return 'dead'; }
        for (const k of run.order) { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * 0.15); }
        spawnWave(run); return;
      } else if (run.mode === 'normal') {
        if (run.stage > S.best) S.best = run.stage;
        if (run.stage > (S.ascBest || 0)) S.ascBest = run.stage;
        if (run.stage > S.bestEver) S.bestEver = run.stage;
        if (run.stage >= st.cap) { run.victory = true; run.dead = true; S.runs++; return 'dead'; }
      }
      run.stage++; if (run.mode === 'normal' || run.mode === 'tower') sfx('stage');
      for (const k of run.order) { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * 0.15); }
      spawnWave(run);
    }
    run.floats.forEach(x => { x.t -= dt; x.y -= 30 * dt; });
    run.floats = run.floats.filter(x => x.t > 0);
    run.parts.forEach(p => { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; });
    run.parts = run.parts.filter(p => p.t > 0);
    run.arrows.forEach(a => (a.t += dt));
    run.arrows = run.arrows.filter(a => a.t < a.d);
    const alive = run.order.filter(k => run.h[k].alive).length;
    if (st.comp.phoenix >= 10 && !run.compRevive && (alive === 0 || (alive === 1 && run.order.length >= 3))) {
      run.compRevive = true; run.fx.phoenix = 1;
      run.order.forEach(k => { const h = run.h[k]; if (!h.alive) { h.alive = true; h.hp = st[k].hp * 0.5; c.float(k, 'Phönix!', '#ff9a3d', 15); sigRevive(c, k); } });
    }
    if (!run.order.some(k => run.h[k].alive)) { run.dead = true; S.runs++; return 'dead'; }
  }
  const tgtSafe = run => run.enemies[0];
  const TURRET = { turret: true };

  /* ---------- Notfall-Code ---------- */
  const ALPH = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function packNums(nums) {
    const out = [];
    for (let n of nums) { n = Math.max(0, Math.floor(n)); do { const d = n % 16; n = Math.floor(n / 16); out.push(d + (n > 0 ? 16 : 0)); } while (n > 0); }
    let sum = 0; out.forEach((v, i) => (sum = (sum + v * ((i % 7) + 1)) % 1024));
    out.push(sum % 32, Math.floor(sum / 32));
    return out.map((v, i) => ALPH[(v + i * 7 + 3) % 32]).join('').replace(/(.{4})(?=.)/g, '$1-');
  }
  function unpackNums(code) {
    const raw = String(code).toUpperCase().replace(/O/g, '0').replace(/I/g, '1').replace(/[^0-9A-Z]/g, '');
    const vals = [];
    for (let i = 0; i < raw.length; i++) { const k = ALPH.indexOf(raw[i]); if (k < 0) return null; vals.push(((k - i * 7 - 3) % 32 + 64) % 32); }
    if (vals.length < 3) return null;
    const body = vals.slice(0, -2), sumGot = vals[vals.length - 2] + vals[vals.length - 1] * 32;
    let sum = 0; body.forEach((v, i) => (sum = (sum + v * ((i % 7) + 1)) % 1024));
    if (sum !== sumGot) return null;
    const nums = []; let n = 0, mul = 1;
    for (const v of body) { n += (v % 16) * mul; mul *= 16; if (v < 16) { nums.push(n); n = 0; mul = 1; } }
    return nums;
  }
  function encode(S) {
    const eq = S.equip.map(id => NODES.findIndex(n => n.id === id) + 1);
    const rIdx = id => (id ? S.runes.findIndex(r => r.id === id) + 1 : 0);
    return packNums([5, S.gold, S.souls, S.best, S.bestEver, S.runs, S.stars, S.rebirths, S.dust, S.towerBest,
      NODES.length, ...NODES.map(n => rank(S, n.id)), PERKS.length, ...PERKS.map(p => perk(S, p.id)), eq.length, ...eq,
      S.runes.length, ...S.runes.flatMap(r => [RUNES.findIndex(x => x.id === r.t), r.tier]),
      HEROES.length, ...HEROES.flatMap(h => [0, 1, 2].map(i => rIdx((S.sockets[h.id] || [])[i]))),
      S.asc, S.crowns, CPERKS.length, ...CPERKS.map(p => cperk(S, p.id)), ACH.length, ...ACH.map(a => (S.ach[a.id] ? 1 : 0)),
      S.tot.kills, S.tot.souls, COMPS.length, ...COMPS.map(c => S.comps[c.id] || 0), ...[0, 1].map(i => (S.compActive[i] ? COMPS.findIndex(c => c.id === S.compActive[i]) + 1 : 0)), S.tempo || 0,
      S.exp.spl, S.exp.done, Math.max(0, PUZZLE.indexOf(S.exp.target)), PUZZLE.length, ...PUZZLE.map(id => pieceMask(S, id)),
      1, kSlots(S), HEROES.length, ...HEROES.map(h => (S.kplace || {})[h.id] || 0), S.altar || 0, 1, 1, 1, S.rlager || 0, 1,
      1, S.ahn.sig, S.ahn.got, S.ahn.m, S.ahn.lvl, HEROES.length, ...HEROES.map(h => (S.ahn.place[h.id] ? 1 : 0)), S.ascBest || 0, 1, S.rankGot || 0, S.wf || 0, HEROES.length, ...HEROES.map(h => (S.mast || {})[h.id] || 0), ...HEROES.map(h => Math.max(0, SKINS.findIndex(k => k.id === (S.skin || {})[h.id]))), 1, HEROES.length, ...HEROES.flatMap(h => [3, 4, 5].map(i => rIdx((S.sockets[h.id] || [])[i]))), 1, S.season || 0, 1, S.tst ? 1 : 0]);
  }
  function decode(code) {
    const nums = unpackNums(code); if (!nums) return null;
    let i = 0; const next = () => { if (i >= nums.length) throw 0; return nums[i++]; };
    try {
      const v = next(), d = { v: Math.min(v, 3), nodes: {}, perks: {}, equip: [], runes: [], sockets: {} };
      const readNodes = () => { const c = next(); for (let k = 0; k < c; k++) { const r = next(); if (NODES[k]) d.nodes[NODES[k].id] = r; } };
      const readEq = n => { for (let k = 0; k < n; k++) { const e = next(); if (e > 0 && NODES[e - 1]) d.equip.push(NODES[e - 1].id); } };
      if (v === 2) { d.gold = next(); d.souls = next(); d.best = next(); d.runs = next(); readNodes(); readEq(2); }
      else if (v >= 3 && v <= 5) {
        d.gold = next(); d.souls = next(); d.best = next(); d.bestEver = next(); d.runs = next(); d.stars = next(); d.rebirths = next();
        if (v >= 4) { d.dust = next(); d.towerBest = next(); d.v = 4; }
        readNodes();
        const pc = next(); for (let k = 0; k < pc; k++) { const r = next(); if (PERKS[k]) d.perks[PERKS[k].id] = r; }
        readEq(next());
        if (v >= 4) {
          const rc = next(); for (let k = 0; k < rc; k++) { const t = next(), tier = next(); d.runes.push({ id: k + 1, t: RUNES[t] ? RUNES[t].id : 'kraft', tier }); }
          const hc = next(); for (let k = 0; k < hc; k++) { const arr = [next(), next(), next()]; if (HEROES[k]) d.sockets[HEROES[k].id] = arr.map(x => (x > 0 ? x : null)); }
          d.runeSeq = rc + 1;
        }
        if (v === 5) {
          d.v = 5; d.asc = next(); d.crowns = next(); d.cperks = {}; d.ach = {}; d.comps = {}; d.compActive = [];
          const cc = next(); for (let k = 0; k < cc; k++) { const r = next(); if (CPERKS[k]) d.cperks[CPERKS[k].id] = r; }
          const ac = next(); for (let k = 0; k < ac; k++) { const r = next(); if (r && ACH[k]) d.ach[ACH[k].id] = 1; }
          d.tot = { kills: next(), souls: next() };
          const pc2 = next(); for (let k = 0; k < pc2; k++) { const l = next(); if (l && COMPS[k]) d.comps[COMPS[k].id] = l; }
          for (let k = 0; k < 2; k++) { const e = next(); if (e > 0 && COMPS[e - 1]) d.compActive.push(COMPS[e - 1].id); }
          d.seenIntro = true;
          if (i < nums.length) d.tempo = next();
          if (i < nums.length) {
            d.exp = { spl: next(), done: next(), target: PUZZLE[next()] || 'a', pieces: {} };
            const pc3 = next(); for (let k = 0; k < pc3; k++) { const m = next(); if (PUZZLE[k] && m) d.exp.pieces[PUZZLE[k]] = m; }
          }
          if (i < nums.length) { d.keyV = next(); d.kslots = next(); d.kplace = {}; const hc2 = next(); for (let k = 0; k < hc2; k++) { const n = next(); if (HEROES[k] && n) d.kplace[HEROES[k].id] = n; } }
          if (i < nums.length) d.altar = next();
          if (i < nums.length) d.infV = next();
          if (i < nums.length) d.startV = next();
          if (i < nums.length) d.shardV = next();
          if (i < nums.length) d.rlager = next();
          if (i < nums.length) d.starV = next();
          if (i < nums.length) { next(); d.ahnV = 1; d.ahn = { sig: next(), got: next(), m: next(), lvl: next(), place: {} }; const hc3 = next(); for (let k = 0; k < hc3; k++) { const on = next(); if (on && HEROES[k]) d.ahn.place[HEROES[k].id] = 1; } }
          if (i < nums.length) d.ascBest = next();
          if (i < nums.length) { next(); d.rankGot = next(); d.wf = next(); const hc4 = next(); d.mast = {}; d.skin = {}; for (let k = 0; k < hc4; k++) { const x = next(); if (HEROES[k] && x) d.mast[HEROES[k].id] = x; } for (let k = 0; k < hc4; k++) { const x = next(); if (HEROES[k] && SKINS[x]) d.skin[HEROES[k].id] = SKINS[x].id; } }
          if (i < nums.length) { next(); const hc5 = next(); for (let k = 0; k < hc5; k++) { const a = [next(), next(), next()]; if (HEROES[k] && d.sockets[HEROES[k].id]) d.sockets[HEROES[k].id].push(...a.map(x => (x > 0 ? x : null))); } }
          if (i < nums.length) { next(); d.season = next(); }
          if (i < nums.length) { next(); if (next()) d.tst = 1; }
        }
      } else return null;
      return migrate(d);
    } catch { return null; }
  }

  // Obergrenze nur gegen kaputte Zahlen (unendlich); praktisch unbegrenzt
  const GOLD_MAX = 1e300;
  function fmt(n) {
    if (!(n < Infinity)) return '∞';
    if (n < 1000) return String(Math.floor(n));
    const units = ['', ' Tsd.', ' Mio.', ' Mrd.', ' Bio.', ' Brd.', ' Trio.', ' Trd.', ' Quad.', ' Quadd.', ' Quint.', ' Quintd.', ' Sext.', ' Sextd.', ' Sept.', ' Septd.', ' Okt.', ' Oktd.', ' Non.', ' Nond.', ' Dez.', ' Dezd.'];
    let i = 0; while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    if (n >= 1000) { const e = Math.floor(Math.log10(n)); return (n / Math.pow(10, e)).toFixed(2).replace('.', ',') + units[i].replace(/^ /, ' ×10^' + e + ' '); }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString()).replace('.', ',') + units[i];
  }

  const core = { RAR, RAR_COL, GEAR_SLOTS, TINTS, HERO_SETS, DECO_SLOTS, ITEMS, TROPHY_N, BSET_AT, itemOf, invN, invAdd, invUsed, invFree, equipGear, setDeco, chestRoll, chestCount, openChest, trophyRoll, bsetCount, bsetAdd, CHEST, TROPHY, TRIPS, TRIP_SHARE, onTrip, tripLeft, rateOf, noteRate, hoursReward, tripReward, startTrip, claimTrip, WB, WB_BOSS, wbScore, wbBarReward, wbBarSecs, wbGoalHours, wbReward, GACHA, G_FIVE, G_FOUR, CONS_H, consList, consApply, evtBanner, evtPeriod, starSock, gachaOpen, evtOpen, gemOpen, gemBossFirst, GIFT_PULLS, consOf, bannerOf, gachaPull, GEM_SRC, LOGIN, loginItem, loginToday, claimLogin, BOUNTY, bountiesOf, bountyDone, bountyClaim, ahnLike, AHN_MISSIONS, AHN_ABIL, AHN_MECH, AHN_BOONS, ahnRollBoons, ahnPickBoon, ahnBoonText, ahnApplyBoons, AHN_TRAIT, AHNE, AHN_TUNE, AHN_COUNT, ahnOpen, ahnBossesOf, ahnLevelFor, placeSigil, ahnClaim, unrebirth, transmute, bossRuneTier, resetPerks, buyLager, lagerCost, LAGER_MAX, runeCap, shardOf, mergeCost, ALTAR_MAX, altarCost, altarMul, buyAltar, kSlots, kFree, keyCap, addSock, removeSock, removeKey, PUZZLE, MISSIONS, MISSION, PIECE_COST, claimExp, buyPiece, assembled, pieceCount, pieceMask, expOpen, expStage, fieldOf, fieldSlots, toggleField, bossOf, BOSS_NAMES, TEMPO_COST, maxSpeed, buyTempo, areaMax, zoneName, BIOMES, HEROES, HERO, NODES, NODE, PERKS, RUNES, RUNE, TUNE, fresh, migrate, stats, newRun, step, buy, canBuy, available, blockReason, nodeCost, rank, perk, buyPerk, perkCost,
    SEASON, rankOf, RANKS, rankBonus, AREAS, areaOf, MISSIONS, extraSocks, XSOCK, sockOk, runeAmp, mastInfo, mastLevel, SKINS, WF_STAGE, WF, wfSpawn,
    sigOn, sigKeysUsed, keyNeed, eqOf, slotLim, SIG, SIG_FLAGS, newRun, step, stats, buy, available, blockReason, NODE, migrate, fresh,
    rebirth, ascend, crownsFor, buyCperk, cperkCost, cperk, CPERKS, levelComp, toggleComp, compCost, compMax, compSlots, COMPS, checkAch, ACH, claimWeekly, weekId, dayId, weekRules, RULE, WEEK_TIERS, statsFor, starsFor, toggleEquip, slotsOf, hired, classOpen, keysUsed, keyLimit, capOf, reqOf, feature, encode, decode, fmt, socket, unsocket, merge, canMerge, dismantle, buyRune, runeVal, addRune };
  if (typeof module !== 'undefined') { module.exports = core; return; }
  // ---------- Automatische Updates ----------
  // Prüft alle 2 Minuten (und beim Zurückkehren in den Tab), ob auf dem Server eine neue ritter.js liegt.
  // Ist eine da, wird im Lager gespeichert und neu geladen; während eines Laufs erst danach.
  const UPD = { src: (document.currentScript && document.currentScript.src) || '', tag: null, pending: false, busy: false, noted: false };
  const updUrl = () => UPD.src || [...document.scripts].map(x => x.src).find(x => /ritter\.js/.test(x)) || '';
  async function updCheck() {
    const url = updUrl(); if (!url || UPD.pending || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); if (!r.ok) return;
      const tag = r.headers.get('etag') || r.headers.get('last-modified') || r.headers.get('content-length'); if (!tag) return;
      if (UPD.tag == null) { UPD.tag = tag; return; }
      if (tag !== UPD.tag) { UPD.pending = true; updApply(); }
    } catch {}
  }
  function updApply(force) {
    if (!UPD.pending || UPD.busy) return;
    if (!force && (!active || (run && !run.dead))) { if (active && run && !UPD.noted) { UPD.noted = true; toast('Ein Update ist bereit. Es wird nach diesem Lauf geladen.'); } return; }
    UPD.busy = true; try { save(); if (typeof cloudSave === 'function') cloudSave(true); } catch {}
    toast('Update wird geladen …', true);
    // Neue Dateien am Zwischenspeicher vorbei holen, damit nach dem Neuladen wirklich die neue Version läuft
    const css = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href).filter(h => /style\.css/.test(h));
    Promise.all([updUrl(), ...css].filter(Boolean).map(u => fetch(u, { cache: 'reload' }).catch(() => null)))
      .then(() => new Promise(r => setTimeout(r, 900))).finally(() => location.reload());
  }
  setTimeout(updCheck, 4000); setInterval(() => { if (!document.hidden) updCheck(); }, 300000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updCheck(); });

