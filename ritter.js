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
  ];
  const HERO = Object.fromEntries(HEROES.map(h => [h.tree, h]));
  const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));
  // Rollen für die Truppe: bestimmen Farbe des Kreises und die Reihenfolge von vorne nach hinten
  const ROLE = { w: 'tank', r: 'melee', t: 'melee', d: 'msup', s: 'ranged', a: 'ranged', m: 'ranged', n: 'ranged', e: 'ranged', b: 'sup', p: 'sup' };
  const ROLE_INFO = { tank: { name: 'Tank', col: '#b06bff' }, melee: { name: 'Nahkampf', col: '#ff4d5e' }, msup: { name: 'Nahkampf-Helfer', col: '#ffd23f' }, ranged: { name: 'Fernkampf', col: '#4fc3ff' }, sup: { name: 'Unterstützung', col: '#5be37d' } };
  const LINE_ORDER = ['w', 'r', 't', 'd', 's', 'a', 'm', 'n', 'e', 'b', 'p'];

  // Was jede Wiedergeburt freischaltet
  const CAPS = [30, 45, 60, 75, 90, 105, 120, 135, 150];
  const ROADMAP = [
    { r: 1, text: 'Wächter als neue Klasse, dazu Seelenaltar und Tempo' }, { r: 2, text: 'Runen: Bosse lassen Runen fallen, jede Klasse hat 3 Sockel. Runen zerstören und das Lager mit Runensplittern erweitern' }, { r: 3, text: 'Schützin als neue Klasse' },
    { r: 4, text: 'Runenschmied: 3 gleiche Runen verschmelzen, zufällige Runen kaufen' }, { r: 5, text: 'Magier als neue Klasse' }, { r: 6, text: 'Ahnenprüfung: 10 Missionen voller Bosse, am Ende wartet der Urahn mit einem Ahnensiegel' },
    { r: 7, text: 'Priesterin als neue Klasse' }, { r: 8, text: 'Turm-Modus: endloser Turm mit dauerhaftem Bonus' }, { r: 9, text: 'Tierbändiger als neue Klasse. Alle 150 Stufen, danach endlose Albtraum-Stufen. Der Aufstieg wird möglich.' },
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
    s: [[dm('all', 'crit', 0.02)], '+2 % kritische Trefferchance für alle Helden je Stufe (wirkt immer etwas schwächer)', [ad('all', 'critD', 0.12)], '+12 % kritischer Schaden für alle Helden je Stufe'],
    p: [[pw('g', 'walk', 1.03)], '+3 % Laufgeschwindigkeit der Gruppe je Stufe. Ab Stufe 37 (×3 Tempo): jede weitere Stufe +1,5 % Angriffstempo aller Helden', [pw('all', 'aps', 1.03)], '+3 % Angriffstempo aller Helden je Stufe', { g: { cap: 37, over: [pw('all', 'aps', 1.015)] } }],
    m: [[pw('all', 'actMul', 1.06)], '+6 % Schaden aller aktiven Fähigkeiten je Stufe', [ad('all', 'cdr', 0.02)], '−2 % Abklingzeit aller aktiven Fähigkeiten je Stufe. Abklingzeit sinkt höchstens um 60 %, jeder Prozentpunkt darüber wird zu +2 % Schaden der aktiven Fähigkeiten'],
    t: [[pw('g', 'gold', 1.04)], '+4 % Gold je Stufe', [ad('all', 'regen', 0.001)], 'Alle Helden regenerieren 0,1 % ihres Lebens pro Sekunde je Stufe'],
  };
  const PAIR = { w: 'w', s: 's', p: 'p', m: 'm', t: 't', a: 's', n: 't', b: 'p', d: 'w', e: 'm' };
  // Endlos-Fertigkeiten mit Grenze: ab cap wirkt jede weitere Stufe als Ersatz-Bonus (over), damit sie wirklich endlos bleiben
  const infG = (h, base) => ({ max: 9999, cost: G(base, 1.35), kind: 'inf', fx: INF[PAIR[h]][0], desc: INF[PAIR[h]][1], icon: '∞', ...((INF[PAIR[h]][4] || {}).g || {}) });
  const infS = h => ({ max: 9999, cost: r => ({ g: 0, s: 6 + 2 * r }), kind: 'inf', fx: INF[PAIR[h]][2], desc: INF[PAIR[h]][3], icon: '∞', ...((INF[PAIR[h]][4] || {}).s || {}) });

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
    { id: 'ahnen', name: 'Ahnenkraft', icon: '∞', x: 4, y: 0, p: ['phoenix', 'ernte'], max: 9999, cost: r => ({ g: 0, s: 6 + 2 * r }), kind: 'inf', fx: [pw('all', 'hp', 1.05)], desc: '+5 % Leben aller Helden je Stufe, ohne Obergrenze' },
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
      K2: sK('sg_w_koloss', 'Koloss', '▣', 'Angriffe des Wächters machen zusätzlich 4 % seines maximalen Lebens als Schaden', [ad('w', 'koloss', 0.04)]),
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
      K2: sK('sg_p_feuer', 'Heiliges Feuer', '♨', 'die Hälfte jeder Heilung der Priesterin trifft den vordersten Gegner als Schaden', [ad('p', 'holyFire', 0.5)]),
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
  // Schalter, die Siegel-Schlüssel setzen (Startwert 0)
  const SIG_FLAGS = ['wmaster', 'schwur', 'brother', 'vorbild', 'blockStun', 'koloss', 'wille', 'protector', 'sharp', 'hunt', 'falcon', 'toxik', 'schauer', 'overload', 'focus',
    'angel', 'holyFire', 'hohe', 'wrath', 'packLead', 'bleed', 'loyal', 'leit', 'dancer', 'soulBlade', 'coldBlood', 'flow', 'minionLong', 'boneArmor', 'collect', 'necro',
    'ensemble', 'cresc', 'takt', 'muse', 'bloom', 'eagle', 'rinde', 'warden', 'tinker', 'splitter', 'plating', 'precise'];
  const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));
  for (const h of HEROES) if (h.hire) { if (h.puzzle) NODE[h.hire].reqPuzzle = h.id; else NODE[h.hire].reqRebirth = h.rebirth; }

  // Dauerhafte Upgrades aus der Wiedergeburt (bezahlt mit Sternen)
  const PERKS = [
    { id: 'p_macht', name: 'Heldenblut', desc: '+10 % Schaden und Leben aller Helden je Stufe (wächst aufeinander auf)', max: 999, cost: r => 1 + r + Math.floor(r / 2) },
    { id: 'p_gold', name: 'Goldader', desc: '+15 % Gold je Stufe', max: 999, cost: r => 1 + r },
    { id: 'p_seele', name: 'Seelenquelle', desc: '+1 Seele pro besiegtem Boss je Stufe', max: 10, cost: r => 2 + 2 * r },
    { id: 'p_start', name: 'Beutezug', desc: 'Startest du in einem späteren Gebiet, bekommst du 10 % je Stufe des Golds der übersprungenen Stufen und +10 % mehr Abkürzungs-Seelen', max: 10, cost: r => 2 + r },
    { id: 'p_freunde', name: 'Alte Freunde', desc: 'Angeheuerte Klassen bleiben nach einer Wiedergeburt angeheuert', max: 1, cost: () => 5 },
    { id: 'p_platz', name: 'Dritte Hand', desc: '+1 Platz für aktive Fähigkeiten des Ritters', max: 1, cost: () => 8 },
    { id: 'p_zins', name: 'Startkapital', desc: 'Nach einer Wiedergeburt startest du mit 500 Gold je Stufe', max: 30, cost: r => 1 + Math.floor(r / 2) },
    { id: 'p_seelenst', name: 'Seelenvorrat', desc: 'Nach einer Wiedergeburt startest du mit 3 Seelen je Stufe', max: 20, cost: r => 2 + r },
    { id: 'p_feld', name: 'Fünfter Platz', desc: '+1 Platz auf dem Feld: 5 Helden kämpfen gleichzeitig', max: 1, cost: () => 40 },
  ];
  const PERK = Object.fromEntries(PERKS.map(p => [p.id, p]));
  const starsFor = (S, best = S.best) => (best < reqOf(S) ? 0 : Math.floor(Math.pow(Math.max(1, best - 15), 1.35) / 3 * (1 + 0.5 * ((S.cperks && S.cperks.k_sterne) || 0))));

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
  const crownsFor = S => (S.rebirths >= ASC_REQ_REBIRTHS && S.best >= ASC_REQ_STAGE ? 10 + Math.floor((S.best - ASC_REQ_STAGE) / 4) : 0);
  const ASC_ROAD = [
    { a: 1, text: 'Kronen-Laden mit dauerhaften Königs-Boni' }, { a: 2, text: 'Begleiter: Drache und Eule' }, { a: 3, text: 'Begleiter: Golem' },
    { a: 4, text: 'Begleiter: Phönix und ein zweiter Begleiter-Platz' }, { a: 5, text: 'Begleiter bis Stufe 100' },
  ];
  const ascDiff = S => Math.pow(1.6, S.asc || 0);

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
    { id: 'week30', name: 'Herausforderer', desc: 'Erreiche Stufe 30 in einer Wochen-Herausforderung', ok: S => S.weekly.best >= 30 },
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
  const WEEK_TIERS = [{ st: 15, stars: 2 }, { st: 30, stars: 4 }, { st: 50, stars: 7 }, { st: 80, stars: 12 }, { st: 120, stars: 20, crown: 1 }];
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
    { id: 'schutz', name: 'Schutz', color: '#7fb2ff', desc: v => `−${pct(v)} erlittener Schaden (zählt immer voll, höchstens 72 %)`, val: 0.025 },
    { id: 'fokus', name: 'Fokus', color: '#c08cff', desc: v => `Fähigkeiten laden ${pct(v)} schneller. Abklingzeit sinkt höchstens um 60 %, jeder Prozentpunkt darüber wird zu +2 % Schaden der aktiven Fähigkeiten`, val: 0.04 },
    { id: 'glueck', name: 'Glück', color: '#ffcf4a', desc: v => `+${pct(v)} Gold für alle`, val: 0.06 },
    { id: 'seele', name: 'Seele', color: '#c9a6ff', desc: v => `+${pct(v)} Chance auf Seelen bei Elite-Gegnern`, val: 0.03 },
  ];
  const RUNE = Object.fromEntries(RUNES.map(r => [r.id, r]));
  const pct = v => `${Math.round(v * 1000) / 10} %`.replace('.', ',');
  const runeVal = (type, tier) => RUNE[type].val * Math.pow(2.2, tier - 1);
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const LAGER_STEP = 5, LAGER_MAX = 12;
  const lagerCost = n => 10 * Math.pow(2, n);
  const runeCap = S => 40 + LAGER_STEP * (S.rlager || 0);
  const DUST_RUNE = 4;
  const shardOf = tier => Math.pow(3, tier - 1), mergeCost = tier => Math.pow(3, tier);
  /* ================= Ahnenprüfung ================= */
  // 10 Missionen mit je 5 eigenen Bossen (3 Phasen), am Ende von Mission 10 wartet der Urahn. Wer die Kette schafft, bekommt ein Ahnensiegel.
  const AHN_TUNE = { hp: 22, dmg: 0.14, minHp: 0.55, waves: 2, lvl: 0.8, ahneHp: 1.2, enr: 140 };
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
  const AHN_COUNT = AHN_MISSIONS.length;
  const ahnOpen = S => feature(S, 'ahnen');
  const ahnBossesOf = mi => (mi === AHN_COUNT - 1 ? [...AHN_MISSIONS[mi].bosses, AHNE] : AHN_MISSIONS[mi].bosses);
  const ahnLevelFor = S => Math.max(10, Math.round(AHN_TUNE.lvl * Math.max(S.bestEver || 0, S.best || 0, 10)));
  function ahnFix(d) {
    const a = d && typeof d === 'object' ? d : {}, n = x => Math.max(0, Math.floor(Number(x) || 0));
    const out = { m: Math.min(AHN_COUNT - 1, n(a.m)), lvl: n(a.lvl), sig: n(a.sig), got: n(a.got), place: {} };
    for (const h of HEROES) if (a.place && a.place[h.id]) out.place[h.id] = 1;
    return out;
  }
  function placeSigil(S, hid) {
    if (!HERO_BY_ID[hid] || S.ahn.place[hid] || S.ahn.sig <= 0) return false;
    S.ahn.sig--; S.ahn.place[hid] = 1; return true;
  }
  function ahnInit(S, run) {
    if (!S.ahn.lvl) S.ahn.lvl = ahnLevelFor(S);
    run.stage = run.startStage = S.ahn.lvl;
    run.ahn = { mi: S.ahn.m, bi: 0, wave: 0, boss: null, fx: [], banner: null };
  }
  function ahnMinion(run, i, ranged, mul = 1) {
    const e = makeEnemy(run.stage, i, false, false, run, ranged);
    e.type = AHN_MISSIONS[run.ahn.mi].minion; e.hp *= AHN_TUNE.minHp * mul; e.max = e.hp;
    return e;
  }
  function ahnSpawn(run) {
    const A = run.ahn, list = ahnBossesOf(A.mi);
    run.enemies = [];
    if (A.wave < AHN_TUNE.waves) { for (let i = 0; i < 4; i++) run.enemies.push(ahnMinion(run, i, i === 3)); return; }
    const def = list[A.bi], e = makeEnemy(run.stage, 1.2, true, false, run);
    const hpMul = AHN_TUNE.hp * (def.ahne ? AHN_TUNE.ahneHp : 1);
    e.hp *= hpMul; e.max = e.hp; e.dmg *= AHN_TUNE.dmg; e.lastHp = e.hp;
    e.ahn = def; e.bk = def.bk; e.type = def.bk >= 0 && def.bk < 5 ? ENEMY_KINDS[def.bk] : AHN_MISSIONS[A.mi].minion;
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
    const D = e.dmg, A = run.ahn, al = aliveHeroes(run); if (!al.length) return;
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
      case 'split': for (let i = 0; i < 2; i++) { const m = makeEnemy(run.stage, 0, false, true, run); m.type = e.type; m.hp = m.max = e.max * 0.06; m.dmg = D * 0.35; m.x = e.x - 30 - i * 26; m.echo = e.ahn.tint || '#ffd27a'; run.enemies.push(m); } c.burst(e.x, 170, e.ahn.tint || '#ffd27a', 16); break;
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
    const rdt = dt / Math.max(1, S.speed || 1);
    run.curseT -= dt; run.slowT -= dt; run.blindT -= dt; run.silT -= dt; if (run.introT > 0) run.introT -= rdt;
    if (A.banner) { A.banner.t -= rdt; if (A.banner.t <= 0) A.banner = null; }
    // Effekte mit Verzögerung
    for (const f of A.fx) {
      f.t -= dt;
      if (f.kind === 'burn') aliveHeroes(run).forEach(k => { const h = run.h[k]; h.hp -= f.dps * dt * (1 - st[k].dr * 0.6); if (h.hp <= 0) { h.hp = 1; hurtHero(c, k, 2, null); } });
      if (f.t <= 0 && !f.done) {
        f.done = true;
        const D = A.boss ? A.boss.dmg : 0;
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
        if (e.reflT > 0) { const fk = frontHero(run); if (fk) hurtHero(c, fk, (lost - back) * 0.25, null); }
      }
      e.hp += back;
    }
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
    if (e.traits.regen) { e.hp = Math.min(e.max * (3 - e.phase) / 3, e.hp + e.max * e.traits.regen * dt); e.lastHp = e.hp; }
    e.atkMul = e.frenzyT > 0 ? 2 : 1;
    if (run.introT > 0 || e.stun > 0 || e.x > 470) return;
    // Wut, wenn eine Phase zu lange dauert
    e.phaseT += dt;
    const en = e.phaseT > AHN_TUNE.enr ? 1 + 0.15 * Math.floor((e.phaseT - AHN_TUNE.enr) / 8 + 1) : 1;
    if (en > (e.enrage || 1)) { e.enrage = en; c.efloat(e, `Wut ×${en.toFixed(1).replace('.', ',')}`, '#ff5a5a', 15); }
    for (const ab of e.ab) { ab.t -= dt; if (ab.t <= 0) { ahnCast(S, st, run, c, e, ab.id); ab.t = AHN_ABIL[ab.id].cd * (0.85 + Math.random() * 0.3); } }
  }
  // Welle geschafft: nächste Welle, nächster Boss oder Mission gewonnen
  function ahnNext(S, st, run, c) {
    const A = run.ahn, list = ahnBossesOf(A.mi);
    if (A.wave < AHN_TUNE.waves) A.wave++;
    else {
      A.bi++; A.wave = 0; A.boss = null; run.bossKills++;
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
    if (mi >= AHN_COUNT - 1) { S.ahn.m = 0; S.ahn.lvl = 0; S.ahn.sig++; S.ahn.got++; return { mission: mi, sigil: true }; }
    S.ahn.m = mi + 1; return { mission: mi, sigil: false };
  }

  /* ================= Spielstand ================= */
  function fresh() {
    return { v: SAVE_VERSION, gold: 0, souls: 0, best: 0, bestEver: 0, runs: 0, nodes: { start: 1 }, equip: [], speed: 1, stars: 0, rebirths: 0, perks: {},
      runes: [], sockets: Object.fromEntries(HEROES.map(h => [h.id, [null, null, null]])), dust: 0, runeSeq: 1, towerBest: 0,
      asc: 0, crowns: 0, cperks: {}, ach: {}, tot: { kills: 0, souls: 0 }, weekly: { week: '', best: 0, claimed: 0 }, comps: {}, compActive: [], seenIntro: false, area: 0, tempo: 0, bench: [], altar: 0, seenField: false, exp: { spl: 0, done: 0, target: 'a', pieces: {} }, ahn: ahnFix() };
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
      const arr = (d.sockets && Array.isArray(d.sockets[h.id]) ? d.sockets[h.id] : []).slice(0, 3);
      out.sockets[h.id] = [0, 1, 2].map(i => (ids.has(arr[i]) && !used.has(arr[i]) ? (used.add(arr[i]), arr[i]) : null));
    }
    out.cperks = {}; for (const [id, r] of Object.entries(d.cperks || {})) if (CPERK[id]) out.cperks[id] = Math.max(0, Math.min(CPERK[id].max, Math.floor(Number(r) || 0)));
    for (const k of ['asc', 'crowns']) out[k] = Math.max(0, Math.floor(Number(d[k]) || 0));
    out.ach = {}; for (const a of ACH) if (d.ach && d.ach[a.id]) out.ach[a.id] = 1;
    out.tot = { kills: Math.max(0, Math.floor(Number(d.tot?.kills) || 0)), souls: Math.max(0, Math.floor(Number(d.tot?.souls) || 0)) };
    out.weekly = { week: String(d.weekly?.week || ''), best: Math.max(0, Math.floor(Number(d.weekly?.best) || 0)), claimed: Math.max(0, Math.floor(Number(d.weekly?.claimed) || 0)) };
    out.comps = {}; for (const c of COMPS) { const l = Math.floor(Number(d.comps?.[c.id]) || 0); if (l > 0) out.comps[c.id] = Math.min(100, l); }
    out.compActive = (Array.isArray(d.compActive) ? d.compActive : []).filter(id => out.comps[id]).slice(0, 2);
    out.seenIntro = !!d.seenIntro || out.runs > 0;
    out.area = Math.max(0, Math.min(99, Math.floor(Number(d.area) || 0)));
    out.tempo = Math.max(0, Math.min(TEMPO_COST.length, Math.floor(Number(d.tempo) || 0)));
    out.bench = Array.isArray(d.bench) ? [...new Set(d.bench.filter(id => HERO_BY_ID[id]))] : [];
    out.seenField = !!d.seenField; out.seenExp = !!d.seenExp;
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
    const keep = keepHires(S);
    S.nodes = { start: 1 }; keep.forEach(id => (S.nodes[id] = 1));
    S.gold = 500 * perk(S, 'p_zins') + 5000 * cperk(S, 'k_start'); S.souls = 3 * perk(S, 'p_seelenst') + 10 * cperk(S, 'k_start'); S.best = 0; S.equip = []; S.area = 0;
    S.news = { kind: 'rebirth', n: S.rebirths, stars: st };
    return st;
  }
  function ascend(S) {
    const k = crownsFor(S); if (!k) return 0;
    S.crowns += k; S.asc++; S.bestEver = Math.max(S.bestEver, S.best);
    const keep = cperk(S, 'k_veteran') ? keepHires(S) : [];
    S.nodes = { start: 1 }; keep.forEach(id => (S.nodes[id] = 1));
    S.rebirths = 0; S.stars = 0; S.perks = {}; S.best = 0; S.equip = []; S.area = 0;
    S.gold = 5000 * cperk(S, 'k_start'); S.souls = 10 * cperk(S, 'k_start');
    for (const c of COMPS) if (S.asc >= c.asc && !S.comps[c.id]) S.comps[c.id] = 1;
    if (!S.compActive.length && Object.keys(S.comps).length) S.compActive = [Object.keys(S.comps)[0]];
    S.news = { kind: 'asc', n: S.asc, crowns: k };
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
    const id = weekId();
    if (S.weekly.week !== id) S.weekly = { week: id, best: 0, claimed: 0 };
    const score = run.stage;
    S.weekly.best = Math.max(S.weekly.best, score);
    let stars = 0, crowns = 0;
    WEEK_TIERS.forEach((t, i) => { if (S.weekly.best >= t.st && !(S.weekly.claimed & (1 << i))) { S.weekly.claimed |= 1 << i; stars += t.stars; crowns += t.crown || 0; } });
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
    for (const h of HEROES) S.sockets[h.id] = (S.sockets[h.id] || [null, null, null]).map(x => (x === runeId ? null : x));
    S.sockets[hid][slot] = runeId;
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
  function transmute(S, idA, idB) {
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
  function runeBonus(S, hid) {
    const b = {};
    if (!feature(S, 'runen')) return b;
    const list = (S.sockets[hid] || []).map(id => id && runeById(S, id)).filter(Boolean);
    const count = {}; list.forEach(r => (count[r.t] = (count[r.t] || 0) + 1));
    for (const r of list) b[r.t] = (b[r.t] || 0) + runeVal(r.t, r.tier) * (count[r.t] >= 3 ? 1.5 : 1);
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
  };
  const ZERO = { dr: 0, regen: 0, dbl: 0, thorns: 0, block: 0, dodge: 0, lifesteal: 0, cdr: 0, actMul: 1, burn: 0, pierce: 0, shots: 1, splash: 0, stunChance: 0,
    bossDmg: 0, vuln: 0, extraShot: 0, revive: 0, heal: 0, overShield: 0, reviveFast: 0, miracle: 0, wolfAtk: 0, wolfAps: 0, wolves: 0, wolfCrit: 0, wolfHeal: 0, packBonus: 0,
    ...Object.fromEntries(SIG_FLAGS.map(f => [f, 0])), rangedDmg: 0, raise: 0, minionMax: 0, minionMul: 1, minionDur: 0, songAtk: 0, songAps: 0, turrets: 0, turretMul: 0, turretAps: 0 };
  // Aufstellung: 4 Plätze auf dem Feld, +1 aus dem Sternen-Laden, +1 aus dem Kronen-Laden
  const fieldSlots = S => Math.min(6, 4 + perk(S, 'p_feld') + cperk(S, 'k_feld'));
  function fieldOf(S) {
    const avail = HEROES.filter(h => hired(S, h.tree)).map(h => h.id), bench = S.bench || [];
    const f = avail.filter(id => !bench.includes(id)).slice(0, fieldSlots(S));
    return f.length ? f : avail.slice(0, 1);
  }
  function toggleField(S, id) {
    const f = fieldOf(S);
    if (!HEROES.some(h => h.id === id && hired(S, h.tree))) return 'none';
    S.bench = HEROES.filter(h => hired(S, h.tree) && !f.includes(h.id) && h.id !== id).map(h => h.id);
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
    for (const [hid, T] of Object.entries(hs)) {
      const rb = runeBonus(S, hid);
      if (bardOn) T.aps *= 1 + hs.b.songAps;
      if (bardOn && hs.b.ensemble) { if (T.wolfAps) T.wolfAps *= 1 + hs.b.songAps; if (T.turretAps) T.turretAps *= 1 + hs.b.songAps; }
      T.atk *= perm * g.partyAtk * (1 + (rb.kraft || 0)); T.hp *= perm * g.partyHp * (1 + (rb.leben || 0)); if (T.heal) T.heal *= perm * (1 + (rb.kraft || 0));
      if (T.wolfAtk) T.wolfAtk *= perm * g.partyAtk * (1 + (rb.kraft || 0));
      T.aps *= 1 + (rb.eile || 0); T.critD *= 1 + (rb.zorn || 0);
      // Abklingzeit höchstens 60 %: jeder Prozentpunkt darüber wird zu +2 % Schaden der Fähigkeiten
      const cdrRaw = T.cdr + (rb.fokus || 0) + (rb.eile || 0) * 0.25;
      T.cdr = Math.min(0.6, cdrRaw); if (cdrRaw > 0.6) T.actMul *= 1 + 2 * (cdrRaw - 0.6);
      // Schadensreduktion: ab 50 % zählt der Rest halb, Schutz-Runen zählen immer voll (höchstens 72 %)
      const drRaw = T.dr + g.partyDr; T.dr = Math.min(0.72, (drRaw <= 0.5 ? drRaw : 0.5 + (drRaw - 0.5) * 0.5) + (rb.schutz || 0)); T.block = Math.min(0.35, T.block); T.regen += g.partyRegen;
      g.gold *= 1 + (rb.glueck || 0); g.eliteSoul += rb.seele || 0;
    }
    g.walk = Math.min(3, g.walk);
    const area = Math.min(S.area || 0, areaMax(S));
    const startStage = 1 + 10 * area;
    const field = fieldOf(S);
    const dragon = comp.drache ? 0.3 * (1 + 0.2 * comp.drache) * field.reduce((a, k) => a + (hs[k] ? hs[k].atk : 0), 0) : 0;
    return { ...hs, ...Object.fromEntries(HEROES.filter(h => !hs[h.id]).map(h => [h.id, null])), g, soulBonus: perk(S, 'p_seele'), startStage, cap: capOf(S), comp, dragon, field, slots: fieldSlots(S) };
  }
  // Expeditionen (ab dem 1. Aufstieg): Missionen geben Heldensplitter und mit etwas Glück Puzzleteile
  const MISSIONS = [
    { id: 'streif', name: 'Streifzug', desc: 'Überstehe 15 Wellen.', waves: 15, spl: 4, start: 0.7, icon: '⚑' },
    { id: 'bosse', name: 'Bosshatz', desc: 'Besiege 4 Bosse. Jede dritte Welle bringt einen.', bosses: 4, spl: 3, start: 0.65, icon: '♛' },
    { id: 'festung', name: 'Belagerung', desc: 'Überstehe 25 Wellen, ohne dass ein Held fällt.', waves: 25, spl: 7, start: 0.6, noLoss: true, icon: '⛉' },
  ];
  const MISSION = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
  const PIECE_COST = 95, PIECE_CHANCE = 0.005;
  const expOpen = S => S.asc >= 1 || (S.exp && S.exp.done > 0);
  const expStage = (S, m) => Math.max(1, Math.round((S.best || 0) * m.start));
  function claimExp(S, run) {
    const m = MISSION[run.mission]; if (!m || !run.victory) return null;
    S.exp.spl += m.spl; S.exp.done++;
    const id = S.exp.target, have = pieceMask(S, id), missing = [0, 1, 2, 3, 4, 5].filter(i => !(have & (1 << i)));
    let piece = null;
    if (missing.length && Math.random() < PIECE_CHANCE * missing.length) { piece = missing[Math.floor(Math.random() * missing.length)]; S.exp.pieces[id] = have | (1 << piece); }
    return { spl: m.spl, piece, hero: id, complete: piece != null && assembled(S, id) };
  }
  function buyPiece(S, id, i) {
    if (!PUZZLE.includes(id) || !(i >= 0 && i < 6) || (pieceMask(S, id) & (1 << i)) || S.exp.spl < PIECE_COST) return false;
    S.exp.spl -= PIECE_COST; S.exp.pieces[id] = pieceMask(S, id) | (1 << i);
    return true;
  }
  // Werte mit den Regeln der Wochen-Herausforderung
  function statsFor(S, mode) {
    const st = stats(S);
    if (mode === 'exp') { const m = MISSION[S.exp.mission] || MISSIONS[0]; st.cap = Infinity; st.startStage = expStage(S, m); st.rules = m.rules || []; return st; }
    if (mode === 'ahnen') { st.cap = Infinity; return st; }
    if (mode !== 'weekly') return st;
    const rules = weekRules(weekId());
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
    schrei: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.buffT = c.st.r.schwur ? 12 : 6; c.run.buffMul = 0.4 + 0.15 * (r - 1); c.float('r', 'Kriegsschrei!', '#ffb547'); } },
    w_wall: { cd: () => 12, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => { near(c.run).forEach(e => { c.hit('w', e, (1.5 + 0.5 * (r - 1)) * c.st.w.actMul, '#cfe0ff'); e.stun = Math.max(e.stun, 1); }); c.run.shake = 0.2; } },
    w_haut: { cd: () => 16, ready: (run, st) => run.h.w.hp < st.w.hp * (st.w.wille ? 0.9 : 0.7), cast: (c, r) => { c.run.hautT = 5 + r + (c.st.w.wille ? 3 : 0); c.float('w', 'Eiserne Haut', '#7fb2ff'); } },
    w_rache: { cd: () => 15, ready: engaged, cast: (c, r) => { c.run.racheT = 6 + r; c.float('w', 'Vergeltung', '#7fb2ff'); } },
    s_hagel: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 380); for (let i = 0; i < 6; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('s', e, 0.3 + i * 0.06, 'hag'); c.hit('s', e, (1.2 + 0.4 * (r - 1)) * c.st.s.actMul, '#c8f5cf'); } } },
    s_falke: { cd: () => 12, ready: run => !!strongest(run, 380), cast: (c, r) => { const t = strongest(c.run, 380); c.hit('s', t, (3.5 + 1.2 * (r - 1)) * c.st.s.actMul, '#c8f5cf'); t.mark = Math.max(t.mark || 0, 0.25); t.markT = 5; c.run.fx.falkeX = t.x; } },
    s_gift: { cd: () => 10, ready: run => !!strongest(run, 380), cast: (c, r) => { const t = strongest(c.run, 380); const stack = c.st.s.toxik ? Math.min(3, (t.poisonT > 0 ? t.poisonN || 1 : 0) + 1) : 1; t.poisonN = stack; t.poison = c.st.s.atk * (3 + (r - 1)) * c.st.s.actMul / 5 * stack; t.poisonT = 5; c.arrow('s', t, 0.35, 'gift'); } },
    m_meteor: { cd: () => 18, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { const n = c.st.m.schauer ? 3 : 1; for (let i = 0; i < n; i++) c.run.enemies.filter(e => e.x < 520 && e.hp > 0).forEach(e => c.hit('m', e, (5 + 1.5 * (r - 1)) * c.st.m.actMul * (n > 1 ? 0.5 : 1), '#ffb070')); c.run.shake = 0.3; } },
    m_eis: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => near(c.run).forEach(e => { c.hit('m', e, (1.5 + 0.5 * (r - 1)) * c.st.m.actMul, '#bfe6ff'); e.stun = Math.max(e.stun, 1.5); e.frozen = 1.5; }) },
    m_kette: { cd: () => 10, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { const ts = c.run.enemies.filter(e => e.x < 450).slice(0, 3 + r); c.run.fx.chain = ts.map(e => e.x); ts.forEach(e => c.hit('m', e, 2.5 * c.st.m.actMul, '#e2c9ff')); } },
    p_segen: { cd: () => 18, ready: (run, st) => anyBelow(run, st, 0.6), cast: (c, r) => c.healAll(0.3 + 0.08 * (r - 1), 'p') },
    p_schild: { cd: () => 16, ready: engaged, cast: (c, r) => c.run.order.forEach(k => { const h = c.run.h[k]; if (h.alive) h.shield = Math.max(h.shield, c.st[k].hp * (0.2 + 0.05 * (r - 1)) * (c.st.p.hohe ? 2 : 1)); }) },
    p_wieder: { cd: (r, S) => (rank(S, 'p_k2') ? 20 : 40), ready: run => run.order.some(k => !run.h[k].alive), cast: (c, r) => { const k = c.run.order.find(k => !c.run.h[k].alive); const h = c.run.h[k]; h.alive = true; h.hp = c.st[k].hp * (0.4 + 0.15 * (r - 1)); c.float(k, 'Wiederbelebt!', '#ffe48a'); sigRevive(c, k); } },
    t_rudel: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.packT = 8 + 2 * (r - 1); c.float('t', 'Rudelruf!', '#d9935a'); } },
    t_wurzel: { cd: () => 15, ready: run => near(run).length >= 1, cast: (c, r) => c.run.enemies.filter(e => e.x < 460).forEach(e => { c.hit('t', e, 1.2 * c.st.t.actMul, '#b5e08a'); e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1)); e.rooted = 2; }) },
    t_sprung: { cd: () => 12, ready: run => !!strongest(run, 360), cast: (c, r) => { const t = strongest(c.run, 360); c.hit('t', t, (6 + 2 * (r - 1)) * c.st.t.actMul, '#ffd2a8', true); c.run.fx.sprungX = t.x;
      if (c.st.t.leit) c.run.enemies.filter(e => e !== t && e.x < 420).sort((a, b) => b.hp - a.hp).slice(0, 2).forEach(e => c.hit('t', e, (6 + 2 * (r - 1)) * c.st.t.actMul, '#ffd2a8', true)); } },
    a_schatten: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 480), cast: (c, r) => {
      const vis = c.run.enemies.filter(e => e.x < 480), rng = vis.filter(e => e.ranged), ts = (rng.length ? rng : [...vis].sort((a, b) => b.x - a.x)).slice(0, 2);
      ts.forEach(e => c.hit('a', e, (6 + 2 * (r - 1)) * c.st.a.actMul * (e.ranged ? 1 + c.st.a.rangedDmg : 1), '#ff6b7a')); c.run.fx.shadowXs = ts.map(e => e.x); } },
    a_sturm: { cd: () => 12, ready: run => run.enemies.some(e => e.x < 400), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 400); for (let i = 0; i < 8; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('a', e, 0.2 + i * 0.05, 'kunai'); c.hit('a', e, (1.2 + 0.4 * (r - 1)) * c.st.a.actMul, '#ffc2c8'); } } },
    a_mal: { cd: () => 15, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); c.hit('a', t, (3 + (r - 1)) * c.st.a.actMul, '#ff6b7a'); t.mark = Math.max(t.mark || 0, 0.4); t.markT = 6; c.efloat(t, 'Todesmal', '#ff6b7a', 13); } },
    n_heer: { cd: () => 20, ready: engaged, cast: (c, r) => { for (let i = 0; i < 2 + r; i++) c.run.minions.push({ t: c.st.n.minionLong ? 24 : 12, atkT: 0.3 + i * 0.15, swing: 0 }); c.float('n', 'Totenheer!', '#6be0b8'); } },
    n_raub: { cd: () => 12, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); const d = c.hit('n', t, (3 + (r - 1)) * c.st.n.actMul, '#6be0b8'); c.healAllAbs(d * 0.15); c.run.fx.raubX = t.x; } },
    n_fluch: { cd: () => 16, ready: run => run.enemies.some(e => e.x < 420), cast: (c, r) => { c.run.enemies.forEach(e => { e.mark = Math.max(e.mark || 0, 0.25 + 0.1 * (r - 1)); e.markT = 6; e.cursed = 6; }); c.float('n', 'Fluch!', '#6be0b8'); } },
    b_krieg: { cd: (r, S) => (rank(S, 'sg_b_takt') && sigOn(S, 'barde') ? 18 * 0.6 : 18), ready: engaged, cast: (c, r) => { c.run.songT = 6; c.run.songMul = 0.3 + 0.1 * (r - 1); c.float('b', 'Kriegslied!', '#ff8ac8'); } },
    b_wiegen: { cd: () => 16, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => near(c.run).forEach(e => { e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1)); e.sleep = 2 + 0.5 * (r - 1); }) },
    b_schall: { cd: () => 12, ready: run => near(run).length >= 1, cast: (c, r) => { near(c.run).forEach(e => { c.hit('b', e, (2 + 0.6 * (r - 1)) * c.st.b.actMul, '#ffd0ea'); e.x += e.boss ? 15 : 40; }); c.run.fx.schallX = c.run.pos.b || 80; } },
    d_ranken: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => c.run.enemies.filter(e => e.x < 460).forEach(e => { c.hit('d', e, 1.5 * c.st.d.actMul, '#c8f08a'); e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1)); e.rooted = 2 + 0.5 * (r - 1); }) },
    d_bruell: { cd: () => 18, ready: engaged, cast: (c, r) => { c.run.roarT = (6 + (r - 1)) * (c.st.d.rinde ? 2 : 1); c.float('d', 'Bärengebrüll!', '#9bd14a'); c.run.shake = 0.2; } },
    d_adler: { cd: () => 12, ready: run => run.enemies.some(e => e.x < 480), cast: (c, r) => {
      const vis = c.run.enemies.filter(e => e.x < 480), rng = vis.filter(e => e.ranged), base = (rng.length ? rng : [...vis].sort((a, b) => b.x - a.x)).slice(0, 3), ts = [...base, ...[...vis].filter(e => !base.includes(e)).sort((a, b) => b.x - a.x)].slice(0, 3 + (c.st.d.eagle || 0));
      ts.forEach(e => c.hit('d', e, (3 + (r - 1)) * c.st.d.actMul, '#e8f5c8')); c.run.fx.adlerXs = ts.map(e => e.x); } },
    e_turm2: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.extraTurretT = 10 + 2 * (r - 1); c.float('e', 'Geschütz gebaut!', '#f28c28'); } },
    e_streu: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 400), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 400); for (let i = 0, n = c.st.e.splitter ? 10 : 6; i < n; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('e', e, 0.3 + i * 0.07, 'bomb'); c.hit('e', e, (1.5 + 0.5 * (r - 1)) * c.st.e.actMul, '#ffc58a'); c.burst(e.x, 196, '#ff9a3d', 6); } } },
    e_mine: { cd: () => 15, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => { near(c.run).forEach(e => { c.hit('e', e, (2.5 + 0.8 * (r - 1)) * c.st.e.actMul, '#ffc58a'); e.stun = Math.max(e.stun, 1); c.burst(e.x, 214, '#ffd23f', 10); }); c.run.shake = 0.25; } },
  };

  // Aktive Fähigkeiten der Ahnensiegel
  const aliveIn = run => run.order.filter(k => run.h[k].alive);
  Object.assign(ACT, {
    sg_r_schlag: { cd: () => 20, ready: run => engaged(run) && aliveIn(run).some(k => k !== 'r'), cast: (c, r) => {
      const k = aliveIn(c.run).filter(x => x !== 'r').sort((a, b) => c.st[b].atk - c.st[a].atk)[0]; if (!k) return;
      c.run.atkB[k] = { t: 8, v: 0.5 + 0.15 * (r - 1) }; c.float(k, 'Ritterschlag!', '#ffb547', 15); } },
    sg_r_banner: { cd: () => 35, ready: (run, st) => anyBelow(run, st, 0.35), cast: (c, r) => { c.run.honorT = 8 + (r - 1); c.float('r', 'Banner der Ehre!', '#ffd27a', 15); } },
    sg_r_duell: { cd: () => 18, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); t.duelT = 8; t.duelV = 1 + 0.25 * (r - 1); c.efloat(t, 'Duell!', '#ffb547', 15); } },
    sg_w_spott: { cd: () => 18, ready: run => engaged(run), cast: (c, r) => { c.run.tauntT = 5 + (r - 1); c.float('w', 'Spott!', '#7fb2ff', 15); } },
    sg_w_beben: { cd: () => 16, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => {
      c.run.enemies.filter(e => e.x < 520).forEach(e => { c.hit('w', e, (2.5 + 0.6 * (r - 1)) * c.st.w.actMul, '#cfe0ff'); e.quakeT = 4; }); c.run.shake = 0.35; } },
    sg_w_prall: { cd: () => 15, ready: run => run.enemies.some(e => (e.ranged || e.ahn) && e.x < 470), cast: (c, r) => { c.run.prallT = 6; c.run.prallV = (2 + 0.6 * (r - 1)) * c.st.w.actMul; c.float('w', 'Prallschild', '#7fb2ff'); } },
    sg_s_ziel: { cd: () => 16, ready: run => !!strongest(run, 420) && !(run.aimT > 0), cast: (c, r) => { c.run.aimT = 1.5; c.run.aimV = (12 + 4 * (r - 1)) * c.st.s.actMul; c.float('s', 'Zielt …', '#c8f5cf'); } },
    sg_s_sperr: { cd: () => 18, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { c.run.apsB.s = { t: 4 + (r - 1), v: 2 }; c.float('s', 'Sperrfeuer!', '#7ee08a'); } },
    sg_s_sprung: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => {
      c.run.enemies.slice(0, 2).forEach(e => c.hit('s', e, (2 + 0.6 * (r - 1)) * c.st.s.actMul, '#c8f5cf')); const h = c.run.h.s; if (h) h.invT = 2; c.float('s', 'Rückzug!', '#7ee08a'); } },
    sg_m_loch: { cd: () => 18, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => {
      c.run.holeT = 3; c.run.holeTick = 0; c.run.holeV = (1.5 + 0.5 * (r - 1)) * c.st.m.actMul; c.run.holeX = Math.min(430, (c.run.enemies[0] ? c.run.enemies[0].x : 300) + 50); } },
    sg_m_strahl: { cd: () => 16, ready: run => !!strongest(run, 420), cast: (c, r) => { c.run.beam = { t: 3, tick: 0, i: 0, v: (1 + 0.25 * (r - 1)) * c.st.m.actMul }; } },
    sg_m_mana: { cd: () => 16, ready: run => !!strongest(run, 420), cast: (c, r) => { const t = strongest(c.run, 420); t.manaT = 4 + (r - 1); c.efloat(t, 'Manabrand', '#c08cff', 14); } },
    sg_p_boden: { cd: () => 22, ready: (run, st) => anyBelow(run, st, 0.8), cast: (c, r) => { c.run.groundT = 8; c.run.groundV = 0.03 + 0.01 * (r - 1); c.float('p', 'Heiliger Boden', '#ffe48a'); } },
    sg_p_eile: { cd: () => 18, ready: run => engaged(run) || run.enemies.some(e => e.x < 380), cast: (c, r) => {
      aliveIn(c.run).sort((a, b) => c.st[b].atk - c.st[a].atk).slice(0, 2).forEach(k => { c.run.apsB[k] = { t: 6, v: 0.5 + 0.1 * (r - 1) }; c.float(k, 'Eile!', '#ffe48a', 13); }); } },
    sg_p_gebet: { cd: () => 20, ready: (run, st, S) => S.equip.some(id => NODE[id].tree !== 'priester' && run.cds[id] > 3), cast: (c, r) => {
      for (const id of c.S.equip) if (NODE[id].tree !== 'priester' && c.run.cds[id] > 0) c.run.cds[id] = Math.max(0, c.run.cds[id] - (4 + (r - 1))); c.float('p', 'Gebet der Eile', '#ffe48a'); } },
    sg_t_eber: { cd: () => 14, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => {
      c.run.enemies.filter(e => e.x < 520).forEach(e => { c.hit('t', e, (2.5 + 0.8 * (r - 1)) * c.st.t.actMul, '#ffd2a8'); e.stun = Math.max(e.stun, e.boss ? 0.5 : 1); }); c.run.fx.eberX = 0; c.run.shake = 0.2; } },
    sg_t_geheul: { cd: () => 18, ready: run => engaged(run), cast: (c, r) => { c.run.howlT = 6 + (r - 1); c.float('t', 'Wolfsgeheul!', '#d9935a'); } },
    sg_t_instinkt: { cd: () => 20, ready: (run, st) => run.h.t && run.h.t.hp < st.t.hp * 0.5, cast: (c, r) => c.healOne('t', c.st.t.hp * (0.35 + 0.1 * (r - 1))) },
    sg_a_kehle: { cd: () => 10, ready: run => run.enemies.some(e => e.x < 480 && (e.boss || e.hp < e.max * 0.25)), cast: (c, r) => {
      const vis = c.run.enemies.filter(e => e.x < 480), low = vis.filter(e => !e.boss && e.hp < e.max * 0.25).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (low) { low.hp = 0; low.lastBy = 'a'; c.efloat(low, 'Kehlschnitt!', '#ff6b7a', 15); c.burst(low.x, 190, '#ff6b7a', 10); }
      else { const b = vis.find(e => e.boss); if (b) c.hit('a', b, (5 + 1.5 * (r - 1)) * c.st.a.actMul, '#ff6b7a'); } } },
    sg_a_klon: { cd: () => 20, ready: run => run.enemies.some(e => e.x < 420), cast: (c, r) => { c.run.cloneT = 8; c.run.cloneV = 0.5 + 0.15 * (r - 1); c.run.cloneAtk = 0.2; c.float('a', 'Schattenklon', '#ff6b7a'); } },
    sg_a_mal: { cd: () => 16, ready: run => run.enemies.filter(e => e.x < 480).length >= 2, cast: (c, r) => {
      c.run.enemies.filter(e => e.x < 480).slice(0, 3).forEach(e => { e.smarkT = 8; c.efloat(e, '✕', '#ff6b7a', 16); }); c.run.smarkV = (4 + 1.2 * (r - 1)) * c.st.a.actMul; } },
    sg_n_wand: { cd: () => 22, ready: run => engaged(run), cast: (c, r) => { c.run.wallT = 4 + (r - 1); c.float('n', 'Knochenwand!', '#6be0b8', 15); } },
    sg_n_riese: { cd: () => 25, ready: run => engaged(run) && !run.giant, cast: (c, r) => { const hp = c.st.n.hp * (3 + (r - 1)); c.run.giant = { t: 12, hp, max: hp }; c.float('n', 'Knochenriese!', '#6be0b8', 15); } },
    sg_n_fessel: { cd: () => 16, ready: run => run.enemies.filter(e => e.x < 480).length >= 2, cast: (c, r) => {
      [...c.run.enemies].filter(e => e.x < 480).sort((a, b) => b.hp - a.hp).slice(0, 3).forEach(e => { e.linkT = 6 + (r - 1); c.efloat(e, '∞', '#6be0b8', 16); }); } },
    sg_b_diss: { cd: () => 16, ready: run => engaged(run), cast: (c, r) => { c.run.enemies.forEach(e => (e.dissT = 5 + (r - 1))); c.float('b', 'Dissonanz!', '#ff8ac8'); } },
    sg_b_echo: { cd: r => 20 - 2 * (r - 1), ready: (run, st, S) => { const id = run.lastAct; return !!(id && ACT[id] && rank(S, id) && ACT[id].ready(run, st, S)); }, cast: (c, r) => {
      const id = c.run.lastAct; if (!id) return; try { ACT[id].cast(c, rank(c.S, id)); c.run.fx[id] = 0.5; } catch (err) {} c.float('b', `Echo: ${NODE[id].name}`, '#ff8ac8', 13); } },
    sg_b_ahnen: { cd: () => 20, ready: run => engaged(run) || run.enemies.some(e => e.x < 380), cast: (c, r) => { c.run.critBT = 8; c.run.critBV = 0.25 + 0.05 * (r - 1); c.float('b', 'Ballade der Ahnen', '#ffd27a'); } },
    sg_d_gestalt: { cd: () => 22, ready: run => engaged(run), cast: (c, r) => { c.run.bearT = 8 + (r - 1); c.float('d', 'Wildgestalt!', '#9bd14a', 15); } },
    sg_d_wachs: { cd: () => 24, ready: run => engaged(run), cast: (c, r) => {
      const f = 0.2 + 0.05 * (r - 1); c.run.growT = 10;
      aliveIn(c.run).forEach(k => { const h = c.run.h[k], add = c.st[k].hp * f; h.shield = (h.shield || 0) + add; h.growS = (h.growS || 0) + add; }); c.float('d', 'Wachstum', '#9bd14a'); } },
    sg_d_gewalt: { cd: () => 20, ready: run => engaged(run), cast: (c, r) => { c.run.natureT = 5 + (r - 1); c.float('d', 'Naturgewalt', '#9bd14a'); } },
    sg_e_flamme: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => { c.run.flameT = 3; c.run.flameTick = 0; c.run.flameV = (2 + 0.5 * (r - 1)) * c.st.e.actMul; } },
    sg_e_rakete: { cd: () => 15, ready: run => !!strongest(run, 420), cast: (c, r) => {
      const t = strongest(c.run, 420); for (let i = 0; i < 3; i++) { c.arrow('e', t, 0.3 + i * 0.12, 'bomb'); c.hit('e', t, (4 + 1.2 * (r - 1)) * c.st.e.actMul, '#ffc58a'); } c.burst(t.x, 180, '#ff9a3d', 14); c.run.shake = 0.2; } },
    sg_e_druck: { cd: () => 18, ready: run => engaged(run) || run.enemies.some(e => e.x < 420), cast: (c, r) => { c.run.overT = 6 + (r - 1); c.float('e', 'Überdruck!', '#f28c28'); } },
  });
  // Wird jeden Schritt aufgerufen: laufende Siegel-Effekte
  function sigStep(S, st, run, c, dt) {
    for (const k in run.atkB) if (run.atkB[k]) { run.atkB[k].t -= dt; if (run.atkB[k].t <= 0) run.atkB[k] = null; }
    for (const k in run.apsB) if (run.apsB[k]) { run.apsB[k].t -= dt; if (run.apsB[k].t <= 0) run.apsB[k] = null; }
    for (const key of ['honorT', 'huntT', 'tauntT', 'prallT', 'howlT', 'cloneT', 'wallT', 'critBT', 'bearT', 'natureT', 'overT', 'tinkT', 'wrathT', 'bloomT', 'groundT', 'growT', 'falkT']) if (run[key] > 0) run[key] -= dt;
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
    if (cost == null || (S.rebirths < 1 && !S.asc) || S.souls < cost) return false;
    S.souls -= cost; S.tempo = lv + 1; S.speed = maxSpeed(S);
    return true;
  }
  // Startgebiet: ein Gebiet ist wählbar, sobald der Boss des Gebiets davor in diesem Durchgang besiegt wurde
  const areaMax = S => Math.max(0, Math.min(Math.floor((S.best || 0) / 10), Math.floor((Math.min(capOf(S), 1e6) - 1) / 10)));
  // Gegner werden pro Stufe stärker – anfangs schneller, später langsamer
  function grow(stage, a, b, c) { const s = stage - 1, s1 = Math.min(s, 30), s2 = Math.min(Math.max(s - 30, 0), 50), s3 = Math.max(s - 80, 0); return Math.exp(s1 * Math.log(a) + s2 * Math.log(b) + s3 * Math.log(c)); }
  const TUNE = { hp: [1.135, 1.115, 1.085], dmg: [1.12, 1.1, 1.075], gold: [1.14, 1.105, 1.08], hard: [1.55, 0.42, 1.18, 0.1, 1.3, 0.5, 0.05] };
  const RANGED = { hp: 0.65, dmg: 0.5, rate: 2.4 };
  const rangedCount = stage => { const z = zoneOf(stage); return z === 0 ? 0 : z < 3 ? 1 : 2; };
  // Ab der 1. Wiedergeburt werden Gegner stärker (je Wiedergeburt etwas mehr); Expeditionen bleiben gleich
  function hardMul(S, exp) {
    const rb = Math.min(6, Math.max(1, S.rebirths || 0)), H = TUNE.hard;
    if (exp || ((S.rebirths || 0) < 1 && !(S.asc > 0))) return null;
    const q = Math.max(0, rb - 3) ** 2;
    return [H[0] + H[1] * (rb - 1) + (H[5] || 0) * q, H[2] + H[3] * (rb - 1) + (H[6] || 0) * q, H[4]];
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
    const run = { mode: tower ? 'tower' : weekly ? 'weekly' : exp ? 'exp' : mode === 'ahnen' ? 'ahnen' : 'normal', stage: tower || weekly ? 1 : st.startStage, startStage: tower || weekly ? 1 : st.startStage, rules, losses: 0,
      mission: exp ? (MISSION[S.exp.mission] ? S.exp.mission : 'streif') : null, waves: 0, bossKills: 0, minions: [], turretT: 1, extraTurretT: 0, songT: 0, songMul: 0, roarT: 0,
      hard: hardMul(S, exp), diff: ascDiff(S), speed: rules.includes('speed') ? 1.5 : 1, hpMul: rules.includes('giant') ? 2 : 1, eliteChance: rules.includes('elite') ? 0.4 : 0.12, noheal: rules.includes('noheal'),
      dragonT: 2, compRevive: false, bannerT: 0, kills: 0, gold: 0, souls: 0, runes: [], phoenixUsed: false, miracleUsed: false,
      fx: {}, cds: {}, atkB: {}, apsB: {}, buffT: 0, buffMul: 0, hautT: 0, racheT: 0, packT: 0, order, pos, frontX: pos[order[0]], h,
      enemies: [], floats: [], arrows: [], eshots: [], parts: [], scroll: 0, dead: false, victory: false, deadT: 0, time: 0, shake: 0 };
    // Abkürzung: übersprungene Bosse geben einen Teil ihrer Seelen
    if (run.mode === 'normal' && run.stage > 10) {
      let skip = 0; for (let b = 10; b < run.stage; b += 10) skip += Math.round((1 + Math.floor(b / 20)) * st.g.soulMul) + st.soulBonus;
      const beute = perk(S, 'p_start');
      run.skipSouls = Math.floor(skip * (SKIP_SOULS + 0.1 * beute));
      if (run.skipSouls) { S.souls += run.skipSouls; S.tot.souls += run.skipSouls; run.souls += run.skipSouls; run.floats.push({ x: 150, y: 100, text: `Abkürzung: +${run.skipSouls} Seelen`, color: '#c9a6ff', size: 14, t: 2.2 }); }
      // Beutezug (Sternen-Laden): Teil des Golds der übersprungenen Stufen
      if (beute) {
        let g = 0; for (let s2 = 1; s2 < run.stage; s2++) g += grow(s2, ...TUNE.gold) * (s2 % 10 === 0 ? 13 : 5) * 1.36;
        g = Math.floor(g * st.g.gold * 0.1 * beute);
        if (g > 0) { S.gold = Math.min(1e18, S.gold + g); run.gold += g; run.floats.push({ x: 150, y: 122, text: `Beutezug: +${fmt(g)} Gold`, color: '#ffd23f', size: 14, t: 2.4 }); }
      }
    }
    if (run.mode === 'ahnen') ahnInit(S, run);
    spawnWave(run);
    return run;
  }
  let SKIP_SOULS = Number((typeof process !== 'undefined' && process.env && process.env.SKIP) || 0.35);
  const towerStage = floor => 15 + floor * 2;
  function spawnWave(run) {
    run.brother = false; for (const k of run.order || []) if (run.h[k]) run.h[k].protUsed = false;
    if (run.mode === 'ahnen') return ahnSpawn(run);
    run.enemies = [];
    if (run.mode === 'tower') {
      const s = towerStage(run.stage), boss = run.stage % 5 === 0;
      for (let i = 0; i < 3; i++) run.enemies.push(makeEnemy(s, i, false, true, run, i === 2));
      if (boss) { run.enemies.push(makeEnemy(s, 3.6, true, false, run)); run.bannerT = 2.2; }
      return;
    }
    const boss = run.mode === 'exp' ? !!(MISSION[run.mission].bosses && (run.waves + 1) % 3 === 0) : run.stage % (run.rules && run.rules.includes('boss') ? 5 : 10) === 0, n = boss ? 3 : 5;
    const nr = Math.min(boss ? 1 : 2, rangedCount(run.stage));
    for (let i = 0; i < n; i++) run.enemies.push(makeEnemy(run.stage, i, false, false, run, i >= n - nr));
    if (boss) { run.enemies.push(makeEnemy(run.stage, n + 0.6, true, false, run)); run.bannerT = 2.2; }
  }
  function ctxFor(S, st, run) {
    const c = { S, st, run };
    c.float = (k, text, color, size = 14) => run.floats.push({ x: run.pos[k] || 120, y: 110, text, color, size, t: 1 });
    c.efloat = (e, text, color, size = 13) => run.floats.push({ x: e.x + (e.reach ? 52 : 0) + (Math.random() * 16 - 8), y: e.reach ? 168 + Math.random() * 14 : 150 - (e.boss ? 40 : 0), text, color, size, t: 1 });
    c.burst = (x, y, color, n = 8) => { for (let i = 0; i < n; i++) run.parts.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140 - 20, t: 0.6, c: color }); };
    c.arrow = (k, e, d, kind) => run.arrows.push({ x: (run.pos[k] || 60) + 8, y: 168, tx: e.x, ty: 188 - (e.boss ? 30 : 0), t: 0, d, kind: kind || k });
    c.hit = (k, e, mult, color, wolf, opt) => {
      const T = st[k]; if (!T || !e) return 0;
      if (run.blindT > 0 && Math.random() < 0.33) { c.efloat(e, 'Verfehlt', '#9aa3ad', 11); return 0; }
      let dmg = (wolf ? T.wolfAtk : T.atk) * mult * (run.buffT > 0 ? 1 + run.buffMul : 1) * (1 + (e.markT > 0 ? e.mark : 0)) * sigMul(run, st, k, e, wolf);
      if ((e.boss || e.elite) && T.bossDmg) dmg *= 1 + T.bossDmg;
      const hh = run.h[k], tur = !!(opt && opt.turret && T.precise), forced = !!(k === 'a' && hh && hh.nextCrit);
      if (forced) hh.nextCrit = false;
      const crit = forced || Math.random() < (wolf ? T.crit + T.wolfCrit : T.crit) * (tur ? 2 : 1) + (run.critBT > 0 ? run.critBV : 0);
      if (crit) dmg *= T.critD + (tur ? 0.5 : 0) + (e.boss && T.coldBlood ? T.coldBlood : 0);
      e.hp -= dmg; e.hitT = 0.15; e.lastBy = k;
      if (wolf && T.bleed) { e.bleed = dmg * T.bleed / 3; e.bleedT = 3; }
      if (k === 'd' && run.natureT > 0 && hh && hh.alive && !run.noheal) hh.hp = Math.min(T.hp, hh.hp + dmg);
      if (k === 'a' && T.flow) run.flowN = Math.min(20, (run.flowN || 0) + 1);
      if (e.linkT > 0) for (const o of run.enemies) if (o !== e && o.linkT > 0 && o.hp > 0) { o.hp -= dmg * 0.5; o.hitT = 0.15; o.lastBy = k; }
      if (T.burn && !wolf) { e.burn = dmg * T.burn / 2; e.burnT = 2; }
      if (T.vuln && k === 's') { e.mark = Math.max(e.mark || 0, T.vuln); e.markT = 4; }
      if (T.lifesteal) { const h = run.h[k]; if (h && h.alive) h.hp = Math.min(T.hp, h.hp + dmg * T.lifesteal); }
      if (wolf && T.wolfHeal) c.healAllAbs(dmg * T.wolfHeal);
      c.efloat(e, fmt(dmg), crit ? '#ffd23f' : color || '#ffffff', crit ? 18 : 13);
      if (crit) c.burst(e.x, 190, '#ffd23f', 5);
      sfx(crit ? 'crit' : 'hit');
      return dmg;
    };
    c.healOne = (k, amt, src) => {
      const h = run.h[k], T = st[k]; if (!h || !h.alive || run.noheal) return;
      if (run.curseT > 0) amt *= 0.4;
      if (k === 'd' && T.bloom) run.bloomT = 4;
      if (src === 'p' && st.p && st.p.holyFire && st.p.atk > 0 && run.enemies[0]) c.hit('p', run.enemies[0], amt * st.p.holyFire / st.p.atk, '#fff2b0');
      const over = h.hp + amt - T.hp; h.hp = Math.min(T.hp, h.hp + amt);
      if (over > 0 && st.p && st.p.overShield) h.shield = Math.min(T.hp * 0.5, h.shield + over * st.p.overShield);
      c.float(k, '+' + fmt(amt), '#7ee08a', 12);
    };
    c.healAll = (f, src) => { run.order.forEach(k => run.h[k].alive && c.healOne(k, st[k].hp * f, src)); run.fx.heal = 0.5; };
    c.healSplit = (me, fMe, fOther) => { run.order.forEach(k => run.h[k].alive && c.healOne(k, st[k].hp * (k === me ? fMe : fOther))); run.fx.heal = 0.5; };
    c.healAllAbs = a => !run.noheal && (a *= run.curseT > 0 ? 0.4 : 1) && run.order.forEach(k => { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + a); });
    return c;
  }
  function frontHero(run) { return run.order.find(k => run.h[k].alive); }
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
    if (k === 'w' && run.hautT > 0) d *= 0.4;
    if (k === 'w' && run.tauntT > 0) d *= 0.7;
    if (k === 'd' && run.bearT > 0) d *= 0.5;
    if (k === 'e' && T.plating) d *= 1 - T.plating;
    if (k === 'n' && T.boneArmor) d *= 1 - Math.min(0.4, T.boneArmor * run.minions.length);
    if (h.shield > 0) { const a = Math.min(h.shield, d); h.shield -= a; d -= a; if (h.growS) h.growS = Math.min(h.growS, h.shield); }
    h.hp -= d; h.hurtT = 0.2; sfx('hurt');
    if (d > 0) { if (k === 'a') run.flowN = 0; if (k === 'b') { run.crescN = 0; run.crescT = 0; } }
    if (attacker) { let refl = T.thorns; if (k === 'w' && run.racheT > 0) refl += 0.6; if (refl) attacker.hp -= raw * refl * (boss ? 0.4 : 1); }
    if (h.hp > 0 && k !== 'w' && st.w && st.w.protector && run.h.w && run.h.w.alive && h.hp < T.hp * 0.25 && !h.protUsed) { h.protUsed = true; h.protT = 3; c.float(k, 'Beschützt!', '#7fb2ff', 13); }
    if (h.hp <= 0 && run.honorT > 0) { h.hp = 1; c.float(k, 'Ehre!', '#ffd27a', 12); }
    if (h.hp <= 0) {
      if (st.p && st.p.miracle && !run.miracleUsed && run.h.p && run.h.p.alive) { run.miracleUsed = true; run.order.forEach(x => run.h[x].alive && (run.h[x].hp = st[x].hp)); h.hp = T.hp * 0.5; c.float(k, 'Wunder!', '#ffe48a', 18); run.fx.heal = 0.5; }
      else if (T.revive && !h.revived) { h.revived = true; h.hp = T.hp * (k === 'w' ? 1 : 0.5); c.float(k, k === 'w' ? 'Letzte Bastion!' : 'Zweites Leben!', '#ffb547', 16); sigRevive(c, k); }
      else { h.hp = 0; h.alive = false; h.shield = 0; h.deadAt = run.time; h.deadScroll = run.scroll; run.losses++; sfx('fall'); c.float(k, `${HERO_BY_ID[k].name} gefallen`, '#ff8a8a', 13); if (k !== 'r' && st.r && st.r.brother && run.h.r && run.h.r.alive && !run.brother) { run.brother = true; c.float('r', 'Schwertbruder!', '#ffb547', 15); } }
    }
  }
  function step(S, st, run, dt) {
    if (run.dead) { run.deadT += dt; return; }
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
      if (!ACT[id].ready(run, st, S)) continue;
      ACT[id].cast(c, rank(S, id));
      run.cds[id] = ACT[id].cd(rank(S, id), S) * (1 - st[hk].cdr); run.fx[id] = 0.5; sfx('skill');
      if (hk !== 'b') run.lastAct = id;
      if (hk === 'e' && st.e.tinker) run.tinkT = 4;
    }
    sigStep(S, st, run, c, dt);
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
          const n = T.shots + (Math.random() < T.extraShot ? 1 : 0);
          for (let i = 0; i < n; i++) { c.arrow('s', tgt, 0.25 + i * 0.08); c.hit('s', tgt, 1, '#c8f5cf'); if (T.pierce && run.enemies[1]) c.hit('s', run.enemies[1], T.pierce, '#c8f5cf'); }
        } else if (k === 'a') {
          const n = T.shots + (Math.random() < T.extraShot ? 1 : 0);
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
          c.hit(k, tgt, 1 + (T.koloss ? T.koloss * T.hp / Math.max(1e-9, T.atk) : 0), k === 'w' ? '#cfe0ff' : null);
          if (T.dbl && Math.random() < T.dbl && tgt.hp > 0) c.hit(k, tgt, 1);
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
      const k = run.tauntT > 0 && run.h.w && run.h.w.alive ? 'w' : alive[Math.floor(Math.random() * alive.length)];
      run.eshots.push({ x: e.x - 12, y: 188, tx: run.pos[k], ty: 180, t: 0, d: 0.55, k, dmg: e.dmg * RANGED.dmg, kind: e.type, src: e });
    }
    for (const s of run.eshots) { s.t += dt; if (s.t >= s.d && !s.done) { s.done = true;
      if (run.prallT > 0 && s.dmg > 0 && run.h.w && run.h.w.alive) { const tg = s.src && s.src.hp > 0 ? s.src : run.enemies.find(x => x.boss) || run.enemies[0]; if (tg) c.hit('w', tg, run.prallV, '#cfe0ff'); c.float('w', 'Abgeprallt', '#9fd0ff', 11); }
      else hurtHero(c, run.tauntT > 0 && run.h.w && run.h.w.alive ? 'w' : s.k, s.dmg, null); } }
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
    if (f && f.boss && eng && !f.ahn) { f.age = (f.age || 0) + dt; const en = f.age > 25 ? 1 + 0.2 * Math.floor((f.age - 25) / 5 + 1) : 1; if (en > (f.enrage || 1)) { f.enrage = en; c.efloat(f, en < 1.25 ? 'Wut!' : `Wut ×${en.toFixed(1).replace('.', ',')}`, '#ff5a5a', 15); } }
    // Gegner greifen an
    if (f && eng && f.stun <= 0 && !f.ranged) {
      f.atkT -= dt * (f.atkMul || 1) * (f.dissT > 0 ? 0.5 : 1);
      if (f.atkT <= 0 && f.hp > 0) {
        f.atkT += f.rate;
        f.atkAt = run.time;
        if (run.wallT > 0) c.efloat(f, 'Knochenwand', '#6be0b8', 11);
        else if (run.giant) { run.giant.hp -= f.dmg * (f.enrage || 1); c.efloat(f, 'Knochenriese', '#6be0b8', 11); }
        else {
          const tk = run.tauntT > 0 && run.h.w && run.h.w.alive ? 'w' : fk;
          hurtHero(c, tk, f.dmg, f);
          if (f.boss && !(run.tauntT > 0)) { run.shake = 0.15; for (const k of run.order) if (k !== tk) hurtHero(c, k, f.dmg * 0.35, null); }
        }
      }
    }
    if (run.mode === 'ahnen') ahnStep(S, st, run, c, dt);
    // Besiegte Gegner
    const g = st.g;
    for (const e of run.enemies) {
      if (e.hp > 0) continue;
      run.kills++; S.tot.kills++;
      if (e.boss) run.bossKills++;
      sigKill(S, st, run, c, e);
      sfx(e.boss ? 'boss' : 'kill');
      if (st.n && run.h.n && run.h.n.alive && run.minions.length < st.n.minionMax && Math.random() < st.n.raise) { run.minions.push({ t: st.n.minionDur * (st.n.minionLong ? 2 : 1), atkT: 0.6, swing: 0 }); c.efloat(e, 'Erhebe dich!', '#6be0b8', 12); }
      c.burst(e.x, 200, e.boss ? '#c9a6ff' : '#ffffff', e.boss ? 24 : 8);
      if (run.mode === 'normal') {
        let gold = e.gold * g.gold * (e.boss || e.elite ? g.eliteGold : 1);
        if (Math.random() < g.chest) { gold *= 10; c.efloat(e, 'Truhe!', '#ffd23f', 16); }
        gold = Math.max(1, Math.round(gold));
        S.gold = Math.min(1e18, S.gold + gold); run.gold += gold; sfx('coin');
        run.floats.push({ x: e.x, y: 130, text: '+' + fmt(gold), color: '#ffcf4a', size: 14, t: 1 });
      }
      let souls = 0;
      if (e.boss) souls = roundSouls((1 + Math.floor(run.stage / 20)) * g.soulMul) + st.soulBonus;
      else if (e.elite && Math.random() < g.eliteSoul) souls = Math.max(1, roundSouls(altarMul(S)));
      if (run.mode === 'tower') souls = e.boss ? 1 : 0;
      if (run.mode === 'weekly' || run.mode === 'exp' || run.mode === 'ahnen') souls = 0;
      if (souls) { sfx('soul'); S.tot.souls += souls; S.souls += souls; run.souls += souls; run.floats.push({ x: e.x, y: 95, text: `+${souls} Seele${souls > 1 ? 'n' : ''}`, color: '#c9a6ff', size: 16, t: 1 }); }
      if (feature(S, 'runen') && run.mode === 'normal' && (e.boss || (e.elite && Math.random() < 0.03))) {
        const tier = e.boss ? bossRuneTier(run.stage) : Math.min(10, 1 + Math.floor(run.stage / 40));
        const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, tier);
        if (r) { sfx('rune'); run.runes.push(r); run.floats.push({ x: e.x, y: 75, text: `Rune: ${RUNE[r.t].name} ${ROMAN[r.tier]}`, color: RUNE[r.t].color, size: 14, t: 1.4 }); }
      }
    }
    run.enemies = run.enemies.filter(e => e.hp > 0);
    if (!run.enemies.length) {
      if (run.mode === 'tower') {
        if (run.stage > S.towerBest) {
          S.towerBest = run.stage;
          if (run.stage % 5 === 0) { const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, 1 + Math.floor(run.stage / 15)); if (r) run.runes.push(r); }
        }
      } else if (run.mode === 'ahnen') { return ahnNext(S, st, run, c);
      } else if (run.mode === 'exp') {
        run.waves++;
        const m = MISSION[run.mission];
        if ((m.waves && run.waves >= m.waves) || (m.bosses && run.bossKills >= m.bosses)) { run.victory = true; run.dead = true; return 'dead'; }
        for (const k of run.order) { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * 0.15); }
        spawnWave(run); return;
      } else if (run.mode === 'normal') {
        if (run.stage > S.best) S.best = run.stage;
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
      HEROES.length, ...HEROES.flatMap(h => (S.sockets[h.id] || [null, null, null]).map(rIdx)),
      S.asc, S.crowns, CPERKS.length, ...CPERKS.map(p => cperk(S, p.id)), ACH.length, ...ACH.map(a => (S.ach[a.id] ? 1 : 0)),
      S.tot.kills, S.tot.souls, COMPS.length, ...COMPS.map(c => S.comps[c.id] || 0), ...[0, 1].map(i => (S.compActive[i] ? COMPS.findIndex(c => c.id === S.compActive[i]) + 1 : 0)), S.tempo || 0,
      S.exp.spl, S.exp.done, Math.max(0, PUZZLE.indexOf(S.exp.target)), PUZZLE.length, ...PUZZLE.map(id => pieceMask(S, id)),
      1, kSlots(S), HEROES.length, ...HEROES.map(h => (S.kplace || {})[h.id] || 0), S.altar || 0, 1, 1, 1, S.rlager || 0, 1,
      1, S.ahn.sig, S.ahn.got, S.ahn.m, S.ahn.lvl, HEROES.length, ...HEROES.map(h => (S.ahn.place[h.id] ? 1 : 0))]);
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
        }
      } else return null;
      return migrate(d);
    } catch { return null; }
  }

  function fmt(n) {
    if (n < 1000) return String(Math.floor(n));
    const units = ['', ' Tsd.', ' Mio.', ' Mrd.', ' Bio.', ' Brd.', ' Trio.', ' Trd.'];
    let i = 0; while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString()).replace('.', ',') + units[i];
  }

  const core = { AHN_MISSIONS, AHN_ABIL, AHN_TRAIT, AHNE, AHN_TUNE, AHN_COUNT, ahnOpen, ahnBossesOf, ahnLevelFor, placeSigil, ahnClaim, unrebirth, transmute, bossRuneTier, resetPerks, buyLager, lagerCost, LAGER_MAX, runeCap, shardOf, mergeCost, ALTAR_MAX, altarCost, altarMul, buyAltar, kSlots, kFree, keyCap, addSock, removeSock, removeKey, PUZZLE, MISSIONS, MISSION, PIECE_COST, claimExp, buyPiece, assembled, pieceCount, pieceMask, expOpen, expStage, fieldOf, fieldSlots, toggleField, bossOf, BOSS_NAMES, TEMPO_COST, maxSpeed, buyTempo, areaMax, zoneName, BIOMES, HEROES, HERO, NODES, NODE, PERKS, RUNES, RUNE, TUNE, fresh, migrate, stats, newRun, step, buy, canBuy, available, blockReason, nodeCost, rank, perk, buyPerk, perkCost,
    sigOn, sigKeysUsed, keyNeed, eqOf, slotLim, SIG, SIG_FLAGS, newRun, step, stats, buy, available, blockReason, NODE, migrate, fresh,
    rebirth, ascend, crownsFor, buyCperk, cperkCost, cperk, CPERKS, levelComp, toggleComp, compCost, compMax, compSlots, COMPS, checkAch, ACH, claimWeekly, weekId, weekRules, RULE, WEEK_TIERS, statsFor, starsFor, toggleEquip, slotsOf, hired, classOpen, keysUsed, keyLimit, capOf, reqOf, feature, encode, decode, fmt, socket, unsocket, merge, canMerge, dismantle, buyRune, runeVal, addRune };
  if (typeof module !== 'undefined') { module.exports = core; return; }

  /* ================= Oberfläche ================= */
  const $ = s => document.querySelector(s);
  const KEY = 'fsg.ritter';
  const ACT_NAME = id => NODE[id].name;
  const PORTRAIT = { r: '⚔', w: '⛨', s: '➶', m: '✦', p: '☀', t: '✥', a: '☾', n: '☠', b: '♪', d: '❀', e: '⚙' };
  let S = load(), st = stats(S), run = null, tab = 'ritter', raf = 0, last = 0, active = false, cv, ctx, scale = 1, cine = null, areaBefore = 0;
  const sel = Object.fromEntries(HEROES.map(h => [h.tree, h.hire || 'start']));
  let confirm = '', hudT = 0, runeSel = null;
  let notice = S.reset ? 'Neue Version: Dein alter Spielstand stammte aus der allerersten Version und wurde zurückgesetzt. Ab jetzt bleibt dein Fortschritt bei Updates erhalten.' : '';
  if (S.reset) delete S.reset;
  function load() { try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} cloudDirty = true; }
  const inCamp = () => !run || run.dead;

  /* ---------- Soundeffekte (werden live erzeugt, leise und weich) ---------- */
  let wSel = [], wRes = null, fSlots = [], fRes = null;
  let shopSel = 'stern', runeView = 'ausr', forgeSort = 'art', forgeFilt = 'all', forgeSel = null; try { shopSel = localStorage.getItem('fsg.ritter.shop') || 'stern'; } catch {}
  let lowFx = false, fxAvg = 1 / 60, fxClock = 0;
  const SND = (() => {
    let ac = null, master = null, nbuf = null;
    let on = true; try { on = localStorage.getItem('fsg.ritter.snd') !== '0'; } catch {}
    const last = {};
    function init() {
      if (ac) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.32;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; master.connect(comp); comp.connect(ac.destination);
      nbuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    function unlock() { try { init(); if (ac && ac.state === 'suspended') ac.resume(); } catch {} }
    function tone(f, dur, type = 'sine', vol = 0.1, when = 0, glide = 0) {
      const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * glide), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, vol, freq, when = 0, q = 1, to = 0) {
      const t = ac.currentTime + when, src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = nbuf; bp.type = 'bandpass'; bp.frequency.setValueAtTime(freq, t); if (to) bp.frequency.exponentialRampToValueAtTime(to, t + dur); bp.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.05);
    }
    const r = (a, b) => a + Math.random() * (b - a);
    const notes = (fs, step, dur, type, vol) => fs.forEach((f, i) => tone(f, dur, type, vol, i * step));
    const P = {
      hit: () => { noise(0.06, 0.07, r(700, 1000), 0, 1.2); tone(r(150, 180), 0.07, 'sine', 0.06, 0, 0.6); },
      crit: () => { noise(0.05, 0.08, 2600, 0, 2); tone(1318, 0.1, 'triangle', 0.06); tone(1976, 0.14, 'sine', 0.045, 0.025); },
      kill: () => tone(r(480, 560), 0.09, 'sine', 0.09, 0, 1.8),
      coin: () => { const b = r(1480, 1620); tone(b, 0.06, 'triangle', 0.045); tone(b * 1.335, 0.14, 'triangle', 0.04, 0.045); },
      soul: () => { tone(880, 0.45, 'sine', 0.05); tone(1320, 0.5, 'sine', 0.04, 0.07); tone(1760, 0.6, 'sine', 0.03, 0.14); noise(0.5, 0.02, 3000, 0, 3, 6000); },
      rune: () => notes([1047, 1319, 1568, 2093], 0.05, 0.3, 'triangle', 0.045),
      boss: () => { notes([523, 659, 784, 1047], 0.07, 0.7, 'triangle', 0.07); noise(0.4, 0.05, 400, 0, 0.8, 120); },
      stage: () => { tone(660, 0.12, 'triangle', 0.045); tone(990, 0.18, 'triangle', 0.045, 0.07); },
      skill: () => { noise(0.28, 0.06, 500, 0, 1.2, 2400); tone(320, 0.25, 'sine', 0.04, 0, 2); },
      hurt: () => tone(r(120, 140), 0.09, 'sine', 0.05, 0, 0.7),
      fall: () => { tone(330, 0.55, 'triangle', 0.06, 0, 0.5); noise(0.3, 0.04, 300, 0.05, 1, 120); },
      buy: () => { tone(784, 0.07, 'triangle', 0.06); tone(1175, 0.12, 'triangle', 0.05, 0.05); },
      forge: () => { noise(0.07, 0.12, 3200, 0, 6); tone(1760, 0.6, 'sine', 0.05); tone(2637, 0.45, 'sine', 0.03, 0.01); notes([1047, 1568, 2093], 0.08, 0.35, 'triangle', 0.035); },
      rebirth: () => { notes([392, 523, 659, 784, 1047, 1319], 0.09, 0.8, 'triangle', 0.06); noise(1.2, 0.03, 2000, 0, 2, 7000); },
      victory: () => notes([523, 659, 784, 1047, 784, 1047], 0.1, 0.45, 'triangle', 0.06),
      defeat: () => notes([392, 330, 262], 0.16, 0.5, 'sine', 0.05),
      tick: () => tone(1200, 0.03, 'sine', 0.025),
    };
    const GAP = { hit: 0.11, crit: 0.12, kill: 0.08, coin: 0.12, hurt: 0.22, soul: 0.2, stage: 0.25, skill: 0.12, rune: 0.2, fall: 0.2 };
    function play(n) {
      if (!on || !ac || ac.state !== 'running' || document.hidden || !P[n]) return;
      const now = ac.currentTime; if (last[n] && now - last[n] < (GAP[n] || 0.05)) return; last[n] = now;
      try { P[n](); } catch {}
    }
    return { play, unlock, isOn: () => on, toggle() { on = !on; try { localStorage.setItem('fsg.ritter.snd', on ? '1' : '0'); } catch {} if (on) { unlock(); setTimeout(() => play('buy'), 60); } return on; } };
  })();
  sfx = n => { if (active && !cine) SND.play(n); };
  document.addEventListener('pointerdown', () => SND.unlock(), true);

  /* ---------- Konto mit eigenem Namen und Passwort ---------- */
  const AKEY = 'fsg.ritter.konto';
  let acct = null, cloudDirty = false, cloudMsg = '', cloudBusy = false, durableInfo = null;
  try { acct = JSON.parse(localStorage.getItem(AKEY) || 'null'); } catch {}
  const setAcct = a => { acct = a; try { a ? localStorage.setItem(AKEY, JSON.stringify(a)) : localStorage.removeItem(AKEY); } catch {} };
  async function api(action, body, keepalive) {
    try {
      const res = await fetch('/api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: !!keepalive });
      const j = await res.json().catch(() => ({}));
      return res.ok ? j : { ...j, error: j.error || 'Der Server antwortet gerade nicht.' };
    } catch { return { error: 'Keine Verbindung zum Server.' }; }
  }
  const timeStr = t => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const typing = () => document.activeElement?.closest?.('#rlPanel form');
  let conflict = null; // neuerer Stand von einem anderen Gerät, wartet auf Entscheidung
  async function cloudSave(force, keepalive, keep) {
    if (conflict && !keep) { if (inCamp()) resolveConflict(conflict); return {}; }
    if (!acct || cloudBusy || (!cloudDirty && !force)) return {};
    cloudBusy = true; cloudDirty = false;
    const r = await api('save', { name: acct.name, token: acct.token, data: S, base: acct.updated || 0, force: !!keep }, keepalive);
    cloudBusy = false;
    if (r.conflict) { resolveConflict({ data: r.data, updated: r.updated }); return r; }
    if (r.error) { cloudDirty = true; cloudMsg = r.error; if (/anmelden/.test(r.error)) setAcct(null); }
    else { acct.updated = r.updated; acct.tester = !!r.tester; setAcct(acct); cloudMsg = `Gespeichert um ${timeStr(r.updated)}`; }
    if (tab === 'stand' && !typing() && active) panel();
    return r;
  }
  // Test-Werkzeug: Stufe kaufen, kostenlos kaufen oder eine Stufe zurücknehmen
  // Test: beliebiges Tempo
  function testSpeed() {
    modal(`<span class="rl-mic">⏩</span><h2>Tempo (Test)</h2><p class="note">Beliebige Zahl, z. B. 0,5 oder 10. Normal geht bis ×${String(maxSpeed(S)).replace('.', ',')}.</p>
      <div class="numrow" style="justify-content:center;margin:8px 0"><input id="rlTSpeed" inputmode="decimal" value="${String(S.speed).replace('.', ',')}" style="max-width:120px;text-align:center"></div>
      <div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn" data-m="ok" data-tspeed="set">Setzen</button><button class="btn ghost" data-m="ok" data-tspeed="cycle">Normal weiterschalten</button><button class="btn ghost" data-m="ok">Abbrechen</button></div>`);
  }
  // Test: bestimmte Rune auswählen
  let tRSort = 'art', tRFilt = 'all';
  function testRunePicker(amt = 1) {
    const chips = tRSort === 'art' ? RUNES.map(r => [r.id, r.name, r.color]) : Array.from({ length: 10 }, (_, i) => [String(i + 1), 'Stufe ' + ROMAN[i + 1], '#c9a6ff']);
    const tiles = [];
    for (const R of RUNES) for (let tier = 1; tier <= 10; tier++) {
      if (tRFilt !== 'all' && (tRSort === 'art' ? R.id !== tRFilt : String(tier) !== tRFilt)) continue;
      tiles.push({ R, tier });
    }
    if (tRSort === 'stufe') tiles.sort((a, b) => a.tier - b.tier);
    modal(`<span class="rl-mic">🧪</span><h2>Rune bekommen</h2><p class="note">Lager ${S.runes.length}/${runeCap(S)} · ist das Lager voll, gibt es Splitter.</p>
      <div class="numrow" style="justify-content:center;margin:4px 0"><label class="note" for="rlTRAmt">Anzahl</label><input id="rlTRAmt" type="number" min="1" value="${amt}" style="max-width:90px;text-align:center"></div>
      <div class="rl-fbar" style="justify-content:center"><span class="note">Sortieren:</span><button data-trsort="art" class="${tRSort === 'art' ? 'on' : ''}">nach Art</button><button data-trsort="stufe" class="${tRSort === 'stufe' ? 'on' : ''}">nach Stufe</button></div>
      <div class="rl-fbar chips" style="justify-content:center"><button data-trfilt="all" class="${tRFilt === 'all' ? 'on' : ''}">Alle</button>${chips.map(([v, nm, c]) => `<button data-trfilt="${v}" class="${tRFilt === v ? 'on' : ''}" style="--rc:${c}">${esc(nm)}</button>`).join('')}</div>
      <div class="rl-fgrid rl-tgrid">${tiles.map(({ R, tier }) => `<button class="rl-ftile" data-tgive="${R.id}:${tier}" style="--rc:${R.color}" title="${esc(R.desc(runeVal(R.id, tier)))}"><b>${ROMAN[tier]}</b><small>${R.name}</small></button>`).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-m="ok">Fertig</button></div>`);
  }
  document.addEventListener('click', e => {
    if (!(acct && acct.tester) || !e.target.closest) return;
    const sp = e.target.closest('[data-tspeed]');
    if (sp) { if (sp.dataset.tspeed === 'set') { const v = Number(String($('#rlTSpeed').value).replace(',', '.')); if (v > 0 && v <= 100) { S.speed = v; save(); hud(); toast(`Tempo ×${String(v).replace('.', ',')}`); } else toast('Bitte eine Zahl zwischen 0,1 und 100.'); }
      else { S.speed = S.speed >= maxSpeed(S) ? 1 : S.speed < 3 ? Math.floor(S.speed) + 1 : S.speed + 0.5; if (S.speed > maxSpeed(S)) S.speed = 1; save(); hud(); } return; }
    const amtNow = () => Math.max(1, Math.min(200, Math.floor(Number($('#rlTRAmt') && $('#rlTRAmt').value) || 1)));
    const so = e.target.closest('[data-trsort]'); if (so) { tRSort = so.dataset.trsort; tRFilt = 'all'; testRunePicker(amtNow()); e.stopPropagation(); return; }
    const fi = e.target.closest('[data-trfilt]'); if (fi) { tRFilt = fi.dataset.trfilt; testRunePicker(amtNow()); e.stopPropagation(); return; }
    const gv = e.target.closest('[data-tgive]');
    if (gv) { const [t, tier] = gv.dataset.tgive.split(':'), n = amtNow(); let got = 0; for (let i = 0; i < n; i++) if (addRune(S, t, Number(tier))) got++;
      SND.play('rune'); toast(got ? `${got}× ${RUNE[t].name} ${ROMAN[tier]} ins Lager` : 'Lager voll, als Splitter gutgeschrieben.'); save(); if (active) refresh(); testRunePicker(n); e.stopPropagation(); }
  }, true);
  function testInfo(key) {
    const [kind, id] = key.split(':');
    if (kind === 'n') { const n = NODE[id]; return n && { name: n.name, r: rank(S, id), max: n.max, can: canBuy(S, n), cost: (c => [c.g ? `${fmt(c.g)} Gold` : '', c.s ? `${c.s} Seelen` : ''].filter(Boolean).join(' + ') || 'gratis')(nodeCost(S, n)) }; }
    if (kind === 'p') { const p = PERKS.find(x => x.id === id); return p && { name: p.name, r: perk(S, id), max: p.max, can: perk(S, id) < p.max && S.stars >= perkCost(S, p), cost: `${perkCost(S, p)} Sterne` }; }
    const p = CPERKS.find(x => x.id === id); return p && { name: p.name, r: cperk(S, id), max: p.max, can: cperk(S, id) < p.max && S.crowns >= cperkCost(S, p), cost: `${cperkCost(S, p)} Kronen` };
  }
  function testMenu(key) {
    const i = testInfo(key); if (!i) return;
    modal(`<span class="rl-mic">🧪</span><h2>${esc(i.name)}</h2><p class="note">Stufe ${i.r}${i.max < 9999 ? ` von ${i.max}` : ''} · Test-Werkzeug</p>
      <div class="numrow" style="justify-content:center;margin:6px 0 10px"><label class="note" for="rlTAmt">Anzahl Stufen</label><input id="rlTAmt" type="number" inputmode="numeric" min="1" value="1" style="max-width:110px;text-align:center"></div>
      <div class="row" style="justify-content:center;flex-wrap:wrap;gap:8px">
        <button class="btn" data-m="ok" data-tdo="buy:${key}" ${i.can && inCamp() ? '' : 'disabled'}>1. Kaufen (nächste: ${i.cost})</button>
        <button class="btn" data-m="ok" data-tdo="free:${key}" ${i.r < i.max ? '' : 'disabled'}>2. Kostenlos kaufen</button>
        <button class="btn ghost" data-m="ok" data-tdo="sell:${key}" ${i.r > 0 ? '' : 'disabled'}>3. Verkaufen</button>
        <button class="btn ghost" data-m="ok">Abbrechen</button></div>`);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-tdo]'); if (!b || b.disabled || !(acct && acct.tester)) return;
    const [mode, kind, id] = b.dataset.tdo.split(':');
    const store = kind === 'n' ? S.nodes : kind === 'p' ? S.perks : S.cperks;
    const max = kind === 'n' ? NODE[id].max : (kind === 'p' ? PERKS : CPERKS).find(x => x.id === id).max;
    const r = store[id] || 0, amtEl = document.getElementById('rlTAmt'), amt = Math.max(1, Math.min(100000, Math.floor(Number(amtEl && amtEl.value) || 1)));
    let done = 0;
    if (mode === 'buy') { for (; done < amt; done++) { const ok = kind === 'n' ? buy(S, NODE[id]) : kind === 'p' ? buyPerk(S, PERKS.find(x => x.id === id)) : buyCperk(S, CPERKS.find(x => x.id === id)); if (!ok) break; } }
    else if (mode === 'free') { done = Math.min(amt, max - r); if (done <= 0) return; store[id] = r + done; if (kind === 'n' && NODE[id].active && r === 0 && eqOf(S, NODE[id].tree, NODE[id].sig).length < slotLim(S, NODE[id].tree, NODE[id].sig)) S.equip.push(id); }
    else { done = Math.min(amt, r); if (done <= 0) return; if (r - done > 0) store[id] = r - done; else { delete store[id]; if (kind === 'n') S.equip = S.equip.filter(x => x !== id); } if (kind === 'n') S.nodes.start = 1; }
    if (!done) { toast('Nicht genug Gold, Seelen, Sterne oder Kronen.'); return; }
    SND.play(mode === 'sell' ? 'tick' : 'buy'); toast(`${done} Stufe${done > 1 ? 'n' : ''} ${mode === 'sell' ? 'verkauft' : 'gekauft'}: jetzt Stufe ${store[id] || 0}`); setTimeout(afterChange, 0);
  }, true);
  // Automatisch: der Stand mit mehr (oder gleich vielen) Läufen gewinnt
  function resolveConflict(c) {
    conflict = c;
    const srv = Math.floor(Number(c.data && c.data.runs) || 0), loc = Math.floor(Number(S.runs) || 0);
    if (srv >= loc) {
      if (!inCamp()) return; // erst nach dem Lauf übernehmen
      conflict = null; adopt(c.data || {}); acct.updated = c.updated; setAcct(acct); cloudDirty = false;
      cloudMsg = `Neuerer Stand geladen (${srv} Läufe)`; if (active) toast(`Spielstand vom anderen Gerät geladen (${srv} Läufe).`);
    } else { conflict = null; cloudSave(true, false, true); cloudMsg = `Dieser Stand hat mehr Läufe (${loc}) und wurde gespeichert.`; }
  }
  function showConflict() {
    if (!conflict) return;
    const d = conflict.data || {}, num = v => Math.max(0, Math.floor(Number(v) || 0));
    const desc = x => `${num(x.asc) ? `${num(x.asc)}× Aufstieg, ` : ''}${num(x.rebirths)}× Wiedergeburt, Rekord Stufe ${Math.max(num(x.best), 0)}, ${num(x.runs)} Läufe`;
    modal(`<span class="rl-mic">⇅</span><h2>Neuerer Spielstand gefunden</h2>
      <p class="note">Mit „${esc(acct ? acct.name : '')}“ wurde um <b>${timeStr(conflict.updated)}</b> auf einem anderen Gerät weitergespielt.</p>
      <ul class="rl-list"><li><b>Anderes Gerät:</b> ${desc(d)}</li><li><b>Dieses Gerät:</b> ${desc(S)}</li></ul>
      <div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn" data-m="ok" data-sync="load">Stand vom anderen Gerät laden</button>
      <button class="btn ghost" data-m="ok" data-sync="keep">Diesen Stand behalten</button></div>
      <p class="note" style="text-align:center">Im Zweifel: laden. Der Stand, mit dem zuletzt gespielt wurde, ist meistens der richtige.</p>`);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-sync]'); if (!b || !conflict) return;
    const c = conflict; conflict = null;
    if (b.dataset.sync === 'load') { adopt(c.data || {}); acct.updated = c.updated; setAcct(acct); cloudDirty = false; cloudMsg = `Geladen – zuletzt gespeichert um ${timeStr(c.updated)}`; toast('Spielstand vom anderen Gerät geladen.'); }
    else { cloudSave(true, false, true).then(() => toast('Dieser Stand wurde gespeichert.')); }
  }, true);
  setInterval(() => cloudSave(false), 30000);
  setInterval(() => { if (active) save(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); cloudSave(true, true); } });

  const W = 480, H = 270, GROUND = 222;
  function tabsList() {
    const t = [];
    for (const h of HEROES) if (classOpen(S, h.tree) || S.rebirths + 1 >= h.rebirth) t.push({ id: h.tree, label: h.name, color: h.color, locked: !classOpen(S, h.tree) });
    if (S.rebirths >= 1 || S.asc || S.stars || S.crowns || S.tempo || expOpen(S)) t.push({ id: 'laeden', label: 'Läden', color: '#ffcf4a' });
    if (expOpen(S)) t.push({ id: 'exp', label: 'Expedition', color: '#9bd14a' });
    if (feature(S, 'runen') || S.runes.length) t.push({ id: 'runen', label: 'Runen', color: '#ff7a3d' });
    if (S.asc >= 2 || Object.keys(S.comps).length) t.push({ id: 'begleiter', label: 'Begleiter', color: '#ff9a3d' });
    if (ahnOpen(S)) t.push({ id: 'ahnen', label: 'Ahnenprüfung', color: '#ffd27a' });
    t.push({ id: 'halle', label: 'Ruhmeshalle', color: '#ffd23f' }, { id: 'ruhm', label: S.asc || S.rebirths >= 9 ? 'Wiedergeburt & Aufstieg' : 'Wiedergeburt', color: '#c9a6ff' }, { id: 'stand', label: 'Spielstand', color: '#a99fbb' });
    return t;
  }
  // Reiter in Gruppen: alle Helden unter „Helden“, Ahnenprüfung und Expedition unter „Abenteuer“
  const TAB_GROUPS = { helden: { label: 'Helden', color: '#ffb547' }, abenteuer: { label: 'Abenteuer', color: '#ffd27a' } };
  const groupOf = id => (HERO[id] ? 'helden' : id === 'ahnen' || id === 'exp' ? 'abenteuer' : null);
  const lastSub = { helden: 'ritter', abenteuer: 'ahnen' };
  function renderTabs() {
    const list = tabsList();
    if (!list.some(t => t.id === tab)) tab = 'ritter';
    const g = groupOf(tab); if (g) lastSub[g] = tab;
    const top = [], seen = new Set();
    for (const t of list) {
      const gr = groupOf(t.id);
      if (!gr) { top.push(t); continue; }
      if (seen.has(gr)) continue; seen.add(gr);
      const members = list.filter(x => groupOf(x.id) === gr), target = members.some(x => x.id === lastSub[gr]) ? lastSub[gr] : members[0].id;
      top.push(members.length > 1 || gr === 'helden' ? { id: target, label: TAB_GROUPS[gr].label, color: g === gr ? (list.find(x => x.id === tab) || {}).color || TAB_GROUPS[gr].color : TAB_GROUPS[gr].color, group: gr } : members[0]);
    }
    const isOn = t => (t.group ? t.group === g : t.id === tab);
    let html = `<div class="rl-trow">${top.map(t => `<button data-tab="${t.id}" class="${isOn(t) ? 'on' : ''} ${t.locked ? 'locked' : ''}" style="--tc:${t.color}">${t.label}</button>`).join('')}</div>`;
    if (g) {
      const members = list.filter(x => groupOf(x.id) === g);
      if (members.length > 1) html += `<div class="rl-sub">${members.map(t => { const h = HERO[t.id];
        return `<button data-tab="${t.id}" class="${t.id === tab ? 'on' : ''} ${t.locked ? 'locked' : ''}" style="--tc:${t.color}">${h ? `<span class="pt">${PORTRAIT[h.id]}</span>` : ''}${t.label}${h && S.ahn && S.ahn.place[h.id] ? '<i class="sig" title="Ahnensiegel">✦</i>' : ''}</button>`; }).join('')}</div>`;
    }
    $('.rl-tabs').innerHTML = html;
    const on = document.querySelector('.rl-sub .on'); if (on && on.offsetLeft + on.offsetWidth > on.parentNode.clientWidth) on.parentNode.scrollLeft = on.offsetLeft - 24;
  }
  function open() {
    active = true;
    $('#hub').hidden = true; $('#room').hidden = true; $('#solo').hidden = false;
    st = stats(S);
    if (!cv) {
      $('#solo').innerHTML = `
        <div class="topbar"><button class="btn ghost small" id="soloBack">‹ Spiele</button><div class="title"><b>Ritterlauf</b><small>Solo</small></div>
          <div class="rl-topr"><button class="btn ghost small rl-newsbtn" id="soloSnd" aria-label="Ton an oder aus"></button><button class="btn ghost small rl-newsbtn" id="soloNews" aria-label="Neuigkeiten">📰<span class="dot" hidden></span></button><button class="btn ghost small" id="soloSpeed">Tempo ×1</button></div></div>
        <div class="rl-stage"><div id="soloCanvas" class="rl-canvas"></div></div>
        <div class="rl-heroes" id="rlHeroes"></div>
        <div class="rl-bar"><div class="rl-stat" id="rlStat"></div><div id="rlAction" class="row"></div></div>
        <div class="rl-tabs" role="tablist"></div>
        <div id="rlPanel"></div>`;
      cv = document.createElement('canvas'); $('#soloCanvas').appendChild(cv); ctx = cv.getContext('2d');
      cv.addEventListener('click', e => {
        if (cine) { if (cine.t > 0.4) cine.t = Math.max(cine.t, cine.dur - 0.25); return; }
        if (!inCamp()) return;
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
        if (x > 90 && x < 400 && y > 80) openSquad();
      });
      window.addEventListener('resize', () => { sizeCanvas(); if (squad && !squad.el.hidden) sizeSquad(); });
      $('#soloBack').onclick = close;
      $('#soloNews').onclick = showUpdates;
      $('#soloSnd').onclick = () => { const on = SND.toggle(); $('#soloSnd').textContent = on ? '🔊' : '🔇'; toast(on ? 'Ton an' : 'Ton aus'); };
      $('#soloSnd').textContent = SND.isOn() ? '🔊' : '🔇';
      $('#soloSpeed').onclick = () => { if (acct && acct.tester) { testSpeed(); return; } S.speed = S.speed >= maxSpeed(S) ? 1 : S.speed < 3 ? S.speed + 1 : S.speed + 0.5; save(); hud(); };
      $('.rl-tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; confirm = ''; runeSel = null; wRes = null; fRes = null; renderTabs(); panel(); } };
      for (const id of ['#rlPanel', '#rlAction', '#rlHeroes']) $(id).addEventListener('click', onClick);
      $('#rlPanel').addEventListener('submit', onSubmit);
    }
    sizeCanvas(); refresh();
    if (S.starNews) { const n = S.starNews; delete S.starNews; save(); setTimeout(() => toast(`Sternen-Laden zurückgesetzt: ${n} Sterne zurück. Verteile sie neu!`, true), 1200); }
    if (S.startNews) { const n = S.startNews; delete S.startNews; save(); setTimeout(() => toast(`Sprungstart wurde zu Beutezug umgebaut: ${n} Sterne zurück.`, true), 600); }
    if (conflict) setTimeout(() => resolveConflict(conflict), 300); else if (acct) setTimeout(() => cloudSave(true), 800);
    if (!betaShown) { betaShown = true; showBeta(); } else openChain();

    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function refresh() { st = run && !run.dead ? statsFor(S, run.mode) : stats(S); renderTabs(); hud(); heroes(); action(); panel(); }
  function achCheck(run) { const got = checkAch(S, run); if (got.length) { st = run && !run.dead ? statsFor(S, run.mode) : stats(S); got.forEach((a, i) => setTimeout(() => toast(`Erfolg: ${a.name} (+3 % Stärke)`, true), i * 1800)); save(); } return got; }
  function close() { closeSquad(); active = false; cancelAnimationFrame(raf); save(); cloudSave(true); $('#solo').hidden = true; $('#hub').hidden = false; }
  function sizeCanvas() {
    const host = $('#soloCanvas'); const w = Math.min(host.clientWidth || 360, 960);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = w + 'px'; cv.style.height = (w * H / W) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * H / W * dpr); scale = cv.width / W;
  }
  function playCine(kind, team) {
    const n = S.news; if (!n) return;
    cine = { kind, t: 0, dur: kind === 'asc' ? 8.2 : 4.6, n: n.n, amount: kind === 'asc' ? n.crowns : n.stars,
      before: kind === 'asc' ? S.crowns - n.crowns : S.stars - n.stars, team };
    const host = $('#soloCanvas'); if (host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function startRun(mode) {
    if (cine) return;
    areaBefore = areaMax(S); st = statsFor(S, mode); run = newRun(S, mode); confirm = ''; notice = ''; heroes(); action(); panel(); }
  function loop(now) {
    if (!active) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    // Automatisch weniger Effekte, wenn das Gerät nicht hinterherkommt
    if (!document.hidden && dt > 0) { fxClock += dt; fxAvg = fxAvg * 0.95 + dt * 0.05; if (fxClock > 3 && !lowFx && fxAvg > 0.03) lowFx = true; }
    if (cine) { cine.t += dt; if (cine.t >= cine.dur) { cine = null; showNews(); } }
    if (run && !run.dead) {
      const n = Math.ceil(S.speed), sdt = dt * S.speed / n;
      for (let i = 0; i < n; i++) if (step(S, st, run, sdt) === 'dead') { endRun(); break; }
    } else if (run) run.deadT += dt;
    draw(now / 1000);
    if (squad && !squad.el.hidden) drawSquad(now / 1000, squad);
    hudT += dt; if (hudT > 0.2) { hudT = 0; hud(); if (run && !run.dead) heroes(); }
    raf = requestAnimationFrame(loop);
  }

  function endRun() {
    if (run.mode === 'weekly') { const r = claimWeekly(S, run); run.weeklyReward = r; if (r.stars || r.crowns) setTimeout(() => toast(`Wochen-Belohnung: +${r.stars} Sterne${r.crowns ? ` +${r.crowns} Krone` : ''}`, true), 300); }
    if (run.mode === 'exp') {
      const r = claimExp(S, run); run.expReward = r;
      if (r) { setTimeout(() => toast(`Mission geschafft: +${r.spl} Heldensplitter`, true), 200); if (r.piece != null) setTimeout(() => (r.complete ? heroDone(r.hero) : pieceFound(r.hero)), 900); }
    }
    if (run.mode === 'ahnen') { const r = ahnClaim(S, run); run.ahnReward = r; ahnSel = null; if (r && r.sigil) setTimeout(sigilGot, 700); else if (r) setTimeout(() => toast(`Mission ${r.mission + 1} geschafft! Mission ${r.mission + 2} ist frei.`, true), 300); }
    if (run.mode === 'normal' && areaMax(S) > areaBefore) { const z = areaMax(S); setTimeout(() => toast(`Neues Startgebiet frei: ${zoneName(10 * z + 1)}`, true), 600); }
    SND.play(run.victory ? 'victory' : 'defeat');
    achCheck(run); save(); cloudSave(true); refresh();
  }
  /* ---------- Leisten ---------- */
  const crown = '<i class="rl-crown" aria-hidden="true"></i>', coin = '<i class="rl-coin" aria-hidden="true"></i>', soul = '<i class="rl-soulic" aria-hidden="true"></i>', star = '<i class="rl-star" aria-hidden="true"></i>', dust = '<i class="rl-dust" aria-hidden="true"></i>';
  function hud() {
    $('#rlStat').innerHTML = `<span class="rl-cur gold">${coin}${fmt(S.gold)}</span><span class="rl-cur soul">${soul}${S.souls}</span>${S.stars || S.rebirths ? `<span class="rl-cur star">${star}${S.stars}</span>` : ''}${feature(S, 'runen') ? `<span class="rl-cur dust">${dust}${S.dust}</span>` : ''}${S.asc || S.crowns ? `<span class="rl-cur crown">${crown}${S.crowns}</span>` : ''}
      <span class="note">Rekord ${S.best} von ${capOf(S) === Infinity ? '∞' : capOf(S)} · ${S.asc ? `Aufstieg ${S.asc} · ` : ''}${S.rebirths ? `${S.rebirths}× wiedergeboren · ` : ''}${S.runs} Läufe</span>`;
    { const d = $('#soloNews .dot'); if (d) d.hidden = newsSeen() >= UPDATES[0].id; }
    $('#soloSpeed').textContent = `Tempo ×${String(S.speed).replace('.', ',')}`;
  }
  function heroes() {
    const live = run && !run.dead;
    const list = HEROES.filter(h => hired(S, h.tree) || classOpen(S, h.tree));
    const next = HEROES.find(h => !h.puzzle && !classOpen(S, h.tree));
    const field = fieldOf(S), slots = fieldSlots(S), hiredN = HEROES.filter(h => hired(S, h.tree)).length;
    const bar = '';
    $('#rlHeroes').innerHTML = bar + list.map(h => {
      const sh = st[h.id];
      if (!sh) return `<button class="rl-hero locked" data-tab="${h.tree}" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><span class="hn"><b>${h.name}</b><small>Im Baum anheuern</small></span></button>`;
      const eq = S.equip.filter(id => NODE[id].tree === h.tree);
      let body;
      if (live && run.h[h.id]) {
        const hs = run.h[h.id], pct = Math.max(0, hs.hp / sh.hp);
        body = `<span class="hp"><i style="width:${pct * 100}%"></i>${hs.shield > 0 ? `<em style="width:${Math.min(100, hs.shield / sh.hp * 100)}%"></em>` : ''}</span><small>${hs.alive ? `${fmt(Math.max(0, hs.hp))} / ${fmt(sh.hp)}` : 'Gefallen'}</small>
          <span class="cds">${eq.map(id => { const cd = run.cds[id] || 0; return `<span class="cd ${cd > 0 ? '' : 'ok'}">${ACT_NAME(id)}${cd > 0 ? ` ${Math.ceil(cd)}s` : ''}</span>`; }).join('')}</span>`;
      } else body = `<small>${h.id === 'p' ? `Heilung ${fmt(sh.heal)}` : `Schaden ${fmt(sh.atk)}`} · Leben ${fmt(sh.hp)}</small><span class="cds">${eq.map(id => `<span class="cd ok">${ACT_NAME(id)}</span>`).join('') || '<span class="cd">keine Fähigkeit</span>'}</span>`;
      const benched = !field.includes(h.id);
      if (live && !run.h[h.id]) body = '<small>Wartet am Lagerfeuer</small>';
      return `<button class="rl-hero ${live && run.h[h.id] && !run.h[h.id].alive ? 'down' : ''} ${benched ? 'bench' : ''}" data-tab="${h.tree}" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><span class="hn"><b>${h.name}${benched ? ' <em class="rl-benchtag">Bank</em>' : ''}</b>${body}</span></button>`;
    }).join('') + (next && !live ? `<div class="rl-hero locked" style="--hc:${next.color}"><span class="pt">?</span><span class="hn"><b>${next.name}</b><small>kommt mit der ${next.rebirth}. Wiedergeburt</small></span></div>` : '');
  }
  function action() {
    const a = $('#rlAction');
    if (inCamp()) a.innerHTML = `<button class="btn ghost" data-rl="weekly">Woche</button>${feature(S, 'turm') ? `<button class="btn ghost" data-rl="tower">Turm${S.towerBest ? ` (Rekord ${S.towerBest})` : ''}</button>` : ''}${areaMax(S) >= 1 ? `<button class="btn ghost rl-area" data-rl="area"><small>Startgebiet</small><b>${esc(zoneName(st.startStage))} ▾</b></button>` : ''}<button class="btn rl-go" data-rl="start">${run ? 'Neuer Lauf' : 'Lauf starten'}${st.startStage > 1 ? ` ab Stufe ${st.startStage}` : ''}</button>`;
    else a.innerHTML = `<button class="btn ${confirm === 'giveup' ? 'danger' : 'ghost'} small" data-rl="giveup">${confirm === 'giveup' ? 'Wirklich aufgeben?' : run.mode === 'tower' ? 'Turm verlassen' : run.mode === 'weekly' ? 'Herausforderung beenden'   : run.mode === 'exp' || run.mode === 'ahnen' ? 'Mission abbrechen' : 'Lauf aufgeben'}</button>`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const costHTML = c => [c.g ? `<span class="rl-cur gold">${coin}${fmt(c.g)}</span>` : '', c.s ? `<span class="rl-cur soul">${soul}${c.s}</span>` : ''].join(' ');

  /* ---------- Bäume ---------- */
  function treeSVG(tree) {
    const sg = sigOn(S, tree), list = NODES.filter(n => n.tree === tree && (!n.sig || sg));
    const P = n => [n.x * 100 + 50, n.y * 100 + 50];
    let lines = '', nodes = '';
    for (const n of list) for (const pid of n.p || []) {
      const p = NODE[pid], on = rank(S, n.id) > 0 && rank(S, pid) > 0, open = rank(S, pid) > 0;
      const [x1, y1] = P(p), [x2, y2] = P(n);
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${on ? 'on' : open ? 'open' : ''}"/>`;
    }
    for (const n of list) {
      const [x, y] = P(n), r = rank(S, n.id), av = available(S, n), afford = inCamp() && canBuy(S, n);
      const cls = ['nd', n.sig ? 'sig' : '', n.active ? 'act' : '', n.kind || '', r ? 'own' : av ? 'av' : 'lock', afford ? 'buy' : '', sel[tree] === n.id ? 'sel' : '', S.equip.includes(n.id) ? 'eq' : ''].join(' ');
      const R = n.kind === 'key' ? 36 : n.kind === 'start' ? 34 : 30;
      const shape = n.active ? `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="16"/>` : n.kind === 'key' ? `<polygon points="${x},${y - R} ${x + R},${y} ${x},${y + R} ${x - R},${y}"/>` : `<circle cx="${x}" cy="${y}" r="${R}"/>`;
      const lbl = n.max > 1 ? (n.max > 99 ? r : `${r}/${n.max}`) : '';
      nodes += `<g class="${cls}" data-node="${n.id}" role="button" aria-label="${esc(n.name)}">${afford ? `<circle cx="${x}" cy="${y}" r="${R + 10}" class="glow"/>` : ''}${shape}<text x="${x}" y="${y + 2}" class="ic">${n.icon}</text>${lbl ? `<text x="${x}" y="${y + 52}" class="rk">${lbl}</text>` : ''}</g>`;
    }
    const band = sg ? `<rect class="sigband" x="6" y="702" width="688" height="404" rx="28"/><text class="sigtxt" x="350" y="1096">✦ Ahnensiegel ✦</text>` : '';
    return `<svg class="rl-tree2" viewBox="0 0 700 ${sg ? 1110 : 710}">${band}${lines}${nodes}</svg>`;
  }
  function detailHTML(tree) {
    const n = NODE[sel[tree]], r = rank(S, n.id), maxed = r >= n.max, h = HERO[tree], why = blockReason(S, n);
    const type = n.kind === 'start' ? (n.cost ? 'Anheuern' : 'Start') : n.active ? (n.sig ? 'Siegel-Fähigkeit' : 'Aktive Fähigkeit') : n.kind === 'key' ? (n.sig ? 'Siegel-Schlüssel' : 'Schlüssel') : n.kind === 'inf' ? 'Endlos' : n.sig ? 'Siegel · Passiv' : 'Passiv';
    let act = '';
    if (n.cost) {
      if (maxed && n.kind === 'key') { const c = nodeCost(S, { ...n, id: '_' }); act = `<button class="btn ${confirm === 'unkey' ? 'danger' : 'ghost'} small" data-rl="unkey" ${inCamp() ? '' : 'disabled'}>${confirm === 'unkey' ? 'Wirklich abnehmen?' : 'Schlüssel abnehmen'}</button><span class="note">Du bekommst ${costHTML(c)} zurück und kannst einen anderen Schlüssel wählen.</span>`; }
      else if (maxed) act = '<span class="note">Voll ausgebaut</span>';
      else if (why) act = `<span class="note">${esc(why)}</span>`;
      else act = `<div class="rl-buy"><button class="btn small" data-rl="buy" ${inCamp() && canBuy(S, n) ? '' : 'disabled'}>${n.kind === 'start' ? 'Anheuern' : r ? 'Verbessern' : 'Freischalten'}</button>${costHTML(nodeCost(S, n))}</div>${inCamp() ? '' : '<span class="note">Verbessern geht nur im Lager nach dem Lauf.</span>'}`;
      if (acct && acct.tester) act += `<button class="btn ghost small" data-tmenu="n:${n.id}" title="Test-Werkzeug">🧪</button>`;
    }
    if (n.active && r) {
      const on = S.equip.includes(n.id), used = eqOf(S, tree, n.sig).length, lim = slotLim(S, tree, n.sig);
      act += `<button class="btn ghost small" data-rl="equip" ${inCamp() && lim > 0 ? '' : 'disabled'}>${on ? 'Ablegen' : used >= lim ? 'Ausrüsten (tauscht)' : 'Ausrüsten'}</button>${n.sig ? '<span class="note">Kommt in den Siegel-Platz.</span>' : ''}`;
    }
    return `<div class="rl-detail" style="--hc:${h.color}"><div class="rl-dhead"><span class="rl-dic">${n.icon}</span><div><b>${esc(n.name)}</b><span class="pill">${type}</span></div></div>
      ${n.max > 1 ? `<span class="note">${n.max > 99 ? `Stufe ${r}` : `Stufe ${r} von ${n.max}`}</span>` : ''}<p>${esc(n.desc)}</p>${n.cap ? `<p class="note">${r >= n.cap ? `Grenze erreicht${r > n.cap ? ` · ${r - n.cap} Bonus-Stufen aktiv` : ''}` : `Noch ${n.cap - r} Stufen bis zur Grenze`}</p>` : ''}<div class="row">${act}</div></div>`;
  }
  function sockRow(tree) {
    const cap = keyCap(S, tree), used = keyNeed(S, tree), extra = cap - 1, free = kFree(S);
    const dots = Array.from({ length: cap }, (_, i) => `<span class="rl-sock ${i < used ? 'on' : ''} ${i === 0 ? 'fix' : ''}" title="${i === 0 ? 'Fester Sockel' : 'Verteilbarer Sockel'}">⚿</span>`).join('')
      + (sigOn(S, tree) ? `<span class="rl-sock sig ${sigKeysUsed(S, tree) ? 'on' : ''}" title="Siegelsockel: nur für einen Siegel-Schlüssel">✦</span>` : '');
    return `<div class="rl-keyrow"><span class="note">Schlüsselsockel ${used}/${cap}</span><span class="rl-socks">${dots}</span>
      <button class="btn ghost small" data-rl="sockadd" ${free > 0 && inCamp() ? '' : 'disabled'}>+ Sockel setzen</button>
      <button class="btn ghost small" data-rl="sockdel" ${extra > 0 && inCamp() ? '' : 'disabled'}>− Sockel abnehmen</button>
      <span class="note">frei: <b>${free}</b> von ${kSlots(S)}</span></div>`;
  }
  function heroTab(tree) {
    const h = HERO[tree], eq = eqOf(S, tree, false), eqS = eqOf(S, tree, true), ok = hired(S, tree), sg = sigOn(S, tree);
    const lockedNote = !classOpen(S, tree) ? `<p class="warn">${h.puzzle ? `Diese Klasse bekommst du mit 6 Puzzleteilen aus den Expeditionen (${pieceCount(S, h.id)}/6).` : `Diese Klasse wird mit der ${h.rebirth}. Wiedergeburt freigeschaltet.`} Du kannst dir den Baum schon ansehen.</p>` : '';
    return `${lockedNote}<div class="rl-hhead" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><div><h3>${h.name}</h3><p class="note">${h.desc}</p>
      ${ok ? `<p class="note">Aktive Fähigkeiten ${eq.length}/${slotsOf(S, tree)}: ${eq.length ? esc(eq.map(ACT_NAME).join(', ')) : 'noch keine'}${sg ? ` · <span class="rl-sigslot">✦ Siegel-Platz: ${eqS.length ? esc(eqS.map(ACT_NAME).join(', ')) : 'frei'}</span>` : ''}</p>${sockRow(tree)}` : ''}</div></div>
      ${acct && acct.tester ? `<div class="rl-test"><b>🧪 Test</b> <button class="btn small ${confirm === 'tbuild' ? 'danger' : ''}" data-rl="tbuild" ${inCamp() && classOpen(S, tree) ? '' : 'disabled'}>${confirm === 'tbuild' ? 'Wirklich den ganzen Baum setzen?' : 'Baum komplett ausbauen'}</button><span class="note">Alles auf voll, Schaden und Leben auf 20, linke Endlos-Fertigkeit auf 16, rechte auf 8. Kostet nichts. Schlüssel bleiben, wie sie sind.</span></div>` : ''}
      <div class="rl-treewrap"><div class="rl-treebox">${treeSVG(tree)}${!sg && ahnOpen(S) && classOpen(S, tree) ? `<p class="note rl-signote">✦ Mit einem Ahnensiegel wächst dieser Baum nach unten: 5 passive Fähigkeiten, 3 Siegel-Fähigkeiten mit eigenem Platz und 4 Siegel-Schlüssel mit eigenem Sockel. ${S.ahn.sig > 0 ? 'Du hast ein freies Siegel, setze es im Reiter Ahnenprüfung.' : 'Siegel bekommst du in der Ahnenprüfung.'}</p>` : ''}</div>${detailHTML(tree)}</div>`;
  }
  function testBuild(tree) {
    const inf = NODES.filter(n => n.tree === tree && n.kind === 'inf');
    for (const n of NODES) {
      if (n.tree !== tree || n.kind === 'key' || (n.sig && !sigOn(S, tree))) continue;
      S.nodes[n.id] = n.kind === 'inf' ? (inf.indexOf(n) === 0 ? 16 : 8) : n.max === 30 ? 20 : n.max;
    }
    const acts = NODES.filter(n => n.tree === tree && n.active).map(n => n.id);
    for (const id of acts) if (!S.equip.includes(id) && eqOf(S, tree, NODE[id].sig).length < slotLim(S, tree, NODE[id].sig)) S.equip.push(id);
  }
  function campInfo() {
    if (run && run.dead) {
      const extra = `${run.kills} Gegner besiegt${run.gold ? ` · ${coin}+${fmt(run.gold)}` : ''}${run.souls ? ` · ${soul}+${run.souls}` : ''}${run.runes.length ? ` · ${run.runes.length} Rune${run.runes.length > 1 ? 'n' : ''}` : ''}`;
      if (run.mode === 'weekly') { const r = run.weeklyReward || {}; return `<div class="rl-dead week"><b>Wochen-Herausforderung: Stufe ${run.stage}</b><span>Bestes Ergebnis diese Woche: Stufe ${S.weekly.best}${r.stars ? ` · ${star}+${r.stars}` : ''}${r.crowns ? ` · ${crown}+${r.crowns}` : ''}</span><span class="note">Belohnungen und Bestenliste findest du in der Ruhmeshalle.</span></div>`; }
      if (run.mode === 'ahnen') return ahnEndInfo();
      if (run.mode === 'exp') {
        const m = MISSION[run.mission], r = run.expReward;
        if (run.victory && r) return `<div class="rl-dead win"><b>Mission geschafft: ${esc(m.name)}</b><span>+${r.spl} Heldensplitter${r.piece != null ? ` · Puzzleteil für ${HERO_BY_ID[r.hero].name}!` : ''}</span><span class="note">Splitter: ${S.exp.spl} · Puzzleteile von ${HERO_BY_ID[S.exp.target].name}: ${pieceCount(S, S.exp.target)}/6</span></div>`;
        return `<div class="rl-dead"><b>Mission gescheitert: ${esc(m.name)}</b><span>${esc(run.failNote || `Gefallen auf Stufe ${run.stage}`)}</span><span class="note">Versuch es mit stärkeren Helden oder einer leichteren Mission.</span></div>`;
      }
      if (run.mode === 'tower') return `<div class="rl-dead tower"><b>Turm: Etage ${run.stage} erreicht</b><span>${extra}</span><span class="note">Dein Turm-Rekord (${S.towerBest}) gibt allen Helden dauerhaft +${S.towerBest * 3} % Schaden und Leben.</span></div>`;
      if (run.victory) return `<div class="rl-dead win"><b>Stufengrenze ${capOf(S)} erreicht!</b><span>${extra}</span><span class="note">Weitere Stufen schaltest du mit der nächsten Wiedergeburt frei.</span></div>`;
      return `<div class="rl-dead"><b>Lauf vorbei auf Stufe ${run.stage}</b><span>${extra}</span><span class="note">Verbessere deine Helden und starte dann den nächsten Lauf.</span></div>`;
    }
    if (!run && !acct && S.runs >= 2) return `<div class="rl-hint"><span><b>Tipp:</b> Sichere deinen Fortschritt mit Namen und Passwort, damit er nicht verloren geht.</span><button class="btn small" data-rl="gosave">Jetzt sichern</button></div>`;
    if (!run) return '<p class="note">Du bist im Lager. Hier verbesserst du deine Helden mit Gold und Seelen. Seelen gibt es von Bossen (alle 10 Stufen) und manchmal von Elite-Gegnern mit lila Schimmer.</p>';
    return '<p class="note">Der Lauf läuft. Verbessern kannst du erst danach im Lager.</p>';
  }
  /* ---------- Runen ---------- */
  function runeChip(r, extra = '') {
    return `<button class="rl-rune ${extra}" data-rune="${r.id}" style="--rc:${RUNE[r.t].color}" aria-label="${RUNE[r.t].name} ${ROMAN[r.tier]}"><b>${ROMAN[r.tier]}</b><small>${RUNE[r.t].name}</small></button>`;
  }
  function runenTab() {
    const used = new Set(Object.values(S.sockets).flat().filter(Boolean));
    const selR = runeSel && S.runes.find(r => r.id === runeSel);
    let html = `<p class="note">Bosse lassen Runen fallen. Setze bis zu 3 Runen pro Klasse ein. Drei Runen der gleichen Art in einer Klasse geben +50 % Bonus. Runen bleiben bei der Wiedergeburt erhalten.</p>`;
    if (selR) html += `<div class="rl-runesel" style="--rc:${RUNE[selR.t].color}"><b>${RUNE[selR.t].name} ${ROMAN[selR.tier]}</b><span>${RUNE[selR.t].desc(runeVal(selR.t, selR.tier))}</span><span class="note">Tippe auf einen Sockel, um sie einzusetzen.</span>
      ${feature(S, 'runen') ? `<div class="row">${feature(S, 'schmiede') ? `<button class="btn small" data-rl="merge" ${canMerge(S, selR) ? '' : 'disabled'}>3 verschmelzen → ${ROMAN[selR.tier + 1] || ''} (${dust}${mergeCost(selR.tier)})</button>` : ''}<button class="btn ghost small" data-rl="dismantle">Zerstören (+${dust}${shardOf(selR.tier)})</button></div>` : ''}</div>`;
    html += '<div class="rl-sockets">' + HEROES.filter(h => st[h.id]).map(h => {
      const slots = S.sockets[h.id] || [null, null, null];
      const b = Object.entries((() => { const list = slots.map(id => id && S.runes.find(r => r.id === id)).filter(Boolean); const c = {}; list.forEach(r => (c[r.t] = (c[r.t] || 0) + 1)); return c; })()).filter(([, n]) => n >= 3);
      return `<div class="rl-sockrow" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><b>${h.name}</b><div class="slots">${slots.map((id, i) => {
        const r = id && S.runes.find(x => x.id === id);
        return r ? `<span class="slotwrap" data-sock="${h.id}:${i}">${runeChip(r, 'in')}</span>` : `<button class="rl-slot ${selR ? 'ready' : ''}" data-sock="${h.id}:${i}">+</button>`;
      }).join('')}</div>${b.length ? `<span class="pill">Set: ${RUNE[b[0][0]].name}</span>` : ''}</div>`;
    }).join('') + '</div>';
    const free = S.runes.filter(r => !used.has(r.id)).sort((a, b) => b.tier - a.tier || a.t.localeCompare(b.t));
    html += `<h3 class="rl-h3">Lager (${S.runes.length}/${runeCap(S)})</h3><div class="rl-inv">${free.map(r => runeChip(r, r.id === runeSel ? 'on' : '')).join('') || '<p class="note">Noch keine freien Runen. Besiege Bosse, um welche zu finden.</p>'}</div>`;
    return html;
  }
  const KOBOLD_SVG = `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="kfg" cx="50%" cy="78%" r="60%"><stop offset="0" stop-color="#ff9a3d" stop-opacity=".55"/><stop offset=".55" stop-color="#ff6a2a" stop-opacity=".18"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
<linearGradient id="kskin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ccf5a"/><stop offset="1" stop-color="#5e8f34"/></linearGradient>
<linearGradient id="kanv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a909c"/><stop offset=".25" stop-color="#5a606c"/><stop offset="1" stop-color="#2e323a"/></linearGradient>
<linearGradient id="khot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7a2a"/><stop offset=".5" stop-color="#fff2a8"/><stop offset="1" stop-color="#ff7a2a"/></linearGradient>
<linearGradient id="kapr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a34"/><stop offset="1" stop-color="#5a3a20"/></linearGradient>
</defs>
<ellipse cx="100" cy="175" rx="100" ry="70" fill="url(#kfg)" class="kglow"/>
<ellipse cx="100" cy="214" rx="78" ry="9" fill="rgba(0,0,0,.35)"/>
<!-- Beine -->
<rect x="112" y="168" width="12" height="40" rx="5" fill="#4a3a2a" stroke="#1e1610" stroke-width="2"/>
<rect x="134" y="168" width="12" height="40" rx="5" fill="#4a3a2a" stroke="#1e1610" stroke-width="2"/>
<ellipse cx="117" cy="208" rx="11" ry="5" fill="#2a1e14"/><ellipse cx="141" cy="208" rx="11" ry="5" fill="#2a1e14"/>
<!-- Körper mit Schürze -->
<path d="M104 120 Q129 104 154 120 L158 176 Q129 186 100 176 Z" fill="#a0603a" stroke="#1e1610" stroke-width="2.5"/>
<path d="M110 128 Q129 120 148 128 L150 182 Q129 190 108 182 Z" fill="url(#kapr)" stroke="#1e1610" stroke-width="2"/>
<rect x="104" y="150" width="50" height="6" fill="#3a2614"/><rect x="125" y="149" width="8" height="8" rx="1.5" fill="#e0b84a"/>
<!-- hinterer Arm hält das Werkstück mit Zange -->
<path d="M108 132 Q86 146 76 160" fill="none" stroke="#1e1610" stroke-width="11" stroke-linecap="round"/>
<path d="M108 132 Q86 146 76 160" fill="none" stroke="url(#kskin)" stroke-width="7" stroke-linecap="round"/>
<path d="M76 160 L52 166 M76 160 L52 160" stroke="#3a3a44" stroke-width="3" stroke-linecap="round"/>
<!-- Kopf -->
<g class="khead">
<path d="M106 84 L74 66 L98 96 Z" fill="url(#kskin)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M152 84 L186 64 L160 96 Z" fill="url(#kskin)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M104 82 L84 72 L100 92 Z" fill="#d88f86"/><path d="M154 82 L176 70 L158 92 Z" fill="#d88f86"/>
<circle cx="129" cy="92" r="27" fill="url(#kskin)" stroke="#1e1610" stroke-width="2.5"/>
<path d="M104 80 Q129 58 154 80 L154 74 Q129 52 104 74 Z" fill="#7a3a24" stroke="#1e1610" stroke-width="2"/>
<rect x="106" y="70" width="46" height="9" rx="4" fill="#5a3a24" stroke="#1e1610" stroke-width="1.6"/>
<circle cx="118" cy="74" r="7" fill="#9fd8f2" stroke="#2a2a30" stroke-width="2.5"/><circle cx="140" cy="74" r="7" fill="#9fd8f2" stroke="#2a2a30" stroke-width="2.5"/>
<circle cx="116" cy="72" r="2.2" fill="#fff" opacity=".8"/><circle cx="138" cy="72" r="2.2" fill="#fff" opacity=".8"/>
<ellipse cx="119" cy="92" rx="5.5" ry="6" fill="#fff6a0" stroke="#1e1610" stroke-width="1.6"/><ellipse cx="139" cy="92" rx="5.5" ry="6" fill="#fff6a0" stroke="#1e1610" stroke-width="1.6"/>
<circle cx="117.5" cy="93" r="2.6" fill="#1e1610"/><circle cx="137.5" cy="93" r="2.6" fill="#1e1610"/>
<path d="M126 96 Q122 106 128 107 Q133 106 131 97 Z" fill="#7aa848" stroke="#1e1610" stroke-width="1.6"/>
<path d="M114 108 Q129 120 144 108 Q129 114 114 108 Z" fill="#2a1410" stroke="#1e1610" stroke-width="1.4"/>
<path d="M118 109 L120 113 L122 110 Z M136 110 L138 113 L140 109 Z" fill="#fff"/>
<circle cx="111" cy="102" r="3" fill="#ff9a8a" opacity=".45"/><circle cx="147" cy="102" r="3" fill="#ff9a8a" opacity=".45"/>
</g>
<!-- Amboss -->
<path d="M48 150 L150 150 Q160 150 160 158 L150 164 L118 166 L124 190 L136 196 L136 204 L60 204 L60 196 L72 190 L78 166 L56 164 Q30 160 22 152 Q36 150 48 150 Z" fill="url(#kanv)" stroke="#14161a" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M50 152 L150 152" stroke="#b8bec8" stroke-width="2" opacity=".7"/>
<!-- glühendes Werkstück -->
<rect x="56" y="143" width="44" height="8" rx="3" fill="url(#khot)" class="khot"/>
<ellipse cx="78" cy="146" rx="30" ry="10" fill="#ffb060" opacity=".25" class="khot"/>
<!-- Arm mit Hammer (animiert) -->
<g class="karm">
<path d="M150 126 Q164 108 150 92" fill="none" stroke="#1e1610" stroke-width="12" stroke-linecap="round"/>
<path d="M150 126 Q164 108 150 92" fill="none" stroke="url(#kskin)" stroke-width="8" stroke-linecap="round"/>
<rect x="146" y="40" width="7" height="58" rx="3" fill="#7a5230" stroke="#1e1610" stroke-width="2" transform="rotate(55 150 92)"/>
<rect x="132" y="30" width="34" height="18" rx="3" fill="#6a707c" stroke="#14161a" stroke-width="2.5" transform="rotate(55 150 92)"/>
<rect x="134" y="32" width="30" height="5" rx="2" fill="#b8bec8" opacity=".6" transform="rotate(55 150 92)"/>
</g>
<!-- Funken -->
<g class="ksparks"><circle cx="80" cy="138" r="2.2" fill="#ffe08a"/><circle cx="92" cy="134" r="1.6" fill="#ffb347"/><circle cx="70" cy="132" r="1.8" fill="#fff2a8"/><circle cx="100" cy="128" r="1.4" fill="#ffd27a"/><circle cx="62" cy="128" r="1.4" fill="#ffb347"/></g>
</svg>`;
  const kHit = () => setTimeout(() => { const el = document.querySelector('.rl-kobold'); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } }, 30);
  const GAMBLER_SVG = `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="gbg" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#c9a6ff" stop-opacity=".35"/><stop offset="1" stop-color="#c9a6ff" stop-opacity="0"/></radialGradient>
<linearGradient id="gskin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6a6f2"/><stop offset="1" stop-color="#7a64c8"/></linearGradient>
<linearGradient id="gfelt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8a5a"/><stop offset="1" stop-color="#1c5a3a"/></linearGradient>
<linearGradient id="gcup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a3a1c"/><stop offset=".5" stop-color="#a8642e"/><stop offset="1" stop-color="#6a3a1c"/></linearGradient>
<linearGradient id="gvest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c43a4a"/><stop offset="1" stop-color="#7a1e2a"/></linearGradient>
</defs>
<ellipse cx="100" cy="120" rx="100" ry="100" fill="url(#gbg)" class="gglow"/>
<!-- Körper -->
<path d="M66 132 Q100 112 134 132 L140 186 Q100 198 60 186 Z" fill="#f2ead8" stroke="#1e1610" stroke-width="2.5"/>
<path d="M66 132 Q80 124 92 122 L96 190 Q76 190 60 186 Z M134 132 Q120 124 108 122 L104 190 Q124 190 140 186 Z" fill="url(#gvest)" stroke="#1e1610" stroke-width="2"/>
<circle cx="100" cy="148" r="2.4" fill="#ffd23f"/><circle cx="100" cy="162" r="2.4" fill="#ffd23f"/>
<path d="M92 124 L100 134 L108 124 L100 128 Z" fill="#1e1610"/>
<!-- linker Arm mit Münze -->
<path d="M68 138 Q48 150 44 166" fill="none" stroke="#1e1610" stroke-width="11" stroke-linecap="round"/>
<path d="M68 138 Q48 150 44 166" fill="none" stroke="url(#gskin)" stroke-width="7" stroke-linecap="round"/>
<g class="gcoin"><circle cx="42" cy="160" r="7" fill="#ffd23f" stroke="#a87a10" stroke-width="2"/><text x="42" y="164" font-size="9" text-anchor="middle" fill="#a87a10" font-weight="900">$</text></g>
<!-- Kopf -->
<path d="M76 92 L46 74 L70 104 Z" fill="url(#gskin)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M124 92 L156 72 L130 104 Z" fill="url(#gskin)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M74 90 L56 80 L72 100 Z M126 90 L146 78 L128 100 Z" fill="#e8a0c0"/>
<circle cx="100" cy="100" r="27" fill="url(#gskin)" stroke="#1e1610" stroke-width="2.5"/>
<!-- Zylinder -->
<g class="ghat"><rect x="78" y="42" width="44" height="34" rx="3" fill="#1e1a2a" stroke="#0a0810" stroke-width="2"/><rect x="78" y="64" width="44" height="7" fill="#c43a4a"/><rect x="68" y="72" width="64" height="8" rx="4" fill="#1e1a2a" stroke="#0a0810" stroke-width="2"/>
<path d="M114 64 l6 -9 l3 9 z" fill="#ffd23f"/></g>
<!-- Augen: eins mit Monokel -->
<ellipse cx="90" cy="98" rx="5" ry="5.5" fill="#fff6a0" stroke="#1e1610" stroke-width="1.6"/><circle cx="89" cy="99" r="2.4" fill="#1e1610"/>
<ellipse cx="111" cy="97" rx="6" ry="6.5" fill="#fff6a0" stroke="#1e1610" stroke-width="1.6"/><circle cx="110" cy="98" r="2.8" fill="#1e1610"/>
<circle cx="111" cy="97" r="9" fill="rgba(200,240,255,.25)" stroke="#ffd23f" stroke-width="2"/><path d="M119 102 Q124 116 118 128" fill="none" stroke="#ffd23f" stroke-width="1"/>
<path d="M84 90 L94 92 M106 88 L117 87" stroke="#1e1610" stroke-width="2" stroke-linecap="round"/>
<path d="M98 102 Q95 110 100 111 Q104 110 102 103 Z" fill="#9a88e0" stroke="#1e1610" stroke-width="1.5"/>
<!-- Grinsen mit Goldzahn -->
<path d="M84 114 Q100 128 118 112 Q100 120 84 114 Z" fill="#2a1410" stroke="#1e1610" stroke-width="1.4"/>
<path d="M90 116 l2 4 l2 -3 z M108 116 l2 3 l2 -4 z" fill="#fff"/><rect x="98" y="117" width="4" height="4" rx="1" fill="#ffd23f"/>
<!-- rechter Arm mit Würfelbecher -->
<g class="gcupgrp">
<path d="M132 138 Q154 128 156 108" fill="none" stroke="#1e1610" stroke-width="11" stroke-linecap="round"/>
<path d="M132 138 Q154 128 156 108" fill="none" stroke="url(#gskin)" stroke-width="7" stroke-linecap="round"/>
<path d="M144 84 L170 84 L166 112 L148 112 Z" fill="url(#gcup)" stroke="#1e1610" stroke-width="2.5" stroke-linejoin="round"/>
<rect x="142" y="80" width="30" height="6" rx="3" fill="#8a4e24" stroke="#1e1610" stroke-width="2"/>
<path d="M150 92 L164 92 M150 100 L163 100" stroke="#e0a83a" stroke-width="1.6"/>
</g>
<!-- Spieltisch -->
<ellipse cx="100" cy="206" rx="96" ry="22" fill="url(#gfelt)" stroke="#0e2a1c" stroke-width="3"/>
<ellipse cx="100" cy="204" rx="84" ry="16" fill="none" stroke="#e0c070" stroke-width="1.2" stroke-dasharray="4 3" opacity=".7"/>
<g><ellipse cx="48" cy="204" rx="9" ry="3.5" fill="#a87a10"/><rect x="39" y="196" width="18" height="8" fill="#ffd23f" stroke="#a87a10" stroke-width="1.4"/><ellipse cx="48" cy="196" rx="9" ry="3.5" fill="#ffe27a" stroke="#a87a10" stroke-width="1.4"/>
<ellipse cx="62" cy="208" rx="8" ry="3" fill="#a87a10"/><ellipse cx="62" cy="205" rx="8" ry="3" fill="#ffe27a" stroke="#a87a10" stroke-width="1.2"/></g>
<g transform="rotate(-12 140 202)"><rect x="128" y="192" width="18" height="24" rx="2" fill="#fff" stroke="#1e1610" stroke-width="1.4"/><text x="137" y="208" font-size="10" text-anchor="middle" fill="#c43a4a" font-weight="900">♥</text></g>
<!-- Würfel -->
<g class="gdie d1"><rect x="-8" y="-8" width="16" height="16" rx="3.5" fill="#fff" stroke="#1e1610" stroke-width="1.8"/><circle cx="-3.5" cy="-3.5" r="1.7" fill="#c43a4a"/><circle cx="3.5" cy="3.5" r="1.7" fill="#c43a4a"/><circle cx="0" cy="0" r="1.7" fill="#c43a4a"/></g>
<g class="gdie d2"><rect x="-8" y="-8" width="16" height="16" rx="3.5" fill="#fff" stroke="#1e1610" stroke-width="1.8"/><circle cx="-3.5" cy="-3.5" r="1.7" fill="#1e1610"/><circle cx="3.5" cy="-3.5" r="1.7" fill="#1e1610"/><circle cx="-3.5" cy="3.5" r="1.7" fill="#1e1610"/><circle cx="3.5" cy="3.5" r="1.7" fill="#1e1610"/></g>
<g class="gspark"><path d="M30 60 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#ffe27a"/><path d="M170 150 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#c9a6ff"/></g>
</svg>`;
  function runenWrap() {
    if (!feature(S, 'runen')) return runenTab();
    return `<div class="rl-subtabs"><button data-runeview="ausr" class="${runeView === 'ausr' ? 'on' : ''}">🛡️ Ausrüstung</button><button data-runeview="schmied" class="${runeView === 'schmied' ? 'on' : ''}">⚒️ Schmied</button><button data-runeview="wandler" class="${runeView === 'wandler' ? 'on' : ''}">🎲 Wandler</button></div>`
      + (runeView === 'schmied' ? forgeView() : runeView === 'wandler' ? wandlerView() : runenTab());
  }
  // Runenschmied: Stapel als Kacheln, sortierbar nach Art oder Stufe, mit Kobold am Amboss
  function forgeGroups() {
    const used = socketed(S), groups = {};
    for (const r of S.runes) { const k = r.t + ':' + r.tier; (groups[k] = groups[k] || { key: k, t: r.t, tier: r.tier, n: 0, free: 0 }).n++; if (!used.has(r.id)) groups[k].free++; }
    const ti = t => RUNES.findIndex(x => x.id === t);
    return Object.values(groups).sort(forgeSort === 'art' ? (a, b) => ti(a.t) - ti(b.t) || b.tier - a.tier : (a, b) => b.tier - a.tier || ti(a.t) - ti(b.t));
  }
  function forgeFiltered(all) { return forgeFilt === 'all' ? all : all.filter(g => (forgeSort === 'art' ? g.t === forgeFilt : String(g.tier) === forgeFilt)); }
  // Runenwandler beim Glücksspiel-Kobold
  function wandlerView() {
    const all = forgeGroups().filter(g => g.free > 0), list = forgeFiltered(all);
    const chips = forgeSort === 'art' ? [...new Set(all.map(g => g.t))].map(t => [t, RUNE[t].name, RUNE[t].color]) : [...new Set(all.map(g => g.tier))].sort((a, b) => a - b).map(n => [String(n), 'Stufe ' + ROMAN[n], '#c9a6ff']);
    wSel = wSel.filter(id => S.runes.some(r => r.id === id) && !socketed(S).has(id));
    const sel = wSel.map(id => S.runes.find(r => r.id === id));
    const inUse = k => wSel.filter(id => { const r = S.runes.find(x => x.id === id); return r && r.t + ':' + r.tier === k; }).length;
    const ok = sel.length === 2 && sel[0].tier === sel[1].tier;
    const slot = (r, i) => r ? `<button class="rl-wslot full" data-wrm="${i}" style="--rc:${RUNE[r.t].color}"><b>${ROMAN[r.tier]}</b><small>${RUNE[r.t].name}</small><span class="x">✕</span></button>` : '<div class="rl-wslot"><span>?</span></div>';
    let html = `<div class="rl-forge2"><div class="rl-fmain">
      <p class="note">Leg <b>2 Runen derselben Stufe</b> in den Kessel. Heraus kommt <b>1 zufällige Rune derselben Stufe</b>, aber nie eine der beiden Arten, die du hineingelegt hast. Eingesetzte Runen können nicht gewandelt werden.</p>
      <div class="rl-wmach">${slot(sel[0], 0)}<span class="plus">+</span>${slot(sel[1], 1)}<span class="plus">→</span>
        <div class="rl-wslot res ${wRes ? 'reveal' : ''}" ${wRes ? `style="--rc:${RUNE[wRes.t].color}"` : ''}>${wRes ? `<span class="roll">🎲</span><b>${ROMAN[wRes.tier]}</b><small>${RUNE[wRes.t].name}</small>` : '<span>🎲</span>'}</div></div>
      <div class="row" style="justify-content:center;margin:8px 0"><button class="btn" data-rl="wroll" ${ok && inCamp() ? '' : 'disabled'}>🎲 Würfeln!</button></div>
      ${sel.length === 2 && !ok ? '<p class="warn">Beide Runen müssen dieselbe Stufe haben.</p>' : ''}
      <div class="rl-fbar"><span class="note">Sortieren:</span><button data-fsort="art" class="${forgeSort === 'art' ? 'on' : ''}">nach Art</button><button data-fsort="stufe" class="${forgeSort === 'stufe' ? 'on' : ''}">nach Stufe</button></div>
      <div class="rl-fbar chips"><button data-ffilt="all" class="${forgeFilt === 'all' ? 'on' : ''}">Alle</button>${chips.map(([v, nm, c]) => `<button data-ffilt="${v}" class="${forgeFilt === v ? 'on' : ''}" style="--rc:${c}">${esc(nm)}</button>`).join('')}</div>
      <div class="rl-fgrid">${list.map(g => { const R = RUNE[g.t], left = g.free - inUse(g.key); return `<button class="rl-ftile ${left ? '' : 'used'}" data-wsel="${g.key}" style="--rc:${R.color}" ${left ? '' : 'disabled'}><b>${ROMAN[g.tier]}</b><small>${R.name}</small><span class="cnt">×${left}</span></button>`; }).join('') || '<p class="note">Keine freien Runen.</p>'}</div>
      </div><div class="rl-kobold gamble ${wRes ? 'hit' : ''}" aria-hidden="true">${GAMBLER_SVG}<p class="note" style="text-align:center;margin:4px 0 0">„Zwei rein, eine raus! Das Glück ist mit den Mutigen …“</p></div></div>`;
    return html;
  }
  function forgeView() {
    const all = forgeGroups(), list = forgeFiltered(all), ln = S.rlager || 0, lc = lagerCost(ln), canForge = feature(S, 'schmiede'), used = socketed(S);
    const chips = forgeSort === 'art' ? [...new Set(all.map(g => g.t))].map(t => [t, RUNE[t].name, RUNE[t].color]) : [...new Set(all.map(g => g.tier))].sort((a, b) => a - b).map(n => [String(n), 'Stufe ' + ROMAN[n], '#c9a6ff']);
    fSlots = fSlots.filter(id => S.runes.some(r => r.id === id) && !used.has(id));
    const sel = fSlots.map(id => S.runes.find(r => r.id === id)), g0 = sel[0];
    const inUse = k => sel.filter(r => r.t + ':' + r.tier === k).length;
    const mc = g0 ? mergeCost(g0.tier) : 0, canM = canForge && sel.length === 3 && g0.tier < 10 && S.dust >= mc;
    const killN = list.reduce((a, g) => a + g.free, 0), killS = list.reduce((a, g) => a + g.free * shardOf(g.tier), 0);
    const slot = (r, i) => r ? `<button class="rl-wslot full" data-frm="${i}" style="--rc:${RUNE[r.t].color}"><b>${ROMAN[r.tier]}</b><small>${RUNE[r.t].name}</small><span class="x">✕</span></button>` : '<div class="rl-wslot"><span>?</span></div>';
    let html = `<div class="rl-forge2"><div class="rl-fmain">
      <div class="rl-wallet"><span class="rl-cur dust">${dust}${S.dust} Runensplitter</span><span class="note">Lager ${S.runes.length}/${runeCap(S)}</span>
        <button class="btn small" data-rl="lager" ${ln < LAGER_MAX && S.dust >= lc && inCamp() ? '' : 'disabled'}>${ln >= LAGER_MAX ? 'Lager voll ausgebaut' : `Lager +5 (${dust}${lc})`}</button>
        ${canForge ? `<button class="btn ghost small" data-rl="buyrune" ${S.dust >= DUST_RUNE && S.runes.length < runeCap(S) ? '' : 'disabled'}>Zufällige Rune (${dust}${DUST_RUNE})</button>` : ''}</div>
      <p class="note">Tippe eine Rune an, um sie auf den Amboss zu legen (bis zu 3 gleiche). ${canForge ? '<b>3 gleiche</b> schmiedest du zu einer Rune der nächsten Stufe.' : 'Schmieden geht ab der 4. Wiedergeburt.'} Alles auf dem Amboss kannst du auch zerstören.</p>
      <div class="rl-wmach">${slot(sel[0], 0)}<span class="plus">+</span>${slot(sel[1], 1)}<span class="plus">+</span>${slot(sel[2], 2)}<span class="plus">→</span>
        <div class="rl-wslot res ${fRes ? 'reveal' : ''}" ${fRes ? `style="--rc:${RUNE[fRes.t].color}"` : ''}>${fRes ? `<span class="roll">⚒️</span><b>${ROMAN[fRes.tier]}</b><small>${RUNE[fRes.t].name}</small>` : (g0 && canForge && g0.tier < 10 ? `<b style="opacity:.35">${ROMAN[g0.tier + 1]}</b><small style="opacity:.5">${RUNE[g0.t].name}</small>` : '<span>⚒️</span>')}</div></div>
      <div class="row" style="justify-content:center;margin:8px 0;flex-wrap:wrap">${canForge ? `<button class="btn" data-rl="fup" ${canM && inCamp() ? '' : 'disabled'}>⚒️ Schmieden${g0 ? ` (${dust}${mc})` : ''}</button>` : ''}
        <button class="btn ghost" data-rl="fdel" ${sel.length && inCamp() ? '' : 'disabled'}>💥 Zerstören${sel.length ? ` (+${dust}${sel.reduce((a, r) => a + shardOf(r.tier), 0)})` : ''}</button></div>
      <div class="rl-fbar"><span class="note">Sortieren:</span><button data-fsort="art" class="${forgeSort === 'art' ? 'on' : ''}">nach Art</button><button data-fsort="stufe" class="${forgeSort === 'stufe' ? 'on' : ''}">nach Stufe</button></div>
      <div class="rl-fbar chips"><button data-ffilt="all" class="${forgeFilt === 'all' ? 'on' : ''}">Alle</button>${chips.map(([v, nm, c]) => `<button data-ffilt="${v}" class="${forgeFilt === v ? 'on' : ''}" style="--rc:${c}">${esc(nm)}</button>`).join('')}</div>
      <div class="rl-fgrid">${list.map(g => { const R = RUNE[g.t], left = g.free - inUse(g.key); return `<button class="rl-ftile ${left ? '' : 'used'}" data-fpick="${g.key}" style="--rc:${R.color}" ${left ? '' : 'disabled'}><b>${ROMAN[g.tier]}</b><small>${R.name}</small><span class="cnt">×${left}</span>${g.n - g.free ? `<span class="lock" title="eingesetzt">⚑${g.n - g.free}</span>` : ''}</button>`; }).join('') || '<p class="note">Keine Runen. Bosse lassen Runen fallen.</p>'}</div>`;
    const lab = confirm === 'fall2' ? `Wirklich ${killN} Runen zerstören?` : confirm === 'fall' ? 'Sicher? Nochmal tippen' : `Alle ${forgeFilt === 'all' ? '' : 'gefilterten '}freien zerstören (${killN} Runen, +${killS} Splitter)`;
    html += `<div class="row" style="margin-top:10px"><button class="btn small ${confirm ? 'danger' : 'ghost'}" data-rl="fall" ${killN && inCamp() ? '' : 'disabled'}>💥 ${lab}</button></div>
      <p class="note">Eingesetzte Runen (⚑) werden nie zerstört. Schmieden kostet so viel, wie 3 zerstörte Runen dieser Stufe geben.</p></div>
      <div class="rl-kobold ${fRes ? 'hit' : ''}" aria-hidden="true">${KOBOLD_SVG}</div></div>`;
    return html;
  }

  /* ---------- Wiedergeburt ---------- */
  function ruhmTab() {
    const gain = starsFor(S), req = reqOf(S);
    const tRb = acct && acct.tester ? `<div class="rl-test"><b>🧪 Test</b> <button class="btn small" data-rl="trebirth" ${inCamp() ? '' : 'disabled'}>Sofort wiedergeboren werden</button> <button class="btn small ${confirm === 'unrb' ? 'danger' : 'ghost'}" data-rl="tunrb" ${inCamp() && S.rebirths > 0 ? '' : 'disabled'}>${confirm === 'unrb' ? 'Wirklich eine zurück?' : '↩ Eine Wiedergeburt zurück'}</button><span class="note">Sofort: ohne Voraussetzung. Sterne gibt es für deinen Rekord, mindestens aber so viele wie beim Erreichen der Voraussetzung. Zurück: Sternen-Laden wird zurückgesetzt, die Sterne dieser Wiedergeburt gehen verloren, Freischaltungen dieser Stufe auch.</span></div>` : '';
    if (S.rebirths >= 9) return tRb + ascSection(true) + shopHint('Sternen-Laden');
    let html = `<div class="rl-rebirth"><div><h3>Wiedergeburt ${S.rebirths + 1}</h3>
      <p class="note">Setzt Gold, Seelen, alle Fertigkeiten und deinen Rekord auf null. Dafür bekommst du Sterne für dauerhafte Verbesserungen, neue Stufen und neue Inhalte. Runen und Sterne bleiben.</p>
      <p>Voraussetzung: <b>Stufe ${req}</b> · dein Rekord: <b>${S.best}</b> → ${gain ? `<b class="rl-cur star">${star}${gain} Sterne</b>` : 'noch nicht erreicht'}</p></div>
      <button class="btn ${confirm === 'rebirth' ? 'danger' : ''}" data-rl="rebirth" ${gain && inCamp() ? '' : 'disabled'}>${confirm === 'rebirth' ? 'Wirklich zurücksetzen?' : 'Wiedergeboren werden'}</button></div>`;
    html += tRb;
    html += `<div class="rl-road">${ROADMAP.map(x => `<div class="rl-step ${S.rebirths >= x.r ? 'done' : S.rebirths + 1 === x.r ? 'next' : ''}"><span>${x.r}</span><div><b>${x.text}</b><small>Stufen bis ${CAPS[Math.min(x.r, CAPS.length - 1)]} · +1 Schlüsselsockel</small></div></div>`).join('')}</div>`;
    html += ascSection();
    html += shopHint('Sternen-Laden');
    return html;
  }
  const shopHint = name => `<div class="rl-gohint"><span>Den <b>${name}</b> findest du jetzt im Reiter Läden.</span><button class="btn small rl-gotree" data-tab="laeden">Zu den Läden</button></div>`;
  function starShop() { return `<h3 class="rl-h3">Sternen-Laden</h3><p class="note">Du hast <span class="rl-cur star">${star}${S.stars}</span> Sterne.</p><div class="rl-perks">${perkCards()}`; }
  function perkCards() {
    return PERKS.map(p => {
      const r = perk(S, p.id), maxed = r >= p.max, c = perkCost(S, p);
      return `<div class="rl-perk ${r ? 'has' : ''}"><b>${esc(p.name)}</b><span class="note">${p.max > 99 ? `Stufe ${r}` : `${r} / ${p.max}`}</span><p class="note">${esc(p.desc)}</p>
        <div class="row"><button class="btn small" data-perk="${p.id}" ${maxed || S.stars < c ? 'disabled' : ''}>${maxed ? 'Voll' : `${c} ${c === 1 ? 'Stern' : 'Sterne'}`}</button>${acct && acct.tester ? `<button class="btn ghost small" data-tmenu="p:${p.id}">🧪</button>` : ''}</div></div>`;
    }).join('') + '</div>';
  }
  function panel() {
    const p = $('#rlPanel');
    let html = notice ? `<p class="warn">${esc(notice)}</p>` : '';
    if (HERO[tab]) html += campInfo() + heroTab(tab);
    else if (tab === 'runen') html += campInfo() + runenWrap();
    else if (tab === 'begleiter') html += campInfo() + compTab();
    else if (tab === 'halle') html += halleTab();
    else if (tab === 'zeit' || tab === 'laeden') html += ladenTab();
    else if (tab === 'exp') html += campInfo() + expTab();
    else if (tab === 'ahnen') html += campInfo() + ahnTab();
    else if (tab === 'ruhm') html += ruhmTab();
    else html += standHTML();
    const openDet = p.querySelector('details[open]');
    p.innerHTML = html;
    if (openDet && p.querySelector('details')) p.querySelector('details').open = true;
  }
  function standHTML() {
    const code = encode(S);
    if (durableInfo === null) { durableInfo = 'pending'; api('status', {}).then(r => { durableInfo = r.error && r.durable === undefined ? 'pending' : r.durable; if (tab === 'stand' && !typing()) panel(); }); }
    let html = `<div class="rl-save">${durableInfo === false ? '<p class="warn">Der Server ist noch nicht für dauerhaftes Speichern eingerichtet. Spielstände gehen verloren, wenn er neu startet. Wer die Seite betreibt, findet die Anleitung in der README.</p>' : ''}`;
    if (acct) {
      html += `<h3>Angemeldet als ${esc(acct.name)}</h3>
        <p class="note">Dein Fortschritt wird automatisch gespeichert. Auf einem anderen Gerät meldest du dich einfach mit Name und Passwort an.</p>
        <p class="note">${esc(cloudMsg || (acct.updated ? `Zuletzt gespeichert um ${timeStr(acct.updated)}` : ''))}</p>
        <div class="row"><button class="btn small" data-rl="cloudsave">Jetzt speichern</button><button class="btn ghost small" data-rl="logout">Abmelden</button></div>
        <h3>Passwort ändern</h3>
        <form class="rl-form" id="rlPwForm"><input id="rlNewPw" type="password" placeholder="Neues Passwort" autocomplete="new-password"><button class="btn small">Ändern</button></form>`;
      if (acct.tester) html += `<div class="rl-test"><h3>🧪 Test-Werkzeuge</h3><p class="note">Nur für Test-Spielstände sichtbar. Zahlen auch wie 1e9 oder 5000000.</p>
        <div class="numrow"><input id="rlTGold" inputmode="decimal" placeholder="Gold, z. B. 1e9" autocomplete="off"><button class="btn small" data-rl="tgold">Gold setzen</button></div>
        <div class="numrow"><input id="rlTSouls" inputmode="decimal" placeholder="Seelen, z. B. 500" autocomplete="off"><button class="btn small" data-rl="tsouls">Seelen setzen</button></div>
        <div class="row"><button class="btn small" data-rl="trunepick">Rune auswählen …</button><button class="btn ghost small" data-rl="trunes">3 zufällige Runen ins Lager</button></div></div>`;
    } else {
      html += `<h3>Spielstand speichern</h3>
        <p class="note">Wähle einen Namen und ein Passwort. Damit lädst du deine Helden auf jedem Gerät, und sie werden ab dann automatisch gespeichert.</p>
        <form class="rl-form" id="rlCreate"><input id="rlCName" placeholder="Name, z. B. Ritter Kunibert" maxlength="20" autocomplete="username">
          <input id="rlCPw" type="password" placeholder="Passwort (mind. 4 Zeichen)" autocomplete="new-password">
          <input id="rlCPw2" type="password" placeholder="Passwort wiederholen" autocomplete="new-password"><button class="btn">Spielstand anlegen</button></form>
        <h3>Spielstand laden</h3>
        <p class="note">Achtung: Der Fortschritt auf diesem Gerät wird durch den geladenen Spielstand ersetzt.</p>
        <form class="rl-form" id="rlLogin"><input id="rlLName" placeholder="Name" maxlength="20" autocomplete="username">
          <input id="rlLPw" type="password" placeholder="Passwort" autocomplete="current-password"><button class="btn">Laden</button></form>`;
    }
    html += `<details class="rl-details"><summary>Notfall-Code (ohne Konto)</summary>
        <p class="note">Dieser Code enthält deinen kompletten Spielstand. Er funktioniert auch ohne Server-Speicher.</p>
        <div class="rl-code" id="rlCode">${code}</div><button class="btn small" data-rl="copy">Kopieren</button>
        <div class="numrow"><input id="rlIn" placeholder="XXXX-XXXX-…" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn" data-rl="load">Code laden</button></div></details>
      <h3>Neu anfangen</h3><button class="btn ${confirm === 'reset' ? 'danger' : 'ghost'} small" data-rl="reset">${confirm === 'reset' ? 'Wirklich alles löschen? Tippen zum Bestätigen' : 'Spielstand komplett löschen'}</button></div>`;
    return html;
  }
  function adopt(data) {
    S = migrate(data); delete S.reset; run = null;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    refresh();
  }
  function toast(m, big) { const t = $('#toast'); t.textContent = m; t.className = 'toast' + (big ? ' gold' : ''); t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), big ? 3600 : 3200); }
  function ask(key, redraw) { if (confirm === key) { confirm = ''; return true; } confirm = key; redraw(); setTimeout(() => { if (confirm === key) { confirm = ''; redraw(); } }, 4000); return false; }
  function afterChange() { save(); refresh(); }
  function onClick(e) {
    if (ahnClick(e)) return;
    const g = e.target.closest('[data-node]');
    if (g) { sel[tab] = g.dataset.node; panel(); return; }
    const tm = e.target.closest('[data-tmenu]');
    if (tm) { if (acct && acct.tester) testMenu(tm.dataset.tmenu); return; }
    const rf = e.target.closest('[data-rforge]');
    if (rf) {
      const [op, t, tierS] = rf.dataset.rforge.split(':'), tier = Number(tierS), used = socketed(S);
      if (op === 'd') { const r = S.runes.find(x => x.t === t && x.tier === tier && !used.has(x.id)); if (r) { const d = dismantle(S, r); SND.play('crit'); toast(`${RUNE[t].name} ${ROMAN[tier]} zerstört: +${d} Runensplitter`); afterChange(); } }
      else { const r = S.runes.find(x => x.t === t && x.tier === tier); const nr = r && merge(S, r); if (nr) { SND.play('forge'); toast(`${RUNE[nr.t].name} ${ROMAN[nr.tier]} geschmiedet!`, true); achCheck(); afterChange(); } }
      return;
    }
    const lu = e.target.closest('[data-lineup]');
    if (lu) {
      if (!inCamp()) { toast('Die Aufstellung änderst du im Lager.'); return; }
      const r = toggleField(S, lu.dataset.lineup);
      if (r === 'full') toast('Alle Plätze sind belegt. Nimm zuerst jemanden raus.');
      else if (r === 'last') toast('Mindestens ein Held muss kämpfen.');
      afterChange(); return;
    }
    const tb = e.target.closest('.rl-hero[data-tab], .rl-gotree[data-tab]');
    if (tb) { tab = tb.dataset.tab; confirm = ''; wRes = null; fRes = null; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const sk = e.target.closest('[data-sock]');
    if (sk) {
      const [hid, i] = sk.dataset.sock.split(':'); const slot = Number(i);
      if (runeSel) { socket(S, hid, slot, runeSel); runeSel = null; afterChange(); }
      else if (S.sockets[hid][slot]) { unsocket(S, hid, slot); afterChange(); toast('Rune herausgenommen'); }
      return;
    }
    const rb = e.target.closest('[data-rune]');
    if (rb) { const id = Number(rb.dataset.rune); runeSel = runeSel === id ? null : id; panel(); return; }
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.cperk) { if (buyCperk(S, CPERKS.find(p => p.id === b.dataset.cperk))) afterChange(); return; }
    if (b.dataset.complvl) { if (levelComp(S, b.dataset.complvl)) { achCheck(); afterChange(); } return; }
    if (b.dataset.compon) { toggleComp(S, b.dataset.compon); afterChange(); return; }
    if (b.dataset.board) { boardKey = b.dataset.board; panel(); return; }
    if (b.dataset.shoptab) { shopSel = b.dataset.shoptab; try { localStorage.setItem('fsg.ritter.shop', shopSel); } catch {} SND.play('tick'); panel(); return; }
    if (b.dataset.runeview) { wRes = null; fRes = null; fSlots = []; runeView = b.dataset.runeview; confirm = ''; SND.play('tick'); panel(); return; }
    if (b.dataset.fsort) { fRes = null; wRes = null; forgeSort = b.dataset.fsort; forgeFilt = 'all'; confirm = ''; panel(); return; }
    if (b.dataset.ffilt) { fRes = null; wRes = null; forgeFilt = b.dataset.ffilt; confirm = ''; panel(); return; }
    if (b.dataset.wsel) { const [t, tier] = b.dataset.wsel.split(':'), used = socketed(S); const r = S.runes.find(x => x.t === t && x.tier === Number(tier) && !used.has(x.id) && !wSel.includes(x.id)); if (r) { wRes = null; if (wSel.length >= 2) wSel = []; if (wSel.length === 1) { const a = S.runes.find(x => x.id === wSel[0]); if (!a || a.tier !== r.tier) wSel = []; } wSel.push(r.id); SND.play('tick'); } panel(); return; }
    if (b.dataset.wrm) { wSel.splice(Number(b.dataset.wrm), 1); wRes = null; panel(); return; }
    if (b.dataset.fpick) { const [t, tier] = b.dataset.fpick.split(':'), used = socketed(S); fRes = null;
      const cur = fSlots.map(id => S.runes.find(r => r.id === id)).filter(Boolean); if (cur.length && (cur[0].t !== t || cur[0].tier !== Number(tier))) fSlots = [];
      const free = S.runes.filter(x => x.t === t && x.tier === Number(tier) && !used.has(x.id) && !fSlots.includes(x.id));
      if (!fSlots.length) fSlots = free.slice(0, 3).map(r => r.id); else if (fSlots.length < 3 && free.length) fSlots.push(free[0].id);
      SND.play('tick'); panel(); return; }
    if (b.dataset.frm) { fSlots.splice(Number(b.dataset.frm), 1); fRes = null; panel(); return; }
    if (b.dataset.fsel) { forgeSel = forgeSel === b.dataset.fsel ? null : b.dataset.fsel; confirm = ''; SND.play('tick'); panel(); return; }
    if (b.dataset.shopjump) { const el = document.getElementById('shop-' + b.dataset.shopjump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (b.dataset.target) { S.exp.target = b.dataset.target; save(); panel(); return; }
    if (b.dataset.piece) { const [hid, i] = b.dataset.piece.split(':'); if (buyPiece(S, hid, Number(i))) { const h = HERO_BY_ID[hid]; if (assembled(S, hid)) heroDone(hid); else toast(`Puzzleteil ${pieceCount(S, hid)}/6 für ${h.name}`); afterChange(); } return; }
    if (b.dataset.tempo) { if (buyTempo(S)) { toast(`Tempo ×${String(maxSpeed(S)).replace('.', ',')} freigeschaltet!`, true); afterChange(); } return; }
    if (b.dataset.pathmode) { pathMode = b.dataset.pathmode; panel(); return; }
    if (b.dataset.perk) { if (buyPerk(S, PERKS.find(p => p.id === b.dataset.perk))) afterChange(); return; }
    const a = b.dataset.rl;
    if (a && ahnAction(a, b)) return;
    if (a === 'start') startRun();
    else if (a === 'weekly') startRun('weekly');
    else if (a === 'mission') { S.exp.mission = b.dataset.m2; startRun('exp'); $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (a === 'gosave') { tab = 'stand'; renderTabs(); panel(); }
    else if (a === 'ascend') { if (ask('ascend', panel)) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); ascend(S); run = null; achCheck(); afterChange(); SND.play('rebirth'); playCine('asc', team); } }
    else if (a === 'tower') startRun('tower');
    else if (a === 'area') showAreas();
    else if (a === 'giveup') { if (ask('giveup', action)) { run.dead = true; S.runs++; save(); cloudSave(true); refresh(); } }
    else if (a === 'tgold' || a === 'tsouls') { if (acct && acct.tester) { const el = $(a === 'tgold' ? '#rlTGold' : '#rlTSouls'); let t = String(el.value).replace(/\s/g, '');
        if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
        const v = Number(t);
        if (!(v >= 0) || !isFinite(v)) { toast('Bitte eine Zahl eingeben.'); return; }
        if (a === 'tgold') S.gold = Math.min(1e18, Math.floor(v)); else S.souls = Math.min(1e15, Math.floor(v));
        toast(a === 'tgold' ? `Gold: ${fmt(S.gold)}` : `Seelen: ${fmt(S.souls)}`); afterChange(); } }
    else if (a === 'trunepick') { if (acct && acct.tester) testRunePicker(); }
    else if (a === 'trunes') { if (acct && acct.tester) { const got = []; for (let i = 0; i < 3; i++) { const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, 1 + Math.floor(Math.random() * 3)); if (r) got.push(`${RUNE[r.t].name} ${ROMAN[r.tier]}`); }
        SND.play('rune'); toast(got.length ? `Neue Runen: ${got.join(', ')}` : 'Lager voll, als Splitter gutgeschrieben.'); afterChange(); } }
    else if (a === 'pres') { if (inCamp() && ask('pres', panel)) { const n = resetPerks(S); SND.play('buy'); toast(`Sternen-Laden zurückgesetzt: +${n} Sterne`, true); afterChange(); } }
    else if (a === 'wroll') { if (inCamp() && wSel.length === 2) { const nr = transmute(S, wSel[0], wSel[1]); if (nr) { wSel = []; wRes = nr; SND.play('soul'); setTimeout(() => SND.play('rune'), 900); setTimeout(() => toast(`Gewürfelt: ${RUNE[nr.t].name} ${ROMAN[nr.tier]}!`, true), 950); afterChange(); } } }
    else if (a === 'fup') { const r = fSlots.length === 3 && S.runes.find(x => x.id === fSlots[0]); const nr = r && merge(S, r); if (nr) { fSlots = []; fRes = nr; SND.play('forge'); kHit(); setTimeout(() => toast(`${RUNE[nr.t].name} ${ROMAN[nr.tier]} geschmiedet!`, true), 700); achCheck(); afterChange(); } }
    else if (a === 'fdel') { if (!inCamp()) return; const used = socketed(S); let d = 0, n = 0; for (const id of fSlots) { const r = S.runes.find(x => x.id === id); if (r && !used.has(r.id)) { d += dismantle(S, r); n++; } } fSlots = []; fRes = null; if (n) { SND.play('crit'); kHit(); toast(`${n} Rune${n > 1 ? 'n' : ''} zerstört: +${d} Runensplitter`); afterChange(); } }
    else if (a === 'fall') { if (!inCamp()) return;
      if (confirm === 'fall2') { confirm = ''; const used = socketed(S), keys = new Set(forgeFiltered(forgeGroups()).map(g => g.key)); let n = 0, d = 0;
        for (const r of [...S.runes]) if (keys.has(r.t + ':' + r.tier) && !used.has(r.id)) { d += dismantle(S, r); n++; }
        forgeSel = null; SND.play('forge'); kHit(); toast(`${n} Runen zerstört: +${d} Runensplitter`, true); afterChange(); }
      else { confirm = confirm === 'fall' ? 'fall2' : 'fall'; panel(); const c0 = confirm; setTimeout(() => { if (confirm === c0) { confirm = ''; panel(); } }, 5000); } }
    else if (a === 'tunrb') { if (acct && acct.tester && inCamp() && ask('unrb', panel)) { const r = unrebirth(S); if (r) { run = null; SND.play('tick'); toast(`Zurück auf Wiedergeburt ${S.rebirths}: −${r.lost} Sterne, Sternen-Laden zurückgesetzt (+${r.back})`, true); afterChange(); } } }
    else if (a === 'tbuild') { if (acct && acct.tester && inCamp() && HERO[tab] && classOpen(S, tab) && ask('tbuild', panel)) { testBuild(tab); achCheck(); afterChange(); SND.play('forge'); toast(`${HERO[tab].name}: Baum ausgebaut`, true); } }
    else if (a === 'trebirth') { if (acct && acct.tester && inCamp()) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); const g = rebirth(S, true); run = null; achCheck(); afterChange(); SND.play('rebirth'); toast(`Test-Wiedergeburt: +${g} Sterne`, true); playCine('rebirth', team); } }
    else if (a === 'lager') { if (inCamp() && buyLager(S)) { SND.play('forge'); toast(`Runen-Lager erweitert: jetzt ${runeCap(S)} Plätze`); afterChange(); } }
    else if (a === 'altar') { if (inCamp() && buyAltar(S)) { SND.play('soul'); toast(`Seelenaltar Stufe ${S.altar}: Seelen ×${altarMul(S).toFixed(2).replace('.', ',')}`, true); afterChange(); } }
    else if (a === 'sockadd') { if (inCamp() && addSock(S, tab)) { toast('Sockel gesetzt.'); afterChange(); } }
    else if (a === 'sockdel') { if (inCamp()) { const r = removeSock(S, tab); if (r === 'used') toast('Alle Sockel sind belegt. Nimm zuerst eine Schlüssel-Fertigkeit ab.'); else if (r === 'ok') { toast('Sockel abgenommen. Du kannst ihn jetzt woanders setzen.'); afterChange(); } } }
    else if (a === 'unkey') { if (inCamp() && ask('unkey', panel)) { const n = NODE[sel[tab]], c = removeKey(S, n); if (c) { toast(`${n.name} abgenommen. Gold und Seelen sind zurück.`); afterChange(); } } }
    else if (a === 'buy') { if (inCamp() && buy(S, NODE[sel[tab]])) { SND.play('buy'); achCheck(); afterChange(); } }
    else if (a === 'equip') { if (inCamp()) { toggleEquip(S, sel[tab]); afterChange(); } }
    else if (a === 'rebirth') { if (ask('rebirth', panel)) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); rebirth(S); run = null; achCheck(); afterChange(); SND.play('rebirth'); playCine('rebirth', team); } }
    else if (a === 'merge') { const r = S.runes.find(x => x.id === runeSel); const nr = r && merge(S, r); if (nr) { runeSel = nr.id; toast(`${RUNE[nr.t].name} ${ROMAN[nr.tier]} geschmiedet`); afterChange(); } }
    else if (a === 'dismantle') { const r = S.runes.find(x => x.id === runeSel); if (r) { const d = dismantle(S, r); runeSel = null; toast(`+${d} Runensplitter`); afterChange(); } }
    else if (a === 'buyrune') { const r = buyRune(S); if (r) { runeSel = r.id; toast(`Neue Rune: ${RUNE[r.t].name} I`); afterChange(); } }
    else if (a === 'cloudsave') { cloudMsg = 'Wird gespeichert …'; panel(); cloudSave(true); }
    else if (a === 'logout') { cloudSave(true).then(() => { conflict = null; setAcct(null); cloudMsg = ''; panel(); toast('Abgemeldet. Dein Spielstand bleibt auf dem Server.'); }); }
    else if (a === 'copy') {
      const code = $('#rlCode').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('Code kopiert'), () => {
        const r = document.createRange(); r.selectNodeContents($('#rlCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Code markiert – jetzt kopieren');
      });
    } else if (a === 'load') {
      const s = decode($('#rlIn').value);
      if (!s) { toast('Dieser Code stimmt nicht. Prüfe jedes Zeichen.'); return; }
      s.speed = Math.min(S.speed, maxSpeed(s)); adopt(s); save(); toast('Spielstand geladen');
    } else if (a === 'reset') { if (ask('reset', panel)) { adopt(fresh()); save(); toast('Neuer Spielstand'); } }
  }
  async function onSubmit(e) {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button');
    const val = id => ($(id).value || '').trim();
    btn.disabled = true;
    try {
      if (f.id === 'rlCreate') {
        if ($('#rlCPw').value !== $('#rlCPw2').value) { toast('Die Passwörter sind unterschiedlich.'); return; }
        const r = await api('create', { name: val('#rlCName'), pass: $('#rlCPw').value, data: S });
        if (r.error) { toast(r.error); return; }
        setAcct({ name: r.name, token: r.token, updated: r.updated, tester: !!r.tester }); cloudMsg = `Gespeichert um ${timeStr(r.updated)}`; cloudDirty = false;
        toast(`Spielstand „${r.name}“ angelegt`); panel();
      } else if (f.id === 'rlLogin') {
        const r = await api('login', { name: val('#rlLName'), pass: $('#rlLPw').value });
        if (r.error) { toast(r.error); return; }
        setAcct({ name: r.name, token: r.token, updated: r.updated, tester: !!r.tester });
        const old = !r.data || !r.data.v || r.data.v < 2;
        adopt(r.data || {}); cloudDirty = true;
        cloudMsg = `Geladen – zuletzt gespeichert um ${timeStr(r.updated)}`;
        toast(old ? 'Angemeldet. Dein Spielstand stammte aus der allerersten Version und wurde zurückgesetzt.' : `Willkommen zurück, ${r.name}!`); panel();
      } else if (f.id === 'rlPwForm') {
        const r = await api('password', { name: acct.name, token: acct.token, pass: $('#rlNewPw').value });
        if (r.error) { toast(r.error); return; }
        acct.token = r.token; setAcct(acct); toast('Passwort geändert'); panel();
      }
    } finally { btn.disabled = false; }
  }

  /* ---------- Aufstieg ---------- */
  function ascSection(main) {
    const k = crownsFor(S), can = S.rebirths >= ASC_REQ_REBIRTHS;
    let html = `<div class="rl-asc"><div><h3>${S.asc ? `Aufstieg ${S.asc + 1}` : 'Aufstieg'}</h3>
      <p class="note">Die zweite Prestige-Ebene. Setzt auch Wiedergeburten, Sterne und den Sternen-Laden zurück – dafür bekommst du Kronen für mächtige Königs-Boni. Runen, Turm-Rekord, Erfolge und Begleiter bleiben. Gegner werden mit jedem Aufstieg stärker.</p>
      <p>Voraussetzung: <b>9. Wiedergeburt</b> und <b>Stufe ${ASC_REQ_STAGE}</b> · ${k ? `jetzt: <b class="rl-cur crown">${crown}${k} Kronen</b> (je 4 Stufen über 150 eine mehr)` : can ? `dein Rekord: ${S.best}` : `du bist bei Wiedergeburt ${S.rebirths}`}</p></div>
      <button class="btn ${confirm === 'ascend' ? 'danger' : 'gold'}" data-rl="ascend" ${k && inCamp() ? '' : 'disabled'}>${confirm === 'ascend' ? 'Wirklich aufsteigen?' : 'Aufsteigen'}</button></div>`;
    if (main || S.asc) html += `<div class="rl-road">${ASC_ROAD.map(x => `<div class="rl-step crown ${S.asc >= x.a ? 'done' : S.asc + 1 === x.a ? 'next' : ''}"><span>${x.a}</span><div><b>${x.text}</b><small>Gegner ×${Math.pow(1.6, x.a).toFixed(1).replace('.', ',')} stärker</small></div></div>`).join('')}</div>`;
    if (S.asc || S.crowns) html += `<div class="rl-gohint"><span>Den <b>Kronen-Laden</b> findest du jetzt im Reiter Läden.</span><button class="btn small gold rl-gotree" data-tab="laeden">Zu den Läden</button></div>`;
    return html;
  }

  function crownShop() {
    return `<h3 class="rl-h3">Kronen-Laden</h3><p class="note">Du hast <span class="rl-cur crown">${crown}${S.crowns}</span> Kronen. Kronen-Boni bleiben für immer.</p><div class="rl-perks">${CPERKS.map(p => {
      const r = cperk(S, p.id), maxed = r >= p.max, c = cperkCost(S, p);
      return `<div class="rl-perk crown ${r ? 'has' : ''}"><b>${esc(p.name)}</b><span class="note">${p.max > 99 ? `Stufe ${r}` : `${r} / ${p.max}`}</span><p class="note">${esc(p.desc)}</p>
        <div class="row"><button class="btn small gold" data-cperk="${p.id}" ${maxed || S.crowns < c ? 'disabled' : ''}>${maxed ? 'Voll' : `${c} ${c === 1 ? 'Krone' : 'Kronen'}`}</button>${acct && acct.tester ? `<button class="btn ghost small" data-tmenu="c:${p.id}">🧪</button>` : ''}</div></div>`;
    }).join('')}</div>`;
  }
  /* ---------- Begleiter ---------- */
  function compTab() {
    let html = `<p class="note">Begleiter kämpfen an deiner Seite und bleiben für immer – auch bei Wiedergeburt und Aufstieg. Verbessern kostest Seelen. Aktive Begleiter: ${S.compActive.length}/${compSlots(S)}.</p><div class="rl-comps">`;
    html += COMPS.map(c => {
      const l = S.comps[c.id] || 0, on = S.compActive.includes(c.id), cost = compCost(l), max = compMax(S);
      if (!l) return `<div class="rl-comp locked" style="--cc:${c.color}"><span class="cic">?</span><div><b>${c.name}</b><p class="note">Kommt mit dem ${c.asc}. Aufstieg.</p></div></div>`;
      return `<div class="rl-comp ${on ? 'on' : ''}" style="--cc:${c.color}"><span class="cic">${{ drache: '♆', eule: '◉', golem: '▣', phoenix: '❂' }[c.id]}</span><div><b>${c.name}</b> <span class="note">Stufe ${l} / ${max}</span><p class="note">${c.desc(l)}</p>
        <div class="row"><button class="btn small" data-complvl="${c.id}" ${l >= max || S.souls < cost ? 'disabled' : ''}>${l >= max ? 'Maximal' : `Verbessern ${soul}${cost}`}</button>
        <button class="btn ghost small" data-compon="${c.id}">${on ? 'Ablegen' : 'Mitnehmen'}</button></div></div></div>`;
    }).join('');
    return html + '</div>';
  }

  /* ---------- Ruhmeshalle: Woche, Erfolge, Bestenliste ---------- */
  let boardKey = 'stage', boardData = null, boardAt = 0, pathMode = 'ever';
  // Heldenpfad: alle gespeicherten Spielstände als Fähnchen auf dem Weg durch die Gebiete
  function pathHTML() {
    const meName = acct ? acct.name : null;
    const list = (boardData && boardData.path ? boardData.path : []).filter(r => r.name !== meName).map(r => ({ ...r }));
    list.push({ name: meName || 'Du', me: true, stage: Math.max(S.bestEver, S.best), cur: S.best, asc: S.asc, rebirths: S.rebirths });
    const items = list.map(r => ({ ...r, v: pathMode === 'cur' ? r.cur : r.stage })).filter(r => r.v > 0 || r.me).sort((a, b) => a.v - b.v || (a.me ? 1 : -1));
    const top = Math.max(150, ...items.map(r => r.v)), maxS = Math.ceil((top + 6) / 10) * 10, PX = 9, L = 24, w = L + maxS * PX + 70;
    let zones = '';
    for (let z = 0; z < maxS / 10; z++) {
      const s0 = 10 * z + 1, bm = biomeOf(s0);
      zones += `<div class="zone ${s0 > 150 ? 'nm' : ''}" style="left:${L + z * 10 * PX}px;width:${10 * PX}px;--a1:${bm.sky[0]};--a2:${bm.hill[0]}" title="${esc(zoneName(s0))}"><span>${esc(zoneName(s0))}</span><i class="boss" title="Boss: ${esc(bossOf(s0))}"></i></div>`;
    }
    const lanes = []; let pins = '';
    for (const r of items) {
      const x = L + r.v * PX;
      let lane = lanes.findIndex(e => e <= x - 92);
      if (lane < 0) lane = lanes.length < 6 ? lanes.length : lanes.indexOf(Math.min(...lanes));
      lanes[lane] = x;
      const badge = r.asc ? ` · A${r.asc}` : r.rebirths ? ` · W${r.rebirths}` : '';
      pins += `<div class="pin ${r.me ? 'me' : ''}" style="left:${x}px;z-index:${10 - lane}"><span class="flag"><b>${esc(r.name)}</b><small>Stufe ${r.v}${badge}</small></span><i class="pole" style="height:${12 + lane * 38}px"></i></div>`;
    }
    const h = 40 + 12 + Math.max(1, lanes.length) * 38 + 30;
    requestAnimationFrame(() => { const p = document.querySelector('.rl-path'), m = p && p.querySelector('.pin.me'); if (p && m && !p.dataset.s) { p.dataset.s = 1; p.scrollLeft = Math.max(0, m.offsetLeft - p.clientWidth / 2); } });
    return `<h3 class="rl-h3">Heldenpfad</h3>
      <div class="rl-btabs"><button class="${pathMode === 'ever' ? 'on' : ''}" data-pathmode="ever">Weiteste Stufe aller Zeiten</button><button class="${pathMode === 'cur' ? 'on' : ''}" data-pathmode="cur">Seit der letzten Wiedergeburt</button></div>
      <div class="rl-path"><div class="trk" style="width:${w}px;height:${h}px">${zones}<span class="start" style="left:${L}px">Start</span>${pins}</div></div>
      <p class="note">Jedes Fähnchen ist ein gespeicherter Spielstand. W = Wiedergeburten, A = Aufstiege. ${acct ? '' : 'Lege im Reiter „Spielstand“ einen Spielstand an, damit deine Freunde dich hier auch sehen.'}${boardData ? '' : ' Die anderen Spielstände werden geladen …'}</p>`;
  }
  const PIECE_POS = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  function puzzleHTML(id, shop) {
    const h = HERO_BY_ID[id], m = pieceMask(S, id);
    return `<div class="rl-puz" style="--hc:${h.color}">${PIECE_POS.map(([x, y], i) => {
      const got = m & (1 << i);
      return got ? `<span class="pc got" style="--x:${x};--y:${y}"><i>${PORTRAIT[id]}</i></span>`
        : shop ? `<button class="pc buy" style="--x:${x};--y:${y}" data-piece="${id}:${i}" ${S.exp.spl >= PIECE_COST ? '' : 'disabled'} title="Teil ${i + 1} kaufen"><b>${PIECE_COST}</b></button>` : `<span class="pc" style="--x:${x};--y:${y}"></span>`;
    }).join('')}</div>`;
  }
  function expTab() {
    const tgt = S.exp.target, th = HERO_BY_ID[tgt], camp = inCamp();
    const heroes = PUZZLE.map(id => {
      const h = HERO_BY_ID[id], done = assembled(S, id), n = pieceCount(S, id);
      return `<div class="rl-xhero ${id === tgt ? 'on' : ''} ${done ? 'done' : ''}" style="--hc:${h.color}">
        <div class="top"><span class="pt">${PORTRAIT[id]}</span><div><b>${h.name}</b><small>${done ? (hired(S, h.tree) ? 'In deiner Gruppe' : 'Fertig! Jetzt im Baum anheuern.') : `${n}/6 Puzzleteile`}</small></div></div>
        <p class="note">${esc(h.desc)}</p>${puzzleHTML(id, !done)}
        ${done ? `<button class="btn small ghost rl-gotree" data-tab="${h.tree}">Zum Baum</button>` : `<button class="btn small ${id === tgt ? '' : 'ghost'}" data-target="${id}">${id === tgt ? 'Du spielst für diesen Helden' : 'Für diesen Helden spielen'}</button>`}</div>`;
    }).join('');
    const missions = MISSIONS.map(m => `<div class="rl-mission"><span class="ic">${m.icon}</span><div><b>${m.name}</b><small>${m.desc}</small><small>Alle Wellen auf Stufe ${expStage(S, m)} · Belohnung: <b>${m.spl} Splitter</b></small></div>
      <button class="btn small" data-rl="mission" data-m2="${m.id}" ${camp && !assembled(S, tgt) ? '' : 'disabled'}>Starten</button></div>`).join('');
    return `<div class="rl-exp"><div class="rl-xhead"><div><h3 class="rl-h3">Expeditionen</h3><p class="note">Wähle, für welchen Helden du spielst, und schaffe eine Mission. Jede geschaffte Mission gibt sicher Heldensplitter. Dazu hat jedes fehlende Puzzleteil des gewählten Helden 0,5 % Chance (am Anfang zusammen 3 %). Mit Splittern kaufst du jedes Teil gezielt (${PIECE_COST} Splitter). Gold, Seelen und Rekorde gibt es in Expeditionen nicht.</p></div>
      <div class="rl-spl"><span>◈</span><b>${S.exp.spl}</b><small>Heldensplitter</small></div></div>
      <h3 class="rl-h3">Missionen ${assembled(S, tgt) ? '' : `für ${th.name}`}</h3>
      ${assembled(S, tgt) ? `<p class="warn">${th.name} ist schon fertig. Wähle unten einen anderen Helden.</p>` : ''}${camp ? '' : '<p class="note">Missionen startest du im Lager.</p>'}
      <div class="rl-missions">${missions}</div>
      <h3 class="rl-h3">Helden &amp; Puzzle-Laden</h3><p class="note">Tippe ein leeres Teil an, um es für ${PIECE_COST} Splitter zu kaufen.</p>
      <div class="rl-xheroes">${heroes}</div></div>`;
  }
  function pieceFound(id) {
    const h = HERO_BY_ID[id];
    modal(`<span class="rl-mic" style="border-color:${h.color};color:${h.color}">${PORTRAIT[id]}</span><h2>Puzzleteil gefunden!</h2>
      <p class="note" style="text-align:center">Ein Teil für ${h.name}: jetzt ${pieceCount(S, id)} von 6.</p>${puzzleHTML(id, false)}
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Super</button></div>`);
  }
  function heroDone(id) {
    const h = HERO_BY_ID[id];
    if (S.exp.target === id) { const nx = PUZZLE.find(x => !assembled(S, x)); if (nx) { S.exp.target = nx; save(); } }
    modal(`<span class="rl-mic" style="border-color:${h.color};color:${h.color}">${PORTRAIT[id]}</span><h2>${h.name} ist bereit!</h2>
      <ul class="rl-list"><li>Alle 6 Puzzleteile sind zusammengesetzt.</li><li>${esc(h.desc)}</li><li>Heuere ${h.name} im neuen Reiter <b>${h.name}</b> an und stell den Helden in deine Aufstellung.</li><li>Freigeschaltete Helden bleiben für immer, auch nach Wiedergeburt und Aufstieg.</li></ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Los geht’s</button></div>`);
  }
  // Runenschmied: Runen zerstören (gibt Runensplitter) und 3 gleiche verschmelzen (kostet so viel wie 3 zerstörte)
  function forgeShop() {
    const used = socketed(S), groups = {};
    for (const r of S.runes) { const k = r.t + ':' + r.tier; (groups[k] = groups[k] || { t: r.t, tier: r.tier, n: 0, free: 0 }).n++; if (!used.has(r.id)) groups[k].free++; }
    const list = Object.values(groups).sort((a, b) => b.tier - a.tier || RUNES.findIndex(x => x.id === a.t) - RUNES.findIndex(x => x.id === b.t));
    const row = g => { const R = RUNE[g.t], mc = mergeCost(g.tier), canM = feature(S, 'schmiede') && g.n >= 3 && g.tier < 10 && S.dust >= mc;
      return `<div class="rl-frow" style="--rc:${R.color}"><span class="rl-rune mini"><b>${ROMAN[g.tier]}</b></span><div class="nm"><b>${R.name} ${ROMAN[g.tier]}</b><small>${g.n}× im Besitz${g.n - g.free ? ` · ${g.n - g.free} eingesetzt` : ''}</small></div>
        <button class="btn ghost small" data-rforge="d:${g.t}:${g.tier}" ${g.free ? '' : 'disabled title="Alle eingesetzt"'}>Zerstören +${dust}${shardOf(g.tier)}</button>
        ${feature(S, 'schmiede') ? `<button class="btn small" data-rforge="m:${g.t}:${g.tier}" ${canM ? '' : 'disabled'}>${g.tier >= 10 ? 'Höchste Stufe' : `3 → ${ROMAN[g.tier + 1]} · ${dust}${mc}`}</button>` : ''}</div>`; };
    const ln = S.rlager || 0, lc = lagerCost(ln);
    return `<h3 class="rl-h3">Runenschmied</h3><p class="note">Zerstöre Runen, die du nicht brauchst, und bekomme <b>Runensplitter</b>. Mit Splittern erweiterst du dein <b>Runen-Lager</b>${feature(S, 'schmiede') ? ' und verschmilzt <b>3 gleiche Runen</b> zu einer Rune der nächsten Stufe. Ein Verschmelzen kostet genau so viel, wie 3 zerstörte Runen dieser Stufe geben' : '. Ab der 4. Wiedergeburt kannst du außerdem 3 gleiche Runen verschmelzen'}. Eingesetzte Runen werden nie zerstört.</p>
      <div class="rl-wallet"><span class="rl-cur dust">${dust}${S.dust} Runensplitter</span><span class="note">Lager ${S.runes.length}/${runeCap(S)}</span>
      <button class="btn small" data-rl="lager" ${ln < LAGER_MAX && S.dust >= lc && inCamp() ? '' : 'disabled'}>${ln >= LAGER_MAX ? 'Lager voll ausgebaut' : `Lager +5 Plätze (${dust}${lc})`}</button>
      ${feature(S, 'schmiede') ? `<button class="btn ghost small" data-rl="buyrune" ${S.dust >= DUST_RUNE && S.runes.length < runeCap(S) ? '' : 'disabled'}>Zufällige Rune I (${dust}${DUST_RUNE})</button>` : ''}</div>
      <div class="rl-forgelist">${list.map(row).join('') || '<p class="note">Noch keine Runen. Bosse lassen Runen fallen.</p>'}</div>`;
  }
  function ladenTab() {
    const open = { stern: S.rebirths >= 1 || S.stars > 0 || S.asc > 0, zeit: S.rebirths >= 1 || S.asc > 0 || S.tempo > 0, altar: S.rebirths >= 1 || S.asc > 0 || S.altar > 0, schmiede: feature(S, 'runen') || S.asc > 0, krone: S.asc > 0 || S.crowns > 0, puzzle: expOpen(S) };
    const LIST = [
      ['stern', 'Sternen-Laden', 'mit der 1. Wiedergeburt', star], ['zeit', 'Zeitbaum', 'mit der 1. Wiedergeburt', '⏱'], ['altar', 'Seelenaltar', 'mit der 1. Wiedergeburt', soul],
      ['krone', 'Kronen-Laden', 'mit dem 1. Aufstieg', crown], ['puzzle', 'Puzzle-Laden', 'mit dem 1. Aufstieg (Expeditionen)', '◈'],
    ];
    let cur = shopSel; if (!LIST.some(([id]) => id === cur && open[id])) cur = (LIST.find(([id]) => open[id]) || ['stern'])[0];
    let html = `<div class="rl-wallet"><span class="rl-cur gold">${coin}${fmt(S.gold)}</span><span class="rl-cur soul">${soul}${S.souls}</span><span class="rl-cur star">${star}${S.stars}</span>${open.schmiede ? `<span class="rl-cur dust">${dust}${S.dust}</span>` : ''}${open.krone ? `<span class="rl-cur crown">${crown}${S.crowns}</span>` : ''}${open.puzzle ? `<span class="rl-cur spl">◈ ${S.exp.spl}</span>` : ''}</div>
      <div class="rl-shopnav">${LIST.map(([id, name, when, ic]) => open[id] ? `<button data-shoptab="${id}" class="${id === cur ? 'on' : ''}">${ic} ${name}</button>` : `<span class="lock" title="Kommt ${when}">🔒 ${name}</span>`).join('')}</div>`;
    if (open.stern && cur === 'stern') html += `<section id="shop-stern" class="rl-shop"><h3 class="rl-h3">Sternen-Laden</h3><p class="note">Du hast <span class="rl-cur star">${star}${S.stars}</span> Sterne. Sterne bekommst du bei jeder Wiedergeburt und aus der Wochen-Herausforderung. Beim Aufstieg werden die Sternen-Boni zurückgesetzt.</p><div class="rl-perks">${perkCards()}</div><div class="row" style="margin-top:10px"><button class="btn ${confirm === 'pres' ? 'danger' : 'ghost'} small" data-rl="pres" ${inCamp() && Object.keys(S.perks).length ? '' : 'disabled'}>${confirm === 'pres' ? 'Wirklich alles zurücksetzen?' : '↺ Sternen-Laden zurücksetzen (alle Sterne zurück)'}</button></div></section>`;
    if (open.zeit && cur === 'zeit') html += `<section id="shop-zeit" class="rl-shop">${zeitTab()}</section>`;
    if (open.altar && cur === 'altar') { const L = S.altar || 0, c = altarCost(L), maxed = L >= ALTAR_MAX;
      html += `<section id="shop-altar" class="rl-shop"><h3 class="rl-h3">Seelenaltar</h3><p class="note">Opfere Gold für mehr Seelen. Jede Stufe gibt <b>+15 % Seelen</b> von Bossen, Elite-Gegnern und Abkürzungen. Der Altar bleibt <b>für immer</b>, auch nach Wiedergeburt und Aufstieg. Tipp: Kurz vor einer Wiedergeburt brauchst du dein Gold sowieso nicht mehr.</p>
      <div class="rl-altar"><div class="rl-altar-ic">${soul}</div><div><b>Stufe ${L} von ${ALTAR_MAX}</b><span class="note">Seelen jetzt ×${altarMul(S).toFixed(2).replace('.', ',')}${maxed ? '' : ` · nächste Stufe ×${(altarMul(S) + 0.15).toFixed(2).replace('.', ',')}`}</span></div>
      <button class="btn small" data-rl="altar" ${!maxed && S.gold >= c && inCamp() ? '' : 'disabled'}>${maxed ? 'Voll ausgebaut' : `Opfern: ${coin}${fmt(c)}`}</button></div></section>`; }
    if (open.krone && cur === 'krone') html += `<section id="shop-krone" class="rl-shop">${crownShop()}</section>`;
    if (open.puzzle && cur === 'puzzle') html += `<section id="shop-puzzle" class="rl-shop"><h3 class="rl-h3">Puzzle-Laden</h3><p class="note">Du hast <b>◈ ${S.exp.spl}</b> Heldensplitter aus den Expeditionen. Tippe ein leeres Teil an, um es für ${PIECE_COST} Splitter zu kaufen.</p>
      <div class="rl-xheroes">${PUZZLE.map(id => { const h = HERO_BY_ID[id], done = assembled(S, id); return `<div class="rl-xhero ${done ? 'done' : ''}" style="--hc:${h.color}"><div class="top"><span class="pt">${PORTRAIT[id]}</span><div><b>${h.name}</b><small>${done ? 'Fertig' : `${pieceCount(S, id)}/6 Puzzleteile`}</small></div></div>${puzzleHTML(id, !done)}</div>`; }).join('')}</div></section>`;
    const next = LIST.find(([id]) => !open[id]);
    if (next) html += `<p class="note rl-nextshop">Als Nächstes kommt der <b>${next[1]}</b> ${next[2]}.</p>`;
    return html;
  }
  function zeitTab() {
    const lv = S.tempo || 0, f = x => String(x).replace('.', ',');
    const nodes = [`<div class="rl-znode own"><span class="ic">⏱</span><b>×1 bis ×3</b><small>von Anfang an</small></div>`];
    TEMPO_COST.forEach((cost, i) => {
      const sp = 3.5 + 0.5 * i, own = i < lv, next = i === lv, can = next && S.souls >= cost;
      nodes.push(`<i class="rl-zlink ${own ? 'own' : ''}"></i><div class="rl-znode ${own ? 'own' : next ? 'next' : 'locked'}"><span class="ic">${own ? '✓' : next ? '⏩' : '🔒'}</span><b>×${f(sp)}</b>
        ${own ? '<small>freigeschaltet</small>' : `<button class="btn small ${can ? '' : 'ghost'}" ${next ? `data-tempo="1" ${can ? '' : 'disabled'}` : 'disabled'}>${soul}${cost}</button>`}</div>`);
    });
    return `<div class="rl-zeit"><h3 class="rl-h3">Zeitbaum</h3>
      <p class="note">Hier schaltest du mit Seelen schnellere Spieltempos frei, bis maximal ×5. Was du hier kaufst, bleibt für immer, auch nach Wiedergeburt und Aufstieg. Umschalten kannst du oben rechts mit dem Knopf „Tempo“.</p>
      <div class="rl-ztree">${nodes.join('')}</div>
      <p class="note">Gerade möglich: bis ×${f(maxSpeed(S))} · Du hast ${soul}${S.souls} Seelen.</p></div>`;
  }
  function halleTab() {
    const wk = weekId(), rules = weekRules(wk), mine = S.weekly.week === wk ? S.weekly : { best: 0, claimed: 0 };
    let html = pathHTML() + `<div class="rl-week"><div><h3>Wochen-Herausforderung</h3><p class="note">Woche ${wk.split('-W')[1]} · gleiche Regeln für alle bis Sonntag. Du startest bei Stufe 1 mit deinen aktuellen Helden. Es gibt kein Gold, dafür Sterne und Kronen.</p>
      <div class="rl-rules">${rules.map(r => `<span class="rl-rule"><b>${RULE[r].name}</b>${RULE[r].desc}</span>`).join('')}</div>
      <div class="rl-tiers">${WEEK_TIERS.map((t, i) => `<span class="rl-tier ${mine.claimed & (1 << i) ? 'done' : ''}"><b>Stufe ${t.st}</b>${star}${t.stars}${t.crown ? ` ${crown}${t.crown}` : ''}</span>`).join('')}</div>
      <p>Dein Bestes diese Woche: <b>Stufe ${mine.best}</b></p></div>
      <button class="btn" data-rl="weekly" ${inCamp() ? '' : 'disabled'}>Herausforderung starten</button></div>`;
    const n = Object.keys(S.ach).length;
    html += `<h3 class="rl-h3">Erfolge (${n}/${ACH.length})</h3><p class="note">Jeder Erfolg gibt allen Helden dauerhaft +3 % Schaden und Leben. Zusammen gerade: +${Math.round((Math.pow(1 + ACH_BONUS, n) - 1) * 100)} %.</p>
      <div class="rl-achs">${ACH.map(a => `<div class="rl-ach ${S.ach[a.id] ? 'got' : ''}"><span>${S.ach[a.id] ? '★' : '☆'}</span><div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div></div>`).join('')}</div>`;
    const tabsB = [['stage', 'Höchste Stufe'], ['prestige', 'Wiedergeburten'], ['tower', 'Turm'], ['weekly', 'Diese Woche'], ['ach', 'Erfolge']];
    html += `<h3 class="rl-h3">Bestenliste</h3><div class="rl-btabs">${tabsB.map(([k, l]) => `<button class="${boardKey === k ? 'on' : ''}" data-board="${k}">${l}</button>`).join('')}</div>`;
    if (!acct) html += '<p class="note">Lege im Reiter „Spielstand“ einen Spielstand mit Namen und Passwort an, um in der Bestenliste zu erscheinen.</p>';
    if (!boardData || Date.now() - boardAt > 30000) {
      boardAt = Date.now();
      api('board', {}).then(r => { if (!r.error) { boardData = r; if (tab === 'halle') panel(); } });
    }
    if (!boardData) html += '<p class="note">Bestenliste wird geladen …</p>';
    else {
      const list = boardData[boardKey] || [];
      const val = r => (boardKey === 'stage' ? `Stufe ${r.stage}` : boardKey === 'prestige' ? `${r.asc ? `Aufstieg ${r.asc} · ` : ''}${r.rebirths} Wiedergeb.` : boardKey === 'tower' ? `Etage ${r.tower}` : boardKey === 'weekly' ? `Stufe ${r.week}` : `${r.ach} Erfolge`);
      html += list.length ? `<ol class="rl-board">${list.map((r, i) => `<li class="${acct && r.name === acct.name ? 'me' : ''}"><span class="pl">${i + 1}</span><b>${esc(r.name)}</b><span>${val(r)}</span></li>`).join('')}</ol>` : '<p class="note">Noch keine Einträge.</p>';
      html += `<p class="note">${boardData.players} Spielstände · wird alle 30 Sekunden aktualisiert</p>`;
    }
    return html;
  }

  /* ---------- Truppe: Helden aufstellen ---------- */
  let squad = null;
  function squadHeroes() {
    if (S.asc) return HEROES;
    const own = HEROES.filter(h => hired(S, h.tree)), nx = HEROES.find(h => !h.puzzle && !hired(S, h.tree));
    return nx ? [...own, nx] : own;
  }
  function lockReason(h) {
    if (h.puzzle) return `${h.name}: Setze das Puzzle aus den Expeditionen zusammen.`;
    if (S.rebirths < h.rebirth) return `${h.name} kommt mit der ${h.rebirth}. Wiedergeburt.`;
    return `${h.name} kannst du jetzt in seinem Baum anheuern.`;
  }
  function openSquad() {
    if (!inCamp()) return;
    if (!squad) {
      const el = document.createElement('div'); el.className = 'rl-squad'; el.hidden = true;
      el.innerHTML = `<div class="sq-panel" role="dialog" aria-label="Truppe"><canvas class="sq-bg"></canvas><div class="sq-top"><div class="sq-head"><h2>Truppe</h2><span class="sq-count"></span><button class="sq-x" aria-label="Schließen">✕</button></div><div class="sq-row"></div><p class="sq-tip"></p><div class="sq-legend"></div></div><div class="sq-scene" aria-hidden="true"></div></div>`;
      document.body.appendChild(el);
      squad = { el, cv: el.querySelector('.sq-bg'), ids: [], slots: 4, off: 0, spots: null };
      el.addEventListener('click', onSquadClick);
    }
    squad.el.hidden = false; renderSquad(); sizeSquad(); SND.play('tick');
  }
  function closeSquad() { if (squad) squad.el.hidden = true; }
  function sizeSquad() {
    const c = squad.cv, sc = squad.el.querySelector('.sq-scene'), dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
    if (!w) return;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); squad.offL = sc.offsetTop * W / w;
  }
  function renderSquad() {
    const field = fieldOf(S), slots = fieldSlots(S), el = squad.el;
    squad.ids = field; squad.slots = slots;
    el.querySelector('.sq-count').textContent = `${field.length} / ${slots} Plätze`;
    const list = squadHeroes();
    el.querySelector('.sq-row').innerHTML = list.map(h => {
      const own = hired(S, h.tree), on = field.includes(h.id), col = ROLE_INFO[ROLE[h.id]].col;
      return `<button class="sq-tile ${own ? (on ? 'on' : 'bench') : 'locked'}" data-sq="${h.id}" style="--rc:${col}"><span class="pic"><img src="${portraitURL(h.id)}" alt="">${own ? '' : '<b class="lk">🔒</b>'}</span><span class="nm">${h.name}</span>${on ? '<em>✓</em>' : ''}</button>`;
    }).join('');
    el.querySelector('.sq-tip').textContent = `Tippe ein Porträt an, um den Helden ein- oder auszuwechseln. Rechts steht die vorderste Reihe.${slots < 6 ? ` Mehr Plätze: ${perk(S, 'p_feld') ? '' : 'Fünfter Platz im Sternen-Laden'}${!perk(S, 'p_feld') && !cperk(S, 'k_feld') ? ', ' : ''}${cperk(S, 'k_feld') ? '' : 'Sechster Platz im Kronen-Laden'}.` : ''}`;
    const roles = [...new Set(LINE_ORDER.filter(k => list.some(h => h.id === k)).map(k => ROLE[k]))];
    el.querySelector('.sq-legend').innerHTML = roles.map(r => `<span style="--rc:${ROLE_INFO[r].col}"><i></i>${ROLE_INFO[r].name}</span>`).join('');
    sizeSquad();
  }
  function squadToggle(id) {
    if (!inCamp()) { toast('Die Truppe änderst du im Lager.'); return; }
    const r = toggleField(S, id);
    if (r === 'full') toast('Alle Plätze sind belegt. Nimm zuerst jemanden raus.');
    else if (r === 'last') toast('Mindestens ein Held muss kämpfen.');
    else SND.play(r === 'in' ? 'buy' : 'tick');
    afterChange(); renderSquad();
  }
  function onSquadClick(e) {
    if (e.target === squad.el || e.target.closest('.sq-x')) { closeSquad(); return; }
    const t = e.target.closest('[data-sq]');
    if (t) {
      const h = HERO_BY_ID[t.dataset.sq];
      if (hired(S, h.tree)) squadToggle(h.id);
      else if (!h.puzzle && S.rebirths >= h.rebirth) { closeSquad(); tab = h.tree; confirm = ''; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); toast(lockReason(h)); }
      else toast(lockReason(h));
      return;
    }
    const sc = e.target.closest('.sq-scene');
    if (sc && squad.spots) {
      const r = sc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      const hit = squad.spots.heroes.find(s => Math.abs(s.x - x) < 24);
      if (hit) squadToggle(hit.k); else if (squad.spots.empty.some(ex => Math.abs(ex - x) < 24)) toast('Tippe oben ein Porträt an, um den Platz zu füllen.');
    }
  }

  /* ---------- Fenster: Willkommen und Neuigkeiten ---------- */
  function modal(html) {
    const p = $('#picker');
    p.innerHTML = `<div class="sheet rl-modal" role="dialog">${html}</div>`;
    p.hidden = false;
    p.onclick = e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      p.hidden = true; p.onclick = null;
      if (b.dataset.m === 'area') { S.area = Math.max(0, Number(b.dataset.z) || 0); save(); refresh(); }
      if (b.dataset.m === 'save') { tab = 'stand'; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
  }
  function showAreas() {
    const max = areaMax(S), cur = Math.min(S.area || 0, max), cap = capOf(S);
    let rows = '';
    for (let z = 0; z <= max + 1; z++) {
      const s0 = 10 * z + 1; if (s0 > cap) break;
      const bm = biomeOf(s0), lock = z > max;
      rows += `<button class="rl-areab ${z === cur ? 'on' : ''} ${lock ? 'locked' : ''}" ${lock ? 'disabled' : `data-m="area" data-z="${z}"`} style="--a1:${bm.sky[0]};--a2:${bm.hill[0]};--a3:${bm.ground[0]}">
        <span class="sw"></span><span class="tx"><b>${esc(zoneName(s0))}${z === cur ? ' · gewählt' : ''}</b><small>Stufe ${s0}–${s0 + 9} · Boss: ${esc(bossOf(s0))}${z ? ` · Fernkämpfer: ${esc(rangedName(s0))}` : ' · keine Fernkämpfer'}</small>
        ${lock ? `<small class="lk">Gesperrt – besiege zuerst: ${esc(bossOf(s0 - 1))} auf Stufe ${s0 - 1}</small>` : ''}</span></button>`;
    }
    modal(`<h2>Startgebiet wählen</h2>
      <p class="note">Ein Gebiet wird frei, sobald du den Boss davor besiegt hast. Bis zur nächsten Wiedergeburt bleibt es frei. Für übersprungene Bosse bekommst du beim Start ein Drittel ihrer Seelen. Ein früherer Start lohnt sich also, wenn dir Seelen fehlen.</p>
      <div class="rl-areas">${rows}</div><div class="row" style="justify-content:center"><button class="btn ghost" data-m="ok">Schließen</button></div>`);
    const on = $('#picker .rl-areab.on'); if (on) on.scrollIntoView({ block: 'center' });
  }
  function showExpInfo() {
    S.seenExp = true; save();
    modal(`<span class="rl-mic" style="border-color:#9bd14a;color:#9bd14a">◈</span><h2>Neu: Expeditionen</h2>
      <ul class="rl-list"><li>Im neuen Reiter <b>Expedition</b> spielst du kurze Missionen für einen Helden deiner Wahl.</li>
      <li>Jede geschaffte Mission gibt sicher <b>Heldensplitter</b>. Jedes fehlende Puzzleteil hat dazu 0,5 % Chance.</li>
      <li>Mit Splittern kaufst du gezielt Puzzleteile. 6 Teile ergeben einen neuen Helden: <b>Assassine, Nekromant, Barde, Druidin oder Tüftlerin</b>.</li></ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Zu den Expeditionen</button></div>`);
    tab = 'exp'; renderTabs(); panel();
  }
  // Neuigkeiten: neueste Einträge oben. Neue Updates OBEN mit höherer id anhängen.
  const UPDATES = [
    { id: 33, date: '14.10.2026', title: 'Ahnensiegel: die Bäume wachsen', items: [
      ['Neu', 'Setzt du ein Ahnensiegel auf einen Helden, wächst sein Fertigkeitenbaum nach unten: 5 passive Fähigkeiten, 3 Siegel-Fähigkeiten und 4 Siegel-Schlüssel. Jeder der 11 Helden hat seine eigene Erweiterung, so wie du sie in der Umfrage gewählt hast.'],
      ['Neu', 'Siegel-Fähigkeiten haben einen eigenen Platz. Damit kämpft jeder Held mit Siegel mit einer zusätzlichen aktiven Fähigkeit.'],
      ['Neu', 'Siegel-Schlüssel haben einen eigenen Siegelsockel (✦). Weitere Siegel-Schlüssel kannst du in freie normale Sockel stecken.'],
      ['Umbau', 'Ritter: Schildstoß wird zu Doppelhieb (zwei Hiebe mit je 250 %, lädt Wirbelwind 3 s weiter). Zweites Leben wird zu Vorbild (besiegt der Ritter einen Gegner, heilen alle Helden 2 %). Wer die Fertigkeiten schon hatte, behält sie mit der neuen Wirkung.'],
      ['Neu', 'Der Notfall-Code speichert jetzt auch deine Ahnensiegel und den Fortschritt der Ahnenprüfung.'],
    ] },
    { id: 32, date: '14.10.2026', title: 'Ahnenprüfung: Stärke nach Allzeit-Rekord', items: [
      ['Umstellung', 'Die Gegnerstärke der Ahnenprüfung richtet sich jetzt nach deinem höchsten Rekord überhaupt (80 %), nicht mehr nach dem Rekord seit der letzten Wiedergeburt. Eine schon begonnene Prüfung bekommt beim nächsten Missionsstart die neue Stärke, dein Fortschritt auf der Karte bleibt.'],
    ] },
    { id: 31, date: '14.10.2026', title: 'Aufgeräumte Reiter', items: [
      ['Neu', 'Alle Helden sind jetzt unter einem Reiter „Helden“ zusammengefasst. Darunter wählst du den Helden über eine Zeile mit Porträts.'],
      ['Neu', 'Ahnenprüfung und Expedition stehen gemeinsam unter „Abenteuer“, sobald beide offen sind.'],
    ] },
    { id: 30, date: '14.10.2026', title: 'Sternenkarte und echte Drachen', items: [
      ['Neu', 'Die Karte der Ahnenprüfung ist jetzt ein Sternenhimmel: Jede Mission ist eine schwebende Insel im Licht ihres Themas, verbunden durch Sternenbrücken. Mission 10 ist das goldene Schloss der Ahnen.'],
      ['Neu', 'Knochendrache, Weißer Wyrm, Sumpfhydra und Dornendrache haben jetzt eigene Köpfe, Körper, Atemangriffe und Animationen. Die Hydra hat drei Köpfe.'],
      ['Neu', 'Bosse zeigen beim Einsatz einer Fähigkeit einen Lichtring. Schadenszahlen verdecken die Köpfe der Bosse nicht mehr.'],
      ['Neu', 'Tester: Jeden Boss der aktuellen Mission direkt starten.'],
    ] },
    { id: 29, date: '14.10.2026', title: 'Die Ahnenprüfung', items: [
      ['Neu', 'Ab der 6. Wiedergeburt: die Ahnenprüfung. Eine Weltkarte mit 10 Missionen, jede mit 5 eigenen Bossen in 3 Phasen. Am Ende wartet der Urahn.'],
      ['Neu', '51 neue Bosse mit über 20 Boss-Fähigkeiten: Schilde, Spiegelhaut, Zeitbomben, Flüche, Beben, Abspaltungen und mehr.'],
      ['Neu', 'Wer den Urahn besiegt, bekommt ein Ahnensiegel. Die Prüfung ist danach wiederholbar. Die Baum-Erweiterungen für die Siegel kommen im nächsten Update.'],
      ['Umstellung', 'Neue Reihenfolge der Wiedergeburten, immer abwechselnd Held und Feature: 1 Wächter, 2 Runen, 3 Schützin, 4 Runenschmied, 5 Magier, 6 Ahnenprüfung, 7 Priesterin, 8 Turm, 9 Tierbändiger und Aufstieg. Was du schon hast, behältst du.'],
    ] },
    { id: 28, date: '13.10.2026', title: 'Runen-Update: Schutz, Eile, Fokus', items: [
      ['Neu', 'Schutz-Runen zählen jetzt immer voll und werden ab 50 % nicht mehr halbiert. Höchstens 72 % weniger Schaden.'],
      ['Neu', 'Eile-Runen sind stärker: 7 % statt 4 % Angriffstempo pro Stufe I, außerdem laden die Fähigkeiten etwas schneller.'],
      ['Neu', 'Fokus-Runen sind stärker: 4 % statt 3 % pro Stufe I.'],
      ['Neu', 'Abklingzeit sinkt höchstens um 60 %. Alles darüber geht nicht mehr verloren: Jeder Prozentpunkt zu viel wird zu +2 % Schaden der aktiven Fähigkeiten.'],
      ['Info', 'Die rechte Endlos-Fertigkeit des Magiers (und der Tüftlerin) gibt jetzt immer −2 % Abklingzeit je Stufe. Über 60 % wird sie automatisch zu mehr Fähigkeiten-Schaden.'],
      ['Fix', 'Wirbelwind, Blitzschlag, Schildstoß, Schildwall, Wurzeln und Raubtiersprung bekommen jetzt auch Boni auf Fähigkeiten-Schaden, zum Beispiel aus der Endlos-Fertigkeit des Magiers.'],
    ] },
    { id: 27, date: '13.10.2026', title: 'Zorn-Runen verstärkt', items: [
      ['Neu', 'Zorn wirkt jetzt als finaler Krit-Schaden: Kritische Treffer machen den Wert der Rune mehr Schaden (Stufe III: +58 %). Vorher wurde der Wert nur zum Krit-Schaden addiert und brachte kaum etwas.'],
      ['Info', 'Mit wenig Krit-Chance ist Kraft besser, mit ausgebauten Krit-Knoten (ab etwa 45 % Krit-Chance) ist Zorn etwas stärker. Deine vorhandenen Zorn-Runen wirken automatisch nach der neuen Regel.'],
    ] },
    { id: 26, date: '13.10.2026', title: 'Endlos-Fertigkeiten sind jetzt wirklich endlos', items: [
      ['Neu', 'Drei Endlos-Fertigkeiten hatten eine Grenze. Ab der Grenze gibt jetzt jede weitere Stufe einen Ersatz-Bonus mit halber Stärke der Partner-Fertigkeit.'],
      ['Info', 'Magier rechts (Abklingzeit): ab Stufe 25 +3 % Schaden aller aktiven Fähigkeiten je Stufe.'],
      ['Info', 'Wächter links (weniger Schaden): ab Stufe 25 +3 % Dornen je Stufe. Priesterin links (Laufgeschwindigkeit): ab Stufe 37 +1,5 % Angriffstempo je Stufe. Das gilt auch für Druidin, Tüftlerin und Barde.'],
      ['Neu', 'Tester: Knopf „Baum komplett ausbauen“ in jedem Fertigkeitenbaum.'],
    ] },
    { id: 25, date: '13.10.2026', title: 'Neuer Look für die Schützin', items: [
      ['Neu', 'Die Schützin hat ein neues Aussehen: Gesicht mit grünen Augen und Kriegsbemalung, Kapuze mit roter Feder, Elfenohr, geflochtener Zopf, Lederweste mit Schnürung, Armschiene und ein Langbogen mit leuchtender Rune.'],
    ] },
    { id: 24, date: '13.10.2026', title: 'Neues Truppen-Menü', items: [
      ['Neu', 'Tippe im Lager aufs Lagerfeuer: Dort stellst du jetzt deine Truppe zusammen. Oben die Porträts, unten steht deine Truppe am Feuer.'],
      ['Neu', 'Farbige Kreise zeigen die Rolle: Lila Tank, Rot Nahkampf, Gelb Nahkampf-Helfer, Blau Fernkampf, Grün Unterstützung.'],
      ['Info', 'Die Helden stellen sich immer von vorne nach hinten in dieser Reihenfolge auf.'],
    ] },
    { id: 23, date: '13.10.2026', title: 'Schmied mit Amboss-Slots', items: [
      ['Neu', 'Der Runenschmied hat jetzt dieselbe Slot-Ansicht wie der Wandler: 3 Runen auf den Amboss legen, schmieden oder zerstören.'],
      ['Neu', 'Tester: Test-Wiedergeburt gibt immer Sterne, „Eine Wiedergeburt zurück“ ist neu.'],
      ['Fix', 'Ergebnisse im Schmied und Wandler verschwinden, wenn du den Reiter wechselst.'],
    ] },
    { id: 22, date: '13.10.2026', title: 'Runenwandler, Aufstellung & Geräte-Abgleich', items: [
      ['Neu', 'Runenwandler (Runen → 🎲 Wandler): 2 Runen derselben Stufe rein, 1 zufällige Rune derselben Stufe raus, nie eine der beiden hineingelegten Arten. Ein Glücksspiel-Kobold würfelt für dich.'],
      ['Neu', 'Aufstellung für alle: Ab 2 Helden kannst du im Lager jederzeit wählen, wer kämpft, zum Beispiel um einen Helden allein zu testen.'],
      ['Neu', 'Kein Geräte-Fenster mehr: Wurde auf einem anderen Gerät gespielt, nimmt das Spiel automatisch den Stand mit mehr (oder gleich vielen) Läufen.'],
    ] },
    { id: 21, date: '13.10.2026', title: 'Läden-Reiter & neuer Runenschmied', items: [
      ['Neu', 'Läden: Oben tippst du einen Laden an und siehst nur diesen, statt alle untereinander.'],
      ['Neu', 'Runen haben jetzt zwei Unterreiter: Ausrüstung und Schmied. Der Runenschmied ist aus den Läden in den Runen-Reiter umgezogen.'],
      ['Neu', 'Im Schmied hämmert ein Kobold am Amboss. Deine Runen liegen als Stapel-Kacheln da, sortierbar nach Art oder Stufe und filterbar. Rune antippen, dann upgraden oder zerstören.'],
      ['Neu', 'Alle gefilterten freien Runen auf einmal zerstören, mit doppelter Sicherheitsabfrage. Eingesetzte Runen werden nie zerstört.'],
    ] },
    { id: 20, date: '13.10.2026', title: 'Kein unsterblicher Wächter mehr', items: [
      ['Balance', 'Weniger Schaden nehmen stapelt sich jetzt abgeschwächt: Bis 50 % zählt alles voll, darüber nur noch die Hälfte, höchstens 72 % (vorher 85 %).'],
      ['Balance', 'Treffer abwehren geht höchstens mit 35 % Chance (vorher bis 50 %).'],
      ['Balance', 'Bosse durchschlagen Rüstung: Gegen Bosse wirkt Schadensreduktion nur zu 60 %, Abwehren nur halb so oft und Zurückwerfen nur zu 40 %.'],
      ['Neu', 'Boss-Wut: Nach 25 Sekunden Kampf wird ein Boss alle 5 Sekunden um 20 % stärker und leuchtet rot. Ein einzelner Held kann ihn so nicht mehr ewig aufhalten.'],
      ['Balance', 'Gegner ab der 1. Wiedergeburt etwas leichter (ca. 10–15 % weniger Leben und Schaden).'],
      ['Balance', 'Zum Ausgleich macht der Wächter 50 % mehr Grundschaden (6 statt 4).'],
    ] },
    { id: 19, date: '13.10.2026', title: 'Großes Grafik-Update', items: [
      ['Neu', 'Alle 15 Gebiete haben jetzt eine eigene, handgezeichnete Umgebung mit mehreren Ebenen, die sich beim Laufen unterschiedlich schnell bewegen.'],
      ['Neu', 'Wetter und Stimmung: Schmetterlinge, Glühwürmchen, Lichtstrahlen, Nebel, Regen, Schnee, Glut, Sandsturm, Polarlicht, Sternschnuppen, Seelenlichter und mehr.'],
      ['Neu', 'Neue Requisiten: Bäume, Grabsteine, Kerzen, Vulkane, Kristalle, Laternen, Kathedralen, Goldberge, Schatztruhen, Gebetsfahnen …'],
      ['Neu', 'Jedes Gebiet hat eine eigene Licht-Stimmung, die auch Helden und Gegner einfärbt. Weiche Schatten unter allen Figuren.'],
      ['Neu', 'Bosse stehen auf einem leuchtenden Zauberkreis, Elite-Gegner haben einen Ring am Boden.'],
      ['Neu', 'Lager bei Nacht und der Turm als Innenraum mit Fenstern und Fackeln wurden neu gestaltet. Die Albtraum-Stufen sind düster rot.'],
      ['Info', 'Auf langsamen Geräten schaltet das Spiel automatisch ein paar Effekte ab, damit es flüssig bleibt.'],
    ] },
    { id: 18, date: '13.10.2026', title: 'Bessere Runen von späteren Bossen', items: [
      ['Balance', 'Bosse lassen bessere Runen fallen, je weiter du bist, immer in einem Bereich: bis Stufe 24 nur I, ab 25 I–II, ab 50 II–III, ab 75 II–IV, ab 100 III–V, ab 150 V–VII (die niedrigste kommt am häufigsten).'],
      ['Info', 'Höhere Runen geben beim Zerstören jeweils dreimal so viele Splitter wie die Stufe darunter (I: 1, II: 3, III: 9, IV: 27 …).'],
    ] },
    { id: 17, date: '13.10.2026', title: 'Endlos-Fertigkeiten ausgeglichen', items: [
      ['Balance', 'Schützin und Assassine: +2 % Krit-Chance (statt 1 %) und +12 % Krit-Schaden (statt 6 %) je Stufe.'],
      ['Balance', 'Priesterin und Barde: +3 % Angriffstempo je Stufe (statt 1,5 %).'],
      ['Balance', 'Magier und Tüftlerin: +6 % Fähigkeiten-Schaden je Stufe (statt 5 %).'],
      ['Balance', 'Tierbändiger und Nekromant: +4 % Gold (statt 3 %) und 0,1 % Heilung pro Sekunde (statt 0,04 %) je Stufe.'],
      ['Balance', 'Gold-Endlos-Fertigkeiten kosten am Anfang weniger: 2.500 bis 4.000 Gold statt bis zu 10.000.'],
      ['Info', 'Wächter und Druidin bleiben gleich, weil sich ihre Stufen gegenseitig verstärken.'],
    ] },
    { id: 16, date: '13.10.2026', title: 'Sterne zurück & Zurücksetzen-Knopf', items: [
      ['Umstellung', 'Wegen der Heldenblut-Änderungen wurde der Sternen-Laden bei allen einmal zurückgesetzt. Alle ausgegebenen Sterne gab es zurück.'],
      ['Neu', 'Im Sternen-Laden gibt es einen Knopf „Sternen-Laden zurücksetzen“: Du bekommst alle Sterne zurück und kannst sie jederzeit im Lager neu verteilen.'],
    ] },
    { id: 15, date: '13.10.2026', title: 'Heldenblut, Runen-Lager & neue Reihenfolge', items: [
      ['Balance', 'Heldenblut gibt +10 % statt +15 % Schaden und Leben je Stufe. Die Gegner bleiben so stark wie bisher.'],
      ['Neu', 'Runen-Lager erweitern: Im Runenschmied kaufst du mit Runensplittern +5 Plätze (10, 20, 40 … Splitter, bis 100 Plätze).'],
      ['Umstellung', '3. Wiedergeburt: Runen, Runen zerstören und Lager erweitern. 4. Wiedergeburt: Verschmelzen und zufällige Runen im Runenschmied. 5. Wiedergeburt: Magier.'],
      ['Info', 'Wer den Magier schon angeheuert hat, behält ihn.'],
    ] },
    { id: 14, date: '13.10.2026', title: 'Heldenblut teurer', items: [
      ['Balance', 'Heldenblut wird jetzt abwechselnd um 1 und 2 Sterne teurer: 1, 2, 4, 5, 7, 8, 10 … Sterne statt 1, 2, 3, 4, 5 … Bereits gekaufte Stufen bleiben.'],
    ] },
    { id: 13, date: '13.10.2026', title: 'Soundeffekte', items: [
      ['Neu', 'Leise, weiche Soundeffekte: Treffer, kritische Treffer, Münzen, Seelen, Runen, Bosse, Fähigkeiten, Kauf, Verschmelzen, Wiedergeburt, Sieg und Niederlage.'],
      ['Neu', 'Mit dem Lautsprecher-Knopf oben rechts schaltest du den Ton an und aus. Die Einstellung bleibt gespeichert.'],
      ['Info', 'Auf dem iPhone und iPad muss der Lautlos-Schalter aus sein, damit man etwas hört.'],
    ] },
    { id: 12, date: '13.10.2026', title: 'Runenschmied & neues Seelen-Symbol', items: [
      ['Neu', 'Runenschmied im Reiter Läden: Runen zerstören gibt Runensplitter. 3 gleiche Runen verschmelzen kostet Splitter und gibt eine Rune der nächsten Stufe.'],
      ['Neu', 'Kurs: Ein Verschmelzen kostet genau so viel, wie 3 zerstörte Runen derselben Stufe geben (Stufe I: 1 Splitter je Rune, 3 fürs Verschmelzen).'],
      ['Neu', 'Der Runenschmied kommt jetzt schon mit der 3. Wiedergeburt (zusammen mit den Runen). Die 5. Wiedergeburt gibt dafür ein größeres Lager mit 60 Plätzen.'],
      ['Neu', 'Neues Symbol für Seelen: eine leuchtende Seelenflamme.'],
      ['Umstellung', 'Runenstaub heißt jetzt Runensplitter. Wegen des neuen Kurses wurde dein Vorrat halbiert, er ist aber genau so viel wert wie vorher.'],
      ['Fix', 'Die Runen-Übersicht bei den Helden sah durch die Schlüsselsockel verschoben aus.'],
    ] },
    { id: 11, date: '13.10.2026', title: 'Beutezug statt Sprungstart', items: [
      ['Umstellung', 'Sprungstart im Sternen-Laden war durch die Gebietswahl überflüssig und ist jetzt „Beutezug“. Alle Sterne für Sprungstart gab es zurück.'],
      ['Neu', 'Beutezug: Startest du in einem späteren Gebiet, bekommst du je Stufe 10 % des Golds der übersprungenen Stufen und 10 % mehr Abkürzungs-Seelen (bis Stufe 10).'],
    ] },
    { id: 10, date: '13.10.2026', title: 'Spielstand auf mehreren Geräten', items: [
      ['Fix', 'Ein Gerät mit altem Stand konnte den neueren Spielstand eines anderen Geräts auf dem Server überschreiben. Jetzt merkt das Spiel, wenn woanders weitergespielt wurde, und fragt, welchen Stand du behalten willst.'],
      ['Fix', 'Abmelden überschreibt keinen neueren Stand mehr.'],
    ] },
    { id: 9, date: '13.10.2026', title: 'Endlos-Stufen zurückerstattet', items: [
      ['Umstellung', 'Wegen der neuen Endlos-Paare wurden alle bisher gekauften Endlos-Stufen (außer beim Ritter) in Gold und Seelen zurückgegeben. Du kannst sie jetzt neu verteilen.'],
    ] },
    { id: 8, date: '13.10.2026', title: 'Seelenaltar & Neuigkeiten', items: [
      ['Neu', 'Seelenaltar im Reiter Läden: Opfere Gold für dauerhaft +15 % Seelen je Stufe (bis Stufe 25). Bleibt auch nach Wiedergeburt und Aufstieg.'],
      ['Neu', 'Dieser Neuigkeiten-Knopf: Hier stehen ab jetzt alle Updates. Ein roter Punkt zeigt, dass es etwas Neues gibt.'],
      ['Info', 'Endlos-Fertigkeiten: In jedem Paar kostet die eine Gold und die andere Seelen.'],
    ] },
    { id: 7, date: '13.10.2026', title: 'Schlüsselsockel & Endlos-Fertigkeiten', items: [
      ['Neu', 'Schlüsselsockel: Jeder Held hat 1 festen Sockel. Pro Wiedergeburt bekommst du 1 freien Sockel, den du auf einen beliebigen Helden setzt. Freie Sockel bleiben auch beim Aufstieg.'],
      ['Neu', 'Endlos-Fertigkeiten wirken jetzt auf die ganze Gruppe und jede Klasse hat ein eigenes Paar: Ritter Schaden/Leben, Wächter Schutz/Zurückwerfen, Schützin Krit-Chance/Krit-Schaden, Priesterin Laufen/Angriffstempo, Magier Fähigkeiten/Abklingzeit, Tierbändiger Gold/Regeneration.'],
      ['Neu', 'Expeditions-Helden teilen sich die Paare: Assassine wie Schützin, Druidin wie Wächter, Barde wie Priesterin, Tüftlerin wie Magier, Nekromant wie Tierbändiger.'],
      ['Balance', 'Ab der 1. Wiedergeburt sind Gegner und besonders Bosse deutlich stärker. Spiel dauert ab dort etwa doppelt so lang.'],
      ['Balance', 'Heldenblut: +15 % statt +20 % je Stufe. Goldader: +15 % statt +25 % je Stufe.'],
      ['Fix', 'Sprungstart springt nur noch bis 10 Stufen unter deinen Rekord seit der letzten Wiedergeburt. Vorher konnte man nach einer Wiedergeburt immer wieder sofort sterben.'],
      ['Umstellung', 'Alle alten Schlüssel wurden abgenommen, Gold und Seelen gab es komplett zurück.'],
    ] },
    { id: 6, date: '13.10.2026', title: 'Neue Gegner', items: [
      ['Neu', 'Jedes der 15 Gebiete hat eigene Gegner mit eigener Fernkampf-Version und eigenen Geschossen.'],
      ['Neu', 'Treffer: Helden leuchten rot auf statt eines roten Kastens.'],
      ['Balance', 'Heilgebet heilt den Ritter um 40 % (+8 % je Stufe), alle anderen nur um 10 % (+3 % je Stufe).'],
      ['Balance', 'Puzzleteile kosten 95 statt 55 Heldensplitter.'],
      ['Fix', 'Seelenernte: Text korrigiert, gemeint war schon immer +25 % Chance zusätzlich.'],
    ] },
    { id: 5, date: '12.10.2026', title: 'Läden & Todesanimation', items: [
      ['Neu', 'Reiter Läden: Alle Läden an einem Ort, sie kommen nach und nach dazu.'],
      ['Neu', 'Gefallene Helden kippen um, bleiben liegen und ein kleiner Geist steigt auf.'],
      ['Neu', 'Schlüssel-Fertigkeiten lassen sich im Lager wieder abnehmen, mit voller Rückerstattung.'],
      ['Balance', 'Seelenernte: dreimal so viele Boss-Seelen, +25 % Elite-Seelen und +50 % Gold.'],
    ] },
  ];
  const newsSeen = () => { try { return Number(localStorage.getItem('fsg.ritter.news')) || 0; } catch { return 0; } };
  const TAGC = { Neu: '#7ee08a', Balance: '#ffcf4a', Fix: '#7fb2ff', Info: '#c9a6ff', Umstellung: '#ff9a8a' };
  function showUpdates() {
    try { localStorage.setItem('fsg.ritter.news', String(UPDATES[0].id)); } catch {}
    hud();
    modal(`<span class="rl-mic">📰</span><h2>Neuigkeiten</h2><p class="note">Spielversion ${UPDATES[0].id}</p><div class="rl-upd">${UPDATES.map((u, i) => `<details ${i === 0 ? 'open' : ''}><summary><b>${esc(u.title)}</b><small>${u.date}</small></summary>
      <ul>${u.items.map(([tag, txt]) => `<li><span class="tag" style="--tc:${TAGC[tag] || '#aaa'}">${tag}</span>${esc(txt)}</li>`).join('')}</ul></details>`).join('')}</div>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Schließen</button></div>`);
  }
  function showInfInfo() {
    const r = S.infNews; delete S.infNews; save();
    modal(`<span class="rl-mic">∞</span><h2>Endlos-Fertigkeiten neu</h2>
      <ul class="rl-list"><li>Jede Klasse hat jetzt ein eigenes Paar Endlos-Fertigkeiten, die auf die ganze Gruppe wirken.</li>
      <li>Deine bisher gekauften Endlos-Stufen wurden zurückgegeben: <b>${coin}${fmt(r.g)}</b> und <b>${soul}${fmt(r.s)}</b>. Damit kannst du sie neu verteilen.</li>
      <li>Die Endlos-Fertigkeiten des Ritters (Schaden und Leben) bleiben unverändert.</li></ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Verstanden</button></div>`);
  }
  // Hinweis bei jedem Start: Testphase
  function openChain() { if (!S.seenIntro) showIntro(); else if (S.news && !cine) showNews(); else if (S.keyNews != null) showKeyInfo(); else if (S.infNews) showInfInfo(); else if (!S.seenField && HEROES.filter(h => hired(S, h.tree)).length > fieldSlots(S)) showFieldInfo(); else if (expOpen(S) && !S.seenExp) showExpInfo(); }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-beta]')) setTimeout(() => { if (active) openChain(); }, 80); }, true);
  let betaShown = false;
  function showBeta() {
    modal(`<span class="rl-mic">🧪</span><h2>Testphase</h2>
      <p>Ritterlauf wird gerade auf <b>Balancing und Design</b> getestet. Deshalb werden <b>alle Spielstände demnächst zurückgesetzt</b>.</p>
      <p class="note">Ihr könnt das Spiel aber trotzdem gerne testen. Über Rückmeldungen freuen wir uns!</p>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok" data-beta="1">Alles klar, los geht's</button></div>`);
  }
  function showKeyInfo() {
    const back = S.keyNews, inf = S.infNews; delete S.keyNews; delete S.infNews; save();
    modal(`<span class="rl-mic">⚿</span><h2>Neu: Schlüsselsockel</h2>
      <ul class="rl-list"><li>Jeder Held hat <b>1 festen Sockel</b> für eine Schlüssel-Fertigkeit.</li>
      <li>Für jede Wiedergeburt bekommst du <b>1 weiteren Sockel</b>, den du auf einen beliebigen Helden setzt. Diese Sockel bleiben auch beim Aufstieg.</li>
      <li>Du hast <b>${kSlots(S)} Sockel</b> zum Verteilen (so viele Wiedergeburten hast du gemacht). Setzen und Abnehmen geht oben im Fertigkeitenbaum jedes Helden.</li>
      ${back ? `<li>Deine ${back} Schlüssel-Fertigkeit${back > 1 ? 'en wurden' : ' wurde'} abgenommen. Gold und Seelen hast du komplett zurück.</li>` : ''}
      ${inf ? `<li><b>Endlos-Fertigkeiten:</b> Jede Klasse hat jetzt ein eigenes Paar. Deine bisherigen Endlos-Stufen (außer beim Ritter) wurden zurückgegeben: <b>${coin}${fmt(inf.g)}</b> und <b>${soul}${fmt(inf.s)}</b>.</li>` : ''}</ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Verstanden</button></div>`);
  }
  function showFieldInfo() {
    S.seenField = true; save();
    const f = fieldOf(S);
    modal(`<span class="rl-mic">⚑</span><h2>Neu: Aufstellung</h2>
      <ul class="rl-list"><li>Auf dem Feld ist jetzt Platz für <b>${fieldSlots(S)} Helden</b>. Die anderen warten am Lagerfeuer. Ihre Fertigkeiten und Runen bleiben erhalten.</li>
      <li>Gerade kämpfen: <b>${f.map(id => HERO_BY_ID[id].name).join(', ')}</b>. Über den Helden-Karten im Lager wechselst du aus.</li>
      <li>Mehr Plätze: <b>Fünfter Platz</b> im Sternen-Laden (40 Sterne) und <b>Sechster Platz</b> im Kronen-Laden (10 Kronen).</li></ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Verstanden</button></div>`);
  }
  function showIntro() {
    S.seenIntro = true; save();
    modal(`<span class="rl-mic">⚔</span><h2>Willkommen im Ritterlauf</h2>
      <ul class="rl-list"><li>Deine Helden kämpfen sich <b>von allein</b> durch Gegnerwellen.</li>
      <li>Nach jedem Lauf verbesserst du sie im <b>Lager</b> mit Gold und Seelen.</li>
      <li>Später kommen <b>Wiedergeburten</b>, neue Klassen, Runen und vieles mehr dazu.</li></ul>
      ${acct ? '' : `<div class="rl-savebox"><b>Wichtig: Sichere deinen Fortschritt!</b><span>Lege im Reiter „Spielstand“ einen Namen und ein Passwort fest. Dann geht nichts verloren und du kannst auf jedem Gerät weiterspielen.</span></div>`}
      <div class="row" style="justify-content:center">${acct ? '' : '<button class="btn" data-m="save">Jetzt Spielstand anlegen</button>'}<button class="btn ghost" data-m="ok">${acct ? 'Los geht’s' : 'Später'}</button></div>`);
  }
  function newsList(n) {
    const items = [];
    if (n.kind === 'rebirth') {
      const road = ROADMAP.find(x => x.r === n.n);
      if (road) items.push(road.text);
      items.push(`Stufen bis ${capOf(S) === Infinity ? '∞ (Albtraum-Stufen)' : capOf(S)} sind jetzt offen`);
      items.push(`+1 Schlüsselsockel (jetzt ${kSlots(S)}), den du auf einen beliebigen Helden setzen kannst`);
      items.push(`+${n.stars} Sterne für den Sternen-Laden`);
      const nextR = ROADMAP.find(x => x.r === n.n + 1);
      if (nextR) items.push(`Nächste Wiedergeburt ab Stufe ${reqOf(S)}: ${nextR.text}`);
      if (n.n >= 9) items.push('Der Aufstieg ist jetzt möglich, sobald du Stufe 150 erreichst');
    } else {
      items.push(`+${n.crowns} Kronen für den Kronen-Laden`);
      if (n.n === 1) items.push('Neuer Reiter Expedition: Missionen geben Heldensplitter und Puzzleteile für 5 neue Helden');
      const road = ASC_ROAD.find(x => x.a === n.n); if (road) items.push(road.text);
      items.push(`Gegner sind jetzt ×${Math.pow(1.6, n.n).toFixed(1).replace('.', ',')} so stark wie am Anfang`);
      items.push('Der Wiedergeburt-Fahrplan beginnt von vorn – mit deinen Kronen-Boni geht es viel schneller');
    }
    return items;
  }
  function showNews() {
    const n = S.news; if (!n) return;
    S.news = null; save();
    const title = n.kind === 'asc' ? `Aufstieg ${n.n}!` : `Wiedergeburt ${n.n}!`;
    modal(`<span class="rl-mic ${n.kind === 'asc' ? 'crown' : ''}">${n.kind === 'asc' ? '♛' : '✦'}</span><h2>${title}</h2><p class="note">Das ist neu:</p>
      <ul class="rl-list">${newsList(n).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="row" style="justify-content:center"><button class="btn" data-m="ok">Weiter</button></div>`);
  }
  /* ---------- Ahnenprüfung: Karte, Missionen, Siegel ---------- */
  let ahnSel = null;
  // Schwebende Inseln im All, Mission 10 ist das Schloss der Ahnen
  const AHN_PTS = [[58, 322], [148, 284], [90, 206], [176, 142], [268, 188], [338, 274], [430, 306], [432, 216], [366, 124], [516, 150]];
  const ahnRnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function ahnIslandTop(i, c) {
    // Themen-Akzente auf der Insel (Koordinaten: Mitte der Oberseite = 0,0)
    const g = [];
    const tree = (x, s, a, b) => `<g transform="translate(${x},0) scale(${s})"><rect x="-1.2" y="-6" width="2.4" height="6" fill="#6b4a2c"/><circle cy="-10" r="6" fill="${a}"/><circle cx="-3" cy="-8" r="4" fill="${b}"/></g>`;
    const pine = (x, s, a) => `<g transform="translate(${x},0) scale(${s})"><rect x="-1" y="-4" width="2" height="4" fill="#3a2a1a"/><path d="M0,-20 L7,-4 L-7,-4 Z" fill="${a}"/><path d="M0,-25 L5,-12 L-5,-12 Z" fill="${a}" opacity=".85"/></g>`;
    switch (i) {
      case 0: g.push(tree(-12, 1, '#5fc45a', '#8ae07a'), tree(10, 0.8, '#4fae4e', '#7ed06e'), `<circle cx="-2" cy="-2" r="1.6" fill="#ffd23f"/><circle cx="4" cy="-1.5" r="1.4" fill="#ff8ab8"/><circle cx="18" cy="-2" r="1.5" fill="#fff"/>`); break;
      case 1: g.push(pine(-14, 1, '#1f5a3a'), pine(-2, 1.25, '#174a30'), pine(12, 0.95, '#226240'), `<circle cx="4" cy="-14" r="1.5" fill="#ffe58a"/><circle cx="7" cy="-14" r="1.5" fill="#ffe58a"/>`); break;
      case 2: g.push(`<path d="M-16,0 v-10 a5,5 0 0 1 10,0 v10 Z" fill="#8a84a8" stroke="#3a3450" stroke-width="1"/><path d="M4,0 v-8 h3 v-4 h3 v4 h3 v8 Z" fill="#a49ec0" stroke="#3a3450" stroke-width="1"/><path d="M-4,-1 h8 M-2,-3 l4,4" stroke="#e8e2d0" stroke-width="1.6"/><circle cx="-11" cy="-18" r="3" fill="#c9a6ff" opacity=".8"/>`); break;
      case 3: g.push(`<path d="M-18,0 L-2,-22 L4,-18 L16,0 Z" fill="#4a2a24" stroke="#1b0e0c" stroke-width="1.2"/><path d="M-5,-18 L-2,-22 L4,-18 L1,-14 Z" fill="#ff7a3d"/><path d="M-1,-14 Q2,-6 -3,0" stroke="#ffb547" stroke-width="2" fill="none"/><circle cx="1" cy="-26" r="3" fill="#ff9a3d" opacity=".7" class="ahn-smoke"/>`); break;
      case 4: g.push(`<path d="M-16,0 L-10,-16 L-6,-4 L0,-24 L5,-6 L10,-14 L16,0 Z" fill="#dff4ff" stroke="#6e8ba3" stroke-width="1"/><path d="M-3,-3 l3,-12 l3,12 Z" fill="#9fe0ff"/>`); break;
      case 5: g.push(`<ellipse cx="2" cy="-2" rx="14" ry="3.5" fill="#3a6a5a"/><ellipse cx="2" cy="-2.5" rx="10" ry="2" fill="#5a9a7a"/><path d="M-14,0 v-12 M-11,0 v-9 M14,0 v-11" stroke="#6a8a4a" stroke-width="1.5"/><ellipse cx="-14" cy="-13" rx="1.4" ry="3" fill="#8a5a2b"/><ellipse cx="14" cy="-12" rx="1.4" ry="3" fill="#8a5a2b"/><ellipse cx="0" cy="-10" rx="18" ry="4" fill="#c8e8d0" opacity=".25"/>`); break;
      case 6: g.push(`<path d="M-16,0 C-14,-14 -4,-6 -8,-20 M8,0 C12,-12 2,-10 6,-22 M-2,0 C0,-8 4,-6 2,-14" stroke="#3a6a2a" stroke-width="2.2" fill="none"/><circle cx="-8" cy="-20" r="3" fill="#ff6b9a"/><circle cx="6" cy="-22" r="3" fill="#ff8ab8"/><circle cx="2" cy="-14" r="2.4" fill="#ff6b9a"/>`); break;
      case 7: g.push(`<path d="M-10,0 v-14 l5,-6 l5,6 v14 Z M2,0 v-20 l5,-10 l5,10 v20 Z" fill="#3a2a5a" stroke="#1a1030" stroke-width="1"/><rect x="5" y="-16" width="4" height="5" rx="2" fill="#ffd27a"/><path d="M-20,-24 q3,-3 6,0 q3,-3 6,0" stroke="#2a1a3a" stroke-width="1.5" fill="none"/>`); break;
      case 8: g.push(`<path d="M-14,0 v-8 a14,12 0 0 1 28,0 v8 Z" fill="#e8e0ff" stroke="#4a3a7a" stroke-width="1.2"/><path d="M2,-16 l14,-10" stroke="#5a4a8a" stroke-width="3"/><circle cx="-6" cy="-24" r="1.6" fill="#fff"/><circle cx="12" cy="-30" r="1.2" fill="#ffd27a"/>`); break;
    }
    return g.join('');
  }
  function ahnIsland(i, x, y, st) {
    const M = AHN_MISSIONS[i], c = M.col, last = i === AHN_COUNT - 1, w = last ? 62 : 34, d = last ? 50 : 30;
    const glowA = st === 'done' ? 0.55 : st === 'cur' ? 0.75 : 0.35;
    if (last) return ahnCastle(x, y, st);
    let rocks = `<path d="M${-w},0 Q${-w * 0.7},${d * 0.5} ${-w * 0.35},${d * 0.7} L${-w * 0.15},${d} L0,${d * 1.25} L${w * 0.2},${d * 0.95} L${w * 0.45},${d * 0.6} Q${w * 0.8},${d * 0.4} ${w},0 Z" fill="url(#ahnRock)" stroke="#5a4a3a" stroke-width="1.2"/>`;
    rocks += `<path d="M${-w * 0.5},${d * 0.25} L${-w * 0.2},${d * 0.55} L${w * 0.05},${d * 0.4} M${w * 0.25},${d * 0.2} L${w * 0.1},${d * 0.7}" stroke="#ffd27a" stroke-width="1.2" fill="none" opacity=".8"/>`;
    rocks += `<path d="M${-w * 0.3},${d * 0.75} l2,8 l2,-8 M${w * 0.3},${d * 0.55} l1.5,7 l1.5,-7" fill="${c}" stroke="${c}" stroke-width="1" opacity=".9"/>`;
    return `<g class="ahn-isl" style="animation-delay:${-ahnRnd(i) * 6}s">
      <ellipse cx="0" cy="${d * 0.6}" rx="${w * 1.5}" ry="${d * 1.1}" fill="${c}" opacity="${glowA * 0.35}" filter="url(#ahnBlur)"/>
      ${rocks}
      <ellipse cx="0" cy="0" rx="${w}" ry="${w * 0.28}" fill="url(#ahnTop)" stroke="#fff6d8" stroke-width="1.4"/>
      <ellipse cx="0" cy="-1" rx="${w * 0.86}" ry="${w * 0.2}" fill="${c}" opacity=".55"/>
      ${ahnIslandTop(i, c)}
    </g>`;
  }
  function ahnCastle(x, y, st) {
    const tower = (tx, h, w, cap) => `<g transform="translate(${tx},0)"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" fill="url(#ahnWall)" stroke="#8a6a2a" stroke-width="1"/>
      <path d="M${-w / 2 - 2},${-h} L0,${-h - cap} L${w / 2 + 2},${-h} Z" fill="url(#ahnGold)" stroke="#8a6a2a" stroke-width="1"/><rect x="-1.5" y="${-h + 6}" width="3" height="6" rx="1.5" fill="#ffe8a8"/>
      <path d="M0,${-h - cap} v-8" stroke="#ffd27a" stroke-width="1"/><path d="M0,${-h - cap - 8} l7,2.5 l-7,2.5 Z" fill="#c9a6ff"/></g>`;
    return `<g class="ahn-isl" style="animation-delay:-2s">
      <g class="ahn-rays" opacity="${st === 'done' ? 0.6 : 0.85}">${[...Array(10)].map((_, k) => `<path d="M0,-50 L${Math.cos(k * 0.628) * 140},${-50 + Math.sin(k * 0.628) * 140} L${Math.cos(k * 0.628 + 0.12) * 140},${-50 + Math.sin(k * 0.628 + 0.12) * 140} Z" fill="#ffe8a8" opacity=".12"/>`).join('')}</g>
      <circle cx="0" cy="-50" r="70" fill="url(#ahnHalo)"/>
      <path d="M-70,0 Q-52,26 -28,34 L-10,52 L0,66 L12,50 L32,32 Q56,20 70,0 Z" fill="url(#ahnRock)" stroke="#8a6a2a" stroke-width="1.4"/>
      <path d="M-40,12 L-20,30 L0,22 M24,10 L12,40" stroke="#ffd27a" stroke-width="1.6" fill="none"/>
      <path d="M-18,40 l2,12 l2,-12 M20,30 l2,10 l2,-10 M0,60 l1.5,9 l1.5,-9" fill="#ffd27a" stroke="#ffd27a"/>
      <ellipse cx="0" cy="0" rx="70" ry="16" fill="url(#ahnTop)" stroke="#fff6d8" stroke-width="1.6"/>
      <rect x="-40" y="-26" width="80" height="26" fill="url(#ahnWall)" stroke="#8a6a2a" stroke-width="1"/>
      ${[...Array(9)].map((_, k) => `<rect x="${-40 + k * 9.4}" y="-30" width="5" height="5" fill="#fff4dc" stroke="#8a6a2a" stroke-width=".6"/>`).join('')}
      ${tower(-46, 46, 14, 16)}${tower(46, 46, 14, 16)}${tower(-24, 64, 12, 14)}${tower(24, 64, 12, 14)}${tower(0, 86, 18, 22)}
      <path d="M-8,0 v-14 a8,8 0 0 1 16,0 v14 Z" fill="#3a2a10" stroke="#8a6a2a" stroke-width="1"/><path d="M-6,-1 v-12 a6,6 0 0 1 12,0 v12" fill="#ffd27a" opacity=".55"/>
      <path d="M-12,-104 l-4,-9 l7,4 l5,-10 l4,10 l7,-4 l-4,9 Z" transform="translate(4,0)" fill="#ffd27a" stroke="#8a6a2a" stroke-width="1" class="ahn-crown"/>
    </g>`;
  }
  function ahnMap() {
    const cur = S.ahn.m, sel = ahnSel == null ? cur : ahnSel;
    const stars = [...Array(90)].map((_, i) => { const r = ahnRnd(i * 3 + 1); return `<circle cx="${(ahnRnd(i * 7 + 2) * 600).toFixed(1)}" cy="${(ahnRnd(i * 11 + 5) * 380).toFixed(1)}" r="${(0.4 + r * 1.3).toFixed(2)}" fill="${r > 0.85 ? '#ffe8b0' : r > 0.7 ? '#c9d8ff' : '#fff'}" class="${i % 3 ? '' : 'ahn-tw'}" style="animation-delay:${(-r * 4).toFixed(2)}s"/>`; }).join('');
    const bridges = AHN_PTS.slice(1).map(([x1, y1], i) => { const [x0, y0] = AHN_PTS[i], mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 26, done = i < cur;
      return `<path d="M${x0},${y0} Q${mx},${my} ${x1},${y1}" fill="none" stroke="${done ? '#7fd4ff' : '#ffd27a'}" stroke-width="5" opacity="${done ? 0.35 : 0.18}" filter="url(#ahnBlur2)"/>
        <path d="M${x0},${y0} Q${mx},${my} ${x1},${y1}" fill="none" stroke="${done ? '#bfeaff' : i === cur - 0 ? '#ffe8a8' : 'rgba(255,232,168,.5)'}" stroke-width="1.6" stroke-dasharray="2 6" stroke-linecap="round" class="ahn-flow"/>`; }).join('');
    const isl = AHN_PTS.map(([x, y], i) => {
      const st = i < cur ? 'done' : i === cur ? 'cur' : 'later', last = i === AHN_COUNT - 1, M = AHN_MISSIONS[i];
      const bx = last ? 0 : 0, by = last ? 30 : 22, col = st === 'done' ? '#4fc3ff' : '#e5484d';
      return `<g class="ahn-node ${st} ${i === sel ? 'sel' : ''}" data-ahn="${i}" transform="translate(${x},${y})" role="button" aria-label="Mission ${i + 1}: ${esc(M.name)}">
        ${ahnIsland(i, x, y, st)}
        <g transform="translate(${bx},${by})">${st === 'cur' ? `<circle r="15" fill="none" stroke="#ffb0b0" stroke-width="2.5" class="ahn-pulse"/>` : ''}
          <circle r="10" fill="${col}" stroke="#fff6d8" stroke-width="2"/><text y="3.8" text-anchor="middle" class="ahn-num">${st === 'done' ? '✓' : i + 1}</text></g>
        ${st === 'cur' ? `<g transform="translate(0,${last ? -128 : -46})"><g class="ahn-hero"><path d="M0,9 L-6,-2 L6,-2 Z" fill="#ffb547" stroke="#1b1726" stroke-width="1.4"/><circle cy="-6" r="6.5" fill="#ffb547" stroke="#1b1726" stroke-width="1.4"/><text y="-3" text-anchor="middle" font-size="8.5" fill="#2a1a00">⚔</text></g></g>` : ''}
        ${i === sel ? `<ellipse cx="0" cy="${last ? 0 : 0}" rx="${last ? 76 : 40}" ry="${last ? 20 : 12}" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="3 4" class="ahn-selring"/>` : ''}
      </g>`;
    }).join('');
    return `<div class="ahn-map"><svg viewBox="0 0 600 380" role="img" aria-label="Sternenkarte der Ahnenprüfung">
      <defs>
        <radialGradient id="ahnSpace" cx=".55" cy=".35" r=".9"><stop offset="0" stop-color="#1e1446"/><stop offset=".55" stop-color="#0c0824"/><stop offset="1" stop-color="#04030c"/></radialGradient>
        <linearGradient id="ahnRock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ead2"/><stop offset=".45" stop-color="#c8b48a"/><stop offset="1" stop-color="#6a5a46"/></linearGradient>
        <linearGradient id="ahnTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e8d8b0"/></linearGradient>
        <linearGradient id="ahnWall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#f0e2c0"/><stop offset="1" stop-color="#cdb888"/></linearGradient>
        <linearGradient id="ahnGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset="1" stop-color="#d8a040"/></linearGradient>
        <radialGradient id="ahnHalo"><stop offset="0" stop-color="#fff2c8" stop-opacity=".55"/><stop offset=".6" stop-color="#ffd27a" stop-opacity=".15"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
        <filter id="ahnBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
        <filter id="ahnBlur2"><feGaussianBlur stdDeviation="2.5"/></filter>
        <filter id="ahnNeb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
      </defs>
      <rect width="600" height="380" fill="url(#ahnSpace)"/>
      <g filter="url(#ahnNeb)" opacity=".75"><ellipse cx="120" cy="90" rx="120" ry="60" fill="#5a2a9a"/><ellipse cx="470" cy="250" rx="130" ry="60" fill="#1a5a7a"/><ellipse cx="320" cy="120" rx="90" ry="40" fill="#8a3a6a" opacity=".6"/><ellipse cx="540" cy="60" rx="80" ry="50" fill="#b08a3a" opacity=".5"/></g>
      ${stars}
      <path d="M-20,60 L60,30" stroke="#fff" stroke-width="1.4" stroke-linecap="round" class="ahn-shoot"/>
      <circle cx="552" cy="320" r="22" fill="#6a4aa8"/><circle cx="544" cy="314" r="22" fill="#8a6ac8" opacity=".5"/><ellipse cx="552" cy="320" rx="36" ry="7" fill="none" stroke="#c9a6ff" stroke-width="1.5" opacity=".7" transform="rotate(-15 552 320)"/>
      ${bridges}
      ${isl}
    </svg></div>`;
  }
  function ahnAbilChips(ph) { return ph.map((p, i) => `<span class="ahn-ph"><b>P${i + 1}</b>${[...p.a.map(id => AHN_ABIL[id].name), ...Object.entries(p.t || {}).map(([k, v]) => AHN_TRAIT[k] ? AHN_TRAIT[k](v) : '')].filter(Boolean).join(' · ') || 'Grundangriff'}</span>`).join(''); }
  function ahnTab() {
    if (!ahnOpen(S)) return '<p class="note">Die Ahnenprüfung wird mit der 6. Wiedergeburt freigeschaltet.</p>';
    const cur = S.ahn.m, sel = ahnSel == null ? cur : Math.max(0, Math.min(AHN_COUNT - 1, ahnSel)), M = AHN_MISSIONS[sel], lvl = S.ahn.lvl || ahnLevelFor(S);
    const state = sel < cur ? 'done' : sel === cur ? 'cur' : 'later';
    const bosses = ahnBossesOf(sel);
    let html = `<div class="ahn-head"><div><h3 class="rl-h3">Ahnenprüfung</h3>
      <p class="note">10 Missionen mit je 5 Bossen, jeder mit 3 Phasen. Am Ende der Kette wartet der Urahn, und wer ihn besiegt, bekommt ein <b>Ahnensiegel</b>. Danach beginnt die Prüfung von vorne, so oft du willst.</p></div>
      <div class="ahn-stats"><span class="ahn-sig">✦ <b>${S.ahn.sig}</b> Siegel frei</span><span class="note">insgesamt ${S.ahn.got} erhalten</span></div></div>`;
    html += ahnMap();
    html += `<div class="ahn-mission" style="--mc:${M.col}"><div class="ahn-mhead"><span class="ahn-mnum">${sel + 1}</span><div><b>${esc(M.name)}</b><small>${esc(M.desc)}</small></div>
      <span class="ahn-state ${state}">${state === 'done' ? 'Geschafft' : state === 'cur' ? 'Nächste Mission' : 'Noch gesperrt'}</span></div>
      <ol class="ahn-bosses">${bosses.map((d, i) => `<li class="${d.ahne ? 'ahne' : ''}" style="--bc:${d.tint || '#ffd27a'}"><span class="ahn-bi">${d.ahne ? '♛' : i + 1}</span><div><b>${esc(d.name)}</b><i>„${esc(d.quote)}“</i><div class="ahn-phs">${ahnAbilChips(d.ph)}</div></div></li>`).join('')}</ol>
      <p class="note">Vor jedem Boss kommen 2 Wellen Diener. Nach jedem Boss stehen gefallene Helden wieder auf. Scheitert die Mission, fängst du sie neu an. Gegnerstärke: <b>Stufe ${lvl}</b> (80 % deines höchsten Rekords überhaupt${S.ahn.lvl ? ', festgelegt für diese Prüfung' : ', wird beim Start festgelegt'}).</p>
      <div class="row">${state === 'cur' ? `<button class="btn gold" data-rl="ahnstart" ${inCamp() ? '' : 'disabled'}>Mission ${sel + 1} starten</button>` : ''}${ahnSel != null && ahnSel !== cur ? '<button class="btn ghost small" data-rl="ahncur">Zur nächsten Mission</button>' : ''}</div></div>`;
    // Siegel setzen
    const hiredH = HEROES.filter(h => hired(S, h.tree));
    html += `<div class="ahn-sigils"><h3 class="rl-h3">Ahnensiegel</h3><p class="note">Ein Siegel setzt du auf einen Helden. Sein Fertigkeitenbaum wächst dann nach unten: 5 passive Fähigkeiten, 3 Siegel-Fähigkeiten mit einem eigenen Platz und 4 Siegel-Schlüssel mit einem eigenen Sockel. Die neuen Knoten kaufst du wie alle anderen mit Gold und Seelen. Das Siegel bleibt bei Wiedergeburt und Aufstieg auf dem Helden.</p>
      <div class="ahn-sgrid">${hiredH.map(h => { const on = S.ahn.place[h.id]; return `<button class="ahn-sh ${on ? 'on' : ''}" style="--hc:${h.color}" data-sig="${h.id}" ${on || S.ahn.sig <= 0 ? 'disabled' : ''}><span class="pt">${PORTRAIT[h.id]}</span><b>${h.name}</b><small>${on ? '✦ Siegel gesetzt' : S.ahn.sig > 0 ? 'Siegel setzen' : 'kein Siegel frei'}</small></button>`; }).join('')}</div></div>`;
    if (acct && acct.tester && hiredH.some(h => S.ahn.place[h.id])) html += `<div class="rl-test"><b>🧪 Test</b> <button class="btn ghost small" data-rl="tahnsigclear">Alle Siegel von den Helden nehmen (Siegel kommen zurück)</button></div>`;
    if (acct && acct.tester) html += `<div class="rl-test"><b>🧪 Test</b> <button class="btn small" data-rl="tahnwin">Aktuelle Mission als geschafft werten</button> <button class="btn small" data-rl="tahnsig">+1 Siegel</button> <span class="note">Boss direkt starten:</span> ${ahnBossesOf(S.ahn.m).map((d, i) => `<button class="btn ghost small" data-rl="tahnboss" data-bi="${i}" title="${esc(d.name)}">${d.ahne ? '♛' : i + 1}</button>`).join('')} <button class="btn ghost small" data-rl="tahnreset">Prüfung zurücksetzen</button></div>`;
    return html;
  }
  function ahnAction(a, b) {
    if (a === 'ahnstart' || a === 'tahnboss') {
      if (!inCamp() || !ahnOpen(S)) return true;
      if (a === 'tahnboss' && !(acct && acct.tester)) return true;
      startRun('ahnen');
      if (a === 'tahnboss' && run && run.ahn) { const n = ahnBossesOf(run.ahn.mi).length; run.ahn.bi = Math.min(n - 1, b.dataset.bi != null ? Number(b.dataset.bi) : n - 1); run.ahn.wave = AHN_TUNE.waves; spawnWave(run); }
      save(); $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' }); return true;
    }
    if (a === 'ahncur') { ahnSel = null; panel(); return true; }
    if (!(acct && acct.tester) || !/^tahn/.test(a)) return false;
    if (a === 'tahnwin') { const r = ahnClaim(S, { victory: true, ahn: { mi: S.ahn.m } }); ahnSel = null; if (r && r.sigil) sigilGot(); else toast(`Mission ${r.mission + 1} als geschafft gewertet`); afterChange(); }
    if (a === 'tahnsigclear') { for (const id of Object.keys(S.ahn.place)) { const h = HERO_BY_ID[id]; delete S.ahn.place[id]; S.ahn.sig++; S.equip = S.equip.filter(x => !(NODE[x].sig && NODE[x].tree === h.tree)); for (const n of NODES) if (n.sig && n.tree === h.tree) delete S.nodes[n.id]; } toast('Siegel zurückgenommen'); afterChange(); }
    if (a === 'tahnsig') { S.ahn.sig++; S.ahn.got++; toast('+1 Ahnensiegel'); afterChange(); }
    if (a === 'tahnreset') { S.ahn = ahnFix(); ahnSel = null; toast('Ahnenprüfung zurückgesetzt'); afterChange(); }
    return true;
  }
  function ahnClick(e) {
    const n = e.target.closest('[data-ahn]');
    if (n) { ahnSel = Number(n.dataset.ahn); SND.play('tick'); panel(); return true; }
    const sg = e.target.closest('[data-sig]');
    if (sg) { const h = HERO_BY_ID[sg.dataset.sig]; if (placeSigil(S, h.id)) { SND.play('forge'); toast(`Ahnensiegel auf ${h.name} gesetzt`, true); afterChange(); } return true; }
    return false;
  }
  function sigilGot() {
    SND.play('rebirth');
    modal(`<span class="rl-mic ahn-mic">✦</span><h2>Ahnensiegel erhalten!</h2>
      <p>Der Urahn ist besiegt. Du hast jetzt <b>${S.ahn.sig}</b> freie${S.ahn.sig === 1 ? 's' : ''} Siegel.</p>
      <p class="note">Setze es im Reiter Ahnenprüfung auf einen Helden. Die Prüfung beginnt jetzt von vorne, mit neu festgelegter Gegnerstärke.</p>
      <button class="btn gold" data-m="ok">Weiter</button>`);
  }
  function ahnEndInfo() {
    const A = run.ahn, M = AHN_MISSIONS[A.mi], list = ahnBossesOf(A.mi), r = run.ahnReward;
    if (run.victory) return `<div class="rl-dead win"><b>Mission ${A.mi + 1} geschafft: ${esc(M.name)}</b><span>${r && r.sigil ? '✦ Ahnensiegel erhalten!' : `Weiter geht es mit Mission ${A.mi + 2}: ${esc(AHN_MISSIONS[Math.min(AHN_COUNT - 1, A.mi + 1)].name)}`}</span><span class="note">Alle Bosse besiegt. Die Karte findest du im Reiter Ahnenprüfung.</span></div>`;
    const d = list[A.bi], bs = A.boss;
    return `<div class="rl-dead"><b>Mission ${A.mi + 1} gescheitert</b><span>${A.wave < AHN_TUNE.waves || !d ? `Bei den Dienern vor Boss ${A.bi + 1}` : `Bei ${esc(d.name)} (Boss ${A.bi + 1} von ${list.length}${bs ? `, Phase ${bs.phase + 1}` : ''})`}</span><span class="note">Die Mission fängt beim nächsten Versuch von vorne an. Stärkere Runen oder eine andere Aufstellung helfen.</span></div>`;
  }

  /* ================= Zeichnen ================= */
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const OUT = 'rgba(20,14,30,.85)';
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fillO(c) { ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke(); }
  function shadow(x, w) { const pa = ctx.globalAlpha; ctx.globalAlpha = pa * 0.45; ctx.drawImage(glowSprite('0,0,0'), x - w * 1.2, GROUND + 2 - 5, w * 2.4, 10); ctx.globalAlpha = pa; }

  function sky(bm, t, night) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, night ? '#141a33' : bm.sky[0]); g.addColorStop(1, night ? '#3d3157' : bm.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Sonne oder Mond mit Schein
    const sx = night ? 440 : 400, sy = night ? 46 : 70, sc = night ? '#f3ecd8' : bm.sun;
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90); glow.addColorStop(0, sc + 'aa'); glow.addColorStop(1, sc + '00');
    ctx.fillStyle = glow; ctx.fillRect(sx - 90, sy - 90, 180, 180);
    ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(sx, sy, night ? 14 : 18, 0, 7); ctx.fill();
    if (night) { ctx.fillStyle = '#141a33'; ctx.beginPath(); ctx.arc(sx + 6, sy - 4, 12, 0, 7); ctx.fill(); }
    if (night || bm.prop === 'grab') for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * hash(i) * (0.6 + 0.4 * Math.sin(t * 2 + i))})`; ctx.fillRect(hash(i + 3) * W, hash(i + 7) * 130, 1.4, 1.4); }
    // Wolken
    if (!night && bm.prop !== 'grab') for (let i = 0; i < 4; i++) {
      const cx = ((hash(i) * W + t * (6 + i * 3)) % (W + 120)) - 60, cy = 30 + hash(i + 9) * 60;
      ctx.fillStyle = bm.prop === 'lava' ? 'rgba(60,30,30,.35)' : 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.ellipse(cx, cy, 34, 9, 0, 0, 7); ctx.ellipse(cx + 18, cy - 6, 18, 9, 0, 0, 7); ctx.ellipse(cx - 16, cy - 3, 14, 7, 0, 0, 7); ctx.fill();
    }
  }
  function range(color, par, base, amp, freq, scroll, sharp) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 6) {
      const wx = x + scroll * par;
      const y = sharp ? base - Math.abs(Math.sin(wx * freq)) * amp - Math.abs(Math.sin(wx * freq * 2.7 + 2)) * amp * 0.35
        : base - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.3 + 1) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.fill();
  }
  function ground(bm, scroll, night) {
    const g = ctx.createLinearGradient(0, GROUND, 0, H);
    g.addColorStop(0, night ? '#3a2d22' : bm.ground[0]); g.addColorStop(1, night ? '#211912' : bm.ground[1]);
    ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, GROUND, W, 2);
    for (let i = 0; i < 26; i++) {
      const wx = ((i * 37 - scroll) % (W + 40) + W + 40) % (W + 40) - 20;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(wx, GROUND + 10 + hash(i) * 30, 4 + hash(i + 1) * 6, 2, 0, 0, 7); ctx.fill();
    }
  }
  function props(bm, scroll, t) {
    for (let k = Math.floor(scroll / 90) - 1; k < Math.floor(scroll / 90) + 7; k++) {
      if (hash(k * 3.7) < 0.45) continue;
      const x = k * 90 + hash(k) * 50 - scroll, y = GROUND, s = 0.7 + hash(k + 2) * 0.5;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      if (bm.prop === 'baum') { ctx.fillStyle = '#6b4a2c'; ctx.fillRect(-3, -26, 6, 26); ctx.fillStyle = '#4f9a48'; ctx.beginPath(); ctx.arc(0, -34, 16, 0, 7); ctx.arc(-10, -26, 11, 0, 7); ctx.arc(10, -27, 11, 0, 7); ctx.fill(); }
      else if (bm.prop === 'tanne') { ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-2, -14, 4, 14); ctx.fillStyle = '#1e4a33'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 3, -10 - i * 12); ctx.lineTo(0, -34 - i * 12); ctx.lineTo(14 - i * 3, -10 - i * 12); ctx.fill(); } }
      else if (bm.prop === 'grab') { ctx.fillStyle = '#5b5470'; rr(-8, -24, 16, 24, 7); ctx.fill(); ctx.fillStyle = '#3a3448'; ctx.fillRect(-1, -19, 2, 9); ctx.fillRect(-4, -16, 8, 2); }
      else if (bm.prop === 'lava') { const gl = 0.5 + 0.3 * Math.sin(t * 3 + k); ctx.fillStyle = `rgba(255,120,40,${gl})`; ctx.beginPath(); ctx.ellipse(0, 4, 22, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1714'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-4, -18); ctx.lineTo(4, -10); ctx.lineTo(10, 0); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(160,210,255,.85)'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-2, -26); ctx.lineTo(4, -18); ctx.lineTo(7, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-2, -20, 2, 12); }
      ctx.restore();
    }
    if (bm.prop === 'kristall') for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect((hash(i) * W + t * 10) % W, (hash(i + 4) * H + t * (20 + hash(i) * 20)) % GROUND, 2, 2); }
    if (bm.prop === 'lava') for (let i = 0; i < 16; i++) { ctx.fillStyle = 'rgba(255,170,80,.7)'; ctx.fillRect((hash(i) * W) % W, GROUND - ((t * (15 + hash(i) * 25) + hash(i + 2) * 200) % 200), 2, 2); }
  }

  // Helden
  function heroBar(x, y, h, max, color) {
    if (!h || !h.alive) return;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(x - 16, y, 32, 5, 2); ctx.fill();
    ctx.fillStyle = color; rr(x - 16, y, 32 * Math.max(0, h.hp / max), 5, 2); ctx.fill();
  }

  // Gegner
  function eyes(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 4, 4); ctx.fillRect(x + 8, y, 4, 4); ctx.fillStyle = '#111'; ctx.fillRect(x + 1, y + 1, 2, 2); ctx.fillRect(x + 9, y + 1, 2, 2); }
  // Ausrüstung der Fernkämpfer
  function rangedGear(e, t, col) {
    const pulse = Math.max(0, 1 - e.shotT / 0.5);
    if (e.type === 'goblin') {
      ctx.fillStyle = col('#7a3b2e'); ctx.beginPath(); ctx.arc(0, -35, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(8, -30); ctx.lineTo(-8, -30); ctx.fill();
      ctx.strokeStyle = '#5a3d25'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(-13, -26); ctx.lineTo(-18, -32); ctx.moveTo(-13, -26); ctx.lineTo(-8, -32); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,61,37,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-18, -32); ctx.quadraticCurveTo(-13, -26 + pulse * 6, -8, -32); ctx.stroke();
      ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.arc(-13, -28 + pulse * 4, 2.5, 0, 7); ctx.fill();
    } else if (e.type === 'skelett') {
      ctx.strokeStyle = col('#8a6a3a'); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-10, -24, 13, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(232,226,208,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-14, -36); ctx.lineTo(-14 + pulse * 8, -24); ctx.lineTo(-14, -12); ctx.stroke();
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(4, -30, 4, 14); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(4, -33, 1.5, 4); ctx.fillRect(6.5, -34, 1.5, 4);
    } else if (e.type === 'daemon') {
      const r = 4 + pulse * 3 + Math.sin(t * 10) * 0.8;
      ctx.fillStyle = 'rgba(255,140,60,.45)'; ctx.beginPath(); ctx.arc(-15, -32, r + 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(-15, -32, r, 0, 7); ctx.fill();
      ctx.fillStyle = col('#c4382f'); ctx.fillRect(-14, -28, 5, 4);
    } else if (e.type === 'golem') {
      ctx.fillStyle = col('#5b7fa8'); rr(-13, -33, 26, 26, 4); ctx.fill();
      ctx.save(); ctx.translate(-20, -42 + Math.sin(t * 3) * 2); ctx.rotate(t * 1.5);
      ctx.fillStyle = `rgba(190,235,255,${0.75 + pulse * 0.25})`; ctx.beginPath(); ctx.moveTo(0, -6 - pulse * 2); ctx.lineTo(4, 0); ctx.lineTo(0, 6 + pulse * 2); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(190,140,255,.8)'; ctx.beginPath(); ctx.arc(-15, -10 - pulse * 3, 2 + pulse * 2, 0, 7); ctx.fill();
    }
  }
  // ---------- Eigene Boss-Figuren ----------
  function geye(x, y, c, r) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, 7); ctx.fill();
  }
  function poly(pts, c, outline) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (outline) fillO(c); else { ctx.fillStyle = c; ctx.fill(); } }
  // Bosse der Gebiete 6–15
  const BOSS_ART = {
    5(e, t, col, hit, ph) { // Moorhexe
      for (let i = 0; i < 3; i++) { const a = ph * 1.2 + i * 2.1; ctx.fillStyle = 'rgba(140,255,140,.3)'; ctx.beginPath(); ctx.arc(Math.cos(a) * 44, -70 + Math.sin(a) * 18, 6, 0, 7); ctx.fill(); }
      const fl = Math.sin(ph * 2) * 3;
      ctx.save(); ctx.translate(8, fl - 6);
      ctx.beginPath(); ctx.moveTo(-18, -64); ctx.lineTo(18, -64); ctx.lineTo(28, -2); for (let i = 0; i < 6; i++) ctx.lineTo(28 - i * 9.5 - 4.5, -10 + (i % 2) * 8); ctx.lineTo(-28, -2); ctx.closePath(); fillO(col('#2f2440'));
      ctx.save(); ctx.translate(16, -54); ctx.rotate(0.15); ctx.fillStyle = '#4a3220'; ctx.fillRect(-2, -40, 4, 96);
      const og = ctx.createRadialGradient(0, -46, 1, 0, -46, 14); og.addColorStop(0, '#d9ffb0'); og.addColorStop(0.4, `rgba(120,255,120,${0.7 + 0.3 * Math.sin(ph * 5)})`); og.addColorStop(1, 'rgba(120,255,120,0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, -46, 14, 0, 7); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(-2, -74, 13, 0, 7); fillO(col('#8fbf6a'));
      poly([[-14, -76], [-30, -70], [-13, -68]], col('#8fbf6a'), true);
      ctx.fillStyle = '#5a7a3a'; ctx.beginPath(); ctx.arc(-26, -71, 2, 0, 7); ctx.fill();
      geye(-8, -77, 'rgba(255,240,90,.95)', 2.2); geye(2, -77, 'rgba(255,240,90,.95)', 2.2);
      ctx.strokeStyle = '#1b1726'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-6, -68, 5, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#5b4a6e'; ctx.beginPath(); ctx.moveTo(-26, -84); ctx.lineTo(24, -84); ctx.lineTo(14, -90); ctx.quadraticCurveTo(6, -112, 18, -132); ctx.quadraticCurveTo(-4, -118, -8, -90); ctx.lineTo(-16, -90); ctx.closePath(); fillO(col('#3a2d55'));
      ctx.fillStyle = '#9b6ad6'; ctx.fillRect(-9, -91, 22, 4);
      ctx.restore();
      ctx.save(); ctx.translate(-36, 0);
      ctx.fillStyle = 'rgba(120,255,120,.25)'; for (let i = 0; i < 4; i++) { const p = (ph * 0.6 + i * 0.25) % 1; ctx.beginPath(); ctx.arc(Math.sin(i * 2 + ph) * 6, -30 - p * 50, 4 + p * 8, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, -14, 20, 15, 0, 0, 7); fillO('#2a2a30');
      ctx.fillStyle = '#7ee08a'; ctx.beginPath(); ctx.ellipse(0, -26, 17, 4, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#c8ffb0'; ctx.beginPath(); ctx.arc(-8 + i * 8, -27 - Math.abs(Math.sin(ph * 6 + i)) * 4, 2, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ff7a3d'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 8, 0); ctx.quadraticCurveTo(-8 + i * 8, -8 - Math.sin(ph * 10 + i) * 3, -6 + i * 8, 0); ctx.fill(); }
      ctx.restore();
    },
    6(e, t, col, hit, ph) { // Dornentroll
      const br = Math.sin(ph * 1.5) * 1.5;
      ctx.fillStyle = col('#56664a'); rr(-22, -30, 16, 30, 5); ctx.fill(); rr(6, -30, 16, 30, 5); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -60 - br, 34, 36, 0, 0, 7); fillO(col('#6f8a5a'));
      ctx.fillStyle = col('#8aa070'); ctx.beginPath(); ctx.ellipse(-4, -54 - br, 20, 20, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(70,110,50,.8)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(10 + (i % 3) * 8, -86 + Math.floor(i / 3) * 8 - br, 5, 0, 7); ctx.fill(); }
      ctx.save(); ctx.translate(-26, -70 - br); ctx.rotate(0.4 + Math.sin(ph * 2) * 0.1);
      rr(-8, 0, 16, 40, 7); fillO(col('#6f8a5a'));
      ctx.translate(0, 38); ctx.rotate(-1.2);
      ctx.fillStyle = '#5a3d25'; rr(-6, -4, 56, 12, 6); ctx.fill(); ctx.beginPath(); ctx.ellipse(48, 2, 12, 10, 0, 0, 7); fillO(col('#6b4a2e'));
      ctx.fillStyle = '#c9cdd6'; for (let i = 0; i < 4; i++) poly([[42 + i * 4, -7], [45 + i * 4, -15], [47 + i * 4, -7]], '#c9cdd6');
      ctx.restore();
      ctx.save(); ctx.translate(26, -72 - br); ctx.rotate(-0.3); rr(-8, 0, 16, 40, 7); fillO(col('#6f8a5a')); ctx.restore();
      ctx.strokeStyle = '#3d5a24'; ctx.lineWidth = 2.5; for (const [x0, y0] of [[-30, -60], [24, -64]]) { ctx.beginPath(); for (let k = 0; k < 6; k++) ctx.lineTo(x0 + Math.sin(k * 1.4) * 8, y0 + k * 6 - br); ctx.stroke(); }
      ctx.fillStyle = '#e5484d'; for (let k = 0; k < 6; k++) { poly([[-30 + Math.sin(k * 1.4) * 8, -60 + k * 6 - br], [-36 + Math.sin(k * 1.4) * 8, -62 + k * 6 - br], [-31 + Math.sin(k * 1.4) * 8, -57 + k * 6 - br]], '#e5484d'); }
      ctx.beginPath(); ctx.ellipse(-12, -96 - br, 15, 12, 0, 0, 7); fillO(col('#7d9866'));
      ctx.fillStyle = '#4a5e3a'; ctx.fillRect(-26, -100 - br, 26, 4);
      geye(-18, -97 - br, 'rgba(255,120,60,.95)', 2.2); geye(-8, -97 - br, 'rgba(255,120,60,.95)', 2.2);
      rr(-26, -90 - br, 26, 10, 4); fillO(col('#7d9866'));
      poly([[-24, -90 - br], [-22, -100 - br], [-19, -90 - br]], '#efe9d8', true); poly([[-8, -90 - br], [-6, -100 - br], [-3, -90 - br]], '#efe9d8', true);
    },
    7(e, t, col, hit, ph) { // Vampirgraf
      for (let i = 0; i < 3; i++) { const a = ph * 2 + i * 2.1, x = Math.cos(a) * 46, y = -100 + Math.sin(a * 1.5) * 16, f = Math.sin(ph * 18 + i) * 5; ctx.fillStyle = '#1b1726'; poly([[x - 10, y - f], [x - 3, y], [x, y - 3], [x + 3, y], [x + 10, y - f], [x, y + 4]], '#1b1726'); }
      const cw = Math.sin(ph * 2) * 4;
      ctx.beginPath(); ctx.moveTo(-14, -88); ctx.quadraticCurveTo(-46 - cw, -50, -40 - cw, 0); ctx.lineTo(40 + cw, 0); ctx.quadraticCurveTo(46 + cw, -50, 14, -88); ctx.closePath(); fillO(col('#16101f'));
      ctx.fillStyle = col('#8f1d2c'); ctx.beginPath(); ctx.moveTo(-12, -84); ctx.quadraticCurveTo(-36 - cw, -48, -32 - cw, -4); ctx.lineTo(32 + cw, -4); ctx.quadraticCurveTo(36 + cw, -48, 12, -84); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col('#24202e'); rr(-14, -84, 28, 84, 6); ctx.fill();
      ctx.fillStyle = '#efe9d8'; poly([[-6, -84], [6, -84], [0, -64]], '#efe9d8'); ctx.fillStyle = '#8f1d2c'; ctx.beginPath(); ctx.arc(0, -66, 3, 0, 7); ctx.fill();
      for (const sgn of [-1, 1]) poly([[sgn * 4, -86], [sgn * 22, -110], [sgn * 18, -86]], col('#3a1020'), true);
      ctx.beginPath(); ctx.ellipse(0, -98, 11, 13, 0, 0, 7); fillO(col('#e8e4f0'));
      ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.moveTo(-12, -100); ctx.quadraticCurveTo(-12, -116, 0, -114); ctx.quadraticCurveTo(12, -116, 12, -100); ctx.lineTo(6, -106); ctx.lineTo(0, -100); ctx.lineTo(-6, -106); ctx.closePath(); ctx.fill();
      geye(-5, -98, 'rgba(255,40,60,.95)', 2); geye(4, -98, 'rgba(255,40,60,.95)', 2);
      ctx.fillStyle = '#5a1a24'; ctx.fillRect(-5, -90, 9, 2); poly([[-4, -89], [-3, -85], [-2, -89]], '#fff'); poly([[1, -89], [2, -85], [3, -89]], '#fff');
      ctx.save(); ctx.translate(-14, -70); ctx.rotate(0.5); rr(-4, 0, 8, 24, 3); fillO(col('#24202e')); ctx.fillStyle = '#e8e4f0'; ctx.beginPath(); ctx.arc(0, 26, 4, 0, 7); ctx.fill(); ctx.restore();
    },
    8(e, t, col, hit, ph) { // Magmatitan
      for (let i = 0; i < 4; i++) { const p = (ph * 0.5 + i * 0.25) % 1; ctx.fillStyle = `rgba(80,70,70,${0.4 * (1 - p)})`; ctx.beginPath(); ctx.arc(-10 + i * 7 + Math.sin(ph + i) * 4, -110 - p * 40, 6 + p * 10, 0, 7); ctx.fill(); }
      const pulse = 0.6 + 0.4 * Math.sin(ph * 3);
      ctx.fillStyle = col('#2b2523'); rr(-24, -34, 18, 34, 4); ctx.fill(); rr(6, -34, 18, 34, 4); ctx.fill();
      poly([[-32, -96], [28, -100], [38, -60], [26, -28], [-28, -26], [-38, -62]], col('#3a3230'), true);
      const cg = ctx.createRadialGradient(0, -64, 2, 0, -64, 22); cg.addColorStop(0, '#fff3c4'); cg.addColorStop(0.4, `rgba(255,150,40,${pulse})`); cg.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, -64, 22, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,140,40,${pulse})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-26, -88); ctx.lineTo(-12, -74); ctx.lineTo(-20, -50); ctx.moveTo(24, -90); ctx.lineTo(10, -76); ctx.lineTo(22, -40); ctx.moveTo(-6, -40); ctx.lineTo(4, -30); ctx.stroke();
      for (const [sx, rot] of [[-36, 0.35], [36, -0.25]]) {
        ctx.save(); ctx.translate(sx, -86); ctx.rotate(rot + Math.sin(ph * 2) * 0.05);
        poly([[-9, 0], [9, 0], [11, 34], [-11, 34]], col('#3a3230'), true);
        poly([[-14, 32], [14, 32], [16, 52], [-16, 52]], col('#4a403c'), true);
        ctx.strokeStyle = `rgba(255,140,40,${pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 38); ctx.lineTo(0, 44); ctx.lineTo(8, 38); ctx.stroke();
        const d = (ph * 0.9 + sx) % 1; ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.ellipse(4, 52 + d * 30, 2.5, 4, 0, 0, 7); ctx.fill();
        ctx.restore();
      }
      poly([[-14, -118], [14, -118], [18, -96], [-18, -96]], col('#4a403c'), true);
      ctx.fillStyle = `rgba(255,200,80,${pulse})`; ctx.fillRect(-12, -110, 9, 4); ctx.fillRect(3, -110, 9, 4);
      ctx.fillStyle = `rgba(255,120,30,${pulse})`; ctx.fillRect(-8, -102, 16, 3);
    },
    9(e, t, col, hit, ph) { // Kristallspinne
      const step = ph * 4;
      ctx.strokeStyle = col('#7fa6c4'); ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) for (const sgn of [-1, 1]) {
        const bx = -6 + i * 8, kx = bx + sgn * (26 + i * 4), ky = -48 - Math.max(0, Math.sin(step + i * 1.3 + (sgn > 0 ? Math.PI : 0))) * 8, fx = bx + sgn * (40 + i * 6);
        ctx.beginPath(); ctx.moveTo(bx, -30); ctx.lineTo(kx, ky); ctx.lineTo(fx, 0); ctx.stroke();
      }
      const ag = ctx.createLinearGradient(10, -70, 40, -10); ag.addColorStop(0, hit ? '#fff' : '#e3f6ff'); ag.addColorStop(1, hit ? '#fff' : '#5aa6d6');
      ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(18, -70); ctx.lineTo(46, -64); ctx.lineTo(58, -36); ctx.lineTo(44, -12); ctx.lineTo(14, -14); ctx.closePath(); ctx.fillStyle = ag; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(18, -70); ctx.lineTo(30, -40); ctx.lineTo(46, -64); ctx.moveTo(30, -40); ctx.lineTo(44, -12); ctx.moveTo(30, -40); ctx.lineTo(4, -40); ctx.stroke();
      for (const [x, y, h] of [[20, -70, 16], [34, -68, 22], [48, -62, 14]]) poly([[x - 4, y + 2], [x, y - h], [x + 4, y + 2]], 'rgba(190,238,255,.95)', true);
      ctx.beginPath(); ctx.ellipse(-16, -34, 20, 15, 0, 0, 7); fillO(col('#4f7a9a'));
      for (const [x, y, r] of [[-26, -40, 3], [-20, -44, 3.5], [-28, -32, 2.2], [-14, -42, 2.4], [-22, -36, 2], [-30, -38, 1.8]]) geye(x, y, 'rgba(79,195,255,.9)', r);
      ctx.fillStyle = '#d8f3ff'; poly([[-34, -26], [-38, -14], [-30, -24]], '#d8f3ff', true); poly([[-26, -24], [-28, -12], [-22, -22]], '#d8f3ff', true);
    },
    10(e, t, col, hit, ph) { // Sternenwächter
      const fl = Math.sin(ph * 1.6) * 3;
      ctx.strokeStyle = 'rgba(200,220,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); const cs = [[-50, -120], [-36, -104], [-44, -84], [40, -116], [50, -96], [36, -80]]; cs.forEach(([x, y], i) => (i % 3 ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      cs.forEach(([x, y], i) => starDot(x, y, 2 + Math.sin(ph * 3 + i)));
      ctx.save(); ctx.translate(0, fl - 4);
      const g = ctx.createLinearGradient(0, -110, 0, 0); g.addColorStop(0, hit ? '#fff' : '#3a4ba8'); g.addColorStop(1, hit ? '#fff' : '#141a44');
      ctx.beginPath(); ctx.moveTo(-20, -84); ctx.lineTo(20, -84); ctx.lineTo(26, -30); ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.lineTo(-26, -30); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#c9d6ff'; ctx.stroke();
      for (let i = 0; i < 12; i++) starDot(-18 + hash(i) * 36, -80 + hash(i + 4) * 76, 0.8 + 0.8 * Math.sin(ph * 4 + i));
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sgn * 24, -80, 12, 8, sgn * 0.3, 0, 7); ctx.fillStyle = col('#2a357a'); ctx.fill(); ctx.strokeStyle = '#c9d6ff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.save(); ctx.translate(-24, -58); ctx.rotate(-2.25);
      const sg = ctx.createLinearGradient(0, 0, 70, 0); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, 'rgba(160,190,255,.3)');
      ctx.shadowColor = 'rgba(170,200,255,.9)'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(62, -4); ctx.lineTo(74, 0); ctx.lineTo(62, 4); ctx.lineTo(0, 5); ctx.closePath(); ctx.fillStyle = sg; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = '#c9d6ff'; ctx.stroke(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-4, -10, 5, 20); ctx.fillRect(-12, -3, 10, 6);
      ctx.restore();
      rr(-12, -110, 24, 26, 8); ctx.fillStyle = col('#2a357a'); ctx.fill(); ctx.strokeStyle = '#c9d6ff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.8 + 0.2 * Math.sin(ph * 6)})`; ctx.fillRect(-9, -100, 18, 3);
      ctx.strokeStyle = `rgba(255,236,170,${0.7 + 0.3 * Math.sin(ph * 2)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -118, 16, 4, 0, 0, 7); ctx.stroke();
      ctx.restore();
    },
    11(e, t, col, hit, ph) { // Uralter Baumhirte
      const sw = Math.sin(ph * 1.2) * 0.05;
      ctx.fillStyle = col('#5a3d25'); for (const [x, dx] of [[-14, -14], [-4, -4], [8, 10], [16, 22]]) { ctx.beginPath(); ctx.moveTo(x - 4, -16); ctx.quadraticCurveTo(x, -4, x + dx, 0); ctx.lineTo(x + dx + 6, 0); ctx.quadraticCurveTo(x + 4, -6, x + 5, -16); ctx.fill(); }
      rr(-20, -100, 40, 88, 10); fillO(col('#6b4a2e'));
      ctx.strokeStyle = 'rgba(40,25,15,.6)'; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-16 + i * 8, -96); ctx.quadraticCurveTo(-12 + i * 8, -60, -16 + i * 8, -16); ctx.stroke(); }
      ctx.fillStyle = 'rgba(126,200,90,.7)'; for (const [x, y] of [[-18, -40], [14, -70], [-10, -24]]) { ctx.beginPath(); ctx.ellipse(x, y, 6, 3, 0.4, 0, 7); ctx.fill(); }
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(sgn * 18, -84); ctx.rotate(sgn * (0.7 + sw * 3));
        ctx.fillStyle = col('#5a3d25'); rr(-5, 0, 10, 44, 4); ctx.fill();
        ctx.strokeStyle = col('#5a3d25'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(-8, 54); ctx.moveTo(0, 42); ctx.lineTo(4, 56); ctx.moveTo(0, 42); ctx.lineTo(10, 50); ctx.stroke();
        ctx.fillStyle = '#4f9447'; ctx.beginPath(); ctx.arc(-6, 20, 6, 0, 7); ctx.fill();
        ctx.restore();
      }
      ctx.save(); ctx.rotate(sw);
      for (const [x, y, r, c] of [[-30, -112, 20, '#2f6b3f'], [26, -114, 22, '#2f6b3f'], [0, -128, 26, '#3e8a4e'], [-16, -132, 16, '#4f9447'], [18, -136, 16, '#4f9447'], [2, -146, 14, '#6fb45e']]) { ctx.fillStyle = hit ? '#fff' : c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#e5484d'; for (const [x, y] of [[-20, -120], [12, -130], [28, -110]]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(-8, -78, 6, 7, 0, 0, 7); ctx.ellipse(6, -78, 6, 7, 0, 0, 7); ctx.fill();
      geye(-8, -78, 'rgba(160,255,120,.95)', 2.2); geye(6, -78, 'rgba(160,255,120,.95)', 2.2);
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(-1, -58, 8, 5, 0, 0, 7); ctx.fill();
      const lf = (ph * 0.3) % 1; ctx.fillStyle = '#7ec85a'; ctx.beginPath(); ctx.ellipse(-30 + lf * 20, -100 + lf * 100, 3, 1.6, ph, 0, 7); ctx.fill();
    },
    12(e, t, col, hit, ph) { // Geisterkönig
      const fl = Math.sin(ph * 1.8) * 4;
      ctx.save(); ctx.translate(0, fl - 10); ctx.globalAlpha = hit ? 1 : 0.88;
      const g = ctx.createLinearGradient(0, -120, 0, 0); g.addColorStop(0, hit ? '#fff' : 'rgba(210,240,255,.95)'); g.addColorStop(1, 'rgba(150,200,255,0)');
      ctx.beginPath(); ctx.moveTo(-26, -86); ctx.quadraticCurveTo(-34, -40, -18 + Math.sin(ph * 3) * 6, 4); ctx.quadraticCurveTo(-4, -12, 6 + Math.sin(ph * 3 + 1) * 6, 6); ctx.quadraticCurveTo(14, -10, 22 + Math.sin(ph * 3 + 2) * 6, 2); ctx.quadraticCurveTo(34, -40, 26, -86);
      ctx.quadraticCurveTo(26, -118, 0, -120); ctx.quadraticCurveTo(-26, -118, -26, -86); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.globalAlpha = 1;
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(sgn * 24, -80); ctx.rotate(sgn * (0.5 + Math.sin(ph * 2) * 0.1));
        ctx.fillStyle = 'rgba(210,240,255,.85)'; rr(-5, 0, 10, 30, 5); ctx.fill();
        ctx.strokeStyle = '#8a8f9c'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(0, 34 + k * 7, 3, 4, 0, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#5b5f6b'; rr(-6, 28, 12, 5, 2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#1b2a44'; ctx.beginPath(); ctx.ellipse(-8, -96, 5, 7, 0.2, 0, 7); ctx.ellipse(8, -96, 5, 7, -0.2, 0, 7); ctx.fill();
      geye(-8, -96, 'rgba(120,220,255,.95)', 2); geye(8, -96, 'rgba(120,220,255,.95)', 2);
      ctx.fillStyle = '#1b2a44'; ctx.beginPath(); ctx.ellipse(0, -80, 6, 8 + Math.sin(ph * 4) * 2, 0, 0, 7); ctx.fill();
      poly([[-16, -112], [-18, -128], [-9, -118], [0, -134], [9, -118], [18, -128], [16, -112]], col('#b7bcc6'), true);
      ctx.fillStyle = '#4fc3ff'; ctx.beginPath(); ctx.arc(0, -120, 2.4, 0, 7); ctx.fill();
      ctx.restore();
    },
    13(e, t, col, hit, ph) { // Drachenkaiser
      const flap = Math.sin(ph * 3) * 0.2, br = Math.sin(ph * 1.5) * 2;
      ctx.save(); ctx.translate(14, -76); ctx.rotate(-0.3 + flap);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, -46); ctx.lineTo(56, -54); ctx.quadraticCurveTo(48, -36, 54, -20); ctx.quadraticCurveTo(40, -26, 38, -10); ctx.quadraticCurveTo(26, -16, 20, 4); ctx.closePath(); fillO(col('#8f2620'));
      ctx.strokeStyle = '#5a1612'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(54, -20); ctx.moveTo(0, 0); ctx.lineTo(38, -10); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(30, -20); ctx.quadraticCurveTo(62, -16, 58, -46); ctx.quadraticCurveTo(66, -12, 30, -10); ctx.closePath(); fillO(col('#b8322a'));
      ctx.fillStyle = col('#7a1d18'); rr(-20, -28, 14, 28, 5); ctx.fill(); rr(12, -28, 14, 28, 5); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, -48 - br, 30, 26, 0, 0, 7); fillO(col('#b8322a'));
      ctx.fillStyle = col('#ffcf7a'); ctx.beginPath(); ctx.ellipse(-4, -44 - br, 16, 20, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(170,110,40,.6)'; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-16, -58 + i * 7 - br); ctx.lineTo(8, -58 + i * 7 - br); ctx.stroke(); }
      ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.strokeStyle = col('#b8322a'); ctx.beginPath(); ctx.moveTo(-6, -64 - br); ctx.quadraticCurveTo(-20, -92, -22, -104 - br); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(-1, -66 - br); ctx.quadraticCurveTo(-14, -92, -16, -104 - br); ctx.moveTo(-12, -62 - br); ctx.quadraticCurveTo(-26, -92, -28, -104 - br); ctx.stroke();
      ctx.save(); ctx.translate(-26, -108 - br);
      poly([[6, -8], [-6, -12], [-22, -6], [-30, 2], [-22, 6], [-6, 6], [8, 6]], col('#c4382f'), true);
      for (const [hx, hy] of [[2, -10], [8, -6]]) poly([[hx, hy], [hx + 14, hy - 12], [hx + 6, hy + 2]], '#2a1a1a', true);
      geye(-8, -6, 'rgba(255,220,80,.95)', 2);
      ctx.fillStyle = '#1b0e0c'; ctx.fillRect(-28, 2, 18, 2);
      if (Math.sin(ph * 1.3) > 0.2) { for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#ffd23f', '#ff7a3d', '#e5484d'][i % 3]; ctx.beginPath(); ctx.arc(-34 - i * 6, 4 + Math.sin(ph * 20 + i) * 2, 3 + i * 0.6, 0, 7); ctx.fill(); } }
      poly([[-2, -12], [2, -22], [6, -12]], '#ffd23f', true);
      ctx.restore();
      ctx.save(); ctx.translate(-6, -76); ctx.rotate(-flap);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -48); ctx.lineTo(-48, -60); ctx.quadraticCurveTo(-40, -42, -46, -26); ctx.quadraticCurveTo(-32, -30, -30, -14); ctx.quadraticCurveTo(-18, -18, -12, 4); ctx.closePath(); fillO(col('#a32a22'));
      ctx.restore();
    },
    14(e, t, col, hit, ph) { // Sturmtitan
      if (Math.sin(ph * 7) > 0.85) { ctx.strokeStyle = 'rgba(210,235,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); let x = -40 + hash(Math.floor(ph * 7)) * 80, y = -150; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash(k + Math.floor(ph * 7)) - 0.5) * 20; y += 20; ctx.lineTo(x, y); } ctx.stroke(); }
      for (let i = 0; i < 5; i++) { const x = -40 + i * 20 + Math.sin(ph + i) * 4; ctx.fillStyle = 'rgba(90,100,130,.55)'; ctx.beginPath(); ctx.arc(x, -140 + Math.sin(ph * 1.5 + i) * 3, 14, 0, 7); ctx.fill(); }
      ctx.fillStyle = col('#6e7f9a'); rr(-20, -30, 16, 30, 5); ctx.fill(); rr(4, -30, 16, 30, 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18, -96); ctx.quadraticCurveTo(46, -60, 40, -6); ctx.lineTo(-10, -20); ctx.closePath(); fillO(col('#4a5670'));
      rr(-26, -98, 52, 72, 14); fillO(col('#8a9ab8'));
      ctx.fillStyle = col('#c9a64a'); ctx.fillRect(-26, -48, 52, 6); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -45, 4, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(-26, -88); ctx.rotate(0.25 + Math.sin(ph * 2) * 0.05);
      rr(-7, 0, 14, 38, 6); fillO(col('#8a9ab8'));
      ctx.translate(-2, 38); ctx.rotate(-0.3);
      ctx.fillStyle = '#c9a64a'; ctx.fillRect(-2, -80, 4, 120);
      ctx.strokeStyle = `rgba(200,235,255,${0.7 + 0.3 * Math.sin(ph * 15)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(-6, -92); ctx.lineTo(4, -100); ctx.lineTo(-2, -116); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(26, -88); ctx.rotate(-0.3); rr(-7, 0, 14, 38, 6); fillO(col('#8a9ab8')); ctx.restore();
      rr(-14, -122, 28, 26, 9); fillO(col('#9aaac6'));
      geye(-6, -112, 'rgba(230,245,255,.95)', 2.4); geye(6, -112, 'rgba(230,245,255,.95)', 2.4);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = hit ? '#fff' : 'rgba(200,210,230,.95)'; ctx.beginPath(); ctx.arc(-12 + i * 6, -98 + (i % 2) * 4, 7, 0, 7); ctx.fill(); }
      for (const [x, h] of [[-12, 12], [-4, 18], [4, 18], [12, 12]]) poly([[x - 2, -122], [x + 3, -122 - h * 0.6], [x - 1, -122 - h * 0.55], [x + 2, -122 - h]], '#ffe58a');
    },
  };
  function starDot(x, y, r) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, Math.max(0.4, r), 0, 7); ctx.fill(); }
  function bossDraw(e, t, col) {
    const hit = e.hitT > 0, ph = t + e.bob;
    if (BOSS_ART[e.bk]) return BOSS_ART[e.bk](e, t, col, hit, ph);
    if (e.type === 'schleim') {
      const sq = Math.sin(ph * 3) * 3;
      ctx.fillStyle = col('#3a9e4c');
      for (let i = 0; i < 5; i++) { const dx = -36 + i * 18, dl = 4 + ((ph * 6 + i * 3.3) % 9); ctx.beginPath(); ctx.ellipse(dx, 1, 4, dl, 0, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-48, 0); ctx.bezierCurveTo(-54, -42 - sq, -28, -70 + sq, 0, -70 + sq); ctx.bezierCurveTo(30, -70 + sq, 54, -42 - sq, 48, 0); ctx.closePath();
      const g = ctx.createLinearGradient(0, -70, 0, 0); g.addColorStop(0, hit ? '#fff' : '#9cf59a'); g.addColorStop(1, hit ? '#fff' : '#2f8a42');
      ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(16, -22); ctx.rotate(0.7); ctx.fillStyle = '#fff'; ctx.fillRect(-11, -2, 22, 4); ctx.beginPath(); ctx.arc(-11, -2, 3.5, 0, 7); ctx.arc(-11, 2, 3.5, 0, 7); ctx.arc(11, -2, 3.5, 0, 7); ctx.arc(11, 2, 3.5, 0, 7); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(-20, -14); ctx.rotate(-0.4); ctx.fillStyle = '#c9cdd6'; ctx.fillRect(-2, -16, 4, 24); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-6, 4, 12, 3); ctx.restore();
      for (let i = 0; i < 6; i++) { const p = (ph * 0.35 + i * 0.17) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - p)})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(-28 + i * 11, -6 - p * 48, 1.5 + (i % 3), 0, 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-24, -50 + sq, 10, 5, -0.6, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1b3d22'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-30, -48 + sq); ctx.lineTo(-14, -41 + sq); ctx.moveTo(0, -41 + sq); ctx.lineTo(14, -48 + sq); ctx.stroke();
      for (const ex of [-21, 7]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, -35 + sq, 7, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(ex - 3, -34 + sq, 3, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#1b3d22'; ctx.beginPath(); ctx.ellipse(-8, -18 + sq / 2, 15, 7 + Math.abs(sq), 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) poly([[-20 + i * 7, -18 + sq / 2], [-16 + i * 7, -18 + sq / 2], [-18 + i * 7, -13 + sq / 2]], '#fff');
      ctx.save(); ctx.translate(6, -68 + sq); ctx.rotate(-0.18);
      poly([[-18, 4], [-20, -14], [-10, -5], [0, -18], [10, -5], [20, -14], [18, 4]], col('#ffd23f'), true);
      ctx.fillStyle = '#e0a020'; ctx.fillRect(-18, 0, 36, 4); ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(0, -4, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#3b7ad6'; ctx.beginPath(); ctx.arc(-10, -1, 2, 0, 7); ctx.arc(10, -1, 2, 0, 7); ctx.fill();
      ctx.restore();
      return;
    }
    if (e.type === 'goblin') {
      const sw = Math.sin(ph * 2) * 0.06;
      ctx.fillStyle = col('#6b5a48'); ctx.beginPath(); ctx.moveTo(6, -66); ctx.quadraticCurveTo(38, -50, 34, -4); ctx.lineTo(22, -10); ctx.lineTo(14, -2); ctx.lineTo(6, -12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col('#3f5e24'); ctx.fillRect(-15, -22, 11, 22); ctx.fillRect(4, -22, 11, 22);
      ctx.fillStyle = '#4a3220'; rr(-17, -6, 14, 6, 2); ctx.fill(); rr(3, -6, 14, 6, 2); ctx.fill();
      rr(-19, -64, 38, 46, 9); fillO(col('#5e8c3a'));
      ctx.fillStyle = col('#7a5534'); ctx.save(); ctx.beginPath(); ctx.rect(-19, -64, 38, 46); ctx.clip(); ctx.rotate(0.5); ctx.fillRect(-30, -46, 60, 7); ctx.restore();
      ctx.fillStyle = '#4a3220'; ctx.fillRect(-19, -28, 38, 6); ctx.fillStyle = '#efe9d8'; ctx.beginPath(); ctx.arc(0, -25, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1726'; ctx.fillRect(-2.5, -26, 2, 2); ctx.fillRect(0.5, -26, 2, 2);
      ctx.save(); ctx.translate(26, -2); ctx.rotate(sw);
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(-2, -104, 4, 104);
      ctx.beginPath(); ctx.arc(0, -108, 7, 0, 7); fillO(col('#efe9d8')); ctx.fillStyle = '#1b1726'; ctx.fillRect(-4, -110, 3, 3); ctx.fillRect(1, -110, 3, 3);
      ctx.fillStyle = `rgba(120,255,140,${0.6 + 0.4 * Math.sin(ph * 5)})`; ctx.fillRect(-4, -110, 2, 2); ctx.fillRect(1, -110, 2, 2);
      for (const [fx, c2] of [[-6, '#e5484d'], [0, '#ffd23f'], [6, '#3b7ad6']]) poly([[fx, -98], [fx - 3, -84], [fx + 3, -84]], c2);
      ctx.restore();
      ctx.save(); ctx.translate(-16, -56); ctx.rotate(-0.5 + Math.sin(ph * 2.5) * 0.15);
      rr(-4, 0, 8, 22, 3); fillO(col('#6fa046'));
      ctx.fillStyle = '#5a3d25'; ctx.fillRect(-2, 18, 4, 10);
      poly([[-2, 26], [-24, 22], [-26, 38], [-2, 34]], col('#b7bcc6'), true);
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, -76, 15, 0, 7); fillO(col('#6fa046'));
      poly([[-12, -80], [-30, -92], [-13, -71]], col('#6fa046'), true); poly([[12, -80], [30, -92], [13, -71]], col('#6fa046'), true);
      ctx.fillStyle = '#e5484d'; ctx.fillRect(-11, -78, 6, 2); ctx.fillRect(-11, -74, 6, 2);
      ctx.beginPath(); ctx.arc(0, -82, 15.5, Math.PI, 0); ctx.lineTo(15.5, -80); ctx.lineTo(-15.5, -80); fillO('#5b5f6b');
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * 12, -88); ctx.quadraticCurveTo(sgn * 26, -96, sgn * 22, -112); ctx.quadraticCurveTo(sgn * 18, -98, sgn * 6, -94); fillO('#efe9d8'); }
      geye(-7, -77, 'rgba(255,210,63,.9)', 2.5); geye(5, -77, 'rgba(255,210,63,.9)', 2.5);
      ctx.fillStyle = '#1b1726'; ctx.fillRect(-8, -67, 14, 3);
      poly([[-7, -67], [-5, -72], [-3, -67]], '#fff'); poly([[3, -67], [5, -72], [7, -67]], '#fff');
      return;
    }
    if (e.type === 'skelett') {
      const fl = Math.sin(ph * 1.8) * 3;
      ctx.save(); ctx.translate(0, fl - 4);
      for (let i = 0; i < 3; i++) { const a = ph * 1.4 + i * 2.1, x = Math.cos(a) * 40, y = -60 + Math.sin(a) * 14; ctx.fillStyle = 'rgba(190,160,255,.35)'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(230,220,255,.8)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
      const g = ctx.createLinearGradient(0, -78, 0, 0); g.addColorStop(0, hit ? '#fff' : '#4b2d6e'); g.addColorStop(1, hit ? '#fff' : '#20122e');
      ctx.beginPath(); ctx.moveTo(-16, -74); ctx.lineTo(16, -74); ctx.lineTo(30, 0);
      for (let i = 0; i < 6; i++) ctx.lineTo(30 - i * 10 - 5, -6 - (i % 2) * 6 + Math.sin(ph * 4 + i) * 2);
      ctx.lineTo(-30, 0); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.fillStyle = '#1a0f26'; poly([[-9, -72], [9, -72], [5, -38], [-5, -38]], '#1a0f26');
      ctx.fillStyle = col('#e8e2d0'); ctx.fillRect(-1.5, -70, 3, 30); for (let i = 0; i < 4; i++) { rr(-8, -66 + i * 7, 16, 2.5, 1); ctx.fill(); }
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sgn * 16, -72, 9, 6, 0, 0, 7); fillO(col('#efe9d8')); poly([[sgn * 12, -76], [sgn * 22, -90], [sgn * 20, -74]], col('#efe9d8'), true); }
      ctx.save(); ctx.translate(-28, 0); ctx.rotate(-0.08);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-2, -116, 4, 112);
      ctx.beginPath(); ctx.moveTo(2, -112); ctx.quadraticCurveTo(-34, -124, -46, -92); ctx.quadraticCurveTo(-30, -108, 2, -104); ctx.closePath(); fillO(col('#c9cdd6'));
      ctx.restore();
      ctx.beginPath(); ctx.arc(-24, -48, 5, 0, 7); fillO(col('#efe9d8'));
      ctx.beginPath(); ctx.arc(0, -88, 13, 0, 7); fillO(col('#efe9d8'));
      rr(-8, -80, 16, 8, 3); fillO(col('#e8e2d0')); ctx.fillStyle = '#1b1726'; for (let i = 0; i < 4; i++) ctx.fillRect(-6 + i * 4, -78, 1.5, 5);
      ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(-5, -90, 4, 0, 7); ctx.arc(5, -90, 4, 0, 7); ctx.fill();
      geye(-5, -90, 'rgba(180,140,255,.95)', 2.2); geye(5, -90, 'rgba(180,140,255,.95)', 2.2);
      poly([[-13, -98], [-15, -112], [-8, -102], [-4, -116], [0, -103], [4, -116], [8, -102], [15, -112], [13, -98]], col('#b08a3a'), true);
      ctx.fillStyle = '#c9a6ff'; ctx.beginPath(); ctx.arc(0, -103, 2.2, 0, 7); ctx.fill();
      ctx.restore();
      return;
    }
    if (e.type === 'daemon') {
      const flap = Math.sin(ph * 4) * 0.18;
      const au = ctx.createRadialGradient(0, -55, 10, 0, -55, 70); au.addColorStop(0, 'rgba(255,140,40,.45)'); au.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = au; ctx.beginPath(); ctx.arc(0, -55, 70 + Math.sin(ph * 7) * 3, 0, 7); ctx.fill();
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(sgn * 10, -66); ctx.rotate(sgn * flap); ctx.scale(sgn, 1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, -34); ctx.lineTo(58, -40); ctx.quadraticCurveTo(52, -26, 56, -14); ctx.quadraticCurveTo(44, -18, 42, -6); ctx.quadraticCurveTo(30, -12, 26, 2); ctx.quadraticCurveTo(14, -4, 4, 10); ctx.closePath(); fillO(col('#5a1612'));
        ctx.strokeStyle = '#2a0a08'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(56, -14); ctx.moveTo(0, 0); ctx.lineTo(42, -6); ctx.moveTo(26, -34); ctx.lineTo(26, 2); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = col('#7a1d18'); ctx.fillRect(-16, -24, 12, 24); ctx.fillRect(4, -24, 12, 24);
      ctx.fillStyle = '#1b0e0c'; rr(-18, -6, 15, 6, 2); ctx.fill(); rr(3, -6, 15, 6, 2); ctx.fill();
      rr(-22, -74, 44, 54, 12); fillO(col('#b8322a'));
      ctx.strokeStyle = `rgba(255,190,80,${0.6 + 0.4 * Math.sin(ph * 6)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -66); ctx.lineTo(-4, -52); ctx.lineTo(-12, -40); ctx.moveTo(8, -64); ctx.lineTo(12, -48); ctx.lineTo(6, -34); ctx.stroke();
      for (const sgn of [-1, 1]) poly([[sgn * 16, -74], [sgn * 30, -84], [sgn * 24, -70]], col('#2a1a1a'), true);
      ctx.save(); ctx.translate(-30, -4);
      ctx.fillStyle = '#2a1a1a'; ctx.fillRect(-2, -112, 4, 110);
      poly([[-10, -112], [10, -112], [10, -106], [-10, -106]], '#2a1a1a');
      for (const px of [-10, 0, 10]) poly([[px - 2, -110], [px, -126], [px + 2, -110]], '#c9cdd6', true);
      for (let i = 0; i < 4; i++) { const h = 10 + Math.sin(ph * 12 + i) * 4; ctx.fillStyle = ['#ff7a3d', '#ffd23f'][i % 2]; ctx.beginPath(); ctx.moveTo(-10 + i * 6, -124); ctx.quadraticCurveTo(-8 + i * 6, -124 - h, -5 + i * 6, -124); ctx.fill(); }
      ctx.restore();
      ctx.save(); ctx.translate(-20, -64); ctx.rotate(0.6); rr(-5, 0, 10, 26, 4); fillO(col('#b8322a')); ctx.restore();
      ctx.beginPath(); ctx.arc(0, -86, 15, 0, 7); fillO(col('#c4382f'));
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * 9, -96); ctx.quadraticCurveTo(sgn * 34, -100, sgn * 30, -126); ctx.quadraticCurveTo(sgn * 24, -106, sgn * 4, -100); fillO('#2a1a1a'); }
      geye(-7, -88, 'rgba(255,220,80,.95)', 2.6); geye(5, -88, 'rgba(255,220,80,.95)', 2.6);
      ctx.fillStyle = '#1b0e0c'; ctx.beginPath(); ctx.moveTo(-9, -78); ctx.quadraticCurveTo(-1, -72, 7, -78); ctx.lineTo(-9, -78); ctx.fill();
      poly([[-7, -78], [-5, -73], [-3, -78]], '#fff'); poly([[1, -78], [3, -73], [5, -78]], '#fff');
      return;
    }
    // Frostriese
    for (let i = 0; i < 8; i++) { const a = ph * 0.8 + i * 0.8, x = Math.cos(a) * 52, y = -56 + Math.sin(a * 1.3) * 40; ctx.fillStyle = 'rgba(230,248,255,.85)'; ctx.fillRect(x, y, 2.5, 2.5); }
    const mist = ctx.createRadialGradient(0, -4, 4, 0, -4, 60); mist.addColorStop(0, 'rgba(200,235,255,.45)'); mist.addColorStop(1, 'rgba(200,235,255,0)'); ctx.fillStyle = mist; ctx.fillRect(-60, -30, 120, 34);
    ctx.fillStyle = col('#7f9fba'); rr(-20, -28, 15, 28, 4); ctx.fill(); rr(5, -28, 15, 28, 4); ctx.fill();
    const g = ctx.createLinearGradient(0, -90, 0, -20); g.addColorStop(0, hit ? '#fff' : '#e3f1fb'); g.addColorStop(1, hit ? '#fff' : '#8fb0c8');
    rr(-28, -90, 56, 66, 14); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,140,180,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -80); ctx.lineTo(-6, -64); ctx.lineTo(-16, -50); ctx.moveTo(10, -76); ctx.lineTo(16, -58); ctx.stroke();
    for (const sgn of [-1, 1]) { poly([[sgn * 18, -88], [sgn * 26, -112], [sgn * 32, -86]], 'rgba(160,225,255,.95)', true); poly([[sgn * 30, -86], [sgn * 42, -104], [sgn * 40, -80]], 'rgba(190,238,255,.95)', true); }
    ctx.save(); ctx.translate(-26, -70); ctx.rotate(0.9 + Math.sin(ph * 1.6) * 0.08);
    rr(-7, 0, 14, 30, 6); fillO(col('#cfe3f2'));
    ctx.translate(0, 28); poly([[-5, 0], [5, 0], [12, 36], [0, 46], [-12, 36]], col('#a8dcf5'), true);
    poly([[-12, 30], [-20, 26], [-12, 22]], '#d8f3ff', true); poly([[12, 30], [20, 26], [12, 22]], '#d8f3ff', true); poly([[0, 46], [-4, 54], [4, 54]], '#d8f3ff', true);
    ctx.restore();
    ctx.save(); ctx.translate(26, -72); ctx.rotate(-0.25); rr(-7, 0, 14, 34, 6); fillO(col('#cfe3f2')); ctx.restore();
    rr(-14, -112, 28, 26, 8); fillO(col('#d8eaf6'));
    ctx.fillStyle = '#6e8ba3'; ctx.fillRect(-14, -104, 28, 4);
    geye(-6, -100, 'rgba(79,195,255,.95)', 2.4); geye(6, -100, 'rgba(79,195,255,.95)', 2.4);
    for (let i = 0; i < 5; i++) poly([[-12 + i * 6, -88], [-6 + i * 6, -88], [-9 + i * 6, -74 - (i % 2) * 6]], '#bfe8ff', true);
  }
  function enemy(e, t) {
    const s = e.boss ? 1.15 : e.elite ? 1.15 : 1, bob = Math.sin(t * 6 + e.bob) * 2;
    shadow(e.x, e.boss ? 44 : 16 * s);
    ctx.save(); ctx.translate(e.x, GROUND); ctx.scale(s, s);
    if (e.elite) { ctx.save(); ctx.scale(1, 0.25); ctx.strokeStyle = `rgba(215,181,255,${0.5 + 0.3 * Math.sin(t * 4 + e.bob)})`; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.stroke(); ctx.restore(); }
    if (e.elite) { const gl = ctx.createRadialGradient(0, -20, 4, 0, -20, 34); gl.addColorStop(0, 'rgba(201,166,255,.45)'); gl.addColorStop(1, 'rgba(201,166,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-34, -54, 68, 60); }
    const flash = e.hitT > 0, col = c => (flash ? '#ffffff' : c);
    const mv = e._px != null && Math.abs(e._px - e.x) > 0.05; e._px = e.x;
    const atk = run && e.atkAt != null ? Math.max(0, 1 - (run.time - e.atkAt) / 0.32) : 0;
    if (e.ahn) ahnBoss(e, t, col);
    else if (e.boss) { ctx.save(); ctx.scale(1, 0.22); const ra = 58; ctx.fillStyle = RG(0, 0, ra * 1.3, 'rgba(190,120,255,.35)', 'rgba(190,120,255,0)'); ctx.beginPath(); ctx.arc(0, 0, ra * 1.3, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(210,170,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, ra, 0, 7); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, ra * 0.78, 0, 7); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = t * 0.6 + i * Math.PI / 4; ctx.fillStyle = 'rgba(230,200,255,.8)'; ctx.fillRect(Math.cos(a) * ra * 0.89 - 2.5, Math.sin(a) * ra * 0.89 - 6, 5, 12); } ctx.restore();
        for (let i = 0; i < 5; i++) { const p = (t * 0.5 + i / 5) % 1; ctx.fillStyle = `rgba(210,170,255,${(1 - p) * 0.7})`; ctx.fillRect(Math.sin(i * 2.3) * 40, -p * 120, 2, 2); }
        if (e.enrage > 1) glowDot(0, -60, 95, '255,50,40', Math.min(0.55, (e.enrage - 1) * 0.7) * (0.8 + 0.2 * Math.sin(t * 8)));
        bossDraw(e, t, col); }
    else { const art = ENEMY_ART[e.type] || ENEMY_ART.schleim, G = (y0, y1, a, b) => (flash ? '#ffffff' : LG(y0, y1, a, b));
      ctx.save(); ctx.translate(-Math.sin(atk * Math.PI) * 6, 0); const es = ENEMY_SIZE[e.type] || 1; ctx.scale(es, es); if (e.echo) { ctx.globalAlpha = 0.8; tintDraw(() => art(e, t, t + e.bob, col, G, atk, mv), flash ? null : e.echo, 0.8, 50); } else art(e, t, t + e.bob, col, G, atk, mv); ctx.restore(); ctx.globalAlpha = 1; }
    if (false) { ctx.beginPath(); ctx.moveTo(-8, -52); ctx.lineTo(-8, -60); ctx.lineTo(-4, -55); ctx.lineTo(0, -62); ctx.lineTo(4, -55); ctx.lineTo(8, -60); ctx.lineTo(8, -52); ctx.closePath(); fillO('#ffd23f'); }
    if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, (e.boss ? -112 : -56) + Math.sin(a) * 3, 2.2, 0, 7); ctx.fill(); }
    if (e.poisonT > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(155,227,107,.8)'; ctx.beginPath(); ctx.arc(-6 + i * 6, -10 - ((t * 30 + i * 9) % 22), 2.5, 0, 7); ctx.fill(); }
    ctx.restore();
    if (e.ahn) return;
    const bw = e.boss ? 72 : 30, by = GROUND - (e.boss ? 170 : e.elite ? 62 : 56);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(e.x - bw / 2, by, bw, 5, 2); ctx.fill();
    ctx.fillStyle = e.boss ? '#c9a6ff' : e.elite ? '#d7b5ff' : '#e5484d'; rr(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 5, 2); ctx.fill();
  }

  // ---------- Normale Gegner: eine eigene Figur pro Gebiet (Version 5.7) ----------
  function eC(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); }
  function eE(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); }
  function eP(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  function eL(w, c, pts) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  function eO(w = 1.5) { ctx.lineWidth = w; ctx.strokeStyle = OUT; ctx.stroke(); }
  function eFill(c, w = 1.5) { ctx.fillStyle = c; ctx.fill(); if (w) eO(w); }
  // Auge mit Pupille, die nach links zu den Helden schaut
  function eEye(x, y, r, pupil = '#1b1726', white = '#ffffff') {
    eC(x, y, r); eFill(white, 1);
    ctx.fillStyle = pupil; eC(x - r * 0.3, y + r * 0.05, r * 0.55); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; eC(x - r * 0.5, y - r * 0.3, r * 0.22); ctx.fill();
  }
  function eGlowEye(x, y, r, rgb) { glowDot(x, y, r * 3.2, rgb, 0.55); ctx.fillStyle = `rgb(${rgb})`; eC(x, y, r); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.85)'; eC(x - r * 0.25, y - r * 0.25, r * 0.4); ctx.fill(); }
  function eLegs(step, c, boot, y0 = -14, w = 5, gap = 4) {
    for (const [lx, s] of [[-gap - w, step], [gap - 1, -step]]) { ctx.save(); ctx.translate(lx + s * 2.5, 0); rr(0, y0, w, -y0 - 2, 2); eFill(c); rr(-1.5, -4, w + 3, 4, 2); eFill(boot, 1.2); ctx.restore(); }
  }
  function eBlade(len, c = '#dfe5ee') { eP([[0, 0], [-2.2, -3], [-2.2, -len], [0, -len - 5], [2.2, -len], [2.2, -3]]); eFill(LG(-len, 0, '#ffffff', c), 1.2); }

  const ENEMY_ART = {
    // Grüne Wiesen – Schleim / Spuckschleim
    schleim(e, t, ph, C, G, a, mv) {
      const sq = Math.sin(ph * 4) * (mv ? 2.4 : 1.2), w = 19 + sq * 0.6, h = 25 - sq + a * 3;
      const col = e.ranged ? ['#e2b8ff', '#7a3cc4', '#5a2a96'] : ['#b6f59a', '#33a352', '#1f7a3a'];
      if (!e.ranged) { eL(1.6, C('#3f8a2e'), [[3, -h + 1], [4, -h - 6]]); ctx.save(); ctx.translate(4, -h - 6); ctx.rotate(-0.7); eE(4, 0, 5, 2.4); eFill(C('#7ed957'), 1); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.bezierCurveTo(-w - 1, -h * 0.85, -w * 0.45, -h, 0, -h); ctx.bezierCurveTo(w * 0.6, -h, w + 1, -h * 0.75, w, 0); ctx.quadraticCurveTo(0, 3, -w, 0); ctx.closePath();
      ctx.fillStyle = G(-h, 0, col[0], col[1]); ctx.fill(); eO(1.6);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; eE(2, -3, w * 0.8, 4); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,255,255,.28)'; eC(3 + i * 5, -4 - ((ph * 9 + i * 6) % (h - 8)), 1.4 + i * 0.4); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.6)'; eE(-9, -h + 7, 5, 2.6, -0.5); ctx.fill(); eE(-14, -h + 12, 1.6, 1.2); ctx.fill();
      eEye(-10, -13, 4.2); eEye(-1, -14, 4.6);
      ctx.fillStyle = col[2]; ctx.beginPath(); ctx.arc(-6, -6.5, 3.4, 0.1, Math.PI - 0.1); ctx.fill();
      ctx.fillStyle = '#ff8fa8'; eE(-6, -4.4, 1.8, 1); ctx.fill();
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.6); ctx.fillStyle = `rgba(196,120,255,${0.6 + p * 0.4})`; eE(-9, -3 + p * 4, 1.8, 2.2 + p * 2); ctx.fill();
        for (let i = 0; i < 3; i++) { eC(-8 + i * 8, -h - 1 + Math.sin(ph * 5 + i) * 1.5, 2.6); eFill(C(col[0]), 1); }
      }
    },
    // Finsterwald – Goblin / Goblin-Schleuderer
    goblin(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 11) : 0;
      eLegs(step, C('#5b4128'), C('#2e2218'), -13);
      ctx.save(); ctx.translate(9, -26); ctx.rotate(0.2); rr(-2.5, 0, 5, 13, 2.5); eFill(C('#6fa046')); ctx.restore();
      rr(-9, -29, 18, 18, 5); eFill(G(-29, -11, '#9a6d3f', '#6b4726'));
      ctx.fillStyle = C('#4a3220'); ctx.fillRect(-9, -16, 18, 3); ctx.fillStyle = '#e0b84a'; ctx.fillRect(-2, -16.5, 4, 4);
      eL(1, 'rgba(40,25,15,.5)', [[-5, -27], [-3, -19]]); eL(1, 'rgba(40,25,15,.5)', [[4, -27], [2, -20]]);
      const hy = -38 + (mv ? Math.abs(step) * -1 : 0);
      for (const s of [-1, 1]) { eP([[s * 6, hy - 3], [s * 19, hy - 9 + (s < 0 ? Math.sin(ph * 3) : 0)], [s * 7, hy + 3]]); eFill(C('#78b04e'), 1.3); eP([[s * 8, hy - 1.5], [s * 15, hy - 6], [s * 8, hy + 1.5]]); ctx.fillStyle = C('#d88f86'); ctx.fill(); }
      eC(0, hy, 10); eFill(G(hy - 10, hy + 10, '#8cc45c', '#5e8f38'));
      eP([[-7, hy + 1], [-15, hy + 3], [-7, hy + 5]]); eFill(C('#7ab04c'), 1.2);
      eEye(-6, hy - 2, 2.8, '#1b1726', '#ffe27a'); eEye(1, hy - 2.5, 2.8, '#1b1726', '#ffe27a');
      eL(1.6, '#3a2a14', [[-9, hy - 6], [-3, hy - 5]]); eL(1.6, '#3a2a14', [[0, hy - 6], [5, hy - 7]]);
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.moveTo(-8, hy + 5); ctx.quadraticCurveTo(-2, hy + 9, 4, hy + 5); ctx.closePath(); ctx.fill();
      eP([[-6, hy + 5.3], [-5, hy + 8], [-4, hy + 5.6]]); ctx.fillStyle = '#fff'; ctx.fill(); eP([[1, hy + 5.6], [2, hy + 7.6], [3, hy + 5.4]]); ctx.fill();
      if (e.ranged) {
        ctx.beginPath(); ctx.arc(0, hy - 1, 11.5, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(9, hy + 4); ctx.quadraticCurveTo(13, hy + 12, 6, hy + 14); ctx.lineTo(8, hy + 2); ctx.closePath(); eFill(G(hy - 12, hy + 12, '#c44a3a', '#7a2a22'));
        const p = Math.max(0, 1 - e.shotT / 0.5);
        eL(2.4, C('#6b4a2e'), [[-12, -12], [-12, -26], [-17, -33]]); eL(2.4, C('#6b4a2e'), [[-12, -26], [-7, -33]]);
        eL(1, 'rgba(60,40,25,.9)', [[-17, -33], [-12, -27 + p * 7], [-7, -33]]);
        ctx.fillStyle = '#9aa3ad'; eC(-12, -28 + p * 6, 2.4); ctx.fill();
        eC(-12, -13, 3); eFill(C('#78b04e'), 1);
      } else {
        ctx.fillStyle = C('#7f8794'); ctx.beginPath(); ctx.arc(0, hy - 2, 10.5, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(10, hy - 4); ctx.lineTo(-10, hy - 4); ctx.closePath(); ctx.fill(); eO(1.2);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-6, hy - 10, 6, 2);
        ctx.save(); ctx.translate(-10, -20); ctx.rotate(-1.1 - a * 0.9); eBlade(14, '#aab3c0'); ctx.fillStyle = C('#5a3d25'); ctx.fillRect(-3.5, -1, 7, 2.5); ctx.fillRect(-1.5, 0, 3, 6); ctx.restore();
        eC(-10, -20, 3); eFill(C('#78b04e'), 1);
      }
    },
    // Knochengruft – Skelett / Skelett-Schütze
    skelett(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 10) : 0, bone = C('#efe8d4'), dk = '#b8ae94';
      for (const [lx, s] of [[-4, step], [4, -step]]) { eL(3.2, OUT, [[lx, -15], [lx + s * 3, -7], [lx + s * 2, -1]]); eL(2.2, bone, [[lx, -15], [lx + s * 3, -7], [lx + s * 2, -1]]); ctx.fillStyle = bone; eC(lx + s * 3, -7, 1.8); ctx.fill(); eE(lx + s * 2 - 1.5, -1, 3.2, 1.6); eFill(bone, 1); }
      eE(0, -16, 7, 3.2); eFill(bone, 1.2);
      eL(3.4, OUT, [[0, -17], [0, -30]]); eL(2.2, bone, [[0, -17], [0, -30]]);
      for (let i = 0; i < 3; i++) { const y = -28 + i * 4, w = 8 - i; eL(3.4, OUT, [[0, y], [-w, y + 1.5]]); eL(3.4, OUT, [[0, y], [w, y + 1.5]]); eL(2, bone, [[-w, y + 1.5], [0, y], [w, y + 1.5]]); }
      if (!e.ranged) { ctx.save(); ctx.translate(9, -24); eC(0, 0, 8); eFill(G(-8, 8, '#8a6a3a', '#5a4024')); ctx.strokeStyle = C('#9aa3ad'); ctx.lineWidth = 1.6; eC(0, 0, 6.5); ctx.stroke(); ctx.fillStyle = C('#c9cdd6'); eC(0, 0, 2); ctx.fill(); ctx.restore(); }
      const hy = -38;
      eC(0, hy, 9); eFill(G(hy - 9, hy + 9, '#fbf6e8', '#d6ccb2'));
      rr(-6, hy + 5, 11, 6, 2); eFill(bone, 1.2);
      ctx.strokeStyle = dk; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-4 + i * 2.6, hy + 5); ctx.lineTo(-4 + i * 2.6, hy + 9); ctx.stroke(); }
      ctx.fillStyle = '#1b1726'; eE(-5, hy - 1, 2.8, 3.2); ctx.fill(); eE(2, hy - 1, 2.6, 3); ctx.fill();
      eGlowEye(-5.4, hy - 0.6, 1.2, '170,140,255'); eGlowEye(1.6, hy - 0.6, 1.1, '170,140,255');
      eP([[-2, hy + 2], [-0.5, hy + 4.5], [-3.5, hy + 4.5]]); ctx.fillStyle = '#1b1726'; ctx.fill();
      eL(1, 'rgba(120,110,90,.7)', [[3, hy - 8], [5, hy - 5], [4, hy - 3]]);
      if (e.ranged) {
        ctx.beginPath(); ctx.arc(0, hy - 1, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(10, hy + 6); ctx.quadraticCurveTo(4, hy + 2, 0, hy - 6); ctx.quadraticCurveTo(-6, hy - 2, -10, hy - 2); ctx.closePath(); eFill(G(hy - 11, hy + 6, '#4a3f66', '#2a2340'));
        const p = Math.max(0, 1 - e.shotT / 0.5);
        ctx.strokeStyle = C('#8a6a3a'); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(-6, -25, 14, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
        eL(1, 'rgba(232,226,208,.9)', [[-10.3, -38.3], [-10.3 + p * 9, -25], [-10.3, -11.7]]);
        if (p > 0.2) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-12 + p * 9, -26, 14, 1.6); }
        rr(6, -34, 5, 16, 2); eFill(C('#5a3d25'), 1); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(6.5, -38, 1.5, 4); ctx.fillRect(9, -39, 1.5, 5);
      } else {
        ctx.fillStyle = C('#8b7a6a'); ctx.beginPath(); ctx.arc(0, hy - 2, 9.8, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); eO(1.2);
        eP([[-9, hy - 4], [-15, hy - 13], [-7, hy - 8]]); eFill(C('#efe8d4'), 1); eP([[9, hy - 4], [15, hy - 13], [7, hy - 8]]); eFill(C('#efe8d4'), 1);
        eL(3.2, OUT, [[-3, -27], [-9, -19]]); eL(2, bone, [[-3, -27], [-9, -19]]);
        ctx.save(); ctx.translate(-9, -19); ctx.rotate(-1.15 - a * 0.9); eBlade(17, '#9a8f7a'); ctx.fillStyle = C('#5a3d25'); ctx.fillRect(-4, -1, 8, 2.5); ctx.fillRect(-1.5, 0, 3, 6); ctx.restore();
      }
    },
    // Glutberge – Teufelchen / Feuerteufel
    daemon(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 11) : 0, flap = Math.sin(ph * 7);
      glowDot(0, -24, 30, '255,140,60', 0.3 + 0.1 * Math.sin(ph * 8));
      for (const s of [1, -1]) { ctx.save(); ctx.translate(s * 4, -30); ctx.scale(s, 1); ctx.rotate(-0.2 + flap * 0.15);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -14); ctx.lineTo(22, -6); ctx.quadraticCurveTo(18, -2, 20, 2); ctx.quadraticCurveTo(14, 0, 13, 5); ctx.quadraticCurveTo(8, 2, 4, 6); ctx.closePath(); eFill(G(-14, 6, '#5a1a1a', '#2a0e0e'), 1.2);
        eL(1, 'rgba(255,120,80,.5)', [[0, 0], [20, 2]]); eL(1, 'rgba(255,120,80,.5)', [[0, 0], [13, 5]]); ctx.restore(); }
      ctx.strokeStyle = C('#a52a22'); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(20 + Math.sin(ph * 3) * 3, -8, 18, -26); ctx.stroke();
      eP([[18, -26], [14, -31], [18, -36], [22, -31]]); eFill(C('#2a1a1a'), 1);
      for (const [lx, s] of [[-6, step], [2, -step]]) { ctx.save(); ctx.translate(lx + s * 2.5, 0); ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(-2, -8, 2, -6); ctx.lineTo(0, -1); ctx.lineTo(5, -1); ctx.lineTo(6, -16); ctx.closePath(); eFill(C('#8f2620'), 1.2); rr(-1, -3, 7, 3, 1.5); eFill('#1b0e0c', 0); ctx.restore(); }
      rr(-9, -32, 18, 19, 7); eFill(G(-32, -13, '#e2553f', '#9e2a22'));
      ctx.fillStyle = C('#f08a5c'); eE(-1, -21, 5, 6); ctx.fill();
      const hy = -40;
      eC(0, hy, 9.5); eFill(G(hy - 10, hy + 9, '#f0644a', '#b8322a'));
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 5, hy - 7); ctx.quadraticCurveTo(s * 10, hy - 16, s * 7, hy - 21); ctx.quadraticCurveTo(s * 6, hy - 14, s * 1, hy - 9); ctx.closePath(); eFill(G(hy - 21, hy - 7, '#3a2a2a', '#1b1010'), 1); }
      eP([[8, hy - 1], [15, hy - 5], [9, hy + 3]]); eFill(C('#d4473c'), 1);
      eGlowEye(-5.5, hy - 1, 1.9, '255,214,80'); eGlowEye(1.5, hy - 1.5, 1.9, '255,214,80');
      eL(1.4, '#3a1010', [[-8, hy - 5], [-3, hy - 3.5]]); eL(1.4, '#3a1010', [[0, hy - 4], [4, hy - 5]]);
      ctx.fillStyle = '#2a0e0c'; ctx.beginPath(); ctx.moveTo(-7, hy + 4); ctx.quadraticCurveTo(-2, hy + 8, 3, hy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; eP([[-5.5, hy + 4.3], [-4.6, hy + 6.6], [-3.6, hy + 4.5]]); ctx.fill(); eP([[0, hy + 4.6], [1, hy + 6.6], [2, hy + 4.4]]); ctx.fill();
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5), r = 4.5 + p * 3 + Math.sin(ph * 10) * 0.7;
        eC(-10, -24, 3); eFill(C('#c4382f'), 1);
        glowDot(-15, -32, r + 9, '255,140,60', 0.7);
        for (let i = 0; i < 4; i++) { const fh = 6 + Math.sin(ph * 14 + i) * 2.5; ctx.fillStyle = ['#ff7a3d', '#ffd23f'][i % 2]; ctx.beginPath(); ctx.moveTo(-15 - r + i * r * 0.66, -32); ctx.quadraticCurveTo(-15 - r * 0.6 + i * r * 0.66, -32 - r - fh, -15 - r * 0.2 + i * r * 0.66, -32); ctx.fill(); }
        ctx.fillStyle = '#fff3c0'; eC(-15, -32, r * 0.7); ctx.fill();
      } else {
        ctx.save(); ctx.translate(-9, -22); ctx.rotate(-0.25 - a * 0.6);
        eL(3.4, OUT, [[0, 10], [0, -30]]); eL(2.2, C('#3a2a2a'), [[0, 10], [0, -30]]);
        eL(2.2, '#2a1a1a', [[-6, -30], [6, -30]]);
        for (const px of [-6, 0, 6]) { eP([[px - 1.6, -30], [px, -40], [px + 1.6, -30]]); eFill(LG(-40, -30, '#ffffff', '#b7bcc6'), 1); }
        ctx.restore(); eC(-9, -22, 3); eFill(C('#c4382f'), 1);
      }
    },
    // Frostgipfel – Eisgolem / Eisschamane
    golem(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 7) : 0;
      for (const [lx, s] of [[-12, step], [3, -step]]) { ctx.save(); ctx.translate(lx + s * 2, 0); eP([[0, -14], [9, -14], [10, 0], [-1, 0]]); eFill(G(-14, 0, '#9fc3dc', '#5f86a6')); ctx.restore(); }
      if (e.ranged) {
        ctx.beginPath(); ctx.moveTo(-11, -34); ctx.lineTo(11, -34); ctx.lineTo(15, -4); ctx.quadraticCurveTo(0, 0, -15, -4); ctx.closePath(); eFill(G(-34, -4, '#4f7fb0', '#2a4a78'));
        for (let i = 0; i < 4; i++) { eP([[-14 + i * 8, -5], [-10 + i * 8, -5], [-12 + i * 8, 1]]); eFill(C('#cfefff'), 1); }
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(-11, -26, 22, 3);
      } else {
        eP([[-14, -36], [13, -36], [16, -22], [11, -12], [-12, -12], [-16, -24]]); eFill(G(-36, -12, '#e6f4ff', '#8fb6d6'));
        eL(1.2, 'rgba(90,140,180,.65)', [[-8, -34], [-3, -26], [-9, -16]]); eL(1.2, 'rgba(90,140,180,.65)', [[7, -33], [10, -24]]);
        const gl = 0.6 + 0.4 * Math.sin(ph * 4); glowDot(0, -24, 10, '79,195,255', gl);
        eP([[0, -29], [4, -24], [0, -19], [-4, -24]]); ctx.fillStyle = `rgba(200,240,255,${0.7 + gl * 0.3})`; ctx.fill();
        for (const s of [-1, 1]) { eP([[s * 9, -36], [s * 13, -48], [s * 16, -35]]); eFill(C('#bfe8ff'), 1.2); eP([[s * 14, -35], [s * 20, -43], [s * 19, -32]]); eFill(C('#d8f3ff'), 1.2); }
      }
      const hy = -44 + (e.ranged ? 0 : 0);
      eP([[-9, hy - 7], [8, hy - 8], [10, hy + 6], [-10, hy + 7]]); eFill(G(hy - 8, hy + 7, '#f2faff', '#b4d2ea'));
      ctx.fillStyle = '#20384f'; ctx.fillRect(-9, hy - 1, 18, 4);
      eGlowEye(-5, hy + 1, 1.6, '79,195,255'); eGlowEye(2, hy + 1, 1.6, '79,195,255');
      if (e.ranged) {
        eP([[-10, hy - 6], [0, hy - 20], [10, hy - 6]]); eFill(G(hy - 20, hy - 6, '#5f95c8', '#2a4a78'), 1.3);
        for (let i = 0; i < 3; i++) { eP([[-7 + i * 6, hy + 7], [-4 + i * 6, hy + 7], [-5.5 + i * 6, hy + 13]]); eFill(C('#e6f6ff'), 0.8); }
        const p = Math.max(0, 1 - e.shotT / 0.5);
        eL(2.6, C('#6b4a2e'), [[-14, -2], [-14, -46]]);
        ctx.save(); ctx.translate(-14, -50 + Math.sin(ph * 3) * 1.5); ctx.rotate(ph * 1.5); glowDot(0, 0, 9 + p * 4, '160,225,255', 0.7);
        eP([[0, -6 - p * 2], [4, 0], [0, 6 + p * 2], [-4, 0]]); eFill(`rgba(220,245,255,${0.85 + p * 0.15})`, 1); ctx.restore();
        eC(-13, -26, 3.2); eFill(C('#cfe3f2'), 1);
      } else {
        ctx.save(); ctx.translate(-14, -32); ctx.rotate(0.35 + a * 0.6 + Math.sin(ph * 2) * 0.05);
        rr(-4.5, 0, 9, 13, 3); eFill(C('#cfe3f2'), 1.3); eP([[-6, 12], [6, 12], [7, 22], [0, 25], [-7, 22]]); eFill(G(12, 25, '#e8f6ff', '#9fc3dc'), 1.3);
        ctx.restore();
      }
    },
    // Nebelmoor – Moorkröte / Blasrohr-Kröte
    frosch(e, t, ph, C, G, a, mv) {
      const hop = mv ? Math.abs(Math.sin(ph * 6)) * 5 : 0;
      ctx.save(); ctx.translate(0, -hop);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, -10); ctx.quadraticCurveTo(s * 18, -14 + hop, s * 14, -1 + hop * 0.6); ctx.lineTo(s * 5, -1 + hop * 0.6); ctx.closePath(); eFill(G(-14, 0, '#6c8f3a', '#3f5e22'), 1.3);
        for (let i = 0; i < 3; i++) { eE(s * (8 + i * 3.5), hop * 0.6, 2, 1.2); eFill(C('#55752e'), 1); } }
      eE(0, -16, 16, 13); eFill(G(-29, -3, '#7da348', '#41632a'));
      ctx.fillStyle = C('#d9d49a'); eE(-4, -12, 9, 8); ctx.fill();
      ctx.fillStyle = 'rgba(40,60,20,.6)'; for (const [x, y, r] of [[6, -24, 2.2], [11, -18, 1.6], [3, -27, 1.4], [10, -11, 1.8]]) { eC(x, y, r); ctx.fill(); }
      eL(2, OUT, [[-15, -15], [-6, -13], [4, -16]]); eL(1, '#9e3a3a', [[-14, -14.5], [-6, -12.5], [3, -15.5]]);
      for (const [x, r] of [[-9, 5.4], [3, 5.2]]) { eC(x, -27, r + 1.6); eFill(G(-34, -22, '#8cb352', '#4f7530'), 1.3); eEye(x - 0.5, -27.5, r, '#1b1726', '#f5e9a0'); ctx.fillStyle = 'rgba(30,20,10,.85)'; ctx.fillRect(x - r * 0.9, -28, r * 1.4, 1.4); }
      eE(2, -34, 12, 2.4, -0.05); eFill(C('#5a4a2a'), 1); eE(2, -36, 6, 3.2); eFill(C('#6a5a32'), 1);
      eL(1.4, C('#8ab04a'), [[6, -37], [9, -44]]); eE(10, -45, 1.8, 3.4, 0.4); eFill(C('#a3c95a'), 0);
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5);
        ctx.save(); ctx.translate(-14, -14); ctx.rotate(-0.12); rr(-20, -1.8, 22, 3.6, 1.8); eFill(G(-2, 2, '#c9a46a', '#8a6a3a'), 1.2); for (let i = 0; i < 3; i++) { ctx.fillStyle = '#5a3d25'; ctx.fillRect(-16 + i * 6, -2, 1.2, 4); } ctx.restore();
        if (p > 0) { glowDot(-36, -17, 4 + p * 4, '150,230,110', p); }
      } else {
        ctx.save(); ctx.translate(-12, -8); ctx.rotate(-1.3 - a * 0.5);
        eL(3.2, OUT, [[0, 8], [0, -26]]); eL(2, C('#c9b98f'), [[0, 8], [0, -26]]);
        eP([[0, -26], [-3, -30], [0, -38], [3, -30]]); eFill(LG(-38, -26, '#f2ead2', '#b8ae94'), 1);
        eL(1.2, '#8ab04a', [[-1.5, -24], [1.5, -22], [-1.5, -20]]);
        ctx.restore(); eC(-12, -8, 3); eFill(C('#6c8f3a'), 1);
      }
      ctx.restore();
    },
    // Dornendickicht – Dornenwürger / Samenspucker
    dorn(e, t, ph, C, G, a, mv) {
      const sway = Math.sin(ph * 2.2) * 0.12;
      for (let i = 0; i < 4; i++) { const x = -9 + i * 6, w = Math.sin(ph * 6 + i) * (mv ? 2.5 : 0.8); eL(3.6, OUT, [[x, -10], [x + w - 2, -4], [x - 3 + w, 0]]); eL(2.4, C('#5a3d25'), [[x, -10], [x + w - 2, -4], [x - 3 + w, 0]]); }
      ctx.save(); ctx.translate(0, -8); ctx.rotate(sway);
      eE(0, -10, 12, 11); eFill(G(-21, 1, '#6f9a3a', '#3d5e22'));
      for (let i = 0; i < 7; i++) { const an = -Math.PI * 0.95 + i * 0.5, x = Math.cos(an) * 11, y = -10 + Math.sin(an) * 10; eP([[x - Math.sin(an) * 2, y + Math.cos(an) * 2], [x + Math.cos(an) * 6, y + Math.sin(an) * 6], [x + Math.sin(an) * 2, y - Math.cos(an) * 2]]); eFill(C('#e6d6a8'), 0.8); }
      eL(1, 'rgba(30,50,15,.5)', [[-6, -16], [-2, -6], [4, -2]]);
      eL(3.4, OUT, [[2, -18], [0, -26], [-3, -32]]); eL(2.4, C('#4f7a2e'), [[2, -18], [0, -26], [-3, -32]]);
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(1, -22); ctx.rotate(s * 0.9); eE(7, 0, 7, 2.6); eFill(C('#7ec85a'), 1); ctx.restore(); }
      const open = e.ranged ? 0.25 + Math.max(0, 1 - e.shotT / 0.5) * 0.5 : 0.25 + a * 0.6 + Math.max(0, Math.sin(ph * 2)) * 0.1;
      ctx.save(); ctx.translate(-4, -36);
      for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * open * 0.7); ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(-4, s * 12, -16, s * 2); ctx.quadraticCurveTo(-6, s * 1, 4, 0); ctx.closePath(); eFill(s < 0 ? G(-12, 0, '#d84a6a', '#8a2a3a') : G(0, 12, '#8a2a3a', '#5e1a2a'), 1.3);
        for (let i = 0; i < 4; i++) { const tx = -13 + i * 4; eP([[tx, s * 1.6], [tx + 1, s * 4.5], [tx + 2, s * 1.4]]); ctx.fillStyle = '#fff6e0'; ctx.fill(); } ctx.restore(); }
      ctx.fillStyle = 'rgba(255,220,120,.9)'; eC(-1, -1.6, 1.4); ctx.fill();
      ctx.restore();
      if (e.ranged) { const p = Math.max(0, 1 - e.shotT / 0.5); if (p > 0.1) { ctx.fillStyle = '#c9a46a'; eE(-22 + p * 4, -36, 2.6, 1.8); eFill('#c9a46a', 1); } }
      else { ctx.save(); ctx.translate(-8, -16); ctx.rotate(-0.4 - a * 1.2); ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-8, -4, -10, -14, -18, -14 + Math.sin(ph * 5) * 2); ctx.stroke(); ctx.strokeStyle = C('#4f7a2e'); ctx.lineWidth = 2.2; ctx.stroke();
        for (let i = 1; i < 4; i++) { const x = -i * 5, y = -i * 4; eP([[x, y], [x - 1, y - 4], [x + 2, y - 1]]); eFill(C('#e6d6a8'), 0); } ctx.restore(); }
      ctx.restore();
    },
    // Schattenkrypta – Gruftfledermaus / Schreifledermaus
    fleder(e, t, ph, C, G, a, mv) {
      const fy = -32 + Math.sin(ph * 4) * 4 - a * 2, flap = Math.sin(ph * 14);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; eE(0, 0, 10 - Math.sin(ph * 4) * 2, 2.5); ctx.fill();
      ctx.save(); ctx.translate(-a * 4, fy);
      for (const s of [1, -1]) { ctx.save(); ctx.scale(s, 1); ctx.rotate(flap * 0.45 - 0.15);
        ctx.beginPath(); ctx.moveTo(3, -3); ctx.quadraticCurveTo(14, -16, 26, -10); ctx.quadraticCurveTo(24, -4, 26, 2); ctx.quadraticCurveTo(21, -1, 18, 4); ctx.quadraticCurveTo(14, 0, 10, 5); ctx.quadraticCurveTo(7, 1, 3, 4); ctx.closePath();
        eFill(G(-16, 5, e.ranged ? '#6a3a9a' : '#5a3a6a', '#2a1a3a'), 1.3);
        eL(1, 'rgba(200,160,255,.35)', [[3, -2], [26, -10]]); eL(1, 'rgba(200,160,255,.35)', [[3, -1], [18, 4]]); ctx.restore(); }
      eE(0, 0, 9, 10); eFill(G(-10, 10, '#6a4a7a', '#3a2448'));
      ctx.fillStyle = C('#8a6a96'); eE(-1, 3, 5, 5.5); ctx.fill();
      for (const s of [-1, 1]) { eP([[s * 3 - 1, -8], [s * 8 - 1, -18], [s * 7 + 1, -6]]); eFill(C('#5a3a6a'), 1.2); eP([[s * 4 - 1, -8.5], [s * 7.4 - 1, -15], [s * 6.4, -8]]); ctx.fillStyle = C('#c48aa8'); ctx.fill(); }
      eGlowEye(-4.5, -3, 1.9, e.ranged ? '200,140,255' : '255,70,80'); eGlowEye(1.5, -3.5, 1.9, e.ranged ? '200,140,255' : '255,70,80');
      eE(-2, 1, 2, 1.3); eFill('#2a1a2a', 0);
      ctx.fillStyle = '#fff'; eP([[-4, 3], [-3.2, 6], [-2.4, 3]]); ctx.fill(); eP([[-0.6, 3], [0.2, 6], [1, 3]]); ctx.fill();
      eL(1.4, OUT, [[-3, 9], [-4, 13]]); eL(1.4, OUT, [[2, 9], [3, 13]]);
      if (e.ranged) { const p = Math.max(0, 1 - e.shotT / 0.6); for (let i = 0; i < 3; i++) { const q = (p + i * 0.33) % 1; ctx.strokeStyle = `rgba(200,140,255,${(1 - q) * 0.8 * (p > 0 ? 1 : 0.35)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-6 - q * 14, 2, 3 + q * 8, Math.PI * 0.7, Math.PI * 1.3); ctx.stroke(); } }
      ctx.restore();
    },
    // Aschewüste – Glutskorpion / Giftskorpion
    skorpion(e, t, ph, C, G, a, mv) {
      const step = mv ? ph * 14 : 0, body = e.ranged ? ['#b0a04a', '#6a5a22'] : ['#d98a3a', '#8a4a1a'];
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = -6 + i * 6, k = Math.sin(step + i * 2 + (s > 0 ? Math.PI : 0)) * 2; eL(2.8, OUT, [[x, -7], [x + s * 2 - 3 + k, -12], [x - 5 + k + s, 0]]); eL(1.6, C(body[1]), [[x, -7], [x + s * 2 - 3 + k, -12], [x - 5 + k + s, 0]]); }
      const segs = [[10, -9, 5.5], [15, -15, 5], [17, -22, 4.6], [15, -29, 4.2], [10, -34, 3.8]], sw = Math.sin(ph * 2) * 1.5 - a * 5;
      segs.forEach(([x, y, r], i) => { eC(x + (i > 1 ? sw * (i - 1) * 0.5 : 0), y + (i > 2 ? a * 2 : 0), r); eFill(G(y - r, y + r, body[0], body[1]), 1.3); });
      const [sx, sy] = [10 + sw * 1.5, -34 + a * 2];
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.6 - a * 0.6); eP([[0, -3], [-10, -1], [-3, 3]]); eFill(LG(-3, 3, '#3a2a1a', '#1b120a'), 1);
      if (e.ranged) { const p = Math.max(0, 1 - e.shotT / 0.5); glowDot(-9, -1, 5 + p * 5, '160,240,90', 0.6 + p * 0.4); ctx.fillStyle = '#b8ff6a'; eE(-9, 2 + p * 3, 1.3, 1.8 + p); ctx.fill(); }
      ctx.restore();
      eE(-2, -9, 12, 6.5); eFill(G(-15, -2, body[0], body[1]));
      for (let i = 0; i < 3; i++) eL(1, 'rgba(60,30,10,.5)', [[-6 + i * 5, -15], [-7 + i * 5, -4]]);
      for (const [dy, s] of [[-4, 1], [-12, -1]]) { ctx.save(); ctx.translate(-12, dy); ctx.rotate(s * 0.15 - a * 0.3);
        eL(3.4, OUT, [[0, 0], [-7, -2]]); eL(2.2, C(body[1]), [[0, 0], [-7, -2]]);
        ctx.translate(-9, -2); const op = 0.3 + Math.max(0, Math.sin(ph * 3 + dy)) * 0.3 + a * 0.4;
        ctx.save(); ctx.rotate(-op); eE(-4, -1.5, 5, 2.4); eFill(G(-4, 1, body[0], body[1]), 1.2); ctx.restore();
        ctx.save(); ctx.rotate(op * 0.6); eE(-3, 1.5, 4, 2); eFill(G(-1, 4, body[0], body[1]), 1.2); ctx.restore(); ctx.restore(); }
      ctx.fillStyle = '#1b120a'; eC(-10, -12, 1.4); ctx.fill(); eC(-7, -13, 1.2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; eE(-5, -12, 5, 1.6, -0.2); ctx.fill();
    },
    // Eisgrotten – Kristallspinne / Netzspinne
    spinne(e, t, ph, C, G, a, mv) {
      const step = mv ? ph * 16 : ph * 2;
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const x = -4 + i * 3.5, k = Math.sin(step + i * 1.6 + (s > 0 ? 1.5 : 0)) * 2.5, reach = -12 + i * 8;
        eL(2.6, OUT, [[x, -12], [x + reach * 0.5 + k, -22 + s * 1.5], [x + reach + k, 0]]); eL(1.6, C('#4a5a7a'), [[x, -12], [x + reach * 0.5 + k, -22 + s * 1.5], [x + reach + k, 0]]); }
      ctx.save(); ctx.translate(10, -16);
      eP([[-7, -2], [-2, -12], [8, -11], [12, -2], [8, 8], [-3, 8]]); eFill(G(-12, 8, '#d8f3ff', '#5fa8d6'));
      eL(1, 'rgba(255,255,255,.7)', [[-2, -12], [2, -2], [8, -11]]); eL(1, 'rgba(255,255,255,.5)', [[2, -2], [-3, 8]]); eL(1, 'rgba(255,255,255,.5)', [[2, -2], [12, -2]]);
      glowDot(3, -1, 7, '140,220,255', 0.4 + 0.25 * Math.sin(ph * 3));
      ctx.restore();
      eE(-5, -14, 8, 6.5); eFill(G(-20, -8, '#5a6a8a', '#2a3450'));
      eGlowEye(-10, -16, 1.6, '120,230,255'); eGlowEye(-6, -17.5, 1.9, '120,230,255'); eGlowEye(-11.5, -13, 1, '120,230,255'); eGlowEye(-7.5, -13.5, 1, '120,230,255');
      ctx.save(); ctx.translate(-12, -10); for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * (0.2 + a * 0.5)); eP([[0, 0], [-6, s * 1], [-2, s * 3]]); eFill(C('#cfefff'), 1); ctx.restore(); } ctx.restore();
      if (e.ranged) { const p = Math.max(0, 1 - e.shotT / 0.5); ctx.strokeStyle = `rgba(240,248,255,${0.5 + p * 0.5})`; ctx.lineWidth = 0.8; for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(14, -24); ctx.lineTo(14 + Math.cos(an) * (3 + p * 3), -24 + Math.sin(an) * (3 + p * 3)); ctx.stroke(); } eL(0.8, 'rgba(240,248,255,.6)', [[14, -24], [14, -40]]); }
    },
    // Sternenfeld – Sternengeist / Sternenrufer
    astral(e, t, ph, C, G, a, mv) {
      const fy = -6 + Math.sin(ph * 2.5) * 3;
      ctx.save(); ctx.translate(-a * 4, fy);
      glowDot(0, -26, 28, '140,160,255', 0.35);
      ctx.beginPath(); ctx.moveTo(-10, -40); ctx.quadraticCurveTo(0, -50, 10, -40); ctx.lineTo(13, -14);
      for (let i = 0; i < 5; i++) { const x0 = 13 - i * 5.2; ctx.quadraticCurveTo(x0 - 2.6, -4 + Math.sin(ph * 5 + i) * 2.5, x0 - 5.2, -12); }
      ctx.closePath(); ctx.fillStyle = G(-48, -6, '#3a4aa8', 'rgba(40,30,110,.4)'); ctx.fill(); eO(1.3);
      for (let i = 0; i < 9; i++) { const x = -9 + hash(i + e.bob) * 18, y = -38 + hash(i * 3 + 1) * 26, tw = 0.5 + 0.5 * Math.sin(ph * 4 + i); ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`; eC(x, y, 0.6 + tw * 0.6); ctx.fill(); }
      ctx.fillStyle = '#0d0a24'; eE(-1, -36, 7, 6.5); ctx.fill();
      for (const [x, y] of [[-4, -37], [1.5, -37.5]]) { glowDot(x, y, 5, '255,240,160', 0.8); ctx.fillStyle = '#fff6c0'; eP([[x, y - 2.6], [x + 0.8, y - 0.8], [x + 2.6, y], [x + 0.8, y + 0.8], [x, y + 2.6], [x - 0.8, y + 0.8], [x - 2.6, y], [x - 0.8, y - 0.8]]); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const an = ph * 1.8 + i * 2.1; ctx.fillStyle = '#ffe58a'; eC(Math.cos(an) * 17, -26 + Math.sin(an) * 6, 1.5); ctx.fill(); }
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5);
        eL(2.2, C('#c9b8ff'), [[-12, -4], [-14, -40]]);
        glowDot(-14, -43, 7 + p * 5, '255,230,140', 0.85);
        ctx.fillStyle = '#fff6c0'; ctx.save(); ctx.translate(-14, -43); ctx.rotate(ph * 2); eP([[0, -5], [1.4, -1.4], [5, 0], [1.4, 1.4], [0, 5], [-1.4, 1.4], [-5, 0], [-1.4, -1.4]]); ctx.fill(); ctx.restore();
      } else {
        ctx.save(); ctx.translate(-11, -22); ctx.rotate(-0.6 - a * 1.1);
        ctx.beginPath(); ctx.arc(-4, -10, 11, -Math.PI * 0.55, Math.PI * 0.5); ctx.arc(-1, -10, 8, Math.PI * 0.45, -Math.PI * 0.5, true); ctx.closePath(); eFill(LG(-21, 1, '#fff6d0', '#c9b8ff'), 1);
        ctx.restore();
      }
      ctx.restore();
    },
    // Uralter Hain – Pilzling / Sporenpilz
    pilz(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 10) : 0, sq = Math.sin(ph * 3) * 0.8;
      for (const [lx, s] of [[-6, step], [2, -step]]) { rr(lx + s * 2.5, -8, 5, 8, 2); eFill(C('#c9b28a'), 1.2); }
      rr(-8, -24 + sq, 16, 18 - sq, 6); eFill(G(-24, -6, '#fbf2dc', '#d6c49a'));
      eEye(-5, -16 + sq, 2.4); eEye(1, -16.5 + sq, 2.4);
      ctx.fillStyle = 'rgba(255,140,150,.5)'; eC(-6.5, -12.5 + sq, 1.6); ctx.fill(); eC(3, -12.5 + sq, 1.6); ctx.fill();
      eL(1.2, OUT, [[-4, -11.5 + sq], [-2, -10.5 + sq], [0, -11.5 + sq]]);
      const capC = e.ranged ? ['#b88ae0', '#6a3a9a'] : ['#ff5a4a', '#b8221a'];
      ctx.beginPath(); ctx.moveTo(-17, -22 + sq); ctx.bezierCurveTo(-17, -42, 17, -42, 17, -22 + sq); ctx.quadraticCurveTo(0, -18 + sq, -17, -22 + sq); ctx.closePath(); eFill(G(-40, -20, capC[0], capC[1]));
      ctx.fillStyle = 'rgba(255,255,255,.95)'; for (const [x, y, r] of [[-9, -30, 3], [1, -35, 3.6], [10, -28, 2.6], [-2, -26, 1.8], [-13, -24, 1.6]]) { eC(x, y + sq * 0.5, r); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.3)'; eE(-6, -35, 6, 2, -0.4); ctx.fill();
      ctx.fillStyle = 'rgba(90,60,30,.35)'; ctx.fillRect(-11, -21.5 + sq, 22, 1.5);
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.6);
        for (let i = 0; i < 6; i++) { const q = (ph * 0.4 + i / 6) % 1; ctx.fillStyle = `rgba(210,180,255,${(1 - q) * (0.4 + p * 0.5)})`; eC(-14 + i * 5 + Math.sin(ph * 2 + i) * 3, -36 - q * 14, 1.4 + q * 2); ctx.fill(); }
        eC(-10, -14, 2.6); eFill(C('#f2e6c6'), 1);
      } else {
        ctx.save(); ctx.translate(-9, -13); ctx.rotate(-0.7 - a * 1.2);
        ctx.beginPath(); ctx.moveTo(-1.5, 2); ctx.lineTo(1.5, 2); ctx.lineTo(3.5, -14); ctx.quadraticCurveTo(0, -18, -3.5, -14); ctx.closePath(); eFill(G(-18, 2, '#9a6d3f', '#5a3d25'), 1.2);
        ctx.fillStyle = '#4a3220'; eC(-2, -12, 0.9); ctx.fill(); eC(1.5, -9, 0.8); ctx.fill();
        ctx.restore(); eC(-9, -13, 2.6); eFill(C('#f2e6c6'), 1);
      }
    },
    // Totenreich – Kettengeist / Seelenrufer
    geist(e, t, ph, C, G, a, mv) {
      const fy = -4 + Math.sin(ph * 2.2) * 3;
      ctx.save(); ctx.translate(-a * 5, fy);
      glowDot(0, -24, 26, '120,255,220', 0.25);
      ctx.beginPath(); ctx.moveTo(-9, -42); ctx.quadraticCurveTo(0, -54, 10, -42); ctx.quadraticCurveTo(15, -26, 14, -12);
      for (let i = 0; i < 5; i++) { const x0 = 14 - i * 5.6; ctx.lineTo(x0 - 2.8, -2 + Math.sin(ph * 6 + i * 1.3) * 3); ctx.lineTo(x0 - 5.6, -11); }
      ctx.quadraticCurveTo(-14, -30, -9, -42); ctx.closePath(); ctx.fillStyle = G(-50, -2, 'rgba(170,220,215,.95)', 'rgba(60,110,120,.25)'); ctx.fill(); eO(1.2);
      ctx.fillStyle = '#081414'; eE(-2, -38, 6.5, 6); ctx.fill();
      eGlowEye(-4.5, -38.5, 1.7, '120,255,220'); eGlowEye(0.5, -38.5, 1.7, '120,255,220');
      eL(1.6, '#7a8a94', [[8, -24], [10, -18], [8, -12], [11, -6]]); ctx.strokeStyle = '#9aa8b0'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { eE(8.5 + (i % 2) * 1.5, -22 + i * 5, 1.5, 2.4); ctx.stroke(); }
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5);
        eL(2, C('#d6e8e4'), [[-6, -24], [-12, -26]]);
        glowDot(-15, -28, 7 + p * 5, '120,255,220', 0.9); ctx.fillStyle = '#e6fff8'; eC(-15, -28, 2.6 + p * 1.4); ctx.fill();
      } else {
        ctx.save(); ctx.translate(-8, -24); ctx.rotate(-0.3 - a * 1.1);
        eL(3.2, OUT, [[0, 14], [0, -26]]); eL(2, C('#4a3a2a'), [[0, 14], [0, -26]]);
        ctx.beginPath(); ctx.moveTo(1, -26); ctx.quadraticCurveTo(-10, -30, -20, -18); ctx.quadraticCurveTo(-10, -24, 1, -21); ctx.closePath(); eFill(LG(-30, -18, '#eef4f6', '#8aa0aa'), 1);
        ctx.restore();
        eL(2.2, C('#d6e8e4'), [[-5, -26], [-8, -24]]);
      }
      ctx.restore();
    },
    // Drachenhort – Drachenjunges / Feuerdrache
    drache(e, t, ph, C, G, a, mv) {
      const step = mv ? Math.sin(ph * 10) : 0, flap = Math.sin(ph * 5) * 0.2, sc = e.ranged ? ['#e0703a', '#9a3a1a'] : ['#4ab07a', '#22704a'];
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(18, -8, 22 + Math.sin(ph * 3) * 2, -18); ctx.stroke(); ctx.strokeStyle = C(sc[1]); ctx.lineWidth = 4.2; ctx.stroke();
      eP([[22 + Math.sin(ph * 3) * 2, -18], [19, -24], [26, -22]]); eFill(C(sc[1]), 1);
      ctx.save(); ctx.translate(4, -30); ctx.rotate(-0.3 + flap);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -16); ctx.lineTo(20, -12); ctx.quadraticCurveTo(15, -8, 17, -3); ctx.quadraticCurveTo(11, -5, 10, 0); ctx.quadraticCurveTo(6, -2, 3, 3); ctx.closePath(); eFill(G(-16, 3, '#f2c46a', '#b8862a'), 1.2); ctx.restore();
      for (const [lx, s] of [[-6, step], [2, -step]]) { ctx.save(); ctx.translate(lx + s * 2.5, 0); rr(0, -14, 6, 13, 3); eFill(C(sc[1]), 1.2); for (let i = 0; i < 3; i++) { eP([[i * 2.2 - 1, -1], [i * 2.2 - 2, 1.2], [i * 2.2 + 0.4, -1]]); ctx.fillStyle = '#f2ead2'; ctx.fill(); } ctx.restore(); }
      eE(0, -22, 10, 11); eFill(G(-33, -11, sc[0], sc[1]));
      ctx.fillStyle = C('#f2d48a'); eE(-3, -20, 5, 8); ctx.fill(); ctx.strokeStyle = 'rgba(150,110,40,.5)'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-7, -26 + i * 4); ctx.lineTo(1, -26 + i * 4); ctx.stroke(); }
      for (let i = 0; i < 4; i++) { eP([[6 + i, -30 + i * 4], [11 + i, -30 + i * 4], [7 + i, -26 + i * 4]]); eFill(C('#f2c46a'), 0.8); }
      const hy = -38;
      ctx.beginPath(); ctx.moveTo(6, hy - 6); ctx.quadraticCurveTo(0, hy - 10, -8, hy - 5); ctx.quadraticCurveTo(-18, hy - 3, -18, hy + 3); ctx.quadraticCurveTo(-10, hy + 7, 6, hy + 5); ctx.closePath(); eFill(G(hy - 10, hy + 7, sc[0], sc[1]));
      for (const s of [0, 1]) { eP([[2 + s * 4, hy - 7], [6 + s * 6, hy - 16], [6 + s * 4, hy - 6]]); eFill(C('#f2ead2'), 1); }
      ctx.fillStyle = OUT; eC(-15, hy - 1, 0.9); ctx.fill();
      eC(-4, hy - 3, 2.6); eFill('#ffe27a', 1); ctx.fillStyle = '#1b1726'; eE(-4.6, hy - 3, 0.9, 2.2); ctx.fill();
      eL(1, OUT, [[-17, hy + 2.5], [-6, hy + 3]]);
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5), fl = 0.3 + p * 0.7;
        glowDot(-19, hy + 2, 6 + p * 8, '255,150,60', fl);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(255,${190 - i * 40},80,${fl})`; eC(-20 - i * 3 - p * 4, hy + 2 + Math.sin(ph * 12 + i) * 1.4, 2.4 - i * 0.5 + p); ctx.fill(); }
      } else {
        ctx.save(); ctx.translate(-8, -26); ctx.rotate(0.3 - a * 1);
        rr(-2.5, 0, 5, 9, 2.5); eFill(C(sc[1]), 1.1);
        for (let i = 0; i < 3; i++) { eP([[-2 + i * 2, 9], [-3 + i * 2, 13], [-0.5 + i * 2, 9]]); ctx.fillStyle = '#f2ead2'; ctx.fill(); }
        ctx.restore();
        if (a > 0.3) for (let i = 0; i < 3; i++) eL(1.6, `rgba(255,255,255,${a})`, [[-18 + i * 3, -30], [-24 + i * 3, -16]]);
      }
    },
    // Himmelsspitze – Sturmelementar / Blitzrufer
    sturm(e, t, ph, C, G, a, mv) {
      const fy = -10 + Math.sin(ph * 2) * 3;
      ctx.save(); ctx.translate(-a * 5, fy);
      const flick = Math.sin(ph * 23) > 0.6 ? 1 : 0;
      glowDot(0, -22, 26, '180,200,255', 0.25 + flick * 0.25);
      for (let i = 0; i < 4; i++) { const p = (ph * 0.8 + i * 0.25) % 1; ctx.fillStyle = `rgba(150,170,200,${(1 - p) * 0.6})`; eC(-6 + i * 4, -2 + p * 8, 2 + p * 2); ctx.fill(); }
      const puffs = [[-9, -14, 8], [3, -12, 9], [10, -20, 7.5], [-12, -24, 7], [-3, -28, 10], [7, -32, 8]];
      puffs.forEach(([x, y, r]) => { eC(x, y, r + 1.5); ctx.fillStyle = OUT; ctx.fill(); });
      puffs.forEach(([x, y, r], i) => { eC(x + Math.sin(ph * 2 + i) * 0.8, y, r); ctx.fillStyle = G(y - r, y + r, '#c9d4e6', '#5a6a86'); ctx.fill(); });
      ctx.strokeStyle = `rgba(255,248,180,${0.55 + flick * 0.45})`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(2, -28); ctx.lineTo(-2, -22); ctx.lineTo(3, -20); ctx.lineTo(-1, -12); ctx.stroke();
      eGlowEye(-6.5, -25, 1.9, '255,248,180'); eGlowEye(0, -26, 1.9, '255,248,180');
      eL(1.4, '#2a3248', [[-9, -29], [-4.5, -27.6]]); eL(1.4, '#2a3248', [[-2, -28], [2, -29.6]]);
      if (e.ranged) {
        const p = Math.max(0, 1 - e.shotT / 0.5);
        glowDot(-17, -20, 6 + p * 6, '255,248,180', 0.6 + p * 0.4);
        ctx.strokeStyle = '#fff8c0'; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const an = ph * 9 + i * 2.1; ctx.beginPath(); ctx.moveTo(-17, -20); ctx.lineTo(-17 + Math.cos(an) * (4 + p * 4), -20 + Math.sin(an) * (4 + p * 4)); ctx.stroke(); }
      } else {
        ctx.strokeStyle = `rgba(255,248,180,${0.5 + a * 0.5})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(-20 - a * 6, -14); ctx.lineTo(-17 - a * 6, -11); ctx.lineTo(-25 - a * 8, -6); ctx.stroke();
      }
      ctx.restore();
    },
  };
  const ENEMY_KIND_LIST = ['schleim', 'goblin', 'skelett', 'daemon', 'golem', 'frosch', 'dorn', 'fleder', 'skorpion', 'spinne', 'astral', 'pilz', 'geist', 'drache', 'sturm'];
  const ENEMY_SIZE = { skorpion: 1.3, spinne: 1.25, schleim: 1.05 };
  // ================= Umgebung (Grafik-Update 6.0): 15 eigene Gebiete, Lager und Turm =================
  const frac = x => x - Math.floor(x);
  function vg(stops, y0 = 0, y1 = H) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function skyFill(stops, y1 = GROUND) { ctx.fillStyle = vg(stops, 0, y1); ctx.fillRect(0, 0, W, H); }
  function disc(x, y, r, core, rgb, a = 0.5) { glowDot(x, y, r * 7, rgb, a * 0.35); glowDot(x, y, r * 2.6, rgb, a); ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  function moon(x, y, r, t, tint = '#f3ecd8', glow = '240,232,210') {
    glowDot(x, y, r * 6, glow, 0.22); glowDot(x, y, r * 2.2, glow, 0.35);
    ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.08)'; for (const [dx, dy, rr2] of [[-4, -3, 3.4], [4, 3, 2.4], [-2, 5, 1.8], [5, -5, 1.6]]) { ctx.beginPath(); ctx.arc(x + dx * r / 14, y + dy * r / 14, rr2 * r / 14, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, 7); ctx.fill();
  }
  function stars(t, n, yMax = 150, a = 1, seed = 0) {
    for (let i = 0; i < n; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i + seed) * 2) + i), x = hash(i * 1.3 + seed) * W, y = hash(i * 2.7 + 5 + seed) * yMax, s = hash(i + 11 + seed) < 0.12 ? 1.8 : 1.1;
      ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.75 * tw) * a})`; ctx.fillRect(x, y, s, s);
      if (s > 1.5 && tw > 0.8) { ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`; ctx.fillRect(x - 2, y + 0.4, 5.8, 1); ctx.fillRect(x + 0.4, y - 2, 1, 5.8); }
    }
  }
  function cloud(x, y, s, top, bottom, a = 1) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = bottom; ctx.beginPath(); ctx.ellipse(0, 4, 40, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(-16, 0, 18, 11, 0, 0, 7); ctx.ellipse(4, -6, 20, 15, 0, 0, 7); ctx.ellipse(22, 0, 16, 10, 0, 0, 7); ctx.ellipse(0, 3, 36, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-2, -12, 10, 4, -0.2, 0, 7); ctx.fill();
    ctx.restore();
  }
  function clouds(t, n, y0, y1, top, bottom, a = 1, speed = 6, seed = 0, scale = 1) {
    for (let i = 0; i < n; i++) { const sp = speed * (0.6 + hash(i + seed) * 0.8), x = frac(hash(i * 3.3 + seed) + t * sp / (W + 200)) * (W + 200) - 100; cloud(x, y0 + hash(i * 5.1 + seed) * (y1 - y0), (0.55 + hash(i + 7 + seed) * 0.6) * scale, top, bottom, a); }
  }
  // Höhenzug: rund, spitz (Berge), Dünen, Tafelberge
  function ry(wx, f, seed, kind) {
    const u = wx * f + seed;
    if (kind === 'peak') { const a = 1 - Math.abs(frac(u) * 2 - 1), b = 1 - Math.abs(frac(u * 2.37 + 0.31) * 2 - 1); return Math.pow(a, 1.5) * 0.72 + Math.pow(b, 2.2) * 0.32 + Math.sin(u * 9.3) * 0.025; }
    if (kind === 'dune') return 0.5 + 0.42 * Math.sin(u) + 0.12 * Math.sin(u * 2.2 + 1);
    if (kind === 'mesa') { const s = Math.sin(u) * 0.7 + Math.sin(u * 0.37 + 2) * 0.3; return s > 0.25 ? 0.95 + Math.sin(u * 11) * 0.015 : s > 0.05 ? 0.2 + (s - 0.05) * 3.75 : 0.18 + 0.05 * Math.sin(u * 4); }
    return 0.5 + 0.34 * Math.sin(u) + 0.14 * Math.sin(u * 2.3 + seed * 1.7) + 0.05 * Math.sin(u * 6.1 + seed);
  }
  function ridge(sc, par, base, amp, f, fill, o = {}) {
    const off = sc * par, kind = o.kind, seed = o.seed || 0, ys = [];
    ctx.beginPath(); ctx.moveTo(-4, H);
    for (let x = -4; x <= W + 4; x += 4) { const y = base - amp * ry(x + off, f, seed, kind); ys.push(y); ctx.lineTo(x, y); }
    ctx.lineTo(W + 4, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (o.snow) {
      ctx.save(); ctx.clip(); const sl = base - amp * (o.snowAt || 0.62);
      ctx.beginPath(); ctx.moveTo(-4, 0); for (let x = -4; x <= W + 4; x += 6) ctx.lineTo(x, sl + Math.sin((x + off) * 0.21) * 3 + Math.sin((x + off) * 0.07) * 4); ctx.lineTo(W + 4, 0); ctx.closePath();
      ctx.fillStyle = o.snow; ctx.fill();
      ctx.restore();
    }
    if (o.shade) { ctx.save(); ctx.clip(); ctx.fillStyle = vg(['rgba(0,0,0,0)', o.shade], base - amp, base + 20); ctx.fillRect(0, base - amp - 4, W, H); ctx.restore(); }
    if (o.rim) { ctx.strokeStyle = o.rim; ctx.lineWidth = 1; ctx.beginPath(); ys.forEach((y, i) => (i ? ctx.lineTo(-4 + i * 4, y) : ctx.moveTo(-4, y))); ctx.stroke(); }
    return x => base - amp * ry(x + off, f, seed, kind);
  }
  // Wiederholt Dinge in der Welt (parallax), fest verankert über die Weltposition
  function each(sc, par, sp, fn, skip = 0, seed = 0) {
    const off = sc * par, k0 = Math.floor((off - 120) / sp), k1 = Math.floor((off + W + 120) / sp);
    for (let k = k0; k <= k1; k++) { if (hash(k * 7.13 + seed) < skip) continue; fn(k * sp + hash(k * 3.1 + seed) * sp * 0.6 - off, k); }
  }
  function fog(t, y, h, rgb, a, speed = 8, n = 6, seed = 0) {
    if (lowFx) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) { const x = frac(hash(i * 2.1 + seed) + t * speed * (0.6 + hash(i) * 0.6) / (W + 260)) * (W + 260) - 130, yy = y + (hash(i * 4.4 + seed) - 0.5) * h * 0.6, rx = 90 + hash(i + 3) * 70;
      const pa = ctx.globalAlpha; ctx.globalAlpha = a * 0.9; ctx.drawImage(glowSprite(rgb), x - rx, yy - h, rx * 2, h * 2); ctx.globalAlpha = pa; }
  }
  function sunRays(t, x0, rgb, a, n = 4, spread = 46, slant = -90) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) { const x = x0 + i * spread + Math.sin(t * 0.3 + i) * 6, w = 14 + hash(i + 2) * 22, al = a * (0.55 + 0.45 * Math.sin(t * 0.7 + i * 1.7));
      ctx.fillStyle = vg([`rgba(${rgb},${al})`, `rgba(${rgb},0)`], 0, GROUND + 10); ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x + w, -5); ctx.lineTo(x + w + slant, GROUND + 10); ctx.lineTo(x + slant - w * 0.4, GROUND + 10); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // Partikel: dot, glow, flake, rain, streak, leaf, ember, petal
  function parts(t, n, o) {
    if (lowFx) n = Math.ceil(n / 2);
    const [x0, y0, w, h] = o.area || [0, 0, W, GROUND], seed = o.seed || 0;
    for (let i = 0; i < n; i++) {
      const r1 = hash(i * 1.7 + seed), r2 = hash(i * 3.9 + seed + 1), sp = 0.6 + hash(i + seed + 2) * 0.8;
      let x = x0 + frac(r1 + t * (o.vx || 0) * sp / w) * w + Math.sin(t * (o.wob || 0) + i) * (o.wa || 0), y = y0 + frac(r2 + t * (o.vy || 0) * sp / h) * h;
      const s = (o.size || 2) * (0.6 + hash(i + 9 + seed) * 0.8), al = (o.alpha || 1) * (o.tw ? 0.4 + 0.6 * Math.abs(Math.sin(t * o.tw + i)) : 1);
      if (o.type === 'glow') { glowDot(x, y, s * 3, o.rgb, al * 0.6); ctx.fillStyle = `rgba(255,255,255,${al})`; ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }
      else if (o.type === 'rain') { ctx.strokeStyle = `rgba(${o.rgb},${al})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); }
      else if (o.type === 'streak') { ctx.strokeStyle = `rgba(${o.rgb},${al})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 * sp, y + 1); ctx.stroke(); }
      else if (o.type === 'leaf' || o.type === 'petal') { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 * sp + i); ctx.scale(1, Math.sin(t * 3 + i)); ctx.fillStyle = `rgba(${o.rgb},${al})`; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.4, s * 0.7, 0, 0, 7); ctx.fill(); ctx.restore(); }
      else if (o.type === 'flake') { ctx.fillStyle = `rgba(${o.rgb},${al})`; ctx.beginPath(); ctx.arc(x, y, s * 0.7, 0, 7); ctx.fill(); }
      else if (o.type === 'ember') { glowDot(x, y, s * 2.2, o.rgb, al * 0.5); ctx.fillStyle = `rgba(255,236,190,${al})`; ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4); }
      else { ctx.fillStyle = `rgba(${o.rgb},${al})`; ctx.fillRect(x, y, s, s); }
    }
  }
  const VIG = new Map();
  function vignette(a, rgb = '0,0,0') {
    let c = VIG.get(rgb); if (!c) { c = document.createElement('canvas'); c.width = 240; c.height = 135; const g = c.getContext('2d'), v = g.createRadialGradient(120, 74, 52, 120, 74, 168); v.addColorStop(0, `rgba(${rgb},0)`); v.addColorStop(1, `rgba(${rgb},1)`); g.fillStyle = v; g.fillRect(0, 0, 240, 135); VIG.set(rgb, c); }
    const pa = ctx.globalAlpha; ctx.globalAlpha = a; ctx.drawImage(c, 0, 0, W, H); ctx.globalAlpha = pa;
  }
  function grade(color, a, mode = 'soft-light') { if (lowFx) return; ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  function lightPool(x, y, r, rgb, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(x, y, r, rgb, a); ctx.restore(); }

  // ---------- Boden ----------
  function groundBase(top, mid, bot, edge, sc, o = {}) {
    ctx.fillStyle = vg([top, mid, bot], GROUND, H); ctx.fillRect(0, GROUND, W, H - GROUND);
    if (edge) { ctx.fillStyle = edge; ctx.beginPath(); ctx.moveTo(0, GROUND + 3); for (let x = 0; x <= W; x += 6) ctx.lineTo(x, GROUND - 1 + Math.sin((x + sc) * 0.35) * 1.2 + (hash(Math.floor((x + sc) / 6)) - 0.5) * 1.6); ctx.lineTo(W, GROUND + 3); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, GROUND + 3, W, 1);
    // Steinchen und Flecken
    each(sc, 1, 14, (x, k) => { const y = GROUND + 7 + hash(k * 1.9) * 36, s = 1 + hash(k * 2.3) * 2.6;
      ctx.fillStyle = o.speck || 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y, s * 1.6, s * 0.7, 0, 0, 7); ctx.fill();
      if (hash(k * 5.5) < 0.35) { ctx.fillStyle = o.hi || 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(x - s * 0.3, y - s * 0.3, s * 0.8, s * 0.3, 0, 0, 7); ctx.fill(); } }, 0.15, 3);
    if (o.path) { ctx.fillStyle = o.path; ctx.beginPath(); ctx.moveTo(0, GROUND + 14); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, GROUND + 13 + Math.sin((x + sc) * 0.03) * 2); for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, GROUND + 30 + Math.sin((x + sc) * 0.025 + 1) * 3); ctx.closePath(); ctx.fill(); }
  }
  function tufts(sc, col, hi, par = 1, y = GROUND + 1, sp = 18, h = 7, seed = 0) {
    each(sc, par, sp, (x, k) => { const n = 3 + Math.floor(hash(k + seed) * 3), hh = h * (0.6 + hash(k * 1.3 + seed) * 0.8);
      for (let j = 0; j < n; j++) { const bx = x + j * 2.2, tip = bx + (j - n / 2) * 1.6 + Math.sin(sc * 0.02 + k) * 0.8;
        ctx.fillStyle = j % 2 ? col : hi; ctx.beginPath(); ctx.moveTo(bx - 1.1, y); ctx.quadraticCurveTo(bx, y - hh * 0.6, tip, y - hh * (0.7 + hash(k + j) * 0.4)); ctx.lineTo(bx + 1.1, y); ctx.closePath(); ctx.fill(); } }, 0.3, seed);
  }
  function flowers(sc, cols, seed = 0) {
    each(sc, 1, 22, (x, k) => { const y = GROUND + 4 + hash(k * 3.3 + seed) * 10, c = cols[k % cols.length];
      ctx.strokeStyle = 'rgba(40,90,40,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i * 1.257; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4, 1.1, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(x, y, 0.9, 0, 7); ctx.fill(); }, 0.35, seed);
  }
  function tiles(sc, col, rowH = 9, w = 22) {
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    for (let r = 0; r < 6; r++) { const y = GROUND + 4 + r * rowH * (1 + r * 0.12); if (y > H) break; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      const ww = w * (1 + r * 0.25), o = ((sc * (1 + r * 0.04) + (r % 2) * ww / 2) % ww + ww) % ww;
      for (let x = -o; x < W; x += ww) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rowH * (1 + r * 0.12)); ctx.stroke(); } }
  }

  // ---------- Requisiten ----------
  function oak(x, y, s, leaf = ['#6cc25a', '#3f8a3e', '#2c6a33'], trunk = '#6b4a2c') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = trunk; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-2, -16, -3, -30); ctx.lineTo(3, -30); ctx.quadraticCurveTo(2, -16, 5, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = trunk; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-9, -32); ctx.moveTo(1, -26); ctx.lineTo(9, -34); ctx.stroke();
    const blobs = [[-12, -36, 12], [10, -38, 12], [0, -46, 15], [-6, -52, 10], [8, -51, 10], [-15, -45, 9], [15, -46, 9]];
    ctx.fillStyle = leaf[2]; for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(bx + 1, by + 2, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = leaf[1]; for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = leaf[0]; for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(bx - r * 0.25, by - r * 0.3, r * 0.6, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function pine(x, y, s, cols = ['#2f6b4a', '#1d4a33', '#14361f'], snow) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-2.5, -12, 5, 12);
    for (let i = 0; i < 4; i++) { const w = 18 - i * 3.6, yb = -8 - i * 12, h = 20;
      ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(-w, yb); ctx.lineTo(0, yb - h); ctx.lineTo(w, yb); ctx.quadraticCurveTo(0, yb + 3, -w, yb); ctx.fill();
      ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.moveTo(-w * 0.15, yb - 2); ctx.lineTo(0, yb - h); ctx.lineTo(w, yb); ctx.quadraticCurveTo(w * 0.4, yb + 1, -w * 0.15, yb - 2); ctx.fill();
      if (snow) { ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(-w * 0.7, yb - h * 0.32); ctx.lineTo(0, yb - h); ctx.lineTo(w * 0.7, yb - h * 0.32); ctx.quadraticCurveTo(0, yb - h * 0.15, -w * 0.7, yb - h * 0.32); ctx.fill(); } }
    ctx.restore();
  }
  function deadTree(x, y, s, col, moss) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineCap = 'round';
    const br = (x0, y0, a, len, w, d) => { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (moss && d === 1) { ctx.strokeStyle = moss; ctx.lineWidth = 1; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x1 - i * 2, y1); ctx.quadraticCurveTo(x1 - i * 2 + 1, y1 + 6, x1 - i * 2, y1 + 10 + i * 3); ctx.stroke(); } ctx.strokeStyle = col; }
      if (d > 0) { br(x1, y1, a - 0.5, len * 0.66, w * 0.62, d - 1); br(x1, y1, a + 0.45, len * 0.6, w * 0.6, d - 1); } };
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-2, -10, -3, -24); ctx.lineTo(3, -24); ctx.quadraticCurveTo(2, -10, 7, 0); ctx.closePath(); ctx.fill();
    br(0, -22, -1.9, 14, 3.4, 2); br(0, -22, -1.1, 15, 3, 2); br(-1, -14, -2.6, 9, 2, 1);
    ctx.restore();
  }
  function rock(x, y, s, c1, c2, hi = 'rgba(255,255,255,.18)') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-10, -8); ctx.lineTo(-3, -13); ctx.lineTo(6, -11); ctx.lineTo(12, -4); ctx.lineTo(13, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-3, -13); ctx.lineTo(6, -11); ctx.lineTo(2, -6); ctx.lineTo(-6, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hi; ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(4, -10.5); ctx.lineTo(0, -8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function bush(x, y, s, c = ['#5aa84e', '#3a7d3a'], berry) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = c[1]; for (const [bx, by, r] of [[-8, -5, 7], [0, -8, 9], [8, -5, 7]]) { ctx.beginPath(); ctx.arc(bx, by, r, Math.PI, 0); ctx.fill(); }
    ctx.fillRect(-15, -5, 30, 5);
    ctx.fillStyle = c[0]; for (const [bx, by, r] of [[-9, -7, 4], [-1, -11, 5], [7, -7, 4]]) { ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); }
    if (berry) { ctx.fillStyle = berry; for (const [bx, by] of [[-6, -4], [3, -9], [9, -3], [-1, -3], [-11, -2]]) { ctx.beginPath(); ctx.arc(bx, by, 1.4, 0, 7); ctx.fill(); } }
    ctx.restore();
  }
  function fence(x, y, s, col = '#8a6a44') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
    for (const px of [-14, 0, 14]) { ctx.fillRect(px - 1.6, -16, 3.2, 16); ctx.beginPath(); ctx.moveTo(px - 1.6, -16); ctx.lineTo(px, -19); ctx.lineTo(px + 1.6, -16); ctx.fill(); }
    ctx.fillRect(-16, -13, 32, 2.4); ctx.fillRect(-16, -7, 32, 2.4);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(-16, -11, 32, 0.8); ctx.fillRect(-16, -5, 32, 0.8);
    ctx.restore();
  }
  function tomb(x, y, s, col, kind) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 3, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.rotate((kind - 1) * 0.06);
    if (kind === 0) { ctx.fillStyle = col; ctx.fillRect(-1.8, -26, 3.6, 26); ctx.fillRect(-8, -20, 16, 3.6); }
    else { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-8, -16); ctx.arc(0, -16, 8, Math.PI, 0); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-4, -16, 8, 1.4); ctx.fillRect(-3, -12, 6, 1.4); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-8, -16, 2, 16); }
    ctx.restore();
    ctx.fillStyle = 'rgba(80,110,60,.6)'; ctx.beginPath(); ctx.ellipse(-4, -1, 5, 2, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function candle(x, y, t, k, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(-1.6, -8, 3.2, 8); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0.6, -8, 1, 8);
    const f = 1 + Math.sin(t * 13 + k) * 0.15; glowDot(0, -11, 9 * f, '255,190,90', 0.5);
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(0, -11, 1.6, 3 * f, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.ellipse(0, -10.4, 0.7, 1.4, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function flame(x, y, s, t, k, c1 = '#ff8a3d', c2 = '#ffd27a', rgb = '255,150,60') {
    glowDot(x, y - 4 * s, 18 * s, rgb, 0.45);
    for (let i = 0; i < 3; i++) { const h = (7 + Math.sin(t * 11 + k + i * 2) * 2.5) * s * (1 - i * 0.22); ctx.fillStyle = i === 2 ? '#fff6d8' : i ? c2 : c1;
      ctx.beginPath(); ctx.moveTo(x - (3.2 - i) * s, y); ctx.quadraticCurveTo(x - (2 - i * 0.5) * s, y - h * 0.6, x + Math.sin(t * 7 + k) * s, y - h); ctx.quadraticCurveTo(x + (2 - i * 0.5) * s, y - h * 0.6, x + (3.2 - i) * s, y); ctx.closePath(); ctx.fill(); }
  }
  function crystal(x, y, s, c1, c2, rgb, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    glowDot(0, -10, 22, rgb, 0.25 + 0.12 * Math.sin(t * 2 + k));
    for (const [dx, h, w, a] of [[-6, 16, 4, -0.35], [5, 13, 3.6, 0.3], [0, 24, 5, 0]]) { ctx.save(); ctx.translate(dx, 0); ctx.rotate(a);
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.75); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-w * 0.6, -h * 0.7, 1, h * 0.5); ctx.restore(); }
    ctx.restore();
  }
  function mushroom(x, y, s, cap, glowRgb, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (glowRgb) glowDot(0, -7, 14, glowRgb, 0.35 + 0.15 * Math.sin(t * 2 + k));
    ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.moveTo(-1.8, 0); ctx.quadraticCurveTo(-2.4, -4, -1.4, -6); ctx.lineTo(1.4, -6); ctx.quadraticCurveTo(2.4, -4, 1.8, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cap; ctx.beginPath(); ctx.ellipse(0, -6, 6, 4, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (const [dx, dy] of [[-3, -7.5], [1, -9], [3.4, -7]]) { ctx.beginPath(); ctx.arc(dx, dy, 0.8, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function reeds(x, y, s, col, head, seed = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const dx = (i - 3) * 2.2, h = 16 + hash(i + seed) * 10; ctx.beginPath(); ctx.moveTo(dx, 0); ctx.quadraticCurveTo(dx + 1, -h * 0.6, dx + (i - 3) * 1.2, -h); ctx.stroke();
      if (i % 2 && head) { ctx.fillStyle = head; ctx.beginPath(); ctx.ellipse(dx + (i - 3) * 1.1, -h + 2, 1.5, 3.6, 0, 0, 7); ctx.fill(); } }
    ctx.restore();
  }
  function pillar(x, y, s, col, dark, broken, cap, hb = 0.5) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const h = broken ? 22 + hb * 14 : 44;
    ctx.fillStyle = col; ctx.fillRect(-6, -h, 12, h); ctx.fillStyle = dark; for (let i = -4; i <= 4; i += 4) ctx.fillRect(i - 0.6, -h, 1.2, h);
    ctx.fillStyle = col; ctx.fillRect(-8, -4, 16, 4); ctx.fillStyle = dark; ctx.fillRect(-8, -1.2, 16, 1.2);
    if (broken) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, -h); ctx.lineTo(-3, -h - 5); ctx.lineTo(1, -h - 2); ctx.lineTo(4, -h - 6); ctx.lineTo(6, -h); ctx.fill(); ctx.fillRect(10, -3, 7, 3); }
    else { ctx.fillStyle = cap || col; ctx.fillRect(-8, -h - 4, 16, 4); ctx.fillRect(-7, -h - 6, 14, 2); }
    ctx.restore();
  }
  function bones(x, y, s, col = '#e8e2d0') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -4, 4, 0, 7); ctx.fill(); ctx.fillRect(-2.6, -2, 5.2, 3);
    ctx.fillStyle = 'rgba(30,20,30,.85)'; ctx.fillRect(-2, -5, 1.4, 1.6); ctx.fillRect(0.6, -5, 1.4, 1.6);
    ctx.fillStyle = col; ctx.save(); ctx.rotate(0.3); ctx.fillRect(4, -1.4, 10, 1.8); ctx.beginPath(); ctx.arc(4, -0.5, 1.4, 0, 7); ctx.arc(14, -0.5, 1.4, 0, 7); ctx.fill(); ctx.restore();
    ctx.restore();
  }
  function ribcage(x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-34, -2); ctx.quadraticCurveTo(0, -8, 34, -3); ctx.stroke();
    ctx.lineWidth = 2.2; for (let i = -3; i <= 3; i++) { const bx = i * 9, h = 26 - Math.abs(i) * 3.5; ctx.beginPath(); ctx.moveTo(bx, -5); ctx.quadraticCurveTo(bx + 8, -h * 0.8, bx + 4, -h); ctx.stroke(); }
    ctx.restore();
  }
  function goldPile(x, y, s, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = vg(['#ffe48a', '#d99a22', '#8a5a14'], -18, 0); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-12, -20, 0, -18); ctx.quadraticCurveTo(14, -20, 26, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,.8)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(-16 + i * 5 + hash(i + k) * 3, -4 - hash(i * 2 + k) * 10, 2.2, 1, 0, 0, 7); ctx.fill(); }
    const sp = 0.5 + 0.5 * Math.sin(t * 3 + k * 2); if (sp > 0.85) { const sx = -8 + hash(k + Math.floor(t)) * 16, sy = -12; ctx.fillStyle = '#fff'; ctx.fillRect(sx - 3, sy, 7, 1); ctx.fillRect(sx, sy - 3, 1, 7); }
    ctx.restore();
  }
  function chest(x, y, s, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    glowDot(0, -10, 18, '255,210,100', 0.25 + 0.1 * Math.sin(t * 3 + k));
    ctx.fillStyle = '#6b3a1c'; rr(-11, -12, 22, 12, 2); ctx.fill(); ctx.fillStyle = '#8a4e24'; ctx.beginPath(); ctx.moveTo(-11, -12); ctx.quadraticCurveTo(0, -20, 11, -12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0a83a'; ctx.fillRect(-11, -12.5, 22, 1.6); ctx.fillRect(-7, -16, 2, 16); ctx.fillRect(5, -16, 2, 16); ctx.fillRect(-1.6, -10, 3.2, 3.6);
    ctx.restore();
  }
  function obelisk(x, y, s, col, rgb, t, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    glowDot(0, -22, 26, rgb, 0.2 + 0.1 * Math.sin(t * 1.5 + k));
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-4, -36); ctx.lineTo(0, -42); ctx.lineTo(4, -36); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-4, -36); ctx.lineTo(0, -42); ctx.lineTo(0, 0); ctx.fill();
    const a = 0.55 + 0.45 * Math.sin(t * 2 + k); ctx.fillStyle = `rgba(${rgb},${a})`; for (let i = 0; i < 4; i++) { ctx.fillRect(-1.6, -32 + i * 7, 3.2, 1.2); ctx.fillRect(-0.6, -34 + i * 7, 1.2, 4); }
    ctx.restore();
  }
  function lantern(x, y, s, t, k, rgb = '255,200,110') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#3a3026'; ctx.fillRect(-1.2, -40, 2.4, 40); ctx.fillRect(-1.2, -40, 10, 2);
    const sw = Math.sin(t * 1.4 + k) * 0.12; ctx.translate(8, -38); ctx.rotate(sw);
    ctx.strokeStyle = '#3a3026'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 4); ctx.stroke();
    glowDot(0, 9, 16, rgb, 0.45 + 0.1 * Math.sin(t * 9 + k));
    ctx.fillStyle = '#3a3026'; ctx.fillRect(-3.4, 4, 6.8, 1.6); ctx.fillRect(-3.4, 13, 6.8, 1.6); ctx.fillStyle = `rgba(${rgb},.95)`; ctx.fillRect(-2.6, 5.6, 5.2, 7.4);
    ctx.restore();
  }

  // ---------- Die 15 Gebiete ----------
  const ENV = [];
  // 0 Grüne Wiesen
  ENV[0] = {
    back(t, sc) {
      skyFill(['#4f97e0', '#9fd0f5', '#e8f6ff']); disc(392, 58, 15, '#fffbe6', '255,244,200', 0.55);
      clouds(t, 5, 22, 92, '#ffffff', '#d6e8f7', 0.95, 5);
      ridge(sc, 0.06, 160, 74, 0.008, '#93b3d6', { kind: 'peak', snow: 'rgba(250,252,255,.95)', snowAt: 0.66, seed: 2 });
      ctx.fillStyle = vg(['rgba(230,244,255,0)', 'rgba(230,244,255,.55)'], 110, 175); ctx.fillRect(0, 110, W, 70);
      const hy = ridge(sc, 0.2, 186, 30, 0.012, '#86c06a', { seed: 1, rim: 'rgba(220,255,200,.35)' });
      each(sc, 0.2, 34, (x, k) => { const y = hy(x) + 2; ctx.fillStyle = '#5c9c4e'; ctx.beginPath(); ctx.arc(x, y - 6, 6 + hash(k) * 3, 0, 7); ctx.arc(x + 5, y - 4, 4, 0, 7); ctx.fill(); }, 0.5, 4);
      ridge(sc, 0.4, 204, 18, 0.018, '#5fae4c', { seed: 3, rim: 'rgba(200,255,180,.3)' });
      groundBase('#6cbf4f', '#7a6040', '#5a4430', '#7fd05c', sc, { path: 'rgba(196,160,110,.45)', speck: 'rgba(60,40,20,.25)' });
      flowers(sc, ['#ff6b8a', '#ffffff', '#ffd23f', '#9fb8ff']);
    },
    props(t, sc) {
      each(sc, 0.85, 120, (x, k) => oak(x, GROUND, 0.8 + hash(k) * 0.4), 0.4, 11);
      each(sc, 1, 70, (x, k) => (hash(k * 9) < 0.5 ? bush(x, GROUND + 2, 0.8 + hash(k) * 0.4, undefined, hash(k) < 0.4 ? '#e5484d' : null) : hash(k * 4) < 0.5 ? fence(x, GROUND + 1, 1) : rock(x, GROUND + 2, 0.7, '#a8a69a', '#7d7a70')), 0.45, 12);
    },
    front(t, sc) {
      parts(t, 4, { type: 'petal', rgb: '255,255,255', vx: 22, vy: 14, wob: 2, wa: 10, size: 1.6, alpha: 0.8, seed: 3 });
      for (let i = 0; i < 2; i++) { const x = frac(hash(i) + t * 0.03) * W, y = 150 + Math.sin(t * 1.3 + i * 3) * 30, f = Math.abs(Math.sin(t * 14 + i)); ctx.fillStyle = i ? '#ffd23f' : '#ff9ad0'; ctx.beginPath(); ctx.ellipse(x - 2, y, 2.4, 2.4 * f + 0.4, -0.4, 0, 7); ctx.ellipse(x + 2, y, 2.4, 2.4 * f + 0.4, 0.4, 0, 7); ctx.fill(); }
      tufts(sc, '#3f8a3e', '#5aa84e', 1.3, H, 26, 12, 5);
      grade('#ffe9b0', 0.18); vignette(0.18);
    },
  };
  // 1 Finsterwald
  ENV[1] = {
    back(t, sc) {
      skyFill(['#0c2229', '#1f4a4c', '#5d8a78']); disc(370, 70, 11, '#e8f1d8', '220,240,200', 0.3);
      each(sc, 0.12, 16, (x, k) => pine(x, 168 + hash(k) * 8, 0.55 + hash(k * 2) * 0.25, ['#2f5a52', '#2a4f48', '#24453f']), 0, 21);
      fog(t, 160, 40, '150,190,170', 0.35, 4, 6, 1);
      each(sc, 0.3, 24, (x, k) => pine(x, 192 + hash(k) * 6, 0.85 + hash(k * 2) * 0.3, ['#21443b', '#1b3a32', '#152e27']), 0.1, 22);
      sunRays(t, 250, '200,240,190', 0.07, 4, 50, -70);
      fog(t, 196, 30, '140,180,160', 0.3, 6, 6, 2);
      ridge(sc, 0.5, 214, 10, 0.03, '#183026', { seed: 2 });
      groundBase('#2f5a34', '#3b2f22', '#1d160f', '#3d6e3c', sc, { speck: 'rgba(0,0,0,.3)' });
    },
    props(t, sc) {
      each(sc, 0.8, 110, (x, k) => pine(x, GROUND, 1.25 + hash(k) * 0.35, ['#24503e', '#183a2c', '#10281e']), 0.35, 31);
      each(sc, 1, 60, (x, k) => { if (hash(k * 5) < 0.5) mushroom(x, GROUND + 2, 1.1, '#e5484d', '255,120,120', t, k); else { ctx.fillStyle = '#4a3624'; ctx.beginPath(); ctx.ellipse(x, GROUND - 3, 9, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6a5034'; ctx.beginPath(); ctx.ellipse(x - 7, GROUND - 3, 2.6, 4, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#3d6e3c'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 4 + i * 2, GROUND); ctx.quadraticCurveTo(x + 6 + i * 3, GROUND - 8, x + 10 + i * 3, GROUND - 6); ctx.stroke(); } } }, 0.45, 32);
    },
    front(t, sc) {
      parts(t, 14, { type: 'glow', rgb: '210,255,120', vx: 6, vy: -4, wob: 1.5, wa: 12, size: 1.6, tw: 2, alpha: 0.9, area: [0, 90, W, 130], seed: 5 });
      parts(t, 5, { type: 'leaf', rgb: '120,150,80', vx: 18, vy: 20, wob: 2, wa: 8, size: 2, alpha: 0.8, seed: 6 });
      tufts(sc, '#14301c', '#1f4a2a', 1.3, H, 22, 14, 7);
      grade('#3a8a7a', 0.25); vignette(0.38);
    },
  };
  // 2 Knochengruft
  ENV[2] = {
    back(t, sc) {
      skyFill(['#0d0a1c', '#251d40', '#4a3a66']); stars(t, 60, 140, 0.9); moon(388, 54, 17, t, '#ece6ff', '220,210,255');
      clouds(t, 3, 30, 80, 'rgba(70,60,100,.7)', 'rgba(40,34,62,.7)', 0.8, 3, 4);
      const ruin = (x, k, base, col) => { ctx.fillStyle = col; const w = 30 + hash(k) * 30, h = 40 + hash(k * 2) * 50;
        ctx.fillRect(x, base - h, w, h); for (let i = 0; i < w; i += 8) if (hash(k + i) < 0.7) ctx.fillRect(x + i, base - h - 5, 5, 5);
        if (hash(k * 3) < 0.5) { ctx.fillRect(x + w * 0.4, base - h - 22, 10, 22); ctx.beginPath(); ctx.moveTo(x + w * 0.4 - 2, base - h - 22); ctx.lineTo(x + w * 0.4 + 5, base - h - 38); ctx.lineTo(x + w * 0.4 + 12, base - h - 22); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,220,140,.5)'; if (hash(k * 5) < 0.4) ctx.fillRect(x + w * 0.3, base - h * 0.6, 3, 5); };
      each(sc, 0.1, 70, (x, k) => ruin(x, k, 180, '#231c38'), 0.35, 41);
      fog(t, 175, 30, '120,100,170', 0.3, 3, 5, 3);
      const hy = ridge(sc, 0.3, 200, 18, 0.016, '#2c2440', { seed: 5 });
      each(sc, 0.3, 60, (x, k) => deadTree(x, hy(x) + 3, 0.9 + hash(k) * 0.4, '#1c1630'), 0.5, 42);
      groundBase('#3f3654', '#2c2540', '#16121f', '#4a4062', sc, { speck: 'rgba(0,0,0,.3)', hi: 'rgba(200,180,255,.1)' });
      tiles(sc, 'rgba(0,0,0,.22)', 9, 26);
    },
    props(t, sc) {
      each(sc, 1, 54, (x, k) => { const r = hash(k * 6); if (r < 0.45) tomb(x, GROUND + 2, 0.9 + hash(k) * 0.3, '#6a6284', hash(k) < 0.4 ? 0 : 1); else if (r < 0.65) bones(x, GROUND + 3, 1); else if (r < 0.85) { candle(x, GROUND + 2, t, k); candle(x + 5, GROUND + 3, t, k + 1, 0.8); } else deadTree(x, GROUND, 1.2, '#2a2240'); }, 0.25, 43);
    },
    front(t, sc) {
      parts(t, 8, { type: 'glow', rgb: '190,150,255', vx: 4, vy: -6, wob: 1, wa: 14, size: 2, tw: 1.4, alpha: 0.8, area: [0, 120, W, 100], seed: 7 });
      fog(t, GROUND + 4, 18, '150,130,200', 0.28, 7, 7, 4);
      grade('#5a3a9a', 0.25); vignette(0.42);
    },
  };
  // 3 Glutberge
  ENV[3] = {
    back(t, sc) {
      skyFill(['#1f0606', '#6a1c10', '#d8622e']); disc(110, 80, 22, 'rgba(255,190,120,.9)', '255,120,60', 0.45);
      clouds(t, 4, 20, 70, 'rgba(60,24,22,.75)', 'rgba(30,12,10,.75)', 0.85, 3, 8, 1.3);
      const vol = (x, k) => { const b = 176, h = 72 + hash(k) * 30, w = 70 + hash(k * 2) * 30;
        ctx.fillStyle = '#3e1410'; ctx.beginPath(); ctx.moveTo(x - w, b); ctx.lineTo(x - 10, b - h); ctx.lineTo(x + 10, b - h); ctx.lineTo(x + w, b); ctx.closePath(); ctx.fill();
        glowDot(x, b - h, 26, '255,120,40', 0.55); ctx.strokeStyle = 'rgba(255,140,50,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, b - h); ctx.quadraticCurveTo(x - 12, b - h * 0.6, x - 20, b - 6); ctx.stroke(); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 5, b - h); ctx.quadraticCurveTo(x + 10, b - h * 0.5, x + 24, b - 4); ctx.stroke();
        for (let i = 0; i < 5; i++) { const p = frac(t * 0.08 + i / 5 + hash(k)), r = 8 + p * 26; ctx.fillStyle = `rgba(50,30,30,${0.5 * (1 - p)})`; ctx.beginPath(); ctx.arc(x + Math.sin(p * 4 + k) * 10 + p * 20, b - h - 8 - p * 80, r, 0, 7); ctx.fill(); } };
      each(sc, 0.08, 220, (x, k) => vol(x, k), 0.2, 51);
      const hy = ridge(sc, 0.25, 196, 34, 0.02, '#2e100c', { kind: 'peak', seed: 3 });
      ctx.strokeStyle = 'rgba(255,120,40,.55)'; ctx.lineWidth = 1.4; each(sc, 0.25, 90, (x, k) => { ctx.beginPath(); ctx.moveTo(x, hy(x) + 4); ctx.quadraticCurveTo(x + 8, hy(x) + 20, x + 4, 206); ctx.stroke(); }, 0.4, 52);
      ridge(sc, 0.45, 212, 12, 0.03, '#22100c', { seed: 6 });
      groundBase('#3a2420', '#24140f', '#110806', '#4a2a20', sc, { speck: 'rgba(0,0,0,.35)', hi: 'rgba(255,140,80,.15)' });
      each(sc, 1, 46, (x, k) => { const a = 0.45 + 0.35 * Math.sin(t * 2.4 + k); ctx.strokeStyle = `rgba(255,${120 + 40 * a | 0},40,${a})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, GROUND + 6 + hash(k) * 10); ctx.lineTo(x + 8, GROUND + 12 + hash(k) * 12); ctx.lineTo(x + 5, GROUND + 22 + hash(k) * 14); ctx.lineTo(x + 14, GROUND + 30 + hash(k) * 10); ctx.stroke(); }, 0.3, 53);
    },
    props(t, sc) {
      each(sc, 1, 80, (x, k) => { const r = hash(k * 4);
        if (r < 0.4) { const a = 0.6 + 0.3 * Math.sin(t * 3 + k); ctx.fillStyle = vg([`rgba(255,220,120,${a})`, `rgba(255,90,30,${a})`], GROUND, GROUND + 8); ctx.beginPath(); ctx.ellipse(x, GROUND + 5, 22, 5, 0, 0, 7); ctx.fill(); lightPool(x, GROUND, 40, '255,110,40', 0.25); }
        else if (r < 0.75) { ctx.fillStyle = '#1a0c0a'; ctx.beginPath(); ctx.moveTo(x - 9, GROUND + 2); ctx.lineTo(x - 4, GROUND - 22); ctx.lineTo(x + 1, GROUND - 12); ctx.lineTo(x + 4, GROUND - 28); ctx.lineTo(x + 10, GROUND + 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,120,60,.35)'; ctx.fillRect(x + 3, GROUND - 24, 1, 20); }
        else deadTree(x, GROUND + 1, 1, '#1a0c0a'); }, 0.35, 54);
    },
    front(t, sc) {
      parts(t, 22, { type: 'ember', rgb: '255,140,60', vx: 8, vy: -26, wob: 2, wa: 8, size: 1.6, alpha: 0.9, seed: 9 });
      parts(t, 10, { type: 'dot', rgb: '90,80,80', vx: 6, vy: 10, size: 1.4, alpha: 0.5, seed: 10 });
      ctx.fillStyle = vg(['rgba(255,90,30,0)', 'rgba(255,90,30,.18)'], 150, H); ctx.fillRect(0, 150, W, H);
      grade('#ff6a2a', 0.28); vignette(0.4, '30,0,0');
    },
  };
  // 4 Frostgipfel
  ENV[4] = {
    back(t, sc) {
      skyFill(['#6a9ad2', '#bcd8f2', '#f2f8ff']); disc(380, 64, 14, '#ffffff', '255,255,255', 0.5);
      clouds(t, 3, 30, 80, '#ffffff', '#dbe8f5', 0.8, 6, 2);
      ridge(sc, 0.05, 168, 96, 0.007, '#8aa8c8', { kind: 'peak', snow: '#f4f9ff', snowAt: 0.45, seed: 7, shade: 'rgba(60,90,130,.25)' });
      ctx.fillStyle = vg(['rgba(240,248,255,0)', 'rgba(240,248,255,.6)'], 120, 180); ctx.fillRect(0, 120, W, 60);
      const hy = ridge(sc, 0.2, 196, 40, 0.012, '#c8dbec', { kind: 'peak', snow: '#f6fbff', snowAt: 0.3, seed: 2 });
      each(sc, 0.2, 22, (x, k) => pine(x, hy(x) + 6, 0.5 + hash(k) * 0.2, ['#5f8096', '#4f6e84', '#45627a'], '#f4f9ff'), 0.45, 61);
      ridge(sc, 0.45, 212, 12, 0.02, '#dfeaf5', { seed: 4 });
      groundBase('#f2f8ff', '#d4e3f0', '#a8bfd4', '#ffffff', sc, { speck: 'rgba(90,130,170,.18)', hi: 'rgba(255,255,255,.8)' });
      each(sc, 1, 60, (x, k) => { ctx.fillStyle = 'rgba(150,190,230,.35)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 18 + hash(k) * 16, 26, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 10, GROUND + 17 + hash(k) * 16, 8, 1); }, 0.4, 62);
    },
    props(t, sc) {
      each(sc, 0.85, 100, (x, k) => pine(x, GROUND, 1.1 + hash(k) * 0.4, ['#2f5a4a', '#1f4436', '#16342a'], '#f4f9ff'), 0.4, 63);
      each(sc, 1, 70, (x, k) => (hash(k * 3) < 0.6 ? crystal(x, GROUND + 2, 0.8, '#e6f8ff', '#9fd4f2', '170,225,255', t, k) : rock(x, GROUND + 2, 0.9, '#d8e6f2', '#9fb4c8', 'rgba(255,255,255,.7)')), 0.4, 64);
    },
    front(t, sc) {
      parts(t, 34, { type: 'flake', rgb: '255,255,255', vx: 14, vy: 26, wob: 1.6, wa: 6, size: 2.2, alpha: 0.9, seed: 11 });
      parts(t, 5, { type: 'streak', rgb: '255,255,255', vx: 160, vy: 4, size: 1, alpha: 0.3, area: [0, 60, W, 150], seed: 12 });
      grade('#9fd0ff', 0.22); vignette(0.15, '30,60,100');
    },
  };
  // 5 Nebelmoor
  ENV[5] = {
    back(t, sc) {
      skyFill(['#28342f', '#4e5e54', '#7e8c80']); disc(330, 76, 13, 'rgba(230,236,220,.55)', '220,230,210', 0.25);
      clouds(t, 4, 20, 80, 'rgba(110,124,114,.8)', 'rgba(70,84,76,.8)', 0.8, 4, 6, 1.4);
      const hy = ridge(sc, 0.1, 178, 22, 0.01, '#4a5a50', { seed: 3 });
      each(sc, 0.1, 50, (x, k) => deadTree(x, hy(x) + 3, 0.7 + hash(k) * 0.3, '#3f4d44'), 0.4, 71);
      fog(t, 172, 40, '190,205,190', 0.45, 5, 7, 5);
      const h2 = ridge(sc, 0.3, 200, 14, 0.02, '#3a473e', { seed: 1 });
      each(sc, 0.3, 30, (x, k) => reeds(x, h2(x) + 3, 0.7, '#2c3a30', '#3a2c20', k), 0.4, 72);
      fog(t, 200, 30, '190,205,190', 0.4, 7, 7, 6);
      groundBase('#40463a', '#2e3228', '#171912', '#4d5a44', sc, { speck: 'rgba(0,0,0,.3)' });
      each(sc, 1, 90, (x, k) => { const y = GROUND + 14 + hash(k) * 16; ctx.fillStyle = vg(['rgba(160,180,170,.55)', 'rgba(80,100,95,.6)'], y - 4, y + 4); ctx.beginPath(); ctx.ellipse(x, y, 30, 5, 0, 0, 7); ctx.fill();
        const r = frac(t * 0.4 + hash(k)) * 12; ctx.strokeStyle = `rgba(220,235,225,${0.4 * (1 - r / 12)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x + 6, y, r, r * 0.25, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = '#4f7a3c'; ctx.beginPath(); ctx.ellipse(x - 12, y + 1, 4, 1.4, 0, 0, 7); ctx.fill(); }, 0.35, 73);
    },
    props(t, sc) {
      each(sc, 1, 70, (x, k) => { const r = hash(k * 7); if (r < 0.4) deadTree(x, GROUND + 1, 1.2, '#2c3329', 'rgba(110,140,90,.85)'); else if (r < 0.75) reeds(x, GROUND + 2, 1, '#3d5236', '#5a3c22', k); else lantern(x, GROUND + 1, 1, t, k, '170,230,255'); }, 0.25, 74);
    },
    front(t, sc) {
      parts(t, 26, { type: 'rain', rgb: '200,215,230', vx: -30, vy: 300, size: 1, alpha: 0.35, seed: 13 });
      parts(t, 6, { type: 'glow', rgb: '120,210,255', vx: 5, vy: -3, wob: 1.2, wa: 18, size: 2.2, tw: 1.2, alpha: 0.85, area: [0, 130, W, 80], seed: 14 });
      fog(t, GROUND - 4, 26, '200,214,200', 0.32, 9, 7, 8);
      grade('#6a8a70', 0.3); vignette(0.35);
    },
  };
  // 6 Dornendickicht
  ENV[6] = {
    back(t, sc) {
      skyFill(['#e8a95e', '#efd79a', '#d9e8b0']); disc(120, 84, 18, '#fff3c8', '255,220,140', 0.55);
      clouds(t, 3, 30, 80, 'rgba(255,240,210,.9)', 'rgba(230,190,150,.8)', 0.85, 5, 9);
      ridge(sc, 0.08, 172, 30, 0.01, '#a7b77a', { seed: 5 });
      const vine = (x, k, base, col, s) => { ctx.strokeStyle = col; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, base);
        let px = x, py = base; for (let i = 0; i < 4; i++) { const nx = px + (hash(k + i) - 0.4) * 30 * s, ny = py - (14 + hash(k * 2 + i) * 12) * s; ctx.quadraticCurveTo(px + 14 * s * (i % 2 ? 1 : -1), (py + ny) / 2, nx, ny); px = nx; py = ny; } ctx.stroke();
        ctx.beginPath(); ctx.arc(px + 6 * s, py, 6 * s, Math.PI, Math.PI * 2.6); ctx.stroke(); };
      each(sc, 0.25, 40, (x, k) => vine(x, k, 205, '#5a6a38', 0.9), 0.2, 81);
      ridge(sc, 0.25, 200, 16, 0.025, '#5e6e3a', { seed: 2 });
      ridge(sc, 0.45, 212, 10, 0.035, '#4a5a2c', { seed: 7 });
      groundBase('#7d9a45', '#6b5a36', '#3c311d', '#8fae52', sc, { speck: 'rgba(60,40,20,.28)' });
      each(sc, 1, 18, (x, k) => { ctx.fillStyle = ['#c46a2a', '#d99a3a', '#8a4a20'][k % 3]; ctx.beginPath(); ctx.ellipse(x, GROUND + 6 + hash(k) * 30, 2.2, 1, hash(k) * 3, 0, 7); ctx.fill(); }, 0.4, 82);
    },
    props(t, sc) {
      each(sc, 1, 60, (x, k) => { const r = hash(k * 3);
        if (r < 0.55) { bush(x, GROUND + 2, 1.1, ['#5e7a34', '#3e5a24'], '#d62a3a'); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const bx = x - 12 + i * 10; ctx.beginPath(); ctx.moveTo(bx, GROUND); ctx.quadraticCurveTo(bx - 6, GROUND - 16, bx + 4, GROUND - 22); ctx.stroke(); for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(bx - 2 + j, GROUND - j * 6); ctx.lineTo(bx - 5 + j, GROUND - j * 6 - 2); ctx.stroke(); } } }
        else if (r < 0.8) { for (let i = 0; i < 3; i++) { const fx = x + i * 7 - 7, fy = GROUND - 6 - hash(k + i) * 8; ctx.strokeStyle = '#3e5a24'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, GROUND); ctx.lineTo(fx, fy); ctx.stroke(); ctx.fillStyle = '#e04a6a'; ctx.beginPath(); ctx.arc(fx, fy, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#ff8aa8'; ctx.beginPath(); ctx.arc(fx - 0.8, fy - 0.8, 1.4, 0, 7); ctx.fill(); } }
        else rock(x, GROUND + 2, 0.9, '#a49a7a', '#7a705a'); }, 0.2, 83);
    },
    front(t, sc) {
      parts(t, 8, { type: 'leaf', rgb: '210,120,50', vx: 20, vy: 22, wob: 2, wa: 10, size: 2.2, alpha: 0.9, seed: 15 });
      parts(t, 14, { type: 'glow', rgb: '255,240,180', vx: 4, vy: -2, wob: 1, wa: 10, size: 1, tw: 2, alpha: 0.6, seed: 16 });
      tufts(sc, '#4a5a2c', '#6a7a3a', 1.3, H, 24, 12, 9);
      grade('#ffcf7a', 0.25); vignette(0.2);
    },
  };
  // 7 Schattenkrypta
  ENV[7] = {
    back(t, sc) {
      skyFill(['#05040c', '#120f28', '#271f48']); stars(t, 40, 110, 0.7, 3); moon(90, 50, 12, t, '#ffb0a0', '255,120,110');
      const cath = (x, k) => { const b = 190, w = 60 + hash(k) * 30, h = 70 + hash(k * 2) * 30; ctx.fillStyle = '#1b1638';
        ctx.fillRect(x, b - h, w, h); for (const sx of [x - 4, x + w - 8]) { ctx.fillRect(sx, b - h - 30, 12, h + 30); ctx.beginPath(); ctx.moveTo(sx - 2, b - h - 30); ctx.lineTo(sx + 6, b - h - 62); ctx.lineTo(sx + 14, b - h - 30); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(x + 4, b - h); ctx.lineTo(x + w / 2, b - h - 26); ctx.lineTo(x + w - 4, b - h); ctx.fill();
        const cx = x + w / 2, cy = b - h + 16, g = 0.6 + 0.3 * Math.sin(t * 1.3 + k); ctx.fillStyle = `rgba(255,170,90,${g})`; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#1b1638'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke();
        for (let i = 0; i < 3; i++) { const wx = x + 12 + i * (w - 24) / 2, wy = b - h + 34; if (wy > b - 14) break; ctx.fillStyle = [`rgba(220,70,90,${g * 0.8})`, `rgba(90,130,255,${g * 0.8})`, `rgba(170,90,230,${g * 0.8})`][i]; ctx.beginPath(); ctx.moveTo(wx - 3, wy + 14); ctx.lineTo(wx - 3, wy + 3); ctx.arc(wx, wy + 3, 3, Math.PI, 0); ctx.lineTo(wx + 3, wy + 14); ctx.fill(); ctx.fillStyle = '#1b1638'; ctx.fillRect(wx - 0.5, wy, 1, 14); } };
      each(sc, 0.1, 150, (x, k) => cath(x, k), 0.2, 91);
      fog(t, 185, 30, '80,70,140', 0.35, 3, 6, 9);
      const h2 = ridge(sc, 0.35, 206, 6, 0.02, '#1a1530', { seed: 3 });
      each(sc, 0.35, 12, (x) => { ctx.fillStyle = '#1a1530'; ctx.fillRect(x, 190, 1.6, 18); ctx.beginPath(); ctx.moveTo(x - 1, 190); ctx.lineTo(x + 0.8, 186); ctx.lineTo(x + 2.6, 190); ctx.fill(); }, 0, 92);
      ctx.fillStyle = '#1a1530'; ctx.fillRect(0, 196, W, 2);
      groundBase('#2c2640', '#1a1628', '#0b0912', '#3a3254', sc, { speck: 'rgba(0,0,0,.35)', hi: 'rgba(160,140,255,.1)' });
      tiles(sc, 'rgba(0,0,0,.35)', 8, 24);
    },
    props(t, sc) {
      each(sc, 1, 66, (x, k) => { const r = hash(k * 5);
        if (r < 0.4) { ctx.fillStyle = '#2a2236'; ctx.fillRect(x - 1, GROUND - 26, 2, 26); ctx.fillRect(x - 9, GROUND - 22, 18, 2); for (const cx of [x - 8, x, x + 8]) candle(cx, GROUND - 22, t, k + cx, 0.8); lightPool(x, GROUND - 30, 40, '255,170,80', 0.22); }
        else if (r < 0.7) { ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.moveTo(x - 12, GROUND + 1); ctx.lineTo(x - 9, GROUND - 8); ctx.lineTo(x + 9, GROUND - 8); ctx.lineTo(x + 12, GROUND + 1); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#4a3848'; ctx.fillRect(x - 9, GROUND - 10, 18, 3); ctx.fillStyle = 'rgba(200,180,120,.5)'; ctx.fillRect(x - 1, GROUND - 7, 2, 6); ctx.fillRect(x - 3, GROUND - 5, 6, 1.5); }
        else { ctx.fillStyle = '#2c2840'; ctx.fillRect(x - 6, GROUND - 10, 12, 10); ctx.beginPath(); ctx.moveTo(x - 6, GROUND - 10); ctx.lineTo(x - 4, GROUND - 22); ctx.lineTo(x, GROUND - 26); ctx.lineTo(x + 4, GROUND - 22); ctx.lineTo(x + 6, GROUND - 10); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 4, GROUND - 20); ctx.lineTo(x - 12, GROUND - 24); ctx.lineTo(x - 5, GROUND - 16); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 4, GROUND - 20); ctx.lineTo(x + 12, GROUND - 24); ctx.lineTo(x + 5, GROUND - 16); ctx.fill(); ctx.fillStyle = 'rgba(255,60,60,.8)'; ctx.fillRect(x - 2, GROUND - 22, 1.2, 1.2); ctx.fillRect(x + 1, GROUND - 22, 1.2, 1.2); } }, 0.25, 93);
    },
    front(t, sc) {
      for (let i = 0; i < 4; i++) { const x = frac(hash(i * 3) + t * 0.05 * (1 + i * 0.3)) * (W + 40) - 20, y = 50 + hash(i) * 70 + Math.sin(t * 2 + i) * 10, f = Math.sin(t * 16 + i);
        ctx.fillStyle = '#05040c'; ctx.beginPath(); ctx.ellipse(x, y, 2, 1.6, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 4, y - 5 * f, x - 8, y - 1 * f); ctx.quadraticCurveTo(x - 4, y + 1, x, y); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 5 * f, x + 8, y - 1 * f); ctx.quadraticCurveTo(x + 4, y + 1, x, y); ctx.fill(); }
      fog(t, GROUND, 20, '90,80,150', 0.3, 6, 7, 10);
      grade('#3a2a8a', 0.3); vignette(0.5);
    },
  };
  // 8 Aschewüste
  ENV[8] = {
    back(t, sc) {
      skyFill(['#5a4844', '#a7806a', '#e0c098']); disc(330, 74, 26, 'rgba(255,236,200,.85)', '255,220,170', 0.4);
      ridge(sc, 0.06, 182, 60, 0.012, '#9a6e58', { kind: 'mesa', seed: 4, shade: 'rgba(80,40,30,.25)' });
      ctx.fillStyle = vg(['rgba(230,200,160,0)', 'rgba(230,200,160,.5)'], 130, 190); ctx.fillRect(0, 130, W, 60);
      ridge(sc, 0.2, 200, 22, 0.012, '#b88c64', { kind: 'dune', seed: 2, rim: 'rgba(255,230,190,.5)' });
      ridge(sc, 0.4, 214, 14, 0.018, '#9a7250', { kind: 'dune', seed: 6, rim: 'rgba(255,220,180,.4)' });
      groundBase('#b08860', '#8a6644', '#4e3824', '#c49a6c', sc, { speck: 'rgba(80,50,30,.22)', hi: 'rgba(255,230,190,.25)' });
      ctx.strokeStyle = 'rgba(90,60,40,.25)'; ctx.lineWidth = 1; for (let r = 0; r < 5; r++) { const y = GROUND + 9 + r * 8; ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin((x + sc * (1 + r * 0.05)) * 0.08 + r) * 1.8); ctx.stroke(); }
    },
    props(t, sc) {
      each(sc, 1, 76, (x, k) => { const r = hash(k * 3);
        if (r < 0.35) { ctx.fillStyle = '#6a5a3a'; ctx.fillRect(x - 2.5, GROUND - 30, 5, 30); ctx.fillRect(x - 11, GROUND - 22, 8, 3.6); ctx.fillRect(x - 11, GROUND - 30, 3.6, 10); ctx.fillRect(x + 3, GROUND - 16, 8, 3.6); ctx.fillRect(x + 7.4, GROUND - 24, 3.6, 10); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + 1, GROUND - 30, 1.5, 30); }
        else if (r < 0.65) { ribcage(x, GROUND + 2, 0.55, '#e8dcc4'); bones(x + 18, GROUND + 3, 1.1, '#efe4cc'); }
        else rock(x, GROUND + 2, 1.2, '#b89a7a', '#8a6a4e', 'rgba(255,230,200,.3)'); }, 0.25, 101);
    },
    front(t, sc) {
      parts(t, 26, { type: 'dot', rgb: '230,200,160', vx: 90, vy: 6, wob: 2, wa: 4, size: 1.3, alpha: 0.5, seed: 17 });
      parts(t, 6, { type: 'streak', rgb: '255,235,200', vx: 200, vy: 2, size: 1, alpha: 0.25, area: [0, 120, W, 100], seed: 18 });
      parts(t, 10, { type: 'dot', rgb: '120,110,110', vx: 10, vy: 14, size: 1.2, alpha: 0.5, seed: 19 });
      grade('#e8a870', 0.3); vignette(0.22, '60,30,10');
    },
  };
  // 9 Eisgrotten (Höhle)
  ENV[9] = {
    back(t, sc) {
      skyFill(['#040d18', '#0b2338', '#14405a']);
      each(sc, 0.08, 46, (x, k) => { const a = 0.35 + 0.25 * Math.sin(t * 1.3 + k); const y = 70 + hash(k) * 100, c = hash(k * 3) < 0.6 ? '80,200,255' : '170,120,255'; glowDot(x, y, 30 + hash(k * 2) * 30, c, a * 0.45); ctx.fillStyle = `rgba(${c},${0.5 + a * 0.5})`; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x + (i - 1) * 4, y + 4); ctx.rotate((i - 1) * 0.4); ctx.beginPath(); ctx.moveTo(-1.6, 0); ctx.lineTo(0, -7 - i % 2 * 3); ctx.lineTo(1.6, 0); ctx.fill(); ctx.restore(); } }, 0.2, 111);
      ctx.fillStyle = '#0a1c2c'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 6) { const wx = x + sc * 0.3; ctx.lineTo(x, 26 + Math.sin(wx * 0.03) * 8 + Math.abs(Math.sin(wx * 0.11)) * 14); } ctx.lineTo(W, 0); ctx.fill();
      each(sc, 0.3, 26, (x, k) => { const L = 18 + hash(k) * 36; ctx.fillStyle = '#0d2234'; ctx.beginPath(); ctx.moveTo(x - 7, 20); ctx.lineTo(x, 20 + L); ctx.lineTo(x + 7, 20); ctx.fill(); ctx.fillStyle = 'rgba(170,230,255,.5)'; ctx.beginPath(); ctx.moveTo(x - 1, 20 + L * 0.5); ctx.lineTo(x, 20 + L); ctx.lineTo(x + 1.6, 20 + L * 0.5); ctx.fill(); }, 0.2, 112);
      const hy = ridge(sc, 0.25, 196, 40, 0.02, '#123048', { kind: 'peak', seed: 3, shade: 'rgba(0,10,25,.35)' });
      each(sc, 0.25, 70, (x, k) => crystal(x, hy(x) + 6, 0.7, '#c8f4ff', '#4fb8e8', '90,210,255', t, k), 0.4, 113);
      ridge(sc, 0.45, 212, 10, 0.03, '#0e263a', { seed: 5 });
      groundBase('#5a9ab8', '#2c5a78', '#0e2232', '#8fd0ea', sc, { speck: 'rgba(0,20,40,.3)', hi: 'rgba(220,250,255,.35)' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg(['rgba(120,220,255,.18)', 'rgba(120,220,255,0)'], GROUND, GROUND + 20); ctx.fillRect(0, GROUND, W, 20); ctx.restore();
      ctx.strokeStyle = 'rgba(200,240,255,.25)'; ctx.lineWidth = 0.8; each(sc, 1, 40, (x, k) => { ctx.beginPath(); ctx.moveTo(x, GROUND + 6 + hash(k) * 10); ctx.lineTo(x + 10, GROUND + 14 + hash(k) * 10); ctx.lineTo(x + 6, GROUND + 26 + hash(k) * 10); ctx.stroke(); }, 0.4, 114);
    },
    props(t, sc) {
      each(sc, 1, 58, (x, k) => { const r = hash(k * 4); if (r < 0.65) crystal(x, GROUND + 2, 1 + hash(k) * 0.3, r < 0.3 ? '#e8d4ff' : '#d4f6ff', r < 0.3 ? '#9a6ae8' : '#4fb8e8', r < 0.3 ? '170,120,255' : '90,210,255', t, k);
        else { ctx.fillStyle = '#9fd8f2'; ctx.beginPath(); ctx.moveTo(x - 6, GROUND + 1); ctx.lineTo(x - 1, GROUND - 26); ctx.lineTo(x + 6, GROUND + 1); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - 2, GROUND - 18, 1.2, 16); } }, 0.3, 115);
    },
    front(t, sc) {
      parts(t, 20, { type: 'glow', rgb: '140,230,255', vx: 3, vy: -6, wob: 1, wa: 10, size: 1.2, tw: 2, alpha: 0.8, seed: 20 });
      parts(t, 10, { type: 'flake', rgb: '220,245,255', vx: 4, vy: 12, size: 1.2, alpha: 0.6, seed: 21 });
      grade('#3ab0ff', 0.28); vignette(0.5, '0,10,30');
    },
  };
  // 10 Sternenfeld
  ENV[10] = {
    back(t, sc) {
      skyFill(['#06051a', '#17124a', '#3a2a74']);
      for (const [x, y, r, c] of [[120, 60, 90, '255,110,200'], [330, 90, 110, '90,140,255'], [230, 40, 70, '170,100,255']]) glowDot(x, y, r, c, 0.22);
      ctx.save(); ctx.translate(W / 2, 60); ctx.rotate(-0.3); ctx.fillStyle = RG(0, 0, 260, 'rgba(255,255,255,.12)', 'rgba(255,255,255,0)'); ctx.scale(1, 0.12); ctx.beginPath(); ctx.arc(0, 0, 260, 0, 7); ctx.fill(); ctx.restore();
      stars(t, 120, 190, 1, 7);
      const sh = frac(t * 0.13); if (sh < 0.15) { const p = sh / 0.15, x = 420 - p * 200, y = 20 + p * 60; ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26, y - 8); ctx.stroke(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 2; i++) { ctx.fillStyle = vg([`rgba(${i ? '120,255,200' : '180,120,255'},0)`, `rgba(${i ? '120,255,200' : '180,120,255'},.16)`, 'rgba(0,0,0,0)'], 40 + i * 20, 130); ctx.beginPath(); ctx.moveTo(0, 60 + i * 20); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, 50 + i * 20 + Math.sin(x * 0.02 + t * 0.4 + i) * 16); ctx.lineTo(W, 140); ctx.lineTo(0, 140); ctx.fill(); } ctx.restore();
      each(sc, 0.12, 130, (x, k) => { const y = 110 + hash(k) * 40 + Math.sin(t * 0.8 + k) * 4, w = 20 + hash(k * 2) * 18; ctx.fillStyle = '#2a2058'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - 8, x + w, y); ctx.lineTo(x + w * 0.4, y + 10); ctx.lineTo(x, y + 18); ctx.lineTo(x - w * 0.5, y + 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#4a3a8a'; ctx.fillRect(x - w, y - 1, w * 2, 2); }, 0.3, 121);
      ridge(sc, 0.25, 202, 22, 0.015, '#251d56', { seed: 3, rim: 'rgba(200,170,255,.3)' });
      groundBase('#3d2f7a', '#251c52', '#100c28', '#5a46a8', sc, { speck: 'rgba(0,0,0,.3)', hi: 'rgba(200,180,255,.2)' });
      each(sc, 1, 20, (x, k) => { const y = GROUND + 6 + hash(k) * 30, a = 0.5 + 0.5 * Math.sin(t * 2 + k); glowDot(x, y, 5, '200,180,255', a * 0.6); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }, 0.4, 122);
    },
    props(t, sc) {
      each(sc, 1, 70, (x, k) => { if (hash(k * 2) < 0.4) obelisk(x, GROUND + 1, 0.9, '#2a2260', '150,200,255', t, k);
        else for (let i = 0; i < 3; i++) { const fx = x + i * 8 - 8, fy = GROUND - 5 - hash(k + i) * 6; ctx.strokeStyle = '#4a3a8a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, GROUND); ctx.lineTo(fx, fy); ctx.stroke(); glowDot(fx, fy, 8, '255,220,140', 0.4 + 0.2 * Math.sin(t * 3 + k + i)); ctx.fillStyle = '#fff3b0'; for (let p = 0; p < 5; p++) { const a = p * 1.257 + t * 0.5; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 1.8, fy + Math.sin(a) * 1.8, 1, 0, 7); ctx.fill(); } } }, 0.3, 123);
    },
    front(t, sc) {
      parts(t, 20, { type: 'glow', rgb: '210,190,255', vx: 2, vy: -10, wob: 1, wa: 8, size: 1.1, tw: 2.5, alpha: 0.9, seed: 22 });
      grade('#7a5aff', 0.22); vignette(0.4, '5,0,20');
    },
  };
  // 11 Uralter Hain
  ENV[11] = {
    back(t, sc) {
      skyFill(['#b8d890', '#e4f0b8', '#fff6d0']);
      each(sc, 0.1, 48, (x, k) => { const w = 10 + hash(k) * 10; ctx.fillStyle = '#9ab07a'; ctx.fillRect(x - w / 2, 40, w, 160); ctx.fillStyle = '#8aa06a'; ctx.beginPath(); ctx.arc(x, 40, 36 + hash(k) * 20, 0, 7); ctx.fill(); }, 0, 131);
      sunRays(t, 160, '255,250,200', 0.12, 5, 60, -60);
      each(sc, 0.25, 90, (x, k) => { const w = 22 + hash(k) * 16; ctx.fillStyle = '#5e6e3e'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 10, 206); ctx.quadraticCurveTo(x - w / 2, 190, x - w / 2, 120); ctx.lineTo(x - w / 2, 0); ctx.lineTo(x + w / 2, 0); ctx.lineTo(x + w / 2, 120); ctx.quadraticCurveTo(x + w / 2, 190, x + w / 2 + 12, 206); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,220,.12)'; ctx.fillRect(x + w / 2 - 5, 0, 4, 190); }, 0.2, 132);
      ctx.fillStyle = '#4e6a32'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 8) { const wx = x + sc * 0.3; ctx.lineTo(x, 24 + Math.sin(wx * 0.04) * 10 + Math.sin(wx * 0.13) * 6); } ctx.lineTo(W, 0); ctx.fill();
      ctx.fillStyle = '#3e5626'; each(sc, 0.3, 18, (x, k) => { ctx.beginPath(); ctx.arc(x, 20 + hash(k) * 16, 10 + hash(k * 2) * 8, 0, 7); ctx.fill(); }, 0.2, 133);
      ridge(sc, 0.45, 210, 10, 0.03, '#3e5a28', { seed: 4 });
      groundBase('#5a8a3a', '#3e5a26', '#1e2c12', '#6aa046', sc, { speck: 'rgba(30,40,10,.3)' });
      ctx.strokeStyle = '#4a3a22'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; each(sc, 1, 90, (x, k) => { ctx.beginPath(); ctx.moveTo(x, GROUND + 2); ctx.quadraticCurveTo(x + 20, GROUND + 12 + hash(k) * 10, x + 46, GROUND + 6 + hash(k) * 8); ctx.stroke(); }, 0.4, 134);
    },
    props(t, sc) {
      each(sc, 0.85, 160, (x, k) => { const w = 26; ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.moveTo(x - w - 14, GROUND); ctx.quadraticCurveTo(x - w, GROUND - 10, x - w * 0.6, GROUND - 60); ctx.lineTo(x - w * 0.6, -10); ctx.lineTo(x + w * 0.6, -10); ctx.lineTo(x + w * 0.6, GROUND - 60); ctx.quadraticCurveTo(x + w, GROUND - 10, x + w + 16, GROUND); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,170,70,.6)'; ctx.beginPath(); ctx.ellipse(x - 8, GROUND - 40, 8, 14, 0.2, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,220,.1)'; ctx.fillRect(x + w * 0.6 - 5, -10, 4, GROUND - 40);
        ctx.strokeStyle = 'rgba(40,30,20,.5)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 10 + i * 5, 0); ctx.lineTo(x - 12 + i * 5 + Math.sin(i) * 2, GROUND - 40); ctx.stroke(); } }, 0.45, 135);
      each(sc, 1, 54, (x, k) => { const r = hash(k * 3); if (r < 0.45) { for (let i = 0; i < 3; i++) mushroom(x + i * 6, GROUND + 2, 0.8 + hash(k + i) * 0.4, '#5ad0c8', '120,255,230', t, k + i); }
        else if (r < 0.75) { ctx.fillStyle = '#7a7a6a'; rr(x - 7, GROUND - 28, 14, 28, 4); ctx.fill(); ctx.fillStyle = 'rgba(90,140,60,.7)'; ctx.beginPath(); ctx.ellipse(x - 3, GROUND - 26, 6, 3, 0, 0, 7); ctx.fill(); const a = 0.5 + 0.5 * Math.sin(t * 2 + k); ctx.fillStyle = `rgba(140,255,200,${a})`; ctx.fillRect(x - 1, GROUND - 20, 2, 8); ctx.fillRect(x - 3, GROUND - 16, 6, 1.4); glowDot(x, GROUND - 16, 12, '140,255,200', a * 0.3); }
        else bush(x, GROUND + 2, 1, ['#6aa046', '#3e6a28']); }, 0.3, 136);
    },
    front(t, sc) {
      parts(t, 24, { type: 'glow', rgb: '255,250,190', vx: 4, vy: -3, wob: 1, wa: 12, size: 1, tw: 1.6, alpha: 0.75, seed: 23 });
      tufts(sc, '#2e4a1c', '#4a6e2a', 1.3, H, 22, 13, 11);
      grade('#ffe9a0', 0.25); vignette(0.3, '20,30,0');
    },
  };
  // 12 Totenreich
  ENV[12] = {
    back(t, sc) {
      skyFill(['#081412', '#183430', '#36584c']); stars(t, 30, 100, 0.5, 9); moon(100, 56, 14, t, '#d8ffe8', '170,255,210');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg(['rgba(80,255,180,0)', 'rgba(80,255,180,.12)', 'rgba(0,0,0,0)'], 20, 120); ctx.beginPath(); ctx.moveTo(0, 40); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, 34 + Math.sin(x * 0.025 + t * 0.5) * 14); ctx.lineTo(W, 130); ctx.lineTo(0, 130); ctx.fill(); ctx.restore();
      each(sc, 0.1, 40, (x, k) => { const h = 30 + hash(k) * 50; ctx.fillStyle = '#16302a'; ctx.fillRect(x - 5, 186 - h, 10, h); if (hash(k * 2) < 0.5) ctx.fillRect(x - 8, 186 - h - 3, 16, 3); else { ctx.beginPath(); ctx.moveTo(x - 5, 186 - h); ctx.lineTo(x, 186 - h - 8); ctx.lineTo(x + 5, 186 - h); ctx.fill(); } }, 0.35, 141);
      fog(t, 178, 34, '120,220,180', 0.3, 3, 6, 11);
      const hy = ridge(sc, 0.3, 202, 14, 0.02, '#14241f', { seed: 6 });
      each(sc, 0.3, 46, (x, k) => deadTree(x, hy(x) + 3, 0.8 + hash(k) * 0.3, '#0e1a16'), 0.4, 142);
      groundBase('#3a4440', '#262e2a', '#0e1210', '#4a5650', sc, { speck: 'rgba(0,0,0,.3)', hi: 'rgba(160,255,210,.12)' });
      each(sc, 1, 50, (x, k) => { const a = 0.35 + 0.3 * Math.sin(t * 2 + k); ctx.strokeStyle = `rgba(120,255,190,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, GROUND + 8 + hash(k) * 14); ctx.lineTo(x + 7, GROUND + 14 + hash(k) * 14); ctx.lineTo(x + 3, GROUND + 22 + hash(k) * 14); ctx.stroke(); }, 0.4, 143);
    },
    props(t, sc) {
      each(sc, 1, 64, (x, k) => { const r = hash(k * 2);
        if (r < 0.35) pillar(x, GROUND + 1, 0.9, '#5a6a64', '#3a4844', true, null, hash(k * 9));
        else if (r < 0.65) { ctx.fillStyle = '#2a3430'; ctx.beginPath(); ctx.moveTo(x - 7, GROUND); ctx.lineTo(x - 4, GROUND - 16); ctx.lineTo(x + 4, GROUND - 16); ctx.lineTo(x + 7, GROUND); ctx.fill(); ctx.fillStyle = '#3a4844'; ctx.fillRect(x - 6, GROUND - 19, 12, 3); flame(x, GROUND - 19, 1, t, k, '#3ad08a', '#9affc8', '80,255,170'); }
        else { ctx.strokeStyle = '#c8d4cc'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * 2.4 - 3, GROUND + 1); ctx.lineTo(x + i * 3 - 5, GROUND - 6 - (i % 2) * 2 + Math.sin(t * 2 + k + i) * 0.8); ctx.stroke(); } ctx.fillStyle = '#c8d4cc'; ctx.beginPath(); ctx.ellipse(x, GROUND - 1, 4, 2, 0, 0, 7); ctx.fill(); } }, 0.25, 144);
    },
    front(t, sc) {
      for (let i = 0; i < 6; i++) { const p = frac(t * 0.07 + hash(i * 3)), x = hash(i * 7) * W + Math.sin(t + i) * 10, y = GROUND - p * 160, a = Math.sin(p * Math.PI) * 0.6;
        glowDot(x, y, 10, '150,255,210', a * 0.5); ctx.fillStyle = `rgba(220,255,240,${a})`; ctx.beginPath(); ctx.arc(x, y, 2.6, Math.PI, 0); ctx.lineTo(x + 2.6, y + 5); ctx.quadraticCurveTo(x, y + 9 + Math.sin(t * 4 + i) * 2, x - 2.6, y + 5); ctx.fill(); }
      fog(t, GROUND, 24, '120,220,180', 0.3, 8, 7, 12);
      grade('#3ac08a', 0.25); vignette(0.45, '0,15,10');
    },
  };
  // 13 Drachenhort
  ENV[13] = {
    back(t, sc) {
      skyFill(['#120604', '#3a160c', '#7a3416']);
      ctx.fillStyle = '#1e0c06'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 8) { const wx = x + sc * 0.15; ctx.lineTo(x, 40 + Math.sin(wx * 0.02) * 20 + Math.abs(Math.sin(wx * 0.07)) * 18); } ctx.lineTo(W, 0); ctx.fill();
      each(sc, 0.15, 30, (x, k) => { const L = 14 + hash(k) * 30; ctx.fillStyle = '#1e0c06'; ctx.beginPath(); ctx.moveTo(x - 6, 50); ctx.lineTo(x, 50 + L); ctx.lineTo(x + 6, 50); ctx.fill(); }, 0.3, 151);
      glowDot(240, 230, 260, '255,110,30', 0.25);
      each(sc, 0.18, 200, (x, k) => ribcage(x, 186, 1.6, 'rgba(70,40,30,.9)'), 0.3, 152);
      const hy = ridge(sc, 0.3, 200, 28, 0.016, '#c08a2a', { seed: 4, rim: 'rgba(255,240,170,.7)' });
      each(sc, 0.3, 16, (x, k) => { const a = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7); if (a > 0.8) { const y = hy(x) + 4 + hash(k) * 8; ctx.fillStyle = `rgba(255,255,230,${a})`; ctx.fillRect(x - 2.5, y, 6, 1); ctx.fillRect(x, y - 2.5, 1, 6); } }, 0.3, 153);
      ridge(sc, 0.45, 212, 10, 0.03, '#5a3416', { seed: 7 });
      groundBase('#5a3a1e', '#3a2412', '#160c06', '#7a5226', sc, { speck: 'rgba(0,0,0,.3)', hi: 'rgba(255,210,120,.3)' });
      each(sc, 1, 12, (x, k) => { const y = GROUND + 5 + hash(k) * 36; ctx.fillStyle = hash(k * 2) < 0.5 ? '#ffd24a' : '#e0a030'; ctx.beginPath(); ctx.ellipse(x, y, 1.8, 0.9, 0, 0, 7); ctx.fill(); }, 0.4, 154);
    },
    props(t, sc) {
      each(sc, 1, 76, (x, k) => { const r = hash(k * 2);
        if (r < 0.4) goldPile(x, GROUND + 2, 0.8 + hash(k) * 0.3, t, k);
        else if (r < 0.65) chest(x, GROUND + 1, 1, t, k);
        else if (r < 0.85) { ctx.save(); ctx.translate(x, GROUND); ctx.rotate(-0.15); ctx.fillStyle = '#b8bcc8'; ctx.fillRect(-1.2, -30, 2.4, 26); ctx.beginPath(); ctx.moveTo(-1.2, -30); ctx.lineTo(0, -34); ctx.lineTo(1.2, -30); ctx.fill(); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-5, -6, 10, 2); ctx.fillRect(-1, -4, 2, 6); ctx.restore(); }
        else bones(x, GROUND + 3, 1.3, '#d8ccb4'); }, 0.25, 155);
    },
    front(t, sc) {
      parts(t, 18, { type: 'ember', rgb: '255,160,60', vx: 6, vy: -20, wob: 2, wa: 8, size: 1.4, alpha: 0.85, seed: 24 });
      ctx.fillStyle = vg(['rgba(255,120,30,0)', 'rgba(255,120,30,.16)'], 150, H); ctx.fillRect(0, 150, W, H);
      grade('#ff9a3a', 0.28); vignette(0.45, '30,8,0');
    },
  };
  // 14 Himmelsspitze
  ENV[14] = {
    back(t, sc) {
      skyFill(['#24326e', '#6a5eb0', '#f2a878']); disc(360, 150, 22, '#fff0d0', '255,200,150', 0.55);
      each(sc, 0.04, 260, (x, k) => { ctx.fillStyle = 'rgba(70,70,110,.55)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + i * 18 - 36, 70 + Math.sin(i) * 6, 18 + (i % 2) * 8, 0, 7); ctx.fill(); }
        if (frac(t * 0.21 + hash(k)) < 0.04) { ctx.strokeStyle = 'rgba(255,255,220,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x - 6, 100); ctx.lineTo(x + 2, 104); ctx.lineTo(x - 8, 130); ctx.stroke(); } }, 0.3, 161);
      ridge(sc, 0.08, 180, 70, 0.009, '#6a6aa0', { kind: 'peak', snow: 'rgba(255,240,240,.85)', snowAt: 0.6, seed: 2 });
      clouds(t, 6, 150, 182, '#fff3ea', '#d8c8e0', 0.95, 4, 12, 1.4);
      ctx.fillStyle = vg(['rgba(255,240,230,0)', 'rgba(255,240,230,.75)'], 160, 196); ctx.fillRect(0, 160, W, 40);
      each(sc, 0.3, 80, (x, k) => pillar(x, 206, 0.9, '#d8d0e8', '#a89cc0', hash(k) < 0.4, '#e0b84a', hash(k * 9)), 0.35, 162);
      ridge(sc, 0.45, 212, 10, 0.03, '#7a7698', { seed: 5 });
      groundBase('#9a96b8', '#6a6688', '#34304a', '#b8b4d4', sc, { speck: 'rgba(0,0,0,.2)', hi: 'rgba(255,255,255,.3)' });
      each(sc, 1, 70, (x, k) => { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 4 + hash(k) * 10, 14, 2.2, 0, 0, 7); ctx.fill(); }, 0.45, 163);
    },
    props(t, sc) {
      each(sc, 1, 90, (x, k) => { if (hash(k * 2) < 0.5) { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 1, GROUND - 40, 2, 40); ctx.fillRect(x + 59, GROUND - 34, 2, 34);
          ctx.strokeStyle = 'rgba(60,50,40,.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x, GROUND - 38); ctx.quadraticCurveTo(x + 30, GROUND - 26, x + 60, GROUND - 32); ctx.stroke();
          const cols = ['#e5484d', '#ffd23f', '#3b7ad6', '#ffffff', '#5aa84e']; for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7, fx = x + u * 60, fy = GROUND - 38 + 6 * u + Math.sin(u * Math.PI) * 7 - 6 * u * u; const fl = Math.sin(t * 6 + i + k) * 1.5; ctx.fillStyle = cols[i % 5]; ctx.beginPath(); ctx.moveTo(fx - 3, fy); ctx.lineTo(fx + 3, fy); ctx.lineTo(fx + 2 + fl, fy + 7); ctx.lineTo(fx - 3 + fl, fy + 6); ctx.fill(); } }
        else rock(x, GROUND + 2, 1.1, '#c8c4dc', '#8a86a6', 'rgba(255,255,255,.5)'); }, 0.3, 164);
    },
    front(t, sc) {
      parts(t, 10, { type: 'streak', rgb: '255,255,255', vx: 220, vy: 3, size: 1, alpha: 0.35, area: [0, 40, W, 180], seed: 25 });
      parts(t, 8, { type: 'flake', rgb: '255,255,255', vx: 60, vy: 10, size: 1.4, alpha: 0.6, seed: 26 });
      grade('#ffb88a', 0.2); vignette(0.2, '20,10,40');
    },
  };
  // Lager bei Nacht
  const ENV_CAMP = {
    back(t, sc) {
      skyFill(['#0b0f24', '#1d1d42', '#3a2f55']); stars(t, 90, 170, 1, 2); moon(430, 46, 14, t);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg(['rgba(140,120,255,0)', 'rgba(140,120,255,.08)', 'rgba(0,0,0,0)'], 30, 140); ctx.fillRect(0, 30, W, 110); ctx.restore();
      ridge(0, 0, 168, 60, 0.009, '#1e1f3c', { kind: 'peak', snow: 'rgba(200,200,240,.35)', snowAt: 0.62, seed: 3 });
      each(0, 0, 14, (x, k) => pine(x, 196 + hash(k) * 4, 0.5 + hash(k) * 0.3, ['#16233a', '#121c30', '#0e1626']), 0, 171);
      ridge(0, 0, 210, 8, 0.03, '#141a26', { seed: 6 });
      groundBase('#2e3a2a', '#221c14', '#0e0b08', '#3a4a32', 0, { speck: 'rgba(0,0,0,.35)' });
    },
    props(t) {
      rock(60, GROUND + 3, 1.2, '#4a4a52', '#2e2e36'); bush(110, GROUND + 3, 1, ['#2a4030', '#1a2c20']); pine(30, GROUND, 1.3, ['#1e3a2c', '#142a20', '#0e1e16']); pine(462, GROUND, 1.1, ['#1e3a2c', '#142a20', '#0e1e16']);
      lantern(330, GROUND + 1, 1, t, 3);
    },
    front(t) {
      parts(t, 10, { type: 'glow', rgb: '210,255,140', vx: 3, vy: -3, wob: 1, wa: 12, size: 1.3, tw: 2, alpha: 0.7, area: [0, 120, W, 90], seed: 30 });
      tufts(0, '#14261a', '#1e3622', 0, H, 26, 12, 13);
      vignette(0.35);
    },
  };
  // Turm: Innenraum mit Fenstern und Fackeln
  const ENV_TOWER = {
    back(t, sc) {
      skyFill(['#1a1230', '#2a1e48', '#3a2a5e']);
      const off = sc * 0.3; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
      for (let r = 0; r < 14; r++) { const y = r * 16; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); const o = ((off + (r % 2) * 18) % 36 + 36) % 36; for (let x = -o; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); } }
      each(sc, 0.3, 130, (x, k) => { ctx.fillStyle = '#0a0818'; ctx.beginPath(); ctx.moveTo(x - 16, 150); ctx.lineTo(x - 16, 80); ctx.arc(x, 80, 16, Math.PI, 0); ctx.lineTo(x + 16, 150); ctx.fill(); ctx.save(); ctx.clip(); stars(t, 12, 160, 1, k); moon(x + 6, 76, 5, t); ctx.restore();
        ctx.strokeStyle = '#4a3a6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 16, 150); ctx.lineTo(x - 16, 80); ctx.arc(x, 80, 16, Math.PI, 0); ctx.lineTo(x + 16, 150); ctx.stroke(); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x, 150); ctx.moveTo(x - 16, 110); ctx.lineTo(x + 16, 110); ctx.stroke(); }, 0, 181);
      each(sc, 0.3, 130, (x, k) => { const tx = x + 65; ctx.fillStyle = '#3a2a1a'; ctx.fillRect(tx - 2, 130, 4, 16); flame(tx, 130, 1.3, t, k); lightPool(tx, 128, 70, '255,160,80', 0.18); }, 0, 182);
      groundBase('#4a3e66', '#2e2644', '#130f20', '#5a4e7a', sc, { speck: 'rgba(0,0,0,.3)' });
      tiles(sc, 'rgba(0,0,0,.3)', 9, 30);
    },
    props() {},
    front(t) { parts(t, 10, { type: 'glow', rgb: '200,160,255', vx: 2, vy: -8, size: 1.2, tw: 2, alpha: 0.7, seed: 31 }); grade('#7a4aff', 0.18); vignette(0.5); },
  };
  function envOf(stage, mode) { return mode === 'camp' ? ENV_CAMP : mode === 'tower' ? ENV_TOWER : ENV[zoneOf(stage) % ENV.length]; }
  /* ================= Ahnenprüfung: Grafik ================= */
  // Färbt eine Zeichnung ein: erst auf eine eigene Fläche zeichnen, dann mit der Farbe überziehen
  let ahnCv = null, ahnCv2 = null;
  function tintDraw(fn, tint, amount, halfW = 120) {
    if (!tint || !cv) { fn(); return; }
    if (!ahnCv) { ahnCv = document.createElement('canvas'); ahnCv2 = document.createElement('canvas'); }
    for (const c of [ahnCv, ahnCv2]) if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; }
    const main = ctx, oc = ahnCv.getContext('2d'), o2 = ahnCv2.getContext('2d'), m = main.getTransform(), a0 = main.globalAlpha;
    const sx = Math.max(0, Math.floor(m.e - halfW * m.a)), sw = Math.min(cv.width - sx, Math.ceil(halfW * 2 * m.a));
    if (sw <= 0) return;
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(sx, 0, sw, cv.height); oc.globalAlpha = 1;
    oc.setTransform(m); ctx = oc;
    try { fn(); } finally { ctx = main; }
    oc.setTransform(1, 0, 0, 1, 0, 0);
    // Farbton übernehmen, Helligkeit behalten, dann auf die Form zuschneiden
    o2.setTransform(1, 0, 0, 1, 0, 0); o2.globalCompositeOperation = 'source-over'; o2.globalAlpha = 1; o2.clearRect(sx, 0, sw, cv.height);
    o2.drawImage(ahnCv, sx, 0, sw, cv.height, sx, 0, sw, cv.height);
    o2.globalCompositeOperation = 'color'; o2.globalAlpha = amount; o2.fillStyle = tint; o2.fillRect(sx, 0, sw, cv.height);
    const n = parseInt(tint.slice(1), 16), lum = (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
    if (lum > 0.7) { o2.globalAlpha = (lum - 0.6) * 1.1; o2.globalCompositeOperation = 'screen'; o2.fillRect(sx, 0, sw, cv.height); }
    else if (lum < 0.3) { o2.globalAlpha = (0.35 - lum) * 1.2; o2.globalCompositeOperation = 'multiply'; o2.fillRect(sx, 0, sw, cv.height); }
    o2.globalAlpha = 1; o2.globalCompositeOperation = 'destination-in'; o2.drawImage(ahnCv, sx, 0, sw, cv.height, sx, 0, sw, cv.height);
    o2.globalCompositeOperation = 'source-over';
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a0; main.drawImage(ahnCv2, sx, 0, sw, cv.height, sx, 0, sw, cv.height); main.restore();
  }
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
  // Effekte rund um die Bosse
  function ahnAcc(kind, rgb, t, front, ph) {
    const sp = 1 + ph * 0.35;
    if (kind === 'blasen') { if (!front) return; for (let i = 0; i < 7; i++) { const p = (t * 0.35 * sp + i / 7) % 1; ctx.strokeStyle = `rgba(${rgb},${0.7 * (1 - p)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(Math.sin(i * 2.3) * 40, -10 - p * 110, 2 + (i % 3), 0, 7); ctx.stroke(); } return; }
    if (kind === 'staub') { if (front) return; for (let i = 0; i < 8; i++) { const p = (t * 0.5 * sp + i / 8) % 1; ctx.fillStyle = `rgba(190,160,120,${0.45 * (1 - p)})`; ctx.beginPath(); ctx.arc((i - 4) * 14 + p * 20, -4 - p * 20, 5 + p * 8, 0, 7); ctx.fill(); } return; }
    if (kind === 'blaetter' || kind === 'blueten' || kind === 'federn' || kind === 'asche' || kind === 'schnee') {
      if (!front) return;
      const col = { blaetter: ['#7ac85a', '#c8a03a'], blueten: ['#ff8ab8', '#ffd0e0'], federn: ['#2a2a3a', '#5a5a7a'], asche: ['#8a8a96', '#4a4a52'], schnee: ['#ffffff', '#cfefff'] }[kind];
      for (let i = 0; i < 10; i++) { const p = (t * 0.25 * sp + i / 10) % 1, x = Math.sin(i * 3.1) * 60 + Math.sin(t * 1.5 + i) * 10, y = -150 + p * 150; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.globalAlpha = (1 - p) * 0.9; ctx.fillStyle = col[i % 2];
        if (kind === 'schnee' || kind === 'asche') { ctx.beginPath(); ctx.arc(0, 0, kind === 'schnee' ? 1.8 : 2.2, 0, 7); ctx.fill(); } else { ctx.beginPath(); ctx.ellipse(0, 0, kind === 'federn' ? 5 : 4, 2, 0, 0, 7); ctx.fill(); }
        ctx.restore(); }
      ctx.globalAlpha = 1; return;
    }
    if (kind === 'runen' || kind === 'echo') {
      if (front) return;
      ctx.save(); ctx.translate(0, -70); ctx.globalCompositeOperation = 'lighter';
      const r = 62 + ph * 6; ctx.strokeStyle = `rgba(${rgb},${0.35 + ph * 0.12})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r - 9, 0, 7); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = t * 0.4 * sp + i * Math.PI / 6; ctx.save(); ctx.rotate(a); ctx.translate(r - 4.5, 0); ctx.fillStyle = `rgba(${rgb},.7)`; ctx.fillRect(-1.5, -3, 3, 6); ctx.restore(); }
      ctx.restore();
      if (kind === 'echo') glowDot(0, -70, 90, rgb, 0.18 + 0.06 * Math.sin(t * 2));
      return;
    }
    if (kind === 'schatten' || kind === 'leere') { if (front) return; for (let i = 0; i < 6; i++) { const p = (t * 0.3 * sp + i / 6) % 1; ctx.fillStyle = kind === 'leere' ? `rgba(20,10,40,${0.5 * (1 - p)})` : `rgba(30,20,50,${0.45 * (1 - p)})`; ctx.beginPath(); ctx.arc(Math.sin(i * 2.1) * 34, -20 - p * 100, 14 + p * 18, 0, 7); ctx.fill(); }
      if (kind === 'leere') { ctx.strokeStyle = `rgba(${rgb},.5)`; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const p = (t * 0.4 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, -70, 30 + p * 60, (30 + p * 60) * 0.4, 0, 0, 7); ctx.globalAlpha = 1 - p; ctx.stroke(); } ctx.globalAlpha = 1; } return; }
    if (kind === 'knochen') { if (front) return; for (let i = 0; i < 4; i++) { const a = t * 0.9 * sp + i * Math.PI / 2, x = Math.cos(a) * 58, y = -80 + Math.sin(a) * 18; ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-7, -1.5, 14, 3); ctx.beginPath(); ctx.arc(-7, -2, 2.4, 0, 7); ctx.arc(-7, 2, 2.4, 0, 7); ctx.arc(7, -2, 2.4, 0, 7); ctx.arc(7, 2, 2.4, 0, 7); ctx.fill(); ctx.restore(); } return; }
    if (kind === 'geister' || kind === 'irrlicht') { if (!front) return; for (let i = 0; i < 5; i++) { const a = t * 0.7 * sp + i * 1.26, x = Math.cos(a) * 54, y = -84 + Math.sin(a * 1.4) * 34; glowDot(x, y, kind === 'irrlicht' ? 9 : 7, rgb, 0.75); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); } return; }
    if (kind === 'gift') { if (front) return; for (let i = 0; i < 6; i++) { const p = (t * 0.4 * sp + i / 6) % 1; ctx.fillStyle = `rgba(140,220,90,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(Math.sin(i * 1.7) * 36, -6 - p * 60, 8 + p * 14, 0, 7); ctx.fill(); } return; }
    if (kind === 'funken' || kind === 'flammen' || kind === 'sterne') {
      if (!front) { if (kind === 'flammen') for (let i = 0; i < 7; i++) { const h = 16 + Math.sin(t * 9 * sp + i * 1.9) * 7; ctx.fillStyle = ['#ff5a2a', '#ffb547', '#ffd23f'][i % 3]; ctx.beginPath(); ctx.moveTo(-42 + i * 12, 2); ctx.quadraticCurveTo(-38 + i * 12, -h, -32 + i * 12, 2); ctx.fill(); } return; }
      for (let i = 0; i < 9; i++) { const p = (t * 0.6 * sp + i / 9) % 1, x = Math.sin(i * 2.7 + p * 3) * 50, y = -20 - p * 130;
        if (kind === 'sterne') { ctx.fillStyle = `rgba(255,240,200,${1 - p})`; sparkle(x, y, 3 * (1 - p) + 1, 1 - p); } else { ctx.fillStyle = `rgba(255,${180 + (i % 3) * 25},80,${1 - p})`; ctx.fillRect(x, y, 2.2, 2.2); } }
      return;
    }
    if (kind === 'kristalle') { if (front) return; for (let i = 0; i < 5; i++) { const a = t * 0.6 * sp + i * 1.26, x = Math.cos(a) * 60, y = -70 + Math.sin(a) * 22; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t + i) * 0.3); poly([[0, -10], [5, 0], [0, 10], [-5, 0]], `rgba(${rgb},.85)`, true); ctx.restore(); } return; }
    if (kind === 'blut') { if (front) return; for (let i = 0; i < 6; i++) { const p = (t * 0.5 * sp + i / 6) % 1; ctx.fillStyle = `rgba(200,20,40,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.ellipse(Math.sin(i * 2.9) * 30, -100 + p * 100, 2, 3.5, 0, 0, 7); ctx.fill(); } glowDot(0, -60, 70, '200,20,40', 0.15); }
  }
  // Ein Boss der Ahnenprüfung: Grundbild + Farbe + Effekte + Phase
  function ahnBoss(e, t, col) {
    const d = e.ahn, ph = e.phase || 0, rgb = d.tint ? hexRgb(d.tint) : '255,210,122', lunge = (e.lunge || 0) * 2 * 40;
    ctx.save(); ctx.translate(-lunge, 0);
    // Bodenring in Bossfarbe, in Phase 3 heller und schneller
    ctx.save(); ctx.scale(1, 0.22); const ra = 60;
    ctx.fillStyle = RG(0, 0, ra * 1.4, `rgba(${rgb},${0.28 + ph * 0.1})`, `rgba(${rgb},0)`); ctx.beginPath(); ctx.arc(0, 0, ra * 1.4, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},.6)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, ra, 0, 7); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < ph + 1 ? `rgba(${rgb},.95)` : 'rgba(255,255,255,.2)'; const a = t * (0.5 + ph * 0.4) + i * 2.09; ctx.beginPath(); ctx.arc(Math.cos(a) * ra * 0.85, Math.sin(a) * ra * 0.85, 6, 0, 7); ctx.fill(); }
    ctx.restore();
    if (ph >= 2) glowDot(0, -64, 100, '255,80,50', 0.18 + 0.08 * Math.sin(t * 7));
    if (d.ahne) { drawAhne(e, t, col); ctx.restore(); ahnBossFx(e, t, rgb); return; }
    ahnAcc(d.acc, rgb, t, false, ph);
    const sz = d.sz || 1, inv = e.invT > 0;
    ctx.save(); ctx.scale(sz, sz); if (inv) ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 30);
    if (d.acc === 'echo') ctx.globalAlpha *= 0.82;
    const hitT = e.hitT; e.hitT = 0;
    if (d.art) drawDragon(e, t, d.art); else tintDraw(() => bossDraw(e, t, c => c), d.tint, d.acc === 'echo' ? 0.8 : 0.85, 130 * sz);
    e.hitT = hitT; if (hitT > 0) glowDot(0, -60, 60, '255,255,255', 0.16);
    ctx.restore(); ctx.globalAlpha = 1;
    ahnAcc(d.acc, rgb, t, true, ph);
    ctx.restore();
    ahnBossFx(e, t, rgb);
  }
  function ahnBossFx(e, t, rgb) {
    if (e.castT > 0 && !(e.ahn && e.ahn.art)) { const p = 1 - e.castT / 0.8; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${rgb},${1 - p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -60, 30 + p * 70, (30 + p * 70) * 0.9, 0, 0, 7); ctx.stroke(); glowDot(0, -70, 50, rgb, 0.35 * (1 - p)); ctx.restore(); }
    if (e.shieldHp > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, -70, 30, 0, -70, 82); g.addColorStop(0, 'rgba(120,190,255,0)'); g.addColorStop(0.85, 'rgba(140,200,255,.28)'); g.addColorStop(1, 'rgba(200,235,255,.6)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -70, 70, 84, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(200,235,255,.7)'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * 1.05; ctx.beginPath(); ctx.arc(0, -70, 76, a, a + 0.4); ctx.stroke(); } ctx.restore(); }
    if (e.reflT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const y = -140 + ((t * 120 + i * 30) % 150); ctx.fillStyle = 'rgba(230,240,255,.35)'; ctx.fillRect(-46, y, 92, 2); } ctx.restore(); }
    if (e.healT > 0) for (let i = 0; i < 4; i++) { const p = (t * 0.9 + i / 4) % 1; ctx.fillStyle = `rgba(126,224,138,${1 - p})`; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', Math.sin(i * 2) * 30, -40 - p * 90); }
    if (e.frenzyT > 0) glowDot(0, -60, 80, '255,40,40', 0.3 + 0.15 * Math.sin(t * 16));
    if (e.enrage > 1) glowDot(0, -60, 95, '255,50,40', Math.min(0.55, (e.enrage - 1) * 0.7) * (0.8 + 0.2 * Math.sin(t * 8)));
  }

  /* ---------- Der Urahn ---------- */
  const AHNE_PAL = [
    { main: '#ffd27a', light: '#fff2c8', dark: '#8a5a1a', rgb: '255,205,110', cape: ['#4a1f7a', '#14071f'], eye: '255,240,180' },
    { main: '#d8b8ff', light: '#f4ecff', dark: '#5a3a9a', rgb: '205,165,255', cape: ['#3a1260', '#0c0418'], eye: '235,200,255' },
    { main: '#bff0ff', light: '#ffffff', dark: '#2a6a9a', rgb: '150,230,255', cape: ['#0c3060', '#030a18'], eye: '200,250,255' },
  ];
  function ahneSword(len, P, glow) {
    if (glow) glowDot(0, -len * 0.5, len * 0.55, P.rgb, 0.25);
    poly([[0, -len - 6], [3.4, -len], [3.4, 0], [-3.4, 0], [-3.4, -len]], P.light, true);
    ctx.fillStyle = `rgba(${P.rgb},.8)`; ctx.fillRect(-0.8, -len + 2, 1.6, len - 4);
    ctx.fillStyle = P.dark; ctx.fillRect(-9, -1, 18, 3.5); ctx.fillStyle = P.main; ctx.fillRect(-1.6, 2, 3.2, 8); ctx.beginPath(); ctx.arc(0, 11, 2.6, 0, 7); ctx.fill();
  }
  function drawAhne(e, t, col) {
    const ph = e.phase || 0, P = AHNE_PAL[ph], hov = -10 + Math.sin(t * 1.4) * 4, inv = e.invT > 0, flash = false;
    const C = c => c;
    ctx.save(); ctx.translate(0, 10); ctx.scale(0.88, 0.88);
    // Lichtstrahlen und Runenkreis hinter ihm
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32 + Math.sin(t * 0.6 + i) * 0.05; ctx.fillStyle = `rgba(${P.rgb},${0.07 + (i % 2) * 0.04})`; ctx.beginPath(); ctx.moveTo(0, -110 + hov); ctx.lineTo(Math.cos(a - 0.06) * 260, -110 + hov + Math.sin(a - 0.06) * 260); ctx.lineTo(Math.cos(a + 0.06) * 260, -110 + hov + Math.sin(a + 0.06) * 260); ctx.closePath(); ctx.fill(); }
    ctx.translate(0, -118 + hov);
    const R1 = 74 + ph * 4;
    ctx.strokeStyle = `rgba(${P.rgb},.55)`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, R1, 0, 7); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, R1 - 10, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R1 + 7, 0, 7); ctx.stroke();
    ctx.save(); ctx.rotate(t * 0.25);
    for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = `rgba(${P.rgb},.75)`; if (i % 2) ctx.fillRect(R1 - 7, -1, 5, 2); else { ctx.beginPath(); ctx.moveTo(R1 - 8, 0); ctx.lineTo(R1 - 4, -3); ctx.lineTo(R1, 0); ctx.lineTo(R1 - 4, 3); ctx.fill(); } }
    ctx.restore();
    ctx.save(); ctx.rotate(-t * 0.4); ctx.strokeStyle = `rgba(${P.rgb},.35)`; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI * 2 / 6 * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * (R1 - 12), Math.sin(a) * (R1 - 12)); } ctx.stroke(); ctx.restore();
    ctx.restore();
    // Kreisende Geisterklingen (hinter dem Körper)
    const nS = 2 + ph, swords = [];
    for (let i = 0; i < nS; i++) { const a = t * (0.9 + ph * 0.25) + i * Math.PI * 2 / nS; swords.push({ a, x: Math.cos(a) * 84, y: -96 + hov + Math.sin(a) * 26, front: Math.sin(a) > 0 }); }
    const drawS = s => { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.cos(s.a) * 0.5 + Math.PI); ctx.globalAlpha = s.front ? 0.95 : 0.55; ahneSword(30, P, true); ctx.restore(); ctx.globalAlpha = 1; };
    swords.filter(s => !s.front).forEach(drawS);
    ctx.save(); if (inv) ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 30);
    ctx.translate(0, hov);
    // Umhang
    const w1 = Math.sin(t * 1.8) * 6, w2 = Math.sin(t * 1.8 + 1.3) * 8;
    const cg = ctx.createLinearGradient(0, -130, 0, 0); cg.addColorStop(0, P.cape[0]); cg.addColorStop(1, 'rgba(10,4,20,0)');
    ctx.beginPath(); ctx.moveTo(-30, -128); ctx.bezierCurveTo(-60, -100, -78 + w1, -50, -70 + w2, 6); ctx.quadraticCurveTo(-30, -6 + w1, 4, 10); ctx.quadraticCurveTo(40, -2, 54 + w1, 4); ctx.bezierCurveTo(50, -50, 46, -100, 30, -128); ctx.closePath(); ctx.fillStyle = flash ? '#fff' : cg; ctx.fill();
    ctx.strokeStyle = `rgba(${P.rgb},.75)`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-30, -128); ctx.bezierCurveTo(-60, -100, -78 + w1, -50, -70 + w2, 6); ctx.stroke();
    for (let i = 0; i < 5; i++) { const p = (t * 0.4 + i / 5) % 1; ctx.fillStyle = `rgba(${P.rgb},${0.6 * (1 - p)})`; ctx.fillRect(-66 + i * 26 + Math.sin(t + i) * 6, 4 - p * 30, 2, 2); }
    // Geisterhafter Unterleib
    const tg = ctx.createLinearGradient(0, -78, 0, -4); tg.addColorStop(0, C(P.dark)); tg.addColorStop(0.6, `rgba(${P.rgb},.35)`); tg.addColorStop(1, `rgba(${P.rgb},0)`);
    ctx.beginPath(); ctx.moveTo(-26, -78); ctx.quadraticCurveTo(-30 + w1 * 0.5, -40, -12 + w2 * 0.6, -4); ctx.quadraticCurveTo(0, 4, 10 + w1 * 0.6, -6); ctx.quadraticCurveTo(28, -40, 26, -78); ctx.closePath(); ctx.fillStyle = tg; ctx.fill();
    for (let i = 0; i < 4; i++) { const sx = -16 + i * 11, sw = Math.sin(t * 2.4 + i) * 5; ctx.strokeStyle = `rgba(${P.rgb},.35)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, -60); ctx.quadraticCurveTo(sx + sw, -30, sx - sw, -8); ctx.stroke(); }
    // Gürtel
    rr(-28, -82, 56, 10, 3); fillO(C(P.dark)); for (let i = 0; i < 5; i++) { rr(-24 + i * 10, -80, 8, 6, 1.5); fillO(C(P.main)); }
    glowDot(0, -77, 9, P.rgb, 0.8); ctx.fillStyle = C(P.light); ctx.beginPath(); ctx.arc(0, -77, 3, 0, 7); ctx.fill();
    // Brustpanzer
    const bg = ctx.createLinearGradient(0, -134, 0, -80); bg.addColorStop(0, C(P.light)); bg.addColorStop(0.45, C(P.main)); bg.addColorStop(1, C(P.dark));
    ctx.beginPath(); ctx.moveTo(-32, -132); ctx.lineTo(32, -132); ctx.quadraticCurveTo(34, -104, 26, -82); ctx.lineTo(-26, -82); ctx.quadraticCurveTo(-34, -104, -32, -132); ctx.closePath(); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = `rgba(60,30,10,.45)`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -130); ctx.lineTo(0, -84); ctx.moveTo(-24, -118); ctx.quadraticCurveTo(-12, -110, -4, -96); ctx.moveTo(24, -118); ctx.quadraticCurveTo(12, -110, 4, -96); ctx.moveTo(-22, -92); ctx.lineTo(22, -92); ctx.stroke();
    // Wappen mit Herzstein
    ctx.save(); ctx.translate(0, -110); poly([[0, -12], [10, -6], [8, 8], [0, 14], [-8, 8], [-10, -6]], C(P.dark), true);
    glowDot(0, 0, 18, P.rgb, 0.7 + 0.25 * Math.sin(t * 3)); ctx.fillStyle = C(P.light); ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill(); ctx.restore();
    // Schulterplatten mit Stacheln
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.translate(sg * 33, -126); ctx.scale(sg, 1);
      ctx.beginPath(); ctx.moveTo(-10, 8); ctx.quadraticCurveTo(-8, -14, 14, -12); ctx.quadraticCurveTo(24, -4, 20, 12); ctx.quadraticCurveTo(6, 6, -10, 8); ctx.closePath(); fillO(C(P.main));
      ctx.fillStyle = `rgba(255,255,255,.35)`; ctx.beginPath(); ctx.ellipse(4, -6, 8, 3, -0.3, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) poly([[2 + k * 7, -10 - k], [6 + k * 7, -24 - k * 2], [9 + k * 7, -8 - k]], C(P.light), true);
      if (ph >= 2) for (let k = 0; k < 4; k++) { const h = 10 + Math.sin(t * 10 + k * 1.7) * 4; ctx.fillStyle = k % 2 ? 'rgba(200,250,255,.9)' : 'rgba(110,200,255,.85)'; ctx.beginPath(); ctx.moveTo(-2 + k * 6, -8); ctx.quadraticCurveTo(k * 6, -8 - h, 3 + k * 6, -8); ctx.fill(); }
      ctx.restore();
    }
    // Arme mit Panzerhandschuhen zum Schwertgriff
    for (const sg of [-1, 1]) { ctx.save(); ctx.translate(sg * 26, -118); ctx.rotate(sg > 0 ? 0.55 : -0.25); rr(-6, 0, 12, 30, 5); fillO(C(P.dark)); ctx.translate(0, 28); ctx.rotate(sg > 0 ? -1.1 : -0.35); rr(-6, 0, 12, 22, 4); fillO(C(P.main)); ctx.restore(); }
    // Großschwert vor ihm
    ctx.save(); ctx.translate(-16, -76); ctx.rotate(Math.PI - 0.08);
    glowDot(0, -46, 50, P.rgb, 0.3);
    poly([[0, -96], [6, -86], [6, 0], [-6, 0], [-6, -86]], C(P.light), true);
    ctx.fillStyle = `rgba(${P.rgb},.95)`; ctx.fillRect(-1.4, -84, 2.8, 80);
    for (let i = 0; i < 5; i++) { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(-3, -76 + i * 15, 6, 2); }
    rr(-20, -4, 40, 7, 3); fillO(C(P.dark)); poly([[-20, -1], [-28, -8], [-24, 2]], C(P.main), true); poly([[20, -1], [28, -8], [24, 2]], C(P.main), true);
    rr(-3.5, 3, 7, 16, 2); fillO(C(P.dark)); glowDot(0, 22, 8, P.rgb, 0.9); ctx.fillStyle = C(P.light); ctx.beginPath(); ctx.arc(0, 22, 3.4, 0, 7); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(-14, -84); rr(-8, -6, 16, 12, 4); fillO(C(P.main)); ctx.restore();
    // Bart aus Licht
    for (let i = 0; i < 7; i++) { const bx = -10 + i * 3.3, sw = Math.sin(t * 2 + i * 0.8) * 3; ctx.strokeStyle = `rgba(${P.rgb},${0.55 + (i % 2) * 0.2})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(bx, -140); ctx.quadraticCurveTo(bx + sw, -128, bx - 2 + sw * 1.4, -112 + (i % 3) * 4); ctx.stroke(); }
    // Helm mit leuchtendem Visier
    ctx.save(); ctx.translate(0, -152);
    const hg2 = ctx.createLinearGradient(0, -18, 0, 16); hg2.addColorStop(0, C(P.light)); hg2.addColorStop(1, C(P.main));
    ctx.beginPath(); ctx.moveTo(-15, 14); ctx.lineTo(-17, -6); ctx.quadraticCurveTo(-15, -20, 0, -22); ctx.quadraticCurveTo(15, -20, 17, -6); ctx.lineTo(15, 14); ctx.lineTo(6, 18); ctx.lineTo(-6, 18); ctx.closePath(); ctx.fillStyle = hg2; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = C(P.dark); ctx.fillRect(-1.5, -20, 3, 12);
    ctx.fillStyle = '#100818'; rr(-13, -4, 26, 5, 2); ctx.fill(); ctx.fillRect(-1.6, -4, 3.2, 16);
    glowDot(-6, -1.5, 9, P.eye, 0.9); glowDot(6, -1.5, 9, P.eye, 0.9);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, -2.5, 7, 2); ctx.fillRect(3, -2.5, 7, 2);
    for (const sg of [-1, 1]) { ctx.save(); ctx.scale(sg, 1); ctx.beginPath(); ctx.moveTo(16, -8); ctx.quadraticCurveTo(30, -14, 34, -30); ctx.quadraticCurveTo(26, -18, 16, -14); ctx.closePath(); fillO(C(P.light)); ctx.restore(); }
    ctx.restore();
    // Schwebende Krone
    ctx.save(); ctx.translate(0, -186 + Math.sin(t * 2) * 2); ctx.rotate(Math.sin(t * 0.9) * 0.05);
    glowDot(0, -4, 34, P.rgb, 0.45 + 0.15 * Math.sin(t * 2.5));
    ctx.beginPath(); ctx.moveTo(-18, 6); ctx.lineTo(-20, -8); ctx.lineTo(-12, -2); ctx.lineTo(-8, -16); ctx.lineTo(-3, -4); ctx.lineTo(0, -20); ctx.lineTo(3, -4); ctx.lineTo(8, -16); ctx.lineTo(12, -2); ctx.lineTo(20, -8); ctx.lineTo(18, 6); ctx.closePath(); fillO(C(P.main));
    ctx.fillStyle = C(P.dark); ctx.fillRect(-18, 2, 36, 4);
    for (const [gx, gy, gc] of [[0, -14, '#e5484d'], [-8, -10, '#4fc3ff'], [8, -10, '#7ee08a'], [0, 4, P.light]]) { ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(gx, gy, 2.2, 0, 7); ctx.fill(); }
    if (ph >= 2) for (let k = 0; k < 5; k++) { const h = 8 + Math.sin(t * 11 + k) * 3; ctx.fillStyle = 'rgba(200,250,255,.9)'; ctx.beginPath(); ctx.moveTo(-14 + k * 7, -6); ctx.quadraticCurveTo(-12 + k * 7, -10 - h, -9 + k * 7, -6); ctx.fill(); }
    ctx.restore();
    ctx.restore();
    swords.filter(s => s.front).forEach(drawS);
    // Glut steigt auf, in Phase 3 auch Risse im Boden
    for (let i = 0; i < 14; i++) { const p = (t * (0.35 + ph * 0.15) + i / 14) % 1; ctx.fillStyle = `rgba(${P.rgb},${(1 - p) * 0.9})`; ctx.fillRect(Math.sin(i * 2.3 + p * 4) * 70, -10 - p * 200, 2, 2); }
    if (ph >= 2) { ctx.strokeStyle = `rgba(150,230,255,${0.6 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-60, 2); ctx.lineTo(-40, -1); ctx.lineTo(-24, 3); ctx.lineTo(-8, 0); ctx.moveTo(10, 2); ctx.lineTo(30, -1); ctx.lineTo(52, 3); ctx.stroke(); }
    if (e.hitT > 0) glowDot(0, -110, 70, '255,255,255', 0.18);
    ctx.restore();
  }

  /* ---------- Halle der Ahnen ---------- */
  function ahnStatue(x, y, s, kind) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = 'rgba(70,50,120,.75)';
    rr(-14, -60, 28, 60, 6); ctx.fill(); ctx.beginPath(); ctx.arc(0, -70, 11, 0, 7); ctx.fill();
    if (kind === 0) { ctx.fillRect(14, -96, 5, 70); ctx.fillRect(8, -34, 17, 4); }
    if (kind === 1) { rr(-30, -54, 20, 34, 6); ctx.fill(); }
    if (kind === 2) { ctx.strokeStyle = 'rgba(70,50,120,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(18, -50, 22, -1.2, 1.2); ctx.stroke(); }
    if (kind === 3) { ctx.fillRect(16, -100, 4, 100); ctx.beginPath(); ctx.arc(18, -104, 6, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,210,122,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -70, 11, Math.PI, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-14, -56); ctx.lineTo(-14, -4); ctx.stroke();
    ctx.restore();
  }
  const ENV_AHNEN = {
    back(t, sc) {
      skyFill(['#0a0820', '#2a1a5a', '#6a3a7a', '#e0a060']);
      stars(t, 70, 150, 0.9, 77);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) { ctx.beginPath(); for (let x = 0; x <= W; x += 8) { const y = 40 + b * 18 + Math.sin(x * 0.012 + t * 0.4 + b) * 14 + Math.sin(x * 0.03 + t * 0.7) * 5; ctx[x ? 'lineTo' : 'moveTo'](x, y); }
        for (let x = W; x >= 0; x -= 8) { const y = 40 + b * 18 + 22 + Math.sin(x * 0.012 + t * 0.4 + b + 0.4) * 14; ctx.lineTo(x, y); } ctx.closePath();
        ctx.fillStyle = vg([`rgba(${b === 1 ? '255,210,122' : '120,230,190'},0)`, `rgba(${b === 1 ? '255,210,122' : '120,230,190'},.14)`, 'rgba(0,0,0,0)'], 30 + b * 18, 100 + b * 18); ctx.fill(); }
      ctx.restore();
      disc(240, 150, 30, '#fff3d0', '255,210,140', 0.6);
      each(sc, 0.05, 150, (x, k) => ahnStatue(x, 176, 0.9 + hash(k) * 0.2, k % 4), 0, 171);
      ridge(sc, 0.1, 176, 18, 0.02, '#2a1a4a', { seed: 8 });
      each(sc, 0.12, 210, (x, k) => { ctx.fillStyle = 'rgba(40,24,70,.9)'; ctx.beginPath(); ctx.moveTo(x - 30, 120 + hash(k) * 20); ctx.lineTo(x + 30, 120 + hash(k) * 20); ctx.lineTo(x + 10, 146 + hash(k) * 20); ctx.lineTo(x - 14, 150 + hash(k) * 20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,210,122,.25)'; ctx.fillRect(x - 30, 119 + hash(k) * 20, 60, 2); }, 0.2, 172);
      fog(t, 170, 30, '200,170,255', 0.18, 6, 5, 3);
      each(sc, 0.35, 92, (x, k) => { pillar(x, 210, 1.05, '#3a2a5a', '#22183a', false, '#d8a84a', hash(k)); const fy = 128; ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x - 7, fy, 14, 6); flame(x, fy, 1.3, t, k, '#7ac8ff', '#e8f8ff', '120,200,255'); lightPool(x, fy, 70, '120,200,255', 0.16); }, 0.3, 173);
      groundBase('#3a2a52', '#241a38', '#0e0a18', '#d8a84a', sc, { speck: 'rgba(0,0,0,.25)', hi: 'rgba(255,210,122,.25)' });
      tiles(sc, 'rgba(255,210,122,.22)', 9, 30);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg(['rgba(255,210,122,.18)', 'rgba(255,210,122,0)'], GROUND, H); ctx.fillRect(0, GROUND, W, H - GROUND); ctx.restore();
    },
    props(t, sc) {
      each(sc, 1, 160, (x, k) => { ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x - 1.5, GROUND - 74, 3, 74);
        const sw = Math.sin(t * 1.2 + k) * 2; ctx.beginPath(); ctx.moveTo(x + 1, GROUND - 72); ctx.lineTo(x + 24 + sw, GROUND - 70); ctx.lineTo(x + 22 + sw * 1.5, GROUND - 34); ctx.lineTo(x + 13 + sw, GROUND - 40); ctx.lineTo(x + 3 + sw * 0.5, GROUND - 34); ctx.closePath(); fillO('#5a2a8a');
        ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x + 12 + sw, GROUND - 56, 4, 0, 7); ctx.fill(); ctx.fillRect(x + 1, GROUND - 74, 24, 3); }, 0.25, 174);
    },
    front(t) {
      parts(t, 16, { type: 'glow', rgb: '255,215,140', vx: 3, vy: -10, wob: 1, wa: 10, size: 1.4, tw: 2, alpha: 0.85, seed: 41 });
      grade('#ffcf7a', 0.12); vignette(0.35, '20,6,40');
    },
  };
  function ahnEnv(R) { const M = AHN_MISSIONS[R.ahn.mi]; return M.env === 'ahnen' ? ENV_AHNEN : ENV[M.env % ENV.length]; }

  /* ---------- Effekte auf Helden und Bildschirm ---------- */
  function ahnWorld(R, t) {
    const A = R.ahn;
    for (const f of A.fx) {
      const p = 1 - Math.max(0, f.t) / f.d;
      if (f.kind === 'slam' && f.t > 0) { const x0 = R.pos[R.order[R.order.length - 1]] - 30, x1 = R.frontX + 30; ctx.save(); ctx.fillStyle = `rgba(255,60,40,${0.12 + 0.25 * p})`; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, GROUND + 3, (x1 - x0) / 2 + 10, 10, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(255,120,90,${0.5 + 0.5 * Math.sin(t * 20)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, GROUND + 3, ((x1 - x0) / 2 + 10) * p, 10 * p, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      if (f.kind === 'bomb' && f.t > 0 && R.h[f.k] && R.h[f.k].alive) { const x = R.pos[f.k], y = GROUND - 112 - Math.abs(Math.sin(t * 6)) * 4;
        glowDot(x, y, 14, '255,90,40', 0.35 + 0.3 * p); ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.fillStyle = Math.sin(t * 30) > 0 ? '#ffd23f' : '#ff5a2a'; ctx.fillRect(x + 3, y - 11, 2.5, 4);
        ctx.font = '11px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(Math.ceil(f.t), x, y + 4); }
      if (f.kind === 'burn' && f.t > 0) { const x0 = R.pos[R.order[R.order.length - 1]] - 26, x1 = R.frontX + 26; for (let i = 0; i < 12; i++) { const x = x0 + (x1 - x0) * i / 11, h = 12 + Math.sin(t * 10 + i * 1.7) * 6; ctx.fillStyle = ['#ff5a2a', '#ffb547', '#ffd23f'][i % 3]; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x - 5, GROUND + 4); ctx.quadraticCurveTo(x - 2, GROUND - h, x + 4, GROUND + 4); ctx.fill(); } ctx.globalAlpha = 1; lightPool((x0 + x1) / 2, GROUND, 90, '255,120,40', 0.2); }
      if (f.kind === 'poison' && f.t > 0) { ctx.fillStyle = 'rgba(120,200,80,.12)'; ctx.fillRect(0, GROUND - 120, R.frontX + 40, 124); }
      if (f.kind === 'chain' && f.t > 0) { ctx.strokeStyle = `rgba(200,230,255,${1 - p})`; ctx.lineWidth = 2.5; ctx.beginPath(); let px = A.boss ? A.boss.x : 400, py = GROUND - 90; ctx.moveTo(px, py);
        for (const k of f.ks) { const x = R.pos[k], y = GROUND - 50; for (let j = 1; j <= 3; j++) ctx.lineTo(px + (x - px) * j / 3 + (Math.random() - 0.5) * 12, py + (y - py) * j / 3 + (Math.random() - 0.5) * 12); px = x; py = y; } ctx.stroke(); }
      if (f.kind === 'drain' && f.t > 0 && A.boss) { const x = R.pos[f.k]; ctx.strokeStyle = `rgba(220,40,70,${1 - p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, GROUND - 50); ctx.quadraticCurveTo((x + A.boss.x) / 2, GROUND - 120, A.boss.x, GROUND - 80); ctx.stroke(); }
      if (f.kind === 'quake' && f.t > 0) for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(160,130,100,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.arc(30 + i * 30, GROUND - p * 20, 6 + p * 10, 0, 7); ctx.fill(); }
    }
    for (const k of R.order) {
      const h = R.h[k]; if (!h.alive) continue; const x = R.pos[k], top = GROUND - (k === 'w' ? 104 : 96);
      if (h.stunT > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffe58a'; sparkle(x + Math.cos(a) * 11, top - 6 + Math.sin(a) * 3, 3, 1); }
      if (h.markT > 0) { glowDot(x, top - 14, 10, '255,40,60', 0.6); ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('☠', x, top - 9); }
      if (h.dotT > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(155,227,107,.8)'; ctx.beginPath(); ctx.arc(x - 6 + i * 6, GROUND - 30 - ((t * 30 + i * 9) % 30), 2.5, 0, 7); ctx.fill(); }
      if (R.curseT > 0) for (let i = 0; i < 2; i++) { const p = (t * 0.8 + i / 2 + k.charCodeAt(0) * 0.1) % 1; ctx.fillStyle = `rgba(180,80,255,${1 - p})`; ctx.fillRect(x - 8 + i * 14, GROUND - 20 - p * 50, 2, 2); }
      if (R.slowT > 0) { ctx.fillStyle = 'rgba(190,235,255,.22)'; ctx.beginPath(); ctx.ellipse(x, GROUND - 40, 16, 44, 0, 0, 7); ctx.fill(); }
    }
  }
  function ahnScreen(R, t) {
    const A = R.ahn;
    if (R.blindT > 0) { const g = ctx.createRadialGradient(R.frontX, GROUND - 50, 40, R.frontX, GROUND - 50, 260); g.addColorStop(0, 'rgba(5,0,15,0)'); g.addColorStop(1, `rgba(5,0,15,${Math.min(0.75, R.blindT)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (R.slowT > 0) { ctx.fillStyle = `rgba(190,235,255,${Math.min(0.12, R.slowT * 0.05)})`; ctx.fillRect(0, 0, W, H); }
    if (R.silT > 0) { ctx.strokeStyle = `rgba(200,160,255,${R.silT * 0.5})`; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6); }
    // Auftritt des Urahns
    if (R.introT > 0) {
      const T = 3.4 - R.introT, a = Math.min(1, T * 2, R.introT * 2);
      ctx.fillStyle = `rgba(8,4,20,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
      const bx = A.boss ? A.boss.x : 400, beam = Math.min(1, T / 0.8);
      const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, `rgba(255,236,170,${0.6 * a})`); g.addColorStop(1, `rgba(255,236,170,${0.15 * a})`); ctx.fillStyle = g; ctx.fillRect(bx - 30 * beam, 0, 60 * beam, GROUND);
      ctx.save(); ctx.globalAlpha = Math.min(1, Math.max(0, (T - 0.6) * 2)) * a; ctx.textAlign = 'center';
      ctx.font = '30px "Bungee","Arial Black",sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.strokeText('DER URAHN', W / 2, 92); const tg = ctx.createLinearGradient(0, 70, 0, 96); tg.addColorStop(0, '#fff6d8'); tg.addColorStop(1, '#ffb547'); ctx.fillStyle = tg; ctx.fillText('DER URAHN', W / 2, 92);
      ctx.font = 'italic 12px "Figtree",sans-serif'; ctx.fillStyle = '#f4e8ff'; ctx.fillText('„Zeigt mir, dass ihr meiner würdig seid.“', W / 2, 114); ctx.restore();
    }
    // Banner bei Boss-Auftritt und Phasenwechsel
    if (A.banner && !(R.introT > 0)) {
      const b = A.banner, dur = b.phase ? 2.4 : b.ahne ? 5 : 3.2, a = Math.max(0, Math.min(1, b.t * 2, (dur - b.t) * 4)), y = b.phase ? 84 : 90;
      ctx.save(); ctx.globalAlpha = a;
      const bg = ctx.createLinearGradient(0, y - 30, 0, y + 22); bg.addColorStop(0, 'rgba(25,10,40,0)'); bg.addColorStop(0.3, 'rgba(25,10,40,.82)'); bg.addColorStop(0.7, 'rgba(25,10,40,.82)'); bg.addColorStop(1, 'rgba(25,10,40,0)');
      ctx.fillStyle = bg; ctx.fillRect(0, y - 30, W, 52); ctx.fillStyle = b.phase ? '#ff7a5a' : '#ffd27a'; ctx.fillRect(W / 2 - 120 * a, y - 22, 240 * a, 1.5); ctx.fillRect(W / 2 - 120 * a, y + 14, 240 * a, 1.5);
      ctx.textAlign = 'center'; ctx.font = `${b.phase ? 20 : 19}px "Bungee","Arial Black",sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(b.title, W / 2 + (1 - a) * 30, y); ctx.fillStyle = b.phase ? '#ffb09a' : '#fff2c8'; ctx.fillText(b.title, W / 2 + (1 - a) * 30, y);
      ctx.font = `${b.phase ? '600 11px' : 'italic 11px'} "Figtree",sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillText(b.phase ? b.sub : `„${b.sub}“`, W / 2, y + 12 - 1);
      ctx.restore();
    }
  }
  function ahnHud(R, t) {
    const A = R.ahn, M = AHN_MISSIONS[A.mi], list = ahnBossesOf(A.mi), e = A.boss && A.boss.hp > 0 ? A.boss : null;
    ctx.font = '13px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd27a'; ctx.fillText(`Mission ${A.mi + 1}`, 12, 20);
    ctx.font = '600 11px "Figtree",sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(M.name, 98, 19);
    ctx.textAlign = 'right'; ctx.fillStyle = '#e8dcff';
    ctx.fillText(`Boss ${Math.min(A.bi + 1, list.length)}/${list.length}${A.wave < AHN_TUNE.waves ? ` · Diener ${A.wave + 1}/${AHN_TUNE.waves}` : ''}`, W - 12, 19);
    // Fortschritts-Punkte der Bosse
    for (let i = 0; i < list.length; i++) { const x = W - 12 - (list.length - 1 - i) * 11, y = 28; ctx.fillStyle = i < A.bi ? '#4fc3ff' : i === A.bi ? '#ffd27a' : 'rgba(255,255,255,.25)'; ctx.beginPath(); list[i].ahne ? (ctx.moveTo(x - 4, y + 2), ctx.lineTo(x - 4, y - 3), ctx.lineTo(x - 2, y), ctx.lineTo(x, y - 4), ctx.lineTo(x + 2, y), ctx.lineTo(x + 4, y - 3), ctx.lineTo(x + 4, y + 2), ctx.closePath()) : ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    if (!e || e.x > 520) return;
    const d = e.ahn, bw = 250, bx = W / 2 - bw / 2, by = H - 26, col = d.ahne ? '#ffd27a' : d.tint || '#c9a6ff';
    const pg = ctx.createLinearGradient(0, by - 22, 0, H); pg.addColorStop(0, 'rgba(10,6,18,0)'); pg.addColorStop(0.5, 'rgba(10,6,18,.55)'); pg.addColorStop(1, 'rgba(10,6,18,.8)'); ctx.fillStyle = pg; ctx.fillRect(0, by - 22, W, H - by + 22);
    ctx.textAlign = 'center'; ctx.font = `${d.ahne ? 13 : 12}px "Bungee","Arial Black",sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(d.name, W / 2, by - 4); ctx.fillStyle = d.ahne ? '#fff2c8' : '#fff'; ctx.fillText(d.name, W / 2, by - 4);
    ctx.fillStyle = 'rgba(10,6,18,.85)'; rr(bx - 2, by, bw + 4, 10, 4); ctx.fill();
    const f = Math.max(0, e.hp / e.max), g = ctx.createLinearGradient(0, by, 0, by + 8); g.addColorStop(0, '#fff'); g.addColorStop(0.25, col); g.addColorStop(1, e.phase >= 2 ? '#c03030' : '#5a2a8a');
    ctx.fillStyle = g; rr(bx, by + 1, bw * f, 8, 3); ctx.fill();
    if (e.shieldHp > 0) { ctx.fillStyle = 'rgba(160,215,255,.85)'; rr(bx, by + 1, Math.min(bw, bw * e.shieldHp / e.max * 3), 3, 1.5); ctx.fill(); }
    ctx.fillStyle = 'rgba(10,6,18,.9)'; for (const q of [1 / 3, 2 / 3]) ctx.fillRect(bx + bw * q - 1, by, 2, 10);
    for (let i = 0; i < 3; i++) { const x = bx + bw + 14 + i * 11, y = by + 5; ctx.fillStyle = i < e.phase ? 'rgba(255,255,255,.3)' : i === e.phase ? (e.phase >= 2 ? '#ff7a5a' : col) : 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill(); }
    if (e.enrage > 1) { ctx.font = '10px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#ff6a5a'; ctx.textAlign = 'right'; ctx.fillText(`WUT ×${e.enrage.toFixed(1).replace('.', ',')}`, bx - 8, by + 9); }
  }

  /* ---------- Eigene Drachen der Ahnenprüfung ---------- */
  const DRAKE = {
    bone: { body: '#ece4d0', dark: '#8a8070', belly: '#cfc6ae', mem: 'rgba(90,60,130,.55)', eye: '200,140,255', br: '180,120,255' },
    frost: { body: '#eef8ff', dark: '#7aa8c8', belly: '#c4e6fa', mem: 'rgba(170,225,255,.5)', eye: '120,220,255', br: '190,235,255' },
    thorn: { body: '#4a8a40', dark: '#1f4a24', belly: '#b8e090', mem: '#5a9a44', eye: '255,120,170', br: '255,150,190' },
    hydra: { body: '#3f9070', dark: '#1d5a44', belly: '#a8d8a8', mem: null, eye: '255,230,90', br: '150,230,90' },
  };
  function drakeWing(P, kind, front, flap, t) {
    ctx.save(); ctx.rotate((front ? -0.15 : -0.45) + (front ? -flap : flap * 0.8)); if (!front) ctx.scale(0.85, 0.85);
    const tips = [[-46, -64], [-62, -44], [-66, -20], [-54, 0]];
    if (kind === 'thorn') {
      for (let i = 0; i < 4; i++) { const [x, y] = tips[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(x * 0.5 - 10, y * 0.5 - 14, x, y); ctx.quadraticCurveTo(x * 0.6 + 8, y * 0.6 + 6, 0, 0); fillO(i % 2 ? P.mem : '#3a7a34'); ctx.strokeStyle = 'rgba(200,240,160,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x * 0.92, y * 0.92); ctx.stroke(); }
      ctx.restore(); return;
    }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -52); ctx.lineTo(tips[0][0], tips[0][1]);
    for (let i = 1; i < 4; i++) { const [x0, y0] = tips[i - 1], [x1, y1] = tips[i]; ctx.quadraticCurveTo((x0 + x1) / 2 + 12, (y0 + y1) / 2 + 2, x1, y1); }
    ctx.quadraticCurveTo(-24, 0, 0, 8); ctx.closePath();
    ctx.fillStyle = P.mem; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = OUT; ctx.stroke();
    if (kind === 'bone') { ctx.fillStyle = 'rgba(10,6,20,.85)'; for (const [hx, hy, r] of [[-38, -40, 5], [-50, -18, 4], [-30, -16, 3]]) { ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.fill(); } }
    if (kind === 'frost') { ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 - i * 10, -30 + i * 6); ctx.lineTo(-20 - i * 10, -40 + i * 6); ctx.lineTo(-24 - i * 10, -28 + i * 6); ctx.fill(); } }
    ctx.strokeStyle = kind === 'bone' ? P.body : P.dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -52); for (const [x, y] of tips) { ctx.moveTo(-20, -52); ctx.lineTo(x, y); } ctx.stroke();
    ctx.restore();
  }
  function drakeHead(P, kind, open, t, k = 0) {
    // Kopf schaut nach links, (0,0) = Ansatz am Hals
    const eye = P.eye;
    if (kind === 'bone') {
      ctx.save(); ctx.translate(-10, 6); ctx.rotate(-open * 0.5);
      poly([[0, 0], [-26, 2], [-30, 6], [-4, 8]], P.body, true); for (let i = 0; i < 5; i++) poly([[-6 - i * 5, 2], [-8 - i * 5, -2], [-10 - i * 5, 2]], '#fff', false);
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(6, 4); ctx.quadraticCurveTo(8, -16, -8, -18); ctx.quadraticCurveTo(-24, -16, -34, -6); ctx.lineTo(-36, 2); ctx.lineTo(-8, 6); ctx.closePath(); fillO(P.body);
      for (let i = 0; i < 5; i++) poly([[-12 - i * 5, 6], [-14 - i * 5, 11], [-16 - i * 5, 6]], '#fff', false);
      ctx.fillStyle = '#140a20'; ctx.beginPath(); ctx.ellipse(-10, -8, 6, 5, -0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-30, -4, 2, 1.4, 0, 0, 7); ctx.fill();
      glowDot(-10, -8, 9, eye, 0.9); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-10, -8, 1.6, 0, 7); ctx.fill();
      for (const sg of [0, 1]) poly([[2 - sg * 6, -14], [14 - sg * 4, -30 - sg * 4], [8 - sg * 6, -12]], P.dark, true);
      ctx.strokeStyle = 'rgba(80,60,40,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(0, -6); ctx.lineTo(-4, 2); ctx.stroke();
      return;
    }
    if (kind === 'frost') {
      ctx.save(); ctx.translate(-8, 4); ctx.rotate(-open * 0.45); poly([[0, 0], [-34, 3], [-30, 8], [-2, 8]], P.belly, true); ctx.restore();
      ctx.beginPath(); ctx.moveTo(6, 6); ctx.quadraticCurveTo(10, -14, -6, -16); ctx.quadraticCurveTo(-28, -12, -40, -2); ctx.lineTo(-38, 4); ctx.lineTo(-6, 6); ctx.closePath(); fillO(P.body);
      ctx.fillStyle = 'rgba(122,168,200,.35)'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.quadraticCurveTo(-26, -10, -38, -2); ctx.lineTo(-30, -4); ctx.quadraticCurveTo(-18, -10, -6, -10); ctx.fill();
      for (const [x, y, l, a] of [[0, -14, 26, -0.5], [-4, -15, 22, -0.75], [4, -10, 20, -0.2], [-10, -14, 14, -1]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); poly([[0, -3], [l, 0], [0, 3]], '#bfeaff', true); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(2, -1, l * 0.6, 1); ctx.restore(); }
      for (let i = 0; i < 3; i++) poly([[-14 - i * 6, 6], [-16 - i * 6, 14 + i], [-18 - i * 6, 6]], '#dff4ff', true);
      glowDot(-16, -6, 8, eye, 0.85); ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.ellipse(-16, -6, 3.2, 1.6, -0.2, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) { const p = (t * 0.7 + i / 3) % 1; ctx.fillStyle = `rgba(220,245,255,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.arc(-40 - p * 14, -4 - p * 8 + Math.sin(t * 3 + i) * 2, 2 + p * 4, 0, 7); ctx.fill(); }
      return;
    }
    if (kind === 'thorn') {
      ctx.save(); ctx.translate(-8, 4); ctx.rotate(-open * 0.5); poly([[0, 0], [-28, 4], [-24, 9], [0, 8]], P.dark, true); ctx.restore();
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(4, -6); ctx.rotate(-1.6 + i * 0.5); poly([[0, -4], [16, 0], [0, 4]], i % 2 ? '#5aa84a' : '#7ac860', true); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(4, -12); ctx.lineTo(-10, -16); ctx.lineTo(-30, -8); ctx.lineTo(-34, 2); ctx.lineTo(-6, 7); ctx.closePath(); fillO(P.body);
      for (let i = 0; i < 6; i++) poly([[-6 - i * 4, -12 + i * 1.4], [-4 - i * 4, -22 + i * 1.6], [-2 - i * 4, -12 + i * 1.4]], '#2a3a1a', true);
      ctx.fillStyle = '#ff6b9a'; ctx.beginPath(); ctx.arc(-2, -18, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#ffb0c8'; ctx.beginPath(); ctx.arc(-2, -18, 1.8, 0, 7); ctx.fill();
      for (let i = 0; i < 4; i++) poly([[-12 - i * 5, 6], [-14 - i * 5, 10], [-16 - i * 5, 6]], '#f4f0d8', false);
      glowDot(-14, -6, 7, eye, 0.9); ctx.fillStyle = '#fff0f4'; poly([[-18, -6], [-11, -8], [-12, -4]], '#fff0f4');
      return;
    }
    // Hydra-Kopf
    ctx.save(); ctx.translate(-6, 4); ctx.rotate(-open * 0.55); poly([[0, 0], [-22, 3], [-18, 7], [0, 6]], P.dark, true); ctx.restore();
    ctx.beginPath(); ctx.moveTo(5, 5); ctx.quadraticCurveTo(6, -10, -6, -11); ctx.quadraticCurveTo(-20, -8, -26, 0); ctx.lineTo(-6, 5); ctx.closePath(); fillO(P.body);
    poly([[2, -8], [12, -18 + Math.sin(t * 4 + k) * 2], [8, -4]], '#7ad0a0', true);
    glowDot(-10, -4, 6, eye, 0.9); ctx.fillStyle = '#1b1726'; ctx.fillRect(-11, -5.5, 2, 3);
    const dp = (t * 0.8 + k * 0.3) % 1; ctx.fillStyle = `rgba(150,230,90,${1 - dp})`; ctx.beginPath(); ctx.ellipse(-20, 6 + dp * 18, 1.6, 2.4, 0, 0, 7); ctx.fill();
  }
  function drakeBreath(P, kind, x, y, a, t) {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const len = 150 * a;
    const g = ctx.createLinearGradient(x, y, x - len, y + 30); g.addColorStop(0, `rgba(${P.br},${0.7 * a})`); g.addColorStop(1, `rgba(${P.br},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x - len, y + 30 - 26 * a); ctx.lineTo(x - len, y + 30 + 26 * a); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 14; i++) { const p = (t * 1.6 + i / 14) % 1, px = x - p * len, py = y + p * 30 + Math.sin(i * 2.7 + t * 9) * 16 * p;
      if (kind === 'frost') { ctx.fillStyle = `rgba(255,255,255,${1 - p})`; sparkle(px, py, 3, 1 - p); }
      else if (kind === 'thorn') { ctx.save(); ctx.translate(px, py); ctx.rotate(i + t * 6); ctx.fillStyle = i % 2 ? `rgba(255,140,190,${1 - p})` : `rgba(90,160,60,${1 - p})`; ctx.beginPath(); ctx.ellipse(0, 0, 4, 1.6, 0, 0, 7); ctx.fill(); ctx.restore(); }
      else { glowDot(px, py, 6 + p * 6, P.br, (1 - p) * 0.8); } }
    ctx.restore();
  }
  function drawDragon(e, t, kind) {
    const P = DRAKE[kind], ph = t + e.bob, flap = Math.sin(ph * 3) * 0.25, br = Math.sin(ph * 1.6) * 2;
    const ca = e.castT > 0 ? Math.sin((1 - e.castT / 0.8) * Math.PI) : 0, lx = -ca * 12;
    const open = Math.max(ca, kind === 'bone' ? Math.max(0, Math.sin(ph * 5)) * 0.25 : 0.05 + Math.max(0, Math.sin(ph * 1.2)) * 0.12);
    // Schwanz
    const tw = Math.sin(ph * 1.8) * 8;
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(24, -26); ctx.quadraticCurveTo(58, -18 + tw * 0.4, 84, -8 + tw); ctx.stroke();
    ctx.strokeStyle = kind === 'bone' ? P.dark : P.body; ctx.lineWidth = 11; ctx.stroke();
    if (kind === 'bone') { ctx.strokeStyle = P.body; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
    ctx.save(); ctx.translate(84, -8 + tw);
    if (kind === 'frost') poly([[0, -8], [16, 0], [0, 8], [4, 0]], '#bfeaff', true);
    else if (kind === 'thorn') { ctx.fillStyle = '#ff6b9a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.26) * 4, Math.sin(i * 1.26) * 4, 3.4, 0, 7); ctx.fill(); } ctx.fillStyle = '#ffd0e0'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, 7); ctx.fill(); }
    else if (kind === 'bone') poly([[0, -5], [14, 0], [0, 5]], P.body, true);
    else poly([[0, -2], [12, -10], [8, 2], [12, 10], [0, 4]], '#7ad0a0', true);
    ctx.restore();
    // hinterer Flügel
    if (P.mem) { ctx.save(); ctx.translate(12, -70); drakeWing(P, kind, false, flap, t); ctx.restore(); }
    // Beine hinten
    for (const lx2 of [6, 20]) { ctx.save(); ctx.translate(lx2, -30); rr(-7, 0, 14, 30, 6); fillO(lx2 === 6 ? P.dark : P.body); poly([[-8, 30], [-10, 34], [-4, 30]], '#f4f0e0'); poly([[-2, 30], [-4, 34], [2, 30]], '#f4f0e0'); ctx.restore(); }
    // Körper
    ctx.save(); ctx.translate(4, -48 - br);
    const bg = ctx.createLinearGradient(0, -28, 0, 28); bg.addColorStop(0, P.body); bg.addColorStop(1, P.dark);
    ctx.beginPath(); ctx.ellipse(0, 0, 36, 28, 0, 0, 7);
    if (kind === 'bone') { ctx.fillStyle = 'rgba(30,16,46,.92)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke(); glowDot(-2, 2, 22, P.eye, 0.35 + 0.15 * Math.sin(ph * 3));
      ctx.strokeStyle = P.body; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const x = -22 + i * 9; ctx.beginPath(); ctx.moveTo(x, -22 + Math.abs(i - 2.5) * 2); ctx.quadraticCurveTo(x - 8, 2, x - 2, 20 - Math.abs(i - 2.5) * 2); ctx.stroke(); }
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, -18); ctx.quadraticCurveTo(0, -30, 32, -14); ctx.stroke(); }
    else { ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.fillStyle = P.belly; ctx.beginPath(); ctx.ellipse(-10, 6, 18, 18, 0.2, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-26, -6 + i * 6); ctx.lineTo(4, -4 + i * 6); ctx.stroke(); } }
    for (let i = 0; i < 6; i++) { const x = -20 + i * 9, y = -26 + Math.abs(i - 2) * 1.5;
      if (kind === 'frost') poly([[x - 3, y + 3], [x + 1, y - 12 - (i % 2) * 4], [x + 4, y + 3]], '#bfeaff', true);
      else if (kind === 'thorn') poly([[x - 2, y + 2], [x + 3, y - 10], [x + 4, y + 3]], '#2a3a1a', true);
      else if (kind === 'bone') { ctx.fillStyle = P.body; ctx.beginPath(); ctx.arc(x, y - 2, 3, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = '#7ad0a0'; ctx.beginPath(); ctx.ellipse(x, y - 1, 3, 5, 0.4, 0, 7); ctx.fill(); } }
    if (kind === 'thorn') { ctx.strokeStyle = '#2a5a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 10); ctx.bezierCurveTo(-10, -12, 10, 24, 30, -2); ctx.stroke(); for (const [rx, ry] of [[-14, 0], [12, 8]]) { ctx.fillStyle = '#ff6b9a'; ctx.beginPath(); ctx.arc(rx, ry, 3.6, 0, 7); ctx.fill(); } }
    if (kind === 'hydra') for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(90,140,60,.7)'; ctx.beginPath(); ctx.ellipse(-20 + i * 12, -18 + (i % 2) * 6, 6, 2.4, 0.3, 0, 7); ctx.fill(); }
    ctx.restore();
    // Vorderbein
    ctx.save(); ctx.translate(-22, -34); rr(-6, 0, 12, 34, 5); fillO(P.body); poly([[-7, 34], [-11, 38], [-3, 34]], '#f4f0e0'); poly([[-1, 34], [-4, 38], [3, 34]], '#f4f0e0'); ctx.restore();
    // Hälse und Köpfe
    const heads = kind === 'hydra' ? [[-36, -104, 0], [-12, -124, 1.7], [-58, -84, 3.1]] : [[-34, -108, 0]];
    for (const [hx0, hy0, k] of heads) {
      const sw = kind === 'hydra' ? Math.sin(ph * 1.7 + k) * 6 : Math.sin(ph * 1.2) * 3;
      const hx = hx0 + lx + sw, hy = hy0 - br + (kind === 'hydra' ? Math.cos(ph * 1.3 + k) * 4 : 0);
      ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = kind === 'hydra' ? 12 : 15; ctx.beginPath(); ctx.moveTo(-8, -60 - br); ctx.quadraticCurveTo(hx + 16, (hy - 60) / 2 - 10, hx + 6, hy + 2); ctx.stroke();
      ctx.strokeStyle = kind === 'bone' ? P.dark : P.body; ctx.lineWidth = kind === 'hydra' ? 9 : 12; ctx.stroke();
      if (kind === 'bone') { ctx.strokeStyle = P.body; ctx.lineWidth = 4; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
      else { ctx.strokeStyle = P.belly; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -58 - br); ctx.quadraticCurveTo(hx + 10, (hy - 60) / 2 - 6, hx + 2, hy + 6); ctx.stroke(); }
      ctx.save(); ctx.translate(hx, hy); drakeHead(P, kind, open, ph, k); ctx.restore();
      drakeBreath(P, kind, hx - 34, hy + 4, kind === 'hydra' ? ca * 0.7 : ca, ph);
    }
    // vorderer Flügel
    if (P.mem) { ctx.save(); ctx.translate(-4, -74 - br); drakeWing(P, kind, true, flap, t); ctx.restore(); }
    // Umgebungsteilchen
    for (let i = 0; i < 6; i++) { const p = (ph * 0.4 + i / 6) % 1, x = Math.sin(i * 2.1) * 50, y = -10 - p * 130;
      if (kind === 'bone') glowDot(x, y, 4, P.eye, 0.6 * (1 - p)); else if (kind === 'frost') { ctx.fillStyle = `rgba(255,255,255,${1 - p})`; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); }
      else if (kind === 'thorn') { ctx.fillStyle = `rgba(255,140,190,${1 - p})`; ctx.beginPath(); ctx.ellipse(x, -140 + p * 140, 3, 1.4, i, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = `rgba(150,220,120,${0.5 * (1 - p)})`; ctx.beginPath(); ctx.arc(x, -4 - p * 30, 3 + p * 4, 0, 7); ctx.fill(); } }
  }

  // Neue Klassen
  // Helden aus den Expeditionen
  function druid(x, h, t, walk) {
    const step = walk ? Math.sin(t * 10) : 0, bob = walk ? Math.abs(Math.sin(t * 10)) * 2 : Math.sin(t * 1.8) * 0.6;
    shadow(x, 15);
    ctx.save(); ctx.translate(x, GROUND - bob);
    if (h && !h.alive) { const f = h.fall == null ? 1 : h.fall; ctx.rotate(-1.4 * f); ctx.translate(-12 * f, 8 * f); }
    const wind = Math.sin(t * 2.4) * 3, sw = h ? h.swing : 0;
    // Umhang hinten
    ctx.beginPath(); ctx.moveTo(-4, -50); ctx.quadraticCurveTo(-24 - wind, -30, -20 - wind * 1.5, -2); ctx.lineTo(-8, -4); ctx.closePath(); fillO('#24502e');
    // Stiefel
    ctx.fillStyle = '#5a3d25'; rr(-8 + step * 3, -8, 7, 8, 2); ctx.fill(); rr(1 - step * 3, -8, 7, 8, 2); ctx.fill();
    // Kleid mit Blattsaum
    const g = ctx.createLinearGradient(0, -50, 0, -6); g.addColorStop(0, '#5fae48'); g.addColorStop(1, '#2f7a3f');
    ctx.beginPath(); ctx.moveTo(-8, -50); ctx.lineTo(8, -50); ctx.lineTo(13, -8);
    for (let i = 0; i < 6; i++) ctx.quadraticCurveTo(13 - i * 4.4 - 2.2, -2, 13 - (i + 1) * 4.4, -8);
    ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = '#9bd14a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(-9 + i * 4.5, -9, 2.4, 1.3, 0.6, 0, 7); ctx.fill(); }
    // Rankengürtel mit Blüte
    ctx.strokeStyle = '#7ec85a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -32); ctx.quadraticCurveTo(0, -28, 10, -32); ctx.stroke();
    ctx.fillStyle = '#ff8ac8'; ctx.beginPath(); ctx.arc(3, -30, 2.4, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(3, -30, 1, 0, 7); ctx.fill();
    // Haare hinten
    ctx.fillStyle = '#b5562f'; ctx.beginPath(); ctx.moveTo(-6, -64); ctx.quadraticCurveTo(-16 - wind, -50, -12 - wind, -36); ctx.quadraticCurveTo(-6, -44, -2, -52); ctx.closePath(); ctx.fill();
    // Kopf
    ctx.beginPath(); ctx.arc(1, -59, 8.5, 0, 7); fillO('#ecc09a');
    ctx.fillStyle = '#b5562f'; ctx.beginPath(); ctx.arc(0, -61, 9, Math.PI * 0.95, Math.PI * 1.9); ctx.quadraticCurveTo(8, -60, 5, -56); ctx.quadraticCurveTo(2, -63, -8, -58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f7a3f'; ctx.fillRect(4, -60, 2, 2.2);
    ctx.strokeStyle = '#a0603a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(4, -55.5, 2, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,150,.35)'; ctx.beginPath(); ctx.arc(6, -57, 1.8, 0, 7); ctx.fill();
    // Blütenkranz
    ctx.fillStyle = '#5fae48'; for (const [lx, ly, a] of [[-8, -64, -0.6], [9, -65, 0.6]]) { ctx.beginPath(); ctx.ellipse(lx, ly, 3.5, 1.6, a, 0, 7); ctx.fill(); }
    for (const [fx, fy, c] of [[-5, -67, '#ffffff'], [-1, -69, '#ff8ac8'], [3, -69, '#ffd23f'], [7, -67, '#ffffff']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(fx, fy, 2, 0, 7); ctx.fill(); }
    // Arm und Stab
    ctx.save(); ctx.translate(9, -2); ctx.rotate(sw > 0 ? 0.15 + (1 - sw) * 0.5 - 0.45 : 0.05);
    ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(3, -40, 0, -74); ctx.stroke();
    ctx.strokeStyle = '#7ec85a'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 8; i++) ctx.lineTo(Math.sin(i * 1.3) * 3, -16 - i * 7); ctx.stroke();
    ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -72); ctx.quadraticCurveTo(-8, -80, -5, -88); ctx.moveTo(0, -72); ctx.quadraticCurveTo(8, -80, 5, -88); ctx.stroke();
    const glow = 0.65 + 0.35 * Math.sin(t * 4) + sw * 0.5, og = ctx.createRadialGradient(0, -82, 1, 0, -82, 12 + sw * 6);
    og.addColorStop(0, '#f2ffd8'); og.addColorStop(0.35, `rgba(155,209,74,${Math.min(1, glow)})`); og.addColorStop(1, 'rgba(155,209,74,0)');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, -82, 12 + sw * 6, 0, 7); ctx.fill();
    ctx.restore();
    rr(3, -48, 6, 16, 3); fillO('#4f8f3a'); ctx.fillStyle = '#ecc09a'; ctx.beginPath(); ctx.arc(8, -32, 3, 0, 7); ctx.fill();
    // Bärengeist beim Zuschlagen
    if (sw > 0.25) {
      ctx.save(); ctx.globalAlpha = sw * 0.7; ctx.translate(30, -40);
      ctx.fillStyle = 'rgba(155,209,74,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 12, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-9, -10, 4, 0, 7); ctx.arc(9, -10, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#d8ffb0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 7, -12); ctx.quadraticCurveTo(-2 + i * 7, 0, -6 + i * 7, 14); ctx.stroke(); }
      ctx.restore();
    }
    // schwebende Blätter
    for (let i = 0; i < 2; i++) { const p = (t * 0.35 + i * 0.5) % 1; ctx.fillStyle = `rgba(126,200,90,${1 - p})`; ctx.beginPath(); ctx.ellipse(-12 + i * 22 + Math.sin(t * 2 + i) * 4, -70 + p * 60, 2.6, 1.3, t * 2 + i, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function turret(x, t, fire, alpha = 1) {
    ctx.globalAlpha = alpha; shadow(x, 10);
    ctx.save(); ctx.translate(x, GROUND);
    ctx.strokeStyle = '#5b5f6b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -12); ctx.lineTo(8, 0); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.stroke();
    rr(-8, -22, 16, 11, 3); fillO('#7a8494');
    ctx.save(); ctx.translate(4, -17); ctx.rotate(-0.08); rr(0, -3, 14, 6, 2); fillO('#5b5f6b'); ctx.restore();
    ctx.fillStyle = '#f28c28'; ctx.fillRect(-6, -20, 4, 3);
    if (fire > 0) { ctx.fillStyle = `rgba(255,210,100,${fire})`; ctx.beginPath(); ctx.arc(21, -17, 4 + fire * 3, 0, 7); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function minion(x, t, sw, alpha) {
    ctx.globalAlpha = alpha; shadow(x, 7);
    ctx.save(); ctx.translate(x, GROUND + Math.sin(t * 8 + x) * 0.6); ctx.scale(0.75, 0.75);
    ctx.fillStyle = '#d8e8e0'; ctx.fillRect(-2, -26, 4, 16); for (let i = 0; i < 3; i++) ctx.fillRect(-6, -24 + i * 4, 12, 2);
    ctx.fillRect(-5, -10, 3, 10); ctx.fillRect(2, -10, 3, 10);
    ctx.beginPath(); ctx.arc(0, -32, 7, 0, 7); fillO('#e8f2ec');
    ctx.fillStyle = '#1b1726'; ctx.fillRect(0, -34, 3, 3); ctx.fillStyle = 'rgba(107,224,184,.9)'; ctx.fillRect(1, -34, 1.5, 1.5);
    ctx.save(); ctx.translate(6, -20); ctx.rotate(sw > 0 ? -1.2 + (1 - sw) * 1.6 : -0.4); ctx.fillStyle = '#9aa3ad'; ctx.fillRect(0, -1, 14, 2); ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function dragonC(x, y, t, a) {
    const f = Math.sin(t * 8) * 10;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 6);
    ctx.fillStyle = '#b8323a';
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-22, -16 - f); ctx.lineTo(-2, -6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(16, -18 - f); ctx.lineTo(10, -4); ctx.fill();
    rr(-16, -6, 30, 12, 6); fillO('#e5484d');
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-30, 4, -34, -4); ctx.lineWidth = 4; ctx.strokeStyle = '#e5484d'; ctx.stroke();
    ctx.beginPath(); ctx.arc(18, -6, 7, 0, 7); fillO('#e5484d');
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(20, -8, 2, 2);
    ctx.fillStyle = '#7a1f22'; ctx.beginPath(); ctx.moveTo(14, -12); ctx.lineTo(12, -18); ctx.lineTo(17, -12); ctx.fill();
    if (a > 0) { const g = ctx.createLinearGradient(24, 0, 260, 0); g.addColorStop(0, `rgba(255,200,90,${Math.min(1, a)})`); g.addColorStop(1, 'rgba(255,90,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(260, 60); ctx.lineTo(260, 120); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function owlC(x, y, t) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3) * 3);
    const f = Math.sin(t * 14) * 5;
    ctx.fillStyle = '#a88a5a'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-16, -6 - f); ctx.lineTo(-4, 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(16, -6 - f); ctx.lineTo(4, 4); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 10, 0, 0, 7); fillO('#d9c48a');
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -3, 3, 0, 7); ctx.arc(3, -3, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1726'; ctx.fillRect(-4, -4, 2, 2); ctx.fillRect(2, -4, 2, 2);
    ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(1, 0); ctx.lineTo(0, 3); ctx.fill();
    ctx.restore();
  }
  function golemC(x, t) {
    shadow(x, 18);
    ctx.save(); ctx.translate(x, GROUND + Math.sin(t * 2) * 0.5);
    rr(-12, -18, 9, 18, 3); fillO('#7d8590'); rr(3, -18, 9, 18, 3); fillO('#7d8590');
    rr(-16, -52, 32, 36, 8); fillO('#9aa3ad');
    rr(-24, -48, 10, 26, 4); fillO('#8a929c'); rr(14, -48, 10, 26, 4); fillO('#8a929c');
    rr(-9, -66, 18, 15, 4); fillO('#aab3bd');
    ctx.fillStyle = `rgba(127,220,255,${0.7 + 0.3 * Math.sin(t * 3)})`; ctx.fillRect(-5, -61, 3, 3); ctx.fillRect(2, -61, 3, 3);
    ctx.fillStyle = 'rgba(127,220,255,.5)'; ctx.fillRect(-2, -42, 4, 12);
    ctx.restore();
  }
  function phoenixC(x, y, t) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2.5) * 5);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,${120 + i * 20},40,${0.5 - i * 0.07})`; ctx.beginPath(); ctx.arc(-10 - i * 6, Math.sin(t * 6 + i) * 3, Math.max(1, 5 - i * 0.6), 0, 7); ctx.fill(); }
    const f = Math.sin(t * 10) * 9;
    ctx.fillStyle = '#ff7a3d'; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-14, -16 - f); ctx.lineTo(4, -4); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, 7); fillO('#ff9a3d');
    ctx.beginPath(); ctx.arc(10, -4, 5, 0, 7); fillO('#ffb547');
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(19, -3); ctx.lineTo(14, -1); ctx.fill();
    ctx.restore();
  }
  function drawComps(t, R) {
    const act = (S.compActive || []).filter(id => S.comps[id]);
    if (act.includes('golem')) golemC(R ? R.frontX + 34 : 330, t);
    if (act.includes('drache')) dragonC(R ? R.frontX - 40 : 70, R ? 70 : 108, t, R && R.fx.dragon > 0 ? R.fx.dragon : 0);
    if (act.includes('eule')) owlC(R ? (R.pos.p || R.pos.s || R.frontX - 40) : 432, R ? 110 : 118, t);
    if (act.includes('phoenix')) phoenixC(R ? R.frontX - 10 : 395, R ? 95 : 78, t);
  }
  function weather(stage, t) {
    const z = zoneOf(stage) % 15;
    if (z === 5 || z === 1) { ctx.strokeStyle = 'rgba(200,220,255,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 40; i++) { const x = (hash(i) * W + t * 60) % W, y = (hash(i + 7) * H + t * 380) % GROUND; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); } }
    if (z === 5 || z === 7) { const g = ctx.createLinearGradient(0, GROUND - 60, 0, GROUND + 10); g.addColorStop(0, 'rgba(220,220,235,0)'); g.addColorStop(1, 'rgba(220,220,235,.35)'); ctx.fillStyle = g; ctx.fillRect(0, GROUND - 60, W, 70); }
    if (z === 9 || z === 14) for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect((hash(i) * W + Math.sin(t + i) * 10 + W) % W, (hash(i + 4) * H + t * (25 + hash(i) * 20)) % GROUND, 2, 2); }
    if (z === 8 || z === 13 || stage > 150) for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(255,150,70,.7)'; ctx.fillRect(hash(i) * W, GROUND - ((t * (15 + hash(i) * 25) + hash(i + 2) * 200) % 200), 2, 2); }
  }
  function grassFront(scroll, night) {
    ctx.fillStyle = night ? 'rgba(20,30,20,.9)' : 'rgba(40,70,35,.85)';
    for (let k = Math.floor(scroll * 1.3 / 40) - 1; k < Math.floor(scroll * 1.3 / 40) + 14; k++) {
      if (hash(k * 1.7) < 0.5) continue;
      const x = k * 40 - scroll * 1.3 + hash(k) * 20;
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x + j * 3, H); ctx.quadraticCurveTo(x + j * 3 - 2, H - 10, x + j * 3 + 2 - j, H - 16 - hash(k + j) * 8); ctx.lineTo(x + j * 3 + 2, H); ctx.fill(); }
    }
  }
  // ---------- Heldenfiguren (Version 5.5: aufwendig gezeichnet) ----------
  const LG = (y0, y1, a, b) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const RG = (x, y, r, a, b) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  // Leuchtpunkte als vorbereitete Bilder (viel schneller als jedes Mal einen Verlauf zu bauen)
  const GLOW = new Map();
  function glowSprite(rgb) {
    let c = GLOW.get(rgb); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.4, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    GLOW.set(rgb, c); return c;
  }
  function glowDot(x, y, r, rgb, a = 1) { if (!(r > 0) || !(a > 0)) return; const pa = ctx.globalAlpha; ctx.globalAlpha = pa * Math.min(1, a); ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = pa; }
  function pose(t, walk, f = 12) { return { step: walk ? Math.sin(t * f) : 0, bob: walk ? Math.abs(Math.sin(t * f)) * 2 : Math.sin(t * 1.7) * 0.6 }; }
  function begin(x, h, t, walk, f, sh) {
    const p = pose(t, walk, f); shadow(x, sh);
    ctx.save(); ctx.translate(x, GROUND - p.bob);
    if (h && !h.alive) { const f = h.fall == null ? 1 : h.fall; ctx.rotate(-1.4 * f); ctx.translate(-12 * f, 8 * f); }
    return p;
  }
  function hurt() {}
  // Treffer: Held leuchtet rot auf (nur die Figur, kein Kasten)
  let tintCv = null;
  function drawHero(k, x, h, t, walk) {
    if (!(h && h.alive && h.hurtT > 0) || !cv) { DRAW[k](x, h, t, walk); return; }
    if (!tintCv) tintCv = document.createElement('canvas');
    if (tintCv.width !== cv.width || tintCv.height !== cv.height) { tintCv.width = cv.width; tintCv.height = cv.height; }
    const main = ctx, oc = tintCv.getContext('2d'), m = main.getTransform();
    const sx = Math.max(0, Math.floor(m.a * (x - 70) + m.e)), sw = Math.min(cv.width - sx, Math.ceil(m.a * 140));
    if (sw <= 0) return;
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(sx, 0, sw, cv.height);
    oc.setTransform(m); ctx = oc;
    try { DRAW[k](x, h, t, walk); } finally { ctx = main; }
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalAlpha = 1;
    oc.globalCompositeOperation = 'source-atop'; oc.fillStyle = `rgba(255,40,40,${Math.min(0.6, 0.25 + h.hurtT * 3)})`; oc.fillRect(sx, 0, sw, cv.height); oc.globalCompositeOperation = 'source-over';
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(tintCv, sx, 0, sw, cv.height, sx, 0, sw, cv.height); main.restore();
  }
  function legs(step, c1, c2, boot, w = 7) {
    for (const [lx, s] of [[-w - 1, step], [1, -step]]) { ctx.save(); ctx.translate(lx + s * 3, 0); rr(0, -22, w, 20, 2); fillO(LG(-22, 0, c1, c2)); rr(-1, -5, w + 2, 5, 2); fillO(boot); ctx.restore(); }
  }
  function cape(t, top, c1, c2, len = 48, spread = 20) {
    const wind = Math.sin(t * 2.3) * 3;
    ctx.beginPath(); ctx.moveTo(-4, top); ctx.quadraticCurveTo(-spread - wind, top + len * 0.45, -spread + 4 - wind * 1.5, top + len);
    ctx.lineTo(-spread + 10 - wind, top + len - 3); ctx.lineTo(-6, top + len - 6); ctx.closePath(); fillO(LG(top, top + len, c1, c2));
  }
  function sparkle(x, y, s, a) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.25, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.25, y); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 0.25); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s * 0.25); ctx.closePath(); ctx.fill(); }

  function knight(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 12, 16), sw = h ? h.swing : 0;
    cape(t, -50, '#d0384a', '#7a1a24', 46, 22);
    legs(step, '#e9edf3', '#8e96a3', '#4a4e5a');
    // Schild
    ctx.save(); ctx.translate(-12, -38);
    ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(8, -12); ctx.lineTo(8, 2); ctx.quadraticCurveTo(6, 12, 0, 17); ctx.quadraticCurveTo(-6, 12, -8, 2); ctx.closePath(); fillO(LG(-12, 17, '#4a8ae6', '#1d3f80'));
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1, -9, 2, 20); ctx.fillRect(-5.5, -4, 11, 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-2, -10); ctx.lineTo(-6, 0); ctx.fill();
    ctx.restore();
    // Rüstung
    rr(-10, -52, 20, 32, 5); fillO(LG(-52, -20, '#f6f8fc', '#97a0ae'));
    ctx.beginPath(); ctx.moveTo(-7, -47); ctx.lineTo(7, -47); ctx.lineTo(8, -20); ctx.lineTo(0, -15); ctx.lineTo(-8, -20); ctx.closePath(); fillO(LG(-47, -15, '#c22f3a', '#86202c'));
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1, -43, 2, 22); ctx.fillRect(-5, -36, 10, 2);
    ctx.strokeStyle = 'rgba(255,210,63,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-7, -46.5); ctx.lineTo(7, -46.5); ctx.stroke();
    ctx.fillStyle = '#4a3220'; ctx.fillRect(-10, -25, 20, 3.5); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2.5, -25.5, 5, 4.5);
    for (const sx of [-10, 10]) { ctx.beginPath(); ctx.ellipse(sx, -49, 6.5, 4.5, 0, 0, 7); fillO(LG(-54, -45, '#ffffff', '#a2abb8')); ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx - 5, -46.5, 10, 1.2); }
    // Helm
    ctx.beginPath(); ctx.arc(0, -61, 11, 0, 7); fillO(LG(-72, -50, '#ffffff', '#9aa3b0'));
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1.2, -72, 2.4, 9);
    ctx.fillStyle = '#1b1726'; rr(1, -63.5, 10.5, 3.2, 1.2); ctx.fill();
    ctx.fillStyle = `rgba(120,200,255,${0.5 + 0.3 * Math.sin(t * 3)})`; ctx.fillRect(5, -62.8, 4, 1.6);
    ctx.fillStyle = '#5b5f6b'; for (let i = 0; i < 3; i++) ctx.fillRect(4 + i * 2.5, -57, 1.2, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-4, -67, 3.5, 1.6, -0.5, 0, 7); ctx.fill();
    // Helmbusch
    for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ff6b6b', '#e5484d', '#b8323a'][i]; ctx.beginPath(); ctx.moveTo(-2, -71 + i); ctx.quadraticCurveTo(-16 - i * 2, -86 + Math.sin(t * 6 + i) * 2.5 + i * 3, -22 - i, -62 + i * 2); ctx.quadraticCurveTo(-10, -70, -2, -66 + i); ctx.fill(); }
    if (S.asc > 0 && !(cine && cine.kind === 'asc')) crownIcon(1, -77, 0.62, 0);
    // Schwert
    const ang = sw > 0 ? (1 - sw) * 2.2 - 1.45 : -0.9;
    ctx.save(); ctx.translate(8, -41); ctx.rotate(run && run.fx && run.fx.wirbel > 0 ? t * 30 : ang);
    ctx.fillStyle = '#3b7ad6'; ctx.beginPath(); ctx.arc(-3, 0, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a5b3a'; ctx.fillRect(-1, -2, 7, 4); ctx.fillStyle = '#ffd23f'; rr(5, -8, 3.5, 16, 1.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -3.2); ctx.lineTo(42, -2.2); ctx.lineTo(49, 0); ctx.lineTo(42, 2.2); ctx.lineTo(8, 3.2); ctx.closePath(); fillO(LG(-3, 3, '#ffffff', '#b8c2d0'));
    ctx.strokeStyle = 'rgba(150,160,180,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(42, 0); ctx.stroke();
    const gl = (t * 1.3) % 1; sparkle(10 + gl * 34, -1, 2.5, 0.8 * Math.sin(gl * Math.PI));
    if (sw > 0.3) { ctx.strokeStyle = `rgba(255,236,170,${sw * 0.55})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 46, -0.7, 0.6); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${sw * 0.5})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 40, -0.6, 0.5); ctx.stroke(); }
    ctx.restore();
    hurt(h, 34, -86); ctx.restore();
  }

  function guard(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 10, 20), sw = h ? h.swing : 0;
    ctx.fillStyle = '#5b4632'; ctx.beginPath(); ctx.ellipse(-2, -54, 16, 6, 0, 0, 7); ctx.fill();
    legs(step, '#c9d2e0', '#6e7a8c', '#3a3f4a', 8);
    rr(-13, -56, 26, 36, 7); fillO(LG(-56, -20, '#d8e2f0', '#7d8ba0'));
    ctx.strokeStyle = 'rgba(70,80,100,.45)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-11, -48 + i * 6); ctx.lineTo(11, -48 + i * 6); ctx.stroke(); }
    ctx.fillStyle = '#4a3220'; ctx.fillRect(-13, -26, 26, 4); ctx.fillStyle = '#c9a64a'; ctx.fillRect(-3, -26.5, 6, 5);
    // Fellkragen
    ctx.fillStyle = '#8a6a4a'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-12 + i * 4, -56 + Math.sin(i * 2) * 1.2, 4, 0, 7); ctx.fill(); }
    for (const sx of [-13, 13]) { ctx.beginPath(); ctx.arc(sx, -54, 8, Math.PI, 0); ctx.lineTo(sx + 8, -50); ctx.lineTo(sx - 8, -50); ctx.closePath(); fillO(LG(-62, -50, '#eef3fa', '#8e9aae')); ctx.fillStyle = '#c9a64a'; ctx.fillRect(sx - 7, -51, 14, 1.5); }
    // Helm
    rr(-11, -78, 22, 22, 6); fillO(LG(-78, -56, '#f2f6fb', '#8995a8'));
    ctx.fillStyle = '#1b1726'; ctx.fillRect(-1, -72, 12, 3); ctx.fillRect(4, -72, 3, 11);
    ctx.fillStyle = `rgba(120,180,255,${0.55 + 0.3 * Math.sin(t * 2)})`; ctx.fillRect(6, -71.5, 4, 2);
    ctx.fillStyle = '#c9a64a'; ctx.fillRect(-11, -66, 22, 2); ctx.fillRect(-1.5, -80, 3, 8);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-5, -75, 3, 1.4, -0.4, 0, 7); ctx.fill();
    // Streitkolben
    ctx.save(); ctx.translate(-6, -40); ctx.rotate(sw > 0 ? (1 - sw) * 2 - 1.6 : -0.5);
    ctx.fillStyle = '#5a3d25'; ctx.fillRect(-14, -1.5, 16, 3);
    ctx.beginPath(); ctx.arc(-17, 0, 5.5, 0, 7); fillO(LG(-5, 5, '#e0e6ee', '#7d8696'));
    ctx.fillStyle = '#c9cdd6'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(-17 + Math.cos(a) * 4, Math.sin(a) * 4); ctx.lineTo(-17 + Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(-17 + Math.cos(a + 0.3) * 4, Math.sin(a + 0.3) * 4); ctx.fill(); }
    ctx.restore();
    // Turmschild
    ctx.save(); ctx.translate(14, -36);
    rr(-9, -24, 18, 44, 5); fillO(LG(-24, 20, '#4a8ae6', '#1a3a78'));
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; rr(-7, -22, 14, 40, 4); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1.5, -16, 3, 28); ctx.fillRect(-6, -6, 12, 3);
    ctx.fillStyle = '#c9cdd6'; for (const [bx, by] of [[-5, -19], [5, -19], [-5, 15], [5, 15]]) { ctx.beginPath(); ctx.arc(bx, by, 1.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(-7, -21); ctx.lineTo(-2, -21); ctx.lineTo(-7, 0); ctx.fill();
    if (run && run.fx && (run.fx.w_wall > 0 || run.hautT > 0)) glowDot(0, -2, 26, '127,178,255', 0.45);
    ctx.restore();
    hurt(h, 40, -84); ctx.restore();
  }

  function archer(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 13, 13), sw = h ? h.swing : 0, wind = Math.sin(t * 2.3);
    // Umhang mit Blattsaum
    cape(t, -50, '#3e7a3a', '#1a3f24', 44, 18);
    ctx.fillStyle = '#c9a64a'; for (let i = 0; i < 4; i++) { const cx = -14 - wind * 1.4 + i * 3, cy = -8 + i * 0.8; ctx.beginPath(); ctx.ellipse(cx, cy, 1.6, 0.9, 0.6, 0, 7); ctx.fill(); }
    // Beine: Hose, Stiefel mit Umschlag
    for (const [lx, sg] of [[-7, step], [1, -step]]) {
      ctx.save(); ctx.translate(lx + sg * 3, 0);
      rr(0, -22, 6, 20, 2); fillO(LG(-22, 0, '#5a4630', '#3a2c1e'));
      rr(-1, -11, 8, 11, 2); fillO(LG(-11, 0, '#7a5232', '#4a3020'));
      ctx.fillStyle = '#a67a48'; rr(-1.5, -12, 9, 3, 1.2); ctx.fill();
      ctx.fillStyle = '#2a1c12'; ctx.fillRect(-1, -1.5, 9, 1.5);
      ctx.restore();
    }
    // Köcher mit Federpfeilen
    ctx.save(); ctx.translate(-9, -46); ctx.rotate(-0.35);
    rr(-4.5, 0, 9, 23, 2.5); fillO(LG(0, 23, '#8a5e36', '#4e331c'));
    ctx.fillStyle = '#c9a64a'; ctx.fillRect(-4.5, 3, 9, 1.6); ctx.fillRect(-4.5, 17, 9, 1.6);
    ctx.fillStyle = '#e8d9a8'; ctx.beginPath(); ctx.arc(0, 10.5, 2, 0, 7); ctx.fill();
    for (let i = 0; i < 4; i++) { const fx = -3.2 + i * 2.2; ctx.fillStyle = '#d8dce4'; ctx.fillRect(fx, -5, 0.9, 6); ctx.fillStyle = ['#e5484d', '#f2f2f2', '#7ee08a', '#ffd23f'][i]; ctx.beginPath(); ctx.moveTo(fx - 1, -10 - (i % 2)); ctx.lineTo(fx + 1.8, -9); ctx.lineTo(fx + 0.4, -3.5); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // Oberkörper: Tunika, Lederweste, Gürtel
    ctx.beginPath(); ctx.moveTo(-9, -46); ctx.lineTo(9, -46); ctx.lineTo(10, -22); ctx.lineTo(12, -15); ctx.lineTo(-12, -15); ctx.lineTo(-10, -22); ctx.closePath(); fillO(LG(-46, -15, '#86d05f', '#2f6b34'));
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(-6, -44); ctx.lineTo(-2, -44); ctx.lineTo(-4, -24); ctx.lineTo(-7, -24); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, -42); ctx.lineTo(-2, -46); ctx.lineTo(1, -38); ctx.lineTo(4, -46); ctx.lineTo(8, -42); ctx.lineTo(8, -24); ctx.lineTo(-8, -24); ctx.closePath(); fillO(LG(-46, -24, '#8a5e36', '#5a3a20'));
    ctx.strokeStyle = '#e8d9a8'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-1, -40 + i * 4); ctx.lineTo(3, -38 + i * 4); ctx.moveTo(3, -40 + i * 4); ctx.lineTo(-1, -38 + i * 4); } ctx.stroke();
    ctx.fillStyle = '#3a2616'; ctx.fillRect(-10, -26, 20, 3.5); ctx.fillStyle = '#ffd23f'; rr(-2.5, -27, 5, 5.5, 1); ctx.fill(); ctx.fillStyle = '#3a2616'; ctx.fillRect(-1, -25.5, 2, 2.5);
    ctx.fillStyle = '#6b4a2e'; rr(5, -25, 5, 6, 1.5); ctx.fill();
    // Schulterstück mit Blatt
    ctx.beginPath(); ctx.ellipse(4, -44, 6, 4, -0.2, 0, 7); fillO(LG(-48, -40, '#a67a48', '#6b4a2e'));
    ctx.fillStyle = '#7ee08a'; ctx.beginPath(); ctx.moveTo(1, -44); ctx.quadraticCurveTo(4, -48, 8, -45); ctx.quadraticCurveTo(4, -42, 1, -44); ctx.fill();
    // Kragen / Halstuch
    ctx.beginPath(); ctx.moveTo(-7, -48); ctx.quadraticCurveTo(1, -43, 8, -48); ctx.lineTo(7, -45); ctx.quadraticCurveTo(1, -40, -6, -45); ctx.closePath(); fillO('#2f6b3f');
    // Zopf hinten (schwingt leicht)
    ctx.save(); ctx.translate(-6, -56);
    ctx.fillStyle = '#d9a83a'; for (let i = 0; i < 4; i++) { const bx = -4 - i * 1.2 - wind * i * 0.35, by = 3 + i * 4.2; ctx.beginPath(); ctx.ellipse(bx, by, 3.2 - i * 0.25, 2.6, 0.4, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(120,80,20,.6)'; ctx.lineWidth = 0.7; ctx.stroke(); }
    ctx.fillStyle = '#e5484d'; ctx.fillRect(-10.5 - wind * 1.3, 17.5, 4, 2); ctx.fillStyle = '#f0d070'; ctx.beginPath(); ctx.moveTo(-9.5 - wind * 1.4, 19.5); ctx.lineTo(-11.5 - wind * 1.8, 24); ctx.lineTo(-6.5 - wind * 1.4, 23); ctx.fill();
    ctx.restore();
    // Kopf
    ctx.beginPath(); ctx.arc(1, -56, 8, 0, 7); fillO(RG(3, -57, 10, '#f8d9b8', '#e3b48c'));
    // Gesicht
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5, -56.5, 2.1, 2.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2f9a4f'; ctx.beginPath(); ctx.arc(5.6, -56.2, 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#123018'; ctx.beginPath(); ctx.arc(5.8, -56.1, 0.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(6, -57.3, 0.8, 0.8);
    ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2.8, -58.6); ctx.quadraticCurveTo(5, -59.6, 7.3, -58.4); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(7.2, -58.4); ctx.lineTo(8.3, -59.2); ctx.stroke();
    ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(3.2, -60.6); ctx.quadraticCurveTo(5.5, -61.6, 7.8, -60.4); ctx.stroke();
    ctx.fillStyle = '#d99a78'; ctx.beginPath(); ctx.moveTo(8.6, -55.5); ctx.lineTo(9.6, -53.4); ctx.lineTo(8.2, -53.2); ctx.fill();
    ctx.strokeStyle = '#a0463c'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(5.2, -51.4); ctx.quadraticCurveTo(7, -50.4, 8.4, -51.6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,130,.38)'; ctx.beginPath(); ctx.ellipse(3.6, -53.2, 1.8, 1.1, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2f6b3f'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(1, -54); ctx.lineTo(1.6, -52.5); ctx.moveTo(2.4, -54.4); ctx.lineTo(2.9, -53); ctx.stroke();
    // Haare: Pony unter der Kapuze
    ctx.beginPath(); ctx.moveTo(-6, -61); ctx.quadraticCurveTo(1, -66.5, 8.6, -62.2); ctx.quadraticCurveTo(6, -62.4, 4.6, -61.4); ctx.quadraticCurveTo(3, -62.6, 1, -61.3); ctx.quadraticCurveTo(-1.5, -62, -4, -58.5); ctx.closePath();
    ctx.fillStyle = LG(-66, -58, '#ffe596', '#d9a83a'); ctx.fill(); ctx.strokeStyle = 'rgba(150,100,30,.7)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(2, -63.6, 2.4, 0.7, -0.2, 0, 7); ctx.fill();
    // Kapuze mit Rand und Feder
    ctx.beginPath(); ctx.moveTo(-9.5, -51); ctx.quadraticCurveTo(-12, -68, 0, -70); ctx.quadraticCurveTo(9, -70.5, 9.5, -64); ctx.quadraticCurveTo(5, -67, -1, -66); ctx.quadraticCurveTo(-6, -64.5, -6.5, -51); ctx.closePath(); fillO(LG(-70, -51, '#5fae48', '#24552f'));
    ctx.strokeStyle = '#c9a64a'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-6.7, -52); ctx.quadraticCurveTo(-6.2, -64.8, -1, -66.2); ctx.quadraticCurveTo(5, -67.2, 9.2, -64.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -58); ctx.quadraticCurveTo(-13, -63, -14, -67); ctx.quadraticCurveTo(-9, -63, -5, -55); ctx.closePath(); fillO('#efc39c');
    ctx.save(); ctx.translate(-4, -68); ctx.rotate(-1.05 + wind * 0.05);
    ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -8, -1, -15); ctx.quadraticCurveTo(3, -8, 0, 0); ctx.fill();
    ctx.strokeStyle = '#ffd2d4'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-1, -8, -1, -14); ctx.stroke();
    ctx.restore();
    // Langbogen mit goldenen Enden und Rune
    const pull = sw > 0 ? Math.sin(sw * Math.PI) * 6 : 0;
    ctx.save(); ctx.translate(15, -38);
    ctx.strokeStyle = '#4e2f16'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-5, -23); ctx.quadraticCurveTo(-1, -23, 2, -16); ctx.quadraticCurveTo(10, 0, 2, 16); ctx.quadraticCurveTo(-1, 23, -5, 23); ctx.stroke();
    ctx.strokeStyle = '#a8703a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(-5, -23, 1.8, 0, 7); ctx.arc(-5, 23, 1.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2616'; rr(3.2, -5, 3.6, 10, 1.4); ctx.fill();
    glowDot(5, 0, 6, '126,224,138', 0.35 + 0.15 * Math.sin(t * 3)); ctx.fillStyle = '#b9ffc4'; ctx.fillRect(4.4, -2, 1.2, 4);
    ctx.strokeStyle = 'rgba(245,245,240,.95)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-5, -23); ctx.lineTo(-5 - pull, 0); ctx.lineTo(-5, 23); ctx.stroke();
    if (pull > 1) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-5 - pull, -0.7, 21, 1.4); ctx.fillStyle = '#e5484d'; ctx.fillRect(-5 - pull, -1.6, 3, 3.2); ctx.fillStyle = '#c9cdd6'; ctx.beginPath(); ctx.moveTo(16 - pull, -2.5); ctx.lineTo(20 - pull, 0); ctx.lineTo(16 - pull, 2.5); ctx.fill(); glowDot(18 - pull, 0, 7, '126,224,138', 0.6); }
    ctx.restore();
    // Arm mit Armschiene
    ctx.strokeStyle = '#2f6b34'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(5, -43); ctx.lineTo(12 - pull * 0.6, -38); ctx.stroke();
    ctx.save(); ctx.translate(10.5 - pull * 0.6, -38.5); ctx.rotate(0.6); rr(-3, -2.4, 6, 4.8, 1.2); fillO('#8a5e36'); ctx.restore();
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(13.5 - pull * 0.6, -38, 2.4, 0, 7); ctx.fill();
    hurt(h, 30, -72); ctx.restore();
  }

  function mage(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 11, 13), sw = h ? h.swing : 0;
    for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; glowDot(Math.cos(a) * 18, -40 + Math.sin(a * 1.3) * 16, 4, '200,140,255', 0.7); }
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-10, -24, -8, -46); ctx.lineTo(8, -46); ctx.quadraticCurveTo(10, -24, 12, 0); ctx.closePath(); fillO(LG(-46, 0, '#6a46b8', '#2f1d5e'));
    ctx.fillStyle = '#ffd23f'; for (const [sx, sy] of [[-6, -30], [4, -18], [-3, -10], [6, -36]]) sparkle(sx, sy, 2, 0.8);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-12, -3, 24, 3); ctx.fillStyle = '#c9a64a'; ctx.fillRect(-9, -30, 18, 2.5);
    ctx.fillStyle = '#1b1726'; rr(-5 + step * 2, -3, 5, 4, 1.5); ctx.fill(); rr(1 - step * 2, -3, 5, 4, 1.5); ctx.fill();
    ctx.beginPath(); ctx.arc(1, -52, 8, 0, 7); fillO('#f1c9a5');
    ctx.fillStyle = '#1b1726'; ctx.fillRect(4, -54, 2, 2);
    ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.moveTo(-6, -50); ctx.quadraticCurveTo(2, -26 + Math.sin(t * 2) * 1.5, 9, -50); ctx.quadraticCurveTo(2, -45, -6, -50); ctx.fill();
    ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(1, -32); ctx.moveTo(4, -46); ctx.lineTo(3, -34); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(1, -57, 15, 4, -0.08, 0, 7); fillO('#4a2f80');
    ctx.beginPath(); ctx.moveTo(-10, -58); ctx.quadraticCurveTo(-2, -70, -1, -84); ctx.quadraticCurveTo(4, -80, 14, -86); ctx.quadraticCurveTo(8, -72, 11, -58); ctx.closePath(); fillO(LG(-86, -58, '#7a56c8', '#3e2670'));
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(2, -68, 3.2, Math.PI * 0.3, Math.PI * 1.7); ctx.arc(3.5, -68, 2.4, Math.PI * 1.7, Math.PI * 0.3, true); ctx.fill();
    sparkle(-4, -63, 1.6, 0.9); sparkle(7, -74, 1.6, 0.9);
    ctx.save(); ctx.translate(13, -2); ctx.rotate(sw * 0.35);
    ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, -58); ctx.stroke();
    ctx.strokeStyle = '#c9a64a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1, -58); ctx.quadraticCurveTo(-6, -64, 0, -70); ctx.moveTo(1, -58); ctx.quadraticCurveTo(8, -64, 2, -70); ctx.stroke();
    const glow = 0.7 + 0.3 * Math.sin(t * 5) + sw;
    glowDot(1, -64, 12 + sw * 8, '200,140,255', Math.min(1, glow));
    ctx.fillStyle = '#f4e8ff'; ctx.beginPath(); ctx.arc(1, -64, 3.5, 0, 7); ctx.fill();
    ctx.restore();
    hurt(h, 32, -88); ctx.restore();
  }

  function priest(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 11, 13), sw = h ? h.swing : 0;
    // Flügel
    for (const sgn of [-1]) {
      ctx.save(); ctx.translate(-4, -46); ctx.rotate(Math.sin(t * 2) * 0.08);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,252,240,${0.9 - i * 0.12})`; ctx.beginPath(); ctx.ellipse(-8 - i * 3, -2 + i * 5, 12 - i, 4, -0.9 + i * 0.25, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-10, -22, -8, -44); ctx.lineTo(8, -44); ctx.quadraticCurveTo(10, -22, 12, 0); ctx.closePath(); fillO(LG(-44, 0, '#ffffff', '#e6dcc8'));
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2, -42, 4, 40); ctx.fillRect(-12, -3, 24, 3);
    ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.arc(0, -30, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(0, -30, 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9a64a'; ctx.beginPath(); ctx.moveTo(-8, -44); ctx.lineTo(0, -36); ctx.lineTo(8, -44); ctx.lineTo(4, -44); ctx.lineTo(0, -40); ctx.lineTo(-4, -44); ctx.fill();
    // Haare
    ctx.fillStyle = '#f0c860'; ctx.beginPath(); ctx.moveTo(-8, -54); ctx.quadraticCurveTo(-14, -36, -9, -26); ctx.lineTo(-4, -30); ctx.quadraticCurveTo(-6, -42, -2, -50); ctx.fill();
    ctx.beginPath(); ctx.arc(1, -52, 8, 0, 7); fillO('#f6d3b0');
    ctx.fillStyle = '#f0c860'; ctx.beginPath(); ctx.arc(0, -54, 8.6, Math.PI * 0.95, Math.PI * 1.9); ctx.quadraticCurveTo(6, -54, 4, -50); ctx.quadraticCurveTo(0, -56, -8, -52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a6ac8'; ctx.fillRect(4, -53, 2, 2); ctx.fillStyle = 'rgba(255,140,150,.35)'; ctx.beginPath(); ctx.arc(6, -49, 1.6, 0, 7); ctx.fill();
    // Heiligenschein mit Strahlen
    const hp = 0.6 + 0.3 * Math.sin(t * 3);
    ctx.save(); ctx.translate(0, -66); ctx.rotate(t * 0.4);
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = `rgba(255,236,170,${hp * 0.35})`; ctx.beginPath(); ctx.moveTo(-1.5, 6); ctx.lineTo(0, 16); ctx.lineTo(1.5, 6); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = `rgba(255,228,138,${hp + 0.1})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -66, 10, 3.2, 0, 0, 7); ctx.stroke();
    // Stab mit Sonne
    ctx.save(); ctx.translate(13, -2);
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -56); ctx.stroke();
    glowDot(0, -62, 14 + sw * 10, '255,240,170', 0.8);
    ctx.fillStyle = '#ffe48a'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, -62 + Math.sin(a) * 4); ctx.lineTo(Math.cos(a + 0.2) * 8, -62 + Math.sin(a + 0.2) * 8); ctx.lineTo(Math.cos(a + 0.4) * 4, -62 + Math.sin(a + 0.4) * 4); ctx.fill(); }
    ctx.fillStyle = '#fff8dc'; ctx.beginPath(); ctx.arc(0, -62, 4 + sw * 2, 0, 7); ctx.fill();
    ctx.restore();
    if (sw > 0.2) for (let i = 0; i < 4; i++) sparkle(14 + Math.cos(i * 1.6) * 12, -62 + Math.sin(i * 1.6) * 12, 2.5, sw);
    ctx.fillStyle = '#c9a64a'; rr(-5 + step * 2, -3, 5, 4, 1.5); ctx.fill(); rr(1 - step * 2, -3, 5, 4, 1.5); ctx.fill();
    hurt(h, 32, -82); ctx.restore();
  }

  function tamer(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 11, 15), sw = h ? h.swing : 0;
    cape(t, -54, '#8a6a4a', '#4a3424', 40, 18);
    legs(step, '#6b4a2e', '#3e2a1a', '#2a1a10');
    rr(-11, -52, 22, 32, 6); fillO(LG(-52, -20, '#a8744a', '#6b4425'));
    ctx.strokeStyle = '#3e2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -50); ctx.lineTo(10, -26); ctx.moveTo(10, -50); ctx.lineTo(-10, -26); ctx.stroke();
    ctx.fillStyle = '#c9cdd6'; ctx.beginPath(); ctx.arc(0, -38, 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#efe9d8'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 4, -50); ctx.lineTo(-5 + i * 4, -45); ctx.lineTo(-4 + i * 4, -50); ctx.fill(); }
    ctx.fillStyle = '#4a3220'; ctx.fillRect(-11, -25, 22, 4);
    // Kopf mit Bart und Wolfskopf-Haube
    ctx.beginPath(); ctx.arc(1, -60, 9, 0, 7); fillO('#e3b48e');
    ctx.fillStyle = '#6b3a1e'; ctx.beginPath(); ctx.moveTo(-6, -58); ctx.quadraticCurveTo(1, -44, 9, -58); ctx.quadraticCurveTo(2, -53, -6, -58); ctx.fill();
    ctx.fillStyle = '#1b1726'; ctx.fillRect(4, -62, 2, 2);
    ctx.beginPath(); ctx.moveTo(-11, -58); ctx.quadraticCurveTo(-12, -72, 0, -73); ctx.quadraticCurveTo(10, -72, 12, -64); ctx.lineTo(18, -62); ctx.lineTo(12, -59); ctx.quadraticCurveTo(4, -66, -6, -62); ctx.closePath(); fillO(LG(-74, -58, '#a0a6b2', '#5e6470'));
    ctx.fillStyle = '#5e6470'; ctx.beginPath(); ctx.moveTo(-6, -70); ctx.lineTo(-4, -79); ctx.lineTo(0, -71); ctx.fill(); ctx.beginPath(); ctx.moveTo(2, -72); ctx.lineTo(5, -80); ctx.lineTo(7, -71); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(8, -66, 2, 1.6);
    ctx.fillStyle = '#efe9d8'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 2.5, -61); ctx.lineTo(11 + i * 2.5, -58); ctx.lineTo(12 + i * 2.5, -61); ctx.fill(); }
    // Axt
    ctx.save(); ctx.translate(8, -40); ctx.rotate(sw > 0 ? (1 - sw) * 2 - 1.3 : -0.9);
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(0, -2, 30, 4); ctx.fillStyle = '#3e2a1a'; ctx.fillRect(4, -2.5, 3, 5);
    ctx.beginPath(); ctx.moveTo(24, -2); ctx.quadraticCurveTo(40, -16, 38, 6); ctx.quadraticCurveTo(32, 2, 24, 4); ctx.closePath(); fillO(LG(-14, 6, '#ffffff', '#9aa3ad'));
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, -8); ctx.quadraticCurveTo(37, -6, 36, 2); ctx.stroke();
    if (sw > 0.3) { ctx.strokeStyle = `rgba(255,210,168,${sw * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 38, -0.7, 0.5); ctx.stroke(); }
    ctx.restore();
    hurt(h, 34, -80); ctx.restore();
  }
  function wolf(x, t, walk, alpha = 1) {
    const ph = t * 14 + x, bob = walk ? Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 3 + x) * 0.8;
    ctx.globalAlpha = alpha; shadow(x, 15);
    ctx.save(); ctx.translate(x, GROUND - bob);
    const l = walk ? Math.sin(ph) * 4 : 0;
    ctx.fillStyle = '#5a606c';
    for (const [lx, s] of [[-10, l], [-4, -l], [7, -l], [12, l]]) { ctx.save(); ctx.translate(lx, -11); ctx.rotate(s * 0.08); rr(-2, 0, 4.5, 11, 2); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(-12, -17); ctx.quadraticCurveTo(-26, -24 + Math.sin(t * 8 + x) * 4, -26, -12); ctx.quadraticCurveTo(-20, -14, -12, -12); fillO(LG(-24, -12, '#c4cad4', '#6e7480'));
    ctx.beginPath(); ctx.ellipse(1, -17, 15, 8, 0, 0, 7); fillO(LG(-25, -9, '#b4bac6', '#6e7480'));
    ctx.fillStyle = '#e8ecf2'; ctx.beginPath(); ctx.ellipse(4, -12, 9, 3.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a909c'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(8 + i * 2, -24); ctx.lineTo(10 + i * 2, -27); ctx.lineTo(11 + i * 2, -23); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(10, -26); ctx.quadraticCurveTo(18, -28, 22, -24); ctx.lineTo(29, -21); ctx.lineTo(28, -17); ctx.lineTo(20, -15); ctx.quadraticCurveTo(13, -15, 10, -18); ctx.closePath(); fillO(LG(-28, -15, '#c4cad4', '#7e8490'));
    ctx.fillStyle = '#e8ecf2'; ctx.beginPath(); ctx.moveTo(20, -18); ctx.lineTo(28, -18); ctx.lineTo(21, -15.5); ctx.fill();
    ctx.fillStyle = '#1b1726'; ctx.beginPath(); ctx.arc(28.5, -20, 1.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(13, -26); ctx.lineTo(15, -34); ctx.lineTo(18, -26); fillO('#9aa0ac'); ctx.fillStyle = '#d9a0a0'; ctx.beginPath(); ctx.moveTo(14.5, -27); ctx.lineTo(15.3, -31); ctx.lineTo(16.6, -27); ctx.fill();
    glowDot(21, -22, 4, '255,210,63', 0.7); ctx.fillStyle = '#ffd23f'; ctx.fillRect(20.5, -23, 2, 1.8);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function assassin(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 13, 12), sw = h ? h.swing : 0;
    for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3) % 1; ctx.fillStyle = `rgba(60,30,80,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(-8 + Math.sin(i * 2 + t) * 4, -10 - p * 50, 5 + p * 6, 0, 7); ctx.fill(); }
    const sc = Math.sin(t * 5) * 3;
    for (let i = 0; i < 2; i++) { ctx.fillStyle = ['#ff4d5e', '#b8202f'][i]; ctx.beginPath(); ctx.moveTo(-2, -47 + i * 2); ctx.quadraticCurveTo(-16, -46 + sc, -28 - i * 2, -40 + sc * 1.6 + i * 3); ctx.lineTo(-25, -36 + sc + i * 3); ctx.quadraticCurveTo(-12, -40, -2, -42 + i * 2); ctx.fill(); }
    legs(step, '#2b2236', '#15101c', '#0d0a12', 6);
    ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-8, -47); ctx.lineTo(8, -47); ctx.lineTo(10, -18); ctx.lineTo(4, -12); ctx.lineTo(-4, -14); ctx.closePath(); fillO(LG(-47, -12, '#3a2e4a', '#16111e'));
    ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-7, -45); ctx.lineTo(7, -27); ctx.stroke();
    ctx.fillStyle = '#4a3d5c'; ctx.fillRect(-9, -27, 18, 3); ctx.fillStyle = '#c9cdd6'; ctx.fillRect(-1.5, -27.5, 3, 4);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#c9cdd6'; ctx.save(); ctx.translate(-6 + i * 3, -25); ctx.rotate(0.4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, 0); ctx.lineTo(1, 5); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, -55, 9, 0, 7); fillO(LG(-64, -46, '#3a2e4a', '#1a1424'));
    ctx.fillStyle = '#e3c3a5'; rr(-1, -59, 10, 6, 2); ctx.fill();
    ctx.fillStyle = '#b8202f'; rr(-2, -53.5, 11, 5, 2); ctx.fill();
    glowDot(5.5, -57, 4, '255,77,94', 0.8); ctx.fillStyle = '#ffe0e4'; ctx.fillRect(4, -58, 3, 1.6);
    ctx.beginPath(); ctx.moveTo(-9, -57); ctx.quadraticCurveTo(-4, -73, 5, -65); ctx.lineTo(10, -56); ctx.quadraticCurveTo(2, -66, -9, -57); fillO('#2b2236');
    const ang = sw > 0 ? -0.6 - sw * 1.2 : 0.3;
    for (const [px, py, a0] of [[8, -34, ang], [-7, -32, 0.9]]) {
      ctx.save(); ctx.translate(px, py); ctx.rotate(a0);
      ctx.fillStyle = '#3a3040'; ctx.fillRect(-2, -2, 6, 4); ctx.fillStyle = '#b8202f'; ctx.fillRect(3, -3.5, 2, 7);
      ctx.beginPath(); ctx.moveTo(5, -2.2); ctx.lineTo(18, 0); ctx.lineTo(5, 2.2); ctx.closePath(); fillO(LG(-2, 2, '#ffffff', '#aab2c0'));
      ctx.restore();
    }
    if (sw > 0.3) { ctx.strokeStyle = `rgba(255,77,94,${sw * 0.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, -34, 22, -1.6, -0.2); ctx.stroke(); }
    hurt(h, 30, -72); ctx.restore();
  }

  function necro(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 11, 13), sw = h ? h.swing : 0;
    for (let i = 0; i < 2; i++) { const a = t * 1.3 + i * Math.PI; const sx = Math.cos(a) * 20, sy = -50 + Math.sin(a * 1.4) * 10; glowDot(sx, sy, 8, '107,224,184', 0.45); ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, 7); fillO('#e8f2ec'); ctx.fillStyle = '#1b1726'; ctx.fillRect(sx - 1.6, sy - 1, 1.2, 1.2); ctx.fillRect(sx + 0.4, sy - 1, 1.2, 1.2); }
    ctx.beginPath(); ctx.moveTo(-13, 0); for (let i = 0; i < 6; i++) ctx.lineTo(-13 + i * 5.2 + 2.6, -4 + (i % 2) * 5 + Math.sin(t * 4 + i) * 1.2); ctx.lineTo(13, 0); ctx.lineTo(8, -46); ctx.lineTo(-8, -46); ctx.closePath(); fillO(LG(-46, 0, '#2c3b40', '#10181a'));
    ctx.fillStyle = `rgba(107,224,184,${0.5 + 0.4 * Math.sin(t * 3)})`; for (const [ry, rx] of [[-36, -4], [-26, 3], [-16, -2]]) { ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(['ᚦ', 'ᛉ', 'ᛟ'][Math.abs(rx) % 3], rx, ry); }
    ctx.fillStyle = '#6be0b8'; ctx.fillRect(-1.2, -44, 2.4, 40);
    ctx.save(); ctx.translate(-9, -46); ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); fillO('#e8e2d0'); ctx.fillStyle = '#1b1726'; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, -2, 2, 2); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-11, -46); ctx.quadraticCurveTo(-13, -70, 2, -72); ctx.quadraticCurveTo(16, -68, 11, -46); ctx.closePath(); fillO(LG(-72, -46, '#33454c', '#162024'));
    ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.ellipse(2, -55, 7, 8, 0, 0, 7); ctx.fill();
    glowDot(2.5, -56, 3.5, '107,224,184', 0.9); glowDot(6.5, -56, 3.5, '107,224,184', 0.9);
    ctx.save(); ctx.translate(13, -2); ctx.rotate(sw * 0.3);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, -60); ctx.stroke();
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, -58); ctx.lineTo(6, -58); ctx.stroke();
    ctx.beginPath(); ctx.arc(1, -65, 5.5, 0, 7); fillO('#efe9d8'); ctx.fillStyle = '#1b1726'; ctx.fillRect(-1.5, -67, 2, 2.2); ctx.fillRect(2, -67, 2, 2.2); ctx.fillRect(-1, -62.5, 4, 1.2);
    for (let i = 0; i < 4; i++) { const fh = 7 + Math.sin(t * 9 + i * 2) * 3 + sw * 8; ctx.fillStyle = `rgba(107,224,184,${0.8 - i * 0.15})`; ctx.beginPath(); ctx.moveTo(-4 + i * 2.5, -70); ctx.quadraticCurveTo(-2 + i * 2, -70 - fh, 1 + i, -70); ctx.fill(); }
    ctx.restore();
    hurt(h, 32, -76); ctx.restore();
  }

  function bard(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 11, 12), sw = h ? h.swing : 0;
    cape(t, -48, '#7a3a8a', '#3e1a4a', 40, 16);
    ctx.save(); ctx.translate(-8 + step * 3, 0); rr(0, -22, 6, 20, 2); fillO('#4a3a6a'); rr(-1, -5, 8, 5, 2); fillO('#5a3d25'); ctx.restore();
    ctx.save(); ctx.translate(2 - step * 3, 0); rr(0, -22, 6, 20, 2); fillO('#e5484d'); rr(-1, -5, 8, 5, 2); fillO('#5a3d25'); ctx.restore();
    rr(-10, -47, 20, 29, 6); fillO(LG(-47, -18, '#ff9ad2', '#d0559a'));
    ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, -42 + i * 7, 1.6, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7a3a8a'; ctx.beginPath(); ctx.moveTo(-10, -47); ctx.lineTo(0, -35); ctx.lineTo(10, -47); ctx.fill();
    ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-6 + i * 4, -47, 2.4, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#5a3d25'; ctx.fillRect(-10, -24, 20, 3);
    ctx.beginPath(); ctx.arc(1, -55, 8, 0, 7); fillO('#f1c9a5');
    ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.arc(0, -56, 8.4, Math.PI * 0.6, Math.PI * 1.3); ctx.fill();
    ctx.fillStyle = '#1b1726'; ctx.fillRect(4, -57, 2, 2); ctx.strokeStyle = '#8a4a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(3, -52, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -61, 13, 3.6, -0.15, 0, 7); fillO('#5b3a9a'); ctx.beginPath(); ctx.ellipse(1, -63, 9, 5, -0.15, Math.PI, 0); fillO(LG(-68, -60, '#7a56c8', '#4a2f80'));
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-7, -63, 15, 1.6);
    const fw = Math.sin(t * 3) * 2;
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-5, -64); ctx.quadraticCurveTo(-18, -80 + fw, -26, -72 + fw); ctx.stroke();
    ctx.strokeStyle = '#ff8ac8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -64); ctx.quadraticCurveTo(-16, -76 + fw, -22, -71 + fw); ctx.stroke();
    ctx.save(); ctx.translate(4, -32); ctx.rotate(-0.5 - sw * 0.15);
    ctx.beginPath(); ctx.ellipse(6, 0, 10, 7.5, 0, 0, 7); fillO(LG(-7, 7, '#e0a050', '#9a6020'));
    ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(6, 0, 2.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a4a1a'; ctx.fillRect(15, -1.6, 15, 3.2); ctx.fillRect(29, -3.5, 5, 7);
    ctx.strokeStyle = 'rgba(255,240,200,.8)'; ctx.lineWidth = 0.5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(1, i * 1.2); ctx.lineTo(30, i * 1.2); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(9, -30 + (sw > 0 ? Math.sin(t * 40) * 1.5 : 0), 2.6, 0, 7); ctx.fill();
    for (let i = 0; i < 2; i++) { const p = (t * 0.7 + i * 0.5) % 1; ctx.fillStyle = `rgba(255,138,200,${(1 - p) * (0.5 + sw)})`; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i ? '♫' : '♪', 14 + i * 6 + Math.sin(t * 3 + i) * 3, -46 - p * 26); }
    hurt(h, 30, -82); ctx.restore();
  }

  function tinker(x, h, t, walk) {
    const { step } = begin(x, h, t, walk, 12, 13), sw = h ? h.swing : 0;
    // Rucksack mit Zahnrad und Schornstein
    rr(-19, -48, 12, 26, 3); fillO(LG(-48, -22, '#9a7a56', '#5e452c'));
    ctx.save(); ctx.translate(-13, -36); ctx.rotate(t * 2);
    ctx.fillStyle = '#c9a64a'; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-1.2, -6.5, 2.4, 3); } ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#5e452c'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#5b5f6b'; ctx.fillRect(-17, -58, 4, 11); ctx.fillRect(-18, -59, 6, 2);
    for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(210,210,220,${0.6 * (1 - p)})`; ctx.beginPath(); ctx.arc(-15 - p * 6, -62 - p * 18, 2.5 + p * 4, 0, 7); ctx.fill(); }
    legs(step, '#3a4a6a', '#24304a', '#2a2018', 6);
    rr(-10, -45, 20, 27, 5); fillO(LG(-45, -18, '#ffa04a', '#d0661a'));
    ctx.fillStyle = '#3a4a6a'; ctx.fillRect(-7, -45, 3, 18); ctx.fillRect(4, -45, 3, 18); ctx.fillRect(-10, -30, 20, 4);
    ctx.fillStyle = '#c9cdd6'; rr(-4, -40, 8, 6, 1.5); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(-6, -28, 1.4, 0, 7); ctx.arc(6, -28, 1.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#5b5f6b'; ctx.fillRect(-9, -26, 4, 6); ctx.fillStyle = '#9aa3ad'; ctx.fillRect(6, -27, 2, 8);
    ctx.beginPath(); ctx.arc(1, -53, 8, 0, 7); fillO('#f1c9a5');
    ctx.fillStyle = '#d0502a'; ctx.beginPath(); ctx.arc(0, -56, 8.6, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, -56); ctx.quadraticCurveTo(-13, -50, -10, -42); ctx.lineTo(-6, -48); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,150,.4)'; ctx.beginPath(); ctx.arc(6, -50, 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3040'; ctx.fillRect(-8, -58.5, 17, 3);
    for (const gx of [1, 7]) { ctx.beginPath(); ctx.arc(gx, -57, 3.4, 0, 7); fillO('#c9a64a'); ctx.fillStyle = RG(gx - 1, -58, 3, '#e8fbff', '#4fb0e8'); ctx.beginPath(); ctx.arc(gx, -57, 2.4, 0, 7); ctx.fill(); }
    sparkle(0, -58.5, 1.4, 0.9);
    ctx.save(); ctx.translate(8, -36); ctx.rotate(sw > 0 ? -0.9 - sw * 0.6 : 0.2);
    ctx.fillStyle = '#9aa3ad'; ctx.fillRect(0, -1.6, 13, 3.2); ctx.beginPath(); ctx.arc(14.5, 0, 4.2, 0.65, Math.PI * 2 - 0.65); ctx.lineWidth = 3; ctx.strokeStyle = '#c9cdd6'; ctx.stroke();
    ctx.restore();
    if (sw > 0.4) { for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,210,63,${sw})`; ctx.fillRect(18 + Math.cos(i * 1.7 + t * 20) * 6, -40 + Math.sin(i * 1.7 + t * 20) * 6, 2, 2); } }
    hurt(h, 36, -66); ctx.restore();
  }
  // Gefallene Helden: kippen um, Staub fliegt, die Seele steigt auf – danach bleiben sie liegen und fallen zurück
  function drawFallen(R, k, t) {
    const h = R.h[k], since = R.time - (h.deadAt == null ? R.time - 9 : h.deadAt);
    const x = R.pos[k] - Math.max(0, R.scroll - (h.deadScroll == null ? R.scroll : h.deadScroll));
    if (x < -70) return;
    h.hurtT = 0;
    const p = Math.min(1, since / 0.5);
    h.fall = p < 1 ? 1 - Math.pow(1 - p, 3) * (1 - p * 0.15) : 1;
    if (since < 0.12) { ctx.globalAlpha = 1; DRAW[k](x, h, t, false); const fa = 0.7 * (1 - since / 0.12); ctx.fillStyle = RG(x, GROUND - 40, 46, `rgba(255,255,255,${fa})`, 'rgba(255,255,255,0)'); ctx.beginPath(); ctx.arc(x, GROUND - 40, 46, 0, 7); ctx.fill(); }
    else { ctx.globalAlpha = since < 0.5 ? 1 : Math.max(0.55, 1 - (since - 0.5) * 0.25); DRAW[k](x, h, t, false); }
    ctx.globalAlpha = 1;
    if (since > 0.45 && since < 1.1) { const q = (since - 0.45) / 0.65; for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; ctx.fillStyle = `rgba(200,180,150,${0.55 * (1 - q)})`; ctx.beginPath(); ctx.arc(x - 18 + Math.cos(a) * 26 * q, GROUND - 2 + Math.sin(a) * 10 * q, 3 + q * 4, 0, 7); ctx.fill(); } }
    if (since > 0.3 && since < 2.4) {
      const q = (since - 0.3) / 2.1, sy = GROUND - 30 - q * 90, sx = x - 10 + Math.sin(q * 9) * 5, a = Math.sin(q * Math.PI) * 0.75;
      ctx.fillStyle = RG(sx, sy, 16, `rgba(220,235,255,${a * 0.6})`, 'rgba(220,235,255,0)'); ctx.beginPath(); ctx.arc(sx, sy, 16, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(240,248,255,${a})`; ctx.beginPath(); ctx.arc(sx, sy - 4, 6, Math.PI, 0); ctx.lineTo(sx + 6, sy + 6); ctx.quadraticCurveTo(sx + 3, sy + 3, sx, sy + 7); ctx.quadraticCurveTo(sx - 3, sy + 3, sx - 6, sy + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(40,40,60,${a})`; ctx.fillRect(sx - 3, sy - 5, 1.6, 2); ctx.fillRect(sx + 1.4, sy - 5, 1.6, 2);
    }
  }
  const SHOT_STYLE = { schleim: ['blob', '190,120,255'], goblin: ['stone', '154,163,173'], skelett: ['arrow', '232,226,208'], daemon: ['fire', '255,120,40'], golem: ['ice', '160,225,255'],
    frosch: ['blob', '150,230,110'], dorn: ['seed', '201,164,106'], fleder: ['ring', '200,140,255'], skorpion: ['blob', '184,255,106'], spinne: ['web', '240,248,255'],
    astral: ['star', '255,230,140'], pilz: ['spore', '210,180,255'], geist: ['orb', '120,255,220'], drache: ['fire', '255,150,60'], sturm: ['bolt', '255,248,180'] };
  const DRAW = { r: knight, w: guard, s: archer, m: mage, p: priest, t: tamer, a: assassin, n: necro, b: bard, d: druid, e: tinker };
  const HCOL = Object.fromEntries(HEROES.map(h => [h.id, h.color]));

  const campRun = { scroll: 0, fx: {} };
  function draw(t) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (cine) { drawCine(t); return; }
    const R = run && !run.dead ? run : null;
    if (R && R.shake > 0) ctx.translate((Math.random() - 0.5) * 6 * R.shake / 0.25, (Math.random() - 0.5) * 4 * R.shake / 0.25);
    const tower = R && R.mode === 'tower';
    const stage = R ? (tower ? 15 + R.stage * 2 : R.stage) : 1;
    const bm = biomeOf(stage), scroll = R ? R.scroll : 0, night = !R;
    const env = R && R.mode === 'ahnen' ? ahnEnv(R) : envOf(stage, night ? 'camp' : tower ? 'tower' : 'run');
    env.back(t, scroll); env.props(t, scroll);
    if (R && !tower && R.mode !== 'ahnen' && nightmare(stage)) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(170,40,60,.7)'; ctx.fillRect(0, 0, W, H); ctx.restore(); ctx.fillStyle = 'rgba(90,0,20,.22)'; ctx.fillRect(0, 0, W, H); }
    if (R) {
      const walking = R.enemies.length && R.enemies[0].x > R.frontX + 54;
      [...R.enemies].sort((a, b) => b.x - a.x).forEach(e => enemy(e, t));
      if (R.fx.wurzel > 0 || R.enemies.some(e => e.rooted > 0)) R.enemies.filter(e => e.rooted > 0).forEach(e => { ctx.strokeStyle = '#5e8c3a'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(e.x - 12 + i * 12, GROUND); ctx.quadraticCurveTo(e.x - 18 + i * 12, GROUND - 14, e.x - 8 + i * 10, GROUND - 22); ctx.stroke(); } });
      if (R.enemies.some(e => e.frozen > 0)) R.enemies.filter(e => e.frozen > 0).forEach(e => { ctx.fillStyle = 'rgba(180,225,255,.45)'; rr(e.x - 18, GROUND - 50, 36, 50, 6); ctx.fill(); });
      // Helden von hinten nach vorne zeichnen
      [...R.order].reverse().filter(k => !R.h[k].alive).forEach(k => drawFallen(R, k, t));
      [...R.order].reverse().filter(k => R.h[k].alive).forEach(k => drawHero(k, R.pos[k], R.h[k], t, walking));
      if (R.h.e && R.h.e.alive && st.e) { const n = st.e.turrets + (R.extraTurretT > 0 ? 1 : 0); for (let i = 0; i < n; i++) turret(R.pos.e + 24 + i * 14, t, R.turretT > 0.85 / Math.max(0.2, st.e.turretAps) ? 1 : 0, i >= st.e.turrets ? 0.85 : 1); }
      R.minions.forEach((mi, i) => minion(R.frontX + 26 + (i % 4) * 9, t, mi.swing || 0, Math.min(1, mi.t * 2)));
      if (R.h.t && R.h.t.alive) {
        const n = st.t.wolves + (R.packT > 0 ? 2 + st.t.packBonus : 0);
        for (let i = 0; i < n; i++) wolf(R.frontX + 22 - i * 10 + (i >= st.t.wolves ? 6 : 0), t, walking, i >= st.t.wolves ? 0.75 : 1);
      }
      for (const k of R.order) {
        const h = R.h[k]; if (!h.alive) continue;
        const y = GROUND - (k === 'w' ? 96 : k === 'm' ? 92 : 88);
        ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(R.pos[k] - 14, y, 28, 5, 2); ctx.fill();
        ctx.fillStyle = HCOL[k]; rr(R.pos[k] - 14, y, 28 * Math.max(0, h.hp / st[k].hp), 5, 2); ctx.fill();
        if (h.shield > 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(R.pos[k] - 14, y - 4, 28 * Math.min(1, h.shield / st[k].hp), 3, 1.5); ctx.fill();
          ctx.strokeStyle = 'rgba(255,228,138,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(R.pos[k], GROUND - 40, 20, 46, 0, 0, 7); ctx.stroke(); }
      }
      if (R.mode === 'ahnen') ahnWorld(R, t);
      drawComps(t, R);
      // Geschosse
      for (const a of R.arrows) {
        const p = Math.min(1, a.t / a.d), arc = a.kind === 'hag' ? 50 : a.kind === 'feuer' || a.kind === 'licht' ? 6 : 14;
        const x = a.x + (a.tx - a.x) * p, y = a.y + (a.ty - a.y) * p - Math.sin(p * Math.PI) * arc;
        if (a.kind === 'feuer') { ctx.fillStyle = 'rgba(255,140,60,.35)'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); continue; }
        if (a.kind === 'kunai') { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 25); ctx.fillStyle = '#d8dce4'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -1.5); ctx.lineTo(7, 0); ctx.lineTo(0, 1.5); ctx.fill(); } ctx.restore(); continue; }
        if (a.kind === 'nekro') { ctx.fillStyle = 'rgba(107,224,184,.35)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#c8ffe8'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); continue; }
        if (a.kind === 'note') { ctx.fillStyle = '#ff8ac8'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♪', x, y + 5 + Math.sin(p * 12) * 3); continue; }
        if (a.kind === 'bomb') { ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = Math.sin(t * 40) > 0 ? '#ffd23f' : '#ff7a3d'; ctx.fillRect(x + 2, y - 7, 2, 3); if (p > 0.92) { ctx.fillStyle = 'rgba(255,170,60,.7)'; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); } continue; }
        if (a.kind === 'shot') { ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x - 3, y - 1, 6, 2); continue; }
        if (a.kind === 'licht') { ctx.strokeStyle = 'rgba(255,240,170,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 6, y); ctx.stroke(); continue; }
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(a.ty - a.y - Math.cos(p * Math.PI) * arc * Math.PI, a.tx - a.x));
        ctx.fillStyle = a.kind === 'gift' ? '#9be36b' : '#e8e2d0'; ctx.fillRect(-9, -1, 14, 2); ctx.fillStyle = '#b7bcc6'; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, 0); ctx.lineTo(5, 3); ctx.fill();
        ctx.restore();
      }
      // Geschosse der Gegner
      for (const s of R.eshots) {
        const st = SHOT_STYLE[s.kind] || ['blob', '170,120,240'], kind = st[0], rgb = st[1];
        const p = Math.min(1, s.t / s.d), arc = kind === 'blob' || kind === 'stone' || kind === 'seed' || kind === 'spore' ? 42 : kind === 'arrow' ? 16 : 8;
        const x = s.x + (s.tx - s.x) * p, y = s.y + (s.ty - s.y) * p - Math.sin(p * Math.PI) * arc;
        if (kind === 'fire') { glowDot(x + 4, y, 11, rgb, 0.6); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 2, 0, 7); ctx.fill(); }
        else if (kind === 'ice') { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 12); glowDot(0, 0, 8, rgb, 0.5); ctx.fillStyle = '#e6f8ff'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(3, 0); ctx.lineTo(0, 6); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
        else if (kind === 'arrow') { const a = Math.atan2(-(s.ty - s.y) + Math.cos(p * Math.PI) * arc * Math.PI, -(s.tx - s.x)); ctx.save(); ctx.translate(x, y); ctx.rotate(-a + Math.PI); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-9, -1, 14, 2); ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, 0); ctx.lineTo(5, 3); ctx.fill(); ctx.fillStyle = '#c44a3a'; ctx.fillRect(-10, -2.5, 3, 1.5); ctx.fillRect(-10, 1, 3, 1.5); ctx.restore(); }
        else if (kind === 'stone' || kind === 'seed') { ctx.fillStyle = kind === 'seed' ? '#c9a46a' : '#9aa3ad'; ctx.beginPath(); ctx.ellipse(x, y, 3.2, kind === 'seed' ? 2.2 : 3, t * 8, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.stroke(); }
        else if (kind === 'web') { ctx.strokeStyle = 'rgba(240,248,255,.9)'; ctx.lineWidth = 1; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 5); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 6, Math.sin(an) * 6); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 7); ctx.stroke(); ctx.restore(); }
        else if (kind === 'star') { glowDot(x, y, 9, rgb, 0.7); ctx.save(); ctx.translate(x, y); ctx.rotate(t * 8); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 1.6 : 5, an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
        else if (kind === 'bolt') { ctx.strokeStyle = '#fff8c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, y - 3); ctx.lineTo(x + 4, y + 2); ctx.lineTo(x, y - 2); ctx.lineTo(x - 6, y + 2); ctx.stroke(); glowDot(x, y, 8, rgb, 0.6); }
        else if (kind === 'ring') { for (let i = 0; i < 2; i++) { ctx.strokeStyle = `rgba(${rgb},${0.9 - i * 0.35})`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x + i * 6, y, 4 + i * 2, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke(); } }
        else if (kind === 'orb' || kind === 'spore') { glowDot(x, y, 9, rgb, 0.75); ctx.fillStyle = `rgb(${rgb})`; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.2, 0, 7); ctx.fill(); }
        else { ctx.fillStyle = `rgba(${rgb},.95)`; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - 1.5, y - 1, 1.6, 1, 0, 0, 7); ctx.fill(); }
      }
      // Effekte der Fähigkeiten
      const fx = R.fx;
      if (fx.wirbel > 0 && R.pos.r) { ctx.strokeStyle = `rgba(255,220,150,${fx.wirbel * 1.6})`; ctx.lineWidth = 5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(R.pos.r, GROUND - 30, 40 + i * 22 + (0.5 - fx.wirbel) * 80, t * 12 + i, t * 12 + i + 2.4); ctx.stroke(); } }
      if (fx.blitz > 0) bolt(fx.blitzX, fx.blitz, '210,235,255');
      if (fx.heil > 0) { ctx.fillStyle = `rgba(126,224,138,${fx.heil * 0.5})`; ctx.beginPath(); ctx.arc(R.frontX - 40, GROUND - 40, 120 * (1 - fx.heil), 0, 7); ctx.fill(); }
      if (fx.w_wall > 0 && R.pos.w) { ctx.strokeStyle = `rgba(127,178,255,${fx.w_wall * 1.6})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(R.pos.w + 20, GROUND - 10, 30 + (0.5 - fx.w_wall) * 220, -1.2, 0.2); ctx.stroke(); }
      if (fx.m_meteor > 0) { const p = 1 - fx.m_meteor * 2; for (let i = 0; i < 4; i++) { const mx = 230 + i * 60, my = -20 + p * (GROUND - 10); ctx.fillStyle = 'rgba(255,120,40,.4)'; ctx.beginPath(); ctx.arc(mx - 10, my - 16, 12, 0, 7); ctx.fill(); ctx.fillStyle = '#ffb070'; ctx.beginPath(); ctx.arc(mx, my, 9, 0, 7); ctx.fill(); }
        if (fx.m_meteor < 0.15) { ctx.fillStyle = `rgba(255,170,80,${fx.m_meteor * 3})`; ctx.fillRect(0, 0, W, H); } }
      if (fx.m_eis > 0) { ctx.fillStyle = `rgba(190,230,255,${fx.m_eis * 0.6})`; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 20; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(hash(i) * W, (hash(i + 3) * GROUND + t * 120) % GROUND, 2, 2); } }
      if (fx.m_kette > 0 && fx.chain) { ctx.strokeStyle = `rgba(226,201,255,${fx.m_kette * 2})`; ctx.lineWidth = 3; ctx.beginPath(); let px = R.pos.m || 60, py = GROUND - 60; ctx.moveTo(px, py); for (const x of fx.chain) { for (let j = 1; j <= 3; j++) ctx.lineTo(px + (x - px) * j / 3 + (Math.random() - 0.5) * 12, py + (GROUND - 30 - py) * j / 3 + (Math.random() - 0.5) * 14); px = x; py = GROUND - 30; } ctx.stroke(); }
      if (fx.s_falke > 0) bird(fx.falkeX, fx.s_falke, t);
      if (fx.a_schatten > 0 && fx.shadowXs) fx.shadowXs.forEach(sx => { ctx.fillStyle = `rgba(60,20,80,${fx.a_schatten * 1.2})`; ctx.beginPath(); ctx.arc(sx + 14, GROUND - 26, 22, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(255,107,122,${fx.a_schatten * 2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 12, GROUND - 46); ctx.lineTo(sx + 12, GROUND - 10); ctx.moveTo(sx + 12, GROUND - 46); ctx.lineTo(sx - 12, GROUND - 10); ctx.stroke(); });
      if (fx.n_raub > 0 && fx.raubX) { ctx.strokeStyle = `rgba(107,224,184,${fx.n_raub * 2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx.raubX, GROUND - 30); ctx.quadraticCurveTo((fx.raubX + (R.pos.n || 80)) / 2, GROUND - 120, R.pos.n || 80, GROUND - 60); ctx.stroke(); }
      if (fx.n_fluch > 0) { ctx.fillStyle = `rgba(40,120,90,${fx.n_fluch * 0.5})`; ctx.fillRect(R.frontX + 30, 0, W, H); }
      R.enemies.forEach(e => { if (e.cursed > 0) { ctx.fillStyle = 'rgba(107,224,184,.8)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☠', e.x, GROUND - (e.boss ? 176 : 66)); } });
      if (R.songT > 0) for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,138,200,${Math.min(1, R.songT) * 0.8})`; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i % 2 ? '♫' : '♪', 40 + ((i * 47 + t * 40) % 200), GROUND - 90 - Math.sin(t * 3 + i) * 12); }
      if (fx.b_wiegen > 0) R.enemies.filter(e => e.sleep > 0).forEach(e => { ctx.fillStyle = 'rgba(220,220,255,.9)'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('z', e.x + 8, GROUND - 70 - (t * 20 % 14)); });
      if (fx.b_schall > 0 && fx.schallX) { const rr2 = (0.5 - fx.b_schall) * 500; ctx.strokeStyle = `rgba(255,138,200,${fx.b_schall * 1.8})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(fx.schallX, GROUND - 40, rr2, -0.8, 0.8); ctx.stroke(); }
      if (R.roarT > 0) { ctx.strokeStyle = `rgba(155,209,74,${Math.min(1, R.roarT) * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(R.frontX - 50, GROUND - 40, 110, 56, 0, 0, 7); ctx.stroke(); }
      if (fx.d_adler > 0 && fx.adlerXs) fx.adlerXs.forEach((ax, i) => bird(ax + i * 6, fx.d_adler, t + i));
      if (fx.t_sprung > 0 && fx.sprungX) wolf(fx.sprungX - 20 * fx.t_sprung * 2, t, true);
      if (fx.p_segen > 0 || fx.p_schild > 0) { const v = Math.max(fx.p_segen || 0, fx.p_schild || 0); ctx.fillStyle = `rgba(255,228,138,${v * 0.35})`; ctx.fillRect(0, 0, W, H); }
      if (fx.p_wieder > 0) { ctx.fillStyle = `rgba(255,240,180,${fx.p_wieder})`; ctx.fillRect(0, 0, W, 6); }
      if (R.buffT > 0) { ctx.strokeStyle = 'rgba(255,181,71,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(R.frontX - 50, GROUND + 2, 90 + Math.sin(t * 10) * 3, 8, 0, 0, 7); ctx.stroke(); }
      sigFx(R, t);
      if (R.fx.phoenix > 0) { ctx.fillStyle = `rgba(255,154,61,${Math.min(1, R.fx.phoenix) * 0.4})`; ctx.fillRect(0, 0, W, H); }
      env.front(t, scroll);
      if (R.mode === 'ahnen') ahnScreen(R, t);
      if (!tower && R.mode !== 'ahnen' && nightmare(stage)) { parts(t, 14, { type: 'ember', rgb: '255,60,60', vx: 4, vy: -18, size: 1.4, alpha: 0.8, seed: 40 }); vignette(0.45, '60,0,10'); }
      for (const p of R.parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); }
      ctx.globalAlpha = 1;
      for (const f of R.floats) { ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = `${f.size}px "Bungee","Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); }
      ctx.globalAlpha = 1;
      const hg = ctx.createLinearGradient(0, 0, 0, 40); hg.addColorStop(0, 'rgba(15,12,22,.75)'); hg.addColorStop(1, 'rgba(15,12,22,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 40);
      if (R.mode === 'ahnen') ahnHud(R, t); else {
      ctx.font = '15px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
      ctx.fillText(tower ? `Turm · Etage ${R.stage}` : `Stufe ${R.stage}`, 12, 22);
      ctx.font = '12px "Figtree",sans-serif';
      const bossNow = tower || (R.rules && R.rules.includes('boss')) ? R.stage % 5 === 0 : R.stage % 10 === 0;
      ctx.fillStyle = bossNow ? '#c9a6ff' : 'rgba(255,255,255,.8)';
      ctx.fillText(bossNow ? `Boss: ${bossOf(stage)}` : tower ? `Rekord ${S.towerBest}` : `${zoneName(R.stage)} · Grenze ${st.cap === Infinity ? '∞' : st.cap}`, tower ? 170 : 106, 21);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffcf4a'; if (R.mode === 'normal') ctx.fillText(`+${fmt(R.gold)} Gold`, W - 12, 21);
      if (R.mode === 'weekly') { ctx.fillStyle = '#ffd23f'; ctx.fillText('Wochen-Herausforderung', W - 12, 21); }
      if (R.mode === 'exp') { const ms = MISSION[R.mission]; ctx.fillStyle = '#c8f08a'; ctx.fillText(`${ms.name}: ${ms.bosses ? `Bosse ${R.bossKills}/${ms.bosses}` : `Welle ${R.waves}/${ms.waves}`}`, W - 12, 21); }
      }
      if (R.bannerT > 0) {
        const a = Math.max(0, Math.min(1, R.bannerT * 2, (2.2 - R.bannerT) * 4)), y = 92;
        ctx.globalAlpha = a; ctx.fillStyle = 'rgba(30,10,40,.75)'; ctx.fillRect(0, y - 26, W, 44);
        ctx.fillStyle = '#c9a6ff'; ctx.fillRect(0, y - 26, W, 2); ctx.fillRect(0, y + 16, W, 2);
        ctx.textAlign = 'center'; ctx.font = '22px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(`BOSS · ${bossOf(stage)}`, W / 2 + (1 - a) * 40, y + 4);
        ctx.globalAlpha = 1;
      }
    } else {
      // Lager
      const fx = 250;
      lightPool(fx, GROUND - 14, 150 + Math.sin(t * 5) * 6, '255,150,60', 0.32); lightPool(fx, GROUND - 8, 60, '255,200,120', 0.25);
      ctx.beginPath(); ctx.moveTo(350, GROUND); ctx.lineTo(400, GROUND - 70); ctx.lineTo(450, GROUND); fillO('#7a6046');
      ctx.fillStyle = '#2a1f17'; ctx.beginPath(); ctx.moveTo(390, GROUND); ctx.lineTo(400, GROUND - 32); ctx.lineTo(410, GROUND); ctx.fill();
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(400, GROUND - 70); ctx.lineTo(400, GROUND - 88); ctx.lineTo(417, GROUND - 82); ctx.lineTo(400, GROUND - 76); ctx.fill();
      campFire(fx, t, true);
      if (!(run && run.dead)) { const pa = 0.25 + 0.2 * Math.sin(t * 3); ctx.strokeStyle = `rgba(255,210,140,${pa})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.ellipse(fx, GROUND + 2, 40, 9, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      const camp = HEROES.filter(h => st[h.id] && (!st.field || st.field.includes(h.id))).map(h => h.id);
      const spots = {}; let fr = 0, bk = 0;
      for (const k of ['w', 'd', 't']) if (camp.includes(k)) spots[k] = 296 + 30 * fr++;
      for (const k of ['r', 's', 'a', 'm', 'n', 'b', 'e', 'p']) if (camp.includes(k)) spots[k] = 210 - 30 * bk++;
      camp.forEach(k => DRAW[k](spots[k], null, t, false));
      if (camp.includes('t')) wolf(spots.t + 32, t, false);
      if (camp.includes('e')) turret(spots.e - 22, t, 0);
      drawComps(t, null);
      env.front(t, 0);
      ctx.textAlign = 'center'; ctx.font = '20px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#ffb547';
      const done = run && run.dead;
      ctx.fillText(done ? (run.mode === 'tower' ? `Turm: Etage ${run.stage}` : run.victory ? `Stufengrenze ${st.cap} erreicht!` : `Gefallen auf Stufe ${run.stage}`) : 'Lager', W / 2, 42);
      ctx.font = '12px "Figtree",sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText(done ? `${run.kills} Gegner${run.gold ? ` · +${fmt(run.gold)} Gold` : ''}${run.souls ? ` · +${run.souls} Seelen` : ''}${run.runes.length ? ` · ${run.runes.length} Runen` : ''}` : 'Tippe aufs Lagerfeuer, um deine Truppe anzupassen', W / 2, 64);
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function campFire(fx, t, pool) {
    if (!pool) { lightPool(fx, GROUND - 14, 120 + Math.sin(t * 5) * 6, '255,150,60', 0.3); lightPool(fx, GROUND - 8, 50, '255,200,120', 0.25); }
    shadow(fx, 26);
    ctx.fillStyle = '#5a3d25'; ctx.save(); ctx.translate(fx, GROUND - 3); ctx.rotate(0.25); ctx.fillRect(-20, -3, 40, 6); ctx.rotate(-0.5); ctx.fillRect(-20, -3, 40, 6); ctx.restore();
    for (let i = 0; i < 6; i++) { const h = 20 + Math.sin(t * 9 + i * 1.7) * 7; ctx.fillStyle = ['#e5484d', '#ffb547', '#ffd23f'][i % 3]; ctx.beginPath(); ctx.moveTo(fx - 15 + i * 6, GROUND - 6); ctx.quadraticCurveTo(fx - 12 + i * 5, GROUND - 6 - h, fx - 7 + i * 6, GROUND - 6); ctx.fill(); }
    for (let i = 0; i < 6; i++) { const p = ((t * 0.6 + i / 6) % 1); ctx.fillStyle = `rgba(255,200,120,${1 - p})`; ctx.fillRect(fx + Math.sin(i * 3 + t) * 10, GROUND - 20 - p * 70, 2, 2); }
  }
  // ---------- Truppen-Menü: Porträts und Szene ----------
  const PORT = {};
  function portraitURL(k) {
    if (PORT[k]) return PORT[k];
    const Z = 3, c = document.createElement('canvas'); c.width = 120 * Z; c.height = 130 * Z;
    const main = ctx; ctx = c.getContext('2d');
    try { ctx.setTransform(Z, 0, 0, Z, 0, 0); ctx.translate(0, 120 - GROUND); DRAW[k](60, null, 0.3, false); } finally { ctx = main; }
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, w = c.width;
    let top = c.height;
    for (let y = 0; y < 110 * Z && top === c.height; y++) for (let x = 50 * Z; x < 70 * Z; x++) if (d[(y * w + x) * 4 + 3] > 80) { top = y; break; }
    const dy = { m: 12, r: 4, b: 4, n: 2 }[k] || 0, size = 42 * Z, out = document.createElement('canvas'); out.width = out.height = 120;
    out.getContext('2d').drawImage(c, 60 * Z - size / 2 + 2 * Z, Math.max(0, top + (dy - 4) * Z), size, size, 0, 0, 120, 120);
    return (PORT[k] = out.toDataURL());
  }
  function squadSpots(ids, slots) {
    const ord = LINE_ORDER.filter(k => ids.includes(k)), n = Math.max(slots, ord.length), gap = Math.min(58, 300 / Math.max(1, n - 1)), c = 280;
    const xs = Array.from({ length: n }, (_, i) => c + (n - 1) * gap / 2 - i * gap);
    return { heroes: ord.map((k, i) => ({ k, x: xs[i] })), empty: xs.slice(ord.length) };
  }
  function roleRing(x, col, t, empty) {
    ctx.save();
    if (empty) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(220,215,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 21, 6.5, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = 'rgba(220,215,255,.45)'; ctx.font = '16px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', x, GROUND - 14);
      ctx.restore(); return;
    }
    const p = 0.5 + 0.5 * Math.sin(t * 2.6 + x * 0.05);
    ctx.globalAlpha = 0.35 + 0.25 * p; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 26 + p * 2, 8 + p, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 22, 6.5, 0, 0, 7); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, GROUND + 3, 14, 4, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  function drawSquad(t, sq) {
    const main = ctx; ctx = sq.cv.getContext('2d');
    try {
      const sc = sq.cv.width / W, off = sq.offL != null ? sq.offL : Math.max(0, sq.cv.height / sc - H);
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      // Oben: die Leere
      const g = ctx.createLinearGradient(0, 0, 0, off + 60); g.addColorStop(0, '#020309'); g.addColorStop(0.55, '#060920'); g.addColorStop(1, '#060920');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, off + 60);
      // Unten: das Lager mit der Truppe
      ctx.save(); ctx.translate(0, off); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      ENV_CAMP.back(t, 0); ENV_CAMP.props(t, 0);
      campFire(64, t);
      const sp = squadSpots(sq.ids, sq.slots);
      sp.empty.forEach(x => roleRing(x, null, t, true));
      sp.heroes.forEach(({ k, x }) => roleRing(x, ROLE_INFO[ROLE[k]].col, t));
      [...sp.heroes].sort((a, b) => a.x - b.x).forEach(({ k, x }) => DRAW[k](x, null, t, false));
      ENV_CAMP.front(t, 0);
      ctx.textAlign = 'center'; ctx.font = '700 10px "Figtree",sans-serif';
      sp.heroes.forEach(({ k, x }) => { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(HERO_BY_ID[k].name, x + 0.8, GROUND + 25.8); ctx.fillStyle = ROLE_INFO[ROLE[k]].col; ctx.fillText(HERO_BY_ID[k].name, x, GROUND + 25); });
      ctx.restore();
      // Übergang von der Leere ins Lager
      const b = ctx.createLinearGradient(0, off - 4, 0, off + 120); b.addColorStop(0, 'rgba(6,9,32,1)'); b.addColorStop(0.5, 'rgba(6,9,32,.55)'); b.addColorStop(1, 'rgba(6,9,32,0)');
      ctx.fillStyle = b; ctx.fillRect(0, off - 4, W, 124);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const nx = (hash(i + 40) * W + Math.sin(t * 0.07 + i) * 30), ny = hash(i + 50) * (off + 40), r = 80 + hash(i + 60) * 90;
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, r); ng.addColorStop(0, i % 2 ? 'rgba(110,70,220,.16)' : 'rgba(40,110,230,.13)'); ng.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ng; ctx.fillRect(nx - r, ny - r, r * 2, r * 2);
      }
      for (let i = 0; i < 110; i++) { const a = 0.25 + 0.6 * hash(i + 70) * (0.6 + 0.4 * Math.sin(t * (1 + hash(i) * 2) + i)); ctx.fillStyle = `rgba(${200 + hash(i + 5) * 55 | 0},${210 + hash(i + 6) * 45 | 0},255,${a})`; const s = hash(i + 80) > 0.9 ? 2 : 1.2; ctx.fillRect(hash(i + 11) * W, hash(i + 23) * (off + 40), s, s); }
      ctx.restore();
      sq.off = off; sq.spots = sp;
    } finally { ctx = main; }
  }
  // ---------- Animationen: Wiedergeburt und Krönung (Aufstieg) ----------
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - Math.pow(1 - clamp01(x), 3);
  const seg = (T, a, b) => clamp01((T - a) / (b - a));
  function crownIcon(x, y, s, glow) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (glow) { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 28); g.addColorStop(0, `rgba(255,220,110,${glow})`); g.addColorStop(1, 'rgba(255,220,110,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 28, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-14, -8); ctx.lineTo(-6, -1); ctx.lineTo(0, -12); ctx.lineTo(6, -1); ctx.lineTo(14, -8); ctx.lineTo(12, 6); ctx.closePath(); fillO('#ffd23f');
    ctx.fillStyle = '#e0a020'; ctx.fillRect(-12, 2, 24, 4);
    ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(0, -2, 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#3b7ad6'; ctx.beginPath(); ctx.arc(-7, 0.5, 1.7, 0, 7); ctx.arc(7, 0.5, 1.7, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff6c8'; for (const [px, py] of [[-14, -8], [0, -12], [14, -8]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function starIcon(x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function rays(cx, cy, a, t, rgb) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.12);
    for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = `rgba(${rgb},${a * (i % 2 ? 0.07 : 0.15)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -340); ctx.lineTo(22, -340); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function bigText(text, y, size, col, a, sc) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y); ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.font = `${size}px "Bungee","Arial Black",sans-serif`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,10,30,.8)'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  function cineBg(t) {
    const bm = biomeOf(1);
    sky(bm, t, true);
    range('#2a2745', 0.12, 150, 40, 0.01, 0, true); range('#25313a', 0.3, 170, 22, 0.013, 0); range('#1c2a22', 0.55, 196, 14, 0.022, 0);
    ground(bm, 0, true);
  }
  function lineup(ids, center) {
    const order = ['r', 'w', 'd', 's', 'a', 'm', 'n', 'p', 'b', 't', 'e'].filter(k => ids.includes(k));
    const xs = {}; const rest = order.filter(k => k !== center);
    if (order.includes(center)) xs[center] = 240;
    rest.forEach((k, i) => (xs[k] = 240 + (i % 2 ? 1 : -1) * (52 + Math.floor(i / 2) * 46)));
    return xs;
  }
  function drawTeam(ids, xs, t, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    [...ids].sort((a, b) => Math.abs(xs[b] - 240) - Math.abs(xs[a] - 240)).forEach(k => { if (xs[k] != null) DRAW[k](xs[k], null, t, false); });
    if (ids.includes('t') && xs.t != null) wolf(xs.t + 30, t, false);
    ctx.restore();
  }
  function hint(T, dur) {
    const a = T > 0.6 && T < dur - 0.4 ? 0.7 : 0;
    if (!a) return;
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = '11px "Figtree",sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(T > dur - 1.6 ? 'Tippen zum Fortfahren' : 'Tippen zum Überspringen', W / 2, H - 10); ctx.globalAlpha = 1;
  }
  function drawCine(t) {
    const c = cine, T = c.t;
    cineBg(t);
    if (c.kind === 'rebirth') {
      const oldTeam = c.team && c.team.length ? c.team : ['r'];
      const newTeam = HEROES.filter(h => st[h.id] && st.field.includes(h.id)).map(h => h.id);
      // 1) Licht steigt auf, die alte Gruppe löst sich auf
      const up = seg(T, 0, 1.7);
      if (T < 2) {
        const xs = lineup(oldTeam, 'r');
        drawTeam(oldTeam, xs, t, 1 - up * 0.8);
        for (const k of oldTeam) {
          const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, 'rgba(201,166,255,0)'); g.addColorStop(1, `rgba(220,200,255,${up * 0.75})`);
          ctx.fillStyle = g; ctx.fillRect(xs[k] - 16 - up * 6, 0, 32 + up * 12, GROUND);
        }
        for (let i = 0; i < 46; i++) {
          const k = oldTeam[i % oldTeam.length], x0 = xs[k] + (hash(i) - 0.5) * 34;
          const p = (T * (0.7 + hash(i + 9) * 0.8) + hash(i + 3)) % 1.2;
          if (p > up * 1.2) continue;
          ctx.fillStyle = i % 3 ? 'rgba(201,166,255,.9)' : 'rgba(255,255,255,.95)';
          ctx.fillRect(x0 + Math.sin(T * 6 + i) * 6, GROUND - 10 - p * 190, 2, 2);
        }
      }
      // 3) Neue Gruppe erscheint
      if (T >= 1.9) {
        const a = seg(T, 1.9, 2.6), xs = lineup(newTeam, 'r');
        drawTeam(newTeam, xs, t, a);
        const r = ease(seg(T, 1.9, 3)) * 300;
        ctx.strokeStyle = `rgba(201,166,255,${1 - seg(T, 1.9, 3)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(240, GROUND - 30, r, r * 0.45, 0, 0, 7); ctx.stroke();
        // Sterne fliegen ins Konto
        const n = Math.max(1, Math.min(12, c.amount || 1)), target = [W - 60, 24];
        let arrived = 0;
        for (let i = 0; i < n; i++) {
          const s0 = 2.3 + i * 0.09, p = seg(T, s0, s0 + 0.9);
          if (p >= 1) { arrived++; continue; }
          if (p <= 0) continue;
          const ang = i / n * Math.PI * 2, bx = 240 + Math.cos(ang) * 60, by = 120 + Math.sin(ang) * 30;
          const e = ease(p), x = bx + (target[0] - bx) * e, y = by + (target[1] - by) * e - Math.sin(p * Math.PI) * 40;
          starIcon(x, y, 6, '#ffd23f');
        }
        if (T > 2.3) {
          const shown = Math.round(c.before + (c.amount || 0) * arrived / n);
          ctx.fillStyle = 'rgba(15,12,22,.65)'; rr(W - 132, 10, 122, 26, 13); ctx.fill();
          starIcon(W - 116, 23, 7, '#ffd23f'); ctx.textAlign = 'left'; ctx.font = '13px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(fmt(shown), W - 104, 28);
        }
        const tp = seg(T, 2.0, 2.5);
        bigText(`WIEDERGEBURT ${c.n}`, 78, 26, '#e6d4ff', tp, 0.6 + 0.4 * ease(tp));
        if (c.amount) bigText(`+${fmt(c.amount)} Sterne`, 104, 15, '#ffd23f', seg(T, 2.6, 3), 1);
      }
      // 2) Weißer Blitz
      const fl = T < 1.8 ? seg(T, 1.5, 1.8) : 1 - seg(T, 1.8, 2.5);
      if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, H); }
    } else {
      // Krönung
      const team = HEROES.filter(h => st[h.id] && st.field.includes(h.id)).map(h => h.id), xs = lineup(team.includes('r') ? team : ['r', ...team], 'r');
      ctx.fillStyle = 'rgba(50,12,70,.45)'; ctx.fillRect(0, 0, W, H);
      const headY = GROUND - 78, land = 3.8;
      rays(240, headY, seg(T, 0.4, 2) * (T > land ? 1.6 : 1), t, '255,215,110');
      // Lichtsäule von oben
      const beam = seg(T, 0.9, 1.6) * (1 - seg(T, land + 0.2, land + 1.2) * 0.6);
      if (beam > 0) { const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, `rgba(255,236,170,${beam * 0.55})`); g.addColorStop(1, `rgba(255,236,170,${beam * 0.15})`); ctx.fillStyle = g; ctx.fillRect(222, 0, 36, GROUND); }
      drawTeam(team.filter(k => k !== 'r'), xs, t, 0.9);
      knight(240, null, t, false);
      // Krone schwebt herab
      const p = seg(T, 1.2, land);
      if (T < land) {
        const y = -30 + (headY + 30) * ease(p), x = 240 + Math.sin(T * 2.6) * 10 * (1 - p), s = 1.5 - 0.6 * ease(p);
        for (let i = 0; i < 10; i++) { const q = (T * 1.4 + i / 10) % 1; ctx.fillStyle = `rgba(255,236,170,${(1 - q) * 0.9})`; ctx.fillRect(x + (hash(i) - 0.5) * 26, y - q * 50, 2, 2); }
        if (T > 1.2) crownIcon(x, y, s, 0.6);
      } else {
        crownIcon(240, headY, 0.9, 0.35 + 0.15 * Math.sin(t * 4));
        const b = seg(T, land, land + 1.1);
        ctx.strokeStyle = `rgba(255,215,110,${1 - b})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(240, headY, ease(b) * 230, 0, 7); ctx.stroke();
        for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + hash(i), r = ease(b) * (70 + hash(i + 5) * 90); ctx.fillStyle = `rgba(255,${200 + (i % 3) * 20},120,${1 - b})`; ctx.fillRect(240 + Math.cos(a) * r, headY + Math.sin(a) * r * 0.8, 3, 3); }
        const f = 1 - seg(T, land, land + 0.6); if (f > 0) { ctx.fillStyle = `rgba(255,236,170,${f * 0.85})`; ctx.fillRect(0, 0, W, H); }
      }
      // Titel
      if (T < land) bigText(`AUFSTIEG ${c.n}`, 44, 16, '#e6d4ff', seg(T, 0.5, 1.1) * (1 - seg(T, land - 0.4, land)), 1);
      else {
        const tp = seg(T, land + 0.2, land + 0.7);
        bigText('GEKRÖNT!', 64, 30, '#ffd23f', tp, 0.6 + 0.4 * ease(tp));
        bigText(`Aufstieg ${c.n}`, 88, 14, '#e6d4ff', seg(T, land + 0.5, land + 0.9), 1);
      }
      // Kronen fliegen als Währung in den Zähler
      if (T > land + 0.5) {
        const n = Math.max(1, Math.min(14, c.amount || 1)), target = [W - 116, 23];
        let arrived = 0;
        for (let i = 0; i < n; i++) {
          const s0 = land + 0.7 + i * 0.1, q = seg(T, s0, s0 + 0.95);
          if (q >= 1) { arrived++; continue; }
          if (q <= 0) continue;
          const e = ease(q), x = 240 + (target[0] - 240) * e + Math.sin(i * 2.1) * 40 * Math.sin(q * Math.PI), y = headY + (target[1] - headY) * e - Math.sin(q * Math.PI) * 50;
          crownIcon(x, y, 0.5, 0.4);
        }
        const shown = Math.round(c.before + (c.amount || 0) * arrived / n);
        ctx.fillStyle = 'rgba(15,12,22,.7)'; rr(W - 134, 9, 124, 28, 14); ctx.fill();
        crownIcon(W - 116, 23, 0.55, arrived ? 0.5 : 0); ctx.textAlign = 'left'; ctx.font = '13px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(fmt(shown), W - 100, 28);
        if (arrived === n) bigText(`+${fmt(c.amount)} Kronen`, 112, 15, '#ffd23f', seg(T, land + 0.7 + n * 0.1 + 0.9, land + 1.6 + n * 0.1 + 0.9), 1);
      }
      const fin = seg(T, 0, 0.8); if (fin < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fin})`; ctx.fillRect(0, 0, W, H); }
    }
    const out = seg(T, c.dur - 0.35, c.dur); if (out > 0) { ctx.fillStyle = `rgba(15,12,22,${out})`; ctx.fillRect(0, 0, W, H); }
    hint(T, c.dur);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  // Zeichnet die laufenden Effekte der Siegel-Fähigkeiten
  function sigFx(R, t) {
    const hy = GROUND - 34, P = k => R.pos[k];
    const ring = (x, y, r, col, w = 3) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); };
    const sym = (x, y, s, col, size = 13) => { ctx.fillStyle = col; ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(s, x, y); };
    if (R.groundT > 0) { ctx.fillStyle = `rgba(255,228,138,${Math.min(1, R.groundT) * 0.22})`; ctx.fillRect(0, GROUND - 6, R.frontX + 30, 14); }
    if (R.tauntT > 0 && P('w')) ring(P('w'), hy, 26 + Math.sin(t * 9) * 3, 'rgba(255,90,90,.75)');
    if (R.prallT > 0 && P('w')) { ctx.strokeStyle = 'rgba(127,178,255,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(P('w') + 6, hy, 34, -1.1, 1.1); ctx.stroke(); }
    if (R.honorT > 0 && P('r')) { const x = P('r') - 8, y = hy - 52; ctx.fillStyle = '#c9a24a'; ctx.fillRect(x, y, 2, 30); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 20 + Math.sin(t * 6) * 2, y + 6); ctx.lineTo(x + 2, y + 13); ctx.fill(); }
    if (R.wallT > 0) { const x = R.frontX + 32; for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#d8d2bf' : '#bfb8a2'; ctx.fillRect(x, GROUND - 14 - i * 12, 12, 11); } }
    if (R.giant) { const x = R.frontX + 26, a = Math.max(0.35, R.giant.hp / R.giant.max); ctx.globalAlpha = 0.9; ctx.fillStyle = '#cfd8c8'; ctx.beginPath(); ctx.ellipse(x, GROUND - 40, 16, 34, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x, GROUND - 84, 11, 0, 7); ctx.fill(); ctx.fillStyle = '#2a3a33'; ctx.fillRect(x - 5, GROUND - 87, 3, 3); ctx.fillRect(x + 2, GROUND - 87, 3, 3); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 16, GROUND - 104, 32, 4); ctx.fillStyle = '#6be0b8'; ctx.fillRect(x - 16, GROUND - 104, 32 * a, 4); }
    if (R.cloneT > 0 && P('a')) { ctx.globalAlpha = 0.45 + Math.sin(t * 8) * 0.1; ctx.fillStyle = '#7a3a8a'; ctx.beginPath(); ctx.ellipse(P('a') + 14, hy + 6, 7, 16, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(P('a') + 14, hy - 14, 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    if (R.bearT > 0 && P('d')) ring(P('d'), hy + 6, 24, 'rgba(155,209,74,.8)', 4);
    if (R.howlT > 0 && P('t')) sym(P('t'), hy - 46, '☾', 'rgba(230,220,255,.9)', 16);
    if (R.critBT > 0) R.order.forEach(k => R.h[k].alive && sym(P(k), hy - 44 - Math.sin(t * 5 + P(k)) * 3, '✦', 'rgba(255,210,122,.85)', 11));
    R.order.forEach(k => { const h = R.h[k]; if (h.alive && (h.invT > 0 || h.protT > 0)) ring(P(k), hy, 22, h.protT > 0 ? 'rgba(127,178,255,.7)' : 'rgba(255,242,176,.8)', 2.5); });
    if (R.holeT > 0) { const x = R.holeX, y = GROUND - 40; ctx.fillStyle = 'rgba(20,6,40,.85)'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); for (let i = 0; i < 3; i++) ring(x, y, 22 + ((t * 30 + i * 9) % 26), `rgba(192,140,255,${0.6 - i * 0.15})`, 2); }
    if (R.beam && R.beam.tgt && P('m')) { const w = 2 + R.beam.i * 1.2; ctx.strokeStyle = 'rgba(226,201,255,.9)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(P('m') + 10, hy - 6); ctx.lineTo(R.beam.tgt.x, GROUND - (R.beam.tgt.boss ? 60 : 30)); ctx.stroke(); glowDot(R.beam.tgt.x, GROUND - (R.beam.tgt.boss ? 60 : 30), 14 + w * 2, '200,150,255', 0.8); }
    if (R.flameT > 0 && P('e')) { const x = R.frontX + 20; for (let i = 0; i < 10; i++) { const f = (t * 3 + i / 10) % 1; glowDot(x + f * 120, GROUND - 26 + Math.sin(i * 7 + t * 20) * 6 * f, 6 + f * 12, f < 0.5 ? '255,200,90' : '255,110,40', 0.9 - f * 0.6); } }
    if (R.aimT > 0 && P('s')) sym(P('s') + 18, hy - 20, '⌖', 'rgba(126,224,138,.95)', 16);
    if (R.fx.sg_t_eber > 0) { const x = R.frontX + (0.5 - R.fx.sg_t_eber) * 600; ctx.fillStyle = '#7a4e2c'; ctx.beginPath(); ctx.ellipse(x, GROUND - 14, 18, 11, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#f2e6cc'; ctx.fillRect(x + 14, GROUND - 14, 6, 2); }
    if (R.fx.sg_w_beben > 0) { ctx.fillStyle = `rgba(120,90,60,${R.fx.sg_w_beben})`; ctx.fillRect(R.frontX + 20, GROUND - 2, W, 6); }
    if (R.fx.sg_e_rakete > 0) glowDot(R.frontX + 120, GROUND - 60, 30 * R.fx.sg_e_rakete * 2, '255,150,60', 0.7);
    if (R.overT > 0 && P('e')) sym(P('e') + 26, GROUND - 30, '⇶', 'rgba(242,140,40,.9)', 12);
    for (const e of R.enemies) {
      const ey = GROUND - (e.boss ? 150 : 62);
      if (e.duelT > 0) sym(e.x, ey - 4, '⚔', '#ffb547', 13);
      if (e.smarkT > 0) sym(e.x + 10, ey - 4, '✕', '#ff6b7a', 13);
      if (e.manaT > 0) glowDot(e.x, GROUND - (e.boss ? 70 : 30), 16, '192,140,255', 0.5 + Math.sin(t * 12) * 0.2);
      if (e.dissT > 0) sym(e.x - 10, ey - 4, '♭', '#ff8ac8', 13);
      if (e.quakeT > 0) { ctx.fillStyle = 'rgba(120,90,60,.5)'; ctx.fillRect(e.x - 12, GROUND - 3, 24, 4); }
      if (e.bleedT > 0) glowDot(e.x, GROUND - 22, 6, '200,30,40', 0.6);
    }
    const linked = R.enemies.filter(e => e.linkT > 0);
    if (linked.length > 1) { ctx.strokeStyle = 'rgba(107,224,184,.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); linked.forEach((e, i) => (i ? ctx.lineTo(e.x, GROUND - 40) : ctx.moveTo(e.x, GROUND - 40))); ctx.stroke(); ctx.setLineDash([]); }
  }
  function bolt(x0, a, rgb) {
    ctx.strokeStyle = `rgba(${rgb},${a * 2})`; ctx.lineWidth = 4; ctx.beginPath(); let x = x0 || 220, y = 0; ctx.moveTo(x, y);
    while (y < GROUND - 30) { y += 22; x += (Math.random() - 0.5) * 28; ctx.lineTo(x, y); } ctx.stroke();
    ctx.fillStyle = `rgba(${rgb},${a * 0.3})`; ctx.fillRect(0, 0, W, H);
  }
  function bird(x, a, t) {
    const p = 1 - a * 2, bx = 60 + ((x || 260) - 60) * p, by = 60 + p * 110;
    ctx.save(); ctx.translate(bx, by); ctx.fillStyle = '#8a5a2b';
    const f = Math.sin(t * 30) * 8;
    ctx.beginPath(); ctx.moveTo(-14, -f); ctx.lineTo(0, 0); ctx.lineTo(14, -f); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(4, -1, 4, 2); ctx.restore();
  }

  window.Ritter = { open, close, isOpen: () => active };
})();
