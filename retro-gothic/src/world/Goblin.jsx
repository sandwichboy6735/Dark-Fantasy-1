import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, coneGeo, cylGeo, glow, icoGeo, mat } from '../retro/materials.jsx';
import { bind, isTalkingTo, turnTowards, useCollider } from './actor.js';
import { GOBLINS } from './npcs.js';

const checker = mat({ color: '#ffffff', map: 'checker' });
const gold = mat({ color: '#e8b830', type: 'phong', shininess: 90 });
const tooth = mat({ color: '#f4eed8' });
const mouth = mat({ color: '#3a0808' });
const pupil = mat({ color: '#000000', type: 'basic' });
const brow = mat({ color: '#1f2a10' });
const pants = mat({ color: '#3a2a1a' });
const belt = mat({ color: '#24160c' });
const tankardWood = mat({ color: '#c09070', map: 'barrel' });
const foam = mat({ color: '#f2ead0' });
const band = mat({ color: '#3a3a40', type: 'phong' });
// Goblins are small, but at 240 lines they still need to read from across the yard.
const GOBLIN_SCALE = 1.25;

// Oversized: the mug is about the size of the goblin's head.
export function Tankard() {
  return (
    <group>
      <mesh geometry={cylGeo(0.13, 0.12, 0.3, 8)} material={tankardWood} />
      <mesh geometry={cylGeo(0.135, 0.135, 0.03, 8)} material={band} position={[0, -0.1, 0]} />
      <mesh geometry={cylGeo(0.135, 0.135, 0.03, 8)} material={band} position={[0, 0.1, 0]} />
      <mesh geometry={cylGeo(0.14, 0.13, 0.06, 8)} material={foam} position={[0, 0.17, 0]} />
      <mesh geometry={icoGeo(0.08)} material={foam} position={[0.03, 0.22, 0.02]} />
      <Box size={[0.05, 0.05, 0.04]} m={foam} position={[0.12, 0.13, 0]} />
      <Box size={[0.04, 0.2, 0.04]} m={tankardWood} position={[0.2, 0, 0]} />
      <Box size={[0.09, 0.04, 0.04]} m={tankardWood} position={[0.16, 0.09, 0]} />
      <Box size={[0.09, 0.04, 0.04]} m={tankardWood} position={[0.16, -0.09, 0]} />
    </group>
  );
}

// One drooping point of the jester hat: a checkered horn bent over, with a bell.
function HatPoint({ rotation }) {
  return (
    <group rotation={rotation}>
      <mesh geometry={cylGeo(0.05, 0.11, 0.32, 5)} material={checker} position={[0, 0.16, 0]} />
      <group position={[0, 0.31, 0]} rotation={[0, 0, rotation[2] ? Math.sign(rotation[2]) * 0.9 : 0]}>
        <group rotation={[rotation[0] ? Math.sign(rotation[0]) * 0.9 : 0, 0, 0]}>
          <mesh geometry={coneGeo(0.05, 0.26, 5)} material={checker} position={[0, 0.12, 0]} />
          <mesh geometry={icoGeo(0.045)} material={gold} position={[0, 0.27, 0]} />
        </group>
      </group>
    </group>
  );
}

function Head({ skin }) {
  return (
    <group>
      <mesh geometry={icoGeo(0.26, 1)} material={skin} scale={[1.1, 0.92, 1]} />
      <Box size={[0.36, 0.12, 0.26]} m={skin} position={[0, -0.14, 0.06]} />
      {/* Wide grin full of sharp teeth. */}
      <Box size={[0.3, 0.09, 0.05]} m={mouth} position={[0, -0.1, 0.2]} />
      {[-0.1, -0.05, 0, 0.05, 0.1].map((x) => (
        <mesh key={x} geometry={coneGeo(0.022, 0.065, 3)} material={tooth} position={[x, -0.075, 0.225]} rotation={[Math.PI, 0, 0]} />
      ))}
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} geometry={coneGeo(0.024, 0.09, 3)} material={tooth} position={[x, -0.115, 0.22]} />
      ))}
      <mesh geometry={coneGeo(0.05, 0.22, 4)} material={skin} position={[0, 0.0, 0.3]} rotation={[Math.PI / 2, 0, 0]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[0.08, 0.055, 0.03]} m={glow('#f0e040')} position={[0.1 * s, 0.07, 0.225]} />
          <Box size={[0.025, 0.055, 0.02]} m={pupil} position={[0.1 * s, 0.07, 0.24]} />
          <Box size={[0.12, 0.03, 0.04]} m={brow} position={[0.1 * s, 0.12, 0.22]} rotation={[0, 0, 0.35 * s]} />
          <mesh geometry={coneGeo(0.07, 0.42, 4)} material={skin} position={[0.33 * s, 0.05, -0.02]} rotation={[0, 0, -s * (Math.PI / 2 - 0.35)]} />
        </group>
      ))}
      {/* Blue-and-black checkered jester hat. */}
      <group position={[0, 0.18, 0]}>
        <mesh geometry={cylGeo(0.25, 0.27, 0.1, 8)} material={checker} />
        <HatPoint rotation={[0, 0, 0.85]} />
        <HatPoint rotation={[0, 0, -0.85]} />
        <HatPoint rotation={[-0.85, 0, 0]} />
        <mesh geometry={icoGeo(0.04)} material={gold} position={[0, -0.05, 0.26]} />
      </group>
    </group>
  );
}

