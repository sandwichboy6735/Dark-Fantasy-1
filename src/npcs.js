// Everyone who lives in Moonveil. `beh`: idle | wander | path | fly | float | boat | isle
export const NPCS = [
  // ---- Wayfarer's Rest ----
  { type: 'witch', name: 'Morwen', title: 'Your travelling companion', x: 1.6, z: 346, beh: 'idle', face: Math.PI, voice: 1.25,
    o: { robe: '#2a2446', hat: '#1e1a30', hair: '#5a2e2a' },
    ask: { q: 'Shall I tell you a secret?', options: [
      { text: 'Yes, please!', reply: 'The witches in the Witchwood lend brooms to anyone polite. Ask young Wren, east of the village. Then the whole sky is yours.' },
      { text: 'Maybe later.', reply: 'Suit yourself, wanderer. Secrets keep.' }] },
    lines: ['Beautiful, isn’t it? Emberlight never sleeps while the moon is up.',
      'Follow the lanterns down the road to the village. Beyond it are the Frostfang Mountains and Castle Vaelmoor.',
      'Hold Jump while you fall and your cloak will catch the air. Handy, in a realm that floats.',
      'If you ever get lost, find the moon. She always hangs in the north.'] },

  // ---- Emberlight Village ----
  { type: 'villager', name: 'Old Tobias', title: 'Baker', x: -28, z: 66, beh: 'wander', radius: 6, o: { robe: '#6a5440', apron: '#e0d6c0', hood: false, hair: '#bbb' },
    lines: ['Fresh bread! Baked at midnight, like everything else round here.', 'It’s always midnight in Moonveil. Makes the opening hours very easy to remember.'] },
  { type: 'villager', name: 'Ferris', title: 'The Miller', x: 49, z: 105, beh: 'idle', face: 1.6, o: { robe: '#4a4a3a', hood: false, hair: '#6a4a30', apron: '#9a8a70' },
    lines: ['The wheel turns whether the lake likes it or not.', 'The lake? Ask Charon the ferryman. He’s been rowing since before it had water in it.'] },
  { type: 'villager', name: 'Pip', title: 'Bard of Emberlight', x: 5, z: 38, beh: 'wander', radius: 12, voice: 1.3, o: { robe: '#6a2a4a', hood: false, hat: '#3a2a5a', feather: '#e0c060', lute: true, hair: '#c08040' },
    ask: { q: 'Will you sing along with me? Everyone in Emberlight joins in!', options: [
      { text: 'Let\u2019s sing!', reply: 'Gather round, everyone! A-one, a-two...', do: 'song' },
      { text: 'Not right now.', reply: 'Your loss. It\u2019s a very good song. About a monocle.' }] },
    lines: ['A song? I only know one. It’s about a goblin who lost his monocle.', '♪ Oh the moon is round and the night is long, and Grizzleby’s monocle’s gone, gone, gone ♪', 'The goblins in the Market say it isn’t lost. They say he sold it. To himself.'] },
  { type: 'villager', name: 'Sister Aldith', title: 'Keeper of the Chapel', x: 6, z: -22, beh: 'idle', face: 0, o: { robe: '#56566a', hoodColor: '#3a3a4a' },
    lines: ['Our bell rings for the Moon Queen. She has never once rung back.', 'They say she lives on the last floating island, past Starfall Point. The stones drift out to her.'] },
  { type: 'villager', name: 'Marta', title: 'Weaver', x: -62, z: 20, beh: 'wander', radius: 8, o: { robe: '#3a4a6a', hood: false, hair: '#2a1a1a', apron: '#c0a080' },
    lines: ['I weave cloaks for wizards. The trick is to leave room for the stars.', 'Yours is a fine cloak. A little dusty. Have you been gliding?'] },
  { type: 'villager', name: 'Nell', title: 'A village child', x: 20, z: 50, beh: 'wander', radius: 18, speed: 2.6, voice: 1.7, o: { child: true, robe: '#8a4a3a', hood: false, hair: '#e0a040' },
    lines: ['Tag! You’re it!', 'My brother says the dragon on the Moonspire is real. I say it’s just a very big bat.'] },
  { type: 'villager', name: 'Bram', title: 'A village child', x: 26, z: 44, beh: 'wander', radius: 18, speed: 2.4, voice: 1.6, o: { child: true, robe: '#3a5a4a', hood: false, hair: '#4a2a1a' },
    lines: ['It IS a dragon. Her name is Vessryn and she circles the mountain every night.', 'She never lands. Nobody knows where she sleeps.'] },
  { type: 'villager', name: 'Hollis', title: 'Blacksmith', x: 82, z: 18, beh: 'idle', face: -1.2, o: { robe: '#3a3230', hood: false, hair: '#1a1a1a', apron: '#5a4030', tool: true, skin: '#c89878' },
    lines: ['I forge lantern hooks. The goblins buy every single one.', 'What do goblins do with so many lanterns? I asked once. They sold me a lantern.'] },
  { type: 'villager', name: 'Nan Greaves', title: 'Oldest in Emberlight', x: -92, z: 58, beh: 'idle', face: 1.2, voice: 0.85, o: { robe: '#4a3a4a', hoodColor: '#2e2430' },
    lines: ['In my day the islands floated lower. You could jump onto them.', 'Now you need a good cloak and a better nerve.', 'Mind you, the view from up there hasn’t changed a bit.'] },
  { type: 'villager', name: 'Egbert', title: 'Night Watchman', x: 40, z: 50, beh: 'path', path: [[40, 50], [120, 70], [215, 120], [235, 230], [150, 330], [235, 230], [215, 120], [120, 70]], speed: 1.3, o: { robe: '#3a3a4a', hat: '#2a2a2a', lantern: true, hood: false, hair: '#8a6a4a' },
    lines: ['Quiet night. Every night’s quiet. I’m not complaining.', 'Twenty years on watch and the worst I’ve seen is a goblin with a very loud hat.'] },
  { type: 'cat', name: 'Soot', title: 'The village cat', x: -18, z: 38, beh: 'wander', radius: 10, speed: 0.8, voice: 2,
    ask: { q: '(Soot looks at you, then at your hand.)', options: [
      { text: 'Pet the cat', reply: '(Soot purrs like a tiny thunderstorm.)', do: 'purr' },
      { text: 'Leave the cat alone', reply: '(Soot seems offended that you did not try.)' }] },
    lines: ['Mrrp.', '(Soot stares at you as if you owe it money.)', '(Soot allows you to exist. For now.)'] },
  { type: 'wizard', name: 'Theodric', title: 'Scholar of the Moon', x: -40, z: 112, beh: 'idle', face: 0.4, voice: 0.8, o: { robe: '#4a3a2a', hat: '#3a2a1a', orb: '#ffd080' },
    lines: ['I came here to study the moon. Forty years later I’m still on the first page.', 'Did you know she never sets? She just drifts a little, like the islands.', 'Archmage Oriel’s tower is west of the Goblin Market. Ask him about the lifts of light.'] },

  // ---- Mirror Lake ----
  { type: 'villager', name: 'Charon', title: 'Ferryman of the Mirror Lake', x: 0, z: 205, y: 18.4, beh: 'boat', voice: 0.6, o: { robe: '#1e1c28', hoodColor: '#141218', lantern: true },
    lines: ['Room for one more. There is always room for one more.', 'I row from one shore to the other, and back. It is very relaxing. You should try it.'] },

  // ---- Castle Vaelmoor ----
  { type: 'knight', name: 'Sir Aldric', title: 'Warden of the Gate', x: -315, z: -463, beh: 'idle', face: 0.3,
    lines: ['Halt! Who goes... oh. A wizard. Go on, then.', 'The Moonlift is right behind me. Step into the blue light and it will carry you up to the castle.'] },
  { type: 'knight', name: 'Sir Gorm', title: 'Guard of the Walls', x: -375, z: -541, beh: 'path', path: [[-375, -541], [-388, -541], [-388, -552], [-375, -552]], speed: 0.9, voice: 0.8, o: { tabard: '#5a1a2a', plume: '#e0c060' },
    lines: ['Thirty years I’ve guarded these walls. Never once been attacked.', 'Best job in the realm. Terrible for stories, though.'] },
  { type: 'knight', name: 'Dame Beatrix', title: 'Captain of Vaelmoor', x: -371, z: -553, beh: 'idle', face: 0.8, voice: 1.15, o: { tabard: '#2a4a5a', plume: '#c0e0ff', shield: '#2a3a6a' },
    lines: ['We keep watch over the snow road. Travellers get lost in the Frostfangs.', 'If you see a light moving on the mountain at night, it’s only Brother Oswin. He walks the road every night and never arrives.'] },
  { type: 'queen', name: 'Lady Isolde', title: 'Lady of Vaelmoor', x: -386, z: -545, beh: 'idle', face: 0, voice: 1.1, o: { robe: '#6a1e2a', trim: '#ffb060', hair: '#2a1a1a', crown: '#ffd080', skin: '#ecd8c8' },
    lines: ['Welcome to Vaelmoor. Every window is lit so travellers in the snow always know the way home.', 'My family has kept the lights burning for four hundred winters.', 'We are running a little low on candles. If you see Hollis the blacksmith, tell him the goblins can spare a few.'] },
  { type: 'villager', name: 'Squire Ned', title: 'Polisher of Armour', x: -384, z: -540, beh: 'wander', radius: 4, voice: 1.4, o: { robe: '#5a5a70', hood: false, hair: '#c09050' },
    lines: ['I polish the armour. All of it. Every day.', 'Sir Gorm’s helmet is so shiny now he can see the moon in it.'] },
  { type: 'villager', name: 'Brother Oswin', title: 'Pilgrim of the Snow Road', x: -150, z: -200, beh: 'path', path: [[-80, -60], [-150, -200], [-230, -330], [-290, -430], [-230, -330], [-150, -200]], speed: 0.9, voice: 0.9, o: { robe: '#7a6a5a', hoodColor: '#5a4a3a', lantern: true },
    lines: ['I walk to Vaelmoor every night. I never quite arrive.', 'I think the road likes me. It keeps me company.'] },
  { type: 'villager', name: 'Hermit Ulla', title: 'Of the High Snows', x: 60, z: -600, beh: 'idle', face: 0, voice: 0.9, o: { robe: '#d0ccd8', hoodColor: '#a8a4b8', skin: '#d8b8a0' },
    lines: ['Up here the snow falls upward, if you’re patient enough to watch.', 'That mountain is the Moonspire. The dragon Vessryn circles it. She’s shy, not fierce.'] },

  // ---- The Goblin Market ----
  { type: 'goblin', name: 'Grizzleby Quint', title: 'Purveyor of Fine Things', x: -640, z: 118, beh: 'idle', face: 0, voice: 0.75, o: { monocle: true, lantern: true, vest: '#6a1018', size: 1.2, gesture: true, seed: 3 },
    ask: { q: 'Care to buy something? Everything is free today. Well, for you. Just today.', options: [
      { text: 'What\u2019s the best thing you have?', reply: 'This lantern! It is not for sale. But you may LOOK at it. Marvellous, isn\u2019t it?' },
      { text: 'Just looking.', reply: 'Looking is how all the best deals start.' }] },
    lines: ['Ahh, a customer! Welcome, welcome to the finest stall in the Goblin Market!',
      'Everything’s for sale. Well. Everything except the monocle. And the waistcoat. And the lantern.',
      'No coin? No matter. A smile is worth... well, not much, but I’ll take it.',
      'If that bard in Emberlight tells you I lost my monocle, he is a liar. I misplaced it. Briefly.'] },
  { type: 'goblin', name: 'Nettle', title: 'Berry Seller', x: -600, z: 125, beh: 'idle', face: -1.4, voice: 1.2, o: { vest: '#2a5a3a', skin: '#7a8a40' },
    lines: ['Moonberries! Glowberries! Berries that are probably fine!', 'Eat a glowberry and you’ll see in the dark. Eat two and the dark will see you.'] },
  { type: 'goblin', name: 'Snagtooth', title: 'Collector of Buttons', x: -690, z: 170, beh: 'wander', radius: 10, voice: 0.9, o: { vest: '#4a3a6a', hat: '#2a2a2a' },
    lines: ['You have EXCELLENT buttons.', 'No, I don’t want to buy them. I want to admire them. From very close. For a long time.'] },
  { type: 'goblin', name: 'Madame Wort', title: 'Teller of Fortunes', x: -672, z: 112, beh: 'idle', face: 0.9, voice: 1.1, o: { vest: '#5a2a6a', eyes: '#c080ff', lantern: true },
    lines: ['I see... a long journey. And a very big moon. That will be three coppers.', 'I also see floating stones and a queen made of moonlight. That one’s free.'] },
  { type: 'goblin', name: 'Gibbet', title: 'One of the Gobbo Twins', x: -610, z: 160, beh: 'wander', radius: 12, speed: 1.6, voice: 1.4, o: { vest: '#8a6a2a' },
    lines: ['We’re not twins. He’s just copying me.'] },
  { type: 'goblin', name: 'Gobbet', title: 'The other Gobbo Twin', x: -606, z: 164, beh: 'wander', radius: 12, speed: 1.6, voice: 1.45, o: { vest: '#8a6a2a' },
    lines: ['We’re not twins. He’s just copying me.'] },
  { type: 'goblin', name: 'Old Crumb', title: 'Elder of the Market', x: -650, z: 150, beh: 'idle', face: Math.PI, voice: 0.6, o: { vest: '#3a3030', skin: '#5a6a3a', monocle: true },
    ask: { q: 'Every night the goblins dance round the bonfire. Will you join us?', options: [
      { text: 'Yes, let\u2019s dance!', reply: 'Hah! Everyone, round the fire! Mind your tails!', do: 'dance' },
      { text: 'I\u2019ll just watch.', reply: 'Watching is allowed. Tapping your feet is encouraged.' }] },
    lines: ['This Market has been here since the first goblin found a hole and said: this will do.', 'Goblins aren’t greedy. We’re just very, very enthusiastic about things.'] },
  { type: 'goblin', name: 'Fidget', title: 'Market Runner', x: -620, z: 140, beh: 'wander', radius: 25, speed: 3, voice: 1.8, o: { vest: '#2a4a6a' },
    lines: ['Can’t stop! Delivering a lantern! To another goblin! Who sells lanterns!'] },

  // ---- The Witchwood ----
  { type: 'witch', name: 'Mother Hemlock', title: 'Brewer of the Witchwood', x: 604, z: -52, beh: 'idle', face: 2.2, voice: 0.85, o: { robe: '#2a3a2a', hat: '#1a221a', hair: '#9a9a9a' },
    lines: ['Stew’s nearly ready. Don’t ask what’s in it. It’s mostly mushrooms. Mostly.', 'The Witchwood looks spooky. It’s actually very cosy, once the trees get to know you.'] },
  { type: 'witch', name: 'Brambleweed', title: 'Mushroom Whisperer', x: 715, z: 92, beh: 'wander', radius: 10, voice: 1.1, o: { robe: '#3a2a4a', hair: '#2a4a2a' },
    lines: ['The mushrooms glow because they’re happy. Or angry. It’s hard to tell with mushrooms.', 'Please don’t step on the big blue ones. They’re shy.'] },
  { type: 'witch', name: 'Wren', title: 'Apprentice Witch', x: 570, z: 128, beh: 'wander', radius: 8, voice: 1.5, o: { robe: '#4a2a3a', hair: '#c05a2a' },
    ask: { q: 'Want to borrow my spare broom? It only bucks a little.', options: [
      { text: 'Yes! I want to fly!', reply: 'Here you go! Press B (or tap Broom) to hop on and off. Look where you want to go, and hold Jump to climb.', do: 'broom' },
      { text: 'No thanks, I like the ground.', reply: 'The ground is very reliable. I respect that.' }] },
    lines: ['I’m learning to fly my broom. So far I’ve learned to fall off it.', 'Elspeth and Agatha fly circles over the wood all night. Show-offs.'] },
  { type: 'witch', name: 'Elspeth', title: 'Night Flyer', x: 640, z: 20, y: 60, beh: 'fly', radius: 90, speed: 0.12, o: { broom: true, robe: '#2a2040' } },
  { type: 'witch', name: 'Agatha', title: 'Night Flyer', x: 660, z: 0, y: 75, beh: 'fly', radius: 140, speed: -0.08, phase: 2, o: { broom: true, robe: '#3a1a2a', hair: '#1a1a1a' } },
  { type: 'witch', name: 'Hazel', title: 'Keeper of the Broom Race', x: 590, z: 34, beh: 'idle', face: 1.2, voice: 1.2, o: { robe: '#3a2a5a', hat: '#221a3a', hair: '#e0a040', broom: true },
    ask: { q: 'The Night Flyers race through the glowing rings above the wood. Want to race?', options: [
      { text: 'Yes, let\u2019s race!', reply: 'Hop on! Fly through the golden ring, then the next one lights up. Go, go, go!', do: 'race' },
      { text: 'Not tonight.', reply: 'The rings will be here. They never get tired.' }] },
    lines: ['Welcome, flyer! Or future flyer.', 'Elspeth holds the record. Agatha says Elspeth cheats. Elspeth says Agatha is slow.'] },
  { type: 'witch', name: 'Grimalda', title: 'Hermit of the Wood', x: 700, z: -100, beh: 'idle', face: -2.4, voice: 0.9, o: { robe: '#1e1a2a', hair: '#e0e0e0' },
    lines: ['Hmph. Visitors.', '...Well, since you’re here. The Moon Circle south of the lake hums when you stand in it. Go and listen.'] },

  // ---- Stillwater Graves ----
  { type: 'villager', name: 'Mortimer', title: 'Gravedigger', x: 420, z: 520, beh: 'wander', radius: 10, voice: 0.7, o: { robe: '#2a2a2a', hoodColor: '#1a1a1a', tool: true },
    lines: ['Quietest neighbours in the realm. Never borrow sugar.', 'The ghosts? Harmless. Lady Wisteria just likes to talk.'] },
  { type: 'ghost', name: 'Lady Wisteria', title: 'Resident, Stillwater Graves', x: 410, z: 490, beh: 'float', radius: 5, voice: 1.3, o: { color: '#b0c8ff' },
    lines: ['I’m not haunting. I’m visiting. Indefinitely.', 'The view of the moon from here is lovely. Four hundred years and it hasn’t moved an inch.'] },
  { type: 'ghost', name: 'Sir Percival the Late', title: 'Formerly of Vaelmoor', x: 445, z: 505, beh: 'float', radius: 4, voice: 0.8, o: { color: '#9ae0ff' },
    lines: ['I guarded Castle Vaelmoor for thirty years. Never once attacked.', 'Eventually I simply... drifted off. Tell Sir Gorm to take a walk now and then.'] },
  { type: 'ghost', name: 'Little Bo', title: 'Very good at hide and seek', x: 400, z: 480, beh: 'float', radius: 8, voice: 1.9, o: { color: '#c0f0ff' },
    ask: { q: 'Want to play hide and seek? I\u2019ll hide three times!', options: [
      { text: 'Ready or not!', reply: 'Close your eyes and count to three... hee hee!', do: 'seek' },
      { text: 'Maybe later, Bo.', reply: 'Okay. I\u2019ll practise hiding. You\u2019ll never find me anyway.' }] },
    lines: ['Want to play hide and seek? I’m very good at it.', 'You’ll never find me. I’m the one that glows.'] },

  // ---- The Moon Circle ----
  { type: 'wizard', name: 'Fenwick', title: 'Druid of the Moon Circle', x: -272, z: 548, beh: 'idle', face: -2.5, voice: 0.9, o: { robe: '#2a4a3a', hat: '#1e3a2a', orb: '#a0ffb0', beardColor: '#c0c8a0' },
    lines: ['When the moon is full, the stones hum. She is always full. They are always humming.', 'Stand still and listen. The realm is floating, you know. You can almost feel it bob.'] },

  // ---- Archmage Oriel's Tower ----
  { type: 'villager', name: 'Tam', title: 'Apprentice to the Archmage', x: -752, z: -244, beh: 'idle', face: 0.3, voice: 1.4, o: { robe: '#4a2a6a', hood: false, hair: '#2a1a1a' },
    lines: ['The Archmage is at the top. The Moonlift is right there. Step into the light.', 'He doesn’t use the stairs. There are no stairs. He says stairs are for people without imagination.'] },
  { type: 'wizard', name: 'Archmage Oriel', title: 'Keeper of the Tower', x: -758, z: -262, beh: 'isle', face: 0, voice: 0.7, o: { robe: '#4a2a7a', hat: '#2a1a4a', hatH: 1.1, orb: '#d0a0ff' },
    lines: ['Ah. You found the lift. Most visitors knock for three days.', 'From up here you can see all of Moonveil. The islands drift, but they always come back.', 'Those lights in the clouds to the south-west are the Moon Queen’s castle. Starfall Point is the way.', 'Glide off my tower if you like. Everyone does. It’s the best part.'] },

  // ---- Starwatch Light ----
  { type: 'villager', name: 'Keeper Maud', title: 'Keeper of Starwatch Light', x: 126, z: 1180, beh: 'idle', face: Math.PI, voice: 1.05, o: { robe: '#2a3a5a', hood: false, hair: '#d0d0d0', lantern: true },
    lines: ['Starwatch Light guides the sky-ships home.', 'There hasn’t been a sky-ship in a hundred years. But you never know.'] },

  // ---- Starfall Point ----
  { type: 'villager', name: 'Captain Rook', title: 'Retired Sky-Sailor', x: -852, z: 852, beh: 'idle', face: -2.4, voice: 0.85, o: { robe: '#2a2a3a', hood: false, hat: '#1a1a22', feather: '#c0d0ff', hair: '#5a4a3a' },
    lines: ['Those stones float all the way out to the Moon Queen’s island.', 'Jump, then hold Jump to glide. The blue lights on the stones will lift you back up.', 'And if you fall? The clouds are soft. They’ll send you back here, more or less.'] },

  // ---- The Moon Queen's island ----
  { type: 'queen', name: 'Selene', title: 'The Moon Queen', x: -1260, z: 1290, beh: 'isle', face: 0.8, voice: 1.2,
    ask: { q: 'Would you like the moon to sing for you?', options: [
      { text: 'Yes, please.', reply: 'Then listen. And look up.', do: 'stars' },
      { text: 'I\u2019m happy just to be here.', reply: 'So am I, little wizard. So am I.' }] },
    lines: ['You crossed the stepping stones. Few wanderers do.', 'I let the islands drift so that the realm never grows still.', 'There is no end to Moonveil, little wizard. Only more moonlight. Go wherever you like.'] },
  { type: 'knight', name: 'Sir Caelum', title: 'Moonguard', x: -1250, z: 1298, beh: 'isle', face: 0.8, voice: 0.9, o: { steel: '#c8ccec', tabard: '#8088c8', plume: '#e8f0ff', cape: '#4a4e8a', shield: '#6a70b0' },
    lines: ['The Queen welcomes all who make the crossing.', 'Mind the edge. It’s a long way down, and the clouds only look like pillows.'] },
  { type: 'knight', name: 'Dame Lyra', title: 'Moonguard', x: -1270, z: 1300, beh: 'isle', face: 0.8, voice: 1.1, o: { steel: '#c8ccec', tabard: '#8088c8', plume: '#e8f0ff', cape: '#4a4e8a', shield: '#6a70b0' },
    lines: ['From here you can see the whole continent floating on the cloud sea.', 'Emberlight’s lights are just there. Can you see them?'] },
];
