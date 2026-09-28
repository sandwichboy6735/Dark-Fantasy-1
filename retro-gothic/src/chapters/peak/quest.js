import { store, FRESH_PEAK } from '../../store.js';
import { notify, rankFor, recordChapter, registerQuest, saveGame } from '../../game/quest.js';
import { sfx } from '../../game/audio.js';
import { live } from '../../game/live.js';
import { COURTYARD, LEDGES } from './layout.js';

// Chapter III, the Frostspire:
//   0  ARRIVED   Brannoc the hermit keeps the last fire at the foot of the mountain.
//   1  CLIMB     Carry his ember up the mountain to the monastery.
//   2  BRAZIERS  Light the three Braziers of Dawn in the courtyard, under the eyes
//                of the stone monks.
//   3  SUMMIT    Climb the summit stair and light the Dawn Beacon.
//   4  DONE      The sun rises for the first time in a hundred years.
// All the way up, the cold drains your warmth, and only fire brings it back.
export const PEAK = { ARRIVED: 0, CLIMB: 1, BRAZIERS: 2, SUMMIT: 3, DONE: 4 };

// Campfires along the way, in the order you reach them. The first burns already;
// walk up to the others to light them. Each is a warm place and where you wake.
export const CAMPFIRES = [
  { id: 'fire-0', x: 0, z: 8, y: 0, startsLit: true, wake: { x: 0, z: 11, y: 0, yaw: 0 } },
  { id: 'fire-1', x: -2, z: -29.5, y: 4, wake: { x: 0.5, z: -27.5, y: 4, yaw: -1.3 } },
  { id: 'fire-2', x: 32.5, z: -34, y: 8, wake: { x: 30, z: -37.5, y: 8, yaw: 0 } },
  { id: 'fire-3', x: 32.5, z: -79.5, y: 14, wake: { x: 29.5, z: -78, y: 14, yaw: 1.2 } },
  { id: 'fire-4', x: -3, z: -88.2, y: 18, wake: { x: -3, z: -90, y: 18, yaw: 1.57 } },
];
export const fireLit = (fire, lit) => fire.startsLit || lit.includes(fire.id);
export const FIRE_WARM = 4.2;

// The three Braziers of Dawn in the monastery courtyard.
export const BRAZIERS = [
  { id: 'brazier-1', x: -21, z: -89, name: 'The Brazier of First Light' },
  { id: 'brazier-2', x: -21, z: -109, name: 'The Brazier of the Long Shadow' },
  { id: 'brazier-3', x: -3, z: -109, name: 'The Brazier of Waking' },
];

// The stone monks, where they stand when the courtyard is quiet.
export const MONKS = [
  { id: 'monk-1', x: -12, z: -95 },
  { id: 'monk-2', x: -7, z: -103 },
  { id: 'monk-3', x: -17, z: -101 },
  { id: 'monk-4', x: -13, z: -108 },
];

// The Tankard Mountaineering Society, frozen solid on the way up.
export const CLIMBERS = [
  { id: 'climber-1', x: 2.8, z: -26.5, y: 4, rotation: -2.2, name: 'Pickaxe Pim' },
  { id: 'climber-2', x: 33, z: -59, y: 11.75, rotation: -1.57, name: 'Belay Bogg' },
  { id: 'climber-3', x: 26.8, z: -76, y: 14, rotation: 2.4, name: 'Crampon Kez' },
  { id: 'climber-4', x: -21.8, z: -99, y: 18, rotation: 1.57, name: 'Summit Sal' },
];

export const BRANNOC_SPOT = { x: -3.5, z: 6.5 };
export const PEAK_CART = { x: 5.2, z: 12 };
export const BEACON = { x: -12, z: -134.5, y: 26 };
export const COURT_GATE = { x: -1, z: -90 };

const peak = () => store.get().peak;
const setPeak = (patch) => store.set({ peak: { ...peak(), ...patch } });

export const peakKey = ({ peak: p }) => p.stage;

export function lightFire(id) {
  const p = peak();
  if (p.lit.includes(id)) return;
  setPeak({ lit: [...p.lit, id] });
  sfx.whoosh();
  notify('Campfire lit: stand by it to get warm');
  saveGame();
}

// Walking in through the monastery gate wakes the monks.
export function enterMonastery() {
  if (peak().stage !== PEAK.CLIMB) return;
  setPeak({ stage: PEAK.BRAZIERS });
  sfx.grind();
  saveGame();
  setTimeout(() => notify('The stone monks move only when you are NOT looking at them'), 2500);
}

export function scorePeak(p, seconds, level) {
  const minutes = seconds / 60;
  const easy = level === 'easy' ? 15 : 0;
  const score = Math.round(100 - p.seen * 6 + p.goblins.length * 6 + p.lit.length * 3 - Math.max(0, minutes - 12) * 2 - easy);
  const rank = rankFor(score);
  const title = { S: 'Bringer of Dawn', A: 'Sunward Climber', B: 'Frostbitten Hero', C: 'Chilly Wanderer' }[rank];
  return { score, rank, title };
}

