// Werwolf: Nachts suchen sich die Werwölfe ein Opfer, tagsüber stimmt das Dorf ab, wer verbannt wird.
// Der Server ist der Erzähler. Rollen: Werwolf, Seherin, Hexe, Jäger, Dorfbewohner.
const SPEED = Number(process.env.FSG_SPEED) || 1;
const NIGHT_MS = 40000, DAWN_MS = 7000, DAY_MS = 100000, DUSK_MS = 7000, ROLE_MS = 8000, SHOT_MS = 20000;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const nameOf = (r, id) => (r.players.find(p => p.id === id) || {}).name || 'Jemand';
function schedule(r, ms, fn) {
  if (r.timer) clearTimeout(r.timer);
  r.timer = setTimeout(() => { r.timer = null; try { fn(); } catch (e) { console.error(e); } r.push(); }, ms / SPEED);
}
const ROLES = {
  wolf: { n: 'Werwolf', e: '🐺', d: 'Jede Nacht sucht ihr Werwölfe euch gemeinsam ein Opfer aus. Tagsüber tut ihr ganz unschuldig.' },
  seher: { n: 'Seherin', e: '🔮', d: 'Jede Nacht darfst du dir eine Person aussuchen und erfährst, ob sie ein Werwolf ist.' },
  hexe: { n: 'Hexe', e: '🧪', d: 'Du siehst nachts das Opfer der Werwölfe. Einmal im Spiel kannst du heilen, einmal vergiften.' },
  jaeger: { n: 'Jäger', e: '🏹', d: 'Wenn du stirbst, darfst du mit deinem letzten Schuss noch jemanden mitnehmen.' },
  dorf: { n: 'Dorfbewohner', e: '🧑‍🌾', d: 'Du hast keine besondere Fähigkeit – aber deine Stimme zählt! Findet die Werwölfe.' },
};
function deal(n) {
  const wolves = n <= 5 ? 1 : n <= 8 ? 2 : 3;
  const list = Array(wolves).fill('wolf'); list.push('seher');
  if (n >= 5) list.push('hexe');
  if (n >= 7) list.push('jaeger');
  while (list.length < n) list.push('dorf');
  return shuffle(list);
}
const alive = s => s.part.filter(id => s.alive[id]);
const wolvesAlive = s => alive(s).filter(id => s.role[id] === 'wolf');
function checkWin(r) {
  const s = r.state, w = wolvesAlive(s).length, o = alive(s).length - w;
  if (!w) return end(r, 'dorf'), true;
  if (w >= o) return end(r, 'wolf'), true;
  return false;
}
function end(r, win) {
  const s = r.state; if (r.timer) clearTimeout(r.timer); r.timer = null;
  s.phase = 'end'; s.deadline = null; s.win = win; r.status = 'ended';
  s.log.push(win === 'dorf' ? '🌅 Alle Werwölfe sind besiegt – das Dorf gewinnt!' : '🌑 Die Werwölfe haben das Dorf übernommen!');
}
function night(r) {
  const s = r.state; s.day++;
  s.phase = 'night'; s.deadline = Date.now() + NIGHT_MS; s.wv = {}; s.seenNow = null; s.seerDone = false; s.witch = { heal: false, poison: null, done: false };
  s.log.push(`🌙 Nacht ${s.day}: Das Dorf schläft ein …`);
  schedule(r, NIGHT_MS, () => dawn(r));
}
function wolfTarget(s) {
  const cnt = {}; for (const t of Object.values(s.wv)) if (s.alive[t]) cnt[t] = (cnt[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(cnt)); if (!max) return null;
  const top = Object.keys(cnt).filter(k => cnt[k] === max); return top.length === 1 ? top[0] : null;
}
function nightDone(s) {
  const wolves = wolvesAlive(s), tgt = wolfTarget(s);
  if (!wolves.every(w => s.wv[w]) || !tgt) return false;
  const seer = alive(s).find(id => s.role[id] === 'seher'); if (seer && !s.seerDone) return false;
  const hexe = alive(s).find(id => s.role[id] === 'hexe'); if (hexe && !s.witch.done && !(s.healUsed && s.poisonUsed)) return false;
  return true;
}
function kill(r, id, why) {
  const s = r.state; if (!id || !s.alive[id]) return;
  s.alive[id] = false; s.dead.push({ id, why, role: s.role[id], day: s.day });
  if (s.role[id] === 'jaeger') s.shoot = (s.shoot || []).concat(id);
}
function dawn(r) {
  const s = r.state; if (s.phase !== 'night') return;
  let tgt = wolfTarget(s);
  if (!tgt) { const votes = Object.values(s.wv).filter(t => s.alive[t]); tgt = votes.length ? pick(votes) : null; }
  const before = s.dead.length;
  if (tgt && !s.witch.heal) kill(r, tgt, 'wolf');
  if (s.witch.heal) s.healUsed = true;
  if (s.witch.poison) { kill(r, s.witch.poison, 'gift'); s.poisonUsed = true; }
  const died = s.dead.slice(before);
  s.news = died.length ? died.map(d => ({ id: d.id, role: d.role, why: d.why })) : [];
  s.log.push(died.length ? `☀️ Am Morgen wird ${died.map(d => nameOf(r, d.id)).join(' und ')} tot aufgefunden.` : '☀️ Ein Wunder – heute Nacht ist niemand gestorben!');
  s.phase = 'dawn'; s.deadline = Date.now() + DAWN_MS;
  schedule(r, DAWN_MS, () => { if (hunter(r, () => day(r))) return; if (!checkWin(r)) day(r); });
}
// Jäger: darf nach seinem Tod noch jemanden mitnehmen
function hunter(r, next) {
  const s = r.state; if (!s.shoot || !s.shoot.length) return false;
  s.hunter = s.shoot.shift(); s.phase = 'shot'; s.deadline = Date.now() + SHOT_MS; s.after = next;
  schedule(r, SHOT_MS, () => shot(r, null));
  return true;
}
function shot(r, target) {
  const s = r.state; if (s.phase !== 'shot') return;
  if (target && s.alive[target]) { kill(r, target, 'pfeil'); s.log.push(`🏹 Der Jäger ${nameOf(r, s.hunter)} reißt ${nameOf(r, target)} mit in den Tod.`); s.news = [{ id: target, role: s.role[target], why: 'pfeil' }]; }
  else s.log.push(`🏹 Der Jäger ${nameOf(r, s.hunter)} hat nicht mehr geschossen.`);
  const next = s.after; s.hunter = null; s.after = null;
  if (hunter(r, next)) return;
  if (!checkWin(r)) next();
}
function day(r) {
  const s = r.state;
  s.phase = 'day'; s.deadline = Date.now() + DAY_MS; s.votes = {};
  s.log.push('🗣️ Diskutiert im Chat und stimmt ab, wer verbannt wird.');
  schedule(r, DAY_MS, () => dusk(r));
}
function dusk(r) {
  const s = r.state; if (s.phase !== 'day') return;
  const cnt = {}; for (const [v, t] of Object.entries(s.votes)) if (s.alive[v] && s.alive[t]) cnt[t] = (cnt[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(cnt)), top = Object.keys(cnt).filter(k => cnt[k] === max);
  s.count = cnt; s.news = [];
  if (max && top.length === 1) { kill(r, top[0], 'dorf'); s.news = [{ id: top[0], role: s.role[top[0]], why: 'dorf' }]; s.log.push(`⚖️ Das Dorf verbannt ${nameOf(r, top[0])} – ${ROLES[s.role[top[0]]].e} ${ROLES[s.role[top[0]]].n}.`); }
  else s.log.push(max ? '⚖️ Gleichstand – heute wird niemand verbannt.' : '⚖️ Niemand hat abgestimmt.');
  s.phase = 'dusk'; s.deadline = Date.now() + DUSK_MS;
  schedule(r, DUSK_MS, () => { if (hunter(r, () => night(r))) return; if (!checkWin(r)) night(r); });
}

module.exports = {
  title: 'Werwolf', min: 4, seats: 12, roles: ROLES,
  start(r) {
    if (r.timer) clearTimeout(r.timer);
    const part = shuffle(r.players.map(p => p.id)), roles = deal(part.length), role = {}, al = {};
    part.forEach((id, i) => { role[id] = roles[i]; al[id] = true; });
    r.state = { part, role, alive: al, dead: [], day: 0, log: [], phase: 'roles', deadline: Date.now() + ROLE_MS, wv: {}, votes: {}, seen: {}, witch: {}, news: [] };
    r.status = 'playing';
    schedule(r, ROLE_MS, () => night(r));
  },
  onLeave(r, pid, name) {
    const s = r.state; if (!s || r.status !== 'playing' || !s.alive[pid]) return;
    s.alive[pid] = false; s.dead.push({ id: pid, why: 'weg', role: s.role[pid], day: s.day }); s.log.push(`🚪 ${name} hat das Dorf verlassen (${ROLES[s.role[pid]].n}).`);
    checkWin(r);
  },
  act(r, pid, a) {
    const s = r.state; if (!s || r.status !== 'playing') return 'quiet';
    const t = String(a.id || ''), me = s.role[pid];
    if (s.phase === 'shot' && a.type === 'shoot' && pid === s.hunter) return shot(r, s.alive[t] ? t : null); // Jäger ist schon tot
    if (!s.alive[pid]) return 'quiet';
    if (s.phase === 'night') {
      if (a.type === 'wolf' && me === 'wolf' && s.alive[t] && s.role[t] !== 'wolf') s.wv[pid] = t;
      else if (a.type === 'see' && me === 'seher' && !s.seerDone && s.alive[t] && t !== pid) { s.seerDone = true; (s.seen[pid] = s.seen[pid] || []).push({ id: t, wolf: s.role[t] === 'wolf', day: s.day }); }
      else if (a.type === 'heal' && me === 'hexe' && !s.healUsed) s.witch.heal = !s.witch.heal;
      else if (a.type === 'poison' && me === 'hexe' && !s.poisonUsed) s.witch.poison = s.alive[t] && t !== pid && s.witch.poison !== t ? t : null;
      else if (a.type === 'witchdone' && me === 'hexe') s.witch.done = true;
      else return 'quiet';
      if (nightDone(s) && s.closing !== 'n' + s.day) { s.closing = 'n' + s.day; s.deadline = Date.now() + 2500; schedule(r, 2500, () => dawn(r)); }
      return;
    }
    if (s.phase === 'day' && a.type === 'vote') {
      if (s.votes[pid] === t) delete s.votes[pid]; else if (s.alive[t] && t !== pid) s.votes[pid] = t; else return 'quiet';
      if (alive(s).every(id => s.votes[id]) && s.closing !== 'd' + s.day) { s.closing = 'd' + s.day; s.deadline = Date.now() + 3000; schedule(r, 3000, () => dusk(r)); }
      return;
    }
    return 'quiet';
  },
  winners(r) { const s = r.state; if (!s || !s.win) return []; return s.part.filter(id => (s.win === 'wolf') === (s.role[id] === 'wolf')); },
  view(r, pid) {
    const s = r.state; if (!s) return null;
    const me = s.role[pid], dead = s.part.includes(pid) && !s.alive[pid], ended = s.phase === 'end', all = ended || dead || !s.part.includes(pid);
    const players = s.part.map(id => {
      const p = { id, alive: !!s.alive[id] };
      if (all || id === pid || (me === 'wolf' && s.role[id] === 'wolf') || !s.alive[id]) p.role = s.role[id];
      const seen = (s.seen[pid] || []).find(x => x.id === id); if (seen && me === 'seher') p.seen = seen.wolf ? 'wolf' : 'gut';
      return p;
    });
    const v = { phase: s.phase, day: s.day, left: s.deadline ? Math.max(0, s.deadline - Date.now()) : null, me, alive: !!s.alive[pid], players, log: s.log.slice(-8), news: s.news, win: s.win || null, roleInfo: me ? ROLES[me] : null, spect: !s.part.includes(pid) };
    if (s.phase === 'night') {
      if (me === 'wolf' || all) { v.wv = s.wv; v.target = wolfTarget(s); }
      if (me === 'seher') { v.seerDone = s.seerDone; v.lastSeen = (s.seen[pid] || []).slice(-1)[0] || null; }
      if (me === 'hexe' && s.alive[pid]) { v.victim = wolfTarget(s); v.witch = s.witch; v.healUsed = !!s.healUsed; v.poisonUsed = !!s.poisonUsed; }
    }
    if (s.phase === 'day' || s.phase === 'dusk') { v.votes = s.votes; v.count = s.count || null; }
    if (s.phase === 'shot') v.hunter = s.hunter;
    return v;
  },
};
