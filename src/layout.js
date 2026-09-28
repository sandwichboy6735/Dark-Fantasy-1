// The map of Moonveil: a floating continent above a sea of cloud.
// North is -z. All distances are in metres.

export const HALF = 1536;       // heightmap covers x,z in [-HALF, HALF]
export const WATER_Y = 18;      // Mirror Lake surface
export const BAYOU = { x: 660, z: 780, r: 200, water: 14 };
export const CLOUD_Y = -30;     // the cloud sea

// Where the moon hangs: low in the north, just above the Moonspire when seen from the start.
export const MOON_DIR = [0.12, 0.35, -0.93];

export const PLACES = [
  { id: 'overlook', name: 'Wayfarer’s Rest', sub: 'Where every journey in Moonveil begins', x: 0, z: 352, r: 45 },
  { id: 'lake', name: 'The Mirror Lake', sub: 'It shows the moon a second time', x: 0, z: 205, r: 140 },
  { id: 'village', name: 'Emberlight Village', sub: 'Warm windows, cold nights, kind folk', x: 0, z: 30, r: 150 },
  { id: 'castle', name: 'Castle Vaelmoor', sub: 'Its lights have not gone out in four hundred winters', x: -380, z: -560, r: 110 },
  { id: 'moonspire', name: 'The Moonspire', sub: 'The tallest tooth of the Frostfang Mountains', x: 180, z: -820, r: 200 },
  { id: 'witchwood', name: 'The Witchwood', sub: 'Mind the mushrooms. They mind you.', x: 640, z: 20, r: 230 },
  { id: 'market', name: 'The Goblin Market', sub: 'Fair prices, fast fingers, questionable change', x: -640, z: 140, r: 120 },
  { id: 'graves', name: 'Stillwater Graves', sub: 'The quietest neighbours in the realm', x: 430, z: 500, r: 90 },
  { id: 'circle', name: 'The Moon Circle', sub: 'Old stones that hum when she is full', x: -280, z: 540, r: 70 },
  { id: 'tower', name: 'Archmage Oriel’s Tower', sub: 'Knock, and the door decides', x: -760, z: -260, r: 80 },
  { id: 'lighthouse', name: 'Starwatch Light', sub: 'A lighthouse for ships that sail the clouds', x: 120, z: 1190, r: 70 },
  { id: 'starfall', name: 'Starfall Point', sub: 'The stones float. So can you.', x: -860, z: 860, r: 70 },
  { id: 'bayou', name: 'The Weeping Bayou', sub: 'The cypresses remember every sunset', x: 660, z: 780, r: 190 },
  { id: 'emberdeep', name: 'The Emberdeep', sub: 'A dwarven forge that has burned for a thousand years', x: 140, z: -690, r: 60 },
  { id: 'queen', name: 'The Moon Queen’s Castle', sub: 'Built on the last island the moon let go of', x: -1260, z: 1270, r: 170 },
];

// Roads as polylines of [x, z]
export const ROADS = [
  [[0, 345], [150, 330], [235, 230], [215, 120], [120, 70], [40, 50]],
  [[0, 40], [-80, -60], [-150, -200], [-230, -330], [-290, -430], [-322, -470]],
  [[-40, 60], [-220, 110], [-420, 150], [-560, 145]],
  [[60, 40], [260, 40], [440, 25], [560, 10]],
  [[-40, 350], [-150, 450], [-250, 525]],
  [[200, 300], [300, 420], [400, 480]],
  [[40, 360], [70, 600], [95, 900], [115, 1150]],
  [[-260, 540], [-520, 700], [-800, 840]],
  [[-420, 150], [-600, -40], [-730, -220]],
  [[400, 480], [470, 560], [540, 640]],
];

// Magic updrafts. Step into one to be carried: either straight up, or along an arc to a destination.
export const LIFTS = [
  { x: -322, z: -464, to: [-380, null, -548], label: 'Moonlift to Castle Vaelmoor' },
  { x: -367, z: -541, to: [-313, null, -457], label: 'Moonlift down to the gate' },
  { x: -760, z: -232, to: [-760, 'top', -260], label: 'Moonlift up the tower' },
];

// Floating stepping stones from Starfall Point to the Moon Queen's island
export function steppingStones() {
  const a = [-925, 925], b = [-1205, 1220];
  const out = [];
  const n = 14;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const wob = Math.sin(i * 1.7) * 5;
    out.push({
      x: a[0] + (b[0] - a[0]) * t + wob, z: a[1] + (b[1] - a[1]) * t - wob * 0.6,
      y: 54 - i * 0.7, r: 5 + (i % 3), well: i % 2 === 1,
    });
  }
  return out;
}

// Scenic drifting isles around the continent: [x, z, baseY, radius, castle?]
export const ISLES = [
  [-1260, 1270, 40, 70, 'queen'],
  [900, 1350, 90, 38, true],
  [1500, 300, 60, 45, true],
  [1350, -900, 140, 36, true],
  [300, -1700, 180, 50, true],
  [-1250, -1150, 110, 40, true],
  [-1750, 250, 70, 42, true],
  [-500, 1750, 20, 30, false],
  [1800, -250, 20, 28, false],
  [600, 1850, 40, 26, true],
  [-1850, -500, 10, 30, false],
];
