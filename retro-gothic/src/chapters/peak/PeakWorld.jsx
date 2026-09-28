import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, boxGeo, coneGeo, cylGeo, dodecaGeo, glow, icoGeo, mat } from '../../retro/materials.jsx';
import { useStore } from '../../store.js';
import { FlickerLight } from '../../world/Lights.jsx';
import { BEACON, BRAZIERS, CAMPFIRES, PEAK, fireLit } from './quest.js';
import { ALCOVES, BASE_CAMP, COURTYARD, LEDGES, PATHS, STEP_RISE, halfWidth, peakColliders } from './layout.js';

const rock = mat({ color: '#c4c0d8', map: 'rock' });
const snow = mat({ color: '#f4f8ff', map: 'snow' });
const iceBlue = mat({ color: '#a8c8e8', map: 'ice', type: 'phong', shininess: 90 });
const wallStone = mat({ color: '#b0acbc', map: 'castle' });
const roof = mat({ color: '#7a6a8a', map: 'slate' });
const pine = mat({ color: '#6a8a70', map: 'pine' });
const trunk = mat({ color: '#4a3424', map: 'darkwood' });
const log = mat({ color: '#6a4a30', map: 'darkwood' });
const ash = mat({ color: '#2a2628' });
const gold = mat({ color: '#e8b830', type: 'phong', shininess: 90 });
const iron = mat({ color: '#2a2a30', type: 'phong' });
const hide = mat({ color: '#8a6a4a', map: 'fur' });
const flag = (c) => mat({ color: c, side: 'double' });

// Faces: +x, -x, +y (top), -y, +z, -z. Rock with a cap of snow.
const snowCapped = [rock, rock, snow, rock, rock, rock];
const DEPTH = 46; // how far the cliffs drop below the path, into the mist

// A flight of stone steps along a path, each a column of rock down into the mist
// with snow on top. Narrow stretches are narrower, and a rock wall rises on the
// mountain side.
function PathSteps({ path }) {
  const steps = useMemo(() => {
    const [ax, az] = path.a;
    const dx = path.b[0] - ax;
    const dz = path.b[1] - az;
    const len = Math.hypot(dx, dz);
    const count = Math.round((path.y1 - path.y0) / STEP_RISE);
    const yaw = Math.atan2(dx, dz);
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 0.5) / count;
      const top = path.y0 + (i + 1) * STEP_RISE;
      const w = halfWidth(path, t) * 2;
      const h = top + DEPTH;
      return { position: [ax + dx * t, top - h / 2, az + dz * t], rotation: [0, yaw, 0], size: [w, h, len / count + 0.02] };
    });
  }, [path]);
  return steps.map((s, i) => <mesh key={i} geometry={boxGeoCached(s.size)} material={snowCapped} position={s.position} rotation={s.rotation} />);
}

// Boxes come from the shared cache in materials.jsx.
const boxGeoCached = (size) => boxGeo(size[0], size[1], size[2], 2);

// The mountain rising on the uphill side of a path: a jumble of huge rocks.
function MountainWall({ path, side, height = 9, seed = 1 }) {
  const rocks = useMemo(() => {
    const [ax, az] = path.a;
    const dx = path.b[0] - ax;
    const dz = path.b[1] - az;
    const len = Math.hypot(dx, dz);
    const nx = (dz / len) * side;
    const nz = (-dx / len) * side;
    let r = seed;
    const rand = () => {
      r = (r * 16807) % 2147483647;
      return (r - 1) / 2147483646;
    };
    const count = Math.ceil(len / 3.2);
    return Array.from({ length: count + 1 }, (_, i) => {
      const t = i / count;
      const size = 2.6 + rand() * 1.6;
      const y = path.y0 + (path.y1 - path.y0) * t;
      const off = path.half + size * 0.75 + 0.3;
      return {
        position: [ax + dx * t + nx * off, y + height * 0.4 - rand() * 2, az + dz * t + nz * off],
        scale: [size, height * (0.6 + rand() * 0.5), size],
        rotation: [rand() * 0.5, rand() * 3, rand() * 0.5],
      };
    });
  }, [path, side, height, seed]);
  return rocks.map((r, i) => <mesh key={i} geometry={dodecaGeo(1)} material={rock} {...r} />);
}

function Ledge({ x, z, r, y }) {
  return <mesh geometry={cylGeo(r + 0.05, r + 1.5, y + DEPTH, 10)} material={[rock, snow, rock]} position={[x, (y - DEPTH) / 2, z]} />;
}

