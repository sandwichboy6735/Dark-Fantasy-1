import { store } from '../../store.js';
import { setChapterAmbience, sfx } from '../../game/audio.js';
import { live } from '../../game/live.js';
import { registerRules } from '../registry.js';
import { CAMPFIRES, FIRE_WARM, PEAK, enterMonastery, fireLit, lightFire } from './quest.js';
import { COURTYARD, PATHS, alongPath, inAlcove, inCourtyard, onChute, pathAt, pathHeight, setSummitOpen } from './layout.js';

const COLD_SECONDS = 75; // from warm to frozen, away from any fire
const WIND_CHILL = 1.6; // how much faster you cool on the windy ledges
const WARM_UP = 0.45; // per second by a fire
const FIRE_REACH = 3.6;
const GUST_WARNING = 1.4; // seconds of howling before a gust hits
const GUST_LENGTH = 1.3;
const GUST_SPEED = 3.4; // metres per second: more than enough to blow you off
const CROUCH_SHELTER = 0; // crouched and braced, the wind can't move you
const CHUTE = PATHS[2];
const BOULDER_SPEED = 7.5;
const BOULDER_TOP = -73;
const BOULDER_BOTTOM = -41;
const DAWN_SECONDS = 12;

const stage = () => store.get().peak.stage;

