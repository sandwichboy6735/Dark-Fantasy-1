// Heightmap terrain for the floating continent, painted per-vertex and streamed in LOD chunks.
import * as THREE from 'three';
import { Simplex } from './noise.js';
import { HALF, ROADS, WATER_Y, BAYOU } from './layout.js';

export const N = 1025;             // heightmap nodes per side
export const CELL = (HALF * 2) / (N - 1); // 3 m
const CHUNK_CELLS = 64;            // 192 m chunks
const CHUNKS = (N - 1) / CHUNK_CELLS;
const VOID = -260;
const PROMONTORIES = [[120, 1190], [-860, 860]].map(([x, z]) => [Math.atan2(z, x), Math.hypot(x, z)]);

const sm = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const flat = (h, x, z, cx, cz, r, w, target) => {
  const d = Math.hypot(x - cx, z - cz);
  if (d > r + w) return h;
  return lerp(h, target, sm(r + w, r, d));
};

// sRGB palette
const C = {
  grassA: [34, 64, 48], grassB: [48, 80, 50], grassDark: [24, 44, 38], meadow: [56, 88, 54],
  rock: [98, 94, 90], rockDark: [64, 62, 62], snow: [206, 212, 238], snowShade: [160, 168, 210],
  road: [104, 90, 76], witch: [54, 40, 76], witchDark: [34, 26, 50], shore: [70, 72, 70],
  grave: [42, 58, 56], market: [86, 70, 58], cliff: [66, 62, 82], mud: [40, 38, 28], bog: [38, 50, 34],
};

