// Block registry. Every block names the procedural textures it uses (see textures.js).

export const B = {
  AIR: 0, BLIGHTGRASS: 1, GRAVEDIRT: 2, STONE: 3, BLACKSTONE: 4, ASH: 5, DEADWOOD: 6, BLOODLEAF: 7,
  PLANKS: 8, GOTHIC_BRICK: 9, MOSSY_BRICK: 10, OBSIDIAN: 11, BONE: 12, SOUL_CRYSTAL: 13, EMBER_STONE: 14,
  RUNE_STONE: 15, SOUL_LANTERN: 16, CANDLES: 17, WATER: 18, BOG_MUD: 19, PALE_FROST: 20, GHOSTWOOD: 21,
  WRAITHLEAF: 22, STAINED_GLASS: 23, DEAD_GRASS: 24, BLOODROOT: 25, GHOSTCAP: 26, ABYSSAL: 27,
  SKULL_PILE: 28, COBWEB: 29, GRAVEL: 30, VELVET: 31, GOLD: 32, WITCHFIRE: 33, GLOOMLEAF: 34,
  PALEGRASS: 35, PALE_PLANKS: 36, CHAINS: 37, TOMES: 38, BLOODSTONE: 39,
};

const defaults = {
  solid: true, opaque: true, cutout: false, translucent: false, water: false, cross: false,
  atten: 15, warm: 0, soul: 0, emissive: 0, hardness: 1, drop: undefined, sway: 0, breakable: true,
};

