import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { faceTexture } from './face.js';
import { sway, robe, white, uTime } from './ghosts.js';
import { ammoStack } from './items.js';

const clamp = THREE.MathUtils.clamp;
const MAX = { jiangshi: 3, hanged: 2, girl: 1 };

// Each of these follows one rule, and each rule has an answer:
//   殭屍       blind, hunts by sound. Running and gunfire bring it hopping; creep or stand still and it loses you.
//   吊死鬼     hangs in the trees and drops on whoever walks underneath. Look up, or shoot it off you.
//   紅衣小女孩  runs ahead giggling. Catch her and you are led away to somewhere else entirely. Don't follow.

const M = (mats, m, base = 1) => { m.transparent = true; m.userData.base = base; mats.push(m); return m; };

// 殭屍: stiff corpse in a Qing official's robe, arms locked straight out, paper talisman over the face.
function makeJiangshi() {
  const root = new THREE.Group(), body = new THREE.Group(), mats = []; root.add(body);
  const robeM = M(mats, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, color: 0x161b30 }));
  const trim = M(mats, new THREE.MeshStandardMaterial({ color: 0x4a1210, roughness: 0.9 }));
  const skin = M(mats, new THREE.MeshStandardMaterial({ color: 0x74856e, roughness: 0.9 }));
  const black = M(mats, new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.7 }));
  const face = faceTexture('scream', { skin: '#8d9c86', seed: 11, bruise: 'rgba(20,40,30,A)' });
  const faceM = M(mats, new THREE.MeshStandardMaterial({ map: face, color: 0x8a8a8a, roughness: 0.95, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.06 }));
  const paper = (() => { // 符: yellow paper, vermilion scrawl
    const c = document.createElement('canvas'); c.width = 64; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#d9b93a'; x.fillRect(0, 0, 64, 160); x.strokeStyle = '#a3170f'; x.lineWidth = 4; x.lineCap = 'round';
    x.strokeRect(6, 6, 52, 148);
    x.beginPath(); x.moveTo(32, 16); x.lineTo(32, 60); x.moveTo(16, 30); x.lineTo(48, 30); x.moveTo(18, 48); x.bezierCurveTo(30, 70, 50, 60, 44, 86);
    x.bezierCurveTo(36, 110, 14, 96, 24, 122); x.lineTo(46, 140); x.moveTo(14, 76); x.lineTo(50, 76); x.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  body.add(new THREE.Mesh(robe([[0.3, 0.06], [0.27, 0.4], [0.23, 0.8], [0.22, 1.1], [0.25, 1.3], [0.24, 1.42], [0.13, 1.5], [0.07, 1.54]], 20, { fadeTo: [-1, -0.5], ragged: 0.1, grime: true, flat: 0.62 }), robeM));
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.07, 18).scale(1, 1, 0.62), trim); belt.position.y = 1.0; body.add(belt);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), trim); chest.position.set(0, 1.26, -0.152); body.add(chest); // rank badge
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.2, 1.4, -0.02); arm.rotation.x = 1.5; body.add(arm);
    arm.add(new THREE.Mesh(white(new THREE.CylinderGeometry(0.06, 0.1, 0.5, 12, 1, true).translate(0, -0.25, 0), 0.9), robeM));
    arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.14, 8).translate(0, -0.55, 0), skin));
    for (let f = 0; f < 4; f++) { const n = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.11, 5).translate(0, -0.055, 0), black); n.position.set((f - 1.5) * 0.017, -0.62, 0); n.rotation.z = (f - 1.5) * 0.1; arm.add(n); }
    arms.push(arm);
  }
  const head = new THREE.Group(); head.position.set(0, 1.66, 0); body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18).scale(0.9, 1.12, 0.95), faceM));
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.03, 20), black); brim.position.y = 0.09; head.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.11, 16), black); crown.position.y = 0.155; head.add(crown);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), trim); knob.position.y = 0.225; head.add(knob);
  const queue = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.01, 0.55, 6).translate(0, -0.3, 0), black); queue.position.set(0, 0.02, 0.11); queue.rotation.x = -0.12; head.add(queue);
  const talisman = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.19).translate(0, -0.095, 0), M(mats, sway(new THREE.MeshBasicMaterial({ map: paper, side: THREE.DoubleSide }), '-position.y * 3.0', 0.012)));
  talisman.position.set(0, 0.085, -0.125); talisman.rotation.y = Math.PI; head.add(talisman);
  return { root, body, mats, arms, head };
}

