import * as THREE from 'three';
import { boxes } from './models.js';
import { ITEMS } from './items.js';

export const WALK = 3.6;
const SPRINT = 6.4, CROUCH = 1.7, JUMP = 5.2, GRAVITY = 18, RADIUS = 0.38;
const FALL_SAFE = 11, FALL_DMG = 7; // m/s you can land at unhurt, damage per m/s beyond that

// --- character rig -------------------------------------------------------------
// Body space: +x right, +y up, -z forward. Limbs are two capsules each, posed by
// pointing them along direction vectors (so walking, crouching and the two-handed
// weapon hold all go through the same code).
const THIGH = 0.44, SHIN = 0.44, UPPER = 0.31, FORE = 0.29, FOOT_H = 0.075;
const HIP_Y = 0.93, HIP_X = 0.095, SHOULDER_Y = 1.455, SHOULDER_X = 0.215;
const MOUNT = new THREE.Vector3(0.14, 1.42, -0.02);  // weapon pivot (right shoulder)
const GRIP = new THREE.Vector3(0, -0.13, -0.24);     // weapon grip relative to the pivot
const FOREGRIP = { pistol: 0, smg: 0.2, ar: 0.3, shotgun: 0.3, sniper: 0.27 }; // left-hand position ahead of the grip
const DOWN = new THREE.Vector3(0, -1, 0), BACK = new THREE.Vector3(0, 0, 1);
const GEAR_TINT = { 1: 0x7a7d66, 2: 0x47566b, 3: 0x26282c };

function makeCharacter() {
  const mat = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const M = {
    jacket: mat(0x3f5a78), jacketDark: mat(0x2f455e), pants: mat(0x2b2e36), skin: mat(0xd9ab86, 0.7),
    hair: mat(0x1d1a18, 0.9), shoe: mat(0xe2e0da, 0.6), sole: mat(0x202226), glove: mat(0x2a2c30, 0.7),
  };
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const add = (geo, m, x = 0, y = 0, z = 0, parent = body) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o;
  };
  // capsule hanging down from its origin, total reach `len`
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 10).translate(0, -len / 2, 0);

  // torso: hips, waist, chest, shoulders
  add(new THREE.CapsuleGeometry(0.13, 0.1, 4, 12).rotateZ(Math.PI / 2).scale(1, 1, 0.82), M.pants, 0, 0.96, 0);
  const chest = add(new THREE.CapsuleGeometry(0.17, 0.3, 6, 14), M.jacket, 0, 1.25, 0); chest.scale.set(1.12, 1, 0.74);
  add(new THREE.CapsuleGeometry(0.075, 0.3, 4, 10).rotateZ(Math.PI / 2), M.jacket, 0, 1.45, 0);
  add(new THREE.CylinderGeometry(0.19, 0.185, 0.05, 14).scale(1, 1, 0.74), M.jacketDark, 0, 1.03, 0); // hem
  const hood = add(new THREE.SphereGeometry(0.12, 12, 8).scale(1.15, 0.7, 0.9), M.jacketDark, 0, 1.5, 0.07);
  // head
  add(new THREE.CylinderGeometry(0.052, 0.062, 0.1, 10), M.skin, 0, 1.56, 0);
  const head = new THREE.Group(); head.position.set(0, 1.685, 0); body.add(head);
  add(new THREE.SphereGeometry(0.112, 18, 14).scale(0.95, 1.08, 1), M.skin, 0, 0, 0, head);
  const hair = add(new THREE.SphereGeometry(0.119, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(0.97, 1.08, 1.03), M.hair, 0, 0.012, 0.008, head);
  hair.rotation.x = 0.28;
  for (const x of [-0.04, 0.04]) add(new THREE.SphereGeometry(0.016, 8, 6), M.hair, x, 0.014, -0.104, head); // eyes
  add(new THREE.BoxGeometry(0.018, 0.03, 0.02), M.skin, 0, -0.012, -0.112, head);                                 // nose

  const limb = (r1, r2, l1, l2, m1, m2) => ({ a: add(cap(r1, l1), m1), b: add(cap(r2, l2), m2), l1, l2 });
  const legL = limb(0.082, 0.066, THIGH, SHIN, M.pants, M.pants), legR = limb(0.082, 0.066, THIGH, SHIN, M.pants, M.pants);
  const armL = limb(0.06, 0.05, UPPER, FORE, M.jacket, M.jacket), armR = limb(0.06, 0.05, UPPER, FORE, M.jacket, M.jacket);
  for (const a of [armL, armR]) {
    add(new THREE.SphereGeometry(0.052, 10, 8).scale(1, 1.25, 0.8), M.skin, 0, -FORE - 0.035, 0, a.b);
    add(new THREE.CylinderGeometry(0.056, 0.056, 0.05, 10), M.jacketDark, 0, -FORE + 0.02, 0, a.b); // cuff
  }
  const footGeo = () => {
    const g = new THREE.Group();
    add(new THREE.BoxGeometry(0.1, 0.07, 0.25).translate(0, -0.02, -0.055), M.shoe, 0, 0, 0, g);
    add(new THREE.BoxGeometry(0.104, 0.025, 0.255).translate(0, -0.063, -0.055), M.sole, 0, 0, 0, g);
    body.add(g); return g;
  };
  legL.foot = footGeo(); legR.foot = footGeo();

  // Weapon mount at the right shoulder; pitches with the aim.
  const gun = new THREE.Group(); gun.position.copy(MOUNT); body.add(gun);
  // Gear shown when equipped (filled in by syncGear).
  const gear = { vest: new THREE.Group(), helmet: new THREE.Group(), pack: new THREE.Group() };
  body.add(gear.vest, gear.pack); head.add(gear.helmet);
  return { root, body, head, hair, hood, legL, legR, armL, armR, gun, gear };
}

