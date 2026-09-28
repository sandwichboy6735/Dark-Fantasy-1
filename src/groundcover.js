// A living carpet of grass and wildflowers that follows the wanderer and sways in the wind.
import * as THREE from 'three';
import { WATER_Y } from './layout.js';

const hash = (x, z) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// A clump of fine grass blades painted on a transparent card
function grassClumpTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  let seed = 3; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 140; i++) {
    const x0 = 20 + r() * 216, h = 90 + r() * 160, lean = (r() - 0.5) * 90;
    const l = 30 + r() * 45, w = 1.5 + r() * 2.5;
    const g = ctx.createLinearGradient(0, 256, 0, 256 - h);
    g.addColorStop(0, `hsl(${70 + r() * 20},18%,${l * 0.3}%)`); g.addColorStop(1, `hsl(${55 + r() * 40},${16 + r() * 16}%,${l * 0.85}%)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0 - w, 256); ctx.quadraticCurveTo(x0 + lean * 0.3, 256 - h * 0.6, x0 + lean, 256 - h); ctx.quadraticCurveTo(x0 + lean * 0.3 + w, 256 - h * 0.6, x0 + w, 256); ctx.fill();
  }
  // seed heads
  for (let i = 0; i < 12; i++) { const x = 30 + r() * 196, y = 20 + r() * 80; ctx.fillStyle = `hsl(45,30%,${55 + r() * 20}%)`; ctx.beginPath(); ctx.ellipse(x, y, 2, 7, (r() - 0.5), 0, 7); ctx.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function clumpGeometry() {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(1.1, 0.75, 1, 2);
    g.translate(0, 0.375, 0); g.rotateY((i / 3) * Math.PI);
    parts.push(g.toNonIndexed());
  }
  const pos = [], uv = [], col = [], nor = [];
  for (const g of parts) {
    const p = g.attributes.position, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); uv.push(u.getX(i), u.getY(i));
      const t = p.getY(i) / 0.75; col.push(0.55 + t * 0.6, 0.55 + t * 0.6, 0.55 + t * 0.6); nor.push(0, 1, 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

function grassGeometry() {
  const pos = [], col = [], idx = [];
  const blades = 9;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + b * 0.7;
    const r = 0.05 + ((b * 37) % 7) * 0.02;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const h = 0.45 + ((b * 13) % 5) * 0.09;
    const lean = 0.18 + ((b * 7) % 3) * 0.08;
    const dx = Math.cos(a) * lean, dz = Math.sin(a) * lean;
    const px = -Math.sin(a), pz = Math.cos(a);
    const segs = [[0, 0.035], [0.45, 0.028], [0.8, 0.016], [1, 0]];
    const base = pos.length / 3;
    for (const [t, w] of segs) {
      const bend = t * t;
      const cx = bx + dx * bend, cz = bz + dz * bend, cy = h * t;
      pos.push(cx + px * w, cy, cz + pz * w, cx - px * w, cy, cz - pz * w);
      const shade = 0.35 + t * 0.75;
      col.push(shade, shade, shade, shade, shade, shade);
    }
    for (let s = 0; s < 3; s++) {
      const i = base + s * 2;
      idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // grass normals point up so the carpet lights evenly
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

function flowerGeometry() {
  const g = new THREE.BufferGeometry();
  const stem = new THREE.CylinderGeometry(0.006, 0.008, 0.4, 3); stem.translate(0, 0.2, 0);
  const head = new THREE.IcosahedronGeometry(0.045, 0); head.translate(0, 0.42, 0);
  const parts = [stem, head].map((p) => p.toNonIndexed());
  const pos = [], col = [];
  parts.forEach((p, k) => { const a = p.attributes.position; for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); const c = k ? 1 : 0.25; col.push(k ? 1 : 0.2, k ? 1 : 0.35, k ? 1 : 0.18); void c; } });
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function windy(mat, time, strength) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      float sway = sin(uTime * 1.6 + ip.x * 0.35 + ip.z * 0.25) * 0.6 + sin(uTime * 2.7 + ip.x * 1.3) * 0.25;
      float gust = smoothstep(0.3, 1.0, sin(uTime * 0.35 + ip.x * 0.02 + ip.z * 0.015));
      transformed.x += (sway + gust * 1.2) * ${strength.toFixed(2)} * position.y * position.y;
      transformed.z += sway * 0.5 * ${strength.toFixed(2)} * position.y * position.y;
      // shrink blades that would sit between the camera and the wanderer
      float camD = length(ip.xz - cameraPosition.xz);
      transformed *= smoothstep(1.2, 4.5, camD);`);
    // both sides of a blade take the light the same way, and a little sky light shines through
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.indirectDiffuse *= 1.35;');
  };
  return mat;
}

