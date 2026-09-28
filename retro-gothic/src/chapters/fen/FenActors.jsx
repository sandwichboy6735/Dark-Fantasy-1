import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, coneGeo, cylGeo, glow, icoGeo, mat } from '../../retro/materials.jsx';
import { store, useStore } from '../../store.js';
import { difficulty } from '../../game/quest.js';
import { live } from '../../game/live.js';
import { sfx } from '../../game/audio.js';
import { FlickerLight } from '../../world/Lights.jsx';
import { skipInNormalPass } from '../../world/Sky.jsx';
import { isTalkingTo, turnTowards } from '../../world/actor.js';
import { DROWNED, FEN, MURK_SPOT, STARS, TOADS } from './quest.js';
import { FONT, TOWER, TOWER_TOP, WATER_FLOOR, fenColliders, isSwimmable } from './layout.js';
import { FONT_INFO, MURK_INFO, TOAD_LINES } from './npcs.js';

const robe = mat({ color: '#2c3024' });
const shawl = mat({ color: '#4a3a4a' });
const witchSkin = mat({ color: '#8aa070' });
const hat = mat({ color: '#18161a' });
const greyHair = mat({ color: '#b8b8a8' });
const witchEye = glow('#d8ff60');
const iron = mat({ color: '#24262a', type: 'phong' });
const brew = glow('#7aff4a');
const stone = mat({ color: '#9aa898', map: 'moss' });
const starCore = glow('#fffbe0');
const starSpike = glow('#ffe27a');
const beam = mat({ color: '#fff0a0', type: 'basic', fog: false, transparent: true, opacity: 0.3 });
const toadSkin = mat({ color: '#6a7a30' });
const toadBelly = mat({ color: '#c8b870' });
const toadEye = glow('#ffcc30');
const black = mat({ color: '#000000', type: 'basic' });

// Mother Murk: hunched, hatted and warty, stirring her cauldron.
function Murk() {
  const root = useRef();
  const arm = useRef();
  const heading = useRef(-0.6);
  useFrame(({ clock, camera }, delta) => {
    const t = clock.elapsedTime;
    const talking = isTalkingTo('murk');
    arm.current.rotation.set(-1.1 + Math.sin(t * 1.8) * 0.25, Math.sin(t * 1.8) * 0.5, 0);
    const wanted = talking ? Math.atan2(camera.position.x - MURK_SPOT.x, camera.position.z - MURK_SPOT.z) : 2.2;
    heading.current = turnTowards(heading.current, wanted, 2.5, Math.min(delta, 0.05));
    root.current.rotation.y = heading.current;
  });
  return (
    <group ref={root} position={[MURK_SPOT.x, 0, MURK_SPOT.z]} userData={{ interact: MURK_INFO }}>
      <mesh geometry={cylGeo(0.3, 0.72, 1.4, 7)} material={robe} position={[0, 0.7, 0]} />
      <group position={[0, 1.35, 0]} rotation={[0.4, 0, 0]}>
        <mesh geometry={cylGeo(0.36, 0.5, 0.5, 7)} material={shawl} position={[0, 0.1, 0]} />
        <group position={[0, 0.55, 0.12]}>
          <mesh geometry={icoGeo(0.24, 1)} material={witchSkin} scale={[1, 1.1, 1]} />
          <mesh geometry={coneGeo(0.06, 0.36, 4)} material={witchSkin} position={[0, -0.04, 0.3]} rotation={[1.9, 0, 0]} />
          <mesh geometry={icoGeo(0.035)} material={witchSkin} position={[0.06, 0.02, 0.24]} />
          {[-1, 1].map((s) => (
            <Box key={s} size={[0.07, 0.05, 0.03]} m={witchEye} position={[0.09 * s, 0.07, 0.21]} />
          ))}
          {[-0.2, -0.1, 0.1, 0.2].map((hx) => (
            <Box key={hx} size={[0.06, 0.5, 0.06]} m={greyHair} position={[hx, -0.2, -0.08]} />
          ))}
          {/* The hat: a wide brim and a tall crooked cone. */}
          <mesh geometry={cylGeo(0.62, 0.62, 0.05, 10)} material={hat} position={[0, 0.2, 0]} />
          <mesh geometry={coneGeo(0.28, 0.7, 7)} material={hat} position={[0, 0.55, -0.03]} rotation={[-0.15, 0, 0]} />
          <mesh geometry={coneGeo(0.14, 0.45, 7)} material={hat} position={[0, 0.98, -0.2]} rotation={[-0.9, 0, 0]} />
        </group>
        {/* The stirring arm, with a long ladle. */}
        <group ref={arm} position={[0.34, 0, 0.05]}>
          <Box size={[0.13, 0.6, 0.13]} m={robe} position={[0, -0.3, 0]} />
          <Box size={[0.05, 1.3, 0.05]} m={iron} position={[0, -0.55, 0.2]} rotation={[0.9, 0, 0]} />
        </group>
        <Box size={[0.13, 0.55, 0.13]} m={robe} position={[-0.32, -0.25, 0.12]} rotation={[-0.6, 0, 0.2]} />
      </group>
    </group>
  );
}

