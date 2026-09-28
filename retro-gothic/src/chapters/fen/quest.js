import { store, FRESH_FEN } from '../../store.js';
import { difficulty, notify, rankFor, recordChapter, registerQuest, saveGame } from '../../game/quest.js';
import { sfx } from '../../game/audio.js';
import { live } from '../../game/live.js';
import { BOARD, FONT, LAND, TOWER, TOWER_TOP, WATER_SURFACE } from './layout.js';

// Chapter II, the Drowned Fen:
//   0  ARRIVED  Mother Murk, the bog witch, meets the cart at her landing.
//   1  STARS    Find the five stars that fell into the fen ('ready' with all five).
//   2  FLOOD    You set them in the Star Font; the Drowned Queen wakes and the fen
//               floods. Climb the bell tower before the water takes you.
//   3  DONE     The stars go home to the sky; the Drowned sleep.
// All the way, the Drowned wait under the water for anyone who splashes near.
export const FEN = { ARRIVED: 0, STARS: 1, FLOOD: 2, DONE: 3 };

export const STARS = [
  { id: 'star-1', x: -19.5, z: -10, y: LAND },
  { id: 'star-2', x: 12.5, z: 0.5, y: WATER_SURFACE },
  { id: 'star-3', x: -2, z: -30, y: LAND },
  { id: 'star-4', x: -25, z: -45, y: LAND },
  { id: 'star-5', x: 25, z: -53, y: WATER_SURFACE },
].map((s) => ({ ...s, where: s.y === LAND ? 'on an island' : 'in the water' }));

// Witch-lights on poles. Walk up to a dark one to light it: the Drowned won't come
// near a lit one, and it's where you wake.
export const LANTERNS = [
  { id: 'lamp-0', x: 2, z: 2.5, startsLit: true, wake: { x: 0, z: 4.5, y: LAND } },
  { id: 'lamp-1', x: -13.2, z: -9.5, wake: { x: -15, z: -11, y: LAND } },
  { id: 'lamp-2', x: 12.3, z: -13.5, wake: { x: 14, z: -15, y: LAND } },
  { id: 'lamp-3', x: -15.8, z: -43.5, wake: { x: -18, z: -43, y: LAND } },
  { id: 'lamp-4', x: 14.8, z: -43.5, wake: { x: 16.5, z: -45, y: LAND } },
  { id: 'lamp-5', x: 2.8, z: -56.2, wake: { x: 0, z: -60, y: LAND } },
];
export const lanternLit = (lamp, lit) => lamp.startsLit || lit.includes(lamp.id);
export const LANTERN_SAFE = 3.4;

// Golden-eyed toads. Kiss them. Nothing happens. They seem to like it.
export const TOADS = [
  { id: 'toad-1', x: -7, y: 0.45, z: 8, rotation: 0.8, where: 'on a stump at the landing' },
  { id: 'toad-2', x: -20.5, y: 0.45, z: -15.5, rotation: 2.2, where: 'on Heron Isle' },
  { id: 'toad-3', x: 6, y: WATER_SURFACE + 0.06, z: -31, rotation: -1, where: 'on a lily pad', pad: true },
  { id: 'toad-4', x: 20.5, y: 0.86, z: -48, rotation: 1.8, where: 'in the wreck' },
  { id: 'toad-5', x: -3.4, y: 0.5, z: -63.5, rotation: 0.3, where: 'on a chapel pew' },
];

// The Drowned: each waits under the water near its lair.
export const DROWNED = [
  { id: 'drowned-1', x: -9, z: 0 },
  { id: 'drowned-2', x: 10.5, z: 3 },
  { id: 'drowned-3', x: -6, z: -25 },
  { id: 'drowned-4', x: 4, z: -40 },
  { id: 'drowned-5', x: -8, z: -51 },
  { id: 'drowned-6', x: 22, z: -58 },
];

export const MURK_SPOT = { x: 3.2, z: 9.6 };
export const FEN_CART = { x: -5, z: 19.5 };
export const FONT_WAKE = { x: 0, z: -69.8, y: LAND, yaw: Math.PI };
export const FLOOD_SPEED = 1.25; // metres a second; you climb about 1.1 running
const FLOOD_HEAD = 6; // seconds after the font before the water starts rising

const fen = () => store.get().fen;
const setFen = (patch) => store.set({ fen: { ...fen(), ...patch } });

export const fenKey = ({ fen: f }) => (f.stage === FEN.STARS && f.stars.length === STARS.length ? 'ready' : f.stage);

export function collectStar(id) {
  const f = fen();
  if (f.stars.includes(id)) return;
  const stars = [...f.stars, id];
  setFen({ stars });
  sfx.chime();
  if (stars.length < STARS.length) notify(`Fallen star ${stars.length} of ${STARS.length}`);
  else notify(f.stage >= FEN.STARS ? 'All five stars! Take them to the Star Font in the chapel' : 'Five warm, humming stars... Mother Murk will know what to do');
  saveGame();
}

