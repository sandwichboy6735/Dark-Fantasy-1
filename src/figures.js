// People with real proportions: hanging robes with folds that deepen toward the hem, shaped
// sleeves, hands, hoods, flowing hair and beards, crumpled witch hats and plate armour.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { hand, humanHead } from './sculpt.js';

const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const lerp = (a, b, t) => a + (b - a) * t;

// Wrap a Kit so everything added through it is scaled about the feet (for children)
export function scaledKit(k, s) {
  if (s === 1) return k;
  const m = new THREE.Matrix4().makeScale(s, s, s);
  const w = Object.create(k);
  w.add = (kind, geo, color, o = {}) => k.add(kind, geo, color, { ...o, parent: o.parent ? m.clone().multiply(o.parent) : m });
  return w;
}

// Sample a profile [[r, y, sx, sz], ...] (bottom to top) at height y
function profAt(prof, y) {
  for (let i = 0; i < prof.length - 1; i++) {
    const a = prof[i], b = prof[i + 1];
    if (y <= b[1] || i === prof.length - 2) {
      const t = Math.min(1, Math.max(0, (y - a[1]) / ((b[1] - a[1]) || 1)));
      return [lerp(a[0], b[0], t), lerp(a[2] ?? 1.1, b[2] ?? 1.1, t), lerp(a[3] ?? 0.85, b[3] ?? 0.85, t)];
    }
  }
  return [prof[0][0], 1.1, 0.85];
}

