// What pressing E / TALK does to whatever you're facing: "TALK TO GRUBNIK", "PET THE CAT".
export const verbFor = (target, stage) => target.verbs?.[stage] ?? target.verb ?? `TALK TO ${target.name.split(',')[0].toUpperCase()}`;
