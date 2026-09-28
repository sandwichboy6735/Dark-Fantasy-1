// Moonveil — bootstrap, loading, title flyover, exploration loop, dialogue and saving.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { Terrain, TerrainMesh } from './terrain.js';
import { World } from './world.js';
import { makeMaterials } from './art.js';
import { Kit } from './kit.js';
import * as S from './structures.js';
import { Flora, glowFlowers } from './flora.js';
import { makeSky, makeCloudSea, makeLake, makeCloudPuffs, Particles, makeWellVisual, LightPool, moonDir } from './fx.js';
import { buildCharacter, buildDragon, NPC } from './characters.js';
import { NPCS } from './npcs.js';
import { Player } from './player.js';
import { Audio } from './audio.js';
import { PLACES, WATER_Y } from './layout.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'moonveil-save-v1';
const SET_KEY = 'moonveil-settings-v1';
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

const isTouch = matchMedia('(pointer: coarse)').matches && (navigator.maxTouchPoints || 0) > 0;
const settings = Object.assign({ quality: isTouch ? 'fast' : 'beautiful', sound: true }, store.get(SET_KEY) || {});
const HQ = () => settings.quality === 'beautiful';
if (isTouch) document.body.classList.add('touch');

// ---------- Renderer & scene ----------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: HQ(), powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, HQ() ? 1.5 : 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = HQ();
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const FOG = new THREE.Color(0x1d1b44);
scene.fog = new THREE.FogExp2(FOG, 0.0012);
scene.background = FOG;
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 6000);

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
scene.add(new THREE.HemisphereLight(0x6a68c4, 0x2c2a64, 1.55));

const sky = makeSky();
scene.add(sky.dome, sky.moon);
const cloudSea = makeCloudSea();
scene.add(cloudSea.mesh);
const lake = makeLake();
scene.add(lake.mesh);

// Post-processing: bloom for moon and windows, then a painterly grade
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.6, 0.86);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uLetter: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uLetter; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.3,0.59,0.11));
      c += vec3(0.006, 0.004, 0.02) * (1.0 - smoothstep(0.0, 0.2, l));
      c = mix(vec3(l), c, 1.08);
      vec2 q = vUv - 0.5; c *= clamp(1.0 - dot(q,q) * 1.1, 0.0, 1.0);
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
  buildPlaces();
  bar.style.width = '82%'; text.textContent = 'Planting the Witchwood'; await tick();
  flora = new Flora(scene, mats, terrain, world, settings.quality === 'fast' ? 'low' : 'high');
  glowFlowers(scene, terrain, world, mats.tex.soft);
  bar.style.width = '90%'; text.textContent = 'Waking the villagers'; await tick();
  buildPeople();
  particles = new Particles(scene, mats.tex.soft, world, terrain);
  puffDrift = makeCloudPuffs(scene, mats.tex.cloud);
  lights = new LightPool(scene, HQ() ? 6 : 3);
  // Warm up terrain near the title camera and the start
  tmesh.update(-1260, 1450, 400);
  tmesh.update(0, 340, 400);
  bar.style.width = '100%';
  await tick();
  state = 'title';
  $('loading').hidden = true;
  const save = store.get(SAVE_KEY);
  $('beginBtn').textContent = save ? 'Tap to continue your journey' : 'Tap to begin';
  $('beginBtn').hidden = false;
  $('anewBtn').hidden = !save;
}

