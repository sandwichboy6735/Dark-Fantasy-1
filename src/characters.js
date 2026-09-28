// Character models built from simple shapes, plus the NPC brain (wander, patrol, fly, float, talk).
import * as THREE from 'three';
import { Kit } from './kit.js';

const V2 = (pts) => pts.map(([x, y]) => [x, y]);

function robe(k, color, h = 1.5, r = 0.44, flare = 1) {
  k.lathe('cloth', V2([[0.001, 0], [r * flare, 0.02], [r * 0.92, 0.3], [r * 0.72, h * 0.62], [r * 0.52, h * 0.9], [0.2, h], [0.001, h + 0.03]]), 14, color, { shadeY: 0.35, bright: 0.8 });
}
function sleeves(k, color, skin, y = 1.18, spread = 0.55, reach = 0.0) {
  for (const s of [-1, 1]) {
    k.cone('cloth', 0.12, 0.62, 7, color, { x: s * 0.3, y, z: reach, rz: s * spread, rx: -0.2 });
    k.sphere('skin', 0.07, skin, { x: s * (0.3 + Math.sin(spread) * 0.34), y: y - 0.3, z: reach + 0.06 });
  }
}
function head(k, y, skin, r = 0.16) { k.sphere('skin', r, skin, { y, ws: 12, hs: 10 }); }
function eyes(k, y, z, color = '#1a1418', sep = 0.055, r = 0.022, kind = 'plain') {
  for (const s of [-1, 1]) k.sphere(kind, r, color, { x: s * sep, y, z, ws: 6, hs: 5, bright: kind === 'glow' ? 2.5 : 1 });
}
function pointyHat(k, y, color, r = 0.3, h = 0.8, brim = 0.46, bend = 0.25) {
  k.cyl('cloth', brim, brim, 0.035, 18, color, { y });
  k.cone('cloth', r, h * 0.55, 12, color, { y: y + h * 0.27 });
  k.cone('cloth', r * 0.55, h * 0.5, 10, color, { y: y + h * 0.62, z: -bend * 0.2, rx: -bend });
  k.cyl('cloth', r * 1.02, r * 1.02, 0.06, 14, '#1a1620', { y: y + 0.05 });
}

