import { collidersOf, registerChapter } from '../../world/layout.js';

// Chapter III, the Frostspire: a mountain path of stone steps and snowy ledges,
// switching back and forth up the mountain to a monastery and the summit.
//
//   base camp        x -10..10, z 0..18                y 0
//   ledge path       north to the first ledge camp      y 0 -> 4
//   windy traverse   east along a narrow ledge          y 4 -> 8
//   boulder chute    a straight climb north, alcoves    y 8 -> 14
//   high traverse    west along another narrow ledge    y 14 -> 18
//   monastery court  x -24..0, z -112..-86              y 18
//   summit stair     north from the court's back gate   y 18 -> 26

export const STEP_RISE = 0.25;

// Flat places: circles { x, z, r } or rectangles, at height y.
export const BASE_CAMP = { minX: -10, maxX: 10, minZ: 0, maxZ: 18, y: 0 };
export const COURTYARD = { minX: -24, maxX: 0, minZ: -112, maxZ: -86, y: 18 };
export const LEDGES = [
  { id: 'ledge', x: 0, z: -28, r: 4.5, y: 4, name: 'The First Ledge' },
  { id: 'shelf', x: 30, z: -36, r: 5, y: 8, name: 'The Wind Shelf' },
  { id: 'crag', x: 30, z: -78, r: 5, y: 14, name: 'The High Crag' },
  { id: 'summit', x: -12, z: -132, r: 5, y: 26, name: 'The Summit' },
];

// The paths between them. `half` is half the width; `narrow` ([t0, t1] along the
// path) is where it pinches to `thin` and the wind blows from `wind` (a unit
// push direction, towards the drop).
export const PATHS = [
  { id: 'steps', a: [0, 1], b: [0, -24.5], y0: 0, y1: 4, half: 1.7, name: 'The Pilgrim Steps' },
  { id: 'traverse', a: [3.8, -29], b: [26, -35], y0: 4, y1: 8, half: 1.6, narrow: [0.25, 0.85], thin: 0.95, wind: [0.26, 0.97], name: 'The Windy Traverse' },
  { id: 'chute', a: [30, -40.5], b: [30, -73.5], y0: 8, y1: 14, half: 1.6, name: 'The Boulder Chute' },
  { id: 'high', a: [26, -80], b: [0.5, -90], y0: 14, y1: 18, half: 1.6, narrow: [0.2, 0.8], thin: 0.95, wind: [-0.37, -0.93], name: 'The High Traverse' },
  { id: 'stair', a: [-12, -111.5], b: [-12, -127.8], y0: 18, y1: 26, half: 1.6, narrow: [0.35, 0.85], thin: 1.1, wind: [1, 0], gated: true, name: 'The Summit Stair' },
];

// Niches in the chute's east wall where you can wait while a boulder rolls past.
export const ALCOVES = [-50, -59, -68].map((z) => ({ minX: 31.6, maxX: 34, minZ: z - 1.2, maxZ: z + 1.2, z }));

let summitOpen = false;
export const setSummitOpen = (open) => {
  summitOpen = open;
};

// Where along a path a point is: { t, d } (0..1 along, distance from its line).
export function alongPath(p, x, z) {
  const [ax, az] = p.a;
  const dx = p.b[0] - ax;
  const dz = p.b[1] - az;
  const len2 = dx * dx + dz * dz;
  const raw = ((x - ax) * dx + (z - az) * dz) / len2;
  const t = Math.max(0, Math.min(1, raw));
  return { t, raw, d: Math.hypot(x - (ax + dx * t), z - (az + dz * t)) };
}

export const halfWidth = (p, t) => (p.narrow && t > p.narrow[0] && t < p.narrow[1] ? p.thin : p.half);

// Stepped height along a path, like a flight of stairs.
export function pathHeight(p, t) {
  const count = Math.round((p.y1 - p.y0) / STEP_RISE);
  const i = Math.min(count - 1, Math.max(0, Math.floor(t * count)));
  return p.y0 + (i + 1) * STEP_RISE;
}

const inRect = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
const CHUTE = PATHS[2];

export function peakGround(x, z) {
  if (inRect(BASE_CAMP, x, z)) return BASE_CAMP.y;
  if (inRect(COURTYARD, x, z)) return COURTYARD.y;
  for (const l of LEDGES) if (Math.hypot(x - l.x, z - l.z) <= l.r) return l.y;
  for (const a of ALCOVES) if (inRect(a, x, z)) return pathHeight(CHUTE, alongPath(CHUTE, 30, z).t);
  for (const p of PATHS) {
    if (p.gated && !summitOpen) continue;
    const { t, raw, d } = alongPath(p, x, z);
    if (raw >= -0.02 && raw <= 1.02 && d <= halfWidth(p, t)) return pathHeight(p, t);
  }
  return null;
}

// The path you're on and how far along it, if any.
export function pathAt(x, z) {
  for (const p of PATHS) {
    const { t, raw, d } = alongPath(p, x, z);
    if (raw >= -0.02 && raw <= 1.02 && d <= halfWidth(p, t) + 0.05) return { path: p, t };
  }
  return null;
}

export const inAlcove = (x, z) => ALCOVES.some((a) => inRect(a, x, z));
export const inCourtyard = (x, z) => inRect(COURTYARD, x, z);
export const onChute = (x, z) => {
  const { raw, d } = alongPath(CHUTE, x, z);
  return raw >= -0.1 && raw <= 1.05 && d <= CHUTE.half + 0.1 && !inAlcove(x, z);
};

export function peakZone(x, z) {
  if (inRect(BASE_CAMP, x, z)) return "Brannoc's Camp";
  if (inRect(COURTYARD, x, z)) return 'The Monastery of Dawn';
  for (const l of LEDGES) if (Math.hypot(x - l.x, z - l.z) <= l.r + 0.5) return l.name;
  if (inAlcove(x, z)) return 'An Alcove';
  const on = pathAt(x, z);
  return on ? on.path.name : 'The Frostspire';
}

export const PEAK_SPAWNS = {
  camp: { position: [0, 0, 11.8], yaw: 0, pitch: 6 },
  ledge: { position: [0, 4, -27], yaw: -70, pitch: 0 },
  shelf: { position: [29, 8, -36], yaw: 0, pitch: 10 },
  chute: { position: [30, 8.25, -42], yaw: 0, pitch: 10 },
  crag: { position: [30, 14, -78], yaw: 70, pitch: 0 },
  court: { position: [-3, 18, -89], yaw: 90, pitch: 0 },
  summit: { position: [-12, 26, -130], yaw: 0, pitch: 0 },
};

registerChapter(3, { ground: peakGround, zone: peakZone, spawns: PEAK_SPAWNS });

export const peakColliders = collidersOf(3);
// The monastery walls, with the east gate from the high traverse and the north
// gate to the summit stair.
peakColliders.box(-0.2, 0.8, -112.8, -91.7);
peakColliders.box(-0.2, 0.8, -88.3, -85.2);
peakColliders.box(-24.8, -13.7, -112.8, -112);
peakColliders.box(-10.3, 0.8, -112.8, -112);
peakColliders.box(-24.8, -24, -112.8, -85.2);
peakColliders.box(-24.8, 0.8, -86, -85.2);
