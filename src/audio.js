// Fully procedural soundscape: drone, wind, a night choir, distant bells, ravens, whispers and block sounds.
export class Audio {
  constructor() {
    this.ctx = null; this.enabled = true; this.volume = 0.7;
    this.nextBell = 40; this.nextCaw = 15;
  }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
    this.muffle = ctx.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 20000;
    this.master.connect(this.muffle).connect(ctx.destination);

    // Reverb bus
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 4.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.reverb.buffer = ir;
    this.wet = ctx.createGain(); this.wet.gain.value = 0.55;
    this.reverb.connect(this.wet).connect(this.master);

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // Drone
    const droneLP = ctx.createBiquadFilter(); droneLP.type = 'lowpass'; droneLP.frequency.value = 260; droneLP.Q.value = 3;
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0.05;
    droneLP.connect(this.droneGain); this.droneGain.connect(this.master); this.droneGain.connect(this.reverb);
    for (const [f, type] of [[55, 'sawtooth'], [55.35, 'sawtooth'], [82.4, 'triangle'], [41.2, 'sine']]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(droneLP); o.start();
    }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain(); lfoG.gain.value = 120; lfo.connect(lfoG).connect(droneLP.frequency); lfo.start();

    // Wind
    const wind = ctx.createBufferSource(); wind.buffer = this.noiseBuf; wind.loop = true;
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.frequency.value = 500; this.windFilter.Q.value = 0.8;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.06;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.master); wind.start();

    // Night choir (A minor with a haunting 9th)
    this.choirGain = ctx.createGain(); this.choirGain.gain.value = 0;
    const choirLP = ctx.createBiquadFilter(); choirLP.type = 'lowpass'; choirLP.frequency.value = 1400;
    choirLP.connect(this.choirGain); this.choirGain.connect(this.reverb); this.choirGain.connect(this.master);
    for (const f of [110, 130.8, 164.8, 220, 246.9]) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det;
        const vib = ctx.createOscillator(); vib.frequency.value = 4 + Math.random(); const vg = ctx.createGain(); vg.gain.value = 3;
        vib.connect(vg).connect(o.detune); vib.start();
        const g = ctx.createGain(); g.gain.value = 0.12;
        o.connect(g).connect(choirLP); o.start();
      }
    }
    this.initSoundscape();
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  update(dt, env) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.035 + env.windStrength * 0.08, t, 1.5);
    this.windFilter.frequency.setTargetAtTime(350 + env.windStrength * 700 + Math.sin(t * 0.3) * 150, t, 1);
    this.choirGain.gain.setTargetAtTime(env.night * 0.022, t, 4);
    this.droneGain.gain.setTargetAtTime(0.035 + env.night * 0.03 + (env.cave ? 0.04 : 0), t, 3);
    this.muffle.frequency.setTargetAtTime(env.underwater ? 500 : 20000, t, 0.1);
    this.nextBell -= dt; this.nextCaw -= dt;
    if (this.nextBell < 0) { this.bell(); this.nextBell = 70 + Math.random() * 90; }
    if (this.nextCaw < 0) { if ((env.zones?.snow || 0) < 0.5) this.owl(); this.nextCaw = 25 + Math.random() * 40; }
    if (env.zones) this.soundscape(dt, env.zones);
    this.updateMusic();
  }

  env(dur, peak, attack = 0.005) {
    const g = this.ctx.createGain(); const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }
  noise(dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loopStart = Math.random() * 2; s.start(this.ctx.currentTime, Math.random() * 2, dur + 0.1); return s; }
  pan(v) { const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain(); if (p.pan) p.pan.value = v; return p; }

  bell() {
    if (!this.ctx) return;
    const out = this.env(9, 0.07, 0.01); const p = this.pan(Math.random() * 1.6 - 0.8);
    out.connect(p); p.connect(this.reverb); p.connect(this.master);
    for (const [ratio, amp] of [[1, 1], [2.01, 0.5], [2.74, 0.4], [3.93, 0.25], [5.4, 0.15], [0.5, 0.6]]) {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 196 * ratio;
      const g = this.ctx.createGain(); g.gain.value = amp; o.connect(g).connect(out); o.start(); o.stop(this.ctx.currentTime + 9);
    }
  }

  owl() {
    if (!this.ctx) return;
    const p = this.pan(Math.random() * 1.6 - 0.8); p.connect(this.master); p.connect(this.reverb);
    const notes = [[0, 0.35], [0.5, 0.2], [0.75, 0.55]];
    for (const [off, len] of notes) {
      const t = this.ctx.currentTime + off;
      const o = this.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(410, t); o.frequency.linearRampToValueAtTime(370, t + len);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(p); o.start(t); o.stop(t + len + 0.05);
    }
  }

  whisper() {
    if (!this.ctx) return;
    const p = this.pan(Math.random() * 2 - 1); p.connect(this.reverb); p.connect(this.master);
    const n = this.noise(2.5);
    const f1 = this.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 8;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 8; k++) f1.frequency.setValueAtTime(700 + Math.random() * 1800, t + k * 0.28);
    const g = this.env(2.4, 0.18, 0.4);
    n.connect(f1).connect(g).connect(p);
  }

  chime() {
    if (!this.ctx) return;
    const out = this.env(3, 0.05, 0.01); out.connect(this.reverb); out.connect(this.master);
    [659, 784, 988].forEach((f, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0, this.ctx.currentTime); g.gain.setValueAtTime(0.6, this.ctx.currentTime + i * 0.12);
      o.connect(g).connect(out); o.start(); o.stop(this.ctx.currentTime + 3);
    });
  }

  thud(freq, dur, amp) {
    if (!this.ctx) return;
    const n = this.noise(dur);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.env(dur, amp);
    n.connect(f).connect(g).connect(this.master);
    const s = this.ctx.createGain(); s.gain.value = 0.25; g.connect(s).connect(this.reverb);
  }

  step(soft) { this.thud(soft ? 500 : 900, 0.08, 0.05); }
  land() { this.thud(400, 0.25, 0.25); }

  lift() {
    if (!this.ctx) return;
    const n = this.noise(2.2);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
    const t = this.ctx.currentTime;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 1.6);
    const g = this.env(2, 0.25, 0.3);
    n.connect(f).connect(g); g.connect(this.master); g.connect(this.reverb);
    this.chime();
  }

  // Little syllable blips for dialogue, pitched per character
  talk(voice = 1, amp = 0.06) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'triangle';
    const base = 170 * voice * (0.85 + Math.random() * 0.3);
    o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * (0.9 + Math.random() * 0.3), t + 0.07);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(amp, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + 0.1);
  }

  // ================= Soundscape: each area has its own sounds =================
  initSoundscape() {
    const ctx = this.ctx;
    const loopNoise = (type, freq, q) => {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master); src.start();
      return { f, g };
    };
    this.water = loopNoise('lowpass', 420, 0.7);           // lapping water
    const wlfo = ctx.createOscillator(); wlfo.frequency.value = 0.35;
    const wlg = ctx.createGain(); wlg.gain.value = 180; wlfo.connect(wlg).connect(this.water.f.frequency); wlfo.start();
    this.fire = loopNoise('bandpass', 1800, 0.6);          // bonfire / torch hiss
    this.gust = loopNoise('bandpass', 900, 1.8);           // mountain gusts
    // Moon Circle hum
    this.hum = ctx.createGain(); this.hum.gain.value = 0; this.hum.connect(this.master); this.hum.connect(this.reverb);
    for (const f of [110, 164.8, 220.5]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.3; o.connect(g).connect(this.hum); o.start(); }
    this.tmr = {};
    this.music = null;
  }

  soundscape(dt, z) {
    const t = this.ctx.currentTime;
    this.water.g.gain.setTargetAtTime(z.lake * 0.09, t, 1);
    this.fire.g.gain.setTargetAtTime(z.fire * 0.05 + z.castle * 0.015, t, 0.8);
    this.gust.g.gain.setTargetAtTime((z.snow * 0.08 + z.high * 0.1) * (0.6 + 0.4 * Math.sin(t * 0.4)), t, 1.2);
    this.gust.f.frequency.setTargetAtTime(700 + 500 * Math.sin(t * 0.23), t, 1);
    this.hum.gain.setTargetAtTime(z.circle * 0.04, t, 1.5);
    this.choirGain.gain.setTargetAtTime(0.012 + (z.graves + z.queen) * 0.03, t, 3);
    const every = (key, rate, fn) => { // rate: average events per second
      if (rate <= 0) return;
      this.tmr[key] = (this.tmr[key] ?? Math.random() / rate) - dt;
      if (this.tmr[key] <= 0) { this.tmr[key] = (0.4 + Math.random() * 1.2) / rate; fn(); }
    };
    const calm = 1 - Math.max(z.snow, z.high);
    every('cricket', (z.village * 1.5 + z.lake * 0.8 + z.meadow * 1.2 + z.witch * 0.6) * calm, () => this.cricket(z.witch > 0.5 ? 3200 : 4600));
    every('frog', z.lake * 0.5 + z.witch * 0.15, () => this.frog());
    every('pop', z.fire * 3 + z.castle * 0.4, () => this.crackle());
    every('bubble', z.witch * 2.5, () => this.bubble());
    every('chatter', z.market * 1.6, () => this.chatter());
    every('musicbox', this.music ? 0 : z.village * 0.5, () => this.musicBoxPhrase());
    every('ghost', z.graves * 0.12, () => this.ghostSigh());
    every('chime', (z.graves + z.queen + z.circle * 0.5) * 0.35, () => this.windChime());
    every('knight', z.castle * 0.08, () => this.clank());
  }

  tone(freq, dur, type = 'sine', amp = 0.05, when = 0, dest = this.master, attack = 0.005) {
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(amp, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  cricket(f) {
    const p = this.pan(Math.random() * 2 - 1); p.connect(this.master);
    const n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) this.tone(f * (0.97 + Math.random() * 0.06), 0.04, 'sine', 0.012, i * 0.07, p, 0.004);
  }
  frog() {
    const p = this.pan(Math.random() * 2 - 1); p.connect(this.master); p.connect(this.reverb);
    for (let i = 0; i < 2; i++) {
      const o = this.tone(130 + Math.random() * 40, 0.14, 'sawtooth', 0.025, i * 0.18, p, 0.01);
      o.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + i * 0.18 + 0.14);
    }
  }
  crackle() {
    const n = this.noise(0.03);
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000 + Math.random() * 2000;
    const g = this.env(0.03 + Math.random() * 0.04, 0.05 + Math.random() * 0.08, 0.001);
    n.connect(f).connect(g).connect(this.master);
  }
  bubble() {
    const o = this.tone(300 + Math.random() * 300, 0.12, 'sine', 0.03, 0, this.master, 0.01);
    o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 500, this.ctx.currentTime + 0.1);
  }
  chatter() { const v = 0.6 + Math.random() * 0.9; const n = 3 + (Math.random() * 5 | 0); for (let i = 0; i < n; i++) setTimeout(() => this.talk(v, 0.025), i * 90); }
  musicBoxPhrase() {
    const scale = [659, 784, 880, 988, 1175, 1319, 1568];
    for (let i = 0; i < 5; i++) this.tone(scale[(Math.random() * scale.length) | 0], 1.2, 'sine', 0.018, i * 0.32, this.reverb, 0.003);
  }
  ghostSigh() {
    const o = this.tone(420, 2.4, 'sine', 0.025, 0, this.reverb, 0.8);
    o.frequency.linearRampToValueAtTime(260, this.ctx.currentTime + 2.4);
  }
  windChime() { for (let i = 0; i < 3; i++) this.tone([1318, 1568, 1760, 2093][(Math.random() * 4) | 0], 2.5, 'sine', 0.015, i * (0.15 + Math.random() * 0.3), this.reverb); }
  clank() { this.thud(3000, 0.06, 0.06); setTimeout(() => this.thud(2500, 0.05, 0.04), 120); }
  whoosh(amp = 0.15) {
    const n = this.noise(1.2); const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1;
    const t = this.ctx.currentTime; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1600, t + 0.6);
    const g = this.env(1, amp, 0.2); n.connect(f).connect(g).connect(this.master);
  }
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => { this.tone(f, 0.5, 'triangle', 0.06, i * 0.15, this.master); this.tone(f, 0.5, 'triangle', 0.03, i * 0.15, this.reverb); }); }
  ding() { this.tone(1568, 0.6, 'sine', 0.06); this.tone(2093, 0.8, 'sine', 0.04, 0.08); }

  // ================= Little tunes for joining in =================
  playMusic(name) {
    if (!this.ctx) return;
    const T = {
      // [midi note or null, beats]
      jig: { bpm: 280, inst: 'lute', drum: true, notes: [[74,1],[71,1],[67,1],[71,1],[74,1],[79,1],[78,2],[76,1],[74,1],[71,2],[69,1],[67,1],[69,1],[71,1],[72,2],[74,1],[76,1],[74,1],[71,1],[67,2],[69,1],[71,1],[69,1],[67,3]] },
      song: { bpm: 150, inst: 'lute', drum: false, notes: [[62,1],[65,1],[69,2],[67,1],[65,1],[64,2],[62,1],[64,1],[65,2],[64,1],[62,1],[61,2],[62,1],[65,1],[69,2],[72,1],[70,1],[69,2],[67,1],[65,1],[64,1],[62,1],[62,3],[null,1]] },
      race: { bpm: 220, inst: 'flute', drum: true, notes: [[72,1],[76,1],[79,1],[84,2],[83,1],[79,1],[76,2],[77,1],[81,1],[84,1],[86,2],[84,1],[81,1],[79,3],[null,1]] },
      seek: { bpm: 130, inst: 'flute', drum: false, notes: [[76,1],[79,1],[76,1],[72,2],[74,1],[76,1],[74,2],[71,2],[72,4],[null,2]] },
      lullaby: { bpm: 70, inst: 'flute', drum: false, notes: [[72,2],[76,1],[79,3],[77,1],[76,1],[74,3],[72,2],[74,1],[76,2],[72,1],[71,3],[null,2],[69,2],[72,1],[76,3],[74,1],[72,1],[71,2],[72,4],[null,3]] },
      boat: { bpm: 90, inst: 'flute', drum: false, notes: [[64,2],[67,1],[69,3],[67,1],[64,2],[62,3],[64,2],[67,1],[72,3],[71,1],[69,2],[67,4],[null,2]] },
    }[name];
    if (!T) return;
    this.music = { ...T, name, i: 0, next: this.ctx.currentTime + 0.1, beat: 60 / T.bpm };
  }
  stopMusic() { this.music = null; }
  updateMusic() {
    const m = this.music; if (!m) return;
    const now = this.ctx.currentTime;
    while (m.next < now + 0.3) {
      const [note, beats] = m.notes[m.i % m.notes.length];
      if (note !== null) {
        const f = 440 * Math.pow(2, (note - 69) / 12), dur = beats * m.beat;
        if (m.inst === 'lute') { this.toneAt(f, dur * 1.4, 'triangle', 0.05, m.next, 0.004); this.toneAt(f * 2, dur * 0.6, 'sine', 0.012, m.next, 0.004); }
        else this.toneAt(f, dur * 0.95, 'sine', 0.045, m.next, 0.04);
      }
      if (m.drum && m.i % 2 === 0) this.drumAt(m.next);
      m.next += beats * m.beat; m.i++;
    }
  }
  toneAt(freq, dur, type, amp, t, attack) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(amp, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); const r = this.ctx.createGain(); r.gain.value = 0.3; g.connect(r).connect(this.reverb);
    o.start(t); o.stop(t + dur + 0.05);
  }
  drumAt(t) {
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.25);
  }
}