// 吊死鬼: grey rags on a rope, head lolling forward, tongue to the chest, bare feet turning slowly.
function makeHanged() {
  const root = new THREE.Group(), body = new THREE.Group(), mats = []; root.add(body);
  const rag = M(mats, sway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1, color: 0x5b5a55 }), '1.3 - position.y', 0.03));
  const skin = M(mats, new THREE.MeshStandardMaterial({ color: 0x7f8590, roughness: 0.9 }));
  const ropeM = M(mats, new THREE.MeshStandardMaterial({ color: 0x6b5a3a, roughness: 1 }));
  const tongueM = M(mats, new THREE.MeshStandardMaterial({ color: 0x6e1420, roughness: 0.5 }));
  const hairM = M(mats, new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.DoubleSide }));
  const face = faceTexture('scream', { skin: '#9aa0ae', seed: 23, bruise: 'rgba(40,24,70,A)' });
  const faceM = M(mats, new THREE.MeshStandardMaterial({ map: face, color: 0x868686, roughness: 0.95, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.07 }));
  // origin = soles of the feet; the body hangs above it
  body.add(new THREE.Mesh(robe([[0.26, 0.42], [0.22, 0.6], [0.17, 0.9], [0.15, 1.1], [0.18, 1.25], [0.16, 1.34], [0.06, 1.42]], 18, { fadeTo: [-1, -0.5], ragged: 0.62, grime: true, flat: 0.62 }), rag));
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.026, 0.5, 7).translate(0, -0.25, 0), skin); leg.position.set(s * 0.07, 0.56, 0); body.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.15), skin); foot.position.set(s * 0.07, 0.04, -0.03); foot.rotation.x = -0.9; body.add(foot);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.17, 1.3, 0); body.add(arm);
    arm.add(new THREE.Mesh(white(new THREE.CylinderGeometry(0.04, 0.07, 0.4, 10, 1, true).translate(0, -0.2, 0), 0.85), rag));
    arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.34, 7).translate(0, -0.55, 0), skin));
    for (let f = 0; f < 4; f++) { const n = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.12, 5).translate(0, -0.06, 0), skin); n.position.set((f - 1.5) * 0.014, -0.72, 0); arm.add(n); }
    arm.userData.side = s; arms.push(arm);
  }
  const head = new THREE.Group(); head.position.set(0, 1.5, -0.03); head.rotation.set(0.75, 0, 0.3); body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 22, 16).scale(0.88, 1.14, 0.95), faceM));
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.119, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62).rotateX(0.8).scale(0.92, 1.16, 1.05), hairM));
  head.add(new THREE.Mesh(new THREE.LatheGeometry([[0.1, 0.06], [0.12, -0.2], [0.11, -0.6]].map(([r, y]) => new THREE.Vector2(r, y)), 14, -2.1, 4.2), hairM));
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.34, 0.012, 1, 6, 1).translate(0, -0.17, 0), tongueM); tongue.position.set(0, -0.085, -0.1); tongue.rotation.x = -0.75; head.add(tongue);
  const noose = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 14), ropeM); noose.position.set(0, 1.42, 0); noose.rotation.x = Math.PI / 2; body.add(noose);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6).translate(0, 0.5, 0), ropeM); rope.position.set(0, 1.44, 0.05); body.add(rope);
  return { root, body, mats, arms, head, rope };
}

