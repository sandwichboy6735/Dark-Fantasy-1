import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { live } from '../game/live.js';
import { Box, boxGeo, mat } from '../retro/materials.jsx';
import { BRIDGE_SEGMENTS, STEPS, bridgeHeight } from './layout.js';
import { Parapet } from './Terrain.jsx';
import { Torch } from './Lights.jsx';
import { useStore } from '../store.js';
import { TORCHES, isLit } from '../game/quest.js';

const cobble = mat({ color: '#a39dac', map: 'cobble' });
const stone = mat({ color: '#7d7890', map: 'castle' });
const DECK_WIDTH = 7.4;
const DECK_THICKNESS = 1.5;
const PARAPET_X = 3.4;

// How far a piece at `z` has fallen since the collapse front passed it, and how
// much it has tumbled. Zero until the causeway starts to go.
function fall(z) {
  const t = (live.collapseZ - z) / (live.collapseSpeed || 6);
  if (!(t > 0)) return { drop: 0, tumble: 0 };
  return { drop: Math.min(400, 9 * t * t + t * 0.5), tumble: Math.min(1.2, t * 0.5) * (z % 2 > 1 ? 1 : -1) };
}

const tmp = new THREE.Matrix4();
const rot = new THREE.Matrix4();

// Many identical blocks in one draw call; each drops away as the front passes it.
function useBlocks(geometry, material, transforms) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, transforms.length);
    transforms.forEach(([x, y, z], i) => m.setMatrixAt(i, tmp.makeTranslation(x, y, z)));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.frustumCulled = false;
    return m;
  }, [geometry, material, transforms]);
  const last = useRef(-Infinity);
  useFrame(() => {
    if (live.collapseZ === last.current) return;
    last.current = live.collapseZ;
    transforms.forEach(([x, y, z], i) => {
      const { drop, tumble } = fall(z);
      tmp.makeTranslation(x, y - drop, z);
      if (tumble) tmp.multiply(rot.makeRotationX(tumble));
      mesh.setMatrixAt(i, tmp);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return mesh;
}

// A piece of the causeway that drops into the abyss when the collapse reaches it.
function Falling({ z, children }) {
  const group = useRef();
  useFrame(() => {
    group.current.position.y = -fall(z).drop;
  });
  return <group ref={group}>{children}</group>;
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
      <Falling key={z0} z={z}>
        <Box size={[DECK_WIDTH, DECK_THICKNESS, length]} m={cobble} position={[0, y0 - DECK_THICKNESS / 2, z]} />
        <Parapet position={[-PARAPET_X, y0, z]} length={length} alongZ m={stone} />
        <Parapet position={[PARAPET_X, y0, z]} length={length} alongZ m={stone} />
      </Falling>
    );
  });
}

// Piers dropping into the abyss, each with a wide corbelled head under the deck.
function Piers() {
  return [-10, -32, -54, -76, -94].map((z) => {
    const top = bridgeHeight(z) - DECK_THICKNESS;
    const bottom = -110;
    return (
      <Falling key={z} z={z}>
        <Box size={[4.6, top - bottom, 3]} m={stone} position={[0, (top + bottom) / 2, z]} />
        <Box size={[7.8, 1.2, 3.6]} m={stone} position={[0, top - 0.6, z]} />
        <Box size={[6.2, 1.2, 3.3]} m={stone} position={[0, top - 1.8, z]} />
        <Box size={[5.2, 2, 3.8]} m={stone} position={[0, top - 9, z]} />
      </Falling>
    );
  });
}

export function Bridge() {
  const lit = useStore((s) => s.lit);
  return (
    <group>
      <Steps />
      <Flats />
      <Piers />
      {TORCHES.map((t, i) => (
        <Falling key={t.id} z={t.z}>
          <Torch position={[t.side * (PARAPET_X - 0.3), t.y + 1.0, t.z]} side={-t.side} seed={i} lit={isLit(t, lit)} />
        </Falling>
      ))}
    </group>
  );
}