// Her cauldron, bubbling green over a peat fire.
function Cauldron({ position }) {
  const bubbles = useRef();
  useFrame(({ clock }) => {
    bubbles.current.children.forEach((b, i) => {
      const t = (clock.elapsedTime * 0.8 + i * 0.37) % 1;
      b.position.set(Math.sin(i * 2.4) * 0.3, 0.95 + t * 0.35, Math.cos(i * 2.4) * 0.3);
      b.scale.setScalar(1 - t);
    });
  });
  return (
    <group position={position}>
      {[0, 2.1, 4.2].map((a) => (
        <mesh key={a} geometry={icoGeo(0.22)} material={stone} position={[Math.sin(a) * 0.55, 0.12, Math.cos(a) * 0.55]} />
      ))}
      <Box size={[0.4, 0.14, 0.4]} m={glow('#ff7a2a')} position={[0, 0.12, 0]} />
      <mesh geometry={cylGeo(0.62, 0.45, 0.75, 9)} material={iron} position={[0, 0.6, 0]} />
      <mesh geometry={cylGeo(0.56, 0.56, 0.04, 9)} material={brew} position={[0, 0.95, 0]} />
      <group ref={bubbles}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Box key={i} size={[0.1, 0.1, 0.1]} m={brew} />
        ))}
      </group>
      <FlickerLight intensity={14} color="#8aff4a" distance={9} seed={3} position={[0, 1.5, 0]} />
    </group>
  );
}

// A fallen star: a white-hot core with four golden spikes, humming and turning,
// with a thin shaft of light so you can find it through the fog.
function FallenStar({ x, y, z, seed }) {
  const group = useRef();
  const spin = useRef();
  const lift = y > -0.2 ? 0.95 : 0.55;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    group.current.position.y = y + lift + Math.sin(t * 2) * 0.1;
    spin.current.rotation.set(0, t * 1.4, Math.sin(t) * 0.3);
  });
  return (
    <group ref={group} position={[x, y + lift, z]}>
      <Box size={[0.08, 8, 0.08]} m={beam} position={[0, 4.2, 0]} />
      <group ref={spin} scale={1.6}>
        <mesh geometry={icoGeo(0.18)} material={starCore} />
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} size={[0.06, 0.62, 0.06]} m={starSpike} rotation={[0, 0, (i * Math.PI) / 4]} />
        ))}
      </group>
    </group>
  );
}

function Stars() {
  const found = useStore((s) => s.fen.stars);
  const stage = useStore((s) => s.fen.stage);
  if (stage >= FEN.FLOOD) return null;
  return STARS.filter((s) => !found.includes(s.id)).map((s, i) => <FallenStar key={s.id} {...s} seed={i * 1.3} />);
}

function Toad({ id, x, y, z, rotation }) {
  const throat = useRef();
  const kissed = useStore((s) => s.fen.toads.includes(id));
  useFrame(({ clock }) => {
    throat.current.scale.setScalar(1 + Math.max(0, Math.sin(clock.elapsedTime * 3 + x)) * 0.5);
  });
  const info = { id, name: kissed ? 'A kissed toad' : 'A golden-eyed toad', verb: 'KISS THE TOAD', accent: '#ffcc30', range: 3.5, lines: TOAD_LINES };
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]} userData={{ interact: info }} scale={1.4}>
      <mesh geometry={icoGeo(0.16, 1)} material={toadSkin} position={[0, 0.1, 0]} scale={[1.2, 0.7, 1.3]} />
      <mesh ref={throat} geometry={icoGeo(0.07)} material={toadBelly} position={[0, 0.06, 0.16]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[0.07, 0.07, 0.07]} m={toadEye} position={[0.07 * s, 0.2, 0.1]} />
          <Box size={[0.02, 0.05, 0.02]} m={black} position={[0.07 * s, 0.2, 0.14]} />
          <Box size={[0.08, 0.05, 0.16]} m={toadSkin} position={[0.15 * s, 0.03, -0.08]} />
        </group>
      ))}
    </group>
  );
}