export function buildCharacter(mats, type, o = {}) {
  const k = new Kit(mats);
  const skin = o.skin || '#e0b89a';
  let height = 1.8, radius = 0.4;
  switch (type) {
    case 'wizard': {
      robe(k, o.robe || '#3a3a7a', 1.52, 0.44);
      k.lathe('cloth', V2([[0.001, 0.9], [0.5, 0.95], [0.46, 1.3], [0.28, 1.5], [0.001, 1.52]]), 12, o.cloak || o.robe || '#2e2e62', { bright: 0.7, sz: 0.9, z: -0.05 });
      sleeves(k, o.robe || '#3a3a7a', skin, 1.2, 0.5, 0.05);
      head(k, 1.66, skin);
      eyes(k, 1.68, 0.14);
      if (o.beard !== false) k.cone('plain', 0.14, 0.5, 8, o.beardColor || '#d8d4dc', { y: 1.42, z: 0.1, rx: Math.PI + 0.25 });
      pointyHat(k, 1.76, o.hat || '#2a2a5c', 0.3, o.hatH || 0.85);
      if (o.staff !== false) {
        k.cyl('wood', 0.025, 0.03, 1.95, 6, '#4a3526', { x: 0.52, y: 0.98, z: 0.12 });
        k.sphere('glow', 0.09, o.orb || '#9fd0ff', { x: 0.52, y: 2.0, z: 0.12, bright: 3 });
      }
      height = 2.5;
      break;
    }
    case 'witch': {
      robe(k, o.robe || '#2a2240', 1.5, 0.42, 1.1);
      sleeves(k, o.robe || '#2a2240', skin, 1.2, 0.35);
      head(k, 1.64, skin, 0.15);
      eyes(k, 1.66, 0.135, '#1a1418');
      k.cone('plain', 0.2, 0.7, 8, o.hair || '#4a2a2a', { y: 1.35, z: -0.08, rx: Math.PI });
      k.sphere('plain', 0.17, o.hair || '#4a2a2a', { y: 1.7, z: -0.05, sy: 0.9 });
      pointyHat(k, 1.74, o.hat || '#1e1a30', 0.28, 0.95, 0.55, 0.45);
      if (o.broom) {
        k.cyl('wood', 0.03, 0.03, 2.2, 5, '#5a4030', { y: 0.7, z: 0.1, rx: Math.PI / 2 });
        k.cone('thatch', 0.22, 0.6, 8, '#a08858', { y: 0.7, z: -1.2, rx: -Math.PI / 2 });
      }
      height = 2.6;
      break;
    }
    case 'goblin': {
      const vest = o.vest || '#8a1f2a';
      const g = o.skin || '#6b7a3a';
      for (const s of [-1, 1]) {
        k.cyl('cloth', 0.08, 0.09, 0.45, 6, '#2e2a26', { x: s * 0.13, y: 0.22 });
        k.box('plain', 0.14, 0.08, 0.26, '#2a201a', { x: s * 0.13, y: 0.04, z: 0.05 });
      }
      k.lathe('cloth', V2([[0.001, 0.4], [0.3, 0.42], [0.36, 0.65], [0.34, 0.85], [0.22, 1.0], [0.001, 1.02]]), 12, vest, { bright: 0.9 });
      k.box('plain', 0.12, 0.4, 0.05, '#e8e0d0', { y: 0.78, z: 0.3 });
      for (let i = 0; i < 3; i++) k.sphere('metal', 0.022, '#c8a860', { x: 0.07, y: 0.62 + i * 0.1, z: 0.33, ws: 5, hs: 4 });
      for (const s of [-1, 1]) {
        k.cone('cloth', 0.11, 0.45, 7, '#e8e0d0', { x: s * 0.33, y: 0.8, rz: s * 0.7 });
        k.sphere('skin', 0.08, g, { x: s * 0.5, y: 0.62, z: 0.05 });
      }
      k.sphere('skin', 0.27, g, { y: 1.2, sx: 1.1, ws: 12, hs: 10 });
      k.sphere('skin', 0.2, g, { y: 1.08, z: 0.1, sx: 1.2, sy: 0.7 });
      for (const s of [-1, 1]) k.cone('skin', 0.09, 0.5, 6, g, { x: s * 0.42, y: 1.28, rz: s * -1.3, rx: 0.2 });
      k.cone('skin', 0.06, 0.2, 6, g, { y: 1.18, z: 0.3, rx: Math.PI / 2 + 0.3 });
      eyes(k, 1.28, 0.23, o.eyes || '#ffcc40', 0.1, 0.035, 'glow');
      for (let i = 0; i < 4; i++) k.cone('plain', 0.02, 0.07, 4, '#eee6cc', { x: -0.09 + i * 0.06, y: 1.03, z: 0.27, rx: Math.PI });
      if (o.monocle) k.add('metal', new THREE.TorusGeometry(0.06, 0.012, 6, 14), '#d8b860', { x: 0.1, y: 1.28, z: 0.27 });
      if (o.lantern) {
        k.box('metal', 0.16, 0.03, 0.16, '#2a2622', { x: 0.52, y: 0.56, z: 0.12 }); k.box('metal', 0.16, 0.03, 0.16, '#2a2622', { x: 0.52, y: 0.34, z: 0.12 });
        k.box('glow', 0.12, 0.2, 0.12, '#ffa040', { x: 0.52, y: 0.45, z: 0.12, bright: 3 });
      }
      if (o.hat) k.cyl('cloth', 0.16, 0.2, 0.3, 10, o.hat, { y: 1.52, rz: 0.15 });
      height = 1.6; radius = 0.4;
      break;
    }
    case 'villager': {
      const c = o.robe || '#5a4a3a';
      const s = o.child ? 0.62 : 1;
      robe(k, c, 1.45 * s, 0.4 * s);
      if (o.apron) k.box('plain', 0.4 * s, 0.7 * s, 0.05, o.apron, { y: 0.55 * s, z: 0.3 * s });
      sleeves(k, c, skin, 1.15 * s, 0.4);
      head(k, 1.6 * s, skin, 0.16 * s);
      eyes(k, 1.62 * s, 0.14 * s);
      if (o.hood !== false) k.sphere('cloth', 0.21 * s, o.hoodColor || c, { y: 1.63 * s, z: -0.05, sy: 1.1, bright: 0.8 });
      else k.sphere('plain', 0.17 * s, o.hair || '#6a4a30', { y: 1.66 * s, z: -0.04 });
      if (o.hat) { k.cyl('cloth', 0.36, 0.36, 0.03, 14, o.hat, { y: 1.76 }); k.cyl('cloth', 0.17, 0.19, 0.2, 12, o.hat, { y: 1.86 }); if (o.feather) k.cone('plain', 0.03, 0.4, 5, o.feather, { x: 0.15, y: 1.98, rz: -0.6 }); }
      if (o.lantern) { k.box('metal', 0.16, 0.03, 0.16, '#2a2622', { x: 0.48, y: 0.91, z: 0.15 }); k.box('glow', 0.12, 0.2, 0.12, '#ffa040', { x: 0.48, y: 0.8, z: 0.15, bright: 3 }); }
      if (o.lute) { k.sphere('wood', 0.2, '#8a5a30', { x: 0.1, y: 0.95, z: 0.3, sz: 0.4 }); k.box('wood', 0.06, 0.06, 0.6, '#5a3a20', { x: 0.1, y: 1.15, z: 0.3, rx: 1.0, ry: 0.5 }); }
      if (o.tool) k.cyl('wood', 0.03, 0.03, 1.6, 5, '#5a4030', { x: 0.45, y: 0.8, z: 0.1, rz: 0.2 });
      height = 1.9 * s; radius = 0.4 * s;
      break;
    }
    case 'knight': {
      const steel = o.steel || '#9a9cb0';
      for (const s of [-1, 1]) k.cyl('metal', 0.1, 0.11, 0.9, 8, steel, { x: s * 0.14, y: 0.45 });
      k.cyl('metal', 0.3, 0.26, 0.7, 10, steel, { y: 1.15 });
      k.box('cloth', 0.44, 0.75, 0.05, o.tabard || '#2a3a7a', { y: 1.0, z: 0.26 });
      k.box('glow', 0.12, 0.12, 0.02, o.crest || '#e0c060', { y: 1.15, z: 0.29, bright: 1.2 });
      for (const s of [-1, 1]) { k.sphere('metal', 0.14, steel, { x: s * 0.34, y: 1.45 }); k.cyl('metal', 0.07, 0.08, 0.7, 6, steel, { x: s * 0.36, y: 1.1, rz: s * 0.1 }); }
      k.cyl('metal', 0.16, 0.17, 0.36, 12, steel, { y: 1.72 });
      k.sphere('metal', 0.16, steel, { y: 1.9, sy: 0.6 });
      k.box('plain', 0.22, 0.03, 0.02, '#0a0a10', { y: 1.74, z: 0.165 });
      k.cone('cloth', 0.06, 0.45, 6, o.plume || '#a01a2a', { y: 2.1, z: -0.05, rx: -0.5 });
      k.box('cloth', 0.6, 1.3, 0.04, o.cape || '#1c2250', { y: 0.95, z: -0.3, rx: 0.08 });
      k.cyl('wood', 0.025, 0.025, 2.6, 5, '#4a3526', { x: 0.42, y: 1.3, z: 0.15 });
      k.cone('metal', 0.06, 0.3, 4, '#c8c8d8', { x: 0.42, y: 2.75, z: 0.15 });
      k.box('metal', 0.08, 0.7, 0.55, o.shield || '#5a2a2a', { x: -0.42, y: 1.05, z: 0.1 });
      height = 2.2;
      break;
    }
    case 'ghost': {
      const c = o.color || '#9ad8ff';
      k.lathe('ghost', V2([[0.001, 0.3], [0.4, 0.15], [0.38, 0.5], [0.3, 1.2], [0.22, 1.5], [0.001, 1.53]]), 12, c, { bright: 0.9 });
      k.sphere('ghost', 0.2, c, { y: 1.62 });
      for (const s of [-1, 1]) k.cone('ghost', 0.09, 0.6, 6, c, { x: s * 0.3, y: 1.1, rz: s * 0.8 });
      eyes(k, 1.66, 0.17, '#e8ffff', 0.07, 0.035, 'glow');
      height = 1.9;
      break;
    }
    case 'queen': {
      const c = o.robe || '#b8b4e8';
      k.lathe('cloth', V2([[0.001, 0], [0.62, 0.02], [0.5, 0.35], [0.3, 1.0], [0.22, 1.35], [0.2, 1.5], [0.001, 1.55]]), 18, c, { shadeY: 0.3 });
      k.lathe('glow', V2([[0.625, 0.03], [0.625, 0.09]]), 18, o.trim || '#b8c8ff', { bright: 1.6 });
      sleeves(k, c, o.skin || '#e8e0f0', 1.25, 0.35);
      head(k, 1.7, o.skin || '#e8e0f0', 0.15);
      eyes(k, 1.72, 0.135, '#3a3a6a');
      k.cone('plain', 0.22, 1.0, 10, o.hair || '#e0e0f4', { y: 1.35, z: -0.1, rx: Math.PI });
      k.sphere('plain', 0.17, o.hair || '#e0e0f4', { y: 1.75, z: -0.03 });
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; k.cone('glow', 0.03, 0.18, 4, o.crown || '#e8f0ff', { x: Math.cos(a) * 0.13, y: 1.93, z: Math.sin(a) * 0.13, bright: 2.5 }); }
      k.add('glow', new THREE.TorusGeometry(0.4, 0.015, 6, 36), o.crown || '#c0d0ff', { y: 1.9, z: -0.25, bright: 1.8 });
      height = 2.2;
      break;
    }
    case 'cat': {
      k.sphere('cloth', 0.16, '#141218', { y: 0.2, sz: 1.5, sy: 0.9 });
      k.sphere('cloth', 0.11, '#141218', { y: 0.36, z: 0.18 });
      for (const s of [-1, 1]) k.cone('cloth', 0.04, 0.09, 4, '#141218', { x: s * 0.06, y: 0.47, z: 0.18 });
      eyes(k, 0.38, 0.28, '#ffe060', 0.04, 0.018, 'glow');
      k.cyl('cloth', 0.02, 0.03, 0.4, 5, '#141218', { y: 0.35, z: -0.28, rx: -0.5 });
      height = 0.5; radius = 0.25;
      break;
    }
    default: break;
  }
  const g = k.build();
  g.userData.height = height;
  g.userData.radius = radius;
  return g;
}