const defs = [
  [B.BLIGHTGRASS, 'Blightgrass', { top: 'blightgrass_top', side: 'blightgrass_side', bottom: 'gravedirt' }, { hardness: 0.6, drop: B.GRAVEDIRT, desc: 'Grass that grew on a battlefield and never forgot it.' }],
  [B.GRAVEDIRT, 'Gravedirt', 'gravedirt', { hardness: 0.5, desc: 'Soft, cold, and somehow always freshly turned.' }],
  [B.STONE, 'Weeping Stone', 'stone', { hardness: 1.3, desc: 'Damp grey stone. It is always damp.' }],
  [B.BLACKSTONE, 'Blackstone', 'blackstone', { hardness: 1.5, desc: 'Stone scorched black by a fire nobody remembers.' }],
  [B.ASH, 'Ash', 'ash', { hardness: 0.4, desc: 'What remains of the old forests.' }],
  [B.DEADWOOD, 'Deadwood Log', { top: 'deadwood_top', side: 'deadwood', bottom: 'deadwood_top' }, { hardness: 1, desc: 'Black bark, hard as iron, cold as a coffin lid.' }],
  [B.BLOODLEAF, 'Bloodleaf', 'bloodleaf', { opaque: false, cutout: true, atten: 1, hardness: 0.2, sway: 1, desc: 'The leaves turned red one autumn and never turned back.' }],
  [B.PLANKS, 'Deadwood Planks', 'planks', { hardness: 0.8, desc: 'Good for floors that creak at midnight.' }],
  [B.GOTHIC_BRICK, 'Gothic Brick', 'gothic_brick', { hardness: 1.5, desc: 'Cut by monks who built cathedrals for a god that left.' }],
  [B.MOSSY_BRICK, 'Mossy Brick', 'mossy_brick', { hardness: 1.5, desc: 'The moss is slowly winning.' }],
  [B.OBSIDIAN, 'Obsidian', 'obsidian', { hardness: 3, desc: 'Volcanic glass. Your reflection blinks a moment late.' }],
  [B.BONE, 'Bone Block', { top: 'bone_top', side: 'bone', bottom: 'bone_top' }, { hardness: 1, desc: 'From something very large, and very old.' }],
  [B.SOUL_CRYSTAL, 'Soul Crystal', 'soul_crystal', { soul: 13, emissive: 1, hardness: 1.2, desc: 'A trapped glimmer of someone who wandered too deep.' }],
  [B.EMBER_STONE, 'Ember Stone', 'ember_stone', { warm: 12, emissive: 1, hardness: 1.2, desc: 'Warm to the touch. Hums when nobody listens.' }],
  [B.RUNE_STONE, 'Rune Stone', { top: 'blackstone', side: 'rune_stone', bottom: 'blackstone' }, { soul: 8, emissive: 0.9, hardness: 2, desc: 'Carved in a language that reads you back. Right-click to read.' }],
  [B.SOUL_LANTERN, 'Soul Lantern', 'soul_lantern', { opaque: false, cutout: true, atten: 0, soul: 15, emissive: 1, hardness: 0.5, desc: 'A pale blue flame that never needs feeding.' }],
  [B.CANDLES, 'Tallow Candles', 'candles', { solid: false, opaque: false, cutout: true, cross: true, atten: 0, warm: 12, emissive: 1, hardness: 0, desc: 'Lit for the dead. The dead are grateful.' }],
  [B.WATER, 'Murkwater', 'water', { solid: false, opaque: false, translucent: true, water: true, atten: 1, hardness: 0, breakable: false, desc: 'Still, black, and deeper than it looks.' }],
  [B.BOG_MUD, 'Bog Mud', 'bog_mud', { hardness: 0.5, desc: 'It pulls gently at your boots.' }],
  [B.PALE_FROST, 'Pale Frost', 'pale_frost', { hardness: 0.3, desc: 'Snow that fell from a moonless sky.' }],
  [B.GHOSTWOOD, 'Ghostwood Log', { top: 'ghostwood_top', side: 'ghostwood', bottom: 'ghostwood_top' }, { hardness: 1, desc: 'Pale as a bone and faintly warm.' }],
  [B.WRAITHLEAF, 'Wraithleaf', 'wraithleaf', { opaque: false, cutout: true, atten: 1, soul: 7, emissive: 0.55, hardness: 0.2, sway: 1, desc: 'Leaves that glow like breath on a winter night.' }],
  [B.STAINED_GLASS, 'Stained Glass', 'stained_glass', { opaque: false, translucent: true, atten: 0, emissive: 0.35, hardness: 0.4, desc: 'A saint whose name was scratched out.' }],
  [B.DEAD_GRASS, 'Dead Grass', 'dead_grass', { solid: false, opaque: false, cutout: true, cross: true, atten: 0, hardness: 0, sway: 1, desc: 'Dry, rustling, whispering.' }],
  [B.BLOODROOT, 'Bloodroot', 'bloodroot', { solid: false, opaque: false, cutout: true, cross: true, atten: 0, warm: 5, emissive: 0.8, hardness: 0, sway: 1, desc: 'Blooms only where something was buried.' }],
  [B.GHOSTCAP, 'Ghostcap', 'ghostcap', { solid: false, opaque: false, cutout: true, cross: true, atten: 0, soul: 9, emissive: 1, hardness: 0, desc: 'A mushroom that glows for nobody.' }],
  [B.ABYSSAL, 'Abyssal Stone', 'abyssal', { hardness: 99, breakable: false, desc: 'The bottom of the world. Do not listen at it.' }],
  [B.SKULL_PILE, 'Skull Pile', { top: 'bone_top', side: 'skull_pile', bottom: 'bone_top' }, { hardness: 0.8, desc: 'They are smiling. They are always smiling.' }],
  [B.COBWEB, 'Cobweb', 'cobweb', { solid: false, opaque: false, cutout: true, cross: true, atten: 0, hardness: 0, desc: 'The spider left long ago.' }],
  [B.GRAVEL, 'Crypt Gravel', 'gravel', { hardness: 0.5, desc: 'Look closer. Some of it is teeth.' }],
  [B.VELVET, 'Crimson Velvet', 'velvet', { hardness: 0.3, desc: 'Torn from the drapes of a fallen court.' }],
  [B.GOLD, 'Tarnished Gold', 'gold', { hardness: 1.5, desc: 'A king\'s ransom, left for the crows.' }],
  [B.WITCHFIRE, 'Witchfire', 'witchfire', { solid: false, opaque: false, cutout: true, cross: true, atten: 0, soul: 13, emissive: 1, hardness: 0, desc: 'Green flame. It burns memories, not wood.' }],
  [B.GLOOMLEAF, 'Gloomleaf', 'gloomleaf', { opaque: false, cutout: true, atten: 1, hardness: 0.2, sway: 1, desc: 'Hangs over the marsh like a mourning veil.' }],
  [B.PALEGRASS, 'Palegrass', { top: 'palegrass_top', side: 'palegrass_side', bottom: 'gravedirt' }, { hardness: 0.6, drop: B.GRAVEDIRT, desc: 'Silver grass of the moonlit glades.' }],
  [B.PALE_PLANKS, 'Pale Planks', 'pale_planks', { hardness: 0.8, desc: 'Ghostwood, cut and quiet.' }],
  [B.CHAINS, 'Hanging Chains', 'chains', { solid: false, opaque: false, cutout: true, cross: true, atten: 0, hardness: 0.3, desc: 'Whatever they held is gone.' }],
  [B.TOMES, 'Forbidden Tomes', { top: 'planks', side: 'tomes', bottom: 'planks' }, { hardness: 0.8, desc: 'Every book is the same book, in a different hand.' }],
  [B.BLOODSTONE, 'Bloodstone', 'bloodstone', { emissive: 0.35, hardness: 1.6, desc: 'Veined with something that still pulses.' }],
];

