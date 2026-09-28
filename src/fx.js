// Sky, giant moon, glowing cloud sea, the Mirror Lake, drifting clouds, particles and the light pool.
import * as THREE from 'three';
import { MOON_DIR, CLOUD_Y, WATER_Y } from './layout.js';

export const moonDir = new THREE.Vector3(...MOON_DIR).normalize();

const NOISE_GLSL = /* glsl */`
  float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash2(i), hash2(i+vec2(1,0)), f.x), mix(hash2(i+vec2(0,1)), hash2(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ s += a*vnoise(p); p = p*2.03 + 1.7; a *= 0.5; } return s; }
`;

export function makeSky() {
  const uniforms = {
    uTime: { value: 0 }, uMoon: { value: moonDir }, uSun: { value: new THREE.Vector3(0, -1, 0) },
    uZen: { value: new THREE.Color(0.004, 0.006, 0.03) }, uMid: { value: new THREE.Color(0.03, 0.03, 0.12) }, uHor: { value: new THREE.Color(0.14, 0.11, 0.30) },
    uSunCol: { value: new THREE.Color(1, 0.6, 0.3) }, uCloud: { value: new THREE.Color(0.16, 0.14, 0.38) },
    uNight: { value: 1 }, uAurora: { value: 1 }, uRainbow: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: NOISE_GLSL + /* glsl */`
      uniform float uTime, uNight, uAurora, uRainbow; uniform vec3 uMoon, uSun, uZen, uMid, uHor, uSunCol, uCloud; varying vec3 vDir;
      float star(vec3 d, float scale, float thresh){
        vec3 p = d * scale; vec3 i = floor(p); vec3 f = fract(p) - 0.5;
        float h = fract(sin(dot(i, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        if (h < thresh) return 0.0;
        vec3 o = vec3(fract(h*13.1), fract(h*71.7), fract(h*37.3)) - 0.5;
        float d2 = length(f - o*0.6);
        float tw = 0.65 + 0.35*sin(uTime*(1.0+h*3.0) + h*60.0);
        return smoothstep(0.08, 0.0, d2) * tw * (h - thresh) / (1.0 - thresh);
      }
      vec3 hue(float t){ return clamp(abs(fract(t + vec3(0.0, 0.667, 0.333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        float sd = dot(d, uSun);
        // Horizon glow gathers around the sun at sunrise and sunset
        float sunSide = pow(max(sd, 0.0) * 0.5 + 0.5, 3.0);
        vec3 hor = mix(uHor, uHor * 0.55 + uSunCol * 0.45, sunSide * smoothstep(0.35, -0.05, uSun.y) * step(-0.35, uSun.y));
        vec3 col = mix(hor, uMid, smoothstep(0.0, 0.28, h));
        col = mix(col, uZen, smoothstep(0.28, 0.95, h));
        col = mix(col, hor * 0.7, smoothstep(0.0, -0.3, h));
        // Sun disc and glow
        col += uSunCol * (smoothstep(0.9994, 0.9997, sd) * 6.0 + pow(max(sd, 0.0), 60.0) * 0.8 + pow(max(sd, 0.0), 6.0) * 0.18) * smoothstep(-0.12, 0.0, uSun.y);
        float md = dot(d, uMoon);
        col += vec3(0.35, 0.38, 0.9) * (pow(max(md, 0.0), 30.0) * 0.55 + pow(max(md, 0.0), 6.0) * 0.18) * (0.3 + 0.7 * uNight);
        // Stars
        float smn = 1.0 - smoothstep(0.93, 0.99, md);
        float s = star(d, 180.0, 0.93) * 1.6 + star(d, 90.0, 0.985) * 5.0;
        col += vec3(0.75, 0.82, 1.3) * s * smoothstep(-0.02, 0.15, h) * smn * uNight;
        // Aurora: green and pink curtains in the northern sky
        if (uAurora > 0.01 && h > 0.04) {
          vec2 a = d.xz / (h + 0.35);
          float wave = a.x * 1.1 + fbm(vec2(a.x * 0.35, uTime * 0.03)) * 5.0 + sin(uTime * 0.2 + a.x) * 0.5;
          float band = smoothstep(0.55, 1.0, sin(wave + a.y * 0.6)) + smoothstep(0.75, 1.0, sin(wave * 1.7 + 2.0)) * 0.6;
          float streak = 0.55 + 0.45 * fbm(vec2(a.x * 9.0, uTime * 0.25));
          float vert = smoothstep(0.05, 0.22, h) * (1.0 - smoothstep(0.35, 0.75, h));
          float north = smoothstep(0.35, -0.6, d.z);
          vec3 ac = mix(vec3(0.1, 1.0, 0.55), vec3(0.95, 0.25, 0.9), smoothstep(0.15, 0.5, h));
          ac = mix(ac, vec3(0.2, 0.7, 1.0), 0.5 + 0.5 * sin(a.x * 0.8 + uTime * 0.05));
          col += ac * band * streak * vert * north * uAurora * 0.65;
        }
        // Morning rainbow opposite the sun
        if (uRainbow > 0.01) {
          float ang = acos(clamp(dot(d, -uSun), -1.0, 1.0));
          float r = (ang - 0.66) / 0.05;
          if (r > 0.0 && r < 1.0 && h > 0.0) col += hue(r * 0.8) * sin(r * 3.14159) * 0.4 * uRainbow * smoothstep(0.0, 0.1, h);
        }
        // Clouds, tinted by the sun at sunrise and sunset
        if (h > -0.1) {
          vec2 uv = d.xz / (h + 0.28);
          float c = fbm(uv * 1.3 + vec2(uTime * 0.004, uTime * 0.002));
          float c2 = fbm(uv * 3.1 - vec2(uTime * 0.006, 0.0));
          float cloud = smoothstep(0.52, 0.8, c * 0.7 + c2 * 0.4) * smoothstep(-0.05, 0.12, h) * (1.0 - smoothstep(0.55, 0.95, h));
          vec3 lit = uCloud + vec3(0.42, 0.44, 0.85) * pow(max(md, 0.0), 10.0) * 0.8 * uNight + uSunCol * (pow(max(sd, 0.0), 3.0) * 0.9 + 0.12) * smoothstep(-0.2, 0.05, uSun.y);
          col = mix(col, lit * (0.35 + 0.65 * c2), cloud * 0.75);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), mat);
  dome.frustumCulled = false; dome.renderOrder = -2;

  // The moon itself: a large textured disc so it can have real craters
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(230, 220, 30, 256, 256, 256);
  g.addColorStop(0, '#f2f1ff'); g.addColorStop(0.7, '#c7c8f2'); g.addColorStop(1, '#9fa2e0');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(256, 256, 250, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(256, 256, 250, 0, Math.PI * 2); ctx.clip();
  let seed = 3; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.filter = 'blur(10px)';
  for (let i = 0; i < 12; i++) { // maria: soft dark seas
    ctx.fillStyle = `rgba(120,120,190,${0.18 + r() * 0.18})`;
    ctx.beginPath(); ctx.ellipse(100 + r() * 310, 100 + r() * 310, 30 + r() * 70, 20 + r() * 50, r() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.filter = 'blur(1px)';
  for (let i = 0; i < 90; i++) { // craters: faint rims with a lit edge
    const x = 20 + r() * 472, y = 20 + r() * 472, rad = 2 + Math.pow(r(), 4) * 22;
    const g2 = ctx.createRadialGradient(x + rad * 0.2, y + rad * 0.2, 0, x, y, rad);
    g2.addColorStop(0, 'rgba(110,110,175,0.25)'); g2.addColorStop(0.8, 'rgba(110,110,175,0.12)'); g2.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
  ctx.filter = 'none';
  // gentle terminator shading towards one side
  const sh = ctx.createLinearGradient(0, 0, 512, 512);
  sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(60,60,140,0.22)');
  ctx.fillStyle = sh; ctx.fillRect(0, 0, 512, 512);
  ctx.restore();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false, color: new THREE.Color(0.95, 0.95, 1.12) }));
  moon.renderOrder = -1; moon.frustumCulled = false;
  return { dome, moon, uniforms };
}

// A sea of glowing cloud that fills the world beneath the continent
export function makeCloudSea() {
  const uniforms = { uTime: { value: 0 }, uMoon: { value: moonDir.clone() }, uCam: { value: new THREE.Vector3() }, fogColor: { value: new THREE.Color() }, uDeep: { value: new THREE.Color(0.04, 0.04, 0.16) }, uMidC: { value: new THREE.Color(0.2, 0.2, 0.58) }, uHi: { value: new THREE.Color(0.7, 0.7, 1.25) }, uGlint: { value: new THREE.Color(0.5, 0.55, 1.1) }, uFar: { value: new THREE.Color(0.16, 0.13, 0.36) } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: NOISE_GLSL + /* glsl */`
      uniform float uTime; uniform vec3 uMoon, uCam, fogColor, uDeep, uMidC, uHi, uGlint, uFar; varying vec3 vW;
      void main(){
        vec2 p = vW.xz * 0.0032;
        vec2 q = vec2(fbm(p + vec2(uTime * 0.010, 0.0)), fbm(p + vec2(5.2, 1.3) - uTime * 0.008));
        vec2 r2 = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + uTime * 0.006), fbm(p + 3.0 * q + vec2(8.3, 2.8)));
        float c = fbm(p + 2.5 * r2);
        float fine = fbm(p * 6.0 + r2 * 2.0 - uTime * 0.02);
        // billows: bright rounded tops, dark creases
        float puff = smoothstep(0.35, 0.8, c);
        float crease = smoothstep(0.12, 0.0, abs(c - 0.5)) * 0.35;
        vec3 deep = uDeep, mid = uMidC, hi = uHi;
        vec3 col = mix(deep, mid, smoothstep(0.25, 0.55, c));
        col = mix(col, hi, puff * (0.55 + 0.45 * fine));
        col -= crease * vec3(0.08, 0.08, 0.2);
        vec3 v = normalize(uCam - vW);
        vec3 r = reflect(-v, normalize(vec3((fine - 0.5) * 0.6, 1.0, (c - 0.5) * 0.6)));
        col += uGlint * pow(max(dot(r, uMoon), 0.0), 14.0) * (0.3 + puff);
        float d = length(vW.xz - uCam.xz);
        col = mix(col, uFar, smoothstep(700.0, 3000.0, d));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1).rotateX(-Math.PI / 2), mat);
  mesh.position.y = CLOUD_Y;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