export function buildDragon(mats) {
  const k = new Kit(mats);
  const c = '#2a2446';
  k.sphere('cloth', 1.6, c, { sz: 3.2, sy: 1.1 });
  k.cyl('cloth', 0.5, 1.0, 5, 8, c, { y: 1.2, z: 5.4, rx: 1.0 });
  k.box('cloth', 1.2, 0.9, 2.4, c, { y: 2.8, z: 8.2 });
  k.cone('cloth', 0.2, 1.1, 5, '#8a86b0', { x: 0.4, y: 3.5, z: 7.6, rx: -2.2 });
  k.cone('cloth', 0.2, 1.1, 5, '#8a86b0', { x: -0.4, y: 3.5, z: 7.6, rx: -2.2 });
  eyes(k, 3.0, 9.1, '#9fe8ff', 0.45, 0.14, 'glow');
  k.cone('cloth', 0.9, 11, 8, c, { z: -8, rx: -Math.PI / 2 - 0.05 });
  for (let i = 0; i < 8; i++) k.cone('cloth', 0.25, 0.8, 4, '#4a4070', { y: 1.5 - i * 0.12, z: 3 - i * 1.8 });
  const body = k.build({ shadows: false });
  const wing = (s) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(14 * s, 3); sh.lineTo(16 * s, -1); sh.lineTo(11 * s, -3); sh.lineTo(8 * s, -6); sh.lineTo(5 * s, -3.5); sh.lineTo(2 * s, -6); sh.lineTo(0, -2.5);
    const g = new THREE.ShapeGeometry(sh);
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3a3060, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x0a0818 }));
    const piv = new THREE.Group(); piv.add(m); piv.position.set(s * 1.1, 1.0, 1.5);
    return piv;
  };
  const wl = wing(1), wr = wing(-1);
  const g = new THREE.Group(); g.add(body, wl, wr);
  return { g, wl, wr };
}

