// Builders for every place in Moonveil. Each area is merged into a handful of meshes.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { ROADS, ISLES, LIFTS, steppingStones, WATER_Y } from './layout.js';
import { Simplex } from './noise.js';

const STONE = '#8f8898', STONE_WARM = '#958a80', SLATE = '#56526e', PLASTER = '#d6c8b0', TIMBER = '#4a3526';
const WARM = '#ffb45e', DARKWIN = '#16141c';
const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

function win(k, x, y, z, ry, lit, s = 1, color = WARM) {
  if (lit) k.box('glow', 0.75 * s, 1.25 * s, 0.25, color, { x, y, z, ry, bright: 1.8 + rnd() * 1.2 });
  else k.box('plain', 0.75 * s, 1.25 * s, 0.25, DARKWIN, { x, y, z, ry });
}

// Local-to-world for things rotated about y by rot
const L = (x, z, rot) => (lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];

function prism(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

export function tower(k, w, x, y, z, r, h, o = {}) {
  const color = o.color || STONE;
  const roofH = o.roofH ?? r * 2.2;
  k.cyl('stone', r, r * 1.06, h + 4, 16, color, { x, y: y + h / 2 - 2, z });
  k.cyl('stone', r * 1.15, r * 1.02, 1.6, 16, color, { x, y: y + h - 0.4, z });
  // corbels under the parapet and bands of darker stone
  const nc = Math.max(10, Math.round(r * 3.2));
  for (let i = 0; i < nc; i++) {
    const a = (i / nc) * Math.PI * 2;
    k.box('stone', 0.35, 0.6, 0.5, '#6e6860', { x: x + Math.cos(a) * r * 1.03, y: y + h - 1.45, z: z + Math.sin(a) * r * 1.03, ry: Math.PI / 2 - a });
  }
  k.cyl('stone', r * 1.03, r * 1.07, 0.35, 16, '#6e6860', { x, y: y + 1.2, z });
  // arrow slits
  for (let row = 0; row < Math.max(1, Math.floor(h / 6)); row++) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4 + row * 0.8;
    k.box('plain', 0.16, 1.2, 0.2, '#0c0a10', { x: x + Math.cos(a) * (r + 0.01), y: y + 2.5 + row * 6, z: z + Math.sin(a) * (r + 0.01), ry: Math.PI / 2 - a });
  }
  if (o.roof !== false) {
    k.cone('roof', r * 1.32, roofH, 16, o.roofColor || SLATE, { x, y: y + h + roofH / 2 + 0.3, z });
    k.cone('metal', 0.12, 2.2, 6, '#c9a860', { x, y: y + h + roofH + 1.2, z });
    if (w.flags && o.flag !== false) {
      k.cyl('metal', 0.05, 0.05, 3, 5, '#3a3430', { x, y: y + h + roofH + 2.8, z });
      w.flags.push({ x, y: y + h + roofH + 3.9, z, color: o.flagColor || (rnd() < 0.5 ? '#7a1420' : '#1e2a6a'), size: Math.max(1, r * 0.4) });
    }
  } else {
    const n = Math.max(8, Math.round(r * 2.2));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      k.box('stone', 0.9, 1.2, 0.9, color, { x: x + Math.cos(a) * r * 1.08, y: y + h + 0.9, z: z + Math.sin(a) * r * 1.08, ry: Math.PI / 2 - a });
    }
  }
  const rows = Math.max(1, Math.floor((h - 5) / 5));
  for (let row = 0; row < rows; row++) {
    const count = 3 + (r > 4 ? 2 : 0);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + row * 0.7;
      win(k, x + Math.cos(a) * (r + 0.02), y + 4 + row * 5, z + Math.sin(a) * (r + 0.02), Math.PI / 2 - a, rnd() < (o.lit ?? 0.65), 1, o.winColor);
    }
  }
  w.circle(x, z, r * 1.08, y - 6, y + h + roofH);
  if (o.light !== false) w.lights.push({ x, y: y + h * 0.6, z, color: o.lightColor || 0xffa055, intensity: 1.4, range: 30 });
}

export function wallSeg(k, w, x1, z1, x2, z2, y, h, thick, color = STONE) {
  const len = Math.hypot(x2 - x1, z2 - z1), rot = Math.atan2(-(z2 - z1), x2 - x1);
  const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
  k.box('stone', len, h + 4, thick, color, { x: mx, y: y + h / 2 - 2, z: mz, ry: rot });
  const n = Math.floor(len / 2.2);
  for (let i = 0; i <= n; i += 1) {
    const t = n ? i / n : 0.5;
    k.box('stone', 1.1, 1.3, thick + 0.1, color, { x: x1 + (x2 - x1) * t, y: y + h + 0.65, z: z1 + (z2 - z1) * t, ry: rot });
  }
  w.wall(x1, z1, x2, z2, thick, y - 6, y + h + 1.3);
}