// A snowy pine: stacked cones on a stubby trunk.
function Pine({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <Box size={[0.3, 1.2, 0.3]} m={trunk} position={[0, 0.6, 0]} />
      <mesh geometry={coneGeo(1.3, 2, 7)} material={pine} position={[0, 1.8, 0]} />
      <mesh geometry={coneGeo(1.0, 1.7, 7)} material={pine} position={[0, 2.8, 0]} />
      <mesh geometry={coneGeo(0.65, 1.4, 7)} material={pine} position={[0, 3.7, 0]} />
      <mesh geometry={coneGeo(0.45, 0.5, 7)} material={snow} position={[0, 4.3, 0]} />
    </group>
  );
}

// Hard orange flames, snapping between sizes like the torches in chapter I.
function Flames({ scale = 1, seed = 0, color = '#ff5a0a', core = '#ffd23a' }) {
  const outer = useRef();
  const inner = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 10 + seed * 7.1;
    const s = 1 + 0.2 * Math.round(Math.sin(t) * 2 + Math.sin(t * 2.3)) * 0.5;
    outer.current.scale.set(scale, scale * s, scale);
    outer.current.rotation.y = Math.floor(t) * 0.7;
    inner.current.scale.set(scale, scale * (2 - s), scale);
  });
  return (
    <group>
      <Box ref={outer} size={[0.5, 0.8, 0.5]} m={glow(color)} position={[0, 0.4, 0]} />
      <Box ref={inner} size={[0.28, 0.5, 0.28]} m={glow(core)} position={[0, 0.3, 0]} />
    </group>
  );
}

// A ring of stones and crossed logs. Lit, it's warmth, light and a place to wake.
function Campfire({ id, x, y, z, big = false }) {
  const lit = useStore((s) => fireLit(CAMPFIRES.find((f) => f.id === id), s.peak.lit));
  const size = big ? 1.4 : 1;
  return (
    <group position={[x, y, z]} scale={size}>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} geometry={icoGeo(0.16)} material={rock} position={[Math.sin(i * 0.785) * 0.55, 0.08, Math.cos(i * 0.785) * 0.55]} />
      ))}
      <Box size={[0.9, 0.14, 0.14]} m={log} position={[0, 0.12, 0]} rotation={[0, 0.5, 0.1]} />
      <Box size={[0.9, 0.14, 0.14]} m={log} position={[0, 0.16, 0]} rotation={[0, -0.7, -0.1]} />
      {lit ? <Flames seed={x} /> : <Box size={[0.4, 0.06, 0.4]} m={ash} position={[0, 0.1, 0]} />}
      <FlickerLight intensity={lit ? (big ? 60 : 45) : 0} color="#ff7a20" distance={big ? 20 : 15} decay={1.5} seed={x + z} position={[0, 1.3, 0]} />
    </group>
  );
}

// A Brazier of Dawn: a stone pillar with a golden bowl. Light it for the sunrise.
function DawnBrazier({ id, x, z, name }) {
  const stage = useStore((s) => s.peak.stage);
  const lit = useStore((s) => s.peak.braziers.includes(id));
  const info = {
    id,
    name,
    accent: '#ffcc4a',
    range: 4,
    verbFor: (state) => (state.peak.stage === PEAK.BRAZIERS && !state.peak.braziers.includes(id) ? 'LIGHT THE BRAZIER OF DAWN' : null),
    verb: 'LOOK AT THE BRAZIER',
    lines: lit || stage >= PEAK.SUMMIT ? ['The brazier burns gold, steady in the wind.'] : ['A golden bowl on a stone pillar, heaped with cold ash and a hundred years of snow.'],
    stages: {
      [PEAK.BRAZIERS]: lit
        ? ['The brazier burns gold, steady in the wind.']
        : ['You tip Brannoc\'s ember into the bowl. WHUMPH! A gold flame stands up tall, and all round the courtyard the stone monks shudder.'],
    },
  };
  return (
    <group position={[x, COURTYARD.y, z]} userData={{ interact: info }}>
      <Box size={[0.9, 1.8, 0.9]} m={wallStone} position={[0, 0.9, 0]} />
      <mesh geometry={cylGeo(0.8, 0.45, 0.5, 8)} material={gold} position={[0, 2.05, 0]} />
      {lit ? (
        <group position={[0, 2.2, 0]}>
          <Flames scale={2} seed={x} color="#ffb020" core="#fff0a0" />
        </group>
      ) : (
        <Box size={[1.1, 0.1, 1.1]} m={ash} position={[0, 2.3, 0]} />
      )}
      <FlickerLight intensity={lit ? 55 : 0} color="#ffb040" distance={18} decay={1.5} seed={x} position={[0, 3.4, 0]} />
    </group>
  );
}

