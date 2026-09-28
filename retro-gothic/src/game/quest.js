import { FRESH_FEN, FRESH_PEAK, store } from '../store.js';
import { bridgeHeight, setActiveChapter } from '../world/layout.js';
import { sfx } from './audio.js';
import { live } from './live.js';

// The story, in five stages:
//   0  ARRIVED  Grubnik, keeper of the Grinning Tankard, needs help.
//   1  BELLS    Find Snaggle's five golden bells, lost on the causeway.
//               ('ready' when all five are found: take them back to Grubnik.)
//   2  TOAST    Carry the Toast of Courage up to the Vigil Stone and raise it.
//               ('spilled' if the foam went flat: fetch a fresh one.)
//   3  CASTLE   The Eye reels and the gate opens. Cross the bailey and the nave,
//               past the Eyeless Watchers, and ring the Great Bell.
//   4  ESCAPE   The Eye is sealed, and everything it held up starts to fall. Get
//               out of the castle and back down the causeway before it crumbles.
//   5  DONE     You made it. Fireworks over the tavern; wander as you please.
//
// All the way, the Eye's gaze sweeps the stones. Stand in it and dread builds;
// when it's full the Eye has seen you and you wake at the last light.
export const STAGE = { ARRIVED: 0, BELLS: 1, TOAST: 2, CASTLE: 3, ESCAPE: 4, DONE: 5 };

const Y_CASTLE = 13;
const onCauseway = (z) => (z < -96 ? Y_CASTLE : bridgeHeight(z));

export const BELLS = [
  { id: 'bell-1', x: 1.6, z: -18 },
  { id: 'bell-2', x: -1.8, z: -42 },
  { id: 'bell-3', x: 1.8, z: -63 },
  { id: 'bell-4', x: -1.8, z: -86 },
  { id: 'bell-5', x: 10, z: -106 },
].map((b) => ({ ...b, y: onCauseway(b.z) + 0.9 }));

export const VIGIL_STONE = { x: 0, z: -106, y: Y_CASTLE };
export const GREAT_BELL = { x: 0, z: -147, y: Y_CASTLE };
export const GRUBNIK_SPOT = { x: 37, z: 10 };
// Rattlecart and the goblin cart that runs to the next chapter, in the court.
export const CART_SPOT = { x: -6, z: 17.2 };

// Six black cats sleep in odd corners. Pet them all.
export const CATS = [
  { id: 'cat-1', x: -13.7, y: 1.55, z: 5, rotation: 1.2, where: 'on the court wall' },
  { id: 'cat-2', x: 36.5, y: 1.95, z: -4.1, rotation: -0.8, where: 'on the tavern barrels' },
  { id: 'cat-3', x: 30, y: 1.35, z: 25.6, rotation: 3.1, where: 'on the tavern fence' },
  { id: 'cat-4', x: -3.4, y: 3 + 1.55, z: -33, rotation: 1.4, where: 'on the causeway wall' },
  { id: 'cat-5', x: -14, y: Y_CASTLE, z: -112.2, rotation: 0.7, where: 'in the gate forecourt' },
  { id: 'cat-6', x: -8, y: Y_CASTLE + 0.3, z: -149, rotation: 0.4, where: 'by the Great Bell', from: STAGE.CASTLE },
];

// Five torn pages from the diary of Ser Oswin, first Captain of the Vigil.
export const PAGES = [
  { id: 'page-1', x: -6, y: 0, z: 12, rotation: 0.4 },
  { id: 'page-2', x: 39.6, y: 0, z: 21.2, rotation: -Math.PI / 2 },
  { id: 'page-3', x: 2.1, y: 3, z: -34.5, rotation: -0.6 },
  { id: 'page-4', x: 13.5, y: Y_CASTLE, z: -99.5, rotation: -1.2 },
  { id: 'page-5', x: -10, y: Y_CASTLE, z: -138.5, rotation: 1.4, from: STAGE.CASTLE },
];

// How forgiving the game is. Chosen when you begin a new journey.
// Chapter II and III use `drowned` (how fast the Drowned swim), `flood` (how fast
// the water rises), `cold` (how fast you lose warmth) and `monk` (how fast the
// stone monks move).
export const DIFFICULTY = {
  easy: { label: 'Pilgrim', dread: 0.6, watcherSpeed: 0.8, notice: 1.7, foam: 0.6, collapse: 0.8, head: 12, drowned: 0.8, flood: 0.8, cold: 0.65, monk: 0.75, boulder: 0.8 },
  normal: { label: 'Vigil', dread: 1, watcherSpeed: 1, notice: 1, foam: 1, collapse: 1, head: 9, drowned: 1, flood: 1, cold: 1, monk: 1, boulder: 1 },
};
export const difficulty = () => DIFFICULTY[store.get().difficulty] ?? DIFFICULTY.normal;

