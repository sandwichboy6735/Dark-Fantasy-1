// Ashenveil — game bootstrap, loop, input, HUD and persistence.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { B, BLOCKS, CATALOG, RECIPES, SOLID } from './blocks.js';
import { buildAtlas, makeIcons, tileUV, TILE_AVG } from './textures.js';
import { World, SKY } from './world.js';
import { BIOME, BIOME_NAMES, BIOME_SUBTITLES, SEA } from './worldgen.js';
import { makeMaterials, makeSky, palette, timeName, GradeShader } from './render.js';
import { Ambient } from './ambient.js';
import { Player } from './player.js';
import { Audio } from './audio.js';
import { VERSES, WHISPERS } from './lore.js';
import { hashString, hash3 } from './noise.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'ashenveil-save-v1';
const SETTINGS_KEY = 'ashenveil-settings-v1';
const DAY_LENGTH = 720; // seconds per full day
const REACH = 6;

const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

// ---------- Renderer ----------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.08, 1200);
camera.rotation.order = 'YXZ';
scene.add(camera);

const atlasCanvas = buildAtlas();
const atlasTex = new THREE.CanvasTexture(atlasCanvas);
atlasTex.magFilter = THREE.NearestFilter; atlasTex.minFilter = THREE.NearestFilter;
atlasTex.generateMipmaps = false; atlasTex.flipY = false; atlasTex.colorSpace = THREE.SRGBColorSpace;
const ICONS = makeIcons(atlasCanvas);
const materials = makeMaterials(atlasTex);
const U = materials.uniforms;
U.uPlayer = { value: new THREE.Vector3() };
// Personal hearthlight: a faint warm glow around the wanderer
for (const m of [materials.opaque, materials.translucent]) {
  m.fragmentShader = m.fragmentShader
    .replace('uniform float uFogDensity', 'uniform vec3 uPlayer;\n    uniform float uFogDensity')
    .replace('vec3 col = albedo * light * vLight.w;', 'float pd = length(vWorld - uPlayer); light += vec3(0.32, 0.2, 0.12) * pow(max(0.0, 1.0 - pd / 7.0), 2.0);\n      vec3 col = albedo * light * vLight.w;');
  m.needsUpdate = true;
}
const sky = makeSky();
scene.add(sky.mesh);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.55, 0.82);
composer.addPass(bloom);
const grade = new ShaderPass(GradeShader);
composer.addPass(grade);
composer.addPass(new OutputPass());

// Selection outline
const outline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
  new THREE.LineBasicMaterial({ color: new THREE.Color(0.9, 0.85, 0.8), transparent: true, opacity: 0.45 }),
);
outline.visible = false;
scene.add(outline);

// Held block
const heldMat = new THREE.MeshBasicMaterial({ map: atlasTex, alphaTest: 0.5, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
const held = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), heldMat);
held.renderOrder = 10;
held.visible = false;
camera.add(held);
let heldId = -1, swing = 0;
function setHeld(id) {
  if (id === heldId) return;
  heldId = id;
  held.visible = !!id;
  if (!id) return;
  const b = BLOCKS[id];
  held.geometry.dispose();
  if (b.cross) {
    const g = new THREE.PlaneGeometry(1, 1);
    const uv = tileUV(b.tex.side), a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) ? uv[2] : uv[0], a.getY(i) ? uv[1] : uv[3]);
    held.geometry = g;
  } else {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const a = g.attributes.uv;
    const faces = ['side', 'side', 'top', 'bottom', 'side', 'side'];
    for (let f = 0; f < 6; f++) {
      const uv = tileUV(b.tex[faces[f]]);
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[3] - a.getY(i) * (uv[3] - uv[1]));
      }
    }
    held.geometry = g;
  }
}

// ---------- State ----------
const player = new Player();
const audio = new Audio();
let world = null, ambient = null;
let state = 'title';
let mode = 'wanderer';
let dayTime = 0.7, dayCount = 1;
let seedText = '';
let inventory = new Map();
let hotbar = new Array(9).fill(0);
let selected = 0;
let versesFound = new Set();
let photoMode = false;
const isTouch = matchMedia('(pointer: coarse)').matches && (navigator.maxTouchPoints || 0) > 0;
const settings = Object.assign({ dist: isTouch ? 4 : 6, fov: 75, sens: 1, vol: 70, bloom: true, grain: true }, store.get(SETTINGS_KEY) || {});

const ARCHITECT_BAR = [B.GOTHIC_BRICK, B.MOSSY_BRICK, B.STAINED_GLASS, B.SOUL_LANTERN, B.CANDLES, B.DEADWOOD, B.BLOODLEAF, B.OBSIDIAN, B.VELVET];
const STARTER_KIT = [[B.CANDLES, 6], [B.SOUL_LANTERN, 2], [B.PLANKS, 16]];

function seedFrom(text) {
  const t = (text || '').trim();
  if (!t) return (Math.random() * 2 ** 31) | 0;
  return /^-?\d+$/.test(t) ? (parseInt(t, 10) >>> 0) : hashString(t);
}

