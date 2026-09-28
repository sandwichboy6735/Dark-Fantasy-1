import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { store } from '../store.js';
import { objectiveTarget, saveGame, caught, difficulty, endConversation } from '../game/quest.js';
import { setDanger, sfx } from '../game/audio.js';
import { live } from '../game/live.js';
import { IS_TOUCH, input } from './input.js';
import { activeColliders, dynamicColliders, groundAt, setActiveChapter, spawnsOf, zoneAt } from '../world/layout.js';
import { rulesFor } from '../chapters/registry.js';

const EYE_HEIGHT = 1.62;
const SNEAK_EYE_HEIGHT = 1.1;
const SNEAK_SPEED = 2.3;
const RADIUS = 0.35;
const WALK_SPEED = 4.2;
const RUN_SPEED = 7.5;
const MAX_STEP = 0.6;
const TALK_RANGE = 9;
const CENTER = new THREE.Vector2(0, 0);
const LOOK_SPEED = 0.0022; // radians per pixel of mouse or drag
const MAX_PITCH = Math.PI / 2 - 0.05;
const PROXIMITY_REACH = 4;
const PROXIMITY_ANGLE = (55 * Math.PI) / 180;
const FALL_SECONDS = 1.4;
const spot = new THREE.Vector3();

// Where to start in a chapter: its default spawn, or `?spawn=name&look=yaw,pitch`
// the first time the game loads.
function readSpawn(chapter, fromUrl) {
  const spawns = spawnsOf(chapter);
  const rules = rulesFor(chapter);
  const params = new URLSearchParams(fromUrl ? window.location.search : '');
  const spawn = spawns[params.get('spawn')] ?? spawns[rules.defaultSpawn];
  const look = params.get('look')?.split(',').map(Number);
  const [yaw, pitch] = look?.length === 2 && look.every(Number.isFinite) ? look : [spawn.yaw, spawn.pitch];
  return { position: spawn.position, yaw: THREE.MathUtils.degToRad(yaw), pitch: THREE.MathUtils.degToRad(pitch) };
}

// True if the player can't stand at (x, z) coming from (fromX, fromZ) at height fromY.
function blocked(x, z, fromX, fromZ, fromY) {
  const ground = groundAt(x, z, fromY);
  if (ground === null || Math.abs(ground - fromY) > MAX_STEP) return true;
  const { boxes, circles } = activeColliders();
  for (const b of boxes) {
    if (b.y1 !== undefined && (fromY < b.y0 || fromY > b.y1)) continue;
    if (x > b.minX - RADIUS && x < b.maxX + RADIUS && z > b.minZ - RADIUS && z < b.maxZ + RADIUS) return true;
  }
  for (const c of circles) {
    if (c.y1 !== undefined && (fromY < c.y0 || fromY > c.y1)) continue;
    if (Math.hypot(x - c.x, z - c.z) < c.r + RADIUS) return true;
  }
  for (const { object, radius } of dynamicColliders) {
    const p = object.position;
    if (Math.abs(p.y - fromY) > 1.5) continue;
    const next = Math.hypot(x - p.x, z - p.z);
    // Something that walked into you only stops you moving further in.
    if (next < radius + RADIUS && next < Math.hypot(fromX - p.x, fromZ - p.z)) return true;
  }
  return false;
}

// Walk up the target's parents to the character it belongs to.
function interactableOf(object) {
  for (let o = object; o; o = o.parent) if (o.userData.interact) return o.userData.interact;
  return null;
}