// The Star Font. Once the stars are set it blazes until they fly home.
function Font() {
  const stage = useStore((s) => s.fen.stage);
  const glowRef = useRef();
  useFrame(({ clock }) => {
    glowRef.current.visible = stage === FEN.FLOOD;
    glowRef.current.rotation.y = clock.elapsedTime * 0.8;
  });
  return (
    <group position={[FONT.x, 0, FONT.z]} userData={{ interact: FONT_INFO }}>
      <Box size={[1.4, 0.3, 1.4]} m={stone} position={[0, 0.15, 0]} />
      <mesh geometry={cylGeo(0.3, 0.45, 0.8, 8)} material={stone} position={[0, 0.7, 0]} />
      <mesh geometry={cylGeo(0.95, 0.55, 0.45, 10)} material={stone} position={[0, 1.3, 0]} />
      <mesh geometry={cylGeo(0.8, 0.8, 0.04, 10)} material={stage === FEN.FLOOD ? glow('#fff6c0') : black} position={[0, 1.5, 0]} />
      <group ref={glowRef} position={[0, 1.6, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <group key={i} position={[Math.sin(i * 1.26) * 0.55, 0.1, Math.cos(i * 1.26) * 0.55]}>
            <mesh geometry={icoGeo(0.1)} material={starCore} />
            <Box size={[0.04, 0.4, 0.04]} m={starSpike} rotation={[0, 0, 0.8]} />
          </group>
        ))}
      </group>
      <FlickerLight intensity={stage === FEN.FLOOD ? 50 : 0} color="#fff0b0" distance={18} seed={1} position={[0, 2.6, 0]} />
    </group>
  );
}

const drownedSkin = mat({ color: '#7a8a90' });
const rags = mat({ color: '#223026' });
const drownedHair = mat({ color: '#0c100c' });
const drownedEye = glow('#c8ffd8');
const rippleMaterial = new THREE.MeshBasicMaterial({ color: '#9adcc0', transparent: true, opacity: 0.35, depthWrite: false, fog: false });

// A drowned thing: grey-skinned, hair plastered over its face, arms out.
function DrownedBody({ rig }) {
  const bind = (name) => (o) => {
    rig.current[name] = o;
  };
  return (
    <group>
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.16, 0.85, 0.18]} m={rags} position={[0.13 * s, 0.42, 0]} />
      ))}
      <Box size={[0.42, 0.35, 0.26]} m={rags} position={[0, 0.95, 0]} />
      <Box size={[0.46, 0.6, 0.26]} m={drownedSkin} position={[0, 1.38, 0]} />
      {[0, 1, 2].map((i) => (
        <Box key={i} size={[0.44, 0.04, 0.27]} m={rags} position={[0, 1.22 + i * 0.12, 0]} rotation={[0, 0, (i - 1) * 0.2]} />
      ))}
      <group position={[0, 1.82, 0.02]}>
        <mesh geometry={icoGeo(0.19, 1)} material={drownedSkin} scale={[0.9, 1.1, 0.95]} />
        <Box size={[0.26, 0.2, 0.05]} m={drownedHair} position={[0, -0.02, 0.17]} />
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.06, 0.04, 0.03]} m={drownedEye} position={[0.065 * s, 0.03, 0.2]} />
        ))}
        {[-0.14, -0.07, 0, 0.07, 0.14].map((hx, i) => (
          <Box key={hx} size={[0.05, 0.55 + (i % 2) * 0.2, 0.05]} m={drownedHair} position={[hx, -0.2, -0.12 + Math.abs(hx) * 0.4]} />
        ))}
      </group>
      {[-1, 1].map((s) => (
        <group key={s} ref={bind(s < 0 ? 'armL' : 'armR')} position={[0.3 * s, 1.62, 0]}>
          <Box size={[0.12, 0.75, 0.12]} m={drownedSkin} position={[0, -0.36, 0]} />
          {[-0.03, 0.03].map((fx) => (
            <Box key={fx} size={[0.03, 0.16, 0.03]} m={drownedSkin} position={[fx, -0.8, 0]} />
          ))}
        </group>
      ))}
    </group>
  );
}

