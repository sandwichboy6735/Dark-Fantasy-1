// Block materials, the sky dome (blood moon, stars, veil aurora, clouds) and the day/night palette.
import * as THREE from 'three';

export function makeMaterials(atlasTex) {
  const shared = {
    uAtlas: { value: atlasTex },
    uTime: { value: 0 },
    uSkyLight: { value: new THREE.Color(1, 1, 1) },
    uWarm: { value: new THREE.Color(1.0, 0.52, 0.2) },
    uSoul: { value: new THREE.Color(0.35, 0.62, 1.0) },
    uAmbient: { value: new THREE.Color(0.02, 0.02, 0.03) },
    uFogColor: { value: new THREE.Color(0.1, 0.1, 0.12) },
    uFogDensity: { value: 0.012 },
    uSoulPulse: { value: 1 },
  };
  const vert = /* glsl */`
    uniform float uTime;
    attribute vec4 aLight;
    attribute vec2 aMisc;
    varying vec2 vUv;
    varying vec4 vLight;
    varying float vEmis;
    varying vec3 vWorld;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      if (aMisc.y > 0.0) {
        float s = sin(uTime * 1.7 + wp.x * 0.6 + wp.z * 0.45) + 0.5 * sin(uTime * 2.9 + wp.x * 1.3);
        wp.x += s * 0.06 * aMisc.y;
        wp.z += cos(uTime * 1.3 + wp.z * 0.7) * 0.04 * aMisc.y;
      }
      vUv = uv; vLight = aLight; vEmis = aMisc.x; vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;
  const lighting = /* glsl */`
    uniform sampler2D uAtlas;
    uniform vec3 uSkyLight, uWarm, uSoul, uAmbient, uFogColor;
    uniform float uFogDensity, uTime, uSoulPulse;
    varying vec2 vUv;
    varying vec4 vLight;
    varying float vEmis;
    varying vec3 vWorld;
    float curve(float l) { return l * l * (1.4 - 0.4 * l); }
    vec3 shade(vec3 albedo) {
      float flick = 0.92 + 0.08 * sin(uTime * 9.0 + vWorld.x * 3.1 + vWorld.z * 1.7) * sin(uTime * 5.3 + vWorld.y);
      vec3 light = uAmbient
        + uSkyLight * curve(vLight.x)
        + uWarm * curve(vLight.y) * 1.5 * flick
        + uSoul * curve(vLight.z) * 1.35 * uSoulPulse;
      vec3 col = albedo * light * vLight.w;
      float lum = dot(albedo, vec3(0.3, 0.59, 0.11));
      col += albedo * vEmis * (0.25 + 2.6 * smoothstep(0.18, 0.55, lum));
      return col;
    }
    vec3 fog(vec3 col) {
      float d = length(vWorld - cameraPosition);
      float f = 1.0 - exp(-pow(d * uFogDensity, 1.7));
      // low-lying mist
      float mist = smoothstep(40.0, 26.0, vWorld.y) * 0.35 * (1.0 - exp(-d * 0.02));
      return mix(col, uFogColor, clamp(f + mist, 0.0, 1.0));
    }`;
  const opaque = new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: vert,
    fragmentShader: lighting + /* glsl */`
      void main() {
        vec4 t = texture2D(uAtlas, vUv);
        if (t.a < 0.5) discard;
        gl_FragColor = vec4(fog(shade(t.rgb)), 1.0);
      }`,
  });
  const translucent = new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: vert,
    fragmentShader: lighting + /* glsl */`
      void main() {
        vec4 t = texture2D(uAtlas, vUv);
        vec3 c = shade(t.rgb);
        float a = t.a;
        if (vEmis < 0.01) {
          // Murkwater: dark with moving sheen
          float w = sin(vWorld.x * 1.3 + uTime * 1.2) * sin(vWorld.z * 1.1 - uTime * 0.9);
          vec3 viewDir = normalize(cameraPosition - vWorld);
          float fres = pow(1.0 - abs(viewDir.y), 3.0);
          c = mix(c, uFogColor * 1.2, 0.35 * fres) + vec3(0.02, 0.03, 0.04) * w * vLight.x;
          a = mix(0.72, 0.92, fres);
        }
        gl_FragColor = vec4(fog(c), a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  opaque.side = THREE.FrontSide;
  return { opaque, translucent, uniforms: shared };
}

// ---------- Sky ----------
export function makeSky() {
  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uNight: { value: 0 },
    uTime: { value: 0 },
    uMoonColor: { value: new THREE.Color(1.0, 0.18, 0.12) },
    uUnder: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSunDir, uMoonDir, uZenith, uHorizon, uMoonColor;
      uniform float uNight, uTime, uUnder;
      varying vec3 vDir;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, smoothstep(-0.05, 0.55, h));
        col = mix(col, uHorizon * 0.6, smoothstep(0.0, -0.3, h));

        // Stars
        if (h > 0.0) {
          vec3 sp = floor(d * 260.0);
          float s = hash(sp);
          float tw = 0.6 + 0.4 * sin(uTime * 3.0 + s * 80.0);
          col += vec3(0.9, 0.85, 1.0) * step(0.9975, s) * tw * uNight * smoothstep(0.0, 0.25, h) * 2.0;
        }

        // The Veil: slow crimson/violet aurora
        if (h > 0.05) {
          vec2 uv = d.xz / (h + 0.25) * 1.6;
          float band = fbm(uv * 0.8 + vec2(uTime * 0.01, uTime * 0.017));
          float streak = smoothstep(0.45, 0.8, band) * smoothstep(0.05, 0.4, h) * (1.0 - smoothstep(0.7, 1.0, h));
          vec3 veil = mix(vec3(0.55, 0.05, 0.18), vec3(0.25, 0.1, 0.6), fbm(uv * 1.3 + 3.0));
          col += veil * streak * uNight * 0.9;
        }

        // Moon
        float md = dot(d, normalize(uMoonDir));
        float mdisk = smoothstep(0.99905, 0.99925, md);
        vec2 mUv = (d - normalize(uMoonDir) * md).xy * 60.0;
        float crater = fbm(mUv * 3.0 + 7.0);
        col += uMoonColor * mdisk * (2.2 + crater * 1.6);
        col += uMoonColor * pow(max(md, 0.0), 180.0) * 0.8 + uMoonColor * pow(max(md, 0.0), 12.0) * 0.12;

        // Pale, sickly sun behind the overcast
        float sd = dot(d, normalize(uSunDir));
        col += vec3(1.0, 0.85, 0.6) * smoothstep(0.9993, 0.9996, sd) * 1.6 * (1.0 - uNight);
        col += vec3(1.0, 0.55, 0.3) * pow(max(sd, 0.0), 40.0) * 0.35;

        // Heavy clouds drifting
        if (h > 0.0) {
          vec2 cuv = d.xz / (h + 0.12) * 0.9 + vec2(uTime * 0.004, uTime * 0.002);
          float c = smoothstep(0.5, 0.85, fbm(cuv));
          vec3 ccol = mix(uHorizon * 0.55, uZenith * 0.4, 0.5) + uMoonColor * pow(max(md, 0.0), 6.0) * 0.25 * uNight;
          col = mix(col, ccol, c * 0.75 * smoothstep(0.0, 0.2, h));
        }
        col = mix(col, vec3(0.02, 0.05, 0.06), uUnder);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, uniforms };
}

