import { useMemo } from 'react';
import { Box, cylGeo, glow, mat, roofGeo } from '../retro/materials.jsx';
import { addBox, addCircle } from './layout.js';
import { Candle, FlickerLight, Lantern } from './Lights.jsx';
import { Tankard } from './Goblin.jsx';

const wood = mat({ color: '#b08a68', map: 'wood' });
const darkWood = mat({ color: '#6a5040', map: 'darkwood' });
const barrelWood = mat({ color: '#b89070', map: 'barrel' });
const plaster = mat({ color: '#b0a288', map: 'plaster' });
const slate = mat({ color: '#6a6680', map: 'slate' });
const stone = mat({ color: '#7a7688', map: 'castle' });
const sign = mat({ color: '#ffffff', map: 'sign', side: 'double' });
const warmWindow = glow('#ffc050');
const bread = mat({ color: '#9a6a30' });
const plate = mat({ color: '#6a6a70' });

// Rough trestle table: three warped planks on A-frame legs.
function Table({ x, z, rotation = 0, candles = true, light = true, seed = 0 }) {
  const planks = [-0.4, 0, 0.4].map((dz, i) => ({
    z: dz,
    y: 0.9 + (((seed + i) * 37) % 5) * 0.008,
    ry: ((((seed + i) * 53) % 7) - 3) * 0.006,
  }));
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {planks.map((p, i) => (
        <Box key={i} size={[3.2, 0.08, 0.38]} m={wood} position={[0, p.y, p.z]} rotation={[0, p.ry, 0]} />
      ))}
      {[-1.25, 1.25].map((lx) => (
        <group key={lx} position={[lx, 0, 0]}>
          <Box size={[0.12, 0.95, 0.12]} m={darkWood} position={[0, 0.45, 0.3]} rotation={[0.3, 0, 0]} />
          <Box size={[0.12, 0.95, 0.12]} m={darkWood} position={[0, 0.45, -0.3]} rotation={[-0.3, 0, 0]} />
        </group>
      ))}
      <Box size={[2.5, 0.1, 0.1]} m={darkWood} position={[0, 0.35, 0]} />
      <group position={[0.9, 1.1, 0.1]}>
        <Tankard />
      </group>
      <Box size={[0.36, 0.03, 0.36]} m={plate} position={[-0.6, 0.955, -0.1]} />
      <Box size={[0.3, 0.14, 0.18]} m={bread} position={[-0.6, 1.03, -0.1]} rotation={[0, 0.4, 0]} />
      {candles && (
        <>
          <Candle position={[0, 0.94, 0]} />
          <Candle position={[0.18, 0.94, -0.1]} />
          <Candle position={[-0.15, 0.94, 0.12]} />
        </>
      )}
      {light && <FlickerLight intensity={18} distance={10} seed={seed} position={[0, 1.6, 0]} />}
    </group>
  );
}

function Stool({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={cylGeo(0.26, 0.24, 0.08, 6)} material={wood} position={[0, 0.48, 0]} />
      {[0, 2.1, 4.2].map((a) => (
        <Box key={a} size={[0.07, 0.48, 0.07]} m={darkWood} position={[Math.sin(a) * 0.16, 0.22, Math.cos(a) * 0.16]} rotation={[Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15]} />
      ))}
    </group>
  );
}

// A low-poly barrel: two frustums meeting at the bulge, with a dark lid.
export function Barrel({ position, rotation = [0, 0, 0], scale = 1 }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={cylGeo(0.47, 0.38, 0.5, 8)} material={barrelWood} position={[0, 0.25, 0]} />
      <mesh geometry={cylGeo(0.38, 0.47, 0.5, 8)} material={barrelWood} position={[0, 0.75, 0]} />
      <mesh geometry={cylGeo(0.36, 0.36, 0.02, 8)} material={darkWood} position={[0, 1.0, 0]} />
    </group>
  );
}

function LanternPost({ x, z, seed }) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.22, 3.4, 0.22]} m={darkWood} position={[0, 1.7, 0]} />
      <Box size={[1.1, 0.14, 0.14]} m={darkWood} position={[0.45, 3.3, 0]} />
      <Lantern position={[0.85, 2.8, 0]} seed={seed} intensity={40} distance={18} />
    </group>
  );
}

