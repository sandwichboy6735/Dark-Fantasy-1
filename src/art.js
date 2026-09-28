// Hand-painted look: procedural canvas textures and the shared materials everything is built from.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

function canvasTex(size, paint, { repeat = true, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  paint(ctx, size, mulberry32(size * 7 + paint.length));
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Soft mottled grain used on terrain and plain surfaces
export const grainTex = () => canvasTex(256, (ctx, s, r) => {
  ctx.fillStyle = '#e6e6e6'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2200; i++) {
    const x = r() * s, y = r() * s, rad = 2 + r() * 10, v = 170 + r() * 85;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.08 + r() * 0.12})`;
    ctx.beginPath(); ctx.ellipse(x, y, rad, rad * (0.4 + r()), r() * 3, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 400; i++) {
    const x = r() * s, y = r() * s;
    ctx.strokeStyle = `rgba(90,90,90,${0.05 + r() * 0.08})`; ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30); ctx.stroke();
  }
});

// Irregular fieldstone masonry
export const stoneTex = () => canvasTex(512, (ctx, s, r) => {
  ctx.fillStyle = '#2c2b30'; ctx.fillRect(0, 0, s, s);
  const rowH = 38;
  for (let y = -rowH; y < s + rowH; y += rowH) {
    let x = -r() * 60;
    const hh = rowH * (0.8 + r() * 0.25);
    while (x < s) {
      const w = 40 + r() * 55, v = 150 + r() * 80, tint = (r() - 0.5) * 20;
      const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + hh);
      g.addColorStop(0, `rgb(${v + 20 + tint},${v + 18},${v + 24 - tint})`);
      g.addColorStop(1, `rgb(${v - 40 + tint},${v - 42},${v - 30 - tint})`);
      ctx.fillStyle = g;
      const rr = 8 + r() * 6;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x + 3, y + 3, w - 6, hh - 6, rr) : ctx.rect(x + 3, y + 3, w - 6, hh - 6);
      ctx.fill();
      for (let k = 0; k < 6; k++) { ctx.fillStyle = `rgba(0,0,0,${r() * 0.12})`; ctx.fillRect(x + r() * w, y + r() * hh, 3 + r() * 8, 2 + r() * 5); }
      x += w;
    }
  }
  // wrap seams
  ctx.drawImage(ctx.canvas, 0, 0, s, 4, 0, s - 4, s, 4);
});

// Overlapping roof slates
export const shingleTex = () => canvasTex(256, (ctx, s, r) => {
  ctx.fillStyle = '#1c1b22'; ctx.fillRect(0, 0, s, s);
  const rows = 16, h = s / rows;
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * 16;
    for (let x = -32 + off; x < s; x += 32) {
      const v = 120 + r() * 70;
      const g = ctx.createLinearGradient(0, j * h, 0, j * h + h);
      g.addColorStop(0, `rgb(${v * 0.55},${v * 0.55},${v * 0.65})`); g.addColorStop(1, `rgb(${v},${v},${v * 1.08})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x + 1, j * h); ctx.lineTo(x + 31, j * h); ctx.lineTo(x + 31, j * h + h - 3);
      ctx.quadraticCurveTo(x + 16, j * h + h + 3, x + 1, j * h + h - 3); ctx.closePath(); ctx.fill();
    }
  }
});

// Straw thatch
export const thatchTex = () => canvasTex(256, (ctx, s, r) => {
  ctx.fillStyle = '#6a5a44'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const x = r() * s, y = r() * s, v = 120 + r() * 120;
    ctx.strokeStyle = `rgba(${v},${v * 0.86},${v * 0.6},${0.25 + r() * 0.4})`; ctx.lineWidth = 1 + r() * 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 4, y + 10 + r() * 22); ctx.stroke();
  }
  for (let y = 0; y < s; y += 32) { ctx.fillStyle = 'rgba(30,24,18,0.35)'; ctx.fillRect(0, y + 28, s, 4); }
});

// Wood planks
export const woodTex = () => canvasTex(256, (ctx, s, r) => {
  ctx.fillStyle = '#5b4636'; ctx.fillRect(0, 0, s, s);
  for (let x = 0; x < s; x += 32) {
    const v = 150 + r() * 60;
    ctx.fillStyle = `rgb(${v * 0.62},${v * 0.48},${v * 0.36})`; ctx.fillRect(x + 1, 0, 30, s);
    for (let k = 0; k < 30; k++) { ctx.strokeStyle = `rgba(40,28,20,${r() * 0.3})`; ctx.beginPath(); const xx = x + r() * 30; ctx.moveTo(xx, 0); ctx.lineTo(xx + (r() - 0.5) * 6, s); ctx.stroke(); }
    ctx.fillStyle = 'rgba(20,14,10,0.6)'; ctx.fillRect(x, 0, 2, s);
  }
});

// Round soft sprite (for particles, smoke, clouds)
export const softTex = () => canvasTex(64, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
}, { repeat: false, srgb: false });

