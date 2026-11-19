// Inselsiedler – Siedeln, Handeln, Bauen auf einer Sechseck-Insel (2–4 Spieler, weitere schauen zu).
// Eigenes Spiel nach dem bekannten Siedel-Prinzip. Der Server prüft jede Regel, der Browser zeigt nur an.
const RES = ['h', 'l', 'w', 'g', 'e']; // Holz, Lehm, Wolle, Getreide, Erz
const RNAME = { h: 'Holz', l: 'Lehm', w: 'Wolle', g: 'Getreide', e: 'Erz' };
const COST = { road: { h: 1, l: 1 }, settle: { h: 1, l: 1, w: 1, g: 1 }, city: { g: 2, e: 3 }, dev: { w: 1, g: 1, e: 1 } };
const LIMIT = { road: 15, settle: 5, city: 4 };
const DEV = { k: 'Wächter', v: 'Denkmal', r: 'Wegebau', f: 'Glücksfund', m: 'Monopol' };
const DEV_DECK = { k: 14, v: 5, r: 2, f: 2, m: 2 };
const WIN = 10;

const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const d6 = () => 1 + Math.floor(Math.random() * 6);
const sum = o => RES.reduce((n, k) => n + (o[k] || 0), 0);
const zero = () => ({ h: 0, l: 0, w: 0, g: 0, e: 0 });

/* ---------- Feste Geometrie der Insel: 19 Felder, 54 Ecken, 72 Kanten ---------- */
const GEO = (() => {
  const hexes = [];
  for (let r = -2; r <= 2; r++) for (let q = -2; q <= 2; q++) if (Math.abs(q + r) <= 2) hexes.push({ q, r, x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r });
  const vKey = new Map(), verts = [], hexV = [];
  for (const h of hexes) {
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90), x = h.x + Math.cos(a), y = h.y + Math.sin(a);
      const k = Math.round(x * 100) + ',' + Math.round(y * 100);
      if (!vKey.has(k)) { vKey.set(k, verts.length); verts.push({ x, y }); }
      ids.push(vKey.get(k));
    }
    hexV.push(ids);
  }
  const eKey = new Map(), edges = [], eHex = [];
  hexV.forEach((ids, hi) => {
    for (let i = 0; i < 6; i++) {
      const a = ids[i], b = ids[(i + 1) % 6], k = Math.min(a, b) + '-' + Math.max(a, b);
      if (!eKey.has(k)) { eKey.set(k, edges.length); edges.push([Math.min(a, b), Math.max(a, b)]); eHex.push([]); }
      eHex[eKey.get(k)].push(hi);
    }
  });
  const vEdges = verts.map(() => []), vHex = verts.map(() => []), vAdj = verts.map(() => []);
  edges.forEach(([a, b], i) => { vEdges[a].push(i); vEdges[b].push(i); vAdj[a].push(b); vAdj[b].push(a); });
  hexV.forEach((ids, hi) => ids.forEach(v => vHex[v].push(hi)));
  const hexAdj = hexes.map((h, i) => hexes.map((o, j) => j).filter(j => j !== i && hexV[j].filter(v => hexV[i].includes(v)).length === 2));
  // Küstenkanten im Kreis sortieren, 9 davon werden Häfen
  const coast = edges.map((e, i) => i).filter(i => eHex[i].length === 1)
    .map(i => { const [a, b] = edges[i]; return { i, ang: Math.atan2((verts[a].y + verts[b].y) / 2, (verts[a].x + verts[b].x) / 2) }; })
    .sort((a, b) => a.ang - b.ang).map(x => x.i);
  const portEdges = [...Array(9)].map((_, i) => coast[Math.floor(i * coast.length / 9)]);
  return { hexes, verts, edges, hexV, vEdges, vHex, vAdj, hexAdj, portEdges };
})();
const other = (e, v) => (GEO.edges[e][0] === v ? GEO.edges[e][1] : GEO.edges[e][0]);

