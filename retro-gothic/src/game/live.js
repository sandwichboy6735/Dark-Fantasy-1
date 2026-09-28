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
};
