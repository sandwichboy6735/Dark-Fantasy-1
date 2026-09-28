// Emberlight Town: timber-framed houses with stone ground floors, jettied upper storeys, cobbled
// streets, a square with a town hall and clock tower, props, and a stone town wall with gatehouses.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { WATER_Y } from './layout.js';
import { tower, wallSeg } from './structures.js';

const TIMBER = '#3a281c', WARM = '#ffb45e';
const PLASTER = ['#d8ccb4', '#cfc2a8', '#d6c6a0', '#c8bcae', '#dcd0bc', '#c4b49a'];
const SHUTTER = ['#2e4a3a', '#3a3a5a', '#6a2a24', '#4a3a2a', '#2a3a4a'];
const L = (x, z, rot) => (lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];

function slab(k, kind, P, rot, lx, y, lz, w, h, d, color, o = {}) {
  const [x, z] = P(lx, lz);
  k.box(kind, w, h, d, color, { x, y, z, ry: rot + (o.ry || 0), rx: o.rx || 0, rz: o.rz || 0, bright: o.bright });
}

// A window seen on a wall facing local +z at depth fz (sign s = +1 front, -1 back)
function windowOn(k, P, rot, lx, y, fz, s, lit, r, framed, shutter, w = 0.8, h = 1.15) {
  const face = s > 0 ? 0 : Math.PI;
  slab(k, lit ? 'glow' : 'plain', P, rot, lx, y, fz + s * 0.02, w, h, 0.06, lit ? WARM : '#14121a', { ry: face, bright: lit ? 1.4 + r() * 1.2 : 1 });
  // mullion and transom
  slab(k, 'wood', P, rot, lx, y, fz + s * 0.06, 0.06, h, 0.05, TIMBER, { ry: face });
  slab(k, 'wood', P, rot, lx, y + h * 0.12, fz + s * 0.06, w, 0.06, 0.05, TIMBER, { ry: face });
  if (framed === 'stone') {
    slab(k, 'stone', P, rot, lx, y - h / 2 - 0.08, fz + s * 0.1, w + 0.3, 0.14, 0.26, '#a49a8c', { ry: face });
    slab(k, 'stone', P, rot, lx, y + h / 2 + 0.1, fz + s * 0.08, w + 0.3, 0.2, 0.2, '#a49a8c', { ry: face });
  } else {
    slab(k, 'wood', P, rot, lx, y - h / 2 - 0.05, fz + s * 0.08, w + 0.2, 0.1, 0.16, TIMBER, { ry: face });
    slab(k, 'wood', P, rot, lx, y + h / 2 + 0.05, fz + s * 0.06, w + 0.2, 0.1, 0.12, TIMBER, { ry: face });
    for (const sx of [-1, 1]) slab(k, 'wood', P, rot, lx + sx * (w / 2 + 0.05), y, fz + s * 0.06, 0.1, h + 0.1, 0.12, TIMBER, { ry: face });
  }
  if (shutter) for (const sx of [-1, 1]) {
    const [x, z] = P(lx + sx * (w / 2 + 0.28), fz + s * 0.22);
    k.box('wood', 0.46, h, 0.05, shutter, { x, y, z, ry: rot + face + sx * s * 0.9 });
  }
  if (r() < 0.35) { // flower box
    slab(k, 'wood', P, rot, lx, y - h / 2 - 0.22, fz + s * 0.22, w + 0.1, 0.22, 0.26, '#4a3424', { ry: face });
    for (let i = 0; i < 4; i++) {
      const [x, z] = P(lx - w / 2 + 0.15 + i * (w - 0.3) / 3, fz + s * 0.24);
      k.sphere('plain', 0.1, ['#b8303a', '#d8c040', '#e8e0f0', '#9a50b0'][Math.floor(r() * 4)], { x, y: y - h / 2 - 0.05, z, ws: 5, hs: 4 });
    }
  }
}