// ---------- Village pieces ----------
export function cottage(k, w, T, x, z, rot, o = {}) {
  const W = o.w || 7, D = o.d || 5.5, wallH = o.h || 3.4, roofH = o.roofH || 3.6;
  const P = L(x, z, rot);
  let y = Infinity;
  for (const [a, b] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [0, 0]]) { const [px, pz] = P(a, b); y = Math.min(y, T.heightAt(px, pz)); }
  const base = y + 0.9;
  k.box('stone', W + 0.3, 4, D + 0.3, STONE_WARM, { x, y: base - 2, z, ry: rot });
  k.box('plain', W, wallH, D, o.plaster || PLASTER, { x, y: base + wallH / 2, z, ry: rot });
  // timber framing
  for (const [a, b, len, alongX] of [[0, D / 2 + 0.05, W, true], [0, -D / 2 - 0.05, W, true], [W / 2 + 0.05, 0, D, false], [-W / 2 - 0.05, 0, D, false]]) {
    const [px, pz] = P(a, b);
    k.box('wood', alongX ? len + 0.2 : 0.2, 0.22, alongX ? 0.2 : len + 0.2, TIMBER, { x: px, y: base + wallH * 0.5, z: pz, ry: rot });
    k.box('wood', alongX ? len + 0.2 : 0.2, 0.25, alongX ? 0.2 : len + 0.2, TIMBER, { x: px, y: base + wallH - 0.1, z: pz, ry: rot });
  }
  for (const [a, b] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [0, D / 2], [0, -D / 2]]) {
    const [px, pz] = P(a * 1.01, b * 1.01);
    k.box('wood', 0.26, wallH, 0.26, TIMBER, { x: px, y: base + wallH / 2, z: pz, ry: rot });
  }
  const roofKind = o.slate ? 'roof' : 'thatch';
  k.add(roofKind, prism(D + 1.2, roofH, W + 1.4), o.slate ? SLATE : '#b8a07c', { x, y: base + wallH - 0.05, z, ry: rot, pre: new THREE.Matrix4().makeRotationY(Math.PI / 2) });
  // chimney
  const [chx, chz] = P(W / 2 - 1.1, -0.6);
  k.box('stone', 0.9, roofH + 2.4, 0.9, STONE_WARM, { x: chx, y: base + wallH + roofH / 2 + 0.6, z: chz, ry: rot });
  w.chimneys.push({ x: chx, y: base + wallH + roofH + 1.9, z: chz });
  // windows & door
  for (const side of [1, -1]) {
    for (const a of [-W / 4, W / 4]) {
      const [px, pz] = P(a, side * (D / 2 + 0.03));
      win(k, px, base + 1.9, pz, rot + (side > 0 ? 0 : Math.PI), rnd() < 0.85, 0.9);
    }
  }
  const [dx, dz] = P(0.2, D / 2 + 0.05);
  k.box('wood', 1.1, 2.0, 0.2, '#3a2a1e', { x: dx, y: base + 1.0, z: dz, ry: rot });
  const [gx, gz] = P(-W / 2 - 0.03, 0);
  win(k, gx, base + 1.9, gz, rot - Math.PI / 2, rnd() < 0.7, 0.9);
  w.box(x, z, W / 2 + 0.3, D / 2 + 0.3, rot, y - 4, base + wallH + roofH);
  w.noTrees(x, z, Math.max(W, D) + 3);
  w.lights.push({ x, y: base + 2, z, color: 0xffa050, intensity: 1.2, range: 22 });
  return base;
}

export function chapel(k, w, T, x, z, rot) {
  const y = T.heightAt(x, z) + 0.3;
  const P = L(x, z, rot);
  k.box('stone', 9, 9 + 3, 18, STONE_WARM, { x, y: y + 4.5 - 1.5, z, ry: rot });
  k.add('roof', prism(10.4, 6.5, 19), SLATE, { x, y: y + 9, z, ry: rot });
  for (const side of [1, -1]) for (let i = -2; i <= 2; i++) {
    const [px, pz] = P(side * 4.53, i * 3.2);
    k.box('glow', 0.25, 3, 0.9, i % 2 ? '#ffb45e' : '#c98cff', { x: px, y: y + 4.5, z: pz, ry: rot, bright: 1.8 });
  }
  const [tx, tz] = P(0, 11);
  k.box('stone', 5.2, 22, 5.2, STONE_WARM, { x: tx, y: y + 9, z: tz, ry: rot });
  k.cone('roof', 4.1, 16, 4, SLATE, { x: tx, y: y + 20 + 8, z: tz, ry: rot + Math.PI / 4 });
  k.cone('metal', 0.15, 2.5, 6, '#c9a860', { x: tx, y: y + 37, z: tz });
  for (const [a, b, r] of [[0, 2.62, 0], [2.62, 0, Math.PI / 2], [0, -2.62, Math.PI], [-2.62, 0, -Math.PI / 2]]) {
    const [px, pz] = P(a, 11 + b);
    k.box('glow', 0.8, 2.4, 0.25, WARM, { x: px, y: y + 15, z: pz, ry: rot + r, bright: 2.2 });
  }
  const [dx, dz] = P(0, 13.65);
  k.box('glow', 1.6, 2.8, 0.2, '#ffb45e', { x: dx, y: y + 1.4, z: dz, ry: rot, bright: 1.4 });
  w.box(x, z, 4.8, 9.3, rot, y - 3, y + 16);
  w.box(tx, tz, 2.8, 2.8, rot, y - 3, y + 36);
  w.noTrees(x, z, 18);
  w.lights.push({ x, y: y + 4, z, color: 0xffa860, intensity: 1.6, range: 30 });
}

