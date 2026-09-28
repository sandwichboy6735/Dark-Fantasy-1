// The wanderer: third-person movement with running, jumping, gliding, swimming and magic lifts.
import * as THREE from 'three';
import { WATER_Y, CLOUD_Y } from './layout.js';

const R = 0.4, H = 1.8;

export class Player {
  constructor(model, world, terrain) {
    this.model = model; this.world = world; this.T = terrain;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.facing = 0;
    this.grounded = false; this.gliding = false; this.swimming = false;
    this.input = { x: 0, z: 0, run: false, jump: false };
    this.jumpHeld = false;
    this.camYaw = 0; this.camPitch = 0.28; this.camDist = 7;
    this.lastSafe = new THREE.Vector3();
    this.phase = 0;
    this.lift = null; // scripted flight
    this.onStep = null; this.onLand = null; this.onFallIntoClouds = null; this.onLift = null;
    this.stepAcc = 0;
    this.wellCooldown = 0;
    this.broom = false; this.broomModel = null;
    this.frozen = false; this.dance = 0;
  }

  setBroom(on) {
    this.broom = on;
    if (this.broomModel) this.broomModel.visible = on;
    this.vel.set(0, on ? 2 : 0, 0);
    if (on) { this.grounded = false; this.pos.y += 0.6; }
  }

