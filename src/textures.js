// Procedural 16x16 pixel-art textures, packed into one atlas, plus isometric inventory icons.
import { mulberry32 } from './noise.js';
import { BLOCKS } from './blocks.js';

const T = 16;
const COLS = 16;

function painter(seed) {
  const data = new Uint8ClampedArray(T * T * 4);
  const rng = mulberry32(seed);
  const P = {
    data, rng,
    set(x, y, c, a = 255) {
      if (x < 0 || y < 0 || x >= T || y >= T) return;
      const i = ((y | 0) * T + (x | 0)) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = c[3] !== undefined ? c[3] : a;
    },
    get(x, y) { const i = (y * T + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; },
    j(c, amt = 0.2) { const f = 1 + (rng() - 0.5) * amt; return [c[0] * f, c[1] * f, c[2] * f]; },
    fill(c, amt = 0.2) { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) P.set(x, y, P.j(c, amt)); },
    specks(c, chance, amt = 0.2) { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (rng() < chance) P.set(x, y, P.j(c, amt)); },
    walk(c, steps, x = rng() * T, y = rng() * T, amt = 0.15) {
      for (let s = 0; s < steps; s++) {
        P.set(x, y, P.j(c, amt));
        x = (x + T + Math.round((rng() - 0.5) * 2.2)) % T; y = (y + T + Math.round((rng() - 0.5) * 2.2)) % T;
      }
    },
    clear() { data.fill(0); },
    blend(x, y, c, t) { const o = P.get(x, y); P.set(x, y, [o[0] + (c[0] - o[0]) * t, o[1] + (c[1] - o[1]) * t, o[2] + (c[2] - o[2]) * t]); },
  };
  return P;
}

// Smooth value noise on the tile for blobs/patches
function blobField(rng, scale = 4) {
  const g = [];
  const n = Math.ceil(T / scale) + 1;
  for (let i = 0; i < n * n; i++) g.push(rng());
  return (x, y) => {
    const fx = x / scale, fy = y / scale; const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const a = g[iy * n + ix], b = g[iy * n + ix + 1], c = g[(iy + 1) * n + ix], d = g[(iy + 1) * n + ix + 1];
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

const dirt = (P) => {
  P.fill([58, 44, 40], 0.3);
  P.specks([36, 27, 25], 0.12);
  P.specks([92, 82, 76], 0.03);
  P.specks([176, 166, 146], 0.008);
};
const grassSide = (P, top, dark, drip) => {
  dirt(P);
  for (let x = 0; x < T; x++) {
    const d = 2 + Math.floor(P.rng() * drip);
    for (let y = 0; y < d; y++) P.set(x, y, P.j(P.rng() < 0.3 ? dark : top, 0.25));
  }
};
const planks = (P, base, seam) => {
  for (let y = 0; y < T; y++) {
    const row = Math.floor(y / 4);
    const rowShade = 0.85 + ((row * 7919) % 5) * 0.06;
    for (let x = 0; x < T; x++) {
      const grain = 0.9 + 0.12 * Math.sin((x + row * 5) * 1.3 + P.rng());
      const c = [base[0] * rowShade * grain, base[1] * rowShade * grain, base[2] * rowShade * grain];
      P.set(x, y, P.j(c, 0.08));
    }
  }
  for (let y = 3; y < T; y += 4) for (let x = 0; x < T; x++) P.set(x, y, P.j(seam, 0.1));
  for (let r = 0; r < 4; r++) { const x = (r * 5 + 3) % T; for (let y = r * 4; y < r * 4 + 3; y++) P.set(x, y, seam); }
};
const bricks = (P, brick, mortar) => {
  for (let y = 0; y < T; y++) {
    const row = Math.floor(y / 4);
    for (let x = 0; x < T; x++) {
      const bx = Math.floor((x + (row % 2) * 4) / 8);
      const shade = 0.8 + ((bx * 31 + row * 17) % 7) * 0.05;
      let c = [brick[0] * shade, brick[1] * shade, brick[2] * shade];
      if (y % 4 === 0) c = [c[0] * 1.15, c[1] * 1.15, c[2] * 1.15];
      P.set(x, y, P.j(c, 0.12));
    }
  }
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const row = Math.floor(y / 4);
    if (y % 4 === 3 || (x + (row % 2) * 4) % 8 === 7) P.set(x, y, P.j(mortar, 0.1));
  }
};
const leaves = (P, base, dark, hi, holes) => {
  P.clear();
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const r = P.rng();
    if (r < holes) continue;
    const c = r < holes + 0.2 ? dark : r > 0.93 ? hi : base;
    P.set(x, y, P.j(c, 0.25));
  }
};
const logSide = (P, base, groove, knot) => {
  const cols = [];
  for (let x = 0; x < T; x++) cols.push(0.8 + P.rng() * 0.35);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const f = cols[x];
    P.set(x, y, P.j([base[0] * f, base[1] * f, base[2] * f], 0.12));
  }
  for (let g = 0; g < 4; g++) {
    let x = Math.floor(P.rng() * T);
    for (let y = 0; y < T; y++) { P.set(x, y, P.j(groove, 0.1)); if (P.rng() < 0.2) x = (x + (P.rng() < 0.5 ? 1 : T - 1)) % T; }
  }
  const kx = 3 + Math.floor(P.rng() * 10), ky = 3 + Math.floor(P.rng() * 10);
  P.set(kx, ky, knot); P.set(kx + 1, ky, knot); P.set(kx, ky + 1, knot); P.set(kx + 1, ky + 1, groove);
};
const logTop = (P, a, b, bark) => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const c = d > 6.5 ? bark : (Math.floor(d) % 2 ? a : b);
    P.set(x, y, P.j(c, 0.1));
  }
};
const cross = (P, fn) => { P.clear(); fn(); };

