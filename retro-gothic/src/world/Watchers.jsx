import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, coneGeo, cylGeo, glow, mat } from '../retro/materials.jsx';
import { store, useStore } from '../store.js';
import { STAGE } from '../game/quest.js';
import { live } from '../game/live.js';
import { sfx } from '../game/audio.js';
import { groundAt } from './layout.js';
import { bind, turnTowards } from './actor.js';
import { skipInNormalPass } from './Sky.jsx';
import { WATCHERS } from './npcs.js';

const SIGHT_RANGE = 7;
const SIGHT_HALF_ANGLE = (38 * Math.PI) / 180;
const PATROL_SPEED = 1.3;
const CHASE_SPEED = 3.6; // slower than you walk: keep moving and you get away
const INVESTIGATE_SPEED = 2.8;
const NOTICE_TIME = 0.45; // seconds in the light before they come for you
const GIVE_UP_TIME = 2.5;
const LURE_RANGE = 18;

const cloak = mat({ color: '#0e0c14' });
const cloakEdge = mat({ color: '#1c1826' });
const voidFace = mat({ color: '#000000', type: 'basic' });
const iron = mat({ color: '#1c1c22', type: 'phong' });
const eyeGlow = glow('#6f9aff');
const alarmGlow = glow('#ff3a3a');
const puzzledGlow = glow('#ffd04a');

const coneCalm = new THREE.MeshBasicMaterial({ color: '#4a78ff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const coneAngry = coneCalm.clone();
coneAngry.color.set('#ff3a3a');
coneAngry.opacity = 0.3;

// A flat fan on the ground showing where the lantern-light (and so the Eye) can see.
function sightGeometry() {
  const segments = 12;
  const positions = [0, 0.06, 0];
  for (let i = 0; i <= segments; i++) {
    const a = -SIGHT_HALF_ANGLE + (2 * SIGHT_HALF_ANGLE * i) / segments;
    positions.push(Math.sin(a) * SIGHT_RANGE, 0.06, Math.cos(a) * SIGHT_RANGE);
  }
  const index = [];
  for (let i = 1; i <= segments; i++) index.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}

// Tall, black, hooded, with a single blue eye and a blue lantern.
function WatcherBody({ rig }) {
  return (
    <group>
      <group ref={bind(rig, 'robe')}>
        <mesh geometry={cylGeo(0.3, 0.7, 1.9, 6)} material={cloak} position={[0, 0.95, 0]} />
        <mesh geometry={cylGeo(0.36, 0.5, 0.6, 6)} material={cloakEdge} position={[0, 1.95, 0]} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Box key={i} size={[0.28, 0.35, 0.05]} m={cloak} position={[Math.sin(i * 1.26) * 0.62, 0.12, Math.cos(i * 1.26) * 0.62]} rotation={[0, i * 1.26, 0.2]} />
        ))}
      </group>
      <group position={[0, 2.4, 0]} rotation={[0.22, 0, 0]}>
        <mesh geometry={coneGeo(0.42, 1.0, 6)} material={cloakEdge} position={[0, 0.15, -0.05]} />
        <Box size={[0.3, 0.36, 0.1]} m={voidFace} position={[0, -0.06, 0.24]} />
        <Box size={[0.09, 0.07, 0.03]} m={eyeGlow} position={[0, -0.02, 0.3]} />
      </group>
      <group position={[0.45, 1.3, 0.35]}>
        <Box size={[0.03, 0.4, 0.03]} m={iron} position={[0, 0.25, 0]} />
        <Box size={[0.26, 0.32, 0.26]} m={eyeGlow} position={[0, -0.1, 0]} />
        <Box size={[0.32, 0.05, 0.32]} m={iron} position={[0, 0.08, 0]} />
      </group>
      <group ref={bind(rig, 'alarm')} position={[0, 3.3, 0]} visible={false}>
        <Box size={[0.14, 0.45, 0.14]} m={alarmGlow} position={[0, 0.2, 0]} />
        <Box size={[0.14, 0.14, 0.14]} m={alarmGlow} position={[0, -0.18, 0]} />
      </group>
      <group ref={bind(rig, 'puzzled')} position={[0, 3.3, 0]} visible={false}>
        <Box size={[0.3, 0.12, 0.12]} m={puzzledGlow} position={[0, 0.35, 0]} />
        <Box size={[0.12, 0.25, 0.12]} m={puzzledGlow} position={[0.12, 0.2, 0]} />
        <Box size={[0.12, 0.14, 0.12]} m={puzzledGlow} position={[0, 0.02, 0]} />
        <Box size={[0.12, 0.12, 0.12]} m={puzzledGlow} position={[0, -0.2, 0]} />
      </group>
    </group>
  );
}