export function makeLake() {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uMoon: { value: moonDir.clone() }, uGlint: { value: new THREE.Color(0.75, 0.78, 1.3) }, uDeepW: { value: new THREE.Color(0.015, 0.025, 0.07) }, uSkyW: { value: new THREE.Color(0.09, 0.09, 0.26) }, uNight: { value: 1 } }]);
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true, transparent: true,
    vertexShader: `#include <fog_pars_vertex>
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: NOISE_GLSL + /* glsl */`
      #include <fog_pars_fragment>
      uniform float uTime, uNight; uniform vec3 uMoon, uGlint, uDeepW, uSkyW; varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        float n1 = vnoise(p * 0.35 + vec2(uTime * 0.3, 0.0)) - 0.5, n2 = vnoise(p * 0.8 - vec2(0.0, uTime * 0.4)) - 0.5;
        vec3 nrm = normalize(vec3(n1 * 0.25 + n2 * 0.12, 1.0, n2 * 0.25 - n1 * 0.1));
        vec3 v = normalize(cameraPosition - vW);
        vec3 r = reflect(-v, nrm);
        float fres = pow(1.0 - max(v.y, 0.0), 4.0);
        vec3 col = mix(uDeepW, uSkyW, fres);
        float glint = pow(max(dot(r, uMoon), 0.0), 300.0) * 1.1 + pow(max(dot(r, uMoon), 0.0), 40.0) * 0.12;
        col += uGlint * glint;
        // Glowing plankton drifts in the lake at night
        float plank = smoothstep(0.78, 0.95, vnoise(p * 0.25 + vec2(uTime * 0.05, -uTime * 0.03))) * smoothstep(0.6, 0.9, vnoise(p * 1.7 - uTime * 0.2));
        col += vec3(0.1, 0.9, 1.0) * plank * 1.4 * uNight;
        gl_FragColor = vec4(col, 0.92);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(560, 300, 1, 1).rotateX(-Math.PI / 2), mat);
  mesh.position.set(0, WATER_Y, 205);
  return { mesh, uniforms };
}

