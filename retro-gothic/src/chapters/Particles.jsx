import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { live } from '../game/live.js';

// Weather that follows the camera: one instanced mesh of tiny cubes that wrap
// around you. `kinds` mixes several sorts, each { color, speed (m/s, + rises),
// bob (m of wandering), share }. `wind` (m/s along x) reads live.windX too.
export function Particles({ count = 90, radius = 16, height = 12, size = 0.06, kinds, wind = 0.3, glow = false }) {
  const mesh = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ fog: !glow });
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), material, count);
    m.frustumCulled = false;
    m.raycast = () => {};
    return m;
  }, [count, size, glow]);
  const flakes = useMemo(() => {
    const total = kinds.reduce((sum, k) => sum + (k.share ?? 1), 0);
    return Array.from({ length: count }, (_, i) => {
      let pick = ((i * 0.618) % 1) * total;
      const kind = kinds.find((k) => (pick -= k.share ?? 1) < 0) ?? kinds[0];
      mesh.setColorAt(i, new THREE.Color(kind.color));
      return {
        x: (Math.random() - 0.5) * radius * 2,
        y: Math.random() * height,
        z: (Math.random() - 0.5) * radius * 2,
        kind,
        phase: Math.random() * 10,
      };
    });
  }, [count, radius, height, kinds, mesh]);
  const matrix = useMemo(() => new THREE.Matrix4(), []);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const gust = wind + (live.windX ?? 0);
    flakes.forEach((f, i) => {
      const k = f.kind;
      f.y += k.speed * dt;
      f.x += (Math.sin(t * 0.5 + f.phase) * (k.bob ?? 0.4) + gust) * dt;
      f.z += Math.cos(t * 0.4 + f.phase) * (k.bob ?? 0.3) * dt;
      const wx = ((((f.x - camera.position.x + radius) % (radius * 2)) + radius * 2) % (radius * 2)) - radius;
      const wz = ((((f.z - camera.position.z + radius) % (radius * 2)) + radius * 2) % (radius * 2)) - radius;
      if (f.y > height) f.y -= height;
      if (f.y < 0) f.y += height;
      matrix.makeTranslation(camera.position.x + wx, camera.position.y - height / 3 + f.y, camera.position.z + wz);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