export function lanternPost(k, w, T, x, z, color = WARM) {
  const y = T.heightAt(x, z);
  k.cyl('wood', 0.09, 0.12, 3.4, 6, '#3b2b20', { x, y: y + 1.7, z });
  k.box('wood', 0.9, 0.1, 0.1, '#3b2b20', { x: x + 0.4, y: y + 3.3, z });
  k.box('glow', 0.32, 0.42, 0.32, color, { x: x + 0.78, y: y + 2.95, z, bright: 1.7 });
  k.cone('metal', 0.3, 0.3, 4, '#2a2830', { x: x + 0.78, y: y + 3.3, z, ry: Math.PI / 4 });
  w.lights.push({ x: x + 0.8, y: y + 2.9, z, color: typeof color === 'string' ? new THREE.Color(color).getHex() : color, intensity: 1.1, range: 16 });
  w.circle(x, z, 0.3, y - 2, y + 4);
}

export function waterWheel(scene, kitMats, w, x, y, z, rot) {
  const k = new Kit(kitMats);
  const R = 3.4;
  for (const side of [-0.7, 0.7]) {
    k.add('wood', new THREE.TorusGeometry(R, 0.14, 6, 24), '#4a3726', { z: side });
    k.add('wood', new THREE.TorusGeometry(R * 0.45, 0.1, 6, 16), '#4a3726', { z: side });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.box('wood', 0.14, R * 2, 0.14, '#3e2e20', { rz: a, z: 0.7 }); k.box('wood', 0.14, R * 2, 0.14, '#3e2e20', { rz: a, z: -0.7 });
    k.box('wood', 0.9, 0.12, 1.6, '#5a4430', { x: Math.cos(a) * R, y: Math.sin(a) * R, rz: a + Math.PI / 2 });
  }
  k.cyl('wood', 0.25, 0.25, 2.2, 8, '#2e2218', { rx: Math.PI / 2 });
  const wheel = k.build();
  const g = new THREE.Group(); g.add(wheel);
  g.position.set(x, y, z); g.rotation.y = rot;
  scene.add(g);
  w.anim.push((t, dt) => { wheel.rotation.z -= dt * 0.5; });
  w.circle(x, z, 2.2, y - 5, y + 4);
}

// ---------- Goblin market ----------
export function stall(k, w, T, x, z, rot, cloth) {
  const y = T.heightAt(x, z);
  const P = L(x, z, rot);
  k.box('wood', 3.2, 1.05, 1.2, '#5a4230', { x, y: y + 0.52, z, ry: rot });
  for (const [a, b] of [[-1.6, -0.6], [1.6, -0.6], [-1.6, 1.6], [1.6, 1.6]]) {
    const [px, pz] = P(a, b);
    k.cyl('wood', 0.07, 0.07, b > 0 ? 2.6 : 3.1, 5, '#3a2b20', { x: px, y: y + (b > 0 ? 1.3 : 1.55), z: pz });
  }
  const [cx, cz] = P(0, 0.5);
  k.box('plain', 3.8, 0.08, 2.9, cloth, { x: cx, y: y + 2.85, z: cz, ry: rot, rx: 0.18 });
  for (let i = 0; i < 4; i++) {
    const [px, pz] = P(-1.2 + i * 0.8, 0);
    const c = ['#7a3a8a', '#c9a860', '#3f7a5a', '#a0402a'][i];
    k.sphere('plain', 0.18, c, { x: px, y: y + 1.2, z: pz, ws: 6, hs: 5 });
  }
  const [lx, lz] = P(1.4, -0.4);
  k.box('glow', 0.25, 0.35, 0.25, WARM, { x: lx, y: y + 2.35, z: lz, bright: 2.5 });
  const [bx, bz] = P(-2.3, -0.3);
  k.cyl('wood', 0.45, 0.4, 1, 8, '#4f3a28', { x: bx, y: y + 0.5, z: bz });
  w.box(x, z, 1.7, 0.7, rot, y - 2, y + 1.1);
  w.lights.push({ x: lx, y: y + 2.3, z: lz, color: 0xffa050, intensity: 1, range: 14 });
}

export function goblinHut(k, w, T, x, z, rot) {
  const y = T.heightAt(x, z) - 0.3;
  const P = L(x, z, rot);
  k.cyl('stone', 3, 3.3, 3.6, 12, STONE_WARM, { x, y: y + 1.8, z });
  k.cone('thatch', 4, 3.8, 12, '#a48c66', { x, y: y + 5.4, z, rz: 0.08 });
  const [dx, dz] = P(0, 3.05);
  k.cyl('wood', 0.85, 0.85, 0.2, 12, '#6a3a2a', { x: dx, y: y + 1.2, z: dz, rx: Math.PI / 2, ry: rot });
  k.sphere('metal', 0.08, '#d0b060', { x: dx + 0.3, y: y + 1.2, z: dz });
  for (const a of [-0.9, 0.9]) {
    const [px, pz] = [x + Math.sin(rot + a) * 3.02, z + Math.cos(rot + a) * 3.02];
    k.cyl('glow', 0.35, 0.35, 0.2, 10, WARM, { x: px, y: y + 2.1, z: pz, rx: Math.PI / 2, ry: rot + a, bright: 2.2 });
  }
  w.circle(x, z, 3.3, y - 2, y + 7);
  w.noTrees(x, z, 7);
  w.lights.push({ x, y: y + 2, z, color: 0xffa050, intensity: 1.2, range: 18 });
  w.chimneys.push({ x: x + 0.4, y: y + 7.2, z });
}

