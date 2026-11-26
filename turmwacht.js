// Turmwacht – Tower Defense im Hub. Läuft komplett im Browser; die beste Welle geht an die Rangliste (td_submit).
// Spieler-Idee (v61): Ausbau im Stil von Bloons TD – 10 Türme mit je zwei Ausbaupfaden (4 Stufen, nur ein Pfad über Stufe 2),
// Gegner mit Schichten (zerplatzen in kleinere), Tarnung, Blei, Nachwachsen, verstärkte Gegner, Bosse, Zielwahl,
// Fähigkeiten, Goldmine/Bank, Kriegsbanner, 5 Karten und 3 Schwierigkeitsstufen.
(() => {
  const q = s => document.querySelector(s);
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const konto = () => { try { const k = JSON.parse(localStorage.getItem('fsg.konto') || 'null'); return k && k.name && k.token ? k : null; } catch { return null; } };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  async function call(a, body) { const k = konto(); try { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(k ? { name: k.name, token: k.token } : {}), ...(body || {}) }) }); return await r.json(); } catch { return { error: 'Keine Verbindung zum Server.' }; } }
  const css = `
  #turmwacht{max-width:1100px;margin:0 auto;padding:max(12px,env(safe-area-inset-top)) 12px 30px;display:flex;flex-direction:column;gap:10px}
  .tw-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tw-top h2{flex:1;margin:0}
  .tw-hud{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .tw-hud span{background:var(--surface);border:1px solid var(--line);border-radius:99px;padding:6px 12px;font-weight:800}
  .tw-cv{position:relative;border-radius:16px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.45);touch-action:manipulation}
  .tw-cv canvas{display:block;width:100%;height:auto}
  .tw-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px}
  .tw-shop button{border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:14px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;font:700 13px var(--body);cursor:pointer;transition:transform .12s;position:relative}
  .tw-shop button .i{font-size:26px} .tw-shop button.on{border-color:var(--accent);background:#3a2f1a;transform:translateY(-2px)} .tw-shop button:disabled{opacity:.45}
  .tw-shop small{color:var(--muted);font-weight:600;font-size:11px;text-align:center}
  .tw-shop kbd{position:absolute;top:4px;left:6px;font:700 10px var(--body);color:var(--muted)}
  .tw-sel{display:flex;flex-direction:column;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px}
  .tw-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .tw-up{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .tw-path{border:1px solid var(--line);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:5px;background:rgba(0,0,0,.15)}
  .tw-path .pips i{display:inline-block;width:18px;height:7px;border-radius:4px;background:rgba(255,255,255,.15);margin-right:4px}
  .tw-path .pips i.on{background:#ffd23f;box-shadow:0 0 6px rgba(255,210,63,.6)} .tw-path.b .pips i.on{background:#5fd4ff;box-shadow:0 0 6px rgba(95,212,255,.6)}
  .tw-path small{color:var(--muted)} .tw-path .done{color:var(--muted);font-size:12px}
  .tw-abs{display:flex;gap:6px;flex-wrap:wrap}.tw-abs small{opacity:.8;margin-left:4px}
  .tw-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(10,8,20,.74);backdrop-filter:blur(3px);color:#fff;text-align:center;padding:20px;animation:twin .4s both;overflow:auto}
  .tw-ov.fix{position:fixed;z-index:60;justify-content:flex-start;padding-top:max(20px,env(safe-area-inset-top))}
  @keyframes twin{from{opacity:0}to{opacity:1}}
  .tw-ov h2{font-size:clamp(24px,5.5vw,42px);margin:0}
  .tw-opt{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
  .tw-opt button{display:flex;flex-direction:column;align-items:center;gap:1px}.tw-opt button small{font-size:11px;opacity:.75}
  .tw-opt button.on{border-color:#ffd23f!important;background:#3a2f1a!important;color:#ffd23f}
  .tw-help{max-width:620px;text-align:left;font-size:14px}.tw-help p{margin:4px 0}.tw-help i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-1px}
  .tw-wave{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font:400 clamp(30px,8vw,64px) var(--display);color:#ffd23f;text-shadow:0 0 20px rgba(255,180,0,.7),0 4px 0 #6a3d00;pointer-events:none;animation:twwave 1.6s ease-out forwards;white-space:nowrap}
  @keyframes twwave{0%{opacity:0;transform:translate(-50%,-50%) scale(2)}20%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%)}}
  .tw-top10 p{margin:2px 0;display:flex;justify-content:space-between;gap:16px}
  @media (max-width:600px){.tw-up{grid-template-columns:1fr}.tw-shop{grid-template-columns:repeat(5,1fr);gap:5px}.tw-shop button{padding:6px 2px;font-size:10px;border-radius:10px}.tw-shop button .i{font-size:22px}.tw-shop small .d{display:none}.tw-shop kbd{display:none}}
  `;
  const COLS = 18, ROWS = 11;
  const MAPS = [ // Wegpunkte (Zellen), der Weg verläuft gerade zwischen ihnen
    { n: 'Spirale', lvl: 'leicht', p: [[-1, 0], [17, 0], [17, 10], [1, 10], [1, 2], [15, 2], [15, 8], [3, 8], [3, 4], [13, 4], [13, 6], [6, 6]] },
    { n: 'Kreuzweg', lvl: 'mittel', p: [[-1, 3], [14, 3], [14, 8], [8, 8], [8, 1], [4, 1], [4, 9], [18, 9]] },
    { n: 'Burggraben', lvl: 'mittel', p: [[2, -1], [2, 4], [7, 4], [7, 1], [11, 1], [11, 6], [5, 6], [5, 9], [15, 9], [15, 4], [18, 4]] },
    { n: 'Serpentinen', lvl: 'schwer', p: [[-1, 5], [3, 5], [3, 1], [8, 1], [8, 9], [12, 9], [12, 3], [15, 3], [15, 7], [18, 7]] },
    { n: 'Wiesenpfad', lvl: 'schwer', p: [[-1, 2], [4, 2], [4, 8], [9, 8], [9, 2], [14, 2], [14, 8], [18, 8]] },
  ];
  const DIFF = {
    leicht: { n: 'Leicht', lives: 200, pm: 0.85, sc: 0.6 },
    mittel: { n: 'Mittel', lives: 150, pm: 1, sc: 1 },
    schwer: { n: 'Schwer', lives: 100, pm: 1.08, sc: 1.5 },
  };
  // Türme: s = Grundwerte, up = zwei Ausbaupfade mit je 4 Stufen (f verändert die Werte)
  const TW = {
    bogen: { n: 'Bogenschütze', i: '🏹', c: 200, col: '#c9a26b', d: 'Schnell, durchbohrt 2', pn: ['Schärfere Pfeile', 'Adlerauge'],
      s: { kind: 'dart', proj: 'dart', r: 2.6, rate: 0.7, dmg: 10, pierce: 2, count: 1, spread: 0.22, sp: 13 },
      up: [[
        { n: 'Spitze Pfeile', c: 140, d: '+1 Durchschlag, mehr Schaden', f: s => { s.pierce += 1; s.dmg += 4; } },
        { n: 'Dreifachschuss', c: 320, d: 'Schießt 3 Pfeile auf einmal', f: s => { s.count = 3; } },
        { n: 'Feuerpfeile', c: 950, d: 'Viel mehr Schaden, trifft auch Bleiklötze', f: s => { s.dmg += 12; s.lead = 1; s.fire = 1; } },
        { n: 'Pfeilhagel', c: 3600, d: '5 Pfeile, schneller · Fähigkeit „Pfeilsturm“', f: s => { s.count = 5; s.rate *= 0.6; s.ab = 'pfeilsturm'; } },
      ], [
        { n: 'Weitblick', c: 120, d: 'Mehr Reichweite', f: s => { s.r += 0.6; } },
        { n: 'Falkenauge', c: 240, d: 'Erkennt getarnte Gegner', f: s => { s.camo = 1; s.r += 0.3; } },
        { n: 'Schnellschütze', c: 800, d: 'Schießt fast doppelt so schnell', f: s => { s.rate *= 0.55; } },
        { n: 'Meisterschütze', c: 2900, d: 'Doppelter Schaden, +3 Durchschlag, 2× gegen Bosse', f: s => { s.dmg *= 2; s.pierce += 3; s.r += 0.6; s.bx = (s.bx || 1) * 2; } },
      ]] },
    stachel: { n: 'Stachelturm', i: '✴️', c: 280, col: '#d36bb0', d: 'Stacheln rundum', pn: ['Klingen', 'Glut'],
      s: { kind: 'spike', proj: 'spike', r: 1.7, rate: 1.1, dmg: 10, pierce: 1, count: 8, sp: 9 },
      up: [[
        { n: 'Mehr Stacheln', c: 200, d: '10 Stacheln pro Salve', f: s => { s.count = 10; } },
        { n: 'Stachelkranz', c: 380, d: '14 Stacheln pro Salve', f: s => { s.count = 14; } },
        { n: 'Klingenwirbel', c: 1100, d: 'Klingen: +3 Durchschlag, mehr Schaden', f: s => { s.pierce += 3; s.dmg += 10; s.proj = 'blade'; } },
        { n: 'Klingensturm', c: 3800, d: '20 Klingen, doppelt so schnell', f: s => { s.count = 20; s.rate *= 0.5; s.dmg += 10; } },
      ], [
        { n: 'Schneller', c: 160, d: 'Feuert schneller', f: s => { s.rate *= 0.8; } },
        { n: 'Noch schneller', c: 320, d: 'Feuert schneller, etwas mehr Reichweite', f: s => { s.rate *= 0.75; s.r += 0.2; } },
        { n: 'Feuerring', c: 1700, d: 'Flammenring trifft alles in Reichweite, auch Blei und Tarnung', f: s => { s.kind = 'pulse'; s.fire = 1; s.lead = 1; s.dmg = Math.max(s.dmg, 22); } },
        { n: 'Inferno', c: 5200, d: 'Riesiger, heißer Flammenring', f: s => { s.dmg *= 2.5; s.rate *= 0.6; s.r += 0.4; } },
      ]] },
    kanone: { n: 'Kanone', i: '💣', c: 500, col: '#7a7f8c', d: 'Flächenschaden, sprengt Blei', pn: ['Sprengkraft', 'Artillerie'],
      s: { kind: 'shell', r: 2.3, rate: 1.4, dmg: 14, splash: 1.0, sp: 7, lead: 1 },
      up: [[
        { n: 'Größere Bomben', c: 300, d: 'Größere Explosion', f: s => { s.splash += 0.35; } },
        { n: 'Schwere Bomben', c: 520, d: 'Mehr Schaden', f: s => { s.dmg += 14; } },
        { n: 'Streubomben', c: 1300, d: 'Jede Bombe zerfällt in 6 kleine', f: s => { s.cluster = 6; } },
        { n: 'Bombenregen', c: 4200, d: 'Doppelter Schaden, 10 Streubomben · Fähigkeit „Bombardement“', f: s => { s.dmg *= 2; s.cluster = 10; s.ab = 'bombard'; } },
      ], [
        { n: 'Fernrohr', c: 250, d: 'Mehr Reichweite', f: s => { s.r += 0.6; } },
        { n: 'Schnelllader', c: 420, d: 'Feuert schneller', f: s => { s.rate *= 0.72; } },
        { n: 'Raketenwerfer', c: 1600, d: 'Schnelle Raketen, 3× gegen Bosse', f: s => { s.sp = 12; s.dmg += 30; s.bx = 3; } },
        { n: 'Kolossbrecher', c: 4800, d: '6× gegen Bosse, Treffer betäuben kurz', f: s => { s.bx = 6; s.stun = 0.6; s.dmg += 40; } },
      ]] },
    frost: { n: 'Frostturm', i: '❄️', c: 400, col: '#7fd4ff', d: 'Verlangsamt alles ringsum', pn: ['Permafrost', 'Arktis'], noTarget: 1,
      s: { kind: 'pulse', r: 1.6, rate: 1.5, dmg: 3, slow: 0.5, slowT: 1.4 },
      up: [[
        { n: 'Langer Frost', c: 180, d: 'Verlangsamung hält länger', f: s => { s.slowT += 1; } },
        { n: 'Permafrost', c: 420, d: 'Gegner bleiben danach dauerhaft etwas langsamer', f: s => { s.perma = 1; } },
        { n: 'Eissplitter', c: 1250, d: 'Viel mehr Schaden, auch gegen Blei', f: s => { s.dmg += 14; s.lead = 1; } },
        { n: 'Eiszeit', c: 3300, d: 'Doppelter Schaden · Fähigkeit „Eiszeit“ friert alle ein', f: s => { s.dmg *= 2; s.ab = 'eiszeit'; } },
      ], [
        { n: 'Größerer Radius', c: 200, d: 'Mehr Reichweite', f: s => { s.r += 0.5; } },
        { n: 'Kältewelle', c: 380, d: 'Pulsiert schneller', f: s => { s.rate *= 0.7; } },
        { n: 'Arktiswind', c: 1500, d: 'Stärkere Verlangsamung, mehr Reichweite', f: s => { s.slow = 0.35; s.r += 0.3; } },
        { n: 'Absolute Kälte', c: 4200, d: 'Verlangsamt auch Bosse voll, schneller, mehr Schaden', f: s => { s.bossSlow = 1; s.rate *= 0.6; s.dmg += 10; } },
      ]] },
    blitz: { n: 'Blitzturm', i: '⚡', c: 700, col: '#c18bff', d: 'Springt über, trifft Blei', pn: ['Kettenblitz', 'Hochspannung'],
      s: { kind: 'bolt', r: 2.6, rate: 1.2, dmg: 16, chain: 3, forks: 1, lead: 1 },
      up: [[
        { n: 'Mehr Sprünge', c: 320, d: '+2 Sprünge', f: s => { s.chain += 2; } },
        { n: 'Kettenreaktion', c: 650, d: '+3 Sprünge, mehr Schaden', f: s => { s.chain += 3; s.dmg += 6; } },
        { n: 'Gewitter', c: 2100, d: 'Zwei Blitze gleichzeitig', f: s => { s.forks = 2; } },
        { n: 'Donnergott', c: 6200, d: '2,5× Schaden, +5 Sprünge', f: s => { s.dmg *= 2.5; s.chain += 5; } },
      ], [
        { n: 'Funkenflug', c: 300, d: 'Feuert schneller', f: s => { s.rate *= 0.8; } },
        { n: 'Hochspannung', c: 520, d: 'Mehr Schaden', f: s => { s.dmg += 12; } },
        { n: 'Plasma', c: 2300, d: 'Doppelt so schnell, erkennt Tarnung', f: s => { s.rate *= 0.5; s.camo = 1; } },
        { n: 'Sturmwolke', c: 5600, d: 'Mehr Reichweite · Fähigkeit „Gewittersturm“', f: s => { s.r += 0.8; s.ab = 'sturm'; } },
      ]] },
    armbrust: { n: 'Scharfschütze', i: '🎯', c: 350, col: '#8fae5a', d: 'Unendliche Reichweite', pn: ['Durchschlag', 'Nachladen'],
      s: { kind: 'snipe', r: 99, rate: 1.8, dmg: 25 },
      up: [[
        { n: 'Volle Spannung', c: 350, d: 'Mehr Schaden', f: s => { s.dmg += 20; } },
        { n: 'Panzerbrecher', c: 650, d: 'Durchschlägt Blei, mehr Schaden', f: s => { s.lead = 1; s.dmg += 15; } },
        { n: 'Kopfschuss', c: 2600, d: '3× Schaden, 2× gegen Bosse', f: s => { s.dmg *= 3; s.bx = 2; } },
        { n: 'Elitejäger', c: 7200, d: 'Doppelter Schaden, 5× gegen Bosse · Fähigkeit „Präzisionsschuss“', f: s => { s.dmg *= 2; s.bx = 5; s.ab = 'praezision'; } },
      ], [
        { n: 'Nachtsicht', c: 260, d: 'Erkennt getarnte Gegner', f: s => { s.camo = 1; } },
        { n: 'Schnellspanner', c: 420, d: 'Lädt schneller nach', f: s => { s.rate *= 0.7; } },
        { n: 'Halbautomatik', c: 2300, d: 'Mehr als doppelt so schnell', f: s => { s.rate *= 0.4; } },
        { n: 'Vollautomatik', c: 6300, d: 'Noch viel schneller, mehr Schaden', f: s => { s.rate *= 0.45; s.dmg += 15; } },
      ]] },
    ninja: { n: 'Ninja', i: '🥷', c: 450, col: '#4b4f6b', d: 'Schnell, erkennt Tarnung', pn: ['Wurfsterne', 'Schattenkunst'],
      s: { kind: 'dart', proj: 'star', r: 2.4, rate: 0.55, dmg: 10, pierce: 2, count: 1, spread: 0.18, sp: 14, camo: 1 },
      up: [[
        { n: 'Scharfe Sterne', c: 300, d: '+2 Durchschlag, mehr Schaden', f: s => { s.pierce += 2; s.dmg += 4; } },
        { n: 'Doppelwurf', c: 420, d: 'Wirft 2 Sterne', f: s => { s.count = 2; } },
        { n: 'Verwirrung', c: 1450, d: 'Treffer werfen Gegner manchmal zurück', f: s => { s.knock = 0.15; } },
        { n: 'Großmeister', c: 5200, d: '4 Sterne, schneller, mehr Schaden', f: s => { s.count = 4; s.rate *= 0.6; s.dmg += 14; } },
      ], [
        { n: 'Flinke Hände', c: 300, d: 'Wirft schneller', f: s => { s.rate *= 0.8; } },
        { n: 'Feuersterne', c: 620, d: 'Trifft auch Bleiklötze', f: s => { s.lead = 1; s.fire = 1; } },
        { n: 'Klebebombe', c: 2100, d: 'Heftet alle 4 s eine Bombe an den stärksten Gegner', f: s => { s.sticky = { every: 4, dmg: 400 }; } },
        { n: 'Schattenmeister', c: 5800, d: 'Bombe alle 2 s, viel stärker · Fähigkeit „Schattenklone“', f: s => { s.sticky = { every: 2, dmg: 1500 }; s.ab = 'klone'; } },
      ]] },
    magier: { n: 'Magier', i: '🔮', c: 400, col: '#a35cff', d: 'Magie trifft alles', pn: ['Feuermagie', 'Arkanmagie'],
      s: { kind: 'dart', proj: 'orb', r: 2.3, rate: 0.9, dmg: 12, pierce: 3, count: 1, spread: 0.2, sp: 10, lead: 1 },
      up: [[
        { n: 'Starke Magie', c: 300, d: 'Mehr Schaden, +2 Durchschlag', f: s => { s.dmg += 6; s.pierce += 2; } },
        { n: 'Feuerball', c: 650, d: 'Kugeln explodieren beim Treffer', f: s => { s.splash = 0.8; s.proj = 'fire'; } },
        { n: 'Drachenodem', c: 2700, d: 'Flammenwerfer: feuert ununterbrochen', f: s => { s.splash = 0; s.proj = 'flame'; s.rate = 0.13; s.pierce += 2; s.r *= 0.85; s.sp = 8; } },
        { n: 'Phönixfeuer', c: 7200, d: '3× Schaden, +4 Durchschlag, mehr Reichweite', f: s => { s.dmg *= 3; s.pierce += 4; s.r += 0.5; } },
      ], [
        { n: 'Arkane Sicht', c: 260, d: 'Erkennt Tarnung, mehr Reichweite', f: s => { s.camo = 1; s.r += 0.4; } },
        { n: 'Blitzmagie', c: 620, d: 'Treffer springen auf 2 weitere Gegner über', f: s => { s.chain = 2; } },
        { n: 'Arkanstrahl', c: 2300, d: '+5 Durchschlag, 2,5× gegen Bosse', f: s => { s.bx = 2.5; s.pierce += 5; s.sp = 16; } },
        { n: 'Erzmagier', c: 6200, d: 'Doppelter Schaden, schneller, mehr Reichweite', f: s => { s.dmg *= 2; s.rate *= 0.6; s.r += 0.6; } },
      ]] },
    goldmine: { n: 'Goldmine', i: '⛏️', c: 900, col: '#e5bf3c', d: 'Gold nach jeder Welle', pn: ['Bergbau', 'Bank'], noBuff: 1, noTarget: 1,
      s: { kind: 'mine', r: 0.9, inc: 80 },
      up: [[
        { n: 'Tiefer graben', c: 400, d: '+50 Gold pro Welle', f: s => { s.inc += 50; } },
        { n: 'Goldader', c: 950, d: '+110 Gold pro Welle', f: s => { s.inc += 110; } },
        { n: 'Edelsteinmine', c: 2600, d: '+220 Gold pro Welle', f: s => { s.inc += 220; } },
        { n: 'Schatzkammer', c: 7500, d: '+600 Gold pro Welle', f: s => { s.inc += 600; } },
      ], [
        { n: 'Sparkasse', c: 500, d: '5 % Zinsen auf dein Gold (max. 150)', f: s => { s.interest = 0.05; s.imax = 150; } },
        { n: 'Zinseszins', c: 1000, d: 'Zinsen bis 400, +30 pro Welle', f: s => { s.imax = 400; s.inc += 30; } },
        { n: 'Goldtresor', c: 3000, d: '8 % Zinsen (max. 1200)', f: s => { s.interest = 0.08; s.imax = 1200; } },
        { n: 'Königsbank', c: 8000, d: 'Zinsen bis 4000, +250 pro Welle', f: s => { s.imax = 4000; s.inc += 250; } },
      ]] },
    banner: { n: 'Kriegsbanner', i: '🚩', c: 1100, col: '#d04a4a', d: 'Stärkt Türme in der Nähe', pn: ['Kriegskunst', 'Wacht'], noBuff: 1, noTarget: 1,
      s: { kind: 'aura', r: 2.0, aura: { rm: 1.15 } },
      up: [[
        { n: 'Trommler', c: 450, d: 'Türme in der Nähe feuern 10 % schneller', f: s => { s.aura.rt = 0.9; } },
        { n: 'Kriegsgesang', c: 1300, d: 'Türme in der Nähe feuern 20 % schneller', f: s => { s.aura.rt = 0.8; } },
        { n: 'Waffenschmied', c: 2600, d: 'Türme in der Nähe treffen auch Blei', f: s => { s.aura.lead = 1; } },
        { n: 'Heerführer', c: 7200, d: '+50 % Schaden, noch schneller · Fähigkeit „Schlachtruf“', f: s => { s.aura.dm = 1.5; s.aura.rt = 0.72; s.ab = 'schlachtruf'; } },
      ], [
        { n: 'Großes Lager', c: 300, d: 'Größerer Wirkbereich', f: s => { s.r += 0.6; } },
        { n: 'Späher', c: 850, d: 'Türme in der Nähe erkennen Tarnung', f: s => { s.aura.camo = 1; } },
        { n: 'Wachposten', c: 1700, d: 'Geschosse in der Nähe +1 Durchschlag', f: s => { s.aura.pierce = 1; } },
        { n: 'Zitadelle', c: 6000, d: '+25 % Schaden, 1,5× gegen Bosse, größerer Bereich', f: s => { s.aura.dm = Math.max(s.aura.dm || 1, 1.25); s.aura.bx = 1.5; s.r += 0.4; } },
      ]] },
  };
  const AB = { // Fähigkeiten der Stufe-4-Ausbauten
    pfeilsturm: { n: 'Pfeilsturm', i: '🌧️', cd: 45, go: t => { t.boostT = 6; t.boostM = 0.25; } },
    bombard: { n: 'Bombardement', i: '💥', cd: 40, go: t => { for (const e of G.en.slice()) { if (e.dead) continue; const [x, y] = posAt(e.d); G.fx.push({ ring: [x, y], R: 0.5, l: 1 }); dmgTo(e, 150, t, 1, 2); } shake = 14; } },
    eiszeit: { n: 'Eiszeit', i: '🧊', cd: 50, go: () => { for (const e of G.en) e.frz = Math.max(e.frz || 0, e.boss ? 1.2 : 3.5); } },
    sturm: { n: 'Gewittersturm', i: '⛈️', cd: 50, go: t => { G.storm = { t: 8, tw: t, cd: 0 }; } },
    klone: { n: 'Schattenklone', i: '👥', cd: 40, go: t => { t.boostT = 10; t.boostM = 0.3; } },
    praezision: { n: 'Präzisionsschuss', i: '🎯', cd: 35, go: t => { const L = G.en.filter(e => !e.dead); if (!L.length) return; const e = L.sort((a, b) => (b.boss || 0) - (a.boss || 0) || b.hp - a.hp)[0]; const [x, y] = posAt(e.d); G.fx.push({ line: [t.x + 0.5, t.y + 0.5, x, y], l: 1, w: 4 }); dmgTo(e, 4000, t, 1, 1); } },
    schlachtruf: { n: 'Schlachtruf', i: '📯', cd: 60, go: () => { G.rallyT = 8; } },
  };
  // Gegner: kids = in diese zerplatzt er; Zusätze pro Gegner: camo (getarnt), regen (wächst nach), fort (verstärkt, doppelte Lebenspunkte)
  const EN = {
    schleim: { n: 'Schleim', hp: 10, sp: 1.0, gold: 2, col: '#5fd35f', r: 0.25 },
    flitzer: { n: 'Flitzer', hp: 8, sp: 1.9, gold: 2, col: '#ffd23f', r: 0.21 },
    gross: { n: 'Großschleim', hp: 20, sp: 1.15, gold: 3, col: '#4aa8ff', r: 0.29, kids: ['schleim', 'schleim'] },
    riesen: { n: 'Riesenschleim', hp: 34, sp: 1.3, gold: 4, col: '#c45cff', r: 0.33, kids: ['gross', 'gross'] },
    blei: { n: 'Bleiklotz', hp: 30, sp: 0.85, gold: 6, col: '#7d8494', r: 0.31, lead: 1, kids: ['gross', 'gross'] },
    golem: { n: 'Felsgolem', hp: 150, sp: 1.0, gold: 12, col: '#b07a4a', r: 0.36, kids: ['riesen', 'riesen'] },
    waechter: { n: 'Wächter', hp: 500, sp: 0.6, gold: 40, col: '#ff8a3d', r: 0.46, boss: 1, kids: ['riesen', 'riesen', 'riesen'] },
    koloss: { n: 'Koloss', hp: 1500, sp: 0.45, gold: 80, col: '#ff4d6d', r: 0.54, boss: 1, kids: ['golem', 'golem', 'golem', 'golem'] },
    titan: { n: 'Titan', hp: 6000, sp: 0.32, gold: 250, col: '#8a1cff', r: 0.62, boss: 1, kids: ['koloss', 'koloss'] },
  };
  const LC = {}; const lifeCost = t => LC[t] ?? (LC[t] = 1 + (EN[t].kids || []).reduce((a, k) => a + lifeCost(k), 0));
  const MODE = { first: 'Erster', last: 'Letzter', strong: 'Stärkster', close: 'Nächster' };
  const KEYS = Object.keys(TW);
  let page = null, cv, ctx, G = null, raf = null, sel = 'bogen', pick = null, cell = 40, last = 0;
  const opt = { map: 0, diff: 'mittel' };
  try { const o = JSON.parse(localStorage.getItem('fsg.tw.opt') || 'null'); if (o && MAPS[o.map] && DIFF[o.diff]) Object.assign(opt, o); } catch {}
  const price = c => Math.round(c * DIFF[opt.diff].pm / 5) * 5;
  const gm = w => (w > 80 ? 0.2 : w > 50 ? 0.5 : 1);
  function newGame() {
    const m = MAPS[opt.map].p, path = [];
    for (let i = 0; i < m.length - 1; i++) { const [x1, y1] = m[i], [x2, y2] = m[i + 1]; const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)); for (let k = 0; k < n; k++) path.push([x1 + Math.sign(x2 - x1) * k, y1 + Math.sign(y2 - y1) * k]); }
    path.push(m[m.length - 1]);
    const onPath = new Set(path.map(([x, y]) => x + ',' + y));
    const deco = []; for (let i = 0; i < 26; i++) { const x = (Math.random() * COLS) | 0, y = (Math.random() * ROWS) | 0; if (!onPath.has(x + ',' + y)) deco.push([x, y, Math.random() < 0.6 ? 'tree' : 'rock']); }
    const lastP = path[path.length - 1], inside = lastP[0] >= 0 && lastP[1] >= 0 && lastP[0] < COLS && lastP[1] < ROWS;
    G = { path, onPath, deco, castle: inside ? lastP : path[path.length - 2], towers: [], en: [], shots: [], fx: [], txt: [], gold: 650, lives: DIFF[opt.diff].lives, wave: 0, spawn: [], spawnT: 0, gap: 0.5, speed: 1, over: false, run: false, started: false, score: 0, kills: 0, tid: 0, rallyT: 0, storm: null };
  }
  const pathLen = () => G.path.length - 1;
  function posAt(d) { const i = Math.min(G.path.length - 2, Math.max(0, Math.floor(d))), f = Math.min(1, d - i), a = G.path[i], b = G.path[i + 1]; return [a[0] + (b[0] - a[0]) * f + 0.5, a[1] + (b[1] - a[1]) * f + 0.5]; }
  function waveList(w) {
    const L = [], add = (t, n, m) => { for (let i = 0; i < n; i++) L.push({ t, ...(m || {}) }); };
    const f = w > 40 ? 1 + (w - 40) * 0.04 : 1, N = x => Math.max(0, Math.round(x * f));
    add('schleim', N(w <= 12 ? 8 + w * 3 : Math.max(10, 44 - w)));
    if (w >= 3) add('flitzer', N(Math.min(30, w * 1.5)));
    if (w >= 4) add('gross', N(Math.min(40, (w - 3) * 2)));
    if (w >= 7) add(w >= 14 ? 'gross' : 'flitzer', N(Math.min(20, w - 5)), { camo: 1 });
    if (w >= 9) add('riesen', N(Math.min(40, (w - 8) * 1.5)));
    if (w >= 11) add('blei', N(Math.min(24, Math.floor((w - 9) / 2) * 2)), w >= 26 ? { fort: 1 } : null);
    if (w >= 13) add(w >= 22 ? 'riesen' : 'gross', N(Math.min(20, w - 11)), { regen: 1 });
    if (w >= 16) add('golem', N(Math.min(30, w - 15)), w >= 32 ? { fort: 1 } : null);
    if (w >= 19) add('riesen', N(Math.min(20, w - 17)), w >= 28 ? { camo: 1, regen: 1 } : { camo: 1 });
    if (w >= 34) add('golem', N(Math.min(20, w - 32)), { camo: 1 });
    if (w % 10 === 0) {
      if (w === 10) add('waechter', 1); else if (w === 20) add('koloss', 1); else if (w === 30) add('koloss', 2);
      else add('titan', Math.floor((w - 30) / 10), w >= 60 ? { fort: 1 } : null);
    } else if (w > 40 && w % 5 === 0) add('koloss', Math.floor(w / 15), w >= 55 ? { fort: 1 } : null);
    return L;
  }
  function preview(w) {
    const c = {}; for (const x of waveList(w)) { const k = (x.fort ? 'verstärkte ' : '') + (x.camo ? 'getarnte ' : '') + (x.regen ? 'nachwachsende ' : '') + EN[x.t].n; c[k] = (c[k] || 0) + 1; }
    const E = Object.entries(c); return E.slice(0, 5).map(([k, n]) => `${n}× ${k}`).join(', ') + (E.length > 5 ? ' …' : '');
  }
  const hpK = w => 1 + Math.max(0, w - 22) * 0.07 + Math.pow(Math.max(0, w - 40), 1.5) * 0.04;
  const spK = w => 1 + Math.min(0.5, Math.max(0, w - 50) * 0.01);
  function startWave() {
    if (!G || !G.started || G.run || G.over) return;
    G.wave++; G.run = true; const w = G.wave;
    G.spawn = waveList(w); G.spawnT = 0; G.gap = Math.max(0.1, 0.55 - w * 0.012);
    const b = page.querySelector('.tw-cv'); const el = document.createElement('div'); el.className = 'tw-wave'; el.textContent = w % 10 === 0 ? `Welle ${w} – BOSS!` : `Welle ${w}`; b.appendChild(el); setTimeout(() => el.remove(), 1700);
    hud();
  }
  function spawnOne(spec, d, from) {
    const E = EN[spec.t], k = hpK(G.wave) * (spec.fort ? 2 : 1);
    const e = { t: spec.t, d: d || 0, hp: E.hp * k, max: E.hp * k, sp: E.sp * spK(G.wave), col: E.col, r: E.r, lead: E.lead, boss: E.boss, camo: spec.camo, regen: spec.regen, fort: spec.fort, gold: E.gold, slowT: 0, slowF: 1, frz: 0, hurtT: 0, wob: Math.random() * 6 };
    if (from) { e.slowT = from.slowT; e.slowF = from.slowF; e.perma = from.perma; e.frz = from.frz; }
    G.en.push(e); return e;
  }
  function dmgTo(e, d, tw, lead, bx) {
    if (e.dead) return;
    const [x, y] = posAt(e.d);
    if (e.lead && !lead) { if (Math.random() < 0.15) G.txt.push({ x, y: y - 0.4, t: 0.7, s: '🛡', c: '#ccc' }); return; }
    const real = d * (e.boss ? (bx || 1) : 1); e.hp -= real; e.hurtT = 0;
    if (real >= 1 && G.txt.length < 60) G.txt.push({ x, y: y - 0.4, t: 0.8, s: Math.round(real), c: '#fff' });
    if (e.hp <= 0) kill(e, tw);
  }
  function kill(e, tw) {
    e.dead = true; const g = Math.max(1, Math.round(e.gold * gm(G.wave))); G.gold += g; G.score += e.gold * 10; G.kills++; if (tw) tw.pops++;
    const [x, y] = posAt(e.d); const n = e.boss ? 30 : 8;
    if (G.fx.length < 400) for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 0.02 + Math.random() * 0.06; G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1, c: e.col }); }
    if (e.boss) { G.txt.push({ x, y: y - 0.8, t: 1.5, s: '+' + g, c: '#ffd23f', gold: 1 }); shake = 12; }
    const kids = EN[e.t].kids || [];
    kids.forEach((t, i) => spawnOne({ t, camo: e.camo, regen: e.regen, fort: e.fort && EN[t].boss }, Math.max(0, e.d - i * 0.12), e));
  }
  function applySlow(e, s) {
    let f = s.slow; if (e.boss && !s.bossSlow) f = 1 - (1 - f) * 0.5;
    if (!(e.slowT > 0) || f <= e.slowF) e.slowF = f; e.slowT = Math.max(e.slowT || 0, s.slowT); if (s.perma) e.perma = 1;
  }
  function explode(x, y, R, dmg, tw, bx, stun) {
    let n = 0; for (const e of G.en.slice()) { if (e.dead) continue; const [ex, ey] = posAt(e.d); if (Math.hypot(ex - x, ey - y) > R + e.r * 0.5) continue; dmgTo(e, dmg, tw, 1, bx); if (stun && !e.dead) e.frz = Math.max(e.frz || 0, e.boss ? stun * 0.5 : stun); if (++n >= 40) break; }
    G.fx.push({ ring: [x, y], R, l: 1 });
  }
  function chainZap(start, n, dmg, tw, from, bx) {
    let cur = start; const hit = new Set(), pts = [from];
    for (let c = 0; c < n && cur; c++) {
      hit.add(cur); const p = posAt(cur.d); pts.push(p); dmgTo(cur, dmg * Math.max(0.4, 1 - c * 0.1), tw, 1, bx);
      let nx = null, nd = 1.8; for (const e of G.en) { if (e.dead || hit.has(e)) continue; const [ex, ey] = posAt(e.d); const dd = Math.hypot(ex - p[0], ey - p[1]); if (dd < nd) { nd = dd; nx = e; } } cur = nx;
    }
    G.fx.push({ bolt: pts, l: 1 });
  }
  function pickTarget(t, s, mode) {
    const cx = t.x + 0.5, cy = t.y + 0.5; let best = null, bv = -Infinity;
    for (const e of G.en) {
      if (e.dead || (e.camo && !s.camo)) continue; const [x, y] = posAt(e.d); const dd = Math.hypot(x - cx, y - cy); if (dd > s.r) continue;
      const v = mode === 'last' ? -e.d : mode === 'strong' ? (e.boss ? 1e9 : 0) + e.hp * 10 + e.d : mode === 'close' ? -dd : e.d;
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }
  function calc(t) { const T = TW[t.k], s = JSON.parse(JSON.stringify(T.s)); for (let p = 0; p < 2; p++) for (let i = 0; i < t.up[p]; i++) T.up[p][i].f(s); return s; }
  function buffs() {
    const B = G.towers.filter(b => b.s.kind === 'aura');
    for (const t of G.towers) {
      const e = t.e = Object.assign({}, t.s); e.buf = 0;
      if (!B.length || TW[t.k].noBuff) continue;
      let rm = 1, rt = 1, dm = 1, bx = 1, pi = 0, lead = 0, camo = 0, any = 0;
      for (const b of B) { if (Math.hypot(t.x - b.x, t.y - b.y) > b.s.r + 0.01) continue; const a = b.s.aura; any = 1; rm = Math.max(rm, a.rm || 1); rt = Math.min(rt, a.rt || 1); dm = Math.max(dm, a.dm || 1); bx = Math.max(bx, a.bx || 1); pi = Math.max(pi, a.pierce || 0); lead = lead || a.lead; camo = camo || a.camo; }
      if (!any) continue;
      if (e.r < 50) e.r *= rm; e.rate *= rt; e.dmg *= dm; if (bx > 1) e.bx = (e.bx || 1) * bx; if (e.pierce) e.pierce += pi; if (lead) e.lead = 1; if (camo) e.camo = 1; e.buf = 1;
    }
  }
  function step(dt) {
    if (G.over || !G.started) return;
    if (G.run && G.spawn.length) { G.spawnT -= dt; while (G.spawnT <= 0 && G.spawn.length) { spawnOne(G.spawn.shift()); G.spawnT += G.gap; } }
    if (G.rallyT > 0) G.rallyT -= dt;
    if (G.storm) { const S = G.storm; S.t -= dt; S.cd -= dt; if (S.cd <= 0) { S.cd = 0.15; const L = G.en.filter(e => !e.dead); if (L.length) { const e = L[(Math.random() * L.length) | 0]; const [x, y] = posAt(e.d); G.fx.push({ bolt: [[x + 0.4, -0.5], [x - 0.2, y * 0.5], [x, y]], l: 0.8 }); dmgTo(e, 60, S.tw, 1, 1); } } if (S.t <= 0) G.storm = null; }
    for (const e of G.en) {
      if (e.dead) continue;
      if (e.frz > 0) e.frz -= dt; if (e.slowT > 0) e.slowT -= dt;
      const f = e.frz > 0 ? 0 : e.slowT > 0 ? e.slowF : e.perma ? (e.boss ? 0.9 : 0.8) : 1;
      e.d += e.sp * f * dt * 1.6;
      if (e.regen && e.hp < e.max) { e.hurtT += dt; if (e.hurtT > 1) e.hp = Math.min(e.max, e.hp + e.max * 0.2 * dt); }
      if (e.sticky) { e.sticky.t -= dt; if (e.sticky.t <= 0) { const sk = e.sticky; e.sticky = null; const [x, y] = posAt(e.d); dmgTo(e, sk.dmg, sk.tw, 1, 2); explode(x, y, 0.7, sk.dmg * 0.25, sk.tw, 1); } }
      if (!e.dead && e.d >= pathLen()) { e.dead = true; G.lives -= lifeCost(e.t); shake = 10; if (navigator.vibrate) navigator.vibrate(60); }
    }
    for (const t of G.towers) {
      const s = t.e; if (!s) continue; t.cd -= dt; if (t.abCd > 0) t.abCd -= dt; if (t.boostT > 0) t.boostT -= dt;
      t.kick = Math.max(0, (t.kick || 0) - dt * 5);
      if (s.kind === 'mine' || s.kind === 'aura') continue;
      const rate = s.rate * (t.boostT > 0 ? t.boostM : 1) * (G.rallyT > 0 ? 0.5 : 1);
      const cx = t.x + 0.5, cy = t.y + 0.5;
      if (s.sticky) { t.bombT = (t.bombT ?? s.sticky.every) - dt; if (t.bombT <= 0) { const tg = pickTarget(t, s, 'strong'); if (tg && !tg.sticky) { tg.sticky = { t: 1, dmg: s.sticky.dmg, tw: t }; t.bombT = s.sticky.every; } else t.bombT = 0.25; } }
      if (s.kind === 'pulse') {
        if (t.cd > 0) continue;
        const inR = G.en.filter(e => { if (e.dead) return false; const [x, y] = posAt(e.d); return Math.hypot(x - cx, y - cy) <= s.r; });
        if (!inR.length) continue; t.cd = rate; t.kick = 1;
        G.fx.push({ pulse: [cx, cy], R: s.r, l: 1, c: s.fire ? '255,140,40' : '170,225,255' });
        for (const e of inR) { if (s.slow) applySlow(e, s); dmgTo(e, s.dmg, t, s.lead, s.bx); }
        continue;
      }
      const tg = pickTarget(t, s, t.mode); if (!tg) continue;
      const [ex, ey] = posAt(tg.d); t.ang = Math.atan2(ey - cy, ex - cx);
      if (t.cd > 0) continue; t.cd = rate; t.kick = 1;
      if (s.kind === 'dart' || s.kind === 'spike') {
        const n = s.count || 1;
        for (let i = 0; i < n; i++) {
          const a = s.kind === 'spike' ? (i / n) * Math.PI * 2 : t.ang + (i - (n - 1) / 2) * (s.spread || 0.2);
          if (G.shots.length > 500) break;
          G.shots.push({ x: cx, y: cy, vx: Math.cos(a) * s.sp, vy: Math.sin(a) * s.sp, life: (s.r * 1.15 + 0.4) / s.sp, pierce: s.pierce, dmg: s.dmg, lead: s.lead, bx: s.bx, tw: t, hit: new Set(), k: s.proj, splash: s.splash, chain: s.chain, knock: s.knock, fire: s.fire, a });
        }
      } else if (s.kind === 'shell') G.shots.push({ homing: tg, x: cx, y: cy, sp: s.sp, dmg: s.dmg, splash: s.splash, cluster: s.cluster, bx: s.bx, stun: s.stun, tw: t, k: s.sp > 10 ? 'rocket' : 'shell', tr: [] });
      else if (s.kind === 'bolt') {
        chainZap(tg, s.chain, s.dmg, t, [cx, cy], s.bx);
        if (s.forks > 1) { const o = G.en.find(e => !e.dead && e !== tg && (!e.camo || s.camo) && Math.hypot(posAt(e.d)[0] - cx, posAt(e.d)[1] - cy) <= s.r); if (o) chainZap(o, s.chain, s.dmg, t, [cx, cy], s.bx); }
      } else if (s.kind === 'snipe') { G.fx.push({ line: [cx, cy, ex, ey], l: 0.6, w: 2 }); dmgTo(tg, s.dmg, t, s.lead, s.bx); }
    }
    for (const p of G.shots) {
      if (p.homing) {
        const [tx, ty] = p.homing.dead ? [p.lx, p.ly] : posAt(p.homing.d); p.lx = tx; p.ly = ty;
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), mv = p.sp * dt;
        p.tr.push([p.x, p.y]); if (p.tr.length > 6) p.tr.shift();
        if (d <= mv) {
          p.done = true; explode(tx, ty, p.splash, p.dmg, p.tw, p.bx, p.stun);
          if (p.cluster) for (let i = 0; i < p.cluster; i++) { const a = (i / p.cluster) * 6.283 + Math.random() * 0.5, rr = 0.6 + Math.random() * 0.5; explode(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr, 0.5, p.dmg * 0.5, p.tw, p.bx); }
          shake = Math.max(shake, 3);
        } else { p.x += (dx / d) * mv; p.y += (dy / d) * mv; }
        continue;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) { p.done = true; continue; }
      for (const e of G.en) {
        if (e.dead || p.hit.has(e)) continue; const [x, y] = posAt(e.d); if (Math.hypot(x - p.x, y - p.y) > e.r + 0.1) continue;
        p.hit.add(e);
        if (p.splash) { explode(x, y, p.splash, p.dmg, p.tw, p.bx); p.done = true; break; }
        dmgTo(e, p.dmg, p.tw, p.lead, p.bx);
        if (p.knock && !e.boss && !e.dead && Math.random() < p.knock) e.d = Math.max(0, e.d - 1.2);
        if (p.chain) { let c = 0; for (const o of G.en) { if (o.dead || o === e || p.hit.has(o)) continue; const [ox, oy] = posAt(o.d); if (Math.hypot(ox - x, oy - y) > 1.5) continue; G.fx.push({ bolt: [[x, y], [ox, oy]], l: 0.6 }); dmgTo(o, p.dmg * 0.5, p.tw, 1, p.bx); if (++c >= p.chain) break; } }
        if (--p.pierce <= 0) { p.done = true; break; }
      }
    }
    G.shots = G.shots.filter(s => !s.done); G.en = G.en.filter(e => !e.dead);
    if (G.run && !G.spawn.length && !G.en.length) waveDone();
    if (G.lives <= 0 && !G.over) { G.lives = 0; G.over = true; gameOver(); }
  }
  function waveDone() {
    G.run = false; G.storm = null;
    const bonus = Math.round((100 + G.wave) * gm(G.wave)); let mine = 0, intr = 0;
    for (const t of G.towers) if (t.s.kind === 'mine') { mine += t.s.inc; if (t.s.interest) intr += Math.min(t.s.imax, Math.floor(G.gold * t.s.interest)); G.txt.push({ x: t.x + 0.5, y: t.y, t: 1.6, s: '+' + t.s.inc, c: '#ffd23f', gold: 1 }); }
    G.gold += bonus + mine + intr; G.score += G.wave * 100;
    G.txt.push({ x: COLS / 2, y: ROWS / 2, t: 2, s: `Welle geschafft! +${bonus + mine + intr} 🪙`, c: '#3dff8a', big: 1 });
    if (auto) setTimeout(() => { if (G && !G.run && !G.over && auto) startWave(); }, 1200);
    hud();
  }
  let shake = 0, auto = false;
  function draw(t) {
    const k = cell * DPR;
    ctx.setTransform(1, 0, 0, 1, 0, 0); if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.85; if (shake < 0.3) shake = 0; }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? '#3f8f3a' : '#459a3f'; ctx.fillRect(x * k, y * k, k + 1, k + 1); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pth = () => { ctx.beginPath(); G.path.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, (x + 0.5) * k, (y + 0.5) * k)); };
    pth(); ctx.strokeStyle = '#7a5a33'; ctx.lineWidth = k * 0.92; ctx.stroke(); pth(); ctx.strokeStyle = '#c99a5c'; ctx.lineWidth = k * 0.78; ctx.stroke();
    pth(); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([k * 0.15, k * 0.35]); ctx.lineDashOffset = -t / 40; ctx.lineWidth = k * 0.08; ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `${k * 0.8}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏰', (G.castle[0] + 0.5) * k, (G.castle[1] + 0.5) * k);
    for (const [x, y, d] of G.deco) { if (G.towers.some(tw => tw.x === x && tw.y === y)) continue; ctx.font = `${k * 0.62}px serif`; ctx.fillText(d === 'tree' ? '🌳' : '🪨', (x + 0.5) * k, (y + 0.55) * k); }
    if (hover && !G.over && G.started) { const [hx, hy] = hover; const free = canBuild(hx, hy); const T = TW[sel]; ctx.fillStyle = free ? 'rgba(255,255,255,.18)' : 'rgba(255,60,60,.25)'; ctx.fillRect(hx * k, hy * k, k, k); if (free && !pick && T.s.r < 50) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc((hx + 0.5) * k, (hy + 0.5) * k, T.s.r * k, 0, 6.283); ctx.stroke(); } }
    for (const tw of G.towers) {
      const T = TW[tw.k], s = tw.e || tw.s, cx = (tw.x + 0.5) * k, cy = (tw.y + 0.5) * k;
      if (pick === tw && s.r < 50) { ctx.fillStyle = s.kind === 'aura' ? 'rgba(255,90,90,.1)' : 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(cx, cy, s.r * k, 0, 6.283); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, cy + k * 0.3, k * 0.36, k * 0.13, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = tw.boostT > 0 || G.rallyT > 0 ? '#8a6a2a' : '#5b5568'; ctx.beginPath(); ctx.arc(cx, cy, k * 0.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = T.col; ctx.beginPath(); ctx.arc(cx, cy, k * 0.32, 0, 6.283); ctx.fill();
      if (!T.noTarget && s.kind !== 'spike' && s.kind !== 'pulse') { ctx.save(); ctx.translate(cx, cy); ctx.rotate(tw.ang || 0); const kick = (tw.kick || 0) * k * 0.08; ctx.fillStyle = '#2b2735'; ctx.fillRect(-kick, -k * 0.07, k * 0.44, k * 0.14); ctx.restore(); }
      ctx.font = `${k * 0.4}px serif`; ctx.fillText(T.i, cx, cy + k * 0.02);
      if (tw.e && tw.e.buf) { ctx.font = `${k * 0.22}px serif`; ctx.fillText('🚩', cx + k * 0.32, cy + k * 0.3); }
      for (let i = 0; i < tw.up[0]; i++) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx - k * 0.38 + i * k * 0.11, cy - k * 0.44, k * 0.05, 0, 6.283); ctx.fill(); }
      for (let i = 0; i < tw.up[1]; i++) { ctx.fillStyle = '#5fd4ff'; ctx.beginPath(); ctx.arc(cx + k * 0.05 + i * k * 0.11, cy - k * 0.44, k * 0.05, 0, 6.283); ctx.fill(); }
    }
    for (const e of G.en) {
      const [x, y] = posAt(e.d), cx = x * k, cy = y * k + Math.sin(t / 120 + e.wob) * k * 0.04, R = e.r * k;
      ctx.globalAlpha = e.camo ? 0.55 + Math.sin(t / 200 + e.wob) * 0.15 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, y * k + R * 0.9, R * 0.9, R * 0.3, 0, 0, 6.283); ctx.fill();
      const gr = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, e.col); gr.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = gr;
      ctx.beginPath(); if (e.boss || e.t === 'golem' || e.lead) { ctx.roundRect ? ctx.roundRect(cx - R, cy - R * 0.8, R * 2, R * 1.6, R * 0.35) : ctx.rect(cx - R, cy - R * 0.8, R * 2, R * 1.6); } else ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
      if (e.camo) { ctx.strokeStyle = '#2f5a2a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(cx, cy, R * 0.75, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
      if (e.t === 'golem') { ctx.strokeStyle = 'rgba(40,20,0,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - R * 0.6, cy - R * 0.5); ctx.lineTo(cx - R * 0.1, cy); ctx.lineTo(cx - R * 0.4, cy + R * 0.5); ctx.stroke(); }
      if (e.fort) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, 6.283); ctx.stroke(); }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx - R * 0.3, cy - R * 0.15, R * 0.14, 0, 6.283); ctx.arc(cx + R * 0.3, cy - R * 0.15, R * 0.14, 0, 6.283); ctx.fill();
      if (e.boss) { ctx.font = `${R}px serif`; ctx.fillText(e.t === 'titan' ? '💀' : e.t === 'koloss' ? '👑' : '🛡️', cx, cy - R * 1.1); }
      if (e.regen) { ctx.font = `${R * 0.8}px serif`; ctx.fillText('💗', cx + R * 0.8, cy - R * 0.8); }
      if (e.sticky) { ctx.font = `${R * 0.9}px serif`; ctx.fillText('💣', cx - R * 0.8, cy - R * 0.8); }
      if (e.frz > 0) { ctx.fillStyle = 'rgba(180,230,255,.45)'; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, 6.283); ctx.fill(); }
      else if (e.slowT > 0) { ctx.strokeStyle = '#9fe3ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, 6.283); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (e.hp < e.max) { ctx.fillStyle = '#300'; ctx.fillRect(cx - R, cy - R - 8, R * 2, 4); ctx.fillStyle = e.hp / e.max > 0.4 ? '#3dff8a' : '#ff4d4d'; ctx.fillRect(cx - R, cy - R - 8, R * 2 * Math.max(0, e.hp / e.max), 4); }
    }
    for (const s of G.shots) {
      if (s.homing) {
        const col = s.k === 'rocket' ? '#ff6a3d' : '#222';
        ctx.strokeStyle = s.k === 'rocket' ? '#ffb347' : '#555'; ctx.globalAlpha = 0.5; ctx.lineWidth = k * 0.06; ctx.beginPath(); s.tr.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x * k, y * k)); ctx.lineTo(s.x * k, s.y * k); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s.x * k, s.y * k, k * 0.12, 0, 6.283); ctx.fill(); continue;
      }
      const x = s.x * k, y = s.y * k;
      if (s.k === 'dart' || s.k === 'spike' || s.k === 'blade') { const L = s.k === 'blade' ? 0.3 : 0.22; ctx.strokeStyle = s.fire ? '#ff9a3d' : s.k === 'dart' ? '#ffe8b0' : s.k === 'blade' ? '#f2f2ff' : '#bbb'; ctx.lineWidth = k * (s.k === 'blade' ? 0.09 : 0.06); ctx.beginPath(); ctx.moveTo(x - Math.cos(s.a) * L * k, y - Math.sin(s.a) * L * k); ctx.lineTo(x, y); ctx.stroke(); }
      else if (s.k === 'star') { ctx.save(); ctx.translate(x, y); ctx.rotate(t / 60); ctx.fillStyle = s.fire ? '#ff9a3d' : '#e8e8f0'; ctx.fillRect(-k * 0.12, -k * 0.03, k * 0.24, k * 0.06); ctx.fillRect(-k * 0.03, -k * 0.12, k * 0.06, k * 0.24); ctx.restore(); }
      else if (s.k === 'flame') { ctx.globalAlpha = Math.max(0.2, Math.min(1, s.life * 3)); ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(x, y, k * (0.08 + (1 - Math.min(1, s.life * 2)) * 0.12), 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = s.k === 'fire' ? '#ff7a2a' : '#c48bff'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, k * 0.1, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; }
    }
    for (const f of G.fx) {
      f.l -= 0.03;
      if (f.bolt) { ctx.strokeStyle = `rgba(210,170,255,${f.l})`; ctx.lineWidth = 3 * DPR; ctx.shadowColor = '#c18bff'; ctx.shadowBlur = 14; ctx.beginPath(); f.bolt.forEach(([x, y], i) => { const j = i ? (Math.random() - 0.5) * 0.2 : 0; (i ? ctx.lineTo : ctx.moveTo).call(ctx, (x + j) * k, (y + j) * k); }); ctx.stroke(); ctx.shadowBlur = 0; }
      else if (f.ring) { ctx.strokeStyle = `rgba(255,170,60,${f.l})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.ring[0] * k, f.ring[1] * k, f.R * k * (1.1 - f.l * 0.6), 0, 6.283); ctx.stroke(); }
      else if (f.pulse) { ctx.strokeStyle = `rgba(${f.c},${f.l})`; ctx.fillStyle = `rgba(${f.c},${f.l * 0.15})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.pulse[0] * k, f.pulse[1] * k, f.R * k * (1.05 - f.l * 0.5), 0, 6.283); ctx.fill(); ctx.stroke(); }
      else if (f.line) { ctx.strokeStyle = `rgba(255,250,200,${f.l})`; ctx.lineWidth = (f.w || 2) * DPR; ctx.beginPath(); ctx.moveTo(f.line[0] * k, f.line[1] * k); ctx.lineTo(f.line[2] * k, f.line[3] * k); ctx.stroke(); f.l -= 0.03; }
      else { f.x += f.vx; f.y += f.vy; ctx.globalAlpha = Math.max(0, f.l); ctx.fillStyle = f.c; ctx.fillRect(f.x * k - 2, f.y * k - 2, 4 * DPR, 4 * DPR); ctx.globalAlpha = 1; }
    }
    G.fx = G.fx.filter(f => f.l > 0);
    for (const x of G.txt) { x.t -= 0.02; x.y -= 0.012; ctx.globalAlpha = Math.max(0, Math.min(1, x.t)); ctx.fillStyle = x.c; ctx.font = `800 ${x.big ? k * 0.7 : x.gold ? k * 0.38 : k * 0.28}px Figtree, sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(x.s, x.x * k, x.y * k); ctx.fillText(x.s, x.x * k, x.y * k); ctx.globalAlpha = 1; }
    G.txt = G.txt.filter(x => x.t > 0);
  }
  let DPR = 1, hover = null;
  function size() { if (!cv) return; DPR = Math.min(2, window.devicePixelRatio || 1); const w = cv.parentElement.clientWidth; cell = w / COLS; cv.width = Math.round(w * DPR); cv.height = Math.round(cell * ROWS * DPR); cv.style.height = cell * ROWS + 'px'; }
  const canBuild = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !G.onPath.has(x + ',' + y) && !G.towers.some(t => t.x === x && t.y === y);
  const value = t => Math.round(t.spent * 0.7);
  const upState = (t, p) => (t.up[p] >= 4 ? 'max' : t.up[p] + 1 > 2 && t.up[1 - p] > 2 ? 'lock' : 'ok');
  function pathHTML(t, p) {
    const T = TW[t.k], n = t.up[p], st = upState(t, p);
    const got = T.up[p].slice(0, n).map(u => u.n).join(' · ');
    let act;
    if (st === 'max') act = '<span class="done">✔ Voll ausgebaut</span>';
    else if (st === 'lock') act = '<span class="done">🔒 Gesperrt – nur ein Pfad darf über Stufe 2</span>';
    else { const u = T.up[p][n], c = price(u.c); act = `<button class="btn small" data-twup="${p}" data-cost="${c}">⬆ ${h(u.n)} · ${c} 🪙</button><small>${h(u.d)}</small>`; }
    return `<div class="tw-path ${p ? 'b' : ''}"><div class="tw-row"><span class="pips">${[0, 1, 2, 3].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><b>${h(T.pn[p])}</b></div>${got ? `<small>${h(got)}</small>` : ''}${act}</div>`;
  }
  function hud() {
    if (!page || !G) return; const e = page.querySelector('[data-twhud]'); if (!e) return;
    const eh = `<span>❤️ ${Math.max(0, Math.ceil(G.lives))}</span><span>🪙 ${Math.floor(G.gold)}</span><span>🌊 Welle ${G.wave}</span><span>⭐ ${G.score}</span>`; if (e._h !== eh) { e.innerHTML = eh; e._h = eh; }
    page.querySelectorAll('[data-twb]').forEach(b => { b.classList.toggle('on', b.dataset.twb === sel && !pick); b.disabled = G.gold < price(TW[b.dataset.twb].c); });
    const s = page.querySelector('[data-twsel]');
    // Nur neu aufbauen, wenn sich der Aufbau ändert (sonst gehen Klicks verloren, siehe v58). Gold-abhängige Knöpfe werden unten nur umgeschaltet.
    const waveBtn = `<button class="btn small" data-tw="wave" ${G.run || G.over || !G.started ? 'disabled' : ''}>▶ ${G.wave ? 'Nächste Welle' : 'Erste Welle starten'}</button>`;
    let sh;
    if (pick) {
      const T = TW[pick.k];
      sh = `<div class="tw-row">${waveBtn}<b>${T.i} ${T.n}</b><span class="note" data-twpops></span><span style="flex:1"></span>${T.noTarget ? '' : `<button class="btn ghost small" data-tw="mode" title="Welchen Gegner der Turm angreift">🎯 ${MODE[pick.mode]}</button>`}<button class="btn ghost small" data-tw="sell">Verkaufen (+${value(pick)})</button><button class="btn ghost small" data-tw="desel">✕</button></div>
        <div class="tw-up">${pathHTML(pick, 0)}${pathHTML(pick, 1)}</div>`;
    } else {
      sh = `<div class="tw-row">${waveBtn}<button class="btn ghost small" data-tw="speed">⏩ ${G.speed}×</button><button class="btn ghost small" data-tw="auto">${auto ? '🔁 Auto an' : '🔁 Auto aus'}</button><button class="btn ghost small" data-tw="help">❓ Gegner</button><span class="note">Turm wählen, aufs Gras tippen · Turm antippen = ausbauen · Leertaste = Welle</span></div>
        <div class="note">Nächste Welle ${G.wave + 1}: ${h(preview(G.wave + 1))}</div>`;
    }
    if (s._h !== sh) { s.innerHTML = sh; s._h = sh; }
    s.querySelectorAll('[data-cost]').forEach(b => { b.disabled = G.gold < +b.dataset.cost; });
    const pp = s.querySelector('[data-twpops]'); if (pp && pick) pp.textContent = `Besiegt: ${pick.pops}`;
    const bar = page.querySelector('[data-twabs]'), A = G.towers.filter(t => t.s.ab), ak = A.map(t => t.id + t.s.ab).join(',');
    if (bar._k !== ak) { bar._k = ak; bar.innerHTML = A.map(t => `<button class="btn small" data-twab="${t.id}">${AB[t.s.ab].i} ${AB[t.s.ab].n}<small></small></button>`).join(''); bar.hidden = !A.length; }
    bar.querySelectorAll('[data-twab]').forEach(b => { const t = G.towers.find(x => x.id === +b.dataset.twab); if (!t) return; const r = Math.ceil(t.abCd || 0); b.disabled = r > 0 || G.over; b.querySelector('small').textContent = r > 0 ? `${r} s` : 'bereit'; });
  }
  function renderShop() {
    const el = page.querySelector('.tw-shop');
    el.innerHTML = KEYS.map((k, i) => { const T = TW[k]; return `<button data-twb="${k}" title="${h(T.d)}"><kbd>${(i + 1) % 10}</kbd><span class="i">${T.i}</span>${T.n}<small>${price(T.c)} 🪙<span class="d"> · ${T.d}</span></small></button>`; }).join('');
  }
  function startScreen() {
    const box = page.querySelector('.tw-cv'); box.querySelectorAll('.tw-ov').forEach(x => x.remove());
    const ov = document.createElement('div'); ov.className = 'tw-ov'; ov.dataset.twstart = '1';
    const paint = () => {
      ov.innerHTML = `<h2>🏰 Turmwacht</h2><p>Wähle Karte und Schwierigkeit.</p>
        <div class="tw-opt">${MAPS.map((m, i) => `<button class="btn small ghost ${i === opt.map ? 'on' : ''}" data-twmap="${i}">${m.n}<small>${m.lvl}</small></button>`).join('')}</div>
        <div class="tw-opt">${Object.entries(DIFF).map(([k, D]) => `<button class="btn small ghost ${k === opt.diff ? 'on' : ''}" data-twdiff="${k}">${D.n}<small>${D.lives} ❤️ · Preise ${D.pm < 1 ? '−15 %' : D.pm > 1 ? '+8 %' : 'normal'}</small></button>`).join('')}</div>
        <button class="btn" data-tw="go">▶ Los geht's</button><p class="note" style="color:#ddd">Rangliste: nur „Mittel“ und „Schwer“ zählen.</p>`;
    };
    paint(); box.appendChild(ov); ov._paint = paint;
  }
  function helpScreen() {
    const box = page.querySelector('.tw-cv'); const ov = document.createElement('div'); ov.className = 'tw-ov fix';
    ov.innerHTML = `<h2>❓ Gegner</h2><div class="tw-help">${Object.values(EN).map(E => `<p><i style="background:${E.col}"></i><b>${E.n}</b> – ${Math.round(E.hp)} LP${E.lead ? ', <b>Blei</b>: nur Explosionen, Magie, Blitz, Feuer und Panzerbrecher schaden ihm' : ''}${E.boss ? ', <b>Boss</b>' : ''}${E.kids ? ` · zerplatzt in ${E.kids.length}× ${EN[E.kids[0]].n}` : ''} · kostet ${lifeCost(Object.keys(EN).find(k => EN[k] === E))} ❤️</p>`).join('')}
      <p>👻 <b>Getarnt</b>: nur Türme mit Tarnungs-Erkennung zielen auf sie (Ninja, Falkenauge, Nachtsicht, Arkane Sicht, Plasma, Späher-Banner). Explosionen und Ringe treffen sie trotzdem.</p>
      <p>💗 <b>Nachwachsend</b>: heilt sich, wenn er kurz nicht getroffen wird. · 🟡 <b>Verstärkt</b>: doppelte Lebenspunkte.</p>
      <p>Jeder Turm hat zwei Ausbaupfade mit 4 Stufen – aber nur einer davon darf über Stufe 2. Stufe 4 bringt oft eine Fähigkeit.</p></div><button class="btn" data-tw="closehelp">Schließen</button>`;
    box.appendChild(ov);
  }
  async function gameOver() {
    hud(); const box = page.querySelector('.tw-cv'); const D = DIFF[opt.diff];
    const ov = document.createElement('div'); ov.className = 'tw-ov'; ov.innerHTML = `<h2>🏰 Die Burg ist gefallen!</h2><p>Du hast <b>Welle ${G.wave}</b> erreicht (${D.n}, ${MAPS[opt.map].n}) · ${G.kills} Gegner besiegt · ⭐ ${Math.round(G.score * D.sc)}</p><div data-twtop class="tw-top10">Rangliste wird geladen …</div><button class="btn" data-tw="new">Nochmal spielen</button>`;
    box.appendChild(ov);
    const ranked = konto() && opt.diff !== 'leicht';
    const r = ranked ? await call('td_submit', { wave: G.wave, score: Math.round(G.score * D.sc) }) : await call('td_top', {});
    const el = ov.querySelector('[data-twtop]'); if (!el) return;
    const L = r.top || []; el.innerHTML = `<b>🏆 Beste Wellen</b>${L.slice(0, 8).map((x, i) => `<p><span>${i + 1}. ${h(x.name)}</span><b>Welle ${x.w}</b></p>`).join('') || '<p>Noch keine Einträge.</p>'}${!konto() ? '<p class="note">Melde dich im Hub an, um in die Rangliste zu kommen.</p>' : opt.diff === 'leicht' ? '<p class="note">Auf „Leicht“ zählt die Rangliste nicht.</p>' : ''}`;
  }
  function frame(t) {
    if (!page || page.hidden) { raf = null; return; }
    let dt = Math.min(0.05, (t - (last || t)) / 1000) * G.speed; last = t;
    if (!G.over && G.started) { buffs(); while (dt > 0) { const d = Math.min(0.02, dt); step(d); dt -= d; if (G.over) break; } }
    draw(t); if ((frame.n = (frame.n || 0) + 1) % 10 === 0) hud();
    raf = requestAnimationFrame(frame);
  }
  function upgrade(p) {
    if (!pick || upState(pick, p) !== 'ok') return; const u = TW[pick.k].up[p][pick.up[p]], c = price(u.c); if (G.gold < c) return;
    G.gold -= c; pick.spent += c; pick.up[p]++; pick.s = calc(pick); if (pick.s.ab && pick.abK !== pick.s.ab) { pick.abK = pick.s.ab; pick.abCd = AB[pick.s.ab].cd * 0.5; } buffs();
    const [x, y] = [pick.x + 0.5, pick.y + 0.5]; for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28; G.fx.push({ x, y, vx: Math.cos(a) * 0.05, vy: Math.sin(a) * 0.05, l: 0.9, c: p ? '#5fd4ff' : '#ffd23f' }); }
    hud();
  }
  function open() {
    if (!page) {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      page = document.createElement('main'); page.id = 'turmwacht'; page.hidden = true; document.body.insertBefore(page, q('#picker'));
      page.innerHTML = `<div class="tw-top"><button class="btn ghost small" data-tw="back">‹ Spiele</button><h2>🏰 Turmwacht</h2><div class="tw-hud" data-twhud></div></div>
        <div class="tw-cv"><canvas></canvas></div>
        <div class="tw-abs" data-twabs hidden></div>
        <div class="tw-sel" data-twsel></div>
        <div class="tw-shop"></div>`;
      cv = page.querySelector('canvas'); ctx = cv.getContext('2d');
      const cell0 = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * COLS), Math.floor((e.clientY - r.top) / r.height * ROWS)]; };
      cv.addEventListener('pointermove', e => { hover = cell0(e); });
      cv.addEventListener('pointerleave', () => { hover = null; });
      cv.addEventListener('click', e => {
        if (G.over || !G.started) return; const [x, y] = cell0(e); const tw = G.towers.find(t => t.x === x && t.y === y);
        if (tw) { pick = pick === tw ? null : tw; hud(); return; }
        if (pick) { pick = null; hud(); return; }
        if (!canBuild(x, y)) return; const T = TW[sel], c = price(T.c); if (G.gold < c) { say('Nicht genug Gold.'); return; }
        G.gold -= c; const nt = { id: ++G.tid, k: sel, x, y, up: [0, 0], cd: 0, ang: -Math.PI / 2, spent: c, pops: 0, mode: 'first', abCd: 0, boostT: 0 }; nt.s = calc(nt); G.towers.push(nt); buffs();
        G.deco = G.deco.filter(d => d[0] !== x || d[1] !== y);
        for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28; G.fx.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * 0.04, vy: Math.sin(a) * 0.04, l: 0.8, c: '#fff6c8' }); }
        hud();
      });
      page.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.twb) { sel = b.dataset.twb; pick = null; hud(); return; }
        if (b.dataset.twup) { upgrade(+b.dataset.twup); return; }
        if (b.dataset.twab) { const t = G.towers.find(x => x.id === +b.dataset.twab); if (t && t.s.ab && !(t.abCd > 0) && !G.over) { AB[t.s.ab].go(t); t.abCd = AB[t.s.ab].cd; hud(); } return; }
        if (b.dataset.twmap || b.dataset.twdiff) { if (b.dataset.twmap) opt.map = +b.dataset.twmap; else opt.diff = b.dataset.twdiff; try { localStorage.setItem('fsg.tw.opt', JSON.stringify(opt)); } catch {} newGame(); renderShop(); const ov = b.closest('.tw-ov'); if (ov && ov._paint) ov._paint(); hud(); return; }
        const a = b.dataset.tw;
        if (a === 'back') close(); else if (a === 'wave') startWave(); else if (a === 'speed') { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; hud(); } else if (a === 'auto') { auto = !auto; hud(); if (auto && !G.run) startWave(); }
        else if (a === 'go') { b.closest('.tw-ov').remove(); G.started = true; hud(); }
        else if (a === 'help') helpScreen(); else if (a === 'closehelp') b.closest('.tw-ov').remove();
        else if (a === 'mode' && pick) { const ks = Object.keys(MODE); pick.mode = ks[(ks.indexOf(pick.mode) + 1) % ks.length]; hud(); }
        else if (a === 'sell' && pick) { G.gold += value(pick); G.towers = G.towers.filter(t => t !== pick); pick = null; buffs(); hud(); }
        else if (a === 'desel') { pick = null; hud(); }
        else if (a === 'new') { newGame(); pick = null; auto = false; startScreen(); hud(); }
      });
      addEventListener('resize', size);
      addEventListener('keydown', e => {
        if (!page || page.hidden || e.target.closest('input,textarea')) return;
        if (e.key === ' ') { e.preventDefault(); startWave(); return; }
        const n = Number(e.key); if (e.key.length === 1 && !isNaN(n)) { const k = KEYS[(n + 9) % 10]; if (k) { sel = k; pick = null; hud(); } }
        if (e.key === 'Escape' && pick) { pick = null; hud(); }
      });
      newGame(); renderShop(); startScreen();
    }
    const hub = q('#hub'); if (hub) hub.hidden = true;
    page.hidden = false; scrollTo(0, 0); size(); hud(); last = 0; if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() { if (page) page.hidden = true; const hub = q('#hub'); if (hub) hub.hidden = false; }
  document.addEventListener('click', e => { if (e.target.closest('[data-tw-open]')) open(); });
  window.Turmwacht = { open, isOpen: () => !!(page && !page.hidden), _dbg: () => ({ G, opt, TW, upgrade, startWave, step, buffs, calc, setPick: t => { pick = t; } }) };
})();
