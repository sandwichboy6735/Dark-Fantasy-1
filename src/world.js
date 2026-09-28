// Everything the player can bump into, stand on, or be lifted by, plus light and smoke sources.
const CELL = 24;

export class World {
  constructor(terrain) {
    this.t = terrain;
    this.grid = new Map();
    this.platforms = [];
    this.lights = [];     // { x, y, z, color, intensity, range }
    this.chimneys = [];   // { x, y, z }
    this.exclude = [];    // [x, z, r] no trees here
    this.anim = [];       // functions (t, dt) => void
    this.wells = [];      // updrafts
    this.talkers = [];    // NPCs (for collision + interaction)
  }

  _cells(minx, minz, maxx, maxz, fn) {
    for (let cz = Math.floor(minz / CELL); cz <= Math.floor(maxz / CELL); cz++)
      for (let cx = Math.floor(minx / CELL); cx <= Math.floor(maxx / CELL); cx++) fn(cx + ',' + cz);
  }
  _insert(c, minx, minz, maxx, maxz) {
    this._cells(minx, minz, maxx, maxz, (k) => { let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(c); });
  }

  circle(x, z, r, y0 = -1e9, y1 = 1e9) { this._insert({ t: 0, x, z, r, y0, y1 }, x - r, z - r, x + r, z + r); }
  // Oriented box: centre, half-width (local x), half-depth (local z), rotation about y
  box(x, z, hw, hd, rot, y0 = -1e9, y1 = 1e9) {
    const R = Math.hypot(hw, hd);
    this._insert({ t: 1, x, z, hw, hd, c: Math.cos(rot), s: Math.sin(rot), y0, y1 }, x - R, z - R, x + R, z + R);
  }
  // Wall segment between two points
  wall(x1, z1, x2, z2, thick, y0, y1) {
    const len = Math.hypot(x2 - x1, z2 - z1), rot = Math.atan2(-(z2 - z1), x2 - x1);
    this.box((x1 + x2) / 2, (z1 + z2) / 2, len / 2, thick / 2, rot, y0, y1);
  }
  platform(p) { this.platforms.push(p); } // { x, z, r, top: () => y }
  noTrees(x, z, r) { this.exclude.push([x, z, r]); }

  treeFree(x, z) {
    for (const [ex, ez, er] of this.exclude) if ((x - ex) ** 2 + (z - ez) ** 2 < er * er) return false;
    return true;
  }

  groundAt(x, z, y = 1e9) {
    let g = this.t.heightAt(x, z);
    for (const p of this.platforms) {
      const dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz > p.r * p.r) continue;
      const top = p.top();
      if (top <= y + 1.2 && top > g) g = top;
    }
    return g;
  }

  // Is this point inside a building-sized collider? (Used to keep the camera out of walls.)
  pointBlocked(x, y, z, minR = 1) {
    const list = this.grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
    if (!list) return false;
    for (const c of list) {
      if (y < c.y0 || y > c.y1) continue;
      if (c.t === 0) { if (c.r >= minR && (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.3) ** 2) return true; }
      else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
        if (Math.abs(lx) < c.hw + 0.3 && Math.abs(lz) < c.hd + 0.3) return true;
      }
    }
    return false;
  }

  // Push a vertical cylinder (radius r, from y to y+h) out of colliders. Mutates pos.
  collide(pos, r, h) {
    const k = Math.floor(pos.x / CELL) + ',' + Math.floor(pos.z / CELL);
    const list = this.grid.get(k);
    let hit = false;
    if (list) for (const c of list) {
      if (pos.y + h < c.y0 || pos.y > c.y1) continue;
      if (c.t === 0) {
        const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if (d < m && d > 1e-6) { pos.x = c.x + dx / d * m; pos.z = c.z + dz / d * m; hit = true; }
      } else {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
        const ox = c.hw + r - Math.abs(lx), oz = c.hd + r - Math.abs(lz);
        if (ox > 0 && oz > 0) {
          let nx = lx, nz = lz;
          if (ox < oz) nx = Math.sign(lx) * (c.hw + r); else nz = Math.sign(lz) * (c.hd + r);
          pos.x = c.x + nx * c.c + nz * c.s; pos.z = c.z - nx * c.s + nz * c.c; hit = true;
        }
      }
    }
    for (const n of this.talkers) {
      const dx = pos.x - n.pos.x, dz = pos.z - n.pos.z;
      if (Math.abs(pos.y - n.pos.y) > 2.5) continue;
      const d = Math.hypot(dx, dz), m = n.radius + r;
      if (d < m && d > 1e-6) { pos.x = n.pos.x + dx / d * m; pos.z = n.pos.z + dz / d * m; }
    }
    return hit;
  }
}