// ---------- Witchwood ----------
export function witchHut(k, w, T, x, z, rot) {
  const y = T.heightAt(x, z);
  const P = L(x, z, rot);
  for (const [a, b] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
    const [px, pz] = P(a, b);
    k.cyl('wood', 0.14, 0.18, 3.4, 5, '#2e2420', { x: px, y: y + 1.3, z: pz, rz: (rnd() - 0.5) * 0.15 });
  }
  k.box('wood', 4.2, 3.2, 4.2, '#3e3040', { x, y: y + 4.4, z, ry: rot, rz: 0.04 });
  k.cone('roof', 3.9, 5.5, 5, '#4d3b6a', { x: x + 0.3, y: y + 8.5, z, ry: rot, rz: 0.22 });
  const [wx, wz] = P(0, 2.13);
  k.box('glow', 0.9, 1, 0.2, '#86ff9a', { x: wx, y: y + 4.6, z: wz, ry: rot, bright: 2 });
  const [sx, sz] = P(0, 3.8);
  k.box('wood', 1.2, 0.15, 3.6, '#3a2c24', { x: sx, y: y + 1.5, z: sz, ry: rot, rx: -0.45 });
  // cauldron
  const [cx, cz] = P(3.8, 3.6);
  const cy = T.heightAt(cx, cz);
  k.sphere('metal', 0.95, '#26242c', { x: cx, y: cy + 0.8, z: cz, sy: 0.75, ws: 12, hs: 8 });
  k.cyl('glow', 0.78, 0.78, 0.08, 12, '#6dff8a', { x: cx, y: cy + 1.25, z: cz, bright: 2.2 });
  for (let i = 0; i < 3; i++) { const a = i * 2.1; k.box('wood', 0.2, 0.3, 0.6, '#2a1d16', { x: cx + Math.cos(a) * 0.6, y: cy + 0.1, z: cz + Math.sin(a) * 0.6, ry: a }); }
  k.box('glow', 0.5, 0.5, 0.5, '#ff8a3a', { x: cx, y: cy + 0.1, z: cz, bright: 1.6 });
  w.lights.push({ x: cx, y: cy + 1.5, z: cz, color: 0x66ff88, intensity: 1.6, range: 16 });
  w.lights.push({ x: wx, y: y + 4.6, z: wz, color: 0x7aff90, intensity: 0.8, range: 10 });
  w.box(x, z, 2.4, 2.4, rot, y - 2, y + 11);
  w.circle(cx, cz, 1, cy - 1, cy + 2);
  w.noTrees(x, z, 8);
  return { cx, cy, cz };
}

// ---------- Graves ----------
export function graves(k, w, T, cx, cz) {
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
    if (rnd() < 0.2) continue;
    const x = cx - 18 + c * 6 + (rnd() - 0.5), z = cz - 8 + r * 5.5 + (rnd() - 0.5);
    const y = T.heightAt(x, z);
    const tilt = (rnd() - 0.5) * 0.25;
    if (rnd() < 0.35) {
      k.box('stone', 0.25, 1.9, 0.25, '#8c8a9a', { x, y: y + 0.8, z, rz: tilt });
      k.box('stone', 1.0, 0.22, 0.25, '#8c8a9a', { x, y: y + 1.35, z, rz: tilt });
    } else {
      k.box('stone', 0.95, 1.3, 0.28, '#7e7b8e', { x, y: y + 0.5, z, rz: tilt, rx: (rnd() - 0.5) * 0.2 });
      k.cyl('stone', 0.48, 0.48, 0.28, 10, '#7e7b8e', { x, y: y + 1.15, z, rx: Math.PI / 2, rz: tilt });
    }
    k.box('plain', 0.9, 0.12, 1.8, '#2e2c28', { x, y: y + 0.03, z: z + 1.1 });
  }
  // fence
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    const x = cx + Math.cos(a) * 30, z = cz + Math.sin(a) * 22;
    if (Math.abs(a - Math.PI / 2) < 0.12) continue; // gate gap facing the road
    const y = T.heightAt(x, z);
    k.box('metal', 0.1, 1.8, 0.1, '#2a2830', { x, y: y + 0.9, z });
    k.cone('metal', 0.1, 0.3, 4, '#2a2830', { x, y: y + 1.95, z });
  }
  // mausoleum
  const mx = cx + 6, mz = cz - 22, my = T.heightAt(mx, mz);
  k.box('stone', 7, 5, 8, '#85819a', { x: mx, y: my + 2.2, z: mz });
  k.add('roof', prism(8, 2.6, 9), '#4a4760', { x: mx, y: my + 4.7, z: mz, ry: Math.PI / 2 });
  for (const dx of [-2.8, -1, 1, 2.8]) k.cyl('stone', 0.3, 0.3, 4.6, 8, '#a09cb0', { x: mx + dx, y: my + 2.3, z: mz + 4.4 });
  k.box('glow', 1.6, 2.6, 0.2, '#8fb0ff', { x: mx, y: my + 1.3, z: mz + 4.05, bright: 1.3 });
  w.box(mx, mz, 3.6, 4.6, 0, my - 2, my + 7.3);
  w.lights.push({ x: mx, y: my + 1.5, z: mz + 5, color: 0x88aaff, intensity: 1.2, range: 14 });
  // ruined chapel walls
  const rx = cx - 22, rz = cz - 20, ry = T.heightAt(rx, rz);
  const segs = [[-5, -8, 5, -8, 7], [5, -8, 5, 8, 4], [-5, -8, -5, 8, 8], [-5, 8, 0, 8, 3]];
  for (const [a, b, c, d, h] of segs) {
    const len = Math.hypot(c - a, d - b), rot = Math.atan2(-(d - b), c - a);
    k.box('stone', len, h + 2, 1.1, '#7d7a8a', { x: rx + (a + c) / 2, y: ry + h / 2 - 1, z: rz + (b + d) / 2, ry: rot });
    w.wall(rx + a, rz + b, rx + c, rz + d, 1.1, ry - 2, ry + h);
  }
  k.box('glow', 1.2, 3, 0.2, '#9fb6ff', { x: rx, y: ry + 4, z: rz - 7.4, bright: 0.9 });
  w.noTrees(cx, cz, 36);
  w.noTrees(rx, rz, 12);
}