// A sagging string of little lights from `a` to `b`.
function StringLights({ a, b, count = 12, sag = 0.9 }) {
  const bulbs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
      }),
    [a, b, count, sag],
  );
  return bulbs.map((p, i) => <Box key={i} size={[0.1, 0.13, 0.1]} m={glow(i % 3 ? '#ffd070' : '#ff9a40')} position={p} />);
}

function Fence({ from, to }) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const posts = Math.max(1, Math.round(length / 2));
  return (
    <group position={[from[0], 0, from[1]]} rotation={[0, -angle, 0]}>
      {Array.from({ length: posts + 1 }, (_, i) => (
        <Box key={i} size={[0.16, 1.3, 0.16]} m={darkWood} position={[(i * length) / posts, 0.65, 0]} rotation={[0, 0, ((i * 13) % 5 - 2) * 0.03]} />
      ))}
      <Box size={[length, 0.1, 0.08]} m={wood} position={[length / 2, 1.0, 0]} rotation={[0, 0, 0.01]} />
      <Box size={[length, 0.1, 0.08]} m={wood} position={[length / 2, 0.5, 0]} rotation={[0, 0, -0.01]} />
    </group>
  );
}

// The Grinning Tankard itself: timber-framed, jettied, lamplit, faces west.
function Inn() {
  const beams = [-1, 4.5, 8, 12, 15.5, 21];
  return (
    <group>
      <Box size={[8, 5, 22]} m={plaster} position={[44, 2.5, 10]} />
      <Box size={[8.8, 3.6, 22.6]} m={plaster} position={[43.8, 6.8, 10]} />
      <mesh geometry={roofGeo(10.4, 5.2, 23.4)} material={slate} position={[43.8, 8.6, 10]} />
      <Box size={[1.3, 4.5, 1.3]} m={stone} position={[46, 11.5, 3]} />
      {/* Timber framing. */}
      {beams.map((z) => (
        <Box key={z} size={[0.24, 5, 0.3]} m={darkWood} position={[39.95, 2.5, z]} />
      ))}
      {beams.map((z) => (
        <Box key={`u${z}`} size={[0.24, 3.6, 0.3]} m={darkWood} position={[39.35, 6.8, z]} />
      ))}
      <Box size={[0.26, 0.3, 22.2]} m={darkWood} position={[39.95, 4.9, 10]} />
      <Box size={[0.26, 0.26, 22.8]} m={darkWood} position={[39.35, 8.5, 10]} />
      <Box size={[0.26, 0.24, 22.2]} m={darkWood} position={[39.95, 0.15, 10]} />
      {[6.25, 13.75].map((z, i) => (
        <Box key={z} size={[0.22, 4.4, 0.22]} m={darkWood} position={[39.34, 6.8, z]} rotation={[i ? 0.72 : -0.72, 0, 0]} />
      ))}
      {/* Lit windows, the serving hatch behind the bar, and the door. */}
      <Box size={[0.12, 1.3, 1.6]} m={warmWindow} position={[39.9, 2, 1.8]} />
      <Box size={[0.12, 1.6, 3]} m={warmWindow} position={[39.9, 2.1, 10]} />
      <Box size={[0.14, 0.1, 3.2]} m={darkWood} position={[39.84, 2.1, 10]} />
      <Box size={[0.14, 2.6, 1.7]} m={darkWood} position={[39.9, 1.3, 18.2]} />
      <Box size={[0.16, 0.2, 1.9]} m={glow('#ffb040')} position={[39.88, 2.7, 18.2]} />
      {[2.5, 10, 17.5].map((z) => (
        <group key={z}>
          <Box size={[0.12, 1.2, 1.4]} m={warmWindow} position={[39.3, 7, z]} />
          <Box size={[0.16, 1.2, 0.1]} m={darkWood} position={[39.24, 7, z]} />
          <Box size={[0.16, 0.1, 1.4]} m={darkWood} position={[39.24, 7, z]} />
        </group>
      ))}
      {/* Hanging sign. */}
      <Box size={[1.6, 0.1, 0.1]} m={darkWood} position={[39.1, 4.4, 15]} />
      <mesh position={[38.55, 3.8, 15]} rotation={[0, -Math.PI / 2, 0]} material={sign}>
        <planeGeometry args={[1.8, 0.9]} />
      </mesh>
    </group>
  );
}

