import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store.js';
import { BELLS, STAGE, VIGIL_STONE } from '../game/quest.js';
import { Box, coneGeo, glow, icoGeo, mat } from '../retro/materials.jsx';
import { addCircle } from './layout.js';
import { VIGIL_STONE_INFO } from './npcs.js';
import { Tankard } from './Goblin.jsx';

const gold = mat({ color: '#f0c030', type: 'phong', shininess: 90, emissive: '#6a4a00', emissiveIntensity: 1 });
const altar = mat({ color: '#8a86a0', map: 'castle' });
const sigil = glow('#6f9aff');
const beam = mat({ color: '#ffd24a', type: 'basic', fog: false, transparent: true, opacity: 0.35 });

// A jester's bell, spinning and bobbing, with sparks circling it.
function Bell({ x, y, z, seed }) {
  const group = useRef();
  const sparks = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    group.current.position.y = y + Math.sin(t * 2) * 0.12;
    group.current.rotation.y = t * 1.5;
    sparks.current.rotation.y = -t * 3;
  });
  return (
    <group ref={group} position={[x, y, z]} scale={2}>
      {/* A faint shaft of gold so you can spot it down the causeway. */}
      <Box size={[0.07, 7, 0.07]} m={beam} position={[0, 3.6, 0]} />
      <mesh geometry={coneGeo(0.17, 0.24, 6)} material={gold} />
      <mesh geometry={icoGeo(0.06)} material={gold} position={[0, -0.14, 0]} />
      <Box size={[0.05, 0.08, 0.05]} m={gold} position={[0, 0.15, 0]} />
      <group ref={sparks}>
        {[0, 2.1, 4.2].map((a) => (
          <Box key={a} size={[0.05, 0.05, 0.05]} m={glow('#fff0a0')} position={[Math.sin(a) * 0.4, Math.cos(a * 3) * 0.1, Math.cos(a) * 0.4]} />
        ))}
      </group>
    </group>
  );
}

export function Bells() {
  const found = useStore((s) => s.bells);
  return BELLS.filter((b) => !found.includes(b.id)).map((b, i) => <Bell key={b.id} {...b} seed={i * 1.7} />);
}

addCircle(VIGIL_STONE.x, VIGIL_STONE.z, 0.9);

// The altar in the gate forecourt. Its sigil wakes when you carry the Toast,
// and the Toast stays on it once the Eye is closed.
export function VigilStone() {
  const stage = useStore((s) => s.stage);
  const glowRef = useRef();
  useFrame(({ clock }) => {
    const on = stage === STAGE.TOAST;
    glowRef.current.visible = on ? Math.sin(clock.elapsedTime * 4) > -0.3 : false;
  });
  return (
    <group position={[VIGIL_STONE.x, VIGIL_STONE.y, VIGIL_STONE.z]} userData={{ interact: VIGIL_STONE_INFO }}>
      <Box size={[2, 0.3, 1.5]} m={altar} position={[0, 0.15, 0]} />
      <Box size={[1.5, 0.7, 1.0]} m={altar} position={[0, 0.65, 0]} />
      <Box size={[1.8, 0.2, 1.3]} m={altar} position={[0, 1.1, 0]} />
      <Box size={[0.7, 0.06, 0.25]} m={mat({ color: '#1a1830', type: 'basic' })} position={[0, 0.7, 0.51]} />
      <Box ref={glowRef} size={[0.5, 0.08, 0.26]} m={sigil} position={[0, 0.7, 0.52]} />
      {stage >= STAGE.DONE && (
        <group position={[0, 1.36, 0]}>
          <Tankard />
        </group>
      )}
    </group>
  );
}

// The Toast of Courage in your right hand while you carry it.
export function HeldTankard() {
  const stage = useStore((s) => s.stage);
  const group = useRef();
  // Held in front of the camera: never let it catch the talk ray.
  useEffect(() => group.current?.traverse((o) => (o.raycast = () => {})), [stage]);
  useFrame(({ camera, clock }) => {
    if (!group.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    group.current.children[0].position.y = -0.42 + Math.sin(clock.elapsedTime * 2) * 0.01;
  });
  if (stage !== STAGE.TOAST) return null;
  return (
    <group ref={group}>
      <group position={[0.36, -0.42, -0.62]} rotation={[0.15, -0.5, 0]} scale={0.9}>
        <Tankard />
      </group>
    </group>
  );
}