// Arm pivots at the shoulder and hangs down -y. A tankard in the hand is
// counter-rotated so it stays upright whatever the arm is doing.
function Arm({ side, skin, rig, holds }) {
  const name = side < 0 ? 'armL' : 'armR';
  return (
    <group ref={bind(rig, name)} position={[0.28 * side, 0.82, 0]}>
      <Box size={[0.11, 0.42, 0.11]} m={skin} position={[0, -0.21, 0]} />
      <mesh geometry={icoGeo(0.075)} material={skin} position={[0, -0.44, 0]} />
      {holds && (
        <group ref={bind(rig, `${name}Mug`)} position={[0, -0.5, 0]}>
          <group position={[0, 0.08, 0]}>
            <Tankard />
          </group>
        </group>
      )}
    </group>
  );
}

export const POSES = {
  // Frozen mid-climb in a block of ice, arms flung up in surprise.
  frozen(r) {
    r.body.position.y = 0;
    r.body.rotation.set(-0.15, 0, 0.05);
    r.armR.rotation.set(0, 0, 2.5);
    r.armL.rotation.set(0.3, 0, -2.2);
    r.head.rotation.set(-0.3, 0.2, 0);
    r.legL.rotation.x = 0.35;
    r.legR.rotation.x = -0.45;
  },
  // Tankard thrust at the sky, the other fist pumping, bouncing on the spot.
  cheer(r, t) {
    r.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.12;
    r.body.rotation.x = -0.12;
    r.armR.rotation.set(0, 0, 2.7 + Math.sin(t * 4.4) * 0.25);
    r.armL.rotation.set(0, 0, -2.3 - Math.sin(t * 4.4 + 1) * 0.35);
    r.head.rotation.set(-0.25 + Math.sin(t * 4.4) * 0.1, 0, 0);
    r.legL.rotation.x = 0;
    r.legR.rotation.x = 0;
  },
  // Arm out in front, clinking with a neighbour every couple of seconds.
  toast(r, t) {
    const clink = Math.max(0, Math.sin(t * 2.6)) ** 6;
    r.body.position.y = Math.abs(Math.sin(t * 1.3)) * 0.04;
    r.body.rotation.z = Math.sin(t * 1.3) * 0.08;
    r.armR.rotation.set(-1.75 - clink * 0.35, 0, 0.25);
    r.armL.rotation.set(0, 0, -0.9 - Math.sin(t * 2) * 0.2);
    r.head.rotation.set(-0.1, 0, Math.sin(t * 1.3) * 0.15);
    r.legL.rotation.x = 0;
    r.legR.rotation.x = 0;
  },
  // On a stool, rocking back and forth, mug waved overhead.
  sit(r, t) {
    r.body.position.y = 0;
    r.body.rotation.x = -0.1 + Math.sin(t * 2) * 0.12;
    r.legL.rotation.x = -1.45;
    r.legR.rotation.x = -1.45 + Math.sin(t * 4) * 0.2;
    r.armR.rotation.set(0, 0, 2.5 + Math.sin(t * 2) * 0.35);
    r.armL.rotation.set(-0.8, 0, -0.3);
    r.head.rotation.set(-0.3, 0, Math.sin(t * 2) * 0.2);
  },
  // Jumping jig, both arms flung up, spinning.
  dance(r, t) {
    const hop = Math.max(0, Math.sin(t * 3.4));
    r.body.position.y = hop * 0.35;
    r.legL.rotation.x = Math.sin(t * 3.4) * 0.6;
    r.legR.rotation.x = -Math.sin(t * 3.4) * 0.6;
    r.armR.rotation.set(0, 0, 2.6 + Math.sin(t * 6.8) * 0.3);
    r.armL.rotation.set(0, 0, -2.6 + Math.sin(t * 6.8) * 0.3);
    r.head.rotation.set(-0.2, 0, Math.sin(t * 3.4) * 0.3);
  },
  // Slouched against the barrels, slowly lifting the mug for a long drink.
  lean(r, t) {
    const drink = (Math.sin(t * 0.8) + 1) / 2;
    r.body.position.y = 0;
    r.body.rotation.set(0, 0, 0.18);
    r.armR.rotation.set(-1.2 - drink * 1.5, 0, 0.35);
    r.armL.rotation.set(0, 0, -0.25);
    r.head.rotation.set(-0.45 * drink, 0, -0.1);
    r.legL.rotation.x = 0;
    r.legR.rotation.x = -0.3;
  },
  // Behind the counter: raises a mug to the room, wipes, raises again.
  keeper(r, t) {
    r.body.position.y = 0;
    r.armR.rotation.set(0, 0, 1.6 + Math.sin(t * 1.5) * 1.0);
    r.armL.rotation.set(-1.2 + Math.sin(t * 5) * 0.25, 0, -0.2);
    r.head.rotation.set(-0.1, Math.sin(t * 0.7) * 0.4, 0);
    r.legL.rotation.x = 0;
    r.legR.rotation.x = 0;
  },
};