// The escape: the causeway crumbles from the castle end towards the court.
export const COLLAPSE_START_Z = -96;
export const COLLAPSE_SPEED = 6.6; // metres per second; you run at 7.5
export const DAIS_WAKE = { x: 0, z: -144.2, y: Y_CASTLE + 0.3 };

// Wall torches on the causeway. Most blew out; walk up to one to relight it.
// A lit torch is a safe light and your new waking place.
export const TORCHES = [
  { id: 'torch-1', side: -1, z: -12, startsLit: true },
  { id: 'torch-2', side: 1, z: -31 },
  { id: 'torch-3', side: -1, z: -54 },
  { id: 'torch-4', side: 1, z: -76 },
  { id: 'torch-5', side: -1, z: -93, startsLit: true },
  { id: 'torch-6', side: 1, z: -93, startsLit: true },
].map((t) => ({ ...t, x: t.side * 3.1, y: bridgeHeight(t.z) }));

export const isLit = (torch, lit) => torch.startsLit || lit.includes(torch.id);

// Candle stands inside the castle: safe light in the nave and the bailey.
export const CANDELABRA = [
  { x: -9, z: -121.5 },
  { x: 9, z: -121.5 },
  { x: -9.5, z: -134 },
  { x: 9.5, z: -134 },
  { x: -9.5, z: -143 },
  { x: 9.5, z: -143 },
];

// Places the gaze can't reach you: lit torches, braziers and candles. `wake` is
// where you come round after being seen, standing on walkable ground by the light.
export const SAFE_RADIUS = 3.3;
export function safeLights(lit, stage) {
  const lights = [
    { x: 0, z: -1, wake: { x: 0, z: 0, y: 0 } }, // the court braziers
    ...TORCHES.filter((t) => isLit(t, lit)).map((t) => ({ x: t.x, z: t.z, wake: { x: 0, z: t.z, y: t.y } })),
    { x: -6, z: -98.5, wake: { x: 0, z: -98.5, y: Y_CASTLE } },
    { x: 6, z: -98.5, wake: { x: 0, z: -98.5, y: Y_CASTLE } },
    { x: -4.5, z: -110, wake: { x: -2.5, z: -111.5, y: Y_CASTLE } },
    { x: 4.5, z: -110, wake: { x: 2.5, z: -111.5, y: Y_CASTLE } },
  ];
  if (stage >= STAGE.CASTLE) {
    for (const c of CANDELABRA) lights.push({ x: c.x, z: c.z, wake: { x: c.x * 0.8, z: c.z, y: Y_CASTLE } });
  }
  return lights;
}

// The Eye's searchlights. Each sweeps back and forth. More wake as the story goes
// on, and all of them speed up once you carry the Toast.
export const GAZE_RADIUS = 3.8;
const GAZES = [
  { axis: 'z', min: -48, max: -14, w: 0.34, phase: 0, x: 0, from: STAGE.ARRIVED },
  { axis: 'z', min: -92, max: -52, w: 0.29, phase: 2.1, x: 0, from: STAGE.ARRIVED },
  { axis: 'x', min: -12, max: 12, w: 0.45, phase: 1, z: -104, from: STAGE.TOAST },
  // Inside the castle the light falls through the broken roof.
  { axis: 'x', min: -8, max: 8, w: 0.5, phase: 0.4, z: -124, from: STAGE.CASTLE },
  { axis: 'x', min: -7, max: 7, w: 0.42, phase: 2.6, z: -138.5, from: STAGE.CASTLE },
];
export const GAZE_COUNT = GAZES.length;