// Cloth hanging around the body. Folds run down the fabric and deepen toward the hem,
// the hem is uneven, and the troughs of the folds are shaded darker.
export function drapery(k, kind, color, prof, o = {}) {
  const { folds = 9, amp = 0.09, seed = 1, seg = 56, rows = 26, phi0 = 0, phiLen = Math.PI * 2, hem = 0.03, trail = 0, bright = 1, ao = 0.45, grow = 0, x = 0, y = 0, z = 0, ampTop = 0.012 } = o;
  const r = mulberry32(seed);
  const ph = [r() * 6, r() * 6, r() * 6, r() * 6, r() * 6];
  const y0 = prof[0][1], y1 = prof[prof.length - 1][1];
  const pos = [], vcol = [], idx = [];
  for (let i = 0; i <= rows; i++) {
    const yy = lerp(y0, y1, i / rows);
    const h = 1 - i / rows; // 1 at the hem
    const [rad, sx, sz] = profAt(prof, yy);
    const A = ampTop + (amp - ampTop) * Math.pow(h, 1.3);
    for (let j = 0; j <= seg; j++) {
      const phi = phi0 + phiLen * j / seg;
      let f = Math.sin(phi * folds + ph[0] + 0.7 * Math.sin(yy * 2.3 + ph[1])) * 0.65 + Math.sin(phi * (folds * 2 + 1) + ph[2] + yy * 1.7) * 0.35;
      f = Math.sign(f) * Math.pow(Math.abs(f), 0.75);
      const rr = (rad + grow) * (1 + A * f);
      const back = (1 - Math.cos(phi)) / 2;
      let px = Math.sin(phi) * rr * sx, pz = Math.cos(phi) * rr * sz, py = yy;
      if (i === 0) py += (Math.sin(phi * 3 + ph[3]) * 0.5 + Math.sin(phi * 7 + ph[4]) * 0.5) * hem - hem * 0.5;
      if (trail) { const tt = Math.pow(h, 3) * back * back; pz -= trail * tt; py = Math.max(py - trail * 0.15 * tt, 0.01); }
      pos.push(px + x, Math.max(py, 0.005) + y, pz + z);
      vcol.push((1 - ao * (0.5 - 0.5 * f) * (0.35 + h)) * lerp(0.72, 1, Math.min(1, yy / 0.45)));
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + seg + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  k.add(kind, g, color, { vcol, bright });
  return (yy, phi = 0) => { const [rad, sx, sz] = profAt(prof, yy); return [Math.sin(phi) * rad * sx, yy, Math.cos(phi) * rad * sz]; };
}

// A tube along a curve with a radius that changes along it (sleeves, hair, beards, feathers, hats)
export function sweep(k, kind, color, pts, radii, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(V3));
  const ts = o.ts || 14, rs = o.rs || 10;
  const g = new THREE.TubeGeometry(curve, ts, 1, rs, false);
  const p = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  const R = (t) => { const n = radii.length - 1, f = Math.min(n - 1e-6, t * n), i = Math.floor(f); return lerp(radii[i], radii[i + 1], f - i); };
  const vcol = [];
  for (let i = 0; i <= ts; i++) {
    const t = i / ts;
    curve.getPointAt(t, c);
    for (let j = 0; j <= rs; j++) {
      const id = i * (rs + 1) + j;
      const fold = o.folds ? Math.sin(j / rs * Math.PI * 2 * o.folds + i * 0.35 + (o.seed || 0)) : 0;
      const w = 1 + fold * (o.foldAmp ?? 0.12) * (o.foldGrow ? t : 1);
      v.fromBufferAttribute(p, id).sub(c).multiplyScalar(R(t) * w);
      if (o.flat) v.y *= o.flat;
      p.setXYZ(id, c.x + v.x, c.y + v.y, c.z + v.z);
      vcol.push(1 - (o.ao ?? 0.3) * (0.5 - 0.5 * fold) * (o.foldGrow ? t : 1));
    }
  }
  g.computeVertexNormals();
  k.add(kind, g, color, { vcol, bright: o.bright ?? 1 });
  return curve;
}

// A hood around the head: a shell open at the face, peaked at the back, with a dark hollow inside
export function hood(k, kind, color, c, r, o = {}) {
  const src = new THREE.SphereGeometry(r, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.66);
  const p = src.attributes.position;
  const rr = mulberry32(o.seed || 3);
  const ph = rr() * 6;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), zz = p.getZ(i);
    const back = Math.max(0, -zz / r), top = Math.max(0, y / r);
    zz -= r * 0.45 * back * back * top; // the peak of the hood falls back
    y += r * 0.12 * back * top;
    const a = Math.atan2(x, zz);
    const f = 1 + Math.sin(a * 7 + ph + y * 8) * 0.03 * (1 - top);
    p.setXYZ(i, x * 1.06 * f, y * 1.12, zz * f);
  }
  // open only where the face is: drop triangles facing forward below the brow
  const idx = src.index.array, keep = [];
  const d = new THREE.Vector3();
  const faceOpen = o.faceOpen ?? 0.5;
  for (let t = 0; t < idx.length; t += 3) {
    d.set(0, 0, 0);
    for (let j = 0; j < 3; j++) d.x += p.getX(idx[t + j]), d.y += p.getY(idx[t + j]), d.z += p.getZ(idx[t + j]);
    d.normalize();
    const ell = (d.x / 0.62) ** 2 + ((d.y + 0.15) / 0.62) ** 2;
    if (d.z > 0 && ell < 1 && d.z > faceOpen * 0.5) continue;
    keep.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  src.setIndex(keep); src.computeVertexNormals();
  k.add(kind, src, color, { x: c[0], y: c[1], z: c[2], rx: -0.12, bright: o.bright ?? 0.9 });
  k.sphere('plain', r * 0.9, '#08060a', { x: c[0], y: c[1] - r * 0.05, z: c[2] - r * 0.14, ws: 14, hs: 10 });
}

