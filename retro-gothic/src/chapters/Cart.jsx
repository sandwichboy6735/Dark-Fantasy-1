import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, cylGeo, glow, icoGeo, mat } from '../retro/materials.jsx';
import { Goblin } from '../world/Goblin.jsx';
import { Lantern } from '../world/Lights.jsx';

const wood = mat({ color: '#9a7250', map: 'wood' });
const darkWood = mat({ color: '#5a4030', map: 'darkwood' });
const iron = mat({ color: '#2a2a30', type: 'phong' });
const canvas = mat({ color: '#8a7a5a' });
const toadSkin = mat({ color: '#5a6a2a' });
const toadBelly = mat({ color: '#b8a860' });
const toadEye = glow('#e8c030');
const pupil = mat({ color: '#000000', type: 'basic' });

function Wheel({ position }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={cylGeo(0.62, 0.62, 0.12, 8)} material={darkWood} />
      <mesh geometry={cylGeo(0.14, 0.14, 0.2, 6)} material={iron} />
    </group>
  );
}

// Mudbelly: a toad the size of a pony, harnessed to the cart. Breathes, blinks.
export function Mudbelly({ position, rotation = 0 }) {
  const body = useRef();
  const lids = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    body.current.scale.set(1, 1 + Math.sin(t * 1.6) * 0.04, 1 + Math.sin(t * 1.6) * 0.03);
    lids.current.visible = Math.sin(t * 0.9) > 0.96;
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={body}>
        <mesh geometry={icoGeo(0.9, 1)} material={toadSkin} position={[0, 0.75, 0]} scale={[1.1, 0.75, 1.3]} />
        <mesh geometry={icoGeo(0.7, 1)} material={toadBelly} position={[0, 0.55, 0.35]} scale={[1.1, 0.6, 1]} />
      </group>
      {/* Head, wide mouth, bulging golden eyes. */}
      <mesh geometry={icoGeo(0.6, 1)} material={toadSkin} position={[0, 1.0, 1.05]} scale={[1.3, 0.7, 0.9]} />
      <Box size={[1.2, 0.05, 0.1]} m={pupil} position={[0, 0.88, 1.6]} />
      {[-1, 1].map((s) => (
        <group key={s} position={[0.42 * s, 1.35, 1.2]}>
          <mesh geometry={icoGeo(0.2)} material={toadSkin} />
          <Box size={[0.24, 0.22, 0.1]} m={toadEye} position={[0, 0.04, 0.14]} />
          <Box size={[0.16, 0.06, 0.04]} m={pupil} position={[0, 0.04, 0.2]} />
        </group>
      ))}
      <group ref={lids}>
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.3, 0.26, 0.12]} m={toadSkin} position={[0.42 * s, 1.39, 1.36]} />
        ))}
      </group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[0.3, 0.5, 0.9]} m={toadSkin} position={[0.95 * s, 0.35, -0.3]} rotation={[0.3, 0, 0.3 * s]} />
          <Box size={[0.2, 0.55, 0.2]} m={toadSkin} position={[0.65 * s, 0.3, 0.9]} />
          <Box size={[0.4, 0.06, 0.5]} m={toadSkin} position={[1.1 * s, 0.03, -0.2]} />
        </group>
      ))}
      {/* Harness. */}
      <Box size={[1.9, 0.12, 0.14]} m={darkWood} position={[0, 1.05, -0.2]} />
    </group>
  );
}

// Rattlecart's cart: two wheels, a canvas hood, a lantern, and Mudbelly in the
// shafts. `rotation` turns the whole rig; the goblin sits in front of it.
export function Cart({ position, rotation = 0, goblin }) {
  return (
    <>
      <group position={position} rotation={[0, rotation, 0]}>
        <Box size={[1.8, 0.7, 2.6]} m={wood} position={[0, 0.95, 0]} />
        <Box size={[1.9, 0.1, 2.7]} m={darkWood} position={[0, 0.62, 0]} />
        {[-0.9, 0, 0.9].map((z) => (
          <Box key={z} size={[1.95, 0.08, 0.1]} m={darkWood} position={[0, 2.2, z]} />
        ))}
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.06, 1.0, 2.5]} m={canvas} position={[0.93 * s, 1.75, 0]} rotation={[0, 0, -0.18 * s]} />
        ))}
        <Box size={[1.6, 0.06, 2.5]} m={canvas} position={[0, 2.25, 0]} />
        <Wheel position={[-1.0, 0.62, -0.2]} />
        <Wheel position={[1.0, 0.62, -0.2]} />
        {[-0.6, 0.6].map((x) => (
          <Box key={x} size={[0.08, 0.08, 2.2]} m={darkWood} position={[x, 0.8, 2.3]} rotation={[0.25, 0, 0]} />
        ))}
        <Lantern position={[0.75, 2.4, 1.3]} seed={5} intensity={16} distance={10} />
        <Mudbelly position={[0, 0, 3.6]} />
      </group>
      {goblin && <Goblin {...goblin} />}
    </>
  );
}
