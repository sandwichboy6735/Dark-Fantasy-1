// Chunk storage, three-channel flood-fill lighting (sky / warm fire / cold soul-light),
// greedy-free face meshing with smooth lighting + ambient occlusion, and voxel raycasting.
import * as THREE from 'three';
import { CS, CH, Generator } from './worldgen.js';
import { B, BLOCKS, OPAQUE, ATTEN, EMIT_WARM, EMIT_SOUL } from './blocks.js';
import { tileUV } from './textures.js';

const N = CS * CS * CH;
const SKY = 0, WARM = 1, SOUL = 2;
const idx = (x, y, z) => (y * CS + z) * CS + x;

class Chunk {
  constructor(cx, cz) {
    this.cx = cx; this.cz = cz;
    this.key = cx + ',' + cz;
    this.blocks = new Uint8Array(N);
    this.light = [new Uint8Array(N), new Uint8Array(N), new Uint8Array(N)];
    this.state = 0; // 0 empty, 1 generated, 2 lit
    this.meshed = false;
    this.dirty = false;
    this.mesh = null; this.tmesh = null;
  }
}

// ---------- Face tables ----------
const FACES = [];
{
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const shade = [0.72, 0.72, 1.0, 0.45, 0.84, 0.84];
  dirs.forEach((N, f) => {
    const a = N[0] ? 0 : N[1] ? 1 : 2, s = N[a];
    const t1 = (a + 1) % 3, t2 = (a + 2) % 3;
    let corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => {
      const pos = [0, 0, 0]; pos[a] = s > 0 ? 1 : 0; pos[t1] = u; pos[t2] = v;
      const d1 = [0, 0, 0], d2 = [0, 0, 0]; d1[t1] = u ? 1 : -1; d2[t2] = v ? 1 : -1;
      const s1 = [N[0] + d1[0], N[1] + d1[1], N[2] + d1[2]];
      const s2 = [N[0] + d2[0], N[1] + d2[1], N[2] + d2[2]];
      const c = [N[0] + d1[0] + d2[0], N[1] + d1[1] + d2[1], N[2] + d1[2] + d2[2]];
      let U, V;
      if (a === 1) { U = pos[0]; V = pos[2]; }
      else if (a === 0) { U = s > 0 ? 1 - pos[2] : pos[2]; V = 1 - pos[1]; }
      else { U = s > 0 ? pos[0] : 1 - pos[0]; V = 1 - pos[1]; }
      return { pos, s1, s2, c, U, V };
    });
    // Ensure CCW winding when viewed from outside
    const p0 = corners[0].pos, p1 = corners[1].pos, p3 = corners[3].pos;
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], e2 = [p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * N[0] + cr[1] * N[1] + cr[2] * N[2] < 0) corners = [corners[0], corners[3], corners[2], corners[1]];
    FACES.push({ N, corners, shade: shade[f], texKey: a === 1 ? (s > 0 ? 'top' : 'bottom') : 'side' });
  });
}

// Mesh buffers reused between chunks
class Buf {
  constructor() { this.reset(64 * 1024); }
  reset(cap) {
    this.pos = new Float32Array(cap * 3); this.uv = new Float32Array(cap * 2);
    this.light = new Float32Array(cap * 4); this.misc = new Float32Array(cap * 2);
    this.index = new Uint32Array(cap * 1.5); this.cap = cap; this.v = 0; this.i = 0;
  }
  grow() {
    const o = this; const n = new Buf(); n.reset(o.cap * 2);
    n.pos.set(o.pos); n.uv.set(o.uv); n.light.set(o.light); n.misc.set(o.misc); n.index.set(o.index);
    n.v = o.v; n.i = o.i;
    Object.assign(this, n);
  }
  vert(x, y, z, u, v, sky, warm, soul, ao, em, sway) {
    if (this.v >= this.cap - 4) this.grow();
    const k = this.v;
    this.pos[k * 3] = x; this.pos[k * 3 + 1] = y; this.pos[k * 3 + 2] = z;
    this.uv[k * 2] = u; this.uv[k * 2 + 1] = v;
    this.light[k * 4] = sky; this.light[k * 4 + 1] = warm; this.light[k * 4 + 2] = soul; this.light[k * 4 + 3] = ao;
    this.misc[k * 2] = em; this.misc[k * 2 + 1] = sway;
    this.v++;
    return k;
  }
  quad(a, b, c, d, flip) {
    const I = this.index; let i = this.i;
    if (flip) { I[i++] = b; I[i++] = c; I[i++] = d; I[i++] = b; I[i++] = d; I[i++] = a; }
    else { I[i++] = a; I[i++] = b; I[i++] = c; I[i++] = a; I[i++] = c; I[i++] = d; }
    this.i = i;
  }
  toGeometry() {
    if (this.i === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, this.v * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv.slice(0, this.v * 2), 2));
    g.setAttribute('aLight', new THREE.BufferAttribute(this.light.slice(0, this.v * 4), 4));
    g.setAttribute('aMisc', new THREE.BufferAttribute(this.misc.slice(0, this.v * 2), 2));
    g.setIndex(new THREE.BufferAttribute(this.index.slice(0, this.i), 1));
    g.computeBoundingSphere();
    return g;
  }
}

