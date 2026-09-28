import { vigilRules } from './vigil/rules.js';

// Each chapter's per-frame rules (see vigil/rules.js for what they can do). The
// Vigil is always here; the other chapters register themselves when they load.
const rules = { 1: vigilRules };
export const registerRules = (n, chapterRules) => {
  rules[n] = chapterRules;
};
export const rulesFor = (n) => rules[n] ?? vigilRules;
