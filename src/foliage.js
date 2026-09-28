// Realistic trees: branching bark limbs carrying hundreds of painted leaf and needle cards,
// with cheap crossed-card versions for the distance. Everything sways in the wind.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { mulberry32 } from './noise.js';

// ---------------- Painted textures ----------------
function cv(size, paint, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  paint(ctx, size, mulberry32(size * 13 + paint.length));
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function leaf(ctx, x, y, a, len, fill, rib) {
  const w = len * 0.42;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(0, -len / 2);
  ctx.quadraticCurveTo(w, -len * 0.1, 0, len / 2); ctx.quadraticCurveTo(-w, -len * 0.1, 0, -len / 2); ctx.fill();
  ctx.strokeStyle = rib; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -len / 2); ctx.lineTo(0, len / 2); ctx.stroke();
  ctx.restore();
}

// A cluster of broad leaves on twigs, denser in the middle, lit from above
export const leafClusterTex = () => cv(512, (ctx, s, r) => {
  ctx.strokeStyle = '#3a2c20'; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2; ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.quadraticCurveTo(s / 2 + Math.cos(a) * 80, s / 2 + Math.sin(a) * 60, s / 2 + Math.cos(a) * 200, s / 2 + Math.sin(a) * 190); ctx.stroke(); }
  for (let i = 0; i < 520; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * s * 0.44;
    const x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d * 0.9;
    const up = 1 - y / s; // light from above
    const l = 18 + up * 26 + r() * 16, h = 88 + r() * 30, sat = 28 + r() * 22;
    leaf(ctx, x, y, r() * Math.PI * 2, 16 + r() * 18, `hsl(${h},${sat}%,${l}%)`, `hsla(${h},30%,${l * 0.6}%,0.8)`);
  }
});

