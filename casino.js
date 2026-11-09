// Casino – nur mit Spielgeld (Jetons). Blackjack, Roulette, Texas Hold'em, Pferderennen und Spielautomat.
// Jeder Raum ist ein Tisch für ein Spiel. Echte Spieler setzen sich dazu, freie Plätze können Bots übernehmen.
// Die Jetons bringt jeder Spieler aus seinem Gerät mit; der Tisch rechnet und meldet den neuen Stand zurück.
'use strict';
const KINDS = {
  blackjack: { title: 'Blackjack', seats: 5, bots: 2 },
  roulette: { title: 'Roulette', seats: 8, bots: 2 },
  poker: { title: "Texas Hold'em", seats: 6, bots: 3 },
  rennen: { title: 'Pferderennen', seats: 8, bots: 2 },
  slots: { title: 'Spielautomat', seats: 8, bots: 0 },
  rad: { title: 'Glücksrad', seats: 8, bots: 0 },
};
const BOT_NAMES = ['Bruno', 'Greta', 'Kalle', 'Mia', 'Otto', 'Lotte', 'Fritz', 'Rosi', 'Hugo', 'Elsa'];
const MAXC = 1e12, BOT_CHIPS = 5000;
const now = () => Date.now();
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clampChips = v => Math.max(0, Math.min(MAXC, Math.floor(Number(v) || 0)));
const MAXBET = Infinity; // kein allgemeiner Höchsteinsatz mehr – nur junge Konten sind begrenzt (siehe limOf)
let BANK = null; // vom Server gesetzt: Konto je Spieler und Jetons auf dem Server
// Einsatzlimit je Platz: nur junge Konten sind begrenzt (wächst mit dem Kontoalter, nach einer Woche unbegrenzt)
const limOf = x => { const l = x && x.acc && BANK && BANK.maxBet ? BANK.maxBet(x.acc) : 0; return l ? Math.max(10, l) : MAXBET; };
const limMsg = x => { const l = limOf(x); return `Höchsteinsatz ${l.toLocaleString('de-DE')} pro Runde${l < MAXBET ? ' – das Limit steigt mit dem Alter deines Kontos' : ''}.`; };
const roundBets = x => (x.bet || 0) + Object.values(x.bets || {}).reduce((a, b) => a + b, 0) + (x.hands || []).reduce((a, h) => a + (h.res ? 0 : h.bet || 0), 0);
const deck = (n = 1) => { const d = []; for (let k = 0; k < n; k++) for (const s of 'shdc') for (const r of 'A23456789TJQK') d.push(r + s); return shuffle(d); };

/* ---------- Tisch-Grundlagen ---------- */
function schedule(r, ms, fn) {
  clearTimeout(r.timer);
  r.timer = setTimeout(() => {
    if (!r.players.length) return;
    try { fn(); } catch (e) { console.error(e); }
    r.push();
  }, ms);
}
const humans = s => s.seats.filter(x => x && !x.bot);
const seatOf = (s, id) => s.seats.findIndex(x => x && x.id === id);
// Tische ohne Aktion eines echten Spielers pausieren nach 8 Minuten (sonst spielen Bots ewig weiter)
function idleStop(r) { const s = r.state; if (now() - (s.touched || 0) > 8 * 60e3) { s.paused = true; s.phase = 'paused'; s.ends = null; clearTimeout(r.timer); return true; } return false; }
function log(s, msg) { s.log.unshift(msg); s.log.length = Math.min(s.log.length, 8); }
function addBot(s) {
  const i = s.seats.findIndex(x => !x); if (i < 0) return false;
  const used = new Set(s.seats.filter(Boolean).map(x => x.name));
  const name = BOT_NAMES.find(n => !used.has(n)) || 'Bot';
  s.seats[i] = newSeat('bot' + now() + i, name, BOT_CHIPS, true);
  return true;
}
function newSeat(id, name, chips, bot) { return { id, name, bot: !!bot, chips, stack: 0, bet: 0, ready: false, bets: {}, last: null, hands: [], win: 0 }; }
function botRefill(s) { for (const x of s.seats) if (x && x.bot && x.chips + x.stack < 200) x.chips = BOT_CHIPS; }