// 紅衣小女孩: child-sized, red dress, bobbed hair, always just far enough ahead that you cannot see her face.
function makeGirl() {
  const root = new THREE.Group(), body = new THREE.Group(), mats = []; root.add(body);
  const dress = M(mats, sway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, color: 0x9c1414, emissive: 0x3a0505, emissiveIntensity: 0.5 }), '0.9 - position.y', 0.02));
  const skin = M(mats, new THREE.MeshStandardMaterial({ color: 0x9aa09c, roughness: 0.9 }));
  const hairM = M(mats, new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.DoubleSide }));
  const face = faceTexture('scream', { seed: 41 });
  const faceM = M(mats, new THREE.MeshStandardMaterial({ map: face, color: 0x8a8a8a, roughness: 0.95, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.1 }));
  body.add(new THREE.Mesh(robe([[0.27, 0.3], [0.22, 0.45], [0.15, 0.68], [0.12, 0.8], [0.13, 0.9], [0.06, 0.96]], 16, { fadeTo: [-1, -0.5], ragged: 0.4, flat: 0.7 }), dress));
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.055, 0.42, 0); body.add(leg);
    leg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.4, 7).translate(0, -0.2, 0), skin));
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.11), M(mats, new THREE.MeshStandardMaterial({ color: 0x7a0f0f, roughness: 0.6 }))); shoe.position.set(0, -0.4, -0.02); leg.add(shoe);
    legs.push(leg);
  }
  const arms = [];
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.36, 7).translate(0, -0.18, 0), skin); a.position.set(s * 0.14, 0.88, 0); a.rotation.z = -s * 0.12; body.add(a); arms.push(a); }
  const head = new THREE.Group(); head.position.set(0, 1.08, 0); body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.105, 22, 16).scale(0.95, 1.05, 0.98), faceM));
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.114, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62).rotateX(0.75).scale(1, 1.08, 1.06), hairM));
  head.add(new THREE.Mesh(new THREE.LatheGeometry([[0.108, 0.05], [0.125, -0.08], [0.12, -0.17]].map(([r, y]) => new THREE.Vector2(r, y)), 14, -2.2, 4.4), hairM)); // bob
  return { root, body, mats, arms, legs, head };
}

const HIT = { // ray-cast volumes: body cylinder + head sphere, relative to the entity's base
  jiangshi: { r: 0.34, h0: 0, h1: 1.52, headY: 1.68, headR: 0.2 },
  hanged: { r: 0.28, h0: 0, h1: 1.38, headY: 1.5, headR: 0.2 },
  girl: { r: 0.24, h0: 0, h1: 0.95, headY: 1.08, headR: 0.17 },
};
const NAME = { jiangshi: '殭屍', hanged: '吊死鬼', girl: '紅衣小女孩' };
const HP = { jiangshi: 220, hanged: 70, girl: 40 };

export class Monsters {
  constructor(scene, terrain, world, loot, fx, audio) {
    this.scene = scene; this.terrain = terrain; this.world = world; this.loot = loot; this.fx = fx; this.audio = audio;
    this.rng = mulberry32(1313);
    this.list = [];
    for (const k of Object.keys(MAX)) for (let i = 0; i < MAX[k]; i++) {
      const rig = k === 'jiangshi' ? makeJiangshi() : k === 'hanged' ? makeHanged() : makeGirl();
      rig.root.visible = false; scene.add(rig.root);
      this.list.push({ kind: k, name: NAME[k], sys: this, rig, hit: HIT[k], maxHp: HP[k], hp: 0, active: false, alive: false, x: 0, y: 0, z: 0, yaw: 0, state: 'idle', t: 0, opacity: 0, flash: 0, seed: this.rng() * 100 });
    }
    this.stats = { kills: 0 };
    this.spawnT = { jiangshi: 12, hanged: 9 };
    this.speedMul = 1;         // blood moon makes everything faster
    this.dread = 0;
    this.noise = null;         // loudest recent sound: { x, z, r, t }
    this.onKill = null;        // (m, dist) => void
    this.onTaken = null;       // () => void: the girl has led the player away
    this._v = new THREE.Vector3(); this._n = new THREE.Vector3();
  }

  count(kind) { return this.list.filter((m) => m.kind === kind && m.active).length; }
  _free(kind) { return this.list.find((m) => m.kind === kind && !m.active); }
  _activate(m, x, z, state) {
    Object.assign(m, { active: true, alive: true, hp: m.maxHp, x, z, y: this.terrain.heightAt(x, z), state, t: 0, opacity: 0, flash: 0, hop: 0, heard: 0, cd: 0, tx: x, tz: z, runs: 0, held: 0, taken: 0, hurt: 0, creak: 0, swipe: 0 });
    m.rig.root.visible = true; m.rig.root.scale.setScalar(1); m.rig.body.rotation.set(0, 0, 0);
    return m;
  }

  // A sound the dead can hear (gunshots; footsteps are added in update()).
  hear(x, z, r) { if (!this.noise || r >= this.noise.r) this.noise = { x, z, r, t: 0.3 }; }

