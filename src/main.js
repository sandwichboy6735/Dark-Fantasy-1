// Moonveil — bootstrap, loading, title flyover, exploration loop, dialogue and saving.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { makePaintShader } from './paint.js';
import { AtmospherePass } from './atmosphere.js';
import { rimColor } from './art.js';

import { Terrain, TerrainMesh } from './terrain.js';
import { World } from './world.js';
import { makeMaterials } from './art.js';
import { Kit } from './kit.js';
import * as S from './structures.js';
import { Flora, glowFlowers } from './flora.js';
import { makeSky, makeCloudSea, makeLake, makeCloudPuffs, Particles, makeWellVisual, LightPool, ShootingStars, moonDir } from './fx.js';
import { buildCharacter, buildDragon, NPC } from './characters.js';
import { NPCS } from './npcs.js';
import { Player } from './player.js';
import { Audio } from './audio.js';
import { PLACES, WATER_Y, BAYOU } from './layout.js';
import { Activities } from './activities.js';
import { drawMap, toMap } from './map.js';
import { GroundCover } from './groundcover.js';
import { buildTown } from './town.js';
import { buildTurtle } from './creatures.js';
import { buildCountryside, stoneCottage } from './settlements.js';
import { addCozy, FISH } from './cozy.js';
import { applyTime, makeWhales, phaseName, DAY_SECONDS } from './daynight.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'moonveil-save-v1';
const SET_KEY = 'moonveil-settings-v1';
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

const isTouch = matchMedia('(pointer: coarse)').matches && (navigator.maxTouchPoints || 0) > 0;
const settings = Object.assign({ quality: isTouch ? 'fast' : 'beautiful', sound: true, sens: 1 }, store.get(SET_KEY) || {});
const HQ = () => settings.quality === 'beautiful';
if (isTouch) document.body.classList.add('touch');

// ---------- Renderer & scene ----------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: HQ(), powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, HQ() ? 1.5 : 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = HQ();
renderer.info.autoReset = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const FOG = new THREE.Color(0x1d1b44);
scene.fog = new THREE.FogExp2(FOG, 0.00012);
scene.background = FOG;
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 9000);

// Moonlit image-based light: a violet sky with a bright moon
{
  const envScene = new THREE.Scene();
  const envMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uMoon: { value: moonDir } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uMoon; varying vec3 vD; void main(){ float h = vD.y; vec3 c = mix(vec3(0.05,0.045,0.09), vec3(0.16,0.15,0.4), smoothstep(-0.2,0.2,h)); c = mix(c, vec3(0.05,0.05,0.16), smoothstep(0.3,1.0,h)); c += vec3(1.2,1.25,2.2) * pow(max(dot(vD,uMoon),0.0), 60.0) * 3.0; gl_FragColor = vec4(c,1.0); }',
  });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), envMat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.9;
}

const moonLight = new THREE.DirectionalLight(0xa8b0ff, 1.7);
moonLight.position.copy(moonDir).multiplyScalar(200);
moonLight.castShadow = HQ();
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 500 });
moonLight.shadow.bias = -0.0006; moonLight.shadow.normalBias = 0.6;
scene.add(moonLight, moonLight.target);
const keyLight = new THREE.PointLight(0xffa860, 0, 6, 1.5);
const backLight = new THREE.PointLight(0x8aa0ff, 0, 6, 1.5);
scene.add(keyLight, backLight);
const hemi = new THREE.HemisphereLight(0x6a68c4, 0x2c2a64, 1.55);
scene.add(hemi);
const lightDir = moonDir.clone();
const _glow = new THREE.Color();
let dayTime = 0.72, lastPhase = '';
const updWhales = makeWhales(scene);

const sky = makeSky();
scene.add(sky.dome, sky.moon);
const cloudSea = makeCloudSea();
scene.add(cloudSea.mesh);
const lake = makeLake();
scene.add(lake.mesh);

// Post-processing: bloom for moon and windows, then a painterly grade
const composer = new EffectComposer(renderer);
for (const rt of [composer.renderTarget1, composer.renderTarget2]) { rt.depthTexture = new THREE.DepthTexture(); rt.depthTexture.type = THREE.UnsignedIntType; }
composer.addPass(new RenderPass(scene, camera));
const atmo = new AtmospherePass(camera, settings.quality);
composer.addPass(atmo);
const bokeh = new BokehPass(scene, camera, { focus: 2, aperture: 0.02, maxblur: 0.01 });
bokeh.enabled = false;
composer.addPass(bokeh);
const paint = new ShaderPass(makePaintShader());
paint.enabled = HQ();
composer.addPass(paint);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.6, 0.86);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uLetter: { value: 0 }, uPortrait: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uLetter, uPortrait; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.3,0.59,0.11));
      c += vec3(0.006, 0.004, 0.02) * (1.0 - smoothstep(0.0, 0.2, l));
      c = mix(vec3(l), c, 1.14);
      // old-master contrast: deeper shadows, warm highlights
      c = pow(max(c, 0.0), vec3(1.08)) * 1.06;
      c *= mix(vec3(0.94, 0.95, 1.04), vec3(1.05, 1.0, 0.92), smoothstep(0.05, 0.6, l));
      vec2 q = vUv - 0.5; c *= clamp(1.0 - dot(q,q) * (1.1 + uPortrait * 1.6), 0.0, 1.0);
      c += (rnd(vUv * 700.0) - 0.5) * 0.018;
      float bar = uLetter * 0.1; if (vUv.y < bar || vUv.y > 1.0 - bar) c = vec3(0.0);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  const pr = renderer.getPixelRatio();
  paint.uniforms.uRes.value.set(w * pr, h * pr);
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 60;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- World state ----------
const mats = makeMaterials();
const terrain = new Terrain();
const world = new World(terrain);
let stars = null, acts = null, ground = null;
const data = { hasBroom: false, raceBest: 0, fish: [], lanterns: 0, snowmen: [] };
{ const s0 = store.get(SAVE_KEY); if (s0) { data.snowmen = s0.snowmen || []; data.lanterns = s0.lanterns || 0; } }
let tmesh = null, flora = null, particles = null, puffDrift = null, player = null, dragon = null, lights = null;
const npcs = [];
const wellVisuals = [];
const audio = new Audio();
let state = 'loading';
let found = new Set();
let met = new Set();
let firstFrameAt = 0;

