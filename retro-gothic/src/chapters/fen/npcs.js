import { FEN, fenKey } from './quest.js';

// Everyone and everything you can talk to in the Drowned Fen. `stages` keys are
// the chapter's stages (see quest.js): 0 arrived, 1 stars, 'ready' all five
// found, 2 the flood, 3 done.

export const MURK_INFO = {
  id: 'murk',
  name: 'Mother Murk, Bog Witch',
  accent: '#b8ff6a',
  lines: ['Hehh. Still here, dearie? The fen likes you. That\'s not a compliment.'],
  stages: {
    0: [
      'Hehh! A visitor! And not drowned yet. I\'m Mother Murk. This is my fen. Mind the water: it bites.',
      'When your Eye shut, the stars it stole flew home. All but FIVE. They fell into my fen, and the Drowned are sitting on them like eggs.',
      'Fetch me those five stars, and set them in the Star Font in the old chapel, north. The sky will have them back.',
      'Keep to the boardwalks. Wade, and the Drowned hear you splash. They come up out of the mud for anyone in the water.',
      'Light my witch-lights as you go: no Drowned will come near one. And take these goblin bangers. A bang in the water draws them off.',
    ],
    1: [
      '{stars} of 5 stars so far. Keep to the boards, dearie.',
      'The Drowned can\'t leave the water. On land or on the boards, you\'re safe as houses. Soggy houses.',
      'Crouch when you wade: slow and quiet, and they\'ll not hear you unless you\'re right on top of them. Need bangers? Every chat with me tops you up.',
    ],
    ready: [
      'All five! I can hear them humming from here. To the chapel, to the font!',
      'But when the stars wake the font... well. The Drowned have a queen. When the water starts to rise, you CLIMB. The bell tower, right to the top.',
    ],
    2: ['CLIMB, you daft thing! The tower! The tower!'],
    3: [
      'Look at them up there. Five little stars, home again. The Drowned are sleeping sound. First time in a hundred years.',
      'Go on. Rattlecart\'s waiting. Tell the sun I said hello, if you ever find it.',
    ],
  },
};

export const FONT_INFO = {
  id: 'star-font',
  name: 'The Star Font',
  accent: '#fff0a0',
  range: 5,
  verb: 'LOOK AT THE STAR FONT',
  verbFor: (state) => (fenKey(state) === 'ready' ? 'SET THE STARS IN THE FONT' : null),
  lines: ['A stone font carved with five star-shaped hollows. Black water lies still in its bowl. It is waiting for something bright.'],
  stages: {
    ready: [
      'You set the five stars in their hollows, one by one. They hum, then they SING.',
      'The water in the font boils with light. Deep under the fen, something enormous opens its eyes.',
      'The Drowned Queen is waking, and the fen is rising with her. The only way out is UP: climb the bell tower!',
    ],
    [FEN.FLOOD]: ['The font blazes. The water is rising. CLIMB!'],
    [FEN.DONE]: ['The font is dry and warm now, like a hearth after the fire has gone out.'],
  },
};

export const TOAD_LINES = [
  'You kiss the toad.',
  'It remains a toad. It seems pleased, though.',
];
