import { useEffect } from 'react';
import { store } from '../store.js';
import { dynamicColliders } from './layout.js';

// Registers a moving character as something the player can't walk through.
export function useCollider(ref, radius, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const entry = { object: ref.current, radius };
    dynamicColliders.add(entry);
    return () => dynamicColliders.delete(entry);
  }, [ref, radius, enabled]);
}

export const isTalkingTo = (id) => store.get().target?.id === id;

// Turns `current` towards `target` (radians) at `speed` radians per second.
export function turnTowards(current, target, speed, dt) {
  let d = target - current;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return current + Math.sign(d) * Math.min(Math.abs(d), speed * dt);
}

// Callback ref that files a part under `name` in a rig of animated parts.
export const bind = (rig, name) => (object) => {
  rig.current[name] = object;
};
