// The countryside: rubble-stone cottages with sagging slate roofs and great chimneys, hamlets,
// overgrown ruins, drystone-walled fields, standing stones and wayside shrines.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { PLACES, WATER_Y, BAYOU } from './layout.js';

const WARM = '#ffb45e';
const L = (x, z, rot) => (lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];

// Ivy: leaf cards pressed flat against a wall face (normal given in world space)
function ivy(k, x, y, z, nx, nz, w, h, r) {
  const n = Math.max(2, Math.round(w * h * 1.4));
  for (let i = 0; i < n; i++) {
    const u = (r() - 0.5) * w, v = r() * h;
    const px = x + nz * u + nx * 0.06, pz = z - nx * u + nz * 0.06;
    const g = new THREE.PlaneGeometry(0.9 + r() * 0.8, 0.9 + r() * 0.8);
    const geom = k.add('ivy', g, ['#8a9a70', '#7a8a60', '#9aa878'][i % 3], { x: px, y: y + v, z: pz, ry: Math.atan2(nx, nz), rz: r() * 6, bright: 0.7 + r() * 0.4 });
    const nr = geom.attributes.normal; for (let j = 0; j < nr.count; j++) nr.setXYZ(j, nx, 0.4, nz);
  }
}

function shrub(k, x, y, z, s, r) {
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI;
    for (const off of [0, Math.PI / 2]) {
      const g = new THREE.PlaneGeometry(1.4 * s, 1.1 * s);
      k.add('ivy', g, '#8a9870', { x: x + (r() - 0.5) * s, y: y + 0.45 * s + r() * 0.3 * s, z: z + (r() - 0.5) * s, ry: a + off, bright: 0.7 + r() * 0.3 });
    }
  }
}

