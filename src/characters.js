// Character models built from simple shapes, plus the NPC brain (wander, patrol, fly, float, talk).
import * as THREE from 'three';
import { Kit } from './kit.js';
import { sculpt, eye, ruffle, hand, humanHead } from './sculpt.js';

const V2 = (pts) => pts.map(([x, y]) => [x, y]);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function robe(k, color, h = 1.5, r = 0.44, flare = 1, kind = 'velvet') {
  k.lathe(kind, V2([[0.001, 0], [r * flare, 0.02], [r * 0.92, 0.3], [r * 0.72, h * 0.62], [r * 0.52, h * 0.9], [0.2, h], [0.001, h + 0.03]]), 14, color, { shadeY: 0.35, bright: 0.8 });
}
function sleeves(k, color, skin, y = 1.18, spread = 0.55, reach = 0.0, kind = 'velvet', size = 0.75) {
  for (const s of [-1, 1]) {
    k.cone(kind, 0.12, 0.62, 12, color, { x: s * 0.3, y, z: reach, rz: s * spread, rx: -0.2 });
    const hx = s * (0.3 + Math.sin(spread) * 0.34), hy = y - 0.33, hz = reach + 0.08;
    hand(k, [hx, hy, hz], [s * 0.15, -1, 0.35], [s, 0, 0.3], skin, size, '#c8a898', 0.45);
  }
}
function strandBeard(k, at, bc, n = 46) {
  let sd = 5; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < n; i++) {
    const t = -1.25 + (i / (n - 1)) * 2.5;
    const base = at(Math.sin(t) * 0.85, -0.45 - Math.abs(t) * 0.12, Math.cos(t) * 0.85, 0.02);
    const L = (0.5 - Math.abs(t) * 0.16) * (0.75 + rr() * 0.45);
    const dir = [Math.sin(t) * 0.25 + (rr() - 0.5) * 0.15, -1, 0.5 + Math.cos(t) * 0.1];
    const dl = Math.hypot(...dir);
    k.cone('plain', 0.02 + rr() * 0.012, L, 5, bc, { x: base[0] + dir[0] / dl * L * 0.45, y: base[1] + dir[1] / dl * L * 0.45, z: base[2] + 0.08 + dir[2] / dl * L * 0.45, dir: dir.map((v) => -v), bright: 0.8 + rr() * 0.35 });
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
    const base = at(sx * 0.12, -0.36, 0.98, 0.03);
    k.cone('plain', 0.012, 0.13 + i * 0.01, 5, bc, { x: base[0] + sx * 0.05, y: base[1] - 0.02 - i * 0.004, z: base[2], dir: [-sx, 0.4 + i * 0.05, 0], bright: 0.9 });
  }
}
function head(k, y, skin, r = 0.16) { k.sphere('skin', r, skin, { y, ws: 12, hs: 10 }); }
function eyes(k, y, z, color = '#1a1418', sep = 0.055, r = 0.022, kind = 'plain') {
  for (const s of [-1, 1]) k.sphere(kind, r, color, { x: s * sep, y, z, ws: 6, hs: 5, bright: kind === 'glow' ? 2.5 : 1 });
}
function pointyHat(k, y, color, r = 0.3, h = 0.8, brim = 0.46, bend = 0.25) {
  k.cyl('cloth', brim, brim, 0.035, 18, color, { y });
  k.cone('cloth', r, h * 0.55, 12, color, { y: y + h * 0.27 });
  k.cone('cloth', r * 0.55, h * 0.5, 10, color, { y: y + h * 0.62, z: -bend * 0.2, rx: -bend });
  k.cyl('cloth', r * 1.02, r * 1.02, 0.06, 14, '#1a1620', { y: y + 0.05 });
}

