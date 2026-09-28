import { store } from '../store.js';
import { bridgeHeight } from '../world/layout.js';
import { sfx } from './audio.js';
import { live } from './live.js';

// The story, in four stages:
//   0  You arrive. Grubnik, keeper of the Grinning Tankard, needs help.
//   1  Find Snaggle's five golden bells, lost on the causeway.
//      ('ready' when all five are found: take them back to Grubnik.)
//   2  Carry the Toast of Courage up to the Vigil Stone and raise it to the Eye.
//      ('spilled' if you ran and the foam went flat: fetch a fresh one.)
//   3  The Eye is closed. Wander as long as you like.
//
// All the way up the causeway, the Eye's gaze sweeps the stones. Stand in it and
// dread builds; when it's full the Eye has seen you and you wake at the last light.
export const STAGE = { ARRIVED: 0, BELLS: 1, TOAST: 2, DONE: 3 };

const onCauseway = (z) => (z < -96 ? 13 : bridgeHeight(z));

export const BELLS = [
  { id: 'bell-1', x: 1.6, z: -18 },
  { id: 'bell-2', x: -1.8, z: -42 },
  { id: 'bell-3', x: 1.8, z: -63 },
  { id: 'bell-4', x: -1.8, z: -86 },
  { id: 'bell-5', x: 10, z: -106 },
].map((b) => ({ ...b, y: onCauseway(b.z) + 0.9 }));

export const VIGIL_STONE = { x: 0, z: -106, y: 13 };
export const GRUBNIK_SPOT = { x: 37, z: 10 };

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

// Places the gaze can't reach you: lit torches and the braziers. `wake` is where you
// come round after being seen, standing on walkable ground next to the light.
export const SAFE_RADIUS = 3.3;
export function safeLights(lit) {
  return [
    { x: 0, z: -1, wake: { x: 0, z: 0, y: 0 } }, // the court braziers
    ...TORCHES.filter((t) => isLit(t, lit)).map((t) => ({ x: t.x, z: t.z, wake: { x: 0, z: t.z, y: t.y } })),
    { x: -6, z: -98.5, wake: { x: 0, z: -98.5, y: 13 } },
    { x: 6, z: -98.5, wake: { x: 0, z: -98.5, y: 13 } },
    { x: -4.5, z: -110, wake: { x: -2.5, z: -111.5, y: 13 } },
    { x: 4.5, z: -110, wake: { x: 2.5, z: -111.5, y: 13 } },
  ];
}

// The Eye's searchlights. Each sweeps back and forth; the third wakes once you carry
// the Toast, and all of them speed up then.
export const GAZE_RADIUS = 3.8;
const GAZES = [
  { axis: 'z', min: -48, max: -14, w: 0.34, phase: 0, x: 0, from: STAGE.ARRIVED },
  { axis: 'z', min: -92, max: -52, w: 0.29, phase: 2.1, x: 0, from: STAGE.ARRIVED },
  { axis: 'x', min: -12, max: 12, w: 0.45, phase: 1, z: -104, from: STAGE.TOAST },
];

export function gazePositions(time, stage) {
  return GAZES.map((g) => {
    const active = stage >= g.from && stage < STAGE.DONE;
    const s = (g.min + g.max) / 2 + ((g.max - g.min) / 2) * Math.sin(time * g.w + g.phase);
    const x = g.axis === 'x' ? s : g.x + Math.sin(time * 0.9 + g.phase) * 1.2;
    const z = g.axis === 'z' ? s : g.z + Math.sin(time * 0.7 + g.phase) * 2;
    return { x, z, y: onCauseway(z), active };
  });
}

const SAVE_KEY = 'vigil-and-tankard-save';

export function loadGame() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVE_KEY));
    if (saved && Number.isInteger(saved.stage) && Array.isArray(saved.bells)) {
      store.set({
        stage: saved.stage,
        bells: saved.bells.filter((id) => BELLS.some((b) => b.id === id)),
        lit: Array.isArray(saved.lit) ? saved.lit.filter((id) => TORCHES.some((t) => t.id === id)) : [],
        seen: Number.isInteger(saved.seen) ? saved.seen : 0,
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
    const { stage, bells, lit, seen } = store.get();
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ stage, bells, lit, seen, time: Math.round(live.playTime) }));
  } catch {
    // Progress just won't survive a reload.
  }
}

export const hasProgress = () => store.get().stage > 0 || store.get().bells.length > 0;

export function newGame() {
  store.set({ stage: STAGE.ARRIVED, bells: [], lit: [], seen: 0, spilled: false, ending: false, intro: true });
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

// The Eye has seen you. Called by the player, who then moves you to `wake`.
export function seenByTheEye() {
  const { seen, stage, spilled } = store.get();
  store.set({ seen: seen + 1 });
  sfx.rumble();
  if (stage === STAGE.TOAST && !spilled) {
    live.foam = Math.max(0, live.foam - 0.5);
    if (live.foam <= 0) spillToast();
    else notify('The Eye saw you! Its stare curdled half the foam');
  } else {
    notify('The Eye saw you! You wake by the last light');
  }
  saveGame();
}

export function spillToast() {
  store.set({ spilled: true });
  sfx.spill();
  notify('The Toast went flat! Fetch a fresh one from Grubnik');
}

const stageKey = ({ stage, bells, spilled }) => {
  if (stage === STAGE.BELLS && bells.length === BELLS.length) return 'ready';
  if (stage === STAGE.TOAST && spilled) return 'spilled';
  return stage;
};

// What a character says right now. Lines can mention {bells}.
export function linesFor(interact) {
  const state = store.get();
  const lines = interact.stages?.[stageKey(state)] ?? interact.lines;
  return lines.map((l) => l.replaceAll('{bells}', String(state.bells.length)));
}

// Talking to the right person moves the story on. Safe to call more than once.
export function advanceQuest(id) {
  const state = store.get();
  const key = stageKey(state);
  if (id === 'grubnik' && key === STAGE.ARRIVED) {
    store.set({ stage: STAGE.BELLS });
    notify('New quest: find 5 golden bells on the causeway');
  } else if (id === 'grubnik' && key === 'ready') {
    store.set({ stage: STAGE.TOAST, spilled: false });
    live.foam = 1;
    sfx.fanfare();
    notify('You carry the Toast of Courage. Don\'t run!');
  } else if (id === 'grubnik' && key === 'spilled') {
    store.set({ spilled: false });
    live.foam = 1;
    sfx.chime();
    notify('A fresh Toast. Walk, don\'t run!');
  } else if (id === 'vigil-stone' && key === STAGE.TOAST) {
    store.set({ stage: STAGE.DONE });
    sfx.fanfare();
    setTimeout(() => {
      sfx.rumble();
      store.set({ ending: true });
    }, 4000);
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
  return 'The Eye is closed. Wander as you please.';
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
  return null;
}