// The stone cottage from the painting: rubble walls, cross-gabled slate roof that sags,
// a massive tapering chimney, an arched stone porch and deep-set windows
export function stoneCottage(k, w, T, x, z, rot, seed, o = {}) {
  const r = mulberry32(seed);
  const P = L(x, z, rot);
  const W = 7 + r() * 2, D = 5.2 + r() * 1.2, H = 2.8 + r() * 0.6;
  let y0 = Infinity;
  for (const [a, b] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) { const [px, pz] = P(a, b); y0 = Math.min(y0, T.heightAt(px, pz)); }
  const stone = ['#7c7a84', '#86828a', '#72707c'][Math.floor(r() * 3)];
  const ruined = !!o.ruined;
  const put = (lx, ly, lz, bw, bh, bd, col, ex = {}) => { const [px, pz] = P(lx, lz); k.box(ex.kind || 'stone', bw, bh, bd, col, { x: px, y: y0 + ly, z: pz, ry: rot + (ex.ry || 0), rx: ex.rx || 0, rz: ex.rz || 0, bright: ex.bright, order: 'YXZ' }); };
  // walls (slightly battered at the base), with an uneven top when ruined
  put(0, H / 2 - 0.6, 0, W, H + 1.2, D, stone);
  put(0, 0.1, 0, W + 0.5, 0.8, D + 0.5, '#6a6872');
  if (ruined) for (let i = 0; i < 6; i++) put((r() - 0.5) * W, H + r() * 0.8, (r() < 0.5 ? -1 : 1) * D / 2, 0.8 + r(), 0.6 + r(), 0.7, stone);
  // cross-gable wing with an arched door
  const wx = W * 0.18, wd = 2.6;
  put(wx, H / 2 - 0.6, D / 2 + wd / 2 - 0.1, 3.4, H + 1.2, wd, stone);
  {
    const [ax, az] = P(wx, D / 2 + wd + 0.02);
    k.add('stone', new THREE.TorusGeometry(0.95, 0.28, 8, 14, Math.PI), '#8e8a92', { x: ax, y: y0 + 1.7, z: az, ry: rot });
    for (const s of [-1, 1]) { const [px, pz] = P(wx + s * 0.95, D / 2 + wd + 0.02); k.box('stone', 0.5, 1.8, 0.5, '#8e8a92', { x: px, y: y0 + 0.9, z: pz, ry: rot }); }
    k.box('plain', 1.5, 2.5, 0.2, '#0a080c', { x: ax, y: y0 + 1.25, z: az, ry: rot });
    if (!ruined && r() < 0.6) { const [lx, lz] = P(wx + 1.4, D / 2 + wd + 0.3); k.box('glow', 0.2, 0.3, 0.2, WARM, { x: lx, y: y0 + 2.1, z: lz, bright: 2.2 }); w.lights.push({ x: lx, y: y0 + 2.1, z: lz + 0.5, color: 0xffa050, intensity: 0.8, range: 12 }); }
  }
  // windows: small, deep, stone-framed
  for (const [lx, lz, face] of [[-W * 0.28, D / 2 + 0.03, 0], [W * 0.38, D / 2 + 0.03, 0], [-W * 0.2, -D / 2 - 0.03, Math.PI], [W * 0.25, -D / 2 - 0.03, Math.PI]]) {
    const lit = !ruined && r() < 0.7;
    put(lx, 1.5, lz, 0.75, 0.95, 0.1, lit ? WARM : '#0c0a10', { kind: lit ? 'glow' : 'plain', ry: face, bright: lit ? 1.6 + r() : 1 });
    put(lx, 1.5 + 0.6, lz, 1.05, 0.22, 0.3, '#8e8a92', { ry: face });
    put(lx, 1.5 - 0.58, lz, 1.05, 0.14, 0.34, '#8e8a92', { ry: face });
  }
  // roofs: steep slate planes that sag, plus the wing's gable roof
  if (!ruined || r() < 0.4) {
    const pitch = 0.95 + r() * 0.15, span = D / 2 + 0.5, slope = span / Math.cos(pitch), rise = Math.tan(pitch) * span;
    const col = ['#4a4a5a', '#565262', '#44444e'][Math.floor(r() * 3)];
    for (const s of [-1, 1]) for (let seg = 0; seg < 3; seg++) {
      const sag = seg === 1 ? 0.12 : 0;
      put(-W / 2 + W * (seg + 0.5) / 3, H + rise / 2 - 0.35 - sag, s * (span / 2 - 0.25), W / 3 + 0.35, 0.18, slope, col, { kind: 'roof', rx: s * pitch, rz: (r() - 0.5) * 0.04 });
    }
    put(0, H + rise - 0.3, 0, W + 0.4, 0.2, 0.35, '#3a3a44', { kind: 'roof' });
    // gable end walls
    for (const s of [-1, 1]) {
      const g = new THREE.Shape(); g.moveTo(-D / 2, 0); g.lineTo(D / 2, 0); g.lineTo(0, rise - 0.3); g.closePath();
      const geo = new THREE.ExtrudeGeometry(g, { depth: 0.6, bevelEnabled: false }); geo.translate(0, 0, -0.3); geo.rotateY(Math.PI / 2);
      const [px, pz] = P(s * (W / 2 - 0.3), 0);
      k.add('stone', geo, stone, { x: px, y: y0 + H - 0.05, z: pz, ry: rot });
    }
    // wing roof
    const wr = 1.9;
    for (const s of [-1, 1]) put(wx + s * 1.0, H + 0.75, D / 2 + wd / 2 + 0.2, 2.5, 0.18, wd + 1.2, col, { kind: 'roof', rz: -s * 0.9 });
    void wr;
  }
  // the chimney: wide at the base, tapering, rougher stones
  {
    const cx = -W / 2 - 0.5, top = H + 4.6;
    for (let i = 0; i < 7; i++) {
      const t = i / 6, bw = 2.2 - t * 0.9;
      put(cx, 0.4 + t * top, 0.3, bw, top / 6 + 0.2, bw * 0.9, stone, { rz: (r() - 0.5) * 0.03 });
    }
    put(cx, top + 0.7, 0.3, 1.4, 0.3, 1.2, '#5e5c66');
    const [chx, chz] = P(cx, 0.3);
    if (!ruined) w.chimneys.push({ x: chx, y: y0 + top + 1, z: chz });
  }
  // overgrowth: ivy up the walls, shrubs at the foot
  const [f1x, f1z] = P(-W * 0.35, D / 2 + 0.02);
  ivy(k, f1x, y0 + 0.2, f1z, Math.sin(rot), Math.cos(rot), 2.5, 2.4 + r() * 1.5, r);
  const [f2x, f2z] = P(W / 2 + 0.02, 0);
  ivy(k, f2x, y0 + 0.2, f2z, Math.cos(rot), -Math.sin(rot), 3, 2 + r() * 2, r);
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, [sx, sz] = P(Math.cos(a) * (W / 2 + 1), Math.sin(a) * (D / 2 + 1.2));
    shrub(k, sx, T.heightAt(sx, sz), sz, 0.8 + r() * 0.8, r);
  }
  w.box(x, z, W / 2 + 0.3, D / 2 + 0.3, rot, y0 - 2, y0 + H + 4);
  const [wxx, wzz] = P(wx, D / 2 + wd / 2);
  w.box(wxx, wzz, 1.8, wd / 2, rot, y0 - 2, y0 + H + 2);
  w.noTrees(x, z, Math.max(W, D) + 4);
  return y0;
}