const HEAR = { walk: 8.5, run: 13, sneak: 3.8 };
const SWIM = 2.35; // chasing speed: you wade at 2.6, so keep moving
const SUNK = 1.24; // how far below standing height they wait
const LEASH = 22;
const LURE_RANGE = 18;

// Waits under the water near its lair, with only its eyes and hair showing. Hear
// someone wading close and it rises and comes for them, but it can't leave the
// water and won't come near a lit witch-light.
function Drowned({ id, x, z }) {
  const root = useRef();
  const ripple = useRef();
  const rig = useRef({});
  const brain = useRef({ x, z, mode: 'lurk', depth: 1, heading: Math.random() * 6, lost: 0, lureTime: null, epoch: 0, target: null, clock: Math.random() * 10 });
  const done = useStore((s) => s.fen.stage >= FEN.FLOOD);
  const rippleLook = useMemo(() => rippleMaterial.clone(), []);

  useFrame((_, delta) => {
    if (done) return;
    const dt = Math.min(delta, 0.05);
    const w = brain.current;
    const p = live.player;
    const { playing } = store.get();
    w.clock += dt;
    if (w.epoch !== live.resetWatchers) {
      w.epoch = live.resetWatchers;
      w.mode = w.depth < 1 ? 'sink' : 'return';
    }
    const dist = Math.hypot(p.x - w.x, p.z - w.z);
    const range = live.sneaking ? HEAR.sneak : live.running ? HEAR.run : HEAR.walk;
    const heard = playing && live.wading && !live.safe && dist < range;

    // A bang in the water brings them up to look.
    const lure = live.lure;
    if (lure && lure.time !== w.lureTime && live.now - lure.time < 1 && Math.hypot(lure.x - w.x, lure.z - w.z) < LURE_RANGE && isSwimmable(lure.x, lure.z)) {
      w.lureTime = lure.time;
      w.mode = 'investigate';
      w.target = { x: lure.x, z: lure.z };
    }

    let goal = null;
    let pace = 0;
    if (w.mode === 'lurk') {
      w.depth = Math.min(1, w.depth + dt);
      goal = { x: x + Math.sin(w.clock * 0.3) * 1.5, z: z + Math.cos(w.clock * 0.3) * 1.5 };
      pace = 0.5;
      if (heard) {
        w.mode = 'rise';
        sfx.gurgle();
      }
    } else if (w.mode === 'rise') {
      w.depth = Math.max(0, w.depth - dt / 0.9);
      w.heading = turnTowards(w.heading, Math.atan2(p.x - w.x, p.z - w.z), 4, dt);
      if (w.depth <= 0) {
        w.mode = 'chase';
        w.lost = 0;
      }
    } else if (w.mode === 'chase') {
      goal = { x: p.x, z: p.z };
      pace = SWIM * difficulty().drowned;
      w.lost = live.wading && !live.safe && playing ? 0 : w.lost + dt;
      if (w.lost > 2 || Math.hypot(w.x - x, w.z - z) > LEASH) w.mode = 'sink';
      if (dist < 1.05 && live.wading && !live.safe && playing) live.caughtBy = 'drowned';
      live.huntersThisFrame += 1;
    } else if (w.mode === 'investigate') {
      w.depth = Math.max(0, w.depth - dt / 0.9);
      goal = w.target;
      pace = 1.8;
      if (live.now - w.lureTime > (lure?.duration ?? 5) + 1) w.mode = 'sink';
      if (heard && w.depth <= 0) w.mode = 'chase';
    } else if (w.mode === 'sink') {
      w.depth = Math.min(1, w.depth + dt / 1.2);
      if (w.depth >= 1) w.mode = 'return';
    } else if (w.mode === 'return') {
      goal = { x, z };
      pace = 2;
      if (Math.hypot(x - w.x, z - w.z) < 0.5) w.mode = 'lurk';
      if (heard) {
        w.mode = 'rise';
        sfx.gurgle();
      }
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
        // Only through open water: they stop dead at the shore.
        if (isSwimmable(nx, nz)) {
          w.x = nx;
          w.z = nz;
        } else if (isSwimmable(nx, w.z)) w.x = nx;
        else if (isSwimmable(w.x, nz)) w.z = nz;
        w.heading = turnTowards(w.heading, Math.atan2(gx, gz), 3, dt);
        moving = pace > 1;
      }
    }

    const sway = Math.sin(w.clock * (moving ? 5 : 1.5));
    root.current.position.set(w.x, WATER_FLOOR - w.depth * SUNK + (moving ? Math.abs(sway) * 0.05 : 0), w.z);
    root.current.rotation.set(0, w.heading, moving ? sway * 0.05 : 0);
    const reach = 1 - w.depth;
    rig.current.armL.rotation.set(-0.3 - reach * 1.1 + sway * 0.2, 0, 0.1);
    rig.current.armR.rotation.set(-0.3 - reach * 1.1 - sway * 0.2, 0, -0.1);
    ripple.current.visible = w.depth > 0.5;
    ripple.current.position.set(w.x, live.waterY + 0.02, w.z);
    ripple.current.scale.setScalar(0.8 + ((w.clock * 0.6) % 1) * 1.4);
    ripple.current.material.opacity = 0.35 * (1 - ((w.clock * 0.6) % 1));
  });

  if (done) return null;
  return (
    <>
      <group ref={root} raycast={() => null}>
        <DrownedBody rig={rig} />
      </group>
      <mesh ref={ripple} geometry={RIPPLE} material={rippleLook} onBeforeRender={skipInNormalPass} raycast={() => null} />
    </>
  );
}
const RIPPLE = new THREE.RingGeometry(0.55, 0.7, 16).rotateX(-Math.PI / 2);