export function house(k, w, T, x, z, rot, o = {}) {
  const r = mulberry32(o.seed || 1);
  const W = o.w || 7 + r() * 2.5, D = o.d || 6 + r() * 1.5;
  const floors = o.floors ?? (r() < 0.45 ? 2 : 1);
  const P = L(x, z, rot);
  let y0 = Infinity;
  for (const [a, b] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) { const [px, pz] = P(a, b); y0 = Math.min(y0, T.heightAt(px, pz)); }
  const base = y0 + 0.25;
  const stoneCol = ['#8a8278', '#948a7e', '#7e786e'][Math.floor(r() * 3)];
  const plaster = PLASTER[Math.floor(r() * PLASTER.length)];
  const shutter = SHUTTER[Math.floor(r() * SHUTTER.length)];
  // stone ground floor on a plinth
  const gh = 3;
  slab(k, 'stone', P, rot, 0, base - 0.9, 0, W + 0.4, 2.2, D + 0.4, '#6e6860');
  slab(k, 'stone', P, rot, 0, base + gh / 2, 0, W, gh, D, stoneCol);
  // quoins at the corners
  for (const [a, b] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) for (let q = 0; q < 5; q++) {
    slab(k, 'stone', P, rot, a + Math.sign(a) * 0.04, base + 0.3 + q * 0.6, b + Math.sign(b) * 0.04, q % 2 ? 0.5 : 0.8, 0.5, q % 2 ? 0.8 : 0.5, '#a89e90');
  }
  // door with a stone surround, step and a lantern
  const doorX = (r() - 0.5) * (W - 3);
  slab(k, 'wood', P, rot, doorX, base + 1.1, D / 2 + 0.03, 1.15, 2.2, 0.1, '#3a2618');
  for (let p = 0; p < 4; p++) slab(k, 'wood', P, rot, doorX - 0.43 + p * 0.29, base + 1.1, D / 2 + 0.09, 0.05, 2.1, 0.04, '#2a1a10');
  slab(k, 'stone', P, rot, doorX - 0.72, base + 1.2, D / 2 + 0.1, 0.3, 2.5, 0.25, '#a49a8c');
  slab(k, 'stone', P, rot, doorX + 0.72, base + 1.2, D / 2 + 0.1, 0.3, 2.5, 0.25, '#a49a8c');
  slab(k, 'stone', P, rot, doorX, base + 2.5, D / 2 + 0.1, 1.75, 0.35, 0.3, '#a49a8c');
  slab(k, 'stone', P, rot, doorX, base - 0.08, D / 2 + 0.45, 1.8, 0.2, 0.8, '#8a8278');
  {
    const [lx, lz] = P(doorX + 1.05, D / 2 + 0.35);
    k.box('metal', 0.05, 0.05, 0.4, '#2a2622', { x: lx, y: base + 2.35, z: lz, ry: rot });
    k.box('glow', 0.18, 0.26, 0.18, WARM, { x: lx, y: base + 2.1, z: lz, bright: 2 });
    w.lights.push({ x: lx, y: base + 2.1, z: lz, color: 0xffa050, intensity: 0.7, range: 12 });
  }
  // ground floor windows
  const gw = Math.max(1, Math.floor((W - 2) / 2.4));
  for (let i = 0; i < gw; i++) {
    const lx = -W / 2 + (i + 0.5) * (W / gw);
    if (Math.abs(lx - doorX) < 1.3) continue;
    windowOn(k, P, rot, lx, base + 1.6, D / 2, 1, r() < 0.7, r, 'stone', r() < 0.6 ? shutter : null);
  }
  for (let i = 0; i < gw; i++) windowOn(k, P, rot, -W / 2 + (i + 0.5) * (W / gw), base + 1.6, -D / 2, -1, r() < 0.5, r, 'stone', null);
  // timber-framed upper storeys, each jettied out over the one below
  let top = base + gh, Dc = D, Wc = W;
  for (let f = 0; f < floors; f++) {
    const fh = 2.7, jet = 0.4;
    Dc += jet * 2; Wc += 0.2;
    // joist ends under the jetty
    for (let j = 0; j < Math.floor(Wc / 0.6); j++) for (const s of [-1, 1]) slab(k, 'wood', P, rot, -Wc / 2 + 0.3 + j * 0.6, top + 0.1, s * (Dc / 2 - 0.2), 0.14, 0.18, 0.5, TIMBER);
    slab(k, 'wood', P, rot, 0, top + 0.28, 0, Wc + 0.1, 0.22, Dc + 0.1, TIMBER);
    slab(k, 'plain', P, rot, 0, top + 0.39 + fh / 2, 0, Wc, fh, Dc, plaster);
    const fy = top + 0.39;
    // frame: posts, rails and braces on front and back
    for (const s of [-1, 1]) {
      const fz = s * (Dc / 2 + 0.03), face = s > 0 ? 0 : Math.PI;
      const posts = Math.max(3, Math.round(Wc / 1.25));
      for (let p = 0; p <= posts; p++) slab(k, 'wood', P, rot, -Wc / 2 + (p * Wc) / posts, fy + fh / 2, fz, 0.17, fh, 0.08, TIMBER, { ry: face });
      slab(k, 'wood', P, rot, 0, fy + fh - 0.1, fz, Wc, 0.18, 0.08, TIMBER, { ry: face });
      slab(k, 'wood', P, rot, 0, fy + 0.95, fz, Wc, 0.14, 0.08, TIMBER, { ry: face });
      for (let p = 0; p < posts; p++) {
        if ((p + f) % 3 !== 0) continue;
        const cx = -Wc / 2 + ((p + 0.5) * Wc) / posts, bw = Wc / posts;
        slab(k, 'wood', P, rot, cx, fy + 0.48, fz, Math.hypot(bw, 0.9), 0.12, 0.08, TIMBER, { ry: face, rz: Math.atan2(0.9, bw) * (p % 2 ? 1 : -1) });
      }
      const nw = Math.max(1, Math.floor(Wc / 2.6));
      for (let i = 0; i < nw; i++) windowOn(k, P, rot, -Wc / 2 + (i + 0.5) * (Wc / nw), fy + 1.7, s * Dc / 2, s, r() < (s > 0 ? 0.65 : 0.4), r, 'wood', null, 0.75, 1.0);
    }
    for (const sx of [-1, 1]) {
      const posts = Math.max(3, Math.round(Dc / 1.3));
      for (let p = 0; p <= posts; p++) { const [px, pz] = P(sx * (Wc / 2 + 0.03), -Dc / 2 + (p * Dc) / posts); k.box('wood', 0.08, fh, 0.17, TIMBER, { x: px, y: fy + fh / 2, z: pz, ry: rot }); }
      const [px, pz] = P(sx * (Wc / 2 + 0.03), 0);
      k.box('wood', 0.08, 0.18, Dc, TIMBER, { x: px, y: fy + fh - 0.1, z: pz, ry: rot });
    }
    top = fy + fh;
  }
  // steep roof: two tiled planes, timbered gables, ridge and a dormer
  const pitch = 0.95, span = Dc / 2 + 0.55, rise = Math.tan(pitch) * (Dc / 2);
  const slope = span / Math.cos(pitch);
  const roofKind = o.thatch ? 'thatch' : 'roof', roofCol = o.thatch ? ['#8a7a58', '#7a6c4e', '#968460'][Math.floor(r() * 3)] : ['#4a4658', '#5a4a44', '#3e3c4a'][Math.floor(r() * 3)];
  const thick = o.thatch ? 0.6 : 0.22;
  for (const s of [-1, 1]) {
    slab(k, roofKind, P, rot, 0, top + (span * Math.tan(pitch)) / 2 - 0.3, s * (span / 2 - 0.25), Wc + (o.thatch ? 1.5 : 1.1), thick, slope, roofCol, { rx: s * pitch });
    if (o.thatch) {
      // rounded, overhanging eaves and patches of moss
      const [ex, ez] = P(0, s * (span - 0.3));
      k.cyl('thatch', 0.42, 0.42, Wc + 1.5, 10, roofCol, { x: ex, y: top - 0.35, z: ez, rz: Math.PI / 2, ry: rot, bright: 0.85 });
      for (let m = 0; m < 5; m++) {
        const u = (r() - 0.5) * (Wc + 0.5), v = 0.2 + r() * 0.6;
        const [mx, mz] = P(u, s * span * (1 - v));
        k.sphere('plain', 0.5 + r() * 0.6, ['#3e5a2e', '#4a6634', '#355028'][m % 3], { x: mx, y: top - 0.3 + span * Math.tan(pitch) * v + 0.25, z: mz, sy: 0.3, rx: s * pitch, ws: 8, hs: 5 });
      }
    }
  }
  slab(k, 'wood', P, rot, 0, top + rise + 0.05, 0, Wc + 1.2, 0.22, 0.3, TIMBER);
  {
    const g = new THREE.Shape(); g.moveTo(-Dc / 2, 0); g.lineTo(Dc / 2, 0); g.lineTo(0, rise); g.closePath();
    const geo = new THREE.ExtrudeGeometry(g, { depth: Wc - 0.1, bevelEnabled: false }); geo.translate(0, 0, -(Wc - 0.1) / 2); geo.rotateY(Math.PI / 2);
    k.add('plain', geo, plaster, { x, y: top, z, ry: rot });
    for (const sx of [-1, 1]) {
      const [px, pz] = P(sx * (Wc / 2), 0);
      k.box('wood', 0.08, rise, 0.17, TIMBER, { x: px, y: top + rise / 2, z: pz, ry: rot });
      if (r() < 0.6) { const [wx, wz] = P(sx * (Wc / 2 + 0.03), 0); k.box(r() < 0.5 ? 'glow' : 'plain', 0.05, 0.7, 0.55, r() < 0.5 ? WARM : '#14121a', { x: wx, y: top + rise * 0.4, z: wz, ry: rot, bright: 1.6 }); }
    }
  }
  if (Wc > 7 && r() < 0.6) { // dormer on the front slope
    const dz = Dc / 4, dy = top + rise * 0.45;
    slab(k, 'plain', P, rot, 0, dy + 0.5, dz + 0.2, 1.4, 1.2, 1.4, plaster);
    windowOn(k, P, rot, 0, dy + 0.55, dz + 0.9, 1, r() < 0.6, r, 'wood', null, 0.6, 0.7);
    const g = new THREE.Shape(); g.moveTo(-0.95, 0); g.lineTo(0.95, 0); g.lineTo(0, 0.8); g.closePath();
    const geo = new THREE.ExtrudeGeometry(g, { depth: 1.8, bevelEnabled: false }); geo.translate(0, 0, -0.9);
    const [px, pz] = P(0, dz + 0.3);
    k.add(roofKind, geo, roofCol, { x: px, y: dy + 1.1, z: pz, ry: rot });
  }
  // chimney
  const [chx, chz] = P(Wc / 2 - 1.2, -0.5);
  const chTop = top + rise + 1.4;
  k.box('stone', 1.0, chTop - base, 1.0, stoneCol, { x: chx, y: (chTop + base) / 2, z: chz, ry: rot });
  k.box('stone', 1.2, 0.2, 1.2, '#6e6860', { x: chx, y: chTop, z: chz, ry: rot });
  for (const d of [-0.2, 0.2]) k.cyl('stone', 0.14, 0.16, 0.5, 8, '#8a5a44', { x: chx + d * Math.cos(rot), y: chTop + 0.35, z: chz - d * Math.sin(rot) });
  w.chimneys.push({ x: chx, y: chTop + 0.6, z: chz });
  w.box(x, z, W / 2 + 0.3, D / 2 + 0.3, rot, y0 - 3, top + rise);
  w.noTrees(x, z, Math.max(W, D) + 2);
  return { top: top + rise, base };
}

