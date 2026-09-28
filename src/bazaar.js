// The Goblin Market's clutter: striped sagging awnings, counters heaped with goods, tents,
// barrels, crates, sacks, carts and lanterns on crooked poles.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { drapery } from './figures.js';

const WARM = '#ffb45e';
const L = (x, z, rot) => (lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];

// A cloth awning of alternating stripes that sags between its poles, with a scalloped fringe
function awning(k, x, y, z, rot, W, D, back, front, cloth, r) {
  const stripes = 7, cream = '#cdbb94';
  for (let s = 0; s < stripes; s++) {
    const g = new THREE.PlaneGeometry(W / stripes, D, 3, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i) + (s + 0.5) * W / stripes - W / 2, lz = -p.getY(i);
      const u = lx / W + 0.5, v = lz / D + 0.5;
      const yy = back + (front - back) * v - 0.16 * Math.sin(Math.PI * v) - 0.14 * Math.sin(Math.PI * u) * v + (r() - 0.5) * 0.02;
      p.setXYZ(i, lx, yy, lz);
    }
    g.computeVertexNormals();
    k.add('velvet', g, s % 2 ? cream : cloth, { x, y, z, ry: rot, bright: 0.9 });
    // fringe: little hanging triangles along the front edge
    for (let f = 0; f < 3; f++) {
      const lx = (s + (f + 0.5) / 3) * W / stripes - W / 2;
      const tri = new THREE.ConeGeometry(0.1, 0.22, 3, 1, true);
      tri.rotateX(Math.PI); tri.scale(1, 1, 0.15);
      const u = lx / W + 0.5;
      k.add('velvet', tri, s % 2 ? cloth : cream, { pre: new THREE.Matrix4().makeTranslation(lx, front - 0.14 * Math.sin(Math.PI * u) - 0.11, D / 2), x, y, z, ry: rot, bright: 0.85 });
    }
  }
}

function barrel(k, x, y, z, r, s = 1) {
  const h = 1.0 * s, rr = 0.36 * s;
  const prof = [[0.001, 0], [rr * 0.84, 0], [rr * 0.97, h * 0.25], [rr, h * 0.5], [rr * 0.97, h * 0.75], [rr * 0.84, h], [0.001, h]].map(([a, b]) => new THREE.Vector2(a, b));
  k.add('wood', new THREE.LatheGeometry(prof, 14), '#5a4030', { x, y, z, ry: r() * 6, bright: 0.8 + r() * 0.3 });
  for (const t of [0.14, 0.86]) {
    const g = new THREE.TorusGeometry(rr * (t < 0.5 ? 0.9 : 0.9), 0.02 * s, 4, 18); g.rotateX(Math.PI / 2);
    k.add('metal', g, '#3a3634', { x, y: y + h * t, z });
  }
}

function crate(k, x, y, z, rot, s, r, fill) {
  k.box('wood', s, s * 0.7, s, '#6a5038', { x, y: y + s * 0.35, z, ry: rot, bright: 0.75 + r() * 0.3 });
  for (const e of [-1, 1]) k.box('wood', s * 1.02, 0.06, 0.08, '#4a3424', { x: x + Math.sin(rot) * e * s * 0.47, y: y + s * 0.6, z: z + Math.cos(rot) * e * s * 0.47, ry: rot });
  if (fill) for (let i = 0; i < 7; i++) {
    const a = r() * 6, d = r() * s * 0.3;
    k.sphere('plain', s * (0.12 + r() * 0.04), fill, { x: x + Math.cos(a) * d, y: y + s * 0.72, z: z + Math.sin(a) * d, ws: 7, hs: 5, bright: 0.75 + r() * 0.45 });
  }
}

function sack(k, x, y, z, r) {
  const g = new THREE.SphereGeometry(0.32, 12, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const yy = p.getY(i); const f = yy > 0.1 ? 1 - (yy - 0.1) * 1.6 : 1 + Math.max(0, -yy) * 0.3; p.setXYZ(i, p.getX(i) * f, yy * 1.1, p.getZ(i) * f); }
  g.computeVertexNormals();
  k.add('cloth', g, '#8a7a5a', { x, y: y + 0.3, z, ry: r() * 6, rz: (r() - 0.5) * 0.3, bright: 0.8 + r() * 0.3 });
  k.cyl('hide', 0.05, 0.07, 0.12, 6, '#4a3a2a', { x, y: y + 0.66, z });
}