async function load() {
  const bar = $('loadBar'), text = $('loadText');
  const tick = () => new Promise((r) => setTimeout(r, 0));
  let last = performance.now();
  for (const p of terrain.generate()) {
    bar.style.width = (p * 70) + '%';
    if (performance.now() - last > 30) { await tick(); last = performance.now(); }
  }
  text.textContent = 'Raising the castles';
  bar.style.width = '72%'; await tick();

  tmesh = new TerrainMesh(terrain, scene, mats.terrain);
  const mapCanvas = drawMap(terrain);
  $('mapHolder').prepend(mapCanvas);
  buildPlaces();
  { // waving flags on the towers
    const fg = new THREE.PlaneGeometry(2.2, 1.3, 12, 4); fg.translate(1.1, 0, 0);
    const flagTime = { value: 0 };
    const fm = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.75 });
    fm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = flagTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3][0] * 0.13 + instanceMatrix[3][2] * 0.07;
        transformed.z += sin(position.x * 2.6 - uTime * 5.0 + ph) * 0.22 * position.x;
        transformed.y -= position.x * position.x * 0.04;`);
    };
    const flags = new THREE.InstancedMesh(fg, fm, Math.max(1, world.flags.length));
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    world.flags.forEach((f, i) => {
      m4.compose(new THREE.Vector3(f.x, f.y, f.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.6, 0)), new THREE.Vector3(f.size, f.size, f.size));
      flags.setMatrixAt(i, m4); flags.setColorAt(i, c.set(f.color));
    });
    flags.count = world.flags.length;
    scene.add(flags);
    world.anim.push((t) => { flagTime.value = t; });
  }
  bar.style.width = '82%'; text.textContent = 'Planting the Witchwood'; await tick();
  flora = new Flora(scene, mats, terrain, world, settings.quality === 'fast' ? 'low' : 'high');
  glowFlowers(scene, terrain, world, mats.tex.soft);
  ground = new GroundCover(scene, terrain, world, settings.quality === 'fast' ? 'low' : 'high');
  bar.style.width = '90%'; text.textContent = 'Waking the villagers'; await tick();
  buildPeople();
  particles = new Particles(scene, mats.tex.soft, world, terrain);
  stars = new ShootingStars(scene, mats.tex.soft);
  acts = new Activities({
    scene, player, npcs, world, T: terrain, audio, particles, data, mats, camera,
    fade: (v) => { $('fade').style.opacity = v; },
    stars: (secs) => stars.start(secs),
    resetFov: () => resize(),
    skipTime: () => { const night = dayTime < 0.22 || dayTime > 0.8; dayTime = night ? 0.235 : 0.735; lastPhase = ''; return night ? 'sunrise' : 'sunset'; },
    whisper: showWhisper, banner: showBanner, burst, save,
    hud: (t) => { $('activity').textContent = t; $('activity').hidden = !t; },
    giveBroom,
    dismount: () => { if (player.broom) toggleBroom(); },
  });
  for (const sp of addCozy(acts, () => dragon.g)) things.push({ ...sp, cool: 0 });
  puffDrift = makeCloudPuffs(scene, mats.tex.cloud);
  lights = new LightPool(scene, HQ() ? 6 : 3);
  // Warm up terrain near the title camera and the start
  tmesh.update(-1260, 1450, 400);
  tmesh.update(0, 340, 400);
  bar.style.width = '100%';
  await tick();
  state = 'title';
  $('loading').hidden = true;
  const saved = store.get(SAVE_KEY);
  $('beginBtn').textContent = saved ? 'Tap to continue your journey' : 'Tap to begin';
  $('beginBtn').hidden = false;
  $('anewBtn').hidden = !saved;
}

function buildPlaces() {
  const T = terrain;
  // Village
  let k = new Kit(mats);
  world.flags = [];
  const occupied = [[0, -44, 22], [0, 30, 23], [58, 99, 9], [0, 336, 30]];
  for (const n of NPCS) if (Math.hypot(n.x, n.z - 30) < 140) occupied.push([n.x, n.z, 4.5]);
  buildTown(k, world, T, occupied);
  for (let x = -170; x <= 170; x += 20) { world.noTrees(x, 100, 16); world.noTrees(x * 0.9, 80, 14); }
  // open trails for the wandering turtle and the yak caravan
  for (const n of NPCS) if (n.path && (n.type === 'turtle' || n.name === 'Old Harrow')) {
    const rad = n.type === 'turtle' ? 26 : 9;
    for (let i = 0; i < n.path.length; i++) {
      const [ax, az] = n.path[i], [bx, bz] = n.path[(i + 1) % n.path.length];
      const len = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d <= len; d += rad * 0.6) world.noTrees(ax + (bx - ax) * d / len, az + (bz - az) * d / len, rad);
    }
  }
  S.cottage(k, world, T, 58, 97, 0.1, { w: 7, d: 6, h: 4.4 });
  S.chapel(k, world, T, 0, -44, 0);
  // well
  const wy = T.heightAt(0, 30);
  k.cyl('stone', 1.3, 1.4, 1.1, 12, '#958a80', { x: 0, y: wy + 0.4, z: 30 });
  k.box('wood', 0.15, 2.4, 0.15, '#3a2a20', { x: -1.1, y: wy + 1.2, z: 30 }); k.box('wood', 0.15, 2.4, 0.15, '#3a2a20', { x: 1.1, y: wy + 1.2, z: 30 });
  k.add('roof', new THREE.ConeGeometry(1.8, 1.2, 4), '#4a3a30', { x: 0, y: wy + 2.8, z: 30, ry: Math.PI / 4 });
  world.circle(0, 30, 1.4, wy - 1, wy + 3);
  for (const [x, z] of [[-10, 40], [12, 22], [-40, 30], [45, 30], [0, 80], [-80, 40], [80, 35], [20, -30]]) S.lanternPost(k, world, T, x, z);
  S.overlook(k, world, T, 0, 336);
  S.lanternPost(k, world, T, -6, 344);
  scene.add(k.build());
  S.waterWheel(scene, mats, world, 58.5, WATER_Y + 1.7, 104.5, 0.1);
  // Roads
  k = new Kit(mats); S.roadLanterns(k, world, T); scene.add(k.build({ shadows: false }));
  // Castle Vaelmoor & gatehouse
  k = new Kit(mats); S.bigCastle(k, world, T, -380, -560); S.gatehouse(k, world, T, -322, -470); scene.add(k.build());
  // Goblin Market
  k = new Kit(mats);
  const cloths = ['#7a1a2a', '#3a2a6a', '#2a5a3a', '#8a5a1a', '#5a1a5a', '#1a4a5a', '#7a3a1a', '#4a4a7a'];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    S.stall(k, world, T, -640 + Math.cos(a) * 24, 140 + Math.sin(a) * 24, Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI, cloths[i]);
  }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; S.goblinHut(k, world, T, -640 + Math.cos(a) * 52, 140 + Math.sin(a) * 52, Math.atan2(-Math.cos(a), -Math.sin(a))); }
  const fy = T.heightAt(-640, 140);
  for (let i = 0; i < 6; i++) { const a = i; k.cyl('wood', 0.2, 0.2, 2.4, 6, '#3a2a20', { x: -640 + Math.cos(a) * 0.9, y: fy + 0.4, z: 140 + Math.sin(a) * 0.9, rz: Math.cos(a) * 1.2, rx: Math.sin(a) * 1.2 }); }
  k.cone('glow', 1.2, 2.4, 8, '#ff8a30', { x: -640, y: fy + 1.2, z: 140, bright: 2.6 });
  k.cone('glow', 0.7, 1.8, 7, '#ffd070', { x: -640, y: fy + 1.4, z: 140, bright: 3 });
  world.lights.push({ x: -640, y: fy + 2, z: 140, color: 0xff9040, intensity: 3, range: 40 });
  world.circle(-640, 140, 1.4, fy - 2, fy + 3);
  // string lights between stalls
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2, b = ((i + 1) / 8) * Math.PI * 2 + 0.2;
    const x1 = -640 + Math.cos(a) * 22, z1 = 140 + Math.sin(a) * 22, x2 = -640 + Math.cos(b) * 22, z2 = 140 + Math.sin(b) * 22;
    for (let j = 1; j < 8; j++) {
      const t = j / 8, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
      k.sphere('glow', 0.09, ['#ffb45e', '#ff7a5a', '#c890ff', '#7ad0ff'][j % 4], { x, y: T.heightAt(x, z) + 4.2 - Math.sin(t * Math.PI) * 1.2, z, bright: 1.5, ws: 5, hs: 4 });
    }
  }
  { // Grizzleby's counter under a stone arch
    const gx = -640, gz = 118, gy = T.heightAt(gx, gz);
    k.box('wood', 2.6, 1.0, 0.7, '#4a3222', { x: gx, y: gy + 0.5, z: gz + 1.3 });
    k.box('wood', 2.8, 0.08, 0.85, '#5e402a', { x: gx, y: gy + 1.04, z: gz + 1.3 });
    k.box('plain', 0.42, 0.03, 0.55, '#e4d6b0', { x: gx + 0.2, y: gy + 1.1, z: gz + 1.3, rz: 0.08, ry: 0.1 });
    k.box('plain', 0.42, 0.03, 0.55, '#dccca4', { x: gx + 0.62, y: gy + 1.1, z: gz + 1.3, rz: -0.08, ry: 0.1 });
    k.box('velvet', 0.9, 0.04, 0.6, '#3a1a14', { x: gx + 0.41, y: gy + 1.08, z: gz + 1.3, ry: 0.1 });
    k.cyl('plain', 0.07, 0.07, 0.5, 14, '#d8c8a0', { x: gx - 0.5, y: gy + 1.13, z: gz + 1.55, rz: Math.PI / 2, ry: 0.3 });
    k.cyl('glass', 0.04, 0.05, 0.08, 12, '#203040', { x: gx + 0.1, y: gy + 1.12, z: gz + 1.05 });
    k.cone('plain', 0.012, 0.35, 5, '#e8e0d0', { x: gx + 0.12, y: gy + 1.28, z: gz + 1.05, rz: -0.3 });
    for (let i = 0; i < 6; i++) k.cyl('metal', 0.03, 0.03, 0.008, 12, '#d8b050', { x: gx + 0.6 + (i % 3) * 0.02, y: gy + 1.09 + i * 0.009, z: gz + 1.2 + (i % 2) * 0.02 });
    // lantern on the counter
    const lx = gx - 1.05, lz = gz + 1.3, ly = gy + 1.08;
    k.cyl('metal', 0.1, 0.12, 0.05, 10, '#2a2622', { x: lx, y: ly + 0.03, z: lz });
    k.cyl('glow', 0.08, 0.08, 0.26, 12, '#ffa040', { x: lx, y: ly + 0.19, z: lz, bright: 2.4 });
    for (let b = 0; b < 4; b++) { const a = b * Math.PI / 2 + 0.4; k.cyl('metal', 0.008, 0.008, 0.3, 4, '#2a2622', { x: lx + Math.cos(a) * 0.1, y: ly + 0.19, z: lz + Math.sin(a) * 0.1 }); }
    k.cone('metal', 0.12, 0.12, 10, '#2a2622', { x: lx, y: ly + 0.39, z: lz });
    world.lights.push({ x: lx, y: ly + 0.8, z: lz + 0.4, color: 0xff9a40, intensity: 0.35, range: 8 });
    // stone arch behind him
    for (const sx of [-1.7, 1.7]) k.box('stone', 0.6, 3.2, 0.7, '#6e6660', { x: gx + sx, y: gy + 1.6, z: gz - 1.2 });
    k.add('stone', new THREE.TorusGeometry(1.7, 0.32, 10, 24, Math.PI), '#6e6660', { x: gx, y: gy + 3.2, z: gz - 1.2 });
    k.box('stone', 4.2, 4.8, 0.4, '#3a3432', { x: gx, y: gy + 2.4, z: gz - 1.6 });
    world.box(gx, gz + 1.3, 1.3, 0.35, 0, gy - 1, gy + 1.1);
    world.box(gx, gz - 1.5, 2.1, 0.4, 0, gy - 1, gy + 5);
  }
  world.noTrees(-640, 140, 70);
  scene.add(k.build());
  // Witchwood
  k = new Kit(mats);
  const pots = [[600, -60, 0.4], [720, 80, 2.2], [560, 120, -0.6], [700, -100, 1.5]].map(([x, z, r]) => S.witchHut(k, world, T, x, z, r));
  { // broom rack
    const x = 598, z = 46, y = T.heightAt(x, z);
    for (const dx of [-1.4, 1.4]) k.cyl('wood', 0.07, 0.07, 1.8, 5, '#3a2a20', { x: x + dx, y: y + 0.9, z });
    k.box('wood', 3.2, 0.12, 0.12, '#3a2a20', { x, y: y + 1.7, z });
    for (let i = 0; i < 3; i++) {
      k.cyl('wood', 0.03, 0.03, 1.9, 5, '#5a4030', { x: x - 0.8 + i * 0.8, y: y + 1.05, z: z + 0.1, rz: 0.12 });
      k.cone('thatch', 0.2, 0.55, 7, '#a08858', { x: x - 0.8 + i * 0.8 - 0.05, y: y + 0.28, z: z + 0.1 });
    }
    world.circle(x, z, 1.6, y - 1, y + 2);
    world.lights.push({ x, y: y + 2, z, color: 0xc890ff, intensity: 1, range: 10 });
    k.sphere('glow', 0.12, '#c890ff', { x, y: y + 1.95, z, bright: 2.5 });
  }
  { // ferry dock on the south shore of the Mirror Lake
    for (let i = 0; i < 7; i++) {
      const x = 60 - i * 1.1, z = 300 - i * 2.4;
      k.box('wood', 2.6, 0.18, 2.5, '#5a4432', { x, y: WATER_Y + 0.7, z, ry: 0.42 });
      k.cyl('wood', 0.12, 0.12, 3, 5, '#3a2a20', { x: x + 1.2, y: WATER_Y - 0.4, z });
    }
    const by = T.heightAt(60, 298);
    k.cyl('wood', 0.08, 0.08, 2.4, 5, '#3a2a20', { x: 61.6, y: by + 1.2, z: 298 });
    k.cone('metal', 0.22, 0.35, 10, '#c8a860', { x: 61.6, y: by + 2.35, z: 298, open: true });
    world.platform({ x: 56.5, z: 292, r: 7, top: () => WATER_Y + 0.8 });
    world.noTrees(60, 295, 12);
  }
  scene.add(k.build());
  // Graves, circle, tower, lighthouse
  k = new Kit(mats); S.graves(k, world, T, 430, 500); scene.add(k.build());
  k = new Kit(mats); S.moonCircle(scene, k, world, T, -280, 540, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.8, 4) })); scene.add(k.build());
  k = new Kit(mats); const towerTop = S.wizardTower(scene, k, world, T, -760, -260, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.55, 1.9) })); scene.add(k.build());
  k = new Kit(mats); S.lighthouse(scene, k, world, T, 120, 1190); scene.add(k.build());
  // Floating isles & stepping stones
  S.floatingIsles(scene, mats, world);
  { // the bayou's dark water shares the lake's shader
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(BAYOU.r * 2 + 160, BAYOU.r * 2 + 160).rotateX(-Math.PI / 2), lake.mesh.material);
    bw.position.set(BAYOU.x, BAYOU.water, BAYOU.z);
    scene.add(bw);
    // a low ember glow behind the cypresses, like a sunset that never quite ends
    const glowTex = mats.tex.soft;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.2, 0.55, 0.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sprite.scale.set(160, 70, 1); sprite.position.set(BAYOU.x + 120, BAYOU.water + 22, BAYOU.z + 150);
    scene.add(sprite);
    world.lights.push({ x: BAYOU.x + 90, y: BAYOU.water + 10, z: BAYOU.z + 110, color: 0xff5a20, intensity: 3, range: 70 });
    // the Emberdeep: a forge-glow in a mountain pass
    const ey = T.heightAt(140, -690);
    const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(3, 1.6, 0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    eg.scale.set(90, 60, 1); eg.position.set(140, ey + 20, -690);
    scene.add(eg);
    const ek = new Kit(mats);
    ek.box('stone', 14, 16, 4, '#5a5048', { x: 140, y: ey + 6, z: -694 });
    ek.box('glow', 6, 9, 0.3, '#ffb040', { x: 140, y: ey + 4, z: -691.8, bright: 2.5 });
    for (const sx of [-5, 5]) { ek.box('stone', 2.6, 14, 2.6, '#6a5e54', { x: 140 + sx, y: ey + 6, z: -691 }); ek.cone('glow', 0.6, 1.4, 6, '#ff8a30', { x: 140 + sx, y: ey + 13.6, z: -690, bright: 3 }); }
    ek.box('stone', 14, 2.2, 3, '#6a5e54', { x: 140, y: ey + 11.5, z: -691 });
    scene.add(ek.build());
    world.lights.push({ x: 140, y: ey + 6, z: -686, color: 0xffa040, intensity: 4, range: 60 });
    world.box(140, -693, 7, 2.2, 0, ey - 2, ey + 14);
  }
  { // an old stone cottage in the glade below Wayfarer's Rest, like the one in the painting
    const ck = new Kit(mats);
    // pick the flattest open spot a short walk below the overlook
    let best = null;
    for (let a = 0; a < 40; a++) for (let d = 45; d <= 130; d += 15) {
      const x = Math.cos(a / 40 * Math.PI * 2) * d, z = 352 + Math.sin(a / 40 * Math.PI * 2) * d;
      const h = T.heightAt(x, z); if (h < WATER_Y + 3 || T.roadDist(x, z) < 12 || z < 300) continue;
      let sl = 0; for (let b = 0; b < 6; b++) sl += T.slope(x + Math.cos(b) * 6, z + Math.sin(b) * 6);
      if (!best || sl < best[2]) best = [x, z, sl];
    }
    world.showCottage = best;
    world.noTrees(best[0], best[1], 26);
    stoneCottage(ck, world, T, best[0], best[1], Math.atan2(-best[0], 352 - best[1]), 77);
    scene.add(ck.build());
  }
  world.countryside = buildCountryside(scene, Kit, mats, world, T);
  // Launch updraft at Starfall Point
  { const ly = T.heightAt(-884, 884); world.wells.push({ x: -884, z: 884, r: 2.2, y: () => ly, boost: 24 }); }
  // Lifts
  for (const l of S.liftTargets(world, T, towerTop)) world.wells.push(l);
  const makeWell = makeWellVisual(scene);
  for (const w of world.wells) {
    const v = makeWell(w.x, w.y(), w.z, w.to ? 18 : 12);
    wellVisuals.push({ w, v });
  }
  world.bubbles = pots;
  addInteractables(T, pots[0]);
}

function buildPeople() {
  for (const def of NPCS) {
    const model = def.type === 'turtle' ? buildTurtle(mats) : buildCharacter(mats, def.type, def.o || {});
    if (def.beh === 'boat') {
      const bk = new Kit(mats);
      bk.box('wood', 1.4, 0.5, 4.2, '#4a3526', { y: -0.1 });
      bk.cone('wood', 0.7, 1.2, 4, '#4a3526', { y: -0.1, z: 2.6, rx: Math.PI / 2, ry: Math.PI / 4, sz: 0.5 });
      bk.cyl('wood', 0.04, 0.04, 3.2, 5, '#3a2a20', { x: 0.5, y: 1.2, z: 1.2, rx: 0.5 });
      bk.box('glow', 0.2, 0.28, 0.2, '#ffb060', { x: 0.5, y: 2.5, z: 2.1, bright: 3 });
      model.add(bk.build());
    }
    scene.add(model);
    const npc = new NPC(def, model, world);
    npcs.push(npc);
    if (def.beh !== 'fly' && def.beh !== 'boat') world.talkers.push(npc);
    if (def.type === 'turtle') {
      let walk = 0;
      npc.onUpdate = (dt) => {
        walk += dt * (npc.target ? 1.2 : 0);
        model.userData.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(walk + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.22; });
        model.rotation.z = Math.sin(walk * 2) * 0.012;
      };
    }
  }
  // Leaders keep a trail that their followers walk along
  for (const n of npcs) if (n.def.beh === 'follow') {
    n.leader = npcs.find((m) => m.name === n.def.leader);
    if (n.leader && !n.leader.trail) n.leader.trail = [];
  }
  // The dragon Vessryn circles the Moonspire
  dragon = buildDragon(mats);
  dragon.g.scale.setScalar(2.2);
  scene.add(dragon.g);
  // The player
  const pm = buildCharacter(mats, 'wizard', { robe: '#2b3372', cloak: '#1f2658', hat: '#1e2456', beard: false, orb: '#a8dcff', skin: '#e6c2a4' });
  const staffLight = new THREE.PointLight(0x9fd0ff, 3, 12, 1.6);
  staffLight.position.set(0.52, 2.3, 0.3);
  pm.add(staffLight);
  pm.rotation.order = 'YXZ';
  const bk = new Kit(mats);
  bk.cyl('wood', 0.035, 0.035, 2.4, 6, '#5a4030', { y: 0.75, z: 0.2, rx: Math.PI / 2 });
  bk.cone('thatch', 0.26, 0.7, 8, '#a08858', { y: 0.75, z: -1.2, rx: -Math.PI / 2 });
  bk.sphere('glow', 0.06, '#c890ff', { y: 0.75, z: 1.42, bright: 2.5 });
  const broomModel = bk.build({ shadows: false });
  broomModel.visible = false;
  pm.add(broomModel);
  scene.add(pm);
  player = new Player(pm, world, terrain);
  player.broomModel = broomModel;
  player.onStep = () => audio.step(player.swimming);
  player.onLand = () => { audio.land(); burst(player.pos.x, player.pos.y + 0.1, player.pos.z, [[0.5, 0.45, 0.4]], 14, 1.5, 2.5, 0.6); };
  player.onJump = () => audio.whoosh(0.05);
  player.onLift = (label) => { audio.lift(); if (label) showWhisper(label, 2.5); };
  player.onFallIntoClouds = () => showWhisper('The clouds catch you, and carry you back to solid ground.');
}

// ---------- HUD ----------
let bannerT = 0, whisperT = 0;
function showBanner(name, sub, kicker = 'You have found') {
  $('bannerKicker').textContent = kicker; $('bannerName').textContent = name; $('bannerSub').textContent = sub;
  $('banner').classList.add('show'); bannerT = 5.5;
}
function showWhisper(text, dur = 4.5) { $('whisper').textContent = text; $('whisper').classList.add('show'); whisperT = dur; }

const compassItems = [];
{
  const strip = $('compassStrip');
  for (const [label, ang] of [['N', Math.PI], ['E', Math.PI / 2], ['S', 0], ['W', -Math.PI / 2]]) {
    const s = document.createElement('span'); s.className = 'dir'; s.textContent = label; strip.appendChild(s);
    compassItems.push({ el: s, angle: ang });
  }
  for (const p of PLACES) {
    const s = document.createElement('span'); s.className = 'place unknown'; s.textContent = '◆'; strip.appendChild(s);
    compassItems.push({ el: s, place: p });
  }
}
function updateCompass() {
  const w = $('compass').clientWidth;
  const view = player.camYaw + Math.PI; // direction the camera looks
  for (const it of compassItems) {
    let a = it.angle;
    if (it.place) {
      const d = Math.hypot(it.place.x - player.pos.x, it.place.z - player.pos.z);
      if (d < it.place.r) { it.el.style.display = 'none'; continue; }
      a = Math.atan2(it.place.x - player.pos.x, it.place.z - player.pos.z);
      const known = found.has(it.place.id);
      it.el.classList.toggle('unknown', !known);
      it.el.textContent = known ? '◆ ' + it.place.name : '◇';
      it.el.style.fontSize = '';
    }
    let diff = a - view;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    const x = w / 2 - diff / (Math.PI / 2) * (w / 2);
    it.el.style.display = Math.abs(diff) < Math.PI / 1.6 ? '' : 'none';
    it.el.style.left = x + 'px';
  }
}

function checkPlaces() {
  for (const p of PLACES) {
    if (found.has(p.id)) continue;
    const dx = p.x - player.pos.x, dz = p.z - player.pos.z;
    if (dx * dx + dz * dz < p.r * p.r) {
      found.add(p.id);
      showBanner(p.name, p.sub);
      audio.chime();
      save();
      return;
    }
  }
}

// ---------- A few things to do ----------
const things = [];
const FORTUNES = [
  'Your coin sinks, glowing. You feel a little braver.',
  'The well whispers back: \u201cYes. Probably.\u201d',
  'Somewhere, a goblin sneezes. That means good luck.',
  'The water ripples into the shape of a crescent moon.',
  'You hear a faint giggle from the bottom of the well.',
];
function burst(x, y, z, colors, n, up = 6, spread = 3, life = 1.6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
    particles.sparkle(x, y, z, Math.cos(a) * r, up * (0.5 + Math.random()), Math.sin(a) * r, colors[i % colors.length], life * (0.6 + Math.random() * 0.6));
  }
}
function addInteractables(T, pot) {
  const add = (x, z, label, act, y = T.heightAt(x, z)) => things.push({ x, z, y, label, act, cool: 0 });
  add(0, -29.5, 'Ring the chapel bell', () => {
    audio.bell(); setTimeout(() => audio.bell(), 900);
    burst(0, T.heightAt(0, -33) + 30, -33, [[1.6, 1.3, 0.6]], 40, 2, 4);
    showWhisper('DONG... DONG... The bell rings out across Moonveil.');
  });
  add(0, 32.6, 'Toss a coin into the well', () => {
    audio.chime();
    burst(0, T.heightAt(0, 30) + 1, 30, [[1.6, 1.4, 0.5], [0.6, 0.8, 1.8]], 30, -1.5, 0.6);
    showWhisper(FORTUNES[(Math.random() * FORTUNES.length) | 0]);
  });
  add(-640, 143.5, 'Throw goblin powder on the fire', () => {
    audio.thud(300, 0.5, 0.4); audio.chime();
    burst(-640, T.heightAt(-640, 140) + 2, 140, [[2, 0.5, 0.3], [0.4, 2, 0.6], [0.5, 0.7, 2.2], [2, 0.4, 2]], 120, 12, 5, 2.2);
    showWhisper('FWOOSH! The goblins cheer. \u201cDo it again!\u201d');
  });
  add(pot.cx - 1.6, pot.cz, 'Stir the cauldron', () => {
    audio.thud(200, 0.4, 0.2);
    burst(pot.cx, pot.cy + 1.3, pot.cz, [[0.4, 2, 0.6], [1.2, 0.5, 2]], 70, 3, 1.2, 2.4);
    showWhisper('Blorp. The stew smells of mushrooms and something that might be a sock.');
  });
  add(596, 44, 'Take a broom from the rack', () => giveBroom(true));
  add(60, 298, 'Ring for the ferryman', () => { audio.ding(); acts.start('boat'); });
  add(-278, 537, 'Touch the humming stone', () => {
    audio.chime(); setTimeout(() => audio.chime(), 400);
    burst(-280, T.heightAt(-280, 540) + 3, 540, [[0.6, 0.9, 2.4]], 60, 5, 2);
    stars.start(8);
    showWhisper('The stones hum louder. Look up! The sky is falling, very gently.');
  });
}
function nearestThing() {
  let best = null, bd = 3.2;
  for (const t of things) {
    const d = Math.hypot(t.x - player.pos.x, t.z - player.pos.z);
    if (d < bd && Math.abs(t.y - player.pos.y) < 3) { bd = d; best = t; }
  }
  return best;
}
function useThing(t) { if (t.cool > 0) return; t.cool = 2.5; t.act(); }
function doAction() {
  if (acts.active) { if (acts.cur.onAction && acts.cur.onAction()) return; acts.stop(); return; }
  const n = nearestTalker();
  if (n) { openTalk(n); return; }
  const t = nearestThing();
  if (t) useThing(t);
}

// ---------- Dialogue ----------
let talk = null; // { npc, i, shown, full, t }
function nearestTalker() {
  let best = null, bd = 3.8;
  for (const n of npcs) {
    if (!n.talkable) continue;
    const d = Math.hypot(n.pos.x - player.pos.x, n.pos.z - player.pos.z) - Math.max(0, n.radius - 0.5);
    if (d < bd && Math.abs(n.pos.y - player.pos.y) < 2.6 + n.radius) { bd = d; best = n; }
  }
  return best;
}
function openTalk(n) {
  talk = { npc: n, queue: [...n.lines], line: '', shown: 0, t: 0, asked: false, after: null, choosing: false };
  n.talking = true;
  met.add(n.name);
  $('dlgName').textContent = n.name; $('dlgTitle').textContent = n.title;
  $('dialogue').hidden = false; $('prompt').hidden = true; $('tTalk').hidden = true;
  $('dlgChoices').hidden = true;
  player.facing = Math.atan2(n.pos.x - player.pos.x, n.pos.z - player.pos.z);
  nextLine();
}
function nextLine() {
  if (talk.queue.length) { talk.line = talk.queue.shift(); talk.shown = 0; $('dlgText').textContent = ''; return; }
  const ask = talk.npc.def.ask;
  if (ask && !talk.asked) {
    talk.asked = true; talk.line = ask.q; talk.shown = 0; talk.choosing = true;
    const box = $('dlgChoices'); box.innerHTML = '';
    ask.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="num">${i + 1}</span>${o.text}`;
      b.addEventListener('click', (e) => { e.stopPropagation(); choose(i); });
      box.appendChild(b);
    });
    return;
  }
  const after = talk.after;
  closeTalk();
  if (after) doAfter(after);
}
function choose(i) {
  if (!talk || !talk.choosing) return;
  const o = talk.npc.def.ask.options[i]; if (!o) return;
  talk.choosing = false; $('dlgChoices').hidden = true;
  talk.queue = [o.reply]; talk.after = o.do || null;
  audio.talk(1.2);
  nextLine();
}
function doAfter(what) {
  if (what === 'broom') giveBroom(false);
  else if (what === 'stars') { stars.start(10); audio.chime(); setTimeout(() => audio.chime(), 500); }
  else if (what === 'purr') { for (let i = 0; i < 6; i++) setTimeout(() => audio.thud(160, 0.18, 0.12), i * 260); }
  else acts.start(what);
}
function advanceTalk() {
  if (!talk) return;
  if (talk.shown < talk.line.length) { talk.shown = talk.line.length; $('dlgText').textContent = talk.line; if (talk.choosing) $('dlgChoices').hidden = false; return; }
  if (talk.choosing) return;
  nextLine();
}
function closeTalk() {
  if (!talk) return;
  talk.npc.talking = false;
  talk = null;
  $('dialogue').hidden = true; $('dlgChoices').hidden = true;
  save();
}
function updateTalk(dt) {
  if (!talk) return;
  const line = talk.line;
  if (talk.shown < line.length) {
    talk.t += dt;
    while (talk.t > 0.022 && talk.shown < line.length) {
      talk.t -= 0.022; talk.shown++;
      if (talk.shown % 3 === 0 && /\w/.test(line[talk.shown])) audio.talk(talk.npc.voice);
    }
    $('dlgText').textContent = line.slice(0, talk.shown);
    if (talk.shown >= line.length && talk.choosing) $('dlgChoices').hidden = false;
  }
  $('dlgMore').style.visibility = talk.shown >= line.length && !talk.choosing ? 'visible' : 'hidden';
  if (Math.hypot(talk.npc.pos.x - player.pos.x, talk.npc.pos.z - player.pos.z) - Math.max(0, talk.npc.radius - 0.5) > 7) closeTalk();
}
function giveBroom(mount) {
  if (!data.hasBroom) {
    data.hasBroom = true;
    showBanner('A broom of your own', isTouch ? 'Tap Broom to fly. Look where you want to go.' : 'Press B to fly. Look where you want to go; Space climbs, C dives, Shift goes fast.', 'You got');
    audio.fanfare();
    save();
  }
  if (isTouch) $('tBroom').hidden = false;
  if (mount && !player.broom) toggleBroom();
}
function toggleBroom() {
  if (!data.hasBroom || state !== 'play') return;
  if (acts && acts.active && acts.cur.stopLabel !== 'Give up the race') return;
  player.setBroom(!player.broom);
  audio.whoosh(player.broom ? 0.2 : 0.1);
  $('tBroom').classList.toggle('on', player.broom);
}
$('dialogue').addEventListener('click', advanceTalk);

