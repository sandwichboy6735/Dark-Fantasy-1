import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, coneGeo, cylGeo, glow, mat } from '../retro/materials.jsx';
import { groundAt } from './layout.js';
import { bind, isTalkingTo, turnTowards, useCollider } from './actor.js';
import { GUARDS } from './npcs.js';
import { useStore } from '../store.js';
import { STAGE } from '../game/quest.js';

const steel = mat({ color: '#8a8ea0', type: 'phong', shininess: 70 });
const darkSteel = mat({ color: '#4a4d5a', type: 'phong', shininess: 50 });
const tabard = mat({ color: '#ffffff', map: 'tabard' });
const leather = mat({ color: '#3a2618' });
const shaft = mat({ color: '#4a3020', map: 'darkwood' });
const robe = mat({ color: '#2a2433' });
const robeDark = mat({ color: '#18141f' });
const voidFace = mat({ color: '#000000', type: 'basic' });

// Full plate, a great helm with a black slit and a halberd. About 2.1 m tall.
function KnightBody({ rig }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} ref={bind(rig, s < 0 ? 'legL' : 'legR')} position={[0.2 * s, 1.0, 0]}>
          <Box size={[0.28, 0.95, 0.3]} m={steel} position={[0, -0.47, 0]} />
          <Box size={[0.3, 0.14, 0.44]} m={darkSteel} position={[0, -0.95, 0.06]} />
          <Box size={[0.3, 0.16, 0.12]} m={darkSteel} position={[0, -0.45, 0.16]} />
        </group>
      ))}
      <Box size={[0.78, 0.3, 0.52]} m={darkSteel} position={[0, 1.02, 0]} />
      <Box size={[0.82, 0.75, 0.52]} m={steel} position={[0, 1.5, 0]} />
      <Box size={[0.6, 1.1, 0.06]} m={tabard} tile={1} position={[0, 1.3, 0.28]} />
      <Box size={[0.6, 1.1, 0.06]} m={tabard} tile={1} position={[0, 1.3, -0.28]} />
      <Box size={[0.3, 0.12, 0.3]} m={darkSteel} position={[0, 1.93, 0]} />
      {/* Great helm. */}
      <Box size={[0.42, 0.5, 0.46]} m={steel} position={[0, 2.2, 0]} />
      <Box size={[0.32, 0.05, 0.03]} m={voidFace} position={[0, 2.24, 0.235]} />
      <Box size={[0.05, 0.22, 0.03]} m={voidFace} position={[0, 2.08, 0.235]} />
      <Box size={[0.06, 0.2, 0.5]} m={darkSteel} position={[0, 2.5, 0]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[0.42, 0.24, 0.6]} m={steel} position={[0.5 * s, 1.88, 0]} rotation={[0, 0, -0.3 * s]} />
          <group ref={bind(rig, s < 0 ? 'armL' : 'armR')} position={[0.52 * s, 1.78, 0]}>
            <Box size={[0.22, 0.75, 0.24]} m={steel} position={[0, -0.38, 0]} />
            <Box size={[0.24, 0.2, 0.26]} m={darkSteel} position={[0, -0.82, 0]} />
            {s > 0 && (
              <group position={[0, -0.84, 0.05]}>
                <mesh geometry={cylGeo(0.035, 0.035, 3, 5)} material={shaft} position={[0, 0.55, 0]} />
                <Box size={[0.05, 0.5, 0.36]} m={darkSteel} position={[0, 1.85, 0.16]} />
                <mesh geometry={coneGeo(0.06, 0.4, 4)} material={darkSteel} position={[0, 2.25, 0]} />
              </group>
            )}
            {s < 0 && <Box size={[0.08, 0.95, 0.6]} m={darkSteel} position={[-0.18, -0.5, 0.05]} />}
          </group>
        </group>
      ))}
      <Box size={[0.8, 0.08, 0.54]} m={leather} position={[0, 1.15, 0]} />
    </group>
  );
}