// Soft cloud puffs drifting around the mountains and the floating isles
export function makeCloudPuffs(scene, tex) {
  const group = new THREE.Group();
  const spots = [[180, -820, 260, 14], [-380, -560, 230, 8], [-600, -700, 180, 8], [500, -650, 200, 8], [-1260, 1270, 20, 10], [900, 1350, 70, 4], [1500, 300, 40, 4], [1350, -900, 120, 4], [300, -1700, 150, 5], [-1250, -1150, 90, 4], [-1750, 250, 50, 4], [-900, 900, 20, 6], [0, -300, 150, 6]];
  let seed = 9; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const puffs = [];
  for (const [x, z, y, n] of spots) for (let i = 0; i < n; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(0.55, 0.55, 1.0), transparent: true, opacity: 0.35 + r() * 0.3, depthWrite: false, fog: true }));
    const s = 80 + r() * 140;
    m.scale.set(s, s * 0.45, 1);
    m.position.set(x + (r() - 0.5) * 400, y + (r() - 0.5) * 60, z + (r() - 0.5) * 400);
    m.userData.v = (r() - 0.5) * 3;
    group.add(m); puffs.push(m);
  }
  scene.add(group);
  return (dt) => { for (const p of puffs) p.position.x += p.userData.v * dt; };
}