// ---------- Portrait camera while talking ----------
let portraitK = 0, portraitCamPos = null;
const _pt = new THREE.Vector3(), _pc = new THREE.Vector3();
function portraitCam(dt) {
  const n = talk.npc, ud = n.model.userData;
  const f = [Math.sin(n.facing), Math.cos(n.facing)], side = [Math.cos(n.facing), -Math.sin(n.facing)];
  const hy = ud.headY || 1.6, hz = ud.headZ || 0;
  const head = _pt.set(n.pos.x + f[0] * hz, n.pos.y + hy, n.pos.z + f[1] * hz);
  const dist = 0.45 + (ud.radius || 0.4) * 1.65;
  _pc.set(head.x + f[0] * dist + side[0] * dist * 0.22, head.y - 0.08, head.z + f[1] * dist + side[1] * dist * 0.22);
  if (!portraitCamPos) portraitCamPos = camera.position.clone().lerp(_pc, 0.85);
  portraitCamPos.lerp(_pc, window.__snapCam ? 1 : 1 - Math.exp(-dt * 4));
  camera.position.copy(portraitCamPos);
  camera.lookAt(head.x, head.y - dist * 0.14, head.z);
  // warm lantern key light low on one side, cool moonlit rim from behind
  keyLight.position.set(head.x + f[0] * 1.3 - side[0] * 0.9, head.y + 0.15, head.z + f[1] * 1.3 - side[1] * 0.9);
  backLight.position.set(head.x - f[0] * 0.9 + side[0] * 0.5, head.y + 0.6, head.z - f[1] * 0.9 + side[1] * 0.5);
  bokeh.uniforms.focus.value = camera.position.distanceTo(head);
}