/* ================= Blackjack ================= */
const BJ = {
  bet: 15000, turn: 20000, done: 5000,
  val(cards) { let v = 0, a = 0; for (const c of cards) { const r = c[0]; if (r === 'A') { a++; v += 11; } else v += 'TJQK'.includes(r) ? 10 : +r; } while (v > 21 && a) { v -= 10; a--; } return { v, soft: a > 0 }; },
  bj: cards => cards.length === 2 && BJ.val(cards).v === 21,
  draw(s) { if (s.shoe.length < 60) { s.shoe = deck(6); log(s, 'Neue Karten werden gemischt.'); } return s.shoe.pop(); },
  start(r) { const s = r.state; s.shoe = s.shoe || deck(6); BJ.toBet(r); },
  toBet(r) {
    if (idleStop(r)) return;
    const s = r.state; s.phase = 'bet'; s.dealer = []; s.hole = true; s.turn = null; s.ends = now() + BJ.bet; botRefill(s);
    for (const x of s.seats) if (x) { x.hands = []; x.ready = false; x.win = 0; if (x.bot) { x.bet = Math.min(x.chips, [50, 100, 100, 200, 250][rnd(5)]); x.chips -= x.bet; x.ready = true; } }
    schedule(r, BJ.bet, () => BJ.deal(r));
  },
  checkReady(r) { const s = r.state; const hs = humans(s).filter(x => x.bet > 0); if (s.phase === 'bet' && hs.length && hs.every(x => x.ready) && humans(s).every(x => x.ready || !x.bet)) schedule(r, 400, () => BJ.deal(r)); },
  deal(r) {
    const s = r.state; const live = s.seats.filter(x => x && x.bet > 0);
    if (!live.length) { BJ.toBet(r); return; }
    for (const x of live) { x.hands = [{ cards: [BJ.draw(s), BJ.draw(s)], bet: x.bet, done: false, res: null }]; x.last = x.bet; x.bet = 0; }
    s.dealer = [BJ.draw(s), BJ.draw(s)]; s.hole = true; s.phase = 'play';
    for (const x of live) if (BJ.bj(x.hands[0].cards)) x.hands[0].done = true;
    if (BJ.bj(s.dealer)) { s.hole = false; log(s, 'Die Bank hat Blackjack!'); BJ.settle(r); return; }
    s.turn = { i: -1, h: 0 }; BJ.next(r);
  },
  next(r) {
    const s = r.state; let { i, h } = s.turn;
    for (;;) {
      const x = s.seats[i];
      if (x && x.hands[h + 1]) h++; else { i++; h = 0; while (i < s.seats.length && !(s.seats[i] && s.seats[i].hands.length)) i++; }
      if (i >= s.seats.length) { s.turn = null; BJ.dealer(r); return; }
      const hand = s.seats[i].hands[h]; if (!hand.done && BJ.val(hand.cards).v < 21) break; hand.done = true;
    }
    s.turn = { i, h }; s.ends = now() + BJ.turn;
    const x = s.seats[i];
    schedule(r, x.bot ? 900 : BJ.turn, () => (x.bot ? BJ.botMove(r) : BJ.move(r, x, 'stand')));
  },
  move(r, x, a) {
    const s = r.state; if (s.phase !== 'play' || !s.turn || s.seats[s.turn.i] !== x) return 'Du bist gerade nicht dran.';
    const hand = x.hands[s.turn.h];
    if (a === 'hit') { hand.cards.push(BJ.draw(s)); if (BJ.val(hand.cards).v >= 21) hand.done = true; }
    else if (a === 'stand') hand.done = true;
    else if (a === 'double') { if (hand.cards.length !== 2 || x.chips < hand.bet) return 'Verdoppeln geht nur mit zwei Karten und genug Jetons.'; x.chips -= hand.bet; hand.bet *= 2; hand.dbl = true; hand.cards.push(BJ.draw(s)); hand.done = true; }
    else if (a === 'split') {
      const c = hand.cards; if (x.hands.length > 1 || c.length !== 2 || BJ.val([c[0]]).v !== BJ.val([c[1]]).v || x.chips < hand.bet) return 'Teilen geht nur mit einem Paar und genug Jetons.';
      x.chips -= hand.bet; x.hands = [{ cards: [c[0], BJ.draw(s)], bet: hand.bet, done: false }, { cards: [c[1], BJ.draw(s)], bet: hand.bet, done: false }];
      if (c[0][0] === 'A') x.hands.forEach(hh => (hh.done = true));
    } else return;
    if (hand.done || x.hands[s.turn.h].done) BJ.next(r); else { s.ends = now() + BJ.turn; schedule(r, x.bot ? 900 : BJ.turn, () => (x.bot ? BJ.botMove(r) : BJ.move(r, x, 'stand'))); }
  },
  botMove(r) {
    const s = r.state, x = s.seats[s.turn.i], hand = x.hands[s.turn.h], { v, soft } = BJ.val(hand.cards), up = BJ.val([s.dealer[0]]).v;
    let a = 'stand';
    if (hand.cards.length === 2 && (v === 10 || v === 11) && up < 10 && x.chips >= hand.bet) a = 'double';
    else if (soft ? v <= 17 : v < 12 || (v < 17 && up >= 7)) a = 'hit';
    BJ.move(r, x, a);
  },
  dealer(r) {
    const s = r.state; s.phase = 'dealer'; s.hole = false;
    const live = s.seats.some(x => x && x.hands.some(h => BJ.val(h.cards).v <= 21 && !BJ.bj(h.cards)));
    const step = () => { if (live && BJ.val(s.dealer).v < 17) { s.dealer.push(BJ.draw(s)); schedule(r, 750, step); } else BJ.settle(r); };
    schedule(r, 700, step);
  },
  settle(r) {
    const s = r.state, d = BJ.val(s.dealer).v, dbj = BJ.bj(s.dealer);
    for (const x of s.seats) {
      if (!x) continue; x.win = 0;
      for (const h of x.hands) {
        const v = BJ.val(h.cards).v, bj = BJ.bj(h.cards) && x.hands.length === 1;
        let pay = 0;
        if (v > 21) h.res = 'bust';
        else if (bj && !dbj) { h.res = 'bj'; pay = h.bet * 2.5; }
        else if (dbj && !bj) h.res = 'lose';
        else if (d > 21 || v > d) { h.res = 'win'; pay = h.bet * 2; }
        else if (v === d) { h.res = 'push'; pay = h.bet; }
        else h.res = 'lose';
        pay = Math.floor(pay); x.chips = clampChips(x.chips + pay); x.win += pay - h.bet;
      }
      if (x.hands.length && x.win > 0) log(s, `${x.name} gewinnt ${x.win.toLocaleString('de-DE')}`);
    }
    s.phase = 'done'; s.ends = now() + BJ.done;
    schedule(r, BJ.done, () => BJ.toBet(r));
  },
  act(r, x, a) {
    const s = r.state;
    if (a.type === 'bet') {
      if (s.phase !== 'bet') return 'Warte auf die nächste Runde.';
      const n = clampChips(a.amount); if (!n || n > x.chips) return 'Nicht genug Jetons.'; if (roundBets(x) + n > limOf(x)) return limMsg(x);
      x.chips -= n; x.bet += n; x.ready = false; return;
    }
    if (a.type === 'clear') { if (s.phase !== 'bet') return; x.chips += x.bet; x.bet = 0; x.ready = false; return; }
    if (a.type === 'rebet') { if (s.phase !== 'bet' || !x.last) return; const n = Math.min(x.last, x.chips + x.bet); x.chips += x.bet; x.bet = n; x.chips -= n; return; }
    if (a.type === 'deal') { if (s.phase !== 'bet' || !x.bet) return 'Setze zuerst Jetons.'; x.ready = true; BJ.checkReady(r); return; }
    if (['hit', 'stand', 'double', 'split'].includes(a.type)) return BJ.move(r, x, a.type);
  },
  view(s, me) {
    return { dealer: s.hole && s.dealer.length ? [s.dealer[0], '??'] : s.dealer, dval: s.hole ? (s.dealer.length ? BJ.val([s.dealer[0]]).v : 0) : BJ.val(s.dealer).v, turn: s.turn,
      seats: s.seats.map(x => x && { name: x.name, bot: x.bot, bet: x.bet, ready: x.ready, win: x.win, hands: x.hands.map(h => ({ cards: h.cards, bet: h.bet, v: BJ.val(h.cards).v, res: h.res, dbl: !!h.dbl })) }) };
  },
};