// A tall robed shape with an empty hood and two cold points of light inside.
function HoodedBody({ rig }) {
  return (
    <group>
      <group ref={bind(rig, 'robe')}>
        <mesh geometry={cylGeo(0.28, 0.55, 1.55, 6)} material={robe} position={[0, 0.78, 0]} />
        <mesh geometry={cylGeo(0.3, 0.44, 0.5, 6)} material={robeDark} position={[0, 1.55, 0]} />
      </group>
      <group position={[0, 1.95, 0]} rotation={[0.18, 0, 0]}>
        <mesh geometry={coneGeo(0.36, 0.85, 6)} material={robeDark} position={[0, 0.12, -0.04]} />
        <Box size={[0.28, 0.32, 0.1]} m={voidFace} position={[0, -0.04, 0.2]} />
        <Box size={[0.05, 0.03, 0.02]} m={glow('#6fa0ff')} position={[-0.07, -0.02, 0.26]} />
        <Box size={[0.05, 0.03, 0.02]} m={glow('#6fa0ff')} position={[0.07, -0.02, 0.26]} />
      </group>
      {[-1, 1].map((s) => (
        <group key={s} ref={bind(rig, s < 0 ? 'armL' : 'armR')} position={[0.38 * s, 1.68, 0]}>
          <Box size={[0.22, 0.7, 0.24]} m={robe} position={[0, -0.35, 0.02]} />
          {s > 0 && (
            <group position={[0, -0.7, 0.1]}>
              <mesh geometry={cylGeo(0.03, 0.03, 2.4, 5)} material={shaft} position={[0, 0.3, 0]} />
              <Box size={[0.4, 0.04, 0.04]} m={shaft} position={[0.15, 1.45, 0]} />
              <Box size={[0.16, 0.2, 0.16]} m={glow('#7ea8ff')} position={[0.32, 1.28, 0]} />
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

// Walks back and forth along `path` (or stands at a post), following the steps.
// When you look at one it stops and turns to face you.
function Guard({ id, kind, name, lines, stages, path, facing = 0, speed = 1, phase = 0 }) {
  const root = useRef();
  const rig = useRef({});
  const walk = useRef({ s: 0, dir: 1, pause: 0, heading: facing * Math.PI, cycle: phase, y: null });
  const length = useMemo(() => (path.length > 1 ? Math.hypot(path[1][0] - path[0][0], path[1][1] - path[0][1]) : 0), [path]);
  useCollider(root, 0.55);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const w = walk.current;
    const talking = isTalkingTo(id);
    let moving = false;
    let wanted = w.heading;

    if (length > 0 && !talking) {
      if (w.pause > 0) {
        w.pause -= dt;
      } else {
        w.s += w.dir * speed * dt;
        if (w.s > length || w.s < 0) {
          w.s = Math.min(Math.max(w.s, 0), length);
          w.dir *= -1;
          w.pause = 2.5;
        }
        moving = true;
      }
      const [a, b] = w.dir > 0 ? [path[0], path[1]] : [path[1], path[0]];
      wanted = Math.atan2(b[0] - a[0], b[1] - a[1]);
    } else if (!talking) {
      wanted = facing * Math.PI;
    }

    const [x0, z0] = path[0];
    const [x1, z1] = path[path.length - 1];
    const t = length > 0 ? w.s / length : 0;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    if (talking) wanted = Math.atan2(camera.position.x - x, camera.position.z - z);

    w.heading = turnTowards(w.heading, wanted, moving ? 3 : 2.2, dt);
    const ground = groundAt(x, z) ?? 0;
    w.y = w.y === null ? ground : w.y + (ground - w.y) * Math.min(1, dt * 8);
    root.current.position.set(x, w.y, z);
    root.current.rotation.y = w.heading;

    // Stiff, heavy gait for the knights; a gliding sway for the hooded.
    if (moving) w.cycle += dt * speed * 4.2;
    const swing = moving ? Math.sin(w.cycle) : 0;
    const r = rig.current;
    if (kind === 'knight') {
      r.legL.rotation.x = swing * 0.45;
      r.legR.rotation.x = -swing * 0.45;
      r.armL.rotation.x = -swing * 0.2;
      r.armR.rotation.x = swing * 0.12;
      root.current.position.y += Math.abs(Math.cos(w.cycle)) * 0.05 * (moving ? 1 : 0);
    } else {
      r.robe.rotation.x = swing * 0.05;
      r.armL.rotation.x = Math.sin(w.cycle * 0.5) * 0.1;
      root.current.position.y += Math.sin(w.cycle * 2) * 0.02;
    }
  });

  return (
    <group ref={root} userData={{ interact: { id, name, lines, stages, accent: kind === 'knight' ? '#ff9a3a' : '#8fb0ff' } }}>
      {kind === 'knight' ? <KnightBody rig={rig} /> : <HoodedBody rig={rig} />}
    </group>
  );
}

// While the causeway falls the Vigil scatters; once you're safe they all come down
// to the court and the tavern to celebrate.
export function Guards() {
  const stage = useStore((s) => s.stage);
  if (stage === STAGE.ESCAPE) return null;
  return GUARDS.map((g, i) =>
    stage >= STAGE.DONE ? (
      <Guard key={`${g.id}-home`} phase={i * 1.3} {...g} path={[[g.home[0], g.home[1]]]} facing={g.home[2]} />
    ) : (
      <Guard key={g.id} phase={i * 1.3} {...g} />
    ),
  );
}
