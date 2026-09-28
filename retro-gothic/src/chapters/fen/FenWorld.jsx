import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, boxGeo, coneGeo, cylGeo, dodecaGeo, glow, mat, roofGeo } from '../../retro/materials.jsx';
import { getTexture } from '../../retro/textures.js';
import { useStore } from '../../store.js';
import { live } from '../../game/live.js';
import { FlickerLight } from '../../world/Lights.jsx';
import { LANTERNS, lanternLit } from './quest.js';
import {
  BOARD,
  BOARDWALKS,
  BOARD_HALF_WIDTH,
  CHAPEL,
  ISLANDS,
  STEPS_PER_TURN,
  TOWER,
  TOWER_TOP,
  TURNS,
  WATER_SURFACE,
  fenColliders,
  isWater,
  stepAngle,
  stepHeight,
} from './layout.js';

const mud = mat({ color: '#b8b894', map: 'mud' });
const water = mat({ color: '#7a9a90', map: 'water', type: 'phong', shininess: 70 });
const plank = mat({ color: '#8a7058', map: 'wood' });
const rotten = mat({ color: '#8a7a64', map: 'wood' });
const bark = mat({ color: '#3a3428', map: 'darkwood' });
const reed = mat({ color: '#5a6a30' });
const reedTop = mat({ color: '#4a3020' });
const pad = mat({ color: '#3a6a2a' });
const moss = mat({ color: '#c8d4c0', map: 'moss' });
const mossDark = mat({ color: '#94a090', map: 'moss' });
const thatch = mat({ color: '#6a5a38', map: 'dirt' });
const iron = mat({ color: '#24262a', type: 'phong' });
const hanging = mat({ color: '#3a4a2a' });
const witchGlass = glow('#d8ff7a');
const deadGlass = mat({ color: '#2a3020' });
const hutWindow = glow('#9aff5a');

function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// One instanced mesh for a crowd of identical boxes: reeds, planks, steps.
function Instances({ geometry, material, transforms }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    transforms.forEach((t, i) => {
      q.setFromEuler(e.set(...(t.rotation ?? [0, 0, 0])));
      m.compose(new THREE.Vector3(...t.position), q, new THREE.Vector3(...(t.scale ?? [1, 1, 1])));
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [transforms]);
  return <instancedMesh ref={ref} args={[geometry, material, transforms.length]} raycast={() => null} />;
}

// The fen's black water. It scrolls slowly and, in the flood, rises.
function Water() {
  const mesh = useRef();
  useMemo(() => {
    const t = getTexture('water');
    t.repeat.set(110, 110);
  }, []);
  useFrame(({ clock }) => {
    const t = getTexture('water');
    t.offset.set(clock.elapsedTime * 0.01, Math.sin(clock.elapsedTime * 0.1) * 0.02);
    mesh.current.position.y = live.waterY;
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_SURFACE, -35]} material={water} raycast={() => null}>
      <planeGeometry args={[440, 440, 8, 8]} />
    </mesh>
  );
}

// Mud islands: a low drum of mud with boulders and roots round the shore.
function Island({ x, z, r, seed }) {
  const rocks = useMemo(() => {
    const rand = seeded(seed * 97 + 13);
    return Array.from({ length: Math.round(r * 1.2) }, () => {
      const a = rand() * Math.PI * 2;
      const size = 0.35 + rand() * 0.7;
      return { position: [x + Math.sin(a) * (r + 0.2), -0.25, z + Math.cos(a) * (r + 0.2)], scale: [size * 1.3, size * 0.6, size], rotation: [rand(), rand() * 3, rand()] };
    });
  }, [x, z, r, seed]);
  return (
    <group>
      <mesh geometry={cylGeo(r, r + 1.4, 1.4, 11)} material={mud} position={[x, -0.7, z]} rotation={[0, seed, 0]} />
      {rocks.map((rock, i) => (
        <mesh key={i} geometry={dodecaGeo(1)} material={mud} {...rock} />
      ))}
    </group>
  );
}