export class GroundCover {
  constructor(scene, terrain, world, quality) {
    this.T = terrain; this.world = world;
    this.radius = quality === 'low' ? 32 : 50;
    this.spacing = quality === 'low' ? 1.25 : 0.95;
    const max = Math.ceil(Math.PI * (this.radius / this.spacing) ** 2 * 1.05);
    this.time = { value: 0 };
    const gm = windy(new THREE.MeshStandardMaterial({ map: grassClumpTex(), alphaTest: 0.4, vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 }), this.time, 0.35);
    this.grass = new THREE.InstancedMesh(clumpGeometry(), gm, max);
    this.grass.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.grass.frustumCulled = false; this.grass.receiveShadow = true;
    const fm = windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: 0x000000 }), this.time, 0.4);
    this.flowers = new THREE.InstancedMesh(flowerGeometry(), fm, Math.ceil(max / 6));
    this.flowers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.ceil(max / 6) * 3), 3);
    this.flowers.frustumCulled = false;
    scene.add(this.grass, this.flowers);
    this.center = new THREE.Vector2(1e9, 1e9);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3();
  }

  rebuild(cx, cz) {
    const { T, world, radius: R, spacing: S } = this;
    let n = 0, nf = 0;
    const gi = this.grass, fi = this.flowers, gc = gi.instanceColor.array, fc = fi.instanceColor.array;
    const lut = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const flowerCols = [[0.9, 0.85, 1.3], [1.2, 0.35, 0.35], [1.2, 1.0, 0.3], [0.6, 0.45, 1.3], [1.3, 1.3, 1.3]];
    for (let gz = Math.floor((cz - R) / S); gz <= Math.ceil((cz + R) / S); gz++) {
      for (let gx = Math.floor((cx - R) / S); gx <= Math.ceil((cx + R) / S); gx++) {
        const h1 = hash(gx, gz), h2 = hash(gx + 7919, gz - 104729);
        const x = (gx + h1) * S, z = (gz + h2) * S;
        const d2 = (x - cx) ** 2 + (z - cz) ** 2;
        if (d2 > R * R) continue;
        const y = T.heightAt(x, z);
        if (y < WATER_Y + 0.4 || y > 175) continue;
        if (T.slope(x, z) > 0.75) continue;
        if (T.roadDist(x, z) < 3.2) continue;
        if (!world.treeFree(x, z) && hash(gx, gz + 5) < 0.75) continue; // sparser around buildings
        // colour from the painted ground
        const fx = (x + 1536) / 3, fz = (z + 1536) / 3;
        const k = (Math.round(fz) * 1025 + Math.round(fx)) * 3;
        const tc = T.col;
        if (tc[k] > 150 && tc[k + 2] > 170) continue; // snow
        const edge = Math.min(1, (R - Math.sqrt(d2)) / 8);
        const sc = (0.8 + hash(gx - 3, gz + 11) * 0.9) * edge;
        this.e.set(0, h1 * 6.28, 0); this.q.setFromEuler(this.e);
        this.s.set(sc, sc * (0.8 + h2 * 0.5), sc);
        this.p.set(x, y - 0.03, z);
        if (n < gi.count) {
          gi.setMatrixAt(n, this.m.compose(this.p, this.q, this.s));
          const v = 0.8 + hash(gx + 1, gz) * 0.5;
          const cr = lut(tc[k]), cg = lut(tc[k + 1]), cb = lut(tc[k + 2]), mx = Math.max(cr, cg, cb, 1e-3);
          gc[n * 3] = (0.35 + 0.65 * cr / mx) * v * 0.85; gc[n * 3 + 1] = (0.35 + 0.65 * cg / mx) * v * 0.9; gc[n * 3 + 2] = (0.35 + 0.65 * cb / mx) * v * 0.75;
          n++;
        }
        if (hash(gx + 31, gz - 17) < 0.07 && nf < fi.count) {
          this.p.x += 0.3;
          fi.setMatrixAt(nf, this.m.compose(this.p, this.q, this.s.set(sc, sc, sc)));
          const fcol = flowerCols[Math.floor(hash(gx >> 3, gz >> 3) * flowerCols.length)];
          fc[nf * 3] = fcol[0]; fc[nf * 3 + 1] = fcol[1]; fc[nf * 3 + 2] = fcol[2];
          nf++;
        }
      }
    }
    gi.count = n; fi.count = nf;
    gi.instanceMatrix.needsUpdate = true; gi.instanceColor.needsUpdate = true;
    fi.instanceMatrix.needsUpdate = true; fi.instanceColor.needsUpdate = true;
  }

  update(t, x, z) {
    this.time.value = t;
    if (Math.hypot(x - this.center.x, z - this.center.y) > this.radius * 0.3) {
      this.center.set(x, z);
      this.grass.count = this.grass.instanceMatrix.count; this.flowers.count = this.flowers.instanceMatrix.count;
      this.rebuild(x, z);
    }
  }
}