// ---------- Moon Circle ----------
export function moonCircle(scene, k, w, T, cx, cz, glowMat) {
  const y0 = T.heightAt(cx, cz);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = cx + Math.cos(a) * 16, z = cz + Math.sin(a) * 16, y = T.heightAt(x, z);
    const h = 4 + rnd() * 2.5;
    k.box('plain', 1.8, h + 1, 1.1, '#8a879c', { x, y: y + h / 2 - 0.5, z, ry: Math.PI / 2 - a, rz: (rnd() - 0.5) * 0.12 });
    k.box('plain', 2.0, 0.5, 1.2, '#7a778c', { x, y: y + h + 0.3, z, ry: Math.PI / 2 - a, rz: (rnd() - 0.5) * 0.2 });
    k.box('glow', 0.18, h * 0.6, 0.05, '#86b8ff', { x: x - Math.cos(a) * 0.58, y: y + h * 0.5, z: z - Math.sin(a) * 0.58, ry: Math.PI / 2 - a, bright: 2 });
    w.circle(x, z, 1.1, y - 2, y + h);
  }
  k.box('plain', 3.4, 1.2, 2.2, '#8a879c', { x: cx, y: y0 + 0.5, z: cz });
  w.box(cx, cz, 1.7, 1.1, 0, y0 - 2, y0 + 1.1);
  w.platform({ x: cx, z: cz, r: 1.2, top: () => y0 + 1.1 });
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 2), glowMat);
  orb.position.set(cx, y0 + 3, cz);
  scene.add(orb);
  w.anim.push((t) => { orb.position.y = y0 + 3 + Math.sin(t * 0.8) * 0.3; orb.rotation.y = t * 0.5; });
  w.lights.push({ x: cx, y: y0 + 3, z: cz, color: 0x88b4ff, intensity: 2.2, range: 26 });
  w.noTrees(cx, cz, 24);
}

// ---------- Castle ----------
export function bigCastle(k, w, T, cx, cz) {
  const y = T.heightAt(cx, cz) - 0.3;
  const C = STONE_WARM;
  // courtyard floor
  k.cyl('stone', 40, 40, 1, 24, '#6f6a70', { x: cx, y: y - 0.3, z: cz });
  w.platform({ x: cx, z: cz, r: 39, top: () => y + 0.2 });
  const corners = [[-32, -24], [32, -24], [32, 24], [-32, 24]].map(([a, b]) => [cx + a, cz + b]);
  wallSeg(k, w, corners[0][0], corners[0][1], corners[1][0], corners[1][1], y, 11, 3, C);
  wallSeg(k, w, corners[1][0], corners[1][1], corners[2][0], corners[2][1], y, 11, 3, C);
  wallSeg(k, w, corners[3][0], corners[3][1], corners[0][0], corners[0][1], y, 11, 3, C);
  wallSeg(k, w, corners[2][0], corners[2][1], cx + 5, cz + 24, y, 11, 3, C);
  wallSeg(k, w, cx - 5, cz + 24, corners[3][0], corners[3][1], y, 11, 3, C);
  k.box('stone', 10, 4, 3, C, { x: cx, y: y + 9, z: cz + 24 });
  k.box('wood', 8, 7, 0.6, '#3a2a20', { x: cx, y: y + 3.5, z: cz + 24 });
  k.box('glow', 0.4, 0.6, 0.1, WARM, { x: cx - 2, y: y + 5, z: cz + 24.35, bright: 2 }); k.box('glow', 0.4, 0.6, 0.1, WARM, { x: cx + 2, y: y + 5, z: cz + 24.35, bright: 2 });
  w.box(cx, cz + 24, 5, 1.6, 0, y - 3, y + 12);
  for (const [x, z] of corners) tower(k, w, x, y, z, 5.5, 20, { roofH: 12, color: C });
  tower(k, w, cx + 7, y, cz + 25, 3, 16, { roofH: 7, color: C });
  tower(k, w, cx - 7, y, cz + 25, 3, 16, { roofH: 7, color: C });
  // keep
  const kx = cx, kz = cz - 9;
  k.box('stone', 24, 28, 17, C, { x: kx, y: y + 13, z: kz });
  for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
    const lit = rnd() < 0.7;
    win(k, kx - 10 + col * 4, y + 5 + row * 4.6, kz + 8.55, 0, lit, 1.1);
    win(k, kx - 10 + col * 4, y + 5 + row * 4.6, kz - 8.55, Math.PI, rnd() < 0.5, 1.1);
  }
  for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
    win(k, kx + 12.05, y + 5 + row * 4.6, kz - 5 + col * 5, Math.PI / 2, rnd() < 0.6, 1.1);
    win(k, kx - 12.05, y + 5 + row * 4.6, kz - 5 + col * 5, -Math.PI / 2, rnd() < 0.6, 1.1);
  }
  for (let i = 0; i < 11; i++) for (const s of [-1, 1]) k.box('stone', 1.2, 1.4, 1.2, C, { x: kx - 11 + i * 2.2, y: y + 27.7, z: kz + s * 8.2 });
  w.box(kx, kz, 12.2, 8.7, 0, y - 3, y + 28);
  tower(k, w, kx - 12, y, kz - 8, 4, 40, { roofH: 15, color: C });
  tower(k, w, kx + 12, y, kz - 8, 4, 44, { roofH: 16, color: C });
  tower(k, w, kx - 12, y, kz + 8, 2.6, 33, { roofH: 9, color: C });
  tower(k, w, kx + 12, y, kz + 8, 2.6, 33, { roofH: 9, color: C });
  tower(k, w, cx + 22, y, cz + 8, 5, 30, { roofH: 14, color: C });
  // great hall
  k.box('stone', 11, 10, 16, C, { x: cx - 19, y: y + 4.5, z: cz + 8 });
  k.add('roof', prism(12.4, 6, 17), SLATE, { x: cx - 19, y: y + 9.5, z: cz + 8 });
  for (let i = 0; i < 3; i++) win(k, cx - 13.45, y + 5, cz + 3 + i * 5, Math.PI / 2, true, 1.2);
  w.box(cx - 19, cz + 8, 5.7, 8.2, 0, y - 2, y + 16);
  w.lights.push({ x: cx, y: y + 3, z: cz + 14, color: 0xffa050, intensity: 2, range: 30 });
}