function cart(k, T, w, x, z, rot, r) {
  const y = T.heightAt(x, z), P = L(x, z, rot);
  k.box('wood', 1.6, 0.12, 2.6, '#5a4230', { x, y: y + 0.85, z, ry: rot });
  for (const s of [-1, 1]) {
    const [px, pz] = P(s * 0.78, 0); k.box('wood', 0.08, 0.5, 2.6, '#4a3424', { x: px, y: y + 1.15, z: pz, ry: rot });
    const [wx, wz] = P(s * 0.92, -0.3);
    const wh = new THREE.TorusGeometry(0.62, 0.06, 5, 18); wh.rotateY(Math.PI / 2);
    k.add('wood', wh, '#3a2a1e', { x: wx, y: y + 0.62, z: wz, ry: rot });
    for (let sp = 0; sp < 6; sp++) { const a = sp / 6 * Math.PI; k.box('wood', 0.05, 1.2, 0.05, '#3a2a1e', { x: wx, y: y + 0.62, z: wz, ry: rot, rx: a, order: 'YXZ' }); }
  }
  for (const s of [-1, 1]) { const [px, pz] = P(s * 0.45, 2.2); k.box('wood', 0.07, 0.07, 2.2, '#4a3424', { x: px, y: y + 0.55, z: pz, ry: rot, rx: 0.3, order: 'YXZ' }); }
  for (let i = 0; i < 3; i++) { const [px, pz] = P((r() - 0.5) * 0.9, (r() - 0.5) * 1.8); sack(k, px, y + 0.9, pz, r); }
  w.box(x, z, 0.95, 1.4, rot, y - 1, y + 1.4);
}

function tent(k, T, w, x, z, rot, cloth, r) {
  const y = T.heightAt(x, z) - 0.1;
  const R = 2.6 + r() * 0.8, H = 3.6 + r() * 0.8;
  // walls of hanging canvas, open at the front
  drapery(k, 'velvet', cloth, [[R, 0.02, 1, 1], [R * 0.93, 0.5], [R * 0.68, H * 0.42], [R * 0.3, H * 0.78], [0.08, H]], { phi0: rot + 0.45, phiLen: Math.PI * 2 - 0.9, folds: 8, amp: 0.05, ampTop: 0.01, seed: Math.floor(r() * 99), seg: 40, rows: 16, hem: 0.04, x, y, z, ao: 0.5 });
  // front flaps tied back
  for (const s of [-1, 1]) {
    const a = s * 0.45;
    k.cone('velvet', 0.35, H * 0.6, 5, cloth, { x: x + Math.sin(rot + a) * R * 0.8, y: y + H * 0.3, z: z + Math.cos(rot + a) * R * 0.8, bright: 0.75 });
  }
  k.cone('velvet', R * 0.9, H * 0.92, 12, '#0c0a08', { x, y: y + H * 0.46, z, open: true, bright: 0.5 });
  k.cyl('wood', 0.07, 0.07, H + 0.8, 5, '#3a2a1e', { x, y: y + (H + 0.8) / 2, z });
  k.cone('velvet', 0.3, 0.6, 3, ['#c8a040', '#a02a3a', '#3a6a9a'][Math.floor(r() * 3)], { x: x + 0.3, y: y + H + 0.55, z, rz: -Math.PI / 2, sz: 0.1 });
  // a warm lamp inside, glowing out of the door
  k.sphere('glow', 0.14, WARM, { x: x + Math.sin(rot) * 0.8, y: y + 1.6, z: z + Math.cos(rot) * 0.8, bright: 2.5 });
  w.lights.push({ x: x + Math.sin(rot) * 1.5, y: y + 1.6, z: z + Math.cos(rot) * 1.5, color: 0xffa050, intensity: 1.1, range: 12 });
  w.circle(x, z, R * 0.9, y - 1, y + H);
  w.noTrees(x, z, R + 2);
}

