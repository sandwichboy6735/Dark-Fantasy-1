import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, cylGeo, glow, mat } from '../retro/materials.jsx';
import { bangButton, store } from '../store.js';
import { spendBanger } from '../game/quest.js';
import { live } from '../game/live.js';
import { sfx } from '../game/audio.js';
import { groundAt } from './layout.js';

const GRAVITY = 14;
const THROW_SPEED = 11;
const FUSE = 0.7; // seconds on the ground before it goes off
const LURE_SECONDS = 5;

const paper = mat({ color: '#b02020' });
const spark = glow('#ffe070');
const sparkHot = glow('#ffffff');

// Goblin bangers: throw one and, a moment after it lands, BANG. The Eye's
// searchlights swing over to the noise and Watchers go to look.
export function Bangers() {
  const camera = useThree((s) => s.camera);
  const shell = useRef();
  const flash = useRef();
  const burst = useRef();
  const light = useRef();
  const state = useRef({ flying: false, landed: 0, boomAt: -10, pos: new THREE.Vector3(), vel: new THREE.Vector3() });
  const dir = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onThrow = () => {
      const s = state.current;
      if (!store.get().playing || s.flying) return;
      if (!spendBanger()) return;
      camera.getWorldDirection(dir);
      s.pos.copy(camera.position).addScaledVector(dir, 0.6);
      s.pos.y -= 0.2;
      s.vel.copy(dir).multiplyScalar(THROW_SPEED);
      s.vel.y += 3.5;
      s.flying = true;
      s.landed = 0;
      sfx.throw();
    };
    bangButton.addEventListener('press', onThrow);
    return () => bangButton.removeEventListener('press', onThrow);
  }, [camera, dir]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = state.current;
    const now = clock.elapsedTime;

    if (s.flying) {
      if (s.landed === 0) {
        s.vel.y -= GRAVITY * dt;
        s.pos.addScaledVector(s.vel, dt);
        const ground = groundAt(s.pos.x, s.pos.z);
        if (ground !== null && s.pos.y <= ground + 0.08) {
          s.pos.y = ground + 0.08;
          s.landed = now;
          sfx.fuse();
        } else if (s.pos.y < -30) {
          s.flying = false; // lost to the abyss
        }
      } else if (now - s.landed > FUSE) {
        s.flying = false;
        s.boomAt = now;
        live.lure = { x: s.pos.x, z: s.pos.z, time: now, duration: LURE_SECONDS };
        live.shake = Math.max(live.shake, 0.35);
        sfx.bang();
      }
    }

    shell.current.visible = s.flying;
    shell.current.position.copy(s.pos);
    shell.current.rotation.set(now * 9, now * 7, 0);
    shell.current.children[1].visible = Math.sin(now * 40) > 0;

    // The bang: a white flash, a ring of sparks and a burst of light.
    const age = now - s.boomAt;
    const on = age < 0.6;
    flash.current.visible = on;
    burst.current.visible = on;
    light.current.intensity = on ? 120 * (1 - age / 0.6) : 0;
    if (on) {
      flash.current.position.copy(s.pos);
      flash.current.scale.setScalar(0.5 + age * 6);
      burst.current.position.copy(s.pos);
      burst.current.scale.setScalar(0.3 + age * 9);
      burst.current.rotation.y = age * 4;
      light.current.position.set(s.pos.x, s.pos.y + 1, s.pos.z);
    }
  });

  return (
    <>
      <group ref={shell} visible={false}>
        <mesh geometry={cylGeo(0.07, 0.07, 0.28, 6)} material={paper} />
        <Box size={[0.1, 0.1, 0.1]} m={spark} position={[0, 0.2, 0]} />
      </group>
      <group ref={flash} visible={false}>
        <Box size={[0.6, 0.6, 0.6]} m={sparkHot} />
      </group>
      <group ref={burst} visible={false}>
        {Array.from({ length: 10 }, (_, i) => (
          <Box key={i} size={[0.08, 0.08, 0.08]} m={i % 2 ? spark : sparkHot} position={[Math.sin(i * 0.63) * 0.5, Math.cos(i * 1.7) * 0.25 + 0.2, Math.cos(i * 0.63) * 0.5]} />
        ))}
      </group>
      {/* Always present, dark until a bang, so the scene's light count never changes. */}
      <pointLight ref={light} color="#ffd070" intensity={0} distance={16} decay={1.5} />
    </>
  );
}