function createWorld(seed) {
  if (world) world.dispose();
  world = new World(seed, scene, materials);
  world.renderDist = settings.dist;
  if (!ambient) ambient = new Ambient(scene, world);
  else { ambient.world = world; ambient.initialized = false; }
  ambient.onWhisper = () => { audio.whisper(); showWhisper(WHISPERS[(Math.random() * WHISPERS.length) | 0]); };
  const sp = world.gen.findSpawn();
  world.spawn = sp;
  return world;
}

// Title-screen world: continue the saved realm if there is one
const save = store.get(SAVE_KEY);
let titleIsSaved = !!save;
createWorld(save ? save.seed : seedFrom(''));
world.renderDist = Math.min(settings.dist, 5);
if (save) { $('continueBtn').hidden = false; $('startBtn').textContent = 'Enter a new realm'; }

// ---------- Resize ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h;
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  if (ambient) ambient.setScale(h * renderer.getPixelRatio(), settings.fov);
  held.position.set(camera.aspect < 1 ? 0.42 : 0.62, -0.55, -1.0);
}
window.addEventListener('resize', resize);
resize();

// ---------- Inventory helpers ----------
function countOf(id) { return mode === 'architect' ? Infinity : (inventory.get(id) || 0); }
function addItem(id, n = 1) {
  if (mode === 'architect' || !id) return;
  inventory.set(id, (inventory.get(id) || 0) + n);
  if (!hotbar.includes(id)) { const e = hotbar.indexOf(0); if (e >= 0) hotbar[e] = id; }
  renderHotbar();
}
function takeItem(id, n = 1) {
  if (mode === 'architect') return true;
  const c = inventory.get(id) || 0;
  if (c < n) return false;
  if (c - n <= 0) { inventory.delete(id); const s = hotbar.indexOf(id); if (s >= 0) hotbar[s] = 0; }
  else inventory.set(id, c - n);
  renderHotbar();
  return true;
}

// ---------- HUD ----------
let itemNameTimer = 0;
function renderHotbar() {
  const bar = $('hotbar');
  bar.innerHTML = '';
  hotbar.forEach((id, i) => {
    const b = document.createElement('button');
    b.className = 'slot' + (i === selected ? ' on' : '');
    b.setAttribute('aria-label', id ? BLOCKS[id].name : 'Empty slot');
    b.innerHTML = `<span class="key">${i + 1}</span>` + (id ? `<img src="${ICONS[id]}" alt="">` : '') + (id && mode === 'wanderer' ? `<span class="count">${countOf(id)}</span>` : '');
    b.addEventListener('click', (e) => { e.stopPropagation(); select(i); });
    bar.appendChild(b);
  });
  setHeld(hotbar[selected]);
}
function select(i) {
  selected = (i + 9) % 9;
  renderHotbar();
  const id = hotbar[selected];
  const el = $('itemName');
  el.textContent = id ? BLOCKS[id].name : '';
  el.classList.toggle('show', !!id);
  itemNameTimer = 2;
}

let areaTimer = 0, whisperTimer = 0;
function showArea(name, sub) {
  $('areaName').textContent = name; $('areaSub').textContent = sub;
  $('area').classList.add('show');
  areaTimer = 5;
}
function showWhisper(text) {
  $('whisper').textContent = text;
  $('whisper').classList.add('show');
  whisperTimer = 6;
}

const STRUCT_NAMES = {
  chapel: ['The Roofless Chapel', 'Its god left. Its candles did not.'],
  shrine: ['A Wayside Shrine', 'Someone still lights these. Nobody has seen who.'],
  graveyard: ['The Quiet Acre', 'Every stone has a name worn smooth by rain'],
  obelisk: ['Moon Obelisk', 'It points at her. It is waiting.'],
  ribcage: ['Remains of the Colossus', 'It lay down to sleep a thousand years ago'],
};
let lastBiome = -1, biomeStable = 0, pendingBiome = -1, lastStruct = '';
function checkArea() {
  const px = Math.floor(player.pos.x), pz = Math.floor(player.pos.z);
  const R = 80;
  const rx = Math.floor(px / R), rz = Math.floor(pz / R);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const s = world.gen.structureIn(rx + dx, rz + dz);
    if (!s) continue;
    const key = `${s.x},${s.z}`;
    if (Math.hypot(s.x - px, s.z - pz) < 14 && key !== lastStruct) {
      lastStruct = key;
      const [n, sub] = STRUCT_NAMES[s.type];
      showArea(n, sub);
      audio.bell();
      return;
    }
  }
  const b = world.gen.biomeAt(px, pz);
  if (b !== pendingBiome) { pendingBiome = b; biomeStable = 0; }
  else if (++biomeStable === 3 && b !== lastBiome) {
    lastBiome = b;
    showArea(BIOME_NAMES[b], BIOME_SUBTITLES[b]);
  }
}

