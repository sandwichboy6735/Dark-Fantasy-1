# Ashenveil

A dark fantasy voxel sandbox that runs in your browser. Wander an endless realm under a blood moon, gather what the dead left behind, and build whatever you like. There are no monsters, no fighting and no ending.

## Play

Open **`docs/index.html`** in a browser (double-click works; it is a single self-contained file).
To host it on GitHub Pages, set Pages to serve the `docs/` folder of this branch.

On the title screen, choose how you want to play:

| Mode | What it is |
|---|---|
| **Wanderer** | Break blocks by hand to gather them, then craft lanterns, stained glass, gothic brick and more in your satchel. |
| **Architect** | Every block with no limit, instant breaking, and flight. |

Type a **world seed** to share a realm with a friend, or leave it blank for a random one. Your realm autosaves in the browser every 30 seconds. Use **Continue your realm** to return.

### Controls

| Action | Keyboard / mouse | Touch |
|---|---|---|
| Look | Mouse (click the game to capture it) | Drag on the screen |
| Move | `W A S D` / arrows | Left joystick |
| Jump / swim up | `Space` | ⤒ |
| Sprint | `Shift` or `Ctrl` | Push the joystick all the way |
| Break block | Hold left click | Hold ⛏ (Architect: tap the screen) |
| Place block | Right click | ▣ |
| Read a rune stone | Right click it | Tap it |
| Pick the block you're looking at | Middle click | |
| Hotbar | `1`–`9`, mouse wheel | Tap a slot |
| Satchel / crafting | `E` | ☰ |
| Fly (Architect) | `F` or double-tap `Space`; `Shift` goes down | ✧ |
| Skip ahead in time (Architect) | `T` | |
| Photo mode (hide HUD, cinematic bars) | `P` | |
| Menu / settings | `Esc` | ❚❚ |

## The realm

- **Five regions:** the Blighted Wood with its crimson trees, the ember-lit Ashen Wastes, the Hollow Marsh, the black-glass Obsidian Spires, and the silver Moonlit Glade. Each has its own name card when you enter it.
- **Ruins to find:** roofless chapels with stained glass and velvet aisles, wayside shrines, graveyards, moon obelisks, and the bones of a sleeping colossus.
- **24 verses** carved into rune stones. Right-click one to read it. The game counts how many you've found.
- **Three kinds of light:** sky, warm firelight (candles, ember stone, bloodroot), and cold soul-light (soul crystals, lanterns, wraithleaf). They spread block by block and mix.
- **Day and night:** a 12-minute cycle from Bleak Dawn through Bloodfall Dusk to the Witching Hour. At night a crimson veil crosses the sky.
- **Atmosphere:** falling ash, rising embers, soul wisps, fireflies, circling ravens, and the Hollow. The Hollow are silent cloaked spirits carrying lanterns. They watch you from a distance and vanish if you walk up to them. They never harm you.
- **Sound:** everything is synthesized live, including the drone, wind, the night choir, distant bells, raven calls and whispers.
- **Caves:** winding tunnels and caverns with soul crystal and ember stone veins, glowing ghostcaps and cobwebs.

## Development

The source lives in `src/`. The build bundles it with three.js into single HTML files.

```sh
npm install
npm run build      # writes docs/index.html and dist/ashenveil.html
npm run dev        # rebuild on every change in src/
```

| File | Purpose |
|---|---|
| `src/main.js` | Game loop, input, HUD, inventory, crafting, saving |
| `src/world.js` | Chunks, light propagation, meshing with smooth lighting + AO, raycasting |
| `src/worldgen.js` | Terrain, biomes, caves, trees and ruins |
| `src/blocks.js` | Block definitions and crafting recipes |
| `src/textures.js` | Procedurally painted 16×16 textures and inventory icons |
| `src/render.js` | Block shaders, sky, day/night palette, cinematic grading |
| `src/ambient.js` | Particles, ravens and the Hollow |
| `src/player.js` | Movement, swimming, flight, collision |
| `src/audio.js` | Procedural soundscape |
| `src/lore.js` | Rune stone verses and whispers |