// Padded neighbourhood (18 x CH x 18) copied before meshing, so all lookups are array reads
const PW = CS + 2;
const PN = PW * PW * CH;
const pidx = (x, y, z) => (y * PW + (z + 1)) * PW + (x + 1);

export class World {
  constructor(seed, scene, materials) {
    this.gen = new Generator(seed);
    this.seed = seed;
    this.scene = scene;
    this.materials = materials;
    this.chunks = new Map();
    this.edits = new Map(); // chunkKey -> Map(localIndex -> id)
    this.renderDist = 6;
    this.bufO = new Buf(); this.bufT = new Buf();
    this.pB = new Uint8Array(PN);
    this.pL = [new Uint8Array(PN), new Uint8Array(PN), new Uint8Array(PN)];
    this._last = null;
    this.uvCache = {};
    for (const b of BLOCKS) if (b.tex) this.uvCache[b.id] = { top: tileUV(b.tex.top), side: tileUV(b.tex.side), bottom: tileUV(b.tex.bottom) };
  }

  chunkAt(cx, cz) {
    const l = this._last;
    if (l && l.cx === cx && l.cz === cz) return l;
    const c = this.chunks.get(cx + ',' + cz);
    if (c) this._last = c;
    return c;
  }

  getBlock(x, y, z) {
    if (y < 0) return B.ABYSSAL;
    if (y >= CH) return B.AIR;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || c.state < 1) return B.AIR;
    return c.blocks[idx(x & 15, y, z & 15)];
  }

  isReady(x, z) { const c = this.chunkAt(x >> 4, z >> 4); return c && c.meshed; }

  getLight(ch, x, y, z) {
    if (y >= CH) return ch === SKY ? 15 : 0;
    if (y < 0) return 0;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || c.state < 2) return 0;
    return c.light[ch][idx(x & 15, y, z & 15)];
  }

  setLight(ch, x, y, z, v) {
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || c.state < 2) return;
    c.light[ch][idx(x & 15, y, z & 15)] = v;
    c.dirty = true;
  }

  // Sample light at a world position (for entities / held item)
  sampleLight(x, y, z) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    return [this.getLight(SKY, bx, by, bz) / 15, this.getLight(WARM, bx, by, bz) / 15, this.getLight(SOUL, bx, by, bz) / 15];
  }

  surfaceY(x, z) {
    for (let y = CH - 1; y > 0; y--) {
      const id = this.getBlock(x, y, z);
      if (id !== B.AIR && BLOCKS[id].solid) return y;
      if (id === B.WATER) return y;
    }
    return this.gen.height(x, z);
  }

  // ---------- Lighting ----------
  propagate(ch, seeds) {
    const q = seeds; let head = 0;
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    while (head < q.length) {
      const x = q[head++], y = q[head++], z = q[head++];
      const v = this.getLight(ch, x, y, z);
      if (v <= 1) continue;
      for (let d = 0; d < 6; d++) {
        const D = DIRS[d];
        const nx = x + D[0], ny = y + D[1], nz = z + D[2];
        if (ny < 0 || ny >= CH) continue;
        const c = this.chunkAt(nx >> 4, nz >> 4);
        if (!c || c.state < 2) continue;
        const i = idx(nx & 15, ny, nz & 15);
        const att = ATTEN[c.blocks[i]];
        if (att >= 15) continue;
        const nv = (ch === SKY && d === 3 && v === 15 && att === 0) ? 15 : v - 1 - att;
        if (nv > c.light[ch][i]) {
          c.light[ch][i] = nv; c.dirty = true;
          q.push(nx, ny, nz);
        }
      }
    }
  }

  unlight(ch, x, y, z, v, relight) {
    const q = [x, y, z, v]; let head = 0;
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    while (head < q.length) {
      const px = q[head++], py = q[head++], pz = q[head++], pv = q[head++];
      for (let d = 0; d < 6; d++) {
        const D = DIRS[d];
        const nx = px + D[0], ny = py + D[1], nz = pz + D[2];
        if (ny < 0 || ny >= CH) continue;
        const nv = this.getLight(ch, nx, ny, nz);
        if (nv === 0) continue;
        const selfEmit = ch === WARM ? EMIT_WARM[this.getBlock(nx, ny, nz)] : ch === SOUL ? EMIT_SOUL[this.getBlock(nx, ny, nz)] : 0;
        if ((nv < pv || (ch === SKY && d === 3 && pv === 15 && nv === 15)) && nv > selfEmit) {
          this.setLight(ch, nx, ny, nz, 0);
          q.push(nx, ny, nz, nv);
        } else relight.push(nx, ny, nz);
      }
    }
  }

  lightChunk(c) {
    c.state = 2;
    const { blocks, light } = c;
    const sky = light[SKY];
    let maxH = 0;
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      let level = 15;
      for (let y = CH - 1; y >= 0; y--) {
        const i = idx(x, y, z);
        const att = ATTEN[blocks[i]];
        if (att >= 15) { if (level === 15) maxH = Math.max(maxH, y); level = 0; }
        else if (att > 0) { if (level === 15) maxH = Math.max(maxH, y); level = Math.max(0, level - att); }
        sky[i] = level;
      }
    }
    const wx0 = c.cx * CS, wz0 = c.cz * CS;
    const seeds = [[], [], []];
    const top = Math.min(CH - 1, maxH + 1);
    for (let y = 0; y <= top; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const i = idx(x, y, z);
      if (sky[i] > 1) seeds[SKY].push(wx0 + x, y, wz0 + z);
      const id = blocks[i];
      if (EMIT_WARM[id]) { light[WARM][i] = EMIT_WARM[id]; seeds[WARM].push(wx0 + x, y, wz0 + z); }
      if (EMIT_SOUL[id]) { light[SOUL][i] = EMIT_SOUL[id]; seeds[SOUL].push(wx0 + x, y, wz0 + z); }
    }
    // Pull light in from already-lit neighbours
    const nbs = [[-1, 0, -1, null], [1, 0, CS, null], [0, -1, null, -1], [0, 1, null, CS]];
    for (const [dx, dz, fx, fz] of nbs) {
      const n = this.chunkAt(c.cx + dx, c.cz + dz);
      if (!n || n.state < 2 || n === c) continue;
      for (let y = 0; y < CH; y++) for (let t = 0; t < CS; t++) {
        const wx = fx !== null ? wx0 + fx : wx0 + t;
        const wz = fz !== null ? wz0 + fz : wz0 + t;
        const i = idx(wx & 15, y, wz & 15);
        for (let ch = 0; ch < 3; ch++) if (n.light[ch][i] > 1) seeds[ch].push(wx, y, wz);
      }
    }
    for (let ch = 0; ch < 3; ch++) this.propagate(ch, seeds[ch]);
  }

  // ---------- Editing ----------
  setBlock(x, y, z, id, record = true) {
    if (y < 1 || y >= CH) return false;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || c.state < 2) return false;
    const i = idx(x & 15, y, z & 15);
    const old = c.blocks[i];
    if (old === id) return false;
    c.blocks[i] = id;
    if (record) {
      let m = this.edits.get(c.key);
      if (!m) { m = new Map(); this.edits.set(c.key, m); }
      m.set(i, id);
    }
    // Relight around the change
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (let ch = 0; ch < 3; ch++) {
      const relight = [];
      const v = c.light[ch][i];
      c.light[ch][i] = 0;
      this.unlight(ch, x, y, z, v, relight);
      const emit = ch === WARM ? EMIT_WARM[id] : ch === SOUL ? EMIT_SOUL[id] : 0;
      if (emit) { c.light[ch][i] = emit; relight.push(x, y, z); }
      for (const D of DIRS) relight.push(x + D[0], y + D[1], z + D[2]);
      if (ch === SKY && y + 1 >= CH) c.light[SKY][i] = 15;
      this.propagate(ch, relight);
    }
    c.dirty = true;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = this.chunkAt((x + dx) >> 4, (z + dz) >> 4);
      if (n) n.dirty = true;
    }
    this.remeshDirty();
    return true;
  }

  remeshDirty() {
    for (const c of this.chunks.values()) if (c.dirty && c.meshed) this.meshChunk(c);
  }

  // ---------- Streaming ----------
  update(px, pz, budgetMs = 6) {
    const t0 = performance.now();
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    const R = this.renderDist;
    const list = [];
    for (let dz = -R - 2; dz <= R + 2; dz++) for (let dx = -R - 2; dx <= R + 2; dx++) {
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > R + 2.5) continue;
      list.push([d, pcx + dx, pcz + dz]);
    }
    list.sort((a, b) => a[0] - b[0]);
    let work = 0;
    for (const [d, cx, cz] of list) {
      if (performance.now() - t0 > budgetMs) break;
      let c = this.chunkAt(cx, cz);
      if (!c) { c = new Chunk(cx, cz); this.chunks.set(c.key, c); }
      if (c.state === 0) {
        this.gen.generate(c);
        const m = this.edits.get(c.key);
        if (m) for (const [i, id] of m) c.blocks[i] = id;
        c.state = 1; work++; continue;
      }
      if (c.state === 1 && d <= R + 1.5 && this.neighborsAtLeast(cx, cz, 1)) { this.lightChunk(c); work++; continue; }
      if (c.state === 2 && d <= R + 0.5 && (!c.meshed || c.dirty) && this.neighborsAtLeast(cx, cz, 2)) { this.meshChunk(c); work++; continue; }
    }
    // Neighbour light spill marks meshed chunks dirty; refresh them
    for (const c of this.chunks.values()) if (c.meshed && c.dirty && performance.now() - t0 < budgetMs * 1.5) this.meshChunk(c);
    // Unload far chunks
    for (const c of this.chunks.values()) {
      const dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > (R + 5) * (R + 5)) this.unload(c);
    }
    return work;
  }

  neighborsAtLeast(cx, cz, s) {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = this.chunkAt(cx + dx, cz + dz);
      if (!n || n.state < s) return false;
    }
    return true;
  }

  unload(c) {
    if (c.mesh) { this.scene.remove(c.mesh); c.mesh.geometry.dispose(); }
    if (c.tmesh) { this.scene.remove(c.tmesh); c.tmesh.geometry.dispose(); }
    this.chunks.delete(c.key);
    if (this._last === c) this._last = null;
  }

  dispose() { for (const c of [...this.chunks.values()]) this.unload(c); }

  progress(px, pz) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    let total = 0, done = 0; const R = Math.min(3, this.renderDist);
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { total++; const c = this.chunkAt(pcx + dx, pcz + dz); if (c && c.meshed) done++; }
    return done / total;
  }

  // ---------- Meshing ----------
  meshChunk(c) {
    const pB = this.pB, pL = this.pL;
    // Copy padded neighbourhood
    for (let dz = -1; dz <= CS; dz++) for (let dx = -1; dx <= CS; dx++) {
      const wx = c.cx * CS + dx, wz = c.cz * CS + dz;
      const src = (dx >= 0 && dx < CS && dz >= 0 && dz < CS) ? c : this.chunkAt(wx >> 4, wz >> 4);
      const lx = wx & 15, lz = wz & 15;
      for (let y = 0; y < CH; y++) {
        const p = pidx(dx, y, dz);
        if (!src || src.state < 1) { pB[p] = 0; pL[0][p] = 15; pL[1][p] = 0; pL[2][p] = 0; continue; }
        const i = idx(lx, y, lz);
        pB[p] = src.blocks[i];
        if (src.state >= 2) { pL[0][p] = src.light[0][i]; pL[1][p] = src.light[1][i]; pL[2][p] = src.light[2][i]; }
        else { pL[0][p] = 0; pL[1][p] = 0; pL[2][p] = 0; }
      }
    }
    const O = this.bufO, Tb = this.bufT;
    O.v = O.i = 0; Tb.v = Tb.i = 0;
    const blocks = c.blocks;
    const L0 = pL[0], L1 = pL[1], L2 = pL[2];
    const sample = new Float32Array(4 * 4);

    for (let y = 0; y < CH; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const id = blocks[idx(x, y, z)];
      if (id === 0) continue;
      const b = BLOCKS[id];
      const uvs = this.uvCache[id];
      const p = pidx(x, y, z);
      if (b.cross) {
        const uv = uvs.side;
        const sk = L0[p] / 15, wm = L1[p] / 15, so = L2[p] / 15;
        const quads = [[[0.15, 0.15], [0.85, 0.85]], [[0.85, 0.15], [0.15, 0.85]]];
        for (const [[ax, az], [bx, bz]] of quads) {
          const v0 = O.vert(x + ax, y, z + az, uv[0], uv[3], sk, wm, so, 0.9, b.emissive, 0);
          const v1 = O.vert(x + bx, y, z + bz, uv[2], uv[3], sk, wm, so, 0.9, b.emissive, 0);
          const v2 = O.vert(x + bx, y + 1, z + bz, uv[2], uv[1], sk, wm, so, 0.9, b.emissive, b.sway);
          const v3 = O.vert(x + ax, y + 1, z + az, uv[0], uv[1], sk, wm, so, 0.9, b.emissive, b.sway);
          O.quad(v0, v1, v2, v3, false);
          O.quad(v0, v3, v2, v1, false);
        }
        continue;
      }
      const buf = b.translucent ? Tb : O;
      const isWater = b.water;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f];
        const n = pidx(x + F.N[0], y + F.N[1], z + F.N[2]);
        const nid = pB[n];
        if (OPAQUE[nid]) continue;
        if (nid === id && (b.translucent || b.cutout && !b.sway)) continue;
        if (isWater && nid !== 0 && BLOCKS[nid].solid && !BLOCKS[nid].cutout) continue;
        if (y + F.N[1] < 0) continue;
        const uv = uvs[F.texKey];
        const vi = [0, 0, 0, 0];
        let aoSum02 = 0, aoSum13 = 0;
        for (let k = 0; k < 4; k++) {
          const C = F.corners[k];
          const s1 = pidx(x + C.s1[0], y + C.s1[1], z + C.s1[2]);
          const s2 = pidx(x + C.s2[0], y + C.s2[1], z + C.s2[2]);
          const cc = pidx(x + C.c[0], y + C.c[1], z + C.c[2]);
          const o1 = OPAQUE[pB[s1]], o2 = OPAQUE[pB[s2]], oc = OPAQUE[pB[cc]];
          const ao = (o1 && o2) ? 0 : 3 - (o1 + o2 + oc);
          let cnt = 1, a0 = L0[n], a1 = L1[n], a2 = L2[n];
          if (!o1) { cnt++; a0 += L0[s1]; a1 += L1[s1]; a2 += L2[s1]; }
          if (!o2) { cnt++; a0 += L0[s2]; a1 += L1[s2]; a2 += L2[s2]; }
          if (!oc && !(o1 && o2)) { cnt++; a0 += L0[cc]; a1 += L1[cc]; a2 += L2[cc]; }
          const inv = 1 / (cnt * 15);
          let py = y + C.pos[1];
          if (isWater && C.pos[1] === 1 && pB[pidx(x, y + 1, z)] !== B.WATER) py -= 0.12;
          const aoF = (isWater ? 1 : [0.42, 0.62, 0.82, 1][ao]) * F.shade;
          if (k === 0 || k === 2) aoSum02 += ao; else aoSum13 += ao;
          vi[k] = buf.vert(x + C.pos[0], py, z + C.pos[2],
            uv[0] + C.U * (uv[2] - uv[0]), uv[1] + C.V * (uv[3] - uv[1]),
            a0 * inv, a1 * inv, a2 * inv, aoF, b.emissive, b.sway * 0.35);
        }
        buf.quad(vi[0], vi[1], vi[2], vi[3], aoSum02 < aoSum13);
      }
    }
    void sample;
    const ox = c.cx * CS, oz = c.cz * CS;
    const g1 = O.toGeometry(), g2 = Tb.toGeometry();
    if (c.mesh) { this.scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }
    if (c.tmesh) { this.scene.remove(c.tmesh); c.tmesh.geometry.dispose(); c.tmesh = null; }
    if (g1) { c.mesh = new THREE.Mesh(g1, this.materials.opaque); c.mesh.position.set(ox, 0, oz); c.mesh.matrixAutoUpdate = false; c.mesh.updateMatrix(); this.scene.add(c.mesh); }
    if (g2) { c.tmesh = new THREE.Mesh(g2, this.materials.translucent); c.tmesh.position.set(ox, 0, oz); c.tmesh.renderOrder = 1; c.tmesh.matrixAutoUpdate = false; c.tmesh.updateMatrix(); this.scene.add(c.tmesh); }
    c.meshed = true; c.dirty = false;
  }

  // ---------- Raycast (Amanatides & Woo) ----------
  raycast(o, d, maxDist) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity;
    let tmx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
    let tmy = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
    let tmz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    while (t <= maxDist) {
      const id = this.getBlock(x, y, z);
      if (id !== B.AIR && id !== B.WATER) return { x, y, z, nx, ny, nz, id, t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }

  // ---------- Persistence ----------
  serializeEdits() {
    const out = {};
    for (const [k, m] of this.edits) { const arr = []; for (const [i, id] of m) arr.push(i, id); out[k] = arr; }
    return out;
  }
  loadEdits(obj) {
    this.edits.clear();
    for (const k in obj) { const m = new Map(); const a = obj[k]; for (let j = 0; j < a.length; j += 2) m.set(a[j], a[j + 1]); this.edits.set(k, m); }
  }
}

export { SKY, WARM, SOUL };
