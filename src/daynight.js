// Day and night: a ten-minute cycle with rose dawns, lavender days, burning sunsets and aurora nights.
import * as THREE from 'three';
import { moonDir } from './fx.js';

export const DAY_SECONDS = 600;

// t: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset. Colours are linear.
const K = [
  { t: 0.00, name: 'Night', zen: [0.004, 0.006, 0.03], mid: [0.03, 0.03, 0.12], hor: [0.14, 0.11, 0.30], fog: [0.012, 0.011, 0.058], cloud: [0.16, 0.14, 0.38], hemiS: [0.14, 0.14, 0.55], hemiG: [0.025, 0.024, 0.13], exp: 1.3, night: 1, deep: [0.04, 0.04, 0.16], cmid: [0.2, 0.2, 0.58], chi: [0.7, 0.7, 1.25], wdeep: [0.015, 0.025, 0.07], wsky: [0.09, 0.09, 0.26] },
  { t: 0.19, name: 'Night', zen: [0.004, 0.006, 0.03], mid: [0.03, 0.03, 0.12], hor: [0.14, 0.11, 0.30], fog: [0.012, 0.011, 0.058], cloud: [0.16, 0.14, 0.38], hemiS: [0.14, 0.14, 0.55], hemiG: [0.025, 0.024, 0.13], exp: 1.3, night: 1, deep: [0.04, 0.04, 0.16], cmid: [0.2, 0.2, 0.58], chi: [0.7, 0.7, 1.25], wdeep: [0.015, 0.025, 0.07], wsky: [0.09, 0.09, 0.26] },
  { t: 0.25, name: 'Dawn', zen: [0.05, 0.05, 0.2], mid: [0.35, 0.18, 0.4], hor: [1.1, 0.45, 0.35], fog: [0.2, 0.1, 0.16], cloud: [0.5, 0.25, 0.4], hemiS: [0.5, 0.3, 0.5], hemiG: [0.12, 0.06, 0.1], exp: 1.15, night: 0.35, deep: [0.2, 0.08, 0.2], cmid: [0.8, 0.4, 0.6], chi: [1.6, 0.9, 0.8], wdeep: [0.06, 0.03, 0.08], wsky: [0.5, 0.25, 0.35] },
  { t: 0.33, name: 'Morning', zen: [0.1, 0.18, 0.5], mid: [0.35, 0.4, 0.75], hor: [0.9, 0.7, 0.75], fog: [0.3, 0.3, 0.45], cloud: [0.8, 0.75, 0.9], hemiS: [0.6, 0.62, 0.9], hemiG: [0.14, 0.12, 0.16], exp: 1.0, night: 0, deep: [0.35, 0.4, 0.75], cmid: [0.7, 0.75, 1.1], chi: [1.4, 1.4, 1.6], wdeep: [0.03, 0.08, 0.18], wsky: [0.35, 0.45, 0.8] },
  { t: 0.5, name: 'Day', zen: [0.08, 0.16, 0.5], mid: [0.3, 0.4, 0.8], hor: [0.7, 0.72, 0.95], fog: [0.3, 0.34, 0.55], cloud: [0.9, 0.9, 1.0], hemiS: [0.65, 0.7, 1.0], hemiG: [0.15, 0.14, 0.18], exp: 0.95, night: 0, deep: [0.35, 0.45, 0.85], cmid: [0.7, 0.8, 1.2], chi: [1.4, 1.45, 1.7], wdeep: [0.02, 0.07, 0.2], wsky: [0.3, 0.45, 0.85] },
  { t: 0.66, name: 'Afternoon', zen: [0.08, 0.14, 0.45], mid: [0.35, 0.38, 0.72], hor: [0.9, 0.7, 0.6], fog: [0.35, 0.3, 0.4], cloud: [0.95, 0.8, 0.8], hemiS: [0.65, 0.6, 0.85], hemiG: [0.16, 0.12, 0.12], exp: 1.0, night: 0, deep: [0.4, 0.4, 0.75], cmid: [0.85, 0.75, 1.0], chi: [1.6, 1.3, 1.3], wdeep: [0.03, 0.06, 0.16], wsky: [0.4, 0.4, 0.7] },
  { t: 0.745, name: 'Sunset', zen: [0.08, 0.06, 0.28], mid: [0.7, 0.25, 0.45], hor: [1.6, 0.55, 0.2], fog: [0.35, 0.14, 0.18], cloud: [0.9, 0.35, 0.45], hemiS: [0.7, 0.35, 0.45], hemiG: [0.16, 0.06, 0.08], exp: 1.05, night: 0.15, deep: [0.35, 0.1, 0.25], cmid: [1.0, 0.4, 0.5], chi: [2.0, 0.9, 0.6], wdeep: [0.08, 0.03, 0.08], wsky: [0.8, 0.3, 0.3] },
  { t: 0.8, name: 'Dusk', zen: [0.02, 0.02, 0.1], mid: [0.18, 0.07, 0.28], hor: [0.55, 0.16, 0.4], fog: [0.08, 0.03, 0.12], cloud: [0.35, 0.14, 0.4], hemiS: [0.3, 0.18, 0.5], hemiG: [0.06, 0.03, 0.1], exp: 1.2, night: 0.7, deep: [0.1, 0.04, 0.18], cmid: [0.45, 0.18, 0.55], chi: [1.1, 0.6, 1.2], wdeep: [0.03, 0.015, 0.06], wsky: [0.3, 0.1, 0.3] },
  { t: 0.86, name: 'Night', zen: [0.004, 0.006, 0.03], mid: [0.03, 0.03, 0.12], hor: [0.14, 0.11, 0.30], fog: [0.012, 0.011, 0.058], cloud: [0.16, 0.14, 0.38], hemiS: [0.14, 0.14, 0.55], hemiG: [0.025, 0.024, 0.13], exp: 1.3, night: 1, deep: [0.04, 0.04, 0.16], cmid: [0.2, 0.2, 0.58], chi: [0.7, 0.7, 1.25], wdeep: [0.015, 0.025, 0.07], wsky: [0.09, 0.09, 0.26] },
  { t: 1.0, name: 'Night', zen: [0.004, 0.006, 0.03], mid: [0.03, 0.03, 0.12], hor: [0.14, 0.11, 0.30], fog: [0.012, 0.011, 0.058], cloud: [0.16, 0.14, 0.38], hemiS: [0.14, 0.14, 0.55], hemiG: [0.025, 0.024, 0.13], exp: 1.3, night: 1, deep: [0.04, 0.04, 0.16], cmid: [0.2, 0.2, 0.58], chi: [0.7, 0.7, 1.25], wdeep: [0.015, 0.025, 0.07], wsky: [0.09, 0.09, 0.26] },
];

