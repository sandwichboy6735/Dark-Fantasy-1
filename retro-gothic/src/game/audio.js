// Every sound is synthesised live with WebAudio: no files to load.
//   drone   low detuned saws through a slowly breathing filter (the causeway)
//   jig     a looping square-wave reel that swells near the tavern
//   sfx     dialogue blips, bell chimes, the fanfare and the Eye's rumble

let ctx = null;
let master;
let droneGain;
let jigGain;
let jigLevel = 0;
let dangerGain;
let dangerLevel = 0;
let quakeGain;
let frogLevel = 0;
let windGain;
let windLevel = 0;
let muted = false;

export function startAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      buildDrone();
      buildJig();
      buildDanger();
      buildQuake();
      buildFrogs();
      buildWind();
    }
    ctx.resume();
  } catch {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05);
  return muted;
}

function buildDrone() {
  droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 240;
  filter.Q.value = 4;
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoDepth.gain.value = 120;
  lfo.connect(lfoDepth).connect(filter.frequency);
  lfo.start();
  for (const freq of [55, 55.35, 82.4, 110.2]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start();
  }
  filter.connect(droneGain).connect(master);
}

// A reel in D dorian. 0 is a rest.
const MELODY = [62, 65, 69, 65, 62, 65, 69, 72, 71, 69, 67, 65, 64, 67, 69, 0, 62, 65, 69, 65, 62, 65, 69, 74, 72, 71, 69, 67, 65, 64, 62, 0];
const BASS = [38, 38, 43, 43, 36, 36, 45, 45];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function note(freq, start, length, type, volume, destination) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(volume, start);
  env.gain.exponentialRampToValueAtTime(0.001, start + length);
  osc.connect(env).connect(destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

function whoop(start, destination) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'square';
  const base = 500 + Math.random() * 300;
  osc.frequency.setValueAtTime(base, start);
  osc.frequency.exponentialRampToValueAtTime(base * 1.8, start + 0.12);
  osc.frequency.exponentialRampToValueAtTime(base * 0.9, start + 0.3);
  env.gain.setValueAtTime(0.2, start);
  env.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
  osc.connect(env).connect(destination);
  osc.start(start);
  osc.stop(start + 0.35);
}

function buildJig() {
  jigGain = ctx.createGain();
  jigGain.gain.value = 0;
  jigGain.connect(master);
  const step = 0.16;
  let i = 0;
  let next = ctx.currentTime + 0.1;
  setInterval(() => {
    if (jigLevel < 0.002) {
      next = ctx.currentTime + 0.1;
      return;
    }
    while (next < ctx.currentTime + 0.4) {
      const n = MELODY[i % MELODY.length];
      if (n) note(midi(n), next, step * 0.9, 'square', 0.25, jigGain);
      // Now and then a goblin whoops along.
      if (i % 16 === 8 && Math.random() < 0.5) whoop(next, jigGain);
      if (i % 4 === 0) note(midi(BASS[(i / 4) % BASS.length]), next, step * 3.5, 'triangle', 0.5, jigGain);
      i++;
      next += step;
    }
  }, 100);
}

// A tense pulse that rises under everything while something is after you.
function buildDanger() {
  dangerGain = ctx.createGain();
  dangerGain.gain.value = 0;
  dangerGain.connect(master);
  const pattern = [40, 40, 43, 40, 46, 40, 43, 39];
  let i = 0;
  let next = ctx.currentTime + 0.1;
  setInterval(() => {
    if (dangerLevel < 0.01) {
      next = ctx.currentTime + 0.1;
      return;
    }
    const step = 0.2 - dangerLevel * 0.07;
    while (next < ctx.currentTime + 0.4) {
      note(midi(pattern[i % pattern.length]), next, step * 0.8, 'sawtooth', 0.5, dangerGain);
      if (i % 2 === 0) note(midi(pattern[i % pattern.length] + 24), next, 0.05, 'square', 0.15, dangerGain);
      i++;
      next += step;
    }
  }, 100);
}

// A continuous low roar of falling stone, for the escape.
function buildQuake() {
  const length = 3;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise
    data[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 160;
  quakeGain = ctx.createGain();
  quakeGain.gain.value = 0;
  src.connect(filter).connect(quakeGain).connect(master);
  src.start();
}

export function setQuake(level) {
  if (!ctx) return;
  quakeGain.gain.setTargetAtTime(0.5 * level, ctx.currentTime, 0.4);
}

export function setDanger(level) {
  if (!ctx) return;
  dangerLevel = level;
  dangerGain.gain.setTargetAtTime(0.09 * level, ctx.currentTime, 0.3);
}

// Frogs in the fen: now and then a ribbit somewhere out in the dark.
function buildFrogs() {
  const out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(master);
  setInterval(() => {
    if (frogLevel < 0.01 || muted || Math.random() > 0.45) return;
    const t = ctx.currentTime + Math.random() * 0.3;
    const base = 110 + Math.random() * 120;
    const volume = frogLevel * (0.05 + Math.random() * 0.08);
    for (let i = 0; i < (Math.random() < 0.5 ? 2 : 3); i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(base, t + i * 0.13);
      osc.frequency.exponentialRampToValueAtTime(base * 0.7, t + i * 0.13 + 0.08);
      env.gain.setValueAtTime(volume, t + i * 0.13);
      env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + 0.09);
      osc.connect(env).connect(out);
      osc.start(t + i * 0.13);
      osc.stop(t + i * 0.13 + 0.1);
    }
  }, 350);
}

