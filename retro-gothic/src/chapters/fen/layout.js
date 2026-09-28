import { collidersOf, registerChapter } from '../../world/layout.js';

// Chapter II, the Drowned Fen: a flooded marsh of mud islands joined by rotten
// boardwalks, with a sunken chapel and its bell tower at the far (north) end.
//
//   z   2 ..  22   Murk's Landing, where the cart stops       (y 0)
//   z -10 .. -50   islands and boardwalks over knee-deep water (water floor y -0.5)
//   z -56 .. -80   the Sunken Chapel
//   z -78 .. -94   the bell tower, a stair winding three times round it to y 15

export const WATER_FLOOR = -0.5; // where your feet are when you wade
export const WATER_SURFACE = -0.08;
export const LAND = 0;
export const BOARD = 0.1;
export const BOUNDS = { minX: -40, maxX: 40, minZ: -100, maxZ: 30 };

export const ISLANDS = [
  { id: 'landing', x: 0, z: 12, r: 10, name: "Murk's Landing" },
  { id: 'heron', x: -16, z: -12, r: 6.5, name: 'Heron Isle' },
  { id: 'willow', x: 15, z: -16, r: 6, name: 'Willow Isle' },
  { id: 'hummock', x: -2, z: -30, r: 3.2, name: 'The Hummock' },
  { id: 'gallows', x: -20, z: -42, r: 7, name: 'Gallows Isle' },
  { id: 'wreck', x: 18, z: -46, r: 6.5, name: 'Wreck Isle' },
  { id: 'chapel', x: 0, z: -68, r: 12.5, name: 'The Sunken Chapel' },
  { id: 'tower', x: 0, z: -86, r: 8, name: 'The Bell Tower' },
];

// Rotten boardwalks between the islands; `gaps` are stretches (0..1 along the
// walk) where the planks have fallen in and you have to wade.
export const BOARD_HALF_WIDTH = 0.9;
export const BOARDWALKS = [
  { a: [-3, 4], b: [-12, -7] },
  { a: [5, 4], b: [12, -11.5], gaps: [[0.42, 0.62]] },
  { a: [-18, -18], b: [-20, -35.5] },
  { a: [16, -21.5], b: [18, -39.8], gaps: [[0.35, 0.55]] },
  { a: [-15.5, -46.5], b: [-6.5, -58] },
  { a: [14, -50.5], b: [6.5, -58], gaps: [[0.5, 0.72]] },
];

// The chapel: roofless walls round a stone floor, the Star Font near the altar end.
export const CHAPEL = { minX: -5, maxX: 5, minZ: -76, maxZ: -58 };
export const FONT = { x: 0, z: -72, y: LAND };

// The bell tower and the stair round it.
export const TOWER = { x: 0, z: -87, core: 4, outer: 6.8 };
export const STEPS_PER_TURN = 20;
export const TURNS = 3;
export const STEP_RISE = 0.25;
export const TOWER_TOP = STEPS_PER_TURN * TURNS * STEP_RISE; // 15
const STEP_ANGLE = (Math.PI * 2) / STEPS_PER_TURN;

const inCircle = (c, x, z) => Math.hypot(x - c.x, z - c.z) <= c.r;
export const islandAt = (x, z) => ISLANDS.find((i) => inCircle(i, x, z)) ?? null;

// Where a point is along a boardwalk, if it's on one (and not in a gap).
export function boardwalkAt(x, z) {
  for (const w of BOARDWALKS) {
    const [ax, az] = w.a;
    const dx = w.b[0] - ax;
    const dz = w.b[1] - az;
    const len2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d <= BOARD_HALF_WIDTH && !(w.gaps ?? []).some(([t0, t1]) => t >= t0 && t <= t1)) return w;
  }
  return null;
}

const inBounds = (x, z) => x >= BOUNDS.minX && x <= BOUNDS.maxX && z >= BOUNDS.minZ && z <= BOUNDS.maxZ;