function gearMesh(kind, lv) {
  const c = GEAR_TINT[lv], dark = new THREE.Color(c).multiplyScalar(0.72).getHex(), strap = 0x1b1c1f;
  let g;
  if (kind === 'vest') {
    g = boxes([
      { s: [0.43, 0.36, 0.3], p: [0, 1.25, 0], c },
      { s: [0.1, 0.12, 0.3], p: [-0.13, 1.47, 0], c: dark }, { s: [0.1, 0.12, 0.3], p: [0.13, 1.47, 0], c: dark },
      { s: [0.1, 0.13, 0.06], p: [-0.13, 1.15, -0.17], c: dark }, { s: [0.1, 0.13, 0.06], p: [0, 1.15, -0.17], c: dark },
      { s: [0.1, 0.13, 0.06], p: [0.13, 1.15, -0.17], c: dark },
      { s: [0.3, 0.1, 0.03], p: [0, 1.34, -0.16], c: lv === 3 ? 0x3a3d44 : dark },
      { s: [0.44, 0.05, 0.31], p: [0, 1.07, 0], c: strap },
    ]);
  } else if (kind === 'pack') {
    const h = [0.34, 0.42, 0.5][lv - 1], d = [0.14, 0.18, 0.22][lv - 1], w = [0.3, 0.34, 0.37][lv - 1];
    const parts = [
      { s: [w, h, d], p: [0, 1.26 + (h - 0.34) * 0.2, 0.15 + d / 2], c },
      { s: [w * 0.7, h * 0.36, 0.06], p: [0, 1.17, 0.17 + d], c: dark },
      { s: [w + 0.01, 0.07, d + 0.01], p: [0, 1.26 + (h - 0.34) * 0.2 + h / 2 - 0.03, 0.15 + d / 2], c: dark },
      { s: [0.05, 0.42, 0.02], p: [-0.12, 1.3, -0.135], c: strap }, { s: [0.05, 0.42, 0.02], p: [0.12, 1.3, -0.135], c: strap },
    ];
    if (lv === 3) parts.push({ s: [w + 0.06, 0.1, 0.1], p: [0, 1.57, 0.2], c: 0x5b5236 });
    g = boxes(parts);
  } else { // helmet (head space, origin at head centre)
    g = new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58).scale(1, 1.02, 1.1).translate(0, 0.012, 0);
  }
  const m = new THREE.Mesh(g, kind === 'helmet'
    ? new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15 })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  m.castShadow = true;
  if (kind === 'helmet') {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.07), new THREE.MeshStandardMaterial({ color: dark, roughness: 0.6 }));
    rim.position.set(0, -0.005, -0.15); m.add(rim);
    m.rotation.x = 0.1;
  }
  return m;
}