function buildPlaces() {
  const T = terrain;
  // Village
  let k = new Kit(mats);
  const cottages = [[-90, 70, 0.3], [-58, 92, 0.1], [-112, 22, -0.2], [-72, -8, 0.5], [-30, 62, 0], [40, 70, -0.2], [92, 58, 0.4], [112, 14, -0.1], [70, -2, 0.2],
    [32, -6, -0.4], [-24, 6, 0.2], [-130, -40, 0.6], [122, -40, -0.5], [60, -58, 0.1], [-52, -66, -0.3], [-8, 96, 0.05], [-150, 60, 0.3], [150, 40, -0.3]];
  cottages.forEach(([x, z, r], i) => S.cottage(k, world, T, x, z, r, { w: 6 + (i % 3), d: 5 + (i % 2), h: i % 4 === 0 ? 5.2 : 3.4, slate: i % 5 === 0, plaster: ['#d6c8b0', '#c8c0b8', '#d8ccb8', '#bcb4b0'][i % 4] }));
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
  world.noTrees(-640, 140, 70);
  scene.add(k.build());
  // Witchwood
  k = new Kit(mats);
  const pots = [[600, -60, 0.4], [720, 80, 2.2], [560, 120, -0.6], [700, -100, 1.5]].map(([x, z, r]) => S.witchHut(k, world, T, x, z, r));
  scene.add(k.build());
  // Graves, circle, tower, lighthouse
  k = new Kit(mats); S.graves(k, world, T, 430, 500); scene.add(k.build());
  k = new Kit(mats); S.moonCircle(scene, k, world, T, -280, 540, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.8, 4) })); scene.add(k.build());
  k = new Kit(mats); const towerTop = S.wizardTower(scene, k, world, T, -760, -260, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.55, 1.9) })); scene.add(k.build());
  k = new Kit(mats); S.lighthouse(scene, k, world, T, 120, 1190); scene.add(k.build());
  // Floating isles & stepping stones
  S.floatingIsles(scene, mats, world);
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
}