// A drooping pine bough: stem along +x, needles fanning out
export const needleTex = () => cv(512, (ctx, s, r) => {
  const stem = (x0, y0, x1, y1, w) => { ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
  const needles = (x0, y0, x1, y1, len) => {
    const n = Math.hypot(x1 - x0, y1 - y0) / 2.2;
    for (let i = 0; i < n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const L = len * (1 - t * 0.6) * (0.7 + r() * 0.5);
      const ang = Math.atan2(y1 - y0, x1 - x0);
      for (const sd of [-1, 1]) {
        const a = ang + sd * (0.9 + r() * 0.5);
        const l = 16 + (1 - y / s) * 24 + r() * 14;
        ctx.strokeStyle = `hsl(${140 + r() * 30},${25 + r() * 20}%,${l}%)`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
      }
    }
  };
  stem(8, s / 2, s - 12, s / 2 + 24, 5);
  needles(8, s / 2, s - 12, s / 2 + 24, 60);
  for (let i = 0; i < 9; i++) {
    const t = 0.12 + i * 0.09, x = 8 + (s - 20) * t, y = s / 2 + 24 * t;
    const sd = i % 2 ? 1 : -1, len = (s - x) * 0.55;
    const x1 = x + len * 0.8, y1 = y + sd * len * 0.45;
    stem(x, y, x1, y1, 2.5); needles(x, y, x1, y1, 30);
  }
});

// Hanging Spanish moss
export const mossTex = () => cv(256, (ctx, s, r) => {
  for (let i = 0; i < 90; i++) {
    let x = r() * s, y = r() * 20;
    const l = 45 + r() * 25;
    ctx.strokeStyle = `hsla(${70 + r() * 20},${10 + r() * 12}%,${l}%,${0.6 + r() * 0.4})`; ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    const L = s * (0.4 + r() * 0.6);
    for (let k = 0; k < 20; k++) { x += (r() - 0.5) * 5; y += L / 20; ctx.lineTo(x, y); }
    ctx.stroke();
  }
});

// Fern frond: a stem with paired leaflets
export const fernTex = () => cv(256, (ctx, s, r) => {
  ctx.strokeStyle = '#2e4a24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s / 2, s); ctx.quadraticCurveTo(s / 2 + 20, s / 2, s / 2, 6); ctx.stroke();
  for (let i = 0; i < 26; i++) {
    const t = i / 26, y = s - t * (s - 10), x = s / 2 + Math.sin(t * 3) * 8;
    const L = 70 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 6;
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(sd * (1.1 - t * 0.4));
      const l = 22 + r() * 14 + t * 8;
      ctx.fillStyle = `hsl(${100 + r() * 20},40%,${l}%)`;
      ctx.beginPath(); ctx.ellipse(0, -L / 2, 5, L / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
});

// Whole-tree impostors for distant forests
const impostor = (kind) => cv(512, (ctx, s, r) => {
  if (kind === 'pine') {
    ctx.fillStyle = '#2a1e16'; ctx.fillRect(s / 2 - 7, s * 0.62, 14, s * 0.38);
    for (let i = 0; i < 16; i++) {
      const t = i / 15, y = s * 0.9 - t * s * 0.86, w = (1 - t) * s * 0.42 + 10;
      for (let k = 0; k < 90; k++) {
        const x = s / 2 + (r() - 0.5) * 2 * w * (0.4 + r() * 0.6), yy = y + r() * 30 - Math.abs(x - s / 2) * 0.12 + 20;
        const l = 12 + (1 - t) * 4 + r() * 16 + t * 10;
        ctx.strokeStyle = `hsl(${150 + r() * 20},${25 + r() * 15}%,${l}%)`; ctx.lineWidth = 2;
        const a = x < s / 2 ? Math.PI * 0.85 : Math.PI * 0.15;
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + Math.cos(a) * 14, yy + Math.sin(a) * 10); ctx.stroke();
      }
    }
  } else {
    ctx.strokeStyle = '#2e2218'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(s / 2, s); ctx.lineTo(s / 2, s * 0.5); ctx.stroke();
    ctx.lineWidth = 7; for (const a of [-0.7, 0.6, -0.2]) { ctx.beginPath(); ctx.moveTo(s / 2, s * 0.62); ctx.lineTo(s / 2 + Math.sin(a) * 140, s * 0.28); ctx.stroke(); }
    for (let i = 0; i < 1100; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6);
      const x = s / 2 + Math.cos(a) * d * s * 0.42, y = s * 0.36 + Math.sin(a) * d * s * 0.3;
      const l = 14 + (1 - y / s) * 28 + r() * 12;
      leaf(ctx, x, y, r() * 6, 12 + r() * 12, `hsl(${90 + r() * 30},${28 + r() * 20}%,${l}%)`, 'rgba(0,0,0,0.3)');
    }
  }
});

export const barkTex = () => cv(512, (ctx, s, r) => {
  ctx.fillStyle = '#5a4838'; ctx.fillRect(0, 0, s, s);
  for (let x = 0; x < s; x += 10 + r() * 14) {
    const v = 60 + r() * 50;
    ctx.fillStyle = `rgb(${v + 20},${v + 8},${v - 6})`; ctx.fillRect(x, 0, 8 + r() * 10, s);
  }
  for (let i = 0; i < 70; i++) {
    let x = r() * s, y = 0; ctx.strokeStyle = `rgba(20,14,10,${0.5 + r() * 0.4})`; ctx.lineWidth = 2 + r() * 4;
    ctx.beginPath(); ctx.moveTo(x, y);
    while (y < s) { y += 10 + r() * 20; x += (r() - 0.5) * 10; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? 0 : 200},${r() < 0.5 ? 0 : 190},${r() < 0.5 ? 0 : 170},0.08)`; ctx.fillRect(r() * s, r() * s, 6 + r() * 20, 2 + r() * 4); }
  // lichen patches
  for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(${120 + r() * 40},${140 + r() * 30},${100},${0.15 + r() * 0.2})`; ctx.beginPath(); ctx.ellipse(r() * s, r() * s, 4 + r() * 18, 3 + r() * 10, 0, 0, Math.PI * 2); ctx.fill(); }
});