// ---------- Inventory panel ----------
function openInventory() {
  if (state !== 'playing') return;
  state = 'inventory';
  releaseLook();
  $('inventory').hidden = false;
  renderInventory();
}
function closePanels() {
  $('inventory').hidden = true; $('lore').hidden = true; $('pause').hidden = true;
  state = 'playing';
  captureLook();
}
function renderInventory() {
  const arch = mode === 'architect';
  $('invTitle').textContent = arch ? 'The Architect’s Codex' : 'Satchel';
  $('invHelp').textContent = arch ? 'Every block of the realm, without limit. Pick one for the selected hotbar slot.' : 'Pick a block to put it in the selected hotbar slot. Craft with what you carry.';
  $('gridLabel').textContent = arch ? 'All blocks' : 'Carried';
  $('craftSection').hidden = arch;
  document.querySelector('.inv-body').classList.toggle('crafting', !arch);
  const grid = $('invGrid');
  grid.innerHTML = '';
  const ids = arch ? CATALOG : [...inventory.keys()].sort((a, b) => a - b);
  if (!ids.length) grid.innerHTML = '<p class="empty-note">Your satchel is empty. Break blocks in the world to gather them.</p>';
  for (const id of ids) {
    const c = document.createElement('button');
    c.className = 'cell';
    c.setAttribute('aria-label', BLOCKS[id].name);
    c.innerHTML = `<img src="${ICONS[id]}" alt="">` + (arch ? '' : `<span class="count">${inventory.get(id)}</span>`);
    c.addEventListener('click', () => { const old = hotbar.indexOf(id); if (old >= 0) hotbar[old] = hotbar[selected]; hotbar[selected] = id; select(selected); renderInventory(); });
    c.addEventListener('pointerenter', () => tooltip(id));
    c.addEventListener('focus', () => tooltip(id));
    grid.appendChild(c);
  }
  if (!arch) {
    const list = $('recipes');
    list.innerHTML = '';
    for (const r of RECIPES) {
      const can = r.in.every(([id, n]) => (inventory.get(id) || 0) >= n);
      const btn = document.createElement('button');
      btn.className = 'recipe'; btn.disabled = !can;
      btn.innerHTML = `<span class="ing">${r.in.map(([id, n]) => `<span class="n">${n}</span><img src="${ICONS[id]}" alt="${BLOCKS[id].name}">`).join('')}</span><span class="arrow">→</span><span class="ing"><span class="n">${r.out[1]}</span><img src="${ICONS[r.out[0]]}" alt=""></span><span class="out-name">${BLOCKS[r.out[0]].name}</span>`;
      btn.addEventListener('click', () => {
        if (!r.in.every(([id, n]) => (inventory.get(id) || 0) >= n)) return;
        for (const [id, n] of r.in) takeItem(id, n);
        addItem(r.out[0], r.out[1]);
        audio.chime();
        renderInventory();
      });
      btn.addEventListener('pointerenter', () => tooltip(r.out[0]));
      list.appendChild(btn);
    }
  }
}
function tooltip(id) { $('ttName').textContent = BLOCKS[id].name; $('ttDesc').textContent = BLOCKS[id].desc || ''; }

function openLore(x, y, z) {
  const i = Math.floor(hash3(x, y, z, world.seed) * VERSES.length);
  versesFound.add(i);
  const [t, text] = VERSES[i];
  $('loreTitle').textContent = t;
  $('loreText').textContent = text;
  document.querySelector('#lore .eyebrow').textContent = `Carved in the rune stone · verse ${versesFound.size} of ${VERSES.length} found`;
  state = 'lore';
  releaseLook();
  $('lore').hidden = false;
  audio.whisper();
}

// ---------- Save / load ----------
function saveGame() {
  if (!world || state === 'title' || state === 'loading') return false;
  const ok = store.set(SAVE_KEY, {
    v: 1, seed: world.seed, seedText, mode, dayTime, dayCount,
    pos: [player.pos.x, player.pos.y, player.pos.z], yaw: player.yaw, pitch: player.pitch, flying: player.flying,
    inventory: [...inventory], hotbar, verses: [...versesFound], edits: world.serializeEdits(),
  });
  return ok;
}
setInterval(() => { if (state === 'playing') saveGame(); }, 30000);
window.addEventListener('beforeunload', () => saveGame());
window.addEventListener('pagehide', () => saveGame());

