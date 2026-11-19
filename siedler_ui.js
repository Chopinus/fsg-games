'use strict';
// Inselsiedler – Browser-Seite. Nutzt die Helfer aus app.js (room, act, esc, nameOf, isHost, againHTML, dieHTML, toast).
(function () {
  const RES = ['h', 'l', 'w', 'g', 'e'];
  const RN = { h: 'Holz', l: 'Lehm', w: 'Wolle', g: 'Getreide', e: 'Erz' };
  const RI = { h: '🌲', l: '🧱', w: '🐑', g: '🌾', e: '⛰️', x: '🏜️' };
  const TF = { h: '#2f7d3a', l: '#c4622d', w: '#93c95a', g: '#e5bf3c', e: '#8b8f9e', x: '#dcc79a' };
  const PC = ['#e5484d', '#3b7ad6', '#f4ede1', '#f28c28'];
  const PCN = ['Rot', 'Blau', 'Weiß', 'Orange'];
  const S = 50;
  const U = { mode: null, key: '', give: {}, want: {}, bg: null, bw: null, disc: {}, dev: null, da: null, db: null, rollId: -1, stolen: 0, tab: 'bau' };

  // Stile direkt hier, damit style.css unverändert bleibt
  const css = document.createElement('style');
  css.textContent = `
.sb{width:100%;max-width:1100px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,1fr);gap:14px;align-items:start;text-align:left}
@media (max-width:820px){.sb{grid-template-columns:1fr}}
.sb-top{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.sb-pl{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:6px 10px;font-size:14px}
.sb-pl.turn{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset}
.sb-pl.gone{opacity:.45;text-decoration:line-through}
.sb-pl .dot{width:14px;height:14px;border-radius:50%;border:2px solid #0006;flex:none}
.sb-pl .vp{font-weight:800;color:var(--accent)}
.sb-pl small{color:var(--muted)}
.sb-board{position:relative;width:100%}
.sb-board svg{width:100%;height:auto;max-height:min(72vh,640px);display:block;margin:0 auto;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.sb-side{display:flex;flex-direction:column;gap:10px;min-width:0}
.sb-box{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px}
.sb-box h3{margin:0;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.sb-status{font-family:var(--display);font-size:clamp(16px,2.6vw,21px);margin:0;text-wrap:balance}
.sb-status.mine{color:var(--accent)}
.sb-dice{display:flex;gap:8px;align-items:center}
.sb-dice .die{width:44px;height:44px;padding:6px;border-radius:9px}
.sb-dice .die.roll{animation:sbroll .5s ease-out}
@keyframes sbroll{0%{transform:rotate(-200deg) scale(.6)}100%{transform:none}}
.sb-hand{display:flex;gap:6px;flex-wrap:wrap}
.sb-card{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:52px;padding:6px 4px;border-radius:10px;background:var(--surface2);border:1px solid var(--line);font-size:12px;line-height:1.1}
.sb-card b{font-size:20px}
.sb-card .ic{font-size:20px}
.sb-card.zero{opacity:.4}
button.sb-card{color:inherit;font:inherit;font-size:12px}
button.sb-card:disabled{opacity:.35;cursor:default}
.sb-step .c button:disabled{opacity:.35}
@media (min-width:821px){.sb-board{position:sticky;top:8px}}
button.sb-card.sel{outline:3px solid var(--accent);outline-offset:1px}
.sb-acts{display:flex;gap:6px;flex-wrap:wrap}
.sb-acts .btn{flex:1 1 auto}
.sb-acts .btn.on{outline:3px solid #fff;outline-offset:2px}
.sb-cost{display:block;font-size:11px;font-weight:600;opacity:.8;letter-spacing:.05em}
.sb-step{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
.sb-step .c{display:flex;flex-direction:column;align-items:center;gap:2px;background:var(--surface2);border-radius:10px;padding:4px 2px}
.sb-step .c button{border:0;background:var(--line);border-radius:8px;width:100%;min-height:30px;font-weight:800}
.sb-step .c b{font-size:16px}
.sb-offer{border:1px solid var(--accent);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.sb-log{font-size:13px;color:var(--muted);max-height:180px;overflow:auto;display:flex;flex-direction:column;gap:2px}
.sb-log p{margin:0}
.sb-log p:last-child{color:var(--fg)}
.sb-dev{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--surface2);border-radius:10px;padding:6px 8px;font-size:14px}
.sb-tabs{display:flex;gap:4px}
.sb-tabs button{flex:1;border:1px solid var(--line);background:transparent;border-radius:9px;padding:7px 4px;font-weight:700;font-size:14px}
.sb-tabs button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.sb-hot{fill:#fff;fill-opacity:.85;stroke:var(--accent);stroke-width:3;animation:sbpulse 1s ease-in-out infinite;cursor:pointer}
.sb-hit{fill:transparent;cursor:pointer}
.sb-ehot{stroke:#fff;stroke-opacity:.7;stroke-width:7;stroke-linecap:round;animation:sbpulse 1s ease-in-out infinite;pointer-events:none}
.sb-ehit{stroke:transparent;stroke-width:22;cursor:pointer}
.sb-hhot{fill:#fff;fill-opacity:.18;stroke:var(--accent);stroke-width:3;cursor:pointer;animation:sbpulse 1s ease-in-out infinite}
@keyframes sbpulse{50%{opacity:.45}}
.sb-mini{font-size:12px;color:var(--muted)}
`;
  document.head.appendChild(css);

  const me = () => room.me;
  const pn = (v, i) => esc(nameOf(v.order[i]));
  const dot = i => `<span class="dot" style="background:${PC[i]}"></span>`;
  const costHTML = c => Object.entries(c).map(([k, n]) => RI[k].repeat(n)).join('');
  const canPay = (res, c) => res && Object.entries(c).every(([k, n]) => (res[k] || 0) >= n);
  const total = o => RES.reduce((a, k) => a + (o[k] || 0), 0);
  const resList = o => RES.filter(k => o[k]).map(k => `${o[k]} ${RI[k]}`).join(' ');

  function hexPts(x, y, r) { return [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 90); return (x + r * Math.cos(a)).toFixed(1) + ',' + (y + r * Math.sin(a)).toFixed(1); }).join(' '); }
  function house(x, y, c, city) {
    if (city) return `<path d="M${x - 14} ${y + 10}V${y - 2}l7-7 7 7V${y - 4}h14v14z" fill="${c}" stroke="#15121c" stroke-width="2.5" stroke-linejoin="round"/>`;
    return `<path d="M${x - 9} ${y + 8}V${y - 2}l9-8 9 8v10z" fill="${c}" stroke="#15121c" stroke-width="2.5" stroke-linejoin="round"/>`;
  }

  function boardSVG(v, mode) {
    const G = v.geo, H = G.hexes.map(([x, y]) => [x * S, y * S]), V = G.verts.map(([x, y]) => [x * S, y * S]);
    const L = v.legal || {};
    let o = `<svg viewBox="-268 -250 536 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spielbrett">`;
    o += `<polygon points="${hexPts(0, 0, 5.25 * S)}" transform="rotate(30)" fill="#1f5f86" stroke="#17496a" stroke-width="6"/>`;
    // Häfen
    for (const p of v.ports) {
      const [a, b] = G.edges[p.e], mx = (V[a][0] + V[b][0]) / 2, my = (V[a][1] + V[b][1]) / 2, d = Math.hypot(mx, my), px = mx / d * (d + 30), py = my / d * (d + 30);
      o += `<line x1="${V[a][0]}" y1="${V[a][1]}" x2="${px}" y2="${py}" stroke="#d9c39a" stroke-width="4"/><line x1="${V[b][0]}" y1="${V[b][1]}" x2="${px}" y2="${py}" stroke="#d9c39a" stroke-width="4"/>`;
      o += `<circle cx="${px}" cy="${py}" r="17" fill="#f4ede1" stroke="#17496a" stroke-width="2"/>`;
      o += p.t === '3' ? `<text x="${px}" y="${py + 5}" text-anchor="middle" font-size="13" font-weight="800" fill="#15121c">3:1</text>`
        : `<text x="${px}" y="${py - 1}" text-anchor="middle" font-size="13">${RI[p.t]}</text><text x="${px}" y="${py + 12}" text-anchor="middle" font-size="10" font-weight="800" fill="#15121c">2:1</text>`;
    }
    // Felder
    H.forEach(([x, y], i) => {
      const t = v.terr[i], n = v.num[i];
      o += `<polygon points="${hexPts(x, y, S - 1.5)}" fill="${TF[t]}" stroke="#f1e2bf" stroke-width="3"/>`;
      o += `<text x="${x}" y="${y - 18}" text-anchor="middle" font-size="18">${RI[t]}</text>`;
      if (n) {
        const hot = n === 6 || n === 8, pips = 6 - Math.abs(7 - n);
        o += `<circle cx="${x}" cy="${y + 8}" r="15" fill="#fbf5e8" stroke="#15121c" stroke-opacity=".4"/><text x="${x}" y="${y + 13}" text-anchor="middle" font-size="15" font-weight="800" fill="${hot ? '#c8242a' : '#15121c'}">${n}</text>`;
        o += [...Array(pips)].map((_, k) => `<circle cx="${x + (k - (pips - 1) / 2) * 4}" cy="${y + 18}" r="1.4" fill="${hot ? '#c8242a' : '#15121c'}"/>`).join('');
      }
      if (v.last && v.last.h === i) o += `<polygon points="${hexPts(x, y, S - 5)}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 4"/>`;
    });
    // Räuber
    { const [x, y] = H[v.robber]; o += `<g transform="translate(${x + 20},${y + 2})"><ellipse cx="0" cy="14" rx="9" ry="3.5" fill="#0007"/><path d="M-7 13c0-9 3-13 7-13s7 4 7 13z" fill="#26212f" stroke="#000" stroke-width="1.5"/><circle cx="0" cy="-3" r="6" fill="#26212f" stroke="#000" stroke-width="1.5"/></g>`; }
    // Straßen
    v.roads.forEach((p, e) => {
      if (p == null) return; const [a, b] = G.edges[e];
      const [x1, y1] = V[a], [x2, y2] = V[b], k = .16, ax = x1 + (x2 - x1) * k, ay = y1 + (y2 - y1) * k, bx = x2 - (x2 - x1) * k, by = y2 - (y2 - y1) * k;
      o += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#15121c" stroke-width="11" stroke-linecap="round"/><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${PC[p]}" stroke-width="7" stroke-linecap="round"/>`;
      if (v.last && v.last.e === e) o += `<circle cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" r="3" fill="#fff"/>`;
    });
    // Gebäude
    v.bld.forEach((b, i) => { if (!b) return; const [x, y] = V[i]; o += house(x, y, PC[b.p], b.city); if (v.last && v.last.v === i) o += `<circle cx="${x}" cy="${y}" r="19" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>`; });
    // Antippbare Stellen
    if (mode === 'robber') (L.robber || []).forEach(h => { const [x, y] = H[h]; o += `<polygon class="sb-hhot" data-sh="${h}" points="${hexPts(x, y, S - 6)}"/>`; });
    if (mode === 'road') (L.road || []).forEach(e => { const [a, b] = G.edges[e]; const l = `x1="${V[a][0]}" y1="${V[a][1]}" x2="${V[b][0]}" y2="${V[b][1]}"`; o += `<line class="sb-ehot" ${l}/><line class="sb-ehit" data-se="${e}" ${l}/>`; });
    if (mode === 'settle' || mode === 'city') (L[mode] || []).forEach(i => { const [x, y] = V[i]; o += `<circle class="sb-hot" cx="${x}" cy="${y}" r="${mode === 'city' ? 13 : 9}"/><circle class="sb-hit" data-sv="${i}" cx="${x}" cy="${y}" r="20"/>`; });
    return o + '</svg>';
  }

  function stepper(name, obj, max) {
    return `<div class="sb-step">${RES.map(k => `<div class="c"><span>${RI[k]}</span><b>${obj[k] || 0}</b><div style="display:flex;gap:3px;width:100%"><button data-sbs="${name}:${k}:-1" aria-label="${RN[k]} weniger">−</button><button data-sbs="${name}:${k}:1" aria-label="${RN[k]} mehr" ${max && (obj[k] || 0) >= (max[k] || 0) ? 'disabled' : ''}>+</button></div></div>`).join('')}</div>`;
  }

  function render(st, v) {
    if (st.dataset.mode !== 'siedler') { st.dataset.mode = 'siedler'; st.innerHTML = ''; }
    const mi = v.mine, playing = room.status === 'playing', myTurn = playing && mi >= 0 && v.turn === mi;
    const key = [v.turn, v.phase, v.setupStep, v.rollId].join('|');
    if (U.key !== key) { U.key = key; if (v.phase !== 'main') U.mode = null; U.dev = null; }
    if (!v.discard || !v.discard[mi]) U.disc = {};
    // Modus fürs Brett
    let mode = null;
    if (myTurn) {
      if (v.phase === 'setup') mode = v.setupStep;
      else if (v.phase === 'robber') mode = 'robber';
      else if (v.phase === 'roads') mode = 'road';
      else if (v.phase === 'main') mode = U.mode;
    }
    // Hinweise
    if (v.stolen && v.stolen.id !== U.stolen) {
      if (U.stolen && v.stolen.k) toast(v.stolen.by === mi ? `Du ziehst ${RI[v.stolen.k]} ${RN[v.stolen.k]} von ${pn(v, v.stolen.from)}.` : `${pn(v, v.stolen.by)} zieht dir ${RI[v.stolen.k]} ${RN[v.stolen.k]}.`);
      U.stolen = v.stolen.id;
    }
    const anim = v.rollId !== U.rollId && U.rollId !== -1; U.rollId = v.rollId;

    // Status
    const cn = pn(v, v.turn);
    let status;
    if (!playing) status = v.winner != null ? (v.winner === mi ? 'Du hast gewonnen! 🏆' : `${pn(v, v.winner)} gewinnt! 🏆`) : 'Spiel beendet';
    else if (v.phase === 'setup') status = myTurn ? (v.setupStep === 'settle' ? 'Tippe eine leuchtende Ecke für deine Siedlung' : 'Tippe eine Kante für deine Straße') : `${cn} setzt ${v.setupStep === 'settle' ? 'eine Siedlung' : 'eine Straße'}`;
    else if (v.phase === 'roll') status = myTurn ? 'Du bist dran – würfle!' : `${cn} würfelt …`;
    else if (v.phase === 'discard') status = v.discard && v.discard[mi] ? `Wirf ${v.discard[mi]} Karten ab` : 'Warte, bis alle abgeworfen haben …';
    else if (v.phase === 'robber') status = myTurn ? 'Tippe ein Feld für den Räuber' : `${cn} versetzt den Räuber`;
    else if (v.phase === 'steal') status = myTurn ? 'Von wem ziehst du eine Karte?' : `${cn} zieht eine Karte`;
    else if (v.phase === 'roads') status = myTurn ? `Setze ${v.freeRoads} freie Straße${v.freeRoads > 1 ? 'n' : ''}` : `${cn} baut Straßen`;
    else status = myTurn ? (U.mode ? `Tippe eine leuchtende Stelle (${U.mode === 'road' ? 'Straße' : U.mode === 'settle' ? 'Siedlung' : 'Stadt'})` : 'Bauen, handeln oder Zug beenden') : `${cn} ist dran`;

    // Spielerleiste
    const top = v.seats.map((p, i) => `<div class="sb-pl ${playing && i === v.turn ? 'turn' : ''} ${p.gone ? 'gone' : ''}">${dot(i)}<b>${pn(v, i)}${i === mi ? ' (du)' : ''}</b>
      <span class="vp" title="Siegpunkte">${p.vp}★</span><small title="Rohstoffkarten">🂠${p.cards}</small><small title="Entwicklungskarten">📜${p.devs}</small><small title="Ausgespielte Wächter">🛡️${p.knights}</small><small title="Längste Straße">🛣️${p.roadLen}</small>${v.lr === i ? '<small title="Längste Handelsstraße (+2)">🏅Straße</small>' : ''}${v.la === i ? '<small title="Größte Wache (+2)">🏅Wache</small>' : ''}</div>`).join('');

    // Seitenleiste
    const side = [];
    const dice = v.dice ? v.dice.map(d => dieHTML(d, 'disabled', anim ? 'roll' : '')).join('') : '';
    side.push(`<div class="sb-box"><p class="sb-status ${myTurn ? 'mine' : ''}">${status}</p>
      <div class="sb-dice">${dice}${v.dice ? `<b style="font-size:20px">= ${v.dice[0] + v.dice[1]}</b>` : ''}${myTurn && v.phase === 'roll' ? '<button class="btn" data-sb="roll">🎲 Würfeln</button>' : ''}</div>
      ${!playing ? `<div class="row">${againHTML('Neue Insel')}</div>` : ''}
      ${mi < 0 ? '<p class="note">Du schaust bei diesem Spiel zu.</p>' : ''}</div>`);

    // Abwerfen
    if (playing && v.phase === 'discard' && v.discard && v.discard[mi]) {
      const n = v.discard[mi], sel = total(U.disc);
      side.push(`<div class="sb-box"><h3>Abwerfen: ${sel} / ${n}</h3>${stepper('disc', U.disc, v.res)}<button class="btn" data-sb="discard" ${sel !== n ? 'disabled' : ''}>Abwerfen</button></div>`);
    }
    // Ziehen
    if (myTurn && v.phase === 'steal') side.push(`<div class="sb-box"><h3>Karte ziehen von</h3><div class="sb-acts">${v.victims.map(i => `<button class="btn" data-sbst="${i}">${pn(v, i)} (${v.seats[i].cards})</button>`).join('')}</div></div>`);
    if (myTurn && v.phase === 'roads') side.push(`<div class="sb-box"><button class="btn ghost small" data-sb="endRoads">Keine weitere Straße</button></div>`);

    // Handelsangebot (für alle sichtbar)
    if (playing && v.offer) {
      const o = v.offer, mineO = o.from === mi;
      const resp = v.seats.map((p, i) => (i === o.from || p.gone ? '' : `<span class="chip">${pn(v, i)}: ${o.resp[i] === 'ja' ? '✅' : o.resp[i] === 'nein' ? '❌' : '…'}</span>`)).join('');
      side.push(`<div class="sb-box sb-offer"><b>🤝 ${mineO ? 'Dein Angebot' : pn(v, o.from) + ' bietet'}: ${resList(o.give)} ➜ für ${resList(o.want)}</b><div class="row">${resp}</div>
        ${mineO ? `<div class="sb-acts">${Object.keys(o.resp).filter(i => o.resp[i] === 'ja').map(i => `<button class="btn small" data-sbcf="${i}">Mit ${pn(v, +i)} handeln</button>`).join('')}<button class="btn ghost small" data-sb="offerCancel">Zurückziehen</button></div>`
        : mi >= 0 && !v.seats[mi].gone ? `<div class="sb-acts"><button class="btn small" data-sbr="1" ${canPay(v.res, o.want) ? '' : 'disabled'}>Annehmen</button><button class="btn ghost small" data-sbr="0">Ablehnen</button></div>${canPay(v.res, o.want) ? '' : '<span class="sb-mini">Dir fehlen die Karten dafür.</span>'}` : ''}</div>`);
    }

    // Hand
    if (mi >= 0 && v.res) {
      const hand = RES.map(k => `<div class="sb-card ${v.res[k] ? '' : 'zero'}" title="${RN[k]}"><span class="ic">${RI[k]}</span><b>${v.res[k]}</b>${RN[k]}</div>`).join('');
      side.push(`<div class="sb-box"><h3>Deine Karten · ${total(v.res)}</h3><div class="sb-hand">${hand}</div>
        <span class="sb-mini">Übrig: ${v.seats[mi].left.road} Straßen · ${v.seats[mi].left.settle} Siedlungen · ${v.seats[mi].left.city} Städte</span></div>`);
    }

    // Aktionen im eigenen Zug
    if (myTurn && (v.phase === 'main' || v.phase === 'roll')) {
      const main = v.phase === 'main', L = v.legal || {};
      const tabs = `<div class="sb-tabs">${[['bau', '🔨 Bauen'], ['handel', '🤝 Handel'], ['karten', `📜 Karten${v.dev.length ? ' (' + v.dev.length + ')' : ''}`]].map(([k, l]) => `<button data-sbtab="${k}" class="${U.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
      let body = '';
      if (U.tab === 'bau') {
        const b = (what, label, n) => { const ok = main && canPay(v.res, v.cost[what]) && n > 0; return `<button class="btn small ${U.mode === what ? 'on' : ''}" data-sbm="${what}" ${ok ? '' : 'disabled'}>${label}<span class="sb-cost">${costHTML(v.cost[what])}</span></button>`; };
        body = `<div class="sb-acts">${b('road', 'Straße', (L.road || []).length)}${b('settle', 'Siedlung', (L.settle || []).length)}${b('city', 'Stadt', (L.city || []).length)}
          <button class="btn small" data-sb="buyDev" ${main && canPay(v.res, v.cost.dev) && v.deck ? '' : 'disabled'}>Karte kaufen<span class="sb-cost">${costHTML(v.cost.dev)} · ${v.deck} übrig</span></button></div>
          ${main && !(L.settle || []).length && v.seats[mi].left.settle ? '<span class="sb-mini">Für eine Siedlung brauchst du eine freie Ecke an deiner Straße (mit Abstand).</span>' : ''}`;
      } else if (U.tab === 'handel') {
        if (!main) body = '<p class="note">Handeln geht nach dem Würfeln.</p>';
        else {
          const rt = v.rates;
          body = `<b>Bank${Object.values(rt).some(x => x < 4) ? ' / Hafen' : ''}</b><span class="sb-mini">Tippe, was du gibst, dann was du bekommst.</span>
            <div class="sb-hand">${RES.map(k => `<button class="sb-card ${U.bg === k ? 'sel' : ''}" data-sbbg="${k}" ${v.res[k] >= rt[k] ? '' : 'disabled'}><span class="ic">${RI[k]}</span><b>${rt[k]}:1</b>gib</button>`).join('')}</div>
            <div class="sb-hand">${RES.map(k => `<button class="sb-card ${U.bw === k ? 'sel' : ''}" data-sbbw="${k}" ${v.bank[k] && k !== U.bg ? '' : 'disabled'}><span class="ic">${RI[k]}</span><b>1</b>nimm</button>`).join('')}</div>
            <button class="btn small" data-sb="bank" ${U.bg && U.bw && U.bg !== U.bw && v.res[U.bg] >= rt[U.bg] ? '' : 'disabled'}>Mit der Bank tauschen</button>
            <hr style="border:0;border-top:1px solid var(--line);width:100%"><b>Angebot an alle</b>
            <span class="sb-mini">Ich gebe:</span>${stepper('give', U.give, v.res)}<span class="sb-mini">Ich möchte:</span>${stepper('want', U.want)}
            <button class="btn small" data-sb="offer" ${total(U.give) && total(U.want) ? '' : 'disabled'}>Anbieten</button>`;
        }
      } else {
        const groups = {}; v.dev.forEach(d => { const g = groups[d.k] || (groups[d.k] = { n: 0, ready: 0 }); g.n++; if (!d.fresh) g.ready++; });
        const desc = { k: 'Räuber versetzen und Karte ziehen', v: '1 Siegpunkt (zählt automatisch)', r: '2 Straßen gratis bauen', f: '2 Rohstoffe aus der Bank', m: 'Alle Karten eines Rohstoffs von allen' };
        body = Object.keys(groups).length ? Object.entries(groups).map(([k, g]) => {
          const can = k !== 'v' && g.ready && !v.devPlayed && (main || k === 'k');
          return `<div class="sb-dev"><span><b>${esc(v.devNames[k])}</b> ×${g.n}<br><span class="sb-mini">${desc[k]}${g.ready < g.n && k !== 'v' ? ' · neu: erst nächsten Zug' : ''}</span></span>${k !== 'v' ? `<button class="btn small" data-sbdev="${k}" ${can ? '' : 'disabled'}>Ausspielen</button>` : ''}</div>`;
        }).join('') : '<p class="note">Du hast keine Entwicklungskarten.</p>';
        if (U.dev === 'f' || U.dev === 'm') {
          const two = U.dev === 'f';
          body += `<div class="sb-offer"><b>${two ? 'Glücksfund: wähle zwei Rohstoffe' : 'Monopol: welcher Rohstoff?'}</b>
            <div class="sb-hand">${RES.map(k => `<button class="sb-card ${U.da === k ? 'sel' : ''}" data-sbda="${k}"><span class="ic">${RI[k]}</span>${RN[k]}</button>`).join('')}</div>
            ${two ? `<div class="sb-hand">${RES.map(k => `<button class="sb-card ${U.db === k ? 'sel' : ''}" data-sbdb="${k}"><span class="ic">${RI[k]}</span>${RN[k]}</button>`).join('')}</div>` : ''}
            <div class="sb-acts"><button class="btn small" data-sb="devGo" ${U.da && (!two || U.db) ? '' : 'disabled'}>Ausspielen</button><button class="btn ghost small" data-sb="devX">Abbrechen</button></div></div>`;
        }
      }
      side.push(`<div class="sb-box">${tabs}${body}</div>`);
      if (main) side.push(`<button class="btn" data-sb="next">Zug beenden ➜</button>`);
    }

    // Ende: verdeckte Karten aller zeigen
    if (!playing) side.push(`<div class="sb-box"><h3>Endstand</h3>${v.seats.map((p, i) => `<div>${dot(i)} ${pn(v, i)}: <b>${p.vp} Punkte</b>${p.dev && p.dev.filter(k => k === 'v').length ? ` (davon ${p.dev.filter(k => k === 'v').length} Denkmal)` : ''}</div>`).join('')}</div>`);

    side.push(`<div class="sb-box"><h3>Verlauf</h3><div class="sb-log">${v.log.map(l => `<p>${esc(l)}</p>`).join('')}</div></div>`);
    side.push(`<details class="sb-box"><summary class="sb-mini">Regeln &amp; Kosten</summary><div class="sb-mini" style="line-height:1.5">
      Straße ${costHTML(v.cost.road)} · Siedlung ${costHTML(v.cost.settle)} · Stadt ${costHTML(v.cost.city)} · Karte ${costHTML(v.cost.dev)}<br>
      Siedlung 1 Punkt, Stadt 2. Längste Handelsstraße (ab 5) und größte Wache (ab 3 Wächtern) je 2 Punkte. Sieg bei ${v.win} Punkten im eigenen Zug.<br>
      Bei einer 7 wirft jeder mit mehr als 7 Karten die Hälfte ab, dann wird der Räuber versetzt. Siedlungen brauchen eine freie Ecke Abstand.</div></details>`);
    if (isHost() && playing) side.push(`<button class="btn ghost small" data-sb="stop">Spiel beenden</button>`);

    const html = `<div class="sb"><div class="sb-top">${top}</div><div class="sb-board">${boardSVG(v, mode)}</div><div class="sb-side">${side.join('')}</div></div>`;
    const logBox = st.querySelector('.sb-log'), scrolled = logBox && logBox.scrollTop + logBox.clientHeight < logBox.scrollHeight - 8;
    const det = st.querySelector('details.sb-box'), detOpen = det && det.open;
    if (st.dataset.h !== html) { st.innerHTML = html; st.dataset.h = html; }
    const lb = st.querySelector('.sb-log'); if (lb && !scrolled) lb.scrollTop = lb.scrollHeight;
    if (detOpen) { const d = st.querySelector('details.sb-box'); if (d) d.open = true; }
  }

  const rerender = () => { if (room && room.game === 'siedler' && room.view) render(document.getElementById('stage'), room.view); };
  document.getElementById('room').addEventListener('click', e => {
    if (!room || room.game !== 'siedler' || !room.view) return;
    const t = e.target, v = room.view; let b;
    if ((b = t.closest('[data-sv]'))) { const what = v.phase === 'setup' ? 'settle' : U.mode === 'city' ? 'city' : 'settle'; act({ type: 'build', what, at: +b.dataset.sv }); if (v.phase === 'main') U.mode = null; return; }
    if ((b = t.closest('[data-se]'))) { act({ type: 'build', what: 'road', at: +b.dataset.se }); if (v.phase === 'main') U.mode = null; return; }
    if ((b = t.closest('[data-sh]'))) { act({ type: 'robber', h: +b.dataset.sh }); return; }
    if ((b = t.closest('[data-sbst]'))) { act({ type: 'steal', seat: +b.dataset.sbst }); return; }
    if ((b = t.closest('[data-sbcf]'))) { act({ type: 'confirm', id: v.offer && v.offer.id, seat: +b.dataset.sbcf }); return; }
    if ((b = t.closest('[data-sbr]'))) { if (!b.disabled) act({ type: 'respond', id: v.offer && v.offer.id, ok: b.dataset.sbr === '1' }); return; }
    if ((b = t.closest('[data-sbtab]'))) { U.tab = b.dataset.sbtab; U.mode = null; rerender(); return; }
    if ((b = t.closest('[data-sbm]'))) { if (b.disabled) return; U.mode = U.mode === b.dataset.sbm ? null : b.dataset.sbm; rerender(); return; }
    if ((b = t.closest('[data-sbbg]'))) { U.bg = b.dataset.sbbg; if (U.bw === U.bg) U.bw = null; rerender(); return; }
    if ((b = t.closest('[data-sbbw]'))) { U.bw = b.dataset.sbbw; rerender(); return; }
    if ((b = t.closest('[data-sbda]'))) { U.da = b.dataset.sbda; rerender(); return; }
    if ((b = t.closest('[data-sbdb]'))) { U.db = b.dataset.sbdb; rerender(); return; }
    if ((b = t.closest('[data-sbdev]'))) { if (b.disabled) return; const k = b.dataset.sbdev; if (k === 'f' || k === 'm') { U.dev = k; U.da = U.db = null; rerender(); } else act({ type: 'play', k }); return; }
    if ((b = t.closest('[data-sbs]'))) {
      if (b.disabled) return; const [name, k, d] = b.dataset.sbs.split(':'), o = U[name];
      o[k] = Math.max(0, (o[k] || 0) + Number(d));
      if (name === 'give' && o[k]) U.want[k] = 0; if (name === 'want' && o[k]) U.give[k] = 0;
      rerender(); return;
    }
    if ((b = t.closest('[data-sb]'))) {
      if (b.disabled) return; const a = b.dataset.sb;
      if (a === 'discard') { act({ type: 'discard', res: U.disc }); U.disc = {}; }
      else if (a === 'bank') act({ type: 'bank', give: U.bg, get: U.bw });
      else if (a === 'offer') { act({ type: 'offer', give: U.give, want: U.want }); U.give = {}; U.want = {}; }
      else if (a === 'devGo') { act({ type: 'play', k: U.dev, a: U.da, b: U.db }); U.dev = null; }
      else if (a === 'devX') { U.dev = null; rerender(); }
      else if (a === 'stop') { if (confirm('Spiel wirklich für alle beenden?')) act({ type: 'stop' }); }
      else if (a === 'next') { U.mode = null; act({ type: 'next' }); }
      else act({ type: a });
    }
  });

  window.Siedler = { render };
})();
