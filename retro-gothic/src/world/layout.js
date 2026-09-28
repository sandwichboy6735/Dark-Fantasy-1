// The map, in metres. North (-z) is the castle; the tavern yard is east (+x)
// of the wayside court where you start.
//
//   z -116 ........ castle gate
//   z  -96 .. -114  gate forecourt           (y 13)
//   z   -4 ..  -96  the causeway: flats and flights of steps rising 0 -> 13
//   z   -4 ..   22  wayside court            (y 0)   x -14..14
//   z   -8 ..   26  goblin tavern yard       (y 0)   x  14..46

export const BRIDGE_HALF_WIDTH = 3;
export const STEP_RISE = 0.25;

// Flats and flights of steps, walked from the court towards the castle.
export const BRIDGE_SEGMENTS = [
  { z0: -4, z1: -16, y0: 0, y1: 0 },
  { z0: -16, z1: -28, y0: 0, y1: 3 },
  { z0: -28, z1: -36, y0: 3, y1: 3 },
  { z0: -36, z1: -50, y0: 3, y1: 6.5 },
  { z0: -50, z1: -58, y0: 6.5, y1: 6.5 },
  { z0: -58, z1: -72, y0: 6.5, y1: 10 },
  { z0: -72, z1: -80, y0: 10, y1: 10 },
  { z0: -80, z1: -92, y0: 10, y1: 13 },
  { z0: -92, z1: -96, y0: 13, y1: 13 },
];

// Every step as { z, depth, top }: `z` is its near edge.
export const STEPS = BRIDGE_SEGMENTS.flatMap(({ z0, z1, y0, y1 }) => {
  if (y0 === y1) return [];
  const count = Math.round((y1 - y0) / STEP_RISE);
  const depth = (z0 - z1) / count;
  return Array.from({ length: count }, (_, i) => ({ z: z0 - i * depth, depth, top: y0 + (i + 1) * STEP_RISE }));
});

export function bridgeHeight(z) {
  for (const { z0, z1, y0, y1 } of BRIDGE_SEGMENTS) {
    if (z > z0 || z < z1) continue;
    if (y0 === y1) return y0;
    const count = Math.round((y1 - y0) / STEP_RISE);
    const i = Math.min(count - 1, Math.max(0, Math.floor(((z0 - z) / (z0 - z1)) * count)));
    return y0 + (i + 1) * STEP_RISE;
  }
  return null;
}

// Walkable rectangles, kept ~0.4 m short of the walls around them.
export const COURT = { minX: -13, maxX: 14, minZ: -3, maxZ: 21 };
export const YARD = { minX: 14, maxX: 39.2, minZ: -7, maxZ: 25 };
export const FORECOURT = { minX: -15, maxX: 15, minZ: -113.4, maxZ: -96, y: 13 };

// Behind the gate, walkable only once it opens: the gate passage, the bailey,
// the keep's door and the nave, with the Great Bell's dais at the far end.
export const GATEWAY = { minX: -2.4, maxX: 2.4, minZ: -119.4, maxZ: -113.4 };
export const BAILEY = { minX: -11, maxX: 11, minZ: -129.2, maxZ: -119 };
export const DOORWAY = { minX: -1.6, maxX: 1.6, minZ: -132.2, maxZ: -129 };
export const NAVE = { minX: -10.8, maxX: 10.8, minZ: -150, maxZ: -131.8 };
export const DAIS_Z = -144.5;
export const DAIS_HEIGHT = 0.3;

let castleOpen = false;
export const setCastleOpen = (open) => {
  castleOpen = open;
};

// The causeway falls from the castle end: nothing is left below `collapseZ`,
// and once the Eye is closed it's gone altogether.
let collapseZ = -Infinity;
let causewayGone = false;
export const setCollapse = (z, gone) => {
  collapseZ = z;
  causewayGone = gone;
};

const inside = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

// Height of the walkable ground at (x, z), or null over the abyss / outside the map.
export function groundAt(x, z) {
  if (inside(COURT, x, z) || inside(YARD, x, z)) return 0;
  if (Math.abs(x) <= BRIDGE_HALF_WIDTH - 0.4 && z < COURT.minZ && z >= -96) {
    if (causewayGone || z < collapseZ) return null;
    return bridgeHeight(Math.min(z, -4));
  }
  if (inside(FORECOURT, x, z)) return FORECOURT.y;
  if (castleOpen) {
    if (inside(NAVE, x, z)) return z < DAIS_Z ? FORECOURT.y + DAIS_HEIGHT : FORECOURT.y;
    if (inside(GATEWAY, x, z) || inside(BAILEY, x, z) || inside(DOORWAY, x, z)) return FORECOURT.y;
  }
  return null;
}

// Solid things the player bumps into. Circles and boxes on the ground plane.
export const circleColliders = [];
export const boxColliders = [];
// Moving things (guards, goblins) register a live object: { object, radius }.
export const dynamicColliders = new Set();

export const addCircle = (x, z, r) => circleColliders.push({ x, z, r });
export const addBox = (minX, maxX, minZ, maxZ) => boxColliders.push({ minX, maxX, minZ, maxZ });

export function zoneAt(x, z) {
  if (z < -130) return 'The Nave of the Vigil';
  if (z < -114) return 'The Bailey';
  if (x > 14) return 'The Grinning Tankard';
  if (z < -96) return 'Gate of the Vigil';
  if (z < -4) return 'The Mourning Causeway';
  return 'The Wayside Court';
}

// Where you wake. `?spawn=bridge` etc. starts elsewhere; `&look=yaw,pitch` in degrees.
export const SPAWNS = {
  court: { position: [0, 0, 17], yaw: 0, pitch: 8 },
  tavern: { position: [18, 0, 8], yaw: -80, pitch: 0 },
  yard: { position: [21.6, 0, 8.4], yaw: -31, pitch: 4 },
  bar: { position: [36.4, 0, 10], yaw: -90, pitch: 0 },
  bridge: { position: [0, 6.5, -53], yaw: 0, pitch: 10 },
  gate: { position: [0, 13, -99], yaw: 0, pitch: 12 },
  bailey: { position: [0, 13, -120], yaw: 0, pitch: 5 },
  nave: { position: [0, 13, -130.5], yaw: 0, pitch: 4 },
  dais: { position: [0, 13.3, -144.2], yaw: 0, pitch: 12 },
};
