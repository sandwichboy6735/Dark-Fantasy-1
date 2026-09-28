// Every sound is synthesised live with WebAudio: no files to load.
//   drone   low detuned saws through a slowly breathing filter (the causeway)
//   jig     a looping square-wave reel that swells near the tavern
//   sfx     dialogue blips, bell chimes, the fanfare and the Eye's rumble

let ctx = null;
let master;
let droneGain;
let jigGain;
let jigLevel = 0;
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
      if (i % 4 === 0) note(midi(BASS[(i / 4) % BASS.length]), next, step * 3.5, 'triangle', 0.5, jigGain);
      i++;
      next += step;
    }
  }, 100);
}

// `tavern` is 0 on the causeway and 1 in the tavern yard.
export function setAmbience(tavern, playing) {
  if (!ctx) return;
  const t = ctx.currentTime;
  droneGain.gain.setTargetAtTime(playing ? 0.05 * (1 - tavern * 0.7) : 0.015, t, 0.6);
  jigLevel = playing ? 0.06 * tavern : 0;
  jigGain.gain.setTargetAtTime(jigLevel, t, 0.6);
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
