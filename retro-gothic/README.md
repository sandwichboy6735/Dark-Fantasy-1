# The Vigil & the Tankard

A short first-person adventure rendered like a 1990s console game, built with React Three Fiber.

Start in a torchlit court. North, a cobbled causeway climbs over the abyss to a gothic castle, under a sky of swirling clouds and one enormous blue eye. East, goblins in blue-and-black jester hats are celebrating outside the Grinning Tankard. Look at anyone to hear what they have to say.

## The story

Your goal: close the giant Eye that has watched this land for a hundred years. The quest banner and the gold arrow at the top of the screen always show what to do next and how far away it is.

1. **Find the keeper.** Grubnik Tapfoot runs the Grinning Tankard, east of the court. Snaggle ran up the causeway on a dare, the Eye looked at him, and he came back without the five golden bells from his jester hat.
2. **Find the five bells.** They're scattered up the causeway to the castle gate, marked by shafts of gold light. Walk into a bell to pick it up.
3. **Carry the Toast.** Take the bells back to Grubnik. He pours the Toast of Courage, and you carry it in your hand.
4. **Raise it to the Eye.** Take it to the Vigil Stone in the gate forecourt and talk to the stone. The Eye reels, half-blind, and the castle gate opens.
5. **Ring the Great Bell.** Cross the bailey and the candlelit nave inside the keep, past the Eyeless Watchers, and ring the bell on the dais. The Eye closes for good.
6. **Escape.** Everything the Eye held up starts to fall. Get out of the castle before the causeway begins to crumble (a countdown shows how long you have), then run the length of it as it falls into the abyss behind you. Red rings mark where masonry is about to land; a block on the head knocks you down for a second. Fall, or get trapped in the castle, and you're back at the bell to try again. Reach the court and the goblins set off fireworks, the stars come back, and the Vigil comes down to the tavern to celebrate.

Choose **Pilgrim** (easier: dread builds slower, Watchers are slower to notice and chase, the causeway falls slower) or **Vigil** (the intended challenge) when you begin.

**The Eye's gaze.** Blue searchlights sweep the causeway. Standing in one fills your DREAD meter; when it's full, the Eye has seen you and you wake by the last light you sheltered in. Torchlight hides you. Most of the causeway torches have blown out: walk up to one to relight it, and it becomes a safe spot and your new waking place. Wait in the light while a searchlight passes, then move.

**The Eyeless Watchers.** Tall hooded figures with a single blue eye, patrolling the upper causeway (once you carry the Toast), the bailey and the nave. Their blue lantern-light shows on the ground as a cone. Stay in it for half a second and they come for you, a red "!" over their heads; they walk slower than you, so keep moving and head for torchlight or candlelight, which they won't enter. If one reaches you, you wake by the last light.

**Bangers.** Grubnik gives you three goblin firecrackers and tops you back up to three whenever you talk to him. Throw one with `F` (or the BANG button): when it goes off, nearby searchlights swing over to the noise and Watchers go to look, a yellow "?" over their heads.

**Sneaking.** Hold `C` (or toggle SNEAK) to crouch: you move slowly and silently, a Watcher's sight cone shrinks to about half, and they take twice as long to notice you.

**Cats.** Six black cats are curled up in odd corners: on walls, barrels and fences, and one by the Great Bell. Walk up and pet them. The ones on the causeway and in the castle are gone once it falls, so find them first.

**Diary pages.** Five torn pages from the diary of Ser Oswin, first Captain of the Vigil, sit on lecterns around the world. Together they tell how the king got his Eye, why the torches burn orange, and what happens when the Great Bell rings.

**Map.** Pause (`Esc`, or the II button) for a map of where you are, your goal, the bells still out there, which torches are lit, and the cats and pages you've found.

**The Toast.** While you carry it, running sloshes out the foam (the FOAM meter), and being seen curdles half of it. If it goes flat, fetch a fresh one from Grubnik. Once you carry it, the Eye gets angry: its searchlights sweep faster and a third one watches the gate.

The ending ranks your run from S to C, from your time, how often you were caught (or fell), the torches you relit, the cats you petted and the pages you read; Pilgrim runs score a little lower. Everyone's lines change as the story moves on, so talk to people again. Progress saves in the browser by itself; the title screen offers **Begin anew**.

## Run it

Needs Node 20.19+ or 22.12+.

```sh
cd retro-gothic
npm install
npm run dev
```

Then open http://localhost:5173 and click to begin. Other commands:

```sh
npm run build         # production build in dist/
npm run preview       # serve that build
npm run build:pages   # build into ../docs/vigil/ for GitHub Pages
```

The build uses relative paths, so `dist/` (or `docs/vigil/`) can be served from any folder.