function beginGame(fromSave) {
  audio.start(); audio.setVolume(settings.vol / 100);
  const s = fromSave ? store.get(SAVE_KEY) : null;
  if (s) {
    if (s.seed !== world.seed) createWorld(s.seed);
    world.loadEdits(s.edits || {});
    // Reapply edits to any chunk the title screen already built
    for (const c of [...world.chunks.values()]) world.unload(c);
    mode = s.mode; dayTime = s.dayTime; dayCount = s.dayCount || 1; seedText = s.seedText || '';
    inventory = new Map(s.inventory || []); hotbar = s.hotbar || new Array(9).fill(0);
    versesFound = new Set(s.verses || []);
    player.pos.set(s.pos[0], s.pos[1], s.pos[2]); player.yaw = s.yaw; player.pitch = s.pitch;
    player.flying = !!s.flying && s.mode === 'architect';
  } else {
    const text = $('seedInput').value.trim();
    seedText = text;
    const seed = text ? seedFrom(text) : (titleIsSaved ? seedFrom('') : world.seed);
    if (seed !== world.seed || world.edits.size) createWorld(seed);
    world.edits.clear();
    mode = document.querySelector('.mode.on').dataset.mode;
    dayTime = 0.7; dayCount = 1; versesFound = new Set();
    inventory = new Map(); hotbar = new Array(9).fill(0);
    if (mode === 'architect') hotbar = [...ARCHITECT_BAR];
    else for (const [id, n] of STARTER_KIT) addItem(id, n);
    const sp = world.spawn;
    player.pos.set(sp.x, sp.y + 1, sp.z); player.yaw = Math.PI * 0.25; player.pitch = -0.05; player.flying = false;
    store.set(SAVE_KEY, null);
  }
  player.canFly = mode === 'architect';
  player.autoJump = isTouch;
  player.vel.set(0, 0, 0);
  world.renderDist = settings.dist;
  $('tFly').hidden = mode !== 'architect';
  $('modeTag').textContent = mode === 'architect' ? 'Architect' : 'Wanderer';
  lastBiome = -1; lastStruct = '';
  state = 'loading';
  $('loading').hidden = false;
  document.querySelectorAll('#title button').forEach((b) => { b.disabled = true; });
  renderHotbar();
}

function finishLoading() {
  // Make sure we are not stuck inside terrain
  let guard = 0;
  while (player.collides(world, player.pos.x, player.pos.y, player.pos.z) && guard++ < 80) player.pos.y += 1;
  state = 'playing';
  $('title').hidden = true; $('loading').hidden = true;
  $('hud').hidden = false; $('hud').classList.add('fresh');
  setTimeout(() => $('hud').classList.remove('fresh'), 20000);
  $('touch').hidden = !isTouch;
  document.querySelectorAll('#title button').forEach((b) => { b.disabled = false; });
  showArea('Ashenveil', 'Wander. Gather. Build. There is no ending here, only further.');
  lastBiome = world.gen.biomeAt(Math.floor(player.pos.x), Math.floor(player.pos.z));
  setTimeout(() => { if (areaTimer <= 0) showArea(BIOME_NAMES[lastBiome], BIOME_SUBTITLES[lastBiome]); }, 6500);
  captureLook();
  saveGame();
}

function quitToTitle() {
  saveGame();
  releaseLook();
  state = 'title';
  $('pause').hidden = true; $('hud').hidden = true; $('touch').hidden = true;
  $('title').hidden = false; $('continueBtn').hidden = false; titleIsSaved = true;
  world.renderDist = Math.min(settings.dist, 5);
  document.body.classList.remove('photo'); photoMode = false;
}

// ---------- Title screen wiring ----------
document.querySelectorAll('.mode').forEach((m) => m.addEventListener('click', () => {
  document.querySelectorAll('.mode').forEach((o) => { o.classList.toggle('on', o === m); o.setAttribute('aria-checked', String(o === m)); });
}));
$('startBtn').addEventListener('click', () => beginGame(false));
$('continueBtn').addEventListener('click', () => beginGame(true));

// ---------- Pause / settings ----------
function openPause() {
  if (state !== 'playing') return;
  state = 'paused';
  $('pause').hidden = false;
  $('savedNote').textContent = '';
  saveGame();
}
$('resume').addEventListener('click', closePanels);
$('invClose').addEventListener('click', closePanels);
$('loreClose').addEventListener('click', closePanels);
$('saveBtn').addEventListener('click', () => { $('savedNote').textContent = saveGame() ? 'Your realm is saved in this browser.' : 'This browser would not let the realm be saved.'; });
$('quitBtn').addEventListener('click', quitToTitle);
function bindRange(id, key, fmt, apply) {
  const el = $(id), out = $(id + 'V');
  el.value = settings[key]; out.textContent = fmt(settings[key]);
  el.addEventListener('input', () => { settings[key] = parseFloat(el.value); out.textContent = fmt(settings[key]); apply(); store.set(SETTINGS_KEY, settings); });
}
bindRange('optDist', 'dist', (v) => v, () => { if (state !== 'title') world.renderDist = settings.dist; });
bindRange('optFov', 'fov', (v) => v, resize);
bindRange('optSens', 'sens', (v) => Number(v).toFixed(1), () => {});
bindRange('optVol', 'vol', (v) => v, () => audio.setVolume(settings.vol / 100));
$('optBloom').checked = settings.bloom; $('optGrain').checked = settings.grain;
$('optBloom').addEventListener('change', (e) => { settings.bloom = e.target.checked; store.set(SETTINGS_KEY, settings); });
$('optGrain').addEventListener('change', (e) => { settings.grain = e.target.checked; store.set(SETTINGS_KEY, settings); });

