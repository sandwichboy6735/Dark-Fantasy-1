// Quiet, creative things to do: sleep and dream, sit and watch, fish, stargaze through
// telescopes, release sky lanterns, build snowmen, and ride a rope swing over the lake.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { WATER_Y } from './layout.js';
import { moonDir } from './fx.js';

const DREAMS = [
  'You dream you are a lantern, drifting up and up, and the moon waves at you.',
  'You dream of a goblin choir singing lullabies in a language made of buttons.',
  'You dream the Moonspire is a giant’s tooth, and the giant is smiling.',
  'You dream of flying with Vessryn the dragon. She is very warm and hums when she flies.',
  'You dream the floating islands are ships, and they are all sailing home.',
];
const THOUGHTS = [
  'You listen to the realm breathe.',
  'The lanterns flicker like slow heartbeats.',
  'Somewhere, someone is laughing. It is a good sound.',
  'The moon is so big tonight you could almost touch it.',
  'You feel very small, and that is fine.',
  'A breeze carries the smell of woodsmoke and pine.',
];
export const FISH = [
  ['Moonminnow', 'Tiny, silver, and very pleased with itself.', [1.4, 1.5, 2.2]],
  ['Starfin Trout', 'Its fins sparkle like a clear night.', [0.8, 1.2, 2.4]],
  ['Ghost Carp', 'You can see right through it. It can see right through you.', [1.6, 2, 2]],
  ['Lantern Eel', 'It glows warm orange, like a tiny floating window.', [2.4, 1.3, 0.4]],
  ['Sleepy Pike', 'It yawns. You didn’t know fish could yawn.', [0.7, 1.8, 1]],
  ['Silver Whisker', 'The rarest fish in the Mirror Lake. It winks at you.', [2.4, 2.4, 2.6]],
];

