import { store } from '../store.js';
import { bridgeHeight } from '../world/layout.js';
import { sfx } from './audio.js';
import { live } from './live.js';

// The story, in five stages:
//   0  ARRIVED  Grubnik, keeper of the Grinning Tankard, needs help.
//   1  BELLS    Find Snaggle's five golden bells, lost on the causeway.
//               ('ready' when all five are found: take them back to Grubnik.)
//   2  TOAST    Carry the Toast of Courage up to the Vigil Stone and raise it.
//               ('spilled' if the foam went flat: fetch a fresh one.)
//   3  CASTLE   The Eye reels and the gate opens. Cross the bailey and the nave,
//               past the Eyeless Watchers, and ring the Great Bell.
//   4  DONE     The Eye is closed. Wander as long as you like.
//
// All the way, the Eye's gaze sweeps the stones. Stand in it and dread builds;
// when it's full the Eye has seen you and you wake at the last light.
export const STAGE = { ARRIVED: 0, BELLS: 1, TOAST: 2, CASTLE: 3, DONE: 4 };

const Y_CASTLE = 13;
const onCauseway = (z) => (z < -96 ? Y_CASTLE : bridgeHeight(z));

export const BELLS = [
  { id: 'bell-1', x: 1.6, z: -18 },
  { id: 'bell-2', x: -1.8, z: -42 },
  { id: 'bell-3', x: 1.8, z: -63 },
  { id: 'bell-4', x: -1.8, z: -86 },
  { id: 'bell-5', x: 10, z: -106 },
].map((b) => ({ ...b, y: onCauseway(b.z) + 0.9 }));

export const VIGIL_STONE = { x: 0, z: -106, y: Y_CASTLE };
export const GREAT_BELL = { x: 0, z: -147, y: Y_CASTLE };
export const GRUBNIK_SPOT = { x: 37, z: 10 };

// Six black cats sleep in odd corners. Pet them all.
export const CATS = [
  { id: 'cat-1', x: -13.7, y: 1.55, z: 5, rotation: 1.2, where: 'on the court wall' },
  { id: 'cat-2', x: 36.5, y: 1.95, z: -4.1, rotation: -0.8, where: 'on the tavern barrels' },
  { id: 'cat-3', x: 30, y: 1.35, z: 25.6, rotation: 3.1, where: 'on the tavern fence' },
  { id: 'cat-4', x: -3.4, y: 3 + 1.55, z: -33, rotation: 1.4, where: 'on the causeway wall' },
  { id: 'cat-5', x: -14, y: Y_CASTLE, z: -112.2, rotation: 0.7, where: 'in the gate forecourt' },
  { id: 'cat-6', x: -8, y: Y_CASTLE + 0.3, z: -149, rotation: 0.4, where: 'by the Great Bell', from: STAGE.CASTLE },
];

// Wall torches on the causeway. Most blew out; walk up to one to relight it.
// A lit torch is a safe light and your new waking place.
export const TORCHES = [
  { id: 'torch-1', side: -1, z: -12, startsLit: true },
  { id: 'torch-2', side: 1, z: -31 },
  { id: 'torch-3', side: -1, z: -54 },
  { id: 'torch-4', side: 1, z: -76 },
  { id: 'torch-5', side: -1, z: -93, startsLit: true },
  { id: 'torch-6', side: 1, z: -93, startsLit: true },
].map((t) => ({ ...t, x: t.side * 3.1, y: bridgeHeight(t.z) }));

export const isLit = (torch, lit) => torch.startsLit || lit.includes(torch.id);

// Candle stands inside the castle: safe light in the nave and the bailey.
export const CANDELABRA = [
  { x: -9, z: -121.5 },
  { x: 9, z: -121.5 },
  { x: -9.5, z: -134 },
  { x: 9.5, z: -134 },
  { x: -9.5, z: -143 },
  { x: 9.5, z: -143 },
];