// ---------- Look control (pointer lock, with drag fallback) ----------
let locked = false, lockFailed = false, lockEverWorked = false;
function lockDenied() { if (!lockEverWorked) lockFailed = true; }
function captureLook() {
  if (isTouch || lockFailed) return;
  try {
    const p = canvas.requestPointerLock && canvas.requestPointerLock();
    if (p && p.catch) p.catch(lockDenied);
  } catch { lockDenied(); }
}
function releaseLook() { if (document.pointerLockElement) { try { document.exitPointerLock(); } catch { /* ignore */ } } }
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) lockEverWorked = true;
  if (!locked && state === 'playing') openPause();
});
document.addEventListener('pointerlockerror', lockDenied);

function look(dx, dy) {
  const s = 0.0022 * settings.sens;
  player.yaw -= dx * s;
  player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch - dy * s));
}

const mouse = { left: false, right: false, downAt: 0, moved: 0, dragging: false };
canvas.addEventListener('mousedown', (e) => {
  if (state !== 'playing') return;
  if (!locked && !lockFailed && !isTouch) { captureLook(); return; }
  if (e.button === 0) { mouse.left = true; mouse.downAt = performance.now(); mouse.moved = 0; breakRepeat = 0; }
  if (e.button === 2) { mouse.right = true; placeRepeat = 0; }
  if (e.button === 1) { e.preventDefault(); pickBlock(); }
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.left = false;
  if (e.button === 2) mouse.right = false;
});
window.addEventListener('mousemove', (e) => {
  if (state !== 'playing') return;
  if (locked) look(e.movementX, e.movementY);
  else if (lockFailed && (mouse.left || mouse.right)) { look(e.movementX, e.movementY); mouse.moved += Math.abs(e.movementX) + Math.abs(e.movementY); }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('wheel', (e) => { if (state === 'playing') select(selected + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });

// ---------- Keyboard ----------
const keys = new Set();
let lastSpace = 0;
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;
  const k = e.code;
  if (state === 'inventory' && (k === 'KeyE' || k === 'Escape')) { closePanels(); return; }
  if (state === 'lore' && (k === 'KeyE' || k === 'Escape' || k === 'Space')) { closePanels(); return; }
  if (state === 'paused' && k === 'Escape' && lockFailed) { closePanels(); return; }
  if (state !== 'playing') return;
  keys.add(k);
  if (k === 'Space') {
    const now = performance.now();
    if (now - lastSpace < 280 && player.canFly) player.toggleFly();
    lastSpace = now;
    e.preventDefault();
  }
  if (k === 'KeyF') player.toggleFly();
  if (k === 'KeyE') openInventory();
  if (k === 'Escape' && lockFailed) openPause();
  if (k === 'KeyP') { photoMode = !photoMode; document.body.classList.toggle('photo', photoMode); }
  if (k === 'KeyT' && mode === 'architect') dayTime = (dayTime + 0.125) % 1;
  if (k.startsWith('Digit')) { const n = parseInt(k.slice(5), 10); if (n >= 1 && n <= 9) select(n - 1); }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouse.left = mouse.right = false; });

// ---------- Touch ----------
const touch = { stickId: null, sx: 0, sy: 0, lookId: null, lx: 0, ly: 0, lookStart: 0, lookMoved: 0, jump: false, breaking: false };
if (isTouch) {
  document.body.classList.add('touch');
  const stick = $('stick'), knob = $('stickKnob');
  stick.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; touch.stickId = t.identifier; const r = stick.getBoundingClientRect(); touch.sx = r.left + r.width / 2; touch.sy = r.top + r.height / 2; e.preventDefault(); }, { passive: false });
  const moveStick = (t) => {
    let dx = t.clientX - touch.sx, dy = t.clientY - touch.sy;
    const d = Math.hypot(dx, dy), max = 50;
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    player.move.f = -dy / max; player.move.r = dx / max;
    player.move.sprint = d > max * 0.95;
  };
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touch.stickId) moveStick(t);
      else if (t.identifier === touch.lookId) {
        const dx = t.clientX - touch.lx, dy = t.clientY - touch.ly;
        touch.lx = t.clientX; touch.ly = t.clientY; touch.lookMoved += Math.abs(dx) + Math.abs(dy);
        if (state === 'playing') look(dx * 1.8, dy * 1.8);
      }
    }
  }, { passive: true });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touch.stickId) { touch.stickId = null; knob.style.transform = ''; player.move.f = player.move.r = 0; player.move.sprint = false; }
      if (t.identifier === touch.lookId) {
        touch.lookId = null;
        if (touch.lookMoved < 10 && performance.now() - touch.lookStart < 300 && state === 'playing') tapAction();
      }
    }
  };
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    if (touch.lookId === null) { touch.lookId = t.identifier; touch.lx = t.clientX; touch.ly = t.clientY; touch.lookStart = performance.now(); touch.lookMoved = 0; }
    e.preventDefault();
  }, { passive: false });
  const hold = (id, on, off) => {
    const el = $(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); on(); el.classList.add('on'); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); off(); el.classList.remove('on'); }, { passive: false });
  };
  hold('tJump', () => { touch.jump = true; }, () => { touch.jump = false; });
  hold('tBreak', () => { touch.breaking = true; breakRepeat = 0; }, () => { touch.breaking = false; });
  hold('tPlace', () => { placeBlock(); }, () => {});
  hold('tFly', () => { player.toggleFly(); }, () => {});
  hold('tInv', () => { openInventory(); }, () => {});
  hold('tMenu', () => { openPause(); }, () => {});
}
function tapAction() {
  const hit = raycast();
  if (hit && hit.id === B.RUNE_STONE) { openLore(hit.x, hit.y, hit.z); return; }
  if (mode === 'architect' && hit) breakBlock(hit);
}