export function buildCharacter(mats, type, o = {}) {
  const k = new Kit(mats);
  const skin = o.skin || '#e0b89a';
  let height = 1.8, radius = 0.4;
  switch (type) {
    case 'wizard': {
      robe(k, o.robe || '#3a3a7a', 1.52, 0.44);
      k.lathe('velvet', V2([[0.52, 0.2], [0.5, 0.95], [0.46, 1.3], [0.3, 1.48], [0.18, 1.56]]), 24, o.cloak || o.robe || '#2e2e62', { bright: 0.7, z: -0.03, phi0: Math.PI * 0.55, phiLen: Math.PI * 0.9 });
      sleeves(k, o.robe || '#3a3a7a', skin, 1.2, 0.5, 0.05);
      const at = humanHead(k, [0, 1.66, 0], 0.16, skin, { age: o.beard !== false ? 1.4 : 0.3, brow: 1.5, browColor: o.beard !== false ? (o.beardColor || '#d8d4dc') : '#3a2a20', iris: '#3a5a8a', nose: 1.2, seed: 11 });
      if (o.beard !== false) strandBeard(k, at, o.beardColor || '#d8d4dc');
    pointyHat(k, 1.76, o.hat || '#2a2a5c', 0.3, o.hatH || 0.85);
      if (o.staff !== false) {
        k.cyl('wood', 0.025, 0.03, 1.95, 6, '#4a3526', { x: 0.52, y: 0.98, z: 0.12 });
        k.sphere('glow', 0.09, o.orb || '#9fd0ff', { x: 0.52, y: 2.0, z: 0.12, bright: 3 });
      }
      height = 2.5;
      break;
    }
    case 'witch': {
      robe(k, o.robe || '#2a2240', 1.5, 0.42, 1.1);
      sleeves(k, o.robe || '#2a2240', skin, 1.2, 0.35);
      humanHead(k, [0, 1.64, 0], 0.15, skin, { hook: true, chin: 1.7, warts: 3, iris: '#3a7a3a', lid: 0.38, seed: 23, age: 0.8 });
      k.cone('plain', 0.2, 0.7, 12, o.hair || '#4a2a2a', { y: 1.35, z: -0.08, rx: Math.PI });
      k.sphere('plain', 0.17, o.hair || '#4a2a2a', { y: 1.7, z: -0.05, sy: 0.9 });
      pointyHat(k, 1.74, o.hat || '#1e1a30', 0.28, 0.95, 0.55, 0.45);
      if (o.broom) {
        k.cyl('wood', 0.03, 0.03, 2.2, 5, '#5a4030', { y: 0.7, z: 0.1, rx: Math.PI / 2 });
        k.cone('thatch', 0.22, 0.6, 8, '#a08858', { y: 0.7, z: -1.2, rx: -Math.PI / 2 });
      }
      height = 2.6;
      break;
    }
    case 'goblin': {
      const S = o.size || 1;
      const vest = o.vest || '#6a1420';
      const g = o.skin || '#56612e';
      const P = (x, y, z) => [x * S, y * S, z * S];
      // legs and boots
      for (const sx of [-1, 1]) {
        k.limb('cloth', P(sx * 0.16, 0.52, 0), P(sx * 0.18, 0.26, 0.04), 0.12 * S, 0.1 * S, '#2e2a30', { seg: 12 });
        k.limb('hide', P(sx * 0.18, 0.28, 0.04), P(sx * 0.17, 0.05, 0.02), 0.1 * S, 0.09 * S, '#2a1e16', { seg: 12 });
        k.sphere('hide', 0.1 * S, '#2a1e16', { x: sx * 0.17 * S, y: 0.05 * S, z: 0.09 * S, sz: 1.7, sy: 0.6, ws: 14, hs: 10 });
      }
      // barrel body: shirt underneath, crushed velvet waistcoat over it
      const prof = [[0.001, 0.42], [0.36, 0.44], [0.5, 0.6], [0.55, 0.76], [0.53, 0.94], [0.47, 1.08], [0.38, 1.2], [0.22, 1.3], [0.001, 1.33]];
      const R = (y) => { for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0.2; };
      k.lathe('cloth', prof.map(([r, y]) => [r * S, y * S]), 40, '#b4aa94', {});
      const vestLow = prof.filter(([, y]) => y >= 0.44 && y <= 0.94).map(([r, y]) => [r * 1.05 * S, y * S]);
      const vestHigh = prof.filter(([, y]) => y >= 0.9 && y <= 1.25).map(([r, y]) => [r * 1.05 * S, y * S]);
      vestHigh.unshift([R(0.9) * 1.05 * S, 0.9 * S]);
      k.lathe('velvet', vestLow, 48, vest, { phi0: 0.12, phiLen: Math.PI * 2 - 0.24 });
      k.lathe('velvet', vestHigh, 48, vest, { phi0: 0.55, phiLen: Math.PI * 2 - 1.1 });
      for (const y of [0.56, 0.68, 0.8, 0.92]) k.sphere('metal', 0.028 * S, '#9a9aa4', { x: 0.035 * S, y: y * S, z: (R(y) * 1.05 + 0.012) * S, sz: 0.6, ws: 10, hs: 8 });
      // lace jabot at the throat
      ruffle(k, P(0, 1.2, 0.3), [0, -1, 0.35], 0.07 * S, 0.14 * S, '#c8bca2', 10, 2.2);
      ruffle(k, P(0, 1.1, 0.36), [0, -1, 0.25], 0.06 * S, 0.14 * S, '#bcb098', 10, 2.2);
      // arms: puffy shirt sleeves, lace cuffs and big clawed hands
      const arm = (sx, elbow, wrist, fwd, up, curl) => {
        const sh = P(sx * 0.46, 1.12, 0.0);
        const el = P(...elbow), wr = P(...wrist);
        k.sphere('cloth', 0.15 * S, '#b4aa94', { x: sh[0], y: sh[1], z: sh[2], ws: 16, hs: 12 });
        k.limb('cloth', sh, el, 0.14 * S, 0.12 * S, '#b4aa94', { seg: 16 });
        k.sphere('cloth', 0.12 * S, '#aca28c', { x: el[0], y: el[1], z: el[2], ws: 14, hs: 10 });
        k.limb('cloth', el, wr, 0.12 * S, 0.085 * S, '#b4aa94', { seg: 16 });
        const d = [wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]];
        const L = Math.hypot(...d);
        ruffle(k, [wr[0] - d[0] / L * 0.02, wr[1] - d[1] / L * 0.02, wr[2] - d[2] / L * 0.02], d, 0.085 * S, 0.1 * S, '#c8bca2', 11, 1.9);
        hand(k, [wr[0] + d[0] / L * 0.09 * S, wr[1] + d[1] / L * 0.09 * S, wr[2] + d[2] / L * 0.09 * S], fwd, up, g, 1.45 * S, '#2a2418', curl);
      };
      if (o.gesture) arm(1, [0.6, 0.9, 0.3], [0.5, 0.98, 0.66], [-0.2, 0.15, 1], [0, -1, 0.1], 0.35);
      else arm(1, [0.6, 0.86, 0.12], [0.55, 0.66, 0.3], [0, -0.6, 0.8], [1, 0, 0.3], 0.55);
      arm(-1, [-0.6, 0.86, 0.12], [-0.55, 0.66, 0.3], [0, -0.6, 0.8], [-1, 0, 0.3], 0.55);
      // the head
      const hc = P(0, 1.44, 0.1), hr = 0.27 * S;
      const head = sculpt({
        r: hr, scale: [1.12, 1.05, 1.08], wrinkle: 0.045, warts: 60, seed: o.seed || 7, detail: 96,
        feats: [
          { d: [0.7, 0.7, 0], a: -0.12, w: [0.4, 0.4, 0.5] }, { d: [-0.7, 0.7, 0], a: -0.12, w: [0.4, 0.4, 0.5] },
          { d: [0, 0.28, 0.96], a: 0.24, w: [0.8, 0.13, 0.35] }, { d: [0, 0.4, 0.92], a: -0.06, w: [0.1, 0.12, 0.2] },
          { d: [0.34, 0.12, 0.93], a: -0.16, w: [0.13, 0.1, 0.2] }, { d: [-0.34, 0.12, 0.93], a: -0.16, w: [0.13, 0.1, 0.2] },
          { d: [0, 0.08, 1], a: 0.25, w: [0.12, 0.25, 0.3] }, { d: [0, -0.18, 1], a: 0.6, w: [0.22, 0.2, 0.3] },
          { d: [0.17, -0.28, 0.95], a: 0.18, w: [0.1, 0.09, 0.12] }, { d: [-0.17, -0.28, 0.95], a: 0.18, w: [0.1, 0.09, 0.12] },
          { d: [0.58, -0.12, 0.8], a: 0.24, w: [0.28, 0.24, 0.3] }, { d: [-0.58, -0.12, 0.8], a: 0.24, w: [0.28, 0.24, 0.3] },
          { d: [0.7, -0.6, 0.35], a: 0.45, w: [0.35, 0.32, 0.4] }, { d: [-0.7, -0.6, 0.35], a: 0.45, w: [0.35, 0.32, 0.4] },
          { d: [0, -0.82, 0.55], a: 0.32, w: [0.65, 0.25, 0.35] }, { d: [0, -0.95, 0.2], a: 0.25, w: [0.5, 0.2, 0.4] },
          { d: [0, -0.48, 0.88], a: -0.22, w: [0.7, 0.06, 0.4] }, { d: [0, -0.4, 0.92], a: 0.08, w: [0.45, 0.05, 0.3] },
          { d: [0, -0.58, 0.85], a: 0.1, w: [0.55, 0.06, 0.3] }, { d: [0, 0.3, -1], a: 0.08, w: [0.6, 0.6, 0.5] },
        ],
      });
      k.add('skin', head.geo, g, { x: hc[0], y: hc[1], z: hc[2], vcol: head.vcol });
      const at = (x, y, z, push = 0) => { const q = head.surf(x, y, z, push); return [hc[0] + q[0], hc[1] + q[1], hc[2] + q[2]]; };
      // eyes under the heavy brow
      for (const sx of [-1, 1]) eye(k, at(sx * 0.34, 0.13, 0.93, -0.1), 0.042 * S, o.eyes || '#b0401a', g, 0.44, [-sx * 0.08, -0.05, 1]);
      // teeth: an underbite of fangs and a row of crooked upper teeth
      for (let i = 0; i <= 12; i++) {
        const t = -0.55 + (i / 12) * 1.1;
        const lower = at(Math.sin(t), -0.53, Math.cos(t), 0.03);
        const canine = Math.abs(Math.abs(t) - 0.35) < 0.06;
        const len = (canine ? 0.12 : 0.045 + ((i * 7) % 3) * 0.012) * S;
        k.cone('enamel', (canine ? 0.02 : 0.013) * S, len, 7, '#d8c890', { x: lower[0], y: lower[1] + len * 0.35, z: lower[2], dir: [Math.sin(t) * 0.2, 1, 0.25 + ((i * 3) % 2) * 0.1] });
        if (i % 2 === 0 && Math.abs(t) < 0.45) {
          const upper = at(Math.sin(t), -0.44, Math.cos(t), 0.0);
          const ul = (0.03 + ((i * 5) % 3) * 0.01) * S;
          k.cone('enamel', 0.012 * S, ul, 7, '#cfbd84', { x: upper[0], y: upper[1] - ul * 0.3, z: upper[2], dir: [0, -1, 0.15] });
        }
      }
      // long ears, angled out and back
      for (const sx of [-1, 1]) {
        const base = at(sx, 0.18, -0.05, -0.05);
        const dir = [sx, 0.42, -0.3], L = 0.6 * S;
        const dl = Math.hypot(...dir);
        const c = [base[0] + dir[0] / dl * L * 0.45, base[1] + dir[1] / dl * L * 0.45, base[2] + dir[2] / dl * L * 0.45];
        k.cone('skin', 0.12 * S, L, 16, g, { x: c[0], y: c[1], z: c[2], dir, sz: 0.3, bright: 0.95 });
        k.cone('hide', 0.08 * S, L * 0.75, 12, '#6a4a34', { x: c[0], y: c[1] - 0.01, z: c[2] + 0.02 * S, dir, sz: 0.2 });
        for (let h = 0; h < 3; h++) k.cone('plain', 0.006 * S, 0.1 * S, 4, '#8a8a80', { x: c[0] + dir[0] / dl * L * 0.3, y: c[1] + h * 0.015, z: c[2], dir: [dir[0], dir[1] + 0.6, dir[2]] });
      }
      // wiry hair tufts
      for (let h = 0; h < 14; h++) {
        const a = (h / 14) * Math.PI * 2;
        const p = at(Math.cos(a) * 0.5, 0.8, Math.sin(a) * 0.5 - 0.2, -0.02);
        k.cone('plain', 0.008 * S, (0.1 + (h % 3) * 0.04) * S, 4, '#6a6a60', { x: p[0], y: p[1], z: p[2], dir: [Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6 - 0.3] });
      }
      if (o.monocle) {
        const m = at(0.34, 0.13, 0.93, 0.06);
        k.add('metal', new THREE.TorusGeometry(0.058 * S, 0.008 * S, 8, 28), '#d8b860', { x: m[0], y: m[1], z: m[2] });
        k.cyl('glass', 0.055 * S, 0.055 * S, 0.004, 20, '#ffffff', { x: m[0], y: m[1], z: m[2], rx: Math.PI / 2 });
        const curve = new THREE.CatmullRomCurve3([V3(m[0] + 0.058 * S, m[1], m[2]), V3(m[0] + 0.14 * S, m[1] - 0.14 * S, m[2] - 0.02), V3(0.3 * S, 1.02 * S, 0.34 * S), V3(0.06 * S, 0.92 * S, R(0.92) * 1.06 * S)]);
        k.add('metal', new THREE.TubeGeometry(curve, 40, 0.004 * S, 5), '#d8b860', {});
      }
      if (o.lantern) {
        const lx = -0.62 * S, ly = 0.42 * S, lz = 0.36 * S;
        k.cyl('metal', 0.07 * S, 0.09 * S, 0.04 * S, 10, '#2a2622', { x: lx, y: ly + 0.14 * S, z: lz });
        k.cyl('metal', 0.09 * S, 0.09 * S, 0.03 * S, 10, '#2a2622', { x: lx, y: ly - 0.12 * S, z: lz });
        for (let b = 0; b < 4; b++) { const a = b * Math.PI / 2 + 0.4; k.cyl('metal', 0.006 * S, 0.006 * S, 0.26 * S, 4, '#2a2622', { x: lx + Math.cos(a) * 0.08 * S, y: ly, z: lz + Math.sin(a) * 0.08 * S }); }
        k.cyl('glow', 0.065 * S, 0.065 * S, 0.2 * S, 12, '#ffa040', { x: lx, y: ly, z: lz, bright: 1.6 });
        k.add('metal', new THREE.TorusGeometry(0.04 * S, 0.006 * S, 6, 16), '#2a2622', { x: lx, y: ly + 0.2 * S, z: lz });
      }
      if (o.hat) {
        const t = at(0, 1, -0.1, 0);
        k.cyl('velvet', 0.2 * S, 0.2 * S, 0.02 * S, 20, o.hat, { x: t[0], y: t[1], z: t[2], rz: 0.12 });
        k.cyl('velvet', 0.13 * S, 0.15 * S, 0.28 * S, 20, o.hat, { x: t[0] + 0.02, y: t[1] + 0.15 * S, z: t[2], rz: 0.12 });
      }
      height = 1.78 * S; radius = 0.55 * S;
      k.headY = 1.44 * S; k.headZ = 0.1 * S;
      break;
    }
    case 'villager': {
      const c = o.robe || '#5a4a3a';
      const s = o.child ? 0.62 : 1;
      robe(k, c, 1.45 * s, 0.4 * s);
      if (o.apron) k.box('plain', 0.4 * s, 0.7 * s, 0.05, o.apron, { y: 0.55 * s, z: 0.3 * s });
      sleeves(k, c, skin, 1.15 * s, 0.4);
      const vat = humanHead(k, [0, 1.6 * s, 0], 0.16 * s, skin, { seed: Math.floor((o.robe || '#1').charCodeAt(2) || 5), nose: o.child ? 0.6 : 1, age: o.child ? 0 : 0.6, iris: '#4a3a2a', browColor: o.hair || '#4a3a2a' });
      if (o.beard) strandBeard(k, vat, o.beard, 40);
      if (o.hood !== false) k.sphere('cloth', 0.21 * s, o.hoodColor || c, { y: 1.63 * s, z: -0.05, sy: 1.1, bright: 0.8 });
      else k.sphere('plain', 0.17 * s, o.hair || '#6a4a30', { y: 1.66 * s, z: -0.04 });
      if (o.hat) { k.cyl('cloth', 0.36, 0.36, 0.03, 14, o.hat, { y: 1.76 }); k.cyl('cloth', 0.17, 0.19, 0.2, 12, o.hat, { y: 1.86 }); if (o.feather) k.cone('plain', 0.03, 0.4, 5, o.feather, { x: 0.15, y: 1.98, rz: -0.6 }); }
      if (o.lantern) { k.box('metal', 0.16, 0.03, 0.16, '#2a2622', { x: 0.48, y: 0.91, z: 0.15 }); k.box('glow', 0.12, 0.2, 0.12, '#ffa040', { x: 0.48, y: 0.8, z: 0.15, bright: 3 }); }
      if (o.lute) { k.sphere('wood', 0.2, '#8a5a30', { x: 0.1, y: 0.95, z: 0.3, sz: 0.4 }); k.box('wood', 0.06, 0.06, 0.6, '#5a3a20', { x: 0.1, y: 1.15, z: 0.3, rx: 1.0, ry: 0.5 }); }
      if (o.tool) k.cyl('wood', 0.03, 0.03, 1.6, 5, '#5a4030', { x: 0.45, y: 0.8, z: 0.1, rz: 0.2 });
      height = 1.9 * s; radius = 0.4 * s;
      break;
    }
    case 'knight': {
      const steel = o.steel || '#9a9cb0';
      for (const s of [-1, 1]) k.cyl('metal', 0.1, 0.11, 0.9, 8, steel, { x: s * 0.14, y: 0.45 });
      k.cyl('metal', 0.3, 0.26, 0.7, 10, steel, { y: 1.15 });
      k.box('cloth', 0.44, 0.75, 0.05, o.tabard || '#2a3a7a', { y: 1.0, z: 0.26 });
      k.box('glow', 0.12, 0.12, 0.02, o.crest || '#e0c060', { y: 1.15, z: 0.29, bright: 1.2 });
      for (const s of [-1, 1]) { k.sphere('metal', 0.14, steel, { x: s * 0.34, y: 1.45 }); k.cyl('metal', 0.07, 0.08, 0.7, 6, steel, { x: s * 0.36, y: 1.1, rz: s * 0.1 }); }
      k.cyl('metal', 0.16, 0.17, 0.36, 12, steel, { y: 1.72 });
      k.sphere('metal', 0.16, steel, { y: 1.9, sy: 0.6 });
      k.box('plain', 0.22, 0.03, 0.02, '#0a0a10', { y: 1.74, z: 0.165 });
      k.cone('cloth', 0.06, 0.45, 6, o.plume || '#a01a2a', { y: 2.1, z: -0.05, rx: -0.5 });
      k.box('cloth', 0.6, 1.3, 0.04, o.cape || '#1c2250', { y: 0.95, z: -0.3, rx: 0.08 });
      k.cyl('wood', 0.025, 0.025, 2.6, 5, '#4a3526', { x: 0.42, y: 1.3, z: 0.15 });
      k.cone('metal', 0.06, 0.3, 4, '#c8c8d8', { x: 0.42, y: 2.75, z: 0.15 });
      k.box('metal', 0.08, 0.7, 0.55, o.shield || '#5a2a2a', { x: -0.42, y: 1.05, z: 0.1 });
      height = 2.2;
      break;
    }
    case 'ghost': {
      const c = o.color || '#9ad8ff';
      k.lathe('ghost', V2([[0.001, 0.3], [0.4, 0.15], [0.38, 0.5], [0.3, 1.2], [0.22, 1.5], [0.001, 1.53]]), 12, c, { bright: 0.9 });
      k.sphere('ghost', 0.2, c, { y: 1.62 });
      for (const s of [-1, 1]) k.cone('ghost', 0.09, 0.6, 6, c, { x: s * 0.3, y: 1.1, rz: s * 0.8 });
      eyes(k, 1.66, 0.17, '#e8ffff', 0.07, 0.035, 'glow');
      height = 1.9;
      break;
    }
    case 'queen': {
      const c = o.robe || '#b8b4e8';
      k.lathe('cloth', V2([[0.001, 0], [0.62, 0.02], [0.5, 0.35], [0.3, 1.0], [0.22, 1.35], [0.2, 1.5], [0.001, 1.55]]), 18, c, { shadeY: 0.3 });
      k.lathe('glow', V2([[0.625, 0.03], [0.625, 0.09]]), 18, o.trim || '#b8c8ff', { bright: 1.6 });
      sleeves(k, c, o.skin || '#e8e0f0', 1.25, 0.35);
      humanHead(k, [0, 1.7, 0], 0.15, o.skin || '#e8e0f0', { nose: 0.7, chin: 0.8, iris: '#5a6ab8', lid: 0.3, lip: '#9a5a7a', browColor: o.hair || '#c8c8e0', seed: 41 });
      k.cone('plain', 0.22, 1.0, 10, o.hair || '#e0e0f4', { y: 1.35, z: -0.1, rx: Math.PI });
      k.sphere('plain', 0.17, o.hair || '#e0e0f4', { y: 1.75, z: -0.03 });
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; k.cone('glow', 0.03, 0.18, 4, o.crown || '#e8f0ff', { x: Math.cos(a) * 0.13, y: 1.93, z: Math.sin(a) * 0.13, bright: 2.5 }); }
      k.add('glow', new THREE.TorusGeometry(0.4, 0.015, 6, 36), o.crown || '#c0d0ff', { y: 1.9, z: -0.25, bright: 1.8 });
      height = 2.2;
      break;
    }
    case 'yak': {
      const fur = o.fur || '#5a3a22';
      const body = sculpt({ r: 0.9, scale: [0.85, 0.85, 1.55], warts: 0, wrinkle: 0.05, seed: o.seed || 2, detail: 40, feats: [{ d: [0, 0.8, 0.5], a: 0.35, w: [0.4, 0.3, 0.4] }, { d: [0, -1, 0], a: -0.1, w: [0.6, 0.3, 0.8] }] });
      k.add('velvet', body.geo, fur, { y: 1.35, vcol: body.vcol });
      let sd = (o.seed || 2) * 31; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let i = 0; i < 140; i++) { // long shaggy fur hanging from the body
        const a = rr() * Math.PI * 2, zz = (rr() - 0.5) * 2.6;
        const x = Math.cos(a) * 0.72, y = 1.25 + Math.sin(a) * 0.62;
        if (Math.sin(a) > 0.6) continue;
        const L = 0.5 + rr() * 0.6;
        k.cone('velvet', 0.07, L, 5, fur, { x, y: y - L / 2, z: zz, rx: Math.PI, bright: 0.7 + rr() * 0.5 });
      }
      for (const [x, z] of [[-0.4, 0.9], [0.4, 0.9], [-0.4, -0.9], [0.4, -0.9]]) {
        k.limb('hide', [x, 1.0, z], [x, 0.08, z], 0.14, 0.11, '#2a1c14', { seg: 8 });
        k.cyl('hide', 0.12, 0.13, 0.12, 8, '#1a1410', { x, y: 0.06, z });
      }
      const hd = sculpt({ r: 0.38, scale: [0.9, 0.9, 1.3], wrinkle: 0.03, seed: 5, detail: 32, feats: [{ d: [0, -0.3, 1], a: 0.2, w: [0.4, 0.3, 0.3] }, { d: [0, 0.6, 0.2], a: 0.2, w: [0.5, 0.3, 0.5] }] });
      k.add('velvet', hd.geo, '#3a2616', { y: 1.2, z: 1.75, vcol: hd.vcol });
      k.sphere('hide', 0.16, '#2a1c18', { y: 1.02, z: 2.2, sx: 1.3, sy: 0.8 });
      for (const sx of [-1, 1]) {
        eye(k, [sx * 0.24, 1.32, 2.02], 0.045, '#2a1a10', '#3a2616', 0.3, [sx * 0.5, 0, 1]);
        const horn = new THREE.TorusGeometry(0.28, 0.06, 8, 16, Math.PI * 0.9);
        k.add('enamel', horn, '#c8b898', { x: sx * 0.42, y: 1.55, z: 1.7, ry: sx > 0 ? 0 : Math.PI, rz: -0.3 * sx });
        k.cone('velvet', 0.07, 0.18, 5, '#3a2616', { x: sx * 0.36, y: 1.42, z: 1.62, rz: sx * 1.4 });
      }
      for (let i = 0; i < 30; i++) k.cone('velvet', 0.05, 0.35 + rr() * 0.2, 5, fur, { x: (rr() - 0.5) * 0.5, y: 1.45 - 0.1 + rr() * 0.2, z: 1.6 + rr() * 0.3, rx: 2.4 + rr() * 0.4 });
      if (o.pack) {
        k.box('cloth', 0.9, 0.5, 1.1, '#6a5a3a', { y: 2.05, z: -0.2 });
        for (const sx of [-1, 1]) k.box('cloth', 0.3, 0.6, 0.9, '#5a4a30', { x: sx * 0.7, y: 1.7, z: -0.2 });
        k.box('wood', 1.9, 0.06, 0.06, '#3a2a1a', { y: 2.33, z: -0.2 });
      }
      height = 2.3; radius = 1.0;
      k.headY = 1.3; k.headZ = 1.8;
      break;
    }
    case 'heron': {
      const g = '#6a7288';
      const body = sculpt({ r: 0.3, scale: [0.75, 0.8, 1.4], wrinkle: 0.01, seed: 9, detail: 32, feats: [{ d: [0, -0.3, -1], a: 0.4, w: [0.4, 0.3, 0.5] }] });
      k.add('velvet', body.geo, g, { y: 1.1, vcol: body.vcol });
      const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.25, 0.3), new THREE.Vector3(0, 1.55, 0.35), new THREE.Vector3(0, 1.75, 0.15), new THREE.Vector3(0, 1.95, 0.3)]);
      k.add('velvet', new THREE.TubeGeometry(neck, 20, 0.055, 8), '#8a90a4', {});
      k.sphere('velvet', 0.09, '#9aa0b4', { y: 1.97, z: 0.34, sz: 1.3, ws: 12, hs: 10 });
      k.cone('enamel', 0.035, 0.5, 8, '#c8a040', { y: 1.97, z: 0.64, rx: Math.PI / 2 });
      k.box('plain', 0.05, 0.03, 0.2, '#1a1a22', { y: 2.03, z: 0.3 });
      eye(k, [0.07, 1.99, 0.4], 0.02, '#d8b030', '#9aa0b4', 0.2, [1, 0, 0.3]);
      eye(k, [-0.07, 1.99, 0.4], 0.02, '#d8b030', '#9aa0b4', 0.2, [-1, 0, 0.3]);
      for (const sx of [-1, 1]) {
        k.limb('hide', [sx * 0.08, 0.9, 0], [sx * 0.08, 0.02, 0.05], 0.018, 0.014, '#3a3024', { seg: 6 });
        for (const a of [-0.5, 0, 0.5]) k.limb('hide', [sx * 0.08, 0.02, 0.05], [sx * 0.08 + Math.sin(a) * 0.12, 0.01, 0.05 + Math.cos(a) * 0.12], 0.01, 0.006, '#3a3024', { seg: 4 });
      }
      for (let i = 0; i < 10; i++) k.cone('velvet', 0.05, 0.4, 4, '#4a5064', { x: (i - 4.5) * 0.04, y: 1.08, z: -0.45, rx: -1.9 + (i % 3) * 0.1 });
      height = 2.1; radius = 0.4;
      k.headY = 1.95; k.headZ = 0.35;
      break;
    }
    case 'cat': {
      k.sphere('cloth', 0.16, '#141218', { y: 0.2, sz: 1.5, sy: 0.9 });
      k.sphere('cloth', 0.11, '#141218', { y: 0.36, z: 0.18 });
      for (const s of [-1, 1]) k.cone('cloth', 0.04, 0.09, 4, '#141218', { x: s * 0.06, y: 0.47, z: 0.18 });
      eyes(k, 0.38, 0.28, '#ffe060', 0.04, 0.018, 'glow');
      k.cyl('cloth', 0.02, 0.03, 0.4, 5, '#141218', { y: 0.35, z: -0.28, rx: -0.5 });
      height = 0.5; radius = 0.25;
      break;
    }
    default: break;
  }
  const headY = { wizard: 1.66, witch: 1.64, villager: 1.6 * (o.child ? 0.62 : 1), knight: 1.78, ghost: 1.62, queen: 1.7, cat: 0.36 }[type];
  const g = k.build();
  g.userData.height = height;
  g.userData.radius = radius;
  g.userData.headY = k.headY ?? headY ?? height * 0.85;
  g.userData.headZ = k.headZ ?? 0;
  return g;
}

