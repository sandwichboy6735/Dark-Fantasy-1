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
    if (this.nextCaw < 0) { if (env.night < 0.8) this.caw(); this.nextCaw = 20 + Math.random() * 35; }
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

  caw() {
    if (!this.ctx) return;
    const p = this.pan(Math.random() * 1.6 - 0.8); p.connect(this.master); p.connect(this.reverb);
    for (let k = 0; k < 2 + (Math.random() < 0.5 ? 1 : 0); k++) {
      const t = this.ctx.currentTime + k * 0.38;
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(720, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.26);
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 2;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(f).connect(g).connect(p); o.start(t); o.stop(t + 0.32);
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

  materialFreq(id) {
    // soft materials low, stone mid, glass/crystal bright
    if ([1, 2, 5, 19, 20, 30, 35].includes(id)) return 700;
    if ([7, 22, 24, 25, 26, 29, 31, 34].includes(id)) return 2400;
    if ([13, 23, 11].includes(id)) return 5000;
    if ([6, 8, 21, 36, 38].includes(id)) return 1100;
    return 1600;
  }
  breakSound(id) { this.thud(this.materialFreq(id), 0.22, 0.35); if ([13, 23].includes(id)) this.chime(); }
  placeSound(id) { this.thud(this.materialFreq(id) * 0.6, 0.12, 0.3); }
  step(id) { this.thud(this.materialFreq(id) * 0.5, 0.09, 0.07); }
  hit(id) { this.thud(this.materialFreq(id) * 0.8, 0.05, 0.08); }
}
