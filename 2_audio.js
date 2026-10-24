// Teil 2: Audio (Soundeffekte, Musik, Lautstärke)
// Teil von Ritterlauf. Der Server setzt alle Teile in dieser Reihenfolge zu /ritter.js zusammen:
// 1_spiel.js → 2_audio.js → 3_grafik.js → 4_oberflaeche.js. Einzeln ist eine Datei kein gültiges Skript.

  /* ---------- Soundeffekte (werden live erzeugt, leise und weich) ---------- */
  const SND = (() => {
    let ac = null, master = null, nbuf = null, sbus = null;
    let on = true; try { on = localStorage.getItem('fsg.ritter.snd') !== '0'; } catch {}
    const vol = { m: 0.8, s: 1 }; try { const v = JSON.parse(localStorage.getItem('fsg.ritter.vol') || 'null'); if (v) { if (v.m >= 0 && v.m <= 1) vol.m = v.m; if (v.s >= 0 && v.s <= 1) vol.s = v.s; } } catch {}
    const last = {};
    function init() {
      if (ac) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.32 * vol.s;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; master.connect(comp); comp.connect(ac.destination);
      sbus = ac.createGain(); sbus.gain.value = vol.s; sbus.connect(comp);
      nbuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    function unlock() { try { init(); if (ac && ac.state === 'suspended') ac.resume(); if (ac) { loadBank(); if (window.MUS) MUS.prime(); } } catch {} }
    function setVol(k, v) { vol[k] = Math.max(0, Math.min(1, v)); try { localStorage.setItem('fsg.ritter.vol', JSON.stringify(vol)); } catch {} if (k === 's' && master) { master.gain.value = 0.32 * vol.s; sbus.gain.value = vol.s; } if (k === 'm' && window.MUS) MUS.apply(); }
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
    // Echte Geräusche (kurze Dateien, einmal geladen). Lautstärke je Datei angeglichen.
    const BANK = { hit1: 0.6, hit2: 0.55, hit3: 0.6, bogen: 0.6, magie1: 0.38, magie2: 0.38, schild: 0.45, gold: 0.32, seele: 0.55, teleport: 0.6, aufstehen: 0.75, lagerfeuer: 0.55 };
    const buf = {}; let banked = false, voices = 0;
    function loadBank() {
      if (banked || !ac) return; banked = true;
      for (const n of Object.keys(BANK)) fetch(`/sounds/fx_${n}.mp3?v=${SFX_V}`).then(r => (r.ok ? r.arrayBuffer() : null)).then(b => b && new Promise((ok, no) => { const p = ac.decodeAudioData(b, ok, no); if (p && p.then) p.then(ok, no); })).then(d => { if (d) { buf[n] = d; if (n === 'lagerfeuer') ambApply(); } }).catch(() => {});
    }
    function sample(n, v = 1, rate = 1, busy = 0) {
      const b = buf[n]; if (!b) return false; if (busy && voices >= busy) return true;
      const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = b; src.playbackRate.value = rate; g.gain.value = BANK[n] * v;
      src.connect(g); g.connect(sbus); voices++; src.onended = () => { voices--; try { g.disconnect(); } catch {} }; src.start(); return true;
    }
    // Wer welches Geräusch beim Treffer macht. Ohne Eintrag: der leise Synth-Treffer.
    const HITS = { r: ['hit1', 'hit2', 'hit3'], t: ['hit1', 'hit3'], d: ['hit3', 'hit1'], a: ['hit3'], w: ['schild'], s: ['bogen'], m: ['magie1', 'magie2'] };
    const lastK = {};
    const pick = a => a[Math.floor(Math.random() * a.length)], vary = () => 0.93 + Math.random() * 0.14;
    // Gegen Klangbrei: pro Held höchstens alle 0,3 s ein Treffer-Geräusch, insgesamt alle 0,07 s und nie mehr als 4 gleichzeitig
    function heroHit(n, k) {
      const now = ac.currentTime, set = HITS[k], crit = n === 'crit';
      if (!set || !buf[set[0]]) return false;
      if (lastK[k] && now - lastK[k] < (crit ? 0.18 : 0.3)) return true;
      if (last.anyHit && now - last.anyHit < 0.07) return true;
      lastK[k] = now; last.anyHit = now;
      sample(crit && set.includes('hit2') ? 'hit2' : pick(set), crit ? 1.35 : 1, crit ? 0.9 * vary() : vary(), 4);
      return true;
    }
    function play(n, k) {
      if (!on || !ac || ac.state !== 'running' || document.hidden) return;
      if ((n === 'hit' || n === 'crit') && k && heroHit(n, k)) return;
      if (n === 'skill' && k === 'm' && buf.magie1) { if (!(last.mskill && ac.currentTime - last.mskill < 0.4)) { last.mskill = ac.currentTime; sample(pick(['magie1', 'magie2']), 1.5, 0.85); } return; }
      if (n === 'coin' && buf.gold) { const now = ac.currentTime; if (last.coin && now - last.coin < 0.16) return; last.coin = now; sample('gold', 1, vary(), 5); return; }
      if (n === 'soul' && buf.seele) { const now = ac.currentTime; if (last.soul && now - last.soul < 0.4) return; last.soul = now; sample('seele'); return; }
      if (BANK[n] && n !== 'lagerfeuer') { sample(n); return; }
      if (!P[n]) return;
      const now = ac.currentTime; if (last[n] && now - last[n] < (GAP[n] || 0.05)) return; last[n] = now;
      try { P[n](); } catch {}
    }
    // Lagerfeuer-Knistern als leise Schleife in der Lobby
    let ambWant = false, amb = null;
    function ambApply() {
      if (!ac || !sbus) return; const want = ambWant && on && !document.hidden && buf.lagerfeuer;
      if (want && !amb) { const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf.lagerfeuer; src.loop = true; g.gain.value = 0; src.connect(g); g.connect(sbus); src.start(); g.gain.setTargetAtTime(BANK.lagerfeuer, ac.currentTime, 0.6); amb = { src, g }; }
      else if (!want && amb) { const a = amb; amb = null; a.g.gain.setTargetAtTime(0, ac.currentTime, 0.3); setTimeout(() => { try { a.src.stop(); a.g.disconnect(); } catch {} }, 2000); }
    }
    document.addEventListener('visibilitychange', () => ambApply());
    function ambient(v) { if (v !== ambWant) { ambWant = v; ambApply(); } }
    return { play, ambient, unlock, setVol, vol, ctx: () => { init(); return ac; }, isOn: () => on, toggle() { on = !on; try { localStorage.setItem('fsg.ritter.snd', on ? '1' : '0'); } catch {} if (on) { unlock(); setTimeout(() => play('buy'), 60); } ambApply(); if (window.MUS) MUS.apply(); return on; } };
  })();

  // ---------- Musik: Streaming, Überblendung, Wiedereinstieg an der letzten Stelle ----------
  const SFX_V = 1; // bei neuen Effekt-Dateien erhöhen
  const MUSIC_V = 1; // bei neuen Musikdateien erhöhen, damit Browser sie neu laden
  const MUS = window.MUS = (() => {
    const LISTS = { lobby: ['lobby1', 'lobby2'], feldzug: ['feldzug1', 'feldzug2'], boss: ['boss'], albtraum: ['albtraum1', 'albtraum2'], wf: ['weltenfresser'], tempel: ['tempel'], defeat: ['niederlage'] };
    const RESUME = { lobby: 1, feldzug: 1, albtraum: 1, tempel: 1 };
    const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    const url = n => `/sounds/${n}.mp3?v=${MUSIC_V}`;
    // Jedes Musikstück wird nur einmal ganz geladen und im Browser gespeichert (Cache-Speicher).
    // Vorher wurde bei jedem Wechsel (Lager, Feldzug, Boss) neu gestreamt, das kostete viel Datenverkehr.
    const BLOB = {}, LOADING = {};
    function loadTrack(name) {
      if (BLOB[name]) return Promise.resolve(BLOB[name]);
      if (LOADING[name]) return LOADING[name];
      return (LOADING[name] = (async () => {
        const u = url(name); let r = null;
        try { const c = await caches.open('ritter-musik-' + MUSIC_V); r = await c.match(u); if (!r) { const f = await fetch(u); if (f.ok) { try { await c.put(u, f.clone()); } catch {} r = f; } } }
        catch { try { r = await fetch(u); } catch {} }
        if (!r || !r.ok) { delete LOADING[name]; return null; }
        try { return (BLOB[name] = URL.createObjectURL(await r.blob())); } catch { delete LOADING[name]; return null; }
      })());
    }
    let bus = null, slots = [], want = null, cur = null, pos = {}, primed = false, onEnd = null;
    function build() {
      if (bus) return true; const ac = SND.ctx(); if (!ac) return false;
      bus = ac.createGain(); bus.gain.value = 0; bus.connect(ac.destination);
      for (let i = 0; i < 3; i++) {
        const a = new Audio(); a.preload = 'none'; a.crossOrigin = 'anonymous'; a.loop = false;
        const g = ac.createGain(); g.gain.value = 0;
        try { ac.createMediaElementSource(a).connect(g); g.connect(bus); } catch { return false; }
        const sl = { a, g, name: null, tok: 0, busy: false, since: 0 };
        a.addEventListener('ended', () => { if (sl.busy && cur && cur.slot === sl) advance(true); });
        a.addEventListener('error', () => { if (sl.busy && cur && cur.slot === sl && sl.name) { sl.busy = false; } });
        slots.push(sl);
      }
      return true;
    }
    const audible = () => SND.isOn() && SND.vol.m > 0 && !document.hidden;
    function fade(g, to, tau) { const ac = SND.ctx(); g.gain.cancelScheduledValues(ac.currentTime); g.gain.setTargetAtTime(to, ac.currentTime, Math.max(0.05, tau)); }
    function release(sl, tau) {
      if (!sl.busy) return; sl.busy = false; const tok = ++sl.tok; fade(sl.g, 0, tau);
      setTimeout(() => { if (sl.tok === tok && !sl.busy) { try { sl.a.pause(); } catch {} } }, tau * 5000 + 100);
    }
    function grab() { return slots.find(x => !x.busy && x.a.paused) || slots.find(x => !x.busy) || slots.reduce((m, x) => (x.since < m.since ? x : m), slots[0]); }
    function startTrack(list, idx, at, tauIn) {
      const sl = grab(); const tok = ++sl.tok; sl.busy = true; sl.name = LISTS[list][idx]; sl.since = Date.now();
      const a = sl.a, name = sl.name; sl.g.gain.cancelScheduledValues(0); sl.g.gain.value = 0;
      try { a.pause(); } catch {}
      const begin = src => {
        if (sl.tok !== tok || !sl.busy) return;
        a.src = src;
        const go = () => { if (at > 0 && isFinite(a.duration) && at < a.duration - 4) { try { a.currentTime = at; } catch {} } const p = a.play(); if (p && p.catch) p.catch(() => { sl.busy = false; }); fade(sl.g, 1, tauIn); };
        if (at > 0) { a.addEventListener('loadedmetadata', go, { once: true }); a.load(); } else { go(); }
      };
      if (BLOB[name]) begin(BLOB[name]); else loadTrack(name).then(u => begin(u || url(name)));
      cur = { list, idx, slot: sl };
      return sl;
    }
    function leave(tau) {
      if (!cur) return; const sl = cur.slot;
      if (RESUME[cur.list] && sl.busy && sl.a.currentTime > 3 && isFinite(sl.a.duration) && sl.a.duration - sl.a.currentTime > 12) pos[cur.list] = { idx: cur.idx, t: Math.max(0, sl.a.currentTime - 1.5) }; else delete pos[cur.list];
      release(sl, tau); cur = null;
    }
    function advance(hard) {
      if (!cur) return; const L = LISTS[cur.list];
      if (cur.list === 'defeat') { const f = onEnd; leave(0.5); if (f) f(); return; }
      const old = cur.slot, d = old.a.duration, ov = hard || !isFinite(d) ? 0.2 : Math.min(6, d * 0.2);
      const idx = (cur.idx + 1) % L.length, list = cur.list;
      cur = null; release(old, ov / 3); startTrack(list, idx, 0, ov / 3);
    }
    function apply() {
      if (!bus) { if (!want || !build()) return; }
      const ok = audible();
      bus.gain.setTargetAtTime(ok ? SND.vol.m * 0.9 : 0, SND.ctx().currentTime, 0.15);
      if (!ok) { for (const sl of slots) if (sl.busy && cur && cur.slot === sl && !sl.a.paused) { try { sl.a.pause(); } catch {} } return; }
      if (want && !cur) { const r = pos[want]; startTrack(want, r ? r.idx : 0, r ? r.t : 0, 1.2); return; }
      if (cur && cur.slot.a.paused && cur.slot.busy) { const p = cur.slot.a.play(); if (p && p.catch) p.catch(() => {}); }
    }
    function set(st) {
      if (st === want && (cur || !st)) return;
      const first = want === null; want = st;
      if (!bus && !(st && primed && build())) return;
      const fast = st === 'boss' || st === 'defeat' || st === 'wf';
      leave(fast ? 0.35 : 1);
      if (st && audible()) { const r = pos[st]; startTrack(st, r ? r.idx : 0, r ? r.t : 0, fast ? 0.4 : 1.2); }
    }
    function tick() {
      if (!cur || !audible()) return; const sl = cur.slot, a = sl.a, d = a.duration;
      if (isFinite(d) && d > 0 && !a.paused && cur.list !== 'defeat') { const ov = Math.min(6, d * 0.2); if (d - a.currentTime < ov) advance(false); }
    }
    function prime() {
      if (primed) return; primed = true; if (!build()) return;
      for (const sl of slots) { try { sl.a.src = SILENT; const p = sl.a.play(); if (p && p.then) p.then(() => { if (!sl.busy) sl.a.pause(); }).catch(() => {}); } catch {} }
      if (want) { const w = want; want = null; set(w); }
    }
    document.addEventListener('visibilitychange', () => { if (bus) apply(); });
    return { set, tick, apply, prime, onEnd: f => { onEnd = f; }, state: () => want, playing: () => (cur ? cur.slot.name : null) };
  })();
  sfx = (n, k) => { if (active && !cine) SND.play(n, k); };
  document.addEventListener('pointerdown', () => SND.unlock(), true);
