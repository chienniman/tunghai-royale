import * as THREE from 'three';
import { gunMesh, GUN_POINTS, WEAPONS } from './game/items.js';

const WALK = 3.6, SPRINT = 6.4, CROUCH = 1.7, JUMP = 5.2, GRAVITY = 18, RADIUS = 0.38;
const UPPER = 0.31, FORE = 0.30, HAND = 0.03, THIGH = 0.44, SHIN = 0.42, HIP_Y = 0.95;
const DOWN = new THREE.Vector3(0, -1, 0), Y_AXIS = new THREE.Vector3(0, 1, 0);
const SHOULDER_L = new THREE.Vector3(-0.27, 1.47 - HIP_Y, 0), SHOULDER_R = new THREE.Vector3(0.27, 1.47 - HIP_Y, 0);
const POLE_L = new THREE.Vector3(-0.55, -1, 0.05), POLE_R = new THREE.Vector3(0.6, -1, 0.3);

// How each kind of gun is carried, in the upper body's frame (origin at the hips, -z forward).
const HOLD = {
  rifle: { anchor: [0.10, 0.47, -0.03], off: [0, -0.10, -0.33], adsX: -0.035, adsY: 0.045, twist: -0.5,
    low: [0.02, 0.21, -0.30], lowRot: [-0.55, 0.9], lowTwist: -0.15 },
  pistol: { anchor: [0.02, 0.50, 0], off: [0, -0.03, -0.5], adsX: 0, adsY: 0.05, twist: 0,
    low: [0.2, 0.08, -0.16], lowRot: [-1.05, 0], lowTwist: 0 },
};

function makeCharacter() {
  const mat = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const jacket = mat(0x5a6340), pants = mat(0x3b3d35), skin = mat(0xd2a47e, 0.7), boots = mat(0x222018),
    vest = mat(0x4a4a3c), helmet = mat(0x4b5137, 0.6), glove = mat(0x2a2a26), packM = mat(0x3f4430);
  const shadow = (o) => { o.castShadow = true; return o; };
  const box = (w, h, d, m) => shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
  const ball = (r, m) => shadow(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m));
  const seg = (len, w, m) => { const p = new THREE.Group(); const s = box(w, len, w, m); s.position.y = -len / 2; p.add(s); return p; };

  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const body = new THREE.Group(); root.add(body);                    // bobs / drops when crouching
  const upper = new THREE.Group(); upper.position.y = HIP_Y; body.add(upper);   // leans from the hips
  const chest = new THREE.Group(); upper.add(chest);                 // twists when shouldering a rifle

  const hips = box(0.36, 0.2, 0.22, pants); hips.position.y = 0.92; body.add(hips);
  const torso = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 10), jacket));
  torso.scale.set(1.15, 1, 0.75); torso.position.y = 1.25 - HIP_Y; chest.add(torso);
  const vestM = box(0.42, 0.34, 0.3, vest); vestM.position.y = 1.28 - HIP_Y; chest.add(vestM);
  const pack = box(0.32, 0.4, 0.16, packM); pack.position.set(0, 1.28 - HIP_Y, 0.22); chest.add(pack);

  const headG = new THREE.Group(); headG.position.y = 1.5 - HIP_Y; headG.rotation.order = 'YXZ'; chest.add(headG);
  const neck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skin)); neck.position.y = 0.05; headG.add(neck);
  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), skin)); head.position.y = 0.16; headG.add(head);
  const helm = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmet));
  helm.position.y = 0.185; headG.add(helm);

  const leg = (x) => {
    const thigh = seg(THIGH, 0.16, pants); thigh.position.set(x, 0.9, 0);
    const shin = seg(SHIN, 0.13, pants); shin.position.y = -THIGH; shin.add(ball(0.085, pants));
    const boot = box(0.15, 0.1, 0.27, boots); boot.position.set(0, -SHIN + 0.01, -0.05); shin.add(boot);
    thigh.add(shin); body.add(thigh);
    return { thigh, shin };
  };
  const arm = (s) => {
    const upperArm = seg(UPPER, 0.115, jacket); upperArm.position.copy(s); upperArm.add(ball(0.078, jacket));
    const fore = seg(FORE, 0.095, jacket); fore.position.y = -UPPER; fore.add(ball(0.064, jacket));
    const hand = ball(0.055, glove); hand.position.y = -FORE - HAND; fore.add(hand);
    upperArm.add(fore); chest.add(upperArm);
    return { upper: upperArm, fore };
  };

  const gun = new THREE.Group(); gun.rotation.order = 'YXZ'; upper.add(gun);
  // slung weapon: barrel down, flat against the pack, tilted across the back
  const back = new THREE.Group(); back.position.set(0.03, 1.44 - HIP_Y, 0.335);
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  back.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.42).multiply(new THREE.Quaternion().setFromRotationMatrix(basis));
  chest.add(back);

  return { root, body, upper, chest, headG, legL: leg(-0.1), legR: leg(0.1), armL: arm(SHOULDER_L), armR: arm(SHOULDER_R), gun, back };
}