// Barrels, crates, carts and haystacks
export function props(k, w, T, x, z, rot, seed) {
  const r = mulberry32(seed);
  const y = T.heightAt(x, z);
  const kind = Math.floor(r() * 4);
  if (kind === 0) {
    for (let i = 0; i < 3; i++) {
      const bx = x + (r() - 0.5) * 1.6, bz = z + (r() - 0.5) * 1.6;
      k.lathe('wood', [[0.001, 0], [0.34, 0], [0.4, 0.45], [0.34, 0.9], [0.001, 0.9]], 12, '#5a3e28', { x: bx, y, z: bz });
      for (const hy of [0.15, 0.75]) k.add('metal', new THREE.TorusGeometry(0.37, 0.025, 4, 16), '#2a2622', { x: bx, y: y + hy, z: bz, rx: Math.PI / 2 });
    }
    w.circle(x, z, 1.1, y - 1, y + 1);
  } else if (kind === 1) {
    for (let i = 0; i < 3; i++) k.box('wood', 0.8, 0.7, 0.8, ['#6a4a30', '#5a3e28', '#7a5a38'][i], { x: x + (i % 2) * 0.9 - 0.4, y: y + 0.35 + (i === 2 ? 0.7 : 0), z: z + (i === 2 ? 0.1 : 0), ry: rot + r() * 0.4 });
    w.circle(x, z, 1, y - 1, y + 1.5);
  } else if (kind === 2) {
    const P = L(x, z, rot);
    slab(k, 'wood', P, rot, 0, y + 0.9, 0, 1.6, 0.5, 2.6, '#5a3e28');
    for (const sx of [-0.95, 0.95]) {
      const [wx, wz] = P(sx, 0.4);
      k.add('wood', new THREE.TorusGeometry(0.55, 0.07, 6, 16), '#3a2618', { x: wx, y: y + 0.55, z: wz, ry: rot + Math.PI / 2 });
    }
    for (const sx of [-0.3, 0.3]) { const [hx, hz] = P(sx, 2.3); k.box('wood', 0.08, 0.08, 1.8, '#3a2618', { x: hx, y: y + 0.6, z: hz, ry: rot, rx: 0.3 }); }
    slab(k, 'thatch', P, rot, 0, y + 1.3, -0.3, 1.4, 0.4, 1.6, '#b09a6a');
    w.box(x, z, 0.9, 1.4, rot, y - 1, y + 1.5);
  } else {
    k.lathe('thatch', [[0.001, 0], [1.1, 0], [1.05, 0.8], [0.6, 1.6], [0.001, 1.9]], 14, '#b8a070', { x, y, z });
    w.circle(x, z, 1.1, y - 1, y + 2);
  }
}

