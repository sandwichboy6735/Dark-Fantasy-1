import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const EYE_POSITION = new THREE.Vector3(0, 250, -340);
// Shared by the scene fog and the sky's horizon, so buildings melt into the clouds.
export const FOG_COLOR = new THREE.Color('#15111f');

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
`;

// A sphere that rides with the camera. The clouds are fbm noise sampled in polar
// coordinates around the eye, with the angle twisted harder towards the centre,
// so the whole sky turns slowly like a maelstrom with the eye at its heart.
function SkyDome() {
  const mesh = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVortexDir: { value: new THREE.Vector3(0, 0.45, -1).normalize() },
      uFogColor: { value: FOG_COLOR },
    }),
    [],
  );

  useFrame(({ camera, clock }) => {
    mesh.current.position.copy(camera.position);
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uVortexDir.value.copy(EYE_POSITION).sub(camera.position).normalize();
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
          uniform vec3 uVortexDir;
          uniform vec3 uFogColor;
          varying vec3 vDir;
          ${NOISE}
          void main() {
            vec3 d = normalize(vDir);
            vec3 axis = normalize(uVortexDir);
            vec3 t1 = normalize(cross(axis, vec3(0.0, 1.0, 0.0)));
            vec3 t2 = cross(t1, axis);

            float r = acos(clamp(dot(d, axis), -1.0, 1.0));         // angle from the eye
            float theta = atan(dot(d, t2), dot(d, t1));
            float swirl = theta + 1.6 / (r + 0.22) + uTime * 0.035;  // tighter twist near the centre
            vec2 q = vec2(cos(swirl), sin(swirl)) * r * 2.6;

            float n1 = fbm(q * 1.5 + vec2(uTime * 0.015, 0.0));
            float n2 = fbm(q * 3.2 - n1 * 1.8 + vec2(0.0, uTime * 0.02));
            float cloud = smoothstep(0.3, 0.85, n1 * 0.55 + n2 * 0.55);

            vec3 col = mix(vec3(0.003, 0.002, 0.007), vec3(0.022, 0.017, 0.04), cloud);
            col += vec3(0.03, 0.022, 0.055) * smoothstep(0.55, 0.8, n2) * cloud;    // lit cloud folds
            float halo = exp(-r * 4.0);
            col += vec3(0.015, 0.05, 0.2) * halo * (0.25 + cloud);                 // the eye's light in the clouds
            col += vec3(0.01, 0.04, 0.16) * exp(-r * 10.0);

            // Melt into the fog at the horizon and into the abyss below it.
            col = mix(uFogColor, col, smoothstep(-0.05, 0.3, d.y));
            col = mix(col, vec3(0.002, 0.001, 0.005), smoothstep(-0.05, -0.5, d.y));
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

// The eye: a camera-facing card drawn entirely in the shader. Almond lids that
// blink now and then, a pale blue sclera with dark veins, a glowing striated iris
// and a black slit pupil that tilts down to watch the causeway.
function Eye() {
  const mesh = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uBlink: { value: 0 }, uLook: { value: new THREE.Vector2(0, -0.35) } }), []);
  const blink = useRef({ next: 5, start: -10 });

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    mesh.current.lookAt(camera.position);
    uniforms.uTime.value = t;

    const b = blink.current;
    if (t > b.next) {
      b.start = t;
      b.next = t + 5 + Math.random() * 7;
    }
    const k = (t - b.start) / 0.35;
    uniforms.uBlink.value = k >= 0 && k <= 1 ? Math.sin(k * Math.PI) : 0;

    // Mostly fixed on you, drifting slowly, with a sudden dart now and then.
    const dart = Math.sin(t * 0.23) > 0.93 ? 0.45 : 0;
    uniforms.uLook.value.set(Math.sin(t * 0.31) * 0.25 + dart, -0.3 + Math.sin(t * 0.17) * 0.1);
  });

  return (
    <mesh ref={mesh} position={EYE_POSITION} renderOrder={-5} frustumCulled={false} raycast={() => null} onBeforeRender={skipInNormalPass}>
      <planeGeometry args={[160, 80]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform float uBlink;
          uniform vec2 uLook;
          varying vec2 vUv;
          ${NOISE}
          void main() {
            vec2 p = (vUv - 0.5) * vec2(2.0, 1.0);          // x in [-1, 1], y in [-0.5, 0.5]
            float open = 1.0 - uBlink;
            float lid = 0.36 * pow(max(1.0 - p.x * p.x / 0.72, 0.0), 0.85) * open;
            float edge = lid - abs(p.y);                     // > 0 inside the lids

            // Glow that bleeds out of the lids into the sky.
            float almond = length(vec2(p.x * 0.75, p.y * 1.6));
            float halo = exp(-max(almond - 0.45, 0.0) * 5.5);
            vec3 col = vec3(0.1, 0.35, 1.0) * halo * 0.9;
            float alpha = halo * 0.85;

            // Heavy dark lids.
            float rim = smoothstep(0.1, 0.0, abs(edge + 0.02)) * step(abs(p.x), 0.86);
            col = mix(col, vec3(0.03, 0.02, 0.06), rim * 0.9);
            alpha = max(alpha, rim * 0.95);

            if (edge > 0.0) {
              vec2 c = uLook * vec2(0.28, 0.12);
              vec2 d = p - c;
              float r = length(d);
              float ang = atan(d.y, d.x);

              vec3 sclera = vec3(0.55, 0.72, 1.0) * (0.75 + 0.25 * noise(p * 14.0));
              float veins = smoothstep(0.72, 0.8, fbm(vec2(ang * 3.0, r * 9.0) + 3.1)) * smoothstep(0.2, 0.55, r);
              sclera = mix(sclera, vec3(0.1, 0.12, 0.45), veins);

              float striae = 0.6 + 0.4 * noise(vec2(ang * 9.0, r * 22.0 - uTime * 0.2));
              vec3 iris = mix(vec3(0.05, 0.5, 1.4), vec3(0.6, 1.4, 1.8), smoothstep(0.24, 0.05, r)) * striae;
              iris *= smoothstep(0.3, 0.26, r) * 0.5 + 0.5;                                       // dark limbal ring

              float slit = abs(d.x) - 0.045 * sqrt(max(1.0 - pow(d.y / 0.24, 2.0), 0.0));
              vec3 eye = mix(sclera, iris, step(r, 0.28));
              eye = mix(eye, vec3(0.0), step(slit, 0.0) * step(abs(d.y), 0.24));
              eye *= smoothstep(0.0, 0.06, edge) * 0.6 + 0.4;                                    // shade under the lids
              col = eye;
              alpha = 1.0;
            }
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
}

// RenderPixelatedPass redraws the scene with a MeshNormalMaterial override to
// find outlines. The eye is a flat card, so there it would draw a rectangle
// around itself; hide it from that pass by emptying its draw range.
function skipInNormalPass(renderer, scene, camera, geometry) {
  geometry.setDrawRange(0, scene.overrideMaterial ? 0 : Infinity);
}

export function Sky() {
  return (
    <>
      <SkyDome />
      <Eye />
      {/* The eye's cold glow grazes the castle's spires. */}
      <directionalLight color="#3f5dff" intensity={0.5} position={EYE_POSITION.toArray()} />
    </>
  );
}
