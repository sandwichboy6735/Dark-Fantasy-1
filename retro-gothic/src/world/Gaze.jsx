import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAZE_RADIUS } from '../game/quest.js';
import { live } from '../game/live.js';
import { EYE_POSITION, skipInNormalPass } from './Sky.jsx';

const UP = new THREE.Vector3(0, 1, 0);
const beamMaterial = new THREE.MeshBasicMaterial({
  color: '#3f6dff',
  transparent: true,
  opacity: 0.1,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
});
const poolMaterial = new THREE.MeshBasicMaterial({
  color: '#5a86ff',
  transparent: true,
  opacity: 0.32,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
});
const rimMaterial = poolMaterial.clone();
rimMaterial.opacity = 0.6;

// One of the Eye's searchlights: a shaft of cold light from the Eye down to a pool
// on the stones, with a real blue light so it washes over the walls and guards.
function Searchlight({ index }) {
  const beam = useRef();
  const pool = useRef();
  const light = useRef();
  const group = useRef();
  const visuals = useRef();
  const geometries = useMemo(
    () => ({
      beam: new THREE.CylinderGeometry(3, GAZE_RADIUS, 1, 16, 1, true).translate(0, 0.5, 0),
      pool: new THREE.CircleGeometry(GAZE_RADIUS, 24).rotateX(-Math.PI / 2),
      rim: new THREE.RingGeometry(GAZE_RADIUS - 0.25, GAZE_RADIUS, 24).rotateX(-Math.PI / 2),
    }),
    [],
  );
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const g = live.gazes[index];
    const on = Boolean(g?.active);
    // Hide the shaft but never the light itself: changing the number of lights
    // in view would make every material recompile.
    visuals.current.visible = on;
    light.current.intensity = on ? 30 : 0;
    if (!on) return;
    const ground = new THREE.Vector3(g.x, g.y + 0.05, g.z);
    group.current.position.copy(ground);
    direction.copy(EYE_POSITION).sub(ground);
    beam.current.scale.set(1, direction.length(), 1);
    beam.current.quaternion.setFromUnitVectors(UP, direction.normalize());
    pool.current.scale.setScalar(0.92 + Math.sin(clock.elapsedTime * 6 + index) * 0.08);
  });

  return (
    <group ref={group}>
      <group ref={visuals}>
        <mesh ref={beam} geometry={geometries.beam} material={beamMaterial} onBeforeRender={skipInNormalPass} raycast={() => null} />
        <mesh ref={pool} geometry={geometries.pool} material={poolMaterial} onBeforeRender={skipInNormalPass} raycast={() => null} />
        <mesh geometry={geometries.rim} material={rimMaterial} onBeforeRender={skipInNormalPass} raycast={() => null} />
      </group>
      <pointLight ref={light} color="#4a70ff" intensity={0} distance={10} decay={1.5} position={[0, 3, 0]} />
    </group>
  );
}

export function Gaze() {
  return [0, 1, 2].map((i) => <Searchlight key={i} index={i} />);
}
