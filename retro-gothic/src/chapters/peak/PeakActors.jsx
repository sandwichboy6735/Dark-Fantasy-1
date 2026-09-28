import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, coneGeo, cylGeo, glow, icoGeo, mat } from '../../retro/materials.jsx';
import { getTexture } from '../../retro/textures.js';
import { applyVertexJitter } from '../../retro/vertexJitter.js';
import { store, useStore } from '../../store.js';
import { difficulty } from '../../game/quest.js';
import { live } from '../../game/live.js';
import { sfx } from '../../game/audio.js';
import { Goblin } from '../../world/Goblin.jsx';
import { isTalkingTo, turnTowards } from '../../world/actor.js';
import { BRANNOC_SPOT, BRAZIERS, CLIMBERS, MONKS, PEAK } from './quest.js';
import { COURTYARD, inCourtyard, peakColliders, peakGround } from './layout.js';
import { BRANNOC_INFO, climberInfo } from './npcs.js';

const fur = mat({ color: '#a08060', map: 'fur' });
const skin = mat({ color: '#c89478' });
const beard = mat({ color: '#e8e4dc' });
const staff = mat({ color: '#5a4030', map: 'darkwood' });
const ember = glow('#ff8a2a');
const emberCore = glow('#ffe070');
const iron = mat({ color: '#2a2a30', type: 'phong' });
const monkStone = mat({ color: '#e8e4f8', map: 'castle' });
const monkDark = mat({ color: '#0a0a10', type: 'basic' });
const monkEyes = glow('#9ad8ff');
const ice = mat({ color: '#b8e0ff', type: 'phong', shininess: 100, transparent: true, opacity: 0.5 });

// Brannoc: an old hermit in a shaggy coat, white beard to his belt, leaning on a
// staff with a lantern hung from it.
function Brannoc() {
  const root = useRef();
  const heading = useRef(0.6);
  useFrame(({ camera }, delta) => {
    const wanted = isTalkingTo('brannoc') ? Math.atan2(camera.position.x - BRANNOC_SPOT.x, camera.position.z - BRANNOC_SPOT.z) : 0.9;
    heading.current = turnTowards(heading.current, wanted, 2.5, Math.min(delta, 0.05));
    root.current.rotation.y = heading.current;
  });
  return (
    <group ref={root} position={[BRANNOC_SPOT.x, 0, BRANNOC_SPOT.z]} userData={{ interact: BRANNOC_INFO }}>
      <mesh geometry={cylGeo(0.36, 0.62, 1.5, 7)} material={fur} position={[0, 0.75, 0]} />
      <mesh geometry={cylGeo(0.5, 0.42, 0.45, 7)} material={fur} position={[0, 1.6, 0]} />
      <group position={[0, 1.98, 0.05]}>
        <mesh geometry={icoGeo(0.22, 1)} material={skin} />
        <Box size={[0.32, 0.55, 0.12]} m={beard} position={[0, -0.3, 0.15]} />
        <Box size={[0.26, 0.06, 0.1]} m={beard} position={[0, 0.1, 0.2]} />
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.05, 0.03, 0.02]} m={monkDark} position={[0.08 * s, 0.03, 0.21]} />
        ))}
        <mesh geometry={cylGeo(0.25, 0.27, 0.28, 8)} material={fur} position={[0, 0.2, 0]} />
      </group>
      <group position={[0.5, 0, 0.25]}>
        <Box size={[0.08, 2.3, 0.08]} m={staff} position={[0, 1.15, 0]} />
        <Box size={[0.4, 0.06, 0.06]} m={staff} position={[0.15, 2.2, 0]} />
        <Box size={[0.2, 0.26, 0.2]} m={ember} position={[0.32, 1.95, 0]} />
      </group>
      <Box size={[0.15, 0.6, 0.15]} m={fur} position={[0.4, 1.4, 0.1]} rotation={[-0.3, 0, -0.3]} />
    </group>
  );
}

// A goblin of the Tankard Mountaineering Society, frozen in ice until you chip
// them out.
function Climber({ id, x, z, rotation, name }) {
  const thawed = useStore((s) => s.peak.goblins.includes(id));
  const y = useMemo(() => peakGround(x, z) ?? 0, [x, z]);
  const info = useMemo(() => climberInfo(id, name), [id, name]);
  return (
    <group>
      <Goblin key={thawed ? 'thawed' : 'frozen'} {...info} position={[x, y, z]} rotation={rotation} pose={thawed ? 'cheer' : 'frozen'} skin="#6a9a4a" tunic="#8a3a2a" />
      {!thawed && <Box size={[1.4, 2.1, 1.4]} m={ice} position={[x, y + 1.05, z]} rotation={[0, rotation, 0]} />}
    </group>
  );
}

