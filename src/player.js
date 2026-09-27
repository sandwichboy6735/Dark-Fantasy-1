// First-person body: movement, swimming, flight and AABB collision against the voxel world.
import * as THREE from 'three';
import { SOLID, B } from './blocks.js';

const HW = 0.3, HEIGHT = 1.8, EYE = 1.62;

export class Player {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false; this.flying = false; this.canFly = false;
    this.inWater = false; this.headInWater = false;
    this.move = { f: 0, r: 0, up: false, down: false, sprint: false };
    this.walkPhase = 0; this.stepDist = 0;
    this.autoJump = false;
    this.onStep = null;
    this.lastSpace = 0;
  }

  eye(out) { return out.set(this.pos.x, this.pos.y + EYE + (this.onGround ? Math.sin(this.walkPhase) * 0.045 : 0), this.pos.z); }

  collides(world, x, y, z) {
    const x0 = Math.floor(x - HW), x1 = Math.floor(x + HW);
    const y0 = Math.floor(y), y1 = Math.floor(y + HEIGHT - 0.001);
    const z0 = Math.floor(z - HW), z1 = Math.floor(z + HW);
    for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++)
      if (SOLID[world.getBlock(bx, by, bz)]) return true;
    return false;
  }

  intersectsBlock(bx, by, bz) {
    return bx + 1 > this.pos.x - HW && bx < this.pos.x + HW && by + 1 > this.pos.y && by < this.pos.y + HEIGHT && bz + 1 > this.pos.z - HW && bz < this.pos.z + HW;
  }

  toggleFly() { if (this.canFly) { this.flying = !this.flying; this.vel.y = 0; } return this.flying; }

  update(dt, world) {
    const p = this.pos, v = this.vel, m = this.move;
    const feet = world.getBlock(Math.floor(p.x), Math.floor(p.y + 0.4), Math.floor(p.z));
    const head = world.getBlock(Math.floor(p.x), Math.floor(p.y + EYE), Math.floor(p.z));
    this.inWater = feet === B.WATER;
    this.headInWater = head === B.WATER;

    // Desired horizontal velocity
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let fx = -sin * m.f + cos * m.r, fz = -cos * m.f - sin * m.r;
    const len = Math.hypot(fx, fz);
    if (len > 1) { fx /= len; fz /= len; }
    let speed = this.flying ? (m.sprint ? 22 : 11) : (m.sprint ? 6.2 : 4.3);
    if (this.inWater && !this.flying) speed *= 0.55;
    const accel = this.flying ? 8 : this.onGround ? 14 : 4;
    v.x += (fx * speed - v.x) * Math.min(1, accel * dt);
    v.z += (fz * speed - v.z) * Math.min(1, accel * dt);

    if (this.flying) {
      const vy = (m.up ? 1 : 0) - (m.down ? 1 : 0);
      v.y += (vy * speed * 0.8 - v.y) * Math.min(1, 8 * dt);
    } else if (this.inWater) {
      v.y -= 9 * dt;
      v.y *= Math.pow(0.2, dt);
      if (m.up) v.y = Math.min(v.y + 22 * dt, 3.6);
      if (v.y < -4) v.y = -4;
    } else {
      v.y -= 28 * dt;
      if (v.y < -50) v.y = -50;
      if (m.up && this.onGround) { v.y = 8.6; this.onGround = false; }
    }

    // Integrate with collision, axis by axis
    const blockedH = this.moveAxis(world, 0, v.x * dt) | this.moveAxis(world, 2, v.z * dt);
    this.onGround = false;
    this.moveAxis(world, 1, v.y * dt);
    if (blockedH && this.autoJump && this.onGround && len > 0.1 && !this.inWater) {
      const tx = Math.floor(p.x + fx * 0.6), tz = Math.floor(p.z + fz * 0.6), ty = Math.floor(p.y);
      if (SOLID[world.getBlock(tx, ty, tz)] && !SOLID[world.getBlock(tx, ty + 1, tz)] && !SOLID[world.getBlock(tx, ty + 2, tz)]) v.y = 8.6;
    }
    if (this.onGround && this.flying && !m.up) { /* landing keeps flight until toggled */ }

    // Footsteps & head bob
    const hs = Math.hypot(v.x, v.z);
    if (this.onGround && hs > 0.5) {
      this.walkPhase += hs * dt * 2.2;
      this.stepDist += hs * dt;
      if (this.stepDist > (m.sprint ? 2.2 : 1.7)) {
        this.stepDist = 0;
        if (this.onStep) this.onStep(world.getBlock(Math.floor(p.x), Math.floor(p.y - 0.1), Math.floor(p.z)));
      }
    } else this.walkPhase *= 0.9;
  }

  moveAxis(world, axis, d) {
    if (d === 0) return 0;
    const p = this.pos;
    const steps = Math.ceil(Math.abs(d) / 0.45);
    const sd = d / steps;
    for (let s = 0; s < steps; s++) {
      p.setComponent(axis, p.getComponent(axis) + sd);
      if (!this.collides(world, p.x, p.y, p.z)) continue;
      if (axis === 1) {
        if (sd < 0) { p.y = Math.floor(p.y) + 1; this.onGround = true; }
        else p.y = Math.floor(p.y + HEIGHT) - HEIGHT - 0.001;
        this.vel.y = 0;
      } else {
        const c = p.getComponent(axis);
        p.setComponent(axis, sd > 0 ? Math.floor(c + HW) - HW - 0.001 : Math.floor(c - HW) + 1 + HW + 0.001);
        this.vel.setComponent(axis, 0);
      }
      return 1;
    }
    return 0;
  }
}