/* ================= Roulette ================= */
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const RL = {
  bet: 20000, spin: 7500, done: 5000,
  pays(key, n) {
    if (key[0] === 'n') return +key.slice(1) === n ? 36 : 0;
    if (n === 0) return 0;
    switch (key) {
      case 'red': return RED.has(n) ? 2 : 0; case 'black': return !RED.has(n) ? 2 : 0;
      case 'even': return n % 2 === 0 ? 2 : 0; case 'odd': return n % 2 ? 2 : 0;
      case 'low': return n <= 18 ? 2 : 0; case 'high': return n >= 19 ? 2 : 0;
      case 'd1': return n <= 12 ? 3 : 0; case 'd2': return n >= 13 && n <= 24 ? 3 : 0; case 'd3': return n >= 25 ? 3 : 0;
      case 'c1': return n % 3 === 1 ? 3 : 0; case 'c2': return n % 3 === 2 ? 3 : 0; case 'c3': return n % 3 === 0 ? 3 : 0;
    }
    return 0;
  },
  keyOk: k => /^n([0-9]|[12][0-9]|3[0-6])$/.test(k) || ['red', 'black', 'even', 'odd', 'low', 'high', 'd1', 'd2', 'd3', 'c1', 'c2', 'c3'].includes(k),
  start(r) { const s = r.state; s.hist = s.hist || []; RL.toBet(r); },
  toBet(r) {
    if (idleStop(r)) return;
    const s = r.state; s.phase = 'bet'; s.ends = now() + RL.bet; s.result = null; botRefill(s);
    for (const x of s.seats) if (x) { x.bets = {}; x.ready = false; x.win = 0; if (x.bot) { const keys = ['red', 'black', 'even', 'odd', 'd1', 'd2', 'd3', 'n' + rnd(37), 'n' + rnd(37), 'low', 'high']; for (let k = 0; k < 1 + rnd(3); k++) { const key = keys[rnd(keys.length)], n = Math.min(x.chips, [25, 50, 100][rnd(3)]); if (n) { x.bets[key] = (x.bets[key] || 0) + n; x.chips -= n; } } x.ready = true; } }
    schedule(r, RL.bet, () => RL.spinNow(r));
  },
  spinNow(r) {
    const s = r.state; s.phase = 'spin'; s.result = rnd(37); s.spinId = (s.spinId || 0) + 1; s.ends = now() + RL.spin;
    for (const x of s.seats) if (x && Object.keys(x.bets).length) x.last = { ...x.bets };
    schedule(r, RL.spin, () => RL.settle(r));
  },
  settle(r) {
    const s = r.state, n = s.result; s.hist.unshift(n); s.hist.length = Math.min(s.hist.length, 16);
    for (const x of s.seats) { if (!x) continue; let pay = 0, staked = 0; for (const [k, v] of Object.entries(x.bets)) { staked += v; pay += v * RL.pays(k, n); } x.chips = clampChips(x.chips + pay); x.win = pay - staked; if (pay > 0 && staked) log(s, `${x.name} gewinnt ${(pay - staked).toLocaleString('de-DE')}`); }
    s.phase = 'done'; s.ends = now() + RL.done; schedule(r, RL.done, () => RL.toBet(r));
  },
  act(r, x, a) {
    const s = r.state;
    if (a.type === 'bet') {
      if (s.phase !== 'bet') return 'Nichts geht mehr – warte auf die nächste Runde.';
      const key = String(a.key), n = clampChips(a.amount); if (!RL.keyOk(key) || !n) return; if (n > x.chips) return 'Nicht genug Jetons.'; if (roundBets(x) + n > limOf(x)) return limMsg(x);
      x.chips -= n; x.bets[key] = (x.bets[key] || 0) + n; x.ready = false; return;
    }
    if (a.type === 'clear') { if (s.phase !== 'bet') return; for (const v of Object.values(x.bets)) x.chips += v; x.bets = {}; return; }
    if (a.type === 'rebet') { if (s.phase !== 'bet' || !x.last) return; for (const v of Object.values(x.bets)) x.chips += v; x.bets = {}; const tot = Object.values(x.last).reduce((p, v) => p + v, 0); if (tot > x.chips) return 'Nicht genug Jetons für denselben Einsatz.'; if (tot > limOf(x)) return limMsg(x); for (const [k, v] of Object.entries(x.last)) { x.bets[k] = v; x.chips -= v; } return; }
    if (a.type === 'go') { if (s.phase !== 'bet' || !Object.keys(x.bets).length) return 'Setze zuerst.'; x.ready = true; const hs = humans(s); if (hs.every(h => h.ready || !Object.keys(h.bets).length) && hs.some(h => h.ready)) schedule(r, 500, () => RL.spinNow(r)); return; }
  },
  view(s) { return { result: s.phase === 'bet' ? null : s.result, spinId: s.spinId || 0, hist: s.hist, seats: s.seats.map(x => x && { name: x.name, bot: x.bot, bets: x.bets, ready: x.ready, win: x.win }) }; },
};

