import { useEffect, useState } from 'react';
import { live } from '../game/live.js';

// Where you were when you paused. The maps are shown while paused, so one read on
// open is enough.
export function usePausedPlayer() {
  const [player, setPlayer] = useState(() => ({ ...live.player }));
  useEffect(() => setPlayer({ ...live.player }), []);
  return player;
}