// Reeds in clumps round the shores and out in the shallows.
function Reeds() {
  const transforms = useMemo(() => {
    const rand = seeded(42);
    const list = [];
    const clump = (cx, cz, n) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * 2.4;
        const z = cz + (rand() - 0.5) * 2.4;
        const h = 0.9 + rand() * 1.1;
        list.push({ position: [x, WATER_SURFACE + h / 2 - 0.2, z], rotation: [(rand() - 0.5) * 0.3, rand() * 3, (rand() - 0.5) * 0.3], scale: [1, h, 1] });
      }
    };
    for (const island of ISLANDS) {
      const count = Math.round(island.r * 0.9);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rand();
        clump(island.x + Math.sin(a) * (island.r + 0.8), island.z + Math.cos(a) * (island.r + 0.8), 5);
      }
    }
    for (let i = 0; i < 40; i++) {
      const x = (rand() - 0.5) * 76;
      const z = 26 - rand() * 124;
      if (isWater(x, z)) clump(x, z, 4);
    }
    return list;
  }, []);
  const tops = useMemo(
    () => transforms.filter((_, i) => i % 3 === 0).map((t) => ({ position: [t.position[0], t.position[1] + t.scale[1] / 2, t.position[2]], rotation: t.rotation })),
    [transforms],
  );
  return (
    <>
      <Instances geometry={boxGeo(0.05, 1, 0.05)} material={reed} transforms={transforms} />
      <Instances geometry={boxGeo(0.09, 0.28, 0.09)} material={reedTop} transforms={tops} />
    </>
  );
}

function LilyPads() {
  const transforms = useMemo(() => {
    const rand = seeded(7);
    const list = [];
    for (let i = 0; i < 70; i++) {
      const x = (rand() - 0.5) * 74;
      const z = 24 - rand() * 120;
      if (isWater(x, z)) list.push({ position: [x, WATER_SURFACE + 0.02, z], rotation: [0, rand() * 6, 0], scale: [0.6 + rand() * 0.7, 1, 0.6 + rand() * 0.7] });
    }
    list.push({ position: [6, WATER_SURFACE + 0.02, -31], scale: [1.3, 1, 1.3] }); // the toad's
    return list;
  }, []);
  return <Instances geometry={cylGeo(0.5, 0.5, 0.03, 7)} material={pad} transforms={transforms} />;
}

// Planks across each boardwalk, skipping the gaps (a few broken ends dangle).
function Boardwalks() {
  const { planks, posts } = useMemo(() => {
    const planks = [];
    const posts = [];
    const rand = seeded(5);
    for (const w of BOARDWALKS) {
      const [ax, az] = w.a;
      const dx = w.b[0] - ax;
      const dz = w.b[1] - az;
      const len = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz);
      const count = Math.floor(len / 0.42);
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const gap = (w.gaps ?? []).find(([t0, t1]) => t >= t0 - 0.02 && t <= t1 + 0.02);
        const x = ax + dx * t;
        const z = az + dz * t;
        if (gap) {
          // Broken planks hanging into the water at each edge of a gap.
          if (Math.abs(t - gap[0]) < 0.025 || Math.abs(t - gap[1]) < 0.025) {
            planks.push({ position: [x, BOARD - 0.25, z], rotation: [0.5 * (t < gap[0] + 0.03 ? 1 : -1), yaw, 0.2], scale: [0.7, 1, 1] });
          }
          continue;
        }
        planks.push({ position: [x, BOARD - 0.04, z], rotation: [0, yaw + (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.04] });
      }
      const postCount = Math.floor(len / 2.2);
      for (let i = 0; i <= postCount; i++) {
        const t = i / postCount;
        if ((w.gaps ?? []).some(([t0, t1]) => t > t0 && t < t1)) continue;
        for (const side of [-1, 1]) {
          const nx = (Math.cos(yaw) * side * BOARD_HALF_WIDTH) * 0.95;
          const nz = (-Math.sin(yaw) * side * BOARD_HALF_WIDTH) * 0.95;
          posts.push({ position: [ax + dx * t + nx, -0.2, az + dz * t + nz], rotation: [0, 0, (rand() - 0.5) * 0.15] });
        }
      }
    }
    return { planks, posts };
  }, []);
  return (
    <>
      <Instances geometry={boxGeo(BOARD_HALF_WIDTH * 2, 0.08, 0.34, 1)} material={plank} transforms={planks} />
      <Instances geometry={boxGeo(0.14, 1.1, 0.14)} material={rotten} transforms={posts} />
    </>
  );
}