const TEXTURES = {
  gravedirt: dirt,
  blightgrass_top: (P) => {
    P.fill([52, 60, 44], 0.35);
    P.specks([32, 38, 28], 0.2);
    P.specks([74, 84, 58], 0.06);
    P.specks([128, 20, 26], 0.025);
  },
  blightgrass_side: (P) => grassSide(P, [52, 60, 44], [34, 40, 30], 3),
  palegrass_top: (P) => {
    P.fill([148, 158, 170], 0.18);
    P.specks([108, 118, 134], 0.2);
    P.specks([196, 206, 220], 0.05);
  },
  palegrass_side: (P) => grassSide(P, [148, 158, 170], [108, 118, 134], 3),
  stone: (P) => {
    const f = blobField(P.rng, 5);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = 0.8 + f(x, y) * 0.35;
      P.set(x, y, P.j([78 * v, 78 * v, 86 * v], 0.12));
    }
    P.walk([44, 44, 50], 12); P.walk([44, 44, 50], 9);
    P.specks([104, 104, 112], 0.03);
  },
  blackstone: (P) => {
    P.fill([36, 32, 38], 0.25);
    P.specks([24, 21, 27], 0.2);
    P.specks([62, 52, 70], 0.04);
    P.walk([18, 16, 20], 10);
  },
  ash: (P) => {
    P.fill([118, 114, 110], 0.18);
    P.specks([88, 84, 82], 0.15);
    P.specks([146, 142, 138], 0.08);
    P.specks([210, 96, 40], 0.012);
  },
  deadwood: (P) => logSide(P, [36, 29, 29], [16, 12, 13], [60, 44, 40]),
  deadwood_top: (P) => logTop(P, [62, 49, 43], [46, 35, 31], [26, 20, 20]),
  ghostwood: (P) => logSide(P, [196, 192, 186], [140, 136, 134], [70, 64, 64]),
  ghostwood_top: (P) => logTop(P, [214, 208, 198], [186, 180, 172], [150, 146, 142]),
  bloodleaf: (P) => leaves(P, [128, 18, 28], [72, 10, 18], [190, 44, 44], 0.3),
  gloomleaf: (P) => leaves(P, [40, 64, 52], [24, 40, 34], [74, 100, 72], 0.3),
  wraithleaf: (P) => leaves(P, [84, 164, 200], [40, 90, 124], [170, 236, 255], 0.35),
  planks: (P) => planks(P, [66, 50, 44], [26, 18, 16]),
  pale_planks: (P) => planks(P, [184, 176, 166], [110, 102, 96]),
  gothic_brick: (P) => bricks(P, [66, 64, 74], [28, 26, 32]),
  mossy_brick: (P) => {
    bricks(P, [66, 64, 74], [28, 26, 32]);
    const f = blobField(P.rng, 4);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (f(x, y) > 0.55) P.set(x, y, P.j([46, 70, 42], 0.3));
  },
  obsidian: (P) => {
    P.fill([20, 14, 28], 0.3);
    P.walk([64, 36, 104], 14); P.walk([52, 30, 88], 10);
    P.specks([150, 100, 210], 0.02);
  },
  bone: (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const ridge = (x % 5 === 0) ? 0.78 : 1;
      P.set(x, y, P.j([206 * ridge, 196 * ridge, 170 * ridge], 0.08));
    }
    P.specks([160, 150, 128], 0.05);
  },
  bone_top: (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const c = d < 2.5 ? [120, 100, 84] : d < 4 ? [176, 164, 140] : [206, 196, 170];
      P.set(x, y, P.j(c, 0.08));
    }
  },
  soul_crystal: (P) => {
    P.fill([28, 24, 36], 0.25);
    const cols = [[150, 220, 255], [120, 130, 255], [200, 160, 255]];
    for (let k = 0; k < 5; k++) {
      const cx = P.rng() * T, cy = P.rng() * T, len = 3 + P.rng() * 5, c = cols[k % 3];
      for (let t = 0; t < len; t++) {
        const x = Math.round(cx + t * 0.6), y = Math.round(cy - t);
        P.set(x, y, P.j(c, 0.1)); P.set(x + 1, y, P.j([c[0] * 0.7, c[1] * 0.7, c[2] * 0.8], 0.1));
        if (t === 0) P.set(x - 1, y, [c[0] * 0.5, c[1] * 0.5, c[2] * 0.7]);
      }
    }
    P.specks([230, 250, 255], 0.02, 0);
  },
  ember_stone: (P) => {
    P.fill([40, 20, 16], 0.3);
    P.walk([255, 140, 40], 18); P.walk([255, 110, 30], 14); P.walk([255, 200, 90], 6);
  },
  bloodstone: (P) => {
    P.fill([58, 20, 22], 0.25);
    P.specks([36, 12, 14], 0.15);
    P.walk([200, 30, 44], 14, undefined, undefined, 0.2); P.walk([160, 22, 34], 10);
  },
  rune_stone: (P) => {
    P.fill([34, 30, 38], 0.2);
    for (let i = 0; i < T; i++) { P.set(i, 0, [18, 16, 20]); P.set(i, 15, [18, 16, 20]); P.set(0, i, [18, 16, 20]); P.set(15, i, [18, 16, 20]); }
    const glyph = [110, 230, 255];
    const x0 = 7;
    for (let y = 3; y <= 12; y++) P.set(x0, y, glyph);
    const branches = 2 + Math.floor(P.rng() * 3);
    for (let b = 0; b < branches; b++) {
      const y = 3 + Math.floor(P.rng() * 8), dir = P.rng() < 0.5 ? -1 : 1, dy = P.rng() < 0.5 ? -1 : 1;
      for (let t = 1; t <= 3; t++) P.set(x0 + t * dir, y + t * dy, glyph);
    }
    P.set(4, 4, [200, 250, 255]); P.set(11, 11, [200, 250, 255]);
  },
  soul_lantern: (P) => {
    P.clear();
    const iron = [34, 32, 40];
    for (let y = 2; y < 15; y++) for (let x = 3; x < 13; x++) {
      const edge = x === 3 || x === 12 || y === 2 || y === 14 || y === 3;
      if (edge) P.set(x, y, P.j(iron, 0.2));
      else {
        const d = Math.hypot(x - 7.5, (y - 9) * 0.8);
        const c = d < 1.6 ? [230, 252, 255] : d < 3 ? [120, 220, 255] : [40, 90, 120];
        P.set(x, y, c, d < 3 ? 255 : 170);
      }
    }
    for (let x = 6; x < 10; x++) P.set(x, 1, iron);
    P.set(7, 0, iron); P.set(8, 0, iron);
  },
  candles: (P) => cross(P, () => {
    const wax = [218, 206, 176];
    const cs = [[4, 7], [8, 4], [11, 9]];
    for (const [cx, top] of cs) {
      for (let y = top; y < 16; y++) { P.set(cx, y, P.j(wax, 0.08)); P.set(cx + 1, y, P.j([190, 178, 148], 0.08)); }
      P.set(cx, top + 1, [240, 232, 210]);
      P.set(cx, top - 1, [255, 190, 70]); P.set(cx, top - 2, [255, 236, 170]); P.set(cx + 1, top - 1, [255, 150, 50]); P.set(cx, top - 3, [255, 160, 60]);
    }
  }),
  water: (P) => {
    P.fill([20, 28, 38], 0.15);
    for (let k = 0; k < 6; k++) { const y = Math.floor(P.rng() * T), x = Math.floor(P.rng() * 12); for (let t = 0; t < 4; t++) P.set(x + t, y, [36, 52, 66]); }
  },
  bog_mud: (P) => {
    P.fill([44, 40, 30], 0.25);
    P.specks([28, 26, 20], 0.18);
    P.specks([56, 62, 36], 0.08);
  },
  pale_frost: (P) => {
    P.fill([204, 208, 220], 0.08);
    P.specks([180, 188, 210], 0.15);
    P.specks([236, 240, 250], 0.06);
  },
  stained_glass: (P) => {
    const lead = [14, 12, 16, 255];
    const panes = [[168, 20, 44], [96, 30, 128], [200, 150, 50], [150, 16, 36]];
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const u = x - 7.5, v = y - 7.5;
      const onLead = x === 0 || y === 0 || x === 15 || y === 15 || Math.abs(Math.abs(u) - Math.abs(v)) < 0.6 || (Math.abs(u) + Math.abs(v) > 6.5 && Math.abs(u) + Math.abs(v) < 7.5);
      if (onLead) { P.set(x, y, lead); continue; }
      const idx = (Math.abs(u) > Math.abs(v) ? 0 : 1) + (Math.abs(u) + Math.abs(v) > 7 ? 2 : 0);
      const c = P.j(panes[idx], 0.2);
      P.set(x, y, [c[0], c[1], c[2], 190]);
    }
  },
  dead_grass: (P) => cross(P, () => {
    for (let b = 0; b < 7; b++) {
      let x = 1 + Math.floor(P.rng() * 14); const h = 5 + Math.floor(P.rng() * 9);
      for (let t = 0; t < h; t++) { P.set(x, 15 - t, P.j([136, 118, 82], 0.25)); if (P.rng() < 0.25) x += P.rng() < 0.5 ? -1 : 1; }
    }
  }),
  bloodroot: (P) => cross(P, () => {
    for (let y = 7; y < 16; y++) P.set(7 + (y % 3 === 0 ? 1 : 0), y, [40, 52, 32]);
    P.set(6, 11, [48, 62, 36]); P.set(5, 10, [48, 62, 36]); P.set(9, 12, [48, 62, 36]); P.set(10, 11, [48, 62, 36]);
    for (let y = 2; y < 8; y++) for (let x = 4; x < 12; x++) {
      const d = Math.hypot(x - 7.5, y - 4.5);
      if (d < 3.2) P.set(x, y, d < 1.2 ? [255, 130, 90] : P.j([196, 20, 40], 0.2));
    }
  }),
  ghostcap: (P) => cross(P, () => {
    const caps = [[5, 8, 3], [10, 5, 2.5], [9, 11, 2]];
    for (const [cx, cy, r] of caps) {
      for (let y = cy; y < 16; y++) P.set(cx, y, [180, 192, 192]);
      for (let y = cy - r; y <= cy; y++) for (let x = cx - r; x <= cx + r; x++) {
        if (Math.hypot(x - cx, (y - cy) * 1.4) <= r + 0.3) P.set(x, y, P.rng() < 0.15 ? [220, 255, 250] : P.j([60, 220, 200], 0.2));
      }
    }
  }),
  witchfire: (P) => cross(P, () => {
    for (let y = 2; y < 16; y++) for (let x = 0; x < T; x++) {
      const w = (y - 1) * 0.42 * (1 - y / 22) + 0.5;
      const d = Math.abs(x - 7.5 - Math.sin(y * 0.9) * 1.2);
      if (d < w) P.set(x, y, d < w * 0.4 && y > 6 ? [220, 255, 200] : P.j([80, 255, 120], 0.2));
    }
  }),
  abyssal: (P) => {
    P.fill([16, 14, 18], 0.3);
    P.specks([32, 28, 36], 0.12);
    P.specks([70, 12, 16], 0.015);
  },
  skull_pile: (P) => {
    P.fill([176, 166, 142], 0.12);
    const skull = (sx, sy) => {
      for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) {
        if ((y === 0 && (x === 0 || x === 5)) || (y === 4 && (x === 0 || x === 5))) continue;
        P.set(sx + x, sy + y, P.j([222, 212, 188], 0.06));
      }
      P.set(sx + 1, sy + 2, [20, 14, 14]); P.set(sx + 4, sy + 2, [20, 14, 14]);
      P.set(sx + 1, sy + 1, [40, 30, 28]); P.set(sx + 4, sy + 1, [40, 30, 28]);
      P.set(sx + 2, sy + 4, [60, 50, 44]); P.set(sx + 3, sy + 4, [60, 50, 44]);
    };
    skull(1, 1); skull(9, 3); skull(4, 9); skull(11, 10);
  },
  cobweb: (P) => cross(P, () => {
    const c = [220, 220, 230, 170];
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      for (let r = 0; r < 9; r++) P.set(7.5 + Math.cos(ang) * r, 7.5 + Math.sin(ang) * r, c);
    }
    for (const rr of [3, 5.5, 7.5]) for (let a = 0; a < 32; a++) P.set(7.5 + Math.cos(a / 5.1) * rr, 7.5 + Math.sin(a / 5.1) * rr, c);
  }),
  gravel: (P) => {
    P.fill([70, 66, 68], 0.3);
    for (let k = 0; k < 20; k++) {
      const x = Math.floor(P.rng() * 15), y = Math.floor(P.rng() * 15);
      const c = P.j(P.rng() < 0.1 ? [220, 214, 196] : [100 + P.rng() * 40, 96 + P.rng() * 40, 98 + P.rng() * 40], 0.1);
      P.set(x, y, c); P.set(x + 1, y, c); P.set(x, y + 1, [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7]);
    }
  },
  velvet: (P) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const f = 0.75 + 0.3 * Math.sin(x * 0.9 + Math.sin(y * 0.4));
      P.set(x, y, P.j([124 * f, 14 * f, 32 * f], 0.06));
    }
  },
  gold: (P) => {
    P.fill([150, 118, 50], 0.2);
    const f = blobField(P.rng, 4);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (f(x, y) > 0.62) P.set(x, y, P.j([72, 92, 64], 0.2));
    P.specks([232, 200, 110], 0.05);
    for (let i = 0; i < T; i++) { P.set(i, 0, [190, 160, 80]); P.set(0, i, [190, 160, 80]); P.set(i, 15, [90, 70, 30]); P.set(15, i, [90, 70, 30]); }
  },
  chains: (P) => cross(P, () => {
    const iron = [72, 72, 80], hi = [128, 128, 138];
    for (const cx of [4, 11]) for (let y = 0; y < 16; y += 4) {
      P.set(cx - 1, y, iron); P.set(cx - 1, y + 1, iron); P.set(cx + 1, y, iron); P.set(cx + 1, y + 1, hi);
      P.set(cx, y - 0, hi); P.set(cx, y + 2, iron); P.set(cx, y + 3, iron);
    }
  }),
  tomes: (P) => {
    planks(P, [66, 50, 44], [26, 18, 16]);
    const spines = [[92, 20, 30], [30, 40, 72], [48, 60, 30], [84, 62, 30], [60, 30, 70], [24, 22, 26]];
    for (const [y0, y1] of [[1, 7], [9, 15]]) {
      let x = 1;
      while (x < 15) {
        const w = 1 + (P.rng() < 0.4 ? 1 : 0); const c = spines[Math.floor(P.rng() * spines.length)];
        const top = y0 + (P.rng() < 0.3 ? 1 : 0);
        for (let xx = x; xx < Math.min(15, x + w); xx++) for (let y = top; y < y1; y++) P.set(xx, y, P.j(c, 0.1));
        if (P.rng() < 0.5) P.set(x, top + 2, [200, 170, 80]);
        x += w;
      }
    }
  },
};