// Drystone wall of irregular stones following the ground
export function dryWall(k, w, T, pts, r, gap = -1) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az), rot = Math.atan2(-(bz - az), bx - ax);
    if (i === gap) continue;
    for (let d = 0; d < len; d += 0.7) {
      const t = d / len, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = T.heightAt(x, z);
      for (let row = 0; row < 3; row++) {
        const s = 0.35 + r() * 0.3;
        k.box('stone', 0.6 + r() * 0.4, s, 0.55 - row * 0.08, ['#7a7880', '#8a8690', '#6e6c76'][Math.floor(r() * 3)], { x: x + (r() - 0.5) * 0.1, y: y + 0.18 + row * 0.33, z: z + (r() - 0.5) * 0.1, ry: rot + (r() - 0.5) * 0.25, rz: (r() - 0.5) * 0.2 });
      }
      if (r() < 0.12) k.add('ivy', new THREE.PlaneGeometry(0.8, 0.6), '#8a9a70', { x, y: y + 1.05, z, rx: -Math.PI / 2 + 0.3, bright: 0.7 });
    }
    w.wall(ax, az, bx, bz, 0.6, T.heightAt(ax, az) - 1, T.heightAt(ax, az) + 1.1);
  }
}

function standingStones(k, w, T, x, z, r) {
  const n = 5 + Math.floor(r() * 4), R = 6 + r() * 4;
  for (let i = 0; i < n; i++) {
    if (r() < 0.15) continue;
    const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R, y = T.heightAt(px, pz), h = 2 + r() * 2;
    const g = new THREE.BoxGeometry(1.1, h, 0.6, 2, 4, 2);
    const p = g.attributes.position; for (let j = 0; j < p.count; j++) p.setXYZ(j, p.getX(j) * (1 - (p.getY(j) / h + 0.5) * 0.3) + (r() - 0.5) * 0.08, p.getY(j), p.getZ(j) + (r() - 0.5) * 0.06);
    g.computeVertexNormals();
    k.add('stone', g, '#8a8894', { x: px, y: y + h / 2 - 0.2, z: pz, ry: -a + Math.PI / 2, rz: (r() - 0.5) * 0.15 });
    k.add('ivy', new THREE.PlaneGeometry(0.9, 1.2), '#8a9a70', { x: px, y: y + 0.5, z: pz, ry: -a, bright: 0.6 });
    w.circle(px, pz, 0.6, y - 1, y + h);
  }
  w.noTrees(x, z, R + 3);
}

function wayShrine(k, w, T, x, z, rot, r) {
  const y = T.heightAt(x, z);
  const P = L(x, z, rot);
  k.box('stone', 1.4, 2.4, 1, '#8a8690', { x, y: y + 1.2, z, ry: rot });
  k.add('roof', new THREE.ConeGeometry(1.2, 0.9, 4), '#4a4858', { x, y: y + 2.8, z, ry: rot + Math.PI / 4 });
  const [nx, nz] = P(0, 0.52);
  k.box('plain', 0.6, 0.9, 0.08, '#0a080c', { x: nx, y: y + 1.5, z: nz, ry: rot });
  k.box('glow', 0.12, 0.22, 0.12, WARM, { x: nx, y: y + 1.25, z: nz, bright: 2.4 });
  w.lights.push({ x: nx, y: y + 1.3, z: nz, color: 0xffa050, intensity: 0.6, range: 9 });
  shrub(k, x + 1, y, z + 0.6, 0.8, r);
  w.circle(x, z, 0.8, y - 1, y + 3);
  w.noTrees(x, z, 4);
}