// ---------------- Materials ----------------
let _leafTex = null;
const leafClusterTexCached = () => (_leafTex ||= leafClusterTex());
export function foliageMaterials(normalFrom) {
  const wind = { value: 0 };
  const leafy = (map, sway) => {
    const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = wind;
      sh.vertexShader = 'uniform float uWind;\nvarying vec3 vLeafW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 lw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lw = instanceMatrix * lw;
        #endif
        vLeafW = (modelMatrix * lw).xyz;`).replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip = vec3(0.0);
        #ifdef USE_INSTANCING
          ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        #endif
        float h = max(position.y, 0.0);
        float s = sin(uWind * 1.3 + ip.x * 0.11 + ip.z * 0.07) * 0.6 + sin(uWind * 3.1 + position.x * 0.9 + ip.z) * 0.25;
        transformed.x += s * ${sway.toFixed(3)} * h;
        transformed.z += cos(uWind * 1.1 + ip.z * 0.09) * 0.5 * ${sway.toFixed(3)} * h;`);
      // keep the painted-on outward normals on both faces so canopies light softly
      sh.fragmentShader = 'varying vec3 vLeafW;\n' + sh.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n if (distance(vLeafW, cameraPosition) < 2.2) discard;').replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.indirectDiffuse *= 1.25;');
    };
    return m;
  };
  const bark = barkTex();
  bark.wrapS = bark.wrapT = THREE.RepeatWrapping;
  const barkN = normalFrom(bark.image, 4);
  const pineImp = impostor('pine'), oakImp = impostor('oak');
  return {
    wind,
    leaf: leafy(leafClusterTexCached(), 0.012),
    needle: leafy(needleTex(), 0.008),
    moss: leafy(mossTex(), 0.02),
    fern: leafy(fernTex(), 0.05),
    impPine: leafy(pineImp, 0.004),
    impOak: leafy(oakImp, 0.004),
    ivy: new THREE.MeshStandardMaterial({ map: leafClusterTexCached(), vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }),
    bark: new THREE.MeshStandardMaterial({ map: bark, normalMap: barkN, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true, roughness: 0.95 }),
  };
}

// ---------------- Builders ----------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// A card whose normals point away from the canopy centre, so the crown shades like a volume
function card(k, kind, pos, w, h, color, center, o = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  if (o.pivot) g.translate(w / 2, 0, 0); // hinge at one edge (boughs)
  if (o.hang) g.translate(0, -h / 2, 0); // hang from the top edge (moss)
  const geom = k.add(kind, g, color, { x: pos.x, y: pos.y, z: pos.z, rx: o.rx ?? 0, ry: o.ry ?? 0, rz: o.rz ?? 0, dir: o.dir, bright: o.bright, order: o.pivot ? 'YZX' : 'XYZ' });
  const p = geom.attributes.position, n = geom.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i) - center.x, (p.getY(i) - center.y) * 0.8 + (o.lift ?? 0.35) * Math.abs(p.getY(i) - center.y + 1), p.getZ(i) - center.z).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
}

function crossCard(k, kind, pos, w, h, color, center, rnd, bright = 1) {
  const a = rnd() * Math.PI;
  card(k, kind, pos, w, h, color, center, { ry: a, rx: (rnd() - 0.5) * 0.9, bright });
  card(k, kind, pos, w, h, color, center, { ry: a + Math.PI / 2, rx: (rnd() - 0.5) * 0.9, bright });
  card(k, kind, pos, w, h * 0.9, color, center, { rx: -Math.PI / 2 + (rnd() - 0.5) * 0.6, ry: a, bright: bright * 1.1 });
}

// Recursive branches; returns twig tips
function branches(k, from, dir, len, rad, depth, max, rnd, barkCol, out, spread = 0.55, kids = [4, 2, 2, 2]) {
  const to = from.clone().addScaledVector(dir, len);
  k.limb('bark', from.toArray(), to.toArray(), rad, rad * 0.62, barkCol, { seg: depth === 0 ? 10 : 6 });
  if (depth >= max) { out.push({ p: to, d: dir }); return; }
  const n = kids[depth] || 2;
  for (let i = 0; i < n; i++) {
    const axis = V(rnd() - 0.5, 0, rnd() - 0.5).normalize();
    const nd = dir.clone().applyAxisAngle(axis, spread * (0.6 + rnd() * 0.8));
    nd.y += 0.25; nd.normalize();
    const start = depth === 0 ? from.clone().lerp(to, 0.55 + rnd() * 0.45) : to;
    branches(k, start, nd, len * (0.62 + rnd() * 0.15), rad * 0.6, depth + 1, max, rnd, barkCol, out, spread, kids);
  }
}

