// Sculpted heads: a dense sphere pushed and pulled by soft "clay" features, wrinkles and warts.
// Creases come out darker and bulges lighter, like the shading in a painted portrait.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Simplex, mulberry32 } from './noise.js';

const N3 = new Simplex(4711);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// feats: [{ d: [x,y,z] direction on the unit sphere, a: amount (+ out, - in), w: [wx, wy, wz] softness }]
export function sculpt({ r, scale = [1, 1, 1], feats = [], wrinkle = 0, warts = 0, seed = 1, detail = 64 }) {
  const rnd = mulberry32(seed);
  const all = feats.map((f) => ({ d: V(...f.d).normalize(), a: f.a, w: f.w }));
  for (let i = 0; i < warts; i++) {
    const d = V(rnd() * 2 - 1, rnd() * 1.6 - 0.9, rnd() * 1.2 - 0.1).normalize();
    const w = 0.035 + rnd() * 0.04;
    all.push({ d, a: 0.015 + rnd() * 0.03, w: [w, w, w] });
  }
  const disp = (n) => {
    let s = 0;
    for (const f of all) {
      const ex = (n.x - f.d.x) / f.w[0], ey = (n.y - f.d.y) / f.w[1], ez = (n.z - f.d.z) / f.w[2];
      const e = ex * ex + ey * ey + ez * ez;
      if (e < 12) s += f.a * Math.exp(-e);
    }
    if (wrinkle) {
      const w1 = 1 - Math.abs(N3.noise3(n.x * 7 + seed, n.y * 7, n.z * 7));
      s -= wrinkle * 0.6 * Math.pow(w1, 8);
      s += wrinkle * 0.5 * N3.noise3(n.x * 16, n.y * 16 + seed, n.z * 16);
    }
    return s;
  };
  let geo = new THREE.SphereGeometry(r, detail, Math.round(detail * 0.75));
  geo.deleteAttribute('uv'); geo.deleteAttribute('normal');
  geo = mergeVertices(geo);
  const p = geo.attributes.position, n = new THREE.Vector3();
  const vcol = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    n.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const d = disp(n);
    p.setXYZ(i, n.x * r * (1 + d) * scale[0], n.y * r * (1 + d) * scale[1], n.z * r * (1 + d) * scale[2]);
    vcol[i] = Math.min(1.12, Math.max(0.45, 0.84 + d * 1.1));
  }
  geo.computeVertexNormals();
  const surf = (x, y, z, push = 0) => {
    const nn = V(x, y, z).normalize(); const d = disp(nn) + push;
    return [nn.x * r * (1 + d) * scale[0], nn.y * r * (1 + d) * scale[1], nn.z * r * (1 + d) * scale[2]];
  };
  return { geo, vcol, surf };
}

// An eye: yellowed white, coloured iris, dark pupil and a heavy upper lid
export function eye(k, c, r, iris, skin, lid = 0.35, look = [0, 0, 1]) {
  const [x, y, z] = c;
  k.sphere('enamel', r, '#cfc2aa', { x, y, z, ws: 14, hs: 10 });
  const lz = Math.hypot(...look);
  const f = [look[0] / lz, look[1] / lz, look[2] / lz];
  k.sphere('enamel', r * 0.66, new THREE.Color(iris).multiplyScalar(0.75).getStyle(), { x: x + f[0] * r * 0.62, y: y + f[1] * r * 0.62, z: z + f[2] * r * 0.62, sz: 0.5, ws: 14, hs: 10 });
  k.sphere('enamel', r * 0.32, '#040303', { x: x + f[0] * r * 0.9, y: y + f[1] * r * 0.9, z: z + f[2] * r * 0.9, sz: 0.45, ws: 10, hs: 8 });
  // lashes along the lid edge and a crease shadow under the eye
  k.add('plain', new THREE.TorusGeometry(r * 1.02, r * 0.12, 4, 14, Math.PI * 0.9), '#140c0c', { x, y: y + r * 0.08, z: z + r * 0.22, rz: Math.PI * 0.05, bright: 1 });
  k.add('plain', new THREE.TorusGeometry(r * 1.0, r * 0.06, 4, 12, Math.PI * 0.7), '#5a3a34', { x, y: y - r * 0.05, z: z + r * 0.2, rz: Math.PI + Math.PI * 0.15, bright: 1 });
  // lid: a partial sphere shell over the top of the eye
  const g = new THREE.SphereGeometry(r * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * lid * 0.82);
  k.add('skin', g, skin, { x, y, z, rx: 0.5, bright: 0.85 });
}

// Flared, wavy cuff or collar
export function ruffle(k, at, dir, r, len, color, waves = 12, flare = 1.7) {
  const g = new THREE.CylinderGeometry(r * flare, r, len, 48, 3, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + len / 2) / len;
    const a = Math.atan2(z, x);
    const f = 1 + Math.sin(a * waves) * 0.16 * t;
    p.setXYZ(i, x * f, y + Math.cos(a * waves) * len * 0.12 * t, z * f);
  }
  g.computeVertexNormals();
  k.add('lace', g, color, { x: at[0], y: at[1], z: at[2], dir });
}

