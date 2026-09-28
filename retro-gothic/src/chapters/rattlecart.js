import { unfinishedChapter } from '../game/quest.js';

// Rattlecart the carter and Mudbelly, the toad who pulls the cart. They take you
// from chapter to chapter once you've finished the one you're in.
const LINES = {
  // In the court the cart goes to whichever chapter you haven't finished yet.
  1: {
    verbFor: (state) => ({ 2: 'RIDE TO THE DROWNED FEN', 3: 'RIDE TO THE FROSTSPIRE' })[unfinishedChapter(state)] ?? null,
    stages: (state) =>
      ({
        2: [
          'Oi! The hero of the causeway! Name\'s Rattlecart, and this is Mudbelly. Don\'t touch his eyes.',
          'Mother Murk down in the Drowned Fen is in a right state. When the Eye shut, five stars fell into her bog, and the Drowned are sitting on \'em.',
          'Hop on! Mudbelly\'s quick in the wet. Next stop: the Drowned Fen!',
        ],
        3: ['Back for more? The Frostspire\'s still waiting on its sunrise. Hop on!'],
      })[unfinishedChapter(state)] ?? null,
    lines: ['Mudbelly and me are just resting our feet. All eight of \'em.'],
    morning: ['Home sweet home. Mudbelly\'s having a well-earned soak in the horse trough.', 'Get in there and have a drink. You\'ve earned a hundred of \'em.'],
  },
  2: {
    verbs: { 3: 'RIDE TO THE FROSTSPIRE' },
    stages: {
      3: [
        'Stars back up, Drowned asleep. Lovely work.',
        'Word from the mountain: the sun\'s not come up in a hundred years. The Frostspire hermit reckons you\'re the one to fix it.',
        'Wrap up warm! Next stop: the Frostspire!',
      ],
    },
    lines: [
      'Mudbelly\'s having a soak. He\'ll not budge till them stars are back in the sky.',
      'Mind the Drowned. They can\'t abide dry land, so stick to the boardwalks.',
    ],
  },
  3: {
    verbs: { 4: 'RIDE HOME TO THE TANKARD' },
    stages: {
      4: [
        'The SUN! Look at it! Mudbelly\'s never seen it before. He\'s crying. Or that\'s the thaw.',
        'The whole kingdom\'s heading for the Tankard. Hop on: home we go!',
      ],
    },
    lines: ['Too cold for toads up here. Mudbelly\'s sulking under a blanket.', 'Get that beacon lit and I\'ll take you home to the Tankard. There\'s a party waiting.'],
  },
};

export const rattlecart = (chapter, position, rotation) => ({
  id: 'rattlecart',
  name: 'Rattlecart, Carter',
  pose: 'lean',
  skin: '#6a9a3a',
  tunic: '#3a4a6a',
  position,
  rotation,
  ...LINES[chapter],
});