// ---------- Block interaction ----------
const _eye = new THREE.Vector3(), _dir = new THREE.Vector3();
function raycast() {
  player.eye(_eye);
  _dir.set(0, 0, -1).applyEuler(camera.rotation);
  return world.raycast(_eye, _dir, REACH);
}
let breakTarget = null, breakProgress = 0, breakRepeat = 0, placeRepeat = 0, hitSoundT = 0;

function breakBlock(hit) {
  const b = BLOCKS[hit.id];
  if (!b.breakable && mode !== 'architect') return;
  if (hit.id === B.ABYSSAL && hit.y <= 1) return;
  const light = world.sampleLight(hit.x + hit.nx + 0.5, hit.y + hit.ny + 0.5, hit.z + hit.nz + 0.5);
  const lv = Math.min(1.2, 0.08 + light[0] * palette(dayTime).sky[0] * 1.2 + light[1] + light[2] + b.emissive);
  ambient.burst(hit.x, hit.y, hit.z, TILE_AVG[b.tex.side], lv);
  // Water seeps into the hole below sea level
  let fill = B.AIR;
  if (hit.y <= SEA) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) if (world.getBlock(hit.x + dx, hit.y + dy, hit.z + dz) === B.WATER) fill = B.WATER;
  world.setBlock(hit.x, hit.y, hit.z, fill);
  audio.breakSound(hit.id);
  addItem(b.drop);
  // Plants and candles resting on top fall with it
  const above = world.getBlock(hit.x, hit.y + 1, hit.z);
  if (above && BLOCKS[above].cross && above !== B.CHAINS) { world.setBlock(hit.x, hit.y + 1, hit.z, B.AIR); addItem(BLOCKS[above].drop); }
  swing = 1;
}

function placeBlock() {
  const hit = raycast();
  if (!hit) return;
  if (hit.id === B.RUNE_STONE && !keys.has('ShiftLeft') && !keys.has('ShiftRight')) { openLore(hit.x, hit.y, hit.z); return; }
  const id = hotbar[selected];
  if (!id || countOf(id) <= 0) return;
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  const cur = world.getBlock(x, y, z);
  if (cur !== B.AIR && cur !== B.WATER && !(BLOCKS[cur].cross && cur !== id)) return;
  if (SOLID[id] && player.intersectsBlock(x, y, z)) return;
  if (!takeItem(id)) return;
  if (cur && BLOCKS[cur].cross) addItem(BLOCKS[cur].drop);
  world.setBlock(x, y, z, id);
  audio.placeSound(id);
  swing = 1;
}

function pickBlock() {
  const hit = raycast();
  if (!hit) return;
  if (mode === 'architect') { hotbar[selected] = hit.id; select(selected); }
  else { const s = hotbar.indexOf(hit.id); if (s >= 0) select(s); }
}

function updateInteraction(dt) {
  const hit = raycast();
  outline.visible = !!hit && !photoMode;
  if (hit) outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  const breaking = (mouse.left && (!lockFailed || mouse.moved < 6)) || touch.breaking;
  let ring = 0;
  if (breaking && hit) {
    if (mode === 'architect') {
      breakRepeat -= dt;
      if (breakRepeat <= 0) { breakBlock(hit); breakRepeat = 0.22; }
    } else {
      const key = `${hit.x},${hit.y},${hit.z}`;
      if (breakTarget !== key) { breakTarget = key; breakProgress = 0; }
      const hard = BLOCKS[hit.id].hardness;
      if (!BLOCKS[hit.id].breakable || (hit.id === B.ABYSSAL)) { breakProgress = 0; }
      else {
        breakProgress += dt / Math.max(0.05, hard * 0.8);
        hitSoundT -= dt;
        if (hitSoundT <= 0) { audio.hit(hit.id); hitSoundT = 0.25; swing = 0.6; }
        if (breakProgress >= 1) { breakBlock(hit); breakProgress = 0; breakTarget = null; }
      }
      ring = breakProgress;
    }
  } else { breakProgress = 0; breakTarget = null; }
  $('breakRing').style.strokeDasharray = `${ring * 100} 100`;
  if (mouse.right) {
    placeRepeat -= dt;
    if (placeRepeat <= 0) { placeBlock(); placeRepeat = 0.25; }
  }
}