const _s = new THREE.Vector3(), _t = new THREE.Vector3(), _e = new THREE.Vector3(), _p = new THREE.Vector3();
const _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _hipL = new THREE.Vector3(), _hipR = new THREE.Vector3();
const _eu = new THREE.Euler();

// Point both segments of a limb: upper from `root` along d1, lower from the joint along d2.
function poseLimb(limb, root, d1, d2) {
  limb.a.position.copy(root); limb.a.quaternion.setFromUnitVectors(DOWN, d1);
  limb.b.position.copy(root).addScaledVector(d1, limb.l1); limb.b.quaternion.setFromUnitVectors(DOWN, d2);
}

// Two-bone IK: reach from `root` to `target`, bending towards `pole`.
function reachLimb(limb, root, target, pole) {
  const d = _d1.copy(target).sub(root); let len = d.length();
  const max = limb.l1 + limb.l2 - 0.005;
  len = Math.min(max, Math.max(Math.abs(limb.l1 - limb.l2) + 0.01, len)); d.normalize();
  const a = (limb.l1 * limb.l1 - limb.l2 * limb.l2 + len * len) / (2 * len);
  const h = Math.sqrt(Math.max(0, limb.l1 * limb.l1 - a * a));
  _p.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
  _e.copy(root).addScaledVector(d, a).addScaledVector(_p, h);          // elbow
  _d2.copy(root).addScaledVector(d, len).sub(_e).normalize();          // forearm direction
  _d1.copy(_e).sub(root).normalize();
  poseLimb(limb, root, _d1, _d2);
}

// Leg directions for a swing of `swing` rad along the (local) movement direction and a knee bend.
function legDirs(mx, mz, swing, knee, d1, d2) {
  const s = Math.sin(swing);
  d1.set(mx * s, -Math.cos(swing), mz * s);
  _p.copy(BACK).addScaledVector(d1, -BACK.dot(d1)).normalize();        // "behind the thigh"
  d2.copy(d1).multiplyScalar(Math.cos(knee)).addScaledVector(_p, Math.sin(knee));
}

export class Player {
  constructor(scene, terrain, colliders, inventory) {
    this.terrain = terrain; this.colliders = colliders; this.inv = inventory;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = -0.1;
    this.facing = 0;
    this.onGround = false; this.crouch = false; this.sprinting = false;
    this.phase = 0;
    this.hp = 100; this.boost = 0; this.dead = false;
    // set by the combat system every frame
    this.armed = false; this.sens = 1; this.speedMul = 1; this.noSprint = false;
    this.ads = 0; this.reloadK = 0; this.recoil = 0; this.eating = false; this.grabbed = false;
    this.punchT = 0; this.deadT = 0;
    this.held = null; this.heldId = null;
    this.onDamage = null; this.onDeath = null;
    this.rig = makeCharacter();
    this._gear = { vest: null, helmet: null, pack: null };
    this._pose = { crouch: 0, lower: 0, armed: 0 };
    scene.add(this.rig.root);
    this.animate(0);
  }

