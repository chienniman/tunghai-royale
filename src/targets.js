import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { boxes, material } from './models.js';
import { ammoStack } from './items.js';

const DUMMY_HP = 100, SENTRY_HP = 160;
const SENTRY_RANGE = 58, SENTRY_DMG = 8, SENTRY_RESPAWN = 120, DUMMY_RESPAWN = 6;

const dummyGeo = () => boxes([
  { s: [0.09, 1.0, 0.09], p: [0, 0.5, 0], c: 0x5a4630 },
  { s: [0.5, 0.62, 0.2], p: [0, 1.14, 0], c: 0xc9a05a },
  { s: [0.3, 0.3, 0.06], p: [0, 1.2, -0.1], c: 0xb5322b },
  { s: [0.14, 0.14, 0.07], p: [0, 1.2, -0.1], c: 0xf0e6d0 },
  { s: [0.26, 0.28, 0.2], p: [0, 1.62, 0], c: 0xc9a05a },
  { s: [0.6, 0.08, 0.3], p: [0, 0.04, 0], c: 0x3d3d3d },
]);
const sentryBaseGeo = () => boxes([
  { s: [0.06, 0.95, 0.06], p: [0, 0.45, -0.3], c: 0x30343a, r: 0.35 },
  { s: [0.06, 0.95, 0.06], p: [0.26, 0.45, 0.15], c: 0x30343a, r: -0.2 },
  { s: [0.06, 0.95, 0.06], p: [-0.26, 0.45, 0.15], c: 0x30343a, r: -0.2 },
  { s: [0.2, 0.16, 0.2], p: [0, 0.92, 0], c: 0x24272b },
]);
const sentryHeadGeo = () => boxes([
  { s: [0.34, 0.26, 0.5], p: [0, 0.16, 0], c: 0x5b6470 },
  { s: [0.07, 0.07, 0.5], p: [0, 0.14, -0.48], c: 0x1c1d1f },
  { s: [0.2, 0.2, 0.3], p: [0.27, 0.12, 0.05], c: 0x7a6a3a },
  { s: [0.36, 0.05, 0.3], p: [0, 0.31, 0.02], c: 0x3d444d },
]);

// Things to shoot at until real opponents arrive (v0.3): knock-down practice
// dummies, and sentry guns that shoot back.
export class Targets {
  constructor(scene, terrain, world, loot, fx) {
    this.scene = scene; this.terrain = terrain; this.world = world; this.loot = loot; this.fx = fx;
    this.list = [];
    this.rng = mulberry32(4242);
    this.geo = { dummy: dummyGeo(), base: sentryBaseGeo(), head: sentryHeadGeo() };
    this.lensMat = new THREE.MeshBasicMaterial({ color: 0xff3020, fog: false });
    this.laserGeo = new THREE.BoxGeometry(0.02, 0.02, 1).translate(0, 0, 0.5);
    this.laserMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.stats = { dummies: 0, sentries: 0 };
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._n = new THREE.Vector3();
    this.onKill = null; // (target, dist) => void
  }

  _free(x, z, minGap) {
    if (!this.terrain.inBounds(x, z, 8)) return false;
    if (this.world.colliders.blocked(x, this.terrain.heightAt(x, z), z)) return false;
    for (const t of this.list) if (Math.hypot(t.x - x, t.z - z) < minGap) return false;
    return true;
  }

  addDummy(x, z, yaw = 0) {
    const p = { x, z }; this.world.colliders.resolve(p, 0.5);
    const g = new THREE.Mesh(this.geo.dummy, material());
    g.castShadow = true;
    const y = this.terrain.heightAt(p.x, p.z);
    g.position.set(p.x, y, p.z); g.rotation.order = 'YXZ'; g.rotation.y = yaw;
    this.scene.add(g);
    const t = { kind: 'dummy', name: '人形靶', x: p.x, y, z: p.z, hp: DUMMY_HP, maxHp: DUMMY_HP, alive: true, obj: g, timer: 0, fall: 0 };
    this.list.push(t); return t;
  }