  updateBroom(dt) {
    const p = this.pos, v = this.vel, inp = this.input, w = this.world;
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const fx = -Math.sin(this.camYaw) * cp, fy = -sp * 0.9, fz = -Math.cos(this.camYaw) * cp;
    const rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw);
    const speed = inp.run ? 30 : 17;
    let tx = (fx * inp.z + rx * inp.x) * speed, tz = (fz * inp.z + rz * inp.x) * speed;
    let ty = fy * inp.z * speed + (inp.jump ? 9 : 0) - (inp.down ? 9 : 0);
    const k = Math.min(1, dt * 3);
    v.x += (tx - v.x) * k; v.y += (ty - v.y) * k; v.z += (tz - v.z) * k;
    p.addScaledVector(v, dt);
    w.collide(p, 0.5, 1.8);
    const g = w.groundAt(p.x, p.z, p.y + 1);
    if (p.y < g + 0.4) { p.y = g + 0.4; if (v.y < 0) v.y = 0; }
    if (p.y > 900) p.y = 900;
    if (p.y < -26) { if (this.onFallIntoClouds) this.onFallIntoClouds(); p.copy(this.lastSafe); p.y += 3; v.set(0, 0, 0); }
    const hs = Math.hypot(v.x, v.z);
    if (hs > 0.5) {
      const target = Math.atan2(v.x, v.z);
      let d = target - this.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.facing += d * Math.min(1, dt * 6);
    }
    this.gliding = false; this.grounded = false;
    const m = this.model;
    this.phase += dt;
    m.position.copy(p); m.position.y += Math.sin(this.phase * 2.2) * 0.12;
    m.rotation.set(Math.max(-0.4, Math.min(0.4, -v.y * 0.02)) + Math.min(0.25, hs * 0.008), this.facing, Math.sin(this.phase * 1.3) * 0.06, 'YXZ');
    m.scale.x += (1 - m.scale.x) * Math.min(1, dt * 6);
  }

  place(x, z, facing = 0) {
    this.pos.set(x, this.world.groundAt(x, z, 1e4) + 0.05, z);
    this.vel.set(0, 0, 0);
    this.facing = facing; this.camYaw = facing + Math.PI;
    this.lastSafe.copy(this.pos);
    this.model.position.copy(this.pos);
    this.teleported = true;
  }

  startLift(to, label) {
    const from = this.pos.clone();
    const dest = new THREE.Vector3(to[0], 0, to[2]);
    dest.y = (to[1] ?? this.world.groundAt(to[0], to[2], 1e4)) + 0.1;
    const peak = Math.max(from.y, dest.y) + 18;
    this.lift = { from, dest, peak, t: 0, dur: 2.2 + from.distanceTo(dest) / 60 };
    this.vel.set(0, 0, 0);
    if (this.onLift) this.onLift(label);
  }

  update(dt) {
    const w = this.world, p = this.pos, v = this.vel, inp = this.input;
    this.wellCooldown -= dt;
    if (this.frozen) { this.animate(dt, 0); return; }
    if (this.broom && !this.lift) { this.updateBroom(dt); return; }

    if (this.lift) {
      const L = this.lift;
      L.t += dt / L.dur;
      const t = Math.min(1, L.t), e = t * t * (3 - 2 * t);
      p.lerpVectors(L.from, L.dest, e);
      p.y = (1 - e) * (1 - e) * L.from.y + 2 * (1 - e) * e * (L.peak + 10) + e * e * L.dest.y;
      const dx = L.dest.x - L.from.x, dz = L.dest.z - L.from.z;
      if (Math.hypot(dx, dz) > 1) this.facing = Math.atan2(dx, dz);
      this.gliding = true;
      if (t >= 1) { this.lift = null; this.gliding = false; this.wellCooldown = 1.5; this.grounded = true; }
      this.animate(dt, 0);
      return;
    }

    // Desired movement relative to the camera
    const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
    let mx = -sin * inp.z + cos * inp.x;
    let mz = -cos * inp.z - sin * inp.x;
    const len = Math.hypot(mx, mz);
    const mag = Math.min(1, len);
    if (len > 0.01) { mx /= len; mz /= len; }
    const run = inp.run || mag > 0.95 && inp.touchRun;
    let speed = (run ? 9.5 : 5) * mag;
    if (this.swimming) speed *= 0.55;
    if (this.gliding) speed = Math.max(speed, 12);

    const accel = this.grounded ? 12 : this.gliding ? 2.2 : 3;
    let tx = mx * speed, tz = mz * speed;
    if (this.gliding && mag < 0.05) { tx = Math.sin(this.facing) * 12; tz = Math.cos(this.facing) * 12; }
    v.x += (tx - v.x) * Math.min(1, accel * dt);
    v.z += (tz - v.z) * Math.min(1, accel * dt);

    // Jump / glide
    const jumpPressed = inp.jump && !this.jumpHeld;
    this.jumpHeld = inp.jump;
    if (jumpPressed && (this.grounded || this.swimming)) { v.y = this.swimming ? 6 : 8.2; this.grounded = false; }
    this.gliding = !this.grounded && !this.swimming && inp.jump && v.y < 0;
    v.y -= 22 * dt;
    if (this.gliding) v.y = Math.max(v.y, -1.3);
    if (v.y < -40) v.y = -40;

    // Integrate horizontally, refusing cliffs that are too steep to walk up
    const ox = p.x, oz = p.z;
    const g0 = w.groundAt(p.x, p.z, p.y);
    p.x += v.x * dt; p.z += v.z * dt;
    const g1 = w.groundAt(p.x, p.z, p.y);
    if (this.grounded && g1 - g0 > 1.4 * Math.hypot(p.x - ox, p.z - oz) + 0.35) { p.x = ox; p.z = oz; v.x *= 0.2; v.z *= 0.2; }
    if (w.collide(p, R, H)) { /* pushed out */ }

    // Vertical
    p.y += v.y * dt;
    const g = w.groundAt(p.x, p.z, p.y);
    const wasGrounded = this.grounded;
    this.swimming = false;
    const lakeFloat = WATER_Y - 1.25;
    if (g < lakeFloat && p.y <= lakeFloat + 0.05 && Math.abs(p.x) < 290 && Math.abs(p.z - 205) < 160) {
      p.y = lakeFloat; if (v.y < 0) v.y = 0; this.swimming = true; this.grounded = false;
    } else if (p.y <= g + 0.02) {
      if (!wasGrounded && v.y < -12 && this.onLand) this.onLand();
      p.y = g; if (v.y < 0) v.y = 0; this.grounded = true;
    } else if (this.grounded && p.y - g < 0.6 && p.y - g < Math.hypot(p.x - ox, p.z - oz) * 1.2 + 0.03 && v.y <= 0) {
      p.y = g; v.y = 0;
    } else this.grounded = false;

    if (this.grounded && g > CLOUD_Y + 20) this.lastSafe.copy(p);

    // Updrafts and lifts
    if (this.wellCooldown <= 0) for (const well of this.world.wells) {
      const dx = p.x - well.x, dz = p.z - well.z;
      if (dx * dx + dz * dz > well.r * well.r) continue;
      const wy = well.y();
      if (p.y < wy - 1 || p.y > wy + 3) continue;
      if (well.to) { this.startLift(well.to, well.label); return; }
      v.y = Math.max(v.y, well.boost); this.grounded = false; this.wellCooldown = 0.4;
      if (this.onLift) this.onLift(null);
    }

    // Fell into the cloud sea: the clouds carry you back
    if (p.y < CLOUD_Y + 4) {
      if (this.onFallIntoClouds) this.onFallIntoClouds();
      p.copy(this.lastSafe); p.y += 0.5; v.set(0, 0, 0);
    }

    // Face the direction of travel
    const hs = Math.hypot(v.x, v.z);
    if (hs > 0.3) {
      const target = Math.atan2(v.x, v.z);
      let d = target - this.facing;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.facing += d * Math.min(1, dt * 10);
    }
    if (this.grounded && hs > 0.5) {
      this.stepAcc += hs * dt;
      if (this.stepAcc > (run ? 2.4 : 1.6)) { this.stepAcc = 0; if (this.onStep) this.onStep(); }
    }
    this.animate(dt, hs);
  }

  animate(dt, hs) {
    const m = this.model;
    this.phase += dt * (2 + hs * 1.4);
    m.position.copy(this.pos);
    if (this.grounded && hs > 0.5) {
      m.position.y += Math.abs(Math.sin(this.phase)) * 0.07;
      m.rotation.z = Math.sin(this.phase) * 0.05;
      m.rotation.x = Math.min(0.15, hs * 0.012);
    } else if (this.gliding) {
      m.rotation.x = 0.35; m.rotation.z = Math.sin(this.phase * 0.4) * 0.1;
    } else { m.rotation.x *= 0.9; m.rotation.z *= 0.9; }
    m.rotation.y = this.facing;
    if (this.dance > 0) {
      this.dance += dt;
      m.position.y += Math.abs(Math.sin(this.dance * 5)) * 0.35;
      m.rotation.y += Math.sin(this.dance * 2.5) * 0.9;
      m.rotation.z = Math.sin(this.dance * 5) * 0.12;
    }
    m.scale.x += ((this.gliding ? 1.6 : 1) - m.scale.x) * Math.min(1, dt * 6);
    if (this.swimming) m.position.y -= 0.1;
  }

  // Third-person camera with terrain avoidance
  updateCamera(cam, dt) {
    const target = new THREE.Vector3(this.pos.x, this.pos.y + 1.7, this.pos.z);
    const cp = Math.cos(this.camPitch);
    const want = new THREE.Vector3(
      target.x + Math.sin(this.camYaw) * cp * this.camDist,
      target.y + Math.sin(this.camPitch) * this.camDist,
      target.z + Math.cos(this.camYaw) * cp * this.camDist,
    );
    // Pull the camera in if a hill is between it and the wanderer
    let dist = this.camDist;
    for (let i = 1; i <= 14; i++) {
      const f = i / 14;
      const x = target.x + (want.x - target.x) * f, y = target.y + (want.y - target.y) * f, z = target.z + (want.z - target.z) * f;
      if (this.T.heightAt(x, z) + 0.5 > y || this.world.pointBlocked(x, y, z)) { dist = Math.max(1.2, this.camDist * (f - 0.1)); break; }
    }
    if (dist < this.camDist) want.lerpVectors(target, want, dist / this.camDist);
    const g = this.T.heightAt(want.x, want.z) + 0.5;
    if (want.y < g) want.y = g;
    if (!this._cam) this._cam = want.clone();
    this._cam.lerp(want, 1 - Math.exp(-dt * 12));
    cam.position.copy(this._cam);
    cam.lookAt(target);
  }
}