// A hand with four clawed fingers and a thumb. fwd: direction the fingers point, up: back of the hand
export function hand(k, at, fwd, up, skin, size = 1, claw = '#2a2418', curl = 0.3, kind = 'skin') {
  const F = V(...fwd).normalize(), U = V(...up).normalize(), S = new THREE.Vector3().crossVectors(F, U).normalize();
  const P = (f, s, u) => [at[0] + (F.x * f + S.x * s + U.x * u) * size, at[1] + (F.y * f + S.y * s + U.y * u) * size, at[2] + (F.z * f + S.z * s + U.z * u) * size];
  const palm = new THREE.SphereGeometry(0.075, 14, 10);
  palm.scale(1.1, 0.55, 1.25);
  const m = new THREE.Matrix4().makeBasis(S, U, F);
  palm.applyMatrix4(m);
  k.add(kind, palm, skin, { x: at[0], y: at[1], z: at[2], sx: size, sy: size, sz: size });
  const fingers = [[-0.045, 0.11], [-0.015, 0.125], [0.015, 0.12], [0.045, 0.1]];
  for (const [s, len] of fingers) {
    const base = P(0.07, s, 0);
    const mid = P(0.07 + len * 0.55, s * 1.1, -len * curl * 0.4);
    const tip = P(0.07 + len * 0.9, s * 1.15, -len * curl);
    k.limb(kind, base, mid, 0.017 * size, 0.015 * size, skin, { seg: 8 });
    k.limb(kind, mid, tip, 0.015 * size, 0.011 * size, skin, { seg: 8 });
    k.sphere(kind, 0.016 * size, skin, { x: mid[0], y: mid[1], z: mid[2], ws: 8, hs: 6 });
    const dx = tip[0] - mid[0], dy = tip[1] - mid[1], dz = tip[2] - mid[2];
    k.cone('hide', 0.011 * size, 0.045 * size, 6, claw, { x: tip[0] + dx * 0.3, y: tip[1] + dy * 0.3, z: tip[2] + dz * 0.3, dir: [dx, dy, dz] });
  }
  const tb = P(0.01, -0.07, -0.01), tt = P(0.08, -0.1, -0.04);
  k.limb(kind, tb, tt, 0.02 * size, 0.014 * size, skin, { seg: 8 });
  k.cone('hide', 0.011 * size, 0.04 * size, 6, claw, { x: tt[0], y: tt[1], z: tt[2], dir: [tt[0] - tb[0], tt[1] - tb[1], tt[2] - tb[2]] });
}

// Human-ish face used by villagers, wizards, witches, knights and the queen
export function humanHead(k, c, r, skin, o = {}) {
  const feats = [
    { d: [0, -0.05, 1], a: 0.2 * (o.nose ?? 1), w: [0.13, 0.22, 0.22] },
    { d: [0, -0.2, 0.98], a: 0.1 * (o.nose ?? 1), w: [0.1, 0.1, 0.12] },
    { d: [0, 0.28, 0.95], a: 0.06 * (o.brow ?? 1), w: [0.5, 0.1, 0.3] },
    { d: [0.35, 0.1, 0.92], a: -0.1, w: [0.14, 0.12, 0.2] }, { d: [-0.35, 0.1, 0.92], a: -0.1, w: [0.14, 0.12, 0.2] },
    { d: [0.5, -0.2, 0.8], a: 0.05, w: [0.25, 0.25, 0.25] }, { d: [-0.5, -0.2, 0.8], a: 0.05, w: [0.25, 0.25, 0.25] },
    { d: [0, -0.8, 0.55], a: 0.12 * (o.chin ?? 1), w: [0.3, 0.2, 0.3] },
    { d: [0.9, -0.6, 0], a: -0.1, w: [0.4, 0.4, 0.4] }, { d: [-0.9, -0.6, 0], a: -0.1, w: [0.4, 0.4, 0.4] },
    { d: [0, -0.46, 0.9], a: -0.03, w: [0.3, 0.04, 0.3] },
  ];
  if (o.hook) feats.push({ d: [0, -0.32, 0.95], a: 0.22, w: [0.1, 0.14, 0.12] }, { d: [0, 0.05, 1], a: 0.12, w: [0.08, 0.2, 0.2] });
  const s = sculpt({ r, scale: [0.9, 1.08, 1], feats, wrinkle: o.age ? 0.018 * o.age : 0, warts: o.warts || 0, seed: o.seed || 3, detail: 40 });
  k.add(o.kind || 'skin', s.geo, skin, { x: c[0], y: c[1], z: c[2], vcol: s.vcol });
  const at = (x, y, z, push) => { const q = s.surf(x, y, z, push); return [c[0] + q[0], c[1] + q[1], c[2] + q[2]]; };
  if (o.eyes !== false) for (const sx of [-1, 1]) {
    const p = at(sx * 0.35, 0.1, 0.92, -0.06);
    eye(k, p, r * 0.15, o.iris || '#4a3a2a', skin, o.lid ?? 0.33);
    const b = at(sx * 0.36, 0.3, 0.9, 0.02);
    k.box('plain', r * 0.4, r * 0.07, r * 0.1, o.browColor || '#3a2a20', { x: b[0], y: b[1], z: b[2], rz: sx * -0.15 * (o.frown ?? 1) });
  }
  const m = at(0, -0.46, 0.9, 0.0);
  k.box('skin', r * 0.42, r * 0.05, r * 0.06, o.lip || '#8a4a44', { x: m[0], y: m[1], z: m[2] - r * 0.02, bright: 0.8 });
  return at;
}