// ---------- Map ----------
function openMap() {
  if (state !== 'play') return;
  closeTalk();
  if (acts.active) acts.stop();
  state = 'map';
  releaseMouse();
  const pins = $('mapPins'); pins.innerHTML = '';
  for (const p of PLACES) {
    const known = found.has(p.id);
    const el = document.createElement(known ? 'button' : 'div');
    el.className = 'pin' + (known ? '' : ' unknown');
    el.textContent = known ? p.name : '?';
    const [mx, my] = toMap(p.x, p.z);
    el.style.left = (mx / 10.24) + '%'; el.style.top = (my / 10.24) + '%';
    if (known) {
      el.setAttribute('aria-label', 'Travel to ' + p.name);
      el.addEventListener('click', () => travelTo(p));
    }
    pins.appendChild(el);
  }
  const [px, py] = toMap(player.pos.x, player.pos.z);
  const me = $('mapMe');
  me.style.left = `calc(${px / 10.24}% - 8px)`; me.style.top = `calc(${py / 10.24}% - 12px)`;
  me.style.transform = `rotate(${(Math.PI - player.facing) * 180 / Math.PI}deg)`;
  $('mapHelp').textContent = isTouch ? 'Tap a place you have found to travel there by moonlight. Tap outside the map to close it.' : 'Click a place you have found to travel there by moonlight. Press M or Esc to close.';
  $('hud').hidden = true;
  $('mapPanel').hidden = false;
}
function closeMap() { if (state !== 'map') return; $('mapPanel').hidden = true; $('hud').hidden = false; state = 'play'; captureMouse(); }
const TRAVEL = { bayou: [520, 620], emberdeep: [120, -660], overlook: [-1.6, 347], lake: [60, 300], village: [0, 60], castle: [-380, -548], moonspire: [60, -600], witchwood: [600, 30], market: [-640, 124], graves: [430, 530], circle: [-272, 560], tower: [-752, -244], lighthouse: [126, 1170], starfall: [-852, 852], queen: [-1258, 1296] };
function travelTo(p) {
  $('mapPanel').hidden = true;
  $('hud').hidden = false;
  state = 'play';
  $('fade').style.opacity = 1;
  audio.lift();
  if (player.broom) toggleBroom();
  setTimeout(() => {
    const [x, z] = TRAVEL[p.id] || [p.x, p.z];
    player.place(x, z, player.facing);
    player._cam = null;
    setTimeout(() => { $('fade').style.opacity = 0; showWhisper('You travel by moonlight to ' + p.name + '.', 3); }, 500);
    captureMouse();
  }, 900);
}
$('mapBtn').addEventListener('click', (e) => { e.stopPropagation(); openMap(); });
$('mapPanel').addEventListener('click', (e) => { if (e.target.id === 'mapPanel') closeMap(); });