export function gatehouse(k, w, T, x, z) {
  const y = T.heightAt(x, z) - 0.2;
  tower(k, w, x - 7, y, z - 3, 3.4, 13, { roofH: 7, color: STONE_WARM });
  tower(k, w, x + 7, y, z - 3, 3.4, 13, { roofH: 7, color: STONE_WARM });
  k.box('stone', 11, 10, 5, STONE_WARM, { x, y: y + 4, z: z - 3 });
  for (let i = 0; i < 5; i++) k.box('stone', 1.1, 1.3, 5.1, STONE_WARM, { x: x - 4.4 + i * 2.2, y: y + 9.6, z: z - 3 });
  k.box('glow', 4, 5.4, 0.2, '#ffb060', { x, y: y + 2.6, z: z - 0.45, bright: 0.85 });
  for (const s of [-1, 1]) {
    k.cyl('wood', 0.07, 0.07, 0.7, 5, '#2a2018', { x: x + s * 3, y: y + 4, z: z - 0.3, rx: -0.3 });
    k.sphere('glow', 0.22, '#ff9a3a', { x: x + s * 3, y: y + 4.45, z: z - 0.1, bright: 3 });
    w.lights.push({ x: x + s * 3, y: y + 4.5, z: z + 0.5, color: 0xff9040, intensity: 1.6, range: 16 });
  }
  w.box(x - 3.5, z - 3, 2, 2.6, 0, y - 2, y + 10);
  w.box(x + 3.5, z - 3, 2, 2.6, 0, y - 2, y + 10);
  w.noTrees(x, z, 16);
}

// ---------- Wizard tower & lighthouse ----------
export function wizardTower(scene, k, w, T, x, z, glowMat) {
  const y = T.heightAt(x, z) - 0.5;
  const H = 56;
  tower(k, w, x, y, z, 6, H, { roof: false, color: '#8a86a0', winColor: '#c89aff', lit: 0.8, lightColor: 0xb080ff });
  k.cyl('stone', 7.6, 7.6, 0.6, 20, '#8a86a0', { x, y: y + H * 0.55, z });
  k.cyl('stone', 6.2, 6.2, 0.5, 20, '#6d6980', { x, y: y + H - 0.2, z });
  k.box('glow', 1.4, 2.8, 0.2, '#c89aff', { x, y: y + 1.4, z: z + 6.05, bright: 1.6 });
  w.platform({ x, z, r: 5.8, top: () => y + H + 0.05 });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), glowMat);
  crystal.position.set(x, y + H + 5, z);
  crystal.scale.set(0.7, 1.3, 0.7);
  scene.add(crystal);
  w.anim.push((t) => { crystal.rotation.y = t * 0.7; crystal.position.y = y + H + 5 + Math.sin(t) * 0.4; });
  w.lights.push({ x, y: y + H + 4, z, color: 0x9f7aff, intensity: 2.5, range: 40 });
  w.noTrees(x, z, 14);
  return y + H;
}

