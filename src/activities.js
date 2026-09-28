// Things you can join in on: a bonfire dance, a village sing-along, a broom race,
// hide and seek with a ghost, and a ferry ride across the Mirror Lake.
import * as THREE from 'three';

const FIRE = [-640, 140], SQUARE = [5, 38], RACE_C = [640, 20], GRAVES = [430, 500];
const SEEK_SPOTS = [[436, 471], [408, 479], [455, 522], [396, 516], [470, 489], [428, 528]];

export class Activities {
  constructor(ctx) {
    this.c = ctx; // { scene, player, npcs, world, T, audio, particles, whisper, banner, hud, burst, save, data }
    this.cur = null;
    this.buildRings();
  }

  get active() { return !!this.cur; }
  get label() { return this.cur ? this.cur.stopLabel : ''; }

  start(name) {
    if (this.cur) this.stop(true);
    if (name !== 'race' && this.c.player.broom) this.c.dismount();
    const fn = { dance: this.dance, song: this.song, race: this.race, seek: this.seek, boat: this.boat }[name];
    if (fn) this.cur = fn.call(this);
  }

  stop(silent = false) {
    const cur = this.cur; if (!cur) return;
    this.cur = null;
    this.c.audio.stopMusic();
    this.c.hud('');
    const p = this.c.player;
    p.frozen = false; p.dance = 0;
    if (cur.cleanup) cur.cleanup(silent);
  }

  update(dt, t) { if (this.cur) this.cur.update(dt, t); }

  // Move a group of NPCs into a ring, remembering where they were
  gather(list) {
    const saved = list.map((n) => ({ n, pos: n.pos.clone(), facing: n.facing }));
    return () => { for (const s of saved) { s.n.override = null; s.n.pos.copy(s.pos); s.n.facing = s.facing; s.n.target = null; } };
  }

  // ---------- Bonfire dance with the goblins ----------
  dance() {
    const { npcs, player, audio, T } = this.c;
    const gobs = npcs.filter((n) => n.def.type === 'goblin' && Math.hypot(n.pos.x - FIRE[0], n.pos.z - FIRE[1]) < 90);
    const restore = this.gather(gobs);
    const slots = gobs.length + 1;
    let ang = 0, time = 0, sparkT = 0;
    gobs.forEach((n, i) => {
      n.override = (dt) => {
        const a = ang + ((i + 1) / slots) * Math.PI * 2;
        n.pos.set(FIRE[0] + Math.cos(a) * 7, 0, FIRE[1] + Math.sin(a) * 7);
        n.pos.y = T.heightAt(n.pos.x, n.pos.z) + Math.abs(Math.sin(time * 5 + i)) * 0.45;
        n.facing = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.sin(time * 3 + i) * 0.8;
        n.model.rotation.z = Math.sin(time * 5 + i) * 0.15;
      };
    });
    player.frozen = true; player.dance = 0.01;
    audio.playMusic('jig');
    this.c.whisper('Round and round the bonfire! Press E to stop dancing.', 3);
    return {
      stopLabel: 'Stop dancing',
      update: (dt) => {
        time += dt; ang += dt * 0.55;
        player.pos.set(FIRE[0] + Math.cos(ang) * 7, 0, FIRE[1] + Math.sin(ang) * 7);
        player.pos.y = T.heightAt(player.pos.x, player.pos.z);
        player.facing = Math.atan2(-Math.sin(ang), Math.cos(ang));
        sparkT -= dt;
        if (sparkT <= 0) { sparkT = 1.2; this.c.burst(FIRE[0], T.heightAt(...FIRE) + 2, FIRE[1], [[2, 0.5, 0.3], [0.4, 2, 0.6], [0.5, 0.7, 2.2], [2, 0.4, 2]], 30, 9, 3, 1.8); }
        this.c.hud('Dancing round the bonfire ♪');
        if (time > 40) this.stop();
      },
      cleanup: (silent) => { restore(); if (!silent) this.c.whisper('The goblins bow. “Same time tomorrow!”'); },
    };
  }

