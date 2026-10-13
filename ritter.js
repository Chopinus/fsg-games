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
  const pw = (h, s, v) => ({ h, s, pow: v }), ad = (h, s, v) => ({ h, s, add: v }), mu = (h, s, v) => ({ h, s, mul: v }), xx = (h, s, v) => ({ h, s, x: v });
  const infG = (h, base) => ({ max: 9999, cost: G(base, 1.35), kind: 'inf', fx: [pw(h, 'atk', 1.04), pw(h, 'hp', 1.04)], icon: '∞' });
  const infS = h => ({ max: 9999, cost: r => ({ g: 0, s: 6 + 2 * r }), kind: 'inf', fx: [pw(h, 'atk', 1.06), pw(h, 'hp', 1.06)], icon: '∞' });

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
    { id: 'heil', name: 'Heilgebet', icon: '✚', x: 3, y: 3, p: ['armor', 'regen'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: heilt alle Helden um 25 % (+5 % je Stufe), wenn einer unter 55 % fällt. Abklingzeit 22 s.' },
    { id: 'blitz', name: 'Blitzschlag', icon: 'ϟ', x: 5, y: 3, p: ['truhe', 'seelenf'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: trifft den stärksten Gegner mit 400 % Schaden (+150 % je Stufe). Abklingzeit 14 s.' },
    { id: 'doppel', name: 'Doppelschlag', icon: '»', x: 0, y: 2, p: ['wirbel'], max: 3, cost: ACTC2, fx: [ad('r', 'dbl', 0.08)], desc: '+8 % Chance je Stufe, zweimal zuzuschlagen' },
    { id: 'kritd', name: 'Vernichtung', icon: '!', x: 2, y: 2, p: ['wirbel'], max: 8, cost: G(150, 1.9), fx: [ad('r', 'critD', 0.15)], desc: '+15 % kritischer Schaden je Stufe' },
    { id: 'dorn', name: 'Dornenpanzer', icon: '✱', x: 3, y: 2, p: ['heil'], max: 3, cost: ACTC2, fx: [ad('r', 'thorns', 0.2)], desc: 'Wirft 20 % je Stufe des erlittenen Schadens zurück' },
    { id: 'schild', name: 'Schildstoß', icon: '◘', x: 4, y: 2, p: ['heil'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: 150 % Schaden und betäubt den vordersten Gegner 1,5 s (+0,5 s je Stufe). Abklingzeit 9 s.' },
    { id: 'habgier', name: 'Habgier', icon: '¤', x: 5, y: 2, p: ['blitz'], max: 3, cost: ACTC2, fx: [mu('g', 'gold', 0.15)], desc: '+15 % Gold je Stufe' },
    { id: 'schrei', name: 'Kriegsschrei', icon: '▲', x: 6, y: 2, p: ['blitz'], max: 3, cost: ACTC, active: true, desc: 'Aktiv: alle Helden machen 6 s lang +40 % Schaden (+15 % je Stufe). Abklingzeit 20 s.' },
    { id: 'berserk', name: 'Berserker', icon: 'B', x: 1, y: 1, p: ['doppel', 'kritd'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', fx: [xx('r', 'atk', 1.4), xx('r', 'hp', 0.8)], desc: 'Schlüssel: Ritter +40 % Schaden, aber −20 % Leben' },
    { id: 'phoenix', name: 'Zweites Leben', icon: 'Φ', x: 3, y: 1, p: ['dorn', 'schild'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', fx: [ad('r', 'revive', 1)], desc: 'Schlüssel: Einmal pro Lauf steht der Ritter mit halbem Leben wieder auf' },
    { id: 'ernte', name: 'Seelenernte', icon: '☽', x: 5, y: 1, p: ['habgier', 'schrei'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', fx: [xx('g', 'soulMul', 2)], desc: 'Schlüssel: Bosse geben doppelt so viele Seelen' },
    { id: 'schmiede', name: 'Schmiedekunst', icon: '∞', x: 2, y: 0, p: ['berserk', 'phoenix'], max: 9999, cost: G(2500, 1.35), kind: 'inf', fx: [pw('all', 'atk', 1.03), pw('all', 'hp', 1.03)], desc: '+3 % Schaden und Leben aller Helden je Stufe, ohne Obergrenze' },
    { id: 'ahnen', name: 'Ahnenkraft', icon: '∞', x: 4, y: 0, p: ['phoenix', 'ernte'], max: 9999, cost: r => ({ g: 0, s: 6 + 2 * r }), kind: 'inf', fx: [pw('all', 'atk', 1.05), pw('all', 'hp', 1.05)], desc: '+5 % Schaden und Leben aller Helden je Stufe, ohne Obergrenze' },
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
      I1: { id: 'w_inf1', name: 'Festungsbau', ...infG('w', 3000), desc: '+4 % Schaden und Leben des Wächters je Stufe, ohne Obergrenze' },
      I2: { id: 'w_inf2', name: 'Ewige Wacht', ...infS('w'), desc: '+6 % Schaden und Leben des Wächters je Stufe, ohne Obergrenze' },
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
      I1: { id: 's_inf1', name: 'Pfeilmacherei', ...infG('s', 4000), desc: '+4 % Schaden und Leben der Schützin je Stufe, ohne Obergrenze' },
      I2: { id: 's_inf2', name: 'Waldgeist', ...infS('s'), desc: '+6 % Schaden und Leben der Schützin je Stufe, ohne Obergrenze' },
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
      I1: { id: 'm_inf1', name: 'Arkane Bibliothek', ...infG('m', 6000), desc: '+4 % Schaden und Leben des Magiers je Stufe, ohne Obergrenze' },
      I2: { id: 'm_inf2', name: 'Sternenstaub', ...infS('m'), desc: '+6 % Schaden und Leben des Magiers je Stufe, ohne Obergrenze' },
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
      I1: { id: 'p_inf1', name: 'Tempelbau', ...infG('p', 8000), desc: '+4 % Leben und Schaden der Priesterin je Stufe, ohne Obergrenze' },
      I2: { id: 'p_inf2', name: 'Göttlicher Funke', ...infS('p'), desc: '+6 % Leben und Schaden der Priesterin je Stufe, ohne Obergrenze' },
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
      I1: { id: 't_inf1', name: 'Wildgehege', ...infG('t', 10000), desc: '+4 % Schaden und Leben des Bändigers je Stufe, ohne Obergrenze' },
      I2: { id: 't_inf2', name: 'Geist der Wildnis', ...infS('t'), desc: '+6 % Schaden und Leben des Bändigers je Stufe, ohne Obergrenze' },
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
  const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));
  for (const h of HEROES) if (h.hire) NODE[h.hire].reqRebirth = h.rebirth;

  // Dauerhafte Upgrades aus der Wiedergeburt (bezahlt mit Sternen)
  const PERKS = [
    { id: 'p_macht', name: 'Heldenblut', desc: '+20 % Schaden und Leben aller Helden je Stufe (wächst aufeinander auf)', max: 999, cost: r => 1 + r },
    { id: 'p_gold', name: 'Goldader', desc: '+25 % Gold je Stufe', max: 999, cost: r => 1 + r },
    { id: 'p_seele', name: 'Seelenquelle', desc: '+1 Seele pro besiegtem Boss je Stufe', max: 10, cost: r => 2 + 2 * r },
    { id: 'p_start', name: 'Sprungstart', desc: 'Läufe beginnen 5 Stufen weiter je Stufe (höchstens bis 10 unter deinem Rekord aller Zeiten)', max: 20, cost: r => 2 + r },
    { id: 'p_freunde', name: 'Alte Freunde', desc: 'Angeheuerte Klassen bleiben nach einer Wiedergeburt angeheuert', max: 1, cost: () => 5 },
    { id: 'p_platz', name: 'Dritte Hand', desc: '+1 Platz für aktive Fähigkeiten des Ritters', max: 1, cost: () => 8 },
    { id: 'p_zins', name: 'Startkapital', desc: 'Nach einer Wiedergeburt startest du mit 500 Gold je Stufe', max: 30, cost: r => 1 + Math.floor(r / 2) },
    { id: 'p_seelenst', name: 'Seelenvorrat', desc: 'Nach einer Wiedergeburt startest du mit 3 Seelen je Stufe', max: 20, cost: r => 2 + r },
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
    { id: 'party6', name: 'Volle Gruppe', desc: 'Habe alle 6 Klassen in der Gruppe', ok: S => HEROES.every(h => hired(S, h.tree)) },
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
      asc: 0, crowns: 0, cperks: {}, ach: {}, tot: { kills: 0, souls: 0 }, weekly: { week: '', best: 0, claimed: 0 }, comps: {}, compActive: [], seenIntro: false, area: 0 };
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
    out.speed = [1, 2, 3].includes(out.speed) ? out.speed : 1;
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
    out.equip = [];
    for (const id of Array.isArray(d.equip) ? d.equip : []) if (NODE[id] && NODE[id].active && out.nodes[id] > 0 && !out.equip.includes(id)) out.equip.push(id);
    for (const h of HEROES) { const mine = out.equip.filter(id => NODE[id].tree === h.tree), lim = slotsOf(out, h.tree); if (mine.length > lim) out.equip = out.equip.filter(id => !mine.slice(lim).includes(id)); }
    delete out.reset;
    return out;
  }
  const rank = (S, id) => S.nodes[id] || 0;
  const perk = (S, id) => S.perks[id] || 0;
  const slotsOf = (S, tree) => HERO[tree].slots + (tree === 'ritter' ? (S.perks?.p_platz || 0) : 0) + (S.cperks?.k_hand || 0);
  const cperk = (S, id) => (S.cperks && S.cperks[id]) || 0;
  const hired = (S, tree) => tree === 'ritter' || rank(S, HERO[tree].hire) > 0;
  const classOpen = (S, tree) => S.rebirths >= HERO[tree].rebirth || hired(S, tree);
  const keysUsed = (S, tree) => NODES.filter(n => n.tree === tree && n.kind === 'key' && rank(S, n.id) > 0).length;
  function blockReason(S, n) {
    if (n.reqRebirth && S.rebirths < n.reqRebirth && !rank(S, n.id)) return `Wird mit der ${n.reqRebirth}. Wiedergeburt freigeschaltet.`;
    if (n.kind === 'key' && !rank(S, n.id) && keysUsed(S, n.tree) >= keyLimit(S)) return `Du kannst in dieser Klasse ${keyLimit(S)} Schlüssel-Fertigkeit${keyLimit(S) > 1 ? 'en' : ''} haben. Jede Wiedergeburt erlaubt eine mehr.`;
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
    S.stars -= perkCost(S, p); S.perks[p.id] = perk(S, p.id) + 1; return true;
  }
  function keepHires(S) { return perk(S, 'p_freunde') || cperk(S, 'k_veteran') ? HEROES.filter(h => h.hire && rank(S, h.hire)).map(h => h.hire) : []; }
  function rebirth(S) {
    const st = starsFor(S); if (!st) return 0;
    S.stars += st; S.rebirths++; S.bestEver = Math.max(S.bestEver, S.best);
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
    S.crowns -= cperkCost(S, p); S.cperks[p.id] = cperk(S, p.id) + 1; return true;
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
  };
  const ZERO = { dr: 0, regen: 0, dbl: 0, thorns: 0, block: 0, dodge: 0, lifesteal: 0, cdr: 0, actMul: 1, burn: 0, pierce: 0, shots: 1, splash: 0, stunChance: 0,
    bossDmg: 0, vuln: 0, extraShot: 0, revive: 0, heal: 0, overShield: 0, reviveFast: 0, miracle: 0, wolfAtk: 0, wolfAps: 0, wolves: 0, wolfCrit: 0, wolfHeal: 0, packBonus: 0 };
  function stats(S) {
    const hs = {};
    for (const h of HEROES) if (hired(S, h.tree)) hs[h.id] = { ...ZERO, ...BASE[h.id] };
    const g = { gold: 1, chest: 0, eliteSoul: 0, soulMul: 1, partyAtk: 1, partyHp: 1, partyDr: 0, partyRegen: 0, eliteGold: 1 };
    const each = (h, fn) => (h === 'all' ? Object.values(hs).forEach(fn) : h === 'g' ? fn(g) : hs[h] && fn(hs[h]));
    for (const n of NODES) {
      const r = rank(S, n.id); if (!r || !n.fx) continue;
      for (const e of n.fx) each(e.h, T => {
        if (e.pow) T[e.s] *= Math.pow(e.pow, r);
        else if (e.add) T[e.s] += e.add * r;
        else if (e.mul) T[e.s] *= 1 + e.mul * r;
        else if (e.x) T[e.s] *= e.x;
        if (e.h === 'all' && e.s === 'atk' && T.heal) T.heal *= Math.pow(e.pow, r);
      });
    }
    const achN = Object.keys(S.ach || {}).length;
    const perm = Math.pow(1.2, perk(S, 'p_macht')) * (1 + 0.03 * S.towerBest) * Math.pow(1 + ACH_BONUS, achN) * Math.pow(1.5, cperk(S, 'k_blut'));
    g.gold *= (1 + 0.25 * perk(S, 'p_gold')) * Math.pow(2, cperk(S, 'k_schatz'));
    g.soulMul *= Math.pow(2, cperk(S, 'k_seele'));
    const comp = {};
    for (const id of S.compActive || []) { const l = (S.comps || {})[id] || 0; if (l) comp[id] = l; }
    if (comp.eule) { g.gold *= 1 + 0.05 * comp.eule; Object.values(hs).forEach(T => (T.crit += 0.015 * comp.eule)); }
    if (comp.golem) { g.partyDr += Math.min(0.3, 0.015 * comp.golem); g.partyHp *= 1 + 0.03 * comp.golem; }
    if (comp.phoenix) g.partyRegen += 0.0015 * comp.phoenix;
    for (const [hid, T] of Object.entries(hs)) {
      const rb = runeBonus(S, hid);
      T.atk *= perm * g.partyAtk * (1 + (rb.kraft || 0)); T.hp *= perm * g.partyHp * (1 + (rb.leben || 0)); if (T.heal) T.heal *= perm * (1 + (rb.kraft || 0));
      if (T.wolfAtk) T.wolfAtk *= perm * g.partyAtk * (1 + (rb.kraft || 0));
      T.aps *= 1 + (rb.eile || 0); T.critD += rb.zorn || 0; T.cdr = Math.min(0.6, T.cdr + (rb.fokus || 0));
      T.dr = Math.min(0.85, T.dr + g.partyDr + (rb.schutz || 0)); T.regen += g.partyRegen;
      g.gold *= 1 + (rb.glueck || 0); g.eliteSoul += rb.seele || 0;
    }
    const area = Math.min(S.area || 0, areaMax(S));
    const startStage = Math.max(1 + 10 * area, Math.min(1 + 5 * perk(S, 'p_start'), (S.bestEver || 0) - 10, capOf(S)));
    const dragon = comp.drache ? 0.3 * (1 + 0.2 * comp.drache) * Object.values(hs).reduce((a, T) => a + T.atk, 0) : 0;
    return { ...hs, ...Object.fromEntries(HEROES.filter(h => !hs[h.id]).map(h => [h.id, null])), g, soulBonus: perk(S, 'p_seele'), startStage, cap: capOf(S), comp, dragon };
  }
  // Werte mit den Regeln der Wochen-Herausforderung
  function statsFor(S, mode) {
    const st = stats(S);
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
    heil: { cd: () => 22, ready: (run, st) => anyBelow(run, st, 0.55), cast: (c, r) => c.healAll(0.25 + 0.05 * (r - 1)) },
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
  const zoneOf = stage => Math.floor((Math.max(1, stage) - 1) / 10);
  const biomeOf = stage => BIOMES[zoneOf(stage) % BIOMES.length];
  const zoneName = stage => (zoneOf(stage) < ZONES.length ? ZONES[zoneOf(stage)] : `Albtraum ${ROMAN[Math.min(10, zoneOf(stage) - ZONES.length + 1)] || zoneOf(stage) - ZONES.length + 1}`);
  const nightmare = stage => stage > 150;
  // Startgebiet: ein Gebiet ist wählbar, sobald der Boss des Gebiets davor in diesem Durchgang besiegt wurde
  const areaMax = S => Math.max(0, Math.min(Math.floor((S.best || 0) / 10), Math.floor((Math.min(capOf(S), 1e6) - 1) / 10)));
  // Gegner werden pro Stufe stärker – anfangs schneller, später langsamer
  function grow(stage, a, b, c) { const s = stage - 1, s1 = Math.min(s, 30), s2 = Math.min(Math.max(s - 30, 0), 50), s3 = Math.max(s - 80, 0); return Math.exp(s1 * Math.log(a) + s2 * Math.log(b) + s3 * Math.log(c)); }
  const TUNE = { hp: [1.135, 1.115, 1.085], dmg: [1.12, 1.1, 1.075], gold: [1.14, 1.105, 1.08] };
  const RANGED = { hp: 0.65, dmg: 0.5, rate: 2.4 };
  const rangedCount = stage => { const z = zoneOf(stage); return z === 0 ? 0 : z < 3 ? 1 : 2; };
  function makeEnemy(stage, i, boss, eliteForce, run, ranged) {
    const elite = !boss && (eliteForce || Math.random() < ((run && run.eliteChance) || 0.12));
    const m = (boss ? 6 : elite ? 3 : 1) * (ranged ? RANGED.hp : 1), diff = (run && run.diff) || 1;
    const hp = 20 * grow(stage, ...TUNE.hp) * m * diff * ((run && run.hpMul) || 1);
    return { x: 560 + i * 46, hp, max: hp, dmg: 4 * grow(stage, ...TUNE.dmg) * (boss ? 2 : elite ? 1.5 : 1) * diff, atkT: 1.2, rate: (boss ? 1.6 : 1.3) / ((run && run.speed) || 1),
      gold: grow(stage, ...TUNE.gold) * (boss ? 10 : elite ? 4 : 1), boss, elite, ranged: !!ranged, shotT: 0.8 + Math.random() * 1.2, type: biomeOf(stage).enemy, stun: 0, hitT: 0, poison: 0, poisonT: 0, burn: 0, burnT: 0, mark: 0, markT: 0, bob: Math.random() * 6 };
  }
  const FRONT = ['w', 'r', 't'], BACK = ['s', 'm', 'p'];
  function newRun(S, mode) {
    const st = statsFor(S, mode), tower = mode === 'tower', weekly = mode === 'weekly', rules = weekly ? st.rules : [];
    let order = [...FRONT, ...BACK].filter(k => st[k]);
    if (rules.includes('trio')) order = order.slice(0, 3);
    const pos = {}; order.forEach((k, i) => (pos[k] = 152 - i * 25));
    const h = {}; for (const k of order) h[k] = { hp: st[k].hp, alive: true, atkT: 0.3 + Math.random() * 0.4, wolfT: 0.5, swing: 0, hurtT: 0, revived: false, shield: 0 };
    const run = { mode: tower ? 'tower' : weekly ? 'weekly' : 'normal', stage: tower || weekly ? 1 : st.startStage, startStage: tower || weekly ? 1 : st.startStage, rules, losses: 0,
      diff: ascDiff(S), speed: rules.includes('speed') ? 1.5 : 1, hpMul: rules.includes('giant') ? 2 : 1, eliteChance: rules.includes('elite') ? 0.4 : 0.12, noheal: rules.includes('noheal'),
      dragonT: 2, compRevive: false, bannerT: 0, kills: 0, gold: 0, souls: 0, runes: [], phoenixUsed: false, miracleUsed: false,
      fx: {}, cds: {}, buffT: 0, buffMul: 0, hautT: 0, racheT: 0, packT: 0, order, pos, frontX: pos[order[0]], h,
      enemies: [], floats: [], arrows: [], eshots: [], parts: [], scroll: 0, dead: false, victory: false, deadT: 0, time: 0, shake: 0 };
    // Abkürzung: übersprungene Bosse geben einen Teil ihrer Seelen
    if (run.mode === 'normal' && run.stage > 10) {
      let skip = 0; for (let b = 10; b < run.stage; b += 10) skip += (1 + Math.floor(b / 20)) * st.g.soulMul + st.soulBonus;
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
    const boss = run.stage % (run.rules && run.rules.includes('boss') ? 5 : 10) === 0, n = boss ? 3 : 5;
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
    if (k === 'w' && run.hautT > 0) d *= 0.4;
    if (h.shield > 0) { const a = Math.min(h.shield, d); h.shield -= a; d -= a; }
    h.hp -= d; h.hurtT = 0.2;
    if (attacker) { let refl = T.thorns; if (k === 'w' && run.racheT > 0) refl += 0.6; if (refl) attacker.hp -= raw * refl; }
    if (h.hp <= 0) {
      if (st.p && st.p.miracle && !run.miracleUsed && run.h.p && run.h.p.alive) { run.miracleUsed = true; run.order.forEach(x => run.h[x].alive && (run.h[x].hp = st[x].hp)); h.hp = T.hp * 0.5; c.float(k, 'Wunder!', '#ffe48a', 18); run.fx.heal = 0.5; }
      else if (T.revive && !h.revived) { h.revived = true; h.hp = T.hp * (k === 'w' ? 1 : 0.5); c.float(k, k === 'w' ? 'Letzte Bastion!' : 'Zweites Leben!', '#ffb547', 16); }
      else { h.hp = 0; h.alive = false; h.shield = 0; run.losses++; c.float(k, `${HERO_BY_ID[k].name} gefallen`, '#ff8a8a', 13); }
    }
  }
  function step(S, st, run, dt) {
    if (run.dead) { run.deadT += dt; return; }
    const c = ctxFor(S, st, run);
    run.time += dt; run.bannerT -= dt; run.buffT -= dt; run.hautT -= dt; run.racheT -= dt; run.packT -= dt; run.shake = Math.max(0, run.shake - dt);
    for (const k of run.order) {
      const h = run.h[k]; if (!h.alive) continue;
      if (st[k].regen) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * st[k].regen * dt);
      h.swing = Math.max(0, h.swing - dt * 4); h.hurtT -= dt;
    }
    for (const k in run.cds) run.cds[k] = Math.max(0, run.cds[k] - dt);
    for (const k in run.fx) if (typeof run.fx[k] === 'number' && !/X$/.test(k)) run.fx[k] -= dt;
    const fk = frontHero(run);
    if (!fk) { run.dead = true; S.runs++; return 'dead'; }
    run.frontX = run.pos[fk];
    run.enemies.sort((a, b) => a.x - b.x);
    let walking = true;
    run.enemies.forEach((e, i) => {
      const target = run.frontX + 50 + i * 34 + (e.boss ? 10 : 0);
      if (e.stun > 0) e.stun -= dt;
      else if (e.x > target) e.x = Math.max(target, e.x - 75 * run.speed * dt);
      else if (e.x < target) e.x = Math.min(target, e.x + 75 * dt);
      if (i === 0 && e.x <= target + 1) walking = false;
      e.hitT -= dt; e.markT -= dt; e.frozen -= dt; e.rooted -= dt;
      if (e.poisonT > 0) { e.poisonT -= dt; e.hp -= e.poison * dt; }
      if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burn * dt; }
    });
    if (walking) run.scroll += 70 * dt;
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
      h.atkT -= dt;
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
        } else if (k === 'm') {
          for (let i = 0; i < T.shots; i++) { c.arrow('m', tgt, 0.35 + i * 0.1, 'feuer'); c.hit('m', tgt, 1, '#ffd0a0'); run.enemies.slice(1).filter(e => e.x - tgt.x < 70).forEach(e => c.hit('m', e, T.splash, '#ffd0a0')); }
        } else {
          c.hit(k, tgt, 1, k === 'w' ? '#cfe0ff' : null);
          if (T.dbl && Math.random() < T.dbl && tgt.hp > 0) c.hit(k, tgt, 1);
          if (T.stunChance && Math.random() < T.stunChance) tgt.stun = Math.max(tgt.stun, 0.5);
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
    // Gegner greifen an
    if (f && eng && f.stun <= 0 && !f.ranged) {
      f.atkT -= dt;
      if (f.atkT <= 0 && f.hp > 0) {
        f.atkT += f.rate;
        hurtHero(c, fk, f.dmg, f);
        if (f.boss) { run.shake = 0.15; for (const k of run.order) if (k !== fk) hurtHero(c, k, f.dmg * 0.35, null); }
      }
    }
    // Besiegte Gegner
    const g = st.g;
    for (const e of run.enemies) {
      if (e.hp > 0) continue;
      run.kills++; S.tot.kills++;
      c.burst(e.x, 200, e.boss ? '#c9a6ff' : '#ffffff', e.boss ? 24 : 8);
      if (run.mode === 'normal') {
        let gold = e.gold * g.gold * (e.boss || e.elite ? g.eliteGold : 1);
        if (Math.random() < g.chest) { gold *= 10; c.efloat(e, 'Truhe!', '#ffd23f', 16); }
        gold = Math.max(1, Math.round(gold));
        S.gold = Math.min(1e18, S.gold + gold); run.gold += gold;
        run.floats.push({ x: e.x, y: 130, text: '+' + fmt(gold), color: '#ffcf4a', size: 14, t: 1 });
      }
      let souls = 0;
      if (e.boss) souls = (1 + Math.floor(run.stage / 20)) * g.soulMul + st.soulBonus;
      else if (e.elite && Math.random() < g.eliteSoul) souls = 1;
      if (run.mode === 'tower') souls = e.boss ? 1 : 0;
      if (run.mode === 'weekly') souls = 0;
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
      S.tot.kills, S.tot.souls, COMPS.length, ...COMPS.map(c => S.comps[c.id] || 0), ...[0, 1].map(i => (S.compActive[i] ? COMPS.findIndex(c => c.id === S.compActive[i]) + 1 : 0))]);
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

  const core = { areaMax, zoneName, BIOMES, HEROES, HERO, NODES, NODE, PERKS, RUNES, RUNE, TUNE, fresh, migrate, stats, newRun, step, buy, canBuy, available, blockReason, nodeCost, rank, perk, buyPerk, perkCost,
    rebirth, ascend, crownsFor, buyCperk, cperkCost, cperk, CPERKS, levelComp, toggleComp, compCost, compMax, compSlots, COMPS, checkAch, ACH, claimWeekly, weekId, weekRules, RULE, WEEK_TIERS, statsFor, starsFor, toggleEquip, slotsOf, hired, classOpen, keysUsed, keyLimit, capOf, reqOf, feature, encode, decode, fmt, socket, unsocket, merge, canMerge, dismantle, buyRune, runeVal, addRune };
  if (typeof module !== 'undefined') { module.exports = core; return; }

  /* ================= Oberfläche ================= */
  const $ = s => document.querySelector(s);
  const KEY = 'fsg.ritter';
  const ACT_NAME = id => NODE[id].name;
  const PORTRAIT = { r: '⚔', w: '⛨', s: '➶', m: '✦', p: '☀', t: '✥' };
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
          <button class="btn ghost small" id="soloSpeed">Tempo ×1</button></div>
        <div class="rl-stage"><div id="soloCanvas" class="rl-canvas"></div></div>
        <div class="rl-heroes" id="rlHeroes"></div>
        <div class="rl-bar"><div class="rl-stat" id="rlStat"></div><div id="rlAction" class="row"></div></div>
        <div class="rl-tabs" role="tablist"></div>
        <div id="rlPanel"></div>`;
      cv = document.createElement('canvas'); $('#soloCanvas').appendChild(cv); ctx = cv.getContext('2d');
      cv.addEventListener('click', () => { if (cine && cine.t > 0.4) cine.t = Math.max(cine.t, cine.dur - 0.25); });
      window.addEventListener('resize', sizeCanvas);
      $('#soloBack').onclick = close;
      $('#soloSpeed').onclick = () => { S.speed = S.speed >= 3 ? 1 : S.speed + 1; hud(); };
      $('.rl-tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; confirm = ''; runeSel = null; renderTabs(); panel(); } };
      for (const id of ['#rlPanel', '#rlAction', '#rlHeroes']) $(id).addEventListener('click', onClick);
      $('#rlPanel').addEventListener('submit', onSubmit);
    }
    sizeCanvas(); refresh();
    if (!S.seenIntro) showIntro(); else if (S.news && !cine) showNews();
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
    if (run && !run.dead) for (let i = 0; i < S.speed; i++) {
      if (step(S, st, run, dt) === 'dead') { endRun(); break; }
    } else if (run) run.deadT += dt;
    draw(now / 1000);
    hudT += dt; if (hudT > 0.2) { hudT = 0; hud(); if (run && !run.dead) heroes(); }
    raf = requestAnimationFrame(loop);
  }

  function endRun() {
    if (run.mode === 'weekly') { const r = claimWeekly(S, run); run.weeklyReward = r; if (r.stars || r.crowns) setTimeout(() => toast(`Wochen-Belohnung: +${r.stars} Sterne${r.crowns ? ` +${r.crowns} Krone` : ''}`, true), 300); }
    if (run.mode === 'normal' && areaMax(S) > areaBefore) { const z = areaMax(S); setTimeout(() => toast(`Neues Startgebiet frei: ${zoneName(10 * z + 1)}`, true), 600); }
    achCheck(run); save(); cloudSave(true); refresh();
  }
  /* ---------- Leisten ---------- */
  const crown = '<i class="rl-crown" aria-hidden="true"></i>', coin = '<i class="rl-coin" aria-hidden="true"></i>', soul = '<i class="rl-soulic" aria-hidden="true"></i>', star = '<i class="rl-star" aria-hidden="true"></i>', dust = '<i class="rl-dust" aria-hidden="true"></i>';
  function hud() {
    $('#rlStat').innerHTML = `<span class="rl-cur gold">${coin}${fmt(S.gold)}</span><span class="rl-cur soul">${soul}${S.souls}</span>${S.stars || S.rebirths ? `<span class="rl-cur star">${star}${S.stars}</span>` : ''}${feature(S, 'schmiede') ? `<span class="rl-cur dust">${dust}${S.dust}</span>` : ''}${S.asc || S.crowns ? `<span class="rl-cur crown">${crown}${S.crowns}</span>` : ''}
      <span class="note">Rekord ${S.best} von ${capOf(S) === Infinity ? '∞' : capOf(S)} · ${S.asc ? `Aufstieg ${S.asc} · ` : ''}${S.rebirths ? `${S.rebirths}× wiedergeboren · ` : ''}${S.runs} Läufe</span>`;
    $('#soloSpeed').textContent = `Tempo ×${S.speed}`;
  }
  function heroes() {
    const live = run && !run.dead;
    const list = HEROES.filter(h => hired(S, h.tree) || classOpen(S, h.tree));
    const next = HEROES.find(h => !classOpen(S, h.tree));
    $('#rlHeroes').innerHTML = list.map(h => {
      const sh = st[h.id];
      if (!sh) return `<button class="rl-hero locked" data-tab="${h.tree}" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><span class="hn"><b>${h.name}</b><small>Im Baum anheuern</small></span></button>`;
      const eq = S.equip.filter(id => NODE[id].tree === h.tree);
      let body;
      if (live && run.h[h.id]) {
        const hs = run.h[h.id], pct = Math.max(0, hs.hp / sh.hp);
        body = `<span class="hp"><i style="width:${pct * 100}%"></i>${hs.shield > 0 ? `<em style="width:${Math.min(100, hs.shield / sh.hp * 100)}%"></em>` : ''}</span><small>${hs.alive ? `${fmt(Math.max(0, hs.hp))} / ${fmt(sh.hp)}` : 'Gefallen'}</small>
          <span class="cds">${eq.map(id => { const cd = run.cds[id] || 0; return `<span class="cd ${cd > 0 ? '' : 'ok'}">${ACT_NAME(id)}${cd > 0 ? ` ${Math.ceil(cd)}s` : ''}</span>`; }).join('')}</span>`;
      } else body = `<small>${h.id === 'p' ? `Heilung ${fmt(sh.heal)}` : `Schaden ${fmt(sh.atk)}`} · Leben ${fmt(sh.hp)}</small><span class="cds">${eq.map(id => `<span class="cd ok">${ACT_NAME(id)}</span>`).join('') || '<span class="cd">keine Fähigkeit</span>'}</span>`;
      return `<button class="rl-hero ${live && run.h[h.id] && !run.h[h.id].alive ? 'down' : ''}" data-tab="${h.tree}" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><span class="hn"><b>${h.name}</b>${body}</span></button>`;
    }).join('') + (next && !live ? `<div class="rl-hero locked" style="--hc:${next.color}"><span class="pt">?</span><span class="hn"><b>${next.name}</b><small>kommt mit der ${next.rebirth}. Wiedergeburt</small></span></div>` : '');
  }
  function action() {
    const a = $('#rlAction');
    if (inCamp()) a.innerHTML = `<button class="btn ghost" data-rl="weekly">Woche</button>${feature(S, 'turm') ? `<button class="btn ghost" data-rl="tower">Turm${S.towerBest ? ` (Rekord ${S.towerBest})` : ''}</button>` : ''}${areaMax(S) >= 1 ? `<button class="btn ghost rl-area" data-rl="area"><small>Startgebiet</small><b>${esc(zoneName(st.startStage))} ▾</b></button>` : ''}<button class="btn rl-go" data-rl="start">${run ? 'Neuer Lauf' : 'Lauf starten'}${st.startStage > 1 ? ` ab Stufe ${st.startStage}` : ''}</button>`;
    else a.innerHTML = `<button class="btn ${confirm === 'giveup' ? 'danger' : 'ghost'} small" data-rl="giveup">${confirm === 'giveup' ? 'Wirklich aufgeben?' : run.mode === 'tower' ? 'Turm verlassen' : run.mode === 'weekly' ? 'Herausforderung beenden' : 'Lauf aufgeben'}</button>`;
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
      if (maxed) act = '<span class="note">Voll ausgebaut</span>';
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
  function heroTab(tree) {
    const h = HERO[tree], eq = S.equip.filter(id => NODE[id].tree === tree), ok = hired(S, tree);
    const lockedNote = !classOpen(S, tree) ? `<p class="warn">Diese Klasse wird mit der ${h.rebirth}. Wiedergeburt freigeschaltet. Du kannst dir den Baum schon ansehen.</p>` : '';
    return `${lockedNote}<div class="rl-hhead" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><div><h3>${h.name}</h3><p class="note">${h.desc}</p>
      ${ok ? `<p class="note">Aktive Fähigkeiten ${eq.length}/${slotsOf(S, tree)}: ${eq.length ? esc(eq.map(ACT_NAME).join(', ')) : 'noch keine'} · Schlüssel ${keysUsed(S, tree)}/${keyLimit(S)}</p>` : ''}</div></div>
      <div class="rl-treewrap"><div class="rl-treebox">${treeSVG(tree)}</div>${detailHTML(tree)}</div>`;
  }
  function campInfo() {
    if (run && run.dead) {
      const extra = `${run.kills} Gegner besiegt${run.gold ? ` · ${coin}+${fmt(run.gold)}` : ''}${run.souls ? ` · ${soul}+${run.souls}` : ''}${run.runes.length ? ` · ${run.runes.length} Rune${run.runes.length > 1 ? 'n' : ''}` : ''}`;
      if (run.mode === 'weekly') { const r = run.weeklyReward || {}; return `<div class="rl-dead week"><b>Wochen-Herausforderung: Stufe ${run.stage}</b><span>Bestes Ergebnis diese Woche: Stufe ${S.weekly.best}${r.stars ? ` · ${star}+${r.stars}` : ''}${r.crowns ? ` · ${crown}+${r.crowns}` : ''}</span><span class="note">Belohnungen und Bestenliste findest du in der Ruhmeshalle.</span></div>`; }
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
    if (S.rebirths >= 9) return ascSection(true) + starShop();
    let html = `<div class="rl-rebirth"><div><h3>Wiedergeburt ${S.rebirths + 1}</h3>
      <p class="note">Setzt Gold, Seelen, alle Fertigkeiten und deinen Rekord auf null. Dafür bekommst du Sterne für dauerhafte Verbesserungen, neue Stufen und neue Inhalte. Runen und Sterne bleiben.</p>
      <p>Voraussetzung: <b>Stufe ${req}</b> · dein Rekord: <b>${S.best}</b> → ${gain ? `<b class="rl-cur star">${star}${gain} Sterne</b>` : 'noch nicht erreicht'}</p></div>
      <button class="btn ${confirm === 'rebirth' ? 'danger' : ''}" data-rl="rebirth" ${gain && inCamp() ? '' : 'disabled'}>${confirm === 'rebirth' ? 'Wirklich zurücksetzen?' : 'Wiedergeboren werden'}</button></div>`;
    html += `<div class="rl-road">${ROADMAP.map(x => `<div class="rl-step ${S.rebirths >= x.r ? 'done' : S.rebirths + 1 === x.r ? 'next' : ''}"><span>${x.r}</span><div><b>${x.text}</b><small>Stufen bis ${CAPS[Math.min(x.r, CAPS.length - 1)]} · ${x.r + 1} Schlüssel pro Klasse</small></div></div>`).join('')}</div>`;
    html += ascSection();
    html += `<h3 class="rl-h3">Sternen-Laden</h3><p class="note">Du hast <span class="rl-cur star">${star}${S.stars}</span> Sterne. Sterne bekommst du bei jeder Wiedergeburt und aus der Wochen-Herausforderung.</p><div class="rl-perks">`;
    html += perkCards();
    return html;
  }
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
        <form class="rl-form" id="rlCreate"><input id="rlCName" placeholder="Name, z. B. Sir Christof" maxlength="20" autocomplete="username">
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
    const tb = e.target.closest('.rl-hero[data-tab]');
    if (tb) { tab = tb.dataset.tab; renderTabs(); panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
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
    if (b.dataset.pathmode) { pathMode = b.dataset.pathmode; panel(); return; }
    if (b.dataset.perk) { if (buyPerk(S, PERKS.find(p => p.id === b.dataset.perk))) afterChange(); return; }
    const a = b.dataset.rl;
    if (a === 'start') startRun();
    else if (a === 'weekly') startRun('weekly');
    else if (a === 'gosave') { tab = 'stand'; renderTabs(); panel(); }
    else if (a === 'ascend') { if (ask('ascend', panel)) { const team = HEROES.filter(h => st[h.id]).map(h => h.id); ascend(S); run = null; achCheck(); afterChange(); playCine('asc', team); } }
    else if (a === 'tower') startRun('tower');
    else if (a === 'area') showAreas();
    else if (a === 'giveup') { if (ask('giveup', action)) { run.dead = true; S.runs++; save(); cloudSave(true); refresh(); } }
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
      s.speed = S.speed; adopt(s); save(); toast('Spielstand geladen');
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
    if (S.asc || S.crowns) html += `<h3 class="rl-h3">Kronen-Laden</h3><p class="note">Du hast <span class="rl-cur crown">${crown}${S.crowns}</span> Kronen. Kronen-Boni bleiben für immer.</p><div class="rl-perks">${CPERKS.map(p => {
      const r = cperk(S, p.id), maxed = r >= p.max, c = cperkCost(S, p);
      return `<div class="rl-perk crown ${r ? 'has' : ''}"><b>${esc(p.name)}</b><span class="note">${p.max > 99 ? `Stufe ${r}` : `${r} / ${p.max}`}</span><p class="note">${esc(p.desc)}</p>
        <button class="btn small gold" data-cperk="${p.id}" ${maxed || S.crowns < c ? 'disabled' : ''}>${maxed ? 'Voll' : `${c} ${c === 1 ? 'Krone' : 'Kronen'}`}</button></div>`;
    }).join('')}</div>`;
    return html;
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
      zones += `<div class="zone ${s0 > 150 ? 'nm' : ''}" style="left:${L + z * 10 * PX}px;width:${10 * PX}px;--a1:${bm.sky[0]};--a2:${bm.hill[0]}" title="${esc(zoneName(s0))}"><span>${esc(zoneName(s0))}</span><i class="boss" title="Boss: ${esc(bm.boss)}"></i></div>`;
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
        <span class="sw"></span><span class="tx"><b>${esc(zoneName(s0))}${z === cur ? ' · gewählt' : ''}</b><small>Stufe ${s0}–${s0 + 9} · Boss: ${esc(bm.boss)}${z ? ` · Fernkämpfer: ${esc(bm.ranged)}` : ' · keine Fernkämpfer'}</small>
        ${lock ? `<small class="lk">Gesperrt – besiege zuerst den ${esc(biomeOf(s0 - 1).boss)} auf Stufe ${s0 - 1}</small>` : ''}</span></button>`;
    }
    modal(`<h2>Startgebiet wählen</h2>
      <p class="note">Ein Gebiet wird frei, sobald du den Boss davor besiegt hast. Bis zur nächsten Wiedergeburt bleibt es frei. Für übersprungene Bosse bekommst du beim Start ein Drittel ihrer Seelen. Ein früherer Start lohnt sich also, wenn dir Seelen fehlen.</p>
      <div class="rl-areas">${rows}</div><div class="row" style="justify-content:center"><button class="btn ghost" data-m="ok">Schließen</button></div>`);
    const on = $('#picker .rl-areab.on'); if (on) on.scrollIntoView({ block: 'center' });
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
      items.push(`Du kannst jetzt ${keyLimit(S)} Schlüssel-Fertigkeiten pro Klasse lernen`);
      items.push(`+${n.stars} Sterne für den Sternen-Laden`);
      const nextR = ROADMAP.find(x => x.r === n.n + 1);
      if (nextR) items.push(`Nächste Wiedergeburt ab Stufe ${reqOf(S)}: ${nextR.text}`);
      if (n.n >= 9) items.push('Der Aufstieg ist jetzt möglich, sobald du Stufe 150 erreichst');
    } else {
      items.push(`+${n.crowns} Kronen für den Kronen-Laden`);
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
  function knight(x, h, t, walk) {
    const step = walk ? Math.sin(t * 12) : 0, bob = walk ? Math.abs(Math.sin(t * 12)) * 2 : 0;
    shadow(x, 16);
    ctx.save(); ctx.translate(x, GROUND - bob);
    if (h && !h.alive) { ctx.rotate(-1.4); ctx.translate(-12, 8); }
    ctx.fillStyle = '#3d3a48'; rr(-9 + step * 3, -22, 7, 22, 2); ctx.fill(); rr(2 - step * 3, -22, 7, 22, 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-20, -48); ctx.lineTo(-6, -48); ctx.lineTo(-6, -30); ctx.lineTo(-13, -21); ctx.lineTo(-20, -30); ctx.closePath(); fillO('#2f5aa8');
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-14, -45, 2, 18); ctx.fillRect(-18, -38, 10, 2);
    rr(-10, -51, 20, 31, 4); fillO('#c9cdd6');
    ctx.fillStyle = '#b8323a'; rr(-7, -47, 14, 25, 3); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1, -45, 2, 19);
    ctx.beginPath(); ctx.arc(0, -61, 11, 0, 7); fillO('#dfe3ea');
    ctx.fillStyle = '#1b1726'; ctx.fillRect(1, -63, 10, 3);
    ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(-2, -71); ctx.quadraticCurveTo(-18, -83 + Math.sin(t * 6) * 2, -21, -63); ctx.quadraticCurveTo(-10, -71, -2, -67); ctx.fill();
    if (S.asc > 0 && !(cine && cine.kind === 'asc')) crownIcon(1, -77, 0.62, 0);
    const sw = h ? h.swing : 0, ang = sw > 0 ? (1 - sw) * 2.2 - 1.45 : -0.9;
    ctx.save(); ctx.translate(8, -41); ctx.rotate(run && run.fx && run.fx.wirbel > 0 ? t * 30 : ang);
    ctx.fillStyle = '#7a5b3a'; ctx.fillRect(-2, -3, 8, 6); ctx.fillStyle = '#ffd23f'; ctx.fillRect(5, -7, 3, 14);
    ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(40, -2); ctx.lineTo(46, 0); ctx.lineTo(40, 2); ctx.lineTo(8, 3); fillO('#eef2f7');
    if (sw > 0.3) { ctx.strokeStyle = `rgba(255,255,255,${sw * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 44, -0.6, 0.6); ctx.stroke(); }
    ctx.restore();
    if (h && h.hurtT > 0) { ctx.fillStyle = 'rgba(255,60,60,.35)'; ctx.fillRect(-16, -75, 32, 75); }
    ctx.restore();
  }
  function guard(x, h, t, walk) {
    const step = walk ? Math.sin(t * 10) : 0, bob = walk ? Math.abs(Math.sin(t * 10)) * 2 : 0;
    shadow(x, 20);
    ctx.save(); ctx.translate(x, GROUND - bob);
    if (h && !h.alive) { ctx.rotate(-1.4); ctx.translate(-14, 10); }
    ctx.fillStyle = '#2e3446'; rr(-11 + step * 2, -24, 9, 24, 2); ctx.fill(); rr(3 - step * 2, -24, 9, 24, 2); ctx.fill();
    rr(-14, -58, 28, 36, 6); fillO('#8e9bb3');
    ctx.fillStyle = '#2f4a7a'; rr(-10, -54, 20, 28, 4); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -68, 12, 0, 7); fillO('#a9b6cc');
    ctx.fillStyle = '#1b1726'; ctx.fillRect(-2, -70, 13, 3); ctx.fillRect(4, -76, 2, 12);
    // Streitkolben
    const sw = h ? h.swing : 0;
    ctx.save(); ctx.translate(-8, -46); ctx.rotate(sw > 0 ? -1.8 + (1 - sw) * 1.6 : -1.2);
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(0, -2, 26, 4); ctx.beginPath(); ctx.arc(28, 0, 7, 0, 7); fillO('#b7bcc6');
    ctx.restore();
    // Turmschild vorne
    const glow = run && run.hautT > 0;
    rr(8, -62, 16, 50, 5); fillO(glow ? '#cfe3ff' : '#3b6bc4');
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(14, -54, 4, 34); ctx.fillRect(10, -40, 12, 4);
    if (glow) { ctx.strokeStyle = 'rgba(127,178,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(4, -38, 40 + Math.sin(t * 8) * 2, 0, 7); ctx.stroke(); }
    if (h && h.hurtT > 0) { ctx.fillStyle = 'rgba(255,60,60,.3)'; ctx.fillRect(-16, -82, 42, 82); }
    ctx.restore();
  }
  function archer(x, h, t, walk) {
    const step = walk ? Math.sin(t * 12) : 0, bob = walk ? Math.abs(Math.sin(t * 12)) * 2 : 0;
    shadow(x, 13);
    ctx.save(); ctx.translate(x, GROUND - bob);
    if (h && !h.alive) { ctx.rotate(-1.4); ctx.translate(-10, 6); }
    ctx.fillStyle = '#3b3326'; rr(-7 + step * 3, -20, 6, 20, 2); ctx.fill(); rr(1 - step * 3, -20, 6, 20, 2); ctx.fill();
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(-14, -46, 5, 20); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-14, -50, 1, 6); ctx.fillRect(-11, -51, 1, 6);
    rr(-8, -46, 16, 27, 4); fillO('#3f8a4a');
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(-8, -30, 16, 3);
    ctx.beginPath(); ctx.arc(0, -55, 9, 0, 7); fillO('#f1c9a5');
    ctx.fillStyle = '#2f6b3a'; ctx.beginPath(); ctx.moveTo(-11, -52); ctx.quadraticCurveTo(-2, -72, 10, -56); ctx.lineTo(4, -60); ctx.quadraticCurveTo(-2, -64, -8, -50); ctx.fill();
    ctx.fillStyle = '#1b1726'; ctx.fillRect(3, -57, 2, 2);
    // Bogen
    const sw = h ? h.swing : 0;
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(10, -40, 15, -1.25, 1.25); ctx.stroke();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10 + 15 * Math.cos(-1.25), -40 + 15 * Math.sin(-1.25)); ctx.lineTo(12 - sw * 8, -40); ctx.lineTo(10 + 15 * Math.cos(1.25), -40 + 15 * Math.sin(1.25)); ctx.stroke();
    if (h && h.hurtT > 0) { ctx.fillStyle = 'rgba(255,60,60,.35)'; ctx.fillRect(-14, -66, 30, 66); }
    ctx.restore();
  }
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
  function enemy(e, t) {
    const s = e.boss ? 1.8 : e.elite ? 1.15 : 1, bob = Math.sin(t * 6 + e.bob) * 2;
    shadow(e.x, 16 * s);
    ctx.save(); ctx.translate(e.x, GROUND); ctx.scale(s, s);
    if (e.elite) { const gl = ctx.createRadialGradient(0, -20, 4, 0, -20, 34); gl.addColorStop(0, 'rgba(201,166,255,.45)'); gl.addColorStop(1, 'rgba(201,166,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-34, -54, 68, 60); }
    const flash = e.hitT > 0, col = c => (flash ? '#ffffff' : c);
    if (e.type === 'schleim') {
      ctx.beginPath(); ctx.ellipse(0, -12 + bob / 2, 17, 13 - bob / 2, 0, Math.PI, 0); ctx.lineTo(17, 0); ctx.lineTo(-17, 0); ctx.closePath(); fillO(col(e.ranged ? '#9b6ad6' : '#58c46a'));
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-6, -18, 4, 3, -0.5, 0, 7); ctx.fill();
      eyes(-6, -14, '#fff');
    } else if (e.type === 'goblin') {
      ctx.fillStyle = col('#4a6e2e'); ctx.fillRect(-7, -8, 5, 8); ctx.fillRect(2, -8, 5, 8);
      rr(-8, -27, 16, 20, 4); fillO(col('#5e8c3a'));
      ctx.beginPath(); ctx.arc(0, -33 + bob / 2, 9, 0, 7); fillO(col('#6fa046'));
      ctx.beginPath(); ctx.moveTo(-8, -35); ctx.lineTo(-17, -41); ctx.lineTo(-7, -30); fillO(col('#6fa046'));
      if (!e.ranged) { ctx.fillStyle = col('#8a6a3a'); ctx.fillRect(-15, -26, 3, 24); }
      eyes(-6, -35, '#ffd23f');
    } else if (e.type === 'skelett') {
      ctx.fillStyle = col('#e8e2d0'); ctx.fillRect(-2, -28, 4, 20); for (let i = 0; i < 3; i++) ctx.fillRect(-7, -26 + i * 5, 14, 2);
      ctx.fillRect(-6, -8, 3, 8); ctx.fillRect(3, -8, 3, 8);
      ctx.beginPath(); ctx.arc(0, -35 + bob / 2, 8, 0, 7); fillO(col('#efe9d8'));
      ctx.fillStyle = '#1b1726'; ctx.fillRect(-5, -37, 3, 3); ctx.fillRect(-1, -37, 3, 3);
      ctx.fillStyle = 'rgba(160,140,255,.8)'; ctx.fillRect(-5, -37, 2, 2);
      if (!e.ranged) { ctx.fillStyle = col('#9aa3ad'); ctx.fillRect(-16, -32, 2, 26); }
    } else if (e.type === 'daemon') {
      ctx.fillStyle = 'rgba(255,160,60,.35)'; ctx.beginPath(); ctx.arc(0, -22, 18 + Math.sin(t * 8) * 2, 0, 7); ctx.fill();
      ctx.fillStyle = col('#8f2620'); ctx.fillRect(-8, -8, 6, 8); ctx.fillRect(2, -8, 6, 8);
      rr(-10, -31, 20, 24, 5); fillO(col('#c4382f'));
      ctx.beginPath(); ctx.arc(0, -37 + bob / 2, 10, 0, 7); fillO(col('#d4473c'));
      ctx.fillStyle = col('#2a1a1a'); ctx.beginPath(); ctx.moveTo(-8, -43); ctx.lineTo(-12, -55); ctx.lineTo(-3, -45); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, -43); ctx.lineTo(12, -55); ctx.lineTo(3, -45); ctx.fill();
      eyes(-7, -39, '#ffd23f');
    } else {
      ctx.fillStyle = col('#8fb0c8'); ctx.fillRect(-11, -8, 8, 8); ctx.fillRect(3, -8, 8, 8);
      rr(-13, -33, 26, 26, 4); fillO(col('#a9c8df'));
      rr(-9, -47 + bob / 2, 18, 15, 3); fillO(col('#cfe3f2'));
      rr(-21, -31, 8, 20, 3); fillO(col('#cfe3f2'));
      eyes(-6, -42, '#4fc3ff');
    }
    if (e.ranged) rangedGear(e, t, col);
    if (e.boss) { ctx.beginPath(); ctx.moveTo(-8, -52); ctx.lineTo(-8, -60); ctx.lineTo(-4, -55); ctx.lineTo(0, -62); ctx.lineTo(4, -55); ctx.lineTo(8, -60); ctx.lineTo(8, -52); ctx.closePath(); fillO('#ffd23f'); }
    if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, -56 + Math.sin(a) * 3, 2.2, 0, 7); ctx.fill(); }
    if (e.poisonT > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(155,227,107,.8)'; ctx.beginPath(); ctx.arc(-6 + i * 6, -10 - ((t * 30 + i * 9) % 22), 2.5, 0, 7); ctx.fill(); }
    ctx.restore();
    const bw = e.boss ? 64 : 30, by = GROUND - (e.boss ? 118 : e.elite ? 62 : 56);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(e.x - bw / 2, by, bw, 5, 2); ctx.fill();
    ctx.fillStyle = e.boss ? '#c9a6ff' : e.elite ? '#d7b5ff' : '#e5484d'; rr(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 5, 2); ctx.fill();
  }


  // Neue Klassen
  function mage(x, h, t, walk) {
    const bob = walk ? Math.abs(Math.sin(t * 12)) * 2 : Math.sin(t * 2) * 1;
    shadow(x, 13);
    ctx.save(); ctx.translate(x, GROUND - bob);
    if (h && !h.alive) { ctx.rotate(-1.4); ctx.translate(-10, 6); }
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-7, -44); ctx.lineTo(7, -44); ctx.lineTo(11, 0); ctx.closePath(); fillO('#5b3a9a');
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-11, -3, 22, 3); ctx.fillRect(-1, -42, 2, 38);
    ctx.beginPath(); ctx.arc(0, -51, 8, 0, 7); fillO('#f1c9a5');
    ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.moveTo(-6, -48); ctx.quadraticCurveTo(0, -30, 6, -48); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-13, -55); ctx.lineTo(13, -55); ctx.lineTo(3, -82); ctx.lineTo(-2, -76); ctx.closePath(); fillO('#4a2f80');
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(1, -66, 2, 0, 7); ctx.fill();
    const sw = h ? h.swing : 0;
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(14 + sw * 4, -58); ctx.stroke();
    const glow = 0.6 + 0.4 * Math.sin(t * 6) + sw;
    ctx.fillStyle = `rgba(200,140,255,${Math.min(1, glow)})`; ctx.beginPath(); ctx.arc(14 + sw * 4, -62, 5 + sw * 3, 0, 7); ctx.fill();
    if (h && h.hurtT > 0) { ctx.fillStyle = 'rgba(255,60,60,.35)'; ctx.fillRect(-14, -84, 30, 84); }
    ctx.restore();
  }
  function priest(x, h, t, walk) {
    const bob = walk ? Math.abs(Math.sin(t * 12)) * 2 : 0;
    shadow(x, 13);
    ctx.save(); ctx.translate(x, GROUND - bob);
    if (h && !h.alive) { ctx.rotate(-1.4); ctx.translate(-10, 6); }
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-8, -42); ctx.lineTo(8, -42); ctx.lineTo(11, 0); ctx.closePath(); fillO('#f4ede1');
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2, -40, 4, 38); ctx.fillRect(-6, -30, 12, 3);
    ctx.beginPath(); ctx.arc(0, -50, 8, 0, 7); fillO('#f1c9a5');
    ctx.fillStyle = '#e0b04a'; ctx.beginPath(); ctx.arc(0, -53, 9, Math.PI, 0); ctx.fill(); ctx.fillRect(-9, -53, 4, 14); ctx.fillRect(5, -53, 4, 14);
    ctx.strokeStyle = `rgba(255,228,138,${0.6 + 0.3 * Math.sin(t * 3)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -64, 9, 3, 0, 0, 7); ctx.stroke();
    const sw = h ? h.swing : 0;
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(12, -56); ctx.stroke();
    ctx.fillStyle = '#ffe48a'; ctx.beginPath(); ctx.arc(12, -60, 4 + sw * 4, 0, 7); ctx.fill();
    if (sw > 0.2) { ctx.fillStyle = `rgba(255,240,170,${sw * 0.4})`; ctx.beginPath(); ctx.arc(12, -60, 16, 0, 7); ctx.fill(); }
    if (h && h.hurtT > 0) { ctx.fillStyle = 'rgba(255,60,60,.35)'; ctx.fillRect(-14, -70, 30, 70); }
    ctx.restore();
  }
  function tamer(x, h, t, walk) {
    const step = walk ? Math.sin(t * 11) : 0, bob = walk ? Math.abs(Math.sin(t * 11)) * 2 : 0;
    shadow(x, 15);
    ctx.save(); ctx.translate(x, GROUND - bob);
    if (h && !h.alive) { ctx.rotate(-1.4); ctx.translate(-12, 8); }
    ctx.fillStyle = '#4a3624'; rr(-9 + step * 3, -22, 7, 22, 2); ctx.fill(); rr(2 - step * 3, -22, 7, 22, 2); ctx.fill();
    rr(-11, -52, 22, 32, 5); fillO('#8a5a33');
    ctx.fillStyle = '#5e7d3a'; ctx.fillRect(-11, -36, 22, 4);
    ctx.fillStyle = '#c9c2b4'; rr(-13, -54, 26, 8, 4); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -61, 9, 0, 7); fillO('#e3b48e');
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(0, -64, 9, Math.PI, 0); ctx.fill(); ctx.fillRect(-9, -64, 18, 3);
    ctx.fillStyle = '#1b1726'; ctx.fillRect(3, -62, 2, 2);
    const sw = h ? h.swing : 0;
    ctx.save(); ctx.translate(8, -40); ctx.rotate(sw > 0 ? (1 - sw) * 2 - 1.3 : -0.9);
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(0, -2, 28, 4);
    ctx.beginPath(); ctx.moveTo(24, -2); ctx.quadraticCurveTo(36, -12, 34, 4); ctx.lineTo(24, 4); fillO('#c9cdd6');
    ctx.restore();
    if (h && h.hurtT > 0) { ctx.fillStyle = 'rgba(255,60,60,.3)'; ctx.fillRect(-14, -72, 30, 72); }
    ctx.restore();
  }
  function wolf(x, t, walk, alpha = 1) {
    const bob = walk ? Math.abs(Math.sin(t * 14 + x)) * 3 : Math.sin(t * 3 + x) * 0.8;
    ctx.globalAlpha = alpha;
    shadow(x, 14);
    ctx.save(); ctx.translate(x, GROUND - bob);
    ctx.fillStyle = '#5e6470'; const l = walk ? Math.sin(t * 14 + x) * 3 : 0;
    ctx.fillRect(-10 + l, -10, 4, 10); ctx.fillRect(-4 - l, -10, 4, 10); ctx.fillRect(6 + l, -10, 4, 10); ctx.fillRect(10 - l, -10, 4, 10);
    rr(-12, -22, 28, 14, 7); fillO('#8a909c');
    ctx.beginPath(); ctx.moveTo(-12, -18); ctx.quadraticCurveTo(-24, -26 + Math.sin(t * 8) * 3, -22, -14); fillO('#8a909c');
    ctx.beginPath(); ctx.moveTo(12, -24); ctx.lineTo(26, -20); ctx.lineTo(24, -14); ctx.lineTo(12, -12); ctx.closePath(); fillO('#9aa0ac');
    ctx.beginPath(); ctx.moveTo(14, -24); ctx.lineTo(16, -32); ctx.lineTo(19, -24); fillO('#9aa0ac');
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(19, -22, 2, 2);
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
  const DRAW = { r: knight, w: guard, s: archer, m: mage, p: priest, t: tamer };
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
      [...R.order].reverse().forEach(k => DRAW[k](R.pos[k], R.h[k], t, walking));
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
        if (a.kind === 'licht') { ctx.strokeStyle = 'rgba(255,240,170,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 6, y); ctx.stroke(); continue; }
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(a.ty - a.y - Math.cos(p * Math.PI) * arc * Math.PI, a.tx - a.x));
        ctx.fillStyle = a.kind === 'gift' ? '#9be36b' : '#e8e2d0'; ctx.fillRect(-9, -1, 14, 2); ctx.fillStyle = '#b7bcc6'; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, 0); ctx.lineTo(5, 3); ctx.fill();
        ctx.restore();
      }
      // Geschosse der Gegner
      for (const s of R.eshots) {
        const p = Math.min(1, s.t / s.d), arc = s.kind === 'goblin' || s.kind === 'schleim' ? 42 : s.kind === 'skelett' ? 16 : 8;
        const x = s.x + (s.tx - s.x) * p, y = s.y + (s.ty - s.y) * p - Math.sin(p * Math.PI) * arc;
        if (s.kind === 'daemon') { ctx.fillStyle = 'rgba(255,120,40,.4)'; ctx.beginPath(); ctx.arc(x + 6, y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); }
        else if (s.kind === 'golem') { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 12); ctx.fillStyle = '#c9eeff'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(3, 0); ctx.lineTo(0, 6); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
        else if (s.kind === 'skelett') { const a = Math.atan2(-(s.ty - s.y) + Math.cos(p * Math.PI) * arc * Math.PI, -(s.tx - s.x)); ctx.save(); ctx.translate(x, y); ctx.rotate(-a + Math.PI); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-9, -1, 14, 2); ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, 0); ctx.lineTo(5, 3); ctx.fill(); ctx.restore(); }
        else if (s.kind === 'goblin') { ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
        else { ctx.fillStyle = 'rgba(170,120,240,.9)'; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.5, 0, 0, 7); ctx.fill(); }
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
      ctx.fillText(bossNow ? `Boss: ${bm.boss}` : tower ? `Rekord ${S.towerBest}` : `${zoneName(R.stage)} · Grenze ${st.cap === Infinity ? '∞' : st.cap}`, tower ? 170 : 106, 21);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffcf4a'; if (R.mode === 'normal') ctx.fillText(`+${fmt(R.gold)} Gold`, W - 12, 21);
      if (R.mode === 'weekly') { ctx.fillStyle = '#ffd23f'; ctx.fillText('Wochen-Herausforderung', W - 12, 21); }
      if (R.bannerT > 0) {
        const a = Math.max(0, Math.min(1, R.bannerT * 2, (2.2 - R.bannerT) * 4)), y = 92;
        ctx.globalAlpha = a; ctx.fillStyle = 'rgba(30,10,40,.75)'; ctx.fillRect(0, y - 26, W, 44);
        ctx.fillStyle = '#c9a6ff'; ctx.fillRect(0, y - 26, W, 2); ctx.fillRect(0, y + 16, W, 2);
        ctx.textAlign = 'center'; ctx.font = '22px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(`BOSS · ${bm.boss}`, W / 2 + (1 - a) * 40, y + 4);
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
      const camp = HEROES.filter(h => st[h.id]).map(h => h.id);
      const spots = { r: 205, w: 300, s: 175, m: 145, p: 115, t: 330 };
      camp.forEach(k => DRAW[k](spots[k], null, t, false));
      if (camp.includes('t')) wolf(362, t, false);
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
    const order = ['r', 'w', 's', 'm', 'p', 't'].filter(k => ids.includes(k));
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
      const newTeam = HEROES.filter(h => st[h.id]).map(h => h.id);
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
      const team = HEROES.filter(h => st[h.id]).map(h => h.id), xs = lineup(team.includes('r') ? team : ['r', ...team], 'r');
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
