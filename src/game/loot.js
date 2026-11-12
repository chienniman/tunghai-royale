// Ground loot: generated around every building, drawn with instancing near the player only.
import * as THREE from 'three';
import { mulberry32, pick } from '../util.js';
import { Colliders } from '../world/colliders.js';
import { ITEMS, WEAPONS, defaultCount } from './items.js';

const CELL = 16, VIEW = 110, CAP = 192;
const key = (cx, cz) => (cx + 2048) * 4096 + (cz + 2048);

const WEAPON_W = [['pistol', 26], ['smg', 22], ['ar', 24], ['shotgun', 17], ['sniper', 8]];
const AMMO_W = [['ammo_9mm', 34], ['ammo_556', 30], ['ammo_12g', 16], ['ammo_762', 12]];
const HEAL_W = [['bandage', 50], ['drink', 30], ['medkit', 14]];

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qy = new THREE.Quaternion();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Vector3();

export class Loot {
  constructor(scene, terrain, world) {
    this.terrain = terrain; this.world = world;
    this.grid = new Map();
    this.count = 0;
    this.rng = mulberry32(73129);
    this.group = new THREE.Group(); scene.add(this.group);
    this.meshes = {};
    for (const id in ITEMS) {
      const it = ITEMS[id];
      const m = new THREE.InstancedMesh(it.world, it.material, CAP);
      m.count = 0; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      this.group.add(m); this.meshes[id] = m;
    }
    this.cx = 1e9; this.cz = 1e9; this.dirty = true;
  }

  add(id, x, z, props = {}) {
    const item = {
      id, x, z, y: this.terrain.heightAt(x, z),
      rot: props.rot ?? this.rng() * Math.PI * 2,
      count: props.count ?? defaultCount(id),
      loaded: props.loaded ?? 0,
    };
    item.cell = key(Math.floor(x / CELL), Math.floor(z / CELL));
    let a = this.grid.get(item.cell); if (!a) this.grid.set(item.cell, a = []);
    a.push(item);
    this.count++; this.dirty = true;
    return item;
  }

  take(item) {
    const a = this.grid.get(item.cell); if (!a) return false;
    const i = a.indexOf(item); if (i < 0) return false;
    a.splice(i, 1); this.count--; this.dirty = true;
    return true;
  }

  // Put several items down around a point (first one in the middle).
  spot(x, z, ids) {
    const a0 = this.rng() * Math.PI * 2;
    ids.forEach((id, i) => {
      if (i === 0) return this.add(id, x, z);
      const a = a0 + i * 2.1, r = 0.5 + this.rng() * 0.25;
      this.add(id, x + Math.cos(a) * r, z + Math.sin(a) * r);
    });
  }

