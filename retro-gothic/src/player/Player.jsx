import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { store } from '../store.js';
import { BELLS, collectBell } from '../game/quest.js';
import { setAmbience } from '../game/audio.js';
import { IS_TOUCH, input } from './input.js';
import { SPAWNS, boxColliders, circleColliders, dynamicColliders, groundAt, zoneAt } from '../world/layout.js';

const EYE_HEIGHT = 1.62;
const RADIUS = 0.35;
const WALK_SPEED = 4.2;
const RUN_SPEED = 7.5;
const MAX_STEP = 0.6;
const TALK_RANGE = 9;
const CENTER = new THREE.Vector2(0, 0);
const LOOK_SPEED = 0.0022; // radians per pixel of mouse or drag
const MAX_PITCH = Math.PI / 2 - 0.05;

function readSpawn() {
  const params = new URLSearchParams(window.location.search);
  const spawn = SPAWNS[params.get('spawn')] ?? SPAWNS.court;
  const look = params.get('look')?.split(',').map(Number);
  const [yaw, pitch] = look?.length === 2 && look.every(Number.isFinite) ? look : [spawn.yaw, spawn.pitch];
  return { position: spawn.position, yaw: THREE.MathUtils.degToRad(yaw), pitch: THREE.MathUtils.degToRad(pitch) };
}

// True if the player can't stand at (x, z) coming from (fromX, fromZ) at height fromY.
function blocked(x, z, fromX, fromZ, fromY) {
  const ground = groundAt(x, z);
  if (ground === null || Math.abs(ground - fromY) > MAX_STEP) return true;
  for (const b of boxColliders) {
    if (x > b.minX - RADIUS && x < b.maxX + RADIUS && z > b.minZ - RADIUS && z < b.maxZ + RADIUS) return true;
  }
  for (const c of circleColliders) {
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

export function Player() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const [, getKeys] = useKeyboardControls();
  const spawn = useMemo(readSpawn, []);
  const body = useRef({ x: spawn.position[0], z: spawn.position[2], ground: spawn.position[1], y: spawn.position[1] + EYE_HEIGHT, bob: 0, lastHit: 0 });
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

    const { playing } = store.get();

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
    if (playing) {
      const { forward: f, back, left, right, run: shift } = getKeys();
      const ahead = THREE.MathUtils.clamp((f ? 1 : 0) - (back ? 1 : 0) - input.moveY, -1, 1);
      const side = THREE.MathUtils.clamp((right ? 1 : 0) - (left ? 1 : 0) + input.moveX, -1, 1);
      const run = shift || Math.hypot(input.moveX, input.moveY) > 0.9;
      if (Math.abs(ahead) > 0.05 || Math.abs(side) > 0.05) {
        // Heading from the camera's yaw alone, so looking straight up or down still walks.
        const yaw = look.setFromQuaternion(camera.quaternion, 'YXZ').y;
        const fx = -Math.sin(yaw);
        const fz = -Math.cos(yaw);
        const len = Math.hypot(ahead, side);
        const step = ((run ? RUN_SPEED : WALK_SPEED) * dt * Math.min(1, len)) / len;
        const dx = (fx * ahead - fz * side) * step;
        const dz = (fz * ahead + fx * side) * step;
        // Try each axis separately so you slide along walls instead of sticking.
        if (!blocked(b.x + dx, b.z, b.x, b.z, b.ground)) b.x += dx;
        if (!blocked(b.x, b.z + dz, b.x, b.z, b.ground)) b.z += dz;
        b.ground = groundAt(b.x, b.z) ?? b.ground;
        b.bob += dt * (run ? 13 : 9);
        moving = true;
      }
    }

    // Ease up and down the steps, with a small head bob.
    b.y += (b.ground + EYE_HEIGHT - b.y) * Math.min(1, dt * 14);
    const bob = moving ? Math.sin(b.bob) * 0.035 : 0;
    camera.position.set(b.x, b.y + bob, b.z);

    // Ray from the centre of the screen: the first thing it hits decides who you're looking at.
    raycaster.setFromCamera(CENTER, camera);
    raycaster.far = TALK_RANGE;
    const hit = playing ? raycaster.intersectObjects(scene.children, true)[0] : null;
    const found = hit ? interactableOf(hit.object) : null;
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

    // Walk through a golden bell to pick it up.
    const { bells } = store.get();
    for (const bell of BELLS) {
      if (!bells.includes(bell.id) && Math.hypot(bell.x - b.x, bell.z - b.z) < 1.3 && Math.abs(bell.y - 0.9 - b.ground) < 1.5) collectBell(bell.id);
    }

    // The drone fades into the goblins' jig as you cross into the tavern yard.
    setAmbience(THREE.MathUtils.clamp((b.x - 8) / 10, 0, 1), playing);
  });

  // PointerLockControls only locks the pointer: pointerSpeed 0 leaves turning to the
  // overlay's mouse handler, which filters out Chrome's occasional post-lock jumps.
  // Touch screens have no pointer lock; the overlay starts those games itself.
  return <PointerLockControls selector={IS_TOUCH ? '#no-pointer-lock' : '#enter'} pointerSpeed={0} onLock={onLock} onUnlock={onUnlock} />;
}
