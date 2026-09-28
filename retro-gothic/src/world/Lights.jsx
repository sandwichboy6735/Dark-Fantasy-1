import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, cylGeo, glow, mat } from '../retro/materials.jsx';

const iron = mat({ color: '#2a2a30', type: 'phong', shininess: 60 });
const pole = mat({ color: '#3a2616', map: 'darkwood' });
const stone = mat({ color: '#6a6674', map: 'castle' });

// Torch flames: a hard orange block with a yellow core, snapping between a few
// sizes instead of smoothly flickering. The light is pure orange and steady.
function Flame({ scale = 1, speed = 11, seed = 0 }) {
  const outer = useRef();
  const inner = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + seed * 7.1;
    const s = 1 + 0.18 * Math.round(Math.sin(t) * 2 + Math.sin(t * 2.3)) * 0.5;
    outer.current.scale.set(scale, scale * s, scale);
    outer.current.rotation.y = Math.floor(t) * 0.7;
    inner.current.scale.set(scale, scale * (2 - s), scale);
  });
  return (
    <group>
      <Box ref={outer} size={[0.22, 0.42, 0.22]} m={glow('#ff5a0a')} position={[0, 0.2, 0]} />
      <Box ref={inner} size={[0.12, 0.26, 0.12]} m={glow('#ffd23a')} position={[0, 0.16, 0]} />
    </group>
  );
}

// A wall torch on an iron bracket. `side` is the direction it leans out to.
export function Torch({ position, side = 1, intensity = 40, distance = 17, seed = 0 }) {
  return (
    <group position={position}>
      <Box size={[0.08, 0.08, 0.5]} m={iron} position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <group position={[0.25 * side, 0.1, 0]} rotation={[0, 0, -0.25 * side]}>
        <mesh geometry={cylGeo(0.05, 0.035, 0.6, 5)} material={pole} />
        <group position={[0, 0.3, 0]}>
          <Flame seed={seed} />
        </group>
      </group>
      <pointLight color="#ff6000" intensity={intensity} distance={distance} decay={1.6} position={[0.35 * side, 0.9, 0]} />
    </group>
  );
}

// A stone pillar with an iron fire basket on top.
export function Brazier({ position, intensity = 70, distance = 22, seed = 0, height = 1.6 }) {
  return (
    <group position={position}>
      <Box size={[0.7, height, 0.7]} m={stone} position={[0, height / 2, 0]} />
      <mesh geometry={cylGeo(0.55, 0.3, 0.4, 6)} material={iron} position={[0, height + 0.2, 0]} />
      <group position={[0, height + 0.3, 0]}>
        <Flame scale={2.2} seed={seed} speed={9} />
      </group>
      <pointLight color="#ff6000" intensity={intensity} distance={distance} decay={1.5} position={[0, height + 1.2, 0]} />
    </group>
  );
}

// Smooth candle / lantern flicker built from a few incommensurate sines.
function flicker(t, seed) {
  return 0.82 + 0.1 * Math.sin(t * 7.3 + seed) + 0.06 * Math.sin(t * 13.1 + seed * 2.3) + 0.04 * Math.sin(t * 23.7 + seed * 5.1);
}

export function FlickerLight({ intensity, color = '#ffc85a', distance = 12, seed = 0, ...props }) {
  const light = useRef();
  useFrame(({ clock }) => {
    light.current.intensity = intensity * flicker(clock.elapsedTime, seed);
  });
  return <pointLight ref={light} color={color} intensity={intensity} distance={distance} decay={1.8} {...props} />;
}

// A hanging lantern: iron cage around a warm glass, with a soft yellow light.
export function Lantern({ position, intensity = 14, distance = 12, seed = 0, light = true }) {
  return (
    <group position={position}>
      <Box size={[0.03, 0.3, 0.03]} m={iron} position={[0, 0.35, 0]} />
      <Box size={[0.3, 0.06, 0.3]} m={iron} position={[0, 0.2, 0]} />
      <Box size={[0.22, 0.3, 0.22]} m={glow('#ffcf6a')} position={[0, 0, 0]} />
      <Box size={[0.3, 0.05, 0.3]} m={iron} position={[0, -0.17, 0]} />
      {light && <FlickerLight intensity={intensity} distance={distance} seed={seed} position={[0, -0.1, 0]} />}
    </group>
  );
}

export function Candle({ position }) {
  return (
    <group position={position}>
      <mesh geometry={cylGeo(0.04, 0.045, 0.16, 5)} material={mat({ color: '#d8ccaa' })} position={[0, 0.08, 0]} />
      <Box size={[0.035, 0.07, 0.035]} m={glow('#ffd86a')} position={[0, 0.2, 0]} />
    </group>
  );
}