export const BLOCKS = [];
BLOCKS[0] = { ...defaults, id: 0, name: 'Air', solid: false, opaque: false, atten: 0, breakable: false, tex: null };
for (const [id, name, tex, opts] of defs) {
  const t = typeof tex === 'string' ? { top: tex, side: tex, bottom: tex } : tex;
  BLOCKS[id] = { ...defaults, id, name, tex: t, ...opts };
  if (BLOCKS[id].drop === undefined) BLOCKS[id].drop = id;
}

// Fast lookup tables
export const N_BLOCKS = BLOCKS.length;
export const OPAQUE = new Uint8Array(256);
export const SOLID = new Uint8Array(256);
export const ATTEN = new Uint8Array(256);
export const EMIT_WARM = new Uint8Array(256);
export const EMIT_SOUL = new Uint8Array(256);
for (const b of BLOCKS) {
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  SOLID[b.id] = b.solid ? 1 : 0;
  ATTEN[b.id] = b.atten;
  EMIT_WARM[b.id] = b.warm;
  EMIT_SOUL[b.id] = b.soul;
}

// Order shown in the Architect catalogue
export const CATALOG = [
  B.BLIGHTGRASS, B.PALEGRASS, B.GRAVEDIRT, B.BOG_MUD, B.ASH, B.GRAVEL, B.PALE_FROST, B.STONE, B.BLACKSTONE,
  B.OBSIDIAN, B.BLOODSTONE, B.ABYSSAL, B.DEADWOOD, B.GHOSTWOOD, B.PLANKS, B.PALE_PLANKS, B.GOTHIC_BRICK, B.MOSSY_BRICK,
  B.BLOODLEAF, B.GLOOMLEAF, B.WRAITHLEAF, B.BONE, B.SKULL_PILE, B.VELVET, B.GOLD, B.TOMES, B.STAINED_GLASS,
  B.SOUL_CRYSTAL, B.EMBER_STONE, B.RUNE_STONE, B.SOUL_LANTERN, B.CANDLES, B.WITCHFIRE, B.CHAINS,
  B.DEAD_GRASS, B.BLOODROOT, B.GHOSTCAP, B.COBWEB,
];

// Wanderer-mode crafting. Each recipe: inputs [[id, count]...] -> [id, count]
export const RECIPES = [
  { in: [[B.DEADWOOD, 1]], out: [B.PLANKS, 4] },
  { in: [[B.GHOSTWOOD, 1]], out: [B.PALE_PLANKS, 4] },
  { in: [[B.STONE, 4]], out: [B.GOTHIC_BRICK, 4] },
  { in: [[B.GOTHIC_BRICK, 4], [B.GLOOMLEAF, 1]], out: [B.MOSSY_BRICK, 4] },
  { in: [[B.BONE, 3]], out: [B.SKULL_PILE, 1] },
  { in: [[B.EMBER_STONE, 1], [B.BONE, 1]], out: [B.CANDLES, 4] },
  { in: [[B.SOUL_CRYSTAL, 1], [B.BLACKSTONE, 2]], out: [B.SOUL_LANTERN, 2] },
  { in: [[B.ASH, 4], [B.EMBER_STONE, 1], [B.BLOODROOT, 1]], out: [B.STAINED_GLASS, 4] },
  { in: [[B.BLACKSTONE, 1], [B.SOUL_CRYSTAL, 1]], out: [B.RUNE_STONE, 1] },
  { in: [[B.PLANKS, 4], [B.BLOODROOT, 1]], out: [B.TOMES, 1] },
  { in: [[B.BLOODROOT, 2], [B.DEAD_GRASS, 2]], out: [B.VELVET, 1] },
  { in: [[B.OBSIDIAN, 1]], out: [B.CHAINS, 4] },
  { in: [[B.GHOSTCAP, 1], [B.EMBER_STONE, 1]], out: [B.WITCHFIRE, 2] },
  { in: [[B.BLOODSTONE, 2], [B.EMBER_STONE, 2]], out: [B.GOLD, 1] },
];