function makeBoard() {
  const terr = shuffle([...'hhhh', ...'lll', ...'wwww', ...'gggg', ...'eee', 'x']);
  const nums = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  let num;
  for (let tries = 0; tries < 2000; tries++) {
    const n = shuffle(nums); let k = 0;
    num = terr.map(t => (t === 'x' ? 0 : n[k++]));
    if (!num.some((x, i) => (x === 6 || x === 8) && GEO.hexAdj[i].some(j => num[j] === 6 || num[j] === 8))) break;
  }
  const ports = shuffle(['3', '3', '3', '3', 'h', 'l', 'w', 'g', 'e']).map((t, i) => ({ e: GEO.portEdges[i], t }));
  return { terr, num, ports };
}

/* ---------- Hilfen ---------- */
const seatOf = (s, pid) => s.order.indexOf(pid);
const cur = s => s.seats[s.turn];
function log(s, t) { s.log.push(t); if (s.log.length > 40) s.log.shift(); }
function canPay(p, c) { return RES.every(k => (p.res[k] || 0) >= (c[k] || 0)); }
function pay(s, p, c) { for (const k of RES) { p.res[k] -= c[k] || 0; s.bank[k] += c[k] || 0; } }
function rates(s, si) {
  const out = { h: 4, l: 4, w: 4, g: 4, e: 4 };
  for (const pt of s.ports) {
    const [a, b] = GEO.edges[pt.e];
    if (!((s.bld[a] && s.bld[a].p === si) || (s.bld[b] && s.bld[b].p === si))) continue;
    if (pt.t === '3') for (const k of RES) out[k] = Math.min(out[k], 3); else out[pt.t] = 2;
  }
  return out;
}
function distOk(s, v) { return !s.bld[v] && GEO.vAdj[v].every(n => !s.bld[n]); }
function roadOk(s, si, e) {
  if (s.roads[e] != null) return false;
  return GEO.edges[e].some(v => {
    const b = s.bld[v];
    if (b && b.p === si) return true;
    if (b && b.p !== si) return false; // fremde Siedlung unterbricht
    return GEO.vEdges[v].some(x => x !== e && s.roads[x] === si);
  });
}
function settleOk(s, si, v) { return distOk(s, v) && GEO.vEdges[v].some(e => s.roads[e] === si); }
function count(s, si, what) {
  if (what === 'road') return s.roads.filter(x => x === si).length;
  return s.bld.filter(b => b && b.p === si && (what === 'city' ? b.city : !b.city)).length;
}
function legal(s, si) {
  const L = { settle: [], road: [], city: [], robber: [] };
  if (s.phase === 'setup') {
    if (s.setup.step === 'settle') GEO.verts.forEach((_, v) => { if (distOk(s, v)) L.settle.push(v); });
    else GEO.vEdges[s.setup.last].forEach(e => { if (s.roads[e] == null) L.road.push(e); });
    return L;
  }
  if (s.phase === 'robber') { GEO.hexes.forEach((_, h) => { if (h !== s.robber) L.robber.push(h); }); return L; }
  if (s.phase === 'main' || s.phase === 'roads') {
    if (count(s, si, 'road') < LIMIT.road) GEO.edges.forEach((_, e) => { if (roadOk(s, si, e)) L.road.push(e); });
    if (s.phase === 'main') {
      if (count(s, si, 'settle') < LIMIT.settle) GEO.verts.forEach((_, v) => { if (settleOk(s, si, v)) L.settle.push(v); });
      if (count(s, si, 'city') < LIMIT.city) s.bld.forEach((b, v) => { if (b && b.p === si && !b.city) L.city.push(v); });
    }
  }
  return L;
}
function longest(s, si) {
  let best = 0;
  const used = new Set();
  const dfs = (v, len) => {
    if (len > best) best = len;
    const b = s.bld[v];
    if (len > 0 && b && b.p !== si) return;
    for (const e of GEO.vEdges[v]) if (s.roads[e] === si && !used.has(e)) { used.add(e); dfs(other(e, v), len + 1); used.delete(e); }
  };
  const starts = new Set(); s.roads.forEach((x, e) => { if (x === si) GEO.edges[e].forEach(v => starts.add(v)); });
  for (const v of starts) dfs(v, 0);
  return best;
}
function updateRoad(r) {
  const s = r.state;
  s.seats.forEach((p, i) => { p.roadLen = p.gone ? 0 : longest(s, i); });
  const h = s.lr, hl = h != null ? s.seats[h].roadLen : 0;
  const max = Math.max(...s.seats.map(p => p.roadLen));
  if (h != null && hl >= 5 && hl === max) return; // Inhaber behält bei Gleichstand
  const top = s.seats.map((p, i) => i).filter(i => s.seats[i].roadLen === max);
  const nu = max >= 5 && top.length === 1 ? top[0] : null;
  if (nu !== h) { s.lr = nu; if (nu != null) log(s, `🛣️ ${nameOf(r, s.order[nu])} hat jetzt die längste Handelsstraße (${max}).`); else if (h != null) log(s, '🛣️ Niemand hat mehr die längste Handelsstraße.'); }
}
function points(s, si, hidden) {
  const p = s.seats[si];
  let n = s.bld.reduce((a, b) => a + (b && b.p === si ? (b.city ? 2 : 1) : 0), 0);
  if (s.lr === si) n += 2;
  if (s.la === si) n += 2;
  if (hidden) n += p.dev.filter(d => d.k === 'v').length;
  return n;
}
function checkWin(r) {
  const s = r.state, si = s.turn;
  if (s.phase === 'setup' || s.phase === 'ended') return;
  const n = points(s, si, true);
  if (n >= WIN) { s.phase = 'ended'; s.winner = si; r.status = 'ended'; log(s, `🏆 ${nameOf(r, s.order[si])} gewinnt mit ${n} Punkten!`); }
}
function active(s) { return s.seats.map((p, i) => i).filter(i => !s.seats[i].gone); }
function nextTurn(r) {
  const s = r.state;
  s.offer = null; s.devPlayed = false;
  let t = s.turn;
  do t = (t + 1) % s.seats.length; while (s.seats[t].gone && t !== s.turn);
  s.turn = t; s.turnNo++; s.phase = 'roll';
  log(s, `${nameOf(r, s.order[t])} ist dran.`);
  checkWin(r); // z. B. längste Straße im fremden Zug erhalten: Sieg zählt erst im eigenen Zug
}
function produce(r, roll) {
  const s = r.state, want = s.seats.map(() => zero());
  GEO.hexes.forEach((_, h) => {
    if (s.num[h] !== roll || h === s.robber) return;
    for (const v of GEO.hexV[h]) { const b = s.bld[v]; if (b && !s.seats[b.p].gone) want[b.p][s.terr[h]] += b.city ? 2 : 1; }
  });
  for (const k of RES) {
    const who = want.map((w, i) => i).filter(i => want[i][k] > 0), tot = who.reduce((a, i) => a + want[i][k], 0);
    if (!who.length) continue;
    if (tot > s.bank[k] && who.length > 1) { log(s, `Die Bank hat nicht genug ${RNAME[k]} – niemand bekommt welches.`); continue; }
    for (const i of who) { const n = Math.min(want[i][k], s.bank[k]); s.bank[k] -= n; s.seats[i].res[k] += n; }
  }
  const got = want.map((w, i) => (sum(w) && !s.seats[i].gone ? `${nameOf(r, s.order[i])}: ${RES.filter(k => w[k]).map(k => w[k] + ' ' + RNAME[k]).join(', ')}` : '')).filter(Boolean);
  if (got.length) log(s, '📦 ' + got.join(' · '));
}
function stealFrom(r, si) {
  const s = r.state, me = cur(s), p = s.seats[si];
  const pool = RES.flatMap(k => Array(p.res[k]).fill(k));
  if (!pool.length) { log(s, `${nameOf(r, s.order[si])} hat keine Karten.`); return; }
  const k = pool[Math.floor(Math.random() * pool.length)];
  p.res[k]--; me.res[k]++;
  s.stolen = { by: s.turn, from: si, k, id: (s.stolen ? s.stolen.id : 0) + 1 };
  log(s, `🦹 ${nameOf(r, s.order[s.turn])} zieht eine Karte von ${nameOf(r, s.order[si])}.`);
}
function victims(s, h) {
  const out = new Set();
  for (const v of GEO.hexV[h]) { const b = s.bld[v]; if (b && b.p !== s.turn && !s.seats[b.p].gone && sum(s.seats[b.p].res) > 0) out.add(b.p); }
  return [...out];
}
function afterRobber(r) {
  const s = r.state, vic = victims(s, s.robber);
  if (vic.length > 1) { s.phase = 'steal'; s.victims = vic; return; }
  if (vic.length === 1) stealFrom(r, vic[0]);
  s.phase = s.after || 'main'; s.after = null;
}
function readRes(o, max = 99) {
  const out = zero();
  if (!o || typeof o !== 'object') return out;
  for (const k of RES) { const n = Math.floor(Number(o[k]) || 0); out[k] = Math.max(0, Math.min(max, n)); }
  return out;
}
function setupNext(r) {
  const s = r.state;
  s.setup.i++; s.setup.step = 'settle'; s.setup.last = null;
  while (s.setup.i < s.setup.seq.length && s.seats[s.setup.seq[s.setup.i]].gone) s.setup.i++;
  if (s.setup.i >= s.setup.seq.length) {
    s.turn = active(s)[0]; s.phase = 'roll'; s.turnNo = 1;
    log(s, `Die Insel ist besiedelt! ${nameOf(r, s.order[s.turn])} würfelt zuerst.`);
    return;
  }
  s.turn = s.setup.seq[s.setup.i];
}