// Find open, gentle ground well away from named places
export function buildCountryside(scene, Kit, mats, w, T) {
  const r = mulberry32(2024);
  const taken = PLACES.map((p) => [p.x, p.z, p.r + 60]);
  taken.push([0, 30, 190], [BAYOU.x, BAYOU.z, BAYOU.r + 60]);
  const ok = (x, z, rad) => {
    const y = T.heightAt(x, z);
    if (y < WATER_Y + 3 || y > 150) return false;
    if (Math.hypot(x, z) > 1150) return false;
    for (let a = 0; a < 6; a++) { const px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad; if (T.slope(px, pz) > 0.32 || T.heightAt(px, pz) < WATER_Y + 2) return false; }
    for (const [tx, tz, tr] of taken) if (Math.hypot(x - tx, z - tz) < tr + rad) return false;
    return true;
  };
  const kits = [];
  const newKit = () => { const k = new Kit(mats); kits.push(k); return k; };
  const plan = [['hamlet', 16, 34], ['ruin', 18, 12], ['field', 14, 30], ['stones', 6, 12], ['shrine', 22, 4]];
  const placed = [];
  for (const [kind, count, rad] of plan) {
    let n = 0;
    for (let tries = 0; tries < 4000 && n < count; tries++) {
      const x = (r() - 0.5) * 2300, z = (r() - 0.5) * 2300;
      if (!ok(x, z, rad)) continue;
      // shrines and hamlets like to sit near roads
      const rd = T.roadDist(x, z);
      if ((kind === 'shrine' && (rd < 7 || rd > 16)) || (kind === 'hamlet' && rd < 12)) continue;
      taken.push([x, z, rad]);
      placed.push([kind, x, z]);
      const k = newKit();
      const rot = r() * Math.PI * 2;
      if (kind === 'hamlet') {
        const houses = 2 + Math.floor(r() * 3);
        for (let i = 0; i < houses; i++) {
          const a = (i / houses) * Math.PI * 2 + r(), d = 10 + r() * 8;
          stoneCottage(k, w, T, x + Math.cos(a) * d, z + Math.sin(a) * d, Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI + (r() - 0.5) * 0.4, Math.floor(r() * 1e6));
        }
        const wallPts = []; const R = 30;
        for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 1.6 + rot; wallPts.push([x + Math.cos(a) * R, z + Math.sin(a) * R * 0.8]); }
        dryWall(k, w, T, wallPts, r, 4);
        // well
        const wy = T.heightAt(x, z);
        k.cyl('stone', 1.1, 1.2, 1.0, 14, '#86828c', { x, y: wy + 0.4, z });
        k.cyl('plain', 0.95, 0.95, 0.05, 14, '#0a0a14', { x, y: wy + 0.88, z });
        w.circle(x, z, 1.2, wy - 1, wy + 1.5);
        w.noTrees(x, z, R + 4);
      } else if (kind === 'ruin') {
        stoneCottage(k, w, T, x, z, rot, Math.floor(r() * 1e6), { ruined: true });
      } else if (kind === 'field') {
        const hw = 18 + r() * 12, hd = 14 + r() * 10, c = Math.cos(rot), s = Math.sin(rot);
        const corner = (u, v) => [x + u * c + v * s, z - u * s + v * c];
        dryWall(k, w, T, [corner(-hw, -hd), corner(hw, -hd), corner(hw, hd), corner(-hw, hd), corner(-hw, -hd)], r, Math.floor(r() * 4));
        w.noTrees(x, z, Math.max(hw, hd));
        // haystacks
        for (let i = 0; i < 3; i++) { const [hx, hz] = corner((r() - 0.5) * hw, (r() - 0.5) * hd), hy = T.heightAt(hx, hz); k.lathe('thatch', [[0.001, 0], [1.3, 0], [1.2, 1], [0.6, 1.9], [0.001, 2.2]], 14, '#a89060', { x: hx, y: hy - 0.1, z: hz }); w.circle(hx, hz, 1.3, hy - 1, hy + 2); }
      } else if (kind === 'stones') standingStones(k, w, T, x, z, r);
      else wayShrine(k, w, T, x, z, rot, r);
      n++;
    }
  }
  for (const k of kits) scene.add(k.build());
  return placed;
}