export class Terrain {
  constructor(seed = 1337) {
    this.n = [];
    for (let i = 0; i < 10; i++) this.n.push(new Simplex(seed + i * 101));
    this.h = new Float32Array(N * N);
    this.col = new Uint8Array(N * N * 3);
    this.road = new Uint8Array(N * N);
    this.segs = [];
    for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) this.segs.push([r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]]);
  }

  edgeRadius(x, z) {
    const a = Math.atan2(z, x);
    let r = 1290 + this.n[0].fbm2(Math.cos(a) * 1.6 + 11, Math.sin(a) * 1.6 + 11, 3) * 190;
    // Headlands that must reach out to the lighthouse and Starfall Point
    for (const [pa, pd] of PROMONTORIES) {
      let da = Math.abs(a - pa); if (da > Math.PI) da = 2 * Math.PI - da;
      r = Math.max(r, (pd + 70) * Math.exp(-((da / 0.1) ** 2)));
    }
    return r;
  }

  raw(x, z) {
    const n = this.n;
    const d = Math.hypot(x, z) + n[1].noise2(x / 260, z / 260) * 35;
    const edgeR = this.edgeRadius(x, z);
    if (d > edgeR + 60) return VOID;
    let h = 32 + n[2].fbm2(x / 700, z / 700, 3) * 26 + n[3].fbm2(x / 170, z / 170, 4) * 9 + n[4].fbm2(x / 42, z / 42, 3) * 2.2;
    h += Math.max(0, n[5].fbm2(x / 380 + 30, z / 380 - 20, 3)) * 80;
    // The Frostfang Mountains fill the north
    const north = sm(-260, -700, z);
    if (north > 0) {
      const r = n[6].ridged2(x / 330, z / 330, 5);
      h += north * (r * r * r * 360 + 30 + n[7].fbm2(x / 90, z / 90, 3) * 20);
    }
    // The Moonspire
    const ds = Math.hypot(x - 180, z + 820);
    if (ds < 650) h += 380 * Math.exp(-Math.pow(ds / 115, 1.2)) * (0.72 + 0.55 * n[6].ridged2(x / 50, z / 50, 3));
    // Flattened places
    h = flat(h, x, z, 0, 40, 150, 70, 27);          // village
    h = flat(h, x, z, 0, 352, 30, 40, 42);          // overlook ledge
    const le = Math.hypot(x / 250, (z - 205) / 118);  // Mirror Lake basin
    if (le < 1.6) h = lerp(h, 5 + le * 16, sm(1.3, 0.85, le));
    h = flat(h, x, z, -640, 140, 85, 30, 24);        // goblin market hollow
    const dm = Math.hypot(x + 640, z - 140);
    if (dm < 190) h += 34 * sm(95, 125, dm) * sm(190, 150, dm); // its rim
    h = flat(h, x, z, 430, 500, 60, 50, 36);         // graves
    { // the Weeping Bayou: a shallow basin with muddy hummocks
      const db = Math.hypot(x - BAYOU.x, z - BAYOU.z) + n[1].noise2(x / 60, z / 60) * 25;
      if (db < BAYOU.r + 90) {
        const hum = BAYOU.water - 1.6 + Math.max(0, n[9].fbm2(x / 38, z / 38, 3)) * 5;
        h = lerp(h, hum, sm(BAYOU.r + 90, BAYOU.r - 30, db));
      }
    }
    h = flat(h, x, z, -280, 540, 38, 60, 58);        // moon circle hilltop
    h = flat(h, x, z, -760, -260, 40, 80, 88);       // tower hill
    h = flat(h, x, z, 120, 1190, 40, 60, 46);        // lighthouse headland
    h = flat(h, x, z, -860, 860, 40, 50, 60);        // starfall point
    h = flat(h, x, z, 640, 20, 200, 120, lerp(h, 34, 0.5)); // soften the witchwood
    // Castle crag: a tall flat-topped rock
    const dc = Math.hypot(x + 380, z + 560);
    if (dc < 170) {
      const c = sm(105, 60, dc);
      const top = 185 + n[4].noise2(x / 25, z / 25) * 1.5;
      h = Math.max(h, lerp(h, top, c) + n[3].noise2(x / 8, z / 8) * 10 * c * (1 - c) * 3);
    }
    h = flat(h, x, z, -322, -470, 18, 30, Math.min(h, 78)); // gatehouse at the crag's foot
    // Fall away into the clouds at the rim
    const e = sm(edgeR + 10, edgeR - 50, d);
    return h * e + VOID * (1 - e);
  }

  roadDist(x, z) {
    let best = 1e9;
    for (const [ax, az, bx, bz] of this.segs) {
      if (x < Math.min(ax, bx) - 20 || x > Math.max(ax, bx) + 20 || z < Math.min(az, bz) - 20 || z > Math.max(az, bz) + 20) continue;
      const vx = bx - ax, vz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
      const d = Math.hypot(x - ax - vx * t, z - az - vz * t);
      if (d < best) best = d;
    }
    return best;
  }

  // Generator so the loader can yield to the browser between slices
  *generate() {
    const { h } = this;
    for (let j = 0; j < N; j++) {
      const z = -HALF + j * CELL;
      for (let i = 0; i < N; i++) h[j * N + i] = this.raw(-HALF + i * CELL, z);
      if (j % 24 === 0) yield 0.75 * j / N;
    }
    // Paint
    const n = this.n;
    for (let j = 0; j < N; j++) {
      const z = -HALF + j * CELL;
      for (let i = 0; i < N; i++) {
        const k = j * N + i, x = -HALF + i * CELL;
        const y = h[k];
        const col = this.paint(x, z, y, this.slopeAt(i, j), n);
        this.col[k * 3] = col[0]; this.col[k * 3 + 1] = col[1]; this.col[k * 3 + 2] = col[2];
      }
      if (j % 48 === 0) yield 0.75 + 0.25 * j / N;
    }
  }

  slopeAt(i, j) {
    const h = this.h;
    const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(N - 1, j + 1);
    const dx = (h[j * N + i1] - h[j * N + i0]) / ((i1 - i0) * CELL);
    const dz = (h[j1 * N + i] - h[j0 * N + i]) / ((j1 - j0) * CELL);
    return Math.hypot(dx, dz);
  }

  paint(x, z, y, slope, n) {
    const v = n[8].fbm2(x / 60, z / 60, 3), v2 = n[9].noise2(x / 14, z / 14);
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    let c = mix(C.grassA, C.grassB, sm(-0.3, 0.4, v));
    c = mix(c, C.grassDark, sm(0.2, 0.6, v2) * 0.5);
    const dv = Math.hypot(x, z - 40);
    c = mix(c, C.meadow, sm(260, 120, dv) * 0.6);
    const dw = Math.hypot(x - 640, z - 20);
    c = mix(c, mix(C.witch, C.witchDark, sm(-0.2, 0.5, v)), sm(330, 230, dw));
    c = mix(c, C.grave, sm(110, 60, Math.hypot(x - 430, z - 500)));
    c = mix(c, mix(C.bog, C.mud, sm(BAYOU.water + 1.5, BAYOU.water - 0.5, y)), sm(BAYOU.r + 80, BAYOU.r, Math.hypot(x - BAYOU.x, z - BAYOU.z)));
    c = mix(c, C.market, sm(100, 70, Math.hypot(x + 640, z - 140)) * 0.8);
    // Lake shore
    if (y < WATER_Y + 2.5) c = mix(c, C.shore, sm(WATER_Y + 2.5, WATER_Y + 0.5, y));
    // Roads
    const rd = this.roadDist(x, z);
    if (rd < 6) c = mix(c, C.road, sm(6, 2.5, rd) * (0.75 + 0.25 * v2));
    // Rock on steep ground, snow up high (lower in the north)
    const northness = sm(-200, -650, z);
    c = mix(c, mix(C.rock, C.rockDark, sm(-0.3, 0.5, v2)), sm(0.55, 0.95, slope));
    const snowLine = 170 - northness * 80 + v * 25;
    const snow = sm(snowLine, snowLine + 25, y) * (1 - sm(1.1, 1.6, slope) * 0.8);
    c = mix(c, mix(C.snow, C.snowShade, sm(0.6, 1.2, slope)), snow);
    if (y < 0) c = mix(c, C.cliff, sm(0, -40, y));
    return c;
  }

  // ---- Queries ----
  heightAt(x, z) {
    const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL;
    if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return VOID;
    const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, h = this.h, k = j * N + i;
    const a = h[k], b = h[k + 1], c = h[k + N], d = h[k + N + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  slope(x, z) {
    const e = 1.5;
    return Math.hypot(this.heightAt(x + e, z) - this.heightAt(x - e, z), this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
  }

  roadNear(x, z) { return this.roadDist(x, z); }
}

// ---------- Streaming chunk meshes ----------
const LODS = [64, 32, 16, 8];

export class TerrainMesh {
  constructor(terrain, scene, material) {
    this.t = terrain; this.scene = scene; this.material = material;
    this.chunks = [];
    const lut = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const c = i / 255; lut[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    this.lut = lut;
    for (let cj = 0; cj < CHUNKS; cj++) for (let ci = 0; ci < CHUNKS; ci++) {
      // Skip chunks that are entirely void
      let any = false;
      for (let j = 0; j <= CHUNK_CELLS && !any; j += 8) for (let i = 0; i <= CHUNK_CELLS; i += 8) {
        if (terrain.h[(cj * CHUNK_CELLS + j) * N + ci * CHUNK_CELLS + i] > VOID + 1) { any = true; break; }
      }
      if (!any) continue;
      const cx = -HALF + (ci + 0.5) * CHUNK_CELLS * CELL, cz = -HALF + (cj + 0.5) * CHUNK_CELLS * CELL;
      this.chunks.push({ ci, cj, cx, cz, lod: -1, mesh: null, cache: [] });
    }
    this.far = 1300;
  }

  build(ch, lod) {
    if (ch.cache[lod]) return ch.cache[lod];
    const t = this.t, segs = LODS[lod], step = CHUNK_CELLS / segs;
    const vs = segs + 1;
    const count = vs * vs + vs * 4;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    const idx = [];
    const lut = this.lut;
    let v = 0;
    const put = (gi, gj, drop) => {
      const k = gj * N + gi;
      const x = -HALF + gi * CELL, z = -HALF + gj * CELL;
      pos[v * 3] = x; pos[v * 3 + 1] = t.h[k] - drop; pos[v * 3 + 2] = z;
      const i0 = Math.max(0, gi - 1), i1 = Math.min(N - 1, gi + 1), j0 = Math.max(0, gj - 1), j1 = Math.min(N - 1, gj + 1);
      const nx = -(t.h[gj * N + i1] - t.h[gj * N + i0]) / ((i1 - i0) * CELL);
      const nz = -(t.h[j1 * N + gi] - t.h[j0 * N + gi]) / ((j1 - j0) * CELL);
      const l = Math.hypot(nx, 1, nz);
      nor[v * 3] = nx / l; nor[v * 3 + 1] = 1 / l; nor[v * 3 + 2] = nz / l;
      col[v * 3] = lut[t.col[k * 3]]; col[v * 3 + 1] = lut[t.col[k * 3 + 1]]; col[v * 3 + 2] = lut[t.col[k * 3 + 2]];
      uv[v * 2] = x / 7; uv[v * 2 + 1] = z / 7;
      return v++;
    };
    const gi0 = ch.ci * CHUNK_CELLS, gj0 = ch.cj * CHUNK_CELLS;
    for (let b = 0; b < vs; b++) for (let a = 0; a < vs; a++) put(gi0 + a * step, gj0 + b * step, 0);
    for (let b = 0; b < segs; b++) for (let a = 0; a < segs; a++) {
      const p = b * vs + a;
      idx.push(p, p + vs, p + 1, p + 1, p + vs, p + vs + 1);
    }
    // Skirts hide cracks between neighbouring LODs
    const edges = [
      (s) => [s, 0], (s) => [segs, s], (s) => [segs - s, segs], (s) => [0, segs - s],
    ];
    for (const e of edges) {
      const start = v;
      for (let s = 0; s <= segs; s++) { const [a, b] = e(s); put(gi0 + a * step, gj0 + b * step, 18); }
      for (let s = 0; s < segs; s++) {
        const [a0, b0] = e(s), [a1, b1] = e(s + 1);
        const top0 = b0 * vs + a0, top1 = b1 * vs + a1, bot0 = start + s, bot1 = start + s + 1;
        idx.push(top0, bot0, top1, top1, bot0, bot1);
        idx.push(top0, top1, bot0, top1, bot1, bot0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    ch.cache[lod] = g;
    return g;
  }

  update(px, pz, budget = 6) {
    let built = 0;
    const todo = [];
    for (const ch of this.chunks) {
      const d = Math.hypot(ch.cx - px, ch.cz - pz);
      const want = d > this.far ? -1 : d < 320 ? 0 : d < 760 ? 1 : d < 1400 ? 2 : 3;
      if (want === ch.lod) continue;
      if (want === -1) { if (ch.mesh) ch.mesh.visible = false; ch.lod = -1; continue; }
      todo.push([d, ch, want]);
    }
    todo.sort((a, b) => a[0] - b[0]); // nearest ground first
    for (const [, ch, want] of todo) {
      if (!ch.cache[want]) { if (built >= budget) break; built++; }
      const g = this.build(ch, want);
      if (!ch.mesh) {
        ch.mesh = new THREE.Mesh(g, this.material);
        ch.mesh.receiveShadow = true;
        ch.mesh.matrixAutoUpdate = false;
        this.scene.add(ch.mesh);
      } else ch.mesh.geometry = g;
      ch.mesh.visible = true;
      ch.lod = want;
    }
    return built;
  }
}
