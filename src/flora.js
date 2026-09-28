// Forests, rocks and glowing plants, scattered with density maps and drawn as instanced meshes.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { Simplex, mulberry32 } from './noise.js';
import { HALF, WATER_Y, BAYOU } from './layout.js';
import { buildTree } from './foliage.js';

const CELL = 256;
const sm = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };

function merged(mats, fn) {
  const k = new Kit(mats);
  fn(k);
  const g = k.build({ project: true });
  // Collapse to one geometry per material kind
  return g.children.map((m) => ({ geo: m.geometry, mat: m.material, kind: m.userData.kind }));
}

function species(mats) {
  const r = mulberry32(5);
  const parts = (k) => { const g = k.build({ project: true }); return g.children.map((m) => ({ geo: m.geometry, mat: m.material, kind: m.userData.kind })); };
  const out = {};
  const trees = { pine: 3, spruce: 3, snowPine: 2, oak: 3, birch: 2, witch: 2, dead: 2, cypress: 2, bush: 3, fern: 2 };
  let seed = 11;
  for (const [type, nv] of Object.entries(trees)) {
    for (let v = 0; v < nv; v++) {
      const sd = seed++ * 7919;
      out[type + '#' + v] = { near: parts(buildTree(mats, type, sd, 'near')), far: type === 'bush' || type === 'fern' ? null : parts(buildTree(mats, type, sd, 'far')) };
    }
  }
  out.variants = trees;
  return {
    ...out,
    mushroom: merged(mats, (k) => {
      k.cyl('plain', 0.12, 0.16, 0.9, 6, '#d8d0e0', { y: 0.45 });
      k.sphere('glow', 0.5, '#6fe8ff', { y: 0.95, sy: 0.45, bright: 1.7, ws: 8, hs: 5 });
    }),
    rock: merged(mats, (k) => {
      const g = new THREE.IcosahedronGeometry(1, 3);
      const p = g.attributes.position, nz = new Simplex(9);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const f = 1 + nz.noise3(x * 1.3, y * 1.3, z * 1.3) * 0.3 + nz.noise3(x * 4, y * 4, z * 4) * 0.08;
        p.setXYZ(i, x * f * 1.2, Math.max(-0.3, y * f * 0.62), z * f);
      }
      g.computeVertexNormals();
      const n = g.attributes.normal, vc = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) vc[i] = 0.8 + n.getY(i) * 0.25;
      k.add('stone', g, '#8a8490', { y: 0.2, vcol: vc });
      // a mossy cap on top
      const cap = g.clone(); cap.scale(0.96, 1.04, 0.96);
      k.add('leaf', new THREE.PlaneGeometry(1.8, 1.8), '#8a9a70', { y: 0.72, rx: -Math.PI / 2, bright: 0.6 });
    }),
    knee: merged(mats, (k) => { for (let i = 0; i < 4; i++) k.cone('bark', 0.25, 0.9 + r() * 0.6, 7, '#6a5a4a', { x: (r() - 0.5) * 2, y: 0.3, z: (r() - 0.5) * 2 }); }),
    stump: merged(mats, (k) => {
      k.lathe('bark', [[0.55, -0.1], [0.42, 0.2], [0.38, 0.6]], 10, '#6a5444');
      k.cyl('wood', 0.37, 0.37, 0.02, 12, '#9a7a5a', { y: 0.61 });
      for (let i = 0; i < 4; i++) { const a = i * 1.6; k.cone('bark', 0.14, 0.8, 5, '#6a5444', { x: Math.cos(a) * 0.45, y: 0.05, z: Math.sin(a) * 0.45, dir: [Math.cos(a), -0.5, Math.sin(a)] }); }
      for (let i = 0; i < 3; i++) k.add('fern', new THREE.PlaneGeometry(0.4, 0.8), '#c0d0a8', { x: 0.4, y: 0.35, z: (r() - 0.5) * 0.6, ry: r() * 3 });
    }),
    log: merged(mats, (k) => {
      k.cyl('bark', 0.32, 0.36, 4.6, 12, '#6a5444', { y: 0.3, rz: Math.PI / 2 });
      k.cyl('wood', 0.3, 0.3, 0.02, 12, '#8a6a4a', { x: 2.31, y: 0.3, rz: Math.PI / 2 });
      for (let i = 0; i < 5; i++) k.add('leaf', new THREE.PlaneGeometry(0.9, 0.7), '#90a070', { x: -1.8 + i * 0.9, y: 0.62, z: (r() - 0.5) * 0.3, rx: -Math.PI / 2 + 0.3, bright: 0.7 });
    }),
  };
}

