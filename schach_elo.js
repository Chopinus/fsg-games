// Schach-Elo mit Saisons (Spieler-Idee v63). Läuft im Server (konten.js), gespeichert im Konto unter acc.chess.
// Saison = Kalendermonat. Zum Saisonwechsel wird die Wertung zur Hälfte Richtung 1200 zurückgesetzt
// (die neue Saison startet also mit einer Wertung, die auf der alten aufbaut), und die Endplatzierung der alten Saison wird gemerkt.
const START = 1200;
const seasonId = (t = Date.now()) => { const d = new Date(t + 3600e3); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const seasonName = id => { const [y, m] = String(id).split('-'); return `${MONTHS[(Number(m) || 1) - 1]} ${y}`; };

module.exports = function makeChessElo(getAccounts, markDirty, isTester) {
  // Endwertung einer vergangenen Saison: aus der Historie (schon gewechselt) oder aus dem aktuellen Stand (noch nicht gewechselt)
  const finalOf = (a, sid) => { const c = a && a.chess; if (!c) return null; if (c.s === sid) return c.sn > 0 ? c.r : null; const h = (c.hist || []).find(x => x.s === sid); return h && h.n > 0 ? h.r : null; };
  function rankIn(sid, r) { let n = 1; for (const [k, a] of Object.entries(getAccounts())) { if (isTester(k)) continue; const f = finalOf(a, sid); if (f != null && f > r) n++; } return n; }
  // Konto auf die aktuelle Saison bringen (beim ersten Zugriff im neuen Monat)
  function roll(a) {
    const cur = seasonId();
    if (!a.chess) a.chess = { r: START, n: 0, sn: 0, w: 0, l: 0, d: 0, peak: START, s: cur, hist: [] };
    const c = a.chess; if (c.s === cur) return c;
    if (c.sn > 0) { c.hist = (c.hist || []).concat({ s: c.s, r: c.r, n: c.sn, rank: rankIn(c.s, c.r) }).slice(-24); }
    c.r = Math.round(START + (c.r - START) * 0.5); c.s = cur; c.sn = 0; markDirty();
    return c;
  }
  const kOf = c => (c.n < 15 ? 40 : c.r >= 2000 ? 16 : 24); // neue Spieler bewegen sich schneller
  function result(kW, kB, scoreW) {
    const A = getAccounts(), aW = A[kW], aB = A[kB]; if (!aW || !aB) return null;
    const W = roll(aW), B = roll(aB), eW = 1 / (1 + Math.pow(10, (B.r - W.r) / 400));
    const dW = Math.round(kOf(W) * (scoreW - eW)), dB = Math.round(kOf(B) * ((1 - scoreW) - (1 - eW)));
    const out = { w: { old: W.r, new: W.r + dW }, b: { old: B.r, new: B.r + dB } };
    for (const [c, d, sc] of [[W, dW, scoreW], [B, dB, 1 - scoreW]]) { c.r += d; c.n++; c.sn++; c.peak = Math.max(c.peak || START, c.r); if (sc === 1) c.w++; else if (sc === 0) c.l++; else c.d++; }
    topC = null; markDirty();
    return out;
  }
  const rating = k => { const a = getAccounts()[k]; return a ? roll(a).r : null; };
  let topC = null, topAt = 0;
  function top() {
    if (topC && Date.now() - topAt < 30000) return topC;
    const cur = seasonId(), L = [];
    for (const [k, a] of Object.entries(getAccounts())) { if (!a || !a.chess || isTester(k)) continue; const c = roll(a); if (c.sn > 0) L.push({ name: a.name, r: c.r, n: c.sn }); }
    L.sort((x, y) => y.r - x.r || y.n - x.n); topAt = Date.now();
    return (topC = { season: cur, seasonName: seasonName(cur), list: L.slice(0, 20) });
  }
  function mine(k) {
    const a = getAccounts()[k]; if (!a) return null; const c = roll(a);
    return { r: c.r, n: c.n, sn: c.sn, w: c.w, l: c.l, d: c.d, peak: c.peak, hist: (c.hist || []).slice(-6).map(h => ({ ...h, name: seasonName(h.s) })) };
  }
  return { result, rating, top, mine, seasonId, seasonName };
};