/* ================= Pferderennen ================= */
const HORSES = ['Donnerhuf', 'Silberpfeil', 'Abendrot', 'Sturmwind', 'Glückskeks', 'Nebelfee', 'Kometa', 'Rotfuchs', 'Mondschein', 'Wirbelwind', 'Goldmähne', 'Schattenläufer'];
const RACE = {
  bet: 20000, run: 12500, done: 6000,
  start(r) { RACE.toBet(r); },
  newField(s) {
    const names = shuffle(HORSES.slice()).slice(0, 6), w = names.map(() => 0.6 + Math.random() * 1.2), sum = w.reduce((a, b) => a + b, 0);
    s.horses = names.map((name, i) => { const p = w[i] / sum; return { name, p, odds: Math.max(1.3, Math.round(0.9 / p * 10) / 10), col: i }; });
  },
  toBet(r) {
    if (idleStop(r)) return;
    const s = r.state; s.phase = 'bet'; s.ends = now() + RACE.bet; s.race = null; RACE.newField(s); botRefill(s);
    for (const x of s.seats) if (x) { x.bets = {}; x.ready = false; x.win = 0; if (x.bot) { const h = rnd(6), n = Math.min(x.chips, [50, 100, 200][rnd(3)]); if (n) { x.bets[(Math.random() < 0.7 ? 's' : 'p') + h] = n; x.chips -= n; } x.ready = true; } }
    schedule(r, RACE.bet, () => RACE.go(r));
  },
  go(r) {
    const s = r.state; s.phase = 'race'; s.ends = now() + RACE.run;
    // Reihenfolge nach Gewinnwahrscheinlichkeit ziehen, dann Zielzeiten und Laufstil festlegen
    const left = s.horses.map((h, i) => i), order = [];
    while (left.length) { const tot = left.reduce((a, i) => a + s.horses[i].p, 0); let x = Math.random() * tot, k = 0; for (; k < left.length - 1; k++) { x -= s.horses[left[k]].p; if (x <= 0) break; } order.push(left.splice(k, 1)[0]); }
    const times = []; let t = 9.2 + Math.random() * 0.6; for (const i of order) { times[i] = t; t += 0.15 + Math.random() * 0.45; }
    s.race = { id: (s.race && s.race.id || 0) + 1 + rnd(1000), order, times, style: s.horses.map(() => rnd(3)) };
    for (const x of s.seats) if (x && Object.keys(x.bets).length) x.last = { ...x.bets };
    schedule(r, RACE.run, () => RACE.settle(r));
  },
  settle(r) {
    const s = r.state, o = s.race.order;
    for (const x of s.seats) { if (!x) continue; let pay = 0, staked = 0; for (const [k, v] of Object.entries(x.bets)) { staked += v; const h = +k.slice(1), pos = o.indexOf(h), H = s.horses[h]; if (k[0] === 's' && pos === 0) pay += v * H.odds; if (k[0] === 'p' && pos <= 2) pay += v * Math.max(1.1, Math.round((1 + (H.odds - 1) / 4) * 10) / 10); } pay = Math.floor(pay); x.chips = clampChips(x.chips + pay); x.win = pay - staked; if (pay > 0) log(s, `${x.name} gewinnt ${(pay - staked).toLocaleString('de-DE')}`); }
    log(s, `Sieger: ${s.horses[o[0]].name}`);
    s.phase = 'done'; s.ends = now() + RACE.done; schedule(r, RACE.done, () => RACE.toBet(r));
  },
  act(r, x, a) {
    const s = r.state;
    if (a.type === 'bet') { if (s.phase !== 'bet') return 'Das Rennen läuft schon.'; const key = String(a.key), n = clampChips(a.amount); if (!/^[sp][0-5]$/.test(key) || !n) return; if (n > x.chips) return 'Nicht genug Jetons.'; if (roundBets(x) + n > limOf(x)) return limMsg(x); x.chips -= n; x.bets[key] = (x.bets[key] || 0) + n; x.ready = false; return; }
    if (a.type === 'clear') { if (s.phase !== 'bet') return; for (const v of Object.values(x.bets)) x.chips += v; x.bets = {}; return; }
    if (a.type === 'go') { if (s.phase !== 'bet' || !Object.keys(x.bets).length) return 'Wette zuerst auf ein Pferd.'; x.ready = true; const hs = humans(s); if (hs.every(h => h.ready || !Object.keys(h.bets).length) && hs.some(h => h.ready)) schedule(r, 500, () => RACE.go(r)); return; }
  },
  view(s) { return { horses: s.horses, race: s.phase === 'bet' ? null : s.race, seats: s.seats.map(x => x && { name: x.name, bot: x.bot, bets: x.bets, ready: x.ready, win: x.win }) }; },
};