// Wind over the mountain: looping noise through a band-pass filter that wanders.
function buildWind() {
  const length = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500;
  filter.Q.value = 1.4;
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = 0.13;
  lfoDepth.gain.value = 260;
  lfo.connect(lfoDepth).connect(filter.frequency);
  lfo.start();
  windGain = ctx.createGain();
  windGain.gain.value = 0;
  src.connect(filter).connect(windGain).connect(master);
  src.start();
}

// `tavern` is 0 on the causeway and 1 in the tavern yard.
export function setAmbience(tavern, playing) {
  if (!ctx) return;
  const t = ctx.currentTime;
  droneGain.gain.setTargetAtTime(playing ? 0.05 * (1 - tavern * 0.7) : 0.015, t, 0.6);
  jigLevel = playing ? 0.06 * tavern : 0;
  jigGain.gain.setTargetAtTime(jigLevel, t, 0.6);
  frogLevel = 0;
  windGain.gain.setTargetAtTime(0, t, 0.6);
}

// The other chapters' soundscapes: 'fen' (frogs over a low drone), 'peak' (wind)
// or 'dawn' (a breeze, and the reel again, far off). `gust` (0..1) makes the wind roar.
export function setChapterAmbience(name, playing, gust = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  droneGain.gain.setTargetAtTime(playing && name !== 'dawn' ? 0.03 : 0.012, t, 0.6);
  jigLevel = name === 'dawn' && playing ? 0.035 : 0;
  jigGain.gain.setTargetAtTime(jigLevel, t, 0.6);
  frogLevel = name === 'fen' && playing ? 1 : 0;
  windLevel = name === 'peak' ? (playing ? 0.12 + gust * 0.35 : 0.04) : name === 'dawn' ? 0.03 : 0;
  windGain.gain.setTargetAtTime(windLevel, t, gust > 0 ? 0.15 : 0.6);
}

function noiseBurst(start, length, type, freq, volume) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = buffer;
  filter.type = type;
  filter.frequency.value = freq;
  env.gain.value = volume;
  src.connect(filter).connect(env).connect(master);
  src.start(start);
}

function play(fn) {
  if (ctx && !muted) fn(ctx.currentTime);
}

