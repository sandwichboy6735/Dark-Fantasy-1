import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { store } from '../store.js';
import { STAGE } from '../game/quest.js';
import { sfx } from '../game/audio.js';

const BURSTS = 5;
const SPARKS = 28;
const COLOURS = ['#ffcc4a', '#ff5a3a', '#9be05a', '#6f9aff', '#ff7ae0', '#ffffff'];

// Goblin fireworks over the tavern once the Eye is closed: bursts of coloured
// sparks that bloom above the yard and drift down.
export function Fireworks() {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshBasicMaterial({ fog: false }), BURSTS * SPARKS);
    m.frustumCulled = false;
    m.raycast = () => {};
    m.count = 0;
    const white = new THREE.Color('#ffffff');
    for (let i = 0; i < BURSTS * SPARKS; i++) m.setColorAt(i, white);
    return m;
  }, []);
  const bursts = useRef([]);
  const next = useRef(0);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const colour = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const celebrating = store.get().stage >= STAGE.DONE;
    if (celebrating && now > next.current) {
      next.current = now + 0.9 + Math.random() * 1.2;
      const c = COLOURS[Math.floor(Math.random() * COLOURS.length)];
      const origin = new THREE.Vector3(18 + Math.random() * 24, 22 + Math.random() * 10, -4 + Math.random() * 26);
      const sparks = Array.from({ length: SPARKS }, () => {
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(6 + Math.random() * 3);
        return { p: origin.clone(), v };
      });
      bursts.current = [...bursts.current.slice(-(BURSTS - 1)), { born: now, colour: c, sparks }];
      sfx.firework();
    }
    let i = 0;
    for (const burst of bursts.current) {
      const age = now - burst.born;
      if (age > 2.4) continue;
      colour.set(burst.colour);
      for (const s of burst.sparks) {
        s.v.y -= 5 * dt;
        s.v.multiplyScalar(1 - dt * 0.9);
        s.p.addScaledVector(s.v, dt);
        const size = Math.max(0.05, 1 - age / 2.4);
        matrix.makeScale(size, size, size).setPosition(s.p);
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, colour);
        i++;
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
