import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, coneGeo, cylGeo, glow, mat, roofGeo } from '../retro/materials.jsx';
import { DAIS_HEIGHT, DAIS_Z, addBox, addCircle } from './layout.js';
import { Parapet } from './Terrain.jsx';
import { Brazier, Candle, FlickerLight } from './Lights.jsx';
import { store, useStore } from '../store.js';
import { CANDELABRA, GREAT_BELL, STAGE } from '../game/quest.js';
import { GREAT_BELL_INFO } from './npcs.js';

const stone = mat({ color: '#5e5a70', map: 'castle' });
const darkStone = mat({ color: '#3e3b4c', map: 'castle' });
const slate = mat({ color: '#6a6680', map: 'slate' });
const iron = mat({ color: '#1c1c22', type: 'phong', shininess: 50 });
const banner = mat({ color: '#ffffff', map: 'tabard' });
const lit = glow('#ff7a1e');
const dimWindow = glow('#b8420c');
const floorTile = mat({ color: '#4a4658', map: 'castle' });
const pewWood = mat({ color: '#5a4030', map: 'wood' });
const bronze = mat({ color: '#6a5a2a', type: 'phong', shininess: 80 });
const verdigris = mat({ color: '#3a6a58', type: 'phong', shininess: 40 });
const rope = mat({ color: '#8a7050' });
const stainedBlue = glow('#3a4cc8');
const stainedRed = glow('#a02838');
const stainedGold = glow('#c89a30');

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

      <Portcullis bars={bars} />

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

// Rises into the gatehouse once the Toast has been raised.
function Portcullis({ bars }) {
  const group = useRef();
  const veil = useRef();
  useFrame((_, delta) => {
    const open = store.get().stage >= STAGE.CASTLE;
    const target = open ? 9.4 : 0;
    const y = group.current.position.y;
    group.current.position.y = y + Math.sign(target - y) * Math.min(Math.abs(target - y), delta * 1.6);
    veil.current.visible = !open;
  });
  return (
    <>
      <group ref={group}>
        {bars.map((x) => (
          <Box key={x} size={[0.14, 9.6, 0.14]} m={iron} position={[x, Y + 4.8, -114.3]} />
        ))}
        {[1, 2.6, 4.2, 5.8, 7.4, 9].map((y) => (
          <Box key={y} size={[6.4, 0.14, 0.14]} m={iron} position={[0, Y + y, -114.4]} />
        ))}
      </group>
      {/* Firelight somewhere deep inside, until the way is open. */}
      <Box ref={veil} size={[6.6, 10, 0.2]} m={glow('#2a0e04')} position={[0, Y + 5, -117]} />
    </>
  );
}

