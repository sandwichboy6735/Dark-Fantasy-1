// Character models built from simple shapes, plus the NPC brain (wander, patrol, fly, float, talk).
import * as THREE from 'three';
import { Kit } from './kit.js';
import { sculpt, eye, ruffle, hand } from './sculpt.js';
import { robedFigure, knightFigure, drapery, sweep, hood, pointyHat, scaledKit } from './figures.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function eyes(k, y, z, color = '#1a1418', sep = 0.055, r = 0.022, kind = 'plain') {
  for (const s of [-1, 1]) k.sphere(kind, r, color, { x: s * sep, y, z, ws: 6, hs: 5, bright: kind === 'glow' ? 2.5 : 1 });
}
export function buildCharacter(mats, type, o = {}) {
  const k = new Kit(mats);
  const skin = o.skin || '#e0b89a';
  let height = 1.8, radius = 0.4;
  switch (type) {
    case 'wizard': {
      const bc = o.beard !== false ? (o.beardColor || '#d8d4dc') : null;
      const f = robedFigure(k, {
        robe: o.robe || '#3a3a7a', cloak: o.cloak || null, skin, seed: 11, bell: 0.09, amp: 0.1,
        pose: o.staff !== false ? 'staff' : 'clasp', left: o.staff !== false ? 'side' : null,
        face: { age: bc ? 1.4 : 0.3, brow: 1.5, browColor: bc || '#3a2a20', iris: '#3a5a8a', nose: 1.2 },
        beard: bc, beardLen: 0.5, hair: bc || '#3a2a20', hairLong: bc ? 0.35 : 0.15, belt: '#2a1e16', pouch: true,
      });
      pointyHat(k, [0, 1.765, 0.0], { color: o.hat || '#2a2a5c', h: (o.hatH || 0.85) * 0.85, ri: 0.13, ro: 0.37, bend: 0.22, band: '#8a7a50', seed: 3 });
      if (o.staff !== false) {
        sweep(k, 'wood', '#4a3526', [[0.415, 0.0, 0.33], [0.425, 0.6, 0.335], [0.405, 1.25, 0.33], [0.43, 1.8, 0.32], [0.41, 2.02, 0.31]], [0.02, 0.024, 0.026, 0.032, 0.028], { ts: 24, rs: 8, folds: 2, foldAmp: 0.15, ao: 0.2 });
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; sweep(k, 'wood', '#4a3526', [[0.41, 2.0, 0.31], [0.41 + Math.cos(a) * 0.07, 2.08, 0.31 + Math.sin(a) * 0.07], [0.41 + Math.cos(a + 0.8) * 0.05, 2.2, 0.31 + Math.sin(a + 0.8) * 0.05]], [0.018, 0.012, 0.004], { ts: 8, rs: 5, ao: 0 }); }
        k.sphere('glow', 0.055, o.orb || '#9fd0ff', { x: 0.41, y: 2.1, z: 0.31, bright: 3, ws: 14, hs: 10 });
      }
      k.headY = f.headY; k.headZ = f.headZ;
      height = 2.5;
      break;
    }
    case 'witch': {
      const f = robedFigure(k, {
        robe: o.robe || '#2a2240', cloak: o.cloak || null, skin, seed: 23, bell: 0.13, amp: 0.12, folds: 8, hem: 0.06,
        pose: 'clasp', face: { hook: true, chin: 1.7, warts: 3, iris: '#3a7a3a', lid: 0.38, age: 0.8 },
        hair: o.hair || '#4a2a2a', hairLong: 0.62, hairN: 34, belt: '#1a1418',
      });
      pointyHat(k, [0, 1.765, 0], { color: o.hat || '#1e1a30', h: 0.8, ri: 0.135, ro: 0.45, bend: 0.42, band: '#4a2a3a', seed: 9, tilt: -0.14 });
      if (o.broom) {
        sweep(k, 'wood', '#5a4030', [[0, 0.72, 1.05], [0.01, 0.7, 0.3], [-0.01, 0.7, -0.4], [0, 0.72, -1.0]], [0.028, 0.03, 0.03, 0.034], { ts: 12, rs: 6, folds: 2, foldAmp: 0.15, ao: 0 });
        for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, rr = 0.03 + (i % 3) * 0.035; sweep(k, 'thatch', '#a08858', [[0, 0.72, -0.95], [Math.cos(a) * rr * 1.5, 0.72 + Math.sin(a) * rr * 1.5, -1.3], [Math.cos(a) * rr * 2.6, 0.72 + Math.sin(a) * rr * 2.2, -1.62 - (i % 4) * 0.03]], [0.02, 0.018, 0.008], { ts: 6, rs: 4, ao: 0, bright: 0.8 + (i % 3) * 0.12 }); }
        k.cyl('hide', 0.045, 0.045, 0.08, 10, '#3a2418', { y: 0.72, z: -0.95, rx: Math.PI / 2 });
      }
      k.headY = f.headY; k.headZ = f.headZ;
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
      const kk = scaledKit(k, s);
      const hooded = o.hood !== false && !o.hat;
      const f = robedFigure(kk, {
        robe: c, skin, seed: Math.floor((o.robe || '#1').charCodeAt(2) || 5) + (o.child ? 7 : 0), bell: 0.02, amp: 0.07, folds: 8,
        pose: o.lute ? 'clasp' : 'side', belt: '#3a2a1a', pouch: !o.child, apron: o.apron,
        headR: o.child ? 0.14 : 0.115,
        face: { nose: o.child ? 0.6 : 1, age: o.child ? 0 : 0.6, iris: '#4a3a2a', browColor: o.hair || '#4a3a2a' },
        beard: o.beard || null, beardLen: 0.26,
        hair: hooded ? null : (o.hair || '#6a4a30'), hairLong: o.child ? 0.18 : 0.22,
        hood: hooded ? (o.hoodColor || c) : null, cowl: hooded ? (o.hoodColor || c) : null,
      });
      if (o.hat) {
        kk.cyl('velvet', 0.3, 0.3, 0.02, 28, o.hat, { y: 1.785 });
        kk.cyl('velvet', 0.125, 0.14, 0.16, 24, o.hat, { y: 1.87 });
        kk.cyl('hide', 0.142, 0.142, 0.03, 24, '#2a1e16', { y: 1.815 });
        if (o.feather) sweep(kk, 'cloth', o.feather, [[0.13, 1.85, 0], [0.2, 1.98, -0.08], [0.24, 2.08, -0.22]], [0.012, 0.035, 0.004], { ts: 10, rs: 6, flat: 0.3, ao: 0 });
      }
      if (o.lantern) {
        kk.limb('metal', [0.33, 0.73, 0.1], [0.33, 0.66, 0.1], 0.004, 0.004, '#2a2622', { seg: 4 });
        kk.cyl('metal', 0.05, 0.07, 0.04, 8, '#2a2622', { x: 0.33, y: 0.64, z: 0.1 });
        kk.cyl('glow', 0.048, 0.048, 0.13, 10, '#ffa040', { x: 0.33, y: 0.55, z: 0.1, bright: 3 });
        kk.cyl('metal', 0.07, 0.07, 0.025, 8, '#2a2622', { x: 0.33, y: 0.48, z: 0.1 });
      }
      if (o.lute) {
        kk.sphere('wood', 0.17, '#8a5a30', { x: 0.02, y: 1.02, z: 0.3, sz: 0.35, sy: 1.25, rz: 0.9 });
        kk.limb('wood', [0.08, 1.08, 0.31], [-0.36, 1.36, 0.28], 0.025, 0.02, '#5a3a20', { seg: 6 });
        kk.box('wood', 0.07, 0.14, 0.03, '#3a2418', { x: -0.4, y: 1.39, z: 0.28, rz: 0.9 });
      }
      if (o.tool) kk.limb('wood', [0.34, 0.02, 0.14], [0.36, 1.55, 0.1], 0.022, 0.02, '#5a4030', { seg: 6 });
      k.headY = f.headY * s; k.headZ = f.headZ * s;
      height = 1.9 * s; radius = 0.4 * s;
      break;
    }
    case 'knight': {
      const f = knightFigure(k, { steel: o.steel, tabard: o.tabard, crest: o.crest, plume: o.plume, cape: o.cape, shield: o.shield, spear: true });
      k.headY = f.headY; k.headZ = f.headZ;
      height = 2.2;
      break;
    }
    case 'ghost': {
      const c = o.color || '#9ad8ff';
      drapery(k, 'ghost', c, [[0.4, 0.25, 1, 1], [0.34, 0.6], [0.27, 1.05, 1.1, 0.9], [0.24, 1.3, 1.2, 0.85], [0.18, 1.42, 1.25, 0.85], [0.08, 1.52]], { folds: 7, amp: 0.18, hem: 0.2, seed: 5, ao: 0.5 });
      hood(k, 'ghost', c, [0, 1.66, 0], 0.17, { seed: 7 });
      for (const s of [-1, 1]) sweep(k, 'ghost', c, [[s * 0.2, 1.38, 0], [s * 0.36, 1.2, 0.1], [s * 0.42, 1.0, 0.25], [s * 0.4, 0.86, 0.38]], [0.07, 0.08, 0.12, 0.02], { ts: 12, rs: 10, folds: 3, foldAmp: 0.2, foldGrow: true });
      eyes(k, 1.67, 0.1, '#e8ffff', 0.05, 0.022, 'glow');
      k.headY = 1.66;
      height = 1.9;
      break;
    }
    case 'queen': {
      const c = o.robe || '#b8b4e8';
      const f = robedFigure(k, {
        robe: c, skin: o.skin || '#e8e0f0', seed: 41, bell: 0.16, amp: 0.1, folds: 11, trail: 0.4, hem: 0.01, pose: 'clasp',
        prof: [[0.6, 0, 1.05, 1.0], [0.48, 0.25], [0.34, 0.62], [0.24, 0.9, 1.1, 0.85], [0.18, 1.04, 1.1, 0.8], [0.2, 1.2, 1.15, 0.8], [0.2, 1.3, 1.2, 0.78], [0.18, 1.4, 1.3, 0.75], [0.12, 1.47, 1.15, 0.9], [0.075, 1.51, 1, 1]],
        face: { nose: 0.7, chin: 0.8, iris: '#5a6ab8', lid: 0.3, lip: '#9a5a7a', browColor: o.hair || '#c8c8e0' },
        hair: o.hair || '#e0e0f4', hairLong: 0.8, hairN: 36, belt: o.trim || '#b8c8ff', nails: '#e0d0e8',
        cloak: o.cloak || null,
      });
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; k.cone('glow', 0.016, 0.1 + (i % 2) * 0.05, 4, o.crown || '#e8f0ff', { x: Math.cos(a) * 0.105, y: 1.83 + (i % 2) * 0.025, z: 0.0 + Math.sin(a) * 0.105, bright: 2.5 }); }
      k.add('glow', new THREE.TorusGeometry(0.105, 0.008, 6, 36), o.crown || '#e8f0ff', { y: 1.8, rx: Math.PI / 2 + 0.1, bright: 2 });
      k.add('glow', new THREE.TorusGeometry(0.3, 0.008, 6, 48), o.crown || '#c0d0ff', { y: 1.78, z: -0.2, bright: 0.8 });
      k.headY = f.headY; k.headZ = f.headZ;
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
