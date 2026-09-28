import { store } from '../../store.js';
import {
  BELLS,
  COLLAPSE_SPEED,
  COLLAPSE_START_Z,
  DAIS_WAKE,
  GAZE_RADIUS,
  SAFE_RADIUS,
  STAGE,
  TORCHES,
  collectBell,
  failEscape,
  finishEscape,
  gazePositions,
  isLit,
  lightTorch,
  safeLights,
  spillToast,
} from '../../game/quest.js';
import { setAmbience, setQuake, sfx } from '../../game/audio.js';
import { live } from '../../game/live.js';
import { COURT, groundAt, setCastleOpen, setCollapse } from '../../world/layout.js';

const DREAD_RISE = 0.6; // per second in the gaze: about 1.7 s until you're seen
const DREAD_FALL = 0.35;
const FOAM_SPILL = 0.16; // per second of running with the Toast
const TORCH_REACH = 2.6;
// Reaching the gate forecourt, and later the keep's door, are checkpoints too:
// you never wake further back than the furthest of these you've reached.
const CHECKPOINTS = [
  { x: 0, z: -99, y: 13 },
  { x: 0, z: -130.5, y: 13 },
];

const escaping = () => store.get().stage === STAGE.ESCAPE && live.escape;

// Chapter I, the Vigil: the Eye's gaze, the torches, the bells, the Toast and the
// escape down the falling causeway. The Player calls these every frame.
export const vigilRules = {
  defaultSpawn: 'court',
  wake: { x: 0, z: 0, y: 0 },

  // Before you move: the castle gate, and the causeway crumbling behind you.
  before({ b, playing, level, wakeAt }) {
    const { stage } = store.get();
    setCastleOpen(stage >= STAGE.CASTLE);
    if (escaping()) {
      const e = live.escape;
      live.collapseSpeed = COLLAPSE_SPEED * level.collapse;
      live.collapseZ = live.gameTime < e.fallAt ? -Infinity : COLLAPSE_START_Z + (live.gameTime - e.fallAt) * live.collapseSpeed;
      setCollapse(live.collapseZ, false);
      live.shake = Math.max(live.shake, 0.12);
      setQuake(playing ? 1 : 0.3);
      if (!b.falling && live.collapseZ > COLLAPSE_START_Z + 1 && b.z < COLLAPSE_START_Z - 0.5) {
        wakeAt(DAIS_WAKE, Math.PI);
        failEscape('The causeway fell before you got out! Back to the bell: try again.');
      }
      if (!b.falling && b.z < COURT.minZ && b.z > COLLAPSE_START_Z && groundAt(b.x, b.z) === null) {
        b.falling = live.gameTime;
        b.fallSpeed = 0;
        sfx.scream();
      }
      if (b.z > COURT.minZ + 0.5 && !b.falling) finishEscape();
    } else if (stage >= STAGE.DONE) {
      live.collapseZ = 1000;
      live.collapseSpeed = COLLAPSE_SPEED;
      setCollapse(1000, true);
      setQuake(0);
    } else {
      live.collapseZ = -Infinity;
      setCollapse(-Infinity, false);
      setQuake(0);
    }
  },

  fell({ wakeAt }) {
    wakeAt(DAIS_WAKE, Math.PI);
    failEscape('The causeway gave way beneath you! Back to the bell: try again.');
  },

  canSneak: () => !escaping(),
  pace: () => null,
  surface: (b) => (b.x > 14 ? 'dirt' : 'stone'),

  // After you move: bells, torches, the gaze, falling masonry and the Toast's foam.
  after({ b, dt, playing, level, running }) {
    const { stage, bells } = store.get();
    for (const bell of stage < STAGE.ESCAPE ? BELLS : []) {
      if (!bells.includes(bell.id) && Math.hypot(bell.x - b.x, bell.z - b.z) < 1.3 && Math.abs(bell.y - 0.9 - b.ground) < 1.5) collectBell(bell.id);
    }

    const state = store.get();
    for (const torch of stage < STAGE.ESCAPE ? TORCHES : []) {
      if (!isLit(torch, state.lit) && Math.abs(torch.z - b.z) < TORCH_REACH && Math.abs(torch.y - b.ground) < 1) lightTorch(torch.id);
    }

    // The Eye's gaze: searchlights sweep the causeway. Torchlight keeps you hidden.
    if (playing && state.stage < STAGE.ESCAPE) live.gazeTime += dt * (state.stage >= STAGE.TOAST ? 1.3 : 1);
    live.gazes = gazePositions(live.gazeTime, state.stage, live.lure, live.now);
    const lights = safeLights(state.lit, state.stage);
    const shelter = lights.find((l) => Math.hypot(l.x - b.x, l.z - b.z) < SAFE_RADIUS);
    if (shelter) b.wake = shelter.wake;
    for (const point of CHECKPOINTS) {
      if (b.z < point.z + 1 && b.wake.z > point.z) b.wake = point;
    }
    live.safe = Boolean(shelter);
    live.inGaze = live.gazes.some((g) => g.active && Math.hypot(g.x - b.x, g.z - b.z) < GAZE_RADIUS && Math.abs(g.y - b.ground) < 3);
    if (playing && live.inGaze && !live.safe) {
      live.dread = Math.min(1, live.dread + dt * DREAD_RISE * level.dread);
      b.heartbeat -= dt;
      if (b.heartbeat <= 0) {
        sfx.heartbeat();
        b.heartbeat = 0.75 - live.dread * 0.35;
      }
    } else {
      live.dread = Math.max(0, live.dread - dt * DREAD_FALL);
      b.heartbeat = 0;
    }
    live.rage = Math.max(live.dread, live.hunted > 0 ? 0.8 : 0);

    // Falling masonry while you flee: a red ring marks where each block will land.
    if (escaping() && playing) {
      b.debrisTimer -= dt;
      if (b.debrisTimer <= 0 && live.gameTime > live.escape.ringAt + 2) {
        b.debrisTimer = 0.8 + Math.random() * 0.6;
        const x = b.x + (Math.random() - 0.5) * 3;
        const z = b.z + 4 + Math.random() * 7;
        const ground = groundAt(x, z);
        if (ground !== null) live.debris.push({ x, z, y: ground, landAt: live.gameTime + 1.1, hit: false });
      }
      for (const d of live.debris) {
        if (!d.hit && live.gameTime >= d.landAt) {
          d.hit = true;
          sfx.crash();
          if (Math.hypot(d.x - b.x, d.z - b.z) < 1.4 && Math.abs(d.y - b.ground) < 2) {
            live.stunUntil = live.gameTime + 1.1;
            live.shake = 1;
          }
        }
      }
      live.debris = live.debris.filter((d) => live.gameTime < d.landAt + 1.5);
    } else if (live.debris.length) {
      live.debris = [];
    }

    // Carrying the Toast: running sloshes the foam out.
    if (state.stage === STAGE.TOAST && !state.spilled && running && playing) {
      live.foam = Math.max(0, live.foam - dt * FOAM_SPILL * level.foam);
      if (live.foam <= 0) spillToast();
    }
  },

  danger: () => (escaping() ? 1 : 0),

  // The drone fades into the goblins' jig as you cross into the tavern yard.
  ambience(b, playing) {
    setAmbience(Math.min(1, Math.max(0, (b.x - 8) / 10)), playing);
  },

  leave() {
    setQuake(0);
    live.gazes = [];
    live.debris = [];
    live.inGaze = false;
    live.safe = false;
  },
};