/* ================= Spielautomat ================= */
// 5 Walzen, 3 Reihen, 10 Gewinnlinien. Auszahlungen sind auf etwa 96 % Rückfluss abgestimmt.
const SYM = ['kirsche', 'zitrone', 'pflaume', 'glocke', 'stern', 'diamant', 'sieben', 'joker'];
const WEIGHT = [28, 26, 22, 16, 11, 7, 4, 4];
const PAY = { kirsche: [0, 0, 6, 22, 60], zitrone: [0, 0, 7, 26, 75], pflaume: [0, 0, 9, 32, 100], glocke: [0, 0, 14, 50, 200], stern: [0, 0, 25, 90, 350], diamant: [0, 0, 40, 150, 750], sieben: [0, 0, 70, 300, 2000], joker: [0, 0, 90, 400, 2500] };
const LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0]];
const SLOT = {
  start(r) { r.state.phase = 'free'; },
  pick() { let x = Math.random() * WEIGHT.reduce((a, b) => a + b, 0); for (let i = 0; i < SYM.length; i++) { x -= WEIGHT[i]; if (x <= 0) return i; } return 0; },
  spin(bet) {
    const g = [0, 1, 2, 3, 4].map(() => [SLOT.pick(), SLOT.pick(), SLOT.pick()]), wins = []; let pay = 0; const lb = bet / LINES.length;
    LINES.forEach((L, li) => {
      const syms = L.map((row, c) => g[c][row]); let base = syms.find(x => SYM[x] !== 'joker'); if (base == null) base = SYM.indexOf('joker');
      let n = 0; for (const x of syms) { if (x === base || SYM[x] === 'joker') n++; else break; }
      const m = PAY[SYM[base]][n - 1] || 0; if (m) { pay += lb * m; wins.push({ line: li, n, sym: SYM[base] }); }
    });
    return { grid: g.map(c => c.map(i => SYM[i])), wins, pay: Math.floor(pay) };
  },
  act(r, x, a) {
    if (a.type !== 'spin') return;
    const bet = clampChips(a.amount); if (bet < 10) return 'Mindesteinsatz 10.'; if (bet > x.chips) return 'Nicht genug Jetons.'; if (bet > limOf(x)) return limMsg(x);
    x.chips -= bet; const res = SLOT.spin(bet); x.chips = clampChips(x.chips + res.pay); x.win = res.pay - bet;
    x.slot = { id: (x.slot ? x.slot.id : 0) + 1, ...res, bet };
    if (res.pay >= bet * 15) log(r.state, `${x.name} knackt den Automaten: ${res.pay.toLocaleString('de-DE')}!`);
  },
  view(s) { return { seats: s.seats.map(x => x && { name: x.name, bot: x.bot, win: x.win, slot: x.slot ? { id: x.slot.id, grid: x.slot.grid, wins: x.slot.wins, pay: x.slot.pay, bet: x.slot.bet } : null }) }; },
};

/* ================= Glücksrad ================= */
// Felder mit Multiplikator von ×0,1 bis ×10. Die Breite eines Feldes ist genau seine Gewinnchance (w von 100). Rückfluss etwa 97 %, fast jede zweite Drehung gewinnt.
const RAD_SEGS = [[10, 0.8], [0.2, 5], [1.2, 6.75], [0.5, 4], [2, 2], [0.1, 6.5], [1.5, 5], [0.2, 5], [1.2, 6.75], [1, 5], [5, 1.2], [0.5, 4], [1.2, 6.75], [0.2, 5], [3, 2], [0.1, 6.5], [1.5, 5], [0.5, 4], [1.2, 6.75], [1, 5], [2, 2], [0.2, 5]];
const RAD_W = RAD_SEGS.reduce((a, s) => a + s[1], 0);
const RAD = {
  start(r) { r.state.phase = 'free'; },
  act(r, x, a) {
    if (a.type !== 'spin') return;
    const bet = clampChips(a.amount); if (bet < 10) return 'Mindesteinsatz 10.'; if (bet > x.chips) return 'Nicht genug Jetons.'; if (bet > limOf(x)) return limMsg(x);
    let v = Math.random() * RAD_W, i = 0; for (; i < RAD_SEGS.length - 1; i++) { v -= RAD_SEGS[i][1]; if (v <= 0) break; }
    const m = RAD_SEGS[i][0], pay = Math.floor(bet * m);
    x.chips = clampChips(x.chips - bet + pay); x.win = pay - bet;
    x.rad = { id: (x.rad ? x.rad.id : 0) + 1, i, m, pay, bet, off: Math.random() };
    if (m >= 5) log(r.state, `${x.name} dreht ×${String(m).replace('.', ',')}: ${pay.toLocaleString('de-DE')}!`);
  },
  view(s) { return { segs: RAD_SEGS, seats: s.seats.map(x => x && { name: x.name, bot: x.bot, win: x.win, rad: x.rad || null }) }; },
};