// ---------- Save ----------
function save() {
  if (!player || state === 'title' || state === 'loading') return;
  store.set(SAVE_KEY, { v: 1, pos: [player.pos.x, player.pos.y, player.pos.z], facing: player.facing, camYaw: player.camYaw, found: [...found], met: [...met], hasBroom: data.hasBroom, raceBest: data.raceBest, fish: data.fish, lanterns: data.lanterns, snowmen: data.snowmen, dayTime });
}
setInterval(() => { if (state === 'play') save(); }, 20000);
window.addEventListener('pagehide', save);

// ---------- Start ----------
function begin(fresh) {
  if (state !== 'title') return;
  if (settings.sound) { audio.start(); audio.setVolume(0.8); }
  const s = fresh ? null : store.get(SAVE_KEY);
  if (s) {
    found = new Set(s.found || []); met = new Set(s.met || []);
    if (typeof s.dayTime === 'number') dayTime = s.dayTime;
    data.hasBroom = !!s.hasBroom; data.raceBest = s.raceBest || 0; data.fish = s.fish || []; data.lanterns = s.lanterns || 0;
    player.place(s.pos[0], s.pos[2], s.facing || 0);
    player.pos.y = Math.max(player.pos.y, s.pos[1]);
    player.camYaw = s.camYaw ?? player.camYaw;
  } else {
    dayTime = 0.72;
    found = new Set(); met = new Set(); data.hasBroom = false; data.raceBest = 0; data.fish = []; data.lanterns = 0;
    player.place(-1.6, 347, Math.PI);
    player.camPitch = 0.12; player.camDist = 6;
  }
  state = 'play';
  $('title').hidden = true;
  $('hud').hidden = false;
  $('touch').hidden = !isTouch;
  $('tBroom').hidden = !data.hasBroom;
  $('controlsText').textContent = isTouch
    ? 'Left thumb: walk (push far to run). Drag anywhere else to look around. Jump, and hold it while falling to glide. Tap Talk near someone, or Use near something that glows or hums. Once you have a broom, tap Broom to fly: look where you want to go and hold Jump to climb. The map button (top right) shows where you are; tap a place you have found to travel there.'
    : 'WASD to walk, Shift to run. Mouse to look, scroll to zoom. Space to jump; hold it while falling to glide. E to talk, answer with 1 or 2, and use things. B rides your broom once you have one (Space climbs, C dives, Shift is fast). M opens the map; click a place you have found to travel there. P hides the screen text for photos. Esc for this menu.';
  if (!s) setTimeout(() => showBanner('Moonfall', 'A night in the realm of Moonveil. Walk, fly, play and rest. Nothing here will hurt you.', 'Welcome to'), 600);
  captureMouse();
}
$('title').addEventListener('click', (e) => { if (e.target.id === 'anewBtn') return; if (state === 'title' && !$('beginBtn').hidden) begin(false); });
$('anewBtn').addEventListener('click', (e) => { e.stopPropagation(); begin(true); });

