import * as THREE from 'three';
import { getTexture } from './textures.js';
import { applyVertexJitter } from './vertexJitter.js';

// Every surface in the world comes from mat(), so every surface wobbles.
// Materials and geometries are cached: the same options return the same object.

const materials = new Map();

export function mat({ color = '#ffffff', map, type = 'lambert', emissive, emissiveIntensity = 1, shininess = 30, side, fog = true, transparent = false, opacity = 1 } = {}) {
  const key = JSON.stringify([color, map, type, emissive, emissiveIntensity, shininess, side, fog, transparent, opacity]);
  if (materials.has(key)) return materials.get(key);

  const params = { color, fog, transparent, opacity };
  if (map) params.map = getTexture(map);
  if (side === 'double') params.side = THREE.DoubleSide;
  let material;
  if (type === 'basic') {
    material = new THREE.MeshBasicMaterial(params);
  } else if (type === 'phong') {
    material = new THREE.MeshPhongMaterial({ ...params, shininess, specular: '#6a6a78', flatShading: true });
  } else {
    material = new THREE.MeshLambertMaterial({ ...params, flatShading: true });
  }
  if (emissive && type !== 'basic') {
    material.emissive = new THREE.Color(emissive);
    material.emissiveIntensity = emissiveIntensity;
  }
  applyVertexJitter(material);
  materials.set(key, material);
  return material;
}

// Glowing surfaces (flames, lit windows) ignore fog so they pierce the gloom.
export const glow = (color) => mat({ color, type: 'basic', fog: false });

const geometries = new Map();

// A box whose UVs are scaled to its real size, so a texture repeats every
// `tile` units on every face instead of stretching.
export function boxGeo(w, h, d, tile = 2) {
  const key = `box:${w}:${h}:${d}:${tile}`;
  if (geometries.has(key)) return geometries.get(key);
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // Face order: +x, -x, +y, -y, +z, -z; four vertices each.
  const spans = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  spans.forEach(([su, sv], face) => {
    for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, (uv.getX(i) * su) / tile, (uv.getY(i) * sv) / tile);
  });
  geometries.set(key, g);
  return g;
}

export function cached(key, make) {
  if (!geometries.has(key)) geometries.set(key, make());
  return geometries.get(key);
}

export const cylGeo = (rTop, rBottom, h, seg = 8) => cached(`cyl:${rTop}:${rBottom}:${h}:${seg}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, seg));
export const coneGeo = (r, h, seg = 4) => cached(`cone:${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg));
export const icoGeo = (r, detail = 0) => cached(`ico:${r}:${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
export const dodecaGeo = (r) => cached(`dodeca:${r}`, () => new THREE.DodecahedronGeometry(r, 0));

// A triangular prism lying along z: a gable roof `w` wide, `h` tall, `d` long.
export function roofGeo(w, h, d) {
  return cached(`roof:${w}:${h}:${d}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    return g;
  });
}

// Shorthand for the thousand boxes this world is made of.
export function Box({ size, m, tile = 2, ...props }) {
  return <mesh geometry={boxGeo(size[0], size[1], size[2], tile)} material={m} {...props} />;
}
