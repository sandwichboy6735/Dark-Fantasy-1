import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, glow, mat } from '../retro/materials.jsx';
import { useStore } from '../store.js';
import { PAGES } from '../game/quest.js';
import { PAGE_TEXT } from './npcs.js';

const oak = mat({ color: '#4a3020', map: 'darkwood' });
const parchment = glow('#e8d8a8');
const readParchment = mat({ color: '#b8a878' });
const ink = mat({ color: '#2a1a10', type: 'basic' });

// A torn diary page pinned to a slanted lectern, glowing faintly until it's read.
function Page({ id, x, y, z, rotation }) {
  const sheet = useRef();
  const read = useStore((s) => s.pages.includes(id));
  useFrame(({ clock }) => {
    if (!read) sheet.current.position.y = 1.2 + Math.sin(clock.elapsedTime * 2 + x) * 0.02;
  });
  const info = { id, verb: 'READ THE DIARY PAGE', name: 'Torn diary page', accent: '#e8d8a8', range: 3.5, lines: PAGE_TEXT[id] };
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]} userData={{ interact: info }}>
      <Box size={[0.12, 1.1, 0.12]} m={oak} position={[0, 0.55, 0]} />
      <Box size={[0.5, 0.06, 0.4]} m={oak} position={[0, 1.1, 0]} rotation={[-0.5, 0, 0]} />
      <group ref={sheet} position={[0, 1.2, 0.02]} rotation={[-0.5, 0, 0.08]}>
        <Box size={[0.34, 0.02, 0.44]} m={read ? readParchment : parchment} />
        {[-0.12, -0.04, 0.04, 0.12].map((dz) => (
          <Box key={dz} size={[0.24, 0.025, 0.02]} m={ink} position={[0, 0.005, dz]} />
        ))}
      </group>
    </group>
  );
}

export function Pages() {
  const stage = useStore((s) => s.stage);
  return PAGES.filter((p) => stage >= (p.from ?? 0)).map((p) => <Page key={p.id} {...p} />);
}