// ---------- Menu ----------
function openMenu() {
  if (state !== 'play') return;
  closeTalk();
  state = 'menu';
  releaseMouse();
  $('menu').hidden = false;
  $('foundCount').textContent = `Places found: ${found.size} of ${PLACES.length}`;
  $('foundList').innerHTML = PLACES.map((p) => `<li class="${found.has(p.id) ? '' : 'no'}">${found.has(p.id) ? p.name : '???'}</li>`).join('');
  $('metCount').textContent = `Folk met: ${met.size} of ${npcs.filter((n) => n.talkable).length} \u00b7 Fish caught: ${data.fish.length} of ${FISH.length} \u00b7 Lanterns released: ${data.lanterns} \u00b7 Snowmen built: ${data.snowmen.length}`;
  $('soundBtn').textContent = 'Sound: ' + (settings.sound ? 'on' : 'off');
  $('sensBtn').textContent = 'Look speed: ' + ({ 0.5: 'very slow', 0.75: 'slow', 1: 'normal', 1.35: 'fast', 1.8: 'very fast' }[settings.sens] || 'normal');
  $('qualityBtn').textContent = 'Graphics: ' + settings.quality + (settings.quality !== store.get(SET_KEY)?.quality ? '' : '');
  save();
}
function closeMenu() { $('menu').hidden = true; state = 'play'; captureMouse(); }
$('menuBtn').addEventListener('click', openMenu);
$('resumeBtn').addEventListener('click', closeMenu);
$('soundBtn').addEventListener('click', () => {
  settings.sound = !settings.sound; store.set(SET_KEY, settings);
  if (settings.sound) { audio.start(); audio.setVolume(0.8); } else audio.setVolume(0);
  $('soundBtn').textContent = 'Sound: ' + (settings.sound ? 'on' : 'off');
});
$('sensBtn').addEventListener('click', () => {
  const steps = [0.5, 0.75, 1, 1.35, 1.8];
  settings.sens = steps[(steps.indexOf(settings.sens) + 1) % steps.length] || 1;
  store.set(SET_KEY, settings);
  $('sensBtn').textContent = 'Look speed: ' + { 0.5: 'very slow', 0.75: 'slow', 1: 'normal', 1.35: 'fast', 1.8: 'very fast' }[settings.sens];
});
$('qualityBtn').addEventListener('click', () => {
  settings.quality = HQ() ? 'fast' : 'beautiful'; store.set(SET_KEY, settings);
  save();
  $('qualityBtn').textContent = 'Graphics: ' + settings.quality + ' (reloading…)';
  setTimeout(() => location.reload(), 400);
});

