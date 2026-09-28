import { useMemo } from 'react';
import * as THREE from 'three';
import { Box, boxGeo, mat } from '../retro/materials.jsx';
import { BRIDGE_SEGMENTS, STEPS, bridgeHeight } from './layout.js';
import { Parapet } from './Terrain.jsx';
import { Torch } from './Lights.jsx';

const cobble = mat({ color: '#a39dac', map: 'cobble' });
const stone = mat({ color: '#7d7890', map: 'castle' });
const DECK_WIDTH = 7.4;
const DECK_THICKNESS = 1.5;
const PARAPET_X = 3.4;

// Many identical blocks in one draw call.
function useBlocks(geometry, material, transforms) {
  return useMemo(() => {
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    const m = new THREE.Matrix4();
    transforms.forEach(([x, y, z], i) => mesh.setMatrixAt(i, m.makeTranslation(x, y, z)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }, [geometry, material, transforms]);
}

function Steps() {
  const depth = STEPS[0].depth;
  const treads = useBlocks(
    boxGeo(DECK_WIDTH, DECK_THICKNESS, depth, 2),
    cobble,
    STEPS.map((s) => [0, s.top - DECK_THICKNESS / 2, s.z - depth / 2]),
  );
  const walls = useBlocks(
    boxGeo(0.6, 1.1, depth, 2),
    stone,
    STEPS.flatMap((s) => [-PARAPET_X, PARAPET_X].map((x) => [x, s.top + 0.55, s.z - depth / 2])),
  );
  const merlons = useBlocks(
    boxGeo(0.7, 0.45, 0.8, 2),
    stone,
    STEPS.filter((_, i) => i % 2 === 0).flatMap((s) => [-PARAPET_X, PARAPET_X].map((x) => [x, s.top + 1.32, s.z - depth / 2])),
  );
  return (
    <>
      <primitive object={treads} />
      <primitive object={walls} />
      <primitive object={merlons} />
    </>
  );
}

function Flats() {
  return BRIDGE_SEGMENTS.filter((s) => s.y0 === s.y1).map(({ z0, z1, y0 }) => {
    const length = z0 - z1;
    const z = (z0 + z1) / 2;
    return (
      <group key={z0}>
        <Box size={[DECK_WIDTH, DECK_THICKNESS, length]} m={cobble} position={[0, y0 - DECK_THICKNESS / 2, z]} />
        <Parapet position={[-PARAPET_X, y0, z]} length={length} alongZ m={stone} />
        <Parapet position={[PARAPET_X, y0, z]} length={length} alongZ m={stone} />
      </group>
    );
  });
}

// Piers dropping into the abyss, each with a wide corbelled head under the deck.
function Piers() {
  return [-10, -32, -54, -76, -94].map((z) => {
    const top = bridgeHeight(z) - DECK_THICKNESS;
    const bottom = -110;
    return (
      <group key={z}>
        <Box size={[4.6, top - bottom, 3]} m={stone} position={[0, (top + bottom) / 2, z]} />
        <Box size={[7.8, 1.2, 3.6]} m={stone} position={[0, top - 0.6, z]} />
        <Box size={[6.2, 1.2, 3.3]} m={stone} position={[0, top - 1.8, z]} />
        <Box size={[5.2, 2, 3.8]} m={stone} position={[0, top - 9, z]} />
      </group>
    );
  });
}

const TORCHES = [
  [-1, -12],
  [1, -31],
  [-1, -54],
  [1, -76],
  [-1, -93],
  [1, -93],
];

export function Bridge() {
  return (
    <group>
      <Steps />
      <Flats />
      <Piers />
      {TORCHES.map(([side, z], i) => (
        <Torch key={i} position={[side * (PARAPET_X - 0.3), bridgeHeight(z) + 1.0, z]} side={-side} seed={i} />
      ))}
    </group>
  );
}