export function lightLantern(id) {
  const f = fen();
  if (f.lit.includes(id)) return;
  setFen({ lit: [...f.lit, id] });
  sfx.whoosh();
  notify('Witch-light lit: the Drowned won\'t come near it');
  saveGame();
}

export function startFlood() {
  const head = FLOOD_HEAD + (1 - difficulty().flood) * 5;
  live.flood = { startAt: live.gameTime, riseAt: live.gameTime + head };
  live.waterY = WATER_SURFACE;
}

export function failFlood(why) {
  setFen({ seen: fen().seen + 1 });
  sfx.rumble();
  notify(why);
  startFlood();
  saveGame();
}

export function scoreFen(f, seconds, level) {
  const minutes = seconds / 60;
  const lanterns = f.lit.length;
  const easy = level === 'easy' ? 15 : 0;
  const score = Math.round(100 - f.seen * 6 + f.toads.length * 5 + lanterns * 3 - Math.max(0, minutes - 12) * 2 - easy);
  const rank = rankFor(score);
  const title = { S: 'Star-Catcher', A: 'Friend of the Fen', B: 'Muddy but Unbowed', C: 'Damp Survivor' }[rank];
  return { score, rank, title };
}

export function finishFlood() {
  const f = fen();
  setFen({ stage: FEN.DONE });
  live.flood = null;
  sfx.fanfare();
  live.shake = 0.5;
  notify('The stars fly home! The Drowned can rest.');
  const seconds = live.playTime - (f.start ?? 0);
  recordChapter(2, scoreFen(f, seconds, store.get().difficulty), seconds, f.seen);
  saveGame();
  setTimeout(() => store.set({ ending: true }), 4500);
}

const nearestStar = (f, x, z) => {
  let best = null;
  for (const s of STARS) {
    if (f.stars.includes(s.id)) continue;
    const d = Math.hypot(s.x - x, s.z - z);
    if (!best || d < best.d) best = { x: s.x, z: s.z, y: s.y, d };
  }
  return best;
};

