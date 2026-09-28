import { PEAK } from './quest.js';

// Everyone you can talk to on the Frostspire. `stages` keys are the chapter's
// stages: 0 arrived, 1 climbing, 2 the braziers, 3 the summit, 4 done.

export const BRANNOC_INFO = {
  id: 'brannoc',
  name: 'Brannoc the Hermit',
  accent: '#ffb060',
  lines: ['Mind the cold. It\'s patient.'],
  stages: {
    [PEAK.ARRIVED]: [
      'Hm. A visitor, up here? You\'ll be the one who shut the Eye. And put the stars back. Busy.',
      'I\'m Brannoc. I keep the fire at the foot of the Frostspire. Have done for a hundred years, since the sun stopped coming up.',
      'At the top there\'s the Dawn Beacon. Every morning the monks lit it, and every morning the sun came up to see what the fuss was about. Then the Eye opened, and the monks turned to stone where they stood.',
      'Take this ember from my fire. Carry it up. Light the three Braziers of Dawn in the monastery, then the Beacon on the summit.',
      'The cold will kill you quicker than anything. Your WARMTH drains out there: light the old campfires as you climb and stand by them to thaw.',
      'And when the wind howls on the ledges, get DOWN (C, or SNEAK), or it\'ll throw you off the mountain.',
    ],
    [PEAK.CLIMB]: [
      'Campfires, wind, boulders. In that order. Stay warm, stay low, and when you hear the rumble in the chute, get into an alcove.',
      'The monks up top... don\'t take your eyes off them. They only move when nobody\'s looking.',
    ],
    [PEAK.BRAZIERS]: ['Keep your eyes on those monks, and light the braziers. They can\'t abide the flame.'],
    [PEAK.SUMMIT]: ['The gate\'s open? Then up you go. The Beacon\'s waiting.'],
    [PEAK.DONE]: [
      'The sun. THE SUN. I\'d forgotten it was yellow.',
      'Go on home, hero. Rattlecart\'s waiting, and I\'ve a hundred years of sunbathing to catch up on.',
    ],
  },
};

// The four frozen climbers of the Tankard Mountaineering Society.
const THAWED = {
  'climber-1': ['BRRRR! Pickaxe Pim, Tankard Mountaineering Society. We were going to plant a flag on the summit. The flag\'s a tankard.', 'See you at the bar!'],
  'climber-2': ['Belay Bogg! I hid in here from a boulder and then I sort of... froze. Thanks!', 'Wait for the rumble to pass, THEN run. That\'s the trick.'],
  'climber-3': ['Crampon Kez! Is it Tuesday? It feels like it should be Tuesday.', 'Did you see Sal? Sal went on ahead. Sal always goes on ahead.'],
  'climber-4': ['Summit Sal, at your service! Those stone monks crept up while I was admiring the view. Never look away, pilgrim. NEVER.', 'I\'ll meet you at the top. Or the bottom. Somewhere with a fire.'],
};

export function climberInfo(id, name) {
  return {
    id,
    name,
    verbFor: (state) => (state.peak.goblins.includes(id) ? null : 'CHIP THE ICE'),
    lines: THAWED[id],
    stages: (state) =>
      state.peak.goblins.includes(id)
        ? THAWED[id]
        : [
            `A goblin in a woolly hat is frozen solid in a block of ice, mid-climb, with a look of great surprise.`,
            'You chip at the ice with a rock. CRACK! It splits from top to bottom and falls away.',
            ...THAWED[id],
          ],
  };
}
