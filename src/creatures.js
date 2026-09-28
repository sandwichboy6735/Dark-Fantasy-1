// Old Mossback: a hill-sized turtle, furred in moss, carrying a lantern-lit house on its shell.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { sculpt, eye } from './sculpt.js';
import { house } from './town.js';

export function buildTurtle(mats) {
  const root = new THREE.Group();
  const k = new Kit(mats);
  let sd = 77; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  // mossy shell
  const shell = sculpt({
    r: 7, scale: [1, 0.62, 1.15], wrinkle: 0.06, warts: 90, seed: 13, detail: 96,
    feats: [{ d: [0, 1, 0], a: 0.08, w: [0.5, 0.4, 0.5] }, { d: [0, -1, 0], a: -0.3, w: [0.9, 0.4, 0.9] }],
  });
  k.add('velvet', shell.geo, '#3a5226', { y: 4.2, vcol: shell.vcol });
  // hanging moss curtains around the rim
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2 + rr() * 0.03;
    const rx = Math.cos(a) * 6.9, rz = Math.sin(a) * 8.0;
    const L = 1 + rr() * 2.4;
    k.cone('velvet', 0.18 + rr() * 0.15, L, 5, ['#4a6a30', '#3a5a26', '#5a7a3a'][i % 3], { x: rx, y: 4.0 - L / 2, z: rz, rx: Math.PI, bright: 0.8 + rr() * 0.4 });
  }
  // belly
  k.sphere('hide', 6.4, '#2a2a20', { y: 3.6, sy: 0.35, sz: 1.15, ws: 24, hs: 12 });
  // neck and wrinkled head
  k.limb('hide', [0, 3.4, 6.5], [0, 5.2, 10.2], 1.6, 1.15, '#34362a', { seg: 20 });
  for (let i = 0; i < 8; i++) { const t = i / 7; k.add('hide', new THREE.TorusGeometry(1.5 - t * 0.35, 0.12, 6, 20), '#2a2c22', { x: 0, y: 3.4 + t * 1.8, z: 6.5 + t * 3.7, rx: -0.45 }); }
  const hd = sculpt({
    r: 1.55, scale: [1, 0.85, 1.35], wrinkle: 0.07, warts: 40, seed: 21, detail: 64,
    feats: [{ d: [0, 0.35, 0.9], a: 0.18, w: [0.6, 0.15, 0.3] }, { d: [0, -0.35, 0.95], a: -0.12, w: [0.8, 0.05, 0.4] }, { d: [0.45, 0.2, 0.85], a: -0.12, w: [0.15, 0.12, 0.2] }, { d: [-0.45, 0.2, 0.85], a: -0.12, w: [0.15, 0.12, 0.2] }],
  });
  k.add('hide', hd.geo, '#3a3c2e', { y: 5.6, z: 11.2, vcol: hd.vcol });
  for (const sx of [-1, 1]) {
    const p = hd.surf(sx * 0.45, 0.2, 0.85, -0.08);
    eye(k, [p[0], 5.6 + p[1], 11.2 + p[2]], 0.2, '#b04018', '#3a3c2e', 0.42, [sx * 0.4, 0, 1]);
  }
  // little pines growing on the shell
  for (const [x, z, s] of [[-3.5, 1, 1], [-2.5, -3.5, 0.8], [3.2, -2.5, 0.9], [2.8, 3.2, 0.7]]) {
    const y = 4.2 + shell.surf(x / 7, 0.6, z / 8)[1] - 0.4;
    k.cyl('wood', 0.08, 0.14, 1.6 * s, 6, '#3a2c24', { x, y: y + 0.8 * s, z });
    for (let i = 0; i < 5; i++) k.cone('plain', (1.0 - i * 0.16) * s, 1.3 * s, 9, '#1c3a2e', { x, y: y + (1.2 + i * 0.75) * s, z, ry: i });
  }
  // the house on top: pass a flat 'ground' at the shell's crown
  const topY = 4.2 + 7 * 0.62 * 1.08 - 0.5;
  const fakeT = { heightAt: () => topY };
  const fakeW = { lights: [], chimneys: [], box() {}, noTrees() {}, circle() {} };
  house(k, fakeW, fakeT, 0.4, -0.6, 0, { seed: 42, w: 5.2, d: 4.6, floors: 1 });
  for (const [x, z] of [[-3.2, 2.2], [3.2, 2.2], [-3.2, -3.2], [3.2, -3.2]]) {
    k.cyl('metal', 0.03, 0.03, 0.5, 4, '#2a2622', { x, y: topY + 3.1, z });
    k.box('glow', 0.35, 0.5, 0.35, '#ffa840', { x, y: topY + 2.6, z, bright: 2.4 });
  }
  root.add(k.build());
  // four stumpy, scaly legs on pivots so they can walk
  const legs = [];
  for (const [x, z] of [[-5.2, 4.8], [5.2, 4.8], [-5.2, -5], [5.2, -5]]) {
    const lk = new Kit(mats);
    lk.limb('hide', [0, 0, 0], [x > 0 ? 0.6 : -0.6, -3.6, 0.4], 1.6, 1.3, '#34362a', { seg: 16 });
    for (let i = 0; i < 4; i++) lk.cone('enamel', 0.18, 0.5, 6, '#2a241c', { x: (x > 0 ? 0.6 : -0.6) + (i - 1.5) * 0.35, y: -3.7, z: 1.5, rx: Math.PI / 2 });
    for (let i = 0; i < 18; i++) lk.sphere('hide', 0.28 + rr() * 0.2, '#2e3026', { x: (rr() - 0.5) * 2.2, y: -rr() * 3.2, z: (rr() - 0.3) * 2, ws: 6, hs: 5 });
    const leg = lk.build();
    const piv = new THREE.Group(); piv.position.set(x, 3.7, z); piv.add(leg);
    root.add(piv); legs.push(piv);
  }
  root.scale.setScalar(1.15);
  root.userData = { height: 16, radius: 10, headY: 6.4, headZ: 12.8, legs };
  return root;
}
