// Everyone you can talk to. Look at them to hear them; press E or click for more.
// `lines` is the default; `stages` overrides it for a quest stage (see game/quest.js):
// 0 arrived, 1 hunting bells, 'ready' all bells found, 2 carrying the Toast, 3 the Eye is closed.

export const GUARDS = [
  {
    id: 'aldric',
    kind: 'knight',
    name: 'Ser Aldric the Unsleeping',
    path: [[-2.0, -7]],
    facing: 0,
    lines: [
      'Halt. ...No. Go on, pilgrim. The castle expects everyone, sooner or later.',
      'Keep to the middle of the steps. The edges remember the ones who fell.',
      'Nine hundred nights at this post. I do not recall sleeping. I do not recall wanting to.',
    ],
    stages: {
      0: [
        'Halt. ...No. Go on, pilgrim. The castle expects everyone, sooner or later.',
        'Lost? The goblins\' tavern is east of this court. The keeper there is always looking for fools. Er. Helpers.',
      ],
      1: [
        'Going up? Watch for the blue light. That is the Eye\'s gaze, sweeping the steps.',
        'Stand in it too long and it SEES you. You\'ll wake back at the last torch you sheltered by. Torchlight hides you.',
      ],
      2: ['Is that... ale? Taken UP there? The Captain will have words. Or perhaps he will have a sip.'],
      3: ['I think... I think I could sleep. Tonight, I might.', 'Nine hundred and one nights. The last one was the quietest.'],
    },
  },
  {
    id: 'lamplighter',
    kind: 'hooded',
    name: 'The Lamplighter',
    path: [[1.3, -9], [1.3, -48]],
    speed: 0.9,
    lines: [
      'Mind the torches. They burn orange so the blue light cannot follow you in.',
      'I light them at dusk. It is always dusk.',
      'If the Eye blinks while you are on the causeway... try not to be on the causeway.',
    ],
    stages: {
      0: [
        'The wind took most of my torches tonight. Only the first and last still burn.',
        'Walk up to a dead torch and it will catch again. Every torch you light is a place the Eye cannot see you.',
      ],
      1: [
        'Bells? Yes. Something gold was glinting between the landings. Right where the blue light sweeps.',
        'Relight my torches as you climb. Wait in their glow while the gaze passes, then go.',
      ],
      2: ['Walk, do not run, with that cup. And wait in the torchlight for the gaze to pass. The Eye is angry now; it moves faster.'],
      3: ['The torches burn the same, but they are no longer hiding anything. How strange.'],
    },
  },
  {
    id: 'grisel',
    kind: 'knight',
    name: 'Ser Grisel',
    path: [[-1.3, -30], [-1.3, -72]],
    speed: 1.2,
    lines: [
      'Clank. Clank. Clank. Forgive me. The armour talks when I walk.',
      'The castle had a name once. The Eye took it, along with the stars.',
      'The goblins at the Tankard sing all night. The Eye cannot abide them. I envy them.',
    ],
    stages: {
      1: ['A bell rolled past me on the stair earlier. I did not chase it. Knights do not chase.', 'Clank. Clank. Clank. Forgive me. The armour talks when I walk.'],
      3: ['Do you hear that? Nothing. No humming in the helm. I had forgotten silence.'],
    },
  },
  {
    id: 'wick',
    kind: 'hooded',
    name: 'Brother Wick',
    path: [[1.4, -56], [1.4, -93]],
    speed: 0.8,
    lines: [
      'Shhh. It is listening. It is always listening.',
      'We wear hoods so that it cannot learn our faces.',
      'Climb, if you must. The gate does not open. It only waits.',
    ],
    stages: {
      2: ['That smell... goblin ale. The Eye hates their noise more than anything. Hurry, before the foam settles.'],
      3: ['It is no longer listening. I could take off my hood. ...Not yet. Soon.'],
    },
  },
  {
    id: 'ossian',
    kind: 'knight',
    name: 'Ser Ossian',
    path: [[-11, -103], [11, -103]],
    speed: 1.1,
    lines: [
      'Patrol. Turn. Patrol. Turn. The stones wear down. I do not.',
      'Look up if you like. Everyone does, once.',
    ],
    stages: {
      3: ['Patrol. Turn. Patrol... why am I patrolling? I could sit down. I could sit DOWN.'],
    },
  },
  {
    id: 'vane',
    kind: 'knight',
    name: 'Ser Vane, Captain of the Vigil',
    path: [[-2.6, -109.5]],
    facing: 0.25,
    lines: [
      'I am Vane, Captain of the Vigil. We watch the Eye, and the Eye watches us.',
      'The gate has not opened in a hundred years. Whatever is inside has not asked to leave.',
      'Go back down to the Tankard, pilgrim. Drink something warm. Forget the colour blue.',
    ],
    stages: {
      2: [
        'Goblin ale, at my gate. Of all the foolish... wait. The Stone.',
        'The old Vigil Stone, there in the middle of the court. They say a toast raised there once made the Eye look away. Try it, pilgrim.',
      ],
      3: ['The Vigil is over. My knights may finally take off their helmets.', 'Go down to the Tankard. Tell them Vane owes them a round.'],
    },
  },
  {
    id: 'cantor',
    kind: 'hooded',
    name: 'The Pale Cantor',
    path: [[2.6, -109.5]],
    facing: -0.25,
    lines: [
      '~ Oculus, oculus... dormi, dormi... ~',
      'It must never close. If it closes, it will dream. If it dreams, we will be the dream.',
      'Your eyes are very clear. Keep them that way.',
    ],
    stages: {
      3: ['~ Dormi, dormi... ~ It sleeps. And listen... it is dreaming of a tavern.'],
    },
  },
];