// The Dawn Beacon: a great iron basket of wood on a stone tower at the summit.
function Beacon() {
  const stage = useStore((s) => s.peak.stage);
  const lit = stage >= PEAK.DONE;
  const info = {
    id: 'beacon',
    name: 'The Dawn Beacon',
    accent: '#ffcc4a',
    range: 5,
    verbFor: (state) => (state.peak.stage === PEAK.SUMMIT ? 'LIGHT THE DAWN BEACON' : null),
    verb: 'LOOK AT THE BEACON',
    lines: ['A great iron basket heaped with dry wood, waiting on a tower of stone. The Beacon has not been lit in a hundred years.'],
    stages: {
      [PEAK.SUMMIT]: [
        'You lift Brannoc\'s ember high, and set it in the wood.',
        'The Beacon ROARS into light. Gold fire, taller than a house, blazing out over the whole dark world.',
        'And far away, over the edge of everything, the sky begins to turn pink.',
      ],
      [PEAK.DONE]: ['The Beacon blazes. The sun is up. You did it.'],
    },
  };
  return (
    <group position={[BEACON.x, BEACON.y, BEACON.z]} userData={{ interact: info }}>
      <Box size={[2.4, 2.6, 2.4]} m={wallStone} position={[0, 1.3, 0]} />
      <Box size={[2.8, 0.3, 2.8]} m={wallStone} position={[0, 2.7, 0]} />
      <mesh geometry={cylGeo(1.5, 0.9, 1.1, 8)} material={iron} position={[0, 3.4, 0]} />
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} size={[1.8, 0.2, 0.2]} m={log} position={[0, 3.9 + (i % 2) * 0.2, 0]} rotation={[0, i * 0.52, 0.1]} />
      ))}
      {lit && (
        <group position={[0, 4, 0]}>
          <Flames scale={4.5} seed={2} color="#ff9a20" core="#fff4b0" />
        </group>
      )}
      <FlickerLight intensity={lit ? 140 : 0} color="#ffb040" distance={40} decay={1.3} seed={4} position={[0, 7, 0]} />
    </group>
  );
}

// The Monastery of Dawn: a walled courtyard with a gate on the east (from the high
// traverse) and one on the north (to the summit stair) that opens at the end.
function Monastery() {
  const open = useStore((s) => s.peak.stage >= PEAK.SUMMIT);
  const gate = useRef();
  useFrame((_, delta) => {
    const target = open ? 4.4 : 0;
    gate.current.position.y += (target - gate.current.position.y) * Math.min(1, delta * 0.8);
  });
  const W = 5; // wall height
  const y = COURTYARD.y;
  const cx = (COURTYARD.minX + COURTYARD.maxX) / 2;
  const cz = (COURTYARD.minZ + COURTYARD.maxZ) / 2;
  const wall = (x0, x1, z0, z1, key) => (
    <Box key={key} size={[x1 - x0, W, z1 - z0]} m={wallStone} position={[(x0 + x1) / 2, y + W / 2, (z0 + z1) / 2]} />
  );
  return (
    <group>
      <mesh
        geometry={boxGeo(COURTYARD.maxX - COURTYARD.minX + 1.6, y + DEPTH, COURTYARD.maxZ - COURTYARD.minZ + 1.6, 2)}
        material={snowCapped}
        position={[cx, (y - DEPTH) / 2, cz]}
      />
      {wall(-0.2, 0.8, -112.8, -91.7, 'e1')}
      {wall(-0.2, 0.8, -88.3, -85.2, 'e2')}
      {wall(-24.8, -13.7, -112.8, -112, 'n1')}
      {wall(-10.3, 0.8, -112.8, -112, 'n2')}
      {wall(-24.8, -24, -112.8, -85.2, 'w')}
      {wall(-24.8, 0.8, -86, -85.2, 's')}
      {/* Gate arches. */}
      <Box size={[1.2, 1.4, 4.6]} m={wallStone} position={[0.3, y + W + 0.4, -90]} />
      <Box size={[4.6, 1.4, 1.2]} m={wallStone} position={[-12, y + W + 0.4, -112.4]} />
      {/* The north gate: an iron grille that rises once the braziers burn. */}
      <group ref={gate} position={[-12, 0, -112.4]}>
        {[-1.4, -0.7, 0, 0.7, 1.4].map((gx) => (
          <Box key={gx} size={[0.12, 4.4, 0.12]} m={iron} position={[gx, y + 2.2, 0]} />
        ))}
        {[1, 2.4, 3.8].map((gy) => (
          <Box key={gy} size={[3.3, 0.12, 0.12]} m={iron} position={[0, y + gy, 0]} />
        ))}
      </group>
      {/* The temple behind the north wall, and a bell tower in the corner. */}
      <Box size={[16, 9, 8]} m={wallStone} position={[-12, y + 4.5, -118]} />
      <mesh geometry={coneGeo(11, 5, 4)} material={roof} position={[-12, y + 11.5, -118]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.55]} />
      <Box size={[4, 14, 4]} m={wallStone} position={[-23, y + 7, -109]} />
      <mesh geometry={coneGeo(3.4, 4, 4)} material={roof} position={[-23, y + 16, -109]} rotation={[0, Math.PI / 4, 0]} />
      {/* Prayer flags across the courtyard. */}
      {Array.from({ length: 12 }, (_, i) => (
        <Box key={i} size={[0.5, 0.6, 0.03]} m={flag(['#c83a3a', '#e8c040', '#3a7ac8', '#3aa860', '#e8e8e8'][i % 5])} position={[-1 - i * 1.9, y + 5.2 - Math.sin((i / 11) * Math.PI) * 1.4, -97 - i * 0.3]} rotation={[0, 0.15, 0]} />
      ))}
      {/* Snow drifts. */}
      {[
        [-22, -90],
        [-3, -111],
        [-12, -87],
        [-23, -105],
      ].map(([dx, dz]) => (
        <mesh key={`${dx}${dz}`} geometry={icoGeo(1.4)} material={snow} position={[dx, y - 0.6, dz]} scale={[1.6, 0.6, 1.2]} />
      ))}
    </group>
  );
}