export const sfx = {
  blip: () => play((t) => note(420 + Math.random() * 90, t, 0.04, 'square', 0.035, master)),
  chime: () =>
    play((t) => [76, 81, 88, 93].forEach((n, i) => note(midi(n), t + i * 0.07, 0.5, 'sine', 0.12, master))),
  fanfare: () =>
    play((t) =>
      [62, 66, 69, 74, 69, 74, 78].forEach((n, i) => note(midi(n), t + i * 0.13, i === 6 ? 1.2 : 0.2, 'square', 0.06, master)),
    ),
  whoosh: () =>
    play((t) => {
      noiseBurst(t, 0.5, 'bandpass', 900, 0.5);
      [64, 71, 76].forEach((n, i) => note(midi(n), t + 0.1 + i * 0.06, 0.4, 'triangle', 0.1, master));
    }),
  spill: () => play((t) => [67, 63, 60, 55].forEach((n, i) => note(midi(n), t + i * 0.12, 0.25, 'square', 0.06, master))),
  meow: () =>
    play((t) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.linearRampToValueAtTime(820, t + 0.15);
      osc.frequency.linearRampToValueAtTime(430, t + 0.45);
      env.gain.setValueAtTime(0.001, t);
      env.gain.linearRampToValueAtTime(0.18, t + 0.08);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(env).connect(master);
      osc.start(t);
      osc.stop(t + 0.55);
    }),
  step: (surface) =>
    play((t) => {
      if (surface === 'water') {
        noiseBurst(t, 0.18, 'bandpass', 700, 0.35);
        noiseBurst(t + 0.05, 0.1, 'highpass', 2200, 0.08);
      } else if (surface === 'wood') {
        note(150, t, 0.07, 'triangle', 0.2, master);
        noiseBurst(t, 0.05, 'lowpass', 900, 0.12);
      } else if (surface === 'snow') {
        noiseBurst(t, 0.1, 'highpass', 1800, 0.14);
      } else {
        noiseBurst(t, 0.07, surface === 'dirt' ? 'lowpass' : 'bandpass', surface === 'dirt' ? 500 : 1600, surface === 'dirt' ? 0.18 : 0.1);
      }
    }),
  kiss: () =>
    play((t) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1500, t + 0.12);
      env.gain.setValueAtTime(0.15, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(env).connect(master);
      osc.start(t);
      osc.stop(t + 0.16);
      noiseBurst(t + 0.1, 0.04, 'highpass', 3000, 0.1);
      // ...and the toad's opinion.
      [0.35, 0.5].forEach((d) => note(120, t + d, 0.1, 'square', 0.08, master));
    }),
  gurgle: () =>
    play((t) => {
      for (let i = 0; i < 7; i++) note(80 + Math.random() * 90, t + i * 0.07, 0.08, 'sine', 0.25, master);
      noiseBurst(t, 0.5, 'lowpass', 400, 0.25);
    }),
  gust: () => play((t) => noiseBurst(t, 1.4, 'bandpass', 1100, 0.45)),
  boulder: () =>
    play((t) => {
      noiseBurst(t, 1.2, 'lowpass', 180, 0.8);
      [0, 0.3, 0.55, 0.75].forEach((d) => note(48, t + d, 0.15, 'triangle', 0.35, master));
    }),
  grind: () => play((t) => noiseBurst(t, 0.45, 'bandpass', 260, 0.5)),
  iceCrack: () =>
    play((t) => {
      for (let i = 0; i < 5; i++) noiseBurst(t + i * 0.06 + Math.random() * 0.03, 0.05, 'highpass', 3500, 0.25);
      [88, 93, 100].forEach((n, i) => note(midi(n), t + 0.35 + i * 0.08, 0.3, 'sine', 0.06, master));
    }),
  sunrise: () =>
    play((t) => {
      // A slow D major swell: the first morning in a hundred years.
      [50, 57, 62, 66, 69, 74, 78].forEach((n, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = i < 2 ? 'triangle' : 'sine';
        osc.frequency.value = midi(n);
        env.gain.setValueAtTime(0.001, t + i * 0.25);
        env.gain.exponentialRampToValueAtTime(0.07, t + i * 0.25 + 1.5);
        env.gain.exponentialRampToValueAtTime(0.001, t + 7);
        osc.connect(env).connect(master);
        osc.start(t + i * 0.25);
        osc.stop(t + 7.1);
      });
    }),
  throw: () => play((t) => noiseBurst(t, 0.2, 'highpass', 2500, 0.12)),
  fuse: () => play((t) => noiseBurst(t, 0.5, 'highpass', 5000, 0.06)),
  bang: () =>
    play((t) => {
      noiseBurst(t, 0.6, 'lowpass', 900, 0.9);
      note(70, t, 0.3, 'square', 0.25, master);
    }),
  spotted: () => play((t) => [76, 72].forEach((n, i) => note(midi(n), t + i * 0.1, 0.12, 'square', 0.08, master))),
  greatBell: () =>
    play((t) => {
      // A bronze bell: a few inharmonic partials with long decays, struck three times.
      for (let k = 0; k < 3; k++) {
        const at = t + k * 1.6;
        [[98, 0.5, 6], [196, 0.3, 4.5], [233, 0.18, 3.5], [294, 0.14, 3], [392, 0.1, 2.2], [523, 0.06, 1.5]].forEach(([f, v, d]) =>
          note(f, at, d, 'sine', v, master),
        );
      }
    }),
  page: () => play((t) => [0, 0.09].forEach((d) => noiseBurst(t + d, 0.12, 'highpass', 3000, 0.12))),
  crash: () =>
    play((t) => {
      noiseBurst(t, 0.5, 'lowpass', 400, 0.7);
      note(55, t, 0.25, 'triangle', 0.4, master);
    }),
  scream: () =>
    play((t) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 1.2);
      env.gain.setValueAtTime(0.08, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
      osc.connect(env).connect(master);
      osc.start(t);
      osc.stop(t + 1.35);
    }),
  firework: () =>
    play((t) => {
      noiseBurst(t, 0.3, 'lowpass', 1200, 0.35);
      for (let i = 0; i < 6; i++) noiseBurst(t + 0.15 + Math.random() * 0.5, 0.04, 'highpass', 4000, 0.08);
    }),
  heartbeat: () =>
    play((t) => {
      note(52, t, 0.14, 'sine', 0.5, master);
      note(46, t + 0.18, 0.18, 'sine', 0.4, master);
    }),
  rumble: () =>
    play((t) => {
      const length = 4;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();
      src.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.value = 110;
      env.gain.value = 0.9;
      src.connect(filter).connect(env).connect(master);
      src.start(t);
    }),
};
