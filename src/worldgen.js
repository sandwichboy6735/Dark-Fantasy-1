// Terrain, biomes, trees and ruins. Everything is a pure function of the seed and position,
// so chunks can be generated in any order and features spill across chunk borders seamlessly.
import { Simplex, hash2, hash3 } from './noise.js';
import { B } from './blocks.js';

export const CS = 16;   // chunk size (x/z)
export const CH = 96;   // world height
export const SEA = 30;

export const BIOME = { FOREST: 0, ASHEN: 1, MARSH: 2, SPIRES: 3, GLADE: 4 };
export const BIOME_NAMES = ['The Blighted Wood', 'The Ashen Wastes', 'The Hollow Marsh', 'The Obsidian Spires', 'The Moonlit Glade'];
export const BIOME_SUBTITLES = [
  'Where the trees bleed in autumn and never heal',
  'A kingdom burned, and the ash never settled',
  'The drowned still keep their lanterns lit',
  'Black glass teeth of a sleeping mountain',
  'The moon remembers this place fondly',
];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Generator {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.n = [];
    for (let i = 0; i < 10; i++) this.n.push(new Simplex(this.seed + i * 1013));
    this.hCache = new Map();
  }

  climate(x, z) {
    const n = this.n;
    const temp = n[0].fbm2(x / 520, z / 520, 3);
    const wet = n[1].fbm2(x / 430 + 500, z / 430 - 300, 3);
    const mount = n[2].fbm2(x / 650 - 900, z / 650 + 400, 3);
    const glade = n[3].fbm2(x / 260 + 77, z / 260 + 33, 2);
    return { temp, wet, mount, glade };
  }

  biomeAt(x, z) {
    const c = this.climate(x, z);
    if (c.mount > 0.3) return BIOME.SPIRES;
    if (c.temp > 0.22) return BIOME.ASHEN;
    if (c.wet > 0.2) return BIOME.MARSH;
    if (c.glade > 0.36) return BIOME.GLADE;
    return BIOME.FOREST;
  }

  height(x, z) {
    const key = x * 100003 + z;
    const cached = this.hCache.get(key);
    if (cached !== undefined) return cached;
    const n = this.n;
    const c = this.climate(x, z);
    let h = 37 + n[4].fbm2(x / 220, z / 220, 4) * 12 + n[5].fbm2(x / 50, z / 50, 3) * 3.5;
    const mf = smooth(0.14, 0.45, c.mount);
    if (mf > 0) {
      const r = n[6].ridged2(x / 95, z / 95, 4);
      h += mf * (r * r * 52 + 5);
    }
    const af = smooth(0.1, 0.32, c.temp) * (1 - mf);
    h += af * (Math.abs(n[7].noise2(x / 36, z / 36)) * 6 - 1.5);
    const wf = smooth(0.08, 0.3, c.wet) * (1 - smooth(0.1, 0.25, c.temp)) * (1 - mf);
    h = h + (SEA - 0.5 + n[8].fbm2(x / 38, z / 38, 2) * 3.2 - h) * wf;
    const out = Math.max(3, Math.min(CH - 8, Math.floor(h)));
    if (this.hCache.size > 200000) this.hCache.clear();
    this.hCache.set(key, out);
    return out;
  }

  generate(chunk) {
    const { cx, cz, blocks } = chunk;
    const x0 = cx * CS, z0 = cz * CS;
    const idx = (x, y, z) => (y * CS + z) * CS + x;
    const n = this.n, seed = this.seed;

    // Heights and biomes for the chunk plus a margin (for trees crossing borders)
    const M = 5, W = CS + M * 2;
    const H = new Int16Array(W * W), BI = new Uint8Array(W * W);
    for (let dz = 0; dz < W; dz++) for (let dx = 0; dx < W; dx++) {
      const wx = x0 + dx - M, wz = z0 + dz - M;
      H[dz * W + dx] = this.height(wx, wz);
      BI[dz * W + dx] = this.biomeAt(wx, wz);
    }
    const hAt = (lx, lz) => H[(lz + M) * W + lx + M];
    const bAt = (lx, lz) => BI[(lz + M) * W + lx + M];

    // Coarse cave noise grid (every 4 blocks), trilinearly interpolated
    const GX = CS / 4 + 1, GY = CH / 4 + 1;
    const cave = new Float32Array(GX * GX * GY);
    for (let gy = 0; gy < GY; gy++) for (let gz = 0; gz < GX; gz++) for (let gx = 0; gx < GX; gx++) {
      const wx = x0 + gx * 4, wy = gy * 4, wz = z0 + gz * 4;
      const a = n[0].noise3(wx / 42, wy / 26, wz / 42);
      const b = n[1].noise3(wx / 42 + 100, wy / 26, wz / 42);
      let v = a * a + b * b; // spaghetti tunnels where both near 0
      const cav = n[2].noise3(wx / 70, wy / 36, wz / 70);
      if (wy < 28 && cav > 0.55) v = Math.min(v, 0.0);
      cave[(gy * GX + gz) * GX + gx] = v;
    }
    const caveAt = (x, y, z) => {
      const fx = x / 4, fy = y / 4, fz = z / 4;
      const ix = Math.min(GX - 2, fx | 0), iy = Math.min(GY - 2, fy | 0), iz = Math.min(GX - 2, fz | 0);
      const tx = fx - ix, ty = fy - iy, tz = fz - iz;
      const g = (a, b, c) => cave[((iy + b) * GX + iz + c) * GX + ix + a];
      const c00 = g(0, 0, 0) * (1 - tx) + g(1, 0, 0) * tx, c10 = g(0, 1, 0) * (1 - tx) + g(1, 1, 0) * tx;
      const c01 = g(0, 0, 1) * (1 - tx) + g(1, 0, 1) * tx, c11 = g(0, 1, 1) * (1 - tx) + g(1, 1, 1) * tx;
      return (c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz;
    };

    // Terrain columns
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = x0 + x, wz = z0 + z;
      const h = hAt(x, z), bio = bAt(x, z);
      const fillerDepth = 3 + ((hash2(wx, wz, seed) * 2) | 0);
      for (let y = 0; y < CH; y++) {
        let id = B.AIR;
        if (y === 0 || (y === 1 && hash3(wx, y, wz, seed) < 0.6)) id = B.ABYSSAL;
        else if (y <= h) {
          const depth = h - y;
          if (depth === 0) {
            if (h < SEA) id = bio === BIOME.MARSH ? B.BOG_MUD : (hash2(wx, wz, seed + 5) < 0.5 ? B.GRAVEL : B.GRAVEDIRT);
            else if (bio === BIOME.FOREST) id = B.BLIGHTGRASS;
            else if (bio === BIOME.ASHEN) id = B.ASH;
            else if (bio === BIOME.MARSH) id = h <= SEA ? B.BOG_MUD : B.BLIGHTGRASS;
            else if (bio === BIOME.GLADE) id = B.PALEGRASS;
            else id = h > 68 ? B.PALE_FROST : B.BLACKSTONE;
          } else if (depth < fillerDepth) {
            if (bio === BIOME.ASHEN) id = depth < 2 ? B.ASH : B.BLACKSTONE;
            else if (bio === BIOME.SPIRES) id = B.BLACKSTONE;
            else if (bio === BIOME.MARSH && h <= SEA) id = B.BOG_MUD;
            else id = B.GRAVEDIRT;
          } else {
            id = y < 14 + n[3].noise2(wx / 20, wz / 20) * 4 ? B.BLACKSTONE : B.STONE;
            if (bio === BIOME.SPIRES && n[4].noise3(wx / 14, y / 7, wz / 14) > 0.45) id = B.OBSIDIAN;
          }
          // Ores
          if (id === B.STONE || id === B.BLACKSTONE) {
            if (y < 30 && n[5].noise3(wx / 5, y / 5, wz / 5) > 0.72) id = B.SOUL_CRYSTAL;
            else if (y < 22 && n[6].noise3(wx / 5 + 50, y / 5, wz / 5) > 0.74) id = B.EMBER_STONE;
            else if (y < 45 && hash3(wx, y, wz, seed + 9) < 0.004) id = B.BLOODSTONE;
            else if (hash3(wx, y, wz, seed + 13) < 0.0015) id = B.BONE;
          }
          // Carve caves
          if (y > 2 && y < h - 4 && caveAt(x, y, z) < 0.0042) id = B.AIR;
        } else if (y <= SEA) id = B.WATER;
        blocks[idx(x, y, z)] = id;
      }
    }

    // Writers restricted to this chunk
    const inChunk = (lx, y, lz) => lx >= 0 && lx < CS && lz >= 0 && lz < CS && y > 0 && y < CH;
    const soft = (id) => id === B.AIR || id === B.WATER || id === B.DEAD_GRASS || id === B.BLOODROOT || id === B.GHOSTCAP || id === B.BLOODLEAF || id === B.GLOOMLEAF || id === B.WRAITHLEAF;
    const put = (wx, y, wz, id, force = false) => {
      const lx = wx - x0, lz = wz - z0;
      if (!inChunk(lx, y, lz)) return;
      const i = idx(lx, y, lz);
      if (force || soft(blocks[i])) blocks[i] = id;
    };
    const putLeaf = (wx, y, wz, id) => {
      const lx = wx - x0, lz = wz - z0;
      if (!inChunk(lx, y, lz)) return;
      const i = idx(lx, y, lz);
      if (blocks[i] === B.AIR || blocks[i] === B.DEAD_GRASS) blocks[i] = id;
    };
    const blob = (cx, cy, cz, rx, ry, rz, id, density, s) => {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
        for (let z = Math.floor(cz - rz); z <= cz + rz; z++)
          for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
            const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
            if (d <= 1 && hash3(x, y, z, s) < density + (1 - d) * 0.4) putLeaf(x, y, z, id);
          }
    };

    // Trees
    for (let dz = -M; dz < CS + M; dz++) for (let dx = -M; dx < CS + M; dx++) {
      const wx = x0 + dx, wz = z0 + dz;
      const r = hash2(wx, wz, seed + 11);
      const bio = BI[(dz + M) * W + dx + M];
      const h = H[(dz + M) * W + dx + M];
      if (h < SEA) continue;
      const chance = [0.024, 0.005, 0.014, 0.004, 0.013][bio];
      if (r >= chance) continue;
      const r2 = hash2(wx, wz, seed + 12), r3 = hash2(wx, wz, seed + 13);
      if (bio === BIOME.FOREST) this.blightTree(wx, h, wz, r2, r3, put, blob);
      else if (bio === BIOME.ASHEN) this.charredTree(wx, h, wz, r2, r3, put);
      else if (bio === BIOME.MARSH) this.willow(wx, h, wz, r2, r3, put, putLeaf);
      else if (bio === BIOME.GLADE) this.ghostTree(wx, h, wz, r2, r3, put, blob);
      else this.spike(wx, h, wz, r2, r3, put);
    }

    // Ground cover & cave dressing (in-chunk columns only)
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = x0 + x, wz = z0 + z;
      const h = hAt(x, z), bio = bAt(x, z);
      const r = hash2(wx, wz, seed + 23);
      const top = blocks[idx(x, h, z)];
      if (h + 1 < CH && blocks[idx(x, h + 1, z)] === B.AIR && top !== B.WATER && top !== B.AIR) {
        let plant = 0;
        if (bio === BIOME.FOREST) plant = r < 0.13 ? B.DEAD_GRASS : r < 0.145 ? B.BLOODROOT : r < 0.15 ? B.GHOSTCAP : 0;
        else if (bio === BIOME.ASHEN) {
          if (r < 0.02) plant = B.DEAD_GRASS;
          else if (r < 0.026) blocks[idx(x, h, z)] = B.EMBER_STONE;
          else if (r < 0.029) plant = B.BONE;
        } else if (bio === BIOME.MARSH) plant = r < 0.16 ? B.DEAD_GRASS : r < 0.18 ? B.GHOSTCAP : r < 0.184 ? B.WITCHFIRE : 0;
        else if (bio === BIOME.GLADE) plant = r < 0.09 ? B.DEAD_GRASS : r < 0.13 ? B.GHOSTCAP : 0;
        else if (r < 0.012) plant = B.GHOSTCAP;
        if (plant) blocks[idx(x, h + 1, z)] = plant;
      }
      for (let y = 3; y < h - 5; y++) {
        const i = idx(x, y, z);
        if (blocks[i] !== B.AIR) continue;
        const below = blocks[i - CS * CS], above = blocks[i + CS * CS];
        const q = hash3(wx, y, wz, seed + 31);
        if ((below === B.STONE || below === B.BLACKSTONE) && q < 0.04) blocks[i] = q < 0.008 ? B.WITCHFIRE : B.GHOSTCAP;
        else if ((above === B.STONE || above === B.BLACKSTONE) && q > 0.988) blocks[i] = B.COBWEB;
      }
    }

    this.structures(x0, z0, put);
  }

  // ---- Trees ----
  blightTree(x, h, z, r2, r3, put, blob) {
    const H = 6 + Math.floor(r2 * 6);
    const leafy = r3 > 0.22;
    for (let y = 1; y <= H; y++) put(x, h + y, z, B.DEADWOOD, y <= 1);
    const branches = 3 + Math.floor(r3 * 3);
    for (let b = 0; b < branches; b++) {
      const a = (b / branches) * Math.PI * 2 + r2 * 6;
      const dx = Math.cos(a), dz = Math.sin(a);
      let bx = x, by = h + Math.floor(H * 0.5) + Math.floor(hash2(x + b, z, 77) * H * 0.45), bz = z;
      const len = 2 + Math.floor(hash2(x, z + b, 78) * 3);
      for (let t = 1; t <= len; t++) {
        bx = Math.round(x + dx * t); bz = Math.round(z + dz * t);
        if (t % 2 === 0) by++;
        put(bx, by, bz, B.DEADWOOD);
      }
      if (leafy) blob(bx, by + 1, bz, 2, 1.5, 2, B.BLOODLEAF, 0.35, x * 7 + b);
    }
    if (leafy) blob(x, h + H + 1, z, 2.6, 2, 2.6, B.BLOODLEAF, 0.4, x * 13 + z);
    else put(x, h + H + 1, z, B.DEADWOOD);
  }

  charredTree(x, h, z, r2, r3, put) {
    const H = 4 + Math.floor(r2 * 4);
    for (let y = 1; y <= H; y++) put(x, h + y, z, B.DEADWOOD, y <= 1);
    const branches = 2 + Math.floor(r3 * 3);
    for (let b = 0; b < branches; b++) {
      const a = (b / branches) * Math.PI * 2 + r3 * 5;
      let by = h + H - 1 - b;
      for (let t = 1; t <= 2 + (b % 2); t++) { if (t === 2) by++; put(Math.round(x + Math.cos(a) * t), by, Math.round(z + Math.sin(a) * t), B.DEADWOOD); }
    }
  }

  willow(x, h, z, r2, r3, put, putLeaf) {
    const H = 5 + Math.floor(r2 * 3);
    const lean = r3 < 0.5 ? 1 : -1;
    let tx = x;
    for (let y = 1; y <= H; y++) { if (y === Math.floor(H * 0.6)) tx += lean; put(tx, h + y, z, B.DEADWOOD, y <= 1); }
    const cy = h + H;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 3.3) continue;
      const q = hash2(tx + dx, z + dz, 91);
      putLeaf(tx + dx, cy + 1, z + dz, B.GLOOMLEAF);
      if (d < 2) putLeaf(tx + dx, cy + 2, z + dz, B.GLOOMLEAF);
      if (d > 1.8 && q < 0.45) {
        const len = 1 + Math.floor(q * 9);
        for (let t = 0; t <= len; t++) putLeaf(tx + dx, cy - t, z + dz, B.GLOOMLEAF);
      }
    }
  }

  ghostTree(x, h, z, r2, r3, put, blob) {
    const H = 6 + Math.floor(r2 * 4);
    for (let y = 1; y <= H; y++) put(x, h + y, z, B.GHOSTWOOD, y <= 1);
    for (let b = 0; b < 3; b++) {
      const a = b * 2.1 + r3 * 4;
      put(Math.round(x + Math.cos(a)), h + H - 1 - b, Math.round(z + Math.sin(a)), B.GHOSTWOOD);
    }
    blob(x, h + H + 1, z, 3, 2.4, 3, B.WRAITHLEAF, 0.45, x * 31 + z);
  }

  spike(x, h, z, r2, r3, put) {
    if (r3 < 0.4) {
      const H = 2 + Math.floor(r2 * 4);
      for (let y = 1; y <= H; y++) put(x, h + y, z, B.SOUL_CRYSTAL, true);
    } else {
      const H = 6 + Math.floor(r2 * 10);
      for (let y = 1; y <= H; y++) {
        const r = y < H * 0.35 ? 1 : 0;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dz) <= r) put(x + dx, h + y, z + dz, B.OBSIDIAN, true);
      }
    }
  }

  // ---- Ruins ----
  structures(x0, z0, put) {
    const R = 80, seed = this.seed;
    const minRx = Math.floor((x0 - 24) / R), maxRx = Math.floor((x0 + CS + 24) / R);
    const minRz = Math.floor((z0 - 24) / R), maxRz = Math.floor((z0 + CS + 24) / R);
    for (let rz = minRz; rz <= maxRz; rz++) for (let rx = minRx; rx <= maxRx; rx++) {
      const s = this.structureIn(rx, rz);
      if (!s) continue;
      const { x, z, type, h, rot } = s;
      if (x + 22 < x0 || x - 22 > x0 + CS || z + 22 < z0 || z - 22 > z0 + CS) continue;
      const rng = (a, b = 0) => hash3(a, b, rx * 31 + rz, seed + 404);
      if (type === 'chapel') this.chapel(x, h, z, rot, put, rng);
      else if (type === 'shrine') this.shrine(x, h, z, put, rng);
      else if (type === 'graveyard') this.graveyard(x, z, put, rng);
      else if (type === 'obelisk') this.obelisk(x, h, z, put, rng);
      else if (type === 'ribcage') this.ribcage(x, h, z, rot, put);
    }
  }

  structureIn(rx, rz) {
    const R = 80, seed = this.seed;
    if (hash2(rx, rz, seed + 400) > 0.55) return null;
    const x = rx * R + 12 + Math.floor(hash2(rx, rz, seed + 401) * (R - 24));
    const z = rz * R + 12 + Math.floor(hash2(rx, rz, seed + 402) * (R - 24));
    const h = this.height(x, z);
    if (h < SEA + 1) return null;
    const bio = this.biomeAt(x, z);
    const t = hash2(rx, rz, seed + 403);
    const rot = t * 10 % 1 < 0.5 ? 0 : 1;
    let type;
    if (bio === BIOME.FOREST) type = t < 0.4 ? 'chapel' : t < 0.72 ? 'shrine' : 'graveyard';
    else if (bio === BIOME.ASHEN) type = t < 0.55 ? 'ribcage' : t < 0.8 ? 'obelisk' : 'chapel';
    else if (bio === BIOME.MARSH) type = t < 0.5 ? 'shrine' : 'graveyard';
    else if (bio === BIOME.SPIRES) type = 'obelisk';
    else type = t < 0.55 ? 'shrine' : t < 0.8 ? 'obelisk' : 'chapel';
    return { x, z, h, type, rot };
  }

  foundation(x, y, z, id, put) {
    const g = this.height(x, z);
    for (let yy = y - 1; yy > g - 1 && yy > 1; yy--) put(x, yy, z, id, true);
  }

  chapel(cx, y0, cz, rot, put, rng) {
    const Wd = 9, L = 15;
    const P = (i, y, k, id, force = true) => {
      const x = rot ? cx - 4 + i : cx - 7 + k, z = rot ? cz - 7 + k : cz - 4 + i;
      put(x, y, z, id, force);
    };
    const F = (i, k) => { const x = rot ? cx - 4 + i : cx - 7 + k, z = rot ? cz - 7 + k : cz - 4 + i; this.foundation(x, y0, z, B.GOTHIC_BRICK, put); };
    for (let k = -1; k <= L; k++) for (let i = -1; i <= Wd; i++) {
      F(i, k);
      const edge = i < 0 || i >= Wd || k < 0 || k >= L;
      P(i, y0, k, i === 4 && k > 0 && k < L - 3 ? B.VELVET : (rng(i, k) < 0.35 ? B.MOSSY_BRICK : B.GOTHIC_BRICK));
      for (let y = 1; y <= 12; y++) P(i, y0 + y, k, B.AIR);
      if (edge && (i === -1 || i === Wd) && k % 4 === 0) for (let y = 1; y <= 6 - (rng(i, k + 50) * 3 | 0); y++) P(i, y0 + y, k, B.MOSSY_BRICK);
    }
    for (let k = 0; k < L; k++) for (let i = 0; i < Wd; i++) {
      const wall = i === 0 || i === Wd - 1 || k === 0 || k === L - 1;
      if (!wall) continue;
      const decay = Math.floor(rng(i * 3, k * 7) * 5) + (k < 4 ? 2 : 0);
      const top = 9 - decay;
      for (let y = 1; y <= top; y++) {
        if (k === 0 && i >= 3 && i <= 5 && y <= 4) continue; // doorway
        if (k === 0 && i === 4 && y === 5) continue;
        const window = (i === 0 || i === Wd - 1) && k % 3 === 1 && y >= 3 && y <= 6;
        const rose = k === L - 1 && i >= 3 && i <= 5 && y >= 4 && y <= 7 && !(y === 7 && i !== 4);
        P(i, y0 + y, k, window || rose ? B.STAINED_GLASS : (rng(i + y, k) < 0.3 ? B.MOSSY_BRICK : B.GOTHIC_BRICK));
      }
      if (top > 6 && rng(i, k + 9) < 0.15) P(i, y0 + top + 1, k, B.COBWEB);
    }
    // Pews
    for (let k = 3; k < L - 5; k += 2) for (const i of [1, 2, 3, 5, 6, 7]) if (rng(i, k + 99) > 0.2) P(i, y0 + 1, k, B.PLANKS);
    // Altar
    for (const i of [3, 4, 5]) P(i, y0 + 1, L - 3, B.BLACKSTONE);
    P(4, y0 + 2, L - 3, B.GOLD);
    P(3, y0 + 2, L - 3, B.CANDLES); P(5, y0 + 2, L - 3, B.CANDLES);
    P(4, y0 + 1, L - 2, B.RUNE_STONE); P(4, y0 + 2, L - 2, B.RUNE_STONE);
    P(1, y0 + 1, L - 2, B.SOUL_LANTERN); P(Wd - 2, y0 + 1, L - 2, B.SOUL_LANTERN);
    P(1, y0 + 1, 1, B.SOUL_LANTERN); P(Wd - 2, y0 + 1, 1, B.CANDLES);
    P(1, y0 + 1, L - 3, B.TOMES); P(Wd - 2, y0 + 1, L - 3, B.TOMES);
    P(2, y0 + 1, L - 2, B.SKULL_PILE);
    for (const k of [4, 8]) { P(1, y0 + 5, k, B.CHAINS); P(1, y0 + 4, k, B.CHAINS); P(Wd - 2, y0 + 5, k + 1, B.CHAINS); }
  }

  shrine(cx, y0, cz, put, rng) {
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      this.foundation(cx + dx, y0, cz + dz, B.BLACKSTONE, put);
      put(cx + dx, y0, cz + dz, rng(dx, dz) < 0.4 ? B.MOSSY_BRICK : B.GOTHIC_BRICK, true);
      for (let y = 1; y < 8; y++) put(cx + dx, y0 + y, cz + dz, B.AIR, true);
    }
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      const hgt = 2 + Math.floor(rng(dx + 7, dz) * 4);
      for (let y = 1; y <= hgt; y++) put(cx + dx, y0 + y, cz + dz, rng(dx, y + dz) < 0.3 ? B.MOSSY_BRICK : B.GOTHIC_BRICK, true);
      if (hgt >= 4) put(cx + dx, y0 + hgt + 1, cz + dz, B.SOUL_LANTERN, true);
      else put(cx + dx, y0 + hgt + 1, cz + dz, B.CANDLES, true);
    }
    put(cx, y0 + 1, cz, B.RUNE_STONE, true);
    put(cx, y0 + 2, cz, B.RUNE_STONE, true);
    put(cx, y0 + 3, cz, B.SOUL_CRYSTAL, true);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(cx + dx, y0 + 1, cz + dz, B.CANDLES, true);
    put(cx + 2, y0 + 1, cz - 2, B.SKULL_PILE, true);
    put(cx - 2, y0 + 1, cz + 2, B.BLOODROOT, true);
  }

  graveyard(cx, cz, put, rng) {
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
      const x = cx + dx, z = cz + dz, g = this.height(x, z);
      const border = Math.abs(dx) === 6 || Math.abs(dz) === 6;
      for (let y = 1; y < 4; y++) put(x, g + y, z, B.AIR, true);
      if (border) {
        if (rng(dx, dz) < 0.75) put(x, g + 1, z, rng(dx, dz + 3) < 0.4 ? B.MOSSY_BRICK : B.GOTHIC_BRICK, true);
        if (Math.abs(dx) === 6 && Math.abs(dz) === 6) { put(x, g + 2, z, B.BLACKSTONE, true); put(x, g + 3, z, B.SOUL_LANTERN, true); }
      } else if (dx % 3 === 0 && dz % 2 === 0 && dx !== 0) {
        const q = rng(dx + 20, dz);
        if (q < 0.8) {
          put(x, g + 1, z, q < 0.3 ? B.MOSSY_BRICK : B.GOTHIC_BRICK, true);
          if (q < 0.55) put(x, g + 2, z, B.GOTHIC_BRICK, true);
          put(x, g, z + 1, B.GRAVEDIRT, true);
          if (q < 0.25) put(x, g + 1, z + 1, B.CANDLES, true);
          else if (q < 0.4) put(x, g + 1, z + 1, B.BLOODROOT, true);
        }
      } else if (dx === 0 && dz !== 0) put(x, g, z, B.GRAVEL, true);
    }
    const g = this.height(cx, cz - 4);
    put(cx, g + 1, cz - 4, B.SKULL_PILE, true);
    put(cx, g + 2, cz - 4, B.CANDLES, true);
  }

  obelisk(cx, y0, cz, put, rng) {
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      this.foundation(cx + dx, y0, cz + dz, B.BLACKSTONE, put);
      put(cx + dx, y0, cz + dz, B.BLACKSTONE, true);
      for (let y = 1; y < 3; y++) put(cx + dx, y0 + y, cz + dz, B.AIR, true);
    }
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (let y = 1; y <= 2; y++) put(cx + dx, y0 + y, cz + dz, B.BLACKSTONE, true);
    const H = 10 + Math.floor(rng(1) * 6);
    for (let y = 3; y < 3 + H; y++) put(cx, y0 + y, cz, (y - 3) % 4 === 1 ? B.RUNE_STONE : B.OBSIDIAN, true);
    put(cx, y0 + 3 + H, cz, B.SOUL_CRYSTAL, true);
    for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) put(cx + dx, y0 + 1, cz + dz, B.CANDLES, true);
    for (const [dx, dz] of [[2, 2], [-2, -2]]) put(cx + dx, y0 + 1, cz + dz, B.SKULL_PILE, true);
    put(cx - 2, y0 + 1, cz + 2, B.BLOODSTONE, true);
  }

  ribcage(cx, y0, cz, rot, put) {
    const P = (a, y, b, id) => rot ? put(cx + b, y, cz + a, id, true) : put(cx + a, y, cz + b, id, true);
    const base = y0 - 1;
    for (let a = -9; a <= 9; a++) {
      const R = 5.5 - Math.abs(a) * 0.28;
      if (R < 1.5) continue;
      const topY = Math.round(base + R * 1.2);
      P(a, topY, 0, B.BONE);
      if ((a + 9) % 2 === 0) {
        for (let t = 0; t <= 24; t++) {
          const ang = (t / 24) * Math.PI;
          P(a, Math.round(base + Math.sin(ang) * R * 1.2), Math.round(Math.cos(ang) * R), B.BONE);
        }
      }
    }
    // The skull
    const sx = 11;
    for (let y = 0; y < 4; y++) for (let b = -2; b <= 2; b++) for (let a = sx; a < sx + 5; a++) {
      const shell = y === 0 || y === 3 || Math.abs(b) === 2 || a === sx || a === sx + 4;
      P(a, base + y, b, shell ? B.BONE : B.AIR);
    }
    P(sx + 4, base + 2, -1, B.AIR); P(sx + 4, base + 2, 1, B.AIR);
    P(sx + 3, base + 1, 0, B.SOUL_CRYSTAL);
    P(sx - 1, base + 1, 3, B.CANDLES);
  }

  // Deterministic world spawn: nearest dry land near the origin, preferring a forest
  findSpawn() {
    let best = null;
    for (let r = 0; r < 400; r += 8) {
      for (let a = 0; a < 16; a++) {
        const x = Math.round(Math.cos(a / 16 * Math.PI * 2) * r), z = Math.round(Math.sin(a / 16 * Math.PI * 2) * r);
        const h = this.height(x, z);
        if (h <= SEA + 1 || h > 60) continue;
        const b = this.biomeAt(x, z);
        if (b === BIOME.FOREST || b === BIOME.GLADE) return { x: x + 0.5, y: h + 1, z: z + 0.5 };
        if (!best) best = { x: x + 0.5, y: h + 1, z: z + 0.5 };
      }
    }
    return best || { x: 0.5, y: this.height(0, 0) + 1, z: 0.5 };
  }
}
