// Values that change every frame. The HUD reads them on its own animation frame
// instead of going through the React store.
export const live = {
  dread: 0, // 0..1, the Eye is about to see you at 1
  inGaze: false,
  safe: false,
  foam: 1, // 0..1, the Toast's head while you carry it
  running: false,
  fade: 0, // black-out after being seen, 1 -> 0
  gazeTime: 0, // drives the searchlights; only advances while you play
  playTime: 0, // seconds played, shown at the end
  gazes: [], // current searchlight positions, see quest.gazePositions
  marker: null, // { angle, distance } of the objective relative to where you look
  shake: 0, // camera shake, 1 -> 0
  player: { x: 0, y: 0, z: 0, safe: false },
  hunted: 0, // how many Watchers are chasing you
  huntersThisFrame: 0,
  watchers: {}, // each Watcher's current state, by id
  caughtBy: null, // set by a Watcher that reaches you; the player handles it
  resetWatchers: 0, // bumped after you're caught so Watchers go back to their rounds
  lure: null, // { x, z, time, duration } the last banger's bang
  now: 0, // clock time of the current frame
  gameTime: 0, // seconds of play: stops while paused and slows with the frame rate
  escape: null, // { ringAt, fallAt } while fleeing the castle
  escapeStart: null, // when the Great Bell was first rung, for the ending card
  escapeTime: 0,
  collapseZ: -Infinity, // the causeway is gone for z below this (between the castle and it)
  debris: [], // falling masonry: { x, z, y, landAt, hit }
  stunUntil: 0, // knocked down by masonry until this time
  sneaking: false,
  rage: 0, // how angry the Eye looks, 0..1
};