// A weeping willow: a crooked trunk with strands of moss hanging off every branch.
function Willow({ position, scale = 1, seed = 1 }) {
  const strands = useMemo(() => {
    const rand = seeded(seed * 31 + 3);
    return Array.from({ length: 18 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 0.8 + rand() * 1.6;
      const h = 1 + rand() * 1.8;
      return { position: [Math.sin(a) * r, 4.2 - h / 2 + rand() * 0.4, Math.cos(a) * r], size: [0.08, h, 0.08] };
    });
  }, [seed]);
  return (
    <group position={position} scale={scale}>
      <Box size={[0.5, 3.6, 0.5]} m={bark} position={[0, 1.8, 0]} rotation={[0.08, 0, -0.1]} />
      <Box size={[0.24, 2.2, 0.24]} m={bark} position={[0.7, 3.9, 0]} rotation={[0, 0, -0.9]} />
      <Box size={[0.24, 2, 0.24]} m={bark} position={[-0.6, 3.8, 0.3]} rotation={[0.3, 0, 0.9]} />
      <Box size={[0.2, 1.6, 0.2]} m={bark} position={[0.1, 4.3, -0.6]} rotation={[-0.8, 0, 0]} />
      {strands.map((s, i) => (
        <Box key={i} size={s.size} m={hanging} position={s.position} />
      ))}
    </group>
  );
}

// An old gibbet: a post with an arm, and an empty iron cage creaking on its chain.
function Gibbet({ position }) {
  const cage = useRef();
  useFrame(({ clock }) => {
    cage.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.08;
  });
  return (
    <group position={position}>
      <Box size={[0.3, 5, 0.3]} m={bark} position={[0, 2.5, 0]} />
      <Box size={[2.2, 0.25, 0.25]} m={bark} position={[0.95, 4.8, 0]} />
      <Box size={[0.2, 1, 0.2]} m={bark} position={[0.45, 4.3, 0]} rotation={[0, 0, 0.8]} />
      <group ref={cage} position={[1.8, 4.7, 0]}>
        <Box size={[0.03, 0.8, 0.03]} m={iron} position={[0, -0.4, 0]} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Box key={i} size={[0.04, 1.4, 0.04]} m={iron} position={[Math.sin(i * 1.05) * 0.4, -1.5, Math.cos(i * 1.05) * 0.4]} />
        ))}
        <mesh geometry={cylGeo(0.45, 0.45, 0.06, 6)} material={iron} position={[0, -0.8, 0]} />
        <mesh geometry={cylGeo(0.45, 0.45, 0.06, 6)} material={iron} position={[0, -2.2, 0]} />
      </group>
    </group>
  );
}

// Half a rowing boat, sunk at the stern.
function Wreck({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0.18, rotation, 0.1]}>
      <Box size={[1.8, 0.5, 4.2]} m={rotten} position={[0, 0.3, 0]} />
      <Box size={[1.5, 0.1, 3.8]} m={plank} position={[0, 0.5, 0]} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.12, 0.7, 4.3]} m={rotten} position={[0.9 * s, 0.5, 0]} rotation={[0, 0, 0.25 * s]} />
      ))}
      <Box size={[1.5, 0.12, 0.3]} m={plank} position={[0, 0.8, 0.6]} />
      <mesh geometry={coneGeo(0.9, 1.2, 4)} material={rotten} position={[0, 0.4, 2.6]} rotation={[Math.PI / 2, Math.PI / 4, 0]} />
    </group>
  );
}

