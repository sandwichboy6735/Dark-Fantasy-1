import { useSyncExternalStore } from 'react';

// A tiny store shared by the 3D scene and the DOM overlay.
//   locked  pointer lock is active
//   target  { id, name, lines } of the character under the crosshair, or null
//   zone    name of the area you're standing in
let state = { locked: false, target: null, zone: '' };
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