// `lure`, when set, drags nearby searchlights towards a banger's bang.
export function gazePositions(time, stage, lure, now) {
  return GAZES.map((g) => {
    const active = stage >= g.from && stage < STAGE.ESCAPE;
    const s = (g.min + g.max) / 2 + ((g.max - g.min) / 2) * Math.sin(time * g.w + g.phase);
    let x = g.axis === 'x' ? s : g.x + Math.sin(time * 0.9 + g.phase) * 1.2;
    let z = g.axis === 'z' ? s : g.z + Math.sin(time * 0.7 + g.phase) * 2;
    if (lure && Math.hypot(lure.x - x, lure.z - z) < 28) {
      const age = now - lure.time;
      const pull = Math.min(1, age / 0.5) * Math.min(1, (lure.duration - age) / 0.6);
      if (pull > 0) {
        x += (lure.x - x) * pull;
        z += (lure.z - z) * pull;
      }
    }
    return { x, z, y: onCauseway(z), active };
  });
}

// ---- Chapters ----------------------------------------------------------------
// The Vigil's story lives in this file. Chapters II and III register their own
// quest objects (see chapters/*/quest.js), and everything the HUD asks about the
// story goes through the dispatchers below.
export const CHAPTER_TITLES = { 1: 'The Vigil', 2: 'The Drowned Fen', 3: 'The Frostspire' };
export const ROMAN = { 1: 'I', 2: 'II', 3: 'III' };
export const LAST_CHAPTER = 3;
const chapterQuests = {};
export const registerQuest = (n, quest) => {
  chapterQuests[n] = quest;
};
const questOf = (state) => (state.chapter > 1 ? chapterQuests[state.chapter] ?? null : null);
export const chapterQuest = (n) => chapterQuests[n] ?? null;

// Once the Eye is closed, the next chapter you haven't finished (where Rattlecart's
// cart goes from the court), or null when the whole journey is done. The fen is
// done at its stage 3, the mountain at its stage 4 (see chapters/*/quest.js).
export function unfinishedChapter(state) {
  if (state.stage < STAGE.DONE) return null;
  if (state.fen.stage < 3) return 2;
  if (state.peak.stage < 4) return 3;
  return null;
}
// The sun is back: every chapter finished.
export const morning = (state) => state.peak.stage >= 4;

// Whether goblin bangers are any use right now (they are no help on the mountain).
export const bangAvailable = (state) => {
  const quest = questOf(state);
  return quest ? Boolean(quest.bangs?.(state)) : state.stage >= STAGE.BELLS;
};

// The current chapter's stage number: what `verbs` on interactables are keyed by.
export const chapterStage = (state) => questOf(state)?.stage(state) ?? state.stage;

// Take the cart (or the pause menu) to another chapter you've unlocked.
export function travelTo(n) {
  const state = store.get();
  if (!CHAPTER_TITLES[n] || n > state.unlocked) return;
  const patch = { chapter: n, talking: null, target: null, ending: false, intro: false };
  const key = n === 2 ? 'fen' : n === 3 ? 'peak' : null;
  // First visit: start the chapter's clock and show its goal card.
  if (key && state[key].start === null) {
    patch[key] = { ...state[key], start: live.playTime };
    patch.intro = true;
  }
  // Leaving mid-escape puts you back at the Great Bell next time.
  if (state.stage === STAGE.ESCAPE) patch.stage = STAGE.CASTLE;
  live.escape = null;
  live.dread = 0;
  live.caughtBy = null;
  live.fade = 1;
  setActiveChapter(n);
  store.set(patch);
  chapterQuests[n]?.enter?.();
  saveGame();
}

// The rank for one chapter, and the unlocking of the next.
export function recordChapter(n, result, seconds, seen) {
  const state = store.get();
  store.set({
    records: { ...state.records, [n]: { time: Math.round(seconds), seen, score: result.score, rank: result.rank } },
    unlocked: Math.max(state.unlocked, Math.min(LAST_CHAPTER, n + 1)),
  });
}

export const rankFor = (score) => (score >= 125 ? 'S' : score >= 105 ? 'A' : score >= 85 ? 'B' : 'C');

const SAVE_KEY = 'vigil-and-tankard-save';
const SAVE_VERSION = 4;

