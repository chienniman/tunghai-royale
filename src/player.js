import * as THREE from 'three';

const WALK = 3.6, SPRINT = 6.4, CROUCH = 1.7, JUMP = 5.2, GRAVITY = 18, RADIUS = 0.38;

function makeCharacter() {
  const mat = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const jacket = mat(0x5a6340), pants = mat(0x3b3d35), skin = mat(0xd2a47e, 0.7), boots = mat(0x222018), vest = mat(0x4a4a3c), helmet = mat(0x4b5137, 0.6);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const box = (w, h, d, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = true; return o; };

  const hips = box(0.36, 0.2, 0.22, pants); hips.position.y = 0.92; body.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 10), jacket);
  torso.scale.set(1.15, 1, 0.75); torso.position.y = 1.25; torso.castShadow = true; body.add(torso);
  const vestM = box(0.42, 0.34, 0.3, vest); vestM.position.y = 1.28; body.add(vestM);
  const pack = box(0.32, 0.4, 0.16, mat(0x3f4430)); pack.position.set(0, 1.28, 0.22); body.add(pack);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skin); neck.position.y = 1.55; body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), skin); head.position.y = 1.66; head.castShadow = true; body.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmet);
  helm.position.y = 1.685; helm.castShadow = true; body.add(helm);

  const limb = (len, w, m, footM) => {
    const pivot = new THREE.Group();
    const seg = box(w, len, w, m); seg.position.y = -len / 2; pivot.add(seg);
    if (footM) { const f = box(w + 0.02, 0.09, w + 0.12, footM); f.position.set(0, -len + 0.02, -0.05); pivot.add(f); }
    return pivot;
  };
  const legL = limb(0.86, 0.15, pants, boots), legR = limb(0.86, 0.15, pants, boots);
  legL.position.set(-0.1, 0.9, 0); legR.position.set(0.1, 0.9, 0); body.add(legL, legR);
  const armL = limb(0.62, 0.11, jacket), armR = limb(0.62, 0.11, jacket);
  armL.position.set(-0.27, 1.47, 0); armR.position.set(0.27, 1.47, 0); body.add(armL, armR);
  for (const a of [armL, armR]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin); h.position.y = -0.65; a.add(h); }
  return { root, body, legL, legR, armL, armR };
}

export class Player {
  constructor(scene, terrain, colliders) {
    this.terrain = terrain; this.colliders = colliders;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = -0.1;
    this.facing = 0;
    this.onGround = false; this.crouch = false; this.sprinting = false;
    this.phase = 0;
    this.rig = makeCharacter();
    scene.add(this.rig.root);
  }

  spawn(x, z, yaw = 0) {
    this.pos.set(x, this.terrain.heightAt(x, z), z);
    this.colliders.resolve(this.pos, RADIUS);
    this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z);
    this.yaw = yaw; this.facing = yaw; this.vel.set(0, 0, 0);
  }

  update(dt, input) {
    const [mx, my] = input.consumeMouse();
    this.yaw -= mx * 0.0022; this.pitch = THREE.MathUtils.clamp(this.pitch - my * 0.0022, -1.25, 0.95);

    if (input.consumePressed('KeyC')) this.crouch = !this.crouch;
    const f = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
    const s = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    this.sprinting = input.down('ShiftLeft') && f > 0 && !this.crouch;
    if (this.sprinting) this.crouch = false;
    const speed = this.crouch ? CROUCH : this.sprinting ? SPRINT : WALK;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let wx = -sin * f + cos * s, wz = -cos * f - sin * s;
    const wl = Math.hypot(wx, wz); if (wl > 0) { wx = wx / wl * speed; wz = wz / wl * speed; }
    const accel = this.onGround ? 12 : 2;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (wx - this.vel.x) * k; this.vel.z += (wz - this.vel.z) * k;

    if (this.onGround && input.down('Space')) { this.vel.y = JUMP; this.onGround = false; this.crouch = false; }
    this.vel.y -= GRAVITY * dt;

    this.pos.addScaledVector(this.vel, dt);
    this.colliders.resolve(this.pos, RADIUS, this.pos.y);
    const t = this.terrain;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, t.minX + 3, t.maxX - 3);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, t.minZ + 3, t.maxZ - 3);
    const ground = t.heightAt(this.pos.x, this.pos.z);
    if (this.pos.y <= ground || (this.onGround && this.vel.y <= 0 && this.pos.y - ground < 0.35)) {
      this.pos.y = ground; this.vel.y = 0; this.onGround = true;
    } else this.onGround = false;

    this.animate(dt, wl > 0);
  }

  animate(dt, moving) {
    const { root, body, legL, legR, armL, armR } = this.rig;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.3) {
      const target = Math.atan2(-this.vel.x, -this.vel.z);
      let d = target - this.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * (1 - Math.exp(-12 * dt));
    }
    root.position.copy(this.pos);
    root.rotation.y = this.facing;
    this.phase += dt * hs * (this.sprinting ? 1.7 : 2.3);
    const amp = Math.min(1, hs / WALK) * (this.sprinting ? 0.85 : 0.55);
    const sw = Math.sin(this.phase) * amp;
    legL.rotation.x = sw; legR.rotation.x = -sw;
    armL.rotation.x = -sw * 0.9; armR.rotation.x = sw * 0.9;
    const cr = this.crouch ? 1 : 0;
    body.position.y = THREE.MathUtils.lerp(body.position.y, cr ? -0.38 : Math.abs(Math.cos(this.phase)) * 0.04 * amp, 1 - Math.exp(-14 * dt));
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, this.sprinting ? 0.18 : cr * 0.25, 1 - Math.exp(-10 * dt));
    if (!this.onGround) { legL.rotation.x = 0.5; legR.rotation.x = -0.2; }
    if (cr) { legL.rotation.x += 0.9; legR.rotation.x += 0.4; }
  }

  // Eye-level target the camera orbits around.
  get headY() { return this.pos.y + (this.crouch ? 1.15 : 1.6); }
}