/* ---------- Spielzüge ---------- */
function build(r, si, a) {
  const s = r.state, p = s.seats[si], what = a.what, at = Math.floor(Number(a.at));
  if (s.phase === 'setup') {
    if (what !== s.setup.step) return s.setup.step === 'settle' ? 'Setze zuerst eine Siedlung.' : 'Setze jetzt eine Straße an deine neue Siedlung.';
    if (what === 'settle') {
      if (!(at >= 0 && at < GEO.verts.length) || !distOk(s, at)) return 'Hier geht keine Siedlung (Abstandsregel: eine Ecke frei lassen).';
      s.bld[at] = { p: si, city: false }; s.setup.last = at; s.setup.step = 'road'; s.last = { v: at };
      if (s.setup.i >= s.setup.seq.length / 2) { // zweite Siedlung: Startrohstoffe
        const got = [];
        for (const h of GEO.vHex[at]) { const k = s.terr[h]; if (k !== 'x' && s.bank[k] > 0) { s.bank[k]--; p.res[k]++; got.push(RNAME[k]); } }
        log(s, `🏠 ${nameOf(r, s.order[si])} baut die zweite Siedlung${got.length ? ' und bekommt ' + got.join(', ') : ''}.`);
      } else log(s, `🏠 ${nameOf(r, s.order[si])} baut eine Siedlung.`);
      return;
    }
    if (what === 'road') {
      if (!(at >= 0 && at < GEO.edges.length) || s.roads[at] != null || !GEO.edges[at].includes(s.setup.last)) return 'Die Straße muss an deiner neuen Siedlung liegen.';
      s.roads[at] = si; s.last = { e: at };
      setupNext(r); updateRoad(r); return;
    }
    return 'quiet';
  }
  if (s.phase === 'roads') {
    if (what !== 'road') return 'Setze zuerst deine freien Straßen.';
    if (!(at >= 0 && at < GEO.edges.length) || !roadOk(s, si, at)) return 'Hier kannst du keine Straße bauen.';
    if (count(s, si, 'road') >= LIMIT.road) return 'Du hast keine Straßen mehr übrig.';
    s.roads[at] = si; s.last = { e: at }; s.freeRoads--;
    log(s, `🛣️ ${nameOf(r, s.order[si])} baut eine Straße (Wegebau).`);
    updateRoad(r);
    if (s.freeRoads <= 0 || !legal(s, si).road.length) { s.phase = s.after || 'main'; s.after = null; }
    return;
  }
  if (s.phase !== 'main') return s.phase === 'roll' ? 'Würfle zuerst.' : 'Gerade kannst du nicht bauen.';
  if (!COST[what] || what === 'dev') return 'quiet';
  if (!canPay(p, COST[what])) return 'Dafür fehlen dir Rohstoffe.';
  if (count(s, si, what) >= LIMIT[what]) return `Du hast keine ${what === 'road' ? 'Straßen' : what === 'settle' ? 'Siedlungen' : 'Städte'} mehr übrig.`;
  if (what === 'road') {
    if (!(at >= 0 && at < GEO.edges.length) || !roadOk(s, si, at)) return 'Straßen müssen an deine Straßen oder Siedlungen anschließen.';
    pay(s, p, COST.road); s.roads[at] = si; s.last = { e: at };
    log(s, `🛣️ ${nameOf(r, s.order[si])} baut eine Straße.`);
  } else if (what === 'settle') {
    if (!(at >= 0 && at < GEO.verts.length) || !settleOk(s, si, at)) return 'Siedlungen brauchen eine eigene Straße und eine freie Ecke Abstand.';
    pay(s, p, COST.settle); s.bld[at] = { p: si, city: false }; s.last = { v: at };
    log(s, `🏠 ${nameOf(r, s.order[si])} baut eine Siedlung.`);
  } else if (what === 'city') {
    const b = s.bld[at];
    if (!b || b.p !== si || b.city) return 'Eine Stadt baust du auf eine eigene Siedlung.';
    pay(s, p, COST.city); b.city = true; s.last = { v: at };
    log(s, `🏰 ${nameOf(r, s.order[si])} baut eine Stadt.`);
  }
  updateRoad(r); checkWin(r);
}

