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
    { id: 's', tree: 'schuetze', name: 'Schützin', color: '#7ee08a', slots: 1, rebirth: 2, hire: 's_hire', line: 'back', desc: 'Schießt aus der hinteren Reihe. Viel Schaden auf ein Ziel, wenig Leben.' },
    { id: 'm', tree: 'magier', name: 'Magier', color: '#c08cff', slots: 1, rebirth: 4, hire: 'm_hire', line: 'back', desc: 'Zauber treffen mehrere Gegner gleichzeitig. Mächtige Fähigkeiten, sehr wenig Leben.' },
    { id: 'p', tree: 'priester', name: 'Priesterin', color: '#ffe48a', slots: 1, rebirth: 6, hire: 'p_hire', line: 'back', desc: 'Heilt die Gruppe, gibt Schilde und belebt Gefallene wieder.' },
    { id: 't', tree: 'baendiger', name: 'Tierbändiger', color: '#d9935a', slots: 1, rebirth: 8, hire: 't_hire', line: 'front', desc: 'Kämpft mit der Axt, sein Wolf greift zusätzlich an. Ruft im Notfall das ganze Rudel.' },
    { id: 'a', tree: 'assassine', name: 'Assassine', color: '#ff6b7a', slots: 1, rebirth: 99, puzzle: true, hire: 'a_hire', line: 'back', desc: 'Wirft Kunai aus der hinteren Reihe, trifft oft kritisch und macht Jagd auf Fernkämpfer.' },
    { id: 'n', tree: 'nekromant', name: 'Nekromant', color: '#6be0b8', slots: 1, rebirth: 99, puzzle: true, hire: 'n_hire', line: 'back', desc: 'Besiegte Gegner stehen als Skelett-Diener wieder auf und kämpfen für dich. Verflucht und raubt Leben.' },
    { id: 'b', tree: 'barde', name: 'Barde', color: '#ff8ac8', slots: 1, rebirth: 99, puzzle: true, hire: 'b_hire', line: 'back', desc: 'Sein Lied macht alle Helden stärker und schneller. Schläfert Gegner ein und stößt sie mit Schallwellen zurück.' },
    { id: 'd', tree: 'druidin', name: 'Druidin', color: '#9bd14a', slots: 1, rebirth: 99, puzzle: true, hire: 'd_hire', line: 'front', desc: 'Kämpft vorne mit Bärenkräften, heilt die Gruppe und ruft Ranken und Adler zu Hilfe.' },
    { id: 'e', tree: 'tueftler', name: 'Tüftlerin', color: '#f28c28', slots: 1, rebirth: 99, puzzle: true, hire: 'e_hire', line: 'back', desc: 'Wirft Bomben, die mehrere Gegner treffen. Ihr Geschützturm schießt die ganze Zeit mit.' },
  ];
  const HERO = Object.fromEntries(HEROES.map(h => [h.tree, h]));
  const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));

  // Was jede Wiedergeburt freischaltet
  const CAPS = [30, 45, 60, 75, 90, 105, 120, 135, 150];
  const ROADMAP = [
    { r: 1, text: 'Wächter als neue Klasse' }, { r: 2, text: 'Schützin als neue Klasse' }, { r: 3, text: 'Runen: Bosse lassen Runen fallen, jede Klasse hat 3 Sockel' },
    { r: 4, text: 'Magier als neue Klasse' }, { r: 5, text: 'Runenschmiede: Runen verschmelzen und zerlegen' }, { r: 6, text: 'Priesterin als neue Klasse' },
    { r: 7, text: 'Turm-Modus: endloser Turm mit dauerhaftem Bonus' }, { r: 8, text: 'Tierbändiger als neue Klasse' }, { r: 9, text: 'Alle 150 Stufen, danach endlose Albtraum-Stufen. Der Aufstieg wird möglich.' },
  ];
  const capOf = S => (S.rebirths >= CAPS.length ? Infinity : CAPS[Math.min(S.rebirths, CAPS.length - 1)]);
  const reqOf = S => Math.max(15, (S.rebirths < CAPS.length - 1 ? CAPS[S.rebirths] - 5 : 145) - 5 * ((S.cperks && S.cperks.k_schnell) || 0));
  const keyLimit = S => S.rebirths + 1;
  const feature = (S, f) => S.rebirths >= ({ runen: 3, schmiede: 5, turm: 7 })[f];

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
    w: [[dm('all', 'dr', 0.03)], 'Alle Helden erleiden 3 % weniger Schaden je Stufe (wirkt immer etwas schwächer, höchstens 85 %)', [ad('all', 'thorns', 0.06)], 'Alle Helden werfen 6 % je Stufe des erlittenen Schadens zurück'],
    s: [[dm('all', 'crit', 0.01)], '+1 % kritische Trefferchance für alle Helden je Stufe (wirkt immer etwas schwächer)', [ad('all', 'critD', 0.06)], '+6 % kritischer Schaden für alle Helden je Stufe'],
    p: [[pw('g', 'walk', 1.03)], '+3 % Laufgeschwindigkeit der Gruppe je Stufe (höchstens ×3)', [pw('all', 'aps', 1.015)], '+1,5 % Angriffstempo aller Helden je Stufe'],
    m: [[pw('all', 'actMul', 1.05)], '+5 % Schaden aller aktiven Fähigkeiten je Stufe', [dm('all', 'cdr', 0.02)], '−2 % Abklingzeit aller aktiven Fähigkeiten je Stufe (höchstens 60 %)'],
    t: [[pw('g', 'gold', 1.03)], '+3 % Gold je Stufe', [ad('all', 'regen', 0.0004)], 'Alle Helden regenerieren 0,04 % ihres Lebens pro Sekunde je Stufe'],
  };
  const PAIR = { w: 'w', s: 's', p: 'p', m: 'm', t: 't', a: 's', n: 't', b: 'p', d: 'w', e: 'm' };
  const infG = (h, base) => ({ max: 9999, cost: G(base, 1.35), kind: 'inf', fx: INF[PAIR[h]][0], desc: INF[PAIR[h]][1], icon: '∞' });
  const infS = h => ({ max: 9999, cost: r => ({ g: 0, s: 6 + 2 * r }), kind: 'inf', fx: INF[PAIR[h]][2], desc: INF[PAIR[h]][3], icon: '∞' });

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
    { id: 'schild', name: 'Schildstoß', icon: '◘', x: 4, y: 2, p: ['heil'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: 150 % Schaden und betäubt den vordersten Gegner 1,5 s (+0,5 s je Stufe). Abklingzeit 9 s.' },
    { id: 'habgier', name: 'Habgier', icon: '¤', x: 5, y: 2, p: ['blitz'], max: 3, cost: ACTC2, fx: [mu('g', 'gold', 0.15)], desc: '+15 % Gold je Stufe' },
    { id: 'schrei', name: 'Kriegsschrei', icon: '▲', x: 6, y: 2, p: ['blitz'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: alle Helden machen 6 s lang +40 % Schaden (+15 % je Stufe). Abklingzeit 20 s.' },
    { id: 'berserk', name: 'Berserker', icon: 'B', x: 1, y: 1, p: ['doppel', 'kritd'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', fx: [xx('r', 'atk', 1.4), xx('r', 'hp', 0.8)], desc: 'Schlüssel: Ritter +40 % Schaden, aber −20 % Leben' },
    { id: 'phoenix', name: 'Zweites Leben', icon: 'Φ', x: 3, y: 1, p: ['dorn', 'schild'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', fx: [ad('r', 'revive', 1)], desc: 'Schlüssel: Einmal pro Lauf steht der Ritter mit halbem Leben wieder auf' },
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
      I1: { id: 'w_inf1', name: 'Festungsbau', ...infG('w', 3000) },
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
      I1: { id: 's_inf1', name: 'Pfeilmacherei', ...infG('s', 4000) },
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
      I1: { id: 'm_inf1', name: 'Arkane Bibliothek', ...infG('m', 6000) },
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
      I1: { id: 'p_inf1', name: 'Tempelbau', ...infG('p', 8000) },
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
      I1: { id: 't_inf1', name: 'Wildgehege', ...infG('t', 10000) },
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
      I1: { id: 'a_inf1', name: 'Klingenschmiede', ...infG('a', 10000) },
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
      I1: { id: 'n_inf1', name: 'Knochengrube', ...infG('n', 10000) },
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
      I1: { id: 'b_inf1', name: 'Konzertsaal', ...infG('b', 10000) },
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
      I1: { id: 'd_inf1', name: 'Heiliger Hain', ...infG('d', 10000) },
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
      I1: { id: 'e_inf1', name: 'Werkstatt', ...infG('e', 10000) },
      I2: { id: 'e_inf2', name: 'Geniestreich', ...infS('e') },
    } },
  };
  for (const [tree, def] of Object.entries(TREES2)) {
    const slotId = Object.fromEntries(Object.entries(def.nodes).map(([slot, n]) => [slot, n.id]));
    for (const [slot, n] of Object.entries(def.nodes)) { const [x, y, ps] = TPL[slot]; NODES.push({ ...n, tree, x, y, p: ps.map(s => slotId[s]) }); }
  }
  const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));
  for (const h of HEROES) if (h.hire) { if (h.puzzle) NODE[h.hire].reqPuzzle = h.id; else NODE[h.hire].reqRebirth = h.rebirth; }

  // Dauerhafte Upgrades aus der Wiedergeburt (bezahlt mit Sternen)
  const PERKS = [
    { id: 'p_macht', name: 'Heldenblut', desc: '+15 % Schaden und Leben aller Helden je Stufe (wächst aufeinander auf)', max: 999, cost: r => 1 + r },
    { id: 'p_gold', name: 'Goldader', desc: '+15 % Gold je Stufe', max: 999, cost: r => 1 + r },
    { id: 'p_seele', name: 'Seelenquelle', desc: '+1 Seele pro besiegtem Boss je Stufe', max: 10, cost: r => 2 + 2 * r },
    { id: 'p_start', name: 'Sprungstart', desc: 'Läufe beginnen 5 Stufen weiter je Stufe (höchstens bis 10 unter deinem Rekord seit der letzten Wiedergeburt)', max: 20, cost: r => 2 + r },
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
    { id: 'eile', name: 'Eile', color: '#f2be1a', desc: v => `+${pct(v)} Angriffstempo`, val: 0.04 },
    { id: 'zorn', name: 'Zorn', color: '#ff7a3d', desc: v => `+${pct(v)} kritischer Schaden`, val: 0.12 },
    { id: 'schutz', name: 'Schutz', color: '#7fb2ff', desc: v => `−${pct(v)} erlittener Schaden`, val: 0.025 },
    { id: 'fokus', name: 'Fokus', color: '#c08cff', desc: v => `Fähigkeiten laden ${pct(v)} schneller`, val: 0.03 },
    { id: 'glueck', name: 'Glück', color: '#ffcf4a', desc: v => `+${pct(v)} Gold für alle`, val: 0.06 },
    { id: 'seele', name: 'Seele', color: '#c9a6ff', desc: v => `+${pct(v)} Chance auf Seelen bei Elite-Gegnern`, val: 0.03 },
  ];
  const RUNE = Object.fromEntries(RUNES.map(r => [r.id, r]));
  const pct = v => `${Math.round(v * 1000) / 10} %`.replace('.', ',');
  const runeVal = (type, tier) => RUNE[type].val * Math.pow(2.2, tier - 1);
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const RUNE_CAP = 40;
  const DUST_RUNE = 15;

  /* ================= Spielstand ================= */
  function fresh() {
    return { v: SAVE_VERSION, gold: 0, souls: 0, best: 0, bestEver: 0, runs: 0, nodes: { start: 1 }, equip: [], speed: 1, stars: 0, rebirths: 0, perks: {},
      runes: [], sockets: Object.fromEntries(HEROES.map(h => [h.id, [null, null, null]])), dust: 0, runeSeq: 1, towerBest: 0,
      asc: 0, crowns: 0, cperks: {}, ach: {}, tot: { kills: 0, souls: 0 }, weekly: { week: '', best: 0, claimed: 0 }, comps: {}, compActive: [], seenIntro: false, area: 0, tempo: 0, bench: [], altar: 0, seenField: false, exp: { spl: 0, done: 0, target: 'a', pieces: {} } };
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
    for (const h of HEROES) { const mine = out.equip.filter(id => NODE[id].tree === h.tree), lim = slotsOf(out, h.tree); if (mine.length > lim) out.equip = out.equip.filter(id => !mine.slice(lim).includes(id)); }
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
    out.altar = Math.max(0, Math.min(ALTAR_MAX, Math.floor(Number(d.altar) || 0)));
    for (const h of [...HEROES].reverse()) while (kPlaced(out) > out.kslots && out.kplace[h.id]) { if (--out.kplace[h.id] <= 0) delete out.kplace[h.id]; }
    for (const h of HEROES) { const keys = NODES.filter(n => n.tree === h.tree && n.kind === 'key' && out.nodes[n.id]); for (const n of keys.slice(keyCap(out, h.tree))) { const c = n.cost(0); out.gold += c.g; out.souls += c.s; delete out.nodes[n.id]; } }
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
  const keysUsed = (S, tree) => NODES.filter(n => n.tree === tree && n.kind === 'key' && rank(S, n.id) > 0).length;
  function blockReason(S, n) {
    if (n.reqPuzzle && !assembled(S, n.reqPuzzle)) return `Setze zuerst alle 6 Puzzleteile in den Expeditionen zusammen (${pieceCount(S, n.reqPuzzle)}/6).`;
    if (n.reqRebirth && S.rebirths < n.reqRebirth && !rank(S, n.id)) return `Wird mit der ${n.reqRebirth}. Wiedergeburt freigeschaltet.`;
    if (n.kind === 'key' && !rank(S, n.id) && keysUsed(S, n.tree) >= keyCap(S, n.tree)) return `Alle ${keyCap(S, n.tree)} Schlüsselsockel dieser Klasse sind belegt. Setze oben einen freien Sockel auf diese Klasse (du bekommst einen pro Wiedergeburt).`;
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
    if (n.active && S.nodes[n.id] === 1 && S.equip.filter(id => NODE[id].tree === n.tree).length < slotsOf(S, n.tree)) S.equip.push(n.id);
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
    if (keysUsed(S, tree) > keyCap(S, tree) - 1) return 'used';
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
    const mine = S.equip.filter(x => NODE[x].tree === n.tree);
    if (mine.length >= slotsOf(S, n.tree)) S.equip.splice(S.equip.indexOf(mine[0]), 1);
    S.equip.push(id);
  }
  const perkCost = (S, p) => p.cost(perk(S, p.id));
  function buyPerk(S, p) {
    if (perk(S, p.id) >= p.max || S.stars < perkCost(S, p)) return false;
    S.stars -= perkCost(S, p); S.perks[p.id] = perk(S, p.id) + 1; if (p.id === 'p_feld') S.bench = []; return true;
  }
  function keepHires(S) { return perk(S, 'p_freunde') || cperk(S, 'k_veteran') ? HEROES.filter(h => h.hire && rank(S, h.hire)).map(h => h.hire) : []; }
  function rebirth(S) {
    const st = starsFor(S); if (!st) return 0;
    S.stars += st; S.rebirths++; S.kslots = kSlots(S) + 1; S.bestEver = Math.max(S.bestEver, S.best);
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

  /* ---------- Runen ---------- */
  const runeById = (S, id) => S.runes.find(r => r.id === id);
  function addRune(S, t, tier) {
    if (S.runes.length >= RUNE_CAP) { S.dust += 2 * Math.pow(3, tier - 1); return null; }
    const r = { id: S.runeSeq++, t, tier }; S.runes.push(r); return r;
  }
  const socketed = S => new Set(Object.values(S.sockets).flat().filter(Boolean));
  function socket(S, hid, slot, runeId) {
    for (const h of HEROES) S.sockets[h.id] = (S.sockets[h.id] || [null, null, null]).map(x => (x === runeId ? null : x));
    S.sockets[hid][slot] = runeId;
  }
  function unsocket(S, hid, slot) { S.sockets[hid][slot] = null; }
  function canMerge(S, r) { return feature(S, 'schmiede') && S.runes.filter(x => x.t === r.t && x.tier === r.tier).length >= 3 && r.tier < 10; }
  function merge(S, r) {
    if (!canMerge(S, r)) return null;
    const used = socketed(S);
    const same = S.runes.filter(x => x.t === r.t && x.tier === r.tier).sort((a, b) => (used.has(a.id) ? 1 : 0) - (used.has(b.id) ? 1 : 0) || (a.id === r.id ? -1 : 0)).slice(0, 3);
    const keepSlot = Object.entries(S.sockets).flatMap(([hid, arr]) => arr.map((x, i) => (same.some(s => s.id === x) ? [hid, i] : null))).filter(Boolean)[0];
    S.runes = S.runes.filter(x => !same.includes(x));
    for (const h of HEROES) S.sockets[h.id] = S.sockets[h.id].map(x => (same.some(s => s.id === x) ? null : x));
    const nr = { id: S.runeSeq++, t: r.t, tier: r.tier + 1 }; S.runes.push(nr);
    if (keepSlot) S.sockets[keepSlot[0]][keepSlot[1]] = nr.id;
    return nr;
  }
  function dismantle(S, r) {
    if (!feature(S, 'schmiede')) return 0;
    for (const h of HEROES) S.sockets[h.id] = S.sockets[h.id].map(x => (x === r.id ? null : x));
    S.runes = S.runes.filter(x => x !== r);
    const d = 2 * Math.pow(3, r.tier - 1); S.dust += d; return d;
  }
  function buyRune(S) {
    if (!feature(S, 'schmiede') || S.dust < DUST_RUNE || S.runes.length >= RUNE_CAP) return null;
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
    w: { atk: 4, hp: 160, aps: 0.8, crit: 0.05, critD: 1.5 },
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
    rangedDmg: 0, raise: 0, minionMax: 0, minionMul: 1, minionDur: 0, songAtk: 0, songAps: 0, turrets: 0, turretMul: 0, turretAps: 0 };
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
    const g = { gold: 1, chest: 0, eliteSoul: 0, soulMul: 1, partyAtk: 1, partyHp: 1, partyDr: 0, partyRegen: 0, eliteGold: 1, walk: 1 };
    const each = (h, fn) => (h === 'all' ? Object.values(hs).forEach(fn) : h === 'g' ? fn(g) : hs[h] && fn(hs[h]));
    for (const n of NODES) {
      const r = rank(S, n.id); if (!r || !n.fx) continue;
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
    const perm = Math.pow(1.15, perk(S, 'p_macht')) * (1 + 0.03 * S.towerBest) * Math.pow(1 + ACH_BONUS, achN) * Math.pow(1.5, cperk(S, 'k_blut'));
    g.gold *= (1 + 0.15 * perk(S, 'p_gold')) * Math.pow(2, cperk(S, 'k_schatz'));
    g.soulMul *= Math.pow(2, cperk(S, 'k_seele')) * altarMul(S);
    const comp = {};
    for (const id of S.compActive || []) { const l = (S.comps || {})[id] || 0; if (l) comp[id] = l; }
    if (comp.eule) { g.gold *= 1 + 0.05 * comp.eule; Object.values(hs).forEach(T => (T.crit += 0.015 * comp.eule)); }
    if (comp.golem) { g.partyDr += Math.min(0.3, 0.015 * comp.golem); g.partyHp *= 1 + 0.03 * comp.golem; }
    if (comp.phoenix) g.partyRegen += 0.0015 * comp.phoenix;
    const bardOn = hs.b && fieldOf(S).includes('b');
    if (bardOn) g.partyAtk *= 1 + hs.b.songAtk;
    for (const [hid, T] of Object.entries(hs)) {
      const rb = runeBonus(S, hid);
      if (bardOn) T.aps *= 1 + hs.b.songAps;
      T.atk *= perm * g.partyAtk * (1 + (rb.kraft || 0)); T.hp *= perm * g.partyHp * (1 + (rb.leben || 0)); if (T.heal) T.heal *= perm * (1 + (rb.kraft || 0));
      if (T.wolfAtk) T.wolfAtk *= perm * g.partyAtk * (1 + (rb.kraft || 0));
      T.aps *= 1 + (rb.eile || 0); T.critD += rb.zorn || 0; T.cdr = Math.min(0.6, T.cdr + (rb.fokus || 0));
      T.dr = Math.min(0.85, T.dr + g.partyDr + (rb.schutz || 0)); T.regen += g.partyRegen;
      g.gold *= 1 + (rb.glueck || 0); g.eliteSoul += rb.seele || 0;
    }
    g.walk = Math.min(3, g.walk);
    const area = Math.min(S.area || 0, areaMax(S));
    const startStage = Math.max(1 + 10 * area, Math.min(1 + 5 * perk(S, 'p_start'), (S.best || 0) - 10, capOf(S)));
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
  const near = run => run.enemies.filter(e => e.x < 300);
  const engaged = run => run.enemies[0] && run.enemies[0].x < run.frontX + 70;
  const strongest = (run, maxX = 400) => run.enemies.filter(e => e.x < maxX).sort((a, b) => b.hp - a.hp)[0];
  const anyBelow = (run, st, f) => run.order.some(k => run.h[k].alive && run.h[k].hp < st[k].hp * f);
  const ACT = {
    wirbel: { cd: (r, S) => 19 - r - (rank(S, 'r_tanz') ? 3 : 0), ready: run => near(run).length >= 3 || near(run).some(e => e.boss), cast: (c, r) => near(c.run).forEach(e => c.hit('r', e, 2 + 0.5 * (r - 1))) },
    heil: { cd: () => 22, ready: (run, st) => anyBelow(run, st, 0.55), cast: (c, r) => c.healSplit('r', 0.4 + 0.08 * (r - 1), 0.1 + 0.03 * (r - 1)) },
    blitz: { cd: () => 14, ready: run => !!strongest(run, 320), cast: (c, r) => { const t = strongest(c.run, 320); c.hit('r', t, 4 + 1.5 * (r - 1), '#cfe6ff'); c.run.fx.blitzX = t.x; c.run.shake = 0.25; } },
    schild: { cd: () => 9, ready: engaged, cast: (c, r) => { const e = c.run.enemies[0]; c.hit('r', e, 1.5); e.stun = Math.max(e.stun, 1.5 + 0.5 * (r - 1)); } },
    schrei: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.buffT = 6; c.run.buffMul = 0.4 + 0.15 * (r - 1); c.float('r', 'Kriegsschrei!', '#ffb547'); } },
    w_wall: { cd: () => 12, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => { near(c.run).forEach(e => { c.hit('w', e, 1.5 + 0.5 * (r - 1), '#cfe0ff'); e.stun = Math.max(e.stun, 1); }); c.run.shake = 0.2; } },
    w_haut: { cd: () => 16, ready: (run, st) => run.h.w.hp < st.w.hp * 0.7, cast: (c, r) => { c.run.hautT = 5 + r; c.float('w', 'Eiserne Haut', '#7fb2ff'); } },
    w_rache: { cd: () => 15, ready: engaged, cast: (c, r) => { c.run.racheT = 6 + r; c.float('w', 'Vergeltung', '#7fb2ff'); } },
    s_hagel: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 380); for (let i = 0; i < 6; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('s', e, 0.3 + i * 0.06, 'hag'); c.hit('s', e, (1.2 + 0.4 * (r - 1)) * c.st.s.actMul, '#c8f5cf'); } } },
    s_falke: { cd: () => 12, ready: run => !!strongest(run, 380), cast: (c, r) => { const t = strongest(c.run, 380); c.hit('s', t, (3.5 + 1.2 * (r - 1)) * c.st.s.actMul, '#c8f5cf'); t.mark = Math.max(t.mark || 0, 0.25); t.markT = 5; c.run.fx.falkeX = t.x; } },
    s_gift: { cd: () => 10, ready: run => !!strongest(run, 380), cast: (c, r) => { const t = strongest(c.run, 380); t.poison = c.st.s.atk * (3 + (r - 1)) * c.st.s.actMul / 5; t.poisonT = 5; c.arrow('s', t, 0.35, 'gift'); } },
    m_meteor: { cd: () => 18, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { c.run.enemies.filter(e => e.x < 520).forEach(e => c.hit('m', e, (5 + 1.5 * (r - 1)) * c.st.m.actMul, '#ffb070')); c.run.shake = 0.3; } },
    m_eis: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => near(c.run).forEach(e => { c.hit('m', e, (1.5 + 0.5 * (r - 1)) * c.st.m.actMul, '#bfe6ff'); e.stun = Math.max(e.stun, 1.5); e.frozen = 1.5; }) },
    m_kette: { cd: () => 10, ready: run => run.enemies.some(e => e.x < 380), cast: (c, r) => { const ts = c.run.enemies.filter(e => e.x < 450).slice(0, 3 + r); c.run.fx.chain = ts.map(e => e.x); ts.forEach(e => c.hit('m', e, 2.5 * c.st.m.actMul, '#e2c9ff')); } },
    p_segen: { cd: () => 18, ready: (run, st) => anyBelow(run, st, 0.6), cast: (c, r) => c.healAll(0.3 + 0.08 * (r - 1)) },
    p_schild: { cd: () => 16, ready: engaged, cast: (c, r) => c.run.order.forEach(k => { const h = c.run.h[k]; if (h.alive) h.shield = Math.max(h.shield, c.st[k].hp * (0.2 + 0.05 * (r - 1))); }) },
    p_wieder: { cd: (r, S) => (rank(S, 'p_k2') ? 20 : 40), ready: run => run.order.some(k => !run.h[k].alive), cast: (c, r) => { const k = c.run.order.find(k => !c.run.h[k].alive); const h = c.run.h[k]; h.alive = true; h.hp = c.st[k].hp * (0.4 + 0.15 * (r - 1)); c.float(k, 'Wiederbelebt!', '#ffe48a'); } },
    t_rudel: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.packT = 8 + 2 * (r - 1); c.float('t', 'Rudelruf!', '#d9935a'); } },
    t_wurzel: { cd: () => 15, ready: run => near(run).length >= 1, cast: (c, r) => c.run.enemies.filter(e => e.x < 460).forEach(e => { c.hit('t', e, 1.2, '#b5e08a'); e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1)); e.rooted = 2; }) },
    t_sprung: { cd: () => 12, ready: run => !!strongest(run, 360), cast: (c, r) => { const t = strongest(c.run, 360); c.hit('t', t, 6 + 2 * (r - 1), '#ffd2a8', true); c.run.fx.sprungX = t.x; } },
    a_schatten: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 480), cast: (c, r) => {
      const vis = c.run.enemies.filter(e => e.x < 480), rng = vis.filter(e => e.ranged), ts = (rng.length ? rng : [...vis].sort((a, b) => b.x - a.x)).slice(0, 2);
      ts.forEach(e => c.hit('a', e, (6 + 2 * (r - 1)) * c.st.a.actMul * (e.ranged ? 1 + c.st.a.rangedDmg : 1), '#ff6b7a')); c.run.fx.shadowXs = ts.map(e => e.x); } },
    a_sturm: { cd: () => 12, ready: run => run.enemies.some(e => e.x < 400), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 400); for (let i = 0; i < 8; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('a', e, 0.2 + i * 0.05, 'kunai'); c.hit('a', e, (1.2 + 0.4 * (r - 1)) * c.st.a.actMul, '#ffc2c8'); } } },
    a_mal: { cd: () => 15, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); c.hit('a', t, (3 + (r - 1)) * c.st.a.actMul, '#ff6b7a'); t.mark = Math.max(t.mark || 0, 0.4); t.markT = 6; c.efloat(t, 'Todesmal', '#ff6b7a', 13); } },
    n_heer: { cd: () => 20, ready: engaged, cast: (c, r) => { for (let i = 0; i < 2 + r; i++) c.run.minions.push({ t: 12, atkT: 0.3 + i * 0.15, swing: 0 }); c.float('n', 'Totenheer!', '#6be0b8'); } },
    n_raub: { cd: () => 12, ready: run => !!strongest(run, 400), cast: (c, r) => { const t = strongest(c.run, 400); const d = c.hit('n', t, (3 + (r - 1)) * c.st.n.actMul, '#6be0b8'); c.healAllAbs(d * 0.15); c.run.fx.raubX = t.x; } },
    n_fluch: { cd: () => 16, ready: run => run.enemies.some(e => e.x < 420), cast: (c, r) => { c.run.enemies.forEach(e => { e.mark = Math.max(e.mark || 0, 0.25 + 0.1 * (r - 1)); e.markT = 6; e.cursed = 6; }); c.float('n', 'Fluch!', '#6be0b8'); } },
    b_krieg: { cd: () => 18, ready: engaged, cast: (c, r) => { c.run.songT = 6; c.run.songMul = 0.3 + 0.1 * (r - 1); c.float('b', 'Kriegslied!', '#ff8ac8'); } },
    b_wiegen: { cd: () => 16, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => near(c.run).forEach(e => { e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1)); e.sleep = 2 + 0.5 * (r - 1); }) },
    b_schall: { cd: () => 12, ready: run => near(run).length >= 1, cast: (c, r) => { near(c.run).forEach(e => { c.hit('b', e, (2 + 0.6 * (r - 1)) * c.st.b.actMul, '#ffd0ea'); e.x += e.boss ? 15 : 40; }); c.run.fx.schallX = c.run.pos.b || 80; } },
    d_ranken: { cd: () => 14, ready: run => near(run).length >= 1, cast: (c, r) => c.run.enemies.filter(e => e.x < 460).forEach(e => { c.hit('d', e, 1.5 * c.st.d.actMul, '#c8f08a'); e.stun = Math.max(e.stun, 2 + 0.5 * (r - 1)); e.rooted = 2 + 0.5 * (r - 1); }) },
    d_bruell: { cd: () => 18, ready: engaged, cast: (c, r) => { c.run.roarT = 6 + (r - 1); c.float('d', 'Bärengebrüll!', '#9bd14a'); c.run.shake = 0.2; } },
    d_adler: { cd: () => 12, ready: run => run.enemies.some(e => e.x < 480), cast: (c, r) => {
      const vis = c.run.enemies.filter(e => e.x < 480), rng = vis.filter(e => e.ranged), ts = (rng.length ? rng : [...vis].sort((a, b) => b.x - a.x)).slice(0, 3);
      ts.forEach(e => c.hit('d', e, (3 + (r - 1)) * c.st.d.actMul, '#e8f5c8')); c.run.fx.adlerXs = ts.map(e => e.x); } },
    e_turm2: { cd: () => 20, ready: engaged, cast: (c, r) => { c.run.extraTurretT = 10 + 2 * (r - 1); c.float('e', 'Geschütz gebaut!', '#f28c28'); } },
    e_streu: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 400), cast: (c, r) => { const vis = c.run.enemies.filter(e => e.x < 400); for (let i = 0; i < 6; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; c.arrow('e', e, 0.3 + i * 0.07, 'bomb'); c.hit('e', e, (1.5 + 0.5 * (r - 1)) * c.st.e.actMul, '#ffc58a'); c.burst(e.x, 196, '#ff9a3d', 6); } } },
    e_mine: { cd: () => 15, ready: run => near(run).length >= 2 || near(run).some(e => e.boss), cast: (c, r) => { near(c.run).forEach(e => { c.hit('e', e, (2.5 + 0.8 * (r - 1)) * c.st.e.actMul, '#ffc58a'); e.stun = Math.max(e.stun, 1); c.burst(e.x, 214, '#ffd23f', 10); }); c.run.shake = 0.25; } },
  };

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
  const TUNE = { hp: [1.135, 1.115, 1.085], dmg: [1.12, 1.1, 1.075], gold: [1.14, 1.105, 1.08], hard: [1.75, 0.5, 1.25, 0.12, 1.3, 0.6, 0.06] };
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
  const FRONT = ['w', 'r', 't', 'd'], BACK = ['s', 'a', 'm', 'n', 'b', 'e', 'p'];
  function newRun(S, mode) {
    const st = statsFor(S, mode), tower = mode === 'tower', weekly = mode === 'weekly', exp = mode === 'exp', rules = weekly || exp ? st.rules : [];
    let order = [...FRONT, ...BACK].filter(k => st[k] && (!st.field || st.field.includes(k)));
    if (rules.includes('trio')) order = order.slice(0, 3);
    const pos = {}; order.forEach((k, i) => (pos[k] = 152 - i * 25));
    const h = {}; for (const k of order) h[k] = { hp: st[k].hp, alive: true, atkT: 0.3 + Math.random() * 0.4, wolfT: 0.5, swing: 0, hurtT: 0, revived: false, shield: 0 };
    const run = { mode: tower ? 'tower' : weekly ? 'weekly' : exp ? 'exp' : 'normal', stage: tower || weekly ? 1 : st.startStage, startStage: tower || weekly ? 1 : st.startStage, rules, losses: 0,
      mission: exp ? (MISSION[S.exp.mission] ? S.exp.mission : 'streif') : null, waves: 0, bossKills: 0, minions: [], turretT: 1, extraTurretT: 0, songT: 0, songMul: 0, roarT: 0,
      hard: hardMul(S, exp), diff: ascDiff(S), speed: rules.includes('speed') ? 1.5 : 1, hpMul: rules.includes('giant') ? 2 : 1, eliteChance: rules.includes('elite') ? 0.4 : 0.12, noheal: rules.includes('noheal'),
      dragonT: 2, compRevive: false, bannerT: 0, kills: 0, gold: 0, souls: 0, runes: [], phoenixUsed: false, miracleUsed: false,
      fx: {}, cds: {}, buffT: 0, buffMul: 0, hautT: 0, racheT: 0, packT: 0, order, pos, frontX: pos[order[0]], h,
      enemies: [], floats: [], arrows: [], eshots: [], parts: [], scroll: 0, dead: false, victory: false, deadT: 0, time: 0, shake: 0 };
    // Abkürzung: übersprungene Bosse geben einen Teil ihrer Seelen
    if (run.mode === 'normal' && run.stage > 10) {
      let skip = 0; for (let b = 10; b < run.stage; b += 10) skip += Math.round((1 + Math.floor(b / 20)) * st.g.soulMul) + st.soulBonus;
      run.skipSouls = Math.floor(skip * SKIP_SOULS);
      if (run.skipSouls) { S.souls += run.skipSouls; S.tot.souls += run.skipSouls; run.souls += run.skipSouls; run.floats.push({ x: 150, y: 100, text: `Abkürzung: +${run.skipSouls} Seelen`, color: '#c9a6ff', size: 14, t: 2.2 }); }
    }
    spawnWave(run);
    return run;
  }
  let SKIP_SOULS = Number((typeof process !== 'undefined' && process.env && process.env.SKIP) || 0.35);
  const towerStage = floor => 15 + floor * 2;
  function spawnWave(run) {
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
    c.efloat = (e, text, color, size = 13) => run.floats.push({ x: e.x + (Math.random() * 16 - 8), y: 150 - (e.boss ? 40 : 0), text, color, size, t: 1 });
    c.burst = (x, y, color, n = 8) => { for (let i = 0; i < n; i++) run.parts.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140 - 20, t: 0.6, c: color }); };
    c.arrow = (k, e, d, kind) => run.arrows.push({ x: (run.pos[k] || 60) + 8, y: 168, tx: e.x, ty: 188 - (e.boss ? 30 : 0), t: 0, d, kind: kind || k });
    c.hit = (k, e, mult, color, wolf) => {
      const T = st[k]; if (!T || !e) return 0;
      let dmg = (wolf ? T.wolfAtk : T.atk) * mult * (run.buffT > 0 ? 1 + run.buffMul : 1) * (1 + (e.markT > 0 ? e.mark : 0));
      if ((e.boss || e.elite) && T.bossDmg) dmg *= 1 + T.bossDmg;
      const crit = Math.random() < (wolf ? T.crit + T.wolfCrit : T.crit);
      if (crit) dmg *= T.critD;
      e.hp -= dmg; e.hitT = 0.15;
      if (T.burn && !wolf) { e.burn = dmg * T.burn / 2; e.burnT = 2; }
      if (T.vuln && k === 's') { e.mark = Math.max(e.mark || 0, T.vuln); e.markT = 4; }
      if (T.lifesteal) { const h = run.h[k]; if (h && h.alive) h.hp = Math.min(T.hp, h.hp + dmg * T.lifesteal); }
      if (wolf && T.wolfHeal) c.healAllAbs(dmg * T.wolfHeal);
      c.efloat(e, fmt(dmg), crit ? '#ffd23f' : color || '#ffffff', crit ? 18 : 13);
      if (crit) c.burst(e.x, 190, '#ffd23f', 5);
      return dmg;
    };
    c.healOne = (k, amt) => {
      const h = run.h[k], T = st[k]; if (!h || !h.alive || run.noheal) return;
      const over = h.hp + amt - T.hp; h.hp = Math.min(T.hp, h.hp + amt);
      if (over > 0 && st.p && st.p.overShield) h.shield = Math.min(T.hp * 0.5, h.shield + over * st.p.overShield);
      c.float(k, '+' + fmt(amt), '#7ee08a', 12);
    };
    c.healAll = f => { run.order.forEach(k => run.h[k].alive && c.healOne(k, st[k].hp * f)); run.fx.heal = 0.5; };
    c.healSplit = (me, fMe, fOther) => { run.order.forEach(k => run.h[k].alive && c.healOne(k, st[k].hp * (k === me ? fMe : fOther))); run.fx.heal = 0.5; };
    c.healAllAbs = a => !run.noheal && run.order.forEach(k => { const h = run.h[k]; if (h.alive) h.hp = Math.min(st[k].hp, h.hp + a); });
    return c;
  }
  function frontHero(run) { return run.order.find(k => run.h[k].alive); }
  function hurtHero(c, k, raw, attacker) {
    const { st, run } = c, h = run.h[k], T = st[k];
    if (!h || !h.alive) return;
    if (T.block && Math.random() < T.block) { c.float(k, 'Abgewehrt', '#9fd0ff', 12); return; }
    if (T.dodge && Math.random() < T.dodge) { c.float(k, 'Ausgewichen', '#c8f5cf', 12); return; }
    let d = raw * (1 - T.dr);
    if (run.roarT > 0) d *= 0.6;
    if (k === 'w' && run.hautT > 0) d *= 0.4;
    if (h.shield > 0) { const a = Math.min(h.shield, d); h.shield -= a; d -= a; }
    h.hp -= d; h.hurtT = 0.2;
    if (attacker) { let refl = T.thorns; if (k === 'w' && run.racheT > 0) refl += 0.6; if (refl) attacker.hp -= raw * refl; }
    if (h.hp <= 0) {
      if (st.p && st.p.miracle && !run.miracleUsed && run.h.p && run.h.p.alive) { run.miracleUsed = true; run.order.forEach(x => run.h[x].alive && (run.h[x].hp = st[x].hp)); h.hp = T.hp * 0.5; c.float(k, 'Wunder!', '#ffe48a', 18); run.fx.heal = 0.5; }
      else if (T.revive && !h.revived) { h.revived = true; h.hp = T.hp * (k === 'w' ? 1 : 0.5); c.float(k, k === 'w' ? 'Letzte Bastion!' : 'Zweites Leben!', '#ffb547', 16); }
      else { h.hp = 0; h.alive = false; h.shield = 0; h.deadAt = run.time; h.deadScroll = run.scroll; run.losses++; c.float(k, `${HERO_BY_ID[k].name} gefallen`, '#ff8a8a', 13); }
    }
  }
  function step(S, st, run, dt) {
    if (run.dead) { run.deadT += dt; return; }
    const c = ctxFor(S, st, run);
    run.time += dt; run.bannerT -= dt; run.buffT -= dt; run.hautT -= dt; run.racheT -= dt; run.packT -= dt; run.songT -= dt; run.roarT -= dt; run.extraTurretT -= dt; run.shake = Math.max(0, run.shake - dt);
    for (const k of run.order) {
      const h = run.h[k]; if (!h.alive) continue;
      if (st[k].regen) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * st[k].regen * dt);
      h.swing = Math.max(0, h.swing - dt * 4); h.hurtT -= dt;
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
      const target = run.frontX + 50 + i * 34 + (e.boss ? 10 : 0);
      if (e.stun > 0) e.stun -= dt;
      else if (e.x > target) e.x = Math.max(target, e.x - 75 * run.speed * (st.g.walk || 1) * dt);
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
      if (!h || !h.alive || !rank(S, id) || run.cds[id] > 0 || !run.enemies.length) continue;
      if (!ACT[id].ready(run, st, S)) continue;
      ACT[id].cast(c, rank(S, id));
      run.cds[id] = ACT[id].cd(rank(S, id), S) * (1 - st[hk].cdr); run.fx[id] = 0.5;
    }
    const f = run.enemies[0], eng = f && f.x <= run.frontX + 52 + (f.boss ? 10 : 0);
    for (const k of run.order) {
      const h = run.h[k], T = st[k]; if (!h.alive || !run.enemies.length) continue;
      const melee = FRONT.includes(k);
      if (melee && !eng) { h.atkT = Math.min(h.atkT, 0.3); continue; }
      if (!melee && run.enemies[0].x > 420) continue;
      h.atkT -= dt * (run.songT > 0 ? 1 + run.songMul : 1);
      if (h.atkT <= 0) {
        h.atkT += 1 / T.aps; h.swing = 1;
        const tgt = run.enemies[0];
        if (k === 'p') {
          const low = run.order.filter(x => run.h[x].alive && run.h[x].hp < st[x].hp * 0.95).sort((a, b) => run.h[a].hp / st[a].hp - run.h[b].hp / st[b].hp)[0];
          if (low) c.healOne(low, T.heal * (Math.random() < T.crit ? 2 : 1));
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
        } else {
          c.hit(k, tgt, 1, k === 'w' ? '#cfe0ff' : null);
          if (T.dbl && Math.random() < T.dbl && tgt.hp > 0) c.hit(k, tgt, 1);
          if (T.stunChance && Math.random() < T.stunChance) tgt.stun = Math.max(tgt.stun, 0.5);
        }
      }
      if (k === 'e' && run.enemies[0] && run.enemies[0].x < 440) {
        run.turretT -= dt;
        if (run.turretT <= 0) {
          run.turretT += 1 / Math.max(0.2, T.turretAps);
          const n = T.turrets + (run.extraTurretT > 0 ? 1 : 0), tg = run.enemies[0];
          for (let i = 0; i < n; i++) { run.arrows.push({ x: (run.pos.e || 60) + 26 + i * 14, y: 196 - i * 4, tx: tg.x, ty: 196, t: 0, d: 0.16, kind: 'shot' }); c.hit('e', tg, T.turretMul, '#ffe0b0'); }
        }
      }
      if (k === 't' && eng) {
        h.wolfT -= dt;
        if (h.wolfT <= 0) { const n = T.wolves + (run.packT > 0 ? 2 + T.packBonus : 0); h.wolfT += 1 / T.wolfAps; for (let i = 0; i < n; i++) c.hit('t', run.enemies[0] || tgtSafe(run), 1, '#ffd2a8', true); }
      }
    }
    // Fernkämpfer schießen von hinten auf zufällige Helden
    for (const e of run.enemies) {
      if (!e.ranged || e.stun > 0 || e.x > 450 || e.hp <= 0) continue;
      e.shotT -= dt;
      if (e.shotT > 0) continue;
      e.shotT += RANGED.rate / run.speed;
      const alive = run.order.filter(k => run.h[k].alive); if (!alive.length) break;
      const k = alive[Math.floor(Math.random() * alive.length)];
      run.eshots.push({ x: e.x - 12, y: 188, tx: run.pos[k], ty: 180, t: 0, d: 0.55, k, dmg: e.dmg * RANGED.dmg, kind: e.type });
    }
    for (const s of run.eshots) { s.t += dt; if (s.t >= s.d && !s.done) { s.done = true; hurtHero(c, s.k, s.dmg, null); } }
    run.eshots = run.eshots.filter(s => !s.done);
    // Skelett-Diener
    if (run.minions.length) {
      const N = st.n, alive = run.h.n && run.h.n.alive;
      for (const m of run.minions) {
        m.t -= dt; if (!alive || !N || !run.enemies.length) continue;
        m.atkT -= dt; if (m.atkT <= 0 && run.enemies[0].x < run.frontX + 90) { m.atkT += 1; m.swing = 1; c.hit('n', run.enemies[0], 0.8 * N.minionMul, '#d8fff0'); }
        m.swing = Math.max(0, (m.swing || 0) - dt * 4);
      }
      run.minions = run.minions.filter(m => m.t > 0 && alive);
    }
    // Gegner greifen an
    if (f && eng && f.stun <= 0 && !f.ranged) {
      f.atkT -= dt;
      if (f.atkT <= 0 && f.hp > 0) {
        f.atkT += f.rate;
        f.atkAt = run.time;
        hurtHero(c, fk, f.dmg, f);
        if (f.boss) { run.shake = 0.15; for (const k of run.order) if (k !== fk) hurtHero(c, k, f.dmg * 0.35, null); }
      }
    }
    // Besiegte Gegner
    const g = st.g;
    for (const e of run.enemies) {
      if (e.hp > 0) continue;
      run.kills++; S.tot.kills++;
      if (e.boss) run.bossKills++;
      if (st.n && run.h.n && run.h.n.alive && run.minions.length < st.n.minionMax && Math.random() < st.n.raise) { run.minions.push({ t: st.n.minionDur, atkT: 0.6, swing: 0 }); c.efloat(e, 'Erhebe dich!', '#6be0b8', 12); }
      c.burst(e.x, 200, e.boss ? '#c9a6ff' : '#ffffff', e.boss ? 24 : 8);
      if (run.mode === 'normal') {
        let gold = e.gold * g.gold * (e.boss || e.elite ? g.eliteGold : 1);
        if (Math.random() < g.chest) { gold *= 10; c.efloat(e, 'Truhe!', '#ffd23f', 16); }
        gold = Math.max(1, Math.round(gold));
        S.gold = Math.min(1e18, S.gold + gold); run.gold += gold;
        run.floats.push({ x: e.x, y: 130, text: '+' + fmt(gold), color: '#ffcf4a', size: 14, t: 1 });
      }
      let souls = 0;
      if (e.boss) souls = roundSouls((1 + Math.floor(run.stage / 20)) * g.soulMul) + st.soulBonus;
      else if (e.elite && Math.random() < g.eliteSoul) souls = Math.max(1, roundSouls(altarMul(S)));
      if (run.mode === 'tower') souls = e.boss ? 1 : 0;
      if (run.mode === 'weekly' || run.mode === 'exp') souls = 0;
      if (souls) { S.tot.souls += souls; S.souls += souls; run.souls += souls; run.floats.push({ x: e.x, y: 95, text: `+${souls} Seele${souls > 1 ? 'n' : ''}`, color: '#c9a6ff', size: 16, t: 1 }); }
      if (feature(S, 'runen') && run.mode === 'normal' && (e.boss || (e.elite && Math.random() < 0.03))) {
        const tier = 1 + Math.floor(run.stage / 40) + (e.boss && Math.random() < 0.15 ? 1 : 0);
        const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, tier);
        if (r) { run.runes.push(r); run.floats.push({ x: e.x, y: 75, text: `Rune: ${RUNE[r.t].name} ${ROMAN[r.tier]}`, color: RUNE[r.t].color, size: 14, t: 1.4 }); }
      }
    }
    run.enemies = run.enemies.filter(e => e.hp > 0);
    if (!run.enemies.length) {
      if (run.mode === 'tower') {
        if (run.stage > S.towerBest) {
          S.towerBest = run.stage;
          if (run.stage % 5 === 0) { const r = addRune(S, RUNES[Math.floor(Math.random() * RUNES.length)].id, 1 + Math.floor(run.stage / 15)); if (r) run.runes.push(r); }
        }
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
      run.stage++;
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
      run.order.forEach(k => { const h = run.h[k]; if (!h.alive) { h.alive = true; h.hp = st[k].hp * 0.5; c.float(k, 'Phönix!', '#ff9a3d', 15); } });
    }
    if (!run.order.some(k => run.h[k].alive)) { run.dead = true; S.runs++; return 'dead'; }
  }
  const tgtSafe = run => run.enemies[0];

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
      1, kSlots(S), HEROES.length, ...HEROES.map(h => (S.kplace || {})[h.id] || 0), S.altar || 0, 1]);
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

  const core = { ALTAR_MAX, altarCost, altarMul, buyAltar, kSlots, kFree, keyCap, addSock, removeSock, removeKey, PUZZLE, MISSIONS, MISSION, PIECE_COST, claimExp, buyPiece, assembled, pieceCount, pieceMask, expOpen, expStage, fieldOf, fieldSlots, toggleField, bossOf, BOSS_NAMES, TEMPO_COST, maxSpeed, buyTempo, areaMax, zoneName, BIOMES, HEROES, HERO, NODES, NODE, PERKS, RUNES, RUNE, TUNE, fresh, migrate, stats, newRun, step, buy, canBuy, available, blockReason, nodeCost, rank, perk, buyPerk, perkCost,
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

  /* ---------- Konto mit eigenem Namen und Passwort ---------- */
  const AKEY = 'fsg.ritter.konto';
  let acct = null, cloudDirty = false, cloudMsg = '', cloudBusy = false, durableInfo = null;
  try { acct = JSON.parse(localStorage.getItem(AKEY) || 'null'); } catch {}
  const setAcct = a => { acct = a; try { a ? localStorage.setItem(AKEY, JSON.stringify(a)) : localStorage.removeItem(AKEY); } catch {} };
  async function api(action, body, keepalive) {
    try {
      const res = await fetch('/api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: !!keepalive });
      const j = await res.json().catch(() => ({}));
      return res.ok ? j : { error: j.error || 'Der Server antwortet gerade nicht.' };
    } catch { return { error: 'Keine Verbindung zum Server.' }; }
  }
  const timeStr = t => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const typing = () => document.activeElement?.closest?.('#rlPanel form');
  async function cloudSave(force, keepalive) {
    if (!acct || cloudBusy || (!cloudDirty && !force)) return;
    cloudBusy = true; cloudDirty = false;
    const r = await api('save', { name: acct.name, token: acct.token, data: S }, keepalive);
    cloudBusy = false;
    if (r.error) { cloudDirty = true; cloudMsg = r.error; if (/anmelden/.test(r.error)) setAcct(null); }
    else { acct.updated = r.updated; setAcct(acct); cloudMsg = `Gespeichert um ${timeStr(r.updated)}`; }
    if (tab === 'stand' && !typing()) panel();
  }
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
    t.push({ id: 'halle', label: 'Ruhmeshalle', color: '#ffd23f' }, { id: 'ruhm', label: S.asc || S.rebirths >= 9 ? 'Wiedergeburt & Aufstieg' : 'Wiedergeburt', color: '#c9a6ff' }, { id: 'stand', label: 'Spielstand', color: '#a99fbb' });
    return t;
  }
  function renderTabs() {
    const list = tabsList();
    if (!list.some(t => t.id === tab)) tab = 'ritter';
    $('.rl-tabs').innerHTML = list.map(t => `<button data-tab="${t.id}" class="${t.id === tab ? 'on' : ''} ${t.locked ? 'locked' : ''}" style="--tc:${t.color}">${t.label}</button>`).join('');
  }
  function open() {
    active = true;
    $('#hub').hidden = true; $('#room').hidden = true; $('#solo').hidden = false;
    st = stats(S);
    if (!cv) {
      $('#solo').innerHTML = `
        <div class="topbar"><button class="btn ghost small" id="soloBack">‹ Spiele</button><div class="title"><b>Ritterlauf</b><small>Solo</small></div>
          <div class="rl-topr"><button class="btn ghost small rl-newsbtn" id="soloNews" aria-label="Neuigkeiten">📰<span class="dot" hidden></span></button><button class="btn ghost small" id="soloSpeed">Tempo ×1</button></div></div>
        <div class="rl-stage"><div id="soloCanvas" class="rl-canvas"></div></div>
        <div class="rl-heroes" id="rlHeroes"></div>
        <div class="rl-bar"><div class="rl-stat" id="rlStat"></div><div id="rlAction" class="row"></div></div>
        <div class="rl-tabs" role="tablist"></div>
        <div id="rlPanel"></div>`;
      cv = document.createElement('canvas'); $('#soloCanvas').appendChild(cv); ctx = cv.getContext('2d');
      cv.addEventListener('click', () => { if (cine && cine.t > 0.4) cine.t = Math.max(cine.t, cine.dur - 0.25); });
      window.addEventListener('resize', sizeCanvas);
      $('#soloBack').onclick = close;
      $('#soloNews').onclick = showUpdates;
      $('#soloSpeed').onclick = () => { S.speed = S.speed >= maxSpeed(S) ? 1 : S.speed < 3 ? S.speed + 1 : S.speed + 0.5; save(); hud(); };
      $('.rl-tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; confirm = ''; runeSel = null; renderTabs(); panel(); } };
      for (const id of ['#rlPanel', '#rlAction', '#rlHeroes']) $(id).addEventListener('click', onClick);
      $('#rlPanel').addEventListener('submit', onSubmit);
    }
    sizeCanvas(); refresh();
    if (!S.seenIntro) showIntro(); else if (S.news && !cine) showNews(); else if (S.keyNews != null) showKeyInfo(); else if (S.infNews) showInfInfo(); else if (!S.seenField && HEROES.filter(h => hired(S, h.tree)).length > fieldSlots(S)) showFieldInfo();
    else if (expOpen(S) && !S.seenExp) showExpInfo();
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function refresh() { st = run && !run.dead ? statsFor(S, run.mode) : stats(S); renderTabs(); hud(); heroes(); action(); panel(); }
  function achCheck(run) { const got = checkAch(S, run); if (got.length) { st = run && !run.dead ? statsFor(S, run.mode) : stats(S); got.forEach((a, i) => setTimeout(() => toast(`Erfolg: ${a.name} (+3 % Stärke)`, true), i * 1800)); save(); } return got; }
  function close() { active = false; cancelAnimationFrame(raf); save(); cloudSave(true); $('#solo').hidden = true; $('#hub').hidden = false; }
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
    if (cine) { cine.t += dt; if (cine.t >= cine.dur) { cine = null; showNews(); } }
    if (run && !run.dead) {
      const n = Math.ceil(S.speed), sdt = dt * S.speed / n;
      for (let i = 0; i < n; i++) if (step(S, st, run, sdt) === 'dead') { endRun(); break; }
    } else if (run) run.deadT += dt;
    draw(now / 1000);
    hudT += dt; if (hudT > 0.2) { hudT = 0; hud(); if (run && !run.dead) heroes(); }
    raf = requestAnimationFrame(loop);
  }

  function endRun() {
    if (run.mode === 'weekly') { const r = claimWeekly(S, run); run.weeklyReward = r; if (r.stars || r.crowns) setTimeout(() => toast(`Wochen-Belohnung: +${r.stars} Sterne${r.crowns ? ` +${r.crowns} Krone` : ''}`, true), 300); }
    if (run.mode === 'exp') {
      const r = claimExp(S, run); run.expReward = r;
      if (r) { setTimeout(() => toast(`Mission geschafft: +${r.spl} Heldensplitter`, true), 200); if (r.piece != null) setTimeout(() => (r.complete ? heroDone(r.hero) : pieceFound(r.hero)), 900); }
    }
    if (run.mode === 'normal' && areaMax(S) > areaBefore) { const z = areaMax(S); setTimeout(() => toast(`Neues Startgebiet frei: ${zoneName(10 * z + 1)}`, true), 600); }
    achCheck(run); save(); cloudSave(true); refresh();
  }
  /* ---------- Leisten ---------- */
  const crown = '<i class="rl-crown" aria-hidden="true"></i>', coin = '<i class="rl-coin" aria-hidden="true"></i>', soul = '<i class="rl-soulic" aria-hidden="true"></i>', star = '<i class="rl-star" aria-hidden="true"></i>', dust = '<i class="rl-dust" aria-hidden="true"></i>';
  function hud() {
    $('#rlStat').innerHTML = `<span class="rl-cur gold">${coin}${fmt(S.gold)}</span><span class="rl-cur soul">${soul}${S.souls}</span>${S.stars || S.rebirths ? `<span class="rl-cur star">${star}${S.stars}</span>` : ''}${feature(S, 'schmiede') ? `<span class="rl-cur dust">${dust}${S.dust}</span>` : ''}${S.asc || S.crowns ? `<span class="rl-cur crown">${crown}${S.crowns}</span>` : ''}
      <span class="note">Rekord ${S.best} von ${capOf(S) === Infinity ? '∞' : capOf(S)} · ${S.asc ? `Aufstieg ${S.asc} · ` : ''}${S.rebirths ? `${S.rebirths}× wiedergeboren · ` : ''}${S.runs} Läufe</span>`;
    { const d = $('#soloNews .dot'); if (d) d.hidden = newsSeen() >= UPDATES[0].id; }
    $('#soloSpeed').textContent = `Tempo ×${String(S.speed).replace('.', ',')}`;
  }
  function heroes() {
    const live = run && !run.dead;
    const list = HEROES.filter(h => hired(S, h.tree) || classOpen(S, h.tree));
    const next = HEROES.find(h => !h.puzzle && !classOpen(S, h.tree));
    const field = fieldOf(S), slots = fieldSlots(S), hiredN = HEROES.filter(h => hired(S, h.tree)).length;
    const bar = !live && (hiredN > 4 || (S.bench && S.bench.length)) ? `<div class="rl-lineup"><b>Aufstellung ${field.length}/${slots}</b>${HEROES.filter(h => hired(S, h.tree)).map(h => `<button class="${field.includes(h.id) ? 'on' : ''}" data-lineup="${h.id}" style="--hc:${h.color}">${PORTRAIT[h.id]} ${h.name}</button>`).join('')}<small>Tippe einen Helden an, um ihn ein- oder auszuwechseln.${slots < 6 ? ` Mehr Plätze: ${perk(S, 'p_feld') ? '' : 'Fünfter Platz im Sternen-Laden'}${!perk(S, 'p_feld') && !cperk(S, 'k_feld') ? ', ' : ''}${cperk(S, 'k_feld') ? '' : 'Sechster Platz im Kronen-Laden'}.` : ''}</small></div>` : '';
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
    else a.innerHTML = `<button class="btn ${confirm === 'giveup' ? 'danger' : 'ghost'} small" data-rl="giveup">${confirm === 'giveup' ? 'Wirklich aufgeben?' : run.mode === 'tower' ? 'Turm verlassen' : run.mode === 'weekly' ? 'Herausforderung beenden' : run.mode === 'exp' ? 'Mission abbrechen' : 'Lauf aufgeben'}</button>`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const costHTML = c => [c.g ? `<span class="rl-cur gold">${coin}${fmt(c.g)}</span>` : '', c.s ? `<span class="rl-cur soul">${soul}${c.s}</span>` : ''].join(' ');

  /* ---------- Bäume ---------- */
  function treeSVG(tree) {
    const list = NODES.filter(n => n.tree === tree);
    const P = n => [n.x * 100 + 50, n.y * 100 + 50];
    let lines = '', nodes = '';
    for (const n of list) for (const pid of n.p || []) {
      const p = NODE[pid], on = rank(S, n.id) > 0 && rank(S, pid) > 0, open = rank(S, pid) > 0;
      const [x1, y1] = P(p), [x2, y2] = P(n);
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${on ? 'on' : open ? 'open' : ''}"/>`;
    }
    for (const n of list) {
      const [x, y] = P(n), r = rank(S, n.id), av = available(S, n), afford = inCamp() && canBuy(S, n);
      const cls = ['nd', n.active ? 'act' : '', n.kind || '', r ? 'own' : av ? 'av' : 'lock', afford ? 'buy' : '', sel[tree] === n.id ? 'sel' : '', S.equip.includes(n.id) ? 'eq' : ''].join(' ');
      const R = n.kind === 'key' ? 36 : n.kind === 'start' ? 34 : 30;
      const shape = n.active ? `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="16"/>` : n.kind === 'key' ? `<polygon points="${x},${y - R} ${x + R},${y} ${x},${y + R} ${x - R},${y}"/>` : `<circle cx="${x}" cy="${y}" r="${R}"/>`;
      const lbl = n.max > 1 ? (n.max > 99 ? r : `${r}/${n.max}`) : '';
      nodes += `<g class="${cls}" data-node="${n.id}" role="button" aria-label="${esc(n.name)}">${afford ? `<circle cx="${x}" cy="${y}" r="${R + 10}" class="glow"/>` : ''}${shape}<text x="${x}" y="${y + 2}" class="ic">${n.icon}</text>${lbl ? `<text x="${x}" y="${y + 52}" class="rk">${lbl}</text>` : ''}</g>`;
    }
    return `<svg class="rl-tree2" viewBox="0 0 700 710">${lines}${nodes}</svg>`;
  }
  function detailHTML(tree) {
    const n = NODE[sel[tree]], r = rank(S, n.id), maxed = r >= n.max, h = HERO[tree], why = blockReason(S, n);
    const type = n.kind === 'start' ? (n.cost ? 'Anheuern' : 'Start') : n.active ? 'Aktive Fähigkeit' : n.kind === 'key' ? 'Schlüssel' : n.kind === 'inf' ? 'Endlos' : 'Passiv';
    let act = '';
    if (n.cost) {
      if (maxed && n.kind === 'key') { const c = nodeCost(S, { ...n, id: '_' }); act = `<button class="btn ${confirm === 'unkey' ? 'danger' : 'ghost'} small" data-rl="unkey" ${inCamp() ? '' : 'disabled'}>${confirm === 'unkey' ? 'Wirklich abnehmen?' : 'Schlüssel abnehmen'}</button><span class="note">Du bekommst ${costHTML(c)} zurück und kannst einen anderen Schlüssel wählen.</span>`; }
      else if (maxed) act = '<span class="note">Voll ausgebaut</span>';
      else if (why) act = `<span class="note">${esc(why)}</span>`;
      else act = `<div class="rl-buy"><button class="btn small" data-rl="buy" ${inCamp() && canBuy(S, n) ? '' : 'disabled'}>${n.kind === 'start' ? 'Anheuern' : r ? 'Verbessern' : 'Freischalten'}</button>${costHTML(nodeCost(S, n))}</div>${inCamp() ? '' : '<span class="note">Verbessern geht nur im Lager nach dem Lauf.</span>'}`;
    }
    if (n.active && r) {
      const on = S.equip.includes(n.id), used = S.equip.filter(id => NODE[id].tree === tree).length, lim = slotsOf(S, tree);
      act += `<button class="btn ghost small" data-rl="equip" ${inCamp() ? '' : 'disabled'}>${on ? 'Ablegen' : used >= lim ? 'Ausrüsten (tauscht)' : 'Ausrüsten'}</button>`;
    }
    return `<div class="rl-detail" style="--hc:${h.color}"><div class="rl-dhead"><span class="rl-dic">${n.icon}</span><div><b>${esc(n.name)}</b><span class="pill">${type}</span></div></div>
      ${n.max > 1 ? `<span class="note">${n.max > 99 ? `Stufe ${r}` : `Stufe ${r} von ${n.max}`}</span>` : ''}<p>${esc(n.desc)}</p><div class="row">${act}</div></div>`;
  }
  function sockRow(tree) {
    const cap = keyCap(S, tree), used = keysUsed(S, tree), extra = cap - 1, free = kFree(S);
    const dots = Array.from({ length: cap }, (_, i) => `<span class="rl-sock ${i < used ? 'on' : ''} ${i === 0 ? 'fix' : ''}" title="${i === 0 ? 'Fester Sockel' : 'Verteilbarer Sockel'}">⚿</span>`).join('');
    return `<div class="rl-sockrow"><span class="note">Schlüsselsockel ${used}/${cap}</span><span class="rl-socks">${dots}</span>
      <button class="btn ghost small" data-rl="sockadd" ${free > 0 && inCamp() ? '' : 'disabled'}>+ Sockel setzen</button>
      <button class="btn ghost small" data-rl="sockdel" ${extra > 0 && inCamp() ? '' : 'disabled'}>− Sockel abnehmen</button>
      <span class="note">frei: <b>${free}</b> von ${kSlots(S)}</span></div>`;
  }
  function heroTab(tree) {
    const h = HERO[tree], eq = S.equip.filter(id => NODE[id].tree === tree), ok = hired(S, tree);
    const lockedNote = !classOpen(S, tree) ? `<p class="warn">${h.puzzle ? `Diese Klasse bekommst du mit 6 Puzzleteilen aus den Expeditionen (${pieceCount(S, h.id)}/6).` : `Diese Klasse wird mit der ${h.rebirth}. Wiedergeburt freigeschaltet.`} Du kannst dir den Baum schon ansehen.</p>` : '';
    return `${lockedNote}<div class="rl-hhead" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><div><h3>${h.name}</h3><p class="note">${h.desc}</p>
      ${ok ? `<p class="note">Aktive Fähigkeiten ${eq.length}/${slotsOf(S, tree)}: ${eq.length ? esc(eq.map(ACT_NAME).join(', ')) : 'noch keine'} </p>${sockRow(tree)}` : ''}</div></div>
      <div class="rl-treewrap"><div class="rl-treebox">${treeSVG(tree)}</div>${detailHTML(tree)}</div>`;
  }
  function campInfo() {
    if (run && run.dead) {
      const extra = `${run.kills} Gegner besiegt${run.gold ? ` · ${coin}+${fmt(run.gold)}` : ''}${run.souls ? ` · ${soul}+${run.souls}` : ''}${run.runes.length ? ` · ${run.runes.length} Rune${run.runes.length > 1 ? 'n' : ''}` : ''}`;
      if (run.mode === 'weekly') { const r = run.weeklyReward || {}; return `<div class="rl-dead week"><b>Wochen-Herausforderung: Stufe ${run.stage}</b><span>Bestes Ergebnis diese Woche: Stufe ${S.weekly.best}${r.stars ? ` · ${star}+${r.stars}` : ''}${r.crowns ? ` · ${crown}+${r.crowns}` : ''}</span><span class="note">Belohnungen und Bestenliste findest du in der Ruhmeshalle.</span></div>`; }
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
      ${feature(S, 'schmiede') ? `<div class="row"><button class="btn small" data-rl="merge" ${canMerge(S, selR) ? '' : 'disabled'}>3 verschmelzen → ${ROMAN[selR.tier + 1] || ''}</button><button class="btn ghost small" data-rl="dismantle">Zerlegen (+${2 * Math.pow(3, selR.tier - 1)} Staub)</button></div>` : ''}</div>`;
    html += '<div class="rl-sockets">' + HEROES.filter(h => st[h.id]).map(h => {
      const slots = S.sockets[h.id] || [null, null, null];
      const b = Object.entries((() => { const list = slots.map(id => id && S.runes.find(r => r.id === id)).filter(Boolean); const c = {}; list.forEach(r => (c[r.t] = (c[r.t] || 0) + 1)); return c; })()).filter(([, n]) => n >= 3);
      return `<div class="rl-sockrow" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><b>${h.name}</b><div class="slots">${slots.map((id, i) => {
        const r = id && S.runes.find(x => x.id === id);
        return r ? `<span class="slotwrap" data-sock="${h.id}:${i}">${runeChip(r, 'in')}</span>` : `<button class="rl-slot ${selR ? 'ready' : ''}" data-sock="${h.id}:${i}">+</button>`;
      }).join('')}</div>${b.length ? `<span class="pill">Set: ${RUNE[b[0][0]].name}</span>` : ''}</div>`;
    }).join('') + '</div>';
    const free = S.runes.filter(r => !used.has(r.id)).sort((a, b) => b.tier - a.tier || a.t.localeCompare(b.t));
    html += `<h3 class="rl-h3">Lager (${S.runes.length}/${RUNE_CAP})</h3><div class="rl-inv">${free.map(r => runeChip(r, r.id === runeSel ? 'on' : '')).join('') || '<p class="note">Noch keine freien Runen. Besiege Bosse, um welche zu finden.</p>'}</div>`;
    if (feature(S, 'schmiede')) html += `<div class="rl-forge"><b>Runenschmiede</b><span class="note">Verschmilz 3 gleiche Runen zu einer stärkeren. Zerlege überflüssige Runen zu Staub. Für ${DUST_RUNE} Staub gibt es eine zufällige Rune.</span>
      <button class="btn small" data-rl="buyrune" ${S.dust >= DUST_RUNE && S.runes.length < RUNE_CAP ? '' : 'disabled'}>Zufällige Rune kaufen (${dust}${DUST_RUNE})</button></div>`;
    else html += '<p class="note">Mit der 5. Wiedergeburt kommt die Runenschmiede: Runen verschmelzen und zerlegen.</p>';
    return html;
  }
  /* ---------- Wiedergeburt ---------- */
  function ruhmTab() {
    const gain = starsFor(S), req = reqOf(S);
    if (S.rebirths >= 9) return ascSection(true) + shopHint('Sternen-Laden');
    let html = `<div class="rl-rebirth"><div><h3>Wiedergeburt ${S.rebirths + 1}</h3>
      <p class="note">Setzt Gold, Seelen, alle Fertigkeiten und deinen Rekord auf null. Dafür bekommst du Sterne für dauerhafte Verbesserungen, neue Stufen und neue Inhalte. Runen und Sterne bleiben.</p>
      <p>Voraussetzung: <b>Stufe ${req}</b> · dein Rekord: <b>${S.best}</b> → ${gain ? `<b class="rl-cur star">${star}${gain} Sterne</b>` : 'noch nicht erreicht'}</p></div>
      <button class="btn ${confirm === 'rebirth' ? 'danger' : ''}" data-rl="rebirth" ${gain && inCamp() ? '' : 'disabled'}>${confirm === 'rebirth' ? 'Wirklich zurücksetzen?' : 'Wiedergeboren werden'}</button></div>`;
    html += `<div class="rl-road">${ROADMAP.map(x => `<div class="rl-step ${S.rebirths >= x.r ? 'done' : S.rebirths + 1 === x.r ? 'next' : ''}"><span>${x.r}</span><div><b>${x.text}</b><small>Stufen bis ${CAPS[Math.min(x.r, CAPS.length - 1)]} · ${x.r + 1} Schlüssel pro Klasse</small></div></div>`).join('')}</div>`;
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
        <button class="btn small" data-perk="${p.id}" ${maxed || S.stars < c ? 'disabled' : ''}>${maxed ? 'Voll' : `${c} ${c === 1 ? 'Stern' : 'Sterne'}`}</button></div>`;
    }).join('') + '</div>';
  }
  function panel() {
    const p = $('#rlPanel');
    let html = notice ? `<p class="warn">${esc(notice)}</p>` : '';
    if (HERO[tab]) html += campInfo() + heroTab(tab);
    else if (tab === 'runen') html += campInfo() + runenTab();
    else if (tab === 'begleiter') html += campInfo() + compTab();
    else if (tab === 'halle') html += halleTab();
    else if (tab === 'zeit' || tab === 'laeden') html += ladenTab();
    else if (tab === 'exp') html += campInfo() + expTab();
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
    const g = e.target.closest('[data-node]');
    if (g) { sel[tab] = g.dataset.node; panel(); return; }
    const lu = e.target.closest('[data-lineup]');
    if (lu) {
      if (!inCamp()) { toast('Die Aufstellung änderst du im Lager.'); return; }
      const r = toggleField(S, lu.dataset.lineup);
      if (r === 'full') toast('Alle Plätze sind belegt. Nimm zuerst jemanden raus.');
      else if (r === 'last') toast('Mindestens ein Held muss kämpfen.');
      afterChange(); return;
    }
    const tb = e.target.closest('.rl-hero[data-tab], .rl-gotree[data-tab]');
    if (tb) { tab = tb.dataset.tab; confirm = ''; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
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
    if (b.dataset.shopjump) { const el = document.getElementById('shop-' + b.dataset.shopjump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (b.dataset.target) { S.exp.target = b.dataset.target; save(); panel(); return; }
    if (b.dataset.piece) { const [hid, i] = b.dataset.piece.split(':'); if (buyPiece(S, hid, Number(i))) { const h = HERO_BY_ID[hid]; if (assembled(S, hid)) heroDone(hid); else toast(`Puzzleteil ${pieceCount(S, hid)}/6 für ${h.name}`); afterChange(); } return; }
    if (b.dataset.tempo) { if (buyTempo(S)) { toast(`Tempo ×${String(maxSpeed(S)).replace('.', ',')} freigeschaltet!`, true); afterChange(); } return; }
    if (b.dataset.pathmode) { pathMode = b.dataset.pathmode; panel(); return; }
    if (b.dataset.perk) { if (buyPerk(S, PERKS.find(p => p.id === b.dataset.perk))) afterChange(); return; }
    const a = b.dataset.rl;
    if (a === 'start') startRun();
    else if (a === 'weekly') startRun('weekly');
    else if (a === 'mission') { S.exp.mission = b.dataset.m2; startRun('exp'); $('#soloCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (a === 'gosave') { tab = 'stand'; renderTabs(); panel(); }
    else if (a === 'ascend') { if (ask('ascend', panel)) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); ascend(S); run = null; achCheck(); afterChange(); playCine('asc', team); } }
    else if (a === 'tower') startRun('tower');
    else if (a === 'area') showAreas();
    else if (a === 'giveup') { if (ask('giveup', action)) { run.dead = true; S.runs++; save(); cloudSave(true); refresh(); } }
    else if (a === 'altar') { if (inCamp() && buyAltar(S)) { toast(`Seelenaltar Stufe ${S.altar}: Seelen ×${altarMul(S).toFixed(2).replace('.', ',')}`, true); afterChange(); } }
    else if (a === 'sockadd') { if (inCamp() && addSock(S, tab)) { toast('Sockel gesetzt.'); afterChange(); } }
    else if (a === 'sockdel') { if (inCamp()) { const r = removeSock(S, tab); if (r === 'used') toast('Alle Sockel sind belegt. Nimm zuerst eine Schlüssel-Fertigkeit ab.'); else if (r === 'ok') { toast('Sockel abgenommen. Du kannst ihn jetzt woanders setzen.'); afterChange(); } } }
    else if (a === 'unkey') { if (inCamp() && ask('unkey', panel)) { const n = NODE[sel[tab]], c = removeKey(S, n); if (c) { toast(`${n.name} abgenommen. Gold und Seelen sind zurück.`); afterChange(); } } }
    else if (a === 'buy') { if (inCamp() && buy(S, NODE[sel[tab]])) { achCheck(); afterChange(); } }
    else if (a === 'equip') { if (inCamp()) { toggleEquip(S, sel[tab]); afterChange(); } }
    else if (a === 'rebirth') { if (ask('rebirth', panel)) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); rebirth(S); run = null; achCheck(); afterChange(); playCine('rebirth', team); } }
    else if (a === 'merge') { const r = S.runes.find(x => x.id === runeSel); const nr = r && merge(S, r); if (nr) { runeSel = nr.id; toast(`${RUNE[nr.t].name} ${ROMAN[nr.tier]} geschmiedet`); afterChange(); } }
    else if (a === 'dismantle') { const r = S.runes.find(x => x.id === runeSel); if (r) { const d = dismantle(S, r); runeSel = null; toast(`+${d} Staub`); afterChange(); } }
    else if (a === 'buyrune') { const r = buyRune(S); if (r) { runeSel = r.id; toast(`Neue Rune: ${RUNE[r.t].name} I`); afterChange(); } }
    else if (a === 'cloudsave') { cloudMsg = 'Wird gespeichert …'; panel(); cloudSave(true); }
    else if (a === 'logout') { cloudSave(true).then(() => { setAcct(null); cloudMsg = ''; panel(); toast('Abgemeldet. Dein Spielstand bleibt auf dem Server.'); }); }
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
        setAcct({ name: r.name, token: r.token, updated: r.updated }); cloudMsg = `Gespeichert um ${timeStr(r.updated)}`; cloudDirty = false;
        toast(`Spielstand „${r.name}“ angelegt`); panel();
      } else if (f.id === 'rlLogin') {
        const r = await api('login', { name: val('#rlLName'), pass: $('#rlLPw').value });
        if (r.error) { toast(r.error); return; }
        setAcct({ name: r.name, token: r.token, updated: r.updated });
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
        <button class="btn small gold" data-cperk="${p.id}" ${maxed || S.crowns < c ? 'disabled' : ''}>${maxed ? 'Voll' : `${c} ${c === 1 ? 'Krone' : 'Kronen'}`}</button></div>`;
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
  function ladenTab() {
    const open = { stern: S.rebirths >= 1 || S.stars > 0 || S.asc > 0, zeit: S.rebirths >= 1 || S.asc > 0 || S.tempo > 0, altar: S.rebirths >= 1 || S.asc > 0 || S.altar > 0, schmiede: feature(S, 'schmiede') || S.asc > 0, krone: S.asc > 0 || S.crowns > 0, puzzle: expOpen(S) };
    const LIST = [
      ['stern', 'Sternen-Laden', 'mit der 1. Wiedergeburt', star], ['zeit', 'Zeitbaum', 'mit der 1. Wiedergeburt', '⏱'], ['altar', 'Seelenaltar', 'mit der 1. Wiedergeburt', soul], ['schmiede', 'Runenschmiede', 'mit der 5. Wiedergeburt', dust],
      ['krone', 'Kronen-Laden', 'mit dem 1. Aufstieg', crown], ['puzzle', 'Puzzle-Laden', 'mit dem 1. Aufstieg (Expeditionen)', '◈'],
    ];
    let html = `<div class="rl-wallet"><span class="rl-cur gold">${coin}${fmt(S.gold)}</span><span class="rl-cur soul">${soul}${S.souls}</span><span class="rl-cur star">${star}${S.stars}</span>${open.schmiede ? `<span class="rl-cur dust">${dust}${S.dust}</span>` : ''}${open.krone ? `<span class="rl-cur crown">${crown}${S.crowns}</span>` : ''}${open.puzzle ? `<span class="rl-cur spl">◈ ${S.exp.spl}</span>` : ''}</div>
      <div class="rl-shopnav">${LIST.map(([id, name, when, ic]) => open[id] ? `<button data-shopjump="${id}">${ic} ${name}</button>` : `<span class="lock" title="Kommt ${when}">🔒 ${name}</span>`).join('')}</div>`;
    if (open.stern) html += `<section id="shop-stern" class="rl-shop"><h3 class="rl-h3">Sternen-Laden</h3><p class="note">Du hast <span class="rl-cur star">${star}${S.stars}</span> Sterne. Sterne bekommst du bei jeder Wiedergeburt und aus der Wochen-Herausforderung. Beim Aufstieg werden die Sternen-Boni zurückgesetzt.</p><div class="rl-perks">${perkCards()}</div></section>`;
    if (open.zeit) html += `<section id="shop-zeit" class="rl-shop">${zeitTab()}</section>`;
    if (open.altar) { const L = S.altar || 0, c = altarCost(L), maxed = L >= ALTAR_MAX;
      html += `<section id="shop-altar" class="rl-shop"><h3 class="rl-h3">Seelenaltar</h3><p class="note">Opfere Gold für mehr Seelen. Jede Stufe gibt <b>+15 % Seelen</b> von Bossen, Elite-Gegnern und Abkürzungen. Der Altar bleibt <b>für immer</b>, auch nach Wiedergeburt und Aufstieg. Tipp: Kurz vor einer Wiedergeburt brauchst du dein Gold sowieso nicht mehr.</p>
      <div class="rl-altar"><div class="rl-altar-ic">${soul}</div><div><b>Stufe ${L} von ${ALTAR_MAX}</b><span class="note">Seelen jetzt ×${altarMul(S).toFixed(2).replace('.', ',')}${maxed ? '' : ` · nächste Stufe ×${(altarMul(S) + 0.15).toFixed(2).replace('.', ',')}`}</span></div>
      <button class="btn small" data-rl="altar" ${!maxed && S.gold >= c && inCamp() ? '' : 'disabled'}>${maxed ? 'Voll ausgebaut' : `Opfern: ${coin}${fmt(c)}`}</button></div></section>`; }
    if (open.schmiede) html += `<section id="shop-schmiede" class="rl-shop"><h3 class="rl-h3">Runenschmiede</h3><p class="note">Du hast <span class="rl-cur dust">${dust}${S.dust}</span> Runenstaub. Staub bekommst du beim Zerlegen von Runen (Reiter Runen). Platz für Runen: ${S.runes.length}/${RUNE_CAP}.</p>
      <div class="row"><button class="btn small" data-rl="buyrune" ${S.dust >= DUST_RUNE && S.runes.length < RUNE_CAP ? '' : 'disabled'}>Zufällige Rune kaufen (${dust}${DUST_RUNE})</button></div></section>`;
    if (open.krone) html += `<section id="shop-krone" class="rl-shop">${crownShop()}</section>`;
    if (open.puzzle) html += `<section id="shop-puzzle" class="rl-shop"><h3 class="rl-h3">Puzzle-Laden</h3><p class="note">Du hast <b>◈ ${S.exp.spl}</b> Heldensplitter aus den Expeditionen. Tippe ein leeres Teil an, um es für ${PIECE_COST} Splitter zu kaufen.</p>
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
    modal(`<span class="rl-mic">📰</span><h2>Neuigkeiten</h2><div class="rl-upd">${UPDATES.map((u, i) => `<details ${i === 0 ? 'open' : ''}><summary><b>${esc(u.title)}</b><small>${u.date}</small></summary>
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

  /* ================= Zeichnen ================= */
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const OUT = 'rgba(20,14,30,.85)';
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fillO(c) { ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke(); }
  function shadow(x, w) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 2, w, 4, 0, 0, 7); ctx.fill(); }

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
    if (e.elite) { const gl = ctx.createRadialGradient(0, -20, 4, 0, -20, 34); gl.addColorStop(0, 'rgba(201,166,255,.45)'); gl.addColorStop(1, 'rgba(201,166,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-34, -54, 68, 60); }
    const flash = e.hitT > 0, col = c => (flash ? '#ffffff' : c);
    const mv = e._px != null && Math.abs(e._px - e.x) > 0.05; e._px = e.x;
    const atk = run && e.atkAt != null ? Math.max(0, 1 - (run.time - e.atkAt) / 0.32) : 0;
    if (e.boss) bossDraw(e, t, col);
    else { const art = ENEMY_ART[e.type] || ENEMY_ART.schleim, G = (y0, y1, a, b) => (flash ? '#ffffff' : LG(y0, y1, a, b));
      ctx.save(); ctx.translate(-Math.sin(atk * Math.PI) * 6, 0); const es = ENEMY_SIZE[e.type] || 1; ctx.scale(es, es); art(e, t, t + e.bob, col, G, atk, mv); ctx.restore(); ctx.globalAlpha = 1; }
    if (false) { ctx.beginPath(); ctx.moveTo(-8, -52); ctx.lineTo(-8, -60); ctx.lineTo(-4, -55); ctx.lineTo(0, -62); ctx.lineTo(4, -55); ctx.lineTo(8, -60); ctx.lineTo(8, -52); ctx.closePath(); fillO('#ffd23f'); }
    if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, (e.boss ? -112 : -56) + Math.sin(a) * 3, 2.2, 0, 7); ctx.fill(); }
    if (e.poisonT > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(155,227,107,.8)'; ctx.beginPath(); ctx.arc(-6 + i * 6, -10 - ((t * 30 + i * 9) % 22), 2.5, 0, 7); ctx.fill(); }
    ctx.restore();
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
  function glowDot(x, y, r, rgb, a = 1) { ctx.fillStyle = RG(x, y, r, `rgba(${rgb},${a})`, `rgba(${rgb},0)`); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
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
    const { step } = begin(x, h, t, walk, 13, 13), sw = h ? h.swing : 0;
    cape(t, -50, '#3e7a3a', '#1f4a2a', 44, 18);
    legs(step, '#7a5a3a', '#4a3424', '#3a2a1a', 6);
    // Köcher
    ctx.save(); ctx.translate(-9, -46); ctx.rotate(-0.35); rr(-4, 0, 8, 22, 2); fillO('#6b4a2e');
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#c9cdd6'; ctx.fillRect(-3 + i * 2.5, -6, 1, 7); ctx.fillStyle = ['#e5484d', '#ffffff', '#7ee08a'][i]; ctx.beginPath(); ctx.moveTo(-3.5 + i * 2.5, -8); ctx.lineTo(-1.5 + i * 2.5, -8); ctx.lineTo(-2.5 + i * 2.5, -3); ctx.fill(); }
    ctx.restore();
    rr(-9, -48, 18, 28, 5); fillO(LG(-48, -20, '#7ec85a', '#3e7a3a'));
    ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8, -46); ctx.lineTo(8, -24); ctx.stroke();
    ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-9, -26, 18, 3);
    // Kopf mit Kapuze und Zopf
    ctx.fillStyle = '#e8c05a'; ctx.beginPath(); ctx.moveTo(-6, -58); ctx.quadraticCurveTo(-14, -46, -10, -34); ctx.lineTo(-7, -35); ctx.quadraticCurveTo(-10, -46, -3, -56); ctx.fill();
    ctx.beginPath(); ctx.arc(1, -56, 8, 0, 7); fillO('#f1c9a5');
    ctx.fillStyle = '#e8c05a'; ctx.beginPath(); ctx.arc(1, -58, 8.2, Math.PI * 1.05, Math.PI * 1.75); ctx.lineTo(1, -56); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, -54); ctx.quadraticCurveTo(-8, -70, 3, -68); ctx.quadraticCurveTo(12, -66, 10, -58); ctx.quadraticCurveTo(4, -64, -4, -60); ctx.closePath(); fillO(LG(-70, -54, '#5fae48', '#2f6b3f'));
    ctx.fillStyle = '#2f7a3f'; ctx.fillRect(4, -57, 2, 2.2); ctx.fillStyle = 'rgba(255,140,150,.35)'; ctx.beginPath(); ctx.arc(6, -53, 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.moveTo(8, -59); ctx.lineTo(12, -63); ctx.lineTo(9, -56); ctx.fill();
    // Langbogen
    const pull = sw > 0 ? Math.sin(sw * Math.PI) * 6 : 0;
    ctx.save(); ctx.translate(12, -38);
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, -22); ctx.quadraticCurveTo(10, 0, -4, 22); ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(4, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,240,240,.9)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(-4 - pull, 0); ctx.lineTo(-4, 22); ctx.stroke();
    if (pull > 1) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-4 - pull, -0.7, 20, 1.4); ctx.fillStyle = '#c9cdd6'; ctx.beginPath(); ctx.moveTo(16 - pull, -2.5); ctx.lineTo(20 - pull, 0); ctx.lineTo(16 - pull, 2.5); ctx.fill(); glowDot(18 - pull, 0, 7, '126,224,138', 0.5); }
    ctx.restore();
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(8 - pull * 0.6, -38, 2.6, 0, 7); ctx.fill();
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
    sky(bm, t, night || tower);
    if (tower) { ctx.fillStyle = 'rgba(60,30,90,.35)'; ctx.fillRect(0, 0, W, H); }
    if (R && !tower && nightmare(stage)) { ctx.fillStyle = 'rgba(120,10,30,.35)'; ctx.fillRect(0, 0, W, H); }
    range(night ? '#2a2745' : tower ? '#2b2140' : bm.far, 0.12, 150, 40, 0.01, scroll, true);
    range(night ? '#25313a' : tower ? '#3a2d55' : bm.hill[0], 0.3, 170, 22, 0.013, scroll);
    range(night ? '#1c2a22' : tower ? '#2a2140' : bm.hill[1], 0.55, 196, 14, 0.022, scroll);
    ground(bm, scroll, night || tower);
    if (R) {
      if (!tower) props(bm, scroll, t);
      if (!tower) weather(stage, t);
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
      if (R.fx.phoenix > 0) { ctx.fillStyle = `rgba(255,154,61,${Math.min(1, R.fx.phoenix) * 0.4})`; ctx.fillRect(0, 0, W, H); }
      grassFront(scroll, tower);
      for (const p of R.parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); }
      ctx.globalAlpha = 1;
      for (const f of R.floats) { ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = `${f.size}px "Bungee","Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); }
      ctx.globalAlpha = 1;
      const hg = ctx.createLinearGradient(0, 0, 0, 40); hg.addColorStop(0, 'rgba(15,12,22,.75)'); hg.addColorStop(1, 'rgba(15,12,22,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 40);
      ctx.font = '15px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
      ctx.fillText(tower ? `Turm · Etage ${R.stage}` : `Stufe ${R.stage}`, 12, 22);
      ctx.font = '12px "Figtree",sans-serif';
      const bossNow = tower || (R.rules && R.rules.includes('boss')) ? R.stage % 5 === 0 : R.stage % 10 === 0;
      ctx.fillStyle = bossNow ? '#c9a6ff' : 'rgba(255,255,255,.8)';
      ctx.fillText(bossNow ? `Boss: ${bossOf(stage)}` : tower ? `Rekord ${S.towerBest}` : `${zoneName(R.stage)} · Grenze ${st.cap === Infinity ? '∞' : st.cap}`, tower ? 170 : 106, 21);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffcf4a'; if (R.mode === 'normal') ctx.fillText(`+${fmt(R.gold)} Gold`, W - 12, 21);
      if (R.mode === 'weekly') { ctx.fillStyle = '#ffd23f'; ctx.fillText('Wochen-Herausforderung', W - 12, 21); }
      if (R.mode === 'exp') { const ms = MISSION[R.mission]; ctx.fillStyle = '#c8f08a'; ctx.fillText(`${ms.name}: ${ms.bosses ? `Bosse ${R.bossKills}/${ms.bosses}` : `Welle ${R.waves}/${ms.waves}`}`, W - 12, 21); }
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
      ctx.fillStyle = 'rgba(255,170,80,.16)'; ctx.beginPath(); ctx.ellipse(fx, GROUND - 10, 170 + Math.sin(t * 5) * 6, 84, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(350, GROUND); ctx.lineTo(400, GROUND - 70); ctx.lineTo(450, GROUND); fillO('#7a6046');
      ctx.fillStyle = '#2a1f17'; ctx.beginPath(); ctx.moveTo(390, GROUND); ctx.lineTo(400, GROUND - 32); ctx.lineTo(410, GROUND); ctx.fill();
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(400, GROUND - 70); ctx.lineTo(400, GROUND - 88); ctx.lineTo(417, GROUND - 82); ctx.lineTo(400, GROUND - 76); ctx.fill();
      shadow(fx, 26);
      ctx.fillStyle = '#5a3d25'; ctx.save(); ctx.translate(fx, GROUND - 3); ctx.rotate(0.25); ctx.fillRect(-20, -3, 40, 6); ctx.rotate(-0.5); ctx.fillRect(-20, -3, 40, 6); ctx.restore();
      for (let i = 0; i < 6; i++) { const h = 20 + Math.sin(t * 9 + i * 1.7) * 7; ctx.fillStyle = ['#e5484d', '#ffb547', '#ffd23f'][i % 3]; ctx.beginPath(); ctx.moveTo(fx - 15 + i * 6, GROUND - 6); ctx.quadraticCurveTo(fx - 12 + i * 5, GROUND - 6 - h, fx - 7 + i * 6, GROUND - 6); ctx.fill(); }
      for (let i = 0; i < 6; i++) { const p = ((t * 0.6 + i / 6) % 1); ctx.fillStyle = `rgba(255,200,120,${1 - p})`; ctx.fillRect(fx + Math.sin(i * 3 + t) * 10, GROUND - 20 - p * 70, 2, 2); }
      const camp = HEROES.filter(h => st[h.id] && (!st.field || st.field.includes(h.id))).map(h => h.id);
      const spots = {}; let fr = 0, bk = 0;
      for (const k of ['w', 'd', 't']) if (camp.includes(k)) spots[k] = 296 + 30 * fr++;
      for (const k of ['r', 's', 'a', 'm', 'n', 'b', 'e', 'p']) if (camp.includes(k)) spots[k] = 210 - 30 * bk++;
      camp.forEach(k => DRAW[k](spots[k], null, t, false));
      if (camp.includes('t')) wolf(spots.t + 32, t, false);
      if (camp.includes('e')) turret(spots.e - 22, t, 0);
      drawComps(t, null);
      ctx.textAlign = 'center'; ctx.font = '20px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#ffb547';
      const done = run && run.dead;
      ctx.fillText(done ? (run.mode === 'tower' ? `Turm: Etage ${run.stage}` : run.victory ? `Stufengrenze ${st.cap} erreicht!` : `Gefallen auf Stufe ${run.stage}`) : 'Lager', W / 2, 42);
      ctx.font = '12px "Figtree",sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText(done ? `${run.kills} Gegner${run.gold ? ` · +${fmt(run.gold)} Gold` : ''}${run.souls ? ` · +${run.souls} Seelen` : ''}${run.runes.length ? ` · ${run.runes.length} Runen` : ''}` : 'Verbessere deine Helden und starte dann einen Lauf', W / 2, 64);
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
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