// ---------- NPC behaviour ----------
export class NPC {
  constructor(def, model, world) {
    this.def = def;
    this.model = model;
    this.world = world;
    this.name = def.name; this.title = def.title || ''; this.lines = def.lines || [];
    this.talkable = !!(def.lines && def.lines.length);
    this.voice = def.voice ?? 1;
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.home = new THREE.Vector3(def.x, 0, def.z);
    this.radius = model.userData.radius || 0.4;
    this.facing = def.face ?? Math.random() * Math.PI * 2;
    this.target = null; this.wait = Math.random() * 3; this.phase = Math.random() * 10;
    this.pathI = 0;
    this.talking = false;
    this.speed = def.speed || 1.1;
    this.pos.y = this.ground(def.x, def.z);
    if (def.y !== undefined) this.pos.y = def.y;
    model.position.copy(this.pos);
  }

  ground(x, z) {
    const b = this.def.beh;
    if (b === 'isle') return this.world.groundAt(x, z, 1e4);
    return this.world.groundAt(x, z, (this.pos ? this.pos.y : 1e4) + 2);
  }

  update(dt, t, player) {
    const d = this.def, m = this.model;
    const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
    const pd = Math.hypot(dx, dz);
    const far = pd > 260;
    m.visible = !far || d.beh === 'fly';
    if (far && d.beh !== 'fly') return;
    this.phase += dt;
    let moving = false;
    const near = pd < 6 && Math.abs(player.pos.y - this.pos.y) < 4;

    if (this.talking || (near && d.beh !== 'fly' && d.beh !== 'boat')) {
      this.turnTo(Math.atan2(dx, dz), dt * 4);
    } else if (d.beh === 'wander' || d.beh === 'path') {
      if (!this.target) {
        this.wait -= dt;
        if (this.wait <= 0) {
          if (d.beh === 'path') { this.pathI = (this.pathI + 1) % d.path.length; const [x, z] = d.path[this.pathI]; this.target = new THREE.Vector3(x, 0, z); }
          else { const a = Math.random() * Math.PI * 2, r = Math.random() * (d.radius || 8); this.target = new THREE.Vector3(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r); }
        }
      } else {
        const tx = this.target.x - this.pos.x, tz = this.target.z - this.pos.z, td = Math.hypot(tx, tz);
        if (td < 0.5) { this.target = null; this.wait = d.beh === 'path' ? 0.5 + Math.random() : 2 + Math.random() * 5; }
        else {
          this.turnTo(Math.atan2(tx, tz), dt * 3);
          const sp = this.speed * dt;
          this.pos.x += Math.sin(this.facing) * sp; this.pos.z += Math.cos(this.facing) * sp;
          moving = true;
        }
      }
      this.pos.y = this.ground(this.pos.x, this.pos.z);
    } else if (d.beh === 'fly') {
      const a = t * (d.speed || 0.1) + (d.phase || 0);
      const R = d.radius || 40;
      this.pos.set(d.x + Math.cos(a) * R, d.y + Math.sin(a * 2.3) * 3, d.z + Math.sin(a) * R);
      this.facing = Math.atan2(-Math.sin(a), Math.cos(a)) + ((d.speed || 0.1) < 0 ? Math.PI : 0);
      m.rotation.z = (d.bank ?? 0.25) * Math.sign(d.speed || 0.1);
    } else if (d.beh === 'float') {
      this.pos.x = this.home.x + Math.sin(t * 0.2 + this.phase) * (d.radius || 3);
      this.pos.z = this.home.z + Math.cos(t * 0.17 + this.phase * 0.7) * (d.radius || 3);
      this.pos.y = this.ground(this.pos.x, this.pos.z) + 0.4 + Math.sin(t * 1.2 + this.phase) * 0.25;
      this.facing += dt * 0.2;
    } else if (d.beh === 'boat') {
      const a = t * 0.035 + this.phase;
      this.pos.set(d.x + Math.sin(a) * 150, d.y, d.z + Math.sin(a * 2) * 40);
      this.facing = Math.atan2(Math.cos(a) * 150, Math.cos(a * 2) * 80);
    } else {
      this.pos.y = this.ground(this.pos.x, this.pos.z);
      if (d.beh === 'isle') this.pos.y += 0;
    }

    m.position.copy(this.pos);
    if (d.beh !== 'fly') m.rotation.z = 0;
    if (moving) {
      m.position.y += Math.abs(Math.sin(this.phase * 7)) * 0.06;
      m.rotation.z = Math.sin(this.phase * 7) * 0.05;
    } else if (d.beh !== 'fly' && d.beh !== 'boat') {
      m.scale.y = 1 + Math.sin(this.phase * 1.6) * 0.012;
    }
    m.rotation.y = this.facing;
    if (this.onUpdate) this.onUpdate(dt, t);
  }

  turnTo(a, k) {
    let diff = a - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facing += diff * Math.min(1, k);
  }
}
