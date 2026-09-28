import { useSyncExternalStore } from 'react';

// A tiny store shared by the 3D scene and the DOM overlay.
//   playing  the player has control (pointer locked, dragging or touch)
//   mode     'lock' | 'drag' | 'touch': how you look around
//   target   { id, name, lines, stages } of the character under the crosshair, or null
//   zone     name of the area you're standing in
//   stage    quest progress, see game/quest.js
//   bells    ids of the golden bells picked up
//   lit      ids of the causeway torches you relit
//   seen     how many times the Eye has caught you
//   spilled  the Toast went flat and needs replacing
//   intro    the goal card is showing (new games)
//   ending   the ending card is showing
//   notice   { text, id } a short message flashed at the top of the screen
let state = {
  playing: false,
  mode: 'lock',
  target: null,
  zone: '',
  stage: 0,
  bells: [],
  lit: [],
  seen: 0,
  spilled: false,
  ending: false,
  intro: true,
  notice: null,
};
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