// Hair: a cap over the crown and strands falling down the back and over the shoulders
export function hair(k, at, hc, r, color, o = {}) {
  const long = o.long ?? 0.45;
  const cap = new THREE.SphereGeometry(r * 1.07, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.56);
  cap.scale(0.97, 1.1, 1.05);
  k.add('velvet', cap, color, { x: hc[0], y: hc[1] + r * 0.02, z: hc[2] - r * 0.05, rx: -0.55, bright: 0.85 });
  // a hanging mass of locks around the back and sides of the head, spreading over the shoulders
  const y = hc[1], yEnd = y - r - long;
  const prof = [[r * 0.95, y + r * 0.55, 1, 1], [r * 1.08, y, 1, 1.02], [r * 1.06, y - r * 0.7, 1, 1]];
  if (yEnd < y - r * 1.4) prof.unshift([Math.min(0.15, r * 1.3), Math.max(yEnd, y - r * 1.4), 1.05, 0.95]);
  if (yEnd < 1.42) prof.unshift([0.24, Math.max(yEnd, 1.4), 1.12, 0.78]);
  if (yEnd < 1.38) prof.unshift([0.25, yEnd, 1.12, 0.8]);
  drapery(k, 'velvet', color, prof, { phi0: 0.95, phiLen: Math.PI * 2 - 1.9, folds: 16, amp: 0.1, ampTop: 0.03, seed: o.seed || 17, seg: 60, rows: 22, hem: 0.05, ao: 0.6, z: hc[2] - 0.01 });
  // a few loose locks over the shoulders
  const rnd = mulberry32((o.seed || 17) + 4);
  if (long > 0.3) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const b = at(s * 0.9, -0.1 - i * 0.1, 0.35 - i * 0.12, 0.05);
    const L = long * (0.7 + rnd() * 0.3);
    sweep(k, 'velvet', color, [b, [b[0] + s * 0.03, b[1] - 0.12, b[2] + 0.03], [b[0] + s * (0.06 + i * 0.02), Math.max(b[1] - L * 0.6, 1.3), b[2] + 0.06], [b[0] + s * (0.07 + i * 0.02), b[1] - L, b[2] + 0.07]], [r * 0.16, r * 0.2, r * 0.18, r * 0.03], { ts: 12, rs: 8, folds: 2, foldAmp: 0.25, ao: 0.3 });
  }
}

// Beard and moustache of flowing locks
export function beard(k, at, color, len = 0.45, o = {}) {
  const rnd = mulberry32(o.seed || 29);
  const n = o.n ?? 30;
  for (let i = 0; i < n; i++) {
    const t = lerp(-1.2, 1.2, i / (n - 1));
    const b = at(Math.sin(t) * 0.9, -0.42 - Math.abs(t) * 0.12, Math.cos(t) * 0.9, 0.02);
    const L = len * (1 - Math.abs(t) * 0.35) * (0.8 + rnd() * 0.35);
    const x = b[0], z0 = Math.max(b[2] + 0.04, o.chestZ ?? 0.18);
    const pts = [b, [x * 1.05, b[1] - L * 0.2, b[2] + 0.04], [x * 0.75 + (rnd() - 0.5) * 0.03, b[1] - L * 0.6, z0 + 0.02], [x * 0.45 + (rnd() - 0.5) * 0.05, b[1] - L, z0 + (rnd() - 0.3) * 0.03]];
    sweep(k, 'plain', color, pts, [0.018, 0.02, 0.013, 0.003], { ts: 10, rs: 6, ao: 0, bright: 0.8 + rnd() * 0.35 });
  }
  for (const sx of [-1, 1]) {
    const b = at(sx * 0.05, -0.3, 1, 0.03), m = at(sx * 0.3, -0.42, 0.95, 0.06);
    sweep(k, 'plain', color, [b, m, [m[0] + sx * 0.03, m[1] - 0.07, m[2] - 0.01]], [0.012, 0.014, 0.004], { ts: 8, rs: 6, ao: 0, bright: 0.95 });
  }
}

