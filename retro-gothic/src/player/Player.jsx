import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { store } from '../store.js';
import { SPAWNS, boxColliders, circleColliders, dynamicColliders, groundAt, zoneAt } from '../world/layout.js';

const EYE_HEIGHT = 1.62;
const RADIUS = 0.35;
const WALK_SPEED = 4.2;
const RUN_SPEED = 7.5;
const MAX_STEP = 0.6;
const TALK_RANGE = 9;
const CENTER = new THREE.Vector2(0, 0);

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
  const controls = useRef();
  const spawn = useMemo(readSpawn, []);
  const body = useRef({ x: spawn.position[0], z: spawn.position[2], ground: spawn.position[1], y: spawn.position[1] + EYE_HEIGHT, bob: 0, lastHit: 0 });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const look = useMemo(() => new THREE.Euler(), []);

  useEffect(() => {
    camera.rotation.set(spawn.pitch, spawn.yaw, 0, 'YXZ');
    camera.position.set(body.current.x, body.current.y, body.current.z);
  }, [camera, spawn]);

  const onLock = useCallback(() => store.set({ locked: true }), []);
  const onUnlock = useCallback(() => store.set({ locked: false }), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const b = body.current;

    // WASD relative to where the camera faces, flattened onto the ground.
    let moving = false;
    if (controls.current?.isLocked) {
      const { forward: f, back, left, right, run } = getKeys();
      const ahead = (f ? 1 : 0) - (back ? 1 : 0);
      const side = (right ? 1 : 0) - (left ? 1 : 0);
      if (ahead || side) {
        // Heading from the camera's yaw alone, so looking straight up or down still walks.
        const yaw = look.setFromQuaternion(camera.quaternion, 'YXZ').y;
        const fx = -Math.sin(yaw);
        const fz = -Math.cos(yaw);
        const len = Math.hypot(ahead, side);
        const step = ((run ? RUN_SPEED : WALK_SPEED) * dt) / len;
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
    const hit = raycaster.intersectObjects(scene.children, true)[0];
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
  });

  return <PointerLockControls ref={controls} selector="#enter" onLock={onLock} onUnlock={onUnlock} />;
}