// The stone monks. They stand perfectly still while you look at them, and glide
// after you the moment you look away. Lit braziers keep them back.
const MONK_SPEED = 3.3;
const MONK_REACH = 1.0;
const BRAZIER_KEEP = 3.2;

function MonkBody({ eyes }) {
  return (
    <group>
      <mesh geometry={cylGeo(0.35, 0.65, 1.7, 7)} material={monkStone} position={[0, 0.85, 0]} />
      <mesh geometry={cylGeo(0.4, 0.45, 0.4, 7)} material={monkStone} position={[0, 1.85, 0]} />
      <group position={[0, 2.2, 0]} rotation={[0.25, 0, 0]}>
        <mesh geometry={coneGeo(0.4, 0.95, 7)} material={monkStone} position={[0, 0.15, -0.05]} />
        <Box size={[0.3, 0.34, 0.1]} m={monkDark} position={[0, -0.05, 0.25]} />
        <group ref={eyes}>
          {[-1, 1].map((s) => (
            <Box key={s} size={[0.06, 0.035, 0.02]} m={monkEyes} position={[0.07 * s, -0.02, 0.3]} />
          ))}
        </group>
      </group>
      {/* Hands pressed together in prayer. */}
      <Box size={[0.2, 0.34, 0.18]} m={monkStone} position={[0, 1.4, 0.42]} rotation={[0.4, 0, 0]} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.2, 0.62, 0.22]} m={monkStone} position={[0.3 * s, 1.5, 0.22]} rotation={[0.9, 0, -0.35 * s]} />
      ))}
    </group>
  );
}

const frustum = new THREE.Frustum();
const viewProjection = new THREE.Matrix4();
const probe = new THREE.Sphere(new THREE.Vector3(), 0.9);

function Monk({ id, x, z, index }) {
  const root = useRef();
  const eyes = useRef();
  const brain = useRef({ x, z, heading: 0.4 + index, epoch: 0, glow: 0 });
  const stage = useStore((s) => s.peak.stage);
  const crumbled = stage >= PEAK.SUMMIT;

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const m = brain.current;
    if (m.epoch !== live.resetWatchers) {
      m.epoch = live.resetWatchers;
      m.x = x;
      m.z = z;
    }
    const p = live.player;
    const { playing, peak, talking } = store.get();
    // They hold still while you're busy with a brazier (or anyone else).
    const awake = playing && !talking && peak.stage === PEAK.BRAZIERS && inCourtyard(p.x, p.z) && Math.abs(p.y - COURTYARD.y) < 1;
    probe.center.set(m.x, COURTYARD.y + 1.3, m.z);
    const seen = frustum.intersectsSphere(probe);
    const dist = Math.hypot(p.x - m.x, p.z - m.z);
    let moved = false;
    if (awake && !seen && dist > MONK_REACH * 0.8) {
      const step = Math.min(dist - MONK_REACH * 0.8, MONK_SPEED * difficulty().monk * dt);
      const nx = m.x + ((p.x - m.x) / dist) * step;
      const nz = m.z + ((p.z - m.z) / dist) * step;
      const lit = BRAZIERS.filter((b) => peak.braziers.includes(b.id));
      const tooHot = (px, pz) => lit.some((b) => Math.hypot(b.x - px, b.z - pz) < BRAZIER_KEEP);
      if (!tooHot(nx, nz)) {
        m.x = nx;
        m.z = nz;
        moved = true;
      } else if (!tooHot(nx, m.z)) {
        m.x = nx;
        moved = true;
      } else if (!tooHot(m.x, nz)) {
        m.z = nz;
        moved = true;
      }
      m.heading = Math.atan2(p.x - m.x, p.z - m.z);
    }
    if (awake && dist < MONK_REACH && !live.caughtBy) live.caughtBy = 'monk';
    if (awake && !seen && dist < 4.5) live.monkNearThisFrame = true;
    if (moved) live.monksMovingThisFrame = true;
    m.glow = moved ? 1 : Math.max(0, m.glow - dt * 0.5);
    root.current.position.set(m.x, COURTYARD.y, m.z);
    root.current.rotation.set(0, m.heading, 0);
    eyes.current.visible = !crumbled && (m.glow > 0.05 || awake);
  });

  if (crumbled) {
    // Once all three braziers burn, the monks fall to pieces where they stood.
    return (
      <group position={[brain.current.x, COURTYARD.y, brain.current.z]}>
        <mesh geometry={cylGeo(0.5, 0.65, 0.6, 7)} material={monkStone} position={[0, 0.3, 0]} />
        <mesh geometry={coneGeo(0.4, 0.95, 7)} material={monkStone} position={[0.8, 0.3, 0.4]} rotation={[1.4, 0, 0.6]} />
        <mesh geometry={icoGeo(0.3)} material={monkStone} position={[-0.6, 0.2, -0.3]} />
        <group ref={eyes} />
        <group ref={root} visible={false} />
      </group>
    );
  }
  return (
    <group ref={root} position={[x, COURTYARD.y, z]} raycast={() => null}>
      <MonkBody eyes={eyes} />
    </group>
  );
}