function playDev(r, si, a) {
  const s = r.state, p = s.seats[si], k = String(a.k);
  if (!DEV[k] || k === 'v') return 'quiet';
  if (s.phase !== 'main' && !(k === 'k' && s.phase === 'roll')) return s.phase === 'roll' ? 'Vor dem Würfeln kannst du nur einen Wächter ausspielen.' : 'Gerade kannst du keine Karte ausspielen.';
  if (s.devPlayed) return 'Du hast in diesem Zug schon eine Entwicklungskarte ausgespielt.';
  const i = p.dev.findIndex(d => d.k === k && d.t < s.turnNo);
  if (i < 0) return p.dev.some(d => d.k === k) ? 'Neu gekaufte Karten kannst du erst im nächsten Zug ausspielen.' : 'Diese Karte hast du nicht.';
  if (k === 'f') {
    const x = String(a.a), y = String(a.b);
    if (!RES.includes(x) || !RES.includes(y)) return 'Wähle zwei Rohstoffe.';
    if (s.bank[x] < 1 || s.bank[y] < 1 || (x === y && s.bank[x] < 2)) return 'Die Bank hat davon nicht genug.';
    s.bank[x]--; s.bank[y]--; p.res[x]++; p.res[y]++;
    log(s, `🎁 ${nameOf(r, s.order[si])} spielt Glücksfund: ${RNAME[x]} und ${RNAME[y]}.`);
  } else if (k === 'm') {
    const x = String(a.a); if (!RES.includes(x)) return 'Wähle einen Rohstoff.';
    let n = 0; s.seats.forEach((o, j) => { if (j !== si) { n += o.res[x]; p.res[x] += o.res[x]; o.res[x] = 0; } });
    log(s, `💰 ${nameOf(r, s.order[si])} spielt Monopol auf ${RNAME[x]} und bekommt ${n} Karten.`);
  } else if (k === 'r') {
    s.freeRoads = Math.min(2, LIMIT.road - count(s, si, 'road'));
    log(s, `🛠️ ${nameOf(r, s.order[si])} spielt Wegebau.`);
  } else if (k === 'k') {
    p.knights++;
    log(s, `🛡️ ${nameOf(r, s.order[si])} spielt einen Wächter.`);
    if (p.knights >= 3 && s.la !== si && (s.la == null || p.knights > s.seats[s.la].knights)) { s.la = si; log(s, `🛡️ ${nameOf(r, s.order[si])} hat jetzt die größte Wache.`); }
  }
  p.dev.splice(i, 1); s.devPlayed = true;
  if (k === 'k') { s.after = s.phase; s.phase = 'robber'; }
  if (k === 'r') { if (s.freeRoads > 0 && legal({ ...s, phase: 'roads' }, si).road.length) { s.after = 'main'; s.phase = 'roads'; } }
  checkWin(r);
}