// Chapter III, the Frostspire: warmth and campfires, gusts of wind on the narrow
// ledges, boulders down the chute, and the sunrise at the end.
export const peakRules = {
  defaultSpawn: 'camp',
  wake: CAMPFIRES[0].wake,
  canFall: true,

  before({ playing }) {
    setSummitOpen(stage() >= PEAK.SUMMIT);
    // The sun comes up once the Beacon is lit.
    if (stage() >= PEAK.DONE) {
      if (live.dawnStart === null || live.dawnStart === undefined) live.dawnStart = -1000;
      live.dawn = Math.min(1, Math.max(0, (live.gameTime - live.dawnStart) / DAWN_SECONDS));
      // The final card once the sun is well up (only right after lighting the Beacon).
      if (live.finalShown === false && live.gameTime - live.dawnStart > DAWN_SECONDS + 2.5) {
        live.finalShown = true;
        store.set({ ending: true });
      }
    } else {
      live.dawn = 0;
    }
    if (!playing) live.push = null;
  },

  // Blown off the edge: back on your feet by the last fire, reported like any catch.
  fell({ b, wakeAt }) {
    live.push = null;
    live.gust = null;
    wakeAt(b.wake, b.wake.yaw ?? 0);
    live.caughtBy = 'fall';
  },

  canSneak: () => true,
  pace: () => null,
  surface: (b) => (inCourtyard(b.x, b.z) ? 'stone' : 'snow'),

  after({ b, dt, playing, level }) {
    const p = store.get().peak;
    const done = p.stage >= PEAK.DONE;

    // Campfires: walk up to light one, stand by a lit one to warm up.
    let warmBy = null;
    for (const fire of CAMPFIRES) {
      const d = Math.hypot(fire.x - b.x, fire.z - b.z);
      if (Math.abs(fire.y - b.ground) > 1.5) continue;
      if (!fireLit(fire, p.lit)) {
        if (d < FIRE_REACH) lightFire(fire.id);
      } else if (d < FIRE_WARM) {
        warmBy = fire;
      }
    }
    if (warmBy) b.wake = warmBy.wake;
    live.safe = Boolean(warmBy);

    // Into the monastery: the monks wake.
    if (p.stage === PEAK.CLIMB && inCourtyard(b.x, b.z) && b.x < -1.5) enterMonastery();

    // Where the wind blows: the narrow stretches of the ledges (and a little either side).
    const on = pathAt(b.x, b.z);
    const windy = !done && on?.path.wind && on.t > on.path.narrow[0] - 0.08 && on.t < on.path.narrow[1] + 0.08;

    // Warmth drains in the cold, faster in the wind, and comes back by a fire.
    if (playing && !done) {
      if (warmBy) live.warmth = Math.min(1, live.warmth + WARM_UP * dt);
      else live.warmth = Math.max(0, live.warmth - (dt / COLD_SECONDS) * (windy ? WIND_CHILL : 1) * level.cold);
      if (live.warmth <= 0) {
        live.warmth = 1;
        live.caughtBy = 'cold';
      }
    } else if (done) {
      live.warmth = Math.min(1, live.warmth + dt * 0.3);
    }

    // Gusts: a warning howl, then a shove towards the drop. Crouch to ride it out.
    const g = live.gust;
    if (windy && playing) {
      if (!g || live.gameTime > g.until) {
        const from = live.gameTime + 2.6 + Math.random() * 2.4;
        live.gust = { warnAt: from - GUST_WARNING, from, until: from + GUST_LENGTH, x: on.path.wind[0], z: on.path.wind[1], howled: false };
      }
    } else if (g && live.gameTime > g.until) {
      live.gust = null;
    } else if (g && !windy && live.gameTime < g.from) {
      live.gust = null; // left the ledge before it hit
    }
    const gust = live.gust;
    const blowing = gust && live.gameTime >= gust.from && live.gameTime < gust.until;
    if (gust && !gust.howled && live.gameTime >= gust.warnAt) {
      gust.howled = true;
      sfx.gust();
    }
    const shelter = live.sneaking ? CROUCH_SHELTER : 1;
    live.push = blowing && windy && playing ? { x: gust.x * GUST_SPEED * shelter, z: gust.z * GUST_SPEED * shelter } : null;
    live.windX = blowing ? gust.x * 9 : gust && live.gameTime >= gust.warnAt ? gust.x * 3 : 0;
    if (blowing) live.shake = Math.max(live.shake, live.sneaking ? 0.08 : 0.25);

    // Boulders roll down the chute while you're anywhere near it.
    const nearChute = b.x > 24 && b.x < 36 && b.z < -30 && b.z > -80 && !done;
    if (nearChute && playing) {
      live.boulderTimer = (live.boulderTimer ?? 1) - dt;
      if (live.boulderTimer <= 0) {
        live.boulderTimer = (3.8 + Math.random() * 1.4) / level.boulder;
        live.boulders.push({ x: 30 + (Math.random() - 0.5) * 1.2, z: BOULDER_TOP, spin: 0 });
        sfx.boulder();
      }
    }
    for (const r of live.boulders) {
      if (playing) {
        r.z += BOULDER_SPEED * level.boulder * dt;
        r.spin += BOULDER_SPEED * dt;
      }
      r.y = pathHeight(CHUTE, alongPath(CHUTE, 30, r.z).t) + 1.05;
      if (playing && Math.abs(r.x - b.x) < 1.6 && Math.abs(r.z - b.z) < 1.3 && Math.abs(r.y - 1.05 - b.ground) < 1.5 && !inAlcove(b.x, b.z)) {
        live.caughtBy = 'boulder';
        r.z = BOULDER_BOTTOM + 1;
      }
    }
    if (live.boulders.some((r) => r.z > BOULDER_BOTTOM)) {
      sfx.crash();
      live.boulders = live.boulders.filter((r) => r.z <= BOULDER_BOTTOM);
    }
    if (!nearChute && live.boulders.length) live.boulders = [];

    // The line under the crosshair.
    const rolling = onChute(b.x, b.z) && live.boulders.some((r) => r.z < b.z && b.z - r.z < 22);
    live.boulderNear = rolling;
    if (blowing) live.status = { text: live.sneaking ? 'HOLD ON...' : 'THE WIND! CROUCH!', alarm: !live.sneaking, hunted: !live.sneaking };
    else if (gust && live.gameTime >= gust.warnAt) live.status = { text: 'THE WIND HOWLS... CROUCH! (C)', alarm: true };
    else if (rolling) live.status = { text: 'BOULDER! GET INTO AN ALCOVE!', alarm: true, hunted: true };
    else if (live.monkNear && playing) live.status = { text: 'ONE OF THEM IS RIGHT BEHIND YOU!', alarm: true, hunted: true };
    else if (p.stage === PEAK.BRAZIERS && inCourtyard(b.x, b.z)) live.status = { text: 'DON\'T LOOK AWAY FROM THE MONKS', alarm: false };
    else if (live.warmth < 0.3 && !done) live.status = { text: 'FREEZING! FIND A FIRE!', alarm: true };
    else if (windy) live.status = { text: 'WINDY LEDGE: CROUCH WHEN IT HOWLS', alarm: false };
    else live.status = null;
    if (inAlcove(b.x, b.z) && live.boulders.length) live.status = { text: 'SAFE IN THE ALCOVE', alarm: false };
  },

  danger: () => (live.boulderNear || live.monkNear ? 1 : 0),

  ambience(b, playing) {
    const g = live.gust;
    const level = g && live.gameTime >= g.warnAt && live.gameTime < g.until ? 1 : 0;
    setChapterAmbience(stage() >= PEAK.DONE ? 'dawn' : 'peak', playing, level);
  },

  leave() {
    live.push = null;
    live.gust = null;
    live.boulders = [];
    live.windX = 0;
    live.status = null;
    live.safe = false;
    live.monkNear = false;
    live.boulderNear = false;
    setSummitOpen(false);
  },
};

// Courtyard height, for anything that needs it.
export const COURT_Y = COURTYARD.y;

registerRules(3, peakRules);