function DrownedHorde() {
  // Count chasers each frame: reset before they update, publish after.
  useFrame(() => {
    live.hunted = live.huntersThisFrame ?? 0;
    live.huntersThisFrame = 0;
  }, -1);
  return DROWNED.map((d) => <Drowned key={d.id} {...d} />);
}

// The Drowned Queen: vast and pale, she rises out of the fen to the north as the
// water climbs, watching you race up the tower.
function DrownedQueen() {
  const root = useRef();
  const rig = useRef({});
  const flooding = useStore((s) => s.fen.stage === FEN.FLOOD);
  useFrame(({ clock, camera }) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    const rise = live.flood ? Math.min(1, (live.gameTime - live.flood.startAt) / 5) : 0;
    root.current.position.set(0, live.waterY - 9.5 + rise * 3, -122);
    root.current.rotation.y = Math.atan2(camera.position.x - 0, camera.position.z + 122) * 0.3;
    rig.current.armL.rotation.set(-1.9 + Math.sin(t * 0.6) * 0.15, 0, 0.35);
    rig.current.armR.rotation.set(-1.9 + Math.sin(t * 0.6 + 1) * 0.15, 0, -0.35);
  });
  if (!flooding) return null;
  return (
    <group ref={root} scale={8} raycast={() => null}>
      <DrownedBody rig={rig} />
    </group>
  );
}

// When the flood is beaten, the five stars lift off the tower roof and climb away
// into the sky.
function StarsHome() {
  const group = useRef();
  const started = useRef(null);
  const stage = useStore((s) => s.fen.stage);
  const was = useRef(stage);
  useFrame(({ clock }) => {
    if (was.current === FEN.FLOOD && stage === FEN.DONE && started.current === null) started.current = clock.elapsedTime;
    was.current = stage;
    const g = group.current;
    if (started.current === null) {
      g.visible = false;
      return;
    }
    const age = clock.elapsedTime - started.current;
    g.visible = age < 9;
    g.children.forEach((star, i) => {
      const a = i * 1.26 + age * 0.6;
      const r = 1 + age * 1.5;
      star.position.set(TOWER.x + Math.sin(a) * r, TOWER_TOP + 2 + age * age * 2.2, TOWER.z + Math.cos(a) * r);
      star.rotation.y = age * 3;
    });
  });
  return (
    <group ref={group} visible={false}>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} scale={2}>
          <mesh geometry={icoGeo(0.2)} material={starCore} />
          {[0, 1, 2, 3].map((k) => (
            <Box key={k} size={[0.06, 0.7, 0.06]} m={starSpike} rotation={[0, 0, (k * Math.PI) / 4]} />
          ))}
        </group>
      ))}
    </group>
  );
}

fenColliders.circle(MURK_SPOT.x, MURK_SPOT.z, 0.5);
fenColliders.circle(4.9, 8.4, 0.75); // cauldron

export function FenActors() {
  return (
    <>
      <Murk />
      <Cauldron position={[4.9, 0, 8.4]} />
      <Stars />
      {TOADS.map((t) => (
        <Toad key={t.id} {...t} />
      ))}
      <Font />
      <DrownedHorde />
      <DrownedQueen />
      <StarsHome />
    </>
  );
}
