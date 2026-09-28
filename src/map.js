// A parchment map of Moonveil drawn from the real heightmap: hill shading, contour lines,
// roads, the lake, the floating isles and a compass rose.
import { N, CELL } from './terrain.js';
import { HALF, ROADS, ISLES, WATER_Y, steppingStones } from './layout.js';

const SIZE = 1024;
export const toMap = (x, z) => [((x + HALF) / (HALF * 2)) * SIZE, ((z + HALF) / (HALF * 2)) * SIZE];

export function drawMap(terrain) {
  const c = document.createElement('canvas'); c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE), d = img.data;
  const h = terrain.h, col = terrain.col;
  const step = (N - 1) / SIZE;
  const H = (i, j) => h[Math.min(N - 1, Math.max(0, j)) * N + Math.min(N - 1, Math.max(0, i))];
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let py = 0; py < SIZE; py++) for (let px = 0; px < SIZE; px++) {
    const i = Math.round(px * step), j = Math.round(py * step);
    const y = H(i, j), k = (py * SIZE + px) * 4;
    const paper = 0.93 + rnd() * 0.05;
    let r = 222 * paper, g = 206 * paper, b = 170 * paper;
    if (y > -40) {
      const ci = (j * N + i) * 3;
      const dx = H(i + 2, j) - H(i - 2, j), dz = H(i, j + 2) - H(i, j - 2);
      const shade = Math.max(0.45, Math.min(1.25, 1 + (-dx - dz) / (4 * CELL) * 0.9));
      const t = 0.55;
      r = (col[ci] * (1 - t) + 196 * t) * shade * paper;
      g = (col[ci + 1] * (1 - t) + 176 * t) * shade * paper;
      b = (col[ci + 2] * (1 - t) + 130 * t) * shade * paper;
      // contour lines every 30 m
      const band = Math.floor(y / 30), bandR = Math.floor(H(i + 1, j) / 30), bandD = Math.floor(H(i, j + 1) / 30);
      if (y > 0 && (band !== bandR || band !== bandD)) { r *= 0.72; g *= 0.66; b *= 0.58; }
      if (y < WATER_Y - 0.3 && Math.hypot((i * CELL - HALF) / 250, (j * CELL - HALF - 205) / 118) < 1.3) { r = 96 * paper; g = 118 * paper; b = 132 * paper; }
      // cliff edge ink
      if (y < 0) { const e = Math.min(1, -y / 40); r *= 1 - e * 0.5; g *= 1 - e * 0.5; b *= 1 - e * 0.45; }
    } else {
      // the cloud sea: pale parchment with soft swirls
      const sw = Math.sin(px * 0.021 + Math.sin(py * 0.013) * 3) * Math.sin(py * 0.017 + Math.cos(px * 0.011) * 2);
      r = (212 + sw * 10) * paper; g = (206 + sw * 10) * paper; b = (190 + sw * 12) * paper;
    }
    d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // coastline ink
  ctx.strokeStyle = 'rgba(70,50,30,0.55)'; ctx.lineWidth = 1;
  // roads
  ctx.setLineDash([6, 4]); ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(110,70,40,0.85)';
  for (const road of ROADS) { ctx.beginPath(); road.forEach(([x, z], i) => { const [mx, my] = toMap(x, z); if (i) ctx.lineTo(mx, my); else ctx.moveTo(mx, my); }); ctx.stroke(); }
  ctx.setLineDash([]);
  // floating isles and stepping stones
  const isle = (x, z, r, castle) => {
    const [mx, my] = toMap(x, z), mr = Math.max(3, (r / (HALF * 2)) * SIZE);
    ctx.fillStyle = 'rgba(150,140,110,0.9)'; ctx.strokeStyle = 'rgba(70,50,30,0.8)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(mx, my, mr, mr * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (castle) { ctx.fillStyle = 'rgba(60,40,30,0.9)'; ctx.fillRect(mx - 3, my - 5, 6, 6); ctx.beginPath(); ctx.moveTo(mx - 4, my - 5); ctx.lineTo(mx, my - 10); ctx.lineTo(mx + 4, my - 5); ctx.fill(); }
  };
  for (const [x, z, , r, castle] of ISLES) isle(x, z, r, castle);
  for (const s of steppingStones()) isle(s.x, s.z, s.r * 1.5, false);
  // compass rose
  const cx = 110, cy = 120;
  ctx.save(); ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(70,45,25,0.9)'; ctx.fillStyle = 'rgba(120,40,30,0.85)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke();
  for (let a = 0; a < 8; a++) {
    const ang = a * Math.PI / 4, L = a % 2 ? 30 : 58;
    ctx.save(); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.lineTo(-6, 0); ctx.closePath();
    ctx.fillStyle = a === 0 ? 'rgba(130,30,25,0.9)' : 'rgba(80,60,40,0.8)'; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(60,35,20,0.95)'; ctx.font = '700 20px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('N', 0, -64);
  ctx.restore();
  // title cartouche
  ctx.fillStyle = 'rgba(60,35,20,0.9)'; ctx.font = '700 38px "Cinzel Decorative", Cinzel, Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('Moonveil', SIZE / 2, 64);
  ctx.font = 'italic 600 20px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('the floating realm, as drawn by Theodric the Scholar', SIZE / 2, 92);
  // frame
  ctx.strokeStyle = 'rgba(70,45,25,0.9)'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, SIZE - 20, SIZE - 20);
  ctx.lineWidth = 1.5; ctx.strokeRect(22, 22, SIZE - 44, SIZE - 44);
  // aged edges
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.3, SIZE / 2, SIZE / 2, SIZE * 0.75);
  g.addColorStop(0, 'rgba(90,60,30,0)'); g.addColorStop(1, 'rgba(90,60,30,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
  return c;
}
