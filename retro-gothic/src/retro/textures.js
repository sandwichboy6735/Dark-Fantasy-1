import * as THREE from 'three';

// Tiny hand-painted textures drawn on canvases at load time, sampled with no
// filtering and no mipmaps so they crawl and shimmer like 1990s console art.

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

function speckle(ctx, w, h, rand, alpha = 0.18) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = rand();
      if (v < 0.25) {
        ctx.fillStyle = v < 0.12 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.5})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

const painters = {
  cobble(ctx, rand) {
    ctx.fillStyle = '#16141b';
    ctx.fillRect(0, 0, 32, 32);
    const rows = [0, 8, 16, 24];
    rows.forEach((y, row) => {
      let x = row % 2 ? -5 : 0;
      while (x < 32) {
        const w = 6 + Math.floor(rand() * 5);
        const base = shade('#57535f', (rand() - 0.5) * 0.12);
        const draw = (ox) => {
          ctx.fillStyle = base;
          ctx.fillRect(x + 1 + ox, y + 1, w - 1, 6);
          ctx.fillStyle = shade(base, 0.08);
          ctx.fillRect(x + 1 + ox, y + 1, w - 2, 1);
          ctx.fillStyle = shade(base, -0.1);
          ctx.fillRect(x + 1 + ox, y + 6, w - 1, 1);
        };
        draw(0);
        if (x + w > 32) draw(-32);
        x += w;
      }
    });
    speckle(ctx, 32, 32, rand, 0.15);
  },

  castle(ctx, rand) {
    ctx.fillStyle = '#0d0c12';
    ctx.fillRect(0, 0, 32, 32);
    for (let row = 0; row < 4; row++) {
      const y = row * 8;
      for (let col = -1; col < 3; col++) {
        const x = col * 16 + (row % 2) * 8;
        const base = shade('#34323f', (rand() - 0.5) * 0.08);
        ctx.fillStyle = base;
        ctx.fillRect(x + 1, y + 1, 15, 7);
        ctx.fillStyle = shade(base, 0.05);
        ctx.fillRect(x + 1, y + 1, 15, 1);
        if (rand() < 0.2) {
          ctx.fillStyle = '#26301f';
          ctx.fillRect(x + 2 + Math.floor(rand() * 8), y + 5, 4, 3);
        }
      }
    }
    speckle(ctx, 32, 32, rand, 0.12);
  },

  rock(ctx, rand) {
    ctx.fillStyle = '#211e28';
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = shade('#2f2b38', (rand() - 0.5) * 0.12);
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 2 + Math.floor(rand() * 6), 1 + Math.floor(rand() * 3));
    }
    speckle(ctx, 32, 32, rand, 0.2);
  },

  wood(ctx, rand) {
    for (let y = 0; y < 32; y++) {
      const plank = Math.floor(y / 8);
      ctx.fillStyle = shade('#5b3a22', (plank % 2 ? 0.03 : -0.02) + (rand() - 0.5) * 0.03);
      ctx.fillRect(0, y, 32, 1);
    }
    ctx.fillStyle = '#24160c';
    for (let p = 0; p < 4; p++) ctx.fillRect(0, p * 8, 32, 1);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = 'rgba(30,16,6,0.55)';
      ctx.fillRect(Math.floor(rand() * 32), 1 + Math.floor(rand() * 31), 3 + Math.floor(rand() * 9), 1);
    }
    ctx.fillStyle = '#2b1a0d';
    ctx.fillRect(Math.floor(rand() * 28), 3 + Math.floor(rand() * 24), 2, 2);
  },

  darkwood(ctx, rand) {
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, Math.floor(rand() * 16), 4 + Math.floor(rand() * 10), 1);
    }
  },

  barrel(ctx, rand) {
    for (let x = 0; x < 32; x++) {
      const stave = Math.floor(x / 4);
      ctx.fillStyle = shade('#6a4426', (stave % 2 ? 0.035 : -0.02) + (rand() - 0.5) * 0.02);
      ctx.fillRect(x, 0, 1, 32);
    }
    ctx.fillStyle = '#2a1a0e';
    for (let s = 0; s < 8; s++) ctx.fillRect(s * 4, 0, 1, 32);
    for (const y of [4, 26]) {
      ctx.fillStyle = '#2b2b30';
      ctx.fillRect(0, y, 32, 3);
      ctx.fillStyle = '#4c4c55';
      ctx.fillRect(0, y, 32, 1);
    }
  },

  checker(ctx) {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#0a0a14' : '#2446d8';
        ctx.fillRect(x * 4, y * 4, 4, 4);
      }
    }
  },

  dirt(ctx, rand) {
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = shade('#46331f', (rand() - 0.5) * 0.12);
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 1 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 2));
    }
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = '#5c5048';
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 1, 1);
    }
    speckle(ctx, 32, 32, rand, 0.12);
  },

  plaster(ctx, rand) {
    ctx.fillStyle = '#8b7d62';
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = shade('#7a6c52', (rand() - 0.5) * 0.1);
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 2 + Math.floor(rand() * 5), 1 + Math.floor(rand() * 3));
    }
    speckle(ctx, 32, 32, rand, 0.1);
  },

  slate(ctx, rand) {
    ctx.fillStyle = '#131219';
    ctx.fillRect(0, 0, 32, 32);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 5; col++) {
        const x = col * 8 - (row % 2) * 4;
        ctx.fillStyle = shade('#2c2a36', (rand() - 0.5) * 0.08);
        ctx.fillRect(x + 1, row * 4, 7, 3);
      }
    }
  },

  tabard(ctx) {
    ctx.fillStyle = '#4a0f16';
    ctx.fillRect(0, 0, 16, 16);
    // A pale, lidded eye: the sigil of whatever watches from the clouds.
    ctx.fillStyle = '#c9c3b0';
    ctx.fillRect(4, 7, 8, 2);
    ctx.fillRect(5, 6, 6, 4);
    ctx.fillStyle = '#1b3fae';
    ctx.fillRect(7, 6, 2, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(7, 7, 2, 2);
  },

  sign(ctx) {
    ctx.fillStyle = '#3b2414';
    ctx.fillRect(0, 0, 32, 16);
    ctx.fillStyle = '#1c0f06';
    ctx.strokeStyle = '#1c0f06';
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 15, 32, 1);
    // A foaming tankard, painted in gold leaf.
    ctx.fillStyle = '#d9a93a';
    ctx.fillRect(11, 5, 8, 9);
    ctx.fillRect(19, 7, 3, 1);
    ctx.fillRect(21, 7, 1, 5);
    ctx.fillRect(19, 11, 3, 1);
    ctx.fillStyle = '#f2ead0';
    ctx.fillRect(10, 3, 10, 3);
    ctx.fillRect(12, 2, 3, 1);
    ctx.fillStyle = '#7a531b';
    ctx.fillRect(13, 7, 1, 6);
    ctx.fillRect(16, 7, 1, 6);
  },

  // Black-green fen mud with a few pale stones and roots.
  mud(ctx, rand) {
    ctx.fillStyle = '#1e2116';
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = shade('#2a2e1c', (rand() - 0.5) * 0.12);
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 1 + Math.floor(rand() * 4), 1 + Math.floor(rand() * 2));
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#3c3a2a';
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 2, 1);
    }
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = '#2f4a1e';
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 1, 2);
    }
    speckle(ctx, 32, 32, rand, 0.12);
  },

  // Still black water with pale ripple lines; scrolled slowly to make it drift.
  water(ctx, rand) {
    ctx.fillStyle = '#0d1a17';
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rand() < 0.5 ? '#1c3530' : '#12241f';
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 3 + Math.floor(rand() * 7), 1);
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#3a6458';
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 2 + Math.floor(rand() * 3), 1);
    }
  },

  // Old chapel stone, furred with moss.
  moss(ctx, rand) {
    painters.castle(ctx, rand);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rand() < 0.5 ? 'rgba(60,96,40,0.7)' : 'rgba(40,70,30,0.6)';
      const x = Math.floor(rand() * 32);
      const y = Math.floor(rand() * 32);
      ctx.fillRect(x, y, 1 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 2));
    }
  },

  // Packed snow: blue-white with faint drifts and glints.
  snow(ctx, rand) {
    ctx.fillStyle = '#b8c4d8';
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = shade('#a8b6cc', (rand() - 0.5) * 0.08);
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 3 + Math.floor(rand() * 8), 1);
    }
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 1, 1);
    }
  },

  // Blue ice with white cracks.
  ice(ctx, rand) {
    ctx.fillStyle = '#6a9ac8';
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = shade('#7aaad8', (rand() - 0.5) * 0.12);
      ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 2 + Math.floor(rand() * 6), 2 + Math.floor(rand() * 4));
    }
    ctx.fillStyle = '#e8f4ff';
    for (let c = 0; c < 4; c++) {
      let x = Math.floor(rand() * 32);
      let y = Math.floor(rand() * 32);
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(x & 31, y & 31, 1, 1);
        x += Math.floor(rand() * 3) - 1;
        y += 1;
      }
    }
  },

  // Dark pine needles in layers.
  pine(ctx, rand) {
    ctx.fillStyle = '#0e1e16';
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = rand() < 0.5 ? '#1a3424' : '#23402c';
      ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 2 + Math.floor(rand() * 3), 1);
    }
  },

  // Shaggy brown fur for the hermit's coat.
  fur(ctx, rand) {
    ctx.fillStyle = '#4a3422';
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rand() < 0.5 ? '#5e4430' : '#34241a';
      ctx.fillRect(Math.floor(rand() * 16), Math.floor(rand() * 16), 1, 2 + Math.floor(rand() * 2));
    }
  },
};

const sizes = { tabard: [16, 16], checker: [16, 16], darkwood: [16, 16], sign: [32, 16], pine: [16, 16], fur: [16, 16] };
const cache = new Map();

export function getTexture(name) {
  if (cache.has(name)) return cache.get(name);
  const [w, h] = sizes[name] ?? [32, 32];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  painters[name](ctx, rng(name.length * 977 + name.charCodeAt(0)));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  cache.set(name, texture);
  return texture;
}