// Walls of the chute between the alcoves, so the niches read as niches.
function ChuteWalls() {
  const chute = PATHS[2];
  const segments = [];
  let from = -40.5;
  for (const a of [...ALCOVES].sort((p, q) => q.maxZ - p.maxZ)) {
    segments.push([a.maxZ, from]);
    from = a.minZ;
  }
  segments.push([-73.5, from]);
  const heightAt = (z) => chute.y0 + ((z - chute.a[1]) / (chute.b[1] - chute.a[1])) * (chute.y1 - chute.y0);
  return (
    <group>
      {segments.map(([z0, z1]) => {
        const zc = (z0 + z1) / 2;
        const h = 6;
        return <Box key={zc} size={[2.8, h, z1 - z0]} m={rock} position={[33, heightAt(zc) + h / 2 - 0.5, zc]} />;
      })}
      {ALCOVES.map((a) => (
        <group key={a.z}>
          <Box size={[1, 6, 2.6]} m={rock} position={[34.6, heightAt(a.z) + 2.5, a.z]} />
          <Box size={[2.6, 1, 2.6]} m={rock} position={[33, heightAt(a.z) + 3.3, a.z]} />
        </group>
      ))}
      {/* The west wall of the chute, sheer. */}
      <Box size={[2, 16, 33]} m={rock} position={[27.4, 12, -57]} />
    </group>
  );
}

// Far peaks all round, capped with snow, fading into the fog.
function Range() {
  const peaks = [
    [-90, -60, -210, 70, 120],
    [20, -60, -260, 90, 150],
    [120, -60, -170, 60, 100],
    [-160, -60, -80, 70, 110],
    [150, -60, -40, 60, 90],
    [-12, 0, -160, 16, 60],
  ];
  return peaks.map(([x, y, z, r, h], i) => (
    <group key={i} position={[x, y, z]}>
      <mesh geometry={coneGeo(r, h, 7)} material={rock} position={[0, h / 2, 0]} rotation={[0, i, 0]} />
      <mesh geometry={coneGeo(r * 0.36, h * 0.36, 7)} material={snow} position={[0, h * 0.83, 0]} rotation={[0, i, 0]} />
    </group>
  ));
}

