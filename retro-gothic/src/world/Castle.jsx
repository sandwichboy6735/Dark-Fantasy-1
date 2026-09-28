import { useMemo } from 'react';
import { Box, coneGeo, cylGeo, glow, mat, roofGeo } from '../retro/materials.jsx';
import { addCircle } from './layout.js';
import { Parapet } from './Terrain.jsx';
import { Brazier } from './Lights.jsx';

const stone = mat({ color: '#5e5a70', map: 'castle' });
const darkStone = mat({ color: '#3e3b4c', map: 'castle' });
const slate = mat({ color: '#6a6680', map: 'slate' });
const iron = mat({ color: '#1c1c22', type: 'phong', shininess: 50 });
const banner = mat({ color: '#ffffff', map: 'tabard' });
const lit = glow('#ff7a1e');
const dimWindow = glow('#b8420c');

const Y = 13; // forecourt level

// A square tower with a four-sided spire and a column of lit slits.
function Tower({ x, z, w = 6, h = 30, spire = 12, windows = 3, m = stone }) {
  return (
    <group position={[x, Y, z]}>
      <Box size={[w, h, w]} m={m} position={[0, h / 2, 0]} />
      <Box size={[w + 0.8, 0.8, w + 0.8]} m={m} position={[0, h - 0.4, 0]} />
      <mesh geometry={coneGeo(w * 0.78, spire, 4)} material={slate} position={[0, h + spire / 2, 0]} rotation={[0, Math.PI / 4, 0]} />
      <mesh geometry={coneGeo(0.12, 3, 4)} material={iron} position={[0, h + spire + 1.2, 0]} />
      {Array.from({ length: windows }, (_, i) => (
        <Box key={i} size={[0.5, 2.2, 0.2]} m={i % 2 ? dimWindow : lit} position={[0, h * (0.35 + i * 0.18), w / 2 + 0.05]} />
      ))}
    </group>
  );
}

function RoundTower({ x, z, r = 4, h = 34, spire = 16 }) {
  return (
    <group position={[x, Y, z]}>
      <mesh geometry={cylGeo(r, r * 1.1, h, 8)} material={stone} position={[0, h / 2, 0]} />
      <mesh geometry={cylGeo(r + 0.6, r + 0.6, 1, 8)} material={stone} position={[0, h - 0.5, 0]} />
      <mesh geometry={coneGeo(r + 0.9, spire, 8)} material={slate} position={[0, h + spire / 2, 0]} />
      <Box size={[0.5, 2.4, 0.2]} m={lit} position={[0, h * 0.6, r + 0.05]} />
      <Box size={[0.5, 2.4, 0.2]} m={dimWindow} position={[0, h * 0.35, r + 0.1]} />
    </group>
  );
}

// A gothic lancet: a tall lit slot with a pointed head.
function Lancet({ x, y, z, h = 6, w = 1.2 }) {
  return (
    <group position={[x, y, z]}>
      <Box size={[w, h, 0.2]} m={lit} position={[0, h / 2, 0]} />
      <Box size={[w * 0.72, w * 0.72, 0.2]} m={lit} position={[0, h, 0]} rotation={[0, 0, Math.PI / 4]} />
      <Box size={[0.15, h, 0.3]} m={darkStone} position={[0, h / 2, 0.05]} />
    </group>
  );
}

function Gatehouse() {
  const bars = useMemo(() => Array.from({ length: 11 }, (_, i) => -3 + i * 0.6), []);
  return (
    <group>
      {/* Curtain wall either side of the gate, and the block over it. */}
      <Box size={[26.5, 18, 4]} m={stone} position={[-16.75, Y + 9, -116]} />
      <Box size={[26.5, 18, 4]} m={stone} position={[16.75, Y + 9, -116]} />
      <Box size={[7, 8, 4]} m={stone} position={[0, Y + 14, -116]} />
      {Array.from({ length: 24 }, (_, i) => (
        <Box key={i} size={[1.3, 1.2, 4.4]} m={stone} position={[-29 + i * 2.52, Y + 18.6, -116]} />
      ))}

      {/* Pointed arch over the gate. */}
      <Box size={[4.6, 0.9, 1]} m={darkStone} position={[-1.6, Y + 10.6, -113.6]} rotation={[0, 0, 0.62]} />
      <Box size={[4.6, 0.9, 1]} m={darkStone} position={[1.6, Y + 10.6, -113.6]} rotation={[0, 0, -0.62]} />
      <Box size={[0.9, 10, 1]} m={darkStone} position={[-3.5, Y + 5, -113.6]} />
      <Box size={[0.9, 10, 1]} m={darkStone} position={[3.5, Y + 5, -113.6]} />

      {/* Portcullis, with firelight somewhere deep inside. */}
      {bars.map((x) => (
        <Box key={x} size={[0.14, 9.6, 0.14]} m={iron} position={[x, Y + 4.8, -114.3]} />
      ))}
      {[1, 2.6, 4.2, 5.8, 7.4, 9].map((y) => (
        <Box key={y} size={[6.4, 0.14, 0.14]} m={iron} position={[0, Y + y, -114.4]} />
      ))}
      <Box size={[6.6, 10, 0.2]} m={glow('#2a0e04')} position={[0, Y + 5, -117]} />

      {/* Banners bearing the sigil of the eye. */}
      {[-12, -20, 12, 20].map((x) => (
        <group key={x} position={[x, Y + 16.5, -113.9]}>
          <Box size={[2.2, 0.25, 0.25]} m={iron} position={[0, 0.2, 0]} />
          <Box size={[2, 7, 0.08]} m={banner} tile={2} position={[0, -3.4, 0]} />
        </group>
      ))}
    </group>
  );
}

