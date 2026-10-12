'use strict';
// Ritterlauf – Solo-Incremental mit Heldengruppe, Fertigkeitenbäumen und Wiedergeburt.
// Läuft im Browser; Spielstand lokal, per Konto (Name + Passwort) oder Notfall-Code.
//
// REGEL FÜR SPÄTERE UPDATES: Neue Fertigkeiten nur HINTEN an NODES bzw. PERKS anhängen und vorhandene IDs nie
// ändern oder umsortieren. Dann bleiben alle Spielstände und Notfall-Codes gültig. Größere Umbauten bekommen
// eine neue SAVE_VERSION und einen Schritt in migrate().
(function () {
  const SAVE_VERSION = 3;

  /* ================= Helden ================= */
  const HEROES = [
    { id: 'r', tree: 'ritter', name: 'Ritter', color: '#ffb547', slots: 2, desc: 'Kämpft vorne mit dem Schwert. Fällt der Ritter, ist der Lauf vorbei.' },
    { id: 'w', tree: 'waechter', name: 'Wächter', color: '#7fb2ff', slots: 1, hire: 'w_hire', desc: 'Steht ganz vorne und fängt die Treffer ab. Viel Leben, wenig Schaden.' },
    { id: 's', tree: 'schuetze', name: 'Schützin', color: '#7ee08a', slots: 1, hire: 's_hire', desc: 'Schießt aus der hinteren Reihe. Viel Schaden, wenig Leben.' },
  ];
  const HERO = Object.fromEntries(HEROES.map(h => [h.tree, h]));

  /* ================= Fertigkeitenbäume ================= */
  const G = (base, grow) => r => ({ g: Math.ceil(base * Math.pow(grow, r)), s: 0 });
  const SL = list => r => ({ g: 0, s: list[Math.min(r, list.length - 1)] });
  const NODES = [
    // --- Ritter (Reihenfolge nie ändern) ---
    { id: 'start', name: 'Knappe', icon: '⚔', x: 3, y: 6, kind: 'start', max: 1, desc: 'Hier beginnt dein Weg. Von hier aus schaltest du benachbarte Fertigkeiten frei.' },
    { id: 'atk1', name: 'Klingenschliff', icon: 'S', x: 1, y: 5, p: ['start'], max: 30, cost: G(8, 1.7), desc: '+10 % Schaden des Ritters je Stufe (wächst aufeinander auf)' },
    { id: 'hp1', name: 'Zähigkeit', icon: 'L', x: 3, y: 5, p: ['start'], max: 30, cost: G(8, 1.7), desc: '+10 % Leben des Ritters je Stufe (wächst aufeinander auf)' },
    { id: 'gold1', name: 'Plünderer', icon: 'G', x: 5, y: 5, p: ['start'], max: 10, cost: G(12, 1.9), desc: '+6 % Gold je Stufe' },
    { id: 'spd', name: 'Schnelle Hand', icon: 'T', x: 0, y: 4, p: ['atk1'], max: 8, cost: G(30, 1.9), desc: '+4 % Angriffstempo des Ritters je Stufe' },
    { id: 'krit', name: 'Scharfes Auge', icon: 'K', x: 2, y: 4, p: ['atk1'], max: 8, cost: G(25, 1.9), desc: '+3 % Chance auf kritische Treffer (×1,5) je Stufe' },
    { id: 'armor', name: 'Plattenrüstung', icon: 'R', x: 3, y: 4, p: ['hp1'], max: 8, cost: G(30, 1.9), desc: '−4 % erlittener Schaden des Ritters je Stufe' },
    { id: 'regen', name: 'Zweiter Atem', icon: '+', x: 4, y: 4, p: ['hp1'], max: 5, cost: G(40, 2), desc: 'Der Ritter heilt 0,3 % seines Lebens pro Sekunde je Stufe' },
    { id: 'truhe', name: 'Schatzjäger', icon: '$', x: 5, y: 4, p: ['gold1'], max: 5, cost: G(50, 2), desc: '+3 % Chance je Stufe, dass ein Gegner eine Truhe mit 10-fachem Gold fallen lässt' },
    { id: 'seelenf', name: 'Seelenfänger', icon: '◆', x: 6, y: 4, p: ['gold1'], max: 3, cost: SL([3, 5, 8]), desc: 'Elite-Gegner lassen mit 15 % Chance je Stufe eine Seele fallen' },
    { id: 'wirbel', name: 'Wirbelwind', icon: '↻', x: 1, y: 3, p: ['spd', 'krit'], max: 3, cost: SL([2, 4, 7]), active: true,
      desc: 'Aktiv: trifft alle nahen Gegner mit 250 % Schaden (+75 % je Stufe). Abklingzeit 12 s (−1 s je Stufe).' },
    { id: 'heil', name: 'Heilgebet', icon: '✚', x: 3, y: 3, p: ['armor', 'regen'], max: 3, cost: SL([2, 4, 7]), active: true,
      desc: 'Aktiv: heilt alle Helden um 25 % ihres Lebens (+5 % je Stufe), wenn einer unter 55 % fällt. Abklingzeit 22 s.' },
    { id: 'blitz', name: 'Blitzschlag', icon: 'ϟ', x: 5, y: 3, p: ['truhe', 'seelenf'], max: 3, cost: SL([2, 4, 7]), active: true,
      desc: 'Aktiv: trifft den stärksten Gegner mit 400 % Schaden (+150 % je Stufe). Abklingzeit 14 s.' },
    { id: 'doppel', name: 'Doppelschlag', icon: '»', x: 0, y: 2, p: ['wirbel'], max: 3, cost: SL([3, 5, 8]), desc: '+8 % Chance je Stufe, dass der Ritter zweimal zuschlägt' },
    { id: 'kritd', name: 'Vernichtung', icon: '!', x: 2, y: 2, p: ['wirbel'], max: 8, cost: G(150, 1.9), desc: '+15 % kritischer Schaden je Stufe' },
    { id: 'dorn', name: 'Dornenpanzer', icon: '✱', x: 3, y: 2, p: ['heil'], max: 3, cost: SL([3, 5, 8]), desc: 'Wirft 20 % je Stufe des erlittenen Schadens zurück' },
    { id: 'schild', name: 'Schildstoß', icon: '◘', x: 4, y: 2, p: ['heil'], max: 3, cost: SL([2, 4, 7]), active: true,
      desc: 'Aktiv: 150 % Schaden und betäubt den vordersten Gegner 1,5 s (+0,5 s je Stufe). Abklingzeit 9 s.' },
    { id: 'habgier', name: 'Habgier', icon: '¤', x: 5, y: 2, p: ['blitz'], max: 3, cost: SL([3, 5, 8]), desc: '+15 % Gold je Stufe' },
    { id: 'schrei', name: 'Kriegsschrei', icon: '▲', x: 6, y: 2, p: ['blitz'], max: 3, cost: SL([2, 4, 7]), active: true,
      desc: 'Aktiv: alle Helden machen 6 s lang +40 % Schaden (+15 % je Stufe). Abklingzeit 20 s.' },
    { id: 'berserk', name: 'Berserker', icon: 'B', x: 1, y: 1, p: ['doppel', 'kritd'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', desc: 'Schlüssel: Ritter +40 % Schaden, aber −20 % Leben' },
    { id: 'phoenix', name: 'Zweites Leben', icon: 'Φ', x: 3, y: 1, p: ['dorn', 'schild'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', desc: 'Schlüssel: Einmal pro Lauf steht der Ritter mit halbem Leben wieder auf' },
    { id: 'ernte', name: 'Seelenernte', icon: '☽', x: 5, y: 1, p: ['habgier', 'schrei'], max: 1, cost: () => ({ g: 3000, s: 10 }), kind: 'key', desc: 'Schlüssel: Bosse geben doppelt so viele Seelen' },
    { id: 'schmiede', name: 'Schmiedekunst', icon: '∞', x: 2, y: 0, p: ['berserk', 'phoenix'], max: 9999, cost: G(2500, 1.35), kind: 'inf', desc: '+3 % Schaden und Leben aller Helden je Stufe, ohne Obergrenze' },
    { id: 'ahnen', name: 'Ahnenkraft', icon: '∞', x: 4, y: 0, p: ['phoenix', 'ernte'], max: 9999, cost: r => ({ g: 0, s: 6 + 2 * r }), kind: 'inf', desc: '+5 % Schaden und Leben aller Helden je Stufe, ohne Obergrenze' },
    // --- Wächter (ab Version 3) ---
    { id: 'w_hire', tree: 'waechter', name: 'Wächter anheuern', icon: '⛨', x: 3, y: 4, kind: 'start', max: 1, cost: () => ({ g: 400, s: 3 }), reqBest: 10,
      desc: 'Der Wächter schließt sich deiner Gruppe an. Er steht ganz vorne und fängt die Treffer ab.' },
    { id: 'w_hp', tree: 'waechter', name: 'Bollwerk', icon: 'L', x: 1, y: 3, p: ['w_hire'], max: 30, cost: G(30, 1.7), desc: '+10 % Leben des Wächters je Stufe (wächst aufeinander auf)' },
    { id: 'w_armor', tree: 'waechter', name: 'Turmschild', icon: 'R', x: 3, y: 3, p: ['w_hire'], max: 8, cost: G(60, 1.9), desc: '−4 % erlittener Schaden des Wächters je Stufe' },
    { id: 'w_atk', tree: 'waechter', name: 'Streitkolben', icon: 'S', x: 5, y: 3, p: ['w_hire'], max: 30, cost: G(30, 1.7), desc: '+10 % Schaden des Wächters je Stufe (wächst aufeinander auf)' },
    { id: 'w_haut', tree: 'waechter', name: 'Eiserne Haut', icon: '◈', x: 1, y: 2, p: ['w_hp', 'w_armor'], max: 3, cost: SL([3, 5, 8]), active: true,
      desc: 'Aktiv: der Wächter nimmt 5 s lang (+1 s je Stufe) 60 % weniger Schaden, wenn er unter 70 % fällt. Abklingzeit 16 s.' },
    { id: 'w_aura', tree: 'waechter', name: 'Schutzaura', icon: '◎', x: 3, y: 2, p: ['w_armor'], max: 5, cost: SL([3, 4, 6, 8, 10]), desc: 'Alle Helden nehmen 3 % weniger Schaden je Stufe' },
    { id: 'w_wall', tree: 'waechter', name: 'Schildwall', icon: '▬', x: 5, y: 2, p: ['w_armor', 'w_atk'], max: 3, cost: SL([3, 5, 8]), active: true,
      desc: 'Aktiv: 150 % Schaden (+50 % je Stufe) an allen nahen Gegnern und betäubt sie 1 s. Abklingzeit 12 s.' },
    { id: 'w_parade', tree: 'waechter', name: 'Parade', icon: '⟋', x: 2, y: 1, p: ['w_haut', 'w_aura'], max: 5, cost: G(200, 1.9), desc: '+6 % Chance je Stufe, dass der Wächter einen Treffer abwehrt' },
    { id: 'w_regen', tree: 'waechter', name: 'Unerschütterlich', icon: '+', x: 4, y: 1, p: ['w_aura', 'w_wall'], max: 5, cost: G(200, 2), desc: 'Der Wächter heilt 0,5 % seines Lebens pro Sekunde je Stufe' },
    { id: 'w_key', tree: 'waechter', name: 'Letzte Bastion', icon: 'Ψ', x: 3, y: 0, p: ['w_parade', 'w_regen'], max: 1, cost: () => ({ g: 5000, s: 12 }), kind: 'key',
      desc: 'Schlüssel: Fällt der Wächter, steht er einmal pro Lauf mit vollem Leben wieder auf' },
    // --- Schützin (ab Version 3) ---
    { id: 's_hire', tree: 'schuetze', name: 'Schützin anheuern', icon: '➶', x: 3, y: 4, kind: 'start', max: 1, cost: () => ({ g: 1500, s: 6 }), reqBest: 15,
      desc: 'Die Schützin schließt sich deiner Gruppe an und schießt aus der hinteren Reihe.' },
    { id: 's_atk', tree: 'schuetze', name: 'Zielwasser', icon: 'S', x: 1, y: 3, p: ['s_hire'], max: 30, cost: G(45, 1.7), desc: '+10 % Schaden der Schützin je Stufe (wächst aufeinander auf)' },
    { id: 's_spd', tree: 'schuetze', name: 'Schnellschuss', icon: 'T', x: 3, y: 3, p: ['s_hire'], max: 10, cost: G(90, 1.9), desc: '+5 % Angriffstempo der Schützin je Stufe' },
    { id: 's_krit', tree: 'schuetze', name: 'Adlerauge', icon: 'K', x: 5, y: 3, p: ['s_hire'], max: 8, cost: G(90, 1.9), desc: '+4 % Chance auf kritische Treffer der Schützin je Stufe' },
    { id: 's_hagel', tree: 'schuetze', name: 'Pfeilhagel', icon: '⋮', x: 1, y: 2, p: ['s_atk', 's_spd'], max: 3, cost: SL([3, 5, 8]), active: true,
      desc: 'Aktiv: 6 Pfeile auf zufällige Gegner mit je 120 % Schaden (+40 % je Stufe). Abklingzeit 14 s.' },
    { id: 's_durch', tree: 'schuetze', name: 'Durchschlag', icon: '→', x: 3, y: 2, p: ['s_spd'], max: 3, cost: SL([3, 5, 8]), desc: 'Pfeile treffen auch den zweiten Gegner mit 30 % Schaden je Stufe' },
    { id: 's_gift', tree: 'schuetze', name: 'Giftpfeil', icon: '☠', x: 5, y: 2, p: ['s_spd', 's_krit'], max: 3, cost: SL([3, 5, 8]), active: true,
      desc: 'Aktiv: vergiftet den stärksten Gegner, 300 % Schaden (+100 % je Stufe) über 5 s. Abklingzeit 10 s.' },
    { id: 's_gold', tree: 'schuetze', name: 'Kopfgeld', icon: '$', x: 2, y: 1, p: ['s_hagel', 's_durch'], max: 5, cost: G(300, 2), desc: '+8 % Gold je Stufe' },
    { id: 's_hp', tree: 'schuetze', name: 'Lederwams', icon: 'L', x: 4, y: 1, p: ['s_durch', 's_gift'], max: 15, cost: G(80, 1.8), desc: '+10 % Leben der Schützin je Stufe (wächst aufeinander auf)' },
    { id: 's_key', tree: 'schuetze', name: 'Meisterschützin', icon: '✶', x: 3, y: 0, p: ['s_gold', 's_hp'], max: 1, cost: () => ({ g: 8000, s: 15 }), kind: 'key',
      desc: 'Schlüssel: Die Schützin schießt jedes Mal zwei Pfeile' },
  ];
  NODES.forEach(n => { n.tree = n.tree || 'ritter'; });
  const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));

  // Dauerhafte Upgrades aus der Wiedergeburt (bezahlt mit Sternen)
  const PERKS = [
    { id: 'p_macht', name: 'Heldenblut', desc: '+25 % Schaden und Leben aller Helden je Stufe', max: 999, cost: r => 1 + r },
    { id: 'p_gold', name: 'Goldader', desc: '+25 % Gold je Stufe', max: 999, cost: r => 1 + r },
    { id: 'p_seele', name: 'Seelenquelle', desc: '+1 Seele pro besiegtem Boss je Stufe', max: 10, cost: r => 2 + 2 * r },
    { id: 'p_start', name: 'Sprungstart', desc: 'Läufe beginnen 5 Stufen weiter je Stufe (höchstens bis 5 unter deinem Rekord aller Zeiten)', max: 10, cost: r => 2 + r },
    { id: 'p_freunde', name: 'Alte Freunde', desc: 'Wächter und Schützin bleiben nach einer Wiedergeburt angeheuert', max: 1, cost: () => 5 },
    { id: 'p_platz', name: 'Dritte Hand', desc: '+1 Platz für aktive Fähigkeiten des Ritters', max: 1, cost: () => 8 },
    { id: 'p_zins', name: 'Startkapital', desc: 'Nach einer Wiedergeburt startest du mit 200 Gold je Stufe', max: 20, cost: r => 1 + Math.floor(r / 2) },
  ];
  const PERK = Object.fromEntries(PERKS.map(p => [p.id, p]));
  const REBIRTH_MIN = 25;
  const starsFor = best => (best < REBIRTH_MIN ? 0 : Math.floor(Math.pow(best - 15, 1.3) / 3));

  function fresh() {
    return { v: SAVE_VERSION, gold: 0, souls: 0, best: 0, bestEver: 0, runs: 0, nodes: { start: 1 }, equip: [], speed: 1, stars: 0, rebirths: 0, perks: {} };
  }
  // Bringt jeden gespeicherten Stand auf die aktuelle Version
  function migrate(d) {
    if (!d || typeof d !== 'object') return fresh();
    if (!d.v || d.v < 2) { const f = fresh(); f.reset = true; return f; } // Version 1 hatte ein ganz anderes System
    const f = fresh();
    const out = { ...f, ...d, v: SAVE_VERSION, nodes: { ...f.nodes }, perks: {} };
    for (const [id, r] of Object.entries(d.nodes || {})) if (NODE[id]) out.nodes[id] = Math.max(0, Math.min(NODE[id].max, Math.floor(Number(r) || 0)));
    for (const [id, r] of Object.entries(d.perks || {})) if (PERK[id]) out.perks[id] = Math.max(0, Math.min(PERK[id].max, Math.floor(Number(r) || 0)));
    out.nodes.start = 1;
    for (const k of ['gold', 'souls', 'best', 'bestEver', 'runs', 'stars', 'rebirths']) out[k] = Math.max(0, Math.floor(Number(out[k]) || 0));
    out.bestEver = Math.max(out.bestEver, out.best);
    out.speed = [1, 2, 3].includes(out.speed) ? out.speed : 1;
    out.equip = [];
    for (const id of Array.isArray(d.equip) ? d.equip : []) if (NODE[id] && NODE[id].active && out.nodes[id] > 0 && !out.equip.includes(id)) out.equip.push(id);
    for (const h of HEROES) { const mine = out.equip.filter(id => NODE[id].tree === h.tree), lim = slotsOf(out, h.tree); if (mine.length > lim) out.equip = out.equip.filter(id => !mine.slice(lim).includes(id)); }
    delete out.reset;
    return out;
  }
  const rank = (S, id) => S.nodes[id] || 0;
  const perk = (S, id) => S.perks[id] || 0;
  const slotsOf = (S, tree) => HERO[tree].slots + (tree === 'ritter' ? (S.perks?.p_platz || 0) : 0);
  const hired = (S, tree) => tree === 'ritter' || rank(S, HERO[tree].hire) > 0;
  const available = (S, n) => {
    if (n.reqBest && S.bestEver < n.reqBest && S.best < n.reqBest) return false;
    if (n.kind === 'start') return true;
    return (n.p || []).some(p => rank(S, p) > 0);
  };
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
  function rebirth(S) {
    const st = starsFor(S.best); if (!st) return 0;
    S.stars += st; S.rebirths++; S.bestEver = Math.max(S.bestEver, S.best);
    const keep = perk(S, 'p_freunde') ? HEROES.filter(h => h.hire && rank(S, h.hire)).map(h => h.hire) : [];
    S.nodes = { start: 1 }; keep.forEach(id => (S.nodes[id] = 1));
    S.gold = 200 * perk(S, 'p_zins'); S.souls = 0; S.best = 0; S.equip = [];
    return st;
  }

  function stats(S) {
    const N = id => rank(S, id), P = id => perk(S, id);
    const all = (1 + 0.03 * N('schmiede') + 0.05 * N('ahnen')) * (1 + 0.25 * P('p_macht'));
    const aura = 0.03 * N('w_aura');
    const r = {
      atk: 10 * Math.pow(1.1, N('atk1')) * all * (N('berserk') ? 1.4 : 1), hp: 100 * Math.pow(1.1, N('hp1')) * all * (N('berserk') ? 0.8 : 1),
      aps: 1 + 0.04 * N('spd'), crit: 0.05 + 0.03 * N('krit'), critD: 1.5 + 0.15 * N('kritd'), dr: Math.min(0.8, 0.04 * N('armor') + aura),
      regen: 0.003 * N('regen'), dbl: 0.08 * N('doppel'), thorns: 0.2 * N('dorn'),
    };
    const w = hired(S, 'waechter') ? {
      atk: 4 * Math.pow(1.1, N('w_atk')) * all, hp: 160 * Math.pow(1.1, N('w_hp')) * all, aps: 0.8, crit: 0.05, critD: 1.5,
      dr: Math.min(0.85, 0.04 * N('w_armor') + aura), regen: 0.005 * N('w_regen'), block: 0.06 * N('w_parade'), revive: N('w_key'),
    } : null;
    const s = hired(S, 'schuetze') ? {
      atk: 7 * Math.pow(1.1, N('s_atk')) * all, hp: 70 * Math.pow(1.1, N('s_hp')) * all, aps: 1.1 * (1 + 0.05 * N('s_spd')),
      crit: 0.08 + 0.04 * N('s_krit'), critD: 1.6, dr: aura, regen: 0, pierce: 0.3 * N('s_durch'), shots: N('s_key') ? 2 : 1,
    } : null;
    const startStage = Math.max(1, Math.min(1 + 5 * P('p_start'), (S.bestEver || 0) - 5));
    return {
      r, w, s, startStage,
      goldMul: (1 + 0.06 * N('gold1')) * (1 + 0.15 * N('habgier')) * (1 + 0.08 * N('s_gold')) * (1 + 0.25 * P('p_gold')),
      chest: 0.03 * N('truhe'), eliteSoul: 0.15 * N('seelenf'), soulMul: N('ernte') ? 2 : 1, soulBonus: P('p_seele'), phoenix: N('phoenix'),
    };
  }

  /* ================= Aktive Fähigkeiten ================= */
  const near = run => run.enemies.filter(e => e.x < 280);
  const front = run => run.enemies[0] && run.enemies[0].x < 180;
  const ACT = {
    wirbel: { cd: r => 13 - r, ready: run => near(run).length >= 2 || run.enemies.some(e => e.boss && e.x < 280) },
    heil: { cd: () => 22, ready: (run, st) => ['r', 'w', 's'].some(k => run.h[k] && run.h[k].alive && run.h[k].hp < st[k].hp * 0.55) },
    blitz: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 320) },
    schild: { cd: () => 9, ready: front },
    schrei: { cd: () => 20, ready: front },
    w_haut: { cd: () => 16, ready: (run, st) => run.h.w && run.h.w.alive && run.h.w.hp < st.w.hp * 0.7 },
    w_wall: { cd: () => 12, ready: run => near(run).length >= 2 || run.enemies.some(e => e.boss && e.x < 280) },
    s_hagel: { cd: () => 14, ready: run => run.enemies.some(e => e.x < 360) },
    s_gift: { cd: () => 10, ready: run => run.enemies.some(e => e.x < 360) },
  };

  /* ================= Kampf ================= */
  const BIOMES = [
    { name: 'Grüne Wiesen', sky: ['#7cc0ee', '#cfeaff'], far: '#9cc9a6', hill: ['#6fb45e', '#4f9447'], ground: ['#7a5b3a', '#5e452c'], enemy: 'schleim', boss: 'Schleimkönig', prop: 'baum', sun: '#fff3c4' },
    { name: 'Finsterwald', sky: ['#1f3d4f', '#6d9a91'], far: '#2d5547', hill: ['#2f6b3f', '#1f4d2d'], ground: ['#4d3a28', '#382a1d'], enemy: 'goblin', boss: 'Goblinhäuptling', prop: 'tanne', sun: '#e8f1d8' },
    { name: 'Knochengruft', sky: ['#1d1729', '#4d3f66'], far: '#3a3150', hill: ['#4a4058', '#352d44'], ground: ['#3a3344', '#2a2433'], enemy: 'skelett', boss: 'Knochenfürst', prop: 'grab', sun: '#d9d2ff' },
    { name: 'Glutberge', sky: ['#3d1414', '#d9682f'], far: '#7a2f20', hill: ['#6b2d22', '#46201a'], ground: ['#2e1d1a', '#1f1311'], enemy: 'daemon', boss: 'Höllenfürst', prop: 'lava', sun: '#ffd27a' },
    { name: 'Frostgipfel', sky: ['#8fb8e0', '#eef6ff'], far: '#c4d8ea', hill: ['#dceaf5', '#b4cde0'], ground: ['#8aa0b2', '#6e8496'], enemy: 'golem', boss: 'Frostriese', prop: 'kristall', sun: '#ffffff' },
  ];
  const biomeOf = stage => BIOMES[Math.floor((Math.max(1, stage) - 1) / 10) % BIOMES.length];
  function makeEnemy(stage, i, boss) {
    const elite = !boss && Math.random() < 0.12;
    const m = boss ? 6 : elite ? 3 : 1;
    const hp = 20 * Math.pow(1.15, stage - 1) * m;
    return { x: 540 + i * 46, hp, max: hp, dmg: 4 * Math.pow(1.12, stage - 1) * (boss ? 2 : elite ? 1.5 : 1), atkT: 1.2, rate: boss ? 1.6 : 1.3,
      gold: Math.pow(1.13, stage - 1) * (boss ? 10 : elite ? 4 : 1), boss, elite, type: biomeOf(stage).enemy, stun: 0, hitT: 0, poison: 0, poisonT: 0, bob: Math.random() * 6 };
  }
  function heroState(stH) { return stH ? { hp: stH.hp, alive: true, atkT: 0.3 + Math.random() * 0.3, swing: 0, hurtT: 0, revived: false } : null; }
  function newRun(S) {
    const st = stats(S);
    const run = { stage: st.startStage, startStage: st.startStage, kills: 0, gold: 0, souls: 0, phoenixUsed: false, fx: {}, cds: {}, buffT: 0, buffMul: 0, hautT: 0,
      h: { r: heroState(st.r), w: heroState(st.w), s: heroState(st.s) }, enemies: [], floats: [], arrows: [], parts: [], scroll: 0, dead: false, deadT: 0, time: 0, shake: 0 };
    spawnWave(run);
    return run;
  }
  function spawnWave(run) {
    const boss = run.stage % 10 === 0, n = boss ? 3 : 5;
    run.enemies = [];
    for (let i = 0; i < n; i++) run.enemies.push(makeEnemy(run.stage, i, false));
    if (boss) run.enemies.push(makeEnemy(run.stage, n + 0.6, true));
  }
  const float = (run, x, y, text, color, size = 14) => run.floats.push({ x, y, text, color, size, t: 1 });
  function burst(run, x, y, color, n = 8) { for (let i = 0; i < n; i++) run.parts.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140 - 20, t: 0.6, c: color }); }
  function dealDamage(run, stH, e, mult, color) {
    let dmg = stH.atk * mult * (run.buffT > 0 ? 1 + run.buffMul : 1);
    const crit = Math.random() < stH.crit;
    if (crit) dmg *= stH.critD;
    e.hp -= dmg; e.hitT = 0.15;
    float(run, e.x + (Math.random() * 16 - 8), 150 - (e.boss ? 40 : 0), fmt(dmg), crit ? '#ffd23f' : color || '#ffffff', crit ? 18 : 13);
    if (crit) burst(run, e.x, 190, '#ffd23f', 5);
    return dmg;
  }
  const HX = { w: 142, r: 102, s: 54 }; // Positionen der Helden
  function heroX(run, k) { return k === 'r' && !(run.h.w && run.h.w.alive) ? 112 : HX[k]; }
  function frontHero(run) { return run.h.w && run.h.w.alive ? 'w' : 'r'; }
  function cast(S, st, run, id) {
    const r = rank(S, id);
    if (id === 'wirbel') { for (const e of near(run)) dealDamage(run, st.r, e, 2.5 + 0.75 * (r - 1)); }
    else if (id === 'heil') {
      for (const k of ['r', 'w', 's']) { const h = run.h[k]; if (!h || !h.alive) continue; const a = st[k].hp * (0.25 + 0.05 * (r - 1)); h.hp = Math.min(st[k].hp, h.hp + a); float(run, heroX(run, k), 120, '+' + fmt(a), '#7ee08a', 14); }
    } else if (id === 'blitz') { const t = run.enemies.filter(e => e.x < 320).sort((a, b) => b.hp - a.hp)[0]; if (t) { dealDamage(run, st.r, t, 4 + 1.5 * (r - 1), '#cfe6ff'); run.fx.blitzX = t.x; run.shake = 0.25; } }
    else if (id === 'schild') { const e = run.enemies[0]; dealDamage(run, st.r, e, 1.5); e.stun = 1.5 + 0.5 * (r - 1); float(run, e.x, 120, 'Betäubt', '#9fd0ff', 13); }
    else if (id === 'schrei') { run.buffT = 6; run.buffMul = 0.4 + 0.15 * (r - 1); float(run, heroX(run, 'r'), 100, 'Kriegsschrei!', '#ffb547', 15); }
    else if (id === 'w_haut') { run.hautT = 5 + r; float(run, HX.w, 110, 'Eiserne Haut', '#7fb2ff', 14); }
    else if (id === 'w_wall') { for (const e of near(run)) { dealDamage(run, st.w, e, 1.5 + 0.5 * (r - 1), '#cfe0ff'); e.stun = Math.max(e.stun, 1); } run.shake = 0.2; }
    else if (id === 's_hagel') {
      const vis = run.enemies.filter(e => e.x < 380);
      for (let i = 0; i < 6 && vis.length; i++) { const e = vis[Math.floor(Math.random() * vis.length)]; run.arrows.push({ x: HX.s, y: 170, tx: e.x, ty: 190 - (e.boss ? 30 : 0), t: 0, d: 0.3 + i * 0.06, hag: true }); dealDamage(run, st.s, e, 1.2 + 0.4 * (r - 1), '#c8f5cf'); }
    } else if (id === 's_gift') {
      const t = run.enemies.filter(e => e.x < 380).sort((a, b) => b.hp - a.hp)[0];
      if (t) { t.poison = st.s.atk * (3 + (r - 1)) / 5; t.poisonT = 5; run.arrows.push({ x: HX.s, y: 170, tx: t.x, ty: 185, t: 0, d: 0.35, gift: true }); float(run, t.x, 115, 'Vergiftet', '#9be36b', 13); }
    }
    run.cds[id] = ACT[id].cd(r); run.fx[id] = 0.5;
  }
  function hurtHero(S, st, run, k, raw, attacker) {
    const h = run.h[k], sh = st[k];
    if (!h || !h.alive) return;
    if (k === 'w' && sh.block && Math.random() < sh.block) { float(run, heroX(run, k), 125, 'Abgewehrt', '#9fd0ff', 12); return; }
    let d = raw * (1 - sh.dr);
    if (k === 'w' && run.hautT > 0) d *= 0.4;
    h.hp -= d; h.hurtT = 0.2;
    if (k === 'r' && sh.thorns && attacker) attacker.hp -= d * sh.thorns;
    if (h.hp <= 0) {
      if (k === 'r' && st.phoenix && !run.phoenixUsed) { run.phoenixUsed = true; h.hp = sh.hp * 0.5; float(run, heroX(run, k), 100, 'Zweites Leben!', '#ffb547', 18); }
      else if (k === 'w' && sh.revive && !h.revived) { h.revived = true; h.hp = sh.hp; float(run, HX.w, 100, 'Letzte Bastion!', '#7fb2ff', 16); }
      else { h.hp = 0; h.alive = false; if (k !== 'r') float(run, heroX(run, k), 110, `${k === 'w' ? 'Wächter' : 'Schützin'} gefallen`, '#ff8a8a', 13); }
    }
  }
  function step(S, st, run, dt) {
    if (run.dead) { run.deadT += dt; return; }
    run.time += dt; run.buffT -= dt; run.hautT -= dt; run.shake = Math.max(0, run.shake - dt);
    for (const k of ['r', 'w', 's']) {
      const h = run.h[k]; if (!h || !h.alive) continue;
      if (st[k].regen) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * st[k].regen * dt);
      h.swing = Math.max(0, h.swing - dt * 4); h.hurtT -= dt;
    }
    for (const k in run.cds) run.cds[k] = Math.max(0, run.cds[k] - dt);
    for (const k in run.fx) if (k !== 'blitzX') run.fx[k] -= dt;
    run.enemies.sort((a, b) => a.x - b.x);
    const fx0 = heroX(run, frontHero(run));
    let walking = true;
    run.enemies.forEach((e, i) => {
      const target = fx0 + 50 + i * 34 + (e.boss ? 10 : 0);
      if (e.stun > 0) e.stun -= dt;
      else if (e.x > target) e.x = Math.max(target, e.x - 75 * dt);
      else if (e.x < target) e.x = Math.min(target, e.x + 75 * dt);
      if (i === 0 && e.x <= target + 1) walking = false;
      e.hitT -= dt;
      if (e.poisonT > 0) { e.poisonT -= dt; e.hp -= e.poison * dt; }
    });
    if (walking) run.scroll += 70 * dt;
    for (const id of S.equip) {
      const n = NODE[id], hk = HERO[n.tree].id;
      if (rank(S, id) && run.h[hk] && run.h[hk].alive && !(run.cds[id] > 0) && run.enemies.length && ACT[id].ready(run, st)) cast(S, st, run, id);
    }
    const f = run.enemies[0], engaged = f && f.x <= fx0 + 52 + (f.boss ? 10 : 0);
    // Nahkämpfer
    for (const k of ['r', 'w']) {
      const h = run.h[k]; if (!h || !h.alive || !f) continue;
      if (!engaged) { h.atkT = Math.min(h.atkT, 0.3); continue; }
      h.atkT -= dt;
      if (h.atkT <= 0) {
        h.atkT += 1 / st[k].aps; h.swing = 1;
        dealDamage(run, st[k], f, 1, k === 'w' ? '#cfe0ff' : null);
        if (k === 'r' && Math.random() < st.r.dbl && f.hp > 0) dealDamage(run, st.r, f, 1);
      }
    }
    // Schützin
    const sh = run.h.s;
    if (sh && sh.alive && run.enemies.length && run.enemies[0].x < 400) {
      sh.atkT -= dt;
      if (sh.atkT <= 0) {
        sh.atkT += 1 / st.s.aps; sh.swing = 1;
        for (let i = 0; i < st.s.shots; i++) {
          const t = run.enemies[0];
          run.arrows.push({ x: HX.s + 8, y: 168, tx: t.x, ty: 188 - (t.boss ? 30 : 0), t: 0, d: 0.25 + i * 0.08 });
          dealDamage(run, st.s, t, 1, '#c8f5cf');
          if (st.s.pierce && run.enemies[1]) dealDamage(run, st.s, run.enemies[1], st.s.pierce, '#c8f5cf');
        }
      }
    }
    // Gegner greifen an
    if (f && engaged && f.stun <= 0) {
      f.atkT -= dt;
      if (f.atkT <= 0 && f.hp > 0) {
        f.atkT += f.rate;
        hurtHero(S, st, run, frontHero(run), f.dmg, f);
        if (f.boss) { run.shake = 0.15; for (const k of ['r', 'w', 's']) if (k !== frontHero(run)) hurtHero(S, st, run, k, f.dmg * 0.35, null); }
      }
    }
    // Besiegte Gegner
    for (const e of run.enemies) {
      if (e.hp > 0) continue;
      let g = e.gold * st.goldMul;
      if (Math.random() < st.chest) { g *= 10; float(run, e.x, 110, 'Truhe!', '#ffd23f', 16); }
      g = Math.max(1, Math.round(g));
      S.gold = Math.min(1e15, S.gold + g); run.gold += g; run.kills++;
      float(run, e.x, 130, '+' + fmt(g), '#ffcf4a', 14);
      burst(run, e.x, 200, e.boss ? '#c9a6ff' : '#ffffff', e.boss ? 24 : 8);
      let souls = 0;
      if (e.boss) souls = (1 + Math.floor(run.stage / 20)) * st.soulMul + st.soulBonus;
      else if (e.elite && Math.random() < st.eliteSoul) souls = 1;
      if (souls) { S.souls += souls; run.souls += souls; float(run, e.x, 95, `+${souls} Seele${souls > 1 ? 'n' : ''}`, '#c9a6ff', 16); }
    }
    run.enemies = run.enemies.filter(e => e.hp > 0);
    if (!run.enemies.length) {
      if (run.stage > S.best) S.best = run.stage;
      if (run.stage > S.bestEver) S.bestEver = run.stage;
      run.stage++;
      for (const k of ['r', 'w', 's']) { const h = run.h[k]; if (h && h.alive) h.hp = Math.min(st[k].hp, h.hp + st[k].hp * 0.15); }
      spawnWave(run);
    }
    run.floats.forEach(x => { x.t -= dt; x.y -= 30 * dt; });
    run.floats = run.floats.filter(x => x.t > 0);
    run.parts.forEach(p => { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; });
    run.parts = run.parts.filter(p => p.t > 0);
    run.arrows.forEach(a => (a.t += dt));
    run.arrows = run.arrows.filter(a => a.t < a.d);
    if (!run.h.r.alive) { run.dead = true; S.runs++; return 'dead'; }
  }

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
    return packNums([3, S.gold, S.souls, S.best, S.bestEver, S.runs, S.stars, S.rebirths, NODES.length, ...NODES.map(n => rank(S, n.id)),
      PERKS.length, ...PERKS.map(p => perk(S, p.id)), eq.length, ...eq]);
  }
  function decode(code) {
    const nums = unpackNums(code); if (!nums) return null;
    let i = 0; const next = () => nums[i++];
    const v = next();
    const d = { v, nodes: {}, perks: {}, equip: [] };
    if (v === 2) { // alter Code aus Version 2
      d.gold = next(); d.souls = next(); d.best = next(); d.runs = next();
      const c = next(); for (let k = 0; k < c; k++) { const r = next(); if (NODES[k]) d.nodes[NODES[k].id] = r; }
      for (let k = 0; k < 2; k++) { const e = next(); if (e > 0 && NODES[e - 1]) d.equip.push(NODES[e - 1].id); }
    } else if (v === 3) {
      d.gold = next(); d.souls = next(); d.best = next(); d.bestEver = next(); d.runs = next(); d.stars = next(); d.rebirths = next();
      const c = next(); for (let k = 0; k < c; k++) { const r = next(); if (NODES[k]) d.nodes[NODES[k].id] = r; }
      const pc = next(); for (let k = 0; k < pc; k++) { const r = next(); if (PERKS[k]) d.perks[PERKS[k].id] = r; }
      const ec = next(); for (let k = 0; k < ec; k++) { const e = next(); if (e > 0 && NODES[e - 1]) d.equip.push(NODES[e - 1].id); }
    } else return null;
    if (nums.slice(0, i).some(x => x === undefined) || i > nums.length) return null;
    return migrate(d);
  }

  function fmt(n) {
    if (n < 1000) return String(Math.floor(n));
    const units = ['', ' Tsd.', ' Mio.', ' Mrd.', ' Bio.', ' Brd.'];
    let i = 0; while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString()).replace('.', ',') + units[i];
  }

  const core = { HEROES, NODES, NODE, PERKS, fresh, migrate, stats, newRun, step, buy, canBuy, available, nodeCost, rank, perk, buyPerk, perkCost, rebirth, starsFor, toggleEquip, slotsOf, hired, encode, decode, fmt, REBIRTH_MIN };
  if (typeof module !== 'undefined') { module.exports = core; return; }

  /* ================= Oberfläche ================= */
  const $ = s => document.querySelector(s);
  const KEY = 'fsg.ritter';
  const TABS = [
    { id: 'ritter', label: 'Ritter', color: '#ffb547' }, { id: 'waechter', label: 'Wächter', color: '#7fb2ff' },
    { id: 'schuetze', label: 'Schützin', color: '#7ee08a' }, { id: 'ruhm', label: 'Wiedergeburt', color: '#c9a6ff' }, { id: 'stand', label: 'Spielstand', color: '#a99fbb' },
  ];
  const ACT_NAME = id => NODE[id].name;
  let S = load(), st = stats(S), run = null, tab = 'ritter', sel = { ritter: 'start', waechter: 'w_hire', schuetze: 's_hire' }, raf = 0, last = 0, active = false, cv, ctx, scale = 1;
  let confirm = '', hudT = 0;
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
        <div class="rl-bar"><div class="rl-stat" id="rlStat"></div><div id="rlAction"></div></div>
        <div class="rl-tabs" role="tablist">${TABS.map(t => `<button data-tab="${t.id}" style="--tc:${t.color}">${t.label}</button>`).join('')}</div>
        <div id="rlPanel"></div>`;
      cv = document.createElement('canvas'); $('#soloCanvas').appendChild(cv); ctx = cv.getContext('2d');
      window.addEventListener('resize', sizeCanvas);
      $('#soloBack').onclick = close;
      $('#soloSpeed').onclick = () => { S.speed = S.speed >= 3 ? 1 : S.speed + 1; hud(); };
      $('.rl-tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; confirm = ''; panel(); } };
      for (const id of ['#rlPanel', '#rlAction', '#rlHeroes']) $(id).addEventListener('click', onClick);
      $('#rlPanel').addEventListener('submit', onSubmit);
    }
    sizeCanvas(); hud(); heroes(); action(); panel();
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function close() { active = false; cancelAnimationFrame(raf); save(); cloudSave(true); $('#solo').hidden = true; $('#hub').hidden = false; }
  function sizeCanvas() {
    const host = $('#soloCanvas'); const w = Math.min(host.clientWidth || 360, 960);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = w + 'px'; cv.style.height = (w * H / W) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * H / W * dpr); scale = cv.width / W;
  }
  function startRun() { st = stats(S); run = newRun(S); confirm = ''; notice = ''; heroes(); action(); panel(); }
  function loop(now) {
    if (!active) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (run && !run.dead) for (let i = 0; i < S.speed; i++) {
      if (step(S, st, run, dt) === 'dead') { save(); cloudSave(true); heroes(); action(); panel(); break; }
    } else if (run) run.deadT += dt;
    draw(now / 1000);
    hudT += dt; if (hudT > 0.2) { hudT = 0; hud(); if (run && !run.dead) heroes(); }
    raf = requestAnimationFrame(loop);
  }

  /* ---------- Leisten ---------- */
  const coin = '<i class="rl-coin" aria-hidden="true"></i>', soul = '<i class="rl-soulic" aria-hidden="true"></i>', star = '<i class="rl-star" aria-hidden="true"></i>';
  function hud() {
    $('#rlStat').innerHTML = `<span class="rl-cur gold">${coin}${fmt(S.gold)}</span><span class="rl-cur soul">${soul}${S.souls}</span>${S.stars || S.rebirths ? `<span class="rl-cur star">${star}${S.stars}</span>` : ''}
      <span class="note">Rekord ${S.best}${S.bestEver > S.best ? ` (aller Zeiten ${S.bestEver})` : ''} · ${S.runs} Läufe</span>`;
    $('#soloSpeed').textContent = `Tempo ×${S.speed}`;
  }
  const PORTRAIT = { r: '⚔', w: '⛨', s: '➶' };
  function heroes() {
    const live = run && !run.dead;
    $('#rlHeroes').innerHTML = HEROES.map(h => {
      const ok = hired(S, h.tree), sh = st[h.id];
      if (!ok) {
        const n = NODE[h.hire], need = n.reqBest && S.bestEver < n.reqBest && S.best < n.reqBest;
        return `<button class="rl-hero locked" data-tab="${h.tree}" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><span class="hn"><b>${h.name}</b><small>${need ? `Ab Stufe ${n.reqBest}` : 'Anheuern möglich'}</small></span></button>`;
      }
      const eq = S.equip.filter(id => NODE[id].tree === h.tree);
      let body;
      if (live) {
        const hs = run.h[h.id], pct = hs ? Math.max(0, hs.hp / sh.hp) : 0;
        body = `<span class="hp"><i style="width:${pct * 100}%"></i></span><small>${hs && hs.alive ? `${fmt(Math.max(0, hs.hp))} / ${fmt(sh.hp)}` : 'Gefallen'}</small>
          <span class="cds">${eq.map(id => { const cd = run.cds[id] || 0; return `<span class="cd ${cd > 0 ? '' : 'ok'}">${ACT_NAME(id)}${cd > 0 ? ` ${Math.ceil(cd)}s` : ''}</span>`; }).join('')}</span>`;
      } else body = `<small>Schaden ${fmt(sh.atk)} · Leben ${fmt(sh.hp)}</small><span class="cds">${eq.map(id => `<span class="cd ok">${ACT_NAME(id)}</span>`).join('') || '<span class="cd">keine Fähigkeit</span>'}</span>`;
      return `<button class="rl-hero ${live && run.h[h.id] && !run.h[h.id].alive ? 'down' : ''}" data-tab="${h.tree}" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><span class="hn"><b>${h.name}</b>${body}</span></button>`;
    }).join('');
  }
  function action() {
    const a = $('#rlAction');
    if (inCamp()) a.innerHTML = `<button class="btn rl-go" data-rl="start">${run ? 'Neuer Lauf' : 'Lauf starten'}${st.startStage > 1 ? ` ab Stufe ${st.startStage}` : ''}</button>`;
    else a.innerHTML = `<button class="btn ${confirm === 'giveup' ? 'danger' : 'ghost'} small" data-rl="giveup">${confirm === 'giveup' ? 'Wirklich aufgeben?' : 'Lauf aufgeben'}</button>`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const costHTML = c => [c.g ? `<span class="rl-cur gold">${coin}${fmt(c.g)}</span>` : '', c.s ? `<span class="rl-cur soul">${soul}${c.s}</span>` : ''].join(' ');

  /* ---------- Bäume ---------- */
  function treeSVG(tree) {
    const list = NODES.filter(n => n.tree === tree), rows = Math.max(...list.map(n => n.y)) + 1;
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
    return `<svg class="rl-tree2" viewBox="0 0 700 ${rows * 100 + 10}">${lines}${nodes}</svg>`;
  }
  function detailHTML(tree) {
    const n = NODE[sel[tree]], r = rank(S, n.id), av = available(S, n), maxed = r >= n.max, h = HERO[tree];
    const type = n.kind === 'start' ? (n.cost ? 'Anheuern' : 'Start') : n.active ? 'Aktive Fähigkeit' : n.kind === 'key' ? 'Schlüssel' : n.kind === 'inf' ? 'Endlos' : 'Passiv';
    let act = '';
    if (n.cost) {
      if (maxed) act = '<span class="note">Voll ausgebaut</span>';
      else if (!av) act = n.reqBest && S.bestEver < n.reqBest && S.best < n.reqBest ? `<span class="note">Erreiche zuerst Stufe ${n.reqBest}.</span>` : `<span class="note">Schalte zuerst ${(n.p || []).map(id => NODE[id].name).join(' oder ')} frei.</span>`;
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
    return `<div class="rl-hhead" style="--hc:${h.color}"><span class="pt">${PORTRAIT[h.id]}</span><div><h3>${h.name}</h3><p class="note">${h.desc}</p>
      ${ok ? `<p class="note">Aktive Fähigkeiten ${eq.length}/${slotsOf(S, tree)}: ${eq.length ? esc(eq.map(ACT_NAME).join(', ')) : 'noch keine'} – sie werden im Kampf automatisch eingesetzt.</p>` : ''}</div></div>
      <div class="rl-treewrap"><div class="rl-treebox">${treeSVG(tree)}</div>${detailHTML(tree)}</div>`;
  }
  function campInfo() {
    if (run && run.dead) return `<div class="rl-dead"><b>Lauf vorbei auf Stufe ${run.stage}</b><span>${run.kills} Gegner besiegt · ${coin}+${fmt(run.gold)}${run.souls ? ` · ${soul}+${run.souls}` : ''}</span><span class="note">Verbessere deine Helden und starte dann den nächsten Lauf.</span></div>`;
    if (!run) return '<p class="note">Du bist im Lager. Hier verbesserst du deine Helden mit Gold und Seelen. Seelen gibt es von Bossen (alle 10 Stufen) und manchmal von Elite-Gegnern mit lila Ring.</p>';
    return '<p class="note">Der Lauf läuft. Verbessern kannst du erst danach im Lager.</p>';
  }
  function ruhmTab() {
    const gain = starsFor(S.best);
    let html = `<div class="rl-rebirth"><div><h3>Wiedergeburt</h3>
      <p class="note">Setzt Gold, Seelen, alle Fertigkeiten und deinen Rekord auf null. Dafür bekommst du Sterne, mit denen du dauerhafte Verbesserungen kaufst. Sie bleiben für immer.</p>
      <p>Dein Rekord: <b>Stufe ${S.best}</b> → ${gain ? `<b class="rl-cur star">${star}${gain} Sterne</b>` : `ab Stufe ${REBIRTH_MIN} möglich`}</p>
      ${gain ? `<p class="note">Je weiter du kommst, desto mehr Sterne: Stufe 30 bringt ${starsFor(30)}, Stufe 40 ${starsFor(40)}, Stufe 50 ${starsFor(50)}.</p>` : ''}</div>
      <button class="btn ${confirm === 'rebirth' ? 'danger' : ''}" data-rl="rebirth" ${gain && inCamp() ? '' : 'disabled'}>${confirm === 'rebirth' ? 'Wirklich alles zurücksetzen?' : 'Wiedergeboren werden'}</button></div>
      <p class="note">${S.rebirths ? `Bisher ${S.rebirths}× wiedergeboren.` : ''} Du hast <span class="rl-cur star">${star}${S.stars}</span> Sterne.</p><div class="rl-perks">`;
    html += PERKS.map(p => {
      const r = perk(S, p.id), maxed = r >= p.max, c = perkCost(S, p);
      return `<div class="rl-perk ${r ? 'has' : ''}"><b>${esc(p.name)}</b><span class="note">${p.max > 99 ? `Stufe ${r}` : `${r} / ${p.max}`}</span><p class="note">${esc(p.desc)}</p>
        <button class="btn small" data-perk="${p.id}" ${maxed || S.stars < c ? 'disabled' : ''}>${maxed ? 'Voll' : `${c} ${c === 1 ? 'Stern' : 'Sterne'}`}</button></div>`;
    }).join('') + '</div>';
    return html;
  }
  function panel() {
    document.querySelectorAll('.rl-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const p = $('#rlPanel');
    let html = notice ? `<p class="warn">${esc(notice)}</p>` : '';
    if (HERO[tab]) html += campInfo() + heroTab(tab);
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
    S = migrate(data); delete S.reset; st = stats(S); run = null;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    action(); hud(); heroes();
  }
  function toast(m) { const t = $('#toast'); t.textContent = m; t.className = 'toast'; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200); }
  function ask(key, redraw) { if (confirm === key) { confirm = ''; return true; } confirm = key; redraw(); setTimeout(() => { if (confirm === key) { confirm = ''; redraw(); } }, 4000); return false; }
  function afterChange() { st = stats(S); save(); panel(); hud(); heroes(); action(); }
  function onClick(e) {
    const g = e.target.closest('[data-node]');
    if (g) { sel[tab] = g.dataset.node; panel(); return; }
    const tb = e.target.closest('.rl-hero[data-tab]');
    if (tb) { tab = tb.dataset.tab; panel(); $('.rl-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.perk) { if (buyPerk(S, PERKS.find(p => p.id === b.dataset.perk))) afterChange(); return; }
    const a = b.dataset.rl;
    if (a === 'start') startRun();
    else if (a === 'giveup') { if (ask('giveup', action)) { run.dead = true; S.runs++; save(); cloudSave(true); heroes(); action(); panel(); } }
    else if (a === 'buy') { if (inCamp() && buy(S, NODE[sel[tab]])) afterChange(); }
    else if (a === 'equip') { if (inCamp()) { toggleEquip(S, sel[tab]); afterChange(); } }
    else if (a === 'rebirth') { if (ask('rebirth', panel)) { const n = rebirth(S); run = null; afterChange(); toast(`Wiedergeboren! +${n} Sterne`); } }
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
      s.speed = S.speed; adopt(s); save(); panel(); toast('Spielstand geladen');
    } else if (a === 'reset') { if (ask('reset', panel)) { adopt(fresh()); save(); panel(); toast('Neuer Spielstand'); } }
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
  function enemy(e, t) {
    const s = e.boss ? 1.8 : e.elite ? 1.15 : 1, bob = Math.sin(t * 6 + e.bob) * 2;
    shadow(e.x, 16 * s);
    ctx.save(); ctx.translate(e.x, GROUND); ctx.scale(s, s);
    if (e.elite) { const gl = ctx.createRadialGradient(0, -20, 4, 0, -20, 34); gl.addColorStop(0, 'rgba(201,166,255,.45)'); gl.addColorStop(1, 'rgba(201,166,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-34, -54, 68, 60); }
    const flash = e.hitT > 0, col = c => (flash ? '#ffffff' : c);
    if (e.type === 'schleim') {
      ctx.beginPath(); ctx.ellipse(0, -12 + bob / 2, 17, 13 - bob / 2, 0, Math.PI, 0); ctx.lineTo(17, 0); ctx.lineTo(-17, 0); ctx.closePath(); fillO(col('#58c46a'));
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-6, -18, 4, 3, -0.5, 0, 7); ctx.fill();
      eyes(-6, -14, '#fff');
    } else if (e.type === 'goblin') {
      ctx.fillStyle = col('#4a6e2e'); ctx.fillRect(-7, -8, 5, 8); ctx.fillRect(2, -8, 5, 8);
      rr(-8, -27, 16, 20, 4); fillO(col('#5e8c3a'));
      ctx.beginPath(); ctx.arc(0, -33 + bob / 2, 9, 0, 7); fillO(col('#6fa046'));
      ctx.beginPath(); ctx.moveTo(-8, -35); ctx.lineTo(-17, -41); ctx.lineTo(-7, -30); fillO(col('#6fa046'));
      ctx.fillStyle = col('#8a6a3a'); ctx.fillRect(-15, -26, 3, 24);
      eyes(-6, -35, '#ffd23f');
    } else if (e.type === 'skelett') {
      ctx.fillStyle = col('#e8e2d0'); ctx.fillRect(-2, -28, 4, 20); for (let i = 0; i < 3; i++) ctx.fillRect(-7, -26 + i * 5, 14, 2);
      ctx.fillRect(-6, -8, 3, 8); ctx.fillRect(3, -8, 3, 8);
      ctx.beginPath(); ctx.arc(0, -35 + bob / 2, 8, 0, 7); fillO(col('#efe9d8'));
      ctx.fillStyle = '#1b1726'; ctx.fillRect(-5, -37, 3, 3); ctx.fillRect(-1, -37, 3, 3);
      ctx.fillStyle = 'rgba(160,140,255,.8)'; ctx.fillRect(-5, -37, 2, 2);
      ctx.fillStyle = col('#9aa3ad'); ctx.fillRect(-16, -32, 2, 26);
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
    if (e.boss) { ctx.beginPath(); ctx.moveTo(-8, -52); ctx.lineTo(-8, -60); ctx.lineTo(-4, -55); ctx.lineTo(0, -62); ctx.lineTo(4, -55); ctx.lineTo(8, -60); ctx.lineTo(8, -52); ctx.closePath(); fillO('#ffd23f'); }
    if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, -56 + Math.sin(a) * 3, 2.2, 0, 7); ctx.fill(); }
    if (e.poisonT > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(155,227,107,.8)'; ctx.beginPath(); ctx.arc(-6 + i * 6, -10 - ((t * 30 + i * 9) % 22), 2.5, 0, 7); ctx.fill(); }
    ctx.restore();
    const bw = e.boss ? 64 : 30, by = GROUND - (e.boss ? 118 : e.elite ? 62 : 56);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(e.x - bw / 2, by, bw, 5, 2); ctx.fill();
    ctx.fillStyle = e.boss ? '#c9a6ff' : e.elite ? '#d7b5ff' : '#e5484d'; rr(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 5, 2); ctx.fill();
  }

  const campRun = { scroll: 0 };
  function draw(t) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const R = run && !run.dead ? run : null;
    if (R && R.shake > 0) ctx.translate((Math.random() - 0.5) * 6 * R.shake / 0.25, (Math.random() - 0.5) * 4 * R.shake / 0.25);
    const bm = biomeOf(R ? R.stage : 1), scroll = R ? R.scroll : 0, night = !R;
    sky(bm, t, night);
    range(night ? '#2a2745' : bm.far, 0.12, 150, 40, 0.01, scroll, true);
    range(night ? '#25313a' : bm.hill[0], 0.3, 170, 22, 0.013, scroll);
    range(night ? '#1c2a22' : bm.hill[1], 0.55, 196, 14, 0.022, scroll);
    ground(bm, scroll, night);
    if (R) {
      props(bm, scroll, t);
      const walking = R.enemies.length && R.enemies[0].x > heroX(R, frontHero(R)) + 54;
      [...R.enemies].sort((a, b) => b.x - a.x).forEach(e => enemy(e, t));
      if (R.h.s) archer(HX.s, R.h.s, t, walking);
      knight(heroX(R, 'r'), R.h.r, t, walking);
      if (R.h.w) guard(HX.w, R.h.w, t, walking);
      heroBar(HX.s, GROUND - 76, R.h.s, st.s && st.s.hp, '#7ee08a');
      heroBar(heroX(R, 'r'), GROUND - 92, R.h.r, st.r.hp, '#ffb547');
      heroBar(HX.w, GROUND - 96, R.h.w, st.w && st.w.hp, '#7fb2ff');
      // Pfeile
      for (const a of R.arrows) {
        const p = Math.min(1, a.t / a.d), x = a.x + (a.tx - a.x) * p, y = a.y + (a.ty - a.y) * p - Math.sin(p * Math.PI) * (a.hag ? 50 : 14);
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(a.ty - a.y - Math.cos(p * Math.PI) * (a.hag ? 50 : 14) * Math.PI, a.tx - a.x));
        ctx.fillStyle = a.gift ? '#9be36b' : '#e8e2d0'; ctx.fillRect(-9, -1, 14, 2); ctx.fillStyle = '#b7bcc6'; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(9, 0); ctx.lineTo(5, 3); ctx.fill();
        ctx.restore();
      }
      // Effekte
      if (R.fx.wirbel > 0) { ctx.strokeStyle = `rgba(255,220,150,${R.fx.wirbel * 1.6})`; ctx.lineWidth = 5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(heroX(R, 'r'), GROUND - 30, 40 + i * 22 + (0.5 - R.fx.wirbel) * 80, t * 12 + i, t * 12 + i + 2.4); ctx.stroke(); } }
      if (R.fx.blitz > 0) { ctx.strokeStyle = `rgba(210,235,255,${R.fx.blitz * 2})`; ctx.lineWidth = 4; ctx.beginPath(); let x = R.fx.blitzX || 220, y = 0; ctx.moveTo(x, y); while (y < GROUND - 30) { y += 22; x += (Math.random() - 0.5) * 28; ctx.lineTo(x, y); } ctx.stroke(); ctx.fillStyle = `rgba(210,235,255,${R.fx.blitz * 0.3})`; ctx.fillRect(0, 0, W, H); }
      if (R.fx.heil > 0) { ctx.fillStyle = `rgba(126,224,138,${R.fx.heil * 0.6})`; ctx.beginPath(); ctx.arc(100, GROUND - 40, 90 * (1 - R.fx.heil), 0, 7); ctx.fill(); }
      if (R.fx.w_wall > 0) { ctx.strokeStyle = `rgba(127,178,255,${R.fx.w_wall * 1.6})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(HX.w + 20, GROUND - 10, 30 + (0.5 - R.fx.w_wall) * 220, -1.2, 0.2); ctx.stroke(); }
      if (R.buffT > 0) { ctx.strokeStyle = 'rgba(255,181,71,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(100, GROUND + 2, 70 + Math.sin(t * 10) * 3, 8, 0, 0, 7); ctx.stroke(); }
      for (const p of R.parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); }
      ctx.globalAlpha = 1;
      for (const f of R.floats) { ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = `${f.size}px "Bungee","Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); }
      ctx.globalAlpha = 1;
      // Kopfzeile
      const hg = ctx.createLinearGradient(0, 0, 0, 40); hg.addColorStop(0, 'rgba(15,12,22,.75)'); hg.addColorStop(1, 'rgba(15,12,22,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 40);
      ctx.font = '15px "Bungee","Arial Black",sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(`Stufe ${R.stage}`, 12, 22);
      ctx.font = '12px "Figtree",sans-serif'; ctx.fillStyle = R.stage % 10 === 0 ? '#c9a6ff' : 'rgba(255,255,255,.8)';
      ctx.fillText(R.stage % 10 === 0 ? `Boss: ${bm.boss}` : bm.name, 106, 21);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffcf4a'; ctx.fillText(`+${fmt(R.gold)} Gold`, W - 12, 21);
    } else {
      // Lager
      const fx = 250;
      ctx.fillStyle = 'rgba(255,170,80,.16)'; ctx.beginPath(); ctx.ellipse(fx, GROUND - 10, 150 + Math.sin(t * 5) * 6, 80, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(330, GROUND); ctx.lineTo(385, GROUND - 74); ctx.lineTo(440, GROUND); fillO('#7a6046');
      ctx.fillStyle = '#2a1f17'; ctx.beginPath(); ctx.moveTo(374, GROUND); ctx.lineTo(385, GROUND - 34); ctx.lineTo(396, GROUND); ctx.fill();
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(385, GROUND - 74); ctx.lineTo(385, GROUND - 92); ctx.lineTo(402, GROUND - 86); ctx.lineTo(385, GROUND - 80); ctx.fill();
      shadow(fx, 26);
      ctx.fillStyle = '#5a3d25'; ctx.save(); ctx.translate(fx, GROUND - 3); ctx.rotate(0.25); ctx.fillRect(-20, -3, 40, 6); ctx.rotate(-0.5); ctx.fillRect(-20, -3, 40, 6); ctx.restore();
      for (let i = 0; i < 6; i++) { const h = 20 + Math.sin(t * 9 + i * 1.7) * 7; ctx.fillStyle = ['#e5484d', '#ffb547', '#ffd23f'][i % 3]; ctx.beginPath(); ctx.moveTo(fx - 15 + i * 6, GROUND - 6); ctx.quadraticCurveTo(fx - 12 + i * 5, GROUND - 6 - h, fx - 7 + i * 6, GROUND - 6); ctx.fill(); }
      for (let i = 0; i < 6; i++) { const p = ((t * 0.6 + i / 6) % 1); ctx.fillStyle = `rgba(255,200,120,${1 - p})`; ctx.fillRect(fx + Math.sin(i * 3 + t) * 10, GROUND - 20 - p * 70, 2, 2); }
      if (hired(S, 'schuetze')) archer(150, null, t, false);
      knight(190, null, t, false);
      if (hired(S, 'waechter')) guard(305, null, t, false);
      ctx.textAlign = 'center'; ctx.font = '20px "Bungee","Arial Black",sans-serif'; ctx.fillStyle = '#ffb547';
      ctx.fillText(run && run.dead ? `Gefallen auf Stufe ${run.stage}` : 'Lager', W / 2, 42);
      ctx.font = '12px "Figtree",sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText(run && run.dead ? `${run.kills} Gegner · +${fmt(run.gold)} Gold${run.souls ? ` · +${run.souls} Seelen` : ''}` : 'Verbessere deine Helden und starte dann einen Lauf', W / 2, 64);
    }
    // Vignette
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  window.Ritter = { open, close, isOpen: () => active };
})();
