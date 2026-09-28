import { chapterStage } from '../game/quest.js';

// What pressing E / TALK does to whatever you're facing: "TALK TO GRUBNIK", "PET THE CAT".
// `verbFor` on the target can decide from the whole state; `verbs` is keyed by stage.
export const verbFor = (target, state) =>
  target.verbFor?.(state) ?? target.verbs?.[chapterStage(state)] ?? target.verb ?? `TALK TO ${target.name.split(',')[0].toUpperCase()}`;
