// A tiny construction kit: add coloured primitives, then merge them into one mesh per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _c = new THREE.Color();

// World-scale texture projection so bricks and slates keep their size on any shape
const TEX_SCALE = { stone: 3.2, roof: 2.4, thatch: 3, wood: 2.2, plain: 3, cloth: 1.2, terrain: 7, skin: 0.35, velvet: 0.9, lace: 0.25, hide: 0.5, bark: 1.6 };
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();

export class Kit {
  constructor(materials) {
    this.mats = materials;
    this.parts = {};
  }

  // opts: { x,y,z, rx,ry,rz, sx,sy,sz, color, emissive(multiplier) }
  add(kind, geo, color, o = {}) {
    const g = geo;
    if (o.dir) { _d.set(o.dir[0], o.dir[1], o.dir[2]).normalize(); _q.setFromUnitVectors(_up, _d); }
    else { _e.set(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'XYZ'); _q.setFromEuler(_e); }
    _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    _p.set(o.x || 0, o.y || 0, o.z || 0);
    _m.compose(_p, _q, _s);
    if (o.pre) g.applyMatrix4(o.pre);
    g.applyMatrix4(_m);
    if (o.parent) g.applyMatrix4(o.parent);
    _c.set(color);
    const k = o.bright ?? 1;
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const shade = o.shadeY;
    for (let i = 0; i < n; i++) {
      let f = k;
      if (shade) { const y = g.attributes.position.getY(i); f *= 1 + shade * (y - (o.y || 0)); }
      if (o.vcol) f *= o.vcol[i];
      col[i * 3] = _c.r * f; col[i * 3 + 1] = _c.g * f; col[i * 3 + 2] = _c.b * f;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(key)) g.deleteAttribute(key);
    const geom = g.index ? g.toNonIndexed() : g;
    (this.parts[kind] ||= []).push(geom);
    return geom;
  }

  box(kind, w, h, d, color, o = {}) { return this.add(kind, new THREE.BoxGeometry(w, h, d), color, o); }
  cyl(kind, rt, rb, h, seg, color, o = {}) { return this.add(kind, new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open), color, o); }
  cone(kind, r, h, seg, color, o = {}) { return this.add(kind, new THREE.ConeGeometry(r, h, seg, 1, !!o.open), color, o); }
  sphere(kind, r, color, o = {}) { return this.add(kind, new THREE.SphereGeometry(r, o.ws || 10, o.hs || 8), color, o); }
  lathe(kind, pts, seg, color, o = {}) { return this.add(kind, new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, o.phi0 || 0, o.phiLen || Math.PI * 2), color, o); }
  // A cylinder running from point a to point b
  limb(kind, a, b, r0, r1, color, o = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
    return this.add(kind, new THREE.CylinderGeometry(r1, r0, len, o.seg || 12, 1, !!o.open), color, { ...o, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, dir: [dx, dy, dz] });
  }

  // Merge into meshes. Returns a Group.
  build({ shadows = true, project = true } = {}) {
    const group = new THREE.Group();
    for (const kind of Object.keys(this.parts)) {
      const geos = this.parts[kind];
      if (!geos.length) continue;
      const g = mergeGeometries(geos, false);
      if (project && TEX_SCALE[kind]) projectUV(g, TEX_SCALE[kind]);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.mats[kind]);
      if (shadows && kind !== 'glow' && kind !== 'ghost') { mesh.castShadow = true; mesh.receiveShadow = true; }
      mesh.userData.kind = kind;
      group.add(mesh);
    }
    this.parts = {};
    return group;
  }
}

function projectUV(g, scale) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ny > nx && ny > nz) uv.setXY(i, x / scale, z / scale);
    else if (nx > nz) uv.setXY(i, z / scale, y / scale);
    else uv.setXY(i, x / scale, y / scale);
  }
  uv.needsUpdate = true;
}