export const TEX_INDEX = {};
export let ATLAS_W = 0, ATLAS_H = 0;
export const TILE_AVG = {}; // average color per texture name, for particles

export function buildAtlas() {
  const names = Object.keys(TEXTURES);
  const rows = Math.ceil(names.length / COLS);
  ATLAS_W = COLS * T; ATLAS_H = rows * T;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W; canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d');
  names.forEach((name, i) => {
    const P = painter(1000 + i * 7919);
    TEXTURES[name](P);
    const img = new ImageData(P.data, T, T);
    const col = i % COLS, row = Math.floor(i / COLS);
    ctx.putImageData(img, col * T, row * T);
    TEX_INDEX[name] = i;
    let r = 0, g = 0, b = 0, n = 0;
    for (let k = 0; k < P.data.length; k += 4) if (P.data[k + 3] > 100) { r += P.data[k]; g += P.data[k + 1]; b += P.data[k + 2]; n++; }
    TILE_AVG[name] = n ? [r / n / 255, g / n / 255, b / n / 255] : [0.5, 0.5, 0.5];
  });
  return canvas;
}

// UV rect for texture name: [u0, v0, u1, v1] (v flipped for WebGL, flipY=false)
export function tileUV(name) {
  const i = TEX_INDEX[name];
  const col = i % COLS, row = Math.floor(i / COLS);
  const e = 0.001;
  return [(col * T) / ATLAS_W + e, (row * T) / ATLAS_H + e, ((col + 1) * T) / ATLAS_W - e, ((row + 1) * T) / ATLAS_H - e];
}