// Brannoc's camp: his hide tent, log seats, a woodpile and a signpost.
function Camp() {
  return (
    <group>
      <mesh
        geometry={boxGeo(BASE_CAMP.maxX - BASE_CAMP.minX + 2, DEPTH, BASE_CAMP.maxZ - BASE_CAMP.minZ + 2, 2)}
        material={snowCapped}
        position={[0, -DEPTH / 2, (BASE_CAMP.minZ + BASE_CAMP.maxZ) / 2]}
      />
      <group position={[-7, 0, 12]}>
        <mesh geometry={coneGeo(2.2, 3.4, 6)} material={hide} position={[0, 1.7, 0]} />
        <Box size={[0.9, 1.3, 0.1]} m={mat({ color: '#1a120c' })} position={[0.9, 0.65, -1.65]} rotation={[0, 0.45, 0.35]} />
        {[-0.4, 0.3].map((px) => (
          <Box key={px} size={[0.08, 1.2, 0.08]} m={trunk} position={[px, 3.6, 0.1]} rotation={[0, 0, px]} />
        ))}
      </group>
      {[
        [2.8, 7, 0.2],
        [-1.2, 10.8, 1.4],
      ].map(([lx, lz, r]) => (
        <Box key={lx} size={[2, 0.4, 0.45]} m={log} position={[lx, 0.2, lz]} rotation={[0, r, 0]} />
      ))}
      <group position={[7.5, 0, 3]}>
        {[0, 1, 2].map((row) =>
          Array.from({ length: 3 - row }, (_, i) => (
            <Box key={`${row}${i}`} size={[0.35, 0.35, 1.6]} m={log} position={[i * 0.38 + row * 0.19 - 0.4, 0.18 + row * 0.33, 0]} />
          )),
        )}
      </group>
      <group position={[3, 0, 0.5]}>
        <Box size={[0.18, 2.6, 0.18]} m={trunk} position={[0, 1.3, 0]} />
        <Box size={[1.4, 0.35, 0.1]} m={log} position={[0, 2.2, 0]} rotation={[0, 0, 0.15]} />
      </group>
    </group>
  );
}

const PINES = [
  [-9, 2, 1.1],
  [-8.5, 16.5, 1.3],
  [8.8, 17, 1],
  [9, 8.5, 1.2],
  [-9.2, 7.5, 0.9],
  [4.5, -26, 0.8],
  [33.5, -38.5, 0.9],
  [26.5, -75.5, 0.8],
];

// Colliders for the scenery above.
peakColliders.circle(-7, 12, 2.2); // tent
peakColliders.box(6.6, 8.4, 2.2, 3.8); // woodpile
peakColliders.circle(3, 0.5, 0.2); // signpost
PINES.forEach(([x, z]) => peakColliders.circle(x, z, 0.5));
CAMPFIRES.forEach((f) => peakColliders.circle(f.x, f.z, f.startsLit ? 0.9 : 0.6));
BRAZIERS.forEach((b) => peakColliders.box(b.x - 0.6, b.x + 0.6, b.z - 0.6, b.z + 0.6));
peakColliders.box(BEACON.x - 1.3, BEACON.x + 1.3, BEACON.z - 1.3, BEACON.z + 1.3);

// Sides of each path the mountain rises on (+1 or -1, relative to its direction).
const WALL_SIDES = { steps: 1, traverse: 1, high: 1, stair: 1 };

export function PeakWorld() {
  return (
    <group>
      <Camp />
      {LEDGES.map((l) => (
        <Ledge key={l.id} {...l} />
      ))}
      {PATHS.map((p) => (
        <PathSteps key={p.id} path={p} />
      ))}
      {PATHS.filter((p) => WALL_SIDES[p.id]).map((p, i) => (
        <MountainWall key={p.id} path={p} side={WALL_SIDES[p.id]} seed={i + 3} />
      ))}
      <ChuteWalls />
      <Monastery />
      <Range />
      {PINES.map(([x, z, s]) => {
        const y = z > 0 ? 0 : z > -30 ? 4 : z > -40 ? 8 : 14;
        return <Pine key={`${x}${z}`} position={[x, y, z]} scale={s} />;
      })}
      {CAMPFIRES.map((f) => (
        <Campfire key={f.id} {...f} big={f.startsLit} />
      ))}
      {BRAZIERS.map((b) => (
        <DawnBrazier key={b.id} {...b} />
      ))}
      <Beacon />
      {/* A frozen waterfall hanging off the crag. */}
      <Box size={[3, 12, 1]} m={iceBlue} position={[37, 6, -78]} rotation={[0, 0.3, 0.05]} />
      {/* The valley floor, far below in the mist. */}
      <mesh geometry={boxGeo(900, 1, 900, 8)} material={snow} position={[0, -DEPTH, -60]} />
    </group>
  );
}