const _u = new THREE.Vector3(), _w = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion();
// Two-bone IK: bend the arm so the hand reaches target T (all in the chest's frame).
function solveArm(arm, S, T, pole) {
  const a = UPPER, b = FORE + HAND;
  _u.subVectors(T, S); let d = _u.length(); _u.divideScalar(d || 1);
  d = Math.min(a + b - 0.004, Math.max(Math.abs(a - b) + 0.004, d));
  const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  _w.copy(pole).addScaledVector(_u, -pole.dot(_u)).normalize();
  _e.copy(_u).multiplyScalar(cosA).addScaledVector(_w, sinA);            // shoulder -> elbow
  arm.upper.quaternion.setFromUnitVectors(DOWN, _e);
  _f.copy(_u).multiplyScalar(d).addScaledVector(_e, -a).normalize();     // elbow -> hand
  _f.applyQuaternion(_q.copy(arm.upper.quaternion).invert());
  arm.fore.quaternion.setFromUnitVectors(DOWN, _f);
}

const _ready = new THREE.Vector3(), _low = new THREE.Vector3(), _tR = new THREE.Vector3(), _tL = new THREE.Vector3(), _mag = new THREE.Vector3();
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;

export class Player {
  constructor(scene, terrain, colliders) {
    this.terrain = terrain; this.colliders = colliders;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = -0.1;
    this.kickP = 0; this.kickY = 0;        // recoil that settles back
    this.sens = 1;                         // mouse sensitivity scale (set by the camera when zoomed)
    this.facing = 0;
    this.onGround = false; this.crouch = false; this.sprinting = false;
    this.moveScale = 1; this.canSprint = true;
    this.phase = 0;
    this.hp = 100; this.boost = 0; this.alive = true; this.fall = 0;
    this.weapon = null;                    // id of the gun in hand
    this.pose = { raise: 1, ads: 0, reload: -1, recoil: 0 };   // driven by Combat
    this._raise = 0;
    this.onStep = null; this.onHurt = null; this.onDeath = null;
    this.rig = makeCharacter();
    scene.add(this.rig.root);
  }