export function lighthouse(scene, k, w, T, x, z) {
  const y = T.heightAt(x, z) - 0.5;
  const H = 34;
  k.cyl('stone', 3.4, 5, H, 18, '#d4cfdc', { x, y: y + H / 2, z });
  for (let i = 0; i < 3; i++) k.cyl('plain', 4.7 - i * 0.5 + 0.02, 4.85 - i * 0.5 + 0.02, 3, 18, '#8a2e3a', { x, y: y + 6 + i * 10, z });
  k.cyl('stone', 4.4, 4.4, 0.6, 18, '#6d6980', { x, y: y + H + 0.3, z });
  k.cyl('glow', 2.6, 2.6, 3.4, 12, '#fff0c0', { x, y: y + H + 2.3, z, bright: 3 });
  k.cone('roof', 3.4, 3.4, 12, '#3e3b50', { x, y: y + H + 5.6, z });
  k.box('glow', 1.2, 2.2, 0.2, WARM, { x, y: y + 1.2, z: z - 4.95, ry: Math.PI, bright: 1.5 });
  w.circle(x, z, 5, y - 3, y + H + 7);
  const beamGeo = new THREE.ConeGeometry(9, 160, 20, 1, true);
  beamGeo.translate(0, -80, 0); beamGeo.rotateZ(Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.92, 0.7), transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(x, y + H + 2.3, z);
  scene.add(beam);
  w.anim.push((t) => { beam.rotation.y = t * 0.35; });
  w.lights.push({ x, y: y + H + 2, z, color: 0xfff0c0, intensity: 3, range: 40 });
  w.noTrees(x, z, 12);
}

// ---------- Overlook ----------
export function overlook(k, w, T, x, z) {
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + (i - 8.5) * 0.075;
    const px = x + Math.cos(a) * 14 * 1.6, pz = z + 14 + Math.sin(a) * 14;
    const y = T.heightAt(px, pz);
    k.box('stone', 2.1, 1.3 + rnd() * 0.3, 0.9, i % 3 ? '#9a9486' : '#8a9080', { x: px, y: y + 0.5, z: pz, ry: -a - Math.PI / 2, rz: (rnd() - 0.5) * 0.05 });
    w.circle(px, pz, 0.8, y - 2, y + 1.3);
  }
  w.noTrees(x, z, 14);
  w.noTrees(x, z - 20, 42);
  w.noTrees(x - 45, z - 35, 26);
  w.noTrees(x + 45, z - 35, 26);
}

// ---------- Floating isles ----------
const isleNoise = new Simplex(99);
function isleRock(k, r, seed, withCap = true) {
  const pts = [[r, 0], [r * 0.97, -r * 0.12], [r * 0.86, -r * 0.35], [r * 0.64, -r * 0.7], [r * 0.4, -r * 1.02], [r * 0.18, -r * 1.3], [0.01, -r * 1.55]];
  const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 1 + isleNoise.noise3(x / r * 2 + seed, y / r * 2, z / r * 2) * 0.22;
    p.setXYZ(i, x * f, y * (1 + isleNoise.noise2(x / 5 + seed, z / 5) * 0.08), z * f);
  }
  g.computeVertexNormals();
  k.add('stone', g, '#77708a', { shadeY: 0.012 });
  if (withCap) {
    k.cyl('terrain', r * 1.02, r * 0.97, r * 0.1 + 0.6, 18, '#3e5a44', { y: -r * 0.05 });
    k.cyl('terrain', r * 0.9, r * 1.0, 1.2, 18, '#3a5540', { y: 0.2 });
    k.cyl('plain', r * 1.03, r * 0.92, r * 0.28, 18, '#3d5a40', { y: -r * 0.2, open: true });
  }
}

function smallCastle(k, r, lit = 0.7) {
  const fake = { circle() {}, lights: [], wall() {}, box() {} };
  const s = Math.min(1, r / 38);
  tower(k, fake, 0, 0.6, -2 * s, 5 * s, 26 * s, { roofH: 13 * s, lit });
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    tower(k, fake, Math.cos(a) * 11 * s, 0.6, Math.sin(a) * 9 * s, (2.3 + (i % 2)) * s, (12 + i * 3) * s, { roofH: 7 * s, lit });
  }
  k.box('stone', 18 * s, 6 * s, 12 * s, STONE, { y: 3 * s + 0.6, z: 2 * s });
  for (let i = 0; i < 4; i++) win(k, -6 * s + i * 4 * s, 3.5 * s + 0.6, 8.05 * s, 0, rnd() < lit, s * 1.2);
}

function queenCastle(k) {
  const fake = { circle() {}, lights: [], wall() {}, box() {} };
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, b = ((i + 1) / 8) * Math.PI * 2;
    const R = 34;
    if (i !== 1) wallSeg(k, fake, Math.cos(a) * R, Math.sin(a) * R, Math.cos(b) * R, Math.sin(b) * R, 0.6, 9, 2.4);
    tower(k, fake, Math.cos(a) * R, 0.6, Math.sin(a) * R, 3.6, 16, { roofH: 9 });
  }
  tower(k, fake, 0, 0.6, -6, 8, 42, { roofH: 20, lit: 0.8, winColor: '#b8c4ff' });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    tower(k, fake, Math.cos(a) * 13, 0.6, -6 + Math.sin(a) * 11, 4, 30 + i * 3, { roofH: 13, lit: 0.75 });
  }
  tower(k, fake, -20, 0.6, -14, 3, 24, { roofH: 11 });
  tower(k, fake, 21, 0.6, -12, 3, 22, { roofH: 11 });
  k.box('stone', 26, 12, 14, STONE, { y: 6.6, z: -2 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) win(k, -10 + i * 4, 4 + j * 4.5, 5.05, 0, rnd() < 0.8, 1.2, j ? '#b8c4ff' : WARM);
  // stair up the front
  for (let i = 0; i < 8; i++) k.box('stone', 6, 0.5, 1.2, '#8a8494', { y: 0.6 + i * 0.5, z: 12 - i * 1.2 });
}