// ---------- Input ----------
const keys = new Set();
let locked = false, lockFailed = false, lockWorked = false, dragging = false;
function captureMouse() {
  if (isTouch || lockFailed) return;
  try { const p = canvas.requestPointerLock && canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { if (!lockWorked) lockFailed = true; }); } catch { lockFailed = true; }
}
function releaseMouse() { if (document.pointerLockElement) try { document.exitPointerLock(); } catch { /* ignore */ } }
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) lockWorked = true;
  else if (state === 'play') openMenu();
});
document.addEventListener('pointerlockerror', () => { if (!lockWorked) lockFailed = true; });
canvas.addEventListener('mousedown', () => { if (state === 'play' && !locked) { if (lockFailed) dragging = true; else captureMouse(); } if (talk) advanceTalk(); });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (state !== 'play') return;
  if (locked || dragging) look(e.movementX, e.movementY);
});
window.addEventListener('wheel', (e) => { if (state === 'play') player.camDist = Math.max(3, Math.min(16, player.camDist + Math.sign(e.deltaY) * 0.8)); }, { passive: true });
function look(dx, dy) {
  const k = settings.sens || 1;
  player.camYaw -= dx * 0.0032 * k;
  player.camPitch = Math.max(-0.35, Math.min(1.25, player.camPitch + dy * 0.0026 * k));
}
window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (state === 'title' && (k === 'Space' || k === 'Enter') && !$('beginBtn').hidden) { begin(false); return; }
  if (state === 'menu' && k === 'Escape') { closeMenu(); return; }
  if (state === 'map' && (k === 'Escape' || k === 'KeyM')) { closeMap(); return; }
  if (state !== 'play') return;
  keys.add(k);
  if (k === 'Space') e.preventDefault();
  if (talk && talk.choosing && (k === 'Digit1' || k === 'Digit2' || k === 'Digit3')) { choose(+k.slice(5) - 1); return; }
  if (talk && (k === 'KeyE' || k === 'Space' || k === 'Enter')) { advanceTalk(); return; }
  if (k === 'KeyB') toggleBroom();
  if (k === 'KeyM') { openMap(); return; }
  if (k === 'KeyE') doAction();
  if (k === 'Escape') { if (talk) closeTalk(); else if (lockFailed) openMenu(); }
  if (k === 'KeyP') document.body.classList.toggle('photo');
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// Touch: left stick, drag to look, jump & talk buttons
const touch = { stick: null, sx: 0, sy: 0, lookId: null, lx: 0, ly: 0, jump: false, mx: 0, mz: 0 };
if (isTouch) {
  const stick = $('stick'), knob = $('stickKnob');
  stick.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; touch.stick = t.identifier; const r = stick.getBoundingClientRect(); touch.sx = r.left + r.width / 2; touch.sy = r.top + r.height / 2; e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touch.stick) {
        let dx = t.clientX - touch.sx, dy = t.clientY - touch.sy; const d = Math.hypot(dx, dy), max = 55;
        if (d > max) { dx *= max / d; dy *= max / d; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        touch.mx = dx / max; touch.mz = -dy / max;
      } else if (t.identifier === touch.lookId) {
        look((t.clientX - touch.lx) * 1.6, (t.clientY - touch.ly) * 1.6);
        touch.lx = t.clientX; touch.ly = t.clientY;
      }
    }
  }, { passive: true });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touch.stick) { touch.stick = null; touch.mx = touch.mz = 0; knob.style.transform = ''; }
      if (t.identifier === touch.lookId) touch.lookId = null;
    }
  };
  window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
  canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; if (touch.lookId === null) { touch.lookId = t.identifier; touch.lx = t.clientX; touch.ly = t.clientY; } e.preventDefault(); }, { passive: false });
  const jb = $('tJump');
  jb.addEventListener('touchstart', (e) => { e.preventDefault(); touch.jump = true; jb.classList.add('on'); if (talk) advanceTalk(); }, { passive: false });
  jb.addEventListener('touchend', (e) => { e.preventDefault(); touch.jump = false; jb.classList.remove('on'); }, { passive: false });
  $('tTalk').addEventListener('touchstart', (e) => { e.preventDefault(); doAction(); }, { passive: false });
  $('tBroom').addEventListener('touchstart', (e) => { e.preventDefault(); toggleBroom(); }, { passive: false });
}

// ---------- Environment by region ----------
const env = { fireflies: 0.8, fireflyColor: [1.4, 1.1, 0.4], snow: 0 };
function regionEnv(dt) {
  const x = player ? player.pos.x : 0, z = player ? player.pos.z : 0, y = player ? player.pos.y : 0;
  const witch = Math.hypot(x - 640, z - 20) < 330, circle = Math.hypot(x + 280, z - 540) < 120, graves = Math.hypot(x - 430, z - 500) < 120;
  const tc = witch ? [1.2, 0.5, 1.8] : (circle || graves) ? [0.5, 0.8, 1.8] : [1.5, 1.15, 0.4];
  for (let i = 0; i < 3; i++) env.fireflyColor[i] += (tc[i] - env.fireflyColor[i]) * Math.min(1, dt);
  const snowT = z < -300 || y > 150 ? 1 : 0;
  env.snow += (snowT - env.snow) * Math.min(1, dt * 0.5);
  env.fireflies = z < -350 ? 0.2 : 1;
}

// ---------- Where are we? (for the soundscape) ----------
const sm = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const near = (p, x, z, r0, r1) => sm(r1, r0, Math.hypot(p.x - x, p.z - z));
const titleZones = { village: 0, lake: 0, market: 0, fire: 0, witch: 0, graves: 0, circle: 0, castle: 0, snow: 0, high: 1, queen: 1, meadow: 0 };
function zonesAt(p) {
  const ground = terrain.heightAt(p.x, p.z);
  const z = {
    village: near(p, 0, 40, 150, 230),
    lake: sm(1.6, 1.05, Math.hypot(p.x / 250, (p.z - 205) / 118)),
    market: near(p, -640, 140, 90, 150),
    fire: near(p, -640, 140, 12, 45),
    witch: near(p, 640, 20, 250, 330),
    graves: near(p, 430, 500, 80, 130),
    circle: near(p, -280, 540, 25, 60),
    castle: near(p, -380, -560, 70, 130) * sm(140, 170, p.y),
    snow: Math.max(sm(-280, -420, p.z), sm(140, 190, p.y)),
    high: Math.max(sm(30, 90, p.y - ground), sm(160, 260, p.y)),
    queen: near(p, -1260, 1270, 90, 170),
  };
  z.meadow = Math.max(0, 1 - Math.max(z.village, z.market, z.witch, z.graves, z.snow, z.high, z.queen));
  return z;
}