// The altar at the castle gate where the story ends.
export const VIGIL_STONE_INFO = {
  id: 'vigil-stone',
  name: 'The Vigil Stone',
  accent: '#8fb0ff',
  lines: ['An old altar-stone carved with a lidded eye. A hollow on top is worn smooth, as if a cup was set down here once, and raised.'],
  stages: {
    2: [
      'You set your feet, and raise the Toast of Courage to the sky.',
      'Far below, the goblins see it. A hundred voices roar at once: CHEERS!',
      'The Eye flinches. It shudders. And, slowly, it closes.',
    ],
    3: ['The Toast of Courage stands on the stone, foaming gently. Above, the Eye sleeps.'],
  },
};

// pose: cheer | toast | sit | dance | lean | keeper
export const GOBLINS = [
  {
    id: 'snaggle',
    name: 'Snaggle Grinmug',
    position: [24, 0.95, 4],
    rotation: -0.4,
    pose: 'cheer',
    onTable: true,
    lines: [
      'OI! OI! Another round for the tall pink one!',
      'Checkered hats! Proper motley, this is. We are the Tankard Fools, founded last Tuesday!',
      'The Eye can\'t see through a good head of foam. That\'s science, that is.',
    ],
    stages: {
      0: ['My bells! I ran up the causeway on a dare and the Eye LOOKED at me and my bells just fell off!', 'Talk to Grubnik at the bar. He\'s got a plan. He always has a plan. It\'s usually beer.'],
      1: ['Five bells, pilgrim! They rolled all the way up the causeway, right to the castle gate!', 'You\'ve found {bells} so far. Hat feels naked without \'em.'],
      ready: ['JINGLE! I can hear \'em in your pocket! Take \'em to Grubnik!'],
      2: ['Go on, go on! Raise it high! We\'ll all be watching from the tables!'],
      3: ['WE DID IT! The Eye is SHUT! I\'m never taking this hat off again!'],
    },
  },
  {
    id: 'nib',
    name: 'Nib Kettleback',
    position: [22.2, 0, 5.6],
    rotation: 2.3,
    pose: 'cheer',
    skin: '#6d9a36',
    tunic: '#6a2a1c',
    lines: ['*HIC* ...you want some? It\'s mostly ale. Mostly.', 'To the Eye! May it get something in it!'],
    stages: {
      3: ['To you! To the Eye! May it have nice dreams! *HIC*'],
    },
  },
  {
    id: 'wort',
    name: 'Wort the Loud',
    position: [29, 0.08, 15.6],
    rotation: Math.PI,
    pose: 'sit',
    skin: '#4f7d2a',
    tunic: '#5a4a1a',
    lines: ['WHAT? I SAID WHAT? OH! CHEERS!', 'I\'ve been sat on this stool since the bridge was new.'],
    stages: {
      2: ['WHEN YOU RAISE IT, WE\'LL ALL SHOUT! LIKE THIS! CHEEEERS!', 'Sorry. Practising.'],
      3: ['DID YOU HEAR US SHOUT? THEY HEARD US IN THE NEXT KINGDOM!'],
    },
  },
  {
    id: 'pip',
    name: 'Pip Jangleboots',
    position: [29, 0, 8],
    rotation: 0,
    pose: 'dance',
    skin: '#7aa33f',
    tunic: '#3a3a5a',
    lines: ['Dance with me! Left foot, right foot, jingle jingle!', 'The bells on the hat keep off ghosts. And tax collectors.'],
    stages: {
      1: ['Bells are important! Without bells, how do you know you\'re dancing?', 'Snaggle\'s are gold. Shiny. Look where the torches are.'],
      3: ['A victory jig! Left foot, right foot, jingle jingle, EYE SHUT!'],
    },
  },
  {
    id: 'grubnik',
    name: 'Grubnik Tapfoot, Keeper',
    position: [39.3, 0.6, 10], // on a crate behind the bar
    rotation: -Math.PI / 2,
    pose: 'keeper',
    skin: '#5a8a30',
    tunic: '#d8d0b8',
    lines: [
      'Welcome to the Grinning Tankard! Mind the teeth. They\'re decorative.',
      'House special: Bog Stout. Brewed with real bog.',
    ],
    stages: {
      0: [
        'Welcome to the Grinning Tankard! Mind the teeth. They\'re decorative.',
        'Trouble is, Snaggle ran up the causeway on a dare, and the Eye looked at him. He came back without his FIVE GOLDEN BELLS.',
        'No bells, no motley. No motley, no Toast. Find \'em on the causeway, and I\'ll pour you something legendary.',
        'Mind the Eye\'s blue searchlights up there. Keep to the torchlight when they come near.',
      ],
      1: ['{bells} of 5 bells so far, pilgrim. They\'ll be glinting somewhere between here and the castle gate.', 'House special while you wait: Bog Stout. Brewed with real bog.'],
      ready: [
        'THE BELLS! Hear that jingle? Snaggle, get your hat!',
        'Here. The Toast of Courage: the foamiest tankard ever poured. Pure, loud goblin cheer.',
        'Carry it up to the VIGIL STONE before the castle gate and raise it to the Eye. It can\'t abide a good time.',
        'But WALK. Run and the foam sloshes out, and a flat Toast is no Toast at all. And the Eye will be looking for you now.',
      ],
      spilled: [
        'FLAT?! You ran with it, didn\'t you. Or the Eye stared the head clean off it.',
        'Here, a fresh one. Walk, wait in the torchlight, and walk again. Foam is a delicate thing.',
      ],
      2: ['Don\'t spill it! Up the causeway, to the Vigil Stone by the gate. Raise it high!'],
      3: ['They\'ll sing about you in here for a hundred years. Well. Until Tuesday. CHEERS!', 'Drinks are on the house. Forever. Within reason.'],
    },
  },
  {
    id: 'mogg',
    name: 'Mogg',
    position: [21.2, 0, 18.4],
    rotation: Math.PI / 2 - 0.2,
    pose: 'toast',
    skin: '#608f2c',
    tunic: '#2e4a2a',
    lines: ['To us! To ale! To not being up THERE!', 'Brisket owes me three pints and a tooth.'],
    stages: {
      3: ['To the pilgrim! To ale! To being ANYWHERE we like!'],
    },
  },
  {
    id: 'brisket',
    name: 'Brisket',
    position: [23.2, 0, 18.4],
    rotation: -Math.PI / 2 - 0.2,
    pose: 'toast',
    skin: '#6f9a3a',
    tunic: '#6a3a1a',
    phase: 1.6,
    lines: ['Clink! Ha! Clink again! CLINK!', 'Mogg\'s lying about the tooth.'],
    stages: {
      3: ['CLINK! For the pilgrim! CLINK! For the Eye! CLINK! For... CLINK!'],
    },
  },
  {
    id: 'fennick',
    name: 'Old Fennick',
    position: [34.8, 0, -1.6],
    rotation: -0.6,
    pose: 'lean',
    skin: '#57803a',
    tunic: '#4a3a2a',
    lines: ['Them barrels is full of courage. The liquid kind.', 'Saw the Eye blink once. Whole causeway went quiet as fish.'],
    stages: {
      2: ['That\'s the real Toast, that is. Last time anyone carried one of those up there, I had hair.'],
      3: ['Hundred years I waited to see that Eye shut. Worth every barrel.'],
    },
  },
];