// A tall crumpled witch's or wizard's hat with a wavy, drooping brim and a band
export function pointyHat(k, c, o = {}) {
  const { color = '#1e1a30', ri = 0.13, ro = 0.4, h = 0.62, bend = 0.3, band = '#3a2a2a', seed = 5, tilt = -0.08 } = o;
  const rnd = mulberry32(seed);
  const m = new THREE.Matrix4().makeRotationX(tilt).setPosition(c[0], c[1], c[2]);
  const P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(m).toArray();
  // brim
  const seg = 48, rings = 7, pos = [], idx = [];
  const ph = rnd() * 6;
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= seg; j++) {
    const u = i / rings, a = j / seg * Math.PI * 2, rr = lerp(ri * 0.95, ro, u);
    const droop = -0.07 * u * u * (1 + 0.6 * Math.sin(a * 2 + ph)) + 0.015 * u * Math.sin(a * 5 + ph * 2);
    pos.push(...P(Math.sin(a) * rr, droop, Math.cos(a) * rr));
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  k.add('velvet', g, color, { bright: 0.9 });
  // crumpled cone along a bending spine
  const spine = [P(0, -0.01, 0), P(0, h * 0.35, -bend * 0.05), P(0, h * 0.66, -bend * 0.3), P(0, h * 0.86, -bend * 0.75), P(0, h * 0.84 - bend * 0.25, -bend * 1.25)];
  sweep(k, 'velvet', color, spine, [ri, ri * 0.74, ri * 0.46, ri * 0.24, ri * 0.03], { ts: 24, rs: 20, folds: 3, foldAmp: 0.09, ao: 0.4, seed: ph, bright: 0.95 });
  // band and buckle
  const bandG = new THREE.CylinderGeometry(ri * 0.94, ri * 1.0, 0.055, 24, 1, true);
  k.add('cloth', bandG, band, { pre: new THREE.Matrix4().makeTranslation(0, 0.03, 0), parent: m });
  if (o.buckle !== false) k.box('metal', 0.05, 0.045, 0.012, '#c8a860', { pre: new THREE.Matrix4().makeTranslation(0, 0.03, ri * 1.0), parent: m });
}

// Arms in sleeves ending in hands. pose: 'clasp' | 'side' | 'staff' | 'out'
function arms(k, o, skin) {
  const { sleeve = '#3a3a7a', kind = 'velvet', bell = 0, pose = 'side', sh = 0.235, shY = 1.38, handSize = 0.72, left = null } = o;
  const poses = {
    clasp: (s) => ({ el: [s * 0.27, 1.1, 0.05], wr: [s * 0.1, 0.96, 0.21], fwd: [-s * 0.8, -0.2, 0.45], up: [0, 0.3, 1] }),
    side: (s) => ({ el: [s * 0.3, 1.1, 0.02], wr: [s * 0.31, 0.84, 0.08], fwd: [s * 0.05, -1, 0.15], up: [s, 0, 0.1] }),
    staff: (s) => ({ el: [s * 0.33, 1.12, 0.12], wr: [s * 0.38, 1.1, 0.27], fwd: [-s * 0.3, 0.1, 0.9], up: [s * 0.3, 1, 0] }),
    out: (s) => ({ el: [s * 0.36, 1.18, 0.1], wr: [s * 0.44, 1.1, 0.34], fwd: [s * 0.3, 0.1, 1], up: [0, 1, 0] }),
  };
  for (const s of [-1, 1]) {
    const pz = (s < 0 && left) ? poses[left](s) : poses[pose](s);
    const a = [s * sh, shY, 0], e = pz.el, w = pz.wr;
    const d = [w[0] - e[0], w[1] - e[1], w[2] - e[2]], L = Math.hypot(...d);
    const cuff = [w[0] + d[0] / L * (0.03 + bell * 0.25), w[1] + d[1] / L * (0.03 + bell * 0.25), w[2] + d[2] / L * (0.03 + bell * 0.25)];
    sweep(k, kind, sleeve, [[s * (sh - 0.03), shY + 0.02, 0], a, e, w, cuff], [0.075, 0.078, 0.066, 0.058 + bell * 0.3, 0.06 + bell], { ts: 16, rs: 14, folds: 4, foldAmp: 0.1, foldGrow: true, ao: 0.4 });
    const hp = [w[0] + d[0] / L * 0.06, w[1] + d[1] / L * 0.06, w[2] + d[2] / L * 0.06];
    hand(k, hp, pz.fwd, pz.up, skin, handSize, o.nails || '#c8a090', pz === poses.clasp ? 0.6 : 0.35, o.handKind || 'skin');
  }
}