module.exports = {
  title: 'Inselsiedler', min: 2, seats: 4,
  start(r) {
    const order = shuffle(r.players.map(p => p.id)).slice(0, 4), n = order.length;
    const b = makeBoard(), desert = b.terr.indexOf('x');
    r.state = {
      order, terr: b.terr, num: b.num, ports: b.ports, robber: desert,
      bld: GEO.verts.map(() => null), roads: GEO.edges.map(() => null),
      seats: order.map(() => ({ res: zero(), dev: [], knights: 0, roadLen: 0, gone: false })),
      bank: { h: 19, l: 19, w: 19, g: 19, e: 19 },
      deck: shuffle(Object.entries(DEV_DECK).flatMap(([k, c]) => Array(c).fill(k))),
      turn: 0, turnNo: 0, phase: 'setup', setup: { seq: [...Array(n).keys(), ...[...Array(n).keys()].reverse()], i: 0, step: 'settle', last: null },
      dice: null, rollId: 0, discard: null, victims: null, after: null, offer: null, offerId: 0, devPlayed: false, freeRoads: 0,
      lr: null, la: null, winner: null, last: null, stolen: null, log: [],
    };
    log(r.state, `Die Insel ist entdeckt! ${nameOf(r, order[0])} setzt die erste Siedlung.`);
    r.status = 'playing';
  },
  onLeave(r, pid, name) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    const si = seatOf(s, pid); if (si < 0 || s.seats[si].gone) return;
    const p = s.seats[si];
    p.gone = true;
    for (const k of RES) { s.bank[k] += p.res[k]; p.res[k] = 0; }
    s.deck.push(...p.dev.map(d => d.k)); s.deck = shuffle(s.deck); p.dev = [];
    if (s.la === si) s.la = null;
    log(s, `🚪 ${name} hat das Spiel verlassen. Die Bauten bleiben stehen, der Platz wird übersprungen.`);
    const left = active(s);
    if (left.length < 2) {
      s.phase = 'ended'; r.status = 'ended'; s.winner = left.length ? left[0] : null;
      log(s, left.length ? `🏆 ${nameOf(r, s.order[left[0]])} bleibt als Letzte(r) übrig und gewinnt.` : 'Spiel beendet.');
      return;
    }
    updateRoad(r);
    if (s.offer) { delete s.offer.resp[si]; if (s.offer.from === si) s.offer = null; }
    if (s.discard) { delete s.discard[si]; if (!Object.keys(s.discard).length) { s.discard = null; s.phase = 'robber'; } }
    if (s.victims) { s.victims = s.victims.filter(x => x !== si); }
    if (s.phase === 'steal' && s.turn !== si) { if (s.victims.length === 1) stealFrom(r, s.victims[0]); if (s.victims.length <= 1) { s.victims = null; s.phase = s.after || 'main'; s.after = null; } }
    if (s.turn === si) {
      s.discard = null; s.victims = null; s.after = null;
      if (s.phase === 'setup') {
        // Halb gebaute Startrunde aufräumen
        if (s.setup.step === 'road' && s.setup.last != null) { s.bld[s.setup.last] = null; }
        setupNext(r);
      } else nextTurn(r);
    }
  },
  act(r, pid, a) {
    const s = r.state;
    if (!s || r.status !== 'playing') return;
    if (a.type === 'stop') { if (r.host !== pid) return; r.status = 'ended'; s.phase = 'ended'; log(s, 'Spiel beendet.'); return; }
    const si = seatOf(s, pid);
    if (si < 0 || s.seats[si].gone) return 'Du schaust bei diesem Spiel zu.';
    const p = s.seats[si], mine = s.turn === si;

    if (a.type === 'discard') {
      if (s.phase !== 'discard' || !s.discard || !s.discard[si]) return 'Du musst gerade nichts abwerfen.';
      const d = readRes(a.res);
      if (sum(d) !== s.discard[si]) return `Wirf genau ${s.discard[si]} Karten ab.`;
      if (!canPay(p, d)) return 'So viele Karten hast du nicht.';
      pay(s, p, d); delete s.discard[si];
      log(s, `${nameOf(r, pid)} wirft ${sum(d)} Karten ab.`);
      if (!Object.keys(s.discard).length) { s.discard = null; s.phase = 'robber'; }
      return;
    }
    if (a.type === 'respond') {
      const o = s.offer;
      if (!o || o.id !== Number(a.id) || o.from === si) return 'Dieses Angebot gibt es nicht mehr.';
      if (a.ok && !canPay(p, o.want)) return 'Dafür hast du nicht genug Karten.';
      o.resp[si] = a.ok ? 'ja' : 'nein';
      return;
    }
    if (!mine) return 'Du bist gerade nicht dran.';

    switch (a.type) {
      case 'build': return build(r, si, a);
      case 'roll': {
        if (s.phase !== 'roll') return 'quiet';
        const d = [d6(), d6()], n = d[0] + d[1];
        s.dice = d; s.rollId++;
        log(s, `🎲 ${nameOf(r, pid)} würfelt ${n}.`);
        if (n === 7) {
          const disc = {};
          s.seats.forEach((o, i) => { const c = sum(o.res); if (!o.gone && c > 7) disc[i] = Math.floor(c / 2); });
          s.after = 'main';
          if (Object.keys(disc).length) { s.discard = disc; s.phase = 'discard'; log(s, 'Wer mehr als 7 Karten hat, wirft die Hälfte ab.'); }
          else s.phase = 'robber';
        } else { produce(r, n); s.phase = 'main'; }
        return;
      }
      case 'robber': {
        if (s.phase !== 'robber') return 'quiet';
        const h = Math.floor(Number(a.h));
        if (!(h >= 0 && h < GEO.hexes.length) || h === s.robber) return 'Der Räuber muss auf ein anderes Feld.';
        s.robber = h; s.last = { h };
        log(s, `🦹 ${nameOf(r, pid)} versetzt den Räuber.`);
        afterRobber(r);
        return;
      }
      case 'steal': {
        if (s.phase !== 'steal') return 'quiet';
        const t = Math.floor(Number(a.seat));
        if (!s.victims.includes(t)) return 'Von diesem Spieler kannst du nicht ziehen.';
        stealFrom(r, t); s.victims = null; s.phase = s.after || 'main'; s.after = null;
        return;
      }
      case 'buyDev': {
        if (s.phase !== 'main') return s.phase === 'roll' ? 'Würfle zuerst.' : 'Gerade nicht.';
        if (!s.deck.length) return 'Der Stapel mit Entwicklungskarten ist leer.';
        if (!canPay(p, COST.dev)) return 'Dafür fehlen dir Rohstoffe (Wolle, Getreide, Erz).';
        pay(s, p, COST.dev); const k = s.deck.pop(); p.dev.push({ k, t: s.turnNo });
        log(s, `📜 ${nameOf(r, pid)} kauft eine Entwicklungskarte.`);
        checkWin(r); return;
      }
      case 'play': return playDev(r, si, a);
      case 'endRoads': { if (s.phase !== 'roads') return 'quiet'; s.phase = s.after || 'main'; s.after = null; return; }
      case 'bank': {
        if (s.phase !== 'main') return s.phase === 'roll' ? 'Würfle zuerst.' : 'Gerade nicht.';
        const g = String(a.give), w = String(a.get);
        if (!RES.includes(g) || !RES.includes(w) || g === w) return 'Wähle zwei verschiedene Rohstoffe.';
        const rt = rates(s, si)[g];
        if (p.res[g] < rt) return `Du brauchst ${rt} ${RNAME[g]}.`;
        if (s.bank[w] < 1) return `Die Bank hat kein ${RNAME[w]} mehr.`;
        p.res[g] -= rt; s.bank[g] += rt; p.res[w]++; s.bank[w]--;
        log(s, `🏦 ${nameOf(r, pid)} tauscht ${rt} ${RNAME[g]} gegen 1 ${RNAME[w]}.`);
        return;
      }
      case 'offer': {
        if (s.phase !== 'main') return s.phase === 'roll' ? 'Würfle zuerst.' : 'Gerade nicht.';
        const give = readRes(a.give, 19), want = readRes(a.want, 19);
        if (!sum(give) || !sum(want)) return 'Ein Angebot braucht etwas zum Geben und etwas zum Bekommen.';
        if (RES.some(k => give[k] && want[k])) return 'Denselben Rohstoff kannst du nicht geben und wollen.';
        if (!canPay(p, give)) return 'So viele Karten hast du nicht.';
        s.offer = { from: si, give, want, resp: {}, id: ++s.offerId };
        log(s, `🤝 ${nameOf(r, pid)} bietet ${RES.filter(k => give[k]).map(k => give[k] + ' ' + RNAME[k]).join(', ')} für ${RES.filter(k => want[k]).map(k => want[k] + ' ' + RNAME[k]).join(', ')}.`);
        return;
      }
      case 'offerCancel': s.offer = null; return;
      case 'confirm': {
        const o = s.offer, t = Math.floor(Number(a.seat));
        if (!o || o.id !== Number(a.id)) return 'Dieses Angebot gibt es nicht mehr.';
        if (o.resp[t] !== 'ja' || !s.seats[t] || s.seats[t].gone) return 'Dieser Spieler hat nicht angenommen.';
        const q = s.seats[t];
        if (!canPay(p, o.give)) return 'Du hast nicht mehr genug Karten für dein Angebot.';
        if (!canPay(q, o.want)) { o.resp[t] = 'nein'; return `${nameOf(r, s.order[t])} hat nicht mehr genug Karten.`; }
        for (const k of RES) { p.res[k] += o.want[k] - o.give[k]; q.res[k] += o.give[k] - o.want[k]; }
        log(s, `🤝 ${nameOf(r, pid)} handelt mit ${nameOf(r, s.order[t])}.`);
        s.offer = null; return;
      }
      case 'next': {
        if (s.phase === 'roll') return 'Würfle zuerst.';
        if (s.phase !== 'main') return 'Beende zuerst deine Aktion.';
        nextTurn(r); return;
      }
    }
    return 'quiet';
  },
  view(r, pid) {
    const s = r.state;
    if (!s) return null;
    const si = seatOf(s, pid), ended = s.phase === 'ended';
    const me = si >= 0 ? s.seats[si] : null;
    const myTurn = si >= 0 && s.turn === si && !ended;
    return {
      geo: { hexes: GEO.hexes.map(h => [+h.x.toFixed(3), +h.y.toFixed(3)]), verts: GEO.verts.map(v => [+v.x.toFixed(3), +v.y.toFixed(3)]), edges: GEO.edges },
      terr: s.terr, num: s.num, ports: s.ports, robber: s.robber, bld: s.bld, roads: s.roads,
      order: s.order, turn: s.turn, phase: s.phase, setupStep: s.phase === 'setup' ? s.setup.step : null,
      dice: s.dice, rollId: s.rollId, bank: s.bank, deck: s.deck.length, lr: s.lr, la: s.la, winner: s.winner, last: s.last,
      seats: s.seats.map((p, i) => ({
        id: s.order[i], cards: sum(p.res), devs: p.dev.length, knights: p.knights, roadLen: p.roadLen, gone: p.gone,
        vp: points(s, i, ended || i === si), left: { road: LIMIT.road - count(s, i, 'road'), settle: LIMIT.settle - count(s, i, 'settle'), city: LIMIT.city - count(s, i, 'city') },
        dev: ended && i !== si ? p.dev.map(d => d.k) : undefined,
      })),
      mine: si, res: me ? me.res : null,
      dev: me ? me.dev.map(d => ({ k: d.k, fresh: d.t >= s.turnNo })) : [],
      rates: me ? rates(s, si) : null,
      legal: myTurn ? legal(s, si) : null,
      discard: s.discard, victims: s.phase === 'steal' ? s.victims : null, freeRoads: s.phase === 'roads' ? s.freeRoads : 0,
      offer: s.offer, devPlayed: s.devPlayed,
      stolen: s.stolen && (s.stolen.by === si || s.stolen.from === si) ? s.stolen : (s.stolen ? { id: s.stolen.id, by: s.stolen.by, from: s.stolen.from } : null),
      log: s.log.slice(-14), cost: COST, devNames: DEV, win: WIN,
    };
  },
  _test: { GEO, longest, legal, points, rates },
};