// ---------- Loop ----------
let last = performance.now();
let areaT = 0, titleT = 0, bubbleT = 0, whaleT = 10, lastWhales = [];
const tmpV = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  renderer.info.reset();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (state === 'title') dayTime = 0.765;
  else if (state === 'play') dayTime = (dayTime + dt / DAY_SECONDS) % 1;
  const tod = applyTime(dayTime, { sky, fog: FOG, scene, hemi, renderer, light: moonLight, lightDir, cloudSea, lake, moon: sky.moon });
  rimColor.value.copy(moonLight.color).multiplyScalar(0.18 + tod.night * 0.3);
  atmo.uniforms.uDensity.value = 0.0009 + tod.night * 0.0009;
  atmo.uniforms.uMist.value = 0.4 + tod.night * 0.8;
  atmo.update(camera, lightDir, 1, scene.fog.color, _glow.copy(moonLight.color).multiplyScalar(Math.min(0.9, 0.2 + moonLight.intensity * 0.15)), t);
  renderer.toneMappingExposure *= 1 - 0.28 * portraitK;
  sky.uniforms.uTime.value = t; cloudSea.uniforms.uTime.value = t; lake.uniforms.uTime.value = t; grade.uniforms.uTime.value = t % 10;

  if (state === 'loading') {
    camera.position.set(0, 200, 0); camera.lookAt(0, 200, -100);
    composer.render(dt);
    return;
  }

  if (state === 'title') {
    // Slow flyover of the Moon Queen's castle with the moon behind it
    titleT += dt;
    const a = Math.sin(titleT * 0.05) * 0.35;
    const cx = -1260, cz = 1270;
    camera.position.set(cx + Math.sin(a) * 230, 92 + Math.sin(titleT * 0.08) * 6, cz + Math.cos(a) * 230);
    camera.lookAt(cx, 62, cz - 90);
    tmesh.update(camera.position.x, camera.position.z, 2);
  } else {
    if (state === 'play' && !talk) {
      const inp = player.input;
      if (isTouch) { inp.x = touch.mx; inp.z = touch.mz; inp.run = Math.hypot(touch.mx, touch.mz) > 0.92; inp.jump = touch.jump; }
      else {
        inp.z = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
        inp.x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
        inp.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
        inp.jump = keys.has('Space');
        inp.down = keys.has('KeyC') || keys.has('ControlLeft') || keys.has('ControlRight');
      }
    } else if (player) { player.input.x = player.input.z = 0; player.input.jump = false; }
    if (state === 'play' || state === 'menu') player.update(state === 'menu' ? 0 : dt);
    const portrait = talk && state === 'play' && !(acts && acts.active);
    if (window.__freeCam) { camera.position.fromArray(window.__freeCam.pos); camera.lookAt(...window.__freeCam.look); }
    else if (portrait) portraitCam(dt);
    else if (acts && acts.cur && acts.cur.cam) acts.cur.cam(camera, dt); else player.updateCamera(camera, dt);
    portraitK += ((portrait ? 1 : 0) - portraitK) * Math.min(1, dt * 3);
    grade.uniforms.uPortrait.value = portraitK;
    bokeh.enabled = !!(portrait && HQ());
    keyLight.intensity = portraitK * 1.5; backLight.intensity = portraitK * 3;
    document.body.classList.toggle('talking', !!portrait);
    player.model.visible = !portrait && !window.__freeCam;
    if (!portrait) portraitCamPos = null;
    tmesh.update(player.pos.x, player.pos.z, player.teleported ? 60 : 3);
    player.teleported = false;
    if (state === 'play') {
      areaT -= dt;
      if (areaT <= 0) { areaT = 0.4; checkPlaces(); }
      updateCompass();
      updateTalk(dt);
      for (const th of things) th.cool -= dt;
      acts.update(dt, t);
      const busy = acts.active;
      const n = talk || busy ? null : nearestTalker();
      const th = talk || n || busy ? null : nearestThing();
      $('prompt').hidden = !n && !th && !busy;
      if (isTouch) { $('tTalk').hidden = !n && !th && !busy; $('tTalk').textContent = busy ? 'Stop' : n ? 'Talk' : 'Use'; }
      if (busy) $('promptText').textContent = acts.label;
      else if (n) $('promptText').textContent = 'Talk to ' + n.name;
      else if (th) $('promptText').textContent = typeof th.label === 'function' ? th.label() : th.label;
      if (player.broom && Math.random() < 0.7) particles.sparkle(player.pos.x + (Math.random() - 0.5) * 0.4 - Math.sin(player.facing) * 1.3, player.pos.y + 0.7, player.pos.z - Math.cos(player.facing) * 1.3, 0, -0.2, 0, [1.2, 0.6, 1.8], 1.0);
      // glide trail
      if (player.gliding && Math.random() < 0.6) particles.sparkle(player.pos.x + (Math.random() - 0.5), player.pos.y + 1.2, player.pos.z + (Math.random() - 0.5), 0, -0.3, 0, [0.5, 0.7, 1.6], 1.2);
    }
  }
  const focus = state === 'title' ? camera.position : player.pos;
  flora.update(focus.x, focus.z, HQ() ? 2000 : 1100);
  ground.update(t, focus.x, focus.z);
  mats.wind.value = t;
  tmesh.far = HQ() ? 3200 : 2000;
  const viewer = state === 'title' ? { pos: camera.position } : player;
  for (const n of npcs) n.update(dt, t, viewer);
  for (const f of world.anim) f(t, dt);
  // Dragon
  {
    const a = t * 0.045;
    dragon.g.position.set(180 + Math.cos(a) * 320, 470 + Math.sin(a * 3) * 25, -820 + Math.sin(a) * 320);
    dragon.g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
    dragon.g.rotation.z = 0.2;
    const flap = Math.sin(t * 2.2) * 0.55;
    dragon.wl.rotation.z = flap; dragon.wr.rotation.z = -flap;
  }
  // Wells
  for (const { w, v } of wellVisuals) {
    const y = w.y();
    v.beam.position.y = y + v.h / 2; v.ring.position.y = y + 0.1;
    v.beam.material.opacity = 0.8 + Math.sin(t * 3) * 0.2;
    const d = Math.hypot(w.x - focus.x, w.z - focus.z);
    if (d < 80 && Math.random() < 0.5) { const a = Math.random() * 6.28; particles.sparkle(w.x + Math.cos(a) * 1.8, y + 0.2, w.z + Math.sin(a) * 1.8, 0, 3 + Math.random() * 4, 0, [0.4, 0.7, 2.0], 2.5); }
  }
  // Cauldron bubbles
  bubbleT -= dt;
  if (bubbleT <= 0 && world.bubbles) {
    bubbleT = 0.15;
    for (const p of world.bubbles) if (Math.hypot(p.cx - focus.x, p.cz - focus.z) < 60) particles.sparkle(p.cx + (Math.random() - 0.5), p.cy + 1.3, p.cz + (Math.random() - 0.5), 0, 0.8 + Math.random(), 0, [0.4, 1.6, 0.6], 1.5);
  }
  regionEnv(dt);
  env.fireflies *= 0.2 + 0.8 * tod.night;
  const whales = updWhales(t);
  lastWhales = whales;
  if (state === 'play') {
    const ph = phaseName(dayTime);
    $('timeLabel').textContent = ph;
    if (lastPhase && ph !== lastPhase) {
      const msg = { Dawn: 'Dawn paints the sky rose and gold. Look west for a rainbow.', Morning: 'The sky clears to a soft blue.', Day: 'The floating isles shine in the daylight.', Afternoon: 'The shadows grow long and golden.', Sunset: 'The sun sinks, and the whole sky catches fire.', Dusk: 'Dusk. The lanterns wake up one by one.', Night: 'Night falls. Look north: the sky is dancing.' }[ph];
      if (msg && !talk) showWhisper(msg, 5);
    }
    lastPhase = ph;
    whaleT -= dt;
    if (whaleT <= 0) {
      whaleT = 25 + Math.random() * 30;
      if (whales.some((w) => w.g.position.distanceTo(player.pos) < 900)) audio.whale();
    }
    if (tod.night > 0.8 && Math.random() < dt / 18) stars.start(1.5);
  }
  particles.update(dt, state === 'title' ? camera.position : player.pos, env);
  puffDrift(dt);
  if (acts && acts.cozyUpdate) acts.cozyUpdate(dt, t);
  if (player && player.splashNext && player.swimming) { player.splashNext = false; burst(player.pos.x, WATER_Y, player.pos.z, [[0.7, 0.8, 1.6]], 50, 5, 3, 1.2); audio.thud(700, 0.5, 0.35); showWhisper('SPLASH!', 2); }
  stars.update(dt, camera);
  lights.update(dt, world.lights, state === 'title' ? camera.position : player.pos);

  // Sky follows the camera; the moon sits on the dome
  sky.dome.position.copy(camera.position);
  sky.moon.position.copy(camera.position).addScaledVector(moonDir, 2600);
  sky.moon.lookAt(camera.position);
  sky.moon.scale.setScalar(620);
  cloudSea.mesh.position.x = camera.position.x; cloudSea.mesh.position.z = camera.position.z;
  cloudSea.uniforms.uCam.value.copy(camera.position);
  cloudSea.uniforms.fogColor.value.copy(FOG);
  // Moon shadows follow the player
  tmpV.copy(focus);
  moonLight.target.position.copy(tmpV);
  moonLight.position.copy(tmpV).addScaledVector(lightDir, 250);
  grade.uniforms.uLetter.value += ((document.body.classList.contains('photo') ? 1 : 0) - grade.uniforms.uLetter.value) * Math.min(1, dt * 4);

  if (isTouch && state !== 'loading' && state !== 'title') $('touch').hidden = state !== 'play' || !!talk;
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  if (whisperT > 0) { whisperT -= dt; if (whisperT <= 0) $('whisper').classList.remove('show'); }
  if (state !== 'loading') audio.update(dt, { windStrength: player && player.pos.y > 120 ? 0.9 : 0.35, night: 1, underwater: false, cave: false, zones: state === 'title' ? titleZones : zonesAt(player.pos) });
  composer.render(dt);
  if (!firstFrameAt) firstFrameAt = now;
}
requestAnimationFrame(frame);
load();

window.__df1 = window.__moonveil = { renderer, scene, get atmo() { return atmo; }, composer, get player() { return player; }, get state() { return state; }, npcs, world, terrain, begin, openTalk, nearestTalker, camera, things, useThing, nearestThing, get acts() { return acts; }, data, giveBroom, toggleBroom, choose, get talk() { return talk; }, openMap, travelTo, found: () => found, setTime: (v) => { dayTime = v; }, get whales() { return lastWhales; }, get dbg() { return { portraitK, pc: portraitCamPos && portraitCamPos.toArray(), state, acts: acts && acts.active }; }, get dayTime() { return dayTime; } };