// Places the gaze can't reach you: lit torches, braziers and candles. `wake` is
// where you come round after being seen, standing on walkable ground by the light.
export const SAFE_RADIUS = 3.3;
export function safeLights(lit, stage) {
  const lights = [
    { x: 0, z: -1, wake: { x: 0, z: 0, y: 0 } }, // the court braziers
    ...TORCHES.filter((t) => isLit(t, lit)).map((t) => ({ x: t.x, z: t.z, wake: { x: 0, z: t.z, y: t.y } })),
    { x: -6, z: -98.5, wake: { x: 0, z: -98.5, y: Y_CASTLE } },
    { x: 6, z: -98.5, wake: { x: 0, z: -98.5, y: Y_CASTLE } },
    { x: -4.5, z: -110, wake: { x: -2.5, z: -111.5, y: Y_CASTLE } },
    { x: 4.5, z: -110, wake: { x: 2.5, z: -111.5, y: Y_CASTLE } },
  ];
  if (stage >= STAGE.CASTLE) {
    for (const c of CANDELABRA) lights.push({ x: c.x, z: c.z, wake: { x: c.x * 0.8, z: c.z, y: Y_CASTLE } });
  }
  return lights;
}

// The Eye's searchlights. Each sweeps back and forth. More wake as the story goes
// on, and all of them speed up once you carry the Toast.
export const GAZE_RADIUS = 3.8;
const GAZES = [
  { axis: 'z', min: -48, max: -14, w: 0.34, phase: 0, x: 0, from: STAGE.ARRIVED },
  { axis: 'z', min: -92, max: -52, w: 0.29, phase: 2.1, x: 0, from: STAGE.ARRIVED },
  { axis: 'x', min: -12, max: 12, w: 0.45, phase: 1, z: -104, from: STAGE.TOAST },
  // Inside the castle the light falls through the broken roof.
  { axis: 'x', min: -8, max: 8, w: 0.5, phase: 0.4, z: -124, from: STAGE.CASTLE },
  { axis: 'x', min: -7, max: 7, w: 0.42, phase: 2.6, z: -138.5, from: STAGE.CASTLE },
];
export const GAZE_COUNT = GAZES.length;

// `lure`, when set, drags nearby searchlights towards a banger's bang.
export function gazePositions(time, stage, lure, now) {
  return GAZES.map((g) => {
    const active = stage >= g.from && stage < STAGE.DONE;
    const s = (g.min + g.max) / 2 + ((g.max - g.min) / 2) * Math.sin(time * g.w + g.phase);
    let x = g.axis === 'x' ? s : g.x + Math.sin(time * 0.9 + g.phase) * 1.2;
    let z = g.axis === 'z' ? s : g.z + Math.sin(time * 0.7 + g.phase) * 2;
    if (lure && Math.hypot(lure.x - x, lure.z - z) < 28) {
      const age = now - lure.time;
      const pull = Math.min(1, age / 0.5) * Math.min(1, (lure.duration - age) / 0.6);
      if (pull > 0) {
        x += (lure.x - x) * pull;
        z += (lure.z - z) * pull;
      }
    }
    return { x, z, y: onCauseway(z), active };
  });
}

const SAVE_KEY = 'vigil-and-tankard-save';
const SAVE_VERSION = 2;

export function loadGame() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVE_KEY));
    if (saved && Number.isInteger(saved.stage) && Array.isArray(saved.bells)) {
      // Version 1 saves ended at stage 3; that's DONE now.
      const stage = !saved.v && saved.stage === 3 ? STAGE.DONE : saved.stage;
      const known = (list, ids) => (Array.isArray(ids) ? ids.filter((id) => list.some((x) => x.id === id)) : []);
      store.set({
        stage,
        bells: known(BELLS, saved.bells),
        lit: known(TORCHES, saved.lit),
        cats: known(CATS, saved.cats),
        seen: Number.isInteger(saved.seen) ? saved.seen : 0,
        bangers: Number.isInteger(saved.bangers) ? saved.bangers : stage >= STAGE.BELLS ? 3 : 0,
        intro: false,
      });
      live.playTime = Number.isFinite(saved.time) ? saved.time : 0;
    }
  } catch {
    // No save, or storage is blocked: start fresh.
  }
}