// Mother Murk's hut on stilts, with a ladder and a green window.
function Hut({ position }) {
  return (
    <group position={position}>
      {[-2.1, 2.1].flatMap((sx) => [-2.1, 2.1].map((sz) => <Box key={`${sx}${sz}`} size={[0.3, 2.6, 0.3]} m={bark} position={[sx, 1.1, sz]} rotation={[0, 0, sx * 0.02]} />))}
      <Box size={[5.4, 0.3, 5.4]} m={rotten} position={[0, 2.35, 0]} />
      <Box size={[4.2, 2.6, 4.2]} m={rotten} position={[0, 3.8, 0.2]} rotation={[0, 0.04, 0.02]} />
      <mesh geometry={roofGeo(5.4, 2.6, 5.2)} material={thatch} position={[0, 5.05, 0.2]} rotation={[0, Math.PI / 2, 0.05]} />
      <Box size={[0.8, 2.2, 0.8]} m={mossDark} position={[1.2, 6.2, 1.2]} rotation={[0, 0, 0.12]} />
      <Box size={[0.9, 0.8, 0.1]} m={hutWindow} position={[-0.8, 4, -1.96]} />
      <Box size={[0.9, 0.08, 0.12]} m={bark} position={[-0.8, 4, -1.98]} />
      <Box size={[1.0, 1.8, 0.1]} m={bark} position={[1.0, 3.4, -1.92]} />
      {/* Ladder down to the mud. */}
      <group position={[1.0, 0, -2.9]} rotation={[-0.3, 0, 0]}>
        {[-0.35, 0.35].map((lx) => (
          <Box key={lx} size={[0.08, 2.8, 0.08]} m={bark} position={[lx, 1.3, 0]} />
        ))}
        {[0.4, 0.9, 1.4, 1.9, 2.4].map((ly) => (
          <Box key={ly} size={[0.7, 0.06, 0.06]} m={bark} position={[0, ly, 0]} />
        ))}
      </group>
      {/* Drying herbs and a skull on a pole. */}
      {[-1.6, -1.1, -0.6].map((hx) => (
        <Box key={hx} size={[0.12, 0.4, 0.12]} m={hanging} position={[hx, 2.0, -2.5]} />
      ))}
      <Box size={[0.1, 2.4, 0.1]} m={bark} position={[-2.6, 1.2, -2.6]} />
      <mesh geometry={dodecaGeo(0.22)} material={mat({ color: '#d8d0b0' })} position={[-2.6, 2.5, -2.6]} />
      <FlickerLight intensity={10} color="#9aff5a" distance={8} seed={9} position={[-0.8, 4, -2.6]} />
    </group>
  );
}

// A witch-light: a lantern of green-gold fire on a crooked pole. The Drowned
// won't come near a lit one.
function WitchLight({ id, x, z, seed }) {
  const lit = useStore((s) => lanternLit(LANTERNS.find((l) => l.id === id), s.fen.lit));
  const flame = useRef();
  useFrame(({ clock }) => {
    if (flame.current) flame.current.scale.y = 1 + Math.sin(clock.elapsedTime * 9 + seed) * 0.15;
  });
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.16, 2.8, 0.16]} m={bark} position={[0, 1.4, 0]} rotation={[0, 0, 0.04]} />
      <Box size={[0.9, 0.1, 0.1]} m={bark} position={[0.35, 2.7, 0]} />
      <group position={[0.7, 2.25, 0]}>
        <Box size={[0.03, 0.3, 0.03]} m={iron} position={[0, 0.3, 0]} />
        <Box size={[0.32, 0.06, 0.32]} m={iron} position={[0, 0.16, 0]} />
        <Box size={[0.3, 0.06, 0.3]} m={iron} position={[0, -0.18, 0]} />
        <Box ref={flame} size={[0.24, 0.3, 0.24]} m={lit ? witchGlass : deadGlass} />
      </group>
      <FlickerLight intensity={lit ? 26 : 0} color="#c8ff6a" distance={13} decay={1.5} seed={seed} position={[0.7, 2.1, 0]} />
    </group>
  );
}

// The Sunken Chapel: roofless mossy walls, pillars, pews and two tall candle stands.
const PILLARS = [
  [-3.2, -61, 5.5],
  [3.2, -61, 3],
  [-3.2, -65.5, 2.2],
  [3.2, -65.5, 6],
  [-3.2, -70, 6.2],
  [3.2, -70, 1.4],
];
const PEWS = [-61.5, -63.5, -65.5, -67.5];
const CANDLE_STANDS = [-2.4, 2.4];
PILLARS.forEach(([px, pz]) => fenColliders.circle(px, pz, 0.5));
PEWS.forEach((pz) => [-2.25, 2.25].forEach((x) => fenColliders.box(x - 1.2, x + 1.2, pz - 0.35, pz + 0.3)));
CANDLE_STANDS.forEach((cx) => fenColliders.circle(cx, -73.8, 0.3));
fenColliders.box(4.5, 9.5, 12.5, 17.5); // the hut's stilts