// A market stall: counter heaped with goods, a striped awning, hanging herbs and a lantern
export function marketStall(k, w, T, x, z, rot, cloth, seed) {
  const r = mulberry32(seed);
  const y = T.heightAt(x, z), P = L(x, z, rot);
  // counter with a rug thrown over its front
  k.box('wood', 3.2, 1.0, 1.1, '#5a4230', { x, y: y + 0.5, z, ry: rot });
  k.box('wood', 3.4, 0.08, 1.3, '#6a5038', { x, y: y + 1.04, z, ry: rot });
  { const [rx, rz] = P(0, 0.58); k.box('cloth', 2.2, 0.9, 0.04, ['#8a2a2a', '#2a4a6a', '#6a4a1a', '#4a2a5a'][Math.floor(r() * 4)], { x: rx, y: y + 0.6, z: rz, ry: rot }); }
  // posts
  for (const [a, b] of [[-1.65, -0.6], [1.65, -0.6], [-1.65, 1.5], [1.65, 1.5]]) {
    const [px, pz] = P(a, b);
    k.cyl('wood', 0.07, 0.08, b > 0 ? 2.45 : 3.0, 6, '#3a2b20', { x: px, y: y + (b > 0 ? 1.22 : 1.5), z: pz, rz: (r() - 0.5) * 0.06 });
  }
  const [ax, az] = P(0, 0.45);
  awning(k, ax, y, az, rot, 3.6, 2.4, 3.0, 2.45, cloth, r);
  // goods on the counter: one of fruit, potions, pots or curios
  const kind = Math.floor(r() * 4);
  for (let i = 0; i < 5; i++) {
    const [gx, gz] = P(-1.3 + i * 0.65, -0.1 + (r() - 0.5) * 0.2);
    const gy = y + 1.08;
    if (kind === 0) crate(k, gx, gy, gz, rot + (r() - 0.5) * 0.3, 0.42, r, ['#a02a1a', '#c8902a', '#6a8a2a', '#7a3a8a'][i % 4]);
    else if (kind === 1) for (let b = 0; b < 3; b++) {
      const bx = gx + (b - 1) * 0.16, h = 0.18 + r() * 0.16, c = ['#7ad0ff', '#c890ff', '#8aff9a', '#ff8a6a'][Math.floor(r() * 4)];
      k.cyl('glass', 0.06, 0.07, h, 10, '#ffffff', { x: bx, y: gy + h / 2, z: gz });
      k.cyl('glow', 0.05, 0.06, h * 0.6, 8, c, { x: bx, y: gy + h * 0.3, z: gz, bright: 1.6 });
      k.cyl('wood', 0.025, 0.03, 0.05, 6, '#8a6a4a', { x: bx, y: gy + h + 0.02, z: gz });
    }
    else if (kind === 2) { k.lathe('stone', [[0.001, 0], [0.13, 0.02], [0.17, 0.12], [0.12, 0.26], [0.07, 0.3], [0.08, 0.34]], 12, ['#8a5a3a', '#6a6a7a', '#7a4a3a'][i % 3], { x: gx, y: gy, z: gz }); }
    else { k.box('wood', 0.3, 0.2, 0.25, '#4a3020', { x: gx, y: gy + 0.1, z: gz, ry: rot + r() }); k.sphere('metal', 0.07, '#d8b860', { x: gx, y: gy + 0.26, z: gz }); k.sphere('enamel', 0.05, '#e8e0c8', { x: gx + 0.12, y: gy + 0.05, z: gz + 0.08 }); }
  }
  // bundles of herbs and garlic hanging from the awning
  for (let i = 0; i < 5; i++) {
    const [hx, hz] = P(-1.4 + i * 0.7, 0.9);
    k.limb('hide', [hx, y + 2.55, hz], [hx, y + 2.3, hz], 0.006, 0.006, '#3a2a1a', { seg: 3 });
    if (i % 2) k.cone('plain', 0.1, 0.4, 6, ['#5a6a3a', '#6a5a3a'][i % 2], { x: hx, y: y + 2.1, z: hz, rx: Math.PI, bright: 0.8 });
    else for (let g = 0; g < 3; g++) k.sphere('plain', 0.06, '#d8d0b8', { x: hx + (g - 1) * 0.06, y: y + 2.24 - g * 0.05, z: hz, ws: 6, hs: 5 });
  }
  // lantern hanging from the front corner
  const [lx, lz] = P(1.5, 1.45);
  k.limb('metal', [lx, y + 2.4, lz], [lx, y + 2.2, lz], 0.008, 0.008, '#2a2622', { seg: 3 });
  k.cyl('metal', 0.1, 0.13, 0.05, 6, '#2a2622', { x: lx, y: y + 2.18, z: lz });
  k.cyl('glow', 0.09, 0.09, 0.22, 8, WARM, { x: lx, y: y + 2.03, z: lz, bright: 2.8 });
  k.cyl('metal', 0.12, 0.12, 0.03, 6, '#2a2622', { x: lx, y: y + 1.9, z: lz });
  // clutter at the side
  const [bx, bz] = P(-2.25, -0.2); barrel(k, bx, y, bz, r, 0.95);
  const [cx, cz] = P(2.2, -0.4); crate(k, cx, y, cz, rot + 0.4, 0.6, r, null);
  const [sx, sz] = P(2.35, 0.5); sack(k, sx, y, sz, r);
  w.box(x, z, 1.7, 0.65, rot, y - 2, y + 1.1);
  w.lights.push({ x: lx, y: y + 2.0, z: lz, color: 0xffa050, intensity: 1.1, range: 14 });
}