  // ---------- Sing-along in Emberlight ----------
  song() {
    const { npcs, player, audio, T } = this.c;
    const pip = npcs.find((n) => n.name === 'Pip');
    const folk = npcs.filter((n) => n !== pip && (n.def.type === 'villager' || n.def.type === 'cat') && n.def.beh !== 'boat' && Math.hypot(n.pos.x - SQUARE[0], n.pos.z - SQUARE[1]) < 90);
    const restore = this.gather([pip, ...folk]);
    const cx = pip.pos.x, cz = pip.pos.z;
    let time = 0, noteT = 0;
    pip.override = () => { pip.facing += 0.01; pip.model.rotation.z = Math.sin(time * 3) * 0.1; pip.pos.y = T.heightAt(cx, cz) + Math.abs(Math.sin(time * 4)) * 0.1; };
    const slots = folk.length + 1;
    folk.forEach((n, i) => {
      const a = ((i + 1) / slots) * Math.PI * 2;
      n.override = () => {
        n.pos.set(cx + Math.cos(a) * 5.5, 0, cz + Math.sin(a) * 5.5);
        n.pos.y = T.heightAt(n.pos.x, n.pos.z) + Math.abs(Math.sin(time * 2.6 + i)) * 0.12;
        n.facing = Math.atan2(cx - n.pos.x, cz - n.pos.z);
        n.model.rotation.z = Math.sin(time * 2.6 + i) * 0.12;
      };
    });
    player.frozen = true;
    player.pos.set(cx + 5.5, 0, cz); player.pos.y = T.heightAt(player.pos.x, player.pos.z);
    player.facing = Math.atan2(cx - player.pos.x, cz - player.pos.z);
    audio.playMusic('song');
    return {
      stopLabel: 'Stop singing',
      update: (dt) => {
        time += dt; noteT -= dt;
        player.model.rotation.z = Math.sin(time * 2.6) * 0.12;
        if (noteT <= 0) {
          noteT = 0.35;
          const a = Math.random() * Math.PI * 2;
          this.c.particles.sparkle(cx + Math.cos(a) * 5, T.heightAt(cx, cz) + 2.2, cz + Math.sin(a) * 5, 0, 1.2, 0, [1.8, 1.4, 0.5], 2.2);
        }
        this.c.hud('Singing with Emberlight ♫');
        if (time > 35) this.stop();
      },
      cleanup: (silent) => { restore(); if (!silent) this.c.whisper('Everyone claps. Pip bows so low his hat falls off.'); },
    };
  }