// ---------- Particles ----------
function pointsMat(tex, additive = true) {
  return new THREE.PointsMaterial({ size: 1, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true, fog: true });
}

export class Particles {
  constructor(scene, tex, world, terrain) {
    this.world = world; this.T = terrain;
    // Fireflies around the player
    this.ff = this.make(scene, tex, 260, true, 0.22);
    this.ffData = [];
    // Snow in the mountains
    this.snow = this.make(scene, tex, 1400, true, 0.28);
    // Chimney smoke
    this.smoke = this.make(scene, tex, 700, true, 4);
    this.smokeData = new Float32Array(700 * 4); this.smokeHead = 0;
    // Sparkles in updrafts and the player's glide trail
    this.spark = this.make(scene, tex, 600, true, 0.4);
    this.sparkData = new Float32Array(600 * 4); this.sparkHead = 0;
    this.t = 0; this.inited = false;
  }

  make(scene, tex, n, additive, size) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3).fill(-9999), col = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = pointsMat(tex, additive); m.size = size;
    const p = new THREE.Points(g, m); p.frustumCulled = false;
    scene.add(p);
    return { p, pos, col, n };
  }

  sparkle(x, y, z, vx, vy, vz, color = [0.6, 0.8, 1.6], life = 1.2) {
    const s = this.spark, i = this.sparkHead; this.sparkHead = (i + 1) % s.n;
    s.pos[i * 3] = x; s.pos[i * 3 + 1] = y; s.pos[i * 3 + 2] = z;
    s.col[i * 3] = color[0]; s.col[i * 3 + 1] = color[1]; s.col[i * 3 + 2] = color[2];
    this.sparkData[i * 4] = vx; this.sparkData[i * 4 + 1] = vy; this.sparkData[i * 4 + 2] = vz; this.sparkData[i * 4 + 3] = life;
  }

  update(dt, cam, env) {
    this.t += dt;
    const { ff, snow, smoke, spark } = this;
    if (!this.inited) {
      for (let i = 0; i < ff.n; i++) this.ffData.push({ ph: Math.random() * 100, ox: 0, oz: 0 });
      for (let i = 0; i < snow.n; i++) { snow.pos[i * 3] = cam.x + (Math.random() - 0.5) * 80; snow.pos[i * 3 + 1] = cam.y + (Math.random() - 0.5) * 40; snow.pos[i * 3 + 2] = cam.z + (Math.random() - 0.5) * 80; }
      this.inited = true;
    }
    // Fireflies: respawn near the ground around the camera
    for (let i = 0; i < ff.n; i++) {
      const d = this.ffData[i], k = i * 3;
      const dx = ff.pos[k] - cam.x, dz = ff.pos[k + 2] - cam.z;
      if (dx * dx + dz * dz > 3600 || ff.pos[k] < -9000) {
        const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 50;
        const x = cam.x + Math.cos(a) * r, z = cam.z + Math.sin(a) * r;
        ff.pos[k] = x; ff.pos[k + 2] = z; ff.pos[k + 1] = this.world.groundAt(x, z, cam.y + 20) + 0.5 + Math.random() * 3;
      }
      d.ph += dt;
      ff.pos[k] += Math.sin(d.ph * 0.9 + i) * dt * 0.6;
      ff.pos[k + 1] += Math.sin(d.ph * 1.3) * dt * 0.25;
      ff.pos[k + 2] += Math.cos(d.ph * 0.7 + i) * dt * 0.6;
      const blink = Math.max(0, Math.sin(d.ph * 2.2 + i * 1.7)) * env.fireflies;
      const c = env.fireflyColor;
      ff.col[k] = c[0] * blink; ff.col[k + 1] = c[1] * blink; ff.col[k + 2] = c[2] * blink;
    }
    ff.p.geometry.attributes.position.needsUpdate = true; ff.p.geometry.attributes.color.needsUpdate = true;
    // Snow
    const sv = env.snow;
    for (let i = 0; i < snow.n; i++) {
      const k = i * 3;
      snow.pos[k] += (Math.sin(this.t * 0.4 + i) * 0.6 + 1.2) * dt;
      snow.pos[k + 1] -= (1.1 + (i % 5) * 0.2) * dt;
      snow.pos[k + 2] += Math.cos(this.t * 0.3 + i) * 0.5 * dt;
      for (const [a, span] of [[0, 80], [2, 80]]) {
        const rel = snow.pos[k + a] - (a === 0 ? cam.x : cam.z);
        if (rel > span / 2) snow.pos[k + a] -= span; else if (rel < -span / 2) snow.pos[k + a] += span;
      }
      if (snow.pos[k + 1] < cam.y - 20) snow.pos[k + 1] += 40; else if (snow.pos[k + 1] > cam.y + 20) snow.pos[k + 1] -= 40;
      snow.col[k] = 0.7 * sv; snow.col[k + 1] = 0.72 * sv; snow.col[k + 2] = 0.95 * sv;
    }
    snow.p.geometry.attributes.position.needsUpdate = true; snow.p.geometry.attributes.color.needsUpdate = true;
    // Smoke from nearby chimneys
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.12;
      for (const c of this.world.chimneys) {
        if (Math.abs(c.x - cam.x) > 220 || Math.abs(c.z - cam.z) > 220) continue;
        const i = this.smokeHead; this.smokeHead = (i + 1) % smoke.n;
        smoke.pos[i * 3] = c.x + (Math.random() - 0.5) * 0.4; smoke.pos[i * 3 + 1] = c.y; smoke.pos[i * 3 + 2] = c.z + (Math.random() - 0.5) * 0.4;
        this.smokeData[i * 4 + 3] = 0;
      }
    }
    for (let i = 0; i < smoke.n; i++) {
      const k = i * 3;
      if (smoke.pos[k] < -9000) continue;
      const age = (this.smokeData[i * 4 + 3] += dt);
      smoke.pos[k] += (0.8 + age * 0.15) * dt; smoke.pos[k + 1] += 1.3 * dt; smoke.pos[k + 2] += Math.sin(age + i) * 0.3 * dt;
      const a = Math.max(0, 1 - age / 9) * Math.min(1, age * 2) * 0.22;
      smoke.col[k] = 0.55 * a; smoke.col[k + 1] = 0.55 * a; smoke.col[k + 2] = 0.8 * a;
      if (age > 9) smoke.pos[k] = -9999;
    }
    smoke.p.material.opacity = 1;
    smoke.p.geometry.attributes.position.needsUpdate = true; smoke.p.geometry.attributes.color.needsUpdate = true;
    // Sparkles
    for (let i = 0; i < spark.n; i++) {
      const k = i * 3;
      if (spark.pos[k] < -9000) continue;
      const life = (this.sparkData[i * 4 + 3] -= dt);
      spark.pos[k] += this.sparkData[i * 4] * dt; spark.pos[k + 1] += this.sparkData[i * 4 + 1] * dt; spark.pos[k + 2] += this.sparkData[i * 4 + 2] * dt;
      if (life <= 0) { spark.pos[k] = -9999; continue; }
      const f = Math.min(1, life);
      spark.col[k] *= 0.995; spark.col[k + 1] *= 0.995; spark.col[k + 2] *= 0.995;
      if (f < 0.3) { spark.col[k] *= 0.9; spark.col[k + 1] *= 0.9; spark.col[k + 2] *= 0.9; }
    }
    spark.p.geometry.attributes.position.needsUpdate = true; spark.p.geometry.attributes.color.needsUpdate = true;
  }
}