function sample(t) {
  let a = K[0], b = K[K.length - 1];
  for (let i = 0; i < K.length - 1; i++) if (t >= K[i].t && t <= K[i + 1].t) { a = K[i]; b = K[i + 1]; break; }
  const f = (t - a.t) / Math.max(1e-6, b.t - a.t), s = f * f * (3 - 2 * f);
  const out = { name: s < 0.5 ? a.name : b.name };
  for (const key of Object.keys(a)) {
    if (key === 't' || key === 'name') continue;
    const va = a[key], vb = b[key];
    out[key] = Array.isArray(va) ? va.map((v, i) => v + (vb[i] - v) * s) : va + (vb - va) * s;
  }
  return out;
}

export const sunDir = new THREE.Vector3();

export function phaseName(t) {
  if (t < 0.2 || t >= 0.86) return 'Night';
  if (t < 0.29) return 'Dawn';
  if (t < 0.42) return 'Morning';
  if (t < 0.6) return 'Day';
  if (t < 0.71) return 'Afternoon';
  if (t < 0.78) return 'Sunset';
  return 'Dusk';
}

// Apply the time of day to everything that cares about it
export function applyTime(t, r) {
  const k = sample(t);
  const a = (t - 0.25) * Math.PI * 2;
  sunDir.set(Math.cos(a) * 0.92, Math.sin(a), 0.38).normalize();
  const sunY = sunDir.y;
  const sunCol = sunY < 0.25 ? [1.4, 0.55 + sunY * 1.2, 0.25 + sunY * 0.8] : [1.25, 1.05, 0.85];
  const u = r.sky.uniforms;
  u.uZen.value.setRGB(...k.zen); u.uMid.value.setRGB(...k.mid); u.uHor.value.setRGB(...k.hor);
  u.uCloud.value.setRGB(...k.cloud); u.uSunCol.value.setRGB(...sunCol);
  u.uSun.value.copy(sunDir); u.uNight.value = k.night;
  u.uAurora.value = Math.max(0, k.night - 0.3) / 0.7;
  u.uRainbow.value = t > 0.26 && t < 0.36 ? Math.sin(((t - 0.26) / 0.1) * Math.PI) : 0;
  r.fog.setRGB(...k.fog);
  r.scene.fog.color.copy(r.fog);
  r.hemi.color.setRGB(...k.hemiS); r.hemi.groundColor.setRGB(...k.hemiG);
  r.renderer.toneMappingExposure = k.exp;
  r.scene.environmentIntensity = 0.5 + k.night * 0.4;
  // One light plays both sun and moon: the sun by day, the moon by night
  const sunI = THREE.MathUtils.smoothstep(sunY, -0.04, 0.12), moonI = 1 - THREE.MathUtils.smoothstep(sunY, -0.12, 0.02);
  const useSun = sunI > moonI;
  r.lightDir.copy(useSun ? sunDir : moonDir);
  if (useSun) { r.light.color.setRGB(...sunCol.map((v) => Math.min(1, v))); r.light.intensity = 0.3 + sunI * 2.4; }
  else { r.light.color.setRGB(0.66, 0.69, 1.0); r.light.intensity = 0.3 + moonI * 1.4; }
  // Water and cloud sea
  const cs = r.cloudSea.uniforms;
  cs.uDeep.value.setRGB(...k.deep); cs.uMidC.value.setRGB(...k.cmid); cs.uHi.value.setRGB(...k.chi);
  cs.uFar.value.setRGB(...k.hor.map((v) => v * 0.9));
  cs.uMoon.value.copy(useSun ? sunDir : moonDir);
  cs.uGlint.value.setRGB(...(useSun ? sunCol.map((v) => v * 0.8) : [0.5, 0.55, 1.1]));
  const lu = r.lake.uniforms;
  lu.uMoon.value.copy(useSun ? sunDir : moonDir);
  lu.uGlint.value.setRGB(...(useSun ? sunCol : [0.75, 0.78, 1.3]));
  lu.uDeepW.value.setRGB(...k.wdeep); lu.uSkyW.value.setRGB(...k.wsky);
  lu.uNight.value = k.night;
  r.moon.material.opacity = 0.35 + 0.65 * k.night;
  return k;
}