// The outer ring of the market: tents, carts, stacks of barrels and crates, lantern poles
export function marketOuter(k, w, T, cx, cz, seed = 51) {
  const r = mulberry32(seed);
  const tentCols = ['#6a2a2a', '#3a3a6a', '#5a4a2a', '#2a4a3a', '#5a2a4a'];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.55;
    const x = cx + Math.cos(a) * 37, z = cz + Math.sin(a) * 37;
    if (Math.hypot(x - cx, z - (cz - 22)) < 12) continue; // keep Grizzleby's arch clear
    tent(k, T, w, x, z, Math.atan2(cx - x, cz - z), tentCols[i % tentCols.length], r);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.05 + (r() - 0.5) * 0.1, d = 30 + r() * 4;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = T.heightAt(x, z);
    if (Math.hypot(x - cx, z - (cz - 22)) < 8) continue;
    const pick = i % 4;
    if (pick === 0) cart(k, T, w, x, z, a + Math.PI / 2 + (r() - 0.5) * 0.6, r);
    else if (pick === 1) { for (let b = 0; b < 3; b++) barrel(k, x + (b - 1) * 0.75, y, z + (r() - 0.5) * 0.3, r); barrel(k, x - 0.35, y + 1.0, z, r); w.circle(x, z, 1.4, y - 1, y + 2); }
    else if (pick === 2) { crate(k, x, y, z, a, 0.9, r, null); crate(k, x + 0.95, y, z + 0.2, a + 0.3, 0.8, r, '#c8902a'); crate(k, x + 0.4, y + 0.63, z + 0.1, a + 0.1, 0.7, r, null); w.circle(x + 0.4, z, 1.3, y - 1, y + 1.4); }
    else { for (let s = 0; s < 4; s++) sack(k, x + (r() - 0.5) * 1.4, y, z + (r() - 0.5) * 1.4, r); }
  }
  // crooked lantern poles along the paths in
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3, d = 44;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = T.heightAt(x, z);
    const lean = (r() - 0.5) * 0.12;
    k.cyl('wood', 0.07, 0.1, 3.4, 6, '#3a2a1e', { x, y: y + 1.7, z, rz: lean });
    k.box('wood', 0.7, 0.07, 0.07, '#3a2a1e', { x: x + 0.3, y: y + 3.3, z, rz: lean });
    k.cyl('glow', 0.11, 0.11, 0.26, 8, ['#ffb45e', '#c890ff', '#7ad0ff'][i % 3], { x: x + 0.6, y: y + 2.95, z, bright: 2.6 });
    k.cyl('metal', 0.14, 0.1, 0.06, 6, '#2a2622', { x: x + 0.6, y: y + 3.12, z });
    w.lights.push({ x: x + 0.6, y: y + 2.9, z, color: 0xffa050, intensity: 0.8, range: 12 });
    w.circle(x, z, 0.3, y - 1, y + 3.5);
  }
}