// The keep is hollow: four thick walls with a door in the front, a ceiling,
// and the nave inside.
function Keep() {
  return (
    <group>
      <Box size={[11, 38, 1.5]} m={stone} position={[-7.5, Y + 19, -130.75]} />
      <Box size={[11, 38, 1.5]} m={stone} position={[7.5, Y + 19, -130.75]} />
      <Box size={[4, 31.5, 1.5]} m={stone} position={[0, Y + 22.25, -130.75]} />
      <Box size={[26, 38, 1.5]} m={stone} position={[0, Y + 19, -151.25]} />
      <Box size={[1.5, 38, 19]} m={stone} position={[-12.25, Y + 19, -141]} />
      <Box size={[1.5, 38, 19]} m={stone} position={[12.25, Y + 19, -141]} />
      <Box size={[23, 14, 19]} m={darkStone} position={[0, Y + 31, -141]} />
      <KeepDoor />
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

// Swings open with the gate.
function KeepDoor() {
  const left = useRef();
  const right = useRef();
  useFrame((_, delta) => {
    const target = store.get().stage >= STAGE.CASTLE ? 1.9 : 0;
    for (const [leaf, sign] of [[left, 1], [right, -1]]) {
      const r = leaf.current.rotation.y * sign;
      leaf.current.rotation.y = sign * (r + Math.sign(target - r) * Math.min(Math.abs(target - r), delta));
    }
  });
  const wood = mat({ color: '#4a3020', map: 'darkwood' });
  return (
    <>
      <group ref={left} position={[-2, Y, -130.2]}>
        <Box size={[2, 6.4, 0.25]} m={wood} position={[1, 3.2, 0]} />
        <Box size={[0.12, 0.3, 0.3]} m={iron} position={[1.8, 3, 0.2]} />
      </group>
      <group ref={right} position={[2, Y, -130.2]}>
        <Box size={[2, 6.4, 0.25]} m={wood} position={[-1, 3.2, 0]} />
        <Box size={[0.12, 0.3, 0.3]} m={iron} position={[-1.8, 3, 0.2]} />
      </group>
    </>
  );
}

// An iron candle stand: safe light inside the castle.
function Candelabrum({ x, z }) {
  return (
    <group position={[x, Y, z]}>
      <mesh geometry={cylGeo(0.35, 0.45, 0.2, 6)} material={iron} position={[0, 0.1, 0]} />
      <mesh geometry={cylGeo(0.05, 0.06, 2, 5)} material={iron} position={[0, 1.1, 0]} />
      <Box size={[1.1, 0.06, 0.06]} m={iron} position={[0, 2.05, 0]} />
      {[-0.5, 0, 0.5].map((dx) => (
        <Candle key={dx} position={[dx, 2.1, 0]} />
      ))}
      <FlickerLight intensity={45} color="#ffa040" distance={14} seed={x * 3 + z} position={[0, 2.8, 0]} />
    </group>
  );
}

function Pew({ x, z }) {
  return (
    <group position={[x, Y, z]}>
      <Box size={[2.6, 0.12, 0.55]} m={pewWood} position={[0, 0.5, 0]} />
      <Box size={[2.6, 0.7, 0.1]} m={pewWood} position={[0, 0.85, -0.25]} />
      {[-1.2, 1.2].map((dx) => (
        <Box key={dx} size={[0.1, 0.5, 0.5]} m={pewWood} position={[dx, 0.25, 0]} />
      ))}
    </group>
  );
}

// An iron ring of candles hung on a chain over the aisle.
function Chandelier({ z }) {
  return (
    <group position={[0, Y + 8, z]}>
      <Box size={[0.05, 9, 0.05]} m={iron} position={[0, 4.5, 0]} />
      <mesh geometry={cylGeo(1.3, 1.3, 0.12, 8)} material={iron} />
      {Array.from({ length: 8 }, (_, i) => (
        <Candle key={i} position={[Math.sin((i * Math.PI) / 4) * 1.2, 0.06, Math.cos((i * Math.PI) / 4) * 1.2]} />
      ))}
      <FlickerLight intensity={70} color="#ffb050" distance={16} decay={1.4} seed={z} position={[0, -0.5, 0]} />
    </group>
  );
}

const PILLARS = [-135, -140, -145].flatMap((z) => [-5.5, 5.5].map((x) => [x, z]));
const PEWS = [-134.5, -137.5, -142.5].flatMap((z) => [-3.2, 3.2].map((x) => [x, z]));
PILLARS.forEach(([x, z]) => addCircle(x, z, 0.95));
PEWS.forEach(([x, z]) => addBox(x - 1.35, x + 1.35, z - 0.35, z + 0.3));
CANDELABRA.forEach(({ x, z }) => addCircle(x, z, 0.45));
// Keep buttresses standing in the bailey, the well, and the bell frame.
[-6.5, 6.5].forEach((x) => addBox(x - 0.8, x + 0.8, -130.3, -127.3));
addCircle(-6, -122, 1.1);
[-2.4, 2.4].forEach((x) => addCircle(x, GREAT_BELL.z, 0.35));

function Nave() {
  return (
    <group>
      <Box size={[23, 0.1, 19]} m={floorTile} position={[0, Y + 0.05, -141]} tile={3} />
      <Box size={[23, DAIS_HEIGHT, 150 + DAIS_Z]} m={floorTile} position={[0, Y + DAIS_HEIGHT / 2, (DAIS_Z - 150) / 2 - 0.25]} />
      {PILLARS.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, Y, z]}>
          <Box size={[1.8, 0.6, 1.8]} m={darkStone} position={[0, 0.3, 0]} />
          <mesh geometry={cylGeo(0.7, 0.75, 13, 8)} material={stone} position={[0, 7, 0]} />
          <Box size={[1.7, 0.7, 1.7]} m={darkStone} position={[0, 13.6, 0]} />
        </group>
      ))}
      {/* Arcades and ribs along the nave. */}
      {[-5.5, 5.5].map((x) => (
        <Box key={x} size={[1.2, 1.4, 19]} m={darkStone} position={[x, Y + 14.6, -141]} />
      ))}
      {[-135, -140, -145].map((z) => (
        <Box key={z} size={[23, 0.8, 0.8]} m={darkStone} position={[0, Y + 17.5, z]} />
      ))}
      {PEWS.map(([x, z]) => (
        <Pew key={`${x},${z}`} x={x} z={z} />
      ))}
      <Chandelier z={-136.5} />
      <Chandelier z={-142.5} />
      {/* Stained glass: tall windows down both sides and a great one behind the bell. */}
      {[-134, -140, -146].map((z) =>
        [-11.45, 11.45].map((x) => (
          <group key={`${x},${z}`} position={[x, Y + 9, z]} rotation={[0, Math.PI / 2, 0]}>
            <Box size={[1.6, 6, 0.08]} m={z === -140 ? stainedRed : stainedBlue} position={[0, 3, 0]} />
            <Box size={[1.1, 1.1, 0.08]} m={stainedGold} position={[0, 6, 0]} rotation={[0, 0, Math.PI / 4]} />
            <Box size={[0.12, 6, 0.14]} m={darkStone} position={[0, 3, 0]} />
          </group>
        )),
      )}
      <group position={[0, Y + 7, -150.45]}>
        <Box size={[4, 10, 0.08]} m={stainedBlue} position={[0, 5, 0]} />
        <mesh geometry={cylGeo(2.6, 2.6, 0.1, 12)} material={stainedRed} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={cylGeo(0.9, 0.9, 0.12, 8)} material={stainedGold} position={[0, 12, 0.02]} rotation={[Math.PI / 2, 0, 0]} />
        <Box size={[0.2, 10, 0.16]} m={darkStone} position={[0, 5, 0.02]} />
        <Box size={[4, 0.2, 0.16]} m={darkStone} position={[0, 5, 0.02]} />
      </group>
      <group position={[0, Y + 20, -131.55]}>
        <mesh geometry={cylGeo(3.2, 3.2, 0.1, 12)} material={lit} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      <GreatBell />
    </group>
  );
}

