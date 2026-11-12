// Practice targets: plywood silhouettes that drop when "killed" and stand back up.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../util.js';

const HEAD = [-0.14, 1.47, -0.04, 0.14, 1.77, 0.04];
const BODY = [-0.26, 0.84, -0.04, 0.26, 1.47, 0.04];
const X_AXIS = new THREE.Vector3(1, 0, 0), Y_AXIS = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();

function colored(geo, color, x, y, z) {
  geo.translate(x, y, z);
  _c.set(color);
  const n = geo.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function targetGeometry() {
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const disc = (r, t) => new THREE.CylinderGeometry(r, r, t, 20).rotateX(Math.PI / 2);
  return mergeGeometries([
    colored(B(0.56, 0.05, 0.34), 0x3a3d40, 0, 0.025, 0),          // steel base
    colored(B(0.07, 0.82, 0.05), 0x6b4a2b, 0, 0.44, 0),           // post
    colored(B(0.52, 0.63, 0.035), 0xc9792b, 0, 1.155, 0),         // torso board
    colored(B(0.34, 0.1, 0.035), 0xc9792b, 0, 1.49, 0),           // shoulders
    colored(disc(0.14, 0.035), 0xc9792b, 0, 1.63, 0),             // head
    colored(disc(0.17, 0.04), 0xf0ead8, 0, 1.2, 0),               // white ring
    colored(disc(0.07, 0.046), 0xb02a2a, 0, 1.2, 0),              // bullseye
  ]);
}

function rayBox(ox, oy, oz, dx, dy, dz, b) {
  let t0 = 0, t1 = Infinity;
  for (let a = 0; a < 3; a++) {
    const o = a === 0 ? ox : a === 1 ? oy : oz, d = a === 0 ? dx : a === 1 ? dy : dz;
    const lo = b[a], hi = b[a + 3];
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; }
    let a0 = (lo - o) / d, a1 = (hi - o) / d;
    if (a0 > a1) { const s = a0; a0 = a1; a1 = s; }
    if (a0 > t0) t0 = a0; if (a1 < t1) t1 = a1;
    if (t0 > t1) return -1;
  }
  return t0;
}

export class Targets {
  constructor(scene, terrain, world, capacity = 96) {
    this.terrain = terrain; this.world = world;
    this.list = [];
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    this.mesh = new THREE.InstancedMesh(targetGeometry(), mat, capacity);
    this.mesh.count = 0; this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.capacity = capacity;
    scene.add(this.mesh);
    this.downed = 0;
  }

  _clear(x, z) {
    const col = this.world.colliders, y = this.terrain.heightAt(x, z) + 1;
    for (let a = 0; a < 8; a++) {
      const r = a < 4 ? 0.7 : 1.6, an = a * Math.PI / 2 + (a < 4 ? 0 : 0.78);
      if (col.blocked(x + Math.cos(an) * r, y, z + Math.sin(an) * r)) return false;
    }
    return !col.blocked(x, y, z);
  }

  add(x, z, yaw) {
    if (this.list.length >= this.capacity || !this.terrain.inBounds(x, z, 10) || !this._clear(x, z)) return null;
    const t = { i: this.list.length, x, z, y: this.terrain.heightAt(x, z), yaw, cos: Math.cos(yaw), sin: Math.sin(yaw),
      hp: 100, down: false, timer: 0, tilt: 0, tiltTo: 0, wob: 0, wobT: 0, dirty: true };
    this.list.push(t);
    this.mesh.count = this.list.length;
    return t;
  }

  // Scatter targets across open campus ground, away from each other.
  scatter(count, seed = 4471) {
    const rng = mulberry32(seed), t = this.terrain;
    let tries = 0;
    while (this.list.length < count && tries++ < count * 60) {
      const x = t.minX + 30 + rng() * (t.width - 60), z = t.minZ + 30 + rng() * (t.depth - 60);
      if (!this.world.inCampus(x, z)) continue;
      if (this.list.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < 45 * 45)) continue;
      // keep off steep slopes
      if (Math.abs(t.heightAt(x + 1, z) - t.heightAt(x - 1, z)) > 0.5 || Math.abs(t.heightAt(x, z + 1) - t.heightAt(x, z - 1)) > 0.5) continue;
      this.add(x, z, rng() * Math.PI * 2);
    }
    return this;
  }

  // o, d: THREE.Vector3. Returns { t, target, zone } for the nearest standing target hit, or null.
  raycast(o, d, maxT) {
    let best = null, bt = maxT;
    for (const tg of this.list) {
      if (tg.down) continue;
      const cx = tg.x - o.x, cy = tg.y + 1.2 - o.y, cz = tg.z - o.z;
      const along = cx * d.x + cy * d.y + cz * d.z;
      if (along < -1 || along > bt + 1) continue;
      if (cx * cx + cy * cy + cz * cz - along * along > 0.81) continue;
      // into the target's frame (undo yaw)
      const rx = o.x - tg.x, ry = o.y - tg.y, rz = o.z - tg.z;
      const ox = rx * tg.cos - rz * tg.sin, oz = rx * tg.sin + rz * tg.cos;
      const dx = d.x * tg.cos - d.z * tg.sin, dz = d.x * tg.sin + d.z * tg.cos;
      let zone = 'head', t = rayBox(ox, ry, oz, dx, d.y, dz, HEAD);
      const tb = rayBox(ox, ry, oz, dx, d.y, dz, BODY);
      if (tb >= 0 && (t < 0 || tb < t)) { t = tb; zone = 'body'; }
      if (t >= 0 && t < bt) { bt = t; best = { t, target: tg, zone, side: Math.sign(dz) || 1 }; }
    }
    return best;
  }

  // Returns true if this hit dropped the target.
  damage(hit, amount) {
    const tg = hit.target;
    if (tg.down) return false;
    tg.hp -= amount; tg.wob = 0.16 * hit.side; tg.wobT = 0; tg.dirty = true;
    if (tg.hp > 0) return false;
    tg.down = true; tg.timer = 7; tg.tiltTo = 1.5 * hit.side; this.downed++;
    return true;
  }

  update(dt) {
    let changed = false;
    for (const tg of this.list) {
      if (tg.down) {
        tg.timer -= dt;
        if (tg.timer <= 0) { tg.down = false; tg.hp = 100; tg.tiltTo = 0; }
      }
      const moving = Math.abs(tg.tilt - tg.tiltTo) > 0.001 || Math.abs(tg.wob) > 0.002;
      if (!moving && !tg.dirty) continue;
      tg.tilt += (tg.tiltTo - tg.tilt) * (1 - Math.exp(-(tg.down ? 14 : 6) * dt));
      tg.wobT += dt; tg.wob *= Math.exp(-7 * dt);
      const tilt = tg.tilt + (tg.down ? 0 : tg.wob * Math.cos(tg.wobT * 26));
      _q.setFromAxisAngle(Y_AXIS, tg.yaw).multiply(_q2.setFromAxisAngle(X_AXIS, tilt));
      _m.compose(_p.set(tg.x, tg.y, tg.z), _q, _s);
      this.mesh.setMatrixAt(tg.i, _m);
      tg.dirty = false; changed = true;
    }
    if (changed) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
