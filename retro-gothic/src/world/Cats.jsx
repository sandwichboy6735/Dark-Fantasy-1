import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, coneGeo, glow, mat } from '../retro/materials.jsx';
import { useStore } from '../store.js';
import { CATS } from '../game/quest.js';
import { CAT_LINES } from './npcs.js';

const fur = mat({ color: '#141218' });
const eyes = glow('#e8d040');
const pink = mat({ color: '#c07080' });

// A small black cat sitting up, tail curled, blinking its yellow eyes.
function Cat({ id, x, y, z, rotation }) {
  const tail = useRef();
  const eyeRef = useRef();
  const found = useStore((s) => s.cats.includes(id));
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + x;
    tail.current.rotation.y = Math.sin(t * 1.5) * 0.4;
    eyeRef.current.visible = Math.sin(t * 0.7) < 0.97; // slow blinks
  });
  const info = {
    id,
    name: found ? 'A contented black cat' : 'A black cat',
    accent: '#e8d040',
    range: 3.5,
    lines: CAT_LINES,
  };
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]} userData={{ interact: info }}>
      <Box size={[0.3, 0.32, 0.46]} m={fur} position={[0, 0.16, -0.05]} />
      <Box size={[0.26, 0.3, 0.2]} m={fur} position={[0, 0.36, 0.1]} rotation={[-0.3, 0, 0]} />
      <group position={[0, 0.58, 0.14]}>
        <Box size={[0.26, 0.22, 0.22]} m={fur} />
        <mesh geometry={coneGeo(0.06, 0.13, 3)} material={fur} position={[-0.08, 0.15, 0]} />
        <mesh geometry={coneGeo(0.06, 0.13, 3)} material={fur} position={[0.08, 0.15, 0]} />
        <group ref={eyeRef}>
          <Box size={[0.05, 0.04, 0.02]} m={eyes} position={[-0.06, 0.02, 0.11]} />
          <Box size={[0.05, 0.04, 0.02]} m={eyes} position={[0.06, 0.02, 0.11]} />
        </group>
        <Box size={[0.04, 0.03, 0.02]} m={pink} position={[0, -0.04, 0.115]} />
      </group>
      <group ref={tail} position={[0, 0.05, -0.28]}>
        <Box size={[0.06, 0.06, 0.4]} m={fur} position={[0.12, 0, -0.08]} rotation={[0, 0.9, 0]} />
        <Box size={[0.06, 0.2, 0.06]} m={fur} position={[0.3, 0.1, 0.02]} />
      </group>
    </group>
  );
}

export function Cats() {
  const stage = useStore((s) => s.stage);
  return CATS.filter((c) => stage >= (c.from ?? 0)).map((c) => <Cat key={c.id} {...c} />);
}