// A bronze bell as big as a cottage, hung in an oak frame on the dais.
function GreatBell() {
  const swing = useRef();
  const stage = useStore((s) => s.stage);
  const rungAt = useRef(null);
  const frameWood = mat({ color: '#5a3a20', map: 'darkwood' });
  useFrame(({ clock }) => {
    if (stage >= STAGE.DONE && rungAt.current === null) rungAt.current = clock.elapsedTime;
    const t = rungAt.current === null ? 0 : clock.elapsedTime - rungAt.current;
    swing.current.rotation.x = Math.sin(t * 2.2) * 0.35 * Math.exp(-t * 0.12);
  });
  const top = Y + DAIS_HEIGHT + 6.2;
  return (
    <group position={[GREAT_BELL.x, 0, GREAT_BELL.z]} userData={{ interact: GREAT_BELL_INFO }}>
      {[-2.4, 2.4].map((x) => (
        <Box key={x} size={[0.5, 6.4, 0.5]} m={frameWood} position={[x, Y + DAIS_HEIGHT + 3.2, 0]} />
      ))}
      <Box size={[5.4, 0.5, 0.6]} m={frameWood} position={[0, top + 0.2, 0]} />
      <group ref={swing} position={[0, top, 0]}>
        <mesh geometry={cylGeo(0.7, 1.55, 2.4, 10)} material={bronze} position={[0, -1.6, 0]} />
        <mesh geometry={cylGeo(0.7, 0.7, 0.4, 10)} material={verdigris} position={[0, -0.3, 0]} />
        <mesh geometry={cylGeo(1.62, 1.62, 0.2, 10)} material={verdigris} position={[0, -2.75, 0]} />
        <mesh geometry={cylGeo(0.18, 0.28, 0.5, 6)} material={iron} position={[0, -2.9, 0]} />
        <Box size={[0.06, 3.2, 0.06]} m={rope} position={[0.2, -3.9, 0.3]} />
      </group>
      <Candle position={[-1.6, Y + DAIS_HEIGHT, 1.2]} />
      <Candle position={[1.5, Y + DAIS_HEIGHT, 1.3]} />
      {/* Votive candles light the bell from below. */}
      <FlickerLight intensity={35} color="#ffb050" distance={12} seed={7} position={[0, Y + 2, 2]} />
    </group>
  );
}

function Bailey() {
  const well = mat({ color: '#6a6678', map: 'castle' });
  return (
    <group>
      <group position={[-6, Y, -122]}>
        <mesh geometry={cylGeo(1, 1.05, 0.9, 8)} material={well} position={[0, 0.45, 0]} />
        <mesh geometry={cylGeo(0.8, 0.8, 0.05, 8)} material={mat({ color: '#05050a', type: 'basic' })} position={[0, 0.9, 0]} />
        {[-0.8, 0.8].map((x) => (
          <Box key={x} size={[0.12, 2, 0.12]} m={mat({ color: '#4a3020', map: 'darkwood' })} position={[x, 1.4, 0]} />
        ))}
        <Box size={[1.8, 0.12, 0.12]} m={mat({ color: '#4a3020', map: 'darkwood' })} position={[0, 2.35, 0]} />
      </group>
      {[[7, -121, 0.3], [8.2, -121.6, 1.1], [7.5, -120.2, 2.2]].map(([x, z, r]) => (
        <Box key={`${x}${z}`} size={[0.9, 0.9, 0.9]} m={pewWood} position={[x, Y + 0.45, z]} rotation={[0, r, 0]} />
      ))}
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
      <Nave />
      <Bailey />
      {CANDELABRA.map((c) => (
        <Candelabrum key={`${c.x},${c.z}`} {...c} />
      ))}
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
