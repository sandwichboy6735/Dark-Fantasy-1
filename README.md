# DF1

A moonlit dark fantasy game you play in your browser. You explore Moonveil, a huge floating continent above a sea of glowing clouds, with castles drifting around it. Walk, glide, and meet the people who live there. Nothing will hurt you, there is no fighting, and there is no ending.

## Play

Open **`docs/index.html`** in a browser. It is one self-contained file, so double-clicking it works.
To put it online with GitHub Pages, set Pages to serve the `docs/` folder of this branch.

Your progress saves in the browser by itself. Tap to continue where you left off, or choose **Begin a new journey**.

### Controls

| | Keyboard and mouse | Touch |
|---|---|---|
| Walk | `W A S D` or arrow keys | Left joystick |
| Run | `Shift` | Push the joystick all the way |
| Look around | Mouse (click the game first); scroll to zoom | Drag anywhere else on the screen |
| Jump | `Space` | Jump |
| Glide | Hold `Space` while falling | Hold Jump while falling |
| Talk or use something | `E` next to someone or something | Talk / Use (appears when you're close) |
| Answer a question | `1` or `2` (or click an answer) | Tap an answer |
| Ride your broom | `B` (Space climbs, `C` dives, `Shift` is fast) | Broom (hold Jump to climb) |
| Stop an activity | `E` | Stop |
| Hide the screen text for photos | `P` | |
| Menu | `Esc` | Moon button, top right |

The compass at the top points to the places you've found, and ◇ marks the ones still waiting.

## The world

- **Wayfarer's Rest:** where you start, at a stone wall above the Mirror Lake, next to the witch Morwen.
- **Emberlight Village:** thatched cottages with glowing windows and chimney smoke, a chapel spire, and a mill with a turning water wheel.
- **The Mirror Lake:** Charon the ferryman rows across it all night.
- **Castle Vaelmoor:** a castle full of lit windows on a snowy crag in the Frostfang Mountains. Step into the blue Moonlift at its gate to ride up.
- **The Moonspire:** the tallest peak. Vessryn the moon dragon circles it.
- **The Goblin Market:** stalls, string lights and a bonfire in a hollow, run by Grizzleby Quint and friends.
- **The Witchwood:** glowing mushrooms, witch huts on stilts, bubbling cauldrons, and witches flying on broomsticks.
- **Stillwater Graves:** a gravedigger and three friendly ghosts.
- **The Moon Circle:** humming standing stones and a druid.
- **Archmage Oriel's Tower:** take the Moonlift up, then glide off the top.
- **Starwatch Light:** a lighthouse on a cliff that sweeps its beam across the clouds.
- **Starfall Point and the Moon Queen's Castle:** hop across floating stepping stones, riding the blue updrafts, to reach the Moon Queen's island.
- Drifting castle islands all around the edge of the world.

There are 45 characters to talk to: goblins, witches, wizards, knights, villagers, children, ghosts, a cat, the Moon Queen and more. The menu counts the places you've found and the people you've met.

### Join in

Some people ask you questions. Pick an answer, and some answers let you join in:

- **Borrow a broom:** say yes to Wren in the Witchwood, or take one from the broom rack. Then fly anywhere by looking where you want to go.
- **Broom race:** Hazel, the race keeper in the Witchwood, starts a race through eight glowing rings above the trees. Your best time is saved.
- **Bonfire dance:** Old Crumb invites you to dance round the fire with the goblins at the Goblin Market.
- **Sing-along:** Pip the bard gathers the villagers of Emberlight for a song.
- **Hide and seek:** Little Bo the ghost hides three times around Stillwater Graves. Listen for her giggles.
- **Ferry ride:** ring the bell on the dock at the south shore of the Mirror Lake, and Charon rows you around the lake.
- The Moon Queen, Grizzleby, Morwen and Soot the cat also have something to ask.

### Sounds

Each area sounds different: crickets and a music box in the village, lapping water and frogs by the lake, crackling fire and goblin chatter at the market, bubbling cauldrons in the Witchwood, sighing ghosts and wind chimes at the graves, a hum at the Moon Circle, torches and clanking armour at the castle, and howling wind up in the snowy mountains or high in the sky.

### Things to try

A few things in the world react when you walk up and press `E` (or tap Use):

- **Ring the chapel bell** in Emberlight Village (walk up to the chapel door)
- **Toss a coin into the well** in the village square and get a fortune
- **Throw goblin powder on the bonfire** at the Goblin Market for a burst of coloured sparks
- **Stir Mother Hemlock's cauldron** in the Witchwood
- **Touch the humming stone** in the Moon Circle and watch shooting stars fall

If you fall off the edge, the clouds catch you and carry you back.

## Development

```sh
npm install
npm run build      # writes docs/index.html (and dist/df1.html)
npm run dev        # rebuild whenever something in src/ changes
```

| File | What it does |
|---|---|
| `src/main.js` | Start-up, title screen, game loop, conversations, menu, saving |
| `src/layout.js` | The map: places, roads, lifts, stepping stones, floating islands |
| `src/terrain.js` | Heightmap, painted ground colours, landscape streaming |
| `src/structures.js` | Castles, cottages, the market, witch huts, graves, towers, floating islands |
| `src/flora.js` | Forests, glowing mushrooms and flowers |
| `src/characters.js` | Character models and how they move |
| `src/npcs.js` | Everyone in the world, what they say, and what they ask |
| `src/activities.js` | Joining in: bonfire dance, sing-along, broom race, hide and seek, ferry ride |
| `src/player.js` | Walking, running, gliding, swimming, broom flying, lifts, camera |
| `src/fx.js` | Sky, moon, cloud sea, lake, smoke, fireflies, snow, lighting |
| `src/art.js`, `src/kit.js` | Painted textures, materials, and the shape-building kit |
| `src/audio.js` | Sound created live: area sounds, tunes, voices, bells |