/* ================= Texas Hold'em ================= */
const RV = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
function eval5(c) {
  const v = c.map(x => RV[x[0]]).sort((a, b) => b - a), su = c.map(x => x[1]);
  const flush = su.every(x => x === su[0]);
  let uniq = [...new Set(v)], straight = 0;
  if (uniq.length === 5) { if (v[0] - v[4] === 4) straight = v[0]; else if (v[0] === 14 && v[1] === 5) straight = 5; }
  const cnt = {}; v.forEach(x => (cnt[x] = (cnt[x] || 0) + 1));
  const groups = Object.entries(cnt).map(([k, n]) => [n, +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]), kick = groups.map(g => g[1]);
  let cat;
  if (straight && flush) return [8, straight];
  if (groups[0][0] === 4) cat = 7; else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6; else if (flush) return [5, ...v];
  else if (straight) return [4, straight]; else if (groups[0][0] === 3) cat = 3; else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2; else if (groups[0][0] === 2) cat = 1; else cat = 0;
  return [cat, ...kick];
}
const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function best7(cards) { let best = null; const n = cards.length; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const five = cards.filter((_, i) => i !== a && i !== b); if (five.length !== 5) continue; const e = eval5(five); if (!best || cmp(e, best) > 0) best = e; } if (n === 5) best = eval5(cards); return best; }
const HAND_NAMES = ['Höchste Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'];
const PK = {
  sb: 10, bb: 20, buy: 2000, turn: 25000, show: 6000,
  start(r) { const s = r.state; s.btn = -1; s.hand = 0; PK.newHand(r); },
  seated: s => s.seats.map((x, i) => (x && x.stack > 0 ? i : -1)).filter(i => i >= 0),
  buyIn(x) { if (x.stack < PK.bb) { const n = Math.min(PK.buy - x.stack, x.chips); if (n > 0) { x.chips -= n; x.stack += n; } } },
  newHand(r) {
    if (idleStop(r)) return;
    const s = r.state; botRefill(s);
    for (const x of s.seats) if (x) { if (x.bot && x.stack < PK.bb) { x.stack = PK.buy; } else PK.buyIn(x); x.cards = []; x.folded = false; x.allin = false; x.bet = 0; x.put = 0; x.acted = false; x.win = 0; x.shown = null; }
    const act = PK.seated(s);
    s.board = []; s.pot = 0; s.street = 'wait'; s.turnI = -1; s.result = null; s.toCall = 0; s.minRaise = PK.bb;
    if (act.length < 2) { s.phase = 'wait'; s.ends = null; schedule(r, 3000, () => PK.newHand(r)); return; }
    s.phase = 'hand'; s.hand++; s.deck = deck(1);
    const nextOf = i => { for (let k = 1; k <= s.seats.length; k++) { const j = (i + k) % s.seats.length; if (act.includes(j)) return j; } return i; };
    s.btn = nextOf(s.btn);
    for (const i of act) s.seats[i].cards = [s.deck.pop(), s.deck.pop()];
    const sbI = act.length === 2 ? s.btn : nextOf(s.btn), bbI = nextOf(sbI);
    PK.put(s, sbI, Math.min(PK.sb, s.seats[sbI].stack)); PK.put(s, bbI, Math.min(PK.bb, s.seats[bbI].stack));
    s.toCall = PK.bb; s.street = 'pre'; s.sbI = sbI; s.bbI = bbI;
    PK.setTurn(r, nextOf(bbI));
  },
  put(s, i, n) { const x = s.seats[i]; n = Math.min(n, x.stack); x.stack -= n; x.bet += n; x.put += n; s.pot += n; if (!x.stack) x.allin = true; },
  inHand: s => s.seats.map((x, i) => (x && x.cards && x.cards.length && !x.folded ? i : -1)).filter(i => i >= 0),
  canAct: (s, i) => { const x = s.seats[i]; return x && x.cards && x.cards.length && !x.folded && !x.allin; },
  setTurn(r, i) {
    const s = r.state, n = s.seats.length;
    for (let k = 0; k < n; k++) { const j = (i + k) % n; if (PK.canAct(s, j) && (!s.seats[j].acted || s.seats[j].bet < s.toCall)) { s.turnI = j; s.ends = now() + PK.turn; const x = s.seats[j]; schedule(r, x.bot ? 700 + rnd(900) : PK.turn, () => (x.bot ? PK.botAct(r, j) : PK.move(r, j, { type: s.toCall > x.bet ? 'fold' : 'check' }))); return; } }
    PK.endStreet(r);
  },
  move(r, i, a) {
    const s = r.state, x = s.seats[i]; if (s.phase !== 'hand' || s.turnI !== i) return 'Du bist gerade nicht dran.';
    const need = s.toCall - x.bet;
    if (a.type === 'fold') { x.folded = true; log(s, `${x.name} steigt aus`); }
    else if (a.type === 'check') { if (need > 0) return 'Du musst mitgehen oder aussteigen.'; log(s, `${x.name} schiebt`); }
    else if (a.type === 'call') { if (need <= 0) return PK.move(r, i, { type: 'check' }); PK.put(s, i, need); log(s, `${x.name} geht mit`); }
    else if (a.type === 'raise' || a.type === 'allin') {
      let to = a.type === 'allin' ? x.bet + x.stack : Math.floor(Number(a.to) || 0);
      to = Math.min(to, x.bet + x.stack);
      if (to < s.toCall + s.minRaise && to < x.bet + x.stack) return `Mindestens auf ${s.toCall + s.minRaise} erhöhen.`;
      if (to <= s.toCall) return PK.move(r, i, { type: 'call' });
      s.minRaise = Math.max(s.minRaise, to - s.toCall); s.toCall = to; PK.put(s, i, to - x.bet);
      s.seats.forEach((o, j) => { if (o && j !== i) o.acted = false; });
      log(s, x.allin ? `${x.name} geht all-in (${to})` : `${x.name} erhöht auf ${to}`);
    } else return;
    x.acted = true;
    if (PK.inHand(s).length === 1) { PK.finish(r); return; }
    PK.setTurn(r, (i + 1) % s.seats.length);
  },
  endStreet(r) {
    const s = r.state;
    for (const x of s.seats) if (x) { x.bet = 0; x.acted = false; }
    s.toCall = 0; s.minRaise = PK.bb;
    const order = ['pre', 'flop', 'turn', 'river'], k = order.indexOf(s.street);
    if (k === 3) { PK.finish(r); return; }
    s.street = order[k + 1];
    if (s.street === 'flop') s.board.push(s.deck.pop(), s.deck.pop(), s.deck.pop()); else s.board.push(s.deck.pop());
    const actors = PK.inHand(s).filter(i => PK.canAct(s, i));
    if (actors.length < 2) { s.turnI = -1; schedule(r, 1100, () => PK.endStreet(r)); return; }
    s.turnI = -1; schedule(r, 600, () => PK.setTurn(r, (s.btn + 1) % s.seats.length));
  },
  finish(r) {
    const s = r.state, alive = PK.inHand(s);
    s.turnI = -1;
    if (alive.length === 1) { const x = s.seats[alive[0]]; x.stack += s.pot; x.win = s.pot - x.put; s.result = { names: [x.name], hand: null }; log(s, `${x.name} gewinnt ${s.pot}`); }
    else {
      while (s.board.length < 5) s.board.push(s.deck.pop());
      const score = {}; for (const i of alive) { score[i] = best7([...s.seats[i].cards, ...s.board]); s.seats[i].shown = HAND_NAMES[score[i][0]]; }
      // Haupt- und Nebentöpfe nach Einsatzhöhe
      const puts = s.seats.map(x => (x ? x.put : 0)), levels = [...new Set(puts.filter(p => p > 0))].sort((a, b) => a - b);
      let prev = 0; const got = {};
      for (const L of levels) {
        const part = puts.reduce((a, p) => a + Math.max(0, Math.min(p, L) - prev), 0);
        const elig = alive.filter(i => puts[i] >= L); if (!elig.length) { prev = L; continue; }
        let best = []; for (const i of elig) { if (!best.length || cmp(score[i], score[best[0]]) > 0) best = [i]; else if (cmp(score[i], score[best[0]]) === 0) best.push(i); }
        const each = Math.floor(part / best.length); best.forEach((i, k) => { const g = each + (k === 0 ? part - each * best.length : 0); s.seats[i].stack += g; got[i] = (got[i] || 0) + g; });
        prev = L;
      }
      s.seats.forEach((x, i) => { if (x) x.win = (got[i] || 0) - (x.put || 0); });
      const ws = Object.keys(got).map(Number).filter(i => got[i] > s.seats[i].put).sort((a, b) => got[b] - got[a]);
      if (!ws.length) ws.push(+Object.keys(got)[0]);
      s.result = { names: ws.map(i => s.seats[i].name), hand: HAND_NAMES[score[ws[0]][0]] };
      log(s, `${s.result.names.join(' und ')} gewinnt mit ${s.result.hand}`);
    }
    s.phase = 'show'; s.ends = now() + PK.show; s.street = 'show';
    schedule(r, PK.show, () => PK.newHand(r));
  },
  // Bot: grobe Gewinnchance per Simulation, dann Entscheidung nach Topfquote
  equity(s, i, n = 160) {
    const me = s.seats[i].cards, opp = PK.inHand(s).length - 1, known = new Set([...me, ...s.board]);
    const rest = deck(1).filter(c => !known.has(c)); let win = 0;
    for (let k = 0; k < n; k++) {
      shuffle(rest); let p = 0; const board = [...s.board]; while (board.length < 5) board.push(rest[p++]);
      const mine = best7([...me, ...board]); let ok = 1;
      for (let o = 0; o < opp; o++) { const e = best7([rest[p++], rest[p++], ...board]); const c = cmp(e, mine); if (c > 0) { ok = 0; break; } if (c === 0) ok = 0.5; }
      win += ok;
    }
    return win / n;
  },
  botAct(r, i) {
    const s = r.state, x = s.seats[i], need = s.toCall - x.bet, pot = s.pot, eq = PK.equity(s, i), odds = need / (pot + need || 1), bluff = Math.random() < 0.06;
    let a;
    if (eq > 0.72 || (bluff && need === 0)) { const to = s.toCall + Math.max(s.minRaise, Math.floor(pot * (0.5 + Math.random() * 0.5))); a = { type: 'raise', to }; if (eq > 0.88 && Math.random() < 0.25) a = { type: 'allin' }; }
    else if (need === 0) a = { type: 'check' };
    else if (eq > odds + 0.05 || (need <= PK.bb && eq > 0.25)) a = { type: 'call' };
    else a = { type: 'fold' };
    const err = PK.move(r, i, a); if (err) PK.move(r, i, { type: need ? 'call' : 'check' });
  },
  act(r, x, a, i) { if (['fold', 'check', 'call', 'raise', 'allin'].includes(a.type)) return PK.move(r, i, a); },
  view(s, meI) {
    const show = s.phase === 'show';
    return { board: s.board, pot: s.pot, street: s.street, turnI: s.turnI, btn: s.btn, toCall: s.toCall, minRaise: s.minRaise, bb: PK.bb, result: s.result, hand: s.hand,
      seats: s.seats.map((x, i) => x && { name: x.name, bot: x.bot, stack: x.stack, bet: x.bet, folded: !!x.folded, allin: !!x.allin, win: x.win, shown: show ? x.shown : null,
        cards: x.cards && x.cards.length ? (i === meI || (show && !x.folded && PK.inHand(s).length > 1) ? x.cards : ['??', '??']) : [] }) };
  },
};