function Keep() {
  return (
    <group>
      <Box size={[26, 38, 22]} m={stone} position={[0, Y + 19, -141]} />
      <mesh geometry={roofGeo(27, 15, 23)} material={slate} position={[0, Y + 38, -141]} />
      {/* The west front: a rose window over a row of lancets. */}
      <mesh geometry={cylGeo(3.2, 3.2, 0.3, 12)} material={lit} position={[0, Y + 29, -129.9]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={cylGeo(3.8, 3.8, 0.3, 12)} material={darkStone} position={[0, Y + 29, -130]} rotation={[Math.PI / 2, 0, 0]} />
      <Box size={[0.4, 6.4, 0.5]} m={darkStone} position={[0, Y + 29, -129.7]} />
      <Box size={[6.4, 0.4, 0.5]} m={darkStone} position={[0, Y + 29, -129.7]} />
      {[-8, -4, 4, 8].map((x) => (
        <Lancet key={x} x={x} y={Y + 18} z={-129.9} />
      ))}
      {/* Buttresses. */}
      {[-13.5, -6.5, 6.5, 13.5].map((x) => (
        <group key={x}>
          <Box size={[1.6, 26, 3]} m={darkStone} position={[x, Y + 13, -128.8]} />
          <Box size={[1.6, 10, 2]} m={darkStone} position={[x, Y + 31, -129.3]} />
        </group>
      ))}
      {[-148, -140, -132].map((z) =>
        [-1, 1].map((s) => <Box key={`${z}${s}`} size={[3, 24, 1.8]} m={darkStone} position={[s * 14, Y + 12, z]} />),
      )}
    </group>
  );
}

// Braziers.
[
  [-4.5, -110],
  [4.5, -110],
  [-6, -98.5],
  [6, -98.5],
].forEach(([x, z]) => addCircle(x, z, 0.7));

export function Castle() {
  return (
    <group>
      {/* Forecourt walls. */}
      <Parapet position={[-9.7, Y, -95.7]} length={12.6} />
      <Parapet position={[9.7, Y, -95.7]} length={12.6} />
      <Parapet position={[-15.7, Y, -105]} length={18} alongZ />
      <Parapet position={[15.7, Y, -105]} length={18} alongZ />

      <Gatehouse />
      <Tower x={-6.8} z={-115.5} w={6} h={30} spire={12} windows={4} />
      <Tower x={6.8} z={-115.5} w={6} h={30} spire={12} windows={4} />
      <RoundTower x={-30} z={-116} />
      <RoundTower x={30} z={-116} />
      <Keep />
      <Tower x={-13.5} z={-130} w={3.4} h={40} spire={18} windows={5} />
      <Tower x={13.5} z={-130} w={3.4} h={40} spire={18} windows={5} />
      <Tower x={0} z={-155} w={9} h={50} spire={20} windows={5} m={darkStone} />
      <Tower x={-20} z={-160} w={6} h={38} spire={16} windows={3} m={darkStone} />
      <Tower x={20} z={-160} w={6} h={38} spire={16} windows={3} m={darkStone} />
      <Tower x={-29} z={-148} w={5} h={28} spire={13} windows={2} m={darkStone} />
      <Tower x={29} z={-148} w={5} h={28} spire={13} windows={2} m={darkStone} />

      <Brazier position={[-4.5, Y, -110]} seed={3} />
      <Brazier position={[4.5, Y, -110]} seed={4} />
      <Brazier position={[-6, Y, -98.5]} seed={5} height={1.2} intensity={50} />
      <Brazier position={[6, Y, -98.5]} seed={6} height={1.2} intensity={50} />
    </group>
  );
}