  addSentry(x, z) {
    const p = { x, z }; this.world.colliders.resolve(p, 0.8);
    const y = this.terrain.heightAt(p.x, p.z);
    const g = new THREE.Group(); g.position.set(p.x, y, p.z);
    const base = new THREE.Mesh(this.geo.base, material()); base.castShadow = true; g.add(base);
    const head = new THREE.Group(); head.position.y = 1.0; head.rotation.order = 'YXZ'; g.add(head);
    const hm = new THREE.Mesh(this.geo.head, material()); hm.castShadow = true; head.add(hm);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), this.lensMat); lens.position.set(0, 0.2, -0.26); head.add(lens);
    const laser = new THREE.Mesh(this.laserGeo, this.laserMat); laser.visible = false; laser.frustumCulled = false; this.scene.add(laser);
    this.scene.add(g);
    const t = {
      kind: 'sentry', name: '哨戒機槍', x: p.x, y, z: p.z, hp: SENTRY_HP, maxHp: SENTRY_HP, alive: true, obj: g, head, lens, laser,
      yaw: this.rng() * 6.28, aware: 0, sees: false, losT: this.rng() * 0.2, burst: 3, cd: 1, timer: 0, scan: this.rng() < 0.5 ? 1 : -1,
    };
    head.rotation.y = t.yaw;
    this.list.push(t); return t;
  }

  // Practice range beside the spawn, dummies along campus roads, sentries guarding named buildings.
  placeAll(spawn, dirX, dirZ) {
    const px = -dirZ, pz = dirX; // perpendicular to the spawn's facing
    // [metres to the side, metres ahead] of the spawn point
    [[9, 3], [-9, 4], [12, 9], [-13, 11], [8, 15], [-7, 17]].forEach(([side, fwd]) => {
      this.addDummy(spawn.x + px * side + dirX * fwd, spawn.z + pz * side + dirZ * fwd, this.rng() * 6.28);
    });
    // spread a few along the side so there are targets at increasing range
    [22, 38, 60, 90].forEach((d, i) => {
      const s = i % 2 ? -1 : 1;
      const x = spawn.x + px * d * s - dirX * 4, z = spawn.z + pz * d * s - dirZ * 4;
      if (this._free(x, z, 4)) this.addDummy(x, z, Math.atan2(-(spawn.x - x), -(spawn.z - z)));
    });

    const roads = this.world.map.roads.filter((r) => r.p.length >= 4);
    let tries = 0, placed = 0;
    while (placed < 70 && tries++ < 3000) {
      const r = roads[Math.floor(this.rng() * roads.length)];
      const i = Math.floor(this.rng() * (r.p.length / 2 - 1)) * 2;
      const dx = r.p[i + 2] - r.p[i], dz = r.p[i + 3] - r.p[i + 1], l = Math.hypot(dx, dz);
      if (l < 1) continue;
      const k = this.rng(), s = this.rng() < 0.5 ? 3 : -3;
      const x = r.p[i] + dx * k + dz / l * s, z = r.p[i + 1] + dz * k - dx / l * s;
      if (!this.world.inCampus(x, z) || !this._free(x, z, 30)) continue;
      this.addDummy(x, z, this.rng() * 6.28); placed++;
    }

    const cands = this.world.named.filter((b) => this.world.inCampus(b.x, b.z) && Math.hypot(b.x - spawn.x, b.z - spawn.z) > 140);
    for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
    let sentries = 0;
    for (const b of cands) {
      if (sentries >= 26) break;
      if (this.list.some((t) => t.kind === 'sentry' && Math.hypot(t.x - b.x, t.z - b.z) < 110)) continue;
      const a0 = this.rng() * 6.28;
      search: for (let k = 0; k < 8; k++) {
        const a = a0 + k * Math.PI / 4;
        for (let d = b.r + 4; d < b.r + 40; d += 3) {
          const x = b.x + Math.cos(a) * d, z = b.z + Math.sin(a) * d;
          if (this._free(x, z, 6)) { this.addSentry(x, z).guard = b.name; sentries++; break search; }
        }
      }
    }
    return { dummies: this.list.length - sentries, sentries };
  }

  // Ray (unit direction) vs. targets. Returns { t, target, zone } or null.
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    let best = null, bt = maxT;
    const a = dx * dx + dz * dz;
    for (const tg of this.list) {
      if (!tg.alive) continue;
      const fx = ox - tg.x, fz = oz - tg.z;
      // quick reject: closest approach in the horizontal plane
      const along = -(fx * dx + fz * dz);
      if (along < -1 || along > bt * Math.sqrt(a) + 1) continue;
      const R = tg.kind === 'dummy' ? 0.3 : 0.42, H = tg.kind === 'dummy' ? 1.47 : 1.4;
      let t = -1, zone = 'body';
      if (a > 1e-9) {
        const b = fx * dx + fz * dz, c = fx * fx + fz * fz - R * R, disc = b * b - a * c;
        if (disc >= 0) {
          const t0 = (-b - Math.sqrt(disc)) / a, y = oy + dy * t0 - tg.y;
          if (t0 >= 0 && y >= 0 && y <= H) t = t0;
        }
      }
      if (tg.kind === 'dummy') { // head sphere
        const hy = oy - (tg.y + 1.62), b = fx * dx + hy * dy + fz * dz, c = fx * fx + hy * hy + fz * fz - 0.19 * 0.19, disc = b * b - c;
        if (disc >= 0) { const th = -b - Math.sqrt(disc); if (th >= 0 && (t < 0 || th < t)) { t = th; zone = 'head'; } }
      }
      if (t >= 0 && t < bt) { bt = t; best = { t, target: tg, zone }; }
    }
    return best;
  }

  damage(tg, amount, dist = 0) {
    if (!tg.alive) return false;
    tg.hp -= amount;
    if (tg.kind === 'sentry') tg.aware = Math.max(tg.aware, 0.5);
    if (tg.hp > 0) return false;
    tg.hp = 0; tg.alive = false;
    if (tg.kind === 'dummy') { tg.timer = DUMMY_RESPAWN; this.stats.dummies++; }
    else {
      tg.timer = SENTRY_RESPAWN; this.stats.sentries++;
      tg.laser.visible = false; tg.lens.visible = false; tg.head.rotation.x = -0.55;
      this._a.set(tg.x, tg.y + 1.1, tg.z);
      this.fx.impact(this._a, this._n.set(0, 1, 0), 'spark', 30);
      for (let i = 0; i < 4; i++) this.fx.puff(this._a, this._n, 'smoke');
      const drops = [ammoStack(['ammo_9mm', 'ammo_556', 'ammo_762', 'ammo_12g'][Math.floor(this.rng() * 4)], this.rng), ammoStack('ammo_556', this.rng)];
      const r = this.rng();
      drops.push(r < 0.35 ? { id: 'medkit', n: 1 } : r < 0.7 ? { id: 'milk', n: 2 } : r < 0.85 ? { id: 'vest2', n: 1, dur: 220 } : { id: 'helmet2', n: 1, dur: 150 });
      this.loot.scatter(drops, tg.x, tg.z, 1.3);
    }
    this.onKill?.(tg, dist);
    return true;
  }

  // Sentries currently tracking the player (for the minimap).
  alerted() { return this.list.filter((t) => t.kind === 'sentry' && t.alive && t.aware > 0.3); }

  update(dt, player) {
    const chestY = player.pos.y + (player.crouch ? 0.75 : 1.15);
    for (const tg of this.list) {
      const far = Math.abs(tg.x - player.pos.x) > 320 || Math.abs(tg.z - player.pos.z) > 320;
      tg.obj.visible = !far;
      if (tg.kind === 'dummy') {
        if (!tg.alive) {
          tg.timer -= dt;
          tg.fall = Math.min(1, tg.fall + dt * 5);
          if (tg.timer <= 0) { tg.alive = true; tg.hp = tg.maxHp; }
        } else tg.fall = Math.max(0, tg.fall - dt * 3);
        tg.obj.rotation.x = tg.fall * 1.45;
        continue;
      }
      // --- sentry ---
      if (!tg.alive) {
        tg.timer -= dt;
        if (tg.timer <= 0) { tg.alive = true; tg.hp = tg.maxHp; tg.aware = 0; tg.lens.visible = true; tg.head.rotation.x = 0; }
        continue;
      }
      const hx = tg.x, hy = tg.y + 1.2, hz = tg.z;
      const dx = player.pos.x - hx, dy = chestY - hy, dz = player.pos.z - hz;
      const dist = Math.hypot(dx, dy, dz);
      tg.losT -= dt;
      if (tg.losT <= 0) {
        tg.losT = 0.15;
        tg.sees = false;
        if (!player.dead && dist < SENTRY_RANGE && dist > 0.5) {
          const hit = this.world.raycast(hx, hy, hz, dx / dist, dy / dist, dz / dist, dist);
          tg.sees = !hit || hit.t > dist - 0.4;
        }
      }
      if (tg.sees) {
        tg.aware = Math.min(2, tg.aware + dt);
        const want = Math.atan2(-dx, -dz);
        let d = want - tg.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        const step = 2.6 * dt;
        tg.yaw += Math.abs(d) < step ? d : Math.sign(d) * step;
        tg.head.rotation.x = Math.atan2(dy, Math.hypot(dx, dz));
        // laser sight telegraphs that it is locking on
        this._a.set(hx, hy, hz); this._b.set(player.pos.x, chestY, player.pos.z);
        tg.laser.position.copy(this._a); tg.laser.lookAt(this._b); tg.laser.scale.set(1, 1, dist); tg.laser.visible = true;
        tg.cd -= dt;
        if (tg.aware > 0.9 && Math.abs(d) < 0.2 && tg.cd <= 0) {
          this._fire(tg, player, dist, chestY);
          tg.burst--;
          if (tg.burst <= 0) { tg.burst = 3; tg.cd = 1.3; } else tg.cd = 0.12;
        }
      } else {
        tg.aware = Math.max(0, tg.aware - dt * 0.6);
        tg.laser.visible = false;
        if (tg.aware <= 0) { tg.yaw += tg.scan * 0.5 * dt; tg.head.rotation.x = 0; tg.cd = Math.max(tg.cd, 0.4); }
      }
      tg.head.rotation.y = tg.yaw;
    }
  }

  _fire(tg, player, dist, chestY) {
    const from = this._a.set(tg.x - Math.sin(tg.yaw) * 0.7, tg.y + 1.15, tg.z - Math.cos(tg.yaw) * 0.7);
    this.fx.muzzle(from);
    let p = 0.62 - 0.44 * (dist / SENTRY_RANGE);
    if (Math.hypot(player.vel.x, player.vel.z) > 4.5) p *= 0.6;
    if (player.crouch) p *= 0.75;
    if (!player.onGround) p *= 0.7;
    const to = this._b.set(player.pos.x, chestY, player.pos.z);
    if (Math.random() < p) {
      const head = Math.random() < 0.12;
      if (head) to.y = player.headY;
      this.fx.tracer(from, to, 0.09);
      player.damage(head ? SENTRY_DMG * 1.7 : SENTRY_DMG, { zone: head ? 'head' : 'body', x: tg.x, z: tg.z, source: tg.name });
    } else {
      // near miss: aim off to one side and carry on into the world behind the player
      const a = Math.random() * 6.28, off = 0.6 + Math.random() * 1.1;
      to.x += Math.cos(a) * off; to.z += Math.sin(a) * off; to.y += (Math.random() - 0.4) * 0.8;
      const d = this._n.copy(to).sub(from).normalize();
      const hit = this.world.raycast(from.x, from.y, from.z, d.x, d.y, d.z, dist + 40);
      const t = hit ? hit.t : dist + 40;
      to.copy(from).addScaledVector(d, t);
      this.fx.tracer(from, to, 0.09);
      if (hit) { const n = new THREE.Vector3(hit.nx, hit.ny, hit.nz); this.fx.impact(to, n, hit.kind === 'ground' ? 'dirt' : 'stone', 5); }
    }
  }
}
