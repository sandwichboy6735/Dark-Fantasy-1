# The Vigil & the Tankard

A short first-person adventure rendered like a 1990s console game, built with React Three Fiber.

Start in a torchlit court. North, a cobbled causeway climbs over the abyss to a gothic castle, under a sky of swirling clouds and one enormous blue eye. East, goblins in blue-and-black jester hats are celebrating outside the Grinning Tankard. Look at anyone to hear what they have to say.

## The story

1. **Find the keeper.** Grubnik Tapfoot runs the Grinning Tankard, east of the court. Snaggle ran up the causeway on a dare, the Eye looked at him, and he came back without the five golden bells from his jester hat.
2. **Find the five bells.** They're scattered up the causeway to the castle gate. Look for thin shafts of gold light, and walk into a bell to pick it up.
3. **Carry the Toast.** Take the bells back to Grubnik. He pours the Toast of Courage, and you carry it in your hand.
4. **Raise it to the Eye.** Take it to the Vigil Stone in the gate forecourt and talk to the stone.

Everyone's lines change as the story moves on, so talk to people again. The objective is shown at the top right. Progress saves in the browser by itself; the title screen offers **Begin anew**.

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

Start somewhere else with `?spawn=bridge`, `?spawn=gate`, `?spawn=tavern`, `?spawn=yard` or `?spawn=bar`. Add `&look=yaw,pitch` (in degrees) to set the starting view.

## Controls

| Key | Action |
|---|---|
| `W A S D` / arrows | Walk |
| `Shift` | Run |
| Mouse | Look (click the page to lock the pointer) |
| `E` / left click | Talk: finish the line, then show the next one |
| `M` | Mute |
| `Esc` | Pause |

If the browser won't lock the pointer (in some embedded frames, for example), the game falls back to dragging with the mouse to look.

On a phone or tablet, put your left thumb anywhere on the left of the screen for a movement stick (push it all the way to run), drag anywhere else to look, and tap **TALK** when someone is under the crosshair.

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
| `src/game/quest.js` | The story's stages, bells, saving, and who says what when |
| `src/game/audio.js` | Synthesised sound: the drone, the tavern reel, blips, chimes, the fanfare |
| `src/world/Quest.jsx` | The golden bells, the Vigil Stone, and the Toast in your hand |
| `src/retro/*` | The pipeline above, plus the cached material and geometry helpers |
| `src/world/layout.js` | Map, walkable ground and step heights, colliders, area names, spawn points |
| `src/world/Sky.jsx` | Swirling cloud dome and the eye (both pure shaders) |
| `src/world/Bridge.jsx`, `Castle.jsx`, `Terrain.jsx` | The causeway, the castle and its crag, the court |
| `src/world/Guards.jsx` | Knights and hooded figures patrolling the steps |
| `src/world/Tavern.jsx`, `Goblin.jsx` | Tavern yard, props and the goblins with their poses |
| `src/world/Lights.jsx` | Steady orange torches and braziers; flickering yellow lanterns and candles |
| `src/world/npcs.js` | Who is where, and what they say |
| `src/player/Player.jsx` | Pointer-lock look, WASD movement, collisions, the crosshair ray, bell pickups |
| `src/player/input.js` | Stick and drag-look input shared with the touch controls |
| `src/ui/Overlay.jsx` | Crosshair, objective, dialogue box, notices, title and ending screens |
| `src/ui/TouchControls.jsx` | On-screen stick, look drag and TALK button |