  spawn(x, z, yaw = 0) {
    this.pos.set(x, this.terrain.heightAt(x, z), z);
    this.colliders.resolve(this.pos, RADIUS);
    this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z);
    this.yaw = yaw; this.facing = yaw; this.pitch = -0.1; this.vel.set(0, 0, 0);
    this.hp = 100; this.boost = 0; this.dead = false; this.deadT = 0; this.crouch = false; this.grabbed = false;
    this.rig.body.rotation.set(0, 0, 0);
  }

  // info: { zone: 'head'|'body', x, z (where it came from), source, raw (skip armour) }
  damage(amount, info = {}) {
    if (this.dead || amount <= 0) return 0;
    const dealt = info.raw ? amount : this.inv.absorb(amount, info.zone || 'body');
    this.hp = Math.max(0, this.hp - dealt);
    this.onDamage?.(dealt, info);
    if (this.hp <= 0) { this.dead = true; this.deadT = 0; this.sprinting = false; this.onDeath?.(info); }
    return dealt;
  }

  heal(amount, cap = 100) { if (this.hp < cap) this.hp = Math.min(cap, this.hp + amount); }

  // Show a weapon model in the hands (null = empty hands).
  setHeld(id, mesh) {
    if (this.held) this.rig.gun.remove(this.held);
    this.held = mesh; this.heldId = id;
    if (mesh) { mesh.position.copy(GRIP); this.rig.gun.add(mesh); }
  }

  // World position of a point `len` metres down the barrel, for the ideal aim pose
  // (ignores recoil / reload animation so bullets always leave along the aim).
  muzzleWorld(out, len = 0.3) {
    const b = this.rig.body;
    this.rig.root.updateMatrixWorld(true);
    out.set(GRIP.x, GRIP.y + 0.045, GRIP.z - len).applyEuler(_eu.set(this.pitch - b.rotation.x, 0, 0)).add(MOUNT);
    return b.localToWorld(out);
  }

  update(dt, input) {
    const [mx, my] = input.consumeMouse();
    if (this.dead) { this.vel.x *= Math.exp(-8 * dt); this.vel.z *= Math.exp(-8 * dt); this._physics(dt); this.animate(dt); return; }
    const sens = 0.0022 * this.sens;
    this.yaw -= mx * sens; this.pitch = THREE.MathUtils.clamp(this.pitch - my * sens, -1.25, 0.95);

    if (input.consumePressed('KeyC')) this.crouch = !this.crouch;
    const f = THREE.MathUtils.clamp((input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0) + input.axis.y, -1, 1);
    const s = THREE.MathUtils.clamp((input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0) + input.axis.x, -1, 1);
    this.sprinting = (input.down('ShiftLeft') || input.sprint) && f > 0.5 && !this.crouch && !this.noSprint;
    if (this.sprinting) this.crouch = false;
    let speed = (this.crouch ? CROUCH : this.sprinting ? SPRINT : WALK) * this.speedMul;
    if (this.grabbed) speed = 0; // something has hold of you
    if (this.boost > 60) speed *= 1.06;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let wx = -sin * f + cos * s, wz = -cos * f - sin * s;
    const wl = Math.hypot(wx, wz); if (wl > 0) { wx = wx / wl * speed; wz = wz / wl * speed; }
    const accel = this.onGround ? 12 : 2;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (wx - this.vel.x) * k; this.vel.z += (wz - this.vel.z) * k;

    if (this.onGround && input.down('Space') && !this.grabbed) { this.vel.y = JUMP; this.onGround = false; this.crouch = false; }
    this._physics(dt);

    if (this.boost > 0) { this.boost = Math.max(0, this.boost - dt); this.heal(0.8 * dt); }
    this.animate(dt);
  }

  _physics(dt) {
    this.vel.y -= GRAVITY * dt;
    const vy = this.vel.y;
    this.pos.addScaledVector(this.vel, dt);
    this.colliders.resolve(this.pos, RADIUS, this.pos.y);
    const t = this.terrain;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, t.minX + 3, t.maxX - 3);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, t.minZ + 3, t.maxZ - 3);
    const ground = t.heightAt(this.pos.x, this.pos.z);
    if (this.pos.y <= ground || (this.onGround && this.vel.y <= 0 && this.pos.y - ground < 0.35)) {
      if (!this.onGround && -vy > FALL_SAFE) this.damage((-vy - FALL_SAFE) * FALL_DMG, { raw: true, source: '墜落' });
      this.pos.y = ground; this.vel.y = 0; this.onGround = true;
    } else this.onGround = false;
  }

  // Put on / take off the visible helmet, vest and backpack to match the inventory.
  syncGear() {
    for (const k of ['vest', 'helmet', 'pack']) {
      const id = this.inv[k]?.id ?? null;
      if (id === this._gear[k]) continue;
      this._gear[k] = id;
      const slot = this.rig.gear[k];
      slot.clear();
      if (id) slot.add(gearMesh(k, ITEMS[id].lv));
    }
    this.rig.hair.visible = !this._gear.helmet;
    this.rig.hood.visible = !this._gear.pack;
  }

  animate(dt) {
    const { root, body, head, legL, legR, armL, armR, gun } = this.rig;
    const ease = (k) => 1 - Math.exp(-k * dt);
    const lerp = THREE.MathUtils.lerp;
    this.syncGear();
    this.punchT = Math.max(0, this.punchT - dt);
    this.recoil = Math.max(0, this.recoil - dt * 9);

    const hs = Math.hypot(this.vel.x, this.vel.z);
    const aiming = (this.armed || this.punchT > 0) && !this.dead;
    if (aiming || hs > 0.3) {
      const target = aiming ? this.yaw : Math.atan2(-this.vel.x, -this.vel.z);
      let d = target - this.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * ease(aiming ? 22 : 12);
    }
    root.position.copy(this.pos);
    root.rotation.y = this.facing;

    if (this.dead) { // fall onto the back, limbs loose
      this.deadT += dt;
      body.rotation.x = lerp(body.rotation.x, 1.5, ease(7));
      body.position.y = lerp(body.position.y, 0.14, ease(7));
      gun.visible = false;
      _hipL.set(-HIP_X, HIP_Y, 0); _hipR.set(HIP_X, HIP_Y, 0);
      poseLimb(legL, _hipL, _d1.set(-0.12, -1, 0).normalize(), _d2.set(-0.1, -1, 0.25).normalize());
      poseLimb(legR, _hipR, _d1.set(0.2, -1, 0).normalize(), _d2.set(0.15, -1, 0.1).normalize());
      this._feet();
      poseLimb(armL, _s.set(-SHOULDER_X, SHOULDER_Y, 0), _d1.set(-1, -0.25, 0).normalize(), _d2.set(-0.8, 0.5, 0).normalize());
      poseLimb(armR, _s.set(SHOULDER_X, SHOULDER_Y, 0), _d1.set(0.9, -0.5, 0).normalize(), _d2.set(0.9, -0.4, 0).normalize());
      return;
    }
    gun.visible = true;

    // --- legs: swing along the direction of travel (in body space) ---
    const cf = Math.cos(this.facing), sf = Math.sin(this.facing);
    let mx = this.vel.x * cf - this.vel.z * sf, mz = this.vel.x * sf + this.vel.z * cf;
    if (hs > 0.2) { mx /= hs; mz /= hs; } else { mx = 0; mz = -1; }
    this.phase += dt * hs * (this.sprinting ? 1.45 : 2.25);
    const move = Math.min(1, hs / WALK);
    const amp = move * (this.sprinting ? 0.78 : 0.5);
    const P = this._pose;
    P.crouch = lerp(P.crouch, this.crouch ? 1 : 0, ease(12));
    const kneeGain = this.sprinting ? 1.5 : 1.0;
    const leg = (limb, hip, phase, crThigh, crKnee) => {
      const sw = Math.sin(phase) * amp, lift = Math.max(0, Math.cos(phase)) * amp * kneeGain + 0.06;
      if (!this.onGround) legDirs(0, -1, limb === legL ? 0.55 : -0.25, limb === legL ? 0.9 : 0.5, _d1, _d2);
      else if (P.crouch > 0.01) {
        // blend the walk cycle with a kneeling pose; keep a little swing so crouch-walking still reads
        const th = lerp(sw, crThigh + sw * 0.35, P.crouch), kn = lerp(lift, crKnee + lift * 0.3, P.crouch);
        legDirs(lerp(mx, 0, P.crouch), lerp(mz, -1, P.crouch), th, kn, _d1, _d2);
      } else legDirs(mx, mz, sw, lift, _d1, _d2);
      poseLimb(limb, hip, _d1, _d2);
    };
    _hipL.set(-HIP_X, HIP_Y, 0); _hipR.set(HIP_X, HIP_Y, 0);
    leg(legL, _hipL, this.phase, 1.3, 1.95);
    leg(legR, _hipR, this.phase + Math.PI, 0.25, 1.75);
    const low = this._feet();
    // keep the lower foot on the ground whatever the pose
    body.position.y = lerp(body.position.y, FOOT_H - low + (this.onGround ? 0 : 0.05), ease(18));
    body.rotation.x = lerp(body.rotation.x, this.sprinting ? -0.2 : -0.16 * P.crouch - 0.03 * move, ease(10));
    body.rotation.z = lerp(body.rotation.z, this.sprinting ? Math.sin(this.phase) * 0.03 : 0, ease(10));

    // --- arms ---
    const aim = this.pitch - body.rotation.x;
    const holding = this.armed && this.held;
    P.armed = lerp(P.armed, holding ? 1 : 0, ease(14));
    P.lower = lerp(P.lower, holding && this.sprinting ? 1 : 0, ease(10));
    const rk = this.recoil, rl = this.reloadK > 0 ? Math.sin(Math.min(1, this.reloadK) * Math.PI) : 0;
    // weapon: follows the aim; lowered across the body when sprinting; tips over while reloading
    gun.position.set(lerp(MOUNT.x, 0.045, this.ads), MOUNT.y + 0.03 * this.ads - 0.1 * P.lower - 0.03 * rl, MOUNT.z + 0.045 * rk);
    gun.rotation.set(lerp(aim, -0.75, P.lower) + 0.07 * rk - 0.35 * rl, 0.75 * P.lower, -0.45 * rl);
    head.rotation.x = THREE.MathUtils.clamp(aim * 0.6, -0.5, 0.5);

    if (holding) {
      gun.updateMatrix();
      const fore = FOREGRIP[this.heldId] ?? 0.2;
      // right hand on the grip, left hand on the fore-end (or under the pistol grip / at the magazine when reloading)
      _t.set(GRIP.x + 0.012, GRIP.y - 0.045, GRIP.z + 0.02).applyMatrix4(gun.matrix);
      reachLimb(armR, _s.set(SHOULDER_X, SHOULDER_Y, 0.01), _t, _p.set(0.75, -1, 0.35));
      if (fore) _t.set(GRIP.x - 0.012, GRIP.y - 0.015 - 0.16 * rl, GRIP.z - fore + 0.14 * rl);
      else _t.set(GRIP.x - 0.035, GRIP.y - 0.07 - 0.1 * rl, GRIP.z + 0.025);
      _t.applyMatrix4(gun.matrix);
      reachLimb(armL, _s.set(-SHOULDER_X + 0.03, SHOULDER_Y - 0.01, -0.075), _t, _p.set(-0.6, -1, 0.25));
    } else {
      const arm = (limb, side, phase) => {
        const sw = Math.sin(phase) * amp * (this.sprinting ? 1.15 : 0.9);
        const bend = 0.22 + (this.sprinting ? 1.15 : 0.35 * move) + Math.max(0, sw) * 0.4;
        _d1.set(side * 0.1, -Math.cos(sw), -Math.sin(sw)).normalize();
        _p.copy(BACK).negate().addScaledVector(_d1, BACK.dot(_d1)).normalize();   // "in front of the upper arm"
        _d2.copy(_d1).multiplyScalar(Math.cos(bend)).addScaledVector(_p, Math.sin(bend));
        poseLimb(limb, _s.set(side * SHOULDER_X, SHOULDER_Y, 0), _d1, _d2);
      };
      arm(armL, -1, this.phase + Math.PI);
      if (this.punchT > 0) { // jab along the aim with the right arm, guard up with the left
        const k = Math.sin(Math.min(1, this.punchT / 0.3) * Math.PI);
        _t.set(0.1, 1.38 + Math.sin(aim) * 0.5 * k, -0.2 - 0.42 * k);
        reachLimb(armR, _s.set(SHOULDER_X, SHOULDER_Y, 0), _t, _p.set(0.8, -1, 0.3));
        reachLimb(armL, _s.set(-SHOULDER_X, SHOULDER_Y, 0), _t.set(-0.1, 1.36, -0.26), _p.set(-0.8, -1, 0.3));
      } else arm(armR, 1, this.phase);
    }
    if (this.eating) { // left hand brings the food up to the mouth
      _t.set(-0.02, 1.6 + Math.sin(performance.now() / 110) * 0.015, -0.13);
      reachLimb(armL, _s.set(-SHOULDER_X, SHOULDER_Y, 0), _t, _p.set(-0.9, -0.6, -0.2));
    }
  }

  // Place the feet at the ankles; returns the height of the lower ankle in body space.
  _feet() {
    let low = Infinity;
    for (const l of [this.rig.legL, this.rig.legR]) {
      l.foot.position.set(0, -l.l2, 0).applyQuaternion(l.b.quaternion).add(l.b.position);
      // toes follow the shin a little, but stay roughly level
      l.foot.rotation.set(-Math.asin(THREE.MathUtils.clamp(_t.set(0, -1, 0).applyQuaternion(l.b.quaternion).z, -1, 1)) * 0.6, 0, 0);
      low = Math.min(low, l.foot.position.y);
    }
    return low;
  }

  // Eye-level target the camera orbits around.
  get headY() { return this.pos.y + (this.crouch ? 1.15 : 1.6); }
}