export function Goblin({ id, name, lines, stages, verbs, verb, verbFor, morning, position, rotation = 0, pose, skin = '#5f8f2e', tunic = '#5a3a20', onTable = false, phase = 0 }) {
  const root = useRef();
  const rig = useRef({});
  const heading = useRef(rotation);
  const skinMat = mat({ color: skin });
  const tunicMat = mat({ color: tunic });
  useCollider(root, 0.45, !onTable && pose !== 'sit' && pose !== 'keeper');

  useFrame(({ clock, camera }, delta) => {
    const r = rig.current;
    const t = clock.elapsedTime * 1.0 + phase + position[0] * 0.37;
    POSES[pose](r, t);
    // Tankards stay upright: undo the arm's rotation, plus a little slosh.
    for (const side of ['armL', 'armR']) {
      const mug = r[`${side}Mug`];
      if (!mug) continue;
      const a = r[side].rotation;
      mug.rotation.set(-a.x + (pose === 'lean' ? -a.x * 0.15 - 0.2 : 0), 0, -a.z + Math.sin(t * 5) * 0.12, 'ZYX');
    }
    // Look at whoever is looking at them.
    const wanted = isTalkingTo(id) && pose !== 'frozen' ? Math.atan2(camera.position.x - position[0], camera.position.z - position[2]) : rotation;
    heading.current = turnTowards(heading.current, wanted, 3, Math.min(delta, 0.05));
    root.current.rotation.y = pose === 'dance' && !isTalkingTo(id) ? clock.elapsedTime * 1.3 : heading.current;
  });

  return (
    <group ref={root} position={position} scale={GOBLIN_SCALE} userData={{ interact: { id, name, lines, stages, verbs, verb, verbFor, morning, accent: '#9be05a' } }}>
      <group ref={bind(rig, 'body')}>
        {[-1, 1].map((s) => (
          <group key={s} ref={bind(rig, s < 0 ? 'legL' : 'legR')} position={[0.12 * s, 0.42, 0]}>
            <Box size={[0.14, 0.36, 0.15]} m={pants} position={[0, -0.18, 0]} />
            <Box size={[0.15, 0.07, 0.28]} m={skinMat} position={[0, -0.38, 0.06]} />
          </group>
        ))}
        <Box size={[0.46, 0.44, 0.32]} m={tunicMat} position={[0, 0.66, 0]} />
        <mesh geometry={icoGeo(0.22)} material={tunicMat} position={[0, 0.58, 0.07]} />
        <Box size={[0.48, 0.07, 0.34]} m={belt} position={[0, 0.46, 0]} />
        <Box size={[0.06, 0.06, 0.02]} m={gold} position={[0, 0.46, 0.18]} />
        <group ref={bind(rig, 'head')} position={[0, 0.98, 0]}>
          <Head skin={skinMat} />
        </group>
        <Arm side={1} skin={skinMat} rig={rig} holds />
        <Arm side={-1} skin={skinMat} rig={rig} holds={pose === 'dance'} />
      </group>
    </group>
  );
}

export function Goblins() {
  return GOBLINS.map((g) => <Goblin key={g.id} {...g} />);
}