function Monks() {
  const last = useRef(0);
  // Before the monks move: work out what the camera can see, and reset the tallies.
  useFrame(({ camera }) => {
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProjection);
    live.monkNear = Boolean(live.monkNearThisFrame);
    live.monkNearThisFrame = false;
    // The grinding of stone on stone, behind you, whenever they move.
    if (live.monksMovingThisFrame && live.now - last.current > 0.7) {
      last.current = live.now;
      sfx.grind();
    }
    live.monksMovingThisFrame = false;
  }, -1);
  return MONKS.map((m, i) => <Monk key={m.id} {...m} index={i} />);
}

// Boulders thundering down the chute (simulated in rules.js).
function Boulders() {
  const mesh = useMemo(() => {
    const material = applyVertexJitter(new THREE.MeshLambertMaterial({ color: '#8a8698', map: getTexture('rock'), flatShading: true }));
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.05, 1), material, 6);
    m.frustumCulled = false;
    m.raycast = () => {};
    m.count = 0;
    return m;
  }, []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const spin = useMemo(() => new THREE.Matrix4(), []);
  useFrame(() => {
    const list = live.boulders.slice(0, 6);
    list.forEach((r, i) => {
      matrix.makeTranslation(r.x, r.y ?? 0, r.z).multiply(spin.makeRotationX(r.spin));
      mesh.setMatrixAt(i, matrix);
    });
    mesh.count = list.length;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

// Brannoc's ember in a little iron lantern, carried in your right hand up the
// mountain. Its light is always there (dark before you have it) so the number of
// lights never changes.
export function HeldLantern() {
  const group = useRef();
  const light = useRef();
  const stage = useStore((s) => s.peak.stage);
  const carrying = stage >= PEAK.CLIMB && stage < PEAK.DONE;
  useEffect(() => group.current?.traverse((o) => (o.raycast = () => {})), []);
  useFrame(({ camera, clock }) => {
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    group.current.visible = carrying;
    light.current.intensity = carrying ? 9 + Math.sin(clock.elapsedTime * 7) * 1.2 : 0;
    group.current.children[0].rotation.z = Math.sin(clock.elapsedTime * 2) * 0.05;
  });
  return (
    <group ref={group}>
      <group position={[0.3, -0.3, -0.62]} scale={0.42}>
        <Box size={[0.03, 0.18, 0.03]} m={iron} position={[0, 0.2, 0]} />
        <Box size={[0.2, 0.04, 0.2]} m={iron} position={[0, 0.1, 0]} />
        <Box size={[0.14, 0.18, 0.14]} m={ember} position={[0, 0, 0]} />
        <Box size={[0.07, 0.08, 0.07]} m={emberCore} position={[0, -0.02, 0]} />
        <Box size={[0.2, 0.04, 0.2]} m={iron} position={[0, -0.11, 0]} />
      </group>
      <pointLight ref={light} color="#ff9a40" intensity={0} distance={9} decay={1.6} position={[0.2, 0.3, -1.4]} />
    </group>
  );
}

peakColliders.circle(BRANNOC_SPOT.x, BRANNOC_SPOT.z, 0.5);

export function PeakActors() {
  return (
    <>
      <Brannoc />
      {CLIMBERS.map((c) => (
        <Climber key={c.id} {...c} />
      ))}
      <Monks />
      <Boulders />
    </>
  );
}
