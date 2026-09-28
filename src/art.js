// Hand-painted look: procedural canvas textures and the shared materials everything is built from.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { foliageMaterials } from './foliage.js';

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
  // mortar
  ctx.fillStyle = '#3a3632'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},0.05)`; ctx.fillRect(r() * s, r() * s, 2, 2); }
  // coursed rubble: rows of cut stones of varying length and height, with chipped corners
  let y = 0;
  while (y < s) {
    const hh = 26 + Math.floor(r() * 3) * 8;
    let x = -r() * 50;
    while (x < s) {
      const w = 34 + r() * 70;
      const base = 118 + r() * 70, warm = (r() - 0.3) * 18;
      const pts = [[x + 2 + r() * 4, y + 2 + r() * 3], [x + w - 2 - r() * 4, y + 2 + r() * 3], [x + w - 2 - r() * 3, y + hh - 2 - r() * 4], [x + 2 + r() * 3, y + hh - 2 - r() * 4]];
      ctx.beginPath(); ctx.moveTo(...pts[0]);
      for (let i = 1; i <= 4; i++) { const p = pts[i % 4], q = pts[i - 1]; ctx.lineTo(q[0] + (p[0] - q[0]) * 0.5 + (r() - 0.5) * 3, q[1] + (p[1] - q[1]) * 0.5 + (r() - 0.5) * 3); ctx.lineTo(...p); }
      const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + hh);
      g.addColorStop(0, `rgb(${base + 22 + warm},${base + 18},${base + 12 - warm})`);
      g.addColorStop(1, `rgb(${base - 30 + warm},${base - 32},${base - 34 - warm})`);
      ctx.fillStyle = g; ctx.fill();
      // pits, speckle and a lit top edge
      for (let k = 0; k < 40; k++) { ctx.fillStyle = `rgba(${r() < 0.6 ? 0 : 255},${r() < 0.6 ? 0 : 255},${r() < 0.6 ? 0 : 255},${0.06 + r() * 0.1})`; ctx.fillRect(x + r() * w, y + r() * hh, 1 + r() * 3, 1 + r() * 2); }
      ctx.strokeStyle = 'rgba(255,245,225,0.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(...pts[3]); ctx.lineTo(...pts[2]); ctx.stroke();
      // lichen and moss
      if (r() < 0.25) { ctx.fillStyle = `rgba(${90 + r() * 40},${110 + r() * 40},${60 + r() * 20},${0.15 + r() * 0.2})`; ctx.beginPath(); ctx.ellipse(x + r() * w, y + hh * 0.8, 6 + r() * 14, 3 + r() * 5, 0, 0, Math.PI * 2); ctx.fill(); }
      x += w;
    }
    y += hh;
  }
  // rain streaks
  for (let i = 0; i < 40; i++) { const x = r() * s; const g = ctx.createLinearGradient(0, 0, 0, s); g.addColorStop(0, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 2 + r() * 6, s * (0.3 + r() * 0.7)); }
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

// Tiling detail maps for the ground (linear, centred on mid-grey so they only add texture)
function detailTex(paint) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d');
  let seed = paint.length * 31 + 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 512, 512);
  paint(ctx, 512, r);
  // make it tile: blend edges with a wrapped copy
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
  return t;
}
const grassDetail = () => detailTex((ctx, s, r) => {
  for (let i = 0; i < 9000; i++) {
    const x = r() * s, y = r() * s, L = 4 + r() * 12, a = -Math.PI / 2 + (r() - 0.5) * 1.2;
    const v = 70 + r() * 120, g = v + 20 + r() * 20;
    ctx.strokeStyle = `rgba(${v * 0.85},${g},${v * 0.7},0.55)`; ctx.lineWidth = 1 + r();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
    if (x < L || y < L) { ctx.beginPath(); ctx.moveTo(x + s, y + s); ctx.lineTo(x + s + Math.cos(a) * L, y + s + Math.sin(a) * L); ctx.stroke(); }
  }
  for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(90,70,50,${0.1 + r() * 0.15})`; ctx.beginPath(); ctx.arc(r() * s, r() * s, 2 + r() * 6, 0, 7); ctx.fill(); }
});
const soilDetail = () => detailTex((ctx, s, r) => {
  for (let i = 0; i < 3000; i++) {
    const x = r() * s, y = r() * s, rad = 1 + Math.pow(r(), 3) * 8, v = 60 + r() * 150;
    ctx.fillStyle = `rgba(${v},${v * 0.92},${v * 0.82},0.6)`; ctx.beginPath(); ctx.ellipse(x, y, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, 7); ctx.fill();
  }
});
const rockDetail = () => detailTex((ctx, s, r) => {
  for (let i = 0; i < 260; i++) {
    const x = r() * s, y = r() * s, w = 20 + r() * 90, h = 10 + r() * 40, v = 90 + r() * 90;
    ctx.fillStyle = `rgba(${v},${v},${v * 1.04},0.5)`; ctx.beginPath(); ctx.ellipse(x, y, w, h, r() * 0.4, 0, 7); ctx.fill();
  }
  for (let i = 0; i < 2000; i++) { const v = 60 + r() * 150; ctx.fillStyle = `rgba(${v},${v * 0.97},${v * 0.93},0.25)`; ctx.fillRect(r() * s, r() * s, 2 + r() * 6, 2 + r() * 4); }
  for (let i = 0; i < 40; i++) {
    let x = r() * s, y = r() * s; ctx.strokeStyle = `rgba(20,20,24,${0.2 + r() * 0.25})`; ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; y += (r() - 0.3) * 20; ctx.lineTo(x, y); } ctx.stroke();
  }
});