// Next campfire up the mountain past the highest one you've lit.
const nextFire = (p) => {
  let highest = 0;
  CAMPFIRES.forEach((f, i) => fireLit(f, p.lit) && (highest = i));
  return CAMPFIRES[highest + 1] ?? null;
};

const nearestBrazier = (p, x, z) => {
  let best = null;
  for (const b of BRAZIERS) {
    if (p.braziers.includes(b.id)) continue;
    const d = Math.hypot(b.x - x, b.z - z);
    if (!best || d < best.d) best = { x: b.x, z: b.z, d };
  }
  return best;
};

export const peakQuest = {
  stage: (state) => state.peak.stage,
  key: peakKey,
  fill: (line, state) => line.replaceAll('{braziers}', String(state.peak.braziers.length)),

  objective(state) {
    const p = state.peak;
    if (p.stage === PEAK.ARRIVED) return 'Talk to Brannoc the hermit by his campfire';
    if (p.stage === PEAK.CLIMB) return 'Climb the Frostspire to the Monastery of Dawn';
    if (p.stage === PEAK.BRAZIERS) return `Light the Braziers of Dawn: ${p.braziers.length} / ${BRAZIERS.length}`;
    if (p.stage === PEAK.SUMMIT) return 'Climb to the summit and light the Dawn Beacon';
    return 'The sun is up! Ride home to the Tankard with Rattlecart';
  },

  hint(state, button) {
    const p = state.peak;
    if (p.stage === PEAK.ARRIVED) return `The hermit has the big ! over his head, by the fire. Walk up to him and press ${button}.`;
    if (p.stage === PEAK.CLIMB)
      return 'Follow the arrow up. Stand by campfires to warm up. When the wind howls, CROUCH (C / SNEAK). Hide from boulders in the alcoves.';
    if (p.stage === PEAK.BRAZIERS)
      return `Walk up to a brazier with the ! and press ${button}. Keep your eyes on the stone monks: they only move when you look away.`;
    if (p.stage === PEAK.SUMMIT) return `Up the stair through the north gate. Crouch in the wind. At the beacon with the !, press ${button}.`;
    return `Rattlecart is back at the foot of the mountain, by the !. Press ${button} to ride home. (Or pause and pick a chapter.)`;
  },

  steps(state) {
    const p = state.peak;
    const at = (s) => (p.stage > s ? 'done' : p.stage === s ? 'now' : 'later');
    return [
      { text: 'Talk to Brannoc at the foot of the mountain', state: at(PEAK.ARRIVED) },
      { text: 'Climb the Frostspire to the Monastery of Dawn', state: at(PEAK.CLIMB) },
      { text: `Light the three Braziers of Dawn (${p.braziers.length}/${BRAZIERS.length})`, state: at(PEAK.BRAZIERS) },
      { text: 'Light the Dawn Beacon on the summit', state: at(PEAK.SUMMIT) },
    ];
  },

  extras: (state) => `campfires ${state.peak.lit.length}/${CAMPFIRES.length - 1} · climbers ${state.peak.goblins.length}/${CLIMBERS.length}`,
  pockets: (state) => (state.peak.goblins.length ? `CLIMBERS ${state.peak.goblins.length}/${CLIMBERS.length}` : ''),

  marker(state, x, z) {
    const p = state.peak;
    if (p.stage === PEAK.ARRIVED) return { x: BRANNOC_SPOT.x, y: 3.8, z: BRANNOC_SPOT.z };
    if (p.stage === PEAK.CLIMB) {
      const fire = nextFire(p);
      return fire ? { x: fire.x, y: fire.y + 3, z: fire.z } : { x: COURT_GATE.x, y: COURTYARD.y + 4, z: COURT_GATE.z };
    }
    if (p.stage === PEAK.BRAZIERS) {
      const b = nearestBrazier(p, x, z);
      return b && { x: b.x, y: COURTYARD.y + 4.6, z: b.z };
    }
    if (p.stage === PEAK.SUMMIT) return { x: BEACON.x, y: BEACON.y + 7, z: BEACON.z };
    return { x: PEAK_CART.x, y: 3.6, z: PEAK_CART.z };
  },

  target(state, x, z) {
    const p = state.peak;
    if (p.stage === PEAK.ARRIVED) return BRANNOC_SPOT;
    if (p.stage === PEAK.CLIMB) return nextFire(p) ?? COURT_GATE;
    if (p.stage === PEAK.BRAZIERS) return nearestBrazier(p, x, z);
    if (p.stage === PEAK.SUMMIT) return BEACON;
    return PEAK_CART;
  },

  advance(id, state) {
    const p = state.peak;
    if (id.startsWith('climber-')) {
      if (p.goblins.includes(id)) return false;
      const goblins = [...p.goblins, id];
      setPeak({ goblins });
      sfx.iceCrack();
      notify(goblins.length === CLIMBERS.length ? 'The whole Tankard Mountaineering Society, thawed!' : `Climber thawed: ${goblins.length} of ${CLIMBERS.length}`);
      return true;
    }
    if (id === 'brannoc' && p.stage === PEAK.ARRIVED) {
      setPeak({ stage: PEAK.CLIMB });
      live.warmth = 1;
      sfx.chime();
      notify('You carry Brannoc\'s ember. Keep warm!');
      return true;
    }
    if (id.startsWith('brazier-') && p.stage === PEAK.BRAZIERS && !p.braziers.includes(id)) {
      const braziers = [...p.braziers, id];
      setPeak({ braziers });
      sfx.whoosh();
      if (braziers.length < BRAZIERS.length) {
        notify(`Brazier of Dawn lit: ${braziers.length} of ${BRAZIERS.length}`);
      } else {
        setPeak({ braziers, stage: PEAK.SUMMIT });
        sfx.fanfare();
        live.shake = 0.6;
        notify('The monks crumble! The summit gate is open');
      }
      return true;
    }
    if (id === 'beacon' && p.stage === PEAK.SUMMIT) {
      setPeak({ stage: PEAK.DONE });
      live.dawnStart = live.gameTime;
      sfx.fanfare();
      setTimeout(() => sfx.sunrise(), 1200);
      live.shake = 0.5;
      const seconds = live.playTime - (p.start ?? 0);
      recordChapter(3, scorePeak(p, seconds, state.difficulty), seconds, p.seen);
      setTimeout(() => notify('The sun is rising!'), 2500);
      live.finalShown = false;
      return true;
    }
    return false;
  },

  caught(by) {
    setPeak({ seen: peak().seen + 1 });
    const why = {
      cold: 'You froze solid! You thaw out by the last campfire',
      fall: 'The wind threw you off the mountain! You wake by the last campfire',
      boulder: 'Flattened by a boulder! You wake by the last campfire',
      monk: 'A stone monk caught you! You wake by the last campfire',
    }[by];
    notify(why ?? 'You wake by the last campfire');
  },

  bangs: () => false,
  outOfBangers: () => 'Bangers are no use up here',
  cartTo: (state) => (state.peak.stage >= PEAK.DONE ? 1 : null),

  load(saved) {
    if (!saved || !Number.isInteger(saved.stage)) return FRESH_PEAK;
    const known = (list, ids) => (Array.isArray(ids) ? ids.filter((id) => list.some((x) => x.id === id)) : []);
    return {
      stage: Math.min(PEAK.DONE, Math.max(0, saved.stage)),
      lit: known(CAMPFIRES, saved.lit),
      braziers: known(BRAZIERS, saved.braziers),
      goblins: known(CLIMBERS, saved.goblins),
      seen: Number.isInteger(saved.seen) ? saved.seen : 0,
      start: Number.isFinite(saved.start) ? saved.start : null,
    };
  },

  enter() {
    live.warmth = 1;
    live.gust = null;
    live.boulders = [];
    live.dawnStart = peak().stage >= PEAK.DONE ? -1000 : null;
  },

  score: (state, seconds) => scorePeak(state.peak, seconds, state.difficulty),

  intro: {
    title: 'THE FROSTSPIRE',
    lead: 'The stars are home, but the sun is not. For a hundred years it has not risen. Light the Dawn Beacon on the Frostspire and call it back.',
    steps: [
      ['Talk to ', 'Brannoc', ', the hermit by the fire. He has the ', '!', ' over his head.'],
      ['Climb. The cold drains your ', 'WARMTH', ': relight the old campfires on the way and stand by them to thaw.'],
      ['Light the three ', 'Braziers of Dawn', ' in the monastery, then the ', 'Dawn Beacon', ' on the summit.'],
    ],
    danger: [
      'DANGER: ',
      'when the wind howls, CROUCH (C, or SNEAK) or it will throw you off the ledge. Boulders roll down the chute: hide in the alcoves. And the stone monks move only when you are not looking at them.',
    ],
  },

  ending: {
    title: 'DAWN',
    text: 'The Beacon caught, and far away over the edge of the world something answered it. For the first time in a hundred years, the sun came up: over the Frostspire, over the fen, over the causeway and the castle, and over a tavern full of goblins who cheered it like an old friend.',
    rows: (state) => [
      ['TIMES CAUGHT', String(state.peak.seen)],
      ['CAMPFIRES LIT', `${state.peak.lit.length} / ${CAMPFIRES.length - 1}`],
      ['CLIMBERS THAWED', `${state.peak.goblins.length} / ${CLIMBERS.length}`],
    ],
  },
};

export const LEDGE_BY_ID = Object.fromEntries(LEDGES.map((l) => [l.id, l]));

registerQuest(3, peakQuest);
