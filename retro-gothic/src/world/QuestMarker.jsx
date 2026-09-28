import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, glow, mat } from '../retro/materials.jsx';
import { store } from '../store.js';
import { questMarker } from '../game/quest.js';
import { live } from '../game/live.js';

const gold = glow('#ffe040');
const beam = mat({ color: '#ffd24a', type: 'basic', fog: false, transparent: true, opacity: 0.35 });

// A big bobbing gold "!" over whoever or whatever the story needs next, visible
// through the fog from anywhere.
export function QuestMarker() {
  const group = useRef();
  const spin = useRef();
  useFrame(({ clock }) => {
    const spot = questMarker(store.get(), live.player.x, live.player.z);
    group.current.visible = Boolean(spot);
    if (!spot) return;
    group.current.position.set(spot.x, spot.y + Math.sin(clock.elapsedTime * 3) * 0.15, spot.z);
    spin.current.rotation.y = clock.elapsedTime * 1.8;
    // Grow with distance so it stays readable from across the map.
    const d = Math.hypot(spot.x - live.player.x, spot.z - live.player.z);
    group.current.scale.setScalar(Math.min(5, Math.max(1.7, d / 9)));
  });
  return (
    <group ref={group} visible={false}>
      <group ref={spin}>
        <Box size={[0.36, 0.8, 0.36]} m={gold} position={[0, 0.62, 0]} />
        <Box size={[0.36, 0.3, 0.36]} m={gold} position={[0, -0.02, 0]} />
      </group>
      {/* A thin shaft of light down to the target. */}
      <Box size={[0.05, 6, 0.05]} m={beam} position={[0, -3.3, 0]} />
    </group>
  );
}