function Chapel() {
  const wall = (x0, x1, z0, z1, h, key) => (
    <Box key={key} size={[x1 - x0, h, z1 - z0]} m={moss} position={[(x0 + x1) / 2, h / 2, (z0 + z1) / 2]} />
  );
  const pillars = PILLARS;
  const pews = PEWS;
  return (
    <group>
      <Box size={[10.4, 0.1, 18.4]} m={mossDark} position={[0, 0.02, -67]} />
      {wall(-5.4, -4.6, -76, -67, 5.2, 'w1')}
      {wall(-5.4, -4.6, -62, -58, 4.1, 'w2')}
      {wall(-5.4, -4.6, -67, -62, 1.1, 'w3')}
      {wall(4.6, 5.4, -76, -66, 6.4, 'e1')}
      {wall(4.6, 5.4, -66, -58, 3.6, 'e2')}
      {wall(-5.4, -1.4, -58.4, -57.6, 5.8, 's1')}
      {wall(1.4, 5.4, -58.4, -57.6, 4.4, 's2')}
      {wall(-5.4, -1.5, -76.4, -75.6, 6.8, 'n1')}
      {wall(1.5, 5.4, -76.4, -75.6, 7.4, 'n2')}
      {/* Arches over the door and the way through to the tower. */}
      <Box size={[3.2, 0.8, 0.9]} m={moss} position={[0, 4.4, -58]} />
      <Box size={[3.2, 0.8, 0.9]} m={moss} position={[0, 5.2, -76]} />
      {/* Window frames in the east wall, open to the fog. */}
      {[-63, -71].map((wz) => (
        <group key={wz}>
          <Box size={[0.9, 3, 0.14]} m={iron} position={[5.05, 3.5, wz]} rotation={[0, Math.PI / 2, 0]} />
          <Box size={[1.6, 0.14, 0.14]} m={iron} position={[5.05, 3.5, wz]} rotation={[0, Math.PI / 2, 0]} />
        </group>
      ))}
      {pillars.map(([px, pz, h]) => (
        <group key={`${px}${pz}`}>
          <mesh geometry={cylGeo(0.42, 0.5, h, 8)} material={moss} position={[px, h / 2, pz]} />
        </group>
      ))}
      {/* A fallen pillar across the west aisle. */}
      <mesh geometry={cylGeo(0.42, 0.42, 3.4, 8)} material={moss} position={[-3.6, 0.42, -63.8]} rotation={[0.2, 0, Math.PI / 2]} />
      {pews.map((pz, i) =>
        [-1, 1].map((side) => {
          const x = side * 2.25;
          const toppled = (i + (side > 0 ? 1 : 0)) % 3 === 2;
          return (
            <group key={`${pz}${side}`} position={[x, 0, pz]} rotation={toppled ? [0, 0.3 * side, 1.2 * side] : [0, 0, 0]}>
              <Box size={[2.3, 0.1, 0.5]} m={rotten} position={[0, 0.45, 0]} />
              <Box size={[2.3, 0.6, 0.08]} m={rotten} position={[0, 0.75, -0.25]} />
              {[-1, 1].map((e) => (
                <Box key={e} size={[0.08, 0.45, 0.45]} m={rotten} position={[1.1 * e, 0.22, 0]} />
              ))}
            </group>
          );
        }),
      )}
      {CANDLE_STANDS.map((cx) => (
        <group key={cx} position={[cx, 0, -73.8]}>
          <Box size={[0.12, 1.8, 0.12]} m={iron} position={[0, 0.9, 0]} />
          <Box size={[0.6, 0.06, 0.12]} m={iron} position={[0, 1.8, 0]} />
          {[-0.25, 0, 0.25].map((dx) => (
            <Box key={dx} size={[0.06, 0.14, 0.06]} m={glow('#ffd86a')} position={[dx, 1.92, 0]} />
          ))}
          <FlickerLight intensity={30} distance={15} seed={cx} position={[0, 2.3, 0]} />
        </group>
      ))}
    </group>
  );
}

