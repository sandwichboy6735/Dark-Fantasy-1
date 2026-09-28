import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { live } from '../game/live.js';
import { getTexture } from '../retro/textures.js';
import { applyVertexJitter } from '../retro/vertexJitter.js';

const MAX = 16;
const FALL_HEIGHT = 14;

// Falling masonry during the escape: a pulsing red ring marks each landing spot,
// then a block of the castle drops out of the dark onto it.
export function Debris() {
  const { rings, blocks } = useMemo(() => {
    const ringMaterial = new THREE.MeshBasicMaterial({ color: '#ff3020', transparent: true, opacity: 0.55, depthWrite: false, fog: false });
    const ringMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.9, 1.3, 12).rotateX(-Math.PI / 2), ringMaterial, MAX);
    const blockMaterial = applyVertexJitter(new THREE.MeshLambertMaterial({ color: '#7a7488', map: getTexture('castle'), flatShading: true }));
    const blockMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.9, 1.1), blockMaterial, MAX);
    for (const m of [ringMesh, blockMesh]) {
      m.frustumCulled = false;
      m.raycast = () => {};
      m.count = 0;
    }
    return { rings: ringMesh, blocks: blockMesh };
  }, []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const spin = useMemo(() => new THREE.Matrix4(), []);

  useFrame(() => {
    const list = live.debris.slice(0, MAX);
    let r = 0;
    let b = 0;
    for (const d of list) {
      const untilLand = d.landAt - live.gameTime;
      if (untilLand > 0) {
        const pulse = 1 + Math.sin(live.gameTime * 20) * 0.1;
        matrix.makeScale(pulse, 1, pulse).setPosition(d.x, d.y + 0.08, d.z);
        rings.setMatrixAt(r++, matrix);
      }
      // The block falls during the last half second, then lies there a moment.
      const height = Math.max(0, Math.min(1, untilLand / 0.5)) * FALL_HEIGHT;
      if (untilLand < 0.5) {
        matrix.makeTranslation(d.x, d.y + 0.45 + height, d.z).multiply(spin.makeRotationY(d.x * 3 + d.z));
        blocks.setMatrixAt(b++, matrix);
      }
    }
    rings.count = r;
    blocks.count = b;
    rings.instanceMatrix.needsUpdate = true;
    blocks.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={rings} />
      <primitive object={blocks} />
    </>
  );
}