export function loadGame() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVE_KEY));
    if (saved && Number.isInteger(saved.stage) && Array.isArray(saved.bells)) {
      // Older saves ended at stage 3 (version 1) or 4 (version 2); that's DONE now.
      // A save made mid-escape restarts the escape at the bell.
      const finished = (!saved.v && saved.stage === 3) || (saved.v === 2 && saved.stage === 4);
      const stage = finished ? STAGE.DONE : saved.stage === STAGE.ESCAPE ? STAGE.CASTLE : saved.stage;
      const known = (list, ids) => (Array.isArray(ids) ? ids.filter((id) => list.some((x) => x.id === id)) : []);
      store.set({
        stage,
        bells: known(BELLS, saved.bells),
        lit: known(TORCHES, saved.lit),
        cats: known(CATS, saved.cats),
        pages: known(PAGES, saved.pages),
        difficulty: saved.difficulty === 'easy' ? 'easy' : 'normal',
        seen: Number.isInteger(saved.seen) ? saved.seen : 0,
        bangers: Number.isInteger(saved.bangers) ? saved.bangers : stage >= STAGE.BELLS ? 3 : 0,
        intro: false,
      });
      live.playTime = Number.isFinite(saved.time) ? saved.time : 0;
      // Version 4 added chapters II and III.
      const unlocked = Math.min(LAST_CHAPTER, Math.max(1, Number.isInteger(saved.unlocked) ? saved.unlocked : stage >= STAGE.DONE ? 2 : 1));
      const chapter = Number.isInteger(saved.chapter) && saved.chapter >= 1 && saved.chapter <= unlocked ? saved.chapter : 1;
      const records = saved.records && typeof saved.records === 'object' ? { ...saved.records } : {};
      // Saves from before chapters finished the Vigil without recording it.
      if (stage >= STAGE.DONE && !records[1]) {
        const result = scoreRun(store.get(), live.playTime);
        records[1] = { time: Math.round(live.playTime), seen: store.get().seen, score: result.score, rank: result.rank };
      }
      const fen = chapterQuests[2]?.load?.(saved.fen) ?? FRESH_FEN;
      const peak = chapterQuests[3]?.load?.(saved.peak) ?? FRESH_PEAK;
      store.set({ unlocked, chapter, records, fen, peak });
      setActiveChapter(chapter);
      // Saved in a chapter that never started its clock: start it, with its goal card.
      const key = chapter === 2 ? 'fen' : chapter === 3 ? 'peak' : null;
      if (key && store.get()[key].start === null) store.set({ [key]: { ...store.get()[key], start: live.playTime }, intro: true });
      chapterQuests[chapter]?.enter?.();
    }
  } catch {
    // No save, or storage is blocked: start fresh.
  }
}