// Step `k` of the tower stair, counting from the bottom, and its height.
export const stepHeight = (k) => (k + 1) * STEP_RISE;
export const stepAngle = (k) => k * STEP_ANGLE;

// Every floor at (x, z): the water bed or an island, a boardwalk, and wherever
// the tower stair passes overhead (once per turn), plus the tower roof.
function floorsAt(x, z) {
  if (!inBounds(x, z)) return [];
  const floors = [islandAt(x, z) ? LAND : WATER_FLOOR];
  if (boardwalkAt(x, z)) floors.push(BOARD);
  const r = Math.hypot(x - TOWER.x, z - TOWER.z);
  if (r >= TOWER.core && r <= TOWER.outer) {
    let angle = Math.atan2(x - TOWER.x, z - TOWER.z);
    if (angle < 0) angle += Math.PI * 2;
    const first = Math.floor(angle / STEP_ANGLE);
    for (let turn = 0; turn < TURNS; turn++) floors.push(stepHeight(first + turn * STEPS_PER_TURN));
  } else if (r < TOWER.core) {
    floors.push(TOWER_TOP);
  }
  return floors;
}

// The highest floor you could step up to from `nearY` (so you stay on the stair
// you're on), or the lowest one if you're below them all.
export function fenGround(x, z, nearY = Infinity) {
  const floors = floorsAt(x, z);
  if (!floors.length) return null;
  let best = null;
  for (const h of floors) if (h <= nearY + 0.6 && (best === null || h > best)) best = h;
  return best ?? Math.min(...floors);
}

// Open water, not under a boardwalk (for reeds and lily pads).
export const isWater = (x, z) => inBounds(x, z) && !islandAt(x, z) && !boardwalkAt(x, z);
// Where the Drowned can go: anywhere off the islands, ducking under the boardwalks.
export const isSwimmable = (x, z) => inBounds(x, z) && !islandAt(x, z);

export function fenZone(x, z) {
  if (Math.hypot(x - TOWER.x, z - TOWER.z) < TOWER.outer + 0.5) return 'The Bell Tower';
  const island = islandAt(x, z);
  if (island) return island.name;
  if (boardwalkAt(x, z)) return 'The Rotten Boardwalks';
  return 'The Drowned Fen';
}

export const FEN_SPAWNS = {
  landing: { position: [0, 0, 17], yaw: 0, pitch: 4 },
  heron: { position: [-15, 0, -12], yaw: 0, pitch: 0 },
  willow: { position: [15, 0, -16], yaw: 0, pitch: 0 },
  gallows: { position: [-18, 0, -42], yaw: 0, pitch: 0 },
  chapel: { position: [0, 0, -60], yaw: 0, pitch: 4 },
  font: { position: [0, 0, -69.5], yaw: 0, pitch: -6 },
  tower: { position: [0, 0, -81], yaw: 0, pitch: 20 },
  top: { position: [0, TOWER_TOP, -87], yaw: 180, pitch: -10 },
};

registerChapter(2, { ground: fenGround, zone: fenZone, spawns: FEN_SPAWNS });

// Things you bump into.
export const fenColliders = collidersOf(2);
// The chapel walls, with the south door, a breach in the west wall and the arch
// through to the tower in the north wall.
fenColliders.box(-5.4, -4.6, -76, -67);
fenColliders.box(-5.4, -4.6, -62, -58);
fenColliders.box(4.6, 5.4, -76, -58);
fenColliders.box(-5.4, -1.4, -58.4, -57.6);
fenColliders.box(1.4, 5.4, -58.4, -57.6);
fenColliders.box(-5.4, -1.5, -76.4, -75.6);
fenColliders.box(1.5, 5.4, -76.4, -75.6);
fenColliders.circle(FONT.x, FONT.z, 1.1);
// The tower core: solid at the foot, a roof you stand on at the top.
fenColliders.circle(TOWER.x, TOWER.z, TOWER.core, { y0: -5, y1: TOWER_TOP - 0.5 });
