// Forests, rocks and glowing plants, scattered with density maps and drawn as instanced meshes.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { Simplex, mulberry32 } from './noise.js';
import { HALF, WATER_Y } from './layout.js';

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
  return {
    pine: merged(mats, (k) => {
      k.cyl('wood', 0.12, 0.2, 2, 5, '#3a2c24', { y: 1 });
      for (let i = 0; i < 4; i++) k.cone('plain', 1.5 - i * 0.3, 2.6 - i * 0.3, 7, i % 2 ? '#1f3a30' : '#24423a', { y: 2.2 + i * 1.35, ry: i });
    }),
    snowPine: merged(mats, (k) => {
      k.cyl('wood', 0.12, 0.2, 2, 5, '#3a2c24', { y: 1 });
      for (let i = 0; i < 4; i++) {
        k.cone('plain', 1.5 - i * 0.3, 2.6 - i * 0.3, 7, '#22403a', { y: 2.2 + i * 1.35, ry: i });
        k.cone('plain', 1.1 - i * 0.24, 1.2 - i * 0.12, 7, '#d6dcf2', { y: 2.9 + i * 1.35, ry: i + 0.3 });
      }
    }),
    oak: merged(mats, (k) => {
      k.cyl('wood', 0.22, 0.38, 3.4, 6, '#3d2f28', { y: 1.7 });
      k.cyl('wood', 0.12, 0.2, 2, 5, '#3d2f28', { x: 0.6, y: 3.4, rz: -0.6 });
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1;
        k.sphere('plain', 1.3 + r() * 0.5, i % 2 ? '#2c4a3a' : '#33523e', { x: Math.cos(a) * 1.1, y: 4.2 + r() * 1.3, z: Math.sin(a) * 1.1, sy: 0.75, ws: 7, hs: 5 });
      }
    }),
    dead: merged(mats, (k) => {
      k.cyl('wood', 0.16, 0.34, 5, 6, '#2e2630', { y: 2.5, rz: 0.08 });
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3;
        k.cyl('wood', 0.05, 0.12, 2.6, 4, '#2e2630', { x: Math.cos(a) * 0.8, y: 3.4 + i * 0.4, z: Math.sin(a) * 0.8, rz: Math.cos(a) * 0.9, rx: Math.sin(a) * 0.9 });
      }
    }),
    witch: merged(mats, (k) => {
      k.cyl('wood', 0.25, 0.5, 4.5, 6, '#2c2238', { y: 2.2, rz: -0.12 });
      k.cyl('wood', 0.14, 0.25, 3, 5, '#2c2238', { x: 0.9, y: 4.6, rz: -0.8 });
      k.cyl('wood', 0.12, 0.22, 3, 5, '#2c2238', { x: -0.8, y: 4.9, rz: 0.9 });
      for (let i = 0; i < 5; i++) k.sphere('plain', 1 + r() * 0.6, '#3a2a58', { x: (r() - 0.5) * 3, y: 5.2 + r() * 1.6, z: (r() - 0.5) * 3, sy: 0.7, ws: 6, hs: 4 });
      for (let i = 0; i < 4; i++) k.sphere('glow', 0.14, '#c890ff', { x: (r() - 0.5) * 3, y: 4.6 + r() * 1.5, z: (r() - 0.5) * 3, bright: 2.6, ws: 5, hs: 4 });
    }),
    mushroom: merged(mats, (k) => {
      k.cyl('plain', 0.12, 0.16, 0.9, 6, '#d8d0e0', { y: 0.45 });
      k.sphere('glow', 0.5, '#6fe8ff', { y: 0.95, sy: 0.45, bright: 1.7, ws: 8, hs: 5 });
    }),
    rock: merged(mats, (k) => {
      const g = new THREE.DodecahedronGeometry(1, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + r() * 0.4), p.getY(i) * 0.6, p.getZ(i) * (0.8 + r() * 0.4));
      g.computeVertexNormals();
      k.add('stone', g, '#7d7890', { y: 0.2 });
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
      const key = Math.floor((x + HALF) / CELL) + ',' + Math.floor((z + HALF) / CELL) + '|' + name;
      let b = buckets.get(key); if (!b) buckets.set(key, b = []);
      b.push(x, y, z, s, rot, tilt);
    };
    const T = terrain;
    const step = quality === 'low' ? 11 : 8.5;
    for (let z = -HALF; z < HALF; z += step) for (let x = -HALF; x < HALF; x += step) {
      const px = x + (rand() - 0.5) * step * 0.9, pz = z + (rand() - 0.5) * step * 0.9;
      const h = T.heightAt(px, pz);
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
      const pOak = villageRing * 0.25 + sm(0.05, 0.3, forest) * 0.1 * (1 - north) * (1 - village);
      if (r < pPine) push(snowy || north > 0.6 ? 'snowPine' : 'pine', px, h - 0.2, pz, 2.2 + rand() * 1.8, rand() * 6);
      else if (r < pPine + pOak) push('oak', px, h - 0.2, pz, 1.1 + rand() * 0.7, rand() * 6);
      else if (r < pPine + pOak + 0.012) push('rock', px, h - 0.2, pz, 0.6 + rand() * 1.4, rand() * 6);
      else if (r < pPine + pOak + 0.016 && north < 0.5) push('dead', px, h - 0.2, pz, 0.9 + rand() * 0.4, rand() * 6);
    }
    // Build instanced meshes
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    this.count = 0;
    for (const [key, arr] of buckets) {
      const [cellKey, name] = key.split('|');
      const [ci, cj] = cellKey.split(',').map(Number);
      const cell = { cx: -HALF + (ci + 0.5) * CELL, cz: -HALF + (cj + 0.5) * CELL, meshes: [], shadow: name !== 'mushroom' && name !== 'rock' };
      const count = arr.length / 6;
      for (const part of sp[name]) {
        const im = new THREE.InstancedMesh(part.geo, part.mat, count);
        for (let i = 0; i < count; i++) {
          const [x, y, z, sc, rot, tilt] = arr.slice(i * 6, i * 6 + 6);
          e.set(tilt, rot, 0); q.setFromEuler(e); s.set(sc, sc * (0.9 + ((i * 7) % 5) * 0.05), sc); p.set(x, y, z);
          im.setMatrixAt(i, m4.compose(p, q, s));
        }
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = cell.shadow && part.kind !== 'glow';
        im.receiveShadow = part.kind !== 'glow';
        scene.add(im);
        cell.meshes.push(im);
      }
      this.count += count;
      if (name === 'pine' || name === 'snowPine' || name === 'oak' || name === 'witch' || name === 'dead') {
        for (let i = 0; i < count; i++) world.circle(arr[i * 6], arr[i * 6 + 2], 0.35 * arr[i * 6 + 3] * 0.6, arr[i * 6 + 1] - 2, arr[i * 6 + 1] + 12);
      }
      this.cells.push(cell);
    }
  }

  update(px, pz, far) {
    for (const c of this.cells) {
      const d = Math.hypot(c.cx - px, c.cz - pz) - 180;
      const vis = d < far;
      for (const m of c.meshes) m.visible = vis;
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