function Bar() {
  return (
    <group>
      <Box size={[1, 1.1, 9]} m={wood} position={[38.1, 0.55, 10]} />
      <Box size={[1.3, 0.1, 9.3]} m={darkWood} position={[38.1, 1.15, 10]} />
      <Barrel position={[38.2, 1.2, 6.6]} rotation={[0, 0, Math.PI / 2]} scale={0.55} />
      <Barrel position={[38.2, 1.2, 13.4]} rotation={[0, 0, Math.PI / 2]} scale={0.55} />
      {[8.2, 9.4, 11.6].map((z) => (
        <group key={z} position={[37.9, 1.36, z]}>
          <Tankard />
        </group>
      ))}
      <Lantern position={[39.2, 3.4, 6.2]} seed={7} intensity={30} distance={14} />
      <Lantern position={[39.2, 3.4, 13.8]} seed={8} intensity={30} distance={14} />
    </group>
  );
}

const TABLES = [
  { x: 24, z: 4, seed: 1 },
  { x: 29, z: 14, seed: 2 },
  { x: 22.2, z: 20.6, seed: 3 },
];
const STOOLS = [[23, 5.4], [25.4, 2.7], [22.8, 2.7], [29, 15.6], [30.6, 12.5], [27.6, 12.5], [21, 21.9], [23.4, 21.9], [31.3, 1.8], [32.8, 0.2]];
const BARRELS = [
  { position: [36, 0, -4] },
  { position: [37, 0, -3] },
  { position: [36.6, 0, -5.2] },
  { position: [36.5, 1.02, -4.1], scale: 0.9 },
  { position: [35.8, 0, 23.2] },
  { position: [34.9, 0, 24.1] },
  { position: [32, 0, 1] }, // barrel table
];

addBox(39.6, 48.5, -1.5, 21.5); // inn
addBox(37.4, 38.8, 5.3, 14.7); // bar
TABLES.forEach(({ x, z }) => addBox(x - 1.6, x + 1.6, z - 0.7, z + 0.7));
STOOLS.forEach(([x, z]) => addCircle(x, z, 0.3));
BARRELS.forEach(({ position: [x, , z] }) => addCircle(x, z, 0.5));
addCircle(37.8, -5.9, 0.5); // barrel on its side
[[19.5, -3], [33, 23], [19, 12.5]].forEach(([x, z]) => addCircle(x, z, 0.3)); // lantern posts

export function Tavern() {
  return (
    <group>
      <Inn />
      <Bar />
      {TABLES.map((t) => (
        <Table key={t.seed} {...t} />
      ))}
      {STOOLS.map(([x, z]) => (
        <Stool key={`${x},${z}`} x={x} z={z} />
      ))}
      {BARRELS.map((b, i) => (
        <Barrel key={i} {...b} />
      ))}
      <Barrel position={[37.8, 0.42, -5.9]} rotation={[Math.PI / 2, 0, 0.4]} />
      <Candle position={[31.85, 1.0, 1.1]} />
      <group position={[32.15, 1.16, 0.85]}>
        <Tankard />
      </group>

      <LanternPost x={19.5} z={-3} seed={1} />
      <LanternPost x={33} z={23} seed={2} />
      <LanternPost x={19} z={12.5} seed={3} />
      {/* A big lantern hung over the dancing ground. */}
      <Lantern position={[28.5, 3.6, 8]} seed={4} intensity={45} distance={16} />
      <StringLights a={[39.3, 5.1, 0]} b={[19.8, 3.3, -3]} />
      <StringLights a={[39.3, 5.1, 20]} b={[33.1, 3.3, 23]} count={8} sag={0.6} />
      <StringLights a={[19.8, 3.3, -3]} b={[28.5, 3.9, 8]} count={9} sag={0.6} />
      <StringLights a={[28.5, 3.9, 8]} b={[33.1, 3.3, 23]} count={10} sag={0.7} />

      <Fence from={[14, -7.7]} to={[40, -7.7]} />
      <Fence from={[14, 25.7]} to={[40, 25.7]} />
      <Fence from={[14, -7.7]} to={[14, -4]} />
      <Fence from={[14, 22]} to={[14, 25.7]} />
    </group>
  );
}
