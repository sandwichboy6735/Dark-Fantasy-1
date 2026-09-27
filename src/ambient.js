// Atmosphere: falling ash, rising embers, soul wisps & fireflies, block debris,
// circling ravens and the Hollow — silent lantern-bearing spirits that fade when approached.
import * as THREE from 'three';

const pointVS = /* glsl */`
  attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
  uniform float uScale;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vColor = aColor; vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const pointFS = (square) => /* glsl */`
  uniform float uGlobal;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    ${square ? 'float a = step(max(abs(c.x), abs(c.y)), 0.45);' : 'float a = smoothstep(0.5, 0.0, d); a *= a;'}
    if (a * vAlpha * uGlobal < 0.01) discard;
    gl_FragColor = vec4(vColor, a * vAlpha * uGlobal);
  }`;

class Points {
  constructor(n, { additive = false, square = false } = {}) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.uniforms = { uScale: { value: 400 }, uGlobal: { value: 1 } };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: pointVS, fragmentShader: pointFS(square),
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.obj = new THREE.Points(g, this.mat);
    this.obj.frustumCulled = false;
    this.geo = g;
  }
  flush() {
    const a = this.geo.attributes;
    a.position.needsUpdate = true; a.aColor.needsUpdate = true; a.aSize.needsUpdate = true; a.aAlpha.needsUpdate = true;
  }
}

export class Ambient {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.ash = new Points(1400);
    this.embers = new Points(260, { additive: true });
    this.wisps = new Points(90, { additive: true });
    this.debris = new Points(400, { square: true });
    for (const p of [this.ash, this.embers, this.wisps, this.debris]) scene.add(p.obj);
    this.initialized = false;
    this.emberLife = new Float32Array(this.embers.n);
    this.wispData = [];
    this.debrisVel = new Float32Array(this.debris.n * 3); this.debrisLife = new Float32Array(this.debris.n); this.debrisHead = 0;
    this.makeRavens();
    this.spirits = [];
    for (let i = 0; i < 5; i++) this.spirits.push(this.makeSpirit());
    this.onWhisper = null;
    this.t = 0;
  }

  setScale(h, fov) { const s = h / (2 * Math.tan((fov * Math.PI / 180) / 2)); for (const p of [this.ash, this.embers, this.wisps, this.debris]) p.uniforms.uScale.value = s; }

  init(cam) {
    const { ash, embers } = this;
    for (let i = 0; i < ash.n; i++) {
      ash.pos[i * 3] = cam.x + (Math.random() - 0.5) * 60; ash.pos[i * 3 + 1] = cam.y + (Math.random() - 0.5) * 36; ash.pos[i * 3 + 2] = cam.z + (Math.random() - 0.5) * 60;
      ash.size[i] = 0.05 + Math.random() * 0.08; ash.alpha[i] = 0.5 + Math.random() * 0.5;
    }
    for (let i = 0; i < embers.n; i++) this.spawnEmber(i, cam, true);
    for (let i = 0; i < this.wisps.n; i++) { this.wispData.push({ vx: 0, vy: 0, vz: 0, ph: Math.random() * 100, kind: 0 }); this.spawnWisp(i, cam); }
    this.initialized = true;
  }

  spawnEmber(i, cam, anyY) {
    const e = this.embers;
    e.pos[i * 3] = cam.x + (Math.random() - 0.5) * 50;
    e.pos[i * 3 + 2] = cam.z + (Math.random() - 0.5) * 50;
    const g = this.world.surfaceY(Math.floor(e.pos[i * 3]), Math.floor(e.pos[i * 3 + 2]));
    e.pos[i * 3 + 1] = anyY ? g + Math.random() * 14 : g + 0.5;
    e.size[i] = 0.06 + Math.random() * 0.08;
    const w = Math.random();
    e.col[i * 3] = 1.6 + w; e.col[i * 3 + 1] = 0.45 + w * 0.5; e.col[i * 3 + 2] = 0.12;
    this.emberLife[i] = 3 + Math.random() * 6;
  }

  spawnWisp(i, cam) {
    const w = this.wisps, d = this.wispData[i];
    const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 38;
    const x = cam.x + Math.cos(a) * r, z = cam.z + Math.sin(a) * r;
    const g = this.world.surfaceY(Math.floor(x), Math.floor(z));
    w.pos[i * 3] = x; w.pos[i * 3 + 1] = g + 1 + Math.random() * 5; w.pos[i * 3 + 2] = z;
    d.kind = Math.random() < 0.45 ? 1 : 0;
    if (d.kind === 1) { w.col[i * 3] = 1.2; w.col[i * 3 + 1] = 1.5; w.col[i * 3 + 2] = 0.35; w.size[i] = 0.12; }
    else {
      const v = Math.random();
      w.col[i * 3] = 0.4 + v * 0.8; w.col[i * 3 + 1] = 0.9 + (1 - v) * 0.6; w.col[i * 3 + 2] = 2.0; w.size[i] = 0.35 + Math.random() * 0.35;
    }
    d.ph = Math.random() * 100;
  }

  burst(x, y, z, color, light, count = 14) {
    const D = this.debris;
    for (let k = 0; k < count; k++) {
      const i = this.debrisHead; this.debrisHead = (this.debrisHead + 1) % D.n;
      D.pos[i * 3] = x + 0.2 + Math.random() * 0.6; D.pos[i * 3 + 1] = y + 0.2 + Math.random() * 0.6; D.pos[i * 3 + 2] = z + 0.2 + Math.random() * 0.6;
      this.debrisVel[i * 3] = (Math.random() - 0.5) * 3.5; this.debrisVel[i * 3 + 1] = 1.5 + Math.random() * 3; this.debrisVel[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
      const s = 0.7 + Math.random() * 0.4;
      D.col[i * 3] = color[0] * light * s; D.col[i * 3 + 1] = color[1] * light * s; D.col[i * 3 + 2] = color[2] * light * s;
      D.size[i] = 0.08 + Math.random() * 0.08; D.alpha[i] = 1; this.debrisLife[i] = 0.5 + Math.random() * 0.6;
    }
  }

  update(dt, cam, env) {
    if (!this.initialized) this.init(cam);
    this.t += dt;
    const { ash, embers, wisps, debris } = this;
    // Ash
    const ashBright = 0.12 + env.dayLight * 0.5;
    for (let i = 0; i < ash.n; i++) {
      const k = i * 3;
      ash.pos[k] += (Math.sin(this.t * 0.5 + i) * 0.3 + env.wind) * dt;
      ash.pos[k + 1] -= (0.35 + (i % 7) * 0.08) * dt;
      ash.pos[k + 2] += Math.cos(this.t * 0.4 + i * 1.3) * 0.3 * dt;
      if (ash.pos[k] - cam.x > 30) ash.pos[k] -= 60; else if (ash.pos[k] - cam.x < -30) ash.pos[k] += 60;
      if (ash.pos[k + 2] - cam.z > 30) ash.pos[k + 2] -= 60; else if (ash.pos[k + 2] - cam.z < -30) ash.pos[k + 2] += 60;
      if (ash.pos[k + 1] - cam.y < -18) ash.pos[k + 1] += 36; else if (ash.pos[k + 1] - cam.y > 18) ash.pos[k + 1] -= 36;
      ash.col[k] = ashBright * 1.02; ash.col[k + 1] = ashBright; ash.col[k + 2] = ashBright * 0.98;
    }
    ash.uniforms.uGlobal.value = env.underwater ? 0 : env.ashDensity;
    ash.flush();
    // Embers
    for (let i = 0; i < embers.n; i++) {
      const k = i * 3;
      this.emberLife[i] -= dt;
      embers.pos[k] += Math.sin(this.t * 2 + i) * 0.4 * dt + env.wind * 0.5 * dt;
      embers.pos[k + 1] += (0.6 + (i % 5) * 0.25) * dt;
      embers.pos[k + 2] += Math.cos(this.t * 1.7 + i) * 0.4 * dt;
      const life = this.emberLife[i];
      embers.alpha[i] = Math.min(1, life * 0.8) * (0.6 + 0.4 * Math.sin(this.t * 12 + i * 3));
      const dx = embers.pos[k] - cam.x, dz = embers.pos[k + 2] - cam.z;
      if (life <= 0 || dx * dx + dz * dz > 1200) this.spawnEmber(i, cam, false);
    }
    embers.uniforms.uGlobal.value = env.underwater ? 0 : env.emberDensity;
    embers.flush();
    // Wisps & fireflies
    for (let i = 0; i < wisps.n; i++) {
      const k = i * 3, d = this.wispData[i];
      const ph = d.ph + this.t * (d.kind ? 0.9 : 0.35);
      wisps.pos[k] += Math.sin(ph * 1.3) * (d.kind ? 1.2 : 0.6) * dt;
      wisps.pos[k + 1] += Math.sin(ph * 0.9) * 0.35 * dt;
      wisps.pos[k + 2] += Math.cos(ph * 1.1) * (d.kind ? 1.2 : 0.6) * dt;
      const pulse = d.kind ? (Math.sin(ph * 5) > 0.2 ? 1 : 0.1) : 0.6 + 0.4 * Math.sin(ph * 2);
      const vis = d.kind ? env.fireflies : env.wisps;
      wisps.alpha[i] = pulse * vis;
      const dx = wisps.pos[k] - cam.x, dz = wisps.pos[k + 2] - cam.z;
      if (dx * dx + dz * dz > 2000) this.spawnWisp(i, cam);
    }
    wisps.flush();
    // Debris
    for (let i = 0; i < debris.n; i++) {
      if (this.debrisLife[i] <= 0) { debris.alpha[i] = 0; continue; }
      this.debrisLife[i] -= dt;
      const k = i * 3;
      this.debrisVel[k + 1] -= 14 * dt;
      const nx = debris.pos[k] + this.debrisVel[k] * dt, ny = debris.pos[k + 1] + this.debrisVel[k + 1] * dt, nz = debris.pos[k + 2] + this.debrisVel[k + 2] * dt;
      const id = this.world.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz));
      if (id !== 0 && id !== 18) {
        this.debrisVel[k] *= 0.3; this.debrisVel[k + 1] = 0; this.debrisVel[k + 2] *= 0.3;
      } else { debris.pos[k] = nx; debris.pos[k + 1] = ny; debris.pos[k + 2] = nz; }
      debris.alpha[i] = Math.min(1, this.debrisLife[i] * 4);
    }
    debris.flush();

    this.updateRavens(dt, cam);
    this.updateSpirits(dt, cam, env);
  }

  // ---------- Ravens ----------
  makeRavens() {
    const mat = new THREE.MeshBasicMaterial({ color: 0x050407 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.2, 0.15) });
    this.ravens = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.7), mat);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.22), mat); head.position.set(0, 0.08, 0.42);
      const beak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.18), mat); beak.position.set(0, 0.05, 0.6);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.3), mat); tail.position.set(0, 0.02, -0.46);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), eyeMat); eye.position.set(0, 0.12, 0.48);
      const wl = new THREE.Group(), wr = new THREE.Group();
      const wgeo = new THREE.BoxGeometry(0.8, 0.03, 0.34); wgeo.translate(0.4, 0, 0);
      wl.add(new THREE.Mesh(wgeo, mat)); wr.add(new THREE.Mesh(wgeo, mat)); wr.rotation.y = Math.PI;
      wl.position.set(0.12, 0.05, 0.02); wr.position.set(-0.12, 0.05, 0.02);
      g.add(body, head, beak, tail, eye, wl, wr);
      g.scale.setScalar(1.3);
      this.scene.add(g);
      this.ravens.push({ g, wl, wr, a: Math.random() * 6.28, r: 10 + Math.random() * 22, h: 16 + Math.random() * 14, sp: 0.25 + Math.random() * 0.25, dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random() * 10 });
    }
    this.ravenCenter = new THREE.Vector3();
  }

  updateRavens(dt, cam) {
    if (!this.ravenInit || this.ravenCenter.distanceTo(cam) > 80) { this.ravenCenter.copy(cam); this.ravenInit = true; }
    this.ravenCenter.lerp(cam, 1 - Math.exp(-dt * 0.08));
    for (const r of this.ravens) {
      r.a += r.sp * dt * r.dir;
      const x = this.ravenCenter.x + Math.cos(r.a) * r.r;
      const z = this.ravenCenter.z + Math.sin(r.a) * r.r;
      const y = this.ravenCenter.y + r.h + Math.sin(r.a * 3 + r.ph) * 1.5;
      r.g.position.set(x, y, z);
      r.g.rotation.y = Math.atan2(-Math.sin(r.a) * r.dir, Math.cos(r.a) * r.dir);
      r.g.rotation.z = 0.25 * r.dir;
      const glide = Math.sin(this.t * 0.4 + r.ph) > 0.2;
      const flap = glide ? 0.15 : Math.sin(this.t * 11 + r.ph) * 0.7;
      r.wl.rotation.z = flap; r.wr.rotation.z = -flap;
    }
  }

  // ---------- The Hollow (spirits) ----------
  makeSpirit() {
    const g = new THREE.Group();
    const cloakMat = new THREE.MeshBasicMaterial({ color: 0x0b0a10, transparent: true, opacity: 0.9 });
    const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.9, 8, 1, true), cloakMat); cloak.position.y = 0.95;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), cloakMat); hood.position.y = 1.85;
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.4, 3.0), transparent: true });
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), eyeMat); e1.position.set(0.09, 1.86, 0.27);
    const e2 = e1.clone(); e2.position.x = -0.09;
    const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 2.2, 3.2), transparent: true });
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), lanternMat); lantern.position.set(0.45, 0.9, 0.2);
    const armMat = cloakMat;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), armMat); arm.position.set(0.42, 1.2, 0.15); arm.rotation.z = 0.3;
    g.add(cloak, hood, e1, e2, lantern, arm);
    g.visible = false;
    this.scene.add(g);
    return { g, mats: [cloakMat, eyeMat, lanternMat], fade: 0, target: 0, heading: Math.random() * 6.28, ph: Math.random() * 10, active: false, whispered: false };
  }

  placeSpirit(s, cam) {
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 30;
      const x = cam.x + Math.cos(a) * r, z = cam.z + Math.sin(a) * r;
      if (!this.world.isReady(Math.floor(x), Math.floor(z))) continue;
      const y = this.world.surfaceY(Math.floor(x), Math.floor(z)) + 1;
      s.g.position.set(x, y, z);
      s.active = true; s.fade = 0; s.target = 1; s.whispered = false; s.g.visible = true;
      return;
    }
  }

  updateSpirits(dt, cam, env) {
    const want = env.spirits;
    this.spirits.forEach((s, i) => {
      const shouldExist = i < want;
      if (!s.active) { if (shouldExist && Math.random() < dt * 0.2) this.placeSpirit(s, cam); return; }
      const dx = cam.x - s.g.position.x, dz = cam.z - s.g.position.z;
      const dist = Math.hypot(dx, dz);
      if (!shouldExist || dist > 70) s.target = 0;
      if (dist < 7 && s.target > 0) {
        s.target = 0;
        if (!s.whispered && this.onWhisper) { this.onWhisper(); s.whispered = true; }
      }
      s.fade += (s.target - s.fade) * Math.min(1, dt * (s.target ? 0.6 : 2.2));
      if (s.target === 0 && s.fade < 0.02) { s.active = false; s.g.visible = false; return; }
      // Drift slowly, sometimes turn to watch the player
      s.ph += dt;
      const watching = Math.sin(s.ph * 0.3) > 0.3 && dist < 35;
      if (!watching) {
        s.heading += Math.sin(s.ph * 0.23) * dt * 0.4;
        const nx = s.g.position.x + Math.cos(s.heading) * 0.55 * dt, nz = s.g.position.z + Math.sin(s.heading) * 0.55 * dt;
        const gy = this.world.surfaceY(Math.floor(nx), Math.floor(nz)) + 1;
        s.g.position.x = nx; s.g.position.z = nz;
        s.g.position.y += (gy + 0.15 + Math.sin(s.ph * 1.3) * 0.15 - s.g.position.y) * Math.min(1, dt * 2);
        s.g.rotation.y = Math.atan2(Math.cos(s.heading), Math.sin(s.heading));
      } else {
        s.g.rotation.y = Math.atan2(dx, dz);
        s.g.position.y += Math.sin(s.ph * 1.3) * 0.08 * dt;
      }
      const f = s.fade;
      s.mats[0].opacity = 0.88 * f; s.mats[1].opacity = f * (0.7 + 0.3 * Math.sin(s.ph * 4)); s.mats[2].opacity = f;
    });
  }
}
