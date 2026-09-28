import { useSyncExternalStore } from 'react';

// A tiny store shared by the 3D scene and the DOM overlay.
//   playing  the player has control (pointer locked, dragging or touch)
//   mode     'lock' | 'free' | 'touch': how you look around (free: no pointer lock,
//            the mouse turns you as it moves)
//   target   { id, name, lines, stages } of the character under the crosshair, or null
//   talking  the conversation that's open (press E / TALK on a target to start one)
//   zone     name of the area you're standing in
//   stage    quest progress, see game/quest.js
//   bells    ids of the golden bells picked up
//   lit      ids of the causeway torches you relit
//   cats     ids of the black cats you petted
//   pages    ids of the diary pages you read
//   difficulty  'easy' (Pilgrim) or 'normal' (Vigil)
//   bangers  goblin firecrackers in your pocket
//   seen     how many times the Eye has caught you
//   spilled  the Toast went flat and needs replacing
//   intro    the goal card is showing (new games)
//   ending   the ending card is showing
//   notice   { text, id } a short message flashed at the top of the screen
//   chapter  which chapter you're playing: 1 the Vigil, 2 the Drowned Fen, 3 the Frostspire
//   unlocked the furthest chapter you can travel to
//   fen      progress in chapter II: { stage, stars, lit, toads, seen, start }
//   peak     progress in chapter III: { stage, lit, braziers, goblins, seen, start }
//   records  each finished chapter's result: { [chapter]: { time, seen, score, rank } }
let state = {
  playing: false,
  mode: 'lock',
  target: null,
  talking: null,
  zone: '',
  stage: 0,
  bells: [],
  lit: [],
  cats: [],
  pages: [],
  difficulty: 'normal',
  bangers: 0,
  seen: 0,
  spilled: false,
  ending: false,
  intro: true,
  notice: null,
  chapter: 1,
  unlocked: 1,
  fen: { stage: 0, stars: [], lit: [], toads: [], seen: 0, start: null },
  peak: { stage: 0, lit: [], braziers: [], goblins: [], seen: 0, start: null },
  records: {},
};

export const FRESH_FEN = state.fen;
export const FRESH_PEAK = state.peak;
const listeners = new Set();

export const store = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useStore = (select) => useSyncExternalStore(store.subscribe, () => select(state));

// "Talk" presses from E, a click or the TALK button all go through here.
export const talkButton = new EventTarget();
export const pressTalk = () => talkButton.dispatchEvent(new Event('press'));

// Throwing a banger: F, or the BANG button.
export const bangButton = new EventTarget();
export const pressBang = () => bangButton.dispatchEvent(new Event('press'));