// Puffy cloud sprite
export const cloudTex = () => canvasTex(256, (ctx, s, r) => {
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2, d = r() * s * 0.28, x = s / 2 + Math.cos(a) * d * 1.3, y = s / 2 + Math.sin(a) * d * 0.6;
    const rad = s * (0.08 + r() * 0.14);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }
}, { repeat: false, srgb: false });

// Turn a greyscale height canvas into a tangent-space normal map
function normalFrom(srcCanvas, strength = 2) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const src = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = L[y * w + ((x - 1 + w) % w)], r = L[y * w + ((x + 1) % w)], u = L[((y - 1 + h) % h) * w + x], b = L[((y + 1) % h) * w + x];
    let nx = (l - r) * strength, ny = (u - b) * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const k = (y * w + x) * 4;
    d[k] = (nx * 0.5 + 0.5) * 255; d[k + 1] = (ny * 0.5 + 0.5) * 255; d[k + 2] = (nz * 0.5 + 0.5) * 255; d[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}

function heightCanvas(size, paint) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  let seed = size + paint.length; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, size, size);
  paint(ctx, size, r);
  return c;
}

// Warty, wrinkled skin: pores, lumps and creases
const skinHeight = () => heightCanvas(512, (ctx, s, r) => {
  for (let i = 0; i < 900; i++) {
    const x = r() * s, y = r() * s, rad = 2 + Math.pow(r(), 3) * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 260; i++) {
    let x = r() * s, y = r() * s;
    ctx.strokeStyle = `rgba(0,0,0,${0.25 + r() * 0.3})`; ctx.lineWidth = 1 + r() * 2.5;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 30; y += (r() - 0.3) * 12; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 6000; i++) { ctx.fillStyle = `rgba(0,0,0,${r() * 0.25})`; ctx.fillRect(r() * s, r() * s, 1.5, 1.5); }
});

// Crushed velvet: soft folds and bruised patches
const velvetHeight = () => heightCanvas(512, (ctx, s, r) => {
  for (let i = 0; i < 160; i++) {
    const x = r() * s, y = r() * s, rx = 20 + r() * 70, ry = 6 + r() * 20;
    ctx.save(); ctx.translate(x, y); ctx.rotate(r() * Math.PI);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    const v = r() < 0.5 ? 255 : 0;
    g.addColorStop(0, `rgba(${v},${v},${v},0.35)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = g; ctx.scale(1, ry / rx); ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.filter = 'blur(2px)'; ctx.drawImage(ctx.canvas, 0, 0); ctx.filter = 'none';
});

// Lace: woven holes and threads
export const laceTex = () => canvasTex(256, (ctx, s) => {
  ctx.fillStyle = '#e8e0cc'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#9a9080';
  for (let y = 0; y < s; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < s; x += 16) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#c8bca4'; ctx.lineWidth = 1;
  for (let i = 0; i < s; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 40, s); ctx.stroke(); }
});

// Moonlit edge light shared by characters, like the rim light in a painted portrait
export const rimColor = { value: new THREE.Color(0.35, 0.4, 0.85) };
export function addRim(mat, strength = 1) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = rimColor;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace('#include <opaque_fragment>', `float rimF = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);
        outgoingLight += uRim * pow(rimF, 3.0) * ${strength.toFixed(2)};
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'rim' + strength;
  return mat;
}

export function makeMaterials() {
  const grain = grainTex(), stone = stoneTex(), shingle = shingleTex(), thatch = thatchTex(), wood = woodTex();
  const nStone = normalFrom(stone.image, 3.5), nGrain = normalFrom(grain.image, 1.2), nWood = normalFrom(wood.image, 2.5), nRoof = normalFrom(shingle.image, 3), nThatch = normalFrom(thatch.image, 2);
  const nSkin = normalFrom(skinHeight(), 5), nVelvet = normalFrom(velvetHeight(), 3);
  const std = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.92, metalness: 0, ...extra });
  const n = (t, s) => ({ normalMap: t, normalScale: new THREE.Vector2(s, s) });
  return {
    tex: { grain, soft: softTex(), cloud: cloudTex() },
    terrain: std(grain, { roughness: 1, ...n(nGrain, 0.6) }),
    plain: std(grain, n(nGrain, 0.5)),
    stone: std(stone, n(nStone, 1.2)),
    roof: std(shingle, { roughness: 0.75, ...n(nRoof, 1) }),
    thatch: std(thatch, n(nThatch, 1)),
    wood: std(wood, n(nWood, 0.9)),
    skin: addRim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, ...n(nSkin, 1.1) }), 0.9),
    hide: addRim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, ...n(nSkin, 0.6) }), 0.6),
    cloth: addRim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, map: grain }), 0.5),
    velvet: addRim(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, sheen: 0.7, sheenRoughness: 0.35, sheenColor: new THREE.Color(0.55, 0.3, 0.32), side: THREE.DoubleSide, ...n(nVelvet, 1) }), 0.55),
    lace: addRim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: laceTex(), side: THREE.DoubleSide, ...n(nGrain, 0.8) }), 0.8),
    enamel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0 }),
    metal: addRim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.6 }), 0.4),
    glass: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.35, clearcoat: 1 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    ghost: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
}