export function buildTree(mats, type, seed, lod) {
  const k = new Kit(mats);
  const rnd = mulberry32(seed);
  if (lod === 'far') {
    const imp = type === 'pine' || type === 'spruce' || type === 'snowPine' ? 'impPine' : 'impOak';
    const H = imp === 'impPine' ? 11 : 9, W = imp === 'impPine' ? 6 : 9;
    const tint = { pine: '#b8c4b8', spruce: '#9aa89c', snowPine: '#c8d0d4', oak: '#d8dccc', birch: '#e8ecc8', witch: '#b8a0d8', dead: '#7a6a5a', cypress: '#b0b098' }[type] || '#ffffff';
    for (let i = 0; i < 3; i++) card(k, imp, V(0, H / 2, 0), W, H, tint, V(0, H * 0.55, 0), { ry: (i / 3) * Math.PI, lift: 0.6 });
    return k;
  }
  if (type === 'pine' || type === 'spruce' || type === 'snowPine') {
    const H = type === 'spruce' ? 10 : 9, barkCol = '#6a5444';
    k.lathe('bark', [[0.42, -0.4], [0.3, 0.6], [0.22, H * 0.5], [0.06, H + 0.4]], 9, barkCol);
    const needleCol = type === 'spruce' ? '#9aa894' : '#b4bea8';
    const whorls = type === 'spruce' ? 13 : 10;
    for (let w = 0; w < whorls; w++) {
      const t = w / (whorls - 1), y = 1.6 + t * (H - 1.8);
      const len = (1 - t) * (type === 'spruce' ? 2.8 : 3.4) + 0.6;
      const nb = 5 + Math.round((1 - t) * 3);
      for (let b = 0; b < nb; b++) {
        const a = (b / nb) * Math.PI * 2 + w * 0.7 + rnd() * 0.4;
        const droop = 0.25 + rnd() * 0.25 + (1 - t) * 0.1;
        const pos = V(Math.cos(a) * 0.1, y, Math.sin(a) * 0.1);
        const snowy = type === 'snowPine';
        card(k, 'needle', pos, len, len * 0.7, needleCol, V(0, y, 0), { pivot: true, ry: -a, rz: -droop, rx: Math.PI / 2 + (rnd() - 0.5) * 0.4, lift: 0.5, bright: 0.9 + rnd() * 0.2 });
        card(k, 'needle', pos, len, len * 0.55, needleCol, V(0, y, 0), { pivot: true, ry: -a, rz: -droop - 0.2, lift: 0.3, bright: 0.8 });
        if (snowy && b % 2 === 0) card(k, 'needle', V(pos.x, y + 0.12, pos.z), len * 0.85, len * 0.5, '#f4f6ff', V(0, y - 2, 0), { pivot: true, ry: -a, rz: -droop + 0.05, rx: Math.PI / 2, lift: 1, bright: 1.6 });
      }
    }
    for (let i = 0; i < 2; i++) card(k, 'needle', V(0, H + 0.2, 0), 0.9, 1.6, needleCol, V(0, H - 1, 0), { ry: i * Math.PI / 2, rz: Math.PI / 2 });
    return k;
  }
  if (type === 'cypress') {
    k.lathe('bark', [[3.2, -0.5], [2.2, 0.4], [1.3, 1.6], [0.95, 3.5], [0.8, 7], [0.65, 11], [0.45, 15], [0.2, 17]], 14, '#6a5a4a');
    const tips = [];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1 + rnd() * 0.5;
      branches(k, V(0, 8 + i * 1.3, 0), V(Math.cos(a), 0.45, Math.sin(a)).normalize(), 4 + rnd() * 2, 0.35, 1, 2, rnd, '#6a5a4a', tips, 0.7, [0, 2, 2]);
    }
    const c = V(0, 13, 0);
    for (const t of tips) {
      for (let j = 0; j < 3; j++) crossCard(k, 'leaf', t.p.clone().add(V((rnd() - 0.5) * 2, rnd(), (rnd() - 0.5) * 2)), 2.6, 1.8, '#8a9068', c, rnd, 0.75);
      for (let j = 0; j < 4; j++) card(k, 'moss', t.p.clone().add(V((rnd() - 0.5) * 2.5, -0.2, (rnd() - 0.5) * 2.5)), 1.4 + rnd(), 3 + rnd() * 4, '#c8ccb0', c, { hang: true, ry: rnd() * Math.PI, lift: 0.1 });
    }
    return k;
  }
  if (type === 'bush') {
    const c = V(0, 0.6, 0);
    for (let i = 0; i < 9; i++) crossCard(k, 'leaf', V((rnd() - 0.5) * 1.4, 0.4 + rnd() * 0.6, (rnd() - 0.5) * 1.4), 1.3, 1.2, '#b0bca0', c, rnd, 0.85);
    return k;
  }
  if (type === 'fern') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rnd() * 0.4;
      card(k, 'fern', V(Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1), 0.6, 1.4, '#c0d0a8', V(0, -1, 0), { dir: [Math.cos(a) * 1.3, 1, Math.sin(a) * 1.3], lift: 1 });
    }
    return k;
  }
  // Broadleaf trees: oak, birch, witch-tree, dead tree
  const barkCol = type === 'birch' ? '#e8e4dc' : type === 'witch' ? '#5a4a64' : type === 'dead' ? '#5a4c46' : '#7a6454';
  k.lathe('bark', [[0.9, -0.5], [0.62, 0.2], [0.45, 1.0], [0.4, 2.6]], 12, barkCol);
  for (let i = 0; i < 5; i++) { const a = i * 1.25 + rnd(); k.cone('bark', 0.22, 1.4, 5, barkCol, { x: Math.cos(a) * 0.5, y: 0.1, z: Math.sin(a) * 0.5, dir: [-Math.cos(a), 1.6, -Math.sin(a)] }); }
  const tips = [];
  const tall = type === 'birch' ? 4.4 : 3;
  k.limb('bark', [0, 2.4, 0], [0, 2.4 + tall, 0], 0.4, 0.3, barkCol, { seg: 10 });
  branches(k, V(0, 2.4, 0), V(0, 1, 0), tall + 0.5, 0.36, 0, 3, rnd, barkCol, tips, type === 'birch' ? 0.4 : 0.62, [4, 2, 2]);
  if (type === 'dead') return k;
  const leafCol = { oak: '#c4cca8', birch: '#dce4a8', witch: '#b49ad4' }[type] || '#c4cca8';
  let cx = 0, cy = 0, cz = 0; for (const t of tips) { cx += t.p.x; cy += t.p.y; cz += t.p.z; }
  const c = V(cx / tips.length, cy / tips.length - 0.6, cz / tips.length);
  const size = type === 'birch' ? 1.5 : 2.2;
  for (const t of tips) {
    const n = type === 'birch' ? 3 : 4;
    for (let j = 0; j < n; j++) {
      const p = t.p.clone().add(V((rnd() - 0.5) * 1.6, (rnd() - 0.3) * 1.2, (rnd() - 0.5) * 1.6));
      crossCard(k, 'leaf', p, size * (0.8 + rnd() * 0.5), size * (0.8 + rnd() * 0.4), leafCol, c, rnd, 0.8 + rnd() * 0.35);
    }
  }
  if (type === 'witch') for (let i = 0; i < 6; i++) { const t = tips[i % tips.length].p; k.sphere('glow', 0.12, '#c890ff', { x: t.x + rnd() - 0.5, y: t.y - 0.8, z: t.z + rnd() - 0.5, bright: 2.6, ws: 5, hs: 4 }); }
  return k;
}
