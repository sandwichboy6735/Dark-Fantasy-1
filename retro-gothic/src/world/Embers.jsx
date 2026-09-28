import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 90;
const RADIUS = 16;

// Ash and embers drifting on the wind around you: grey flakes falling, a few
// orange sparks rising. One instanced mesh that follows the camera.
export function Embers() {
  const mesh = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ vertexColors: false, fog: true });
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), material, COUNT);
    m.frustumCulled = false;
    m.raycast = () => {};
    const ash = new THREE.Color('#6a6478');
    const ember = new THREE.Color('#ff7a2a');
    for (let i = 0; i < COUNT; i++) m.setColorAt(i, i % 5 === 0 ? ember : ash);
    return m;
  }, []);
  const flakes = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: (Math.random() - 0.5) * RADIUS * 2,
        y: Math.random() * 12,
        z: (Math.random() - 0.5) * RADIUS * 2,
        rising: i % 5 === 0,
        phase: Math.random() * 10,
      })),
    [],
  );
  const matrix = useMemo(() => new THREE.Matrix4(), []);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    flakes.forEach((f, i) => {
      f.y += (f.rising ? 0.9 : -0.45) * dt;
      f.x += (Math.sin(t * 0.5 + f.phase) * 0.4 + 0.3) * dt;
      f.z += Math.cos(t * 0.4 + f.phase) * 0.3 * dt;
      // Wrap around the camera so there's always weather near you.
      const wx = ((((f.x - camera.position.x + RADIUS) % (RADIUS * 2)) + RADIUS * 2) % (RADIUS * 2)) - RADIUS;
      const wz = ((((f.z - camera.position.z + RADIUS) % (RADIUS * 2)) + RADIUS * 2) % (RADIUS * 2)) - RADIUS;
      if (f.y > 12) f.y -= 12;
      if (f.y < 0) f.y += 12;
      matrix.makeTranslation(camera.position.x + wx, camera.position.y - 4 + f.y, camera.position.z + wz);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