export function buildDragon(mats) {
  const k = new Kit(mats);
  const c = '#2a2446';
  k.sphere('cloth', 1.6, c, { sz: 3.2, sy: 1.1 });
  k.cyl('cloth', 0.5, 1.0, 5, 8, c, { y: 1.2, z: 5.4, rx: 1.0 });
  k.box('cloth', 1.2, 0.9, 2.4, c, { y: 2.8, z: 8.2 });
  k.cone('cloth', 0.2, 1.1, 5, '#8a86b0', { x: 0.4, y: 3.5, z: 7.6, rx: -2.2 });
  k.cone('cloth', 0.2, 1.1, 5, '#8a86b0', { x: -0.4, y: 3.5, z: 7.6, rx: -2.2 });
  eyes(k, 3.0, 9.1, '#9fe8ff', 0.45, 0.14, 'glow');
  k.cone('cloth', 0.9, 11, 8, c, { z: -8, rx: -Math.PI / 2 - 0.05 });
  for (let i = 0; i < 8; i++) k.cone('cloth', 0.25, 0.8, 4, '#4a4070', { y: 1.5 - i * 0.12, z: 3 - i * 1.8 });
  const body = k.build({ shadows: false });
  const wing = (s) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(14 * s, 3); sh.lineTo(16 * s, -1); sh.lineTo(11 * s, -3); sh.lineTo(8 * s, -6); sh.lineTo(5 * s, -3.5); sh.lineTo(2 * s, -6); sh.lineTo(0, -2.5);
    const g = new THREE.ShapeGeometry(sh);
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3a3060, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x0a0818 }));
    const piv = new THREE.Group(); piv.add(m); piv.position.set(s * 1.1, 1.0, 1.5);
    return piv;
  };
  const wl = wing(1), wr = wing(-1);
  const g = new THREE.Group(); g.add(body, wl, wr);
  return { g, wl, wr };
}