Start somewhere else with `?spawn=bridge`, `gate`, `bailey`, `nave`, `dais`, `tavern`, `yard` or `bar` (the castle ones only work once the gate is open in your save). In development builds, `window.__game` exposes the live game state. Add `&look=yaw,pitch` (in degrees) to set the starting view.

## Controls

| Key | Action |
|---|---|
| `W A S D` / arrows | Walk |
| `Shift` | Run |
| Mouse | Look (click the page to lock the pointer) |
| `E` / left click | Talk: finish the line, then show the next one |
| `F` or `Q` | Throw a banger |
| `C` or `Ctrl` (hold) | Sneak |
| `M` | Mute |
| `Esc` | Pause and map |

If the browser won't lock the pointer (in some embedded frames, for example), the game falls back to dragging with the mouse to look.

On a phone or tablet, put your left thumb anywhere on the left of the screen for a movement stick (push it all the way to run), drag anywhere else to look, tap **TALK** when someone is under the crosshair, **BANG** to throw a banger and **SNEAK** to crouch (tap again to stand). **II** pauses and shows the map.

## How the retro look is made

All of it is tuned in `src/retro/config.js`.

- **Low resolution** (`src/retro/RetroPipeline.jsx`): R3F's own render loop is replaced by an `EffectComposer`. `RenderPixelatedPass` draws the scene at 240 lines (320x240 at 4:3; the width follows the window's aspect ratio) into nearest-filtered targets, then blows the image up to the window with no smoothing. Native antialiasing is off (`gl={{ antialias: false }}`) and the canvas uses `image-rendering: pixelated`.
- **Vertex jitter** (`src/retro/vertexJitter.js`): an `onBeforeCompile` patch on every material. After `project_vertex`, each vertex's view-space position is rounded to a grid whose cell is one low-res pixel at that vertex's distance from the camera, so geometry snaps and wobbles like on hardware with no sub-pixel precision. The pass's own normal material is patched too, so the outlines move with the wobble.
- **Dithering and colour depth** (`src/retro/DitherShader.js`): the last pass converts to sRGB, adds an 8x8 Bayer threshold on the low-res grid, and cuts each channel down to 5/6/5 bits: strict 16-bit RGB565. Set `colorBits` to `[5, 5, 5]` for the PlayStation's 15-bit mode, or `[8, 8, 8]` for 24/32-bit colour.
- **Textures** (`src/retro/textures.js`): tiny hand-painted canvases with nearest filtering and no mipmaps.

## Files

| File | What it does |
|---|---|
| `src/App.jsx` | Canvas, fog, keyboard map, and the whole scene |
| `src/game/quest.js` | The story's stages, bells, torches, searchlight paths, saving, and who says what when |
| `src/game/live.js` | Per-frame values the HUD reads: dread, foam, the objective arrow |
| `src/world/Gaze.jsx` | The Eye's searchlights: beam, pool of light and a real blue light |
| `src/world/Watchers.jsx` | The Eyeless Watchers: patrol, sight cone, chase, investigate |
| `src/world/Bangers.jsx` | Throwing a banger, its fuse and bang |
| `src/world/Cats.jsx`, `Pages.jsx` | The hidden cats and the diary pages on their lecterns |
| `src/world/Debris.jsx`, `Fireworks.jsx`, `Embers.jsx` | Falling masonry in the escape; the goblins' fireworks; drifting ash and embers |
| `src/ui/MapView.jsx` | The pause-screen map |
| `src/game/audio.js` | Synthesised sound: the drone, the tavern reel, blips, chimes, the fanfare |
| `src/world/Quest.jsx` | The golden bells, the Vigil Stone, and the Toast in your hand |
| `src/retro/*` | The pipeline above, plus the cached material and geometry helpers |
| `src/world/layout.js` | Map, walkable ground and step heights, colliders, area names, spawn points |
| `src/world/Sky.jsx` | Swirling cloud dome and the eye (both pure shaders) |
| `src/world/Bridge.jsx` | The causeway, and how it falls apart during the escape |
| `src/world/Castle.jsx`, `Terrain.jsx` | The castle (gatehouse, bailey, nave, Great Bell) and its crag; the court |
| `src/world/Guards.jsx` | Knights and hooded figures patrolling the steps |
| `src/world/Tavern.jsx`, `Goblin.jsx` | Tavern yard, props and the goblins with their poses |
| `src/world/Lights.jsx` | Steady orange torches and braziers; flickering yellow lanterns and candles |
| `src/world/npcs.js` | Who is where, and what they say |
| `src/player/Player.jsx` | Pointer-lock look, WASD movement, collisions, the crosshair ray, bell pickups |
| `src/player/input.js` | Stick and drag-look input shared with the touch controls |
| `src/ui/Overlay.jsx` | Crosshair, objective, dialogue box, notices, title and ending screens |
| `src/ui/TouchControls.jsx` | On-screen stick, look drag and TALK button |
