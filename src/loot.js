import { mulberry32, openRing, signedArea } from './util.js';
import { rollCluster } from './items.js';
import { makeLootObject } from './models.js';

const CELL = 16, SHOW_DIST = 110;

// Loot lying in the world. Items live in a spatial hash; only those near the
// player get a scene object, so thousands of items cost nothing to render.
export class Loot {
  constructor(scene, terrain, colliders) {
    this.scene = scene; this.terrain = terrain; this.colliders = colliders;
    this.grid = new Map();
    this.count = 0;
    this.visible = new Set();
    this._t = 1;
    this.rng = mulberry32(977);
  }

  _key(x, z) { return Math.floor(x / CELL) + ',' + Math.floor(z / CELL); }

  // Put a stack on the ground at (x,z). Returns the world item.
  add(stack, x, z) {
    const it = { ...stack, x, z, y: this.terrain.heightAt(x, z), obj: null };
    it.key = this._key(x, z);
    let c = this.grid.get(it.key); if (!c) this.grid.set(it.key, c = new Set());
    c.add(it); this.count++;
    this._t = 1; // refresh visibility soon
    return it;
  }

  remove(it) {
    const c = this.grid.get(it.key);
    if (!c || !c.delete(it)) return;
    this.count--;
    if (it.obj) { this.scene.remove(it.obj); it.obj = null; this.visible.delete(it); }
  }

  // Scatter stacks around a point, keeping them out of walls.
  scatter(stacks, x, z, radius = 0.9) {
    const out = [];
    stacks.forEach((s, i) => {
      const a = this.rng() * Math.PI * 2 + i * 2.4, r = stacks.length > 1 ? radius * (0.5 + this.rng() * 0.5) : this.rng() * 0.3;
      const p = { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r };
      this.colliders.resolve(p, 0.3);
      out.push(this.add(s, p.x, p.z));
    });
    return out;
  }

  // Items within r metres of (x,z), nearest first.
  nearby(x, z, r) {
    const out = [];
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) {
      for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
        const c = this.grid.get(i + ',' + j); if (!c) continue;
        for (const it of c) {
          const d = Math.hypot(it.x - x, it.z - z);
          if (d <= r) { it._d = d; out.push(it); }
        }
      }
    }
    return out.sort((a, b) => a._d - b._d);
  }

  // Deterministic world loot: clusters along the outside walls of every building.
  spawnWorld(map, rng = mulberry32(31337)) {
    let clusters = 0;
    for (const b of map.buildings) {
      let p = openRing(b.p);
      if (p.length < 6) continue;
      if (signedArea(p) < 0) { const q = []; for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); p = q; }
      if (signedArea(p) < 6) continue;
      const edges = []; let per = 0;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const len = Math.hypot(p[i] - p[j], p[i + 1] - p[j + 1]);
        per += len; if (len > 2.5) edges.push([p[j], p[j + 1], p[i], p[i + 1], len]);
      }
      if (!edges.length) continue;
      const n = Math.max(1, Math.min(4, Math.round(per / 45)));
      for (let k = 0; k < n; k++) {
        const [x0, z0, x1, z1, len] = edges[Math.floor(rng() * edges.length)];
        const t = 0.15 + rng() * 0.7, off = 1.3 + rng() * 0.8;
        const x = x0 + (x1 - x0) * t + (z1 - z0) / len * off, z = z0 + (z1 - z0) * t - (x1 - x0) / len * off;
        const stacks = rollCluster(rng); // roll first so the sequence does not depend on placement
        if (!this.terrain.inBounds(x, z, 6) || this.colliders.blocked(x, this.terrain.heightAt(x, z), z)) continue;
        this.scatter(stacks, x, z, 0.8);
        clusters++;
      }
    }
    return clusters;
  }

  update(dt, px, pz) {
    this._t += dt;
    if (this._t < 0.4) return;
    this._t = 0;
    const near = new Set(this.nearby(px, pz, SHOW_DIST));
    for (const it of this.visible) if (!near.has(it)) { this.scene.remove(it.obj); it.obj = null; this.visible.delete(it); }
    for (const it of near) {
      if (it.obj) continue;
      it.obj = makeLootObject(it.id);
      it.obj.position.set(it.x, it.y, it.z);
      it.obj.rotation.y = (it.x * 12.9898 + it.z * 78.233) % (Math.PI * 2);
      this.scene.add(it.obj);
      this.visible.add(it);
    }
  }

  // Gentle hover + spin for the items in view.
  animate(time) {
    for (const it of this.visible) {
      const m = it.obj.userData.model, ph = it.x * 1.7 + it.z * 2.3;
      m.position.y = m.userData.y0 ?? (m.userData.y0 = m.position.y);
      m.position.y += 0.035 * Math.sin(time * 2 + ph);
      m.rotation.y = time * 0.8 + ph;
    }
  }
}