// ---------- NPC behaviour ----------
export class NPC {
  constructor(def, model, world) {
    this.def = def;
    this.model = model;
    this.world = world;
    this.name = def.name; this.title = def.title || ''; this.lines = def.lines || [];
    this.talkable = !!(def.lines && def.lines.length);
    this.voice = def.voice ?? 1;
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.home = new THREE.Vector3(def.x, 0, def.z);
    this.radius = model.userData.radius || 0.4;
    this.baseScale = model.scale.y;
    this.facing = def.face ?? Math.random() * Math.PI * 2;
    this.target = null; this.wait = Math.random() * 3; this.phase = Math.random() * 10;
    this.pathI = 0;
    this.talking = false;
    this.speed = def.speed || 1.1;
    this.pos.y = this.ground(def.x, def.z);
    if (def.y !== undefined) this.pos.y = def.y;
    model.position.copy(this.pos);
  }

  ground(x, z) {
    const b = this.def.beh;
    if (b === 'isle') return this.world.groundAt(x, z, 1e4);
    return this.world.groundAt(x, z, (this.pos ? this.pos.y : 1e4) + 2);
  }

  update(dt, t, player) {
    const d = this.def, m = this.model;
    const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
    const pd = Math.hypot(dx, dz);
    const far = pd > 260;
    m.visible = !far || d.beh === 'fly';
    if (far && d.beh !== 'fly') return;
    this.phase += dt;
    let moving = false;
    const near = pd - Math.max(0, this.radius - 0.5) < 6 && Math.abs(player.pos.y - this.pos.y) < 4 + this.radius;
    if (this.override) { this.override(dt, t); m.position.copy(this.pos); m.rotation.y = this.facing; return; }

    if (d.beh === 'path' && this.trail) {
      this.trailT = (this.trailT || 0) - dt;
      if (this.trailT <= 0) { this.trailT = 0.25; this.trail.push(this.pos.clone()); if (this.trail.length > 120) this.trail.shift(); }
    }
    if (d.beh === 'follow' && this.leader) {
      const tr = this.leader.trail;
      const idx = tr.length - 1 - d.gap * 14;
      const tgt = idx >= 0 ? tr[idx] : this.leader.pos;
      const tx = tgt.x - this.pos.x, tz = tgt.z - this.pos.z, td = Math.hypot(tx, tz);
      if (td > 0.4) {
        this.turnTo(Math.atan2(tx, tz), dt * 3);
        const sp = Math.min(td, this.leader.speed * 1.15 * dt * (td > 3 ? 1.6 : 1));
        this.pos.x += Math.sin(this.facing) * sp; this.pos.z += Math.cos(this.facing) * sp;
        moving = true;
      }
      this.pos.y = this.ground(this.pos.x, this.pos.z);
    } else if (this.talking || (near && d.beh !== 'fly' && d.beh !== 'boat' && d.type !== 'turtle')) {
      this.turnTo(Math.atan2(dx, dz), dt * 4);
    } else if (d.beh === 'wander' || d.beh === 'path') {
      if (!this.target) {
        this.wait -= dt;
        if (this.wait <= 0) {
          if (d.beh === 'path') { this.pathI = (this.pathI + 1) % d.path.length; const [x, z] = d.path[this.pathI]; this.target = new THREE.Vector3(x, 0, z); }
          else { const a = Math.random() * Math.PI * 2, r = Math.random() * (d.radius || 8); this.target = new THREE.Vector3(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r); }
        }
      } else {
        const tx = this.target.x - this.pos.x, tz = this.target.z - this.pos.z, td = Math.hypot(tx, tz);
        if (td < 0.5) { this.target = null; this.wait = d.beh === 'path' ? 0.5 + Math.random() : 2 + Math.random() * 5; }
        else {
          this.turnTo(Math.atan2(tx, tz), dt * 3);
          const sp = this.speed * dt;
          this.pos.x += Math.sin(this.facing) * sp; this.pos.z += Math.cos(this.facing) * sp;
          moving = true;
        }
      }
      this.pos.y = this.ground(this.pos.x, this.pos.z);
    } else if (d.beh === 'fly') {
      const a = t * (d.speed || 0.1) + (d.phase || 0);
      const R = d.radius || 40;
      this.pos.set(d.x + Math.cos(a) * R, d.y + Math.sin(a * 2.3) * 3, d.z + Math.sin(a) * R);
      this.facing = Math.atan2(-Math.sin(a), Math.cos(a)) + ((d.speed || 0.1) < 0 ? Math.PI : 0);
      m.rotation.z = (d.bank ?? 0.25) * Math.sign(d.speed || 0.1);
    } else if (d.beh === 'float') {
      this.pos.x = this.home.x + Math.sin(t * 0.2 + this.phase) * (d.radius || 3);
      this.pos.z = this.home.z + Math.cos(t * 0.17 + this.phase * 0.7) * (d.radius || 3);
      this.pos.y = this.ground(this.pos.x, this.pos.z) + 0.4 + Math.sin(t * 1.2 + this.phase) * 0.25;
      this.facing += dt * 0.2;
    } else if (d.beh === 'boat') {
      const a = t * 0.035 + this.phase;
      this.pos.set(d.x + Math.sin(a) * 150, d.y, d.z + Math.sin(a * 2) * 40);
      this.facing = Math.atan2(Math.cos(a) * 150, Math.cos(a * 2) * 80);
    } else {
      this.pos.y = this.ground(this.pos.x, this.pos.z);
      if (d.beh === 'isle') this.pos.y += 0;
    }

    m.position.copy(this.pos);
    if (d.beh !== 'fly') m.rotation.z = 0;
    if (moving) {
      m.position.y += Math.abs(Math.sin(this.phase * 7)) * 0.06;
      m.rotation.z = Math.sin(this.phase * 7) * 0.05;
    } else if (d.beh !== 'fly' && d.beh !== 'boat') {
      m.scale.y = (this.baseScale || 1) * (1 + Math.sin(this.phase * 1.6) * 0.012);
    }
    m.rotation.y = this.facing;
    if (this.onUpdate) this.onUpdate(dt, t);
  }

  turnTo(a, k) {
    let diff = a - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facing += diff * Math.min(1, k);
  }
}