// ---------- Environment ----------
const env = { night: 0, dayLight: 1, wind: 0.4, windStrength: 0.4, ashDensity: 0.5, emberDensity: 0.2, wisps: 0.3, fireflies: 0, spirits: 0, underwater: false, cave: false };
const tmpC = new THREE.Color();
let biomeHere = BIOME.FOREST, biomeT = 0;
let whisperClock = 90;

function updateEnvironment(dt, focus) {
  const pal = palette(dayTime);
  env.night = pal.night; env.dayLight = 1 - pal.night;
  const ang = (dayTime - 0.25) * Math.PI * 2;
  const sun = sky.uniforms.uSunDir.value.set(Math.cos(ang), Math.sin(ang), 0.35).normalize();
  sky.uniforms.uMoonDir.value.set(-sun.x, -sun.y, -0.25).normalize();
  sky.uniforms.uZenith.value.setRGB(...pal.zen);
  sky.uniforms.uHorizon.value.setRGB(...pal.hor);
  sky.uniforms.uNight.value = pal.night;

  biomeT -= dt;
  if (biomeT <= 0) { biomeT = 0.5; biomeHere = world.gen.biomeAt(Math.floor(focus.x), Math.floor(focus.z)); }
  const skyAtEye = world.getLight(SKY, Math.floor(focus.x), Math.floor(focus.y), Math.floor(focus.z));
  env.cave = skyAtEye < 5 && focus.y < world.gen.height(Math.floor(focus.x), Math.floor(focus.z)) - 2;
  env.underwater = state !== 'title' && player.headInWater;
  const ashen = biomeHere === BIOME.ASHEN;
  const target = {
    ash: env.cave ? 0 : ashen ? 1 : biomeHere === BIOME.SPIRES ? 0.6 : 0.35,
    ember: env.cave ? 0.1 : ashen ? 1 : 0.12,
    wisps: (env.cave ? 0.6 : pal.night * 0.9 + 0.08) * (biomeHere === BIOME.GLADE || biomeHere === BIOME.MARSH ? 1.3 : 0.8),
    flies: env.cave ? 0 : biomeHere === BIOME.MARSH ? pal.night + 0.2 : biomeHere === BIOME.FOREST ? pal.night * 0.5 : 0.05,
  };
  const k = 1 - Math.exp(-dt * 0.8);
  env.ashDensity += (target.ash - env.ashDensity) * k;
  env.emberDensity += (target.ember - env.emberDensity) * k;
  env.wisps += (target.wisps - env.wisps) * k;
  env.fireflies += (target.flies - env.fireflies) * k;
  env.spirits = env.cave ? 0 : pal.night > 0.5 ? 4 : (biomeHere === BIOME.MARSH || biomeHere === BIOME.GLADE ? 2 : 1);
  env.wind = Math.sin(performance.now() / 9000) * 0.8 + (ashen ? 0.8 : 0.3);
  env.windStrength = env.cave ? 0.05 : Math.min(1, Math.abs(env.wind) * 0.6 + (focus.y > 60 ? 0.4 : 0));

  // Lighting uniforms
  U.uSkyLight.value.setRGB(...pal.sky);
  U.uAmbient.value.setRGB(...pal.amb);
  U.uSoulPulse.value = 0.9 + 0.1 * Math.sin(performance.now() / 700);
  const R = world.renderDist * 16;
  let dens = 1.9 / R * (1 + pal.night * 0.25);
  const fog = tmpC.setRGB(...pal.hor);
  if (env.cave) { fog.setRGB(0.01, 0.008, 0.015); dens = Math.max(dens, 0.03); }
  if (env.underwater) { fog.setRGB(0.012, 0.035, 0.045); dens = 0.09; }
  if (ashen && !env.cave && !env.underwater) { fog.lerp(tmpC.clone().setRGB(0.22, 0.2, 0.19).multiplyScalar(0.25 + env.dayLight * 0.9), 0.5); dens *= 1.35; }
  U.uFogColor.value.lerp(fog, 1 - Math.exp(-dt * 3));
  U.uFogDensity.value += (dens - U.uFogDensity.value) * (1 - Math.exp(-dt * 3));
  sky.uniforms.uUnder.value = env.underwater ? 1 : 0;
  grade.uniforms.uUnder.value = env.underwater ? 1 : 0;
  grade.uniforms.uVignette.value = settings.grain ? 1 : 0;
  grade.uniforms.uGrain.value = settings.grain ? 1 : 0;
  grade.uniforms.uLetterbox.value += ((photoMode ? 1 : 0) - grade.uniforms.uLetterbox.value) * Math.min(1, dt * 4);
  bloom.enabled = settings.bloom;
  bloom.strength = 0.65 + pal.night * 0.35;
  renderer.setClearColor(fog);
}