export function addCozy(acts, getDragon) {
  const c = acts.c;
  const { scene, world, T, mats } = c;
  const k = new Kit(mats);
  const spots = [];
  const spot = (x, z, label, act, y) => spots.push({ x, z, y: y ?? T.heightAt(x, z), label, act });

  // ---------- Beds ----------
  const bed = (x, z, rot, fire) => {
    const y = T.heightAt(x, z);
    k.box('cloth', 0.9, 0.18, 2.1, '#2e3a6e', { x, y: y + 0.09, z, ry: rot });
    k.box('cloth', 0.7, 0.16, 0.4, '#d8d0c0', { x: x - Math.sin(rot) * 0.8, y: y + 0.24, z: z - Math.cos(rot) * 0.8, ry: rot });
    if (fire) {
      const fx = x + Math.cos(rot) * 2, fz = z - Math.sin(rot) * 2, fy = T.heightAt(fx, fz);
      for (let i = 0; i < 4; i++) k.cyl('wood', 0.07, 0.07, 1, 5, '#3a2a20', { x: fx, y: fy + 0.12, z: fz, rz: Math.PI / 2, ry: i * 0.8 });
      k.cone('glow', 0.35, 0.8, 7, '#ff9a3a', { x: fx, y: fy + 0.45, z: fz, bright: 2.4 });
      world.lights.push({ x: fx, y: fy + 0.8, z: fz, color: 0xff9040, intensity: 1.4, range: 14 });
      world.chimneys.push({ x: fx, y: fy + 1, z: fz });
    }
    world.noTrees(x, z, 4);
  };
  bed(-10, 351, 0.2, true);
  spot(-10, 351, 'Sleep by the campfire', () => acts.start('sleep', { x: -10, z: 351, rot: 0.2 }));
  bed(-848, 848, 2.4, true);
  spot(-848, 848, 'Sleep under the stars', () => acts.start('sleep', { x: -848, z: 848, rot: 2.4 }));
  { // hammock in the Witchwood
    const x = 628, z = 78, y = T.heightAt(x, z);
    for (const dx of [-2.2, 2.2]) k.cyl('wood', 0.1, 0.12, 2.4, 6, '#2e2420', { x: x + dx, y: y + 1.2, z });
    const g = new THREE.CylinderGeometry(0.55, 0.55, 3.6, 12, 1, true, Math.PI, Math.PI);
    k.add('cloth', g, '#6a3a6a', { x, y: y + 1.35, z, rz: Math.PI / 2 });
    world.noTrees(x, z, 4);
    spot(x, z + 1.2, 'Nap in the hammock', () => acts.start('sleep', { x, z, rot: Math.PI / 2, y: y + 1.1 }));
  }

  // ---------- Benches ----------
  const bench = (x, z, face, label) => {
    const y = T.heightAt(x, z);
    const rx = Math.cos(face), rz = -Math.sin(face);
    k.box('wood', 2.2, 0.1, 0.6, '#5a4432', { x, y: y + 0.5, z, ry: face });
    k.box('wood', 2.2, 0.5, 0.08, '#5a4432', { x: x - Math.sin(face) * 0.3, y: y + 0.85, z: z - Math.cos(face) * 0.3, ry: face });
    for (const s of [-0.9, 0.9]) k.box('wood', 0.1, 0.5, 0.5, '#3a2a20', { x: x + rx * s, y: y + 0.25, z: z + rz * s, ry: face });
    world.box(x, z, 1.1, 0.3, face, y - 1, y + 0.9);
    world.noTrees(x, z, 3);
    spot(x + Math.sin(face) * 0.9, z + Math.cos(face) * 0.9, label, () => acts.start('sit', { x, z, face, y: y + 0.5 }));
  };
  bench(9, 343, Math.PI, 'Sit on the bench');          // overlook, facing the lake
  bench(-62, 104, 0, 'Sit by the lake');                // village shore
  bench(442, 532, Math.PI, 'Sit a while');              // graves
  bench(-622, 164, -2.3, 'Sit by the fire');            // market

  // ---------- Fishing ----------
  const dockEnd = [53.8, 286.5], dockDir = [-0.42, -0.91];
  spot(dockEnd[0], dockEnd[1], 'Go fishing', () => acts.start('fish'), WATER_Y + 0.8);

  // ---------- Telescopes ----------
  const scope = (x, z, y, face, eye = 1.6) => {
    k.cyl('wood', 0.04, 0.04, 1.3, 5, '#3a2a20', { x: x - 0.25, y: y + 0.6, z, rz: 0.3 });
    k.cyl('wood', 0.04, 0.04, 1.3, 5, '#3a2a20', { x: x + 0.25, y: y + 0.6, z, rz: -0.3 });
    k.cyl('metal', 0.09, 0.14, 1.3, 10, '#c8a860', { x, y: y + 1.35, z, rx: Math.PI / 2 - 0.4, ry: face });
    spot(x, z + 0.3, 'Look through the telescope', () => acts.start('scope', { x, z, y: y + eye }), y);
  };
  scope(128, 1174, T.heightAt(128, 1174), Math.PI, 50); // looks out from the lighthouse gallery
  const towerTop = world.groundAt(-760, -256, 1e4);
  scope(-760, -256, towerTop, Math.PI);

  // ---------- Sky lanterns ----------
  const table = (x, z) => {
    const y = T.heightAt(x, z);
    k.box('wood', 1.2, 0.08, 0.7, '#5a4432', { x, y: y + 0.8, z });
    k.box('wood', 0.08, 0.8, 0.08, '#3a2a20', { x, y: y + 0.4, z });
    for (let i = 0; i < 3; i++) k.box('glow', 0.25, 0.32, 0.25, '#ffb060', { x: x - 0.35 + i * 0.35, y: y + 1.0, z, bright: 1.2 });
    world.circle(x, z, 0.6, y - 1, y + 1);
    spot(x, z + 0.9, 'Release a sky lantern', () => releaseLantern(x, y + 1.2, z + 0.3));
  };
  table(13, 347);
  table(-856, 862);
  const lanternGeo = new THREE.CylinderGeometry(0.28, 0.2, 0.55, 8);
  const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.4, 0.5) });
  const lanterns = [];
  function releaseLantern(x, y, z, silent) {
    const m = new THREE.Mesh(lanternGeo, lanternMat);
    m.position.set(x, y, z);
    scene.add(m);
    lanterns.push({ m, vy: 1.2 + Math.random() * 0.6, ph: Math.random() * 10, top: 90 + Math.random() * 90, base: y });
    if (lanterns.length > 40) { const old = lanterns.shift(); scene.remove(old.m); }
    if (!silent) {
      c.data.lanterns = (c.data.lanterns || 0) + 1;
      c.audio.chime();
      c.whisper(['Up it goes, carrying a wish only you know.', 'The lantern floats away to join the stars.', 'Somewhere below, a goblin points and cheers.'][(Math.random() * 3) | 0]);
      c.save();
    }
  }
  // Lanterns you released before float over the overlook again
  for (let i = 0; i < Math.min(20, c.data.lanterns || 0); i++) {
    releaseLantern(13 + (Math.random() - 0.5) * 300, 60 + Math.random() * 100, 200 + (Math.random() - 0.5) * 300, true);
    lanterns[lanterns.length - 1].vy = 0;
  }

  // ---------- Snowmen ----------
  const snowSpots = [[72, -598], [150, -688], [-300, -610]];
  const snowmen = new Map();
  const buildSnowman = (i, instant) => {
    const [x, z] = snowSpots[i], y = T.heightAt(x, z);
    const sk = new Kit(mats);
    sk.sphere('plain', 0.8, '#e8ecff', { y: 0.7, ws: 12, hs: 10 });
    sk.sphere('plain', 0.58, '#e8ecff', { y: 1.8, ws: 12, hs: 10 });
    sk.sphere('plain', 0.42, '#e8ecff', { y: 2.6, ws: 12, hs: 10 });
    for (const s of [-1, 1]) {
      sk.sphere('plain', 0.06, '#111', { x: s * 0.14, y: 2.7, z: 0.37, ws: 5, hs: 4 });
      sk.cyl('wood', 0.03, 0.04, 1.1, 4, '#4a3020', { x: s * 0.85, y: 2.0, rz: s * -1.1 });
    }
    sk.cone('plain', 0.07, 0.4, 6, '#ff8a2a', { y: 2.6, z: 0.55, rx: Math.PI / 2 });
    sk.cyl('cloth', 0.5, 0.5, 0.04, 14, '#1e1a30', { y: 2.95 });
    sk.cone('cloth', 0.28, 0.7, 10, '#1e1a30', { y: 3.3, rx: -0.2 });
    sk.cyl('cloth', 0.44, 0.5, 0.18, 12, '#8a1f2a', { y: 2.2 });
    const g = sk.build();
    g.position.set(x, y - 0.1, z);
    g.rotation.y = Math.atan2(-x, 340 - z) * 0 + Math.PI * 0.9;
    scene.add(g);
    world.circle(x, z, 0.8, y - 1, y + 3);
    snowmen.set(i, g);
    if (!instant) { g.scale.setScalar(0.01); growing.push({ g, t: 0 }); }
  };
  const growing = [];
  (c.data.snowmen || []).forEach((i) => buildSnowman(i, true));
  snowSpots.forEach(([x, z], i) => {
    spots.push({ x, z: z + 1.8, y: T.heightAt(x, z), label: () => (snowmen.has(i) ? 'Admire your snowman' : 'Build a snowman'), act: () => {
      if (snowmen.has(i)) { c.whisper(['Your snowman looks very distinguished in that hat.', 'The snowman seems to be enjoying the view.', 'You could swear the snowman just winked.'][(Math.random() * 3) | 0]); return; }
      buildSnowman(i, false);
      c.data.snowmen = [...(c.data.snowmen || []), i];
      c.audio.thud(600, 0.3, 0.2); setTimeout(() => c.audio.thud(600, 0.3, 0.2), 400); setTimeout(() => c.audio.chime(), 900);
      c.whisper('Roll, roll, roll... and a witch’s hat on top. Perfect.');
      c.save();
    } });
  });

  // ---------- Rope swing over the Mirror Lake ----------
  let shoreX = -170;
  for (let x = -150; x > -280; x -= 1) if (T.heightAt(x, 205) > WATER_Y + 0.3) { shoreX = x; break; }
  const tx = shoreX - 2, ty = T.heightAt(tx, 205);
  k.cyl('wood', 0.55, 0.9, 11, 8, '#3d2f28', { x: tx, y: ty + 5, z: 205 });
  k.cyl('wood', 0.22, 0.4, 13, 6, '#3d2f28', { x: tx + 6, y: ty + 9.6, z: 205, rz: -1.42 });
  for (let i = 0; i < 7; i++) k.sphere('plain', 2 + Math.random(), i % 2 ? '#2c4a3a' : '#33523e', { x: tx + (Math.random() - 0.2) * 7, y: ty + 11 + Math.random() * 2, z: 205 + (Math.random() - 0.5) * 6, sy: 0.7, ws: 7, hs: 5 });
  world.circle(tx, 205, 0.9, ty - 2, ty + 12);
  world.noTrees(tx, 205, 8);
  const pivot = new THREE.Vector3(tx + 12, ty + 10, 205);
  const rope = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)), new THREE.LineBasicMaterial({ color: 0x8a7050 }));
  rope.frustumCulled = false;
  scene.add(rope);
  const setRope = (end) => { const p = rope.geometry.attributes.position; p.setXYZ(0, pivot.x, pivot.y, pivot.z); p.setXYZ(1, end.x, end.y, end.z); p.needsUpdate = true; };
  setRope(new THREE.Vector3(pivot.x, pivot.y - 7.5, pivot.z));
  spot(tx + 4, 205, 'Grab the rope swing', () => acts.start('swing'));

  scene.add(k.build());

  // ================= The activities =================
  const player = c.player;
  acts.extra.sleep = (o) => {
    let time = 0, stage = 0, zzz = 0;
    const start = new THREE.Vector3();
    player.frozen = true; player.pose = 'lie';
    player.pos.set(o.x, o.y ?? T.heightAt(o.x, o.z), o.z); player.facing = o.rot;
    c.audio.playMusic('lullaby');
    c.whisper('You lie down and close your eyes...', 3);
    return {
      stopLabel: 'Wake up',
      update: (dt) => {
        time += dt; zzz -= dt;
        if (zzz <= 0) { zzz = 0.9; c.particles.sparkle(player.pos.x, player.pos.y + 1, player.pos.z, 0.3, 0.8, 0, [1.4, 1.4, 2.2], 2.5); }
        if (stage === 0 && time > 3) { stage = 1; c.fade(1); }
        if (stage === 1 && time > 4.5) { stage = 2; c.fade(0); c.whisper(DREAMS[(Math.random() * DREAMS.length) | 0], 9); c.stars(12); }
        if (stage === 2 && time > 14) { stage = 3; c.fade(1); }
        if (stage === 3 && time > 15.5) { acts.stop(); }
        c.hud(stage >= 2 ? 'Dreaming...' : 'Sleeping... zzz');
      },
      cam: (cam, dt) => {
        if (stage < 2) { player.updateCamera(cam, dt); start.copy(cam.position); return; }
        const f = Math.min(1, (time - 4.5) / 9.5);
        cam.position.copy(start).addScaledVector(moonDir, 40 + f * 300);
        cam.position.y += f * 60;
        cam.lookAt(cam.position.clone().addScaledVector(moonDir, 100));
      },
      cleanup: () => {
        player.pose = null; c.fade(0);
        player.rested = 180;
        player._cam = null;
        const when = c.skipTime();
        c.banner('Well rested', 'You slept until ' + when + '. For a while your cloak catches more air, so you glide further.', 'You wake up');
      },
    };
  };

  acts.extra.sit = (o) => {
    let time = 0, thoughtT = 2, ang = 0;
    player.frozen = true; player.pose = 'sit';
    player.pos.set(o.x, o.y, o.z); player.facing = o.face;
    return {
      stopLabel: 'Stand up',
      update: (dt) => {
        time += dt; thoughtT -= dt; ang += dt * 0.05;
        if (thoughtT <= 0) { thoughtT = 12; c.whisper(THOUGHTS[(Math.random() * THOUGHTS.length) | 0], 6); }
        c.hud('Sitting quietly');
      },
      cam: (cam) => {
        const a = o.face + Math.PI + Math.sin(ang) * 0.6;
        cam.position.set(o.x + Math.sin(a) * 5.5, o.y + 2.2, o.z + Math.cos(a) * 5.5);
        cam.lookAt(o.x + Math.sin(o.face) * 30, o.y + 3, o.z + Math.cos(o.face) * 30);
      },
      cleanup: () => { player.pose = null; player._cam = null; player.pos.set(o.x + Math.sin(o.face) * 1, o.y - 0.5, o.z + Math.cos(o.face) * 1); },
    };
  };

  const bobber = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.6, 0.4) }));
  const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)), new THREE.LineBasicMaterial({ color: 0xcfd4ff, transparent: true, opacity: 0.6 }));
  line.frustumCulled = false;
  const fishMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  fishMesh.scale.set(0.6, 0.6, 1.4);
  acts.extra.fish = () => {
    const face = Math.atan2(dockDir[0], dockDir[1]);
    player.frozen = true; player.pose = 'sit';
    player.pos.set(dockEnd[0], WATER_Y + 1.2, dockEnd[1]); player.facing = face;
    const bx = dockEnd[0] + dockDir[0] * 8, bz = dockEnd[1] + dockDir[1] * 8;
    bobber.position.set(bx, WATER_Y + 0.05, bz);
    scene.add(bobber, line); scene.remove(fishMesh);
    let wait = 3 + Math.random() * 5, bite = 0, jump = -1, caught = null;
    const tip = new THREE.Vector3();
    c.audio.whoosh(0.08);
    return {
      stopLabel: 'Stop fishing',
      onAction: () => {
        if (bite > 0) {
          const r = Math.random();
          const idx = r < 0.3 ? 0 : r < 0.52 ? 1 : r < 0.7 ? 2 : r < 0.85 ? 3 : r < 0.96 ? 4 : 5;
          caught = FISH[idx];
          fishMesh.material.color.setRGB(...caught[2]);
          scene.add(fishMesh); jump = 0; bite = 0;
          const set = new Set(c.data.fish || []); const isNew = !set.has(idx); set.add(idx); c.data.fish = [...set];
          c.audio.fanfare();
          c.banner(caught[0], caught[1] + ' You let it swim home.', isNew ? 'New fish! You caught' : 'You caught');
          c.burst(bx, WATER_Y + 0.3, bz, [caught[2]], 30, 3, 1.5, 1.2);
          c.save();
          return true;
        }
        return false; // stop fishing
      },
      update: (dt, t) => {
        tip.set(player.pos.x + Math.sin(face) * 1.4, player.pos.y + 2.2, player.pos.z + Math.cos(face) * 1.4);
        const lp = line.geometry.attributes.position;
        lp.setXYZ(0, tip.x, tip.y, tip.z); lp.setXYZ(1, bobber.position.x, bobber.position.y, bobber.position.z); lp.needsUpdate = true;
        if (jump >= 0) {
          jump += dt;
          fishMesh.position.set(bx, WATER_Y + Math.sin(Math.min(1, jump) * Math.PI) * 2.2, bz + (jump - 0.5) * 1.5);
          fishMesh.rotation.x = jump * 5;
          if (jump > 1.1) { scene.remove(fishMesh); jump = -1; wait = 4 + Math.random() * 6; c.audio.thud(500, 0.3, 0.15); }
          c.hud('Caught one!');
          return;
        }
        if (bite > 0) {
          bite -= dt;
          bobber.position.y = WATER_Y - 0.15 + Math.sin(t * 30) * 0.1;
          c.hud('Something bites! Press E!');
          if (bite <= 0) { wait = 3 + Math.random() * 5; c.whisper('It got away! Fish are slippery.', 2.5); }
          return;
        }
        bobber.position.y = WATER_Y + 0.05 + Math.sin(t * 2) * 0.04;
        wait -= dt;
        if (wait <= 0) { bite = 1.6; c.audio.ding(); c.burst(bx, WATER_Y, bz, [[0.6, 0.8, 1.6]], 12, 1.5, 0.8, 0.8); }
        c.hud(`Fishing · ${(c.data.fish || []).length} of ${FISH.length} kinds caught`);
      },
      cleanup: () => { player.pose = null; scene.remove(bobber, line, fishMesh); player.pos.set(dockEnd[0] - dockDir[0] * 1.5, WATER_Y + 0.8, dockEnd[1] - dockDir[1] * 1.5); },
    };
  };

  acts.extra.scope = (o) => {
    const views = [
      ['The moon', () => c.camera.position.clone().addScaledVector(moonDir, 1000)],
      ['Vessryn the moon dragon', () => getDragon().position.clone()],
      ['The Moon Queen’s castle', () => new THREE.Vector3(-1260, 75, 1265)],
      ['Castle Vaelmoor', () => new THREE.Vector3(-380, 205, -562)],
      ['Emberlight Village', () => new THREE.Vector3(0, 32, 40)],
      ['The Moonspire', () => new THREE.Vector3(180, 330, -820)],
    ];
    let i = 0, t = 0;
    const cur = new THREE.Vector3();
    player.frozen = true;
    c.audio.whoosh(0.06);
    const show = () => c.hud('Telescope: ' + views[i][0] + '  (E for the next view)');
    show();
    return {
      stopLabel: 'Next view',
      onAction: () => { i++; t = 0; if (i >= views.length) return false; show(); c.audio.ding(); return true; },
      update: (dt) => { t += dt; if (t > 7) { t = 0; i = (i + 1) % views.length; show(); } },
      cam: (cam, dt) => {
        const target = views[i][1]();
        if (t < 0.05) cur.copy(target); else cur.lerp(target, 1 - Math.exp(-dt * 6));
        cam.position.set(o.x, o.y, o.z);
        cam.lookAt(cur);
        const want = i === 0 ? 4 : 9;
        cam.fov += (want - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix();
      },
      cleanup: () => { player._cam = null; c.resetFov(); },
    };
  };

  acts.extra.swing = () => {
    let t = 0, released = false;
    const L = 7.5, dir = new THREE.Vector3(1, 0, 0);
    player.frozen = true; player.pose = 'swing';
    const pos = () => {
      const th = Math.sin(t * 1.15) * 1.0;
      return { th, p: new THREE.Vector3(pivot.x + Math.sin(th) * L, pivot.y - Math.cos(th) * L - 1.8, pivot.z) };
    };
    c.whisper('Wheee! Press E at the top of the swing to let go.', 3);
    return {
      stopLabel: 'Let go!',
      onAction: () => {
        const { th } = pos();
        const w = Math.cos(t * 1.15) * 1.15 * 1.0; // angular speed
        player.vel.set(Math.cos(th) * w * L * 1.4 + 6, Math.max(0, Math.sin(th) * w * L) + 6, 0);
        released = true; player.flung = 2;
        return false;
      },
      update: (dt) => {
        t += dt;
        const { th, p } = pos();
        player.pos.copy(p); player.facing = Math.PI / 2; player.poseAngle = th * 0.6;
        setRope(new THREE.Vector3(p.x, p.y + 2.2, p.z));
        c.hud('Swinging over the Mirror Lake');
      },
      cleanup: () => {
        player.pose = null;
        setRope(new THREE.Vector3(pivot.x, pivot.y - L, pivot.z));
        if (released) { player.grounded = false; c.audio.whoosh(0.2); player.splashNext = true; } else player.vel.set(0, 0, 0);
        void dir;
      },
    };
  };

  acts.cozyUpdate = (dt, t) => {
    for (const l of lanterns) {
      l.ph += dt;
      if (l.m.position.y < l.base + l.top) l.m.position.y += l.vy * dt;
      l.m.position.x += Math.sin(l.ph * 0.3) * 0.4 * dt + 0.3 * dt;
      l.m.position.z += Math.cos(l.ph * 0.25) * 0.4 * dt;
      l.m.rotation.y += dt * 0.3;
    }
    for (let i = growing.length - 1; i >= 0; i--) {
      const g = growing[i]; g.t += dt;
      g.g.scale.setScalar(Math.min(1, g.t / 1.5) * (1 + Math.sin(Math.min(1, g.t / 1.5) * Math.PI) * 0.15));
      if (g.t > 1.5) { g.g.scale.setScalar(1); growing.splice(i, 1); }
    }
    void t;
  };
  return spots;
}