// Palette keyframes over the day (t: 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk)
const KEYS = [
  { t: 0.0, zen: [0.006, 0.003, 0.014], hor: [0.05, 0.015, 0.035], sky: [0.2, 0.06, 0.09], amb: [0.035, 0.025, 0.05], night: 1 },
  { t: 0.2, zen: [0.01, 0.006, 0.02], hor: [0.06, 0.02, 0.04], sky: [0.2, 0.07, 0.1], amb: [0.035, 0.025, 0.05], night: 1 },
  { t: 0.27, zen: [0.06, 0.05, 0.09], hor: [0.42, 0.14, 0.08], sky: [0.5, 0.3, 0.26], amb: [0.05, 0.04, 0.05], night: 0.35 },
  { t: 0.36, zen: [0.16, 0.17, 0.21], hor: [0.34, 0.3, 0.3], sky: [0.82, 0.78, 0.74], amb: [0.07, 0.07, 0.08], night: 0 },
  { t: 0.64, zen: [0.15, 0.16, 0.2], hor: [0.34, 0.29, 0.28], sky: [0.82, 0.76, 0.72], amb: [0.07, 0.07, 0.08], night: 0 },
  { t: 0.73, zen: [0.07, 0.03, 0.07], hor: [0.55, 0.12, 0.05], sky: [0.6, 0.26, 0.18], amb: [0.05, 0.03, 0.04], night: 0.3 },
  { t: 0.8, zen: [0.01, 0.006, 0.02], hor: [0.08, 0.02, 0.04], sky: [0.2, 0.07, 0.1], amb: [0.035, 0.025, 0.05], night: 1 },
  { t: 1.0, zen: [0.006, 0.003, 0.014], hor: [0.05, 0.015, 0.035], sky: [0.2, 0.06, 0.09], amb: [0.035, 0.025, 0.05], night: 1 },
];