// ---------- Updraft visuals ----------
export function makeWellVisual(scene) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 64);
  const tex = new THREE.CanvasTexture(c);
  const beamMat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.07, 0.12, 0.32), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 1.0, 2.4) });
  return (x, y, z, h = 14) => {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, h, 20, 1, true), beamMat);
    beam.position.set(x, y + h / 2, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.09, 6, 32).rotateX(Math.PI / 2), ringMat);
    ring.position.set(x, y + 0.1, z);
    scene.add(beam, ring);
    return { beam, ring, h };
  };
}

// ---------- Light pool: a few real lights follow the nearest lanterns and windows ----------
export class LightPool {
  constructor(scene, count) {
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffa050, 0, 20, 1.6);
      scene.add(l); this.lights.push(l);
    }
    this.t = 0;
  }
  update(dt, sources, cam) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.3;
    const near = [];
    for (const s of sources) {
      const d = (s.x - cam.x) ** 2 + (s.y - cam.y) ** 2 * 0.5 + (s.z - cam.z) ** 2;
      if (d < 90 * 90) near.push([d, s]);
    }
    near.sort((a, b) => a[0] - b[0]);
    this.lights.forEach((l, i) => {
      const s = near[i] && near[i][1];
      if (!s) { l.intensity = 0; return; }
      l.position.set(s.x, s.y, s.z);
      l.color.setHex(s.color);
      l.intensity = s.intensity * 45;
      l.distance = s.range * 1.3;
    });
  }
}

