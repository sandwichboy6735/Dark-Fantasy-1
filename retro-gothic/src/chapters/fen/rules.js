import { store } from '../../store.js';
import { setChapterAmbience, setQuake } from '../../game/audio.js';
import { live } from '../../game/live.js';
import { registerRules } from '../registry.js';
import { FEN, FLOOD_SPEED, FONT_WAKE, LANTERNS, LANTERN_SAFE, STARS, collectStar, failFlood, finishFlood, lanternLit, lightLantern } from './quest.js';
import { BOARD, CHAPEL, TOWER, TOWER_TOP, WATER_FLOOR, WATER_SURFACE, boardwalkAt } from './layout.js';

const LANTERN_REACH = 2.8;
const FLOOD_MARGIN = 1.0; // the water may reach your waist, not your chin

const fenStage = () => store.get().fen.stage;
const flooding = () => fenStage() === FEN.FLOOD && live.flood;

// Chapter II, the Drowned Fen: wading, witch-lights, the stars, and the flood.
export const fenRules = {
  defaultSpawn: 'landing',
  wake: LANTERNS[0].wake,
  canFall: false,

  before({ b, dt, playing, level, wakeAt }) {
    if (flooding()) {
      const f = live.flood;
      const rise = Math.max(0, live.gameTime - f.riseAt) * FLOOD_SPEED * level.flood;
      live.waterY = Math.min(WATER_SURFACE + rise, TOWER_TOP - 0.6);
      setQuake(playing ? (live.gameTime > f.riseAt ? 0.8 : 0.4) : 0.2);
      live.shake = Math.max(live.shake, 0.06);
      if (live.waterY > b.ground + FLOOD_MARGIN) {
        wakeAt(FONT_WAKE, FONT_WAKE.yaw);
        failFlood('The flood took you! Back to the font: try again, and RUN.');
      } else if (b.ground >= TOWER_TOP - 0.05 && Math.hypot(b.x - TOWER.x, b.z - TOWER.z) < TOWER.outer + 0.5) {
        finishFlood();
      }
    } else {
      // Once the stars are home the water drains back down.
      live.waterY += (WATER_SURFACE - live.waterY) * Math.min(1, dt * 0.4);
      setQuake(0);
    }
  },

  fell() {},
  canSneak: () => true,

  // On the tower stair, walking roughly up or down it follows the curve, so you
  // can run it without fighting the mouse.
  steer(b, dx, dz) {
    const rx = b.x - TOWER.x;
    const rz = b.z - TOWER.z;
    const r = Math.hypot(rx, rz);
    if (r < TOWER.core - 0.2 || r > TOWER.outer + 0.2 || b.ground < 0.2) return [dx, dz];
    const len = Math.hypot(dx, dz);
    // Up the stair is the direction of increasing angle round the tower.
    const tx = rz / r;
    const tz = -rx / r;
    const along = (dx * tx + dz * tz) / len;
    if (Math.abs(along) < 0.35) return [dx, dz];
    const sign = Math.sign(along);
    // Mostly along the curve, with a little pull back to the middle of the steps.
    const mid = (TOWER.core + TOWER.outer) / 2;
    const inward = ((r - mid) / (TOWER.outer - TOWER.core)) * 0.6;
    const gx = tx * sign - (rx / r) * inward;
    const gz = tz * sign - (rz / r) * inward;
    const g = Math.hypot(gx, gz);
    return [(gx / g) * len, (gz / g) * len];
  },

  // Knee-deep water: slow going, and you can't really run.
  pace: () => (live.wading ? { walk: 2.6, run: 3.3, sneak: 1.6 } : null),

  surface(b) {
    if (live.wading) return 'water';
    if (Math.abs(b.ground - BOARD) < 0.02 && boardwalkAt(b.x, b.z)) return 'wood';
    const inChapel = b.x > CHAPEL.minX && b.x < CHAPEL.maxX && b.z > CHAPEL.minZ && b.z < CHAPEL.maxZ;
    return inChapel || b.ground > 0.2 ? 'stone' : 'dirt';
  },

  after({ b, playing }) {
    const f = store.get().fen;
    live.wading = b.ground <= WATER_FLOOR + 0.05 && !flooding();

    // Walk into a star to pick it up.
    if (f.stage < FEN.FLOOD) {
      for (const s of STARS) {
        if (!f.stars.includes(s.id) && Math.hypot(s.x - b.x, s.z - b.z) < 1.4) collectStar(s.id);
      }
    }

    // Walk up to a dark witch-light to light it. Lit ones keep the Drowned away.
    let shelter = null;
    for (const lamp of LANTERNS) {
      const d = Math.hypot(lamp.x - b.x, lamp.z - b.z);
      if (!lanternLit(lamp, f.lit)) {
        if (d < LANTERN_REACH) lightLantern(lamp.id);
      } else if (d < LANTERN_SAFE) {
        shelter = lamp;
      }
    }
    if (shelter) b.wake = shelter.wake;
    live.safe = Boolean(shelter);

    // The line under the crosshair.
    const f2 = store.get().fen;
    if (flooding()) {
      const riseIn = Math.ceil(live.flood.riseAt - live.gameTime);
      live.status = { text: riseIn > 0 ? `THE WATER RISES IN ${riseIn}... GET TO THE TOWER!` : 'THE WATER IS RISING! CLIMB!', alarm: true, hunted: true };
    } else if (live.hunted > 0 && playing) {
      live.status = { text: 'THE DROWNED ARE COMING! GET OUT OF THE WATER!', alarm: true, hunted: true };
    } else if (live.wading && playing && f2.stage < FEN.DONE) {
      live.status = { text: live.sneaking ? 'WADING QUIETLY...' : 'WADING: THE DROWNED CAN HEAR YOU', alarm: false };
    } else if (live.safe && live.wading) {
      live.status = { text: 'SAFE IN THE WITCH-LIGHT', alarm: false };
    } else {
      live.status = null;
    }
  },

  danger: () => (flooding() ? 1 : 0),

  ambience(b, playing) {
    setChapterAmbience('fen', playing);
  },

  leave() {
    live.flood = null;
    live.waterY = WATER_SURFACE;
    live.wading = false;
    live.status = null;
    live.safe = false;
    setQuake(0);
  },
};

registerRules(2, fenRules);
