import { useMemo } from 'react';
import { Box, boxGeo, dodecaGeo, mat } from '../retro/materials.jsx';
import { addCircle } from './layout.js';
import { Brazier } from './Lights.jsx';

const rock = mat({ color: '#77708a', map: 'rock' });
const cobble = mat({ color: '#9a94a4', map: 'cobble' });
const dirt = mat({ color: '#b8a08a', map: 'dirt' });
const wallStone = mat({ color: '#8a8698', map: 'castle' });
const deadWood = mat({ color: '#4a3a30', map: 'darkwood' });
const signWood = mat({ color: '#8a6040', map: 'wood' });

// Faces: +x, -x, +y (top), -y, +z, -z.
const topped = (top) => [rock, rock, top, rock, rock, rock];

function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// Jagged boulders clinging to a cliff line from (x0, z0) to (x1, z1).
function CliffRocks({ from, to, top = 0, count = 14, seed = 1, depth = 26 }) {
  const rocks = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: count }, (_, i) => {
      const t = (i + rand() * 0.6) / count;
      const size = 1.5 + rand() * 3.5;
      return {
        position: [from[0] + (to[0] - from[0]) * t + (rand() - 0.5) * 2, top - 1.5 - rand() * depth, from[1] + (to[1] - from[1]) * t + (rand() - 0.5) * 2],
        rotation: [rand() * 3, rand() * 3, rand() * 3],
        scale: [size, size * (1 + rand()), size],
      };
    });
  }, [from, to, top, count, seed, depth]);
  return rocks.map((r, i) => <mesh key={i} geometry={dodecaGeo(1)} material={rock} {...r} />);
}

function DeadTree({ position, rotation = 0, scale = 1 }) {
  const branch = (len, props) => <Box size={[0.18, len, 0.18]} m={deadWood} {...props} />;
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <Box size={[0.45, 4.5, 0.45]} m={deadWood} position={[0, 2.25, 0]} rotation={[0.05, 0, 0.06]} />
      {branch(2.2, { position: [0.7, 3.6, 0], rotation: [0, 0, -0.9] })}
      {branch(1.8, { position: [-0.6, 3.1, 0.2], rotation: [0.2, 0, 1.0] })}
      {branch(1.6, { position: [0.1, 4.6, 0.5], rotation: [0.7, 0, 0.1] })}
      {branch(1.2, { position: [1.35, 4.35, 0], rotation: [0, 0, 0.4] })}
      {branch(1.0, { position: [-1.2, 3.8, 0.3], rotation: [0, 0, -0.3] })}
    </group>
  );
}

// A low wall, `length` long along x (or z when `alongZ`), with merlons on top.
export function Parapet({ position, length, alongZ = false, height = 1.1, m = wallStone }) {
  const merlons = Math.floor(length / 2);
  return (
    <group position={position} rotation={[0, alongZ ? Math.PI / 2 : 0, 0]}>
      <Box size={[length, height, 0.6]} m={m} position={[0, height / 2, 0]} />
      {Array.from({ length: merlons }, (_, i) => (
        <Box key={i} size={[0.8, 0.45, 0.7]} m={m} position={[-length / 2 + 1 + i * 2, height + 0.22, 0]} />
      ))}
    </group>
  );
}

function Signpost({ position }) {
  return (
    <group
      position={position}
      userData={{
        interact: {
          name: 'Weathered Signpost',
          lines: [
            'NORTH: The Mourning Causeway, and the Castle of the Vigil beyond. Pilgrims keep to the middle of the steps.',
            'EAST: The Grinning Tankard. Goblin-kept. Mind your purse, your ale and your fingers.',
            'Someone has scratched beneath it: DO NOT LOOK UP FOR LONG.',
          ],
        },
      }}
    >
      <Box size={[0.2, 2.6, 0.2]} m={deadWood} position={[0, 1.3, 0]} />
      <Box size={[0.1, 0.4, 1.6]} m={signWood} position={[0, 2.2, -0.6]} rotation={[0.05, 0, 0]} />
      <Box size={[1.5, 0.35, 0.1]} m={signWood} position={[0.6, 1.75, 0]} rotation={[0, 0, -0.06]} />
    </group>
  );
}

addCircle(6, 4, 0.5); // signpost
addCircle(-4.5, -2.5, 0.7); // braziers at the causeway
addCircle(4.5, -2.5, 0.7);
addCircle(-9, 12, 0.6); // dead trees
addCircle(9.5, 17, 0.6);

export function Terrain() {
  return (
    <group>
      {/* The wayside court and the tavern yard: flat-topped blocks of cliff. */}
      <mesh geometry={boxGeo(28, 40, 26, 2)} material={topped(cobble)} position={[0, -20, 9]} />
      <mesh geometry={boxGeo(34, 40, 34, 2)} material={topped(dirt)} position={[31, -20, 9]} />
      <CliffRocks from={[-14, -4.5]} to={[48, -8.5]} seed={3} count={22} />
      <CliffRocks from={[-14.5, -4]} to={[-14.5, 22]} seed={7} count={10} />
      <CliffRocks from={[-14, 22.5]} to={[48, 26.5]} seed={11} count={20} />

      {/* The crag under the castle. */}
      <mesh geometry={boxGeo(70, 110, 72, 2)} material={topped(cobble)} position={[0, 13 - 55, -132]} />
      <CliffRocks from={[-35, -95.5]} to={[35, -95.5]} top={13} seed={5} count={24} depth={40} />
      <CliffRocks from={[-35.5, -96]} to={[-35.5, -168]} top={13} seed={9} count={14} depth={40} />
      <CliffRocks from={[35.5, -96]} to={[35.5, -168]} top={13} seed={13} count={14} depth={40} />

      {/* Court walls, leaving the causeway mouth open. */}
      <Parapet position={[-8.5, 0, -3.7]} length={11} />
      <Parapet position={[8.5, 0, -3.7]} length={11} />
      <Parapet position={[-13.7, 0, 9]} length={26} alongZ />
      <Parapet position={[0, 0, 21.7]} length={28} />
      <Brazier position={[-4.5, 0, -2.5]} seed={1} />
      <Brazier position={[4.5, 0, -2.5]} seed={2} />
      <Signpost position={[6, 0, 4]} />
      <DeadTree position={[-9, 0, 12]} rotation={0.6} />
      <DeadTree position={[9.5, 0, 17]} rotation={2.1} scale={0.8} />
    </group>
  );
}