// The bell tower, and its stair of stone slabs winding three times round it.
function Tower() {
  const steps = useMemo(() => {
    const list = [];
    const mid = (TOWER.core + TOWER.outer) / 2;
    for (let k = 0; k < STEPS_PER_TURN * TURNS; k++) {
      const a = stepAngle(k) + Math.PI / STEPS_PER_TURN;
      list.push({ position: [TOWER.x + Math.sin(a) * mid, stepHeight(k) - 0.2, TOWER.z + Math.cos(a) * mid], rotation: [0, a, 0] });
    }
    return list;
  }, []);
  const merlons = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2 + Math.PI / 12)
        .filter((a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > 0.5)
        .map((a) => ({ position: [TOWER.x + Math.sin(a) * (TOWER.core - 0.3), TOWER_TOP + 0.4, TOWER.z + Math.cos(a) * (TOWER.core - 0.3)], rotation: [0, a, 0] })),
    [],
  );
  const arc = (TOWER.outer * Math.PI * 2) / STEPS_PER_TURN + 0.1;
  return (
    <group>
      <mesh geometry={cylGeo(TOWER.core, TOWER.core + 0.3, TOWER_TOP, 14)} material={moss} position={[TOWER.x, TOWER_TOP / 2, TOWER.z]} />
      <mesh geometry={cylGeo(TOWER.core + 0.1, TOWER.core + 0.1, 0.3, 14)} material={mossDark} position={[TOWER.x, TOWER_TOP - 0.1, TOWER.z]} />
      <Instances geometry={boxGeo(arc, 0.4, TOWER.outer - TOWER.core, 1)} material={mossDark} transforms={steps} />
      <Instances geometry={boxGeo(1.2, 0.8, 0.5)} material={moss} transforms={merlons} />
      {/* A little belfry on the roof, its bell long silent. */}
      {[-1.4, 1.4].map((bx) => (
        <Box key={bx} size={[0.25, 3, 0.25]} m={bark} position={[TOWER.x + bx, TOWER_TOP + 1.5, TOWER.z - 1.5]} />
      ))}
      <Box size={[3.2, 0.3, 0.3]} m={bark} position={[TOWER.x, TOWER_TOP + 3, TOWER.z - 1.5]} />
      <mesh geometry={cylGeo(0.3, 0.6, 0.8, 8)} material={mat({ color: '#6a7a50', type: 'phong' })} position={[TOWER.x, TOWER_TOP + 2.4, TOWER.z - 1.5]} />
      {/* Slit windows up the tower. */}
      {[3, 7, 11].map((y, i) => (
        <Box key={y} size={[0.3, 1.2, 0.3]} m={mat({ color: '#050806', type: 'basic' })} position={[TOWER.x + Math.sin(i * 2.1) * TOWER.core, y, TOWER.z + Math.cos(i * 2.1) * TOWER.core]} />
      ))}
    </group>
  );
}

// A distant ring of dead trees, standing in the water where the fen ends.
function DeadForest() {
  const trees = useMemo(() => {
    const rand = seeded(19);
    const list = [];
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      const r = 1 + rand() * 0.25;
      const x = Math.sin(a) * 52 * r;
      const z = -35 + Math.cos(a) * 80 * r;
      const h = 5 + rand() * 7;
      list.push({ position: [x, h / 2 - 0.5, z], scale: [1, h, 1], rotation: [(rand() - 0.5) * 0.2, rand() * 3, (rand() - 0.5) * 0.2] });
    }
    return list;
  }, []);
  return <Instances geometry={boxGeo(0.6, 1, 0.6, 1)} material={bark} transforms={trees} />;
}

export function FenWorld() {
  return (
    <group>
      <Water />
      {ISLANDS.map((island, i) => (
        <Island key={island.id} {...island} seed={i + 1} />
      ))}
      <Boardwalks />
      <Reeds />
      <LilyPads />
      <DeadForest />
      <Hut position={[7, 0, 15]} />
      <Willow position={[-6, 0, 13]} seed={1} />
      <Willow position={[-18.5, 0, -15.5]} seed={2} scale={0.9} />
      <Willow position={[17, 0, -18.5]} seed={3} scale={1.2} />
      <Willow position={[20, 0, -40]} seed={4} scale={0.8} />
      <Willow position={[-7.5, 0, -74]} seed={5} scale={1.1} />
      <Gibbet position={[-23, 0, -39]} />
      <Wreck position={[20.5, 0, -48]} rotation={0.6} />
      <Box size={[0.9, 0.4, 0.9]} m={bark} position={[-7, 0.2, 8]} />
      {LANTERNS.map((l, i) => (
        <WitchLight key={l.id} {...l} seed={i * 1.9} />
      ))}
      <Chapel />
      <Tower />
    </group>
  );
}

// Colliders for the scenery above (the chapel and tower register in layout.js).
fenColliders.circle(-6, 13, 0.5);
fenColliders.circle(-18.5, -15.5, 0.5);
fenColliders.circle(17, -18.5, 0.6);
fenColliders.circle(20, -40, 0.5);
fenColliders.circle(-7.5, -74, 0.6);
fenColliders.circle(-23, -39, 0.4);
fenColliders.box(19.2, 21.8, -50.3, -45.7);
fenColliders.circle(-7, 8, 0.6);
LANTERNS.forEach((l) => fenColliders.circle(l.x, l.z, 0.25));