// ---------- Shooting stars, summoned at the Moon Circle ----------
export class ShootingStars {
  constructor(scene, tex) {
    this.stars = [];
    const headMat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(2.5, 2.7, 4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (let i = 0; i < 8; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([3, 3.2, 4, 0, 0, 0]), 3));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      line.frustumCulled = false; line.visible = false;
      const head = new THREE.Sprite(headMat); head.scale.setScalar(7); head.visible = false;
      scene.add(line, head);
      this.stars.push({ line, head, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 });
    }
    this.shower = 0; this.next = 0;
  }
  start(seconds = 7) { this.shower = seconds; }
  update(dt, camera) {
    const cam = camera.position;
    this.shower -= dt; this.next -= dt;
    if (this.shower > 0 && this.next <= 0) {
      this.next = 0.25 + Math.random() * 0.4;
      const s = this.stars.find((x) => x.life <= 0);
      if (s) {
        const f = camera.getWorldDirection(new THREE.Vector3()); f.y = 0; f.normalize();
        const r = new THREE.Vector3(-f.z, 0, f.x), side = (Math.random() - 0.5) * 700, dir = Math.random() < 0.5 ? -1 : 1;
        s.pos.copy(cam).addScaledVector(f, 600).addScaledVector(r, side); s.pos.y += 150 + Math.random() * 200;
        s.vel.copy(r).multiplyScalar(dir * (250 + Math.random() * 200)); s.vel.y = -90 - Math.random() * 90;
        s.life = 1.1;
      }
    }
    for (const s of this.stars) {
      if (s.life <= 0) { s.line.visible = false; s.head.visible = false; continue; }
      s.life -= dt;
      s.pos.addScaledVector(s.vel, dt);
      const p = s.line.geometry.attributes.position;
      p.setXYZ(0, s.pos.x, s.pos.y, s.pos.z);
      p.setXYZ(1, s.pos.x - s.vel.x * 0.3, s.pos.y - s.vel.y * 0.3, s.pos.z - s.vel.z * 0.3);
      p.needsUpdate = true;
      s.line.material.opacity = Math.min(1, s.life * 2);
      s.line.visible = true;
      s.head.position.copy(s.pos); s.head.visible = true;
    }
  }
}