export const fenQuest = {
  stage: (state) => state.fen.stage,
  key: fenKey,
  fill: (line, state) => line.replaceAll('{stars}', String(state.fen.stars.length)).replaceAll('{toads}', String(state.fen.toads.length)),

  objective(state) {
    const f = state.fen;
    const key = fenKey(state);
    if (key === FEN.ARRIVED) return 'Talk to Mother Murk, the bog witch, by her hut';
    if (key === FEN.STARS) return `Find the fallen stars in the fen: ${f.stars.length} / ${STARS.length}`;
    if (key === 'ready') return 'Take the five stars to the Star Font in the Sunken Chapel';
    if (key === FEN.FLOOD) return 'THE FLOOD! Climb the bell tower before the water takes you';
    if (state.unlocked >= 3) return 'Chapter III awaits: ride Rattlecart\'s cart to the Frostspire';
    return 'The stars are home. Wander the quiet fen.';
  },

  hint(state, button) {
    const key = fenKey(state);
    if (key === FEN.ARRIVED) return `The bog witch has the big ! over her head, just ahead of you. Walk up to her and press ${button}.`;
    if (key === FEN.STARS)
      return 'Walk into a star to pick it up. Keep to the boardwalks: wading is slow and the Drowned hear you splash. Crouch to wade quietly.';
    if (key === 'ready') return `Follow the arrow north to the chapel. At the stone font with the !, press ${button}.`;
    if (key === FEN.FLOOD) return 'Out through the arch behind the font, then RUN up the stair round the tower. Just hold forward: it turns you.';
    return `Rattlecart's cart is back at the landing, by the !. Walk up and press ${button} to ride.`;
  },

  steps(state) {
    const f = state.fen;
    const at = (s) => (f.stage > s ? 'done' : f.stage === s ? 'now' : 'later');
    const all = f.stars.length === STARS.length;
    return [
      { text: 'Talk to Mother Murk at her landing', state: at(FEN.ARRIVED) },
      { text: `Find the five fallen stars (${f.stars.length}/${STARS.length})`, state: f.stage > FEN.STARS || all ? 'done' : at(FEN.STARS) },
      { text: 'Set them in the Star Font in the Sunken Chapel', state: f.stage > FEN.STARS ? 'done' : all && f.stage === FEN.STARS ? 'now' : 'later' },
      { text: 'Climb the bell tower before the flood', state: at(FEN.FLOOD) },
    ];
  },

  extras: (state) => `witch-lights ${state.fen.lit.length}/${LANTERNS.length - 1} · toads ${state.fen.toads.length}/${TOADS.length}`,

  marker(state, x, z) {
    const key = fenKey(state);
    if (key === FEN.ARRIVED) return { x: MURK_SPOT.x, y: 3.6, z: MURK_SPOT.z };
    if (key === FEN.STARS) {
      const star = nearestStar(state.fen, x, z);
      return star && { x: star.x, y: star.y + 2.6, z: star.z };
    }
    if (key === 'ready') return { x: FONT.x, y: 3, z: FONT.z };
    if (key === FEN.FLOOD) return { x: TOWER.x, y: TOWER_TOP + 3, z: TOWER.z };
    if (key === FEN.DONE && state.unlocked >= 3) return { x: FEN_CART.x, y: 3.4, z: FEN_CART.z };
    return null;
  },

  target(state, x, z) {
    const key = fenKey(state);
    if (key === FEN.ARRIVED) return MURK_SPOT;
    if (key === FEN.STARS) return nearestStar(state.fen, x, z);
    if (key === 'ready') return FONT;
    if (key === FEN.FLOOD) return TOWER;
    if (key === FEN.DONE && state.unlocked >= 3) return FEN_CART;
    return null;
  },

  // Talking moves the story on once the conversation closes.
  advance(id, state) {
    const f = state.fen;
    const key = fenKey(state);
    if (id.startsWith('toad-')) {
      sfx.kiss();
      if (f.toads.includes(id)) return false;
      const toads = [...f.toads, id];
      setFen({ toads });
      notify(toads.length === TOADS.length ? 'Every toad kissed! None of them were princes.' : `Toad kissed: ${toads.length} of ${TOADS.length}`);
      return true;
    }
    if (id === 'murk' && key === FEN.ARRIVED) {
      setFen({ stage: FEN.STARS });
      if (state.bangers < 3) {
        store.set({ bangers: 3 });
        notify('Mother Murk gave you 3 bangers');
      }
      return true;
    }
    if (id === 'murk' && f.stage >= FEN.STARS && state.bangers < 3) {
      store.set({ bangers: 3 });
      notify('Bangers refilled: 3');
      return true;
    }
    if (id === 'star-font' && key === 'ready') {
      setFen({ stage: FEN.FLOOD });
      sfx.greatBell();
      live.shake = 1;
      startFlood();
      setTimeout(() => notify('The fen is flooding! CLIMB THE TOWER!'), 2500);
      return true;
    }
    return false;
  },

  caught(by) {
    setFen({ seen: fen().seen + 1 });
    notify(by === 'drowned' ? 'The Drowned pulled you under! You wake by the last witch-light' : 'You wake by the last witch-light');
  },

  bangs: (state) => state.fen.stage >= FEN.STARS,
  pockets: (state) => (state.fen.toads.length ? `TOADS ${state.fen.toads.length}/${TOADS.length}` : ''),

  ending: {
    title: 'THE STARS GO HOME',
    text: 'The five stars rose off the bell tower like sparks from a bonfire and took their places in the sky. The water sank back into the mud, and the Drowned Queen closed her eyes and slept, with all her Drowned around her.',
    teaser: 'But the night goes on, and on. Far away, on the Frostspire, somebody is waiting for the sun...',
    rows: (state) => [
      ['TIMES CAUGHT', String(state.fen.seen)],
      ['WITCH-LIGHTS LIT', `${state.fen.lit.length} / ${LANTERNS.length - 1}`],
      ['TOADS KISSED', `${state.fen.toads.length} / ${TOADS.length}`],
    ],
  },
  outOfBangers: () => (fen().stage >= FEN.STARS ? 'Out of bangers: Mother Murk has more' : 'You have no bangers'),
  cartTo: (state) => (state.fen.stage >= FEN.DONE ? 3 : null),

  load(saved) {
    if (!saved || !Number.isInteger(saved.stage)) return FRESH_FEN;
    const known = (list, ids) => (Array.isArray(ids) ? ids.filter((id) => list.some((x) => x.id === id)) : []);
    return {
      // A save made mid-flood goes back to just before the font.
      stage: saved.stage === FEN.FLOOD ? FEN.STARS : Math.min(FEN.DONE, Math.max(0, saved.stage)),
      stars: known(STARS, saved.stars),
      lit: known(LANTERNS, saved.lit),
      toads: known(TOADS, saved.toads),
      seen: Number.isInteger(saved.seen) ? saved.seen : 0,
      start: Number.isFinite(saved.start) ? saved.start : null,
    };
  },

  enter() {
    live.flood = null;
    live.waterY = WATER_SURFACE;
    if (fen().stage === FEN.FLOOD) setFen({ stage: FEN.STARS });
  },

  score: (state, seconds) => scoreFen(state.fen, seconds, state.difficulty),

  intro: {
    chapter: 2,
    title: 'THE DROWNED FEN',
    lead: 'When the Eye closed, the stars came home. All but five, which fell into the Drowned Fen.',
    steps: [
      ['Talk to ', 'Mother Murk', ', the bog witch, just ahead of you. She has the ', '!', ' over her head.'],
      ['Find the ', 'five fallen stars', '. Keep to the boardwalks when you can.'],
      ['Set them in the ', 'Star Font', ' in the Sunken Chapel, and be ready to climb.'],
    ],
    danger: [
      'DANGER: ',
      'the Drowned wait under the water and come for anyone who splashes near. They can\'t leave the water: climb onto land or a boardwalk, or stand by a lit witch-light, and they sink back. Crouch to wade quietly.',
    ],
  },
};

export const onBoard = (y) => Math.abs(y - BOARD) < 0.02;

registerQuest(2, fenQuest);