  generate() {
    const { terrain, world, rng } = this;
    const col = world.colliders;
    let spots = 0;
    for (const s of col.shapes) {
      if (s.kind !== 'poly') continue;
      const pts = s.pts, n = pts.length / 2;
      const lens = []; let per = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const l = Math.hypot(pts[j * 2] - pts[i * 2], pts[j * 2 + 1] - pts[i * 2 + 1]);
        lens.push(l); per += l;
      }
      const campus = world.inCampus((s.minX + s.maxX) / 2, (s.minZ + s.maxZ) / 2);
      const want = campus ? Math.max(1, Math.min(6, Math.round(per / 42))) : (rng() < 0.45 ? 1 : 0);
      for (let k = 0; k < want; k++) {
        // random point along the outline, a little way out from the wall
        let d = rng() * per, i = 0;
        while (i < n - 1 && d > lens[i]) { d -= lens[i]; i++; }
        if (lens[i] < 1.5) continue;
        const j = (i + 1) % n, t = 0.15 + 0.7 * (d / lens[i]);
        const ax = pts[i * 2], az = pts[i * 2 + 1], ex = pts[j * 2] - ax, ez = pts[j * 2 + 1] - az;
        let nx = ez / lens[i], nz = -ex / lens[i];
        const off = 1.1 + rng() * 1.3;
        let x = ax + ex * t + nx * off, z = az + ez * t + nz * off;
        if (Colliders.pointInPoly(pts, x, z)) { x -= 2 * nx * off; z -= 2 * nz * off; }
        if (!terrain.inBounds(x, z, 8)) continue;
        const y = terrain.heightAt(x, z) + 0.5;
        if (col.blocked(x, y, z) || col.blocked(x + 0.6, y, z) || col.blocked(x - 0.6, y, z) || col.blocked(x, y, z + 0.6) || col.blocked(x, y, z - 0.6)) continue;
        this._roll(x, z);
        spots++;
      }
    }
    this.spots = spots;
    return this;
  }

  _roll(x, z) {
    const rng = this.rng, r = rng();
    if (r < 0.36) {
      const w = pick(rng(), WEAPON_W), ammo = 'ammo_' + WEAPONS[w].ammo;
      this.spot(x, z, rng() < 0.6 ? [w, ammo, ammo] : [w, ammo]);
    } else if (r < 0.66) {
      const a = pick(rng(), AMMO_W);
      this.spot(x, z, rng() < 0.45 ? [a, pick(rng(), AMMO_W)] : [a]);
    } else {
      const h = pick(rng(), HEAL_W);
      this.spot(x, z, rng() < 0.4 ? [h, pick(rng(), HEAL_W)] : [h]);
    }
  }

  // Closest item the player can reach; items they are facing win ties.
  nearest(pos, yaw, reach = 1.9) {
    const cx = Math.floor(pos.x / CELL), cz = Math.floor(pos.z / CELL);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let best = null, bs = Infinity;
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
      const a = this.grid.get(key(i, j)); if (!a) continue;
      for (const it of a) {
        const dx = it.x - pos.x, dz = it.z - pos.z, d = Math.hypot(dx, dz);
        if (d > reach || Math.abs(it.y - pos.y) > 1.6) continue;
        const score = d - 0.9 * (d > 0.05 ? (dx * fx + dz * fz) / d : 1);
        if (score < bs) { bs = score; best = it; }
      }
    }
    return best;
  }

  // Rebuild the instance buffers when the player has moved or the loot changed.
  update(pos) {
    if (!this.dirty && Math.abs(pos.x - this.cx) < 10 && Math.abs(pos.z - this.cz) < 10) return;
    this.cx = pos.x; this.cz = pos.z; this.dirty = false;
    const counts = {}; for (const id in this.meshes) counts[id] = 0;
    const t = this.terrain, e = 0.6, R2 = VIEW * VIEW;
    const c0x = Math.floor((pos.x - VIEW) / CELL), c1x = Math.floor((pos.x + VIEW) / CELL);
    const c0z = Math.floor((pos.z - VIEW) / CELL), c1z = Math.floor((pos.z + VIEW) / CELL);
    for (let i = c0x; i <= c1x; i++) for (let j = c0z; j <= c1z; j++) {
      const a = this.grid.get(key(i, j)); if (!a) continue;
      for (const it of a) {
        if ((it.x - pos.x) ** 2 + (it.z - pos.z) ** 2 > R2 || counts[it.id] >= CAP) continue;
        _n.set(t.heightAt(it.x - e, it.z) - t.heightAt(it.x + e, it.z), 2 * e, t.heightAt(it.x, it.z - e) - t.heightAt(it.x, it.z + e)).normalize();
        _q.setFromUnitVectors(UP, _n).multiply(_qy.setFromAxisAngle(UP, it.rot));
        const sc = ITEMS[it.id].scale;
        _m.compose(_p.set(it.x, it.y + 0.012, it.z), _q, _s.set(sc, sc, sc));
        this.meshes[it.id].setMatrixAt(counts[it.id]++, _m);
      }
    }
    for (const id in this.meshes) {
      const m = this.meshes[id];
      m.count = counts[id]; m.instanceMatrix.needsUpdate = true;
    }
  }
}