export function palette(t) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) if (t >= KEYS[i].t && t <= KEYS[i + 1].t) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const f = (t - a.t) / Math.max(1e-6, b.t - a.t);
  const s = f * f * (3 - 2 * f);
  const mix = (p, q) => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, p[2] + (q[2] - p[2]) * s];
  return { zen: mix(a.zen, b.zen), hor: mix(a.hor, b.hor), sky: mix(a.sky, b.sky), amb: mix(a.amb, b.amb), night: a.night + (b.night - a.night) * s };
}

export function timeName(t) {
  if (t < 0.12 || t >= 0.94) return 'The Witching Hour';
  if (t < 0.24) return 'The Long Dark';
  if (t < 0.32) return 'Bleak Dawn';
  if (t < 0.46) return 'Grey Morning';
  if (t < 0.58) return 'Ashen Noon';
  if (t < 0.7) return 'Waning Light';
  if (t < 0.8) return 'Bloodfall Dusk';
  return 'Moonrise';
}

// Cinematic grade: vignette, film grain, slight split-tone. Runs before tone mapping.
export const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 1 }, uGrain: { value: 1 }, uUnder: { value: 0 }, uLetterbox: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uUnder, uLetterbox;
    varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*37.0) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      if (uUnder > 0.0) uv += vec2(sin(uv.y*30.0+uTime*2.0), cos(uv.x*25.0+uTime*1.7)) * 0.002 * uUnder;
      vec3 c = texture2D(tDiffuse, uv).rgb;
      float l = dot(c, vec3(0.299,0.587,0.114));
      // split tone: teal shadows, warm highlights, slight desaturation
      c = mix(vec3(l), c, 0.82);
      c += vec3(-0.004, 0.004, 0.012) * (1.0 - smoothstep(0.0, 0.25, l));
      c *= mix(vec3(1.0), vec3(1.05, 0.98, 0.92), smoothstep(0.3, 1.0, l));
      if (uUnder > 0.0) c = mix(c, c * vec3(0.3, 0.6, 0.7), uUnder * 0.6);
      vec2 q = vUv - 0.5;
      float v = 1.0 - dot(q, q) * 1.35 * uVignette;
      c *= clamp(v, 0.0, 1.0);
      c += (rnd(vUv * 900.0) - 0.5) * 0.035 * uGrain * (0.4 + l);
      float bar = uLetterbox * 0.11;
      if (vUv.y < bar || vUv.y > 1.0 - bar) c = vec3(0.0);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};