  spawn(x, z, yaw = 0) {
    this.pos.set(x, this.terrain.heightAt(x, z), z);
    this.colliders.resolve(this.pos, RADIUS);
    this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z);
    this.yaw = yaw; this.facing = yaw; this.vel.set(0, 0, 0);
    this.pitch = -0.1; this.kickP = this.kickY = 0;
    this.hp = 100; this.boost = 0; this.alive = true; this.fall = 0; this.crouch = false;
  }

  setWeapon(id) {
    if (this.weapon === id) return;
    this.weapon = id; this._raise = 0;
    this.rig.gun.clear();
    if (id) this.rig.gun.add(gunMesh(id));
  }

  setBack(id) {
    if (this.backWeapon === id) return;
    this.backWeapon = id;
    this.rig.back.clear();
    if (id) this.rig.back.add(gunMesh(id));
  }

  damage(amount) {
    if (!this.alive || amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.onHurt?.(amount);
    if (this.hp <= 0) { this.alive = false; this.onDeath?.(); }
  }

  update(dt, input) {
    const [mx, my] = input.consumeMouse();
    const sens = 0.0022 * this.sens;
    if (this.alive) { this.yaw -= mx * sens; this.pitch = clamp(this.pitch - my * sens, -1.25, 0.95); }
    const settle = Math.exp(-9 * dt); this.kickP *= settle; this.kickY *= settle;

    if (input.consumePressed('KeyC')) this.crouch = !this.crouch;
    let f = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
    let s = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    if (!this.alive) f = s = 0;
    this.sprinting = input.down('ShiftLeft') && f > 0 && this.canSprint && this.alive;
    if (this.sprinting) this.crouch = false;
    const speed = (this.crouch ? CROUCH : this.sprinting ? SPRINT : WALK) * this.moveScale * (f < 0 ? 0.8 : 1);

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let wx = -sin * f + cos * s, wz = -cos * f - sin * s;
    const wl = Math.hypot(wx, wz); if (wl > 0) { wx = wx / wl * speed; wz = wz / wl * speed; }
    const accel = this.onGround ? 12 : 2;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (wx - this.vel.x) * k; this.vel.z += (wz - this.vel.z) * k;

    if (this.onGround && input.down('Space') && this.alive) { this.vel.y = JUMP; this.onGround = false; this.crouch = false; }
    this.vel.y -= GRAVITY * dt;

    this.pos.addScaledVector(this.vel, dt);
    this.colliders.resolve(this.pos, RADIUS, this.pos.y);
    const t = this.terrain;
    this.pos.x = clamp(this.pos.x, t.minX + 3, t.maxX - 3);
    this.pos.z = clamp(this.pos.z, t.minZ + 3, t.maxZ - 3);
    const ground = t.heightAt(this.pos.x, this.pos.z);
    if (this.pos.y <= ground || (this.onGround && this.vel.y <= 0 && this.pos.y - ground < 0.35)) {
      const vy = this.vel.y;
      if (!this.onGround) {
        if (vy < -4) this.onStep?.(true);
        if (vy < -11.5) this.damage((-vy - 11.5) * 7);
      }
      this.pos.y = ground; this.vel.y = 0; this.onGround = true;
    } else this.onGround = false;

    // energy drink: slow regeneration while the boost lasts
    if (this.alive && this.boost > 0) {
      this.boost = Math.max(0, this.boost - dt);
      this.hp = Math.min(100, this.hp + dt * 0.8);
    }

    this.animate(dt);
  }

  animate(dt) {
    const { root, body, upper, chest, headG, legL, legR, armL, armR, gun } = this.rig;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const armed = !!this.weapon;
    const k = (r) => 1 - Math.exp(-r * dt);

    // which way the body faces: the aim when armed, otherwise the way we are moving
    let target = this.facing;
    if (armed) target = this.yaw; else if (hs > 0.3) target = Math.atan2(-this.vel.x, -this.vel.z);
    let d = target - this.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.facing += d * k(armed ? 18 : 12);
    this.fall += ((this.alive ? 0 : 1.45) - this.fall) * k(7);
    root.position.copy(this.pos);
    root.rotation.set(0, this.facing, this.fall);

    // stride
    const fwd = -(this.vel.x * Math.sin(this.facing) + this.vel.z * Math.cos(this.facing));
    const prev = this.phase;
    this.phase += dt * hs * (this.sprinting ? 1.7 : 2.3) * (fwd < -0.3 ? -1 : 1);
    if (this.onGround && hs > 1 && Math.floor(this.phase / Math.PI) !== Math.floor(prev / Math.PI)) this.onStep?.(this.sprinting);
    const A = Math.min(1, hs / WALK) * (this.sprinting ? 0.95 : 0.6);
    const sn = Math.sin(this.phase), cs = Math.cos(this.phase), cr = this.crouch;

    let tL = sn * A, tR = -sn * A;
    let kL = -(0.12 + 1.25 * Math.max(0, cs)) * A, kR = -(0.12 + 1.25 * Math.max(0, -cs)) * A;
    if (cr) { tL = 1.2 + sn * A * 0.5; kL = -1.9 + kL * 0.3; tR = 0.3 - sn * A * 0.5; kR = -1.6 + kR * 0.3; }
    if (!this.onGround) { tL = 0.5; kL = -0.8; tR = -0.2; kR = -0.35; }
    const kl = k(22);
    legL.thigh.rotation.x += (tL - legL.thigh.rotation.x) * kl; legL.shin.rotation.x += (kL - legL.shin.rotation.x) * kl;
    legR.thigh.rotation.x += (tR - legR.thigh.rotation.x) * kl; legR.shin.rotation.x += (kR - legR.shin.rotation.x) * kl;

    body.position.y = lerp(body.position.y, cr ? -0.38 : Math.abs(cs) * 0.045 * A, k(14));
    const lean = this.sprinting ? -0.22 : cr ? -0.3 : -0.03 * A;
    upper.rotation.x = lerp(upper.rotation.x, lean, k(10));
    const aimPitch = clamp(this.pitch + this.kickP, -1.1, 1.0);

    if (!armed) {
      chest.rotation.y = lerp(chest.rotation.y, 0, k(10));
      headG.rotation.set(clamp(aimPitch, -0.6, 0.6) * 0.5 - upper.rotation.x, 0, 0);
      const swing = sn * A * 0.85, bend = 0.18 + A * 0.95;
      armL.upper.rotation.set(-swing, 0, -0.07); armL.fore.rotation.set(bend, 0, 0);
      armR.upper.rotation.set(swing, 0, 0.07); armR.fore.rotation.set(bend, 0, 0);
      return;
    }

    // --- armed: place the gun, then let IK bring both hands to it
    const def = WEAPONS[this.weapon], H = HOLD[def.hold], P = GUN_POINTS[this.weapon];
    this._raise += (this.pose.raise - this._raise) * k(11);
    const raise = this._raise, ads = this.pose.ads;
    const p = aimPitch - upper.rotation.x;                    // cancel the lean so the barrel follows the aim
    const sp = Math.sin(p), cp = Math.cos(p);
    _ready.set(H.anchor[0] + H.adsX * ads + H.off[0],
      H.anchor[1] + H.adsY * ads + H.off[1] * cp - H.off[2] * sp,
      H.anchor[2] + H.off[1] * sp + H.off[2] * cp);
    _low.fromArray(H.low);
    gun.position.lerpVectors(_low, _ready, raise);
    const rr = this.pose.reload >= 0 ? Math.sin(Math.PI * this.pose.reload) : 0, rc = this.pose.recoil;
    gun.position.y += Math.sin(this.phase * 2) * 0.012 * A - 0.04 * rr;
    gun.position.z += rc * 0.045;
    gun.rotation.set(lerp(H.lowRot[0], p, raise) + rc * 0.06 - 0.3 * rr, lerp(H.lowRot[1], 0, raise), 0.5 * rr);
    gun.updateMatrix();

    const twist = lerp(H.lowTwist, H.twist, raise);
    chest.rotation.y = lerp(chest.rotation.y, twist, k(14));
    headG.rotation.set(clamp(aimPitch, -0.7, 0.7) * 0.6 - upper.rotation.x, -chest.rotation.y, 0);

    _tR.set(0, -0.025, 0.012).applyMatrix4(gun.matrix);
    _tL.fromArray(P.support);
    if (rr > 0) _tL.lerp(_mag.fromArray(P.mag).setY(P.mag[1] - 0.1), rr);
    _tL.applyMatrix4(gun.matrix);
    // hand targets are in the upper body's frame; the arms hang off the twisted chest
    _tR.applyAxisAngle(Y_AXIS, -chest.rotation.y); _tL.applyAxisAngle(Y_AXIS, -chest.rotation.y);
    solveArm(armR, SHOULDER_R, _tR, POLE_R);
    solveArm(armL, SHOULDER_L, _tL, POLE_L);
  }

  // World position of the muzzle of the gun in hand.
  getMuzzle(out) {
    out.fromArray(GUN_POINTS[this.weapon].muzzle);
    this.rig.gun.updateWorldMatrix(true, false);
    return out.applyMatrix4(this.rig.gun.matrixWorld);
  }

  get speed2d() { return Math.hypot(this.vel.x, this.vel.z); }

  // Eye-level target the camera orbits around.
  get headY() { return this.pos.y + (this.crouch ? 1.15 : 1.6); }
}