export function buildTown(k, w, T, occupied) {
  const C = [0, 30];
  const streets = [
    [[0, 30], [-40, -12], [-72, -52]],
    [[0, 30], [-60, 40], [-112, 52]],
    [[0, 30], [60, 32], [112, 36]],
    [[0, 30], [28, 58], [46, 84]],
  ];
  const free = (x, z, rad) => {
    for (const [ox, oz, or] of occupied) if ((x - ox) ** 2 + (z - oz) ** 2 < (rad + or) ** 2) return false;
    if (T.heightAt(x, z) < WATER_Y + 1.5) return false;
    return true;
  };
  // cobbled square and streets
  const sy = T.heightAt(...C);
  k.cyl('stone', 22, 22, 0.3, 32, '#6a6258', { x: C[0], y: sy, z: C[1] });
  w.platform({ x: C[0], z: C[1], r: 21.5, top: () => sy + 0.15 });
  for (const st of streets) for (let i = 0; i < st.length - 1; i++) {
    const [ax, az] = st[i], [bx, bz] = st[i + 1];
    const len = Math.hypot(bx - ax, bz - az), rot = Math.atan2(bx - ax, bz - az);
    const n = Math.ceil(len / 6);
    for (let s = 0; s < n; s++) {
      const t = (s + 0.5) / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      k.box('stone', 7, 0.25, len / n + 0.3, '#665e54', { x: px, y: T.heightAt(px, pz) + 0.02, z: pz, ry: rot });
    }
  }
  let seed = 100;
  const houses = [];
  for (const st of streets) {
    for (let i = 0; i < st.length - 1; i++) {
      const [ax, az] = st[i], [bx, bz] = st[i + 1];
      const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
      for (let d = i === 0 ? 27 : 5; d < len - 4; d += 11) {
        for (const side of [-1, 1]) {
          const px = -dz * side, pz = dx * side;
          const x = ax + dx * d + px * 9, z = az + dz * d + pz * 9;
          if (!free(x, z, 5.5)) continue;
          const rot = Math.atan2(-px, -pz);
          const hs = seed++;
          house(k, w, T, x, z, rot, { seed: hs, w: 7.5 + (hs % 3), floors: d < 40 && i === 0 ? 2 : (hs % 3 === 0 ? 0 : undefined), thatch: hs % 4 !== 0 });
          occupied.push([x, z, 5.5]);
          houses.push([x, z]);
          if (hs % 3 === 0) { const qx = x + dx * 5.5 + px * -2.5, qz = z + dz * 5.5 + pz * -2.5; if (free(qx, qz, 1.5)) { props(k, w, T, qx, qz, rot, hs); occupied.push([qx, qz, 1.5]); } }
        }
      }
    }
  }
  // town hall with a clock tower on the square
  {
    const x = -34, z = 30, rot = Math.PI / 2;
    const res = house(k, w, T, x, z, rot, { seed: 7, w: 12, d: 9, floors: 2 });
    occupied.push([x, z, 8]);
    const tx = x + 1, tz = z - 7.5, ty = T.heightAt(tx, tz);
    const H = res.top - ty + 8;
    k.box('stone', 4, H, 4, '#8a8278', { x: tx, y: ty + H / 2, z: tz });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2, fx = Math.sin(a), fz = Math.cos(a);
      k.cyl('stone', 1.2, 1.2, 0.2, 24, '#c8bca0', { x: tx + fx * 2.05, y: ty + H - 2.5, z: tz + fz * 2.05, rx: Math.PI / 2, ry: a });
      k.cyl('glow', 1.0, 1.0, 0.1, 24, '#ffe8b0', { x: tx + fx * 2.12, y: ty + H - 2.5, z: tz + fz * 2.12, rx: Math.PI / 2, ry: a, bright: 1.3 });
      k.box('metal', 0.08, 0.8, 0.05, '#1a1410', { x: tx + fx * 2.2, y: ty + H - 2.2, z: tz + fz * 2.2, ry: a });
      k.box('metal', 0.6, 0.08, 0.05, '#1a1410', { x: tx + fx * 2.2 + Math.cos(a) * 0.25, y: ty + H - 2.5, z: tz + fz * 2.2 - Math.sin(a) * 0.25, ry: a });
    }
    k.cone('roof', 3.4, 7, 4, '#3e3c4a', { x: tx, y: ty + H + 3.5, z: tz, ry: Math.PI / 4 });
    k.cone('metal', 0.1, 1.8, 6, '#c9a860', { x: tx, y: ty + H + 7.8, z: tz });
    w.box(tx, tz, 2.1, 2.1, 0, ty - 2, ty + H);
    w.lights.push({ x: tx + 2.5, y: ty + H - 2.5, z: tz, color: 0xffe0a0, intensity: 1, range: 20 });
  }
  // stone town wall with towers; gatehouses where roads pass; the lake guards the south
  const WC = [0, 5], WR = 128;
  const segs = 28;
  const pts = [];
  for (let i = 0; i <= segs; i++) { const a = (i / segs) * Math.PI * 2; pts.push([WC[0] + Math.cos(a) * WR, WC[1] + Math.sin(a) * WR]); }
  for (let i = 0; i < segs; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (mz > 62) continue;
    const y = Math.min(T.heightAt(ax, az), T.heightAt(bx, bz));
    if (T.roadDist(mx, mz) < 12) {
      // gatehouse
      const rot = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
      tower(k, w, ax, y, az, 3, 12, { roofH: 6, color: '#8a8278', light: false });
      tower(k, w, bx, y, bz, 3, 12, { roofH: 6, color: '#8a8278', light: false });
      const len = Math.hypot(bx - ax, bz - az);
      k.box('stone', len, 3, 3, '#8a8278', { x: mx, y: y + 9, z: mz, ry: rot + Math.PI / 2 });
      w.lights.push({ x: mx, y: y + 5, z: mz, color: 0xff9040, intensity: 1.2, range: 16 });
      continue;
    }
    wallSeg(k, w, ax, az, bx, bz, y, 7, 2.2, '#8a8278');
    if (i % 3 === 0) tower(k, w, ax, y, az, 3.4, 11, { roofH: 7, color: '#8a8278', light: false });
    w.noTrees(mx, mz, 10);
  }
  return houses;
}