  // ---------- Broom race through glowing rings ----------
  buildRings() {
    const { scene, T } = this.c;
    this.rings = [];
    const geo = new THREE.TorusGeometry(4.5, 0.28, 8, 36);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = RACE_C[0] + Math.cos(a) * 125, z = RACE_C[1] + Math.sin(a) * 125;
      const y = T.heightAt(x, z) + 26 + Math.sin(i * 1.7) * 10;
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.35, 1.2) }));
      m.position.set(x, y, z);
      m.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)); // face along the loop
      scene.add(m);
      this.rings.push(m);
    }
  }

  race() {
    const { player, audio, data } = this.c;
    if (!player.broom) this.c.giveBroom(true);
    let next = 0, time = 0;
    const col = (m, c) => m.material.color.setRGB(...c);
    const paint = () => this.rings.forEach((m, i) => col(m, i < next ? [0.15, 0.2, 0.5] : i === next ? [2.4, 1.7, 0.4] : [0.5, 0.35, 1.2]));
    paint();
    audio.playMusic('race');
    return {
      stopLabel: 'Give up the race',
      update: (dt, t) => {
        time += dt;
        const r = this.rings[next];
        r.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
        if (player.pos.distanceTo(r.position) < 5) {
          r.scale.setScalar(1);
          audio.ding();
          this.c.burst(r.position.x, r.position.y, r.position.z, [[2.4, 1.7, 0.4]], 30, 0, 5, 1);
          next++;
          if (next >= this.rings.length) {
            const best = data.raceBest ? Math.min(data.raceBest, time) : time;
            const record = !data.raceBest || time < data.raceBest;
            data.raceBest = best;
            audio.fanfare();
            this.c.banner(time.toFixed(1) + ' seconds', record ? 'A new record! Hazel will tell everyone.' : 'Your best is ' + best.toFixed(1) + ' seconds.', 'Race finished');
            this.c.save();
            this.stop(true);
            return;
          }
          paint();
        }
        this.c.hud(`Broom race · ring ${next + 1} of ${this.rings.length} · ${time.toFixed(1)}s`);
        if (time > 240) this.stop();
      },
      cleanup: () => { this.rings.forEach((m) => { col(m, [0.5, 0.35, 1.2]); m.scale.setScalar(1); }); },
    };
  }

  // ---------- Hide and seek with Little Bo ----------
  seek() {
    const { npcs, player, audio, T } = this.c;
    const bo = npcs.find((n) => n.name === 'Little Bo');
    const restore = this.gather([bo]);
    let round = 0, time = 0, spot = null, hintT = 4;
    const hide = () => {
      const opts = SEEK_SPOTS.filter((s) => !spot || s !== spot);
      spot = opts[(Math.random() * opts.length) | 0];
      time = 0;
    };
    hide();
    bo.override = (dt, t) => {
      bo.pos.set(spot[0], T.heightAt(spot[0], spot[1]) + 0.3 + Math.sin(t * 2) * 0.1, spot[1]);
      bo.facing += dt * 0.5;
    };
    audio.playMusic('seek');
    return {
      stopLabel: 'Stop playing',
      update: (dt) => {
        time += dt; hintT -= dt;
        const d = Math.hypot(player.pos.x - spot[0], player.pos.z - spot[1]);
        if (d < 3.5) {
          round++;
          audio.ding(); audio.talk(1.9); setTimeout(() => audio.talk(2.1), 120);
          this.c.burst(spot[0], bo.pos.y + 1, spot[1], [[0.7, 1.4, 2.2]], 40, 3, 2, 1.5);
          if (round >= 3) {
            this.c.banner('Found her!', 'Three times! Little Bo says you’re the best seeker in the graves.', 'Hide and seek');
            this.stop(true);
            return;
          }
          this.c.whisper('“You found me! Okay, I’m hiding again. No peeking!”', 3);
          hide(); hintT = 5;
        }
        if (hintT <= 0) {
          hintT = 7;
          const a = Math.atan2(spot[0] - player.pos.x, spot[1] - player.pos.z);
          const dirs = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
          const idx = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
          this.c.whisper(d < 12 ? 'You hear a tiny giggle, very close...' : 'A giggle drifts from the ' + dirs[idx] + '.', 3);
          audio.talk(2);
        }
        this.c.hud(`Hide and seek · found ${round} of 3`);
        if (time > 120) { this.c.whisper('“I win! You can try again anytime.”'); this.stop(true); }
      },
      cleanup: () => restore(),
    };
  }

  // ---------- Ferry ride with Charon ----------
  boat() {
    const { npcs, player, audio } = this.c;
    const ch = npcs.find((n) => n.name === 'Charon');
    const restore = this.gather([ch]);
    const start = 1.25;
    let th = start, time = 0;
    const at = (a) => [Math.cos(a) * 190, 205 + Math.sin(a) * 72];
    ch.override = () => {
      const [x, z] = at(th);
      ch.pos.set(x, 18.4, z);
      const [nx, nz] = at(th + 0.05);
      ch.facing = Math.atan2(nx - x, nz - z);
    };
    player.frozen = true;
    audio.playMusic('boat');
    this.c.whisper('Charon rows you out onto the Mirror Lake. Look at the moon on the water.', 4);
    return {
      stopLabel: 'Hop off at the dock',
      update: (dt) => {
        time += dt; th += dt * 0.12;
        ch.override();
        const off = new THREE.Vector3(0, 0, -1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), ch.facing);
        player.pos.set(ch.pos.x + off.x, 18.5, ch.pos.z + off.z);
        player.facing = ch.facing;
        this.c.hud('Riding the ferry across the Mirror Lake');
        if (th > start + Math.PI * 2) this.stop();
      },
      cleanup: () => {
        restore();
        player.place(62, 302, Math.PI);
        this.c.whisper('“Mind the step. Come again. I’ll be here. I’m always here.”');
      },
    };
  }
}