export function saveGame() {
  try {
    const { stage, bells, lit, seen, cats, bangers } = store.get();
    const data = { v: SAVE_VERSION, stage, bells, lit, seen, cats, bangers, time: Math.round(live.playTime) };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Progress just won't survive a reload.
  }
}

export const hasProgress = () => store.get().stage > 0 || store.get().bells.length > 0;

export function newGame() {
  store.set({ stage: STAGE.ARRIVED, bells: [], lit: [], cats: [], seen: 0, bangers: 0, spilled: false, ending: false, intro: true });
  live.playTime = 0;
  live.foam = 1;
  live.dread = 0;
  saveGame();
}

let noticeId = 0;
export function notify(text) {
  store.set({ notice: { text, id: ++noticeId } });
}

export function collectBell(id) {
  const { bells, stage } = store.get();
  if (bells.includes(id)) return;
  const found = [...bells, id];
  store.set({ bells: found });
  saveGame();
  sfx.chime();
  if (found.length < BELLS.length) notify(`Golden bell ${found.length} of ${BELLS.length}`);
  else notify(stage >= STAGE.BELLS ? 'All five bells! Take them to Grubnik' : 'Five golden bells... someone must have lost these');
}

export function lightTorch(id) {
  const { lit } = store.get();
  if (lit.includes(id)) return;
  store.set({ lit: [...lit, id] });
  saveGame();
  sfx.whoosh();
  notify('Torch relit: a safe light');
}

// Called by the player when the gaze or a Watcher gets you; they then wake you by `wake`.
export function caught(by) {
  const { seen, stage, spilled } = store.get();
  store.set({ seen: seen + 1 });
  sfx.rumble();
  live.shake = 1;
  const who = by === 'watcher' ? 'A Watcher caught you!' : 'The Eye saw you!';
  if (stage === STAGE.TOAST && !spilled) {
    live.foam = Math.max(0, live.foam - 0.5);
    if (live.foam <= 0) spillToast();
    else notify(`${who} Half the foam curdled`);
  } else {
    notify(`${who} You wake by the last light`);
  }
  saveGame();
}

export function spillToast() {
  store.set({ spilled: true });
  sfx.spill();
  notify('The Toast went flat! Fetch a fresh one from Grubnik');
}

export function spendBanger() {
  const { bangers } = store.get();
  if (bangers <= 0) {
    notify(store.get().stage >= STAGE.BELLS ? 'Out of bangers: Grubnik has more' : 'You have no bangers yet');
    return false;
  }
  store.set({ bangers: bangers - 1 });
  saveGame();
  return true;
}

const stageKey = ({ stage, bells, spilled }) => {
  if (stage === STAGE.BELLS && bells.length === BELLS.length) return 'ready';
  if (stage === STAGE.TOAST && spilled) return 'spilled';
  return stage;
};

// What a character says right now. Lines can mention {bells} and {cats}.
export function linesFor(interact) {
  const state = store.get();
  const lines = interact.stages?.[stageKey(state)] ?? interact.lines;
  return lines.map((l) => l.replaceAll('{bells}', String(state.bells.length)).replaceAll('{cats}', String(state.cats.length)));
}