export class Flora {
  constructor(scene, mats, terrain, world, quality) {
    this.scene = scene; this.cells = [];
    const sp = species(mats);
    const n = new Simplex(4242);
    const rand = mulberry32(777);
    const buckets = new Map(); // "cell|species" -> matrices
    const push = (name, x, y, z, s, rot, tilt = 0) => {
      if (sp.variants[name]) name = name + '#' + (Math.floor(Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453)) % sp.variants[name]);
      const key = Math.floor((x + HALF) / CELL) + ',' + Math.floor((z + HALF) / CELL) + '|' + name;
      let b = buckets.get(key); if (!b) buckets.set(key, b = []);
      b.push(x, y, z, s, rot, tilt);
    };
    const T = terrain;
    const step = quality === 'low' ? 10 : 7;
    for (let z = -HALF; z < HALF; z += step) for (let x = -HALF; x < HALF; x += step) {
      const px = x + (rand() - 0.5) * step * 0.9, pz = z + (rand() - 0.5) * step * 0.9;
      const h = T.heightAt(px, pz);
      const bay = sm(BAYOU.r + 60, BAYOU.r - 40, Math.hypot(px - BAYOU.x, pz - BAYOU.z));
      if (bay > 0.2 && h > 2) {
        const rb = rand();
        if (rb < 0.16 * bay) push('cypress', px, h - 0.4, pz, 0.9 + rand() * 0.8, rand() * 6, (rand() - 0.5) * 0.12);
        else if (rb < 0.3 * bay) push('knee', px, h - 0.2, pz, 0.7 + rand() * 0.6, rand() * 6);
        else if (rb < 0.36 * bay && h > BAYOU.water) push('fern', px, h - 0.1, pz, 0.8 + rand() * 0.6, rand() * 6);
        if (bay > 0.6) continue;
      }
      if (h < WATER_Y + 1 || h < 2) continue;
      const slope = T.slope(px, pz);
      if (slope > 0.9) { if (rand() < 0.05 && h > 5) push('rock', px, h - 0.3, pz, 1.5 + rand() * 3, rand() * 6); continue; }
      if (T.roadDist(px, pz) < 7) continue;
      if (!world.treeFree(px, pz)) continue;
      const forest = n.fbm2(px / 260, pz / 260, 3);
      const north = sm(-200, -600, pz);
      const witch = sm(330, 220, Math.hypot(px - 640, pz - 20));
      const vd = Math.hypot(px, pz - 40);
      const village = sm(260, 150, vd);
      const villageRing = sm(110, 160, vd) * sm(260, 190, vd);
      const snowy = h > 150 - north * 80;
      const r = rand();
      if (witch > 0.3) {
        if (r < 0.2 * witch) push('witch', px, h - 0.2, pz, 1 + rand() * 0.6, rand() * 6);
        else if (r < 0.28 * witch) push('dead', px, h - 0.2, pz, 1 + rand() * 0.5, rand() * 6);
        else if (r < 0.6 * witch) for (let m = 0; m < 3; m++) { const mx = px + (rand() - 0.5) * 5, mz = pz + (rand() - 0.5) * 5; push('mushroom', mx, T.heightAt(mx, mz) - 0.05, mz, 0.6 + rand() * 1.4, rand() * 6); }
        continue;
      }
      if (h > 260) continue;
      let pPine = sm(-0.1, 0.35, forest) * 0.75 + north * 0.25;
      if (snowy) pPine *= 0.5;
      pPine *= 1 - village * 0.8;
      const pOak = villageRing * 0.25 + sm(0.05, 0.3, forest) * 0.14 * (1 - north) * (1 - village) + 0.035 * (1 - village) * (1 - north);
      if (r < pPine) push(snowy || north > 0.6 ? 'snowPine' : rand() < 0.35 ? 'spruce' : 'pine', px, h - 0.2, pz, 1.4 + rand() * 1.3, rand() * 6);
      else if (r < pPine + pOak) push(rand() < 0.3 && north < 0.3 ? 'birch' : 'oak', px, h - 0.2, pz, 1.0 + rand() * 0.7, rand() * 6);
      else if (r < pPine + pOak + 0.012) push('rock', px, h - 0.2, pz, 0.6 + rand() * 1.4, rand() * 6);
      else if (r < pPine + pOak + 0.016 && north < 0.5) push('dead', px, h - 0.2, pz, 0.9 + rand() * 0.4, rand() * 6);
      // Undergrowth: ferns, bushes, stumps and fallen logs fill the forest floor; bushes dot the meadows
      if (!snowy && h < 200) {
        const under = sm(-0.2, 0.3, forest) * (1 - village * 0.7);
        const u = rand();
        const ox = px + (rand() - 0.5) * 5, oz = pz + (rand() - 0.5) * 5, oy = T.heightAt(ox, oz) - 0.1;
        if (T.roadDist(ox, oz) > 5 && world.treeFree(ox, oz)) {
          if (u < under * 0.55) push('fern', ox, oy, oz, 0.7 + rand() * 0.7, rand() * 6);
          else if (u < under * 0.75 + 0.05) push('bush', ox, oy, oz, 0.7 + rand() * 0.9, rand() * 6);
          else if (u < under * 0.8 + 0.055) push('stump', ox, oy, oz, 0.8 + rand() * 0.5, rand() * 6);
          else if (u < under * 0.84 + 0.057) push('log', ox, oy, oz, 0.8 + rand() * 0.5, rand() * 6);
        }
      }
    }
    // Build instanced meshes
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    this.count = 0;
    for (const [key, arr] of buckets) {
      const [cellKey, name] = key.split('|');
      const [ci, cj] = cellKey.split(',').map(Number);
      const cell = { cx: -HALF + (ci + 0.5) * CELL, cz: -HALF + (cj + 0.5) * CELL, meshes: [], shadow: !['mushroom', 'rock', 'fern', 'bush', 'stump', 'log', 'knee'].includes(name.split('#')[0]) };
      const count = arr.length / 6;
      cell.near = []; cell.far = [];
      const def = sp[name];
      const sets = def.near ? [['near', def.near], ['far', def.far]] : [['near', def]];
      for (const [lod, list] of sets) {
        if (!list) continue;
        for (const part of list) {
          const im = new THREE.InstancedMesh(part.geo, part.mat, count);
          for (let i = 0; i < count; i++) {
            const [x, y, z, sc, rot, tilt] = arr.slice(i * 6, i * 6 + 6);
            e.set(tilt, rot, 0); q.setFromEuler(e); s.set(sc, sc * (0.9 + ((i * 7) % 5) * 0.05), sc); p.set(x, y, z);
            im.setMatrixAt(i, m4.compose(p, q, s));
          }
          im.instanceMatrix.needsUpdate = true;
          im.computeBoundingSphere();
          im.castShadow = lod === 'near' && cell.shadow && part.kind !== 'glow';
          im.receiveShadow = part.kind !== 'glow';
          im.visible = false;
          scene.add(im);
          cell[lod].push(im);
          cell.meshes.push(im);
        }
      }
      cell.small = !def.far && !!def.near;
      cell.single = !def.near;
      this.count += count;
      if (['pine', 'spruce', 'snowPine', 'oak', 'birch', 'witch', 'dead', 'cypress'].includes(name.split('#')[0])) {
        for (let i = 0; i < count; i++) world.circle(arr[i * 6], arr[i * 6 + 2], (name.startsWith('cypress') ? 1.6 : 0.35) * arr[i * 6 + 3] * 0.6, arr[i * 6 + 1] - 2, arr[i * 6 + 1] + 12);
      }
      this.cells.push(cell);
    }
  }

  update(px, pz, far, nearDist = 260) {
    for (const c of this.cells) {
      const d = Math.hypot(c.cx - px, c.cz - pz) - 182;
      const near = d < nearDist;
      if (c.single) { for (const m of c.meshes) m.visible = d < far * 0.5; continue; }
      for (const m of c.near) m.visible = near && (!c.small || d < nearDist * 0.6);
      for (const m of c.far) m.visible = !near && d < far;
    }
  }
}

// Glowing wildflowers and drifting motes, as one static point cloud
export function glowFlowers(scene, terrain, world, softTex) {
  const rand = mulberry32(31);
  const pos = [], col = [], size = [];
  const spots = [[0, 300, 150, [0.5, 0.7, 1.6]], [-280, 540, 90, [0.5, 0.75, 1.8]], [640, 20, 240, [1.2, 0.5, 1.8]], [-120, 150, 140, [1.6, 1.2, 0.5]], [430, 500, 70, [0.4, 0.9, 1.4]], [-760, -260, 120, [1.1, 0.6, 1.9]]];
  for (const [cx, cz, r, c] of spots) {
    for (let i = 0; i < r * 5; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const y = terrain.heightAt(x, z);
      if (y < 19 || Math.hypot(x, z - 345) < 28) continue;
      pos.push(x, y + 0.25, z);
      const f = 0.35 + rand() * 0.4;
      col.push(c[0] * f, c[1] * f, c[2] * f);
      size.push(0.2 + rand() * 0.25);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));
  const mat = new THREE.PointsMaterial({ size: 0.32, map: softTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(g, mat);
  scene.add(pts);
  return pts;
}