function isleTree(k, x, z, s) {
  k.cyl('wood', 0.35 * s, 0.6 * s, 6 * s, 6, '#3a2c26', { x, y: 3 * s, z, rz: 0.2 });
  k.cyl('wood', 0.18 * s, 0.3 * s, 3 * s, 5, '#3a2c26', { x: x + 1.2 * s, y: 5.5 * s, z, rz: -0.9 });
  for (let i = 0; i < 5; i++) k.sphere('plain', (1.6 + rnd()) * s, '#2f4e3c', { x: x + (rnd() - 0.3) * 3 * s, y: (6 + rnd() * 2) * s, z: z + (rnd() - 0.5) * 3 * s, sy: 0.6, ws: 7, hs: 5 });
}

export function floatingIsles(scene, mats, w) {
  const out = [];
  for (const [x, z, baseY, r, kind] of ISLES) {
    const k = new Kit(mats);
    isleRock(k, r, x * 0.01);
    if (kind === 'queen') queenCastle(k);
    else if (kind) smallCastle(k, r);
    isleTree(k, r * 0.55, r * 0.35, r / 30);
    isleTree(k, -r * 0.6, r * 0.2, r / 36);
    const g = k.build();
    g.position.set(x, baseY, z);
    scene.add(g);
    const ph = x * 0.013;
    const isle = { g, baseY, x, z, r, ph };
    w.anim.push((t) => { g.position.y = baseY + Math.sin(t * 0.18 + ph) * 1.4; g.rotation.y = Math.sin(t * 0.05 + ph) * 0.03; });
    w.platform({ x, z, r: r * 0.95, top: () => g.position.y + 0.8 });
    if (kind === 'queen') {
      // Colliders for the queen's keep and walls (move less than a metre and a half, so static is fine)
      w.circle(x, z - 6, 8.5, baseY - 5, baseY + 70);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; w.circle(x + Math.cos(a) * 13, z - 6 + Math.sin(a) * 11, 4.2, baseY - 5, baseY + 60); }
      w.box(x, z - 2, 13, 7, 0, baseY - 5, baseY + 13);
      w.lights.push({ x, y: baseY + 6, z: z + 10, color: 0xb8c4ff, intensity: 2, range: 34 });
      w.lights.push({ x: x - 8, y: baseY + 4, z: z + 7, color: 0xffa050, intensity: 1.5, range: 24 });
    }
    out.push(isle);
  }
  // Stepping stones
  for (const s of steppingStones()) {
    const k = new Kit(mats);
    isleRock(k, s.r, s.x * 0.02);
    if (!s.well && rnd() < 0.5) { k.cyl('wood', 0.08, 0.1, 2.4, 5, '#3b2b20', { x: s.r * 0.5, y: 1.8 }); k.box('glow', 0.3, 0.4, 0.3, '#9fc0ff', { x: s.r * 0.5, y: 3.1, bright: 2.5 }); }
    const g = k.build();
    g.position.set(s.x, s.y, s.z);
    scene.add(g);
    const ph = s.x * 0.05;
    w.anim.push((t) => { g.position.y = s.y + Math.sin(t * 0.4 + ph) * 0.6; });
    w.platform({ x: s.x, z: s.z, r: s.r * 0.95, top: () => g.position.y + 0.8 });
    w.lights.push({ x: s.x, y: s.y + 3, z: s.z, color: 0x9fc0ff, intensity: 0.8, range: 12 });
    if (s.well) { const ox = s.r * 0.66; w.wells.push({ x: s.x + ox, z: s.z, r: 1.4, y: () => g.position.y + 0.8, boost: 24 }); }
  }
  return out;
}

// ---------- Roadside lanterns ----------
export function roadLanterns(k, w, T) {
  for (const road of ROADS) {
    let acc = 20;
    for (let i = 0; i < road.length - 1; i++) {
      const [ax, az] = road[i], [bx, bz] = road[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      while (acc < len) {
        const t = acc / len;
        const nx = -(bz - az) / len, nz = (bx - ax) / len;
        const x = ax + (bx - ax) * t + nx * 4.5, z = az + (bz - az) * t + nz * 4.5;
        if (T.heightAt(x, z) > WATER_Y + 0.5) lanternPost(k, w, T, x, z);
        acc += 48;
      }
      acc -= len;
    }
  }
}

export function liftTargets(w, T, towerTop) {
  return LIFTS.map((l) => ({
    x: l.x, z: l.z, r: 2.2, label: l.label,
    y: () => w.groundAt(l.x, l.z, T.heightAt(l.x, l.z) + 2),
    to: [l.to[0], l.to[1] === 'top' ? towerTop + 0.2 : null, l.to[2]],
  }));
}