// Talking to the right person moves the story on. Safe to call more than once.
export function advanceQuest(id) {
  const state = store.get();
  const key = stageKey(state);
  if (id.startsWith('cat-')) {
    if (state.cats.includes(id)) {
      sfx.meow();
      return;
    }
    const cats = [...state.cats, id];
    store.set({ cats });
    sfx.meow();
    notify(cats.length === CATS.length ? 'All six cats petted! Truly a hero.' : `Cat petted: ${cats.length} of ${CATS.length}`);
  } else if (id === 'grubnik' && key === STAGE.ARRIVED) {
    store.set({ stage: STAGE.BELLS, bangers: 3 });
    notify('New quest: find 5 golden bells. Got 3 bangers!');
  } else if (id === 'grubnik' && key === 'ready') {
    store.set({ stage: STAGE.TOAST, spilled: false, bangers: Math.max(3, state.bangers) });
    live.foam = 1;
    sfx.fanfare();
    notify('You carry the Toast of Courage. Don\'t run!');
  } else if (id === 'grubnik' && key === 'spilled') {
    store.set({ spilled: false, bangers: Math.max(3, state.bangers) });
    live.foam = 1;
    sfx.chime();
    notify('A fresh Toast. Walk, don\'t run!');
  } else if (id === 'grubnik' && state.stage >= STAGE.BELLS && state.bangers < 3) {
    store.set({ bangers: 3 });
    notify('Bangers refilled: 3');
  } else if (id === 'vigil-stone' && key === STAGE.TOAST) {
    store.set({ stage: STAGE.CASTLE });
    sfx.fanfare();
    live.shake = 0.6;
    setTimeout(() => {
      sfx.rumble();
      notify('The Eye reels! The castle gate is opening');
    }, 2500);
    setTimeout(() => notify('Inside walk the Eyeless Watchers. Stay out of their lantern-light!'), 7000);
  } else if (id === 'great-bell' && key === STAGE.CASTLE) {
    store.set({ stage: STAGE.DONE });
    sfx.greatBell();
    live.shake = 1;
    setTimeout(() => {
      sfx.rumble();
      store.set({ ending: true });
    }, 5000);
  } else {
    return;
  }
  saveGame();
}

export function objective(state) {
  const { stage, bells } = state;
  const key = stageKey(state);
  if (stage === STAGE.ARRIVED) return 'Talk to Grubnik, the goblin at the tavern bar';
  if (key === STAGE.BELLS) return `Find the golden bells on the causeway: ${bells.length} / ${BELLS.length}`;
  if (key === 'ready') return 'Take the bells back to Grubnik at the tavern';
  if (key === 'spilled') return 'The Toast went flat! Get a fresh one from Grubnik';
  if (stage === STAGE.TOAST) return 'Carry the Toast to the Vigil Stone at the castle gate';
  if (stage === STAGE.CASTLE) return 'Enter the castle and ring the Great Bell';
  return 'The Eye is closed. Find any cats you missed!';
}

// Where the objective arrow points from (x, z), or null.
export function objectiveTarget(state, x, z) {
  const key = stageKey(state);
  if (key === STAGE.ARRIVED || key === 'ready' || key === 'spilled') return GRUBNIK_SPOT;
  if (key === STAGE.BELLS) {
    let best = null;
    for (const b of BELLS) {
      if (state.bells.includes(b.id)) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (!best || d < best.d) best = { x: b.x, z: b.z, d };
    }
    return best;
  }
  if (key === STAGE.TOAST) return VIGIL_STONE;
  if (key === STAGE.CASTLE) return GREAT_BELL;
  return null;
}

// The rank on the ending card.
export function scoreRun({ seen, cats, lit }, seconds) {
  const relit = lit.length;
  const minutes = seconds / 60;
  const score = Math.round(100 - seen * 6 + cats.length * 5 + relit * 3 - Math.max(0, minutes - 12) * 2);
  const rank = score >= 125 ? 'S' : score >= 105 ? 'A' : score >= 85 ? 'B' : 'C';
  const title = { S: 'Legend of the Tankard', A: 'Hero of the Causeway', B: 'Stout-Hearted Pilgrim', C: 'Lucky Wanderer' }[rank];
  return { score, rank, title };
}