function Watcher({ id, path, speed = PATROL_SPEED, from }) {
  const root = useRef();
  const cone = useRef();
  const rig = useRef({});
  const geometry = useMemo(sightGeometry, []);
  const stage = useStore((s) => s.stage);
  const home = path[0];
  const brain = useRef({
    x: home[0],
    z: home[1],
    y: groundAt(home[0], home[1]) ?? 13,
    heading: 0,
    leg: 1, // index of the path point being walked to
    mode: 'patrol', // patrol | chase | investigate | return
    notice: 0,
    lost: 0,
    target: null,
    lureTime: null,
    epoch: 0,
    cycle: 0,
  });
  const active = stage >= from && stage < STAGE.DONE;

  useFrame((_, delta) => {
    if (!active) return;
    const dt = Math.min(delta, 0.05);
    const w = brain.current;
    live.watchers[id] = w;
    const p = live.player;
    const { playing } = store.get();

    // After you're caught, everyone goes back to their rounds.
    if (w.epoch !== live.resetWatchers) {
      w.epoch = live.resetWatchers;
      w.mode = 'return';
      w.notice = 0;
    }

    // Can the lantern-light see you? Torches and candles hide you completely.
    const dx = p.x - w.x;
    const dz = p.z - w.z;
    const dist = Math.hypot(dx, dz);
    const angle = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - w.heading), Math.cos(Math.atan2(dx, dz) - w.heading)));
    const sameLevel = Math.abs(p.y - w.y) < 2;
    const sees = playing && !p.safe && sameLevel && ((dist < SIGHT_RANGE && angle < SIGHT_HALF_ANGLE) || dist < 1.4);

    // A fresh banger nearby pulls them over to look.
    const lure = live.lure;
    if (lure && lure.time !== w.lureTime && live.now - lure.time < 1 && Math.hypot(lure.x - w.x, lure.z - w.z) < LURE_RANGE) {
      w.lureTime = lure.time;
      w.mode = 'investigate';
      w.target = { x: lure.x, z: lure.z };
      w.lost = 0;
      w.notice = 0;
    }

    let goal = null;
    let pace = speed;
    if (w.mode === 'investigate') {
      goal = w.target;
      pace = INVESTIGATE_SPEED;
      if (live.now - w.lureTime > (lure?.duration ?? 4) + 1) w.mode = 'return';
    } else if (w.mode === 'chase') {
      goal = { x: p.x, z: p.z };
      pace = CHASE_SPEED;
      w.lost = sees || (dist < 10 && !p.safe) ? 0 : w.lost + dt;
      if (w.lost > GIVE_UP_TIME || p.safe) w.mode = 'return';
      if (dist < 1.0 && !p.safe && playing) live.caughtBy = 'watcher';
    } else {
      w.notice = sees ? w.notice + dt : Math.max(0, w.notice - dt);
      if (w.notice > NOTICE_TIME) {
        w.mode = 'chase';
        w.notice = 0;
        sfx.spotted();
      } else if (w.mode === 'return') {
        goal = { x: path[w.leg][0], z: path[w.leg][1] };
        if (Math.hypot(goal.x - w.x, goal.z - w.z) < 0.4) w.mode = 'patrol';
      } else {
        goal = { x: path[w.leg][0], z: path[w.leg][1] };
        if (Math.hypot(goal.x - w.x, goal.z - w.z) < 0.4) w.leg = (w.leg + 1) % path.length;
      }
      // While noticing you, stop and stare.
      if (w.notice > 0) goal = null;
    }

    let moving = false;
    if (goal) {
      const gx = goal.x - w.x;
      const gz = goal.z - w.z;
      const d = Math.hypot(gx, gz);
      if (d > 0.05) {
        const step = Math.min(d, pace * dt);
        const nx = w.x + (gx / d) * step;
        const nz = w.z + (gz / d) * step;
        // Never walk off the causeway or through walls.
        const ok = (x, z) => {
          const g = groundAt(x, z);
          return g !== null && Math.abs(g - w.y) < 0.8;
        };
        if (ok(nx, nz)) {
          w.x = nx;
          w.z = nz;
        } else if (ok(nx, w.z)) w.x = nx;
        else if (ok(w.x, nz)) w.z = nz;
        w.heading = turnTowards(w.heading, Math.atan2(gx, gz), 4, dt);
        moving = true;
      }
    } else if (w.notice > 0) {
      w.heading = turnTowards(w.heading, Math.atan2(dx, dz), 3, dt);
    }

    const ground = groundAt(w.x, w.z) ?? w.y;
    w.y += (ground - w.y) * Math.min(1, dt * 8);
    if (moving) w.cycle += dt * pace * 3;
    root.current.position.set(w.x, w.y + Math.sin(w.cycle * 2) * 0.04, w.z);
    root.current.rotation.y = w.heading;
    rig.current.robe.rotation.z = Math.sin(w.cycle) * 0.04;
    rig.current.alarm.visible = w.mode === 'chase';
    rig.current.puzzled.visible = w.mode === 'investigate' || w.notice > 0;
    cone.current.material = w.mode === 'chase' || w.notice > 0 ? coneAngry : coneCalm;

    // Tally hunters for the HUD and the music.
    if (w.mode === 'chase') live.huntersThisFrame += 1;
  });

  if (!active) return null;
  return (
    <group ref={root} userData={{ watcher: id }}>
      <WatcherBody rig={rig} />
      <mesh ref={cone} geometry={geometry} material={coneCalm} onBeforeRender={skipInNormalPass} raycast={() => null} />
    </group>
  );
}

export function Watchers() {
  // Count chasers each frame: reset before the Watchers update, publish after.
  useFrame(() => {
    live.hunted = live.huntersThisFrame ?? 0;
    live.huntersThisFrame = 0;
  }, -1);
  return WATCHERS.map((w) => <Watcher key={w.id} {...w} />);
}