// ---------- Sky whales: huge, gentle, glowing, drifting over the realm ----------
export function makeWhales(scene) {
  const whales = [];
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.75, 1.3), transparent: true, opacity: 0.6, depthWrite: false, fog: false });
  const spotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.6, 3.0), fog: false });
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat);
    body.scale.set(4.5, 4, 16);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
    head.scale.set(4, 3.5, 5); head.position.z = 11;
    const tail = new THREE.Group(); tail.position.z = -14;
    const stalk = new THREE.Mesh(new THREE.ConeGeometry(2.4, 10, 10), mat); stalk.rotation.x = -Math.PI / 2; stalk.position.z = -4;
    const fluke = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat); fluke.scale.set(8, 0.5, 2.6); fluke.position.z = -9;
    tail.add(stalk, fluke);
    const fins = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat); f.scale.set(5, 0.4, 1.8); f.position.set(s * 6, -1.5, 4); f.rotation.z = s * 0.4; return f; });
    g.add(body, head, tail, ...fins);
    for (let k = 0; k < 10; k++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 5), spotMat); sp.position.set(k % 2 ? 1.6 : -1.6, 3.2, 10 - k * 2.4); g.add(sp); }
    const scale = 3.2 + i * 0.8;
    g.scale.setScalar(scale);
    scene.add(g);
    whales.push({ g, tail, fins, r: 420 + i * 330, h: 190 + i * 70, sp: (0.03 - i * 0.007) * (i % 2 ? -1 : 1), ph: i * 2.1 });
  }
  return (t) => {
    for (const w of whales) {
      const a = t * w.sp + w.ph;
      w.g.position.set(Math.cos(a) * w.r, w.h + Math.sin(t * 0.2 + w.ph) * 12, Math.sin(a) * w.r * 0.8);
      const dx = -Math.sin(a) * w.r * Math.sign(w.sp), dz = Math.cos(a) * w.r * 0.8 * Math.sign(w.sp);
      w.g.rotation.y = Math.atan2(dx, dz);
      w.g.rotation.z = Math.sin(t * 0.3 + w.ph) * 0.08;
      w.tail.rotation.x = Math.sin(t * 0.9 + w.ph) * 0.35;
      w.fins.forEach((f, i) => { f.rotation.x = Math.sin(t * 0.9 + w.ph + i) * 0.3; });
    }
    return whales;
  };
}
