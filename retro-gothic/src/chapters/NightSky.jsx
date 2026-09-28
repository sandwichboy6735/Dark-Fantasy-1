import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
`;

// A sky dome for the chapters after the Eye: a gradient with drifting cloud, a
// moon, stars, optional aurora curtains and a sunrise. `levels` is read every
// frame ({ stars, aurora, dawn } from 0 to 1) so the sky can change as you play.
export function NightSky({ top, horizon, fog, moonDir = [0.2, 0.25, -1], moonColor = '#d8e8d0', moonSize = 0.9993, sunDir = [0.8, 0.06, -0.6], levels }) {
  const mesh = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(top) },
      uHorizon: { value: new THREE.Color(horizon) },
      uFog: { value: new THREE.Color(fog) },
      uMoonDir: { value: new THREE.Vector3(...moonDir).normalize() },
      uMoonColor: { value: new THREE.Color(moonColor) },
      uMoonSize: { value: moonSize },
      uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
      uStars: { value: 0 },
      uAurora: { value: 0 },
      uDawn: { value: 0 },
    }),
    [top, horizon, fog, moonDir, moonColor, moonSize, sunDir],
  );

  useFrame(({ camera, clock }) => {
    mesh.current.position.copy(camera.position);
    // Write through the live material: R3F may hold its own copy of `uniforms`.
    const u = mesh.current.material.uniforms;
    u.uTime.value = clock.elapsedTime;
    const l = levels();
    u.uStars.value += (l.stars - u.uStars.value) * 0.02;
    u.uAurora.value += ((l.aurora ?? 0) - u.uAurora.value) * 0.02;
    u.uDawn.value = l.dawn ?? 0;
  });

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[500, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position.z = gl_Position.w; // pin to the far plane
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uFog;
          uniform vec3 uMoonDir;
          uniform vec3 uMoonColor;
          uniform float uMoonSize;
          uniform vec3 uSunDir;
          uniform float uStars;
          uniform float uAurora;
          uniform float uDawn;
          varying vec3 vDir;
          ${NOISE}
          void main() {
            vec3 d = normalize(vDir);
            float up = d.y;
            vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.7, up));

            // Thin cloud drifting overhead.
            vec2 q = d.xz / (0.2 + max(up, 0.0)) * 1.1;
            float cloud = smoothstep(0.5, 0.85, fbm(q + vec2(uTime * 0.012, uTime * 0.004))) * smoothstep(0.02, 0.25, up);

            // Stars, twinkling between the clouds.
            vec2 cell = floor(vec2(atan(d.z, d.x) * 160.0, d.y * 160.0));
            float star = step(0.9962, hash(cell)) * smoothstep(0.04, 0.25, up) * (1.0 - cloud);
            col += vec3(0.9, 0.9, 1.0) * star * uStars * (0.6 + 0.4 * sin(uTime * 3.0 + hash(cell + 1.0) * 30.0)) * (1.0 - uDawn);

            // Aurora: green curtains folding across the northern sky.
            float band = sin(d.x * 3.2 + fbm(vec2(d.x * 2.0 + uTime * 0.03, d.z * 2.0)) * 5.0 + uTime * 0.08);
            float aurora = smoothstep(0.55, 1.0, band) * smoothstep(0.12, 0.35, up) * smoothstep(0.85, 0.45, up);
            col += vec3(0.03, 0.22, 0.12) * aurora * uAurora * (0.5 + 0.5 * fbm(vec2(d.x * 9.0, uTime * 0.15)));

            // Clouds sit dark against the sky.
            col = mix(col, col * 0.55, cloud * 0.8);

            // The moon, with a soft halo.
            float m = dot(d, normalize(uMoonDir));
            col += uMoonColor * exp((m - 1.0) * 70.0) * 0.12 * (1.0 - uDawn);
            float disc = smoothstep(uMoonSize, uMoonSize + 0.0003, m);
            vec3 moon = uMoonColor * (0.75 + 0.25 * noise(d.xy * 300.0));
            col = mix(col, moon, disc * (1.0 - uDawn * 0.7));

            // Dawn: warm horizon towards the sun, pale blue above, and the sun itself.
            float s = dot(d, normalize(uSunDir));
            vec3 dawn = mix(vec3(0.55, 0.22, 0.08), vec3(0.08, 0.16, 0.36), smoothstep(-0.02, 0.45, up));
            dawn += vec3(0.8, 0.4, 0.12) * exp((s - 1.0) * 5.0) * smoothstep(0.35, -0.05, up);
            dawn = mix(dawn, dawn * 0.8 + vec3(0.25, 0.14, 0.1) * 0.4, cloud);
            col = mix(col, dawn, uDawn);
            col += vec3(1.2, 0.8, 0.35) * smoothstep(0.9975, 0.999, s) * uDawn;

            // Melt into the fog at the horizon, and darker below it.
            col = mix(uFog, col, smoothstep(-0.04, 0.2, up));
            col = mix(col, uFog * 0.6, smoothstep(-0.05, -0.5, up));
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}