function buildPeople() {
  for (const def of NPCS) {
    const model = buildCharacter(mats, def.type, def.o || {});
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
  scene.add(pm);
  player = new Player(pm, world, terrain);
  player.onStep = () => audio.step(player.swimming);
  player.onLand = () => audio.land();
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

// ---------- Dialogue ----------
let talk = null; // { npc, i, shown, full, t }
function nearestTalker() {
  let best = null, bd = 3.8;
  for (const n of npcs) {
    if (!n.talkable || !n.model.visible) continue;
    const d = Math.hypot(n.pos.x - player.pos.x, n.pos.z - player.pos.z);
    if (d < bd && Math.abs(n.pos.y - player.pos.y) < 2.6) { bd = d; best = n; }
  }
  return best;
}
function openTalk(n) {
  talk = { npc: n, i: 0, shown: 0, t: 0 };
  n.talking = true;
  met.add(n.name);
  $('dlgName').textContent = n.name; $('dlgTitle').textContent = n.title;
  $('dialogue').hidden = false; $('prompt').hidden = true; $('tTalk').hidden = true;
  $('dlgText').textContent = '';
  player.facing = Math.atan2(n.pos.x - player.pos.x, n.pos.z - player.pos.z);
}
function advanceTalk() {
  if (!talk) return;
  const line = talk.npc.lines[talk.i];
  if (talk.shown < line.length) { talk.shown = line.length; $('dlgText').textContent = line; return; }
  talk.i++; talk.shown = 0;
  if (talk.i >= talk.npc.lines.length) closeTalk();
}
function closeTalk() {
  if (!talk) return;
  talk.npc.talking = false;
  talk = null;
  $('dialogue').hidden = true;
  save();
}
function updateTalk(dt) {
  if (!talk) return;
  const line = talk.npc.lines[talk.i];
  if (talk.shown < line.length) {
    talk.t += dt;
    while (talk.t > 0.022 && talk.shown < line.length) {
      talk.t -= 0.022; talk.shown++;
      if (talk.shown % 3 === 0 && /\w/.test(line[talk.shown])) audio.talk(talk.npc.voice);
    }
    $('dlgText').textContent = line.slice(0, talk.shown);
  }
  $('dlgMore').style.visibility = talk.shown >= line.length ? 'visible' : 'hidden';
  if (Math.hypot(talk.npc.pos.x - player.pos.x, talk.npc.pos.z - player.pos.z) > 7) closeTalk();
}
$('dialogue').addEventListener('click', advanceTalk);

// ---------- Save ----------
function save() {
  if (!player || state === 'title' || state === 'loading') return;
  store.set(SAVE_KEY, { v: 1, pos: [player.pos.x, player.pos.y, player.pos.z], facing: player.facing, camYaw: player.camYaw, found: [...found], met: [...met] });
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
    player.place(s.pos[0], s.pos[2], s.facing || 0);
    player.pos.y = Math.max(player.pos.y, s.pos[1]);
    player.camYaw = s.camYaw ?? player.camYaw;
  } else {
    found = new Set(); met = new Set();
    player.place(-1.6, 347, Math.PI);
    player.camPitch = 0.12; player.camDist = 6;
  }
  state = 'play';
  $('title').hidden = true;
  $('hud').hidden = false;
  $('touch').hidden = !isTouch;
  $('controlsText').textContent = isTouch
    ? 'Left thumb: walk (push far to run). Drag anywhere else to look around. Jump, and hold it while falling to glide. Tap Talk near someone.'
    : 'WASD to walk, Shift to run. Mouse to look, scroll to zoom. Space to jump; hold it while falling to glide. E to talk. P hides the screen text for photos. Esc for this menu.';
  if (!s) setTimeout(() => showBanner('Moonveil', 'Walk, glide and meet the folk who live here. Nothing here will hurt you.', 'Welcome to'), 600);
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
  $('metCount').textContent = `Folk met: ${met.size} of ${npcs.filter((n) => n.talkable).length}`;
  $('soundBtn').textContent = 'Sound: ' + (settings.sound ? 'on' : 'off');
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
  player.camYaw -= dx * 0.0032;
  player.camPitch = Math.max(-0.35, Math.min(1.25, player.camPitch + dy * 0.0026));
}
window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (state === 'title' && (k === 'Space' || k === 'Enter') && !$('beginBtn').hidden) { begin(false); return; }
  if (state === 'menu' && k === 'Escape') { closeMenu(); return; }
  if (state !== 'play') return;
  keys.add(k);
  if (k === 'Space') e.preventDefault();
  if (talk && (k === 'KeyE' || k === 'Space' || k === 'Enter')) { advanceTalk(); return; }
  if (k === 'KeyE') { const n = nearestTalker(); if (n) openTalk(n); }
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
  $('tTalk').addEventListener('touchstart', (e) => { e.preventDefault(); const n = nearestTalker(); if (n) openTalk(n); }, { passive: false });
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

// ---------- Loop ----------
let last = performance.now();
let areaT = 0, titleT = 0, bubbleT = 0;
const tmpV = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
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
      }
    } else if (player) { player.input.x = player.input.z = 0; player.input.jump = false; }
    if (state === 'play' || state === 'menu') player.update(state === 'menu' ? 0 : dt);
    player.updateCamera(camera, dt);
    tmesh.update(player.pos.x, player.pos.z, player.teleported ? 60 : 3);
    player.teleported = false;
    if (state === 'play') {
      areaT -= dt;
      if (areaT <= 0) { areaT = 0.4; checkPlaces(); }
      updateCompass();
      updateTalk(dt);
      const n = talk ? null : nearestTalker();
      $('prompt').hidden = !n;
      if (isTouch) $('tTalk').hidden = !n;
      if (n) $('promptText').textContent = 'Talk to ' + n.name;
      // glide trail
      if (player.gliding && Math.random() < 0.6) particles.sparkle(player.pos.x + (Math.random() - 0.5), player.pos.y + 1.2, player.pos.z + (Math.random() - 0.5), 0, -0.3, 0, [0.5, 0.7, 1.6], 1.2);
    }
  }
  const focus = state === 'title' ? camera.position : player.pos;
  flora.update(focus.x, focus.z, HQ() ? 1100 : 650);
  tmesh.far = HQ() ? 1500 : 1050;
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
  particles.update(dt, state === 'title' ? camera.position : player.pos, env);
  puffDrift(dt);
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
  moonLight.position.copy(tmpV).addScaledVector(moonDir, 250);
  grade.uniforms.uLetter.value += ((document.body.classList.contains('photo') ? 1 : 0) - grade.uniforms.uLetter.value) * Math.min(1, dt * 4);

  if (isTouch && state !== 'loading' && state !== 'title') $('touch').hidden = state !== 'play' || !!talk;
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  if (whisperT > 0) { whisperT -= dt; if (whisperT <= 0) $('whisper').classList.remove('show'); }
  if (state !== 'loading') audio.update(dt, { windStrength: player && player.pos.y > 120 ? 0.9 : 0.35, night: 1, underwater: false, cave: false });
  composer.render(dt);
  if (!firstFrameAt) firstFrameAt = now;
}
requestAnimationFrame(frame);
load();

window.__moonveil = { get player() { return player; }, get state() { return state; }, npcs, world, terrain, begin, openTalk, nearestTalker, camera };