// A robed person. Returns { at, headY, headZ }
export function robedFigure(k, o = {}) {
  const skin = o.skin || '#e0b89a';
  const seed = o.seed || 7;
  const robe = o.robe || '#3a3a7a';
  const prof = o.prof || [[0.39, 0, 1.08, 0.92], [0.33, 0.28], [0.27, 0.62], [0.225, 0.92, 1.15, 0.85], [0.19, 1.04, 1.15, 0.82], [0.205, 1.2, 1.18, 0.8], [0.205, 1.3, 1.2, 0.78], [0.185, 1.4, 1.3, 0.75], [0.12, 1.47, 1.15, 0.9], [0.075, 1.51, 1, 1]];
  drapery(k, o.robeKind || 'velvet', robe, prof, { folds: o.folds || 9, amp: o.amp ?? 0.1, seed, trail: o.trail || 0, hem: o.hem ?? 0.03 });
  // belt or sash
  if (o.belt !== false) {
    const [br, bsx, bsz] = profAt(prof, 1.02);
    const t = new THREE.TorusGeometry(br * 1.03, 0.018, 6, 36); t.rotateX(Math.PI / 2); t.scale(bsx, 1, bsz);
    k.add('hide', t, o.belt || '#2a1e16', { y: 1.02 });
    k.box('metal', 0.05, 0.045, 0.015, '#b89a60', { y: 1.02, z: br * bsz * 1.03 + 0.012 });
    if (o.pouch) k.sphere('hide', 0.06, '#4a3424', { x: br * bsx * 0.8, y: 0.93, z: br * bsz * 0.6, sy: 1.2, sz: 0.6 });
  }
  if (o.apron) drapery(k, 'cloth', o.apron, [[0.345, 0.3, 1.08, 0.92], [0.285, 0.62], [0.235, 0.92, 1.15, 0.85], [0.2, 1.04, 1.15, 0.82]], { phi0: -0.85, phiLen: 1.7, folds: 5, amp: 0.05, seed: seed + 3, seg: 18, rows: 10, grow: 0.012, hem: 0.01 });
  // neck and head
  k.limb('skin', [0, 1.44, 0.0], [0, 1.6, 0.015], 0.052, 0.046, skin, { seg: 12 });
  const hc = [0, 1.68, 0.02], hr = o.headR || 0.115;
  const at = humanHead(k, hc, hr, skin, { seed, ...(o.face || {}) });
  // collar or cowl
  if (o.cowl) drapery(k, 'velvet', o.cowl, [[0.23, 1.3, 1.32, 0.95], [0.16, 1.43, 1.15, 1], [0.085, 1.53, 1, 1]], { folds: 7, amp: 0.08, seed: seed + 5, seg: 40, rows: 10, hem: 0.02 });
  if (o.cloak) drapery(k, 'velvet', o.cloak, [[0.44, 0.02, 1.1, 1.0], [0.37, 0.5], [0.29, 1.05, 1.2, 0.95], [0.27, 1.3, 1.3, 0.95], [0.2, 1.43, 1.3, 1], [0.1, 1.51, 1.1, 1]], { phi0: Math.PI * 0.3, phiLen: Math.PI * 1.4, folds: 8, amp: 0.13, seed: seed + 9, z: -0.02, trail: o.cloakTrail || 0.05, hem: 0.03 });
  arms(k, { sleeve: o.sleeve || robe, kind: o.robeKind || 'velvet', bell: o.bell ?? 0.03, pose: o.pose || 'side', left: o.left, nails: o.nails }, skin);
  if (o.hair) hair(k, at, hc, hr, o.hair, { long: o.hairLong ?? 0.4, n: o.hairN ?? 28, seed: seed + 1 });
  if (o.beard) beard(k, at, o.beard, o.beardLen ?? 0.4, { seed: seed + 2 });
  if (o.hood) hood(k, 'velvet', o.hood, [0, 1.69, -0.005], hr * 1.42, { seed });
  return { at, headY: hc[1], headZ: hc[2], hc, hr };
}

