import { store } from '../store.js';
import { bridgeHeight } from '../world/layout.js';
import { sfx } from './audio.js';

// The story, in four stages:
//   0  You arrive. Grubnik, keeper of the Grinning Tankard, needs help.
//   1  Find Snaggle's five golden bells, lost on the causeway.
//      ('ready' when all five are found: take them back to Grubnik.)
//   2  Carry the Toast of Courage up to the Vigil Stone and raise it to the Eye.
//   3  The Eye is closed. Wander as long as you like.
export const STAGE = { ARRIVED: 0, BELLS: 1, TOAST: 2, DONE: 3 };

export const BELLS = [
  { id: 'bell-1', x: 1.8, z: -12 },
  { id: 'bell-2', x: -1.9, z: -32 },
  { id: 'bell-3', x: 1.9, z: -54 },
  { id: 'bell-4', x: -1.9, z: -76 },
  { id: 'bell-5', x: 9, z: -105 },
].map((b) => ({ ...b, y: (b.z < -96 ? 13 : bridgeHeight(b.z)) + 0.9 }));

export const VIGIL_STONE = { x: 0, z: -106, y: 13 };

const SAVE_KEY = 'vigil-and-tankard-save';

export function loadGame() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVE_KEY));
    if (saved && Number.isInteger(saved.stage) && Array.isArray(saved.bells)) {
      store.set({ stage: saved.stage, bells: saved.bells.filter((id) => BELLS.some((b) => b.id === id)) });
    }
  } catch {
    // No save, or storage is blocked: start fresh.
  }
}

function saveGame() {
  try {
    const { stage, bells } = store.get();
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ stage, bells }));
  } catch {
    // Progress just won't survive a reload.
  }
}

export const hasProgress = () => store.get().stage > 0 || store.get().bells.length > 0;

export function newGame() {
  store.set({ stage: STAGE.ARRIVED, bells: [], ending: false });
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

const stageKey = ({ stage, bells }) => (stage === STAGE.BELLS && bells.length === BELLS.length ? 'ready' : stage);

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
    notify('New task: find five golden bells on the causeway');
  } else if (id === 'grubnik' && key === 'ready') {
    store.set({ stage: STAGE.TOAST });
    sfx.fanfare();
    notify('You carry the Toast of Courage');
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

export function objective({ stage, bells }) {
  if (stage === STAGE.ARRIVED) return 'Find the keeper of the Grinning Tankard (east)';
  if (stage === STAGE.BELLS && bells.length < BELLS.length) return `Find Snaggle's golden bells on the causeway: ${bells.length}/${BELLS.length}`;
  if (stage === STAGE.BELLS) return 'Bring the bells back to Grubnik at the Tankard';
  if (stage === STAGE.TOAST) return 'Raise the Toast at the Vigil Stone before the castle gate';
  return 'The Eye is closed. Wander as you please.';
}