function terrainDetail(mat) {
  const g = grassDetail(), so = soilDetail(), ro = rockDetail();
  const gn = normalFrom(g.image, 2.5), rn = normalFrom(ro.image, 4);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tG: { value: g }, tS: { value: so }, tR: { value: ro }, tGN: { value: gn }, tRN: { value: rn } });
    sh.vertexShader = 'varying vec3 vTW; varying vec3 vTN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vTW = (modelMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = 'uniform sampler2D tG, tS, tR, tGN, tRN; varying vec3 vTW; varying vec3 vTN;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `
        vec2 wuv = vTW.xz;
        vec3 gd = texture2D(tG, wuv * 0.45).rgb * texture2D(tG, wuv * 0.061).rgb * 2.0;
        vec3 sd = texture2D(tS, wuv * 0.3).rgb * 1.4;
        vec3 an = abs(normalize(vTN));
        vec3 aw = an / (an.x + an.y + an.z);
        #define TRI(S) (texture2D(tR, vTW.zy * S).rgb * aw.x + texture2D(tR, vTW.xy * S).rgb * aw.z + texture2D(tR, wuv * S).rgb * aw.y)
        vec3 rd = TRI(0.09) * TRI(0.41) * 2.1;
        // layered strata and dark cracks on cliffs
        float strata = texture2D(tS, vec2(vTW.y * 0.35, (vTW.x + vTW.z) * 0.01)).r;
        rd *= 0.72 + strata * 0.55;
        float rockW = smoothstep(0.82, 0.6, an.y);
        float bare = smoothstep(0.1, 0.5, vColor.r - vColor.g + 0.12); // roads, mud, snow read as bare
        float breakup = texture2D(tS, wuv * 0.013).r;
        vec3 detail = mix(gd, sd, clamp(bare + (breakup - 0.5) * 0.8, 0.0, 1.0));
        detail = mix(detail, rd * 1.8, rockW);
        diffuseColor.rgb *= detail * 1.15;
        // moss and grass creep over ledges that aren't too steep
        float moss = rockW * smoothstep(0.35, 0.62, an.y) * smoothstep(0.35, 0.65, breakup + texture2D(tS, wuv * 0.07).r * 0.5 - 0.1) * (1.0 - bare);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.17, 0.21, 0.1) * gd * 1.4, moss * 0.85);
        #include <map_fragment>`)
      .replace('#include <normal_fragment_maps>', `
        vec3 nG = texture2D(tGN, wuv * 0.45).xyz * 2.0 - 1.0;
        vec3 nR = texture2D(tRN, (an.y > 0.6 ? wuv : (an.x > an.z ? vTW.zy : vTW.xy)) * 0.12).xyz * 2.0 - 1.0;
        vec3 nb = mix(nG * vec3(0.6, 0.6, 1.0), nR * vec3(1.4, 1.4, 1.0), rockW);
        normal = normalize(normal + (viewMatrix * vec4(nb.x, 0.0, nb.y, 0.0)).xyz * 0.9);`);
  };
  mat.customProgramCacheKey = () => 'terrainDetail';
  mat.map = null; mat.normalMap = null;
  return mat;
}

export function makeMaterials() {
  const grain = grainTex(), stone = stoneTex(), shingle = shingleTex(), thatch = thatchTex(), wood = woodTex();
  const nStone = normalFrom(stone.image, 3.5), nGrain = normalFrom(grain.image, 1.2), nWood = normalFrom(wood.image, 2.5), nRoof = normalFrom(shingle.image, 3), nThatch = normalFrom(thatch.image, 2);
  const nSkin = normalFrom(skinHeight(), 5), nVelvet = normalFrom(velvetHeight(), 3);
  const std = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.92, metalness: 0, ...extra });
  const n = (t, s) => ({ normalMap: t, normalScale: new THREE.Vector2(s, s) });
  const fol = foliageMaterials(normalFrom);
  return {
    ...fol,
    tex: { grain, soft: softTex(), cloud: cloudTex() },
    terrain: terrainDetail(std(grain, { roughness: 1 })),
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