// A knight in plate: cuirass, tassets, pauldrons, greaves, a visored helm, a tabard and cape
export function knightFigure(k, o = {}) {
  const steel = o.steel || '#b4b8c8', dark = '#3a3c46', tab = o.tabard || '#2a3a7a';
  const M = 'metal';
  // legs: mail, then cuisses, knee cops, greaves and sabatons
  for (const s of [-1, 1]) {
    const hip = [s * 0.11, 0.9, 0], knee = [s * 0.12, 0.5, 0.03], ank = [s * 0.12, 0.1, 0];
    k.limb(M, hip, knee, 0.085, 0.07, steel, { seg: 14 });
    k.sphere(M, 0.065, steel, { x: knee[0], y: knee[1], z: knee[2] + 0.02, ws: 14, hs: 10 });
    k.add(M, new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), steel, { x: knee[0] + s * 0.03, y: knee[1], z: knee[2] + 0.02, dir: [s, 0.2, 0.4], sy: 0.4 });
    k.limb(M, knee, ank, 0.065, 0.05, steel, { seg: 14 });
    k.sphere(M, 0.07, steel, { x: s * 0.12, y: 0.05, z: 0.06, sz: 2.0, sy: 0.65, ws: 14, hs: 10 });
  }
  // cuirass with a keel down the front, and a flared skirt of lames
  drapery(k, M, steel, [[0.2, 0.95, 1.15, 0.85], [0.18, 1.05, 1.15, 0.85], [0.21, 1.2, 1.2, 0.9], [0.215, 1.32, 1.2, 0.88], [0.18, 1.42, 1.3, 0.8], [0.1, 1.5, 1.1, 0.95]], { folds: 0, amp: 0, ampTop: 0, seg: 40, rows: 14, hem: 0, ao: 0, seed: 3 });
  k.limb(M, [0, 1.0, 0.165], [0, 1.36, 0.205], 0.012, 0.012, '#d8dce8', { seg: 5 });
  for (let i = 0; i < 3; i++) {
    const y = 0.95 - i * 0.07, r0 = 0.21 + i * 0.022;
    const g = new THREE.CylinderGeometry(r0, r0 + 0.035, 0.085, 36, 1, true); g.scale(1.15, 1, 0.9);
    k.add(M, g, i % 2 ? steel : '#a4a8b8', { y });
  }
  // tabard front and back panels with folds, and the crest
  drapery(k, 'cloth', tab, [[0.275, 0.55, 1.15, 0.95], [0.25, 0.8, 1.15, 0.95], [0.225, 0.98, 1.18, 0.95], [0.235, 1.2, 1.25, 0.98], [0.2, 1.4, 1.35, 0.9]], { phi0: -0.62, phiLen: 1.24, folds: 5, amp: 0.06, seed: 11, seg: 20, rows: 14, hem: 0.02 });
  drapery(k, 'cloth', tab, [[0.275, 0.55, 1.15, 0.95], [0.25, 0.8, 1.15, 0.95], [0.225, 0.98, 1.18, 0.95], [0.235, 1.2, 1.25, 0.98], [0.2, 1.4, 1.35, 0.9]], { phi0: Math.PI - 0.62, phiLen: 1.24, folds: 5, amp: 0.06, seed: 12, seg: 20, rows: 14, hem: 0.02 });
  {
    const crest = new THREE.Shape(); crest.moveTo(-0.07, 0.08); crest.lineTo(0.07, 0.08); crest.lineTo(0.07, -0.01); crest.quadraticCurveTo(0.06, -0.07, 0, -0.1); crest.quadraticCurveTo(-0.06, -0.07, -0.07, -0.01); crest.closePath();
    const g = new THREE.ExtrudeGeometry(crest, { depth: 0.01, bevelEnabled: false });
    k.add('enamel', g, o.crest || '#e0c060', { y: 1.2, z: 0.235 });
    k.box('enamel', 0.018, 0.14, 0.012, tab, { y: 1.19, z: 0.247 }); k.box('enamel', 0.1, 0.018, 0.012, tab, { y: 1.22, z: 0.247 });
  }
  k.add('hide', (() => { const t = new THREE.TorusGeometry(0.205, 0.02, 6, 36); t.rotateX(Math.PI / 2); t.scale(1.18, 1, 0.98); return t; })(), '#2a1e16', { y: 0.99 });
  // cape
  drapery(k, 'velvet', o.cape || '#1c2250', [[0.42, 0.12, 1.1, 1.0], [0.36, 0.6], [0.3, 1.1, 1.25, 0.95], [0.28, 1.35, 1.35, 0.95], [0.2, 1.46, 1.3, 1]], { phi0: Math.PI * 0.32, phiLen: Math.PI * 1.36, folds: 7, amp: 0.13, seed: 21, z: -0.04, trail: 0.06 });
  // pauldrons of overlapping lames, then arms in plate with gauntlets
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.SphereGeometry(0.13 - i * 0.012, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
      k.add(M, g, i % 2 ? '#a8acbc' : steel, { x: s * (0.25 + i * 0.012), y: 1.42 - i * 0.055, z: 0, dir: [s * 0.8, 1, 0], sz: 1.1 });
    }
    const a = [s * 0.27, 1.34, 0], e = [s * 0.31, 1.08, 0.06], w = o.spear && s > 0 ? [s * 0.36, 1.08, 0.24] : [s * 0.3, 0.86, 0.12];
    k.limb(M, a, e, 0.065, 0.058, steel, { seg: 12 });
    k.sphere(M, 0.06, steel, { x: e[0], y: e[1], z: e[2], ws: 12, hs: 10 });
    k.add(M, new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), steel, { x: e[0], y: e[1], z: e[2] - 0.03, dir: [0, 0, -1], sy: 0.5 });
    k.limb(M, e, w, 0.058, 0.05, steel, { seg: 12 });
    k.cyl(M, 0.06, 0.05, 0.07, 12, '#a4a8b8', { x: w[0], y: w[1], z: w[2], dir: [w[0] - e[0], w[1] - e[1], w[2] - e[2]] });
    const d = [w[0] - e[0], w[1] - e[1], w[2] - e[2]], L = Math.hypot(...d);
    const hp = [w[0] + d[0] / L * 0.07, w[1] + d[1] / L * 0.07, w[2] + d[2] / L * 0.07];
    if (o.spear && s > 0) hand(k, hp, [-0.4, 0, 0.9], [0.2, 1, 0], '#8a8c98', 0.78, '#6a6c78', 0.8, M);
    else hand(k, hp, [s * 0.05, -1, 0.2], [s, 0, 0.1], '#8a8c98', 0.78, '#6a6c78', 0.5, M);
  }
  // gorget and a mail aventail
  drapery(k, M, '#6a6c78', [[0.17, 1.4, 1.2, 1], [0.1, 1.52, 1, 1], [0.08, 1.58, 1, 1]], { folds: 14, amp: 0.03, seed: 4, seg: 36, rows: 8, hem: 0.005, ao: 0.2 });
  // helm: rounded skull with a point, a snouted visor with a sight slit and breaths
  const hc = [0, 1.7, 0.01];
  const helm = new THREE.SphereGeometry(0.135, 32, 22);
  { const p = helm.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > 0) { const t = y / 0.135; y += t * t * t * 0.035; z -= t * t * 0.02; } if (z > 0 && y < 0.05) { const t = z / 0.135; z += t * t * 0.07 * Math.max(0, 1 - Math.abs(x) / 0.1) * (1 - Math.abs(y + 0.02) / 0.12); } p.setXYZ(i, x * 0.94, y * 1.02, z); } helm.computeVertexNormals(); }
  k.add(M, helm, steel, { x: hc[0], y: hc[1], z: hc[2] });
  k.box('plain', 0.16, 0.012, 0.03, '#050508', { x: 0, y: hc[1] + 0.02, z: hc[2] + 0.13, rx: 0.1 });
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) k.sphere('plain', 0.006, '#050508', { x: s * (0.035 + (i % 3) * 0.018), y: hc[1] - 0.04 - Math.floor(i / 3) * 0.022, z: hc[2] + 0.165 - (i % 3) * 0.01, ws: 5, hs: 4 });
  k.add(M, new THREE.TorusGeometry(0.128, 0.009, 6, 36), '#d8c890', { x: hc[0], y: hc[1] + 0.015, z: hc[2], rx: Math.PI / 2 + 0.12 });
  // plume
  if (o.plume !== false) {
    const top = [0, hc[1] + 0.21, hc[2] - 0.03];
    for (let i = 0; i < 7; i++) {
      const s = (i - 3) * 0.018;
      sweep(k, 'cloth', o.plume || '#a01a2a', [top, [s, top[1] + 0.12, top[2] - 0.12], [s * 1.6, top[1] + 0.08, top[2] - 0.32], [s * 2.2, top[1] - 0.06, top[2] - 0.45 - Math.abs(s)]], [0.02, 0.03, 0.022, 0.004], { ts: 12, rs: 6, flat: 0.5, ao: 0, bright: 0.8 + (i % 3) * 0.12 });
    }
  }
  // sword at the hip
  k.limb('hide', [-0.26, 0.98, 0.05], [-0.33, 0.28, -0.05], 0.03, 0.022, '#2a1e18', { seg: 8 });
  k.box(M, 0.2, 0.025, 0.035, '#d8c890', { x: -0.255, y: 1.02, z: 0.055, rz: 0.1 });
  k.limb('hide', [-0.25, 1.03, 0.055], [-0.245, 1.16, 0.06], 0.014, 0.014, '#3a2418', { seg: 6 });
  k.sphere(M, 0.024, '#d8c890', { x: -0.244, y: 1.18, z: 0.06 });
  // shield
  if (o.shield !== false) {
    const sh = new THREE.Shape(); sh.moveTo(-0.26, 0.3); sh.quadraticCurveTo(0, 0.36, 0.26, 0.3); sh.lineTo(0.25, 0.0); sh.quadraticCurveTo(0.2, -0.32, 0, -0.5); sh.quadraticCurveTo(-0.2, -0.32, -0.25, 0.0); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.018, bevelSegments: 2, curveSegments: 10 });
    k.add('enamel', g, o.shield || '#5a2a2a', { x: -0.42, y: 1.02, z: 0.08, ry: -Math.PI / 2 + 0.35, rz: 0.05, order: 'YXZ' });
    const rim = g.clone(); rim.scale(1.04, 1.04, 0.7);
    k.add(M, rim, '#8a7a50', { x: -0.415, y: 1.02, z: 0.076, ry: -Math.PI / 2 + 0.35, order: 'YXZ' });
    k.box('enamel', 0.012, 0.5, 0.06, o.crest || '#e0c060', { x: -0.466, y: 0.98, z: 0.096, ry: 0.35 });
    k.box('enamel', 0.012, 0.06, 0.34, o.crest || '#e0c060', { x: -0.466, y: 1.08, z: 0.096, ry: 0.35 });
  }
  if (o.spear) {
    k.cyl('wood', 0.02, 0.024, 2.5, 8, '#4a3526', { x: 0.39, y: 1.2, z: 0.3 });
    k.cone(M, 0.04, 0.28, 4, '#d8dce8', { x: 0.39, y: 2.58, z: 0.3, sz: 0.3 });
    k.box(M, 0.14, 0.02, 0.02, '#a4a8b8', { x: 0.39, y: 2.44, z: 0.3 });
    sweep(k, 'cloth', o.plume || '#a01a2a', [[0.39, 2.4, 0.3], [0.39, 2.36, 0.12], [0.39, 2.22, -0.08]], [0.05, 0.045, 0.004], { ts: 8, rs: 6, flat: 0.15, ao: 0 });
  }
  return { headY: hc[1], headZ: hc[2] };
}