function tileCanvas(atlas, name) {
  const i = TEX_INDEX[name];
  const c = document.createElement('canvas'); c.width = T; c.height = T;
  c.getContext('2d').drawImage(atlas, (i % COLS) * T, Math.floor(i / COLS) * T, T, T, 0, 0, T, T);
  return c;
}

export function makeIcons(atlas) {
  const icons = {};
  for (const b of BLOCKS) {
    if (!b.tex) continue;
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (b.cross) {
      ctx.drawImage(tileCanvas(atlas, b.tex.side), 8, 8, 48, 48);
    } else {
      const face = (name, m, shade) => {
        ctx.setTransform(...m);
        ctx.drawImage(tileCanvas(atlas, name), 0, 0);
        if (shade > 0) { ctx.fillStyle = `rgba(0,0,0,${shade})`; ctx.fillRect(0, 0, 16, 16); }
      };
      face(b.tex.top, [28 / 16, -14 / 16, 28 / 16, 14 / 16, 4, 16], 0);
      face(b.tex.side, [28 / 16, 14 / 16, 0, 32 / 16, 4, 16], 0.28);
      face(b.tex.side, [28 / 16, -14 / 16, 0, 32 / 16, 32, 30], 0.5);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    icons[b.id] = c.toDataURL();
  }
  return icons;
}