export function saveGame() {
  try {
    const { stage, bells, lit, seen, cats, pages, bangers, difficulty: level, chapter, unlocked, fen, peak, records } = store.get();
    const data = {
      v: SAVE_VERSION,
      stage,
      bells,
      lit,
      seen,
      cats,
      pages,
      bangers,
      difficulty: level,
      time: Math.round(live.playTime),
      chapter,
      unlocked,
      fen,
      peak,
      records,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Progress just won't survive a reload.
  }
}

export const hasProgress = () => store.get().stage > 0 || store.get().bells.length > 0 || store.get().unlocked > 1;

export function newGame() {
  store.set({
    stage: STAGE.ARRIVED,
    bells: [],
    lit: [],
    cats: [],
    pages: [],
    seen: 0,
    bangers: 0,
    spilled: false,
    ending: false,
    intro: true,
    chapter: 1,
    unlocked: 1,
    fen: FRESH_FEN,
    peak: FRESH_PEAK,
    records: {},
    talking: null,
    target: null,
  });
  setActiveChapter(1);
  live.escape = null;
  live.playTime = 0;
  live.foam = 1;
  live.dread = 0;
  saveGame();
}

let noticeId = 0;
export function notify(text) {
  store.set({ notice: { text, id: ++noticeId } });
}

export function collectBell(id) {
  const { bells, stage } = store.get();
  if (bells.includes(id)) return;
  const found = [...bells, id];
  store.set({ bells: found });
  saveGame();
  sfx.chime();
  if (found.length < BELLS.length) notify(`Golden bell ${found.length} of ${BELLS.length}`);
  else notify(stage >= STAGE.BELLS ? 'All five bells! Take them to Grubnik' : 'Five golden bells... someone must have lost these');
}

export function lightTorch(id) {
  const { lit } = store.get();
  if (lit.includes(id)) return;
  store.set({ lit: [...lit, id] });
  saveGame();
  sfx.whoosh();
  notify('Torch relit: a safe light');
}

// Called by the player when the gaze or a Watcher gets you; they then wake you by `wake`.
export function caught(by) {
  const quest = questOf(store.get());
  if (quest) {
    sfx.rumble();
    live.shake = 1;
    quest.caught(by);
    saveGame();
    return;
  }
  const { seen, stage, spilled } = store.get();
  store.set({ seen: seen + 1 });
  sfx.rumble();
  live.shake = 1;
  const who = by === 'watcher' ? 'A Watcher caught you!' : 'The Eye saw you!';
  if (stage === STAGE.TOAST && !spilled) {
    live.foam = Math.max(0, live.foam - 0.5);
    if (live.foam <= 0) spillToast();
    else notify(`${who} Half the foam curdled`);
  } else {
    notify(`${who} You wake by the last light`);
  }
  saveGame();
}

export function spillToast() {
  store.set({ spilled: true });
  sfx.spill();
  notify('The Toast went flat! Fetch a fresh one from Grubnik');
}

export function spendBanger() {
  const { bangers } = store.get();
  if (bangers <= 0) {
    const quest = questOf(store.get());
    notify(quest ? quest.outOfBangers() : store.get().stage >= STAGE.BELLS ? 'Out of bangers: Grubnik has more' : 'You have no bangers yet');
    return false;
  }
  store.set({ bangers: bangers - 1 });
  saveGame();
  return true;
}

const stageKey = ({ stage, bells, spilled }) => {
  if (stage === STAGE.BELLS && bells.length === BELLS.length) return 'ready';
  if (stage === STAGE.TOAST && spilled) return 'spilled';
  return stage;
};

// What a character says right now. Lines can mention {bells} and {cats} (and each
// chapter's own counts).
export function linesFor(interact) {
  const state = store.get();
  const quest = questOf(state);
  const key = quest ? quest.key(state) : stageKey(state);
  // Home again after the sunrise, the Vigil's folk have new things to say.
  const homecoming = !quest && morning(state) && interact.morning;
  const lines = homecoming || ((typeof interact.stages === 'function' ? interact.stages(state) : interact.stages?.[key]) ?? interact.lines);
  const filled = lines.map((l) => l.replaceAll('{bells}', String(state.bells.length)).replaceAll('{cats}', String(state.cats.length)));
  return quest?.fill ? filled.map((l) => quest.fill(l, state)) : filled;
}

// A conversation ends (you closed it, or walked away): the story moves on only
// now, once you've heard what they had to say.
export function endConversation() {
  const talking = store.get().talking;
  if (!talking) return;
  live.talkClosedAt = performance.now();
  store.set({ talking: null });
  advanceQuest(talking.id);
}

// Talking to the right person moves the story on. Safe to call more than once.
export function advanceQuest(id) {
  if (!id) return;
  const state = store.get();
  // Rattlecart's cart runs between the chapters.
  if (id === 'rattlecart') {
    const to = state.chapter === 1 ? unfinishedChapter(state) : chapterQuests[state.chapter]?.cartTo?.(state);
    if (to && to <= state.unlocked) {
      sfx.whoosh();
      setTimeout(() => travelTo(to), 400);
    }
    return;
  }
  const quest = questOf(state);
  if (quest) {
    if (quest.advance(id, state)) saveGame();
    return;
  }
  const key = stageKey(state);
  if (id.startsWith('page-')) {
    if (state.pages.includes(id)) return;
    const pages = [...state.pages, id];
    store.set({ pages });
    sfx.page();
    notify(pages.length === PAGES.length ? 'All five pages of the diary found!' : `Diary page ${pages.length} of ${PAGES.length}`);
  } else if (id.startsWith('cat-')) {
    if (state.cats.includes(id)) {
      sfx.meow();
      return;
    }
    const cats = [...state.cats, id];
    store.set({ cats });
    sfx.meow();
    notify(cats.length === CATS.length ? 'All six cats petted! Truly a hero.' : `Cat petted: ${cats.length} of ${CATS.length}`);
  } else if (id === 'grubnik' && key === STAGE.ARRIVED) {
    store.set({ stage: STAGE.BELLS, bangers: 3 });
    notify('Got 3 bangers! Throw one with ' + (live.touch ? 'BANG' : 'F'));
  } else if (id === 'grubnik' && key === 'ready') {
    store.set({ stage: STAGE.TOAST, spilled: false, bangers: Math.max(3, state.bangers) });
    live.foam = 1;
    sfx.fanfare();
    notify('You carry the Toast of Courage. Don\'t run!');
  } else if (id === 'grubnik' && key === 'spilled') {
    store.set({ spilled: false, bangers: Math.max(3, state.bangers) });
    live.foam = 1;
    sfx.chime();
    notify('A fresh Toast. Walk, don\'t run!');
  } else if (id === 'grubnik' && state.stage >= STAGE.BELLS && state.bangers < 3) {
    store.set({ bangers: 3 });
    notify('Bangers refilled: 3');
  } else if (id === 'vigil-stone' && key === STAGE.TOAST) {
    store.set({ stage: STAGE.CASTLE });
    sfx.fanfare();
    live.shake = 0.6;
    setTimeout(() => {
      sfx.rumble();
      notify('The Eye reels! The castle gate is opening');
    }, 2500);
    setTimeout(() => notify('Inside walk the Eyeless Watchers. Stay out of their lantern-light!'), 7000);
  } else if (id === 'great-bell' && key === STAGE.CASTLE) {
    store.set({ stage: STAGE.ESCAPE });
    live.escapeStart = live.gameTime;
    sfx.greatBell();
    live.shake = 1;
    startEscape();
    setTimeout(() => notify('The castle is coming down! RUN for the causeway!'), 3500);
  } else {
    return;
  }
  saveGame();
}

// The Eye is sealed; the causeway will start to fall `head` seconds from now.
export function startEscape() {
  live.escape = { ringAt: live.gameTime, fallAt: live.gameTime + difficulty().head };
  live.debris = [];
}

// Fell with the causeway, or got trapped in the castle: back to the bell.
export function failEscape(why) {
  store.set({ seen: store.get().seen + 1 });
  sfx.rumble();
  notify(why);
  startEscape();
  saveGame();
}

export function finishEscape() {
  store.set({ stage: STAGE.DONE });
  live.escape = null;
  live.escapeTime = live.gameTime - (live.escapeStart ?? live.gameTime);
  const state = store.get();
  recordChapter(1, scoreRun(state, live.playTime), live.playTime, state.seen);
  sfx.fanfare();
  notify('You made it! Listen to them cheer!');
  saveGame();
  setTimeout(() => store.set({ ending: true }), 3500);
}

export function objective(state) {
  const quest = questOf(state);
  if (quest) return quest.objective(state);
  const { stage, bells } = state;
  const key = stageKey(state);
  if (stage === STAGE.ARRIVED) return 'Talk to Grubnik, the goblin at the tavern bar';
  if (key === STAGE.BELLS) return `Find the golden bells on the causeway: ${bells.length} / ${BELLS.length}`;
  if (key === 'ready') return 'Take the bells back to Grubnik at the tavern';
  if (key === 'spilled') return 'The Toast went flat! Get a fresh one from Grubnik';
  if (stage === STAGE.TOAST) return 'Carry the Toast to the Vigil Stone at the castle gate';
  if (stage === STAGE.CASTLE) return 'Enter the castle and ring the Great Bell';
  if (stage === STAGE.ESCAPE) return 'ESCAPE! Run back down the causeway to the court';
  if (morning(state)) return 'The sun is up! Party with the goblins at the Grinning Tankard';
  const next = unfinishedChapter(state);
  if (next === 2 && state.unlocked >= 2) return 'Chapter II awaits: ride Rattlecart\'s cart to the Drowned Fen';
  if (next === 3 && state.unlocked >= 3) return 'Chapter III awaits: ride Rattlecart\'s cart to the Frostspire';
  return 'The Eye is closed. Celebrate at the Grinning Tankard!';
}

// One line on exactly how to do the current objective. `button` is 'E' or 'TALK'.
export function objectiveHint(state, button) {
  const quest = questOf(state);
  if (quest) return quest.hint(state, button);
  const key = stageKey(state);
  if (key === STAGE.ARRIVED) return `Follow the gold arrow east to the tavern. Grubnik has the big ! over his head: walk up to him and press ${button}.`;
  if (key === STAGE.BELLS) return 'Walk into a bell to pick it up. Hide in torchlight when a blue searchlight comes close.';
  if (key === 'ready') return `Go back to Grubnik (the ! at the tavern bar) and press ${button}.`;
  if (key === 'spilled') return `Go back to Grubnik (the ! at the tavern bar) and press ${button} for a fresh one.`;
  if (key === STAGE.TOAST) return `WALK, don't run. At the castle gate, go up to the stone with the ! and press ${button}.`;
  if (key === STAGE.CASTLE) return `Go through the open gate. Keep out of the Watchers' blue cones. At the bell with the !, press ${button}.`;
  if (key === STAGE.ESCAPE) return 'Turn around and sprint back the way you came, all the way to the court!';
  if (morning(state)) return 'Everyone has something to say about the sunrise: talk to them all. Pause to visit any chapter again.';
  if (state.unlocked >= 2) return `The goblin cart waits in the court, by the ! . Walk up to Rattlecart and press ${button}. (Or pause and pick a chapter.)`;
  return 'Talk to everyone at the tavern. Pause to see what you missed.';
}

// Every step of the story for the journal on the pause screen.
export function questSteps(state) {
  const quest = questOf(state);
  if (quest) return quest.steps(state);
  const { stage, bells } = state;
  const at = (s) => (stage > s ? 'done' : stage === s ? 'now' : 'later');
  const bellsDone = stage > STAGE.BELLS || bells.length === BELLS.length;
  return [
    { text: 'Talk to Grubnik at the Grinning Tankard', state: at(STAGE.ARRIVED) },
    { text: `Find Snaggle's golden bells on the causeway (${Math.min(bells.length, BELLS.length)}/${BELLS.length})`, state: bellsDone ? 'done' : at(STAGE.BELLS) },
    { text: 'Bring the bells back to Grubnik', state: stage > STAGE.BELLS ? 'done' : bellsDone ? 'now' : 'later' },
    { text: 'Carry the Toast to the Vigil Stone at the gate', state: at(STAGE.TOAST) },
    { text: 'Ring the Great Bell inside the castle', state: at(STAGE.CASTLE) },
    { text: 'Escape down the causeway before it falls', state: at(STAGE.ESCAPE) },
  ];
}

// Where the big floating ! goes: over whoever or whatever you need next.
export function questMarker(state, x, z) {
  const quest = questOf(state);
  if (quest) return quest.marker(state, x, z);
  const key = stageKey(state);
  // In front of the bar: the inn's overhanging upper floor would hide it right above Grubnik.
  if (key === STAGE.ARRIVED || key === 'ready' || key === 'spilled') return { x: 37.8, y: 3.9, z: 10 };
  if (key === STAGE.BELLS) {
    const bell = objectiveTarget(state, x, z);
    return bell && { x: bell.x, y: BELLS.find((b) => b.x === bell.x && b.z === bell.z).y + 1.6, z: bell.z };
  }
  if (key === STAGE.TOAST) return { x: VIGIL_STONE.x, y: VIGIL_STONE.y + 3, z: VIGIL_STONE.z };
  if (key === STAGE.CASTLE) return { x: GREAT_BELL.x, y: GREAT_BELL.y + 8.6, z: GREAT_BELL.z };
  if (key === STAGE.DONE && unfinishedChapter(state) && state.unlocked >= 2) return { x: CART_SPOT.x, y: 3.6, z: CART_SPOT.z };
  return null;
}

// Where the objective arrow points from (x, z), or null.
export function objectiveTarget(state, x, z) {
  const quest = questOf(state);
  if (quest) return quest.target(state, x, z);
  const key = stageKey(state);
  if (key === STAGE.ARRIVED || key === 'ready' || key === 'spilled') return GRUBNIK_SPOT;
  if (key === STAGE.BELLS) {
    let best = null;
    for (const b of BELLS) {
      if (state.bells.includes(b.id)) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (!best || d < best.d) best = { x: b.x, z: b.z, d };
    }
    return best;
  }
  if (key === STAGE.TOAST) return VIGIL_STONE;
  if (key === STAGE.CASTLE) return GREAT_BELL;
  if (key === STAGE.ESCAPE) return { x: 0, z: 2 };
  if (key === STAGE.DONE && unfinishedChapter(state) && state.unlocked >= 2) return CART_SPOT;
  return null;
}

// The rank on the ending card.
export function scoreRun({ seen, cats, lit, pages, difficulty: level }, seconds) {
  const relit = lit.length;
  const minutes = seconds / 60;
  const easy = level === 'easy' ? 15 : 0;
  const score = Math.round(100 - seen * 6 + cats.length * 5 + pages.length * 4 + relit * 3 - Math.max(0, minutes - 15) * 2 - easy);
  const rank = rankFor(score);
  const title = { S: 'Legend of the Tankard', A: 'Hero of the Causeway', B: 'Stout-Hearted Pilgrim', C: 'Lucky Wanderer' }[rank];
  return { score, rank, title };
}