  spawnJiangshi(player, near = false) {
    const m = this._free('jiangshi'); if (!m) return null;
    for (let i = 0; i < 12; i++) {
      const a = this.rng() * 6.283, d = near ? 14 + this.rng() * 8 : 28 + this.rng() * 18;
      const x = player.pos.x + Math.sin(a) * d, z = player.pos.z + Math.cos(a) * d;
      if (!this.terrain.inBounds(x, z, 8) || this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 1, z)) continue;
      this._activate(m, x, z, 'dormant'); m.yaw = this.rng() * 6.283;
      if (near) { m.state = 'hunt'; m.heard = 6; m.tx = player.pos.x; m.tz = player.pos.z; }
      return m;
    }
    return null;
  }

  // Hang one from a tree somewhere ahead of where the player is going.
  spawnHanged(player) {
    const m = this._free('hanged'); if (!m) return null;
    const R = 34, p = player.pos;
    const trees = this.world.colliders.query(p.x - R, p.z - R, p.x + R, p.z + R).filter((s) => s.kind === 'circle');
    for (let i = 0; i < 14 && trees.length; i++) {
      const t = trees[Math.floor(this.rng() * trees.length)];
      const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
      if (d < 11 || d > R) continue;
      const ahead = (-Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz) / d;
      if (ahead < 0.3 && i < 9) continue;
      // on the side of the trunk that faces the player's approach
      const x = t.x - dx / d * 1.3, z = t.z - dz / d * 1.3;
      if (this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 1, z)) continue;
      if (this.list.some((o) => o.active && o.kind === 'hanged' && Math.hypot(o.x - x, o.z - z) < 12)) continue;
      this._activate(m, x, z, 'hang');
      m.ground = m.y; m.lift = 1.9; m.yaw = Math.atan2(-(p.x - x), -(p.z - z)); m.ropeTop = Math.max(4.5, t.top - m.ground - 1.5);
      return m;
    }
    return null;
  }

  spawnGirl(player) {
    const m = this._free('girl'); if (!m) return null;
    for (let i = 0; i < 10; i++) {
      const a = player.yaw + (this.rng() - 0.5) * 0.7, d = 15 + this.rng() * 5;
      const x = player.pos.x - Math.sin(a) * d, z = player.pos.z - Math.cos(a) * d;
      if (!this.terrain.inBounds(x, z, 8) || this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 1, z)) continue;
      this._activate(m, x, z, 'wait'); m.yaw = a; // back turned to the player
      this.audio?.giggle();
      return m;
    }
    return null;
  }

  banish() { for (const m of this.list) if (m.active && m.state !== 'gone' && m.state !== 'dead') { m.state = 'gone'; m.t = 0; m.alive = false; if (m.held) this._release(m); } }

  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    let best = null, bt = maxT;
    const a = dx * dx + dz * dz;
    for (const m of this.list) {
      if (!m.alive || m.opacity < 0.2) continue;
      const h = m.hit, fx = ox - m.x, fz = oz - m.z;
      let t = -1, zone = 'body';
      if (a > 1e-9) {
        const b = fx * dx + fz * dz, c = fx * fx + fz * fz - h.r * h.r, disc = b * b - a * c;
        // point-blank: the muzzle can already be inside it
        if (c < 0) { const y = oy - m.y; if (y >= h.h0 && y <= h.h1) t = 0; }
        else if (disc >= 0) { const t0 = (-b - Math.sqrt(disc)) / a, y = oy + dy * t0 - m.y; if (t0 >= 0 && y >= h.h0 && y <= h.h1) t = t0; }
      }
      const hy = oy - (m.y + h.headY), b = fx * dx + hy * dy + fz * dz, c = fx * fx + hy * hy + fz * fz - h.headR * h.headR, disc = b * b - c;
      if (disc >= 0) { const th = -b - Math.sqrt(disc); if (th >= 0 && (t < 0 || th < t)) { t = th; zone = 'head'; } }
      if (t >= 0 && t < bt) { bt = t; best = { t, target: m, zone }; }
    }
    return best;
  }

  damage(m, amount, dist = 0) {
    if (!m.alive) return false;
    m.hp -= amount; m.flash = 1;
    if (m.kind === 'jiangshi') { m.state = m.state === 'dormant' ? 'hunt' : m.state; m.heard = 6; }
    if (m.kind === 'hanged') { m.hurt = (m.hurt || 0) + amount; if (m.held && m.hurt >= 25) { this._release(m); m.state = 'retreat'; m.t = 0; } }
    if (m.kind === 'girl') { // you cannot kill her; she is simply not there any more
      m.alive = false; m.state = 'gone'; m.t = 0; this.audio?.giggle(); this.dread = 1;
      return false;
    }
    if (m.hp > 0) return false;
    m.hp = 0; m.alive = false; m.state = 'dead'; m.t = 0;
    if (m.held) this._release(m);
    this.stats.kills++;
    this._v.set(m.x, m.y + 1.1, m.z);
    this.fx.impact(this._v, this._n.set(0, 1, 0), 'ghost', 18); this.fx.puff(this._v, this._n, 'smoke');
    const drops = m.kind === 'jiangshi'
      ? [ammoStack(['ammo_9mm', 'ammo_556', 'ammo_762', 'ammo_12g'][Math.floor(this.rng() * 4)], this.rng), this.rng() < 0.5 ? { id: 'guabao', n: 1 } : { id: 'vest2', n: 1, dur: 220 }]
      : [{ id: this.rng() < 0.5 ? 'friedchicken' : 'icecream', n: 1 }];
    this.loot.scatter(drops, m.x, m.z, 0.8);
    this.onKill?.(m, dist);
    return true;
  }

  _release(m) { m.held = 0; if (this.player) { this.player.grabbed = false; } }

  // cam: { pos, look } · sky: { night }
  update(dt, player, cam, sky) {
    this.player = player;
    const dark = sky.night > 0.6 && !player.dead, p = player.pos;
    if (dark) {
      if ((this.spawnT.jiangshi -= dt) <= 0) { this.spawnT.jiangshi = 16 + this.rng() * 14; if (this.count('jiangshi') < 2) this.spawnJiangshi(player); }
      if ((this.spawnT.hanged -= dt) <= 0) { this.spawnT.hanged = 10 + this.rng() * 10; if (this.count('hanged') < MAX.hanged) this.spawnHanged(player); }
    } else if (this.list.some((m) => m.active && m.state !== 'gone' && m.state !== 'dead')) this.banish();

    // what can be heard: footsteps scale with how you move; gunfire is set by hear()
    const hs = Math.hypot(player.vel.x, player.vel.z);
    const step = player.dead || hs < 0.4 ? 0 : player.sprinting ? 30 : player.crouch ? 3.5 : 13;
    let noise = this.noise;
    if (noise && (noise.t -= dt) <= 0) noise = this.noise = null;
    let dread = 0;

    for (const m of this.list) {
      if (!m.active) continue;
      m.t += dt; m.flash = Math.max(0, m.flash - dt * 5);
      const dx = p.x - m.x, dz = p.z - m.z, dist = Math.hypot(dx, dz);
      let target = 1, fade = 4;
      if (m.kind === 'jiangshi') this._jiangshi(m, dt, player, dist, step, noise);
      else if (m.kind === 'hanged') { this._hanged(m, dt, player, dist); if (m.alive) dread = Math.max(dread, m.held ? 1 : clamp(1 - dist / 14, 0, 0.55)); }
      else { this._girl(m, dt, player, dist); if (m.alive) dread = Math.max(dread, clamp(1 - dist / 20, 0.25, 0.8)); }
      if (m.state === 'gone') { target = 0; fade = 6; }
      if (m.state === 'dead') { target = m.t > 2.5 ? 0 : 1; fade = 2; }
      m.opacity += (target - m.opacity) * (1 - Math.exp(-fade * dt));
      if ((m.state === 'gone' || m.state === 'dead') && m.opacity < 0.03) { m.active = false; m.rig.root.visible = false; continue; }
      if (dist > 110 && m.kind !== 'girl' && !m.held) { m.state = 'gone'; m.alive = false; }
      for (const mt of m.rig.mats) mt.opacity = mt.userData.base * m.opacity;
    }
    this.dread += (dread - this.dread) * (1 - Math.exp(-2.5 * dt));
  }

  _jiangshi(m, dt, player, dist, step, noise) {
    const rig = m.rig, p = player.pos;
    // listen
    if (m.alive) {
      if (step > 0 && dist < step) { m.tx = p.x; m.tz = p.z; m.heard = 3.5; }
      if (noise && Math.hypot(noise.x - m.x, noise.z - m.z) < noise.r) { m.tx = noise.x; m.tz = noise.z; m.heard = 6; }
      if (dist < 1.9) { m.tx = p.x; m.tz = p.z; m.heard = Math.max(m.heard, 1.5); } // it can smell you this close
      if (m.state === 'dormant' && m.heard > 0) { m.state = 'hunt'; this.audio?.groan(); }
    }
    m.heard = Math.max(0, m.heard - dt); m.cd = Math.max(0, m.cd - dt);
    let hopY = 0;
    if (m.state === 'hunt') {
      const tdx = m.tx - m.x, tdz = m.tz - m.z, td = Math.hypot(tdx, tdz);
      const want = Math.atan2(-tdx, -tdz);
      let d = want - m.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); m.yaw += d * (1 - Math.exp(-6 * dt));
      if (dist < 1.7 && m.cd <= 0 && !player.dead) { // claws
        m.cd = 1.3; m.swipe = 0.35;
        player.damage(26, { zone: 'body', x: m.x, z: m.z, source: m.name });
      } else if (td > 0.8) {
        // rigid two-footed hops: airborne for 0.36 s, then a beat on the ground
        const T = 0.5 / this.speedMul;
        m.hop += dt;
        const ph = (m.hop % T) / T;
        if (ph < 0.72) {
          const sp = (m.heard > 0 ? 4.6 : 2.4) * this.speedMul / 0.72;
          m.x -= Math.sin(m.yaw) * sp * dt; m.z -= Math.cos(m.yaw) * sp * dt;
          hopY = Math.sin(ph / 0.72 * Math.PI) * 0.34;
        } else if (!m.landed) { m.landed = true; if (dist < 28) this.audio?.thud(clamp(1 - dist / 28, 0.1, 1)); }
        if (ph < 0.72) m.landed = false;
        const q = { x: m.x, z: m.z }; this.world.colliders.resolve(q, 0.4); m.x = q.x; m.z = q.z;
      } else if (m.heard <= 0) m.state = 'dormant';   // lost the scent: stands and waits
    }
    m.swipe = Math.max(0, (m.swipe || 0) - dt);
    m.y = this.terrain.heightAt(m.x, m.z);
    const fall = m.state === 'dead' ? Math.min(1, m.t * 2.2) : 0;
    rig.root.position.set(m.x, m.y + hopY, m.z);
    rig.root.rotation.set(0, m.yaw, 0);
    rig.body.rotation.x = fall * 1.5 + (m.state === 'dormant' ? Math.sin(uTime.value * 0.8 + m.seed) * 0.03 : 0);
    for (const a of rig.arms) a.rotation.x = 1.5 + (m.swipe > 0 ? Math.sin(m.swipe / 0.35 * Math.PI) * -0.9 : 0) - fall * 0.6;
    rig.head.rotation.y = m.state === 'dormant' ? Math.sin(uTime.value * 0.5 + m.seed) * 0.5 : 0; // head turns, listening
  }

  _hanged(m, dt, player, dist) {
    const rig = m.rig, p = player.pos;
    if (m.state === 'hang') {
      if (!m.creak || (m.creak -= dt) <= 0) { m.creak = 2.2 + this.rng() * 2; if (dist < 16) this.audio?.creak(clamp(1 - dist / 16, 0.15, 1)); }
      if (dist < 1.7 && !player.dead && !player.grabbed) {
        if (player.ward > 0) { player.ward--; m.state = 'retreat'; m.t = 0; this.onWard?.(m); } // the charm burns instead of you
        else { m.state = 'drop'; m.t = 0; this.audio?.scream(); }
      }
    } else if (m.state === 'drop') { // down the rope and onto you
      m.lift += (0.12 - m.lift) * (1 - Math.exp(-14 * dt));
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      m.x += (p.x + fx * 0.75 - m.x) * (1 - Math.exp(-12 * dt)); m.z += (p.z + fz * 0.75 - m.z) * (1 - Math.exp(-12 * dt));
      m.yaw = player.yaw + Math.PI;
      if (m.t > 0.25) { m.state = 'choke'; m.t = 0; m.held = 1; m.hurt = 0; player.grabbed = true; }
    } else if (m.state === 'choke') {
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      m.x = p.x + fx * 0.75; m.z = p.z + fz * 0.75; m.yaw = player.yaw + Math.PI; m.ground = p.y;
      if ((m.choke = (m.choke || 0) + dt) >= 0.5) { m.choke = 0; player.damage(3.5, { raw: true, x: m.x, z: m.z, source: m.name }); }
      if (m.t > 5 || player.dead) { this._release(m); m.state = 'retreat'; m.t = 0; }
    } else if (m.state === 'retreat') { // hauled back up into the branches
      m.lift += 5 * dt;
      if (m.t > 0.9) { m.state = 'gone'; m.alive = false; }
    }
    const dead = m.state === 'dead';
    if (dead) m.lift = Math.max(0, m.lift - m.t * 9 * dt);    // rope gives: it drops
    m.y = m.ground + m.lift;
    rig.root.position.set(m.x, m.y, m.z);
    const swing = m.state === 'hang' ? Math.sin(uTime.value * 0.9 + m.seed) * 0.07 : 0;
    rig.root.rotation.set(swing, m.yaw + (m.state === 'hang' ? Math.sin(uTime.value * 0.23 + m.seed) * 0.6 : 0), swing * 0.6); // turns slowly on the rope
    rig.rope.scale.y = Math.max(0.2, (m.ropeTop || 5) - m.lift - 1.44); rig.rope.visible = !dead;
    const grab = m.state === 'choke' || m.state === 'drop';
    for (const a of rig.arms) { a.rotation.x += ((grab ? 1.35 : 0.05) - a.rotation.x) * (1 - Math.exp(-16 * dt)); a.rotation.z = -a.userData.side * (grab ? -0.12 : 0.06); }
    rig.head.rotation.x = grab ? 0.1 + Math.sin(m.t * 40) * 0.08 : 0.75;
    rig.body.rotation.x = dead ? Math.min(1.4, m.t * 3) : 0;
  }

  _girl(m, dt, player, dist) {
    const rig = m.rig, p = player.pos;
    let run = 0;
    if (m.state === 'wait') {
      if (m.t > 26) { m.state = 'gone'; m.alive = false; }
      else if (dist < 2.3) { // caught her. She turns round.
        m.state = 'turn'; m.t = 0; m.yaw = Math.atan2(-(p.x - m.x), -(p.z - m.z)); this.audio?.scream();
      } else if (dist < 9 && m.runs < 3) { m.state = 'run'; m.t = 0; m.runs++; m.yaw = Math.atan2(p.x - m.x, p.z - m.z) + (this.rng() - 0.5) * 0.9; this.audio?.giggle(); }
    } else if (m.state === 'run') {
      run = 1;
      m.x -= Math.sin(m.yaw) * 7.2 * dt; m.z -= Math.cos(m.yaw) * 7.2 * dt;
      const q = { x: m.x, z: m.z }; this.world.colliders.resolve(q, 0.3); m.x = q.x; m.z = q.z;
      if (m.t > 1.9 || dist > 19) { m.state = 'wait'; m.t = 0; }
    } else if (m.state === 'turn') {
      if (m.t > 0.75 && !m.taken) { m.taken = 1; this.onTaken?.(m); }
      if (m.t > 1.0) { m.state = 'gone'; m.alive = false; }
    }
    m.y = this.terrain.heightAt(m.x, m.z);
    rig.root.position.set(m.x, m.y, m.z);
    rig.root.rotation.set(0, m.yaw, 0);
    const ph = uTime.value * 16;
    rig.legs[0].rotation.x = run * Math.sin(ph) * 0.9; rig.legs[1].rotation.x = -run * Math.sin(ph) * 0.9;
    rig.arms[0].rotation.x = -run * Math.sin(ph) * 0.7; rig.arms[1].rotation.x = run * Math.sin(ph) * 0.7;
    rig.body.rotation.x = -run * 0.2;
    rig.head.rotation.z = m.state === 'turn' ? 0.5 : 0;
    rig.root.scale.setScalar(m.state === 'turn' ? 1 + m.t * 0.3 : 1);
  }
}