const GAME = { blackjack: BJ, roulette: RL, poker: PK, rennen: RACE, slots: SLOT, rad: RAD };

module.exports = {
  title: 'Casino', min: 1, seats: 8,
  init(r, m) {
    const kind = KINDS[m && m.kind] ? m.kind : 'blackjack', K = KINDS[kind], host = r.players[0];
    r.private = !!(m && m.priv);
    r.name = `${K.title} · Tisch von ${host.name}`;
    r.state = { kind, seats: Array(K.seats).fill(null), log: [], phase: 'idle', touched: now() };
    for (let i = 0; i < K.bots; i++) addBot(r.state);
    r.status = 'playing';
    setTimeout(() => { try { GAME[kind].start(r); r.push(); } catch (e) { console.error(e); } }, 50);
  },
  start(r) { if (!r.state) this.init(r, { kind: 'blackjack' }); r.status = 'playing'; },
  setBank(b) { BANK = b; },
  onLeave(r, pid) {
    const s = r.state; if (!s) return; const i = seatOf(s, pid); if (i < 0) return;
    const lx = s.seats[i]; if (lx && lx.acc && BANK) { BANK.sync(lx.acc, lx.chips + (lx.stack || 0)); if (BANK.seated.get(lx.acc) === r.id) BANK.seated.delete(lx.acc); }
    if (s.kind === 'poker' && s.phase === 'hand' && s.seats[i].cards && s.seats[i].cards.length && !s.seats[i].folded) { if (s.turnI === i) PK.move(r, i, { type: 'fold' }); else s.seats[i].folded = true; }
    s.seats[i] = null;
    if (s.kind === 'blackjack' && s.turn && s.turn.i === i) BJ.next(r);
  },
  act(r, pid, a) {
    const s = r.state; if (!s) return;
    s.touched = now();
    if (s.paused) { s.paused = false; s.phase = 'idle'; if (s.kind === 'poker') { s.btn = s.btn ?? -1; s.hand = s.hand || 0; PK.newHand(r); } else GAME[s.kind].start(r); if (a.type === 'resume') return; }
    let i = seatOf(s, pid);
    if (a.type === 'sit') {
      if (i >= 0) return 'quiet';
      // Jetons kommen vom Konto auf dem Server – was der Browser schickt, zählt nicht
      const acc = BANK && BANK.accOf(pid); if (!acc) return 'Melde dich im Hub mit deinem Konto an, um im Casino zu spielen.';
      const other = BANK.seated.get(acc); if (other && other !== r.id && BANK.roomLive(other, acc)) return 'Du sitzt schon an einem anderen Tisch. Steh dort zuerst auf.';
      const z = BANK.acc(acc); if (!z) return 'Dein Konto wurde nicht gefunden.';
      const free = s.seats.findIndex(x => !x); if (free < 0) return 'Alle Plätze sind besetzt. Du schaust zu.';
      const p = r.players.find(x => x.id === pid); s.seats[free] = newSeat(pid, p ? p.name : 'Gast', z.w, false); s.seats[free].acc = acc; BANK.seated.set(acc, r.id);
      if (s.kind === 'poker') PK.buyIn(s.seats[free]);
      return;
    }
    if (a.type === 'bot') {
      if (r.host !== pid) return 'Nur wer den Tisch eröffnet hat, kann Bots dazuholen.';
      if (a.add) { if (!addBot(s)) return 'Kein Platz mehr frei.'; }
      else { const j = s.seats.map((x, k) => (x && x.bot && !(s.kind === 'poker' && s.phase === 'hand' && x.cards && x.cards.length && !x.folded) ? k : -1)).filter(k => k >= 0).pop(); if (j == null) return 'Gerade kann kein Bot gehen.'; s.seats[j] = null; }
      return;
    }
    if (i < 0) return 'Setz dich zuerst an den Tisch.';
    const x = s.seats[i];
    if (a.type === 'topup') return 'quiet';
    return GAME[s.kind].act(r, x, a, i);
  },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    const i = seatOf(s, pid), x = s.seats[i];
    if (x && x.acc && BANK) BANK.sync(x.acc, x.chips + (x.stack || 0)); // Stand laufend aufs Konto schreiben
    const v = s.phase === 'idle' || s.phase === 'paused' ? { seats: s.seats.map(q => q && { name: q.name, bot: q.bot }) } : GAME[s.kind].view(s, i);
    if (v && Array.isArray(v.seats) && BANK && BANK.isAdmin) v.seats = v.seats.map((q, k) => (q && s.seats[k] && s.seats[k].acc && BANK.isAdmin(s.seats[k].acc) ? { ...q, adm: true } : q)); // Admin-Schild
    return { kind: s.kind, phase: s.phase, left: s.ends ? Math.max(0, s.ends - now()) : null, log: s.log, mySeat: i, host: r.host === pid,
      wallet: x ? x.chips + (x.stack || 0) : null, chips: x ? x.chips : null, free: s.seats.filter(q => !q).length, ...v };
  },
  _test: { BJ, RL, RACE, SLOT, PK, best7, eval5, HAND_NAMES },
};