// First-person body shared by every chapter: looking, walking, climbing steps,
// talking, being caught and waking up. What the world does to you (gazes, floods,
// cold, wind) comes from the current chapter's rules in chapters/*/rules.js.
export function Player() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const [, getKeys] = useKeyboardControls();
  const spawn = useMemo(() => readSpawn(store.get().chapter, true), []);
  const body = useRef({
    chapter: store.get().chapter,
    x: spawn.position[0],
    z: spawn.position[2],
    ground: spawn.position[1],
    y: spawn.position[1] + EYE_HEIGHT,
    bob: 0,
    lastHit: 0,
    wake: rulesFor(store.get().chapter).wake,
    heartbeat: 0,
    saveTimer: 0,
    stride: 0,
    falling: null,
    fallSpeed: 0,
    debrisTimer: 0,
    eye: EYE_HEIGHT,
    scanAt: -10,
    interactables: [],
  });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const look = useMemo(() => new THREE.Euler(), []);

  useEffect(() => {
    camera.rotation.set(spawn.pitch, spawn.yaw, 0, 'YXZ');
    camera.position.set(body.current.x, body.current.y, body.current.z);
  }, [camera, spawn]);

  const onLock = useCallback(() => store.set({ playing: true, mode: 'lock' }), []);
  const onUnlock = useCallback(() => store.get().mode === 'lock' && store.set({ playing: false }), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const b = body.current;

    const { playing, chapter } = store.get();
    live.now = clock.elapsedTime;
    if (playing) live.gameTime += dt;
    setActiveChapter(chapter);
    const level = difficulty();

    // Wake somewhere, facing `yaw`, after being caught or falling.
    const wakeAt = (point, yaw = 0) => {
      b.x = point.x;
      b.z = point.z;
      b.ground = point.y;
      b.y = point.y + EYE_HEIGHT;
      b.falling = null;
      live.fade = 1;
      camera.quaternion.setFromEuler(look.set(0, yaw, 0, 'YXZ'));
    };

    // Off to another chapter: start at its landing.
    if (b.chapter !== chapter) {
      rulesFor(b.chapter).leave?.();
      b.chapter = chapter;
      const start = readSpawn(chapter, false);
      wakeAt({ x: start.position[0], z: start.position[2], y: start.position[1] }, start.yaw);
      b.wake = rulesFor(chapter).wake;
      b.scanAt = -10;
      live.push = null;
      live.dread = 0;
      live.hunted = 0;
      live.huntersThisFrame = 0;
      live.status = null;
    }
    // Tests (and the console in development) can move you: live.teleport = { x, y, z, yaw }.
    if (live.teleport) {
      wakeAt(live.teleport, live.teleport.yaw ?? 0);
      live.teleport = null;
    }
    const rules = rulesFor(chapter);
    const ctx = { b, dt, playing, level, camera, wakeAt, running: false, moving: false };

    rules.before?.(ctx);
    if (b.falling) {
      b.fallSpeed += 22 * dt;
      b.y -= b.fallSpeed * dt;
      camera.position.set(b.x, b.y, b.z);
      if (live.gameTime - b.falling > FALL_SECONDS) rules.fell(ctx);
      return;
    }

    // Mouse, drag and touch look all arrive through `input`.
    if (playing && (input.lookX || input.lookY)) {
      look.setFromQuaternion(camera.quaternion, 'YXZ');
      look.y -= input.lookX * LOOK_SPEED;
      look.x = THREE.MathUtils.clamp(look.x - input.lookY * LOOK_SPEED, -MAX_PITCH, MAX_PITCH);
      look.z = 0;
      camera.quaternion.setFromEuler(look);
    }
    input.lookX = 0;
    input.lookY = 0;

    // WASD (or the touch stick) relative to where the camera faces, flattened onto the ground.
    let moving = false;
    let running = false;
    const keys = getKeys();
    live.sneaking = playing && rules.canSneak(ctx) && (keys.sneak || input.sneak);
    live.touch = store.get().mode === 'touch';
    if (playing) {
      const { forward: f, back, left, right, run: shift } = keys;
      const ahead = THREE.MathUtils.clamp((f ? 1 : 0) - (back ? 1 : 0) - input.moveY, -1, 1);
      const side = THREE.MathUtils.clamp((right ? 1 : 0) - (left ? 1 : 0) + input.moveX, -1, 1);
      const run = !live.sneaking && (shift || Math.hypot(input.moveX, input.moveY) > 0.9);
      if (Math.abs(ahead) > 0.05 || Math.abs(side) > 0.05) {
        // Heading from the camera's yaw alone, so looking straight up or down still walks.
        const yaw = look.setFromQuaternion(camera.quaternion, 'YXZ').y;
        const fx = -Math.sin(yaw);
        const fz = -Math.cos(yaw);
        const len = Math.hypot(ahead, side);
        const stunned = live.gameTime < live.stunUntil ? 0.35 : 1;
        const speeds = rules.pace(ctx) ?? {};
        const pace = live.sneaking ? speeds.sneak ?? SNEAK_SPEED : run ? speeds.run ?? RUN_SPEED : speeds.walk ?? WALK_SPEED;
        const step = (pace * stunned * dt * Math.min(1, len)) / len;
        let dx = (fx * ahead - fz * side) * step;
        let dz = (fz * ahead + fx * side) * step;
        // Some ground (a winding stair) bends your path to follow it, and when you're
        // heading forwards the view turns with it.
        if (rules.steer) {
          const [sx, sz] = rules.steer(b, dx, dz);
          if (ahead > 0.3 && (sx !== dx || sz !== dz)) {
            const turn = Math.atan2(-sx, -sz) - Math.atan2(-dx, -dz);
            look.setFromQuaternion(camera.quaternion, 'YXZ');
            look.y += THREE.MathUtils.clamp(Math.atan2(Math.sin(turn), Math.cos(turn)), -2.4 * dt, 2.4 * dt);
            camera.quaternion.setFromEuler(look);
          }
          dx = sx;
          dz = sz;
        }
        // Try each axis separately so you slide along walls instead of sticking.
        if (!blocked(b.x + dx, b.z, b.x, b.z, b.ground)) b.x += dx;
        if (!blocked(b.x, b.z + dz, b.x, b.z, b.ground)) b.z += dz;
        b.ground = groundAt(b.x, b.z, b.ground) ?? b.ground;
        b.bob += dt * (run ? 13 : 9);
        moving = true;
        running = run;
      }
    }

    // Something shoving you (a gust of wind). Pushed over an edge, you fall.
    if (playing && live.push) {
      const nx = b.x + live.push.x * dt;
      const nz = b.z + live.push.z * dt;
      if (groundAt(nx, nz, b.ground) === null && rules.canFall) {
        b.x = nx;
        b.z = nz;
        b.falling = live.gameTime;
        b.fallSpeed = 2;
        live.push = null;
        sfx.scream();
        return;
      }
      if (!blocked(nx, b.z, b.x, b.z, b.ground)) b.x = nx;
      if (!blocked(b.x, nz, b.x, b.z, b.ground)) b.z = nz;
      b.ground = groundAt(b.x, b.z, b.ground) ?? b.ground;
    }
    ctx.moving = moving;
    ctx.running = running;

    // Footsteps on every stride: soft thuds on dirt, clicks on stone, splashes in water.
    if (moving && Math.floor(b.bob / Math.PI) !== b.stride) {
      b.stride = Math.floor(b.bob / Math.PI);
      if (!live.sneaking) sfx.step(rules.surface(b));
    }

    // Ease up and down the steps (and down into a crouch), with a small head bob and any shake.
    b.eye += ((live.sneaking ? SNEAK_EYE_HEIGHT : EYE_HEIGHT) - b.eye) * Math.min(1, dt * 10);
    b.y += (b.ground + b.eye - b.y) * Math.min(1, dt * 14);
    const bob = moving ? Math.sin(b.bob) * 0.035 : 0;
    const shake = live.shake * 0.12;
    camera.position.set(b.x + (Math.random() - 0.5) * shake, b.y + bob + (Math.random() - 0.5) * shake, b.z + (Math.random() - 0.5) * shake);
    live.shake = Math.max(0, live.shake - dt * 1.6);

    // Ray from the centre of the screen: the first thing it hits decides who you're looking at.
    raycaster.setFromCamera(CENTER, camera);
    raycaster.far = TALK_RANGE;
    const hit = playing ? raycaster.intersectObjects(scene.children, true)[0] : null;
    let found = hit ? interactableOf(hit.object) : null;
    // Some things (cats, the bell) only answer when you're close.
    if (found?.range && hit.distance > found.range) found = null;

    // No need to aim precisely: anyone close and roughly in front of you counts.
    if (live.now - b.scanAt > 1) {
      b.scanAt = live.now;
      b.interactables = [];
      scene.traverse((o) => o.userData.interact && b.interactables.push(o));
    }
    const yawNow = look.setFromQuaternion(camera.quaternion, 'YXZ').y;
    let nearest = null;
    for (const o of b.interactables) {
      if (!o.parent) continue;
      o.getWorldPosition(spot);
      const dx = spot.x - b.x;
      const dz = spot.z - b.z;
      const d = Math.hypot(dx, dz);
      const facing = Math.abs(Math.atan2(Math.sin(Math.atan2(-dx, -dz) - yawNow), Math.cos(Math.atan2(-dx, -dz) - yawNow)));
      const reach = Math.min(PROXIMITY_REACH, o.userData.interact.range ?? PROXIMITY_REACH);
      if (d < reach && facing < PROXIMITY_ANGLE && Math.abs(spot.y - b.ground) < 4 && (!nearest || d < nearest.d)) nearest = { o, d };
    }
    if (!found && playing && nearest) found = nearest.o.userData.interact;

    // Walk away from a conversation and it ends.
    const talking = store.get().talking;
    if (talking) {
      const partner = b.interactables.find((o) => o.userData.interact.id === talking.id);
      if (!partner?.parent || partner.getWorldPosition(spot).distanceTo(camera.position) > TALK_RANGE) endConversation();
    }
    const now = clock.elapsedTime;
    const current = store.get().target;
    if (found) {
      b.lastHit = now;
      if (found !== current) store.set({ target: found });
    } else if (current && now - b.lastHit > 0.3) {
      store.set({ target: null });
    }

    const zone = zoneAt(b.x, b.z);
    if (zone !== store.get().zone) store.set({ zone });

    if (playing) {
      live.playTime += dt;
      b.saveTimer += dt;
      if (b.saveTimer > 10) {
        b.saveTimer = 0;
        saveGame();
      }
    }

    rules.after(ctx);

    live.player.x = b.x;
    live.player.y = b.ground;
    live.player.z = b.z;
    live.player.safe = live.safe;
    live.player.yaw = look.setFromQuaternion(camera.quaternion, 'YXZ').y;
    if (live.dread >= 1 || live.caughtBy) {
      // Seen or grabbed. Black out and wake by the last light you sheltered in.
      const by = live.caughtBy ?? 'gaze';
      live.dread = 0;
      live.caughtBy = null;
      live.resetWatchers += 1;
      wakeAt(b.wake, b.wake.yaw ?? 0);
      caught(by);
    }
    setDanger(playing ? Math.max(live.hunted > 0 ? 1 : 0, rules.danger(ctx), live.dread) : 0);
    live.fade = Math.max(0, live.fade - dt * 0.8);
    live.running = running;

    // The objective arrow: where the next goal is, relative to where you face.
    const goal = objectiveTarget(store.get(), b.x, b.z);
    if (goal) {
      const yaw = look.setFromQuaternion(camera.quaternion, 'YXZ').y;
      const toward = Math.atan2(-(goal.x - b.x), -(goal.z - b.z));
      live.marker = { angle: Math.atan2(Math.sin(toward - yaw), Math.cos(toward - yaw)), distance: Math.hypot(goal.x - b.x, goal.z - b.z) };
    } else {
      live.marker = null;
    }

    rules.ambience(b, playing);
  });

  // PointerLockControls only locks the pointer: pointerSpeed 0 leaves turning to the
  // overlay's mouse handler, which filters out Chrome's occasional post-lock jumps.
  // Touch screens have no pointer lock; the overlay starts those games itself.
  return <PointerLockControls selector={IS_TOUCH ? '#no-pointer-lock' : '#enter'} pointerSpeed={0} onLock={onLock} onUnlock={onUnlock} />;
}