// ---------- Main loop ----------
let last = performance.now();
let titleAngle = 0;
let areaCheckT = 0;
let loadStart = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  U.uTime.value = t; sky.uniforms.uTime.value = t; grade.uniforms.uTime.value = t;

  let focus;
  if (state === 'title' || state === 'loading') {
    const sp = world.spawn;
    titleAngle += dt * 0.03;
    const r = 34;
    if (state === 'title') {
      camera.position.set(sp.x + Math.cos(titleAngle) * r, sp.y + 22, sp.z + Math.sin(titleAngle) * r);
      camera.lookAt(sp.x, sp.y + 6, sp.z);
      dayTime = (0.74 + Math.sin(t * 0.02) * 0.02);
    }
    focus = camera.position;
    const target = state === 'loading' ? player.pos : sp;
    world.update(target.x, target.z, state === 'loading' ? 30 : 10);
    if (state === 'loading') {
      if (!loadStart) loadStart = now;
      const p = world.progress(player.pos.x, player.pos.z);
      $('loadPct').textContent = Math.round(p * 100) + '%';
      if (p >= 1) { loadStart = 0; finishLoading(); }
    }
  } else {
    if (state === 'playing') {
      const m = player.move;
      if (!isTouch) {
        m.f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
        m.r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
        const shift = keys.has('ShiftLeft') || keys.has('ShiftRight');
        const ctrl = keys.has('ControlLeft') || keys.has('ControlRight');
        m.up = keys.has('Space');
        m.down = player.flying && shift;
        m.sprint = player.flying ? ctrl : (shift || ctrl);
      } else {
        m.up = touch.jump;
        m.down = false;
      }
      if (world.isReady(Math.floor(player.pos.x), Math.floor(player.pos.z))) player.update(dt, world);
      if (player.pos.y < -20) player.pos.y = world.surfaceY(Math.floor(player.pos.x), Math.floor(player.pos.z)) + 2;
      updateInteraction(dt);
      areaCheckT -= dt;
      if (areaCheckT <= 0) { areaCheckT = 0.5; checkArea(); }
      dayTime += dt / DAY_LENGTH;
      if (dayTime >= 1) { dayTime -= 1; dayCount++; }
      whisperClock -= dt * (env.night > 0.5 ? 1 : 0.3);
      if (whisperClock <= 0) { whisperClock = 150 + Math.random() * 150; showWhisper(WHISPERS[(Math.random() * WHISPERS.length) | 0]); audio.whisper(); }
    }
    player.eye(camera.position);
    camera.rotation.set(player.pitch, player.yaw, 0);
    focus = camera.position;
    world.update(player.pos.x, player.pos.z, 5);
    U.uPlayer.value.copy(camera.position);
    // Held item bob, swing and lighting
    swing = Math.max(0, swing - dt * 4);
    const bob = player.onGround ? Math.sin(player.walkPhase) : 0;
    held.rotation.set(-0.15 - Math.sin(swing * Math.PI) * 0.9, 0.75, 0.05);
    held.position.y = -0.55 + Math.abs(bob) * 0.03 - Math.sin(swing * Math.PI) * 0.15;
    held.scale.setScalar(0.42);
    const L = world.sampleLight(camera.position.x, camera.position.y, camera.position.z);
    const pal = palette(dayTime);
    const e = heldId ? BLOCKS[heldId].emissive : 0;
    held.material.color.setRGB(
      Math.min(1.6, 0.12 + L[0] * pal.sky[0] + L[1] * 1.0 + L[2] * 0.35 + e * 0.9),
      Math.min(1.6, 0.1 + L[0] * pal.sky[1] + L[1] * 0.52 + L[2] * 0.62 + e * 0.9),
      Math.min(1.6, 0.1 + L[0] * pal.sky[2] + L[1] * 0.2 + L[2] * 1.0 + e * 0.9));
    held.visible = !!heldId && !photoMode && state !== 'title';
  }
  sky.mesh.position.copy(camera.position);
  updateEnvironment(dt, focus);
  ambient.update(dt, camera.position, env);
  audio.update(dt, env);

  // HUD timers
  if (state === 'playing' || state === 'paused') {
    $('clockName').textContent = timeName(dayTime);
    $('clockSub').textContent = (env.night > 0.5 ? 'Night ' : 'Day ') + dayCount + (seedText ? ` · ${seedText}` : '');
  }
  $('clickPrompt').hidden = !(state === 'playing' && !locked && !lockFailed && !isTouch);
  if (areaTimer > 0) { areaTimer -= dt; if (areaTimer <= 0) $('area').classList.remove('show'); }
  if (whisperTimer > 0) { whisperTimer -= dt; if (whisperTimer <= 0) $('whisper').classList.remove('show'); }
  if (itemNameTimer > 0) { itemNameTimer -= dt; if (itemNameTimer <= 0) $('itemName').classList.remove('show'); }

  composer.render(dt);
}
ambient.setScale(window.innerHeight * renderer.getPixelRatio(), settings.fov);
requestAnimationFrame(frame);

// Debug/automation hook
window.__ashenveil = { get world() { return world; }, player, get state() { return state; }, setTime: (t) => { dayTime = t; }, raycast, breakBlock, placeBlock, openInventory, openLore, openPause, closePanels, get inventory() { return inventory; }, select };
